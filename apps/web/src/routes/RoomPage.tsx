import { useEffect, useMemo, useRef } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router";
import { draftToSendOnUnfold } from "../app/clueDraft";
import { isHost } from "../app/roles";
import { ScreenHost } from "../app/ScreenHost";
import type { Posture } from "../app/types";
import { useCopy } from "../i18n";
import { isDemoRoom } from "../net/mock";
import { PostureToggle } from "../posture/PostureToggle";
import { usePosture, usePostureHotkey } from "../posture/usePosture";
import { useAudioUnlock, useGameSounds } from "../sound/useSound";
import { gameStore, useGame } from "../store";
import s from "./RoomPage.module.css";

const TOAST_MS = 4_000;

/** /room/:code — store → selectScreen → privacy filter → registered screen. */
export function RoomPage() {
  const t = useCopy();
  const { code = "" } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { posture } = usePosture();
  usePostureHotkey(posture);

  const view = useGame((st) => st.view);
  const conn = useGame((st) => st.conn);
  const ui = useGame((st) => st.ui);
  const bot = useGame((st) => st.bot);
  const pending = useGame((st) => st.pendingCount > 0);
  const error = useGame((st) => st.error);
  const actions = useGame((st) => st.actions);
  useAudioUnlock();
  useGameSounds(view, bot, posture, error?.at ?? null);

  // connect (and reconnect when the code changes)
  useEffect(() => {
    gameStore.getState().connect(code.toUpperCase());
    return () => gameStore.getState().actions.leave();
  }, [code]);

  // no (valid) seat for this room in this browser → go claim one; expired room → home
  useEffect(() => {
    if (conn !== "failed" || !error) return;
    if (error.code === "NO_SEAT" || error.code === "BAD_TOKEN")
      navigate(`/join/${code}`, { replace: true });
    if (error.code === "ROOM_NOT_FOUND") navigate("/", { replace: true });
  }, [conn, error, code, navigate]);

  // local games created from setup start right away ("Losuj odcień")
  const autostarted = useRef(false);
  useEffect(() => {
    if (autostarted.current || params.get("autostart") !== "1") return;
    if (view?.phase === "LOBBY" && view.local && isHost(view)) {
      autostarted.current = true;
      actions.start().catch(() => {});
    }
  }, [view, params, actions]);

  // local: unfolding the phone after typing a clue sends it, Enter or not
  const prevPosture = useRef<Posture | null>(null);
  useEffect(() => {
    const prev = prevPosture.current;
    prevPosture.current = posture;
    const st = gameStore.getState();
    const draft = draftToSendOnUnfold(prev, posture, st.view, st.ui);
    if (draft && st.pendingCount === 0) st.actions.submitClue(draft).catch(() => {});
  }, [posture]);

  // toasts fade on their own
  useEffect(() => {
    if (!error) return;
    const t = setTimeout(() => gameStore.getState().clearError(), TOAST_MS);
    return () => clearTimeout(t);
  }, [error]);

  const showToggle = useMemo(
    () => !!view?.local || isDemoRoom(code) || params.has("debug"),
    [view?.local, code, params],
  );

  return (
    <div className={s.room}>
      <ScreenHost
        view={view}
        posture={posture}
        ui={ui}
        actions={actions}
        bot={bot}
        conn={conn}
        pending={pending}
        error={error?.message ?? null}
      />
      {conn === "reconnecting" && (
        <div className={s.banner} role="status">
          {t.conn.reconnecting}
        </div>
      )}
      {error && error.code !== "NO_SEAT" && (
        <div className={s.toast} role="alert" key={error.at}>
          {error.message}
        </div>
      )}
      {showToggle && <PostureToggle posture={posture} />}
    </div>
  );
}
