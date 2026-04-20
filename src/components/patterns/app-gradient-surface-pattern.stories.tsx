import type { Meta, StoryObj } from "@storybook/react-vite";

const meta = {
  title: "App Patterns/Surfaces/Gradient Surface",
  tags: ["autodocs"],
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const TripHistoryRow: Story = {
  render: () => (
    <div className="gradient-card rounded-lg p-4 flex items-center justify-between">
      <div>
        <p className="text-sm font-medium">ABC1D23 • Volvo FH → Curitiba</p>
        <p className="text-xs text-muted-foreground">20/04/2026</p>
      </div>
      <span className="text-sm font-bold font-mono text-profit">R$ 2.450,00</span>
    </div>
  ),
};

export const EmptyStateBlock: Story = {
  render: () => (
    <div className="gradient-card rounded-xl p-5 text-center space-y-3">
      <p className="text-sm font-medium">Nenhuma viagem finalizada ainda</p>
      <p className="text-xs text-muted-foreground">Ao finalizar sua primeira viagem ela aparecerá aqui.</p>
    </div>
  ),
};
