import { createParamDecorator, type ExecutionContext } from '@nestjs/common';

/**
 * `@CurrentTenant()` — atalho pra `@CurrentUser().tenantId`.
 *
 * @example
 *   @Get('config')
 *   config(@CurrentTenant() tenantId: string) { ... }
 */
export const CurrentTenant = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string | undefined => {
    const request = ctx.switchToHttp().getRequest<{ user?: { tenantId: string } }>();
    return request.user?.tenantId;
  },
);
