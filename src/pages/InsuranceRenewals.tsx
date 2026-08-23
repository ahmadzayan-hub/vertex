import { useRef, useState } from 'react';

import { AppShell } from '@/components/layout/AppShell';
import { EmptyState } from '@/components/common/EmptyState';
import { DashboardSkeleton } from '@/components/common/Skeleton';
import { useLanguage } from '@/hooks/useLanguage';
import { useProjects } from '@/hooks/useProjects';
import { useInsurance } from '@/hooks/useInsurance';
import { formatCurrencyAED, formatDate } from '@/utils/formatters';
import type { InsurancePolicy, RenewalStatus } from '@/types';

type BucketKey = 'expired' | 'expiring' | 'active' | 'renewed';

const BUCKET_ORDER: BucketKey[] = ['expired', 'expiring', 'active', 'renewed'];

const BUCKET_STYLE: Record<BucketKey, string> = {
  expired: 'bg-red-50 border-red-200 text-red-800',
  expiring: 'bg-amber-50 border-amber-200 text-amber-800',
  active: 'bg-emerald-50 border-emerald-200 text-emerald-800',
  renewed: 'bg-vertex-50 border-vertex-200 text-vertex-800',
};

const RENEWAL_CHIP: Record<RenewalStatus, string> = {
  active: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  expiring_soon: 'bg-amber-50 text-amber-800 ring-amber-200',
  expired: 'bg-red-50 text-red-700 ring-red-200',
  renewed: 'bg-vertex-50 text-vertex-800 ring-vertex-200',
};

export default function InsuranceRenewalsPage() {
  const { t, language } = useLanguage();
  const { projects } = useProjects();
  const { bucketed, loading, error, uploadEvidence } = useInsurance();
  const [busyPolicyId, setBusyPolicyId] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [pendingPolicy, setPendingPolicy] = useState<InsurancePolicy | null>(null);

  const projectName = (pid: string) =>
    projects.find((p) => p.id === pid)?.name ?? t('common.unknown');

  const handleFileChosen = async (file: File) => {
    if (!pendingPolicy) return;
    setBusyPolicyId(pendingPolicy.id);
    const ok = await uploadEvidence(pendingPolicy.id, pendingPolicy.project_id, file);
    if (!ok) setLocalError(t('errors.uploadFailed', { reason: 'storage' }));
    setBusyPolicyId(null);
    setPendingPolicy(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <AppShell pageTitle={t('insurancePage.title')}>
      <section aria-labelledby="ins-heading" className="space-y-6">
        <header className="space-y-1">
          <h2 id="ins-heading" className="text-2xl font-bold text-slate-900">
            {t('insurancePage.title')}
          </h2>
          <p className="text-sm text-slate-600">{t('insurancePage.subtitle')}</p>
        </header>

        {loading && <DashboardSkeleton />}
        {(error || localError) && (
          <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            {error ?? localError}
          </div>
        )}

        {!loading && BUCKET_ORDER.every((k) => bucketed[k].length === 0) && (
          <EmptyState title={t('insurancePage.empty')} />
        )}

        <input
          ref={fileRef}
          type="file"
          accept="application/pdf,image/*"
          className="sr-only"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void handleFileChosen(f);
          }}
        />

        {!loading && (
          <div className="space-y-4">
            {BUCKET_ORDER.map((bucket) => {
              const rows = bucketed[bucket];
              if (rows.length === 0) return null;
              return (
                <div key={bucket}>
                  <div className="mb-2 flex items-center gap-2">
                    <span
                      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${BUCKET_STYLE[bucket]}`}
                    >
                      {t(`insurancePage.buckets.${bucket}`)}
                    </span>
                    <span className="text-xs text-slate-500">{rows.length}</span>
                  </div>
                  <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                        <tr>
                          <th className="px-3 py-2 text-start">{t('insurancePage.table.project')}</th>
                          <th className="px-3 py-2 text-start">{t('insurancePage.table.coverage')}</th>
                          <th className="px-3 py-2 text-start">{t('insurancePage.table.provider')}</th>
                          <th className="px-3 py-2 text-start">{t('insurancePage.table.policy')}</th>
                          <th className="px-3 py-2 text-end">{t('insurancePage.table.amount')}</th>
                          <th className="px-3 py-2 text-start">{t('insurancePage.table.expiry')}</th>
                          <th className="px-3 py-2 text-end">{t('insurancePage.table.daysToExpiry')}</th>
                          <th className="px-3 py-2 text-start">{t('insurancePage.table.status')}</th>
                          <th className="px-3 py-2 text-start">{t('insurancePage.table.evidence')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((p) => (
                          <tr key={p.id} className="border-t border-slate-100 hover:bg-slate-50">
                            <td className="px-3 py-2 text-slate-700">{projectName(p.project_id)}</td>
                            <td className="px-3 py-2 text-slate-700">{p.coverage_type}</td>
                            <td className="px-3 py-2 text-slate-700">{p.provider ?? '-'}</td>
                            <td className="px-3 py-2 text-slate-700 font-mono text-xs">
                              {p.policy_number ?? '-'}
                            </td>
                            <td className="px-3 py-2 text-end tabular-nums text-slate-700">
                              {p.amount_aed != null ? formatCurrencyAED(p.amount_aed, language) : '-'}
                            </td>
                            <td className="px-3 py-2 text-slate-700">
                              {p.expiry_date ? formatDate(p.expiry_date, language) : '-'}
                            </td>
                            <td className="px-3 py-2 text-end tabular-nums text-slate-700">
                              {p.days_to_expiry ?? '-'}
                            </td>
                            <td className="px-3 py-2">
                              <span
                                className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ${RENEWAL_CHIP[p.renewal_status]}`}
                              >
                                {t(`insurancePage.renewalStatus.${p.renewal_status}`)}
                              </span>
                            </td>
                            <td className="px-3 py-2">
                              {p.renewal_evidence_url ? (
                                <span className="text-xs text-emerald-700">
                                  ✓ {p.renewal_evidence_uploaded_date
                                    ? formatDate(p.renewal_evidence_uploaded_date, language)
                                    : ''}
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  disabled={busyPolicyId === p.id}
                                  onClick={() => {
                                    setPendingPolicy(p);
                                    fileRef.current?.click();
                                  }}
                                  className="text-xs font-semibold text-vertex-600 hover:text-vertex-700 disabled:opacity-50"
                                >
                                  {busyPolicyId === p.id
                                    ? t('common.loading')
                                    : t('insurancePage.table.uploadEvidence')}
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </AppShell>
  );
}
