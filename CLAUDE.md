# Ethos Forge — Contexto do Projeto

> Este arquivo é lido automaticamente pelo Claude Code em toda conversa neste repositório.
> Ele te dá o contexto mínimo pra trabalhar com qualidade. Documentação detalhada está em `docs/`.

---

## O que é este projeto

**Ethos Forge** é o kit de partida proprietário da Ethos Software. É um monorepo que contém:

1. **Template clonável** (`templates/starter/`) — base de novos projetos com auth + dashboard + deploy prontos
2. **Geradores de código** (`tools/generators/`) — `schema.prisma` → CRUD backend (NestJS) + páginas frontend (Next.js)
3. **Pacotes plugáveis** (`packages/*`) — UI, IA, WhatsApp, Google, n8n, payments, ERP

Não é DSL própria. Não é low-code. Não é engine complexa. É **kit pragmático com ferramentas open source consolidadas + diferencial proprietário no UI e nas integrações**.

---

## Stack oficial (não negociável)

| Camada           | Tecnologia                                                                              | Versão alvo   |
| ---------------- | --------------------------------------------------------------------------------------- | ------------- |
| Backend          | NestJS + Prisma + PostgreSQL                                                            | 10 / 5 / 16   |
| Frontend         | Next.js App Router + TypeScript + Tailwind                                              | 14 / 5 / 3.4  |
| UI lib           | shadcn/ui customizado + Radix + lucide-react                                            | latest stable |
| Estado           | TanStack Query + Zustand                                                                | 5 / 4         |
| Forms            | React Hook Form + Zod                                                                   | 7 / 3         |
| Hash de senha    | argon2id (NÃO bcrypt)                                                                   | latest        |
| Geração backend  | `@prisma-utils/prisma-crud-generator` + `prisma-generator-nestjs-dto` + templates Forge | latest        |
| Geração frontend | `@hey-api/openapi-ts` + templates Forge                                                 | latest        |
| IA               | Anthropic Claude (Sonnet 4.5 + Haiku 4.5)                                               | API           |
| Vector DB        | pgvector (extension Postgres)                                                           | latest        |
| Queue            | BullMQ + Redis                                                                          | 5 / 7         |
| Mobile           | React Native + Expo                                                                     | latest stable |
| Monorepo         | Turborepo + pnpm workspaces                                                             | latest        |
| Deploy           | Railway (API + Web + Postgres + Redis)                                                  | —             |

**Banco de dados:** Postgres em todo lugar. Sem MongoDB, sem MySQL, sem outro. Quando precisar de algo "diferente", é uma extension do Postgres.

---

## Princípios fundamentais (sempre aplicáveis)

1. **Código gerado = código que escreveríamos à mão.** Output limpo, organizado, legível. Nunca aceitar generator que cospe lixo.

2. **Tudo gerado é editável.** Modelo B do CRUD: gerador cospe `BaseClientService`, dev cria `ClientService extends BaseClientService` quando precisa customizar. Re-rodar generator NUNCA destrói customização do dev.

3. **Multi-tenant desde o sprint 1.** Mesmo projetos single-tenant nascem com infra multi-tenant. `tenantId` propagado via AsyncLocalStorage + Prisma extension. NUNCA permitir que `tenantId` venha do body ou query — só do JWT decodificado.

4. **Princípio do menor privilégio.** Toda permissão é negada por padrão. Roles: `owner > admin > manager > member > viewer`. Endpoints anotam `@Roles(...)` explicitamente.

5. **Identidade visual Ethos é não-negociável.** Sem cores fora da paleta definida em `docs/02-IDENTIDADE-VISUAL.md`. Sem CSS-in-JS (só Tailwind). Sem libs de componentes prontos (Material UI, Chakra, Mantine — todas proibidas). Animações 150-200ms ease-out apenas.

6. **Mobile-first sempre.** Todo componente UI testado em 375px, 768px, 1024px, 1440px no Storybook.

7. **A Forge é IP da Ethos.** Cliente recebe código do projeto dele, mas NÃO recebe a Forge. Generators rodam internamente, output é entregue.

---

## Estrutura do monorepo

```
ethos-forge/
├── CLAUDE.md                  ← Você está aqui
├── docs/                      ← Documentação detalhada (ler sob demanda)
├── apps/
│   └── playground/            ← Next.js vitrine viva — importa todos os packages, NÃO deployado
├── packages/                  ← v1: 7 infra + 8 plugáveis = 15 packages | pós-v1: +9 infra +15 plugáveis = 39 packages (ver docs/13)
│   ├── ui/                    ← @ethos/ui — biblioteca proprietária de componentes
│   ├── auth/                  ← @ethos/auth — tipos e helpers de auth
│   ├── database/              ← @ethos/database — Prisma client wrapper + tipos do schema
│   ├── api-base/              ← @ethos/api-base — módulos NestJS reutilizáveis (multi-tenant, audit, exception filters)
│   ├── config/                ← @ethos/config — tsconfig, eslint, tailwind preset
│   ├── types/                 ← @ethos/types — tipos compartilhados
│   ├── utils/                 ← @ethos/utils — helpers genéricos
│   ├── ai-chat/               ← @ethos/ai-chat — chat com Claude + tools
│   ├── ai-rag/                ← @ethos/ai-rag — RAG com pgvector
│   ├── ocr/                   ← @ethos/ocr — extração via Claude vision
│   ├── whatsapp/              ← @ethos/whatsapp — Z-API + WABA
│   ├── google/                ← @ethos/google — Calendar, Drive, Sheets
│   ├── n8n/                   ← @ethos/n8n — wrapper de workflows
│   ├── payments/              ← @ethos/payments — MP + Stripe + PagSeguro
│   └── erp-bridge/            ← @ethos/erp-bridge — Bling + Tiny + Omie
├── tools/
│   └── generators/            ← Geradores Forge (não publicáveis — fora do workspace pnpm)
│       ├── forge-controller/  ← Gerador de controllers/modules NestJS
│       └── forge-page/        ← Gerador de páginas Next.js
└── templates/
    └── starter/               ← Template clonável de novo projeto
        └── apps/
            ├── api/           ← NestJS deployável (referência) — preenchido nos prompts #7-#9
            └── web/           ← Next.js deployável (referência) — preenchido nos prompts #10-#11
```

Detalhes em `docs/03-ESTRUTURA-MONOREPO.md`.

---

## Mapa da documentação (`docs/`)

**Leia o `.md` específico ANTES de executar tarefas relacionadas.** Cada um é autocontido.

| Arquivo                     | Quando ler                                                                                           |
| --------------------------- | ---------------------------------------------------------------------------------------------------- |
| `00-FILOSOFIA.md`           | Antes de qualquer decisão arquitetural                                                               |
| `01-STACK-DECISOES.md`      | Quando tiver dúvida sobre qual lib/versão usar                                                       |
| `02-IDENTIDADE-VISUAL.md`   | Sempre que tocar em UI (cores, espaçamento, animação)                                                |
| `03-ESTRUTURA-MONOREPO.md`  | Antes de criar package ou app novo                                                                   |
| `04-BIBLIOTECA-UI.md`       | Antes de criar/modificar componente em `@ethos/ui`                                                   |
| `05-GERADORES-BACKEND.md`   | Quando trabalhar nos templates de backend ou no schema Prisma                                        |
| `06-GERADORES-FRONTEND.md`  | Quando trabalhar nos templates de página ou no `@hey-api/openapi-ts`                                 |
| `07-AUTH-MULTI-TENANT.md`   | Sempre que tocar em auth, tenant isolation, roles, ou guards                                         |
| `08-PACOTES-PLUGAVEIS.md`   | Antes de implementar qualquer pacote `@ethos/*` (chat, RAG, OCR, etc.)                               |
| `09-TEMPLATE-STARTER.md`    | Quando trabalhar em `templates/starter/`                                                             |
| `10-DEPLOY-RAILWAY.md`      | Quando configurar deploy ou variáveis de ambiente                                                    |
| `11-ROADMAP-CONSTRUCAO.md`  | Pra entender ordem de construção e dependências                                                      |
| `12-PROMPTS-CLAUDE-CODE.md` | Prompts prontos pra cada fase — fonte de verdade dos passos                                          |
| `13-MANUTENCAO-EVOLUCAO.md` | Pós-v1: versionamento, sprint de upgrade, regra dos 3, packages adicionais (16 infra + 23 plugáveis) |

---

## Regras operacionais

### Antes de codar

- Leia o `.md` relevante em `docs/`
- Confira que a tarefa está alinhada com o roadmap em `docs/11-ROADMAP-CONSTRUCAO.md`
- Se tiver dúvida sobre stack, consulte `docs/01-STACK-DECISOES.md` em vez de escolher por conta

### Durante a codar

- TypeScript strict — proibido `any` sem justificativa em comentário
- Sem `@ts-ignore` sem comentário explicativo
- Imports absolutos via aliases (`@/components/...`) no Next, paths do tsconfig em pacotes
- Commits seguem Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`, etc.)

### Antes de entregar

- Rodar `pnpm lint` na raiz
- Rodar `pnpm typecheck` na raiz
- Rodar `pnpm test` se houver testes na área alterada
- Build local: `pnpm build` no package alterado
- Diff revisado por humano antes de commit

### Sempre proibido

- ❌ Mudar a stack sem antes atualizar `docs/01-STACK-DECISOES.md` e validar com o dev
- ❌ Adicionar libs de UI prontas (MUI, Chakra, Mantine, Ant Design)
- ❌ Usar bcrypt (sempre argon2id)
- ❌ Armazenar JWT em localStorage (sempre cookie httpOnly)
- ❌ Permitir `tenantId` vir do request body/query
- ❌ CSS-in-JS (styled-components, emotion) — só Tailwind
- ❌ Cores fora da paleta de `docs/02-IDENTIDADE-VISUAL.md`
- ❌ Polling onde poderia ser webhook
- ❌ Sync de dados pesados no thread principal — sempre via queue (BullMQ)
- ❌ Armazenar credenciais externas em texto puro — sempre criptografar at rest

---

## Como você (Claude Code) deve agir aqui

Você é tratado como **par sênior**, não como gerador de código cego.

- **Questione** quando algo no prompt parecer inconsistente com a doc
- **Pergunte** quando faltar contexto — não chute
- **Planeje** antes de executar tarefas grandes (>100 linhas de mudança)
- **Resista** a sugestões que violem os princípios deste arquivo, mesmo se vierem do dev — aponte a violação e proponha alternativa alinhada
- **Seja conciso** em explicações — o dev é sênior, não precisa de tutorial
- **Mostre diffs** antes de aplicar mudanças grandes

Quando o dev der uma tarefa do tipo "implementa X", o fluxo esperado é:

1. Identificar quais `.md` em `docs/` são relevantes e ler
2. Resumir o plano em 3-5 bullets
3. Aguardar OK (ou questionar se algo destoar da doc)
4. Executar
5. Reportar o que foi feito + o que precisa de revisão humana

---

## Atalhos úteis

```bash
# Bootstrap do monorepo
pnpm install

# Dev de tudo (Turbo paraleliza)
pnpm dev

# Dev só de um package
pnpm --filter @ethos/ui dev
pnpm playground                                # apps/playground (vitrine viva)
pnpm --filter @ethos-app/api dev               # API do starter (em templates/starter/apps/api/)

# Geradores
pnpm forge:gen:backend       # Roda Prisma generators + Forge controller gen
pnpm forge:gen:frontend      # Roda openapi-ts + Forge page gen

# Banco
pnpm db:migrate              # Aplica migrations pendentes
pnpm db:studio               # Prisma Studio
pnpm db:seed                 # Roda seed

# Qualidade
pnpm lint
pnpm typecheck
pnpm test

# Build
pnpm build                   # Tudo
pnpm --filter @ethos/ui build
```

---

## Versão e estado

**Versão da Forge:** 1.0.0 (em construção)
**Estado atual:** consultar `docs/11-ROADMAP-CONSTRUCAO.md` pra saber o que está pronto e o que vem a seguir.
