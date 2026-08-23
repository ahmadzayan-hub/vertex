-- Portfolio evidence contract (v0.1): findings reference an EvidenceObject
-- by id (ev_<ulid>) — minted by Mutabasir, or by VERTEX for clause
-- segmentation it performs itself. See docs/contracts/EVIDENCE.md.

ALTER TABLE public.ai_findings
  ADD COLUMN IF NOT EXISTS evidence_id TEXT
  CHECK (evidence_id IS NULL OR evidence_id ~ '^ev_[0-9A-HJKMNP-TV-Za-hjkmnp-tv-z]{26}$');

CREATE INDEX IF NOT EXISTS ai_findings_evidence_idx
  ON public.ai_findings(evidence_id)
  WHERE evidence_id IS NOT NULL;
