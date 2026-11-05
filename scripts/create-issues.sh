#!/usr/bin/env bash
# Creates one GitHub issue per branch in docs/agents/*.md, labeled p1..p4.
# Run once after `gh auth login`:  ./scripts/create-issues.sh
# Safe to re-run: skips issues whose title already exists.
set -euo pipefail

gh label create p1 --color 1f6feb --description "P1 backend + AI" --force >/dev/null
gh label create p2 --color e9b005 --description "P2 web" --force >/dev/null
gh label create p3 --color 8250df --description "P3 iOS shell" --force >/dev/null
gh label create p4 --color d1242f --description "P4 iOS table" --force >/dev/null
gh label create protocol --color 191815 --description "Contract change" --force >/dev/null

existing="$(gh issue list --state all --limit 200 --json title --jq '.[].title')"

create() { # label brief branch summary
  local label="$1" brief="$2" branch="$3" summary="$4"
  local title="[$branch] $summary"
  if grep -Fxq "$title" <<<"$existing"; then echo "skip  $title"; return; fi
  gh issue create --title "$title" --label "$label" \
    --body "Branch \`$branch\`. Spec and done criteria: [\`$brief\`](../blob/main/$brief), section \`$branch\`."$'\n\n'"Close it with \`Closes #<this>\` in the PR; merge with **Rebase and merge**." >/dev/null
  echo "added $title"
}

B1=docs/agents/P1-backend.md
create p1 $B1 p1/game-core-rules  "Viewfinder, scoring, clue validator, phase machine"
create p1 $B1 p1/server-room      "Worker router + Room Durable Object + projection (deploy)"
create p1 $B1 p1/fallback-bot     "Alarm-driven bot turns with heuristic fallback + timeouts"
create p1 $B1 p1/playtester       "Playtest bot client, invariants, smoke/fill CLI (deploy by T+0:45)"
create p1 $B1 p1/grok             "xAI Grok guess / clue / defend with budget"
create p1 $B1 p1/playtest-cron    "Cron live test worker -> Discord"
create p1 $B1 p1/hardening        "flaky + adversary personas, attack CLI"

B2=docs/agents/P2-web.md
create p2 $B2 p2/scaffold         "Vite + routes + tokens + logo"
create p2 $B2 p2/dev-gallery      "/dev gallery rendering every view fixture"
create p2 $B2 p2/net-store        "API + WebSocket client + Zustand store"
create p2 $B2 p2/setup-lobby      "Setup, lobby with QR, join page"
create p2 $B2 p2/closed-screens   "Posture + viewfinder, clue entry, cards, pause"
create p2 $B2 p2/table            "Board, stones, double edge bars, placement (T+1:15 gate)"
create p2 $B2 p2/reveal           "Reveal overlay + game over"
create p2 $B2 p2/unfold-polish    "Unfold animation, reduced motion, Pages deploy"

B3=docs/agents/P3-ios-shell.md
create p3 $B3 p3/project          "XcodeGen project + TintKit package (by T+0:25)"
create p3 $B3 p3/tintkit-models   "Swift protocol mirror + fixture tests + Palette/Theme"
create p3 $B3 p3/tintkit-net      "APIClient + RoomClient actor + Keychain tokens"
create p3 $B3 p3/store-router     "GameStore, PostureReader, root router, server switcher"
create p3 $B3 p3/setup-join       "Setup, join (deep link), lobby"
create p3 $B3 p3/closed-screens   "Viewfinder, clue entry, cards, pause sheet (T+1:45 gate)"
create p3 $B3 p3/polish           "Dark mode, app icon, haptics, local e2e"

B4=docs/agents/P4-ios-table.md
create p4 $B4 p4/board            "Canvas board with hinge gap + hit testing"
create p4 $B4 p4/stones-placement "Stones + long-press loupe placement"
create p4 $B4 p4/edge-bars        "Double-sided edge bars + hinge pause"
create p4 $B4 p4/reveal-overlay   "Reveal: fade, rings, point badges"
create p4 $B4 p4/unfold           "Unfold transition + haptics + reduce motion"
create p4 $B4 p4/portrait-table   "Portrait table for online guessers"
