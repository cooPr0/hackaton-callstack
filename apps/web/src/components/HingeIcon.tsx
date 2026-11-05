/** "Unfold" glyph: two small rounded rectangles side by side, like the open phone's halves. */
export function HingeIcon({ size = 22, className }: { size?: number; className?: string }) {
  return (
    <svg
      viewBox="0 0 28 22"
      width={(size * 28) / 22}
      height={size}
      aria-hidden="true"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <rect x="1" y="1" width="11.5" height="20" rx="3" />
      <rect x="15.5" y="1" width="11.5" height="20" rx="3" />
    </svg>
  );
}
