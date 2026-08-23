import { useState } from 'react';

import { AppShell } from '@/components/layout/AppShell';
import { EmptyState } from '@/components/common/EmptyState';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { useLanguage } from '@/hooks/useLanguage';
import { useProjects } from '@/hooks/useProjects';
import { useSubmissions } from '@/hooks/useSubmissions';
import { generateSubmissionReportById, generateProjectReportById } from '@/services/pdf';

type ReportType = 'submission' | 'project';

export default function ReportsPage() {
  const { t, language } = useLanguage();
  const { projects, loading: projLoading } = useProjects();
  const [reportType, setReportType] = useState<ReportType>('submission');
  const [projectId, setProjectId] = useState<string>('');
  const [submissionId, setSubmissionId] = useState<string>('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { submissions, loading: subLoading } = useSubmissions({
    projectId: projectId || undefined,
    limit: 100,
  });

  const brand = {
    title: t('app.name'),
    confidential: t('reportsPage.pdf.confidential'),
    generatedAt: new Date().toLocaleString(),
  };
  const pageLabel = t('reportsPage.pdf.page', { n: '{{n}}', total: '{{total}}' });

  const canSubmit = reportType === 'submission' ? !!submissionId : !!projectId;

  const handleGenerate = async () => {
    setBusy(true);
    setError(null);
    try {
      const wrappedT = (key: string, opts?: unknown) =>
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (t as any)(key, opts) as string;
      if (reportType === 'submission') {
        await generateSubmissionReportById(submissionId, wrappedT, brand, pageLabel, language);
      } else {
        await generateProjectReportById(projectId, wrappedT, brand, pageLabel, language);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'report failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppShell pageTitle={t('reportsPage.title')}>
      <section aria-labelledby="rep-heading" className="space-y-6">
        <header className="space-y-1">
          <h2 id="rep-heading" className="text-2xl font-bold text-slate-900">
            {t('reportsPage.title')}
          </h2>
          <p className="text-sm text-slate-600">{t('reportsPage.subtitle')}</p>
        </header>

        <div className="vertex-card space-y-4 p-4 md:p-6">
          <fieldset className="space-y-2">
            <div className="flex flex-wrap gap-2">
              {(['submission', 'project'] as ReportType[]).map((r) => (
                <label
                  key={r}
                  className={`cursor-pointer rounded-md border p-3 text-sm transition ${
                    reportType === r
                      ? 'border-vertex-500 bg-vertex-50 text-vertex-900'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="report-type"
                    value={r}
                    checked={reportType === r}
                    onChange={() => {
                      setReportType(r);
                      setSubmissionId('');
                    }}
                    className="me-2 h-4 w-4 align-middle"
                  />
                  <span className="font-medium">{t(`reportsPage.types.${r}`)}</span>
                </label>
              ))}
            </div>
          </fieldset>

          {projLoading ? (
            <LoadingSpinner />
          ) : projects.length === 0 ? (
            <EmptyState title={t('reportsPage.empty')} />
          ) : (
            <>
              <div>
                <label htmlFor="rep-project" className="mb-1 block text-sm font-medium text-slate-700">
                  {t('reportsPage.pickProject')}
                </label>
                <select
                  id="rep-project"
                  className="vertex-input"
                  value={projectId}
                  onChange={(e) => {
                    setProjectId(e.target.value);
                    setSubmissionId('');
                  }}
                >
                  <option value="">-</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} - {p.contract_ref}
                    </option>
                  ))}
                </select>
              </div>

              {reportType === 'submission' && (
                <div>
                  <label htmlFor="rep-submission" className="mb-1 block text-sm font-medium text-slate-700">
                    {t('reportsPage.pickSubmission')}
                  </label>
                  <select
                    id="rep-submission"
                    className="vertex-input"
                    value={submissionId}
                    onChange={(e) => setSubmissionId(e.target.value)}
                    disabled={!projectId || subLoading}
                  >
                    <option value="">-</option>
                    {submissions.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.document_name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </>
          )}

          {error && (
            <p role="alert" className="text-sm text-red-700">
              {error}
            </p>
          )}

          <div className="flex justify-end">
            <button
              type="button"
              className="vertex-btn-primary disabled:cursor-not-allowed disabled:opacity-50"
              disabled={!canSubmit || busy}
              onClick={handleGenerate}
            >
              {busy ? t('reportsPage.generating') : t('reportsPage.generate')}
            </button>
          </div>
        </div>
      </section>
    </AppShell>
  );
}
