import { authenticator } from 'otplib';
import qrcode from 'qrcode';

/**
 * Configuração global do otplib (D8.7.6):
 *   - step = 30s (RFC 6238 padrão; aceito por Google Authenticator/Authy/1Password).
 *   - window = 1 (±30s) — clock drift tolerance em mobile sem NTP.
 *
 * Aplicado em module load pra garantir que TODO consumer use a mesma window
 * (evita drift entre setup e challenge).
 */
authenticator.options = { window: 1, step: 30 };

export interface TotpSetupResult {
  /** Secret base32 (RFC 4648) — armazenar encriptado via AES-256-GCM. */
  secret: string;
  /** otpauth:// URL — fallback "type manually" no app authenticator. */
  otpauthUrl: string;
  /** Data URL `data:image/png;base64,...` pronto pra `<img src>`. */
  qrCodeDataUrl: string;
}

export interface TotpProvider {
  /**
   * Gera secret novo + QR code. Não persiste — caller decide quando gravar.
   * `issuer` aparece no app authenticator (ex.: "Ethos Forge").
   * `accountName` identifica a conta (ex.: email do user).
   */
  generateSecret(opts: { issuer: string; accountName: string }): Promise<TotpSetupResult>;

  /**
   * Verifica código de 6 dígitos contra secret. Aceita window=1 (±30s).
   * Retorna boolean — caller mapeia pra erro semântico.
   */
  verify(opts: { secret: string; code: string }): boolean;
}

/**
 * `OtplibTotpProvider` — impl default do `TotpProvider` baseada em
 * [otplib@12](https://github.com/yeojz/otplib).
 *
 * Stack: HMAC-SHA1 (RFC 6238 padrão; Google Authenticator suporta só SHA1
 * por compat — SHA256/SHA512 quebra em apps antigos).
 *
 * Por que otplib e não speakeasy:
 *   - otplib mantido (último commit recente vs speakeasy abandonado 2017).
 *   - API plug-and-play com window/step config global.
 *   - Plugin-based: substituir crypto backend sem refactor.
 */
export class OtplibTotpProvider implements TotpProvider {
  async generateSecret(opts: { issuer: string; accountName: string }): Promise<TotpSetupResult> {
    const { issuer, accountName } = opts;
    const secret = authenticator.generateSecret(); // 32 chars base32 = 160-bit entropy
    const otpauthUrl = authenticator.keyuri(accountName, issuer, secret);
    const qrCodeDataUrl = await qrcode.toDataURL(otpauthUrl, { errorCorrectionLevel: 'M' });
    return { secret, otpauthUrl, qrCodeDataUrl };
  }

  verify(opts: { secret: string; code: string }): boolean {
    const { secret, code } = opts;
    if (!secret || !code) return false;
    try {
      return authenticator.check(code, secret);
    } catch {
      // Defesa em profundidade — otplib.check pode lançar se secret invalido.
      // Tratamos como verify=false (mensagem genérica MFA_INVALID).
      return false;
    }
  }
}
