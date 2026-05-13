import { randomBytes } from 'node:crypto';

import { encryptToken, decryptToken, parseEncryptionKey } from '../oauth-crypto';

describe('oauth-crypto', () => {
  const key = randomBytes(32);

  it('round-trip encrypt/decrypt preserva plaintext', () => {
    const plain = 'refresh-token-secret-value-with-utf8-çãé';
    const encrypted = encryptToken(plain, key);
    expect(encrypted).toMatch(/^v1:[0-9a-f]+:[0-9a-f]+:[0-9a-f]+$/);
    const decrypted = decryptToken(encrypted, key);
    expect(decrypted).toBe(plain);
  });

  it('tampering no authTag faz decrypt falhar', () => {
    const plain = 'token';
    const encrypted = encryptToken(plain, key);
    const parts = encrypted.split(':');
    // muda 1 hex char do authTag (parts[2])
    const tag = parts[2]!;
    const flipped = (tag[0] === '0' ? '1' : '0') + tag.slice(1);
    const tampered = [parts[0], parts[1], flipped, parts[3]].join(':');
    expect(() => decryptToken(tampered, key)).toThrow();
  });

  it('parseEncryptionKey valida tamanho e formato hex', () => {
    const validHex = randomBytes(32).toString('hex');
    expect(parseEncryptionKey(validHex)).toHaveLength(32);

    expect(() => parseEncryptionKey('not-hex-zzz')).toThrow(/hex/);
    expect(() => parseEncryptionKey('abcd')).toThrow(/32 bytes/);
    expect(() => parseEncryptionKey(randomBytes(16).toString('hex'))).toThrow(/32 bytes/);
  });

  it('decryptToken rejeita versão desconhecida', () => {
    const plain = 'x';
    const encrypted = encryptToken(plain, key);
    const wrongVersion = encrypted.replace(/^v1:/, 'v9:');
    expect(() => decryptToken(wrongVersion, key)).toThrow(/Versão/);
  });
});
