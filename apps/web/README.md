# Tint & Tell — web

The browser client. It plays in the same room as the iOS app.

## Dev

```bash
cp apps/web/.env.example apps/web/.env.local   # VITE_API_URL=http://localhost:8787
pnpm --filter @tint/server dev                 # API + WebSocket on :8787
pnpm --filter @tint/web dev                    # Vite on :5173
```

`VITE_API_URL` is the server base (no trailing slash). The socket URL is the same host with `http` turned into `ws`. If the variable is unset, the client uses this page's host on port 8787.

Routes: `/` (new game), `/join/:code`, `/room/:code`, `/dev` (every fixture).

## Production

Pages project: `tint-and-tell` (`https://tint-and-tell.pages.dev`).

```bash
cp apps/web/.env.production.example apps/web/.env.production
# Set VITE_API_URL to the deployed Worker (https://tint-server.<account>.workers.dev)
pnpm --filter @tint/web deploy
```

`deploy` builds `dist`, then `wrangler pages deploy dist --project-name tint-and-tell`. Wrangler has to be logged in (`wrangler login`). The server's `ALLOWED_ORIGINS` already includes the Pages host and its preview subdomains.

`.env.production` is a public URL, not a secret. Do not put `XAI_API_KEY` or room tokens in the client.
