import type { Meta, StoryObj } from '@storybook/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { FC, ReactNode } from 'react';

import type { QueryResponse } from '../shared';

import { RagSearchInput } from './RagSearchInput';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } },
});

const QueryProvider: FC<{ children: ReactNode }> = ({ children }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

const meta: Meta<typeof RagSearchInput> = {
  title: 'AI RAG/RagSearchInput',
  component: RagSearchInput,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <QueryProvider>
        <div className="mx-auto w-full max-w-2xl p-6">
          <Story />
        </div>
      </QueryProvider>
    ),
  ],
};
export default meta;

type Story = StoryObj<typeof RagSearchInput>;

export const Default: Story = {
  args: { placeholder: 'Buscar nos documentos...' },
};

export const Loading: Story = {
  render: () => {
    // Mock por interceptar fetch global pra simular delay infinito.
    // Storybook isolado: cada story tem seu mock.
    if (typeof window !== 'undefined') {
      (window as unknown as { fetch: typeof fetch }).fetch = () =>
        new Promise(() => {}) as Promise<Response>;
    }
    return <RagSearchInput placeholder="Loading state (mocked fetch)" />;
  },
};

export const WithResults: Story = {
  render: () => {
    const mockResponse: QueryResponse = {
      answer:
        'Os documentos indicam que o produto foi lançado em 2026 com foco em automação multi-tenant. Métricas iniciais sugerem 30% de redução no tempo de onboarding.',
      sources: [
        {
          documentId: 'doc_acme_handbook',
          chunkId: 'chunk_1',
          score: 0.92,
          snippet:
            'Lançado em Q1 2026, o produto integra automação multi-tenant via AsyncLocalStorage e propaga tenantId em toda stack...',
        },
        {
          documentId: 'doc_acme_metrics',
          chunkId: 'chunk_4',
          score: 0.81,
          snippet:
            'Métricas dos primeiros 90 dias mostram redução de 30% no tempo médio de onboarding comparado ao processo anterior...',
        },
        {
          documentId: 'doc_acme_releasenotes',
          chunkId: 'chunk_2',
          score: 0.76,
          snippet:
            'Release notes 2026-Q1: novos endpoints multi-tenant, hardening de auth com argon2id + EdDSA, e factory de embedders pluggable...',
        },
      ],
    };
    if (typeof window !== 'undefined') {
      (window as unknown as { fetch: typeof fetch }).fetch = () =>
        Promise.resolve(
          new Response(JSON.stringify(mockResponse), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }),
        );
    }
    return <RagSearchInput placeholder="Type and submit (returns mock)" />;
  },
};

export const Empty: Story = {
  render: () => {
    const mockResponse: QueryResponse = {
      answer: 'Não encontrei informações relevantes nos documentos indexados pra essa pergunta.',
      sources: [],
    };
    if (typeof window !== 'undefined') {
      (window as unknown as { fetch: typeof fetch }).fetch = () =>
        Promise.resolve(
          new Response(JSON.stringify(mockResponse), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }),
        );
    }
    return <RagSearchInput placeholder="Empty sources (mocked)" />;
  },
};
