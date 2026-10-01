import type { DayKey } from "./date";

const TAG_DATETIME = 0x0132;
const TAG_EXIF_IFD = 0x8769;
const TAG_DATETIME_ORIGINAL = 0x9003;
const TAG_DATETIME_DIGITIZED = 0x9004;

/** "2026:09:14 18:02:11" → "2026-09-14" (null when absent or malformed). */
function toDayKey(raw: string): DayKey | null {
  const m = /^(\d{4}):(\d{2}):(\d{2})/.exec(raw);
  if (!m || m[1] === "0000") return null;
  const [, y, mo, d] = m;
  if (Number(mo) < 1 || Number(mo) > 12 || Number(d) < 1 || Number(d) > 31) return null;
  return `${y}-${mo}-${d}`;
}

/**
 * Shooting date of a JPEG from its EXIF block (DateTimeOriginal, then
 * DateTimeDigitized, then DateTime). Pure parser over the file's first bytes.
 */
export function exifDate(buf: ArrayBuffer): DayKey | null {
  const view = new DataView(buf);
  if (view.byteLength < 4 || view.getUint16(0) !== 0xffd8) return null;
  let offset = 2;
  while (offset + 4 <= view.byteLength) {
    if (view.getUint8(offset) !== 0xff) return null;
    const marker = view.getUint8(offset + 1);
    const size = view.getUint16(offset + 2);
    // APP1 holding "Exif\0\0".
    if (marker === 0xe1 && offset + 10 <= view.byteLength && view.getUint32(offset + 4) === 0x45786966 && view.getUint16(offset + 8) === 0) {
      return readTiff(view, offset + 10);
    }
    if (marker === 0xda) return null; // Start of scan: no EXIF before the image data.
    offset += 2 + size;
  }
  return null;
}

function readTiff(view: DataView, tiff: number): DayKey | null {
  if (tiff + 8 > view.byteLength) return null;
  const order = view.getUint16(tiff);
  if (order !== 0x4949 && order !== 0x4d4d) return null;
  const le = order === 0x4949;
  const u16 = (o: number) => view.getUint16(o, le);
  const u32 = (o: number) => view.getUint32(o, le);

  const readIfd = (ifdOffset: number): Map<number, number> => {
    const entries = new Map<number, number>();
    const start = tiff + ifdOffset;
    if (start + 2 > view.byteLength) return entries;
    const count = u16(start);
    for (let i = 0; i < count; i++) {
      const e = start + 2 + i * 12;
      if (e + 12 > view.byteLength) break;
      entries.set(u16(e), e);
    }
    return entries;
  };
  const ascii = (entry: number): string | null => {
    const count = u32(entry + 4);
    const at = count > 4 ? tiff + u32(entry + 8) : entry + 8;
    if (at + count > view.byteLength) return null;
    let s = "";
    for (let i = 0; i < count; i++) {
      const c = view.getUint8(at + i);
      if (c === 0) break;
      s += String.fromCharCode(c);
    }
    return s;
  };

  const ifd0 = readIfd(u32(tiff + 4));
  const exifPtr = ifd0.get(TAG_EXIF_IFD);
  if (exifPtr != null) {
    const exif = readIfd(u32(exifPtr + 8));
    for (const tag of [TAG_DATETIME_ORIGINAL, TAG_DATETIME_DIGITIZED]) {
      const e = exif.get(tag);
      const key = e != null ? toDayKey(ascii(e) ?? "") : null;
      if (key) return key;
    }
  }
  const e = ifd0.get(TAG_DATETIME);
  return e != null ? toDayKey(ascii(e) ?? "") : null;
}

/** Reads the shooting date of a photo file, when its EXIF data kept it. */
export async function photoTakenOn(file: Blob): Promise<DayKey | null> {
  try {
    return exifDate(await file.slice(0, 256 * 1024).arrayBuffer());
  } catch {
    return null;
  }
}
