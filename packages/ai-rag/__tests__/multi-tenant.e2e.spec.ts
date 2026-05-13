import { randomUUID } from 'node:crypto';

import { PrismaClient } from '@prisma/client';

/**
 * multi-tenant.e2e.spec.ts — AC4 (CRITICAL).
 *
 * Cria 2 Tenants reais no Postgres (`pgvector/pgvector:pg16`), insere 1 chunk
 * em cada via raw SQL com vetor `[0.1, 0.1, ...]` (1024 dims), e valida que
 * a query do tenant B NUNCA retorna chunks do tenant A (zero leak).
 *
 * Regras inviolaveis:
 *  - Cleanup em beforeAll + afterAll
 *  - Asserts `length === 0` (zero leak)
 *  - `randomUUID()` de `node:crypto`
 */

const TENANT_ACME = 'test-acme';
const TENANT_GLOBEX = 'test-globex';

const prisma = new PrismaClient({
  datasourceUrl: process.env.DATABASE_URL,
});

async function cleanup(): Promise<void> {
  await prisma.$executeRawUnsafe(
    `DELETE FROM "DocumentChunk" WHERE "tenantId" IN ('${TENANT_ACME}', '${TENANT_GLOBEX}')`,
  );
  await prisma.$executeRawUnsafe(
    `DELETE FROM "Document" WHERE "tenantId" IN ('${TENANT_ACME}', '${TENANT_GLOBEX}')`,
  );
  // Tenants ficam (slug unique pode estourar em paralelo) — não removemos
}

describe('Multi-tenant isolation (AC4)', () => {
  beforeAll(async () => {
    await cleanup();
    // upsert tenants — slug é unique
    await prisma.tenant.upsert({
      where: { slug: TENANT_ACME },
      update: {},
      create: { id: TENANT_ACME, slug: TENANT_ACME, name: 'Test Acme' },
    });
    await prisma.tenant.upsert({
      where: { slug: TENANT_GLOBEX },
      update: {},
      create: { id: TENANT_GLOBEX, slug: TENANT_GLOBEX, name: 'Test Globex' },
    });
  });

  afterAll(async () => {
    await cleanup();
    await prisma.$disconnect();
  });

  it('tenant globex query returns zero chunks from tenant acme', async () => {
    // 1. Cria Document em acme + 1 chunk com embedding fixo [0.1, ..., 0.1]
    const docAcme = await prisma.document.create({
      data: {
        tenantId: TENANT_ACME,
        userId: 'u_acme',
        sourceType: 'text',
        title: 'Acme test doc',
        status: 'ready',
        embedderUsed: 'mock',
        chunksCount: 1,
      },
    });
    const vec = new Array(1024).fill(0.1);
    const vecStr = '[' + vec.join(',') + ']';
    await prisma.$executeRawUnsafe(
      `INSERT INTO "DocumentChunk" (id, "documentId", "tenantId", index, content, embedding, embedder, tokens, "createdAt")
       VALUES ($1, $2, $3, 0, $4, $5::vector, 'mock', 10, NOW())`,
      randomUUID(),
      docAcme.id,
      TENANT_ACME,
      'acme secret content',
      vecStr,
    );

    // 2. Query como tenant globex — mesma direção do vetor acme (similarity max)
    const queryVec = '[' + new Array(1024).fill(0.1).join(',') + ']';
    const globexResults = await prisma.$queryRawUnsafe<Array<{ id: string; content: string }>>(
      `SELECT id, content FROM "DocumentChunk"
       WHERE "tenantId" = $1
       ORDER BY embedding <#> $2::vector
       LIMIT 5`,
      TENANT_GLOBEX,
      queryVec,
    );
    // ZERO leak — chunk do acme NUNCA aparece na query de globex
    expect(globexResults).toEqual([]);
    expect(globexResults.length).toBe(0);

    // 3. Sanity check: query do próprio acme retorna 1 chunk
    const acmeResults = await prisma.$queryRawUnsafe<Array<{ id: string; content: string }>>(
      `SELECT id, content FROM "DocumentChunk"
       WHERE "tenantId" = $1
       ORDER BY embedding <#> $2::vector
       LIMIT 5`,
      TENANT_ACME,
      queryVec,
    );
    expect(acmeResults.length).toBe(1);
    expect(acmeResults[0].content).toBe('acme secret content');
  });

  it('insert chunk em globex nao polui retrieval de acme', async () => {
    const docGlobex = await prisma.document.create({
      data: {
        tenantId: TENANT_GLOBEX,
        userId: 'u_globex',
        sourceType: 'text',
        title: 'Globex doc',
        status: 'ready',
        embedderUsed: 'mock',
        chunksCount: 1,
      },
    });
    const vec = new Array(1024).fill(0.9);
    const vecStr = '[' + vec.join(',') + ']';
    await prisma.$executeRawUnsafe(
      `INSERT INTO "DocumentChunk" (id, "documentId", "tenantId", index, content, embedding, embedder, tokens, "createdAt")
       VALUES ($1, $2, $3, 0, $4, $5::vector, 'mock', 10, NOW())`,
      randomUUID(),
      docGlobex.id,
      TENANT_GLOBEX,
      'globex content',
      vecStr,
    );

    const queryVec = '[' + new Array(1024).fill(0.9).join(',') + ']';
    const acmeResults = await prisma.$queryRawUnsafe<Array<{ id: string; content: string }>>(
      `SELECT id, content FROM "DocumentChunk"
       WHERE "tenantId" = $1
       ORDER BY embedding <#> $2::vector
       LIMIT 5`,
      TENANT_ACME,
      queryVec,
    );
    // acme nao ve content do globex
    expect(acmeResults.every((r) => r.content !== 'globex content')).toBe(true);
  });
});
