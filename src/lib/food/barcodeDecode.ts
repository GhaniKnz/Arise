"use client";

import type { DecodeHintType } from "@zxing/library";

/** Barcode decoding shared by the live scanner and still photos (EAN/UPC only). */

const FORMATS = ["ean_13", "ean_8", "upc_a", "upc_e"];

export interface NativeDetector {
  detect(source: ImageBitmapSource): Promise<{ rawValue: string }[]>;
}

interface NativeDetectorCtor {
  new (o: { formats: string[] }): NativeDetector;
  getSupportedFormats?: () => Promise<string[]>;
}

let native: Promise<NativeDetector | null> | undefined;

/**
 * Native BarcodeDetector, only when it really handles retail barcodes:
 * some browsers expose the API but support no format (it then never finds anything).
 */
export function nativeDetector(): Promise<NativeDetector | null> {
  native ??= (async () => {
    const BD = (window as unknown as { BarcodeDetector?: NativeDetectorCtor }).BarcodeDetector;
    if (!BD) return null;
    try {
      const supported = BD.getSupportedFormats ? await BD.getSupportedFormats() : FORMATS;
      const formats = FORMATS.filter((f) => supported.includes(f));
      return formats.includes("ean_13") ? new BD({ formats }) : null;
    } catch {
      return null;
    }
  })();
  return native;
}

export interface ZxingReader {
  decodeFromCanvas(canvas: HTMLCanvasElement): { getText(): string };
}

let zxing: Promise<ZxingReader> | undefined;

/** ZXing 1D reader restricted to EAN/UPC with "try harder" (also tries the image rotated), loaded on demand. */
export function zxingReader(): Promise<ZxingReader> {
  zxing ??= Promise.all([import("@zxing/browser"), import("@zxing/library")])
    .then(([{ BrowserMultiFormatOneDReader }, { BarcodeFormat, DecodeHintType: Hint }]) => {
      const hints = new Map<DecodeHintType, unknown>([
        [Hint.POSSIBLE_FORMATS, [BarcodeFormat.EAN_13, BarcodeFormat.EAN_8, BarcodeFormat.UPC_A, BarcodeFormat.UPC_E]],
        [Hint.TRY_HARDER, true],
      ]);
      return new BrowserMultiFormatOneDReader(hints) as ZxingReader;
    })
    .catch((e) => {
      zxing = undefined;
      throw e;
    });
  return zxing;
}

/** Decodes a canvas with ZXing; null when no barcode is readable. */
export function zxingDecode(reader: ZxingReader, canvas: HTMLCanvasElement): string | null {
  try {
    return reader.decodeFromCanvas(canvas).getText();
  } catch {
    return null;
  }
}

/**
 * Reads an EAN/UPC barcode from a photo. Phone pictures are large and the barcode
 * can be anywhere, so ZXing tries several sizes and a centred crop.
 */
export async function decodeBarcodeImage(file: Blob): Promise<string | null> {
  const bitmap = await createImageBitmap(file);
  try {
    const detector = await nativeDetector();
    if (detector) {
      const found = await detector.detect(bitmap).catch(() => []);
      if (found[0]?.rawValue) return found[0].rawValue;
    }
    const reader = await zxingReader();
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return null;
    const { width: w, height: h } = bitmap;
    // Upright first, then turned a quarter (barcodes printed vertically, e.g. on cans).
    const attempts: { crop: number; maxSide: number; turn?: boolean }[] = [
      { crop: 1, maxSide: 1600 },
      { crop: 0.6, maxSide: 1600 },
      { crop: 1, maxSide: 1600, turn: true },
      { crop: 0.6, maxSide: 1600, turn: true },
      { crop: 1, maxSide: 2600 },
      { crop: 1, maxSide: 1000 },
    ];
    for (const { crop, maxSide, turn } of attempts) {
      const sw = w * crop;
      const sh = h * crop;
      const scale = Math.min(1, maxSide / Math.max(sw, sh));
      const dw = Math.round(sw * scale);
      const dh = Math.round(sh * scale);
      canvas.width = turn ? dh : dw;
      canvas.height = turn ? dw : dh;
      ctx.save();
      ctx.translate(canvas.width / 2, canvas.height / 2);
      if (turn) ctx.rotate(Math.PI / 2);
      ctx.drawImage(bitmap, (w - sw) / 2, (h - sh) / 2, sw, sh, -dw / 2, -dh / 2, dw, dh);
      ctx.restore();
      const code = zxingDecode(reader, canvas);
      if (code) return code;
      // Let the UI breathe between heavy attempts.
      await new Promise((r) => setTimeout(r, 0));
    }
    return null;
  } finally {
    bitmap.close();
  }
}
