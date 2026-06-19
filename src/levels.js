// =========== EGYPT — level maps ===========
// Legend:  # wall   . gold   (space) empty floor   P start   E exit(sarcophagus)
//          X mummy (horizontal patrol)   ^ spikes
// Hardcoded ASCII per the GDD; parsed by game.js into a grid.

// Open rooms of varying size & offset (left→right→left) joined by short
// corridors and a tomb chamber — the layout reads as distinct rooms. Coins are
// spawned by the game ONLY on tiles a slide can pass through (computeSwept), so
// the placed count always equals the collectible count even though the rooms
// stay open. A few pillars per room add stops so most of each room is reachable.
export const LEVELS = [
  {
    name: 'TOMB OF ANUBIS',
    map: [
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
    ],
  },
];
