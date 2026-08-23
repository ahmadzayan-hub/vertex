import { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { EmptyState } from '@/components/common/EmptyState';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { useLanguage } from '@/hooks/useLanguage';
import { useProjects } from '@/hooks/useProjects';
import { useCreateSubmission } from '@/hooks/useCreateSubmission';
import { formatBytes, validateFile, ALLOWED_MIME } from '@/services/storage';
import type { SubmissionType } from '@/types';

const TYPE_OPTIONS: SubmissionType[] = [
  'invoice',
  'timesheet',
  'technical_doc',
  'progress_update',
  'other',
];

const ACCEPT = Array.from(ALLOWED_MIME).join(',');

export function UploadWizard() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { projects, loading: projectsLoading } = useProjects();
  const { create, submitting, error } = useCreateSubmission();

  const [step, setStep] = useState(1);
  const [projectId, setProjectId] = useState<string>('');
  const [submissionType, setSubmissionType] = useState<SubmissionType>('invoice');
  const [file, setFile] = useState<File | null>(null);
  const [documentName, setDocumentName] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const totalSteps = 4;
  const canNext = useMemo(() => {
    if (step === 1) return !!projectId;
    if (step === 2) return !!submissionType;
    if (step === 3) return !!file;
    return true;
  }, [step, projectId, submissionType, file]);

  const handleFile = (f: File) => {
    const v = validateFile(f);
    if (!v.ok) {
      setLocalError(
        v.reason === 'size' ? t('errors.fileTooLarge') : t('errors.fileTypeUnsupported')
      );
      return;
    }
    setLocalError(null);
    setFile(f);
  };

  const handleSubmit = async () => {
    if (!file || !projectId) return;
    const created = await create({
      projectId,
      submissionType,
      documentName: documentName || file.name,
      file,
    });
    if (created) navigate(`/submissions/${created.id}`);
  };

  return (
    <div className="vertex-card mx-auto max-w-2xl p-4 md:p-6">
      <p className="text-xs font-medium uppercase tracking-wide text-vertex-600">
        {t('upload.step', { current: step, total: totalSteps })}
      </p>
      <h2 className="mt-1 text-lg font-bold text-slate-900">
        {t(`upload.steps.${step === 1 ? 'project' : step === 2 ? 'type' : step === 3 ? 'file' : 'confirm'}`)}
      </h2>

      <div className="mt-6 space-y-4">
        {step === 1 && (
          <div className="space-y-2">
            {projectsLoading && <LoadingSpinner />}
            {!projectsLoading && projects.length === 0 && (
              <EmptyState title={t('errors.noProjects')} />
            )}
            {!projectsLoading && projects.length > 0 && (
              <>
                <label htmlFor="project-select" className="mb-1 block text-sm font-medium text-slate-700">
                  {t('upload.project.label')}
                </label>
                <select
                  id="project-select"
                  className="vertex-input"
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                >
                  <option value="">{t('upload.project.placeholder')}</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} · {p.contract_ref}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-slate-500">{t('upload.project.help')}</p>
              </>
            )}
          </div>
        )}

        {step === 2 && (
          <fieldset className="space-y-2">
            <legend className="mb-1 block text-sm font-medium text-slate-700">
              {t('upload.type.label')}
            </legend>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {TYPE_OPTIONS.map((option) => (
                <label
                  key={option}
                  className={`flex cursor-pointer items-center gap-2 rounded-md border p-3 text-sm transition ${
                    submissionType === option
                      ? 'border-vertex-500 bg-vertex-50 text-vertex-900'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="submission_type"
                    value={option}
                    checked={submissionType === option}
                    onChange={() => setSubmissionType(option)}
                    className="h-4 w-4"
                  />
                  <span>{t(`upload.type.${option}`)}</span>
                </label>
              ))}
            </div>
          </fieldset>
        )}

        {step === 3 && (
          <div className="space-y-3">
            {!file ? (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex w-full flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 py-10 text-sm text-slate-600 transition hover:border-vertex-400 hover:bg-vertex-50"
              >
                <span className="font-medium">{t('upload.file.drop')}</span>
                <span className="mt-1 text-xs text-slate-500">{t('upload.file.allowed')}</span>
              </button>
            ) : (
              <div className="flex items-center justify-between rounded-md border border-slate-200 bg-white p-3 text-sm">
                <div>
                  <p className="font-medium text-slate-800">{file.name}</p>
                  <p className="text-xs text-slate-500">{formatBytes(file.size)}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setFile(null)}
                  className="text-xs font-semibold text-vertex-600 hover:text-vertex-700"
                >
                  {t('upload.file.remove')}
                </button>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              className="sr-only"
              accept={ACCEPT}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
              }}
            />
            {localError && (
              <p role="alert" className="text-sm text-red-700">
                {localError}
              </p>
            )}
            <div>
              <label htmlFor="document-name" className="mb-1 block text-sm font-medium text-slate-700">
                {t('upload.file.name')}
              </label>
              <input
                id="document-name"
                type="text"
                className="vertex-input"
                placeholder={t('upload.file.namePlaceholder')}
                value={documentName}
                onChange={(e) => setDocumentName(e.target.value)}
              />
            </div>
          </div>
        )}

        {step === 4 && file && (
          <div className="space-y-3 rounded-md border border-slate-200 bg-slate-50 p-4 text-sm">
            <h3 className="font-semibold text-slate-800">{t('upload.confirm.title')}</h3>
            <dl className="grid grid-cols-3 gap-y-1 text-slate-700">
              <dt className="col-span-1 text-slate-500">{t('upload.confirm.project')}</dt>
              <dd className="col-span-2">
                {projects.find((p) => p.id === projectId)?.name ?? projectId}
              </dd>
              <dt className="col-span-1 text-slate-500">{t('upload.confirm.type')}</dt>
              <dd className="col-span-2">{t(`upload.type.${submissionType}`)}</dd>
              <dt className="col-span-1 text-slate-500">{t('upload.confirm.file')}</dt>
              <dd className="col-span-2">{documentName || file.name}</dd>
              <dt className="col-span-1 text-slate-500">{t('upload.confirm.size')}</dt>
              <dd className="col-span-2">{formatBytes(file.size)}</dd>
            </dl>
          </div>
        )}
      </div>

      {error && (
        <p role="alert" className="mt-3 text-sm text-red-700">
          {t('errors.uploadFailed', { reason: error })}
        </p>
      )}

      <div className="mt-6 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => (step > 1 ? setStep((s) => s - 1) : navigate(-1))}
          className="vertex-btn-secondary"
        >
          {step > 1 ? t('upload.actions.back') : t('upload.actions.cancel')}
        </button>
        {step < totalSteps && (
          <button
            type="button"
            disabled={!canNext}
            onClick={() => setStep((s) => s + 1)}
            className="vertex-btn-primary disabled:cursor-not-allowed disabled:opacity-40"
          >
            {t('upload.actions.next')}
          </button>
        )}
        {step === totalSteps && (
          <button
            type="button"
            disabled={submitting || !file}
            onClick={handleSubmit}
            className="vertex-btn-primary disabled:cursor-not-allowed disabled:opacity-40"
          >
            {submitting ? t('upload.confirm.submitting') : t('upload.confirm.submit')}
          </button>
        )}
      </div>
    </div>
  );
}
