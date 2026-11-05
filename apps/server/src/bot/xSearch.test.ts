import { describe, expect, it } from "vitest";
import { searchWindow, stripRenderTags, verifiedCitations } from "./xSearch";

describe("searchWindow", () => {
  it("spans the last 7 days up to tomorrow (UTC)", () => {
    expect(searchWindow(Date.UTC(2026, 10, 5, 12))).toEqual({
      from_date: "2026-10-29",
      to_date: "2026-11-06",
    });
  });
});

describe("verifiedCitations", () => {
  const real = [
    "https://x.com/i/status/111",
    "https://x.com/i/status/222",
    "https://x.com/i/status/333",
  ];
  const c = (handle: string, id: string, host = "x.com") => ({
    handle,
    url: `https://${host}/${handle}/status/${id}`,
  });

  it("keeps only posts the search really returned, max 2, no duplicates", () => {
    const out = verifiedCitations(
      [c("ola", "111"), c("ola", "111"), c("kuba", "999"), c("ewa", "222"), c("piotr", "333")],
      real,
    );
    expect(out.map((x) => x.url)).toEqual([
      "https://x.com/ola/status/111",
      "https://x.com/ewa/status/222",
    ]);
  });

  it('accepts handles the model wrote as "@name"', () => {
    const out = verifiedCitations([{ handle: "@ola", url: "https://x.com/ola/status/111" }], real);
    expect(out).toEqual([{ handle: "ola", url: "https://x.com/ola/status/111" }]);
  });

  it("drops links off x.com / twitter.com and malformed entries", () => {
    const out = verifiedCitations(
      [c("ola", "111", "evil.com"), { handle: "ola" }, "nope", c("ewa", "222", "twitter.com")],
      real,
    );
    expect(out).toHaveLength(1);
    expect(out[0]?.url).toContain("twitter.com");
    expect(verifiedCitations(undefined, real)).toEqual([]);
  });
});

describe("stripRenderTags", () => {
  it("removes xAI's inline citation markers", () => {
    expect(
      stripRenderTags(
        'Rosół to klasyk. <grok type="render_inline_citation" citation_id="7" /> Smacznego.',
      ),
    ).toBe("Rosół to klasyk. Smacznego.");
    expect(stripRenderTags("A <grok x>zbędne</grok> b")).toBe("A b");
  });
});
