import { AUTH_ADAPTER_TOKEN } from '@ethos/api-base';
import type {
  AuthAdapter,
  AuthSession,
  IssuedTokens,
  LoginCredentials,
  RegisterInput,
} from '@ethos/auth';
import {
  ConflictException,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

/**
 * AuthService — thin wrapper que delega ao `AuthAdapter` (D14.1) e traduz
 * `Error & { code }` em HttpException apropriado.
 *
 * Não toca em senhas em plaintext (D13/AC#8) — só passa pro adapter. Não loga
 * credentials nem refresh em plaintext.
 */
@Injectable()
export class AuthService {
  constructor(@Inject(AUTH_ADAPTER_TOKEN) private readonly adapter: AuthAdapter) {}

  async register(input: RegisterInput): Promise<{ session: AuthSession; tokens: IssuedTokens }> {
    try {
      return await this.adapter.register(input);
    } catch (err) {
      throw translateAuthError(err);
    }
  }

  async login(creds: LoginCredentials): Promise<{ session: AuthSession; tokens: IssuedTokens }> {
    try {
      return await this.adapter.login(creds);
    } catch (err) {
      throw translateAuthError(err);
    }
  }

  async refresh(refreshToken: string, tenantSlug: string): Promise<IssuedTokens> {
    try {
      return await this.adapter.refresh(refreshToken, tenantSlug);
    } catch (err) {
      throw translateAuthError(err);
    }
  }

  async logout(refreshToken: string): Promise<void> {
    try {
      await this.adapter.logout(refreshToken);
    } catch {
      // logout é idempotente — falhas internas não afetam UX.
    }
  }
}

/**
 * Mapeia `Error & { code }` do AuthAdapter pra HttpException com shape
 * compatível com `AllExceptionsFilter` (que preserva `body.code`).
 *
 * Cross-tenant + credenciais inválidas: ambos 401 (D6 — não vazar existência).
 * Account locked: 429 + Retry-After (AC #14).
 */
function translateAuthError(err: unknown): HttpException {
  if (!(err instanceof Error)) {
    return new HttpException(
      {
        code: 'INTERNAL_ERROR',
        message: 'Erro interno de autenticação.',
      },
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }

  const code = (err as Error & { code?: string }).code ?? 'INTERNAL_ERROR';
  const message = err.message;

  switch (code) {
    case 'INVALID_CREDENTIALS':
    case 'TENANT_NOT_FOUND':
    case 'NOT_A_MEMBER':
      // D6: cross-tenant 404 vs 401 não vaza — usamos 401 pra tudo aqui.
      return new UnauthorizedException({
        code: 'INVALID_CREDENTIALS',
        message: 'Credenciais inválidas.',
      });

    case 'TOKEN_EXPIRED':
      return new UnauthorizedException({ code: 'TOKEN_EXPIRED', message });

    case 'TOKEN_INVALID':
    case 'TOKEN_REUSED':
      return new UnauthorizedException({ code, message });

    case 'ACCOUNT_LOCKED': {
      // AC #14 — 429 com Retry-After. Parse do ISO timestamp na mensagem
      // "Conta bloqueada até <ISO>."
      const match = message.match(/até\s+(\S+?)\.?$/);
      const retryAfterSeconds = match?.[1]
        ? Math.max(1, Math.ceil((Date.parse(match[1]) - Date.now()) / 1000))
        : 15 * 60;
      const exc = new HttpException(
        { code: 'ACCOUNT_LOCKED', message },
        HttpStatus.TOO_MANY_REQUESTS,
      );
      // attach retry-after as a side-channel (controller will copy to header)
      (exc as HttpException & { retryAfter?: number }).retryAfter = retryAfterSeconds;
      return exc;
    }

    case 'EMAIL_TAKEN':
      return new ConflictException({ code: 'EMAIL_TAKEN', message });

    default:
      return new HttpException(
        { code: 'INTERNAL_ERROR', message: 'Erro interno de autenticação.' },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
  }
}

/**
 * Extrai `retryAfter` (segundos) de uma HttpException que veio do
 * `translateAuthError` no caminho ACCOUNT_LOCKED. Controller usa pra setar
 * o header `Retry-After`.
 */
export function getRetryAfterSeconds(exc: HttpException): number | undefined {
  const value = (exc as HttpException & { retryAfter?: number }).retryAfter;
  return typeof value === 'number' ? value : undefined;
}
