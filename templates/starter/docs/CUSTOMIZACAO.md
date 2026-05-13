# Customização — Modelo B

Este documento explica como customizar o código gerado pelos geradores Forge **sem perder customizações na próxima regeração**. O padrão é a decisão arquitetural **Modelo B** (D3 da Forge), e ele é o que diferencia a Forge de um scaffolder descartável.

---

## O problema que o Modelo B resolve

Geradores comuns têm dois modos clássicos, ambos ruins:

1. **Gen one-shot:** roda uma vez, cospe arquivos, dev edita à vontade. Bom até o schema mudar — daí é diff manual em cada arquivo, dor crônica.
2. **Gen destrutivo:** roda toda vez e sobrescreve tudo. Customização do dev é apagada ao adicionar um campo no schema.

O Modelo B separa o código gerado em **dois planos**:

- **Plano gerado (regerado a cada gen):** repositório base, DTOs, controller boilerplate, blocos `AUTOGEN`.
- **Plano custom (criado uma vez, depois é seu):** service de negócio, código fora dos blocos AUTOGEN.

A interface entre os dois é estável (BaseRepository / DTOs / módulo). Isto significa que **schema pode evoluir indefinidamente** sem que o dev perca a lógica de negócio que escreveu.

---

## Anatomia do que é gerado vs custom (backend)

Quando você roda `pnpm forge:gen:backend` pra uma entidade `Customer`, isto aparece:

```
apps/api/src/
├── generated/
│   ├── dto/customer.dto.ts                  REGERADO
│   ├── dto/create-customer.dto.ts           REGERADO
│   ├── dto/update-customer.dto.ts           REGERADO
│   └── crud/customer.repository.ts          REGERADO  ← BaseCustomerRepository
└── modules/
    └── customers/
        ├── customers.controller.ts          REGERADO  (REST + Swagger)
        ├── customers.module.ts              REGERADO  (wiring)
        └── customers.service.ts             CUSTOM    ← seu ponto de extensão
```

O `customers.service.ts` é gerado **apenas na primeira vez** (se não existir). Em regenerações subsequentes, o gerador detecta o arquivo e pula. **É seu pra sempre.**

Ele consome a `CustomersRepository` (gerada — não editar) e oferece métodos `list`, `findOne`, `create`, `update`, `remove`. O padrão atual já existe no starter como `products.service.ts` — use como referência.

---

## Exemplo concreto: validar `price > 0` em Product

Cenário: a regra de negócio diz que Products precisam ter preço positivo. A validação não pode estar no DTO (Zod cuida do shape, não da semântica de domínio), e tem que rodar antes de chamar o repository.

**Edite `templates/starter/apps/api/src/modules/products/products.service.ts`:**

```typescript
async create(tenantId: string, dto: CreateProductDto): Promise<ProductItem> {
  // Regra de domínio: preço sempre positivo.
  if (dto.price !== undefined && dto.price <= 0) {
    throw new BadRequestException({
      code: 'PRODUCT_INVALID_PRICE',
      message: 'O preço deve ser maior que zero.',
    });
  }

  return this.productsRepository.create(tenantId, dto as never);
}
```

Próxima vez que rodar `pnpm forge:gen:backend` após adicionar campos novos no schema do Product:

- `generated/dto/create-product.dto.ts` é regerado com o novo campo.
- `products.repository.ts` (BaseRepository) é regerado.
- **`products.service.ts` é preservado** — sua validação continua viva.

---

## Hooks before / after (extensão recomendada)

Para customizações repetitivas (audit, validação, side-effects), a convenção Forge é criar métodos `protected` no service que o controller chama. Padrão sugerido (não é gerado, dev cria sob demanda):

```typescript
@Injectable()
export class CustomersService {
  constructor(private readonly customersRepository: CustomersRepository) {}

  async create(tenantId: string, dto: CreateCustomerDto): Promise<CustomerItem> {
    await this.beforeCreate(tenantId, dto);
    const item = await this.customersRepository.create(tenantId, dto as never);
    await this.afterCreate(tenantId, item);
    return item;
  }

  protected async beforeCreate(tenantId: string, dto: CreateCustomerDto): Promise<void> {
    // ex: normalizar email, checar quota do tenant, validar regra de negócio
  }

  protected async afterCreate(tenantId: string, item: CustomerItem): Promise<void> {
    // ex: emitir evento, enfileirar email de boas-vindas via @ethos/queue
  }
}
```

Se o padrão se repetir em 3+ entidades, considere extrair pra uma classe base própria do produto (NÃO da Forge — projeto específico) em `apps/api/src/common/`.

---

## Cuidado: mass-assignment

Os DTOs gerados pelo `prisma-generator-nestjs-dto` são **permissivos por design** — eles refletem o shape do schema, não a política de domínio. Cabe ao service filtrar campos sensíveis antes de propagar:

```typescript
async update(tenantId: string, id: string, dto: UpdateCustomerDto): Promise<CustomerItem> {
  // BLOQUEAR mutação de campos protegidos
  const { tenantId: _ignored, id: __ignored, createdAt: ___ignored, ...safe } = dto as any;
  return this.customersRepository.update(tenantId, id, safe as never);
}
```

Princípio do menor privilégio (CLAUDE.md) — **nunca** confie no body do request. `tenantId` sempre do JWT, `id` sempre da URL, timestamps sempre do banco.

---

## Quando NÃO regerar (congelar o módulo)

Se um módulo divergir muito do padrão Forge — controller exibindo rotas custom além do CRUD, módulo importando muitos providers exóticos, lógica fora do shape REST padrão — é hora de **congelar**.

Como congelar:

1. Remova a anotação `/// @forge.generate(controller, page)` do model no `schema.prisma`. Mantenha o model — só não regenera mais nada por cima.
2. Os arquivos do módulo (`controller.ts`, `module.ts`) deixam de ser regerados — agora são seus.
3. Continue usando `BaseCustomerRepository` (esse continua sendo regerado, é OK).
4. Comente no topo do controller: `// FORGE-FROZEN: regen disabled — see docs/CUSTOMIZACAO.md`.

Quando vale a pena congelar:

- Mais de 3 endpoints custom além do CRUD padrão.
- Lógica de listagem com agregações complexas (joins múltiplos, GROUP BY).
- Workflow específico (state machine de pedido, aprovação, etc.).

Quando NÃO congelar:

- Adicionar 1-2 validações (use o service, não congele).
- Adicionar campos no DTO (mexa no schema, regere).
- Tweak visual nas páginas (use override de página — próxima seção).

---

## Override de páginas frontend

Páginas em `apps/web/src/app/(dashboard)/<entity>/` são **regeradas a cada `forge:gen:frontend`**. Pra customizar uma página específica sem perder a custom na próxima geração, o padrão Forge é o **override paralelo**:

### Padrão recomendado: rota custom em paralelo

1. Crie um diretório de routing custom em paralelo:

   ```
   apps/web/src/app/(dashboard)/customers-custom/page.tsx
   ```

2. Implemente a página custom usando o SDK gerado (`@/lib/api/`) e componentes de `@ethos/ui`.

3. Redirecione a rota canônica via Next routing — opção A (link da sidebar diretamente):
   - Edite `apps/web/src/config/sidebar.tsx` **fora do bloco AUTOGEN**: adicione um entry custom apontando pra `/customers-custom` e remova/oculte o entry AUTOGEN.

   Opção B (manter URL `/customers` mas servir conteúdo custom):
   - Crie `apps/web/src/middleware.ts` ou edite o existente pra fazer `NextResponse.rewrite(new URL('/customers-custom', req.url))` em `/customers`. (Mais invasivo — use apenas se URL canônica importa.)

4. Próxima `forge:gen:frontend` regenera `customers/page.tsx` (gerado), mas a página custom em `customers-custom/` fica intacta.

### Quando vale a pena fazer override em vez de congelar

- Mudança só visual / de UX em 1-2 páginas.
- Você quer continuar recebendo melhorias dos templates Forge nas páginas que NÃO foram customizadas.

Se TODAS as 4 páginas da entidade vão mudar, congele o módulo (não anote `page` no `/// @forge.generate`).

---

## Resumo da regra de ouro

```
SE arquivo está em generated/                 → NUNCA editar
SE arquivo está entre // FORGE-AUTOGEN        → NUNCA editar dentro do bloco
SE é controller.ts / module.ts gerado         → editar é arriscado; prefira congelar o módulo
SE é <entity>.service.ts                      → EDITE LIVREMENTE (seu pra sempre)
SE é página em app/(dashboard)/<entity>/      → faça override paralelo, não edite direto
SE é código fora dos blocos AUTOGEN           → EDITE LIVREMENTE
```

Quando dúvida: rode `pnpm forge:gen:backend && pnpm forge:gen:frontend` num branch limpo e veja o `git diff`. Tudo que aparecer mudado é regerado — não edite ali.

---

## Próximos passos

- Leia [`docs/05-GERADORES-BACKEND.md`](../../../docs/05-GERADORES-BACKEND.md) e [`docs/06-GERADORES-FRONTEND.md`](../../../docs/06-GERADORES-FRONTEND.md) do Forge pra entender os geradores em profundidade.
- Quando precisar de hooks before/after compartilhados entre vários services, considere extrair pra `apps/api/src/common/base-service.ts` (do produto, não da Forge).
- Para casos em que múltiplos clientes precisam do mesmo módulo custom, é candidato a virar package `@ethos/<dominio>` no monorepo Forge — fale com o time antes.
