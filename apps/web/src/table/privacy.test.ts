import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

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
});
