import { useState } from "react";
import { FontAwesomeIcon, iconSparkles, iconX } from "@/lib/icons";
import type { CopyVariation } from "./copyVariations";
import {
  HEADLINE_OPTIONS,
  SUBTITLE_OPTIONS,
  CTA_OPTIONS,
} from "./copyVariations";

interface VariationSelectorProps {
  variation: CopyVariation;
  onChange: (next: CopyVariation) => void;
}

/**
 * Seletor flutuante para testar combinações de copy.
 * Pode ser ocultado em produção via prop ou flag.
 */
export function VariationSelector({ variation, onChange }: VariationSelectorProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {open ? (
        <div className="w-72 rounded-2xl border border-border/80 bg-card/95 p-4 shadow-2xl backdrop-blur-md">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-sm font-bold text-foreground">
              <FontAwesomeIcon icon={iconSparkles} className="h-3.5 w-3.5 text-primary" />
              Variações de copy
            </h3>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Fechar"
              className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground"
            >
              <FontAwesomeIcon icon={iconX} className="h-3 w-3" />
            </button>
          </div>

          <div className="space-y-3">
            <SelectField
              label="Headline"
              value={variation.headline}
              options={HEADLINE_OPTIONS}
              onChange={(value) => onChange({ ...variation, headline: value })}
            />
            <SelectField
              label="Subtítulo"
              value={variation.subtitle}
              options={SUBTITLE_OPTIONS}
              onChange={(value) => onChange({ ...variation, subtitle: value })}
            />
            <SelectField
              label="CTA"
              value={variation.cta}
              options={CTA_OPTIONS}
              onChange={(value) => onChange({ ...variation, cta: value })}
            />
          </div>

          <p className="mt-3 text-[10px] leading-relaxed text-muted-foreground">
            Suas escolhas ficam salvas no navegador para testes A/B rápidos.
          </p>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex h-11 items-center gap-2 rounded-full border border-border/80 bg-card/90 px-4 text-xs font-semibold text-foreground shadow-lg backdrop-blur-md transition hover:border-primary/40 hover:text-primary"
          aria-label="Abrir seletor de variações"
        >
          <FontAwesomeIcon icon={iconSparkles} className="h-3.5 w-3.5 text-primary" />
          Testar variações
        </button>
      )}
    </div>
  );
}

interface SelectFieldProps<T extends string> {
  label: string;
  value: T;
  options: readonly { id: T; preview: string }[];
  onChange: (value: T) => void;
}

function SelectField<T extends string>({ label, value, options, onChange }: SelectFieldProps<T>) {
  return (
    <div className="space-y-1.5">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {options.map((option) => {
          const active = option.id === value;
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => onChange(option.id)}
              title={option.preview}
              className={
                active
                  ? "rounded-md border border-primary/40 bg-primary/15 px-2.5 py-1 text-[11px] font-semibold text-primary"
                  : "rounded-md border border-border bg-background px-2.5 py-1 text-[11px] font-medium text-muted-foreground transition hover:border-primary/30 hover:text-foreground"
              }
            >
              {option.id}
            </button>
          );
        })}
      </div>
    </div>
  );
}
