import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "next-themes";
import {
  User,
  Lock,
  Sun,
  Moon,
  Monitor,
  Bell,
  Settings,
  MessageCircle,
  Lightbulb,
  Info,
  LogOut,
  ChevronRight,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

/* ─── Theme Selector ─────────────────────────────────────────────────────── */

function ThemeSelector() {
  const { theme, setTheme } = useTheme();

  const options = [
    { value: "light", label: "Claro", icon: Sun },
    { value: "dark", label: "Escuro", icon: Moon },
    { value: "system", label: "Automático", icon: Monitor },
  ] as const;

  return (
    <div className="flex gap-2 mt-1">
      {options.map(({ value, label, icon: Icon }) => (
        <button
          key={value}
          onClick={() => setTheme(value)}
          className={cn(
            "flex-1 flex flex-col items-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold transition-all border",
            theme === value
              ? "bg-primary/10 border-primary text-primary"
              : "bg-secondary border-border text-muted-foreground hover:text-foreground hover:border-border/80"
          )}
        >
          <Icon className="w-4 h-4" strokeWidth={2} />
          {label}
        </button>
      ))}
    </div>
  );
}

/* ─── List Item ──────────────────────────────────────────────────────────── */

function MenuItem({
  icon: Icon,
  label,
  sublabel,
  onClick,
  danger,
}: {
  icon: LucideIcon;
  label: string;
  sublabel?: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-4 py-3.5 transition-colors text-left",
        danger
          ? "hover:bg-destructive/8 text-destructive"
          : "hover:bg-accent/60"
      )}
    >
      <span
        className={cn(
          "flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center",
          danger ? "bg-destructive/10" : "bg-secondary"
        )}
      >
        <Icon className={cn("w-4 h-4", danger ? "text-destructive" : "text-foreground")} strokeWidth={2} />
      </span>
      <div className="flex-1 min-w-0">
        <span className="text-sm font-medium block">{label}</span>
        {sublabel && (
          <span className="text-xs text-muted-foreground">{sublabel}</span>
        )}
      </div>
      {!danger && <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />}
    </button>
  );
}

/* ─── Section Card ───────────────────────────────────────────────────────── */

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="px-4 pb-1 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
        {title}
      </p>
      <div className="bg-card rounded-2xl border border-border overflow-hidden divide-y divide-border">
        {children}
      </div>
    </div>
  );
}

/* ─── Modal ──────────────────────────────────────────────────────────────── */

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
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 px-4 pb-8"
      onClick={onClose}
    >
      <div
        className="bg-card rounded-2xl p-6 w-full max-w-sm space-y-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-bold">{title}</h3>
        {children}
      </div>
    </div>
  );
}

/* ─── MorePage ───────────────────────────────────────────────────────────── */

export default function MorePage() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  const [showPassword, setShowPassword] = useState(false);
  const [showSupport, setShowSupport] = useState(false);
  const [showSuggestion, setShowSuggestion] = useState(false);

  const [newPassword, setNewPassword] = useState("");
  const [supportMsg, setSupportMsg] = useState("");
  const [suggestionMsg, setSuggestionMsg] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleChangePassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      toast({ title: "Erro", description: "A senha deve ter pelo menos 6 caracteres.", variant: "destructive" });
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

  return (
    <div className="min-h-screen bg-background pb-28">
      {/* Header */}
      <header className="px-4 pt-10 pb-6">
        <h1 className="text-2xl font-bold">Central</h1>
        <p className="text-sm text-muted-foreground mt-1">Conta, configurações e suporte</p>
      </header>

      {/* Bino placeholder slot — future avatar assistant area */}
      <div className="mx-4 mb-6 rounded-2xl border border-dashed border-border bg-card/50 flex items-center gap-4 px-4 py-4 opacity-60">
        <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
          <span className="text-lg">🚛</span>
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">Assistente em breve</p>
          <p className="text-xs text-muted-foreground">Seu co-piloto vai aparecer aqui</p>
        </div>
      </div>

      <div className="px-4 space-y-5">
        {/* Conta */}
        <Section title="Conta">
          <MenuItem
            icon={User}
            label="Minha Conta"
            sublabel="Perfil e dados pessoais"
            onClick={() => navigate("/perfil")}
          />
          <MenuItem
            icon={Lock}
            label="Segurança"
            sublabel="Alterar senha"
            onClick={() => setShowPassword(true)}
          />
        </Section>

        {/* Configurações */}
        <Section title="Configurações">
          <div className="px-4 py-3 space-y-1">
            <div className="flex items-center gap-3 mb-2">
              <span className="flex-shrink-0 w-8 h-8 rounded-lg bg-secondary flex items-center justify-center">
                <Sun className="w-4 h-4 text-foreground" strokeWidth={2} />
              </span>
              <span className="text-sm font-medium">Aparência</span>
            </div>
            <ThemeSelector />
          </div>
          <MenuItem
            icon={Bell}
            label="Notificações"
            sublabel="Em breve"
            onClick={() => {}}
          />
          <MenuItem
            icon={Settings}
            label="Preferências do app"
            sublabel="Em breve"
            onClick={() => {}}
          />
        </Section>

        {/* Suporte */}
        <Section title="Suporte">
          <MenuItem
            icon={MessageCircle}
            label="Falar com o Suporte"
            sublabel="Dúvidas e problemas"
            onClick={() => setShowSupport(true)}
          />
          <MenuItem
            icon={Lightbulb}
            label="Enviar Sugestão"
            sublabel="Ajude a melhorar o app"
            onClick={() => setShowSuggestion(true)}
          />
        </Section>

        {/* Sobre */}
        <Section title="Sobre">
          <MenuItem
            icon={Info}
            label="Sobre o Space Truck"
            sublabel="Versão e informações"
            onClick={() => {}}
          />
        </Section>

        {/* Sair */}
        <Section title="Sessão">
          <MenuItem
            icon={LogOut}
            label="Sair da conta"
            danger
            onClick={async () => {
              await signOut();
              navigate("/login");
            }}
          />
        </Section>
      </div>

      {/* Change Password Modal */}
      {showPassword && (
        <Modal title="🔒 Alterar Senha" onClose={() => { setShowPassword(false); setNewPassword(""); }}>
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
        <Modal title="💬 Falar com o Suporte" onClose={() => { setShowSupport(false); setSupportMsg(""); }}>
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
        <Modal title="💡 Caixa de Sugestões" onClose={() => { setShowSuggestion(false); setSuggestionMsg(""); }}>
          <textarea
            placeholder="Compartilhe sua ideia para melhorar o app..."
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
