/**
 * native-adapter.magic-link.test.ts — W1.B / D8.6.6
 *
 * Cobre o fluxo `loginWithMagicLink` do NativeAuthAdapter:
 *
 *   1. Cria user novo quando email não existe (`password=null`,
 *      `emailVerified=now()`, `name=local-part`, `image=null`) + tenant ausente
 *      → cria tenant novo (owner) → `isNewUser=true`.
 *   2. Reusa User existente com `emailVerified !== null` → `isNewUser=false`,
 *      NÃO cria OAuthAccount (Magic Link não tem provider).
 *   3. Auto-verifica User existente quando `emailVerified === null` (caller
 *      provou posse do inbox).
 *   4. Lança `MARKETPLACE_REQUIRED` quando user tem >1 memberships e nenhum
 *      `tenantSlug` é fornecido.
 *
 * Mocks: mesma estratégia do `native-adapter.oauth.test.ts` — in-memory Prisma
 * stub + mocks de hash/jwt/oauth-crypto.
 */

import type { JwtKeyset } from '../jwks';
import { NativeAuthAdapter } from '../native-adapter';

// ---------------------------------------------------------------------------
// Mocks (mesma config do native-adapter.oauth.test)
// ---------------------------------------------------------------------------

jest.mock('../oauth/oauth-crypto', () => ({
  encryptToken: (plaintext: string, _key: Buffer) => `enc:${plaintext}`,
  decryptToken: (ciphertext: string, _key: Buffer) => ciphertext.replace(/^enc:/, ''),
  parseEncryptionKey: (raw: string) => Buffer.from(raw.padEnd(32, '0').slice(0, 32)),
}));

jest.mock('../jwt', () => {
  const actual = jest.requireActual('../jwt');
  return {
    ...actual,
    signAccessToken: jest.fn(async (_keyset: unknown, payload: unknown) => ({
      token: `fake.access.${Buffer.from(JSON.stringify(payload)).toString('base64url')}`,
    })),
    verifyAccessToken: jest.fn(async (_keyset: unknown, token: string) => {
      const part = token.split('.')[2];
      const payload = JSON.parse(Buffer.from(part!, 'base64url').toString('utf8')) as {
        sub: string;
        tid: string;
        roles: string[];
      };
      return {
        userId: payload.sub,
        tenantId: payload.tid,
        roles: payload.roles,
        issuedAt: Math.floor(Date.now() / 1000),
        expiresAt: Math.floor(Date.now() / 1000) + 900,
      };
    }),
    generateRefreshToken: () => 'fake-secret-base64url',
    ACCESS_TOKEN_TTL_MS: 15 * 60 * 1000,
    REFRESH_TOKEN_TTL_MS: 30 * 24 * 60 * 60 * 1000,
  };
});

jest.mock('../hash', () => ({
  hashPassword: async (p: string) => `hashed:${p}`,
  verifyPassword: async (p: string, h: string) => h === `hashed:${p}`,
  hashToken: async (t: string) => `hash:${t}`,
  verifyTokenHash: async (t: string, h: string) => h === `hash:${t}`,
}));

// ---------------------------------------------------------------------------
// In-memory Prisma stub
// ---------------------------------------------------------------------------

interface UserRow {
  id: string;
  email: string;
  password: string | null;
  name: string | null;
  image: string | null;
  emailVerified: Date | null;
  failedLoginAttempts: number;
  lockedUntil: Date | null;
}

interface TenantRow {
  id: string;
  slug: string;
  name: string;
}

interface MemberRow {
  id: string;
  tenantId: string;
  userId: string;
  role: 'owner' | 'admin' | 'manager' | 'member' | 'viewer';
}

interface RefreshTokenRow {
  id: string;
  tokenHash: string;
  userId: string;
  tenantId: string;
  family: string;
  expiresAt: Date;
  revokedAt: Date | null;
  rotatedAt: Date | null;
  userAgent: string | null;
  ip: string | null;
}

function createPrismaStub() {
  const users: UserRow[] = [];
  const tenants: TenantRow[] = [];
  const members: MemberRow[] = [];
  const refreshTokens: RefreshTokenRow[] = [];
  let userN = 0;
  let tenantN = 0;
  let memberN = 0;
  let rtN = 0;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const stub: any = {
    user: {
      findUnique: jest.fn(async ({ where }: { where: { id?: string; email?: string } }) => {
        return (
          users.find(
            (u) => (where.id && u.id === where.id) || (where.email && u.email === where.email),
          ) ?? null
        );
      }),
      create: jest.fn(async ({ data }: { data: Partial<UserRow> }) => {
        const id = `user_${++userN}`;
        const row: UserRow = {
          id,
          email: data.email!,
          password: data.password ?? null,
          name: data.name ?? null,
          image: data.image ?? null,
          emailVerified: data.emailVerified ?? null,
          failedLoginAttempts: 0,
          lockedUntil: null,
        };
        users.push(row);
        return row;
      }),
      update: jest.fn(
        async ({ where, data }: { where: { id: string }; data: Partial<UserRow> }) => {
          const row = users.find((u) => u.id === where.id);
          if (!row) throw new Error('not found');
          Object.assign(row, data);
          return row;
        },
      ),
    },
    tenant: {
      findUnique: jest.fn(async ({ where }: { where: { slug?: string; id?: string } }) => {
        return (
          tenants.find(
            (t) => (where.slug && t.slug === where.slug) || (where.id && t.id === where.id),
          ) ?? null
        );
      }),
      create: jest.fn(async ({ data }: { data: { slug: string; name: string } }) => {
        const id = `tenant_${++tenantN}`;
        const row: TenantRow = { id, slug: data.slug, name: data.name };
        tenants.push(row);
        return row;
      }),
    },
    tenantMember: {
      findUnique: jest.fn(
        async ({ where }: { where: { tenantId_userId: { tenantId: string; userId: string } } }) => {
          return (
            members.find(
              (m) =>
                m.tenantId === where.tenantId_userId.tenantId &&
                m.userId === where.tenantId_userId.userId,
            ) ?? null
          );
        },
      ),
      findMany: jest.fn(
        async ({
          where,
          include,
        }: {
          where: { userId: string };
          include?: { tenant: boolean };
        }) => {
          const list = members.filter((m) => m.userId === where.userId);
          if (include?.tenant) {
            return list.map((m) => ({
              ...m,
              tenant: tenants.find((t) => t.id === m.tenantId)!,
            }));
          }
          return list;
        },
      ),
      create: jest.fn(
        async ({
          data,
        }: {
          data: { tenantId: string; userId: string; role: MemberRow['role'] };
        }) => {
          const id = `member_${++memberN}`;
          const row: MemberRow = { id, ...data };
          members.push(row);
          return row;
        },
      ),
    },
    refreshToken: {
      create: jest.fn(async ({ data }: { data: Partial<RefreshTokenRow> }) => {
        const id = `rt_${++rtN}`;
        const row: RefreshTokenRow = {
          id,
          tokenHash: data.tokenHash!,
          userId: data.userId!,
          tenantId: data.tenantId!,
          family: data.family!,
          expiresAt: data.expiresAt!,
          revokedAt: null,
          rotatedAt: null,
          userAgent: data.userAgent ?? null,
          ip: data.ip ?? null,
        };
        refreshTokens.push(row);
        return row;
      }),
    },
    $transaction: jest.fn(async (fn: (tx: unknown) => unknown): Promise<unknown> => fn(stub)),
  };

  return { prisma: stub, _state: { users, tenants, members, refreshTokens } };
}

const FAKE_KEYSET = { active: { kid: 'k1', privateKey: {} } } as unknown as JwtKeyset;

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('NativeAuthAdapter.loginWithMagicLink (D8.6.6)', () => {
  it('cria User novo + tenant novo quando email não existe e tenantSlug ausente', async () => {
    const { prisma, _state } = createPrismaStub();
    const adapter = new NativeAuthAdapter(prisma as never, FAKE_KEYSET);

    const result = await adapter.loginWithMagicLink({
      email: 'alice@acme.com',
    });

    expect(result.isNewUser).toBe(true);
    expect(_state.users).toHaveLength(1);
    const user = _state.users[0]!;
    expect(user.password).toBeNull();
    expect(user.name).toBe('alice'); // local-part
    expect(user.image).toBeNull();
    expect(user.emailVerified).toBeInstanceOf(Date);

    // Tenant novo derivado do domain
    expect(_state.tenants).toHaveLength(1);
    expect(_state.tenants[0]!.slug).toBe('acme');
    expect(_state.members).toHaveLength(1);
    expect(_state.members[0]!.role).toBe('owner');

    expect(result.session.userId).toBe(user.id);
    expect(result.session.tenantId).toBe(_state.tenants[0]!.id);
  });

  it('reusa User existente verificado (sem criar OAuthAccount)', async () => {
    const { prisma, _state } = createPrismaStub();
    const adapter = new NativeAuthAdapter(prisma as never, FAKE_KEYSET);

    _state.users.push({
      id: 'user_pre',
      email: 'alice@acme.com',
      password: 'hashed:something',
      name: 'Alice',
      image: 'https://avatar/alice.png',
      emailVerified: new Date('2026-01-01'),
      failedLoginAttempts: 0,
      lockedUntil: null,
    });
    _state.tenants.push({ id: 'tenant_pre', slug: 'acme', name: 'Acme' });
    _state.members.push({
      id: 'member_pre',
      tenantId: 'tenant_pre',
      userId: 'user_pre',
      role: 'member',
    });

    const result = await adapter.loginWithMagicLink({
      email: 'alice@acme.com',
      tenantSlug: 'acme',
    });

    expect(result.isNewUser).toBe(false);
    expect(_state.users).toHaveLength(1); // não criou outro
    // image preservado, NÃO mexido por magic link
    expect(_state.users[0]!.image).toBe('https://avatar/alice.png');
    expect(result.session.userId).toBe('user_pre');
    expect(result.session.tenantId).toBe('tenant_pre');
  });

  it('auto-verifica User existente quando emailVerified=null (magic link prova posse do inbox)', async () => {
    const { prisma, _state } = createPrismaStub();
    const adapter = new NativeAuthAdapter(prisma as never, FAKE_KEYSET);

    _state.users.push({
      id: 'user_unverified',
      email: 'alice@acme.com',
      password: null,
      name: null,
      image: null,
      emailVerified: null, // unverified
      failedLoginAttempts: 0,
      lockedUntil: null,
    });
    _state.tenants.push({ id: 'tenant_pre', slug: 'acme', name: 'Acme' });
    _state.members.push({
      id: 'member_pre',
      tenantId: 'tenant_pre',
      userId: 'user_unverified',
      role: 'member',
    });

    const result = await adapter.loginWithMagicLink({
      email: 'alice@acme.com',
      tenantSlug: 'acme',
    });

    expect(result.isNewUser).toBe(false);
    expect(_state.users[0]!.emailVerified).toBeInstanceOf(Date); // ← auto-verificado
  });

  it('lança MARKETPLACE_REQUIRED quando user tem >1 memberships e tenantSlug ausente', async () => {
    const { prisma, _state } = createPrismaStub();
    const adapter = new NativeAuthAdapter(prisma as never, FAKE_KEYSET);

    _state.users.push({
      id: 'user_multi',
      email: 'alice@acme.com',
      password: null,
      name: null,
      image: null,
      emailVerified: new Date(),
      failedLoginAttempts: 0,
      lockedUntil: null,
    });
    _state.tenants.push(
      { id: 't1', slug: 'acme', name: 'Acme' },
      { id: 't2', slug: 'globex', name: 'Globex' },
    );
    _state.members.push(
      { id: 'm1', tenantId: 't1', userId: 'user_multi', role: 'member' },
      { id: 'm2', tenantId: 't2', userId: 'user_multi', role: 'admin' },
    );

    await expect(adapter.loginWithMagicLink({ email: 'alice@acme.com' })).rejects.toMatchObject({
      code: 'MARKETPLACE_REQUIRED',
    });
  });
});
