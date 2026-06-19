// =========== EGYPT — TITLE / WIN / GAMEOVER screens ===========
// Each render fn draws into the virtual ctx and returns the clickable button
// rects (virtual coords) so game.js can hit-test taps.

import { sprite, drawText, drawTextCentered, textWidth, PAL } from './sprites.js?v=20260619u';

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
  // settings (cog) button, top-right
  const s = { id:'settings', x: VW-28, y: 14, w:22, h:22 };
  gear(ctx, s.x+11, s.y+11);
  return [b, s];
}

export function renderMenu(ctx, VW, VH, t, data){
  starfield(ctx, VW, VH, t);
  frame(ctx, 6, 6, VW-12, VH-12);
  drawTextCentered(ctx, 'MENU', VW/2, 30, PAL.gold, 3);
  const b1 = { id:'play',  x:30, y:86,  w:VW-60, h:30 };
  const b2 = { id:'sound', x:30, y:132, w:VW-60, h:30 };
  const b3 = { id:'reset', x:30, y:178, w:VW-60, h:30 };
  frameBtn(ctx, b1, 'PLAY', 2);
  frameBtn(ctx, b2, 'SOUND  ' + (data && data.soundOn ? 'ON' : 'OFF'), 2);
  frameBtn(ctx, b3, 'RESET', 2);
  const back = { id:'menu', x:VW/2-32, y:224, w:64, h:18 };
  frameBtn(ctx, back, 'BACK', 1);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(sprite('anubis'), VW/2-8, 250, 16, 16);
  return [b1, b2, b3, back];
}

function outcome(ctx, VW, VH, t, spr, glowCol, title, titleCol, data){
  starfield(ctx, VW, VH, t);
  frame(ctx, 6, 6, VW-12, VH-12);
  // glow + emblem
  ctx.globalAlpha = 0.14 + 0.05*Math.sin(t*2); ctx.fillStyle = glowCol;
  ctx.beginPath(); ctx.arc(VW/2, 92, 44, 0, 7); ctx.fill(); ctx.globalAlpha = 1;
  ctx.imageSmoothingEnabled = false; ctx.drawImage(sprite(spr), VW/2-24, 68, 48, 48);
  drawTextCentered(ctx, title, VW/2, 146, titleCol, 3);
  drawTextCentered(ctx, 'GOLD  '+(data?.score||0), VW/2, 184, PAL.goldHi, 2);
  if(data && data.best) drawTextCentered(ctx, 'BEST  '+data.best, VW/2, 208, PAL.wallEdge, 1);
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
