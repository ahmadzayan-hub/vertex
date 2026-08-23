import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

import { EmptyState } from '@/components/common/EmptyState';
import { useLanguage } from '@/hooks/useLanguage';

interface Props {
  data: Array<{ status: string; count: number }>;
}

const COLORS: Record<string, string> = {
  pending: '#f59e0b',
  approved: '#10b981',
  conditional: '#6366f1',
  rejected: '#ef4444',
  unknown: '#94a3b8',
};

export function SubmissionsByStatusChart({ data }: Props) {
  const { t } = useLanguage();
  if (data.length === 0) {
    return <EmptyState title={t('dashboard.widgets.submissionsByStatus')} description="-" />;
  }
  const localized = data.map((d) => ({
    ...d,
    label: t(`submission.approvalStatus.${d.status}`, d.status),
  }));
  return (
    <div style={{ width: '100%', height: 220 }}>
      <ResponsiveContainer>
        <PieChart>
          <Pie
            data={localized}
            dataKey="count"
            nameKey="label"
            innerRadius={50}
            outerRadius={80}
            paddingAngle={2}
          >
            {localized.map((entry) => (
              <Cell key={entry.status} fill={COLORS[entry.status] ?? '#94a3b8'} />
            ))}
          </Pie>
          <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }} />
          <Legend verticalAlign="bottom" height={24} wrapperStyle={{ fontSize: 12 }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
