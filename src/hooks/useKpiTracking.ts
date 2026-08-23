import { useCallback, useEffect, useMemo, useState } from 'react';

import { supabase } from '@/utils/supabase';
import { logAuditEvent } from '@/services/audit';
import type { KpiRecord } from '@/types';

interface Filters {
  projectId?: string;
  monthsBack?: number;
}

interface State {
  records: KpiRecord[];
  loading: boolean;
  error: string | null;
  totalThisMonth: number;
  totalWindow: number;
  openForApproval: number;
  reload: () => Promise<void>;
  toggleApproval: (id: string, approved: boolean) => Promise<void>;
}

export function useKpiTracking({ projectId, monthsBack = 12 }: Filters = {}): State {
  const [records, setRecords] = useState<KpiRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const since = new Date();
    since.setMonth(since.getMonth() - monthsBack);
    let query = supabase
      .from('kpi_tracking')
      .select('*')
      .gte('month', since.toISOString().slice(0, 10))
      .order('month', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(500);
    if (projectId) query = query.eq('project_id', projectId);
    const { data, error } = await query;
    if (error) setError(error.message);
    else setRecords((data ?? []) as KpiRecord[]);
    setLoading(false);
  }, [projectId, monthsBack]);

  useEffect(() => {
    void load();
  }, [load]);

  const totalThisMonth = useMemo(() => {
    // Use local calendar (not toISOString) so a UAE user at 03:00 local time
    // is not counted against "last month" because UTC has already rolled over.
    const now = new Date();
    const key = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    return records
      .filter((r) => (r.month ?? '').startsWith(key))
      .reduce((s, r) => s + Number(r.penalty_amount_aed ?? 0), 0);
  }, [records]);

  const totalWindow = useMemo(
    () => records.reduce((s, r) => s + Number(r.penalty_amount_aed ?? 0), 0),
    [records]
  );

  const openForApproval = useMemo(
    () => records.filter((r) => r.deduction_recommended && !r.deduction_approved).length,
    [records]
  );

  const toggleApproval = useCallback(
    async (id: string, approved: boolean) => {
      const before = records.find((r) => r.id === id) ?? null;
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const { error: updErr } = await supabase
        .from('kpi_tracking')
        .update({
          deduction_approved: approved,
          approved_by: approved ? user?.id ?? null : null,
        })
        .eq('id', id);
      if (updErr) {
        setError(updErr.message);
        return;
      }
      await logAuditEvent({
        action: approved ? 'kpi.approved' : 'kpi.revoked',
        resourceType: 'kpi_tracking',
        resourceId: id,
        beforeState: before ? { deduction_approved: before.deduction_approved } : null,
        afterState: { deduction_approved: approved },
      });
      await load();
    },
    [load, records]
  );

  return {
    records,
    loading,
    error,
    totalThisMonth,
    totalWindow,
    openForApproval,
    reload: load,
    toggleApproval,
  };
}
