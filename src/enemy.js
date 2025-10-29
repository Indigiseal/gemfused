export class Enemy{
  constructor(assets){ this.assets = assets; this.reset(); }
  reset(){
    this.maxHp=40; this.hp=40;
    this.wind=3.0; this.t=0;       // wind-up seconds
    this.poison=0; this.stun=0;    // debuffs
  }
  update(dt, game){
    // apply poison at tick of attack (simple)
    if (this.stun>0){ this.stun-=dt; return; }

    this.t += dt;
    if (this.t >= this.wind){
      const dmg = 6;
      game.damagePlayer(dmg);
      game.player.block = 0; // reset block on enemy hit
      if (this.poison>0){ game.damagePlayer(this.poison, true); }
      this.t = 0;
    }
  }
  damage(n){ this.hp -= n; if (this.hp<=0) this.reset(); }
  windupRatio(){ return this.t/this.wind; }
  draw(ctx,x,y){
    const slime = this.assets?.slime;
    if (slime){
      const dx = x - slime.width/2;
      const dy = y - slime.height/2;
      ctx.drawImage(slime, dx, dy);
    } else {
      ctx.fillStyle="#3fa24f"; ctx.beginPath(); ctx.arc(x,y,36,0,Math.PI*2); ctx.fill();
    }
    // hp bar
    const barW = 160 * scale;
    const barH = 10 * scale;
    const barX = x - barW/2;
    const barY = y + 48 * scale;
    ctx.fillStyle="#333"; ctx.fillRect(barX, barY, barW, barH);
    ctx.fillStyle="#f55"; ctx.fillRect(barX, barY, barW*(this.hp/this.maxHp), barH);
  }
}
