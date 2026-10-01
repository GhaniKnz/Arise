import { describe, expect, it } from "vitest";
import { exifDate } from "../exif";

/** Minimal JPEG: SOI + APP1 Exif (IFD0 → Exif IFD with the given tags) + SOS. */
function jpeg(tags: { ifd0?: [number, string][]; exif?: [number, string][] }, littleEndian: boolean): ArrayBuffer {
  const tiff: number[] = [];
  const u16 = (v: number) => (littleEndian ? [v & 0xff, v >> 8] : [v >> 8, v & 0xff]);
  const u32 = (v: number) => (littleEndian ? [v & 0xff, (v >> 8) & 0xff, (v >> 16) & 0xff, v >>> 24] : [v >>> 24, (v >> 16) & 0xff, (v >> 8) & 0xff, v & 0xff]);
  const ifd0 = [...(tags.ifd0 ?? [])];
  const exif = tags.exif ?? [];
  const hasExif = exif.length > 0;
  const ifd0Count = ifd0.length + (hasExif ? 1 : 0);
  const ifd0Size = 2 + ifd0Count * 12 + 4;
  const exifStart = 8 + ifd0Size;
  const exifSize = hasExif ? 2 + exif.length * 12 + 4 : 0;
  let dataAt = exifStart + exifSize;
  const blobs: number[] = [];
  const entry = (tag: number, value: string) => {
    const bytes = [...value].map((c) => c.charCodeAt(0)).concat(0);
    const out = [...u16(tag), ...u16(2), ...u32(bytes.length), ...u32(dataAt)];
    blobs.push(...bytes);
    dataAt += bytes.length;
    return out;
  };

  tiff.push(...(littleEndian ? [0x49, 0x49] : [0x4d, 0x4d]), ...u16(42), ...u32(8));
  tiff.push(...u16(ifd0Count));
  for (const [tag, v] of ifd0) tiff.push(...entry(tag, v));
  if (hasExif) tiff.push(...u16(0x8769), ...u16(4), ...u32(1), ...u32(exifStart));
  tiff.push(...u32(0));
  if (hasExif) {
    tiff.push(...u16(exif.length));
    for (const [tag, v] of exif) tiff.push(...entry(tag, v));
    tiff.push(...u32(0));
  }
  tiff.push(...blobs);

  const app1 = [0x45, 0x78, 0x69, 0x66, 0, 0, ...tiff];
  const size = app1.length + 2;
  return new Uint8Array([0xff, 0xd8, 0xff, 0xe1, size >> 8, size & 0xff, ...app1, 0xff, 0xda, 0, 2]).buffer;
}

describe("exifDate", () => {
  it("reads DateTimeOriginal in both byte orders", () => {
    expect(exifDate(jpeg({ exif: [[0x9003, "2026:03:14 09:12:00"]] }, true))).toBe("2026-03-14");
    expect(exifDate(jpeg({ exif: [[0x9003, "2025:12:01 21:00:05"]] }, false))).toBe("2025-12-01");
  });

  it("prefers the original date over the file's DateTime", () => {
    expect(exifDate(jpeg({ ifd0: [[0x0132, "2026:09:30 10:00:00"]], exif: [[0x9003, "2026:01:02 08:00:00"]] }, true))).toBe("2026-01-02");
  });

  it("falls back to DateTime when the Exif block has no date", () => {
    expect(exifDate(jpeg({ ifd0: [[0x0132, "2024:07:08 12:00:00"]] }, false))).toBe("2024-07-08");
  });

  it("returns null for non-JPEG data or empty dates", () => {
    expect(exifDate(new Uint8Array([0x89, 0x50, 0x4e, 0x47]).buffer)).toBeNull();
    expect(exifDate(new Uint8Array([0xff, 0xd8, 0xff, 0xda, 0, 2]).buffer)).toBeNull();
    expect(exifDate(jpeg({ exif: [[0x9003, "0000:00:00 00:00:00"]] }, true))).toBeNull();
  });
});
