import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from 'jose';

import type { OAuthProvider, OAuthTokens, OAuthProfile } from '../oauth';

/**
 * Google OAuth 2.0 / OIDC provider (D8.5).
 *
 * Endpoints (estáveis — não usar `googleapis` SDK, fetch nativo suficiente):
 *   authorize  https://accounts.google.com/o/oauth2/v2/auth
 *   token      https://oauth2.googleapis.com/token
 *   jwks       https://www.googleapis.com/oauth2/v3/certs
 *   issuer     https://accounts.google.com OU accounts.google.com
 *   scope      openid email profile
 *
 * PKCE S256 obrigatório. id_token verificado via `createRemoteJWKSet` com cache
 * default do jose (≥10min, respeitando Cache-Control).
 */

const AUTHORIZE_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const JWKS_URL = 'https://www.googleapis.com/oauth2/v3/certs';
const VALID_ISSUERS = new Set(['https://accounts.google.com', 'accounts.google.com']);
const DEFAULT_SCOPE = 'openid email profile';

export interface GoogleProviderConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  /** Override JWKS resolver — usado pelos testes pra mockar fetch. */
  jwksResolver?: JWTVerifyGetKey;
  /** Override fetch — usado pelos testes. Default = globalThis.fetch. */
  fetchImpl?: typeof fetch;
}

interface GoogleTokenResponse {
  access_token: string;
  refresh_token?: string;
  id_token?: string;
  expires_in?: number;
  scope?: string;
  token_type?: string;
}

interface GoogleIdTokenClaims {
  iss: string;
  aud: string | string[];
  sub: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
  locale?: string;
}

export class GoogleProvider implements OAuthProvider {
  readonly name = 'google';
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly defaultRedirectUri: string;
  private readonly jwksResolver: JWTVerifyGetKey;
  private readonly fetchImpl: typeof fetch;

  constructor(config: GoogleProviderConfig) {
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
    this.defaultRedirectUri = config.redirectUri;
    this.jwksResolver = config.jwksResolver ?? createRemoteJWKSet(new URL(JWKS_URL));
    this.fetchImpl = config.fetchImpl ?? globalThis.fetch.bind(globalThis);
  }

  /**
   * Constrói URL de autorização com PKCE S256 + state. `prompt=select_account`
   * força a tela de chooser mesmo se o user tiver sessão Google ativa (UX
   * importante em apps multi-tenant).
   */
  getAuthUrl(params: { state: string; codeChallenge: string; redirectUri: string }): string {
    const url = new URL(AUTHORIZE_URL);
    url.searchParams.set('client_id', this.clientId);
    url.searchParams.set('redirect_uri', params.redirectUri || this.defaultRedirectUri);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('scope', DEFAULT_SCOPE);
    url.searchParams.set('state', params.state);
    url.searchParams.set('code_challenge', params.codeChallenge);
    url.searchParams.set('code_challenge_method', 'S256');
    url.searchParams.set('access_type', 'offline');
    url.searchParams.set('prompt', 'select_account');
    return url.toString();
  }

  /**
   * Troca code por tokens via POST application/x-www-form-urlencoded.
   * Reenvia `code_verifier` (PKCE) — Google rejeita se ausente quando o
   * authorize tinha challenge.
   */
  async exchangeCode(params: {
    code: string;
    codeVerifier: string;
    redirectUri: string;
  }): Promise<OAuthTokens> {
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      code: params.code,
      redirect_uri: params.redirectUri || this.defaultRedirectUri,
      client_id: this.clientId,
      client_secret: this.clientSecret,
      code_verifier: params.codeVerifier,
    });

    const res = await this.fetchImpl(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Google token exchange failed (${res.status}): ${text}`);
    }
    const data = (await res.json()) as GoogleTokenResponse;
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      idToken: data.id_token,
      scope: data.scope,
      expiresAt: data.expires_in ? new Date(Date.now() + data.expires_in * 1000) : undefined,
    };
  }

  /**
   * Verifica id_token via JWKS remoto. Rejeita se:
   * - iss não bate (accounts.google.com / https://accounts.google.com)
   * - aud != clientId
   * - email_verified=false
   */
  async verifyIdToken(idToken: string): Promise<OAuthProfile> {
    // D13 — Algorithm Confusion defense: pinar algoritmo explicitamente.
    // Google id_tokens são RS256 (https://developers.google.com/identity/openid-connect/openid-connect#discovery).
    const { payload } = await jwtVerify(idToken, this.jwksResolver, {
      algorithms: ['RS256'],
      audience: this.clientId,
    });
    const claims = payload as unknown as GoogleIdTokenClaims;
    if (!VALID_ISSUERS.has(claims.iss)) {
      throw new Error(`Google id_token issuer inválido: ${claims.iss}`);
    }
    if (!claims.email) {
      throw new Error('Google id_token sem email claim');
    }
    if (claims.email_verified !== true) {
      throw new Error('Google id_token com email_verified=false');
    }
    return {
      providerAccountId: claims.sub,
      email: claims.email,
      emailVerified: true,
      name: claims.name,
      picture: claims.picture,
      locale: claims.locale,
    };
  }
}
