import type { Meta, StoryObj } from '@storybook/react';

import { Button } from './Button';
import { Input } from './Input';
import { Label } from './Label';
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from './Sheet';

const meta: Meta<typeof Sheet> = {
  title: 'Overlays/Sheet',
  component: Sheet,
  tags: ['autodocs'],
  parameters: { layout: 'centered' },
};

export default meta;
type Story = StoryObj<typeof Sheet>;

export const Right: Story = {
  render: () => (
    <Sheet>
      <SheetTrigger asChild>
        <Button>Abrir sheet (direita)</Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Editar perfil</SheetTitle>
          <SheetDescription>
            Atualize as informacoes do seu perfil. Salve quando terminar.
          </SheetDescription>
        </SheetHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-3">
            <Label htmlFor="sheet-name" className="text-right">
              Nome
            </Label>
            <Input id="sheet-name" defaultValue="Maria Silva" className="col-span-3" />
          </div>
          <div className="grid grid-cols-4 items-center gap-3">
            <Label htmlFor="sheet-username" className="text-right">
              Usuario
            </Label>
            <Input id="sheet-username" defaultValue="@maria" className="col-span-3" />
          </div>
        </div>
        <SheetFooter>
          <SheetClose asChild>
            <Button>Salvar</Button>
          </SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  ),
};

export const Left: Story = {
  render: () => (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline">Abrir sheet (esquerda)</Button>
      </SheetTrigger>
      <SheetContent side="left">
        <SheetHeader>
          <SheetTitle>Navegacao</SheetTitle>
          <SheetDescription>Acesse rapidamente as principais secoes.</SheetDescription>
        </SheetHeader>
        <ul className="mt-4 space-y-2 text-sm">
          <li>Dashboard</li>
          <li>Clientes</li>
          <li>Vendas</li>
          <li>Configuracoes</li>
        </ul>
      </SheetContent>
    </Sheet>
  ),
};

export const Bottom: Story = {
  render: () => (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="secondary">Abrir sheet (rodape)</Button>
      </SheetTrigger>
      <SheetContent side="bottom">
        <SheetHeader>
          <SheetTitle>Filtros</SheetTitle>
          <SheetDescription>Refine a lista por status e periodo.</SheetDescription>
        </SheetHeader>
        <p className="text-muted-foreground py-4 text-sm">
          Este sheet desliza a partir do rodape — ideal para filtros rapidos em mobile.
        </p>
      </SheetContent>
    </Sheet>
  ),
};
