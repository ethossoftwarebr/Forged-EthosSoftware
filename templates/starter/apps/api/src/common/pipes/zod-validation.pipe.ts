import {
  ArgumentMetadata,
  BadRequestException,
  Body,
  Injectable,
  PipeTransform,
} from '@nestjs/common';
import { ZodError, type ZodType } from 'zod';

/**
 * Pipe genérica que valida input contra um Zod schema arbitrário.
 *
 * Uso direto:
 *   @Post()
 *   create(@Body(new ZodValidationPipe(CreateUserSchema)) dto: CreateUser) { ... }
 *
 * Uso via decorator helper (preferido — menos verbose):
 *   @Post()
 *   create(@ZodBody(CreateUserSchema) dto: CreateUser) { ... }
 *
 * ZodError vira BadRequestException 400 com `details: error.flatten()`.
 * O AllExceptionsFilter formata o response final no shape `{ error: { ... } }`.
 */
@Injectable()
export class ZodValidationPipe<T = unknown> implements PipeTransform<unknown, T> {
  constructor(private readonly schema: ZodType<T>) {}

  transform(value: unknown, _metadata: ArgumentMetadata): T {
    try {
      return this.schema.parse(value);
    } catch (error) {
      if (error instanceof ZodError) {
        throw new BadRequestException({
          message: 'Validation failed',
          code: 'VALIDATION_ERROR',
          details: error.flatten(),
        });
      }
      throw error;
    }
  }
}

/**
 * Decorator helper. Equivale a `@Body(new ZodValidationPipe(schema))` —
 * evita ter que construir a pipe manualmente em cada handler.
 */
export const ZodBody = <T>(schema: ZodType<T>): ParameterDecorator =>
  Body(new ZodValidationPipe(schema));
