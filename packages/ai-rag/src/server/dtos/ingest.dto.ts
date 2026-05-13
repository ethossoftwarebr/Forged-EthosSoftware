/**
 * Ingest DTO — V1: Swagger não é peer do package, então não criamos class
 * decorada com `@ApiProperty()`. Re-exportamos os Zod schemas do shared,
 * que o controller usa pra `IngestRequestSchema.parse(body)` inline.
 *
 * Quando `@nestjs/swagger` for adotado no consumidor, basta criar
 * `IngestDto extends createZodDto(IngestRequestSchema)` (nestjs-zod) ou
 * uma classe POJO com decoradores. V1 manter mínimo.
 */
export {
  IngestRequestSchema,
  IngestResponseSchema,
  IngestFileSchema,
  IngestTextSchema,
  IngestUrlSchema,
  type IngestRequest,
  type IngestResponse,
  type IngestFileRequest,
  type IngestTextRequest,
  type IngestUrlRequest,
} from '../../shared/types';
