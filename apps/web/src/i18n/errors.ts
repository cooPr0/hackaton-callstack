import type { ErrorCode } from "@tint/protocol";

/** Server error codes → short Polish messages for toasts. */
export const errorMessages: Record<ErrorCode, string> = {
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
};

export const NETWORK_ERROR = "Brak połączenia z serwerem.";

export function messageFor(code: string): string {
  return (errorMessages as Record<string, string>)[code] ?? errorMessages.INTERNAL;
}
