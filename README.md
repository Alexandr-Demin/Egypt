# EGYPT

Vanilla-JS PWA game (no build step), wrapped for Android via Capacitor.
See [CLAUDE.md](CLAUDE.md) for the working rules (QA-before-push,
cache-buster discipline, commit style).

## Run locally

```bash
python -m http.server 8092
# open http://localhost:8092/
```

## Layout

```
index.html              PWA shell + inline preloader
manifest.webmanifest    PWA manifest
sw.js                   service worker (network-first, ignores localhost)
src/                    config · state · main · ui · sound
styles/                 style.css
assets/                 icon + art
scripts/sync-web.mjs    mirror web surface into www/ for Capacitor
build-itch.py           itch.io zip (POSIX paths)
docs/                   GAME_DESIGN · QA · ANALYTICS
```

## Android (Capacitor)

```bash
npm install
npm run android:debug     # sync web → www/, then gradle assembleDebug
```

## itch.io web build

```bash
python build-itch.py egypt-itch.zip
```
