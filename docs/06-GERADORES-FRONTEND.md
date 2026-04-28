# 06 — Geradores Frontend

> Como funciona a geração de código frontend (Next.js + TanStack Query) na Forge. O fluxo é radicalmente diferente do backend: não geramos nada partindo do `schema.prisma` direto. Geramos a partir do **OpenAPI spec** que o backend expõe.

---

## Visão geral

```
backend rodando → /api-docs-json (OpenAPI 3.0)
                        ↓
              @hey-api/openapi-ts → tipos TypeScript + cliente HTTP + hooks TanStack Query
                        ↓
              forge:generate:frontend → páginas Next.js (lista, criar, editar, ver) por entidade
                        ↓
                 dev customiza páginas à vontade
```

**Por que não gerar do `schema.prisma` direto?** Porque o `schema.prisma` não conhece os endpoints — só o backend sabe quais endpoints expôs, com quais filtros, autenticação, etc. O OpenAPI é a fonte da verdade do contrato API.

---

## Setup do `@hey-api/openapi-ts`

### Instalação

No `apps/web/`:

```bash
pnpm add -D @hey-api/openapi-ts
pnpm add @tanstack/react-query
```

### Configuração

`apps/web/openapi-ts.config.ts`:

```typescript
import { defineConfig } from "@hey-api/openapi-ts";

export default defineConfig({
  input: process.env.NEXT_PUBLIC_API_URL + "/api-docs-json",
  output: {
    path: "./src/lib/api/generated",
    format: "prettier",
    lint: "eslint",
  },
  plugins: [
    "@hey-api/client-fetch",         // ou "@hey-api/client-axios"
    "@hey-api/typescript",
    "@hey-api/sdk",
    "@tanstack/react-query",
    "zod",                            // opcional: gera schemas Zod a partir do OpenAPI
  ],
});
```

### Comando

```bash
pnpm openapi-ts
```

Isso lê o JSON do `/api-docs-json` e gera em `src/lib/api/generated/`:

```
src/lib/api/generated/
├── client.gen.ts                    # Cliente HTTP configurado
├── types.gen.ts                     # Types pra todas as entidades e DTOs
├── sdk.gen.ts                       # Funções tipadas pra cada endpoint
├── @tanstack/
│   └── react-query.gen.ts           # Hooks (useQuery, useMutation) prontos
├── zod.gen.ts                       # Schemas Zod
└── index.ts
```

---

## O que cada arquivo gerado contém

### `types.gen.ts`

Pra cada model do backend, types correspondentes:

```typescript
export type Client = {
  id: string;
  tenantId: string;
  name: string;
  email: string;
  phone?: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CreateClientDto = {
  name: string;
  email: string;
  phone?: string;
  active?: boolean;
};

export type UpdateClientDto = Partial<CreateClientDto>;

export type PaginatedClientResponse = {
  data: Array<Client>;
  total: number;
  page: number;
  pageSize: number;
};
```

### `sdk.gen.ts`

Funções tipadas pra cada endpoint:

```typescript
export const listClients = (options?: ListClientsData) => {
  return client.get<PaginatedClientResponse>({
    url: "/clients",
    query: options?.query,
    ...options,
  });
};

export const getClient = (options: GetClientData) => {
  return client.get<Client>({
    url: `/clients/${options.path.id}`,
    ...options,
  });
};

export const createClient = (options: CreateClientData) => {
  return client.post<Client>({
    url: "/clients",
    body: options.body,
    ...options,
  });
};

export const updateClient = (options: UpdateClientData) => {
  return client.patch<Client>({
    url: `/clients/${options.path.id}`,
    body: options.body,
    ...options,
  });
};

export const deleteClient = (options: DeleteClientData) => {
  return client.delete<void>({
    url: `/clients/${options.path.id}`,
    ...options,
  });
};
```

### `@tanstack/react-query.gen.ts`

Hooks TanStack Query:

```typescript
export const listClientsOptions = (options?: ListClientsData) => {
  return queryOptions({
    queryKey: ["clients", "list", options?.query],
    queryFn: () => listClients(options),
  });
};

export const getClientOptions = (options: GetClientData) => {
  return queryOptions({
    queryKey: ["clients", "detail", options.path.id],
    queryFn: () => getClient(options),
  });
};

export const createClientMutation = () => {
  return {
    mutationFn: (body: CreateClientDto) => createClient({ body }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
    },
  };
};
```

Uso:

```typescript
import { useQuery, useMutation } from "@tanstack/react-query";
import { listClientsOptions, createClientMutation } from "@/lib/api/generated/@tanstack/react-query.gen";

function ClientsPage() {
  const { data, isLoading } = useQuery(listClientsOptions());
  const createMutation = useMutation(createClientMutation());

  const handleSubmit = (formData: CreateClientDto) => {
    createMutation.mutate(formData);
  };

  // ...
}
```

---

## Geração das páginas Next.js (templates da Forge)

O `@hey-api/openapi-ts` gera tipos e hooks. **Páginas** são geradas pelo gerador próprio da Forge usando templates Handlebars.

### Comando

```bash
pnpm forge:generate:frontend
```

Esse comando:

1. Lê o OpenAPI JSON
2. Identifica entidades (cada `tag` no OpenAPI vira uma entidade)
3. Pra cada entidade, gera 4 páginas:
   - Lista: `app/(dashboard)/[entidade]/page.tsx`
   - Criação: `app/(dashboard)/[entidade]/new/page.tsx`
   - Edição: `app/(dashboard)/[entidade]/[id]/edit/page.tsx`
   - Visualização: `app/(dashboard)/[entidade]/[id]/page.tsx`

### Template da página de lista

`packages/generators/src/frontend/templates/list-page.hbs`:

```handlebars
"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { Button, DataTablePro, PageHeader, EmptyState } from "@ethos/ui";
import { list{{pascalCasePlural name}}Options } from "@/lib/api/generated/@tanstack/react-query.gen";
import type { {{pascalCase name}} } from "@/lib/api/generated/types.gen";

export default function {{pascalCasePlural name}}Page() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const { data, isLoading, error, refetch } = useQuery(
    list{{pascalCasePlural name}}Options({
      query: { search, page, pageSize },
    })
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="{{labelPlural name}}"
        description="Gerencie todos os {{labelPluralLower name}} cadastrados"
        breadcrumb={[
          { label: "Início", href: "/" },
          { label: "{{labelPlural name}}" },
        ]}
        actions={
          <Button asChild>
            <Link href="/{{kebabCasePlural name}}/new">
              <Plus className="mr-2 h-4 w-4" />
              Novo {{labelLower name}}
            </Link>
          </Button>
        }
      />

      <DataTablePro<{{pascalCase name}}>
        data={data?.data ?? []}
        columns={[
          {{#each fields}}
          { key: "{{name}}", label: "{{label}}"{{#if sortable}}, sortable: true{{/if}} },
          {{/each}}
        ]}
        search={{ "{{" }}
          placeholder: "Buscar {{labelLower name}}...",
          onSearch: setSearch,
        {{ "}}" }}}
        pagination={{ "{{" }}
          page,
          pageSize,
          total: data?.total ?? 0,
          onPageChange: setPage,
        {{ "}}" }}}
        rowActions={(row) => [
          { label: "Visualizar", href: `/{{kebabCasePlural name}}/${row.id}` },
          { label: "Editar", href: `/{{kebabCasePlural name}}/${row.id}/edit` },
          { label: "Excluir", onClick: () => handleDelete(row.id), variant: "destructive" },
        ]}
        loading={isLoading}
        error={error}
        onRetry={refetch}
        emptyState={{ "{{" }}
          title: "Nenhum {{labelLower name}} cadastrado",
          description: "Adicione o primeiro para começar.",
          action: { label: "Adicionar", href: "/{{kebabCasePlural name}}/new" },
        {{ "}}" }}}
      />
    </div>
  );
}
```

### Template da página de criação

`packages/generators/src/frontend/templates/create-page.hbs`:

```handlebars
"use client";

import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { FormBuilder, PageHeader } from "@ethos/ui";
import { create{{pascalCase name}}Mutation } from "@/lib/api/generated/@tanstack/react-query.gen";
import { z } from "zod";

const schema = z.object({
  {{#each fields}}
  {{name}}: {{zodSchema this}},
  {{/each}}
});

export default function New{{pascalCase name}}Page() {
  const router = useRouter();
  const mutation = useMutation(create{{pascalCase name}}Mutation());

  const handleSubmit = async (data: z.infer<typeof schema>) => {
    try {
      const result = await mutation.mutateAsync(data);
      toast.success("{{label name}} criado com sucesso");
      router.push(`/{{kebabCasePlural name}}/${result.id}`);
    } catch (err) {
      toast.error("Erro ao criar {{labelLower name}}");
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <PageHeader
        title="Novo {{label name}}"
        breadcrumb={[
          { label: "Início", href: "/" },
          { label: "{{labelPlural name}}", href: "/{{kebabCasePlural name}}" },
          { label: "Novo" },
        ]}
      />

      <FormBuilder
        schema={schema}
        fields={[
          {{#each fields}}
          {
            name: "{{name}}",
            label: "{{label}}",
            type: "{{formFieldType}}",
            {{#if required}}required: true,{{/if}}
            {{#if options}}options: {{json options}},{{/if}}
            {{#if helperText}}helperText: "{{helperText}}",{{/if}}
          },
          {{/each}}
        ]}
        onSubmit={handleSubmit}
        submitLabel="Criar {{labelLower name}}"
        onCancel={() => router.back()}
        isSubmitting={mutation.isPending}
      />
    </div>
  );
}
```

### Templates similares pra edição e visualização

Mesmo padrão, com adaptações específicas. Páginas de edição puxam dados existentes via `getEntityOptions` e usam `defaultValues` no FormBuilder. Páginas de visualização usam `<DefinitionList>` (componente da @ethos/ui) pra mostrar dados em formato somente-leitura.

---

## Como o gerador infere campos do OpenAPI

O OpenAPI tem schemas pra cada DTO (`CreateClientDto`, `UpdateClientDto`). O gerador lê esses schemas e mapeia tipos Zod e tipos de campo do FormBuilder.

```
OpenAPI type    →  FormBuilder field type  →  Zod
─────────────────────────────────────────────────
string          →  text                    →  z.string()
string + email  →  email                   →  z.string().email()
string + date   →  date                    →  z.coerce.date()
number          →  number                  →  z.number()
boolean         →  switch                  →  z.boolean()
enum            →  select (com options)    →  z.enum([...])
array           →  multiselect             →  z.array(...)
$ref a outra    →  relation (busca async)  →  z.string() (uuid)
```

Decoradores especiais no Prisma DTO ajudam o gerador:

```typescript
// CreateClientDto.ts
export class CreateClientDto {
  @ApiProperty()
  @IsString()
  @MinLength(2)
  name: string;          // → field type "text", required, min 2

  @ApiProperty()
  @IsEmail()
  email: string;         // → field type "email", required

  @ApiProperty({ enum: ["A", "B", "C"] })
  category: string;      // → field type "select" com options
}
```

---

## Sidebar gerada

Além das páginas, o gerador atualiza a Sidebar com novos itens:

`apps/web/src/lib/sidebar-config.ts`:

```typescript
export const sidebarConfig = [
  {
    section: "Principal",
    items: [
      { label: "Dashboard", icon: "LayoutDashboard", href: "/" },
      // AUTOGEN START
      { label: "Clientes", icon: "Users", href: "/clients" },
      { label: "Produtos", icon: "Package", href: "/products" },
      { label: "Pedidos", icon: "ShoppingCart", href: "/orders" },
      // AUTOGEN END
    ],
  },
];
```

Apenas conteúdo entre markers é regerado. Outras seções da sidebar (configurações, settings, custom) ficam intactas.

### Inferência de ícones

O gerador escolhe ícones Lucide baseado no nome da entidade:
- Client/User/Customer → `Users`
- Product/Item → `Package`
- Order/Sale → `ShoppingCart`
- Invoice/Bill → `FileText`
- Calendar/Event/Schedule → `Calendar`
- Message/Email → `Mail`
- ... etc.

Lista completa em `packages/generators/src/frontend/helpers/icon-mapper.ts`.

Se não conseguir inferir, usa `Folder` como default. Dev pode editar manualmente.

---

## Customizações comuns

### Adicionar coluna calculada na lista

```tsx
// app/(dashboard)/clients/page.tsx (você edita o arquivo gerado)

<DataTablePro
  columns={[
    { key: "name", label: "Nome", sortable: true },
    { key: "email", label: "Email" },
    {
      key: "totalOrders",
      label: "Pedidos",
      render: (row) => (
        <Badge>{row._count?.orders ?? 0}</Badge>
      ),
    },
    // ...
  ]}
/>
```

Lembrando: você precisa estender o backend pra retornar `_count.orders` (via `include` no Prisma).

### Substituir página gerada por uma página customizada

Se a página gerada não atende (ex: você precisa de Kanban ao invés de tabela):

1. Renomeia o arquivo gerado: `app/(dashboard)/orders/page.tsx` → `app/(dashboard)/orders/page.generated.tsx` (mantém como referência)
2. Cria sua versão custom em `app/(dashboard)/orders/page.tsx`
3. No `forge.config.ts`, marca a entidade pra não gerar páginas:
   ```typescript
   export default {
     skipGeneration: ["orders"],
   };
   ```

Daí em diante, regerações não tocam nessa entidade.

### Adicionar página extra (ex: "Configurações" do cliente)

Cria manualmente:

```
app/(dashboard)/clients/[id]/
├── page.tsx                # Visualização (gerada)
├── edit/page.tsx           # Edição (gerada)
└── settings/page.tsx       # Customizada (você cria)
```

A Forge não toca em arquivos que ela não gerou. Liberdade total.

---

## Estrutura final do frontend gerado

```
apps/web/
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx
│   │   │   └── register/page.tsx
│   │   └── (dashboard)/
│   │       ├── layout.tsx
│   │       ├── page.tsx                       # Dashboard home
│   │       ├── clients/
│   │       │   ├── page.tsx                   # GERADO — lista
│   │       │   ├── new/
│   │       │   │   └── page.tsx               # GERADO — criação
│   │       │   └── [id]/
│   │       │       ├── page.tsx               # GERADO — visualização
│   │       │       └── edit/
│   │       │           └── page.tsx           # GERADO — edição
│   │       ├── products/...                   # idem
│   │       └── orders/...                     # idem
│   ├── lib/
│   │   ├── api/
│   │   │   └── generated/                     # AUTOGERADO @hey-api/openapi-ts
│   │   ├── auth/
│   │   ├── query-client.ts
│   │   └── sidebar-config.ts                  # com markers AUTOGEN
│   ├── components/                            # Componentes específicos do projeto
│   └── styles/
│       └── globals.css
├── public/
├── package.json
├── tailwind.config.ts
└── next.config.js
```

---

## Comandos úteis

```bash
# Atualiza tipos + hooks a partir do OpenAPI (precisa do backend rodando)
pnpm openapi-ts

# Gera/regera páginas a partir do OpenAPI
pnpm forge:generate:frontend

# Gera tudo (atualiza tipos e regera páginas)
pnpm forge:generate:frontend --full

# Gera só uma entidade
pnpm forge:generate:frontend --entity=Client

# Gera apenas tipos (sem páginas)
pnpm openapi-ts && pnpm forge:generate:frontend --types-only
```

---

## Customizando os templates Handlebars do frontend

Templates ficam em `packages/generators/src/frontend/templates/`:

- `list-page.hbs`
- `create-page.hbs`
- `edit-page.hbs`
- `view-page.hbs`
- `sidebar-config.hbs`

Editar esses arquivos muda como todos os projetos novos serão gerados. Use com cuidado — mudanças quebram regerações em projetos existentes (até você rodar `forge:generate:frontend` neles também).

---

## Quando NÃO usar a geração frontend

A Forge gera bem páginas CRUD. Casos onde escrever à mão é melhor:

- **Dashboard inicial:** sempre custom, baseado em KPIs específicos do negócio
- **Telas com UX especial:** Kanban, calendário, mapa, gráficos complexos
- **Wizards multi-step**
- **Telas de chat/mensageria**
- **Páginas públicas (landing, apresentação do produto, área do cliente sem login)**
- **Telas de relatórios complexos**

Pra essas, ignore a geração e crie páginas manualmente usando os componentes da `@ethos/ui`.

---

## Recap do fluxo end-to-end

1. Backend recebe migration nova (model `Order` adicionado)
2. Backend reinicia, OpenAPI atualizado em `/api-docs-json`
3. Dev roda `pnpm openapi-ts` no frontend → tipos e hooks atualizados
4. Dev roda `pnpm forge:generate:frontend` → páginas de Order geradas
5. Sidebar atualizada com item "Pedidos"
6. Frontend reinicia, dev pode acessar `/orders` e ver lista funcionando
7. Dev customiza visual ou lógica conforme cliente pedir

Total: **~30 segundos do `prisma migrate` ao frontend funcional**. É esse loop curto que faz a Forge valer a pena.
