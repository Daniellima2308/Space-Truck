import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  User,
  Lock,
  Bell,
  Moon,
  Info,
  MessageCircle,
  Lightbulb,
  LogOut,
  ChevronRight,
  Shield,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

// --- Sub-components ---

function SectionHeader({ label }: { label: string }) {
  return (
    <div className="px-1 pb-1 pt-3">
      <span className="text-[10px] font-semibold tracking-widest uppercase text-muted-foreground/70">
        {label}
      </span>
    </div>
  );
}

function MenuRow({
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
      className={`w-full flex items-center gap-3 px-4 py-3.5 hover:bg-accent/60 active:bg-accent transition-colors ${danger ? "text-expense" : "text-foreground"}`}
    >
      <span
        className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
          danger ? "bg-expense/10" : "bg-secondary"
        }`}
      >
        <Icon className={`w-4 h-4 ${danger ? "text-expense" : "text-muted-foreground"}`} />
      </span>
      <div className="flex-1 text-left min-w-0">
        <p className={`text-sm font-medium leading-tight ${danger ? "text-expense" : "text-foreground"}`}>
          {label}
        </p>
        {sublabel && (
          <p className="text-[11px] text-muted-foreground leading-tight mt-0.5 truncate">{sublabel}</p>
        )}
      </div>
      {!danger && <ChevronRight className="w-4 h-4 text-muted-foreground/50 flex-shrink-0" />}
    </button>
  );
}

function MenuCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-card rounded-2xl overflow-hidden divide-y divide-border/60">
      {children}
    </div>
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
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 pb-safe"
      onClick={onClose}
    >
      <div
        className="bg-card rounded-t-2xl w-full max-w-lg p-6 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-base font-bold">{title}</h3>
        {children}
      </div>
    </div>
  );
}

// --- Main Page ---

const MorePage = () => {
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

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  const userEmail = user?.email ?? "";
  const userName = user?.user_metadata?.full_name ?? userEmail.split("@")[0] ?? "Motorista";

  return (
    <div className="min-h-screen bg-background pb-28">
      {/* Header */}
      <header className="px-4 pt-10 pb-4">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Mais</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Central do app</p>
      </header>

      {/* User identity block */}
      <div className="px-4 mb-2">
        <div className="bg-card rounded-2xl p-4 flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
            <User className="w-6 h-6 text-muted-foreground" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground truncate">{userName}</p>
            <p className="text-[11px] text-muted-foreground truncate">{userEmail}</p>
          </div>
          <button
            onClick={() => navigate("/perfil")}
            className="px-3 py-1.5 rounded-lg bg-secondary text-xs font-semibold text-foreground hover:bg-accent transition-colors flex-shrink-0"
          >
            Perfil
          </button>
        </div>
      </div>

      {/* Future assistant slot — neutral, reserved for future feature */}
      <div className="px-4 mb-1">
        <div className="bg-card rounded-2xl px-4 py-3.5 flex items-center gap-3 opacity-60">
          <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
            <span className="text-base">✦</span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-medium text-muted-foreground">Assistente — em breve</p>
          </div>
        </div>
      </div>

      <div className="px-4 space-y-1">
        {/* Conta e acesso */}
        <SectionHeader label="Conta e acesso" />
        <MenuCard>
          <MenuRow
            icon={User}
            label="Meu Perfil"
            sublabel="Nome, foto e dados pessoais"
            onClick={() => navigate("/perfil")}
          />
          <MenuRow
            icon={Lock}
            label="Alterar Senha"
            sublabel="Segurança da sua conta"
            onClick={() => setShowPassword(true)}
          />
          <MenuRow
            icon={Shield}
            label="Privacidade e Segurança"
            sublabel="Gerenciar acesso e permissões"
            onClick={() => navigate("/perfil")}
          />
        </MenuCard>

        {/* Preferências */}
        <SectionHeader label="Preferências" />
        <MenuCard>
          <MenuRow
            icon={Bell}
            label="Notificações"
            sublabel="Alertas de manutenção e viagens"
            onClick={() => navigate("/perfil")}
          />
          <MenuRow
            icon={Moon}
            label="Aparência"
            sublabel="Tema do aplicativo"
            onClick={() => navigate("/perfil")}
          />
        </MenuCard>

        {/* Suporte */}
        <SectionHeader label="Suporte" />
        <MenuCard>
          <MenuRow
            icon={MessageCircle}
            label="Falar com o Suporte"
            sublabel="Dúvidas e problemas"
            onClick={() => setShowSupport(true)}
          />
          <MenuRow
            icon={Lightbulb}
            label="Enviar Sugestão"
            sublabel="Sua ideia pode mudar o app"
            onClick={() => setShowSuggestion(true)}
          />
          <MenuRow
            icon={Info}
            label="Sobre o Space Truck"
            sublabel="Versão, política e termos"
            onClick={() => navigate("/perfil")}
          />
        </MenuCard>

        {/* Sair */}
        <SectionHeader label="" />
        <MenuCard>
          <MenuRow icon={LogOut} label="Sair da Conta" onClick={handleSignOut} danger />
        </MenuCard>

        <div className="py-4 text-center">
          <p className="text-[10px] text-muted-foreground/50 tracking-wide">Space Truck · Gestão operacional</p>
        </div>
      </div>

      {/* Password Modal */}
      {showPassword && (
        <Modal title="Alterar Senha" onClose={() => { setShowPassword(false); setNewPassword(""); }}>
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
        <Modal title="Falar com o Suporte" onClose={() => { setShowSupport(false); setSupportMsg(""); }}>
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
        <Modal title="Caixa de Sugestões" onClose={() => { setShowSuggestion(false); setSuggestionMsg(""); }}>
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
};

export default MorePage;
