import { Game } from './game.js';

const canvas = document.getElementById('game');

if (canvas instanceof HTMLCanvasElement) {
  const game = new Game(canvas);
  game.start();
} else {
  console.error('Game canvas element not found.');
}
