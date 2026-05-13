/**
 * native-adapter.oauth.spec.ts — W1.B / D8.5.6
 *
 * Cobre o fluxo `loginWithOAuth` do NativeAuthAdapter:
 *
 *   1. Cria user novo quando email não existe + nenhum tenant slug → cria tenant
 *      novo (owner) e retorna `isNewUser=true`.
 *   2. Linka conta OAuth a user existente quando `emailVerified !== null` →
 *      `isNewUser=false`, OAuthAccount criado, image atualizada se vazia.
 *   3. Rejeita link com `EMAIL_NOT_VERIFIED` quando user local tem
 *      `emailVerified=null` (anti-takeover).
 *   4. Lança `MARKETPLACE_REQUIRED` quando user tem >1 memberships e nenhum
 *      `tenantSlug` é fornecido.
 *   5. Lança `TENANT_NOT_FOUND` quando `tenantSlug` é fornecido mas tenant não existe.
 *
 * Mock Prisma: in-memory que respeita semântica relevante (findUnique composite
 * keys, $transaction como pass-through).
 *
 * Os imports de `./oauth/oauth-crypto` (encryptToken) são mockados pra retornar
 * o plaintext prefixado — evita dependência do impl de W1.A.
 */

import type { JwtKeyset } from '../jwks';
import { NativeAuthAdapter } from '../native-adapter';
import type { OAuthProfile, OAuthTokens } from '../oauth';

// ---------------------------------------------------------------------------
// Mocks
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

interface OAuthAccountRow {
  id: string;
  userId: string;
  provider: string;
  providerAccountId: string;
  accessToken: string | null;
  refreshToken: string | null;
  idToken: string | null;
  expiresAt: Date | null;
  scope: string | null;
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
  const oauthAccounts: OAuthAccountRow[] = [];
  const refreshTokens: RefreshTokenRow[] = [];
  let userN = 0;
  let tenantN = 0;
  let memberN = 0;
  let oaN = 0;
  let rtN = 0;

  // reason: stub é auto-referenciado em $transaction → tipagem explícita pra evitar
  // circular implicit `any` (TS7022). Pragmaticamente `any` aqui é OK — é mock de
  // teste, não código de produção.
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
    oAuthAccount: {
      findUnique: jest.fn(
        async ({
          where,
        }: {
          where: { provider_providerAccountId: { provider: string; providerAccountId: string } };
        }) => {
          return (
            oauthAccounts.find(
              (a) =>
                a.provider === where.provider_providerAccountId.provider &&
                a.providerAccountId === where.provider_providerAccountId.providerAccountId,
            ) ?? null
          );
        },
      ),
      create: jest.fn(async ({ data }: { data: Partial<OAuthAccountRow> }) => {
        const id = `oa_${++oaN}`;
        const row: OAuthAccountRow = {
          id,
          userId: data.userId!,
          provider: data.provider!,
          providerAccountId: data.providerAccountId!,
          accessToken: data.accessToken ?? null,
          refreshToken: data.refreshToken ?? null,
          idToken: data.idToken ?? null,
          expiresAt: data.expiresAt ?? null,
          scope: data.scope ?? null,
        };
        oauthAccounts.push(row);
        return row;
      }),
      update: jest.fn(
        async ({ where, data }: { where: { id: string }; data: Partial<OAuthAccountRow> }) => {
          const row = oauthAccounts.find((a) => a.id === where.id);
          if (!row) throw new Error('not found');
          Object.assign(row, data);
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

  return { prisma: stub, _state: { users, tenants, members, oauthAccounts, refreshTokens } };
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const FAKE_KEYSET = { active: { kid: 'k1', privateKey: {} } } as unknown as JwtKeyset;
const ENC_KEY = Buffer.alloc(32, 0);

function makeProfile(overrides: Partial<OAuthProfile> = {}): OAuthProfile {
  return {
    providerAccountId: 'google-1234',
    email: 'alice@acme.com',
    emailVerified: true,
    name: 'Alice',
    picture: 'https://avatar/alice.png',
    ...overrides,
  };
}

function makeProviderTokens(): OAuthTokens {
  return {
    accessToken: 'g-access-xyz',
    refreshToken: 'g-refresh-abc',
    idToken: 'g-id-jwt',
    expiresAt: new Date(Date.now() + 3600 * 1000),
    scope: 'openid email profile',
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('NativeAuthAdapter.loginWithOAuth (D8.5.6)', () => {
  it('cria user novo + tenant novo quando email e tenantSlug ausentes', async () => {
    const { prisma, _state } = createPrismaStub();
    const adapter = new NativeAuthAdapter(prisma as never, FAKE_KEYSET);

    const result = await adapter.loginWithOAuth({
      provider: 'google',
      profile: makeProfile(),
      tokens: makeProviderTokens(),
      encryptionKey: ENC_KEY,
    });

    expect(result.isNewUser).toBe(true);
    expect(_state.users).toHaveLength(1);
    expect(_state.users[0]!.password).toBeNull();
    expect(_state.users[0]!.emailVerified).toBeInstanceOf(Date);
    expect(_state.tenants).toHaveLength(1);
    // email corporativo "acme.com" → slug "acme"
    expect(_state.tenants[0]!.slug).toBe('acme');
    expect(_state.members).toHaveLength(1);
    expect(_state.members[0]!.role).toBe('owner');
    expect(_state.oauthAccounts).toHaveLength(1);
    // Tokens devem estar encriptados (prefix mocked encryptToken)
    expect(_state.oauthAccounts[0]!.accessToken).toBe('enc:g-access-xyz');
    expect(_state.oauthAccounts[0]!.refreshToken).toBe('enc:g-refresh-abc');
    expect(_state.oauthAccounts[0]!.idToken).toBe('enc:g-id-jwt');
    expect(result.session.userId).toBe(_state.users[0]!.id);
    expect(result.session.tenantId).toBe(_state.tenants[0]!.id);
  });

  it('linka OAuthAccount a user existente quando emailVerified !== null', async () => {
    const { prisma, _state } = createPrismaStub();
    const adapter = new NativeAuthAdapter(prisma as never, FAKE_KEYSET);

    // Pre-popula: user existe com emailVerified=Date, sem image
    _state.users.push({
      id: 'user_pre',
      email: 'alice@acme.com',
      password: 'hashed:something',
      name: 'Alice',
      image: null,
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

    const result = await adapter.loginWithOAuth({
      provider: 'google',
      profile: makeProfile({ picture: 'https://new/avatar.png' }),
      tokens: makeProviderTokens(),
      encryptionKey: ENC_KEY,
    });

    expect(result.isNewUser).toBe(false);
    expect(_state.users).toHaveLength(1); // não criou novo
    expect(_state.users[0]!.image).toBe('https://new/avatar.png'); // atualizou image vazia
    expect(_state.oauthAccounts).toHaveLength(1);
    expect(_state.oauthAccounts[0]!.userId).toBe('user_pre');
    expect(result.session.userId).toBe('user_pre');
    expect(result.session.tenantId).toBe('tenant_pre');
  });

  it('lança EMAIL_NOT_VERIFIED se user local tem emailVerified=null', async () => {
    const { prisma, _state } = createPrismaStub();
    const adapter = new NativeAuthAdapter(prisma as never, FAKE_KEYSET);

    _state.users.push({
      id: 'user_unverified',
      email: 'alice@acme.com',
      password: 'hashed:x',
      name: null,
      image: null,
      emailVerified: null, // <-- não verificado
      failedLoginAttempts: 0,
      lockedUntil: null,
    });

    await expect(
      adapter.loginWithOAuth({
        provider: 'google',
        profile: makeProfile(),
        tokens: makeProviderTokens(),
        encryptionKey: ENC_KEY,
      }),
    ).rejects.toMatchObject({ code: 'EMAIL_NOT_VERIFIED' });

    expect(_state.oauthAccounts).toHaveLength(0); // não vincula
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
    // Pré-existente OAuth account pra cair no branch "existing account"
    _state.oauthAccounts.push({
      id: 'oa_pre',
      userId: 'user_multi',
      provider: 'google',
      providerAccountId: 'google-1234',
      accessToken: null,
      refreshToken: null,
      idToken: null,
      expiresAt: null,
      scope: null,
    });

    await expect(
      adapter.loginWithOAuth({
        provider: 'google',
        profile: makeProfile(),
        tokens: makeProviderTokens(),
        encryptionKey: ENC_KEY,
      }),
    ).rejects.toMatchObject({ code: 'MARKETPLACE_REQUIRED' });
  });

  it('lança TENANT_NOT_FOUND quando tenantSlug é fornecido mas tenant não existe', async () => {
    const { prisma } = createPrismaStub();
    const adapter = new NativeAuthAdapter(prisma as never, FAKE_KEYSET);

    await expect(
      adapter.loginWithOAuth({
        provider: 'google',
        profile: makeProfile(),
        tokens: makeProviderTokens(),
        tenantSlug: 'nonexistent',
        encryptionKey: ENC_KEY,
      }),
    ).rejects.toMatchObject({ code: 'TENANT_NOT_FOUND' });
  });
});
