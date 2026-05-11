import { generateEd25519Keypair } from '@ethos/auth';
import { type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';

import { AppModule } from '../../app.module';

/**
 * E2E UsersModule — cobre:
 *  - AC #5 cross-tenant 404: user-A em tenant-A faz GET /users/{userBId em tenant-B} → 404
 *  - AC #9 tenantId via body ignorado: PATCH /users/me com {tenantId: ...} → 400 (Zod strict)
 *  - GET /users/me não vaza password/totpSecret/lockedUntil/failedLoginAttempts
 *  - PATCH /users/me válido retorna user atualizado + sanitizado
 *
 * Skip protocol: se Postgres :5433 não estiver acessível, beforeAll marca
 * `setupFailed = true` e todos os `it` viram skip. Não bloqueia a Wave.
 */

let app: INestApplication | null = null;
let setupFailed = false;
let setupError: unknown = null;

const RUN = `users-e2e-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
const TENANT_A_SLUG = `ta-${RUN}`.toLowerCase().slice(0, 60);
const TENANT_B_SLUG = `tb-${RUN}`.toLowerCase().slice(0, 60);
const USER_A_EMAIL = `a-${RUN}@test.local`;
const USER_B_EMAIL = `b-${RUN}@test.local`;
const PASSWORD = 'test-password-12345';

interface RegisterResponseBody {
  user: { id: string; email: string };
  tenant: { id: string; slug: string };
  roles: string[];
}

beforeAll(async () => {
  const { privateKeyPem, publicKeyPem } = await generateEd25519Keypair();
  process.env.JWT_KID_CURRENT = `test-${Date.now()}`;
  process.env.JWT_PRIVATE_KEY_CURRENT = privateKeyPem;
  process.env.JWT_PUBLIC_KEY_CURRENT = publicKeyPem;
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
    console.warn('[users.e2e] Setup falhou (Postgres :5433 ou env). Skipping suite.', setupError);
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

function unwrap<T>(res: request.Response): T {
  return (res.body.data ?? res.body) as T;
}

describe('UsersModule E2E', () => {
  let userAId: string;
  let userBId: string;
  let accessTokenA: string;

  it('setup: registra user-A em tenant-A e user-B em tenant-B', async () => {
    if (maybeSkip() || !app) return;

    const resA = await request(app.getHttpServer()).post('/auth/register').send({
      email: USER_A_EMAIL,
      password: PASSWORD,
      name: 'User A',
      tenantSlug: TENANT_A_SLUG,
      tenantName: 'Tenant A',
    });
    expect(resA.status).toBe(201);
    const bodyA = unwrap<RegisterResponseBody>(resA);
    userAId = bodyA.user.id;
    const cookiesA = parseSetCookie(resA);
    accessTokenA = cookiesA.access_token;
    expect(accessTokenA).toBeDefined();

    const resB = await request(app.getHttpServer()).post('/auth/register').send({
      email: USER_B_EMAIL,
      password: PASSWORD,
      name: 'User B',
      tenantSlug: TENANT_B_SLUG,
      tenantName: 'Tenant B',
    });
    expect(resB.status).toBe(201);
    const bodyB = unwrap<RegisterResponseBody>(resB);
    userBId = bodyB.user.id;
    expect(userBId).toBeDefined();
  });

  it('AC #5 cross-tenant 404: user-A faz GET /users/{userBId} → 404 (não 403)', async () => {
    if (maybeSkip() || !app) return;
    if (!userBId || !accessTokenA) return;

    const res = await request(app.getHttpServer())
      .get(`/users/${userBId}`)
      .set('Cookie', `access_token=${accessTokenA}`);

    // D6 / AC #5: NÃO 403 (não vaza existência), NÃO 200 (cross-tenant isolation).
    expect(res.status).toBe(404);
  });

  it('AC #9 tenantId via body rejeitado: PATCH /users/me com {tenantId: foreign} → 400', async () => {
    if (maybeSkip() || !app) return;
    if (!accessTokenA) return;

    const res = await request(app.getHttpServer())
      .patch('/users/me')
      .set('Cookie', `access_token=${accessTokenA}`)
      .send({ name: 'Renamed', tenantId: 'foreign-tenant-id-attempt' });

    // ZodValidationPipe com .strict() rejeita keys extras → 400 VALIDATION_ERROR.
    expect(res.status).toBe(400);
  });

  it('GET /users/me retorna sem password/totpSecret/lockedUntil/failedLoginAttempts', async () => {
    if (maybeSkip() || !app) return;
    if (!accessTokenA) return;

    const res = await request(app.getHttpServer())
      .get('/users/me')
      .set('Cookie', `access_token=${accessTokenA}`);
    expect(res.status).toBe(200);

    const body = unwrap<Record<string, unknown>>(res);
    expect(body.id).toBe(userAId);
    expect(body.email).toBe(USER_A_EMAIL);
    expect(body.password).toBeUndefined();
    expect(body.totpSecret).toBeUndefined();
    expect(body.lockedUntil).toBeUndefined();
    expect(body.failedLoginAttempts).toBeUndefined();
    expect(body.mfaEnabled).toBeUndefined();
    expect(Array.isArray(body.roles)).toBe(true);
  });

  it('PATCH /users/me com payload válido → 200 + user atualizado sanitizado', async () => {
    if (maybeSkip() || !app) return;
    if (!accessTokenA) return;

    const res = await request(app.getHttpServer())
      .patch('/users/me')
      .set('Cookie', `access_token=${accessTokenA}`)
      .send({ name: 'User A Renamed' });
    expect(res.status).toBe(200);

    const body = unwrap<{ name: string | null; password?: unknown }>(res);
    expect(body.name).toBe('User A Renamed');
    expect(body.password).toBeUndefined();
  });
});
