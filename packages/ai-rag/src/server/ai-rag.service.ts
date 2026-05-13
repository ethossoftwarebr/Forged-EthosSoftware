import type Anthropic from '@anthropic-ai/sdk';
import type { Message, TextBlock } from '@anthropic-ai/sdk/resources/messages';
import { getCurrentTenantId, PRISMA_CLIENT_TOKEN } from '@ethos/api-base';
import type { PrismaClient } from '@ethos/database';
import { ForbiddenException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';

import type { ChunkerAdapter, EmbedderAdapter, QueueAdapter } from '../shared/adapters';
import {
  DEFAULT_ANSWER_MODEL,
  DEFAULT_TOP_K,
  MAX_TOP_K,
  QUEUE_NAME_INGEST,
} from '../shared/constants';
import {
  type IngestRequest,
  type IngestResponse,
  type QueryRequest,
  type QueryResponse,
  type Source,
} from '../shared/types';

import { ANTHROPIC_CLIENT_TOKEN } from './anthropic.client';

export const AI_RAG_OPTIONS_TOKEN = Symbol('AI_RAG_OPTIONS');
export const EMBEDDER_TOKEN = Symbol('AI_RAG_EMBEDDER');
export const CHUNKER_TOKEN = Symbol('AI_RAG_CHUNKER');
export const QUEUE_ADAPTER_TOKEN = Symbol('AI_RAG_QUEUE_ADAPTER');

export interface AiRagOptions {
  answerModel: string;
  ingestConcurrency: number;
  /** Persistido em Document.embedderUsed pra auditoria/migration. */
  embedderName: string;
}

/** max_tokens da resposta final do Claude — RAG é resposta curta tipicamente. */
const DEFAULT_ANSWER_MAX_TOKENS = 1024;

/**
 * AiRagService — orquestra ingest + retrieval + answer.
 *
 * Multi-tenant via `getCurrentTenantId()` (api-base AsyncLocalStorage).
 * Guards (CLAUDE.md):
 *  - tenantId NUNCA do body/query (D#14.9) → sempre via TenantContext
 *  - Ownership rigoroso: findFirst/delete sempre com `tenantId` na where
 *  - Retrieval com `<#>` (inner product, vector_ip_ops) — D#14.7
 *  - tenantId filtra ANTES do similarity search (denorma em DocumentChunk)
 *  - Embedding sempre cast como `$N::vector` em raw SQL
 *  - V1: ZERO SSE em query (D#14.10) — sync JSON only
 */
@Injectable()
export class AiRagService {
  private readonly logger = new Logger(AiRagService.name);

  constructor(
    @Inject(ANTHROPIC_CLIENT_TOKEN) private readonly anthropic: Anthropic,
    @Inject(PRISMA_CLIENT_TOKEN) private readonly prisma: PrismaClient,
    @Inject(EMBEDDER_TOKEN) private readonly embedder: EmbedderAdapter,
    @Inject(CHUNKER_TOKEN) private readonly _chunker: ChunkerAdapter,
    @Inject(QUEUE_ADAPTER_TOKEN) private readonly queue: QueueAdapter,
    @Inject(AI_RAG_OPTIONS_TOKEN) private readonly options: AiRagOptions,
  ) {
    // Marca chunker como "usado" — worker injeta o mesmo via DI. Service não
    // chunkifica direto (acontece no ingest worker).
    void this._chunker;
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  /**
   * Cria Document(status=pending) e enfileira job de ingest. Retorna jobId +
   * documentId imediatamente (assíncrono).
   */
  async ingest(input: IngestRequest, userId: string): Promise<IngestResponse> {
    const tenantId = this.requireTenantId();

    const title = this.deriveTitle(input);
    const sourceUrl = input.kind === 'url' ? input.url : null;
    const sourceType = input.kind;
    const metadata = this.deriveMetadata(input);

    const doc = await this.prisma.document.create({
      data: {
        tenantId,
        userId,
        sourceType,
        sourceUrl,
        title,
        status: 'pending',
        embedderUsed: this.options.embedderName,
        metadata: metadata as unknown as object,
      },
      select: { id: true },
    });

    const jobId = await this.queue.enqueue(QUEUE_NAME_INGEST, {
      documentId: doc.id,
      tenantId,
      input,
    });

    await this.prisma.ragIngestJob.create({
      data: {
        id: jobId,
        documentId: doc.id,
        tenantId,
        status: 'waiting',
      },
    });

    return { jobId, documentId: doc.id };
  }

  /**
   * RAG query síncrono. Embeds question, faz similarity search filtrando por
   * tenantId, monta context, chama Claude. Retorna `{ answer, sources }`.
   *
   * V1 (D#14.10): NUNCA SSE. Streaming fica pra spec #14.5.
   */
  async query(q: QueryRequest, _userId: string): Promise<QueryResponse> {
    const tenantId = this.requireTenantId();
    void _userId;

    const topK = Math.min(q.topK ?? DEFAULT_TOP_K, MAX_TOP_K);

    // 1. Embed da pergunta (input_type='query' quando suportado)
    // Voyage aceita 2º arg; outros embedders ignoram.
    const embedFn = this.embedder.embed as (
      input: string | string[],
      inputType?: 'document' | 'query',
    ) => Promise<number[][]>;
    const vecs = await embedFn.call(this.embedder, [q.question], 'query');
    const questionVec = vecs[0];
    if (!questionVec || questionVec.length === 0) {
      throw new Error('Embedder returned empty vector for question.');
    }

    // 2. Similarity search com <#> (inner product). tenantId filtra ANTES.
    // `<#>` retorna negative inner product → menor = mais similar.
    const vecStr = `[${questionVec.join(',')}]`;
    const sql = `
      SELECT id, "documentId", content, embedding <#> $1::vector AS score
      FROM "DocumentChunk"
      WHERE "tenantId" = $2
      ORDER BY embedding <#> $1::vector
      LIMIT $3
    `;
    const rows = await this.prisma.$queryRawUnsafe<
      Array<{ id: string; documentId: string; content: string; score: number }>
    >(sql, vecStr, tenantId, topK);

    // 3. Build sources (D#14.8 — sempre presente, mesmo vazio)
    const sources: Source[] = rows.map((row) => ({
      documentId: row.documentId,
      chunkId: row.id,
      // Inverte sinal pra apresentar valor positivo "maior = mais similar" pra UI.
      score: -Number(row.score),
      snippet: row.content.slice(0, 200),
    }));

    // 4. Caso retrieval vazio, ainda chamamos Claude com contexto vazio (ele
    // responderá "não há contexto"). Mantém UX consistente.
    const contextStr = this.buildContextString(rows);
    const systemPrompt = this.buildRagSystemPrompt();
    const userContent =
      contextStr.length > 0
        ? `${q.question}\n\nCONTEXT:\n${contextStr}`
        : `${q.question}\n\n(No relevant context found.)`;

    const model = this.options.answerModel ?? DEFAULT_ANSWER_MODEL;
    const response = (await this.anthropic.messages.create({
      model,
      max_tokens: DEFAULT_ANSWER_MAX_TOKENS,
      system: systemPrompt,
      messages: [{ role: 'user', content: userContent }],
    })) as Message;

    const answer = this.extractText(response);
    return { answer, sources };
  }

  async getDocument(
    id: string,
    _userId: string,
  ): Promise<{
    id: string;
    tenantId: string;
    userId: string;
    title: string;
    status: string;
    sourceType: string;
    sourceUrl: string | null;
    embedderUsed: string;
    chunksCount: number;
    createdAt: Date;
    updatedAt: Date;
  }> {
    const tenantId = this.requireTenantId();
    void _userId;
    const doc = await this.prisma.document.findFirst({
      where: { id, tenantId },
    });
    if (!doc) {
      throw new NotFoundException({
        code: 'DOCUMENT_NOT_FOUND',
        message: 'Document not found.',
      });
    }
    return doc as unknown as Awaited<ReturnType<AiRagService['getDocument']>>;
  }

  async listDocuments(
    _userId: string,
    filters?: { status?: string; sourceType?: string },
  ): Promise<
    Array<{
      id: string;
      tenantId: string;
      userId: string;
      title: string;
      status: string;
      sourceType: string;
      chunksCount: number;
      createdAt: Date;
    }>
  > {
    const tenantId = this.requireTenantId();
    void _userId;
    const where: Record<string, unknown> = { tenantId };
    if (filters?.status) where.status = filters.status;
    if (filters?.sourceType) where.sourceType = filters.sourceType;

    const docs = await this.prisma.document.findMany({
      where: where as Parameters<PrismaClient['document']['findMany']>[0] extends infer T
        ? T extends { where?: infer W }
          ? W
          : never
        : never,
      orderBy: { createdAt: 'desc' },
    });
    return docs as unknown as Awaited<ReturnType<AiRagService['listDocuments']>>;
  }

  async deleteDocument(id: string, _userId: string): Promise<void> {
    const tenantId = this.requireTenantId();
    void _userId;
    const existing = await this.prisma.document.findFirst({
      where: { id, tenantId },
      select: { id: true },
    });
    if (!existing) {
      throw new NotFoundException({
        code: 'DOCUMENT_NOT_FOUND',
        message: 'Document not found.',
      });
    }
    // CASCADE deleta chunks + ingestJobs via FK on schema.
    await this.prisma.document.delete({ where: { id: existing.id } });
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private requireTenantId(): string {
    const tenantId = getCurrentTenantId();
    if (!tenantId) {
      throw new ForbiddenException({
        code: 'TENANT_REQUIRED',
        message: 'No tenant context available.',
      });
    }
    return tenantId;
  }

  private deriveTitle(input: IngestRequest): string {
    if (input.kind === 'file') return input.filename;
    if (input.kind === 'url') {
      try {
        const u = new URL(input.url);
        const tail = u.pathname.replace(/\/$/, '').split('/').pop();
        return `${u.host}${tail ? `/${tail}` : ''}`;
      } catch {
        return input.url.slice(0, 80);
      }
    }
    return input.text.slice(0, 80);
  }

  private deriveMetadata(input: IngestRequest): Record<string, unknown> {
    if (input.kind === 'file') {
      return { kind: 'file', filename: input.filename, mimeType: input.mimeType, size: input.size };
    }
    if (input.kind === 'url') return { kind: 'url', url: input.url };
    return { kind: 'text', length: input.text.length };
  }

  private buildContextString(
    rows: Array<{ id: string; documentId: string; content: string; score: number }>,
  ): string {
    return rows
      .map((row, i) => `[#${i + 1} chunk=${row.id} doc=${row.documentId}]\n${row.content}`)
      .join('\n\n---\n\n');
  }

  private buildRagSystemPrompt(): string {
    return (
      'You are a helpful assistant. Answer the user question based ONLY on the ' +
      'provided CONTEXT. If the CONTEXT does not contain the answer, say so ' +
      'explicitly. Cite chunks by their index (e.g. "[#1]") when relevant.'
    );
  }

  private extractText(message: Message): string {
    return message.content
      .filter((c): c is TextBlock => c.type === 'text')
      .map((c) => c.text)
      .join('');
  }
}
