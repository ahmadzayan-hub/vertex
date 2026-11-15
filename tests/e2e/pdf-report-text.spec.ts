import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { test, expect } from '@playwright/test';

import ar from '../../src/locales/ar/common.json' with { type: 'json' };
import en from '../../src/locales/en/common.json' with { type: 'json' };
import { pdfReportData } from '../fixtures/pdf-report-data';

interface PdfPage {
  text: string;
  fonts: [name: string, embedded: boolean][];
  matches: Partial<Record<string, string>>;
}

const inspectPdf = fileURLToPath(new URL('../fixtures/inspect_pdf_text.py', import.meta.url));
test.use({ locale: 'en-US', timezoneId: 'UTC' });

// Compare canonical text, ignoring bidi controls and whitespace introduced by
// layout. Keep letters, diacritics, digits and punctuation intact.
function copyText(text: string): string {
  return text.replace(/\p{Bidi_Control}/gu, '').normalize('NFC').replace(/\s+/g, ' ').trim();
}

for (const language of ['ar', 'en'] as const) {
  for (const kind of ['submission', 'project'] as const) {
    test(`${language} ${kind} report downloads searchable, copyable text`, async ({ page }, info) => {
      // The real browser generator only gets the synthetic fixture, and any
      // requests beyond the local test origin are blocked.
      const externalRequests: string[] = [];
      const localOrigin = new URL(info.project.use.baseURL!).origin;
      await page.route('**/*', (route) => {
        const url = new URL(route.request().url());
        if (url.origin === localOrigin) return route.continue();
        externalRequests.push(url.origin);
        return route.abort();
      });
      await page.goto(`/tests/fixtures/pdf-report.html?language=${language}`);
      const downloadPromise = page.waitForEvent('download');
      await page.getByRole('button', { name: `Download ${kind} report` }).click();
      const download = await downloadPromise;
      expect(download.suggestedFilename()).toMatch(new RegExp(`^vertex-${kind}-.+\\.pdf$`));
      expect(externalRequests).toEqual([]);
      const path = info.outputPath(`${language}-${kind}.pdf`);
      await download.saveAs(path);

      const data = pdfReportData(language);
      const locale = language === 'ar' ? ar : en;
      const shared = [
        'VERTEX', data.brand.title, data.brand.confidential, data.brand.generatedAt,
        data.project.name, data.submission.document_name, data.project.contract_ref, '93/100',
      ];
      const queries = kind === 'submission'
        ? [...shared, locale.evidence.confidence, data.finding.title, '4.2.1', '98%', '(CBTC)', ...data.wrappedEvidence.split('\n')]
        : [...shared, data.obligation.description, data.kpi.kpi_category, data.insurance.coverage_type,
          data.insurance.provider!, data.insurance.policy_number!, 'AED 2,345.67'];
      if (language === 'ar' && kind === 'submission') queries.push('٤٫٢', '٩٣٪', 'التَّوَافُقِ');
      const pages: PdfPage[] = JSON.parse(execFileSync('python3', [inspectPdf, path, ...queries], { encoding: 'utf8' }));
      const text = copyText(pages.map((content) => content.text).join('\n'));

      for (const query of queries) {
        const match = pages.find((content) => content.matches[query] !== undefined)?.matches[query];
        expect.soft(copyText(match ?? ''), `find and copy ${query}`).toBe(copyText(query));
      }
      expect.soft(text).toContain(`${data.brand.confidential} - ${data.brand.generatedAt}`);
      if (kind === 'submission') expect.soft(text).toContain(copyText(data.finding.evidence_extract!));
      if (language === 'ar') {
        expect.soft(text).not.toMatch(/[\p{Cc}\uFFFD-\uFFFF\uFB50-\uFDFF\uFE70-\uFEFF]/u);
        if (kind === 'project') {
          expect.soft(text).toContain(copyText(locale.kpiPage.table.penalty));
          expect.soft(text).toContain(locale.submission.approvalStatus.approved);
        }
      }

      expect(pages.length).toBeGreaterThan(0);
      if (kind === 'submission') expect(pages.length).toBeGreaterThan(1);
      for (const [index, content] of pages.entries()) {
        const footer = locale.reportsPage.pdf.page.replace('{{n}}', String(index + 1)).replace('{{total}}', String(pages.length));
        expect.soft(copyText(content.text), `footer on page ${index + 1}`).toContain(footer);
        if (language === 'ar') {
          expect.soft(content.fonts, `fonts used on page ${index + 1}`).toEqual([['NotoSansArabic', true]]);
        } else {
          expect.soft(content.fonts.length).toBeGreaterThan(0);
          expect.soft(content.fonts.every(([name, embedded]) => name.startsWith('Helvetica') && !embedded)).toBe(true);
        }
      }
    });
  }
}
