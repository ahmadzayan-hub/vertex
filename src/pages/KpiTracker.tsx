import { useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';

import { AppShell } from '@/components/layout/AppShell';
import { EmptyState } from '@/components/common/EmptyState';
import { DashboardSkeleton } from '@/components/common/Skeleton';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { useProjects } from '@/hooks/useProjects';
import { useKpiTracking } from '@/hooks/useKpiTracking';
import { formatCurrencyAED, formatDate } from '@/utils/formatters';

const WINDOWS = [3, 6, 12] as const;

export default function KpiTracker() {
  const { t, language } = useLanguage();
  const { profile } = useAuth();
  const { projects } = useProjects();
  const [projectId, setProjectId] = useState<string>('');
  const [monthsBack, setMonthsBack] = useState<number>(12);

  const { records, loading, error, totalThisMonth, totalWindow, openForApproval, toggleApproval } =
    useKpiTracking({ projectId: projectId || undefined, monthsBack });

  const canApprove = profile?.role === 'admin';

  const trend = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of records) {
      const key = (r.month ?? '').slice(0, 7);
      if (!key) continue;
      map.set(key, (map.get(key) ?? 0) + Number(r.penalty_amount_aed ?? 0));
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([month, penalty]) => ({ month, penalty }));
  }, [records]);

  const projectName = (pid: string) =>
    projects.find((p) => p.id === pid)?.name ?? t('common.unknown');
  const projectCap = (pid: string) =>
    projects.find((p) => p.id === pid)?.kpi_cap_percent ?? null;

  return (
    <AppShell pageTitle={t('kpiPage.title')}>
      <section aria-labelledby="kpi-heading" className="space-y-6">
        <header className="space-y-1">
          <h2 id="kpi-heading" className="text-2xl font-bold text-slate-900">
            {t('kpiPage.title')}
          </h2>
          <p className="text-sm text-slate-600">{t('kpiPage.subtitle')}</p>
        </header>

        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label htmlFor="kpi-project" className="mb-1 block text-xs font-medium text-slate-600">
              {t('kpiPage.filters.project')}
            </label>
            <select
              id="kpi-project"
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="vertex-input h-9 py-1 text-sm"
            >
              <option value="">{t('kpiPage.filters.allProjects')}</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-1">
            {WINDOWS.map((w) => (
              <button
                key={w}
                type="button"
                onClick={() => setMonthsBack(w)}
                aria-pressed={monthsBack === w}
                className={`rounded-md border px-3 py-1.5 text-xs font-semibold transition ${
                  monthsBack === w
                    ? 'border-vertex-500 bg-vertex-50 text-vertex-800'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                }`}
              >
                {t('kpiPage.filters.monthsBack', { count: w })}
              </button>
            ))}
          </div>
        </div>

        {loading && <DashboardSkeleton />}
        {error && (
          <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            {error}
          </div>
        )}

        {!loading && (
          <>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <SummaryCard
                label={t('kpiPage.totals.thisMonth')}
                value={formatCurrencyAED(totalThisMonth, language)}
              />
              <SummaryCard
                label={t('kpiPage.totals.last12Months')}
                value={formatCurrencyAED(totalWindow, language)}
              />
              <SummaryCard
                label={t('kpiPage.totals.openForApproval')}
                value={String(openForApproval)}
              />
              <SummaryCard
                label={t('kpiPage.totals.kpiCap')}
                value={
                  projectId
                    ? `${projectCap(projectId) ?? '-'}%`
                    : '-'
                }
              />
            </div>

            <div className="vertex-card p-4">
              <h3 className="mb-3 text-sm font-semibold text-slate-700">{t('kpiPage.chart')}</h3>
              {trend.length === 0 ? (
                <EmptyState title={t('kpiPage.empty')} />
              ) : (
                <div style={{ width: '100%', height: 220 }}>
                  <ResponsiveContainer>
                    <BarChart data={trend} margin={{ top: 8, right: 16, bottom: 0, left: -8 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip
                        contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }}
                        formatter={(v: number) => formatCurrencyAED(v, language)}
                      />
                      <Bar dataKey="penalty" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-3 py-2 text-start">{t('kpiPage.table.month')}</th>
                    <th className="px-3 py-2 text-start">{t('kpiPage.table.project')}</th>
                    <th className="px-3 py-2 text-start">{t('kpiPage.table.category')}</th>
                    <th className="px-3 py-2 text-end">{t('kpiPage.table.units')}</th>
                    <th className="px-3 py-2 text-end">{t('kpiPage.table.penalty')}</th>
                    <th className="px-3 py-2 text-start">{t('kpiPage.table.recommended')}</th>
                    <th className="px-3 py-2 text-start">{t('kpiPage.table.approved')}</th>
                    {canApprove && <th className="px-3 py-2 text-start">{t('kpiPage.table.actions')}</th>}
                  </tr>
                </thead>
                <tbody>
                  {records.length === 0 && (
                    <tr>
                      <td colSpan={canApprove ? 8 : 7} className="px-3 py-6 text-center text-xs text-slate-500">
                        {t('kpiPage.empty')}
                      </td>
                    </tr>
                  )}
                  {records.map((r) => (
                    <tr key={r.id} className="border-t border-slate-100 hover:bg-slate-50">
                      <td className="px-3 py-2 text-slate-700">
                        {r.month ? formatDate(r.month, language, { year: 'numeric', month: 'short' }) : '-'}
                      </td>
                      <td className="px-3 py-2 text-slate-700">{projectName(r.project_id)}</td>
                      <td className="px-3 py-2 text-slate-700">{r.kpi_category}</td>
                      <td className="px-3 py-2 text-end tabular-nums text-slate-700">{r.units_triggered}</td>
                      <td className="px-3 py-2 text-end tabular-nums font-semibold text-slate-900">
                        {formatCurrencyAED(Number(r.penalty_amount_aed ?? 0), language)}
                      </td>
                      <td className="px-3 py-2">
                        <StateChip on={r.deduction_recommended} />
                      </td>
                      <td className="px-3 py-2">
                        <StateChip on={r.deduction_approved} tone="emerald" />
                      </td>
                      {canApprove && (
                        <td className="px-3 py-2">
                          <button
                            type="button"
                            className="text-xs font-semibold text-vertex-600 hover:text-vertex-700"
                            onClick={() => void toggleApproval(r.id, !r.deduction_approved)}
                          >
                            {r.deduction_approved ? t('kpiPage.unapprove') : t('kpiPage.approve')}
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>
    </AppShell>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="vertex-card p-3">
      <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-bold text-slate-900">{value}</p>
    </div>
  );
}

function StateChip({ on, tone = 'amber' }: { on: boolean; tone?: 'amber' | 'emerald' }) {
  if (!on) return <span className="text-xs text-slate-400">-</span>;
  const cls =
    tone === 'emerald'
      ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
      : 'bg-amber-50 text-amber-800 ring-amber-200';
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ${cls}`}>
      ✓
    </span>
  );
}
