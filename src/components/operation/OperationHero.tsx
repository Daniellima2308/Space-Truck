import { useState } from "react";
import { Trip, Vehicle } from "@/types";
import { useNavigate } from "react-router-dom";
import { useApp } from "@/context/app-context";
import { getCurrentFreight } from "@/lib/freightStatus";
import { formatCurrency, getTripGrossRevenue, getTripNetRevenue } from "@/lib/calculations";
import { getTripAgeDays, isTripReadyToFinish } from "@/lib/operationUtils";
import { FinishTripModal } from "@/components/FinishTripModal";
import { toast } from "@/hooks/use-toast";
import { FontAwesomeIcon, iconTruck, iconPlus, iconChevronRight, iconMapPin, iconRoute, iconClock3, iconTrendingUp, iconCheckCircle } from "@/lib/icons";

interface OperationHeroProps {
  vehicles: Vehicle[];
  activeTrips: Trip[];
  onNewTrip: () => void;
}

/**
 * Render an operations status card that adapts its content and actions based on the fleet and active trips.
 *
 * The component shows one of four states: no vehicles registered, vehicles present but no active trips,
 * exactly one active trip (detailed trip view with navigation and revenue/age/status indicators), or
 * multiple active trips (aggregate metrics and summary). Action buttons navigate to vehicle/trip flows or
 * invoke `onNewTrip` as appropriate.
 *
 * @param vehicles - The current fleet used to determine availability and to label a single active trip's vehicle.
 * @param activeTrips - The list of active trips used to decide which UI scenario to render and to compute metrics.
 * @param onNewTrip - Callback invoked when the user requests creating a new trip.
 * @returns A JSX element representing the operations status card tailored to the provided data.
 */
export function OperationHero({ vehicles, activeTrips, onNewTrip }: OperationHeroProps) {
  const navigate = useNavigate();
  const { finishTrip } = useApp();
  const [showFinishModal, setShowFinishModal] = useState(false);

  // Scenario 1: no vehicles registered
  if (vehicles.length === 0) {
    return (
      <div className="gradient-card rounded-2xl p-5 border border-border space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center shrink-0">
            <FontAwesomeIcon icon={iconTruck} className="w-5 h-5 text-muted-foreground" />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground mb-0.5">
              Frota
            </p>
            <h2 className="text-base font-bold text-foreground">Nenhum veículo cadastrado</h2>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              Para iniciar uma viagem, você precisa de pelo menos um veículo na frota.
            </p>
          </div>
        </div>
        <button
          onClick={() => navigate("/vehicles")}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-primary/10 text-primary text-sm font-semibold hover:bg-primary/20 transition-colors"
        >
          <FontAwesomeIcon icon={iconPlus} className="w-4 h-4" />
          Cadastrar primeiro veículo
        </button>
      </div>
    );
  }

  // Scenario 2: no active trips
  if (activeTrips.length === 0) {
    return (
      <div className="rounded-2xl p-5 border border-border/60 bg-gradient-to-br from-card to-muted/20 space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <FontAwesomeIcon icon={iconTruck} className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground mb-0.5">
              Status
            </p>
            <h2 className="text-base font-bold text-foreground">Pronto para operar</h2>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              Nenhuma viagem em andamento.{" "}
              {vehicles.length === 1
                ? `${vehicles[0].brand} ${vehicles[0].model} disponível.`
                : `${vehicles.length} veículos disponíveis.`}
            </p>
          </div>
        </div>
        <button
          onClick={onNewTrip}
          className="w-full gradient-profit text-primary-foreground rounded-xl py-3 flex items-center justify-center gap-2 font-bold text-sm hover:opacity-90 transition-opacity"
        >
          <FontAwesomeIcon icon={iconPlus} className="w-4 h-4" />
          Nova Viagem
        </button>
      </div>
    );
  }

  // Scenario 3: exactly 1 active trip
  if (activeTrips.length === 1) {
    const trip = activeTrips[0];
    const vehicle = vehicles.find((v) => v.id === trip.vehicleId);
    const currentFreight = getCurrentFreight(trip);
    const gross = getTripGrossRevenue(trip);
    const net = getTripNetRevenue(trip);

    // Trip age in days
    const tripAgeDays = getTripAgeDays(trip);

    // Check if trip is ready to finish
    const isReadyToFinish = isTripReadyToFinish(trip);

    const finishMaxKm = Math.max(
      vehicle?.currentKm || 0,
      ...trip.fuelings.map((f) => f.kmCurrent || 0),
      ...trip.freights
        .filter((f) => f.status === "in_progress" || f.status === "completed")
        .map((f) => f.kmInitial || 0),
    );

    const handleFinish = async ({
      km,
      allowPendingPlanned,
    }: {
      km: number;
      allowPendingPlanned: boolean;
    }) => {
      try {
        await finishTrip(trip.id, { arrivalKm: km, allowPendingPlanned });
        setShowFinishModal(false);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Tente novamente.";
        toast({ title: "Não deu para finalizar", description: message, variant: "destructive" });
        throw error;
      }
    };

    return (
      <>
        <div
          className="gradient-active-trip rounded-2xl p-5 cursor-pointer space-y-4"
          onClick={() => navigate(`/trip/${trip.id}`)}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="relative">
                <div className="w-10 h-10 rounded-xl bg-profit/10 flex items-center justify-center">
                  <FontAwesomeIcon icon={iconTruck} className="w-5 h-5 text-profit" />
                </div>
                <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-profit animate-pulse-glow border-2 border-background" />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-widest font-semibold text-profit mb-0.5">
                  Em operação
                </p>
                <h2 className="text-base font-bold text-foreground">
                  {vehicle ? `${vehicle.brand} ${vehicle.model}` : "Viagem ativa"}
                </h2>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  {vehicle && (
                    <span className="inline-block px-2 py-0.5 rounded bg-accent text-[10px] font-mono font-bold tracking-wider text-muted-foreground border border-border">
                      {vehicle.plate}
                    </span>
                  )}
                  <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    <FontAwesomeIcon icon={iconClock3} className="w-2.5 h-2.5" />
                    {tripAgeDays === 0 ? "iniciada hoje" : tripAgeDays === 1 ? "1 dia em estrada" : `${tripAgeDays} dias em estrada`}
                  </span>
                </div>
              </div>
            </div>
            <FontAwesomeIcon icon={iconChevronRight} className="w-5 h-5 text-muted-foreground mt-1" />
          </div>

          {currentFreight ? (
            <div className="rounded-xl bg-profit/5 border border-profit/20 px-3.5 py-3 space-y-1">
              <p className="text-[10px] uppercase tracking-widest font-semibold text-profit">
                Frete atual
              </p>
              <div className="flex items-center gap-2 text-xs text-foreground font-medium">
                <FontAwesomeIcon icon={iconMapPin} className="w-3.5 h-3.5 text-profit shrink-0" />
                {currentFreight.origin} → {currentFreight.destination}
              </div>
            </div>
          ) : isReadyToFinish ? (
            <div className="rounded-xl bg-profit/8 border border-profit/30 px-3.5 py-3">
              <p className="text-xs font-semibold text-profit">
                ✓ Todos os fretes concluídos — pronta para fechar.
              </p>
            </div>
          ) : (
            <div className="rounded-xl bg-secondary/50 px-3.5 py-3">
              <p className="text-xs text-muted-foreground">
                {trip.freights.some((f) => f.status === "planned")
                  ? "Frete planejado aguardando início."
                  : "Nenhum frete em andamento."}
              </p>
            </div>
          )}

          <div className="flex items-end justify-between pt-1 border-t border-border/40">
            <div className="space-y-0.5">
              <div>
                <p className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground">
                  Bruto parcial
                </p>
                <p className="text-xl font-black font-mono text-profit">{formatCurrency(gross)}</p>
              </div>
              {net !== 0 && (
                <div className="flex items-center gap-1">
                  <FontAwesomeIcon icon={iconTrendingUp} className="w-3 h-3 text-muted-foreground" />
                  <span className="text-[10px] text-muted-foreground">
                    Líq.{" "}
                    <span className={net >= 0 ? "text-profit font-semibold" : "text-expense font-semibold"}>
                      {formatCurrency(net)}
                    </span>
                  </span>
                </div>
              )}
            </div>
            {isReadyToFinish ? (
              <button
                onClick={(e) => { e.stopPropagation(); setShowFinishModal(true); }}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-profit text-profit-foreground text-xs font-bold hover:opacity-90 transition-opacity"
              >
                <FontAwesomeIcon icon={iconCheckCircle} className="w-3.5 h-3.5" /> Finalizar
              </button>
            ) : (
              <button
                onClick={(e) => { e.stopPropagation(); navigate(`/trip/${trip.id}`); }}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-primary/10 text-primary text-xs font-semibold hover:bg-primary/20 transition-colors"
              >
                Continuar <FontAwesomeIcon icon={iconChevronRight} className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        <FinishTripModal
          open={showFinishModal}
          onClose={() => setShowFinishModal(false)}
          minKm={finishMaxKm}
          activeFreight={
            currentFreight
              ? { origin: currentFreight.origin, destination: currentFreight.destination }
              : null
          }
          pendingFreights={trip.freights
            .filter((f) => f.status === "planned")
            .map((f) => ({ id: f.id, origin: f.origin, destination: f.destination }))}
          onConfirm={handleFinish}
        />
      </>
    );
  }

  // Scenario 4: multiple active trips
  const totalRevenue = activeTrips.reduce((sum, t) => sum + getTripGrossRevenue(t), 0);
  const totalNet = activeTrips.reduce((sum, t) => sum + getTripNetRevenue(t), 0);
  const tripsWithActiveFreight = activeTrips.filter((t) => getCurrentFreight(t) !== null);
  const tripsReadyToFinish = activeTrips.filter(isTripReadyToFinish);

  return (
    <div className="rounded-2xl p-5 border border-warning/30 bg-gradient-to-br from-card to-warning/5 space-y-4">
      <div className="flex items-start gap-3">
        <div className="relative">
          <div className="w-10 h-10 rounded-xl bg-warning/10 flex items-center justify-center">
            <FontAwesomeIcon icon={iconRoute} className="w-5 h-5 text-warning" />
          </div>
          <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-warning flex items-center justify-center border-2 border-background">
            <span className="text-[9px] font-black text-warning-foreground">{activeTrips.length}</span>
          </span>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-widest font-semibold text-warning mb-0.5">
            Múltiplas operações
          </p>
          <h2 className="text-base font-bold text-foreground">
            {activeTrips.length} viagens em andamento
          </h2>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            {tripsWithActiveFreight.length > 0 && (
              <span className="text-xs text-muted-foreground">
                {tripsWithActiveFreight.length} com frete ativo
              </span>
            )}
            {tripsReadyToFinish.length > 0 && (
              <span className="text-[10px] font-semibold text-profit bg-profit/10 px-2 py-0.5 rounded-full">
                {tripsReadyToFinish.length} pronta{tripsReadyToFinish.length > 1 ? "s" : ""} para fechar
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-xl bg-secondary/60 px-3.5 py-2.5">
          <p className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground">
            Receita bruta
          </p>
          <p className="text-lg font-black font-mono text-profit">{formatCurrency(totalRevenue)}</p>
        </div>
        <div className="rounded-xl bg-secondary/60 px-3.5 py-2.5">
          <p className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground">
            Receita líquida
          </p>
          <p className={`text-lg font-black font-mono ${totalNet >= 0 ? "text-profit" : "text-expense"}`}>
            {formatCurrency(totalNet)}
          </p>
        </div>
      </div>

      <button
        onClick={onNewTrip}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-border text-sm font-semibold text-foreground hover:bg-secondary transition-colors"
      >
        <FontAwesomeIcon icon={iconPlus} className="w-4 h-4" />
        Nova Viagem
      </button>
    </div>
  );
}
