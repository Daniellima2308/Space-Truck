import { cn } from "@/lib/utils";

interface VeiculosIconProps {
  className?: string;
  size?: number;
}

/**
 * Composite icon: truck (front view) + avatar/driver — represents Veículos/Meus Veículos.
 * Designed as a single unified SVG symbol, not two icons side by side.
 */
export function VeiculosIcon({ className, size = 20 }: VeiculosIconProps) {
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
      {/* Truck front body */}
      <rect x="4" y="10" width="16" height="8" rx="1.25" />
      {/* Windshield */}
      <path d="M6 10V8a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v2" />
      {/* Left wheel */}
      <circle cx="7.5" cy="18" r="1.5" />
      {/* Right wheel */}
      <circle cx="16.5" cy="18" r="1.5" />
      {/* Headlights */}
      <rect x="5" y="13" width="3" height="2" rx="0.4" strokeWidth="1.3" />
      <rect x="16" y="13" width="3" height="2" rx="0.4" strokeWidth="1.3" />
      {/* Driver avatar — head (small circle in windshield center) */}
      <circle cx="12" cy="7.5" r="1.5" strokeWidth="1.4" />
      {/* Driver avatar — shoulders suggestion */}
      <path d="M10 10c0-1.1.9-2 2-2s2 .9 2 2" strokeWidth="1.3" />
    </svg>
  );
}
