import { forwardRef } from "react";

/**
 * VehiclesIcon — Front-view truck with avatar microbadge.
 *
 * Design language:
 *   • outline / geometric / 24×24 grid
 *   • strokeWidth 1.75 (matches app icon family)
 *   • badge = small person silhouette (top-right), suggesting
 *     responsible driver / owner — integrated, not a second drawing
 *   • same badge position / size logic as OperationIcon
 */
const VehiclesIcon = forwardRef<SVGSVGElement, React.SVGProps<SVGSVGElement>>(
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
      <title>Veículos</title>

      {/* ── Truck body — front view ── */}
      <rect x="3" y="9" width="15" height="9" rx="1.5" />

      {/* ── Windshield ── */}
      <path d="M6 9V7.5A2 2 0 0 1 8 5.5h5a2 2 0 0 1 2 2V9" />

      {/* ── Bumper ── */}
      <line x1="5" y1="18" x2="16" y2="18" />

      {/* ── Headlights ── */}
      <rect x="4" y="13.5" width="2" height="1.5" rx="0.5" />
      <rect x="15" y="13.5" width="2" height="1.5" rx="0.5" />

      {/* ── Avatar microbadge (top-right) — head + shoulders ── */}
      <circle cx="20" cy="4" r="1.5" />
      <path d="M17.5 8.5a2.5 2.5 0 0 1 5 0" />
    </svg>
  ),
);

VehiclesIcon.displayName = "VehiclesIcon";
export { VehiclesIcon };
