import { afterEach, describe, expect, it, vi } from "vitest";
import { grokHint, hintPrompt, hintsAvailable } from "./hint";

afterEach(() => vi.unstubAllGlobals());
vi.spyOn(console, "log").mockImplementation(() => {});

const reply = (text: string, citations: unknown[] = [], sources: string[] = [], status = 200) =>
  new Response(
    JSON.stringify({
      output: [
        { type: "reasoning" },
        {
          type: "message",
          content: [
            {
              text: JSON.stringify({ text, citations }),
              annotations: sources.map((url) => ({ type: "url_citation", url })),
            },
          ],
        },
      ],
      usage: { server_side_tool_usage_details: { x_posts_fetched: 5 } },
    }),
    { status },
  );
const input: { words: string[]; draft: boolean; lang: "pl" | "en" } = {
  words: ["rosół"],
  draft: false,
  lang: "pl",
};
const yes = () => true;
const cite = { handle: "ola", url: "https://x.com/ola/status/111" };

describe("grokHint", () => {
  it("asks the Responses API with x_search over the clue words only", async () => {
    const fetch = vi.fn(async () =>
      reply("Rosół to niedzielny klasyk.", [cite], ["https://x.com/i/status/111"]),
    );
    vi.stubGlobal("fetch", fetch);
    const out = await grokHint({ XAI_API_KEY: "k" }, input, yes);
    expect(out).toEqual({ text: "Rosół to niedzielny klasyk.", citations: [cite] });
    const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.x.ai/v1/responses");
    const body = JSON.parse(String(init.body));
    expect(body.tools[0].type).toBe("x_search");
    expect(body.tools[0].from_date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(body.text.format.type).toBe("json_schema");
    expect(body.input[1].content).toContain('["rosół"]');
  });

  it("never puts coordinates or a target in the prompt", () => {
    const p = hintPrompt({ words: ["rosół"], draft: true, lang: "en" });
    expect(`${p.system}\n${p.user}`).not.toMatch(/\bx=|\by=|hex|#[0-9a-f]{6}|target/i);
  });

  it("drops invented citations and strips inline markers", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        reply(
          'Pachnie niedzielą. <grok type="render_inline_citation" citation_id="1" />',
          [cite, { handle: "x", url: "https://x.com/x/status/999" }],
          ["https://x.com/i/status/111"],
        ),
      ),
    );
    const out = await grokHint({ XAI_API_KEY: "k" }, input, yes);
    expect(out?.text).toBe("Pachnie niedzielą.");
    expect(out?.citations).toEqual([cite]);
  });

  it("retries once on a color word, then gives up", async () => {
    const fetch = vi.fn(async () => reply("To takie czerwone."));
    vi.stubGlobal("fetch", fetch);
    expect(await grokHint({ XAI_API_KEY: "k" }, input, yes)).toBeNull();
    expect(fetch).toHaveBeenCalledTimes(2);
    fetch
      .mockImplementationOnce(async () => reply("To takie czerwone."))
      .mockImplementationOnce(async () => reply("Pachnie niedzielą."));
    expect((await grokHint({ XAI_API_KEY: "k" }, input, yes))?.text).toBe("Pachnie niedzielą.");
  });

  it("stops when the room budget is spent", async () => {
    const fetch = vi.fn(async () => reply("ok"));
    vi.stubGlobal("fetch", fetch);
    expect(await grokHint({ XAI_API_KEY: "k" }, input, () => false)).toBeNull();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("returns null on HTTP errors and thrown fetches", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => reply("x", [], [], 500)),
    );
    expect(await grokHint({ XAI_API_KEY: "k" }, input, yes)).toBeNull();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("down");
      }),
    );
    expect(await grokHint({ XAI_API_KEY: "k" }, input, yes)).toBeNull();
  });

  it("never calls the network without a key or when switched off", async () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    expect(hintsAvailable({})).toBe(false);
    expect(hintsAvailable({ XAI_API_KEY: "k", XAI_HINTS: "off" })).toBe(false);
    expect(await grokHint({}, input, yes)).toBeNull();
    expect(await grokHint({ XAI_API_KEY: "k", XAI_HINTS: "off" }, input, yes)).toBeNull();
    expect(fetch).not.toHaveBeenCalled();
  });
});
