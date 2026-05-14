import { authenticator } from 'otplib';

import { OtplibTotpProvider } from '../totp.provider';

describe('OtplibTotpProvider (D8.7.1/D8.7.5)', () => {
  const provider = new OtplibTotpProvider();
  const ISSUER = 'Ethos Forge';
  const ACCOUNT = 'alice@acme.com';

  // Mesma config global aplicada pelo módulo (window=1, step=30)
  beforeEach(() => {
    authenticator.options = { window: 1, step: 30 };
  });

  it('generateSecret retorna shape válido (secret + otpauthUrl + qrCodeDataUrl)', async () => {
    const out = await provider.generateSecret({ issuer: ISSUER, accountName: ACCOUNT });
    expect(out.secret).toBeDefined();
    expect(typeof out.secret).toBe('string');
    expect(out.otpauthUrl).toMatch(/^otpauth:\/\/totp\//);
    expect(out.qrCodeDataUrl).toMatch(/^data:image\/png;base64,/);
  });

  it('otpauthUrl contém issuer e accountName URL-encoded', async () => {
    const out = await provider.generateSecret({ issuer: ISSUER, accountName: ACCOUNT });
    // issuer com espaço deve estar URL-encoded como %20 ou +
    expect(out.otpauthUrl).toMatch(/Ethos(%20|\+)Forge/);
    expect(out.otpauthUrl).toContain('alice%40acme.com');
  });

  it('secret tem entropia adequada (>= 16 chars base32)', async () => {
    const out = await provider.generateSecret({ issuer: ISSUER, accountName: ACCOUNT });
    expect(out.secret.length).toBeGreaterThanOrEqual(16);
    // base32 alphabet (otplib usa A-Z2-7)
    expect(out.secret).toMatch(/^[A-Z2-7]+$/);
  });

  it('qrCodeDataUrl é base64 parseável (não vazio)', async () => {
    const out = await provider.generateSecret({ issuer: ISSUER, accountName: ACCOUNT });
    const b64 = out.qrCodeDataUrl.replace(/^data:image\/png;base64,/, '');
    expect(b64.length).toBeGreaterThan(100); // PNG mínimo
    const buf = Buffer.from(b64, 'base64');
    // PNG magic bytes: 89 50 4E 47
    expect(buf[0]).toBe(0x89);
    expect(buf[1]).toBe(0x50);
    expect(buf[2]).toBe(0x4e);
    expect(buf[3]).toBe(0x47);
  });

  it('verify aceita código gerado no mesmo step (current TOTP)', async () => {
    const { secret } = await provider.generateSecret({ issuer: ISSUER, accountName: ACCOUNT });
    const code = authenticator.generate(secret);
    expect(provider.verify({ secret, code })).toBe(true);
  });

  it('verify aceita código gerado no step anterior (window=1)', () => {
    const secret = authenticator.generateSecret();
    // Clone com epoch 30s atrás → gera código do step anterior
    const prevAuth = authenticator.clone({ epoch: Date.now() - 30_000 });
    const code = prevAuth.generate(secret);
    expect(provider.verify({ secret, code })).toBe(true);
  });

  it('verify aceita código gerado no step seguinte (window=1)', () => {
    const secret = authenticator.generateSecret();
    const nextAuth = authenticator.clone({ epoch: Date.now() + 30_000 });
    const code = nextAuth.generate(secret);
    expect(provider.verify({ secret, code })).toBe(true);
  });

  it('verify rejeita código de 2 steps atrás (fora da window=1)', () => {
    const secret = authenticator.generateSecret();
    // 2 steps atrás = ~60s atrás (fora da window ±30s)
    const oldAuth = authenticator.clone({ epoch: Date.now() - 60_000 });
    const code = oldAuth.generate(secret);
    expect(provider.verify({ secret, code })).toBe(false);
  });

  it('verify rejeita código aleatório (não correspondente)', async () => {
    const { secret } = await provider.generateSecret({ issuer: ISSUER, accountName: ACCOUNT });
    expect(provider.verify({ secret, code: '000000' })).toBe(false);
    expect(provider.verify({ secret, code: '999999' })).toBe(false);
  });

  it('verify rejeita código vazio ou null sem lançar', async () => {
    const { secret } = await provider.generateSecret({ issuer: ISSUER, accountName: ACCOUNT });
    expect(provider.verify({ secret, code: '' })).toBe(false);
    // @ts-expect-error testando null em runtime
    expect(provider.verify({ secret, code: null })).toBe(false);
  });

  it('verify rejeita quando secret é vazio (sem lançar)', () => {
    const code = '123456';
    expect(provider.verify({ secret: '', code })).toBe(false);
  });

  it('verify rejeita secret malformado sem propagar exception', () => {
    expect(provider.verify({ secret: 'NOT-VALID-BASE32-####', code: '123456' })).toBe(false);
  });

  it('dois secrets distintos geram códigos distintos no mesmo instante', () => {
    const s1 = authenticator.generateSecret();
    const s2 = authenticator.generateSecret();
    const c1 = authenticator.generate(s1);
    const c2 = authenticator.generate(s2);
    expect(s1).not.toBe(s2);
    // Probabilidade de igualdade é ~1/10^6 — flaky se acontecer mas extremamente improvável.
    expect(c1).not.toBe(c2);
  });

  it('código de outro secret é rejeitado (replay cross-account)', () => {
    const s1 = authenticator.generateSecret();
    const s2 = authenticator.generateSecret();
    const codeForS1 = authenticator.generate(s1);
    expect(provider.verify({ secret: s2, code: codeForS1 })).toBe(false);
  });

  it('otpauthUrl é parseável como URL e tem secret no query', async () => {
    const out = await provider.generateSecret({ issuer: ISSUER, accountName: ACCOUNT });
    const url = new URL(out.otpauthUrl);
    expect(url.protocol).toBe('otpauth:');
    expect(url.searchParams.get('secret')).toBe(out.secret);
    expect(url.searchParams.get('issuer')).toBe(ISSUER);
  });

  it('dois generateSecret consecutivos retornam secrets diferentes (não determinístico)', async () => {
    const a = await provider.generateSecret({ issuer: ISSUER, accountName: ACCOUNT });
    const b = await provider.generateSecret({ issuer: ISSUER, accountName: ACCOUNT });
    expect(a.secret).not.toBe(b.secret);
  });
});
