'use client';

/**
 * ChatWidget — botão flutuante bottom-right + Dialog modal.
 *
 * Pluggable: o consumidor monta `<ChatWidget apiBaseUrl="..." />` em qualquer
 * layout. Não precisa de provider próprio além do `QueryClientProvider` do
 * TanStack Query (responsabilidade do app host — documentado no README W4).
 */

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  EmptyState,
  ScrollArea,
  cn,
} from '@ethos/ui';
import { useEffect, useRef, useState, type FC } from 'react';

import { ChatBubble } from './ChatBubble';
import { ChatInput } from './ChatInput';
import { useAiChat, type UseAiChatOptions } from './useAiChat';

export interface ChatWidgetProps extends UseAiChatOptions {
  className?: string;
  triggerLabel?: string;
  dialogTitle?: string;
  dialogDescription?: string;
}

const ChatBubbleIcon: FC<{ className?: string }> = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);

export const ChatWidget: FC<ChatWidgetProps> = ({
  apiBaseUrl,
  conversationId,
  model,
  headers,
  className,
  triggerLabel = 'Assistente',
  dialogTitle = 'Assistente',
  dialogDescription,
}) => {
  const [open, setOpen] = useState(false);
  const lastMessageRef = useRef<HTMLDivElement | null>(null);

  const chat = useAiChat({ apiBaseUrl, conversationId, model, headers });

  // Auto-scroll para o final a cada nova mensagem ou chunk de stream.
  // scrollIntoView no último elemento porque o Radix ScrollArea gera um
  // viewport interno — scrollTop no div externo não funciona.
  useEffect(() => {
    if (!open) return;
    lastMessageRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [open, chat.messages]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={triggerLabel}
        className={cn(
          'fixed bottom-6 right-6 z-50 inline-flex h-14 w-14 items-center justify-center rounded-full shadow-lg',
          'bg-primary text-primary-foreground',
          'transition-all duration-150 ease-out hover:scale-105 hover:shadow-xl',
          'focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
          className,
        )}
      >
        <ChatBubbleIcon className="h-6 w-6" />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="flex h-[600px] max-h-[90vh] w-full max-w-lg flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
          <DialogHeader className="border-b p-4">
            <DialogTitle>{dialogTitle}</DialogTitle>
            {dialogDescription ? <DialogDescription>{dialogDescription}</DialogDescription> : null}
          </DialogHeader>

          <ScrollArea className="flex-1">
            <div className="flex flex-col gap-3 p-4">
              {chat.messages.length === 0 ? (
                <EmptyState
                  title="Como posso ajudar?"
                  description="Pergunte qualquer coisa para iniciar a conversa."
                  icon={<ChatBubbleIcon className="h-6 w-6" />}
                />
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
        </DialogContent>
      </Dialog>
    </>
  );
};
