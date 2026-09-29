"use client";

import { useState } from "react";

/**
 * Runs `reset` during render when `open` flips to true — React's recommended
 * way to re-initialise local state from props without an effect.
 */
export function useResetOnOpen(open: boolean, reset: () => void, key?: unknown) {
  const [prev, setPrev] = useState<{ open: boolean; key: unknown }>({ open: false, key });
  if (open !== prev.open || (open && key !== prev.key)) {
    setPrev({ open, key });
    if (open) reset();
  }
}
