import type { ChunkerAdapter, ChunkerOptions } from '../../shared/adapters';
import { DEFAULT_CHUNK_OVERLAP, DEFAULT_CHUNK_SIZE } from '../../shared/constants';
import type { Chunk } from '../../shared/types';

/**
 * FixedSizeChunker — split por janela deslizante com overlap.
 *
 * **V1 simplificação:** 1 token ≈ 4 chars (heurística OpenAI). Evita dep
 * tiktoken/transformers. Para precisão real (tokenização BPE), troque por
 * um adapter custom (e.g. `TiktokenChunker` num package separado).
 *
 * Defaults: size=500 tokens (~2000 chars), overlap=100 tokens (~400 chars).
 */
export class FixedSizeChunker implements ChunkerAdapter {
  readonly name = 'fixed-size';

  async chunk(text: string, options?: ChunkerOptions): Promise<Chunk[]> {
    if (!text || text.length === 0) return [];

    const sizeTokens = options?.size ?? DEFAULT_CHUNK_SIZE;
    const overlapTokens = options?.overlap ?? DEFAULT_CHUNK_OVERLAP;
    const CHARS_PER_TOKEN = 4;
    const windowChars = sizeTokens * CHARS_PER_TOKEN;
    const stepChars = Math.max(1, (sizeTokens - overlapTokens) * CHARS_PER_TOKEN);

    const chunks: Chunk[] = [];
    let start = 0;
    let index = 0;
    while (start < text.length) {
      const end = Math.min(start + windowChars, text.length);
      const content = text.slice(start, end);
      chunks.push({
        content,
        index,
        tokens: Math.ceil(content.length / CHARS_PER_TOKEN),
        metadata: { start, end },
      });
      if (end === text.length) break;
      start += stepChars;
      index += 1;
    }
    return chunks;
  }
}
