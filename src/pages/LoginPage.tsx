import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/context/auth-context";
import { Navigate } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import { useBrandAsset } from "@/hooks/use-brand-asset";
import { isDevPreviewEnabled, activateDevPreview } from "@/lib/devPreview";

const LoginPage = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const logoSrc = useBrandAsset("logoWithSlogan");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (user) return <Navigate to="/" replace />;

  const handleGoogle = async () => {
    setSubmitting(true);
  
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin,
      },
    });

    if (error) {
      toast({
        title: "Erro ao entrar com Google",
        description: error.message,
        variant: "destructive",
      });
    }

    setSubmitting(false);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setSubmitting(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      toast({ title: "Erro ao entrar", description: error.message, variant: "destructive" });
    } else {
      navigate("/");
    }
    setSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm space-y-10">
        {/* Brand hero */}
        <div className="flex flex-col items-center pt-2">
          <img
            src={logoSrc}
            alt="Space Truck"
            className="h-28 w-auto drop-shadow-[0_4px_32px_rgba(0,0,0,0.4)]"
          />
        </div>

        {/* Google */}
        <button
          onClick={handleGoogle}
          disabled={submitting}
          className="w-full flex items-center justify-center gap-3 bg-card border border-border hover:bg-accent/40 text-foreground rounded-2xl py-4 text-base font-semibold transition-colors disabled:opacity-50"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          Continuar com Google
        </button>

        {/* Divider */}
        <div className="flex items-center gap-4">
          <div className="flex-1 h-px bg-border/60" />
          <span className="text-xs text-muted-foreground uppercase tracking-widest font-medium">ou entre com e-mail</span>
          <div className="flex-1 h-px bg-border/60" />
        </div>

        {/* Email form */}
        <form onSubmit={handleLogin} className="space-y-3">
          <input
            type="email"
            placeholder="E-mail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input-field w-full text-base py-3.5 rounded-xl"
            autoComplete="email"
          />
          <input
            type="password"
            placeholder="Senha"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input-field w-full text-base py-3.5 rounded-xl"
            autoComplete="current-password"
          />
          <div className="pt-1">
            <button
              type="submit"
              disabled={submitting}
              className="w-full gradient-profit text-primary-foreground rounded-xl py-3.5 text-base font-bold hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              Acessar minha conta
            </button>
          </div>
        </form>

        {/* Links */}
        <div className="flex flex-col items-center gap-3 text-sm pb-4">
          <Link to="/register" className="text-primary hover:underline font-semibold">
            Criar conta gratuita
          </Link>
          <Link to="/forgot-password" className="text-muted-foreground hover:text-foreground text-xs">
            Esqueci minha senha
          </Link>
        </div>

        {/* Dev preview — only visible when VITE_ENABLE_DEV_PREVIEW=true */}
        {isDevPreviewEnabled() && (
          <div className="flex justify-center pb-6">
            <button
              type="button"
              onClick={() => {
                activateDevPreview();
                navigate("/");
              }}
              aria-label="Ativar modo preview de desenvolvimento"
              className="text-[11px] text-muted-foreground/60 hover:text-muted-foreground border border-border/40 hover:border-border rounded-lg px-3 py-1.5 transition-colors"
            >
              Entrar em modo preview
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default LoginPage;
