import { EmptyState } from '@/components/common/EmptyState';
import { useLanguage } from '@/hooks/useLanguage';

interface Alert {
  id: string;
  label: string;
  detail: string;
  severity: 'critical' | 'high' | 'medium';
}

const SEV: Record<Alert['severity'], string> = {
  critical: 'border-red-200 bg-red-50 text-red-800',
  high: 'border-amber-200 bg-amber-50 text-amber-800',
  medium: 'border-slate-200 bg-slate-50 text-slate-700',
};

interface Props {
  alerts: Alert[];
}

export function AlertsPanel({ alerts }: Props) {
  const { t } = useLanguage();
  if (alerts.length === 0) {
    return <EmptyState title={t('dashboard.widgets.alertsEmpty')} />;
  }
  return (
    <ul className="space-y-2">
      {alerts.map((a) => (
        <li
          key={a.id}
          className={`rounded-md border p-3 text-sm ${SEV[a.severity]}`}
        >
          <p className="font-semibold">{a.label}</p>
          <p className="mt-0.5 text-xs opacity-80">{a.detail}</p>
        </li>
      ))}
    </ul>
  );
}
