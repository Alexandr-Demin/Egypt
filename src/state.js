import { CONFIG } from './config.js?v=20260706u';

// =========== State & persistence ===========
// One source of truth. getState() is read-only; mutate via patch()/save().

const DEFAULT = () => ({
  v: 1,
  createdAt: Date.now(),
  lastSeen: Date.now(),

  // settings
  settings: { sound: true, lang: CONFIG.defaultLang },

  // tutorial bookkeeping (replays when build tag changes — see config.js)
  tutorialBuild: null,

  // gameplay progress (fill in as the game grows)
  progress: { level: 1, best: 0 },

  // stats
  stats: { runs: 0, score: 0 },
});

let state = null;
const listeners = new Set();

export function getState(){ return state; }
export function subscribe(fn){ listeners.add(fn); return () => listeners.delete(fn); }
function emit(){ for (const fn of listeners) { try { fn(state); } catch(e){} } }

// Hardened load: a corrupt / non-JSON payload must never throw — fall back to
// DEFAULT (BUG-001 family guard). Unknown persisted keys are merged shallowly
// so older saves keep working after the shape grows.
export function load(){
  try {
    const raw = localStorage.getItem(CONFIG.saveKey);
    if (raw){
      const p = JSON.parse(raw);
      if (!p || typeof p !== 'object') throw new Error('not an object');
      const d = DEFAULT();
      state = { ...d, ...p };
      state.settings = { ...d.settings, ...(p.settings || {}) };
      state.progress = { ...d.progress, ...(p.progress || {}) };
      state.stats    = { ...d.stats,    ...(p.stats    || {}) };
    } else {
      state = DEFAULT();
    }
  } catch(e){
    state = DEFAULT();
  }
  return state;
}

export function save(){
  try { state.lastSeen = Date.now(); localStorage.setItem(CONFIG.saveKey, JSON.stringify(state)); } catch(e){}
}

// Shallow patch + persist + notify. Pass a partial object.
export function patch(partial){
  if (!state) load();
  Object.assign(state, partial);
  save(); emit();
  return state;
}

export function reset(){
  try { localStorage.removeItem(CONFIG.saveKey); } catch(e){}
  state = DEFAULT(); save(); emit();
  return state;
}
