import { useAuth } from "@/context/auth-context";
import { isApprovedAccessProfile } from "@/features/access/accessTypes";
import { useAccessProfile } from "@/features/access/useAccessProfile";
import { isDevPreviewActive } from "@/lib/devPreview";
import { FontAwesomeIcon, iconRefreshCw } from "@/lib/icons";
import { Navigate, useLocation } from "react-router-dom";

function LoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  );
}

function AccessCheckErrorScreen({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 text-center">
      <div className="max-w-sm rounded-3xl border border-border/70 bg-secondary/40 p-6 shadow-2xl shadow-primary/5">
        <p className="text-base font-black text-foreground">Não foi possível verificar seu acesso.</p>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Isso pode ser uma falha temporária de conexão. Verifique a internet e tente novamente.
        </p>
        <button
          type="button"
          onClick={onRetry}
          className="mt-5 inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-3 text-sm font-black text-primary-foreground shadow-lg shadow-primary/20 transition-transform active:scale-[0.98]"
        >
          <FontAwesomeIcon icon={iconRefreshCw} aria-hidden="true" className="h-4 w-4" />
          Tentar novamente
        </button>
      </div>
    </div>
  );
}

export function AccessGuard({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const location = useLocation();
  const accessProfileQuery = useAccessProfile(user?.id);

  if (authLoading) {
    return <LoadingScreen />;
  }

  // Dev preview bypass — only works when VITE_ENABLE_DEV_PREVIEW=true
  if (!user && isDevPreviewActive()) {
    return <>{children}</>;
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (accessProfileQuery.isLoading) {
    return <LoadingScreen />;
  }

  if (accessProfileQuery.isError && !isApprovedAccessProfile(accessProfileQuery.data)) {
    return <AccessCheckErrorScreen onRetry={() => void accessProfileQuery.refetch()} />;
  }

  if (!isApprovedAccessProfile(accessProfileQuery.data)) {
    return <Navigate to="/aguardando" replace state={{ from: location }} />;
  }

  return <>{children}</>;
}
