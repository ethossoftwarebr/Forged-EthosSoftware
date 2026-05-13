import { OAuthErrorCode, ALL_OAUTH_ERROR_CODES, buildErrorRedirect } from '../error-codes';

describe('error-codes', () => {
  it('buildErrorRedirect anexa query param error preservando query existente', () => {
    expect(buildErrorRedirect('/login', OAuthErrorCode.STATE_EXPIRED)).toBe(
      '/login?error=oauth_state_expired',
    );
    expect(
      buildErrorRedirect('https://app.com/login?lang=pt', OAuthErrorCode.EMAIL_UNVERIFIED),
    ).toBe('https://app.com/login?lang=pt&error=oauth_email_unverified');
  });

  it('todos os códigos têm prefixo oauth_ e estão em ALL_OAUTH_ERROR_CODES', () => {
    const codes = Object.values(OAuthErrorCode);
    expect(codes.length).toBeGreaterThanOrEqual(6);
    for (const c of codes) {
      expect(c).toMatch(/^oauth_/);
      expect(ALL_OAUTH_ERROR_CODES).toContain(c);
    }
    // garante imutabilidade do array exportado
    expect(Object.isFrozen(ALL_OAUTH_ERROR_CODES)).toBe(true);
  });
});
