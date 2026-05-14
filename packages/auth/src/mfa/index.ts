/**
 * Sub-barrel @ethos/auth/mfa (W1 do #8.7).
 *
 * Importação:
 *   import { OtplibTotpProvider, generateBackupCodes, MfaErrorCode } from '@ethos/auth/mfa';
 *
 * O root barrel (`@ethos/auth`) reexporta `MfaProvider` type. Esses símbolos
 * são exclusivos do flow TOTP/backup codes.
 */

export { OtplibTotpProvider, type TotpProvider, type TotpSetupResult } from './totp.provider';

export {
  BACKUP_CODE_ALPHABET,
  BACKUP_CODE_LENGTH,
  BACKUP_CODE_COUNT,
  generateBackupCodes,
  hashBackupCode,
  verifyBackupCode,
} from './backup-codes';

export { MfaErrorCode, ALL_MFA_ERROR_CODES } from './error-codes';

// Re-export interface pra consumers do subpath
export type { MfaProvider } from '../mfa';
