import { useAuth } from "@/context/auth-context";
import { Navigate } from "react-router-dom";
import { isDevPreviewActive } from "@/lib/devPreview";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Dev preview bypass — only works when VITE_ENABLE_DEV_PREVIEW=true
  if (!user && isDevPreviewActive()) {
    return <>{children}</>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
