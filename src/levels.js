// =========== EGYPT — level maps ===========
// Legend:  # wall   . gold   (space) empty floor   P start   E exit(sarcophagus)
//          X mummy (horizontal patrol)   ^ spikes
// Hardcoded ASCII per the GDD; parsed by game.js into a grid.

// Level 1 — a gentle starter that introduces the slide. Distinct room shapes,
// start (P) → exit (E) along one clear path: small square → wide pillar hall →
// tall narrow shaft → donut room (central pillar) → sarcophagus. Coins are
// spawned by the game ONLY on tiles a slide can pass through (computeSwept), so
// the placed count always equals the collectible count.
// ROWS is authored top-down for readability, then flipped at export so play runs
// BOTTOM-TO-TOP: the hero starts at the bottom and climbs up to the sarcophagus.
const ROWS = [
  '##############',
  '#.P..#########',   // A — small start square (P off the wall so the entrance pyramid fits)
  '#....#########',
  '#....#########',
  '#....#########',
  '##.###########',   // shaft A→B (aligned under P → one clean swipe down into B)
  '#............#',   // B — wide hall
  '#..#.....#...#',   //     with two pillars
  '#............#',
  '#............#',
  '############.#',   // shaft B→C
  '#########....#',   // C — tall narrow shaft
  '#########....#',
  '#########....#',
  '#########....#',
  '#########....#',
  '#########....#',
  '#########.####',   // shaft C→D
  '##........####',   // D — donut room
  '##........####',
  '##..##....####',   //     central pillar
  '##........####',
  '##....E...####',   //     sarcophagus
  '##############',
];

export const LEVELS = [
  { name: 'ANTECHAMBER', map: ROWS.slice().reverse() },
];
