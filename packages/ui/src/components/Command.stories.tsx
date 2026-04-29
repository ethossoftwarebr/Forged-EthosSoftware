import type { Meta, StoryObj } from '@storybook/react';
import { Calculator, Calendar, Settings, Smile, User, Users } from 'lucide-react';
import { useEffect, useState } from 'react';

import { Button } from './Button';
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from './Command';

const meta: Meta<typeof Command> = {
  title: 'Navigation/Command',
  component: Command,
  tags: ['autodocs'],
  parameters: { layout: 'centered' },
};

export default meta;
type Story = StoryObj<typeof Command>;

export const Default: Story = {
  render: () => (
    <Command className="w-[420px] rounded-lg border shadow-md">
      <CommandInput placeholder="Digite um comando ou busque..." />
      <CommandList>
        <CommandEmpty>Nenhum resultado encontrado.</CommandEmpty>
        <CommandGroup heading="Sugestões">
          <CommandItem>
            <Calendar />
            <span>Calendário</span>
          </CommandItem>
          <CommandItem>
            <Smile />
            <span>Buscar emoji</span>
          </CommandItem>
          <CommandItem>
            <Calculator />
            <span>Calculadora</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </Command>
  ),
};

export const Grouped: Story = {
  render: () => (
    <Command className="w-[460px] rounded-lg border shadow-md">
      <CommandInput placeholder="O que você precisa?" />
      <CommandList>
        <CommandEmpty>Nada por aqui.</CommandEmpty>
        <CommandGroup heading="Navegação">
          <CommandItem>
            <Users />
            <span>Ir para Clientes</span>
            <CommandShortcut>⌘C</CommandShortcut>
          </CommandItem>
          <CommandItem>
            <Calendar />
            <span>Agenda</span>
            <CommandShortcut>⌘A</CommandShortcut>
          </CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Conta">
          <CommandItem>
            <User />
            <span>Perfil</span>
            <CommandShortcut>⌘P</CommandShortcut>
          </CommandItem>
          <CommandItem>
            <Settings />
            <span>Configurações</span>
            <CommandShortcut>⌘,</CommandShortcut>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </Command>
  ),
};

export const DialogVariant: Story = {
  render: () => {
    const Demo = () => {
      const [open, setOpen] = useState(false);

      useEffect(() => {
        const down = (e: KeyboardEvent) => {
          if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            setOpen((prev) => !prev);
          }
        };
        document.addEventListener('keydown', down);
        return () => document.removeEventListener('keydown', down);
      }, []);

      return (
        <div className="flex flex-col items-center gap-3">
          <Button onClick={() => setOpen(true)}>Abrir command palette</Button>
          <p className="text-muted-foreground text-xs">
            Atalho: <kbd className="bg-muted rounded px-1.5 py-0.5">⌘K</kbd>
          </p>
          <CommandDialog open={open} onOpenChange={setOpen}>
            <CommandInput placeholder="Digite um comando..." />
            <CommandList>
              <CommandEmpty>Nenhum resultado.</CommandEmpty>
              <CommandGroup heading="Ações rápidas">
                <CommandItem onSelect={() => setOpen(false)}>
                  <Users />
                  <span>Novo cliente</span>
                </CommandItem>
                <CommandItem onSelect={() => setOpen(false)}>
                  <Calendar />
                  <span>Novo evento</span>
                </CommandItem>
                <CommandItem onSelect={() => setOpen(false)}>
                  <Settings />
                  <span>Configurações</span>
                </CommandItem>
              </CommandGroup>
            </CommandList>
          </CommandDialog>
        </div>
      );
    };
    return <Demo />;
  },
};
