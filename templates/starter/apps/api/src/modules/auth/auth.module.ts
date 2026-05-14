import { AUTH_ADAPTER_TOKEN, PRISMA_CLIENT_TOKEN } from '@ethos/api-base';
import {
  EmailMagicLinkProvider,
  NativeAuthAdapter,
  loadKeysetFromEnv,
  parseEncryptionKey,
  type AuthAdapter,
  type JwtKeyset,
} from '@ethos/auth';
import { PrismaClient } from '@ethos/database';
import { ResendAdapter } from '@ethos/email';
import { Global, Logger, Module, type OnApplicationShutdown } from '@nestjs/common';

import { EnvService } from '../../config/env.module';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { MagicLinkController } from './magic-link.controller';
import {
  EMAIL_ADAPTER_TOKEN,
  MAGIC_LINK_PROVIDER_TOKEN,
  type EmailAdapterOrNull,
  type MagicLinkProviderOrNull,
} from './magic-link.tokens';
import { createOAuthRegistry } from './oauth-registry.provider';
import { OAuthController } from './oauth.controller';
import {
  OAUTH_ENCRYPTION_KEY_TOKEN,
  OAUTH_KEYSET_TOKEN,
  OAUTH_REGISTRY_TOKEN,
  type OAuthEncryptionKey,
  type OAuthRegistry,
} from './oauth.tokens';

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
 * AuthModule — wraps register/login/refresh/logout/me + OAuth flow (D8.5).
 *
 * Provê os tokens compartilhados (`PRISMA_CLIENT_TOKEN`, `AUTH_ADAPTER_TOKEN`)
 * que o `JwtAuthGuard` e o `AuditLogInterceptor` consomem, mais os tokens OAuth
 * (`OAUTH_KEYSET_TOKEN`, `OAUTH_REGISTRY_TOKEN`, `OAUTH_ENCRYPTION_KEY_TOKEN`)
 * usados pelo `OAuthController`.
 *
 * `@Global()` faz esses providers ficarem disponíveis em qualquer módulo
 * downstream sem precisar reimportar.
 *
 * DI graph:
 *   EnvService → loadKeysetFromEnv → JwtKeyset (OAUTH_KEYSET_TOKEN)
 *                                  ↓
 *   PrismaClient → NativeAuthAdapter (AUTH_ADAPTER_TOKEN) → AuthService → AuthController
 *                                                                      → OAuthController
 *   EnvService → createOAuthRegistry → Map<string, OAuthProvider> (OAUTH_REGISTRY_TOKEN)
 *   EnvService → parseEncryptionKey → Buffer | null (OAUTH_ENCRYPTION_KEY_TOKEN)
 */
@Global()
@Module({
  controllers: [AuthController, OAuthController, MagicLinkController],
  providers: [
    AuthService,
    // PrismaClient singleton — injetado em AuthAdapter + AuditLogInterceptor.
    {
      provide: PRISMA_CLIENT_TOKEN,
      useFactory: (): PrismaProvider => new PrismaProvider(),
    },
    // JwtKeyset compartilhado — usado pelo NativeAuthAdapter + state cookie OAuth.
    // Resolvido uma única vez no boot pra evitar custo de loadKeysetFromEnv repetido.
    {
      provide: OAUTH_KEYSET_TOKEN,
      inject: [EnvService],
      useFactory: async (env: EnvService): Promise<JwtKeyset> =>
        loadKeysetFromEnv({
          JWT_KID_CURRENT: env.get('JWT_KID_CURRENT'),
          JWT_PRIVATE_KEY_CURRENT: env.get('JWT_PRIVATE_KEY_CURRENT'),
          JWT_PUBLIC_KEY_CURRENT: env.get('JWT_PUBLIC_KEY_CURRENT'),
          JWT_KID_PREVIOUS: env.get('JWT_KID_PREVIOUS'),
          JWT_PUBLIC_KEY_PREVIOUS: env.get('JWT_PUBLIC_KEY_PREVIOUS'),
        }),
    },
    // NativeAuthAdapter (D14.2) — implementação default do AuthAdapter (D14.1).
    {
      provide: AUTH_ADAPTER_TOKEN,
      inject: [PRISMA_CLIENT_TOKEN, OAUTH_KEYSET_TOKEN],
      useFactory: (prisma: PrismaClient, keyset: JwtKeyset): NativeAuthAdapter =>
        new NativeAuthAdapter(prisma, keyset),
    },
    // OAuthRegistry — instanciado uma vez no boot inspecionando envs (D8.5.4).
    {
      provide: OAUTH_REGISTRY_TOKEN,
      inject: [EnvService],
      useFactory: (env: EnvService): OAuthRegistry => createOAuthRegistry(env),
    },
    // Encryption key (Buffer 32 bytes) — `null` se nenhum provider OAuth está
    // configurado. Env schema (superRefine) já garante presença quando há
    // provider; aqui só fazemos o parse de hex pra Buffer uma única vez.
    {
      provide: OAUTH_ENCRYPTION_KEY_TOKEN,
      inject: [EnvService, OAUTH_REGISTRY_TOKEN],
      useFactory: (env: EnvService, registry: OAuthRegistry): OAuthEncryptionKey => {
        const hex = env.get('OAUTH_TOKEN_ENCRYPTION_KEY');
        if (!hex) {
          if (registry.size > 0) {
            // Defense-in-depth: env schema deveria ter pego, mas se chegou aqui
            // com providers registrados sem key, falha o boot ruidosamente.
            throw new Error('OAUTH_TOKEN_ENCRYPTION_KEY ausente com providers OAuth registrados.');
          }
          new Logger('OAuth').log('[OAuth] encryption key: skipped (no provider configured)');
          return null;
        }
        return parseEncryptionKey(hex);
      },
    },
    // EmailAdapter (D8.6.8) — ResendAdapter quando RESEND_API_KEY presente.
    // null = graceful degradation; controller responde com erro opaco.
    {
      provide: EMAIL_ADAPTER_TOKEN,
      inject: [EnvService],
      useFactory: (env: EnvService): EmailAdapterOrNull => {
        const key = env.get('RESEND_API_KEY');
        if (!key) {
          new Logger('MagicLink').log(
            '[MagicLink] RESEND_API_KEY ausente — email provider desabilitado.',
          );
          return null;
        }
        return new ResendAdapter(key);
      },
    },
    // EmailMagicLinkProvider (D8.6) — só registra se EmailAdapter resolvido.
    // Cascata graceful: provider null força controller a responder com erro opaco.
    {
      provide: MAGIC_LINK_PROVIDER_TOKEN,
      inject: [PRISMA_CLIENT_TOKEN, EMAIL_ADAPTER_TOKEN, AUTH_ADAPTER_TOKEN, EnvService],
      useFactory: (
        prisma: PrismaClient,
        emailAdapter: EmailAdapterOrNull,
        authAdapter: AuthAdapter,
        env: EnvService,
      ): MagicLinkProviderOrNull => {
        if (!emailAdapter) return null;
        const fromEmail = env.get('EMAIL_FROM');
        if (!fromEmail) {
          // Defense-in-depth — superRefine já garante presença, mas se chegou
          // aqui com RESEND_API_KEY sem EMAIL_FROM, falha o boot ruidosamente.
          throw new Error('EMAIL_FROM ausente com RESEND_API_KEY configurado.');
        }
        return new EmailMagicLinkProvider({
          prisma,
          emailAdapter,
          authAdapter,
          fromEmail,
          ttlMinutes: env.get('MAGIC_LINK_TTL_MINUTES'),
        });
      },
    },
  ],
  exports: [
    PRISMA_CLIENT_TOKEN,
    AUTH_ADAPTER_TOKEN,
    OAUTH_KEYSET_TOKEN,
    OAUTH_REGISTRY_TOKEN,
    OAUTH_ENCRYPTION_KEY_TOKEN,
    EMAIL_ADAPTER_TOKEN,
    MAGIC_LINK_PROVIDER_TOKEN,
  ],
})
export class AuthModule {}
