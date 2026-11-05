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
