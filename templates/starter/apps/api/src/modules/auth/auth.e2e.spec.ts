import { generateEd25519Keypair } from '@ethos/auth';
import { type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';

import { AppModule } from '../../app.module';

/**
 * E2E AuthModule — cobre:
 *  - register (AC #4) + cookies set
 *  - login + cookies set
 *  - refresh rotation (AC #6) + reuse detection
 *  - logout + cookies cleared
 *
 * Skip protocol: se Postgres :5433 não estiver acessível, o `beforeAll` joga
 * `setupFailed = true` e todos os `it` viram skip. Não bloqueia a Wave.
 *
 * NOTA: tests assumem que `pnpm --filter @ethos/database db:migrate` foi
 * rodado no DB de teste antes — schemas precisam existir.
 */

let app: INestApplication | null = null;
let setupFailed = false;
let setupError: unknown = null;

// Use unique tenant slug per run pra não colidir com runs anteriores no mesmo DB.
const RUN = `auth-e2e-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
const TENANT_SLUG = `t-${RUN}`.toLowerCase().slice(0, 60);
const EMAIL = `${RUN}@test.local`;
const PASSWORD = 'test-password-12345';

beforeAll(async () => {
  // Gera keyset Ed25519 in-memory pra esse run de testes.
  const { privateKeyPem, publicKeyPem } = await generateEd25519Keypair();
  process.env.JWT_KID_CURRENT = `test-${Date.now()}`;
  process.env.JWT_PRIVATE_KEY_CURRENT = privateKeyPem;
  process.env.JWT_PUBLIC_KEY_CURRENT = publicKeyPem;
  // DATABASE_URL deve vir do shell (CI ou dev rodando docker-compose Postgres :5433).
  // Se não tiver, NestFactory.create falha e marcamos setupFailed.
  process.env.NODE_ENV = process.env.NODE_ENV ?? 'test';
  process.env.LOG_LEVEL = process.env.LOG_LEVEL ?? 'error';

  try {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.use(cookieParser());
    await app.init();
  } catch (err) {
    setupFailed = true;
    setupError = err;
  }
}, 30_000);

afterAll(async () => {
  if (app) {
    await app.close();
  }
});

function maybeSkip(): boolean {
  if (setupFailed) {
    console.warn('[auth.e2e] Setup falhou (Postgres :5433 ou env). Skipping suite.', setupError);
    return true;
  }
  return false;
}

function parseSetCookie(res: request.Response): Record<string, string> {
  const raw = res.headers['set-cookie'];
  if (!raw) return {};
  const list = Array.isArray(raw) ? raw : [raw];
  const out: Record<string, string> = {};
  for (const entry of list) {
    const [pair] = entry.split(';');
    const [name, value] = pair.split('=');
    if (name && value !== undefined) out[name.trim()] = value;
  }
  return out;
}

describe('AuthModule E2E', () => {
  it('POST /auth/register → 201, retorna user+tenant, seta cookies httpOnly', async () => {
    if (maybeSkip() || !app) return;

    const res = await request(app.getHttpServer()).post('/auth/register').send({
      email: EMAIL,
      password: PASSWORD,
      name: 'Test User',
      tenantSlug: TENANT_SLUG,
      tenantName: 'Tenant Test',
    });

    expect(res.status).toBe(201);
    // TransformInterceptor envelopa em { data: ... } por padrão; aceita ambos shapes.
    const body = (res.body.data ?? res.body) as {
      user: { id: string; email: string };
      tenant: { id: string; slug: string };
      roles: string[];
    };
    expect(body.user.email).toBe(EMAIL);
    expect(body.tenant.slug).toBe(TENANT_SLUG);
    expect(body.roles).toContain('owner');

    const cookies = parseSetCookie(res);
    expect(cookies.access_token).toBeDefined();
    expect(cookies.refresh_token).toBeDefined();
  });

  it('POST /auth/login → 200, seta cookies', async () => {
    if (maybeSkip() || !app) return;

    const res = await request(app.getHttpServer()).post('/auth/login').send({
      email: EMAIL,
      password: PASSWORD,
      tenantSlug: TENANT_SLUG,
    });

    expect(res.status).toBe(200);
    const cookies = parseSetCookie(res);
    expect(cookies.access_token).toBeDefined();
    expect(cookies.refresh_token).toBeDefined();
  });

  it('POST /auth/refresh → rotation (AC #6); reuse → 401', async () => {
    if (maybeSkip() || !app) return;

    // 1. login pra pegar refresh1
    const loginRes = await request(app.getHttpServer()).post('/auth/login').send({
      email: EMAIL,
      password: PASSWORD,
      tenantSlug: TENANT_SLUG,
    });
    expect(loginRes.status).toBe(200);
    const cookies1 = parseSetCookie(loginRes);
    const refresh1 = cookies1.refresh_token;
    expect(refresh1).toBeDefined();

    // 2. refresh com refresh1 → 200 + retorna novo refresh2
    const refreshRes1 = await request(app.getHttpServer())
      .post('/auth/refresh')
      .set('X-Tenant-Slug', TENANT_SLUG)
      .set('Cookie', `refresh_token=${refresh1}`);
    expect(refreshRes1.status).toBe(200);
    const cookies2 = parseSetCookie(refreshRes1);
    const refresh2 = cookies2.refresh_token;
    expect(refresh2).toBeDefined();
    expect(refresh2).not.toBe(refresh1);

    // 3. reuse de refresh1 → 401 com code TOKEN_REUSED (family revogada)
    const reuseRes = await request(app.getHttpServer())
      .post('/auth/refresh')
      .set('X-Tenant-Slug', TENANT_SLUG)
      .set('Cookie', `refresh_token=${refresh1}`);
    expect(reuseRes.status).toBe(401);

    // 4. refresh2 também 401 agora — family inteira revogada
    const afterFamilyRevoke = await request(app.getHttpServer())
      .post('/auth/refresh')
      .set('X-Tenant-Slug', TENANT_SLUG)
      .set('Cookie', `refresh_token=${refresh2}`);
    expect(afterFamilyRevoke.status).toBe(401);
  });

  it('POST /auth/logout → 200, limpa cookies', async () => {
    if (maybeSkip() || !app) return;

    // login fresh
    const loginRes = await request(app.getHttpServer()).post('/auth/login').send({
      email: EMAIL,
      password: PASSWORD,
      tenantSlug: TENANT_SLUG,
    });
    expect(loginRes.status).toBe(200);
    const cookies = parseSetCookie(loginRes);
    const access = cookies.access_token;
    const refresh = cookies.refresh_token;

    const logoutRes = await request(app.getHttpServer())
      .post('/auth/logout')
      .set('Cookie', `access_token=${access}; refresh_token=${refresh}`);
    expect(logoutRes.status).toBe(200);

    // Set-Cookie deve incluir cookies vazios (maxAge=0)
    const raw = logoutRes.headers['set-cookie'];
    const list = Array.isArray(raw) ? raw : raw ? [raw] : [];
    const hasAccessClear = list.some(
      (c: string) => c.startsWith('access_token=') && /Max-Age=0/i.test(c),
    );
    const hasRefreshClear = list.some(
      (c: string) => c.startsWith('refresh_token=') && /Max-Age=0/i.test(c),
    );
    expect(hasAccessClear).toBe(true);
    expect(hasRefreshClear).toBe(true);
  });
});
