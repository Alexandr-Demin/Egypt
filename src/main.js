import { CONFIG } from './config.js?v=20260618a';
import { getState, load, save, subscribe } from './state.js?v=20260618a';
import { $, toast } from './ui.js?v=20260618a';
import * as sound from './sound.js?v=20260618a';

// =========== EGYPT — Boot ===========
// Entry point. Loads state, mounts the (placeholder) game surface, then tells
// the inline preloader it can fade out via window.__egyptReady().

function fitCanvas(){
  const cv = $('#game-canvas'); if (!cv) return;
  const wrap = $('#stage');
  const w = Math.min(440, wrap.clientWidth || window.innerWidth);
  const h = wrap.clientHeight || Math.round(w * 1.4);
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  cv.width = w * dpr; cv.height = h * dpr;
  cv.style.width = w + 'px'; cv.style.height = h + 'px';
  const ctx = cv.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { ctx, w, h };
}

// Placeholder render — proves the canvas + state pipeline is wired.
function render(){
  const r = fitCanvas(); if (!r) return;
  const { ctx, w, h } = r;
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#0e0a06'; ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#ffcf6b';
  ctx.font = '900 30px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('EGYPT', w / 2, h / 2 - 8);
  ctx.fillStyle = 'rgba(243,230,200,.6)';
  ctx.font = '600 13px system-ui, sans-serif';
  ctx.fillText('scaffold ready · build ' + CONFIG.build, w / 2, h / 2 + 18);
}

function init(){
  load();
  const s = getState();

  // Apply persisted language to <html lang>.
  document.documentElement.lang = s.settings.lang || CONFIG.defaultLang;

  // first-run touch so a save exists immediately
  save();

  render();
  window.addEventListener('resize', render, { passive: true });
  subscribe(render);

  // expose a tiny debug surface (mirrors STRAIN's dev hooks convention)
  window.dbg = { state: getState, save, sound, toast };

  // hand off to the inline preloader
  if (window.__egyptReady) window.__egyptReady();
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();
