import { type DynamicModule, Global, Module } from '@nestjs/common';

import type { ChunkerAdapter, EmbedderAdapter, QueueAdapter } from '../shared/adapters';
import { DEFAULT_ANSWER_MODEL, DEFAULT_INGEST_CONCURRENCY } from '../shared/constants';

import { BullMQQueueAdapter } from './adapters/bullmq-queue';
import { FixedSizeChunker } from './adapters/fixed-chunker';
import { VoyageEmbedder } from './adapters/voyage-embedder';
import { AiRagController } from './ai-rag.controller';
import {
  AI_RAG_OPTIONS_TOKEN,
  type AiRagOptions,
  AiRagService,
  CHUNKER_TOKEN,
  EMBEDDER_TOKEN,
  QUEUE_ADAPTER_TOKEN,
} from './ai-rag.service';
import { ANTHROPIC_CLIENT_TOKEN, createAnthropicClient } from './anthropic.client';
import { AiRagIngestWorker } from './workers/ingest.worker';

export interface AiRagModuleOptions {
  /** API key Voyage AI — obrigatório se `embedder` não for fornecido (default VoyageEmbedder). */
  voyageApiKey?: string;
  /** API key Anthropic — obrigatório (answer generation). */
  anthropicApiKey: string;
  /** Redis URL — obrigatório (queue + worker). */
  redisUrl: string;
  /** API key OpenAI — opcional, só se embedder for `OpenAIEmbedder`. */
  openaiApiKey?: string;
  /** Override do embedder default (Voyage). Use `createOpenAIEmbedder` ou custom. */
  embedder?: EmbedderAdapter;
  /** Override do chunker default (FixedSizeChunker). */
  chunker?: ChunkerAdapter;
  /** Override do queue adapter default (BullMQ). */
  queueAdapter?: QueueAdapter;
  /** Modelo Claude para answer generation. Default: `claude-haiku-4-5` (D#14.15). */
  answerModel?: string;
  /** BullMQ Worker concurrency. Default: 2 (D#14.16). */
  ingestConcurrency?: number;
}

/**
 * AiRagModule — registro raiz do package.
 *
 * Uso típico:
 * ```ts
 * AiRagModule.forRoot({
 *   voyageApiKey: env.VOYAGE_API_KEY,
 *   anthropicApiKey: env.ANTHROPIC_API_KEY,
 *   redisUrl: env.REDIS_URL,
 * })
 * ```
 *
 * Embedder alternativo (D#14.17):
 * ```ts
 * AiRagModule.forRoot({
 *   anthropicApiKey: env.ANTHROPIC_API_KEY,
 *   redisUrl: env.REDIS_URL,
 *   embedder: createOpenAIEmbedder({ apiKey: env.OPENAI_API_KEY, dimensions: 1024 }),
 * })
 * ```
 *
 * `@Global` — `AiRagService` fica disponível em qualquer módulo sem reimport.
 */
@Module({})
export class AiRagModule {
  static forRoot(options: AiRagModuleOptions): DynamicModule {
    const resolvedAnswerModel = options.answerModel ?? DEFAULT_ANSWER_MODEL;
    const resolvedConcurrency = options.ingestConcurrency ?? DEFAULT_INGEST_CONCURRENCY;

    return {
      module: AiRagModule,
      global: true,
      controllers: [AiRagController],
      providers: [
        {
          provide: ANTHROPIC_CLIENT_TOKEN,
          useFactory: () => {
            if (!options.anthropicApiKey) {
              throw new Error('AiRagModule.forRoot: anthropicApiKey is required.');
            }
            return createAnthropicClient({ apiKey: options.anthropicApiKey });
          },
        },
        {
          provide: EMBEDDER_TOKEN,
          useFactory: (): EmbedderAdapter => {
            if (options.embedder) return options.embedder;
            // Default = Voyage. Exige voyageApiKey.
            if (!options.voyageApiKey) {
              throw new Error(
                'AiRagModule.forRoot: voyageApiKey is required when no custom embedder is provided. ' +
                  'Either pass `voyageApiKey` or `embedder: createOpenAIEmbedder({...})`.',
              );
            }
            return new VoyageEmbedder(options.voyageApiKey);
          },
        },
        {
          provide: CHUNKER_TOKEN,
          useFactory: (): ChunkerAdapter => options.chunker ?? new FixedSizeChunker(),
        },
        {
          provide: QUEUE_ADAPTER_TOKEN,
          useFactory: (): QueueAdapter => {
            if (options.queueAdapter) return options.queueAdapter;
            if (!options.redisUrl) {
              throw new Error(
                'AiRagModule.forRoot: redisUrl is required for default BullMQ adapter.',
              );
            }
            return new BullMQQueueAdapter(options.redisUrl);
          },
        },
        {
          provide: AI_RAG_OPTIONS_TOKEN,
          useFactory: (embedder: EmbedderAdapter): AiRagOptions => ({
            answerModel: resolvedAnswerModel,
            ingestConcurrency: resolvedConcurrency,
            embedderName: embedder.name,
          }),
          inject: [EMBEDDER_TOKEN],
        },
        AiRagService,
        AiRagIngestWorker,
      ],
      exports: [
        AiRagService,
        EMBEDDER_TOKEN,
        CHUNKER_TOKEN,
        QUEUE_ADAPTER_TOKEN,
        AI_RAG_OPTIONS_TOKEN,
      ],
    };
  }
}

// Marker pra evitar tree-shake do decorator @Global quando alguém só importa
// o tipo do módulo (TS-only imports). Não usa runtime.
const _markerGlobal: typeof Global = Global;
void _markerGlobal;
