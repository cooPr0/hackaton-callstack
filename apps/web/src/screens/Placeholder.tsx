import type { ScreenProps } from "../app/types";

/** Temporary screen until Lane B registers the real one (the /dev gallery labels the ScreenId). */
export function Placeholder({ view, posture }: ScreenProps) {
  return (
    <section
      style={{
        display: "grid",
        placeItems: "center",
        height: "100%",
        padding: 24,
        textAlign: "center",
        color: "var(--muted)",
      }}
    >
      <p>
        placeholder · {view?.phase ?? "no view"} · {posture}
      </p>
    </section>
  );
}
