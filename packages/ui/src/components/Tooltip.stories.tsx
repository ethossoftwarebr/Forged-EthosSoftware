import type { Meta, StoryObj } from '@storybook/react';
import { Plus } from 'lucide-react';

import { Button } from './Button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './Tooltip';

const meta: Meta<typeof Tooltip> = {
  title: 'Overlays/Tooltip',
  component: Tooltip,
  tags: ['autodocs'],
  parameters: { layout: 'centered' },
  decorators: [
    (Story) => (
      <TooltipProvider>
        <Story />
      </TooltipProvider>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof Tooltip>;

export const Default: Story = {
  render: () => (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="outline">Hover aqui</Button>
      </TooltipTrigger>
      <TooltipContent>Mensagem de tooltip</TooltipContent>
    </Tooltip>
  ),
};

export const IconButton: Story = {
  render: () => (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button size="icon" variant="outline" aria-label="Adicionar">
          <Plus />
        </Button>
      </TooltipTrigger>
      <TooltipContent>Adicionar novo item</TooltipContent>
    </Tooltip>
  ),
};

export const SideTop: Story = {
  render: () => (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button>Tooltip no topo</Button>
      </TooltipTrigger>
      <TooltipContent side="top">Aparece acima do trigger</TooltipContent>
    </Tooltip>
  ),
};
