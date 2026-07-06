// Offline content pipeline: generate + validate procedural SANDSLIDE levels and
// print them as paste-ready src/levels.js entries.
//
// Usage:
//   node scripts/gen-levels.mjs [--seed N] [--count K] [--difficulty 0..1]
//   node scripts/gen-levels.mjs --seed 7 --count 3 --difficulty 0.6
//
// Difficulty ramps across the batch when --difficulty is omitted (easy → hard).
import { generateLevel, validateLevel } from '../src/levelgen.js';

const args = process.argv.slice(2);
const opt = (name, def) => {
  const i = args.indexOf('--' + name);
  return i >= 0 && args[i+1] !== undefined ? args[i+1] : def;
};
const seed0 = parseInt(opt('seed', '1'), 10);
const count = parseInt(opt('count', '3'), 10);
const fixedDiff = opt('difficulty', null);

function ident(name, i){ return 'GEN' + String(i+1).padStart(2,'0'); }

let allOk = true;
const entries = [];
console.log(`// generated: seed0=${seed0} count=${count} difficulty=${fixedDiff ?? 'ramped'}`);
for(let i=0;i<count;i++){
  const difficulty = fixedDiff !== null ? Number(fixedDiff)
                    : count === 1 ? 0.4 : i / (count - 1);   // 0 → 1 across the batch
  const seed = seed0 + i * 101;
  const lvl = generateLevel({ seed, difficulty });
  if(!lvl){ console.error(`!! seed ${seed}: generation failed`); allOk = false; continue; }
  const v = validateLevel(lvl.rows);
  const tag = v.ok ? 'OK' : 'BAD';
  if(!v.ok) allOk = false;
  const id = ident(lvl.name, i);
  console.log(`\n// [${tag}] ${lvl.name}  seed=${seed} diff=${difficulty.toFixed(2)} ` +
    `rooms=${lvl.meta.rooms} enemies=${v.enemies} swipes=${v.minSwipes} ` +
    `traps=${v.traps.length} grounded=${v.grounded} avoidable=${v.enemyAvoidable}`);
  console.log(`const ${id} = [`);
  for(const r of lvl.rows) console.log(`  '${r}',`);
  console.log(`];`);
  entries.push({ id, name: lvl.name });
}

console.log(`\n// Add to the LEVELS array in src/levels.js:`);
for(const e of entries){
  console.log(`  { name: '${e.name}', map: ${e.id} },`);
}
console.log(`\n// batch ${allOk ? 'ALL VALID ✔' : 'HAS FAILURES ✘'}`);
process.exit(allOk ? 0 : 1);
