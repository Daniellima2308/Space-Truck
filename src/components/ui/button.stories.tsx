import type { Meta, StoryObj } from "@storybook/react-vite";

import { Button } from "@/components/ui/button";

const LoadingContent = () => (
  <>
    <span
      aria-hidden
      className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
    />
    <span>Salvando...</span>
  </>
);

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
    "aria-busy": true,
    children: <LoadingContent />,
    className: "gap-2",
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
    children: "Indisponível",
  },
};
