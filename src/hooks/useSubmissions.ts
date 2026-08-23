import { useCallback, useEffect, useState } from 'react';

import { supabase } from '@/utils/supabase';
import type { Submission } from '@/types';

interface State {
  submissions: Submission[];
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
}

export function useSubmissions(options: {
  projectId?: string;
  limit?: number;
} = {}): State {
  const { projectId, limit = 50 } = options;
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    let query = supabase
      .from('submissions')
      .select('*')
      .order('uploaded_at', { ascending: false })
      .limit(limit);
    if (projectId) query = query.eq('project_id', projectId);
    const { data, error } = await query;
    if (error) setError(error.message);
    else setSubmissions((data ?? []) as Submission[]);
    setLoading(false);
  }, [projectId, limit]);

  useEffect(() => {
    void load();
  }, [load]);

  return { submissions, loading, error, reload: load };
}
