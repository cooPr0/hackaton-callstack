import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type { z } from "zod";
import {
  ClientMessage,
  CreateRoomRequest,
  CreateRoomResponse,
  HealthResponse,
  JoinRoomRequest,
  JoinRoomResponse,
  PlayerView,
  ServerMessage,
} from "../src";

export const fixturesRoot = fileURLToPath(new URL("../../../shared/fixtures/", import.meta.url));

/** Which schema validates which fixture file. */
export function schemaFor(dir: "views" | "messages", file: string): z.ZodType {
  if (dir === "views") return PlayerView;
  if (file.startsWith("client.")) return ClientMessage;
  if (file.startsWith("server.")) return ServerMessage;
  const http: Record<string, z.ZodType> = {
    "http.create-room.request.json": CreateRoomRequest,
    "http.create-room.response.json": CreateRoomResponse,
    "http.join.request.json": JoinRoomRequest,
    "http.join.response.json": JoinRoomResponse,
    "http.health.json": HealthResponse,
  };
  const s = http[file];
  if (!s) throw new Error(`No schema mapped for fixture ${dir}/${file}`);
  return s;
}

export function loadFixtures() {
  return (["views", "messages"] as const).flatMap((dir) =>
    readdirSync(fixturesRoot + dir)
      .filter((f) => f.endsWith(".json"))
      .map((file) => ({
        dir,
        file,
        data: JSON.parse(readFileSync(`${fixturesRoot}${dir}/${file}`, "utf8")) as unknown,
      })),
  );
}

/** Security invariant: no connection sees the target unless it is the cue giver or the round is revealed. */
export function secretLeak(view: PlayerView): boolean {
  if (!view.secret) return false;
  if (view.phase === "REVEAL" || view.phase === "GAME_OVER") return false;
  return !(view.cueGiverSeatId && view.you.includes(view.cueGiverSeatId));
}

/**
 * Grok's hint and voice payloads go to one socket that may be a guesser, and they're built from
 * model output. They must carry nothing about the board: no target/secret/window, no x/y
 * coordinates, no hex colors.
 */
export function boardLeak(msg: unknown): boolean {
  const json = JSON.stringify(msg);
  return /"(target|secret|window|x|y)":/.test(json) || /#[0-9a-fA-F]{6}\b/.test(json);
}

/** Fixture files whose payload is unicast Grok output and must pass `boardLeak`. */
export const isGrokUnicast = (file: string) =>
  file.startsWith("server.grok.hint") || file.startsWith("server.voice.ready");
