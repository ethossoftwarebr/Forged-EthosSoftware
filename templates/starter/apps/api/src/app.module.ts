import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { EnvModule } from './config/env.module';

const isProduction = process.env.NODE_ENV === 'production';

@Module({
  imports: [
    // Validação Zod das envs no boot (Wave 2). EnvModule é @Global, expõe EnvService tipado.
    EnvModule,
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.LOG_LEVEL ?? 'info',
        transport: isProduction
          ? undefined
          : { target: 'pino-pretty', options: { singleLine: true } },
      },
    }),
    // 60 req/min default (D16). Overrides por endpoint vêm no #8.
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 60 }]),
    // HealthModule wired na Wave 3.
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    { provide: APP_INTERCEPTOR, useClass: TransformInterceptor },
    // ZodValidationPipe NÃO é APP_PIPE: precisa de schema arg por rota.
    // Use `@ZodBody(schema)` ou `@Body(new ZodValidationPipe(schema))` no handler.
  ],
})
export class AppModule {}
