import type { Meta, StoryObj } from "@storybook/react-vite";

import { Button } from "@/components/ui/button";

const meta = {
  title: "UI/Button",
  component: Button,
  args: {
    children: "Salvar",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof Button>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Primary: Story = {};

export const Secondary: Story = {
  args: {
    variant: "secondary",
  },
};

export const Destructive: Story = {
  args: {
    variant: "destructive",
    children: "Excluir",
  },
};
