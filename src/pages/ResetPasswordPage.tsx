import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import { useTheme } from "next-themes";

const ResetPasswordPage = () => {
  const navigate = useNavigate();
  const { resolvedTheme } = useTheme();
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [ready, setReady] = useState(false);

  const logoSrc = resolvedTheme === "dark"
    ? "/branding/space-truck/logo/space-truck-logo-principal-com-slogan-branco.png"
    : "/branding/space-truck/logo/space-truck-logo-principal-com-slogan-preto.png";

  useEffect(() => {
    // Check for recovery token in URL hash
    const hash = window.location.hash;
    if (hash.includes("type=recovery")) {
      setReady(true);
    } else {
      // Listen for PASSWORD_RECOVERY event
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
        if (event === "PASSWORD_RECOVERY") {
          setReady(true);
        }
      });
      return () => subscription.unsubscribe();
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password || password.length < 6) return;
    setSubmitting(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Senha alterada!", description: "Sua senha foi atualizada com sucesso." });
      navigate("/");
    }
    setSubmitting(false);
  };

  if (!ready) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6">
        <p className="text-muted-foreground">Aguardando verificação...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm space-y-10">
        <div className="flex flex-col items-center pt-2">
          <img
            src={logoSrc}
            alt="Space Truck"
            className="h-20 w-auto drop-shadow-[0_4px_32px_rgba(0,0,0,0.4)]"
          />
          <p className="text-sm text-muted-foreground mt-6">Defina sua nova senha</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="password"
            placeholder="Nova senha (mínimo 6 caracteres)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input-field w-full text-base py-3.5 rounded-xl"
            autoComplete="new-password"
            minLength={6}
          />
          <div className="pt-1">
            <button
              type="submit"
              disabled={submitting}
              className="w-full gradient-profit text-primary-foreground rounded-xl py-3.5 text-base font-bold hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              Salvar nova senha
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
