// @ethos/ai-chat — client barrel
// Importável via `@ethos/ai-chat/client`. Side: React (Next.js compatible).
// Side-channel: NÃO importa o SDK Anthropic nem usa segredos (AC6).
// Streaming: fetch + ReadableStream (NÃO EventSource — D#13.8).

export { useAiChat, type UseAiChatOptions, type UseAiChatReturn } from './useAiChat';
export { ChatWidget, type ChatWidgetProps } from './ChatWidget';
export { ChatInline, type ChatInlineProps } from './ChatInline';
export { ChatBubble, type ChatBubbleProps } from './ChatBubble';
export { ChatInput, type ChatInputProps } from './ChatInput';

export type {
  ChatMessagePayload,
  ChatRole,
  StreamEvent,
  ChatRequestBody,
  ToolCall,
} from '../shared';
