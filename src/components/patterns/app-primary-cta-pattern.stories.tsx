import type { Meta, StoryObj } from "@storybook/react-vite";

import { FontAwesomeIcon, iconLoader2 } from "@/lib/icons";

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

export const Loading: Story = {
  render: () => (
    <button
      type="button"
      disabled
      aria-busy
      className="w-full min-h-[44px] gradient-profit text-primary-foreground rounded-xl py-3 font-bold text-sm disabled:opacity-60 inline-flex items-center justify-center gap-2"
    >
      <FontAwesomeIcon icon={iconLoader2} className="w-4 h-4 animate-spin" />
      Salvando...
    </button>
  ),
};
