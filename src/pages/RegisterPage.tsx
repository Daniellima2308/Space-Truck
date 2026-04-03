import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/context/auth-context";
import { Navigate } from "react-router-dom";
import { toast } from "@/hooks/use-toast";

const RegisterPage = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
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

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !name) return;
    setSubmitting(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: name },
        emailRedirectTo: window.location.origin,
      },
    });
    if (error) {
      toast({ title: "Erro ao criar conta", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Conta criada!", description: "Verifique seu e-mail para confirmar a conta." });
      navigate("/login");
    }
    setSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm space-y-10">
        {/* Brand hero */}
        <div className="flex flex-col items-center pt-2">
          <img
            src="/branding/space-truck/logo/space-truck-logo-principal-com-slogan-branco.png"
            alt="Space Truck"
            className="h-24 w-auto drop-shadow-[0_4px_32px_rgba(0,0,0,0.4)]"
          />
          <p className="text-sm text-muted-foreground mt-6">Crie sua conta para começar</p>
        </div>

        <form onSubmit={handleRegister} className="space-y-3">
          <input
            type="text"
            placeholder="Seu nome completo"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input-field w-full text-base py-3.5 rounded-xl"
          />
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
            placeholder="Senha (mínimo 6 caracteres)"
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
              Criar conta gratuita
            </button>
          </div>
        </form>

        <div className="text-center pb-4">
          <Link to="/login" className="text-sm text-muted-foreground hover:text-foreground">
            Já tem conta? <span className="text-primary font-semibold">Entrar</span>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
