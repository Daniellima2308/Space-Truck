import type { Meta, StoryObj } from "@storybook/react-vite";

import { Input } from "@/components/ui/input";

const meta = {
  title: "Foundation/Forms/Input",
  component: Input,
  args: {
    placeholder: "Digite o KM atual",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof Input>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Filled: Story = {
  args: {
    value: "123456",
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
    value: "123456",
  },
};

export const ErrorHint: Story = {
  render: (args) => (
    <div className="space-y-2">
      <Input {...args} aria-invalid />
      <p className="text-xs text-destructive">KM inválido. Use apenas números.</p>
    </div>
  ),
  args: {
    value: "12A",
  },
};
