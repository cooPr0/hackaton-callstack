import { messageFor } from "../i18n/errors";

/** Any failure the UI may show. `code` is a protocol ErrorCode or a client code. */
export class ApiError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export const networkError = () => new ApiError("NETWORK", messageFor("NETWORK"));
export const fromCode = (code: string, status?: number) =>
  new ApiError(code, messageFor(code), status);

export function toApiError(e: unknown): ApiError {
  if (e instanceof ApiError) return e;
  return new ApiError("INTERNAL", messageFor("INTERNAL"));
}
