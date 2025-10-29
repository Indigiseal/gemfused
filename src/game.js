import { Board } from "./board.js";
import { Enemy } from "./enemy.js";

export class Game {
  constructor(canvas, assets) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.ctx.imageSmoothingEnabled = false;
    this.assets = assets;
    this.board = new Board(6, 10, canvas, assets);
    this.player = { hp: 30, maxHp: 30, block: 0 };
    this.enemy = new Enemy(assets);
    this._loopHandle = null;
    this.layout = null;
    this.handleResize = () => this.updateLayout();

    this.updateLayout();
    window.addEventListener("resize", this.handleResize);
  }

  start() {
    let last = performance.now();
    const step = (time) => {
      const dt = Math.min(0.033, (time - last) / 1000);
      last = time;
      this.update(dt);
      this.draw();
      this._loopHandle = requestAnimationFrame(step);
    };
    this._loopHandle = requestAnimationFrame(step);
  }

  stop() {
    if (this._loopHandle !== null) {
      cancelAnimationFrame(this._loopHandle);
      this._loopHandle = null;
    }
    if (this.handleResize) {
      window.removeEventListener("resize", this.handleResize);
      this.handleResize = null;
    }
  }

  update(dt) {
    this.board.update(dt);

    // Consume fusion output (if any)
    if (this.board.pendingFusion) {
      const fx = this.board.pendingFusion;
      this.board.pendingFusion = null;
      if (fx.dmg) this.enemy.damage(fx.dmg);
      if (fx.block) this.player.block += fx.block;
      if (fx.heal)
        this.player.hp = Math.min(this.player.maxHp, this.player.hp + fx.heal);
      if (fx.poison) this.enemy.poison += fx.poison;
    }

    this.enemy.update(dt, this);
  }

  damagePlayer(amount, trueDmg = false) {
    let dmg = amount;
    if (!trueDmg) {
      const absorb = Math.min(this.player.block, dmg);
      this.player.block -= absorb;
      dmg -= absorb;
    }
    this.player.hp -= dmg;
    if (this.player.hp <= 0) this.resetRun();
  }

  resetRun() {
    this.player = { hp: 30, maxHp: 30, block: 0 };
    this.board.reset();
    this.enemy.reset();
  }

  draw(ctx = this.ctx) {
    if (!this.layout) this.updateLayout();

    const { frame, frameScale, board } = this.layout;
    const boardWidth = this.board.cols * this.board.cell;
    const boardHeight = this.board.rows * this.board.cell;

    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    if (this.assets?.frame) {
      ctx.drawImage(this.assets.frame, 0, 0, this.canvas.width, this.canvas.height);
    }
    if (this.assets?.spout) {
      const spout = this.assets.spout;
      const sx = (this.canvas.width - spout.width) / 2;
      ctx.drawImage(spout, sx, 36);
    }

    if (this.assets?.frame) {
      ctx.drawImage(this.assets.frame, frame.x, frame.y, frame.width, frame.height);
    }

    if (this.assets?.spout) {
      const spout = this.assets.spout;
      const spoutW = spout.width * frameScale;
      const spoutH = spout.height * frameScale;
      const sx = board.ox + (boardWidth - spoutW) / 2;
      const sy = board.oy - spoutH + 6 * frameScale;
      ctx.drawImage(spout, sx, sy, spoutW, spoutH);
    }

    // enemy area
    const enemyX = frame.x + frame.width / 2;
    const enemyY = board.oy - 12 * frameScale;
    const enemyHeight = this.assets?.slime
      ? this.assets.slime.height * frameScale
      : 72 * frameScale;
    this.enemy.draw(ctx, enemyX, enemyY, frameScale);

    // board and gems
    this.board.draw(ctx);

    // intent/wind-up bar
    const intentW = 220 * frameScale;
    const intentH = 12 * frameScale;
    const intentX = enemyX - intentW / 2;
    const desiredIntentY = enemyY + enemyHeight / 2 + 8 * frameScale;
    const minIntentY = frame.y + 12 * frameScale;
    const maxIntentY = board.oy - intentH - 8 * frameScale;
    const intentY = Math.max(minIntentY, Math.min(maxIntentY, desiredIntentY));
    ctx.fillStyle = "#333";
    ctx.fillRect(intentX, intentY, intentW, intentH);
    ctx.fillStyle = "#ff4b6b";
    ctx.fillRect(intentX, intentY, intentW * this.enemy.windupRatio(), intentH);

    // HUD
    const hudLeft = frame.x + 16 * frameScale;
    const hudTop = Math.min(
      frame.y + frame.height - 64 * frameScale,
      board.oy + boardHeight + 16 * frameScale
    );
    const hpHeight = 14 * frameScale;
    const blockHeight = 10 * frameScale;
    const hudWidth = 200 * frameScale;

    if (this.assets?.button_drop) {
      const button = this.assets.button_drop;
      const bx = this.canvas.width - button.width - 40;
      const by = this.canvas.height - button.height - 40;
      ctx.drawImage(button, bx, by);
    }

    // UI bars
    const bar = (bx, by, w, h, ratio, color) => {
      ctx.fillStyle = "#333";
      ctx.fillRect(bx, by, w, h);
      ctx.fillStyle = color;
      ctx.fillRect(bx, by, w * ratio, h);
    };

    bar(hudLeft, hudTop, hudWidth, hpHeight, this.player.hp / this.player.maxHp, "#e45357");
    bar(
      hudLeft,
      hudTop + hpHeight + 6 * frameScale,
      hudWidth,
      blockHeight,
      Math.min(1, this.player.block / 20),
      "#58a8ff"
    );

    ctx.fillStyle = "#fff";
    ctx.font = `${Math.max(12, Math.round(12 * frameScale))}px monospace`;
    ctx.fillText(`HP ${this.player.hp}`, hudLeft, hudTop - 6 * frameScale);
    ctx.fillText(
      `Block ${this.player.block}`,
      hudLeft,
      hudTop + hpHeight + blockHeight + 12 * frameScale
    );

    if (this.assets?.button_drop) {
      const button = this.assets.button_drop;
      const buttonW = button.width * frameScale;
      const buttonH = button.height * frameScale;
      const bx = frame.x + frame.width - buttonW - 18 * frameScale;
      const by = frame.y + frame.height - buttonH - 18 * frameScale;
      ctx.drawImage(button, bx, by, buttonW, buttonH);
    }
  }

  updateLayout() {
    this.layout = this.computeLayout();
    this.board.setLayout(this.layout.board);
  }

  computeLayout() {
    const defaultLayout = {
      frame: { x: 0, y: 0, width: this.canvas.width, height: this.canvas.height },
      frameScale: 1,
      board: { ox: 48, oy: 360, cell: 48 },
    };

    const frame = this.assets?.frame;
    if (!frame) return defaultLayout;

    const scale = Math.min(
      this.canvas.width / frame.width,
      this.canvas.height / frame.height
    );

    const drawWidth = frame.width * scale;
    const drawHeight = frame.height * scale;
    const frameX = (this.canvas.width - drawWidth) / 2;
    const frameY = (this.canvas.height - drawHeight) / 2;

    const baseCell = 9;
    const baseBoardWidth = baseCell * this.board.cols;
    const boardMarginX = (frame.width - baseBoardWidth) / 2;
    const boardBaseY = 23;

    const boardLayout = {
      ox: frameX + boardMarginX * scale,
      oy: frameY + boardBaseY * scale,
      cell: baseCell * scale,
    };

    return {
      frame: { x: frameX, y: frameY, width: drawWidth, height: drawHeight },
      frameScale: scale,
      board: boardLayout,
    };
  }
}
