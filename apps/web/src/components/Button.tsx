import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";
import styles from "./Button.module.css";

export type ButtonVariant = "primary" | "secondary" | "danger";

interface Common {
  variant?: ButtonVariant;
  /** Stretch to the column width (default true: the design's pills are full width). */
  block?: boolean;
  children: ReactNode;
}

const cls = (variant: ButtonVariant, block: boolean, extra?: string) =>
  [styles.button, styles[variant], block ? styles.block : "", extra ?? ""].join(" ").trim();

/** Pill button: primary = dark pill, secondary = outlined, danger = red. */
export function Button({
  variant = "primary",
  block = true,
  className,
  type = "button",
  children,
  ...rest
}: Common & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button type={type} className={cls(variant, block, className)} {...rest}>
      {children}
    </button>
  );
}

/** Same look as Button, for navigation. */
export function ButtonLink({
  variant = "primary",
  block = true,
  className,
  children,
  ...rest
}: Common & AnchorHTMLAttributes<HTMLAnchorElement>) {
  return (
    <a className={cls(variant, block, className)} {...rest}>
      {children}
    </a>
  );
}
