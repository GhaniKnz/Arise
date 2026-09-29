"use client";

import { Minus, Plus } from "lucide-react";
import { motion } from "motion/react";
import { forwardRef, useId, useState, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";
import { parseNum } from "@/lib/utils/format";

export function Field({ label, hint, error, children, htmlFor, className }: { label: ReactNode; hint?: ReactNode; error?: ReactNode; children: ReactNode; htmlFor?: string; className?: string }) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label htmlFor={htmlFor} className="block text-[13px] font-medium text-ink-2">
        {label}
      </label>
      {children}
      {error ? <p className="text-xs text-bad">{error}</p> : hint ? <p className="text-xs text-ink-3">{hint}</p> : null}
    </div>
  );
}

const inputBase =
  "h-11 w-full rounded-xl border border-line-strong bg-void/60 px-3.5 text-[15px] text-ink placeholder:text-ink-3/70 outline-none transition focus:border-arise focus:shadow-[0_0_0_3px_rgb(77_163_255/0.18)]";

export const TextInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function TextInput({ className, ...rest }, ref) {
  return <input ref={ref} className={cn(inputBase, className)} {...rest} />;
});

export const TextArea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function TextArea({ className, ...rest }, ref) {
  return <textarea ref={ref} className={cn(inputBase, "h-auto min-h-24 py-2.5", className)} {...rest} />;
});

export function Select({ className, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn(inputBase, "appearance-none bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2212%22 height=%2212%22 fill=%22none%22 stroke=%22%237c87a6%22 stroke-width=%222%22><path d=%22M2 4l4 4 4-4%22/></svg>')] bg-[length:12px] bg-[right_14px_center] bg-no-repeat pr-9", className)} {...rest}>
      {children}
    </select>
  );
}

interface NumberInputProps {
  value: number | undefined;
  onChange: (v: number | undefined) => void;
  step?: number;
  min?: number;
  max?: number;
  unit?: string;
  placeholder?: string;
  id?: string;
  decimals?: number;
  size?: "md" | "lg";
  stepper?: boolean;
  className?: string;
  ariaLabel?: string;
  autoFocus?: boolean;
}

/** Numeric input accepting "77,5" or "77.5", with optional +/- steppers. */
export function NumberInput({ value, onChange, step = 1, min, max, unit, placeholder, id, decimals = 1, size = "md", stepper = true, className, ariaLabel, autoFocus }: NumberInputProps) {
  const fmt = (v: number | undefined) => (v == null ? "" : String(Number(v.toFixed(decimals))).replace(".", ","));
  const [text, setText] = useState(fmt(value));
  const [focused, setFocused] = useState(false);
  const [shown, setShown] = useState(value);
  if (!focused && value !== shown) {
    setShown(value);
    setText(fmt(value));
  }

  const clampV = (v: number) => Math.min(max ?? Infinity, Math.max(min ?? -Infinity, v));
  const bump = (dir: 1 | -1) => {
    const next = clampV(Number(((value ?? 0) + dir * step).toFixed(decimals)));
    onChange(next);
    setText(fmt(next));
  };

  const h = size === "lg" ? "h-14 text-2xl" : "h-11 text-[17px]";
  return (
    <div className={cn("flex items-stretch gap-1.5", className)}>
      {stepper && (
        <button type="button" onClick={() => bump(-1)} aria-label="Diminuer" className={cn("flex w-11 shrink-0 items-center justify-center rounded-xl border border-line-strong bg-deep text-ink-2 active:scale-95", size === "lg" && "w-13")}>
          <Minus className="size-4" />
        </button>
      )}
      <div className="relative min-w-0 flex-1">
        <input
          id={id}
          inputMode="decimal"
          enterKeyHint="done"
          autoComplete="off"
          aria-label={ariaLabel}
          autoFocus={autoFocus}
          placeholder={placeholder}
          value={text}
          onFocus={(e) => {
            setFocused(true);
            e.currentTarget.select();
          }}
          onBlur={() => {
            setFocused(false);
            const v = parseNum(text);
            onChange(v == null ? undefined : clampV(v));
          }}
          onChange={(e) => {
            setText(e.target.value);
            const v = parseNum(e.target.value);
            if (v != null) onChange(v);
            else if (e.target.value.trim() === "") onChange(undefined);
          }}
          className={cn(inputBase, h, "text-center font-display font-semibold tabular", unit && "pr-10")}
        />
        {unit && <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs text-ink-3">{unit}</span>}
      </div>
      {stepper && (
        <button type="button" onClick={() => bump(1)} aria-label="Augmenter" className={cn("flex w-11 shrink-0 items-center justify-center rounded-xl border border-line-strong bg-deep text-ink-2 active:scale-95", size === "lg" && "w-13")}>
          <Plus className="size-4" />
        </button>
      )}
    </div>
  );
}

export function Toggle({ checked, onChange, label, description }: { checked: boolean; onChange: (v: boolean) => void; label: ReactNode; description?: ReactNode }) {
  const id = useId();
  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <label htmlFor={id} className="min-w-0 cursor-pointer">
        <span className="block text-[15px] text-ink">{label}</span>
        {description && <span className="block text-xs text-ink-3">{description}</span>}
      </label>
      <button
        id={id}
        role="switch"
        type="button"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn("relative h-7 w-12 shrink-0 rounded-full border transition", checked ? "border-arise/60 bg-arise/30" : "border-line-strong bg-deep")}
      >
        <motion.span
          className={cn("absolute top-0.5 size-5.5 rounded-full", checked ? "bg-arise shadow-glow" : "bg-ink-3")}
          animate={{ left: checked ? 24 : 3 }}
          transition={{ type: "spring", stiffness: 500, damping: 32 }}
        />
      </button>
    </div>
  );
}

interface SegmentedProps<T extends string> {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: ReactNode; icon?: ReactNode }[];
  className?: string;
  size?: "sm" | "md";
  ariaLabel?: string;
}

export function Segmented<T extends string>({ value, onChange, options, className, size = "md", ariaLabel }: SegmentedProps<T>) {
  const id = useId();
  return (
    <div role="radiogroup" aria-label={ariaLabel} className={cn("flex rounded-xl border border-line bg-void/50 p-1", className)}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={cn(
              "relative flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-lg font-medium whitespace-nowrap transition-colors",
              size === "sm" ? "h-8 px-1.5 text-xs" : "h-9 px-2 text-sm",
              active ? "text-ink" : "text-ink-3 hover:text-ink-2",
            )}
          >
            {active && <motion.span layoutId={`seg-${id}`} className="absolute inset-0 rounded-lg border border-arise/40 bg-arise/15" transition={{ type: "spring", stiffness: 500, damping: 38 }} />}
            <span className="relative flex min-w-0 items-center gap-1.5">
              {o.icon && <span className={cn("shrink-0 [&>svg]:size-4", o.label ? "hidden min-[400px]:inline-flex" : "inline-flex")}>{o.icon}</span>}
              <span className="truncate">{o.label}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function Chip({ active, onClick, children, className }: { active?: boolean; onClick?: () => void; children: ReactNode; className?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border px-3 text-[13px] font-medium whitespace-nowrap transition [&>svg]:size-3.5",
        active ? "border-arise/60 bg-arise/15 text-ink shadow-[0_0_12px_rgb(77_163_255/0.25)]" : "border-line bg-deep/60 text-ink-2 hover:border-line-strong",
        className,
      )}
    >
      {children}
    </button>
  );
}

/** Large tappable choice card used in onboarding and pickers. */
export function ChoiceCard({ selected, onClick, title, description, icon }: { selected: boolean; onClick: () => void; title: ReactNode; description?: ReactNode; icon?: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        "flex w-full items-center gap-3.5 rounded-2xl border p-4 text-left transition active:scale-[0.99]",
        selected ? "border-arise/70 bg-arise/10 shadow-[0_0_0_1px_rgb(77_163_255/0.3),0_0_24px_-6px_rgb(77_163_255/0.5)]" : "border-line bg-deep/50 hover:border-line-strong",
      )}
    >
      {icon && <span className={cn("flex size-11 shrink-0 items-center justify-center rounded-xl text-xl [&>svg]:size-5", selected ? "bg-arise/20 text-arise" : "bg-white/5 text-ink-2")}>{icon}</span>}
      <span className="min-w-0 flex-1">
        <span className="block font-medium text-ink">{title}</span>
        {description && <span className="mt-0.5 block text-[13px] text-ink-3">{description}</span>}
      </span>
      <span className={cn("size-5 shrink-0 rounded-full border-2 transition", selected ? "border-arise bg-arise shadow-glow" : "border-line-strong")} aria-hidden />
    </button>
  );
}
