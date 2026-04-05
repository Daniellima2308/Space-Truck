import { Trip } from "@/types";
import { formatCurrency, getTripGrossRevenue, getTripNetRevenue } from "@/lib/calculations";
import { getCurrentFreight } from "@/lib/freightStatus";
import { FontAwesomeIcon, iconRoute, iconClock3, iconWallet, iconTrendingUp } from "@/lib/icons";

interface OperationQuickStatsProps {
  activeTrips: Trip[];
  todayTrips: Trip[];
}

export function OperationQuickStats({ activeTrips, todayTrips }: OperationQuickStatsProps) {
  const todayRevenue = todayTrips.reduce((s, t) => s + getTripGrossRevenue(t), 0);
  const activeFreightsCount = activeTrips.filter((t) => getCurrentFreight(t) !== null).length;

  // Net revenue across all active trips (operational earnings so far)
  const activeNetRevenue = activeTrips.reduce((sum, t) => sum + getTripNetRevenue(t), 0);

  const stats = [
    {
      icon: iconRoute,
      label: "Ativas",
      value: String(activeTrips.length),
      valueClass: activeTrips.length > 0 ? "text-profit" : "text-foreground",
    },
    {
      icon: iconWallet,
      label: "Hoje",
      value: formatCurrency(todayRevenue),
      valueClass: todayRevenue > 0 ? "text-profit" : "text-foreground",
      mono: true,
    },
    {
      icon: iconClock3,
      label: "Fretes ativos",
      value: String(activeFreightsCount),
      valueClass: activeFreightsCount > 0 ? "text-info" : "text-foreground",
    },
    {
      icon: iconTrendingUp,
      label: "Líquido ativo",
      value: activeTrips.length > 0 ? formatCurrency(activeNetRevenue) : "—",
      valueClass:
        activeTrips.length === 0
          ? "text-foreground"
          : activeNetRevenue >= 0
            ? "text-profit"
            : "text-expense",
      mono: true,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-2.5">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="bg-card border border-border rounded-2xl p-3.5 space-y-1.5"
        >
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <FontAwesomeIcon icon={stat.icon} className="w-3.5 h-3.5" />
            <span className="text-[10px] uppercase tracking-widest font-semibold">{stat.label}</span>
          </div>
          <p className={`text-lg font-black ${stat.mono ? "font-mono" : ""} ${stat.valueClass}`}>
            {stat.value}
          </p>
        </div>
      ))}
    </div>
  );
}
