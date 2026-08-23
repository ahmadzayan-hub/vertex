import type { AiAnalysisResult, Submission, Project, TrafficLight } from '@/types';

import { PROMPT_VERSION } from './prompts';

// Deterministic pseudo-random so the same submission gives stable output
// across dev reloads without needing a real seed lib.
function seededRandom(seed: string) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h += 0x6d2b79f5;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface MockFindingTemplate {
  finding_type: AiAnalysisResult['findings'][number]['finding_type'];
  severity: AiAnalysisResult['findings'][number]['severity'];
  title: string;
  description: string;
  contract_clause_ref: string;
  evidence_extract: string;
  evidence_level: AiAnalysisResult['findings'][number]['evidence_level'];
  source_citation: string;
  requires_action: boolean;
  weight: number; // -25..+15, contributes to compliance_score offset
}

const TEMPLATES: MockFindingTemplate[] = [
  {
    finding_type: 'compliance_fail',
    severity: 'high',
    title: 'Invoice value exceeds contract clause 5.2 monthly limit',
    description:
      'Line total AED 148,500 is above the AED 120,000 cap allowed by clause 5.2 without prior written approval.',
    contract_clause_ref: '5.2',
    evidence_extract: 'Total (excl. VAT): AED 148,500.00',
    evidence_level: 'verified_source',
    source_citation: 'Contract Section 5 · Payments',
    requires_action: true,
    weight: -20,
  },
  {
    finding_type: 'compliance_fail',
    severity: 'medium',
    title: 'Missing signature from authorised reviewer',
    description: 'Signature block on page 2 is empty. Clause 9.1 requires reviewer sign-off before submission.',
    contract_clause_ref: '9.1',
    evidence_extract: '<signature block empty>',
    evidence_level: 'saved_rule',
    source_citation: 'Contract Section 9 · Authorisation',
    requires_action: true,
    weight: -12,
  },
  {
    finding_type: 'alert',
    severity: 'high',
    title: 'Insurance policy referenced is scheduled to expire in 14 days',
    description:
      'Referenced policy INS-2419 will expire 14 days from the submission date. Renewal evidence has not been uploaded.',
    contract_clause_ref: '11.3',
    evidence_extract: 'Insurance policy INS-2419, valid until 30/06',
    evidence_level: 'working_assumption',
    source_citation: 'Insurance registry vs. clause 11.3',
    requires_action: true,
    weight: -8,
  },
  {
    finding_type: 'compliance_pass',
    severity: 'info',
    title: 'VAT calculated correctly at 5%',
    description: 'AED 7,425 VAT matches expected value on the AED 148,500 subtotal.',
    contract_clause_ref: '5.6',
    evidence_extract: 'VAT (5%): AED 7,425.00',
    evidence_level: 'verified_source',
    source_citation: 'UAE VAT Law · Article 27',
    requires_action: false,
    weight: 8,
  },
  {
    finding_type: 'insight',
    severity: 'low',
    title: 'Progress claim aligns with monthly milestone plan',
    description: 'Reported progress (72%) is within ±3% of the planned milestone (74%) for this period.',
    contract_clause_ref: '4.5',
    evidence_extract: 'Progress this period: 72% (plan 74%)',
    evidence_level: 'verified_source',
    source_citation: 'Milestone schedule · Appendix A',
    requires_action: false,
    weight: 6,
  },
  {
    finding_type: 'recommendation',
    severity: 'medium',
    title: 'Recommend attaching signed timesheet before payment release',
    description:
      'To avoid future disputes, attach the signed weekly timesheets alongside the invoice as an addendum.',
    contract_clause_ref: '6.2',
    evidence_extract: 'Timesheet appendix: not attached',
    evidence_level: 'working_assumption',
    source_citation: 'Best practice · payment gate',
    requires_action: false,
    weight: 0,
  },
  {
    finding_type: 'alert',
    severity: 'critical',
    title: 'Duplicate invoice number detected against prior submission',
    description: 'Invoice number INV-2419-07 was previously seen on submission 2 weeks ago.',
    contract_clause_ref: '5.4',
    evidence_extract: 'Invoice #: INV-2419-07',
    evidence_level: 'verified_source',
    source_citation: 'Prior submissions log',
    requires_action: true,
    weight: -25,
  },
  {
    finding_type: 'insight',
    severity: 'info',
    title: 'Mobilization ramp on track vs. contracted allocation',
    description: 'Deployed roles this month = 92% of contracted allocation (target ≥ 90%).',
    contract_clause_ref: '3.1',
    evidence_extract: 'Deployed roles: 46/50',
    evidence_level: 'saved_rule',
    source_citation: 'Mobilization tracker · this month',
    requires_action: false,
    weight: 5,
  },
];

function pickIndices(rand: () => number, count: number, max: number): number[] {
  const picked = new Set<number>();
  while (picked.size < Math.min(count, max)) {
    picked.add(Math.floor(rand() * max));
  }
  return Array.from(picked);
}

function trafficLightFromScore(score: number, worstSeverity: string): TrafficLight {
  if (score < 60 || worstSeverity === 'critical') return 'red';
  if (score < 80 || worstSeverity === 'high') return 'amber';
  return 'green';
}

const SEVERITY_ORDER: Record<string, number> = {
  info: 0,
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function mockAnalyze(submission: Submission, _project: Project): AiAnalysisResult {
  const rand = seededRandom(submission.id + submission.uploaded_at);
  const count = 3 + Math.floor(rand() * 4); // 3..6 findings
  const picked = pickIndices(rand, count, TEMPLATES.length);

  const findings = picked.map((idx) => {
    const t = TEMPLATES[idx]!;
    const jitter = Math.floor(rand() * 10) - 5;
    return {
      finding_type: t.finding_type,
      severity: t.severity,
      title: t.title,
      description: t.description,
      contract_clause_ref: t.contract_clause_ref,
      evidence_extract: t.evidence_extract,
      evidence_level: t.evidence_level,
      source_citation: t.source_citation,
      confidence_percent: Math.max(40, Math.min(99, 80 + jitter)),
      requires_action: t.requires_action,
      ai_model_used: 'mock-vertex-1',
      prompt_version: PROMPT_VERSION,
    };
  });

  const totalWeight = picked.reduce((sum, idx) => sum + (TEMPLATES[idx]?.weight ?? 0), 0);
  const compliance_score = Math.max(0, Math.min(100, 82 + totalWeight));

  const worst = findings.reduce(
    (acc, f) => (SEVERITY_ORDER[f.severity]! > SEVERITY_ORDER[acc]! ? f.severity : acc),
    'info' as string
  );

  const traffic_light = trafficLightFromScore(compliance_score, worst);
  const confidence_percent = Math.round(
    findings.reduce((s, f) => s + f.confidence_percent, 0) / findings.length
  );

  return {
    compliance_score,
    traffic_light,
    confidence_percent,
    findings,
  };
}
