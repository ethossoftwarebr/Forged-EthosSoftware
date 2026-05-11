import { defineConfig } from '@hey-api/openapi-ts';

/**
 * Forge frontend codegen — `pnpm --filter @ethos-app/web gen:api`.
 *
 * Lê o OpenAPI JSON exposto pelo NestJS Swagger em `/api-docs-json` (D1 da spec
 * `2026-05-11-ethos-gen-frontend`) e gera types + cliente axios + hooks TanStack
 * Query + schemas Zod em `src/generated/api/`. O diretório `generated/` é tratado
 * como dependência (não editar manualmente — re-rodar o comando para atualizar).
 *
 * Dev local: API precisa estar rodando em `http://localhost:3001`
 * (`pnpm --filter @ethos-app/api dev`). Em CI / build de produção a fonte vira
 * snapshot estático (`openapi.json` versionado) — decisão diferida (D1).
 *
 * Plugins (D2):
 * - `@hey-api/client-axios` — alinha com o `api-client.ts` do app
 * - `@tanstack/react-query` — gera hooks `useXxxQuery`, `useXxxMutation`
 * - `zod` — gera schemas Zod a partir do OpenAPI (consumidos pelos forms gerados)
 */
export default defineConfig({
  input: 'http://localhost:3001/api-docs-json',
  output: 'src/generated/api/',
  plugins: ['@hey-api/client-axios', '@tanstack/react-query', 'zod'],
});
