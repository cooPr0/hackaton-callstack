import type { CSSProperties, ReactNode } from "react";

export interface SwatchProps {
  /** A palette cell hex (from palette.ts) — the only hard-coded colours in the app. */
  hex: string;
  radius?: number;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
}

/** A block of one board colour. Decorative: colours are never named to players. */
export function Swatch({ hex, radius = 4, className, style, children }: SwatchProps) {
  return (
    <div
      aria-hidden={children ? undefined : true}
      className={className}
      style={{ background: hex, borderRadius: radius, ...style }}
    >
      {children}
    </div>
  );
}
