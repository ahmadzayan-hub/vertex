interface SkeletonProps {
  className?: string;
  rounded?: 'sm' | 'md' | 'lg' | 'full';
  ariaLabel?: string;
}

const RADIUS: Record<Required<SkeletonProps>['rounded'], string> = {
  sm: 'rounded-sm',
  md: 'rounded-md',
  lg: 'rounded-lg',
  full: 'rounded-full',
};

/**
 * Content-shaped shimmering placeholder. Set width via className:
 *   <Skeleton className="h-4 w-24" />
 * Uses aria-busy and role="status" so screen readers announce loading.
 */
export function Skeleton({ className = '', rounded = 'md', ariaLabel }: SkeletonProps) {
  return (
    <span
      role="status"
      aria-busy="true"
      aria-live="polite"
      aria-label={ariaLabel ?? 'Loading'}
      className={`inline-block animate-pulse bg-slate-200/70 ${RADIUS[rounded]} ${className}`}
    />
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" role="status">
      <div className="space-y-2">
        <Skeleton className="block h-6 w-40" />
        <Skeleton className="block h-3 w-72" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="vertex-card space-y-3 p-4">
            <Skeleton className="block h-3 w-16" />
            <Skeleton className="block h-6 w-20" />
            <Skeleton className="block h-3 w-32" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="vertex-card p-4">
            <Skeleton className="block h-3 w-24 mb-3" />
            <Skeleton className="block h-40 w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
