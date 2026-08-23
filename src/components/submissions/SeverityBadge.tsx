import type { Severity } from '@/types';
import { useLanguage } from '@/hooks/useLanguage';

const STYLES: Record<Severity, string> = {
  critical: 'bg-red-100 text-red-800 ring-red-200',
  high: 'bg-red-50 text-red-700 ring-red-200',
  medium: 'bg-amber-50 text-amber-800 ring-amber-200',
  low: 'bg-slate-50 text-slate-700 ring-slate-200',
  info: 'bg-vertex-50 text-vertex-700 ring-vertex-200',
};

export function SeverityBadge({ severity }: { severity: Severity }) {
  const { t } = useLanguage();
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ${STYLES[severity]}`}
    >
      {t(`severity.${severity}`)}
    </span>
  );
}
