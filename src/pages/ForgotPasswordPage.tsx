import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import { useBrandAsset } from "@/hooks/use-brand-asset";

const ForgotPasswordPage = () => {
  const logoSrc = useBrandAsset("logoWithSlogan");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setSubmitting(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      setSent(true);
    }
    setSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm space-y-10">
        <div className="flex flex-col items-center pt-2">
          <img
            src={logoSrc}
            alt="Space Truck"
            className="h-20 w-auto drop-shadow-[0_4px_32px_rgba(0,0,0,0.4)]"
          />
          <p className="text-sm text-muted-foreground mt-6">Recuperação de acesso</p>
        </div>

        {sent ? (
          <div className="text-center space-y-5">
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <svg className="w-7 h-7 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
            </div>
            <p className="text-muted-foreground text-sm">Um link de recuperação foi enviado para <strong className="text-foreground">{email}</strong>.</p>
            <Link to="/login" className="text-primary hover:underline font-semibold text-sm">Voltar ao login</Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              type="email"
              placeholder="Digite seu e-mail"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-field w-full text-base py-3.5 rounded-xl"
              autoComplete="email"
            />
            <div className="pt-1">
              <button
                type="submit"
                disabled={submitting}
                className="w-full gradient-profit text-primary-foreground rounded-xl py-3.5 text-base font-bold hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                Enviar link de recuperação
              </button>
            </div>
            <div className="text-center pt-2">
              <Link to="/login" className="text-sm text-muted-foreground hover:text-foreground">Voltar ao login</Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
