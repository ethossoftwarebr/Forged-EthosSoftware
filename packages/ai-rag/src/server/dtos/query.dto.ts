/**
 * Query DTO — V1: Swagger não é peer (ver `ingest.dto.ts`). Re-export Zod
 * schemas pra validation inline no controller.
 */
export {
  QueryRequestSchema,
  QueryResponseSchema,
  SourceSchema,
  type QueryRequest,
  type QueryResponse,
  type Source,
} from '../../shared/types';
