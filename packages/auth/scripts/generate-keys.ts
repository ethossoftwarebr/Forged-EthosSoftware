/**
 * Gera par Ed25519 (D13.1) pra dev/seed/CI.
 * Uso: pnpm --filter @ethos/auth generate-keys
 *
 * Output: PEM strings prontas pra colar em .env.
 */
import { generateEd25519Keypair } from '../src/jwks';

async function main() {
  const { privateKeyPem, publicKeyPem } = await generateEd25519Keypair();
  const kid = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

  console.log(`# Cole no .env (escapar newlines com \\n se preferir uma linha):\n`);

  console.log(`JWT_KID_CURRENT=${kid}`);

  console.log(`JWT_PRIVATE_KEY_CURRENT="${privateKeyPem.replace(/\n/g, '\\n')}"`);

  console.log(`JWT_PUBLIC_KEY_CURRENT="${publicKeyPem.replace(/\n/g, '\\n')}"`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
