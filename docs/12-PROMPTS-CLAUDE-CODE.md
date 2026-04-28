# 12 — Prompts Prontos para Claude Code

> Este arquivo é **operacional**. Cada seção contém um prompt pronto para colar no Claude Code, com os arquivos de contexto que ele deve ler antes de executar a tarefa.
>
> **Como usar:**
> 1. Abre o Claude Code dentro do monorepo `forge/`.
> 2. Copia o prompt da seção que você está atacando.
> 3. Cola no Claude Code. Ele vai ler os `.md` referenciados, planejar e executar.
> 4. Revisa o que ele entrega antes de aceitar.
>
> **Princípio:** o Claude Code é um par sênior, não um copy-paste machine. Sempre revise diffs antes de aceitar. Sempre rode os testes que ele escreve. Sempre questione decisões de arquitetura que não baterem com a doc.

---

## Índice de Prompts

1. [Setup do monorepo](#1-setup-do-monorepo)
2. [Configuração de tooling (ESLint, Prettier, Husky, CI)](#2-configuração-de-tooling)
3. [Construção da biblioteca @ethos/ui — Fundação](#3-biblioteca-ethosui-fundação)
4. [Construção da biblioteca @ethos/ui — Primitivos](#4-biblioteca-ethosui-primitivos)
5. [Construção da biblioteca @ethos/ui — Compostos](#5-biblioteca-ethosui-compostos)
6. [Construção da biblioteca @ethos/ui — Layouts](#6-biblioteca-ethosui-layouts)
7. [Setup do app API (NestJS + Prisma)](#7-setup-do-app-api)
8. [Implementação de Auth + Multi-tenant](#8-auth-multi-tenant)
9. [Setup dos geradores backend](#9-geradores-backend)
10. [Setup do app Web (Next.js 14)](#10-setup-do-app-web)
11. [Setup dos geradores frontend](#11-geradores-frontend)
12. [Consolidação do template starter](#12-template-starter)
13. [Pacote @ethos/ai-chat](#13-pacote-ethosai-chat)
14. [Pacote @ethos/ai-rag](#14-pacote-ethosai-rag)
15. [Pacote @ethos/ocr](#15-pacote-ethosocr)
16. [Pacote @ethos/whatsapp](#16-pacote-ethoswhatsapp)
17. [Pacote @ethos/google](#17-pacote-ethosgoogle)
18. [Pacote @ethos/n8n](#18-pacote-ethosn8n)
19. [Pacote @ethos/payments](#19-pacote-ethospayments)
20. [Pacote @ethos/erp-bridge](#20-pacote-ethoserp-bridge)
21. [Deploy inicial Railway](#21-deploy-inicial-railway)
22. [Code review automatizado](#22-code-review-automatizado)
23. [Debugging — quando algo dá errado](#23-debugging)

---

## Convenções dos prompts

Todos os prompts seguem o mesmo formato:

```
[CONTEXTO] - quais .md o Claude Code deve ler antes
[OBJETIVO] - o que entregar ao final
[TAREFAS] - passos concretos
[CRITÉRIO DE ACEITE] - como saber que terminou
[NÃO FAZER] - bordas explícitas
```

Você pode (e deve) editar esses prompts conforme a realidade do seu repo. Eles são pontos de partida, não scripts imutáveis.

---

## 1. Setup do monorepo

**Quando usar:** primeira coisa a fazer. Repo vazio, recém-criado.

```
[CONTEXTO]
Leia os seguintes arquivos do diretório docs/ antes de começar:
- 00-FILOSOFIA.md
- 01-STACK-DECISOES.md
- 03-ESTRUTURA-MONOREPO.md

[OBJETIVO]
Inicializar a estrutura completa do monorepo Forge usando Turborepo + pnpm,
seguindo exatamente a estrutura de pastas definida em 03-ESTRUTURA-MONOREPO.md.

[TAREFAS]
1. Criar package.json raiz com workspaces pnpm e scripts Turborepo
2. Criar pnpm-workspace.yaml apontando para apps/* e packages/*
3. Criar turbo.json com pipelines: build, dev, lint, test, typecheck, clean
4. Criar tsconfig.base.json na raiz com configs estritas (strict: true, noUncheckedIndexedAccess: true)
5. Criar a árvore de pastas (15 packages: 7 infra + 8 plugáveis):
   - apps/playground/ (placeholder — Next.js vitrine viva)
   - packages/ui/
   - packages/auth/
   - packages/database/
   - packages/api-base/
   - packages/config/
   - packages/types/
   - packages/utils/
   - packages/ai-chat/
   - packages/ai-rag/
   - packages/ocr/
   - packages/whatsapp/
   - packages/google/
   - packages/n8n/
   - packages/payments/
   - packages/erp-bridge/
   - tools/generators/ (skeleton — fora do workspace pnpm)
   - templates/starter/ (placeholder; templates/starter/apps/{api,web}/ preenchidos nos prompts #7-#11)
   - docs/ (já populado)
6. Criar .gitignore robusto (node_modules, dist, .next, .turbo, .env*, etc.)
7. Criar .nvmrc com Node 20
8. Criar README.md raiz com instruções de bootstrap
9. Configurar packages/config/ com tsconfig presets compartilhados:
   - tsconfig.base.json
   - tsconfig.nextjs.json
   - tsconfig.node.json
   - tsconfig.react-library.json

[CRITÉRIO DE ACEITE]
- `pnpm install` na raiz roda sem erro
- `pnpm turbo run build --dry-run` mostra a topologia esperada
- Estrutura de pastas idêntica à do doc 03

[NÃO FAZER]
- Não instalar Lerna, Nx, Rush ou qualquer outro monorepo tool
- Não usar yarn ou npm
- Não criar apps/api ou apps/web no Forge — esses apps vivem em templates/starter/apps/ (preenchidos nos prompts #7-#11)
- Não popular templates/starter/apps/ ainda — só placeholder
```

---

## 2. Configuração de tooling

**Quando usar:** depois do monorepo inicializado, antes de começar a codar features.

```
[CONTEXTO]
Leia:
- 03-ESTRUTURA-MONOREPO.md (seção sobre tooling)
- 01-STACK-DECISOES.md (versões a usar)

[OBJETIVO]
Configurar ESLint, Prettier, Husky, lint-staged, commitlint e CI básico
no monorepo Forge.

[TAREFAS]
1. ESLint:
   - Instalar @typescript-eslint, eslint-config-next, eslint-plugin-react,
     eslint-plugin-react-hooks, eslint-plugin-import
   - Criar packages/config/eslint-base.js (regras compartilhadas)
   - Criar packages/config/eslint-nextjs.js (extends base + Next)
   - Criar packages/config/eslint-node.js (extends base + Node)
   - Criar .eslintrc.js raiz que extende a base
2. Prettier:
   - Instalar prettier, prettier-plugin-tailwindcss
   - Criar .prettierrc na raiz com configs (semi: true, singleQuote: true,
     trailingComma: 'all', printWidth: 100, plugins: tailwind)
   - Criar .prettierignore
3. Husky + lint-staged:
   - Instalar husky, lint-staged
   - Configurar pre-commit: lint-staged
   - lint-staged config: ESLint --fix + Prettier --write
4. Commitlint:
   - Instalar @commitlint/cli, @commitlint/config-conventional
   - Criar commitlint.config.js (conventional commits)
   - Configurar commit-msg hook
5. CI (GitHub Actions):
   - Criar .github/workflows/ci.yml
   - Jobs: install, lint, typecheck, test, build
   - Cache pnpm e turbo
   - Rodar em PR e push pra main
6. Adicionar scripts úteis no package.json raiz:
   - "lint": "turbo run lint"
   - "typecheck": "turbo run typecheck"
   - "test": "turbo run test"
   - "format": "prettier --write \"**/*.{ts,tsx,md}\""

[CRITÉRIO DE ACEITE]
- `pnpm lint` roda sem erro num repo vazio
- Commit com mensagem inválida é bloqueado
- Pre-commit formata arquivos staged
- CI passa no primeiro PR

[NÃO FAZER]
- Não usar Biome (decisão tomada por ESLint+Prettier)
- Não criar configs duplicadas em cada package — sempre extender de packages/config
```

---

## 3. Biblioteca @ethos/ui — Fundação

**Quando usar:** depois do tooling. Esse é o coração visual do Forge.

```
[CONTEXTO]
Leia OBRIGATORIAMENTE antes de começar:
- 02-IDENTIDADE-VISUAL.md (regras visuais, paleta, tipografia, animações)
- 04-BIBLIOTECA-UI.md (catálogo de componentes, anatomia, APIs)

[OBJETIVO]
Criar a fundação do package @ethos/ui: configuração, tokens de design,
sistema de temas, e as primeiras 3 primitivas (Button, Input, Card)
seguindo exatamente as regras visuais do doc 02.

[TAREFAS]
1. Inicializar packages/ui/:
   - package.json com nome @ethos/ui
   - Build com tsup (output ESM + types)
   - Peer deps: react ^18, react-dom ^18, tailwindcss ^3.4
   - Deps: class-variance-authority, clsx, tailwind-merge, lucide-react,
     @radix-ui/* (apenas os necessários por agora: react-slot)
2. Configurar Tailwind:
   - tailwind.config.ts exportável (presets) em packages/ui/tailwind.config.ts
   - Plugin tailwindcss-animate
   - Definir TODAS as CSS variables da paleta do doc 02 (light + dark)
   - Configurar fontFamily Inter (e Geist como fallback alt)
   - Spacing scale 4px (já é default mas deixar explícito)
   - borderRadius: { DEFAULT: '8px', sm: '4px', md: '6px', lg: '12px', xl: '16px' }
3. Criar src/styles/globals.css com:
   - @tailwind base/components/utilities
   - :root com CSS vars (light theme)
   - .dark com CSS vars (dark theme)
   - Reset adicional pra inputs/buttons (font inherit, etc.)
4. Criar src/lib/cn.ts (utility de merge de classes — clsx + twMerge)
5. Criar primitivas (na pasta src/components/):
   - Button.tsx — variants: default, secondary, outline, ghost, destructive, link
   - Input.tsx — com states focus/disabled/error
   - Card.tsx — com Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter
6. Cada componente DEVE:
   - Usar cva (class-variance-authority) pras variants
   - Usar forwardRef
   - Ter displayName
   - Exportar tipos das props
   - Seguir paleta/sombras/border-radius do doc 02
7. Criar src/index.ts exportando tudo
8. Adicionar Storybook 8 com Vite builder
9. Criar uma story por componente com todas as variants visíveis

[CRITÉRIO DE ACEITE]
- `pnpm --filter @ethos/ui build` gera dist/ com ESM + .d.ts
- `pnpm --filter @ethos/ui storybook` abre Storybook funcional
- Button, Input e Card visualmente idênticos ao spec do doc 02
- Theme switcher (light/dark) funciona via classe .dark no body
- Zero warnings de TypeScript

[NÃO FAZER]
- NÃO copiar shadcn/ui literalmente. Use shadcn como referência mas customize tudo.
- NÃO usar Material UI, Chakra, Mantine ou qualquer biblioteca de componentes pronta
- NÃO usar styled-components, emotion ou CSS-in-JS — só Tailwind
- NÃO inventar cores fora da paleta do doc 02
- NÃO adicionar animações que não estejam nas regras (150-200ms, ease-out apenas)
```

---

## 4. Biblioteca @ethos/ui — Primitivos

**Quando usar:** depois da fundação aprovada visualmente.

```
[CONTEXTO]
Leia:
- 02-IDENTIDADE-VISUAL.md
- 04-BIBLIOTECA-UI.md (seção "Primitivos")

[OBJETIVO]
Completar todos os ~30 primitivos listados no doc 04, na seguinte ordem:

GRUPO A — Forms (prioridade máxima):
- Label, Textarea, Select, Checkbox, Radio, Switch, Slider
- DatePicker (usar react-day-picker), TimePicker
- FormField (wrapper genérico com label/error/hint)

GRUPO B — Feedback:
- Alert, Badge, Toast (sonner customizado), Skeleton, Spinner, Progress

GRUPO C — Overlays:
- Dialog (Radix), Sheet (Radix Drawer), Popover, Tooltip, DropdownMenu, ContextMenu

GRUPO D — Navegação:
- Tabs, Breadcrumb, Pagination, Command (cmdk)

GRUPO E — Estrutura:
- Separator, ScrollArea, AspectRatio, Avatar, Accordion, Collapsible

[TAREFAS]
Para CADA componente:
1. Criar src/components/<NomeDoComponente>.tsx
2. Usar Radix UI quando disponível (não reinventar acessibilidade)
3. Customizar 100% do estilo via Tailwind seguindo paleta do doc 02
4. Forward ref + displayName + tipos exportados
5. Story no Storybook com pelo menos 3 variants/estados
6. Adicionar export em src/index.ts

ORDEM DE EXECUÇÃO:
- Faça GRUPO A inteiro antes de pedir review
- Depois GRUPO B inteiro
- Depois GRUPO C inteiro
- Depois GRUPO D inteiro
- Depois GRUPO E inteiro

[CRITÉRIO DE ACEITE]
- Todas as primitivas listadas implementadas
- Storybook com todas elas catalogadas
- Build sem erro
- Visual consistente entre todas (mesma família visual)
- Acessibilidade: navegação por teclado funciona em todos overlays e forms

[NÃO FAZER]
- Não pular o Storybook (é onde a curadoria visual acontece)
- Não usar versões antigas do Radix (sempre a major mais recente estável)
- Não adicionar componentes fora da lista — se faltar algo, pergunta antes
```

---

## 5. Biblioteca @ethos/ui — Compostos

**Quando usar:** depois dos primitivos. Aqui mora o diferencial Ethos.

```
[CONTEXTO]
Leia:
- 02-IDENTIDADE-VISUAL.md
- 04-BIBLIOTECA-UI.md (seção "Compostos" — a mais importante)

[OBJETIVO]
Construir os componentes compostos proprietários, que são a verdadeira
diferenciação visual e funcional do Forge. Ordem de prioridade:

1. DataTablePro — tabela com:
   - Sorting, filtering, paginação server-side
   - Selecionáveis (checkbox por row + row-action menu)
   - Densidade (compact/normal/comfortable)
   - Empty state customizável
   - Skeleton de loading
   - Resize de colunas, reordenamento via drag
   - Sticky header
   - Export CSV
   - Baseada em @tanstack/react-table v8

2. FormBuilder — form declarativo:
   - Recebe schema Zod + array de fields
   - Renderiza fields automaticamente baseado em tipo
   - Suporte a tipos: text, number, email, password, textarea,
     select, multiselect, checkbox, switch, date, file, custom
   - Validação inline + submit
   - Layout responsivo (1, 2 ou 3 colunas)
   - Integração com react-hook-form

3. KpiCard — card de métrica:
   - Valor principal grande
   - Label
   - Variação % (com ícone up/down + cor)
   - Sparkline opcional (recharts)
   - Skeleton state
   - Loading state

4. EmptyState — estado vazio:
   - Ícone (Lucide)
   - Título + descrição
   - CTA primária + secundária
   - 3 variants: empty, error, search-no-results

5. ConfirmDialog — confirmação:
   - Hook useConfirm() + componente <ConfirmDialogProvider />
   - Title, description, variant (default/destructive)
   - Promise-based (await confirm({ ... }))

6. FiltersPanel — painel lateral de filtros:
   - Sheet do lado direito
   - Suporta: range, select, multiselect, daterange, search
   - Estado controlado externamente
   - Botão "Limpar tudo" + "Aplicar"

7. PageHeader — cabeçalho de página:
   - Título + descrição
   - Breadcrumbs opcionais
   - Slot pra ações (botões à direita)

8. SectionHeader — cabeçalho de seção dentro de página

9. StatusBadge — badge com cor semântica:
   - success, warning, error, info, neutral
   - Suporte a dot indicator + label

10. UserAvatar — avatar com iniciais fallback + indicator online opcional

[TAREFAS]
Para CADA composto:
1. Criar pasta src/components/<NomeComposto>/ (não arquivo único — composto pode ter sub-arquivos)
2. Implementar
3. Story no Storybook com 5+ exemplos cobrindo casos reais
4. Documentar API no JSDoc
5. Adicionar export em src/index.ts

[CRITÉRIO DE ACEITE]
- Todos os 10 compostos funcionais e bonitos
- DataTablePro renderiza 1000 linhas com virtualização sem lag
- FormBuilder consegue gerar forms reais usados nas páginas geradas
- Storybook documenta todos casos de uso

[NÃO FAZER]
- Não tentar fazer "abstração geral demais" — cada composto resolve um problema concreto
- Não criar interno demais — manter APIs flexíveis pra extensão
```

---

## 6. Biblioteca @ethos/ui — Layouts

**Quando usar:** depois dos compostos. Últimos componentes da UI.

```
[CONTEXTO]
Leia:
- 02-IDENTIDADE-VISUAL.md
- 04-BIBLIOTECA-UI.md (seção "Layouts")

[OBJETIVO]
Implementar os 3 layouts principais que serão usados pelos templates de
páginas geradas e pelo template starter:

1. DashboardLayout — layout principal de produto:
   - Sidebar à esquerda (colapsável, com sub-menus)
   - Topbar (search global, theme switcher, notifications, user menu)
   - Main content area
   - Mobile responsive (sidebar vira drawer)
   - Suporte a breadcrumbs no topo do main

2. AuthLayout — login, signup, forgot password:
   - Centered card 400px
   - Logo no topo
   - Footer minimalista
   - Background sutil (gradient ou pattern)

3. SettingsLayout — páginas de configuração:
   - Sidebar interna com seções (account, billing, team, integrations, etc.)
   - Main com seção ativa
   - Padding/spacing diferente do Dashboard

[TAREFAS]
1. Criar src/layouts/DashboardLayout/:
   - DashboardLayout.tsx (componente principal)
   - Sidebar.tsx
   - SidebarItem.tsx
   - SidebarGroup.tsx
   - Topbar.tsx
   - UserMenu.tsx
   - sidebarConfig.ts (tipo + helper pra montar config externa)
2. Criar src/layouts/AuthLayout/AuthLayout.tsx
3. Criar src/layouts/SettingsLayout/ (estrutura similar ao Dashboard)
4. Stories no Storybook simulando uso real (com mock data)
5. Garantir que Sidebar aceite config externa via prop (será usado pelos generators)
6. Suporte a "expand/collapse" persistido em localStorage

[CRITÉRIO DE ACEITE]
- 3 layouts funcionais
- Mobile responsive verificado em 375px, 768px, 1024px, 1440px
- Sidebar com sub-menus expansíveis
- Theme switch funciona em todos
- Stories no Storybook permitem visualizar cada layout cheio

[NÃO FAZER]
- Não hardcodar logo Ethos — recebe via prop
- Não hardcodar nome do produto — recebe via prop
- Não acoplar a uma rota específica de Next.js — manter agnóstico
```

---

## 7. Setup do app API

**Quando usar:** depois da UI base. Pode ser feito em paralelo com primitivos se houver outro dev.

```
[CONTEXTO]
Leia:
- 01-STACK-DECISOES.md
- 03-ESTRUTURA-MONOREPO.md
- 05-GERADORES-BACKEND.md (estrutura esperada do app)

[OBJETIVO]
Inicializar templates/starter/apps/api/ como aplicação NestJS 10 + Prisma 5 + PostgreSQL,
seguindo a estrutura modular esperada e as configurações de produção. Esse é o
app de referência que todo projeto cliente clona via templates/starter/.

[TAREFAS]
1. Inicializar templates/starter/apps/api/ com NestJS CLI ou manualmente:
   - package.json com nome @ethos-app/api
   - main.ts, app.module.ts
   - Estrutura: src/modules/, src/common/, src/config/, src/lib/
2. Instalar dependências:
   - @nestjs/* core
   - @nestjs/config (env management com Zod schema)
   - @nestjs/swagger (OpenAPI)
   - @nestjs/throttler (rate limit)
   - prisma + @prisma/client
   - argon2 (hash de senhas — NÃO bcrypt)
   - jsonwebtoken
   - zod
   - pino + nestjs-pino (logging estruturado)
   - helmet, compression
3. Configurar Prisma:
   - prisma/schema.prisma (vai pra packages/database/ depois — por agora local)
   - PostgreSQL como datasource
   - Generators: client + os do doc 05
4. Configurar app.module.ts:
   - ConfigModule global com validation Zod
   - PrismaModule global
   - LoggerModule (pino)
   - ThrottlerModule
   - HealthModule (endpoint /health)
5. main.ts:
   - Helmet
   - Compression
   - ValidationPipe global (transform + whitelist)
   - Swagger em /api-docs
   - CORS configurável via env
   - Graceful shutdown
6. Criar src/common/:
   - filters/all-exceptions.filter.ts (formato JSON consistente de erros)
   - interceptors/transform.interceptor.ts (envelope { data, meta })
   - decorators/ (placeholder pra futuros)
   - pipes/zod-validation.pipe.ts
7. Criar src/config/env.schema.ts com Zod definindo todas envs esperadas
8. Criar .env.example completo
9. Criar Dockerfile multi-stage (build + production) pra Railway
10. Adicionar scripts no package.json:
    - dev (nest start --watch)
    - build (nest build)
    - start (node dist/main)
    - db:generate, db:migrate, db:studio, db:seed (placeholder)

[CRITÉRIO DE ACEITE]
- `pnpm --filter @ethos-app/api dev` sobe a API em :3001 (rodando a partir de templates/starter/apps/api/)
- GET /health retorna 200
- GET /api-docs abre Swagger funcional
- Validação Zod de env falha no startup se env inválida
- Logs em formato JSON estruturado

[NÃO FAZER]
- Não usar TypeORM, Sequelize ou Drizzle — só Prisma
- Não usar bcrypt — argon2id
- Não usar express raw — manter NestJS abstractions
- Não criar módulos de domínio ainda (User, Auth etc) — virá no próximo prompt
```

---

## 8. Auth Multi-tenant

**Quando usar:** API base pronta. Esse é o módulo mais crítico do kit.

```
[CONTEXTO]
Leia OBRIGATORIAMENTE:
- 07-AUTH-MULTI-TENANT.md (todo o arquivo — esse é o spec)

[OBJETIVO]
Implementar auth completo + multi-tenancy seguindo exatamente o spec do doc 07.
Esse é o coração do kit — todos os produtos vão herdar isso.

[TAREFAS]
1. Schema Prisma (em packages/database/prisma/schema.prisma):
   - Modelos: Tenant, User, TenantMember, RefreshToken, Session, AuditLog
   - Enum Role (owner, admin, manager, member, viewer)
   - Relações conforme doc 07
   - Migration inicial

2. Package @ethos/auth (em packages/auth/):
   - Tipos compartilhados (User, Tenant, JwtPayload, etc.)
   - Helpers de hash (argon2id)
   - Helpers de JWT (sign + verify)
   - Tudo exportado pra ser usado pelo backend

3. Módulo AuthModule (em templates/starter/apps/api/src/modules/auth/):
   - auth.controller.ts (POST /auth/register, /auth/login, /auth/refresh,
     /auth/logout, GET /auth/me)
   - auth.service.ts (lógica de autenticação)
   - jwt.strategy.ts (Passport JWT)
   - guards/jwt-auth.guard.ts
   - guards/roles.guard.ts
   - guards/tenant.guard.ts (valida tenant do header X-Tenant-Id)
   - decorators/current-user.decorator.ts
   - decorators/current-tenant.decorator.ts
   - decorators/roles.decorator.ts (@Roles('admin'))
   - decorators/public.decorator.ts (@Public())
   - dto/register.dto.ts, login.dto.ts, refresh.dto.ts (com Zod schemas)

4. Implementar isolamento automático por tenant:
   - Prisma extension que injeta where: { tenantId } em todas queries
   - Usar AsyncLocalStorage pra propagar tenantId no contexto da request
   - Middleware NestJS que extrai tenantId do JWT e injeta no ALS
   - Aplicar globalmente

5. Módulo UsersModule básico:
   - GET /users (lista usuários do tenant atual)
   - GET /users/me
   - PATCH /users/me

6. Módulo TenantsModule básico:
   - GET /tenants/me (info do tenant atual)
   - POST /tenants/members/invite (apenas owner/admin)
   - DELETE /tenants/members/:userId (apenas owner/admin)

7. Auditoria:
   - Interceptor que loga em AuditLog: action, userId, tenantId, resource, resourceId, metadata
   - Decorator @Audit('user.create') pra marcar endpoints

8. Testes E2E:
   - register flow completo
   - login + refresh + logout
   - cross-tenant: usuário do tenant A NÃO consegue ler dados do tenant B
   - role-based: viewer não consegue criar, admin consegue

[CRITÉRIO DE ACEITE]
- Fluxo completo register → login → me → logout funcional
- Refresh token rotation (cada refresh gera novo + invalida o antigo)
- Cross-tenant isolation testado e funcional
- AuditLog gravando todas operações sensíveis
- Senhas com argon2id (memoryCost configurável via env)
- Acesso público a /auth/* mas privado em todo resto por padrão

[NÃO FAZER]
- Não armazenar refresh token em localStorage (cookie httpOnly)
- Não usar sessões server-side em memória — sempre Postgres
- Não esquecer de revogar refresh tokens no logout
- NÃO permitir que tenantId venha do body ou query — só do JWT decodificado
```

---

## 9. Geradores Backend

**Quando usar:** depois de Auth + Multi-tenant funcionando.

```
[CONTEXTO]
Leia:
- 05-GERADORES-BACKEND.md (todo o arquivo)
- 07-AUTH-MULTI-TENANT.md (pra entender padrões a seguir nos geradores)

[OBJETIVO]
Configurar a pipeline de geração de código backend a partir do schema
Prisma, gerando DTOs, BaseClientService e templates Forge para
controllers/modules. Modelo B confirmado: gerador cospe BaseClientService,
dev cria ClientService extends BaseClientService quando precisa customizar.

[TAREFAS]
1. Em packages/database/:
   - Instalar prisma-generator-nestjs-dto
   - Instalar @prisma-utils/prisma-crud-generator
   - Configurar generators no schema.prisma:
     - generator client (default)
     - generator nestjsDto (output: ../../templates/starter/apps/api/src/generated/dto)
     - generator nestjsCrud (output: ../../templates/starter/apps/api/src/generated/crud)

2. Em tools/generators/:
   - Criar tools/generators/forge-controller/ (CLI Node)
   - Lê schema.prisma via @prisma/internals
   - Pra cada model marcado com /// @forge.generate(controller):
     gera controller.ts e module.ts em templates/starter/apps/api/src/modules/<resource>/
   - Templates Handlebars conforme doc 05
   - Não sobrescreve service.ts se já existir (Modelo B preserva customização)
   - Cria service.ts inicial extends BaseClientService se não existir

3. Templates Handlebars (em tools/generators/forge-controller/templates/):
   - controller.hbs (com Swagger decorators, Roles, Audit)
   - module.hbs (importa Controller + Service + Repositório)
   - service.hbs (extends BaseClientService — só na primeira geração)
   - repository.hbs (PrismaRepository<Model> wrapper)

4. CLI npm script:
   - "forge:gen:backend": "prisma generate && node tools/generators/forge-controller/index.js"

5. Convenções dos templates seguir EXATAMENTE doc 05:
   - Resource path em kebab-case
   - Controller usa @Controller(':resource')
   - Inject service via DI
   - DTOs vindos de generated/dto
   - Auditoria em create/update/delete
   - Roles padrão: list/get = member+, create/update = manager+, delete = admin+

6. Adicionar 1 model de exemplo no schema (ex: Product) com /// @forge.generate(controller, page)

7. Rodar `pnpm forge:gen:backend` e validar:
   - DTOs gerados em templates/starter/apps/api/src/generated/dto/
   - BaseClientService gerado em templates/starter/apps/api/src/generated/crud/
   - controller.ts, module.ts, service.ts, repository.ts gerados em
     templates/starter/apps/api/src/modules/products/
   - Module registrado em app.module.ts (manualmente por enquanto — automação em V2)
   - Endpoints CRUD funcionais via Swagger

[CRITÉRIO DE ACEITE]
- Schema Prisma + 1 comando = CRUD backend completo
- Re-rodar gerador NÃO sobrescreve service.ts customizado
- Re-rodar gerador atualiza DTOs e BaseClientService
- Endpoints respeitam tenant isolation (Auth funciona + filtra)
- Audit log registra create/update/delete

[NÃO FAZER]
- Não escrever controllers à mão (esse é o ponto inteiro do gerador)
- Não duplicar Auth/Tenant logic nos templates — herdar de BaseClientService e guards globais
- Não gerar testes nesta fase (V2)
```

---

## 10. Setup do app Web

**Quando usar:** API funcional. Pode ser paralelo aos compostos UI.

```
[CONTEXTO]
Leia:
- 01-STACK-DECISOES.md
- 03-ESTRUTURA-MONOREPO.md
- 06-GERADORES-FRONTEND.md (estrutura de pastas esperada)
- 07-AUTH-MULTI-TENANT.md (fluxo de auth no frontend)

[OBJETIVO]
Inicializar templates/starter/apps/web/ como Next.js 14 App Router + TypeScript + Tailwind,
consumindo @ethos/ui, com auth integrado e estrutura pronta pra receber
páginas geradas. Esse é o app de referência que todo projeto cliente clona via templates/starter/.

[TAREFAS]
1. Inicializar templates/starter/apps/web/:
   - Next.js 14 App Router (npx create-next-app@latest --ts --tailwind --app)
   - Renomear pra @ethos-app/web
   - Configurar tsconfig extending @ethos/config/tsconfig/nextjs.json
2. Tailwind:
   - Importar preset de @ethos/ui (tailwind.config baseado no preset)
   - Importar globals.css de @ethos/ui em app/layout.tsx
3. Instalar deps:
   - @tanstack/react-query
   - zustand
   - react-hook-form
   - @hookform/resolvers
   - zod
   - axios (ou fetch wrapper customizado — avaliar)
   - sonner
   - @ethos/ui (workspace)
4. Estrutura de pastas em src/:
   - app/(auth)/login/page.tsx
   - app/(auth)/register/page.tsx
   - app/(auth)/layout.tsx (usa AuthLayout de @ethos/ui)
   - app/(dashboard)/layout.tsx (usa DashboardLayout de @ethos/ui)
   - app/(dashboard)/dashboard/page.tsx (home com KPIs)
   - app/(dashboard)/settings/ (com SettingsLayout)
   - lib/api-client.ts (axios instance com interceptor de token)
   - lib/auth/ (hooks: useAuth, useUser, useTenant + provider)
   - lib/query-client.ts (TanStack config)
   - stores/ (Zustand stores)
   - config/sidebar.ts (config de menu — será editado por gerador depois)
   - components/ (custom específicos do app — não da lib)
   - generated/ (placeholder pra hey-api)
5. Implementar AuthProvider:
   - Lê token de cookie httpOnly via /auth/me no boot
   - Expõe useAuth() com { user, tenant, login, logout, register, isLoading }
   - Refresh token automático no axios interceptor (response 401 → refresh → retry)
6. Implementar páginas de auth (login, register, forgot-password):
   - Form com FormBuilder de @ethos/ui
   - Schema Zod
   - Integração com API
   - Toast de erro/sucesso (sonner)
7. Implementar (dashboard)/layout.tsx:
   - Wrap com DashboardLayout
   - Sidebar config de config/sidebar.ts
   - Proteger rota: redirect /login se sem auth
8. Implementar (dashboard)/dashboard/page.tsx:
   - 4 KpiCards (mock data inicial)
   - 1 DataTablePro (mock)
   - Apenas pra validar a UI

[CRITÉRIO DE ACEITE]
- Login funcional contra API
- Sessão persistida via cookie httpOnly
- Layout dashboard com sidebar funcional, theme switch, user menu
- Logout limpa cookies e redireciona
- Mobile responsive

[NÃO FAZER]
- Não usar Pages Router — só App Router
- Não usar SWR — TanStack Query
- Não usar Recoil ou Redux — Zustand
- Não armazenar JWT em localStorage — cookie httpOnly via /auth/login
```

---

## 11. Geradores Frontend

**Quando usar:** API + Web base + UI compostos prontos.

```
[CONTEXTO]
Leia:
- 06-GERADORES-FRONTEND.md (todo)
- 04-BIBLIOTECA-UI.md (compostos a usar nos templates)

[OBJETIVO]
Configurar pipeline de geração frontend: @hey-api/openapi-ts pra
types/hooks + templates Forge pra páginas (list/create/edit/view) +
atualização automática do sidebar config.

[TAREFAS]
1. Configurar @hey-api/openapi-ts em templates/starter/apps/web/:
   - npm i @hey-api/openapi-ts -D
   - openapi-ts.config.ts apontando pra http://localhost:3001/api-docs-json
   - Output em src/generated/api/
   - Plugins: @tanstack/react-query
2. Script em package.json:
   - "gen:api": "openapi-ts"
3. Em tools/generators/ criar forge-page/:
   - CLI Node que lê schema.prisma
   - Pra cada model marcado /// @forge.generate(page):
     - Gera src/app/(dashboard)/<resource>/page.tsx (list)
     - Gera src/app/(dashboard)/<resource>/new/page.tsx (create)
     - Gera src/app/(dashboard)/<resource>/[id]/page.tsx (view)
     - Gera src/app/(dashboard)/<resource>/[id]/edit/page.tsx (edit)
     - Gera src/app/(dashboard)/<resource>/_components/ (FormFields, Columns)
   - Atualiza src/config/sidebar.ts inserindo entre marcadores
     // FORGE-AUTOGEN:START e // FORGE-AUTOGEN:END
4. Templates Handlebars (em tools/generators/forge-page/templates/):
   - list.hbs (DataTablePro com hooks gerados, filtros, paginação)
   - create.hbs (FormBuilder com schema Zod inferido)
   - view.hbs (read-only display dos campos)
   - edit.hbs (FormBuilder pré-preenchido)
   - columns.hbs (definição de colunas pro DataTablePro)
   - form-fields.hbs (definição de fields pro FormBuilder)
   - sidebar-entry.hbs (entrada do menu lateral)
5. Inferência de ícone Lucide:
   - Heurística por nome do model: Product → Package, User → User,
     Order → ShoppingCart, etc. Default: Database
   - Mapping em tools/generators/forge-page/icon-map.ts
6. CLI script:
   - "forge:gen:frontend": "openapi-ts && node tools/generators/forge-page/index.js"
7. Smoke test:
   - Adicionar /// @forge.generate(controller, page) em model Product
   - Rodar pnpm forge:gen:backend e pnpm forge:gen:frontend
   - Validar: páginas /products, /products/new, /products/[id], /products/[id]/edit
     funcionais consumindo a API real
   - Sidebar atualizado automaticamente

[CRITÉRIO DE ACEITE]
- 1 model Prisma → 4 páginas funcionais
- DataTablePro renderiza listagem com filtro, sort, paginação server-side
- Forms com validação Zod (mesmo schema do backend via OpenAPI)
- Re-gerar não destrói customizações fora dos blocos AUTOGEN
- Sidebar atualizado entre marcadores

[NÃO FAZER]
- Não gerar páginas em Pages Router — App Router only
- Não inventar componentes — só usar o que existe em @ethos/ui
- Não esquecer de respeitar blocos AUTOGEN no sidebar
```

---

## 12. Template Starter

**Quando usar:** geradores backend + frontend funcionando end-to-end.

```
[CONTEXTO]
Leia:
- 09-TEMPLATE-STARTER.md (todo)

[OBJETIVO]
Consolidar templates/starter/ como repo template clonável que serve de
ponto de partida pra qualquer novo produto Ethos. Esse template é o que
o Ethos vai clonar quando começar projeto novo.

[TAREFAS]
1. Estruturar templates/starter/ idêntico ao monorepo Forge mas sem packages internas
   (ele consome via npm de @ethos/ui, @ethos/auth, etc. — quando publicarmos,
    inicialmente via workspace link / pnpm pack)

2. Conteúdo mínimo do starter:
   - apps/api/ — NestJS funcional com Auth + Multi-tenant + 1 model demo (Product)
   - apps/web/ — Next.js funcional com login, dashboard e páginas geradas pro Product
   - prisma/schema.prisma — schema base (Tenant, User, TenantMember, Product demo)
   - prisma/seed.ts — seed de tenant demo + admin user demo
   - .env.example completo
   - README.md com:
     - Quick start (clone, install, copy .env, db:migrate, db:seed, dev)
     - Como adicionar novo model
     - Como rodar geradores
     - Como deployar no Railway
   - .github/workflows/ci.yml já configurado
   - Dockerfiles prontos pra Railway
   - railway.json com config do projeto

3. Script de bootstrap:
   - tools/bootstrap.ts — após clone, pergunta nome do produto, troca nas
     variáveis (package.json names, README, etc.)

4. Documentação interna do template:
   - templates/starter/docs/PRIMEIROS-PASSOS.md
   - templates/starter/docs/ADICIONANDO-MODELS.md
   - templates/starter/docs/CUSTOMIZACAO.md (como sair do BaseClientService quando precisar)

5. Validar end-to-end:
   - Cloná-lo num diretório separado
   - Seguir README do zero
   - Em <30 minutos: API + Web rodando localmente, login funcional, CRUD de Product funcional

[CRITÉRIO DE ACEITE]
- Quick start funciona em <30 min num computador limpo
- Sem decisões pendentes pro dev no zero — tudo já decidido
- Geradores rodam após clone

[NÃO FAZER]
- Não duplicar código que já está em @ethos/ui — sempre consumir do package
- Não deixar configs hardcoded com valores Ethos no template — placeholders
```

---

## 13. Pacote @ethos/ai-chat

**Quando usar:** template starter validado.

```
[CONTEXTO]
Leia:
- 08-PACOTES-PLUGAVEIS.md (seção "@ethos/ai-chat")

[OBJETIVO]
Criar packages/ai-chat/ como pacote plugável: módulo NestJS pro backend
+ componentes React pro frontend, usando Anthropic Claude.

[TAREFAS]
1. Estrutura packages/ai-chat/:
   - src/server/ (NestJS module)
   - src/client/ (React hooks + components)
   - src/shared/ (types compartilhados)
   - package.json com exports condicionais (./server e ./client)

2. Server (NestJS):
   - AiChatModule (exporta AiChatService, AiChatController)
   - AiChatService:
     - chat(messages, options) → Anthropic SDK
     - streamChat(messages, options) → AsyncIterator
     - Tools dinâmicas (registerTool, executeTool)
     - Suporte a system prompts customizáveis
   - AiChatController:
     - POST /ai-chat (mensagem única)
     - POST /ai-chat/stream (SSE)
     - Multi-tenant: histórico isolado por tenant
   - Schema Prisma a adicionar: ChatConversation, ChatMessage
   - Migration

3. Client (React):
   - useAiChat() hook (gerencia estado do chat, streaming)
   - <ChatWidget /> — widget completo plugável (botão flutuante + janela)
   - <ChatInline /> — inline pro caso de chat em página dedicada
   - Configurável via props: systemPrompt, tools, theme, position

4. Configuração:
   - ANTHROPIC_API_KEY em .env
   - Modelo default: claude-sonnet-4-5 (configurável)
   - Modelo fallback: claude-haiku-4-5 (para tarefas simples)

5. Tools embutidas pro template starter:
   - searchProducts (exemplo demo)
   - createTicket (exemplo demo)
   - Devs adicionam suas próprias via registerTool

6. Storybook stories pro ChatWidget e ChatInline

7. Doc README.md no pacote com:
   - Como instalar no projeto
   - Como registrar tools
   - Como customizar prompt e modelo
   - Como expor no frontend

[CRITÉRIO DE ACEITE]
- Adicionar ai-chat a um produto = 1 import no app.module + 1 component no layout
- Streaming funciona (token por token)
- Tools chamadas pelo modelo executam no backend e retornam ao chat
- Histórico salvo no Postgres por tenant

[NÃO FAZER]
- Não usar OpenAI ou outro provider — Anthropic only por enquanto
- Não criar UI nova de chat — usar componentes de @ethos/ui (Card, Input, Button)
- Não armazenar API key no frontend
```

---

## 14. Pacote @ethos/ai-rag

```
[CONTEXTO]
Leia 08-PACOTES-PLUGAVEIS.md (seção "@ethos/ai-rag").

[OBJETIVO]
Pacote de RAG (retrieval augmented generation) usando pgvector + Anthropic
+ embeddings via Voyage AI ou similar.

[TAREFAS]
1. Schema Prisma: Document, DocumentChunk (com vector(1024))
2. Habilitar pgvector na migration (CREATE EXTENSION IF NOT EXISTS vector)
3. AiRagService:
   - ingest(file | text | url) → chunking + embedding + store
   - query(question, filters) → retrieve top-k + rerank + generate
   - delete(documentId)
4. Suporte a múltiplos chunkers (semantic, fixed-size)
5. Suporte a múltiplos embedders (Voyage, OpenAI — via factory)
6. Endpoint /ai-rag/ingest, /ai-rag/query, /ai-rag/documents
7. Hook useAiRag() no client + componente <RagSearchInput />
8. Multi-tenant: documentos isolados por tenant
9. Ingestão assíncrona via queue (BullMQ + Redis)

[CRITÉRIO DE ACEITE]
- Ingerir PDF → indexar → fazer pergunta → resposta com fontes citadas
- Filtros por tenantId aplicados em todas queries de retrieval
- Performance: query <2s pra base de 10k chunks

[NÃO FAZER]
- Não usar Pinecone, Weaviate, Qdrant — só pgvector
- Não embedar no thread principal — sempre via queue
```

---

## 15. Pacote @ethos/ocr

```
[CONTEXTO]
Leia 08-PACOTES-PLUGAVEIS.md (seção "@ethos/ocr").

[OBJETIVO]
Pacote de OCR usando Claude vision para extrair texto/dados estruturados
de imagens e PDFs (NF, RG, comprovantes, etc.).

[TAREFAS]
1. OcrService:
   - extractText(file) → string
   - extractStructured(file, schema: ZodSchema) → typed object
   - Suporte a PDF (converte páginas em imagens) + JPEG + PNG
2. Integração Claude vision (claude-sonnet-4-5)
3. Schemas pré-prontos: NfeSchema, CpfSchema, CnpjSchema, RgSchema, BoletoSchema
4. Endpoint POST /ocr/extract com upload multipart
5. Hook useOcr() + componente <OcrDropzone />
6. Validação de arquivos (tamanho, tipo)
7. Storage: S3-compatible (Cloudflare R2 default)

[CRITÉRIO DE ACEITE]
- Upload de NF → JSON estruturado válido com produtos, valores, CNPJ
- Upload de RG → nome, CPF, data nascimento estruturados
- Erros tratados (arquivo corrompido, ilegível)

[NÃO FAZER]
- Não usar Tesseract ou OCR tradicional
- Não armazenar arquivos sensíveis sem encryption at rest
```

---

## 16. Pacote @ethos/whatsapp

```
[CONTEXTO]
Leia 08-PACOTES-PLUGAVEIS.md (seção "@ethos/whatsapp").

[OBJETIVO]
Pacote de WhatsApp suportando Z-API (default, mais simples) e WhatsApp
Business API oficial (mais robusto, pra clientes grandes).

[TAREFAS]
1. Adapter pattern:
   - WhatsappAdapter interface
   - ZApiAdapter (default)
   - WabaAdapter (Meta oficial)
2. WhatsappService:
   - sendText(to, message)
   - sendMedia(to, mediaUrl, caption)
   - sendTemplate(to, templateName, params)
   - sendInteractive(to, buttons | list)
3. Webhook endpoint /whatsapp/webhook (recebe mensagens, valida assinatura)
4. Schema Prisma: WhatsappMessage, WhatsappContact, WhatsappTemplate
5. Multi-tenant: cada tenant tem suas credenciais (criptografadas)
6. Hook useWhatsappContacts() + componentes <ContactList />, <ConversationView />
7. Integração nativa com @ethos/ai-chat: criar agente WhatsApp em N comandos

[CRITÉRIO DE ACEITE]
- Enviar mensagem via API → recebido no celular
- Receber mensagem no celular → webhook → salvo no DB → notificação no front
- Trocar adapter (Z-API → WABA) sem mudar código de aplicação
- Credenciais criptografadas at rest

[NÃO FAZER]
- Não armazenar credenciais em texto puro
- Não fazer polling — só webhook
```

---

## 17. Pacote @ethos/google

```
[CONTEXTO]
Leia 08-PACOTES-PLUGAVEIS.md (seção "@ethos/google").

[OBJETIVO]
Pacote de integração com Google: Calendar, Drive, Sheets, Gmail.

[TAREFAS]
1. GoogleAuthService:
   - OAuth2 flow completo (authorize URL, callback, refresh)
   - Storage de tokens (criptografados, por user+tenant)
2. CalendarService: list events, create, update, delete; webhook de mudanças
3. DriveService: list, upload, download, share (com cuidado de permissões)
4. SheetsService: read range, write range, append row
5. GmailService: list threads, send email, watch (push notifications)
6. Hooks frontend: useGoogleConnect(), useCalendarEvents(), etc.
7. Componente <GoogleConnectButton />

[CRITÉRIO DE ACEITE]
- User conecta Google → tokens armazenados → APIs funcionam
- Refresh automático de tokens expirados
- Revogar acesso funcional

[NÃO FAZER]
- Não pedir scopes desnecessários — sempre o mínimo necessário
- Não armazenar tokens em texto puro
```

---

## 18. Pacote @ethos/n8n

```
[CONTEXTO]
Leia 08-PACOTES-PLUGAVEIS.md (seção "@ethos/n8n").

[OBJETIVO]
Wrapper pro n8n permitindo gatilhar workflows e receber resultados de
dentro do produto Ethos sem expor o n8n diretamente.

[TAREFAS]
1. N8nService:
   - triggerWorkflow(workflowId, payload) → executionId
   - getExecutionStatus(executionId)
   - listWorkflows() (read-only)
2. Self-hosted n8n via docker-compose template
3. Webhook reverso: n8n → API → atualiza estado no front via SSE/WebSocket
4. Multi-tenant: cada tenant tem suas credenciais n8n
5. Hooks: useTriggerWorkflow(), useWorkflowStatus()

[CRITÉRIO DE ACEITE]
- Disparar workflow do n8n via clique no produto Ethos
- Status atualizado em tempo real no front
- Erros do n8n surfaceados pro user

[NÃO FAZER]
- Não embutir n8n no monorepo — separado, mesmo Railway project mas service apartado
```

---

## 19. Pacote @ethos/payments

```
[CONTEXTO]
Leia 08-PACOTES-PLUGAVEIS.md (seção "@ethos/payments").

[OBJETIVO]
Pacote unificado de pagamentos: Mercado Pago (default BR), PagSeguro,
Stripe (internacional). Adapter pattern.

[TAREFAS]
1. PaymentsAdapter interface (createCheckout, getPayment, refund, webhook)
2. MercadoPagoAdapter (PIX, cartão, boleto)
3. PagSeguroAdapter
4. StripeAdapter
5. PaymentsService usando o adapter configurado
6. Schema Prisma: Payment, Subscription, Plan
7. Endpoints: POST /payments/checkout, GET /payments/:id, POST /payments/webhook
8. Webhooks com validação de assinatura por adapter
9. Hooks: useCheckout(), usePayment(), useSubscription()
10. Componentes: <PixPayment />, <CheckoutButton />

[CRITÉRIO DE ACEITE]
- Criar checkout PIX → QR code renderizado → pagamento detectado via webhook → status atualizado
- Cartão recorrente funcional (assinatura)
- Trocar adapter sem mudar código de produto

[NÃO FAZER]
- Não armazenar dados de cartão (PCI) — sempre via tokenização do gateway
- Não confiar no front pra atualizar status — só webhook
```

---

## 20. Pacote @ethos/erp-bridge

```
[CONTEXTO]
Leia 08-PACOTES-PLUGAVEIS.md (seção "@ethos/erp-bridge").

[OBJETIVO]
Adapters pra ERPs brasileiros populares: Bling, Tiny, Omie. Sincronização
bidirecional de produtos, pedidos, clientes, estoque.

[TAREFAS]
1. ErpAdapter interface (listProducts, syncProduct, listOrders, etc.)
2. BlingAdapter (API v3)
3. TinyAdapter
4. OmieAdapter
5. ErpBridgeService com queue de sync (BullMQ)
6. Schema Prisma: ErpConnection, ErpSyncLog, ProductExternalId
7. Endpoints: POST /erp/connect, POST /erp/sync, GET /erp/logs
8. Hooks: useErpConnections(), useSyncStatus()
9. Componentes: <ErpConnectorCard />, <SyncProgressBar />

[CRITÉRIO DE ACEITE]
- Conectar Bling → produtos importados → mudança no Bling sincroniza pro Ethos
- Mudança no Ethos sincroniza pro Bling
- Logs de sync visíveis pra debug

[NÃO FAZER]
- Não fazer sync síncrono — sempre queue
- Não confiar em ID interno do ERP — sempre mapear via ProductExternalId
```

---

## 21. Deploy Inicial Railway

**Quando usar:** template starter pronto + pelo menos 2 pacotes plugáveis testados.

```
[CONTEXTO]
Leia 10-DEPLOY-RAILWAY.md (todo).

[OBJETIVO]
Deployar o template starter no Railway como projeto pilote, validando
toda a infra e documentando o processo.

[TAREFAS]
1. Criar projeto Railway "ethos-starter-pilot"
2. Criar serviços:
   - PostgreSQL 16 (com pgvector)
   - Redis 7
   - API (Dockerfile do template)
   - Web (Dockerfile do template)
3. Configurar networking interno (service.railway.internal)
4. Variáveis de ambiente conforme .env.example
5. Domínios:
   - api.starter.ethosoftware.com.br (custom)
   - app.starter.ethosoftware.com.br (custom)
6. GitHub integration: PR cria preview deploy
7. Migrations rodando no startup (release command)
8. Healthchecks configurados
9. Logs centralizados (Railway logs ou Logtail)
10. Validar: registro → login → CRUD Product end-to-end no ambiente real

[CRITÉRIO DE ACEITE]
- Acesso público funcional via custom domain
- Deploy de PR cria URL preview funcional
- Custo mensal documentado (esperado <$60 USD pra esse pilot)

[NÃO FAZER]
- Não expor Postgres pra internet — só interno
- Não armazenar segredos no repo — só Railway Variables
```

---

## 22. Code Review Automatizado

**Quando usar:** rotineiro, sempre que finalizar uma feature.

```
[CONTEXTO]
Leia os arquivos da feature recém-criada e os docs relevantes
(pelo menos 00-FILOSOFIA.md, 01-STACK-DECISOES.md, e o doc específico
da feature).

[OBJETIVO]
Revisar criticamente o código recém-escrito buscando:
- Aderência à stack decidida (sem libs proibidas)
- Aderência ao padrão visual (sem cores fora da paleta, sem CSS-in-JS, etc.)
- Aderência ao padrão de auth (tenant isolation, role checks)
- Tipagem estrita (sem any, sem @ts-ignore não justificado)
- Tratamento de erros
- Logging adequado
- Testes cobrindo casos críticos
- Performance óbvia (N+1, fetch desnecessário)
- Segurança (input validation, output sanitization, secrets)

[FORMATO DE SAÍDA]
- 🔴 Crítico (bloqueia merge): list de issues
- 🟡 Médio (deveria corrigir antes de merge): list
- 🟢 Sugestão (nice to have): list
- ✅ Pontos positivos identificados

[NÃO FAZER]
- Não reescrever — só apontar
- Não aprovar nada com 🔴 aberto
- Não confiar — revalidar contra os docs
```

---

## 23. Debugging

**Quando usar:** quando algo dá errado e você não sabe por onde começar.

```
[CONTEXTO]
Estou com o seguinte problema:
[DESCREVE O PROBLEMA — sintoma observado, esperado, passos pra reproduzir]

Stack relevante: [API / Web / Generator / Pacote]

Logs relevantes:
[COLA OS LOGS]

[OBJETIVO]
1. Diagnosticar a causa raiz (não apenas o sintoma)
2. Propor 2-3 hipóteses ranqueadas por probabilidade
3. Pra cada hipótese, sugerir como validá-la (comando, teste, log adicional)
4. Após validação, propor fix com rationale

[REGRAS]
- Não chutar — sempre validar com evidência
- Considerar primeiro: bug óbvio, depois config, depois infra
- Se for bug em geração de código: verificar o template Handlebars e a config do generator
- Se for bug de tenant isolation: verificar AsyncLocalStorage + Prisma extension
- Se for bug visual: verificar CSS variables ativas + classe .dark + Tailwind merge
```

---

## Padrões Gerais para Todos os Prompts

### Sempre forneça contexto explícito

O Claude Code é poderoso, mas só executa bem o que você comunica bem. **Sempre** referencie os `.md` aplicáveis no início. Não confie que ele "sabe" — faça-o ler.

### Trate o Claude Code como par sênior, não junior

- Aceite que ele questione decisões
- Se ele apontar inconsistência entre docs, pare e resolva
- Se ele propor abordagem diferente, ouça antes de descartar
- Não aceite código que você não entende

### Iteração é parte do processo

Nenhum prompt vai gerar produto perfeito de primeira. O fluxo realista é:

1. Cola prompt
2. Claude Code planeja
3. Você revisa o plano (interrompe se tiver issue)
4. Claude Code executa
5. Você revisa diffs
6. Roda testes
7. Refina ou aceita

### Quando o prompt não cobre — adapte

Esses prompts são pontos de partida. Realidade do projeto vai exigir variações. Mantenha o formato `[CONTEXTO] / [OBJETIVO] / [TAREFAS] / [CRITÉRIO DE ACEITE] / [NÃO FAZER]` quando criar novos.

### Documente o que aprende

Ao longo da construção do Forge, você vai descobrir prompts que funcionam particularmente bem. Adicione-os a este arquivo (ou crie `13-PROMPTS-EXTRAS.md`). A doc evolui com o produto.

---

## Anti-padrões a evitar nos prompts

❌ **Vago demais:**
> "Crie a biblioteca de UI"

✅ **Específico:**
> "Implemente os 5 primitivos do Grupo A (Label, Textarea, Select, Checkbox, Radio) seguindo o doc 04, usando Radix UI quando aplicável, com stories no Storybook"

---

❌ **Sem critério de aceite:**
> "Faça funcionar"

✅ **Mensurável:**
> "Critério de aceite: pnpm --filter ui storybook abre, todos os 5 primitivos catalogados, navegação por teclado funciona em Select e Radio"

---

❌ **Sem bordas:**
> "Implemente auth"

✅ **Com bordas:**
> "Implemente auth conforme doc 07. NÃO usar bcrypt (argon2id). NÃO armazenar JWT em localStorage. NÃO permitir tenantId vir do body."

---

## Encerramento

Esses 23 prompts cobrem a construção end-to-end do Forge. Não são scripts mágicos — são alavancas. A diferença entre construir o Forge em 4 semanas vs 4 meses está em:

1. **Contexto bem dado** (esses docs + esses prompts)
2. **Decisões já tomadas** (toda a doc 00-11)
3. **Curadoria humana** (você revisando diffs)
4. **Iteração rápida** (não acumular dívida — corrigir cedo)

O Claude Code é o multiplicador. A doc é a alavanca. A execução disciplinada é sua.
