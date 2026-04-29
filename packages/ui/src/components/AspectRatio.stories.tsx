import type { Meta, StoryObj } from '@storybook/react';

import { AspectRatio } from './AspectRatio';

const meta: Meta<typeof AspectRatio> = {
  title: 'Layout/AspectRatio',
  component: AspectRatio,
  tags: ['autodocs'],
  parameters: { layout: 'centered' },
};

export default meta;
type Story = StoryObj<typeof AspectRatio>;

export const SixteenNine: Story = {
  render: () => (
    <div className="w-[480px]">
      <AspectRatio ratio={16 / 9}>
        <div className="bg-muted text-muted-foreground flex h-full w-full items-center justify-center rounded-lg border text-sm">
          16 : 9 — vídeo padrão
        </div>
      </AspectRatio>
    </div>
  ),
};

export const FourThree: Story = {
  render: () => (
    <div className="w-[400px]">
      <AspectRatio ratio={4 / 3}>
        <div className="bg-muted text-muted-foreground flex h-full w-full items-center justify-center rounded-lg border text-sm">
          4 : 3 — foto clássica
        </div>
      </AspectRatio>
    </div>
  ),
};

export const Square: Story = {
  render: () => (
    <div className="w-[320px]">
      <AspectRatio ratio={1}>
        <div className="bg-muted text-muted-foreground flex h-full w-full items-center justify-center rounded-lg border text-sm">
          1 : 1 — quadrado
        </div>
      </AspectRatio>
    </div>
  ),
};
