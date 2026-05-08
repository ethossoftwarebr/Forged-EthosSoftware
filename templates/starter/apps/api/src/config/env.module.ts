import { Global, Injectable, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { EnvSchema, type Env } from './env.schema';

/**
 * Wrapper tipado em volta do ConfigService<Env, true>.
 *
 * Consumidores fazem:
 *   constructor(private readonly env: EnvService) {}
 *   const port = this.env.get('PORT'); // tipo: number
 *
 * Em vez de:
 *   const port = this.config.get<number>('PORT'); // tipo manualmente reapontado
 */
@Injectable()
export class EnvService {
  constructor(private readonly config: ConfigService<Env, true>) {}

  get<K extends keyof Env>(key: K): Env[K] {
    return this.config.get(key, { infer: true }) as Env[K];
  }
}

/**
 * Modulo global de configuração validada por Zod.
 *
 * `validate` é chamado no boot do ConfigModule. Se `EnvSchema.parse` lançar
 * `ZodError`, o NestJS aborta o startup antes de qualquer outro modulo subir.
 */
@Global()
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: (raw) => EnvSchema.parse(raw),
    }),
  ],
  providers: [EnvService],
  exports: [EnvService, ConfigModule],
})
export class EnvModule {}
