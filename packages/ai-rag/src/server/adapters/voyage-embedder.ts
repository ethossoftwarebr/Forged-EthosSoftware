import type { EmbedderAdapter } from '../../shared/adapters';
import { VOYAGE_API_URL, VOYAGE_DIMENSIONS, VOYAGE_MODEL } from '../../shared/constants';

/**
 * VoyageEmbedder — implementação default (D#14.1).
 *
 * Usa `fetch` global (Node 18+) direto contra `VOYAGE_API_URL` — SEM SDK Node
 * (Voyage não tem oficial). 1024 dims alinha com schema HNSW (vector(1024)).
 *
 * Aceita 2º param opcional `inputType` ('document' | 'query'); a interface
 * `EmbedderAdapter` exige só `embed(input)`, então o overload extra é uma extensão
 * compatível — chamadas via interface ignoram-no, chamadas diretas (e.g. service
 * passando 'query' no retrieval) podem ativar.
 */
export class VoyageEmbedder implements EmbedderAdapter {
  readonly name = VOYAGE_MODEL;
  readonly dimensions = VOYAGE_DIMENSIONS;

  constructor(
    private readonly apiKey: string,
    private readonly model: string = VOYAGE_MODEL,
  ) {
    if (!apiKey) {
      throw new Error('VoyageEmbedder: apiKey is required');
    }
  }

  async embed(
    input: string | string[],
    inputType: 'document' | 'query' = 'document',
  ): Promise<number[][]> {
    const texts = Array.isArray(input) ? input : [input];
    if (texts.length === 0) return [];

    const res = await fetch(VOYAGE_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: texts,
        model: this.model,
        input_type: inputType,
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '<no body>');
      throw new Error(`Voyage API ${res.status}: ${body}`);
    }

    const json = (await res.json()) as {
      data: Array<{ embedding: number[]; index: number }>;
      model: string;
      usage?: unknown;
    };

    // Garante ordem por `index` — Voyage retorna em ordem, mas defensivo.
    const sorted = [...json.data].sort((a, b) => a.index - b.index);
    return sorted.map((d) => d.embedding);
  }
}
