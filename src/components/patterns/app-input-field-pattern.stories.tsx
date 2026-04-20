import type { Meta, StoryObj } from "@storybook/react-vite";

const meta = {
  title: "App Patterns/Forms/Input Field",
  tags: ["autodocs"],
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const TextField: Story = {
  render: () => <input className="input-field w-full text-base py-3.5 rounded-xl" placeholder="E-mail" defaultValue="motorista@space.truck" />,
};

export const NumberField: Story = {
  render: () => (
    <input
      className="input-field w-full"
      placeholder="KM Atual do Painel"
      type="number"
      inputMode="numeric"
      defaultValue="540000"
    />
  ),
};
