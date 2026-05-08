# 03 — Estrutura do Monorepo

> Esse arquivo define como o repositório da Forge é organizado: pastas, packages, apps, configurações compartilhadas. A estrutura é decidida uma vez e mantida estável — refatorar monorepo em produção é caro.

---

## Visão geral

A Forge é um monorepo `Turborepo + pnpm workspaces` com três tipos de pasta:

- **`apps/`** — aplicações deployáveis (geralmente o `playground` pra testar a Forge)
- **`packages/`** — bibliotecas internas, importáveis por outras packages e apps
- **`templates/`** — repositórios template clonáveis pra novos projetos

```
ethos-forge/
├── apps/
│   └── playground/                # App Next.js que usa todos os packages
├── packages/                      # v1 inicial: 7 infra + 8 plugáveis = 15 packages
│                                  # alvo final: 16 infra + 23 plugáveis = 39 packages (ver doc 13)
│   # ─── Infra v1 (7) — sempre presentes ───
│   ├── ui/                        # @ethos/ui — componentes proprietários
│   ├── auth/                      # @ethos/auth — auth multi-tenant
│   ├── database/                  # @ethos/database — Prisma client wrapper + tipos do schema
│   ├── api-base/                  # @ethos/api-base — módulos NestJS reutilizáveis
│   ├── config/                    # @ethos/config — tsconfig, eslint, tailwind preset
│   ├── types/                     # @ethos/types — types compartilhados
│   ├── utils/                     # @ethos/utils — funções utilitárias
│   # ─── Infra adicional pós-v1 (9) — ver docs/13-MANUTENCAO-EVOLUCAO.md §6 ───
│   ├── storage/                   # @ethos/storage — S3/R2/MinIO + signed URLs (v1.1)
│   ├── email/                     # @ethos/email — Resend/SendGrid wrapper (v1.1)
│   ├── notifications/             # @ethos/notifications — sino + push + email unificados (v1.1)
│   ├── queue/                     # @ethos/queue — BullMQ standalone (extraído de api-base, v1.1)
│   ├── cache/                     # @ethos/cache — Redis wrapper + invalidação por tags (v1.2)
│   ├── i18n/                      # @ethos/i18n — pt-BR + en + es (v1.2)
│   ├── pdf/                       # @ethos/pdf — geração de relatórios e contratos (v1.3)
│   ├── search/                    # @ethos/search — Postgres FTS ou Meilisearch (v1.3)
│   ├── observability/             # @ethos/observability — Sentry + healthchecks + métricas (v1.4)
│   # ─── Plugáveis v1 (8) — opt-in por projeto ───
│   ├── ai-chat/                   # @ethos/ai-chat
│   ├── ai-rag/                    # @ethos/ai-rag
│   ├── ocr/                       # @ethos/ocr
│   ├── whatsapp/                  # @ethos/whatsapp
│   ├── google/                    # @ethos/google
│   ├── n8n/                       # @ethos/n8n
│   ├── payments/                  # @ethos/payments
│   ├── erp-bridge/                # @ethos/erp-bridge
│   # ─── Plugáveis adicionais (15) — pós-v1, demand-driven (regra dos 3 projetos) ───
│   #     Ver docs/08-PACOTES-PLUGAVEIS.md §9-§23 e docs/13-MANUTENCAO-EVOLUCAO.md §7:
│   #     whisper, maps, sms, signature, nfse, marketplaces, social, email-marketing,
│   #     scheduling, iot-telemetry, crm-bridge, contabilidade, pix-direto, loyalty, reviews
├── tools/
│   └── generators/                # Geradores Forge (Handlebars + scripts) — não publicáveis, fora do workspace pnpm
├── templates/
│   └── starter/                   # Template clonável de novo projeto cliente
│       └── apps/
│           ├── api/               # NestJS deployável (preenchido nos prompts #7-#9)
│           └── web/               # Next.js deployável (preenchido nos prompts #10-#11)
├── docs/                          # Documentação técnica (esses .md)
├── .github/
│   └── workflows/
│       └── ci.yml
├── docker-compose.yml             # Postgres + Redis pra desenvolvimento
├── turbo.json                     # Configuração do Turborepo
├── pnpm-workspace.yaml            # Workspaces pnpm
├── package.json                   # Raiz
├── tsconfig.base.json             # tsconfig herdado por todos
├── .gitignore
├── .nvmrc                         # Versão Node.js fixada
└── README.md
```

---

## Cada pasta em detalhe

### `apps/playground/`

App Next.js 14 que importa todos os packages e exibe componentes/funcionalidades. Não é deployado pra produção — é o ambiente onde você testa enquanto constrói.

Por que ter playground:

- Permite testar componentes da `@ethos/ui` em contexto real (não só no Storybook isolado)
- Permite testar pacotes plugáveis (`@ethos/ai-chat`, `@ethos/whatsapp`) integrados
- Permite testar geradores rodando contra um schema Prisma real
- Vira "vitrine viva" da Forge

Estrutura interna:

```
apps/playground/
├── src/
│   ├── app/                       # App Router
│   │   ├── layout.tsx
│   │   ├── page.tsx               # Home com índice
│   │   ├── ui-showcase/           # Demos da @ethos/ui
│   │   ├── ai-demos/              # Demos dos pacotes de IA
│   │   ├── integrations/          # Demos de WhatsApp, Google, etc.
│   │   └── generators/            # Demo de geração ao vivo
│   ├── lib/
│   └── styles/
│       └── globals.css
├── package.json
├── tsconfig.json
├── tailwind.config.ts
└── next.config.js
```

### `packages/ui/`

A biblioteca de componentes proprietários. **A peça mais importante do monorepo.**

```
packages/ui/
├── src/
│   ├── primitives/                # shadcn customizado
│   │   ├── button/
│   │   │   ├── button.tsx
│   │   │   ├── button.stories.tsx
│   │   │   └── index.ts
│   │   ├── input/
│   │   ├── label/
│   │   ├── card/
│   │   ├── dialog/
│   │   ├── dropdown-menu/
│   │   ├── tooltip/
│   │   ├── popover/
│   │   ├── select/
│   │   ├── checkbox/
│   │   ├── radio/
│   │   ├── switch/
│   │   ├── tabs/
│   │   ├── sheet/
│   │   ├── badge/
│   │   ├── avatar/
│   │   ├── skeleton/
│   │   ├── toast/
│   │   ├── alert/
│   │   ├── progress/
│   │   ├── separator/
│   │   ├── scroll-area/
│   │   ├── command/               # Command palette base
│   │   └── index.ts
│   ├── compounds/                 # componentes proprietários
│   │   ├── data-table-pro/
│   │   ├── form-builder/
│   │   ├── kpi-card/
│   │   ├── empty-state/
│   │   ├── error-state/
│   │   ├── loading-state/
│   │   ├── confirm-dialog/
│   │   ├── filters-panel/
│   │   ├── search-bar/
│   │   ├── breadcrumb/
│   │   ├── page-header/
│   │   ├── stat-grid/
│   │   ├── timeline/
│   │   ├── command-palette/
│   │   └── index.ts
│   ├── layouts/
│   │   ├── dashboard-layout/      # Sidebar + Topbar + Conteúdo
│   │   ├── auth-layout/           # Centralizado, pra login/registro
│   │   ├── settings-layout/       # Sub-sidebar de settings
│   │   └── index.ts
│   ├── navigation/
│   │   ├── sidebar/
│   │   ├── topbar/
│   │   ├── user-menu/
│   │   ├── tenant-switcher/
│   │   └── index.ts
│   ├── lib/
│   │   ├── utils.ts               # cn(), formatters, etc
│   │   └── hooks/                 # useToast, useConfirm, etc
│   ├── styles/
│   │   ├── globals.css            # CSS variables, base styles
│   │   └── tailwind.preset.ts     # Preset compartilhado
│   └── index.ts                   # Barrel export
├── .storybook/                    # Configuração Storybook
├── package.json
└── tsconfig.json
```

### `packages/api-base/`

Módulos NestJS reutilizáveis. Tudo que todo backend gerado pela Forge precisa.

```
packages/api-base/
├── src/
│   ├── auth/                      # JWT, guards, strategies
│   ├── tenant/                    # Multi-tenancy (interceptor, decorator)
│   ├── audit/                     # Audit log middleware
│   ├── crypto/                    # Envelope encryption
│   ├── lgpd/                      # Endpoints de export, delete, consent
│   ├── pagination/                # Helpers de paginação
│   ├── filters/                   # Helpers de filtros tipados
│   ├── exceptions/                # Custom exceptions
│   ├── decorators/                # @CurrentUser, @CurrentTenant, etc
│   ├── interceptors/              # Logging, transform response, etc
│   └── index.ts
├── package.json
└── tsconfig.json
```

### `packages/auth/`

Pacote dedicado a autenticação multi-tenant. Funciona junto com `api-base/auth/` — `auth/` é o pacote standalone e re-exporta o módulo Nest.

Inclui:

- Hooks React (`useAuth`, `useUser`, `useTenant`)
- Componentes (`<LoginForm>`, `<RegisterForm>`, `<TenantSwitcher>`)
- Middleware Next.js pra rotas protegidas
- Helpers de hash (argon2id) e JWT

> Os **schemas Prisma** (User, Tenant, Session, RefreshToken) ficam em `@ethos/database` (fonte única do schema), não aqui. `@ethos/auth` consome os tipos derivados.

### `packages/database/`

Wrapper do Prisma client + schema central + tipos derivados. Fonte única de verdade do banco para todos os apps e packages.

```
packages/database/
├── prisma/
│   └── schema.prisma              # Schema central (Tenant, User, Session, etc.)
├── src/
│   ├── client.ts                  # PrismaClient instance + tenant filtering extension
│   ├── tenant-context.ts          # AsyncLocalStorage do tenantId
│   ├── types.ts                   # Re-exports dos tipos do @prisma/client
│   └── index.ts
├── package.json
└── tsconfig.json
```

Por que isolar do `api-base/`:

- `database/` é consumível tanto pelo backend NestJS quanto por scripts (seed, migrations CLI)
- Schema fica versionado em um único lugar — projetos cliente herdam via dependency
- Geradores backend (em `tools/generators/`) leem `prisma/schema.prisma` deste pacote

---

## Infra adicional (pós-v1)

Os 7 packages acima são a base mínima da Forge. Conforme projetos reais aparecem, **9 infras adicionais** entram no roadmap pós-v1.0 (regras de cadência em `docs/13-MANUTENCAO-EVOLUCAO.md` §6).

### `packages/storage/` (v1.1)

Abstração de storage de arquivos. Adapter pattern: S3, Cloudflare R2, MinIO self-hosted. API unificada `upload`, `download`, `delete`, `signedUrl`. Multi-tenant com prefixo de path por tenant.

**Por que cedo:** ~90% dos projetos cliente sobem fotos (perfis, produtos), documentos (NF, contratos), uploads.

### `packages/email/` (v1.1)

Envio de emails transacionais. Adapter pattern: Resend (default), SendGrid, AWS SES. Templates JSX-Email ou react-email. Hooks de tracking (delivered, opened, clicked) opcionais.

**Por que cedo:** auth manda email (welcome, recovery, invite). Sem email, auth quebra de cara.

### `packages/notifications/` (v1.1)

Sistema unificado: sino in-app no dashboard + Web Push + email + SMS — todos disparados por um único `notify()`. Persistência de notificações no Postgres, marcação read/unread, preferências por user (qual canal pra qual tipo).

**Depende de:** `@ethos/email` + (futuramente) `@ethos/sms`.

### `packages/queue/` (v1.1)

BullMQ wrapper standalone. Hoje a logic de queue vive embutida no `@ethos/api-base`. Quando ficar grande, extrai pra package próprio. Decorators `@Queue('jobName')`, `@OnFailure()`, retry com backoff exponencial, dashboard read-only.

**Migração:** `@ethos/api-base` v2 remove a queue interna e marca `@ethos/queue` como peer dep.

### `packages/cache/` (v1.2)

Wrapper de Redis com invalidação por tags. API: `cache.get(key)`, `cache.set(key, value, { tags })`, `cache.invalidateTag(tag)`. Decorator `@Cacheable('userProfile', { ttl: 60, tags: ['user:{userId}'] })` pra services NestJS.

### `packages/i18n/` (v1.2)

Internacionalização: pt-BR (default), en, es. Formatadores: `formatCurrency`, `formatDate`, `formatNumber` com locale. Tradução via `t('key')` no React (next-intl wrapper) e `i18n.t('key')` no backend (logs e responses traduzidos).

### `packages/pdf/` (v1.3)

Geração de PDF: relatórios, contratos, recibos, boletos. Engine: react-pdf (preferido — JSX) ou Puppeteer (fallback HTML→PDF). Templates pré-prontos pra documentos comuns Brasil (recibo, contrato simples, NF auxiliar).

### `packages/search/` (v1.3)

Full-text search em listagens. Adapter: Postgres FTS (default — sem infra extra) ou Meilisearch (volumes grandes). Indexação automática via Prisma extension. Highlight, fuzzy match, filtros facetados. Multi-tenant por filter `tenantId`.

### `packages/observability/` (v1.4)

Observabilidade unificada: Sentry (errors), healthchecks Kubernetes-style, métricas Prometheus, tracing OpenTelemetry. Module único `ObservabilityModule.forRoot({ sentryDsn, ... })` que ativa tudo. Pino já existe no api-base — observability complementa.

---

## Plugáveis (v1 + adicionais)

### `packages/ai-chat/`, `packages/ai-rag/`, etc.

Cada pacote plugável tem estrutura padrão:

```
packages/ai-chat/
├── src/
│   ├── backend/                   # NestJS module
│   │   ├── chat.module.ts
│   │   ├── chat.service.ts
│   │   ├── chat.controller.ts
│   │   └── tools/
│   ├── react/                     # React components/hooks
│   │   ├── chat-widget.tsx
│   │   ├── use-chat.ts
│   │   └── ...
│   ├── shared/                    # Types e schemas compartilhados
│   └── index.ts                   # Exporta backend e react
├── package.json
└── tsconfig.json
```

Detalhes de cada pacote em **`08-PACOTES-PLUGAVEIS.md`**.

### `packages/types/`

Types TypeScript compartilhados entre frontend e backend.

```
packages/types/
├── src/
│   ├── api/                       # Types da API (User, Tenant, etc)
│   ├── domain/                    # Types de domínio comum
│   ├── shared/                    # Helpers (Paginated, ApiResponse, etc)
│   └── index.ts
├── package.json
└── tsconfig.json
```

### `packages/utils/`

Funções utilitárias puras (sem dependência de framework).

```
packages/utils/
├── src/
│   ├── formatters/                # formatCurrency, formatDate, formatCpf, etc
│   ├── validators/                # validateCpf, validateCnpj, validateCep, etc
│   ├── strings/                   # slugify, truncate, capitalize, etc
│   ├── dates/                     # addDays, isToday, getMonthRange, etc
│   ├── numbers/                   # roundTo, percentChange, etc
│   ├── crypto/                    # generateId, hashString, etc
│   └── index.ts
├── package.json
└── tsconfig.json
```

### `packages/config/`

Configurações compartilhadas. Não exporta runtime — exporta presets de configuração.

```
packages/config/
├── tsconfig/
│   ├── base.json                  # tsconfig base
│   ├── nextjs.json                # extends base, configura pra Next
│   ├── nestjs.json                # extends base, configura pra Nest
│   └── library.json               # pra packages
├── eslint/
│   ├── base.cjs
│   ├── nextjs.cjs
│   └── nestjs.cjs
├── tailwind/
│   └── preset.ts                  # Preset Tailwind com tokens Ethos
├── prettier/
│   └── index.cjs
└── package.json
```

### `tools/generators/`

Templates Handlebars próprios da Forge — controllers NestJS e páginas Next.js. **Não publicáveis como package** (não são consumíveis em runtime — só rodam via CLI). Por isso ficam em `tools/`, fora do workspace pnpm.

```
tools/generators/
├── forge-controller/              # Gera controllers + modules NestJS
│   ├── templates/
│   │   ├── controller.hbs
│   │   ├── module.hbs
│   │   └── service.hbs
│   ├── helpers/                   # Handlebars helpers (camelCase, plural, etc)
│   └── index.js                   # CLI Node — roda via `pnpm forge:gen:backend`
└── forge-page/                    # Gera páginas Next.js
    ├── templates/
    │   ├── list-page.hbs
    │   ├── create-page.hbs
    │   ├── edit-page.hbs
    │   └── view-page.hbs
    ├── icon-map.ts                # Heurística Lucide por nome de model
    └── index.js                   # CLI Node — roda via `pnpm forge:gen:frontend`
```

Convenção: `tools/` é pra ferramentas internas não-publicáveis. `packages/` só pra código consumível como dependency. Se um gerador virar package versionável no futuro, migra pra `packages/`.

Detalhes em **`05-GERADORES-BACKEND.md`** e **`06-GERADORES-FRONTEND.md`**.

### `templates/starter/`

O repositório clonável que vira ponto de partida de todo projeto cliente.

Detalhes em **`09-TEMPLATE-STARTER.md`**.

```
templates/starter/
├── apps/
│   ├── api/                       # NestJS app
│   │   ├── src/
│   │   ├── prisma/
│   │   │   └── schema.prisma      # Schema inicial vazio
│   │   ├── package.json
│   │   └── ...
│   └── web/                       # Next.js app
│       ├── src/
│       ├── public/
│       ├── package.json
│       └── ...
├── packages/                      # Vazia ou com 1 package "shared"
├── docker-compose.yml
├── .env.example
├── README.md
├── turbo.json
└── package.json
```

---

## Configurações compartilhadas

### `tsconfig.base.json`

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022"],
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "verbatimModuleSyntax": false,
    "incremental": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  }
}
```

Cada package estende esse via `extends: "../../tsconfig.base.json"`.

### `pnpm-workspace.yaml`

```yaml
packages:
  - 'apps/*'
  - 'packages/*'
  - 'templates/*'
```

### `turbo.json`

> Schema Turbo 2.x: usa `"tasks"` (a chave era `"pipeline"` na 1.x — Turbo 2 quebra com a chave antiga).

```json
{
  "$schema": "https://turbo.build/schema.json",
  "globalDependencies": ["**/.env.*local"],
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".next/**", "!.next/cache/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {
      "outputs": []
    },
    "typecheck": {
      "dependsOn": ["^build"],
      "outputs": []
    },
    "test": {
      "dependsOn": ["^build"],
      "outputs": ["coverage/**"]
    },
    "clean": {
      "cache": false
    }
  }
}
```

### `package.json` (raiz)

```json
{
  "name": "ethos-forge",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "build": "turbo build",
    "dev": "turbo dev",
    "lint": "turbo lint",
    "typecheck": "turbo typecheck",
    "test": "turbo test",
    "clean": "turbo clean && rm -rf node_modules",
    "format": "prettier --write \"**/*.{ts,tsx,md,json}\"",
    "playground": "pnpm --filter @ethos/playground dev",
    "storybook": "pnpm --filter @ethos/ui storybook"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "prettier": "^3.0.0",
    "turbo": "^2.0.0",
    "typescript": "^5.4.0"
  },
  "packageManager": "pnpm@9.0.0",
  "engines": {
    "node": ">=20"
  }
}
```

### `docker-compose.yml`

Pra desenvolvimento local. Não é usado em produção (Railway gerencia tudo).

```yaml
version: '3.9'

services:
  postgres:
    image: postgres:16-alpine
    container_name: ethos-postgres
    environment:
      POSTGRES_USER: ethos
      POSTGRES_PASSWORD: ethos_dev_password
      POSTGRES_DB: ethos_dev
    ports:
      - '5432:5432'
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U ethos']
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    container_name: ethos-redis
    ports:
      - '6379:6379'
    volumes:
      - redis_data:/data
    healthcheck:
      test: ['CMD', 'redis-cli', 'ping']
      interval: 5s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:
  redis_data:
```

---

## Convenções de nomenclatura

### Packages

- Sempre prefixados com `@ethos/`
- Nome em kebab-case: `@ethos/ai-chat`, não `@ethos/aiChat`
- Singular quando possível: `@ethos/ui`, `@ethos/auth`

### Pastas

- kebab-case: `data-table-pro/`, não `DataTablePro/`
- Plurais pra coleções: `compounds/`, `primitives/`, `utils/`

### Arquivos

- TypeScript: kebab-case com `.ts` ou `.tsx`. `chat-service.ts`, `button.tsx`
- Componente React: PascalCase no nome do componente, kebab-case no arquivo. `Button` em `button.tsx`
- Stories: `[componente].stories.tsx`
- Testes: `[arquivo].test.ts` ou `[arquivo].spec.ts`

### Imports

- Sempre absolutos via aliases TS quando dentro do mesmo package
- Sempre via package name quando entre packages: `import { Button } from '@ethos/ui'`
- Nunca `import { Button } from '../../../../packages/ui/src/...'`

---

## Como adicionar um package novo

Quando precisar criar um package (ex: `@ethos/notifications`):

1. **Criar a pasta:** `mkdir packages/notifications`
2. **Estrutura mínima:**
   ```
   packages/notifications/
   ├── src/
   │   └── index.ts
   ├── package.json
   └── tsconfig.json
   ```
3. **`package.json`:**
   ```json
   {
     "name": "@ethos/notifications",
     "version": "0.1.0",
     "private": true,
     "main": "./dist/index.js",
     "types": "./dist/index.d.ts",
     "scripts": {
       "build": "tsc",
       "dev": "tsc --watch",
       "lint": "eslint src",
       "typecheck": "tsc --noEmit"
     },
     "devDependencies": {
       "@ethos/config": "workspace:*",
       "typescript": "^5.4.0"
     }
   }
   ```
4. **`tsconfig.json`:**
   ```json
   {
     "extends": "@ethos/config/tsconfig/library.json",
     "compilerOptions": {
       "outDir": "./dist",
       "rootDir": "./src"
     },
     "include": ["src/**/*"]
   }
   ```
5. **Rodar `pnpm install` na raiz** pra atualizar workspace
6. **Importar em outros packages:** `pnpm add @ethos/notifications --filter @ethos/playground`

---

## CI: GitHub Actions

`.github/workflows/ci.yml`:

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  ci:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
        with:
          version: 9
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'

      - name: Install
        run: pnpm install --frozen-lockfile

      - name: Lint
        run: pnpm lint

      - name: Typecheck
        run: pnpm typecheck

      - name: Build
        run: pnpm build

      - name: Test
        run: pnpm test
```

Cada PR roda esses 4 passos. Merge bloqueia se algum falhar.

---

## Convenções de commits

Padrão **Conventional Commits**:

```
<type>(<scope>): <subject>

<body opcional>

<footer opcional>
```

Tipos:

- `feat`: nova funcionalidade
- `fix`: correção de bug
- `docs`: mudança em documentação
- `style`: formatação, sem mudança de lógica
- `refactor`: refatoração sem mudança de comportamento
- `perf`: melhoria de performance
- `test`: adição/ajuste de testes
- `chore`: tarefas de infra, dependências

Exemplos:

```
feat(ui): adiciona componente DataTablePro com filtros
fix(auth): corrige refresh token expirando antes do tempo
docs(generators): atualiza exemplo do template de controller
refactor(ai-chat): extrai sanitizer pra package separado
```

Scope é opcional mas recomendado pra clareza em PRs grandes.

---

## Branch strategy

- **`main`** — branch protegida, deploys automáticos
- **`feature/[nome]`** — features novas
- **`fix/[nome]`** — bugfixes
- **`docs/[nome]`** — só documentação

PRs precisam de:

- CI verde
- Pelo menos 1 review (Ethos ou dev sênior)
- Squash merge (1 commit por PR no histórico de `main`)

---

## Próximos arquivos relevantes

Esse arquivo cobre estrutura geral. Pra detalhes de implementação:

- **`04-BIBLIOTECA-UI.md`** — o que tem dentro de cada componente da `@ethos/ui`
- **`05-GERADORES-BACKEND.md`** — como funciona o gerador NestJS
- **`06-GERADORES-FRONTEND.md`** — como funciona o gerador Next.js
- **`08-PACOTES-PLUGAVEIS.md`** — especificação de cada pacote (`ai-chat`, `whatsapp`, etc.)
- **`09-TEMPLATE-STARTER.md`** — anatomia do template clonável
