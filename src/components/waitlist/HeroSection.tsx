import { FontAwesomeIcon, iconTruck, iconCheckCircle } from "@/lib/icons";
import { PhoneMockup } from "./PhoneMockup";
import { WaitlistForm } from "./WaitlistForm";

interface HeroSectionProps {
  headline: string;
  subtitle: string;
  ctaLabel: string;
}

export function HeroSection({ headline, subtitle, ctaLabel }: HeroSectionProps) {
  return (
    <section className="relative overflow-hidden">
      {/* Glow radial atrás do hero */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-0 -z-10 h-[600px] w-[800px] -translate-x-1/2 rounded-full bg-primary/10 blur-[120px]"
      />

      <div className="container mx-auto px-4 pb-12 pt-8 sm:pt-12 lg:pt-16">
        {/* Logo + badge */}
        <div className="mb-8 flex items-center justify-between sm:mb-12">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-primary/30 bg-primary/10 text-primary">
              <FontAwesomeIcon icon={iconTruck} className="h-4 w-4" />
            </div>
            <span className="font-mono text-sm font-bold tracking-tight text-foreground">
              SPACE TRUCK
            </span>
          </div>
          <span className="hidden items-center gap-1.5 rounded-full border border-border/60 bg-card/50 px-3 py-1 text-[11px] font-medium text-muted-foreground sm:inline-flex">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
            </span>
            Beta privado em construção
          </span>
        </div>

        <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-12">
          {/* Coluna esquerda: copy + form */}
          <div className="order-2 lg:order-1">
            {/* Eyebrow chip */}
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-primary">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              Lista de espera aberta
            </div>

            <h1 className="text-balance text-3xl font-extrabold leading-tight tracking-tight text-foreground sm:text-4xl lg:text-5xl">
              {headline}
            </h1>

            <p className="mt-4 max-w-xl text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg">
              {subtitle}
            </p>

            {/* Trust strip */}
            <ul className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
              <TrustItem>100% gratuito no beta</TrustItem>
              <TrustItem>Sem cartão</TrustItem>
              <TrustItem>Cancele quando quiser</TrustItem>
            </ul>

            <div className="mt-6 max-w-md">
              <WaitlistForm ctaLabel={ctaLabel} />
            </div>
          </div>

          {/* Coluna direita: mockup */}
          <div className="order-1 lg:order-2">
            <div className="relative">
              {/* Grid pattern atrás do celular (sutil) */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 -z-10 [background-image:linear-gradient(hsl(var(--border)/0.4)_1px,transparent_1px),linear-gradient(90deg,hsl(var(--border)/0.4)_1px,transparent_1px)] [background-size:32px_32px] [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]"
              />
              <PhoneMockup />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function TrustItem({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-center gap-1.5 text-xs sm:text-sm">
      <FontAwesomeIcon icon={iconCheckCircle} className="h-3.5 w-3.5 text-primary" />
      <span>{children}</span>
    </li>
  );
}
