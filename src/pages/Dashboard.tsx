import { useState, useMemo } from "react";
import { useApp } from "@/context/app-context";
import { SummaryCards } from "@/components/SummaryCards";
import { ActiveTripCard } from "@/components/ActiveTripCard";
import { TripHistoryList } from "@/components/TripHistoryList";
import { PeriodFilter } from "@/components/PeriodFilter";
import { MaintenanceAlerts } from "@/components/MaintenanceAlerts";
import { NotificationPrompt } from "@/components/NotificationPrompt";
import { ConnectionIndicator } from "@/components/ConnectionIndicator";
import { getTripGrossRevenue, getTripTotalCommissions, getTripTotalExpenses, getTripNetRevenue, filterTripsByPeriod } from "@/lib/calculations";
import { getMaintenanceAlerts } from "@/lib/maintenance";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useNavigate } from "react-router-dom";
import { exportMultipleTripsPdf } from "@/lib/exportPdf";
import { useBrandAsset } from "@/hooks/use-brand-asset";
import { FontAwesomeIcon, iconPlus, iconFileDown, iconArrowRight, iconTruckMoving, iconOperacao, iconTruck } from "@/lib/icons";

const PERIOD_LABELS: Record<string, string> = { all: "Todos", today: "Hoje", week: "Semana", month: "Mês", year: "Ano" };

const HISTORY_PREVIEW_LIMIT = 3;

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

  // Contextual CTA logic
  const hasVehicles = data.vehicles.length > 0;
  const hasActiveTrip = activeTrips.length > 0;
  const activeCount = activeTrips.length;

  const ctaLabel = !hasVehicles
    ? "Cadastrar Veículo"
    : hasActiveTrip
      ? activeCount > 1 ? `Operação (${activeCount} ativas)` : "Continuar Operação"
      : "Nova Viagem";
  const ctaIcon = !hasVehicles ? iconTruckMoving : hasActiveTrip ? iconOperacao : iconPlus;
  const handleCta = () => {
    if (!hasVehicles) { navigate("/vehicles"); return; }
    if (hasActiveTrip) { navigate("/operation"); return; }
    navigate("/new-trip", { state: { preSelectedVehicleId: selectedVehicleId !== "all" ? selectedVehicleId : undefined } });
  };

  // New user state: no vehicles and no trips
  const isNewUser = !hasVehicles && data.trips.length === 0;

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

        {isNewUser ? (
          /* ── Empty state: new user welcome ────────────────────────── */
          <div className="flex flex-col items-center justify-center py-14 gap-5">
            <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center">
              <FontAwesomeIcon icon={iconTruck} className="w-10 h-10 text-primary/60" />
            </div>
            <div className="text-center space-y-1">
              <p className="text-lg font-bold">Bem-vindo ao Space Truck!</p>
              <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                Cadastre seu primeiro veículo para começar a registrar suas viagens e acompanhar seus resultados.
              </p>
            </div>
            <button onClick={handleCta}
              className="gradient-profit text-primary-foreground rounded-2xl px-8 py-4 flex items-center justify-center gap-2 font-bold text-sm hover:opacity-90 transition-opacity">
              <FontAwesomeIcon icon={iconTruckMoving} className="w-5 h-5" /> Cadastrar Veículo
            </button>
          </div>
        ) : (
          /* ── Regular dashboard content ─────────────────────────────── */
          <>
            {/* Light panel filters */}
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
                {filteredTrips.length > 0 && (
                  <button
                    onClick={() => {
                      exportMultipleTripsPdf(filteredTrips, data.vehicles, PERIOD_LABELS[period] || period);
                    }}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-profit/10 text-profit hover:bg-profit/20 transition-colors text-xs font-bold whitespace-nowrap"
                  >
                    <FontAwesomeIcon icon={iconFileDown} className="w-4 h-4" /> PDF
                  </button>
                )}
              </div>
            </div>

            {/* Executive summary cards — core of the dashboard */}
            <SummaryCards
              grossRevenue={grossRevenue}
              netRevenue={netRevenue}
              totalExpenses={totalExpenses}
              totalCommissions={totalCommissions}
              tripCount={filteredTrips.length}
              periodLabel={PERIOD_LABELS[period]}
            />

            {/* Contextual CTA */}
            <button onClick={handleCta}
              className="w-full gradient-profit text-primary-foreground rounded-2xl p-4 flex items-center justify-center gap-2 font-bold text-sm hover:opacity-90 transition-opacity">
              <FontAwesomeIcon icon={ctaIcon} className="w-5 h-5" /> {ctaLabel}
            </button>

            {/* Active trip executive summary */}
            {activeTrips.length > 0 && (
              <section className="space-y-3">
                {activeTrips.map(trip => (
                  <ActiveTripCard key={trip.id} trip={trip} />
                ))}
              </section>
            )}

            {/* History preview — only shown when there are finished trips */}
            {historyPreview.length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest">Histórico</h2>
                  <button
                    onClick={() => navigate("/history")}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Ver tudo <FontAwesomeIcon icon={iconArrowRight} className="w-3 h-3" />
                  </button>
                </div>
                <TripHistoryList trips={historyPreview} />
              </section>
            )}
          </>
        )}

      </div>
    </div>
  );
};

export default Dashboard;
