// The Compliance Matrix: contract requirement x contract, derived from real
// obligations and submissions.
//
// This is VERTEX's signature visualisation, so the rules are deliberately
// strict: a cell only shows a verdict when there is something to judge, the
// worst item in a dimension decides the cell (compliance is not an average),
// and every cell carries a status label and marker so colour is never the
// only carrier of meaning.

import type { Obligation, ObligationStatus, Project, Submission, TrafficLight } from '@/types';

export type CellStatus = 'compliant' | 'at_risk' | 'non_compliant' | 'no_data';

export const MATRIX_ROWS = [
  'submissions',
  'deliverable',
  'payment',
  'approval',
  'compliance',
  'renewal',
] as const;

export type MatrixRow = (typeof MATRIX_ROWS)[number];

export interface MatrixCell {
  row: MatrixRow;
  projectId: string;
  status: CellStatus;
  /** Items behind this cell. */
  total: number;
  /** Items that pushed the cell away from compliant. */
  attention: number;
  /** Ids of the worst-offending items, for drill-down. */
  driverIds: string[];
}

export interface MatrixColumn {
  project: Project;
  /** Worst cell status in the column. */
  status: CellStatus;
  attention: number;
}

export interface ComplianceMatrix {
  columns: MatrixColumn[];
  rows: MatrixRow[];
  cells: Record<string, MatrixCell>;
  /** Cells needing attention, worst first: the "what needs me" list. */
  attentionCells: MatrixCell[];
}

const SEVERITY: Record<CellStatus, number> = {
  no_data: 0,
  compliant: 1,
  at_risk: 2,
  non_compliant: 3,
};

export function cellKey(row: MatrixRow, projectId: string): string {
  return `${row}::${projectId}`;
}

export function worst(a: CellStatus, b: CellStatus): CellStatus {
  return SEVERITY[a] >= SEVERITY[b] ? a : b;
}

function fromObligationStatus(s: ObligationStatus): CellStatus {
  switch (s) {
    case 'overdue':
      return 'non_compliant';
    case 'at_risk':
      return 'at_risk';
    case 'on_track':
    case 'complete':
      return 'compliant';
  }
}

function fromTrafficLight(t: TrafficLight | null): CellStatus {
  if (t === 'red') return 'non_compliant';
  if (t === 'amber') return 'at_risk';
  if (t === 'green') return 'compliant';
  return 'no_data';
}

function emptyCell(row: MatrixRow, projectId: string): MatrixCell {
  return { row, projectId, status: 'no_data', total: 0, attention: 0, driverIds: [] };
}

function add(cell: MatrixCell, status: CellStatus, id: string): void {
  cell.total += 1;
  const before = cell.status;
  cell.status = worst(cell.status, status);
  if (status === 'at_risk' || status === 'non_compliant') {
    cell.attention += 1;
    // Keep only the drivers that match the cell's current worst status.
    if (cell.status !== before) cell.driverIds = [];
    if (status === cell.status) cell.driverIds.push(id);
  }
}

export function buildComplianceMatrix(input: {
  projects: Project[];
  obligations: Obligation[];
  submissions: Submission[];
}): ComplianceMatrix {
  const { projects, obligations, submissions } = input;
  const cells: Record<string, MatrixCell> = {};

  for (const project of projects) {
    for (const row of MATRIX_ROWS) {
      cells[cellKey(row, project.id)] = emptyCell(row, project.id);
    }
  }

  for (const o of obligations) {
    const cell = cells[cellKey(o.obligation_type as MatrixRow, o.project_id)];
    if (!cell) continue; // an obligation for a project we are not showing
    add(cell, fromObligationStatus(o.status), o.id);
  }

  for (const s of submissions) {
    const cell = cells[cellKey('submissions', s.project_id)];
    if (!cell) continue;
    const status = fromTrafficLight(s.traffic_light);
    if (status === 'no_data') continue; // still processing: nothing to judge yet
    add(cell, status, s.id);
  }

  const columns: MatrixColumn[] = projects.map((project) => {
    let status: CellStatus = 'no_data';
    let attention = 0;
    for (const row of MATRIX_ROWS) {
      const cell = cells[cellKey(row, project.id)]!;
      status = worst(status, cell.status);
      attention += cell.attention;
    }
    return { project, status, attention };
  });

  const attentionCells = Object.values(cells)
    .filter((c) => c.status === 'at_risk' || c.status === 'non_compliant')
    .sort((a, b) => SEVERITY[b.status] - SEVERITY[a.status] || b.attention - a.attention);

  return { columns, rows: [...MATRIX_ROWS], cells, attentionCells };
}

/** Non-colour marker so a cell never relies on hue alone. */
export const CELL_MARKER: Record<CellStatus, string> = {
  compliant: '✓',
  at_risk: '!',
  non_compliant: '×',
  no_data: '–',
};
