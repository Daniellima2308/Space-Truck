import { useEffect, useState } from "react";
import { HeroSection } from "@/components/waitlist/HeroSection";
import { FeaturesSection } from "@/components/waitlist/FeaturesSection";
import { ScarcitySection } from "@/components/waitlist/ScarcitySection";
import { WaitlistFooter } from "@/components/waitlist/WaitlistFooter";
import { VariationSelector } from "@/components/waitlist/VariationSelector";
import {
  CTAS,
  DEFAULT_VARIATION,
  HEADLINES,
  SUBTITLES,
  type CopyVariation,
} from "@/components/waitlist/copyVariations";

const STORAGE_KEY = "space-truck:waitlist:variation";

function loadVariation(): CopyVariation {
  if (typeof window === "undefined") return DEFAULT_VARIATION;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_VARIATION;
    const parsed = JSON.parse(raw) as Partial<CopyVariation>;
    return {
      headline: parsed.headline ?? DEFAULT_VARIATION.headline,
      subtitle: parsed.subtitle ?? DEFAULT_VARIATION.subtitle,
      cta: parsed.cta ?? DEFAULT_VARIATION.cta,
    };
  } catch {
    return DEFAULT_VARIATION;
  }
}

export default function WaitlistPage() {
  const [variation, setVariation] = useState<CopyVariation>(DEFAULT_VARIATION);

  // Carrega variação salva apenas no client (evita flash) e força tema escuro.
  useEffect(() => {
    setVariation(loadVariation());
    const root = document.documentElement;
    const previous = root.classList.contains("dark");
    root.classList.add("dark");
    return () => {
      if (!previous) root.classList.remove("dark");
    };
  }, []);

  function handleChangeVariation(next: CopyVariation) {
    setVariation(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // ignora falhas de storage
    }
  }

  function scrollToForm() {
    const input = document.getElementById("waitlist-name");
    input?.scrollIntoView({ behavior: "smooth", block: "center" });
    setTimeout(() => input?.focus(), 400);
  }

  const headline = HEADLINES[variation.headline];
  const subtitle = SUBTITLES[variation.subtitle];
  const ctaLabel = CTAS[variation.cta];

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-background text-foreground">
      {/* Background pattern global (estrelas/grid sutis) */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 -z-10 opacity-60 [background-image:radial-gradient(hsl(var(--primary)/0.08)_1px,transparent_1px)] [background-size:24px_24px] [mask-image:linear-gradient(to_bottom,black,transparent_60%)]"
      />

      <HeroSection headline={headline} subtitle={subtitle} ctaLabel={ctaLabel} />
      <FeaturesSection />
      <ScarcitySection ctaLabel={ctaLabel} onCtaClick={scrollToForm} />
      <WaitlistFooter />

      <VariationSelector variation={variation} onChange={handleChangeVariation} />
    </main>
  );
}
