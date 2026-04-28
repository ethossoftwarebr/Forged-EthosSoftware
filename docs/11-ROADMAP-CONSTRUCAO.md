# 11 — Roadmap de Construção

> Esse arquivo define a **ordem lógica** de construção da Forge. Sem datas, sem prazos. Só sequenciamento de fases e dependências entre elas. Cada fase tem critérios claros de "pronto" pra você saber quando avançar.

---

## Por que essa ordem importa

Construir Forge na ordem errada significa retrabalho. Por exemplo: começar pelo `@ethos/whatsapp` antes de ter `@ethos/api-base` significa que você implementaria multi-tenancy ad-hoc, e depois teria que refatorar.

A ordem abaixo respeita dependências reais e progride do **mais foundational** pro **mais específico**. Cada fase fortalece a anterior.

---

## Visão geral em fases

```
Fase 1: Fundação                    → monorepo + configs + CI
Fase 2: Identidade visual e UI      → biblioteca @ethos/ui
Fase 3: Auth e infraestrutura       → @ethos/auth + @ethos/api-base
Fase 4: Geradores                   → @ethos/generators (back + front)
Fase 5: Template starter            → templates/starter clonável
Fase 6: Validação real              → primeiro projeto real usando a Forge
Fase 7: Pacotes plugáveis           → todos os 8 pacotes, em ordem
Fase 8: Refinamento e v1 estável    → polish + docs + lançamento interno
```

Cada fase é descrita em detalhe a seguir, com critérios objetivos de conclusão.

---

## Fase 1: Fundação

### Objetivo

Ter o monorepo da Forge funcionando com toda infra básica: workspace pnpm, Turborepo, configs compartilhadas, CI rodando.

### O que entregar

- Repositório `ethos-forge` criado no GitHub
- Estrutura de pastas conforme **`03-ESTRUTURA-MONOREPO.md`**
- `package.json` raiz, `pnpm-workspace.yaml`, `turbo.json`
- `tsconfig.base.json` herdado por todos
- `packages/config/` com presets ESLint, Prettier, Tailwind, tsconfig
- `docker-compose.yml` pra Postgres + Redis local
- `.github/workflows/ci.yml` com lint + typecheck + build + test
- README inicial explicando como rodar

### Critérios de pronto

- [ ] `pnpm install` na raiz instala tudo sem erro
- [ ] `pnpm dev` roda algo (mesmo que seja só hello world no `apps/playground`)
- [ ] CI verde no GitHub no primeiro PR
- [ ] Time consegue clonar e rodar localmente sem ajuda

### Não entregar nessa fase

- Componentes UI específicos (vem na Fase 2)
- Auth (vem na Fase 3)
- Geradores (vem na Fase 4)

---

## Fase 2: Identidade visual e biblioteca UI

### Objetivo

`@ethos/ui` com componentes suficientes pra montar qualquer dashboard da Ethos. Ela é a peça mais valiosa da Forge — é onde mora o diferencial visual.

### O que entregar

**Setup:**

- `packages/ui/` configurada com Tailwind, shadcn CLI, Storybook
- Tema Ethos (cores, tipografia, radius, shadows) em CSS variables
- `globals.css` com base styles
- Storybook acessível via `pnpm storybook`

**Primitives (camada 1) — todos os ~30 componentes shadcn customizados:**

- Button, Input, Label, Textarea, Select, Checkbox, Radio, Switch
- Card, Dialog, Sheet, Drawer, Popover, Tooltip, HoverCard
- DropdownMenu, ContextMenu, Tabs, Accordion, Collapsible
- Badge, Avatar, Skeleton, Separator, Progress
- Alert, Toast (Sonner), AlertDialog, Command, ScrollArea
- Calendar, DatePicker

Todos com:

- Tema Ethos aplicado
- Stories Storybook (variantes, dark mode)
- Acessibilidade testada (foco, ARIA, keyboard)

**Compounds (camada 2) — proprietários Ethos:**

- DataTablePro
- FormBuilder
- KpiCard
- EmptyState, ErrorState, LoadingState
- ConfirmDialog (com hook `useConfirm`)
- FiltersPanel
- SearchBar
- Breadcrumb
- PageHeader
- StatGrid
- Timeline
- CommandPalette

**Layouts (camada 3):**

- DashboardLayout (sidebar + topbar + conteúdo)
- AuthLayout (centralizado)
- SettingsLayout (sub-sidebar)

### Critérios de pronto

- [ ] Storybook tem story pra cada componente com pelo menos 3 variantes
- [ ] Dark mode funciona em todos
- [ ] Componentes seguem regras do **`02-IDENTIDADE-VISUAL.md`**
- [ ] `apps/playground` consome todos e exibe demo página
- [ ] Time visualiza e aprova: "isso é Ethos"

### Dependências dessa fase

- Fase 1 concluída (precisa de monorepo funcional)

### Como atacar com Claude Code

Construir componente por componente, usando prompt do **`12-PROMPTS-CLAUDE-CODE.md`**. Cada componente é uma conversa focada. Não tente fazer 30 componentes em uma sessão.

Recomendação: começar pelos primitives mais usados (Button, Input, Card, Dialog). Depois compounds que dependem deles. Layouts por último.

---

## Fase 3: Auth e infraestrutura backend

### Objetivo

Ter `@ethos/auth` e `@ethos/api-base` funcionando. Auth multi-tenant completo, módulos transversais (tenant, audit, encryption, lgpd, pagination).

### O que entregar

**`packages/api-base/`:**

- `tenant/` — interceptor + Prisma extension de multi-tenancy
- `audit/` — middleware de audit log
- `crypto/` — Prisma extension de encryption de campos sensíveis
- `lgpd/` — endpoints de export, delete, consent
- `pagination/` — helpers
- `decorators/` — @CurrentUser, @CurrentTenant, @Roles
- `guards/` — JwtAuthGuard, RolesGuard
- `interceptors/` — TransformResponse, Logging

**`packages/auth/`:**

- Schema Prisma (User, Tenant, TenantMember, RefreshToken, Session, AuditLog)
- Backend: AuthModule, AuthService, AuthController
- Endpoints: register, login, refresh, logout, me, forgot-password, reset-password, invite-member
- JWT strategy, bcrypt, rate limiting
- Frontend: hooks (useAuth, useLogin, useLogout, useUser, useTenant)
- Componentes: LoginForm, RegisterForm, ForgotPasswordForm, TenantSwitcher
- Middleware Next.js de proteção de rotas

### Critérios de pronto

- [ ] É possível registrar tenant + user via API
- [ ] Login devolve access + refresh tokens
- [ ] Refresh funciona, rotação de tokens implementada
- [ ] Multi-tenancy automático no Prisma (queries filtram por tenant)
- [ ] Audit log persiste todas operações de write
- [ ] Encryption funciona pra campos marcados
- [ ] Componentes de login renderizam usando `@ethos/ui`
- [ ] Testes E2E do fluxo de auth completo passando

### Dependências dessa fase

- Fase 1 (monorepo)
- Fase 2 (precisa de @ethos/ui pros componentes de login)

---

## Fase 4: Geradores backend e frontend

### Objetivo

Ter os geradores funcionando: dado um schema Prisma, geram backend completo (BaseService + Controller + Module) e frontend (tipos + hooks + páginas).

### O que entregar

**`tools/generators/`:**

Backend:

- Configuração de `prisma-generator-nestjs-dto` (cospe DTOs)
- Configuração de `prisma-crud-generator` (cospe BaseServices)
- Templates Handlebars próprios:
  - `controller.hbs`
  - `service.hbs` (wrapper que estende Base)
  - `module.hbs`
- Helpers de Handlebars (camelCase, kebabCase, pascalCase, plural, etc)
- Lógica de update do `app.module.ts` entre markers AUTOGEN
- CLI: `forge:generate:backend`

Frontend:

- Configuração de `@hey-api/openapi-ts` (gera tipos + hooks TanStack Query)
- Templates Handlebars próprios:
  - `list-page.hbs`
  - `create-page.hbs`
  - `edit-page.hbs`
  - `view-page.hbs`
  - `sidebar-config.hbs` (atualiza sidebar entre markers)
- Inferência de:
  - Ícone Lucide a partir do nome do model
  - Tipo de campo (text, email, date, select, etc) a partir do schema
  - Schema Zod a partir do Prisma type
- CLI: `forge:generate:frontend`

### Critérios de pronto

- [ ] Adicionar model `Client` no schema, rodar gerador, e ter:
  - Backend: ClientController, ClientService, ClientModule funcionando
  - Frontend: páginas /clients (lista), /clients/new, /clients/[id], /clients/[id]/edit
  - Sidebar com item "Clientes" + ícone Users
- [ ] Endpoints REST funcionam: GET, POST, PATCH, DELETE
- [ ] Multi-tenancy funcionando automaticamente
- [ ] Frontend consome API tipada (autocomplete em todo lugar)
- [ ] Customizar `ClientService` (override de método) não quebra na regeneração
- [ ] Markers AUTOGEN preservam código entre eles
- [ ] Pelo menos 3 entidades diferentes geradas com sucesso (Client, Order, Product)

### Dependências dessa fase

- Fase 3 (precisa de @ethos/api-base e @ethos/auth pra os controllers usarem)

---

## Fase 5: Template starter

### Objetivo

Ter `templates/starter/` configurado como GitHub Template repo, completo com tudo do **`09-TEMPLATE-STARTER.md`**.

### O que entregar

- Estrutura completa do starter com:
  - `apps/api/` (NestJS configurado)
  - `apps/web/` (Next.js App Router configurado)
  - `packages/shared/` (types compartilhados)
  - Configurações: docker-compose, turbo, pnpm, env example
  - Schema Prisma inicial com models de auth
  - Seed inicial (tenant demo + user admin)
  - Layout dashboard básico funcionando (importando @ethos/ui)
  - Login/registro funcionando (importando @ethos/auth)
- README detalhado pro dev seguir
- `.github/workflows/ci.yml`
- Configurado como Template Repository no GitHub
- Documentação de deploy Railway anexada

### Critérios de pronto

- [ ] Clone via "Use this template" funciona
- [ ] Setup local em <30 min: `pnpm install`, `db:up`, `db:migrate`, `db:seed`, `dev`
- [ ] Login com `admin@demo.com / admin123` funciona
- [ ] Adicionar model novo + gerar funciona end-to-end
- [ ] Deploy Railway baseado nesse template funciona em <1 hora
- [ ] CI verde no template

### Dependências dessa fase

- Fases 2, 3, 4 todas concluídas

---

## Fase 6: Validação com projeto real

### Objetivo

Construir um projeto real (cliente real ou projeto interno) usando a Forge. Validar que o kit funciona, identificar gaps, melhorar.

### Como escolher o projeto piloto

Critérios:

- Escopo médio (~3-6 entidades, sem complexidade exótica)
- Cliente disposto a ser "primeira validação"
- Domínio bem definido
- Sem necessidade urgente dos pacotes plugáveis (eles vêm depois)

Sugestões:

- Sistema interno da Ethos (CRM próprio, painel de propostas, painel de projetos)
- Cliente conhecido com necessidade simples (gestão de clientes + agendamento)

### O que entregar

- Projeto real entregue funcionando com:
  - Auth funcionando
  - Pelo menos 4 entidades CRUD
  - Customizações de lógica de negócio
  - Deploy em Railway
  - Cliente acessando e usando

- Lista de issues encontradas durante o uso. Categorias:
  - Bug na Forge
  - Componente faltando na @ethos/ui
  - Padrão estranho que precisa refinar
  - Documentação confusa

- Issues priorizadas e atacadas antes da Fase 7

### Critérios de pronto

- [ ] Projeto piloto em produção há pelo menos 2 semanas
- [ ] Cliente usando regularmente sem reportar bugs críticos
- [ ] Time da Ethos validou: "agora vale a pena usar Forge em todos os projetos"
- [ ] Pelo menos 5 issues identificadas na Forge foram resolvidas

### Dependências dessa fase

- Fase 5 concluída (template starter precisa estar pronto)

---

## Fase 7: Pacotes plugáveis

### Objetivo

Construir todos os 8 pacotes plugáveis. Cada pacote é um sub-projeto, com sua própria sequência interna de construção.

### Ordem sugerida e justificativa

#### 7.1 — `@ethos/ai-chat`

**Por que primeiro:** valida o padrão de pacote plugável (backend + react + shared). É o mais usado em demos comerciais. Stack já dominada pela Ethos (Anthropic).

**Entregar:**

- Schema Prisma (ChatSession, ChatMessage)
- AiChatModule com configuração via forRoot
- Endpoints REST + streaming SSE
- Tool calling com tipo seguro
- Hooks: useChatSession, useSendMessage
- Componente ChatWidget drop-in
- 2-3 tools de exemplo no playground

**Critério de pronto:** ChatWidget no playground responde mensagens, chama tools, persiste histórico.

#### 7.2 — `@ethos/ocr`

**Por que segundo:** complementar ao ai-chat (usa mesma SDK Anthropic via Vision). Pequeno em escopo. Resolve caso de uso comum (auto-preenchimento via foto de RG).

**Entregar:**

- OcrService com método `extract` genérico (recebe schema Zod)
- Helpers específicos: extractRg, extractCnh, extractInvoice, extractReceipt
- Endpoints multipart pra upload
- Hook useOcr e componente FileUploadOcr
- Integração com FormBuilder pra auto-preencher

**Critério de pronto:** upload de foto de RG no playground preenche campos do form automaticamente.

#### 7.3 — `@ethos/google`

**Por que terceiro:** introduz padrão de OAuth 2.0 com terceiros (será reusado em outros pacotes). Resolve casos comuns (calendar, drive).

**Entregar:**

- Schema Prisma (GoogleConnection)
- OAuth flow completo (auth URL, callback, refresh)
- APIs: Calendar, Drive, Sheets
- Tokens encriptados via Prisma extension
- Hooks e componentes (botão de conectar, gerenciar)

**Critério de pronto:** playground permite conectar Google, listar eventos do calendar, fazer upload pro drive.

#### 7.4 — `@ethos/n8n`

**Por que quarto:** wrapper simples sobre API do n8n. Não tem schema Prisma próprio. Constrói rápido.

**Entregar:**

- N8nService com triggerWorkflow, listExecutions, etc
- Configuração via forRoot
- Componentes pra UI de workflows (lista, executions)
- Documentação de como subir n8n no Railway

**Critério de pronto:** triggar workflow do playground via API e ver execução listada.

#### 7.5 — `@ethos/whatsapp`

**Por que quinto:** alta demanda comercial. Mais complexo (provider duplo: Z-API e WABA). Beneficia-se da experiência de OAuth do `google`.

**Entregar:**

- Schema Prisma (WhatsappContact, Conversation, Message)
- Adapters: ZapiAdapter, WhatsappBusinessAdapter
- Endpoints de envio (text, media, template, interactive)
- Webhook handler (validação de assinatura)
- Componente ConversationsList + ConversationView
- Integração opcional com `@ethos/ai-chat` pra chatbot

**Critério de pronto:** playground envia mensagem WhatsApp via API, recebe respostas via webhook, exibe conversation.

#### 7.6 — `@ethos/ai-rag`

**Por que sexto:** depende de pgvector (precisa habilitar no Postgres). Mais complexo (chunking, embedding, retrieval). Casos de uso menos universais que ai-chat.

**Entregar:**

- Schema Prisma (Document, DocumentChunk com vector)
- Pipeline de ingestão (parse → chunk → embed → save)
- Suporte a PDF, DOCX, TXT, HTML, URL
- Endpoint de busca semântica
- Endpoint de "ask" (RAG completo)
- Hooks: useRagAsk, useIngestDocument
- Componente RagAssistant

**Critério de pronto:** playground permite upload de PDF, fazer pergunta, receber resposta com fontes citadas.

#### 7.7 — `@ethos/payments`

**Por que sétimo:** crítico em segurança. Mais complexo (3 providers, métodos diversos, webhooks). Beneficia-se de tudo aprendido nos pacotes anteriores.

**Entregar:**

- Schema Prisma (PaymentCustomer, Payment, Subscription)
- Adapters: MercadoPagoAdapter, StripeAdapter, PagSeguroAdapter
- API unificada: createPayment, refundPayment, etc
- Subscription management
- Webhook handlers com validação de assinatura
- Componente Checkout drop-in
- Reconciliação automática (job cron)

**Critério de pronto:** playground completa pagamento via cartão e via Pix, recebe webhook de aprovação, lista pagamento no histórico.

#### 7.8 — `@ethos/erp-bridge`

**Por que oitavo:** mais complexo (3 ERPs, cada um com sua API). Caso de uso menos universal que payments. Pode ser construído sem pressão.

**Entregar:**

- Schema Prisma (ErpProduct, ErpOrder, ErpInvoice — opcional, pode ser camada de cache)
- Adapters: BlingAdapter, TinyAdapter, OmieAdapter
- API unificada: produtos, pedidos, NFe, estoque
- Sincronização (pull manual + webhook)
- Mapeamento de campos documentado
- Reconciliação diária automática

**Critério de pronto:** playground configura Bling, lista produtos sincronizados, cria pedido que vai pro Bling.

### Critérios gerais pra cada pacote estar pronto

- [ ] Implementação backend completa (módulo + service + controller + endpoints)
- [ ] Implementação frontend (hooks + componentes)
- [ ] Testes unitários da lógica core (>70% coverage)
- [ ] Documentação no README do pacote
- [ ] Demo funcional no `apps/playground`
- [ ] Considerações de segurança implementadas (rate limit, encryption, audit log)
- [ ] Multi-tenancy funcionando

### Dependências dessa fase

- Fase 6 concluída (validação com projeto real garante que a base é sólida)

---

## Fase 8: Refinamento e v1 estável

### Objetivo

Polir tudo. Documentação completa. CHANGELOG. Versionamento. Lançamento interno oficial.

### O que entregar

- Toda documentação revisada e atualizada
- README de cada pacote escrito
- CHANGELOG.md com histórico
- Versão `1.0.0` taggeada no repo
- Demo session com time da Ethos: tour completo da Forge
- Treinamento dos devs juniors sobre como usar
- Lista pública (interna) de "como começar projeto novo com Forge"
- Plano de manutenção e evolução pós-v1

### Critérios de pronto

- [ ] Tag `v1.0.0` criada no GitHub
- [ ] Time inteiro da Ethos sabe usar a Forge
- [ ] Pelo menos 2 projetos cliente foram entregues usando Forge
- [ ] Documentação consultada de forma autônoma pelos devs (sem precisar perguntar)
- [ ] Métricas básicas: tempo médio de setup de projeto novo (target: <2 horas), tempo de geração de CRUD novo (target: <5 min)

---

## Mapa de dependências entre fases

```
Fase 1 (Fundação)
   ↓
Fase 2 (UI) ←──── pode ser paralela à Fase 3
   ↓
Fase 3 (Auth + api-base)
   ↓
Fase 4 (Geradores) ──── precisa de Fases 1, 2, 3
   ↓
Fase 5 (Starter) ──── precisa de Fases 1-4
   ↓
Fase 6 (Validação real) ──── precisa de Fase 5
   ↓
Fase 7 (Pacotes plugáveis) ──── pode começar em paralelo à Fase 6 quando ela estabiliza
   ↓
Fase 8 (v1 estável) ──── todas as anteriores
```

Fases 2 e 3 podem ser paralelas (UI e auth são independentes — auth só depende da UI quando vai construir os componentes de login).

Fases 7.1 a 7.8 podem ter alguma paralelização se houver mais de uma pessoa construindo (ai-chat e ocr podem ser feitos em paralelo, por exemplo).

---

## Como saber se estou progredindo

A cada fase concluída, fazer auto-avaliação:

1. **Critérios de pronto da fase atendidos?** Se não, não avança.
2. **Time consegue usar o que foi entregue sem ajuda?** Se não, faltou docs ou polish.
3. **Bugs conhecidos foram resolvidos?** Não pode ter "bugs aceitos" se acumulando.
4. **Próxima fase está clara?** Se não, releia o roadmap.

Não tem prazo. Tem **qualidade de entrega**. Cada fase atravessada com qualidade reduz o tempo das próximas.

---

## Riscos identificados e mitigação

### Risco 1: escopo da `@ethos/ui` cresce demais

**Mitigação:** stick com a lista oficial do **`04-BIBLIOTECA-UI.md`**. Componente novo só entra após aparecer em 3 projetos.

### Risco 2: geradores ficam complexos demais

**Mitigação:** templates Handlebars são burros e legíveis. Se precisar de lógica complexa, refator pra script TypeScript que orquestra o template.

### Risco 3: pacotes plugáveis viram zoo de dependências

**Mitigação:** cada pacote tem `package.json` próprio com dependencies isoladas. Projeto cliente instala só o que usa.

### Risco 4: time não consegue usar a Forge sem você

**Mitigação:** Fase 8 inclui treinamento. Documentação é tão importante quanto código. Se ninguém entende, não tem valor.

### Risco 5: cliente percebe que tudo é "gerado" e desvaloriza

**Mitigação:** narrativa comercial clara. Forge é diferencial competitivo, não economia de tempo. Cliente paga pela qualidade do output, não pela hora de codificar.

---

## Critério final de "Forge v1 está pronto"

A Forge v1 está pronta quando:

1. Ethos consegue iniciar projeto novo cliente em **menos de 2 horas** (do clique em "Use this template" até deploy funcional inicial).
2. Adicionar entidade nova com CRUD completo leva **menos de 10 minutos**.
3. Pelo menos **2 projetos cliente** foram entregues usando a Forge.
4. **Time inteiro** da Ethos (4 pessoas) sabe operar a Forge sem ajuda.
5. Os **8 pacotes plugáveis** estão implementados e validados em projeto real.

Atingidos esses 5 critérios, é v1.0.0 taggeada e festa. Daí pra v2 vem refinamento, novos componentes, mais integrações.
