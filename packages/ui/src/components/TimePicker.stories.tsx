import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';

import { Label } from './Label';
import { TimePicker } from './TimePicker';

const meta: Meta<typeof TimePicker> = {
  title: 'Forms/TimePicker',
  component: TimePicker,
  tags: ['autodocs'],
  parameters: { layout: 'centered' },
};

export default meta;
type Story = StoryObj<typeof TimePicker>;

export const Default: Story = {
  render: () => {
    const Example = () => {
      const [value, setValue] = useState('');
      return <TimePicker value={value} onChange={setValue} aria-label="Horario" />;
    };
    return <Example />;
  },
};

export const WithLabel: Story = {
  render: () => {
    const Example = () => {
      const [value, setValue] = useState('09:30');
      return (
        <div className="space-y-2">
          <Label htmlFor="tp-meeting">Inicio da reuniao</Label>
          <TimePicker id="tp-meeting" value={value} onChange={setValue} />
        </div>
      );
    };
    return <Example />;
  },
};

export const Prefilled: Story = {
  render: () => {
    const Example = () => {
      const [value, setValue] = useState('14:45');
      return (
        <div className="space-y-2">
          <TimePicker value={value} onChange={setValue} aria-label="Horario pre-preenchido" />
          <p className="text-muted-foreground text-xs">Valor: {value || '(vazio)'}</p>
        </div>
      );
    };
    return <Example />;
  },
};

export const Disabled: Story = {
  render: () => <TimePicker defaultValue="08:00" disabled aria-label="Horario travado" />,
};
