import {
  importPKCS8,
  importSPKI,
  generateKeyPair,
  exportPKCS8,
  exportSPKI,
  type KeyLike,
} from 'jose';

/**
 * JWKS management (D13.4) — suporta kid rotation com até 2 chaves ativas:
 * - CURRENT: usada pra assinar; também aceita pra verify
 * - PREVIOUS: aceita só pra verify (durante janela de rotação)
 *
 * Loaded de env vars PEM-encoded ou via instância criada in-process pra testes.
 *
 * Algoritmo travado: EdDSA / Ed25519 (D13.1).
 */

export interface JwtKeyMaterial {
  kid: string;
  privateKey?: KeyLike; // só na current
  publicKey: KeyLike;
}

export interface JwtKeyset {
  current: JwtKeyMaterial; // tem privateKey (assina)
  previous?: JwtKeyMaterial; // só publicKey (verify-only)
}

const ALG = 'EdDSA' as const;

/**
 * Carrega keyset de env vars:
 *   JWT_PRIVATE_KEY_CURRENT  (PKCS8 PEM)
 *   JWT_PUBLIC_KEY_CURRENT   (SPKI PEM)
 *   JWT_KID_CURRENT          (string, ex: "2026-05-10")
 *   JWT_PUBLIC_KEY_PREVIOUS  (opcional — durante rotação)
 *   JWT_KID_PREVIOUS         (opcional)
 */
export async function loadKeysetFromEnv(env = process.env): Promise<JwtKeyset> {
  const currentKid = env.JWT_KID_CURRENT;
  const currentPriv = env.JWT_PRIVATE_KEY_CURRENT;
  const currentPub = env.JWT_PUBLIC_KEY_CURRENT;

  if (!currentKid || !currentPriv || !currentPub) {
    throw new Error(
      'JWT keyset incompleto. Precisa: JWT_KID_CURRENT + JWT_PRIVATE_KEY_CURRENT + JWT_PUBLIC_KEY_CURRENT. ' +
        'Gere chaves Ed25519 com: pnpm --filter @ethos/auth generate-keys',
    );
  }

  const current: JwtKeyMaterial = {
    kid: currentKid,
    privateKey: await importPKCS8(currentPriv, ALG),
    publicKey: await importSPKI(currentPub, ALG),
  };

  let previous: JwtKeyMaterial | undefined;
  if (env.JWT_KID_PREVIOUS && env.JWT_PUBLIC_KEY_PREVIOUS) {
    previous = {
      kid: env.JWT_KID_PREVIOUS,
      publicKey: await importSPKI(env.JWT_PUBLIC_KEY_PREVIOUS, ALG),
    };
  }

  return { current, previous };
}

/**
 * Resolve a chave pública correta pelo kid (lookup pra verify).
 * Retorna null se kid desconhecido — chamadores devem rejeitar com TOKEN_INVALID.
 */
export function resolveVerificationKey(keyset: JwtKeyset, kid: string | undefined): KeyLike | null {
  if (!kid) return null;
  if (keyset.current.kid === kid) return keyset.current.publicKey;
  if (keyset.previous?.kid === kid) return keyset.previous.publicKey;
  return null;
}

/**
 * Helper pra gerar par Ed25519 pra dev/test/seed. Output: PEM strings prontas
 * pra colar em .env (após escapar newlines).
 */
export async function generateEd25519Keypair(): Promise<{
  privateKeyPem: string;
  publicKeyPem: string;
}> {
  const { privateKey, publicKey } = await generateKeyPair(ALG);
  const privateKeyPem = await exportPKCS8(privateKey);
  const publicKeyPem = await exportSPKI(publicKey);
  return { privateKeyPem, publicKeyPem };
}
