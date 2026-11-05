import { afterEach, describe, expect, it, vi } from "vitest";
import { chatJson, type JsonCall } from "./xai";

const call: JsonCall = {
  task: "guess",
  model: "grok-test",
  system: "s",
  user: "u",
  schemaName: "guess",
  schema: { type: "object" },
  deadlineMs: 50,
};
const reply = (content: unknown, status = 200) =>
  new Response(JSON.stringify({ choices: [{ message: { content } }] }), { status });

afterEach(() => vi.unstubAllGlobals());
vi.spyOn(console, "log").mockImplementation(() => {});

describe("chatJson", () => {
  it("returns null without a key and never calls the network", async () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    expect(await chatJson({}, call)).toBeNull();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("sends a strict json_schema request and parses the content", async () => {
    const fetch = vi.fn(async () => reply(JSON.stringify({ x: 3, y: 4 })));
    vi.stubGlobal("fetch", fetch);
    expect(await chatJson({ apiKey: "k" }, call)).toEqual({ x: 3, y: 4 });
    const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.x.ai/v1/chat/completions");
    expect((init.headers as Record<string, string>).authorization).toBe("Bearer k");
    const body = JSON.parse(init.body as string);
    expect(body.response_format.json_schema).toMatchObject({ name: "guess", strict: true });
  });

  it.each([
    ["non-200", async () => reply("{}", 500)],
    ["non-JSON content", async () => reply("not json")],
    ["missing content", async () => new Response(JSON.stringify({ choices: [] }))],
    ["network error", async () => Promise.reject(new TypeError("boom"))],
  ])("returns null on %s", async (_, impl) => {
    vi.stubGlobal("fetch", vi.fn(impl));
    expect(await chatJson({ apiKey: "k" }, call)).toBeNull();
  });

  it("gives up at the deadline", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        (_: string, init: RequestInit) =>
          new Promise((_, reject) =>
            init.signal?.addEventListener("abort", () => reject(init.signal?.reason)),
          ),
      ),
    );
    const t0 = Date.now();
    expect(await chatJson({ apiKey: "k" }, { ...call, deadlineMs: 30 })).toBeNull();
    expect(Date.now() - t0).toBeLessThan(1000);
  });
});
