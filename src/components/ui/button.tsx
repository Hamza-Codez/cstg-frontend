/**
 * Button (docs/UIUX_FRONTEND.md §3.1).
 *
 * Every variant is `cursor-pointer`, `rounded-md`, and carries an accent focus
 * ring. Accent fill is reserved for the single primary action in a view — it
 * marks the CTA, never a status.
 */

import type { ButtonHTMLAttributes } from "react";

import { cn } from "@/lib/cn";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

const VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-accent text-on-accent hover:bg-accent-hover",
  secondary: "bg-surface text-structure border border-structure hover:bg-gradient-header hover:text-text-inverse hover:border-transparent",
  ghost: "bg-transparent text-structure hover:bg-canvas",
  danger: "bg-surface text-overdue border border-transparent hover:border-overdue",
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
    "inline-flex cursor-pointer items-center justify-center gap-2 rounded-sm px-3.5 py-1",
    "text-[15px] font-medium transition-colors duration-fast",
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
