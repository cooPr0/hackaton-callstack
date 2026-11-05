# Requests from Web (P2) to Backend (P1)

All of these are **additive** to protocol v1. Please confirm in `#protocol` when each one lands, and tick it here.

| # | Request | Why | Status |
|---|---|---|---|
| 1 | **Multi-seat sockets for local rooms**: accept repeated `token` query params (`/ws?token=a&token=b&pv=1`), with `you` = the union of those seats. `wsPath(code, tokens: string \| string[])`. | `POST /rooms {local:true}` returns N tokens, but one device must control every human seat. **P3 (iOS) needs this too.** | Done. Server accepts repeated `token`. `wsPath` and web `wsUrl` send one per seat. |
| 2 | **Fatal close codes**: on `BAD_TOKEN` / `PROTOCOL_MISMATCH`, send `error`, then `ws.close(4401 \| 4426)`. | Without them the client retries forever with a dead token. | Done. Server closes 4401 / 4404 / 4409 / 4426. Web stops on those. |
| 3 | **Join renames the seat**: `POST /join {name}` overwrites the placeholder ("Gracz 2"). | The online setup creates placeholder seats. | Done. |
| 4 | **Room language**: optional `lang: "pl" \| "en"` (default `"pl"`) on `CreateRoomRequest` and `PlayerView.lang`. **Grok speaks that language** (clues, lines, defend). The color-word blocklist covers both languages. | The web UI is Polish + English. | Done. Web sends the creator's UI locale and, once a view arrives, shows copy in `view.lang` without overwriting the saved preference. |
| 5 | **CORS / WS Origin allowlist**: `http://localhost:5173`, `http://<LAN-IP>:5173`, `https://tint-and-tell.pages.dev`, `https://*.tint-and-tell.pages.dev`. | Web dev + Pages prod + preview deploys. | Done for localhost and Pages (`wrangler.toml`). A LAN origin goes in `.dev.vars`, not in git. |
| 6 | **Cloudflare Pages access** for Paweł (account member or a scoped API token, never in git). | Web deploy (`p2/deploy`). | Open. Account access, not a code change. |
| 7 | **Sounds**: no server work. FYI, `shared/sounds/` + `docs/SOUND.md` define the shared sound events. Both clients fire them from `view` changes. | — | Web plays them. `bot.say.audioUrl` is played when the server sends it. There is no `/say/:id.mp3` route yet. |

Questions → Paweł (voice) or a comment on the PR that added this file.
