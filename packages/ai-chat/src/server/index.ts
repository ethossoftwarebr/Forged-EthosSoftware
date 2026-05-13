// @ethos/ai-chat — server barrel
// Importável via `@ethos/ai-chat/server`. Side: NestJS-only (não usar no client).

export { AiChatModule, type AiChatModuleOptions } from './ai-chat.module';
export { AiChatService, AI_CHAT_OPTIONS_TOKEN, type AiChatOptions } from './ai-chat.service';
export { AiChatController } from './ai-chat.controller';
export { ToolsRegistry, AI_CHAT_TOOLS_TOKEN, type AnthropicToolSpec } from './tools.registry';
export { ANTHROPIC_CLIENT_TOKEN, createAnthropicClient } from './anthropic.client';

// Tools demo (opt-in — devs importam por nome)
export { createSearchProductsTool, type SearchProductsResult } from './tools/search-products.tool';
export { createTicketTool, type CreatedTicket } from './tools/create-ticket.tool';

// Re-export types do shared pra consumo direto via './server' (conveniência).
export type {
  ChatRole,
  ChatMessagePayload,
  ToolCall,
  ToolDef,
  StreamEvent,
  ChatRequestBody,
} from '../shared';
