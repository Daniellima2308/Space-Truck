import { Trip, Vehicle } from "@/types";
import { useNavigate } from "react-router-dom";
import { getCurrentFreight } from "@/lib/freightStatus";
import { FontAwesomeIcon, iconAlertTriangle, iconCheckCircle, iconMapPin, iconLightbulb } from "@/lib/icons";

interface Alert {
  id: string;
  type: "ready_to_finish" | "active_freight" | "needs_entry" | "pending_planned";
  icon: typeof iconCheckCircle;
  iconClass: string;
  title: string;
  description: string;
  tripId: string;
}

interface OperationAlertsProps {
  activeTrips: Trip[];
  vehicles: Vehicle[];
}

export function OperationAlerts({ activeTrips, vehicles }: OperationAlertsProps) {
  const navigate = useNavigate();

  const alerts: Alert[] = [];

  for (const trip of activeTrips) {
    const vehicle = vehicles.find((v) => v.id === trip.vehicleId);
    const vehicleLabel = vehicle ? `${vehicle.brand} ${vehicle.model}` : "Viagem";
    const currentFreight = getCurrentFreight(trip);
    const hasFreights = trip.freights.length > 0;
    const hasPlanned = trip.freights.some((f) => f.status === "planned");
    const allFreightsCompleted = hasFreights && trip.freights.every((f) => f.status === "completed");

    // Emit only the single highest-priority alert per trip to avoid duplicates
    if (currentFreight) {
      alerts.push({
        id: `freight-${trip.id}`,
        type: "active_freight",
        icon: iconMapPin,
        iconClass: "text-info",
        title: "Frete em andamento",
        description: `${vehicleLabel}: ${currentFreight.origin} → ${currentFreight.destination}`,
        tripId: trip.id,
      });
    } else if (hasPlanned) {
      alerts.push({
        id: `planned-${trip.id}`,
        type: "pending_planned",
        icon: iconAlertTriangle,
        iconClass: "text-warning",
        title: "Frete planejado aguardando",
        description: `${vehicleLabel} — inicie o próximo trecho.`,
        tripId: trip.id,
      });
    } else if (allFreightsCompleted) {
      alerts.push({
        id: `finish-${trip.id}`,
        type: "ready_to_finish",
        icon: iconCheckCircle,
        iconClass: "text-profit",
        title: "Pronta para finalizar",
        description: `${vehicleLabel} — todos os fretes concluídos.`,
        tripId: trip.id,
      });
    } else {
      alerts.push({
        id: `entry-${trip.id}`,
        type: "needs_entry",
        icon: iconLightbulb,
        iconClass: "text-muted-foreground",
        title: "Aguardando lançamentos",
        description: `${vehicleLabel} — cadastre um frete para começar.`,
        tripId: trip.id,
      });
    }
  }

  if (alerts.length === 0) return null;

  // One alert per trip; sort across trips so more urgent states surface first
  const priority = ["active_freight", "ready_to_finish", "pending_planned", "needs_entry"];
  const sorted = [...alerts].sort(
    (a, b) => priority.indexOf(a.type) - priority.indexOf(b.type),
  );
  const visible = sorted.slice(0, 3);

  return (
    <section className="space-y-2">
      <h2 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest px-0.5">
        Atenção agora
      </h2>
      <div className="space-y-2">
        {visible.map((alert) => (
          <button
            key={alert.id}
            onClick={() => navigate(`/trip/${alert.tripId}`)}
            className="w-full flex items-start gap-3 rounded-xl bg-card border border-border p-3.5 text-left hover:bg-secondary transition-colors"
          >
            <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0 mt-0.5">
              <FontAwesomeIcon icon={alert.icon} className={`w-4 h-4 ${alert.iconClass}`} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-foreground">{alert.title}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug truncate">
                {alert.description}
              </p>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}
