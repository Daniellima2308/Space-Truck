import { FontAwesomeIcon, iconTruckMoving, iconRoute, iconOperacao, iconPlus, type IconDefinition } from "@/lib/icons";

export type HomeHeroScenario = "onboarding" | "active" | "ready-first" | "ready-return";

interface HomeHeroProps {
  scenario: HomeHeroScenario;
  activeTripsCount?: number;
  onCta: () => void;
}

interface HeroContent {
  icon: IconDefinition;
  title: string;
  subtitle: string;
  ctaLabel: string;
  ctaIcon: IconDefinition;
  variant: "default" | "active";
}

const HERO_CONTENT: Record<HomeHeroScenario, HeroContent> = {
  onboarding: {
    icon: iconTruckMoving,
    title: "Bem-vindo ao Space Truck",
    subtitle:
      "Cadastre seu veículo para começar a registrar viagens e controlar seus resultados financeiros.",
    ctaLabel: "Cadastrar Veículo",
    ctaIcon: iconTruckMoving,
    variant: "default",
  },
  active: {
    icon: iconOperacao,
    title: "Você está na estrada",
    subtitle:
      "Viagem em andamento. Acompanhe os detalhes abaixo e finalize quando chegar ao destino.",
    ctaLabel: "Continuar Operação",
    ctaIcon: iconOperacao,
    variant: "active",
  },
  "ready-first": {
    icon: iconRoute,
    title: "Tudo pronto para começar",
    subtitle:
      "Seu veículo está cadastrado. Inicie sua primeira viagem e comece a controlar seus resultados.",
    ctaLabel: "Nova Viagem",
    ctaIcon: iconPlus,
    variant: "default",
  },
  "ready-return": {
    icon: iconTruckMoving,
    title: "Pronto para nova viagem",
    subtitle: "Quando quiser, inicie uma nova operação e acompanhe seu desempenho em tempo real.",
    ctaLabel: "Nova Viagem",
    ctaIcon: iconPlus,
    variant: "default",
  },
};

export function HomeHero({
  scenario,
  activeTripsCount = 0,
  onCta,
}: HomeHeroProps) {
  const content = HERO_CONTENT[scenario];
  const isActive = content.variant === "active";

  return (
    <div
      className={`rounded-2xl p-6 space-y-4 ${
        isActive
          ? "gradient-active-trip glow-profit"
          : "gradient-card border border-border/40"
      }`}
    >
      <div className="flex items-start justify-between">
        <div
          className={`w-12 h-12 rounded-xl flex items-center justify-center ${
            isActive ? "bg-profit/15" : "bg-secondary"
          }`}
        >
          {isActive ? (
            <div className="relative flex items-center justify-center w-6 h-6">
              <div className="w-2 h-2 rounded-full bg-profit animate-pulse-glow absolute -top-1 -right-1" />
              <FontAwesomeIcon icon={content.icon} className="w-6 h-6 text-profit" />
            </div>
          ) : (
            <FontAwesomeIcon icon={content.icon} className="w-6 h-6 text-muted-foreground" />
          )}
        </div>
        {isActive && activeTripsCount > 0 && (
          <span className="text-xs font-semibold text-profit bg-profit/10 px-2.5 py-1 rounded-full">
            {`${activeTripsCount} ${activeTripsCount === 1 ? "viagem ativa" : "viagens ativas"}`}
          </span>
        )}
      </div>

      <div>
        <h2 className="text-base font-bold mb-1">{content.title}</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">{content.subtitle}</p>
      </div>

      <button
        onClick={onCta}
        className="w-full gradient-profit text-primary-foreground rounded-xl p-3.5 flex items-center justify-center gap-2 font-bold text-sm hover:opacity-90 active:scale-[0.98] transition-all"
      >
        <FontAwesomeIcon icon={content.ctaIcon} className="w-4 h-4" />
        {content.ctaLabel}
      </button>
    </div>
  );
}
