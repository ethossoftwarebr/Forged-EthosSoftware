import type { AuthSession } from '@ethos/auth';
import { createParamDecorator, type ExecutionContext } from '@nestjs/common';

/**
 * `@CurrentUser()` — injeta a `AuthSession` decodificada do JWT no parâmetro
 * do controller. Funciona em conjunto com `JwtAuthGuard` (que popula
 * `request.user`).
 *
 * @example
 *   @Get('me')
 *   me(@CurrentUser() session: AuthSession) { return session; }
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthSession | undefined => {
    const request = ctx.switchToHttp().getRequest<{ user?: AuthSession }>();
    return request.user;
  },
);
