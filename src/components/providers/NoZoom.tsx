"use client";

import { useEffect } from "react";

/**
 * iOS Safari ignores `user-scalable=no`: block its pinch gestures and
 * multi-finger moves so the app never zooms on phones (scrolling still works).
 */
export function NoZoom() {
  useEffect(() => {
    const stop = (e: Event) => e.preventDefault();
    const multi = (e: TouchEvent) => {
      if (e.touches.length > 1) e.preventDefault();
    };
    document.addEventListener("gesturestart", stop, { passive: false });
    document.addEventListener("gesturechange", stop, { passive: false });
    document.addEventListener("touchmove", multi, { passive: false });
    return () => {
      document.removeEventListener("gesturestart", stop);
      document.removeEventListener("gesturechange", stop);
      document.removeEventListener("touchmove", multi);
    };
  }, []);
  return null;
}
