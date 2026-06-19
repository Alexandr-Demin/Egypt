# EGYPT — QA rulebook

This is the **gating** document for `CLAUDE.md`'s "QA before push" hard rule.
Run the smoke set after every change; add the targeted probes mapped from the
changed files. Push only when green.

---

## 1. Smoke set (always, ≤30s)

| # | Probe | Pass criterion |
|---|---|---|
| S1 | Hard-reload `/?_cb=<ts>` | No console errors. |
| S2 | `load()` then `getState()` | Valid object, expected keys present. |
| S3 | `CONFIG.build` | Equals the `?v=…` used in every import. |
| S4 | Main view / canvas mounts | `#game-canvas` width & height > 0, no errors. |
| S5 | Corrupt save → `load()` | Falls back to DEFAULT, no throw. |

## 2. Targeted probes

### 2.1 Persistence (`src/state.js`)
- Corrupt payload (`'{NOT-JSON'`) → DEFAULT, no throw.
- Old save missing new keys → shallow-merged, no `undefined` reads.
- `patch()` persists + notifies subscribers; `reset()` clears the key.

### 2.2 Boot (`src/main.js`)
- `load()` → render → `window.__egyptReady()` fires (preloader fades).
- Resize re-renders the canvas at correct DPR.
- 6s safety timer hides the preloader even if init stalls.

### 2.3 UI (`src/ui.js`)
- Every dynamic innerHTML sink is wrapped in `escapeHtml`.
- `toast` / `alertBig` render then auto-dismiss; no leaked DOM nodes.

### 2.4 Sound (`src/sound.js`)
- `setEnabled(false)` → `play()` is a no-op and persists across reload.
- No throw when AudioContext is unavailable.

### 2.5 PWA (`sw.js`, `index.html`)
- SW stays out of the way on localhost.
- `CACHE` bumped when SW behavior changed; stale caches purged on activate.

### 2.6 Build pipeline (`scripts/sync-web.mjs`, `build-itch.py`)
- `npm run sync:web` → `www/` contains index.html, src/, styles/, assets/.
- `python build-itch.py egypt-itch.zip` → zip uses forward-slash paths.

---

## 3. Known-bug regression guards

_Log bug IDs here as they are found and fixed, with the exact probe that
catches a regression (BUG-### convention)._

| ID | Summary | Regression probe |
|----|---------|------------------|
| — | (none yet) | — |
