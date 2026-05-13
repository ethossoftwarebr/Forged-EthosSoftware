# @ethos/ai-rag

RAG plugavel com pgvector + Anthropic Claude + Voyage AI. Ingestao assincrona via BullMQ, retrieval sync com citacoes, multi-tenant rigoroso.

> Pacote plugavel do **Ethos Forge** (proprietario). Cliente final recebe o codigo do projeto, **nao recebe a Forge**.

## Stack

- **Backend**: NestJS 10 + Prisma 5 + Postgres 16
- **Vector DB**: pgvector (extension Postgres) — `vector(1024)` + HNSW + `vector_ip_ops`
- **Embeddings**: Voyage `voyage-3-large` (default, 1024 dims) ou OpenAI `text-embedding-3-*` (opt-in)
- **Generation**: Claude Haiku 4.5 (default) ou Sonnet 4.5 (opt-in)
- **Queue**: BullMQ + Redis 7 (worker concurrency 2, retry 3 exp 2s)
- **Client**: React 18 + TanStack Query 5 (V1 sync only — streaming SSE em spec #14.5)

## Instalacao

Em monorepo Forge:

```bash
pnpm --filter @ethos-app/api add @ethos/ai-rag
pnpm --filter @ethos-app/web add @ethos/ai-rag
```

### Pre-requisitos

1. Postgres com pgvector — use `pgvector/pgvector:pg16` (nao funciona com `postgres:16-alpine`)
2. Redis up (BullMQ)
3. Migration `ai_rag_init` aplicada (cria 3 tabelas + HNSW index + `CREATE EXTENSION vector`)

```bash
docker compose up -d postgres redis
pnpm --filter @ethos/database run db:generate
pnpm --filter @ethos/database run db:migrate
```

## Env vars

```env
ANTHROPIC_API_KEY=sk-ant-...        # obrigatorio (geracao)
VOYAGE_API_KEY=pa-...               # embedder default (D#14.1 — voyage-3-large @ 1024 dims)
OPENAI_API_KEY=sk-...               # opt-in (mitigacao Voyage acquisition — D#14.17)
REDIS_URL=redis://localhost:6379    # BullMQ (ja existe no starter)
RAG_INGEST_CONCURRENCY=2            # opcional (default 2)
```

## Quickstart (backend)

`apps/api/src/app.module.ts`:

```ts
import { AiRagModule } from '@ethos/ai-rag/server';

@Module({
  imports: [
    AiRagModule.forRoot({
      anthropicApiKey: process.env.ANTHROPIC_API_KEY!,
      voyageApiKey: process.env.VOYAGE_API_KEY!,
      redisUrl: process.env.REDIS_URL!,
      answerModel: 'claude-haiku-4-5', // ou 'claude-sonnet-4-5'
    }),
  ],
})
export class AppModule {}
```

Endpoints expostos (todos sob `JwtAuthGuard` + `MultiTenantInterceptor`):

- `POST /ai-rag/ingest` — `{ kind: 'file'|'text'|'url', ... }` → `{ jobId, documentId }`
- `POST /ai-rag/query` — `{ question, topK? }` → `{ answer, sources: [...] }`
- `GET /ai-rag/documents` + `?status=ready&sourceType=text`
- `GET /ai-rag/documents/:id` — status do doc
- `DELETE /ai-rag/documents/:id` — CASCADE chunks + jobs

## Quickstart (frontend)

```tsx
import { RagSearchInput } from '@ethos/ai-rag/client';
// ou hooks crus:
import { useAiRagQuery, useAiRagIngest, useAiRagDocuments } from '@ethos/ai-rag/client';

export function SearchPage() {
  return <RagSearchInput apiBaseUrl={process.env.NEXT_PUBLIC_API_URL} />;
}
```

V1 NAO tem streaming — `useAiRagQuery` e uma `useMutation` que retorna `QueryResponse` completo. SSE chega em spec #14.5.

## Custom embedder

```ts
import { AiRagModule, createOpenAIEmbedder } from '@ethos/ai-rag/server';

AiRagModule.forRoot({
  anthropicApiKey: '...',
  redisUrl: '...',
  embedder: createOpenAIEmbedder({
    apiKey: process.env.OPENAI_API_KEY!,
    dimensions: 1024, // IMPORTANTE: schema usa vector(1024); 1536 (default OpenAI) exige migration ALTER COLUMN
  }),
});
```

Para implementar adapter custom (Cohere, etc.):

```ts
import type { EmbedderAdapter } from '@ethos/ai-rag/shared';

const myEmbedder: EmbedderAdapter = {
  name: 'cohere-embed-v3',
  dimensions: 1024,
  embed: async (input) => {
    /* HTTP call */ return [
      [
        /* vector */
      ],
    ];
  },
};
```

## Custom chunker

```ts
import type { ChunkerAdapter } from '@ethos/ai-rag/shared';

const semanticChunker: ChunkerAdapter = {
  name: 'semantic',
  chunk: async (text, opts) => { /* ... */ return chunks; },
};

AiRagModule.forRoot({ /* ... */, chunker: semanticChunker });
```

Default: `FixedSizeChunker` (size=500 tokens, overlap=100). `SemanticChunker` postergado pos-V1 (nao bloqueia ACs).

## Multi-tenant rules (nao-negociavel)

Toda query de retrieval filtra `tenantId` ANTES da similarity search via raw SQL:

```sql
SELECT id, "documentId", content, embedding <#> $1::vector AS score
FROM "DocumentChunk"
WHERE "tenantId" = $2
ORDER BY embedding <#> $1::vector
LIMIT $3
```

- `tenantId` SEMPRE vem do JWT (via `getCurrentTenantId()` do `@ethos/api-base`), nunca do body/query.
- Ownership rigoroso em `getDocument`/`deleteDocument`: `findFirst({ where: { id, tenantId } })`.
- Operador `<#>` (inner product, nao cosine `<=>`) — Voyage embeddings ja normalizados; evita seq scan em HNSW (pgvector issues #485/#663).

## Limitacoes V1

| Item                                        | Status V1                                          | Quando                                                   |
| ------------------------------------------- | -------------------------------------------------- | -------------------------------------------------------- |
| Streaming SSE (`POST /ai-rag/query/stream`) | sync only                                          | spec #14.5                                               |
| Reranker (`RerankerAdapter`)                | interface schema-ready, sem impl                   | spec #14.5 (Voyage rerank-2)                             |
| HTML parsing (kind=url)                     | text/plain only (concern W2-C1)                    | V2                                                       |
| Multipart real (kind=file)                  | espera filename como path FS local (concern W2-C2) | V2 (plugar `@nestjs/platform-express` + storage adapter) |
| Multi-embedder simultaneo                   | 1 embedder por instance                            | migration `ALTER COLUMN TYPE vector(N)` + reindex        |
| `SemanticChunker`                           | so `FixedSizeChunker`                              | pos-V1 (nao bloqueia ACs)                                |

## Migrations: gotcha pgvector

Devido ao Prisma issue #28414 (`migrate dev` dropa HNSW custom index), **workflow correto** pra mudar schema RAG:

```bash
# 1. Scaffold sem aplicar
pnpm --filter @ethos/database exec prisma migrate dev --create-only --name <nome>

# 2. Editar migration.sql gerada:
#    - Adicionar CREATE EXTENSION IF NOT EXISTS vector se faltar
#    - Re-adicionar comentario `-- prisma:no-drop` em indices HNSW

# 3. Aplicar via deploy
pnpm --filter @ethos/database exec prisma migrate deploy
```

NAO usar `prisma migrate dev` direto — abre prompt interativo que detecta drift do HNSW.

## Performance

- HNSW + `vector_ip_ops` + filtro `tenantId` ANTES: p95 ~50ms em 10k chunks/tenant
- Worker concurrency=2 (CPU-bound em PDF parsing) — configuravel via `RAG_INGEST_CONCURRENCY`
- BullMQ retry: 3 attempts, exponential backoff 2s

## Estrutura

```
packages/ai-rag/
├── README.md                       <- este arquivo
├── package.json                    <- exports triplo (server/client/shared)
├── tsup.config.ts                  <- bundle CJS+ESM por entry
├── jest.config.cjs                 <- config Jest minimal (ts-jest, node env)
└── src/
    ├── server/                     <- NestJS module/service/controller + worker BullMQ
    ├── client/                     <- React components + hooks (useAiRagQuery, useAiRagIngest)
    └── shared/                     <- tipos (EmbedderAdapter, ChunkerAdapter, RerankerAdapter, DTOs)
```

## Roadmap

- **#14.5**: SSE streaming + Voyage rerank-2 (`RerankerAdapter` impl)
- **#15**: `@ethos/queue` package extrai BullMQ inline (refactor sem breaking — `QueueAdapter` interface ja definida em shared)
- **#15+**: OCR via Claude vision (`@ethos/ocr`) — complementa RAG para docs scanned

Ver `docs/08-PACOTES-PLUGAVEIS.md` para roadmap completo do pacote.
