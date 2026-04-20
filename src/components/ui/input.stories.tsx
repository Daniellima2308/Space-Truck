import type { Meta, StoryObj } from "@storybook/react-vite";

import { Input } from "@/components/ui/input";

const meta = {
  title: "Foundation/Forms/Input",
  component: Input,
  args: {
    placeholder: "Digite aqui",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof Input>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Filled: Story = {
  args: {
    defaultValue: "ABC1D23",
  },
};

export const Disabled: Story = {
  args: {
    defaultValue: "123456",
    disabled: true,
  },
};

export const NumericInput: Story = {
  args: {
    type: "number",
    defaultValue: "540000",
    placeholder: "KM atual",
    inputMode: "numeric",
  },
};

export const ErrorHint: Story = {
  render: (args) => {
    const descriptionId = "input-error-hint";

    return (
      <div className="space-y-2">
        <Input {...args} aria-invalid aria-describedby={descriptionId} />
        <p id={descriptionId} className="text-xs text-destructive">
          Valor inválido. Confira os dados informados.
        </p>
      </div>
    );
  },
  args: {
    defaultValue: "12A",
  },
};
