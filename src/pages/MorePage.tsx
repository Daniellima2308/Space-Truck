import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "next-themes";
import { useAuth } from "@/context/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import {
  User,
  Lock,
  Wrench,
  MessageCircle,
  Lightbulb,
  LogOut,
  Wallet,
  Sun,
  Moon,
  Monitor,
  ChevronRight,
  Radio,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export default function MorePage() {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const { user, signOut } = useAuth();

  const [profile, setProfile] = useState<{
    display_name: string | null;
    avatar_url: string | null;
  }>({ display_name: null, avatar_url: null });

  const [showPassword, setShowPassword] = useState(false);
  const [showSupport, setShowSupport] = useState(false);
  const [showSuggestion, setShowSuggestion] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [supportMsg, setSupportMsg] = useState("");
  const [suggestionMsg, setSuggestionMsg] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("display_name, avatar_url")
      .eq("user_id", user.id)
      .single()
      .then(({ data }) => {
        if (data) setProfile(data);
      });
  }, [user]);

  const handleChangePassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      toast({
        title: "Erro",
        description: "A senha deve ter pelo menos 6 caracteres.",
        variant: "destructive",
      });
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Senha alterada com sucesso!" });
      setNewPassword("");
      setShowPassword(false);
    }
    setSubmitting(false);
  };

  const handleSendSupport = async () => {
    if (!supportMsg.trim() || !user) return;
    setSubmitting(true);
    try {
      await supabase.functions.invoke("send-contact-email", {
        body: { subject_type: "Dúvida", message: supportMsg.trim() },
      });
      toast({ title: "Mensagem enviada!", description: "Nossa equipe vai responder em breve." });
      setSupportMsg("");
      setShowSupport(false);
    } catch {
      toast({ title: "Erro ao enviar", description: "Tente novamente.", variant: "destructive" });
    }
    setSubmitting(false);
  };

  const handleSendSuggestion = async () => {
    if (!suggestionMsg.trim() || !user) return;
    setSubmitting(true);
    try {
      await supabase.functions.invoke("send-contact-email", {
        body: { subject_type: "Sugestão", message: suggestionMsg.trim() },
      });
      toast({ title: "Sugestão enviada!", description: "Obrigado pelo feedback!" });
      setSuggestionMsg("");
      setShowSuggestion(false);
    } catch {
      toast({ title: "Erro ao enviar", description: "Tente novamente.", variant: "destructive" });
    }
    setSubmitting(false);
  };

  const initials = (profile.display_name || user?.email || "U").slice(0, 2).toUpperCase();

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="px-4 pt-6 pb-2">
        <h1 className="text-2xl font-black tracking-tight">Mais</h1>
      </header>

      <div className="px-4 space-y-5 pt-3">
        {/* Identity Block */}
        <button
          onClick={() => navigate("/perfil")}
          className="w-full bg-card border border-border rounded-2xl p-4 flex items-center gap-4 hover:bg-accent/40 transition-colors text-left"
        >
          <div className="w-14 h-14 rounded-full bg-primary/15 flex items-center justify-center text-primary text-xl font-black shrink-0 overflow-hidden">
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              initials
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold truncate">{profile.display_name || "Motorista"}</p>
            <p className="text-sm text-muted-foreground truncate">{user?.email}</p>
            <p className="text-xs text-primary mt-0.5 font-medium">Ver perfil completo</p>
          </div>
          <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
        </button>

        {/* Conta */}
        <section>
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2 px-1">
            Conta
          </h2>
          <div className="bg-card border border-border rounded-2xl divide-y divide-border overflow-hidden">
            <MenuItem icon={User} label="Meu Perfil" onClick={() => navigate("/perfil")} />
            <MenuItem icon={Lock} label="Alterar Senha" onClick={() => setShowPassword(true)} />
          </div>
        </section>

        {/* Ferramentas */}
        <section>
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2 px-1">
            Ferramentas
          </h2>
          <div className="bg-card border border-border rounded-2xl divide-y divide-border overflow-hidden">
            <MenuItem icon={Wrench} label="Manutenção" onClick={() => navigate("/maintenance")} />
            <MenuItem
              icon={Wallet}
              label="Gastos Pessoais"
              onClick={() => navigate("/personal-expenses")}
            />
            <MenuItem icon={Radio} label="PX Digital" onClick={() => navigate("/px")} />
          </div>
        </section>

        {/* Aparência */}
        <section>
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2 px-1">
            Aparência
          </h2>
          <div className="bg-card border border-border rounded-2xl p-4">
            <p className="text-sm font-semibold mb-3">Tema</p>
            <div className="flex gap-2">
              {(
                [
                  { value: "light", label: "Claro", Icon: Sun },
                  { value: "dark", label: "Escuro", Icon: Moon },
                  { value: "system", label: "Auto", Icon: Monitor },
                ] as const
              ).map(({ value, label, Icon }) => (
                <button
                  key={value}
                  onClick={() => setTheme(value)}
                  className={cn(
                    "flex-1 flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border text-xs font-semibold transition-colors",
                    theme === value
                      ? "bg-primary/10 border-primary/30 text-primary"
                      : "border-border text-muted-foreground hover:bg-accent/40"
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Suporte */}
        <section>
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2 px-1">
            Suporte
          </h2>
          <div className="bg-card border border-border rounded-2xl divide-y divide-border overflow-hidden">
            <MenuItem
              icon={MessageCircle}
              label="Falar com Suporte"
              onClick={() => setShowSupport(true)}
            />
            <MenuItem
              icon={Lightbulb}
              label="Enviar Sugestão"
              onClick={() => setShowSuggestion(true)}
            />
          </div>
        </section>

        {/* Sair */}
        <button
          onClick={async () => {
            await signOut();
            navigate("/login");
          }}
          className="w-full bg-destructive/10 hover:bg-destructive/20 text-destructive border border-destructive/20 rounded-2xl p-4 flex items-center justify-center gap-2 text-sm font-bold transition-colors"
        >
          <LogOut className="w-4 h-4" /> Sair da Conta
        </button>
      </div>

      {/* Password Modal */}
      {showPassword && (
        <Modal
          title="Alterar Senha"
          onClose={() => {
            setShowPassword(false);
            setNewPassword("");
          }}
        >
          <input
            type="password"
            placeholder="Nova senha (mínimo 6 caracteres)"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="input-field w-full text-base py-3"
            minLength={6}
          />
          <button
            onClick={handleChangePassword}
            disabled={submitting}
            className="w-full gradient-profit text-primary-foreground rounded-xl py-3 font-bold disabled:opacity-50"
          >
            {submitting ? "Salvando..." : "Alterar Senha"}
          </button>
        </Modal>
      )}

      {/* Support Modal */}
      {showSupport && (
        <Modal
          title="Falar com o Suporte"
          onClose={() => {
            setShowSupport(false);
            setSupportMsg("");
          }}
        >
          <textarea
            placeholder="Descreva sua dúvida ou problema..."
            value={supportMsg}
            onChange={(e) => setSupportMsg(e.target.value)}
            className="input-field w-full min-h-[120px] text-base"
          />
          <button
            onClick={handleSendSupport}
            disabled={submitting || !supportMsg.trim()}
            className="w-full gradient-profit text-primary-foreground rounded-xl py-3 font-bold disabled:opacity-50"
          >
            {submitting ? "Enviando..." : "Enviar Mensagem"}
          </button>
        </Modal>
      )}

      {/* Suggestion Modal */}
      {showSuggestion && (
        <Modal
          title="Caixa de Sugestões"
          onClose={() => {
            setShowSuggestion(false);
            setSuggestionMsg("");
          }}
        >
          <textarea
            placeholder="Compartilhe sua ideia..."
            value={suggestionMsg}
            onChange={(e) => setSuggestionMsg(e.target.value)}
            className="input-field w-full min-h-[120px] text-base"
          />
          <button
            onClick={handleSendSuggestion}
            disabled={submitting || !suggestionMsg.trim()}
            className="w-full bg-warning text-warning-foreground rounded-xl py-3 font-bold disabled:opacity-50"
          >
            {submitting ? "Enviando..." : "Enviar Sugestão"}
          </button>
        </Modal>
      )}
    </div>
  );
}

function MenuItem({
  icon: Icon,
  label,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full px-4 py-3.5 flex items-center gap-3 hover:bg-accent/40 transition-colors text-left"
    >
      <Icon className="w-5 h-5 text-muted-foreground shrink-0" />
      <span className="text-sm font-medium flex-1">{label}</span>
      <ChevronRight className="w-4 h-4 text-muted-foreground" />
    </button>
  );
}

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
      onClick={onClose}
    >
      <div
        className="bg-card border border-border rounded-2xl p-6 w-full max-w-sm space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-bold">{title}</h3>
        {children}
      </div>
    </div>
  );
}
