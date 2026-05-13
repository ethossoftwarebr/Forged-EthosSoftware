# {{PROJECT_NAME}} — Ethos Starter

> Sistema gerado a partir do template starter da Ethos Forge.

Este diretório (`templates/starter/`) é o ponto de partida de todo projeto cliente da Ethos. Ele já vem com **auth multi-tenant (argon2id + JWT EdDSA)**, **dashboard**, **CRUD de exemplo (Products)** e os geradores Forge configurados.

> **Modelo v1 do starter:** subset interno do Forge. Os deps `@ethos/*` (UI, auth, database, api-base, etc.) resolvem via `workspace:^` no monorepo pai. O **quick start é rodado a partir da raiz do Forge**, não do `templates/starter/` isoladamente. Standalone graduation (clone independente fora do monorepo) é v2.

---

## Pré-requisitos

- **Node.js >= 20** (Node 24 tem issue ESM com workspace deps — ver [Troubleshooting](#troubleshooting))
- **pnpm >= 9** (`npm i -g pnpm@9`)
- **Docker** (Postgres 16 + Redis 7 via `docker compose`)
- Git

---

## Quick start

Do clone até `pnpm dev` em **menos de 30 minutos**. Todos os comandos rodam **a partir da raiz do Forge** (`Ethos-Forge/`), não de dentro de `templates/starter/`.

### 1. Clone o repo Forge

```bash
git clone git@github.com:ethos/ethos-forge.git meu-projeto
cd meu-projeto
```

> Em v2 vai existir um wizard `create-ethos-app` que renomeia automaticamente. Em v1, edite manualmente `package.json` (raiz e `apps/*`) e renomeie o diretório.

### 2. Instale deps

```bash
pnpm install
```

Isto resolve todos os `@ethos/*` via workspace e prepara o monorepo.

### 3. Suba Postgres + Redis

```bash
docker compose up -d
```

Espera ~5s pra healthcheck do Postgres passar. Verifique com `docker compose ps`.

### 4. Configure variáveis de ambiente

```bash
cp templates/starter/.env.example templates/starter/.env
```

> O `.env` é gitignored. **Nunca comite credenciais.**

### 5. Gere as chaves JWT EdDSA

```bash
pnpm --filter @ethos/auth generate-keys
```

Cole os blocos PEM impressos (já com `\n` escapado) em `JWT_PRIVATE_KEY_CURRENT` e `JWT_PUBLIC_KEY_CURRENT` no `.env`. **Nunca use `JWT_SECRET` legado** — D13 do roadmap proíbe HS\*.

### 6. Aplique migrations

```bash
pnpm --filter @ethos/database db:migrate
```

O schema é **central** em `packages/database/prisma/schema.prisma` (decisão D9), não em `apps/api/`.

### 7. Seed inicial

Antes de rodar o seed, defina a senha do admin demo (mínimo 12 chars, sem default público por segurança):

```bash
export SEED_ADMIN_PASSWORD='troca-isto-em-prod'
pnpm --filter @ethos/database db:seed
```

Cria 1 tenant `default` + 1 user owner `admin@ethos.local` com a senha definida acima.

### 8. Suba dev (2 terminais)

Terminal 1 — API (NestJS, porta 3001):

```bash
pnpm --filter @ethos-app/api dev
```

Terminal 2 — Web (Next.js, porta 3000):

```bash
pnpm --filter @ethos-app/web dev
```

### 9. Acesse e logue

Abra <http://localhost:3000> e logue com:

- **Email:** `admin@ethos.local`
- **Senha:** ver `packages/database/prisma/seed.ts` (env `SEED_ADMIN_PASSWORD` ou default)

Swagger da API: <http://localhost:3001/api-docs>.

---

## Adicionar novo model

Fluxo end-to-end de adicionar uma entidade `Customer`:

1. **Editar schema central** (`packages/database/prisma/schema.prisma`):

   ```prisma
   /// @forge.generate(controller, page)
   model Customer {
     id        String   @id @default(cuid())
     tenantId  String
     name      String
     email     String   @unique
     createdAt DateTime @default(now())
     updatedAt DateTime @updatedAt

     tenant    Tenant   @relation(fields: [tenantId], references: [id])

     @@index([tenantId])
   }
   ```

   A anotação `/// @forge.generate(controller, page)` sinaliza pros geradores Forge gerarem backend + frontend.

2. **Migrar o banco**:

   ```bash
   pnpm --filter @ethos/database db:migrate --name add_customer
   ```

3. **Gerar backend** (controller/module/service NestJS):

   ```bash
   pnpm forge:gen:backend
   ```

4. **Gerar frontend** (4 pages + sidebar entry):

   ```bash
   pnpm forge:gen:frontend
   ```

5. **Reiniciar** os dev servers.

Resultado: rotas REST `/api/customers` no backend + 4 páginas em `/customers`, `/customers/new`, `/customers/[id]`, `/customers/[id]/edit` no frontend, com entry automática na sidebar via bloco AUTOGEN.

Detalhes em [`docs/ADICIONANDO-MODELS.md`](./docs/ADICIONANDO-MODELS.md).

---

## Geradores

Dois CLIs proprietários da Forge — rodam em `tools/generators/` do repo pai e cospem código em `templates/starter/apps/`.

### `pnpm forge:gen:backend`

Lê o schema Prisma central e, pra cada model com `/// @forge.generate(controller, ...)`, emite:

- `templates/starter/apps/api/src/generated/dto/<entity>.dto.ts` — DTOs Zod + class-validator
- `templates/starter/apps/api/src/generated/crud/<entity>.repository.ts` — Base repo Prisma (regerado, NÃO editar)
- `templates/starter/apps/api/src/modules/<entity>/<entity>.controller.ts` — Controller NestJS
- `templates/starter/apps/api/src/modules/<entity>/<entity>.module.ts` — Module wiring
- `templates/starter/apps/api/src/modules/<entity>/<entity>.service.ts` — Service stub estendendo o base (**editável, NÃO regerado**)

### `pnpm forge:gen:frontend`

Lê o OpenAPI da API (via `@hey-api/openapi-ts`) e emite:

- `apps/web/src/lib/api/` — SDK tipado (regerado)
- 4 páginas Next.js por entidade (list / new / [id] / [id]/edit)
- Atualização do bloco `// FORGE-AUTOGEN:START` / `// FORGE-AUTOGEN:END` em `apps/web/src/config/sidebar.tsx`

### Regra de ouro (Modelo B — D3)

Regerar **NUNCA destrói customizações**. Convenção:

- Arquivos em `generated/` e blocos entre marcadores `FORGE-AUTOGEN:*` são sobrescritos a cada `forge:gen:*`.
- Arquivos `*.service.ts` em `modules/<entity>/` e código fora dos blocos AUTOGEN são preservados — o dev customiza ali livremente.

Ver [`docs/CUSTOMIZACAO.md`](./docs/CUSTOMIZACAO.md) pra o padrão completo.

---

## Deploy Railway

Resumo do fluxo:

1. Criar projeto Railway, plugar repo (auto-deploy do branch `main`).
2. Copiar `templates/starter/railway.json` (quando existir) pra raiz do produto, OU configurar 2 services manuais (api + web) apontando pros respectivos `Dockerfile`.
3. Configurar env vars do `templates/starter/.env.example` no Railway dashboard. Em produção, **use o secret manager** do Railway pras chaves JWT — não cole PEM em variáveis comuns.
4. Adicionar plugins Postgres 16 e Redis 7.
5. Push pra `main` → Railway builda e deploya.

Detalhes completos (build commands, healthchecks, custom domains, rotação de JWT em produção) em [`docs/10-DEPLOY-RAILWAY.md`](../../docs/10-DEPLOY-RAILWAY.md) do Forge.

---

## Troubleshooting

### Node 24 ESM com workspace deps (#11.7)

A API quebra ao subir com Node 24 com erro `ERR_REQUIRE_ESM` em deps de workspace (`@ethos/auth`, `@ethos/api-base`).

**Workaround v1:**

- Recomendado: usar **Node 20** (crie um `.nvmrc` com `20` na raiz do produto).
- Alternativa: subir a API via `ts-node` em modo transpile-only:

  ```bash
  pnpm --filter @ethos-app/api exec ts-node --transpile-only -r tsconfig-paths/register src/main.ts
  ```

Fix definitivo (publicar `@ethos/*` como dual ESM/CJS) está no follow-up #11.7.

### Imports fora de ordem após `forge:gen:frontend` (#11.8)

O ESLint `eslint-plugin-import` reclama dos imports gerados (ordering off).

**Workaround v1:**

```bash
pnpm forge:gen:frontend && pnpm --filter @ethos-app/web lint --fix
```

Fix definitivo (templates já cospem imports ordenados) é o follow-up #12.1.

### Schema central vive em `packages/database/`, não em `apps/api/`

A decisão D9 centraliza o schema Prisma em `packages/database/prisma/schema.prisma`. Comandos `db:*` rodam via filter no `@ethos/database`:

```bash
pnpm --filter @ethos/database db:migrate
pnpm --filter @ethos/database db:studio
pnpm --filter @ethos/database db:seed
```

Erros tipo "schema not found" geralmente significam que você rodou `prisma` na pasta errada.

### JWT EdDSA — nunca usar `JWT_SECRET` legado

Hardening D13 proíbe HS\* (HMAC). Algoritmo único: **EdDSA / Ed25519**. Gere keypair via:

```bash
pnpm --filter @ethos/auth generate-keys
```

Se você ver `JWT_SECRET=` em algum lugar, é bug — abra issue. Em produção, rotacione via `JWT_KID_PREVIOUS` + `JWT_PUBLIC_KEY_PREVIOUS` durante janela de transição (~30d = TTL do refresh token).

### Porta 5432 (Postgres) já em uso

Pare instâncias locais (`brew services stop postgresql` no macOS, Services.msc no Windows) ou edite `docker-compose.yml` pra mapear pra outra porta (ex: `5433:5432`) e ajuste `DATABASE_URL` no `.env`.

---

## Estrutura

```
templates/starter/
├── apps/
│   ├── api/                   # NestJS 10 — multi-tenant + auth + Products demo
│   │   ├── src/
│   │   │   ├── modules/       # auth, users, tenants, products (+ novos via gen)
│   │   │   ├── generated/     # DTO + crud base — REGERADO (não editar)
│   │   │   ├── common/        # pipes, filters, interceptors
│   │   │   └── config/        # env schema (zod-validated)
│   │   ├── .env.example
│   │   └── Dockerfile
│   └── web/                   # Next.js 14 App Router — dashboard + Products pages
│       ├── src/
│       │   ├── app/           # rotas (auth) + (dashboard)
│       │   ├── components/
│       │   ├── config/        # sidebar.tsx com bloco AUTOGEN
│       │   └── lib/api/       # SDK tipado — REGERADO
│       └── Dockerfile
├── docs/                      # docs do starter (este diretório)
│   ├── PRIMEIROS-PASSOS.md
│   ├── ADICIONANDO-MODELS.md
│   └── CUSTOMIZACAO.md
└── README.md                  # você está aqui
```

Schema Prisma central: `packages/database/prisma/schema.prisma`.
Estrutura completa do monorepo: [`docs/03-ESTRUTURA-MONOREPO.md`](../../docs/03-ESTRUTURA-MONOREPO.md).

---

## Próximos passos

- [`docs/PRIMEIROS-PASSOS.md`](./docs/PRIMEIROS-PASSOS.md) — walkthrough da primeira execução
- [`docs/ADICIONANDO-MODELS.md`](./docs/ADICIONANDO-MODELS.md) — fluxo completo de adicionar entidade
- [`docs/CUSTOMIZACAO.md`](./docs/CUSTOMIZACAO.md) — Modelo B + hooks + override de páginas
