"use client";

import { useEffect, useRef } from "react";

/** Arcane gate backdrop with restrained motion behind the interface. */
export function Background({ particles = true }: { particles?: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!particles) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let w = 0;
    let h = 0;
    const mobile = window.matchMedia("(max-width: 640px)").matches;
    const dpr = Math.min(window.devicePixelRatio || 1, mobile ? 1.5 : 2);
    const resize = () => {
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    const count = mobile ? 14 : 42;
    const dots = Array.from({ length: count }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      r: 0.6 + Math.random() * 1.6,
      vy: 0.08 + Math.random() * 0.25,
      vx: (Math.random() - 0.5) * 0.08,
      hue: Math.random() < 0.6 ? 212 : 262,
      a: 0.15 + Math.random() * 0.45,
      tw: Math.random() * Math.PI * 2,
    }));

    let raf = 0;
    let running = true;
    let lastFrame = 0;
    const step = (time: number) => {
      if (!running) return;
      raf = requestAnimationFrame(step);
      if (mobile && time - lastFrame < 32) return;
      lastFrame = time;
      ctx.clearRect(0, 0, w, h);
      for (const d of dots) {
        d.y -= d.vy;
        d.x += d.vx;
        d.tw += 0.02;
        if (d.y < -10) {
          d.y = h + 10;
          d.x = Math.random() * w;
        }
        const alpha = d.a * (0.6 + 0.4 * Math.sin(d.tw));
        ctx.beginPath();
        ctx.fillStyle = `hsla(${d.hue} 95% 70% / ${alpha})`;
        ctx.shadowColor = `hsla(${d.hue} 95% 65% / ${alpha})`;
        ctx.shadowBlur = 8;
        ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
        ctx.fill();
      }
    };
    raf = requestAnimationFrame(step);

    const onVis = () => {
      running = document.visibilityState === "visible";
      if (running) raf = requestAnimationFrame(step);
      else cancelAnimationFrame(raf);
    };
    window.addEventListener("resize", resize);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      running = false;
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [particles]);

  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden>
      <div className="absolute inset-0 bg-void" />
      <div className="background-aurora absolute inset-0" />
      <div className="background-gate absolute inset-0" />
      <div className="background-veil absolute inset-0" />
      <div className="grid-bg absolute inset-0" />
      {particles && <canvas ref={canvasRef} className="absolute inset-0" />}
    </div>
  );
}
