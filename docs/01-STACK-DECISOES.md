# 01 — Stack e Decisões Técnicas

> Esse arquivo lista a stack oficial da Forge, com justificativa de cada escolha. Quando aparecer dúvida do tipo "será que mudo X por Y?", releia esse arquivo antes. Mudar stack depois de iniciar é caro — é melhor estar convicto desde o início.

---

## A stack em uma tabela

| Camada | Tecnologia | Versão | Por quê (resumo) |
|--------|-----------|--------|------------------|
| Backend framework | NestJS | 10+ | Estrutura modular padrão, ecossistema maduro |
| ORM | Prisma | 5+ | Schema declarativo, migrations boas, geradores ricos |
| Banco | PostgreSQL | 16+ | Único banco oficial. Cobre 99% dos casos |
| Cache/filas | Redis | 7+ | BullMQ pra filas, cache aplicacional |
| Frontend framework | Next.js | 14+ (App Router) | Padrão de mercado pra dashboards modernos |
| Linguagem | TypeScript | 5+ | Strict em todo lugar |
| Estilo | Tailwind CSS | 3+ | Utility-first, integrado com shadcn |
| Componentes base | shadcn/ui | latest | Copy-paste, customizável |
| Estado servidor | TanStack Query | 5+ | Cache, mutations, sincronização |
| Estado cliente | Zustand | 4+ | Pra estado global pequeno (tema, sidebar collapse) |
| Forms | React Hook Form + Zod | latest | Validação tipada ponta-a-ponta |
| Tabelas | TanStack Table | 8+ | Headless, customizável |
| Charts | Recharts | latest | React-native, fácil de estilizar |
| Geração backend | `@prisma-utils/prisma-crud-generator` | latest | BaseService pronto, modelo de herança |
| Geração frontend | `@hey-api/openapi-ts` | latest | Tipos + hooks TanStack Query |
| IA | Anthropic SDK | latest | Claude Sonnet 4.5 e Haiku 4.5 |
| Vector store | pgvector | latest | Extension do Postgres, simplifica infra |
| WhatsApp | Z-API SDK ou WhatsApp Cloud API | latest | Z-API mais barato, WABA mais oficial |
| OCR/Vision | Anthropic Claude vision | latest | Já temos relação, qualidade alta |
| Mobile | React Native + Expo | 50+ | Compartilha 70% do código com web |
| Monorepo | Turborepo + pnpm | latest | Build paralelo, cache, workspaces |
| Containers | Docker | latest | Postgres + Redis local |
| CI/CD | GitHub Actions | — | Lint, typecheck, test, build, deploy |
| Deploy | Railway | — | API + Web + Postgres + Redis no mesmo lugar |
| Observabilidade | Sentry + OpenTelemetry | latest | Erros + traces |
| Documentação UI | Storybook | 8+ | Catálogo visual da `@ethos/ui` |

---

## Backend: NestJS + Prisma

### Por que NestJS e não Express, Fastify, Hono ou Elysia?

**Express** é o "comum denominador" do Node.js. Tem ecossistema imenso, mas é minimalista demais — você precisa montar tudo (estrutura modular, DI, validation, decorators, swagger, guards) à mão. Pra projeto único pode ser ok. Pra um kit que vai gerar 40+ projetos no padrão Ethos, você precisaria reinventar todo esse boilerplate.

**Fastify** é mais rápido que Express e tem melhor suporte a TypeScript. Boa escolha pra projeto único performance-critical, mas o ecossistema de geradores e plugins maduros é menor.

**Hono** e **Elysia** são frameworks edge-first muito modernos (~2024-2025). Excelentes pra APIs serverless. Mas pra sistemas com lógica de negócio rica e estado em memória (filas, websockets, jobs), o modelo "edge function" é limitante. E o ecossistema ainda é jovem.

**NestJS** é a escolha por três razões fortes:

1. **Estrutura modular forte sem você inventar.** Modules, Controllers, Services, DI, Guards, Interceptors, Pipes — tudo decorator-based e padrão. Todo projeto Ethos terá a mesma cara, e dev novo entende rápido.

2. **Ecossistema de geradores maduro.** `@prisma-utils/prisma-crud-generator`, `nestjs-prisma-crud`, schematics oficiais do Nest CLI — tudo voltado pra gerar código no padrão NestJS. É exatamente o que a Forge precisa.

3. **Camadas transversais nativas.** Multi-tenancy via interceptor, RBAC via guard, audit log via middleware Prisma, swagger automático. Tudo isso é trivial em NestJS, é trabalho em Express.

**Trade-off aceito:** NestJS tem overhead de ~20-30ms por request comparado a Fastify cru. Pra dashboards e sistemas internos isso é irrelevante. Pra alguma API que precisar performance extrema, você pode escrever um service específico em Fastify e expor — mas isso é exceção, não padrão.

### Por que Prisma e não TypeORM, Drizzle ou raw SQL?

**TypeORM** foi o padrão antigo do NestJS. Tem decoradores nas entities, integração nativa com Nest. Mas em 2026 tá perdendo espaço: documentação inconsistente, bugs de migrations, pouca evolução nos últimos anos.

**Drizzle** é a "promessa do futuro" — leve, performático, SQL-like. Boa escolha pra projetos novos focados em performance. Mas ainda tem ecossistema menor de geradores em cima dele, especialmente pra Nest.

**Raw SQL** é honesto e performático, mas perde a tipagem automática e força a Forge a gerar muito mais código (cada query manual).

**Prisma** vence por:

1. **Schema declarativo único** (`schema.prisma`) que vira a fonte de verdade do projeto. Geradores leem esse schema e cospem o resto.
2. **Migrations excelentes**. `prisma migrate dev`, `prisma migrate deploy`, rollbacks claros.
3. **Tipagem perfeita ponta-a-ponta**. Cliente Prisma é fortemente tipado, autocomplete em todo lugar.
4. **Ecossistema de geradores explosivo**. Você adiciona um `generator` no schema e ele cospe DTOs, services, validators, GraphQL types, Zod schemas, o que for.

**Trade-off aceito:** Prisma adiciona ~5-10ms de overhead por query e tem alguns casos exóticos onde você precisa cair pra raw SQL (`$queryRaw`). Aceitável.

---

## Banco: PostgreSQL (sempre)

### Por que Postgres em todo lugar e não MySQL, MongoDB ou banco serverless?

**MySQL** é equivalente em maturidade, mas perde em features modernas (jsonb melhor no Postgres, full-text search melhor no Postgres, extensions como pgvector). E não tem nada que MySQL faça melhor que Postgres pra casos da Ethos.

**MongoDB** é tentador pra dados não-estruturados. Mas pra sistemas com integridade transacional (ERPs, financeiro, agendamento), relacional é o caminho. E quando precisa de schema flexível, Postgres tem `jsonb` que cobre 95% dos casos de Mongo.

**Bancos serverless** (Neon, Supabase, PlanetScale): são todos Postgres ou MySQL gerenciados. Quando a Ethos precisar escalar fora do Railway, migra pra um desses (mantendo Postgres). Não é decisão de "outro banco", é decisão de "mesmo Postgres em outro provider".

### Por que isso simplifica radicalmente

Quando todo projeto usa Postgres:

- **Um banco a dominar.** Time investe profundo em Postgres, vira referência.
- **Mesmas migrations em todo lugar.** `prisma migrate` funciona idêntico.
- **Extensions cobrem casos exóticos:** `pgvector` pra IA, `pg_trgm` pra busca fuzzy, `PostGIS` pra geo, `pg_cron` pra jobs. Não precisa de outro banco.
- **Backup, monitoring, troubleshooting padronizados.** Aprende uma vez, replica em todos os projetos.

**Decisão:** Postgres é o banco oficial da Ethos. Sem exceções. Mesmo se cliente pedir "MongoDB porque está na moda", a Ethos explica por que Postgres atende e segue.

### Versão e configuração padrão

- Postgres 16 (mais recente estável)
- Charset UTF-8
- Collation `pt_BR.UTF-8`
- Extensions habilitadas por padrão: `pgcrypto`, `pg_trgm`, `unaccent`, `vector` (pgvector)

---

## Frontend: Next.js 14 + Tailwind + shadcn

### Por que Next.js 14 (App Router) e não Vite + React puro, Remix ou SvelteKit?

**Vite + React** é leve, rápido, mas vira "monte de decisões" — qual roteador, qual SSR, qual estrutura de pastas. Pra projeto único é ok, pra padrão Ethos cria divergência entre projetos.

**Remix** é excelente arquiteturalmente, mas o ecossistema é menor que Next. Em 2026, contratar dev React que sabe Next é trivial; encontrar dev Remix experiente é raro.

**SvelteKit** é elegante, mas Svelte é minoritário no Brasil. Time da Ethos é React-first, e contratar futuro é mais fácil em React.

**Next.js 14 com App Router** vence por:

1. **Padrão de mercado absoluto** em 2026 pra dashboards e apps web. Documentação enorme, comunidade ativa, evolução constante.
2. **App Router** é o paradigma moderno: server components por padrão, client components quando necessário. Reduz JS no cliente, melhora performance.
3. **Vercel-friendly** (mesmo deployando em Railway, integração com Vercel é fácil quando precisar migrar projeto público).
4. **Ecossistema completo:** shadcn nasceu pensando em Next, TanStack Query funciona perfeitamente, autenticação via NextAuth ou JWT manual é tranquilo.

### Por que Tailwind CSS

Alternativas consideradas: CSS Modules, styled-components, vanilla-extract, UnoCSS, Panda CSS.

Tailwind venceu pelas três razões:

1. **Velocidade de prototipagem absurda.** Dev pensa em design e implementa direto, sem alternar arquivo CSS.
2. **Consistência forçada.** Spacing, colors, typography — tudo do design system. Dev não cria valores aleatórios.
3. **Compatibilidade com shadcn.** shadcn é Tailwind-first. Mudar de Tailwind quebraria toda a biblioteca.

**Trade-off aceito:** classes longas no JSX (`<div className="flex items-center justify-between p-4 rounded-lg border bg-card">`). Aceitável e mitigado com `cn()` helper.

### Por que shadcn/ui

shadcn é uma escolha radicalmente diferente de Material UI, Chakra, Mantine, Ant Design.

**Diferença chave:** shadcn não é uma biblioteca instalada. É um **catálogo de componentes** que você copia o código pra dentro do seu repo e edita à vontade.

Vantagens:

1. **Zero acoplamento com versão externa.** Nunca vai "quebrar quando atualizar shadcn", porque shadcn é só código no seu repo.
2. **Customização total.** Cada componente é seu, edita como quiser. A `@ethos/ui` é construída em cima de componentes shadcn customizados pra refletir identidade Ethos.
3. **Acessibilidade nativa.** shadcn é construído sobre Radix UI primitives, então ARIA e keyboard navigation já vêm prontos.
4. **Tema via CSS variables.** Cada projeto pode ter cores próprias sem fork de biblioteca.

**Trade-off aceito:** você é responsável por manter os componentes (atualizar quando quiser pegar melhorias upstream). Em troca, ganha controle total.

---

## Estado: TanStack Query + Zustand

### TanStack Query pro estado servidor

Tudo que vem de API (lista de clientes, detalhes do produto, dashboard de KPIs) vive em TanStack Query. Cache automático, refetch on focus, mutations com optimistic update, invalidation por query key. É o padrão moderno e os hooks gerados pelo `@hey-api/openapi-ts` já vêm em formato TanStack Query.

### Zustand pro estado cliente

Pra coisas que não vêm de API (tema dark/light, sidebar colapsada, filtros temporários da página) usamos Zustand. É leve (8kb), TypeScript-first, sem boilerplate, sem providers.

Alternativas consideradas:
- **Redux Toolkit:** muito boilerplate pro tamanho de estado que a Forge precisa
- **Jotai:** ótimo pra atomic state, mas curva de aprendizado maior que Zustand
- **Context API puro:** OK pra um valor, ruim pra vários

---

## Forms: React Hook Form + Zod

Padrão de mercado consolidado.

- **React Hook Form** lida com performance (não re-renderiza form inteiro a cada digitação)
- **Zod** define schema de validação tipado, e o mesmo schema vira validador no front e no back (compartilhado via `packages/types`)
- Integração via `@hookform/resolvers/zod`

Todo formulário da Forge segue esse padrão. Nada de Formik, nada de validação manual.

---

## Geração: as duas peças

### Backend: `@prisma-utils/prisma-crud-generator`

Adiciona um generator no `schema.prisma`:

```prisma
generator nestjs_crud {
  provider = "prisma-crud-generator"
  output   = "../src/generated"
}

model Client {
  id        String   @id @default(cuid())
  name      String
  email     String   @unique
  tenantId  String
  ...
}
```

Roda `pnpm prisma generate` e em `src/generated/client/` aparece:
- `client.base.service.ts` — service com findAll, findOne, create, update, delete
- `dto/create-client.dto.ts`, `dto/update-client.dto.ts` — com decoradores de validação

Você cria seu service real estendendo:

```typescript
// src/modules/client/client.service.ts
@Injectable()
export class ClientService extends BaseClientService {
  // Override quando precisar de regra de negócio
  async create(dto: CreateClientDto, user: User) {
    const client = await super.create(dto);
    await this.notify.welcome(client.email);
    return client;
  }
}
```

**Controllers e modules** são gerados por templates Handlebars próprios da Forge (escritos uma vez, usados em todo projeto). Eles seguem o padrão Ethos:

- Guards de auth
- Decoradores de Swagger
- Filtros de tenant automáticos
- Paginação padrão
- Endpoints REST consistentes

### Frontend: `@hey-api/openapi-ts`

NestJS expõe OpenAPI em `/api-docs-json` via `@nestjs/swagger`. O `@hey-api/openapi-ts` lê esse JSON e gera:

- Types TypeScript pra todas as entidades
- Cliente HTTP tipado
- Hooks TanStack Query (`useClients`, `useCreateClient`, etc.)

**Páginas Next.js** são geradas por templates Handlebars próprios da Forge — pra cada entidade, sai uma página de lista (com `<DataTablePro>`), uma de criação (com `<FormBuilder>`), uma de edição.

---

## IA: Anthropic Claude

Stack consolidada de IA da Forge:

- **Claude Sonnet 4.5** — modelo principal pra raciocínio, geração de texto, tool calling
- **Claude Haiku 4.5** — modelo rápido pra classificação, sanitização, tarefas simples
- **OpenAI text-embedding-3-small** — embeddings pra RAG (mais barato e bom o suficiente)
- **pgvector** — vector store no próprio Postgres (sem precisar de Pinecone, Weaviate)
- **LangChain** — quando precisa de agentes complexos com memória e múltiplos passos

Por que essa stack:

1. **Foco em Claude:** time já domina, prompts já refinados, parceria comercial estabelecida (créditos via Anthropic).
2. **Haiku pra economizar:** classificação e tarefas simples vão pra Haiku, que é 10x mais barato que Sonnet.
3. **pgvector ao invés de Pinecone/Weaviate:** simplifica infra. Mesmo Postgres do projeto principal já serve embeddings.
4. **LangChain seletivo:** não usa LangChain pra tudo (overhead grande, abstração às vezes atrapalha). Usa só quando o caso pede orquestração de agentes.

---

## Mobile: React Native + Expo

Quando o projeto pede mobile:

- **React Native** com **Expo** SDK 50+
- **Expo Router** (file-based routing, igual Next.js)
- **NativeWind** (Tailwind no React Native)
- **TanStack Query** pra data fetching (mesmo do web)
- **Zustand** pra estado (mesmo do web)
- Components próprios (não shadcn — shadcn é web only) seguindo identidade Ethos

Compartilhamento de código com web:

- 100% dos types (vindos do `@hey-api/openapi-ts`)
- 100% dos schemas Zod
- 100% das funções utilitárias (`packages/utils`)
- 70% da lógica de fetch (hooks TanStack Query são iguais)
- 0% dos componentes visuais (RN tem componentes próprios)

---

## Monorepo: Turborepo + pnpm

**Turborepo** pra orquestração de tasks (build, dev, test, lint) com cache local e remoto. Build paralelo, só roda o que mudou.

**pnpm workspaces** pra gerenciamento de dependências. Mais rápido que npm/yarn, link entre packages funciona perfeitamente.

Estrutura padrão:

```
packages/  → bibliotecas internas, importáveis por apps e por outros packages
apps/      → aplicações deployáveis
templates/ → repositórios template (clone-and-go)
```

Cada `package` tem seu próprio `package.json`, `tsconfig.json`, e build independente. Versão única no monorepo (não usa changesets pra v1).

---

## Deploy: Railway

Detalhes completos em **`10-DEPLOY-RAILWAY.md`**. Resumo:

- Cada projeto = um project no Railway
- Services do project: API (NestJS), Web (Next.js), Postgres, Redis
- Comunicação interna via `service.railway.internal` (sem custo de egress)
- Deploy automático via GitHub integration
- Preview deploys por PR
- Variáveis de ambiente compartilhadas entre services

**Quando migrar fora do Railway:** se o projeto crescer pra >$200/mês de custo Railway, considera migrar pra Vercel (web) + Railway ou AWS (api + db). Decisão por projeto, não regra geral.

---

## Versionamento da Forge

A Forge é versionada como produto interno:

- **v1.0.0** — primeira versão usável: boilerplate + geradores + biblioteca UI básica + 2 pacotes plugáveis
- **v1.x** — incrementais: novos componentes, melhorias, bugfixes
- **v2.0.0** — quando houver breaking changes na arquitetura ou quando atingir maturidade dos pacotes plugáveis completos

Cada projeto cliente é "carimbado" com a versão da Forge usada na entrega. Atualizar a Forge não obriga atualização de projetos antigos.

---

## Checklist final da stack

Antes de iniciar a construção, time confirma:

- [ ] NestJS 10+ aceito como framework backend único
- [ ] Prisma 5+ aceito como ORM único
- [ ] Postgres 16+ aceito como banco único (sem MongoDB, MySQL, etc.)
- [ ] Next.js 14+ App Router aceito como framework frontend
- [ ] Tailwind + shadcn aceitos como base de UI
- [ ] TanStack Query + Zustand aceitos como gerenciamento de estado
- [ ] React Hook Form + Zod aceitos como solução de forms
- [ ] `@prisma-utils/prisma-crud-generator` aceito pra geração backend
- [ ] `@hey-api/openapi-ts` aceito pra geração frontend
- [ ] Anthropic Claude aceito como provedor principal de IA
- [ ] Turborepo + pnpm aceitos pra monorepo
- [ ] Railway aceito como deploy padrão da v1
- [ ] React Native + Expo aceitos quando houver mobile

Stack fechada. Vamos construir.
