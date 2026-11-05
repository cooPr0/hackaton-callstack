/**
 * Minimal xAI Chat Completions client for structured JSON. It never throws: `null` means
 * "use the fallback", so a slow, down or misbehaving model can't stall a room.
 * One JSON log line per call ({xai, model, ms, status, ok}) for `wrangler tail`.
 */
export const XAI_BASE_URL = "https://api.x.ai/v1";

export interface XaiConfig {
  apiKey?: string;
  /** Override for tests and local mocks only (wrangler var XAI_BASE_URL). */
  baseUrl?: string;
}

export interface JsonCall {
  /** Log label: guess, clue, defend… */
  task: string;
  model: string;
  system: string;
  user: string;
  schemaName: string;
  schema: Record<string, unknown>;
  deadlineMs: number;
  maxTokens?: number;
}

export async function chatJson(cfg: XaiConfig, call: JsonCall): Promise<unknown | null> {
  if (!cfg.apiKey || !call.model) return null;
  const t0 = Date.now();
  let status = 0;
  let ok = false;
  try {
    const res = await fetch(`${cfg.baseUrl || XAI_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: { authorization: `Bearer ${cfg.apiKey}`, "content-type": "application/json" },
      body: JSON.stringify({
        model: call.model,
        max_tokens: call.maxTokens ?? 300,
        temperature: 0.8,
        messages: [
          { role: "system", content: call.system },
          { role: "user", content: call.user },
        ],
        response_format: {
          type: "json_schema",
          json_schema: { name: call.schemaName, schema: call.schema, strict: true },
        },
      }),
      signal: AbortSignal.timeout(call.deadlineMs),
    });
    status = res.status;
    if (!res.ok) return null;
    const body = (await res.json()) as { choices?: { message?: { content?: unknown } }[] };
    const content = body.choices?.[0]?.message?.content;
    if (typeof content !== "string") return null;
    const out: unknown = JSON.parse(content);
    ok = true;
    return out;
  } catch {
    return null; // timeout, network, bad JSON: the caller falls back
  } finally {
    console.log(
      JSON.stringify({ xai: call.task, model: call.model, ms: Date.now() - t0, status, ok }),
    );
  }
}
