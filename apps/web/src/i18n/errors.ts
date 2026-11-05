import type { ErrorCode } from "@tint/protocol";
import { currentLang } from "./lang";
import type { Lang } from "./types";

/** Client-side codes on top of the protocol's ErrorCode. */
export type ClientErrorCode = "NETWORK" | "TIMEOUT" | "BAD_RESPONSE" | "NO_SEAT";

type Messages = Record<ErrorCode | ClientErrorCode, string>;

export const errorMessages: Record<Lang, Messages> = {
  pl: {
    PROTOCOL_MISMATCH: "Ta wersja gry jest nieaktualna. Odśwież stronę.",
    BAD_REQUEST: "Coś poszło nie tak z tym ruchem.",
    BAD_TOKEN: "Twoje miejsce w pokoju wygasło. Dołącz ponownie.",
    NOT_YOUR_TURN: "To jeszcze nie Twój ruch.",
    NOT_YOUR_SEAT: "To nie Twoje miejsce.",
    CELL_TAKEN: "Ta kratka jest zajęta.",
    INVALID_CLUE: "Ta podpowiedź nie pasuje do zasad.",
    COLOR_WORD: "Bez nazw kolorów!",
    WRONG_PHASE: "Gra jest już dalej. Spróbuj jeszcze raz.",
    PAUSED: "Gra jest zatrzymana.",
    RATE_LIMITED: "Za szybko. Chwila oddechu.",
    ROOM_FULL: "Pokój jest pełny.",
    ROOM_NOT_FOUND: "Nie ma takiego pokoju.",
    INTERNAL: "Błąd serwera. Spróbuj ponownie.",
    NETWORK: "Brak połączenia z serwerem.",
    TIMEOUT: "Serwer nie odpowiedział.",
    BAD_RESPONSE: "Serwer odpowiedział w nieznanym formacie.",
    NO_SEAT: "Nie masz miejsca w tym pokoju.",
  },
  en: {
    PROTOCOL_MISMATCH: "This version of the game is out of date. Refresh the page.",
    BAD_REQUEST: "Something went wrong with that move.",
    BAD_TOKEN: "Your seat in this room expired. Join again.",
    NOT_YOUR_TURN: "It's not your turn yet.",
    NOT_YOUR_SEAT: "That's not your seat.",
    CELL_TAKEN: "That cell is taken.",
    INVALID_CLUE: "That clue breaks the rules.",
    COLOR_WORD: "No colour names!",
    WRONG_PHASE: "The game has moved on. Try again.",
    PAUSED: "The game is paused.",
    RATE_LIMITED: "Too fast. Take a breath.",
    ROOM_FULL: "The room is full.",
    ROOM_NOT_FOUND: "No such room.",
    INTERNAL: "Server error. Try again.",
    NETWORK: "Can't reach the server.",
    TIMEOUT: "The server didn't respond.",
    BAD_RESPONSE: "The server sent an unexpected response.",
    NO_SEAT: "You don't have a seat in this room.",
  },
};

export function messageFor(code: string, lang: Lang = currentLang()): string {
  const m = errorMessages[lang] as Record<string, string>;
  return m[code] ?? m.INTERNAL ?? "";
}
