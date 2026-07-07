// =========== SANDSLIDE — Sound ===========
// Minimal WebAudio blip layer + a persisted on/off toggle. Swap in real
// samples later; the public surface (play / setEnabled / isEnabled) stays.

import { getState, patch } from './state.js?v=20260706o';

let ctx = null;
function ac(){
  if (!ctx) { try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch(e){ ctx = null; } }
  return ctx;
}

export function isEnabled(){ const s = getState(); return s ? s.settings.sound !== false : true; }

export function setEnabled(on){
  const s = getState(); if (!s) return;
  patch({ settings: { ...s.settings, sound: !!on } });
}

// name: 'tap' | 'win' | 'lose' — simple synthesized tones for now.
export function play(name){
  if (!isEnabled()) return;
  const a = ac(); if (!a) return;
  const o = a.createOscillator(), g = a.createGain();
  const freq = { tap: 440, win: 720, lose: 180 }[name] || 440;
  o.frequency.value = freq;
  o.type = name === 'lose' ? 'sawtooth' : 'sine';
  g.gain.value = 0.0001;
  o.connect(g); g.connect(a.destination);
  const t = a.currentTime;
  g.gain.exponentialRampToValueAtTime(0.18, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
  o.start(t); o.stop(t + 0.2);
}
