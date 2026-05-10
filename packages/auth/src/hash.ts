import { hash, verify } from '@node-rs/argon2';

/**
 * Argon2id config (D1) — escolhido por:
 * - resistência simultânea a GPU/ASIC e cache-timing attacks
 * - vencedor do Password Hashing Competition 2015
 * - parâmetros default OWASP 2024: memoryCost=64MB, timeCost=3, parallelism=4
 *
 * Os parâmetros são configuráveis via env pra teste/CI usar valores menores
 * (AC #7) sem afetar prod.
 */
// Algorithm.Argon2id = 2 (const enum no @node-rs/argon2; usado como literal pra
// compatibilidade com isolatedModules).
const argonConfig = {
  algorithm: 2 as const,
  memoryCost: parseInt(process.env.ARGON_MEMORY_COST ?? '65536', 10), // 64 MiB
  timeCost: parseInt(process.env.ARGON_TIME_COST ?? '3', 10),
  parallelism: parseInt(process.env.ARGON_PARALLELISM ?? '4', 10),
};

/**
 * Hashea uma senha plaintext. Output inclui parâmetros e salt — armazenar como
 * está no campo `User.password` (string $argon2id$...).
 */
export async function hashPassword(plaintext: string): Promise<string> {
  return hash(plaintext, argonConfig);
}

/**
 * Verifica senha contra hash armazenado. Retorna boolean — chamadores devem
 * loggar tentativa falha pra trigger de lockout (D14.6 — NativeAuthAdapter).
 */
export async function verifyPassword(plaintext: string, hashed: string): Promise<boolean> {
  try {
    return await verify(hashed, plaintext);
  } catch {
    return false;
  }
}

/**
 * Hash de tokens de uso único (refresh, magic link, backup codes — D13.5/D14.4).
 * Mesma config do password mas exposed como função separada pra clareza
 * semântica em call sites.
 */
export async function hashToken(plaintext: string): Promise<string> {
  return hash(plaintext, argonConfig);
}

export async function verifyTokenHash(plaintext: string, hashed: string): Promise<boolean> {
  return verifyPassword(plaintext, hashed);
}
