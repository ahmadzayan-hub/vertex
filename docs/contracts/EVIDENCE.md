# EvidenceObject in VERTEX (consumer, v0.1)

VERTEX consumes the portfolio evidence contract. The canonical schema
lives in the `mutabasir` repository (`docs/contracts/`); the copy here
([`evidence-object.schema.json`](./evidence-object.schema.json)) is
**vendored at v0.1** — update it only by pulling a newer tagged version,
never by editing in place.

## How VERTEX uses evidence

1. **Findings reference, never copy.** An `ai_findings` row may carry an
   `evidence_id` (`ev_<ulid>`). VERTEX stores the id plus its own
   display fields (`evidence_extract`, `contract_clause_ref`,
   `source_citation`); the authoritative object stays with its producer.
2. **Two legitimate sources.** Evidence minted by Mutabasir (document
   extraction) is referenced by id. Evidence for clause segmentation
   VERTEX performs itself may be minted here with the same schema.
3. **Contracts, not tables.** Evidence travels over product APIs /
   domain events. VERTEX never reads another product's database.
4. **`classification` governs egress.** `confidential` / `restricted`
   evidence must not leave approved boundaries — the AI Gateway uses
   this field to forbid cloud egress and select a local model.
5. **"Show me the source."** Any compliance verdict surfaced to a user
   must be able to open its evidence via the id — a finding exported to
   the Annual Plan or ExecFlow carries the same `evidence_id`.
