import type { Meta, StoryObj } from "@storybook/react-vite";

const meta = {
  title: "App Patterns/Actions/Primary CTA",
  tags: ["autodocs"],
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const Idle: Story = {
  render: () => (
    <button
      type="button"
      className="w-full min-h-[44px] gradient-profit text-primary-foreground rounded-xl py-3 font-bold text-sm"
    >
      Iniciar Viagem
    </button>
  ),
};

export const Saving: Story = {
  render: () => (
    <button
      type="button"
      disabled
      aria-busy
      className="w-full min-h-[44px] gradient-profit text-primary-foreground rounded-lg py-2.5 font-bold text-sm disabled:opacity-70"
    >
      Salvando...
    </button>
  ),
};

export const SendMessage: Story = {
  render: () => (
    <button
      type="button"
      className="w-full min-h-[44px] gradient-profit text-primary-foreground rounded-xl py-3 font-bold text-sm disabled:opacity-50"
    >
      Enviar Mensagem
    </button>
  ),
};
