'use client';

/**
 * ChatInline — wrapper full-height (não modal).
 *
 * Pra ser embedado em rota dedicada (`/ai-chat`), painel lateral ou seção de
 * dashboard. Layout flex column: header opcional, lista scrollable, input
 * fixo no rodapé.
 */

import { EmptyState, ScrollArea, cn } from '@ethos/ui';
import { useEffect, useRef, type FC, type ReactNode } from 'react';

import { ChatBubble } from './ChatBubble';
import { ChatInput } from './ChatInput';
import { useAiChat, type UseAiChatOptions } from './useAiChat';

export interface ChatInlineProps extends UseAiChatOptions {
  className?: string;
  /** Slot opcional de cabeçalho (título customizado, breadcrumb, ações). */
  header?: ReactNode;
  /** Texto do estado vazio. */
  emptyTitle?: string;
  emptyDescription?: string;
}

export const ChatInline: FC<ChatInlineProps> = ({
  apiBaseUrl,
  conversationId,
  model,
  headers,
  className,
  header,
  emptyTitle = 'Como posso ajudar?',
  emptyDescription = 'Pergunte qualquer coisa para iniciar a conversa.',
}) => {
  const lastMessageRef = useRef<HTMLDivElement | null>(null);
  const chat = useAiChat({ apiBaseUrl, conversationId, model, headers });

  // Auto-scroll para o final a cada nova mensagem ou chunk de stream.
  // scrollIntoView no último elemento porque o Radix ScrollArea gera um
  // viewport interno — scrollTop no div externo não funciona.
  useEffect(() => {
    lastMessageRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [chat.messages]);

  return (
    <div
      className={cn(
        'bg-background flex h-full min-h-[400px] flex-col overflow-hidden rounded-lg border',
        className,
      )}
    >
      {header ? <div className="border-b p-4">{header}</div> : null}

      <ScrollArea className="flex-1">
        <div className="flex flex-col gap-3 p-4">
          {chat.messages.length === 0 ? (
            <EmptyState title={emptyTitle} description={emptyDescription} />
          ) : (
            chat.messages.map((message, idx) => (
              <div
                key={message.id ?? `${message.role}-${idx}`}
                ref={idx === chat.messages.length - 1 ? lastMessageRef : undefined}
              >
                <ChatBubble message={message} />
              </div>
            ))
          )}
          {chat.error ? (
            <p className="text-destructive text-center text-xs" role="alert">
              {chat.error.message}
            </p>
          ) : null}
        </div>
      </ScrollArea>

      <div className="border-t p-3">
        <ChatInput onSend={chat.sendMessage} disabled={chat.isStreaming} />
      </div>
    </div>
  );
};
