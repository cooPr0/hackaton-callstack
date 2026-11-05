import type { SeatCredential } from "@tint/protocol";

/** Seat credentials kept per room so a refresh or reconnect resumes the same seats. */
export interface StoredRoom {
  seats: SeatCredential[];
  local: boolean;
  name?: string;
  createdAt: number;
}

export interface KeyValue {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

const key = (code: string) => `tint:room:${code.toUpperCase()}`;

/** Browser storage can throw (private mode, blocked site data) — every access is guarded. */
function defaultStorage(): KeyValue | null {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

export function createTokenStore(storage: KeyValue | null = defaultStorage()) {
  const memory = new Map<string, string>();
  const get = (k: string) => {
    try {
      return storage?.getItem(k) ?? memory.get(k) ?? null;
    } catch {
      return memory.get(k) ?? null;
    }
  };
  const set = (k: string, v: string) => {
    memory.set(k, v);
    try {
      storage?.setItem(k, v);
    } catch {
      /* fall back to memory for this tab */
    }
  };
  return {
    save(code: string, room: StoredRoom) {
      set(key(code), JSON.stringify(room));
    },
    load(code: string): StoredRoom | null {
      const raw = get(key(code));
      if (!raw) return null;
      try {
        const room = JSON.parse(raw) as StoredRoom;
        return Array.isArray(room.seats) && room.seats.length > 0 ? room : null;
      } catch {
        return null;
      }
    },
    forget(code: string) {
      memory.delete(key(code));
      try {
        storage?.removeItem(key(code));
      } catch {
        /* ignore */
      }
    },
  };
}

export type TokenStore = ReturnType<typeof createTokenStore>;
