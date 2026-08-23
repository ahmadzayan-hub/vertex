import { useCallback, useEffect, useMemo, useState } from 'react';

import { supabase } from '@/utils/supabase';
import { logAuditEvent } from '@/services/audit';
import { uploadSubmissionFile } from '@/services/storage';
import type { InsurancePolicy } from '@/types';

interface State {
  policies: InsurancePolicy[];
  loading: boolean;
  error: string | null;
  bucketed: {
    expired: InsurancePolicy[];
    expiring: InsurancePolicy[];
    active: InsurancePolicy[];
    renewed: InsurancePolicy[];
  };
  reload: () => Promise<void>;
  uploadEvidence: (policyId: string, projectId: string, file: File) => Promise<boolean>;
}

/**
 * Reuses the `submissions` storage bucket for insurance renewal evidence.
 * Path layout: `<project_id>/insurance/<policy_id>/<file>`. RLS on the
 * bucket already scopes writes to the project owner.
 */
export function useInsurance(): State {
  const [policies, setPolicies] = useState<InsurancePolicy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from('insurance_tracking')
      .select('*')
      .order('days_to_expiry', { ascending: true, nullsFirst: false })
      .limit(500);
    if (error) setError(error.message);
    else setPolicies((data ?? []) as InsurancePolicy[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const bucketed = useMemo(() => {
    const b = { expired: [] as InsurancePolicy[], expiring: [] as InsurancePolicy[], active: [] as InsurancePolicy[], renewed: [] as InsurancePolicy[] };
    for (const p of policies) {
      if (p.renewal_status === 'renewed') b.renewed.push(p);
      else if (p.renewal_status === 'expired' || (p.days_to_expiry != null && p.days_to_expiry < 0)) b.expired.push(p);
      else if (p.days_to_expiry != null && p.days_to_expiry <= 30) b.expiring.push(p);
      else b.active.push(p);
    }
    return b;
  }, [policies]);

  const uploadEvidence = useCallback(
    async (policyId: string, projectId: string, file: File) => {
      try {
        const path = await uploadSubmissionFile(projectId, `insurance/${policyId}`, file);
        const { error: updErr } = await supabase
          .from('insurance_tracking')
          .update({
            renewal_evidence_url: path,
            renewal_evidence_uploaded_date: new Date().toISOString().slice(0, 10),
            renewal_status: 'renewed',
          })
          .eq('id', policyId);
        if (updErr) throw updErr;
        await logAuditEvent({
          action: 'insurance.renewed',
          resourceType: 'insurance_tracking',
          resourceId: policyId,
          afterState: { evidence_path: path },
        });
        await load();
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'evidence upload failed');
        return false;
      }
    },
    [load]
  );

  return { policies, loading, error, bucketed, reload: load, uploadEvidence };
}
