/**
 * @ethos/ai-rag/server — barrel
 *
 * Exporta o módulo, service, controller, adapters e tokens DI. Não exporta
 * o worker (lifecycle é interno; consumidor não instancia direto).
 */

export { AiRagModule, type AiRagModuleOptions } from './ai-rag.module';
export {
  AiRagService,
  AI_RAG_OPTIONS_TOKEN,
  EMBEDDER_TOKEN,
  CHUNKER_TOKEN,
  QUEUE_ADAPTER_TOKEN,
  type AiRagOptions,
} from './ai-rag.service';
export { AiRagController } from './ai-rag.controller';

export { VoyageEmbedder } from './adapters/voyage-embedder';
export { OpenAIEmbedder, createOpenAIEmbedder } from './adapters/openai-embedder';
export { FixedSizeChunker } from './adapters/fixed-chunker';
export { BullMQQueueAdapter } from './adapters/bullmq-queue';

export { ANTHROPIC_CLIENT_TOKEN, createAnthropicClient } from './anthropic.client';

// DTOs (re-export Zod schemas — Swagger não é peer V1)
export * from './dtos/ingest.dto';
export * from './dtos/query.dto';
