import { AUTH_ADAPTER_TOKEN, PRISMA_CLIENT_TOKEN } from '@ethos/api-base';
import { NativeAuthAdapter, loadKeysetFromEnv } from '@ethos/auth';
import { PrismaClient } from '@ethos/database';
import { Global, Module, type OnApplicationShutdown } from '@nestjs/common';

import { EnvService } from '../../config/env.module';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

/**
 * Provider de PrismaClient singleton. Implementa `onApplicationShutdown` pra
 * fechar conexão limpa no shutdown gracioso do Nest.
 */
class PrismaProvider extends PrismaClient implements OnApplicationShutdown {
  async onApplicationShutdown(): Promise<void> {
    await this.$disconnect();
  }
}

/**
 * AuthModule — wraps register/login/refresh/logout/me endpoints + provê os
 * tokens compartilhados (`PRISMA_CLIENT_TOKEN`, `AUTH_ADAPTER_TOKEN`) que o
 * `JwtAuthGuard` (APP_GUARD global) e o `AuditLogInterceptor` (APP_INTERCEPTOR
 * global) consomem.
 *
 * `@Global()` faz esses providers ficarem disponíveis em qualquer módulo
 * downstream sem precisar reimportar.
 *
 * DI graph:
 *   EnvService → loadKeysetFromEnv → JwtKeyset
 *                                  ↓
 *   PrismaClient (PRISMA_CLIENT_TOKEN) → NativeAuthAdapter (AUTH_ADAPTER_TOKEN)
 *                                                              ↓
 *                                       AuthService → AuthController
 */
@Global()
@Module({
  controllers: [AuthController],
  providers: [
    AuthService,
    // PrismaClient singleton — injetado em AuthAdapter + AuditLogInterceptor.
    {
      provide: PRISMA_CLIENT_TOKEN,
      useFactory: (): PrismaProvider => new PrismaProvider(),
    },
    // NativeAuthAdapter (D14.2) — implementação default do AuthAdapter (D14.1).
    {
      provide: AUTH_ADAPTER_TOKEN,
      inject: [PRISMA_CLIENT_TOKEN, EnvService],
      useFactory: async (prisma: PrismaClient, env: EnvService): Promise<NativeAuthAdapter> => {
        const keyset = await loadKeysetFromEnv({
          JWT_KID_CURRENT: env.get('JWT_KID_CURRENT'),
          JWT_PRIVATE_KEY_CURRENT: env.get('JWT_PRIVATE_KEY_CURRENT'),
          JWT_PUBLIC_KEY_CURRENT: env.get('JWT_PUBLIC_KEY_CURRENT'),
          JWT_KID_PREVIOUS: env.get('JWT_KID_PREVIOUS'),
          JWT_PUBLIC_KEY_PREVIOUS: env.get('JWT_PUBLIC_KEY_PREVIOUS'),
        });
        return new NativeAuthAdapter(prisma, keyset);
      },
    },
  ],
  exports: [PRISMA_CLIENT_TOKEN, AUTH_ADAPTER_TOKEN],
})
export class AuthModule {}
