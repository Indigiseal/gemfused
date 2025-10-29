import { Gem } from "./gem.js";
import { fuseGems } from "./recipes.js";

const COLORS = ['R','B','G','Y'];

export class Board {
  constructor(cols=6, rows=10, canvas) {
    this.cols=cols; this.rows=rows;
    this.grid = Array.from({length:rows},()=>Array(cols).fill(null));
    this.spawnCol = Math.floor(cols/2);
    this.fallGem = null;
    this.fallSpeed = 4; // rows per second

    // selection (drag to choose exactly 2 adjacent settled cells)
    this.drag = {active:false, path:[]};

    // UI geometry (for hit-testing drag)
    this.ox = 48; this.oy = 360; this.cell = 48;

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

  // ---- Selection (exactly 2 orthogonally adjacent settled gems) ----
  toCell(e){
    const x = e.clientX, y=e.clientY;
    const c = Math.floor((x - this.ox)/this.cell);
    const r = Math.floor((y - this.oy)/this.cell);
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
    // tray border
    ctx.strokeStyle="#9aa1a8";
    ctx.strokeRect(this.ox-8, this.oy-8, this.cols*this.cell+16, this.rows*this.cell+16);

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
  }

  drawGem(ctx, color, x, y, outline=false){
    const map = {R:"#e45357", B:"#58a8ff", G:"#6bd46b", Y:"#f7c64b"};
    ctx.fillStyle = map[color] || "#ccc";
    ctx.fillRect(x+4,y+4,this.cell-8,this.cell-8);
    if (outline){ ctx.strokeStyle="#fff"; ctx.strokeRect(x+4,y+4,this.cell-8,this.cell-8); }
  }
}
