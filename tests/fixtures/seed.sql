-- VERTEX authenticated e2e fixtures.
--
-- Run against a dedicated Supabase test project after migrations
-- 0001, 0002, 0003 have been applied. Do NOT run against production.
--
-- Prerequisites (create via Supabase Auth API, not via SQL):
--   1. reviewer@vertex-e2e.local   password: E2eReviewer9   role: reviewer
--   2. admin@vertex-e2e.local      password: E2eAdmin9      role: admin
--
-- The `public.users` row is provisioned automatically by the auth
-- trigger from migration 0001. This file backfills the role.

UPDATE public.users
SET role = 'reviewer'
WHERE email = 'reviewer@vertex-e2e.local';

UPDATE public.users
SET role = 'admin'
WHERE email = 'admin@vertex-e2e.local';

-- Seed project owned by the reviewer so we exercise the RLS-scoped path.
INSERT INTO public.projects (
  id, name, contract_ref, contract_value_aed, kpi_cap_percent,
  owner_id, status
)
SELECT
  '00000000-0000-0000-0000-e2e000000001',
  'E2E Test Project',
  'E2E-C-001',
  1000000,
  10.0,
  u.id,
  'active'
FROM public.users u
WHERE u.email = 'reviewer@vertex-e2e.local'
ON CONFLICT (id) DO UPDATE
  SET name = EXCLUDED.name,
      contract_ref = EXCLUDED.contract_ref;

-- Optional: a pre-existing submission the reviewer can approve during
-- the happy-path test. Kept intentionally simple: no findings, no file.
-- The happy-path test uploads a fresh submission and asserts findings
-- appear via the mock provider.

-- Teardown (run at the end of the e2e job to keep the test project clean):
--   DELETE FROM public.audit_log
--     WHERE resource_id = '00000000-0000-0000-0000-e2e000000001'
--        OR user_id IN (
--          SELECT id FROM public.users WHERE email LIKE '%@vertex-e2e.local'
--        );
--   DELETE FROM public.ai_findings
--     WHERE submission_id IN (
--       SELECT id FROM public.submissions
--        WHERE project_id = '00000000-0000-0000-0000-e2e000000001'
--     );
--   DELETE FROM public.submissions
--     WHERE project_id = '00000000-0000-0000-0000-e2e000000001';
--   DELETE FROM public.projects
--     WHERE id = '00000000-0000-0000-0000-e2e000000001';
