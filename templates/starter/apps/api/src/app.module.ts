import {
  AuditLogInterceptor,
  JwtAuthGuard,
  MultiTenantInterceptor,
  RolesGuard,
} from '@ethos/api-base';
import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { EnvModule } from './config/env.module';
import { HealthModule } from './health/health.module';
import { AuthModule } from './modules/auth/auth.module';
import { TenantsModule } from './modules/tenants/tenants.module';
import { UsersModule } from './modules/users/users.module';

const isProduction = process.env.NODE_ENV === 'production';

@Module({
  imports: [
    // Validação Zod das envs no boot. EnvModule é @Global, expõe EnvService tipado.
    EnvModule,
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.LOG_LEVEL ?? 'info',
        transport: isProduction
          ? undefined
          : { target: 'pino-pretty', options: { singleLine: true } },
        // Princípio CLAUDE.md: senhas/tokens NUNCA em log.
        redact: {
          paths: [
            'req.headers.authorization',
            'req.headers.cookie',
            'req.body.password',
            'req.body.refreshToken',
            'res.headers["set-cookie"]',
          ],
          remove: false,
        },
      },
    }),
    // 60 req/min default. Overrides por endpoint vêm em Wave 3+.
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 60 }]),
    HealthModule,
    // AuthModule é @Global e provê PRISMA_CLIENT_TOKEN + AUTH_ADAPTER_TOKEN
    // pros guards/interceptors globais abaixo.
    AuthModule,
    UsersModule,
    TenantsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,

    // Guards globais: throttler primeiro (proteção DDoS), depois auth, depois roles.
    // Nest executa APP_GUARDs em ordem de registro — RolesGuard precisa rodar
    // DEPOIS de JwtAuthGuard (que popula request.user).
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },

    // Filters globais.
    { provide: APP_FILTER, useClass: AllExceptionsFilter },

    // Interceptors globais. Ordem: TransformInterceptor (response shape) →
    // MultiTenantInterceptor (abre ALS) → AuditLogInterceptor (lê ALS).
    { provide: APP_INTERCEPTOR, useClass: TransformInterceptor },
    { provide: APP_INTERCEPTOR, useClass: MultiTenantInterceptor },
    { provide: APP_INTERCEPTOR, useClass: AuditLogInterceptor },

    // ZodValidationPipe NÃO é APP_PIPE: precisa de schema arg por rota.
    // Use `@ZodBody(schema)` ou `@Body(new ZodValidationPipe(schema))` no handler.
  ],
})
export class AppModule {}
