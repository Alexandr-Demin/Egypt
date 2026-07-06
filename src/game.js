// =========== SANDSLIDE — game core (v0.1) ===========
// Slide-maze on a tile grid + juice. Renders to a fixed virtual screen that the
// browser upscales (pixelated). Scenes: title → select → play → win/gameover.

import { LEVELS } from './levels.js?v=20260706g';
import { sprite, drawText, drawTextCentered, textWidth, PAL } from './sprites.js?v=20260706g';
import { renderTitle, renderMenu, renderSelect, renderWin, renderGameover } from './screens.js?v=20260706g';
import { getState, patch, reset } from './state.js?v=20260706g';
import * as sound from './sound.js?v=20260706g';
import { generateLevel } from './levelgen.js?v=20260706g';

const VW = 208, VH = 288, TILE = 16, HUD_H = 24;
const SLIDE = 34;   // tiles/sec — fast, snappy slide
const ENEMY = 3;    // tiles/sec
const HIT = 0.55;   // collision distance (tiles)

const DIRS = { left:[-1,0], right:[1,0], up:[0,-1], down:[0,1] };
// Hero orientation: the sprite (feet at its bottom) is rotated so the feet point
// at the wall it slides into — i.e. it always lands feet-first.
const HERO_ANGLE = { down:0, left:Math.PI/2, up:Math.PI, right:-Math.PI/2 };
const INTRO_DUR = 1.8;   // level-entrance: pyramid → door opens → hero appears → pyramid fades

const G = {
  canvas:null, ctx:null, scene:'title', t:0, last:0,
  levelIndex:0, score:0, lives:3, levelName:'',
  endless:false, depth:1, runSeed:1, curMap:null, curName:'',
  grid:[], ROWS:0, COLS:0, coins:null, coinsLeft:0, exitPos:{x:0,y:0},
  boardX:0, boardY:0, fvar:[], wvar:[],
  player:null, enemies:[], dir:null, bufDir:null, lastCell:'', heroAngle:0, slideFromX:0, slideFromY:0,
  intro:null, startCell:null,
  particles:[], trail:[], shake:0, hs:0, flash:0, flashCol:'#fff',
  psx:1, psy:1, buttons:[], trans:null, dead:false, deadTimer:0,
  dustTimer:0,
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
  };
}

function loop(ts){
  const dt = Math.min(0.05, (ts - G.last)/1000 || 0); G.last = ts;
  tick(dt);
  requestAnimationFrame(loop);
}
function tick(dt){ update(dt); render(); }

// ---------------- run / level flow ----------------
function startRun(i=0){ G.endless = false; G.score = 0; G.lives = 3; G.runStart = i; loadLevel(i); }

function loadLevel(i){
  G.levelIndex = i; G.dead = false; G.dir = null; G.lastCell = '';
  G.particles.length = 0; G.trail.length = 0; G.shake = 0; G.hs = 0;
  parse(LEVELS[i]);
  G.scene = 'play';
}

// ---- endless: procedurally generated descent, difficulty ramps with depth ----
function startEndless(){
  G.endless = true; G.score = 0; G.depth = 1;
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
  G.dead = false; G.dir = null; G.lastCell = '';
  G.particles.length = 0; G.trail.length = 0; G.shake = 0; G.hs = 0;
  parse({ map: rows, name: 'D' + G.depth + '  ' + G.curName });
  G.scene = 'play';
}

function parse(def){
  const rows = def.map; G.levelName = def.name || '';
  G.ROWS = rows.length; G.COLS = Math.max(...rows.map(r=>r.length));
  G.grid = []; G.coins = new Set(); G.coinsLeft = 0; G.enemies = []; G.fvar = []; G.wvar = [];
  const manualCoins = new Set();          // 'o' cells authored on the map (if any)
  for(let y=0;y<G.ROWS;y++){
    G.grid[y]=[]; G.fvar[y]=[]; G.wvar[y]=[];
    for(let x=0;x<G.COLS;x++){
      const ch = rows[y][x] || '#';
      let t = 'floor';
      if(ch==='#') t='wall';
      else if(ch==='^') t='spike';
      else if(ch==='E'){ t='exit'; G.exitPos={x,y}; }
      else if(ch==='o') manualCoins.add(x+','+y);   // hand-placed coin (walkable floor)
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
    if(G.grid[y][x]==='floor' && !(x===G.player.cx && y===G.player.cy)){ G.coins.add(k); G.coinsLeft++; }
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

// ---------------- input ----------------
function bindInput(){
  addEventListener('keydown', e=>{
    const m={ArrowLeft:'left',ArrowRight:'right',ArrowUp:'up',ArrowDown:'down',a:'left',d:'right',w:'up',s:'down'};
    if(G.scene==='play' && m[e.key.toLowerCase?.()||e.key]){ e.preventDefault(); setDir(m[e.key.toLowerCase?.()||e.key]||m[e.key]); }
    else if((e.key==='Enter'||e.key===' ') && G.scene==='title'){ onButton('play'); }
  });
  const TH=8;                 // swipe threshold (px) — small = very responsive
  let ds=null, fired=false;
  const down = (cx,cy)=>{ ds={x:cx,y:cy}; fired=false; };
  const swipe = (cx,cy)=>{    // fire the direction the INSTANT the swipe crosses TH (mid-drag)
    if(!ds || fired || G.scene!=='play') return;
    const dx=cx-ds.x, dy=cy-ds.y;
    if(Math.abs(dx)>TH || Math.abs(dy)>TH){
      setDir(Math.abs(dx)>Math.abs(dy)?(dx>0?'right':'left'):(dy>0?'down':'up')); fired=true;
    }
  };
  const up = (cx,cy)=>{
    if(!ds) return; const dx=cx-ds.x, dy=cy-ds.y, moved=Math.abs(dx)>TH||Math.abs(dy)>TH;
    if(G.scene==='play'){ if(!fired && moved) setDir(Math.abs(dx)>Math.abs(dy)?(dx>0?'right':'left'):(dy>0?'down':'up')); }
    else if(!moved){ const v=toVirtual(cx,cy); handleTap(v.x,v.y); }
    ds=null; fired=false;
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
  if(id==='play') transition(()=>{ G.scene='select'; });            // PLAY → level select
  else if(id==='endless') transition(startEndless);                  // ENDLESS → generated descent
  else if(id==='retry') transition(()=> G.endless ? startEndless() : startRun(G.runStart||0));
  else if(id && id.startsWith('lvl')) transition(()=>startRun(+id.slice(3)));  // pick a level card
  else if(id==='menu') transition(()=>{ G.scene='title'; });
  else if(id==='settings') transition(()=>{ G.scene='menu'; });
  else if(id==='sound') sound.setEnabled(!sound.isEnabled());          // toggle, stay on menu
  else if(id==='reset'){ reset(); G.flash=0.4; G.flashCol=PAL.goldHi; } // wipe progress + flash
}

function setDir(d){
  if(G.scene!=='play' || G.trans || G.dead || G.intro!==null || !G.player) return;
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

  if(G.scene!=='play') return;
  if(G.intro!==null){ G.intro+=dt; if(G.intro>=INTRO_DUR) G.intro=null; if(G.player) updateCamera(dt); return; } // entrance intro
  if(G.hs>0){ G.hs-=dt; return; }     // hit-stop freezes the world
  if(G.dead){ G.deadTimer-=dt; if(G.deadTimer<=0) respawnOrEnd(); if(G.player) updateCamera(dt); return; }

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
  const t=G.grid[y][x];
  if(t==='spike'){ die(); return; }
  if(t==='exit'){ exitReached(); }
}
function onStop(){
  burst(G.player.cx*TILE+8, G.player.cy*TILE+13, 4, PAL.sandL, 16, 0.35, 24);
  G.psx=1.4; G.psy=0.62; G.shake=Math.max(G.shake,1.2);   // no hit-stop → buffered turns chain instantly
  if(G.bufDir){ const d=G.bufDir; G.bufDir=null; doMove(d); }  // chain the buffered input
}
function exitReached(){
  if(G.dead) return;
  G.flash=0.5; G.flashCol=PAL.goldHi; sound.play('win');
  burst(G.exitPos.x*TILE+8, G.exitPos.y*TILE+8, 18, PAL.gold, 50, 0.7);
  G.player.moving=false; G.dead=true; G.deadTimer=0.45; G._won=true;
}
function die(){
  if(G.dead) return;
  G.dead=true; G._won=false; G.player.moving=false;
  G.lives--; G.shake=6; G.flash=0.6; G.flashCol=PAL.red; G.hs=0.12;
  burst(G.player.fx*TILE+8, G.player.fy*TILE+8, 16, PAL.red, 60, 0.7);
  burst(G.player.fx*TILE+8, G.player.fy*TILE+8, 10, PAL.sandD, 40, 0.7, 30);
  sound.play('lose');
  G.deadTimer = G.lives<=0 ? 0.7 : 0.55;
}
function respawnOrEnd(){
  if(G._won){ G._won=false; nextLevel(); return; }
  if(G.lives<=0){ (G.endless?saveBestDepth:saveBest)(); transition(()=>{ G.scene='gameover'; }); }
  else { parse(G.endless ? { map:G.curMap, name:'D'+G.depth+'  '+G.curName } : LEVELS[G.levelIndex]);
    G.dead=false; G.dir=null; G.lastCell=''; G.trail.length=0; }
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

  if(G.scene==='title'){ G.buttons=renderTitle(ctx,VW,VH,G.t,{best:getState()?.progress?.best||0, bestDepth:getState()?.progress?.bestDepth||0}); }
  else if(G.scene==='select'){ G.buttons=renderSelect(ctx,VW,VH,G.t,{unlocked:LEVELS.length}); }
  else if(G.scene==='menu'){ G.buttons=renderMenu(ctx,VW,VH,G.t,{soundOn:sound.isEnabled()}); }
  else if(G.scene==='win'){ G.buttons=renderWin(ctx,VW,VH,G.t,{score:G.score,best:getState()?.progress?.best||0}); }
  else if(G.scene==='gameover'){ G.buttons=renderGameover(ctx,VW,VH,G.t,{score:G.score,best:getState()?.progress?.best||0,
    depth:G.endless?G.depth:null, bestDepth:getState()?.progress?.bestDepth||0}); }
  else { G.buttons=[]; renderPlay(ctx); }

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
    else { ctx.drawImage(sprite('floor'+G.fvar[y][x]), px, py);
      if(t==='spike') ctx.drawImage(sprite('spikes'), px, py); }
  }
  // neon carved-stone outline on every wall edge facing an open cell
  drawWallEdges(ctx, x0, y0, x1, y1);
  // coins (bob + shine)
  for(const c of G.coins){ const [x,y]=c.split(',').map(Number);
    if(x<x0||x>x1||y<y0||y>y1) continue;
    const px=Math.round(bx+x*TILE), py=Math.round(by+y*TILE+Math.sin(G.t*4+x+y)*1.5);
    ctx.drawImage(sprite('ankh'), px, py);
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

  // enemies
  for(const e of G.enemies){ const px=Math.round(bx+e.fx*TILE), py=Math.round(by+e.fy*TILE+Math.sin(G.t*6+e.cx));
    ctx.drawImage(sprite('mummy'), px, py);
    ctx.globalAlpha=0.5+0.3*Math.sin(G.t*8); ctx.fillStyle=PAL.red; // eye glow
    ctx.fillRect(px+6,py+4,1,1); ctx.fillRect(px+9,py+4,1,1); ctx.globalAlpha=1; }

  // player — slides as a stretched "ball" trailing speed-lines; lands as the jackal
  const p=G.player;
  if(p){
    const ang=G.heroAngle||0, cx=bx+p.fx*TILE+8, cy=by+p.fy*TILE+8;
    if(p.moving && G.dir && (!G.dead||G._won)){
      // speed-lines behind, length grows with distance flown this slide
      const trav=Math.hypot(p.fx-G.slideFromX, p.fy-G.slideFromY)*TILE;
      const len=Math.min(44, trav*0.95);
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
        ctx.drawImage(sprite(p.moving?'ball':'anubis'), -8, -8); ctx.restore(); ctx.globalAlpha=1; }
    }
  }
  // entrance pyramid (over the hidden hero): animates during intro, then a faint ghost
  drawEntrance(ctx, bx, by);
  // particles (stored in world space — offset by the camera origin)
  for(const pt of G.particles){ ctx.globalAlpha=Math.max(0,Math.min(1,pt.life/pt.maxLife));
    ctx.fillStyle=pt.color; ctx.fillRect(Math.round(bx+pt.x),Math.round(by+pt.y),pt.size,pt.size); }
  ctx.globalAlpha=1;

  // vignette
  const vg=ctx.createRadialGradient(VW/2,VH/2,60,VW/2,VH/2,160);
  vg.addColorStop(0,'rgba(0,0,0,0)'); vg.addColorStop(1,'rgba(0,0,0,0.45)');
  ctx.fillStyle=vg; ctx.fillRect(0,0,VW,VH);

  ctx.restore();
  drawHUD(ctx);
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
// One horizontal wall face → a bold ~3px dotted contour band (bloom · edge · inner · inner2).
// Hashed on WORLD pixel coords so the stipple is glued to the stone, not the camera.
// inward = +1 if the wall body is below the edge (N face), -1 if above (S face).
function edgeH(ctx, PX, ey, wpx, wey, inward){
  const P=PAL;
  for(let k=0;k<TILE;k++){ const wx=wpx+k;
    let h=h2(wx*1.7+3, wey*1.3+7);                       // bright edge — near-solid
    if(h>0.08){ ctx.globalAlpha=1; ctx.fillStyle=h>0.55?P.wallEdge:P.wallHi; ctx.fillRect(PX+k, ey, 1,1); }
    h=h2(wx*1.9+5, (wey+inward)*1.5+2);                  // 2nd px — still bright
    if(h>0.26){ ctx.globalAlpha=1; ctx.fillStyle=h>0.6?P.wallHi:P.wall; ctx.fillRect(PX+k, ey+inward, 1,1); }
    h=h2(wx*2.3+11, (wey+2*inward)*1.9+5);               // 3rd px — dim, into the stone
    if(h>0.6){ ctx.globalAlpha=1; ctx.fillStyle=P.wall; ctx.fillRect(PX+k, ey+2*inward, 1,1); }
    h=h2(wx*1.1+19, (wey-inward)*2.7+2);                 // bloom — bleeds into the void
    if(h>0.58){ ctx.globalAlpha=0.45; ctx.fillStyle=P.wallEdge; ctx.fillRect(PX+k, ey-inward, 1,1); }
  }
  ctx.globalAlpha=1;
}
// One vertical wall face. inward = +1 if wall body is to the right (W face), -1 if left (E face).
function edgeV(ctx, ex, PY, wex, wpy, inward){
  const P=PAL;
  for(let k=0;k<TILE;k++){ const wy=wpy+k;
    let h=h2(wex*1.3+7, wy*1.7+3);
    if(h>0.08){ ctx.globalAlpha=1; ctx.fillStyle=h>0.55?P.wallEdge:P.wallHi; ctx.fillRect(ex, PY+k, 1,1); }
    h=h2((wex+inward)*1.5+2, wy*1.9+5);
    if(h>0.26){ ctx.globalAlpha=1; ctx.fillStyle=h>0.6?P.wallHi:P.wall; ctx.fillRect(ex+inward, PY+k, 1,1); }
    h=h2((wex+2*inward)*1.9+5, wy*2.3+11);
    if(h>0.6){ ctx.globalAlpha=1; ctx.fillStyle=P.wall; ctx.fillRect(ex+2*inward, PY+k, 1,1); }
    h=h2((wex-inward)*2.7+2, wy*1.1+19);
    if(h>0.58){ ctx.globalAlpha=0.45; ctx.fillStyle=P.wallEdge; ctx.fillRect(ex-inward, PY+k, 1,1); }
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
    if(N) edgeH(ctx, PX, PY,     wpx, wpy,     +1);
    if(S) edgeH(ctx, PX, PY+T-1, wpx, wpy+T-1, -1);
    if(W) edgeV(ctx, PX, PY,     wpx, wpy,     +1);
    if(E) edgeV(ctx, PX+T-1, PY, wpx+T-1, wpy, -1);
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

function drawHUD(ctx){
  ctx.fillStyle='rgba(16,4,4,0.66)'; ctx.fillRect(0,0,VW,HUD_H);
  // dotted crimson divider — same contour language as the maze/UI frames
  for(let x=0;x<VW;x++){
    if(h2(x*1.7+3, HUD_H)>0.22){ ctx.fillStyle=h2(x,9)>0.55?PAL.wallEdge:PAL.wallHi; ctx.fillRect(x, HUD_H-1, 1,1); }
    if(h2(x*1.9+5, HUD_H+1)>0.55){ ctx.fillStyle=PAL.wall; ctx.fillRect(x, HUD_H-2, 1,1); }
  }
  // hearts
  for(let i=0;i<3;i++) ctx.drawImage(sprite(i<G.lives?'heart':'heart0'), 6+i*10, 8);
  // level name
  drawTextCentered(ctx, G.levelName, VW/2, 7, PAL.goldHi, 1);
  // score (right)
  const s='GOLD '+G.score; drawText(ctx, s, VW-6-textWidth(s,1), 8, PAL.gold, 1);
}
