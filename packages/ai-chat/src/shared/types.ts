import type { ZodType } from 'zod';

/**
 * @ethos/ai-chat — shared types
 *
 * Tipos compartilhados entre server (NestJS) e client (React).
 * Sem dependências de runtime do Anthropic SDK, NestJS ou React — só zod (peer-safe).
 */

export type ChatRole = 'user' | 'assistant' | 'system' | 'tool';

export interface ToolCall {
  id: string;
  name: string;
  input: Record<string, unknown>;
}

export interface ChatMessagePayload {
  id?: string;
  role: ChatRole;
  content: string;
  toolCalls?: ToolCall[];
  toolCallId?: string;
}

export interface ToolDef<TInput = unknown, TOutput = unknown> {
  name: string;
  description: string;
  inputSchema: ZodType<TInput>;
  handler: (input: TInput) => Promise<TOutput> | TOutput;
}

export type StreamEvent =
  | { type: 'text'; delta: string }
  | { type: 'tool_use_start'; name: string; id: string }
  | { type: 'tool_use_input_delta'; id: string; deltaJson: string }
  | { type: 'tool_result'; id: string; output: unknown }
  | { type: 'done'; conversationId: string }
  | { type: 'error'; message: string };

export interface ChatRequestBody {
  conversationId?: string;
  messages: Array<{ role: ChatRole; content: string }>;
  model?: string;
}
