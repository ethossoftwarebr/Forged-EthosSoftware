import type { EmbedderAdapter } from '../../shared/adapters';
import {
  OPENAI_EMBEDDING_DIMENSIONS,
  OPENAI_EMBEDDING_MODEL,
  VOYAGE_DIMENSIONS,
} from '../../shared/constants';

/**
 * OpenAIEmbedder — alternativa V1 obrigatória (D#14.17, mitigação Voyage/MongoDB).
 *
 * **WARNING:** dimension default = 1536 (text-embedding-3-small), enquanto
 * schema HNSW usa `vector(1024)`. Para integrar sem migration, passe
 * `dimensions=1024` (OpenAI suporta `dimensions` param em text-embedding-3-*).
 * Caso contrário, rode `ALTER COLUMN embedding TYPE vector(N)` + reindex.
 *
 * API shape compatível com Voyage (response `{ data: [{ embedding, index }] }`).
 */
export class OpenAIEmbedder implements EmbedderAdapter {
  readonly name: string;
  readonly dimensions: number;

  constructor(
    private readonly apiKey: string,
    model: string = OPENAI_EMBEDDING_MODEL,
    dimensions: number = OPENAI_EMBEDDING_DIMENSIONS,
  ) {
    if (!apiKey) {
      throw new Error('OpenAIEmbedder: apiKey is required');
    }
    this.name = model;
    this.dimensions = dimensions;

    if (dimensions !== VOYAGE_DIMENSIONS) {
      // Log warning — schema HNSW espera vector(1024).
      console.warn(
        `[OpenAIEmbedder] dimensions=${dimensions} ≠ schema vector(${VOYAGE_DIMENSIONS}). ` +
          `Set dimensions=${VOYAGE_DIMENSIONS} or run migration to ALTER COLUMN ` +
          `TYPE vector(${dimensions}) + reindex HNSW.`,
      );
    }
  }

  async embed(input: string | string[]): Promise<number[][]> {
    const texts = Array.isArray(input) ? input : [input];
    if (texts.length === 0) return [];

    const body: Record<string, unknown> = {
      input: texts,
      model: this.name,
    };
    // OpenAI text-embedding-3-* aceita `dimensions` (truncation). Anteriores não.
    if (this.name.startsWith('text-embedding-3')) {
      body.dimensions = this.dimensions;
    }

    const res = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errBody = await res.text().catch(() => '<no body>');
      throw new Error(`OpenAI API ${res.status}: ${errBody}`);
    }

    const json = (await res.json()) as {
      data: Array<{ embedding: number[]; index: number }>;
      model: string;
      usage?: unknown;
    };

    const sorted = [...json.data].sort((a, b) => a.index - b.index);
    return sorted.map((d) => d.embedding);
  }
}

/**
 * Factory exportada (D#14.17 — V1 obrigatório). Devs ativam via:
 * ```ts
 * AiRagModule.forRoot({ embedder: createOpenAIEmbedder({ apiKey, dimensions: 1024 }) })
 * ```
 */
export function createOpenAIEmbedder(opts: {
  apiKey: string;
  model?: string;
  dimensions?: number;
}): EmbedderAdapter {
  return new OpenAIEmbedder(opts.apiKey, opts.model, opts.dimensions);
}
