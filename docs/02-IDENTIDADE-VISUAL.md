# 02 — Identidade Visual da Forge

> Esse arquivo define como tudo da Forge vai parecer. Não é guideline solto — são regras concretas que orientam construção de cada componente, escolha de cor, tipografia, espaçamento. **Se a Forge não tiver identidade visual forte, ela vira "mais um sistema bonito" entre tantos. Identidade é diferencial competitivo permanente.**

---

## A pergunta central

Existem milhares de dashboards bonitos no mundo. O que faz cliente lembrar especificamente de um sistema entregue pela Ethos? **A consistência visual entre todos os projetos.** Quando o cliente vê o décimo sistema da Ethos, ele reconhece o padrão. Quando dev novo entra na Ethos, ele aprende um padrão e replica em qualquer projeto.

Esse arquivo é o que define esse padrão.

---

## Referências visuais curadas

A identidade Ethos não é cópia de nenhuma dessas referências. Mas estuda padrões delas, absorve o melhor, e mistura num estilo próprio.

**Não pegue uma única referência e tente clonar.** O resultado vira "Ethos copiando X". A graça está na mistura inteligente.

### As 8 referências oficiais da Forge

#### 1. Linear (linear.app)
**O que estudar:** densidade de informação sem parecer poluído. Como exibir muitos itens numa lista mantendo respiro. Animações sutis e rápidas. Hierarquia tipográfica clara. Uso de teclas de atalho como cidadã primeira.

**O que NÃO copiar:** o tema escuro extremo. A Forge é light por padrão.

#### 2. Stripe Dashboard (dashboard.stripe.com)
**O que estudar:** sofisticação corporativa sem parecer engessada. Como apresentar dados financeiros com clareza absoluta. Cards e tabelas elegantes. Estados de loading e empty bem trabalhados. Cor primária forte usada com parcimônia.

**O que NÃO copiar:** densidade de menus laterais (Stripe tem features demais; Forge é mais focada).

#### 3. Vercel Dashboard (vercel.com/dashboard)
**O que estudar:** modernidade sem ser efêmero. Tipografia Geist como referência. Black-and-white com acentos coloridos pontuais. Cards com bordas sutis e sombras quase imperceptíveis. Microinterações no hover.

**O que NÃO copiar:** a estética "developer tool" muito técnica. Forge atende negócios variados.

#### 4. Notion (notion.so)
**O que estudar:** humanidade na interface. Empty states que conversam com o usuário. Iconografia consistente e amigável. Espaçamentos generosos. Sensação de "isso é meu, é confortável".

**O que NÃO copiar:** o nível de personalização extrema (Notion deixa o usuário criar tudo; Forge tem fluxos definidos).

#### 5. Cal.com (cal.com)
**O que estudar:** acessibilidade visível. Como tornar fluxos complexos (agendamento, configuração) parecerem simples. Cores quentes que humanizam. Botões com cara confiável.

**O que NÃO copiar:** o branding muito específico de produto SaaS público.

#### 6. Resend Dashboard (resend.com)
**O que estudar:** elegância minimalista. Tipografia premium. Espaços em branco bem usados. Sensação de "produto cuidado".

**O que NÃO copiar:** simplicidade extrema demais (Resend é uma ferramenta única; Forge gera sistemas multifuncionais).

#### 7. Plausible Analytics (plausible.io)
**O que estudar:** dashboards de dados sem parecerem caóticos. Charts limpos com cores discretas. Filtros não-intrusivos. Densidade adequada ao volume de informação.

**O que NÃO copiar:** ausência de paleta de cores (Forge precisa de mais variedade visual).

#### 8. Raycast (raycast.com — área logada)
**O que estudar:** componentes que parecem "premium" sem serem ostentosos. Modais e command palettes elegantes. Atalhos de teclado bem destacados.

**O que NÃO copiar:** a estética app-de-produtividade-pessoal (Forge é multi-usuário, multi-tenant).

---

## Regras de identidade Ethos

Cada componente da `@ethos/ui` segue essas regras. Não são sugestões — são contratos.

### Regra 1: Light theme primário, dark theme totalmente suportado

A Forge é **light por padrão**, mas todo componente precisa funcionar perfeitamente em dark. Tema é trocado via classe `dark` no `<html>` e CSS variables.

Razão: maioria dos sistemas administrativos brasileiros é light (consultórios, comércio, escritórios). Mas dev moderno espera dark mode disponível. Precisamos atender os dois.

### Regra 2: Border-radius médio universal

Padrão da Forge: **`8px`** (Tailwind: `rounded-lg`).

Aplicado em:
- Botões
- Cards
- Inputs
- Modais
- Avatars (exceção: avatares circulares são `rounded-full`)
- DataTable rows hover state

Exceções:
- Badges pequenos: `4px` (`rounded`)
- Pills/tags: `rounded-full`

**Nunca:**
- Cards quadrados (sem border-radius)
- Border-radius gigante (>12px) em componentes maiores que 32px

### Regra 3: Sombras sutis, jamais agressivas

Padrão de elevação:
- **Nível 0:** sem sombra (componentes inline)
- **Nível 1:** sombra muito sutil pra cards estáticos
  ```css
  box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  ```
- **Nível 2:** sombra média pra dropdown, popover, tooltip
  ```css
  box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
  ```
- **Nível 3:** sombra forte pra modais
  ```css
  box-shadow: 0 25px 50px -12px rgb(0 0 0 / 0.25);
  ```

**Nunca:** sombras coloridas, glows neon, sombras 3D-style.

### Regra 4: Border de 1px presente, mas discreta

Cards, inputs, botões secundários têm sempre border de 1px na cor `border`. Em dark mode, a border fica ligeiramente mais visível porque o contraste do dark ajuda.

```css
:root {
  --border: 220 13% 91%; /* HSL, modo claro */
}

.dark {
  --border: 220 13% 18%; /* HSL, modo escuro */
}
```

### Regra 5: Cor primária usada com parcimônia

A cor primária da Ethos (definida no projeto, default sugerido: roxo-azulado moderno) **só aparece em**:

- Botões primários (CTAs principais — geralmente um por tela)
- Links importantes
- Badges de status ativo
- Indicadores de seleção (checkbox, radio, switch)
- Sublinhado de aba ativa
- Ícones de seção ativa na sidebar

**Nunca:**
- Backgrounds inteiros de cards
- Headers gigantes coloridos
- Borders de cards normais
- Backgrounds de tabelas

A cor primária precisa "puxar a atenção" quando aparece. Se está em todo lugar, perde o efeito.

### Regra 6: Tipografia limpa, hierarquia forte

**Família tipográfica padrão:** `Inter` (do Google Fonts) ou `Geist` (da Vercel) — escolha uma e não mistura.

**Pesos disponíveis:**
- 400 (regular) — texto corrido, descrições
- 500 (medium) — labels, valores em cards, texto destacado
- 600 (semibold) — títulos de seção, headers de tabela, botões
- 700 (bold) — apenas em casos raríssimos (logo, título principal de uma tela)

**Tamanhos canônicos:**
- `text-xs` (12px) — labels secundários, captions
- `text-sm` (14px) — texto padrão de UI (sidebars, tabelas, formulários)
- `text-base` (16px) — texto de leitura (descrições, parágrafos)
- `text-lg` (18px) — subtítulos
- `text-xl` (20px) — títulos de cards
- `text-2xl` (24px) — títulos de página
- `text-3xl` (30px) — apenas em telas vazias ou onboarding

**Line-height:** `leading-normal` (1.5) padrão. `leading-tight` (1.25) pra títulos grandes.

### Regra 7: Espaçamento consistente em escala 4px

Tailwind padrão (4, 8, 12, 16, 24, 32, 48, 64). Nunca usar valores arbitrários (`px-[7px]`).

**Padrões da Forge:**
- Padding interno de cards: `p-6` (24px)
- Padding de botões médios: `px-4 py-2` (16px / 8px)
- Gap entre cards: `gap-4` ou `gap-6` (16-24px)
- Padding lateral de páginas: `px-6` no mobile, `px-8` no desktop
- Espaço entre seções de uma página: `space-y-8`

### Regra 8: Iconografia única e consistente

**Biblioteca oficial:** [Lucide Icons](https://lucide.dev) (sucessor do Feather Icons).

Razões:
- 1500+ ícones, escolha completa
- Consistência visual interna (todos no mesmo grid e estilo)
- Tamanhos default: `16` (em texto inline), `20` (em botões), `24` (em headers de seção)
- Stroke width consistente: `1.5` ou `2`

**Nunca:** misturar com outros packs (Heroicons + Lucide), usar emojis como ícones de UI, criar ícones próprios sem necessidade extrema.

### Regra 9: Estados de empty, loading e error sempre cuidados

Toda lista, toda tela com dados, precisa de:

- **Loading state:** skeleton ou spinner sutil (nunca tela em branco)
- **Empty state:** ilustração simples + mensagem amigável + CTA (ex: "Você ainda não tem clientes. Cadastre o primeiro pra começar.")
- **Error state:** mensagem clara + botão "Tentar novamente"

A Forge tem esses 3 estados como componentes prontos na `@ethos/ui` (`<EmptyState>`, `<ErrorState>`, `<LoadingState>`).

### Regra 10: Animações curtas, presentes mas não chamativas

**Padrão de duração:** `150ms` pra transições normais, `200ms` pra coisas maiores (modal abrir).

**Easing:** `ease-out` na maioria dos casos. `cubic-bezier(0.16, 1, 0.3, 1)` pra coisas mais "premium" (recomendado pra modais, sheets).

**Onde animar:**
- Hover de botões (background-color, 150ms)
- Modal/Drawer abrir e fechar (slide + fade, 200ms)
- Skeleton loading (pulse infinito)
- Toast aparecer (slide from top-right, 200ms)
- Hover de DataTable rows (background-color, 100ms)

**Onde NÃO animar:**
- Mudança de página (Next.js já cuida)
- Submit de formulário (sem animar o botão "transformando-se")
- Microinterações que não comunicam nada útil

---

## Paleta de cores oficial Ethos

A paleta é definida via CSS variables em HSL pra facilitar dark mode.

```css
:root {
  /* Cores estruturais */
  --background: 0 0% 100%;           /* branco puro */
  --foreground: 222 47% 11%;         /* quase preto, levemente azulado */
  --card: 0 0% 100%;
  --card-foreground: 222 47% 11%;
  --popover: 0 0% 100%;
  --popover-foreground: 222 47% 11%;

  /* Primária da Ethos — roxo-azulado moderno */
  --primary: 240 78% 60%;            /* #4F4FF7 aprox */
  --primary-foreground: 0 0% 100%;

  /* Secundária neutra */
  --secondary: 220 14% 96%;          /* cinza muito claro */
  --secondary-foreground: 222 47% 11%;

  /* Mute (textos discretos, fundos sutis) */
  --muted: 220 14% 96%;
  --muted-foreground: 220 9% 46%;

  /* Acento */
  --accent: 220 14% 96%;
  --accent-foreground: 222 47% 11%;

  /* Destrutivo (delete, erro) */
  --destructive: 0 84% 60%;          /* vermelho clássico */
  --destructive-foreground: 0 0% 100%;

  /* Estados */
  --success: 142 71% 45%;            /* verde */
  --warning: 38 92% 50%;             /* laranja-amarelo */
  --info: 199 89% 48%;               /* azul */

  /* Borders e inputs */
  --border: 220 13% 91%;
  --input: 220 13% 91%;
  --ring: 240 78% 60%;               /* foco — usa primary */

  /* Radius */
  --radius: 0.5rem;                  /* 8px */
}

.dark {
  --background: 222 47% 6%;
  --foreground: 220 14% 96%;
  --card: 222 47% 8%;
  --card-foreground: 220 14% 96%;
  --popover: 222 47% 8%;
  --popover-foreground: 220 14% 96%;

  --primary: 240 78% 65%;
  --primary-foreground: 222 47% 6%;

  --secondary: 217 33% 17%;
  --secondary-foreground: 220 14% 96%;

  --muted: 217 33% 17%;
  --muted-foreground: 215 20% 65%;

  --accent: 217 33% 17%;
  --accent-foreground: 220 14% 96%;

  --destructive: 0 63% 55%;
  --destructive-foreground: 220 14% 96%;

  --success: 142 71% 45%;
  --warning: 38 92% 50%;
  --info: 199 89% 60%;

  --border: 217 33% 17%;
  --input: 217 33% 17%;
  --ring: 240 78% 65%;
}
```

### Customização por cliente

Cada projeto pode redefinir `--primary` (e seus derivados) sem mexer no resto. Exemplo de um projeto cliente:

```css
/* projeto-cliente/src/app/globals.css */
@layer base {
  :root {
    --primary: 142 71% 45%;          /* verde personalizado do cliente */
    --ring: 142 71% 45%;
  }
}
```

Isso muda automaticamente: botões primários, links, indicadores de seleção, foco. Mantém todo o resto da identidade Ethos.

**Limite:** cliente pode mudar `--primary` (e derivados como `--ring`). NÃO pode mudar borders, radius, sombras, tipografia. Isso é "DNA Ethos" e fica fixo.

---

## Estrutura visual de uma tela típica

Toda tela administrativa da Forge segue o mesmo esqueleto:

```
┌────────────────────────────────────────────────────┐
│  ┌────────┐  ┌────────────────────────────────┐  │
│  │        │  │  Topbar (60px height)          │  │
│  │        │  │  └─ Breadcrumb · ações · user  │  │
│  │ Side-  │  ├────────────────────────────────┤  │
│  │ bar    │  │                                │  │
│  │ (240px)│  │  Conteúdo da página            │  │
│  │        │  │  - Header com título e CTAs    │  │
│  │        │  │  - Filtros (se aplicável)      │  │
│  │        │  │  - Conteúdo principal          │  │
│  │        │  │    (cards, tabelas, forms)     │  │
│  │        │  │                                │  │
│  └────────┘  └────────────────────────────────┘  │
└────────────────────────────────────────────────────┘
```

### Sidebar (240px)
- Background: `bg-card` com `border-r`
- Logo no topo (60px de altura)
- Lista de itens com ícone Lucide + label
- Item ativo: background `bg-secondary` + ícone `text-primary`
- Hover: background `bg-secondary/50`
- Footer: avatar do user + nome + dropdown de logout
- Colapsável em mobile (vira drawer)

### Topbar (60px)
- Background: `bg-background` com `border-b`
- Esquerda: breadcrumb (`Inicio › Clientes › Maria Silva`)
- Direita: notificações, busca rápida (Cmd+K), avatar do user
- Sticky (fica fixo no topo ao rolar)

### Conteúdo
- Padding: `p-6` no mobile, `p-8` no desktop
- Largura máxima: `max-w-screen-2xl` (centrada quando viewport for muito largo)
- Espaçamento vertical entre seções: `space-y-6`

### Header da página
- Título: `text-2xl font-semibold`
- Subtítulo (opcional): `text-sm text-muted-foreground`
- CTAs à direita (Button primary + buttons secundários)

---

## Anatomia dos componentes principais

### Card padrão

```tsx
<div className="rounded-lg border bg-card shadow-sm p-6">
  <div className="space-y-2">
    <h3 className="text-lg font-semibold">Título</h3>
    <p className="text-sm text-muted-foreground">Descrição</p>
  </div>
  {/* conteúdo */}
</div>
```

### KPI Card

```
┌─────────────────────────────┐
│ Receita do mês          📊  │  ← label + ícone
│                             │
│ R$ 124.580,00               │  ← valor grande
│                             │
│ ↑ 12% vs mês anterior       │  ← trend
└─────────────────────────────┘
```

- Padding: `p-6`
- Label: `text-sm font-medium text-muted-foreground`
- Valor: `text-3xl font-semibold`
- Trend positivo: ícone arrow-up + cor `success`
- Trend negativo: ícone arrow-down + cor `destructive`
- Trend neutro: traço + cor `muted-foreground`

### Button (variantes)

| Variante | Uso | Estilo |
|----------|-----|--------|
| `default` (primary) | CTA principal da tela | bg primary, texto branco |
| `secondary` | Ações secundárias | bg secondary, texto foreground |
| `outline` | Ações terciárias | borda + texto, sem bg |
| `ghost` | Ações sutis (em listas) | sem borda, hover sutil |
| `destructive` | Delete, ações irreversíveis | bg destructive, texto branco |
| `link` | Navegação textual | sem bg, sublinhado no hover |

Tamanhos: `sm` (32px height), `default` (40px), `lg` (48px), `icon` (40x40 quadrado pra ícones).

### DataTable padrão

```
┌─────────────────────────────────────────────────────┐
│ [🔍 Buscar...]  [Filtros ▾]              [+ Novo]  │
├─────────────────────────────────────────────────────┤
│ ☐  Nome ↕         Email           Status     Ações │
├─────────────────────────────────────────────────────┤
│ ☐  Maria Silva    maria@x.com     ● Ativo    ⋯    │
│ ☐  João Santos    joao@y.com      ○ Inativo  ⋯    │
│ ...                                                 │
├─────────────────────────────────────────────────────┤
│ Mostrando 1-10 de 234        [< 1 2 3 ... 24 >]    │
└─────────────────────────────────────────────────────┘
```

- Header: busca à esquerda, filtros e CTA à direita
- Colunas: ordenáveis (chevron `↕` mostra direção)
- Checkboxes pra bulk actions
- Linha hover: `bg-secondary/30`
- Linha selecionada: `bg-primary/5`
- Status: dot colorido + label
- Ações por linha: dropdown com 3 dots (`⋯`)
- Footer: contagem + paginação

### Form padrão

- Label sempre acima do input (nunca dentro como placeholder permanente)
- Label: `text-sm font-medium`
- Input height: `h-10` (40px)
- Hint/helper text abaixo: `text-xs text-muted-foreground`
- Erro: `text-xs text-destructive` com ícone `AlertCircle`
- Required: `*` em vermelho ao lado do label
- Botões: "Cancelar" (outline) à esquerda, "Salvar" (primary) à direita

### Modal padrão

- Overlay: `bg-background/80 backdrop-blur-sm`
- Largura: `max-w-md` (default), `max-w-lg`, `max-w-2xl` conforme conteúdo
- Padding: `p-6`
- Header: título + close button (X)
- Footer: ações com `flex justify-end gap-2`

### Toast (notificação)

- Posição: top-right
- Padding: `px-4 py-3`
- Variantes: `default`, `success` (verde), `error` (vermelho), `warning` (laranja), `info` (azul)
- Auto-dismiss: 5 segundos (errors podem ficar 8s)
- Stack: novos toasts empurram antigos pra baixo

---

## Regras pra Claude Code construir UI

Quando você abrir conversa com Claude Code pra construir um componente, sempre passe:

1. **Esse arquivo (`02-IDENTIDADE-VISUAL.md`)** como contexto
2. **As 8 referências visuais** (com URLs)
3. **As 10 regras de identidade**
4. **A regra-mãe:** "use Tailwind + shadcn como base, customize seguindo regras Ethos, evite cópia de qualquer referência específica"

Exemplo de prompt no `12-PROMPTS-CLAUDE-CODE.md`. Seguindo isso, todo componente sai consistente.

---

## Checklist de validação visual

Antes de aprovar um componente novo na `@ethos/ui`, verificar:

- [ ] Border-radius = 8px (ou exceções documentadas)
- [ ] Sombra dentro dos níveis 0/1/2/3 definidos
- [ ] Border de 1px presente onde aplicável
- [ ] Cor primária só em CTAs e indicadores
- [ ] Tipografia dentro da escala definida
- [ ] Espaçamento múltiplo de 4px
- [ ] Ícones Lucide com tamanhos canônicos
- [ ] Empty/loading/error states implementados
- [ ] Dark mode funciona perfeitamente
- [ ] Animações ≤ 200ms, ease-out
- [ ] Acessível (foco visível, ARIA, keyboard nav)
- [ ] Storybook story criada com 3+ variantes

Componente que passa nesse checklist é Ethos. Componente que falha em 2+ pontos volta pra ajuste.
