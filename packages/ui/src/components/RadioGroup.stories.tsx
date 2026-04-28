import type { Meta, StoryObj } from '@storybook/react';

import { Label } from './Label';
import { RadioGroup, RadioGroupItem } from './RadioGroup';

const meta: Meta<typeof RadioGroup> = {
  title: 'Forms/RadioGroup',
  component: RadioGroup,
  tags: ['autodocs'],
  parameters: { layout: 'centered' },
};

export default meta;
type Story = StoryObj<typeof RadioGroup>;

export const Default: Story = {
  render: () => (
    <RadioGroup defaultValue="card">
      <div className="flex items-center gap-2">
        <RadioGroupItem id="rg-card" value="card" />
        <Label htmlFor="rg-card">Cartao de credito</Label>
      </div>
      <div className="flex items-center gap-2">
        <RadioGroupItem id="rg-pix" value="pix" />
        <Label htmlFor="rg-pix">Pix</Label>
      </div>
      <div className="flex items-center gap-2">
        <RadioGroupItem id="rg-boleto" value="boleto" />
        <Label htmlFor="rg-boleto">Boleto</Label>
      </div>
    </RadioGroup>
  ),
};

export const Horizontal: Story = {
  render: () => (
    <RadioGroup defaultValue="m" className="flex gap-4">
      {['p', 'm', 'g', 'gg'].map((size) => (
        <div key={size} className="flex items-center gap-2">
          <RadioGroupItem id={`rg-size-${size}`} value={size} />
          <Label htmlFor={`rg-size-${size}`}>{size.toUpperCase()}</Label>
        </div>
      ))}
    </RadioGroup>
  ),
};

export const WithDisabledItem: Story = {
  render: () => (
    <RadioGroup defaultValue="standard">
      <div className="flex items-center gap-2">
        <RadioGroupItem id="rg-standard" value="standard" />
        <Label htmlFor="rg-standard">Standard</Label>
      </div>
      <div className="flex items-center gap-2">
        <RadioGroupItem id="rg-priority" value="priority" disabled />
        <Label htmlFor="rg-priority">Priority (indisponivel)</Label>
      </div>
    </RadioGroup>
  ),
};
