export class Input {
  constructor() {
    this.keys = new Set();
  }

  attach(target = window) {
    target.addEventListener('keydown', (event) => this.keys.add(event.key));
    target.addEventListener('keyup', (event) => this.keys.delete(event.key));
  }
}
