import type { ComponentType } from "react";
import type { ScreenId, ScreenProps } from "../app/types";
import { GrokSecretScreen } from "./GrokSecretScreen";
import { Placeholder } from "./Placeholder";
import { SecretScreen } from "./SecretScreen";

/**
 * ScreenId → component. Owned by Lane B (screens/table): replace each placeholder with the
 * real screen. Lane A only reads this map (RoomPage, /dev gallery).
 */
export const registry: Record<ScreenId, ComponentType<ScreenProps>> = {
  connecting: Placeholder,
  lobby: Placeholder,
  pass: Placeholder,
  secret: SecretScreen,
  "grok-secret": GrokSecretScreen,
  "handoff-fold": Placeholder,
  "handoff-unfold": Placeholder,
  table: Placeholder,
  "round-card": Placeholder,
  "game-over": Placeholder,
};
