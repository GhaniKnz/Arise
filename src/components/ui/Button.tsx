"use client";

import Link from "next/link";
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "violet";
type Size = "sm" | "md" | "lg";

const base =
  "touch-target relative inline-flex select-none items-center justify-center gap-2 rounded-xl font-medium transition-[transform,background-color,box-shadow,opacity] duration-150 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-45 [&>svg]:shrink-0";

const variants: Record<Variant, string> = {
  primary: "bg-arise-gradient text-white shadow-[0_0_0_1px_rgb(120_170_255/0.45),0_8px_24px_-8px_rgb(77_163_255/0.7)] hover:brightness-110",
  violet: "bg-gradient-to-r from-violet to-[#6d28d9] text-white shadow-[0_0_0_1px_rgb(167_139_250/0.5),0_8px_24px_-8px_rgb(139_92_246/0.7)] hover:brightness-110",
  secondary: "border border-line-strong bg-deep/80 text-ink hover:border-arise/50 hover:bg-raised",
  ghost: "text-ink-2 hover:bg-white/5 hover:text-ink",
  danger: "border border-bad/40 bg-bad/10 text-bad hover:bg-bad/20",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-3 text-sm [&>svg]:size-4",
  md: "h-11 px-4 text-[15px] [&>svg]:size-[18px]",
  lg: "h-13 px-5 text-base [&>svg]:size-5",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  block?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", block, className, type = "button", ...rest },
  ref,
) {
  return <button ref={ref} type={type} className={cn(base, variants[variant], sizes[size], block && "w-full", className)} {...rest} />;
});

export function LinkButton({
  href,
  variant = "primary",
  size = "md",
  block,
  className,
  children,
}: {
  href: string;
  variant?: Variant;
  size?: Size;
  block?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link href={href} className={cn(base, variants[variant], sizes[size], block && "w-full", className)}>
      {children}
    </Link>
  );
}

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  variant?: "ghost" | "secondary" | "primary";
  size?: "sm" | "md" | "lg";
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { label, variant = "ghost", size = "md", className, type = "button", ...rest },
  ref,
) {
  const s = size === "sm" ? "size-8 [&>svg]:size-4" : size === "lg" ? "size-12 [&>svg]:size-6" : "size-10 [&>svg]:size-5";
  const v =
    variant === "primary"
      ? "bg-arise-gradient text-white shadow-glow"
      : variant === "secondary"
        ? "border border-line-strong bg-deep/80 text-ink-2 hover:text-ink hover:border-arise/50"
        : "text-ink-2 hover:bg-white/5 hover:text-ink";
  return (
    <button
      ref={ref}
      type={type}
      aria-label={label}
      title={label}
      className={cn("touch-target inline-flex shrink-0 items-center justify-center rounded-xl transition active:scale-95 disabled:opacity-40", s, v, className)}
      {...rest}
    />
  );
});
