'use client';

/**
 * useAiChat — hook React do @ethos/ai-chat (client side).
 *
 * Encapsula:
 *  - estado local de mensagens (user + assistant streaming)
 *  - fetch POST /ai-chat/stream com ReadableStream (D#13.8: NÃO usa EventSource — POST não suportado)
 *  - parser SSE manual sobre o body (frames `data: {json}\n\n`)
 *  - AbortController via fetch signal (D#13.7)
 *  - TanStack Query cache key `['ai-chat', conversationId]` pra rehydrate em remontagens
 *
 * AC6: este módulo NÃO importa o SDK Anthropic nem usa segredos — fica só no server.
 */

import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';

import type { ChatMessagePayload, StreamEvent, ToolCall } from '../shared';

export interface UseAiChatOptions {
  /** Base URL do API. Default: '' (relativo ao origin atual). Ex.: 'http://localhost:3001'. */
  apiBaseUrl?: string;
  /** Continuação de conversa existente. Se omitido, server cria nova e devolve no evento `done`. */
  conversationId?: string;
  /** Override do modelo Anthropic. Default fica no server. */
  model?: string;
  /** Headers extras (ex.: `Authorization`). Cookie httpOnly costuma bastar via `credentials: 'include'`. */
  headers?: Record<string, string>;
}

export interface UseAiChatReturn {
  messages: ChatMessagePayload[];
  sendMessage: (text: string) => Promise<void>;
  isStreaming: boolean;
  error: Error | null;
  abort: () => void;
  conversationId: string | undefined;
  clear: () => void;
}

const CHAT_QUERY_KEY = 'ai-chat';

/**
 * Cria um ID temporário pra mensagens locais (até o server devolver o id real
 * via reload de conversa). UUID-like leve sem dep externa.
 */
function tempId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Parser de frames SSE. Recebe um buffer acumulado e devolve `{ events, rest }`,
 * onde `rest` é o pedaço incompleto (ainda sem terminator `\n\n`).
 *
 * Cada frame SSE é uma linha começando com `data: ` seguida do JSON. Outras
 * linhas (`event:`, `id:`, comentários `:`) são ignoradas — o server NestJS
 * via `@Sse()` só emite `data:`.
 */
function parseSseBuffer(buffer: string): { events: StreamEvent[]; rest: string } {
  const events: StreamEvent[] = [];
  let rest = buffer;
  let terminatorIdx = rest.indexOf('\n\n');
  while (terminatorIdx !== -1) {
    const frame = rest.slice(0, terminatorIdx);
    rest = rest.slice(terminatorIdx + 2);
    for (const rawLine of frame.split('\n')) {
      const line = rawLine.trimEnd();
      if (!line.startsWith('data:')) continue;
      const payload = line.slice(5).trimStart();
      if (!payload) continue;
      try {
        const parsed = JSON.parse(payload) as StreamEvent;
        events.push(parsed);
      } catch {
        // Frame malformado — ignora silenciosamente. O server NestJS sempre
        // emite JSON válido; falha aqui costuma ser truncation que o próximo
        // chunk completa (mas SSE garante terminator, então é raro).
      }
    }
    terminatorIdx = rest.indexOf('\n\n');
  }
  return { events, rest };
}

/**
 * Aplica um StreamEvent ao array de mensagens local.
 *
 * Convenção: a última mensagem do array sempre é o assistant em construção
 * durante o stream. `text` aumenta o `.content`; `tool_use_start` push em
 * `.toolCalls[]`; `tool_result` push uma mensagem `role: 'tool'` separada.
 */
function applyStreamEvent(
  prev: ChatMessagePayload[],
  event: StreamEvent,
): { next: ChatMessagePayload[]; doneConversationId?: string; errorMessage?: string } {
  const next = prev.slice();
  const lastIdx = next.length - 1;
  const last = lastIdx >= 0 ? next[lastIdx] : undefined;

  switch (event.type) {
    case 'text': {
      if (last && last.role === 'assistant') {
        next[lastIdx] = { ...last, content: last.content + event.delta };
      }
      return { next };
    }
    case 'tool_use_start': {
      if (last && last.role === 'assistant') {
        const call: ToolCall = { id: event.id, name: event.name, input: {} };
        const toolCalls = last.toolCalls ? last.toolCalls.concat(call) : [call];
        next[lastIdx] = { ...last, toolCalls };
      }
      return { next };
    }
    case 'tool_use_input_delta': {
      // Input chega em deltas JSON; armazenar o JSON raw como string parcial
      // não vale a pena reconstruir aqui (UI usa pra debug apenas). Pula.
      return { next };
    }
    case 'tool_result': {
      next.push({
        role: 'tool',
        toolCallId: event.id,
        content:
          typeof event.output === 'string' ? event.output : JSON.stringify(event.output, null, 2),
      });
      return { next };
    }
    case 'done': {
      return { next, doneConversationId: event.conversationId };
    }
    case 'error': {
      return { next, errorMessage: event.message };
    }
    default:
      return { next };
  }
}

export function useAiChat(opts: UseAiChatOptions = {}): UseAiChatReturn {
  const { apiBaseUrl = '', model, headers } = opts;
  const queryClient = useQueryClient();

  const [messages, setMessages] = useState<ChatMessagePayload[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [conversationId, setConversationId] = useState<string | undefined>(opts.conversationId);

  const abortRef = useRef<AbortController | null>(null);
  const streamingRef = useRef(false);

  // Cleanup em unmount: aborta fetch em andamento (D#13.7).
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      abortRef.current = null;
    };
  }, []);

  const abort = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    streamingRef.current = false;
    setIsStreaming(false);
  }, []);

  const clear = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  const sendMessage = useCallback(
    async (text: string): Promise<void> => {
      const trimmed = text.trim();
      if (!trimmed || streamingRef.current) return;

      streamingRef.current = true;
      setError(null);
      setIsStreaming(true);

      // Snapshot do histórico ANTES de empurrar a nova user message — é o que
      // mandamos pro server (server adiciona a user no DB também).
      const historyForRequest = messages.map((m) => ({ role: m.role, content: m.content }));

      const userMessage: ChatMessagePayload = {
        id: tempId('u'),
        role: 'user',
        content: trimmed,
      };
      const assistantPlaceholder: ChatMessagePayload = {
        id: tempId('a'),
        role: 'assistant',
        content: '',
      };

      setMessages((prev) => prev.concat(userMessage, assistantPlaceholder));

      const controller = new AbortController();
      abortRef.current = controller;

      let finalConversationId: string | undefined = conversationId;

      try {
        const response = await fetch(`${apiBaseUrl}/ai-chat/stream`, {
          method: 'POST',
          credentials: 'include',
          signal: controller.signal,
          headers: {
            'Content-Type': 'application/json',
            Accept: 'text/event-stream',
            ...(headers ?? {}),
          },
          body: JSON.stringify({
            conversationId,
            messages: historyForRequest.concat({ role: 'user', content: trimmed }),
            ...(model ? { model } : {}),
          }),
        });

        if (!response.ok || !response.body) {
          throw new Error(
            `Stream falhou: ${response.status} ${response.statusText || 'sem corpo'}`,
          );
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder('utf-8');
        let buffer = '';
        let streamError: string | undefined;

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          const { events, rest } = parseSseBuffer(buffer);
          buffer = rest;

          for (const ev of events) {
            setMessages((prev) => {
              const { next, doneConversationId, errorMessage } = applyStreamEvent(prev, ev);
              if (doneConversationId) finalConversationId = doneConversationId;
              if (errorMessage) streamError = errorMessage;
              return next;
            });
          }
        }

        // Drena buffer final (caso server feche sem `\n\n` terminator).
        if (buffer.trim()) {
          const { events } = parseSseBuffer(buffer + '\n\n');
          for (const ev of events) {
            setMessages((prev) => {
              const { next, doneConversationId, errorMessage } = applyStreamEvent(prev, ev);
              if (doneConversationId) finalConversationId = doneConversationId;
              if (errorMessage) streamError = errorMessage;
              return next;
            });
          }
        }

        if (streamError) {
          throw new Error(streamError);
        }

        if (finalConversationId && finalConversationId !== conversationId) {
          setConversationId(finalConversationId);
          // Invalida cache da nova conversa pra forçar refetch caso outro
          // consumer escute esse queryKey (ex.: lista de conversas).
          queryClient.invalidateQueries({ queryKey: [CHAT_QUERY_KEY, finalConversationId] });
        }
      } catch (err) {
        if ((err as { name?: string }).name === 'AbortError') {
          // Abort silencioso — não conta como erro.
        } else {
          setError(err instanceof Error ? err : new Error(String(err)));
        }
      } finally {
        streamingRef.current = false;
        setIsStreaming(false);
        if (abortRef.current === controller) {
          abortRef.current = null;
        }
      }
    },
    [apiBaseUrl, conversationId, headers, messages, model, queryClient],
  );

  return {
    messages,
    sendMessage,
    isStreaming,
    error,
    abort,
    conversationId,
    clear,
  };
}
