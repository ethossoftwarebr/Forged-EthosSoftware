import type { PrismaClient } from '@ethos/database';
import {
  type CallHandler,
  type ExecutionContext,
  Inject,
  Injectable,
  type NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, tap } from 'rxjs';

import { TenantContext } from '../async-local-storage';
import { AUDIT_METADATA_KEY, type AuditMetadata } from '../decorators/audit.decorator';

export const PRISMA_CLIENT_TOKEN = Symbol('PRISMA_CLIENT');

/**
 * AuditLogInterceptor (D7) — grava AuditLog síncrono na mesma transaction de
 * leitura (#8). Refactor pra BullMQ async fica em #15.
 *
 * Lê `@Audit(action, resourceType?)` do handler. Sem decorator → não loga.
 *
 * Wire-up: `{ provide: APP_INTERCEPTOR, useClass: AuditLogInterceptor }` +
 * provider de PrismaClient.
 *
 * Princípio CLAUDE.md: senhas/PII NUNCA em log. Esta interceptor só salva o
 * action name e resourceId — nunca o payload do request.
 */
@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    @Inject(PRISMA_CLIENT_TOKEN) private readonly prisma: PrismaClient,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const meta = this.reflector.getAllAndOverride<AuditMetadata | undefined>(AUDIT_METADATA_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!meta) return next.handle();

    return next.handle().pipe(
      tap({
        next: (response) => {
          // Fire-and-forget: erro no audit não derruba a request
          void this.writeLog(meta, context, response).catch(() => {
            // intencional: logar localmente seria PII risk
          });
        },
      }),
    );
  }

  private async writeLog(
    meta: AuditMetadata,
    context: ExecutionContext,
    response: unknown,
  ): Promise<void> {
    const ctx = TenantContext.get();
    if (!ctx) return; // pré-auth ou rota Public — não logar

    const request = context.switchToHttp().getRequest<{
      ip?: string;
      headers: Record<string, string | string[] | undefined>;
    }>();
    const userAgentHeader = request.headers['user-agent'];
    const userAgent = Array.isArray(userAgentHeader) ? userAgentHeader[0] : userAgentHeader;

    // resourceId é heurístico: pega `id` do response se existir
    let resourceId: string | undefined;
    if (response && typeof response === 'object' && 'id' in response) {
      const id = (response as { id?: unknown }).id;
      if (typeof id === 'string') resourceId = id;
    }

    await this.prisma.auditLog.create({
      data: {
        tenantId: ctx.session.tenantId,
        userId: ctx.session.userId,
        action: meta.action,
        resourceType: meta.resourceType,
        resourceId,
        ip: ctx.ip ?? request.ip,
        userAgent: ctx.userAgent ?? userAgent,
      },
    });
  }
}
