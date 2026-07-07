import { CONFIG } from './config.js?v=20260706p';
import { getState, load, save } from './state.js?v=20260706p';
import { startGame } from './game.js?v=20260706p';

// =========== SANDSLIDE — Boot ===========
// Load state, hand the canvas to the game core, then fade the preloader out.

function init(){
  load();
  const s = getState();
  document.documentElement.lang = s.settings.lang || CONFIG.defaultLang;
  save(); // ensure a save exists from first run

  const canvas = document.getElementById('game-canvas');
  startGame(canvas);

  if (window.__egyptReady) window.__egyptReady();
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();
