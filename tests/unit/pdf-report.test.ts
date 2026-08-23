/**
 * Regression guard for the jsPDF 3 / jspdf-autotable 5 upgrade.
 *
 * The PDF service is excluded from coverage and has no other test, so a
 * breaking change in either library would previously have reached production
 * silently: the app builds fine, and the failure only appears when a user
 * clicks "export". These tests exercise the three things the upgrade could
 * plausibly have broken — construction, the autoTable call shape, and the
 * `lastAutoTable.finalY` cursor the report relies on to stack tables.
 */
import { describe, expect, it } from 'vitest';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

describe('jsPDF / autoTable interop', () => {
  it('constructs an A4 document in millimetres', () => {
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    expect(Math.round(doc.internal.pageSize.getWidth())).toBe(210);
    expect(Math.round(doc.internal.pageSize.getHeight())).toBe(297);
  });

  it('accepts the functional autoTable(doc, options) call the reports use', () => {
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    expect(() =>
      autoTable(doc, {
        startY: 40,
        body: [['Project:', 'Blue Line Depot'], ['Status:', 'approved']],
        theme: 'plain',
        styles: { fontSize: 9, textColor: [15, 23, 42] },
      }),
    ).not.toThrow();
  });

  it('exposes lastAutoTable.finalY so a second table can stack below the first', () => {
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    autoTable(doc, { startY: 40, body: [['a', 'b']], theme: 'plain' });

    const cursor = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable;
    expect(cursor).toBeDefined();
    expect(cursor?.finalY).toBeGreaterThan(40);

    autoTable(doc, {
      startY: (cursor?.finalY ?? 90) + 6,
      head: [['Severity', 'Clause']],
      body: [['critical', '4.2.1']],
      theme: 'striped',
      headStyles: { fillColor: [16, 74, 92], textColor: 255, fontSize: 9 },
    });
    const second = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable;
    expect(second.finalY).toBeGreaterThan(cursor?.finalY ?? 0);
  });

  it('paginates and reports a page count the footer can number', () => {
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    autoTable(doc, {
      startY: 40,
      head: [['#', 'Finding']],
      body: Array.from({ length: 120 }, (_, i) => [String(i + 1), `finding ${i + 1}`]),
    });
    expect(doc.getNumberOfPages()).toBeGreaterThan(1);
    expect(() => doc.setPage(1)).not.toThrow();
  });

  it('emits a non-trivial PDF payload', () => {
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    doc.text('VERTEX', 14, 20);
    autoTable(doc, { startY: 30, body: [['a', 'b']] });
    const out = doc.output('arraybuffer');
    expect(out.byteLength).toBeGreaterThan(1000);
    expect(new TextDecoder().decode(new Uint8Array(out.slice(0, 5)))).toBe('%PDF-');
  });
});
