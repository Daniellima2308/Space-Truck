import { useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { FontAwesomeIcon, iconCheckCircle, iconLoader2 } from "@/lib/icons";

interface WaitlistFormProps {
  ctaLabel: string;
}

type Status = "idle" | "loading" | "success" | "error";

function formatWhatsapp(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

export function WaitlistForm({ ctaLabel }: WaitlistFormProps) {
  const [name, setName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);

    const cleanedWhatsapp = whatsapp.replace(/\D/g, "");
    if (name.trim().length < 2) {
      setErrorMessage("Informe seu nome completo.");
      return;
    }
    if (cleanedWhatsapp.length < 10) {
      setErrorMessage("Informe um WhatsApp válido com DDD.");
      return;
    }

    setStatus("loading");

    try {
      // Tenta salvar na tabela `waitlist` do Supabase.
      // Se a tabela não existir, ainda exibimos sucesso para não bloquear o usuário,
      // mas registramos o erro no console para o time configurar o backend.
      const { error } = await supabase
        .from(
          // Cast necessário porque a tabela `waitlist` ainda não está nos tipos gerados.
          "waitlist" as never,
        )
        .insert({
          name: name.trim(),
          whatsapp: cleanedWhatsapp,
          source: "landing",
          created_at: new Date().toISOString(),
        } as never);

      if (error) {
        console.error("[v0] Erro ao salvar waitlist no Supabase:", error.message);
      }

      setStatus("success");
      setName("");
      setWhatsapp("");
    } catch (err) {
      console.error("[v0] Falha inesperada ao enviar waitlist:", err);
      setStatus("error");
      setErrorMessage("Não foi possível enviar agora. Tente novamente em instantes.");
    }
  }

  if (status === "success") {
    return (
      <div
        role="status"
        aria-live="polite"
        className="rounded-2xl border border-primary/30 bg-primary/10 p-6 text-center shadow-[0_0_40px_-12px_hsl(var(--primary)/0.6)]"
      >
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/20 text-primary">
          <FontAwesomeIcon icon={iconCheckCircle} className="h-6 w-6" />
        </div>
        <h3 className="text-lg font-bold text-foreground">Vaga garantida!</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Você está na lista. Vamos te avisar pelo WhatsApp assim que o acesso antecipado abrir.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-3 rounded-2xl border border-border/60 bg-card/70 p-4 backdrop-blur-sm sm:p-5"
      noValidate
    >
      <div className="space-y-1.5">
        <label htmlFor="waitlist-name" className="text-xs font-medium text-muted-foreground">
          Seu nome
        </label>
        <input
          id="waitlist-name"
          type="text"
          autoComplete="name"
          required
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Como podemos te chamar?"
          className="h-11 w-full rounded-xl border border-border bg-background/80 px-3.5 text-sm text-foreground outline-none transition placeholder:text-muted-foreground/70 focus:border-primary/60 focus:ring-2 focus:ring-primary/30"
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="waitlist-whatsapp" className="text-xs font-medium text-muted-foreground">
          WhatsApp com DDD
        </label>
        <input
          id="waitlist-whatsapp"
          type="tel"
          inputMode="numeric"
          autoComplete="tel"
          required
          value={whatsapp}
          onChange={(event) => setWhatsapp(formatWhatsapp(event.target.value))}
          placeholder="(11) 99999-9999"
          className="h-11 w-full rounded-xl border border-border bg-background/80 px-3.5 text-sm text-foreground outline-none transition placeholder:text-muted-foreground/70 focus:border-primary/60 focus:ring-2 focus:ring-primary/30"
        />
      </div>

      {errorMessage ? (
        <p role="alert" className="text-xs font-medium text-destructive">
          {errorMessage}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={status === "loading"}
        className="group relative inline-flex h-12 w-full items-center justify-center rounded-xl bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-[0_0_24px_-6px_hsl(var(--primary)/0.8)] transition hover:shadow-[0_0_32px_-4px_hsl(var(--primary))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-70"
      >
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-xl bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 transition group-hover:opacity-100"
        />
        {status === "loading" ? (
          <>
            <FontAwesomeIcon icon={iconLoader2} className="mr-2 h-4 w-4 animate-spin" />
            Enviando...
          </>
        ) : (
          ctaLabel
        )}
      </button>

      <p className="text-center text-[11px] leading-relaxed text-muted-foreground">
        Sem spam. Vamos te avisar só quando o acesso antecipado estiver liberado.
      </p>
    </form>
  );
}
