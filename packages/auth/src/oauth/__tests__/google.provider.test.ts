import { SignJWT, generateKeyPair, type KeyLike } from 'jose';

import { GoogleProvider } from '../google.provider';

interface SignTokenOpts {
  iss?: string;
  aud?: string | string[];
  email?: string;
  email_verified?: boolean;
  sub?: string;
  name?: string;
}

async function signGoogleIdToken(privateKey: KeyLike, opts: SignTokenOpts = {}): Promise<string> {
  return new SignJWT({
    email: opts.email ?? 'user@example.com',
    email_verified: opts.email_verified ?? true,
    name: opts.name ?? 'User Test',
  })
    .setProtectedHeader({ alg: 'RS256' })
    .setIssuer(opts.iss ?? 'https://accounts.google.com')
    .setAudience(opts.aud ?? 'client-abc')
    .setSubject(opts.sub ?? 'google-user-1')
    .setIssuedAt()
    .setExpirationTime('5m')
    .sign(privateKey);
}

describe('GoogleProvider', () => {
  let privateKey: KeyLike;
  let publicKey: KeyLike;

  beforeAll(async () => {
    const kp = await generateKeyPair('RS256');
    privateKey = kp.privateKey;
    publicKey = kp.publicKey;
  });

  function makeProvider() {
    return new GoogleProvider({
      clientId: 'client-abc',
      clientSecret: 'secret-xyz',
      redirectUri: 'https://app.com/auth/callback/google',
      // jose JWTVerifyGetKey: resolver de chave por header — devolve sempre publicKey de teste
      jwksResolver: async () => publicKey,
    });
  }

  it('getAuthUrl inclui PKCE S256 + state + scope openid email profile', () => {
    const p = makeProvider();
    const url = new URL(
      p.getAuthUrl({
        state: 'state-1',
        codeChallenge: 'challenge-1',
        redirectUri: 'https://app.com/auth/callback/google',
      }),
    );
    expect(url.origin + url.pathname).toBe('https://accounts.google.com/o/oauth2/v2/auth');
    expect(url.searchParams.get('client_id')).toBe('client-abc');
    expect(url.searchParams.get('state')).toBe('state-1');
    expect(url.searchParams.get('code_challenge')).toBe('challenge-1');
    expect(url.searchParams.get('code_challenge_method')).toBe('S256');
    expect(url.searchParams.get('scope')).toBe('openid email profile');
    expect(url.searchParams.get('response_type')).toBe('code');
  });

  it('exchangeCode faz POST form-urlencoded com code_verifier', async () => {
    let capturedUrl = '';
    let capturedBody = '';
    let capturedHeaders: Record<string, string> = {};
    const fetchMock: typeof fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      capturedUrl = typeof input === 'string' ? input : input.toString();
      capturedBody = (init?.body as string) ?? '';
      capturedHeaders = (init?.headers as Record<string, string>) ?? {};
      return new Response(
        JSON.stringify({
          access_token: 'at',
          refresh_token: 'rt',
          id_token: 'idt',
          expires_in: 3600,
          scope: 'openid email profile',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
      // reason: minimal mock — return type compatible w/ fetch via Response
    }) as typeof fetch;

    const p = new GoogleProvider({
      clientId: 'client-abc',
      clientSecret: 'secret-xyz',
      redirectUri: 'https://app.com/auth/callback/google',
      jwksResolver: async () => publicKey,
      fetchImpl: fetchMock,
    });
    const tokens = await p.exchangeCode({
      code: 'auth-code',
      codeVerifier: 'verifier-43',
      redirectUri: 'https://app.com/auth/callback/google',
    });
    expect(capturedUrl).toBe('https://oauth2.googleapis.com/token');
    expect(capturedHeaders['Content-Type']).toBe('application/x-www-form-urlencoded');
    expect(capturedBody).toContain('code_verifier=verifier-43');
    expect(capturedBody).toContain('grant_type=authorization_code');
    expect(tokens.accessToken).toBe('at');
    expect(tokens.refreshToken).toBe('rt');
    expect(tokens.idToken).toBe('idt');
    expect(tokens.expiresAt).toBeInstanceOf(Date);
  });

  it('verifyIdToken aceita token válido com email_verified=true', async () => {
    const p = makeProvider();
    const token = await signGoogleIdToken(privateKey);
    const profile = await p.verifyIdToken(token);
    expect(profile.providerAccountId).toBe('google-user-1');
    expect(profile.email).toBe('user@example.com');
    expect(profile.emailVerified).toBe(true);
    expect(profile.name).toBe('User Test');
  });

  it('verifyIdToken rejeita email_verified=false', async () => {
    const p = makeProvider();
    const token = await signGoogleIdToken(privateKey, { email_verified: false });
    await expect(p.verifyIdToken(token)).rejects.toThrow(/email_verified/);
  });

  it('verifyIdToken rejeita issuer inválido', async () => {
    const p = makeProvider();
    const token = await signGoogleIdToken(privateKey, { iss: 'https://evil.com' });
    await expect(p.verifyIdToken(token)).rejects.toThrow(/issuer/);
  });
});
