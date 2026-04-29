import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { enUS } from 'react-day-picker/locale';

import { DatePicker } from './DatePicker';

const meta: Meta<typeof DatePicker> = {
  title: 'Forms/DatePicker',
  component: DatePicker,
  tags: ['autodocs'],
  parameters: { layout: 'centered' },
};

export default meta;
type Story = StoryObj<typeof DatePicker>;

export const Default: Story = {
  render: function DefaultRender() {
    const [date, setDate] = useState<Date | undefined>(undefined);
    return <DatePicker value={date} onChange={setDate} />;
  },
};

export const WithInitialValue: Story = {
  render: function WithInitialValueRender() {
    const [date, setDate] = useState<Date | undefined>(new Date(2026, 3, 28));
    return <DatePicker value={date} onChange={setDate} />;
  },
};

export const Disabled: Story = {
  render: () => <DatePicker disabled placeholder="Indisponivel" />,
};

export const EnglishLocale: Story = {
  render: function EnglishLocaleRender() {
    const [date, setDate] = useState<Date | undefined>(undefined);
    return <DatePicker value={date} onChange={setDate} locale={enUS} placeholder="Pick a date" />;
  },
};
