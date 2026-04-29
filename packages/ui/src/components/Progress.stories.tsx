import type { Meta, StoryObj } from '@storybook/react';
import { useEffect, useState } from 'react';

import { Progress } from './Progress';

const meta: Meta<typeof Progress> = {
  title: 'Feedback/Progress',
  component: Progress,
  tags: ['autodocs'],
  parameters: { layout: 'centered' },
};

export default meta;
type Story = StoryObj<typeof Progress>;

export const Default: Story = {
  render: () => <Progress value={33} className="w-[320px]" />,
};

export const Animated: Story = {
  render: () => {
    const Demo = () => {
      const [value, setValue] = useState(13);
      useEffect(() => {
        const id = setInterval(() => {
          setValue((prev) => (prev >= 100 ? 0 : prev + 7));
        }, 600);
        return () => clearInterval(id);
      }, []);
      return <Progress value={value} className="w-[320px]" />;
    };
    return <Demo />;
  },
};

export const AtCompletion: Story = {
  render: () => (
    <div className="flex w-[320px] flex-col gap-3">
      <Progress value={0} />
      <Progress value={50} />
      <Progress value={100} />
    </div>
  ),
};
