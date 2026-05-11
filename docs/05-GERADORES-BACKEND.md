# 05 — Geradores Backend

> Como funciona a geração de código backend (NestJS + Prisma) na Forge. Esse arquivo cobre setup, comandos, customização, e o modelo de herança que permite gerar CRUD pronto sem perder liberdade de customizar.

---

## Visão geral

O fluxo de geração backend tem dois passos:

```
schema.prisma  →  prisma generate  →  base services + DTOs (gerados)
                                            ↓
                  forge:generate:backend → controllers + modules (gerados pelos templates Ethos)
                                            ↓
                                       seu service.ts customizado (escrito por você quando precisar)
```

**Tudo gerado é editável.** O modelo é herança: o gerador cospe `BaseClientService` e você cria `ClientService extends BaseClientService` apenas quando precisa adicionar lógica.

---

## Setup do gerador no `schema.prisma`

```prisma
generator client {
  provider = "prisma-client-js"
}

generator nestjs_dto {
  provider = "prisma-generator-nestjs-dto"
  output = "../src/generated/dto"
  outputToNestJsResourceStructure = "false"
  flatResourceStructure = "false"
  exportRelationModifierClasses = "true"
  reExport = "false"
  createDtoPrefix = "Create"
  updateDtoPrefix = "Update"
  dtoSuffix = "Dto"
  entityPrefix = ""
  entitySuffix = ""
  classValidation = "true"
  fileNamingStyle = "kebab"
  noDependencies = "false"
}

generator nestjs_crud {
  provider = "prisma-crud-generator"
  output = "../src/generated/services"
  GenerateServices = "true"
  GenerateInputs = "false"  // já fazemos com nestjs-dto
  PrismaServiceImport = "../prisma/prisma.service"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Client {
  id        String   @id @default(cuid())
  tenantId  String
  name      String
  email     String   @unique
  phone     String?
  active    Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  tenant    Tenant   @relation(fields: [tenantId], references: [id])

  @@index([tenantId])
}
```

Roda `pnpm prisma generate` e em `src/generated/` aparece:

```
src/generated/
├── dto/
│   └── client/
│       ├── create-client.dto.ts
│       ├── update-client.dto.ts
│       └── client.entity.ts
└── services/
    └── client/
        └── client.base.service.ts
```

---

## O que cada gerador produz

### `prisma-generator-nestjs-dto`

Pra cada model, gera:

**`create-client.dto.ts`:**

```typescript
import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEmail, IsOptional, IsBoolean } from 'class-validator';

export class CreateClientDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty()
  @IsEmail()
  email: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ default: true, required: false })
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
```

**`update-client.dto.ts`:**

```typescript
import { PartialType } from '@nestjs/swagger';
import { CreateClientDto } from './create-client.dto';

export class UpdateClientDto extends PartialType(CreateClientDto) {}
```

### `prisma-crud-generator`

Pra cada model, gera `[model].base.service.ts`:

```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class BaseClientService {
  constructor(protected readonly prisma: PrismaService) {}

  async findAll(args?: Prisma.ClientFindManyArgs) {
    return this.prisma.client.findMany(args);
  }

  async findOne(args: Prisma.ClientFindUniqueArgs) {
    return this.prisma.client.findUnique(args);
  }

  async create(data: Prisma.ClientCreateInput) {
    return this.prisma.client.create({ data });
  }

  async update(args: Prisma.ClientUpdateArgs) {
    return this.prisma.client.update(args);
  }

  async delete(args: Prisma.ClientDeleteArgs) {
    return this.prisma.client.delete(args);
  }

  async count(args?: Prisma.ClientCountArgs) {
    return this.prisma.client.count(args);
  }
}
```

---

## Geração custom da Forge: controllers e modules

O `prisma-crud-generator` não gera controllers — gera só services. A Forge tem seu próprio gerador pra controllers e modules.

Esse gerador vive em `tools/generators/forge-controller/` e usa templates Handlebars.

### Comando

```bash
pnpm forge:generate:backend
```

Esse comando lê o `schema.prisma`, identifica os models, e gera pra cada um:

- `src/modules/[model]/[model].controller.ts`
- `src/modules/[model]/[model].service.ts` (wrapper que estende BaseService — você edita à vontade)
- `src/modules/[model]/[model].module.ts`

### Template do controller

`tools/generators/forge-controller/templates/controller.hbs`:

```handlebars
import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { JwtAuthGuard } from "@ethos/api-base/auth";
import { CurrentUser, CurrentTenant } from "@ethos/api-base/decorators";
import { PaginationQuery, PaginatedResponse } from "@ethos/api-base/pagination";
import { {{pascalCase name}}Service } from "./{{kebabCase name}}.service";
import { Create{{pascalCase name}}Dto } from "../../generated/dto/{{kebabCase name}}/create-{{kebabCase name}}.dto";
import { Update{{pascalCase name}}Dto } from "../../generated/dto/{{kebabCase name}}/update-{{kebabCase name}}.dto";

@ApiTags("{{pluralKebab name}}")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("{{pluralKebab name}}")
export class {{pascalCase name}}Controller {
  constructor(private readonly service: {{pascalCase name}}Service) {}

  @Get()
  @ApiOperation({ summary: "List {{pluralKebab name}}" })
  async findAll(
    @Query() query: PaginationQuery,
    @CurrentTenant() tenantId: string,
  ): Promise<PaginatedResponse<{{pascalCase name}}>> {
    return this.service.findAllPaginated({ ...query, tenantId });
  }

  @Get(":id")
  @ApiOperation({ summary: "Get {{kebabCase name}} by id" })
  async findOne(
    @Param("id") id: string,
    @CurrentTenant() tenantId: string,
  ) {
    return this.service.findOne({ where: { id, tenantId } });
  }

  @Post()
  @ApiOperation({ summary: "Create {{kebabCase name}}" })
  async create(
    @Body() dto: Create{{pascalCase name}}Dto,
    @CurrentTenant() tenantId: string,
    @CurrentUser() userId: string,
  ) {
    return this.service.create({ ...dto, tenantId }, userId);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Update {{kebabCase name}}" })
  async update(
    @Param("id") id: string,
    @Body() dto: Update{{pascalCase name}}Dto,
    @CurrentTenant() tenantId: string,
    @CurrentUser() userId: string,
  ) {
    return this.service.update({
      where: { id, tenantId },
      data: dto,
    }, userId);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Delete {{kebabCase name}}" })
  async remove(
    @Param("id") id: string,
    @CurrentTenant() tenantId: string,
    @CurrentUser() userId: string,
  ) {
    return this.service.delete({ where: { id, tenantId } }, userId);
  }
}
```

### Template do service (wrapper)

`tools/generators/forge-controller/templates/service.hbs`:

```handlebars
import { Injectable } from "@nestjs/common"; import { Base{{pascalCase name}}Service } from
"../../generated/services/{{kebabCase name}}/{{kebabCase name}}.base.service"; @Injectable() export
class
{{pascalCase name}}Service extends Base{{pascalCase name}}Service { // Adicione aqui suas
customizações. // Exemplo: // async create(data: Create{{pascalCase name}}Dto & { tenantId: string
}, userId: string) { // const result = await super.create(data); // await
this.notifications.send(userId, "Cliente criado"); // return result; // } }
```

Esse arquivo é gerado **uma vez** (não sobrescrito em regenerações). Você edita à vontade.

### Template do module

`tools/generators/forge-controller/templates/module.hbs`:

```handlebars
import { Module } from "@nestjs/common"; import { PrismaModule } from "../../prisma/prisma.module";
import {
{{pascalCase name}}Service } from "./{{kebabCase name}}.service"; import {
{{pascalCase name}}Controller } from "./{{kebabCase name}}.controller"; @Module({ imports:
[PrismaModule], controllers: [{{pascalCase name}}Controller], providers: [{{pascalCase
  name
}}Service], exports: [{{pascalCase name}}Service], }) export class
{{pascalCase name}}Module {}
```

### Template do app.module (atualização automática)

O gerador também atualiza `src/app.module.ts` adicionando os novos módulos:

```typescript
// Início: AUTOGEN START - não edite entre os marcadores
import { ClientModule } from './modules/client/client.module';
import { OrderModule } from './modules/order/order.module';
import { ProductModule } from './modules/product/product.module';
// AUTOGEN END

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    // AUTOGEN START
    ClientModule,
    OrderModule,
    ProductModule,
    // AUTOGEN END
  ],
})
export class AppModule {}
```

Apenas o conteúdo entre marcadores é regenerado. O resto fica intacto.

---

## Customizações comuns

### Adicionar lógica no create

```typescript
// src/modules/client/client.service.ts
@Injectable()
export class ClientService extends BaseClientService {
  constructor(
    prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly auditService: AuditService,
  ) {
    super(prisma);
  }

  async create(data: CreateClientDto & { tenantId: string }, userId: string) {
    const client = await super.create({ data });

    await this.emailService.sendWelcome(client.email);
    await this.auditService.log({
      action: 'client.created',
      entityId: client.id,
      userId,
      tenantId: data.tenantId,
    });

    return client;
  }
}
```

### Adicionar endpoint customizado

```typescript
// src/modules/client/client.controller.ts (você pode editar — não é regenerado se você marcar com @custom)
@Controller('clients')
export class ClientController extends BaseClientController {
  // ... endpoints gerados ...

  // Adicione novos endpoints à vontade
  @Get(':id/orders')
  @ApiOperation({ summary: 'List orders for a client' })
  async listOrders(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.service.listOrders(id, tenantId);
  }
}
```

Aviso: por simplicidade da v1, o controller é gerado com `@custom-region` markers. Tudo dentro de `// CUSTOM START` / `// CUSTOM END` é preservado em regenerações. Detalhes da implementação: o template Handlebars escreve `// CUSTOM START` no final do controller e o gerador, ao regerar, lê o arquivo existente e preserva esse bloco.

### Sobrescrever findAll (ex: filtros adicionais)

```typescript
async findAllPaginated({ tenantId, page, pageSize, ...filters }: ListClientsParams) {
  const where: Prisma.ClientWhereInput = {
    tenantId,
    ...(filters.search && {
      OR: [
        { name: { contains: filters.search, mode: "insensitive" } },
        { email: { contains: filters.search, mode: "insensitive" } },
      ],
    }),
    ...(filters.active !== undefined && { active: filters.active }),
  };

  const [data, total] = await Promise.all([
    this.prisma.client.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: "desc" },
    }),
    this.prisma.client.count({ where }),
  ]);

  return { data, total, page, pageSize };
}
```

---

## Camadas transversais sempre injetadas

Todo backend gerado pela Forge tem essas peças sempre ativas:

### 1. Multi-tenancy

`@CurrentTenant()` decorator lê o `tenantId` do JWT do user logado e passa pro controller automaticamente. Service usa esse `tenantId` em todas as queries pra isolar dados.

```typescript
// Implementação em packages/api-base/src/decorators/current-tenant.decorator.ts
export const CurrentTenant = createParamDecorator((_, ctx: ExecutionContext): string => {
  const request = ctx.switchToHttp().getRequest();
  return request.user?.tenantId;
});
```

### 2. Audit log

Prisma middleware captura toda operação de write (`create`, `update`, `delete`) e persiste em tabela `AuditLog`.

```typescript
// Implementação em packages/api-base/src/audit/audit.middleware.ts
export function createAuditMiddleware(prisma: PrismaClient) {
  return async (params, next) => {
    const before = await captureBefore(params);
    const result = await next(params);
    const after = result;

    if (['create', 'update', 'delete'].includes(params.action)) {
      await prisma.auditLog.create({
        data: {
          action: `${params.model}.${params.action}`,
          entity: params.model,
          entityId: result.id,
          before,
          after,
          userId: getCurrentUserId(),
          tenantId: getCurrentTenantId(),
        },
      });
    }

    return result;
  };
}
```

### 3. Validation pipe global

Em `main.ts` do app:

```typescript
app.useGlobalPipes(
  new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
  }),
);
```

DTOs gerados já têm `class-validator` decorators. Validação acontece automaticamente.

### 4. Swagger/OpenAPI

Em `main.ts`:

```typescript
const config = new DocumentBuilder()
  .setTitle(process.env.APP_NAME)
  .setVersion('1.0')
  .addBearerAuth()
  .build();

const document = SwaggerModule.createDocument(app, config);
SwaggerModule.setup('api-docs', app, document);
// Expõe /api-docs (UI) e /api-docs-json (spec JSON)
```

O JSON é consumido pelo gerador frontend (próximo arquivo).

### 5. Encryption de campos sensíveis

Pra campos marcados como sensíveis, Prisma extension faz encrypt/decrypt automático.

```prisma
model Client {
  cpf String /// @encrypted
}
```

```typescript
// packages/api-base/src/crypto/prisma-extension.ts
export function withEncryption(prisma: PrismaClient) {
  return prisma.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          // Encrypt antes de save
          if (['create', 'update'].includes(operation)) {
            args.data = encryptSensitiveFields(model, args.data);
          }

          const result = await query(args);

          // Decrypt depois de read
          if (['findUnique', 'findFirst', 'findMany'].includes(operation)) {
            return decryptSensitiveFields(model, result);
          }

          return result;
        },
      },
    },
  });
}
```

---

## Estrutura final do backend gerado

Após `pnpm forge:generate:backend` rodar pra um projeto com 5 models:

```
templates/starter/apps/api/
├── src/
│   ├── main.ts
│   ├── app.module.ts                # com markers AUTOGEN
│   ├── prisma/
│   │   └── prisma.service.ts
│   ├── modules/
│   │   ├── client/
│   │   │   ├── client.controller.ts
│   │   │   ├── client.service.ts    # extends BaseClientService
│   │   │   └── client.module.ts
│   │   ├── order/...
│   │   ├── product/...
│   │   └── ...
│   └── generated/                   # AUTOGERADO — NÃO EDITAR
│       ├── dto/
│       │   ├── client/
│       │   ├── order/
│       │   └── ...
│       └── services/
│           ├── client/client.base.service.ts
│           ├── order/order.base.service.ts
│           └── ...
├── prisma/
│   ├── schema.prisma
│   └── migrations/
└── package.json
```

---

## Comandos úteis

```bash
# Regenera tudo (Prisma + controllers + modules)
pnpm forge:generate:backend

# Regenera só Prisma (DTOs + base services)
pnpm prisma generate

# Roda migration nova
pnpm prisma migrate dev --name add_clients

# Reseta DB local (drop + migrate + seed)
pnpm prisma migrate reset

# Abre Prisma Studio (GUI pra ver dados)
pnpm prisma studio

# Atualiza só os controllers/modules sem mexer em DTOs
pnpm forge:generate:backend --skip-prisma
```

---

## Customizando os templates Handlebars

Se você quiser mudar o padrão de geração (ex: adicionar audit log automático em todos os endpoints), edite os templates em `tools/generators/forge-controller/templates/`.

Como os templates ficam no monorepo da Forge, mudanças neles afetam projetos novos. Projetos existentes ficam com a versão antiga até você rodar `pnpm forge:generate:backend` neles.

**Boa prática:** versionar templates. Se você fizer mudança grande, considere bumpar versão da Forge e documentar no CHANGELOG.

---

## Quando NÃO usar a geração

A Forge gera bem CRUD padrão. Mas casos abaixo, escreva à mão:

- **Endpoints que não são REST clássico** (websockets, GraphQL, RPC, server-sent events)
- **Lógica que não cabe em service:** orchestration de múltiplos services, sagas, workflows complexos
- **Endpoints públicos sem auth** (callbacks de webhook, health checks)
- **Endpoints de export/import grandes** (streaming de CSV, processamento batch)

Pra esses casos, ignore a geração e crie módulos manuais. A Forge não força você a usar geração — ela oferece quando ajuda.

---

## Recap do fluxo end-to-end

1. Dev edita `schema.prisma`, adiciona model `Order`
2. Roda `pnpm prisma migrate dev --name add_orders` → migration aplicada no DB
3. Roda `pnpm forge:generate:backend` →
   - Prisma generate cria DTOs e BaseOrderService
   - Forge generator cria OrderController, OrderService, OrderModule
   - app.module.ts é atualizado entre markers
4. Backend reinicia, endpoints `/orders` (GET, POST, PATCH, DELETE, GET :id) já funcionam
5. Dev customiza `OrderService` se precisar de regra específica
6. OpenAPI atualizado em `/api-docs-json` → consumível pelo frontend (próximo arquivo)

---

## Implementação V1 — aprendizados (prompt #9, 2026-05-11)

### Script real é `forge:gen:backend` (sem o `e`)

Em alguns trechos acima o doc usa `pnpm forge:generate:backend`. Na v1 ficou `pnpm forge:gen:backend` (mais curto, alinhado com `forge:gen:frontend` do #11). Próxima revisão do doc unifica.

### Service NÃO extends do `BaseClientService` gerado

O spec original mandava `service.hbs extends BaseClientService` (saída de `@prisma-utils/prisma-crud-generator`). Na prática, esse generator emite com `import { PrismaService } from 'nestjs-prisma'` — uma instância Prisma **separada** da `@ethos/database` (que provê `PRISMA_CLIENT_TOKEN`). Importar dali quebraria o `withTenant` extension + AuditLog interceptor.

**Decisão V1**: o `service.hbs` gera um Service que usa o `Repository` Forge (também gerado), que injeta `PRISMA_CLIENT_TOKEN`. Os arquivos em `src/generated/crud/` ficam como "stubs disponíveis" mas o runtime não os usa.

### Repository pattern obrigatório (cross-tenant safe sem `@@unique` composto)

`repository.hbs` usa `updateMany`/`deleteMany` com `where: { id, tenantId }` + `findUnique` follow-up no update. Isso garante que `update`/`delete` em ID que existe em outro tenant retorne 404, não 500 (`P2025`). Pattern testado em runtime durante o smoke test.

### DTO Zod hardcoded por model (V1)

`dto.hbs` gera Zod schema fixo (`name/sku/price/description`) com `// TODO(forge): em V2 gerar a partir do schema.prisma`. Mapping field-by-field de Prisma → Zod tem complexidade (tipos `Decimal`, `Json`, optional vs nullable, etc.) — V2 endereça. Dev customiza fields editando o DTO direto.

### `definiteAssignmentAssertion` é no-op no `prisma-generator-nestjs-dto@1.x`

Setado como `"true"` no schema mas o pacote não honra essa flag em alguns paths. Resultado: classes geradas em `src/generated/dto/` têm `name: string;` sem `!:`, e em `strict` mode TS reclama. Solução aplicada: `tsconfig.json` E `tsconfig.build.json` da api **excluem `src/generated/**`\*\*. Os arquivos são git-ignored e não fazem parte do runtime.

### Helper Handlebars `resourcePath` removido

Colisão com a context var de mesmo nome (`{{resourcePath}}` no template virou call ao helper com options object). Os helpers `kebab/pascal/camel/plural` ficam; `resourcePath` agora é só context var.

### Validação D3 (Modelo B) automática

Smoke test do Modelo B em CI futuro: adicionar comentário marker em `products.service.ts`, rodar `forge:gen:backend`, confirmar marker sobrevive. Fluxo já manualmente validado em #9 CLOSE.

### Provider `nestjsCrud`

Use `provider = "prisma-crud-generator"` (binário em `node_modules/.bin/`), não `node node_modules/@prisma-utils/prisma-crud-generator/dist/main.js` — o pacote v1.3.x não expõe `dist/`.
