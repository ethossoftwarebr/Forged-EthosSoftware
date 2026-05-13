import { z } from 'zod';

/**
 * Schema de validação das variáveis de ambiente.
 *
 * Validado no boot via `EnvModule` (ConfigModule.forRoot({ validate })).
 * Falha em env inválida = startup trava antes de bind no port (D5/AC#5 do prompt #7).
 *
 * Zod 4 syntax: usamos `z.url()` (top-level) em vez de `z.string().url()` quando faz sentido.
 */
export const EnvSchema = z
  .object({
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

    /**
     * Base URL pública do app web (D8.5.5). Usado nos redirects OAuth
     * (`${WEB_BASE_URL}/login?error=...` e `${WEB_BASE_URL}/dashboard`).
     * Default cobre dev local; em prod aponte pro host do Next.
     */
    WEB_BASE_URL: z.url().default('http://localhost:3000'),

    /**
     * OAuth providers (D8.5). Todos opcionais — providers só são registrados
     * se as 3 variáveis (`CLIENT_ID` + `CLIENT_SECRET` + `REDIRECT_URI`) estão
     * presentes. O `OAuthRegistry` factory loga `[OAuth] {provider}: skipped`
     * pra providers omitidos.
     */
    GOOGLE_CLIENT_ID: z.string().min(1).optional(),
    GOOGLE_CLIENT_SECRET: z.string().min(1).optional(),
    GOOGLE_REDIRECT_URI: z.url().optional(),

    MICROSOFT_CLIENT_ID: z.string().min(1).optional(),
    MICROSOFT_CLIENT_SECRET: z.string().min(1).optional(),
    MICROSOFT_REDIRECT_URI: z.url().optional(),

    /**
     * Chave AES-256-GCM (32 bytes em hex = 64 chars) pra cifrar OAuth refresh
     * tokens at-rest. **Obrigatório** se qualquer provider OAuth estiver
     * configurado — guard via `superRefine` abaixo.
     *
     * Gere com:
     *   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
     */
    OAUTH_TOKEN_ENCRYPTION_KEY: z
      .string()
      .regex(/^[0-9a-fA-F]{64}$/, 'OAUTH_TOKEN_ENCRYPTION_KEY deve ter 64 chars hex (32 bytes).')
      .optional(),
  })
  .superRefine((env, ctx) => {
    // D8.5.4 — se algum provider OAuth está configurado, a encryption key vira obrigatória.
    const googleConfigured = Boolean(
      env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET && env.GOOGLE_REDIRECT_URI,
    );
    const microsoftConfigured = Boolean(
      env.MICROSOFT_CLIENT_ID && env.MICROSOFT_CLIENT_SECRET && env.MICROSOFT_REDIRECT_URI,
    );
    if ((googleConfigured || microsoftConfigured) && !env.OAUTH_TOKEN_ENCRYPTION_KEY) {
      ctx.addIssue({
        code: 'custom',
        path: ['OAUTH_TOKEN_ENCRYPTION_KEY'],
        message:
          'OAUTH_TOKEN_ENCRYPTION_KEY é obrigatório quando há provider OAuth configurado (Google/Microsoft).',
      });
    }
  });

export type Env = z.infer<typeof EnvSchema>;
