import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';

import { PRISMA_CLIENT_TOKEN } from '@ethos/api-base';
import type { PrismaClient } from '@ethos/database';
import {
  Inject,
  Injectable,
  Logger,
  type OnModuleDestroy,
  type OnModuleInit,
} from '@nestjs/common';
import { Worker, type Job } from 'bullmq';

import type { ChunkerAdapter, EmbedderAdapter, QueueAdapter } from '../../shared/adapters';
import { QUEUE_NAME_INGEST } from '../../shared/constants';
import type { IngestRequest } from '../../shared/types';
import { BullMQQueueAdapter } from '../adapters/bullmq-queue';
import {
  AI_RAG_OPTIONS_TOKEN,
  type AiRagOptions,
  CHUNKER_TOKEN,
  EMBEDDER_TOKEN,
  QUEUE_ADAPTER_TOKEN,
} from '../ai-rag.service';

interface IngestJobPayload {
  documentId: string;
  tenantId: string;
  input: IngestRequest;
}

/**
 * AiRagIngestWorker — processa jobs BullMQ enfileirados por `AiRagService.ingest`.
 *
 * Lifecycle:
 *  - `onModuleInit`: instancia `Worker` BullMQ com concurrency=options.ingestConcurrency
 *  - `onModuleDestroy`: fecha worker
 *
 * Fluxo do job:
 *  1. Update Document.status='processing'
 *  2. Extract text (text → input.text; url → fetch; file → read FS; PDF lazy via `unpdf`)
 *  3. chunker.chunk(text) → chunks[]
 *  4. embedder.embed(chunks.map(c=>c.content)) → embeddings[][]
 *  5. Bulk insert DocumentChunk via raw SQL ($N::vector cast obrigatório)
 *  6. Update Document.status='ready' + chunksCount
 *  7. On error: status='failed' + persist error + throw (BullMQ retry handle)
 *
 * V1 concerns (anotados inline):
 *  - W2-C1: kind=url assume text/plain. HTML parsing fica pra V2.
 *  - W2-C2: kind=file assume `filename` é path local no FS (sem multipart parsing).
 */
@Injectable()
export class AiRagIngestWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AiRagIngestWorker.name);
  private worker: Worker | null = null;

  constructor(
    @Inject(EMBEDDER_TOKEN) private readonly embedder: EmbedderAdapter,
    @Inject(CHUNKER_TOKEN) private readonly chunker: ChunkerAdapter,
    @Inject(QUEUE_ADAPTER_TOKEN) private readonly queue: QueueAdapter,
    @Inject(PRISMA_CLIENT_TOKEN) private readonly prisma: PrismaClient,
    @Inject(AI_RAG_OPTIONS_TOKEN) private readonly options: AiRagOptions,
  ) {}

  onModuleInit(): void {
    // Reaproveita connection do BullMQQueueAdapter quando possível; senão tenta
    // ler REDIS_URL do env (worker isolado em outro processo é comum).
    // V1: assume queue adapter é BullMQQueueAdapter (default). Custom adapters
    // implicam que dev gerencia o próprio worker — então pulamos aqui.
    if (!(this.queue instanceof BullMQQueueAdapter)) {
      this.logger.warn(
        'AiRagIngestWorker: custom QueueAdapter detected; default BullMQ Worker NOT started. ' +
          'Wire your own worker against your queue infrastructure.',
      );
      return;
    }

    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl) {
      this.logger.warn(
        'AiRagIngestWorker: REDIS_URL env not set; worker not started. ' +
          'Pass redisUrl to the consumer process or set env var.',
      );
      return;
    }

    this.worker = new Worker<IngestJobPayload>(
      QUEUE_NAME_INGEST,
      async (job: Job<IngestJobPayload>) => this.process(job),
      {
        connection: { url: redisUrl } as unknown as Worker['opts']['connection'],
        concurrency: this.options.ingestConcurrency,
      },
    );

    this.worker.on('failed', (job, err) => {
      this.logger.error(`Ingest job ${job?.id} failed: ${err.message}`);
    });
  }

  async onModuleDestroy(): Promise<void> {
    if (this.worker) {
      await this.worker.close();
      this.worker = null;
    }
  }

  private async process(job: Job<IngestJobPayload>): Promise<void> {
    const { documentId, tenantId, input } = job.data;
    this.logger.log(`Processing ingest job ${job.id} for doc ${documentId}`);

    try {
      await this.prisma.document.update({
        where: { id: documentId },
        data: { status: 'processing' },
      });

      const text = await this.extractText(input);
      if (!text || text.trim().length === 0) {
        throw new Error('Extracted text is empty.');
      }

      const chunks = await this.chunker.chunk(text);
      if (chunks.length === 0) {
        throw new Error('Chunker produced zero chunks.');
      }

      const contents = chunks.map((c) => c.content);
      const embeddings = await this.embedder.embed(contents);
      if (embeddings.length !== chunks.length) {
        throw new Error(
          `Embedder mismatch: ${embeddings.length} embeddings for ${chunks.length} chunks.`,
        );
      }

      // Bulk insert via raw SQL — Prisma createMany NÃO aceita `Unsupported("vector")`.
      // Cada row precisa do cast `$N::vector` explícito (D#14.7).
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        if (!chunk) continue;
        const vec = embeddings[i];
        if (!vec) continue;
        const vecStr = `[${vec.join(',')}]`;
        const id = randomUUID();
        await this.prisma.$executeRawUnsafe(
          `INSERT INTO "DocumentChunk" (id, "documentId", "tenantId", index, content, embedding, embedder, tokens, "createdAt")
           VALUES ($1, $2, $3, $4, $5, $6::vector, $7, $8, NOW())`,
          id,
          documentId,
          tenantId,
          chunk.index,
          chunk.content,
          vecStr,
          this.embedder.name,
          chunk.tokens,
        );
      }

      await this.prisma.document.update({
        where: { id: documentId },
        data: { status: 'ready', chunksCount: chunks.length },
      });

      if (job.id) {
        await this.prisma.ragIngestJob
          .update({
            where: { id: job.id },
            data: { status: 'completed' },
          })
          .catch(() => undefined);
      }

      this.logger.log(`Job ${job.id} ready: doc=${documentId} chunks=${chunks.length}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`Job ${job.id} failed: ${message}`);
      await this.prisma.document
        .update({
          where: { id: documentId },
          data: { status: 'failed' },
        })
        .catch(() => undefined);
      if (job.id) {
        await this.prisma.ragIngestJob
          .update({
            where: { id: job.id },
            data: { status: 'failed', error: message, retries: { increment: 1 } },
          })
          .catch(() => undefined);
      }
      throw err; // BullMQ retry handle
    }
  }

  private async extractText(input: IngestRequest): Promise<string> {
    if (input.kind === 'text') {
      return input.text;
    }

    if (input.kind === 'url') {
      // V1 W2-C1: assume text/plain. HTML parsing fica pra V2.
      const res = await fetch(input.url);
      if (!res.ok) {
        throw new Error(`Failed to fetch ${input.url}: ${res.status}`);
      }
      return res.text();
    }

    // kind === 'file' — V1 W2-C2: assume `filename` é path local no FS.
    // Em produção, integre com storage (S3, etc.) via service layer.
    const buf = await readFile(input.filename);
    const isPdf =
      input.mimeType?.toLowerCase().includes('pdf') ||
      input.filename.toLowerCase().endsWith('.pdf');

    if (isPdf) {
      // Lazy import — `unpdf` é peer opcional.
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const mod = (await import('unpdf' as unknown as string).catch(() => null)) as any;
        if (!mod) {
          throw new Error(
            'PDF extraction requires `unpdf`. Install: pnpm add unpdf -D (or as peer).',
          );
        }
        const fn = mod.extractText ?? mod.default?.extractText;
        if (typeof fn !== 'function') {
          throw new Error('unpdf.extractText not found.');
        }
        const result = await fn(new Uint8Array(buf), { mergePages: true });
        const txt = typeof result === 'string' ? result : (result?.text ?? '');
        return Array.isArray(txt) ? txt.join('\n') : txt;
      } catch (err) {
        throw new Error(
          `PDF extraction failed: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }

    return buf.toString('utf-8');
  }
}
