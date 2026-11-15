declare module 'harfbuzzjs/hb.js' {
  export default function createHarfBuzz(options: { locateFile: () => string }): Promise<unknown>;
}

declare module 'harfbuzzjs/hbjs.js' {
  interface Blob {
    destroy(): void;
  }

  interface Face {
    upem: number;
    destroy(): void;
  }

  interface Font {
    setScale(x: number, y: number): void;
  }

  interface Buffer {
    addText(text: string): void;
    setDirection(direction: 'ltr' | 'rtl'): void;
    guessSegmentProperties(): void;
    getGlyphInfosAndPositions(): Array<{
      codepoint: number;
      cluster: number;
      x_advance: number;
      x_offset: number;
      y_offset: number;
    }>;
    destroy(): void;
  }

  export default function wrapHarfBuzz(module: unknown): {
    createBlob(bytes: Uint8Array): Blob;
    createFace(blob: Blob, index: number): Face;
    createFont(face: Face): Font;
    createBuffer(): Buffer;
    shape(font: Font, buffer: Buffer): void;
  };
}
