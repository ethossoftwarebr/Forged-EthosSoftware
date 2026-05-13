import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

/**
 * AES-256-GCM crypto pra refresh_token at-rest (D8.5).
 *
 * Formato versionado: `v1:${iv_hex}:${authTag_hex}:${ciphertext_hex}`
 * Versão permite rotação futura (v2 com AAD, por exemplo) sem migration cega.
 *
 * Chave: Buffer de 32 bytes (256 bits). Caller decodifica de
 * `OAUTH_TOKEN_ENCRYPTION_KEY` (hex) via {@link parseEncryptionKey}.
 *
 * NÃO usado pra password (use `@ethos/auth/hash` argon2id) — só pra dados que
 * precisam ser **decifrados** (OAuth refresh tokens p/ refresh server-side).
 */

const ALGORITHM = 'aes-256-gcm';
const IV_BYTES = 12; // 96 bits — recomendado pra GCM
const KEY_BYTES = 32; // 256 bits
const AUTH_TAG_BYTES = 16; // 128 bits
const VERSION = 'v1';

/**
 * Decodifica chave hex (64 chars) em Buffer de 32 bytes. Lança se tamanho
 * inválido — proteção contra config errada em runtime.
 */
export function parseEncryptionKey(hex: string): Buffer {
  if (!/^[0-9a-fA-F]+$/.test(hex)) {
    throw new Error('OAUTH_TOKEN_ENCRYPTION_KEY deve ser hex (chars 0-9a-fA-F).');
  }
  const buf = Buffer.from(hex, 'hex');
  if (buf.length !== KEY_BYTES) {
    throw new Error(
      `OAUTH_TOKEN_ENCRYPTION_KEY deve ter ${KEY_BYTES} bytes (${KEY_BYTES * 2} hex chars); recebeu ${buf.length} bytes.`,
    );
  }
  return buf;
}

function assertKey(key: Buffer): void {
  if (!Buffer.isBuffer(key) || key.length !== KEY_BYTES) {
    throw new Error(`Chave AES-256-GCM precisa ter exatamente ${KEY_BYTES} bytes.`);
  }
}

/**
 * Criptografa string plaintext (UTF-8). IV fresco a cada chamada. Output
 * inclui versão + IV + authTag — todos necessários pra decifrar.
 */
export function encryptToken(plain: string, key: Buffer): string {
  assertKey(key);
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([cipher.update(plain, 'utf-8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${VERSION}:${iv.toString('hex')}:${authTag.toString('hex')}:${ciphertext.toString('hex')}`;
}

/**
 * Decifra valor produzido por {@link encryptToken}. Falha (lança) se:
 * - versão desconhecida
 * - formato inválido (não tem 4 partes)
 * - authTag não bate (tampering ou chave errada)
 * - IV / authTag com tamanho fora do esperado
 */
export function decryptToken(ciphertext: string, key: Buffer): string {
  assertKey(key);
  const parts = ciphertext.split(':');
  if (parts.length !== 4) {
    throw new Error('Formato de ciphertext inválido (esperado v1:iv:authTag:data).');
  }
  const [version, ivHex, authTagHex, dataHex] = parts;
  if (version !== VERSION) {
    throw new Error(`Versão de ciphertext desconhecida: ${version}`);
  }
  const iv = Buffer.from(ivHex!, 'hex');
  const authTag = Buffer.from(authTagHex!, 'hex');
  const data = Buffer.from(dataHex!, 'hex');
  if (iv.length !== IV_BYTES) {
    throw new Error(`IV inválido (esperado ${IV_BYTES} bytes).`);
  }
  if (authTag.length !== AUTH_TAG_BYTES) {
    throw new Error(`authTag inválido (esperado ${AUTH_TAG_BYTES} bytes).`);
  }
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  const plain = Buffer.concat([decipher.update(data), decipher.final()]);
  return plain.toString('utf-8');
}
