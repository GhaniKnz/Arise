"use client";

import { animate, useMotionValue, useReducedMotion } from "motion/react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";

interface Props {
  value: number;
  format?: (n: number) => string;
  duration?: number;
  className?: string;
}

const defaultFormat = (n: number) => Math.round(n).toLocaleString("fr-FR");

/** Counts up/down to `value`, writing directly to the DOM (no re-render per frame). */
export function AnimatedNumber({ value, format = defaultFormat, duration = 0.9, className }: Props) {
  const ref = useRef<HTMLSpanElement>(null);
  const mv = useMotionValue(0);
  const reduce = useReducedMotion();
  const formatRef = useRef(format);
  // The initial text is fixed at mount; later frames are written straight to the DOM.
  const [initial] = useState(() => format(reduce ? value : 0));

  useLayoutEffect(() => {
    formatRef.current = format;
  });

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (reduce) {
      mv.set(value);
      node.textContent = formatRef.current(value);
      return;
    }
    const controls = animate(mv, value, {
      duration,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => {
        node.textContent = formatRef.current(v);
      },
    });
    return () => controls.stop();
  }, [value, duration, reduce, mv]);

  return (
    <span ref={ref} className={className}>
      {initial}
    </span>
  );
}
