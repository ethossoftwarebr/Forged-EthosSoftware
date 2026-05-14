import { createHash, randomBytes } from 'node:crypto';

import type { PrismaClient } from '@ethos/database';
import type { EmailAdapter } from '@ethos/email';

import type { AuthAdapter } from '../adapter';
import type { PasswordlessProvider } from '../passwordless';
import type { AuthSession, IssuedTokens } from '../types';

import { MagicLinkErrorCode } from './error-codes';

// Type-only import — `@ethos/email` é devDep, não pesa em runtime do consumer.
// (consumers do starter precisam adicionar `@ethos/email` como dep concreta.)

/**
 * Default Magic Link TTL (D8.6.2 — alinhado com NextAuth/Auth0/Clerk padrões).
 */
const DEFAULT_TTL_MINUTES = 15;

/**
 * `authError` local — espelha o helper privado em `native-adapter.ts`. Códigos
 * limitados ao subconjunto que `EmailMagicLinkProvider` produz pra evitar
 * acoplamento com o enum geral.
 */
function authError(
  code:
    | 'TENANT_NOT_FOUND'
    | 'EMAIL_PROVIDER_UNAVAILABLE'
    | typeof MagicLinkErrorCode.TOKEN_INVALID
    | typeof MagicLinkErrorCode.TOKEN_EXPIRED
    | typeof MagicLinkErrorCode.TOKEN_USED
    | typeof MagicLinkErrorCode.TENANT_MISMATCH,
  message: string,
): Error {
  const err = new Error(message) as Error & { code: string };
  err.code = code;
  return err;
}

/**
 * Hash determinístico SHA-256 hex do plaintext token.
 *
 * **Decisão (W1.B): por que SHA-256 e NÃO argon2id?**
 *
 * O schema (`MagicLinkToken.tokenHash @unique`) requer lookup direto por hash
 * pra verificar tokens em O(log n). Argon2id é não-determinístico (salt embed)
 * — `hash(t, opts) !== hash(t, opts)` — então não permite lookup unique.
 *
 * Alternativas avaliadas:
 *   (a) SHA-256 determinístico   ← ESCOLHIDA
 *   (b) Lookup por email + argon2.verify — vetor de privacy / enumeration
 *   (c) Scan all non-expired + argon2.verify — O(n) inaceitável
 *
 * Risco de SHA-256 vs argon2: zero prática. Token tem **256-bit entropy**
 * (`randomBytes(32)`), TTL 15min, single-use. Brute-force online é bloqueado
 * por rate-limit; brute-force offline (com DB dump) ainda precisaria de 2^128
 * operações pra achar colisão — fora de qualquer ameaça realista. Argon2 só
 * justifica em senhas de baixa entropia humana.
 */
function hashMagicToken(plaintext: string): string {
  return createHash('sha256').update(plaintext).digest('hex');
}

/**
 * Gera token plaintext de 32 bytes em base64url. Entropia 256-bit.
 * `randomBytes` usa /dev/urandom (Unix) ou CryptGenRandom (Win) — CSPRNG.
 */
function generateMagicToken(): string {
  return randomBytes(32).toString('base64url');
}

/**
 * Renderiza o HTML do email de magic link. Template estático inline — versões
 * customizáveis viram package separado pós-v1 (`@ethos/email-templates`).
 */
function renderMagicLinkEmail(link: string, ttlMinutes: number): { html: string; text: string } {
  const html = [
    '<!DOCTYPE html>',
    '<html lang="pt-BR">',
    '<body style="font-family: system-ui, sans-serif; max-width: 480px; margin: 32px auto; padding: 16px; color: #1a1a1a;">',
    '<p>Olá!</p>',
    '<p>Clique no link abaixo pra entrar na sua conta:</p>',
    `<p><a href="${link}" style="display: inline-block; padding: 12px 24px; background: #1a1a1a; color: #fff; text-decoration: none; border-radius: 6px;">Entrar</a></p>`,
    `<p style="color: #666; font-size: 14px;">Ou copie e cole: <br><code style="word-break: break-all;">${link}</code></p>`,
    `<p style="color: #666; font-size: 14px;">Esse link expira em ${ttlMinutes} minutos e só pode ser usado uma vez.</p>`,
    '<p style="color: #999; font-size: 12px;">Se você não solicitou esse acesso, ignore esse email.</p>',
    '</body>',
    '</html>',
  ].join('\n');

  const text = [
    'Olá!',
    '',
    'Clique no link abaixo pra entrar na sua conta:',
    link,
    '',
    `Esse link expira em ${ttlMinutes} minutos e só pode ser usado uma vez.`,
    'Se você não solicitou esse acesso, ignore esse email.',
  ].join('\n');

  return { html, text };
}

export interface EmailMagicLinkProviderConfig {
  prisma: PrismaClient;
  emailAdapter: EmailAdapter;
  authAdapter: AuthAdapter;
  /** Email remetente (deve estar em domain verificado). */
  fromEmail: string;
  /** TTL em minutos (default 15). */
  ttlMinutes?: number;
}

/**
 * `EmailMagicLinkProvider` (D8.6) — impl default do `PasswordlessProvider`.
 *
 * Fluxo:
 *   1. `sendMagicLink({ email, tenantSlug, appUrl })`:
 *      - Resolve `Tenant` por slug — `TENANT_NOT_FOUND` se inexistente.
 *      - Gera token plaintext 32B base64url.
 *      - Persiste `MagicLinkToken { email, tenantId, tokenHash=sha256(plaintext),
 *        expiresAt=now+15min, usedAt=null }`.
 *      - Envia email com link `${appUrl}/auth/magic-link/verify?token=${plaintext}`.
 *      - Plaintext NUNCA é gravado em DB.
 *
 *   2. `verifyToken(plaintext, opts?)`:
 *      - Lookup por `tokenHash=sha256(plaintext)` — `TOKEN_INVALID` se ausente.
 *      - Reject se `usedAt !== null` → `TOKEN_USED` (replay).
 *      - Reject se `expiresAt < now()` → `TOKEN_EXPIRED`.
 *      - Se `opts.resolvedTenantSlug` passado, valida casamento com `tenantId` do
 *        token — mismatch → `TENANT_MISMATCH`.
 *      - Update atômico `usedAt=now()` com optimistic lock — race-safe vs duplo
 *        clique do user.
 *      - Delega criação/lookup de User pro `AuthAdapter.loginWithMagicLink`.
 */
export class EmailMagicLinkProvider implements PasswordlessProvider {
  private readonly prisma: PrismaClient;
  private readonly emailAdapter: EmailAdapter;
  private readonly authAdapter: AuthAdapter;
  private readonly fromEmail: string;
  private readonly ttlMinutes: number;

  constructor(config: EmailMagicLinkProviderConfig) {
    this.prisma = config.prisma;
    this.emailAdapter = config.emailAdapter;
    this.authAdapter = config.authAdapter;
    this.fromEmail = config.fromEmail;
    this.ttlMinutes = config.ttlMinutes ?? DEFAULT_TTL_MINUTES;
  }

  /**
   * Dispara magic link pra `email` no contexto de `tenantSlug`. Sempre envia
   * email novo mesmo se já houver token ativo — caller é responsável por dedupe
   * (rate-limit no controller, D8.6.3).
   */
  async sendMagicLink(params: {
    email: string;
    tenantSlug: string;
    appUrl: string;
  }): Promise<void> {
    const { email, tenantSlug, appUrl } = params;

    const tenant = await this.prisma.tenant.findUnique({ where: { slug: tenantSlug } });
    if (!tenant) {
      throw authError('TENANT_NOT_FOUND', `Tenant "${tenantSlug}" inexistente.`);
    }

    const plaintext = generateMagicToken();
    const tokenHash = hashMagicToken(plaintext);
    const expiresAt = new Date(Date.now() + this.ttlMinutes * 60_000);

    await this.prisma.magicLinkToken.create({
      data: {
        email,
        tenantId: tenant.id,
        tokenHash,
        expiresAt,
      },
    });

    const link = `${appUrl}/auth/magic-link/verify?token=${encodeURIComponent(plaintext)}`;
    const { html, text } = renderMagicLinkEmail(link, this.ttlMinutes);

    try {
      await this.emailAdapter.sendTransactional({
        to: email,
        from: this.fromEmail,
        subject: 'Seu link de acesso',
        html,
        text,
      });
    } catch (err) {
      // Adapter falhou — invalida o token pra evitar lixo + propaga como código
      // opaco. Caller (controller) faz delay constante anti-enumeração.
      await this.prisma.magicLinkToken.delete({ where: { tokenHash } }).catch(() => undefined); // best-effort cleanup
      throw authError(
        'EMAIL_PROVIDER_UNAVAILABLE',
        `Falha ao enviar magic link: ${err instanceof Error ? err.message : 'unknown'}`,
      );
    }
  }

  /**
   * Verifica token plaintext recebido no callback. Single-use enforced via
   * `updateMany({ where: { id, usedAt: null }, data: { usedAt: now() } })` —
   * se `count === 0`, outro caller venceu a corrida → `TOKEN_USED`.
   *
   * `opts.resolvedTenantSlug` permite ao caller (controller no starter) passar
   * o tenant inferido do subdomain pra validar consistência (D8.6.7).
   */
  async verifyToken(
    token: string,
    opts?: { resolvedTenantSlug?: string; userAgent?: string; ip?: string },
  ): Promise<{ session: AuthSession; tokens: IssuedTokens }> {
    const tokenHash = hashMagicToken(token);

    const row = await this.prisma.magicLinkToken.findUnique({ where: { tokenHash } });
    if (!row) {
      throw authError(MagicLinkErrorCode.TOKEN_INVALID, 'Magic link token inválido.');
    }

    if (row.usedAt !== null) {
      throw authError(MagicLinkErrorCode.TOKEN_USED, 'Magic link já foi usado.');
    }

    if (row.expiresAt <= new Date()) {
      throw authError(MagicLinkErrorCode.TOKEN_EXPIRED, 'Magic link expirou.');
    }

    // Tenant resolvido pelo caller (subdomain) deve casar com o token
    const tenant = await this.prisma.tenant.findUnique({ where: { id: row.tenantId } });
    if (!tenant) {
      // Defesa em profundidade — onDelete:Cascade no schema, se chegou aqui é
      // race com delete do tenant. Trata como invalid.
      throw authError(MagicLinkErrorCode.TOKEN_INVALID, 'Tenant do magic link removido.');
    }
    if (opts?.resolvedTenantSlug && opts.resolvedTenantSlug !== tenant.slug) {
      throw authError(
        MagicLinkErrorCode.TENANT_MISMATCH,
        `Magic link emitido pra tenant "${tenant.slug}" mas verificação veio de "${opts.resolvedTenantSlug}".`,
      );
    }

    // Optimistic lock: only this caller may flip usedAt; concurrent callers
    // see updateMany count=0 → TOKEN_USED.
    const claimed = await this.prisma.magicLinkToken.updateMany({
      where: { id: row.id, usedAt: null },
      data: { usedAt: new Date() },
    });
    if (claimed.count === 0) {
      throw authError(MagicLinkErrorCode.TOKEN_USED, 'Magic link já foi consumido.');
    }

    // Delega login (cria User se preciso, resolve tenant via membership)
    const result = await this.authAdapter.loginWithMagicLink({
      email: row.email,
      tenantSlug: tenant.slug,
      userAgent: opts?.userAgent,
      ip: opts?.ip,
    });

    return { session: result.session, tokens: result.tokens };
  }
}
