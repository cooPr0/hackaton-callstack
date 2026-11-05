import {
  type CreateRoomRequest,
  CreateRoomResponse,
  HealthResponse,
  HttpError,
  type JoinRoomRequest,
  JoinRoomResponse,
} from "@tint/protocol";
import type { z } from "zod";
import { ApiError, fromCode, networkError } from "./errors";

type Fetch = typeof fetch;
const TIMEOUT_MS = 8_000;

/** HTTP client for the game server. Every response is validated against the protocol schema. */
export function createApi(base: string, fetchImpl: Fetch = (...a) => fetch(...a)) {
  async function request<S extends z.ZodType>(
    schema: S,
    path: string,
    body?: unknown,
  ): Promise<z.infer<S>> {
    let res: Response;
    try {
      res = await fetchImpl(`${base}${path}`, {
        method: body === undefined ? "GET" : "POST",
        headers: body === undefined ? undefined : { "content-type": "application/json" },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    } catch {
      throw networkError();
    }
    const json: unknown = await res.json().catch(() => null);
    if (!res.ok) {
      const err = HttpError.safeParse(json);
      throw fromCode(err.success ? err.data.code : "INTERNAL", res.status);
    }
    const parsed = schema.safeParse(json);
    if (!parsed.success)
      throw new ApiError("BAD_RESPONSE", "Serwer odpowiedział w nieznanym formacie.", res.status);
    return parsed.data;
  }

  return {
    health: () => request(HealthResponse, "/api/health"),
    createRoom: (req: CreateRoomRequest) => request(CreateRoomResponse, "/api/rooms", req),
    joinRoom: (code: string, req: JoinRoomRequest) =>
      request(JoinRoomResponse, `/api/rooms/${encodeURIComponent(code)}/join`, req),
  };
}

export type Api = ReturnType<typeof createApi>;
