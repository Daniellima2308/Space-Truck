import { forwardRef } from "react";

/**
 * OperationIcon — Side-view truck with operational-status microbadge.
 *
 * Design language:
 *   • outline / geometric / 24×24 grid
 *   • strokeWidth 1.75 (matches app icon family)
 *   • badge = three small activity bars (top-right), suggesting
 *     status / pulse / monitoring — NOT GPS, NOT money
 *   • badge is visually integrated, not a separate drawing
 */
const OperationIcon = forwardRef<SVGSVGElement, React.SVGProps<SVGSVGElement>>(
  (props, ref) => (
    <svg
      ref={ref}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <title>Operação</title>

      {/* ── Truck body — simplified side-view cargo box ── */}
      <rect x="1" y="10" width="11" height="6" rx="1" />

      {/* ── Cab ── */}
      <path d="M12 10h3l3 3v3h-6v-6z" />

      {/* ── Wheels ── */}
      <circle cx="5" cy="17.5" r="1.5" />
      <circle cx="16" cy="17.5" r="1.5" />

      {/* ── Axle connector ── */}
      <line x1="6.5" y1="16" x2="14.5" y2="16" />

      {/* ── Status microbadge — three vertical activity bars (top-right) ── */}
      <line x1="19" y1="7" x2="19" y2="3" />
      <line x1="21.5" y1="7" x2="21.5" y2="5" />
      <line x1="16.5" y1="7" x2="16.5" y2="5" />
    </svg>
  ),
);

OperationIcon.displayName = "OperationIcon";
export { OperationIcon };
