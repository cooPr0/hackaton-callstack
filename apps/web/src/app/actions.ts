import type { WebActions } from "./types";

const log = (name: string) =>
  import.meta.env.DEV
    ? (...args: unknown[]) => console.info(`[noop action] ${name}`, ...args)
    : () => {};

/** Actions that do nothing — for /dev previews and tests. */
export const noopActions: WebActions = {
  start: async () => log("start")(),
  submitClue: async (text) => log("submitClue")(text),
  place: async (x, y) => log("place")(x, y),
  next: async () => log("next")(),
  pause: async (p) => log("pause")(p),
  end: async () => log("end")(),
  unlockSecret: (id) => log("unlockSecret")(id),
  openPause: (o) => log("openPause")(o),
  openRules: (o) => log("openRules")(o),
  setPosture: (p) => log("setPosture")(p),
  retryConnection: () => log("retryConnection")(),
  leave: () => log("leave")(),
};
