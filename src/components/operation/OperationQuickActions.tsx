import { Trip, Vehicle } from "@/types";
import { useNavigate } from "react-router-dom";
import { getCurrentFreight } from "@/lib/freightStatus";
import { isTripReadyToFinish } from "@/lib/operationUtils";
import { FontAwesomeIcon, iconPlus, iconTruck, iconHistory, iconChevronRight, iconWallet, iconCheckCircle } from "@/lib/icons";

interface OperationQuickActionsProps {
  vehicles: Vehicle[];
  activeTrips: Trip[];
  onNewTrip: () => void;
  /** When true (single active trip), skip primary navigation/finish actions already present in OperationHero */
  singleTripMode?: boolean;
}

/**
 * Render a set of context-aware quick action buttons for trip and fleet operations.
 *
 * The displayed actions depend on `activeTrips` and `vehicles` (for example: continue an ongoing freight,
 * view a single active trip, start a new trip, finalize a trip ready to finish, record a personal expense,
 * navigate to fleet or history). Returns `null` when no actions apply.
 *
 * @param vehicles - Available vehicles used to build fleet-related actions and counts
 * @param activeTrips - Currently active trips used to derive contextual and completion actions
 * @param onNewTrip - Callback invoked to start a new trip
 * @returns A section element containing the quick action buttons, or `null` when no actions are applicable
 */
export function OperationQuickActions({ vehicles, activeTrips, onNewTrip, singleTripMode = false }: OperationQuickActionsProps) {
  const navigate = useNavigate();

  const singleActiveTrip = activeTrips.length === 1 ? activeTrips[0] : null;
  const activeFreightTrip = activeTrips.find((t) => getCurrentFreight(t) !== null);

  // Trip ready to finish: has freights and all are completed
  const readyToFinishTrip = activeTrips.find(isTripReadyToFinish);

  const actions: Array<{
    icon: typeof iconPlus;
    label: string;
    description: string;
    onClick: () => void;
    variant: "primary" | "secondary" | "success";
  }> = [];

  // Context-aware primary action — suppressed in single-trip mode (Hero already provides this CTA)
  if (!singleTripMode) {
    if (activeFreightTrip) {
      actions.push({
        icon: iconChevronRight,
        label: "Continuar operação",
        description: "Frete em andamento",
        onClick: () => navigate(`/trip/${activeFreightTrip.id}`),
        variant: "primary",
      });
    } else if (singleActiveTrip) {
      actions.push({
        icon: iconChevronRight,
        label: "Ver viagem ativa",
        description: "Abrir detalhes",
        onClick: () => navigate(`/trip/${singleActiveTrip.id}`),
        variant: "primary",
      });
    } else if (vehicles.length > 0) {
      actions.push({
        icon: iconPlus,
        label: "Nova Viagem",
        description: "Iniciar operação",
        onClick: onNewTrip,
        variant: "primary",
      });
    }

    // Finalizar viagem shortcut when a trip is ready — also suppressed in single-trip mode (Hero handles it)
    if (readyToFinishTrip) {
      actions.push({
        icon: iconCheckCircle,
        label: "Finalizar viagem",
        description: "Todos os fretes concluídos",
        onClick: () => navigate(`/trip/${readyToFinishTrip.id}`),
        variant: "success",
      });
    }
  }

  // Registrar gasto pessoal when there's an active trip
  if (activeTrips.length > 0) {
    actions.push({
      icon: iconWallet,
      label: "Gasto pessoal",
      description: "Alimentação, banho…",
      onClick: () => navigate("/personal-expenses"),
      variant: "secondary",
    });
  }

  // Secondary actions
  if (vehicles.length > 0) {
    actions.push({
      icon: iconTruck,
      label: "Ir para Frota",
      description: `${vehicles.length} veículo${vehicles.length > 1 ? "s" : ""}`,
      onClick: () => navigate("/vehicles"),
      variant: "secondary",
    });
  }

  actions.push({
    icon: iconHistory,
    label: "Ver histórico",
    description: "Viagens concluídas",
    onClick: () => navigate("/history"),
    variant: "secondary",
  });

  if (actions.length === 0) return null;

  return (
    <section className="space-y-2">
      <h2 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest px-0.5">
        Ações rápidas
      </h2>
      <div className="grid grid-cols-2 gap-2">
        {actions.map((action) => (
          <button
            key={action.label}
            onClick={action.onClick}
            className={`flex flex-col items-start gap-1.5 rounded-xl p-3.5 text-left transition-colors ${
              action.variant === "primary"
                ? "bg-primary/10 border border-primary/20 hover:bg-primary/20"
                : action.variant === "success"
                  ? "bg-profit/10 border border-profit/20 hover:bg-profit/20"
                  : "bg-card border border-border hover:bg-secondary"
            }`}
          >
            <FontAwesomeIcon
              icon={action.icon}
              className={`w-4 h-4 ${
                action.variant === "primary"
                  ? "text-primary"
                  : action.variant === "success"
                    ? "text-profit"
                    : "text-muted-foreground"
              }`}
            />
            <div>
              <p
                className={`text-xs font-bold ${
                  action.variant === "primary"
                    ? "text-primary"
                    : action.variant === "success"
                      ? "text-profit"
                      : "text-foreground"
                }`}
              >
                {action.label}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{action.description}</p>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}
