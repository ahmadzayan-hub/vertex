import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';

import { AppShell } from '@/components/layout/AppShell';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { EmptyState } from '@/components/common/EmptyState';
import { FindingCard } from '@/components/submissions/FindingCard';
import { FilePreview } from '@/components/submissions/FilePreview';
import { CommentThread } from '@/components/submissions/CommentThread';
import { ApprovalPanel } from '@/components/submissions/ApprovalPanel';
import { SeverityBadge } from '@/components/submissions/SeverityBadge';
import { useSubmission } from '@/hooks/useSubmission';
import { useLanguage } from '@/hooks/useLanguage';
import { formatDate } from '@/utils/formatters';
import type { AiFinding, Severity } from '@/types';

type Tab = 'findings' | 'preview' | 'comments' | 'history';

const SEVERITY_RANK: Record<Severity, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
  info: 4,
};

const TRAFFIC_STYLE: Record<string, string> = {
  green: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  amber: 'bg-amber-50 text-amber-800 ring-amber-200',
  red: 'bg-red-50 text-red-700 ring-red-200',
};

function groupFindings(findings: AiFinding[]) {
  const grouped: Record<Severity, AiFinding[]> = {
    critical: [],
    high: [],
    medium: [],
    low: [],
    info: [],
  };
  for (const f of findings) grouped[f.severity].push(f);
  return grouped;
}

export default function SubmissionDetail() {
  const { id } = useParams<{ id: string }>();
  const { t, language } = useLanguage();
  const [tab, setTab] = useState<Tab>('findings');

  const {
    submission,
    project,
    findings,
    comments,
    loading,
    error,
    reload,
    runAnalysis,
    setApproval,
  } = useSubmission(id);

  if (loading) {
    return (
      <AppShell pageTitle={t('submission.title')}>
        <LoadingSpinner />
      </AppShell>
    );
  }
  if (error || !submission) {
    return (
      <AppShell pageTitle={t('submission.title')}>
        <EmptyState title={error ?? t('errors.loadFailed')} />
      </AppShell>
    );
  }

  const grouped = groupFindings(findings);
  const orderedSeverities: Severity[] = (Object.keys(SEVERITY_RANK) as Severity[]).sort(
    (a, b) => SEVERITY_RANK[a] - SEVERITY_RANK[b]
  );

  return (
    <AppShell pageTitle={submission.document_name}>
      <section aria-labelledby="submission-heading" className="space-y-4">
        <header className="vertex-card space-y-3 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              {project && (
                <Link
                  to={`/projects/${project.id}`}
                  className="text-xs font-semibold text-vertex-600 hover:text-vertex-700"
                >
                  ← {t('submission.backToProject')} · {project.name}
                </Link>
              )}
              <h2 id="submission-heading" className="mt-1 text-xl font-bold text-slate-900">
                {submission.document_name}
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                {formatDate(submission.uploaded_at, language, { dateStyle: 'medium', timeStyle: 'short' })}
                {' · '}
                {t(`upload.type.${submission.submission_type}`)}
              </p>
            </div>
            {submission.traffic_light && (
              <span
                className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ring-1 ${TRAFFIC_STYLE[submission.traffic_light]}`}
              >
                {t(`status.${submission.traffic_light}`)}
              </span>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
            <div>
              <p className="text-slate-500">{t('submission.meta.processing')}</p>
              <p className="font-semibold text-slate-800">
                {t(`submission.processingStatus.${submission.processing_status}`)}
              </p>
            </div>
            <div>
              <p className="text-slate-500">{t('submission.meta.approval')}</p>
              <p className="font-semibold text-slate-800">
                {t(`submission.approvalStatus.${submission.approval_status}`)}
              </p>
            </div>
            <div>
              <p className="text-slate-500">{t('submission.meta.compliance')}</p>
              <p className="font-semibold text-slate-800">
                {submission.compliance_score != null ? `${submission.compliance_score}/100` : '-'}
              </p>
            </div>
            <div>
              <p className="text-slate-500">{t('submission.meta.confidence')}</p>
              <p className="font-semibold text-slate-800">
                {submission.confidence_percent != null ? `${submission.confidence_percent}%` : '-'}
              </p>
            </div>
          </div>
        </header>

        <div
          role="tablist"
          className="flex flex-wrap gap-1 border-b border-slate-200"
        >
          {(['findings', 'preview', 'comments', 'history'] as Tab[]).map((k) => (
            <button
              key={k}
              type="button"
              role="tab"
              aria-selected={tab === k}
              onClick={() => setTab(k)}
              className={`px-3 py-2 text-sm font-semibold transition ${
                tab === k
                  ? 'border-b-2 border-vertex-600 text-vertex-700'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {t(`submission.tabs.${k}`)}
            </button>
          ))}
        </div>

        <div>
          {tab === 'findings' && (
            findings.length === 0 ? (
              <EmptyState
                title={t('submission.findings.empty')}
                action={
                  <button
                    type="button"
                    onClick={() => void runAnalysis()}
                    className="vertex-btn-primary"
                    disabled={submission.processing_status === 'processing'}
                  >
                    {t('submission.findings.runAnalysis')}
                  </button>
                }
              />
            ) : (
              <div className="space-y-3">
                {orderedSeverities.map((sev) =>
                  grouped[sev].length === 0 ? null : (
                    <div key={sev} className="space-y-2">
                      <div className="flex items-center gap-2">
                        <SeverityBadge severity={sev} />
                        <span className="text-xs text-slate-500">
                          {grouped[sev].length}
                        </span>
                      </div>
                      {grouped[sev].map((f) => (
                        <FindingCard key={f.id} finding={f} />
                      ))}
                    </div>
                  )
                )}
              </div>
            )
          )}
          {tab === 'preview' && submission.file_url && (
            <FilePreview
              filePath={submission.file_url}
              documentName={submission.document_name}
            />
          )}
          {tab === 'preview' && !submission.file_url && (
            <EmptyState title={t('submission.preview.notSupported')} />
          )}
          {tab === 'comments' && submission && (
            <CommentThread
              submissionId={submission.id}
              comments={comments}
              onChange={reload}
            />
          )}
          {tab === 'history' && (
            <EmptyState title={t('submission.history.empty')} />
          )}
        </div>

        <ApprovalPanel submission={submission} onApprove={setApproval} />
      </section>
    </AppShell>
  );
}
