import type { PlayerView } from "@tint/protocol";
import { useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import { noopActions } from "../app/actions";
import { ScreenHost } from "../app/ScreenHost";
import { selectScreen } from "../app/selectScreen";
import type { Posture, UiState } from "../app/types";
import { viewFixtures } from "../dev/fixtures";
import { useTheme } from "../theme/useTheme";

/** Emulated iPhone Duo sizes (design/Tint-and-Tell.pdf, "Do sprawdzenia"). */
const SIZE: Record<Posture, { w: number; h: number }> = {
  closed: { w: 402, h: 874 },
  open: { w: 1036, h: 828 },
};
const SCALE = 0.36;

function asLocal(v: PlayerView): PlayerView {
  return { ...v, local: true, you: v.seats.filter((s) => s.kind === "human").map((s) => s.id) };
}

function ui(view: PlayerView, unlocked: boolean): UiState {
  return {
    secretUnlockedFor: unlocked ? view.cueGiverSeatId : null,
    pauseOpen: false,
    rulesOpen: false,
  };
}

/**
 * /dev — every golden fixture through the real screen pipeline.
 *   /dev                         grid of fixture × posture
 *   /dev?f=guess1&p=open         one screen full-window (for screenshots)
 *   &local=1  force local mode   &unlocked=1  cue giver confirmed ("Jestem X")
 */
export function DevGallery() {
  const [params, setParams] = useSearchParams();
  const theme = useTheme();
  const local = params.get("local") === "1";
  const unlocked = params.get("unlocked") === "1";
  const single = params.get("f");

  const views = useMemo(
    () => Object.entries(viewFixtures).map(([name, v]) => [name, local ? asLocal(v) : v] as const),
    [local],
  );

  const toggle = (key: string) => {
    const next = new URLSearchParams(params);
    if (next.get(key) === "1") next.delete(key);
    else next.set(key, "1");
    setParams(next);
  };

  if (single) {
    const base = viewFixtures[single];
    if (!base) return <p style={{ padding: 24 }}>Unknown fixture “{single}”.</p>;
    const view = local ? asLocal(base) : base;
    const posture: Posture = params.get("p") === "closed" ? "closed" : "open";
    return (
      <div style={{ height: "100dvh" }}>
        <ScreenHost view={view} posture={posture} ui={ui(view, unlocked)} actions={noopActions} />
      </div>
    );
  }

  return (
    <main style={{ padding: 24 }}>
      <header
        style={{
          display: "flex",
          gap: 12,
          alignItems: "center",
          flexWrap: "wrap",
          marginBottom: 24,
        }}
      >
        <h1 style={{ fontSize: 28 }}>/dev</h1>
        <button type="button" onClick={theme.cycle}>
          theme: {theme.choice}
        </button>
        <button type="button" onClick={() => toggle("local")}>
          local: {local ? "on" : "off"}
        </button>
        <button type="button" onClick={() => toggle("unlocked")}>
          unlocked: {unlocked ? "on" : "off"}
        </button>
        <span style={{ color: "var(--muted)" }}>Click a frame to open it full-window.</span>
      </header>

      <div style={{ display: "grid", gap: 32 }}>
        {views.map(([name, view]) => (
          <section key={name}>
            <h2 style={{ fontSize: 16, fontFamily: "var(--font-body)", marginBottom: 8 }}>
              {name} <span style={{ color: "var(--muted)", fontWeight: 400 }}>· {view.phase}</span>
            </h2>
            <div style={{ display: "flex", gap: 24, alignItems: "flex-start", flexWrap: "wrap" }}>
              {(["closed", "open"] as const).map((posture) => {
                const { w, h } = SIZE[posture];
                const screenId = selectScreen(view, posture, ui(view, unlocked));
                const href = `/dev?f=${name}&p=${posture}${local ? "&local=1" : ""}${unlocked ? "&unlocked=1" : ""}`;
                return (
                  <figure key={posture} style={{ margin: 0 }}>
                    <a
                      href={href}
                      style={{
                        display: "block",
                        width: w * SCALE,
                        height: h * SCALE,
                        overflow: "hidden",
                        borderRadius: 16,
                        outline: "1px solid var(--line)",
                        color: "inherit",
                        textDecoration: "none",
                      }}
                    >
                      <div
                        style={{
                          width: w,
                          height: h,
                          transform: `scale(${SCALE})`,
                          transformOrigin: "top left",
                          background: "var(--bg)",
                          pointerEvents: "none",
                        }}
                      >
                        <ScreenHost
                          view={view}
                          posture={posture}
                          ui={ui(view, unlocked)}
                          actions={noopActions}
                        />
                      </div>
                    </a>
                    <figcaption style={{ fontSize: 12, color: "var(--muted)", marginTop: 6 }}>
                      {posture} → <strong style={{ color: "var(--fg)" }}>{screenId}</strong>
                    </figcaption>
                  </figure>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
