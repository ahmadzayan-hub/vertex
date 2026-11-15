import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

import { toRtlTable } from './rtlTable';

import type {
  Submission,
  Project,
  AiFinding,
  KpiRecord,
  Obligation,
  InsurancePolicy,
} from '@/types';
import { supabase } from '@/utils/supabase';
import { logAuditEvent } from '@/services/audit';

interface ReportBrand {
  title: string;
  confidential: string;
  generatedAt: string;
}

const BRAND_COLOR: [number, number, number] = [79, 70, 229]; // vertex-600
const MUTED_COLOR: [number, number, number] = [100, 116, 139];

function drawHeader(doc: jsPDF, brand: ReportBrand, subtitle: string, font: string) {
  const pageW = doc.internal.pageSize.getWidth();
  const arabic = font !== 'helvetica';
  const headingStyle = arabic ? 'normal' : 'bold';
  // Header stripe
  doc.setFillColor(...BRAND_COLOR);
  doc.rect(0, 0, pageW, 22, 'F');
  // VERTEX mark: a small V
  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(1.5);
  doc.line(12, 6, 17, 16);
  doc.line(17, 16, 22, 6);
  doc.setFillColor(245, 158, 11);
  doc.circle(12, 6, 1.5, 'F');
  // Wordmark
  doc.setFontSize(14);
  doc.setTextColor(255, 255, 255);
  doc.setFont(font, headingStyle);
  doc.text('VERTEX', 30, 13);
  // Title on the right
  doc.setFontSize(10);
  doc.setFont(font, 'normal');
  doc.text(brand.title, pageW - 14, 10, { align: 'right' });
  doc.setFontSize(8);
  doc.setTextColor(230, 230, 230);
  // Keep the browser-formatted date and time together inside the Arabic line.
  const generatedAt = arabic ? `\u2068${brand.generatedAt}\u2069` : brand.generatedAt;
  doc.text(`${brand.confidential} - ${generatedAt}`, pageW - 14, 16, { align: 'right' });
  // Subtitle
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(14);
  doc.setFont(font, headingStyle);
  if (arabic) {
    const lines: string[] = doc.splitTextToSize(subtitle, pageW - 28);
    doc.text(lines, pageW - 14, 34, { align: 'right' });
    return 40 + (lines.length - 1) * 14 * doc.getLineHeightFactor() / doc.internal.scaleFactor;
  }
  doc.text(subtitle, 14, 34);
  return 40;
}

function drawFooter(doc: jsPDF, label: string, font: string) {
  const pageCount = doc.getNumberOfPages();
  const pageH = doc.internal.pageSize.getHeight();
  const pageW = doc.internal.pageSize.getWidth();
  if (font !== 'helvetica') doc.setFont(font, 'normal');
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(...MUTED_COLOR);
    doc.text(
      label.replace('{{n}}', String(i)).replace('{{total}}', String(pageCount)),
      pageW / 2,
      pageH - 8,
      { align: 'center' }
    );
  }
}

async function createReport(language: 'en' | 'ar') {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: language === 'ar' });
  const font = language === 'ar' ? await (await import('./arabicText')).useArabicText(doc) : 'helvetica';
  const table = (options: Parameters<typeof autoTable>[1]) => {
    if (language === 'en') {
      autoTable(doc, options);
      return;
    }
    const rtl = toRtlTable(options);
    autoTable(doc, { ...rtl, styles: { ...rtl.styles, font } });
  };
  return { doc, font, table };
}

// i18next's typed TFunction is picky about the second-arg overloads; we only
// need a plain "give me a string back" contract from the caller's perspective.
type T = (key: string, opts?: unknown) => string;

export interface SubmissionReportInput {
  submission: Submission;
  project: Project | null;
  findings: AiFinding[];
  t: T;
  brand: ReportBrand;
  pageLabel: string;
  language?: 'en' | 'ar';
}

export async function generateSubmissionReport(input: SubmissionReportInput): Promise<void> {
  const { submission, project, findings, t, brand, pageLabel, language = 'en' } = input;
  const { doc, font, table } = await createReport(language);
  const startY = drawHeader(doc, brand, submission.document_name, font);
  const missing = language === 'ar' ? '–' : '-';

  doc.setFontSize(9);
  doc.setFont(font, 'normal');
  doc.setTextColor(...MUTED_COLOR);
  const meta = [
    [`${t('submission.meta.project')}:`, project?.name ?? missing],
    [`${t('project.meta.contract_ref')}:`, project?.contract_ref ?? missing],
    [`${t('submission.meta.uploaded')}:`, new Date(submission.uploaded_at).toLocaleString()],
    [`${t('submission.meta.compliance')}:`, submission.compliance_score != null ? `${submission.compliance_score}/100` : missing],
    [`${t('status.green')}:`, submission.traffic_light ?? missing],
    [`${t('submission.meta.approval')}:`, submission.approval_status],
  ];
  table({
    startY,
    body: meta,
    theme: 'plain',
    styles: { fontSize: 9, textColor: [15, 23, 42] as [number, number, number] },
    columnStyles: { 0: { textColor: MUTED_COLOR, cellWidth: 45 } },
  });

  const rows = findings.map((f) => [
    t(`severity.${f.severity}`, f.severity),
    t(`findingType.${f.finding_type}`, f.finding_type),
    f.title,
    f.contract_clause_ref ?? missing,
    f.evidence_extract ?? missing,
    `${f.confidence_percent}%`,
  ]);

  table({
    startY: (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY
      ? (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6
      : 90,
    head: [
      [
        t('severity.critical'),
        t('submission.tabs.findings'),
        t('submission.meta.processing'),
        t('evidence.clause'),
        t('evidence.quote'),
        t('evidence.confidence'),
      ],
    ],
    body: rows,
    theme: 'striped',
    headStyles: { fillColor: BRAND_COLOR, textColor: 255, fontSize: 9 },
    bodyStyles: { fontSize: 8, valign: 'top' },
    columnStyles: {
      4: { cellWidth: 55 },
    },
    margin: { top: 40 },
  });

  drawFooter(doc, pageLabel, font);
  const filename = `vertex-submission-${submission.id.slice(0, 8)}.pdf`;
  doc.save(filename);
}

export interface ProjectReportInput {
  project: Project;
  submissions: Submission[];
  obligations: Obligation[];
  kpi: KpiRecord[];
  insurance: InsurancePolicy[];
  t: T;
  brand: ReportBrand;
  pageLabel: string;
  language?: 'en' | 'ar';
}

export async function generateProjectReport(input: ProjectReportInput): Promise<void> {
  const { project, submissions, obligations, kpi, insurance, t, brand, pageLabel, language = 'en' } = input;
  const { doc, font, table } = await createReport(language);
  const startY = drawHeader(doc, brand, project.name, font);
  const missing = language === 'ar' ? '–' : '-';

  table({
    startY,
    body: [
      [`${t('project.meta.contract_ref')}:`, project.contract_ref],
      [`${t('project.meta.value')}:`, project.contract_value_aed != null ? `AED ${project.contract_value_aed.toLocaleString()}` : missing],
      [`${t('project.meta.commencement')}:`, project.commencement_date ?? missing],
      [`${t('project.meta.completion')}:`, project.completion_date ?? missing],
      [`${t('project.meta.kpi_cap')}:`, `${project.kpi_cap_percent}%`],
      [`${t('project.meta.status')}:`, project.status],
    ],
    theme: 'plain',
    styles: { fontSize: 9, textColor: [15, 23, 42] as [number, number, number] },
    columnStyles: { 0: { textColor: MUTED_COLOR, cellWidth: 45 } },
  });

  const submissionRows = submissions.map((s) => [
    new Date(s.uploaded_at).toLocaleDateString(),
    s.document_name,
    s.submission_type,
    s.compliance_score != null ? `${s.compliance_score}/100` : missing,
    s.traffic_light ?? missing,
    s.approval_status,
  ]);
  table({
    startY: (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6,
    head: [[
      t('submission.meta.uploaded'),
      t('submission.title'),
      t('submission.meta.processing'),
      t('submission.meta.compliance'),
      t('status.green'),
      t('submission.meta.approval'),
    ]],
    body: submissionRows.length === 0 ? [[missing, missing, missing, missing, missing, missing]] : submissionRows,
    theme: 'striped',
    headStyles: { fillColor: BRAND_COLOR, textColor: 255, fontSize: 9 },
    bodyStyles: { fontSize: 8 },
  });

  const obligationRows = obligations.map((o) => [
    o.due_date ?? missing,
    o.obligation_type,
    o.description,
    o.status,
    o.days_remaining ?? missing,
  ]);
  table({
    startY: (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6,
    head: [[
      t('obligationsPage.meta.due'),
      t('obligationsPage.meta.type'),
      t('submission.title'),
      t('obligationsPage.meta.type'),
      t('obligationsPage.meta.daysRemaining'),
    ]],
    body: obligationRows.length === 0 ? [[missing, missing, missing, missing, missing]] : obligationRows,
    theme: 'striped',
    headStyles: { fillColor: BRAND_COLOR, textColor: 255, fontSize: 9 },
    bodyStyles: { fontSize: 8 },
  });

  const kpiRows = kpi.map((k) => [
    k.month,
    k.kpi_category,
    String(k.units_triggered),
    `AED ${Number(k.penalty_amount_aed).toLocaleString()}`,
    k.deduction_approved ? (language === 'ar' ? t('submission.approvalStatus.approved') : '✓') : missing,
  ]);
  table({
    startY: (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6,
    head: [[
      t('kpiPage.table.month'),
      t('kpiPage.table.category'),
      t('kpiPage.table.units'),
      t('kpiPage.table.penalty'),
      t('kpiPage.table.approved'),
    ]],
    body: kpiRows.length === 0 ? [[missing, missing, missing, missing, missing]] : kpiRows,
    theme: 'striped',
    headStyles: { fillColor: BRAND_COLOR, textColor: 255, fontSize: 9 },
    bodyStyles: { fontSize: 8 },
  });

  const insuranceRows = insurance.map((p) => [
    p.coverage_type,
    p.provider ?? missing,
    p.policy_number ?? missing,
    p.expiry_date ?? missing,
    p.days_to_expiry ?? missing,
    p.renewal_status,
  ]);
  table({
    startY: (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6,
    head: [[
      t('insurancePage.table.coverage'),
      t('insurancePage.table.provider'),
      t('insurancePage.table.policy'),
      t('insurancePage.table.expiry'),
      t('insurancePage.table.daysToExpiry'),
      t('insurancePage.table.status'),
    ]],
    body: insuranceRows.length === 0 ? [[missing, missing, missing, missing, missing, missing]] : insuranceRows,
    theme: 'striped',
    headStyles: { fillColor: BRAND_COLOR, textColor: 255, fontSize: 9 },
    bodyStyles: { fontSize: 8 },
  });

  drawFooter(doc, pageLabel, font);
  const filename = `vertex-project-${project.id.slice(0, 8)}.pdf`;
  doc.save(filename);
}

/** Utility: pull the data needed for a report and generate. */
export async function generateSubmissionReportById(id: string, t: T, brand: ReportBrand, pageLabel: string, language: 'en' | 'ar' = 'en') {
  const { data: sub, error } = await supabase.from('submissions').select('*').eq('id', id).maybeSingle();
  if (error || !sub) throw error ?? new Error('submission not found');
  const [{ data: project }, { data: findings }] = await Promise.all([
    supabase.from('projects').select('*').eq('id', sub.project_id).maybeSingle(),
    supabase.from('ai_findings').select('*').eq('submission_id', id),
  ]);
  await generateSubmissionReport({
    submission: sub as Submission,
    project: (project as Project) ?? null,
    findings: (findings ?? []) as AiFinding[],
    t,
    brand,
    pageLabel,
    language,
  });
  await logAuditEvent({
    action: 'report.submission',
    resourceType: 'submission',
    resourceId: id,
    details: { format: 'pdf' },
  });
}

export async function generateProjectReportById(id: string, t: T, brand: ReportBrand, pageLabel: string, language: 'en' | 'ar' = 'en') {
  const { data: project, error } = await supabase.from('projects').select('*').eq('id', id).maybeSingle();
  if (error || !project) throw error ?? new Error('project not found');
  const [subs, obls, kpis, ins] = await Promise.all([
    supabase.from('submissions').select('*').eq('project_id', id).order('uploaded_at', { ascending: false }),
    supabase.from('obligations').select('*').eq('project_id', id).order('due_date', { ascending: true, nullsFirst: false }),
    supabase.from('kpi_tracking').select('*').eq('project_id', id).order('month', { ascending: false }),
    supabase.from('insurance_tracking').select('*').eq('project_id', id).order('days_to_expiry', { ascending: true, nullsFirst: false }),
  ]);
  await generateProjectReport({
    project: project as Project,
    submissions: (subs.data ?? []) as Submission[],
    obligations: (obls.data ?? []) as Obligation[],
    kpi: (kpis.data ?? []) as KpiRecord[],
    insurance: (ins.data ?? []) as InsurancePolicy[],
    t,
    brand,
    pageLabel,
    language,
  });
  await logAuditEvent({
    action: 'report.project',
    resourceType: 'project',
    resourceId: id,
    details: { format: 'pdf' },
  });
}
