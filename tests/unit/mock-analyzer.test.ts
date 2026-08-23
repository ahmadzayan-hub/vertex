import { describe, it, expect } from 'vitest';

import { mockAnalyze } from '@/services/ai/mock';
import type { Submission, Project } from '@/types';

function makeSubmission(id: string, uploadedAt = '2026-05-17T00:00:00Z'): Submission {
  return {
    id,
    project_id: 'p1',
    submission_type: 'invoice',
    document_name: 'invoice.pdf',
    file_url: 'p1/s1/invoice.pdf',
    file_size_bytes: 1024,
    uploaded_by: 'u1',
    uploaded_at: uploadedAt,
    processing_status: 'pending',
    processing_started_at: null,
    processing_completed_at: null,
    compliance_score: null,
    traffic_light: null,
    confidence_percent: null,
    approval_status: 'pending',
    approved_by: null,
    approved_at: null,
    created_at: uploadedAt,
    updated_at: uploadedAt,
  };
}

const project = {
  id: 'p1',
  name: 'Project 1',
  contract_ref: 'C-1',
  contract_value_aed: 1_000_000,
  commencement_date: null,
  completion_date: null,
  performance_bond_aed: null,
  insurance_amount_aed: null,
  insurance_expiry_date: null,
  kpi_cap_percent: 10,
  owner_id: null,
  status: 'active' as const,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
} satisfies Project;

describe('mockAnalyze', () => {
  it('returns between 3 and 6 findings', () => {
    const result = mockAnalyze(makeSubmission('s1'), project);
    expect(result.findings.length).toBeGreaterThanOrEqual(3);
    expect(result.findings.length).toBeLessThanOrEqual(6);
  });

  it('is deterministic on repeat calls with the same submission', () => {
    const a = mockAnalyze(makeSubmission('sX'), project);
    const b = mockAnalyze(makeSubmission('sX'), project);
    expect(a.findings.map((f) => f.title)).toEqual(b.findings.map((f) => f.title));
    expect(a.compliance_score).toBe(b.compliance_score);
    expect(a.traffic_light).toBe(b.traffic_light);
  });

  it('picks a valid traffic light', () => {
    const result = mockAnalyze(makeSubmission('sY'), project);
    expect(['green', 'amber', 'red']).toContain(result.traffic_light);
  });

  it('produces a compliance score between 0 and 100', () => {
    const result = mockAnalyze(makeSubmission('sZ'), project);
    expect(result.compliance_score).toBeGreaterThanOrEqual(0);
    expect(result.compliance_score).toBeLessThanOrEqual(100);
  });

  it('every finding carries a prompt version and model name', () => {
    const result = mockAnalyze(makeSubmission('sQ'), project);
    for (const f of result.findings) {
      expect(f.prompt_version).toBeTruthy();
      expect(f.ai_model_used).toBeTruthy();
    }
  });
});
