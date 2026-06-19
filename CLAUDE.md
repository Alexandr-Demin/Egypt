# EGYPT — project conventions for Claude

Repo: vanilla-JS PWA, no build step. Source in `src/`, styles in `styles/`,
docs in `docs/`. Cache-buster `?v=YYYYMMDD<letter>` pinned at every import;
bump it together with `CONFIG.BUILD` whenever a JS/HTML change must reach
already-cached browsers.

Wrapped for Android via Capacitor (`npm run android:debug` / `:release`);
the web surface is mirrored into `www/` by `scripts/sync-web.mjs`. Web build
for itch.io: `python build-itch.py egypt-itch.zip` (POSIX zip paths).

---

## ⛔ Hard rule — QA before push

After **every** code change, run a QA pass derived from `docs/QA.md` and
**only push if it's green**. Push is the last step, never reflexive.

Loop:

1. Identify the changed surface (`git diff --stat`).
2. Map the surface to QA.md sections (table below).
3. Run the **smoke set** (always) + the **targeted probes** for the
   mapped sections.
4. If any probe fails → fix, don't push. If green → commit + push.

### Smoke set (≤30s, always run)

Run these via a live-page probe (preview_eval or equivalent) **after every
change**, before any push:

| # | Probe | Pass criterion |
|---|---|---|
| S1 | Hard-reload page (`/?_cb=<ts>`) | No console errors. |
| S2 | `import('./src/state.js?v=…')` then `getState()` | Returns a valid object after `load()`. |
| S3 | `import('./src/config.js?v=…')` | `CONFIG.build` matches the `?v=…` cache-buster used in imports. |
| S4 | Canvas / main view mounts | No errors; `#game-canvas` sized > 0. |
| S5 | `localStorage.setItem(CONFIG.saveKey,'{NOT-JSON');` + `load()` | Falls back to DEFAULT, no throw (corrupt-save regression guard). |

### Targeted probes — diff → QA.md mapping

When the diff touches these files, additionally exercise:

| Changed file(s) | QA.md sections to probe |
|---|---|
| `src/state.js` | Persistence — corrupt-save fallback, shallow-merge of old saves, `patch()`/`reset()` round-trip. |
| `src/config.js` | Cache-buster sync — `CONFIG.build` == import `?v=…`; bump `FORCE_TUTORIAL_BUILD` only if tutorial changed. |
| `src/main.js` | Boot path — `load()` → render → `__egyptReady()`; resize re-renders; preloader fades. |
| `src/ui.js` | `escapeHtml` wraps every dynamic innerHTML sink; toast/alertBig render + auto-dismiss. |
| `src/sound.js` | `setEnabled`/`isEnabled` persist; `play()` is a no-op when muted; no throw without AudioContext. |
| `styles/style.css` | Visual: open the view in preview, check no layout regression. |
| `sw.js`, `index.html` | PWA — service-worker fetch path, `CACHE` name bumped if SW behavior changed. |
| `scripts/sync-web.mjs`, `build-itch.py` | Run them; confirm `www/` / zip contains `index.html`, `src/`, `styles/`, `assets/`. |

### Failure → no push

If any probe fails: write a short note in the response, fix, re-run the
failing probe, then loop. **Never push** with a known regression — the
QA pass is gating, not informational.

### Reporting in the commit message

In each commit message include a one-liner under the body:

```
QA: smoke green; touched §<sections>; <N> probes run, all green.
```

This makes regressions traceable from git history.

---

## Cache-buster discipline

- Every `import './…js?v=YYYYMMDD<letter>'` in source must use the same
  cache-buster. Use `grep -rl 'v=<old>'` + a scripted replace for atomic bumps.
- Bump `CONFIG.BUILD` to the same value. SW (`sw.js:CACHE`) only when SW
  behavior itself changed.
- Bump `FORCE_TUTORIAL_BUILD` ONLY if the tutorial step set or texts changed
  meaningfully (forces all players to re-see it).

---

## Commit message style

- One imperative-mood subject under 70 chars.
- Body with concrete *what / why*.
- Trailing line: `QA: smoke green; touched §…` (see above).
- No `Co-Authored-By` unless asked.

---

## Files you should be aware of

| Path | Purpose |
|---|---|
| `docs/GAME_DESIGN.md` | GDD — keep in sync with code. |
| `docs/QA.md` | QA instruction. **This is the gating rulebook.** |
| `docs/ANALYTICS.md` | Event taxonomy (AppMetrica). |
| `.claude/launch.json` | Local server config (`python -m http.server`). |
| `sw.js` | Service worker (network-first, ignores localhost). |
| `scripts/sync-web.mjs` | Mirrors the web surface into `www/` for Capacitor. |

