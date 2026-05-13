import type Anthropic from '@anthropic-ai/sdk';
import type {
  Message,
  MessageParam,
  TextBlock,
  ToolUseBlock,
} from '@anthropic-ai/sdk/resources/messages';
import { getCurrentTenantId, PRISMA_CLIENT_TOKEN } from '@ethos/api-base';
import type { PrismaClient } from '@ethos/database';
import { ForbiddenException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import type { MessageEvent } from '@nestjs/common';
import { Observable } from 'rxjs';

import type { ChatMessagePayload, ChatRequestBody, StreamEvent } from '../shared';

import { ANTHROPIC_CLIENT_TOKEN } from './anthropic.client';
import { ToolsRegistry } from './tools.registry';

export const AI_CHAT_OPTIONS_TOKEN = Symbol('AI_CHAT_OPTIONS');

export interface AiChatOptions {
  defaultModel: string;
  fallbackModel: string;
}

/** Hard cap pra evitar loop infinito de tool_use (D#13 safety). */
const MAX_TOOL_ITERATIONS = 5;
/** Limite de mensagens carregadas do histórico — protege janela + custo. */
const HISTORY_LIMIT = 50;
/** max_tokens por turn — Anthropic exige; Sonnet 4.5 suporta até ~64k. */
const DEFAULT_MAX_TOKENS = 4096;

/**
 * AiChatService — orquestra conversas com Anthropic + persistência Prisma +
 * tool calls. Multi-tenant via `getCurrentTenantId()` (api-base AsyncLocalStorage).
 *
 * Guards (CLAUDE.md):
 *  - tenantId NUNCA do body/query (D#13.4) → sempre do JWT via TenantContext
 *  - Conversation ownership check (D#13.12) → findFirst com tenantId+userId
 *  - Tools loop max 5 iterations (safety)
 *  - AbortController (D#13.7) → service expõe stream.abort() via signal opcional
 */
@Injectable()
export class AiChatService {
  private readonly logger = new Logger(AiChatService.name);

  constructor(
    @Inject(ANTHROPIC_CLIENT_TOKEN) private readonly anthropic: Anthropic,
    @Inject(PRISMA_CLIENT_TOKEN) private readonly prisma: PrismaClient,
    private readonly tools: ToolsRegistry,
    @Inject(AI_CHAT_OPTIONS_TOKEN) private readonly options: AiChatOptions,
  ) {}

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  /**
   * Chat não-streaming. Persiste user message + assistant message + executa
   * tools loop sincronamente. Retorna mensagem final + conversationId.
   */
  async chat(
    body: ChatRequestBody,
    userId: string,
  ): Promise<{ conversationId: string; message: ChatMessagePayload }> {
    const tenantId = this.requireTenantId();
    const conversation = await this.ensureConversation(body.conversationId, userId, tenantId);

    // Persistir TODAS user messages que vieram no body (geralmente 1, mas suporta replay).
    const userPayloads: ChatMessagePayload[] = body.messages
      .filter((m) => m.role === 'user')
      .map((m) => ({ role: 'user', content: m.content }));
    if (userPayloads.length > 0) {
      await this.persistMessages(conversation.id, userPayloads);
    }

    // Carregar histórico (inclui as user messages recém-persistidas).
    const history = await this.loadHistory(conversation.id);
    const anthropicMessages = this.toAnthropicMessages(history);

    const model = body.model ?? this.options.defaultModel;
    let messages = anthropicMessages;
    let finalMessage: Message | null = null;

    for (let iter = 0; iter < MAX_TOOL_ITERATIONS; iter++) {
      const response = (await this.anthropic.messages.create({
        model,
        max_tokens: DEFAULT_MAX_TOKENS,
        messages,
        ...(this.tools.hasTools() ? { tools: this.tools.list() } : {}),
      })) as Message;

      if (response.stop_reason !== 'tool_use') {
        finalMessage = response;
        break;
      }

      // Extrair tool_use blocks + executar
      const toolUseBlocks = response.content.filter(
        (c): c is ToolUseBlock => c.type === 'tool_use',
      );

      // Append assistant turn (com tool_use) ao histórico Anthropic
      messages = [...messages, { role: 'assistant', content: response.content }];

      // Executar cada tool e appendar tool_result blocks como nova user turn
      const toolResultBlocks: Array<{
        type: 'tool_result';
        tool_use_id: string;
        content: string;
        is_error?: boolean;
      }> = [];
      for (const block of toolUseBlocks) {
        try {
          const output = await this.tools.executeTool(block.name, block.input);
          toolResultBlocks.push({
            type: 'tool_result',
            tool_use_id: block.id,
            content: JSON.stringify(output ?? null),
          });
        } catch (err) {
          const errMsg = err instanceof Error ? err.message : String(err);
          this.logger.warn(`Tool "${block.name}" failed: ${errMsg}`);
          toolResultBlocks.push({
            type: 'tool_result',
            tool_use_id: block.id,
            content: JSON.stringify({ error: errMsg }),
            is_error: true,
          });
        }
      }

      messages = [...messages, { role: 'user', content: toolResultBlocks }];
    }

    if (!finalMessage) {
      throw new Error(`Tool loop did not converge after ${MAX_TOOL_ITERATIONS} iterations`);
    }

    // Persistir assistant message final + retornar
    const assistantContent = this.extractText(finalMessage);
    const toolCalls = this.extractToolCalls(finalMessage);
    const assistantPayload: ChatMessagePayload = {
      role: 'assistant',
      content: assistantContent,
      ...(toolCalls.length > 0 ? { toolCalls } : {}),
    };
    await this.persistMessages(conversation.id, [assistantPayload]);

    return { conversationId: conversation.id, message: assistantPayload };
  }

  /**
   * Chat streaming via SSE. Emite `StreamEvent`s wrapped em `MessageEvent`.
   * Tools loop reinicia o stream após execução de tool_use blocks.
   *
   * @param signal AbortSignal opcional — controller propaga `req.on('close')`.
   */
  streamChat(
    body: ChatRequestBody,
    userId: string,
    signal?: AbortSignal,
  ): Observable<MessageEvent> {
    return new Observable<MessageEvent>((subscriber) => {
      let aborted = false;
      let currentStream: ReturnType<Anthropic['messages']['stream']> | null = null;

      const onAbort = (): void => {
        aborted = true;
        if (currentStream && !currentStream.ended) {
          currentStream.abort();
        }
      };
      if (signal) {
        if (signal.aborted) {
          subscriber.complete();
          return;
        }
        signal.addEventListener('abort', onAbort);
      }

      const emit = (event: StreamEvent): void => {
        if (!aborted) subscriber.next({ data: event });
      };

      const run = async (): Promise<void> => {
        try {
          const tenantId = this.requireTenantId();
          const conversation = await this.ensureConversation(body.conversationId, userId, tenantId);

          const userPayloads: ChatMessagePayload[] = body.messages
            .filter((m) => m.role === 'user')
            .map((m) => ({ role: 'user', content: m.content }));
          if (userPayloads.length > 0) {
            await this.persistMessages(conversation.id, userPayloads);
          }

          const history = await this.loadHistory(conversation.id);
          let messages = this.toAnthropicMessages(history);
          const model = body.model ?? this.options.defaultModel;

          let accumulatedAssistantContent = '';
          const accumulatedToolCalls: Array<{
            id: string;
            name: string;
            input: Record<string, unknown>;
          }> = [];

          for (let iter = 0; iter < MAX_TOOL_ITERATIONS; iter++) {
            if (aborted) break;

            currentStream = this.anthropic.messages.stream({
              model,
              max_tokens: DEFAULT_MAX_TOKENS,
              messages,
              ...(this.tools.hasTools() ? { tools: this.tools.list() } : {}),
            });

            currentStream.on('text', (delta: string) => {
              emit({ type: 'text', delta });
            });

            currentStream.on('contentBlock', (block) => {
              if (block.type === 'tool_use') {
                emit({ type: 'tool_use_start', id: block.id, name: block.name });
              }
            });

            currentStream.on('inputJson', (partialJson: string, jsonSnapshot: unknown) => {
              // jsonSnapshot vem com o block atual no fim do array; tentamos extrair id
              const snap = jsonSnapshot as { id?: string } | undefined;
              const id = snap?.id ?? 'unknown';
              emit({ type: 'tool_use_input_delta', id, deltaJson: partialJson });
            });

            const finalMsg = await currentStream.finalMessage();

            // Acumular texto do assistant
            for (const c of finalMsg.content) {
              if (c.type === 'text') {
                accumulatedAssistantContent += (c as TextBlock).text;
              }
            }
            for (const c of finalMsg.content) {
              if (c.type === 'tool_use') {
                const tu = c as ToolUseBlock;
                accumulatedToolCalls.push({
                  id: tu.id,
                  name: tu.name,
                  input: (tu.input ?? {}) as Record<string, unknown>,
                });
              }
            }

            if (finalMsg.stop_reason !== 'tool_use') {
              break;
            }

            // Executar tools, emitir tool_result, e reiniciar stream
            const toolUseBlocks = finalMsg.content.filter(
              (c): c is ToolUseBlock => c.type === 'tool_use',
            );

            messages = [...messages, { role: 'assistant', content: finalMsg.content }];

            const toolResultBlocks: Array<{
              type: 'tool_result';
              tool_use_id: string;
              content: string;
              is_error?: boolean;
            }> = [];
            for (const block of toolUseBlocks) {
              if (aborted) break;
              try {
                const output = await this.tools.executeTool(block.name, block.input);
                emit({ type: 'tool_result', id: block.id, output });
                toolResultBlocks.push({
                  type: 'tool_result',
                  tool_use_id: block.id,
                  content: JSON.stringify(output ?? null),
                });
              } catch (err) {
                const errMsg = err instanceof Error ? err.message : String(err);
                this.logger.warn(`Tool "${block.name}" failed: ${errMsg}`);
                emit({ type: 'tool_result', id: block.id, output: { error: errMsg } });
                toolResultBlocks.push({
                  type: 'tool_result',
                  tool_use_id: block.id,
                  content: JSON.stringify({ error: errMsg }),
                  is_error: true,
                });
              }
            }

            messages = [...messages, { role: 'user', content: toolResultBlocks }];
          }

          if (aborted) {
            subscriber.complete();
            return;
          }

          // Persistir assistant message final acumulado
          if (accumulatedAssistantContent || accumulatedToolCalls.length > 0) {
            await this.persistMessages(conversation.id, [
              {
                role: 'assistant',
                content: accumulatedAssistantContent,
                ...(accumulatedToolCalls.length > 0 ? { toolCalls: accumulatedToolCalls } : {}),
              },
            ]);
          }

          emit({ type: 'done', conversationId: conversation.id });
          subscriber.complete();
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          this.logger.error(`streamChat failed: ${message}`);
          if (!aborted) {
            subscriber.next({ data: { type: 'error', message } satisfies StreamEvent });
          }
          subscriber.complete();
        }
      };

      void run();

      return () => {
        if (signal) signal.removeEventListener('abort', onAbort);
        if (currentStream && !currentStream.ended) {
          currentStream.abort();
        }
      };
    });
  }

  /**
   * Helper público — devs podem registrar tools em runtime (e.g. plugins de
   * tenant). Apenas delega pro ToolsRegistry (que mantém o Map).
   */
  registerTool(): void {
    throw new Error(
      'registerTool removed — use AiChatModule.forFeature([tools]) at module load time. Runtime registration would bypass DI lifecycle.',
    );
  }

  /** Helper público pra UI/testes — executa uma tool por nome. */
  async executeTool(name: string, input: unknown): Promise<unknown> {
    return this.tools.executeTool(name, input);
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private requireTenantId(): string {
    const tenantId = getCurrentTenantId();
    if (!tenantId) {
      // Multi-tenant interceptor não rodou ou JWT inválido — refusa.
      throw new ForbiddenException({
        code: 'TENANT_REQUIRED',
        message: 'No tenant context available.',
      });
    }
    return tenantId;
  }

  /**
   * D#13.12 — ownership check: se conversationId existe, valida que pertence
   * ao tenantId+userId atual. Senão cria nova conversation no tenant atual.
   */
  private async ensureConversation(
    conversationId: string | undefined,
    userId: string,
    tenantId: string,
  ): Promise<{ id: string }> {
    if (conversationId) {
      const existing = await this.prisma.chatConversation.findFirst({
        where: { id: conversationId, tenantId, userId },
        select: { id: true },
      });
      if (!existing) {
        throw new NotFoundException({
          code: 'CONVERSATION_NOT_FOUND',
          message: 'Conversation not found.',
        });
      }
      return existing;
    }

    const created = await this.prisma.chatConversation.create({
      data: { tenantId, userId },
      select: { id: true },
    });
    return created;
  }

  private async loadHistory(conversationId: string): Promise<ChatMessagePayload[]> {
    const rows = await this.prisma.chatMessage.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
      take: HISTORY_LIMIT,
      select: {
        id: true,
        role: true,
        content: true,
        toolCalls: true,
        toolCallId: true,
      },
    });
    return rows.map((r) => ({
      id: r.id,
      role: r.role as ChatMessagePayload['role'],
      content: r.content,
      ...(r.toolCalls
        ? { toolCalls: r.toolCalls as unknown as ChatMessagePayload['toolCalls'] }
        : {}),
      ...(r.toolCallId ? { toolCallId: r.toolCallId } : {}),
    }));
  }

  private async persistMessages(
    conversationId: string,
    messages: ChatMessagePayload[],
  ): Promise<void> {
    if (messages.length === 0) return;
    await this.prisma.chatMessage.createMany({
      data: messages.map((m) => ({
        conversationId,
        role: m.role,
        content: m.content,
        toolCalls: m.toolCalls ? (m.toolCalls as unknown as object) : undefined,
        toolCallId: m.toolCallId,
      })),
    });
  }

  /**
   * Converte histórico do DB pro formato esperado pelo Anthropic SDK.
   * Simplificação V1: tool/system roles são serializados como user text com prefixo.
   * Histórico complexo (tool_use + tool_result em blocks) é re-hidratado só
   * dentro do loop atual; turns anteriores ficam como texto plain.
   */
  private toAnthropicMessages(history: ChatMessagePayload[]): MessageParam[] {
    const out: MessageParam[] = [];
    for (const msg of history) {
      if (msg.role === 'user') {
        out.push({ role: 'user', content: msg.content });
      } else if (msg.role === 'assistant') {
        out.push({ role: 'assistant', content: msg.content });
      } else if (msg.role === 'system') {
        // Anthropic API: system não é uma role no array — vai como param top-level.
        // V1: prefixamos como user pra simplificar. Devs que precisarem de system
        // prompt fino devem usar `body.model` + extender o service.
        out.push({ role: 'user', content: `[system] ${msg.content}` });
      } else if (msg.role === 'tool') {
        // Tool results históricos: serializam como user text. Replay 1:1 só funciona
        // dentro do mesmo loop (gerenciado em chat()/streamChat()).
        out.push({ role: 'user', content: `[tool_result] ${msg.content}` });
      }
    }
    return out;
  }

  private extractText(message: Message): string {
    return message.content
      .filter((c): c is TextBlock => c.type === 'text')
      .map((c) => c.text)
      .join('');
  }

  private extractToolCalls(
    message: Message,
  ): Array<{ id: string; name: string; input: Record<string, unknown> }> {
    return message.content
      .filter((c): c is ToolUseBlock => c.type === 'tool_use')
      .map((c) => ({
        id: c.id,
        name: c.name,
        input: (c.input ?? {}) as Record<string, unknown>,
      }));
  }
}
