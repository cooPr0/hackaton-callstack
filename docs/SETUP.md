# Setup: manual steps

What you do by hand to run Tint & Tell locally and in production.

## 1. One-time machine setup

```bash
node -v                      # must be ≥ 22
corepack enable              # or put ~/Library/pnpm/bin on PATH if pnpm is "not found"
pnpm install                 # from the repo root
```

## 2. Run locally

```bash
cp apps/server/.dev.vars.example apps/server/.dev.vars   # XAI_API_KEY may stay empty
cp apps/web/.env.example apps/web/.env.local             # VITE_API_URL=http://localhost:8787

pnpm --filter @tint/server dev    # terminal 1: server on :8787
pnpm --filter @tint/web dev       # terminal 2: web on :5173
```

Open http://localhost:5173. An empty `XAI_API_KEY` is fine: Grok plays as the fallback bot.

**Testing from a phone on the same Wi-Fi**: find your LAN IP (`ipconfig getifaddr en0`), then
- in `apps/server/.dev.vars`: `ALLOWED_ORIGINS=http://localhost:5173,http://<LAN-IP>:5173`
- in `apps/web/.env.local`: `VITE_API_URL=http://<LAN-IP>:8787`
- restart both, run the web app with `pnpm --filter @tint/web dev --host`, open `http://<LAN-IP>:5173` on the phone.

**Check the server works** (it plays real games and runs attacks over WebSockets):
```bash
pnpm --filter @tint/server dev --var TURN_TIMEOUT_MS:1500   # terminal 1
pnpm --filter @tint/server e2e                                # terminal 2, must end with no ✘
```

## 3. Deploy the server (Cloudflare Worker)

```bash
pnpm --filter @tint/server exec wrangler login
pnpm --filter @tint/server exec wrangler secret put XAI_API_KEY   # optional for now, see §5
pnpm --filter @tint/server deploy
```

Note the printed URL (`https://tint-server.<sub>.workers.dev`) and post it in `#web-server`.
Check it: `BASE=https://tint-server.<sub>.workers.dev pnpm --filter @tint/server e2e`.

## 4. Deploy the web app (Cloudflare Pages)

```bash
pnpm --filter @tint/server exec wrangler pages project create tint-and-tell   # first time only
VITE_API_URL=https://tint-server.<sub>.workers.dev pnpm --filter @tint/web build
pnpm --filter @tint/server exec wrangler pages deploy ../web/dist --project-name tint-and-tell
```

The site is at https://tint-and-tell.pages.dev. That origin and its preview subdomains are
already allowed in `apps/server/wrangler.toml` (`ALLOWED_ORIGINS`). If you use another domain,
add it there and redeploy the server.

## 5. Not wired up yet (needs code first)

| Piece | State | Manual step once the code lands |
|---|---|---|
| Real Grok (xAI) | Server uses only the fallback bot. `XAI_MODEL` is empty in `wrangler.toml` | Confirm the model id on docs.x.ai, set `XAI_MODEL`, `wrangler secret put XAI_API_KEY` |
| Playtest cron → Discord | `apps/playtester-worker` is an empty package | Create a Discord webhook for `#playtest-bot`, then `wrangler secret put DISCORD_WEBHOOK_URL` and `PLAYTEST_TRIGGER_SECRET` |
| iOS → prod server | No `Config/*.xcconfig` yet | Set `API_HOST=tint-server.<sub>.workers.dev`, `API_SCHEME=https` |

## 6. Repo housekeeping

- Delete the merged/stale branches: `git push origin --delete backend p1/server-room`.
- Never commit `.dev.vars` or `.env.local`; they are gitignored.
