import { Trip, Vehicle } from "@/types";
import { useNavigate } from "react-router-dom";
import { getCurrentFreight } from "@/lib/freightStatus";
import { FontAwesomeIcon, iconPlus, iconTruck, iconHistory, iconChevronRight } from "@/lib/icons";

interface OperationQuickActionsProps {
  vehicles: Vehicle[];
  activeTrips: Trip[];
  onNewTrip: () => void;
}

export function OperationQuickActions({ vehicles, activeTrips, onNewTrip }: OperationQuickActionsProps) {
  const navigate = useNavigate();

  const singleActiveTrip = activeTrips.length === 1 ? activeTrips[0] : null;
  const activeFreightTrip = activeTrips.find((t) => getCurrentFreight(t) !== null);

  const actions: Array<{
    icon: typeof iconPlus;
    label: string;
    description: string;
    onClick: () => void;
    variant: "primary" | "secondary";
  }> = [];

  // Context-aware primary action
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
    onClick: () => navigate("/"),
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
                : "bg-card border border-border hover:bg-secondary"
            }`}
          >
            <FontAwesomeIcon
              icon={action.icon}
              className={`w-4 h-4 ${action.variant === "primary" ? "text-primary" : "text-muted-foreground"}`}
            />
            <div>
              <p className={`text-xs font-bold ${action.variant === "primary" ? "text-primary" : "text-foreground"}`}>
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
