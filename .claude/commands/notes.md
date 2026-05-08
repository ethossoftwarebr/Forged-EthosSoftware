<!-- Notas do projeto — NÃO marcar com mustard:generated, esse arquivo é manual e persistente. -->

# Notas do projeto — Ethos Forge

> Resume artifact pra novas sessões do Claude Code. Lido automaticamente pelo agent durante pipelines; serve de baseline pra qualquer dev/sessão que pegar o projeto.
>
> **Atualizado:** 2026-05-08 (sessão 4 — pós #7)
> **Estado:** prompts #1–#7 concluídos. UI lib completa + **API base do starter pronta** (NestJS 10 + Prisma 5 stub + Pino + Helmet + Compression + Swagger + Zod env + envelope `{data,meta}` + `/health` Terminus + Dockerfile multi-stage). Próximo: prompt #8 (Auth + Multi-tenant) — spec já criada em `.claude/spec/active/2026-05-08-ethos-auth-multitenant/` com 11 decisões D1-D11 propostas (pending dev approval ao rodar `/mustard:resume` na sessão 5).

## 1. O que é o projeto

**Ethos Forge** — kit de partida proprietário da Ethos Software. Monorepo Turborepo + pnpm com biblioteca de UI, geradores de código (schema Prisma → CRUD), e pacotes plugáveis. Forge é IP da Ethos: cliente recebe código gerado, **não** recebe a Forge.

Documentação completa em `docs/` (14 .md) e `CLAUDE.md` na raiz. `docs/12-PROMPTS-CLAUDE-CODE.md` é o roteiro operacional (23 prompts).

## 2. Stack travada

| Camada   | Tecnologia                                                                         |
| -------- | ---------------------------------------------------------------------------------- |
| Backend  | NestJS 10 + Prisma 5 + PostgreSQL 16                                               |
| Frontend | Next.js 14 (App Router) + TypeScript 5 + Tailwind 3.4 + shadcn customizado + Radix |
| Estado   | TanStack Query 5 + Zustand 4                                                       |
| Forms    | React Hook Form 7 + Zod 3                                                          |
| Hash     | argon2id (**NÃO** bcrypt)                                                          |
| IA       | Anthropic Claude (Sonnet 4.5 + Haiku 4.5)                                          |
| Vector   | pgvector (extension Postgres)                                                      |
| Queue    | BullMQ + Redis 7                                                                   |
| Monorepo | Turborepo 2.x + pnpm 9                                                             |
| Deploy   | Railway                                                                            |

## 3. Decisões arquiteturais travadas

1. **Forge é kit, não produto.** Apps de produto vivem em `templates/starter/apps/api/` e `templates/starter/apps/web/` — **não** em `apps/` da raiz da Forge.
2. **`apps/` da Forge** contém só `apps/playground/` (vitrine viva Next.js, não deployada).
3. **15 packages:** 7 infra (`ui`, `auth`, `database`, `api-base`, `config`, `types`, `utils`) + 8 plugáveis (`ai-chat`, `ai-rag`, `ocr`, `whatsapp`, `google`, `n8n`, `payments`, `erp-bridge`).
4. **`database` ≠ `api-base`** — packages distintos:
   - `@ethos/database` = Prisma client wrapper + schema central (`prisma/schema.prisma`) + tipos derivados
   - `@ethos/api-base` = módulos NestJS reutilizáveis (multi-tenant interceptor, audit log, exception filters, decorators)
5. **Generators em `tools/generators/`** (NÃO em `packages/`) — não publicáveis, fora do workspace pnpm. Subpastas:
   - `tools/generators/forge-controller/` (backend: controller.hbs, module.hbs, service.hbs)
   - `tools/generators/forge-page/` (frontend: list-page.hbs, create-page.hbs, edit-page.hbs, view-page.hbs, icon-map.ts)
6. **Modelo B do CRUD:** gerador cospe `BaseClientService`, dev cria `ClientService extends BaseClientService` quando precisa customizar. Re-rodar generator **nunca** destrói customização do dev.
7. **Multi-tenant desde o sprint 1:** `tenantId` propagado via AsyncLocalStorage + Prisma extension. **Nunca** permitir `tenantId` vir do body ou query — só do JWT decodificado.
8. **Auth:** JWT em cookie httpOnly (**não** localStorage), argon2id, refresh token rotation, sessões persistidas em Postgres (não em memória).
9. **Roles:** `owner > admin > manager > member > viewer`. Endpoints anotam `@Roles(...)` explicitamente.
10. **Identidade visual rígida:** só Tailwind (sem CSS-in-JS), paleta fixa em `docs/02-IDENTIDADE-VISUAL.md`, animações 150-200ms ease-out apenas. **Proibidos:** Material UI, Chakra, Mantine, Ant Design, styled-components, emotion.
11. **Mobile-first:** todo componente UI testado em 375px / 768px / 1024px / 1440px no Storybook.
12. **`turbo.json`** usa schema Turbo 2 (`"tasks"`, não `"pipeline"`).

## 4. Progresso (commits no main, pushados em origin)

```
23e575a  feat(api): health endpoint + prisma stub + Dockerfile multi-stage (wave 3 do prompt #7) — API base FINAL
ae0714e  feat(api): common filters + interceptors + pipes + env schema (wave 2 do prompt #7)
7065ea1  chore(api): bootstrap NestJS 10 em templates/starter/apps/api/ (wave 1 do prompt #7)
8acf535  docs(forge): atualiza roadmap com Fase 2.5 + Fases 9-12 + notes pos-#6.5
897e36f  docs(forge): adiciona 15 plugaveis pos-v1 ao doc 08 (23 plugaveis totais)
23a41eb  docs(forge): expande doc 03 com 9 infras adicionais (16 infras totais)
ba604ac  docs(forge): adiciona doc 13 — manutencao e evolucao pos-v1
7e37e6a  feat(ui): layout DashboardLayout no @ethos/ui (wave 2 do prompt #6) — UI lib FINAL
4f33807  feat(ui): layouts AuthLayout e SettingsLayout no @ethos/ui (wave 1 do prompt #6)
c7d0a59  docs(handoff): atualiza notes apos prompt #5 (10 compostos @ethos/ui)
1f8a5f3  feat(ui): composto FiltersPanel no @ethos/ui (wave 5 do prompt #5) — FINAL
50e2f9f  feat(ui): composto DataTablePro no @ethos/ui (wave 4 do prompt #5)
4080f6c  feat(ui): composto FormBuilder no @ethos/ui (wave 3 do prompt #5)
6302f59  feat(ui): compostos KpiCard e ConfirmDialog no @ethos/ui (wave 2 do prompt #5)
501bbdc  feat(ui): compostos atomic no @ethos/ui (wave 1 do prompt #5)
f436e22  docs(handoff): atualiza notes apos prompt #4 (32 primitivos @ethos/ui)
e28c4ea  feat(ui): primitivos do grupo Estrutura no @ethos/ui (wave 5 — fim do prompt #4)
280a2cc  feat(ui): primitivos do grupo Navegacao no @ethos/ui (wave 4)
9796ce6  feat(ui): primitivos do grupo Overlays + DatePicker no @ethos/ui (wave 3)
9cea7c5  feat(ui): primitivos do grupo Feedback no @ethos/ui (wave 2 do prompt #4)
3e1f64d  feat(ui): primitivos do grupo Forms no @ethos/ui (wave 1 do prompt #4)
d0d9938  docs(handoff): atualiza notes apos prompt #3 (@ethos/ui fundacao)
44dfee6  feat(ui): storybook 8 + stories de primitivas (button, input, card)   ← Wave 3 prompt #3
9970b0d  feat(ui): primitivas Button, Input e Card no @ethos/ui                ← Wave 2 prompt #3
b989d31  chore(ui): bootstrap @ethos/ui (tsup + tailwind preset + globals)     ← Wave 1 prompt #3
438c3eb  docs(handoff): atualiza spec após prompt #2 concluído
03b4e5b  docs(forge): atualiza prompt #2 com aprendizados pós-implementação
24cc033  chore(forge): adiciona workflow CI (lint+typecheck+test+build)        ← Wave 3 prompt #2
da7cd00  chore(forge): adiciona Husky 9 + lint-staged + commitlint             ← Wave 2 prompt #2
8a1c5c6  chore(forge): adiciona ESLint 9 flat + Prettier 3 + presets em @ethos/config  ← Wave 1 prompt #2
00775a9  chore(claude): adiciona scan references (stack/patterns/guards/recipes)
3815427  docs(handoff): documenta mustard como infra operacional oficial
8bbb9a3  chore(claude): adiciona mustard slash commands infra
4091028  chore(handoff): persiste estado do projeto pra continuidade entre sessões
7081495  docs(forge): doc-sweep — alinha caminhos com estrutura kit-vs-template
1dc7e98  chore(monorepo): inicializa estrutura Turborepo + pnpm + 15 packages + docker-compose
7810d51  docs(monorepo): alinha CLAUDE.md, doc-03 e prompts com decisões de estrutura
ca8a429  docs: documentação inicial do Forge
```

> Nota sobre renormalize: `git add --renormalize .` rodado pós-prompt #2 retornou no-op — o repo já estava em LF. O `.gitattributes` agora garante isso prospectivamente, sem commit dedicado.

## 5. Estado atual

- ✅ Monorepo Turborepo 2.9.6 + pnpm 9 inicializado
- ✅ 17 workspaces resolvendo (1 playground + 1 starter + 15 packages, todos placeholders)
- ✅ `tsconfig.base.json` raiz + 4 presets em `@ethos/config/tsconfig/{base,nextjs,nestjs,library}.json`
- ✅ `docker-compose.yml` com Postgres 16-alpine (extensions `pgcrypto, pg_trgm, unaccent, vector` via `docker/postgres/init/01-extensions.sql`) + Redis 7-alpine
- ✅ `.env.example` raiz com `POSTGRES_USER`, `POSTGRES_PASSWORD`, `DATABASE_URL`, `REDIS_URL`, etc.
- ✅ `.gitignore` robusto (node_modules, dist, .next, .turbo, .env\*, coverage)
- ✅ `pnpm typecheck` passa (16 tasks)
- ✅ `docker compose config` valida YAML
- ✅ Doc-sweep concluído (16 edits em docs/05, 06, 07, 11) alinhando referências de caminho com estrutura kit-vs-template
- ✅ **ESLint 9 flat + Prettier 3 + Husky 9 + lint-staged + commitlint + CI configurados (prompt #2)**
  - Presets em `@ethos/config/eslint/{base,nextjs,node}.mjs`; raiz consome via `eslint.config.mjs` com override CJS pra `*.config.{js,cjs}`
  - Hooks ativos: `pre-commit` roda lint-staged, `commit-msg` roda commitlint config-conventional
  - CI em `.github/workflows/ci.yml` (matrix Node 20, cache pnpm + turbo, least privilege)
  - 7/7 ACs validados; QA emitido no harness events log
- ✅ **`@ethos/ui` fundação concluída (prompt #3)** — 3 waves em 3 commits
  - tsup ESM+dts + Tailwind 3.4 preset CJS (D9) + PostCSS + CSS vars HSL completas (light + dark) do doc 02
  - 3 primitivas: Button (cva, 6 variants × 4 sizes, asChild via Radix Slot, loading com Loader2), Input (h-10 + focus ring), Card (6 sub-componentes)
  - Storybook 8 + Vite + addon-themes (`withThemeByClassName` light/dark) + viewports 375/768/1024/1440 + a11y
  - 22 stories totais (11 Button + 7 Input + 4 Card), build-storybook estático passa
  - Helper `cn()` (clsx + tailwind-merge), `forwardRef + displayName` em todos os componentes
  - Novos presets em `@ethos/config`: `tsconfig/react-library.json` (D7); `base.json` agora inline (sem extends da raiz) — destrava resolver no Windows/pnpm
  - 10/11 ACs verde; AC#8 (storybook dev visual em :6006) é validação manual humana
- ✅ **`@ethos/ui` primitivos Radix concluídos (prompt #4)** — 5 waves em 5 commits
  - **32 primitivos** entregues, cobrindo 5 grupos: Forms (9), Feedback (6), Overlays + DatePicker (7), Navegação (4), Estrutura (6)
  - **22 deps** novas em single-pass (D3): 19 Radix individuais (label, select, checkbox, radio-group, switch, slider, progress, dialog, popover, tooltip, dropdown-menu, context-menu, tabs, separator, scroll-area, aspect-ratio, avatar, accordion, collapsible) + sonner^2 + cmdk^1 + react-day-picker^9 — todos majors confirmados via `pnpm view` antes de pinar (D2)
  - **104 stories** totais no Storybook (≥3 por componente, D15)
  - Padrão flat aplicado em 100% (D1): TODOS os sub-componentes (DropdownMenu.SubTrigger, ScrollBar, FormFieldLabel, etc.) no MESMO arquivo do principal
  - Decisões locked: D4 TimePicker manual (mask HH:mm), D5 FormField sem RHF (cloneElement aria-wiring), D6 Toast = Sonner wrapper (`<Toaster richColors closeButton />`), D7 Sheet = Dialog+side cva, D8 Spinner = Loader2 wrap, D9 Pagination/Breadcrumb manuais (Pagination reusa buttonVariants), D11 HoverCard/Drawer/Calendar/Menubar/NavigationMenu/AlertDialog NÃO implementados (fora do prompt #4 — divergence vs doc 04 anotada como follow-up)
  - D12 aplicado: Popover criado ANTES de DatePicker na Wave 3 (DatePicker depende dele)
  - DatePicker: Popover + react-day-picker v9 com DayPicker mode=single, locale ptBR via `react-day-picker/locale`, formato pt-BR via `Intl.DateTimeFormat` (sem dep nova de date-fns)
  - `tailwind.config.ts` ganhou keyframes `accordion-down`/`accordion-up` (tailwindcss-animate não cobria as classes `data-[state=open]:animate-accordion-down`)
  - Build final: `dist/index.mjs` 65.28 KB (era ~3 KB pós-#3) + `dist/index.d.mts` 33.08 KB
  - **9/10 ACs verde** (AC#10 a11y manual em :6006 deferido como follow-up)
- ✅ **`@ethos/ui` layouts concluídos (prompt #6)** — 2 waves em 2 commits — UI lib FINAL
  - **3 layouts** em pastas `src/layouts/<NomeLayout>/index.tsx` (D1):
    - **AuthLayout** — Card centered max-w-[400px], `logo`/`footer` props (D5), bg-gradient sutil
    - **SettingsLayout** — 2-col flex md:flex-row (sidebar interna `SettingsSidebar` + main), mobile-first horizontal scroll
    - **DashboardLayout** — 8 sub-arquivos: `index.tsx` (orquestrador) + `Sidebar.tsx` + `SidebarItem.tsx` + `SidebarGroup.tsx` + `Topbar.tsx` + `UserMenu.tsx` + `useSidebarState.ts` (hook SSR-safe localStorage) + `sidebarConfig.ts` (`SidebarConfig` type + `defineSidebarConfig` identity helper p/ generators do prompt #11)
  - **0 deps novas** (D6) — usa primitivos do #4 (Sheet/Collapsible/DropdownMenu/Tooltip/Command/Breadcrumb/Badge/Button) + composto UserAvatar do #5
  - **14 stories** totais (4 AuthLayout + 4 SettingsLayout + 6 DashboardLayout, ≥4 cada — D13)
  - Decisões locked: D2 SidebarConfig prop tipada com helper identity, D3 useSidebarState localStorage SSR-safe (chave `ethos:sidebar:<storageKey>`), D4 theme switch agnóstico via `<html class="dark">` toggle (sem next-themes), D5 logo/produto via prop, D6 zero deps, D7 2 commits + auto-push, D8 breadcrumbs slot consome primitivo Breadcrumb (não composto PageHeader), D9 a11y manual deferido
  - Build final: `dist/index.mjs` 136 KB (era 117 KB pós-#5) + `dist/index.d.mts` 50 KB
  - **7/7 ACs PASS** — qa.result registrado no harness
  - Concerns abertos pra resolver no prompt #6.5 ou consumer real: (a) `animate-collapsible-*` keyframes não existem no tailwind config (animação skipped — chevron rotate 150ms é o feedback visual mínimo); (b) 2 `TooltipProvider` (um por instância de Sidebar — desktop + mobile drawer) por escolha consciente do agent
- ✅ **`@ethos/ui` compostos concluídos (prompt #5)** — 5 waves em 5 commits
  - **10 compostos** em pastas `src/components/<NomeComposto>/index.tsx` (D1 — primitivos do #4 continuam flat): StatusBadge, UserAvatar, SectionHeader, PageHeader, EmptyState, KpiCard, ConfirmDialog, FormBuilder, DataTablePro, FiltersPanel
  - **6 deps runtime** single-pass (D3): `@tanstack/react-table^8`, `@tanstack/react-virtual^3`, `react-hook-form^7`, `@hookform/resolvers^5`, `zod^4`, `recharts^3`
  - **52 stories** totais no Storybook (≥5 por composto, D13 — explícito no prompt #5)
  - Padrões novos introduzidos: KpiCard com cva accent border absoluto + Sparkline recharts; ConfirmDialog Provider+useConfirm hook (Promise-based, useRef pra evitar stale closure); FormBuilder discriminated union 12 tipos D4 com `register` (Input/Textarea) ou `Controller` (Select/Checkbox/Switch/Date/custom); DataTablePro TanStack Table v8 + react-virtual auto-threshold=100 (D10), exportCsv puro RFC 4180; FiltersPanel modes sheet|inline (D8) com Sheet primitivo
  - Decisões locked: D5 ConfirmDialog 4 variants (default/destructive/warning/info), D6 KpiCard sparkline opcional, D7 EmptyState 1 componente com 3 variants, D9 DataTablePro segue API do doc 04, D11 SearchBar/StatGrid/Timeline/CommandPalette/ChartCard NÃO implementados (D11), D14 5 commits + auto-push, D15 compostos REUSAM primitivos (zero redeclaração de styling)
  - Build final: `dist/index.mjs` 117 KB (era 65 KB pós-#4) + `dist/index.d.mts` 46 KB
  - **8/8 ACs PASS** — qa.result event registrado no harness (overall=pass)
  - Concerns abertos pra resolver em prompt futuro: (a) PageHeader exporta `BreadcrumbItem` como alias `PageHeaderBreadcrumbItem` por colisão com primitivo Breadcrumb; (b) `FilterOption` colide entre DataTablePro/types.ts (canônico) e FiltersPanel/types.ts — re-exportado como `FiltersPanelOption`; (c) FormBuilder usa `zodResolver(schema as never) as Resolver<T>` pra unificar Zod v3/v4 input shapes (z.coerce input=unknown vs Resolver expects FieldValues)
- ✅ **API base do starter concluída (prompt #7)** — 3 waves em 3 commits (`7065ea1`, `ae0714e`, `23e575a`)
  - **NestJS 10.4.22** (LTS) + **Prisma 5.22.0** + **Zod 4.0.4** (D3 — `z.url()` canônico em Zod 4) + **nestjs-pino 4.4** + **helmet 8** + **compression 1.8** + **@nestjs/throttler 6** (60req/min — D16) + **@nestjs/swagger 11** + **@nestjs/terminus 11**
  - **22 arquivos** em `templates/starter/apps/api/`: bootstrap completo (`main.ts` com Helmet + Compression + ValidationPipe + Swagger `/api-docs` + CORS + graceful shutdown + Pino bufferLogs), `EnvModule` (Zod env validation, trava startup com env inválido), `AllExceptionsFilter` (envelope `{ error: { code, message, statusCode, timestamp, path, details? } }`), `TransformInterceptor` (envelope `{ data, meta: { timestamp, path } }` com skip rules pra /api-docs/SSE/Buffer/already-wrapped), `ZodValidationPipe` (per-route via `@ZodBody(schema)` — NÃO global porque pipe precisa de schema arg), `HealthController` (Terminus memory+disk), `Dockerfile` multi-stage `node:20-alpine` + `corepack` pnpm, `prisma/schema.prisma` placeholder
  - Adicionado `templates/starter/apps/*` no `pnpm-workspace.yaml` (workspace não cobria starter apps)
  - **Decisões locked D1-D17:** D1 NestJS 10 LTS, D2 Prisma 5 placeholder local, D3 Zod (não class-validator), D4 nestjs-pino bufferLogs, D5 Swagger /api-docs + /api-docs-json, D6 envelope `{data,meta}`, D7 envelope error com code, D8 Dockerfile multi-stage Alpine, D9 Prisma 0 models (workaround Prisma 5.22: 1 placeholder model `PlaceholderHealth` "DO NOT USE" — fechado em #8 quando schema migra pra `@ethos/database`), D10 sem E2E neste prompt, D11 3 commits + auto-push, D12-D13 smoke manual aceitável, D14 concerns #3-#6 deferidos, D15 extends `@ethos/config/tsconfig/nestjs.json`, D16 throttler 60req/min, D17 `/health` sem auth (até #8 wirar `@Public()`)
  - Validações: `pnpm install` PASS · `pnpm lint` 17/17 PASS · `pnpm typecheck` 17/17 PASS · `pnpm build` 3/3 PASS · `prisma generate` PASS
  - Review APPROVED (0 critical, 3 warnings, 5 notes — todos deferidos a #8)
  - **4/7 ACs PASS** automatizados (1, 2, 3, 4); **3 ACs deferidos** a smoke manual (5 Zod env trap, 6 `/health` 200, 7 `/api-docs-json` JSON válido — comandos documentados)
  - **5 concerns abertos pra resolver no #8:** (a) D9 fechamento — deletar schema local, apontar pra `@ethos/database`; (b) `AllExceptionsFilter` preservar `code: VALIDATION_ERROR` do `ZodValidationPipe` (hoje vira `BAD_REQUEST` no path HttpException); (c) `main.ts` usar `EnvService` (não `process.env` direto); (d) `HealthController.check()` anotar return type; (e) `TransformInterceptor` skip `^/health` (monitores externos esperam shape Terminus puro)
- ✅ Branch `main` em sync com `origin/main` (auto-push ativo após cada commit — D18)

## 6. Próximo passo: prompt #8 (Auth + Multi-tenant)

Escopo conforme `docs/12-PROMPTS-CLAUDE-CODE.md` §8 + `docs/07-AUTH-MULTI-TENANT.md`. **Coração do kit** — todo produto cliente herda essa fundação.

**Spec já preparada:** `.claude/spec/active/2026-05-08-ethos-auth-multitenant/spec.md` (status `pending-approval` — aguarda dev rodar `/mustard:resume` na sessão 5 e aprovar/ajustar inline as 11 decisões D1-D11).

**4 waves planejadas:**

1. **DB + packages** — schema central em `packages/database/prisma/schema.prisma` (Tenant, User, TenantMember, RefreshToken, Session, AuditLog + enum Role) + migration inicial; `@ethos/auth` (argon2id + JWT helpers); `@ethos/database` (Prisma client wrapper + extension multi-tenant); `@ethos/api-base` (guards JwtAuth/Roles/Tenant + decorators + AsyncLocalStorage + AuditLog interceptor)
2. **AuthModule** — `register`, `login`, `refresh` (rotation), `logout`, `me` em `templates/starter/apps/api/src/modules/auth/`
3. **UsersModule + TenantsModule** — CRUD básico, role-aware, com isolation automática por tenant
4. **Wire-up + cleanup #7 + audit + seed** — `JwtAuthGuard` global, `@Public()` em `health.controller`, habilitar `PrismaHealthIndicator`, resolver os 5 concerns abertos do #7, `AuditLogInterceptor` global, seed default (1 tenant + 1 owner)

**11 decisions propostas (pending dev approval):**

- D1: `@node-rs/argon2` (Rust binding, prebuilt) vs `argon2` Node native — recomendação Rust (sem build tools)
- D2: `jose` (moderno, ESM, edge-compat) vs `jsonwebtoken` (clássico) — recomendação `jose`
- D3: Cookies via lib `cookie` direta (sem middleware) — wrapper helper em `@ethos/auth`
- D4: AsyncLocalStorage em `@ethos/api-base` (não `@ethos/auth` — auth deve ser framework-agnostic)
- D5: Refresh rotation **mandatory** (refresh1 invalida ao gerar refresh2). Access 15min, refresh 30 dias
- D6: Cross-tenant retorna **404** (não 403 — não vazar existência)
- D7: AuditLog **síncrono** neste prompt (mesma transaction); refactor pra async via BullMQ vira follow-up no #15
- D8: Seed cria tenant `default` + user `admin@ethos.local` com senha de `SEED_ADMIN_PASSWORD` env (sem default público)
- D9 (fecha #7): schema local deletado, `package.json` aponta `prisma.schema` pra `packages/database/prisma/schema.prisma`
- D10: Public routes — `/health`, `/auth/register`, `/auth/login`, `/auth/refresh`, `/api-docs*`. Resto privado por default
- D11: 8+ commits Conventional + auto-push após cada

**10 ACs definidos** (schema validate, migrations aplicadas, hash/JWT exports, register flow E2E, cross-tenant 404 isolation, refresh rotation, argon2 memoryCost configurável, senhas nunca em log, tenantId nunca do body, `/health` 200 com/sem cookie).

**Estimativa:** 4-6 horas (waves complexas + E2E testing).

**Concerns abertos / deferidos:**

- **Concerns do #7 (5 itens — listados acima)** — resolução obrigatória durante #8
- **Concerns acumulados #3-#6 (UI lib)** — re-deferidos pra quando `templates/starter/apps/web/` consumir `@ethos/ui` (será no #10)
- **AC#10 a11y manual** do prompt #4 — validação humana em http://localhost:6006 ainda pendente

**Princípios reaproveitados (não-negociáveis):**

- argon2id (NÃO bcrypt), JWT em cookie httpOnly (NÃO localStorage)
- `tenantId` SÓ do JWT decodificado — nunca do body/query
- Princípio do menor privilégio — todo endpoint anota `@Roles(...)` ou herda guard
- Postgres pra sessões persistidas (NÃO memória)
- Sem CSS-in-JS, sem libs UI prontas (continua valendo no frontend quando chegar)

## 7. Pipeline planejado (#3 a #23)

| #     | Prompt                                                                                | Status         |
| ----- | ------------------------------------------------------------------------------------- | -------------- |
| 1     | Setup do monorepo                                                                     | ✅ Concluído   |
| 2     | Configuração de tooling                                                               | ✅ Concluído   |
| 3     | @ethos/ui — Fundação (Button, Input, Card + tokens)                                   | ✅ Concluído   |
| 4     | @ethos/ui — Primitivos (32 componentes Radix-based)                                   | ✅ Concluído   |
| 5     | @ethos/ui — Compostos (10: DataTablePro, FormBuilder, KpiCard, etc.)                  | ✅ Concluído   |
| 6     | @ethos/ui — Layouts (Dashboard, Auth, Settings)                                       | ✅ Concluído   |
| 6.5   | Roadmap Expansion (docs 03/08/11/13 + CLAUDE.md — 39 packages, Fases 9-12)            | ✅ Concluído   |
| 7     | Setup do app API (NestJS em `templates/starter/apps/api/`)                            | ✅ Concluído   |
| 8     | Auth + Multi-tenant                                                                   | ⏭️ **Próximo** |
| 9     | Geradores Backend (em `tools/generators/forge-controller/`)                           | Pendente       |
| 10    | Setup do app Web (Next.js em `templates/starter/apps/web/`)                           | Pendente       |
| 11    | Geradores Frontend (em `tools/generators/forge-page/`)                                | Pendente       |
| 12    | Consolidação template starter                                                         | Pendente       |
| 13-20 | Pacotes plugáveis (ai-chat, ai-rag, ocr, whatsapp, google, n8n, payments, erp-bridge) | Pendente       |
| 21    | Deploy Railway                                                                        | Pendente       |
| 22    | Code review automatizado                                                              | Pendente       |
| 23    | Debugging                                                                             | Pendente       |

## 8. Protocolo de trabalho

Para cada prompt em `docs/12-PROMPTS-CLAUDE-CODE.md`:

1. Claude Code lê os `.md` referenciados em `docs/`
2. Apresenta plano em ≤8 bullets
3. Aguarda aprovação humana (em plan mode → ExitPlanMode com allowedPrompts)
4. Executa em fases (Fase A: doc updates se aplicável; Fase B: implementação)
5. Valida conforme escopo (`pnpm install`, `pnpm typecheck`, `pnpm turbo run build --dry`, `docker compose config`)
6. Reporta resultado (resumo de hunks + `git log --oneline -5` + `git status --short`)
7. Commita em Conventional Commits separados por fase

**Doc é fonte de verdade.** Ao descobrir inconsistência entre prompt/CLAUDE.md/docs, parar, propor correção, atualizar docs **antes** de codar.

**Resista a violações dos princípios** da seção 3 — apontar e propor alternativa alinhada.

## 9. Pendências conhecidas

- **Doc-sweep parcial intencional:** mantidos com `apps/api/` / `apps/web/` por descreverem perspectiva de projeto cliente:
  - `docs/08-PACOTES-PLUGAVEIS.md` × 4 comments (`// apps/api/...` e `// apps/web/...`) sob "Padrão de uso em projeto cliente"
  - `docs/11-ROADMAP-CONSTRUCAO.md` L247-248 (bullets descrevendo conteúdo INTERNO de `templates/starter/`)
- **`docs/10-DEPLOY-RAILWAY.md` intacto** — Railway deploya o starter clonado, onde `apps/api/` é root relativo do projeto cliente.
- **PR de teste do CI no GitHub** (baixa prioridade) — workflow `.github/workflows/ci.yml` foi validado localmente como YAML válido, mas o execution-real só vira evidência num PR efetivo. Disparar quando primeira branch de feature subir.
- **Concerns abertos do prompt #3** (resolver durante #4):
  - `tsconfig.base.json` raiz órfão após inline no `@ethos/config/tsconfig/base.json` (manter/remover)
  - `incremental: false` overridado em `packages/ui/tsconfig.json` (mover pro preset base)
  - `<Button asChild loading>` quebra Radix Slot single-child (refatorar quando callsite real exigir)
  - `dist/index.d.mts` em vez de `.d.ts` — aceitável (D10), mas se virar requisito de publicação, ajustar `format` no tsup
  - Atualizar `docs/12-PROMPTS-CLAUDE-CODE.md §3` com bloco `[NOTAS TÉCNICAS — atualizadas em 2026-04-28]` capturando os aprendizados de Storybook 8 builder Vite, Tailwind preset CJS path, CSS vars syntax — commit `docs(forge):` separado pós-CLOSE seguindo padrão do prompt #2

## 10. Memória local do Claude Code (auto-memory)

Pasta de memória pessoal:
`C:\Users\Dell Latitude\.claude\projects\C--Users-Dell-Latitude-Projeto-Ethos-Ethos-Forge\memory\`

Entries existentes:

- `project_packages_taxonomy.md` — distinção entre 7 packages de infraestrutura (sempre presentes) vs 8 plugáveis (sob demanda)

## 11. Comandos úteis pra resume

```bash
# Verificar onde paramos
git log --oneline -5
git status --short

# Validações rápidas
pnpm install
pnpm typecheck
pnpm turbo run build --dry=json
docker compose config

# Iniciar próximo passo
# 1. Ler docs/12-PROMPTS-CLAUDE-CODE.md seção #2
# 2. Ler docs/03-ESTRUTURA-MONOREPO.md (seção sobre tooling) e docs/01-STACK-DECISOES.md
# 3. Apresentar plano em ≤8 bullets
# 4. Aguardar aprovação
# 5. Executar em fases + validar + commit em Conventional Commits
```

## 12. Como uma nova sessão deve começar

```
Você é Claude Code retomando o projeto Ethos Forge.

1. Leia .claude/commands/notes.md (este arquivo) — é o estado consolidado.
2. Leia CLAUDE.md na raiz pra protocolo operacional.
3. Confirme estado: `git log --oneline -5` deve mostrar os 4 commits citados na seção 4.
4. Próximo passo: prompt #2 (tooling) em docs/12-PROMPTS-CLAUDE-CODE.md.
5. Siga o protocolo da seção 8: leia docs referenciados → plano em bullets → aguarde OK → execute → reporte.
```

## 13. Mustard — infra operacional

Este projeto usa mustard (https://github.com/rubensrpj/mustard) como skill operacional padrão. Os 17 slash commands estão versionados em `.claude/commands/mustard/`. Qualquer sessão Claude Code rodando neste repo tem acesso automático a:

- `/mustard:scan` — inventário do projeto
- `/mustard:resume` — retomar de onde parou
- `/mustard:feature` — criar feature spec
- `/mustard:bugfix` — fluxo de bugfix
- `/mustard:knowledge` — gerenciar knowledge base
- `/mustard:review`, `/mustard:qa`, `/mustard:status`, `/mustard:metrics`
- (e outros — total de 17 commands)

Use estes commands ao invés de improvisar fluxos de trabalho.
