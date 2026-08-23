import { Link, useParams } from 'react-router-dom';

import { AppShell } from '@/components/layout/AppShell';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { EmptyState } from '@/components/common/EmptyState';
import { useLanguage } from '@/hooks/useLanguage';
import { useProject } from '@/hooks/useProjects';
import { useSubmissions } from '@/hooks/useSubmissions';
import { formatCurrencyAED, formatDate } from '@/utils/formatters';

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const { t, language } = useLanguage();
  const { project, loading: projectLoading, error: projectError } = useProject(id);
  const { submissions, loading: subLoading } = useSubmissions({ projectId: id });

  if (projectLoading) {
    return (
      <AppShell pageTitle={t('project.title')}>
        <LoadingSpinner />
      </AppShell>
    );
  }
  if (projectError || !project) {
    return (
      <AppShell pageTitle={t('project.title')}>
        <EmptyState title={projectError ?? t('errors.loadFailed')} />
      </AppShell>
    );
  }

  return (
    <AppShell pageTitle={project.name}>
      <section aria-labelledby="project-heading" className="space-y-4">
        <header className="vertex-card space-y-3 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 id="project-heading" className="text-xl font-bold text-slate-900">
                {project.name}
              </h2>
              <p className="text-xs text-slate-500">
                {t('project.meta.contract_ref')}: {project.contract_ref}
              </p>
            </div>
            <Link
              to={`/upload?project=${project.id}`}
              className="vertex-btn-primary text-xs"
            >
              {t('project.upload')}
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
            <div>
              <p className="text-slate-500">{t('project.meta.value')}</p>
              <p className="font-semibold text-slate-800">
                {project.contract_value_aed != null
                  ? formatCurrencyAED(project.contract_value_aed, language)
                  : '-'}
              </p>
            </div>
            <div>
              <p className="text-slate-500">{t('project.meta.commencement')}</p>
              <p className="font-semibold text-slate-800">
                {project.commencement_date ? formatDate(project.commencement_date, language) : '-'}
              </p>
            </div>
            <div>
              <p className="text-slate-500">{t('project.meta.completion')}</p>
              <p className="font-semibold text-slate-800">
                {project.completion_date ? formatDate(project.completion_date, language) : '-'}
              </p>
            </div>
            <div>
              <p className="text-slate-500">{t('project.meta.status')}</p>
              <p className="font-semibold text-slate-800">{project.status}</p>
            </div>
          </div>
        </header>

        <div>
          <h3 className="mb-2 text-sm font-semibold text-slate-800">
            {t('project.submissionsTitle')}
          </h3>
          {subLoading ? (
            <LoadingSpinner />
          ) : submissions.length === 0 ? (
            <EmptyState title={t('project.submissionsEmpty')} />
          ) : (
            <ul className="space-y-2">
              {submissions.map((s) => (
                <li key={s.id}>
                  <Link
                    to={`/submissions/${s.id}`}
                    className="block rounded-md border border-slate-200 bg-white p-3 transition hover:border-vertex-400 hover:bg-vertex-50"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-800">
                          {s.document_name}
                        </p>
                        <p className="text-xs text-slate-500">
                          {formatDate(s.uploaded_at, language, { dateStyle: 'medium', timeStyle: 'short' })}
                          {' · '}
                          {t(`upload.type.${s.submission_type}`)}
                        </p>
                      </div>
                      <span className="text-xs text-slate-500">
                        {t(`submission.approvalStatus.${s.approval_status}`)}
                      </span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </AppShell>
  );
}
