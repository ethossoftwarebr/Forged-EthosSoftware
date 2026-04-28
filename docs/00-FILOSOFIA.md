# 00 — Filosofia da Forge

> **Esse arquivo existe pra responder uma pergunta que vai aparecer várias vezes durante a construção: "por que decidimos assim e não de outro jeito?".** Se as decisões abaixo estiverem claras, todas as outras decisões técnicas fluem naturalmente.

---

## A pergunta original

A Ethos atende projetos sob medida há anos. Cada projeto novo passa pelas mesmas etapas: configurar monorepo, montar auth, criar layout dashboard, implementar CRUD básico de dezenas de entidades, plugar pagamentos, integrar WhatsApp, conectar com IA. Cada cliente é diferente na lógica de negócio, mas a infraestrutura é quase sempre a mesma.

A pergunta é: **e se a infraestrutura comum nascesse pronta, e o time só investisse tempo na parte que realmente diferencia cada projeto?**

A Forge é a resposta.

---

## O que a Forge é

A Forge é um **kit de partida proprietário** da Ethos. Quando entra um projeto novo, o dev:

1. Clona o template
2. Define as entidades do domínio no `schema.prisma`
3. Roda os geradores
4. Recebe um sistema funcional com auth, dashboard, CRUD e componentes prontos
5. Customiza a lógica de negócio em cima

A primeira hora do projeto é gasta com schema. A primeira semana já tem MVP funcional. O resto do tempo é o que realmente importa: regras de negócio do cliente, integrações específicas, refinamentos visuais, performance.

---

## O que a Forge NÃO é

Tem várias coisas que parecem Forge mas não são, e essa distinção é importante. Várias delas foram tentadas no mercado e a maioria fracassa.

### Não é uma DSL própria

Existe a tentação de criar uma "linguagem da Ethos" em YAML que descreve o sistema todo. Algo como:

```yaml
project:
  name: PetShop
entities:
  - name: Pet
    fields: [...]
modules:
  - name: agendamento
    ...
```

A ideia é sedutora: você escreve YAML, roda gerador, sai sistema completo. Mas a realidade é cruel:

- **DSL é uma linguagem nova.** Cada feature do framework virou feature da DSL. Cada bug do framework virou bug da DSL. Você está mantendo duas coisas: o sistema e a linguagem que descreve o sistema.
- **DSL trava você na geração.** Quando o cliente pede algo que a DSL não suporta, você precisa estender a DSL OU sair do padrão. Os dois custam caro.
- **DSL afasta os devs.** Dev novo precisa aprender a DSL antes de produzir. Aprender Prisma é universal. Aprender "DSL Ethos" é specific knowledge que ninguém usa em outro lugar.

**Decisão:** o `schema.prisma` é a fonte da verdade. É padrão de mercado, todo dev TypeScript entende, e o ecossistema de geradores em cima dele é maduro.

### Não é uma engine de geração complexa

Existe a tentação de escrever uma engine própria com parsers, ASTs, templates Handlebars customizados, sistema de plugins. O resultado costuma ser:

- 6 meses de construção antes do primeiro projeto pagar
- Bugs em casos de borda que você não previu
- Dependência de uma ferramenta interna que ninguém de fora entende
- Dificuldade de evoluir junto com o ecossistema

**Decisão:** usamos geradores open source consolidados (`@prisma-utils/prisma-crud-generator` no back, `@hey-api/openapi-ts` no front). O que escrevemos de geração própria são **dois templates simples**: um de controller NestJS e um de página Next.js. Pequeno, mantível, fácil de evoluir.

### Não é um Studio web

Existe a tentação de fazer uma interface gráfica onde o time arrasta entidades, configura campos, clica em "gerar". Vira um produto dentro do produto. Isso só faz sentido pra empresas que vendem o gerador como SaaS pra outros desenvolvedores. Não é o caso da Ethos.

**Decisão:** a interface da Forge é o terminal e o editor de código. Quem opera a Forge é dev, e dev opera bem com texto.

### Não é low-code/no-code

Low-code/no-code é uma estratégia válida, mas radicalmente diferente. Empresas como Bubble, Retool, ToolJet competem nesse espaço. Pra Ethos competir nesse mercado seria reposicionamento total.

**Decisão:** a Forge gera **código real, editável, deployável standalone**. Não tem runtime proprietário, não tem interpretador, não tem dependência da Forge no sistema gerado. Cliente recebe um projeto NestJS + Next.js comum.

---

## Os princípios que regem todas as decisões

### 1. Open source primeiro, proprietário onde diferencia

Sempre que existe ferramenta open source madura pro problema, usamos ela. Economizamos meses de construção, ganhamos manutenção da comunidade, evitamos reinventar roda.

O que a Ethos constrói proprietário é o que diferencia comercialmente:
- Biblioteca de componentes UI com identidade Ethos
- Templates de páginas e controllers no estilo Ethos
- Camada de IA configurada com as boas práticas Ethos
- Adaptadores de integração que cobrem casos específicos do mercado brasileiro (Pix, ERPs nacionais, WhatsApp via Z-API)

### 2. Código gerado é igual a código escrito à mão

Não pode ter `// AUTO-GENERATED FRANKENSTEIN, DO NOT EDIT` em arquivo grande, ilegível, com nomes ruins. O dev precisa abrir o arquivo gerado, entender em 30 segundos, e conseguir editar (ou pelo menos, conseguir herdar e estender).

Isso obriga os templates de geração a serem caprichados. Vale o esforço.

### 3. Liberdade de customizar é sagrada

Toda peça gerada precisa permitir override total. Modelo de herança no NestJS (`Service extends BaseService`), templates Next.js que viram código real (não componentes mágicos), CSS variables ajustáveis por projeto. Se em algum momento o dev precisa "lutar contra a Forge" pra fazer algo simples, a Forge errou.

### 4. Padrões fortes, escolhas livres

A Forge é opinionated nas decisões estruturais (NestJS, Prisma, Postgres, App Router, Tailwind, shadcn) e libre nas decisões de domínio (qual modelo, quais campos, quais regras de negócio).

Isso elimina decisões repetitivas que cansam o dev e custam tempo, mas preserva a flexibilidade onde ela importa: na modelagem do problema do cliente.

### 5. Multi-tenant nasce no DNA

Mesmo projetos single-tenant nascem com infraestrutura multi-tenant. Por dois motivos:

**Primeiro:** custa quase nada implementar bem desde o início (filtro automático de `tenantId` no Prisma, JWT com tenant no payload, RBAC).

**Segundo:** muitos projetos que começaram single-tenant precisaram virar multi depois. Reescrever multi-tenant em projeto rodando é caro e arriscado.

### 6. Identidade visual é diferencial competitivo

shadcn cru parece "qualquer projeto moderno". Pipedrive clonado parece "alguém imitando Pipedrive". O que faz cliente lembrar da Ethos é a **identidade visual consistente** entre todos os projetos entregues.

A biblioteca `@ethos/ui` é um investimento permanente nesse diferencial.

### 7. IA não é módulo opcional, é capacidade transversal

Em 2026, sistemas sem IA parecem antiquados. A camada `@ethos/ai-*` da Forge nasce robusta: chat com tools, RAG, OCR, agente WhatsApp. Cada projeto tem essas capacidades disponíveis em horas, não semanas.

Isso transforma a oferta comercial: a Ethos não vende "site" ou "sistema". Vende "sistema com IA embutida" — categoria diferente, ticket diferente, percepção de valor diferente.

---

## O que a Forge resolve concretamente

### Problema: cada projeto novo gasta 1-2 semanas em setup

**Antes:** clona um projeto antigo, renomeia tudo, ajusta variáveis de ambiente, verifica o que está atualizado, atualiza dependências, configura deploy, testa.

**Com Forge:** clona template, troca variáveis, deploy automático. Setup em horas, não semanas.

### Problema: CRUD repetitivo consome 30% do tempo do dev

**Antes:** pra cada entidade, criar service com find/create/update/delete, controller com decorators, DTOs, validação, tipos no front, hooks de fetch, página de lista, página de criação, página de edição.

**Com Forge:** define entidade no `schema.prisma`, roda gerador, tudo isso aparece. Dev investe tempo apenas em regras específicas via override.

### Problema: cada projeto tem visual ligeiramente diferente

**Antes:** dev pega componentes de bibliotecas diferentes, ajusta cores, faz o que parece bom no momento. Cada projeto vira um "filho diferente". Cliente não associa visual à marca Ethos.

**Com Forge:** todos os projetos usam `@ethos/ui` com mesmo padrão visual. Mesma sidebar, mesma DataTable, mesmo modal de confirmação, mesmas cores. Cliente percebe a "cara Ethos" e isso vira diferencial.

### Problema: integrar IA, WhatsApp, ERP exige pesquisa toda vez

**Antes:** cliente pede chatbot. Dev pesquisa lib, configura SDK, lida com prompt engineering, testa em produção. Próximo cliente pede a mesma coisa, dev refaz tudo (ou copia mal).

**Com Forge:** `pnpm add @ethos/ai-chat`, configura, pronto. As decisões difíceis (qual modelo, como sanitizar input, como fazer tool calling) já foram tomadas e empacotadas.

### Problema: dev novo na Ethos demora pra ser produtivo

**Antes:** cada projeto da Ethos é diferente. Dev novo precisa aprender o "jeito daquele projeto" antes de produzir.

**Com Forge:** todos os projetos seguem o mesmo padrão. Dev aprende a Forge uma vez, contribui em qualquer projeto. Onboarding de semanas vira dias.

---

## O que NÃO é objetivo da Forge

Pra evitar escopo crescer:

- **Não é objetivo gerar UI complexa de domínio.** Forms simples, listas, edição: gerados. Tela de calendário, Kanban, mapa: feita à mão usando componentes da `@ethos/ui`.
- **Não é objetivo cobrir todos os casos de borda.** A Forge cobre 70-80% do que projetos precisam. Os 20-30% restantes são o trabalho que paga.
- **Não é objetivo ser usada por desenvolvedores fora da Ethos.** É IP interno. Vende-se o resultado (projetos), não a Forge.
- **Não é objetivo virar um produto vendável.** Pelo menos não na v1 e v2. Talvez no futuro, se fizer sentido. Mas começar com essa ambição mata o foco.

---

## Como saber se uma feature deve entrar na Forge ou ficar no projeto

Critério simples: **a feature aparece em pelo menos 3 projetos diferentes?**

- **Sim:** vai pra Forge (template, biblioteca, ou pacote plugável). Investe na boa.
- **Não:** fica no projeto. Não força padrão prematuro.

Esse critério evita dois erros opostos:

- **Erro A — generalizar cedo:** "essa lógica é interessante, vou colocar na Forge". Daí ela vira feature mal feita porque foi pensada pra um caso só.
- **Erro B — copiar e colar entre projetos:** "vou copiar do projeto antigo". Daí divergem ao longo do tempo, ninguém atualiza, viram dívida técnica.

Padrão certo: copiar 2-3 vezes. Na terceira, vira Forge.

---

## A história que se conta com a Forge

Quando o cliente pergunta "por que vocês entregam tão rápido?", a resposta é:

> "A Ethos investiu em uma plataforma interna chamada Forge. Ela gera 70% do que todo sistema precisa: autenticação, dashboard, CRUD, integrações. Nosso time investe esse tempo poupado em entender o seu negócio e construir as regras específicas que diferenciam você. Você recebe um sistema com qualidade de produto, não de projeto sob medida."

Isso muda a percepção: não é "agência que entrega rápido". É "engenharia com leverage real".

Esse é o produto que estamos construindo.
