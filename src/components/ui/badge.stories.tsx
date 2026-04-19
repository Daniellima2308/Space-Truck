import type { Meta, StoryObj } from "@storybook/react-vite";

import { Badge } from "@/components/ui/badge";

const meta = {
  title: "Foundation/Data Display/Badge",
  component: Badge,
  args: {
    children: "Em rota",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof Badge>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Secondary: Story = {
  args: {
    variant: "secondary",
    children: "Rascunho",
  },
};

export const Outline: Story = {
  args: {
    variant: "outline",
    children: "Pendente",
  },
};

export const EmptyState: Story = {
  args: {
    variant: "outline",
    children: "Sem viagens",
  },
};
