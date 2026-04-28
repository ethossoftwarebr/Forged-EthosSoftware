# 09 — Template Starter

> O `templates/starter/` é o repositório clonável que vira ponto de partida de todo projeto cliente. Esse arquivo descreve sua anatomia completa: estrutura, arquivos pré-instalados, configurações, README pro dev seguir.

---

## O que é o starter

Quando entra um projeto novo cliente, o dev:

1. Vai no GitHub do template starter
2. Clica em "Use this template" → "Create a new repository"
3. Renomeia, clona localmente
4. Roda `pnpm install`, ajusta `.env`, roda `pnpm dev`
5. Em ~5 minutos tem sistema funcionando local com auth

O starter já vem com:
- Auth multi-tenant funcionando
- Layout dashboard básico
- Conexão com Postgres
- Geradores configurados
- Deploy Railway pronto pra ativar
- CI/CD GitHub Actions
- README detalhado

---

## Estrutura completa

```
[projeto-cliente]/
├── .github/
│   └── workflows/
│       ├── ci.yml
│       └── deploy.yml
├── apps/
│   ├── api/
│   │   ├── src/
│   │   │   ├── main.ts
│   │   │   ├── app.module.ts
│   │   │   ├── prisma/
│   │   │   │   ├── prisma.module.ts
│   │   │   │   └── prisma.service.ts
│   │   │   ├── modules/
│   │   │   │   └── (vazio — gerados a partir do schema)
│   │   │   ├── generated/
│   │   │   │   └── (vazio — populado por prisma generate)
│   │   │   └── seed/
│   │   │       └── seed.ts
│   │   ├── prisma/
│   │   │   ├── schema.prisma
│   │   │   └── migrations/
│   │   │       └── 0_init/
│   │   │           └── migration.sql
│   │   ├── test/
│   │   │   └── e2e/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── nest-cli.json
│   │   └── Dockerfile
│   └── web/
│       ├── src/
│       │   ├── app/
│       │   │   ├── layout.tsx
│       │   │   ├── globals.css
│       │   │   ├── (auth)/
│       │   │   │   ├── login/page.tsx
│       │   │   │   ├── register/page.tsx
│       │   │   │   └── forgot-password/page.tsx
│       │   │   └── (dashboard)/
│       │   │       ├── layout.tsx
│       │   │       ├── page.tsx
│       │   │       └── settings/
│       │   │           ├── page.tsx
│       │   │           ├── profile/page.tsx
│       │   │           └── team/page.tsx
│       │   ├── components/
│       │   │   ├── logo.tsx
│       │   │   └── providers.tsx
│       │   ├── lib/
│       │   │   ├── api/
│       │   │   │   ├── client.ts
│       │   │   │   └── generated/  (vazio — populado por openapi-ts)
│       │   │   ├── auth/
│       │   │   ├── query-client.ts
│       │   │   └── sidebar-config.ts
│       │   └── styles/
│       │       └── globals.css
│       ├── public/
│       │   ├── favicon.ico
│       │   └── logo.svg
│       ├── package.json
│       ├── tsconfig.json
│       ├── tailwind.config.ts
│       ├── next.config.js
│       ├── postcss.config.js
│       ├── middleware.ts
│       ├── openapi-ts.config.ts
│       ├── forge.config.ts
│       └── Dockerfile
├── packages/
│   └── shared/
│       ├── src/
│       │   ├── types.ts
│       │   └── index.ts
│       ├── package.json
│       └── tsconfig.json
├── .vscode/
│   ├── settings.json
│   ├── extensions.json
│   └── launch.json
├── docker-compose.yml
├── turbo.json
├── pnpm-workspace.yaml
├── package.json
├── tsconfig.base.json
├── .gitignore
├── .env.example
├── .nvmrc
├── .editorconfig
├── .prettierrc
├── .eslintrc.cjs
├── README.md
└── CONTRIBUTING.md
```

---

## Arquivos críticos detalhados

### `package.json` (raiz)

```json
{
  "name": "[NOME-PROJETO]",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "turbo dev",
    "build": "turbo build",
    "lint": "turbo lint",
    "typecheck": "turbo typecheck",
    "test": "turbo test",
    "format": "prettier --write \"**/*.{ts,tsx,md,json}\"",
    "db:up": "docker-compose up -d postgres redis",
    "db:down": "docker-compose down",
    "db:reset": "pnpm --filter api prisma migrate reset",
    "db:migrate": "pnpm --filter api prisma migrate dev",
    "db:seed": "pnpm --filter api prisma db seed",
    "db:studio": "pnpm --filter api prisma studio",
    "generate:backend": "pnpm --filter api forge:generate:backend",
    "generate:frontend": "pnpm --filter web forge:generate:frontend",
    "generate:all": "pnpm generate:backend && pnpm generate:frontend"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "prettier": "^3.0.0",
    "turbo": "^2.0.0",
    "typescript": "^5.4.0"
  },
  "packageManager": "pnpm@9.0.0",
  "engines": {
    "node": ">=20"
  }
}
```

### `apps/api/package.json`

```json
{
  "name": "api",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "build": "nest build",
    "dev": "nest start --watch",
    "start:prod": "node dist/main.js",
    "lint": "eslint \"{src,test}/**/*.ts\"",
    "typecheck": "tsc --noEmit",
    "test": "jest",
    "test:e2e": "jest --config test/jest-e2e.json",
    "forge:generate:backend": "tsx ../../node_modules/@ethos/generators/dist/backend/cli.js"
  },
  "dependencies": {
    "@ethos/api-base": "workspace:*",
    "@ethos/auth": "workspace:*",
    "@nestjs/common": "^10.0.0",
    "@nestjs/core": "^10.0.0",
    "@nestjs/platform-express": "^10.0.0",
    "@nestjs/jwt": "^10.0.0",
    "@nestjs/passport": "^10.0.0",
    "@nestjs/swagger": "^7.0.0",
    "@nestjs/throttler": "^6.0.0",
    "@prisma/client": "^5.0.0",
    "bcrypt": "^5.1.0",
    "class-transformer": "^0.5.0",
    "class-validator": "^0.14.0",
    "passport": "^0.7.0",
    "passport-jwt": "^4.0.0",
    "reflect-metadata": "^0.2.0",
    "rxjs": "^7.0.0",
    "zod": "^3.22.0"
  },
  "devDependencies": {
    "@nestjs/cli": "^10.0.0",
    "@nestjs/schematics": "^10.0.0",
    "@nestjs/testing": "^10.0.0",
    "@types/bcrypt": "^5.0.0",
    "@types/jest": "^29.0.0",
    "@types/passport-jwt": "^4.0.0",
    "jest": "^29.0.0",
    "prisma": "^5.0.0",
    "prisma-crud-generator": "^1.0.0",
    "prisma-generator-nestjs-dto": "^1.0.0",
    "supertest": "^7.0.0",
    "ts-jest": "^29.0.0",
    "tsx": "^4.0.0"
  },
  "prisma": {
    "seed": "tsx src/seed/seed.ts"
  }
}
```

### `apps/api/prisma/schema.prisma`

```prisma
generator client {
  provider = "prisma-client-js"
}

generator nestjs_dto {
  provider = "prisma-generator-nestjs-dto"
  output = "../src/generated/dto"
  outputToNestJsResourceStructure = "false"
  flatResourceStructure = "false"
  classValidation = "true"
  fileNamingStyle = "kebab"
}

generator nestjs_crud {
  provider = "prisma-crud-generator"
  output = "../src/generated/services"
  GenerateServices = "true"
  GenerateInputs = "false"
  PrismaServiceImport = "../prisma/prisma.service"
}

datasource db {
  provider   = "postgresql"
  url        = env("DATABASE_URL")
  extensions = [pgcrypto, pg_trgm, unaccent]
}

// =====================================================
// AUTH + MULTI-TENANCY (vem pronto da Forge)
// =====================================================

model Tenant {
  id        String   @id @default(cuid())
  name      String
  slug      String   @unique
  active    Boolean  @default(true)
  settings  Json     @default("{}")
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  members   TenantMember[]

  @@index([slug])
}

model User {
  id              String   @id @default(cuid())
  email           String   @unique
  name            String
  passwordHash    String
  active          Boolean  @default(true)
  emailVerifiedAt DateTime?
  lastLoginAt     DateTime?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  memberships     TenantMember[]
  refreshTokens   RefreshToken[]
  sessions        Session[]

  @@index([email])
}

model TenantMember {
  id        String   @id @default(cuid())
  userId    String
  tenantId  String
  role      Role     @default(member)
  invitedBy String?
  invitedAt DateTime @default(now())
  joinedAt  DateTime?

  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  tenant    Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  @@unique([userId, tenantId])
  @@index([tenantId])
  @@index([userId])
}

model RefreshToken {
  id        String   @id @default(cuid())
  userId    String
  tokenHash String   @unique
  expiresAt DateTime
  revokedAt DateTime?
  ip        String?
  userAgent String?
  createdAt DateTime @default(now())

  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
}

model Session {
  id        String   @id @default(cuid())
  userId    String
  tenantId  String
  startedAt DateTime @default(now())
  expiresAt DateTime
  ip        String?
  userAgent String?

  user      User     @relation(fields: [userId], references: [id])

  @@index([userId])
}

model AuditLog {
  id        String   @id @default(cuid())
  tenantId  String?
  userId    String?
  action    String
  entity    String?
  entityId  String?
  before    Json?
  after     Json?
  ip        String?
  userAgent String?
  createdAt DateTime @default(now())

  @@index([tenantId])
  @@index([userId])
  @@index([entity, entityId])
  @@index([createdAt])
}

enum Role {
  owner
  admin
  manager
  member
  viewer
}

// =====================================================
// MODELS DO PROJETO (você adiciona aqui)
// =====================================================

// Exemplo:
// model Client {
//   id        String   @id @default(cuid())
//   tenantId  String
//   name      String
//   email     String   @unique
//   ...
// }
```

### `apps/api/src/main.ts`

```typescript
import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import * as cookieParser from "cookie-parser";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(cookieParser());

  app.enableCors({
    origin: process.env.WEB_URL?.split(",") ?? ["http://localhost:3000"],
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  app.setGlobalPrefix("api");

  // Swagger / OpenAPI
  const config = new DocumentBuilder()
    .setTitle(process.env.APP_NAME ?? "API")
    .setVersion("1.0")
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("api-docs", app, document);

  const port = parseInt(process.env.PORT ?? "3001", 10);
  await app.listen(port);

  console.log(`🚀 API ouvindo em http://localhost:${port}`);
  console.log(`📖 Docs em http://localhost:${port}/api-docs`);
}

bootstrap();
```

### `apps/api/src/app.module.ts`

```typescript
import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ThrottlerModule, ThrottlerGuard } from "@nestjs/throttler";
import { APP_GUARD, APP_INTERCEPTOR } from "@nestjs/core";
import { PrismaModule } from "./prisma/prisma.module";
import { AuthModule } from "@ethos/auth/backend";
import { TenantInterceptor } from "@ethos/api-base/tenant";
import { AuditInterceptor } from "@ethos/api-base/audit";

// AUTOGEN MODULES START
// (será populado pelo gerador conforme você adiciona models)
// AUTOGEN MODULES END

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
    PrismaModule,
    AuthModule,
    // AUTOGEN IMPORTS START
    // AUTOGEN IMPORTS END
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_INTERCEPTOR, useClass: TenantInterceptor },
    { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
  ],
})
export class AppModule {}
```

### `apps/api/src/prisma/prisma.service.ts`

```typescript
import { Injectable, OnModuleInit } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import { withTenancy } from "@ethos/api-base/tenant";
import { withEncryption } from "@ethos/api-base/crypto";
import { withAudit } from "@ethos/api-base/audit";

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  async onModuleInit() {
    await this.$connect();
  }
}

// Aplicar extensions (em outro arquivo, exportado)
export function createPrismaClient() {
  const base = new PrismaService();
  return base.$extends(withEncryption()).$extends(withTenancy()).$extends(withAudit());
}
```

### `apps/api/src/seed/seed.ts`

Cria tenant + user owner + dados de exemplo pro dev poder testar imediatamente:

```typescript
import { PrismaClient, Role } from "@prisma/client";
import * as bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seed iniciando...");

  // Tenant principal
  const tenant = await prisma.tenant.upsert({
    where: { slug: "demo" },
    update: {},
    create: {
      name: "Demo",
      slug: "demo",
      active: true,
    },
  });

  // User owner
  const passwordHash = await bcrypt.hash("admin123", 12);
  const user = await prisma.user.upsert({
    where: { email: "admin@demo.com" },
    update: {},
    create: {
      email: "admin@demo.com",
      name: "Admin",
      passwordHash,
      emailVerifiedAt: new Date(),
    },
  });

  // Membership
  await prisma.tenantMember.upsert({
    where: { userId_tenantId: { userId: user.id, tenantId: tenant.id } },
    update: { role: Role.owner },
    create: {
      userId: user.id,
      tenantId: tenant.id,
      role: Role.owner,
      joinedAt: new Date(),
    },
  });

  console.log("✅ Seed concluído!");
  console.log("📧 Login: admin@demo.com");
  console.log("🔑 Senha: admin123");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
```

### `apps/web/package.json`

```json
{
  "name": "web",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "build": "next build",
    "dev": "next dev",
    "start": "next start",
    "lint": "next lint",
    "typecheck": "tsc --noEmit",
    "openapi-ts": "openapi-ts",
    "forge:generate:frontend": "tsx ../../node_modules/@ethos/generators/dist/frontend/cli.js"
  },
  "dependencies": {
    "@ethos/ui": "workspace:*",
    "@ethos/auth": "workspace:*",
    "@hookform/resolvers": "^3.0.0",
    "@tanstack/react-query": "^5.0.0",
    "@tanstack/react-table": "^8.0.0",
    "lucide-react": "^0.400.0",
    "next": "^14.0.0",
    "react": "^18.0.0",
    "react-dom": "^18.0.0",
    "react-hook-form": "^7.0.0",
    "sonner": "^1.0.0",
    "tailwind-merge": "^2.0.0",
    "tailwindcss-animate": "^1.0.0",
    "zod": "^3.22.0",
    "zustand": "^4.0.0"
  },
  "devDependencies": {
    "@hey-api/openapi-ts": "^0.50.0",
    "@types/react": "^18.0.0",
    "@types/react-dom": "^18.0.0",
    "autoprefixer": "^10.0.0",
    "eslint": "^8.0.0",
    "eslint-config-next": "^14.0.0",
    "postcss": "^8.0.0",
    "tailwindcss": "^3.0.0",
    "tsx": "^4.0.0",
    "typescript": "^5.0.0"
  }
}
```

### `apps/web/src/app/layout.tsx`

```tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Providers } from "@/components/providers";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "[NOME PROJETO]",
  description: "[DESCRIÇÃO PROJETO]",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className={inter.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

### `apps/web/src/components/providers.tsx`

```tsx
"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { Toaster } from "sonner";
import { ThemeProvider } from "next-themes";
import { queryClient } from "@/lib/query-client";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
        {children}
        <Toaster position="top-right" />
      </ThemeProvider>
      <ReactQueryDevtools />
    </QueryClientProvider>
  );
}
```

### `apps/web/src/app/(dashboard)/layout.tsx`

```tsx
import { DashboardLayout } from "@ethos/ui";
import { sidebarConfig } from "@/lib/sidebar-config";
import { Logo } from "@/components/logo";
import { UserMenu } from "@/components/user-menu";

export default function DashboardLayoutWrapper({ children }: { children: React.ReactNode }) {
  return (
    <DashboardLayout
      sidebar={{
        logo: <Logo />,
        items: sidebarConfig,
        footer: <UserMenu />,
      }}
    >
      {children}
    </DashboardLayout>
  );
}
```

### `apps/web/src/lib/sidebar-config.ts`

```typescript
import type { SidebarSection } from "@ethos/ui";

export const sidebarConfig: SidebarSection[] = [
  {
    section: "Principal",
    items: [
      { label: "Dashboard", icon: "LayoutDashboard", href: "/" },
      // AUTOGEN ITEMS START
      // (gerados conforme você adiciona models)
      // AUTOGEN ITEMS END
    ],
  },
  {
    section: "Configurações",
    items: [
      { label: "Perfil", icon: "User", href: "/settings/profile" },
      { label: "Equipe", icon: "Users", href: "/settings/team" },
    ],
  },
];
```

### `apps/web/openapi-ts.config.ts`

```typescript
import { defineConfig } from "@hey-api/openapi-ts";

export default defineConfig({
  input: (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api") + "-docs-json",
  output: {
    path: "./src/lib/api/generated",
    format: "prettier",
  },
  plugins: [
    "@hey-api/client-fetch",
    "@hey-api/typescript",
    "@hey-api/sdk",
    "@tanstack/react-query",
  ],
});
```

### `apps/web/forge.config.ts`

Configuração específica do gerador frontend pra esse projeto:

```typescript
import type { ForgeConfig } from "@ethos/generators";

export default {
  // Pular geração pra entidades específicas (pra customizar manualmente)
  skipGeneration: [],

  // Sobrescrever ícones inferidos
  iconOverrides: {
    Client: "Users",
    Order: "ShoppingCart",
  },

  // Customizar labels
  labels: {
    Client: { singular: "Cliente", plural: "Clientes" },
    Order: { singular: "Pedido", plural: "Pedidos" },
  },
} satisfies ForgeConfig;
```

### `docker-compose.yml`

```yaml
version: "3.9"

services:
  postgres:
    image: postgres:16-alpine
    container_name: ${COMPOSE_PROJECT_NAME:-app}-postgres
    environment:
      POSTGRES_USER: app
      POSTGRES_PASSWORD: app_dev_password
      POSTGRES_DB: app_dev
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U app"]
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    container_name: ${COMPOSE_PROJECT_NAME:-app}-redis
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

### `.env.example`

```bash
# ===================
# Database
# ===================
DATABASE_URL="postgresql://app:app_dev_password@localhost:5432/app_dev?schema=public"

# ===================
# Redis
# ===================
REDIS_URL="redis://localhost:6379"

# ===================
# Auth
# ===================
JWT_SECRET="change-me-in-production-use-a-long-random-string"
JWT_REFRESH_SECRET="change-me-also-different-from-jwt-secret"

# ===================
# URLs
# ===================
WEB_URL="http://localhost:3000"
NEXT_PUBLIC_API_URL="http://localhost:3001/api"

# ===================
# Email (opcional na v1)
# ===================
SMTP_HOST=""
SMTP_PORT=""
SMTP_USER=""
SMTP_PASS=""
EMAIL_FROM=""

# ===================
# Pacotes plugáveis (preencha apenas o que usar)
# ===================
ANTHROPIC_API_KEY=""
OPENAI_API_KEY=""

GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""
GOOGLE_REDIRECT_URI=""

ZAPI_INSTANCE_ID=""
ZAPI_TOKEN=""

MERCADO_PAGO_ACCESS_TOKEN=""
STRIPE_SECRET_KEY=""
PAGSEGURO_TOKEN=""

BLING_API_KEY=""
TINY_TOKEN=""
OMIE_APP_KEY=""
OMIE_APP_SECRET=""

N8N_BASE_URL=""
N8N_API_KEY=""
```

### `README.md` do template

```markdown
# [NOME-PROJETO]

> Sistema gerado a partir do template starter da Ethos Forge.

## Stack

- NestJS 10 + Prisma 5 + PostgreSQL 16
- Next.js 14 (App Router) + Tailwind + shadcn
- TanStack Query + Zustand
- React Hook Form + Zod
- Turborepo + pnpm workspaces

## Pré-requisitos

- Node.js >= 20
- pnpm >= 9
- Docker (pra Postgres + Redis local)
- Conta Railway (pra deploy)

## Setup inicial

\`\`\`bash
# 1. Clone e instale
git clone [URL]
cd [projeto]
pnpm install

# 2. Configure variáveis de ambiente
cp .env.example .env
# Edite .env com seus valores

# 3. Suba Postgres e Redis
pnpm db:up

# 4. Rode migrations
pnpm db:migrate

# 5. Seed inicial (cria tenant demo + user admin)
pnpm db:seed

# 6. Inicie em dev mode (api + web simultaneamente)
pnpm dev
\`\`\`

Depois abre http://localhost:3000 e loga com:
- Email: admin@demo.com
- Senha: admin123

## Comandos úteis

\`\`\`bash
pnpm dev                    # api + web em watch mode
pnpm build                  # build de todos os apps
pnpm lint                   # lint completo
pnpm typecheck              # type-check completo
pnpm test                   # roda testes

pnpm db:studio              # Prisma Studio (GUI do banco)
pnpm db:reset               # reset completo (drop + migrate + seed)
pnpm db:migrate             # nova migration

pnpm generate:backend       # regera código backend a partir do schema
pnpm generate:frontend      # regera código frontend a partir do OpenAPI
pnpm generate:all           # regera tudo
\`\`\`

## Adicionar entidade nova

1. Editar \`apps/api/prisma/schema.prisma\` adicionando o model
2. \`pnpm db:migrate --name add_[nome]\`
3. \`pnpm generate:all\`
4. Reiniciar dev (\`pnpm dev\`)
5. Acessar \`/[nome-plural]\` no browser

A entidade já vem com lista, criação, edição, visualização — tudo gerado.

## Customizar lógica de negócio

Edite \`apps/api/src/modules/[entidade]/[entidade].service.ts\`. Esse arquivo é seu — **não é regenerado**.

Exemplo:

\`\`\`typescript
@Injectable()
export class ClientService extends BaseClientService {
  async create(data: CreateClientDto, user: User) {
    const client = await super.create({ data });
    // sua lógica custom aqui
    return client;
  }
}
\`\`\`

## Deploy

Ver \`/docs/DEPLOY.md\`. Resumo: criar projeto no Railway, conectar este repo, configurar env vars, dar push em main.

## Estrutura

\`\`\`
apps/
├── api/    # Backend NestJS
└── web/    # Frontend Next.js

packages/
└── shared/ # Types compartilhados
\`\`\`

## Documentação técnica completa

Ver \`/docs/\`.

## Suporte interno

Time Ethos: [#dev-help no Slack interno]
\`\`\`

### `.gitignore`

```
node_modules/
.next/
dist/
build/
out/

.env
.env.*.local
.env.local

.turbo
.eslintcache
.tsbuildinfo
*.log

coverage/
.nyc_output/

.DS_Store
Thumbs.db

.vscode/*
!.vscode/settings.json
!.vscode/extensions.json
!.vscode/launch.json

.idea/

prisma/migrations/dev.db*
```

### `.vscode/settings.json`

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit"
  },
  "typescript.tsdk": "node_modules/typescript/lib",
  "typescript.enablePromptUseWorkspaceTsdk": true,
  "[prisma]": {
    "editor.defaultFormatter": "Prisma.prisma"
  },
  "tailwindCSS.experimental.classRegex": [
    ["cn\\(([^)]*)\\)", "['\"`]([^'\"`]*).*?['\"`]"]
  ]
}
```

### `.vscode/extensions.json`

```json
{
  "recommendations": [
    "esbenp.prettier-vscode",
    "dbaeumer.vscode-eslint",
    "Prisma.prisma",
    "bradlc.vscode-tailwindcss",
    "ms-azuretools.vscode-docker",
    "GitHub.copilot",
    "Anthropic.claude-code"
  ]
}
```

### `.github/workflows/ci.yml`

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  ci:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
          POSTGRES_DB: test
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v3
        with:
          version: 9

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm

      - name: Install
        run: pnpm install --frozen-lockfile

      - name: Lint
        run: pnpm lint

      - name: Typecheck
        run: pnpm typecheck

      - name: Build
        run: pnpm build

      - name: Test
        run: pnpm test
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/test
          JWT_SECRET: test-secret-do-not-use-in-prod
```

---

## GitHub Template Repository

O repo `templates/starter/` é configurado como **GitHub Template Repository** (Settings → Template repository → ON).

Isso permite:
- Botão "Use this template" na página do repo
- Cria novo repo sem histórico do template
- Dev pode usar via UI sem precisar de fork

Acesso ao template é restrito ao time Ethos (privado, nunca público).

---

## Fluxo do dev iniciando projeto novo

```
Cliente fechado
      ↓
Dev: GitHub → ethos-forge/starter → "Use this template"
      ↓
Dá nome ao repo (ex: petshop-do-joao)
      ↓
Clona localmente: git clone git@github.com:ethos/petshop-do-joao.git
      ↓
cp .env.example .env
      ↓
pnpm install
      ↓
pnpm db:up
      ↓
pnpm db:migrate
      ↓
pnpm db:seed
      ↓
pnpm dev → http://localhost:3000 funcionando
      ↓
Edita schema.prisma adicionando models do projeto
      ↓
pnpm db:migrate --name add_[modelo]
      ↓
pnpm generate:all
      ↓
Sistema com CRUD pronto pra todas as entidades
      ↓
Dev customiza lógica de negócio
      ↓
Deploy Railway (ver 10-DEPLOY-RAILWAY.md)
```

Tempo do clique em "Use this template" até primeiro deploy funcional: **menos de 1 hora**.

---

## Manutenção do template

Quando algum padrão da Forge melhorar (ex: nova versão da `@ethos/ui`, novo gerador, mais módulos no `api-base`), o template é atualizado.

**Mas projetos existentes não são automaticamente atualizados.** Cada projeto fica na versão da Forge que estava no momento do clone.

Atualizar projeto antigo pra versão nova da Forge é processo manual:
1. Atualizar versões dos packages `@ethos/*` no `package.json`
2. Reinstalar (`pnpm install`)
3. Rodar geradores novamente
4. Resolver conflitos manuais (ex: APIs que mudaram)
5. Testar tudo

Decisão por projeto se vale a atualização. Frequência sugerida: 1-2x por ano.
