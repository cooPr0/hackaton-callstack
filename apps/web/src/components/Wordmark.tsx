import { Logo } from "./Logo";

/**
 * Horizontal lockup. NOTE: the design's wordmark is hand-drawn on the logo geometry and must
 * not be typeset ("nie składaj napisu żadnym krojem"). Until the designer exports that SVG
 * into design/, this renders the display font as a stand-in — swap the <span> for the SVG.
 */
export function Wordmark({ size = 28 }: { size?: number }) {
  return (
    <span
      style={{ display: "inline-flex", alignItems: "center", gap: size * 0.35 }}
      role="img"
      aria-label="Tint & Tell"
    >
      <Logo size={size} title="" />
      <span
        aria-hidden
        className="display"
        style={{ fontSize: size * 0.82, letterSpacing: "0.01em", textTransform: "uppercase" }}
      >
        Tint <span style={{ color: "var(--gold)" }}>&amp;</span> Tell
      </span>
    </span>
  );
}
