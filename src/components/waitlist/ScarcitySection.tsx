import { FontAwesomeIcon, iconShield, iconSparkles, iconMessageCircle } from "@/lib/icons";

const benefits = [
  {
    icon: iconShield,
    title: "Selo de Fundador",
    description: "Os 500 primeiros ganharão o selo permanente de Fundador no perfil.",
  },
  {
    icon: iconSparkles,
    title: "Premium gratuito",
    description: "Acesso a todas as funções premium liberado nos primeiros meses, sem custo.",
  },
  {
    icon: iconMessageCircle,
    title: "Canal direto",
    description: "Linha aberta com os desenvolvedores para sugerir e priorizar funções.",
  },
];

interface ScarcitySectionProps {
  ctaLabel: string;
  onCtaClick: () => void;
}

export function ScarcitySection({ ctaLabel, onCtaClick }: ScarcitySectionProps) {
  return (
    <section className="relative py-16 sm:py-20">
      <div className="container mx-auto px-4">
        <div className="relative mx-auto max-w-5xl overflow-hidden rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/10 via-card/80 to-card/80 p-6 shadow-[0_0_60px_-20px_hsl(var(--primary)/0.4)] sm:p-10">
          {/* Glow corner */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -left-20 -top-20 h-64 w-64 rounded-full bg-primary/20 blur-3xl"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-20 -right-20 h-64 w-64 rounded-full bg-primary/10 blur-3xl"
          />

          <div className="relative">
            <p className="text-xs font-semibold uppercase tracking-widest text-primary">
              Benefícios de pioneiro
            </p>
            <h2 className="mt-2 text-balance text-2xl font-bold leading-tight tracking-tight text-foreground sm:text-3xl lg:text-4xl">
              Por que entrar na lista de espera agora?
            </h2>
            <p className="mt-3 max-w-2xl text-pretty text-sm leading-relaxed text-muted-foreground sm:text-base">
              Os primeiros caminhoneiros a embarcar ganham vantagens exclusivas que não vão se
              repetir depois do lançamento oficial.
            </p>

            <ul className="mt-8 grid gap-4 sm:grid-cols-3">
              {benefits.map((benefit) => (
                <li
                  key={benefit.title}
                  className="rounded-2xl border border-border/60 bg-background/40 p-4 backdrop-blur-sm"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
                    <FontAwesomeIcon icon={benefit.icon} className="h-4 w-4" />
                  </div>
                  <h3 className="mt-3 text-sm font-bold text-foreground">{benefit.title}</h3>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    {benefit.description}
                  </p>
                </li>
              ))}
            </ul>

            <div className="mt-8 flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-muted-foreground sm:text-sm">
                <span className="font-mono font-semibold text-foreground">500</span> vagas com selo
                de Fundador. Depois disso, o benefício é encerrado.
              </p>
              <button
                type="button"
                onClick={onCtaClick}
                className="group relative inline-flex h-11 items-center justify-center rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-[0_0_24px_-6px_hsl(var(--primary)/0.8)] transition hover:shadow-[0_0_32px_-4px_hsl(var(--primary))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 rounded-xl bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 transition group-hover:opacity-100"
                />
                {ctaLabel}
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
