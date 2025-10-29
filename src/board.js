import { Gem } from './gem.js';

export class Board {
  constructor() {
    this.gems = [];
  }

  addGem(gem = new Gem()) {
    this.gems.push(gem);
  }
}
