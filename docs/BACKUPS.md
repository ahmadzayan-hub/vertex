# VERTEX backups and recovery

Two independent restore paths so a mistake, a bad migration, or a
compromised key never loses more than a day of contract data.

## What we back up

| Asset | Where it lives | Backup path |
|-------|----------------|-------------|
| Postgres schema + rows | Supabase project database | Automated daily Postgres backup (Supabase Pro+); manual `pg_dump` for point in time |
| Uploaded submission files | Supabase Storage bucket `submissions` | Nightly `supabase storage download` mirror to a separate bucket |
| Storage RLS + bucket policies | `supabase/migrations/0002_session2.sql` | Committed to git |
| Edge Function source | `supabase/functions/analyze-submission` | Committed to git |
| Environment secrets | Supabase project secrets + Vercel env | 1Password vault |

## Daily database backup (managed)

Enable **Automatic backups** in the Supabase dashboard (Pro tier and up).
Backups run once every 24 hours and keep the last 7 rolling copies.

For point-in-time recovery (Team tier), enable **PITR** so any second in
the last 7 days is restorable. Enabled from the same panel.

## Weekly on-demand dump (manual)

Run this from your admin workstation with the read-only role:

```bash
export PGPASSWORD='<db-password>'
pg_dump \
  --host <project>.supabase.co --port 5432 \
  --username postgres --dbname postgres \
  --format=custom --no-owner --no-acl \
  --file "vertex-$(date +%Y-%m-%d).dump"
```

Ship the file to an offline location (S3 Glacier, encrypted external disk).
Test the restore at least once a quarter by loading it into a scratch
Supabase project and running the smoke checklist below.

## Nightly storage mirror

Add this to a scheduled runner (GitHub Actions cron, systemd timer, or
Supabase Cron):

```bash
# requires: SUPABASE_ACCESS_TOKEN, SUPABASE_PROJECT_REF
supabase login --token "$SUPABASE_ACCESS_TOKEN"
supabase storage cp --recursive \
  "ss:///submissions" \
  "./mirror/$(date +%Y-%m-%d)/submissions"
```

Then rsync the local mirror into cold storage. Keep 30 days of nightly
snapshots. Older files can drop to weekly.

## Restore drill

Run this the first time each restore path is set up, then quarterly.

1. Provision a throwaway Supabase project in the same region.
2. Apply migrations in order:
   ```
   psql "$RESTORE_URL" -f vertex-platform/supabase/migrations/0001_vertex_init.sql
   psql "$RESTORE_URL" -f vertex-platform/supabase/migrations/0002_session2.sql
   ```
3. Load the dump:
   ```
   pg_restore --host <restore-host> --dbname postgres \
     --no-owner --no-acl --clean --if-exists vertex-YYYY-MM-DD.dump
   ```
4. Recreate the `submissions` bucket and upload one file:
   ```
   supabase storage cp ./mirror/YYYY-MM-DD/submissions/<pid>/<sid>/<name> \
     "ss:///submissions/<pid>/<sid>/<name>"
   ```
5. Point a scratch Vercel preview at the restore project and run the
   post-deploy checklist from [`DEPLOY.md`](./DEPLOY.md#post-deploy-verification).

## Post-restore smoke checklist

Copy from [`docs/DEPLOY.md`](./DEPLOY.md#post-deploy-verification).
The important ones:

- `GET /` returns 200 and shows the landing hero.
- Log in with a seeded user. `/dashboard` shows the traffic-light cards.
- Upload a small text file via `/upload`. Verify:
  - The file appears in the bucket at `<project_id>/<submission_id>/<name>`.
  - `submissions.file_url` is populated.
  - Findings appear on `/submissions/:id` after the mock or Edge
    Function completes.
- Approve the submission. `audit_log` gets a `submission.approved` row.

## Retention

| Data class | Retention | Reason |
|------------|-----------|--------|
| Postgres daily backups | 7 days rolling | Supabase managed |
| Manual `pg_dump` | 12 months | Financial audit trail |
| Storage nightly mirror | 30 days daily, then weekly for 12 months | Same |
| `audit_log` rows | Indefinite | Immutable evidence per SECURITY.md |

## What is out of scope for backups

- **Supabase project secrets** and **Vercel env vars** are not backed up
  automatically; they live in the shared 1Password vault. Rotate on the
  same cadence as your engineer offboarding policy.
- **AI provider keys** live only in Supabase project secrets. If a key is
  believed to be leaked, rotate it in the Anthropic / OpenAI console and
  update the Supabase secret. The browser never has to redeploy.

## Contact

If a restore is in progress, note it in `#vertex-ops` before starting so
two engineers do not attempt to restore into the same project at once.
