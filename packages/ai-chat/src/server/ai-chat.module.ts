import { type DynamicModule, Global, Module } from '@nestjs/common';

import type { ToolDef } from '../shared';

import { AiChatController } from './ai-chat.controller';
import { AI_CHAT_OPTIONS_TOKEN, AiChatService, type AiChatOptions } from './ai-chat.service';
import { ANTHROPIC_CLIENT_TOKEN, createAnthropicClient } from './anthropic.client';
import { AI_CHAT_TOOLS_TOKEN, ToolsRegistry } from './tools.registry';

export interface AiChatModuleOptions {
  apiKey: string;
  /** Default `claude-sonnet-4-5` (D#13.1). */
  defaultModel?: string;
  /** Default `claude-haiku-4-5` (D#13.1) — reservado pra retry/downgrade futuro. */
  fallbackModel?: string;
  /** Tools registradas no escopo global. Devs também podem usar `forFeature`. */
  tools?: ToolDef[];
}

/**
 * AiChatModule — registro raiz do package.
 *
 * Uso típico:
 * ```ts
 * AiChatModule.forRoot({
 *   apiKey: env.ANTHROPIC_API_KEY,
 *   defaultModel: 'claude-sonnet-4-5',
 *   tools: [createSearchProductsTool(prisma)],
 * })
 * ```
 *
 * `forFeature([tools])` é fornecido como alternativa pra módulos que querem
 * registrar tools depois do forRoot. **Limitação V1:** o último escopo que
 * registra `AI_CHAT_TOOLS_TOKEN` ganha (sem merge cross-feature). Recomendação
 * prática: passe todas as tools no `forRoot.tools`. Issue futura: merge real.
 *
 * `@Global` no forRoot — `AiChatService` fica disponível em qualquer módulo
 * sem reimport. D#13.6: package controla próprio módulo.
 */
@Module({})
export class AiChatModule {
  static forRoot(options: AiChatModuleOptions): DynamicModule {
    const resolvedOptions: AiChatOptions = {
      defaultModel: options.defaultModel ?? 'claude-sonnet-4-5',
      fallbackModel: options.fallbackModel ?? 'claude-haiku-4-5',
    };
    const tools = options.tools ?? [];

    return {
      module: AiChatModule,
      global: true,
      controllers: [AiChatController],
      providers: [
        {
          provide: AI_CHAT_OPTIONS_TOKEN,
          useValue: resolvedOptions,
        },
        {
          provide: ANTHROPIC_CLIENT_TOKEN,
          useFactory: () => createAnthropicClient({ apiKey: options.apiKey }),
        },
        {
          provide: AI_CHAT_TOOLS_TOKEN,
          useValue: tools,
        },
        {
          provide: ToolsRegistry,
          useFactory: (toolList: ToolDef[]) => new ToolsRegistry(toolList),
          inject: [AI_CHAT_TOOLS_TOKEN],
        },
        AiChatService,
      ],
      exports: [AiChatService, ToolsRegistry, AI_CHAT_OPTIONS_TOKEN],
    };
  }

  /**
   * V1: `forFeature` é provided por compatibilidade futura mas NÃO injeta tools
   * no `AiChatService` global. O `AiChatService` (criado no `forRoot` global)
   * continua usando o registry do `forRoot` — o registry local criado aqui é
   * invisível a ele. Devs DEVEM passar todas as tools via `forRoot({ tools })`
   * ou registrar tools num único `forFeature`. Merge cross-feature fica como
   * issue pós-v1 (W2-C1).
   */
  static forFeature(tools: ToolDef[]): DynamicModule {
    return {
      module: AiChatModule,
      providers: [
        {
          provide: AI_CHAT_TOOLS_TOKEN,
          useValue: tools,
        },
        {
          provide: ToolsRegistry,
          useFactory: (toolList: ToolDef[]) => new ToolsRegistry(toolList),
          inject: [AI_CHAT_TOOLS_TOKEN],
        },
      ],
      exports: [ToolsRegistry],
    };
  }
}

// Marker pra evitar tree-shake do decorator @Global quando alguém só importa
// o tipo do módulo (TS-only imports). Não usa runtime.
const _markerGlobal: typeof Global = Global;
void _markerGlobal;
