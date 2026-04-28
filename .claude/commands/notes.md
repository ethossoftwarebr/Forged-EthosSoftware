<!-- Notas do projeto — NÃO marcar com mustard:generated, esse arquivo é manual e persistente. -->

# Notas do projeto — Ethos Forge

> Resume artifact pra novas sessões do Claude Code. Lido automaticamente pelo agent durante pipelines; serve de baseline pra qualquer dev/sessão que pegar o projeto.
>
> **Atualizado:** 2026-04-28
> **Estado:** prompt #1 (setup do monorepo) concluído + doc-sweep aplicado. Próximo: prompt #2 (tooling).

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

## 4. Progresso (4 commits no main, locais)

```
7081495  docs(forge): doc-sweep — alinha caminhos com estrutura kit-vs-template
1dc7e98  chore(monorepo): inicializa estrutura Turborepo + pnpm + 15 packages + docker-compose
7810d51  docs(monorepo): alinha CLAUDE.md, doc-03 e prompts com decisões de estrutura
ca8a429  docs: documentação inicial do Forge
```

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
- ⏸️ **Working tree limpo, mas sem `git push`** — todos os 4 commits são locais

## 6. Próximo passo: prompt #2 (Configuração de tooling)

Escopo do prompt #2 conforme `docs/12-PROMPTS-CLAUDE-CODE.md`:

- ESLint base em `@ethos/config/eslint-base.js` + presets `eslint-nextjs.js` e `eslint-node.js`
- Prettier raiz (`semi: true`, `singleQuote: true`, `trailingComma: 'all'`, `printWidth: 100`) + `prettier-plugin-tailwindcss`
- Husky + lint-staged (pre-commit: ESLint --fix + Prettier --write)
- commitlint (Conventional Commits no commit-msg hook)
- `.github/workflows/ci.yml` (jobs: install, lint, typecheck, test, build; cache pnpm + turbo; roda em PR e push pra main)
- Scripts úteis no `package.json` raiz já presentes; só adicionar `format` se faltar

**Bônus aprovado anteriormente (incluir no escopo):** `.gitattributes` com `* text=auto eol=lf` pra resolver CRLF warnings do Windows.

**Critério de aceite:** `pnpm lint` roda sem erro num repo vazio; commit com mensagem inválida bloqueado; pre-commit formata staged; CI passa em PR.

## 7. Pipeline planejado (#3 a #23)

| #     | Prompt                                                                                | Status         |
| ----- | ------------------------------------------------------------------------------------- | -------------- |
| 1     | Setup do monorepo                                                                     | ✅ Concluído   |
| 2     | Configuração de tooling                                                               | ⏭️ **Próximo** |
| 3     | @ethos/ui — Fundação (Button, Input, Card + tokens)                                   | Pendente       |
| 4     | @ethos/ui — Primitivos (~30 componentes Radix-based)                                  | Pendente       |
| 5     | @ethos/ui — Compostos (DataTablePro, FormBuilder, KpiCard, etc.)                      | Pendente       |
| 6     | @ethos/ui — Layouts (Dashboard, Auth, Settings)                                       | Pendente       |
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

- **`git push` ainda não feito** — todos os 4 commits são locais.
- **Doc-sweep parcial intencional:** mantidos com `apps/api/` / `apps/web/` por descreverem perspectiva de projeto cliente:
  - `docs/08-PACOTES-PLUGAVEIS.md` × 4 comments (`// apps/api/...` e `// apps/web/...`) sob "Padrão de uso em projeto cliente"
  - `docs/11-ROADMAP-CONSTRUCAO.md` L247-248 (bullets descrevendo conteúdo INTERNO de `templates/starter/`)
- **`docs/10-DEPLOY-RAILWAY.md` intacto** — Railway deploya o starter clonado, onde `apps/api/` é root relativo do projeto cliente.
- **CRLF warnings no Windows** — pra resolver no prompt #2 via `.gitattributes`.

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
