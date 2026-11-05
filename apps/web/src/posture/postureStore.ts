import { create } from "zustand";
import type { Posture } from "../app/types";

interface PostureOverrideState {
  /** null = follow the device / window shape. */
  override: Posture | null;
  setOverride(p: Posture | null): void;
}

export const usePostureOverride = create<PostureOverrideState>((set) => ({
  override: null,
  setOverride: (override) => set({ override }),
}));
