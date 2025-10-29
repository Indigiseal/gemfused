import { Game } from './game.js';
import { loadAssets } from './assets.js';

const OVERLAY_ID = 'gemfused-error-overlay';

const ensureOverlay = () => {
  let overlay = document.getElementById(OVERLAY_ID);
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = OVERLAY_ID;
    document.body.appendChild(overlay);
  }
  return overlay;
};

const showErrorOverlay = (message) => {
  const overlay = ensureOverlay();
  overlay.textContent = message;
  overlay.classList.add('visible');
};

const hideErrorOverlay = () => {
  const overlay = document.getElementById(OVERLAY_ID);
  if (overlay) {
    overlay.classList.remove('visible');
    overlay.textContent = '';
  }
};

window.addEventListener('error', (event) => {
  showErrorOverlay(`Runtime error: ${event.message}`);
});

window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason instanceof Error ? event.reason.message : String(event.reason);
  showErrorOverlay(`Unhandled rejection: ${reason}`);
});

const canvas = document.getElementById('game');

if (canvas instanceof HTMLCanvasElement) {
  loadAssets()
    .then((assets) => {
      window.gameAssets = assets;
      const game = new Game(canvas, assets);
      game.start();
      hideErrorOverlay();
      console.log('Gemfused booted');
    })
    .catch((error) => {
      console.error('Failed to load assets', error);
      showErrorOverlay(`Failed to load assets: ${error.message ?? error}`);
    });
} else {
  const message = 'Game canvas element not found.';
  console.error(message);
  showErrorOverlay(message);
}
