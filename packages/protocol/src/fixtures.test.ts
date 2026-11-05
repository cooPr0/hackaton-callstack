import { describe, expect, it } from "vitest";
import { loadFixtures, schemaFor, secretLeak } from "../scripts/fixtures";
import { PlayerView } from "./view";

const fixtures = loadFixtures();

describe("shared/fixtures", () => {
  it("exist", () => {
    expect(fixtures.length).toBeGreaterThan(20);
  });

  it.each(fixtures.map((f) => [`${f.dir}/${f.file}`, f] as const))(
    "%s matches its schema",
    (_, f) => {
      const res = schemaFor(f.dir, f.file).safeParse(f.data);
      expect(res.error?.message).toBeUndefined();
    },
  );

  it.each(fixtures.filter((f) => f.dir === "views").map((f) => [f.file, f] as const))(
    "%s does not leak the secret",
    (_, f) => {
      expect(secretLeak(PlayerView.parse(f.data))).toBe(false);
    },
  );

  it("secretLeak catches a guesser view with a secret", () => {
    const guess1 = fixtures.find((f) => f.file === "guess1.json");
    const leaked = {
      ...PlayerView.parse(guess1?.data),
      secret: { target: { x: 0, y: 0 }, window: { x0: 0, y0: 0, w: 7, h: 9 } },
    };
    expect(secretLeak(PlayerView.parse(leaked))).toBe(true);
  });
});
