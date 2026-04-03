import { useApp } from "@/context/app-context";
import { ActiveTripCard } from "@/components/ActiveTripCard";
import { useNavigate } from "react-router-dom";
import { Plus, Truck, Route, Clock3 } from "lucide-react";
import { formatCurrency, getTripGrossRevenue } from "@/lib/calculations";

const OperationPage = () => {
  const { data, loading } = useApp();
  const navigate = useNavigate();

  const activeTrips = data.trips.filter((t) => t.status === "open");
  const todayTrips = data.trips.filter((t) => {
    const d = new Date(t.createdAt);
    const now = new Date();
    return d.toDateString() === now.toDateString();
  });
  const todayRevenue = todayTrips.reduce((s, t) => s + getTripGrossRevenue(t), 0);

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
      <header className="px-4 pt-6 pb-2">
        <h1 className="text-2xl font-black tracking-tight">Operação</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Central de execução e controle de viagens</p>
      </header>

      <div className="px-4 space-y-5 pt-2">
        {/* Operational pulse — quick glance */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-card border border-border rounded-2xl p-4 space-y-1">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Route className="w-4 h-4" />
              <span className="text-[10px] uppercase tracking-widest font-semibold">Ativas Agora</span>
            </div>
            <p className="text-2xl font-black text-foreground">{activeTrips.length}</p>
          </div>
          <div className="bg-card border border-border rounded-2xl p-4 space-y-1">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock3 className="w-4 h-4" />
              <span className="text-[10px] uppercase tracking-widest font-semibold">Hoje</span>
            </div>
            <p className="text-lg font-bold text-profit font-mono">{formatCurrency(todayRevenue)}</p>
          </div>
        </div>

        {/* Primary CTA */}
        <button
          onClick={handleNewTrip}
          className="w-full gradient-profit text-primary-foreground rounded-2xl p-4 flex items-center justify-center gap-2 font-bold text-sm hover:opacity-90 transition-opacity"
        >
          <Plus className="w-5 h-5" /> Nova Viagem
        </button>

        {/* Active trips or empty state */}
        {activeTrips.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 gap-4">
            <div className="w-16 h-16 rounded-2xl bg-muted/60 flex items-center justify-center">
              <Truck className="w-8 h-8 text-muted-foreground/60" />
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-muted-foreground">Nenhuma viagem ativa</p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                Toque em Nova Viagem para iniciar sua operação.
              </p>
            </div>
          </div>
        ) : (
          <section className="space-y-3">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
              Viagens em Andamento
            </h2>
            {activeTrips.map((trip) => (
              <ActiveTripCard key={trip.id} trip={trip} />
            ))}
          </section>
        )}
      </div>
    </div>
  );
};

export default OperationPage;
