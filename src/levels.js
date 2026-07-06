// =========== SANDSLIDE — level maps ===========
// Legend:  # wall   (space)/. empty floor   o coin (hand-placed)   P start
//          E exit(sarcophagus)   X mummy (horizontal patrol)   ^ spikes
//          = laser gate (horizontal beam)   | laser gate (vertical beam)
// Coins: if a map contains any 'o', those are the exact coins; otherwise the game
// auto-places a coin on every slide-swept floor tile (see game.js parse()).
// Hardcoded ASCII per the GDD; parsed by game.js into a grid.

// Level 1 — "CURSED TOMB": editor-authored intro with hand-placed coins.
// Validated: solvable, 0 traps, P grounded, all 66 coins reachable, ~19 swipes.
const CURSED_TOMB = [
  '#############',
  '#############',
  '#############',
  '#############',
  '#############',
  '#############',
  '#############',
  '#############',
  '#############',
  '#############',
  '#############',
  '#############',
  '#############',
  '#############',
  '#############',
  '#############',
  '#############',
  '#############',
  '#############',
  '#############',
  '#############',
  '###Eooooo####',
  '########o####',
  '########o####',
  '#####oooooo##',
  '#####o##o.o##',
  '#####o##ooo##',
  '#####ooo#####',
  '#ooooo#o#####',
  '#o###ooo#####',
  '#o###########',
  '#o###oooooo##',
  '#ooooo####o##',
  '####oo##ooo##',
  '####oo##o####',
  '####oo##oooo#',
  '###########o#',
  '#######...#o#',
  '#######.Pooo#',
  '#############',
];

// Level 2 — "PILLAR HALLS": three pillar rooms linked by single-path corridors,
// fed from the safe 4-wide start chamber (P on the bottom floor row so the entrance
// pyramid stands on the ground). Each connector exits a room's top-right corner and
// drops into the next room's centre — the centre column is plugged by the pillar, so
// the hero stops in the room and must work around it. ~12 swipes; validated fully
// solvable with zero dead-end (trap) states.
const L2 = [
  '#############',
  '#..........E#',   // exit room (top)
  '#....###....#',   //   pillar
  '#....###....#',
  '#....###....#',
  '#...........#',
  '######.######',   // connector: corner -> centre (breaks the column, no chute)
  '######.######',
  '######......#',
  '#...........#',   // middle room
  '#....###....#',
  '#....###....#',
  '#....###....#',
  '#...........#',
  '######.######',
  '######.######',
  '######......#',
  '#...........#',   // lower room
  '#....###....#',
  '#....###....#',
  '#....###....#',
  '#...........#',
  '#.###########',   // left-edge neck up from the chamber
  '#.###########',
  '#.###########',
  '#.###########',
  '#.###########',
  '#....########',
  '#....########',
  '#....########',
  '#.P..########',   // start chamber; P on the bottom floor row (pyramid grounded)
  '#############',
];

// Level 3 — "GUARDIAN CRYPT": three donut (ring) rooms, each guarded by a mummy
// confined to ONE ring by the central block. The hero can slide around the guardian
// via the opposite ring — validated solvable even with every mummy's whole patrol
// span treated as impassable (a fully safe route exists), so the guardians are
// avoidable, not blockers. Same grounded start chamber. ~12 swipes direct / 16 safe;
// zero trap states.
const L3 = [
  '#############',
  '#..........E#',   // exit room (top); guardian in the left ring
  '#...#####...#',
  '#.X.#####...#',
  '#...#####...#',
  '#...........#',
  '######.######',
  '######.######',
  '######......#',
  '#...........#',   // middle room; guardian in the right ring
  '#...#####...#',
  '#...#####.X.#',
  '#...#####...#',
  '#...........#',
  '######.######',
  '######.######',
  '######......#',
  '#...........#',   // lower room; guardian in the left ring
  '#...#####...#',
  '#.X.#####...#',
  '#...#####...#',
  '#...........#',
  '#.###########',
  '#.###########',
  '#.###########',
  '#.###########',
  '#.###########',
  '#....########',
  '#....########',
  '#....########',
  '#.P..########',   // start chamber; P on the bottom floor row (pyramid grounded)
  '#############',
];

// Hand-authored in the editor: a long winding labyrinth with hand-placed coins.
// Validated: solvable, 0 traps, P grounded, all 128 coins reachable, ~36 swipes.
const HOLLOW_LABYRINTH = [
  '#############',
  '#E#ooooooooo#',
  '#o#o#######o#',
  '#o#o#######o#',
  '#ooo######oo#',
  '#oo#######o##',
  '##########o##',
  '##########o##',
  '#oooooooooo##',
  '#o###########',
  '#ooooo#######',
  '#####ooooo###',
  '#########o###',
  '######oooo###',
  '######o#oo###',
  '######o#oo###',
  '######o######',
  '######oooooo#',
  '###########o#',
  '###########o#',
  '###########o#',
  '##oooooooooo#',
  '##o##########',
  '##o##########',
  '##o##########',
  '##o##########',
  '##oooo#######',
  '#####.oo#####',
  '#######o#####',
  '###ooooo#####',
  '#ooo#########',
  '#o###########',
  '#o#ooooooooo#',
  '#o#o######.o#',
  '#o#o####oooo#',
  '#ooo####o####',
  '########oooo#',
  '###########o#',
  '########Pooo#',
  '#############',
];

export const LEVELS = [
  { name: 'CURSED TOMB',      map: CURSED_TOMB },
  { name: 'HOLLOW LABYRINTH', map: HOLLOW_LABYRINTH },
  { name: 'PILLAR HALLS',     map: L2 },
  { name: 'GUARDIAN CRYPT',   map: L3 },
];
