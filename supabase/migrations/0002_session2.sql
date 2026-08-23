-- VERTEX Session 2 - dashboard RPCs, activity view, submissions storage bucket, extra RLS.
--
-- Assumes 0001_vertex_init.sql has already run (tables + roles + auth glue).
-- Idempotent: safe to re-apply.

-- =========================================================================
-- 1. RPC: get_dashboard_stats(user_id UUID)
--    Returns the numbers rendered in the Dashboard traffic-light cards.
-- =========================================================================
CREATE OR REPLACE FUNCTION public.get_dashboard_stats(p_user_id UUID DEFAULT NULL)
RETURNS TABLE (
  submissions_pending_count       BIGINT,
  obligations_at_risk_count       BIGINT,
  insurance_expiring_30d_count    BIGINT,
  kpi_penalties_this_month_aed    NUMERIC,
  compliance_score_avg_last_30d   NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := COALESCE(p_user_id, auth.uid());
  v_is_admin BOOLEAN := public.is_admin();
BEGIN
  RETURN QUERY
  SELECT
    (
      SELECT COUNT(*)::BIGINT FROM public.submissions s
      WHERE (v_is_admin OR EXISTS (
              SELECT 1 FROM public.projects p WHERE p.id = s.project_id AND p.owner_id = v_uid
            ))
        AND (s.processing_status = 'pending' OR s.approval_status = 'pending')
    ),
    (
      SELECT COUNT(*)::BIGINT FROM public.obligations o
      WHERE (v_is_admin OR EXISTS (
              SELECT 1 FROM public.projects p WHERE p.id = o.project_id AND p.owner_id = v_uid
            ))
        AND o.status IN ('at_risk', 'overdue')
    ),
    (
      SELECT COUNT(*)::BIGINT FROM public.insurance_tracking i
      WHERE (v_is_admin OR EXISTS (
              SELECT 1 FROM public.projects p WHERE p.id = i.project_id AND p.owner_id = v_uid
            ))
        AND i.days_to_expiry BETWEEN 0 AND 30
    ),
    COALESCE((
      SELECT SUM(k.penalty_amount_aed) FROM public.kpi_tracking k
      WHERE (v_is_admin OR EXISTS (
              SELECT 1 FROM public.projects p WHERE p.id = k.project_id AND p.owner_id = v_uid
            ))
        AND date_trunc('month', k.month) = date_trunc('month', now())
    ), 0)::NUMERIC,
    COALESCE((
      SELECT AVG(s.compliance_score) FROM public.submissions s
      WHERE (v_is_admin OR EXISTS (
              SELECT 1 FROM public.projects p WHERE p.id = s.project_id AND p.owner_id = v_uid
            ))
        AND s.updated_at >= now() - INTERVAL '30 days'
        AND s.compliance_score IS NOT NULL
    ), 0)::NUMERIC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_dashboard_stats(UUID) TO authenticated;

-- =========================================================================
-- 2. View: v_recent_activity
--    Unifies submissions + findings + comments into one feed.
-- =========================================================================
CREATE OR REPLACE VIEW public.v_recent_activity AS
  SELECT
    s.id                             AS event_id,
    'submission_uploaded'::text      AS event_type,
    s.uploaded_at                    AS occurred_at,
    s.uploaded_by                    AS actor_id,
    s.project_id,
    s.id                             AS submission_id,
    s.document_name                  AS title,
    s.processing_status::text        AS detail
  FROM public.submissions s
  UNION ALL
  SELECT
    f.id                             AS event_id,
    'finding_created'::text          AS event_type,
    f.created_at                     AS occurred_at,
    NULL                             AS actor_id,
    s.project_id,
    f.submission_id,
    f.title                          AS title,
    f.severity::text                 AS detail
  FROM public.ai_findings f
  JOIN public.submissions s ON s.id = f.submission_id
  UNION ALL
  SELECT
    c.id                             AS event_id,
    'comment_added'::text            AS event_type,
    c.created_at                     AS occurred_at,
    c.user_id                        AS actor_id,
    s.project_id,
    c.submission_id,
    LEFT(c.comment_text, 120)        AS title,
    NULL                             AS detail
  FROM public.comments c
  JOIN public.submissions s ON s.id = c.submission_id;

GRANT SELECT ON public.v_recent_activity TO authenticated;

-- =========================================================================
-- 3. Storage bucket for submission files
-- =========================================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('submissions', 'submissions', FALSE, 26214400)  -- 25 MB
ON CONFLICT (id) DO NOTHING;

-- Only reviewers/admins can upload; anyone who can read the submission can read the file.
DROP POLICY IF EXISTS "submissions_read_own" ON storage.objects;
CREATE POLICY "submissions_read_own" ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'submissions'
    AND (
      public.is_admin()
      OR EXISTS (
        SELECT 1 FROM public.submissions s
        JOIN public.projects p ON p.id = s.project_id
        WHERE s.id::text = split_part(storage.objects.name, '/', 2)
          AND p.owner_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "submissions_write_own" ON storage.objects;
CREATE POLICY "submissions_write_own" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'submissions'
    AND (
      public.is_admin()
      OR (
        public.current_user_role() IN ('reviewer', 'admin')
        AND EXISTS (
          SELECT 1 FROM public.projects p
          WHERE p.id::text = split_part(storage.objects.name, '/', 1)
            AND p.owner_id = auth.uid()
        )
      )
    )
  );

-- =========================================================================
-- 4. Extra table RLS: comments write policy so users can only comment on
--    submissions they can already read.
-- =========================================================================
DROP POLICY IF EXISTS "comments_insert_readable_submissions" ON public.comments;
CREATE POLICY "comments_insert_readable_submissions" ON public.comments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.submissions s
      JOIN public.projects p ON p.id = s.project_id
      WHERE s.id = comments.submission_id
        AND p.owner_id = auth.uid()
    )
  );

-- =========================================================================
-- 5. Convenience index for hot dashboard queries.
-- =========================================================================
CREATE INDEX IF NOT EXISTS idx_submissions_project_updated
  ON public.submissions (project_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_findings_submission_severity
  ON public.ai_findings (submission_id, severity);
CREATE INDEX IF NOT EXISTS idx_insurance_days_to_expiry
  ON public.insurance_tracking (days_to_expiry);
