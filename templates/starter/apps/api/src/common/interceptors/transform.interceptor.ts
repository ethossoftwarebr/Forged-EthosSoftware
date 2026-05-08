import { Readable } from 'node:stream';

import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import type { Request, Response } from 'express';
import { Observable, map } from 'rxjs';

/**
 * Envelope padrão de respostas success da API (D6 do prompt #7).
 *
 * Hey-API openapi-ts + frontend Zod schemas no #11 esperam ESTE shape.
 * Skip rules abaixo evitam double-wrapping e quebra de Swagger UI / SSE / binários.
 */
export interface ApiSuccessEnvelope<T> {
  data: T;
  meta: {
    timestamp: string;
    path: string;
  };
}

const SWAGGER_PATH_REGEX = /^\/api-docs/;

function shouldSkip(payload: unknown, request: Request, response: Response): boolean {
  // Swagger UI + spec JSON precisam do shape original (HTML / OpenAPI doc).
  if (SWAGGER_PATH_REGEX.test(request?.url ?? '')) {
    return true;
  }

  // SSE: cliente espera stream raw com Content-Type text/event-stream.
  const contentType = response.getHeader('content-type');
  if (typeof contentType === 'string' && contentType.includes('text/event-stream')) {
    return true;
  }

  // Buffers / streams: não envelopar binários nem chunks.
  if (Buffer.isBuffer(payload) || payload instanceof Readable) {
    return true;
  }

  // Já tem `data` top-level: assumir shape externo controlado pelo handler.
  if (
    payload !== null &&
    typeof payload === 'object' &&
    'data' in (payload as Record<string, unknown>)
  ) {
    return true;
  }

  return false;
}

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, T | ApiSuccessEnvelope<T>> {
  intercept(
    context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<T | ApiSuccessEnvelope<T>> {
    const httpCtx = context.switchToHttp();
    const request = httpCtx.getRequest<Request>();
    const response = httpCtx.getResponse<Response>();

    return next.handle().pipe(
      map((payload) => {
        if (shouldSkip(payload, request, response)) {
          return payload;
        }

        const envelope: ApiSuccessEnvelope<T> = {
          data: payload,
          meta: {
            timestamp: new Date().toISOString(),
            path: request?.url ?? 'unknown',
          },
        };
        return envelope;
      }),
    );
  }
}
