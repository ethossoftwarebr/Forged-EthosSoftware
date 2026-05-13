import type { Provider } from '@nestjs/common';

import { createOpenAIEmbedder, OpenAIEmbedder } from '../src/server/adapters/openai-embedder';
import { VoyageEmbedder } from '../src/server/adapters/voyage-embedder';
import { AiRagModule, type AiRagModuleOptions } from '../src/server/ai-rag.module';
import { EMBEDDER_TOKEN } from '../src/server/ai-rag.service';
import type { EmbedderAdapter } from '../src/shared/adapters';
import { VOYAGE_DIMENSIONS } from '../src/shared/constants';

/**
 * embedder-factory.spec.ts — AC7 (Voyage default + OpenAI opt-in).
 *
 * Estratégia: `AiRagModule.forRoot` retorna um DynamicModule cujos `providers[]`
 * incluem o factory de EMBEDDER_TOKEN. Em vez de bootar TestingModule completo
 * (que precisa de PRISMA_CLIENT_TOKEN externo + Anthropic real + worker),
 * extraimos diretamente o provider e invocamos a factory.
 *
 * Vantagem: zero dep do DI graph completo do Nest; foco no contrato do AC7.
 */

type FactoryProvider = Extract<
  Provider,
  { provide: unknown; useFactory: (...args: unknown[]) => unknown }
>;

function getEmbedderFactory(opts: AiRagModuleOptions): () => EmbedderAdapter {
  const dyn = AiRagModule.forRoot(opts);
  const providers = (dyn.providers ?? []) as Provider[];
  const found = providers.find(
    (p): p is FactoryProvider =>
      typeof p === 'object' && p !== null && 'provide' in p && p.provide === EMBEDDER_TOKEN,
  );
  if (!found) {
    throw new Error('AiRagModule.forRoot did not register EMBEDDER_TOKEN factory');
  }
  return found.useFactory as () => EmbedderAdapter;
}

describe('AiRagModule embedder factory (AC7)', () => {
  it('uses VoyageEmbedder by default when forRoot called with voyageApiKey only', () => {
    const factory = getEmbedderFactory({
      voyageApiKey: 'voyage-test-key',
      anthropicApiKey: 'anthropic-test-key',
      redisUrl: 'redis://localhost:6379',
    });
    const embedder = factory();
    expect(embedder).toBeInstanceOf(VoyageEmbedder);
    expect(embedder.name).toContain('voyage');
    expect(embedder.dimensions).toBe(VOYAGE_DIMENSIONS);
  });

  it('uses OpenAIEmbedder via createOpenAIEmbedder factory when passed in options', () => {
    const openaiEmbedder = createOpenAIEmbedder({
      apiKey: 'openai-test-key',
      dimensions: VOYAGE_DIMENSIONS,
    });
    const factory = getEmbedderFactory({
      anthropicApiKey: 'anthropic-test-key',
      redisUrl: 'redis://localhost:6379',
      embedder: openaiEmbedder,
    });
    const embedder = factory();
    expect(embedder).toBeInstanceOf(OpenAIEmbedder);
    expect(embedder.name).toContain('text-embedding');
    expect(embedder.dimensions).toBe(VOYAGE_DIMENSIONS);
  });

  it('throws if no embedder + no voyageApiKey (factory contract)', () => {
    const factory = getEmbedderFactory({
      anthropicApiKey: 'anthropic-test-key',
      redisUrl: 'redis://localhost:6379',
    });
    expect(() => factory()).toThrow(/voyageApiKey/);
  });

  it('respects EmbedderAdapter interface contract (name, dimensions, embed)', () => {
    const voyage = new VoyageEmbedder('voyage-test-key');
    const openai = new OpenAIEmbedder('openai-test-key', undefined, VOYAGE_DIMENSIONS);
    for (const e of [voyage, openai]) {
      expect(typeof e.name).toBe('string');
      expect(e.name.length).toBeGreaterThan(0);
      expect(typeof e.dimensions).toBe('number');
      expect(e.dimensions).toBeGreaterThan(0);
      expect(typeof e.embed).toBe('function');
    }
  });
});
