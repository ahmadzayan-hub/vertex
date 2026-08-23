import { AppShell } from '@/components/layout/AppShell';
import { DashboardSkeleton } from '@/components/common/Skeleton';
import { StatCard } from '@/components/dashboard/StatCard';
import { ComplianceTrendChart } from '@/components/dashboard/ComplianceTrendChart';
import { SubmissionsByStatusChart } from '@/components/dashboard/SubmissionsByStatusChart';
import { RecentActivity } from '@/components/dashboard/RecentActivity';
import { AlertsPanel } from '@/components/dashboard/AlertsPanel';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { useDashboardStats, trafficLightForStat } from '@/hooks/useDashboardStats';
import { useProjects } from '@/hooks/useProjects';
import { useObligations } from '@/hooks/useObligations';
import { useSubmissions } from '@/hooks/useSubmissions';
import { ComplianceMatrix } from '@/components/compliance/ComplianceMatrix';
import { formatCurrencyAED } from '@/utils/formatters';

export default function Dashboard() {
  const { t, language } = useLanguage();
  const { profile, user } = useAuth();
  const greeting = profile?.full_name || user?.email || '';
  const { stats, activity, trend, byStatus, loading, error } = useDashboardStats();
  const { projects } = useProjects();
  const { obligations } = useObligations();
  const { submissions } = useSubmissions({ limit: 200 });

  const alerts = (stats?.insurance_expiring_30d_count ?? 0) > 0
    ? [{
        id: 'insurance-30',
        label: t('dashboard.widgets.insuranceExpiring'),
        detail: t('dashboard.widgets.insuranceExpiringHint'),
        severity: 'high' as const,
      }]
    : [];

  return (
    <AppShell pageTitle={t('dashboard.title')}>
      <section aria-labelledby="dashboard-heading" className="space-y-6">
        <header className="space-y-1">
          <h2 id="dashboard-heading" className="text-2xl font-bold text-slate-900">
            {t('dashboard.title')}
          </h2>
          {greeting && (
            <p className="text-sm text-slate-600">
              {t('dashboard.welcome')}, {greeting}. {t('dashboard.subtitle')}
            </p>
          )}
        </header>

        {loading && <DashboardSkeleton />}
        {error && (
          <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            {error}
          </div>
        )}

        {/* The control room opens on the matrix: requirement against contract,
            before any aggregate number. */}
        {!loading && (
          <ComplianceMatrix
            projects={projects}
            obligations={obligations}
            submissions={submissions}
          />
        )}

        {stats && (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
              <StatCard
                label={t('dashboard.widgets.submissionsPending')}
                value={String(stats.submissions_pending_count)}
                hint={t('dashboard.widgets.submissionsPendingHint')}
                trafficLight={trafficLightForStat('submissions_pending_count', stats.submissions_pending_count)}
              />
              <StatCard
                label={t('dashboard.widgets.obligationsAtRisk')}
                value={String(stats.obligations_at_risk_count)}
                hint={t('dashboard.widgets.obligationsAtRiskHint')}
                trafficLight={trafficLightForStat('obligations_at_risk_count', stats.obligations_at_risk_count)}
              />
              <StatCard
                label={t('dashboard.widgets.insuranceExpiring')}
                value={String(stats.insurance_expiring_30d_count)}
                hint={t('dashboard.widgets.insuranceExpiringHint')}
                trafficLight={trafficLightForStat('insurance_expiring_30d_count', stats.insurance_expiring_30d_count)}
              />
              <StatCard
                label={t('dashboard.widgets.kpiPenalties')}
                value={formatCurrencyAED(Number(stats.kpi_penalties_this_month_aed) || 0, language)}
                hint={t('dashboard.widgets.kpiPenaltiesHint')}
                trafficLight={trafficLightForStat('kpi_penalties_this_month_aed', Number(stats.kpi_penalties_this_month_aed) || 0)}
              />
              <StatCard
                label={t('dashboard.widgets.complianceScore')}
                value={`${Math.round(Number(stats.compliance_score_avg_last_30d) || 0)}/100`}
                hint={t('dashboard.widgets.complianceScoreHint')}
                trafficLight={trafficLightForStat('compliance_score_avg_last_30d', Number(stats.compliance_score_avg_last_30d) || 0)}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div className="vertex-card p-4">
                <h3 className="mb-3 text-sm font-semibold text-slate-700">
                  {t('dashboard.widgets.complianceTrend')}
                </h3>
                <ComplianceTrendChart data={trend} />
              </div>
              <div className="vertex-card p-4">
                <h3 className="mb-3 text-sm font-semibold text-slate-700">
                  {t('dashboard.widgets.submissionsByStatus')}
                </h3>
                <SubmissionsByStatusChart data={byStatus} />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <div className="vertex-card p-4 lg:col-span-2">
                <h3 className="mb-3 text-sm font-semibold text-slate-700">
                  {t('dashboard.widgets.recentActivity')}
                </h3>
                <RecentActivity events={activity} />
              </div>
              <div className="vertex-card p-4">
                <h3 className="mb-3 text-sm font-semibold text-slate-700">
                  {t('dashboard.widgets.alerts')}
                </h3>
                <AlertsPanel alerts={alerts} />
              </div>
            </div>
          </>
        )}
      </section>
    </AppShell>
  );
}
