# Requests from Web (P2) to Backend (P1)

All of these are **additive** to protocol v1. Please confirm in `#protocol` when each one lands, and tick it here.

| # | Request | Why | Web status |
|---|---|---|---|
| 1 | **Multi-seat sockets for local rooms**: accept repeated `token` query params (`/ws?token=a&token=b&pv=1`), with `you` = the union of those seats. Optionally update `wsPath(code, tokens: string \| string[])`. | `POST /rooms {local:true}` returns N tokens, but one device must control every human seat. **P3 (iOS) needs this too.** | `wsUrl()` already sends one `token` per seat |
| 2 | **Fatal close codes**: on `BAD_TOKEN` / `PROTOCOL_MISMATCH`, send `error`, then `ws.close(4401 \| 4426)`. | Without them the client retries forever with a dead token. | client stops on 4401/4426 |
| 3 | **Join renames the seat**: `POST /join {name}` overwrites the placeholder ("Gracz 2"). | The online setup creates placeholder seats. | — |
| 4 | **Room language**: add an optional `lang: "pl" \| "en"` (default `"pl"`) to `CreateRoomRequest` and expose it in `PlayerView` (`lang`). **Grok speaks that language** (clues, lines, defend). The color-word blocklist covers both languages. | The web UI is now Polish + English (browser-detected). An English room with a Polish-speaking Grok breaks the experience. | web will send `lang` once it exists |
| 5 | **CORS / WS Origin allowlist**: `http://localhost:5173`, `http://<LAN-IP>:5173`, `https://tint-and-tell.pages.dev`, `https://*.tint-and-tell.pages.dev`. | Web dev + Pages prod + preview deploys. | — |
| 6 | **Cloudflare Pages access** for Paweł (account member or a scoped API token, never in git). | Web deploy (`p2/deploy`). | — |
| 7 | **Sounds**: no server work. FYI, `shared/sounds/` + `docs/SOUND.md` define the shared sound events. Both clients fire them from `view` changes. | — | `p2/sound` after the table |

Questions → Paweł (voice) or a comment on the PR that added this file.
