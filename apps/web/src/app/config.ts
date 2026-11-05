import { wsPath } from "@tint/protocol";

/**
 * Server base URL (no trailing slash). `VITE_API_URL` at build time
 * (production: `https://tint-server.tint-server.workers.dev`), else same host on :8787.
 */
export function apiBase(): string {
  const env = import.meta.env.VITE_API_URL as string | undefined;
  if (env) return env.replace(/\/+$/, "");
  if (typeof location !== "undefined") return `${location.protocol}//${location.hostname}:8787`;
  return "http://localhost:8787";
}

/**
 * WebSocket URL for a room. One `token` per seat this socket controls
 * (local pass-and-play sends every human token).
 */
export function wsUrl(base: string, code: string, tokens: readonly string[]): string {
  const origin = base.replace(/\/+$/, "").replace(/^http/, "ws");
  return `${origin}${wsPath(code, tokens)}`;
}

/** Public join link encoded in the lobby QR. */
export const joinUrl = (origin: string, code: string) => `${origin}/join/${code}`;
/** iOS deep link (P3 registers the `tintandtell` URL scheme). */
export const appJoinUrl = (code: string) => `tintandtell://join/${code}`;
