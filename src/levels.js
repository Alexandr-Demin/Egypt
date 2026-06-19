// =========== EGYPT — level maps ===========
// Legend:  # wall   . gold   (space) empty floor   P start   E exit(sarcophagus)
//          X mummy (horizontal patrol)   ^ spikes
// Hardcoded ASCII per the GDD; parsed by game.js into a grid.

// Open rooms of varying size & offset joined by short corridors and a tomb
// chamber. Coins are spawned by the game ONLY on tiles a slide can pass through
// (computeSwept), so the placed count always equals the collectible count.
// ROWS is authored top-down for readability, then flipped at export so play runs
// BOTTOM-TO-TOP: the hero starts at the bottom and climbs up to the sarcophagus.
const ROWS = [
  '################',
  '#P.....#########',
  '#......#########',
  '#......#########',
  '#......#########',
  '######.#########',
  '######.#########',
  '####........####',
  '####.X..#...####',
  '####.....#..####',
  '####........####',
  '###########.####',
  '###########.####',
  '#######........#',
  '#######..#.....#',
  '#######...#....#',
  '#######...X....#',
  '#######.########',
  '#######.########',
  '##........######',
  '##..#.....######',
  '##....#...######',
  '##........######',
  '##.#############',
  '##.#############',
  '#.......########',
  '#...#...########',
  '#.......########',
  '#......E########',
  '################',
];

export const LEVELS = [
  { name: 'TOMB OF ANUBIS', map: ROWS.slice().reverse() },
];
