import { SignJWT, generateKeyPair, type KeyLike } from 'jose';

import { MicrosoftProvider } from '../microsoft.provider';

const VALID_TID = '11111111-2222-3333-4444-555555555555';

interface SignTokenOpts {
  iss?: string;
  aud?: string | string[];
  email?: string;
  preferred_username?: string;
  /** `null` = omitir o claim do payload (testar policy strict). Default = true. */
  email_verified?: boolean | null;
  sub?: string;
  oid?: string;
  tid?: string | undefined;
  name?: string;
}

async function signMsIdToken(privateKey: KeyLike, opts: SignTokenOpts = {}): Promise<string> {
  const payload: Record<string, unknown> = {
    email: opts.email,
    preferred_username: opts.preferred_username ?? 'user@contoso.com',
    name: opts.name ?? 'Contoso User',
    oid: opts.oid ?? 'oid-1',
  };
  if ('tid' in opts) {
    if (opts.tid !== undefined) payload.tid = opts.tid;
  } else {
    payload.tid = VALID_TID;
  }
  // Default: Entra ID para audience=organizations emite email_verified=true por contrato.
  // Passar `false` simula token malicioso; passar `null` omite o claim (policy strict).
  if (opts.email_verified !== null) {
    payload.email_verified = opts.email_verified ?? true;
  }

  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'RS256' })
    .setIssuer(opts.iss ?? `https://login.microsoftonline.com/${payload.tid}/v2.0`)
    .setAudience(opts.aud ?? 'client-ms')
    .setSubject(opts.sub ?? 'ms-sub-1')
    .setIssuedAt()
    .setExpirationTime('5m')
    .sign(privateKey);
}

describe('MicrosoftProvider', () => {
  let privateKey: KeyLike;
  let publicKey: KeyLike;

  beforeAll(async () => {
    const kp = await generateKeyPair('RS256');
    privateKey = kp.privateKey;
    publicKey = kp.publicKey;
  });

  function makeProvider() {
    return new MicrosoftProvider({
      clientId: 'client-ms',
      clientSecret: 'secret-ms',
      redirectUri: 'https://app.com/auth/callback/microsoft',
      jwksResolver: async () => publicKey,
    });
  }

  it('getAuthUrl usa /organizations + PKCE S256 + scope com offline_access', () => {
    const p = makeProvider();
    const url = new URL(
      p.getAuthUrl({
        state: 's',
        codeChallenge: 'c',
        redirectUri: 'https://app.com/auth/callback/microsoft',
      }),
    );
    expect(url.origin + url.pathname).toBe(
      'https://login.microsoftonline.com/organizations/oauth2/v2.0/authorize',
    );
    expect(url.searchParams.get('code_challenge_method')).toBe('S256');
    expect(url.searchParams.get('scope')).toBe('openid email profile offline_access');
    expect(url.searchParams.get('response_type')).toBe('code');
    expect(url.searchParams.get('state')).toBe('s');
  });

  it('exchangeCode posta no token endpoint /organizations com code_verifier', async () => {
    let capturedUrl = '';
    let capturedBody = '';
    const fetchMock: typeof fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      capturedUrl = typeof input === 'string' ? input : input.toString();
      capturedBody = (init?.body as string) ?? '';
      return new Response(
        JSON.stringify({
          access_token: 'at',
          refresh_token: 'rt',
          id_token: 'idt',
          expires_in: 60,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    }) as typeof fetch;

    const p = new MicrosoftProvider({
      clientId: 'client-ms',
      clientSecret: 'secret-ms',
      redirectUri: 'https://app.com/auth/callback/microsoft',
      jwksResolver: async () => publicKey,
      fetchImpl: fetchMock,
    });
    const tokens = await p.exchangeCode({
      code: 'c',
      codeVerifier: 'v',
      redirectUri: 'https://app.com/auth/callback/microsoft',
    });
    expect(capturedUrl).toBe('https://login.microsoftonline.com/organizations/oauth2/v2.0/token');
    expect(capturedBody).toContain('code_verifier=v');
    expect(tokens.refreshToken).toBe('rt');
  });

  it('verifyIdToken aceita token com tid válido e issuer correto', async () => {
    const p = makeProvider();
    const token = await signMsIdToken(privateKey);
    const profile = await p.verifyIdToken(token);
    expect(profile.providerAccountId).toBe('oid-1');
    expect(profile.email).toBe('user@contoso.com');
    expect(profile.emailVerified).toBe(true);
  });

  it('verifyIdToken rejeita token sem tid claim (D8.5.2)', async () => {
    const p = makeProvider();
    const token = await signMsIdToken(privateKey, {
      tid: undefined,
      iss: 'https://login.microsoftonline.com/whatever/v2.0',
    });
    await expect(p.verifyIdToken(token)).rejects.toThrow(/tid/);
  });

  it('verifyIdToken rejeita issuer que não bate com tid', async () => {
    const p = makeProvider();
    const token = await signMsIdToken(privateKey, {
      tid: VALID_TID,
      iss: 'https://login.microsoftonline.com/aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee/v2.0',
    });
    await expect(p.verifyIdToken(token)).rejects.toThrow(/issuer/);
  });

  it('verifyIdToken rejeita email_verified=false explícito', async () => {
    const p = makeProvider();
    const token = await signMsIdToken(privateKey, { email_verified: false });
    await expect(p.verifyIdToken(token)).rejects.toThrow(/email_verified/);
  });

  it('verifyIdToken rejeita token sem email_verified claim (anti-takeover pós-W5)', async () => {
    // Helper aceita null pra omitir o claim — testa o hardening.
    const p = makeProvider();
    const token = await signMsIdToken(privateKey, { email_verified: null });
    await expect(p.verifyIdToken(token)).rejects.toThrow(/email_verified/);
  });
});
