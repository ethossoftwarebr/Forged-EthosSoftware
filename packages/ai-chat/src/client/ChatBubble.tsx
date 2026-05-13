'use client';

/**
 * ChatBubble — renderiza UMA mensagem (user/assistant/tool/system).
 *
 * Layout:
 *  - user: bolha à direita, bg-primary, rounded-tr-sm (cantinho)
 *  - assistant: bolha à esquerda, bg-muted, rounded-tl-sm
 *  - tool: card cinza compacto com "Tool: <name>"
 *  - system: texto muted centralizado
 *
 * Markdown simples: apenas line breaks (não renderiza ** ou _) — proposital,
 * evita dep pesada de markdown parser. Devs que precisarem podem montar
 * wrapper custom passando seus próprios elementos.
 */

import { Card, CardContent, cn } from '@ethos/ui';
import { type FC } from 'react';

import type { ChatMessagePayload } from '../shared';

export interface ChatBubbleProps {
  message: ChatMessagePayload;
  className?: string;
}

function renderContent(content: string): JSX.Element[] {
  return content.split('\n').map((line, idx) => (
    <p key={idx} className={cn('whitespace-pre-wrap break-words', line === '' && 'h-3')}>
      {line}
    </p>
  ));
}

export const ChatBubble: FC<ChatBubbleProps> = ({ message, className }) => {
  if (message.role === 'system') {
    return (
      <div
        className={cn('text-muted-foreground py-2 text-center text-xs italic', className)}
        role="status"
      >
        {message.content}
      </div>
    );
  }

  if (message.role === 'tool') {
    return (
      <Card
        className={cn('bg-muted/40 my-2 w-full max-w-[80%] self-start border-dashed', className)}
      >
        <CardContent className="px-3 py-2 text-xs">
          <div className="text-muted-foreground mb-1 font-medium uppercase tracking-wide">
            Tool result
          </div>
          <pre className="text-foreground/80 max-h-40 overflow-auto whitespace-pre-wrap break-words text-xs">
            {message.content}
          </pre>
        </CardContent>
      </Card>
    );
  }

  const isUser = message.role === 'user';

  return (
    <div
      className={cn(
        'flex w-full',
        isUser ? 'justify-end' : 'justify-start',
        'animate-in fade-in-0 slide-in-from-bottom-1 duration-150 ease-out',
        className,
      )}
    >
      <div
        className={cn(
          'max-w-[80%] rounded-2xl px-3 py-2 text-sm',
          isUser
            ? 'bg-primary text-primary-foreground rounded-tr-sm'
            : 'bg-muted text-foreground rounded-tl-sm',
        )}
      >
        {message.content ? (
          <div className="space-y-1">{renderContent(message.content)}</div>
        ) : (
          <span className="text-muted-foreground inline-flex gap-1">
            <span className="bg-foreground/40 inline-block h-1.5 w-1.5 animate-pulse rounded-full" />
            <span
              className="bg-foreground/40 inline-block h-1.5 w-1.5 animate-pulse rounded-full"
              style={{ animationDelay: '150ms' }}
            />
            <span
              className="bg-foreground/40 inline-block h-1.5 w-1.5 animate-pulse rounded-full"
              style={{ animationDelay: '300ms' }}
            />
          </span>
        )}
        {message.toolCalls && message.toolCalls.length > 0 ? (
          <div className="mt-2 flex flex-wrap gap-1">
            {message.toolCalls.map((tc) => (
              <span
                key={tc.id}
                className={cn(
                  'rounded-full px-2 py-0.5 text-xs',
                  isUser ? 'bg-primary-foreground/15' : 'bg-background border',
                )}
              >
                <span className="opacity-70">tool: </span>
                <span className="font-medium">{tc.name}</span>
              </span>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
};
