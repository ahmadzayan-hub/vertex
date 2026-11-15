import type { AiFinding, InsurancePolicy, KpiRecord, Obligation, Project, Submission } from '@/types';

const timestamp = '2026-11-14T08:30:00.000Z';
const dates = { created_at: timestamp, updated_at: timestamp };

export function pdfReportData(language: 'ar' | 'en') {
  const ar = language === 'ar';
  const project: Project = {
    ...dates,
    id: 'project-fixture',
    name: ar ? 'مَشْرُوعُ اخْتِبَارِ الإِشَارَاتِ' : 'Signal test project',
    contract_ref: 'AX-001',
    contract_value_aed: 12345.67,
    commencement_date: '2026-11-01',
    completion_date: null,
    performance_bond_aed: null,
    insurance_amount_aed: null,
    insurance_expiry_date: null,
    kpi_cap_percent: 12,
    owner_id: null,
    status: 'active',
  };
  const submission: Submission = {
    ...dates,
    id: 'submission-fixture',
    project_id: project.id,
    submission_type: 'technical_doc',
    document_name: ar ? 'وَثِيقَةُ CBTC للأصل AX-001' : 'CBTC document for AX-001',
    file_url: 'fixture.pdf',
    file_size_bytes: null,
    uploaded_by: null,
    uploaded_at: timestamp,
    processing_status: 'complete',
    processing_started_at: null,
    processing_completed_at: null,
    compliance_score: 93,
    traffic_light: 'green',
    confidence_percent: 98,
    approval_status: 'approved',
    approved_by: null,
    approved_at: null,
  };
  const finding: AiFinding = {
    ...dates,
    id: 'finding-fixture',
    submission_id: submission.id,
    finding_type: 'compliance_fail',
    severity: 'critical',
    title: ar ? 'فَحْصُ الوَصْلَةِ' : 'Connector inspection',
    description: null,
    contract_clause_ref: '4.2.1',
    evidence_extract: ar ? 'البند ٤٫٢، نِسْبَةُ التَّوَافُقِ ٩٣٪ (CBTC)' : 'Clause 4.2, 93% compliance (CBTC)',
    evidence_level: 'verified_source',
    source_citation: null,
    confidence_percent: 98,
    requires_action: true,
    ai_model_used: 'fixture',
    prompt_version: 'fixture',
  };
  const obligation: Obligation = {
    ...dates,
    id: 'obligation-fixture',
    project_id: project.id,
    obligation_type: 'deliverable',
    description: ar ? 'مُرَاجَعَةُ خُطَّةِ الصِّيَانَةِ' : 'Review the maintenance plan',
    details: null,
    due_date: null,
    submitted_date: null,
    approved_date: null,
    status: 'on_track',
    days_remaining: 7,
    alert_threshold_days: 14,
    critical_path_blocking: false,
    kpi_leverage_text: null,
  };
  const kpi: KpiRecord = {
    ...dates,
    id: 'kpi-fixture',
    project_id: project.id,
    submission_id: submission.id,
    kpi_category: ar ? 'التَّوَفُّرُ' : 'Availability',
    kpi_description: null,
    penalty_per_unit_aed: null,
    units_triggered: 7,
    penalty_amount_aed: 2345.67,
    deduction_recommended: true,
    deduction_reason: null,
    deduction_approved: true,
    approved_by: null,
    month: '2026-11',
  };
  const insurance: InsurancePolicy = {
    ...dates,
    id: 'insurance-fixture',
    project_id: project.id,
    coverage_type: ar ? 'المَسْؤُولِيَّةُ' : 'Liability',
    provider: ar ? 'التأمين الاصطناعي' : 'Synthetic Insurance',
    policy_number: 'POL-0123',
    amount_aed: null,
    expiry_date: null,
    renewal_status: 'active',
    renewal_evidence_url: null,
    renewal_evidence_uploaded_date: null,
    days_to_expiry: null,
    alert_sent: false,
  };
  const brand = {
    title: ar ? 'تَقْرِيرُ التَّحَقُّقِ' : 'Verification report',
    confidential: ar ? 'سري' : 'Confidential',
    generatedAt: '2026-11-14 12:30',
  };
  const wrappedEvidence = ar
    ? 'سَطْرُ المَرْجِعِ رقم ۱۲۳\nخُلَاصَةُ المُرَاجَعَةِ'
    : 'Reference line number 123\nReview summary';

  return { project, submission, finding, obligation, kpi, insurance, brand, wrappedEvidence };
}
