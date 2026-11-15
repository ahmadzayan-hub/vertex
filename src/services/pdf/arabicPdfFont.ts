import type { Font, jsPDF } from 'jspdf';

export interface PositionedGlyph {
  id: number;
  text: string;
  x: number;
  y: number;
}

interface FontMetrics {
  rawData: Uint8Array;
  bbox: number[];
  ascender: number;
  decender: number;
  capHeight: number;
  widthOfGlyph(id: number): number;
}

interface FontOutput {
  font: Font & { isAlreadyPutted: boolean };
  newObject(): number;
  out(line: string): void;
  putStream(options: { data: string; objectId: number; addLength1?: boolean }): void;
}

const hex16 = (value: number) => value.toString(16).padStart(4, '0');

function utf16Hex(value: string): string {
  return value.split('').map((char) => hex16(char.charCodeAt(0))).join('');
}

function extractionText(text: string): string {
  // A PDF reader can run bidi processing on replacement text again. Isolate
  // paired Latin punctuation, or the punctuation itself in an Arabic run.
  // Keep a Latin expression such as (CBTC) contiguous for literal searches.
  return text.replace(/\([\x20-\x27\x2a-\x7e]+\)|\[[\x20-\x5a\x5c\x5e-\x7e]+\]|\p{Bidi_Mirrored}/gu,
    (value) => `\u200e${value}\u200e`);
}

function toUnicodeMap(entries: string[]): string {
  const chunks: string[] = [];
  for (let start = 0; start < entries.length; start += 100) {
    const chunk = entries.slice(start, start + 100);
    chunks.push(`${chunk.length} beginbfchar\n${chunk.join('\n')}\nendbfchar`);
  }
  return [
    '/CIDInit /ProcSet findresource begin', '12 dict begin', 'begincmap',
    '/CIDSystemInfo << /Registry (Adobe) /Ordering (UCS) /Supplement 0 >> def',
    '/CMapName /Adobe-Identity-UCS def', '/CMapType 2 def',
    '1 begincodespacerange', '<0000> <ffff>', 'endcodespacerange', ...chunks,
    'endcmap', 'CMapName currentdict /CMap defineresource pop', 'end', 'end',
  ].join('\n');
}

export function embedArabicPdfFont(doc: jsPDF, font: Font) {
  const metrics: FontMetrics = font.metadata;
  const internal = doc.internal as typeof doc.internal & { write(line: string): void };
  const codes = new Map<string, number>();
  const glyphIds = [0];
  const widths: number[] = [];
  const unicode: string[] = [];
  const fontName = '/NotoSansArabic';

  // jsPDF's standard TrueType writer maps a glyph ID to one UTF-16 code
  // unit. Lam-alef ligatures and positioned vowel marks need a mapping
  // from each PDF character code to a glyph ID and a Unicode sequence.
  font.encoding = 'VertexCID';
  internal.events.subscribe('putFont', (output: FontOutput) => {
    if (output.font !== font) return;
    const { newObject, out, putStream } = output;
    function stream(data: string, addLength1 = false): number {
      const objectId = newObject();
      putStream({ data, objectId, addLength1 });
      out('endobj');
      return objectId;
    }
    function object(dictionary: string): number {
      const objectId = newObject();
      out(`<< ${dictionary} >>`);
      out('endobj');
      return objectId;
    }

    // The source TTF is already subsetted. Keep its glyph indices intact.
    const bytes = Array.from(metrics.rawData, (byte) => String.fromCharCode(byte)).join('');
    const fontFile = stream(bytes, true);
    const cidToGid = stream(glyphIds.map((id) => String.fromCharCode(id >> 8, id & 255)).join(''));
    const cmap = stream(toUnicodeMap(unicode));
    const descriptor = object(
      `/Type /FontDescriptor /FontName ${fontName} /Flags 4 /FontBBox [${metrics.bbox.join(' ')}] ` +
      `/Ascent ${metrics.ascender} /Descent ${metrics.decender} /CapHeight ${metrics.capHeight} ` +
      `/StemV 80 /ItalicAngle 0 /FontFile2 ${fontFile} 0 R`,
    );
    const descendant = object(
      `/Type /Font /Subtype /CIDFontType2 /BaseFont ${fontName} /FontDescriptor ${descriptor} 0 R ` +
      `/CIDSystemInfo << /Registry (Adobe) /Ordering (Identity) /Supplement 0 >> ` +
      `/CIDToGIDMap ${cidToGid} 0 R /W [1 [${widths.join(' ')}]]`,
    );
    output.font.objectNumber = object(
      `/Type /Font /Subtype /Type0 /BaseFont ${fontName} /Encoding /Identity-H ` +
      `/DescendantFonts [${descendant} 0 R] /ToUnicode ${cmap} 0 R`,
    );
    output.font.isAlreadyPutted = true;
  });
  internal.events.subscribe('putCatalog', () => internal.write('/Version /1.5'));

  function code(glyph: PositionedGlyph): number {
    const key = `${glyph.id}:${glyph.text}`;
    const existing = codes.get(key);
    if (existing !== undefined) return existing;

    const cid = glyphIds.length;
    glyphIds.push(glyph.id);
    codes.set(key, cid);
    widths.push(Math.round(metrics.widthOfGlyph(glyph.id)));
    if (glyph.text) unicode.push(`<${hex16(cid)}> <${utf16Hex(glyph.text)}>`);
    return cid;
  }

  function draw(glyphs: PositionedGlyph[], original: string, x: number, y: number) {
    if (!glyphs.length) return;
    const size = doc.getFontSize();
    const color = doc.getTextColor().slice(1);
    const rgb = [0, 2, 4].map((start) => (parseInt(color.slice(start, start + 2), 16) / 255).toFixed(4));
    const lineX = x * internal.scaleFactor;
    const lineY = (internal.pageSize.getHeight() - y) * internal.scaleFactor;
    const baseline = glyphs.filter((glyph) => glyph.y === 0);
    const raised = glyphs.filter((glyph) => glyph.y !== 0);
    const commands = [
      'q', `${rgb.join(' ')} rg`, `/Span << /ActualText <feff${utf16Hex(extractionText(original))}> >> BDC`,
      'BT', `/${font.id} ${size} Tf`,
    ];

    // One text object spans the baseline. The following objects position
    // combining marks in the same replacement-text span.
    function textObject(run: PositionedGlyph[]) {
      if (!run.length) return;
      const first = run[0];
      commands.push(`1 0 0 1 ${(lineX + first.x * size).toFixed(4)} ${(lineY + first.y * size).toFixed(4)} Tm`);
      let cursor = first.x * 1000;
      const sequence: string[] = [];
      for (const glyph of run) {
        const adjust = cursor - glyph.x * 1000;
        if (Math.abs(adjust) > 0.001) sequence.push(adjust.toFixed(3));
        const cid = code(glyph);
        sequence.push(`<${hex16(cid)}>`);
        cursor = glyph.x * 1000 + widths[cid - 1];
      }
      commands.push(`[${sequence.join(' ')}] TJ`);
    }

    textObject(baseline);
    for (const glyph of raised) textObject([glyph]);
    commands.push('ET', 'EMC', 'Q');
    internal.write(commands.join('\n'));
  }

  return { draw, fontBytes: metrics.rawData };
}
