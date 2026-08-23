import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

import { StatCard } from '@/components/dashboard/StatCard';

describe('StatCard', () => {
  it('renders label, value, and hint text', () => {
    render(<StatCard label="Submissions pending" value="7" hint="Awaiting review" />);
    expect(screen.getByText('Submissions pending')).toBeInTheDocument();
    expect(screen.getByText('7')).toBeInTheDocument();
    expect(screen.getByText('Awaiting review')).toBeInTheDocument();
  });

  it('uses the label as the ARIA group label by default', () => {
    render(<StatCard label="Compliance score" value="88/100" />);
    // `role="group"` is set on the outer div with aria-label; look it up by label.
    expect(screen.getByLabelText('Compliance score')).toBeInTheDocument();
  });

  it('respects an explicit ariaLabel override', () => {
    render(<StatCard label="X" value="1" ariaLabel="Custom label" />);
    expect(screen.getByLabelText('Custom label')).toBeInTheDocument();
  });

  it.each([
    ['green', 'bg-emerald-500'],
    ['amber', 'bg-amber-500'],
    ['red', 'bg-red-500'],
  ] as const)('paints the traffic-light dot for %s', (light, expectedClass) => {
    const { container } = render(
      <StatCard label="L" value="V" trafficLight={light} />
    );
    expect(container.querySelector(`.${expectedClass}`)).toBeInTheDocument();
  });
});
