import { Gem } from "./gem.js";
import { fuseGems } from "./recipes.js";

const COLORS = ['R','B','G','Y'];

export class Board {
  constructor(cols=6, rows=10, canvas, assets) {
    this.cols=cols; this.rows=rows;
    this.grid = Array.from({length:rows},()=>Array(cols).fill(null));
    this.spawnCol = Math.floor(cols/2);
    this.fallGem = null;
    this.fallSpeed = 4; // rows per second

    // selection (drag to choose exactly 2 adjacent settled cells)
    this.drag = {active:false, path:[]};

    // UI geometry (for hit-testing drag)
    this.canvas = canvas;
    this.ox = 0;
    this.oy = 0;
    this.cell = 1;
    this.assets = assets;

    this.pendingFusion = null; // {heal,block,poison,dmg}
    this.didOverflow = false;

    // input
    const down = e=>this.beginDrag(this.toCell(e));
    const move = e=>this.moveDrag(this.toCell(e));
    const up   = ()=>this.endDrag();
    canvas.addEventListener("mousedown", down);
    canvas.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
    canvas.addEventListener("touchstart", ev=>down(ev.touches[0]), {passive:true});
    canvas.addEventListener("touchmove",  ev=>{move(ev.touches[0]); ev.preventDefault();},{passive:false});
    window.addEventListener("touchend",   up);

    this.spawnNewGem();
  }

  reset(){
    this.grid.forEach(r=>r.fill(null));
    this.fallGem = null;
    this.spawnNewGem();
  }

  // ---- Spawn/Update ----
  spawnNewGem(){
    const color = COLORS[Math.floor(Math.random()*COLORS.length)];
    this.fallGem = new Gem({color, size:'small', row:-1, col:this.spawnCol, state:'falling'});
  }

  canFall(g){
    const nr = g.row+1;
    if (nr >= this.rows) return false;
    if (nr < 0) return true;
    return this.grid[nr][g.col] === null;
  }

  settleGem(g){
    if (g.row < 0){ // overflow
      this.didOverflow = true;
      // Clear top row as a soft punish.
      for (let c=0;c<this.cols;c++) this.grid[0][c]=null;
      this.collapse();
    } else {
      this.grid[g.row][g.col] = g;
      g.state = 'settled';
      this.collapse();
    }
    this.spawnNewGem();
  }

  collapse(){
    for (let c=0;c<this.cols;c++){
      let write = this.rows-1;
      for (let r=this.rows-1; r>=0; r--){
        const g = this.grid[r][c];
        if (g){
          if (r!==write){ this.grid[write][c]=g; g.row=write; this.grid[r][c]=null; }
          write--;
        }
      }
    }
  }

  update(dt){
    // Falling
    if (this.fallGem){
      this.fallGem.row += this.fallSpeed*dt;
      const nextRow = Math.floor(this.fallGem.row + 1);
      const hitFloor = nextRow >= this.rows;
      const hitGem   = nextRow >= 0 && this.grid[nextRow][this.fallGem.col];

      if (hitFloor || hitGem){
        this.fallGem.row = Math.floor(this.fallGem.row);
        this.settleGem(this.fallGem);
        this.fallGem = null; // will be respawned by settleGem
      }
    }
  }

  setLayout({ox, oy, cell}={}){
    if (typeof ox === "number") this.ox = ox;
    if (typeof oy === "number") this.oy = oy;
    if (typeof cell === "number" && cell > 0) this.cell = cell;
  }

  // ---- Selection (exactly 2 orthogonally adjacent settled gems) ----
  toCell(e){
    if (!e || !this.canvas) return null;
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    const localX = (e.clientX - rect.left) * scaleX;
    const localY = (e.clientY - rect.top) * scaleY;
    const c = Math.floor((localX - this.ox)/this.cell);
    const r = Math.floor((localY - this.oy)/this.cell);
    return {r,c};
  }

  beginDrag(pos){
    if (!pos) return;
    const {r,c} = pos;
    if (!this.inBounds(r,c)) return;
    const g = this.grid[r][c];
    if (!g) return;
    this.drag = {active:true, path:[{r,c}]};
  }

  moveDrag(pos){
    if (!this.drag.active || !pos) return;
    const {r,c} = pos;
    if (!this.inBounds(r,c)) return;
    const last = this.drag.path[this.drag.path.length-1];
    if (!last) return;
    if (Math.abs(r-last.r)+Math.abs(c-last.c) !== 1) return; // orthogonal
    if (!this.grid[r][c]) return;
    if (this.drag.path.find(p=>p.r===r&&p.c===c)) return; // no revisits
    if (this.drag.path.length >= 2) return; // only two for now
    this.drag.path.push({r,c});
  }

  endDrag(){
    if (!this.drag.active) return;
    const path = this.drag.path; this.drag = {active:false, path:[]};
    if (path.length !== 2) return;

    const [a,b] = path.map(p=>this.grid[p.r][p.c]).filter(Boolean);
    if (!a || !b) return;

    // Fuse
    const fx = fuseGems(a,b);
    this.pendingFusion = fx;

    // Remove selected gems
    for (const p of path){ this.grid[p.r][p.c] = null; }
    this.collapse();
  }

  inBounds(r,c){ return r>=0 && r<this.rows && c>=0 && c<this.cols; }

  // ---- Drawing ----
  draw(ctx){
    const boardW = this.cols*this.cell;
    const boardH = this.rows*this.cell;

    ctx.save();
    ctx.beginPath();
    ctx.rect(this.ox, this.oy, boardW, boardH);
    ctx.clip();

    // settled
    for (let r=0;r<this.rows;r++){
      for (let c=0;c<this.cols;c++){
        const g = this.grid[r][c];
        if (g) this.drawGem(ctx, g.color, this.ox+c*this.cell, this.oy+r*this.cell);
      }
    }

    // falling
    if (this.fallGem){
      const fy = this.oy + this.fallGem.row*this.cell;
      this.drawGem(ctx, this.fallGem.color, this.ox+this.fallGem.col*this.cell, fy, true);
    }

    // drag highlight
    ctx.globalAlpha = 0.35;
    for (const p of this.drag.path){
      const g = this.grid[p.r][p.c];
      if (g) this.drawGem(ctx, g.color, this.ox+p.c*this.cell, this.oy+p.r*this.cell);
    }
    ctx.globalAlpha = 1;

    ctx.restore();
  }

  drawGem(ctx, color, x, y, outline=false){
    const key = `gem_${color}_small`;
    const padding = 4;
    const size = this.cell - padding * 2;
    const sprite = this.assets?.[key];
    const drawX = Math.round(x + padding);
    const drawY = Math.round(y + padding);
    const drawSize = Math.round(size);
    if (sprite){
      ctx.drawImage(sprite, drawX, drawY, drawSize, drawSize);
    } else {
      const map = {R:"#e45357", B:"#58a8ff", G:"#6bd46b", Y:"#f7c64b"};
      ctx.fillStyle = map[color] || "#ccc";
      ctx.fillRect(drawX,drawY,drawSize,drawSize);
    }
    if (outline){ ctx.strokeStyle="#fff"; ctx.strokeRect(drawX,drawY,drawSize,drawSize); }
  }
}
