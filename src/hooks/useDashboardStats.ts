import { useCallback, useEffect, useState } from 'react';

import { supabase } from '@/utils/supabase';
import type { DashboardStats, ActivityEvent, TrafficLight } from '@/types';

interface DashboardData {
  stats: DashboardStats | null;
  activity: ActivityEvent[];
  trend: Array<{ month: string; score: number }>;
  byStatus: Array<{ status: string; count: number }>;
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
}

const EMPTY_STATS: DashboardStats = {
  submissions_pending_count: 0,
  obligations_at_risk_count: 0,
  insurance_expiring_30d_count: 0,
  kpi_penalties_this_month_aed: 0,
  compliance_score_avg_last_30d: 0,
};

export function trafficLightForStat(kind: keyof DashboardStats, value: number): TrafficLight {
  switch (kind) {
    case 'submissions_pending_count':
      if (value === 0) return 'green';
      if (value <= 4) return 'amber';
      return 'red';
    case 'obligations_at_risk_count':
      if (value === 0) return 'green';
      if (value <= 2) return 'amber';
      return 'red';
    case 'insurance_expiring_30d_count':
      if (value === 0) return 'green';
      if (value === 1) return 'amber';
      return 'red';
    case 'compliance_score_avg_last_30d':
      if (value >= 85) return 'green';
      if (value >= 70) return 'amber';
      return 'red';
    case 'kpi_penalties_this_month_aed':
      // Amber over 0, red over 25k (simple heuristic; refined server-side).
      if (value <= 0) return 'green';
      if (value < 25000) return 'amber';
      return 'red';
    default:
      return 'green';
  }
}

export function useDashboardStats(): DashboardData {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [activity, setActivity] = useState<ActivityEvent[]>([]);
  const [trend, setTrend] = useState<Array<{ month: string; score: number }>>([]);
  const [byStatus, setByStatus] = useState<Array<{ status: string; count: number }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [statsRes, activityRes, submissionsRes] = await Promise.all([
        supabase.rpc('get_dashboard_stats'),
        supabase.from('v_recent_activity').select('*').order('occurred_at', { ascending: false }).limit(10),
        supabase
          .from('submissions')
          .select('approval_status, compliance_score, updated_at')
          .order('updated_at', { ascending: false })
          .limit(500),
      ]);

      if (statsRes.error) throw statsRes.error;
      if (activityRes.error) throw activityRes.error;
      if (submissionsRes.error) throw submissionsRes.error;

      const rawStats = Array.isArray(statsRes.data) ? statsRes.data[0] : statsRes.data;
      setStats((rawStats as DashboardStats) ?? EMPTY_STATS);
      setActivity((activityRes.data as ActivityEvent[]) ?? []);

      // Compute 6-month compliance trend on the client.
      const trendMap = new Map<string, { total: number; count: number }>();
      for (const row of submissionsRes.data ?? []) {
        if (row.compliance_score == null || !row.updated_at) continue;
        const d = new Date(row.updated_at);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const acc = trendMap.get(key) ?? { total: 0, count: 0 };
        acc.total += row.compliance_score as number;
        acc.count += 1;
        trendMap.set(key, acc);
      }
      const sortedTrend = Array.from(trendMap.entries())
        .sort(([a], [b]) => (a < b ? -1 : 1))
        .slice(-6)
        .map(([month, { total, count }]) => ({ month, score: Math.round(total / count) }));
      setTrend(sortedTrend);

      // Submissions by status.
      const statusMap = new Map<string, number>();
      for (const row of submissionsRes.data ?? []) {
        const key = (row.approval_status as string) ?? 'unknown';
        statusMap.set(key, (statusMap.get(key) ?? 0) + 1);
      }
      setByStatus(Array.from(statusMap.entries()).map(([status, count]) => ({ status, count })));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'load failed');
      setStats(EMPTY_STATS);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return { stats, activity, trend, byStatus, loading, error, reload: load };
}
