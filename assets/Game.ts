/**
 * Pipe Rescue - Playable Ad
 * Bombay Play | AI Intern (Game Developer-Growth) assessment
 *
 * Everything (grid, pipes, UI, end card) is built in CODE.
 * You do NOT need any sprites or art assets.
 * You only attach this ONE script to ONE empty node under the Canvas.
 *
 * Engine: Cocos Creator 3.8.x  |  Language: TypeScript
 */

import {
    _decorator, Component, Node, Graphics, Label, Color,
    UITransform, Vec3, view,
} from 'cc';
const { ccclass } = _decorator;

/* -------------------------------------------------------------------------
 * DIRECTION MODEL
 * Each pipe stores which of its 4 sides are "open" as a 4-bit number (a mask).
 *   UP = 1, RIGHT = 2, DOWN = 4, LEFT = 8
 * A straight vertical pipe (open up + down) = 1 + 4 = 5.
 * Two neighbouring pipes connect only if BOTH have an opening facing each other.
 * ---------------------------------------------------------------------- */
const UP = 1, RIGHT = 2, DOWN = 4, LEFT = 8;

enum PipeType { EMPTY, STRAIGHT, ELBOW, START, GOAL }

// One cell of the board.
interface Tile {
    type: PipeType;
    baseMask: number;   // openings at rotation 0
    rot: number;        // how many 90deg clockwise turns the player has applied
    rotatable: boolean; // start/goal/empty tiles cannot be rotated
    node: Node;
    gfx: Graphics;
}

/* Rotate an opening-mask 90 degrees clockwise, `times` times.
 * Clockwise means UP->RIGHT->DOWN->LEFT->UP, which is a bit-shift with wrap. */
function rotateMask(mask: number, times: number): number {
    times = ((times % 4) + 4) % 4;
    for (let i = 0; i < times; i++) {
        mask = ((mask << 1) & 15) | ((mask >> 3) & 1);
    }
    return mask;
}

@ccclass('Game')
export class Game extends Component {

    // ---- tuning ----
    private readonly COLS = 4;
    private readonly ROWS = 4;
    private readonly TILE = 150;     // tile size in px
    private readonly PITCH = 158;    // tile centre-to-centre spacing
    private readonly START_MOVES = 12;

    // ---- colours ----
    private readonly C_BG = new Color(28, 32, 48, 255);
    private readonly C_CELL = new Color(54, 62, 92, 255);
    private readonly C_PIPE = new Color(90, 170, 255, 255);   // blue inactive pipe
    private readonly C_PIPE_ON = new Color(80, 220, 140, 255); // green connected pipe
    private readonly C_START = new Color(80, 220, 140, 255);   // green source
    private readonly C_GOAL = new Color(245, 200, 70, 255);    // gold goal
    private readonly C_WHITE = new Color(235, 240, 255, 255);

    // ---- state ----
    private grid: Tile[][] = [];
    private moves = this.START_MOVES;
    private solved = false;
    private startRC = { r: 0, c: 0 };
    private goalRC = { r: 3, c: 3 };

    // ---- ui refs ----
    private movesLabel!: Label;
    private statusLabel!: Label;
    private endCard!: Node;

    // The fixed starting puzzle. For each cell: [type, startRotation].
    // The path Start(0,0) -> Goal(3,3) is solvable in 7 taps (limit is 12).
    private layout: [PipeType, number][][] = [
        [[PipeType.START, 0],    [PipeType.STRAIGHT, 0], [PipeType.ELBOW, 0],    [PipeType.EMPTY, 0]],
        [[PipeType.EMPTY, 0],    [PipeType.EMPTY, 0],    [PipeType.STRAIGHT, 1], [PipeType.EMPTY, 0]],
        [[PipeType.EMPTY, 0],    [PipeType.EMPTY, 0],    [PipeType.ELBOW, 3],    [PipeType.ELBOW, 0]],
        [[PipeType.EMPTY, 0],    [PipeType.EMPTY, 0],    [PipeType.EMPTY, 0],    [PipeType.GOAL, 0]],
    ];

    start() {
        // Use a fixed portrait design resolution. Position everything around (0,0) = canvas centre.
        this.buildBackground();
        this.buildHeader();
        this.buildGrid();
        this.buildCheckButton();
        this.buildEndCard();
        this.refreshAllTiles();
        this.updateMoves();
        this.setStatus('Tap pipe tiles to connect the path.');
    }

    /* =====================================================================
     * BUILD HELPERS
     * ================================================================== */

    private newNode(name: string, x: number, y: number, w: number, h: number): Node {
        const n = new Node(name);
        this.node.addChild(n);
        const ui = n.addComponent(UITransform);
        ui.setContentSize(w, h);
        n.setPosition(new Vec3(x, y, 0));
        return n;
    }

    private addGraphics(n: Node): Graphics {
        return n.addComponent(Graphics);
    }

    private addLabel(parent: Node, text: string, size: number, color: Color): Label {
        const n = new Node('label');
        parent.addChild(n);
        n.addComponent(UITransform);
        const l = n.addComponent(Label);
        l.string = text;
        l.fontSize = size;
        l.lineHeight = size + 4;
        l.color = color;
        return l;
    }

    private buildBackground() {
        const size = view.getVisibleSize();
        const n = this.newNode('bg', 0, 0, size.width, size.height);
        const g = this.addGraphics(n);
        g.fillColor = this.C_BG;
        g.rect(-size.width / 2, -size.height / 2, size.width, size.height);
        g.fill();
    }

    private buildHeader() {
        const title = this.newNode('title', 0, 520, 600, 60);
        this.addLabel(title, 'PIPE RESCUE', 46, this.C_WHITE);

        const moves = this.newNode('moves', 0, 440, 600, 50);
        this.movesLabel = this.addLabel(moves, '', 34, this.C_GOAL);

        const status = this.newNode('status', 0, -470, 660, 50);
        this.statusLabel = this.addLabel(status, '', 28, this.C_WHITE);
    }

    private gridX(c: number): number { return (c - (this.COLS - 1) / 2) * this.PITCH; }
    private gridY(r: number): number { return ((this.ROWS - 1) / 2 - r) * this.PITCH + 30; }

    private buildGrid() {
        for (let r = 0; r < this.ROWS; r++) {
            this.grid[r] = [];
            for (let c = 0; c < this.COLS; c++) {
                const [type, rot] = this.layout[r][c];
                const node = this.newNode(`tile_${r}_${c}`, this.gridX(c), this.gridY(r), this.TILE, this.TILE);
                const gfx = this.addGraphics(node);

                const tile: Tile = {
                    type,
                    baseMask: this.baseMaskFor(type, r, c),
                    rot,
                    rotatable: (type === PipeType.STRAIGHT || type === PipeType.ELBOW),
                    node,
                    gfx,
                };
                this.grid[r][c] = tile;

                if (tile.rotatable) {
                    node.on(Node.EventType.TOUCH_END, () => this.onTileTap(r, c), this);
                }
            }
        }
    }

    // Base openings for a pipe at rotation 0.
    private baseMaskFor(type: PipeType, r: number, c: number): number {
        switch (type) {
            case PipeType.STRAIGHT: return UP | DOWN;            // vertical
            case PipeType.ELBOW:    return UP | RIGHT;           // L-shape
            case PipeType.START:    return RIGHT;                // source opens toward grid
            case PipeType.GOAL:     return UP;                   // goal opens upward
            default:                return 0;                    // EMPTY
        }
    }

    private buildCheckButton() {
        const btn = this.newNode('checkBtn', 0, -370, 360, 90);
        const g = this.addGraphics(btn);
        g.fillColor = this.C_PIPE_ON;
        g.roundRect(-180, -45, 360, 90, 16);
        g.fill();
        this.addLabel(btn, 'CHECK PATH', 34, new Color(20, 30, 30, 255));
        btn.on(Node.EventType.TOUCH_END, () => this.checkPath(true), this);
    }

    private buildEndCard() {
        const size = view.getVisibleSize();
        this.endCard = this.newNode('endCard', 0, 0, size.width, size.height);

        const g = this.addGraphics(this.endCard);
        g.fillColor = new Color(10, 12, 22, 235);
        g.rect(-size.width / 2, -size.height / 2, size.width, size.height);
        g.fill();

        this.endCardTitle = this.addLabel(this.endCard, 'YOU FIXED IT!', 56, this.C_PIPE_ON);
        this.endCardTitle.node.setPosition(0, 180, 0);
        this.endCardSub = this.addLabel(this.endCard, 'Puzzle complete', 32, this.C_WHITE);
        this.endCardSub.node.setPosition(0, 110, 0);

        const cta = new Node('cta');
        this.endCard.addChild(cta);
        cta.addComponent(UITransform).setContentSize(380, 100);
        cta.setPosition(0, -60, 0);
        const cg = cta.addComponent(Graphics);
        cg.fillColor = this.C_GOAL;
        cg.roundRect(-190, -50, 380, 100, 18);
        cg.fill();
        this.ctaLabel = this.addLabel(cta, 'PLAY NOW', 38, new Color(30, 25, 0, 255));
        cta.on(Node.EventType.TOUCH_END, () => this.onCta(), this);

        this.endCard.active = false;
    }
    private endCardTitle!: Label;
    private endCardSub!: Label;
    private ctaLabel!: Label;

    /* =====================================================================
     * GAMEPLAY
     * ================================================================== */

    private currentMask(t: Tile): number {
        return rotateMask(t.baseMask, t.rot);
    }

    private onTileTap(r: number, c: number) {
        if (this.solved || this.moves <= 0) return;
        const t = this.grid[r][c];
        t.rot = (t.rot + 1) % 4;
        t.node.angle = -90 * t.rot;          // visually rotate clockwise to match the mask
        this.moves--;
        this.updateMoves();

        if (this.checkPath(false)) return;    // auto-check after every tap

        if (this.moves <= 0) {
            this.setStatus('Out of moves!');
            this.showEndCard(false);
        }
    }

    // Returns true if Start is connected to Goal. `announce` shows feedback on the manual button.
    private checkPath(announce: boolean): boolean {
        const connected = this.isConnected();
        if (connected) {
            this.solved = true;
            this.highlightSolvedPath();
            this.setStatus('Connected!');
            this.showEndCard(true);
            return true;
        }
        if (announce) this.setStatus('Not connected yet. Keep rotating.');
        return false;
    }

    // Breadth-first search from Start through matching pipe openings.
    private isConnected(): boolean {
        const seen = new Set<string>();
        const queue: { r: number, c: number }[] = [{ ...this.startRC }];
        const dirs = [
            { bit: UP, dr: -1, dc: 0, opp: DOWN },
            { bit: RIGHT, dr: 0, dc: 1, opp: LEFT },
            { bit: DOWN, dr: 1, dc: 0, opp: UP },
            { bit: LEFT, dr: 0, dc: -1, opp: RIGHT },
        ];

        while (queue.length) {
            const cur = queue.shift()!;
            const key = `${cur.r},${cur.c}`;
            if (seen.has(key)) continue;
            seen.add(key);

            if (cur.r === this.goalRC.r && cur.c === this.goalRC.c) return true;

            const mask = this.currentMask(this.grid[cur.r][cur.c]);
            for (const d of dirs) {
                if (!(mask & d.bit)) continue;                 // this tile not open that way
                const nr = cur.r + d.dr, nc = cur.c + d.dc;
                if (nr < 0 || nr >= this.ROWS || nc < 0 || nc >= this.COLS) continue;
                const nMask = this.currentMask(this.grid[nr][nc]);
                if (nMask & d.opp) queue.push({ r: nr, c: nc }); // neighbour opens back
            }
        }
        return false;
    }

    /* =====================================================================
     * RENDERING
     * ================================================================== */

    private refreshAllTiles() {
        for (let r = 0; r < this.ROWS; r++)
            for (let c = 0; c < this.COLS; c++) {
                this.grid[r][c].node.angle = -90 * this.grid[r][c].rot;
                this.drawTile(this.grid[r][c], false);
            }
    }

    private drawTile(t: Tile, lit: boolean) {
        const g = t.gfx;
        const half = this.TILE / 2;
        g.clear();

        // cell background socket
        g.fillColor = this.C_CELL;
        g.roundRect(-half, -half, this.TILE, this.TILE, 14);
        g.fill();

        if (t.type === PipeType.EMPTY) return;

        // pick pipe colour
        let col = this.C_PIPE;
        if (t.type === PipeType.START) col = this.C_START;
        else if (t.type === PipeType.GOAL) col = this.C_GOAL;
        else if (lit) col = this.C_PIPE_ON;

        // draw the base-mask openings as thick rounded arms from centre.
        // We draw the BASE mask because the node itself is rotated via node.angle.
        const mask = t.baseMask;
        g.lineWidth = 30;
        g.lineCap = Graphics.LineCap.ROUND;
        g.strokeColor = col;
        const reach = half - 8;
        if (mask & UP)    { g.moveTo(0, 0); g.lineTo(0, reach); }
        if (mask & RIGHT) { g.moveTo(0, 0); g.lineTo(reach, 0); }
        if (mask & DOWN)  { g.moveTo(0, 0); g.lineTo(0, -reach); }
        if (mask & LEFT)  { g.moveTo(0, 0); g.lineTo(-reach, 0); }
        g.stroke();

        // centre hub
        g.fillColor = col;
        g.circle(0, 0, 20);
        g.fill();

        // labels for start / goal
        if (t.type === PipeType.START || t.type === PipeType.GOAL) {
            // (text drawn once; cheap to leave as a child the first time)
            if (!t.node.getChildByName('mark')) {
                const m = new Node('mark');
                t.node.addChild(m);
                m.addComponent(UITransform);
                const l = m.addComponent(Label);
                l.string = t.type === PipeType.START ? 'START' : 'GOAL';
                l.fontSize = 20;
                l.color = new Color(20, 25, 35, 255);
                m.setPosition(0, -half + 22, 0);
            }
        }
    }

    private highlightSolvedPath() {
        // light up every pipe reachable from start (the working path glows green)
        const seen = new Set<string>();
        const queue = [{ ...this.startRC }];
        const dirs = [
            { bit: UP, dr: -1, dc: 0, opp: DOWN },
            { bit: RIGHT, dr: 0, dc: 1, opp: LEFT },
            { bit: DOWN, dr: 1, dc: 0, opp: UP },
            { bit: LEFT, dr: 0, dc: -1, opp: RIGHT },
        ];
        while (queue.length) {
            const cur = queue.shift()!;
            const key = `${cur.r},${cur.c}`;
            if (seen.has(key)) continue;
            seen.add(key);
            this.drawTile(this.grid[cur.r][cur.c], true);
            const mask = this.currentMask(this.grid[cur.r][cur.c]);
            for (const d of dirs) {
                if (!(mask & d.bit)) continue;
                const nr = cur.r + d.dr, nc = cur.c + d.dc;
                if (nr < 0 || nr >= this.ROWS || nc < 0 || nc >= this.COLS) continue;
                if (this.currentMask(this.grid[nr][nc]) & d.opp) queue.push({ r: nr, c: nc });
            }
        }
    }

    /* =====================================================================
     * UI STATE
     * ================================================================== */

    private updateMoves() {
        this.movesLabel.string = `Moves left: ${Math.max(0, this.moves)}`;
    }

    private setStatus(s: string) {
        this.statusLabel.string = s;
    }

    private showEndCard(win: boolean) {
        this.endCard.active = true;
        if (win) {
            this.endCardTitle.string = 'YOU FIXED IT!';
            this.endCardTitle.color = this.C_PIPE_ON;
            this.endCardSub.string = 'Puzzle complete';
            this.ctaLabel.string = 'PLAY NOW';
        } else {
            this.endCardTitle.string = 'OUT OF MOVES';
            this.endCardTitle.color = this.C_GOAL;
            this.endCardSub.string = 'Give it another go';
            this.ctaLabel.string = 'TRY AGAIN';
        }
    }

    private onCta() {
        if (this.solved) {
            // Real ads would open the store here. We just log, per the brief.
            console.log('[Pipe Rescue] Play Now / Install clicked');
            return;
        }
        this.resetPuzzle();
    }

    private resetPuzzle() {
        this.solved = false;
        this.moves = this.START_MOVES;
        for (let r = 0; r < this.ROWS; r++)
            for (let c = 0; c < this.COLS; c++)
                this.grid[r][c].rot = this.layout[r][c][1];
        this.refreshAllTiles();
        this.updateMoves();
        this.setStatus('Tap pipe tiles to connect the path.');
        this.endCard.active = false;
    }
}
