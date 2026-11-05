import type { PlayerView, ServerMessage } from "@tint/protocol";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { isDemoRoom, MockConnection } from "./mock";

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("MockConnection", () => {
  it("plays a scripted local round end to end", async () => {
    const views: PlayerView[] = [];
    const lines: string[] = [];
    const m = new MockConnection(
      {
        onMessage: (msg: ServerMessage) => {
          if (msg.type === "view") views.push(msg.view);
          if (msg.type === "bot.say") lines.push(msg.text);
        },
        onStatus: () => {},
      },
      0,
    );
    const tick = async (ms = 1) => {
      await vi.advanceTimersByTimeAsync(ms);
    };
    const phase = () => views.at(-1)?.phase;

    m.connect();
    await tick();
    expect(phase()).toBe("LOBBY");

    const run = async (p: Promise<void>, ms = 1) => {
      await tick(ms);
      await p;
    };
    await run(m.send({ type: "game.start" }));
    expect(phase()).toBe("SECRET_1");
    await run(m.send({ type: "clue.submit", seatId: "s1", text: "Rosół" }));
    expect(views.at(-1)).toMatchObject({ phase: "GUESS_1", clues: ["Rosół"], turnSeatId: "s3" });
    await tick(1300);
    expect(views.at(-1)?.turnSeatId).toBe("s2");
    expect(lines).toHaveLength(1);

    await expect(m.send({ type: "stone.place", seatId: "s2", x: 6, y: 6 })).rejects.toMatchObject({
      code: "CELL_TAKEN",
    });
    await run(m.send({ type: "stone.place", seatId: "s2", x: 3, y: 3 }));
    expect(phase()).toBe("SECRET_2");
    await run(m.send({ type: "clue.submit", seatId: "s1", text: "z marchewką" }));
    await tick(1300);
    await run(m.send({ type: "stone.place", seatId: "s2", x: 4, y: 4 }));
    expect(views.at(-1)).toMatchObject({ phase: "REVEAL", clues: ["Rosół", "z marchewką"] });
    await run(m.send({ type: "round.next" }));
    expect(phase()).toBe("GAME_OVER");
  });

  it("recognises demo room codes", () => {
    expect(isDemoRoom("DEMO1")).toBe(true);
    expect(isDemoRoom("K7PQX")).toBe(false);
  });
});
