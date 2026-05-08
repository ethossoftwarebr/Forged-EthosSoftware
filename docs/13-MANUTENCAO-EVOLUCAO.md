# 13 — Manutenção e Evolução da Forge

> Esse arquivo trata do que acontece **depois da v1.0** ser taggeada. Como a Forge envelhece com saúde, como atualizar tecnologias sem quebrar projetos cliente já entregues, como adicionar componentes/packages novos sem virar zoológico, e como manter a produtividade ao longo dos anos.
>
> **Princípio central:** a Forge é uma ferramenta viva, mas **estável por design**. Mudanças entram com critério; o ritmo é lento porque a base precisa ser confiável.

---

## 1. O dilema fundamental da Forge

Toda kit/framework enfrenta a mesma tensão:

- Se atualiza pouco → fica desatualizado, devs reclamam, projetos novos nascem com tech debt
- Se atualiza muito → quebra projetos cliente entregues, churn de breaking changes, manutenção custa caro

A Forge resolve isso com **três camadas de imutabilidade**:

| Camada                                                        | Velocidade de mudança                      | Quem define                        |
| ------------------------------------------------------------- | ------------------------------------------ | ---------------------------------- |
| **Cliente entregue** (v1.0 da Forge → projeto da Barbearia X) | Congelado na versão. Não atualiza sozinho. | Cliente decide se contrata upgrade |
| **Template starter** (`templates/starter/`)                   | Atualiza com cada versão da Forge          | Ethos define                       |
| **Packages internos** (`@ethos/ui`, `@ethos/auth`, etc.)      | Versionados independentemente              | Ethos define, com semver           |

Isso significa: o cliente da Barbearia que recebeu o projeto em janeiro com Forge v1.0 vai rodar Forge v1.0 pra sempre, **a menos que contrate um upgrade**. Isso é normal e bom — zero surpresa, zero quebra inesperada.

---

## 2. Versionamento

### 2.1 Cada package tem versão própria

`@ethos/ui` em `2.0.0` não obriga `@ethos/whatsapp` a ir pra `2.0.0`. Cada package tem ciclo próprio.

```
@ethos/ui            → 2.4.1
@ethos/auth          → 1.8.0
@ethos/api-base      → 1.5.3
@ethos/whatsapp      → 1.2.0
@ethos/payments      → 3.0.0  ← já passou por 2 majors
```

Cliente atualiza só o que faz sentido. Quer só pegar correções de UI sem mexer em pagamentos? Sobe `@ethos/ui` e mantém o resto.

### 2.2 Semver estrito

- **patch** (`1.0.0` → `1.0.1`) — bugfix, não muda API, não muda comportamento esperado
- **minor** (`1.0.0` → `1.1.0`) — feature nova, backwards-compatible (consumidor antigo continua funcionando)
- **major** (`1.0.0` → `2.0.0`) — breaking change (precisa migration guide)

### 2.3 Forge tem versão "umbrella"

Forge global tem versão própria que sinaliza "qual snapshot de packages é considerado coerente":

```
Forge v1.0 = @ethos/ui@1.0 + @ethos/auth@1.0 + ... (snapshot inicial)
Forge v1.1 = @ethos/ui@1.2 + @ethos/auth@1.0 + @ethos/payments@1.5 + ...
Forge v2.0 = @ethos/ui@2.0 + @ethos/auth@2.0 + ... (após sprint de major upgrade)
```

Template starter referencia versões pinned dessa "umbrella". Projeto cliente nasce com Forge v1.x e fica nele.

### 2.4 Pre-1.0 (estado atual da v1 em construção)

Enquanto Forge não atinge v1.0, todos os packages internos seguem `0.x.y` — qualquer mudança pode ser breaking. Estabilidade vem com a tag `v1.0.0` (ver `11-ROADMAP-CONSTRUCAO.md` Fase 8).

---

## 3. Sprint de upgrade (cadência regular)

A cada **3-6 meses**, ou quando uma stack-base lança major, a Ethos faz **sprint dedicado de upgrade**:

### 3.1 Gatilhos pra disparar sprint

- **Major do Next.js** (Next 14 → 15 → 16…) — sempre dispara
- **Major do NestJS** (10 → 11 → 12…) — sempre dispara
- **Major do TypeScript** (5 → 6 → 7…) — sempre dispara
- **Major do Prisma** — sempre dispara
- **Major do React** (18 → 19 → 20…) — sempre dispara
- **CVE crítica** em dep de `@ethos/auth`, `@ethos/api-base`, `@ethos/payments` — dispara emergencial
- **Componente shadcn/Radix novo que apareceu em 3+ pedidos de cliente** — entra na fila do próximo sprint

### 3.2 Estrutura do sprint

```
Semana 1: Avaliação
  - Listar majors disponíveis (TS, Node, Next, Nest, React, Prisma)
  - Ler changelogs e migration guides
  - Identificar packages afetados
  - Estimar esforço

Semana 2: Atualização "lab"
  - Branch dedicada, ramo a partir de main
  - Atualizar deps em packages/ um a um
  - Rodar typecheck/build/test
  - Resolver breaking changes
  - Atualizar templates Handlebars dos generators (se API mudou)

Semana 3: Validação
  - Rodar todos generators com schema demo
  - Verificar que template starter clona e roda
  - Smoke test em apps/playground
  - Testar build de produção em todos packages

Semana 4: Release
  - Bump de versões dos packages afetados
  - CHANGELOG.md atualizado
  - Migration guide se houver breaking
  - Tag Forge vN.M
  - Update do template starter
  - Anúncio interno aos devs Ethos
```

### 3.3 Regra de ouro

**Nunca atualizar deps em produção (cliente entregue) sem upgrade explícito contratado.** O sprint atualiza só Forge → novos projetos a partir do sprint usam a nova versão. Projetos antigos ficam.

---

## 4. Componentes UI novos — regra dos 3 projetos

### 4.1 O problema

Toda semana sai componente novo. Shadcn lança. Radix lança. Lib X.Y.Z. Devs querem incluir tudo. Resultado: lib bloated, manutenção exponencial.

### 4.2 A regra

**Componente novo só entra na `@ethos/ui` quando:**

1. **Aparece em pelo menos 3 pedidos diferentes** de projeto cliente, OU
2. **Resolve uma classe de problema** que a Ethos prevê em mais de 50% dos projetos futuros (ex: Calendar quando começou a vender muito agendamento)

### 4.3 Entre o pedido e a inclusão

Quando cliente pede algo único, opções:

| Opção                                              | Quando usar                                                                        |
| -------------------------------------------------- | ---------------------------------------------------------------------------------- |
| **Implementar no projeto cliente** (não na lib)    | Quase sempre. Componente vive em `apps/web/src/components/` do projeto cliente.    |
| **Implementar como custom em cima do `@ethos/ui`** | Quando estende um primitivo existente (ex: `<DataTablePro>` envolto pra cliente X) |
| **Promover pra `@ethos/ui`**                       | Só quando regra dos 3 projetos for atingida                                        |

### 4.4 Processo de promoção

Quando 3º cliente pede o mesmo componente:

1. Abrir issue na Forge: "Promove `<Componente>` para @ethos/ui"
2. Coletar 3 implementações dos projetos cliente (provavelmente diferentes entre si)
3. Sintetizar API genérica que cobre os 3 casos
4. Implementar em `packages/ui/src/components/<componente>/`
5. Adicionar story Storybook com 5+ variantes
6. Documentar em `04-BIBLIOTECA-UI.md`
7. Bump minor de `@ethos/ui`
8. Refatorar projetos cliente pra usar a versão promovida (no próximo upgrade contratado)

---

## 5. Packages novos — quando criar

### 5.1 A mesma regra dos 3

Mesmo critério aplica pra package novo:

- 3 projetos pedem integração com Mailchimp → criar `@ethos/email-marketing`
- 3 projetos pedem mapas → criar `@ethos/maps`
- 1 projeto pede integração com plataforma X obscura → fica no projeto, não vira package

### 5.2 Roadmap conhecido vs reativo

A Forge tem dois tipos de packages futuros:

**Conhecidos (planejados):** packages de infra essencial que sabemos que precisamos cedo (ver §6 abaixo). Esses entram no roadmap antes da regra dos 3.

**Reativos:** packages plugáveis adicionais que só entram depois da regra dos 3 (ver lista em `08-PACOTES-PLUGAVEIS.md`).

### 5.3 Antes de criar package novo, verifique

- [ ] Há código duplicado entre 3+ projetos cliente que esse package consolidaria?
- [ ] A integração tem padrões reutilizáveis (não é só "API call específica")?
- [ ] Vale o custo de manutenção? (TypeScript, testes, docs, CI, security review)
- [ ] Nenhum package existente já cobre 80% do caso?

Se 4 sins → cria. Se algum não → mantém no projeto cliente.

---

## 6. Roadmap de packages de infra adicionais (pós-v1)

Esses entram **antes** da regra dos 3 porque são previsíveis (todo sistema sério precisa). Ordem por urgência:

| Package                | Quando criar              | Resolve                                                             |
| ---------------------- | ------------------------- | ------------------------------------------------------------------- |
| `@ethos/storage`       | **v1.1 (logo após v1.0)** | Upload S3/R2/MinIO, signed URLs — 90% dos projetos sobem fotos/docs |
| `@ethos/email`         | **v1.1**                  | Resend/SendGrid — toda auth manda email (recovery, invite)          |
| `@ethos/notifications` | **v1.1**                  | Sino do dashboard + push web + email unificados                     |
| `@ethos/queue`         | **v1.1**                  | BullMQ standalone — hoje vive dentro do api-base, vai ficar grande  |
| `@ethos/cache`         | v1.2                      | Redis wrapper + invalidação por tags                                |
| `@ethos/i18n`          | v1.2                      | pt-BR + en + es — formatação de datas/números/moeda                 |
| `@ethos/pdf`           | v1.3                      | Geração de PDF (relatórios, contratos, recibos)                     |
| `@ethos/search`        | v1.3                      | Postgres FTS ou Meilisearch — busca real em listagens grandes       |
| `@ethos/observability` | v1.4                      | Sentry + healthchecks + métricas unificadas                         |

Total pós-v1.0: **9 infras adicionais → 16 infras totais**.

> Detalhe: `@ethos/queue` standalone vai puxar a logic de queue que hoje vive em `@ethos/api-base`. É quebra de API menor, justifica major do `api-base` (`1.x → 2.x`). Migration guide trivial.

---

## 7. Plugáveis adicionais (mapa pós-v1)

Os 8 plugáveis originais vêm na v1.0. Os 15 listados em `08-PACOTES-PLUGAVEIS.md` (de §9 até §23) só entram **se** a regra dos 3 projetos for atingida.

Não há roadmap fixo. É demand-driven.

Lista de monitoramento (criar quando 3 projetos pedirem):

- `@ethos/whisper` — transcrição de áudio
- `@ethos/maps` — Google Maps + Mapbox + geocoding
- `@ethos/sms` — Twilio + Zenvia
- `@ethos/signature` — D4Sign + ClickSign + DocuSign
- `@ethos/nfse` — emissão de NFS-e municipal
- `@ethos/marketplaces` — Mercado Livre + Shopee + Amazon
- `@ethos/social` — Instagram Graph + TikTok Business
- `@ethos/email-marketing` — Mailchimp + Brevo + RD Station
- `@ethos/scheduling` — agendamento avançado (slots, blackouts)
- `@ethos/iot-telemetry` — MQTT + sensores
- `@ethos/crm-bridge` — RD CRM + HubSpot + Pipedrive
- `@ethos/contabilidade` — Conta Azul + Asaas
- `@ethos/pix-direto` — Pix via PSP (separado de payments)
- `@ethos/loyalty` — cashback + pontos + cupons
- `@ethos/reviews` — Google My Business + reviews internos

---

## 8. Estratégia para cliente legado

### 8.1 O que acontece quando cliente tem projeto entregue há 1 ano

Cenário: cliente da Barbearia recebeu projeto em janeiro com Forge v1.0. Hoje é dezembro, Forge está em v2.5. Cliente reporta um bug.

**Fluxo:**

1. Bug é em código gerado/customizado do cliente (não na Forge)? → Conserta direto no projeto. Forge não envolvida.
2. Bug é no `@ethos/ui` v1.0? → Verifica se foi corrigido em alguma versão posterior. Se sim, opções:
   - **Opção A (simples):** backport do fix pra `@ethos/ui@1.0.x` (patch). Cliente atualiza só esse package. Pequeno, sem risco.
   - **Opção B (upgrade contratado):** cliente contrata upgrade pra Forge v2.x (cobrança separada).
3. Bug é vulnerabilidade de segurança? → Backport obrigatório, cliente atualiza, sem cobrança extra (responsabilidade da Ethos).

### 8.2 Política de suporte (definir antes do v1.0)

A Ethos precisa decidir e formalizar (sugestão):

- **Forge v1.x: suporte por 24 meses após release** (security patches + critical bugfixes)
- **Forge v2.x em diante: 24 meses cada major**
- **Após 24 meses:** cliente precisa contratar upgrade ou roda por conta própria

Isso vai pra contrato comercial. Documentar antes de v1.0.

### 8.3 Banco de migration guides

Toda major bump tem documento dedicado em `docs/migrations/`:

```
docs/migrations/
├── ui-v1-to-v2.md              # Como atualizar @ethos/ui v1 → v2
├── auth-v1-to-v2.md
├── api-base-v1-to-v2.md
└── forge-v1-to-v2.md           # Umbrella — links pros individuais
```

Cada migration guide tem:

- Lista de breaking changes
- Substituições mecânicas (ex: `<Button variant="primary">` → `<Button variant="default">`)
- Checklist de validação pós-migração
- Estimativa de tempo (em horas)
- Codemods se aplicável (jscodeshift)

---

## 9. Avaliação de stack (quando "trocar" é justificável)

Stack travada hoje (`docs/01-STACK-DECISOES.md`):

- Backend: NestJS + Prisma + Postgres
- Frontend: Next.js + Tailwind + shadcn customizado
- Auth: argon2id + JWT cookie httpOnly

A regra: **só trocar uma peça da stack se um destes critérios for atingido:**

1. **Descontinuação anunciada** (mantenedor abandona, projeto morre) — raro mas acontece
2. **Vulnerabilidade arquitetural** sem fix viável (ex: framework não suporta padrão de segurança que virou obrigatório)
3. **Performance crítica** que outra stack resolveria 10x melhor — e isso afeta múltiplos clientes
4. **Custo proibitivo** que outra stack reduziria significativamente

Não trocar stack por:

- Hype ("Bun é mais rápido")
- Preferência pessoal de dev novo
- Tendência sem dados ("todo mundo está usando X")
- "Mais bonito" (subjetivo)

Mudança de stack = forks da Forge inteira = projetos cliente legados não migram fácil. **É decisão custosa.**

### 9.1 Forks de versão para estabilidade

Algumas deps são tão importantes que vale **lockar major** mesmo após sprint de upgrade global:

- **Anthropic SDK** — API muda às vezes, lock major. Avaliar a cada 6 meses.
- **Stripe SDK** — lock major. Avaliar quando lançar major novo.
- **Mercado Pago SDK** — lock e revisar manual.
- **Prisma** — sprint dedicado pra cada major (Prisma 5 → 6).

Lock significa: sprint global atualiza tudo _menos_ esses. Esses têm sprint próprio.

---

## 10. Manutenção rotineira (não-sprint)

### 10.1 Atividades semanais

- **Dependabot/Renovate** ativo no monorepo — abre PRs pra patches de deps. Devs revisam e mergeiam.
- **CHANGELOG-DRAFT.md** atualizado a cada PR mergeado em main.
- **Issues triagem** — toda issue do GitHub etiquetada (bug, feature, doc, infra) em <72h.

### 10.2 Atividades mensais

- **Audit npm** (`pnpm audit`) — relatório lido, vulnerabilidades altas/críticas atacadas.
- **Storybook visual review** — passar olho em todos os componentes, identificar regressões visuais.
- **Métricas de uso** — quantas chamadas de cada package em telemetria? Identifica packages mortos.

### 10.3 Atividades trimestrais

- **Sprint de upgrade** (ver §3).
- **Revisão dos docs em `docs/`** — todo .md tem `Atualizado em` nos primeiros 100 chars. Revisar todos.
- **Brainstorm de packages novos** — checar lista da §7, ver se algum atingiu regra dos 3.

### 10.4 Atividades anuais

- **Audit arquitetural** — sentar com time inteiro, perguntar: "se começássemos de novo hoje, mudaríamos algo grande?". Documentar conclusões em `docs/audit-YYYY.md`.
- **Roadmap do próximo ano** — atualizar `11-ROADMAP-CONSTRUCAO.md` com fases novas se houver.

---

## 11. Métricas de saúde da Forge

Toda v1+ deveria reportar mensalmente:

| Métrica                                                                   | Target    |
| ------------------------------------------------------------------------- | --------- |
| Tempo de setup de projeto novo (clone → deploy local)                     | <2h       |
| Tempo de adicionar entidade nova (CRUD completo)                          | <10 min   |
| Cobertura de testes em packages críticos (`auth`, `api-base`, `payments`) | >80%      |
| % de dependências com major atualizado (vs latest)                        | >70%      |
| Idade média de issues abertas                                             | <30 dias  |
| Tempo médio entre security advisory → patch released                      | <72h      |
| Número de projetos cliente em produção rodando Forge                      | crescente |

Se alguma métrica degradar > 2 trimestres seguidos → investigar e atacar.

---

## 12. Anti-padrões em manutenção

### 12.1 Atualização furtiva

❌ Dev sobe `@ethos/ui` em projeto cliente sem permissão do cliente. Cliente abre o sistema, layout quebrou.

✅ Atualização em projeto cliente é sempre **explícita, contratada, validada**.

### 12.2 Breaking change disfarçado de minor

❌ Mudar comportamento esperado de função sem bumpar major ("ah, ninguém usava").

✅ Toda mudança que pode quebrar consumidor = major. Quando dúvida, é major.

### 12.3 Library bloat por "completude"

❌ Adicionar 30 variantes de Button "pra cobrir todos os casos".

✅ Cobrir os casos reais (3 projetos pediram). O resto fica em projeto cliente.

### 12.4 Manutenção de packages mortos

❌ Manter `@ethos/foo` que ninguém usa há 18 meses por orgulho.

✅ Deprecar formalmente, dar 6 meses de aviso, remover na próxima major.

### 12.5 Sprint de upgrade adiado indefinidamente

❌ "Vamos atualizar Next quando tivermos tempo." Resultado: 3 anos depois rodando Next 14.

✅ Cadência fixa. Sprint trimestral. Não negociável.

---

## 13. Quando a Forge "amadurece"

A Forge atinge maturidade real quando:

1. Time inteiro consegue iniciar projeto novo sem precisar perguntar nada
2. CHANGELOG mostra cadência consistente de releases (não só fixes)
3. Pelo menos **5 clientes em produção** rodando Forge
4. Pelo menos **3 sprints de upgrade** completados sem incidente
5. Pelo menos **1 major bump** (v1 → v2) feito sem perder cliente
6. Devs novos da Ethos onboard em <1 semana

Atingidos esses 6 → **Forge é IP madura**. Aí vale registrar marca, formalizar contratos de licenciamento interno, considerar (eventualmente) abertura ou produtização externa.

Antes disso → Forge é **prototype operacional**: serve a Ethos, mas tem rough edges. E está tudo bem.

---

## 14. Documentos relacionados

- `00-FILOSOFIA.md` — princípios fundamentais que motivam essas regras
- `01-STACK-DECISOES.md` — stack atual e justificativas
- `03-ESTRUTURA-MONOREPO.md` — onde cada package vive
- `08-PACOTES-PLUGAVEIS.md` — lista completa de plugáveis (8 v1 + 15 pós-v1)
- `11-ROADMAP-CONSTRUCAO.md` — roadmap das fases v1
- `04-BIBLIOTECA-UI.md` — catálogo de componentes (atualizar quando promover)

---

## Resumo executivo

| Aspecto                  | Política                                                                            |
| ------------------------ | ----------------------------------------------------------------------------------- |
| **Versionamento**        | Semver estrito + packages independentes + Forge umbrella                            |
| **Cliente entregue**     | Congelado na versão. Upgrade só contratado.                                         |
| **Sprint de upgrade**    | Trimestral. Sempre quando major de Next/Nest/Prisma/React.                          |
| **Componente UI novo**   | Regra dos 3 projetos antes de promover pra `@ethos/ui`                              |
| **Package novo**         | Mesma regra dos 3 (exceto infra essencial — `@ethos/storage`, `@ethos/email`, etc.) |
| **Stack troca**          | Só por descontinuação, vulnerabilidade arquitetural, ou ROI 10x                     |
| **Suporte legado**       | 24 meses por major + security patches sempre                                        |
| **Manutenção rotineira** | Renovate semanal + audit mensal + sprint trimestral + audit anual                   |

A Forge envelhece com saúde quando regras são seguidas. **A disciplina é mais importante que ferramenta.**
