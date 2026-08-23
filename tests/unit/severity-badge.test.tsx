import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

// Mock useLanguage so this component test does not depend on the i18n
// context bootstrapping (which stumbles over a duplicate React instance
// when jsdom pulls react-dom from the repo root's node_modules).
vi.mock('@/hooks/useLanguage', () => ({
  useLanguage: () => ({
    t: (key: string) => key.replace(/^severity\./, ''),
    language: 'en',
    setLanguage: () => {},
    i18n: {},
  }),
}));

import { SeverityBadge } from '@/components/submissions/SeverityBadge';
import type { Severity } from '@/types';

const SEVERITIES: Severity[] = ['critical', 'high', 'medium', 'low', 'info'];

describe('SeverityBadge', () => {
  it.each(SEVERITIES)('renders the label key for severity=%s', (sev) => {
    render(<SeverityBadge severity={sev} />);
    expect(screen.getByText(sev)).toBeInTheDocument();
  });

  it('applies the critical color ring', () => {
    const { container } = render(<SeverityBadge severity="critical" />);
    expect(container.querySelector('.bg-red-100')).toBeInTheDocument();
  });

  it('applies the medium color ring', () => {
    const { container } = render(<SeverityBadge severity="medium" />);
    expect(container.querySelector('.bg-amber-50')).toBeInTheDocument();
  });

  it('applies the info color ring', () => {
    const { container } = render(<SeverityBadge severity="info" />);
    expect(container.querySelector('.bg-vertex-50')).toBeInTheDocument();
  });
});
