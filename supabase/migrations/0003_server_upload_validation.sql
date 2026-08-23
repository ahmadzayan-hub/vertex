-- VERTEX Session-3 hardening: server-side file validation on the
-- `submissions` storage bucket.
--
-- Client-side `validateFile` in src/services/storage.ts already blocks
-- >25 MB and non-allowlisted MIME. That covers casual mistakes. This
-- trigger blocks a determined bad actor bypassing the browser and
-- posting directly to Supabase Storage.
--
-- Runs at INSERT and UPDATE on storage.objects, but only for our
-- bucket, so other buckets in the same project are unaffected.
-- Idempotent.

CREATE OR REPLACE FUNCTION public.validate_submission_upload()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_mime TEXT;
  v_size BIGINT;
  v_max_bytes CONSTANT BIGINT := 26214400;  -- 25 MB
  v_allowed CONSTANT TEXT[] := ARRAY[
    'application/pdf',
    'image/png',
    'image/jpeg',
    'text/plain',
    'text/csv',
    'application/json',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ];
BEGIN
  -- Guard: only affect the submissions bucket.
  IF NEW.bucket_id <> 'submissions' THEN
    RETURN NEW;
  END IF;

  -- Storage stores content-type + size on the row's metadata jsonb.
  v_mime := NEW.metadata->>'mimetype';
  v_size := COALESCE((NEW.metadata->>'size')::BIGINT, 0);

  IF v_mime IS NULL OR NOT (v_mime = ANY(v_allowed)) THEN
    RAISE EXCEPTION 'VERTEX server validation: MIME "%" is not allowed on submissions bucket', v_mime
      USING ERRCODE = '23514';  -- check_violation
  END IF;

  IF v_size > v_max_bytes THEN
    RAISE EXCEPTION 'VERTEX server validation: file size % exceeds 25 MB limit', v_size
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_submission_upload ON storage.objects;
CREATE TRIGGER trg_validate_submission_upload
  BEFORE INSERT OR UPDATE ON storage.objects
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_submission_upload();

COMMENT ON FUNCTION public.validate_submission_upload IS
  'Rejects direct-to-storage uploads to the submissions bucket that violate the app-level MIME/size allowlist. Client-side validation is a UX hint; this is the hard boundary.';
