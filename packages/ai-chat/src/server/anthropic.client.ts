import Anthropic from '@anthropic-ai/sdk';

/**
 * Token DI pro client Anthropic — Symbol pra evitar colisão com strings.
 * Injetado em `AiChatService` via `@Inject(ANTHROPIC_CLIENT_TOKEN)`.
 */
export const ANTHROPIC_CLIENT_TOKEN = Symbol('ANTHROPIC_CLIENT_TOKEN');

/**
 * Factory provider — chamada pelo `AiChatModule.forRoot()` com a apiKey lida do
 * env do app consumidor (D#13.4: nunca armazenada em var global do package).
 */
export function createAnthropicClient({ apiKey }: { apiKey: string }): Anthropic {
  return new Anthropic({ apiKey });
}
