-- VERTEX Platform - Session 1 schema
-- 10 tables + RLS policies (Admin > Reviewer > Viewer > API User)
-- Region: UAE North (me-south-1)

-- =============================================================================
-- Extensions
-- =============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================================
-- Enum types
-- =============================================================================
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('admin', 'reviewer', 'viewer', 'api_user');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE preferred_lang AS ENUM ('en', 'ar');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE project_status AS ENUM ('active', 'closed', 'on_hold');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE submission_type AS ENUM (
    'invoice', 'timesheet', 'technical_doc', 'progress_update', 'other'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE processing_status AS ENUM ('pending', 'processing', 'complete', 'error');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE traffic_light AS ENUM ('green', 'amber', 'red');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE approval_status AS ENUM ('pending', 'approved', 'conditional', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE finding_type AS ENUM (
    'compliance_pass', 'compliance_fail', 'alert', 'insight', 'recommendation'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE severity_level AS ENUM ('critical', 'high', 'medium', 'low', 'info');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE evidence_level AS ENUM (
    'verified_source', 'saved_rule', 'working_assumption', 'pending_confirmation', 'unknown'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE mobilization_status AS ENUM ('mobilised', 'pending', 'not_yet_deployed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE formal_approval_status AS ENUM ('approved', 'pending', 'not_required');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE obligation_type AS ENUM (
    'deliverable', 'payment', 'renewal', 'approval', 'compliance'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE obligation_status AS ENUM ('on_track', 'at_risk', 'overdue', 'complete');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE renewal_status AS ENUM ('active', 'expiring_soon', 'expired', 'renewed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- =============================================================================
-- Shared trigger: updated_at
-- =============================================================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- Table 1: users  (mirrors auth.users, adds role + profile)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL UNIQUE,
  full_name VARCHAR(255),
  role user_role NOT NULL DEFAULT 'viewer',
  preferred_language preferred_lang NOT NULL DEFAULT 'en',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_login TIMESTAMPTZ,
  active BOOLEAN NOT NULL DEFAULT TRUE
);
CREATE TRIGGER users_updated_at BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================================================
-- Table 2: projects
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  contract_ref VARCHAR(100) NOT NULL UNIQUE,
  contract_value_aed NUMERIC(18, 2),
  commencement_date DATE,
  completion_date DATE,
  performance_bond_aed NUMERIC(18, 2),
  insurance_amount_aed NUMERIC(18, 2),
  insurance_expiry_date DATE,
  kpi_cap_percent NUMERIC(5, 2) NOT NULL DEFAULT 10.0,
  owner_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  status project_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS projects_owner_idx ON public.projects(owner_id);
CREATE INDEX IF NOT EXISTS projects_status_idx ON public.projects(status);
CREATE TRIGGER projects_updated_at BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================================================
-- Table 3: submissions
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  submission_type submission_type NOT NULL,
  document_name VARCHAR(255) NOT NULL,
  file_url VARCHAR(1024),
  file_size_bytes INTEGER,
  uploaded_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processing_status processing_status NOT NULL DEFAULT 'pending',
  processing_started_at TIMESTAMPTZ,
  processing_completed_at TIMESTAMPTZ,
  compliance_score INTEGER CHECK (compliance_score BETWEEN 0 AND 100),
  traffic_light traffic_light,
  confidence_percent INTEGER CHECK (confidence_percent BETWEEN 0 AND 100),
  approval_status approval_status NOT NULL DEFAULT 'pending',
  approved_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS submissions_project_idx ON public.submissions(project_id);
CREATE INDEX IF NOT EXISTS submissions_status_idx ON public.submissions(processing_status);
CREATE TRIGGER submissions_updated_at BEFORE UPDATE ON public.submissions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================================================
-- Table 4: ai_findings
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.ai_findings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES public.submissions(id) ON DELETE CASCADE,
  finding_type finding_type NOT NULL,
  severity severity_level NOT NULL DEFAULT 'info',
  title VARCHAR(255) NOT NULL,
  description TEXT,
  contract_clause_ref VARCHAR(100),
  evidence_extract TEXT,
  evidence_level evidence_level NOT NULL DEFAULT 'unknown',
  source_citation VARCHAR(512),
  confidence_percent INTEGER CHECK (confidence_percent BETWEEN 0 AND 100),
  requires_action BOOLEAN NOT NULL DEFAULT FALSE,
  ai_model_used VARCHAR(100),
  prompt_version VARCHAR(50),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ai_findings_submission_idx ON public.ai_findings(submission_id);
CREATE INDEX IF NOT EXISTS ai_findings_severity_idx ON public.ai_findings(severity);
CREATE TRIGGER ai_findings_updated_at BEFORE UPDATE ON public.ai_findings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================================================
-- Table 5: comments
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES public.submissions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  comment_text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved BOOLEAN NOT NULL DEFAULT FALSE,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES public.users(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS comments_submission_idx ON public.comments(submission_id);
CREATE TRIGGER comments_updated_at BEFORE UPDATE ON public.comments
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================================================
-- Table 6: kpi_tracking
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.kpi_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  submission_id UUID REFERENCES public.submissions(id) ON DELETE SET NULL,
  kpi_category VARCHAR(100) NOT NULL,
  kpi_description VARCHAR(500),
  penalty_per_unit_aed NUMERIC(18, 2),
  units_triggered INTEGER DEFAULT 0,
  penalty_amount_aed NUMERIC(18, 2),
  deduction_recommended BOOLEAN NOT NULL DEFAULT FALSE,
  deduction_reason TEXT,
  deduction_approved BOOLEAN NOT NULL DEFAULT FALSE,
  approved_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  month DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS kpi_project_idx ON public.kpi_tracking(project_id);
CREATE INDEX IF NOT EXISTS kpi_month_idx ON public.kpi_tracking(month);
CREATE TRIGGER kpi_updated_at BEFORE UPDATE ON public.kpi_tracking
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================================================
-- Table 7: mobilization_tracking
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.mobilization_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  position_name VARCHAR(255) NOT NULL,
  contracted_allocation NUMERIC(5, 2),
  deployed_percent INTEGER CHECK (deployed_percent BETWEEN 0 AND 100),
  absence_rate_percent INTEGER CHECK (absence_rate_percent BETWEEN 0 AND 100),
  absence_days INTEGER DEFAULT 0,
  billable_days INTEGER DEFAULT 0,
  status mobilization_status NOT NULL DEFAULT 'pending',
  days_outstanding INTEGER DEFAULT 0,
  formal_approval_status formal_approval_status NOT NULL DEFAULT 'not_required',
  month DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS mob_project_idx ON public.mobilization_tracking(project_id);
CREATE INDEX IF NOT EXISTS mob_month_idx ON public.mobilization_tracking(month);
CREATE TRIGGER mob_updated_at BEFORE UPDATE ON public.mobilization_tracking
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================================================
-- Table 8: obligations
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.obligations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  obligation_type obligation_type NOT NULL,
  description VARCHAR(500) NOT NULL,
  details TEXT,
  due_date DATE,
  submitted_date DATE,
  approved_date DATE,
  status obligation_status NOT NULL DEFAULT 'on_track',
  days_remaining INTEGER,
  alert_threshold_days INTEGER NOT NULL DEFAULT 7,
  critical_path_blocking BOOLEAN NOT NULL DEFAULT FALSE,
  kpi_leverage_text VARCHAR(500),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS obligations_project_idx ON public.obligations(project_id);
CREATE INDEX IF NOT EXISTS obligations_due_idx ON public.obligations(due_date);
CREATE TRIGGER obligations_updated_at BEFORE UPDATE ON public.obligations
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================================================
-- Table 9: insurance_tracking
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.insurance_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  coverage_type VARCHAR(100) NOT NULL,
  provider VARCHAR(255),
  policy_number VARCHAR(100),
  amount_aed NUMERIC(18, 2),
  expiry_date DATE,
  renewal_status renewal_status NOT NULL DEFAULT 'active',
  renewal_evidence_url VARCHAR(1024),
  renewal_evidence_uploaded_date DATE,
  days_to_expiry INTEGER,
  alert_sent BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS insurance_project_idx ON public.insurance_tracking(project_id);
CREATE INDEX IF NOT EXISTS insurance_expiry_idx ON public.insurance_tracking(expiry_date);
CREATE TRIGGER insurance_updated_at BEFORE UPDATE ON public.insurance_tracking
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================================================
-- Table 10: audit_log
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(100),
  resource_id UUID,
  before_state JSONB,
  after_state JSONB,
  ip_address VARCHAR(64),
  user_agent VARCHAR(512),
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  details JSONB
);
CREATE INDEX IF NOT EXISTS audit_user_idx ON public.audit_log(user_id);
CREATE INDEX IF NOT EXISTS audit_resource_idx ON public.audit_log(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS audit_timestamp_idx ON public.audit_log(timestamp DESC);

-- =============================================================================
-- Helpers used by RLS policies
-- =============================================================================
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS user_role AS $$
  SELECT role FROM public.users WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT COALESCE(public.current_user_role() = 'admin', FALSE);
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_reviewer_or_admin()
RETURNS BOOLEAN AS $$
  SELECT COALESCE(public.current_user_role() IN ('admin', 'reviewer'), FALSE);
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- =============================================================================
-- Auto-create public.users on auth.users insert
-- =============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================================================
-- Enable RLS on every table
-- =============================================================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_findings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kpi_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mobilization_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.obligations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.insurance_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- RLS policies - Admin: full access on everything
-- =============================================================================
CREATE POLICY admin_all_users ON public.users
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY admin_all_projects ON public.projects
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY admin_all_submissions ON public.submissions
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY admin_all_findings ON public.ai_findings
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY admin_all_comments ON public.comments
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY admin_all_kpi ON public.kpi_tracking
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY admin_all_mob ON public.mobilization_tracking
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY admin_all_obligations ON public.obligations
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY admin_all_insurance ON public.insurance_tracking
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY admin_all_audit ON public.audit_log
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- =============================================================================
-- RLS - users: every authenticated user can read/update their own row
-- =============================================================================
CREATE POLICY users_read_self ON public.users
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY users_update_self ON public.users
  FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- =============================================================================
-- RLS - Reviewer: full access on projects they own + their submissions
-- =============================================================================
CREATE POLICY reviewer_own_projects ON public.projects
  FOR ALL USING (
    public.current_user_role() = 'reviewer' AND owner_id = auth.uid()
  ) WITH CHECK (
    public.current_user_role() = 'reviewer' AND owner_id = auth.uid()
  );

CREATE POLICY reviewer_submissions ON public.submissions
  FOR ALL USING (
    public.current_user_role() = 'reviewer'
    AND project_id IN (SELECT id FROM public.projects WHERE owner_id = auth.uid())
  ) WITH CHECK (
    public.current_user_role() = 'reviewer'
    AND project_id IN (SELECT id FROM public.projects WHERE owner_id = auth.uid())
  );

CREATE POLICY reviewer_findings ON public.ai_findings
  FOR ALL USING (
    public.current_user_role() = 'reviewer'
    AND submission_id IN (
      SELECT s.id FROM public.submissions s
      JOIN public.projects p ON p.id = s.project_id
      WHERE p.owner_id = auth.uid()
    )
  ) WITH CHECK (
    public.current_user_role() = 'reviewer'
    AND submission_id IN (
      SELECT s.id FROM public.submissions s
      JOIN public.projects p ON p.id = s.project_id
      WHERE p.owner_id = auth.uid()
    )
  );

CREATE POLICY reviewer_comments ON public.comments
  FOR ALL USING (
    public.current_user_role() = 'reviewer'
    AND submission_id IN (
      SELECT s.id FROM public.submissions s
      JOIN public.projects p ON p.id = s.project_id
      WHERE p.owner_id = auth.uid()
    )
  ) WITH CHECK (
    public.current_user_role() = 'reviewer'
    AND submission_id IN (
      SELECT s.id FROM public.submissions s
      JOIN public.projects p ON p.id = s.project_id
      WHERE p.owner_id = auth.uid()
    )
  );

CREATE POLICY reviewer_kpi ON public.kpi_tracking
  FOR ALL USING (
    public.current_user_role() = 'reviewer'
    AND project_id IN (SELECT id FROM public.projects WHERE owner_id = auth.uid())
  ) WITH CHECK (
    public.current_user_role() = 'reviewer'
    AND project_id IN (SELECT id FROM public.projects WHERE owner_id = auth.uid())
  );

CREATE POLICY reviewer_mob ON public.mobilization_tracking
  FOR ALL USING (
    public.current_user_role() = 'reviewer'
    AND project_id IN (SELECT id FROM public.projects WHERE owner_id = auth.uid())
  ) WITH CHECK (
    public.current_user_role() = 'reviewer'
    AND project_id IN (SELECT id FROM public.projects WHERE owner_id = auth.uid())
  );

CREATE POLICY reviewer_obligations ON public.obligations
  FOR ALL USING (
    public.current_user_role() = 'reviewer'
    AND project_id IN (SELECT id FROM public.projects WHERE owner_id = auth.uid())
  ) WITH CHECK (
    public.current_user_role() = 'reviewer'
    AND project_id IN (SELECT id FROM public.projects WHERE owner_id = auth.uid())
  );

CREATE POLICY reviewer_insurance ON public.insurance_tracking
  FOR ALL USING (
    public.current_user_role() = 'reviewer'
    AND project_id IN (SELECT id FROM public.projects WHERE owner_id = auth.uid())
  ) WITH CHECK (
    public.current_user_role() = 'reviewer'
    AND project_id IN (SELECT id FROM public.projects WHERE owner_id = auth.uid())
  );

-- =============================================================================
-- RLS - Viewer: read-only on every project-scoped table
-- =============================================================================
CREATE POLICY viewer_read_projects ON public.projects
  FOR SELECT USING (public.current_user_role() = 'viewer');
CREATE POLICY viewer_read_submissions ON public.submissions
  FOR SELECT USING (public.current_user_role() = 'viewer');
CREATE POLICY viewer_read_findings ON public.ai_findings
  FOR SELECT USING (public.current_user_role() = 'viewer');
CREATE POLICY viewer_read_comments ON public.comments
  FOR SELECT USING (public.current_user_role() = 'viewer');
CREATE POLICY viewer_read_kpi ON public.kpi_tracking
  FOR SELECT USING (public.current_user_role() = 'viewer');
CREATE POLICY viewer_read_mob ON public.mobilization_tracking
  FOR SELECT USING (public.current_user_role() = 'viewer');
CREATE POLICY viewer_read_obligations ON public.obligations
  FOR SELECT USING (public.current_user_role() = 'viewer');
CREATE POLICY viewer_read_insurance ON public.insurance_tracking
  FOR SELECT USING (public.current_user_role() = 'viewer');

-- =============================================================================
-- RLS - API User: read-only programmatic access (same shape as viewer)
-- =============================================================================
CREATE POLICY api_read_projects ON public.projects
  FOR SELECT USING (public.current_user_role() = 'api_user');
CREATE POLICY api_read_submissions ON public.submissions
  FOR SELECT USING (public.current_user_role() = 'api_user');
CREATE POLICY api_read_findings ON public.ai_findings
  FOR SELECT USING (public.current_user_role() = 'api_user');
CREATE POLICY api_read_kpi ON public.kpi_tracking
  FOR SELECT USING (public.current_user_role() = 'api_user');
CREATE POLICY api_read_mob ON public.mobilization_tracking
  FOR SELECT USING (public.current_user_role() = 'api_user');
CREATE POLICY api_read_obligations ON public.obligations
  FOR SELECT USING (public.current_user_role() = 'api_user');
CREATE POLICY api_read_insurance ON public.insurance_tracking
  FOR SELECT USING (public.current_user_role() = 'api_user');

-- =============================================================================
-- RLS - audit_log: any authenticated user can INSERT their own events;
-- reads are admin-only (handled by admin_all_audit above).
-- =============================================================================
CREATE POLICY audit_insert_self ON public.audit_log
  FOR INSERT WITH CHECK (auth.uid() = user_id);
