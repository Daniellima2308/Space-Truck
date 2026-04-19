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
    defaultValue: "123456",
  },
};

export const Disabled: Story = {
  args: {
    defaultValue: "123456",
    disabled: true,
  },
};

export const ErrorHint: Story = {
  render: (args) => {
    const descriptionId = "input-error-hint";

    return (
      <div className="space-y-2">
        <Input {...args} aria-invalid aria-describedby={descriptionId} />
        <p id={descriptionId} className="text-xs text-destructive">
          KM inválido. Use apenas números.
        </p>
      </div>
    );
  },
  args: {
    defaultValue: "12A",
  },
};
