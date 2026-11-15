import type { jsPDF } from 'jspdf';
import bidiFactory from 'bidi-js';
import createHarfBuzz from 'harfbuzzjs/hb.js';
import wrapHarfBuzz from 'harfbuzzjs/hbjs.js';
import wasmUrl from 'harfbuzzjs/hb.wasm?url';

import { ARABIC_FONT_NAME, registerArabicFont } from './arabicFont';
import { embedArabicPdfFont, type PositionedGlyph } from './arabicPdfFont';

const bidi = bidiFactory();
type HarfBuzz = ReturnType<typeof wrapHarfBuzz>;
type Shaper = { hb: HarfBuzz; font: ReturnType<HarfBuzz['createFont']> };
let shaper: Promise<Shaper> | undefined;

function loadShaper(bytes: Uint8Array): Promise<Shaper> {
  shaper ??= createHarfBuzz({ locateFile: () => wasmUrl }).then((module) => {
    const hb = wrapHarfBuzz(module);
    const blob = hb.createBlob(bytes);
    const face = hb.createFace(blob, 0);
    const font = hb.createFont(face);
    font.setScale(1000, 1000);
    face.destroy();
    blob.destroy();
    return { hb, font };
  }).catch((error: unknown) => {
    shaper = undefined;
    throw error;
  });
  return shaper;
}

function shapeLine(text: string, { hb, font }: Shaper) {
  const embedding = bidi.getEmbeddingLevels(text, 'auto');
  const runs = [];
  for (let start = 0; start < text.length;) {
    let end = start + 1;
    while (end < text.length && embedding.levels[end] === embedding.levels[start]) end++;
    runs.push({ start, end, rtl: Boolean(embedding.levels[start] & 1) });
    start = end;
  }
  const visualIndices = bidi.getReorderedIndices(text, embedding);
  const order = new Map(visualIndices.map((index, position) => [index, position]));
  runs.sort((left, right) => order.get(left.start)! - order.get(right.start)!);

  let advance = 0;
  const glyphs: PositionedGlyph[] = [];
  for (const run of runs) {
    const content = text.slice(run.start, run.end);
    const buffer = hb.createBuffer();
    try {
      buffer.addText(content);
      buffer.setDirection(run.rtl ? 'rtl' : 'ltr');
      buffer.guessSegmentProperties();
      hb.shape(font, buffer);
      const shaped = buffer.getGlyphInfosAndPositions();
      const starts = [...new Set(shaped.map((glyph) => glyph.cluster))].sort((left, right) => left - right);
      const clusterText = new Map(starts.map((start, i) => [start, content.slice(start, starts[i + 1])]));
      for (const glyph of shaped) {
        // A combining mark can share the cluster with its base glyph. Map
        // the logical characters once, using the glyph with an advance.
        const value = glyph.x_advance ? clusterText.get(glyph.cluster) : undefined;
        if (value !== undefined) clusterText.delete(glyph.cluster);
        glyphs.push({ id: glyph.codepoint, text: value ?? '', x: (advance + glyph.x_offset) / 1000, y: glyph.y_offset / 1000 });
        advance += glyph.x_advance;
      }
    } finally {
      buffer.destroy();
    }
  }
  return { glyphs, width: advance / 1000 };
}

export async function useArabicText(doc: jsPDF): Promise<string> {
  if (!registerArabicFont(doc)) throw new Error('Noto Sans Arabic could not be loaded');
  doc.setFont(ARABIC_FONT_NAME, 'normal');
  const { draw, fontBytes } = embedArabicPdfFont(doc, doc.getFont());
  const engine = await loadShaper(fontBytes);
  const originalText = doc.text.bind(doc);
  const originalWidth = doc.getStringUnitWidth.bind(doc);
  const originalSplit = doc.splitTextToSize.bind(doc);
  const inArabicFont = () => doc.getFont().fontName === ARABIC_FONT_NAME;
  const shape = (line: string) => shapeLine(line, engine);

  doc.getStringUnitWidth = (text, options) => inArabicFont()
    ? shape(text).width
    : originalWidth(text, options);

  // autoTable measures and wraps through these same methods before painting
  // a row. Keep the width used for layout consistent with the shaped glyphs.
  doc.splitTextToSize = (text: string | string[], maxLength, options?: { fontSize?: number }) => {
    if (!inArabicFont()) return originalSplit(text as string, maxLength, options);
    const lines = typeof text === 'string' ? text.split(/\r\n?|\n/u) : text;
    const limit = maxLength * doc.internal.scaleFactor / (options?.fontSize ?? doc.getFontSize());
    return lines.flatMap((line) => {
      const wrapped: string[] = [];
      let current = '';
      for (const word of line.trim().split(/\s+/u)) {
        const next = current ? `${current} ${word}` : word;
        if (shape(next).width <= limit) {
          current = next;
          continue;
        }
        if (current) wrapped.push(current);
        current = '';
        // Preserve a letter and its vowel marks when a long token wraps.
        for (const cluster of word.match(/\P{Mark}\p{Mark}*|\p{Mark}+/gu) ?? []) {
          if (current && shape(current + cluster).width > limit) {
            wrapped.push(current);
            current = '';
          }
          current += cluster;
        }
      }
      wrapped.push(current);
      return wrapped;
    });
  };

  doc.text = (text, x, y, options, transform) => {
    if (!inArabicFont()) return originalText(text, x, y, options, transform);
    const lines = typeof text === 'string' ? text.split(/\r\n?|\n/u) : text;
    const fontHeight = doc.getFontSize() / doc.internal.scaleFactor;
    for (const [index, line] of lines.entries()) {
      const { glyphs, width } = shape(line);
      const align = options?.align === 'right' ? 1 : options?.align === 'center' ? 0.5 : 0;
      draw(glyphs, line, x - width * fontHeight * align, y + index * fontHeight * doc.getLineHeightFactor());
    }
    return doc;
  };

  return ARABIC_FONT_NAME;
}
