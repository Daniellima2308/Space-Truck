import { useAuth } from "@/context/auth-context";
import { isApprovedAccessProfile } from "@/features/access/accessTypes";
import { useAccessProfile } from "@/features/access/useAccessProfile";
import { isDevPreviewActive } from "@/lib/devPreview";
import { Navigate, useLocation } from "react-router-dom";

function LoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
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

  if (accessProfileQuery.isLoading || accessProfileQuery.isFetching) {
    return <LoadingScreen />;
  }

  if (accessProfileQuery.isError || !isApprovedAccessProfile(accessProfileQuery.data)) {
    return <Navigate to="/aguardando" replace state={{ from: location }} />;
  }

  return <>{children}</>;
}
