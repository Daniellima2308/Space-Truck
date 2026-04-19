import type { Meta, StoryObj } from "@storybook/react-vite";

import { Button } from "@/components/ui/button";

const meta = {
  title: "Foundation/Controls/Button",
  component: Button,
  args: {
    children: "Salvar alteração",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof Button>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Primary: Story = {};

export const Secondary: Story = {
  args: {
    variant: "secondary",
    children: "Voltar",
  },
};

export const Destructive: Story = {
  args: {
    variant: "destructive",
    children: "Excluir",
  },
};

export const Loading: Story = {
  args: {
    disabled: true,
    children: "Salvando...",
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
    children: "Indisponível",
  },
};
