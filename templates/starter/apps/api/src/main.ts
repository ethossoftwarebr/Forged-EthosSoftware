import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { Logger } from 'nestjs-pino';

import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  // Pino logger — buffer logs no bootstrap, attach após módulos resolvidos.
  app.useLogger(app.get(Logger));

  // Hardening padrão.
  app.use(helmet());
  app.use(compression());
  // cookie-parser popula `request.cookies` — consumido pelo JwtAuthGuard
  // (cookie `access_token`) e pelo AuthController (cookie `refresh_token`).
  app.use(cookieParser());

  const corsOrigins = (process.env.CORS_ORIGINS ?? 'http://localhost:3000')
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

  const port = Number(process.env.PORT ?? 3001);
  await app.listen(port);
}

void bootstrap();
