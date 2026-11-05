import { useEffect, useId, useRef, useState } from "react";
import { cueGiverName, seatById, stonesInWindow } from "../app/roles";
import type { ScreenProps } from "../app/types";
import { Button } from "../components/Button";
import { DisplayInput } from "../components/DisplayInput";
import { pl } from "../i18n/pl";
import { ClosedLayout, HingeRow } from "./ClosedLayout";
import { checkClue } from "./helpers";
import { run } from "./PauseSheet";
import styles from "./SecretScreen.module.css";
import { Viewfinder, type ViewfinderStone } from "./Viewfinder";

/**
 * The cue giver's private screen — the ONLY screen that reads `view.secret`.
 * Viewfinder (+ stone copies in SECRET_2), then the clue in huge display type.
 */
export function SecretScreen(props: ScreenProps) {
  const { view } = props;
  // A fresh field for every secret phase (SECRET_1 → SECRET_2, next round).
  return <SecretForm key={view ? `${view.round}-${view.phase}` : "none"} {...props} />;
}

function SecretForm(props: ScreenProps) {
  const { view, actions, pending, error } = props;
  const formId = useId();
  const inputId = useId();
  const errorId = useId();
  const input = useRef<HTMLInputElement>(null);
  const [text, setText] = useState("");
  const [clueError, setClueError] = useState<string | null>(null);

  useEffect(() => {
    input.current?.focus({ preventScroll: true });
  }, []);

  const secret = view?.secret;
  const phase = view?.phase;
  if (!view || !secret || (phase !== "SECRET_1" && phase !== "SECRET_2")) {
    return <ClosedLayout screen={props}>{null}</ClosedLayout>;
  }

  const second = phase === "SECRET_2";
  const name = cueGiverName(view);
  const header = `${pl.round.header(view.round, view.totalRounds)} · ${
    second && view.local ? pl.closed.foldedOnlyLooks(name) : pl.round.onlyLooks(name)
  }`;
  const stones: ViewfinderStone[] = second
    ? stonesInWindow(view).map((s) => {
        const seat = seatById(view, s.seatId);
        return { x: s.x, y: s.y, name: seat?.name ?? "", grok: seat?.kind === "grok" };
      })
    : [];
  const shownError = clueError ?? error;

  const submit = () => {
    if (pending) return;
    const check = checkClue(text, phase);
    if (!check.ok) {
      setClueError(check.message);
      return;
    }
    setClueError(null);
    run(actions.submitClue(check.clue));
  };

  const footer = view.local ? (
    <HingeRow
      submit
      form={formId}
      disabled={pending}
      label={second ? pl.secret.unfoldToShow : pl.secret.unfoldToSend}
    />
  ) : (
    <Button type="submit" form={formId} disabled={pending}>
      {pl.secret.send}
    </Button>
  );

  return (
    <ClosedLayout screen={props} header={header} footer={footer} toast={false}>
      <Viewfinder
        window={secret.window}
        target={secret.target}
        stones={stones}
        reservePx={view.local ? (second ? 420 : 390) : second ? 430 : 400}
      />
      {second ? (
        <p className={styles.caption}>
          <span>{pl.secret.bothStonesInFrame(stones.length)}</span>
          {view.clues[0] ? <span>{pl.secret.was(view.clues[0])}</span> : null}
        </p>
      ) : null}
      <form
        id={formId}
        className={styles.form}
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <label htmlFor={inputId} className={styles.label}>
          {second ? pl.secret.secondClue : pl.secret.firstClue}
        </label>
        <DisplayInput
          id={inputId}
          ref={input}
          value={text}
          onValueChange={(v) => {
            setText(v);
            if (clueError) setClueError(null);
          }}
          enterKeyHint="send"
          aria-invalid={shownError ? true : undefined}
          aria-describedby={errorId}
        />
        <p id={errorId} className={shownError ? styles.error : styles.helper} role="status">
          {shownError ?? pl.secret.rules}
        </p>
      </form>
    </ClosedLayout>
  );
}
