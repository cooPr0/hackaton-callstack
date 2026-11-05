import { type ErrorCode, ROOM_CODE_ALPHABET, ROOM_CODE_LENGTH } from "@tint/protocol";

const hex = (bytes: Uint8Array) =>
  Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");

export const sha256 = async (s: string) =>
  hex(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s))));

/** 128-bit random seat token. Only its SHA-256 is stored. */
export const newToken = () => hex(crypto.getRandomValues(new Uint8Array(16)));

export const newCode = () =>
  Array.from(
    crypto.getRandomValues(new Uint8Array(ROOM_CODE_LENGTH)),
    (b) => ROOM_CODE_ALPHABET[b % ROOM_CODE_ALPHABET.length],
  ).join("");

/** Player names are rendered by every client: strip control/format chars, trim, cap at 24. */
export const cleanName = (s: string, fallback: string) =>
  s.replace(/\p{C}/gu, "").trim().slice(0, 24) || fallback;

export const httpError = (status: number, code: ErrorCode, message: string) =>
  Response.json({ code, message }, { status });

/**
 * Close codes for refused or ended sockets. A browser can't read an upgrade's HTTP status (it only
 * sees 1006 and would retry forever), so refusals accept the socket, send `error`, then close
 * with one of these. Clients treat them as fatal: don't reconnect.
 */
export const CLOSE = {
  BAD_TOKEN: 4401,
  ROOM_NOT_FOUND: 4404,
  REPLACED: 4409,
  PROTOCOL_MISMATCH: 4426,
} as const;

export function refuseSocket(close: number, code: ErrorCode, message: string): Response {
  const [client, server] = Object.values(new WebSocketPair()) as [WebSocket, WebSocket];
  server.accept();
  server.send(JSON.stringify({ type: "error", code, message }));
  server.close(close, code);
  return new Response(null, { status: 101, webSocket: client });
}

/**
 * Comma-separated allowlist. `https://*.example.dev` matches exactly one subdomain label
 * (Pages preview deploys), so `https://evil.example.dev.attacker.com` does not match.
 */
export function originAllowed(origin: string, list: string): boolean {
  return list
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean)
    .some((p) => {
      if (p === origin) return true;
      const star = p.indexOf("*");
      if (star < 0) return false;
      const [pre, suf] = [p.slice(0, star), p.slice(star + 1)];
      const label = origin.slice(pre.length, origin.length - suf.length);
      return origin.startsWith(pre) && origin.endsWith(suf) && /^[a-z0-9-]+$/.test(label);
    });
}
