import { describe, expect, it } from "vitest";
import { validateClue } from "./clue";

const COLOR_WORD = { ok: false, code: "COLOR_WORD" };
const INVALID = { ok: false, code: "INVALID_CLUE" };

describe("validateClue", () => {
  it.each([
    "czerwony",
    "Czerwonawego",
    "ZIELONKAWY",
    "niebieskich",
    "żółtko",
    "Złoty",
    "szary",
    "białe",
    "czarna",
    "fioletowa",
    "różowe",
    "reddish",
    "Blue",
    "greys",
    "turquoise",
    "kolorowy",
  ])("blocks color word %s", (w) => expect(validateClue(w, "SECRET_1")).toEqual(COLOR_WORD));

  it.each(["szarlotka", "białko", "rudera", "kremówka", "redwood", "Rosół", "Białystok", "burak"])(
    "allows %s",
    (w) => expect(validateClue(w, "SECRET_1")).toEqual({ ok: true, text: w }),
  );

  it("blocks a color word in either position of a two-word clue", () => {
    expect(validateClue("z zielonym", "SECRET_2")).toEqual(COLOR_WORD);
    expect(validateClue("z marchewką", "SECRET_2")).toEqual({ ok: true, text: "z marchewką" });
  });

  it("enforces word count, letters, single spaces and length", () => {
    expect(validateClue("rosół z", "SECRET_1")).toEqual(INVALID);
    expect(validateClue("a b c", "SECRET_2")).toEqual(INVALID);
    expect(validateClue("a1", "SECRET_1")).toEqual(INVALID);
    expect(validateClue("x-y", "SECRET_1")).toEqual(INVALID);
    expect(validateClue("rosół  z", "SECRET_2")).toEqual(INVALID);
    expect(validateClue("   ", "SECRET_1")).toEqual(INVALID);
    expect(validateClue("a".repeat(25), "SECRET_1")).toEqual(INVALID);
    expect(validateClue("  Rosół ", "SECRET_1")).toEqual({ ok: true, text: "Rosół" });
  });
});
