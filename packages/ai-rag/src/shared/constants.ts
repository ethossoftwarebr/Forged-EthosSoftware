/**
 * @ethos/ai-rag — defaults & constants
 *
 * Valores referenciados pelos adapters concretos (W2) e pelos serviços.
 * Mantidos no shared para permitir override consciente sem duplicação.
 */

// Chunking
export const DEFAULT_CHUNK_SIZE = 500;
export const DEFAULT_CHUNK_OVERLAP = 100;

// Retrieval
export const DEFAULT_TOP_K = 5;
export const MAX_TOP_K = 20;

// Voyage AI — embedder default (D#14.1: 1024 dims alinha com schema HNSW)
export const VOYAGE_MODEL = 'voyage-3-large';
export const VOYAGE_DIMENSIONS = 1024;
export const VOYAGE_API_URL = 'https://api.voyageai.com/v1/embeddings';

// OpenAI — embedder alternativo (NOTA: 1536 dims ≠ schema 1024 — requer migration)
export const OPENAI_EMBEDDING_MODEL = 'text-embedding-3-small';
export const OPENAI_EMBEDDING_DIMENSIONS = 1536;

// Claude answer model (D#14.12: Haiku 4.5 default p/ custo)
export const DEFAULT_ANSWER_MODEL = 'claude-haiku-4-5';

// Ingest worker
export const DEFAULT_INGEST_CONCURRENCY = 2;
export const DEFAULT_INGEST_RETRY_ATTEMPTS = 3;
export const DEFAULT_INGEST_RETRY_BACKOFF_MS = 2000;

// Queue name (BullMQ namespace)
export const QUEUE_NAME_INGEST = 'ai-rag:ingest';
