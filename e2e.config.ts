import { web } from "@e2e-dev/web";
import type { E2EConfig } from "e2e";

/** Live web. It talks to the game Worker; these tests do not start a dev server. */
const WEB = "https://tint-web.tint-server.workers.dev";

export default {
  tests: "tests/**/*.e2e.ts",
  timeout: 60_000,
  targets: [
    {
      engine: web(),
      app: { url: WEB },
    },
  ],
} satisfies E2EConfig;
