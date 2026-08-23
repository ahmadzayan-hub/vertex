import type { TrafficLight } from '@/types';

interface Props {
  label: string;
  value: string;
  hint?: string;
  trafficLight?: TrafficLight;
  ariaLabel?: string;
}

const RING: Record<TrafficLight, string> = {
  green: 'ring-emerald-200 bg-emerald-50 text-emerald-700',
  amber: 'ring-amber-200 bg-amber-50 text-amber-800',
  red: 'ring-red-200 bg-red-50 text-red-700',
};

const DOT: Record<TrafficLight, string> = {
  green: 'bg-emerald-500',
  amber: 'bg-amber-500',
  red: 'bg-red-500',
};

export function StatCard({ label, value, hint, trafficLight = 'green', ariaLabel }: Props) {
  return (
    <div
      role="group"
      aria-label={ariaLabel ?? label}
      className="vertex-card p-4"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
          {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
        </div>
        <span
          aria-hidden="true"
          className={`inline-flex h-8 w-8 items-center justify-center rounded-full ring-2 ${RING[trafficLight]}`}
        >
          <span className={`h-2.5 w-2.5 rounded-full ${DOT[trafficLight]}`} />
        </span>
      </div>
    </div>
  );
}
