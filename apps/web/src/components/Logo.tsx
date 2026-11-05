import type { CSSProperties } from "react";

/**
 * "Dwa T": one T upright, the second rotated 180° — like a clue read from both sides of
 * the table; the gap between them is the hinge. Point-symmetric, so it reads the same from
 * either side. Geometry from the design: stem 46, bar 34.
 * Left T takes the round colour (default gold, always a colour from the board);
 * right T uses currentColor (Cocoa Spice in light mode, Cold Steel in dark).
 */
const STEM = 46;
const BAR = 34;
const BAR_W = 124;
const H = 200;
const GAP = 20;
const STEM_X = (BAR_W - STEM) / 2;
export const LOGO_VIEWBOX = `0 0 ${BAR_W * 2 + GAP} ${H}`;

export interface LogoProps {
  size?: number;
  roundColor?: string;
  title?: string;
  className?: string;
  style?: CSSProperties;
}

export function Logo({
  size = 32,
  roundColor = "var(--gold)",
  title = "Tint & Tell",
  className,
  style,
}: LogoProps) {
  const right = BAR_W + GAP;
  return (
    <svg
      viewBox={LOGO_VIEWBOX}
      height={size}
      width={(size * (BAR_W * 2 + GAP)) / H}
      role={title ? "img" : undefined}
      aria-label={title || undefined}
      aria-hidden={title ? undefined : true}
      className={className}
      style={style}
    >
      <g fill={roundColor}>
        <rect x={0} y={0} width={BAR_W} height={BAR} />
        <rect x={STEM_X} y={0} width={STEM} height={H} />
      </g>
      <g fill="currentColor">
        <rect x={right} y={H - BAR} width={BAR_W} height={BAR} />
        <rect x={right + STEM_X} y={0} width={STEM} height={H} />
      </g>
    </svg>
  );
}
