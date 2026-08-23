import { useCallback, useEffect, useState } from 'react';

import { supabase } from '@/utils/supabase';
import type { Project } from '@/types';

interface State {
  projects: Project[];
  loading: boolean;
  error: string | null;
}

export function useProjects(): State & { reload: () => Promise<void> } {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      setError(error.message);
    } else {
      setProjects((data ?? []) as Project[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return { projects, loading, error, reload: load };
}

export function useProject(projectId: string | undefined): State & { project: Project | null } {
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!projectId) return;
    let cancelled = false;
    setLoading(true);
    supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) setError(error.message);
        else setProject((data as Project) ?? null);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  return { project, projects: [], loading, error };
}
