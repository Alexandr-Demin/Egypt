// Copies the runtime PWA surface into ./www for Capacitor's webDir.
// Deterministic mirror — wipes www/ first, then re-copies the whitelisted paths.
// Run with: npm run sync:web   (also chained from cap:sync / android:debug)
import { existsSync, rmSync, mkdirSync, cpSync, statSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const out = resolve(root, 'www');

const FILES = ['index.html', 'manifest.webmanifest', 'sw.js'];
const DIRS  = ['src', 'styles', 'assets', 'vendor'];

if (existsSync(out)) rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

let copied = 0, bytes = 0;
const tally = (p) => { try { bytes += statSync(p).size; copied++; } catch {} };

for (const f of FILES) {
  const src = resolve(root, f);
  if (!existsSync(src)) { console.warn(`[sync-web] missing: ${f}`); continue; }
  cpSync(src, resolve(out, f));
  tally(src);
}
for (const d of DIRS) {
  const src = resolve(root, d);
  if (!existsSync(src)) { console.warn(`[sync-web] missing dir: ${d}`); continue; }
  cpSync(src, resolve(out, d), { recursive: true });
  copied++;
}

console.log(`[sync-web] www/ refreshed (${copied} top-level entries)`);
