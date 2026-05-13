import type { ChunkerAdapter, EmbedderAdapter, QueueAdapter } from '../../src/shared/adapters';
import { VOYAGE_DIMENSIONS } from '../../src/shared/constants';
import type { Chunk, JobStatus } from '../../src/shared/types';

/**
 * Mock helpers compartilhados entre os specs do @ethos/ai-rag.
 *
 * **Regra inviolável (CLAUDE.md):** ZERO chamadas reais a APIs externas
 * (Voyage, OpenAI, Anthropic). Os mocks aqui devolvem dados determinísticos.
 */

export interface MockEmbedderOptions {
  /** Vetor fixo retornado para cada texto. Default: 1024 dims com 0.1 em todas posições. */
  vector?: number[];
  /** Override do nome (auditoria/DocumentChunk.embedder). Default: 'mock-embedder'. */
  name?: string;
  /** Override das dimensões. Default: VOYAGE_DIMENSIONS (1024). */
  dimensions?: number;
}

export function mockEmbedder(opts: MockEmbedderOptions = {}): EmbedderAdapter {
  const dimensions = opts.dimensions ?? VOYAGE_DIMENSIONS;
  const vector = opts.vector ?? new Array(dimensions).fill(0.1);
  if (vector.length !== dimensions) {
    throw new Error(`mockEmbedder: vector.length=${vector.length} !== dimensions=${dimensions}.`);
  }
  return {
    name: opts.name ?? 'mock-embedder',
    dimensions,
    embed: async (input: string | string[]) => {
      const texts = Array.isArray(input) ? input : [input];
      return texts.map(() => [...vector]);
    },
  };
}

export function mockChunker(chunks: Chunk[]): ChunkerAdapter {
  return {
    name: 'mock-chunker',
    chunk: async () => chunks.map((c, i) => ({ ...c, index: c.index ?? i })),
  };
}

export interface MockQueueOptions {
  /** Se true, `enqueue` lanca; util pra testar paths de erro. */
  failEnqueue?: boolean;
}

export function mockQueue(opts: MockQueueOptions = {}): QueueAdapter {
  const jobs = new Map<
    string,
    { id: string; status: JobStatus; payload: unknown; retries: number }
  >();
  let n = 0;
  return {
    name: 'mock-queue',
    enqueue: async (_queueName: string, payload: unknown) => {
      if (opts.failEnqueue) throw new Error('mock queue: enqueue failed');
      const id = `job_${++n}`;
      jobs.set(id, { id, status: 'waiting', payload, retries: 0 });
      return id;
    },
    getStatus: async (jobId: string) => jobs.get(jobId) ?? null,
  };
}
