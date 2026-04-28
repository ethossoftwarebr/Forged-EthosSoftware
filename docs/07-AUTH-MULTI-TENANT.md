# 07 — Autenticação e Multi-Tenancy

> Como funciona o sistema de autenticação e isolamento entre tenants na Forge. **Esse padrão é fixo e não-negociável** — todo projeto começa com auth e multi-tenancy funcionando, mesmo que o cliente não tenha pedido. Adiciona segurança e flexibilidade futura sem custo perceptível.

---

## Os conceitos

### Tenant

Um **tenant** representa uma organização/cliente isolada dentro do sistema. Cada tenant tem seus próprios users, dados, configurações.

Mesmo em sistemas vendidos pra um único cliente, há sempre pelo menos 1 tenant. Isso permite:

- Adicionar mais tenants no futuro sem refatorar
- Habilitar B2B (cliente do cliente) facilmente
- Enforce de isolamento de dados desde o início

### User

Um **user** pertence a um ou mais tenants. Em sistemas single-tenant, um user pertence a apenas um tenant. Em sistemas multi-tenant (SaaS B2B), um user pode pertencer a vários tenants e alternar entre eles.

### Role

Um **role** define o que um user pode fazer dentro de um tenant. Padrão Ethos:

- `owner` — dono do tenant, controle total
- `admin` — controle quase total, exceto destruir o tenant
- `manager` — gerenciamento operacional, sem mexer em settings críticos
- `member` — operação normal
- `viewer` — somente leitura

Roles são por tenant: um user pode ser `owner` no tenant A e `viewer` no tenant B.

### Tenant context

Toda requisição autenticada tem um **tenant ativo**. O JWT do user inclui `tenantId` no payload, e todo controller filtra dados por esse `tenantId` automaticamente.

---

## Schema Prisma

Schema base de auth + multi-tenancy. Vai no `templates/starter/prisma/schema.prisma`:

```prisma
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
  id        String   @id @default(cuid())
  email     String   @unique
  name      String
  passwordHash String
  active    Boolean  @default(true)
  emailVerifiedAt DateTime?
  lastLoginAt     DateTime?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  memberships     TenantMember[]
  refreshTokens   RefreshToken[]
  sessions        Session[]

  @@index([email])
}

model TenantMember {
  id       String   @id @default(cuid())
  userId   String
  tenantId String
  role     Role     @default(member)
  invitedBy String?
  invitedAt DateTime @default(now())
  joinedAt  DateTime?

  user     User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  tenant   Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  @@unique([userId, tenantId])
  @@index([tenantId])
  @@index([userId])
}

model RefreshToken {
  id         String   @id @default(cuid())
  userId     String
  tokenHash  String   @unique
  expiresAt  DateTime
  revokedAt  DateTime?
  ip         String?
  userAgent  String?
  createdAt  DateTime @default(now())

  user       User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([tokenHash])
}

model Session {
  id          String   @id @default(cuid())
  userId      String
  tenantId    String
  startedAt   DateTime @default(now())
  expiresAt   DateTime
  ip          String?
  userAgent   String?

  user        User     @relation(fields: [userId], references: [id])

  @@index([userId])
  @@index([expiresAt])
}

enum Role {
  owner
  admin
  manager
  member
  viewer
}
```

---

## Fluxo de registro

### Sign up novo user (cria tenant junto)

Endpoint: `POST /auth/register`

Body:
```json
{
  "name": "João Silva",
  "email": "joao@example.com",
  "password": "...",
  "tenantName": "Pet Shop do João"
}
```

Lógica:
1. Valida email único
2. Hash da senha com bcrypt (cost 12)
3. Cria `Tenant` (slug auto-gerado a partir do nome)
4. Cria `User`
5. Cria `TenantMember` com role `owner`
6. Gera tokens (access + refresh)
7. Retorna user + tokens

### Convidar user existente pra um tenant

Endpoint: `POST /tenants/:tenantId/invite` (precisa ser admin/owner)

Body:
```json
{
  "email": "maria@example.com",
  "role": "manager"
}
```

Lógica:
1. Valida que o requestor tem role admin ou owner no tenant
2. Verifica se email já é user. Se for, cria `TenantMember` direto. Se não, manda email de convite.
3. Email tem link com token único válido por 7 dias
4. User clica, completa cadastro (se novo) ou aceita (se existente)

---

## Fluxo de login

### Login com email/senha

Endpoint: `POST /auth/login`

Body:
```json
{
  "email": "joao@example.com",
  "password": "...",
  "tenantSlug": "pet-shop-joao"  // opcional se user só tem 1 tenant
}
```

Lógica:
1. Busca user por email
2. Compara hash de senha (bcrypt)
3. Verifica que user tem membership no tenant especificado (ou tem só 1 tenant e usa esse)
4. Atualiza `lastLoginAt`
5. Cria `Session`
6. Gera access token (15 min) e refresh token (7 dias)
7. Retorna:
   ```json
   {
     "user": { ... },
     "tenant": { ... },
     "role": "owner",
     "accessToken": "...",
     "refreshToken": "..."
   }
   ```

Rate limit: **5 tentativas / 15 minutos / IP**.

### Refresh de token

Endpoint: `POST /auth/refresh`

Body:
```json
{
  "refreshToken": "..."
}
```

Lógica:
1. Valida refresh token (não expirado, não revogado)
2. Gera novo access token
3. Opcionalmente rotaciona refresh token (recomendado)
4. Retorna novos tokens

### Logout

Endpoint: `POST /auth/logout`

Lógica:
1. Revoga refresh token (`revokedAt = now()`)
2. Encerra session ativa
3. Retorna 204

### Me

Endpoint: `GET /auth/me`

Retorna user logado + tenant ativo + role + permissions.

---

## JWT payload

Access token JWT contém:

```json
{
  "sub": "user_id",
  "tenantId": "tenant_id",
  "role": "owner",
  "email": "joao@example.com",
  "iat": 1234567890,
  "exp": 1234568790
}
```

Assinado com `JWT_SECRET` (env var). Algoritmo: HS256.

Refresh token é um random string de 64 chars, hasheado com SHA-256 antes de salvar no DB. Original vai pro user, hash fica no DB.

---

## Implementação backend

### `packages/auth/src/backend/auth.module.ts`

```typescript
import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { ThrottlerModule } from "@nestjs/throttler";
import { AuthService } from "./auth.service";
import { AuthController } from "./auth.controller";
import { JwtStrategy } from "./strategies/jwt.strategy";
import { TenantService } from "./tenant.service";

@Module({
  imports: [
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: "15m" },
    }),
    ThrottlerModule.forRoot([
      { name: "login", ttl: 900_000, limit: 5 }, // 5 tentativas / 15 min
    ]),
  ],
  providers: [AuthService, TenantService, JwtStrategy],
  controllers: [AuthController],
  exports: [AuthService, TenantService, JwtModule],
})
export class AuthModule {}
```

### Guards

`packages/auth/src/backend/guards/jwt-auth.guard.ts`:

```typescript
import { Injectable, ExecutionContext, UnauthorizedException } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";

@Injectable()
export class JwtAuthGuard extends AuthGuard("jwt") {
  handleRequest(err, user, info) {
    if (err || !user) {
      throw new UnauthorizedException("Token inválido ou expirado");
    }
    return user;
  }
}
```

`packages/auth/src/backend/guards/roles.guard.ts`:

```typescript
import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { ROLES_KEY } from "../decorators/roles.decorator";

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles?.length) return true;

    const { user } = context.switchToHttp().getRequest();
    if (!user || !requiredRoles.includes(user.role)) {
      throw new ForbiddenException("Permissão insuficiente");
    }

    return true;
  }
}
```

### Decoradores

`packages/auth/src/backend/decorators/`:

```typescript
// current-user.decorator.ts
export const CurrentUser = createParamDecorator(
  (_, ctx: ExecutionContext): { id: string; email: string; role: Role } => {
    return ctx.switchToHttp().getRequest().user;
  },
);

// current-tenant.decorator.ts
export const CurrentTenant = createParamDecorator(
  (_, ctx: ExecutionContext): string => {
    return ctx.switchToHttp().getRequest().user.tenantId;
  },
);

// roles.decorator.ts
export const ROLES_KEY = "roles";
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
```

Uso em controllers:

```typescript
@Controller("clients")
@UseGuards(JwtAuthGuard, RolesGuard)
export class ClientController {
  @Get()
  // Qualquer autenticado pode listar
  async findAll(@CurrentTenant() tenantId: string) { ... }

  @Post()
  @Roles("owner", "admin", "manager")
  // Só admin+ pode criar
  async create(@Body() dto, @CurrentTenant() tenantId: string) { ... }

  @Delete(":id")
  @Roles("owner", "admin")
  // Só owner/admin pode deletar
  async remove(@Param("id") id: string) { ... }
}
```

---

## Multi-tenancy automático no Prisma

Pra evitar que o dev esqueça de filtrar por `tenantId` em alguma query, usamos **Prisma extension** que injeta o filtro automaticamente.

### `packages/api-base/src/tenant/prisma-tenant-extension.ts`

```typescript
import { Prisma } from "@prisma/client";
import { AsyncLocalStorage } from "async_hooks";

// Storage que mantém o tenantId atual da requisição
export const tenantStorage = new AsyncLocalStorage<{ tenantId: string }>();

const TENANT_MODELS = [
  // Lista de models que têm tenantId — gerada automaticamente pela Forge
  "Client",
  "Order",
  "Product",
  // ...
];

export function withTenancy(prisma: PrismaClient) {
  return prisma.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          const tenantId = tenantStorage.getStore()?.tenantId;

          // Se não tem tenant context (ex: scripts admin), passa direto
          if (!tenantId) return query(args);

          // Se model não é tenant-aware, passa direto
          if (!TENANT_MODELS.includes(model)) return query(args);

          // Injeta tenantId em queries de leitura
          if (["findUnique", "findFirst", "findMany", "count"].includes(operation)) {
            args.where = { ...args.where, tenantId };
          }

          // Injeta tenantId em creates
          if (operation === "create") {
            args.data = { ...args.data, tenantId };
          }

          // Garante que updates/deletes respeitam tenant
          if (["update", "updateMany", "delete", "deleteMany"].includes(operation)) {
            args.where = { ...args.where, tenantId };
          }

          return query(args);
        },
      },
    },
  });
}
```

### Interceptor que popula o storage

`packages/api-base/src/tenant/tenant.interceptor.ts`:

```typescript
@Injectable()
export class TenantInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const tenantId = request.user?.tenantId;

    if (tenantId) {
      return new Observable((subscriber) => {
        tenantStorage.run({ tenantId }, () => {
          next.handle().subscribe(subscriber);
        });
      });
    }

    return next.handle();
  }
}
```

Em `main.ts`:

```typescript
app.useGlobalInterceptors(new TenantInterceptor());
```

Resultado: depois de logado, **toda query Prisma é automaticamente filtrada por tenant**. Dev nem precisa lembrar disso.

---

## Frontend: hooks de auth

### `packages/auth/src/react/use-auth.ts`

```typescript
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { authClient } from "./client";

export function useAuth() {
  const { data: user, isLoading } = useQuery({
    queryKey: ["auth", "me"],
    queryFn: () => authClient.me(),
    retry: false,
  });

  return {
    user: user?.user,
    tenant: user?.tenant,
    role: user?.role,
    isAuthenticated: !!user,
    isLoading,
  };
}

export function useLogin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: LoginInput) => authClient.login(input),
    onSuccess: (data) => {
      authClient.setTokens(data.accessToken, data.refreshToken);
      queryClient.invalidateQueries({ queryKey: ["auth"] });
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => authClient.logout(),
    onSuccess: () => {
      authClient.clearTokens();
      queryClient.clear();
      window.location.href = "/login";
    },
  });
}
```

### Storage de tokens

- **Access token:** memória (variável JS)
- **Refresh token:** httpOnly cookie (setado pelo backend, frontend não vê)

Vantagens:
- Access token em memória → imune a XSS
- Refresh em httpOnly cookie → imune a XSS e enviado automaticamente em requests de refresh
- Nada em localStorage (XSS-vulnerable)

### Cliente HTTP com refresh automático

`packages/auth/src/react/client.ts`:

```typescript
let accessToken: string | null = null;

export const authClient = {
  setTokens(access: string, refresh: string) {
    accessToken = access;
    // Refresh é setado em cookie pelo backend, frontend não toca
  },

  getAccessToken() {
    return accessToken;
  },

  clearTokens() {
    accessToken = null;
  },

  async refreshAccessToken() {
    const response = await fetch("/api/auth/refresh", {
      method: "POST",
      credentials: "include", // envia o cookie httpOnly
    });

    if (!response.ok) {
      this.clearTokens();
      window.location.href = "/login";
      throw new Error("Session expired");
    }

    const { accessToken: newToken } = await response.json();
    accessToken = newToken;
    return newToken;
  },
};

// Interceptor para fetch que renova token automaticamente
export async function fetchWithAuth(input: RequestInfo, init?: RequestInit) {
  let response = await fetch(input, {
    ...init,
    headers: {
      ...init?.headers,
      Authorization: `Bearer ${accessToken}`,
    },
    credentials: "include",
  });

  if (response.status === 401) {
    await authClient.refreshAccessToken();
    response = await fetch(input, {
      ...init,
      headers: {
        ...init?.headers,
        Authorization: `Bearer ${accessToken}`,
      },
      credentials: "include",
    });
  }

  return response;
}
```

### Middleware de proteção de rotas (Next.js)

`apps/web/src/middleware.ts`:

```typescript
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_PATHS = ["/login", "/register", "/forgot-password"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Verifica presença do refresh cookie
  const refreshCookie = request.cookies.get("refreshToken");

  if (!refreshCookie) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
```

---

## Componentes de auth no frontend

### `<LoginForm>`

```tsx
import { useLogin } from "@ethos/auth/react";

export function LoginForm() {
  const login = useLogin();

  return (
    <FormBuilder
      schema={loginSchema}
      fields={[
        { name: "email", label: "Email", type: "email", required: true },
        { name: "password", label: "Senha", type: "password", required: true },
      ]}
      onSubmit={async (data) => {
        await login.mutateAsync(data);
        router.push("/");
      }}
      submitLabel="Entrar"
      isSubmitting={login.isPending}
      error={login.error?.message}
    />
  );
}
```

### `<TenantSwitcher>`

Pra users com múltiplos tenants:

```tsx
<TenantSwitcher
  currentTenantId={user.tenantId}
  tenants={user.memberships.map((m) => ({
    id: m.tenantId,
    name: m.tenant.name,
    role: m.role,
  }))}
  onSwitch={async (tenantId) => {
    await authClient.switchTenant(tenantId);
    queryClient.invalidateQueries();
  }}
/>
```

### `<Protected>` (HOC ou componente wrapper)

```tsx
<Protected requiredRoles={["owner", "admin"]}>
  <DangerZone />
</Protected>
```

---

## Fluxos avançados (v2 ou conforme demanda)

### MFA (autenticação em 2 fatores)

Suporte planejado pra v2:
- TOTP (Google Authenticator, Authy)
- SMS via Twilio
- Email OTP

### SSO (Single Sign-On)

Suporte planejado pra v2:
- Google OAuth
- Microsoft OAuth
- SAML genérico

### Recuperação de senha

Endpoint `POST /auth/forgot-password`:
1. Recebe email
2. Gera token único, salva hash no DB com expiração 1h
3. Envia email com link
4. User clica, abre `/reset-password?token=...`
5. `POST /auth/reset-password` com token + nova senha
6. Valida token, atualiza senha, revoga todos refresh tokens

### Email verification

Após registro, envia email com link de verificação. User não pode fazer ações críticas até verificar.

---

## Considerações de segurança

1. **Senhas hasheadas com bcrypt cost 12.** Nunca em texto puro, nunca SHA-256 ou MD5.
2. **Rate limiting agressivo no login.** 5 tentativas / 15 min / IP. Após 3 falhas, captcha.
3. **Refresh tokens rotacionáveis.** Cada uso gera novo refresh, antigo é revogado.
4. **Logout em todos os devices.** Endpoint `POST /auth/logout-all` revoga todos refresh tokens do user.
5. **Sessions visíveis pro user.** UI mostra "dispositivos conectados" e permite revogar individualmente.
6. **Notificação de login suspeito.** Email automático quando login vem de IP/dispositivo novo.
7. **Tokens com expiração curta.** Access 15min, refresh 7 dias. Trade-off entre segurança e UX.
8. **HTTPS obrigatório em produção.** Cookie `Secure` flag, HSTS.
9. **Audit log de auth.** Todo login, logout, falha, mudança de senha é logado.
10. **Password policy:** mínimo 8 chars, mistura de letras+números recomendada (não obrigatória, evita policies excessivas).

---

## Checklist de implementação

Pra considerar auth completo na Forge:

- [ ] Schema Prisma com User, Tenant, TenantMember, RefreshToken, Session
- [ ] Endpoints: register, login, logout, refresh, me
- [ ] Endpoints: forgot-password, reset-password
- [ ] Endpoints: invite-member, accept-invite
- [ ] JWT com tenantId no payload
- [ ] Bcrypt cost 12 pra senhas
- [ ] Rate limiting no login (5/15min)
- [ ] httpOnly cookies pra refresh
- [ ] Prisma extension de multi-tenancy
- [ ] Interceptor de tenant no NestJS
- [ ] Guards: JwtAuthGuard, RolesGuard
- [ ] Decoradores: @CurrentUser, @CurrentTenant, @Roles
- [ ] Hooks React: useAuth, useLogin, useLogout
- [ ] Componentes: LoginForm, RegisterForm, TenantSwitcher
- [ ] Middleware Next.js de proteção
- [ ] Páginas: /login, /register, /forgot-password, /reset-password
- [ ] Audit log de eventos de auth
- [ ] Testes E2E do fluxo completo

Tudo isso vem pronto no `templates/starter`. Projeto novo nasce com auth funcionando 100%.
