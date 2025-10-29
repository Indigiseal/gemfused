// A single 1x1 gem on the board.
export class Gem {
  // color: 'R'|'B'|'G'|'Y'
  // size: 'small'|'medium'|'big'
  constructor({color='Y', size='small', row=-1, col=0, state='falling'} = {}) {
    this.color = color;
    this.size = size;
    this.row = row;
    this.col = col;
    this.state = state; // 'falling'|'settled'|'selected'
  }
}
