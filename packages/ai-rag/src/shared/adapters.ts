import type { Chunk, JobStatus } from './types';

/**
 * @ethos/ai-rag — adapter contracts
 *
 * Interfaces puras (sem implementação). Implementações concretas vivem em
 * `src/server/adapters/*` (W2). Manter este arquivo livre de imports runtime
 * para preservar o tree-shaking e o isolamento entre camadas.
 */

// ---------------------------------------------------------------------------
// Embedder — gera vetores para texto(s)
// ---------------------------------------------------------------------------

export interface EmbedderAdapter {
  readonly name: string;
  readonly dimensions: number;
  embed(input: string | string[]): Promise<number[][]>;
}

// ---------------------------------------------------------------------------
// Chunker — split de texto em chunks com overlap
// ---------------------------------------------------------------------------

export interface ChunkerOptions {
  size?: number;
  overlap?: number;
}

export interface ChunkerAdapter {
  readonly name: string;
  chunk(text: string, options?: ChunkerOptions): Promise<Chunk[]>;
}

// ---------------------------------------------------------------------------
// Queue — adapter pluggável (D#14.4: shape compatível com #15 @ethos/queue)
// ---------------------------------------------------------------------------

export interface QueueJob<TPayload = unknown> {
  id: string;
  status: JobStatus;
  payload: TPayload;
  error?: string;
  retries: number;
}

export interface QueueAdapter {
  readonly name: string;
  enqueue<TPayload>(queueName: string, payload: TPayload): Promise<string>;
  getStatus(jobId: string): Promise<QueueJob | null>;
}

// ---------------------------------------------------------------------------
// Reranker — schema-ready (D#14.11: SEM implementação V1)
// ---------------------------------------------------------------------------

export interface RerankCandidate {
  id: string;
  content: string;
  score: number;
}

export interface RerankerAdapter {
  readonly name: string;
  rerank(query: string, candidates: RerankCandidate[], topK?: number): Promise<RerankCandidate[]>;
}
