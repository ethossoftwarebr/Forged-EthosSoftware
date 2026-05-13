'use client';

/**
 * @ethos/ai-rag — React hooks (client).
 *
 * V1 sync only (D#14.10) — sem SSE, sem ReadableStream. POST /ai-rag/query
 * retorna JSON completo em ~1-3s típicos. Spec #14.5 vai trazer streaming.
 *
 * AC6: este módulo NÃO importa SDK Anthropic/Voyage.
 */

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';

import type { IngestRequest, IngestResponse, QueryRequest, QueryResponse } from '../shared';

const RAG_QUERY_KEY = 'ai-rag';

export interface UseAiRagOptions {
  /** Base URL do API. Default `''` (relativo). */
  apiBaseUrl?: string;
  /** Headers extras. Cookie httpOnly via `credentials: 'include'` é o default. */
  headers?: Record<string, string>;
}

// ---------------------------------------------------------------------------
// Document — shape mínimo que client precisa (subset do model Prisma)
// ---------------------------------------------------------------------------

export interface RagDocument {
  id: string;
  title: string;
  status: 'pending' | 'processing' | 'ready' | 'failed';
  sourceType: 'file' | 'text' | 'url';
  chunksCount: number;
  embedderUsed: string;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// fetch helper — POST/GET com credentials + JSON parse + error wrapping
// ---------------------------------------------------------------------------

async function ragFetch<T>(
  url: string,
  init: RequestInit,
  headers?: Record<string, string>,
): Promise<T> {
  const response = await fetch(url, {
    ...init,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(headers ?? {}),
      ...(init.headers ?? {}),
    },
  });
  if (!response.ok) {
    let body: string;
    try {
      body = await response.text();
    } catch {
      body = response.statusText;
    }
    throw new Error('ai-rag ' + response.status + ': ' + body);
  }
  return (await response.json()) as T;
}

// ---------------------------------------------------------------------------
// Hooks públicos
// ---------------------------------------------------------------------------

/** Query RAG sync (POST /ai-rag/query). */
export function useAiRagQuery(
  opts: UseAiRagOptions = {},
): UseMutationResult<QueryResponse, Error, QueryRequest> {
  const { apiBaseUrl = '', headers } = opts;
  return useMutation<QueryResponse, Error, QueryRequest>({
    mutationFn: (request) =>
      ragFetch<QueryResponse>(
        apiBaseUrl + '/ai-rag/query',
        { method: 'POST', body: JSON.stringify(request) },
        headers,
      ),
  });
}

/** Ingest doc (POST /ai-rag/ingest). Invalida cache de documents. */
export function useAiRagIngest(
  opts: UseAiRagOptions = {},
): UseMutationResult<IngestResponse, Error, IngestRequest> {
  const { apiBaseUrl = '', headers } = opts;
  const queryClient = useQueryClient();
  return useMutation<IngestResponse, Error, IngestRequest>({
    mutationFn: (request) =>
      ragFetch<IngestResponse>(
        apiBaseUrl + '/ai-rag/ingest',
        { method: 'POST', body: JSON.stringify(request) },
        headers,
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [RAG_QUERY_KEY, 'documents'] });
    },
  });
}

/** Lista documents do tenant atual (GET /ai-rag/documents). */
export function useAiRagDocuments(
  filters?: { status?: string; sourceType?: string },
  opts: UseAiRagOptions = {},
): UseQueryResult<RagDocument[], Error> {
  const { apiBaseUrl = '', headers } = opts;
  const search = new URLSearchParams();
  if (filters?.status) search.set('status', filters.status);
  if (filters?.sourceType) search.set('sourceType', filters.sourceType);
  const qs = search.toString();
  const url = apiBaseUrl + '/ai-rag/documents' + (qs ? '?' + qs : '');
  return useQuery<RagDocument[], Error>({
    queryKey: [RAG_QUERY_KEY, 'documents', filters ?? null],
    queryFn: () => ragFetch<RagDocument[]>(url, { method: 'GET' }, headers),
  });
}
