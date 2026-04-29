import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';

import {
  ContextMenu,
  ContextMenuCheckboxItem,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuRadioGroup,
  ContextMenuRadioItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from './ContextMenu';

const triggerClass =
  'border-border bg-card text-muted-foreground flex h-32 w-72 items-center justify-center rounded-md border border-dashed text-sm';

const meta: Meta<typeof ContextMenu> = {
  title: 'Overlays/ContextMenu',
  component: ContextMenu,
  tags: ['autodocs'],
  parameters: { layout: 'centered' },
};

export default meta;
type Story = StoryObj<typeof ContextMenu>;

export const Default: Story = {
  render: () => (
    <ContextMenu>
      <ContextMenuTrigger className={triggerClass}>
        Clique com botao direito aqui
      </ContextMenuTrigger>
      <ContextMenuContent className="w-56">
        <ContextMenuItem>
          Voltar <ContextMenuShortcut>Alt+&larr;</ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuItem>
          Avancar <ContextMenuShortcut>Alt+&rarr;</ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuItem>Recarregar</ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem>Salvar pagina</ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  ),
};

export const WithCheckbox: Story = {
  render: function WithCheckboxRender() {
    const [bookmarks, setBookmarks] = useState(true);
    const [urls, setUrls] = useState(false);
    return (
      <ContextMenu>
        <ContextMenuTrigger className={triggerClass}>Clique direito</ContextMenuTrigger>
        <ContextMenuContent className="w-56">
          <ContextMenuLabel>Aparencia</ContextMenuLabel>
          <ContextMenuSeparator />
          <ContextMenuCheckboxItem checked={bookmarks} onCheckedChange={setBookmarks}>
            Mostrar favoritos
          </ContextMenuCheckboxItem>
          <ContextMenuCheckboxItem checked={urls} onCheckedChange={setUrls}>
            Mostrar URLs completas
          </ContextMenuCheckboxItem>
        </ContextMenuContent>
      </ContextMenu>
    );
  },
};

export const WithSubmenuAndRadio: Story = {
  render: function WithSubmenuRender() {
    const [people, setPeople] = useState('joao');
    return (
      <ContextMenu>
        <ContextMenuTrigger className={triggerClass}>Clique direito</ContextMenuTrigger>
        <ContextMenuContent className="w-56">
          <ContextMenuLabel>Atribuir a</ContextMenuLabel>
          <ContextMenuRadioGroup value={people} onValueChange={setPeople}>
            <ContextMenuRadioItem value="joao">Joao</ContextMenuRadioItem>
            <ContextMenuRadioItem value="maria">Maria</ContextMenuRadioItem>
            <ContextMenuRadioItem value="pedro">Pedro</ContextMenuRadioItem>
          </ContextMenuRadioGroup>
          <ContextMenuSeparator />
          <ContextMenuSub>
            <ContextMenuSubTrigger>Mais ferramentas</ContextMenuSubTrigger>
            <ContextMenuSubContent>
              <ContextMenuItem>Imprimir</ContextMenuItem>
              <ContextMenuItem>Lancar arquivo</ContextMenuItem>
              <ContextMenuItem>Inspecionar</ContextMenuItem>
            </ContextMenuSubContent>
          </ContextMenuSub>
        </ContextMenuContent>
      </ContextMenu>
    );
  },
};
