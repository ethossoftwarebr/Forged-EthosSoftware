# @ethos/ai-chat

Chat plugavel com Anthropic Claude — modulo NestJS no backend + componentes React no frontend. Tools (function calling), streaming SSE, multi-tenant nativo. Schema-ready: depende de `ChatConversation` + `ChatMessage` ja presentes em `@ethos/database`.

Os tres entry points sao independentes:

- `@ethos/ai-chat/server` — `AiChatModule`, `AiChatService`, tools demo.
- `@ethos/ai-chat/client` — `ChatWidget`, `ChatInline`, `useAiChat`.
- `@ethos/ai-chat/shared` — tipos (`ToolDef`, `ChatRequestBody`, `StreamEvent`).

## Install no API (NestJS)

```ts
// app.module.ts
import { AiChatModule, createSearchProductsTool } from '@ethos/ai-chat/server';
import { Module } from '@nestjs/common';

@Module({
  imports: [
    AiChatModule.forRoot({
      apiKey: process.env.ANTHROPIC_API_KEY!,
      defaultModel: 'claude-sonnet-4-5',
      fallbackModel: 'claude-haiku-4-5',
      tools: [createSearchProductsTool(prismaClient)],
    }),
  ],
})
export class AppModule {}
```

`AiChatModule.forRoot` registra `AiChatController` em `POST /ai-chat` (sync) e `POST /ai-chat/stream` (SSE), ambos sob `JwtAuthGuard` + `MultiTenantInterceptor`. O modulo e `@Global`, entao `AiChatService` fica injetavel em qualquer feature sem reimport.

## Install no Web (Next.js / React)

```tsx
// app/layout.tsx
'use client';
import { ChatWidget } from '@ethos/ai-chat/client';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        {children}
        <ChatWidget apiBaseUrl="/api" />
      </body>
    </html>
  );
}
```

Variantes:

- `ChatWidget` — botao flutuante (FAB) que abre um popover de chat.
- `ChatInline` — chat embedado em pagina (sem FAB).
- `useAiChat` — hook headless para construir UI propria.

O cliente consome streaming via `fetch + ReadableStream` (compatível com Next.js App Router e qualquer runtime que suporte Web Streams).

## Env vars

| Var                 | Onde        | Obrigatorio | Default |
| ------------------- | ----------- | ----------- | ------- |
| `ANTHROPIC_API_KEY` | server-only | sim         | —       |

`apiKey` e passado explicitamente para `AiChatModule.forRoot` — o package nao le `process.env` direto (D#13.4: sem var global no escopo do package).

## Tools custom

```ts
import { z } from 'zod';
import type { ToolDef } from '@ethos/ai-chat/shared';

export function createWeatherTool(): ToolDef<{ city: string }, { temp: number }> {
  return {
    name: 'get_weather',
    description: 'Retorna a temperatura atual de uma cidade.',
    inputSchema: z.object({
      city: z.string().min(1).describe('Nome da cidade.'),
    }),
    handler: async ({ city }) => {
      // chamar API externa, consultar DB, etc.
      return { temp: 25 };
    },
  };
}
```

Registrar via `forRoot.tools` (preferido) ou `forFeature([...])`:

```ts
AiChatModule.forRoot({
  apiKey: process.env.ANTHROPIC_API_KEY!,
  tools: [createWeatherTool(), createSearchProductsTool(prisma)],
});
```

A tool e validada via `inputSchema.parse(input)` antes do handler — inputs invalidos do modelo geram `tool_result.is_error = true` e o loop continua. Tools demo prontos exportados:

- `createSearchProductsTool(prisma)` — busca `Product` do tenant atual.
- `createTicketTool()` — mock de criacao de ticket (nao persiste em DB).

## Customizar modelo

```ts
AiChatModule.forRoot({
  apiKey: process.env.ANTHROPIC_API_KEY!,
  defaultModel: 'claude-sonnet-4-5', // turn principal
  fallbackModel: 'claude-haiku-4-5', // reservado pra retry/downgrade (V1: nao usado automaticamente)
});
```

O cliente pode override por request via `body.model` (`ChatRequestBody.model`). Util pra A/B test ou rota de baixo custo.

## Streaming

Backend usa `@Sse('stream')` do NestJS (Express adapter + Transfer-Encoding chunked). O `useAiChat` hook consome via `fetch` + `ReadableStream` e expoe `StreamEvent`s tipados:

```ts
type StreamEvent =
  | { type: 'text'; delta: string }
  | { type: 'tool_use_start'; name: string; id: string }
  | { type: 'tool_use_input_delta'; id: string; deltaJson: string }
  | { type: 'tool_result'; id: string; output: unknown }
  | { type: 'done'; conversationId: string }
  | { type: 'error'; message: string };
```

`AbortController` propaga `req.on('close')` do controller para `Anthropic.messages.stream().abort()` (D#13.7).

## Multi-tenant

Conversacoes (`ChatConversation`) sao escopadas por `tenantId + userId`. O `tenantId` e lido do `JWT` decodificado via `getCurrentTenantId()` (api-base `AsyncLocalStorage`) — nunca do body/query.

- Acessar conversa de outro tenant → `404 CONVERSATION_NOT_FOUND` (D#13.12).
- Tools recebem o `tenantId` via `getCurrentTenantId()` quando precisarem (ex.: `createSearchProductsTool` filtra `Product.findMany` por `tenantId` automaticamente).

## Limitacoes V1

Concerns conhecidas, transparentes — todas tem workaround:

- **`forFeature([tools])` faz last-write-wins.** Multiplos `forFeature` em features diferentes sobrescrevem o `AI_CHAT_TOOLS_TOKEN`. Workaround: passar todas as tools num unico `forRoot.tools` (preferido) ou consolidar num unico `forFeature`. Merge real fica para V1.1.

- **`registerTool()` em runtime lanca.** O metodo existe mas joga erro orientando o dev a usar `forFeature` / `forRoot`. Registrar tools fora do lifecycle do DI nao e seguro (escapa do escopo de modulo).

- **History replay simplifica turns `system`/`tool`.** Apos reload do conversation, turns historicas de `system` ou `tool_result` viram texto plain prefixado (`[system] ...`, `[tool_result] ...`). Tools loop dentro do turn atual mantem fidelidade 1:1 (tool_use + tool_result blocks).

- **`zod` → JSON Schema manual.** O conversor interno cobre object/string/number/boolean/array/enum/optional/default/nullable — suficiente para tools demo. Schemas complexos (union, discriminated union, recursive) podem ser passados como JSON Schema bruto via wrapper.

- **Bundle do cliente ~1.67MB.** `@ethos/ui` e inlinado no build. Para otimizar, configure `@ethos/ui` como `external` no bundler do consumer (Webpack/Vite/Next).

## Testes

Suite Jest em `packages/ai-chat/__tests__/`. Cobrem:

- `tools-loop.e2e.spec.ts` — fluxo tool_use → tool_result → end_turn com `Anthropic.messages.create` mockado.
- `multi-tenant.e2e.spec.ts` — `ChatConversation.findFirst` isola por `tenantId + userId`, cross-tenant retorna 404.

Mocks: Anthropic SDK + `PrismaClient` (in-memory). Nao bate API real, nao precisa de DB. Rodar:

```bash
pnpm --filter @ethos/ai-chat test
```

## Estrutura

```
packages/ai-chat/
├── README.md                       ← este arquivo
├── package.json                    ← exports triplo (server/client/shared)
├── tsup.config.ts                  ← bundle CJS+ESM por entry
├── jest.config.cjs                 ← config Jest minimal (ts-jest, node env)
├── __tests__/                      ← suites e2e (mocks)
└── src/
    ├── server/                     ← NestJS module/service/controller + tools demo
    ├── client/                     ← React components + useAiChat hook
    └── shared/                     ← types compartilhados
```

## Proximos passos

- Persistir `attachments` (imagem/PDF) — depende de schema novo.
- `forFeature` com merge real (concern V1).
- `system` prompt por tenant (white-label) — schema-ready via `Tenant.settings`.
- Tool registration pos-load via async provider (concern V1, requer rework de DI).

Ver `docs/08-PACOTES-PLUGAVEIS.md` para roadmap completo do pacote.
