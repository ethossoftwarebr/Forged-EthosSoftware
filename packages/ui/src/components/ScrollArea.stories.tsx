import type { Meta, StoryObj } from '@storybook/react';

import { ScrollArea, ScrollBar } from './ScrollArea';
import { Separator } from './Separator';

const meta: Meta<typeof ScrollArea> = {
  title: 'Layout/ScrollArea',
  component: ScrollArea,
  tags: ['autodocs'],
  parameters: { layout: 'centered' },
};

export default meta;
type Story = StoryObj<typeof ScrollArea>;

const tags = Array.from({ length: 50 }, (_, i) => `Tag ${i + 1}`);

export const VerticalList: Story = {
  render: () => (
    <ScrollArea className="h-72 w-48 rounded-md border">
      <div className="p-4">
        <h4 className="mb-4 text-sm font-medium leading-none">Tags</h4>
        {tags.map((tag) => (
          <div key={tag}>
            <div className="text-sm">{tag}</div>
            <Separator className="my-2" />
          </div>
        ))}
      </div>
    </ScrollArea>
  ),
};

const works = Array.from({ length: 12 }, (_, i) => ({
  id: i + 1,
  title: `Trabalho ${i + 1}`,
}));

export const Horizontal: Story = {
  render: () => (
    <ScrollArea className="w-96 whitespace-nowrap rounded-md border">
      <div className="flex w-max space-x-4 p-4">
        {works.map((work) => (
          <figure key={work.id} className="shrink-0">
            <div className="bg-muted flex h-32 w-32 items-center justify-center overflow-hidden rounded-md">
              <span className="text-muted-foreground text-xs">{work.title}</span>
            </div>
          </figure>
        ))}
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  ),
};

export const Both: Story = {
  render: () => (
    <ScrollArea className="h-48 w-72 rounded-md border">
      <div className="w-[700px] p-4">
        <h4 className="mb-2 text-sm font-medium">Conteúdo amplo</h4>
        <p className="whitespace-nowrap text-sm">
          Este parágrafo é intencionalmente largo para demonstrar o scroll horizontal junto com o
          vertical. Use as duas barras para navegar pelo conteúdo extra. Ethos Forge cuida da
          rolagem com elegância em viewports apertados.
        </p>
        {Array.from({ length: 20 }, (_, i) => (
          <p key={i} className="text-muted-foreground mt-2 whitespace-nowrap text-xs">
            Linha {i + 1} — texto de demonstração para forçar overflow.
          </p>
        ))}
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  ),
};
