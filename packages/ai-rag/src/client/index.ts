// @ethos/ai-rag — client barrel
// Importável via `@ethos/ai-rag/client`. Side: React (Next.js compatible).
// V1 sync only — sem SSE, sem ReadableStream (D#14.10).
// AC6: NÃO importa SDK Anthropic/Voyage — só fetch dos endpoints REST.

export {
  useAiRagQuery,
  useAiRagIngest,
  useAiRagDocuments,
  type UseAiRagOptions,
  type RagDocument,
} from './useAiRag';
export { RagSearchInput, type RagSearchInputProps } from './RagSearchInput';

export type {
  IngestRequest,
  IngestResponse,
  QueryRequest,
  QueryResponse,
  Source,
  DocumentStatus,
  DocumentSourceType,
  JobStatus,
} from '../shared';
