# Primeiros passos

Walkthrough detalhado para o dev que abre o starter da Ethos Forge pela primeira vez. Cobre sanity check do ambiente, o que vem pronto, primeira execução guiada e onde olhar quando algo falha.

> Tempo estimado da leitura ao "sistema rodando local com login funcional": **20-30 min**.

---

## 1. Sanity check do ambiente

Antes de tudo, valide o stack base. Rode na raiz do Forge:

```bash
node -v     # esperado: v20.x.y (NÃO v24 — ver Troubleshooting do README)
pnpm -v     # esperado: 9.x.y
docker -v   # esperado: 24.x ou mais novo
docker compose version  # plugin v2.x
git --version
```

Checklist:

- [ ] Node 20.x (se tiver 22+, use `nvm install 20 && nvm use 20`).
- [ ] pnpm 9.x (`npm i -g pnpm@9` se não tiver).
- [ ] Docker daemon rodando (no Windows: Docker Desktop aberto; no Linux: `systemctl status docker`).
- [ ] **Porta 5432 livre** — `lsof -i :5432` no macOS/Linux, `netstat -ano | findstr :5432` no Windows. Postgres local antigo costuma roubar essa porta.
- [ ] **Porta 6379 livre** (Redis).
- [ ] **Portas 3000 e 3001 livres** (web e api).

Se alguma porta estiver ocupada, ou você mata o processo, ou remapeia no `docker-compose.yml` + ajusta `.env`.

---

## 2. O que vem pronto vs o que o dev configura

### Vem pronto (não precisa mexer)

- Monorepo Turborepo + pnpm workspaces estruturado.
- `@ethos/ui` — biblioteca de componentes proprietária (Button, Card, Input, DashboardLayout, etc.).
- `@ethos/auth` — argon2id + JWT EdDSA (D13 hardening), refresh token rotation, helpers de cookie.
- `@ethos/database` — Prisma client + schema central + extension multi-tenant (AsyncLocalStorage).
- `@ethos/api-base` — Nest modules transversais (tenant interceptor, exception filter, audit).
- `apps/api` — Auth + Users + Tenants + **Products (CRUD demo)**.
- `apps/web` — login, registro, forgot-password, dashboard, **páginas de Products**.
- Geradores Forge configurados (`pnpm forge:gen:backend`, `pnpm forge:gen:frontend`).
- Sidebar com bloco AUTOGEN gerenciado pelo gen frontend.

### Você configura

- `.env` (copiado do `.env.example`).
- Chaves JWT EdDSA (geradas via script — uma vez por ambiente).
- Nome do projeto no `package.json` raiz e dos apps.
- Models específicos do domínio do cliente no `schema.prisma` central.
- Lógica de negócio nos `*.service.ts` (Modelo B — ver `CUSTOMIZACAO.md`).
- Branding (cores, logo) — schema-ready via `Tenant.brandColor` / `Tenant.logoUrl` (D15).

---

## 3. Primeira execução guiada

Siga o [Quick start do README](../README.md#quick-start) na ordem. Esta seção adiciona o **expected output** de cada passo, pra você confirmar que está no caminho certo.

### Passo 2 — `pnpm install`

Esperado:

```
Scope: all 12 workspace projects
...
Done in 45s
```

Se ver `ERR_PNPM_PEER_DEP_ISSUES`, é warning — siga em frente. Se ver erro de `EACCESS` ou `ECONNREFUSED`, problema de rede/permissão.

### Passo 3 — `docker compose up -d`

Esperado:

```
[+] Running 2/2
 ✔ Container ethos-postgres  Started
 ✔ Container ethos-redis     Started
```

Confirme com `docker compose ps`. Status deve ser `healthy` (Postgres demora ~5s pro healthcheck passar).

### Passo 5 — `pnpm --filter @ethos/auth generate-keys`

Esperado: dois blocos PEM impressos no terminal:

```
JWT_KID_CURRENT=2026-MM-DD
JWT_PRIVATE_KEY_CURRENT="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
JWT_PUBLIC_KEY_CURRENT="-----BEGIN PUBLIC KEY-----\n...\n-----END PUBLIC KEY-----\n"
```

Cole **as 3 linhas** no `.env` (substituindo os placeholders).

### Passo 6 — `pnpm --filter @ethos/database db:migrate`

Esperado:

```
Applying migration `2026XXXX_init`
The following migration(s) have been applied:
✔ Generated Prisma Client
```

Se ver `Error: P1001: Can't reach database server`, Postgres não subiu — volte ao passo 3.

### Passo 7 — `pnpm --filter @ethos/database db:seed`

**Pré-requisito:** definir `SEED_ADMIN_PASSWORD` (≥ 12 chars) antes — o seed lança `Error: SEED_ADMIN_PASSWORD env não definida` sem ela.

```bash
export SEED_ADMIN_PASSWORD='troca-isto-em-prod'
pnpm --filter @ethos/database db:seed
```

Esperado (formato real do `packages/database/prisma/seed.ts`):

```
Seed: tenant 'default' (id=...) + owner admin@ethos.local (userId=...) criados.
```

### Passo 8 — `pnpm --filter @ethos-app/api dev`

Esperado:

```
[Nest] Starting Nest application...
[Nest] AuthModule dependencies initialized
[Nest] ProductsModule dependencies initialized
[Nest] Nest application successfully started
🚀 API ouvindo em http://localhost:3001
📖 Docs em http://localhost:3001/api-docs
```

### Passo 8 — `pnpm --filter @ethos-app/web dev`

Esperado:

```
▲ Next.js 14.x.x
- Local:  http://localhost:3000
✓ Ready in 2.1s
```

---

## 4. Verificações de sanidade

Depois que ambos subiram:

```bash
# 1. Healthcheck da API
curl http://localhost:3001/health
# Esperado: {"status":"ok","timestamp":"..."}

# 2. Swagger docs
# Abrir http://localhost:3001/api-docs no browser — Swagger UI listando todos os endpoints.

# 3. Login no browser
# Abrir http://localhost:3000 → tela de login → credenciais do seed → redireciona pro dashboard.

# 4. Listar Products via API (com token)
# Login pelo Swagger UI (botão Authorize) + tentar GET /products.
```

Se algum passo falhar, primeiro suspeito é `.env` mal configurado.

---

## 5. Onde olhar quando algo der errado

| Sintoma                                        | Local                                                                                                |
| ---------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| API não sobe (`ERR_REQUIRE_ESM`)               | Você está em Node 24 — ver Troubleshooting do README.                                                |
| API retorna 500 em rotas autenticadas          | Chaves JWT não coladas no `.env` ou PEM mal formatado (faltando `\n` no fim).                        |
| Web retorna 401 ao logar                       | Cookie domain errado (deixe `COOKIE_DOMAIN` vazio em dev).                                           |
| `Cannot find module '@ethos/*'`                | Faltou `pnpm install` ou está rodando comando na pasta errada.                                       |
| Prisma `Schema not found`                      | Sempre rode `db:*` via `pnpm --filter @ethos/database db:<cmd>`. Schema central, não em `apps/api/`. |
| Sidebar não atualiza após `forge:gen:frontend` | Reinicie `next dev` — Next cacheia o bundle de `config/sidebar.tsx`.                                 |
| Imports desordenados após gen                  | Rode `pnpm --filter @ethos-app/web lint --fix` (#11.8 follow-up).                                    |
| Postgres não conecta                           | `docker compose ps` — container deve estar `healthy`. Se não, `docker compose logs postgres`.        |
| Porta 3000/3001/5432 ocupada                   | Mate o processo (`lsof -i :3000` + `kill <pid>`) ou remapeie em `docker-compose.yml` + `.env`.       |

Logs úteis:

- **API:** stdout do `pnpm --filter @ethos-app/api dev`. Errors detalhados em dev (sem sanitização).
- **Web:** browser DevTools console + Network tab pra ver respostas da API.
- **Postgres:** `docker compose logs -f postgres`.
- **Banco interativo:** `pnpm --filter @ethos/database db:studio` abre Prisma Studio em <http://localhost:5555>.

---

## 6. Próximos passos

Quando o starter estiver rodando com login funcional:

1. Leia [`ADICIONANDO-MODELS.md`](./ADICIONANDO-MODELS.md) e adicione **uma entidade fictícia** (ex: `Note { id, tenantId, title, content }`) só pra ver o pipeline gen end-to-end.
2. Leia [`CUSTOMIZACAO.md`](./CUSTOMIZACAO.md) e tente customizar a regra de criação de Product (ex: rejeitar `price <= 0`).
3. Familiarize-se com o schema central em `packages/database/prisma/schema.prisma` — todas as entidades do produto vivem ali.
4. Quando estiver confortável, comece a modelar o domínio real do cliente.

Boa Forge.
