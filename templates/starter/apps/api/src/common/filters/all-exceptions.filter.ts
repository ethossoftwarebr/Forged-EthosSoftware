import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import type { Request, Response } from 'express';
import { PinoLogger, InjectPinoLogger } from 'nestjs-pino';
import { ZodError } from 'zod';

/**
 * Shape de resposta de erro padrão da API (D7 do prompt #7).
 *
 * Frontend (Hey-API + zod no #11) e clientes externos esperam EXATAMENTE este formato.
 * Mudanças aqui são breaking change.
 */
export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    statusCode: number;
    timestamp: string;
    path: string;
    details?: unknown;
  };
}

const isProduction = (): boolean => process.env.NODE_ENV === 'production';

/**
 * Mapeia status HTTP -> code estável e textual (NOT_FOUND, BAD_REQUEST, etc).
 * Usa o nome do enum do NestJS quando disponível, fallback pra HTTP_<status>.
 */
function statusToCode(status: number): string {
  const entry = Object.entries(HttpStatus).find(
    ([key, value]) => typeof value === 'number' && value === status && Number.isNaN(Number(key)),
  );
  return entry ? entry[0] : `HTTP_${status}`;
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(
    @InjectPinoLogger(AllExceptionsFilter.name)
    private readonly logger: PinoLogger,
  ) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const path = request?.url ?? 'unknown';
    const timestamp = new Date().toISOString();

    let statusCode: number;
    let code: string;
    let message: string;
    let details: unknown;

    if (exception instanceof ZodError) {
      statusCode = HttpStatus.BAD_REQUEST;
      code = 'VALIDATION_ERROR';
      message = 'Validation failed';
      details = exception.flatten();
    } else if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      code = statusToCode(statusCode);
      const responseBody = exception.getResponse();
      if (typeof responseBody === 'string') {
        message = responseBody;
      } else if (responseBody && typeof responseBody === 'object') {
        const body = responseBody as Record<string, unknown>;
        message =
          typeof body.message === 'string'
            ? body.message
            : Array.isArray(body.message)
              ? (body.message as unknown[]).join(', ')
              : exception.message;
        details = body;
      } else {
        message = exception.message;
      }
    } else if (exception instanceof Error) {
      statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
      code = 'INTERNAL_ERROR';
      message = isProduction() ? 'Internal server error' : exception.message;
      if (!isProduction()) {
        details = { stack: exception.stack };
      }
    } else {
      statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
      code = 'INTERNAL_ERROR';
      message = 'Internal server error';
    }

    this.logger.error(
      {
        statusCode,
        code,
        path,
        err: exception instanceof Error ? exception : new Error(String(exception)),
      },
      `Exception: ${code}`,
    );

    const body: ApiErrorResponse = {
      error: {
        code,
        message,
        statusCode,
        timestamp,
        path,
        ...(details !== undefined ? { details } : {}),
      },
    };

    response.status(statusCode).json(body);
  }
}
