import { useState } from 'react';

import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import type { Submission, ApprovalStatus } from '@/types';

interface Props {
  submission: Submission;
  onApprove: (status: ApprovalStatus, reason?: string) => Promise<void>;
}

const CTA_STYLE: Record<ApprovalStatus, string> = {
  approved: 'bg-emerald-600 hover:bg-emerald-700 text-white',
  conditional: 'bg-vertex-600 hover:bg-vertex-700 text-white',
  rejected: 'bg-red-600 hover:bg-red-700 text-white',
  pending: 'bg-slate-300 text-slate-500',
};

export function ApprovalPanel({ submission, onApprove }: Props) {
  const { t } = useLanguage();
  const { profile } = useAuth();
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState<ApprovalStatus | null>(null);

  const canApprove = profile?.role === 'admin' || profile?.role === 'reviewer';
  if (!canApprove) return null;

  const handle = async (status: ApprovalStatus) => {
    if (!window.confirm(t('approval.confirm'))) return;
    setBusy(status);
    try {
      await onApprove(status, reason || undefined);
      setReason('');
    } finally {
      setBusy(null);
    }
  };

  return (
    <section aria-labelledby="approval-heading" className="vertex-card mt-6 space-y-3 p-4">
      <div>
        <h3 id="approval-heading" className="text-sm font-semibold text-slate-800">
          {t('approval.title')}
        </h3>
        <p className="mt-1 text-xs text-slate-500">{t('approval.help')}</p>
      </div>
      <div>
        <label htmlFor="approval-reason" className="mb-1 block text-xs font-medium text-slate-600">
          {t('approval.reason')}
        </label>
        <textarea
          id="approval-reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder={t('approval.reasonPlaceholder')}
          rows={2}
          className="vertex-input"
        />
      </div>
      <div className="flex flex-wrap gap-2">
        {(['approved', 'conditional', 'rejected'] as ApprovalStatus[]).map((s) => (
          <button
            key={s}
            type="button"
            className={`rounded-md px-3 py-2 text-sm font-semibold transition ${CTA_STYLE[s]} disabled:cursor-not-allowed disabled:opacity-50`}
            disabled={busy !== null || submission.approval_status === s}
            onClick={() => handle(s)}
          >
            {t(`approval.actions.${s === 'approved' ? 'approve' : s === 'conditional' ? 'conditional' : 'reject'}`)}
          </button>
        ))}
      </div>
    </section>
  );
}
