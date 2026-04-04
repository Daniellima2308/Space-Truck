import { MaintenanceAlert } from "@/types";
import { useNavigate } from "react-router-dom";
import { FontAwesomeIcon, iconAlertTriangle, iconWrench, iconChevronRight } from "@/lib/icons";

interface Props {
  alerts: MaintenanceAlert[];
}

export function MaintenanceAlerts({ alerts }: Props) {
  const navigate = useNavigate();

  if (alerts.length === 0) return null;

  return (
    <section className="space-y-2">
      {alerts.map((alert) => {
        const isOverdue = alert.status === "overdue";
        return (
          <div
            key={alert.service.id}
            role="button"
            tabIndex={0}
            onClick={() => navigate(`/maintenance?vehicleId=${alert.vehicle.id}`)}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") navigate(`/maintenance?vehicleId=${alert.vehicle.id}`); }}
            className={`rounded-xl p-4 flex items-center gap-3 cursor-pointer transition-colors ${
              isOverdue
                ? "bg-expense/10 border border-expense/30 hover:bg-expense/15"
                : "bg-warning/10 border border-warning/30 hover:bg-warning/15"
            }`}
          >
            <div className={`p-2 rounded-lg ${isOverdue ? "bg-expense/20" : "bg-warning/20"}`}>
              {isOverdue ? (
                <FontAwesomeIcon icon={iconAlertTriangle} className="w-5 h-5 text-expense" />
              ) : (
                <FontAwesomeIcon icon={iconWrench} className="w-5 h-5 text-warning" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-bold ${isOverdue ? "text-expense" : "text-warning"}`}>
                {isOverdue ? "Atenção" : "Manutenção Próxima"}: {alert.service.serviceName}
                {isOverdue ? " Vencido!" : ""}
              </p>
              <p className="text-xs text-muted-foreground">
                {alert.vehicle.brand} {alert.vehicle.model} • {alert.vehicle.plate}
                {isOverdue
                  ? ` • ${Math.abs(Math.round(alert.kmRemaining))} km além do limite`
                  : ` • Faltam ${Math.round(alert.kmRemaining)} km`}
              </p>
            </div>
            <FontAwesomeIcon icon={iconChevronRight} className="w-4 h-4 text-muted-foreground shrink-0" />
          </div>
        );
      })}
    </section>
  );
}
