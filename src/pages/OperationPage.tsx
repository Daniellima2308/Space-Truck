import { useApp } from "@/context/app-context";
import { ActiveTripCard } from "@/components/ActiveTripCard";
import { useNavigate } from "react-router-dom";
import { Plus, Truck } from "lucide-react";

const OperationPage = () => {
  const { data, loading } = useApp();
  const navigate = useNavigate();

  const activeTrips = data.trips.filter((t) => t.status === "open");

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
      <header className="px-4 pt-6 pb-4">
        <h1 className="text-2xl font-black tracking-tight">Operação</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Viagens ativas e nova viagem</p>
      </header>

      <div className="px-4 space-y-4">
        <button
          onClick={handleNewTrip}
          className="w-full gradient-profit text-primary-foreground rounded-xl p-4 flex items-center justify-center gap-2 font-bold text-sm hover:opacity-90 transition-opacity"
        >
          <Plus className="w-5 h-5" /> Nova Viagem
        </button>

        {activeTrips.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center">
              <Truck className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground text-sm text-center">
              Nenhuma viagem ativa no momento.
              <br />
              Toque em Nova Viagem para começar.
            </p>
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
