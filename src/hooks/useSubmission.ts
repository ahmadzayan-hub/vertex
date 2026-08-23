import { useCallback, useEffect, useRef, useState } from 'react';

import { supabase } from '@/utils/supabase';
import type {
  Submission,
  Project,
  AiFinding,
  Comment,
  ApprovalStatus,
  AiAnalysisResult,
} from '@/types';
import { analyzeSubmission } from '@/services/ai';
import { logAuditEvent } from '@/services/audit';

interface State {
  submission: Submission | null;
  project: Project | null;
  findings: AiFinding[];
  comments: Comment[];
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
  runAnalysis: () => Promise<void>;
  setApproval: (status: ApprovalStatus, reason?: string) => Promise<void>;
}

export function useSubmission(submissionId: string | undefined): State {
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [findings, setFindings] = useState<AiFinding[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!submissionId) return;
    setLoading(true);
    setError(null);
    try {
      const { data: sub, error: subErr } = await supabase
        .from('submissions')
        .select('*')
        .eq('id', submissionId)
        .maybeSingle();
      if (subErr) throw subErr;
      setSubmission((sub as Submission) ?? null);

      if (sub) {
        const [projRes, findingsRes, commentsRes] = await Promise.all([
          supabase.from('projects').select('*').eq('id', sub.project_id).maybeSingle(),
          supabase.from('ai_findings').select('*').eq('submission_id', submissionId).order('severity', { ascending: false }),
          supabase
            .from('comments')
            .select('*')
            .eq('submission_id', submissionId)
            .order('created_at', { ascending: true }),
        ]);
        if (projRes.error) throw projRes.error;
        if (findingsRes.error) throw findingsRes.error;
        if (commentsRes.error) throw commentsRes.error;
        setProject((projRes.data as Project) ?? null);
        setFindings((findingsRes.data as AiFinding[]) ?? []);
        setComments((commentsRes.data as Comment[]) ?? []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'load failed');
    } finally {
      setLoading(false);
    }
  }, [submissionId]);

  useEffect(() => {
    void load();
  }, [load]);

  // Realtime: reload the submission bundle whenever new findings, comments,
  // or submission updates land for THIS submission. Debounced with a 250 ms
  // trailing timer so a burst of inserts (for example, the analyzer writing
  // five findings in one go) collapses to a single reload instead of five
  // parallel three-select round-trips.
  const debounceRef = useRef<number | null>(null);
  useEffect(() => {
    if (!submissionId) return;
    const scheduleReload = () => {
      if (debounceRef.current !== null) window.clearTimeout(debounceRef.current);
      debounceRef.current = window.setTimeout(() => {
        debounceRef.current = null;
        void load();
      }, 250);
    };
    const channel = supabase
      .channel(`submission:${submissionId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'submissions', filter: `id=eq.${submissionId}` },
        scheduleReload
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'ai_findings', filter: `submission_id=eq.${submissionId}` },
        scheduleReload
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'comments', filter: `submission_id=eq.${submissionId}` },
        scheduleReload
      )
      .subscribe();
    return () => {
      if (debounceRef.current !== null) window.clearTimeout(debounceRef.current);
      void supabase.removeChannel(channel);
    };
  }, [submissionId, load]);

  const runAnalysis = useCallback(async () => {
    if (!submission || !project) return;
    setError(null);
    // Mark processing
    const { error: startErr } = await supabase
      .from('submissions')
      .update({
        processing_status: 'processing',
        processing_started_at: new Date().toISOString(),
      })
      .eq('id', submission.id);
    if (startErr) {
      setError(startErr.message);
      return;
    }

    let result: AiAnalysisResult;
    try {
      result = await analyzeSubmission({ submission, project });
    } catch (err) {
      await supabase
        .from('submissions')
        .update({
          processing_status: 'error',
          processing_completed_at: new Date().toISOString(),
        })
        .eq('id', submission.id);
      setError(err instanceof Error ? err.message : 'analysis failed');
      await load();
      return;
    }

    // Persist findings + updated submission
    const rows = result.findings.map((f) => ({ ...f, submission_id: submission.id }));
    if (rows.length > 0) {
      const { error: insErr } = await supabase.from('ai_findings').insert(rows);
      if (insErr) {
        setError(insErr.message);
        return;
      }
    }
    const { error: updErr } = await supabase
      .from('submissions')
      .update({
        processing_status: 'complete',
        processing_completed_at: new Date().toISOString(),
        compliance_score: result.compliance_score,
        traffic_light: result.traffic_light,
        confidence_percent: result.confidence_percent,
      })
      .eq('id', submission.id);
    if (updErr) {
      setError(updErr.message);
      return;
    }
    await logAuditEvent({
      action: 'submission.analyzed',
      resourceType: 'submission',
      resourceId: submission.id,
      afterState: {
        compliance_score: result.compliance_score,
        traffic_light: result.traffic_light,
        findings_count: rows.length,
      },
    });
    await load();
  }, [submission, project, load]);

  const setApproval = useCallback(
    async (status: ApprovalStatus, reason?: string) => {
      if (!submission) return;
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const { error: updErr } = await supabase
        .from('submissions')
        .update({
          approval_status: status,
          approved_by: user?.id ?? null,
          approved_at: new Date().toISOString(),
        })
        .eq('id', submission.id);
      if (updErr) {
        setError(updErr.message);
        return;
      }
      await logAuditEvent({
        action: `submission.${status}`,
        resourceType: 'submission',
        resourceId: submission.id,
        beforeState: { approval_status: submission.approval_status },
        afterState: { approval_status: status },
        details: reason ? { reason } : null,
      });
      await load();
    },
    [submission, load]
  );

  return { submission, project, findings, comments, loading, error, reload: load, runAnalysis, setApproval };
}
