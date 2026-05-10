import { SetMetadata } from '@nestjs/common';

export const PUBLIC_METADATA_KEY = 'ethos:public';

/**
 * `@Public()` — opt-out do `JwtAuthGuard` global (D10).
 *
 * Public routes default no #8: /health, /auth/register, /auth/login,
 * /auth/refresh, /api-docs*. Tudo mais é privado por default.
 *
 * @example
 *   @Public()
 *   @Get('health')
 *   health() { ... }
 */
export const Public = () => SetMetadata(PUBLIC_METADATA_KEY, true);
