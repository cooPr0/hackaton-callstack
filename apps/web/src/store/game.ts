import type { Mode, PlayerView, SeatKind, ServerMessage } from "@tint/protocol";
import { createStore, type StoreApi } from "zustand/vanilla";
import type { BotState, ConnState, Posture, UiState, WebActions } from "../app/types";
import type { Api } from "../net/api";
import { ApiError, fromCode, toApiError } from "../net/errors";
import { FATAL_CLOSE_ERROR, type Outgoing, type RoomConnection } from "../net/socket";
import type { TokenStore } from "./tokens";

export interface SetupForm {
  mode: Mode;
  rounds: number;
  local: boolean;
  players: { name: string; kind: SeatKind }[];
  /** Name this browser uses in `hello` (the host / first player). */
  hostName: string;
}

export interface ConnectHandlers {
  hello: { platform: "web"; name?: string };
  onMessage(msg: ServerMessage): void;
  onStatus(state: ConnState): void;
  onFatal(closeCode: number): void;
}

export interface GameDeps {
  api: Api;
  tokens: TokenStore;
  /** Opens the real socket (or the mock for demo rooms). */
  openConnection(code: string, tokens: string[], handlers: ConnectHandlers): RoomConnection;
  setPostureOverride(p: Posture | null): void;
  now(): number;
}

export interface UiError {
  code: string;
  message: string;
  at: number;
}

export interface GameState {
  code: string | null;
  local: boolean;
  view: PlayerView | null;
  conn: ConnState;
  pendingCount: number;
  error: UiError | null;
  bot: BotState;
  ui: UiState;
}

export interface GameStore extends GameState {
  createRoom(form: SetupForm): Promise<string>;
  joinRoom(code: string, name: string): Promise<void>;
  connect(code: string): void;
  clearError(): void;
  actions: WebActions;
}

const initial: GameState = {
  code: null,
  local: false,
  view: null,
  conn: "idle",
  pendingCount: 0,
  error: null,
  bot: { thinking: false, line: null, lineAt: null },
  ui: { secretUnlockedFor: null, pauseOpen: false, rulesOpen: false },
};

/**
 * The web client's single source of state. Renders nothing and computes no rules:
 * it turns server messages into state and screen intents into protocol messages.
 */
export function createGameStore(deps: GameDeps): StoreApi<GameStore> {
  let conn: RoomConnection | null = null;

  return createStore<GameStore>((set, get) => {
    const fail = (e: unknown): never => {
      const err = toApiError(e);
      set({ error: { code: err.code, message: err.message, at: deps.now() } });
      throw err;
    };

    /** Send a message; tracks pending state and surfaces errors as a toast + rejected promise. */
    const run = async (msg: Outgoing) => {
      if (!conn) return fail(fromCode("INTERNAL"));
      set((s) => ({ pendingCount: s.pendingCount + 1 }));
      try {
        await conn.send(msg);
      } catch (e) {
        fail(e);
      } finally {
        set((s) => ({ pendingCount: Math.max(0, s.pendingCount - 1) }));
      }
    };

    /** The seat this device must act as; it has to be one of ours. */
    const mySeat = (id: string | null | undefined, code: "NOT_YOUR_SEAT" | "NOT_YOUR_TURN") => {
      const view = get().view;
      if (!view || !id || !view.you.includes(id)) return fail(fromCode(code));
      return id;
    };

    const onMessage = (msg: ServerMessage) => {
      switch (msg.type) {
        case "view": {
          const prev = get().view;
          const next = msg.view;
          const newSecret =
            !prev || prev.round !== next.round || prev.cueGiverSeatId !== next.cueGiverSeatId;
          set((s) => ({
            view: next,
            local: next.local,
            ui: {
              ...s.ui,
              // a new secret must be re-confirmed by whoever holds the phone
              secretUnlockedFor: newSecret ? null : s.ui.secretUnlockedFor,
              pauseOpen: next.paused ? true : s.ui.pauseOpen && !(!next.paused && prev?.paused),
            },
            bot:
              next.phase === "GUESS_1" || next.phase === "GUESS_2"
                ? s.bot
                : { ...s.bot, thinking: false },
          }));
          return;
        }
        case "bot.status":
          set((s) => ({ bot: { ...s.bot, thinking: msg.state === "thinking" } }));
          return;
        case "bot.say":
          set((s) => ({ bot: { ...s.bot, thinking: false, line: msg.text, lineAt: deps.now() } }));
          return;
        case "error":
          set({ error: { code: msg.code, message: fromCode(msg.code).message, at: deps.now() } });
          return;
        default:
          return;
      }
    };

    const actions: WebActions = {
      start: () => run({ type: "game.start" }),
      submitClue: async (text) =>
        run({
          type: "clue.submit",
          seatId: mySeat(get().view?.cueGiverSeatId, "NOT_YOUR_SEAT"),
          text: text.trim(),
        }),
      place: async (x, y) =>
        run({ type: "stone.place", seatId: mySeat(get().view?.turnSeatId, "NOT_YOUR_TURN"), x, y }),
      next: () => run({ type: "round.next" }),
      pause: (paused) => run({ type: "pause.set", paused }),
      end: () => run({ type: "game.end" }),
      unlockSecret: (seatId) => set((s) => ({ ui: { ...s.ui, secretUnlockedFor: seatId } })),
      openPause: (open) => set((s) => ({ ui: { ...s.ui, pauseOpen: open } })),
      openRules: (open) => set((s) => ({ ui: { ...s.ui, rulesOpen: open } })),
      setPosture: (p) => deps.setPostureOverride(p),
      retryConnection: () => conn?.retry(),
      leave: () => {
        conn?.close();
        conn = null;
        set({ ...initial });
      },
    };

    return {
      ...initial,
      actions,

      async createRoom(form) {
        try {
          const res = await deps.api.createRoom({
            mode: form.mode,
            rounds: form.rounds,
            local: form.local,
            platform: "web",
            seats: form.players,
          });
          deps.tokens.save(res.code, {
            seats: res.seats,
            local: form.local,
            name: form.hostName,
            createdAt: deps.now(),
          });
          return res.code;
        } catch (e) {
          return fail(e);
        }
      },

      async joinRoom(code, name) {
        try {
          const cred = await deps.api.joinRoom(code, { name, platform: "web" });
          deps.tokens.save(code, { seats: [cred], local: false, name, createdAt: deps.now() });
        } catch (e) {
          fail(e);
        }
      },

      connect(code) {
        const room = deps.tokens.load(code);
        conn?.close();
        conn = null;
        if (!room) {
          set({
            ...initial,
            code,
            conn: "failed",
            error: { code: "NO_SEAT", message: fromCode("NO_SEAT").message, at: deps.now() },
          });
          return;
        }
        set({ ...initial, code, local: room.local });
        conn = deps.openConnection(
          code,
          room.seats.map((s) => s.token),
          {
            hello: { platform: "web", name: room.name },
            onMessage,
            onStatus: (state) => set({ conn: state }),
            onFatal: (closeCode) => {
              const errCode = FATAL_CLOSE_ERROR[closeCode] ?? "INTERNAL";
              if (errCode === "BAD_TOKEN" || errCode === "ROOM_NOT_FOUND") deps.tokens.forget(code);
              set({ error: { code: errCode, message: fromCode(errCode).message, at: deps.now() } });
            },
          },
        );
        conn.connect();
      },

      clearError: () => set({ error: null }),
    };
  });
}

export { ApiError };
