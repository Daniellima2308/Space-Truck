import { useState } from "react";
import { Trip, Vehicle } from "@/types";
import { useApp } from "@/context/app-context";
import { useNavigate } from "react-router-dom";
import { getCurrentFreight } from "@/lib/freightStatus";
import { isTripReadyToFinish } from "@/lib/operationUtils";
import { FinishTripModal } from "@/components/FinishTripModal";
import { toast } from "@/hooks/use-toast";
import {
  FontAwesomeIcon,
  iconAlertTriangle,
  iconCheckCircle,
  iconMapPin,
  iconLightbulb,
  iconChevronRight,
} from "@/lib/icons";

interface Alert {
  id: string;
  type: "ready_to_finish" | "active_freight" | "needs_entry" | "pending_planned";
  icon: typeof iconCheckCircle;
  iconClass: string;
  borderClass: string;
  title: string;
  description: string;
  tripId: string;
  actionLabel: string;
}

interface OperationAlertsProps {
  activeTrips: Trip[];
  vehicles: Vehicle[];
  /** When true (single active trip), suppress alerts already communicated by OperationHero */
  singleTripMode?: boolean;
}

/**
 * Render an "Atenção agora" alert list that shows up to three prioritized alerts for the given active trips and wires the finish-trip modal flow.
 *
 * The component derives one alert per trip (based on current freight, ready-to-finish, planned freights, or needs-entry), sorts them by priority, displays the top three, and exposes actions that either navigate to the trip or open the FinishTripModal. It also computes modal inputs (min KM, active and pending freights) and calls the app's finishTrip handler on confirmation.
 *
 * @returns A section containing up to three trip alerts and, when applicable, a FinishTripModal; returns `null` if there are no alerts.
 */
export function OperationAlerts({ activeTrips, vehicles, singleTripMode = false }: OperationAlertsProps) {
  const navigate = useNavigate();
  const { finishTrip } = useApp();
  const [finishTripId, setFinishTripId] = useState<string | null>(null);

  const alerts: Alert[] = [];

  for (const trip of activeTrips) {
    const vehicle = vehicles.find((v) => v.id === trip.vehicleId);
    const vehicleLabel = vehicle ? `${vehicle.brand} ${vehicle.model}` : "Viagem";
    const currentFreight = getCurrentFreight(trip);
    const hasPlanned = trip.freights.some((f) => f.status === "planned");
    const readyToFinish = isTripReadyToFinish(trip);

    // Emit only the single highest-priority alert per trip to avoid duplicates
    if (currentFreight) {
      alerts.push({
        id: `freight-${trip.id}`,
        type: "active_freight",
        icon: iconMapPin,
        iconClass: "text-info",
        borderClass: "border-info/25 bg-info/5",
        title: "Frete em andamento",
        description: `${vehicleLabel}: ${currentFreight.origin} → ${currentFreight.destination}`,
        tripId: trip.id,
        actionLabel: "Continuar",
      });
    } else if (readyToFinish) {
      alerts.push({
        id: `finish-${trip.id}`,
        type: "ready_to_finish",
        icon: iconCheckCircle,
        iconClass: "text-profit",
        borderClass: "border-profit/25 bg-profit/5",
        title: "Pronta para finalizar",
        description: `${vehicleLabel} — todos os fretes concluídos.`,
        tripId: trip.id,
        actionLabel: "Finalizar",
      });
    } else if (hasPlanned) {
      alerts.push({
        id: `planned-${trip.id}`,
        type: "pending_planned",
        icon: iconAlertTriangle,
        iconClass: "text-warning",
        borderClass: "border-warning/25 bg-warning/5",
        title: "Frete planejado aguardando",
        description: `${vehicleLabel} — inicie o próximo trecho.`,
        tripId: trip.id,
        actionLabel: "Iniciar trecho",
      });
    } else {
      alerts.push({
        id: `entry-${trip.id}`,
        type: "needs_entry",
        icon: iconLightbulb,
        iconClass: "text-muted-foreground",
        borderClass: "border-border bg-card",
        title: "Aguardando lançamentos",
        description: `${vehicleLabel} — cadastre um frete para começar.`,
        tripId: trip.id,
        actionLabel: "Ver viagem",
      });
    }
  }

  if (alerts.length === 0) return null;

  // In single-trip mode, filter out alert types the Hero already communicates clearly.
  // Keep only "pending_planned" which has a unique "Iniciar trecho" CTA not present in Hero.
  const visibleAlerts = singleTripMode
    ? alerts.filter((a) => a.type === "pending_planned")
    : alerts;

  if (visibleAlerts.length === 0) return null;

  // Sort: ready_to_finish first (most actionable), then active_freight, then pending_planned, needs_entry
  const priority = ["ready_to_finish", "active_freight", "pending_planned", "needs_entry"];
  const sorted = [...visibleAlerts].sort(
    (a, b) => priority.indexOf(a.type) - priority.indexOf(b.type),
  );
  const visible = sorted.slice(0, 3);

  const urgentCount = visibleAlerts.filter(
    (a) => a.type === "ready_to_finish" || a.type === "active_freight",
  ).length;

  // FinishTripModal data
  const finishingTrip = finishTripId ? activeTrips.find((t) => t.id === finishTripId) : null;
  const finishingVehicle = finishingTrip
    ? vehicles.find((v) => v.id === finishingTrip.vehicleId)
    : null;
  const finishingCurrentFreight = finishingTrip ? getCurrentFreight(finishingTrip) : null;
  const finishingMaxKm = finishingTrip
    ? Math.max(
        finishingVehicle?.currentKm || 0,
        ...finishingTrip.fuelings.map((f) => f.kmCurrent || 0),
        ...finishingTrip.freights
          .filter((f) => f.status === "in_progress" || f.status === "completed")
          .map((f) => f.kmInitial || 0),
      )
    : 0;

  const handleFinish = async ({
    km,
    allowPendingPlanned,
  }: {
    km: number;
    allowPendingPlanned: boolean;
  }) => {
    if (!finishTripId) return;
    try {
      await finishTrip(finishTripId, { arrivalKm: km, allowPendingPlanned });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Tente novamente.";
      toast({ title: "Não deu para finalizar", description: message, variant: "destructive" });
    } finally {
      setFinishTripId(null);
    }
  };

  return (
    <>
      <section className="space-y-2">
        <div className="flex items-center justify-between px-0.5">
          <h2 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
            Atenção agora
          </h2>
          {urgentCount > 0 && (
            <span className="text-[10px] font-bold text-warning bg-warning/10 px-2 py-0.5 rounded-full border border-warning/20">
              {urgentCount} {urgentCount === 1 ? "item urgente" : "itens urgentes"}
            </span>
          )}
        </div>
        <div className="space-y-2">
          {visible.map((alert) => (
            <div
              key={alert.id}
              className={`flex items-start gap-3 rounded-xl border p-3.5 ${alert.borderClass}`}
            >
              <div className="w-8 h-8 rounded-lg bg-background/70 flex items-center justify-center shrink-0 mt-0.5">
                <FontAwesomeIcon icon={alert.icon} className={`w-4 h-4 ${alert.iconClass}`} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-foreground">{alert.title}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug truncate">
                  {alert.description}
                </p>
              </div>
              <button
                onClick={() => {
                  if (alert.type === "ready_to_finish") {
                    setFinishTripId(alert.tripId);
                  } else {
                    navigate(`/trip/${alert.tripId}`);
                  }
                }}
                className={`shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-colors mt-0.5 ${
                  alert.type === "ready_to_finish"
                    ? "bg-profit text-profit-foreground hover:opacity-90"
                    : alert.type === "active_freight"
                      ? "bg-info/15 text-info hover:bg-info/25"
                      : alert.type === "pending_planned"
                        ? "bg-warning/15 text-warning hover:bg-warning/25"
                        : "bg-secondary text-foreground hover:bg-accent"
                }`}
              >
                {alert.actionLabel}
                {alert.type !== "ready_to_finish" && (
                  <FontAwesomeIcon icon={iconChevronRight} className="w-2.5 h-2.5" />
                )}
              </button>
            </div>
          ))}
        </div>
        {visibleAlerts.length > 3 && (
          <p className="text-[10px] text-muted-foreground text-center pt-1">
            +{visibleAlerts.length - 3} viagem{visibleAlerts.length - 3 > 1 ? "s" : ""} com situações pendentes
          </p>
        )}
      </section>

      {finishingTrip && (
        <FinishTripModal
          open={!!finishTripId}
          onClose={() => setFinishTripId(null)}
          minKm={finishingMaxKm}
          activeFreight={
            finishingCurrentFreight
              ? {
                  origin: finishingCurrentFreight.origin,
                  destination: finishingCurrentFreight.destination,
                }
              : null
          }
          pendingFreights={finishingTrip.freights
            .filter((f) => f.status === "planned")
            .map((f) => ({ id: f.id, origin: f.origin, destination: f.destination }))}
          onConfirm={handleFinish}
        />
      )}
    </>
  );
}