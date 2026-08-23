import { useState } from 'react';

import { AppShell } from '@/components/layout/AppShell';
import { EmptyState } from '@/components/common/EmptyState';
import { DashboardSkeleton } from '@/components/common/Skeleton';
import { useLanguage } from '@/hooks/useLanguage';
import { useProjects } from '@/hooks/useProjects';
import { useObligations, OBLIGATION_BUCKET_ORDER } from '@/hooks/useObligations';
import { formatDate } from '@/utils/formatters';
import type { ObligationType, ObligationStatus, Obligation } from '@/types';

const TYPES: (ObligationType | '')[] = ['', 'deliverable', 'payment', 'renewal', 'approval', 'compliance'];

const BUCKET_STYLE: Record<ObligationStatus, string> = {
  overdue: 'bg-red-50 border-red-200 text-red-800',
  at_risk: 'bg-amber-50 border-amber-200 text-amber-800',
  on_track: 'bg-emerald-50 border-emerald-200 text-emerald-800',
  complete: 'bg-slate-50 border-slate-200 text-slate-700',
};

export default function ObligationsPage() {
  const { t } = useLanguage();
  const { projects } = useProjects();
  const [projectId, setProjectId] = useState<string>('');
  const [type, setType] = useState<ObligationType | ''>('');

  const { grouped, loading, error } = useObligations({
    projectId: projectId || undefined,
    type: type || undefined,
  });

  const projectName = (pid: string) =>
    projects.find((p) => p.id === pid)?.name ?? t('common.unknown');

  return (
    <AppShell pageTitle={t('obligationsPage.title')}>
      <section aria-labelledby="obl-heading" className="space-y-6">
        <header className="space-y-1">
          <h2 id="obl-heading" className="text-2xl font-bold text-slate-900">
            {t('obligationsPage.title')}
          </h2>
          <p className="text-sm text-slate-600">{t('obligationsPage.subtitle')}</p>
        </header>

        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label htmlFor="obl-project" className="mb-1 block text-xs font-medium text-slate-600">
              {t('obligationsPage.filters.project')}
            </label>
            <select
              id="obl-project"
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
          <div>
            <label htmlFor="obl-type" className="mb-1 block text-xs font-medium text-slate-600">
              {t('obligationsPage.filters.type')}
            </label>
            <select
              id="obl-type"
              value={type}
              onChange={(e) => setType(e.target.value as ObligationType | '')}
              className="vertex-input h-9 py-1 text-sm"
            >
              {TYPES.map((val) => (
                <option key={val || 'all'} value={val}>
                  {val ? t(`obligationsPage.types.${val}`) : t('obligationsPage.filters.allTypes')}
                </option>
              ))}
            </select>
          </div>
        </div>

        {loading && <DashboardSkeleton />}
        {error && (
          <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            {error}
          </div>
        )}

        {!loading && OBLIGATION_BUCKET_ORDER.every((k) => grouped[k].length === 0) && (
          <EmptyState title={t('obligationsPage.empty')} />
        )}

        {!loading && OBLIGATION_BUCKET_ORDER.some((k) => grouped[k].length > 0) && (
          <div className="space-y-4">
            {OBLIGATION_BUCKET_ORDER.map((status) => {
              const rows = grouped[status];
              if (rows.length === 0) return null;
              return (
                <div key={status}>
                  <div className="mb-2 flex items-center gap-2">
                    <span
                      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${BUCKET_STYLE[status]}`}
                    >
                      {t(`obligationsPage.buckets.${status}`)}
                    </span>
                    <span className="text-xs text-slate-500">{rows.length}</span>
                  </div>
                  <ul className="space-y-2">
                    {rows.map((o) => (
                      <ObligationRow key={o.id} o={o} projectName={projectName(o.project_id)} />
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </AppShell>
  );
}

function ObligationRow({ o, projectName }: { o: Obligation; projectName: string }) {
  const { t, language } = useLanguage();
  const daysHint =
    o.days_remaining != null
      ? o.days_remaining < 0
        ? `+${Math.abs(o.days_remaining)}`
        : `${o.days_remaining}`
      : '-';
  return (
    <li className="rounded-lg border border-slate-200 bg-white p-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-900">{o.description}</p>
          <p className="mt-0.5 text-xs text-slate-500">
            {projectName} · {t(`obligationsPage.types.${o.obligation_type}`)}
            {o.critical_path_blocking && (
              <span className="ms-2 inline-flex items-center rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-semibold text-red-700 ring-1 ring-red-200">
                {t('obligationsPage.meta.critical')}
              </span>
            )}
          </p>
          {o.details && <p className="mt-1 text-xs text-slate-600">{o.details}</p>}
          {o.kpi_leverage_text && (
            <p className="mt-1 text-xs text-vertex-700">
              {t('obligationsPage.meta.kpiLeverage')}: {o.kpi_leverage_text}
            </p>
          )}
        </div>
        <div className="text-end">
          <p className="text-[11px] uppercase tracking-wide text-slate-500">
            {t('obligationsPage.meta.due')}
          </p>
          <p className="text-sm font-semibold text-slate-800">
            {o.due_date ? formatDate(o.due_date, language) : '-'}
          </p>
          <p className="mt-1 text-[11px] text-slate-500">
            {t('obligationsPage.meta.daysRemaining')}: <span className="tabular-nums">{daysHint}</span>
          </p>
        </div>
      </div>
    </li>
  );
}
