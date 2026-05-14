import type { OAuthProfile, OAuthTokens } from './oauth';
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

  /**
   * Login/register via OAuth provider (D8.5.6). Recebe profile verificado do
   * provider (após `verifyIdToken`). Estratégia de linking:
   *
   *   1. Lookup `OAuthAccount` por (provider, providerAccountId) → user já vinculado,
   *      só re-emite tokens (`isNewUser=false`).
   *   2. Senão lookup `User` por email:
   *      a. found + `emailVerified !== null` → cria `OAuthAccount` linkado,
   *         atualiza `User.image` se vazio.
   *      b. found + `emailVerified === null` → throw `EMAIL_NOT_VERIFIED`
   *         (anti-takeover: alguém pode ter registrado com email não verificado
   *         pra sequestrar a conta quando o dono OAuth aparecer).
   *      c. not found → cria `User` (`password=null`, `emailVerified=now()`,
   *         `name`/`image` do profile) + `OAuthAccount` + tenant membership.
   *   3. Tenant resolution:
   *      a. `tenantSlug` provided → lookup obrigatório, throw `TENANT_NOT_FOUND` se inexistente.
   *      b. `tenantSlug` undefined → busca memberships do user:
   *         - 0 memberships → cria tenant novo (user vira `owner`); slug derivado
   *           do email domain ou fallback `default-${userId.slice(-6)}`.
   *         - 1 membership → usa esse tenant.
   *         - >1 memberships → throw `MARKETPLACE_REQUIRED` (caller redireciona pro picker).
   *   4. Tokens do provider (access/refresh/id) são gravados em `OAuthAccount`
   *      **ENCRIPTADOS** via `encryptToken` (W1.A — AES-256-GCM).
   *   5. Emite tokens internos via `issueTokens()` (mesmo fluxo do login normal).
   */
  loginWithOAuth(input: {
    provider: string; // 'google' | 'microsoft' | extensible
    profile: OAuthProfile;
    tokens: OAuthTokens; // tokens vindos do exchangeCode — serão encriptados antes de gravar
    tenantSlug?: string;
    encryptionKey: Buffer; // 32 bytes — caller passa de env (D8.5 — OAUTH_ENC_KEY)
    userAgent?: string;
    ip?: string;
  }): Promise<{ session: AuthSession; tokens: IssuedTokens; isNewUser: boolean }>;

  /**
   * Login/register via Magic Link (D8.6.6 — simétrico a `loginWithOAuth` sem OAuthAccount).
   *
   * Caller (`EmailMagicLinkProvider.verifyToken`) já consumiu o token plaintext
   * e verificou single-use; este método recebe um email **já validado por posse
   * do inbox** e gerencia o resto:
   *
   *   1. Lookup `User` por email:
   *      a. found + `emailVerified !== null` → procede pra tenant resolution.
   *      b. found + `emailVerified === null` → seta `emailVerified=now()`
   *         (Magic Link valida implicitamente — chegou no email = controla o inbox).
   *      c. not found → cria `User` (`password=null`, `name=email.split('@')[0]`,
   *         `image=null`, `emailVerified=now()`).
   *   2. Tenant resolution: igual loginWithOAuth (subdomain + marketplace fallback).
   *   3. Emite tokens internos via `issueTokens()`.
   *
   * Sem `profile` — Magic Link não traz nome/avatar. Sem `encryptionKey` — não
   * existe access/refresh token de provider externo pra encriptar.
   */
  loginWithMagicLink(input: {
    email: string;
    tenantSlug?: string;
    userAgent?: string;
    ip?: string;
  }): Promise<{ session: AuthSession; tokens: IssuedTokens; isNewUser: boolean }>;
}
