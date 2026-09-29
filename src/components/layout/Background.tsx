"use client";

import { useEffect, useRef } from "react";

/** Deep-space backdrop: radial auras, faint grid and slow rising particles. */
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
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const resize = () => {
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    const count = w < 640 ? 22 : 42;
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
    const step = () => {
      if (!running) return;
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
      raf = requestAnimationFrame(step);
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
      <div className="absolute -top-40 -left-40 size-[36rem] rounded-full bg-[radial-gradient(circle,rgb(59_130_246/0.18),transparent_65%)]" />
      <div className="absolute top-1/3 -right-48 size-[40rem] rounded-full bg-[radial-gradient(circle,rgb(139_92_246/0.14),transparent_65%)]" />
      <div className="absolute -bottom-56 left-1/4 size-[34rem] rounded-full bg-[radial-gradient(circle,rgb(34_211_238/0.07),transparent_65%)]" />
      <div className="grid-bg absolute inset-0" />
      {particles && <canvas ref={canvasRef} className="absolute inset-0" />}
    </div>
  );
}
