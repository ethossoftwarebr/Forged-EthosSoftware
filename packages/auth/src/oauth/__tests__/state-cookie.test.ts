import { generateKeyPair } from 'jose';

import type { JwtKeyset } from '../../jwks';
import {
  signStateCookie,
  verifyStateCookie,
  StateCookieError,
  OAUTH_STATE_COOKIE_NAME,
  type OAuthStatePayload,
} from '../state-cookie';

async function makeKeyset(kid = 'test-kid'): Promise<JwtKeyset> {
  const { privateKey, publicKey } = await generateKeyPair('EdDSA');
  return { current: { kid, privateKey, publicKey } };
}

const samplePayload: OAuthStatePayload = {
  state: 'rand-state-nonce',
  codeVerifier: 'verifier-43-chars-base64url-AAAAAAAAAAAAAAAAAAA',
  nonce: 'oidc-nonce',
  provider: 'google',
  redirectUri: 'https://app.com/auth/callback/google',
  tenantSlug: 'acme',
  returnTo: '/dashboard',
};

describe('state-cookie', () => {
  it('round-trip sign/verify preserva payload', async () => {
    const keyset = await makeKeyset();
    const cookie = await signStateCookie(samplePayload, keyset);
    expect(cookie.name).toBe(OAUTH_STATE_COOKIE_NAME);
    expect(cookie.httpOnly).toBe(true);
    expect(cookie.sameSite).toBe('lax');
    expect(cookie.path).toBe('/');
    expect(cookie.maxAge).toBe(300);

    const decoded = await verifyStateCookie(cookie.value, keyset);
    expect(decoded).toEqual(samplePayload);
  });

  it('tampering no payload invalida assinatura', async () => {
    const keyset = await makeKeyset();
    const cookie = await signStateCookie(samplePayload, keyset);
    const parts = cookie.value.split('.');
    // muda 1 char do payload (parts[1]) — assinatura quebra
    const tampered = [
      parts[0],
      parts[1]!.slice(0, -1) + (parts[1]!.endsWith('A') ? 'B' : 'A'),
      parts[2],
    ].join('.');
    await expect(verifyStateCookie(tampered, keyset)).rejects.toThrow(StateCookieError);
  });

  it('expired state cookie lança StateCookieError reason=expired', async () => {
    const keyset = await makeKeyset();
    // maxAge negativo → cookie já nasce expirado
    const cookie = await signStateCookie(samplePayload, keyset, { maxAgeSeconds: -1 });
    try {
      await verifyStateCookie(cookie.value, keyset);
      fail('esperava StateCookieError');
    } catch (err) {
      expect(err).toBeInstanceOf(StateCookieError);
      expect((err as StateCookieError).reason).toBe('expired');
    }
  });

  it('kid desconhecido (keyset diferente) rejeita como invalid', async () => {
    const signerKeyset = await makeKeyset('kid-a');
    const verifierKeyset = await makeKeyset('kid-b');
    const cookie = await signStateCookie(samplePayload, signerKeyset);
    try {
      await verifyStateCookie(cookie.value, verifierKeyset);
      fail('esperava StateCookieError invalid');
    } catch (err) {
      expect(err).toBeInstanceOf(StateCookieError);
      expect((err as StateCookieError).reason).toBe('invalid');
    }
  });
});
