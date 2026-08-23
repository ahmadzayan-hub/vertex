# Product Authority — VERTEX

## Primary User

The engineer or contract administrator who has to say whether a
contractor's submission actually meets the contract — and be able to
point at the clause when challenged.

## System of Record

Projects, contracts and their obligations, submissions, AI findings, KPI
records and insurance policies.

## System of Intelligence

Compliance assessment: whether a submission satisfies the obligations it
claims to, where it does not, and how confident that verdict is.

## Primary Workflow

```
contract → obligations → submission uploaded → analysed
        → findings, each tied to a clause and an evidence extract
        → compliance matrix: every obligation against every submission
        → drill down to the finding that decided a cell
        → report
```

## Human Decision Boundary

- **The worst item decides a cell.** A compliance cell summarising ten
  findings takes the worst of them, not the average. Averaging is how a
  critical finding disappears behind nine clean ones.
- **`no_data` is not `compliant`.** An obligation nobody has submitted
  against is not satisfied; it is unknown, and it renders as unknown.
- **Submissions still processing are excluded**, not counted as passing.
- Every cell drills down to the findings that produced it, filtered to
  those matching the cell's verdict — so a red cell shows what made it
  red, not everything nearby.
- VERTEX assesses. It does not approve. Approval is a named human's act,
  recorded as theirs.

## Measurable Outcome

**North star:** non-compliance found before it is accepted, not after.

Supporting: obligations with real coverage, findings confirmed on review,
time from submission to verdict, share of verdicts overturned by a human.

## Explicit Non-Goals

- Not a document-understanding product → **Mutabasir**, whose evidence
  objects this references by id
- Not a presentation tool → **Pitchora**
- Not a commerce system → **Masaar**
- Not a project-management or scheduling tool
- Not a legal opinion. It reports what the text says, not what a court
  would decide.

## External Systems

- **Supabase** — Postgres, Auth, Storage, with a **nightly `pg_dump`
  backup workflow**. That workflow is a dependency of this project, not
  an incidental: moving the repository without it silently ends the only
  automated database backup in the portfolio.
- **Mutabasir** — evidence referenced by `evidence_id`.
- Model provider — mock by default, so tests and CI need no credentials.

## Data Ownership

VERTEX owns projects, obligations, submissions, findings, KPI records and
insurance policies. Evidence stays owned by Mutabasir and is referenced by
id, never copied.

## Canonical Repository

`github.com/ahmadzayan-hub/vertex` · branch `main`

Note: the application lives at the repository root. It was promoted from
a `vertex-platform/` subdirectory, and two Vercel projects still point at
paths that no longer exist — see `portfolio-audit/DEPLOYMENT_MAP.md`.

## Production Deployment

Vercel project `vertex`.

## Known limitations

- Analysis runs against a mock provider unless a real one is configured.
  The pipeline, the gates and the matrix are real; the findings from the
  mock path are not.
- Arabic PDF rendering depends on an embedded font being present; without
  it the report falls back to a Latin face and Arabic will not shape
  correctly.
