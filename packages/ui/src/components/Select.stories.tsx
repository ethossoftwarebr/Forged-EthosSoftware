import type { Meta, StoryObj } from '@storybook/react';

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from './Select';

const meta: Meta<typeof Select> = {
  title: 'Forms/Select',
  component: Select,
  tags: ['autodocs'],
  parameters: { layout: 'centered' },
};

export default meta;
type Story = StoryObj<typeof Select>;

export const Default: Story = {
  render: () => (
    <Select>
      <SelectTrigger className="w-[220px]">
        <SelectValue placeholder="Selecione um plano" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="starter">Starter</SelectItem>
        <SelectItem value="pro">Pro</SelectItem>
        <SelectItem value="enterprise">Enterprise</SelectItem>
      </SelectContent>
    </Select>
  ),
};

export const WithGroups: Story = {
  render: () => (
    <Select>
      <SelectTrigger className="w-[260px]">
        <SelectValue placeholder="Selecione uma cidade" />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectLabel>Sudeste</SelectLabel>
          <SelectItem value="sp">Sao Paulo</SelectItem>
          <SelectItem value="rj">Rio de Janeiro</SelectItem>
          <SelectItem value="bh">Belo Horizonte</SelectItem>
        </SelectGroup>
        <SelectSeparator />
        <SelectGroup>
          <SelectLabel>Sul</SelectLabel>
          <SelectItem value="poa">Porto Alegre</SelectItem>
          <SelectItem value="cwb">Curitiba</SelectItem>
          <SelectItem value="fln">Florianopolis</SelectItem>
        </SelectGroup>
      </SelectContent>
    </Select>
  ),
};

export const Disabled: Story = {
  render: () => (
    <Select disabled>
      <SelectTrigger className="w-[220px]">
        <SelectValue placeholder="Indisponivel" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="a">Opcao A</SelectItem>
      </SelectContent>
    </Select>
  ),
};
