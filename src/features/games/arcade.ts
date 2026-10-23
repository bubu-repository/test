/* ==========================================================================
   CLOUD ARCADE — the firmware of the cloud handheld in Adelia’s room.
   One controller owns the canvas, the 60 Hz loop, input and every screen:
     boot → menu → title card → play ⇄ pause → game over → name → board
   React only renders the hardware around it and the name-entry field.
   ========================================================================== */
import { sfx, audio, type SfxName } from '@/audio/engine';
import { list, submit, track, apiMode } from '@/lib/api';
import { game } from '@/state/game';
import { useUI } from '@/state/ui';
import { Fx, HUD_H, Input, KEYMAP, Loop, type Btn, type GameApi, type GameDef, type GameId, type GameInstance } from './engine';
import { blink, dither, frame, measure, P, pad, printable, rect, text, W, H } from './pixel';
import { signalCatcher } from './signalCatcher';
import { trendRunner } from './trendRunner';
import { cultureSnake } from './cultureSnake';

export const GAMES: GameDef[] = [signalCatcher, trendRunner, cultureSnake];
export const titleCase = (s: string) => s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

export type Mode = 'boot' | 'menu' | 'title' | 'play' | 'pause' | 'over' | 'name' | 'board';

export interface BoardRow {
  name: string;
  score: number;
  me?: boolean;
  local?: boolean;
}

export interface ArcadeEvents {
  onMode?: (m: Mode) => void;
  onButton?: (b: Btn, down: boolean) => void;
  onJolt?: (power: number) => void;
  /** A / B while the name field is up (device buttons or keys outside the field) */
  onNameAction?: (a: 'submit' | 'skip') => void;
}

const PAUSE_ITEMS = ['RESUME', 'RESTART', 'QUIT'] as const;

export class Arcade {
  readonly input = new Input();
  readonly fx = new Fx();
  private loop: Loop;
  private g: CanvasRenderingContext2D;
  private destroyed = false;

  mode: Mode = 'boot';
  t = 0;
  modeT = 0;
  sel = 0;
  pauseSel = 0;
  game: GameDef = GAMES[0];
  inst: GameInstance | null = null;
  score = 0;
  shown = 0;
  best = 0;
  ready = 0;
  overT = 0;
  result = { isBest: false, cp: 0, high: false };
  board: BoardRow[] | null = null;
  boardState: 'idle' | 'loading' | 'ready' = 'idle';
  boardRank = 0;
  boardLocal = false;

  constructor(
    canvas: HTMLCanvasElement,
    private events: ArcadeEvents = {},
  ) {
    const g = canvas.getContext('2d', { alpha: false });
    if (!g) throw new Error('2D canvas unavailable');
    this.g = g;
    g.imageSmoothingEnabled = false;
    this.loop = new Loop(
      () => this.step(),
      () => this.render(),
    );
    this.input.onChange = (b, d) => this.events.onButton?.(b, d);
    this.fx.onJolt = (p) => this.events.onJolt?.(p);
  }

  /* ------------------------------------------------------------ lifecycle */
  start() {
    window.addEventListener('keydown', this.onKey, true);
    window.addEventListener('keyup', this.onKey, true);
    window.addEventListener('blur', this.autoPause);
    document.addEventListener('visibilitychange', this.onVis);
    audio.duck(0.45);
    this.loop.start();
  }

  destroy() {
    this.destroyed = true;
    this.loop.stop();
    window.removeEventListener('keydown', this.onKey, true);
    window.removeEventListener('keyup', this.onKey, true);
    window.removeEventListener('blur', this.autoPause);
    document.removeEventListener('visibilitychange', this.onVis);
    this.input.releaseAll();
    audio.unduck();
    if (this.mode === 'play' || this.mode === 'pause') track('game_quit', { game: this.game.id, score: this.score });
  }

  private onVis = () => {
    if (document.hidden) this.autoPause();
  };

  private autoPause = () => {
    this.input.releaseAll();
    if (this.mode === 'play') this.setMode('pause');
  };

  private onKey = (e: KeyboardEvent) => {
    const down = e.type === 'keydown';
    const typing = (e.target as HTMLElement | null)?.closest?.('input, textarea, select, [contenteditable]');
    if (e.key === 'Escape') {
      if (this.mode === 'name') {
        e.stopPropagation();
        e.preventDefault();
        if (down) this.events.onNameAction?.('skip');
        return;
      }
      // Esc pauses/resumes while a run is live; elsewhere it closes the panel
      if (this.mode !== 'play' && this.mode !== 'pause') return;
      e.stopPropagation();
      e.preventDefault();
    } else if (typing) return;
    const b = KEYMAP[e.code];
    if (!b) return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    e.preventDefault();
    e.stopPropagation();
    if (down && e.repeat) return;
    this.input.set(b, down, 'kbd:' + e.code);
  };

  /** QA/dev: run n fixed steps synchronously, then draw */
  advance(n = 1) {
    for (let i = 0; i < n; i++) this.step();
    this.render();
  }

  /** on-device controls (pointer) */
  press(b: Btn, down: boolean, source = 'ptr') {
    this.input.set(b, down, source);
  }

  private setMode(m: Mode) {
    this.mode = m;
    this.modeT = 0;
    this.events.onMode?.(m);
  }

  private sound(name: SfxName, opts?: { pitch?: number; gain?: number; pan?: number }) {
    sfx(name, opts);
  }

  /* ----------------------------------------------------------------- flow */
  private api(): GameApi {
    const self = this;
    return {
      input: this.input,
      fx: this.fx,
      sfx: (name, opts) => self.sound(name, opts),
      addScore: (n) => {
        self.score += n;
      },
      get score() {
        return self.score;
      },
      over: () => self.gameOver(),
    };
  }

  private startRun() {
    this.fx.clear();
    this.score = 0;
    this.shown = 0;
    this.best = game().stats.bestScores[this.game.id] ?? 0;
    this.inst = this.game.create(this.api());
    this.ready = 70;
    this.pauseSel = 0;
    this.setMode('play');
    useUI.getState().setFlag('consoleGame', this.game.id);
    game().updateStats((s) => ({ gamesPlayed: s.gamesPlayed + 1 }));
    track('game_start', { game: this.game.id });
    this.sound('press');
  }

  private gameOver() {
    if (this.mode !== 'play') return;
    const id = this.game.id;
    const g = game();
    const prev = g.stats.bestScores[id] ?? 0;
    const isBest = this.score > prev;
    if (isBest) g.updateStats((s) => ({ bestScores: { ...s.bestScores, [id]: this.score } }));
    const cp = Math.min(100, Math.floor(this.score / 10));
    if (cp > 0) g.addPoints(cp, `Arcade · ${titleCase(this.game.title)}`);
    const high = this.score >= this.game.threshold;
    if (high) g.unlock('high-score');
    this.result = { isBest, cp, high };
    useUI.getState().setFlag('consoleGame', null);
    track('game_over', { game: id, score: this.score, best: isBest });
    this.input.releaseAll();
    this.overT = 0;
    this.setMode('over');
    if (isBest) setTimeout(() => !this.destroyed && this.sound('success'), 350);
  }

  private quitToMenu() {
    if (this.mode === 'play' || this.mode === 'pause') {
      useUI.getState().setFlag('consoleGame', null);
      track('game_quit', { game: this.game.id, score: this.score });
    }
    this.inst = null;
    this.fx.clear();
    this.setMode('menu');
    this.sound('back');
  }

  /** called by the name-entry form */
  async submitName(name: string) {
    if (this.mode !== 'name') return;
    const clean = name.trim().slice(0, 12);
    this.sound('success');
    if (!game().name && clean) game().setProfile({ name: clean });
    this.setMode('board');
    this.boardState = 'loading';
    let id: string | undefined;
    try {
      const rec = await submit('scores', { game: this.game.id, name: clean, score: this.score, sessionId: game().sessionId });
      id = rec?.id;
    } catch {
      /* offline: the local best is merged in below */
    }
    await this.loadBoard(id, clean);
  }

  skipName() {
    if (this.mode !== 'name') return;
    this.sound('back');
    this.setMode('board');
    void this.loadBoard(undefined, game().name);
  }

  private async loadBoard(submittedId?: string, myName?: string) {
    const id = this.game.id;
    this.board = null;
    this.boardState = 'loading';
    this.boardRank = 0;
    let rows: BoardRow[] = [];
    let mineFound = false;
    try {
      const raw = await list('scores', { game: id });
      rows = raw
        .filter((r) => (r.game === undefined || r.game === id) && Number.isFinite(Number(r.score)))
        .map((r) => {
          const me = !!submittedId && r.id === submittedId;
          if (me) mineFound = true;
          return { name: printable(String(r.name || '???')).slice(0, 12) || '???', score: Number(r.score), me, t: Number(r.createdAt) || 0 };
        })
        .sort((a, b) => b.score - a.score || a.t - b.t)
        .map(({ t: _t, ...r }) => r);
    } catch {
      rows = [];
    }
    if (this.destroyed || this.game.id !== id) return;
    // merge the local best (offline, skipped, or never synced)
    const best = game().stats.bestScores[id] ?? 0;
    const label = printable(myName || game().name || 'YOU').slice(0, 12) || 'YOU';
    if (best > 0 && !rows.some((r) => r.score === best && (r.me || r.name === label))) rows.push({ name: label, score: best, me: !mineFound, local: true });
    rows.sort((a, b) => b.score - a.score);
    const rank = rows.findIndex((r) => r.me) + 1;
    this.boardRank = rank;
    this.board = rows.slice(0, 10);
    this.boardLocal = apiMode() !== 'remote';
    this.boardState = 'ready';
    this.sound('beep', { pitch: 7 });
  }

  /* ----------------------------------------------------------------- step */
  private step() {
    this.t++;
    this.modeT++;
    this.overT++;
    const inp = this.input;
    const pressed = (b: Btn) => inp.pressed(b);

    switch (this.mode) {
      case 'boot':
        if (this.modeT === 48) this.sound('coin', { pitch: 12 });
        if (this.modeT > 120 || (this.modeT > 10 && (pressed('a') || pressed('start')))) this.setMode('menu');
        break;

      case 'menu':
        if (pressed('up') || pressed('left')) {
          this.sel = (this.sel + GAMES.length - 1) % GAMES.length;
          this.sound('beep', { pitch: -2 });
        }
        if (pressed('down') || pressed('right') || pressed('select')) {
          this.sel = (this.sel + 1) % GAMES.length;
          this.sound('beep');
        }
        if (pressed('a') || pressed('start')) {
          this.game = GAMES[this.sel];
          this.sound('click');
          this.setMode('title');
        }
        break;

      case 'title':
        if (pressed('a') || pressed('start')) this.startRun();
        else if (pressed('b') || pressed('select')) {
          this.sound('back');
          this.setMode('menu');
        }
        break;

      case 'play':
        if (pressed('start')) {
          this.sound('switch');
          this.setMode('pause');
          break;
        }
        if (this.ready > 0) {
          this.ready--;
          if (this.ready === 40 || this.ready === 20) this.sound('beep', { pitch: -5 });
          if (this.ready === 0) this.sound('beep', { pitch: 7 });
        } else this.inst?.update();
        break;

      case 'pause':
        if (pressed('start') || pressed('b')) {
          this.sound('switch');
          this.setMode('play');
          break;
        }
        if (pressed('up')) {
          this.pauseSel = (this.pauseSel + PAUSE_ITEMS.length - 1) % PAUSE_ITEMS.length;
          this.sound('beep', { pitch: -2 });
        }
        if (pressed('down')) {
          this.pauseSel = (this.pauseSel + 1) % PAUSE_ITEMS.length;
          this.sound('beep');
        }
        if (pressed('select')) this.quitToMenu();
        else if (pressed('a')) {
          const it = PAUSE_ITEMS[this.pauseSel];
          if (it === 'RESUME') {
            this.sound('switch');
            this.setMode('play');
          } else if (it === 'RESTART') {
            useUI.getState().setFlag('consoleGame', null);
            this.startRun();
          } else this.quitToMenu();
        }
        break;

      case 'over': {
        // count the score up
        const d = this.score - this.shown;
        if (d > 0) {
          this.shown += Math.max(1, Math.ceil(d / 12));
          if (this.modeT % 3 === 0) this.sound('tick', { gain: 0.5 });
        }
        if (this.modeT > 80) {
          if (this.score > 0) this.setMode('name');
          else if (pressed('a') || pressed('start')) this.startRun();
          else if (pressed('b') || pressed('select')) this.quitToMenu();
        }
        break;
      }

      case 'name':
        this.shown = this.score;
        if (pressed('a')) this.events.onNameAction?.('submit');
        else if (pressed('b')) this.events.onNameAction?.('skip');
        break;

      case 'board':
        if (this.boardState !== 'ready') break;
        if (pressed('a') || pressed('start')) this.startRun();
        else if (pressed('b') || pressed('select')) this.quitToMenu();
        break;
    }

    if (this.mode !== 'pause') this.fx.update();
    inp.endStep();
  }

  /* --------------------------------------------------------------- render */
  private render() {
    const g = this.g;
    g.setTransform(1, 0, 0, 1, 0, 0);
    switch (this.mode) {
      case 'boot':
        this.drawBoot(g);
        break;
      case 'menu':
        this.drawMenu(g);
        break;
      case 'title':
        this.drawTitle(g);
        break;
      case 'play':
      case 'pause':
      case 'over':
      case 'name':
        this.drawPlay(g);
        if (this.mode === 'pause') this.drawPause(g);
        if (this.mode === 'over' || this.mode === 'name') this.drawOver(g);
        break;
      case 'board':
        this.drawBoard(g);
        break;
    }
  }

  private bg(g: CanvasRenderingContext2D, scroll = true) {
    rect(g, 0, 0, W, H, P.black);
    const o = scroll ? (this.t >> 2) % 8 : 0;
    for (let y = -8 + o; y < H; y += 8) for (let x = ((y - o) / 8) % 2 ? 4 : 0; x < W; x += 8) rect(g, x, y, 1, 1, P.deep);
  }

  private drawBoot(g: CanvasRenderingContext2D) {
    rect(g, 0, 0, W, H, P.black);
    const k = Math.min(1, this.modeT / 48);
    const ease = 1 - Math.pow(1 - k, 3);
    const y = -24 + ease * 70;
    text(g, 'CLOUD', W / 2, y, { scale: 3, align: 'center', color: P.pink, spacing: 1, shadow: P.pinkDk });
    if (this.modeT > 52) {
      text(g, 'ARCADE', W / 2, 74, { align: 'center', color: P.white, spacing: 3 });
      // three capsules pop in under the logo
      [P.pink, P.blue, P.mint].forEach((c, i) => {
        if (this.modeT > 56 + i * 6) {
          const cx = W / 2 - 14 + i * 14;
          rect(g, cx - 3, 92, 7, 3, c);
          rect(g, cx - 3, 95, 7, 3, P.light);
          rect(g, cx - 2, 91, 5, 1, c);
          rect(g, cx - 2, 98, 5, 1, P.light);
        }
      });
      if (this.modeT > 74) text(g, "ADELIA'S ROOM · REV 26.10", W / 2, 124, { align: 'center', color: P.alu });
    }
    if (this.modeT > 48 && this.modeT < 56) dither(g, 0, 0, W, H, P.white);
  }

  private drawMenu(g: CanvasRenderingContext2D) {
    this.bg(g);
    const bob = Math.round(Math.sin(this.t / 24));
    text(g, 'CLOUD', W / 2, 6 + bob, { scale: 2, align: 'center', color: P.pink, shadow: P.pinkDk });
    text(g, 'ARCADE', W / 2, 24, { align: 'center', color: P.white, spacing: 3 });
    for (let x = 12; x < W - 12; x += 3) rect(g, x, 36, 1, 1, P.graphite);

    const bests = game().stats.bestScores;
    GAMES.forEach((gd, i) => {
      const y = 42 + i * 26;
      const on = i === this.sel;
      if (on) {
        rect(g, 8, y, W - 16, 22, P.deep);
        frame(g, 8, y, W - 16, 22, P.pink);
        if (blink(this.t, 16)) text(g, '>', 3, y + 7, { color: P.pink });
      } else frame(g, 8, y, W - 16, 22, P.graphite);
      g.save();
      gd.icon(g, 14, y + 6, on ? this.t : 0);
      g.restore();
      text(g, gd.title, 32, y + 4, { color: on ? P.white : P.alu2 });
      const best = bests[gd.id] ?? 0;
      text(g, best ? `HI ${pad(best)}` : 'NEW CARTRIDGE', 32, y + 13, { color: on ? P.alu : P.steel });
      if (best >= gd.threshold) text(g, '★', W - 18, y + 8, { color: P.pink });
    });
    text(g, '↑↓ SELECT', 10, 126, { color: P.alu });
    if (blink(this.t, 24)) text(g, 'A PLAY', W - 10, 126, { color: P.pink, align: 'right' });
  }

  private drawTitle(g: CanvasRenderingContext2D) {
    this.bg(g, false);
    const gd = this.game;
    rect(g, 0, 0, W, 16, P.deep);
    text(g, gd.title, W / 2, 5, { align: 'center', color: P.pink });
    rect(g, 0, 16, W, 1, P.graphite);
    g.save();
    g.translate(W / 2 - 12, 22);
    g.scale(2, 2);
    gd.icon(g, 0, 0, this.t);
    g.restore();
    gd.how.forEach((l, i) => text(g, l, W / 2, 50 + i * 9, { align: 'center', color: P.light }));
    for (let x = 30; x < W - 30; x += 3) rect(g, x, 80, 1, 1, P.graphite);
    gd.controls.forEach((l, i) => text(g, l, W / 2, 86 + i * 9, { align: 'center', color: P.pinkLt }));
    const best = game().stats.bestScores[gd.id] ?? 0;
    text(g, `HI ${pad(best)}  ★ ${gd.threshold}`, W / 2, 108, { align: 'center', color: P.alu });
    if (blink(this.t, 24)) text(g, 'PRESS A', W / 2, 124, { align: 'center', color: P.pink });
    text(g, 'B BACK', 4, 134, { color: P.steel });
  }

  private drawHud(g: CanvasRenderingContext2D) {
    rect(g, 0, 0, W, HUD_H - 1, P.night);
    rect(g, 0, HUD_H - 1, W, 1, P.graphite);
    text(g, pad(this.score), 3, 3, { color: P.pink });
    const hi = Math.max(this.best, this.score);
    text(g, `HI ${pad(hi)}`, W - 3, 3, { color: this.score > this.best && this.best > 0 && blink(this.t, 10) ? P.white : P.alu2, align: 'right' });
    this.inst?.hud?.(g, this.t);
  }

  private drawPlay(g: CanvasRenderingContext2D) {
    const [sx, sy] = this.mode === 'play' ? this.fx.offset() : [0, 0];
    g.save();
    g.translate(sx, sy);
    this.inst?.render(g, this.t);
    this.fx.render(g);
    g.restore();
    this.drawHud(g);
    if (this.mode === 'play' && this.ready > 0) {
      const label = this.ready > 20 ? 'READY' : 'GO!';
      if (this.ready > 20 || blink(this.ready, 4)) {
        const w = measure(label) * 2 + 12;
        rect(g, W / 2 - w / 2, 58, w, 22, P.black);
        frame(g, W / 2 - w / 2, 58, w, 22, P.pink);
        text(g, label, W / 2, 62, { scale: 2, align: 'center', color: this.ready > 20 ? P.white : P.pink });
      }
    }
    this.fx.renderFlash(g);
  }

  private drawPause(g: CanvasRenderingContext2D) {
    dither(g, 0, HUD_H, W, H - HUD_H);
    rect(g, 28, 28, 104, 92, P.black);
    frame(g, 28, 28, 104, 92, P.alu);
    text(g, 'PAUSED', W / 2, 37, { scale: 2, align: 'center', color: P.white });
    PAUSE_ITEMS.forEach((it, i) => {
      const y = 62 + i * 12;
      const on = i === this.pauseSel;
      if (on) rect(g, 40, y - 2, 80, 11, P.deep);
      text(g, (on ? '> ' : '') + it, W / 2, y, { align: 'center', color: on ? P.pink : P.alu2 });
    });
    text(g, 'START = RESUME', W / 2, 105, { align: 'center', color: P.steel });
  }

  private drawOver(g: CanvasRenderingContext2D) {
    const k = Math.min(1, this.overT / 14);
    dither(g, 0, HUD_H, W, H - HUD_H);
    const top = 16;
    const h = this.mode === 'name' ? 70 : 104;
    rect(g, 12, top, W - 24, h * k, P.black);
    frame(g, 12, top, W - 24, Math.max(2, h * k), P.pink);
    if (k < 1) return;
    text(g, 'GAME OVER', W / 2, top + 6, { scale: 2, align: 'center', color: P.pink, shadow: P.pinkDk });
    text(g, 'SCORE', W / 2, top + 26, { align: 'center', color: P.alu });
    text(g, pad(this.shown), W / 2, top + 36, { scale: 2, align: 'center', color: P.white });
    const r = this.result;
    const done = this.shown >= this.score;
    if (done) {
      const line = r.isBest ? 'NEW BEST!' : `BEST ${pad(Math.max(this.best, this.score))}`;
      if (!r.isBest || blink(this.t, 10)) text(g, line, W / 2, top + 54, { align: 'center', color: r.isBest ? P.pink : P.alu });
    }
    if (this.mode === 'over' && done) {
      const bits = [r.cp > 0 ? `+${r.cp} ♥` : '', r.high ? '★ HIGH SCORE' : ''].filter(Boolean).join(' · ');
      if (bits) text(g, bits, W / 2, top + 66, { align: 'center', color: r.high ? P.pink : P.blueLt });
      if (this.score === 0 && this.modeT > 80) {
        text(g, 'A RETRY', 30, top + 88, { color: P.pink });
        text(g, 'B MENU', W - 30, top + 88, { color: P.alu, align: 'right' });
      }
    }
  }

  private drawBoard(g: CanvasRenderingContext2D) {
    this.bg(g, false);
    rect(g, 0, 0, W, 22, P.deep);
    text(g, 'HALL OF FAME', W / 2, 3, { align: 'center', color: P.pink });
    text(g, this.game.title, W / 2, 12, { align: 'center', color: P.alu });
    rect(g, 0, 22, W, 1, P.graphite);
    if (this.boardState !== 'ready' || !this.board) {
      const dots = '.'.repeat((this.t >> 3) % 4);
      text(g, 'SYNCING' + dots, W / 2 - measure('SYNCING') / 2, 66, { color: P.alu2 });
      return;
    }
    if (!this.board.length) {
      text(g, 'NO SCORES YET', W / 2, 56, { align: 'center', color: P.alu2 });
      text(g, 'BE THE FIRST', W / 2, 68, { align: 'center', color: P.pink });
    }
    for (let i = this.board.length; i < 10 && this.board.length; i++) {
      const y = 27 + i * 10;
      text(g, String(i + 1).padStart(2, '0'), 8, y, { color: P.graphite });
      for (let x = 24; x < 100; x += 4) rect(g, x, y + 6, 2, 1, P.graphite);
      text(g, '------', W - 8, y, { align: 'right', color: P.graphite });
    }
    this.board.forEach((r, i) => {
      const y = 27 + i * 10;
      if (r.me) {
        rect(g, 4, y - 2, W - 8, 10, blink(this.t, 20) ? P.pinkDk : P.deep);
      }
      text(g, String(i + 1).padStart(2, '0'), 8, y, { color: r.me ? P.white : P.steel });
      text(g, r.name, 24, y, { color: r.me ? P.white : P.light });
      text(g, pad(r.score), W - 8, y, { align: 'right', color: r.me ? P.white : P.pink });
    });
    rect(g, 0, 127, W, 1, P.graphite);
    if (this.boardRank > 10) text(g, `YOU #${this.boardRank}`, W / 2, 132, { align: 'center', color: P.pinkLt });
    else if (this.boardLocal) text(g, 'LOCAL', W / 2, 132, { align: 'center', color: P.steel });
    text(g, 'A RETRY', 4, 132, { color: blink(this.t, 24) ? P.pink : P.pinkDk });
    text(g, 'B MENU', W - 4, 132, { align: 'right', color: P.alu });
  }
}

export type { GameId };
