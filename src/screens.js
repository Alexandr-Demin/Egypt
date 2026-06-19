// =========== EGYPT — TITLE / WIN / GAMEOVER screens ===========
// Each render fn draws into the virtual ctx and returns the clickable button
// rects (virtual coords) so game.js can hit-test taps.

import { sprite, drawText, drawTextCentered, textWidth, PAL } from './sprites.js?v=20260619n';

// neon night: dark void, twinkling crimson/gold stars, a gold moon, and
// glowing crimson pyramid silhouettes over a neon horizon (Egypt, after dark).
function bgScene(ctx, VW, VH, t){
  ctx.fillStyle = PAL.bg; ctx.fillRect(0, 0, VW, VH);
  // starfield (deterministic positions, gentle twinkle)
  for(let i=0;i<44;i++){
    const sx = (i*73) % VW, sy = (i*131) % (VH-70);
    const tw = 0.5 + 0.5*Math.sin(t*2 + i);
    ctx.globalAlpha = 0.25 + 0.55*tw;
    ctx.fillStyle = (i % 5 === 0) ? PAL.gold : PAL.lapisL;
    ctx.fillRect(sx, sy, 1, 1);
  }
  ctx.globalAlpha = 1;
  // gold moon
  const sx = VW/2, sy = 86 + Math.sin(t*0.6)*2;
  ctx.fillStyle = PAL.goldD;  ctx.beginPath(); ctx.arc(sx, sy, 30, 0, 7); ctx.fill();
  ctx.fillStyle = PAL.gold;   ctx.beginPath(); ctx.arc(sx, sy, 26, 0, 7); ctx.fill();
  ctx.fillStyle = PAL.goldHi; ctx.beginPath(); ctx.arc(sx-6, sy-6, 15, 0, 7); ctx.fill();
  // glowing pyramids
  function pyr(px, base, w){
    ctx.fillStyle = '#140406';
    ctx.beginPath(); ctx.moveTo(px, base); ctx.lineTo(px+w/2, base-w*0.7); ctx.lineTo(px+w, base); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = PAL.lapisL; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(px, base); ctx.lineTo(px+w/2, base-w*0.7); ctx.lineTo(px+w, base); ctx.stroke();
  }
  pyr(-10, VH-60, 120); pyr(VW-110, VH-60, 130); pyr(60, VH-60, 100);
  // dark ground + neon horizon line
  ctx.fillStyle = '#140406'; ctx.fillRect(0, VH-60, VW, 60);
  ctx.fillStyle = PAL.lapisL; ctx.fillRect(0, VH-60, VW, 1);
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
  bgScene(ctx, VW, VH, t);
  // title
  drawTextCentered(ctx, 'EGYPT', VW/2, 28, PAL.blackD, 4);          // shadow
  drawTextCentered(ctx, 'EGYPT', VW/2, 26, PAL.gold, 4);
  drawTextCentered(ctx, 'TOMB OF ANUBIS', VW/2, 60, PAL.lapisHi, 1);
  // bobbing Anubis hero
  const hero = sprite('anubis'); const hy = VH-118 + Math.sin(t*2)*3;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(hero, VW/2-16, hy, 32, 32);
  // PLAY button
  const b = { id:'play', x: VW/2-44, y: VH-58, w:88, h:26 };
  button(ctx, b, 'PLAY', t, { pulse:true, scale:2 });
  // blink prompt + best
  if(Math.sin(t*3) > -0.2) drawTextCentered(ctx, 'TAP TO START', VW/2, VH-22, '#f0e0b0', 1);
  if(data && data.best) drawTextCentered(ctx, 'BEST  '+data.best, VW/2, 74, PAL.goldHi, 1);
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
