import type { AiFinding } from '@/types';
import { useLanguage } from '@/hooks/useLanguage';

interface Props {
  finding: AiFinding;
}

export function EvidenceCitation({ finding }: Props) {
  const { t } = useLanguage();
  return (
    <div className="mt-2 rounded-md bg-slate-50 p-3 text-xs text-slate-700">
      {finding.evidence_extract && (
        <div>
          <span className="font-semibold text-slate-500">{t('evidence.quote')}: </span>
          <q className="italic">{finding.evidence_extract}</q>
        </div>
      )}
      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500">
        {finding.contract_clause_ref && (
          <span>
            {t('evidence.clause')}: <strong className="text-slate-700">{finding.contract_clause_ref}</strong>
          </span>
        )}
        {finding.source_citation && (
          <span>
            {t('evidence.citation')}: <strong className="text-slate-700">{finding.source_citation}</strong>
          </span>
        )}
        <span>
          {t(`evidence.level.${finding.evidence_level}`)}
        </span>
        <span>
          {t('evidence.confidence')}: <strong className="text-slate-700">{finding.confidence_percent}%</strong>
        </span>
        {finding.evidence_id && (
          <span className="font-mono" dir="ltr" title={finding.evidence_id}>
            {finding.evidence_id.slice(0, 3)}…{finding.evidence_id.slice(-6)}
          </span>
        )}
      </div>
    </div>
  );
}
