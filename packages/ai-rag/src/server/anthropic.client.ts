import Anthropic from '@anthropic-ai/sdk';

/**
 * Token DI pro client Anthropic — Symbol pra evitar colisão com strings.
 * Mesmo pattern de `@ethos/ai-chat/server/anthropic.client.ts`.
 */
export const ANTHROPIC_CLIENT_TOKEN = Symbol('AI_RAG_ANTHROPIC_CLIENT');

export function createAnthropicClient({ apiKey }: { apiKey: string }): Anthropic {
  return new Anthropic({ apiKey });
}
