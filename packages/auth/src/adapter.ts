import type { AuthSession, IssuedTokens, LoginCredentials, RegisterInput } from './types';

/**
 * AuthAdapter (D14.1) — contrato pluggable que torna o Forge agnóstico de
 * provider de auth. NativeAuthAdapter é o default (#8); adapters opcionais
 * (`@ethos/auth-auth0`, `@ethos/auth-clerk`, `@ethos/auth-workos`) ficam pós-v1.
 *
 * AuthModule.forRoot({ adapter }) escolhe a impl. Resto do kit (decorators,
 * guards, controllers) consome essa interface — não a impl concreta.
 */
export interface AuthAdapter {
  /**
   * Cria User + TenantMember. Se tenant não existe, cria também (User vira owner).
   * Retorna sessão com tokens emitidos.
   */
  register(input: RegisterInput): Promise<{ session: AuthSession; tokens: IssuedTokens }>;

  /**
   * Verifica credenciais + checa lockout. Retorna tokens em sucesso.
   * Em falha incrementa contador de tentativas e pode bloquear conta (D14.6).
   */
  login(creds: LoginCredentials): Promise<{ session: AuthSession; tokens: IssuedTokens }>;

  /**
   * Rotação D5 — gera novo access+refresh, invalida o antigo. Reuse de token
   * revogado revoga a family inteira (defesa contra replay attack).
   */
  refresh(refreshToken: string, tenantSlug: string): Promise<IssuedTokens>;

  /**
   * Revoga refresh token (e a family se for o caso). Access token continua
   * válido até expirar — efeito em ~15min.
   */
  logout(refreshToken: string): Promise<void>;

  /**
   * Verifica access token (hardening D13). Lança em token inválido/expirado.
   * Usado pelo JwtAuthGuard.
   */
  verifyAccessToken(token: string): Promise<AuthSession>;
}
