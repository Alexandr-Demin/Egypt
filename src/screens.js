// =========== SANDSLIDE — TITLE / WIN / GAMEOVER screens ===========
// Each render fn draws into the virtual ctx and returns the clickable button
// rects (virtual coords) so game.js can hit-test taps.

import { sprite, drawText, drawTextCentered, textWidth, PAL } from './sprites.js?v=20260707q';

// twinkling starfield on the dark "Curse" void — shared backdrop for the screens
function starfield(ctx, VW, VH, t){
  ctx.fillStyle = PAL.bg; ctx.fillRect(0, 0, VW, VH);
  for(let i=0;i<46;i++){
    const sx = (i*53) % VW, sy = (i*97) % VH, tw = 0.5 + 0.5*Math.sin(t*2 + i);
    ctx.globalAlpha = 0.2 + 0.5*tw;
    ctx.fillStyle = (i % 5 === 0) ? PAL.gold : PAL.wallHi;
    ctx.fillRect(sx, sy, 1, 1);
  }
  ctx.globalAlpha = 1;
}

// deterministic 0..1 hash for the dotted contour
function h2(a,b){ const n=Math.sin(a*127.1+b*311.7)*43758.5453; return n-Math.floor(n); }
// Dotted crimson contour (same look as the maze walls) around a rect — the UI's
// signature frame, used for the screen border and outlined buttons.
function frame(ctx, X, Y, W, H){
  for(let i=0;i<W;i++){ const wx=X+i;
    if(h2(wx*1.7+3,Y*1.3+7)>0.12){ ctx.fillStyle=h2(wx,Y)>0.55?PAL.wallEdge:PAL.wallHi; ctx.fillRect(X+i,Y,1,1); }
    if(h2(wx*1.7+3,(Y+H)*1.3+7)>0.12){ ctx.fillStyle=h2(wx,Y+H)>0.55?PAL.wallEdge:PAL.wallHi; ctx.fillRect(X+i,Y+H-1,1,1); }
    if(h2(wx*1.9+5,(Y+1)*1.5)>0.4){ ctx.fillStyle=PAL.wall; ctx.fillRect(X+i,Y+1,1,1); }
    if(h2(wx*1.9+5,(Y+H-2)*1.5)>0.4){ ctx.fillStyle=PAL.wall; ctx.fillRect(X+i,Y+H-2,1,1); }
  }
  for(let j=0;j<H;j++){ const wy=Y+j;
    if(h2(X*1.3+7,wy*1.7+3)>0.12){ ctx.fillStyle=h2(X,wy)>0.55?PAL.wallEdge:PAL.wallHi; ctx.fillRect(X,Y+j,1,1); }
    if(h2((X+W)*1.3+7,wy*1.7+3)>0.12){ ctx.fillStyle=h2(X+W,wy)>0.55?PAL.wallEdge:PAL.wallHi; ctx.fillRect(X+W-1,Y+j,1,1); }
    if(h2((X+1)*1.5,wy*1.9+5)>0.4){ ctx.fillStyle=PAL.wall; ctx.fillRect(X+1,Y+j,1,1); }
    if(h2((X+W-2)*1.5,wy*1.9+5)>0.4){ ctx.fillStyle=PAL.wall; ctx.fillRect(X+W-2,Y+j,1,1); }
  }
}
// Outlined button: dotted contour frame + centred gold label.
function frameBtn(ctx, b, label, scale){
  frame(ctx, b.x, b.y, b.w, b.h);
  drawTextCentered(ctx, label, b.x+b.w/2, b.y+(b.h-7*scale)/2, PAL.gold, scale);
}
// small gold cog icon, centred on (cx,cy) — the settings button glyph
function gear(ctx, cx, cy){
  ctx.fillStyle = PAL.gold;
  ctx.fillRect(cx-1,cy-7,2,3); ctx.fillRect(cx-1,cy+4,2,3);   // top/bottom teeth
  ctx.fillRect(cx-7,cy-1,3,2); ctx.fillRect(cx+4,cy-1,3,2);   // left/right teeth
  ctx.beginPath(); ctx.arc(cx,cy,5,0,7); ctx.fill();          // body
  ctx.fillStyle = PAL.bg; ctx.beginPath(); ctx.arc(cx,cy,2,0,7); ctx.fill(); // hole
}

// 5-point star centred on (cx,cy): outline (unearned) or filled (earned).
function starPath(ctx, cx, cy, r){
  ctx.beginPath();
  for(let i=0;i<10;i++){ const a=-Math.PI/2 + i*Math.PI/5, rr=(i%2)?r*0.42:r;
    const px=cx+Math.cos(a)*rr, py=cy+Math.sin(a)*rr; i?ctx.lineTo(px,py):ctx.moveTo(px,py); }
  ctx.closePath();
}
function starOutline(ctx, cx, cy, r, col){ ctx.strokeStyle=col; ctx.lineWidth=1; starPath(ctx,cx,cy,r); ctx.stroke(); }
function starFilled(ctx, cx, cy, r, col){ ctx.fillStyle=col; starPath(ctx,cx,cy,r); ctx.fill(); }

// Padlock centred on (cx,cy) — drawn on locked level cards. Dim crimson so it
// reads as "sealed" against the void.
function drawLock(ctx, cx, cy){
  const bw=10, bh=8, bx=cx-bw/2, by=cy-1;
  ctx.strokeStyle=PAL.wallHi; ctx.lineWidth=2;                 // shackle
  ctx.beginPath(); ctx.arc(cx, by, 3.5, Math.PI, 0); ctx.stroke();
  ctx.fillStyle=PAL.wall;   ctx.fillRect(bx, by, bw, bh);      // body
  ctx.fillStyle=PAL.wallHi; ctx.fillRect(bx, by, bw, 1);       // top light
  ctx.fillStyle=PAL.blackD; ctx.fillRect(cx-1, by+2, 2, 4);    // keyhole
}

// Little scroll glyph (STORY), centred on (cx,cy), ~15x14.
function drawScrollIcon(ctx, cx, cy, col){
  const x=Math.round(cx-7), y=Math.round(cy-7);
  ctx.fillStyle=col;       ctx.fillRect(x, y, 15, 3); ctx.fillRect(x, y+11, 15, 3);   // rolled ends
  ctx.fillStyle=PAL.goldHi; ctx.fillRect(x, y, 15, 1);
  ctx.fillStyle=col;       ctx.fillRect(x+1, y+3, 13, 8);                              // parchment
  ctx.fillStyle=PAL.blackD; for(let i=0;i<3;i++) ctx.fillRect(x+3, y+5+i*2, 9, 1);     // writing
}
// Little joystick glyph (ARCADE), centred on (cx,cy).
function drawJoystickIcon(ctx, cx, cy, col){
  cx=Math.round(cx); cy=Math.round(cy);
  ctx.fillStyle=col;        ctx.fillRect(cx-6, cy+4, 12, 4);                            // base
  ctx.fillStyle=PAL.goldHi; ctx.fillRect(cx-6, cy+4, 12, 1);
  ctx.fillStyle=col;        ctx.fillRect(cx-1, cy-2, 2, 6);                             // stick
  ctx.fillStyle=PAL.red;    ctx.beginPath(); ctx.arc(cx, cy-4, 3, 0, 7); ctx.fill();    // ball knob
  ctx.fillStyle=PAL.redHi;  ctx.fillRect(cx-1, cy-5, 1, 1);
}
// Bottom-bar tab: icon + label, gold with a top accent when active, dim otherwise.
function drawTab(ctx, b, kind, active){
  if(active){ ctx.fillStyle='rgba(255,210,30,0.15)'; ctx.fillRect(b.x, b.y, b.w, b.h);   // highlight
    ctx.fillStyle=PAL.gold; ctx.fillRect(b.x, b.y, b.w, 2); }                            // top accent
  const col = active ? PAL.gold : PAL.wallHi, label = kind==='story' ? 'STORY' : 'ARCADE';
  const lw = textWidth(label, 1), groupW = 16 + 5 + lw;
  const gx = Math.round(b.x + (b.w - groupW)/2), icy = Math.round(b.y + b.h/2);
  ctx.save(); ctx.globalAlpha = active ? 1 : 0.5;
  if(kind==='story') drawScrollIcon(ctx, gx+8, icy, col); else drawJoystickIcon(ctx, gx+8, icy, col);
  drawText(ctx, label, gx+16+5, icy-3, col, 1);
  ctx.restore();
}

// Gold-wallet readout: a small diamond coin + amount. `right`: right-align at x.
function drawWallet(ctx, x, y, gold, right){
  const s = String(gold||0), lw = 9 + textWidth(s, 1), gx = right ? Math.round(x-lw) : Math.round(x);
  const dcx = gx+3, dcy = y+3;                                  // little gold diamond
  ctx.fillStyle=PAL.gold;   ctx.fillRect(dcx-1,dcy-2,2,1); ctx.fillRect(dcx-2,dcy-1,4,1); ctx.fillRect(dcx-2,dcy,4,1); ctx.fillRect(dcx-1,dcy+1,2,1);
  ctx.fillStyle=PAL.goldHi; ctx.fillRect(dcx-1,dcy-1,1,1);
  drawText(ctx, s, gx+9, y, PAL.goldHi, 1);
}

// Pre-level shop: pick a level (from STORY) then this popup shows the gold balance
// and lets you buy a SHIELD power-up before starting. Returns the clickable rects.
export function renderPrelevel(ctx, VW, VH, t, data){
  const gold=(data&&data.gold)||0, shields=(data&&data.shields)||0, cost=(data&&data.cost)||50, lvl=((data&&data.level)||0)+1;
  starfield(ctx, VW, VH, t);
  drawTextCentered(ctx, 'LEVEL '+lvl, VW/2, 22, PAL.gold, 3);
  drawWallet(ctx, VW/2-16, 54, gold, false);
  drawTextCentered(ctx, 'POWER-UPS', VW/2, 78, PAL.wallEdge, 1);
  // SHIELD item card
  const card = { x:24, y:96, w:VW-48, h:78 };
  frame(ctx, card.x, card.y, card.w, card.h);
  drawShieldBig(ctx, card.x+26, card.y+34);
  drawText(ctx, 'SHIELD', card.x+48, card.y+16, PAL.goldHi, 1);
  drawText(ctx, 'OWNED x'+shields, card.x+48, card.y+30, PAL.wallEdge, 1);
  drawText(ctx, 'PROTECTS ~4S', card.x+48, card.y+44, PAL.wallEdge, 1);
  const canBuy = gold>=cost;
  const buy = { id:'buyShield', x:card.x+card.w-64, y:card.y+card.h-26, w:56, h:18 };
  ctx.globalAlpha = canBuy?1:0.4; frameBtn(ctx, buy, 'BUY '+cost, 1); ctx.globalAlpha=1;
  // hint
  drawTextCentered(ctx, 'DOUBLE-TAP IN GAME TO USE', VW/2, 188, PAL.wallEdge, 1);
  // PLAY + BACK
  const play = { id:'playLevel',   x:VW/2-52, y:212, w:104, h:30 };
  const back = { id:'prelevelBack', x:VW/2-32, y:250, w:64, h:16 };
  frameBtn(ctx, play, 'PLAY', 2);
  frameBtn(ctx, back, 'BACK', 1);
  return [buy, play, back];
}
// Bigger shield emblem for the shop card, centred on (cx,cy).
function drawShieldBig(ctx, cx, cy){
  ctx.fillStyle=PAL.wallHi;  ctx.fillRect(cx-9,cy-11,18,10); ctx.fillRect(cx-7,cy-1,14,4); ctx.fillRect(cx-4,cy+3,8,3); ctx.fillRect(cx-2,cy+6,4,2);
  ctx.fillStyle=PAL.lapisL;  ctx.fillRect(cx-6,cy-8,12,7);
  ctx.fillStyle=PAL.goldHi;  ctx.fillRect(cx-1,cy-6,2,8);   ctx.fillRect(cx-4,cy-3,8,2);   // gold cross
}

// Combined mode screen: STORY (level grid, the default) and ARCADE (flying hero
// in the dark + centred START) tabs, switched by a bottom bar. Returns all the
// clickable rects. `data.tab` = 'story' | 'arcade'.
export function renderPlayModes(ctx, VW, VH, t, data){
  const tab = (data && data.tab) || 'story';
  const barTop = VH-32, barH = 28, contentBot = barTop - 4;
  starfield(ctx, VW, VH, t);
  const btns = [];

  if(tab === 'story'){
    drawTextCentered(ctx, 'LEVELS', VW/2, 16, PAL.gold, 3);          // bigger, with room below
    const unlocked = (data && data.unlocked) || 0, total = (data && data.total) || 10;
    const COLS = total > 10 ? 3 : 2, rows = Math.ceil(total / COLS);
    const MX = 14, GAP = 6, TOP = 44;                                // more space under the title
    const CW = Math.floor((VW - MX*2 - GAP*(COLS-1)) / COLS);
    const gridW = COLS*CW + (COLS-1)*GAP, startX = Math.round((VW - gridW)/2);   // centred grid
    const PITCH = Math.min(44, Math.floor((contentBot - TOP) / rows));
    const CH = Math.min(38, PITCH - 5);
    const big = CW >= 70, numScale = big ? 3 : 2, starR = big ? 5 : 4, starGap = big ? 13 : 9;
    for(let i=0;i<total;i++){
      const col = i % COLS, row = (i / COLS) | 0, x = startX + col*(CW+GAP), y = TOP + row*PITCH, avail = i < unlocked;
      ctx.save(); ctx.globalAlpha = avail ? 1 : 0.3;
      frame(ctx, x, y, CW, CH);
      if(avail){                                                     // open: number on top + earned stars
        drawTextCentered(ctx, String(i+1), x+CW/2, y+3, PAL.gold, numScale);
        const scx = x+CW/2, sy = y+CH-8, earned = (data && data.stars && data.stars[i]) || 0;
        for(let s=0;s<3;s++){ const sx2 = scx + (s-1)*starGap;
          if(s<earned) starFilled(ctx, sx2, sy, starR, PAL.gold); else starOutline(ctx, sx2, sy, starR, PAL.goldHi); }
      }
      ctx.restore();
      if(avail) btns.push({ id:'lvl'+i, x, y, w:CW, h:CH });
      else drawLock(ctx, x+CW/2, y+Math.round(CH/2));                // locked: centred padlock, no number
    }
  } else {
    // ARCADE: a hero flying up through the dark + a centred START button.
    for(let i=0;i<28;i++){ const sx=(i*71)%VW, base=(i*53)%VH, sp=60+((i*29)%80), sy=(base+t*sp)%VH, len=4+((i*7)%8);
      ctx.globalAlpha=0.3+0.4*((i%4)/4); ctx.fillStyle=(i%5===0)?PAL.gold:PAL.wallHi; ctx.fillRect(sx,sy,1,len); }
    ctx.globalAlpha=1;
    drawTextCentered(ctx, 'ARCADE', VW/2, 28, PAL.gold, 3);
    if(data && data.arcadeBest) drawTextCentered(ctx, 'BEST  '+data.arcadeBest, VW/2, 54, PAL.wallEdge, 1);
    const hx=VW/2, hy=124 + Math.sin(t*4)*5;
    for(const off of [-5,-2,2,5]){ const g=ctx.createLinearGradient(0,hy,0,hy+22);
      g.addColorStop(0,PAL.goldHi); g.addColorStop(1,'rgba(255,210,30,0)');
      ctx.strokeStyle=g; ctx.lineWidth=1; ctx.beginPath(); ctx.moveTo(hx+off,hy+6); ctx.lineTo(hx+off,hy+22); ctx.stroke(); }
    ctx.imageSmoothingEnabled=false; ctx.drawImage(sprite('ball'), Math.round(hx-8), Math.round(hy-8));
    const b = { id:'arcadeStart', x:VW/2-50, y:184, w:100, h:32 };
    frameBtn(ctx, b, 'START', 2);
    btns.push(b);
  }

  // bottom bar — a raised panel split into two clickable tabs
  const bx = 6, bw = VW-12;
  ctx.fillStyle = 'rgba(26,6,6,0.92)'; ctx.fillRect(bx, barTop, bw, barH);   // panel
  ctx.fillStyle = PAL.wallEdge; ctx.fillRect(bx, barTop, bw, 1);             // bright top edge
  ctx.fillStyle = PAL.wallD;    ctx.fillRect(bx, barTop+barH-1, bw, 1);      // bottom shade
  const tw = Math.floor(bw/2);
  const tStory = { id:'tabStory',  x:bx,    y:barTop, w:tw,    h:barH };
  const tArc   = { id:'tabArcade', x:bx+tw, y:barTop, w:bw-tw, h:barH };
  drawTab(ctx, tStory, 'story',  tab==='story');
  drawTab(ctx, tArc,   'arcade', tab==='arcade');
  ctx.fillStyle = PAL.wallD; ctx.fillRect(bx+tw, barTop+4, 1, barH-8);       // divider between tabs
  btns.push(tStory, tArc);

  // back (top-left gold chevron)
  const back = { id:'menu', x:6, y:6, w:20, h:16 };
  ctx.fillStyle=PAL.gold;
  ctx.fillRect(back.x+11,back.y+4,2,2); ctx.fillRect(back.x+9,back.y+6,2,2); ctx.fillRect(back.x+7,back.y+8,2,2);
  ctx.fillRect(back.x+9,back.y+10,2,2); ctx.fillRect(back.x+11,back.y+12,2,2);
  drawWallet(ctx, VW-8, 8, data && data.gold, true);   // gold balance, top-right
  btns.push(back);
  return btns;
}

export function renderTitle(ctx, VW, VH, t, data){
  starfield(ctx, VW, VH, t);
  drawWallet(ctx, 8, 8, data && data.gold, false);     // gold balance, top-left (gear is top-right)
  // title
  drawTextCentered(ctx, 'SANDSLIDE', VW/2, 46, PAL.blackD, 3);          // shadow
  drawTextCentered(ctx, 'SANDSLIDE', VW/2, 44, PAL.gold, 3);
  if(data && data.best)       drawTextCentered(ctx, 'BEST  '+data.best,        VW/2, 82, PAL.goldHi, 1);
  if(data && data.arcadeBest) drawTextCentered(ctx, 'ARCADE  '+data.arcadeBest, VW/2, 96, PAL.wallEdge, 1);
  // bobbing Anubis hero
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(sprite('anubis'), VW/2-16, 124 + Math.sin(t*2)*3, 32, 32);
  // blinking "press to start" — the whole screen is the start button
  ctx.globalAlpha = 0.35 + 0.65*(0.5 + 0.5*Math.sin(t*3));
  drawTextCentered(ctx, 'PRESS TO START', VW/2, 198, PAL.goldHi, 1);
  ctx.globalAlpha = 1;
  // settings (cog) top-right, then a full-screen start hit-area (gear wins by order)
  const s = { id:'settings', x: VW-28, y: 14, w:22, h:22 };
  gear(ctx, s.x+11, s.y+11);
  const start = { id:'start', x:0, y:0, w:VW, h:VH };
  return [s, start];
}

export function renderMenu(ctx, VW, VH, t, data){
  starfield(ctx, VW, VH, t);  drawTextCentered(ctx, 'MENU', VW/2, 26, PAL.gold, 3);
  drawWallet(ctx, VW-8, 8, data && data.gold, true);
  const b1 = { id:'play',  x:30, y:60,  w:VW-60, h:30 };
  const b2 = { id:'sound', x:30, y:98,  w:VW-60, h:30 };
  const b3 = { id:'reset', x:30, y:136, w:VW-60, h:30 };
  const b4 = { id:'debug', x:30, y:174, w:VW-60, h:30 };
  frameBtn(ctx, b1, 'PLAY', 2);
  frameBtn(ctx, b2, 'SOUND  ' + (data && data.soundOn ? 'ON' : 'OFF'), 2);
  frameBtn(ctx, b3, 'RESET', 2);
  frameBtn(ctx, b4, 'DEBUG', 2);
  const back = { id:'menu', x:VW/2-32, y:214, w:64, h:18 };
  frameBtn(ctx, back, 'BACK', 1);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(sprite('anubis'), VW/2-8, 246, 16, 16);
  return [b1, b2, b3, b4, back];
}

// Developer menu — dev-only toggles (opened from the settings menu). Extensible:
// each tool is a labelled toggle button. First tool: GOD MODE (immortality).
export function renderDebug(ctx, VW, VH, t, data){
  starfield(ctx, VW, VH, t);  drawTextCentered(ctx, 'DEBUG', VW/2, 26, PAL.gold, 3);
  drawWallet(ctx, VW-8, 8, data && data.gold, true);
  drawTextCentered(ctx, 'DEVELOPER TOOLS', VW/2, 48, PAL.wallEdge, 1);
  const god = { id:'god', x:24, y:76, w:VW-48, h:34 };
  const on = !!(data && data.god);
  frame(ctx, god.x, god.y, god.w, god.h);
  drawTextCentered(ctx, 'GOD MODE  ' + (on ? 'ON' : 'OFF'), god.x+god.w/2, god.y+(god.h-14)/2, on ? PAL.fugu : PAL.gold, 2);
  // status indicator dot
  ctx.fillStyle = on ? PAL.fugu : PAL.wallD;
  ctx.beginPath(); ctx.arc(god.x+god.w-14, god.y+god.h/2, 4, 0, 7); ctx.fill();
  const back = { id:'settings', x:VW/2-32, y:250, w:64, h:18 };   // -> settings menu
  frameBtn(ctx, back, 'BACK', 1);
  return [god, back];
}

function outcome(ctx, VW, VH, t, spr, glowCol, title, titleCol, data){
  starfield(ctx, VW, VH, t);
  drawWallet(ctx, VW-8, 8, data && data.gold, true);
  // glow + emblem
  ctx.globalAlpha = 0.14 + 0.05*Math.sin(t*2); ctx.fillStyle = glowCol;
  ctx.beginPath(); ctx.arc(VW/2, 92, 44, 0, 7); ctx.fill(); ctx.globalAlpha = 1;
  ctx.imageSmoothingEnabled = false; ctx.drawImage(sprite(spr), VW/2-24, 68, 48, 48);
  drawTextCentered(ctx, title, VW/2, 146, titleCol, 3);
  if(data && data.depth != null){                          // endless run summary
    drawTextCentered(ctx, 'DEPTH  '+data.depth, VW/2, 178, PAL.gold, 2);
    drawTextCentered(ctx, 'GOLD  '+(data.score||0), VW/2, 200, PAL.goldHi, 1);
    if(data.bestDepth) drawTextCentered(ctx, 'BEST DEPTH  '+data.bestDepth, VW/2, 220, PAL.wallEdge, 1);
  } else {
    drawTextCentered(ctx, 'GOLD  '+(data?.score||0), VW/2, 184, PAL.goldHi, 2);
    if(data && data.best) drawTextCentered(ctx, 'BEST  '+data.best, VW/2, 208, PAL.wallEdge, 1);
  }
  const b1 = { id:'retry', x: VW/2-72, y: 240, w:68, h:26 };
  const b2 = { id:'menu',  x: VW/2+4,  y: 240, w:68, h:26 };
  frameBtn(ctx, b1, 'RETRY', 1);
  frameBtn(ctx, b2, 'MENU',  1);
  return [b1, b2];
}

export function renderWin(ctx, VW, VH, t, data){
  return outcome(ctx, VW, VH, t, 'exit', PAL.gold, 'CLEARED', PAL.gold, data);
}

export function renderGameover(ctx, VW, VH, t, data){
  return outcome(ctx, VW, VH, t, 'mummy', PAL.red, 'CURSED!', PAL.red, data);
}

// Level-result dialog: stars pop in one by one, then a coin bar fills to the
// collected percentage; CONTINUE advances. `r.t` is the animation clock (s).
export function renderResult(ctx, VW, VH, t, r, data){
  const rt = r ? r.t : 0, stars = r ? r.stars : 0, pct = r ? r.pct : 0;
  starfield(ctx, VW, VH, t);  drawWallet(ctx, VW-8, 8, data && data.gold, true);
  drawTextCentered(ctx, 'CLEARED', VW/2, 34, PAL.gold, 3);
  if(r && r.name) drawTextCentered(ctx, r.name, VW/2, 66, PAL.goldHi, 1);
  // three stars: earned ones fly in (scale-pop) at staggered times
  for(let k=0;k<3;k++){
    const sx = VW/2 + (k-1)*36, sy = 108;
    if(r && k < stars){
      const a = Math.max(0, Math.min(1, (rt - (0.35 + k*0.45)) / 0.35));
      if(a > 0){
        ctx.save(); ctx.globalAlpha = a; ctx.translate(sx, sy);
        const sc = 1 + (1-a)*1.6; ctx.scale(sc, sc);
        starFilled(ctx, 0, 0, 15, PAL.gold); ctx.restore(); ctx.globalAlpha = 1;
      } else { starOutline(ctx, sx, sy, 15, PAL.wallD); }
    } else { starOutline(ctx, sx, sy, 15, PAL.wallHi); }
  }
  // coin progress bar — fills to the coin % after the stars land
  const barX = 34, barY = 176, barW = VW-68, barH = 16;
  const prog = Math.max(0, Math.min(1, (rt - 1.7) / 1.0));
  const cur = prog * pct;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(sprite('ankh'), barX-20, barY-1, 16, 16);           // coin icon
  frame(ctx, barX, barY, barW, barH);
  ctx.fillStyle = PAL.goldD; ctx.fillRect(barX+2, barY+2, barW-4, barH-4);      // track
  ctx.fillStyle = PAL.gold;  ctx.fillRect(barX+2, barY+2, Math.round((barW-4)*cur), barH-4);
  const shown = r ? Math.round(prog * r.collected) : 0;
  drawTextCentered(ctx, shown + ' / ' + (r ? r.total : 0), VW/2, barY+barH+8, PAL.goldHi, 1);
  // continue
  const b = { id:'continue', x: VW/2-52, y: 232, w:104, h:28 };
  frameBtn(ctx, b, 'CONTINUE', 2);
  return [b];
}
