import type { AuthSession } from '@ethos/auth';
import {
  type CallHandler,
  type ExecutionContext,
  Injectable,
  type NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';

import { TenantContext } from '../async-local-storage';

/**
 * MultiTenantInterceptor (D4) — abre o `TenantContext` por-request a partir
 * do `request.user` populado pelo `JwtAuthGuard`. Tudo que rodar no call
 * stack (services, repos, Prisma extension) lê o tenantId via
 * `TenantContext.getTenantId()` automaticamente.
 *
 * Wire-up no AppModule: `{ provide: APP_INTERCEPTOR, useClass: MultiTenantInterceptor }`.
 *
 * Comportamento:
 * - Sem `request.user` (rota Public ou pré-auth): passa direto, sem contexto.
 * - Com `request.user`: roda o handler dentro de TenantContext.run() com session/ip/userAgent.
 */
@Injectable()
export class MultiTenantInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<{
      user?: AuthSession;
      ip?: string;
      headers: Record<string, string | string[] | undefined>;
    }>();

    if (!request.user) {
      return next.handle();
    }

    const userAgentHeader = request.headers['user-agent'];
    const userAgent = Array.isArray(userAgentHeader) ? userAgentHeader[0] : userAgentHeader;

    return new Observable((subscriber) => {
      TenantContext.run(
        {
          session: request.user!,
          ip: request.ip,
          userAgent,
        },
        () => {
          next.handle().subscribe({
            next: (value) => subscriber.next(value),
            error: (err) => subscriber.error(err),
            complete: () => subscriber.complete(),
          });
        },
      );
    });
  }
}
