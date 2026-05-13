import type { Meta, StoryObj } from '@storybook/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { FC, ReactNode } from 'react';

import { ChatWidget } from './ChatWidget';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

const QueryProvider: FC<{ children: ReactNode }> = ({ children }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

const meta: Meta<typeof ChatWidget> = {
  title: 'AI Chat/ChatWidget',
  component: ChatWidget,
  tags: ['autodocs'],
  parameters: { layout: 'fullscreen' },
  decorators: [
    (Story) => (
      <QueryProvider>
        <div className="relative h-screen w-full bg-slate-50">
          <Story />
        </div>
      </QueryProvider>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof ChatWidget>;

export const Default: Story = {
  render: () => <ChatWidget />,
};

export const WithApiBase: Story = {
  render: () => (
    <ChatWidget
      apiBaseUrl="http://localhost:3001"
      dialogTitle="Suporte"
      dialogDescription="Tire suas dúvidas com nosso assistente."
    />
  ),
};

export const CustomLabels: Story = {
  render: () => (
    <ChatWidget
      triggerLabel="Falar com a Ethos"
      dialogTitle="Ethos AI"
      dialogDescription="Chat conectado ao Claude via @ethos/ai-chat."
    />
  ),
};
