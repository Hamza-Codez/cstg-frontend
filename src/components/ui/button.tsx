/**
 * Button (docs/UIUX_FRONTEND.md §3.1).
 *
 * Every variant is `cursor-pointer`, `rounded-md`, and carries an accent focus
 * ring. Accent fill is reserved for the single primary action in a view — it
 * marks the CTA, never a status.
 */

import type { ButtonHTMLAttributes } from "react";

import { cn } from "@/lib/cn";

export type ButtonVariant = "primary" | "secondary" | "neutral" | "ghost" | "danger";

const VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-gradient-primary text-white hover:opacity-90",
  // `hover:bg-slate-800` used to sit here and generated nothing: `colors` is
  // REPLACED in tailwind.config, so Tailwind's default palette does not exist.
  // The intent — go dark on hover — now points at a real token.
  secondary:
    "bg-surface text-structure border border-structure hover:bg-control hover:text-text-inverse hover:border-transparent",
  // Solid dark neutral: the resting state the row-action and activate buttons
  // were reaching for with !important overrides. White on `control` is 14.1:1.
  neutral:
    "bg-control text-text-inverse border border-control-border hover:bg-control-hover hover:border-control-border-hover",
  ghost: "bg-transparent text-structure hover:bg-canvas",
  // Filled, not outlined. Deactivate is destructive enough to read as such at a
  // glance in a dense table. White on `danger-solid` is 10.3:1.
  danger:
    "bg-danger-solid text-text-inverse border border-danger-solid-border hover:bg-danger-solid-hover hover:border-danger-solid-border-hover",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  /** Full width inside narrow containers (mobile portal forms). */
  block?: boolean;
}

export function buttonVariants({
  variant = "secondary",
  block = false,
  className,
}: {
  variant?: ButtonVariant;
  block?: boolean;
  className?: string;
} = {}) {
  return cn(
    // 15px/medium keeps white-on-accent above the AA boundary (§2.1).
    "inline-flex cursor-pointer items-center justify-center gap-2 rounded-sm px-3.5 py-0.5",
    "text-[15px] font-medium transition-all duration-300",
    "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
    "disabled:cursor-not-allowed disabled:opacity-50",
    VARIANTS[variant],
    block && "w-full",
    className,
  );
}

export function Button({
  variant = "secondary",
  block = false,
  className,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={buttonVariants({ variant, block, className })}
      {...props}
    />
  );
}
