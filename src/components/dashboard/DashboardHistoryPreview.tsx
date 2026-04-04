import { useNavigate } from "react-router-dom";
import { TripHistoryList } from "@/components/TripHistoryList";
import { Trip } from "@/types";
import { FontAwesomeIcon, iconHistory, iconArrowRight, iconPlus } from "@/lib/icons";

interface DashboardHistoryPreviewProps {
  trips: Trip[];
  hasHistory: boolean;
}

export function DashboardHistoryPreview({ trips, hasHistory }: DashboardHistoryPreviewProps) {
  const navigate = useNavigate();

  return (
    <section>
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <FontAwesomeIcon icon={iconHistory} className="w-3.5 h-3.5 text-muted-foreground" />
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest">
            Últimas viagens finalizadas
          </h2>
        </div>
        {hasHistory && (
          <button
            onClick={() => navigate("/history")}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Ver tudo <FontAwesomeIcon icon={iconArrowRight} className="w-3 h-3" />
          </button>
        )}
      </div>
      {hasHistory ? (
        <>
          <p className="text-xs text-muted-foreground mb-3">
            Independente do filtro de período acima
          </p>
          <TripHistoryList trips={trips} />
        </>
      ) : (
        <div className="gradient-card rounded-xl p-5 text-center space-y-3">
          <p className="text-sm font-medium">Nenhuma viagem finalizada ainda</p>
          <p className="text-xs text-muted-foreground">
            Ao finalizar sua primeira viagem ela aparecerá aqui.
          </p>
          <button
            onClick={() => navigate("/new-trip")}
            className="mx-auto flex items-center gap-1.5 px-4 py-2 rounded-lg bg-profit/10 text-profit hover:bg-profit/20 transition-colors text-xs font-bold"
          >
            <FontAwesomeIcon icon={iconPlus} className="w-3.5 h-3.5" /> Iniciar primeira viagem
          </button>
        </div>
      )}
    </section>
  );
}
