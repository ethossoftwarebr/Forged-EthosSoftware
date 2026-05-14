/**
 * MfaProvider (D14.5) — interface pra TOTP / 2FA.
 *
 * Implementação concreta foi feita em #8.7 (W1) — ver `./mfa/` subdir:
 *   - `OtplibTotpProvider` (otplib@12 + qrcode@1.5) — D8.7.1/D8.7.5
 *   - `generateBackupCodes` / `hashBackupCode` (Crockford base32 + argon2id) — D8.7.2/D8.7.3
 *   - `MfaErrorCode` (5 códigos opacos) — D8.7
 *
 * Interface `MfaProvider` mantida pra compatibilidade com `D14.5`. O
 * `OtplibTotpProvider` em `./mfa/totp.provider.ts` é a impl preferida nas
 * novas integrações.
 */

export interface MfaProvider {
  /**
   * Gera secret TOTP novo (base32, RFC 6238) + QR code data URI pronto pro
   * front renderizar. Não persiste em DB — caller faz após o user confirmar
   * com primeiro código válido (proteção contra secret leaked durante setup).
   */
  generateSecret(params: {
    userId: string;
    issuer: string;
    accountName: string;
  }): Promise<{ secret: string; qrCode: string }>;

  /**
   * Verifica código TOTP de 6 dígitos contra secret. Aceita window=1
   * (current ±1 step de 30s) por padrão pra clock drift.
   */
  verify(params: { secret: string; token: string; window?: number }): Promise<boolean>;

  /**
   * Gera N códigos de backup (formato: XXXX-XXXX-XXXX, 12 chars). Caller
   * hasheia cada um via argon2id antes de armazenar em MfaBackupCode.
   */
  generateBackupCodes(count: number): Promise<string[]>;
}
