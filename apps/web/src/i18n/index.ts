import { useStore } from "zustand";
import { en } from "./en";
import { currentLang, langStore } from "./lang";
import { pl } from "./pl";
import type { Copy, Lang } from "./types";

export const copies: Record<Lang, Copy> = { pl, en };

/** Copy for the current language (non-React callers). */
export const getCopy = (): Copy => copies[currentLang()];

/** Copy for the current language; re-renders when the language changes. */
export function useCopy(): Copy {
  return copies[useStore(langStore, (s) => s.lang)];
}

export function useLang() {
  const lang = useStore(langStore, (s) => s.lang);
  const setLang = useStore(langStore, (s) => s.setLang);
  return { lang, setLang };
}

export type { Copy, Lang };
