# Ethos Forge

> Kit de partida proprietário da **Ethos Software**. Monorepo Turborepo + pnpm com biblioteca de UI proprietária, geradores de código (schema → CRUD), e pacotes plugáveis pra IA, WhatsApp, Google, n8n, payments e ERPs.

A Forge é IP da Ethos. Cliente recebe código do projeto dele (gerado a partir do `templates/starter/`), **não** recebe a Forge.

---

## Pré-requisitos

- **Node.js** 20+ (use `nvm use` na raiz)
- **pnpm** 9+
- **Docker** (pra Postgres + Redis local)

---

## Bootstrap

```bash
# 1. Clonar o repo
git clone <url> ethos-forge && cd ethos-forge

# 2. Instalar dependências (instala todos os 16 workspaces)
pnpm install

# 3. Subir infra local (Postgres 16 + Redis 7)
cp .env.example .env             # ajuste credenciais se necessário
docker compose up -d

# 4. Rodar a vitrine viva (apps/playground)
pnpm playground
```

---

## Estrutura

```
ethos-forge/
├── apps/playground/       # Next.js vitrine viva — usa todos os packages, NÃO deployado
├── packages/              # 7 infra + 8 plugáveis = 15 packages @ethos/*
├── tools/generators/      # Geradores Forge (não publicáveis)
├── templates/starter/     # Template clonável de novo projeto cliente
├── docs/                  # Documentação técnica detalhada
└── docker-compose.yml     # Postgres 16 + Redis 7 pra dev
```

Detalhes em [`docs/03-ESTRUTURA-MONOREPO.md`](./docs/03-ESTRUTURA-MONOREPO.md).

---

## Documentação

A doc é **fonte de verdade**. Antes de mexer no código, leia o `.md` relevante:

| Tópico | Doc |
|--------|-----|
| Filosofia + decisões | [`docs/00-FILOSOFIA.md`](./docs/00-FILOSOFIA.md), [`docs/01-STACK-DECISOES.md`](./docs/01-STACK-DECISOES.md) |
| Identidade visual | [`docs/02-IDENTIDADE-VISUAL.md`](./docs/02-IDENTIDADE-VISUAL.md) |
| Estrutura | [`docs/03-ESTRUTURA-MONOREPO.md`](./docs/03-ESTRUTURA-MONOREPO.md) |
| Biblioteca UI | [`docs/04-BIBLIOTECA-UI.md`](./docs/04-BIBLIOTECA-UI.md) |
| Geradores | [`docs/05-GERADORES-BACKEND.md`](./docs/05-GERADORES-BACKEND.md), [`docs/06-GERADORES-FRONTEND.md`](./docs/06-GERADORES-FRONTEND.md) |
| Auth + multi-tenant | [`docs/07-AUTH-MULTI-TENANT.md`](./docs/07-AUTH-MULTI-TENANT.md) |
| Pacotes plugáveis | [`docs/08-PACOTES-PLUGAVEIS.md`](./docs/08-PACOTES-PLUGAVEIS.md) |
| Template starter | [`docs/09-TEMPLATE-STARTER.md`](./docs/09-TEMPLATE-STARTER.md) |
| Deploy | [`docs/10-DEPLOY-RAILWAY.md`](./docs/10-DEPLOY-RAILWAY.md) |
| Roadmap | [`docs/11-ROADMAP-CONSTRUCAO.md`](./docs/11-ROADMAP-CONSTRUCAO.md) |
| Prompts Claude Code | [`docs/12-PROMPTS-CLAUDE-CODE.md`](./docs/12-PROMPTS-CLAUDE-CODE.md) |

---

## Scripts

```bash
pnpm dev                            # Tudo em paralelo via Turbo
pnpm playground                     # Só apps/playground
pnpm --filter @ethos/ui dev         # Só um package
pnpm build                          # Build everywhere
pnpm lint                           # Lint everywhere
pnpm typecheck                      # tsc --noEmit everywhere
pnpm test                           # Testes
pnpm format                         # Prettier write
```

Geradores (configurados nos prompts #9 e #11):

```bash
pnpm forge:gen:backend              # schema.prisma → CRUD NestJS
pnpm forge:gen:frontend             # OpenAPI → páginas Next.js
```

---

## Versão

**v1.0.0** — em construção. Estado atual em [`docs/11-ROADMAP-CONSTRUCAO.md`](./docs/11-ROADMAP-CONSTRUCAO.md).
