import i18next from 'i18next';

import { generateProjectReport, generateSubmissionReport, type ProjectReportInput } from '@/services/pdf';
import ar from '@/locales/ar/common.json';
import en from '@/locales/en/common.json';
import { pdfReportData } from './pdf-report-data';

const language = new URLSearchParams(location.search).get('language') === 'ar' ? 'ar' : 'en';
const t = await i18next.createInstance().init({
  lng: language,
  resources: { ar: { translation: ar }, en: { translation: en } },
});
const { project, submission, finding, obligation, kpi, insurance, brand, wrappedEvidence } = pdfReportData(language);
const pageLabel = t('reportsPage.pdf.page', { n: '{{n}}', total: '{{total}}' });
const report: Pick<ProjectReportInput, 'language' | 't' | 'brand' | 'pageLabel' | 'project'> = {
  language, t: (key: string) => t(key), brand, pageLabel, project,
};

const submissionButton = document.querySelector<HTMLButtonElement>('#submission')!;
submissionButton.onclick = () => generateSubmissionReport({
  ...report,
  submission,
  findings: Array.from({ length: 55 }, (_, index) => ({
    ...finding,
    id: `finding-${index}`,
    evidence_extract: index === 0 ? wrappedEvidence : finding.evidence_extract,
  })),
});
submissionButton.disabled = false;

const projectButton = document.querySelector<HTMLButtonElement>('#project')!;
projectButton.onclick = () => generateProjectReport({
  ...report,
  submissions: [submission],
  obligations: [obligation],
  kpi: [kpi],
  insurance: [insurance],
});
projectButton.disabled = false;
