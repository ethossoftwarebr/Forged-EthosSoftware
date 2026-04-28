import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';

import { Slider } from './Slider';

const meta: Meta<typeof Slider> = {
  title: 'Forms/Slider',
  component: Slider,
  tags: ['autodocs'],
  parameters: { layout: 'centered' },
};

export default meta;
type Story = StoryObj<typeof Slider>;

export const Default: Story = {
  render: () => (
    <div className="w-[320px]">
      <Slider defaultValue={[40]} max={100} step={1} aria-label="Volume" />
    </div>
  ),
};

export const ControlledSingle: Story = {
  render: () => {
    const ControlledExample = () => {
      const [value, setValue] = useState<number[]>([25]);
      return (
        <div className="w-[320px] space-y-3">
          <Slider value={value} onValueChange={setValue} max={100} step={5} aria-label="Brilho" />
          <p className="text-muted-foreground text-xs">Valor atual: {value[0]}%</p>
        </div>
      );
    };
    return <ControlledExample />;
  },
};

export const Range: Story = {
  render: () => (
    <div className="w-[320px]">
      <Slider defaultValue={[20, 80]} max={100} step={1} aria-label="Faixa de preco" />
    </div>
  ),
};

export const Disabled: Story = {
  render: () => (
    <div className="w-[320px]">
      <Slider defaultValue={[60]} max={100} step={1} disabled aria-label="Slider indisponivel" />
    </div>
  ),
};
