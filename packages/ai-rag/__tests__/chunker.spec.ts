import { FixedSizeChunker } from '../src/server/adapters/fixed-chunker';
import { DEFAULT_CHUNK_OVERLAP, DEFAULT_CHUNK_SIZE } from '../src/shared/constants';

/**
 * chunker.spec.ts — FixedSizeChunker contract (W4.A).
 *
 * Cobre o ChunkerAdapter default. Heurística 1 token ~= 4 chars, então
 * size=500 tokens vira janela de 2000 chars; overlap=100 tokens vira step
 * (500 - 100) * 4 = 1600 chars.
 */
describe('FixedSizeChunker', () => {
  const chunker = new FixedSizeChunker();

  it('returns empty array for empty text', async () => {
    expect(await chunker.chunk('')).toEqual([]);
  });

  it('returns single chunk for text smaller than chunk size', async () => {
    const text = 'short text';
    const chunks = await chunker.chunk(text);
    expect(chunks).toHaveLength(1);
    expect(chunks[0].content).toBe(text);
    expect(chunks[0].index).toBe(0);
    expect(chunks[0].tokens).toBeGreaterThan(0);
  });

  it('produces multiple chunks with sequential indexes when text exceeds window', async () => {
    // 2500 chars > 2000 char window → produz >=2 chunks
    const text = 'a'.repeat(2500);
    const chunks = await chunker.chunk(text);
    expect(chunks.length).toBeGreaterThanOrEqual(2);
    chunks.forEach((c, i) => {
      expect(c.index).toBe(i);
      expect(c.tokens).toBeGreaterThan(0);
      expect(c.content.length).toBeGreaterThan(0);
    });
  });

  it('honors custom size and overlap options', async () => {
    const text = 'a'.repeat(2000);
    // size=100 tokens (~400 chars), overlap=20 (~80 chars step=320)
    const chunks = await chunker.chunk(text, { size: 100, overlap: 20 });
    expect(chunks.length).toBeGreaterThan(2);
    chunks.forEach((c, i) => expect(c.index).toBe(i));
  });

  it('respects defaults (DEFAULT_CHUNK_SIZE=500, DEFAULT_CHUNK_OVERLAP=100)', () => {
    expect(DEFAULT_CHUNK_SIZE).toBe(500);
    expect(DEFAULT_CHUNK_OVERLAP).toBe(100);
  });

  it('preserves content (concat covers full input within overlap distance)', async () => {
    const text = 'abcdefghij'.repeat(300); // 3000 chars
    const chunks = await chunker.chunk(text);
    // O primeiro chunk começa em 0
    expect(chunks[0].content.startsWith('abcdefghij')).toBe(true);
    // Total de chars cobertos (com overlap) >= chars originais
    const totalChars = chunks.reduce((acc, c) => acc + c.content.length, 0);
    expect(totalChars).toBeGreaterThanOrEqual(text.length);
  });
});
