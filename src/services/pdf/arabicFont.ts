/**
 * VERTEX PDF Arabic font loader.
 *
 * Empty by default. Drop the base64-encoded Noto Sans Arabic subset
 * into `NOTO_SANS_ARABIC_BASE64` and jsPDF picks it up automatically
 * when a caller sets `doc.setFont('NotoSansArabic')`.
 *
 * To generate the subset (once, then commit the result):
 *
 *   pip install fonttools brotli
 *   pyftsubset NotoSansArabic-Regular.ttf \
 *     --output-file=NotoSansArabic-VertexSubset.ttf \
 *     --unicodes="U+0600-06FF,U+0750-077F,U+FB50-FDFF,U+FE70-FEFF,U+20-7E"
 *   base64 -w0 NotoSansArabic-VertexSubset.ttf > noto.b64
 *   # Paste noto.b64 as the value below.
 *
 * Until this is populated, the generator falls back to helvetica.
 * Arabic strings render with glyph substitution (see docs/FOLLOWUPS.md).
 */

import type jsPDF from 'jspdf';

// Set this to the base64 payload above to enable Arabic PDF text.
const NOTO_SANS_ARABIC_BASE64 = '';

export const ARABIC_FONT_NAME = 'NotoSansArabic';

export function isArabicFontAvailable(): boolean {
  return NOTO_SANS_ARABIC_BASE64.length > 0;
}

/**
 * Register the Arabic font on the given jsPDF instance. No-op when the
 * base64 payload is empty. Safe to call once per document.
 */
export function registerArabicFont(doc: jsPDF): boolean {
  if (!isArabicFontAvailable()) return false;
  try {
    doc.addFileToVFS(`${ARABIC_FONT_NAME}.ttf`, NOTO_SANS_ARABIC_BASE64);
    doc.addFont(`${ARABIC_FONT_NAME}.ttf`, ARABIC_FONT_NAME, 'normal');
    return true;
  } catch {
    return false;
  }
}

/** Preferred font family for a language. Falls back to helvetica when needed. */
export function pickFontFor(doc: jsPDF, language: 'en' | 'ar'): string {
  if (language === 'ar' && isArabicFontAvailable()) {
    // Only register on demand so English reports never touch the font blob.
    if (registerArabicFont(doc)) return ARABIC_FONT_NAME;
  }
  return 'helvetica';
}
