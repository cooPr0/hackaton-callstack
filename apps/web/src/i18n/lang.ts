import { createStore } from "zustand/vanilla";
import { LANGS, type Lang } from "./types";

const KEY = "tint:lang";

/** Browser language: Polish for pl-*, English otherwise. */
export function detectLang(
  languages: readonly string[] = globalThis.navigator?.languages ?? [],
): Lang {
  for (const l of languages) {
    const base = l.toLowerCase().split("-")[0];
    if (base === "pl") return "pl";
    if (base === "en") return "en";
  }
  return "en";
}

function stored(): Lang | null {
  try {
    const v = globalThis.localStorage?.getItem(KEY);
    return (LANGS as readonly string[]).includes(v ?? "") ? (v as Lang) : null;
  } catch {
    return null;
  }
}

function applyToDocument(lang: Lang) {
  if (typeof document !== "undefined") document.documentElement.lang = lang;
}

export const langStore = createStore<{ lang: Lang; setLang(l: Lang): void }>((set) => ({
  lang: stored() ?? detectLang(),
  setLang(lang) {
    try {
      globalThis.localStorage?.setItem(KEY, lang);
    } catch {
      /* per-viewer convenience only */
    }
    applyToDocument(lang);
    set({ lang });
  },
}));

applyToDocument(langStore.getState().lang);

export const currentLang = (): Lang => langStore.getState().lang;
