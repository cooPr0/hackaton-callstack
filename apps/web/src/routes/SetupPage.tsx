import type { Mode } from "@tint/protocol";
import { MAX_ROUNDS, MIN_ROUNDS } from "@tint/protocol";
import { useState } from "react";
import { useNavigate } from "react-router";
import { Logo } from "../components/Logo";
import { pl } from "../i18n/pl";
import { hexAt, rows } from "../palette/palette";
import { startDemo, useGame } from "../store";
import s from "./SetupPage.module.css";
import {
  DEFAULT_PLAYERS,
  DEFAULT_ROUNDS,
  firstCueGiver,
  MAX_HUMANS,
  type Player,
  toForm,
  validate,
} from "./setup";

/** 2 × 2 swatch per mode tile (gold / blue / pink, as in the design). */
const MODE_SWATCH: Record<Mode, [number, number]> = { stol: [4, 3], ty: [16, 5], grok: [21, 3] };
const MODES: Mode[] = ["stol", "ty", "grok"];

type Row = Player & { id: number };
let nextId = 0;
const withId = (p: Player): Row => ({ ...p, id: nextId++ });

function Stones({ mode }: { mode: Mode }) {
  const human = (l: string) => <span className={s.stone}>{l}</span>;
  const grok = <span className={`${s.stone} ${s.stoneGrok}`} />;
  if (mode === "stol")
    return (
      <span className={s.modeStones}>
        {human("K")}
        {human("O")}
        {grok}
      </span>
    );
  if (mode === "ty")
    return (
      <span className={s.modeStones}>
        {human("K")} → {grok}
      </span>
    );
  return (
    <span className={s.modeStones}>
      {grok} → {human("K")}
    </span>
  );
}

export function SetupPage() {
  const navigate = useNavigate();
  const createRoom = useGame((st) => st.createRoom);
  const [mode, setMode] = useState<Mode>("stol");
  const [players, setPlayers] = useState<Row[]>(() => DEFAULT_PLAYERS.map(withId));
  const [rounds, setRounds] = useState(DEFAULT_ROUNDS);
  const [local, setLocal] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const humans = players.filter((p) => p.kind === "human");
  const invalid = validate(mode, players);

  const rename = (i: number, name: string) =>
    setPlayers((ps) => ps.map((p, j) => (j === i ? { ...p, name } : p)));
  const add = () =>
    setPlayers((ps) => [
      ...ps.filter((p) => p.kind === "human"),
      withId({ name: `Gracz ${humans.length + 1}`, kind: "human" }),
      ...ps.filter((p) => p.kind === "grok"),
    ]);
  const remove = (i: number) => setPlayers((ps) => ps.filter((_, j) => j !== i));

  async function submit() {
    if (invalid) return setError(invalid);
    setBusy(true);
    setError(null);
    try {
      const code = await createRoom(toForm(mode, rounds, local, players));
      navigate(`/room/${code}${local ? "?autostart=1" : ""}`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className={s.page}>
      <div className={s.top}>
        <Logo size={22} />
        <span className={s.meta}>{pl.setup.playersOnDevice(players.length, local)}</span>
      </div>

      <h1 className={s.title}>{pl.setup.title}</h1>

      <div className={s.strip} aria-hidden>
        {rows(0, 2)
          .flat()
          .map((hex) => (
            <span key={hex} style={{ background: hex }} />
          ))}
      </div>

      <fieldset className={s.modes}>
        <legend className="visually-hidden">Tryb gry</legend>
        {MODES.map((m) => {
          const [sx, sy] = MODE_SWATCH[m];
          return (
            <button
              key={m}
              type="button"
              className={s.mode}
              aria-pressed={mode === m}
              onClick={() => setMode(m)}
            >
              <span className={s.modeTitle}>{pl.setup.modes[m].title}</span>
              <span className={s.modeSub}>{pl.setup.modes[m].sub}</span>
              <Stones mode={m} />
              <span className={s.swatch} aria-hidden>
                {[0, 1].flatMap((dy) =>
                  [0, 1].map((dx) => (
                    <span key={`${dx}${dy}`} style={{ background: hexAt(sx + dx, sy + dy) }} />
                  )),
                )}
              </span>
              {mode === m && (
                <span className={s.check} aria-hidden>
                  ✓
                </span>
              )}
            </button>
          );
        })}
      </fieldset>

      <div className={s.players}>
        {players.map((p, i) => (
          <div key={p.id} className={s.player}>
            {p.kind === "grok" ? (
              <span className={`${s.chip} ${s.chipGrok}`} aria-hidden />
            ) : (
              <span className={s.chip} aria-hidden>
                {(p.name.trim()[0] ?? "?").toUpperCase()}
              </span>
            )}
            {p.kind === "grok" ? (
              <span className={s.name}>Grok</span>
            ) : (
              <input
                className={s.name}
                value={p.name}
                maxLength={24}
                aria-label={`Imię gracza ${i + 1}`}
                onChange={(e) => rename(i, e.target.value)}
              />
            )}
            {p.kind === "human" && humans.length > 1 && (
              <button
                type="button"
                className={s.remove}
                onClick={() => remove(i)}
                aria-label={`Usuń ${p.name}`}
              >
                ×
              </button>
            )}
          </div>
        ))}
        {humans.length < MAX_HUMANS && (
          <div className={s.player}>
            <button
              type="button"
              className={`${s.chip} ${s.chipAdd}`}
              onClick={add}
              aria-label={pl.setup.addPlayer}
            >
              +
            </button>
            <span className={s.name}>{pl.setup.addPlayer}</span>
          </div>
        )}
        <div className={s.rounds}>
          <span className={s.stepper}>
            <button
              type="button"
              onClick={() => setRounds((r) => Math.max(MIN_ROUNDS, r - 1))}
              aria-label="Mniej rund"
            >
              −
            </button>
            {pl.setup.rounds(rounds)}
            <button
              type="button"
              onClick={() => setRounds((r) => Math.min(MAX_ROUNDS, r + 1))}
              aria-label="Więcej rund"
            >
              +
            </button>
          </span>
          <span>{pl.setup.duration(rounds)}</span>
        </div>
      </div>

      <fieldset className={s.toggle}>
        <legend className="visually-hidden">Sposób gry</legend>
        <button type="button" aria-pressed={local} onClick={() => setLocal(true)}>
          {pl.setup.localToggle.local}
        </button>
        <button type="button" aria-pressed={!local} onClick={() => setLocal(false)}>
          {pl.setup.localToggle.online}
        </button>
      </fieldset>

      <div className={s.spacer} />
      {error && (
        <p className={s.error} role="alert">
          {error}
        </p>
      )}
      <button type="button" className={s.primary} disabled={busy || !!invalid} onClick={submit}>
        {local ? pl.setup.startLocal(firstCueGiver(mode, players)) : pl.setup.startOnline}
      </button>
      <button
        type="button"
        className={s.demo}
        onClick={() => navigate(`/room/${startDemo()}?autostart=1`)}
      >
        Wersja demo bez serwera
      </button>
    </main>
  );
}
