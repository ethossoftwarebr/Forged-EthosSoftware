/**
 * MfaProvider (D14.5) — interface pra TOTP / 2FA.
 *
 * Implementação concreta (`TotpMfaProvider`, lib otplib ou speakeasy) fica pra
 * **spec #8.7**. Schema (User.totpSecret + User.mfaEnabled + MfaBackupCode
 * table) já está pronto desde o #8.
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
