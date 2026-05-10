import type { AuthAdapter, AuthSession } from '@ethos/auth';
import {
  CanActivate,
  type ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { PUBLIC_METADATA_KEY } from '../decorators/public.decorator';

export const AUTH_ADAPTER_TOKEN = Symbol('AUTH_ADAPTER');

interface RequestWithAuth {
  cookies?: Record<string, string | undefined>;
  headers: Record<string, string | string[] | undefined>;
  user?: AuthSession;
}

/**
 * JwtAuthGuard — guard global que verifica access token e popula `request.user`.
 *
 * Comportamento (D10 + D13):
 * - Endpoints com `@Public()` passam sem verificação.
 * - Token lido de cookie httpOnly (`access_token`) ou Authorization Bearer.
 * - Cookie tem precedência sobre header (D13.7).
 * - Verificação delega ao `AuthAdapter` (D14.1) — algoritmo único EdDSA pinado
 *   pelo NativeAuthAdapter (D13.2).
 *
 * Wire-up no AppModule:
 *   { provide: AUTH_ADAPTER_TOKEN, useFactory: ... },
 *   { provide: APP_GUARD, useClass: JwtAuthGuard }
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Inject(AUTH_ADAPTER_TOKEN) private readonly auth: AuthAdapter,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(PUBLIC_METADATA_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<RequestWithAuth>();
    const token = extractToken(request);
    if (!token) {
      throw new UnauthorizedException('Token ausente.');
    }

    try {
      const session = await this.auth.verifyAccessToken(token);
      request.user = session;
      return true;
    } catch {
      throw new UnauthorizedException('Token inválido ou expirado.');
    }
  }
}

function extractToken(request: RequestWithAuth): string | null {
  const cookieToken = request.cookies?.access_token;
  if (cookieToken) return cookieToken;

  const auth = request.headers.authorization;
  const header = Array.isArray(auth) ? auth[0] : auth;
  if (header?.toLowerCase().startsWith('bearer ')) {
    return header.slice(7).trim();
  }
  return null;
}
