import type { AiFinding } from '@/types';
import { useLanguage } from '@/hooks/useLanguage';

import { SeverityBadge } from './SeverityBadge';
import { EvidenceCitation } from './EvidenceCitation';

interface Props {
  finding: AiFinding;
}

const TYPE_ICON: Record<string, string> = {
  compliance_pass: '✓',
  compliance_fail: '✕',
  alert: '!',
  insight: 'i',
  recommendation: '★',
};

export function FindingCard({ finding }: Props) {
  const { t } = useLanguage();
  return (
    <article className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-2">
          <span
            aria-hidden="true"
            className="mt-0.5 inline-flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600"
          >
            {TYPE_ICON[finding.finding_type] ?? '•'}
          </span>
          <div className="min-w-0">
            <h4 className="text-sm font-semibold text-slate-900">{finding.title}</h4>
            <p className="text-[11px] uppercase tracking-wide text-slate-500">
              {t(`findingType.${finding.finding_type}`)}
            </p>
          </div>
        </div>
        <SeverityBadge severity={finding.severity} />
      </div>
      {finding.description && (
        <p className="mt-2 text-sm text-slate-700">{finding.description}</p>
      )}
      <EvidenceCitation finding={finding} />
    </article>
  );
}
