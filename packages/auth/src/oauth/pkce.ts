import { randomBytes, createHash } from 'node:crypto';

/**
 * PKCE (Proof Key for Code Exchange — RFC 7636) — D8.5 / D12 atualizado.
 *
 * Apenas o método **S256** é aceito (`plain` proibido por design — guard contra
 * downgrade). Verifier: 32 bytes random → base64url (43 chars).
 * Challenge: SHA-256(verifier) → base64url.
 */

const VERIFIER_BYTES = 32;
const VERIFIER_BASE64URL_LENGTH = 43; // 32 bytes → 43 chars sem padding

/**
 * Gera um `code_verifier` PKCE com 32 bytes de entropia em base64url.
 * Resultado tem exatamente 43 caracteres (atende RFC 7636 §4.1, range 43-128).
 */
export function genVerifier(): string {
  return randomBytes(VERIFIER_BYTES).toString('base64url');
}

/**
 * Calcula o `code_challenge` S256 a partir de um verifier.
 * SHA-256 do verifier em ASCII → base64url. Determinístico (mesmo verifier
 * sempre produz o mesmo challenge — usado nos testes de round-trip).
 */
export function genChallenge(verifier: string): string {
  return createHash('sha256').update(verifier, 'ascii').digest('base64url');
}

/**
 * O método PKCE suportado é apenas `S256` (D8.5). Qualquer outra string lança.
 * Use isso em parsers de callback que recebem `code_challenge_method` do client.
 */
export function assertS256(method: string): asserts method is 'S256' {
  if (method !== 'S256') {
    throw new Error(`PKCE method "${method}" rejeitado — apenas S256 é aceito.`);
  }
}

/**
 * Helper de validação opcional pra verifiers vindos de cookie/storage — checa
 * comprimento mínimo válido (RFC 7636 §4.1: 43-128 chars).
 */
export function isValidVerifierLength(verifier: string): boolean {
  return verifier.length >= VERIFIER_BASE64URL_LENGTH && verifier.length <= 128;
}
