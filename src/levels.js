// =========== SANDSLIDE — level maps ===========
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
  '#..###########',   // A→B opening spans cols 1-2 so a left/right slide can still
                      // reach the shaft (col-1 wall stop → up); avoids a dead end.
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

// Level 2 — "WINDING TOMB": a long single-path serpentine. Six 1-wide vertical
// corridors linked alternately at top/bottom, fed from the same safe 4-wide start
// chamber (P off the wall so the pyramid fits; the only way up is the left-edge
// neck). Authored directly in play orientation (no reverse). ~10 swipes to solve;
// validated as fully solvable with zero dead-end (trap) states.
const L2 = [
  '#############',
  '#...#...#...#',
  '#.#.#.#.#.#.#',
  '#.#.#.#.#.#.#',
  '#.#.#.#.#.#.#',
  '#.#.#.#.#.#.#',
  '#.#.#.#.#.#.#',
  '#.#.#.#.#.#.#',
  '#.#.#.#.#.#.#',
  '#.#.#.#.#.#.#',
  '#.#.#.#.#.#.#',
  '#.#.#.#.#.#.#',
  '#.#.#.#.#.#.#',
  '#.#.#.#.#.#.#',
  '#.#.#.#.#.#.#',
  '#.#.#.#.#.#.#',
  '#.#...#...#E#',   // exit at the end of the last corridor (sarcophagus)
  '#....########',
  '#....########',
  '#.P..########',   // start chamber (4-wide; up via the left-edge neck)
  '#....########',
  '#############',
];

// Level 3 — "GUARDIAN CRYPT": a taller seven-corridor serpentine guarded by four
// patrolling mummies (X) posted in the horizontal linking passages the hero must
// slide across. Same safe start-chamber pattern. ~12 swipes; validated solvable
// with zero trap states (enemies are a timing hazard, not a reachability block).
const L3 = [
  '###############',
  '#.X.#.X.#...#E#',   // exit top-right; mummies patrol the top link passages
  '#.#.#.#.#.#.#.#',
  '#.#.#.#.#.#.#.#',
  '#.#.#.#.#.#.#.#',
  '#.#.#.#.#.#.#.#',
  '#.#.#.#.#.#.#.#',
  '#.#.#.#.#.#.#.#',
  '#.#.#.#.#.#.#.#',
  '#.#.#.#.#.#.#.#',
  '#.#.#.#.#.#.#.#',
  '#.#.#.#.#.#.#.#',
  '#.#.#.#.#.#.#.#',
  '#.#.#.#.#.#.#.#',
  '#.#.#.#.#.#.#.#',
  '#.#.#.#.#.#.#.#',
  '#.#.#.#.#.#.#.#',
  '#.#.#.#.#.#.#.#',
  '#.#.#.#.#.#.#.#',
  '#.#.#.#.#.#.#.#',
  '#.#...#.X.#.X.#',   // mummies patrol the bottom link passages
  '#....##########',
  '#....##########',
  '#.P..##########',   // start chamber
  '#....##########',
  '###############',
];

export const LEVELS = [
  { name: 'ANTECHAMBER',    map: ROWS.slice().reverse() },
  { name: 'WINDING TOMB',   map: L2 },
  { name: 'GUARDIAN CRYPT', map: L3 },
];
