import type { WSFactory, WSLike } from "./socket";

/** In-memory WebSocket for tests: inspect `sent`, drive `open()`, `receive()`, `drop()`. */
export class FakeSocket implements WSLike {
  readyState = 0;
  sent: Record<string, unknown>[] = [];
  onopen: WSLike["onopen"] = null;
  onmessage: WSLike["onmessage"] = null;
  onclose: WSLike["onclose"] = null;
  onerror: WSLike["onerror"] = null;
  constructor(readonly url: string) {}
  send(data: string) {
    this.sent.push(JSON.parse(data));
  }
  close(code = 1000) {
    this.readyState = 3;
    this.onclose?.({ code });
  }
  open() {
    this.readyState = 1;
    this.onopen?.({});
  }
  receive(msg: unknown) {
    this.onmessage?.({ data: JSON.stringify(msg) });
  }
  drop(code = 1006) {
    this.readyState = 3;
    this.onclose?.({ code });
  }
  last(type: string) {
    return [...this.sent].reverse().find((m) => m.type === type);
  }
}

export function fakeFactory() {
  const sockets: FakeSocket[] = [];
  const create: WSFactory = (url) => {
    const s = new FakeSocket(url);
    sockets.push(s);
    return s;
  };
  return { create, sockets, current: () => sockets[sockets.length - 1] as FakeSocket };
}
