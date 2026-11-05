import { useStore } from "zustand";
import { apiBase, wsUrl } from "../app/config";
import { createApi } from "../net/api";
import { DEMO_PREFIX, isDemoRoom, MockConnection } from "../net/mock";
import { RoomSocket } from "../net/socket";
import { usePostureOverride } from "../posture/postureStore";
import { createGameStore, type GameStore } from "./game";
import { createTokenStore } from "./tokens";

const tokens = createTokenStore();

/** App-wide store wired to the real server (or the mock for DEMO rooms). */
export const gameStore = createGameStore({
  api: createApi(apiBase()),
  tokens,
  openConnection: (code, toks, h) =>
    isDemoRoom(code)
      ? new MockConnection(h)
      : new RoomSocket({ url: wsUrl(apiBase(), code, toks), ...h }),
  setPostureOverride: (p) => usePostureOverride.getState().setOverride(p),
  now: () => Date.now(),
});

export function useGame<T>(selector: (s: GameStore) => T): T {
  return useStore(gameStore, selector);
}

/** Seeds fake seat credentials for a scripted local demo room and returns its code. */
export function startDemo(): string {
  const code = `${DEMO_PREFIX}1`;
  tokens.save(code, {
    seats: [
      { seatId: "s1", token: "demo_s1_0000000000000000" },
      { seatId: "s2", token: "demo_s2_0000000000000000" },
    ],
    local: true,
    name: "Kuba",
    createdAt: Date.now(),
  });
  return code;
}
