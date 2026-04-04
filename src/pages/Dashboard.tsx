import { useState, useMemo } from "react";
import { useApp } from "@/context/app-context";
import { SummaryCards } from "@/components/SummaryCards";
import { ActiveTripCard } from "@/components/ActiveTripCard";
import { TripHistoryList } from "@/components/TripHistoryList";
import { PeriodFilter } from "@/components/PeriodFilter";
import { MaintenanceAlerts } from "@/components/MaintenanceAlerts";
import { NotificationPrompt } from "@/components/NotificationPrompt";
import { ConnectionIndicator } from "@/components/ConnectionIndicator";
import { getTripGrossRevenue, getTripTotalCommissions, getTripTotalExpenses, getTripNetRevenue } from "@/lib/calculations";
import { getMaintenanceAlerts } from "@/lib/maintenance";
import { Trip } from "@/types";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useNavigate } from "react-router-dom";
import { exportMultipleTripsPdf } from "@/lib/exportPdf";
import { useBrandAsset } from "@/hooks/use-brand-asset";
import { FontAwesomeIcon, iconPlus, iconFileDown, iconArrowRight, iconTruckMoving, iconOperacao, iconHistory } from "@/lib/icons";

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
  const filteredTrips = useMemo(() => filterTripsByPeriod(vehicleFilteredTrips, period), [vehicleFilteredTrips, period]);
  const maintenanceAlerts = useMemo(() => getMaintenanceAlerts(data.vehicles, data.maintenanceServices), [data.vehicles, data.maintenanceServices]);

  const grossRevenue = filteredTrips.reduce((s, t) => s + getTripGrossRevenue(t), 0);
  const totalCommissions = filteredTrips.reduce((s, t) => s + getTripTotalCommissions(t), 0);
  const totalExpenses = filteredTrips.reduce((s, t) => s + getTripTotalExpenses(t), 0);
  const netRevenue = filteredTrips.reduce((s, t) => s + getTripNetRevenue(t), 0);

  // Active trips are shown regardless of period filter
  const activeTrips = useMemo(() => vehicleFilteredTrips.filter(t => t.status === "open"), [vehicleFilteredTrips]);

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

  // Contextual CTA
  const ctaLabel = !hasVehicles ? "Cadastrar Veículo" : hasActiveTrip ? "Continuar Operação" : "Nova Viagem";
  const ctaIcon = !hasVehicles ? iconTruckMoving : hasActiveTrip ? iconOperacao : iconPlus;
  const handleCta = () => {
    if (!hasVehicles) { navigate("/vehicles"); return; }
    if (hasActiveTrip) { navigate("/operation"); return; }
    navigate("/new-trip", { state: { preSelectedVehicleId: selectedVehicleId !== "all" ? selectedVehicleId : undefined } });
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
          <img
            src={wordmarkSrc}
            alt="Space Truck"
            className="h-7 w-auto"
          />
          <ConnectionIndicator />
        </div>
      </header>

      <div className="px-4 space-y-5 pt-1">

        {/* Attention zone: notifications + maintenance alerts */}
        <div className="space-y-2">
          <NotificationPrompt />
          <MaintenanceAlerts alerts={maintenanceAlerts} />
        </div>

        {/* ── SCENARIO A: No vehicles → onboarding empty state ── */}
        {!hasVehicles && (
          <div className="gradient-card rounded-2xl p-6 text-center space-y-4">
            <div className="flex justify-center">
              <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center">
                <FontAwesomeIcon icon={iconTruckMoving} className="w-8 h-8 text-muted-foreground" />
              </div>
            </div>
            <div>
              <h2 className="text-base font-bold mb-1">Bem-vindo ao Space Truck</h2>
              <p className="text-sm text-muted-foreground">
                Cadastre seu veículo para começar a registrar viagens e acompanhar seu desempenho financeiro.
              </p>
            </div>
            <button
              onClick={handleCta}
              className="w-full gradient-profit text-primary-foreground rounded-2xl p-4 flex items-center justify-center gap-2 font-bold text-sm hover:opacity-90 transition-opacity"
            >
              <FontAwesomeIcon icon={iconTruckMoving} className="w-5 h-5" /> Cadastrar Veículo
            </button>
          </div>
        )}

        {/* ── SCENARIOS B / C / D: User has vehicles ── */}
        {hasVehicles && (
          <>
            {/* ── SCENARIO B: Active trip → prioritize it at top ── */}
            {hasActiveTrip && (
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
                {/* CTA continues operation when active trip exists */}
                <button
                  onClick={handleCta}
                  className="w-full gradient-profit text-primary-foreground rounded-2xl p-4 flex items-center justify-center gap-2 font-bold text-sm hover:opacity-90 transition-opacity"
                >
                  <FontAwesomeIcon icon={ctaIcon} className="w-5 h-5" /> {ctaLabel}
                </button>
              </section>
            )}

            {/* Filters (vehicle selector + period + PDF) */}
            <div className="space-y-2">
              {data.vehicles.length >= 2 && (
                <Select value={selectedVehicleId} onValueChange={setSelectedVehicleId}>
                  <SelectTrigger className="w-full bg-secondary border-none text-sm h-[42px]">
                    <SelectValue placeholder="Todos os Veículos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os Veículos</SelectItem>
                    {data.vehicles.map(v => (
                      <SelectItem key={v.id} value={v.id}>{v.plate} • {v.brand} {v.model}</SelectItem>
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
                    onClick={() => {
                      exportMultipleTripsPdf(filteredTrips, data.vehicles, PERIOD_DISPLAY[period] || period);
                    }}
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
                <p className="text-sm font-medium">Nenhuma viagem {PERIOD_LABELS[period] || "neste período"}</p>
                <p className="text-xs text-muted-foreground">
                  Tente outro período ou inicie uma nova viagem.
                </p>
              </div>
            )}

            {/* ── SCENARIOS C / D: No active trip → CTA is the next action ── */}
            {!hasActiveTrip && (
              <button
                onClick={handleCta}
                className="w-full gradient-profit text-primary-foreground rounded-2xl p-4 flex items-center justify-center gap-2 font-bold text-sm hover:opacity-90 transition-opacity"
              >
                <FontAwesomeIcon icon={ctaIcon} className="w-5 h-5" /> {ctaLabel}
              </button>
            )}

            {/* History preview — always shows most recent finished trips, independent of period filter */}
            <section>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <FontAwesomeIcon icon={iconHistory} className="w-3.5 h-3.5 text-muted-foreground" />
                  <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest">
                    Últimas viagens finalizadas
                  </h2>
                </div>
                {hasHistory && (
                  <button
                    onClick={() => navigate("/history")}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Ver tudo <FontAwesomeIcon icon={iconArrowRight} className="w-3 h-3" />
                  </button>
                )}
              </div>
              {hasHistory ? (
                <>
                  <p className="text-xs text-muted-foreground mb-3">
                    Independente do filtro de período acima
                  </p>
                  <TripHistoryList trips={historyPreview} />
                </>
              ) : (
                <div className="gradient-card rounded-xl p-5 text-center space-y-3">
                  <p className="text-sm font-medium">Nenhuma viagem finalizada ainda</p>
                  <p className="text-xs text-muted-foreground">
                    Ao finalizar sua primeira viagem ela aparecerá aqui.
                  </p>
                  <button
                    onClick={() => navigate("/new-trip")}
                    className="mx-auto flex items-center gap-1.5 px-4 py-2 rounded-lg bg-profit/10 text-profit hover:bg-profit/20 transition-colors text-xs font-bold"
                  >
                    <FontAwesomeIcon icon={iconPlus} className="w-3.5 h-3.5" /> Iniciar primeira viagem
                  </button>
                </div>
              )}
            </section>
          </>
        )}

      </div>
    </div>
  );
};

export default Dashboard;
