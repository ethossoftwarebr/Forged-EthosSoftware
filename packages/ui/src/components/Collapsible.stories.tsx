import type { Meta, StoryObj } from '@storybook/react';
import { ChevronsUpDown } from 'lucide-react';
import { useState } from 'react';

import { Button } from './Button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './Collapsible';

const meta: Meta<typeof Collapsible> = {
  title: 'Layout/Collapsible',
  component: Collapsible,
  tags: ['autodocs'],
  parameters: { layout: 'centered' },
};

export default meta;
type Story = StoryObj<typeof Collapsible>;

export const Default: Story = {
  render: () => (
    <Collapsible className="w-[360px] space-y-2">
      <div className="flex items-center justify-between space-x-4 px-4">
        <h4 className="text-sm font-semibold">@ethos/ui mantém 3 commits</h4>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="icon">
            <ChevronsUpDown className="h-4 w-4" aria-hidden="true" />
            <span className="sr-only">Alternar</span>
          </Button>
        </CollapsibleTrigger>
      </div>
      <div className="rounded-md border px-4 py-3 font-mono text-sm">@radix-ui/react-tabs</div>
      <CollapsibleContent className="space-y-2">
        <div className="rounded-md border px-4 py-3 font-mono text-sm">
          @radix-ui/react-accordion
        </div>
        <div className="rounded-md border px-4 py-3 font-mono text-sm">
          @radix-ui/react-collapsible
        </div>
      </CollapsibleContent>
    </Collapsible>
  ),
};

export const WithRichContent: Story = {
  render: () => (
    <Collapsible className="w-[420px] rounded-md border p-4">
      <CollapsibleTrigger asChild>
        <Button variant="outline" className="w-full justify-between">
          Detalhes da release v1.0.0
          <ChevronsUpDown className="h-4 w-4" aria-hidden="true" />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-3 space-y-2 text-sm">
        <p className="font-medium">Adicionados</p>
        <ul className="text-muted-foreground list-disc space-y-1 pl-5">
          <li>32 primitivos shadcn customizados</li>
          <li>Suporte completo a dark mode</li>
          <li>Storybook 8 com a11y addon</li>
        </ul>
        <p className="font-medium">Removidos</p>
        <ul className="text-muted-foreground list-disc space-y-1 pl-5">
          <li>Dependência de bcrypt no template</li>
        </ul>
      </CollapsibleContent>
    </Collapsible>
  ),
};

export const Controlled: Story = {
  render: function ControlledStory() {
    const [open, setOpen] = useState(false);
    return (
      <div className="w-[360px] space-y-2">
        <div className="text-muted-foreground text-xs">
          Estado externo: <span className="font-mono">{open ? 'aberto' : 'fechado'}</span>
        </div>
        <Collapsible open={open} onOpenChange={setOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="secondary" className="w-full">
              {open ? 'Esconder' : 'Mostrar'} detalhes
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="bg-muted mt-2 rounded-md p-3 text-sm">
            Conteúdo controlado por estado externo via props open/onOpenChange.
          </CollapsibleContent>
        </Collapsible>
      </div>
    );
  },
};
