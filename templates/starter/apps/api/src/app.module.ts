import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';

import { AppController } from './app.controller';
import { AppService } from './app.service';

const isProduction = process.env.NODE_ENV === 'production';

@Module({
  imports: [
    // Validação Zod das envs será wired na Wave 2 via ConfigModule.forRoot({ validate }).
    ConfigModule.forRoot({ isGlobal: true }),
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
    // APP_FILTER, APP_INTERCEPTOR, APP_PIPE wired in wave 2
  ],
})
export class AppModule {}
