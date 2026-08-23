import { lazy, Suspense } from 'react';

import { AppShell } from '@/components/layout/AppShell';
import { DashboardSkeleton } from '@/components/common/Skeleton';
import { StatCard } from '@/components/dashboard/StatCard';
import { useLanguage } from '@/hooks/useLanguage';
import { useAnalytics } from '@/hooks/useAnalytics';
import { trafficLightForStat } from '@/hooks/useDashboardStats';

// The chart panel pulls the ~110 KB gzip `charts` chunk. Load it lazily
// so the four KPI cards render immediately; recharts streams in below
// the fold while the user is looking at the numbers up top.
const AnalyticsCharts = lazy(() => import('@/pages/analytics/AnalyticsCharts'));

export default function AnalyticsPage() {
  const { t } = useLanguage();
  const {
    loading,
    error,
    portfolioScore,
    totalFindings,
    openObligations,
    activeInsurance,
    byProject,
    byFindingType,
    bySeverity,
    trend,
  } = useAnalytics();

  return (
    <AppShell pageTitle={t('analyticsPage.title')}>
      <section aria-labelledby="analytics-heading" className="space-y-6">
        <header className="space-y-1">
          <h2 id="analytics-heading" className="text-2xl font-bold text-slate-900">
            {t('analyticsPage.title')}
          </h2>
          <p className="text-sm text-slate-600">{t('analyticsPage.subtitle')}</p>
        </header>

        {loading && <DashboardSkeleton />}
        {error && (
          <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            {error}
          </div>
        )}

        {!loading && (
          <>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <StatCard
                label={t('analyticsPage.widgets.portfolioScore')}
                value={`${portfolioScore}/100`}
                hint={t('analyticsPage.widgets.portfolioScoreHint')}
                trafficLight={trafficLightForStat('compliance_score_avg_last_30d', portfolioScore)}
              />
              <StatCard
                label={t('analyticsPage.widgets.totalFindings')}
                value={String(totalFindings)}
                hint={t('analyticsPage.widgets.totalFindingsHint')}
              />
              <StatCard
                label={t('analyticsPage.widgets.openObligations')}
                value={String(openObligations)}
                hint={t('analyticsPage.widgets.openObligationsHint')}
              />
              <StatCard
                label={t('analyticsPage.widgets.activeInsurance')}
                value={String(activeInsurance)}
                hint={t('analyticsPage.widgets.activeInsuranceHint')}
              />
            </div>

            <Suspense fallback={<DashboardSkeleton />}>
              <AnalyticsCharts
                byProject={byProject}
                byFindingType={byFindingType}
                bySeverity={bySeverity}
                trend={trend}
              />
            </Suspense>
          </>
        )}
      </section>
    </AppShell>
  );
}
