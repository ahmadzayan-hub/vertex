# VERTEX security notes

Short, operator-facing. Read once before you deploy production.

## Data classification

- **PII / personal**: contract values, project ownership. Access is gated
  by Supabase RLS. Only a project owner or an admin can read a project or
  its submissions. Reviewers can only write against projects they own.
- **Confidential**: uploaded submission files (invoices, timesheets,
  technical documents). Stored in the private `submissions` bucket. Only
  signed URLs are handed to the browser, expiring in five minutes.
- **Secrets**: AI provider keys (`ANTHROPIC_API_KEY`, `OPENAI_API_KEY`),
  the Supabase `service_role` key, and the Google OAuth secrets. **These
  live only in Supabase project secrets and the Vercel environment.**
  The browser bundle carries the public `VITE_SUPABASE_URL` and
  `VITE_SUPABASE_ANON_KEY` only.

## Authentication and authorization

- Supabase Email and Password with a session cookie. Sessions refresh
  automatically; the client validates a password of at least eight
  characters with one uppercase and one number before submit.
- Roles: `admin`, `reviewer`, `viewer`, `api_user`. `is_admin()` and
  `current_user_role()` are `SECURITY DEFINER` helpers; every RLS policy
  uses them.
- Approval actions call `window.confirm` before writing, disable while
  busy, and always write an `audit_log` entry.

## Transport

- Vercel serves the app over HTTPS with HSTS
  (`max-age=63072000; includeSubDomains; preload`).
- Cross-origin isolation is on: `Cross-Origin-Opener-Policy: same-origin`
  and `Cross-Origin-Resource-Policy: same-site`.
- `X-Frame-Options: DENY` and CSP `frame-ancestors 'none'` block
  clickjacking.

## Content Security Policy

```
default-src 'self';
script-src 'self' 'wasm-unsafe-eval';
style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
img-src 'self' data: blob: https:;
font-src 'self' data: https://fonts.gstatic.com;
connect-src 'self' https://*.supabase.co wss://*.supabase.co
            https://api.anthropic.com https://api.openai.com;
manifest-src 'self';
worker-src 'self';
frame-ancestors 'none';
base-uri 'self';
object-src 'none';
form-action 'self';
upgrade-insecure-requests
```

Notes:
- `'unsafe-inline'` on `style-src` is required by Tailwind's JIT inline
  styles at runtime. Move to a nonced hash pass once the CSS pipeline
  emits only static classes.
- `connect-src` allows Anthropic and OpenAI so the Edge Function can call
  them from the browser (edge routes proxy the response through the same
  origin, so real calls happen server side).

## AI keys

- Never in the browser bundle. `VITE_AI_PROVIDER=edge` routes every
  analyze call through `supabase functions invoke('analyze-submission')`.
- Keys are read inside the Deno function from `Deno.env`. Rotate by
  updating Supabase project secrets and redeploying the function.

## Rate limiting

- Supabase Edge Functions have platform rate limiting per project.
- Additional per-user throttle should be added at the Edge Function
  level once traffic exists. Session 3 target.

## Backups and recovery

- Supabase does daily Postgres backups on Pro and above. Point in time
  recovery is available at higher tiers.
- Storage bucket has no automatic backup. Nightly export to a separate
  bucket / cold storage is a Session 3 task.

## Audit trail

- Every write path calls `logAuditEvent()` from `src/services/audit.ts`,
  which inserts into `public.audit_log` with `before_state`, `after_state`,
  `user_id`, `user_agent`, and free-form `details`.
- RLS on `audit_log`: any authenticated user can insert their own event;
  only admins can read the full log.

## Reporting a vulnerability

Send a report to the address in the repository owner's public profile.
Do not open a public GitHub issue for security problems.
