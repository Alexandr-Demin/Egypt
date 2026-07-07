// =========== SANDSLIDE — procedural pixel sprites + 5x7 font ===========
// Everything is drawn in code into 16x16 (or smaller) offscreen canvases and
// cached. No external assets. Visual style: 2-bit neon — pure-black void,
// glowing maze-stone contour, brilliant gold relics. Egyptian setting:
// Anubis, ankh, mummies, sarcophagus, all in the neon key.

// SANDSLIDE palette — "Curse": crimson glow + gold on a near-black, blood-dark void.
export const PAL = {
  bg:'#0c0406',
  // crimson border-contour (walls are black; only the boundary glows)
  wallD:'#1a0606', wall:'#d23a2a', wallHi:'#ff7a5c', wallEdge:'#ffc0ad', wallStar:'#ff9a80',
  // turquoise contour — marks wall faces next to spikes so the hazard reads at a glance
  teal:'#1fb6a6', tealHi:'#5ff0dd', tealEdge:'#c8fff4',
  // legacy "stone/sand" keys remapped onto the crimson family (HUD, particles)
  stoneD:'#2a0a0a', stone:'#3a0e0e', stoneL:'#d23a2a', stoneHi:'#ff7a5c',
  sand:'#d23a2a', sandD:'#3a0e0e', sandL:'#ff7a5c',
  // gold relics + collectibles + hero (the bright yellow key)
  gold:'#ffd21e', goldD:'#c08800', goldHi:'#fff6b0',
  // "lapis" remapped to the crimson glow family (exit aura, accents)
  lapis:'#a02c20', lapisL:'#ff7a5c', lapisHi:'#ffc0ad',
  black:'#000000', blackD:'#0a0404',
  // mummy wrappings — pale bone, reads against the dark crimson void
  wrap:'#efe2cf', wrapD:'#b09a80', wrapHi:'#ffffff',
  red:'#ff4030', redHi:'#ff9a70',
  white:'#ffeede',
  // spikes — pale bone-steel
  steel:'#e0d0c0', steelHi:'#ffffff', steelD:'#70584a',
};

function mk(w, h){ const c = document.createElement('canvas'); c.width = w; c.height = h||w; return c; }
function R(x, X, Y, W, H, c){ x.fillStyle = c; x.fillRect(X, Y, W, H); }

// ---- builders (each returns a canvas) ----
function spAnubis(frame){
  // Chibi Anubis: big jackal head with tall pointed gold ears, a dark muzzle,
  // glinting eyes and a tiny body. All-gold so it pops on the black floor —
  // only the inner cuts (ears notch, eyes, muzzle) are dark. `frame`: 0 idle,
  // 1/2 alternate the legs for a slide-run cycle (the sprite is rotated by
  // game.js so the feet point at the wall it slides into).
  const c = mk(16), x = c.getContext('2d'); const P = PAL;
  const y = P.gold, dk = P.goldD, hi = P.goldHi, blk = P.blackD, w = P.white;
  // ears — gold, pointed, with a dark inner notch
  R(x,4,0,1,2,y);  R(x,3,2,3,3,y);  R(x,4,2,1,2,blk);     // left
  R(x,11,0,1,2,y); R(x,10,2,3,3,y); R(x,11,2,1,2,blk);    // right
  // head
  R(x,3,4,10,7,y); R(x,3,4,10,1,hi); R(x,3,10,10,1,dk);
  // eyes — dark with a light glint
  R(x,5,6,2,2,blk); R(x,9,6,2,2,blk); R(x,5,6,1,1,w); R(x,9,6,1,1,w);
  // muzzle / snout — dark, lower-centre of the face
  R(x,6,9,4,2,blk); R(x,7,8,2,1,dk);
  // body
  R(x,6,11,4,3,y); R(x,6,11,4,1,dk);
  // legs — frame 1 lifts the left, frame 2 lifts the right
  const ly = frame===1?13:14, ry = frame===2?13:14;
  R(x,5,ly,2,2,y); R(x,9,ry,2,2,y);
  return c;
}

function spBall(){
  // The hero's in-flight form: a rounded gold square (squashed into a streak by
  // game.js while sliding). Eyes sit toward the leading edge.
  const c = mk(16), x = c.getContext('2d'); const P = PAL;
  const y = P.gold, dk = P.goldD, hi = P.goldHi, blk = P.blackD;
  R(x,4,3,8,10,y); R(x,3,4,10,8,y);   // rounded square (two rects = cut corners)
  R(x,4,3,8,1,hi);                     // top sheen
  R(x,4,11,8,1,dk);                    // bottom shade
  R(x,5,9,2,2,blk); R(x,9,9,2,2,blk);  // eyes toward the leading edge
  return c;
}

function spMummy(){
  const c = mk(16), x = c.getContext('2d'); const P = PAL;
  R(x,5,2,6,4,P.wrap);            // head
  R(x,4,6,8,9,P.wrap);            // body
  R(x,10,6,2,9,P.wrapD);          // right shadow
  R(x,4,8,8,1,P.wrapD); R(x,4,11,8,1,P.wrapD); R(x,4,13,8,1,P.wrapD); // bandages
  R(x,6,4,1,1,P.red); R(x,9,4,1,1,P.red);   // glowing eyes
  R(x,3,8,1,3,P.wrap); R(x,12,8,1,3,P.wrap);// arms forward
  R(x,3,12,1,2,P.wrapHi); R(x,12,11,1,2,P.wrapHi); // loose strips
  return c;
}

function spAnkh(){ // collectible — small round gold dot (точка), centred
  const c = mk(16), x = c.getContext('2d'); const P = PAL;
  R(x,7,6,2,1,P.gold);    // top
  R(x,6,7,4,2,P.gold);    // middle (4 wide)
  R(x,7,9,2,1,P.gold);    // bottom  → ~4px round dot
  R(x,7,7,1,1,P.goldHi);  // highlight
  return c;
}

function spSarcophagus(){ // exit
  const c = mk(16), x = c.getContext('2d'); const P = PAL;
  R(x,3,1,10,14,P.gold); R(x,11,1,2,14,P.goldD);   // case + shadow
  R(x,3,1,1,1,P.bg); R(x,12,1,1,1,P.bg);           // clip top corners
  R(x,4,2,8,4,P.lapis); R(x,4,3,8,1,P.gold); R(x,4,5,8,1,P.gold); // nemes
  R(x,6,3,4,3,P.goldHi);                            // face
  R(x,6,4,1,1,P.blackD); R(x,9,4,1,1,P.blackD);     // eyes
  R(x,7,6,2,2,P.lapis);                             // beard
  R(x,5,8,6,1,P.lapis); R(x,5,10,6,1,P.lapis);      // crossed arms
  R(x,7,8,2,6,P.lapis);                             // central band
  R(x,7,9,2,1,P.gold); R(x,7,11,2,1,P.gold); R(x,7,13,2,1,P.gold); // glyphs
  return c;
}

function spWall(variant){
  // Walls are the black void itself — only their boundary glows, and that glowing
  // dotted contour is drawn per-tile (neighbour-aware) in game.js. So: pure black.
  const c = mk(16), x = c.getContext('2d'); const P = PAL;
  R(x,0,0,16,16,P.bg);
  return c;
}

function spFloor(variant){
  // The walkable void: near-black with the faintest crimson mote so it isn't flat.
  const c = mk(16), x = c.getContext('2d'); const P = PAL;
  R(x,0,0,16,16,P.bg);
  const sp = [[3,4],[11,2],[6,9],[13,11],[2,12],[9,6]];
  const s = sp[variant % sp.length];
  R(x, s[0], s[1], 1, 1, '#1c0a0a');
  return c;
}

function spSpikes(){
  const c = mk(16), x = c.getContext('2d'); const P = PAL;
  R(x,0,11,16,5,P.stoneD); R(x,0,11,16,1,P.stone);   // base slab
  const cx = [2,6,10,13];
  for(const X of cx){
    R(x,X-1,8,3,3,P.steelD); R(x,X,5,1,3,P.steel); R(x,X,4,1,1,P.steelHi);
  }
  return c;
}

function spHeart(full){
  const c = mk(8), x = c.getContext('2d'); const P = PAL;
  const on = full ? P.red : '#2a0c5c';
  const rows = ['.##..##.','########','########','.######.','..####..','...##...','........','........'];
  for(let r=0;r<8;r++) for(let q=0;q<8;q++) if(rows[r][q]==='#') R(x,q,r,1,1,on);
  if(full){ R(x,1,1,1,1,P.redHi); R(x,5,1,1,1,P.redHi); }
  return c;
}

const _cache = {};
export function sprite(name){
  if(_cache[name]) return _cache[name];
  let c;
  switch(name){
    case 'anubis': c = spAnubis(0); break;
    case 'anubisA':c = spAnubis(1); break;
    case 'anubisB':c = spAnubis(2); break;
    case 'ball':   c = spBall(); break;
    case 'mummy':  c = spMummy(); break;
    case 'ankh':   c = spAnkh(); break;
    case 'exit':   c = spSarcophagus(); break;
    case 'wall0':  c = spWall(0); break;
    case 'wall1':  c = spWall(1); break;
    case 'wall2':  c = spWall(2); break;
    case 'floor0': c = spFloor(0); break;
    case 'floor1': c = spFloor(1); break;
    case 'floor2': c = spFloor(2); break;
    case 'spikes': c = spSpikes(); break;
    case 'heart':  c = spHeart(true); break;
    case 'heart0': c = spHeart(false); break;
    default: c = mk(16);
  }
  _cache[name] = c; return c;
}

// ================= 5x7 pixel font =================
const G = {
  ' ':['     ','     ','     ','     ','     ','     ','     '],
  'A':['.###.','#...#','#...#','#####','#...#','#...#','#...#'],
  'B':['####.','#...#','#...#','####.','#...#','#...#','####.'],
  'C':['.####','#....','#....','#....','#....','#....','.####'],
  'D':['####.','#...#','#...#','#...#','#...#','#...#','####.'],
  'E':['#####','#....','#....','####.','#....','#....','#####'],
  'F':['#####','#....','#....','####.','#....','#....','#....'],
  'G':['.####','#....','#....','#..##','#...#','#...#','.####'],
  'H':['#...#','#...#','#...#','#####','#...#','#...#','#...#'],
  'I':['#####','..#..','..#..','..#..','..#..','..#..','#####'],
  'J':['..###','...#.','...#.','...#.','#..#.','#..#.','.##..'],
  'K':['#...#','#..#.','#.#..','##...','#.#..','#..#.','#...#'],
  'L':['#....','#....','#....','#....','#....','#....','#####'],
  'M':['#...#','##.##','#.#.#','#.#.#','#...#','#...#','#...#'],
  'N':['#...#','##..#','#.#.#','#..##','#...#','#...#','#...#'],
  'O':['.###.','#...#','#...#','#...#','#...#','#...#','.###.'],
  'P':['####.','#...#','#...#','####.','#....','#....','#....'],
  'Q':['.###.','#...#','#...#','#...#','#.#.#','#..#.','.##.#'],
  'R':['####.','#...#','#...#','####.','#.#..','#..#.','#...#'],
  'S':['.####','#....','#....','.###.','....#','....#','####.'],
  'T':['#####','..#..','..#..','..#..','..#..','..#..','..#..'],
  'U':['#...#','#...#','#...#','#...#','#...#','#...#','.###.'],
  'V':['#...#','#...#','#...#','#...#','#...#','.#.#.','..#..'],
  'W':['#...#','#...#','#...#','#.#.#','#.#.#','##.##','#...#'],
  'X':['#...#','#...#','.#.#.','..#..','.#.#.','#...#','#...#'],
  'Y':['#...#','#...#','.#.#.','..#..','..#..','..#..','..#..'],
  'Z':['#####','....#','...#.','..#..','.#...','#....','#####'],
  '0':['.###.','#...#','#..##','#.#.#','##..#','#...#','.###.'],
  '1':['..#..','.##..','..#..','..#..','..#..','..#..','.###.'],
  '2':['.###.','#...#','....#','...#.','..#..','.#...','#####'],
  '3':['####.','....#','....#','.###.','....#','....#','####.'],
  '4':['...#.','..##.','.#.#.','#..#.','#####','...#.','...#.'],
  '5':['#####','#....','#....','####.','....#','#...#','.###.'],
  '6':['.###.','#....','#....','####.','#...#','#...#','.###.'],
  '7':['#####','....#','...#.','..#..','.#...','.#...','.#...'],
  '8':['.###.','#...#','#...#','.###.','#...#','#...#','.###.'],
  '9':['.###.','#...#','#...#','.####','....#','....#','.###.'],
  ':':['.....','..#..','..#..','.....','..#..','..#..','.....'],
  '!':['..#..','..#..','..#..','..#..','..#..','.....','..#..'],
  '.':['.....','.....','.....','.....','.....','..#..','..#..'],
  '-':['.....','.....','.....','#####','.....','.....','.....'],
  '/':['....#','...#.','...#.','..#..','.#...','.#...','#....'],
  '+':['.....','..#..','..#..','#####','..#..','..#..','.....'],
};

export function textWidth(str, scale=1){ return str.length * 6 * scale - scale; }

// Draw uppercase text. y is the top. Returns drawn width.
export function drawText(ctx, str, x, y, color, scale=1){
  str = String(str).toUpperCase();
  ctx.fillStyle = color;
  let cx = x;
  for(const ch of str){
    const g = G[ch] || G[' '];
    for(let r=0;r<7;r++){ const row=g[r];
      for(let q=0;q<5;q++) if(row[q]==='#') ctx.fillRect(cx+q*scale, y+r*scale, scale, scale);
    }
    cx += 6*scale;
  }
  return cx - x - scale;
}

export function drawTextCentered(ctx, str, cxCenter, y, color, scale=1){
  const w = textWidth(str, scale);
  return drawText(ctx, str, Math.round(cxCenter - w/2), y, color, scale);
}
