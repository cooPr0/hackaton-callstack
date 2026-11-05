import { ERROR_CODES } from "@tint/protocol";
import { describe, expect, it, vi } from "vitest";
import { copies } from ".";
import { errorMessages, messageFor } from "./errors";
import { detectLang, langStore, setShownLang } from "./lang";
import { pl } from "./pl";
import { plural } from "./plural";

const STONE = ["kamień", "kamienie", "kamieni"] as const;

/** Every key path in an object (functions and arrays are leaves). */
function keys(o: unknown, prefix = ""): string[] {
  if (typeof o !== "object" || o === null || Array.isArray(o)) return [prefix];
  return Object.entries(o).flatMap(([k, v]) => keys(v, prefix ? `${prefix}.${k}` : k));
}

describe("plural (pl)", () => {
  it.each([
    [0, "kamieni"],
    [1, "kamień"],
    [2, "kamienie"],
    [4, "kamienie"],
    [5, "kamieni"],
    [12, "kamieni"],
    [14, "kamieni"],
    [22, "kamienie"],
    [25, "kamieni"],
    [104, "kamienie"],
  ])("%i → %s", (n, form) => {
    expect(plural(n, STONE)).toBe(form);
  });
});

describe("copy", () => {
  it("English mirrors every Polish key", () => {
    expect(keys(copies.en).sort()).toEqual(keys(pl).sort());
    expect(copies.en.rules.items).toHaveLength(pl.rules.items.length);
  });

  it("has a message for every protocol error code in both languages", () => {
    for (const lang of ["pl", "en"] as const) {
      for (const code of ERROR_CODES) expect(errorMessages[lang][code]).toBeTruthy();
    }
    expect(messageFor("SOMETHING_NEW", "en")).toBe(errorMessages.en.INTERNAL);
    expect(messageFor("CELL_TAKEN", "pl")).toBe("Ta kratka jest zajęta.");
    expect(messageFor("CELL_TAKEN", "en")).toBe("That cell is taken.");
  });

  it("formats the design's strings", () => {
    expect(pl.reveal.stonesHome(4)).toBe("4 kamienie w domu");
    expect(copies.en.reveal.stonesHome(1)).toBe("1 stone home");
    expect(pl.setup.rounds(6)).toBe("6 rund");
    expect(copies.en.round.header(3, 6)).toBe("Round 3 of 6");
  });
});

describe("setShownLang", () => {
  it("switches the copy without saving the preference", () => {
    const saved = new Map<string, string>();
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => saved.get(key) ?? null,
      setItem: (key: string, value: string) => saved.set(key, value),
    });
    langStore.getState().setLang("en");
    const previous = setShownLang("pl");
    expect(previous).toBe("en");
    expect(langStore.getState().lang).toBe("pl");
    expect(saved.get("tint:lang")).toBe("en");
    setShownLang(previous);
    expect(langStore.getState().lang).toBe("en");
    langStore.setState({ lang: "pl" });
    vi.unstubAllGlobals();
  });
});

describe("detectLang", () => {
  it("picks Polish for pl-*, English otherwise", () => {
    expect(detectLang(["pl-PL", "en"])).toBe("pl");
    expect(detectLang(["de-DE", "en-GB"])).toBe("en");
    expect(detectLang(["fr"])).toBe("en");
    expect(detectLang([])).toBe("en");
  });
});
