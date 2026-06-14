# 🛠️ Pipe Rescue — A Simple Pipe-Connecting Game

A small mobile **playable ad** built in **Cocos Creator 3.8 + TypeScript**.
You tap pipe tiles to rotate them and connect the **water source** to the **goal**.

> **Author:** Prashanna A · prashanna876@gmail.com
> **Engine:** Cocos Creator 3.8.x · TypeScript · HTML5/Web build
> **Made for:** Bombay Play — AI Intern (Game Developer-Growth) assessment

*(All the game code lives in one file: [`assets/Game.ts`](assets/Game.ts). Everything you see — grid, pipes, buttons, end screen — is drawn in code. There are **no image files**.)*

---

## 🎮 What is the game?

Imagine a broken water line. There is a **green Start** (where water comes out) and a
**gold Goal** (where water needs to reach). In between are pipe pieces that are pointing
the wrong way.

Your job: **tap the pipes to rotate them** until the water has a clear path from Start to Goal.

You only have **12 taps (moves)**. The puzzle can be solved in **7 taps**, so there is room to make mistakes.

---

## 👆 How to play

1. You see a **4×4 grid** of tiles.
2. **Tap a pipe** → it rotates **90° clockwise**.
3. Keep rotating pipes so their openings line up and form one connected line.
4. The game **checks automatically after every tap**. (There's also a **CHECK PATH** button.)
5. When Start connects to Goal:
   - The connected pipes **glow green**.
   - A **"YOU FIXED IT!"** card appears with a **PLAY NOW** button.
6. If you run out of moves first → an **"OUT OF MOVES"** card with a **TRY AGAIN** button.

---

## 🧠 How the game works (the logic, explained simply)

This is the important part. The whole game is built on **one simple idea**, explained below in small steps.

### Step 1 — Every pipe has 4 sides

Every tile has four sides: **Up, Right, Down, Left**.
Each side is either **open** (water can pass) or **closed** (a wall).

```
        UP
         │
 LEFT ──███── RIGHT
         │
       DOWN
```

### Step 2 — We store the open sides as a number (the "mask")

Instead of remembering "up is open, right is closed…", we give each side a number:

| Side  | Number |
|-------|--------|
| UP    | 1      |
| RIGHT | 2      |
| DOWN  | 4      |
| LEFT  | 8      |

To describe a pipe, we **add up** the numbers of its open sides.
Because the numbers are 1, 2, 4, 8 (powers of two), **every combination gives a unique total** — like 4 light switches.

**Examples:**

| Pipe shape            | Open sides    | Math      | Mask |
|-----------------------|---------------|-----------|------|
| Straight (vertical)   | UP + DOWN     | 1 + 4     | `5`  |
| Elbow (L-shape)       | UP + RIGHT    | 1 + 2     | `3`  |
| Start (water source)  | RIGHT only    | 2         | `2`  |
| Goal                  | UP only       | 1         | `1`  |
| Empty tile            | nothing       | 0         | `0`  |

So a pipe is just a small number that says which sides are open. This number is called the **mask**.

### Step 3 — Rotating a pipe

When you tap, the pipe turns 90° clockwise. The open sides simply **shift to the next side**:

```
UP → RIGHT → DOWN → LEFT → (back to UP)
```

In the code this is done with a quick "bit shift" (`rotateMask`), but you can think of it as:
**"every opening moves one step clockwise."**

### Step 4 — When do two pipes connect?

Two neighbouring pipes connect **only if both have an opening facing each other.**

```
   Pipe A        Pipe B
 ███──►  ◄──███      ✅ connected (A opens RIGHT, B opens LEFT)

 ███──►   ███        ❌ not connected (B's left side is a wall)
```

### Step 5 — Does the water reach the goal? (the "flood" check)

After every tap, the game asks: **"Can water flow from Start all the way to Goal?"**

It works exactly like **pouring water in at the Start** and letting it spread:

1. Start at the Start tile.
2. Look at each open side. If the neighbour pipe opens back, water flows into it.
3. Repeat for every newly reached pipe.
4. If the water ever reaches the **Goal** → **you win!** 🎉
   If the water stops spreading and never reached the Goal → not solved yet.

This "spread to all reachable tiles" technique is a well-known algorithm called
**BFS (Breadth-First Search)** — but you can just remember it as **flood fill**.
It is *generic*: it works for any pipe layout, not just this one.

### Step 6 — Winning and losing

| Situation                         | What happens                                              |
|-----------------------------------|----------------------------------------------------------|
| Water reaches Goal                | Path glows green → "YOU FIXED IT!" → **PLAY NOW** button  |
| 12 moves used, still not connected| "OUT OF MOVES" → **TRY AGAIN** button (resets the puzzle) |

That's the entire game logic. Nothing more complicated than: *rotate pipes → flood the water → check if it reached the goal.*

---

## 🎨 How the pipes are drawn (the visuals)

There are **no picture files**. Every pipe is drawn live with Cocos's `Graphics` tool
(like drawing with a pen in code). Each pipe is drawn in **3 layers** to look like a real tube:

1. **Casing** — a darker outline (the metal edge of the pipe).
2. **Body** — the main pipe colour on top.
3. **Gloss** — a thin bright line for a shiny highlight.

Plus a few finishing touches:
- **Elbows** use a smooth curve instead of a sharp corner.
- Pipe ends are **flat and reach the gap between tiles**, so when two pipes line up they
  **merge into one continuous tube** with no ugly bump at the join.
- **Start** and **Goal** get a round "valve" knob.

**Colour meaning:**

| Colour      | Meaning                         |
|-------------|---------------------------------|
| 🔵 Blue     | Pipe not yet connected          |
| 🟢 Green    | Connected pipe / water source   |
| 🟡 Gold     | The goal                        |

---

## 📁 Project structure

```
PipeRescue/
├── assets/
│   ├── Game.ts        ← ⭐ ALL the game code is here (logic + drawing)
│   └── Main.scene     ← the Cocos scene (one node with Game.ts attached)
├── build/web-mobile/  ← the exported HTML5 version you can run in a browser
├── package.json
└── README.md          ← this file
```

👉 **If you only read one file, read [`assets/Game.ts`](assets/Game.ts).** It is commented and short.

---

## ▶️ How to run

### Option A — In the Cocos editor (to edit and play)
1. Open the project folder in **Cocos Creator 3.8.x** (via the Cocos Dashboard).
2. Open the scene **`assets/Main.scene`**.
3. Press the **Preview ▶️** button — it opens in your browser.

### Option B — The exported web build (just to play)
The ready build is in `build/web-mobile/`. Serve it over a local server:

```bash
cd build/web-mobile
python -m http.server 8080
```
Then open **http://localhost:8080** in your browser.

> Tip: opening `index.html` directly (double-click) may be blocked by the browser — using the local server above avoids that.

> ⚠️ If you change `Game.ts`, you must **rebuild** in Cocos (Project → Build) before the
> `build/web-mobile/` version shows your changes.

---

## 🔧 Want to tweak it? (quick reference)

All the easy settings are at the top of `Game.ts`:

| You want to change…        | Edit this in `Game.ts`                          |
|----------------------------|-------------------------------------------------|
| Number of allowed moves    | `START_MOVES` (currently `12`)                  |
| Grid size                  | `ROWS` / `COLS` (currently `4` × `4`)           |
| Tile size / spacing        | `TILE` / `PITCH`                                |
| Colours                    | the `C_BG`, `C_PIPE`, `C_START`, … values       |
| The starting puzzle        | the `layout` table (`[type, startRotation]`)    |

---

## 📖 Mini glossary

- **Tile / cell** — one square of the grid.
- **Mask** — the small number that says which sides of a pipe are open.
- **Rotation (rot)** — how many 90° clockwise turns the player has applied (0–3).
- **BFS / flood fill** — the method that spreads water from Start to check if it reaches Goal.
- **Playable ad** — a tiny interactive game used as an advertisement; tapping the final button would normally open an app store.
</content>
</invoke>
