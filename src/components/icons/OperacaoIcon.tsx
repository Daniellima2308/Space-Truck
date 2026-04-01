import { cn } from "@/lib/utils";

interface OperacaoIconProps {
  className?: string;
  size?: number;
}

/**
 * Composite icon: truck (side view) + dollar sign — represents Operação (trip/revenue management).
 * Designed as a single unified SVG symbol, not two icons side by side.
 */
export function OperacaoIcon({ className, size = 20 }: OperacaoIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn(className)}
      aria-hidden="true"
    >
      {/* Cargo body */}
      <rect x="2" y="10" width="10" height="6" rx="0.75" />
      {/* Cab */}
      <path d="M12 16V11l3-3h3a2 2 0 0 1 2 2v6H12z" />
      {/* Rear wheel */}
      <circle cx="5.5" cy="16" r="1.5" />
      {/* Front wheel */}
      <circle cx="17" cy="16" r="1.5" />
      {/* Dollar sign inside cab area */}
      <line x1="16.5" y1="9.5" x2="16.5" y2="14" strokeWidth="1.3" />
      <path d="M18 10.5c-.35-.4-.9-.6-1.5-.6s-1.5.3-1.5 1c0 .7.9.9 1.5 1s1.5.35 1.5 1.05c0 .7-.9 1-1.5 1s-1.15-.2-1.5-.6" strokeWidth="1.3" />
    </svg>
  );
}
