import type { ComponentType } from "react";
import type { ScreenId, ScreenProps } from "../app/types";
import { Placeholder } from "./Placeholder";

/**
 * ScreenId → component. Owned by Lane B (screens/table): replace each placeholder with the
 * real screen. Lane A only reads this map (RoomPage, /dev gallery).
 */
export const registry: Record<ScreenId, ComponentType<ScreenProps>> = {
  connecting: Placeholder,
  lobby: Placeholder,
  pass: Placeholder,
  secret: Placeholder,
  "grok-secret": Placeholder,
  "handoff-fold": Placeholder,
  "handoff-unfold": Placeholder,
  table: Placeholder,
  "round-card": Placeholder,
  "game-over": Placeholder,
};
