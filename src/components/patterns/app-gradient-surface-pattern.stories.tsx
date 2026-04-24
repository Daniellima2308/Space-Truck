import type { Meta, StoryObj } from "@storybook/react-vite";

import { FontAwesomeIcon, iconGauge, iconPlus, iconWrench } from "@/lib/icons";

const meta = {
  title: "App Patterns/Surfaces/Gradient Surface",
  tags: ["autodocs"],
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const DashboardHistoryEmptyState: Story = {
  render: () => (
    <div className="gradient-card rounded-xl p-5 text-center space-y-3">
      <p className="text-sm font-medium">Nenhuma viagem finalizada ainda</p>
      <p className="text-xs text-muted-foreground">
        Ao finalizar sua primeira viagem ela aparecerá aqui.
      </p>
      <button
        type="button"
        className="mx-auto flex items-center gap-1.5 px-4 py-2 rounded-lg bg-profit/10 text-profit hover:bg-profit/20 transition-colors text-xs font-bold"
      >
        <FontAwesomeIcon icon={iconPlus} className="w-3.5 h-3.5" /> Iniciar primeira viagem
      </button>
    </div>
  ),
};

export const MaintenanceOdometerCard: Story = {
  render: () => (
    <div className="gradient-card rounded-xl p-4 flex items-center gap-3">
      <FontAwesomeIcon icon={iconGauge} className="w-5 h-5 text-profit" />
      <div>
        <p className="text-xs text-muted-foreground">
          Volvo FH • Odômetro Atual
        </p>
        <p className="text-lg font-bold font-mono">540.000 km</p>
      </div>
    </div>
  ),
};

export const MaintenanceServiceCard: Story = {
  render: () => (
    <div className="gradient-card rounded-lg p-4 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FontAwesomeIcon icon={iconWrench} className="w-4 h-4 text-warning" />
          <span className="text-sm font-semibold">Óleo de Motor</span>
        </div>
      </div>
      <div className="text-xs text-muted-foreground space-y-0.5">
        <p>Última troca: 530.000 km • Intervalo: 10.000 km</p>
        <p className="font-semibold text-warning">Faltam 500 km</p>
      </div>
      <div className="w-full bg-secondary rounded-full h-2">
        <div className="h-2 rounded-full transition-all bg-warning" style={{ width: "95%" }} />
      </div>
    </div>
  ),
};
