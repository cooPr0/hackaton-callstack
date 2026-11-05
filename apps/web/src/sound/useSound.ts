import type { PlayerView } from "@tint/protocol";
import { useEffect, useRef } from "react";
import { useStore } from "zustand";
import { apiBase } from "../app/config";
import type { BotState, Posture } from "../app/types";
import { soundEventsFor } from "./events";
import { sound, soundStore } from "./player";

/** Unlock audio on the first tap/key (browsers block autoplay until a gesture). */
export function useAudioUnlock() {
  useEffect(() => {
    const unlock = () => sound.unlock();
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);
}

/** Plays the shared sound events for this device from view, bot, posture and error changes. */
export function useGameSounds(
  view: PlayerView | null,
  bot: BotState,
  posture: Posture,
  errorAt: number | null,
) {
  const prevView = useRef<PlayerView | null>(null);
  useEffect(() => {
    if (view) for (const e of soundEventsFor(prevView.current, view)) sound.play(e);
    prevView.current = view;
  }, [view]);

  useEffect(() => {
    if (bot.thinking) sound.play("grok.thinking");
    else sound.stop("grok.thinking");
  }, [bot.thinking]);

  const prevPosture = useRef(posture);
  useEffect(() => {
    // unfold/seal are timed by the table animation; folding is a plain cue (local mode only)
    if (view?.local && prevPosture.current === "open" && posture === "closed") sound.play("fold");
    prevPosture.current = posture;
  }, [posture, view?.local]);

  // Grok's line as speech (v1.1). Keyed on lineAt so a repeated line still plays.
  useEffect(() => {
    if (bot.audioUrl && bot.lineAt) sound.speak(`${apiBase()}${bot.audioUrl}`);
  }, [bot.audioUrl, bot.lineAt]);

  useEffect(() => {
    if (errorAt) sound.play("error");
  }, [errorAt]);

  useEffect(() => () => sound.stopAll(), []);
}

export function useMuted() {
  const muted = useStore(soundStore, (s) => s.muted);
  const setMuted = useStore(soundStore, (s) => s.setMuted);
  return { muted, setMuted };
}

export { sound };
