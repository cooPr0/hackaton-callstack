import { createStore } from "zustand/vanilla";
import type { SoundEvent } from "./events";
import { type SoundSpec, soundSpecs } from "./manifest";

const MUTE_KEY = "tint:muted";

function storedMuted(): boolean {
  try {
    return globalThis.localStorage?.getItem(MUTE_KEY) === "1";
  } catch {
    return false;
  }
}

/** Per-device mute (default: sound on). */
export const soundStore = createStore<{ muted: boolean; setMuted(m: boolean): void }>((set) => ({
  muted: storedMuted(),
  setMuted(muted) {
    try {
      globalThis.localStorage?.setItem(MUTE_KEY, muted ? "1" : "0");
    } catch {
      /* per-viewer convenience */
    }
    set({ muted });
  },
}));

/**
 * Web Audio player for the shared sound set. Nothing plays before the first user gesture
 * (autoplay policy); buffers are fetched and decoded lazily and cached. Missing files are no-ops.
 */
class SoundPlayer {
  private ctx: AudioContext | null = null;
  private buffers = new Map<string, Promise<AudioBuffer | null>>();
  private loops = new Map<SoundEvent, AudioBufferSourceNode>();
  private speech: AudioBufferSourceNode | null = null;
  private speechSeq = 0;

  constructor(private readonly specs: Record<SoundEvent, SoundSpec>) {}

  /** Call from a user gesture once; afterwards sounds may play. */
  unlock() {
    if (typeof AudioContext === "undefined") return;
    this.ctx ??= new AudioContext();
    if (this.ctx.state === "suspended") void this.ctx.resume();
  }

  play(event: SoundEvent) {
    const spec = this.specs[event];
    if (!spec.url || !this.ctx || soundStore.getState().muted) return;
    if (spec.loop && this.loops.has(event)) return;
    void this.load(spec.url).then((buffer) => {
      if (!buffer || !this.ctx || soundStore.getState().muted) return;
      const src = this.ctx.createBufferSource();
      const gain = this.ctx.createGain();
      gain.gain.value = spec.gain;
      src.buffer = buffer;
      src.loop = spec.loop;
      src.connect(gain).connect(this.ctx.destination);
      src.start();
      if (spec.loop) {
        this.loops.set(event, src);
        src.onended = () => this.loops.delete(event);
      }
    });
  }

  stop(event: SoundEvent) {
    this.loops.get(event)?.stop();
    this.loops.delete(event);
  }

  stopAll() {
    for (const e of [...this.loops.keys()]) this.stop(e);
    this.stopSpeech();
  }

  /**
   * Grok's spoken line: a one-off clip, so it is not cached, and a newer line cuts off an older
   * one. Respects mute like every other sound; fails silently (the text is on screen anyway).
   */
  speak(url: string) {
    const ctx = this.ctx;
    if (!ctx || soundStore.getState().muted) return;
    const seq = ++this.speechSeq;
    void fetch(url)
      .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(String(r.status)))))
      .then((data) => ctx.decodeAudioData(data))
      .then((buffer) => {
        if (seq !== this.speechSeq || soundStore.getState().muted) return;
        this.stopSpeech();
        const src = ctx.createBufferSource();
        src.buffer = buffer;
        src.connect(ctx.destination);
        src.start();
        this.speech = src;
        src.onended = () => {
          if (this.speech === src) this.speech = null;
        };
      })
      .catch(() => {});
  }

  private stopSpeech() {
    try {
      this.speech?.stop();
    } catch {
      /* already ended */
    }
    this.speech = null;
  }

  private load(url: string): Promise<AudioBuffer | null> {
    let p = this.buffers.get(url);
    if (!p) {
      const ctx = this.ctx;
      p = fetch(url)
        .then((r) => r.arrayBuffer())
        .then((data) => (ctx ? ctx.decodeAudioData(data) : null))
        .catch(() => null);
      this.buffers.set(url, p);
    }
    return p;
  }
}

export const sound = new SoundPlayer(soundSpecs);

soundStore.subscribe((s) => {
  if (s.muted) sound.stopAll();
});
