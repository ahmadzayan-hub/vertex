import { useCallback, useEffect, useMemo, useState } from 'react';

import { supabase } from '@/utils/supabase';
import type { Obligation, ObligationStatus, ObligationType } from '@/types';

interface Filters {
  projectId?: string;
  type?: ObligationType;
}

interface State {
  obligations: Obligation[];
  grouped: Record<ObligationStatus, Obligation[]>;
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
}

const BUCKET_ORDER: ObligationStatus[] = ['overdue', 'at_risk', 'on_track', 'complete'];

export function useObligations({ projectId, type }: Filters = {}): State {
  const [obligations, setObligations] = useState<Obligation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    let query = supabase
      .from('obligations')
      .select('*')
      .order('due_date', { ascending: true, nullsFirst: false })
      .limit(500);
    if (projectId) query = query.eq('project_id', projectId);
    if (type) query = query.eq('obligation_type', type);
    const { data, error } = await query;
    if (error) setError(error.message);
    else setObligations((data ?? []) as Obligation[]);
    setLoading(false);
  }, [projectId, type]);

  useEffect(() => {
    void load();
  }, [load]);

  const grouped = useMemo(() => {
    const g: Record<ObligationStatus, Obligation[]> = {
      overdue: [],
      at_risk: [],
      on_track: [],
      complete: [],
    };
    for (const o of obligations) g[o.status]?.push(o);
    return g;
  }, [obligations]);

  return { obligations, grouped, loading, error, reload: load };
}

export { BUCKET_ORDER as OBLIGATION_BUCKET_ORDER };
