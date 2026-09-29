"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Status = "idle" | "starting" | "scanning" | "denied" | "unsupported" | "error";

interface DetectorLike {
  detect(source: HTMLVideoElement): Promise<{ rawValue: string }[]>;
}

/**
 * Camera barcode scanning: native BarcodeDetector when available (Chrome/Android),
 * otherwise ZXing loaded on demand (iOS Safari).
 */
export function useBarcodeScanner(onCode: (code: string) => void) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [status, setStatus] = useState<Status>("idle");
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
    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus("unsupported");
      return;
    }
    setStatus("starting");
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
    } catch (e) {
      setStatus(e instanceof DOMException && e.name === "NotAllowedError" ? "denied" : "error");
      return;
    }
    video.srcObject = stream;
    video.setAttribute("playsinline", "true");
    await video.play().catch(() => undefined);
    let active = true;
    const stopStream = () => {
      active = false;
      stream.getTracks().forEach((t) => t.stop());
      video.srcObject = null;
    };

    const BD = (window as unknown as { BarcodeDetector?: new (o: { formats: string[] }) => DetectorLike }).BarcodeDetector;
    if (BD) {
      const detector = new BD({ formats: ["ean_13", "ean_8", "upc_a", "upc_e"] });
      stopRef.current = stopStream;
      setStatus("scanning");
      const loop = async () => {
        if (!active) return;
        try {
          const codes = await detector.detect(video);
          if (codes[0]?.rawValue) {
            stopStream();
            onCodeRef.current(codes[0].rawValue);
            return;
          }
        } catch {
          /* frame not ready */
        }
        window.setTimeout(loop, 180);
      };
      void loop();
      return;
    }

    try {
      const { BrowserMultiFormatReader } = await import("@zxing/browser");
      const reader = new BrowserMultiFormatReader();
      const controls = await reader.decodeFromVideoElement(video, (result) => {
        if (result && active) {
          controls.stop();
          stopStream();
          onCodeRef.current(result.getText());
        }
      });
      stopRef.current = () => {
        controls.stop();
        stopStream();
      };
      setStatus("scanning");
    } catch {
      stopStream();
      setStatus("unsupported");
    }
  }, []);

  useEffect(() => () => stopRef.current(), []);

  return { videoRef, status, start, stop };
}
