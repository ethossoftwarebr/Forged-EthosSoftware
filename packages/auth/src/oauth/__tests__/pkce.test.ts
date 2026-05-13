import { createHash } from 'node:crypto';

import { genVerifier, genChallenge, assertS256, isValidVerifierLength } from '../pkce';

describe('pkce', () => {
  it('genVerifier retorna base64url de 43 chars (32 bytes)', () => {
    const v = genVerifier();
    expect(v).toHaveLength(43);
    expect(v).toMatch(/^[A-Za-z0-9_-]+$/);
    // entropia: 2 chamadas consecutivas devem diferir
    expect(genVerifier()).not.toBe(v);
    expect(isValidVerifierLength(v)).toBe(true);
  });

  it('genChallenge é SHA-256 base64url determinístico do verifier', () => {
    const verifier = 'fixed-verifier-for-determinism-43chars-AAAAA';
    const expected = createHash('sha256').update(verifier, 'ascii').digest('base64url');
    expect(genChallenge(verifier)).toBe(expected);
    expect(genChallenge(verifier)).toBe(genChallenge(verifier));
  });

  it('assertS256 rejeita "plain" e aceita "S256"', () => {
    expect(() => assertS256('S256')).not.toThrow();
    expect(() => assertS256('plain')).toThrow(/plain/);
    expect(() => assertS256('')).toThrow();
  });
});
