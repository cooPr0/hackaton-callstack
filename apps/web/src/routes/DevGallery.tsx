import type { PlayerView } from "@tint/protocol";
import { useMemo } from "react";
import { Link, useSearchParams } from "react-router";
import { noopActions } from "../app/actions";
import { ScreenHost } from "../app/ScreenHost";
import { selectScreen } from "../app/selectScreen";
import type { ConnState, Posture, UiState } from "../app/types";
import { viewFixtures } from "../dev/fixtures";
import { useTheme } from "../theme/useTheme";

/** Emulated iPhone Duo sizes (design/Tint-and-Tell.pdf, "Do sprawdzenia"). */
const SIZE: Record<Posture, { w: number; h: number }> = {
  closed: { w: 402, h: 874 },
  open: { w: 1036, h: 828 },
};
const SCALE = 0.36;

/** Pseudo-fixture: no view yet, so the pipeline shows the connecting screen. */
const NO_VIEW = "connecting";
const CONN_STATES: readonly ConnState[] = ["connecting", "reconnecting", "failed"];

/** Query flags that change what a frame renders, kept on links between gallery and single view. */
const FLAGS = ["local", "unlocked", "pause", "rules"] as const;
type Flag = (typeof FLAGS)[number];

function asLocal(v: PlayerView): PlayerView {
  return { ...v, local: true, you: v.seats.filter((s) => s.kind === "human").map((s) => s.id) };
}

function uiFor(view: PlayerView | null, on: Record<Flag, boolean>): UiState {
  return {
    secretUnlockedFor: on.unlocked && view ? view.cueGiverSeatId : null,
    pauseOpen: on.pause,
    rulesOpen: on.rules,
  };
}

function connParam(raw: string | null): ConnState {
  return CONN_STATES.find((c) => c === raw) ?? "connecting";
}

/**
 * /dev — every golden fixture through the real screen pipeline.
 *   /dev                         grid of fixture × posture
 *   /dev?f=guess1&p=open         one screen full-window (for screenshots)
 *   &local=1    force local mode          &unlocked=1  cue giver confirmed ("Jestem X")
 *   &pause=1    pause sheet open          &rules=1     rules sheet open
 *   /dev?f=connecting&conn=reconnecting|failed   no view yet (connecting screen)
 */
export function DevGallery() {
  const [params, setParams] = useSearchParams();
  const theme = useTheme();
  const on = Object.fromEntries(FLAGS.map((k) => [k, params.get(k) === "1"])) as Record<
    Flag,
    boolean
  >;
  const conn = connParam(params.get("conn"));
  const single = params.get("f");

  const views = useMemo(
    () => [
      [NO_VIEW, null] as const,
      ...Object.entries(viewFixtures).map(
        ([name, v]) => [name, on.local ? asLocal(v) : v] as const,
      ),
    ],
    [on.local],
  );

  const toggle = (key: Flag) => {
    const next = new URLSearchParams(params);
    if (next.get(key) === "1") next.delete(key);
    else next.set(key, "1");
    setParams(next);
  };

  const flagQuery = FLAGS.filter((k) => on[k])
    .map((k) => `&${k}=1`)
    .join("");

  if (single) {
    const base = single === NO_VIEW ? null : viewFixtures[single];
    if (base === undefined) return <p style={{ padding: 24 }}>Unknown fixture “{single}”.</p>;
    const view = base && on.local ? asLocal(base) : base;
    const posture: Posture = params.get("p") === "closed" ? "closed" : "open";
    return (
      <div style={{ height: "100dvh", position: "relative" }}>
        <ScreenHost
          view={view}
          posture={posture}
          ui={uiFor(view, on)}
          actions={noopActions}
          conn={view ? "open" : conn}
        />
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
        {FLAGS.map((k) => (
          <button key={k} type="button" onClick={() => toggle(k)}>
            {k}: {on[k] ? "on" : "off"}
          </button>
        ))}
        <span style={{ color: "var(--muted)" }}>Click a frame to open it full-window.</span>
      </header>

      <div style={{ display: "grid", gap: 32 }}>
        {views.map(([name, view]) => (
          <section key={name}>
            <h2 style={{ fontSize: 16, fontFamily: "var(--font-body)", marginBottom: 8 }}>
              {name}{" "}
              <span style={{ color: "var(--muted)", fontWeight: 400 }}>
                · {view ? view.phase : "no view"}
              </span>
            </h2>
            <div style={{ display: "flex", gap: 24, alignItems: "flex-start", flexWrap: "wrap" }}>
              {(["closed", "open"] as const).map((posture) => {
                const { w, h } = SIZE[posture];
                const ui = uiFor(view, on);
                const screenId = selectScreen(view, posture, ui);
                const href = `/dev?f=${name}&p=${posture}${flagQuery}`;
                return (
                  <figure key={posture} style={{ margin: 0 }}>
                    {/* The frame is a plain box with a link laid over it, never wrapping it:
                        screens contain their own links (lobby, game over), and <a> in <a> is invalid. */}
                    <div
                      style={{
                        position: "relative",
                        width: w * SCALE,
                        height: h * SCALE,
                        overflow: "hidden",
                        borderRadius: 16,
                        outline: "1px solid var(--line)",
                      }}
                    >
                      <div
                        inert
                        style={{
                          position: "relative",
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
                          ui={ui}
                          actions={noopActions}
                          conn={view ? "open" : conn}
                        />
                      </div>
                      <Link
                        to={href}
                        aria-label={`${name}, ${posture}`}
                        style={{ position: "absolute", inset: 0, zIndex: 1 }}
                      />
                    </div>
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
