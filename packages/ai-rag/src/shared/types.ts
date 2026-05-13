import { z } from 'zod';

/**
 * @ethos/ai-rag — shared types
 *
 * Tipos compartilhados entre server (NestJS) e client (React).
 * Sem dependências de runtime do Anthropic SDK, NestJS, BullMQ, Prisma ou React —
 * só zod (peer-safe). Enums duplicam valores do schema Prisma (W1.A) para manter
 * a camada shared livre de `@prisma/client` (que é peer opcional).
 */

// ---------------------------------------------------------------------------
// Enums (mirror dos enums Prisma planejados em W1.A — valores apenas)
// ---------------------------------------------------------------------------

export const DocumentSourceType = {
  FILE: 'file',
  TEXT: 'text',
  URL: 'url',
} as const;
export type DocumentSourceType = (typeof DocumentSourceType)[keyof typeof DocumentSourceType];

export const DocumentStatus = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  READY: 'ready',
  FAILED: 'failed',
} as const;
export type DocumentStatus = (typeof DocumentStatus)[keyof typeof DocumentStatus];

export const JobStatus = {
  WAITING: 'waiting',
  ACTIVE: 'active',
  COMPLETED: 'completed',
  FAILED: 'failed',
} as const;
export type JobStatus = (typeof JobStatus)[keyof typeof JobStatus];

// ---------------------------------------------------------------------------
// Ingest — discriminated union por `kind`
// ---------------------------------------------------------------------------

export const IngestFileSchema = z.object({
  kind: z.literal('file'),
  filename: z.string().min(1),
  mimeType: z.string().min(1),
  size: z.number().int().nonnegative(),
});
export type IngestFileRequest = z.infer<typeof IngestFileSchema>;

export const IngestTextSchema = z.object({
  kind: z.literal('text'),
  text: z.string().min(1),
});
export type IngestTextRequest = z.infer<typeof IngestTextSchema>;

export const IngestUrlSchema = z.object({
  kind: z.literal('url'),
  url: z.string().url(),
});
export type IngestUrlRequest = z.infer<typeof IngestUrlSchema>;

export const IngestRequestSchema = z.discriminatedUnion('kind', [
  IngestFileSchema,
  IngestTextSchema,
  IngestUrlSchema,
]);
export type IngestRequest = z.infer<typeof IngestRequestSchema>;

export const IngestResponseSchema = z.object({
  jobId: z.string(),
  documentId: z.string(),
});
export type IngestResponse = z.infer<typeof IngestResponseSchema>;

// ---------------------------------------------------------------------------
// Query — RAG retrieval
// ---------------------------------------------------------------------------

export const QueryRequestSchema = z.object({
  question: z.string().min(1),
  topK: z.number().int().min(1).max(20).default(5).optional(),
  filters: z.record(z.string(), z.unknown()).optional(),
});
export type QueryRequest = z.infer<typeof QueryRequestSchema>;

export const SourceSchema = z.object({
  documentId: z.string(),
  chunkId: z.string(),
  score: z.number(),
  snippet: z.string(),
});
export type Source = z.infer<typeof SourceSchema>;

export const QueryResponseSchema = z.object({
  answer: z.string(),
  sources: z.array(SourceSchema),
});
export type QueryResponse = z.infer<typeof QueryResponseSchema>;

// ---------------------------------------------------------------------------
// Chunk — unidade de texto pós-chunker, pré-embedding
// ---------------------------------------------------------------------------

export interface Chunk {
  content: string;
  index: number;
  tokens: number;
  metadata?: Record<string, unknown>;
}
