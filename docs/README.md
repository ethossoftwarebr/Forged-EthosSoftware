# Ethos Forge — Documentação Técnica

> **O kit de partida proprietário da Ethos Software.** Todo projeto novo nasce com 70% do trabalho repetitivo já feito, mantendo 100% de liberdade pro dev customizar a lógica de negócio.

---

## O que é a Forge

A Forge é o **acelerador interno da Ethos**. Ela tem três peças vivas que evoluem juntas:

1. **Um template de monorepo clonável** — você clica em "Use this template" no GitHub e nasce um projeto novo já com auth funcionando, layout dashboard pronto, conexão com Postgres, deploy configurado.

2. **Geradores de CRUD** — você escreve `model Client {...}` no `schema.prisma`, roda um comando, e sai backend (BaseService + Controller + DTOs no NestJS) e frontend (tipos + hooks TanStack Query + páginas básicas no Next.js) prontos.

3. **Pacotes plugáveis** — biblioteca de componentes UI (`@ethos/ui`), camada de IA (`@ethos/ai-chat`, `@ethos/ai-rag`, `@ethos/ocr`), integrações (`@ethos/whatsapp`, `@ethos/google`, `@ethos/n8n`), pagamentos (`@ethos/payments`), bridges de ERP (`@ethos/erp-bridge`). Cada projeto importa só o que precisa.

**O que a Forge NÃO é:**
- Não é uma DSL própria em YAML
- Não é uma engine de geração complexa
- Não é um Studio web com editor visual
- Não é low-code/no-code

A Forge é simples por design. Cada peça usa ferramentas open source consolidadas no mercado de 2026, e o que é proprietário (a biblioteca de componentes, os templates de páginas, a camada de IA) é onde mora o diferencial real da Ethos.

---

## Como usar essa documentação

Esses arquivos foram pensados pra serem usados junto com o **Claude Code** durante a construção. Cada `.md` cobre uma fatia específica e pode ser referenciado em conversas independentes.

### Ordem sugerida de leitura

1. **`00-FILOSOFIA.md`** — Os princípios que guiam toda decisão da Forge. Lê primeiro pra entender o "porquê" antes de qualquer "como".
2. **`01-STACK-DECISOES.md`** — Stack oficial completa, com justificativa de cada escolha.
3. **`02-IDENTIDADE-VISUAL.md`** — Referências visuais curadas + regras de design Ethos. Define como tudo da Forge vai parecer.
4. **`03-ESTRUTURA-MONOREPO.md`** — Organização de pastas, packages, apps.
5. **`04-BIBLIOTECA-UI.md`** — Catálogo completo de componentes proprietários: API, comportamento, exemplos.
6. **`05-GERADORES-BACKEND.md`** — Como o Prisma CRUD generator funciona, configuração, customização.
7. **`06-GERADORES-FRONTEND.md`** — Como o `@hey-api/openapi-ts` é configurado e como gerar páginas a partir do schema.
8. **`07-AUTH-MULTI-TENANT.md`** — Padrão de autenticação e isolamento entre tenants.
9. **`08-PACOTES-PLUGAVEIS.md`** — Filosofia dos pacotes plugáveis e especificação de cada um (IA, WhatsApp, Google, n8n, payments, ERP).
10. **`09-TEMPLATE-STARTER.md`** — O repositório template que vira ponto de partida de todo projeto.
11. **`10-DEPLOY-RAILWAY.md`** — Setup completo de deploy: API, Web, Postgres, variáveis de ambiente.
12. **`11-ROADMAP-CONSTRUCAO.md`** — Ordem de construção do kit, marcos, dependências entre etapas.
13. **`12-PROMPTS-CLAUDE-CODE.md`** — Prompts prontos pra abrir conversas com Claude Code em cada fase da construção.

---

## Stack oficial (referência rápida)

| Camada | Tecnologia |
|--------|-----------|
| Backend | NestJS 10 + Prisma 5 + PostgreSQL 16 |
| Frontend | Next.js 14 (App Router) + TypeScript + Tailwind CSS + shadcn/ui |
| Estado | TanStack Query + Zustand |
| Forms | React Hook Form + Zod |
| Geração backend | `@prisma-utils/prisma-crud-generator` (BaseService + DTOs) + templates próprios de controller |
| Geração frontend | `@hey-api/openapi-ts` (tipos + hooks TanStack Query) + templates próprios de página |
| IA | Anthropic Claude (Sonnet 4.5 e Haiku 4.5) + LangChain + pgvector |
| WhatsApp | Z-API (oficial não-oficial) ou WhatsApp Business API (Meta) |
| Mobile | React Native + Expo |
| Monorepo | Turborepo + pnpm workspaces |
| Deploy | Railway (API + Web + Postgres + Redis) |
| Storybook | Componentes documentados visualmente |

Detalhes completos das decisões em **`01-STACK-DECISOES.md`**.

---

## Princípios fundamentais da Forge

1. **Código gerado é código que vocês escreveriam à mão.** Output limpo, organizado, legível. Generator ruim = dívida técnica eterna.

2. **Tudo gerado é editável.** Cliente nunca fica preso a código que ninguém consegue mexer. Generator dá ponto de partida, dev customiza livremente.

3. **A Forge é IP da Ethos.** Cliente recebe o código do projeto dele, mas não recebe a Forge. Isso fica explícito em contrato.

4. **Postgres em todo lugar.** Banco oficial da Ethos. Sem exceções. Quando precisar de algo extra, é uma extension do Postgres (jsonb, full-text, pgvector), não outro banco.

5. **Multi-tenant desde o sprint 1.** Mesmo projetos single-tenant nascem com a infra de multi-tenant. Facilita evolução futura e força disciplina.

6. **Princípio do menor privilégio.** Toda permissão é negada por padrão. Roles e policies declarativas.

7. **Mobile-first sempre.** Todo projeto gerado já vem responsivo. Apps nativos compartilham 70%+ do código com a versão web.

8. **Identidade visual Ethos é não-negociável.** A biblioteca de componentes tem cara própria. Não é shadcn cru, não é Material UI, não é cópia de Pipedrive. É Ethos.

---

## Estrutura de pastas (referência rápida)

```
ethos-forge/
├── apps/
│   └── playground/                # App de teste pra ver os componentes em ação
├── packages/
│   ├── ui/                        # @ethos/ui — biblioteca de componentes proprietários
│   ├── api-base/                  # @ethos/api-base — módulos NestJS reutilizáveis
│   ├── ai-chat/                   # @ethos/ai-chat — chat com tools
│   ├── ai-rag/                    # @ethos/ai-rag — RAG sobre dados do tenant
│   ├── ocr/                       # @ethos/ocr — extração de documentos
│   ├── whatsapp/                  # @ethos/whatsapp — agente via Z-API/WABA
│   ├── google/                    # @ethos/google — Calendar, Drive, Sheets
│   ├── n8n/                       # @ethos/n8n — wrapper de workflows
│   ├── payments/                  # @ethos/payments — Mercado Pago, Stripe, PagSeguro
│   ├── erp-bridge/                # @ethos/erp-bridge — Bling, Tiny, Omie
│   └── config/                    # @ethos/config — tsconfig, eslint, tailwind preset
├── templates/
│   └── starter/                   # Template clonável de novo projeto
└── docs/                          # Esta documentação
```

---

## Como conversar com Claude Code sobre cada parte

Use os prompts do arquivo **`12-PROMPTS-CLAUDE-CODE.md`**. Cada prompt foi pensado pra iniciar uma conversa focada em uma parte específica da construção, dando contexto suficiente pro Claude Code entender o objetivo.

---

**Versão da Forge:** 1.0.0 (em construção)
