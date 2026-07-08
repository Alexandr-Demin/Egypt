// =========== SANDSLIDE — game core (v0.1) ===========
// Slide-maze on a tile grid + juice. Renders to a fixed virtual screen that the
// browser upscales (pixelated). Scenes: title → select → play → win/gameover.

import { LEVELS } from './levels.js?v=20260707m';
import { sprite, drawText, drawTextCentered, textWidth, PAL } from './sprites.js?v=20260707m';
import { renderTitle, renderMenu, renderDebug, renderPlayModes, renderResult, renderWin, renderGameover } from './screens.js?v=20260707m';
import { getState, patch, reset } from './state.js?v=20260707m';
import * as sound from './sound.js?v=20260707m';
import { generateLevel } from './levelgen.js?v=20260707m';

const VW = 208, VH = 288, TILE = 16, HUD_H = 24;
const SLIDE = 34;   // tiles/sec — fast, snappy slide
const ENEMY = 3;    // tiles/sec
const HIT = 0.55;   // collision distance (tiles)
const LASER_CHARGE = 3.0;                       // telegraph time before firing (s)
const LASER_FIRE   = 0.5;                       // lethal window (s)
const LASER_PERIOD = LASER_CHARGE + LASER_FIRE; // full charge→fire cycle
const SPIKE_ARM = 0.5;                          // delay after touch before spikes extend (s)
const SPIKE_UP  = 0.8;                          // how long extended spikes stay out (s)
// arcade: rising "cursed sand" flood — resets each level, accelerates with depth
const FILL_BASE = 5, FILL_RAMP = 2.0;           // px/s base + per cleared level
const FLY_SPEED = 20, WARP_DIST = 14;           // real flythrough: tiles/s + rise/drop distance (tiles)
// pufferfish cycle: idle (small) → inflate → puffed (lethal 3x3) → deflate
const PUFF_IDLE=2.5, PUFF_INFLATE=0.6, PUFF_HOLD=0.8, PUFF_DEFLATE=0.5;
const PUFF_PERIOD = PUFF_IDLE+PUFF_INFLATE+PUFF_HOLD+PUFF_DEFLATE;
// inflation 0..1 for a given (offset) clock; lethal when >= 0.9
function puffInflation(tt){
  const p = ((tt % PUFF_PERIOD) + PUFF_PERIOD) % PUFF_PERIOD;
  if(p < PUFF_IDLE) return 0;
  if(p < PUFF_IDLE+PUFF_INFLATE) return (p-PUFF_IDLE)/PUFF_INFLATE;
  if(p < PUFF_IDLE+PUFF_INFLATE+PUFF_HOLD) return 1;
  return 1 - (p-(PUFF_IDLE+PUFF_INFLATE+PUFF_HOLD))/PUFF_DEFLATE;
}

const DIRS = { left:[-1,0], right:[1,0], up:[0,-1], down:[0,1] };
// Hero orientation: the sprite (feet at its bottom) is rotated so the feet point
// at the wall it slides into — i.e. it always lands feet-first.
const HERO_ANGLE = { down:0, left:Math.PI/2, up:Math.PI, right:-Math.PI/2 };
const INTRO_DUR = 1.8;   // level-entrance: pyramid → door opens → hero appears → pyramid fades
const EXIT_BTN = { id:'exit', x:3, y:4, w:18, h:16 };   // in-match "exit to menu" (HUD top-left)
const inRect = (v,b) => v.x>=b.x && v.x<=b.x+b.w && v.y>=b.y && v.y<=b.y+b.h;

const G = {
  canvas:null, ctx:null, scene:'title', t:0, last:0,
  levelIndex:0, score:0, lives:3, levelName:'',
  endless:false, depth:1, runSeed:1, curMap:null, curName:'',
  grid:[], ROWS:0, COLS:0, coins:null, coinsLeft:0, coinsTotal:0, exitPos:{x:0,y:0},
  stars:null, starsTotal:0,   // hand-placed rating pickups ('*'); rating = collected count

  lasers:[], laserCells:null, spikes:null, puffers:[], result:null,
  boardX:0, boardY:0, fvar:[], wvar:[],
  player:null, enemies:[], dir:null, bufDir:null, lastCell:'', heroAngle:0, slideFromX:0, slideFromY:0,
  intro:null, startCell:null,
  particles:[], trail:[], shake:0, hs:0, flash:0, flashCol:'#fff',
  psx:1, psy:1, buttons:[], trans:null, dead:false, deadTimer:0,
  dustTimer:0, confirmExit:false,
  arcade:false, arcadeDepth:0, fill:null, arcadeFly:null,   // arcade run state
  godMode:false,                                            // debug: immortality
  modeTab:'story',                                          // mode screen tab: 'story' | 'arcade'
};

// ---------------- lifecycle ----------------
export function startGame(canvas){
  G.canvas = canvas; G.ctx = canvas.getContext('2d');
  canvas.width = VW; canvas.height = VH;
  G.scene = 'title'; G.t = 0;
  bindInput();
  requestAnimationFrame(loop);
  // debug surface for QA / automation
  window.dbg = {
    get scene(){return G.scene;}, get level(){return G.levelIndex;},
    get lives(){return G.lives;}, get score(){return G.score;},
    get coinsLeft(){return G.coinsLeft;}, get depth(){return G.depth;}, get endless(){return G.endless;},
    press:setDir, tap:onButton, buttons:()=>G.buttons.map(b=>b.id),
    pos:()=>G.player?{x:G.player.cx,y:G.player.cy}:null, exit:()=>({...G.exitPos}),
    teleport:(x,y)=>{ const p=G.player; if(p){ p.cx=x;p.cy=y;p.fx=x;p.fy=y;p.tx=x;p.ty=y;p.moving=false; G.lastCell=''; } },
    pump:(n)=>{ for(let i=0;i<(n||1);i++) tick(1/60); },
    testMap:(rows,name)=>{ G.endless=false; G.score=0; G.lives=3; parse({map:rows,name:name||'TEST'}); G.scene='play'; },
    laserCells:()=>G.laserCells?[...G.laserCells]:[], result:()=>G.result, coinsTotal:()=>G.coinsTotal,
    starsTotal:()=>G.starsTotal, starsLeft:()=>G.stars?G.stars.size:0,
    arcade:()=>({on:G.arcade, depth:G.arcadeDepth, fillY:G.fill?Math.round(G.fill.y):null,
      fillSpeed:G.fill?G.fill.speed:null, fly:!!G.arcadeFly, score:G.score, name:G.levelName,
      intro:G.intro, hasStartCell:!!G.startCell, heroAngle:G.heroAngle}),
    win:()=>{ if(G.scene==='play' && G.player && !G.dead) exitReached(); },   // QA: trigger exit/fly
    god:()=>G.godMode, kill:()=>{ if(G.scene==='play' && G.player) die(); },   // QA: god state / force death
  };
}

function loop(ts){
  const dt = Math.min(0.05, (ts - G.last)/1000 || 0); G.last = ts;
  tick(dt);
  requestAnimationFrame(loop);
}
function tick(dt){ update(dt); render(); }

// ---------------- run / level flow ----------------
function startRun(i=0){ G.endless = false; G.arcade = false; G.score = 0; G.lives = 3; G.runStart = i; loadLevel(i); }

function loadLevel(i){
  G.levelIndex = i; G.dead = false; G.dir = null; G.lastCell = ''; G.confirmExit = false;
  G.particles.length = 0; G.trail.length = 0; G.shake = 0; G.hs = 0;
  parse(LEVELS[i]);
  G.scene = 'play';
}

// ---- endless: procedurally generated descent, difficulty ramps with depth ----
function startEndless(){
  G.endless = true; G.arcade = false; G.score = 0; G.depth = 1;
  G.runSeed = (Math.floor(Math.random() * 0x7fffffff)) >>> 0;
  loadEndlessDepth();
}
function loadEndlessDepth(){
  const difficulty = Math.min(1, (G.depth - 1) / 12);
  const seed = (G.runSeed + G.depth * 101) >>> 0;
  const lvl = generateLevel({ seed, difficulty });
  const rows = lvl ? lvl.rows : LEVELS[0].map;          // fallback (never hit by construction)
  G.curMap = rows; G.curName = (lvl && lvl.name) || 'THE DESCENT';
  G.lives = 3;                                          // fresh lives each depth
  G.dead = false; G.dir = null; G.lastCell = ''; G.confirmExit = false;
  G.particles.length = 0; G.trail.length = 0; G.shake = 0; G.hs = 0;
  parse({ map: rows, name: 'D' + G.depth + '  ' + G.curName });
  G.scene = 'play';
}

// ---- arcade: stitched infinite run. Authored levels first (in order), then
// procedural generation; a rising flood chases the hero, coins are the score. ----
function startArcade(){
  G.arcade = true; G.endless = false; G.score = 0; G.arcadeDepth = 0; G.arcadeFly = null;
  G.runSeed = (Math.floor(Math.random() * 0x7fffffff)) >>> 0;
  loadArcadeLevel();
}
function loadArcadeLevel(){
  const d = G.arcadeDepth;
  let rows, name;
  if(d < LEVELS.length){ rows = LEVELS[d].map; name = LEVELS[d].name; }   // authored, in order
  else {                                                                  // then generated
    const difficulty = Math.min(1, (d - LEVELS.length) / 12);
    const seed = (G.runSeed + d * 101) >>> 0; const lvl = generateLevel({ seed, difficulty });
    rows = lvl ? lvl.rows : LEVELS[0].map; name = (lvl && lvl.name) || 'THE DESCENT';
  }
  G.curMap = rows; G.curName = name;
  G.lives = 1;                                          // arcade is single-life — one touch ends the run
  G.dead = false; G.dir = null; G.lastCell = ''; G.confirmExit = false; G.arcadeFly = null;
  G.particles.length = 0; G.trail.length = 0; G.shake = 0; G.hs = 0;
  parse({ map: rows, name: 'ARCADE  ' + (d + 1) });     // G.score persists across levels (coin total)
  G.intro = null; G.startCell = null;                   // arcade: never show the entrance pyramid
  initFill();
  // fly the hero in from below onto its start — seamless arrival, same as between levels (and for level 1)
  const p = G.player, sx = p.cx, sy = p.cy;
  p.fx = sx; p.fy = sy + WARP_DIST; p.cx = p.tx = sx; p.cy = p.ty = Math.round(p.fy); p.moving = false;
  G.arcadeFly = { phase:'in', tx:sx, ty:sy };
  G.dir = 'up'; G.heroAngle = HERO_ANGLE.up;
  G.scene = 'play';
}
// Flood starts just below the map and rises; faster the deeper the run.
function initFill(){ G.fill = { y: G.ROWS*TILE + 16, speed: FILL_BASE + G.arcadeDepth*FILL_RAMP }; }
// Reached the tunnel: a real in-world flythrough (no fake overlay, no flash).
// Phase 'out' flies the hero straight up out of the tunnel; then the next level
// loads and phase 'in' drops the hero down onto its start. Camera follows.
function startArcadeFly(){
  G.player.moving = false; sound.play('win');
  burst(G.exitPos.x*TILE+8, G.exitPos.y*TILE+8, 18, PAL.gold, 50, 0.7);
  G.arcadeFly = { phase:'out', ty: G.exitPos.y - WARP_DIST };   // rise WARP_DIST tiles above the tunnel
  G.dir = 'up'; G.heroAngle = HERO_ANGLE.up;
}
function saveArcadeBest(){
  const s = getState(); const best = Math.max(s?.progress?.arcadeBest||0, G.score);
  patch({ progress: { ...(s.progress||{}), arcadeBest: best } });
}

function parse(def){
  const rows = def.map; G.levelName = def.name || '';
  G.ROWS = rows.length; G.COLS = Math.max(...rows.map(r=>r.length));
  G.grid = []; G.coins = new Set(); G.coinsLeft = 0; G.enemies = []; G.fvar = []; G.wvar = [];
  G.spikes = new Map();                   // 'x,y' -> {phase:'idle'|'armed'|'up', t}
  G.puffers = [];                         // pufferfish {x,y,off}
  const manualCoins = new Set();          // 'o' cells authored on the map (if any)
  const manualStars = new Set();          // '*' cells — rating pickups (never auto-coined)
  const laserEmitters = [];               // '='/'|' beam-gate emitters
  for(let y=0;y<G.ROWS;y++){
    G.grid[y]=[]; G.fvar[y]=[]; G.wvar[y]=[];
    for(let x=0;x<G.COLS;x++){
      const ch = rows[y][x] || '#';
      let t = 'floor';
      if(ch==='#') t='wall';
      else if(ch==='^'||ch==='v'||ch==='<'||ch==='>'){ t='spike';    // directional spikes
        const dir = ch==='v'?'down' : ch==='<'?'left' : ch==='>'?'right' : 'up';
        G.spikes.set(x+','+y,{phase:'idle',t:0,dir}); }
      else if(ch==='E'){ t='exit'; G.exitPos={x,y}; }
      else if(ch==='o') manualCoins.add(x+','+y);   // hand-placed coin (walkable floor)
      else if(ch==='*') manualStars.add(x+','+y);   // hand-placed star pickup (walkable floor)
      else if(ch==='=') laserEmitters.push({x,y,axis:'h'});   // horizontal beam gate
      else if(ch==='|') laserEmitters.push({x,y,axis:'v'});   // vertical beam gate
      else if(ch==='F') G.puffers.push({x,y,off:((x*7+y*13)%10)/10*PUFF_PERIOD});  // pufferfish (staggered)
      if(ch==='P') G.player={cx:x,cy:y,fx:x,fy:y,tx:x,ty:y,moving:false};
      if(ch==='X') G.enemies.push({cx:x,cy:y,fx:x,fy:y,tx:x,ty:y,moving:false,axis:'h',d:1});
      G.grid[y][x]=t;
      G.fvar[y][x]=(x*3+y)%3;
      G.wvar[y][x]=((x*7+y*3)%5===0)?(1+((x+y)%2)):0;
    }
  }
  // Coins: if the map hand-places any ('o'), use exactly those; otherwise fall back
  // to auto-placement on every slide-swept tile (existing/generated levels).
  const source = manualCoins.size ? manualCoins : computeSwept();
  for(const k of source){
    const [x,y]=k.split(',').map(Number);
    if(G.grid[y][x]==='floor' && !manualStars.has(k) && !(x===G.player.cx && y===G.player.cy)){ G.coins.add(k); G.coinsLeft++; }
  }
  G.coinsTotal = G.coinsLeft;
  // stars: hand-placed rating pickups, collected independently of coins
  G.stars = new Set(manualStars); G.starsTotal = G.stars.size;
  // lasers: each emitter's beam spans the passage to the walls along its axis
  G.lasers = []; G.laserCells = new Set();
  for(const e of laserEmitters){
    const cells = [[e.x, e.y]];
    if(e.axis==='h'){ let n=e.x-1; while(!isWall(n,e.y)){ cells.push([n,e.y]); n--; }
                      n=e.x+1; while(!isWall(n,e.y)){ cells.push([n,e.y]); n++; } }
    else            { let n=e.y-1; while(!isWall(e.x,n)){ cells.push([e.x,n]); n--; }
                      n=e.y+1; while(!isWall(e.x,n)){ cells.push([e.x,n]); n++; } }
    G.lasers.push({ x:e.x, y:e.y, axis:e.axis, cells });
    for(const [cx,cy] of cells) G.laserCells.add(cx+','+cy);
  }
  G.bufDir = null; G.heroAngle = 0;
  G.startCell = G.player ? { x:G.player.cx, y:G.player.cy } : null;  // entrance animation site
  G.intro = 0;                       // start the level-entrance intro
  const tgt = camTarget();          // snap camera onto the player at load
  G.boardX = tgt.x; G.boardY = tgt.y;
  G.psx = G.psy = 1;
}

function isWall(x,y){ return x<0||y<0||x>=G.COLS||y>=G.ROWS||G.grid[y][x]==='wall'; }

// Slide-flood from the start: every tile any slide passes through. Used so coins
// are placed exactly on collectible tiles (the slide collects on pass-through).
function computeSwept(){
  const sw=new Set(); if(!G.player) return sw;
  const sx=G.player.cx, sy=G.player.cy, key=sx+','+sy;
  sw.add(key); const seen=new Set([key]), q=[[sx,sy]];
  while(q.length){ const [x,y]=q.shift();
    for(const d in DIRS){ const [dx,dy]=DIRS[d]; let nx=x, ny=y;
      while(!isWall(nx+dx,ny+dy)){ nx+=dx; ny+=dy; sw.add(nx+','+ny);
        if(G.grid[ny][nx]==='exit') break; }
      const kk=nx+','+ny;
      if((nx!==x||ny!==y) && !seen.has(kk)){ seen.add(kk); q.push([nx,ny]); } }
  }
  return sw;
}

// ---------------- camera (follows the player across a large map) ----------------
// Screen-space origin of tile (0,0) that keeps the player dead-centre: the world
// (and the black void past the map edges) scrolls behind it, like the original.
function camTarget(){
  const p=G.player, viewH=VH-HUD_H;
  const pxw = p? p.fx*TILE+TILE/2 : G.COLS*TILE/2;
  const pyw = p? p.fy*TILE+TILE/2 : G.ROWS*TILE/2;
  return { x: Math.round(VW/2 - pxw), y: Math.round(HUD_H + viewH/2 - pyw) };
}
function updateCamera(dt){
  const t=camTarget();        // player always centred; camera follows it 1:1
  G.boardX = t.x; G.boardY = t.y;
}

function nextLevel(){
  if(G.endless){ G.depth++; saveBestDepth(); transition(()=>loadEndlessDepth()); return; }
  if(G.levelIndex+1 < LEVELS.length){ transition(()=>loadLevel(G.levelIndex+1)); }
  else { saveBest(); transition(()=>{ G.scene='win'; }); }
}
function saveBest(){
  const s = getState(); const best = Math.max(s?.progress?.best||0, G.score);
  patch({ progress: { ...(s.progress||{}), best, level: G.levelIndex+1 } });
}
function saveBestDepth(){
  const s = getState();
  const best = Math.max(s?.progress?.best||0, G.score);
  const bestDepth = Math.max(s?.progress?.bestDepth||0, G.depth);
  patch({ progress: { ...(s.progress||{}), best, bestDepth } });
}
// Level gating: level 1 is always open; each cleared level unlocks the next.
// A level counts as cleared once it has a stars entry (written on result), so
// this also auto-migrates older saves — previously cleared levels stay open.
function unlockedCount(){
  const stars = getState()?.progress?.stars || {};
  const cleared = Object.keys(stars).map(Number).filter(n=>!Number.isNaN(n));
  const maxCleared = cleared.length ? Math.max(...cleared) : -1;
  return Math.max(1, Math.min(LEVELS.length, maxCleared + 2));
}

// ---------------- input ----------------
function bindInput(){
  addEventListener('keydown', e=>{
    const m={ArrowLeft:'left',ArrowRight:'right',ArrowUp:'up',ArrowDown:'down',a:'left',d:'right',w:'up',s:'down'};
    if(G.scene==='play' && m[e.key.toLowerCase?.()||e.key]){ e.preventDefault(); setDir(m[e.key.toLowerCase?.()||e.key]||m[e.key]); }
    else if((e.key==='Enter'||e.key===' ') && G.scene==='title'){ onButton('play'); }
  });
  const TH=8;                 // swipe threshold (px) — small = very responsive
  let ds=null, fired=false;
  let dsOnExit=false;
  const down = (cx,cy)=>{ ds={x:cx,y:cy}; fired=false;
    dsOnExit = G.scene==='play' && !G.confirmExit && inRect(toVirtual(cx,cy), EXIT_BTN); };  // gesture on exit btn
  const swipe = (cx,cy)=>{    // fire the direction the INSTANT the swipe crosses TH (mid-drag)
    if(!ds || fired || dsOnExit || G.confirmExit || G.scene!=='play') return;   // no move on exit btn / while dialog open
    const dx=cx-ds.x, dy=cy-ds.y;
    if(Math.abs(dx)>TH || Math.abs(dy)>TH){
      setDir(Math.abs(dx)>Math.abs(dy)?(dx>0?'right':'left'):(dy>0?'down':'up')); fired=true;
    }
  };
  const up = (cx,cy)=>{
    if(!ds) return; const dx=cx-ds.x, dy=cy-ds.y, moved=Math.abs(dx)>TH||Math.abs(dy)>TH;
    const v=toVirtual(cx,cy);
    if(G.confirmExit){ if(!moved) handleTap(v.x,v.y); }        // confirm dialog (YES/NO)
    else if(dsOnExit){ if(inRect(v, EXIT_BTN)) onButton('exit'); }   // open the exit dialog
    else if(G.scene==='play'){ if(!fired && moved) setDir(Math.abs(dx)>Math.abs(dy)?(dx>0?'right':'left'):(dy>0?'down':'up')); }
    else if(!moved){ handleTap(v.x,v.y); }
    ds=null; fired=false; dsOnExit=false;
  };
  const cv = G.canvas;
  cv.addEventListener('pointerdown', e=>down(e.clientX,e.clientY));
  cv.addEventListener('pointermove', e=>swipe(e.clientX,e.clientY));
  cv.addEventListener('pointerup',   e=>up(e.clientX,e.clientY));
  cv.addEventListener('touchstart', e=>{ const t=e.touches[0]; down(t.clientX,t.clientY); },{passive:true});
  cv.addEventListener('touchmove',  e=>{ const t=e.touches[0]; swipe(t.clientX,t.clientY); },{passive:true});
  cv.addEventListener('touchend',   e=>{ const t=e.changedTouches[0]; up(t.clientX,t.clientY); },{passive:true});
}
function toVirtual(cx,cy){ const r=G.canvas.getBoundingClientRect();
  return { x:(cx-r.left)*(VW/r.width), y:(cy-r.top)*(VH/r.height) }; }
function handleTap(vx,vy){
  for(const b of G.buttons) if(vx>=b.x&&vx<=b.x+b.w&&vy>=b.y&&vy<=b.y+b.h){ onButton(b.id); return; }
}
function onButton(id){
  sound.play('tap');
  if(id==='start') transition(()=>{ G.scene='select'; G.modeTab='story'; });   // title tap → mode screen (story)
  else if(id==='tabStory') G.modeTab='story';                        // bottom bar: switch tab (instant)
  else if(id==='tabArcade') G.modeTab='arcade';
  else if(id==='arcadeStart') startArcade();                         // START → seamless fly-in to level 1 (no fade)
  else if(id==='play') transition(()=>{ G.scene='select'; G.modeTab='story'; });  // (legacy) PLAY → level select
  else if(id==='endless') transition(startEndless);                  // (legacy) ENDLESS → generated descent
  else if(id==='retry') transition(()=> G.arcade ? startArcade() : G.endless ? startEndless() : startRun(G.runStart||0));
  else if(id==='exit') G.confirmExit = true;                        // open in-match confirm dialog
  else if(id==='confirmNo') G.confirmExit = false;                  // stay in the match
  else if(id==='confirmYes'){ G.confirmExit = false; transition(()=>{ G.scene='title'; }); } // leave
  else if(id==='continue') nextLevel();                             // result screen → advance
  else if(id && id.startsWith('lvl')){ const i=+id.slice(3);           // pick a level card
    if(i>=0 && i<unlockedCount()) transition(()=>startRun(i)); }        // ignore locked picks
  else if(id==='menu') transition(()=>{ G.scene='title'; });
  else if(id==='settings') transition(()=>{ G.scene='menu'; });
  else if(id==='sound') sound.setEnabled(!sound.isEnabled());          // toggle, stay on menu
  else if(id==='reset'){ reset(); G.flash=0.4; G.flashCol=PAL.goldHi; } // wipe progress + flash
  else if(id==='debug') transition(()=>{ G.scene='debug'; });          // open developer menu
  else if(id==='god'){ G.godMode=!G.godMode; G.flash=0.2; G.flashCol=G.godMode?PAL.fugu:PAL.wallD; } // toggle immortality
}

function setDir(d){
  if(G.scene!=='play' || G.trans || G.dead || G.intro!==null || G.arcadeFly || !G.player) return;
  if(G.player.moving){ G.bufDir=d; return; }  // buffer input mid-slide → instant turn at the wall
  doMove(d);
}
function doMove(d){
  const [dx,dy]=DIRS[d]; let nx=G.player.cx, ny=G.player.cy;
  while(!isWall(nx+dx,ny+dy)){ nx+=dx; ny+=dy; }
  if(nx===G.player.cx && ny===G.player.cy) return false;
  G.slideFromX=G.player.cx; G.slideFromY=G.player.cy;   // origin for speed-line length
  G.player.tx=nx; G.player.ty=ny; G.player.moving=true; G.dir=d;
  G.heroAngle = HERO_ANGLE[d];   // face feet toward the wall we slide into
  G.psx=0.78; G.psy=1.3;         // local: thin across, stretched toward the feet
  sound.play('tap');
  return true;
}

// ---------------- update ----------------
function update(dt){
  G.t += dt;
  // decays that always run
  G.shake = Math.max(0, G.shake - dt*40);
  G.flash = Math.max(0, G.flash - dt*2.2);
  G.psx += (1-G.psx)*Math.min(1,dt*14); G.psy += (1-G.psy)*Math.min(1,dt*14);
  updateParticles(dt);
  if(G.trans){ updateTransition(dt); }

  if(G.scene!=='play'){ if(G.scene==='result' && G.result) G.result.t += dt; return; }
  if(G.confirmExit) return;   // frozen behind the exit-confirm dialog
  if(G.intro!==null){ G.intro+=dt; if(G.intro>=INTRO_DUR) G.intro=null; if(G.player) updateCamera(dt); return; } // entrance intro
  if(G.hs>0){ G.hs-=dt; return; }     // hit-stop freezes the world
  if(G.dead){ G.deadTimer-=dt; if(G.deadTimer<=0) respawnOrEnd(); if(G.player) updateCamera(dt); return; }
  // arcade flythrough: one continuous upward flight — the hero rises out of the
  // tunnel, the next level loads, and it keeps rising from below onto the new
  // start (bottom-up, along the direction of travel). Camera follows; no overlay.
  if(G.arcadeFly){
    const p=G.player, w=G.arcadeFly, step=FLY_SPEED*dt;
    if(w.phase==='out'){
      p.fy-=step; p.fx=p.tx=Math.round(p.fx); G.heroAngle=HERO_ANGLE.up;
      if(p.fy<=w.ty){ G.arcadeDepth++; loadArcadeLevel(); }   // clear of tunnel → load next (sets up the 'in' fly)
    } else {                                            // 'in' — rise onto the start (bottom-up)
      p.fy-=step; p.fx=w.tx; G.heroAngle=HERO_ANGLE.up;
      if(p.fy<=w.ty){ p.fy=w.ty; p.fx=w.tx; p.cx=w.tx; p.cy=w.ty; p.moving=false;
        G.lastCell=w.tx+','+w.ty; G.arcadeFly=null;
        G.dir=null; G.heroAngle=0; }                    // landed — stand upright on the start, resume play
    }
    if(G.player) updateCamera(dt); return;
  }

  // player slide
  const p=G.player;
  if(p.moving){
    const dx=p.tx-p.fx, dy=p.ty-p.fy, dist=Math.hypot(dx,dy), step=SLIDE*dt;
    const pcx=Math.round(p.fx), pcy=Math.round(p.fy);
    let stopped=false;
    if(step>=dist){ p.fx=p.tx; p.fy=p.ty; p.cx=p.tx; p.cy=p.ty; p.moving=false; stopped=true; }
    else { p.fx+=dx/dist*step; p.fy+=dy/dist*step; G.trail.push({x:p.fx,y:p.fy}); if(G.trail.length>6) G.trail.shift(); }
    // enter EVERY integer cell crossed this frame (so a fast step never skips a coin/hazard)
    const cx=Math.round(p.fx), cy=Math.round(p.fy), sx=Math.sign(cx-pcx), sy=Math.sign(cy-pcy);
    let ix=pcx, iy=pcy;
    while(ix!==cx || iy!==cy){ ix+=sx; iy+=sy; const k=ix+','+iy;
      if(k!==G.lastCell){ G.lastCell=k; enterCell(ix,iy); if(G.dead) break; } }
    if(stopped && !G.dead) onStop();
  } else { G.trail.length=0; }
  if(G.player) updateCamera(dt);      // camera tracks the player 1:1 after the move resolves

  // arcade flood — rises (accelerating with depth), resets per level; a touch ends the run
  if(G.arcade && G.fill && !G.dead && p){
    G.fill.y -= G.fill.speed*dt;
    if(p.fy*TILE + 10 >= G.fill.y){ die(); return; }
  }

  // lasers — lethal while firing (also catches a hero resting on a live beam)
  if(G.laserCells && G.laserCells.size && !G.dead && p){
    if((G.t % LASER_PERIOD) >= LASER_CHARGE &&
       G.laserCells.has(Math.round(p.fx)+','+Math.round(p.fy))){ die(); return; }
  }

  // spikes — armed by a touch, extend after SPIKE_ARM, lethal while up
  if(G.spikes && G.spikes.size && !G.dead && p){
    const pk = Math.round(p.fx)+','+Math.round(p.fy);
    for(const [k,sp] of G.spikes){
      if(sp.phase==='armed'){ sp.t-=dt;
        if(sp.t<=0){ sp.phase='up'; sp.t=SPIKE_UP; G.shake=Math.max(G.shake,1.5);
          if(k===pk){ die(); return; } } }                  // popped out under the hero
      else if(sp.phase==='up'){ sp.t-=dt;
        if(sp.t<=0){ sp.phase='idle'; }
        else if(k===pk){ die(); return; } }                 // standing on extended spikes
    }
  }

  // pufferfish — when fully puffed, lethal across its 3x3
  if(G.puffers && G.puffers.length && !G.dead && p){
    const px=Math.round(p.fx), py=Math.round(p.fy);
    for(const f of G.puffers){
      if(puffInflation(G.t+f.off) >= 0.9 && Math.abs(px-f.x)<=1 && Math.abs(py-f.y)<=1){ die(); return; }
    }
  }

  // enemies
  for(const e of G.enemies){
    if(!e.moving){
      let dx=e.axis==='h'?e.d:0, dy=e.axis==='v'?e.d:0;
      if(isWall(e.cx+dx,e.cy+dy)){ e.d*=-1; dx=-dx; dy=-dy; }
      if(!isWall(e.cx+dx,e.cy+dy)){ e.tx=e.cx+dx; e.ty=e.cy+dy; e.moving=true; }
    }
    if(e.moving){
      const dx=e.tx-e.fx, dy=e.ty-e.fy, dist=Math.hypot(dx,dy), step=ENEMY*dt;
      if(step>=dist){ e.fx=e.tx; e.fy=e.ty; e.cx=e.tx; e.cy=e.ty; e.moving=false; }
      else { e.fx+=dx/dist*step; e.fy+=dy/dist*step; }
    }
    if(!G.dead && Math.hypot(p.fx-e.fx, p.fy-e.fy) < HIT){ die(); return; }
  }

  // ambient dust (world-space; the camera carries it)
  G.dustTimer-=dt;
  if(G.dustTimer<=0){ G.dustTimer=0.5;
    G.particles.push({ x:Math.random()*G.COLS*TILE, y:G.ROWS*TILE,
      vx:(Math.random()-0.5)*4, vy:-6-Math.random()*6, life:2.5, maxLife:2.5, color:PAL.lapis, size:1, grav:-2 }); }
}

function enterCell(x,y){
  if(x<0||y<0||x>=G.COLS||y>=G.ROWS) return;
  const k=x+','+y;
  if(G.coins.has(k)){ G.coins.delete(k); G.coinsLeft--; G.score++;
    burst(x*TILE+8, y*TILE+8, 6, PAL.gold, 30, 0.5); sound.play('tap'); G.flash=0.12; G.flashCol=PAL.goldHi; }
  if(G.stars.has(k)){ G.stars.delete(k);   // rating pickup — bigger pop, no gold (coins are the currency)
    burst(x*TILE+8, y*TILE+8, 14, PAL.goldHi, 46, 0.7); sound.play('win'); G.flash=0.22; G.flashCol=PAL.goldHi; }
  const t=G.grid[y][x];
  if(t==='spike'){ const sp=G.spikes.get(k);
    if(sp){ if(sp.phase==='up'){ die(); return; }                 // already out → lethal
            else if(sp.phase==='idle'){ sp.phase='armed'; sp.t=SPIKE_ARM; } } }  // touch → arm
  if(G.laserCells && G.laserCells.has(k) && (G.t % LASER_PERIOD) >= LASER_CHARGE){ die(); return; }
  if(t==='exit'){ exitReached(); }
}
function onStop(){
  burst(G.player.cx*TILE+8, G.player.cy*TILE+13, 4, PAL.sandL, 16, 0.35, 24);
  G.psx=1.4; G.psy=0.62; G.shake=Math.max(G.shake,1.2);   // no hit-stop → buffered turns chain instantly
  if(G.bufDir){ const d=G.bufDir; G.bufDir=null; doMove(d); }  // chain the buffered input
}
function exitReached(){
  if(G.dead) return;
  if(G.arcade){ startArcadeFly(); return; }   // arcade: tunnel → fly to the next stitched level
  G.flash=0.5; G.flashCol=PAL.goldHi; sound.play('win');
  burst(G.exitPos.x*TILE+8, G.exitPos.y*TILE+8, 18, PAL.gold, 50, 0.7);
  G.player.moving=false; G.dead=true; G.deadTimer=0.45; G._won=true;
}
function die(){
  if(G.dead) return;
  if(G.godMode){ G.flash=Math.max(G.flash,0.08); G.flashCol=PAL.lapisL; return; }   // debug immortality: shrug it off
  G.dead=true; G._won=false; G.player.moving=false;
  G.lives--; G.shake=6; G.flash=0.6; G.flashCol=PAL.red; G.hs=0.12;
  burst(G.player.fx*TILE+8, G.player.fy*TILE+8, 16, PAL.red, 60, 0.7);
  burst(G.player.fx*TILE+8, G.player.fy*TILE+8, 10, PAL.sandD, 40, 0.7, 30);
  sound.play('lose');
  G.deadTimer = G.lives<=0 ? 0.7 : 0.55;
}
// Level cleared → rating = collected star pickups (0..3); coin % drives the gold bar only.
function showResult(){
  const total=G.coinsTotal||0, collected=Math.max(0, total-G.coinsLeft);
  const pct = total>0 ? collected/total : 1;
  const stars = Math.min(3, G.starsTotal - G.stars.size);
  if(!G.endless){
    const s=getState(); const st={ ...((s.progress&&s.progress.stars)||{}) };
    st[G.levelIndex] = Math.max(st[G.levelIndex]||0, stars);
    patch({ progress: { ...(s.progress||{}), stars: st } });
  } else { saveBestDepth(); }
  G.result = { name:G.levelName, total, collected, pct, stars, t:0 };
  transition(()=>{ G.scene='result'; });
}
function respawnOrEnd(){
  if(G._won){ G._won=false; showResult(); return; }
  if(G.arcade){ saveArcadeBest(); transition(()=>{ G.scene='gameover'; }); return; }   // single-life run ends
  if(G.lives<=0){ (G.endless?saveBestDepth:saveBest)(); transition(()=>{ G.scene='gameover'; }); }
  else {
    const keptCoins = G.coins, keptLeft = G.coinsLeft, keptStars = G.stars;   // pickups already grabbed stay grabbed
    parse(G.endless ? { map:G.curMap, name:'D'+G.depth+'  '+G.curName } : LEVELS[G.levelIndex]);
    G.coins = keptCoins; G.coinsLeft = keptLeft; G.stars = keptStars;          // only the uncollected pickups remain
    G.dead=false; G.dir=null; G.lastCell=''; G.trail.length=0;
  }
}

// ---------------- particles / fx ----------------
function burst(x,y,n,color,spd,life,grav=0){
  for(let i=0;i<n;i++){ const a=Math.random()*Math.PI*2, s=Math.random()*spd;
    G.particles.push({ x,y, vx:Math.cos(a)*s, vy:Math.sin(a)*s - (grav?spd*0.3:0),
      life:life*(0.6+Math.random()*0.4), maxLife:life, color, size:1+(Math.random()<0.3?1:0), grav }); }
}
function updateParticles(dt){
  for(let i=G.particles.length-1;i>=0;i--){ const p=G.particles[i];
    p.x+=p.vx*dt; p.y+=p.vy*dt; p.vy+=(p.grav||0)*dt; p.life-=dt;
    if(p.life<=0) G.particles.splice(i,1); }
}
function transition(after){ if(G.trans) return; G.trans={ t:0, dur:0.5, after, fired:false }; }
function updateTransition(dt){ const tr=G.trans; tr.t+=dt;
  if(!tr.fired && tr.t>=tr.dur/2){ tr.fired=true; tr.after(); }
  if(tr.t>=tr.dur){ G.trans=null; } }

// ---------------- render ----------------
function render(){
  const ctx=G.ctx; ctx.imageSmoothingEnabled=false;
  ctx.fillStyle=PAL.bg; ctx.fillRect(0,0,VW,VH);

  if(G.scene==='title'){ G.buttons=renderTitle(ctx,VW,VH,G.t,{best:getState()?.progress?.best||0, arcadeBest:getState()?.progress?.arcadeBest||0}); }
  else if(G.scene==='select'){ G.buttons=renderPlayModes(ctx,VW,VH,G.t,{tab:G.modeTab, unlocked:unlockedCount(), total:LEVELS.length, stars:getState()?.progress?.stars||{}, arcadeBest:getState()?.progress?.arcadeBest||0}); }
  else if(G.scene==='result'){ G.buttons=renderResult(ctx,VW,VH,G.t,G.result); }
  else if(G.scene==='menu'){ G.buttons=renderMenu(ctx,VW,VH,G.t,{soundOn:sound.isEnabled()}); }
  else if(G.scene==='debug'){ G.buttons=renderDebug(ctx,VW,VH,G.t,{god:G.godMode}); }
  else if(G.scene==='win'){ G.buttons=renderWin(ctx,VW,VH,G.t,{score:G.score,best:getState()?.progress?.best||0}); }
  else if(G.scene==='gameover'){ G.buttons=renderGameover(ctx,VW,VH,G.t,{score:G.score,
    best:(G.arcade?getState()?.progress?.arcadeBest:getState()?.progress?.best)||0,
    depth:G.endless?G.depth:null, bestDepth:getState()?.progress?.bestDepth||0}); }
  else { renderPlay(ctx); G.buttons = G.confirmExit ? drawConfirm(ctx) : [EXIT_BTN]; }

  // flash overlay
  if(G.flash>0){ ctx.globalAlpha=Math.min(0.6,G.flash); ctx.fillStyle=G.flashCol; ctx.fillRect(0,0,VW,VH); ctx.globalAlpha=1; }
  // transition wipe
  if(G.trans){ const tr=G.trans; const a=tr.t<tr.dur/2 ? tr.t/(tr.dur/2) : 1-(tr.t-tr.dur/2)/(tr.dur/2);
    ctx.globalAlpha=Math.max(0,Math.min(1,a)); ctx.fillStyle=PAL.bg; ctx.fillRect(0,0,VW,VH); ctx.globalAlpha=1; }
}

function renderPlay(ctx){
  const ox=(Math.random()*2-1)*G.shake, oy=(Math.random()*2-1)*G.shake;
  ctx.save(); ctx.translate(Math.round(ox),Math.round(oy));
  const bx=G.boardX, by=G.boardY;

  // only iterate tiles inside the camera view (+1 ring) — maps can be large
  const x0=Math.max(0, Math.floor((-bx)/TILE)-1),       x1=Math.min(G.COLS-1, Math.ceil((VW-bx)/TILE)+1);
  const y0=Math.max(0, Math.floor((HUD_H-by)/TILE)-1),  y1=Math.min(G.ROWS-1, Math.ceil((VH-by)/TILE)+1);

  // board tiles
  for(let y=y0;y<=y1;y++) for(let x=x0;x<=x1;x++){
    const px=Math.round(bx+x*TILE), py=Math.round(by+y*TILE), t=G.grid[y][x];
    if(t==='wall'){ ctx.drawImage(sprite('wall'+G.wvar[y][x]), px, py); }
    else { ctx.drawImage(sprite('floor'+G.fvar[y][x]), px, py); }   // spikes drawn by drawSpikes (state-based)
  }
  // neon carved-stone outline on every wall edge facing an open cell
  drawWallEdges(ctx, x0, y0, x1, y1);
  drawSpikes(ctx, bx, by);   // retracted / arming / extended
  // coins (bob + shine)
  for(const c of G.coins){ const [x,y]=c.split(',').map(Number);
    if(x<x0||x>x1||y<y0||y>y1) continue;
    const px=Math.round(bx+x*TILE), py=Math.round(by+y*TILE+Math.sin(G.t*4+x+y)*1.5);
    ctx.drawImage(sprite('ankh'), px, py);
  }
  // stars (bob + twinkling glow) — rating pickups, brighter than coins
  for(const c of G.stars){ const [x,y]=c.split(',').map(Number);
    if(x<x0||x>x1||y<y0||y>y1) continue;
    const px=Math.round(bx+x*TILE), py=Math.round(by+y*TILE+Math.sin(G.t*3+x*2+y)*1.6);
    const gl=0.35+0.35*Math.sin(G.t*4+x+y);
    ctx.globalAlpha=gl; ctx.fillStyle=PAL.goldHi; ctx.beginPath(); ctx.arc(px+8,py+8,6,0,7); ctx.fill(); ctx.globalAlpha=1;
    ctx.drawImage(sprite('star'), px, py);
  }
  // tomb doorway: two flickering torches flanking the sarcophagus
  drawTorch(ctx, bx+(G.exitPos.x-1)*TILE+8, by+G.exitPos.y*TILE+8);
  drawTorch(ctx, bx+(G.exitPos.x+1)*TILE+8, by+G.exitPos.y*TILE+8);
  // exit glow + sarcophagus
  const ex=bx+G.exitPos.x*TILE+8, ey=by+G.exitPos.y*TILE+8;
  const gl=0.4+0.3*Math.sin(G.t*3);
  ctx.globalAlpha=gl*0.5; ctx.fillStyle=PAL.lapisL; ctx.beginPath(); ctx.arc(ex,ey,12,0,7); ctx.fill();
  ctx.globalAlpha=gl*0.4; ctx.fillStyle=PAL.goldHi; ctx.beginPath(); ctx.arc(ex,ey,8,0,7); ctx.fill();
  ctx.globalAlpha=1; ctx.drawImage(sprite('exit'), Math.round(bx+G.exitPos.x*TILE), Math.round(by+G.exitPos.y*TILE));
  if(G.arcade) drawPortal(ctx, ex, ey);   // tunnel to the next stitched level

  // lasers (charge telegraph → lethal flash)
  drawLasers(ctx, bx, by);
  drawPuffers(ctx, bx, by);   // pufferfish (inflate/deflate)

  // enemies
  for(const e of G.enemies){ const px=Math.round(bx+e.fx*TILE), py=Math.round(by+e.fy*TILE+Math.sin(G.t*6+e.cx));
    ctx.drawImage(sprite('mummy'), px, py);
    ctx.globalAlpha=0.5+0.3*Math.sin(G.t*8); ctx.fillStyle=PAL.red; // eye glow
    ctx.fillRect(px+6,py+4,1,1); ctx.fillRect(px+9,py+4,1,1); ctx.globalAlpha=1; }

  // player — slides as a stretched "ball" trailing speed-lines; lands as the jackal
  const p=G.player;
  if(p){
    const ang=G.heroAngle||0, cx=bx+p.fx*TILE+8, cy=by+p.fy*TILE+8;
    if((p.moving||G.arcadeFly) && G.dir && (!G.dead||G._won)){
      // speed-lines behind, length grows with distance flown this slide (fixed during a warp)
      const trav=Math.hypot(p.fx-G.slideFromX, p.fy-G.slideFromY)*TILE;
      const len=G.arcadeFly ? 40 : Math.min(44, trav*0.95);
      if(len>3){
        const [ddx,ddy]=DIRS[G.dir], ox=-ddx, oy=-ddy, qx=-ddy, qy=ddx;  // back + perpendicular
        ctx.lineWidth=1;
        for(const off of [-5,-2,2,5]){
          const hx=cx+qx*off+ox*5, hy=cy+qy*off+oy*5, tx=hx+ox*len, ty=hy+oy*len;
          const g=ctx.createLinearGradient(hx,hy,tx,ty);
          g.addColorStop(0,PAL.goldHi); g.addColorStop(1,'rgba(255,210,30,0)');
          ctx.strokeStyle=g; ctx.beginPath(); ctx.moveTo(hx,hy); ctx.lineTo(tx,ty); ctx.stroke();
        }
      }
    }
    if(!G.dead || G._won){
      // during the intro the hero stays hidden until the door opens, then fades up
      let a=1, ddy=0;
      if(G.intro!==null){ const tI=Math.min(1,G.intro/INTRO_DUR); a=Math.max(0,Math.min(1,(tI-0.5)/0.4)); ddy=(1-a)*6; }
      if(a>0){ ctx.save(); ctx.globalAlpha=a; ctx.translate(Math.round(cx), Math.round(cy+ddy)); ctx.rotate(ang); ctx.scale(G.psx,G.psy);
        ctx.drawImage(sprite((p.moving||G.arcadeFly)?'ball':'anubis'), -8, -8); ctx.restore(); ctx.globalAlpha=1; }
    }
  }
  // entrance pyramid (over the hidden hero): animates during intro, then a faint ghost
  drawEntrance(ctx, bx, by);
  // particles (stored in world space — offset by the camera origin)
  for(const pt of G.particles){ ctx.globalAlpha=Math.max(0,Math.min(1,pt.life/pt.maxLife));
    ctx.fillStyle=pt.color; ctx.fillRect(Math.round(bx+pt.x),Math.round(by+pt.y),pt.size,pt.size); }
  ctx.globalAlpha=1;

  // arcade rising flood (world-space; the camera carries it) — hidden during a warp
  if(G.arcade && G.fill && !G.arcadeFly) drawFill(ctx, bx, by);

  // vignette
  const vg=ctx.createRadialGradient(VW/2,VH/2,60,VW/2,VH/2,160);
  vg.addColorStop(0,'rgba(0,0,0,0)'); vg.addColorStop(1,'rgba(0,0,0,0.45)');
  ctx.fillStyle=vg; ctx.fillRect(0,0,VW,VH);

  ctx.restore();
  drawHUD(ctx);
}

// Arcade tunnel/portal: concentric swirling rings of light at the exit.
function drawPortal(ctx, ex, ey){
  const P=PAL;
  for(let r=13; r>=3; r-=3){
    const a=0.25+0.25*Math.sin(G.t*4 - r*0.5);
    ctx.globalAlpha=a; ctx.strokeStyle=r>7?P.lapisL:P.goldHi; ctx.lineWidth=1;
    ctx.beginPath(); ctx.arc(ex, ey, r, 0, 7); ctx.stroke();
  }
  ctx.globalAlpha=1; ctx.fillStyle=P.white; ctx.beginPath(); ctx.arc(ex, ey, 2+Math.sin(G.t*6), 0, 7); ctx.fill();
  // orbiting sparks spiral inward
  for(let i=0;i<6;i++){ const ang=G.t*3+i*1.05, rr=3+((G.t*1.6+i*0.3)%1)*10;
    ctx.globalAlpha=0.7; ctx.fillStyle=P.goldHi; ctx.fillRect(Math.round(ex+Math.cos(ang)*rr), Math.round(ey+Math.sin(ang)*rr), 1,1); }
  ctx.globalAlpha=1;
}

// Rising "cursed sand" flood: a jagged, glowing crimson tide across the level
// width, from its top edge down past the bottom. World-space (offset by camera).
function drawFill(ctx, bx, by){
  const P=PAL, topY=Math.round(by+G.fill.y), leftX=Math.round(bx), w=G.COLS*TILE;
  if(topY>VH) return;                                 // still below the view
  const y0=Math.max(HUD_H, topY);
  // body
  const g=ctx.createLinearGradient(0, topY, 0, VH);
  g.addColorStop(0, P.wall); g.addColorStop(1, P.wallD);
  ctx.fillStyle=g; ctx.fillRect(leftX, y0, w, VH-y0);
  // jagged bright crest riding the top edge
  for(let i=0;i<w;i++){ const wx=leftX+i;
    if(wx<0||wx>VW) continue;
    const j=Math.round(Math.sin((wx+G.t*40)*0.4)*1.5 + h2(wx, Math.floor(G.t*6))*2);
    const cy=topY+j;
    if(cy>=HUD_H && cy<VH){ ctx.fillStyle=(h2(wx*1.7, 3)>0.5)?P.goldHi:P.wallHi; ctx.fillRect(wx, cy, 1, 1); }
    if(cy+1>=HUD_H && cy+1<VH){ ctx.fillStyle=P.wallEdge; ctx.globalAlpha=0.5; ctx.fillRect(wx, cy+1, 1, 1); ctx.globalAlpha=1; }
  }
}


// Spikes: base slab (with rivets) + triangular points that rise (amber) while
// arming, then SNAP out (overshoot + white flash) when extended (lethal).
function drawSpikes(ctx, bx, by){
  if(!G.spikes || !G.spikes.size) return;
  const P=PAL;
  for(const [k,sp] of G.spikes){
    const [x,y]=k.split(',').map(Number);
    const px=Math.round(bx+x*TILE), py=Math.round(by+y*TILE);
    let h=0, col=P.steel, hi=P.steelHi, snap=0;
    if(sp.phase==='armed'){ h=1-Math.max(0,sp.t/SPIKE_ARM); col=P.gold; hi=P.goldHi; }
    else if(sp.phase==='up'){ h=1; col=P.steel; hi=P.white; snap=Math.max(0,1-(SPIKE_UP-sp.t)/0.14); }
    drawSpikeGfx(ctx, px, py, sp.dir||'up', h, col, hi, snap);
  }
}
function drawSpikeGfx(ctx, px, py, dir, h, col, hi, snap){
  const P=PAL, L=Math.max(1, Math.round(7*h*(1+(snap||0)*0.6))), flash=(snap||0)>0.5, pos=[3,8,13];
  const spike=(bxc,byc,dx,dy)=>{                    // base centre → triangular point along (dx,dy)
    const pxu=-dy*2, pyu=dx*2, ax=bxc+dx*L, ay=byc+dy*L;
    ctx.fillStyle=flash?P.white:col;
    ctx.beginPath(); ctx.moveTo(bxc+pxu,byc+pyu); ctx.lineTo(bxc-pxu,byc-pyu); ctx.lineTo(ax,ay); ctx.closePath(); ctx.fill();
    ctx.strokeStyle=P.steelD; ctx.lineWidth=1; ctx.beginPath(); ctx.moveTo(bxc-pxu,byc-pyu); ctx.lineTo(ax,ay); ctx.stroke();
    ctx.fillStyle=P.white; ctx.fillRect(Math.round(ax),Math.round(ay),1,1);
  };
  const rivet=(rx,ry)=>{ ctx.fillStyle=P.steelD; ctx.fillRect(rx,ry,1,1); };
  if(dir==='down'){ ctx.fillStyle=P.stoneD;ctx.fillRect(px,py,TILE,5);ctx.fillStyle=P.stone;ctx.fillRect(px,py+4,TILE,1);rivet(px+3,py+2);rivet(px+12,py+2);
    if(h>0) for(const X of pos) spike(px+X,py+5,0,1); }
  else if(dir==='left'){ ctx.fillStyle=P.stoneD;ctx.fillRect(px+11,py,5,TILE);ctx.fillStyle=P.stone;ctx.fillRect(px+11,py,1,TILE);rivet(px+13,py+3);rivet(px+13,py+12);
    if(h>0) for(const Y of pos) spike(px+11,py+Y,-1,0); }
  else if(dir==='right'){ ctx.fillStyle=P.stoneD;ctx.fillRect(px,py,5,TILE);ctx.fillStyle=P.stone;ctx.fillRect(px+4,py,1,TILE);rivet(px+2,py+3);rivet(px+2,py+12);
    if(h>0) for(const Y of pos) spike(px+5,py+Y,1,0); }
  else { ctx.fillStyle=P.stoneD;ctx.fillRect(px,py+11,TILE,5);ctx.fillStyle=P.stone;ctx.fillRect(px,py+11,TILE,1);rivet(px+3,py+13);rivet(px+12,py+13);
    if(h>0) for(const X of pos) spike(px+X,py+11,0,-1); }
}

// Laser beam-gates: energy fills outward from the emitter while charging (sparks
// spiral in, pre-fire pulse), then a layered lethal beam (glow · red · white core
// + crackle). Emitter goes white-hot on fire.
function drawLasers(ctx, bx, by){
  if(!G.lasers || !G.lasers.length) return;
  const P=PAL, phase=G.t%LASER_PERIOD, firing=phase>=LASER_CHARGE, charge=Math.min(1,phase/LASER_CHARGE);
  for(const L of G.lasers){
    const hz=L.axis==='h', ex=Math.round(bx+L.x*TILE+8), ey=Math.round(by+L.y*TILE+8);
    for(const [cx,cy] of L.cells){
      const px=Math.round(bx+cx*TILE), py=Math.round(by+cy*TILE);
      if(firing){
        const ft=(phase-LASER_CHARGE)/LASER_FIRE, fade=1-ft*0.35;
        ctx.globalAlpha=0.30*fade; ctx.fillStyle=P.laserGlow; if(hz)ctx.fillRect(px,py+3,TILE,10);else ctx.fillRect(px+3,py,10,TILE);
        ctx.globalAlpha=0.95*fade; ctx.fillStyle=P.laserHot;  if(hz)ctx.fillRect(px,py+6,TILE,4); else ctx.fillRect(px+6,py,4,TILE);
        ctx.globalAlpha=fade;      ctx.fillStyle=P.laserCore; if(hz)ctx.fillRect(px,py+7,TILE,2); else ctx.fillRect(px+7,py,2,TILE);
        ctx.globalAlpha=fade; ctx.fillStyle=P.white;
        for(let k=1;k<TILE;k+=2){ if(h2(cx*7+cy*3+k, Math.floor(G.t*45))>0.62){ if(hz)ctx.fillRect(px+k,py+(h2(k,cy)>0.5?5:9),1,1); else ctx.fillRect(px+(h2(k,cx)>0.5?5:9),py+k,1,1); } }
      } else {
        const d=hz?Math.abs(cx-L.x):Math.abs(cy-L.y);
        if(d > charge*L.cells.length+0.4) continue;               // fill outward from emitter
        const near=charge>0.75, pf=near?(Math.sin(G.t*38)*0.5+0.5):0, w=1+Math.round(charge*2+pf*2);
        ctx.globalAlpha=0.12+0.5*charge+pf*0.3; ctx.fillStyle=near?P.laserHot:P.wall;
        if(hz)ctx.fillRect(px,py+8-(w>>1),TILE,w); else ctx.fillRect(px+8-(w>>1),py,w,TILE);
        if(h2(cx*5+cy, Math.floor(G.t*28))>0.72-charge*0.35){ ctx.globalAlpha=0.7*charge; ctx.fillStyle=P.laserGlow;
          if(hz)ctx.fillRect(px+(Math.floor(G.t*50+cx*3)%TILE),py+8,1,1); else ctx.fillRect(px+8,py+(Math.floor(G.t*50+cy*3)%TILE),1,1); }
      }
    }
    if(firing){ ctx.globalAlpha=1; ctx.fillStyle=P.white; ctx.beginPath();ctx.arc(ex,ey,5+Math.sin(G.t*30),0,7);ctx.fill();
      ctx.fillStyle=P.laserHot; ctx.fillRect(ex-1,ey-1,2,2); }
    else { const cr=2+charge*3; ctx.globalAlpha=0.4+0.6*charge; ctx.fillStyle=P.laserHot; ctx.beginPath();ctx.arc(ex,ey,cr+Math.sin(G.t*20)*charge,0,7);ctx.fill();
      ctx.globalAlpha=1; ctx.fillStyle=charge>0.6?P.laserCore:'#5a0c0c'; ctx.fillRect(ex-1,ey-1,2,2);
      if(charge>0.2){ ctx.fillStyle=P.laserGlow; for(let i=0;i<5;i++){ const a=G.t*5-i*1.25, rr=(1-((G.t*1.4+i*0.2)%1))*11*charge; ctx.globalAlpha=0.7*charge; ctx.fillRect(Math.round(ex+Math.cos(a)*rr),Math.round(ey+Math.sin(a)*rr),1,1); } } }
    ctx.globalAlpha=1;
  }
  ctx.globalAlpha=1;
}

// Pufferfish: tiny bobbing dot that inflates into a spiky ball (spines spin out,
// body flushes hot orange) then deflates. Lethal across its 3x3 while puffed.
function drawPuffers(ctx, bx, by){
  if(!G.puffers || !G.puffers.length) return;
  const P=PAL;
  for(const f of G.puffers){
    const cx=Math.round(bx+f.x*TILE+8), cy=Math.round(by+f.y*TILE+8);
    const infl=puffInflation(G.t+f.off), lethal=infl>=0.9;
    const bob=Math.sin(G.t*3+f.x)*(1.2-infl);
    const pulse=lethal?Math.sin(G.t*22)*0.7:0;
    const r=1.6+infl*17+pulse, yc=cy+bob;
    const body=lethal?P.fuguMad:(infl>0.15?P.fugu:P.fuguD), bhi=lethal?P.fuguMadHi:P.fuguHi;
    // aura
    if(infl>0.1){ ctx.globalAlpha=0.10+0.22*infl; ctx.fillStyle=lethal?P.fuguMad:P.fugu;
      ctx.beginPath(); ctx.arc(cx,yc,r+3+(lethal?Math.sin(G.t*22)*1.5:0),0,7); ctx.fill(); ctx.globalAlpha=1; }
    // spines
    if(infl>0.25){ const n=12, len=1+infl*7, rot=G.t*(lethal?2.4:0.6);
      for(let i=0;i<n;i++){ const a=rot+i/n*6.2832, x0=cx+Math.cos(a)*(r-1), y0=yc+Math.sin(a)*(r-1), x1=cx+Math.cos(a)*(r+len), y1=yc+Math.sin(a)*(r+len);
        ctx.strokeStyle=P.fuguSpine; ctx.lineWidth=1; ctx.beginPath(); ctx.moveTo(x0,y0); ctx.lineTo(x1,y1); ctx.stroke();
        ctx.fillStyle=lethal?P.fuguMadHi:P.steelHi; ctx.fillRect(Math.round(x1),Math.round(y1),1,1); } }
    // body + belly + sheen
    ctx.fillStyle=body; ctx.beginPath(); ctx.arc(cx,yc,r,0,7); ctx.fill();
    ctx.globalAlpha=0.5; ctx.fillStyle=bhi; ctx.beginPath(); ctx.arc(cx,yc+r*0.35,r*0.7,0,Math.PI); ctx.fill(); ctx.globalAlpha=1;
    ctx.fillStyle=bhi; ctx.fillRect(Math.round(cx-r*0.5),Math.round(yc-r*0.7),Math.max(1,Math.round(r*0.5)),1);
    // eyes (spread with inflation), angry brows when lethal
    const exd=Math.max(1.7,r*0.34), eyy=yc-r*0.15, er=Math.max(1.2,r*0.16), pr=Math.max(1,r*0.09);
    ctx.fillStyle=P.white; ctx.beginPath(); ctx.arc(cx-exd,eyy,er,0,7); ctx.arc(cx+exd,eyy,er,0,7); ctx.fill();
    ctx.fillStyle=P.blackD; ctx.beginPath(); ctx.arc(cx-exd,eyy,pr,0,7); ctx.arc(cx+exd,eyy,pr,0,7); ctx.fill();
    if(lethal){ ctx.strokeStyle=P.fuguSpine; ctx.lineWidth=1; ctx.beginPath();
      ctx.moveTo(cx-exd-2,eyy-2); ctx.lineTo(cx-exd+2,eyy-1); ctx.moveTo(cx+exd+2,eyy-2); ctx.lineTo(cx+exd-2,eyy-1); ctx.stroke(); }
  }
  ctx.globalAlpha=1;
}

// small flickering torch flame (screen coords passed in)
function drawTorch(ctx, sx, sy){
  const fl=0.6+0.4*Math.sin(G.t*11+sx);
  ctx.fillStyle=PAL.stoneD; ctx.fillRect(Math.round(sx-1), Math.round(sy), 2, 6);   // bracket
  ctx.globalAlpha=0.5*fl; ctx.fillStyle=PAL.gold;
  ctx.beginPath(); ctx.arc(Math.round(sx), Math.round(sy-2), 4, 0, 7); ctx.fill();
  ctx.globalAlpha=1; ctx.fillStyle=PAL.goldHi;
  ctx.fillRect(Math.round(sx-1), Math.round(sy-4-fl*2), 2, 3);
}

// A cell is "open" (glow-facing) if it's in-bounds and not a wall.
function open(x,y){ return x>=0 && y>=0 && x<G.COLS && y<G.ROWS && G.grid[y][x]!=='wall'; }

// cheap deterministic 0..1 hash (stable per cell — no flicker frame-to-frame)
function h2(a,b){ const n=Math.sin(a*127.1+b*311.7)*43758.5453; return n-Math.floor(n); }

// Quarter-disc corner masks (radius ~3, tile-local px). carve→void, edge/hi→neon arc.
const ARC={
  TL:{carve:[[0,0],[1,0],[2,0],[0,1],[1,1],[0,2]], edge:[[3,0],[2,1],[1,2],[0,3]], hi:[[3,1],[2,2],[1,3]]},
  TR:{carve:[[15,0],[14,0],[13,0],[15,1],[14,1],[15,2]], edge:[[12,0],[13,1],[14,2],[15,3]], hi:[[12,1],[13,2],[14,3]]},
  BL:{carve:[[0,15],[1,15],[2,15],[0,14],[1,14],[0,13]], edge:[[3,15],[2,14],[1,13],[0,12]], hi:[[3,14],[2,13],[1,12]]},
  BR:{carve:[[15,15],[14,15],[13,15],[15,14],[14,14],[15,13]], edge:[[12,15],[13,14],[14,13],[15,12]], hi:[[12,14],[13,13],[14,12]]},
};
// Wall-contour colour sets: default crimson, turquoise for faces next to spikes.
const WALL_CRIMSON = { edge:PAL.wallEdge, hi:PAL.wallHi, base:PAL.wall };
const WALL_TEAL    = { edge:PAL.tealEdge, hi:PAL.tealHi, base:PAL.teal };
const isSpikeCell = (x,y) => x>=0 && y>=0 && x<G.COLS && y<G.ROWS && G.grid[y][x]==='spike';

// One horizontal wall face → a bold ~3px dotted contour band (bloom · edge · inner · inner2).
// Hashed on WORLD pixel coords so the stipple is glued to the stone, not the camera.
// inward = +1 if the wall body is below the edge (N face), -1 if above (S face).
function edgeH(ctx, PX, ey, wpx, wey, inward, C){
  C = C || WALL_CRIMSON;
  for(let k=0;k<TILE;k++){ const wx=wpx+k;
    let h=h2(wx*1.7+3, wey*1.3+7);                       // bright edge — near-solid
    if(h>0.08){ ctx.globalAlpha=1; ctx.fillStyle=h>0.55?C.edge:C.hi; ctx.fillRect(PX+k, ey, 1,1); }
    h=h2(wx*1.9+5, (wey+inward)*1.5+2);                  // 2nd px — still bright
    if(h>0.26){ ctx.globalAlpha=1; ctx.fillStyle=h>0.6?C.hi:C.base; ctx.fillRect(PX+k, ey+inward, 1,1); }
    h=h2(wx*2.3+11, (wey+2*inward)*1.9+5);               // 3rd px — dim, into the stone
    if(h>0.6){ ctx.globalAlpha=1; ctx.fillStyle=C.base; ctx.fillRect(PX+k, ey+2*inward, 1,1); }
    h=h2(wx*1.1+19, (wey-inward)*2.7+2);                 // bloom — bleeds into the void
    if(h>0.58){ ctx.globalAlpha=0.45; ctx.fillStyle=C.edge; ctx.fillRect(PX+k, ey-inward, 1,1); }
  }
  ctx.globalAlpha=1;
}
// One vertical wall face. inward = +1 if wall body is to the right (W face), -1 if left (E face).
function edgeV(ctx, ex, PY, wex, wpy, inward, C){
  C = C || WALL_CRIMSON;
  for(let k=0;k<TILE;k++){ const wy=wpy+k;
    let h=h2(wex*1.3+7, wy*1.7+3);
    if(h>0.08){ ctx.globalAlpha=1; ctx.fillStyle=h>0.55?C.edge:C.hi; ctx.fillRect(ex, PY+k, 1,1); }
    h=h2((wex+inward)*1.5+2, wy*1.9+5);
    if(h>0.26){ ctx.globalAlpha=1; ctx.fillStyle=h>0.6?C.hi:C.base; ctx.fillRect(ex+inward, PY+k, 1,1); }
    h=h2((wex+2*inward)*1.9+5, wy*2.3+11);
    if(h>0.6){ ctx.globalAlpha=1; ctx.fillStyle=C.base; ctx.fillRect(ex+2*inward, PY+k, 1,1); }
    h=h2((wex-inward)*2.7+2, wy*1.1+19);
    if(h>0.58){ ctx.globalAlpha=0.45; ctx.fillStyle=C.edge; ctx.fillRect(ex-inward, PY+k, 1,1); }
  }
  ctx.globalAlpha=1;
}
// Round off a convex corner: carve the square corner to black, stipple a curved arc.
function roundCornerDotted(ctx,PX,PY,wpx,wpy,a,b,key){
  if(!(a&&b)) return; const A=ARC[key];
  ctx.globalAlpha=1; ctx.fillStyle=PAL.bg; for(const c of A.carve) ctx.fillRect(PX+c[0],PY+c[1],1,1);
  for(const c of A.edge){ const h=h2((wpx+c[0])*1.7+3,(wpy+c[1])*1.3+7);
    ctx.fillStyle=h>0.45?PAL.wallEdge:PAL.wallHi; ctx.fillRect(PX+c[0],PY+c[1],1,1); }
}

// Border-contour renderer: the stone is black; only the boundary facing open
// space glows, as a dotted line with rounded convex corners. Walls with no open
// neighbour draw nothing. Culled to the view.
function drawWallEdges(ctx, x0,y0,x1,y1){
  const T=TILE, bx=G.boardX, by=G.boardY;
  for(let y=y0;y<=y1;y++) for(let x=x0;x<=x1;x++){
    if(G.grid[y][x]!=='wall') continue;
    const N=open(x,y-1), S=open(x,y+1), W=open(x-1,y), E=open(x+1,y);
    if(!(N||S||W||E)) continue;
    const PX=Math.round(bx+x*T), PY=Math.round(by+y*T), wpx=x*T, wpy=y*T;
    if(N) edgeH(ctx, PX, PY,     wpx, wpy,     +1, isSpikeCell(x,y-1)?WALL_TEAL:WALL_CRIMSON);
    if(S) edgeH(ctx, PX, PY+T-1, wpx, wpy+T-1, -1, isSpikeCell(x,y+1)?WALL_TEAL:WALL_CRIMSON);
    if(W) edgeV(ctx, PX, PY,     wpx, wpy,     +1, isSpikeCell(x-1,y)?WALL_TEAL:WALL_CRIMSON);
    if(E) edgeV(ctx, PX+T-1, PY, wpx+T-1, wpy, -1, isSpikeCell(x+1,y)?WALL_TEAL:WALL_CRIMSON);
    roundCornerDotted(ctx,PX,PY,wpx,wpy,N,W,'TL'); roundCornerDotted(ctx,PX,PY,wpx,wpy,N,E,'TR');
    roundCornerDotted(ctx,PX,PY,wpx,wpy,S,W,'BL'); roundCornerDotted(ctx,PX,PY,wpx,wpy,S,E,'BR');
  }
  ctx.globalAlpha=1;
}

// Level-entrance pyramid at the start cell: a stepped sandstone pyramid with a
// gold capstone and crimson contour, sitting inside the room. During the intro a
// door of light opens, then it fades to a faint ghost (the hero is revealed).
function drawEntrance(ctx, bx, by){
  if(!G.startCell) return;
  const intro = G.intro!==null;
  const tI  = intro ? Math.min(1, G.intro/INTRO_DUR) : 1;
  const pyrA = intro ? (tI<0.5 ? 1 : 1-(tI-0.5)/0.5*0.86) : 0.14;   // 1 → ~0.14 ghost
  if(pyrA<=0.02) return;
  // base sits on the floor line (bottom edge of the start tile) so the pyramid
  // stands on the ground rather than floating above it.
  const cx=Math.round(bx+G.startCell.x*TILE+8), base=Math.round(by+G.startCell.y*TILE+TILE);
  const steps=4, sh=6, baseHW=20, apex=base-steps*sh-3;
  ctx.save(); ctx.globalAlpha=pyrA;
  // stepped sandstone blocks (narrowing upward)
  for(let s=0;s<steps;s++){
    const yTop=base-(s+1)*sh, hw=Math.round(baseHW*(steps-s)/steps);
    ctx.fillStyle=PAL.gold;   ctx.fillRect(cx-hw, yTop, hw*2, sh);
    ctx.fillStyle=PAL.goldHi; ctx.fillRect(cx-hw, yTop, hw*2, 1);        // course light
    ctx.fillStyle=PAL.goldD;  ctx.fillRect(cx-hw, yTop+sh-1, hw*2, 1);   // course shadow
  }
  ctx.fillStyle=PAL.goldHi; ctx.fillRect(cx-2, apex, 4, 3);              // capstone
  // crimson contour edges (echoes the maze walls) + ground line
  ctx.strokeStyle=PAL.wallEdge; ctx.lineWidth=1;
  ctx.beginPath(); ctx.moveTo(cx-baseHW,base); ctx.lineTo(cx,apex); ctx.lineTo(cx+baseHW,base); ctx.stroke();
  ctx.fillStyle=PAL.wall; ctx.fillRect(cx-baseHW, base, baseHW*2, 1);
  // arched door, fills with light as it opens
  const dOpen = intro ? Math.min(1, Math.max(0,(tI-0.25)/0.25)) : 1;
  const dw=8, dh=11;
  ctx.fillStyle=PAL.blackD; ctx.fillRect(cx-dw/2-1, base-dh-1, dw+2, dh+1);  // dark doorway
  ctx.globalAlpha=pyrA*0.9*dOpen; ctx.fillStyle=PAL.goldHi;
  ctx.fillRect(cx-dw/2, base-Math.round(dh*dOpen), dw, Math.round(dh*dOpen)); // light pours up
  ctx.restore();
}

// simple bordered dialog button (label centred)
function dlgBtn(ctx, b, label, col){
  ctx.strokeStyle=col; ctx.lineWidth=1; ctx.strokeRect(b.x+0.5, b.y+0.5, b.w-1, b.h-1);
  drawTextCentered(ctx, label, b.x+b.w/2, b.y+(b.h-7)/2, col, 1);
}
// in-match exit confirmation: dims the frozen board, asks to leave.
function drawConfirm(ctx){
  ctx.globalAlpha=0.68; ctx.fillStyle=PAL.bg; ctx.fillRect(0,0,VW,VH); ctx.globalAlpha=1;
  const pw=168, ph=76, px=Math.round((VW-pw)/2), py=Math.round((VH-ph)/2);
  ctx.fillStyle=PAL.blackD; ctx.fillRect(px,py,pw,ph);
  ctx.strokeStyle=PAL.wallEdge; ctx.lineWidth=1; ctx.strokeRect(px+0.5,py+0.5,pw-1,ph-1);
  drawTextCentered(ctx, 'EXIT TO MENU?', VW/2, py+18, PAL.gold, 1);
  const no ={ id:'confirmNo',  x:px+14,    y:py+44, w:64, h:22 };
  const yes={ id:'confirmYes', x:px+pw-78, y:py+44, w:64, h:22 };
  dlgBtn(ctx, no,  'STAY', PAL.goldHi);
  dlgBtn(ctx, yes, 'EXIT', PAL.red);
  return [no, yes];
}

function drawHUD(ctx){
  ctx.fillStyle='rgba(16,4,4,0.66)'; ctx.fillRect(0,0,VW,HUD_H);
  // dotted crimson divider — same contour language as the maze/UI frames
  for(let x=0;x<VW;x++){
    if(h2(x*1.7+3, HUD_H)>0.22){ ctx.fillStyle=h2(x,9)>0.55?PAL.wallEdge:PAL.wallHi; ctx.fillRect(x, HUD_H-1, 1,1); }
    if(h2(x*1.9+5, HUD_H+1)>0.55){ ctx.fillStyle=PAL.wall; ctx.fillRect(x, HUD_H-2, 1,1); }
  }
  // exit-to-menu button (top-left) — dotted frame + gold left-chevron
  const eb=EXIT_BTN;
  for(let i=0;i<eb.w;i++){ if(h2(eb.x+i,eb.y)>0.2){ ctx.fillStyle=PAL.wallHi; ctx.fillRect(eb.x+i,eb.y,1,1); ctx.fillRect(eb.x+i,eb.y+eb.h-1,1,1); } }
  for(let j=0;j<eb.h;j++){ if(h2(eb.x,eb.y+j)>0.2){ ctx.fillStyle=PAL.wallHi; ctx.fillRect(eb.x,eb.y+j,1,1); ctx.fillRect(eb.x+eb.w-1,eb.y+j,1,1); } }
  ctx.fillStyle=PAL.gold;                                   // "‹" chevron
  ctx.fillRect(eb.x+11,eb.y+4,2,2); ctx.fillRect(eb.x+9,eb.y+6,2,2); ctx.fillRect(eb.x+7,eb.y+8,2,2);
  ctx.fillRect(eb.x+9,eb.y+10,2,2); ctx.fillRect(eb.x+11,eb.y+12,2,2);
  // hearts (shifted right to clear the exit button) — arcade is single-life, show none
  if(!G.arcade) for(let i=0;i<3;i++) ctx.drawImage(sprite(i<G.lives?'heart':'heart0'), 26+i*10, 8);
  // star pips — collected rating so far (hidden in arcade / when the level has no stars)
  if(G.starsTotal>0 && !G.arcade){ const got=G.starsTotal-G.stars.size;
    for(let i=0;i<G.starsTotal;i++){ ctx.globalAlpha=i<got?1:0.28;
      ctx.drawImage(sprite('star'), 58+i*9, 7, 9, 9); } ctx.globalAlpha=1; }
  // level name
  drawTextCentered(ctx, G.levelName, VW/2, 7, PAL.goldHi, 1);
  // score (right)
  const s='GOLD '+G.score; drawText(ctx, s, VW-6-textWidth(s,1), 8, PAL.gold, 1);
  // debug immortality marker (bottom-left, out of the way)
  if(G.godMode) drawText(ctx, 'GOD', 4, VH-9, PAL.fugu, 1);
}
