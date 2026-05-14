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
  "tenantSlug": "pet-shop-joao" // opcional se user só tem 1 tenant
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
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ThrottlerModule } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { TenantService } from './tenant.service';

@Module({
  imports: [
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '15m' },
    }),
    ThrottlerModule.forRoot([
      { name: 'login', ttl: 900_000, limit: 5 }, // 5 tentativas / 15 min
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
import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  handleRequest(err, user, info) {
    if (err || !user) {
      throw new UnauthorizedException('Token inválido ou expirado');
    }
    return user;
  }
}
```

`packages/auth/src/backend/guards/roles.guard.ts`:

```typescript
import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles?.length) return true;

    const { user } = context.switchToHttp().getRequest();
    if (!user || !requiredRoles.includes(user.role)) {
      throw new ForbiddenException('Permissão insuficiente');
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
export const CurrentTenant = createParamDecorator((_, ctx: ExecutionContext): string => {
  return ctx.switchToHttp().getRequest().user.tenantId;
});

// roles.decorator.ts
export const ROLES_KEY = 'roles';
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
import { Prisma } from '@prisma/client';
import { AsyncLocalStorage } from 'async_hooks';

// Storage que mantém o tenantId atual da requisição
export const tenantStorage = new AsyncLocalStorage<{ tenantId: string }>();

const TENANT_MODELS = [
  // Lista de models que têm tenantId — gerada automaticamente pela Forge
  'Client',
  'Order',
  'Product',
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
          if (['findUnique', 'findFirst', 'findMany', 'count'].includes(operation)) {
            args.where = { ...args.where, tenantId };
          }

          // Injeta tenantId em creates
          if (operation === 'create') {
            args.data = { ...args.data, tenantId };
          }

          // Garante que updates/deletes respeitam tenant
          if (['update', 'updateMany', 'delete', 'deleteMany'].includes(operation)) {
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
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { authClient } from './client';

export function useAuth() {
  const { data: user, isLoading } = useQuery({
    queryKey: ['auth', 'me'],
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
      queryClient.invalidateQueries({ queryKey: ['auth'] });
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
      window.location.href = '/login';
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
    const response = await fetch('/api/auth/refresh', {
      method: 'POST',
      credentials: 'include', // envia o cookie httpOnly
    });

    if (!response.ok) {
      this.clearTokens();
      window.location.href = '/login';
      throw new Error('Session expired');
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
    credentials: 'include',
  });

  if (response.status === 401) {
    await authClient.refreshAccessToken();
    response = await fetch(input, {
      ...init,
      headers: {
        ...init?.headers,
        Authorization: `Bearer ${accessToken}`,
      },
      credentials: 'include',
    });
  }

  return response;
}
```

### Middleware de proteção de rotas (Next.js)

`templates/starter/apps/web/src/middleware.ts`:

```typescript
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PUBLIC_PATHS = ['/login', '/register', '/forgot-password'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Verifica presença do refresh cookie
  const refreshCookie = request.cookies.get('refreshToken');

  if (!refreshCookie) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
```

---

## Componentes de auth no frontend

### `<LoginForm>`

```tsx
import { useLogin } from '@ethos/auth/react';

export function LoginForm() {
  const login = useLogin();

  return (
    <FormBuilder
      schema={loginSchema}
      fields={[
        { name: 'email', label: 'Email', type: 'email', required: true },
        { name: 'password', label: 'Senha', type: 'password', required: true },
      ]}
      onSubmit={async (data) => {
        await login.mutateAsync(data);
        router.push('/');
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
<Protected requiredRoles={['owner', 'admin']}>
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

## OAuth (Google + Microsoft) — #8.5

Sign-in social com **Authorization Code Flow + PKCE S256 obrigatório** (D12), via interface `OAuthProvider` em `@ethos/auth`. Implementações concretas: `GoogleProvider` + `MicrosoftProvider` (Entra ID audience `organizations`).

### Tenant resolution (D8.5.1)

1. **Subdomain primário** — `acme.app.com/auth/google` → `state.tenantSlug = 'acme'`. Subdomain reservado: `app` / `www` / `localhost` → não vira slug.
2. **Marketplace fallback** — sem subdomain válido, o callback retorna `?error=oauth_marketplace_required` e o frontend faz o user escolher tenant (V1: ainda na lista de #8.6/#8.7; por ora redireciona com toast amigável).

> ⚠️ `tenantSlug` **NUNCA** vem do body/query — só do subdomain do Host header. Multi-tenant inviolável.

### State + PKCE storage (D8.5.3)

Cookie **httpOnly JWS-assinado** (NÃO Redis, NÃO DB).

- Cookie name: `__oauth_state`
- Atributos: `httpOnly`, `secure` em prod, `sameSite=lax` (NÃO strict — callback é cross-site GET), `path=/`, `maxAge=300s`
- Signing: reusa `JwtKeyset` (`@ethos/auth`) — EdDSA + kid rotation
- Payload: `{ state, codeVerifier, nonce, tenantSlug?, provider, redirectUri, returnTo? }`
- TTL: 5 minutos (rejeita expirado com `oauth_state_expired`)

Por que cookie e não Redis: `REDIS_URL` é optional no env do starter + `packages/queue` ainda não existe (#15). Cookie httpOnly funciona offline, multi-instance OK (state vive no client), zero dep nova.

### Token storage at-rest

`OAuthAccount.{accessToken, refreshToken, idToken}` são cifrados via **AES-256-GCM** (`@ethos/auth.encryptToken`) antes de gravar. Key: `OAUTH_TOKEN_ENCRYPTION_KEY` (64 chars hex = 32 bytes). Formato versionado: `v1:${iv}:${authTag}:${ciphertext}`.

### Provider registration (D8.5.4)

Graceful degradation: `OAuthRegistry` só registra um provider se as 3 vars (`{P}_CLIENT_ID` + `{P}_CLIENT_SECRET` + `{P}_REDIRECT_URI`) estiverem todas presentes. Senão omite + log info. Rota `GET /api/auth/providers` lista os habilitados — UI esconde botões automaticamente.

### Adapter contract (D8.5.6)

`AuthAdapter.loginWithOAuth({ provider, profile, tokens, tenantSlug?, encryptionKey, userAgent?, ip? })` retorna `{ session, tokens, isNewUser }`.

Estratégia de linking:

1. Lookup `OAuthAccount` por `(provider, providerAccountId)` → já vinculado, só re-emite tokens.
2. Lookup `User` por email:
   - `emailVerified !== null` → cria `OAuthAccount` linkado.
   - `emailVerified === null` → throw `EMAIL_NOT_VERIFIED` (anti-takeover — Google manda `email_verified=true`; Microsoft Entra raramente emite `email_verified` mas só rejeita explícito `false`).
   - `!found` → cria `User` (password=null, name/image do profile, emailVerified=now).
3. Tenant: slug provided → lookup; sem slug + 1 membership → usa essa; 0 → cria tenant novo (slug derivado do email domain); >1 → throw `MARKETPLACE_REQUIRED`.

### Erros (D8.5.5)

Backend sempre redireciona `${WEB_BASE_URL}/login?error=<code>`. Frontend (`login/page.tsx`) lê `?error`, mostra toast PT-BR via `OAUTH_ERROR_MESSAGES`, faz `router.replace('/login')` pra limpar URL.

| Código                       | Quando                                                 | Mensagem PT-BR                                                                               |
| ---------------------------- | ------------------------------------------------------ | -------------------------------------------------------------------------------------------- |
| `oauth_state_invalid`        | Cookie state ausente, tampered ou state query ≠ cookie | "Sessão de login inválida. Tente novamente."                                                 |
| `oauth_state_expired`        | exp do JWS state passou (>5min)                        | "Sessão de login expirou. Tente novamente."                                                  |
| `oauth_email_unverified`     | `email_verified=false` no id_token                     | "Seu email não está verificado no provider. Confirme no Google/Microsoft e tente novamente." |
| `oauth_provider_unavailable` | provider name não está no Registry (env não setado)    | "Provider OAuth indisponível."                                                               |
| `oauth_marketplace_required` | user pertence a >1 tenant E não há subdomain           | "Selecione um workspace para entrar."                                                        |
| `oauth_callback_failed`      | Catch-all (exchangeCode/verifyIdToken/etc)             | "Não foi possível entrar via OAuth. Tente novamente."                                        |

### Env vars (todas opcionais salvo nota)

```env
# OAuth — provider só registra se as 3 vars dele forem setadas
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=          # ex: https://app.com/auth/google/callback

MICROSOFT_CLIENT_ID=
MICROSOFT_CLIENT_SECRET=
MICROSOFT_REDIRECT_URI=

# Token encryption — OBRIGATÓRIO se algum provider configurado (Zod superRefine)
OAUTH_TOKEN_ENCRYPTION_KEY=   # 64 chars hex (gerar: openssl rand -hex 32)

WEB_BASE_URL=                 # default http://localhost:3000 — usado em redirect final
```

### Provisionamento (dev)

- **Google Cloud Console** → APIs & Services → Credentials → OAuth 2.0 Client ID (Web app):
  - Authorized JavaScript origins: `http://localhost:3001` (api dev) + `http://acme.localhost:3001`
  - Authorized redirect URIs: `http://localhost:3001/auth/google/callback`
- **Azure Portal** → Microsoft Entra ID → App registrations → New (Web platform):
  - Audience: "Accounts in any organizational directory (Multitenant)"
  - Redirect URI: `http://localhost:3001/auth/microsoft/callback`
  - Certificates & secrets → New client secret

Em dev local com subdomain, edite `C:\Windows\System32\drivers\etc\hosts` (ou `/etc/hosts`): `127.0.0.1 acme.localhost`.

### Rotas (starter API)

| Método | Rota                       | Descrição                                                         |
| ------ | -------------------------- | ----------------------------------------------------------------- |
| GET    | `/auth/:provider`          | Inicia OAuth (sign state cookie + 302 provider)                   |
| GET    | `/auth/:provider/callback` | Exchange code + login + 302 `${WEB_BASE_URL}/dashboard` (ou erro) |
| GET    | `/api/auth/providers`      | `{ providers: [{name,label}] }` — habilitados                     |

### Próximos passos (post-#8.5)

- **#8.7** — MFA / TOTP
- **Pós-v1** — WebAuthn / Passkey, SAML, Apple Sign-In, refresh-token rotation automática no provider OAuth

---

## Magic Link (passwordless por email) — #8.6

Login sem senha: user digita email → backend envia link único TTL 15min → user clica → loga (e registra automaticamente se conta nova). Implementado em `@ethos/email` + `@ethos/auth/passwordless` + rotas no starter API.

### Fluxo end-to-end

1. User abre `/login` → preenche email no `<MagicLinkForm />` → submit
2. Browser → `POST /auth/magic-link/request { email }` (no subdomain do tenant)
3. Backend resolve `tenantSlug` do Host header (igual D8.5.1), gera token plaintext `crypto.randomBytes(32).toString('base64url')` (256-bit entropy), SHA-256 do plaintext vira `tokenHash` (determinístico — permite `@unique` lookup), persiste `MagicLinkToken{ email, tenantId, tokenHash, expiresAt: now+15min, usedAt: null }`
4. Backend dispara email via `EmailAdapter.sendTransactional` (default `ResendAdapter`) com link `${appUrl}/auth/magic-link/verify?token=${plaintext}`
5. Response: **sempre 200 + delay constante 300ms** (anti-enumeração total — não revela se email existe nem se rate-limit acionado)
6. User abre email → clica link → browser carrega `/auth/magic-link/verify?token=...` (web), client component redireciona pro backend
7. Backend `GET /auth/magic-link/verify?token=...` faz: SHA-256 do token → lookup `MagicLinkToken` por `tokenHash @unique` → valida (`usedAt === null`, `expiresAt > now`, `tenantId === resolvedTenantId`) → set `usedAt: now()` atômico (`updateMany where usedAt: null`) → chama `AuthAdapter.loginWithMagicLink({ email, tenantSlug })`
8. Adapter: lookup User por email → existe (auto-verifica `emailVerified=now()` se null — link no email prova controle) ou cria novo (`password: null`, `name: email.split('@')[0]`, `image: null`, `emailVerified: now()`) → resolve tenant via `resolveTenantForUser` → `issueTokens()` → seta cookies access+refresh → redirect `/dashboard`
9. Falha em qualquer ponto → 302 `/login?error=magic_*` com code apropriado

### Decisões travadas (D8.6.1–D8.6.8)

| #          | Decisão                 | Travada                                                                      | Razão                                                                                                                                                                                  |
| ---------- | ----------------------- | ---------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **D8.6.1** | Email provider          | Resend (default) + `EmailAdapter` pluggable                                  | Free tier 100/dia, DKIM auto, zero-Redis, lazy import preserva cold start                                                                                                              |
| **D8.6.2** | Token hash              | **SHA-256 hex** (não argon2id)                                               | Argon2 é não-determinístico (salt) — impede `@unique` lookup. Token tem 256-bit entropy + TTL 15min + single-use → SHA-256 é seguro pra este caso                                      |
| **D8.6.3** | Rate limit              | `@nestjs/throttler` 5/h/IP (default tracker)                                 | Email-based tracker fica como follow-up se abuse via IP rotation detectado                                                                                                             |
| **D8.6.4** | Tenant resolution       | subdomain + marketplace fallback (reuse D8.5.1)                              | `tenantSlug` resolvido do Host header no `POST /request`, persistido em `MagicLinkToken.tenantId`. Body NUNCA carrega tenantId                                                         |
| **D8.6.5** | Anti-enumeração         | sempre 200 OK + delay constante 300ms                                        | Mede elapsed e `await sleep(Math.max(0, 300 - elapsed))`. Anti-enum **total**: web aceita qualquer status (200/429/4xx/5xx) e redireciona pra `/auth/magic-link/sent`                  |
| **D8.6.6** | AuthAdapter extension   | novo método `loginWithMagicLink`                                             | Simétrico a `loginWithOAuth` (#8.5 D8.5.6). Sem `profile`. User criado com `name: email.split('@')[0]`, `image: null`, `emailVerified: now()`                                          |
| **D8.6.7** | Tenant consistency      | validar no `verifyToken` que `MagicLinkToken.tenantId === resolved.tenantId` | Defesa: link aberto em subdomain diferente do origem rejeita com `magic_tenant_mismatch`                                                                                               |
| **D8.6.8** | DI graceful degradation | providers só registrados se `RESEND_API_KEY` presente                        | `EMAIL_ADAPTER_TOKEN` retorna null se key ausente; `MAGIC_LINK_PROVIDER_TOKEN` cascata; controller responde 200 silencioso (POST) ou redirect `magic_email_provider_unavailable` (GET) |

### Erros (mesma família OAuth)

| Code                               | Quando                                 |
| ---------------------------------- | -------------------------------------- |
| `magic_token_invalid`              | tokenHash não encontrado               |
| `magic_token_expired`              | `expiresAt < now()`                    |
| `magic_token_used`                 | `usedAt !== null` (replay tentado)     |
| `magic_request_throttled`          | rate limit excedido (429 do throttler) |
| `magic_tenant_mismatch`            | link aberto em outro subdomain         |
| `magic_email_provider_unavailable` | `RESEND_API_KEY` ausente em runtime    |
| `magic_callback_failed`            | catch-all (logado server-side)         |

Mensagens UI mapeadas em `templates/starter/apps/web/src/lib/magic-link.ts` (`MAGIC_LINK_ERROR_MESSAGES`).

### Env vars

```bash
# Magic Link / Passwordless (#8.6) — todas opcionais. Provider só ativa se RESEND_API_KEY presente.
RESEND_API_KEY=re_xxxxx                  # Obtenha em https://resend.com/api-keys
EMAIL_FROM=noreply@yourdomain.com        # OBRIGATÓRIO se RESEND_API_KEY presente (superRefine)
MAGIC_LINK_TTL_MINUTES=15                # Token expira após esse tempo (default 15)
MAGIC_LINK_RATE_LIMIT_PER_HOUR=5         # Throttle por IP/email (default 5)
```

### Provisionamento (dev)

1. **Resend account**: crie em https://resend.com, copie API key (`re_xxx`)
2. **Domain verification**: adicione domínio em `https://resend.com/domains` — configure DNS (SPF + DKIM + Return-Path) conforme instruções do Resend
3. **From address**: use email do domínio verificado (`noreply@seudominio.com`)
4. **Free tier**: 100 emails/dia / 3000/mês — adequado pra dev/MVP. Upgrade pago se volume crescer
5. **Dev sem Resend**: deixe `RESEND_API_KEY` vazio — provider auto-desabilita, UI esconde botão Magic Link ou mostra `magic_email_provider_unavailable`

### Rotas (starter API)

| Método | Rota                       | Notas                                                                                                           |
| ------ | -------------------------- | --------------------------------------------------------------------------------------------------------------- |
| POST   | `/auth/magic-link/request` | Body `{ email }`. Sempre 200 + delay 300ms. `@Throttle 5/h`. `@Audit('auth.magic_link.request')`                |
| GET    | `/auth/magic-link/verify`  | Query `?token=...`. 302 `/dashboard` (Set-Cookie) ou `/login?error=magic_*`. `@Audit('auth.magic_link.verify')` |

### Segurança

- **Token entropy**: 32 bytes random (256-bit) via `node:crypto.randomBytes`
- **Hash**: SHA-256 hex no DB (`tokenHash @unique`); plaintext só no email/URL
- **TTL**: 15min (configurable via env)
- **Single-use**: enforced via `updateMany where usedAt: null` (atomic — race condition safe)
- **HTTPS**: obrigatório em prod (token em URL — HTTP exporia em logs/history)
- **Tenant lock**: `MagicLinkToken.tenantId` é fonte da verdade; verify rejeita se subdomain do clique difere
- **Email-failure cleanup**: se `sendTransactional` throws, token row é deletado pra não vazar artefato

### Próximos passos (post-#8.6)

- **#8.7** — MFA / TOTP
- **Pós-v1** — SMS-based OTP (sob demanda — Brasil tem SMS pricing alto), custom email templates (package separado), email-based rate-limit tracker se IP-only revelar abuse

---

## Checklist de implementação

Pra considerar auth completo na Forge:

- [x] Schema Prisma com User, Tenant, TenantMember, RefreshToken, Session, OAuthAccount
- [x] Endpoints: register, login, logout, refresh, me
- [ ] Endpoints: forgot-password, reset-password
- [ ] Endpoints: invite-member, accept-invite
- [x] JWT com tenantId no payload (EdDSA + kid rotation D13)
- [x] argon2id pra senhas (NÃO bcrypt — D1)
- [ ] Rate limiting no login (5/15min) — lockout exponencial D14.6 implementado
- [x] httpOnly cookies pra refresh
- [x] Prisma extension de multi-tenancy (AsyncLocalStorage)
- [x] Interceptor de tenant no NestJS
- [x] Guards: JwtAuthGuard, RolesGuard
- [x] Decoradores: @CurrentUser, @CurrentTenant, @Roles, @Audit
- [ ] Hooks React: useAuth, useLogin, useLogout
- [x] Componentes: LoginForm, RegisterForm, OAuthButtons
- [ ] Componentes: TenantSwitcher
- [ ] Middleware Next.js de proteção
- [x] Páginas: /login, /register, /auth/{google,microsoft}/callback
- [ ] Páginas: /forgot-password, /reset-password
- [x] Audit log de eventos de auth (síncrono D7 — async pós-#15)
- [x] Testes E2E do fluxo completo (auth + oauth)
- [x] OAuth: Google + Microsoft (Auth Code + PKCE S256 + state JWS cookie) — #8.5
- [x] Magic Link passwordless (Resend + SHA-256 token + anti-enum + tenant lock) — #8.6

Tudo isso vem pronto no `templates/starter`. Projeto novo nasce com auth funcionando 100%.
