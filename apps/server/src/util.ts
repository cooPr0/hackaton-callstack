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
