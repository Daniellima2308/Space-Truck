import { FontAwesomeIcon, iconWallet, iconRoute, iconTruckMoving, type IconDefinition } from "@/lib/icons";

interface Feature {
  icon: IconDefinition;
  title: string;
  description: string;
}

const features: Feature[] = [
  {
    icon: iconWallet,
    title: "Gestão de despesas",
    description:
      "Saiba o custo real de cada viagem. Controle pedágio, diesel e manutenção sem complicação.",
  },
  {
    icon: iconRoute,
    title: "Organização de rotas",
    description:
      "Seus fretes centralizados. Histórico completo do que foi carregado e onde foi entregue.",
  },
  {
    icon: iconTruckMoving,
    title: "Feito para a estrada",
    description:
      "Interface rápida, modo escuro para não cansar a vista à noite e funcionamento offline.",
  },
];

export function FeaturesSection() {
  return (
    <section className="relative border-t border-border/40 bg-gradient-to-b from-transparent to-card/30 py-16 sm:py-20">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-2xl text-center">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-primary">
            Como vai mudar sua rotina
          </p>
          <h2 className="text-balance text-2xl font-bold leading-tight tracking-tight text-foreground sm:text-3xl lg:text-4xl">
            Três pilares pensados para quem vive na estrada
          </h2>
        </div>

        <div className="mx-auto mt-10 grid max-w-5xl gap-4 sm:mt-14 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
          {features.map((feature) => (
            <FeatureCard key={feature.title} feature={feature} />
          ))}
        </div>
      </div>
    </section>
  );
}

function FeatureCard({ feature }: { feature: Feature }) {
  return (
    <article className="group relative overflow-hidden rounded-2xl border border-border/60 bg-card/60 p-6 backdrop-blur-sm transition hover:border-primary/40 hover:bg-card/80">
      {/* Glow no hover */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-primary/10 opacity-0 blur-2xl transition-opacity group-hover:opacity-100"
      />

      <div className="relative flex h-12 w-12 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
        <FontAwesomeIcon icon={feature.icon} className="h-5 w-5" />
      </div>

      <h3 className="mt-4 text-lg font-bold text-foreground">{feature.title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{feature.description}</p>
    </article>
  );
}
