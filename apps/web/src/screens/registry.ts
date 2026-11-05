import type { ComponentType } from "react";
import type { ScreenId, ScreenProps } from "../app/types";
import { ConnectingScreen } from "./ConnectingScreen";
import { GameOverScreen } from "./GameOverScreen";
import { GrokSecretScreen } from "./GrokSecretScreen";
import { HandoffFoldScreen, HandoffUnfoldScreen, PassScreen } from "./HandoffScreens";
import { LobbyScreen } from "./LobbyScreen";
import { Placeholder } from "./Placeholder";
import { RoundCardScreen } from "./RoundCardScreen";
import { SecretScreen } from "./SecretScreen";

/**
 * ScreenId → component. Owned by Lane B (screens/table): replace each placeholder with the
 * real screen. Lane A only reads this map (RoomPage, /dev gallery).
 */
export const registry: Record<ScreenId, ComponentType<ScreenProps>> = {
  connecting: ConnectingScreen,
  lobby: LobbyScreen,
  pass: PassScreen,
  secret: SecretScreen,
  "grok-secret": GrokSecretScreen,
  "handoff-fold": HandoffFoldScreen,
  "handoff-unfold": HandoffUnfoldScreen,
  table: Placeholder,
  "round-card": RoundCardScreen,
  "game-over": GameOverScreen,
};
