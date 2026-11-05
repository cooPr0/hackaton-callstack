import type { Posture } from "../app/types";
import { useCopy } from "../i18n";
import { usePostureOverride } from "./postureStore";

/** Floating "Złóż / Rozłóż" pill for fold emulation (local mode, /dev, ?debug). */
export function PostureToggle({ posture }: { posture: Posture }) {
  const t = useCopy();
  const { override, setOverride } = usePostureOverride();
  const next: Posture = posture === "open" ? "closed" : "open";
  return (
    <div
      // A slim vertical tab on the left edge, mid-height: the screens keep their header, footer
      // buttons and scores at the top/bottom and their pause buttons on the right or at the hinge,
      // so this spot covers nothing. z 40 keeps it under sheets (50) and toasts (60+).
      style={{
        position: "fixed",
        left: 0,
        top: "50%",
        transform: "translateY(-50%)",
        zIndex: 40,
        display: "flex",
        flexDirection: "column",
        gap: 4,
        padding: 3,
        borderRadius: "0 14px 14px 0",
        background: "var(--glass)",
        backdropFilter: "blur(16px)",
        boxShadow: "var(--shadow-card)",
        fontSize: 12,
        writingMode: "vertical-rl",
      }}
    >
      <button
        type="button"
        onClick={() => setOverride(next)}
        title={t.posture.hint}
        style={{
          border: 0,
          borderRadius: 999,
          padding: "12px 6px",
          background: "var(--surface-strong)",
          color: "var(--on-surface-strong)",
          fontWeight: 600,
        }}
      >
        {next === "closed" ? t.posture.fold : t.posture.unfold}
      </button>
      {override && (
        <button
          type="button"
          onClick={() => setOverride(null)}
          style={{
            border: 0,
            borderRadius: 999,
            padding: "8px 6px",
            background: "transparent",
            color: "var(--fg)",
          }}
          aria-label="Auto"
        >
          auto
        </button>
      )}
    </div>
  );
}
