'use client';

/**
 * ChatInput — textarea + botão send com handle de Enter / Shift+Enter.
 *
 * Enter envia, Shift+Enter quebra linha. Limpa o textarea após send.
 * Quando `disabled` (streaming), mostra Spinner no botão e bloqueia interação.
 */

import { Button, Spinner, Textarea, cn } from '@ethos/ui';
import { useCallback, useRef, useState, type FC, type KeyboardEvent } from 'react';

export interface ChatInputProps {
  onSend: (text: string) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

export const ChatInput: FC<ChatInputProps> = ({
  onSend,
  disabled = false,
  placeholder = 'Escreva sua mensagem...',
  className,
}) => {
  const [value, setValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const submit = useCallback(() => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue('');
    // Re-focus pro fluxo de conversa contínua.
    textareaRef.current?.focus();
  }, [disabled, onSend, value]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLTextAreaElement>) => {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        submit();
      }
    },
    [submit],
  );

  return (
    <form
      className={cn('flex items-end gap-2', className)}
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        aria-label="Mensagem"
        rows={2}
        disabled={disabled}
        className={cn(
          'max-h-40 min-h-[44px] flex-1 resize-none transition-opacity duration-150 ease-out',
          disabled && 'cursor-not-allowed opacity-60',
        )}
      />
      <Button
        type="submit"
        size="icon"
        aria-label="Enviar mensagem"
        disabled={disabled || !value.trim()}
        className="h-11 w-11 shrink-0"
      >
        {disabled ? (
          <Spinner size="sm" aria-hidden="true" />
        ) : (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-5 w-5"
            aria-hidden="true"
          >
            <path d="M5 12h14" />
            <path d="m12 5 7 7-7 7" />
          </svg>
        )}
      </Button>
    </form>
  );
};
