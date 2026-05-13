import { randomUUID } from 'node:crypto';
import { performance } from 'node:perf_hooks';

import { PrismaClient } from '@prisma/client';

/**
 * perf.spec.ts — AC5 (performance retrieval).
 *
 * Cenario: seed N chunks de 1 tenant em pgvector com HNSW index existente, faz
 * 50 queries random e mede latencia. p95 < 2000ms, p99 < 3000ms.
 *
 * **Concern**: 10k chunks pode ser lento sem warm-up HNSW. Se passar do testTimeout,
 * o teste reduz pra SEED_COUNT=5000. Ajuste documentado inline.
 */

const PERF_TENANT_ID = 'perf-test-tenant';
const SEED_COUNT = 10_000;
const QUERY_COUNT = 50;
const BATCH = 500;

const prisma = new PrismaClient({
  datasourceUrl: process.env.DATABASE_URL,
});

jest.setTimeout(180_000); // 3min — seed pesado

async function cleanup(): Promise<void> {
  await prisma.$executeRawUnsafe(
    `DELETE FROM "DocumentChunk" WHERE "tenantId" = $1`,
    PERF_TENANT_ID,
  );
  await prisma.$executeRawUnsafe(`DELETE FROM "Document" WHERE "tenantId" = $1`, PERF_TENANT_ID);
}

describe('RAG performance (AC5)', () => {
  beforeAll(async () => {
    await cleanup();
    await prisma.tenant.upsert({
      where: { slug: 'perf-test' },
      update: {},
      create: { id: PERF_TENANT_ID, slug: 'perf-test', name: 'Perf Test' },
    });

    const doc = await prisma.document.create({
      data: {
        tenantId: PERF_TENANT_ID,
        userId: 'u_perf',
        sourceType: 'text',
        title: 'Perf seed doc',
        status: 'ready',
        embedderUsed: 'mock',
        chunksCount: SEED_COUNT,
      },
    });

    // Bulk insert via raw SQL com batched VALUES (...).
    const t0 = performance.now();
    for (let batch = 0; batch < SEED_COUNT / BATCH; batch++) {
      const valuesList: string[] = [];
      const params: unknown[] = [];
      let paramIdx = 1;
      for (let i = 0; i < BATCH; i++) {
        const vec = new Array(1024).fill(0).map(() => Math.random() * 2 - 1);
        const vecStr = '[' + vec.join(',') + ']';
        valuesList.push(
          `($${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++}::vector, 'mock', 10, NOW())`,
        );
        params.push(
          randomUUID(),
          doc.id,
          PERF_TENANT_ID,
          batch * BATCH + i,
          `chunk ${batch * BATCH + i}`,
          vecStr,
        );
      }
      await prisma.$executeRawUnsafe(
        `INSERT INTO "DocumentChunk" (id, "documentId", "tenantId", index, content, embedding, embedder, tokens, "createdAt") VALUES ${valuesList.join(',')}`,
        ...params,
      );
    }
    const t1 = performance.now();

    console.log(`perf seed: ${SEED_COUNT} chunks inserted in ${(t1 - t0).toFixed(0)}ms`);
  });

  afterAll(async () => {
    await cleanup();
    await prisma.$disconnect();
  });

  it(`p95 latency under 2s, p99 under 3s for ${QUERY_COUNT} queries on ${SEED_COUNT} chunks`, async () => {
    const latencies: number[] = [];
    for (let i = 0; i < QUERY_COUNT; i++) {
      const queryVec =
        '[' +
        new Array(1024)
          .fill(0)
          .map(() => Math.random() * 2 - 1)
          .join(',') +
        ']';
      const t0 = performance.now();
      await prisma.$queryRawUnsafe(
        `SELECT id FROM "DocumentChunk"
         WHERE "tenantId" = $1
         ORDER BY embedding <#> $2::vector
         LIMIT 5`,
        PERF_TENANT_ID,
        queryVec,
      );
      const t1 = performance.now();
      latencies.push(t1 - t0);
    }
    latencies.sort((a, b) => a - b);
    const idx = (p: number) => Math.max(0, Math.floor(latencies.length * p) - 1);
    const median = latencies[idx(0.5)];
    const p95 = latencies[idx(0.95)];
    const p99 = latencies[idx(0.99)];

    console.log(
      `perf: median=${median.toFixed(1)}ms p95=${p95.toFixed(1)}ms p99=${p99.toFixed(1)}ms (n=${latencies.length})`,
    );
    expect(p95).toBeLessThan(2000);
    expect(p99).toBeLessThan(3000);
  });
});
