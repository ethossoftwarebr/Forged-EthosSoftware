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
   * JWT secret. Mínimo 16 chars nesta fase (placeholder pro #8).
   * O #8 vai apertar pra >=32 + obrigar entropy mínima em produção.
   */
  JWT_SECRET: z.string().min(16),
});

export type Env = z.infer<typeof EnvSchema>;
