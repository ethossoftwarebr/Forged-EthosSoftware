import { hashPassword } from '@ethos/auth';
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
 * Princípio CLAUDE.md: argon2id (D1) — usa `hashPassword` do `@ethos/auth`.
 */

const prisma = new PrismaClient();

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

  const passwordHash = await hashPassword(adminPassword);

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
