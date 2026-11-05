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
      style={{
        position: "fixed",
        right: 16,
        bottom: "calc(16px + env(safe-area-inset-bottom))",
        zIndex: 50,
        display: "flex",
        gap: 4,
        padding: 4,
        borderRadius: 999,
        background: "var(--glass)",
        backdropFilter: "blur(16px)",
        boxShadow: "var(--shadow-card)",
        fontSize: 14,
      }}
    >
      <button
        type="button"
        onClick={() => setOverride(next)}
        title={t.posture.hint}
        style={{
          border: 0,
          borderRadius: 999,
          padding: "8px 14px",
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
          style={{ border: 0, borderRadius: 999, padding: "8px 12px", background: "transparent" }}
          aria-label="Auto"
        >
          auto
        </button>
      )}
    </div>
  );
}
