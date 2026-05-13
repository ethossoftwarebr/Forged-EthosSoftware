import type { Meta, StoryObj } from '@storybook/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { FC, ReactNode } from 'react';

import { ChatInline } from './ChatInline';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

const QueryProvider: FC<{ children: ReactNode }> = ({ children }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

const meta: Meta<typeof ChatInline> = {
  title: 'AI Chat/ChatInline',
  component: ChatInline,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <QueryProvider>
        <div className="h-[500px] w-full max-w-2xl">
          <Story />
        </div>
      </QueryProvider>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof ChatInline>;

export const Default: Story = {
  render: () => <ChatInline />,
};

export const WithHeader: Story = {
  render: () => (
    <ChatInline
      header={
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold">Conversa #42</h2>
            <p className="text-muted-foreground text-xs">Iniciada há 2 minutos</p>
          </div>
          <span className="bg-success/10 text-success rounded-full px-2 py-1 text-xs">Online</span>
        </div>
      }
    />
  ),
};

export const WithApiBase: Story = {
  render: () => <ChatInline apiBaseUrl="http://localhost:3001" />,
};
