import {
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';

import { EmptyState } from '@/components/common/EmptyState';
import { useLanguage } from '@/hooks/useLanguage';
import type { Severity } from '@/types';

const SEVERITY_COLOR: Record<string, string> = {
  critical: '#dc2626',
  high: '#ef4444',
  medium: '#f59e0b',
  low: '#22c55e',
  info: '#4f46e5',
};

const TYPE_COLOR: Record<string, string> = {
  compliance_pass: '#10b981',
  compliance_fail: '#ef4444',
  alert: '#f59e0b',
  insight: '#4f46e5',
  recommendation: '#6366f1',
};

interface Props {
  byProject: Array<{ projectId: string; projectName: string; score: number }>;
  byFindingType: Array<{ type: string; count: number }>;
  bySeverity: Array<{ severity: Severity; count: number }>;
  trend: Array<{ week: string; count: number }>;
}

/**
 * All recharts usage lives here. Loading this component pulls the
 * `charts` chunk (~110 KB gzip). The Analytics page renders the KPI
 * cards from its own tiny chunk first, then Suspense-mounts this one
 * so the summary is interactive while the visualisations stream in.
 */
export default function AnalyticsCharts({ byProject, byFindingType, bySeverity, trend }: Props) {
  const { t } = useLanguage();

  const byFindingTypeLocalized = byFindingType.map((r) => ({
    ...r,
    label: t(`findingType.${r.type}`, r.type),
    color: TYPE_COLOR[r.type] ?? '#94a3b8',
  }));
  const bySeverityLocalized = bySeverity.map((r) => ({
    ...r,
    label: t(`severity.${r.severity}`, r.severity),
    color: SEVERITY_COLOR[r.severity] ?? '#94a3b8',
  }));

  return (
    <>
      <div className="vertex-card p-4">
        <h3 className="mb-3 text-sm font-semibold text-slate-700">
          {t('analyticsPage.widgets.byProject')}
        </h3>
        {byProject.length === 0 ? (
          <EmptyState title={t('analyticsPage.widgets.byProjectEmpty')} />
        ) : (
          <div style={{ width: '100%', height: 240 }}>
            <ResponsiveContainer>
              <BarChart
                data={byProject.slice(0, 12)}
                layout="vertical"
                margin={{ top: 5, right: 16, bottom: 5, left: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="projectName" width={140} tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }} />
                <Bar dataKey="score" fill="#4f46e5" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="vertex-card p-4">
          <h3 className="mb-3 text-sm font-semibold text-slate-700">
            {t('analyticsPage.widgets.byFindingType')}
          </h3>
          <div style={{ width: '100%', height: 240 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={byFindingTypeLocalized}
                  dataKey="count"
                  nameKey="label"
                  innerRadius={40}
                  outerRadius={80}
                  paddingAngle={2}
                >
                  {byFindingTypeLocalized.map((entry) => (
                    <Cell key={entry.type} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }} />
                <Legend verticalAlign="bottom" height={20} wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="vertex-card p-4">
          <h3 className="mb-3 text-sm font-semibold text-slate-700">
            {t('analyticsPage.widgets.bySeverity')}
          </h3>
          <div style={{ width: '100%', height: 240 }}>
            <ResponsiveContainer>
              <BarChart data={bySeverityLocalized} margin={{ top: 8, right: 16, bottom: 0, left: -8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {bySeverityLocalized.map((entry) => (
                    <Cell key={entry.severity} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="vertex-card p-4">
        <h3 className="mb-3 text-sm font-semibold text-slate-700">
          {t('analyticsPage.widgets.trend')}
        </h3>
        {trend.length === 0 ? (
          <EmptyState title="-" />
        ) : (
          <div style={{ width: '100%', height: 220 }}>
            <ResponsiveContainer>
              <LineChart data={trend} margin={{ top: 8, right: 16, bottom: 0, left: -8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="week" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }} />
                <Line type="monotone" dataKey="count" stroke="#4f46e5" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </>
  );
}
