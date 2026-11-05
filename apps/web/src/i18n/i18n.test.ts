import { ERROR_CODES } from "@tint/protocol";
import { describe, expect, it } from "vitest";
import { errorMessages, messageFor } from "./errors";
import { pl } from "./pl";
import { plural } from "./plural";

const STONE = ["kamień", "kamienie", "kamieni"] as const;

describe("plural (pl)", () => {
  it.each([
    [0, "kamieni"],
    [1, "kamień"],
    [2, "kamienie"],
    [4, "kamienie"],
    [5, "kamieni"],
    [12, "kamieni"],
    [14, "kamieni"],
    [22, "kamienie"],
    [25, "kamieni"],
    [104, "kamienie"],
  ])("%i → %s", (n, form) => {
    expect(plural(n, STONE)).toBe(form);
  });
});

describe("copy", () => {
  it("has a Polish message for every protocol error code", () => {
    for (const code of ERROR_CODES) expect(errorMessages[code]).toBeTruthy();
    expect(messageFor("SOMETHING_NEW")).toBe(errorMessages.INTERNAL);
  });

  it("formats the design's strings", () => {
    expect(pl.reveal.stonesHome(4)).toBe("4 kamienie w domu");
    expect(pl.setup.rounds(6)).toBe("6 rund");
    expect(pl.round.header(3, 6)).toBe("Runda 3 z 6");
  });
});
