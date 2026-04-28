# 04 — Biblioteca de Componentes (@ethos/ui)

> Catálogo completo dos componentes da Forge. Cada entrada tem: o que faz, API esperada, comportamento, exemplo de uso. Esse arquivo é referência ativa — quando precisar de um componente, abre aqui primeiro.

---

## Filosofia da @ethos/ui

A `@ethos/ui` tem três camadas:

1. **`primitives/`** — componentes shadcn copiados e customizados pra identidade Ethos. Exemplos: `Button`, `Input`, `Dialog`, `Select`. São os blocos básicos.

2. **`compounds/`** — componentes proprietários da Ethos, construídos em cima dos primitives. Exemplos: `DataTablePro`, `FormBuilder`, `KpiCard`, `EmptyState`. **Aqui mora o ouro da biblioteca.**

3. **`layouts/`** — estruturas de página completas. Exemplos: `DashboardLayout`, `AuthLayout`, `SettingsLayout`. Compõem primitives + compounds + navegação.

Toda regra visual está em **`02-IDENTIDADE-VISUAL.md`**. Esse arquivo foca em **API e comportamento**.

---

## Camada 1: primitives (shadcn customizado)

Esses componentes vêm da biblioteca shadcn, com customizações pra refletir identidade Ethos. Ao adicionar um shadcn novo no projeto via CLI, sobrescreve as cores e radius pra usar CSS variables Ethos.

### Button

```tsx
import { Button } from "@ethos/ui";

<Button variant="default">Salvar</Button>
<Button variant="secondary">Cancelar</Button>
<Button variant="destructive">Excluir</Button>
<Button variant="outline">Editar</Button>
<Button variant="ghost">Ver mais</Button>
<Button variant="link">Saiba mais</Button>

<Button size="sm">Pequeno</Button>
<Button size="default">Padrão</Button>
<Button size="lg">Grande</Button>
<Button size="icon"><Icon /></Button>

<Button loading>Salvando...</Button>
<Button disabled>Indisponível</Button>
```

Props:
- `variant: "default" | "secondary" | "destructive" | "outline" | "ghost" | "link"`
- `size: "sm" | "default" | "lg" | "icon"`
- `loading?: boolean` — mostra spinner e desabilita
- `asChild?: boolean` — pra usar como `<Link>` do Next

### Input

```tsx
<Input type="text" placeholder="Digite seu nome" />
<Input type="email" />
<Input type="password" />
<Input disabled />
```

Sempre usado com `<Label>` e idealmente dentro de `<FormField>` (Form do shadcn integrado com React Hook Form).

### Outros primitives

A biblioteca completa de primitives inclui:
- `Label`, `Textarea`, `Select`, `Checkbox`, `Radio`, `Switch`, `Slider`
- `Card`, `Dialog`, `Sheet`, `Drawer`, `Popover`, `Tooltip`, `HoverCard`
- `DropdownMenu`, `ContextMenu`, `Menubar`, `NavigationMenu`
- `Tabs`, `Accordion`, `Collapsible`
- `Badge`, `Avatar`, `Skeleton`, `Separator`, `Progress`
- `Alert`, `Toast` (Sonner), `AlertDialog`
- `Command` (base do CommandPalette), `ScrollArea`
- `Calendar`, `DatePicker`, `DateRangePicker` (com `react-day-picker`)
- `Form` (integração com React Hook Form)

Todos seguem padrões shadcn: `forwardRef`, props tipadas, `className` mergeable via `cn()`.

---

## Camada 2: compounds (proprietários Ethos)

Aqui está o coração da biblioteca. Componentes que combinam primitives em padrões da Ethos.

### DataTablePro

A tabela de dados padrão da Forge. Lista, busca, filtra, ordena, paginação, bulk actions.

```tsx
import { DataTablePro } from "@ethos/ui";

<DataTablePro
  data={clients}
  columns={[
    { key: "name", label: "Nome", sortable: true },
    { key: "email", label: "Email" },
    { key: "status", label: "Status", render: (row) => <StatusBadge status={row.status} /> },
    { key: "createdAt", label: "Cadastro", render: (row) => formatDate(row.createdAt) },
  ]}
  search={{
    placeholder: "Buscar cliente...",
    onSearch: (query) => setSearch(query),
  }}
  filters={[
    { key: "status", label: "Status", options: [...] },
  ]}
  pagination={{
    page: 1,
    pageSize: 20,
    total: 234,
    onPageChange: (page) => setPage(page),
  }}
  bulkActions={[
    { label: "Excluir selecionados", action: "delete", variant: "destructive" },
    { label: "Exportar", action: "export" },
  ]}
  onBulkAction={(action, selectedIds) => handleBulk(action, selectedIds)}
  rowActions={(row) => [
    { label: "Editar", onClick: () => editClient(row.id) },
    { label: "Excluir", onClick: () => deleteClient(row.id), variant: "destructive" },
  ]}
  onRowClick={(row) => router.push(`/clients/${row.id}`)}
  emptyState={{
    title: "Nenhum cliente cadastrado",
    description: "Adicione seu primeiro cliente para começar.",
    action: { label: "Adicionar cliente", onClick: () => openCreateModal() },
  }}
  loading={isLoading}
  error={error}
/>
```

Construído sobre TanStack Table v8. Internamente usa `Table`, `Checkbox`, `DropdownMenu`, `Input` dos primitives.

### FormBuilder

Cria formulários a partir de um schema declarativo. Integrado com React Hook Form + Zod.

```tsx
import { FormBuilder } from "@ethos/ui";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  birthDate: z.date(),
  category: z.enum(["A", "B", "C"]),
  active: z.boolean(),
  notes: z.string().optional(),
});

<FormBuilder
  schema={schema}
  fields={[
    { name: "name", label: "Nome completo", type: "text", required: true },
    { name: "email", label: "Email", type: "email", required: true },
    { name: "birthDate", label: "Data de nascimento", type: "date" },
    { name: "category", label: "Categoria", type: "select", options: [
      { value: "A", label: "Categoria A" },
      { value: "B", label: "Categoria B" },
      { value: "C", label: "Categoria C" },
    ]},
    { name: "active", label: "Ativo", type: "switch" },
    { name: "notes", label: "Observações", type: "textarea", helperText: "Opcional" },
  ]}
  defaultValues={existingClient}
  onSubmit={async (data) => {
    await createClient(data);
  }}
  submitLabel="Salvar cliente"
  cancelLabel="Cancelar"
  onCancel={() => router.back()}
/>
```

Suporta tipos de campo: `text`, `email`, `password`, `number`, `currency`, `phone`, `cpf`, `cnpj`, `cep`, `date`, `daterange`, `time`, `datetime`, `select`, `multiselect`, `radio`, `checkbox`, `switch`, `textarea`, `richtext`, `file`, `image`, `relation` (busca async em outra entidade), `array` (lista de subitens).

Validação tipada vem do Zod, mensagens de erro em português por padrão.

### KpiCard

Card padrão de métrica.

```tsx
<KpiCard
  label="Receita do mês"
  value="R$ 124.580,00"
  trend={{ value: 12.5, direction: "up", label: "vs mês anterior" }}
  icon={<TrendingUp />}
  loading={isLoading}
/>

<KpiCard
  label="Clientes ativos"
  value={234}
  trend={{ value: -3.2, direction: "down", label: "esta semana" }}
  variant="warning"
/>

<KpiCard
  label="Tempo médio de resposta"
  value="2.4 min"
  description="Considera apenas tickets do mês"
  icon={<Clock />}
/>
```

Variantes: `default`, `success`, `warning`, `destructive`, `info` (afeta cor do ícone e do trend).

### EmptyState, ErrorState, LoadingState

Estados padrão pra listas e dados.

```tsx
<EmptyState
  icon={<Users />}
  title="Nenhum cliente cadastrado"
  description="Adicione seu primeiro cliente para começar a usar o sistema."
  action={{
    label: "Adicionar cliente",
    onClick: () => openCreateModal(),
  }}
/>

<ErrorState
  title="Erro ao carregar dados"
  description="Não conseguimos buscar a lista de clientes. Tente novamente."
  onRetry={() => refetch()}
/>

<LoadingState type="skeleton" rows={5} />
<LoadingState type="spinner" />
<LoadingState type="dots" />
```

### ConfirmDialog

Modal de confirmação reutilizável.

```tsx
import { useConfirm } from "@ethos/ui";

const confirm = useConfirm();

const handleDelete = async () => {
  const confirmed = await confirm({
    title: "Excluir cliente?",
    description: "Esta ação não pode ser desfeita. Todos os dados deste cliente serão removidos permanentemente.",
    confirmLabel: "Sim, excluir",
    cancelLabel: "Cancelar",
    variant: "destructive",
  });

  if (confirmed) {
    await deleteClient(id);
  }
};
```

Variantes: `default`, `destructive`, `warning`, `info`.

### FiltersPanel

Painel de filtros lateral ou inline pra listas.

```tsx
<FiltersPanel
  filters={[
    {
      key: "status",
      label: "Status",
      type: "checkbox",
      options: [
        { value: "active", label: "Ativos" },
        { value: "inactive", label: "Inativos" },
      ],
    },
    {
      key: "createdAt",
      label: "Data de cadastro",
      type: "daterange",
    },
    {
      key: "category",
      label: "Categoria",
      type: "select",
      options: categories,
    },
  ]}
  values={currentFilters}
  onChange={setFilters}
  onClear={() => setFilters({})}
/>
```

### SearchBar

Barra de busca com command palette opcional.

```tsx
<SearchBar
  placeholder="Buscar..."
  onSearch={handleSearch}
  shortcut="cmd+k"
  recentSearches={recent}
  suggestions={suggestions}
/>
```

### Breadcrumb

Navegação hierárquica.

```tsx
<Breadcrumb
  items={[
    { label: "Início", href: "/" },
    { label: "Clientes", href: "/clients" },
    { label: "Maria Silva" }, // sem href = item atual
  ]}
/>
```

### PageHeader

Header padrão de páginas.

```tsx
<PageHeader
  title="Clientes"
  description="Gerencie todos os clientes cadastrados no sistema"
  breadcrumb={[
    { label: "Início", href: "/" },
    { label: "Clientes" },
  ]}
  actions={
    <>
      <Button variant="outline">Exportar</Button>
      <Button>Novo cliente</Button>
    </>
  }
/>
```

### StatGrid

Grid responsivo de KpiCards.

```tsx
<StatGrid columns={4}>
  <KpiCard label="Receita" value="R$ 124k" />
  <KpiCard label="Clientes" value={234} />
  <KpiCard label="Pedidos" value={89} />
  <KpiCard label="Conversão" value="12%" />
</StatGrid>
```

### Timeline

Linha do tempo de eventos.

```tsx
<Timeline
  items={[
    {
      date: new Date(),
      title: "Cliente cadastrado",
      description: "Maria Silva foi cadastrada por João.",
      icon: <UserPlus />,
    },
    {
      date: yesterday,
      title: "Pedido aprovado",
      description: "Pedido #1234 foi aprovado.",
      icon: <Check />,
      variant: "success",
    },
  ]}
/>
```

### CommandPalette

Command palette global (Cmd+K).

```tsx
<CommandPalette
  trigger="cmd+k"
  groups={[
    {
      heading: "Navegação",
      items: [
        { label: "Ir para Clientes", icon: <Users />, action: () => router.push("/clients") },
        { label: "Ir para Vendas", icon: <DollarSign />, action: () => router.push("/sales") },
      ],
    },
    {
      heading: "Ações",
      items: [
        { label: "Novo cliente", icon: <Plus />, action: () => openCreate("client") },
        { label: "Novo pedido", icon: <Plus />, action: () => openCreate("order") },
      ],
    },
  ]}
/>
```

---

## Camada 3: layouts

### DashboardLayout

Estrutura padrão de página administrativa: Sidebar + Topbar + Conteúdo.

```tsx
import { DashboardLayout } from "@ethos/ui";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardLayout
      sidebar={{
        logo: <Logo />,
        items: [
          {
            section: "Principal",
            items: [
              { label: "Dashboard", icon: <LayoutDashboard />, href: "/" },
              { label: "Clientes", icon: <Users />, href: "/clients" },
              { label: "Vendas", icon: <DollarSign />, href: "/sales" },
            ],
          },
          {
            section: "Configurações",
            items: [
              { label: "Equipe", icon: <UserCog />, href: "/team" },
              { label: "Integrações", icon: <Plug />, href: "/integrations" },
            ],
          },
        ],
        footer: <UserMenu />,
      }}
      topbar={{
        breadcrumb: <Breadcrumb items={breadcrumbItems} />,
        actions: (
          <>
            <NotificationsButton />
            <ThemeToggle />
            <CommandPaletteTrigger />
          </>
        ),
      }}
    >
      {children}
    </DashboardLayout>
  );
}
```

Comportamento:
- Sidebar fixa de 240px no desktop
- Vira drawer no mobile (abre via hamburger no topbar)
- Sidebar pode ser colapsada (vira só ícones, 64px)
- Estado de colapso persistido em localStorage
- Topbar sticky no topo
- Conteúdo scrolla independente da sidebar

### AuthLayout

Layout centralizado pra páginas de login, registro, recuperação de senha.

```tsx
<AuthLayout
  logo={<Logo />}
  title="Bem-vindo de volta"
  subtitle="Entre com sua conta para continuar"
  illustration={<LoginIllustration />} // opcional, lateral direita
>
  <LoginForm />
</AuthLayout>
```

### SettingsLayout

Sub-layout pra área de configurações com sidebar interna.

```tsx
<SettingsLayout
  sections={[
    { label: "Perfil", href: "/settings/profile" },
    { label: "Conta", href: "/settings/account" },
    { label: "Notificações", href: "/settings/notifications" },
    { label: "Equipe", href: "/settings/team" },
    { label: "Integrações", href: "/settings/integrations" },
    { label: "Cobrança", href: "/settings/billing" },
  ]}
>
  {children}
</SettingsLayout>
```

---

## Customização por projeto cliente

Cada projeto pode customizar:

### Cores

```css
/* projeto-cliente/src/app/globals.css */
@layer base {
  :root {
    --primary: 142 71% 45%;  /* verde do cliente */
    --ring: 142 71% 45%;
  }
}
```

### Logo

```tsx
// projeto-cliente/src/components/logo.tsx
export function Logo() {
  return <img src="/logo-cliente.svg" alt="Cliente" />;
}
```

Usado no `DashboardLayout` e `AuthLayout`.

### Sidebar customizada

A estrutura de items da Sidebar é definida pelo projeto, não pela Forge. A Forge fornece o componente, o projeto preenche conteúdo.

### Componentes adicionais

Se o projeto precisa de algo único (ex: `<KanbanBoard>` pra um sistema de gestão de tarefas), constrói no próprio projeto, não na Forge. Se aparece em 3+ projetos, **sobe pra Forge**.

---

## Storybook

Toda `@ethos/ui` é documentada no Storybook.

```bash
pnpm storybook
```

Storybook tem stories pra cada componente:
- Variantes (todas as variants/sizes)
- Estados (loading, disabled, error)
- Casos extremos (texto longo, lista vazia)
- Dark mode preview

Stories ficam em `[componente]/[componente].stories.tsx`.

Exemplo:

```tsx
// button/button.stories.tsx
import type { Meta, StoryObj } from "@storybook/react";
import { Button } from "./button";

const meta: Meta<typeof Button> = {
  component: Button,
  args: { children: "Botão" },
};

export default meta;
type Story = StoryObj<typeof Button>;

export const Default: Story = {};
export const Secondary: Story = { args: { variant: "secondary" } };
export const Destructive: Story = { args: { variant: "destructive" } };
export const Loading: Story = { args: { loading: true } };
export const Icon: Story = {
  args: { size: "icon", children: <PlusIcon /> },
};
```

---

## Acessibilidade

Padrões obrigatórios pra todo componente:

- **Foco visível** sempre. Outline da cor `--ring`, 2px, offset 2px.
- **Keyboard navigation** funciona em todos os componentes interativos.
- **ARIA labels** corretos. shadcn/Radix já cuidam disso, mas componentes proprietários precisam atenção.
- **Contraste AAA** entre texto e background quando possível, mínimo AA.
- **Screen readers** entendem a estrutura. `aria-label` em botões só com ícones, `aria-describedby` em inputs com helper text.

Antes de adicionar componente novo, testar:
- Tab navigation funciona
- Enter/Space ativam botões
- Esc fecha dialogs
- Setas navegam em selects/menus

---

## Adicionando componente novo

Quando criar componente proprietário novo (após validar que aparece em 3+ projetos):

1. **Criar pasta:** `packages/ui/src/compounds/[nome]/`
2. **Estrutura:**
   ```
   compounds/data-table-pro/
   ├── data-table-pro.tsx
   ├── data-table-pro.stories.tsx
   ├── use-data-table-pro.ts (se tiver hook)
   ├── types.ts
   └── index.ts (barrel export)
   ```
3. **Exportar no index principal:** `packages/ui/src/index.ts`
4. **Criar story no Storybook**
5. **Atualizar esse `.md` com a nova entrada**
6. **Testar no `playground`**

---

## Lista canônica de componentes (atualizada conforme construção)

### Primitives (shadcn customizado) — ~30 componentes

Button, Input, Label, Textarea, Select, Checkbox, Radio, Switch, Slider, Card, Dialog, Sheet, Drawer, Popover, Tooltip, HoverCard, DropdownMenu, ContextMenu, Tabs, Accordion, Collapsible, Badge, Avatar, Skeleton, Separator, Progress, Alert, Toast, AlertDialog, Command, ScrollArea, Calendar, DatePicker.

### Compounds proprietários — v1

DataTablePro, FormBuilder, KpiCard, EmptyState, ErrorState, LoadingState, ConfirmDialog, FiltersPanel, SearchBar, Breadcrumb, PageHeader, StatGrid, Timeline, CommandPalette.

### Layouts — v1

DashboardLayout, AuthLayout, SettingsLayout.

### Compounds previstos pra v2 (criados conforme demanda)

- KanbanBoard
- CalendarView (visualização de eventos no formato de calendário mensal/semanal)
- FileUploader (com drag-and-drop, preview)
- RichTextEditor
- CodeEditor (Monaco wrapped)
- ChartCard (KpiCard + chart embutido)
- StepWizard (formulários multi-step)
- DiffViewer
- AvatarStack
- ChatInterface (base, sem IA)
- VideoPlayer
- MapView (com Mapbox ou Leaflet)
- SignaturePad
