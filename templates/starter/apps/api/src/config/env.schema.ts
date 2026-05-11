import { z } from 'zod';

/**
 * Schema de validação das variáveis de ambiente.
 *
 * Validado no boot via `EnvModule` (ConfigModule.forRoot({ validate })).
 * Falha em env inválida = startup trava antes de bind no port (D5/AC#5 do prompt #7).
 *
 * Zod 4 syntax: usamos `z.url()` (top-level) em vez de `z.string().url()` quando faz sentido.
 */
export const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),

  PORT: z.coerce.number().int().positive().default(3001),

  DATABASE_URL: z.url(),

  REDIS_URL: z.url().optional(),

  /**
   * Lista CSV de origens permitidas em CORS. Parsed no consumer (main.ts faz split por ',').
   * Default `http://localhost:3000` cobre dev local com Next.js.
   */
  CORS_ORIGINS: z.string().default('http://localhost:3000'),

  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),

  /**
   * JWT keyset (D13 — hardening). `JWT_SECRET` foi removido (HS256/HMAC proibido por D13.1).
   *
   * Assinatura: EdDSA / Ed25519. Chaves em PEM:
   *  - JWT_PRIVATE_KEY_CURRENT: PKCS8 (BEGIN PRIVATE KEY)
   *  - JWT_PUBLIC_KEY_CURRENT:  SPKI   (BEGIN PUBLIC KEY)
   *  - JWT_KID_CURRENT:         string identificadora (ex: "2026-05-10")
   *
   * Rotação (D13.4): popule JWT_KID_PREVIOUS + JWT_PUBLIC_KEY_PREVIOUS pra aceitar
   * tokens assinados com a chave anterior durante a janela de transição.
   *
   * Gere as chaves com: `pnpm --filter @ethos/auth generate-keys`
   */
  JWT_KID_CURRENT: z.string().min(1),
  JWT_PRIVATE_KEY_CURRENT: z.string().includes('-----BEGIN PRIVATE KEY-----'),
  JWT_PUBLIC_KEY_CURRENT: z.string().includes('-----BEGIN PUBLIC KEY-----'),
  JWT_KID_PREVIOUS: z.string().min(1).optional(),
  JWT_PUBLIC_KEY_PREVIOUS: z.string().includes('-----BEGIN PUBLIC KEY-----').optional(),

  /**
   * Cookie domain (opcional). Em dev (NODE_ENV !== production) deixe vazio
   * para o browser usar host-only cookies.
   */
  COOKIE_DOMAIN: z.string().optional(),
});

export type Env = z.infer<typeof EnvSchema>;
