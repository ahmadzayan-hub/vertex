import { describe, it, expect } from 'vitest';

import { trafficLightForStat } from '@/hooks/useDashboardStats';

describe('trafficLightForStat', () => {
  it('submissions_pending: green at 0, amber at 3, red at 5', () => {
    expect(trafficLightForStat('submissions_pending_count', 0)).toBe('green');
    expect(trafficLightForStat('submissions_pending_count', 3)).toBe('amber');
    expect(trafficLightForStat('submissions_pending_count', 5)).toBe('red');
  });

  it('obligations_at_risk: 0 -> green, 2 -> amber, 3 -> red', () => {
    expect(trafficLightForStat('obligations_at_risk_count', 0)).toBe('green');
    expect(trafficLightForStat('obligations_at_risk_count', 2)).toBe('amber');
    expect(trafficLightForStat('obligations_at_risk_count', 3)).toBe('red');
  });

  it('insurance_expiring_30d: 0 -> green, 1 -> amber, 2 -> red', () => {
    expect(trafficLightForStat('insurance_expiring_30d_count', 0)).toBe('green');
    expect(trafficLightForStat('insurance_expiring_30d_count', 1)).toBe('amber');
    expect(trafficLightForStat('insurance_expiring_30d_count', 2)).toBe('red');
  });

  it('compliance_score: 90 -> green, 75 -> amber, 60 -> red', () => {
    expect(trafficLightForStat('compliance_score_avg_last_30d', 90)).toBe('green');
    expect(trafficLightForStat('compliance_score_avg_last_30d', 75)).toBe('amber');
    expect(trafficLightForStat('compliance_score_avg_last_30d', 60)).toBe('red');
  });

  it('kpi_penalties: 0 -> green, 10k -> amber, 30k -> red', () => {
    expect(trafficLightForStat('kpi_penalties_this_month_aed', 0)).toBe('green');
    expect(trafficLightForStat('kpi_penalties_this_month_aed', 10_000)).toBe('amber');
    expect(trafficLightForStat('kpi_penalties_this_month_aed', 30_000)).toBe('red');
  });
});
