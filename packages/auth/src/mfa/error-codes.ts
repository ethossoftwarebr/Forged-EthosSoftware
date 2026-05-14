/**
 * Códigos de erro MFA (D8.7 spec) — usados pelo controller API pra mapear
 * `error.code` em status HTTP e mensagens i18n no front. Strings opacas
 * (não revelam stack/PII).
 *
 * Espelha o shape de `oauth/error-codes.ts` e `passwordless/error-codes.ts`
 * pra consistência cross-flow.
 */

export const MfaErrorCode = {
  /** Código TOTP de 6 dígitos não bate (fora da window=1 ±30s) ou backup code não existe. */
  MFA_INVALID: 'mfa_invalid',
  /** Backup code achado mas `usedAt !== null` — single-use enforcement. */
  MFA_BACKUP_USED: 'mfa_backup_used',
  /** User tentou verifyMfaChallenge mas não tem MfaSecret confirmado. */
  MFA_NOT_ENABLED: 'mfa_not_enabled',
  /** User tentou setupMfa mas já tem MfaSecret confirmado (verifiedAt != null). */
  MFA_ALREADY_ENABLED: 'mfa_already_enabled',
  /** confirmMfaSetup chamado mas não há MfaSecret pendente (verifiedAt=null) — fluxo inverso. */
  MFA_SETUP_NOT_CONFIRMED: 'mfa_setup_not_confirmed',
} as const;

export type MfaErrorCode = (typeof MfaErrorCode)[keyof typeof MfaErrorCode];

/**
 * Lista imutável de todos os códigos — útil pra testes de cobertura.
 */
export const ALL_MFA_ERROR_CODES: readonly MfaErrorCode[] = Object.freeze(
  Object.values(MfaErrorCode),
);
