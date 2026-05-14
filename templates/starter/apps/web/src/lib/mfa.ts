/**
 * MFA helpers (D8.7).
 *
 * Estratégia:
 *  - Endpoints protegidos (`setup`, `setup/confirm`, `disable`, `status`) usam
 *    o axios `api` instance (cookie httpOnly + X-Tenant-Slug + refresh-on-401).
 *  - Endpoint público (`challenge`, `challenge/backup`) também usa `api`: o
 *    refresh-on-401 não é problema aqui porque o backend devolve 401 com
 *    código MFA_INVALID, e o response interceptor só faz refresh em 401 puro
 *    sem retry; nesse caso o erro propaga normalmente e o componente
 *    consegue mapear pra mensagem PT-BR.
 *  - Erros do backend vêm em shape `{ code, message }` (UnauthorizedException
 *    do mfa.controller). Normalizamos via `extractErrorCode` pra mapear no
 *    `MFA_ERROR_MESSAGES`.
 *
 * Guards (CLAUDE.md):
 *  - mfaToken NUNCA persiste em localStorage — fica em estado React in-memory
 *    do componente que chama submitMfaChallenge.
 *  - tenantSlug NÃO vai no body — interceptor injeta no header.
 */

import axios from 'axios';

import { api } from './api-client';

/**
 * Mensagens PT-BR para os códigos de erro retornados pelo backend MFA.
 * Códigos vêm do enum `MfaErrorCode` (@ethos/auth) + códigos da controller
 * (`TOKEN_INVALID`, `INVALID_CREDENTIALS`, `MFA_RATE_LIMITED`).
 */
export const MFA_ERROR_MESSAGES: Record<string, string> = {
  MFA_INVALID: 'Código inválido. Tente novamente.',
  MFA_BACKUP_USED: 'Este código de backup já foi utilizado.',
  MFA_NOT_ENABLED: 'MFA não está habilitado nesta conta.',
  MFA_ALREADY_ENABLED: 'MFA já está habilitado nesta conta.',
  MFA_SETUP_NOT_CONFIRMED: 'Setup MFA não foi confirmado. Reinicie o processo.',
  MFA_RATE_LIMITED: 'Muitas tentativas. Aguarde alguns minutos e tente novamente.',
  TOKEN_INVALID: 'Sessão MFA expirou. Faça login novamente.',
  INVALID_CREDENTIALS: 'Senha incorreta.',
  UNKNOWN: 'Erro inesperado. Tente novamente.',
};

export interface MfaSetupResponse {
  /** Base32 secret (apresentado em monospace como fallback ao QR). */
  secret: string;
  /** Data URL `data:image/png;base64,...` pronta pra <img src>. */
  qrCodeDataUrl: string;
  /** otpauth://totp/... URI; útil pra "Copiar" e abrir no app authenticator. */
  otpauthUrl: string;
}

export interface MfaConfirmResponse {
  /** 10 backup codes alfanuméricos. Mostrados ao usuário apenas UMA vez. */
  backupCodes: string[];
}

export interface MfaStatusResponse {
  enabled: boolean;
  verifiedAt: string | null;
  backupCodesRemaining: number;
}

/**
 * Extrai o `code` de uma resposta de erro do backend.
 * Backend devolve `{ code, message }` (envelope flat ou aninhado em `data`).
 */
function extractErrorCode(err: unknown): string {
  if (!axios.isAxiosError(err)) return 'UNKNOWN';
  const responseData = err.response?.data;
  if (!responseData || typeof responseData !== 'object') return 'UNKNOWN';
  const payload = responseData as Record<string, unknown>;
  // Pode vir flat ({ code }) ou aninhado ({ data: { code } }, { error: { code } }).
  const direct = typeof payload.code === 'string' ? payload.code : undefined;
  const nestedData =
    payload.data && typeof payload.data === 'object'
      ? ((payload.data as Record<string, unknown>).code as string | undefined)
      : undefined;
  const nestedError =
    payload.error && typeof payload.error === 'object'
      ? ((payload.error as Record<string, unknown>).code as string | undefined)
      : undefined;
  return direct ?? nestedData ?? nestedError ?? 'UNKNOWN';
}

/**
 * Mapeia erro do backend pra mensagem PT-BR pronta pra exibir.
 * Helper público pra componentes não duplicarem o mapping.
 */
export function mfaErrorMessage(err: unknown): string {
  const code = extractErrorCode(err);
  return MFA_ERROR_MESSAGES[code] ?? MFA_ERROR_MESSAGES.UNKNOWN ?? 'Erro inesperado.';
}

// ============================================================================
// API calls
// ============================================================================

/**
 * GET /auth/mfa/status — info pro próprio user.
 * Lança em 401 (não autenticado) — caller decide redirect.
 */
export async function fetchMfaStatus(): Promise<MfaStatusResponse> {
  const { data } = await api.get<MfaStatusResponse>('/auth/mfa/status');
  return data;
}

/**
 * POST /auth/mfa/setup — gera secret + QR. Idempotente: re-chamadas
 * antes do confirm reutilizam o secret (upsert no backend).
 */
export async function startMfaSetup(): Promise<MfaSetupResponse> {
  const { data } = await api.post<MfaSetupResponse>('/auth/mfa/setup', {});
  return data;
}

/**
 * POST /auth/mfa/setup/confirm — verifica primeiro TOTP + devolve backup codes.
 * Marca `mfaEnabled=true` no User.
 */
export async function confirmMfaSetup(code: string): Promise<MfaConfirmResponse> {
  const { data } = await api.post<MfaConfirmResponse>('/auth/mfa/setup/confirm', { code });
  return data;
}

/**
 * POST /auth/mfa/disable — apaga MfaSecret + backup codes. Requer senha
 * (re-auth — D8.7). Não retorna nada útil; sucesso = HTTP 200.
 */
export async function disableMfa(password: string): Promise<void> {
  await api.post('/auth/mfa/disable', { password });
}

/**
 * POST /auth/mfa/challenge[/backup] — completa o login após password OK.
 * Sucesso seta cookies httpOnly de access/refresh — caller só precisa redirect.
 */
export async function submitMfaChallenge(opts: {
  mfaToken: string;
  code: string;
  isBackupCode?: boolean;
}): Promise<{ ok: true }> {
  const path = opts.isBackupCode ? '/auth/mfa/challenge/backup' : '/auth/mfa/challenge';
  const { data } = await api.post<{ ok: true }>(path, {
    mfaToken: opts.mfaToken,
    code: opts.code,
  });
  return data;
}
