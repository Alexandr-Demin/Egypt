// =========== EGYPT — TITLE / WIN / GAMEOVER screens ===========
// Each render fn draws into the virtual ctx and returns the clickable button
// rects (virtual coords) so game.js can hit-test taps.

import { sprite, drawText, drawTextCentered, textWidth, PAL } from './sprites.js?v=20260619s';

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

function button(ctx, b, label, t, opts={}){
  const accent = opts.accent || PAL.gold;
  const glow = opts.pulse ? (0.5 + 0.5*Math.sin(t*4)) : 0;
  if(glow){ ctx.globalAlpha = 0.35*glow; ctx.fillStyle = accent;
    ctx.fillRect(b.x-3, b.y-3, b.w+6, b.h+6); ctx.globalAlpha = 1; }
  // beveled plate
  ctx.fillStyle = opts.dark || PAL.goldD; ctx.fillRect(b.x, b.y, b.w, b.h);
  ctx.fillStyle = accent; ctx.fillRect(b.x, b.y, b.w, b.h-2);
  ctx.fillStyle = opts.light || PAL.goldHi; ctx.fillRect(b.x, b.y, b.w, 2);
  ctx.fillStyle = PAL.blackD; // border
  ctx.fillRect(b.x,b.y,b.w,1); ctx.fillRect(b.x,b.y+b.h-1,b.w,1);
  ctx.fillRect(b.x,b.y,1,b.h); ctx.fillRect(b.x+b.w-1,b.y,1,b.h);
  const s = opts.scale || 2;
  drawTextCentered(ctx, label, b.x+b.w/2, b.y + (b.h - 7*s)/2, opts.text || '#3a2008', s);
}

export function renderTitle(ctx, VW, VH, t, data){
  starfield(ctx, VW, VH, t);
  frame(ctx, 6, 6, VW-12, VH-12);                 // screen border contour
  // title
  drawTextCentered(ctx, 'EGYPT', VW/2, 40, PAL.blackD, 4);          // shadow
  drawTextCentered(ctx, 'EGYPT', VW/2, 38, PAL.gold, 4);
  drawTextCentered(ctx, 'TOMB OF ANUBIS', VW/2, 74, PAL.wallEdge, 1);
  if(data && data.best) drawTextCentered(ctx, 'BEST  '+data.best, VW/2, 90, PAL.goldHi, 1);
  // bobbing Anubis hero
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(sprite('anubis'), VW/2-16, 110 + Math.sin(t*2)*3, 32, 32);
  // PLAY button (dotted contour outline)
  const b = { id:'play', x: VW/2-46, y: 198, w:92, h:28 };
  frameBtn(ctx, b, 'PLAY', 2);
  // blink prompt
  if(Math.sin(t*3) > -0.2) drawTextCentered(ctx, 'TAP TO START', VW/2, 252, PAL.goldHi, 1);
  return [b];
}

export function renderWin(ctx, VW, VH, t, data){
  ctx.fillStyle = '#0b0904'; ctx.fillRect(0,0,VW,VH);
  // radiant backdrop
  ctx.globalAlpha = 0.12 + 0.05*Math.sin(t*2); ctx.fillStyle = PAL.gold;
  ctx.beginPath(); ctx.arc(VW/2, VH/2-20, 80, 0, 7); ctx.fill(); ctx.globalAlpha = 1;
  const exit = sprite('exit'); ctx.imageSmoothingEnabled = false;
  ctx.drawImage(exit, VW/2-24, 60, 48, 48);
  drawTextCentered(ctx, 'TOMB', VW/2, 124, PAL.gold, 3);
  drawTextCentered(ctx, 'CLEARED', VW/2, 150, PAL.gold, 3);
  drawTextCentered(ctx, 'GOLD  '+(data?.score||0), VW/2, 184, PAL.goldHi, 2);
  const b1 = { id:'retry', x: VW/2-70, y: VH-72, w:64, h:24 };
  const b2 = { id:'menu',  x: VW/2+6,  y: VH-72, w:64, h:24 };
  button(ctx, b1, 'RETRY', t, { scale:1 });
  button(ctx, b2, 'MENU',  t, { scale:1, accent:PAL.lapisL, dark:PAL.lapis, light:PAL.lapisHi, text:'#08243f' });
  return [b1, b2];
}

export function renderGameover(ctx, VW, VH, t, data){
  ctx.fillStyle = '#0b0506'; ctx.fillRect(0,0,VW,VH);
  ctx.globalAlpha = 0.12; ctx.fillStyle = PAL.red;
  ctx.beginPath(); ctx.arc(VW/2, VH/2-20, 78, 0, 7); ctx.fill(); ctx.globalAlpha = 1;
  const mummy = sprite('mummy'); ctx.imageSmoothingEnabled = false;
  ctx.drawImage(mummy, VW/2-24, 64, 48, 48);
  drawTextCentered(ctx, 'CURSED!', VW/2, 130, PAL.red, 3);
  drawTextCentered(ctx, 'GOLD  '+(data?.score||0), VW/2, 168, '#e8d8b0', 2);
  if(data && data.best) drawTextCentered(ctx, 'BEST  '+data.best, VW/2, 188, PAL.goldHi, 1);
  const b1 = { id:'retry', x: VW/2-70, y: VH-72, w:64, h:24 };
  const b2 = { id:'menu',  x: VW/2+6,  y: VH-72, w:64, h:24 };
  button(ctx, b1, 'RETRY', t, { scale:1 });
  button(ctx, b2, 'MENU',  t, { scale:1, accent:PAL.lapisL, dark:PAL.lapis, light:PAL.lapisHi, text:'#08243f' });
  return [b1, b2];
}
