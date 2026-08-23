import { useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

import { useLanguage } from '@/hooks/useLanguage';
import {
  buildComplianceMatrix,
  cellKey,
  CELL_MARKER,
  type CellStatus,
  type MatrixCell,
  type MatrixRow,
} from '@/lib/compliance-matrix';
import type { Obligation, Project, Submission } from '@/types';

interface Props {
  projects: Project[];
  obligations: Obligation[];
  submissions: Submission[];
}

// Status colour is support, never the message: each cell also carries a
// marker glyph and an accessible label naming the verdict in words.
const CELL_STYLE: Record<CellStatus, string> = {
  compliant: 'bg-emerald-50 text-emerald-800 border-emerald-300',
  at_risk: 'bg-amber-50 text-amber-900 border-amber-300',
  non_compliant: 'bg-red-50 text-red-800 border-red-300',
  no_data: 'bg-slate-50 text-slate-400 border-slate-200',
};

export function ComplianceMatrix({ projects, obligations, submissions }: Props) {
  const { t } = useLanguage();
  const matrix = useMemo(
    () => buildComplianceMatrix({ projects, obligations, submissions }),
    [projects, obligations, submissions],
  );
  const [selected, setSelected] = useState<MatrixCell | null>(null);
  const gridRef = useRef<HTMLTableElement | null>(null);

  if (projects.length === 0) {
    return (
      <section aria-labelledby="matrix-heading" className="rounded-lg border border-slate-200 bg-white p-6">
        <h3 id="matrix-heading" className="text-lg font-semibold text-slate-900">
          {t('matrix.title')}
        </h3>
        <p className="mt-2 text-sm text-slate-600">{t('matrix.empty')}</p>
        <p className="mt-1 text-xs text-slate-500">{t('matrix.emptyHint')}</p>
      </section>
    );
  }

  // Roving focus: arrow keys walk the grid, so the matrix is usable without
  // a mouse (a requirement, not a nicety, for a review screen).
  function onKeyDown(e: React.KeyboardEvent<HTMLButtonElement>, rowIdx: number, colIdx: number) {
    const deltas: Record<string, [number, number]> = {
      ArrowUp: [-1, 0],
      ArrowDown: [1, 0],
      ArrowLeft: [0, -1],
      ArrowRight: [0, 1],
    };
    const delta = deltas[e.key];
    if (!delta) return;
    e.preventDefault();
    const nextRow = Math.min(Math.max(rowIdx + delta[0], 0), matrix.rows.length - 1);
    const nextCol = Math.min(Math.max(colIdx + delta[1], 0), matrix.columns.length - 1);
    const target = gridRef.current?.querySelector<HTMLButtonElement>(
      `[data-cell="${nextRow}-${nextCol}"]`,
    );
    target?.focus();
  }

  const driverLink =
    selected?.row === 'submissions'
      ? { to: '/submissions', label: t('matrix.openSubmissions') }
      : { to: '/obligations', label: t('matrix.openObligations') };

  return (
    <section aria-labelledby="matrix-heading" className="space-y-3">
      <header>
        <h3 id="matrix-heading" className="text-lg font-semibold text-slate-900">
          {t('matrix.title')}
        </h3>
        <p className="text-sm text-slate-600">{t('matrix.subtitle')}</p>
      </header>

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table ref={gridRef} className="w-full border-collapse text-sm">
          <caption className="sr-only">{t('matrix.title')}</caption>
          <thead>
            <tr>
              <th scope="col" className="sticky start-0 z-10 bg-slate-50 p-3 text-start text-xs font-semibold uppercase tracking-wide text-slate-500">
                {t('matrix.requirement')}
              </th>
              {matrix.columns.map((col) => (
                <th
                  key={col.project.id}
                  scope="col"
                  className="min-w-[7.5rem] bg-slate-50 p-3 text-start text-xs font-semibold text-slate-700"
                >
                  <span className="block truncate" title={col.project.name}>
                    {col.project.contract_ref || col.project.name}
                  </span>
                  <span className="mt-0.5 block text-[11px] font-normal text-slate-500">
                    {t(`matrix.status.${col.status}`)}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {matrix.rows.map((row: MatrixRow, rowIdx) => (
              <tr key={row} className="border-t border-slate-100">
                <th scope="row" className="sticky start-0 z-10 bg-white p-3 text-start text-sm font-medium text-slate-700">
                  {t(`matrix.rows.${row}`)}
                </th>
                {matrix.columns.map((col, colIdx) => {
                  const cell = matrix.cells[cellKey(row, col.project.id)]!;
                  const statusLabel = t(`matrix.status.${cell.status}`);
                  const isSelected =
                    selected?.row === cell.row && selected?.projectId === cell.projectId;
                  return (
                    <td key={col.project.id} className="p-1.5">
                      <button
                        type="button"
                        data-cell={`${rowIdx}-${colIdx}`}
                        tabIndex={rowIdx === 0 && colIdx === 0 ? 0 : -1}
                        onKeyDown={(e) => onKeyDown(e, rowIdx, colIdx)}
                        onClick={() => setSelected(cell)}
                        aria-pressed={isSelected}
                        aria-label={t('matrix.cellLabel', {
                          requirement: t(`matrix.rows.${row}`),
                          contract: col.project.contract_ref || col.project.name,
                          status: statusLabel,
                          attention: cell.attention,
                          total: cell.total,
                        })}
                        className={`flex w-full items-center justify-between gap-2 rounded-md border px-2.5 py-2 text-start transition-shadow focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-slate-900 ${CELL_STYLE[cell.status]} ${isSelected ? 'ring-2 ring-slate-900 ring-offset-1' : ''}`}
                      >
                        <span aria-hidden="true" className="text-base font-bold leading-none">
                          {CELL_MARKER[cell.status]}
                        </span>
                        <span className="truncate text-[11px] font-medium">
                          {cell.total === 0 ? '—' : `${cell.attention}/${cell.total}`}
                        </span>
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Drill-down: requirement, contract, verdict, and what caused it. */}
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        {!selected ? (
          <p className="text-sm text-slate-500">{t('matrix.pick')}</p>
        ) : (
          <div className="space-y-2">
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
              <h4 className="text-base font-semibold text-slate-900">
                {t(`matrix.rows.${selected.row}`)}
              </h4>
              <span className="text-sm text-slate-500">
                {matrix.columns.find((c) => c.project.id === selected.projectId)?.project.contract_ref}
              </span>
              <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${CELL_STYLE[selected.status]}`}>
                <span aria-hidden="true">{CELL_MARKER[selected.status]}</span>{' '}
                {t(`matrix.status.${selected.status}`)}
              </span>
              <span className="text-xs text-slate-500">
                {t('matrix.totalLabel', { count: selected.total })}
              </span>
            </div>
            <h5 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {t('matrix.drivers')}
            </h5>
            {selected.driverIds.length === 0 ? (
              <p className="text-sm text-slate-500">{t('matrix.noDrivers')}</p>
            ) : (
              <ul className="space-y-1 text-sm text-slate-700">
                {selected.driverIds.map((id) => {
                  const o = obligations.find((x) => x.id === id);
                  const s = submissions.find((x) => x.id === id);
                  return (
                    <li key={id} className="flex items-start gap-2">
                      <span aria-hidden="true" className="mt-1 text-xs text-slate-400">
                        •
                      </span>
                      <span>{o?.description ?? s?.document_name ?? id}</span>
                    </li>
                  );
                })}
              </ul>
            )}
            <Link
              to={driverLink.to}
              className="inline-block text-sm font-medium text-brand-navy underline underline-offset-2"
            >
              {driverLink.label}
            </Link>
          </div>
        )}
      </div>

      {/* Legend: colour is never the only signal. */}
      <ul aria-label={t('matrix.legend')} className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
        {(['compliant', 'at_risk', 'non_compliant', 'no_data'] as CellStatus[]).map((s) => (
          <li key={s} className="flex items-center gap-1.5">
            <span className={`inline-flex h-4 w-4 items-center justify-center rounded border text-[10px] font-bold ${CELL_STYLE[s]}`}>
              {CELL_MARKER[s]}
            </span>
            {t(`matrix.status.${s}`)}
          </li>
        ))}
      </ul>
    </section>
  );
}
