import { Board } from "./board.js";
import { Enemy } from "./enemy.js";

export class Game{
  constructor(canvas){
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.board = new Board(6,10, canvas);
    this.player = { hp:30, maxHp:30, block:0 };
    this.enemy  = new Enemy();
  }

  update(dt){
    this.board.update(dt);

    // Consume fusion output (if any)
    if (this.board.pendingFusion){
      const fx = this.board.pendingFusion; this.board.pendingFusion = null;
      if (fx.dmg)   this.enemy.damage(fx.dmg);
      if (fx.block) this.player.block += fx.block;
      if (fx.heal)  this.player.hp = Math.min(this.player.maxHp, this.player.hp + fx.heal);
      if (fx.poison) this.enemy.poison += fx.poison;
    }

    this.enemy.update(dt, this);
  }

  damagePlayer(amount, trueDmg=false){
    let dmg = amount;
    if (!trueDmg){
      const absorb = Math.min(this.player.block, dmg);
      this.player.block -= absorb;
      dmg -= absorb;
    }
    this.player.hp -= dmg;
    if (this.player.hp<=0) this.resetRun();
  }

  resetRun(){
    this.player = { hp:30, maxHp:30, block:0 };
    this.board.reset();
    this.enemy.reset();
  }

  draw(ctx=this.ctx){
    ctx.clearRect(0,0,this.canvas.width,this.canvas.height);

    // enemy area
    this.enemy.draw(ctx, this.canvas.width/2, 180);

    // intent/wind-up bar
    const x= this.canvas.width/2 - 100, y=120, w=200, h=12;
    ctx.fillStyle="#333"; ctx.fillRect(x,y,w,h);
    ctx.fillStyle="#ff4b6b"; ctx.fillRect(x,y,w*this.enemy.windupRatio(),h);

    // board
    this.board.draw(ctx);

    // UI bars
    const bar=(bx,by,w,h,ratio,color)=>{
      ctx.fillStyle="#333"; ctx.fillRect(bx,by,w,h);
      ctx.fillStyle=color;  ctx.fillRect(bx,by,w*ratio,h);
    };
    bar(24, 520, 200, 16, this.player.hp/this.player.maxHp, "#e45357"); // HP
    bar(24, 544, 200, 12, Math.min(1, this.player.block/20), "#58a8ff"); // Block

    ctx.fillStyle="#fff"; ctx.font="16px monospace";
    ctx.fillText(`HP ${this.player.hp}`, 232, 533);
    ctx.fillText(`Block ${this.player.block}`, 232, 548);
  }
}
