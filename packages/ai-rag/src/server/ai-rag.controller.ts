import { CurrentUser, JwtAuthGuard, MultiTenantInterceptor } from '@ethos/api-base';
import type { AuthSession } from '@ethos/auth';
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';

import { AiRagService } from './ai-rag.service';
import { IngestRequestSchema, type IngestRequest, type IngestResponse } from './dtos/ingest.dto';
import { QueryRequestSchema, type QueryRequest, type QueryResponse } from './dtos/query.dto';

/**
 * AiRagController — endpoints REST do RAG.
 *
 * Guards (D#14.9):
 *  - `JwtAuthGuard` obrigatório — NÃO usa `@Public()`. Auth é exigida.
 *  - `MultiTenantInterceptor` popula `TenantContext` com tenantId do JWT.
 *
 * Endpoints:
 *  - `POST /ai-rag/ingest`  → enfileira job (retorna jobId+documentId)
 *  - `POST /ai-rag/query`   → sync RAG query (D#14.10 — sem SSE V1)
 *  - `GET  /ai-rag/documents`         → list
 *  - `GET  /ai-rag/documents/:id`     → status detalhado
 *  - `DELETE /ai-rag/documents/:id`   → delete (CASCADE chunks)
 *
 * V1 W2-C2: multipart upload NÃO wired aqui. `kind=file` espera `filename` como
 * path local (FS) ou storage URL — client deve ter feito upload prévio.
 */
@Controller('ai-rag')
@UseGuards(JwtAuthGuard)
@UseInterceptors(MultiTenantInterceptor)
export class AiRagController {
  constructor(private readonly service: AiRagService) {}

  // AC2: ingest é assíncrono — retorna 202 Accepted com jobId/documentId; worker processa em background.
  @Post('ingest')
  @HttpCode(HttpStatus.ACCEPTED)
  async ingest(
    @Body() body: unknown,
    @CurrentUser() session: AuthSession,
  ): Promise<IngestResponse> {
    const parsed: IngestRequest = IngestRequestSchema.parse(body);
    return this.service.ingest(parsed, session.userId);
  }

  @Post('query')
  async query(@Body() body: unknown, @CurrentUser() session: AuthSession): Promise<QueryResponse> {
    const parsed: QueryRequest = QueryRequestSchema.parse(body);
    return this.service.query(parsed, session.userId);
  }

  @Get('documents')
  async list(
    @CurrentUser() session: AuthSession,
    @Query('status') status?: string,
    @Query('sourceType') sourceType?: string,
  ) {
    const filters: { status?: string; sourceType?: string } = {};
    if (status) filters.status = status;
    if (sourceType) filters.sourceType = sourceType;
    return this.service.listDocuments(session.userId, filters);
  }

  @Get('documents/:id')
  async get(@Param('id') id: string, @CurrentUser() session: AuthSession) {
    return this.service.getDocument(id, session.userId);
  }

  @Delete('documents/:id')
  async delete(
    @Param('id') id: string,
    @CurrentUser() session: AuthSession,
  ): Promise<{ ok: true }> {
    await this.service.deleteDocument(id, session.userId);
    return { ok: true };
  }
}
