import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, it, expect } from 'vitest';

// vitest runs with globals disabled, so testing-library's auto-cleanup is off.
afterEach(cleanup);

import { ComplianceMatrix } from '@/components/compliance/ComplianceMatrix';
import type { Obligation, Project, Submission } from '@/types';

const project = {
  id: 'p1',
  name: 'East Bridge',
  contract_ref: 'C-101',
  contract_value_aed: 1,
  commencement_date: null,
  completion_date: null,
  performance_bond_aed: null,
  insurance_amount_aed: null,
  insurance_expiry_date: null,
  kpi_cap_percent: 10,
  owner_id: null,
  status: 'active',
  created_at: '',
  updated_at: '',
} as Project;

const overdue: Obligation = {
  id: 'o1',
  project_id: 'p1',
  obligation_type: 'payment',
  description: 'Payment certificate 7 overdue',
  details: null,
  due_date: null,
  submitted_date: null,
  approved_date: null,
  status: 'overdue',
  days_remaining: null,
  alert_threshold_days: 14,
  critical_path_blocking: true,
  kpi_leverage_text: null,
  created_at: '',
  updated_at: '',
};

const submissions: Submission[] = [];

function renderMatrix(projects: Project[] = [project], obligations: Obligation[] = [overdue]) {
  return render(
    <MemoryRouter>
      <ComplianceMatrix projects={projects} obligations={obligations} submissions={submissions} />
    </MemoryRouter>,
  );
}

describe('ComplianceMatrix', () => {
  it('names every verdict in words, so colour is never the only signal', () => {
    renderMatrix();
    const cell = screen.getByLabelText(/Payments, C-101: Non-compliant/i);
    expect(cell).toBeInTheDocument();
    // the non-colour marker is rendered inside the cell
    expect(within(cell).getByText('×')).toBeInTheDocument();
  });

  it('states how many items need attention out of the total', () => {
    renderMatrix();
    expect(screen.getByLabelText(/Payments, C-101:.*1 of 1 need attention/i)).toBeInTheDocument();
  });

  it('shows what drives a verdict when a cell is selected', async () => {
    const user = userEvent.setup();
    renderMatrix();
    expect(screen.getByText(/Select a cell/i)).toBeInTheDocument();
    await user.click(screen.getByLabelText(/Payments, C-101/i));
    expect(screen.getByText('Payment certificate 7 overdue')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Open obligations/i })).toBeInTheDocument();
  });

  it('moves focus across the grid with the arrow keys', async () => {
    const user = userEvent.setup();
    renderMatrix();
    const first = screen.getByLabelText(/Submissions, C-101/i);
    first.focus();
    expect(first).toHaveFocus();
    await user.keyboard('{ArrowDown}');
    expect(screen.getByLabelText(/Deliverables, C-101/i)).toHaveFocus();
    await user.keyboard('{ArrowUp}');
    expect(first).toHaveFocus();
  });

  it('renders a legend that pairs every marker with its meaning', () => {
    renderMatrix();
    const legend = screen.getByLabelText('Legend');
    for (const label of ['Compliant', 'At risk', 'Non-compliant', 'Nothing to assess']) {
      expect(within(legend).getByText(label)).toBeInTheDocument();
    }
  });

  it('explains itself instead of rendering an empty grid when there are no contracts', () => {
    renderMatrix([], []);
    expect(screen.getByText(/No contracts yet/i)).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });
});
