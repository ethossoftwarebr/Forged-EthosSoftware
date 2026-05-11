import { hash } from '@node-rs/argon2';
import { PrismaClient } from '@prisma/client';

/**
 * Seed default — 1 tenant `default` + 1 owner `admin@ethos.local`.
 *
 * Idempotente: se o tenant `default` já existe, sai sem fazer nada
 * (não tenta criar User duplicado).
 *
 * Segurança: senha NUNCA vem de default público — exige `SEED_ADMIN_PASSWORD`
 * env (≥ 12 chars). Em CI/Railway, popule via secret manager antes do `db:seed`.
 *
 * Argon2id config: idêntica à do `@ethos/auth/hash.ts` (D1). Inlinada aqui em
 * vez de `import { hashPassword } from '@ethos/auth'` pra evitar cycle no
 * grafo do Turbo (`@ethos/auth` depende de `@ethos/database` via NativeAdapter).
 * Trade-off aceito: 4 linhas duplicadas vs cycle.
 */

const prisma = new PrismaClient();

const argonConfig = {
  algorithm: 2 as const, // Argon2id
  memoryCost: parseInt(process.env.ARGON_MEMORY_COST ?? '65536', 10),
  timeCost: parseInt(process.env.ARGON_TIME_COST ?? '3', 10),
  parallelism: parseInt(process.env.ARGON_PARALLELISM ?? '4', 10),
};

async function main(): Promise<void> {
  const adminEmail = 'admin@ethos.local';
  const adminPassword = process.env.SEED_ADMIN_PASSWORD;

  if (!adminPassword) {
    throw new Error(
      'SEED_ADMIN_PASSWORD env não definida — sem default público por segurança. Setá-la (≥ 12 chars) antes de rodar `pnpm db:seed`.',
    );
  }
  if (adminPassword.length < 12) {
    throw new Error('SEED_ADMIN_PASSWORD precisa ter ≥ 12 chars.');
  }

  // Idempotência: skip se tenant default já existe.
  const existingTenant = await prisma.tenant.findUnique({ where: { slug: 'default' } });
  if (existingTenant) {
    console.log(`Seed: tenant 'default' já existe (id=${existingTenant.id}) — skip.`);
    return;
  }

  const passwordHash = await hash(adminPassword, argonConfig);

  const tenant = await prisma.tenant.create({
    data: {
      slug: 'default',
      name: 'Default Tenant',
      locale: 'pt-BR',
    },
  });

  const user = await prisma.user.create({
    data: {
      email: adminEmail,
      password: passwordHash,
      name: 'Admin',
    },
  });

  await prisma.tenantMember.create({
    data: {
      tenantId: tenant.id,
      userId: user.id,
      role: 'owner',
    },
  });

  console.log(
    `Seed: tenant 'default' (id=${tenant.id}) + owner ${adminEmail} (userId=${user.id}) criados.`,
  );
}

main()
  .catch((e: unknown) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
