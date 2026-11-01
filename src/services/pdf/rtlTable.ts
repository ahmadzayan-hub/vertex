import type { RowInput, Styles, UserOptions } from 'jspdf-autotable';

function reverseRow(row: RowInput): RowInput {
  return Array.isArray(row) ? [...row].reverse() : row;
}

function columnCountOf(rows: RowInput[] | undefined): number {
  const first = rows?.[0];
  return Array.isArray(first) ? first.length : 0;
}

/**
 * jspdf-autotable has no concept of writing direction: columns always lay
 * out left to right and cells default to left-aligned text. For an Arabic
 * document that reads as a mirrored table, not an RTL one. This mirrors the
 * column order (so the first logical column sits on the right, as a reader
 * expects) and right-aligns cell text, without touching the English path,
 * which never calls this helper.
 */
export function toRtlTable(options: UserOptions): UserOptions {
  const columnCount =
    columnCountOf(options.body) || columnCountOf(options.head);

  const mirroredColumnStyles = options.columnStyles
    ? Object.fromEntries(
        Object.entries(options.columnStyles).map(([key, value]) => {
          const index = Number(key);
          const mirroredKey = Number.isInteger(index)
            ? String(columnCount - 1 - index)
            : key;
          return [mirroredKey, value];
        }),
      )
    : options.columnStyles;

  // Every autoTable theme (striped/grid/plain) defaults head text to
  // fontStyle 'bold'. Only the 'normal' weight of NotoSansArabic is
  // embedded (see arabicFont.ts), so leaving 'bold' in place makes jsPDF
  // fail the ('notosansarabic', 'bold') lookup and silently fall back to
  // Times -- which has no Arabic glyphs -- for every Arabic table header.
  // Defaulting to 'normal' here (still overridable) keeps headers on the
  // embedded font.
  const rightAlign: Partial<Styles> = { halign: 'right', fontStyle: 'normal' };

  return {
    ...options,
    head: options.head?.map(reverseRow),
    body: options.body?.map(reverseRow),
    columnStyles: mirroredColumnStyles,
    styles: { ...rightAlign, ...options.styles },
    headStyles: { ...rightAlign, ...options.headStyles },
    bodyStyles: { ...rightAlign, ...options.bodyStyles },
  };
}
