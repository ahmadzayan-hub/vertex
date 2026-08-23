import { describe, expect, it } from 'vitest';
import {
  buildComplianceMatrix,
  cellKey,
  worst,
  MATRIX_ROWS,
  type CellStatus,
} from '@/lib/compliance-matrix';
import type { Obligation, ObligationStatus, ObligationType, Project, Submission, TrafficLight } from '@/types';

function project(id: string, name = id): Project {
  return {
    id,
    name,
    contract_ref: `C-${id}`,
    contract_value_aed: 1_000_000,
    commencement_date: null,
    completion_date: null,
    performance_bond_aed: null,
    insurance_amount_aed: null,
    insurance_expiry_date: null,
    kpi_cap_percent: 10,
    owner_id: null,
    status: 'active',
    created_at: '2026-01-01',
    updated_at: '2026-01-01',
  } as Project;
}

function obligation(
  id: string,
  projectId: string,
  type: ObligationType,
  status: ObligationStatus,
): Obligation {
  return {
    id,
    project_id: projectId,
    obligation_type: type,
    description: id,
    details: null,
    due_date: null,
    submitted_date: null,
    approved_date: null,
    status,
    days_remaining: null,
    alert_threshold_days: 14,
    critical_path_blocking: false,
    kpi_leverage_text: null,
    created_at: '2026-01-01',
    updated_at: '2026-01-01',
  };
}

function submission(id: string, projectId: string, light: TrafficLight | null): Submission {
  return {
    id,
    project_id: projectId,
    submission_type: 'invoice',
    document_name: id,
    file_url: '',
    file_size_bytes: null,
    uploaded_by: null,
    uploaded_at: '2026-01-01',
    processing_status: light ? 'complete' : 'processing',
    processing_started_at: null,
    processing_completed_at: null,
    compliance_score: null,
    traffic_light: light,
    confidence_percent: null,
    approval_status: 'pending',
    approved_by: null,
    approved_at: null,
    created_at: '2026-01-01',
    updated_at: '2026-01-01',
  };
}

describe('worst', () => {
  it('orders no_data < compliant < at_risk < non_compliant', () => {
    const order: CellStatus[] = ['no_data', 'compliant', 'at_risk', 'non_compliant'];
    for (let i = 0; i < order.length - 1; i++) {
      expect(worst(order[i]!, order[i + 1]!)).toBe(order[i + 1]);
    }
  });
});

describe('buildComplianceMatrix', () => {
  it('renders a full grid even with no data at all', () => {
    const m = buildComplianceMatrix({ projects: [project('p1')], obligations: [], submissions: [] });
    expect(m.columns).toHaveLength(1);
    expect(m.rows).toEqual([...MATRIX_ROWS]);
    for (const row of MATRIX_ROWS) {
      expect(m.cells[cellKey(row, 'p1')]!.status).toBe('no_data');
    }
    expect(m.attentionCells).toHaveLength(0);
  });

  it('lets the worst item decide the cell, never an average', () => {
    const m = buildComplianceMatrix({
      projects: [project('p1')],
      obligations: [
        obligation('o1', 'p1', 'deliverable', 'complete'),
        obligation('o2', 'p1', 'deliverable', 'on_track'),
        obligation('o3', 'p1', 'deliverable', 'overdue'),
      ],
      submissions: [],
    });
    const cell = m.cells[cellKey('deliverable', 'p1')]!;
    expect(cell.status).toBe('non_compliant');
    expect(cell.total).toBe(3);
    expect(cell.attention).toBe(1);
    expect(cell.driverIds).toEqual(['o3']);
  });

  it('keeps only the drivers matching the cell verdict', () => {
    const m = buildComplianceMatrix({
      projects: [project('p1')],
      obligations: [
        obligation('a', 'p1', 'payment', 'at_risk'),
        obligation('b', 'p1', 'payment', 'overdue'),
        obligation('c', 'p1', 'payment', 'overdue'),
      ],
      submissions: [],
    });
    const cell = m.cells[cellKey('payment', 'p1')]!;
    expect(cell.status).toBe('non_compliant');
    expect(cell.attention).toBe(3);
    expect(cell.driverIds).toEqual(['b', 'c']);
  });

  it('maps submission traffic lights and ignores ones still processing', () => {
    const m = buildComplianceMatrix({
      projects: [project('p1')],
      obligations: [],
      submissions: [
        submission('s1', 'p1', 'green'),
        submission('s2', 'p1', 'amber'),
        submission('s3', 'p1', null),
      ],
    });
    const cell = m.cells[cellKey('submissions', 'p1')]!;
    expect(cell.status).toBe('at_risk');
    expect(cell.total).toBe(2);
  });

  it('rolls each column up to its worst cell', () => {
    const m = buildComplianceMatrix({
      projects: [project('p1'), project('p2')],
      obligations: [
        obligation('o1', 'p1', 'approval', 'on_track'),
        obligation('o2', 'p2', 'renewal', 'at_risk'),
      ],
      submissions: [submission('s1', 'p2', 'red')],
    });
    expect(m.columns.find((c) => c.project.id === 'p1')!.status).toBe('compliant');
    const p2 = m.columns.find((c) => c.project.id === 'p2')!;
    expect(p2.status).toBe('non_compliant');
    expect(p2.attention).toBe(2);
  });

  it('lists attention cells worst first', () => {
    const m = buildComplianceMatrix({
      projects: [project('p1')],
      obligations: [
        obligation('o1', 'p1', 'approval', 'at_risk'),
        obligation('o2', 'p1', 'payment', 'overdue'),
      ],
      submissions: [],
    });
    expect(m.attentionCells.map((c) => c.row)).toEqual(['payment', 'approval']);
  });

  it('ignores items belonging to projects outside the matrix', () => {
    const m = buildComplianceMatrix({
      projects: [project('p1')],
      obligations: [obligation('o1', 'other', 'deliverable', 'overdue')],
      submissions: [submission('s1', 'other', 'red')],
    });
    expect(m.attentionCells).toHaveLength(0);
    expect(m.cells[cellKey('deliverable', 'p1')]!.total).toBe(0);
  });
});
