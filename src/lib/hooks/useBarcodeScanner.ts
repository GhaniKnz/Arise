"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { nativeDetector, zxingDecode, zxingReader, type NativeDetector, type ZxingReader } from "@/lib/food/barcodeDecode";

export type ScannerStatus = "idle" | "starting" | "scanning" | "denied" | "insecure" | "unsupported" | "error";

/** After this delay without result, ZXing also runs next to the native detector (some devices never answer). */
const NATIVE_ALONE_MS = 3500;
/** After this delay without result, the UI suggests the photo fallback. */
const SLOW_MS = 7000;

/**
 * Live camera barcode scanning: native BarcodeDetector when it supports EAN
 * (Chrome/Android), ZXing otherwise (iOS Safari, desktop) — and both if the
 * native one stays silent. The scan stops by itself on the first code.
 */
export function useBarcodeScanner(onCode: (code: string) => void) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [status, setStatus] = useState<ScannerStatus>("idle");
  const [slow, setSlow] = useState(false);
  const stopRef = useRef<() => void>(() => {});
  const onCodeRef = useRef(onCode);
  useEffect(() => {
    onCodeRef.current = onCode;
  });

  const stop = useCallback(() => {
    stopRef.current();
    stopRef.current = () => {};
    setStatus((s) => (s === "scanning" || s === "starting" ? "idle" : s));
  }, []);

  const start = useCallback(async () => {
    const video = videoRef.current;
    if (!video) return;
    stopRef.current();
    setSlow(false);
    // Camera access only exists on https:// (or localhost): a phone on http://192.168… gets nothing.
    if (!window.isSecureContext) {
      setStatus("insecure");
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus("unsupported");
      return;
    }
    setStatus("starting");
    let active = true;
    let timer = 0;
    let stream: MediaStream | null = null;
    stopRef.current = () => {
      active = false;
      window.clearTimeout(timer);
      stream?.getTracks().forEach((t) => t.stop());
      video.srcObject = null;
    };

    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 }, height: { ideal: 1080 } }, audio: false });
    } catch (e) {
      if (!active) return;
      const name = e instanceof DOMException ? e.name : "";
      setStatus(name === "NotAllowedError" || name === "SecurityError" ? "denied" : "error");
      return;
    }
    if (!active) {
      stream.getTracks().forEach((t) => t.stop());
      return;
    }
    // Continuous autofocus when the camera offers it: close-up barcodes are blurry otherwise.
    const [track] = stream.getVideoTracks();
    try {
      const caps = track?.getCapabilities?.() as (MediaTrackCapabilities & { focusMode?: string[] }) | undefined;
      if (caps?.focusMode?.includes("continuous")) await track.applyConstraints({ advanced: [{ focusMode: "continuous" } as MediaTrackConstraintSet] });
    } catch {
      /* optional */
    }
    video.srcObject = stream;
    video.muted = true;
    video.setAttribute("playsinline", "true");
    await video.play().catch(() => undefined);

    const detector: NativeDetector | null = await nativeDetector();
    let reader: ZxingReader | null = null;
    if (!detector) reader = await zxingReader().catch(() => null);
    if (!active) return;
    if (!detector && !reader) {
      stopRef.current();
      setStatus("unsupported");
      return;
    }
    setStatus("scanning");

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    const startedAt = Date.now();
    let frame = 0;
    let flaggedSlow = false;

    const zxingFrame = (): string | null => {
      if (!reader || !ctx) return null;
      // Only the central band (where the aiming frame is): faster and more reliable.
      const vw = video.videoWidth;
      const vh = video.videoHeight;
      const cw = vw * 0.85;
      const ch = vh * 0.6;
      const scale = Math.min(1, 1280 / cw);
      canvas.width = Math.round(cw * scale);
      canvas.height = Math.round(ch * scale);
      ctx.drawImage(video, (vw - cw) / 2, (vh - ch) / 2, cw, ch, 0, 0, canvas.width, canvas.height);
      return zxingDecode(reader, canvas);
    };

    const tick = async () => {
      if (!active) return;
      frame++;
      let code: string | null = null;
      if (video.readyState >= 2 && video.videoWidth > 0) {
        const helpNative = detector && Date.now() - startedAt > NATIVE_ALONE_MS;
        if (helpNative && !reader) reader = await zxingReader().catch(() => null);
        if (detector && (!helpNative || frame % 2 === 0)) {
          code = (await detector.detect(video).catch(() => []))[0]?.rawValue ?? null;
        } else {
          code = zxingFrame();
        }
      }
      if (!active) return;
      if (!code && !flaggedSlow && Date.now() - startedAt > SLOW_MS) {
        flaggedSlow = true;
        setSlow(true);
      }
      if (code) {
        stopRef.current();
        stopRef.current = () => {};
        setStatus("idle");
        onCodeRef.current(code);
        return;
      }
      timer = window.setTimeout(tick, 120);
    };
    void tick();
  }, []);

  useEffect(() => () => stopRef.current(), []);

  return { videoRef, status, slow: slow && status === "scanning", start, stop };
}
