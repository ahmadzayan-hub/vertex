interface LogoProps {
  size?: number;
  variant?: 'full' | 'mark';
  className?: string;
  ariaLabel?: string;
}

/**
 * VERTEX brand mark.
 * A rising angle with the vertex point marked in accent amber.
 * The V shape reads as "vertex" (peak) and doubles as the letterform.
 */
export function Logo({ size = 32, variant = 'full', className, ariaLabel = 'VERTEX' }: LogoProps) {
  if (variant === 'mark') {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 48 48"
        role="img"
        aria-label={ariaLabel}
        className={className}
      >
        <defs>
          <linearGradient id="vertex-stroke" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6366f1" />
            <stop offset="100%" stopColor="#4338ca" />
          </linearGradient>
        </defs>
        <path
          d="M8 10 L24 40 L40 10"
          stroke="url(#vertex-stroke)"
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        <circle cx="24" cy="10" r="4.5" fill="#f59e0b" />
      </svg>
    );
  }
  return (
    <span className={`inline-flex items-center gap-2 ${className ?? ''}`}>
      <Logo variant="mark" size={size} ariaLabel="" />
      <span className="text-lg font-bold tracking-tight text-slate-900" aria-label={ariaLabel}>
        VERTEX
      </span>
    </span>
  );
}
