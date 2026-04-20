import type { Meta, StoryObj } from "@storybook/react-vite";

import { Badge } from "@/components/ui/badge";

const meta = {
  title: "Foundation/Data Display/Badge",
  component: Badge,
  args: {
    children: "Em viagem",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof Badge>;

export default meta;

type Story = StoryObj<typeof meta>;

export const InProgress: Story = {};

export const Planned: Story = {
  args: {
    variant: "secondary",
    children: "Planejado",
  },
};

export const PendingReceipt: Story = {
  args: {
    variant: "outline",
    children: "Canhoto pendente",
  },
};

export const VehicleSelected: Story = {
  args: {
    className: "bg-orange-500/20 text-orange-400 border-orange-500/30 text-[10px] font-bold uppercase",
    children: "Em Viagem",
  },
};
