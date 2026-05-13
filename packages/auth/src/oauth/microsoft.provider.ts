import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from 'jose';

import type { OAuthProvider, OAuthTokens, OAuthProfile } from '../oauth';

/**
 * Microsoft / Azure AD OAuth 2.0 + OIDC provider (D8.5.2).
 *
 * Audience travada em `organizations` — aceita contas corporativas/escolares
 * (Entra ID) E contas pessoais que pertençam a uma org (raro). Para multi-
 * tenant SaaS é o sweet spot. NÃO usamos `common` (mistura tudo) nem `consumers`
 * (apenas Microsoft account pessoal).
 *
 *   authorize  https://login.microsoftonline.com/organizations/oauth2/v2.0/authorize
 *   token      https://login.microsoftonline.com/organizations/oauth2/v2.0/token
 *   jwks       https://login.microsoftonline.com/organizations/discovery/v2.0/keys
 *   issuer     https://login.microsoftonline.com/{tid}/v2.0  (validado por token)
 *   scope      openid email profile offline_access
 *
 * `offline_access` é necessário pra receber refresh_token.
 * `tid` claim valida o tenant de origem — usado pelo issuer pattern.
 */

const AUTHORIZE_URL = 'https://login.microsoftonline.com/organizations/oauth2/v2.0/authorize';
const TOKEN_URL = 'https://login.microsoftonline.com/organizations/oauth2/v2.0/token';
const JWKS_URL = 'https://login.microsoftonline.com/organizations/discovery/v2.0/keys';
const DEFAULT_SCOPE = 'openid email profile offline_access';
// UUID v4-ish (tid é GUID). Regex usado pra validar formato antes de montar issuer esperado.
const TID_REGEX = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

export interface MicrosoftProviderConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  /** Override JWKS resolver — usado pelos testes pra mockar fetch. */
  jwksResolver?: JWTVerifyGetKey;
  /** Override fetch — usado pelos testes. Default = globalThis.fetch. */
  fetchImpl?: typeof fetch;
}

interface MicrosoftTokenResponse {
  access_token: string;
  refresh_token?: string;
  id_token?: string;
  expires_in?: number;
  scope?: string;
  token_type?: string;
}

interface MicrosoftIdTokenClaims {
  iss: string;
  aud: string | string[];
  sub: string;
  tid?: string;
  oid?: string;
  email?: string;
  preferred_username?: string;
  /** Microsoft só seta isso em alguns flows; default é "verified" pra Entra ID. */
  email_verified?: boolean;
  name?: string;
  picture?: string;
  locale?: string;
}

export class MicrosoftProvider implements OAuthProvider {
  readonly name = 'microsoft';
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly defaultRedirectUri: string;
  private readonly jwksResolver: JWTVerifyGetKey;
  private readonly fetchImpl: typeof fetch;

  constructor(config: MicrosoftProviderConfig) {
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
    this.defaultRedirectUri = config.redirectUri;
    this.jwksResolver = config.jwksResolver ?? createRemoteJWKSet(new URL(JWKS_URL));
    this.fetchImpl = config.fetchImpl ?? globalThis.fetch.bind(globalThis);
  }

  getAuthUrl(params: { state: string; codeChallenge: string; redirectUri: string }): string {
    const url = new URL(AUTHORIZE_URL);
    url.searchParams.set('client_id', this.clientId);
    url.searchParams.set('redirect_uri', params.redirectUri || this.defaultRedirectUri);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('response_mode', 'query');
    url.searchParams.set('scope', DEFAULT_SCOPE);
    url.searchParams.set('state', params.state);
    url.searchParams.set('code_challenge', params.codeChallenge);
    url.searchParams.set('code_challenge_method', 'S256');
    url.searchParams.set('prompt', 'select_account');
    return url.toString();
  }

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
      scope: DEFAULT_SCOPE,
    });

    const res = await this.fetchImpl(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Microsoft token exchange failed (${res.status}): ${text}`);
    }
    const data = (await res.json()) as MicrosoftTokenResponse;
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      idToken: data.id_token,
      scope: data.scope,
      expiresAt: data.expires_in ? new Date(Date.now() + data.expires_in * 1000) : undefined,
    };
  }

  /**
   * Verifica id_token com regra extra de **tid claim** (D8.5.2):
   * issuer esperado = `https://login.microsoftonline.com/{tid}/v2.0`.
   * jose não aceita issuer "wildcard", então validamos manualmente o iss
   * após o jwtVerify (que ainda checa assinatura + aud + exp).
   */
  async verifyIdToken(idToken: string): Promise<OAuthProfile> {
    // D13 — Algorithm Confusion defense: pinar algoritmo explicitamente.
    // Azure AD v2 id_tokens são RS256 (https://learn.microsoft.com/en-us/entra/identity-platform/id-tokens).
    const { payload } = await jwtVerify(idToken, this.jwksResolver, {
      algorithms: ['RS256'],
      audience: this.clientId,
    });
    const claims = payload as unknown as MicrosoftIdTokenClaims;

    if (!claims.tid || !TID_REGEX.test(claims.tid)) {
      throw new Error(`Microsoft id_token sem tid válido: ${claims.tid}`);
    }
    const expectedIssuer = `https://login.microsoftonline.com/${claims.tid}/v2.0`;
    if (claims.iss !== expectedIssuer) {
      throw new Error(
        `Microsoft id_token issuer inválido. Esperado=${expectedIssuer}, recebido=${claims.iss}`,
      );
    }

    const email = claims.email ?? claims.preferred_username;
    if (!email) {
      throw new Error('Microsoft id_token sem email/preferred_username');
    }
    // Entra ID corporativo: emails sempre verificados pelo IdP (audience=organizations).
    // Anti-takeover: exigimos email_verified === true. Default ausente NÃO é mais
    // tratado como verified — endurecido pós-W5 review (alinha com Google).
    if (claims.email_verified !== true) {
      throw new Error('Microsoft id_token sem email_verified=true');
    }
    return {
      providerAccountId: claims.oid ?? claims.sub,
      email,
      emailVerified: true,
      name: claims.name,
      picture: claims.picture,
      locale: claims.locale,
    };
  }
}
