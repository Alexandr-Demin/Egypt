// =========== SANDSLIDE — procedural level generator + validator ===========
// DOM-free ES module: works in Node (content pipeline) and the browser (endless).
//
// Levels are ASSEMBLED from individually trap-free blocks — a safe start chamber,
// pillar/donut rooms, and column-breaking connectors — so the result is solvable
// and dead-end-free BY CONSTRUCTION. `validateLevel` (a slide-graph BFS) is kept as
// a strict gate/safety net. Everything is deterministic from a seed.
//
// Grid chars match src/levels.js:  # wall · . floor · P start · E exit · X mummy.

// ---------------- seeded RNG (mulberry32) ----------------
export function makeRng(seed){
  let a = (seed >>> 0) || 1;
  return () => { a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const pick = (rng, arr) => arr[Math.floor(rng() * arr.length)];

// ---------------- grid + blocks ----------------
const W = 13, CENTER = 6;                 // fixed interior width; centre column
const mkgrid = H => Array.from({ length: H }, () => Array(W).fill('#'));
const rect = (g,x0,y0,x1,y1) => { for(let y=y0;y<=y1;y++) for(let x=x0;x<=x1;x++) g[y][x]='.'; };
const wall = (g,x0,y0,x1,y1) => { for(let y=y0;y<=y1;y++) for(let x=x0;x<=x1;x++) g[y][x]='#'; };

// A room spans rows [ry..ry+4], full interior width, with a plugged CENTRE column
// (so an entering slide stops in the bottom lane) and two side routes to the top.
const ROOM_H = 5;
function pillarRoom(g, ry){ rect(g,1,ry,11,ry+4); wall(g,5,ry+1,7,ry+3); }  // 3-wide pillar
function donutRoom (g, ry){ rect(g,1,ry,11,ry+4); wall(g,4,ry+1,8,ry+3); }  // 5-wide block → L/R rings

// Connector: lower room's top-corner (exitCol, LT) → up one → jog → drop into the
// upper room's centre-bottom (CENTER, UB). Only CENTER continues up, so the vertical
// column is BROKEN between rooms (no sliding straight through / "chute").
function connect(g, exitCol, LT, UB){
  const jog = LT - 1;
  rect(g, exitCol, jog, exitCol, LT-1);                              // stub above lower exit
  rect(g, Math.min(CENTER,exitCol), jog, Math.max(CENTER,exitCol), jog);  // horizontal jog
  rect(g, CENTER, UB+1, CENTER, jog);                                // drop into upper room
}

// ---------------- assembly ----------------
// spec: { rooms: [{ type:'pillar'|'donut', exitCol:1|11, enemy:true|false }, ...] }
// rooms[0] is the TOP (exit) room; rooms[N-1] is the lowest (fed by the chamber).
// A room's guardian sits in the ring OPPOSITE its exit corner, so the go-around
// route (up the exit side) is always clear of it.
export function assemble(spec){
  const N = spec.rooms.length;
  const H = (N - 1) * (ROOM_H + 3) + 16;      // room(5) + connector(3) per gap; +chamber/borders
  const g = mkgrid(H);
  const roomTop = i => 1 + i * (ROOM_H + 3);
  for(let i=0;i<N;i++){ const r=spec.rooms[i];
    (r.type==='donut' ? donutRoom : pillarRoom)(g, roomTop(i)); }
  for(let i=0;i<N-1;i++){                       // connect each upper room to the one below it
    const lower = spec.rooms[i+1];
    connect(g, lower.exitCol, roomTop(i+1), roomTop(i)+4);
  }
  // start chamber below the lowest room, joined by a left-edge neck; P on the bottom
  // floor row so the entrance pyramid stands on the ground.
  const lastBottom = roomTop(N-1) + 4;
  rect(g, 1, lastBottom+1, 1, lastBottom+5);   // neck (col 1)
  rect(g, 1, lastBottom+6, 4, lastBottom+9);   // 4-wide chamber
  g[lastBottom+9][2] = 'P';
  // exit in the top room, at its exit corner
  g[roomTop(0)][spec.rooms[0].exitCol] = 'E';
  // guardians (donut rooms only), confined to one ring
  for(let i=0;i<N;i++){ const r=spec.rooms[i];
    if(r.type!=='donut' || !r.enemy) continue;
    const ring = r.exitCol === 11 ? 2 : 10;    // opposite the exit corner
    g[roomTop(i)+2][ring] = 'X';
  }
  return g.map(row => row.join(''));
}

// ---------------- validator (slide-graph BFS) ----------------
// Mirrors game.js slide semantics: a move slides until a wall; crossing E wins.
// Returns solvability, dead-end (trap) cells, shortest solution length, whether the
// start is grounded, and — with every guardian's whole patrol span treated as
// impassable — whether a fully safe (go-around) route exists.
export function validateLevel(rows){
  const grid = rows.map(r => r.split(''));
  const R = grid.length, C = Math.max(...grid.map(r => r.length));
  const widthsOk = grid.every(r => r.length === C);
  const at = (x,y) => (y<0||x<0||y>=R||x>=C) ? '#' : (grid[y][x] || '#');
  let P=null, E=null; const enemies=[];
  for(let y=0;y<R;y++) for(let x=0;x<C;x++){ const c=at(x,y);
    if(c==='P')P={x,y}; if(c==='E')E={x,y}; if(c==='X')enemies.push({x,y}); }

  function patrolSpan(e){ let a=e.x,b=e.x; const y=e.y;
    while(at(a-1,y)!=='#')a--; while(at(b+1,y)!=='#')b++;
    const s=new Set(); for(let x=a;x<=b;x++)s.add(x+','+y); return s; }

  function run(blocked){
    const isWall=(x,y)=> at(x,y)==='#' || (blocked && blocked.has(x+','+y));
    const slide=(x,y,dx,dy)=>{ let cx=x,cy=y,m=false;
      while(!isWall(cx+dx,cy+dy)){ cx+=dx; cy+=dy; m=true; if(at(cx,cy)==='E') return {win:true}; }
      return m ? {x:cx,y:cy} : null; };
    const D=[[0,-1],[0,1],[-1,0],[1,0]], key=(x,y)=>x+','+y, start=key(P.x,P.y);
    const adj=new Map(), seen=new Set([start]), q=[[P.x,P.y]], win=new Set();
    while(q.length){ const [x,y]=q.shift(), k=key(x,y), nx=[];
      for(const [dx,dy] of D){ const s=slide(x,y,dx,dy); if(!s) continue;
        if(s.win){ win.add(k); continue; } const nk=key(s.x,s.y); nx.push(nk);
        if(!seen.has(nk)){ seen.add(nk); q.push([s.x,s.y]); } }
      adj.set(k,nx); }
    const canWin=new Set(win); let ch=true;
    while(ch){ ch=false; for(const [k,nx] of adj){ if(canWin.has(k)) continue;
      if(nx.some(n=>canWin.has(n))){ canWin.add(k); ch=true; } } }
    const traps=[...seen].filter(s=>!canWin.has(s));
    let minSwipes=null; { const dist=new Map([[start,0]]), q2=[[P.x,P.y]];
      loop: while(q2.length){ const [x,y]=q2.shift(), dd=dist.get(key(x,y));
        for(const [dx,dy] of D){ const s=slide(x,y,dx,dy); if(!s) continue;
          if(s.win){ minSwipes=dd+1; break loop; } const nk=key(s.x,s.y);
          if(!dist.has(nk)){ dist.set(nk,dd+1); q2.push([s.x,s.y]); } } } }
    return { solvable: canWin.has(start), traps, minSwipes };
  }

  const base = P && E ? run(null) : { solvable:false, traps:[], minSwipes:null };
  let enemyAvoidable = true;
  if(enemies.length){ const blocked=new Set();
    for(const e of enemies) for(const k of patrolSpan(e)) blocked.add(k);
    enemyAvoidable = run(blocked).solvable; }
  const grounded = !!P && at(P.x, P.y+1) === '#';
  const ok = widthsOk && base.solvable && base.traps.length===0 && grounded &&
             (enemies.length===0 || enemyAvoidable);
  return { ok, widthsOk, hasP:!!P, hasE:!!E, enemies:enemies.length,
           solvable:base.solvable, traps:base.traps, minSwipes:base.minSwipes,
           grounded, enemyAvoidable, rows:R, cols:C };
}

// ---------------- themed names ----------------
const ADJ = ['SUNKEN','CURSED','GILDED','SILENT','BURIED','SHIFTING','HOLLOW','ASHEN','LOST','SACRED'];
const NOUN = ['VAULT','CRYPT','GALLERY','WARREN','CATACOMB','ANTECHAMBER','LABYRINTH','TOMB','HALLS','PASSAGE'];

// ---------------- high-level generator ----------------
// generateLevel({ seed, difficulty }) → { rows, name, meta }
// difficulty 0..1 drives room count, room complexity, and guardian density.
// Guaranteed valid: assembles, validates, and re-rolls (bounded) on the rare miss.
export function generateLevel({ seed = 1, difficulty = 0.4 } = {}){
  const d = Math.max(0, Math.min(1, difficulty));
  for(let attempt=0; attempt<24; attempt++){
    const rng = makeRng((seed >>> 0) + attempt * 0x9E3779B1);
    const N = 2 + Math.round(d * 3);                 // 2..5 rooms
    const rooms = [];
    for(let i=0;i<N;i++){
      const wantEnemy = rng() < d;
      const type = wantEnemy ? 'donut' : (rng() < d ? 'donut' : 'pillar');
      rooms.push({ type, exitCol: rng() < 0.5 ? 1 : 11, enemy: wantEnemy });
    }
    const rows = assemble({ rooms });
    const v = validateLevel(rows);
    if(v.ok){
      const nm = makeRng((seed >>> 0) ^ 0x5bd1e995);
      return { rows, name: `${pick(nm,ADJ)} ${pick(nm,NOUN)}`,
        meta: { seed: seed>>>0, difficulty:d, rooms:N,
                enemies:v.enemies, minSwipes:v.minSwipes } };
    }
  }
  return null;   // unreachable by construction; caller can fall back
}
