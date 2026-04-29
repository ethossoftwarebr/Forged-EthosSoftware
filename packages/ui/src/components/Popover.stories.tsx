import type { Meta, StoryObj } from '@storybook/react';

import { Button } from './Button';
import { Input } from './Input';
import { Label } from './Label';
import { Popover, PopoverContent, PopoverTrigger } from './Popover';

const meta: Meta<typeof Popover> = {
  title: 'Overlays/Popover',
  component: Popover,
  tags: ['autodocs'],
  parameters: { layout: 'centered' },
};

export default meta;
type Story = StoryObj<typeof Popover>;

export const Default: Story = {
  render: () => (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline">Abrir popover</Button>
      </PopoverTrigger>
      <PopoverContent>
        <div className="space-y-2">
          <h4 className="text-sm font-semibold">Notificacoes</h4>
          <p className="text-muted-foreground text-sm">
            Voce tem 3 notificacoes nao lidas no painel.
          </p>
        </div>
      </PopoverContent>
    </Popover>
  ),
};

export const WithForm: Story = {
  render: () => (
    <Popover>
      <PopoverTrigger asChild>
        <Button>Editar dimensoes</Button>
      </PopoverTrigger>
      <PopoverContent className="w-80">
        <div className="grid gap-3">
          <div className="space-y-1">
            <h4 className="text-sm font-semibold">Dimensoes</h4>
            <p className="text-muted-foreground text-xs">Defina largura e altura do bloco.</p>
          </div>
          <div className="grid gap-2">
            <div className="grid grid-cols-3 items-center gap-2">
              <Label htmlFor="width">Largura</Label>
              <Input id="width" defaultValue="100%" className="col-span-2 h-8" />
            </div>
            <div className="grid grid-cols-3 items-center gap-2">
              <Label htmlFor="height">Altura</Label>
              <Input id="height" defaultValue="320px" className="col-span-2 h-8" />
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  ),
};

export const AlignedEnd: Story = {
  render: () => (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost">Alinhado ao final</Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-56">
        <p className="text-sm">
          Este popover esta alinhado a direita do trigger usando <code>align=&quot;end&quot;</code>.
        </p>
      </PopoverContent>
    </Popover>
  ),
};
