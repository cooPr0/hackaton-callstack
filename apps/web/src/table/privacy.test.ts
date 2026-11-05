import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { publicView } from "../app/publicView";
import { fixture, viewFixtures } from "../dev/fixtures";
import { revealTargetOf, stoneBadges } from "./reveal";

/**
 * PRIVACY guard: the table is the shared, public surface. It must only render the public
 * view and never read `secret` (ScreenHost strips it, this keeps it from creeping back).
 */
describe("table privacy", () => {
  const dir = fileURLToPath(new URL(".", import.meta.url));
  const sources = readdirSync(dir).filter((f) => f.endsWith(".tsx") || f.endsWith(".ts"));

  it.each(sources.filter((f) => !f.endsWith(".test.ts")))("%s never reads view.secret", (f) => {
    const src = readFileSync(`${dir}/${f}`, "utf8");
    expect(src).not.toMatch(/\.secret\b/);
  });

  it("the reveal layer only knows a target in REVEAL, from the public reveal block", () => {
    for (const [name, view] of Object.entries(viewFixtures)) {
      const target = revealTargetOf(view);
      if (view.phase === "REVEAL") expect(target, name).toEqual(view.reveal?.target);
      else expect(target, name).toBeNull();
    }
  });

  it("a local device holding the secret still draws no target before REVEAL", () => {
    const local = fixture("local-guess1");
    expect(local.secret).toBeDefined();
    expect(revealTargetOf(local)).toBeNull();
    expect(stoneBadges(local).size).toBe(0);
    expect(revealTargetOf(publicView(local))).toBeNull();
  });
});
