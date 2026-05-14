import { randomInt } from 'node:crypto';

import { hashToken, verifyTokenHash } from '../hash';

/**
 * Crockford base32 (D8.7.2) — exclui chars ambíguos: 0/1/I/L/O/U.
 * Total: 30 chars. Entropia por code: 8 * log2(30) ≈ 39.2 bits.
 * Brute-force online com rate-limit + single-use → seguro pra fallback de TOTP.
 */
export const BACKUP_CODE_ALPHABET = '23456789ABCDEFGHJKMNPQRSTVWXYZ';

export const BACKUP_CODE_LENGTH = 8;

export const BACKUP_CODE_COUNT = 10;

/**
 * Gera `count` códigos únicos de 8 chars do alfabeto Crockford base32. Usa
 * `crypto.randomInt` (CSPRNG) — uniform distribution sem bias modular.
 *
 * Garantia de unicidade: regenera em caso de colisão (probabilidade
 * astronomicamente baixa com 30^8 ≈ 6.5e11 combinações, mas defesa em
 * profundidade contra bug futuro em randomInt).
 */
export function generateBackupCodes(count: number = BACKUP_CODE_COUNT): string[] {
  const codes = new Set<string>();
  const alphabetLen = BACKUP_CODE_ALPHABET.length;

  while (codes.size < count) {
    let code = '';
    for (let i = 0; i < BACKUP_CODE_LENGTH; i++) {
      code += BACKUP_CODE_ALPHABET.charAt(randomInt(0, alphabetLen));
    }
    codes.add(code);
  }

  return Array.from(codes);
}

/**
 * Hasheia um backup code via argon2id (D8.7.3 — reuse params de `hash.ts`).
 * Salt random embedded — hashes diferentes pra mesmo code são esperados.
 */
export async function hashBackupCode(code: string): Promise<string> {
  return hashToken(code);
}

/**
 * Verifica plaintext code contra hash argon2id. Wrapper semântico — usa
 * `verifyTokenHash` por baixo.
 */
export async function verifyBackupCode(code: string, hash: string): Promise<boolean> {
  return verifyTokenHash(code, hash);
}
