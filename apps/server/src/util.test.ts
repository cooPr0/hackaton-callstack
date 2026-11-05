import { describe, expect, it } from "vitest";
import { originAllowed } from "./util";

const LIST =
  "https://tint-and-tell.pages.dev, https://*.tint-and-tell.pages.dev,http://localhost:5173";

describe("originAllowed", () => {
  it.each([
    "https://tint-and-tell.pages.dev",
    "https://3f2a1b.tint-and-tell.pages.dev",
    "https://p2-net-store.tint-and-tell.pages.dev",
    "http://localhost:5173",
  ])("allows %s", (o) => expect(originAllowed(o, LIST)).toBe(true));

  it.each([
    "https://evil.com",
    "http://tint-and-tell.pages.dev",
    "https://a.b.tint-and-tell.pages.dev",
    "https://tint-and-tell.pages.dev.evil.com",
    "https://eviltint-and-tell.pages.dev",
    "https://.tint-and-tell.pages.dev",
    "http://localhost:5174",
    "null",
  ])("refuses %s", (o) => expect(originAllowed(o, LIST)).toBe(false));
});
