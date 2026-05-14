/**
 * native-adapter.mfa.test.ts — W1 / D8.7
 *
 * Cobre os 5 métodos de MFA do NativeAuthAdapter:
 *   1. setupMfa — gera secret + qrCode + persiste MfaSecret(verifiedAt=null)
 *   2. confirmMfaSetup — verifica primeiro TOTP, marca verifiedAt, gera backup codes
 *   3. verifyMfaChallenge — valida TOTP atual
 *   4. consumeBackupCode — single-use + replay detection
 *   5. disableMfa — apaga MfaSecret + MfaBackupCode[]
 *
 * Mocks: in-memory Prisma stub + TotpProvider injetado.
 */

import { randomBytes } from 'node:crypto';

import type { JwtKeyset } from '../jwks';
import { hashBackupCode } from '../mfa/backup-codes';
import { MfaErrorCode } from '../mfa/error-codes';
import type { TotpProvider, TotpSetupResult } from '../mfa/totp.provider';
import { NativeAuthAdapter } from '../native-adapter';

// Argon2 lite pra não estourar timeout do jest
beforeAll(() => {
  process.env.ARGON_MEMORY_COST = '4096';
  process.env.ARGON_TIME_COST = '1';
  process.env.ARGON_PARALLELISM = '1';
  // 32 bytes hex pra MFA_SECRET_ENCRYPTION_KEY
  process.env.MFA_SECRET_ENCRYPTION_KEY = randomBytes(32).toString('hex');
});

// ---------------------------------------------------------------------------
// Mocks (jwt + hash conforme padrão dos outros tests)
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Fake TotpProvider — controlamos secret + verify pra determinismo
// ---------------------------------------------------------------------------

class FakeTotpProvider implements TotpProvider {
  private currentSecret = 'JBSWY3DPEHPK3PXP'; // base32
  validCodes = new Set<string>(['123456']); // por padrão "123456" é válido

  async generateSecret(_opts: { issuer: string; accountName: string }): Promise<TotpSetupResult> {
    return {
      secret: this.currentSecret,
      otpauthUrl: `otpauth://totp/test?secret=${this.currentSecret}`,
      qrCodeDataUrl: 'data:image/png;base64,FAKE_QR',
    };
  }

  verify(opts: { secret: string; code: string }): boolean {
    return opts.secret === this.currentSecret && this.validCodes.has(opts.code);
  }
}

// ---------------------------------------------------------------------------
// In-memory Prisma stub focado em MFA tables
// ---------------------------------------------------------------------------

interface MfaSecretRow {
  id: string;
  userId: string;
  tenantId: string;
  secretEnc: string;
  verifiedAt: Date | null;
  createdAt: Date;
}

interface MfaBackupCodeRow {
  id: string;
  userId: string;
  codeHash: string;
  usedAt: Date | null;
  createdAt: Date;
}

function createPrismaStub() {
  const mfaSecrets: MfaSecretRow[] = [];
  const mfaBackupCodes: MfaBackupCodeRow[] = [];
  let secretN = 0;
  let bcN = 0;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const stub: any = {
    mfaSecret: {
      findUnique: jest.fn(
        async ({
          where,
        }: {
          where: { userId_tenantId?: { userId: string; tenantId: string } };
        }) => {
          if (where.userId_tenantId) {
            const { userId, tenantId } = where.userId_tenantId;
            return mfaSecrets.find((s) => s.userId === userId && s.tenantId === tenantId) ?? null;
          }
          return null;
        },
      ),
      upsert: jest.fn(
        async ({
          where,
          create,
          update,
        }: {
          where: { userId_tenantId: { userId: string; tenantId: string } };
          create: { userId: string; tenantId: string; secretEnc: string };
          update: { secretEnc: string; verifiedAt: Date | null; createdAt: Date };
        }) => {
          const { userId, tenantId } = where.userId_tenantId;
          const existing = mfaSecrets.find((s) => s.userId === userId && s.tenantId === tenantId);
          if (existing) {
            Object.assign(existing, update);
            return existing;
          }
          const row: MfaSecretRow = {
            id: `mfa_${++secretN}`,
            ...create,
            verifiedAt: null,
            createdAt: new Date(),
          };
          mfaSecrets.push(row);
          return row;
        },
      ),
      update: jest.fn(
        async ({
          where,
          data,
        }: {
          where: { userId_tenantId: { userId: string; tenantId: string } };
          data: Partial<MfaSecretRow>;
        }) => {
          const { userId, tenantId } = where.userId_tenantId;
          const row = mfaSecrets.find((s) => s.userId === userId && s.tenantId === tenantId);
          if (!row) throw new Error('not found');
          Object.assign(row, data);
          return row;
        },
      ),
      deleteMany: jest.fn(async ({ where }: { where: { userId: string; tenantId: string } }) => {
        const before = mfaSecrets.length;
        for (let i = mfaSecrets.length - 1; i >= 0; i--) {
          if (
            mfaSecrets[i]!.userId === where.userId &&
            mfaSecrets[i]!.tenantId === where.tenantId
          ) {
            mfaSecrets.splice(i, 1);
          }
        }
        return { count: before - mfaSecrets.length };
      }),
    },
    mfaBackupCode: {
      findMany: jest.fn(
        async ({
          where,
        }: {
          where: { userId: string; usedAt?: null | { not: null }; NOT?: { usedAt: null } };
        }) => {
          let list = mfaBackupCodes.filter((c) => c.userId === where.userId);
          if (where.usedAt === null) {
            list = list.filter((c) => c.usedAt === null);
          } else if (where.NOT?.usedAt === null) {
            list = list.filter((c) => c.usedAt !== null);
          }
          return list;
        },
      ),
      createMany: jest.fn(
        async ({ data }: { data: Array<{ userId: string; codeHash: string }> }) => {
          for (const row of data) {
            mfaBackupCodes.push({
              id: `bc_${++bcN}`,
              userId: row.userId,
              codeHash: row.codeHash,
              usedAt: null,
              createdAt: new Date(),
            });
          }
          return { count: data.length };
        },
      ),
      updateMany: jest.fn(
        async ({
          where,
          data,
        }: {
          where: { id: string; usedAt: null };
          data: { usedAt: Date };
        }) => {
          const row = mfaBackupCodes.find((c) => c.id === where.id && c.usedAt === null);
          if (!row) return { count: 0 };
          row.usedAt = data.usedAt;
          return { count: 1 };
        },
      ),
      deleteMany: jest.fn(async ({ where }: { where: { userId: string } }) => {
        const before = mfaBackupCodes.length;
        for (let i = mfaBackupCodes.length - 1; i >= 0; i--) {
          if (mfaBackupCodes[i]!.userId === where.userId) {
            mfaBackupCodes.splice(i, 1);
          }
        }
        return { count: before - mfaBackupCodes.length };
      }),
    },
    $transaction: jest.fn(async (fn: (tx: unknown) => unknown): Promise<unknown> => fn(stub)),
  };

  return { prisma: stub, _state: { mfaSecrets, mfaBackupCodes } };
}

const FAKE_KEYSET = { active: { kid: 'k1', privateKey: {} } } as unknown as JwtKeyset;
const USER_ID = 'user_1';
const TENANT_ID = 'tenant_1';

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('NativeAuthAdapter.MFA (D8.7)', () => {
  describe('setupMfa', () => {
    it('retorna payload com secret + qrCodeDataUrl + otpauthUrl', async () => {
      const { prisma } = createPrismaStub();
      const totp = new FakeTotpProvider();
      const adapter = new NativeAuthAdapter(prisma as never, FAKE_KEYSET, { totpProvider: totp });

      const out = await adapter.setupMfa({
        userId: USER_ID,
        tenantId: TENANT_ID,
        issuer: 'Ethos',
        accountName: 'alice@acme.com',
      });

      expect(out.secret).toBe('JBSWY3DPEHPK3PXP');
      expect(out.otpauthUrl).toMatch(/^otpauth:\/\//);
      expect(out.qrCodeDataUrl).toMatch(/^data:image\/png;base64,/);
    });

    it('persiste MfaSecret com verifiedAt=null (pending)', async () => {
      const { prisma, _state } = createPrismaStub();
      const adapter = new NativeAuthAdapter(prisma as never, FAKE_KEYSET, {
        totpProvider: new FakeTotpProvider(),
      });

      await adapter.setupMfa({
        userId: USER_ID,
        tenantId: TENANT_ID,
        issuer: 'Ethos',
        accountName: 'alice@acme.com',
      });

      expect(_state.mfaSecrets).toHaveLength(1);
      expect(_state.mfaSecrets[0]!.userId).toBe(USER_ID);
      expect(_state.mfaSecrets[0]!.tenantId).toBe(TENANT_ID);
      expect(_state.mfaSecrets[0]!.verifiedAt).toBeNull();
      // secretEnc é encriptado (não é o plaintext)
      expect(_state.mfaSecrets[0]!.secretEnc).not.toBe('JBSWY3DPEHPK3PXP');
      expect(_state.mfaSecrets[0]!.secretEnc).toMatch(/^v1:/);
    });

    it('lança MFA_ALREADY_ENABLED quando user já tem MfaSecret confirmado', async () => {
      const { prisma, _state } = createPrismaStub();
      _state.mfaSecrets.push({
        id: 'mfa_pre',
        userId: USER_ID,
        tenantId: TENANT_ID,
        secretEnc: 'v1:xx:yy:zz',
        verifiedAt: new Date('2026-01-01'),
        createdAt: new Date('2026-01-01'),
      });
      const adapter = new NativeAuthAdapter(prisma as never, FAKE_KEYSET, {
        totpProvider: new FakeTotpProvider(),
      });

      await expect(
        adapter.setupMfa({
          userId: USER_ID,
          tenantId: TENANT_ID,
          issuer: 'Ethos',
          accountName: 'alice@acme.com',
        }),
      ).rejects.toMatchObject({ code: MfaErrorCode.MFA_ALREADY_ENABLED });
    });
  });

  describe('confirmMfaSetup', () => {
    it('com código válido marca verifiedAt e retorna 10 backup codes plaintext', async () => {
      const { prisma, _state } = createPrismaStub();
      const totp = new FakeTotpProvider();
      const adapter = new NativeAuthAdapter(prisma as never, FAKE_KEYSET, { totpProvider: totp });

      await adapter.setupMfa({
        userId: USER_ID,
        tenantId: TENANT_ID,
        issuer: 'Ethos',
        accountName: 'alice@acme.com',
      });

      const out = await adapter.confirmMfaSetup({
        userId: USER_ID,
        tenantId: TENANT_ID,
        code: '123456',
      });

      expect(out.backupCodes).toHaveLength(10);
      // plaintext — 8 chars Crockford base32 cada
      for (const code of out.backupCodes) {
        expect(code).toHaveLength(8);
        expect(code).toMatch(/^[23456789ABCDEFGHJKMNPQRSTVWXYZ]+$/);
      }
      expect(_state.mfaSecrets[0]!.verifiedAt).toBeInstanceOf(Date);
      expect(_state.mfaBackupCodes).toHaveLength(10);
      // hashes persistidos (não plaintext)
      for (const row of _state.mfaBackupCodes) {
        expect(row.codeHash).toMatch(/^\$argon2id\$/);
      }
    });

    it('com código inválido lança MFA_INVALID e não marca verifiedAt', async () => {
      const { prisma, _state } = createPrismaStub();
      const totp = new FakeTotpProvider();
      // remove '123456' do conjunto válido pra rejeitar
      totp.validCodes.clear();
      const adapter = new NativeAuthAdapter(prisma as never, FAKE_KEYSET, { totpProvider: totp });

      await adapter.setupMfa({
        userId: USER_ID,
        tenantId: TENANT_ID,
        issuer: 'Ethos',
        accountName: 'alice@acme.com',
      });

      await expect(
        adapter.confirmMfaSetup({ userId: USER_ID, tenantId: TENANT_ID, code: '999999' }),
      ).rejects.toMatchObject({ code: MfaErrorCode.MFA_INVALID });
      expect(_state.mfaSecrets[0]!.verifiedAt).toBeNull();
    });

    it('lança MFA_SETUP_NOT_CONFIRMED quando não há MfaSecret pendente', async () => {
      const { prisma } = createPrismaStub();
      const adapter = new NativeAuthAdapter(prisma as never, FAKE_KEYSET, {
        totpProvider: new FakeTotpProvider(),
      });

      await expect(
        adapter.confirmMfaSetup({ userId: USER_ID, tenantId: TENANT_ID, code: '123456' }),
      ).rejects.toMatchObject({ code: MfaErrorCode.MFA_SETUP_NOT_CONFIRMED });
    });
  });

  describe('verifyMfaChallenge', () => {
    it('com TOTP atual retorna ok:true', async () => {
      const { prisma } = createPrismaStub();
      const totp = new FakeTotpProvider();
      const adapter = new NativeAuthAdapter(prisma as never, FAKE_KEYSET, { totpProvider: totp });

      await adapter.setupMfa({
        userId: USER_ID,
        tenantId: TENANT_ID,
        issuer: 'Ethos',
        accountName: 'alice@acme.com',
      });
      await adapter.confirmMfaSetup({ userId: USER_ID, tenantId: TENANT_ID, code: '123456' });

      const out = await adapter.verifyMfaChallenge({
        userId: USER_ID,
        tenantId: TENANT_ID,
        code: '123456',
      });
      expect(out.ok).toBe(true);
    });

    it('com código inválido retorna ok:false reason:invalid', async () => {
      const { prisma } = createPrismaStub();
      const totp = new FakeTotpProvider();
      const adapter = new NativeAuthAdapter(prisma as never, FAKE_KEYSET, { totpProvider: totp });

      await adapter.setupMfa({
        userId: USER_ID,
        tenantId: TENANT_ID,
        issuer: 'Ethos',
        accountName: 'alice@acme.com',
      });
      await adapter.confirmMfaSetup({ userId: USER_ID, tenantId: TENANT_ID, code: '123456' });

      const out = await adapter.verifyMfaChallenge({
        userId: USER_ID,
        tenantId: TENANT_ID,
        code: '999999',
      });
      expect(out).toEqual({ ok: false, reason: 'invalid' });
    });

    it('retorna ok:false reason:not_enabled quando MFA não configurado', async () => {
      const { prisma } = createPrismaStub();
      const adapter = new NativeAuthAdapter(prisma as never, FAKE_KEYSET, {
        totpProvider: new FakeTotpProvider(),
      });

      const out = await adapter.verifyMfaChallenge({
        userId: USER_ID,
        tenantId: TENANT_ID,
        code: '123456',
      });
      expect(out).toEqual({ ok: false, reason: 'not_enabled' });
    });

    it('retorna not_enabled quando MfaSecret existe mas verifiedAt=null (pendente)', async () => {
      const { prisma } = createPrismaStub();
      const adapter = new NativeAuthAdapter(prisma as never, FAKE_KEYSET, {
        totpProvider: new FakeTotpProvider(),
      });

      await adapter.setupMfa({
        userId: USER_ID,
        tenantId: TENANT_ID,
        issuer: 'Ethos',
        accountName: 'alice@acme.com',
      });
      // não confirmou — verifiedAt=null

      const out = await adapter.verifyMfaChallenge({
        userId: USER_ID,
        tenantId: TENANT_ID,
        code: '123456',
      });
      expect(out).toEqual({ ok: false, reason: 'not_enabled' });
    });
  });

  describe('consumeBackupCode', () => {
    it('marca usedAt em backup code válido; segunda tentativa retorna backup_used', async () => {
      const { prisma, _state } = createPrismaStub();
      // Setup direto: insere MfaSecret confirmado + 1 backup code conhecido
      _state.mfaSecrets.push({
        id: 'mfa_pre',
        userId: USER_ID,
        tenantId: TENANT_ID,
        secretEnc: 'v1:xx:yy:zz',
        verifiedAt: new Date(),
        createdAt: new Date(),
      });
      const plain = 'TESTCODE';
      const hash = await hashBackupCode(plain);
      _state.mfaBackupCodes.push({
        id: 'bc_1',
        userId: USER_ID,
        codeHash: hash,
        usedAt: null,
        createdAt: new Date(),
      });

      const adapter = new NativeAuthAdapter(prisma as never, FAKE_KEYSET, {
        totpProvider: new FakeTotpProvider(),
      });

      const first = await adapter.consumeBackupCode({
        userId: USER_ID,
        tenantId: TENANT_ID,
        code: plain,
      });
      expect(first.ok).toBe(true);
      expect(_state.mfaBackupCodes[0]!.usedAt).toBeInstanceOf(Date);

      const second = await adapter.consumeBackupCode({
        userId: USER_ID,
        tenantId: TENANT_ID,
        code: plain,
      });
      expect(second).toEqual({ ok: false, reason: 'backup_used' });
    });

    it('código inválido (não bate nenhum hash) retorna invalid', async () => {
      const { prisma, _state } = createPrismaStub();
      _state.mfaSecrets.push({
        id: 'mfa_pre',
        userId: USER_ID,
        tenantId: TENANT_ID,
        secretEnc: 'v1:xx:yy:zz',
        verifiedAt: new Date(),
        createdAt: new Date(),
      });
      const hash = await hashBackupCode('VALIDONE');
      _state.mfaBackupCodes.push({
        id: 'bc_1',
        userId: USER_ID,
        codeHash: hash,
        usedAt: null,
        createdAt: new Date(),
      });
      const adapter = new NativeAuthAdapter(prisma as never, FAKE_KEYSET, {
        totpProvider: new FakeTotpProvider(),
      });

      const out = await adapter.consumeBackupCode({
        userId: USER_ID,
        tenantId: TENANT_ID,
        code: 'WRONG999',
      });
      expect(out).toEqual({ ok: false, reason: 'invalid' });
    });

    it('retorna not_enabled quando MFA não configurado', async () => {
      const { prisma } = createPrismaStub();
      const adapter = new NativeAuthAdapter(prisma as never, FAKE_KEYSET, {
        totpProvider: new FakeTotpProvider(),
      });

      const out = await adapter.consumeBackupCode({
        userId: USER_ID,
        tenantId: TENANT_ID,
        code: 'ANYCODE9',
      });
      expect(out).toEqual({ ok: false, reason: 'not_enabled' });
    });
  });

  describe('disableMfa', () => {
    it('apaga MfaSecret e todos MfaBackupCode do user', async () => {
      const { prisma, _state } = createPrismaStub();
      _state.mfaSecrets.push({
        id: 'mfa_pre',
        userId: USER_ID,
        tenantId: TENANT_ID,
        secretEnc: 'v1:xx:yy:zz',
        verifiedAt: new Date(),
        createdAt: new Date(),
      });
      _state.mfaBackupCodes.push(
        {
          id: 'bc_1',
          userId: USER_ID,
          codeHash: 'h1',
          usedAt: null,
          createdAt: new Date(),
        },
        {
          id: 'bc_2',
          userId: USER_ID,
          codeHash: 'h2',
          usedAt: null,
          createdAt: new Date(),
        },
      );

      const adapter = new NativeAuthAdapter(prisma as never, FAKE_KEYSET, {
        totpProvider: new FakeTotpProvider(),
      });

      await adapter.disableMfa({ userId: USER_ID, tenantId: TENANT_ID });

      expect(_state.mfaSecrets).toHaveLength(0);
      expect(_state.mfaBackupCodes).toHaveLength(0);
    });
  });
});
