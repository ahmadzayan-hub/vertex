import { useCallback, useEffect, useMemo, useState } from 'react';

import { supabase } from '@/utils/supabase';
import type { AiFinding, Submission, Obligation, InsurancePolicy, Severity } from '@/types';

interface State {
  loading: boolean;
  error: string | null;
  portfolioScore: number;
  totalFindings: number;
  openObligations: number;
  activeInsurance: number;
  byProject: Array<{ projectId: string; projectName: string; score: number }>;
  byFindingType: Array<{ type: string; count: number }>;
  bySeverity: Array<{ severity: Severity; count: number }>;
  trend: Array<{ week: string; count: number }>;
  reload: () => Promise<void>;
}

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

function weekKey(iso: string): string {
  const d = new Date(iso);
  // Anchor to Monday of that week (approx via day-of-year math).
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() - day + 1);
  return d.toISOString().slice(0, 10);
}

export function useAnalytics(): State {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [findings, setFindings] = useState<AiFinding[]>([]);
  const [obligations, setObligations] = useState<Obligation[]>([]);
  const [insurance, setInsurance] = useState<InsurancePolicy[]>([]);
  const [projectNames, setProjectNames] = useState<Map<string, string>>(new Map());

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const sinceIso = new Date(Date.now() - 12 * WEEK_MS).toISOString();
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

      const [subRes, findRes, oblRes, insRes, projRes] = await Promise.all([
        supabase
          .from('submissions')
          .select('id, project_id, compliance_score, updated_at, approval_status')
          .gte('updated_at', thirtyDaysAgo)
          .limit(1000),
        supabase
          .from('ai_findings')
          .select('id, submission_id, finding_type, severity, created_at')
          .gte('created_at', sinceIso)
          .limit(2000),
        supabase.from('obligations').select('id, status').limit(1000),
        supabase.from('insurance_tracking').select('id, renewal_status, days_to_expiry').limit(1000),
        supabase.from('projects').select('id, name').limit(500),
      ]);

      if (subRes.error) throw subRes.error;
      if (findRes.error) throw findRes.error;
      if (oblRes.error) throw oblRes.error;
      if (insRes.error) throw insRes.error;
      if (projRes.error) throw projRes.error;

      setSubmissions((subRes.data ?? []) as Submission[]);
      setFindings((findRes.data ?? []) as AiFinding[]);
      setObligations((oblRes.data ?? []) as Obligation[]);
      setInsurance((insRes.data ?? []) as InsurancePolicy[]);
      const map = new Map<string, string>();
      for (const p of projRes.data ?? []) map.set(p.id, p.name);
      setProjectNames(map);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'load failed');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const derived = useMemo(() => {
    // Portfolio score = weighted avg of submissions.compliance_score in last 30d.
    const scored = submissions.filter((s) => s.compliance_score != null);
    const portfolioScore =
      scored.length === 0
        ? 0
        : Math.round(
            scored.reduce((s, r) => s + Number(r.compliance_score ?? 0), 0) / scored.length
          );

    const openObligations = obligations.filter(
      (o) => o.status === 'on_track' || o.status === 'at_risk'
    ).length;
    const activeInsurance = insurance.filter(
      (p) => p.renewal_status !== 'expired' && (p.days_to_expiry == null || p.days_to_expiry >= 0)
    ).length;

    // Compliance by project (avg score of submissions in window).
    const projectAgg = new Map<string, { total: number; count: number }>();
    for (const s of scored) {
      const acc = projectAgg.get(s.project_id) ?? { total: 0, count: 0 };
      acc.total += Number(s.compliance_score ?? 0);
      acc.count += 1;
      projectAgg.set(s.project_id, acc);
    }
    const byProject = Array.from(projectAgg.entries())
      .map(([projectId, { total, count }]) => ({
        projectId,
        projectName: projectNames.get(projectId) ?? projectId,
        score: Math.round(total / count),
      }))
      .sort((a, b) => b.score - a.score);

    // Findings by finding_type.
    const typeMap = new Map<string, number>();
    for (const f of findings) typeMap.set(f.finding_type, (typeMap.get(f.finding_type) ?? 0) + 1);
    const byFindingType = Array.from(typeMap.entries()).map(([type, count]) => ({ type, count }));

    // Findings by severity.
    const sevMap = new Map<Severity, number>();
    for (const f of findings) sevMap.set(f.severity, (sevMap.get(f.severity) ?? 0) + 1);
    const bySeverity = (Array.from(sevMap.entries()) as [Severity, number][]).map(([severity, count]) => ({ severity, count }));

    // Trend: findings per week for last 12 weeks.
    const trendMap = new Map<string, number>();
    for (const f of findings) {
      const key = weekKey(f.created_at);
      trendMap.set(key, (trendMap.get(key) ?? 0) + 1);
    }
    const trend = Array.from(trendMap.entries())
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .slice(-12)
      .map(([week, count]) => ({ week, count }));

    return {
      portfolioScore,
      totalFindings: findings.length,
      openObligations,
      activeInsurance,
      byProject,
      byFindingType,
      bySeverity,
      trend,
    };
  }, [submissions, findings, obligations, insurance, projectNames]);

  return { loading, error, reload: load, ...derived };
}
