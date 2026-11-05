# Demo script (≈4 min)

**Before going on stage**:
- `pnpm playtest smoke --env prod` is green.
- The last cron report in `#playtest-bot` is green.
- Phones are charged, Do Not Disturb is on, dark mode is off (it's shown separately).

1. **Pitch (20 s)**: "Ludzie i Grok próbują trafić ten sam odcień samym językiem skojarzeń. Zawias to granica prywatności."
2. **Local pass-and-play (60 s)**, on the iPad simulator or iPhone:
   - Mode **Stół**, players Kuba, Ola and Grok.
   - Closed: the viewfinder, then the clue "Rosół".
   - Unfold: the board splits from the hinge and the clue appears on both edges. Grok places first with a line.
   - Ola places a stone with the loupe.
   - Fold: "z marchewką". Unfold, place stones, then the reveal with rings and points.
3. **Online cross-play (60 s)**:
   - The web host creates a room and shows the QR.
   - The iPhone scans it and joins (`tintandtell://join/…`).
   - `pnpm playtest fill <CODE> --count 1` adds a third player live.
   - The iPhone is the cue giver; web and the bot guess.
4. **Grok podpowiada (30 s)**: Grok gives the clue, and the humans guess.
5. **Security (20 s)**: DevTools → WS frames on a guesser tab show no `secret` until REVEAL.
6. **Resilience (20 s)**: kill the xAI key (or use `botMode: "fallback"`) and Grok keeps playing.
7. **Dark mode (10 s)**: the reveal fades the board towards Cocoa Spice.
