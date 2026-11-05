import { CreateRoomRequest, JoinRoomRequest, PROTOCOL_VERSION, RoomCode } from "@tint/protocol";
import type { z } from "zod";
import { CLOSE, httpError, newCode, originAllowed, refuseSocket } from "./util";

export { Room } from "./room";

const VERSION = "0.1.0";
const MAX_BODY = 4096;
const CODE_ATTEMPTS = 3;

export default {
  async fetch(req, env): Promise<Response> {
    // Origin is browser hygiene, not auth: native iOS sends none (allowed). Seat tokens are the auth.
    const origin = req.headers.get("Origin");
    const allowed = origin === null || originAllowed(origin, env.ALLOWED_ORIGINS);
    if (!allowed) return httpError(403, "BAD_REQUEST", "origin not allowed");
    const cors: Record<string, string> = origin
      ? { "Access-Control-Allow-Origin": origin, Vary: "Origin" }
      : {};
    if (req.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          ...cors,
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "content-type",
          "Access-Control-Max-Age": "86400",
        },
      });
    }
    let res: Response;
    try {
      res = await route(req, env);
    } catch (e) {
      console.error("unhandled", e);
      res = httpError(500, "INTERNAL", "internal error");
    }
    if (res.status === 101 || !origin) return res;
    const out = new Response(res.body, res);
    for (const [k, v] of Object.entries(cors)) out.headers.set(k, v);
    return out;
  },
} satisfies ExportedHandler<Env>;

async function route(req: Request, env: Env): Promise<Response> {
  const { pathname } = new URL(req.url);
  const ip = req.headers.get("CF-Connecting-IP") ?? "unknown";
  const limited = async (rl: RateLimit) => !(await rl.limit({ key: ip })).success;
  const stub = (code: string) => env.ROOMS.get(env.ROOMS.idFromName(code));

  if (pathname === "/api/health" && req.method === "GET") {
    return Response.json({ ok: true, version: VERSION, protocol: PROTOCOL_VERSION });
  }

  if (pathname === "/api/rooms" && req.method === "POST") {
    if (await limited(env.CREATE_LIMIT))
      return httpError(429, "RATE_LIMITED", "too many rooms, wait a minute");
    const body = await readJson(req, CreateRoomRequest);
    if (!body.ok) return body.res;
    for (let i = 0; i < CODE_ATTEMPTS; i++) {
      const code = newCode();
      const r = await stub(code).init(code, body.data);
      if (r.ok) return Response.json({ code, seats: r.seats });
      if (!r.collision) return httpError(r.status, r.code, r.message);
    }
    return httpError(503, "INTERNAL", "no free room code, retry");
  }

  const m = pathname.match(/^\/api\/rooms\/([^/]+)\/(join|ws)$/);
  if (!m) return httpError(404, "BAD_REQUEST", "not found");
  const code = (m[1] ?? "").toUpperCase();
  // Validate before idFromName so garbage never instantiates a Durable Object.
  if (!RoomCode.safeParse(code).success) {
    return m[2] === "ws" && req.headers.get("Upgrade")?.toLowerCase() === "websocket"
      ? refuseSocket(CLOSE.ROOM_NOT_FOUND, "ROOM_NOT_FOUND", "unknown room")
      : httpError(404, "ROOM_NOT_FOUND", "unknown room");
  }

  if (m[2] === "join" && req.method === "POST") {
    if (await limited(env.JOIN_LIMIT))
      return httpError(429, "RATE_LIMITED", "too many joins, wait a minute");
    const body = await readJson(req, JoinRoomRequest);
    if (!body.ok) return body.res;
    const r = await stub(code).join(body.data.name, body.data.platform);
    return r.ok
      ? Response.json({ seatId: r.seatId, token: r.token })
      : httpError(r.status, r.code, r.message);
  }

  if (m[2] === "ws" && req.method === "GET") {
    if (await limited(env.WS_LIMIT)) return httpError(429, "RATE_LIMITED", "too many connections");
    if (req.headers.get("Upgrade")?.toLowerCase() !== "websocket") {
      return httpError(426, "BAD_REQUEST", "expected a websocket upgrade");
    }
    return stub(code).fetch(req); // the original request: rebuilding it would drop the upgrade headers
  }

  return httpError(405, "BAD_REQUEST", "method not allowed");
}

/** Bodies are tiny. Require a declared length ≤ 4 KB, then validate with zod. */
async function readJson<S extends z.ZodType>(
  req: Request,
  schema: S,
): Promise<{ ok: true; data: z.output<S> } | { ok: false; res: Response }> {
  const len = Number(req.headers.get("content-length"));
  if (!len) return { ok: false, res: httpError(411, "BAD_REQUEST", "content-length required") };
  if (len > MAX_BODY) return { ok: false, res: httpError(413, "BAD_REQUEST", "body too large") };
  let json: unknown;
  try {
    json = JSON.parse(await req.text());
  } catch {
    return { ok: false, res: httpError(400, "BAD_REQUEST", "invalid JSON") };
  }
  const r = schema.safeParse(json);
  if (!r.success) {
    const issue = r.error.issues[0];
    return {
      ok: false,
      res: httpError(400, "BAD_REQUEST", `${issue?.path.join(".") || "body"}: ${issue?.message}`),
    };
  }
  return { ok: true, data: r.data };
}
