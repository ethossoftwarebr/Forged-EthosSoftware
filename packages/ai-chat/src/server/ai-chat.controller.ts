import { CurrentUser, JwtAuthGuard, MultiTenantInterceptor } from '@ethos/api-base';
import type { AuthSession } from '@ethos/auth';
import { Body, Controller, Post, Req, Sse, UseGuards, UseInterceptors } from '@nestjs/common';
import type { MessageEvent } from '@nestjs/common';
import type { Observable } from 'rxjs';

import type { ChatMessagePayload, ChatRequestBody } from '../shared';

import { AiChatService } from './ai-chat.service';

/**
 * AiChatController — endpoints REST do chat.
 *
 * Guards (D#13.11):
 *  - `JwtAuthGuard` obrigatório — NÃO usa `@Public()`. Auth é exigida.
 *  - `MultiTenantInterceptor` popula `TenantContext` com tenantId do JWT.
 *
 * Endpoints:
 *  - `POST /ai-chat` (sync JSON)
 *  - `POST /ai-chat/stream` (SSE, retorna Observable<MessageEvent>)
 */
@Controller('ai-chat')
@UseGuards(JwtAuthGuard)
@UseInterceptors(MultiTenantInterceptor)
export class AiChatController {
  constructor(private readonly service: AiChatService) {}

  /**
   * Sync chat. Retorna a mensagem final completa do assistant + conversationId.
   * Internamente roda tools loop sincronamente (max 5 iterations).
   */
  @Post()
  async chat(
    @Body() body: ChatRequestBody,
    @CurrentUser() session: AuthSession,
  ): Promise<{ conversationId: string; message: ChatMessagePayload }> {
    return this.service.chat(body, session.userId);
  }

  /**
   * SSE streaming. NestJS `@Sse()` retorna `Observable<MessageEvent>` onde
   * `data` é serializado em `data: <json>\n\n` automaticamente (D#13.2).
   *
   * AbortController (D#13.7): listenamos `req.on('close')` pra propagar abort
   * pro stream Anthropic.
   *
   * Nota: NestJS 10 suporta `@Sse()` em POST com `@Body()` quando o adapter
   * HTTP (Express ou Fastify) honra Transfer-Encoding: chunked + Content-Type:
   * text/event-stream. Funciona com o default ExpressAdapter.
   */
  @Sse('stream')
  stream(
    @Body() body: ChatRequestBody,
    @CurrentUser() session: AuthSession,
    @Req() req: { on: (event: string, listener: () => void) => void },
  ): Observable<MessageEvent> {
    const abortController = new AbortController();
    req.on('close', () => abortController.abort());
    return this.service.streamChat(body, session.userId, abortController.signal);
  }
}
