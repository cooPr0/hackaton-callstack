# Brief P2: Web client

**Role**: the full web client: setup, lobby, private ("closed") screens, the shared table, reveal, and fold emulation. It must play with iOS players in the same room.

**Owns**: `apps/web` only.
**Reads**:
- `CLAUDE.md`, `docs/PROTOCOL.md`, `docs/RULES.md`, `design/Tint-and-Tell.pdf` (screens on p.3–4, colors on p.2, logo on p.5–6)
- `packages/protocol` (import `@tint/protocol`: types, zod, constants)
- `shared/palette.json`
- `shared/fixtures/views/*.json`

**Pre-installed**: react 19, react-dom, react-router, zustand, motion, qrcode, vite, @vitejs/plugin-react, vitest.

## Branches (in order; one PR each; commit every small step)

### 1. `p2/scaffold`
- `vite.config.ts`, `index.html`, `tsconfig.json` (extends base, `lib: DOM`, `jsx: react-jsx`), and the `dev`, `build`, `typecheck`, `test` scripts.
- Routes: `/` (setup), `/join/:code`, `/room/:code`, `/dev`.
- `src/theme/tokens.css`: Cold Steel `#F8F7F4`, Cocoa Spice `#191815`, gold `#E9B005`, dark via `prefers-color-scheme` plus a `data-theme` override.
- A display font: an OFL wide grotesk stand-in, e.g. Archivo Expanded ExtraBold from Google Fonts.
- The logo "Dwa T" as inline SVG (two T's, the right one rotated 180°).
- Done when: `pnpm --filter @tint/web dev` shows all routes.

### 2. `p2/dev-gallery`
- `/dev` loads every `shared/fixtures/views/*.json` (`import.meta.glob`) and renders each through the **real** screen router, side by side, with a posture toggle.
- Done when: all 10 fixtures render. This lets you build every screen before the server exists.

### 3. `p2/net-store`
- `src/net/api.ts`: create, join and health, using `VITE_API_URL` (from `.env.local`; commit `.env.example`).
- `src/net/socket.ts`: WS with `wsPath()`, a `cid` per message (`crypto.randomUUID()`), pending-ack map, 0.5 → 8 s backoff reconnect, `seq` filtering, ping every 20 s, every inbound message parsed with `ServerMessage`.
- `src/store/game.ts` (Zustand): `view`, `connection`, `pending`, `lastError`, `botStatus`, `botLine`, plus the intents `createRoom / join / start / submitClue / place / next / pause`.
- Tokens are stored in `localStorage` under `tint:room:<CODE>`.
- Done when: the lobby connects to local `wrangler dev` (P1 branch 2) or the deployed URL.

### 4. `p2/setup-lobby`
- Setup: 3 mode tiles as in the PDF (Stół / Ty podpowiadasz / Grok podpowiada), player chips + "Dodaj", a rounds picker, local vs online, and "Losuj odcień dla …".
- Lobby: seats with platform icons, the big room code, a QR (`qrcode`) of `${origin}/join/CODE`, an "Otwórz w aplikacji" link `tintandtell://join/CODE`, and a start button for the host.
- Join page: name input, then join.
- Done when: 2 browser tabs end up in the same room.

### 5. `p2/closed-screens`
- `src/posture/usePosture.ts`: `matchMedia('(horizontal-viewport-segments: 2)')` → landscape ≥ 900 px → a manual `F` key / floating "Złóż / Rozłóż" pill.
- Screens:
  - `Viewfinder` (7 × 9 from `secret.window`, corner brackets on the target, stone copies in SECRET_2, **no coordinates**)
  - `ClueEntry` (huge display type, inline validation: 1 word / 1–2 words, show `COLOR_WORD` errors)
  - `RoundCard` (the target swatch + clues, e.g. "Rosół, z marchewką", then "Podaj ‹next›")
  - `GrokSecretCard` (card back with a seal, no color)
  - `HandOff`
  - `PauseSheet`
- Router: `(phase, posture, role, local)` → screen. Local mode: show `secret` only when closed.

### 6. `p2/table` ⏰ **T+1:15 gate: a full online round vs Grok + 2 `pnpm playtest fill` bots**
- `Board`: CSS grid 24 × 12 from `palette.json`, with a wider gap between x 11 and 12 (the hinge).
- `Stones`: player initials; Grok is a black dot.
- `EdgeBar` × 2: bottom, plus top rotated 180°. Each shows the clue, scores, turn indicator and Grok's `bot.say` line, with pause on the hinge.
- Placement: hover highlight, click to select, confirm → `stone.place`. Show `CELL_TAKEN` / `NOT_YOUR_TURN` errors.

### 7. `p2/reveal`
- `RevealOverlay`: cells outside 5 × 5 fade (towards Cocoa Spice in dark mode), the 3 × 3 and 5 × 5 rings, "+3/+2/+1" badges by the stones, and Grok's `botLine`.
- Game-over screen with history cards.

### 8. `p2/unfold-polish`
- Motion "unfold": the viewfinder closes into a seal (0–180 ms), the board halves spring out from the hinge (220–520 ms, spring 0.5 s), and the clue writes on both edges (560–760 ms). `prefers-reduced-motion` → a 200 ms crossfade.
- Deploy to Cloudflare Pages (`tint-and-tell`) with `VITE_API_URL` = the prod server. Post the URL in `#web-server`.

## Notes
- Never compute scores or rules: render `view`.
- For solo testing, use `pnpm playtest fill <CODE> --count 2 --env local` once P1 ships branch 4.
- Chrome DevTools → device toolbar → foldable devices, to test posture.
