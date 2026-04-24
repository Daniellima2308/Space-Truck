import type { Meta, StoryObj } from "@storybook/react-vite";

import { DashboardHistoryPreview } from "@/components/dashboard/DashboardHistoryPreview";
import { Progress } from "@/components/ui/progress";
import { formatNumber } from "@/lib/calculations";
import { FontAwesomeIcon, iconGauge, iconTrash2, iconWrench } from "@/lib/icons";
import type { Vehicle } from "@/types";

const meta = {
  title: "App Patterns/Surfaces/Gradient Surface",
  tags: ["autodocs"],
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const DashboardHistoryEmptyState: Story = {
  render: () => <DashboardHistoryPreview trips={[]} />,
};

export const MaintenanceOdometerCard: Story = {
  render: () => {
    const sampleVehicle: Vehicle = {
      id: "1",
      brand: "Volvo",
      model: "FH",
      year: 2020,
      plate: "ABC-1234",
      operationProfile: "driver_owner",
      currentKm: 540000,
    };

    return (
      <div className="gradient-card rounded-xl p-4 flex items-center gap-3">
        <FontAwesomeIcon icon={iconGauge} className="w-5 h-5 text-profit" />
        <div>
          <p className="text-xs text-muted-foreground">
            {sampleVehicle.brand} {sampleVehicle.model} • Odômetro Atual
          </p>
          <p className="text-lg font-bold font-mono">{formatNumber(sampleVehicle.currentKm)} km</p>
        </div>
      </div>
    );
  },
};

export const MaintenanceServiceCard: Story = {
  render: () => {
    const lastChangeKm = 530000;
    const intervalKm = 10000;
    const currentKm = 539500;
    const kmSince = currentKm - lastChangeKm;
    const kmRemaining = intervalKm - kmSince;
    const isOverdue = kmRemaining <= 0;
    const isWarning = kmRemaining > 0 && kmRemaining <= 500;
    const pct = Math.min(100, (kmSince / intervalKm) * 100);
    const colorClass = isOverdue ? "bg-expense" : isWarning ? "bg-warning" : "bg-profit";

    return (
      <div className="gradient-card rounded-lg p-4 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FontAwesomeIcon icon={iconWrench} className={`w-4 h-4 ${isOverdue ? "text-expense" : isWarning ? "text-warning" : "text-muted-foreground"}`} />
            <span className="text-sm font-semibold">Óleo de Motor</span>
          </div>
          <button
            onClick={() => alert("Excluir serviço?")}
            className="p-1.5 rounded-lg hover:bg-expense/10"
          >
            <FontAwesomeIcon icon={iconTrash2} className="w-3.5 h-3.5 text-expense" />
          </button>
        </div>
        <div className="text-xs text-muted-foreground space-y-0.5">
          <p>Última troca: {formatNumber(lastChangeKm)} km • Intervalo: {formatNumber(intervalKm)} km</p>
          <p className={`font-semibold ${isOverdue ? "text-expense" : isWarning ? "text-warning" : "text-profit"}`}>
            {isOverdue ? `Vencido há ${formatNumber(Math.abs(kmRemaining))} km` : `Faltam ${formatNumber(kmRemaining)} km`}
          </p>
        </div>
        <Progress
          value={pct}
          className={`h-2 [&>div]:${colorClass}`}
        />
      </div>
    );
  },
};
