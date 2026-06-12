# Pipe Rescue — Playable Ad

**Author:** Prashanna A · prashanna876@gmail.com · +91 9360209043
**Portfolio:** https://prashannadev.vercel.app/
**Assessment:** Bombay Play — AI Intern (Game Developer-Growth)
**Engine:** Cocos Creator 3.8.x · TypeScript · HTML5/Web build

## What I built

A portrait (9:16) mobile playable ad. The player taps pipe tiles on a 4×4 grid
to rotate them 90° and connect the green **Start** (water source) to the gold
**Goal** before running out of moves (12). When Start connects to Goal the path
lights up green, a "You fixed it!" end card appears with a mock **Play Now**
call-to-action. If moves run out, an "Out of moves" card lets the player **Try
Again**.

Core features implemented:
- Touch input — tap a pipe to rotate it 90° clockwise.
- 4×4 grid with a fixed, solvable puzzle (solvable in 7 taps, limit is 12).
- Game state — move counter, solved flag, replay.
- Solved-state detection via a breadth-first search across matching pipe openings
  (this is a **generic** connection solver, not a hardcoded check — the bonus).
- Responsive portrait layout at a fixed 720×1280 design resolution.
- One gameplay screen + one end-card screen.
- A working HTML5/Web export.

## How it works (1-minute version)

Each pipe stores its open sides as a 4-bit mask (UP=1, RIGHT=2, DOWN=4, LEFT=8).
A tap increments the tile's rotation and the mask is rotated with a bit-shift.
Two neighbours connect only when both have an opening facing each other. After
every tap a BFS runs from Start; if it reaches Goal, the puzzle is solved. All
visuals (grid, pipes, buttons, end card) are drawn at runtime with the Cocos
`Graphics` API, so the project needs **no image assets**.

## How to run

**Play from source (Cocos editor):**
1. Open the project folder in Cocos Creator 3.8.x via the Cocos Dashboard.
2. Open the scene `assets/Main.scene`.
3. Press the **Preview** (play) button — it opens in your browser at localhost.

**Play the exported HTML5 build:**
- The build is in `build/web-mobile/`. Serve that folder over HTTP, e.g.:
  - `cd build/web-mobile && python -m http.server 8080` then open
    `http://localhost:8080`
  - (Opening `index.html` directly via `file://` may be blocked by the browser;
    a local server avoids that.)

## AI tools used

I used Claude (Anthropic) to plan the architecture, write the TypeScript game
logic, and debug. I reviewed and understood all generated code, designed the
puzzle layout and rotation values myself, and verified behaviour by playing
through the win and lose paths in the editor and in the exported build. I'm
ready to walk through any part of the code and the BFS solver in the interview.

## Known issues / would-do-with-more-time

- Single fixed puzzle (per the brief). Next step: a small random level generator.
- No audio or tween animation; rotation is instant. A short rotate tween + a
  click sound would add juice.
- Empty cells are inert sockets. Decoy pipes would raise difficulty.
- Pipe art is drawn with primitives; swapping in sprite art would lift polish.
