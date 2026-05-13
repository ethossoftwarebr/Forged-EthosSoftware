import { AiRagIngestWorker } from '../src/server/workers/ingest.worker';

import { mockChunker, mockEmbedder, mockQueue } from './helpers/mocks';

/**
 * ingest-worker.spec.ts — fluxo de processamento mockado.
 *
 * Testa o caminho privado `process(job)` indireto via `as never` cast. Mock
 * adapters retornam dados deterministicos. Mock Prisma respeita as APIs
 * usadas: document.update + ragIngestJob.update + $executeRawUnsafe.
 *
 * Nao usa fixture PDF (`unpdf` lazy import) — V1 fica como concern documentado.
 */

interface MockPrismaState {
  documents: Map<string, { id: string; status: string; chunksCount?: number }>;
  chunks: Array<{
    id: string;
    documentId: string;
    tenantId: string;
    index: number;
    content: string;
  }>;
  jobs: Map<string, { id: string; status: string; error?: string; retries: number }>;
}

function createMockPrisma(state: MockPrismaState) {
  return {
    document: {
      update: jest.fn(
        async ({
          where,
          data,
        }: {
          where: { id: string };
          data: { status?: string; chunksCount?: number };
        }) => {
          const doc = state.documents.get(where.id);
          if (!doc) return null;
          if (data.status) doc.status = data.status;
          if (typeof data.chunksCount === 'number') doc.chunksCount = data.chunksCount;
          return doc;
        },
      ),
    },
    ragIngestJob: {
      update: jest.fn(
        async ({
          where,
          data,
        }: {
          where: { id: string };
          data: { status?: string; error?: string; retries?: { increment: number } };
        }) => {
          const job = state.jobs.get(where.id);
          if (!job) return null;
          if (data.status) job.status = data.status;
          if (data.error) job.error = data.error;
          if (data.retries?.increment) job.retries += data.retries.increment;
          return job;
        },
      ),
    },
    $executeRawUnsafe: jest.fn(async (_sql: string, ...params: unknown[]) => {
      // Captura os parametros como se fosse um INSERT
      const [id, documentId, tenantId, index, content] = params as [
        string,
        string,
        string,
        number,
        string,
      ];
      state.chunks.push({ id, documentId, tenantId, index, content });
      return 1;
    }),
  };
}

function makeOptions() {
  return {
    answerModel: 'claude-haiku-4-5',
    ingestConcurrency: 2,
    embedderName: 'mock-embedder',
  };
}

function makeJob(payload: { documentId: string; tenantId: string; input: unknown }, id = 'job_1') {
  return { id, data: payload } as never;
}

describe('AiRagIngestWorker — process flow (mocked)', () => {
  it('happy path: pending → processing → ready + chunks persisted', async () => {
    const state: MockPrismaState = {
      documents: new Map([['doc_1', { id: 'doc_1', status: 'pending' }]]),
      chunks: [],
      jobs: new Map([['job_1', { id: 'job_1', status: 'waiting', retries: 0 }]]),
    };
    const prisma = createMockPrisma(state);
    const embedder = mockEmbedder();
    const chunker = mockChunker([
      { content: 'chunk A', index: 0, tokens: 2 },
      { content: 'chunk B', index: 1, tokens: 2 },
    ]);
    const queue = mockQueue();

    const worker = new AiRagIngestWorker(embedder, chunker, queue, prisma as never, makeOptions());

    // process é privado — invocamos via reflection (cast). O fluxo público é
    // disparado pelo BullMQ Worker que so liga em onModuleInit; pulamos esse step.
    const job = makeJob({
      documentId: 'doc_1',
      tenantId: 'tenant_x',
      input: { kind: 'text', text: 'algum texto que vai ser chunked' },
    });
    await (worker as unknown as { process: (j: unknown) => Promise<void> }).process(job);

    // Document.update chamado 2x: processing + ready
    expect(prisma.document.update).toHaveBeenCalledTimes(2);
    expect(prisma.document.update).toHaveBeenNthCalledWith(1, {
      where: { id: 'doc_1' },
      data: { status: 'processing' },
    });
    expect(prisma.document.update).toHaveBeenNthCalledWith(2, {
      where: { id: 'doc_1' },
      data: { status: 'ready', chunksCount: 2 },
    });

    // 2 chunks persistidos via raw SQL
    expect(state.chunks).toHaveLength(2);
    expect(state.chunks[0].content).toBe('chunk A');
    expect(state.chunks[1].content).toBe('chunk B');
    expect(state.chunks.every((c) => c.tenantId === 'tenant_x')).toBe(true);

    // ragIngestJob marcado como completed
    expect(prisma.ragIngestJob.update).toHaveBeenCalledWith({
      where: { id: 'job_1' },
      data: { status: 'completed' },
    });
  });

  it('error path: embedder.embed throws → status=failed + error persisted', async () => {
    const state: MockPrismaState = {
      documents: new Map([['doc_2', { id: 'doc_2', status: 'pending' }]]),
      chunks: [],
      jobs: new Map([['job_err', { id: 'job_err', status: 'waiting', retries: 0 }]]),
    };
    const prisma = createMockPrisma(state);
    const embedder = mockEmbedder();
    embedder.embed = jest.fn(async () => {
      throw new Error('voyage api 500');
    }) as never;
    const chunker = mockChunker([{ content: 'x', index: 0, tokens: 1 }]);
    const queue = mockQueue();
    const worker = new AiRagIngestWorker(embedder, chunker, queue, prisma as never, makeOptions());

    const job = makeJob(
      {
        documentId: 'doc_2',
        tenantId: 'tenant_y',
        input: { kind: 'text', text: 'qualquer coisa' },
      },
      'job_err',
    );

    await expect(
      (worker as unknown as { process: (j: unknown) => Promise<void> }).process(job),
    ).rejects.toThrow(/voyage api 500/);

    // Document marcado como failed
    const failedCall = prisma.document.update.mock.calls.find(
      ([arg]) => arg.data.status === 'failed',
    );
    expect(failedCall).toBeDefined();

    // RagIngestJob com erro persistido e retry++
    const jobUpdateErr = prisma.ragIngestJob.update.mock.calls.find(
      ([arg]) => arg.data.status === 'failed',
    );
    expect(jobUpdateErr).toBeDefined();
    expect(jobUpdateErr![0].data.error).toContain('voyage api 500');
    expect(state.chunks).toHaveLength(0);
  });

  it('error path: empty text → status=failed (extracted text empty)', async () => {
    const state: MockPrismaState = {
      documents: new Map([['doc_3', { id: 'doc_3', status: 'pending' }]]),
      chunks: [],
      jobs: new Map([['job_empty', { id: 'job_empty', status: 'waiting', retries: 0 }]]),
    };
    const prisma = createMockPrisma(state);
    const embedder = mockEmbedder();
    const chunker = mockChunker([]);
    const queue = mockQueue();
    const worker = new AiRagIngestWorker(embedder, chunker, queue, prisma as never, makeOptions());

    const job = makeJob(
      {
        documentId: 'doc_3',
        tenantId: 'tenant_z',
        input: { kind: 'text', text: '   ' }, // só whitespace
      },
      'job_empty',
    );

    await expect(
      (worker as unknown as { process: (j: unknown) => Promise<void> }).process(job),
    ).rejects.toThrow(/empty/i);
  });
});

// V1 concern: sample.pdf fixture postergado — unpdf é lazy import + peer
// optional; teste de PDF via mock fica para spec #14.5 (RAG advanced).
