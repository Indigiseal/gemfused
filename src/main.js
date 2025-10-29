import { Game } from './game.js';
import { loadAssets } from './assets.js';

const canvas = document.getElementById('game');

if (canvas instanceof HTMLCanvasElement) {
  loadAssets()
    .then((assets) => {
      window.gameAssets = assets;
      const game = new Game(canvas, assets);
      game.start();
    })
    .catch((error) => {
      console.error('Failed to load assets', error);
    });
} else {
  console.error('Game canvas element not found.');
}
