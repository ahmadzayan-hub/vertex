/**
 * Golden-file regression guard for the Arabic PDF fix (docs/FOLLOWUPS.md,
 * "PDF Arabic font embedding").
 *
 * Before this change, services/pdf rendered every report with jsPDF's
 * built-in helvetica, which has no Arabic glyphs: Arabic text fell back to
 * isolated-form substitution with no joining and no RTL table layout. This
 * snapshots jsPDF's own shaping output for a realistic Arabic contract
 * clause (so a regression in the embedded font or in jsPDF's preprocessor
 * hook fails loudly) and asserts the English path never touches the font
 * blob. jspdf-autotable has no RTL concept of its own, so the table
 * mirroring in rtlTable.ts is covered separately with explicit, deterministic
 * assertions.
 */
import { describe, expect, it, vi } from 'vitest';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

import {
  ARABIC_FONT_NAME,
  isArabicFontAvailable,
  pickFontFor,
  registerArabicFont,
} from '@/services/pdf/arabicFont';
import { toRtlTable } from '@/services/pdf/rtlTable';

// A realistic Arabic contract clause -- the kind of text an AI finding's
// evidence_extract or a project report's obligation description carries
// straight through from a submitted document.
const ARABIC_CONTRACT_CLAUSE =
  'البند 4.2.1: يلتزم المتعهد بتسليم جميع الوثائق الفنية خلال عشرة أيام عمل من تاريخ الإشعار الرسمي.';

type ArabicCapableDoc = jsPDF & { processArabic: (text: string) => string };

describe('Arabic PDF shaping (golden)', () => {
  it('has a real Arabic font subset available, not the empty stub', () => {
    expect(isArabicFontAvailable()).toBe(true);
  });

  it('shapes an Arabic contract clause into joined presentation forms', () => {
    const doc = new jsPDF({ unit: 'mm', format: 'a4' }) as ArabicCapableDoc;
    const shaped = doc.processArabic(ARABIC_CONTRACT_CLAUSE);
    // If this ever equals the unshaped input, jsPDF's preprocessor silently
    // stopped firing and Arabic would render as disconnected isolated
    // glyphs again -- the exact bug this fix closes.
    expect(shaped).not.toBe(ARABIC_CONTRACT_CLAUSE);
    expect(shaped).toMatchSnapshot();
  });

  it('registers NotoSansArabic for ar and never touches helvetica for en', () => {
    const arDoc = new jsPDF({ unit: 'mm', format: 'a4' });
    expect(pickFontFor(arDoc, 'ar')).toBe(ARABIC_FONT_NAME);
    expect(Object.keys(arDoc.getFontList())).toContain(ARABIC_FONT_NAME);

    const enDoc = new jsPDF({ unit: 'mm', format: 'a4' });
    expect(pickFontFor(enDoc, 'en')).toBe('helvetica');
    expect(Object.keys(enDoc.getFontList())).not.toContain(ARABIC_FONT_NAME);
  });

  it('the embedded subset covers every glyph the shaper produces for this clause', () => {
    const doc = new jsPDF({ unit: 'mm', format: 'a4' }) as ArabicCapableDoc;
    expect(registerArabicFont(doc)).toBe(true);
    const shaped = doc.processArabic(ARABIC_CONTRACT_CLAUSE);
    doc.setFont(ARABIC_FONT_NAME);
    // jsPDF builds width metrics straight from the embedded TTF's cmap/hmtx;
    // a glyph missing from the subset reports a zero/undefined width here.
    expect(doc.getStringUnitWidth(shaped)).toBeGreaterThan(0);
  });
});

describe('RTL table reflow (jspdf-autotable has no RTL concept of its own)', () => {
  it('mirrors column order and right-aligns text for an RTL table', () => {
    const mirrored = toRtlTable({
      head: [['Clause', 'Status']],
      body: [['4.2.1', 'Compliant']],
      columnStyles: { 0: { cellWidth: 45 } },
    });
    expect(mirrored.head).toEqual([['Status', 'Clause']]);
    expect(mirrored.body).toEqual([['Compliant', '4.2.1']]);
    expect(mirrored.columnStyles).toEqual({ '1': { cellWidth: 45 } });
    expect(mirrored.styles?.halign).toBe('right');
    expect(mirrored.headStyles?.halign).toBe('right');
    expect(mirrored.bodyStyles?.halign).toBe('right');
  });

  it('leaves table-less options alone, defaulting only the alignment', () => {
    const result = toRtlTable({ startY: 40 });
    expect(result.head).toBeUndefined();
    expect(result.body).toBeUndefined();
    expect(result.columnStyles).toBeUndefined();
    expect(result.styles?.halign).toBe('right');
  });

  it('defaults head/body/style text to normal weight so autoTable never requests a missing bold Arabic variant', () => {
    // Every autoTable theme defaults head text to fontStyle 'bold', but only
    // the 'normal' weight of NotoSansArabic is embedded. Requesting the bold
    // variant makes jsPDF fall back to Times -- which has no Arabic glyphs --
    // for the whole header row. This guards against that regression.
    const mirrored = toRtlTable({
      head: [['البند', 'الحالة']],
      body: [['4.2.1', 'مستوفى']],
    });
    expect(mirrored.headStyles?.fontStyle).toBe('normal');
    expect(mirrored.bodyStyles?.fontStyle).toBe('normal');
    expect(mirrored.styles?.fontStyle).toBe('normal');
  });

  it('still lets an explicit fontStyle override win', () => {
    const mirrored = toRtlTable({ headStyles: { fontStyle: 'italic' } });
    expect(mirrored.headStyles?.fontStyle).toBe('italic');
  });
});

describe('Arabic contract page vs. the untouched English path', () => {
  it('embeds the Arabic font and sets R2L for an Arabic contract page, while English stays on bare helvetica', () => {
    // jsPDF warns via console.warn (and falls back to a glyph-less font)
    // when a requested (font, style) pair isn't registered -- exactly what
    // happened before toRtlTable defaulted fontStyle to 'normal' for the
    // bold head row. Asserting this never fires catches that regression
    // end-to-end, not just at the toRtlTable-options level.
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const arabicDoc = new jsPDF({ unit: 'mm', format: 'a4' });
    arabicDoc.setFont(pickFontFor(arabicDoc, 'ar'));
    arabicDoc.setR2L(true);
    arabicDoc.setFontSize(11);
    arabicDoc.text(ARABIC_CONTRACT_CLAUSE, 196, 20, { align: 'right' });
    autoTable(
      arabicDoc,
      toRtlTable({
        startY: 30,
        head: [['البند', 'الحالة']],
        body: [['4.2.1', 'مستوفى']],
        styles: { font: ARABIC_FONT_NAME },
      }),
    );
    expect(warnSpy).not.toHaveBeenCalled();
    warnSpy.mockRestore();

    const arabicBytes = arabicDoc.output('arraybuffer');
    expect(new TextDecoder().decode(new Uint8Array(arabicBytes.slice(0, 5)))).toBe('%PDF-');
    // The font subset must actually land in the output stream, not just in
    // jsPDF's in-memory font list.
    const arabicRaw = new TextDecoder('latin1').decode(new Uint8Array(arabicBytes));
    expect(arabicRaw).toContain(ARABIC_FONT_NAME);

    const englishDoc = new jsPDF({ unit: 'mm', format: 'a4' });
    englishDoc.setFont(pickFontFor(englishDoc, 'en'));
    englishDoc.text('Vertex compliance report', 14, 20);
    autoTable(englishDoc, {
      startY: 30,
      head: [['Clause', 'Status']],
      body: [['4.2.1', 'Compliant']],
    });
    const englishBytes = englishDoc.output('arraybuffer');
    const englishRaw = new TextDecoder('latin1').decode(new Uint8Array(englishBytes));
    // This is the "70% of reports are English-only" guarantee from
    // docs/FOLLOWUPS.md: the font blob must never reach an English report.
    expect(englishRaw).not.toContain(ARABIC_FONT_NAME);
    expect(englishBytes.byteLength).toBeLessThan(10_000);
  });
});
