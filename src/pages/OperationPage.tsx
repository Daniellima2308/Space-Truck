import { useApp } from "@/context/app-context";
import { useNavigate } from "react-router-dom";
import { getCurrentFreight } from "@/lib/freightStatus";
import { Trip } from "@/types";
import {
  OperationHero,
  OperationQuickStats,
  OperationQuickActions,
  OperationAlerts,
  OperationTripCard,
} from "@/components/operation";

/** Sort open trips by operational priority:
 *  1. has active (in_progress) freight
 *  2. ready to finish (has freights, no active)
 *  3. has pending planned freight
 *  4. no entries yet
 *  Within each tier, most recently created first. */
function sortTripsByPriority(trips: Trip[]): Trip[] {
  const priorityScore = (t: Trip): number => {
    const active = getCurrentFreight(t);
    if (active) return 0;

    const hasPlanned = t.freights.some((f) => f.status === "planned");
    if (hasPlanned) return 2;

    const hasFreights = t.freights.length > 0;
    if (hasFreights) return 1;
    return 3;
  };

  return [...trips].sort((a, b) => {
    const diff = priorityScore(a) - priorityScore(b);
    if (diff !== 0) return diff;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

const OperationPage = () => {
  const { data, loading } = useApp();
  const navigate = useNavigate();

  const activeTrips = data.trips.filter((t) => t.status === "open");
  const sortedActiveTrips = sortTripsByPriority(activeTrips);
  const isSingleTrip = activeTrips.length === 1;

  const todayTrips = data.trips.filter((t) => {
    const d = new Date(t.createdAt);
    const now = new Date();
    return d.toDateString() === now.toDateString();
  });

  const handleNewTrip = () => {
    if (data.vehicles.length === 0) {
      navigate("/vehicles");
      return;
    }
    navigate("/new-trip");
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
      {/* ── Header ── */}
      <header className="px-4 pt-6 pb-3">
        <h1 className="text-2xl font-black tracking-tight">Operação</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Cockpit operacional · {new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}
        </p>
      </header>

      <div className="px-4 space-y-5 pt-1">
        {/* ── Hero contextual ── */}
        <OperationHero
          vehicles={data.vehicles}
          activeTrips={sortedActiveTrips}
          onNewTrip={handleNewTrip}
        />

        {/* ── Quick stats — hidden in single-trip mode (Hero already shows revenue) ── */}
        {!isSingleTrip && (
          <OperationQuickStats activeTrips={activeTrips} todayTrips={todayTrips} />
        )}

        {/* ── Ações rápidas ── */}
        <OperationQuickActions
          vehicles={data.vehicles}
          activeTrips={activeTrips}
          onNewTrip={handleNewTrip}
          singleTripMode={isSingleTrip}
        />

        {/* ── Atenção agora — in single-trip mode only shows pending_planned (Hero covers the rest) ── */}
        {activeTrips.length > 0 && (
          <OperationAlerts
            activeTrips={sortedActiveTrips}
            vehicles={data.vehicles}
            singleTripMode={isSingleTrip}
          />
        )}

        {/* ── Viagens em andamento — hidden in single-trip mode (Hero IS the card) ── */}
        {!isSingleTrip && (
          sortedActiveTrips.length > 0 ? (
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="flex-1 h-px bg-border/50" />
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest px-2">
                  Viagens em andamento
                </span>
                <div className="flex-1 h-px bg-border/50" />
              </div>
              {sortedActiveTrips.map((trip) => (
                <OperationTripCard key={trip.id} trip={trip} />
              ))}
            </section>
          ) : (
            /* ── Empty state premium ── */
            data.vehicles.length > 0 && (
              <div className="flex flex-col items-center justify-center py-12 gap-5">
                <div className="w-20 h-20 rounded-3xl bg-primary/5 border border-primary/10 flex items-center justify-center">
                  <span className="text-4xl">🚛</span>
                </div>
                <div className="text-center space-y-1.5">
                  <p className="text-base font-bold text-foreground">Nenhuma viagem ativa</p>
                  <p className="text-sm text-muted-foreground max-w-[240px] leading-relaxed">
                    A frota está disponível. Inicie uma nova viagem para começar a operar.
                  </p>
                </div>
                <button
                  onClick={handleNewTrip}
                  className="gradient-profit text-primary-foreground rounded-xl px-6 py-3 font-bold text-sm hover:opacity-90 transition-opacity"
                >
                  Iniciar nova viagem
                </button>
              </div>
            )
          )
        )}
      </div>
    </div>
  );
};

export default OperationPage;
