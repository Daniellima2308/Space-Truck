import { useNavigate } from "react-router-dom";
import { isDevPreviewActive, deactivateDevPreview } from "@/lib/devPreview";
import { FontAwesomeIcon, iconX } from "@/lib/icons";

/**
 * Floating badge shown when dev-preview mode is active.
 * Provides a clear visual indicator and a button to exit.
 */
export function DevPreviewBadge() {
  const navigate = useNavigate();

  if (!isDevPreviewActive()) return null;

  const handleExit = () => {
    deactivateDevPreview();
    navigate("/login", { replace: true });
  };

  return (
    <div role="status" aria-live="polite" aria-label="Modo preview de desenvolvimento ativo" className="fixed top-2 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-yellow-500/90 text-yellow-950 text-[11px] font-semibold rounded-full pl-3 pr-1.5 py-1 shadow-lg backdrop-blur-sm">
      <span>Modo preview</span>
      <button
        onClick={handleExit}
        className="flex items-center justify-center w-5 h-5 rounded-full bg-yellow-950/20 hover:bg-yellow-950/40 transition-colors"
        title="Sair do modo preview"
      >
        <FontAwesomeIcon icon={iconX} className="w-3 h-3" />
      </button>
    </div>
  );
}
