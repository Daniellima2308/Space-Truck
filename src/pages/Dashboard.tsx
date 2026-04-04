import { useState, useMemo } from "react";
import { useApp } from "@/context/app-context";
import { SummaryCards } from "@/components/SummaryCards";
import { ActiveTripCard } from "@/components/ActiveTripCard";
import { PeriodFilter } from "@/components/PeriodFilter";
import { MaintenanceAlerts } from "@/components/MaintenanceAlerts";
import { NotificationPrompt } from "@/components/NotificationPrompt";
import { ConnectionIndicator } from "@/components/ConnectionIndicator";
import { HomeHero, type HomeHeroScenario } from "@/components/dashboard/HomeHero";
import { DashboardHistoryPreview } from "@/components/dashboard/DashboardHistoryPreview";
import { getTripGrossRevenue, getTripTotalCommissions, getTripTotalExpenses, getTripNetRevenue } from "@/lib/calculations";
import { getMaintenanceAlerts } from "@/lib/maintenance";
import { Trip } from "@/types";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useNavigate } from "react-router-dom";
import { exportMultipleTripsPdf } from "@/lib/exportPdf";
import { useBrandAsset } from "@/hooks/use-brand-asset";
import { FontAwesomeIcon, iconFileDown } from "@/lib/icons";

function filterTripsByPeriod(trips: Trip[], period: string): Trip[] {
  if (period === "all") return trips;
  const now = new Date();
  const start = new Date();
  switch (period) {
    case "today": start.setHours(0, 0, 0, 0); break;
    case "week": start.setDate(now.getDate() - 7); break;
    case "month": start.setMonth(now.getMonth() - 1); break;
    case "year": start.setFullYear(now.getFullYear() - 1); break;
  }
  return trips.filter((t) => new Date(t.createdAt) >= start);
}

const HISTORY_PREVIEW_LIMIT = 3;

const PERIOD_LABELS: Record<string, string> = {
  all: "todos os períodos",
  today: "hoje",
  week: "esta semana",
  month: "este mês",
  year: "este ano",
};

// Display labels for PDF export and tooltips (title case)
const PERIOD_DISPLAY: Record<string, string> = {
  all: "Todos os Períodos",
  today: "Hoje",
  week: "Esta Semana",
  month: "Este Mês",
  year: "Este Ano",
};

const Dashboard = () => {
  const { data, loading } = useApp();
  const wordmarkSrc = useBrandAsset("wordmarkHorizontal");
  const [period, setPeriod] = useState("month");
  const [selectedVehicleId, setSelectedVehicleId] = useState("all");
  const navigate = useNavigate();

  const vehicleFilteredTrips = useMemo(() => {
    if (selectedVehicleId === "all") return data.trips;
    return data.trips.filter(t => t.vehicleId === selectedVehicleId);
  }, [data.trips, selectedVehicleId]);

  // Period-filtered trips feed the executive summary cards
  const filteredTrips = useMemo(
    () => filterTripsByPeriod(vehicleFilteredTrips, period),
    [vehicleFilteredTrips, period]
  );
  const maintenanceAlerts = useMemo(
    () => getMaintenanceAlerts(data.vehicles, data.maintenanceServices),
    [data.vehicles, data.maintenanceServices]
  );

  const grossRevenue = filteredTrips.reduce((s, t) => s + getTripGrossRevenue(t), 0);
  const totalCommissions = filteredTrips.reduce((s, t) => s + getTripTotalCommissions(t), 0);
  const totalExpenses = filteredTrips.reduce((s, t) => s + getTripTotalExpenses(t), 0);
  const netRevenue = filteredTrips.reduce((s, t) => s + getTripNetRevenue(t), 0);

  // Active trips are shown regardless of period filter
  const activeTrips = useMemo(
    () => vehicleFilteredTrips.filter(t => t.status === "open"),
    [vehicleFilteredTrips]
  );

  // History preview: last N finished trips sorted by most recent (not period-filtered)
  const historyPreview = useMemo(() => {
    const finished = vehicleFilteredTrips
      .filter(t => t.status === "finished")
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return finished.slice(0, HISTORY_PREVIEW_LIMIT);
  }, [vehicleFilteredTrips]);

  // Scenario flags
  const hasVehicles = data.vehicles.length > 0;
  const hasActiveTrip = activeTrips.length > 0;
  const hasHistory = historyPreview.length > 0;
  const hasPeriodResults = filteredTrips.length > 0;

  // Hero scenario
  const heroScenario: HomeHeroScenario = !hasVehicles
    ? "onboarding"
    : hasActiveTrip
    ? "active"
    : hasHistory
    ? "ready-return"
    : "ready-first";

  // Contextual CTA handler — label/icon are owned by HERO_CONTENT per scenario
  const handleCta = () => {
    if (!hasVehicles) { navigate("/vehicles"); return; }
    if (hasActiveTrip) { navigate("/operation"); return; }
    navigate("/new-trip", {
      state: { preSelectedVehicleId: selectedVehicleId !== "all" ? selectedVehicleId : undefined },
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Institutional header */}
      <header className="px-4 pt-6 pb-2">
        <div className="flex items-center justify-between">
          <img src={wordmarkSrc} alt="Space Truck" className="h-7 w-auto" />
          <ConnectionIndicator />
        </div>
      </header>

      <div className="px-4 space-y-5 pt-1">

        {/* Attention zone: notifications + maintenance alerts */}
        <div className="space-y-2">
          <NotificationPrompt />
          <MaintenanceAlerts alerts={maintenanceAlerts} />
        </div>

        {/* ── Hero: contextual main block ── */}
        <HomeHero
          scenario={heroScenario}
          activeTripsCount={activeTrips.length}
          onCta={handleCta}
        />

        {/* ── Active trips detail (Scenario B) ── */}
        {hasVehicles && hasActiveTrip && (
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-profit animate-pulse-glow" />
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest">
                Operação em andamento
              </h2>
            </div>
            {activeTrips.map(trip => (
              <ActiveTripCard key={trip.id} trip={trip} />
            ))}
          </section>
        )}

        {/* ── Analysis section: filters + summary ── */}
        {hasVehicles && (
          <section className="space-y-4">
            <div className="flex items-center gap-2 pt-1">
              <div className="flex-1 h-px bg-border/50" />
              <span className="text-xs text-muted-foreground font-medium uppercase tracking-widest px-2">
                Resumo
              </span>
              <div className="flex-1 h-px bg-border/50" />
            </div>

            {/* Filters: vehicle selector + period + PDF */}
            <div className="space-y-2">
              {data.vehicles.length >= 2 && (
                <Select value={selectedVehicleId} onValueChange={setSelectedVehicleId}>
                  <SelectTrigger className="w-full bg-secondary border-none text-sm h-[42px]">
                    <SelectValue placeholder="Todos os Veículos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os Veículos</SelectItem>
                    {data.vehicles.map(v => (
                      <SelectItem key={v.id} value={v.id}>
                        {v.plate} • {v.brand} {v.model}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <PeriodFilter value={period} onChange={setPeriod} />
                </div>
                {hasPeriodResults && (
                  <button
                    onClick={() =>
                      exportMultipleTripsPdf(
                        filteredTrips,
                        data.vehicles,
                        PERIOD_DISPLAY[period] || period
                      )
                    }
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-profit/10 text-profit hover:bg-profit/20 transition-colors text-xs font-bold whitespace-nowrap"
                    title={`Exportar relatório — ${PERIOD_DISPLAY[period] || period}`}
                  >
                    <FontAwesomeIcon icon={iconFileDown} className="w-4 h-4" /> PDF
                  </button>
                )}
              </div>
            </div>

            {/* Executive summary cards */}
            <SummaryCards
              grossRevenue={grossRevenue}
              netRevenue={netRevenue}
              totalExpenses={totalExpenses}
              totalCommissions={totalCommissions}
            />

            {/* Period empty state: vehicles exist but no trips in selected period */}
            {!hasPeriodResults && (
              <div className="gradient-card rounded-xl p-5 text-center space-y-2">
                <p className="text-sm font-medium">
                  Nenhuma viagem {PERIOD_LABELS[period] || "neste período"}
                </p>
                <p className="text-xs text-muted-foreground">
                  Tente outro período ou inicie uma nova viagem.
                </p>
              </div>
            )}
          </section>
        )}

        {/* ── History preview ── */}
        {hasVehicles && (
          <>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-px bg-border/50" />
              <span className="text-xs text-muted-foreground font-medium uppercase tracking-widest px-2">
                Histórico
              </span>
              <div className="flex-1 h-px bg-border/50" />
            </div>
            <DashboardHistoryPreview trips={historyPreview} />
          </>
        )}

      </div>
    </div>
  );
};

export default Dashboard;
