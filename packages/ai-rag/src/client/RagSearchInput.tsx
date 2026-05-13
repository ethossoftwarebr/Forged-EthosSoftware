'use client';

/**
 * RagSearchInput — input semântico + lista de fontes citadas.
 *
 * Single-line input + botão de busca; ao submeter, dispara useAiRagQuery
 * e renderiza answer + sources (Card list). Estados: idle, loading, results, error, empty.
 *
 * Identidade Ethos: animações 150ms ease-out, Tailwind only, sem CSS-in-JS.
 */

import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardTitle,
  EmptyState,
  Input,
  Spinner,
  cn,
} from '@ethos/ui';
import { useCallback, useState, type FC, type FormEvent, type ReactNode } from 'react';

import type { QueryResponse, Source } from '../shared';

import { useAiRagQuery, type UseAiRagOptions } from './useAiRag';

export interface RagSearchInputProps extends UseAiRagOptions {
  /** Top-K default. Override por chamada. */
  defaultTopK?: number;
  placeholder?: string;
  /** Render custom da source list. Default: <Card> com snippet + score. */
  renderSource?: (source: Source, index: number) => ReactNode;
  /** Callback invocado após resposta — útil pra analytics/telemetry. */
  onAnswer?: (response: QueryResponse) => void;
  className?: string;
}

export const RagSearchInput: FC<RagSearchInputProps> = ({
  defaultTopK = 5,
  placeholder = 'Buscar nos documentos...',
  renderSource,
  onAnswer,
  className,
  apiBaseUrl,
  headers,
}) => {
  const [value, setValue] = useState('');
  const queryMutation = useAiRagQuery({ apiBaseUrl, headers });

  const submit = useCallback(
    (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const trimmed = value.trim();
      if (!trimmed || queryMutation.isPending) return;
      queryMutation.mutate(
        { question: trimmed, topK: defaultTopK },
        {
          onSuccess: (response) => {
            onAnswer?.(response);
          },
        },
      );
    },
    [defaultTopK, onAnswer, queryMutation, value],
  );

  const response = queryMutation.data;
  const isLoading = queryMutation.isPending;
  const error = queryMutation.error;

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      <form className="flex items-center gap-2" onSubmit={submit}>
        <Input
          type="search"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder}
          disabled={isLoading}
          aria-label="Pergunta"
          className="flex-1 transition-opacity duration-150 ease-out"
        />
        <Button
          type="submit"
          disabled={isLoading || !value.trim()}
          aria-label="Buscar"
          className="shrink-0"
        >
          {isLoading ? <Spinner size="sm" aria-hidden="true" /> : 'Buscar'}
        </Button>
      </form>

      {error && (
        <div
          role="alert"
          className="border-destructive/40 bg-destructive/5 text-destructive rounded-md border px-4 py-2 text-sm"
        >
          {error.message}
        </div>
      )}

      {!error && response && (
        <div className="flex flex-col gap-3">
          <div className="bg-card rounded-md border px-4 py-3 text-sm leading-relaxed">
            {response.answer}
          </div>

          {response.sources.length === 0 ? (
            <EmptyState
              title="Sem fontes"
              description="A resposta foi gerada sem citar nenhum chunk indexado."
            />
          ) : (
            <ul className="flex flex-col gap-2">
              {response.sources.map((source, idx) =>
                renderSource ? (
                  <li key={source.chunkId}>{renderSource(source, idx)}</li>
                ) : (
                  <li key={source.chunkId}>
                    <Card>
                      <CardContent className="p-4">
                        <CardTitle className="text-muted-foreground mb-1 font-mono text-xs">
                          {source.documentId}
                          <span className="ml-2">score {source.score.toFixed(3)}</span>
                        </CardTitle>
                        <CardDescription className="text-sm leading-snug">
                          {source.snippet}
                        </CardDescription>
                      </CardContent>
                    </Card>
                  </li>
                ),
              )}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};
