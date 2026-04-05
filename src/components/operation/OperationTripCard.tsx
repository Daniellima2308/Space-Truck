import { Trip } from "@/types";
import { useApp } from "@/context/app-context";
import { getTripGrossRevenue, getTripNetRevenue, getLastDestination, formatCurrency } from "@/lib/calculations";
import { getCurrentFreight } from "@/lib/freightStatus";
import { getTripAgeDays } from "@/lib/operationUtils";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { FinishTripModal } from "@/components/FinishTripModal";
import {
  FontAwesomeIcon,
  iconTruck,
  iconMapPin,
  iconChevronRight,
  iconCheckCircle,
  iconTrash2,
  iconAlertTriangle,
  iconRoute,
  iconClock3,
  iconPlayCircle,
  iconTrendingUp,
} from "@/lib/icons";

interface OperationTripCardProps {
  trip: Trip;
}

type TripPriorityTag = "active_freight" | "ready_to_finish" | "pending_planned" | "no_entries";

function getTripPriority(trip: Trip): TripPriorityTag {
  const currentFreight = getCurrentFreight(trip);
  const hasFreights = trip.freights.length > 0;
  const hasPlanned = trip.freights.some((f) => f.status === "planned");
  const allFreightsCompleted = hasFreights && trip.freights.every((f) => f.status === "completed");

  if (currentFreight) return "active_freight";
  if (hasPlanned) return "pending_planned";
  if (allFreightsCompleted) return "ready_to_finish";
  return "no_entries";
}

const PRIORITY_META: Record<
  TripPriorityTag,
  { label: string; badgeClass: string; dotClass: string }
> = {
  active_freight: {
    label: "Frete em andamento",
    badgeClass: "bg-info/10 text-info border-info/25",
    dotClass: "bg-info",
  },
  ready_to_finish: {
    label: "Pronta para finalizar",
    badgeClass: "bg-profit/10 text-profit border-profit/25",
    dotClass: "bg-profit",
  },
  pending_planned: {
    label: "Frete planejado",
    badgeClass: "bg-warning/10 text-warning border-warning/25",
    dotClass: "bg-warning",
  },
  no_entries: {
    label: "Aguardando lançamentos",
    badgeClass: "bg-muted text-muted-foreground border-border",
    dotClass: "bg-muted-foreground",
  },
};

export function OperationTripCard({ trip }: OperationTripCardProps) {
  const { data, finishTrip, deleteTrip } = useApp();
  const navigate = useNavigate();
  const vehicle = data.vehicles.find((v) => v.id === trip.vehicleId);
  const gross = getTripGrossRevenue(trip);
  const net = getTripNetRevenue(trip);
  const lastDest = getLastDestination(trip);
  const currentFreight = getCurrentFreight(trip);
  const priorityTag = getTripPriority(trip);
  const meta = PRIORITY_META[priorityTag];

  const [showFinishModal, setShowFinishModal] = useState(false);

  // Trip age in days
  const tripAgeDays = getTripAgeDays(trip);

  const operationalMaxKm = Math.max(
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
    await finishTrip(trip.id, { arrivalKm: km, allowPendingPlanned });
    setShowFinishModal(false);
  };

  const plannedCount = trip.freights.filter((f) => f.status === "planned").length;
  const completedCount = trip.freights.filter((f) => f.status === "completed").length;
  const inProgressCount = trip.freights.filter((f) => f.status === "in_progress").length;

  return (
    <>
      <div
        className="gradient-active-trip rounded-xl cursor-pointer transition-all hover:scale-[1.005]"
        onClick={() => navigate(`/trip/${trip.id}`)}
      >
        {/* Header row */}
        <div className="px-4 pt-4 pb-3 flex items-start justify-between gap-2">
          <div className="flex items-start gap-2.5">
            <div className="relative mt-0.5">
              <div className="w-9 h-9 rounded-xl bg-profit/10 flex items-center justify-center">
                <FontAwesomeIcon icon={iconTruck} className="w-4 h-4 text-profit" />
              </div>
              <span className={`absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full border-2 border-background ${meta.dotClass} animate-pulse-glow`} />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground leading-tight">
                {vehicle ? `${vehicle.brand} ${vehicle.model}` : "Veículo não encontrado"}
              </p>
              <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                {vehicle && (
                  <span className="px-2 py-0.5 rounded bg-accent text-[9px] font-mono font-bold tracking-wider text-muted-foreground border border-border">
                    {vehicle.plate}
                  </span>
                )}
                <span className="flex items-center gap-1 text-[9px] text-muted-foreground">
                  <FontAwesomeIcon icon={iconClock3} className="w-2.5 h-2.5" />
                  {tripAgeDays === 0 ? "hoje" : tripAgeDays === 1 ? "1 dia" : `${tripAgeDays} dias`}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg border text-[10px] font-semibold ${meta.badgeClass}`}>
              {priorityTag === "active_freight" && <FontAwesomeIcon icon={iconRoute} className="w-3 h-3" />}
              {priorityTag === "ready_to_finish" && <FontAwesomeIcon icon={iconCheckCircle} className="w-3 h-3" />}
              {priorityTag === "pending_planned" && <FontAwesomeIcon icon={iconAlertTriangle} className="w-3 h-3" />}
              {meta.label}
            </span>
            <FontAwesomeIcon icon={iconChevronRight} className="w-4 h-4 text-muted-foreground" />
          </div>
        </div>

        {/* Route / freight info */}
        <div className="px-4 pb-3 space-y-2">
          {currentFreight ? (
            <div className="flex items-center gap-2 rounded-lg bg-info/5 border border-info/20 px-3 py-2">
              <FontAwesomeIcon icon={iconMapPin} className="w-3.5 h-3.5 text-info shrink-0" />
              <span className="text-xs text-foreground font-medium truncate">
                {currentFreight.origin} → {currentFreight.destination}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <FontAwesomeIcon icon={iconMapPin} className="w-3.5 h-3.5 shrink-0" />
              <span>Último destino: <span className="text-foreground font-medium">{lastDest}</span></span>
            </div>
          )}

          {/* Freight counters */}
          <div className="flex items-center gap-2 flex-wrap">
            {inProgressCount > 0 && (
              <span className="chip text-[10px]">
                <FontAwesomeIcon icon={iconRoute} className="w-3 h-3 text-info" />
                {inProgressCount} em andamento
              </span>
            )}
            {completedCount > 0 && (
              <span className="chip text-[10px]">
                <FontAwesomeIcon icon={iconCheckCircle} className="w-3 h-3 text-profit" />
                {completedCount} concluído{completedCount > 1 ? "s" : ""}
              </span>
            )}
            {plannedCount > 0 && (
              <span className="chip text-[10px]">
                <FontAwesomeIcon icon={iconAlertTriangle} className="w-3 h-3 text-warning" />
                {plannedCount} planejado{plannedCount > 1 ? "s" : ""}
              </span>
            )}
          </div>
        </div>

        {/* Footer: revenue + actions */}
        <div
          className="px-4 pb-4 flex items-end justify-between border-t border-border/30 pt-3"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="space-y-1">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">
                Bruto parcial
              </p>
              <p className="text-xl font-black font-mono text-profit">{formatCurrency(gross)}</p>
            </div>
            {gross > 0 && (
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
          <div className="flex gap-2">
            {priorityTag === "pending_planned" && !currentFreight && (
              <button
                onClick={() => navigate(`/trip/${trip.id}`)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-warning/10 text-warning text-xs font-semibold hover:bg-warning/20 transition-colors"
              >
                <FontAwesomeIcon icon={iconPlayCircle} className="w-4 h-4" /> Iniciar trecho
              </button>
            )}
            {priorityTag === "ready_to_finish" && (
              <button
                onClick={() => setShowFinishModal(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-profit/10 text-profit text-xs font-semibold hover:bg-profit/20 transition-colors"
              >
                <FontAwesomeIcon icon={iconCheckCircle} className="w-4 h-4" /> Finalizar
              </button>
            )}
            <button
              onClick={() => {
                if (confirm("Excluir viagem e todos os dados vinculados?")) deleteTrip(trip.id);
              }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-expense/10 text-expense text-xs font-semibold hover:bg-expense/20 transition-colors"
            >
              <FontAwesomeIcon icon={iconTrash2} className="w-4 h-4" /> Excluir
            </button>
          </div>
        </div>
      </div>

      <FinishTripModal
        open={showFinishModal}
        onClose={() => setShowFinishModal(false)}
        minKm={operationalMaxKm}
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
