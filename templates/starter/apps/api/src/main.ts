import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { Logger } from 'nestjs-pino';

import { AppModule } from './app.module';
import { EnvService } from './config/env.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  // Pino logger — buffer logs no bootstrap, attach após módulos resolvidos.
  app.useLogger(app.get(Logger));

  // EnvService (Concern #3 do #7) — substitui acesso direto a process.env.
  // Já validado por Zod no boot do EnvModule, então `env.get(...)` é typed + safe.
  const env = app.get(EnvService);

  // Hardening padrão.
  app.use(helmet());
  app.use(compression());
  // cookie-parser popula `request.cookies` — consumido pelo JwtAuthGuard
  // (cookie `access_token`) e pelo AuthController (cookie `refresh_token`).
  app.use(cookieParser());

  const corsOrigins = env
    .get('CORS_ORIGINS')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  app.enableCors({ origin: corsOrigins, credentials: true });

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  app.enableShutdownHooks();

  // Swagger UI em /api-docs e spec JSON em /api-docs-json.
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Ethos API')
    .setDescription('Ethos starter API')
    .setVersion('0.0.1')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api-docs', app, document, {
    jsonDocumentUrl: 'api-docs-json',
  });

  const port = env.get('PORT');
  await app.listen(port);
}

void bootstrap();
