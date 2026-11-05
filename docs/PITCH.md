# Pitch session plan

Assumed format: **3 min pitch + 2 min Q&A**, with a projector and one laptop on HDMI. Adjust the timings if the organizers say otherwise. Speak English; the game's Polish lines stay in Polish, with subtitles in the video.

## Roles on stage
| Who | Does |
|---|---|
| **Paweł (P2)** | Main speaker. The laptop runs the web host (projected) and plays the video. |
| **P3** | Holds the iPhone and plays the cue giver. Their phone screen is mirrored via QuickTime on a 2nd laptop, or just held up. |
| **P4** | iPad simulator on the 2nd laptop showing the foldable table (unfold animation). |
| **P1** | Terminal: runs `pnpm playtest fill <CODE> --count 1` live, and answers tech Q&A. |

## Run of show (3:00)
| Time | Beat | On screen | Line (gist) |
|---|---|---|---|
| 0:00–0:30 | **Hook** | Grok-generated video (below) | (video VO) "A word. A shade. Can you find it, and can an AI?" |
| 0:30–0:50 | **Insight** | Slide: folded vs unfolded phone | "Foldables have a hinge. We made the hinge the privacy boundary: closed is your secret, open is the table." |
| 0:50–2:10 | **Live demo** | Web host + iPhone + iPad sim | 1. Web creates a room and shows the QR. 2. The iPhone scans and joins, and P1 adds a bot player live. 3. The iPhone (cue giver) types *"Rosół"*. 4. The table unfolds and Grok places first: *"Złoty, ale nie z puszki…"* 5. Fast-forward to the reveal: rings and points. |
| 2:10–2:35 | **How** | `git log --graph` + architecture slide | "4 people, 4 Claude agents, 3 hours, ~200 commits rebase-merged and all visible. One contract, golden fixtures shared by Swift and TS, a playtest bot that plays production every 10 minutes." |
| 2:35–2:55 | **Impact** | Slide with 3 bullets | "Screens that bring people together. A dataset of how humans and AI map words to color, starting in Polish. A color game that will include color-blind players." |
| 2:55–3:00 | **Close** | Logo "Dwa T" | "Tint & Tell. Trafcie ten sam odcień." |

**Backup**: at T+2:35 (right after the freeze), screen-record one clean cross-play round, 60 s, as `pitch/out/demo-backup.mp4`. If anything fails live, say "here's the round we played 20 minutes ago" and play it. Don't debug on stage.

---

## The video: 30 s, made with Grok Imagine
**Why**: it carries the emotion (friends, a table, a shade) that a live demo can't, and showing Grok's own video model alongside Grok as a player is a nice touch.

### Constraints
- Generated video garbles text, so **never ask the model for text, UI or logos**. All captions, Polish quotes and the logo are added in the edit with our own SVG and brand font.
- Use a **generic foldable phone**: no Apple logo or trade dress, and no real brands.
- **No likeness of real people.** Hands and anonymous friends seen from behind or out of focus.
- The style block (below) goes into every prompt, so all the shots match.

**Style block** (append to every prompt):
> warm late-evening light, off-white linen tabletop (#F8F7F4), deep warm-black shadows (#191815), accents of saturated mustard gold (#E9B005), shallow depth of field, 35mm film look, gentle handheld camera, cozy kitchen party atmosphere, no text, no logos

### Storyboard (5 shots × ~6 s)
| # | Shot | Prompt (before the style block) | Edit overlay |
|---|---|---|---|
| 1 | **The secret** | "extreme close-up of a hand holding a closed foldable smartphone, its small outer screen glowing with a single mustard-gold square framed by four thin corner brackets, the person tilts the phone away to hide it" | Caption: *"Rosół."* (typed in) |
| 2 | **The unfold** | "the same foldable phone laid flat on a table and unfolding open, a grid of hundreds of small colored tiles spreading outward from the center hinge like a rainbow, friends leaning in around the table, out of focus" | Clue appears top + bottom, mirrored |
| 3 | **Grok moves first** | "top-down view of a colorful tile grid on a tablet screen, a small glossy black stone drops onto one golden tile, then two small white stones are placed by fingertips on nearby tiles" | *Grok: "Złoty, ale nie z puszki."* |
| 4 | **The reveal** | "the tile grid slowly fades to soft grey except a small bright square patch of golden and orange tiles that glows, two rings of light draw around it, friends laughing in the background, out of focus" | "+3 · +2 · +1" |
| 5 | **The table** | "wide shot of four friends around a kitchen table at night sharing one unfolded phone, warm lamp light, colorful light from the screen on their faces, faces not clearly visible" | Logo "Dwa T" → "Tint & Tell" |

VO (record on a phone, ~25 words): *"One shade. One word. Your friends, and an AI. Fold to keep the secret. Unfold to play. Tint & Tell."* Music: a royalty-free lo-fi track, quiet under the VO.

### Pipeline
1. **Key frames (image model)**: generate 2–3 candidates per shot, using the same prompt + style block, and pick one each. That locks the composition and colors before spending video credits.
2. **Image → video**: animate each chosen frame for 6 s at 720p. Generate 2 takes per shot, keep the best.
3. **Assemble** with ffmpeg (captions and logo are PNGs exported from our SVG):
   ```bash
   # normalize, then concatenate the 5 picked takes
   for i in 1 2 3 4 5; do ffmpeg -y -i pitch/raw/shot$i.mp4 -vf "scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,fps=30" -an pitch/out/s$i.mp4; done
   printf "file 's%d.mp4'\n" 1 2 3 4 5 > pitch/out/list.txt
   ffmpeg -y -f concat -safe 0 -i pitch/out/list.txt -c copy pitch/out/cut.mp4
   # overlay captions/logo (PNG with alpha) and mix VO + music
   ffmpeg -y -i pitch/out/cut.mp4 -i pitch/assets/overlays.mov -i pitch/assets/vo.m4a -i pitch/assets/music.mp3 \
     -filter_complex "[0][1]overlay=0:0[v];[3]volume=0.25[m];[2][m]amix=inputs=2:duration=first[a]" \
     -map "[v]" -map "[a]" -c:v libx264 -crf 18 -c:a aac -shortest pitch/out/tint-and-tell-30s.mp4
   ```
   Simpler alternative for the overlays: drop the 5 clips into CapCut or iMovie and add the text there with the display font.

### xAI API notes (verify field names on docs.x.ai before scripting)
- Base URL `https://api.x.ai/v1`. Auth: `Authorization: Bearer $XAI_API_KEY` (env var only, never committed).
- Video is **asynchronous**: you POST a generation request, get a `request_id`, then poll `GET /v1/videos/{request_id}` until `status` is `done` (or `failed` / `expired`), and download the returned URL. The model id is reported as `grok-imagine-video`. A newer `grok-imagine-video-1.5-preview` is image-to-video only.
- **Budget**: published rates for the 1.5 preview are about $0.08/s at 480p and $0.14/s at 720p. 5 shots × 6 s × 2 takes × $0.14 ≈ **$8.40**, plus a few cents for key frames. Text-to-video pricing may differ, so check the console first.
- A small script (`scripts/pitch/grok-video.mjs`: submit → poll → download into `pitch/raw/`, which is gitignored) can run in a background terminal while we code.

### When
The video is fully independent of the code. **Make it in a background session, ideally before T+0 or during T+1:45–2:30**, run by whoever is least blocked. Paweł picks the takes at T+2:30. The final export is due by **T+2:45**.

---

## Q&A prep
| Likely question | Answer (short) |
|---|---|
| "Isn't this like existing color-clue party games?" | The genre exists, and we like it. What's new: the hinge as the privacy mechanic, an AI that plays as an equal (guesses, gives clues, trash-talks), and real-time cross-play between native iOS and web. |
| "iPhone Duo doesn't exist." | Correct. We designed for a foldable posture and emulate it: window size on iOS (iPad sim), the Viewport Segments API on web. Any device plays online today. |
| "How do you stop cheating online?" | The server builds a separate view per connection, so non-cue-givers never receive the target. Our playtest bot checks this on every message, in CI and on prod every 10 min. |
| "What if Grok is slow or down?" | 8 s timeout → deterministic fallback bot. The game never stalls, and the seat shows "degraded". |
| "Does the AI actually perceive color?" | It reasons over OKLCH numbers + descriptors, not pixels. That gap is exactly what the alignment dataset idea would measure. |
| "Business model?" | Free core game. Paid themed palettes and packs, and a party mode for events and classrooms. The dataset is opt-in and open for research. |
| "What did the AI agents actually do?" | Four Claude agents built in parallel from one contract. Show `git log --graph` and the agent briefs in `docs/agents/`. |

## Checklist
- [ ] T−15: decide who records the VO; download the music track
- [ ] T+1:45: video key frames done
- [ ] T+2:30: takes picked, assembled
- [ ] T+2:35: backup demo recorded
- [ ] T+2:45: final video exported; slides (3: insight, how, impact) ready
- [ ] T+2:50: rehearse once with a stopwatch; phones charged, Do Not Disturb on, brightness max
