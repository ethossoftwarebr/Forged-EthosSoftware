/**
 * OAuthProvider (D12 + D14) — interface pra OAuth 2.0 / OIDC com
 * **Authorization Code Flow + PKCE obrigatório** (D12 atualizado pelo #8).
 *
 * Implementações concretas (`GoogleProvider`, `MicrosoftProvider`) ficam pra
 * **spec #8.5**. Schema (User.password nullable, OAuthAccount table) já está
 * pronto desde o #8.
 *
 * Tenant resolution (qual tenant o user pertence quando volta do callback)
 * fica como decisão arquitetural pendente do #8.5 — recomendação:
 * subdomain-based (acme.app.com → tenant=acme) com marketplace fallback.
 */

export interface OAuthProvider {
  /** Identificador estável: 'google' | 'microsoft' | etc. — usado em OAuthAccount.provider */
  readonly name: string;

  /**
   * Constrói URL de redirect pro provider. PKCE obrigatório:
   * codeChallenge = SHA256(codeVerifier) (base64url-encoded).
   * State é um nonce aleatório armazenado no client pra defesa contra CSRF.
   */
  getAuthUrl(params: { state: string; codeChallenge: string; redirectUri: string }): string;

  /**
   * Troca o code recebido no callback por tokens. Verifica codeVerifier (PKCE).
   */
  exchangeCode(params: {
    code: string;
    codeVerifier: string;
    redirectUri: string;
  }): Promise<OAuthTokens>;

  /**
   * Verifica e decodifica ID token (JWS) — checa iss/aud/exp/email_verified.
   * Pra OIDC providers: jwks-rsa fetcher pra resolver chave por kid.
   */
  verifyIdToken(idToken: string): Promise<OAuthProfile>;
}

export interface OAuthTokens {
  accessToken: string;
  refreshToken?: string;
  idToken?: string;
  expiresAt?: Date;
  scope?: string;
}

export interface OAuthProfile {
  providerAccountId: string;
  email: string;
  emailVerified: boolean;
  name?: string;
  picture?: string;
  locale?: string;
}
