<!-- Notas do projeto — NÃO marcar com mustard:generated, esse arquivo é manual e persistente. -->

# Notas do projeto — Ethos Forge

> Resume artifact pra novas sessões do Claude Code. Lido automaticamente pelo agent durante pipelines; serve de baseline pra qualquer dev/sessão que pegar o projeto.
>
> **Atualizado:** 2026-04-30
> **Estado:** prompts #1 (setup), #2 (tooling), #3 (`@ethos/ui` fundação), #4 (`@ethos/ui` primitivos — 32) e **#5 (`@ethos/ui` compostos — 10 entregues em 5 waves)** concluídos e pushados. Próximo: prompt #6 (`@ethos/ui` Layouts — Dashboard, Auth, Settings).

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
- ✅ **`@ethos/ui` compostos concluídos (prompt #5)** — 5 waves em 5 commits
  - **10 compostos** em pastas `src/components/<NomeComposto>/index.tsx` (D1 — primitivos do #4 continuam flat): StatusBadge, UserAvatar, SectionHeader, PageHeader, EmptyState, KpiCard, ConfirmDialog, FormBuilder, DataTablePro, FiltersPanel
  - **6 deps runtime** single-pass (D3): `@tanstack/react-table^8`, `@tanstack/react-virtual^3`, `react-hook-form^7`, `@hookform/resolvers^5`, `zod^4`, `recharts^3`
  - **52 stories** totais no Storybook (≥5 por composto, D13 — explícito no prompt #5)
  - Padrões novos introduzidos: KpiCard com cva accent border absoluto + Sparkline recharts; ConfirmDialog Provider+useConfirm hook (Promise-based, useRef pra evitar stale closure); FormBuilder discriminated union 12 tipos D4 com `register` (Input/Textarea) ou `Controller` (Select/Checkbox/Switch/Date/custom); DataTablePro TanStack Table v8 + react-virtual auto-threshold=100 (D10), exportCsv puro RFC 4180; FiltersPanel modes sheet|inline (D8) com Sheet primitivo
  - Decisões locked: D5 ConfirmDialog 4 variants (default/destructive/warning/info), D6 KpiCard sparkline opcional, D7 EmptyState 1 componente com 3 variants, D9 DataTablePro segue API do doc 04, D11 SearchBar/StatGrid/Timeline/CommandPalette/ChartCard NÃO implementados (D11), D14 5 commits + auto-push, D15 compostos REUSAM primitivos (zero redeclaração de styling)
  - Build final: `dist/index.mjs` 117 KB (era 65 KB pós-#4) + `dist/index.d.mts` 46 KB
  - **8/8 ACs PASS** — qa.result event registrado no harness (overall=pass)
  - Concerns abertos pra resolver em prompt futuro: (a) PageHeader exporta `BreadcrumbItem` como alias `PageHeaderBreadcrumbItem` por colisão com primitivo Breadcrumb; (b) `FilterOption` colide entre DataTablePro/types.ts (canônico) e FiltersPanel/types.ts — re-exportado como `FiltersPanelOption`; (c) FormBuilder usa `zodResolver(schema as never) as Resolver<T>` pra unificar Zod v3/v4 input shapes (z.coerce input=unknown vs Resolver expects FieldValues)
- ✅ Branch `main` em sync com `origin/main` (auto-push ativo após cada commit — D18)

## 6. Próximo passo: prompt #6 (`@ethos/ui` — Layouts)

Escopo conforme `docs/12-PROMPTS-CLAUDE-CODE.md` §6. Vai construir layouts consumindo primitivos do #4 + compostos do #5:

- **DashboardLayout** — sidebar (collapsible) + topbar (UserAvatar do #5 + notificações) + main area; consome PageHeader/SectionHeader
- **AuthLayout** — split com hero esquerda + form direita; envolve FormBuilder do #5
- **SettingsLayout** — sidebar de seções + main area com SectionHeader
- Outros conforme prompt #6

**Estado de partida prompt #6:**

- 32 primitivos + 10 compostos navegáveis no Storybook em :6006 (104 + 52 = ~156 stories)
- Build/typecheck/lint/build-storybook verde monorepo-wide (`@ethos/ui` 117KB ESM + 46KB d.mts)
- Padrão consolidado: primitivos flat (`src/components/<Primitivo>.tsx`), compostos em pastas (`src/components/<Composto>/index.tsx`) com sub-arquivos opcionais
- Reuse-first established: compostos REUSAM primitivos sem redeclarar styling/variants — Layouts devem fazer o mesmo (consumir PageHeader/SectionHeader/UserAvatar/etc.)

**Concerns abertos do #5 (próximo deve resolver ou re-deferir):**

- (a) `BreadcrumbItem` colide entre primitivo Breadcrumb e composto PageHeader — alias `PageHeaderBreadcrumbItem` no barrel
- (b) `FilterOption` colide entre DataTablePro/types.ts (canônico) e FiltersPanel/types.ts — alias `FiltersPanelOption`
- (c) FormBuilder usa `zodResolver(schema as never) as Resolver<T>` — solução pragmática pra unificar Zod v3/v4 input shapes
- (d) `SearchBar`, `StatGrid`, `Timeline`, `CommandPalette`, `ChartCard` (D11) NÃO foram implementados — divergence vs doc 04, deferido pra prompt #5.5 ou pós-Layouts
- (e) FormBuilder superset do doc 04 (`currency`, `cpf`, `cnpj`, `cep`, etc. — D4) é follow-up Brasil-specific
- (f) Validação humana de a11y dos compostos pendente em http://localhost:6006

**Concerns abertos (próximo deve resolver ou re-deferir):**

- **Divergence doc 04 vs prompt #4:** componentes do doc 04 NÃO implementados no #4 — `HoverCard`, `Drawer` standalone, `Calendar` standalone, `Menubar`, `NavigationMenu`, `AlertDialog`. Decisão D11 deferiu pra resolver em doc-update follow-up. Recomendação: atualizar `docs/04-BIBLIOTECA-UI.md` durante prep do #5 para refletir realidade.
- **Concerns do prompt #3 ainda abertos** (deferidos no #4 via D17): `tsconfig.base.json` órfão, `incremental: false` override, `<Button asChild loading>` Slot break, `.d.mts` em vez de `.d.ts`. Resolver quando `apps/playground` ou `templates/starter/apps/web` consumir `@ethos/ui` — aí ficará claro se algum bloqueia consumer real.
- **AC#10 a11y manual** do prompt #4 — validação humana em http://localhost:6006 ainda pendente. Tab navigation, Esc fecha overlays, Enter/Space ativam triggers, setas em Select/DropdownMenu. Reportar issues como follow-ups isolados.

**Princípios reaproveitados (não-negociáveis):**

- Não copiar shadcn cru — inspiração estrutural (Radix + slot + cn), estética/tokens proprietários
- Sem CSS-in-JS (só Tailwind), sem libs UI prontas
- Mobile-first com viewports do Storybook
- TypeScript strict; `forwardRef` + `displayName` em todos os componentes
- Compostos REUSAM primitivos — nunca redeclaram styling/variants (importam de `./<Primitivo>`)

## 7. Pipeline planejado (#3 a #23)

| #     | Prompt                                                                                | Status         |
| ----- | ------------------------------------------------------------------------------------- | -------------- |
| 1     | Setup do monorepo                                                                     | ✅ Concluído   |
| 2     | Configuração de tooling                                                               | ✅ Concluído   |
| 3     | @ethos/ui — Fundação (Button, Input, Card + tokens)                                   | ✅ Concluído   |
| 4     | @ethos/ui — Primitivos (32 componentes Radix-based)                                   | ✅ Concluído   |
| 5     | @ethos/ui — Compostos (10: DataTablePro, FormBuilder, KpiCard, etc.)                  | ✅ Concluído   |
| 6     | @ethos/ui — Layouts (Dashboard, Auth, Settings)                                       | ⏭️ **Próximo** |
| 7     | Setup do app API (NestJS em `templates/starter/apps/api/`)                            | Pendente       |
| 8     | Auth + Multi-tenant                                                                   | Pendente       |
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
