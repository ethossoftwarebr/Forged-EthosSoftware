# Adicionando models

Fluxo end-to-end de adicionar uma nova entidade ao sistema. O pipeline Forge gera **backend NestJS + frontend Next.js + entry de sidebar** a partir de um único model no schema central.

Tempo médio do `git pull` ao CRUD funcional: **< 10 minutos** (target da Forge v1).

---

## Exemplo: adicionar `Customer`

Vamos adicionar uma entidade Customer com campos `name`, `email` e relação obrigatória com `Tenant` (multi-tenant — D7).

### Passo 1 — Editar o schema central

O schema Prisma vive em `packages/database/prisma/schema.prisma` (decisão D9 — single source of truth). Abra o arquivo e adicione o model **abaixo dos models de Auth**:

```prisma
/// @forge.generate(controller, page)
model Customer {
  id        String   @id @default(cuid())
  tenantId  String
  name      String
  email     String
  active    Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  tenant    Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  @@unique([tenantId, email])
  @@index([tenantId])
}
```

**Pontos críticos:**

- A anotação `/// @forge.generate(controller, page)` sinaliza pros geradores quais artefatos gerar. Sem ela, o model existe no Prisma mas **NÃO** é exposto via REST/UI.
- `tenantId` é **obrigatório**. A extension `withTenancy` em `@ethos/database` propaga via AsyncLocalStorage — NUNCA aceite `tenantId` do request body/query.
- `@@unique([tenantId, email])` em vez de `email @unique` — multi-tenant não deve unicizar globalmente.
- `@@index([tenantId])` é mandatory para queries multi-tenant performarem bem.

### Passo 2 — Migrar o banco

```bash
pnpm --filter @ethos/database db:migrate --name add_customer
```

Esperado:

```
The following migration(s) have been created and applied:
└─ 2026XXXX_add_customer/
    └─ migration.sql
Generated Prisma Client (5.22.0)
```

Inspecione a SQL gerada em `packages/database/prisma/migrations/<timestamp>_add_customer/migration.sql` antes de comitar.

### Passo 3 — Gerar backend

```bash
pnpm forge:gen:backend
```

Internamente, isto roda:

1. `pnpm --filter @ethos/database db:generate` — atualiza o Prisma Client e regera DTOs em `templates/starter/apps/api/src/generated/dto/`.
2. `node tools/generators/forge-controller/index.js` — emite controller/module/service do NestJS.

Arquivos criados/atualizados:

| Caminho                                                  | Origem      | Editável?        |
| -------------------------------------------------------- | ----------- | ---------------- |
| `apps/api/src/generated/dto/create-customer.dto.ts`      | prisma gen  | NÃO              |
| `apps/api/src/generated/dto/update-customer.dto.ts`      | prisma gen  | NÃO              |
| `apps/api/src/generated/dto/customer.dto.ts`             | prisma gen  | NÃO              |
| `apps/api/src/generated/crud/customer.repository.ts`     | prisma-crud | NÃO              |
| `apps/api/src/modules/customers/customers.controller.ts` | forge-ctrl  | NÃO\*            |
| `apps/api/src/modules/customers/customers.module.ts`     | forge-ctrl  | NÃO\*            |
| `apps/api/src/modules/customers/customers.service.ts`    | forge-ctrl  | **SIM**          |
| `apps/api/src/app.module.ts` (bloco AUTOGEN)             | forge-ctrl  | só fora do bloco |

\* "NÃO" significa "será sobrescrito a cada regen" — se realmente precisar editar, congele o module (ver `CUSTOMIZACAO.md`).

O `customers.service.ts` é seu ponto de extensão (Modelo B — D3). Ele segue o padrão de `products.service.ts` já existente: recebe `tenantId` no construtor de cada método, delega ao repository e levanta `NotFoundException` com código `CUSTOMER_NOT_FOUND` quando não acha.

### Passo 4 — Gerar frontend

```bash
pnpm forge:gen:frontend
```

Internamente:

1. `pnpm --filter @ethos-app/web gen:api` — `@hey-api/openapi-ts` regenera o SDK tipado a partir do `/api-docs-json` da API. **Pré-requisito: a API tem que estar rodando** quando você executa isto, OU você precisa ter um snapshot do OpenAPI commitado.
2. `node tools/generators/forge-page/index.js` — emite 4 páginas + atualiza a sidebar.

Arquivos criados/atualizados:

| Caminho                                                         | Origem     | Editável?        |
| --------------------------------------------------------------- | ---------- | ---------------- |
| `apps/web/src/lib/api/` (SDK inteiro)                           | hey-api    | NÃO              |
| `apps/web/src/app/(dashboard)/customers/page.tsx` (list)        | forge-page | NÃO\*            |
| `apps/web/src/app/(dashboard)/customers/new/page.tsx`           | forge-page | NÃO\*            |
| `apps/web/src/app/(dashboard)/customers/[id]/page.tsx` (detail) | forge-page | NÃO\*            |
| `apps/web/src/app/(dashboard)/customers/[id]/edit/page.tsx`     | forge-page | NÃO\*            |
| `apps/web/src/config/sidebar.tsx` (bloco `FORGE-AUTOGEN:*`)     | forge-page | só fora do bloco |

\* mesma regra do backend — pra customizar uma página, use override (`CUSTOMIZACAO.md`).

### Passo 5 — Reiniciar dev

Mate e suba de novo `pnpm --filter @ethos-app/api dev` + `pnpm --filter @ethos-app/web dev`. Next.js cacheia o bundle de `config/sidebar.tsx`; um restart garante que o novo entry aparece.

### Passo 6 — Testar

Browser:

- Sidebar exibe o novo entry **Customers** com ícone inferido do nome.
- `/customers` renderiza a lista (vazia inicialmente).
- `/customers/new` abre o form de criação.
- Submeter o form cria o Customer no banco (filtrado por `tenantId` do JWT).
- Voltar pra lista — Customer novo aparece.

API (Swagger em <http://localhost:3001/api-docs>):

- `GET /customers` (com Bearer token) — lista paginada.
- `POST /customers` — cria.
- `GET /customers/:id` — detalhe.
- `PATCH /customers/:id` — update.
- `DELETE /customers/:id` — remove.

---

## O que é regenerado vs preservado

Resumo do contrato Forge (Modelo B — D3):

| Tipo de arquivo                                                  | Status                                        |
| ---------------------------------------------------------------- | --------------------------------------------- |
| `apps/api/src/generated/**`                                      | sempre regerado                               |
| `apps/web/src/lib/api/**` (SDK)                                  | sempre regerado                               |
| Conteúdo entre `// FORGE-AUTOGEN:START` / `:END`                 | sempre regerado                               |
| `apps/api/src/modules/<entity>/<entity>.service.ts`              | **preservado** (criado uma vez, depois é seu) |
| Código fora dos blocos AUTOGEN em `sidebar.tsx`, `app.module.ts` | **preservado**                                |
| Migrações em `packages/database/prisma/migrations/**`            | **preservado** (append-only)                  |

Regra simples: **se tem `// FORGE-AUTOGEN`, está em `generated/`, ou é controller/module — não edite. Senão, é seu.**

---

## Pegadinhas comuns

### "Não vejo o entry na sidebar"

- Reiniciou o `next dev`? Next cacheia `config/sidebar.tsx`.
- A anotação no schema é exatamente `/// @forge.generate(controller, page)` (3 barras, sem espaço extra)?
- O bloco `// FORGE-AUTOGEN:START` / `:END` em `sidebar.tsx` está intacto?

### "Endpoint não aparece no Swagger"

- A API foi reiniciada após `forge:gen:backend`?
- O bloco AUTOGEN em `app.module.ts` foi atualizado? (Verifique git diff.)

### "Erro de tipo no SDK do frontend"

- Você rodou `forge:gen:frontend` com a API **antiga** ainda no ar (sem o módulo novo)? Re-rode após reiniciar a API.

### "Imports desordenados após gen"

Follow-up #11.8 conhecido. Workaround:

```bash
pnpm forge:gen:frontend && pnpm --filter @ethos-app/web lint --fix
```

### "Multi-tenant não está filtrando"

A extension `withTenancy` em `@ethos/database` propaga `tenantId` via AsyncLocalStorage. Se queries vazarem dados entre tenants, há quebra no chain. Confira que o `TenantInterceptor` está em `app.module.ts` no array de `providers` como `APP_INTERCEPTOR`. NUNCA pegue `tenantId` do request body/query — é proibido por princípio (CLAUDE.md).

---

## Próximo passo

Quando precisar customizar lógica de negócio (ex: validar `price > 0` antes de criar Product), leia [`CUSTOMIZACAO.md`](./CUSTOMIZACAO.md) — explica o **Modelo B** em detalhe e mostra hooks before/after e override de páginas frontend.
