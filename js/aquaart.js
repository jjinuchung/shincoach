// 🐠 진우 아쿠아리움 그림 (v399 · 기본안 · 1안 방 안의 빛나는 수조 + 2안 겹겹이 깊은 수조 「이대로」) — 캔버스 2D에 직접 그린다 · 그림 파일 없음
// 장면은 가상 좌표 960×560 · 그려 둔 그림 해상도 1.5배 — 방·뒤 겹·가운데 겹·앞 겹·빛·물고기 그림은 한 번만 그리고, 장면마다 붙이기만 한다
// 장면마다 그리는 것: 물고기 붙이기 · 수초 줄기 · 공기방울 · 방바닥 물빛 — 방과 재질 틀은 resetScene으로 한 번 깔면 다시 안 그린다
// 겹 차례: 뒤 겹(먼 풍경·안개) → 뒤 물고기 → 가운데 겹(바닥·장식) → 뒤쪽 수초 → 가운데 물고기 → 앞쪽 수초 → 앞 물고기 → 빛 → 공기방울 → 앞 겹(가장자리 실루엣)
// 물고기 그림은 fishart.js drawFish를 그대로 쓴다 · 장식은 물고기처럼 부드러운 면과 얇은 선으로 그린다
import { drawFish, LOOKS } from './fishart.js';

export const AQ_W = 960;
export const AQ_H = 560;
const FRAME = { ruin: 11, plain: 12, iron: 18, emerald: 22, gold: 24, diamond: 22, ultra: 24, space: 24 };
const WATER = {
  ruin: ['#5d6b45', '#2c3626'], plain: ['#8fd3ee', '#2f86bd'], iron: ['#6fc0cf', '#1f6f86'], emerald: ['#5fe0bd', '#0b7566'],
  gold: ['#8fdcf0', '#1a6f9e'], diamond: ['#c8f3ff', '#3fa9df'], ultra: ['#4fb6ee', '#10357e'], space: ['rgba(90,120,220,.22)', 'rgba(30,20,90,.5)'],
};
const SAND = {
  ruin: ['#4a4231', '#2e291e'], plain: ['#e9dfc8', '#c9b995'], iron: ['#a9a59a', '#74716a'], emerald: ['#cfe8c8', '#7fb79a'],
  gold: ['#f3dc9a', '#c69c4a'], diamond: ['#f4fbff', '#bfdff1'], ultra: ['#d9dfee', '#8d97b8'], space: ['#b9b6c9', '#6a6780'],
};
const rnd = (i) => { const s = Math.sin(i * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
const lg = (c, x0, y0, x1, y1, stops) => { const g = c.createLinearGradient(x0, y0, x1, y1); stops.forEach((s, i) => g.addColorStop(s[1] === undefined ? i / (stops.length - 1) : s[1], s[0])); return g; };
const rr = (c, x, y, w, h, r) => { c.beginPath(); c.roundRect(x, y, w, h, r); };
const poly = (c, pts) => { c.beginPath(); pts.forEach((p, i) => (i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]))); c.closePath(); };
const sparkle = (c, x, y, r, a = 1) => {
  c.save(); c.globalAlpha = a; c.fillStyle = '#fff'; c.translate(x, y);
  poly(c, [[0, -r], [r * 0.18, -r * 0.18], [r, 0], [r * 0.18, r * 0.18], [0, r], [-r * 0.18, r * 0.18], [-r, 0], [-r * 0.18, -r * 0.18]]); c.fill(); c.restore();
};

/** 수조 자리 — 받침 위에 놓인 바깥 틀 { x, y, w, h, f, bottom } */
function tankBox(tank) {
  const w = AQ_W * tank.size;
  const h = Math.min(w * 0.57, 392);
  const standH = tank.key === 'space' ? 46 : 74;
  const y = AQ_H - standH - h;
  return { x: (AQ_W - w) / 2, y, w, h, f: FRAME[tank.key], bottom: y + h };
}

function stars(c, n, x0, y0, w, h, seed = 1) {
  for (let i = 0; i < n; i++) {
    const r = rnd(i + seed) ** 3 * 1.9 + 0.5;
    c.fillStyle = `rgba(255,255,255,${0.35 + rnd(i * 3 + seed) * 0.65})`;
    c.beginPath(); c.arc(x0 + rnd(i * 7 + seed) * w, y0 + rnd(i * 13 + seed) * h, r, 0, 7); c.fill();
  }
}
function spaceBack(c, x, y, w, h) {
  c.fillStyle = lg(c, 0, y, 0, y + h, [['#070a22'], ['#150c3a'], ['#0a0620']]);
  c.fillRect(x, y, w, h);
  const neb = (cx, cy, r, col) => { const g = c.createRadialGradient(cx, cy, 0, cx, cy, r); g.addColorStop(0, col); g.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = g; c.fillRect(x, y, w, h); };
  neb(x + w * 0.24, y + h * 0.34, w * 0.34, 'rgba(155,60,210,.42)');
  neb(x + w * 0.78, y + h * 0.62, w * 0.36, 'rgba(40,120,230,.36)');
  stars(c, 150, x, y, w, h, 3);
  const px = x + w * 0.76;
  const py = y + h * 0.3;
  const pr = Math.min(w, h) * 0.13;
  c.fillStyle = lg(c, px - pr, py - pr, px + pr, py + pr, [['#ffd9a0'], ['#e58a5b'], ['#6c2f55']]);
  c.beginPath(); c.arc(px, py, pr, 0, 7); c.fill();
  c.strokeStyle = 'rgba(255,225,190,.72)'; c.lineWidth = pr * 0.14;
  c.beginPath(); c.ellipse(px, py, pr * 1.72, pr * 0.42, -0.32, 0, 7); c.stroke();
}
function paintRoom(c, key) {
  const W = AQ_W;
  const H = AQ_H;
  const floorY = H - 86;
  if (key === 'ruin') {
    c.fillStyle = '#231d28'; c.fillRect(0, 0, W, H);
    for (let i = 0; i < 16; i++) {
      const x = i * 60;
      const v = 30 + rnd(i) * 22;
      c.fillStyle = `rgb(${v + 12},${v},${v + 8})`;
      c.fillRect(x + 1, -4 + rnd(i + 9) * 20, 57, floorY);
      c.fillStyle = 'rgba(0,0,0,.34)';
      for (let k = 0; k < 4; k++) c.fillRect(x + 6 + rnd(i * 5 + k) * 44, rnd(i * 3 + k) * floorY, 2, 30 + rnd(k + i) * 70);
    }
    c.fillStyle = '#100d14'; poly(c, [[696, 60], [842, 44], [858, 190], [760, 226], [690, 178]]); c.fill();
    c.fillStyle = 'rgba(166,190,235,.11)'; poly(c, [[696, 70], [850, 60], [560, 480], [250, 480]]); c.fill();
    c.fillStyle = '#17131a'; c.fillRect(0, floorY, W, H - floorY);
    for (let i = 0; i < 9; i++) { c.fillStyle = 'rgba(255,255,255,.04)'; c.fillRect(rnd(i) * W, floorY + rnd(i + 3) * 70, 90 + rnd(i + 5) * 120, 2); }
    c.strokeStyle = 'rgba(220,220,230,.3)'; c.lineWidth = 1;
    for (let i = 0; i < 6; i++) { c.beginPath(); c.moveTo(0, 8); c.lineTo(62 + i * 24, 12 + (5 - i) * 20); c.stroke(); }
    for (let k = 1; k < 4; k++) { c.beginPath(); for (let i = 0; i < 6; i++) { const p = k / 4; const px = (62 + i * 24) * p; const py = 8 + (4 + (5 - i) * 20) * p; if (i) c.lineTo(px, py); else c.moveTo(px, py); } c.stroke(); }
    c.strokeStyle = '#0d0b10'; c.lineWidth = 2; c.beginPath(); c.moveTo(480, 0); c.lineTo(480, 58); c.stroke();
    const g = c.createRadialGradient(480, 68, 2, 480, 68, 200); g.addColorStop(0, 'rgba(255,205,120,.5)'); g.addColorStop(1, 'rgba(255,205,120,0)');
    c.fillStyle = g; c.fillRect(250, 0, 460, 280);
    c.fillStyle = '#ffd98e'; c.beginPath(); c.arc(480, 68, 10, 0, 7); c.fill();
  } else if (key === 'plain') {
    c.fillStyle = lg(c, 0, 0, 0, floorY, [['#eaf0f3'], ['#d8e2e8']]); c.fillRect(0, 0, W, floorY);
    c.fillStyle = '#c6d2d9'; c.fillRect(0, floorY - 14, W, 14);
    c.fillStyle = lg(c, 0, floorY, 0, H, [['#b89a76'], ['#8d7355']]); c.fillRect(0, floorY, W, H - floorY);
    c.strokeStyle = 'rgba(70,50,30,.2)'; for (let i = 0; i < 12; i++) { c.beginPath(); c.moveTo(i * 90 - 30, floorY); c.lineTo(i * 110 - 90, H); c.stroke(); }
    c.fillStyle = '#c47a4a'; poly(c, [[66, floorY - 44], [120, floorY - 44], [112, floorY + 8], [74, floorY + 8]]); c.fill();
    c.fillStyle = '#4f8f5d'; for (let i = 0; i < 7; i++) { c.save(); c.translate(93, floorY - 44); c.rotate(-1.1 + i * 0.36); c.beginPath(); c.ellipse(0, -46, 11, 48, 0, 0, 7); c.fill(); c.restore(); }
  } else if (key === 'iron') {
    c.fillStyle = '#54585e'; c.fillRect(0, 0, W, floorY);
    for (let r = 0; r < 12; r++) for (let i = 0; i < 12; i++) {
      const x = i * 92 - (r % 2) * 46;
      const v = 76 + rnd(r * 12 + i) * 18;
      c.fillStyle = `rgb(${v},${v + 3},${v + 8})`; rr(c, x + 2, r * 44 + 2, 88, 40, 2); c.fill();
    }
    c.fillStyle = lg(c, 0, 26, 0, 58, [['#9aa1a8'], ['#5e646b'], ['#3a3f45']]); c.fillRect(0, 26, W, 30);
    c.fillStyle = '#3d4248'; for (let i = 1; i < 6; i++) c.fillRect(i * 170, 20, 14, 42);
    c.fillStyle = '#3a3d42'; c.fillRect(0, floorY, W, H - floorY);
    c.fillStyle = 'rgba(255,255,255,.07)';
    for (let y = floorY + 8; y < H; y += 18) for (let x = (y % 36 ? 0 : 18); x < W; x += 36) { c.save(); c.translate(x, y); c.rotate(0.7); c.fillRect(-7, -2, 14, 3); c.restore(); }
  } else if (key === 'emerald') {
    c.fillStyle = lg(c, 0, 0, 0, floorY, [['#0d3f39'], ['#072823']]); c.fillRect(0, 0, W, floorY);
    for (let i = 0; i < 5; i++) {
      const x = 40 + i * 220;
      c.fillStyle = lg(c, x, 0, x + 70, 0, [['#0b5f4f'], ['#22a585'], ['#0b5f4f']]); c.fillRect(x, 0, 70, floorY);
      c.fillStyle = '#c9f5e3'; c.globalAlpha = 0.24; c.fillRect(x + 28, 0, 8, floorY); c.globalAlpha = 1;
    }
    c.fillStyle = lg(c, 0, floorY, 0, H, [['#0f6e5b'], ['#053a30']]); c.fillRect(0, floorY, W, H - floorY);
  } else if (key === 'gold') {
    for (let i = 0; i < 24; i++) { c.fillStyle = lg(c, i * 40, 0, i * 40 + 40, 0, [['#5c0f1f'], ['#a31b34'], ['#5c0f1f']]); c.fillRect(i * 40, 0, 41, floorY); }
    c.fillStyle = '#d8ab45'; c.fillRect(0, 0, W, 20);
    c.fillStyle = '#b98d2e'; for (let i = 0; i < 24; i++) { c.beginPath(); c.arc(i * 40 + 20, 20, 20, 0, Math.PI); c.fill(); }
    c.fillStyle = lg(c, 0, floorY, 0, H, [['#2c2024'], ['#120c0f']]); c.fillRect(0, floorY, W, H - floorY);
    c.fillStyle = '#d8ab45'; c.fillRect(0, floorY, W, 4);
  } else if (key === 'diamond') {
    c.fillStyle = lg(c, 0, 0, W, floorY, [['#e6f6ff'], ['#bfe3f6'], ['#e9f4fb']]); c.fillRect(0, 0, W, floorY);
    for (let i = 0; i < 26; i++) {
      const x = rnd(i) * W;
      const y = rnd(i + 40) * floorY;
      const s = 50 + rnd(i + 9) * 90;
      c.fillStyle = `rgba(255,255,255,${0.12 + rnd(i + 2) * 0.28})`; poly(c, [[x, y - s], [x + s * 0.7, y], [x, y + s], [x - s * 0.7, y]]); c.fill();
    }
    c.fillStyle = lg(c, 0, floorY, 0, H, [['#d2ecf9'], ['#a4cfe6']]); c.fillRect(0, floorY, W, H - floorY);
  } else if (key === 'ultra') {
    c.fillStyle = lg(c, 0, 0, 0, floorY, [['#0a1436'], ['#1f2e66'], ['#3a3f7c']]); c.fillRect(0, 0, W, floorY);
    for (let i = 0; i < 40; i++) {
      const w = 18 + rnd(i) * 30;
      const h = 60 + rnd(i + 5) * 170;
      const x = i * 26 - 20;
      c.fillStyle = '#0b1230'; c.fillRect(x, floorY - h, w, h);
      c.fillStyle = 'rgba(255,214,130,.65)';
      for (let k = 0; k < 14; k++) if (rnd(i * 17 + k) > 0.6) c.fillRect(x + 3 + (k % 3) * 6, floorY - h + 6 + Math.floor(k / 3) * 14, 3, 5);
    }
    c.fillStyle = 'rgba(200,220,255,.07)'; for (let i = 1; i < 7; i++) c.fillRect(i * 140, 0, 6, floorY);
    c.fillStyle = lg(c, 0, floorY, 0, H, [['#2b3158'], ['#0b0e24']]); c.fillRect(0, floorY, W, H - floorY);
  } else {
    spaceBack(c, 0, 0, W, H);
    c.fillStyle = lg(c, 0, H - 60, 0, H, [['#7d7a8e'], ['#3a3848']]);
    c.beginPath(); c.moveTo(0, H - 34); c.quadraticCurveTo(W * 0.5, H - 78, W, H - 34); c.lineTo(W, H); c.lineTo(0, H); c.closePath(); c.fill();
    c.fillStyle = 'rgba(0,0,0,.2)';
    [[140, H - 26, 26], [770, H - 22, 34], [420, H - 18, 18]].forEach(([x, y, r]) => { c.beginPath(); c.ellipse(x, y, r, r * 0.34, 0, 0, 7); c.fill(); });
  }
}
function facetBar(c, x, y, w, h, cols, n) {
  const vertical = h > w;
  const len = vertical ? h : w;
  const step = len / n;
  for (let i = 0; i < n; i++) {
    c.fillStyle = cols[i % cols.length];
    if (vertical) { const a = y + i * step; poly(c, [[x, a], [x + w, a + step * 0.3], [x + w, a + step], [x, a + step * 0.7]]); c.fill(); c.fillRect(x, a + step * 0.3, w, step * 0.4); } else { const a = x + i * step; poly(c, [[a, y], [a + step, y], [a + step * 0.7, y + h], [a + step * 0.3, y + h]]); c.fill(); poly(c, [[a, y + h], [a + step * 0.3, y + h], [a, y]]); c.fill(); poly(c, [[a + step, y + h], [a + step * 0.7, y + h], [a + step, y]]); c.fill(); }
  }
}
function ring(c, b, fill) {
  c.fillStyle = fill;
  c.beginPath(); c.rect(b.x, b.y, b.w, b.h); c.rect(b.x + b.f, b.y + b.f, b.w - b.f * 2, b.h - b.f * 2); c.fill('evenodd');
}
function drawFrame(c, tank, b, t) {
  const { x, y, w, h, f } = b;
  const key = tank.key;
  if (key === 'ruin') {
    ring(c, b, lg(c, x, y, x + w, y + h, [['#7a4e2f'], ['#4a3122'], ['#8a5532'], ['#3d2a1f']]));
    c.fillStyle = 'rgba(30,18,12,.5)'; for (let i = 0; i < 40; i++) { const e = rnd(i); const px = e < 0.5 ? x + rnd(i + 1) * w : (rnd(i + 2) > 0.5 ? x : x + w - f); const py = e < 0.5 ? (rnd(i + 2) > 0.5 ? y : y + h - f) : y + rnd(i + 1) * h; c.beginPath(); c.ellipse(px + 4, py + 4, 3 + rnd(i + 6) * 8, 2 + rnd(i + 7) * 3, 0, 0, 7); c.fill(); }
    c.save(); c.translate(x + w - 92, y + 2); c.rotate(0.3); c.fillStyle = 'rgba(205,190,140,.75)'; c.fillRect(0, 0, 74, 18); c.restore();
    c.fillStyle = '#6d4c33'; [0, 1, 2].forEach((i) => { const sw = b.w / 3 - 8; const sx = x + i * (sw + 12); c.fillStyle = i % 2 ? '#5d4029' : '#6d4c33'; c.fillRect(sx, y + h, sw, AQ_H - y - h - 8); c.fillStyle = 'rgba(0,0,0,.28)'; c.fillRect(sx, y + h + 20, sw, 3); c.fillRect(sx, y + h + 42, sw, 3); c.fillRect(sx + sw / 2, y + h, 3, AQ_H - y - h - 8); });
    return;
  }
  if (key === 'plain') {
    ring(c, b, '#23272c');
    c.fillStyle = lg(c, 0, y - 16, 0, y + 6, [['#3a4047'], ['#23272c']]); rr(c, x - 6, y - 16, w + 12, 22, [8, 8, 0, 0]); c.fill();
    c.fillStyle = lg(c, x, 0, x + w, 0, [['#a57a51'], ['#c09769'], ['#a57a51']]); c.fillRect(x + 10, y + h, w - 20, AQ_H - y - h - 8);
    c.strokeStyle = 'rgba(60,35,15,.45)'; c.lineWidth = 2; c.strokeRect(x + 24, y + h + 8, w / 2 - 34, AQ_H - y - h - 26); c.strokeRect(x + w / 2 + 10, y + h + 8, w / 2 - 34, AQ_H - y - h - 26);
    return;
  }
  if (key === 'iron') {
    ring(c, b, lg(c, x, y, x, y + h, [['#a7afb7'], ['#6c747c'], ['#8c949c'], ['#565d65']]));
    c.fillStyle = '#39404a';
    const dots = (px, py, n, dx, dy) => { for (let i = 0; i <= n; i++) { c.beginPath(); c.arc(px + dx * i, py + dy * i, 3.2, 0, 7); c.fill(); } };
    dots(x + 12, y + 9, Math.floor((w - 24) / 34), 34, 0); dots(x + 12, y + h - 9, Math.floor((w - 24) / 34), 34, 0);
    dots(x + 9, y + 34, Math.floor((h - 60) / 34), 0, 34); dots(x + w - 9, y + 34, Math.floor((h - 60) / 34), 0, 34);
    c.fillStyle = lg(c, 0, y - 28, 0, y - 6, [['#a7afb7'], ['#555c64']]); rr(c, x + 60, y - 28, w - 120, 16, 8); c.fill();
    c.fillRect(x + 90, y - 16, 14, 18); c.fillRect(x + w - 104, y - 16, 14, 18);
    c.strokeStyle = '#c0473a'; c.lineWidth = 5; c.beginPath(); c.arc(x + w / 2, y - 22, 16, 0, 7); c.moveTo(x + w / 2 - 16, y - 22); c.lineTo(x + w / 2 + 16, y - 22); c.moveTo(x + w / 2, y - 38); c.lineTo(x + w / 2, y - 6); c.stroke();
    c.fillStyle = '#4d545c'; c.fillRect(x + 8, y + h, 30, AQ_H - y - h - 8); c.fillRect(x + w - 38, y + h, 30, AQ_H - y - h - 8);
    c.strokeStyle = '#4d545c'; c.lineWidth = 10; c.beginPath(); c.moveTo(x + 30, y + h); c.lineTo(x + w - 30, AQ_H - 12); c.moveTo(x + w - 30, y + h); c.lineTo(x + 30, AQ_H - 12); c.stroke();
    return;
  }
  if (key === 'emerald') {
    const cols = ['#0f8f65', '#27cf97', '#0a6e50', '#55e6b6'];
    facetBar(c, x, y, w, f, cols, 22); facetBar(c, x, y + h - f, w, f, cols, 22); facetBar(c, x, y, f, h, cols, 11); facetBar(c, x + w - f, y, f, h, cols, 11);
    [[x, y], [x + w, y], [x, y + h], [x + w, y + h]].forEach(([px, py]) => { c.fillStyle = '#b6ffe6'; poly(c, [[px, py - 22], [px + 22, py], [px, py + 22], [px - 22, py]]); c.fill(); c.fillStyle = '#17b583'; poly(c, [[px, py - 12], [px + 12, py], [px, py + 12], [px - 12, py]]); c.fill(); });
    facetBar(c, x + 16, y + h + 6, w - 32, AQ_H - y - h - 14, ['#0a6e50', '#0f8f65', '#0b5f4f'], 16);
    return;
  }
  if (key === 'gold') {
    const g = lg(c, x, y, x + w, y + h, [['#fff0ad'], ['#d8a93f'], ['#fbe28b'], ['#a97a22'], ['#ffeaa0']]);
    ring(c, b, g);
    c.strokeStyle = '#8f651b'; c.lineWidth = 2; c.strokeRect(x + 6, y + 6, w - 12, h - 12); c.strokeRect(x + f - 3, y + f - 3, w - f * 2 + 6, h - f * 2 + 6);
    c.fillStyle = g; c.beginPath(); c.moveTo(x + w / 2 - 120, y); c.quadraticCurveTo(x + w / 2 - 40, y - 8, x + w / 2 - 44, y - 34); c.lineTo(x + w / 2 - 24, y - 20); c.lineTo(x + w / 2, y - 48); c.lineTo(x + w / 2 + 24, y - 20); c.lineTo(x + w / 2 + 44, y - 34); c.quadraticCurveTo(x + w / 2 + 40, y - 8, x + w / 2 + 120, y); c.closePath(); c.fill();
    c.fillStyle = '#d3283f'; c.beginPath(); c.arc(x + w / 2, y - 14, 7, 0, 7); c.fill();
    [[x + 14, y + 14], [x + w - 14, y + 14], [x + 14, y + h - 14], [x + w - 14, y + h - 14]].forEach(([px, py]) => { c.fillStyle = '#8f651b'; c.beginPath(); c.arc(px, py, 10, 0, 7); c.fill(); c.fillStyle = '#fff0ad'; c.beginPath(); c.arc(px, py, 6, 0, 7); c.fill(); });
    c.fillStyle = g; c.fillRect(x + 30, y + h, w - 60, 30);
    [x + 36, x + w - 76].forEach((px) => { c.beginPath(); c.moveTo(px, y + h + 30); c.quadraticCurveTo(px - 8, AQ_H - 30, px - 12, AQ_H - 12); c.lineTo(px + 52, AQ_H - 12); c.quadraticCurveTo(px + 48, AQ_H - 30, px + 40, y + h + 30); c.closePath(); c.fill(); });
    return;
  }
  if (key === 'diamond') {
    const cols = ['#f4fbff', '#c5e9fb', '#9cd6f4', '#ffffff'];
    facetBar(c, x, y, w, f, cols, 30); facetBar(c, x, y + h - f, w, f, cols, 30); facetBar(c, x, y, f, h, cols, 14); facetBar(c, x + w - f, y, f, h, cols, 14);
    c.strokeStyle = 'rgba(90,160,210,.6)'; c.lineWidth = 1.5; c.strokeRect(x, y, w, h);
    facetBar(c, x + 24, y + h + 6, w - 48, AQ_H - y - h - 14, ['#d7effa', '#aedcf3', '#f2fbff'], 22);
    for (let i = 0; i < 12; i++) { const p = i / 12; const a = (Math.sin(t * 2 + i * 1.9) + 1) / 2; const e = i % 4; const px = e < 2 ? x + w * ((p * 4) % 1) : (e === 2 ? x + 10 : x + w - 10); const py = e === 0 ? y + 10 : e === 1 ? y + h - 10 : y + h * ((p * 4) % 1); sparkle(c, px, py, 5 + a * 9, 0.4 + a * 0.6); }
    return;
  }
  // 7 초특급 · 8 우주 — 철 몸통 + 에메랄드 줄 + 금 선 + 다이아 모서리 (8은 어두운 몸통 · 보라 빛)
  const dark = key === 'space';
  ring(c, b, lg(c, x, y, x, y + h, dark ? [['#454a63'], ['#23263a'], ['#3a3e56'], ['#1c1e30']] : [['#c3cad2'], ['#7d868f'], ['#a9b1ba'], ['#6a727b']]));
  c.fillStyle = '#17c08b'; c.fillRect(x + 8, y + 8, w - 16, 5); c.fillRect(x + 8, y + h - 13, w - 16, 5); c.fillRect(x + 8, y + 8, 5, h - 16); c.fillRect(x + w - 13, y + 8, 5, h - 16);
  c.strokeStyle = '#ecc65c'; c.lineWidth = 2.5; c.strokeRect(x + f - 3, y + f - 3, w - f * 2 + 6, h - f * 2 + 6); c.strokeRect(x + 1.5, y + 1.5, w - 3, h - 3);
  c.fillStyle = dark ? '#a78bfa' : '#8fe4ff';
  c.save(); c.shadowBlur = 12; c.shadowColor = c.fillStyle; rr(c, x + 60, y - 8, w - 120, 8, 4); c.fill(); c.restore();
  [[x, y], [x + w, y], [x, y + h], [x + w, y + h]].forEach(([px, py]) => { c.fillStyle = '#f4fbff'; poly(c, [[px, py - 18], [px + 18, py], [px, py + 18], [px - 18, py]]); c.fill(); c.fillStyle = '#9cd6f4'; poly(c, [[px, py - 18], [px + 18, py], [px, py]]); c.fill(); sparkle(c, px, py, 5 + ((Math.sin(t * 2 + px) + 1) / 2) * 8, 0.8); });
  c.fillStyle = lg(c, 0, y + h, 0, AQ_H, dark ? [['#2c2f46'], ['#14162a']] : [['#7d868f'], ['#3f4650']]);
  poly(c, [[x + 40, y + h], [x + w - 40, y + h], [x + w - 80, AQ_H - 8], [x + 80, AQ_H - 8]]); c.fill();
  c.fillStyle = '#ecc65c'; c.fillRect(x + 56, y + h + 12, w - 112, 3);
  c.fillStyle = '#17c08b'; c.fillRect(x + 70, y + h + 22, w - 140, 3);
}
// ───────────── 🐠 단계마다 다른 값 (1안 빛 · 2안 겹) ─────────────
// dim 방 누르기 · lamp 조명 색 · top 조명 시작 높이(b면 수조 위로 그만큼) · cone 조명 세기 위·아래 · half 조명 윗폭(작으면 전등 · 몫이면 덮개 등)
// pool 물속 빛 웅덩이 색 · ray 빛줄기 색 · rays 빛줄기 수 · lean 기울기(fan이면 부채꼴) · rim 앞 겹 윗선 빛 · weeds 수초 색 · base 처음부터 있는 수초 [u, d, 높이]
const LOOK = {
  ruin: { dim: 'rgba(8,8,16,.34)', lamp: '255,206,130', top: 68, cone: [0.46, 0.12], half: 16, pool: 'rgba(232,196,120,', ray: 'rgba(216,206,140,', rays: 3, lean: -0.34, rim: 'rgba(220,200,150,.14)', weeds: ['#4b5a2e', '#5f7038', '#3a4a26'], base: [[0.27, 0.34, 0.5], [0.56, 0.52, 0.42]] },
  plain: { dim: 'rgba(10,18,34,.68)', lamp: '226,244,255', top: -90, cone: [0, 0.1], half: 0.38, pool: 'rgba(236,250,255,', ray: 'rgba(226,246,255,', rays: 5, lean: -0.1, rim: 'rgba(200,236,255,.18)', weeds: ['#2e8f58', '#3fae6c', '#247a4a'], base: [[0.17, 0.26, 0.58], [0.53, 0.46, 0.5], [0.74, 0.2, 0.46]] },
  iron: { dim: 'rgba(8,12,18,.62)', lamp: '255,232,190', top: -30, cone: [0.3, 0.1], half: 16, pool: 'rgba(236,246,240,', ray: 'rgba(226,240,236,', rays: 4, lean: -0.16, rim: 'rgba(200,226,226,.16)', weeds: ['#2e7f6a', '#3f9e82', '#246a58'], base: [[0.2, 0.3, 0.56], [0.52, 0.5, 0.48], [0.76, 0.24, 0.5]] },
  emerald: { dim: 'rgba(4,16,14,.5)', lamp: '190,255,230', top: -40, cone: [0.3, 0.12], half: 16, pool: 'rgba(214,255,240,', ray: 'rgba(206,255,236,', rays: 5, lean: 0.12, rim: 'rgba(170,255,222,.18)', weeds: ['#17a37a', '#39cf9f', '#0f7d5e'], base: [[0.16, 0.28, 0.6], [0.48, 0.3, 0.52], [0.72, 0.26, 0.54]] },
  gold: { dim: 'rgba(16,6,16,.56)', lamp: '255,226,160', top: -40, cone: [0.32, 0.12], half: 16, pool: 'rgba(255,238,190,', ray: 'rgba(255,232,170,', rays: 5, lean: 'fan', rim: 'rgba(255,226,160,.2)', weeds: ['#1f8a66', '#2fb184', '#176e55'], base: [[0.15, 0.3, 0.6], [0.5, 0.26, 0.52], [0.73, 0.32, 0.56]] },
  diamond: { dim: 'rgba(14,26,44,.6)', lamp: '230,246,255', top: -40, cone: [0.26, 0.1], half: 16, pool: 'rgba(240,252,255,', ray: 'rgba(236,250,255,', rays: 6, lean: 'fan', rim: 'rgba(216,240,255,.22)', weeds: ['#3fb7c9', '#7adbe6', '#2a93a6'], base: [[0.14, 0.3, 0.62], [0.47, 0.28, 0.52], [0.74, 0.3, 0.56]] },
  ultra: { dim: 'rgba(6,8,24,.4)', lamp: '170,220,255', top: -70, cone: [0, 0.14], half: 0.42, pool: 'rgba(210,236,255,', ray: 'rgba(200,232,255,', rays: 6, lean: -0.08, rim: 'rgba(170,216,255,.2)', weeds: ['#2f8fd0', '#59b6ee', '#1f6fb0'], base: [[0.14, 0.3, 0.62], [0.46, 0.26, 0.54], [0.72, 0.3, 0.58]] },
  space: { dim: 'rgba(4,4,16,.3)', lamp: '190,170,255', top: -60, cone: [0, 0.14], half: 0.42, pool: 'rgba(190,176,255,', ray: 'rgba(196,186,255,', rays: 5, lean: 0, rim: 'rgba(190,176,255,.2)', weeds: ['#7a5fd8', '#a78bfa', '#5a45b0'], base: [[0.14, 0.3, 0.6], [0.46, 0.28, 0.5], [0.72, 0.3, 0.56]] },
};
/** 그려 둔 그림의 해상도 — 캔버스 1440 ÷ 가상 폭 960 */
const SC = 1.5;
const WAGS = [-0.28, -0.14, 0, 0.14, 0.28];
/** 앞 겹이 차지해도 되는 가장자리 — 왼쪽·오른쪽 폭의 몫 (가운데는 비워 둔다 · 눌러 보기를 가리지 않게) */
export const EDGE_L = 0.17;
export const EDGE_R = 0.13;
/** 깊이 d(0 앞 → 1 뒤)의 바닥 높이 — 뒤로 갈수록 높다 (물 높이에 대한 몫) */
const floorAt = (d, ih) => ih * (0.93 - 0.25 * d);
const WATER_HEX = { ...WATER, space: ['#5a78dc', '#1e145a'] }; // 우주 물은 투명해서 색 섞을 때만 쓰는 값

const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const mixc = (a, b, t, al = 1) => { const x = hex(a); const y = hex(b); const v = x.map((p, i) => Math.round(p + (y[i] - p) * t)); return `rgba(${v[0]},${v[1]},${v[2]},${al})`; };
const midWater = (key) => mixc(WATER_HEX[key][0], WATER_HEX[key][1], 0.5);
const hexOf = (rgba) => { const m = rgba.match(/\d+/g).slice(0, 3).map(Number); return `#${m.map((v) => v.toString(16).padStart(2, '0')).join('')}`; };

function layer(w, h) {
  const cv = document.createElement('canvas');
  cv.width = Math.ceil(w * SC - 1e-6);
  cv.height = Math.ceil(h * SC - 1e-6);
  const c = cv.getContext('2d');
  c.scale(SC, SC);
  return { cv, c };
}
/** 줄였다 키워서 흐리게 — 한 번만 하는 일이라 ctx.filter 없이 어느 기기에서나 같게 */
function softened(src, w, h, k) {
  const a = document.createElement('canvas');
  a.width = Math.max(8, Math.round(src.width * k));
  a.height = Math.max(8, Math.round(src.height * k));
  const ac = a.getContext('2d');
  ac.imageSmoothingQuality = 'high';
  ac.drawImage(src, 0, 0, a.width, a.height);
  const b = document.createElement('canvas');
  b.width = a.width * 3;
  b.height = a.height * 3;
  const bc = b.getContext('2d');
  bc.imageSmoothingQuality = 'high';
  bc.drawImage(a, 0, 0, b.width, b.height);
  const out = layer(w, h);
  out.c.imageSmoothingQuality = 'high';
  out.c.drawImage(b, 0, 0, w, h);
  return out;
}

// ───────────── 물고기와 같은 선·그늘 ─────────────
// drawFish처럼 면은 네 칸 그러데이션 · 안쪽에 얇은 선(rgba(0,0,0,.12~.16) · 0.8) · 맨 위에 부드러운 입체 그늘 · 굵은 외곽선 없음
function shaded(c, path, cols, y0, y1, detail) {
  c.fillStyle = lg(c, 0, y0, 0, y1, [[cols[0], 0], [cols[1], 0.38], [cols[2], 0.72], [cols[3] || cols[2], 1]]);
  c.fill(path);
  c.save();
  c.clip(path);
  if (detail) detail();
  c.fillStyle = lg(c, 0, y0, 0, y1, [['rgba(255,255,255,.1)', 0], ['rgba(0,0,0,0)', 0.5], ['rgba(0,0,0,.2)', 1]]);
  c.fillRect(-400, y0 - 20, 800, y1 - y0 + 40);
  c.restore();
}
const fine = (c, a = 0.14) => { c.strokeStyle = `rgba(0,0,0,${a})`; c.lineWidth = 0.8; };
const GOLD = ['#fff0ad', '#e2b64c', '#b98d2e'];
const STONE = ['#a3a59f', '#84867f', '#5d5e5a', '#3c3d3a'];
const WOOD = ['#8f6a42', '#73502f', '#553a22', '#3a2717'];
function contact(c, rx, ry) {
  const g = c.createRadialGradient(0, 0, 1, 0, 0, rx);
  g.addColorStop(0, 'rgba(0,0,0,.34)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  c.save(); c.scale(1, ry / rx); c.fillStyle = g; c.beginPath(); c.arc(0, 0, rx, 0, 7); c.fill(); c.restore();
}
function mossOn(c, spots) {
  spots.forEach(([x, y, rx, ry, a]) => {
    const g = c.createRadialGradient(x, y, 0, x, y, rx);
    g.addColorStop(0, `rgba(84,122,70,${a})`);
    g.addColorStop(1, 'rgba(84,122,70,0)');
    c.save(); c.translate(x, y); c.scale(1, ry / rx); c.translate(-x, -y); c.fillStyle = g; c.beginPath(); c.arc(x, y, rx, 0, 7); c.fill(); c.restore();
  });
}
function sandMound(c, sand, rx, ry) {
  c.fillStyle = lg(c, 0, -ry, 0, ry, [[sand[0]], [sand[1]]]);
  c.beginPath(); c.moveTo(-rx, ry); c.quadraticCurveTo(-rx * 0.5, -ry * 0.8, 0, -ry * 0.3); c.quadraticCurveTo(rx * 0.5, -ry, rx, ry); c.closePath(); c.fill();
}
/** 침몰선 — 바닥에 반쯤 묻혀 기운 배 · 판자 선·이끼·구멍 · (0,0)이 바닥 가운데 · 폭 약 280 */
function wreck2(c, sand) {
  contact(c, 170, 26);
  c.save();
  c.rotate(-0.13);
  const mast = new Path2D();
  mast.moveTo(-46, -60); mast.lineTo(-40, -176); mast.lineTo(-33, -182); mast.lineTo(-31, -60); mast.closePath();
  shaded(c, mast, ['#7c5e40', '#65492f', '#4a3522'], -182, -60, () => { fine(c); c.beginPath(); c.moveTo(-38, -180); c.lineTo(-40, -60); c.stroke(); });
  const spar = new Path2D();
  spar.moveTo(-92, -146); spar.lineTo(30, -158); spar.lineTo(31, -152); spar.lineTo(-91, -140); spar.closePath();
  shaded(c, spar, ['#7c5e40', '#65492f', '#4a3522'], -158, -140);
  const sail = new Path2D();
  sail.moveTo(-82, -142); sail.quadraticCurveTo(-40, -128, 20, -150);
  sail.lineTo(14, -112); sail.lineTo(2, -122); sail.lineTo(-10, -92); sail.lineTo(-30, -108); sail.lineTo(-44, -86); sail.lineTo(-58, -104); sail.lineTo(-74, -92); sail.closePath();
  c.save(); c.globalAlpha = 0.86;
  shaded(c, sail, ['#d8cfb4', '#c2b596', '#a2946f'], -150, -86, () => { fine(c, 0.1); for (let i = 0; i < 6; i++) { c.beginPath(); c.moveTo(-80 + i * 18, -146); c.quadraticCurveTo(-72 + i * 18, -112, -76 + i * 19, -86); c.stroke(); } });
  c.restore();
  const hull = new Path2D();
  hull.moveTo(-150, -62);
  hull.quadraticCurveTo(-130, -74, -92, -72);
  hull.lineTo(58, -80);
  hull.lineTo(78, -112); hull.lineTo(136, -118); hull.lineTo(140, -82);
  hull.quadraticCurveTo(128, -30, 74, 8);
  hull.lineTo(-104, 8);
  hull.quadraticCurveTo(-140, -22, -150, -62);
  hull.closePath();
  shaded(c, hull, ['#7b5a3a', '#624529', '#452f1c', '#2a1d12'], -118, 10, () => {
    fine(c, 0.16);
    for (let i = 1; i < 8; i++) { c.beginPath(); c.moveTo(-152, -70 + i * 11); c.quadraticCurveTo(-10, -66 + i * 14, 146, -106 + i * 15); c.stroke(); }
    fine(c, 0.1);
    for (let i = 0; i < 12; i++) { const x = -136 + i * 24; c.beginPath(); c.moveTo(x, -80); c.lineTo(x + 4, 10); c.stroke(); }
    mossOn(c, [[-96, -6, 58, 26, 0.5], [52, -2, 60, 22, 0.42], [116, -90, 30, 18, 0.34], [-20, -66, 44, 12, 0.26]]);
    const holeP = new Path2D();
    holeP.moveTo(-34, -52); holeP.lineTo(-10, -60); holeP.lineTo(14, -48); holeP.lineTo(6, -30); holeP.lineTo(20, -14); holeP.lineTo(-18, -8); holeP.lineTo(-30, -24); holeP.lineTo(-44, -30); holeP.closePath();
    c.fillStyle = lg(c, 0, -60, 0, -8, [['#0d0a08'], ['#1f1712']]);
    c.fill(holeP);
    c.strokeStyle = 'rgba(255,235,205,.16)'; c.lineWidth = 1; c.stroke(holeP);
  });
  c.strokeStyle = 'rgba(255,238,210,.3)'; c.lineWidth = 1.4;
  c.beginPath(); c.moveTo(-148, -63); c.quadraticCurveTo(-130, -74, -92, -72); c.lineTo(58, -80); c.lineTo(78, -112); c.lineTo(136, -118); c.stroke();
  [[86, -92], [114, -94]].forEach(([x, y]) => {
    c.fillStyle = '#b08a3e'; c.beginPath(); c.arc(x, y, 8, 0, 7); c.fill();
    c.fillStyle = lg(c, 0, y - 6, 0, y + 6, [['#16222a'], ['#2e4b52']]); c.beginPath(); c.arc(x, y, 5.6, 0, 7); c.fill();
    c.fillStyle = 'rgba(255,255,255,.35)'; c.beginPath(); c.arc(x - 2, y - 2, 1.5, 0, 7); c.fill();
  });
  c.restore();
  sandMound(c, sand, 172, 11);
}
/** 보물 상자 — 나무 판자 · 금 띠 · 뚜껑이 열려 금화가 보임 · 폭 약 100 */
function chest2(c, sand) {
  contact(c, 76, 13);
  const gold = (y0, y1) => lg(c, 0, y0, 0, y1, [['#fff0ad'], ['#d8a93f'], ['#a97a22']]);
  const lid = new Path2D();
  lid.moveTo(-48, -54); lid.lineTo(-44, -90); lid.quadraticCurveTo(0, -112, 44, -90); lid.lineTo(48, -54); lid.closePath();
  shaded(c, lid, ['#4f3722', '#3d2a19', '#2c1e12'], -106, -52, () => { fine(c, 0.2); for (let i = -2; i <= 2; i++) { c.beginPath(); c.moveTo(i * 17, -112); c.lineTo(i * 18, -50); c.stroke(); } });
  c.fillStyle = gold(-106, -52); c.fillRect(-35, -100, 8, 48); c.fillRect(27, -100, 8, 48);
  c.strokeStyle = 'rgba(255,238,200,.26)'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(-44, -90); c.quadraticCurveTo(0, -112, 44, -90); c.stroke();
  c.fillStyle = lg(c, 0, -74, 0, -48, [['#fff0ad'], ['#e2b64c'], ['#b98d2e']]);
  c.beginPath(); c.moveTo(-40, -52); c.quadraticCurveTo(-10, -78, 12, -68); c.quadraticCurveTo(30, -76, 42, -52); c.closePath(); c.fill();
  [[-22, -60], [-6, -66], [10, -64], [24, -58], [2, -56], [-14, -54]].forEach(([x, y]) => {
    c.fillStyle = 'rgba(255,248,214,.55)'; c.beginPath(); c.ellipse(x, y, 6, 3.2, -0.2, 0, 7); c.fill();
    c.strokeStyle = 'rgba(120,80,20,.3)'; c.lineWidth = 0.8; c.stroke();
  });
  const box = new Path2D();
  box.roundRect(-48, -56, 96, 60, 4);
  shaded(c, box, WOOD, -56, 6, () => {
    fine(c); for (let i = 1; i < 5; i++) { c.beginPath(); c.moveTo(-50, -56 + i * 12); c.lineTo(50, -56 + i * 12); c.stroke(); }
    mossOn(c, [[-34, 0, 34, 12, 0.34], [30, -2, 26, 10, 0.26]]);
  });
  c.fillStyle = gold(-56, 6); c.fillRect(-36, -56, 9, 62); c.fillRect(27, -56, 9, 62);
  c.fillStyle = lg(c, -48, 0, 48, 0, [['#a97a22'], ['#fff0ad'], ['#b98d2e']]); c.fillRect(-48, -58, 96, 6);
  const lock = new Path2D(); lock.roundRect(-10, -50, 20, 22, 3);
  shaded(c, lock, GOLD, -50, -28, () => { c.fillStyle = 'rgba(40,24,6,.7)'; c.beginPath(); c.arc(0, -41, 2.6, 0, 7); c.fill(); c.fillRect(-1.2, -41, 2.4, 7); });
  sandMound(c, sand, 72, 9);
}
/** 바위 아치 — 울퉁불퉁한 돌 · 구멍 자국 · 이끼 · 폭 약 180 */
function arch2(c, sand) {
  contact(c, 112, 18);
  const p = new Path2D();
  p.moveTo(-92, 6);
  p.bezierCurveTo(-112, -44, -84, -96, -44, -108);
  p.bezierCurveTo(-20, -120, 14, -118, 38, -106);
  p.bezierCurveTo(84, -98, 104, -46, 90, 6);
  p.lineTo(46, 6);
  p.bezierCurveTo(52, -30, 30, -60, 2, -60);
  p.bezierCurveTo(-30, -60, -52, -32, -44, 6);
  p.closePath();
  shaded(c, p, STONE, -118, 8, () => {
    fine(c, 0.15);
    [[-70, -74, -40, -26], [-30, -104, -8, -74], [34, -96, 58, -60], [66, -48, 74, -8], [-82, -30, -60, 0]].forEach(([a, b, d, e]) => { c.beginPath(); c.moveTo(a, b); c.quadraticCurveTo((a + d) / 2 + 8, (b + e) / 2, d, e); c.stroke(); });
    for (let i = 0; i < 26; i++) { c.fillStyle = `rgba(0,0,0,${0.06 + rnd(i) * 0.1})`; c.beginPath(); c.ellipse(-90 + rnd(i + 3) * 180, -112 + rnd(i + 7) * 116, 1.5 + rnd(i + 2) * 4, 1 + rnd(i + 5) * 2.4, 0, 0, 7); c.fill(); }
    mossOn(c, [[-46, -104, 46, 16, 0.5], [34, -108, 40, 13, 0.42], [-90, -8, 38, 20, 0.34], [76, -10, 34, 18, 0.3]]);
  });
  sandMound(c, sand, 110, 11);
}
/** 항아리 — 흙빛 그러데이션 · 띠 · 금 · 폭 약 70 */
function jar2(c, sand) {
  contact(c, 48, 9);
  const p = new Path2D();
  p.moveTo(-15, -84); p.quadraticCurveTo(-16, -72, -24, -66); p.bezierCurveTo(-48, -50, -42, -12, -22, 4); p.lineTo(22, 4);
  p.bezierCurveTo(42, -12, 48, -50, 24, -66); p.quadraticCurveTo(16, -72, 15, -84); p.closePath();
  shaded(c, p, ['#d9976a', '#bf7a4d', '#935733', '#633a21'], -84, 6, () => {
    fine(c, 0.16); [-60, -52, -18].forEach((y) => { c.beginPath(); c.moveTo(-46, y); c.quadraticCurveTo(0, y + 8, 46, y); c.stroke(); });
    c.strokeStyle = 'rgba(30,14,6,.5)'; c.lineWidth = 1; c.beginPath(); c.moveTo(16, -66); c.lineTo(8, -46); c.lineTo(18, -34); c.lineTo(10, -14); c.stroke();
    mossOn(c, [[-26, -4, 26, 12, 0.34]]);
    c.fillStyle = lg(c, -40, 0, 0, 0, [['rgba(255,235,210,0)'], ['rgba(255,235,210,.16)'], ['rgba(255,235,210,0)']]); c.fillRect(-34, -80, 20, 84);
  });
  c.fillStyle = lg(c, -18, 0, 18, 0, [['#9c6240'], ['#d9976a'], ['#7f4d2d']]); c.beginPath(); c.ellipse(0, -84, 18, 5, 0, 0, 7); c.fill();
  c.fillStyle = '#20120a'; c.beginPath(); c.ellipse(0, -84, 12, 3, 0, 0, 7); c.fill();
  sandMound(c, sand, 44, 6);
}
/** 산호 — 가지마다 굵기가 줄고 끝이 밝음 · 높이 약 90 */
function coral2(c, sand, col) {
  contact(c, 52, 9);
  const arm = (x, y, a, l, w, d, seed) => {
    const x2 = x + Math.sin(a) * l;
    const y2 = y - Math.cos(a) * l;
    const mx = (x + x2) / 2 + Math.cos(a) * l * 0.14 * (rnd(seed) - 0.5);
    const my = (y + y2) / 2;
    c.lineCap = 'round';
    c.strokeStyle = col[0]; c.lineWidth = w; c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(mx, my, x2, y2); c.stroke();
    c.strokeStyle = col[1]; c.lineWidth = w * 0.46; c.beginPath(); c.moveTo(x - w * 0.16, y); c.quadraticCurveTo(mx - w * 0.16, my, x2 - w * 0.12, y2); c.stroke();
    if (d < 4) {
      arm(x2, y2, a - 0.34 - rnd(seed + 1) * 0.3, l * 0.76, w * 0.68, d + 1, seed + 3);
      arm(x2, y2, a + 0.3 + rnd(seed + 2) * 0.3, l * 0.72, w * 0.66, d + 1, seed + 7);
    } else { c.fillStyle = col[2]; c.beginPath(); c.arc(x2, y2, Math.max(1.5, w * 0.72), 0, 7); c.fill(); }
  };
  arm(-4, 4, -0.2, 26, 10, 0, 3);
  arm(6, 4, 0.34, 22, 8.5, 1, 11);
  sandMound(c, sand, 36, 5);
}
/** 말미잘 — 짧은 몸통에 촉수가 부채처럼 · 높이 약 70 */
function anemone2(c, sand) {
  contact(c, 46, 8);
  const body = new Path2D();
  body.moveTo(-26, 4); body.quadraticCurveTo(-30, -18, -24, -34); body.lineTo(24, -34); body.quadraticCurveTo(30, -18, 26, 4); body.closePath();
  shaded(c, body, ['#e8a073', '#cf7f58', '#a85f42', '#7c4530'], -34, 6, () => { fine(c, 0.14); for (let i = -3; i <= 3; i++) { c.beginPath(); c.moveTo(i * 8, -36); c.quadraticCurveTo(i * 9, -14, i * 7, 6); c.stroke(); } });
  c.lineCap = 'round';
  for (let i = 0; i < 19; i++) {
    const a = -1.25 + (i / 18) * 2.5;
    const l = 30 + rnd(i + 4) * 14;
    const x = Math.sin(a) * 22;
    const x2 = x + Math.sin(a) * l;
    const y2 = -34 - Math.cos(a) * l;
    c.strokeStyle = i % 2 ? '#f08fae' : '#ffb3c6'; c.lineWidth = 3.4;
    c.beginPath(); c.moveTo(x, -34); c.quadraticCurveTo(x + Math.sin(a) * l * 0.2, y2 + 6, x2, y2); c.stroke();
    c.fillStyle = '#ffe3ea'; c.beginPath(); c.arc(x2, y2, 2.2, 0, 7); c.fill();
  }
  sandMound(c, sand, 34, 5);
}
/** 둥근 돌 — 매끈한 돌 둘 · 폭 약 100 */
function stone2(c, sand) {
  contact(c, 62, 10);
  const big = new Path2D(); big.ellipse(-8, -24, 44, 30, 0, 0, 7);
  const sm = new Path2D(); sm.ellipse(34, -14, 24, 17, 0.2, 0, 7);
  [[big, -56, 6], [sm, -32, 4]].forEach(([p, a, b]) => shaded(c, p, STONE, a, b, () => {
    for (let i = 0; i < 18; i++) { c.fillStyle = `rgba(0,0,0,${0.05 + rnd(i) * 0.08})`; c.beginPath(); c.arc(-50 + rnd(i + 3) * 110, -50 + rnd(i + 7) * 54, 0.8 + rnd(i + 2) * 2, 0, 7); c.fill(); }
    mossOn(c, [[-20, -48, 30, 10, 0.34]]);
  }));
  sandMound(c, sand, 56, 5);
}
/** 불가사리 — 바닥에 납작하게 · 폭 약 74 */
function star2(c, sand) {
  contact(c, 42, 7);
  c.save(); c.translate(0, -8); c.scale(1, 0.56);
  const p = new Path2D();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 ? 13 : 38;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const x = Math.cos(a) * r;
    const y = Math.sin(a) * r;
    if (i) p.lineTo(x, y); else p.moveTo(x, y);
  }
  p.closePath();
  c.lineJoin = 'round'; c.lineWidth = 8; c.strokeStyle = '#d9703a'; c.stroke(p);
  shaded(c, p, ['#f7a35f', '#ee8a47', '#d9703a'], -38, 38, () => { for (let i = 0; i < 44; i++) { const a = rnd(i) * 6.28; const r = rnd(i + 9) * 32; c.fillStyle = 'rgba(255,232,200,.6)'; c.beginPath(); c.arc(Math.cos(a) * r, Math.sin(a) * r, 1.3, 0, 7); c.fill(); } });
  c.restore();
}
/** 조개 — 벌어진 두 껍데기와 진주 · 폭 약 84 */
function clam2(c, sand) {
  contact(c, 52, 8);
  const shell = (flip) => {
    const p = new Path2D();
    p.moveTo(-42, -6); p.bezierCurveTo(-44, flip * 34 - 6, 44, flip * 34 - 6, 42, -6); p.closePath();
    const y0 = flip < 0 ? -44 : -6;
    shaded(c, p, ['#f7d9cd', '#eab9a9', '#cf958a', '#a56e68'], y0, y0 + 38, () => { fine(c, 0.16); for (let i = -4; i <= 4; i++) { c.beginPath(); c.moveTo(0, -6); c.lineTo(i * 12, flip * 34 - 6); c.stroke(); } });
  };
  c.save(); c.translate(0, -6); c.rotate(-0.08);
  shell(-1);
  c.restore();
  c.fillStyle = lg(c, 0, -14, 0, 2, [['#3a2428'], ['#6b4347']]); c.beginPath(); c.ellipse(0, -8, 38, 8, 0, 0, 7); c.fill();
  const g = c.createRadialGradient(-3, -13, 1, 0, -10, 9);
  g.addColorStop(0, '#ffffff'); g.addColorStop(1, '#c9c2d8');
  c.fillStyle = g; c.beginPath(); c.arc(0, -10, 8, 0, 7); c.fill();
  shell(1);
  sandMound(c, sand, 48, 5);
}
/** 닻 — 쇠 그러데이션 · 녹 · 폭 약 90 */
function anchor2(c, sand) {
  contact(c, 56, 9);
  c.save(); c.rotate(0.1);
  const iron = (y0, y1) => lg(c, -12, y0, 12, y1, [['#a9b3bb'], ['#6c7680'], ['#3e464e']]);
  c.lineCap = 'round';
  c.strokeStyle = iron(-110, 0); c.lineWidth = 11; c.beginPath(); c.moveTo(0, -102); c.lineTo(0, -4); c.stroke();
  c.lineWidth = 9; c.beginPath(); c.moveTo(-26, -84); c.lineTo(26, -84); c.stroke();
  c.lineWidth = 7; c.beginPath(); c.arc(0, -112, 10, 0, 7); c.stroke();
  c.lineWidth = 10; c.beginPath(); c.arc(0, -42, 42, 0.18, Math.PI - 0.18); c.stroke();
  c.fillStyle = iron(-30, 0);
  poly(c, [[-46, -38], [-34, -12], [-52, -18]]); c.fill(); poly(c, [[46, -38], [34, -12], [52, -18]]); c.fill();
  c.strokeStyle = 'rgba(255,255,255,.28)'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(-3, -100); c.lineTo(-3, -8); c.stroke();
  for (let i = 0; i < 14; i++) { c.fillStyle = `rgba(140,74,40,${0.2 + rnd(i) * 0.3})`; c.beginPath(); c.ellipse(-8 + rnd(i + 2) * 16, -100 + rnd(i + 3) * 90, 2 + rnd(i + 1) * 3, 1.4, 0, 0, 7); c.fill(); }
  c.restore();
  sandMound(c, sand, 54, 6);
}
/** 잠수부 인형 — 황동 투구 · 천 옷 · 높이 약 120 */
function diver2(c, sand) {
  contact(c, 46, 8);
  const boots = new Path2D(); boots.roundRect(-24, -20, 22, 22, 4); boots.roundRect(2, -20, 22, 22, 4);
  shaded(c, boots, ['#5a5f68', '#454a52', '#2f333a'], -20, 2);
  const suit = new Path2D();
  suit.moveTo(-26, -82); suit.quadraticCurveTo(-34, -46, -24, -18); suit.lineTo(24, -18); suit.quadraticCurveTo(34, -46, 26, -82); suit.closePath();
  shaded(c, suit, ['#d9b56a', '#c39a4e', '#9c7838', '#6e5426'], -84, -16, () => { fine(c, 0.16); for (let i = 0; i < 6; i++) { c.beginPath(); c.moveTo(-34, -76 + i * 11); c.quadraticCurveTo(0, -70 + i * 11, 34, -76 + i * 11); c.stroke(); } });
  const helm = new Path2D(); helm.arc(0, -102, 26, 0, 7);
  shaded(c, helm, GOLD, -128, -76, () => { fine(c, 0.2); c.beginPath(); c.arc(0, -102, 22, 0, 7); c.stroke(); });
  c.fillStyle = lg(c, 0, -116, 0, -90, [['#10242c'], ['#2f5660']]); c.beginPath(); c.arc(0, -102, 14, 0, 7); c.fill();
  c.strokeStyle = '#b98d2e'; c.lineWidth = 3; c.stroke();
  c.fillStyle = 'rgba(255,255,255,.4)'; c.beginPath(); c.arc(-5, -107, 3.4, 0, 7); c.fill();
  sandMound(c, sand, 40, 5);
}
/** 등대 — 흰 빨강 띠 · 불빛 칸 · 높이 약 170 */
function tower2(c, sand) {
  contact(c, 60, 10);
  const rock = new Path2D(); rock.moveTo(-58, 6); rock.quadraticCurveTo(-46, -26, -18, -24); rock.lineTo(18, -24); rock.quadraticCurveTo(46, -26, 58, 6); rock.closePath();
  shaded(c, rock, STONE, -28, 8, () => mossOn(c, [[-30, -8, 26, 12, 0.4]]));
  const body = new Path2D();
  body.moveTo(-24, -20); body.lineTo(-15, -132); body.lineTo(15, -132); body.lineTo(24, -20); body.closePath();
  shaded(c, body, ['#fbf6ec', '#ece4d4', '#cfc6b4', '#a79e8c'], -132, -20, () => {
    c.fillStyle = '#c9423c';
    [[-112, -94], [-74, -56]].forEach(([a, b]) => c.fillRect(-30, a, 60, b - a));
    fine(c, 0.1); for (let y = -128; y < -20; y += 9) { c.beginPath(); c.moveTo(-30, y); c.lineTo(30, y); c.stroke(); }
    c.fillStyle = 'rgba(0,0,0,.24)'; c.fillRect(8, -132, 22, 112);
  });
  c.fillStyle = '#2e3944'; c.fillRect(-20, -136, 40, 5);
  const room = new Path2D(); room.roundRect(-12, -156, 24, 20, 2);
  shaded(c, room, ['#fff3b0', '#ffe07a', '#e9b94a'], -156, -136, () => { fine(c, 0.26); c.beginPath(); c.moveTo(-4, -156); c.lineTo(-4, -136); c.moveTo(4, -156); c.lineTo(4, -136); c.stroke(); });
  const cap = new Path2D(); cap.moveTo(-16, -156); cap.quadraticCurveTo(0, -176, 16, -156); cap.closePath();
  shaded(c, cap, ['#d9544c', '#c9423c', '#9f2f2a'], -172, -156);
  const glow = c.createRadialGradient(0, -146, 2, 0, -146, 44);
  glow.addColorStop(0, 'rgba(255,240,170,.42)'); glow.addColorStop(1, 'rgba(255,240,170,0)');
  c.fillStyle = glow; c.beginPath(); c.arc(0, -146, 44, 0, 7); c.fill();
  sandMound(c, sand, 62, 6);
}
/** 유적 기둥 — 세로 홈 · 하나는 부러짐 · 폭 약 140 */
function pillar2(c, sand) {
  contact(c, 92, 13);
  const col = (x, h, top) => {
    const p = new Path2D(); p.moveTo(x - 17, 4); p.lineTo(x - 14, -h); p.lineTo(x + 14, -h); p.lineTo(x + 17, 4); p.closePath();
    shaded(c, p, ['#e4dcc8', '#cdc4ae', '#a79e88', '#7c7464'], -h, 6, () => {
      fine(c, 0.18); for (let i = -2; i <= 2; i++) { c.beginPath(); c.moveTo(x + i * 6, -h); c.lineTo(x + i * 7, 6); c.stroke(); }
      mossOn(c, [[x - 6, -6, 24, 16, 0.42], [x + 8, -h + 18, 18, 12, 0.3]]);
    });
    if (top) {
      const t = new Path2D(); t.roundRect(x - 24, -h - 12, 48, 13, 2); t.roundRect(x - 19, -h - 2, 38, 5, 1);
      shaded(c, t, ['#e4dcc8', '#cdc4ae', '#a79e88'], -h - 12, -h + 3);
    } else {
      const b = new Path2D(); b.moveTo(x - 14, -h + 1); b.lineTo(x - 7, -h - 10); b.lineTo(x + 1, -h - 3); b.lineTo(x + 8, -h - 12); b.lineTo(x + 14, -h + 1); b.closePath();
      shaded(c, b, ['#d8cfba', '#bcb29c', '#a0967f'], -h - 12, -h + 1);
    }
  };
  col(46, 86, false);
  col(-36, 142, true);
  const fall = new Path2D(); fall.roundRect(4, -16, 66, 22, 3);
  c.save(); c.translate(-8, 2); c.rotate(0.05);
  shaded(c, fall, ['#d8cfba', '#bcb29c', '#8f8672'], -16, 6, () => { fine(c, 0.16); for (let y = -12; y < 6; y += 6) { c.beginPath(); c.moveTo(4, y); c.lineTo(70, y); c.stroke(); } });
  c.restore();
  sandMound(c, sand, 90, 7);
}
/** 바닷속 성 — 돌벽 · 탑 셋 · 깃발 · 폭 약 230 */
function castle2(c, sand) {
  contact(c, 140, 18);
  const bricks = (x0, y0, x1, y1) => {
    fine(c, 0.14);
    for (let y = y0, r = 0; y < y1; y += 11, r++) {
      c.beginPath(); c.moveTo(x0, y); c.lineTo(x1, y); c.stroke();
      for (let x = x0 + (r % 2) * 11; x < x1; x += 22) { c.beginPath(); c.moveTo(x, y); c.lineTo(x, y + 11); c.stroke(); }
    }
  };
  const tower = (x, w, h) => {
    const p = new Path2D();
    p.moveTo(x - w / 2, 6); p.lineTo(x - w / 2, -h);
    for (let i = 0; i < 4; i++) { const a = x - w / 2 + (i * w) / 4; p.lineTo(a, -h - 9); p.lineTo(a + w / 8, -h - 9); p.lineTo(a + w / 8, -h); p.lineTo(a + w / 4, -h); }
    p.lineTo(x + w / 2, -h - 9); p.lineTo(x + w / 2, 6); p.closePath();
    shaded(c, p, ['#b8bcc4', '#979ca6', '#6f747e', '#4a4e57'], -h - 10, 6, () => { bricks(x - w / 2, -h, x + w / 2, 8); mossOn(c, [[x - 6, -6, w * 0.7, 18, 0.44]]); });
    const win = new Path2D(); win.moveTo(x - 5, -h + 42); win.lineTo(x - 5, -h + 24); win.quadraticCurveTo(x, -h + 15, x + 5, -h + 24); win.lineTo(x + 5, -h + 42); win.closePath();
    c.fillStyle = lg(c, 0, -h + 16, 0, -h + 42, [['#20303a'], ['#3e6a78']]); c.fill(win);
  };
  tower(-82, 56, 118);
  tower(82, 56, 104);
  const wall = new Path2D();
  wall.moveTo(-62, 6); wall.lineTo(-62, -74);
  for (let i = 0; i < 8; i++) { const a = -62 + i * 15.5; wall.lineTo(a, -84); wall.lineTo(a + 8, -84); wall.lineTo(a + 8, -74); wall.lineTo(a + 15.5, -74); }
  wall.lineTo(62, 6); wall.closePath();
  shaded(c, wall, ['#b8bcc4', '#979ca6', '#6f747e', '#4a4e57'], -84, 6, () => { bricks(-62, -74, 62, 8); mossOn(c, [[-24, -2, 50, 16, 0.4], [34, -2, 40, 14, 0.36]]); });
  const gate = new Path2D(); gate.moveTo(-20, 6); gate.lineTo(-20, -34); gate.quadraticCurveTo(0, -56, 20, -34); gate.lineTo(20, 6); gate.closePath();
  c.fillStyle = lg(c, 0, -52, 0, 6, [['#1a1410'], ['#33261b']]); c.fill(gate);
  c.strokeStyle = 'rgba(255,240,210,.2)'; c.lineWidth = 1; c.stroke(gate);
  fine(c, 0.5); for (let x = -14; x <= 14; x += 7) { c.beginPath(); c.moveTo(x, -44); c.lineTo(x, 6); c.stroke(); }
  tower(0, 50, 150);
  c.strokeStyle = '#59443a'; c.lineWidth = 2.4; c.beginPath(); c.moveTo(0, -158); c.lineTo(0, -192); c.stroke();
  const flag = new Path2D(); flag.moveTo(1, -192); flag.quadraticCurveTo(14, -186, 28, -190); flag.lineTo(26, -176); flag.quadraticCurveTo(14, -172, 1, -178); flag.closePath();
  shaded(c, flag, ['#d9544c', '#c9423c', '#9f2f2a'], -192, -172);
  sandMound(c, sand, 130, 9);
}
/** 달 바위 — 구멍이 파인 회색 덩어리 · 폭 약 120 */
function moon2(c, sand) {
  contact(c, 74, 11);
  const p = new Path2D();
  p.moveTo(-64, 6); p.bezierCurveTo(-72, -36, -30, -66, 6, -62); p.bezierCurveTo(44, -60, 74, -30, 62, 6); p.closePath();
  shaded(c, p, ['#c6c4d0', '#a5a3b1', '#7a7888', '#55535f'], -66, 8, () => {
    [[-28, -34, 15], [20, -42, 10], [30, -14, 13], [-4, -14, 7], [-46, -12, 8]].forEach(([x, y, r]) => {
      c.fillStyle = lg(c, 0, y - r, 0, y + r, [['rgba(0,0,0,.34)'], ['rgba(255,255,255,.14)']]);
      c.beginPath(); c.ellipse(x, y, r, r * 0.74, 0, 0, 7); c.fill();
      c.strokeStyle = 'rgba(255,255,255,.2)'; c.lineWidth = 0.9; c.stroke();
    });
  });
  sandMound(c, sand, 64, 6);
}
/** 작은 로켓 — 기운 채 바닥에 박힘 · 창 · 날개 · 높이 약 170 */
function rocket2(c, sand) {
  contact(c, 62, 10);
  c.save(); c.rotate(0.16);
  const fin = (s) => { const f = new Path2D(); f.moveTo(s * 18, -66); f.quadraticCurveTo(s * 46, -40, s * 44, -8); f.lineTo(s * 18, -30); f.closePath(); shaded(c, f, ['#e0544c', '#c9423c', '#942a26'], -66, -6); };
  fin(-1); fin(1);
  const body = new Path2D();
  body.moveTo(-20, -14); body.bezierCurveTo(-30, -70, -18, -130, 0, -166); body.bezierCurveTo(18, -130, 30, -70, 20, -14); body.closePath();
  shaded(c, body, ['#ffffff', '#e8ecf2', '#c6ccd6', '#98a0ad'], -166, -12, () => {
    c.fillStyle = '#c9423c'; c.fillRect(-34, -166, 68, 40);
    c.fillStyle = lg(c, -30, 0, 30, 0, [['rgba(0,0,0,0)'], ['rgba(0,0,0,0)'], ['rgba(0,0,0,.2)']]); c.fillRect(-34, -170, 68, 160);
    fine(c, 0.16); [-126, -54, -30].forEach((y) => { c.beginPath(); c.moveTo(-34, y); c.lineTo(34, y); c.stroke(); });
  });
  c.fillStyle = '#b98d2e'; c.beginPath(); c.arc(0, -98, 13, 0, 7); c.fill();
  c.fillStyle = lg(c, 0, -108, 0, -88, [['#12303c'], ['#3f7f92']]); c.beginPath(); c.arc(0, -98, 9.5, 0, 7); c.fill();
  c.fillStyle = 'rgba(255,255,255,.45)'; c.beginPath(); c.arc(-3, -102, 2.4, 0, 7); c.fill();
  c.restore();
  sandMound(c, sand, 56, 7);
}
/** 그림 이름 → 그리기 · k 칸 크기에 곱할 값 */
const DRAW = {
  wreck: [wreck2, 1], chest: [chest2, 1.2], arch: [arch2, 1], jar: [jar2, 1.1], tower: [tower2, 1], pillar: [pillar2, 1], castle: [castle2, 1],
  diver: [diver2, 1.1], anchor: [anchor2, 1.05], stone: [stone2, 1.1], star: [star2, 1.2], clam: [clam2, 1.2], moon: [moon2, 1.1], rocket: [rocket2, 1], anemone: [anemone2, 1.2],
  coral: [(c, s) => coral2(c, s, ['#c8413f', '#f07a62', '#ffc0a6']), 1.1],
  coralpink: [(c, s) => coral2(c, s, ['#c9558f', '#ee8fbd', '#ffd3e6']), 1.1],
  coralblue: [(c, s) => coral2(c, s, ['#2f6fbf', '#6aa8e8', '#cfe6ff']), 1.1],
};
const SWAY = { weed: { h: 0.36, kelp: false }, kelp: { h: 0.5, kelp: true } };
/** 그림이 있나 (시험용) */
export const artReady = (art) => !!(DRAW[art] || SWAY[art]);
export const lookReady = (key) => !!(LOOK[key] && WATER[key] && SAND[key] && FRAME[key]);

// ───────────── 장식 칸 — 큰 것 하나 · 작은 것 둘이 어긋나게 ─────────────
// [u 왼쪽→오른쪽(물 폭의 몫), d 깊이, 큰 칸] — 세 칸을 한 무리로, 앞뒤와 간격을 일부러 다르게 잡는다
const WIDE_SLOTS = [[0.36, 0.42, 1], [0.6, 0.1, 0], [0.7, 0.66, 0], [0.8, 0.84, 1], [0.48, 0.86, 0], [0.26, 0.82, 0], [0.86, 0.26, 0], [0.2, 0.18, 0], [0.56, 0.42, 0], [0.12, 0.6, 0], [0.92, 0.6, 0], [0.62, 0.84, 1], [0.36, 0.14, 0], [0.74, 0.14, 0], [0.44, 0.62, 0], [0.9, 0.84, 0], [0.08, 0.86, 0], [0.3, 0.6, 0]];
const SLOTS = {
  ruin: [[0.39, 0.46, 1], [0.62, 0.12, 0], [0.75, 0.74, 0]],
  plain: [[0.65, 0.6, 1], [0.43, 0.16, 0], [0.33, 0.8, 0], [0.84, 0.3, 0], [0.22, 0.42, 0]],
};
export const slotsOf = (tank) => (SLOTS[tank.key] || WIDE_SLOTS).slice(0, tank.deco).map(([u, d, big]) => ({ u, d, big: !!big }));

// ───────────── 겹 그리기 ─────────────
function lump(c, x, base, w, h, seed, fill) {
  c.fillStyle = fill;
  c.beginPath(); c.moveTo(x - w / 2, base);
  const n = 7;
  for (let i = 0; i <= n; i++) {
    const p = i / n;
    const px = x - w / 2 + w * p;
    const py = base - Math.sin(p * Math.PI) ** 0.7 * h * (0.82 + rnd(seed + i) * 0.3);
    c.lineTo(px, py);
  }
  c.lineTo(x + w / 2, base); c.closePath(); c.fill();
}
function shard(c, x, base, w, h, lean, fill) {
  c.fillStyle = fill;
  poly(c, [[x - w / 2, base], [x - w * 0.3 + lean, base - h * 0.74], [x + lean, base - h], [x + w * 0.34 + lean, base - h * 0.66], [x + w / 2, base]]); c.fill();
}
function bank(c, key, iw, ih, d, tone, seed) {
  const [a, b] = SAND[key];
  const top = floorAt(d, ih);
  c.fillStyle = lg(c, 0, top - 6, 0, ih, [[mixc(a, b, tone)], [mixc(b, '#000000', 0.18 + tone * 0.1)]]);
  c.beginPath(); c.moveTo(0, top + 8);
  for (let i = 0; i <= 14; i++) c.lineTo((iw * i) / 14, top + Math.sin(i * 1.15 + seed) * ih * 0.012 + Math.sin(i * 0.5 + seed * 2) * ih * 0.016);
  c.lineTo(iw, ih); c.lineTo(0, ih); c.closePath(); c.fill();
  c.save(); c.clip();
  c.strokeStyle = 'rgba(255,255,255,.08)'; c.lineWidth = 0.8;
  for (let i = 0; i < 9; i++) { const y = top + 6 + i * (ih - top) / 9; c.beginPath(); c.moveTo(0, y); for (let k = 0; k <= 8; k++) c.lineTo((iw * k) / 8, y + Math.sin(k * 1.4 + i + seed) * 1.6); c.stroke(); }
  for (let i = 0; i < 60; i++) { c.fillStyle = `rgba(0,0,0,${0.05 + rnd(i + seed) * 0.08})`; c.beginPath(); c.ellipse(rnd(i * 3 + seed) * iw, top + rnd(i * 5 + seed) * (ih - top), 1 + rnd(i + 1) * 2.6, 0.7 + rnd(i + 4) * 1.2, 0, 0, 7); c.fill(); }
  c.restore();
}
/** 먼 풍경 — 단계마다 다르게 · 뒤 겹에서 흐려진다 */
function farScene(c, key, iw, ih, base, far, far2) {
  if (key === 'ruin') {
    c.save(); c.translate(iw * 0.74, base); c.rotate(0.28); c.fillStyle = far; c.fillRect(-9, -ih * 0.46, 18, ih * 0.5); c.restore();
    c.save(); c.translate(iw * 0.66, base); c.rotate(-0.2); c.fillStyle = far2; c.fillRect(-7, -ih * 0.36, 14, ih * 0.4); c.restore();
    lump(c, iw * 0.22, base, iw * 0.34, ih * 0.2, 4, far);
    lump(c, iw * 0.5, base, iw * 0.26, ih * 0.12, 9, far2);
  } else if (key === 'iron') {
    c.fillStyle = far;
    [0.24, 0.62].forEach((u) => { c.fillRect(iw * u - 8, base - ih * 0.5, 16, ih * 0.52); });
    c.fillRect(iw * 0.16, base - ih * 0.46, iw * 0.56, 12);
    c.fillStyle = far2; c.fillRect(iw * 0.78, base - ih * 0.38, 20, ih * 0.4); c.fillRect(iw * 0.4, base - ih * 0.24, iw * 0.42, 15);
    lump(c, iw * 0.46, base, iw * 0.3, ih * 0.12, 3, far2);
  } else if (key === 'emerald' || key === 'diamond') {
    [[0.18, 0.1, 0.42, 6], [0.3, 0.07, 0.3, -5], [0.62, 0.09, 0.5, 8], [0.74, 0.07, 0.34, -7], [0.86, 0.08, 0.4, 3], [0.46, 0.06, 0.24, 4]].forEach(([u, w, h, l], i) => shard(c, iw * u, base, iw * w, ih * h, l, i % 2 ? far2 : far));
  } else if (key === 'gold') {
    [0.2, 0.34, 0.66, 0.8].forEach((u, i) => {
      const w = iw * 0.034;
      const h = ih * (0.5 - (i % 2) * 0.1);
      c.fillStyle = i % 2 ? far2 : far;
      c.fillRect(iw * u - w / 2, base - h, w, h);
      c.fillRect(iw * u - w * 0.8, base - h - 6, w * 1.6, 7);
    });
    c.strokeStyle = far2; c.lineWidth = iw * 0.016; c.beginPath(); c.arc(iw * 0.27, base - ih * 0.5, iw * 0.07, Math.PI, 0); c.stroke();
    lump(c, iw * 0.5, base, iw * 0.3, ih * 0.14, 3, far);
    lump(c, iw * 0.9, base, iw * 0.24, ih * 0.2, 12, far);
  } else if (key === 'ultra') {
    [[0.2, 0.05, 0.5], [0.3, 0.04, 0.38], [0.68, 0.05, 0.54], [0.8, 0.04, 0.42]].forEach(([u, w, h], i) => { c.fillStyle = i % 2 ? far2 : far; rr(c, iw * u, base - ih * h, iw * w, ih * h, [iw * 0.025, iw * 0.025, 0, 0]); c.fill(); });
    c.strokeStyle = far2; c.lineWidth = iw * 0.012; c.beginPath(); c.ellipse(iw * 0.5, base, iw * 0.2, ih * 0.34, 0, Math.PI, 0); c.stroke();
  } else if (key === 'space') {
    lump(c, iw * 0.24, base, iw * 0.4, ih * 0.16, 3, far);
    lump(c, iw * 0.7, base, iw * 0.5, ih * 0.2, 8, far2);
  } else {
    lump(c, iw * 0.28, base, iw * 0.4, ih * 0.22, 2, far);
    lump(c, iw * 0.72, base, iw * 0.46, ih * 0.28, 7, far);
    lump(c, iw * 0.5, base, iw * 0.3, ih * 0.14, 5, far2);
  }
}
/** 뒤 겹 — 물 · 빛 웅덩이 · 먼 풍경 · 먼 바닥 · 물빛 안개 (불투명 한 장) */
function backLayer(key, iw, ih) {
  const L = layer(iw, ih);
  const c = L.c;
  const look = LOOK[key];
  const [a, b] = WATER_HEX[key];
  if (key === 'space') { spaceBack(c, 0, 0, iw, ih); c.fillStyle = lg(c, 0, 0, 0, ih, [[WATER.space[0]], [WATER.space[1]]]); } else c.fillStyle = lg(c, 0, 0, 0, ih, [[a], [b]]);
  c.fillRect(0, 0, iw, ih);
  const pool = c.createRadialGradient(iw / 2, -ih * 0.08, 8, iw / 2, -ih * 0.08, iw * 0.72);
  pool.addColorStop(0, `${look.pool}.3)`);
  pool.addColorStop(1, `${look.pool}0)`);
  c.fillStyle = pool; c.fillRect(0, 0, iw, ih);
  const far = mixc(b, '#0a1a22', 0.2);
  const far2 = mixc(b, '#0a1a22', 0.08);
  const baseY = floorAt(1, ih) + 8;
  const F = layer(iw, ih); // 먼 것은 따로 그려 흐린 뒤 얹는다 — 경계가 또렷하면 앞으로 튀어나와 보인다
  farScene(F.c, key, iw, ih, baseY, far, far2);
  c.drawImage(softened(F.cv, iw, ih, 0.3).cv, 0, 0, iw, ih);
  bank(c, key, iw, ih, 1, 0.1, 1);
  const fog = midWater(key).replace(',1)', ',');
  const fogK = key === 'space' ? 0.4 : 1; // 우주는 별이 보여야 한다
  c.fillStyle = lg(c, 0, 0, 0, ih, [[`${fog}${0.26 * fogK})`, 0], [`${fog}${0.7 * fogK})`, 0.62], [`${fog}${0.44 * fogK})`, 1]]);
  c.fillRect(0, 0, iw, ih);
  return L;
}
/** 가운데 겹 — 가운데·앞 바닥 + 장식 (투명 한 장) · 뒤쪽 장식은 안개를 입힌다 · placed = [{ art, u, d, s }] */
function midLayer(key, iw, ih, placed, k) {
  const L = layer(iw, ih);
  const c = L.c;
  bank(c, key, iw, ih, 0.56, 0.42, 3);
  const items = placed.filter((p) => DRAW[p.art]).sort((a, b) => b.d - a.d);
  const sandAt = (d) => { const [a, b] = SAND[key]; const t = 0.1 + (1 - d) * 0.6; return [mixc(a, b, t), mixc(b, '#000000', 0.2)]; };
  const T = items.length ? layer(iw, ih) : null;
  const fog = midWater(key);
  const paintItem = (p) => {
    const t = T.c;
    t.save();
    t.setTransform(1, 0, 0, 1, 0, 0);
    t.globalCompositeOperation = 'source-over';
    t.clearRect(0, 0, T.cv.width, T.cv.height);
    t.restore();
    t.save();
    t.translate(iw * p.u, floorAt(p.d, ih) + 2);
    const s = p.s * DRAW[p.art][1] * k * (0.68 + (1 - p.d) * 0.44);
    t.scale(s, s);
    DRAW[p.art][0](t, sandAt(p.d));
    t.restore();
    if (p.d > 0.3) {
      t.save();
      t.globalCompositeOperation = 'source-atop';
      t.fillStyle = fog.replace(',1)', `,${Math.min(0.5, (p.d - 0.3) * 0.72)})`);
      t.fillRect(0, 0, iw, ih);
      t.restore();
    }
    c.drawImage(T.cv, 0, 0, iw, ih);
  };
  items.filter((p) => p.d >= 0.5).forEach(paintItem);
  bank(c, key, iw, ih, 0.1, 0.8, 5);
  items.filter((p) => p.d < 0.5).forEach(paintItem);
  return L;
}
function bladeDark(c, x, y, h, w, lean) {
  c.beginPath(); c.moveTo(x - w, y);
  c.quadraticCurveTo(x - w + lean * 0.5, y - h * 0.6, x + lean, y - h);
  c.quadraticCurveTo(x + w + lean * 0.4, y - h * 0.5, x + w, y);
  c.closePath(); c.fill();
}
/** 앞 겹 — 가장자리에만 두는 어두운 실루엣 + 폐가의 금 간 유리 (투명 한 장) · 가운데는 비운다 */
function frontLayer(key, iw, ih) {
  const L = layer(iw, ih);
  const c = L.c;
  const dark = mixc(WATER_HEX[key][1], '#03080d', 0.74);
  const dark2 = mixc(WATER_HEX[key][1], '#03080d', 0.68);
  const lw = iw * EDGE_L;
  const rw = iw * EDGE_R;
  c.fillStyle = dark;
  if (key === 'ruin') {
    [[0.02, 0.44, 0.34], [0.09, 0.3, 0.16], [0.13, 0.22, -0.2]].forEach(([u, h, a]) => { c.save(); c.translate(iw * u, ih + 4); c.rotate(a); c.fillStyle = dark; c.fillRect(-iw * 0.016, -ih * h, iw * 0.032, ih * h); c.restore(); });
    lump(c, lw * 0.34, ih + 2, lw * 1.2, ih * 0.2, 6, dark);
    c.strokeStyle = dark; c.lineCap = 'round';
    [[0.97, 0.56, -0.05], [0.93, 0.4, -0.05], [0.9, 0.26, 0.05]].forEach(([u, h, l]) => { c.lineWidth = iw * 0.012; c.beginPath(); c.moveTo(iw * u, ih + 2); c.lineTo(iw * (u + l * 0.5), ih * (1 - h * 0.6)); c.lineTo(iw * (u + l), ih * (1 - h)); c.stroke(); });
    lump(c, iw - rw * 0.4, ih + 2, rw * 1.1, ih * 0.14, 8, dark);
  } else if (key === 'gold') {
    const fan = (x, y, a, l, w, d) => {
      const x2 = x + Math.sin(a) * l;
      const y2 = y - Math.cos(a) * l;
      c.strokeStyle = dark; c.lineCap = 'round'; c.lineWidth = w; c.beginPath(); c.moveTo(x, y); c.lineTo(x2, y2); c.stroke();
      if (d < 4) { fan(x2, y2, a - 0.42, l * 0.76, w * 0.7, d + 1); fan(x2, y2, a + 0.38, l * 0.72, w * 0.7, d + 1); }
    };
    fan(lw * 0.3, ih + 2, 0.12, ih * 0.15, iw * 0.014, 0);
    lump(c, lw * 0.3, ih + 2, lw * 1.2, ih * 0.15, 3, dark);
    for (let i = 0; i < 5; i++) { c.fillStyle = i % 2 ? dark : dark2; bladeDark(c, iw - rw * (0.12 + i * 0.17), ih + 2, ih * (0.62 - i * 0.08), iw * 0.012, -iw * (0.006 + i * 0.003)); }
    lump(c, iw - rw * 0.4, ih + 2, rw * 1.1, ih * 0.13, 5, dark);
  } else if (key === 'iron') {
    // 반쯤 묻힌 톱니바퀴와 배관
    const gx = lw * 0.36;
    const gy = ih + 6;
    const R = lw * 0.74;
    c.beginPath();
    for (let i = 0; i < 24; i++) { const a = (i / 24) * 6.283; const r = i % 2 ? R : R * 0.82; if (i) c.lineTo(gx + Math.cos(a) * r, gy + Math.sin(a) * r); else c.moveTo(gx + Math.cos(a) * r, gy + Math.sin(a) * r); }
    c.closePath(); c.fill();
    c.fillStyle = dark2; c.beginPath(); c.arc(gx, gy, R * 0.32, 0, 7); c.fill();
    c.fillStyle = dark; c.fillRect(iw - rw * 0.62, ih * 0.34, rw * 0.3, ih * 0.68);
    c.fillStyle = dark2; c.fillRect(iw - rw * 0.74, ih * 0.5, rw * 0.54, ih * 0.05);
    lump(c, iw - rw * 0.4, ih + 2, rw * 1.1, ih * 0.14, 8, dark);
  } else if (key === 'emerald' || key === 'diamond') {
    [[0.03, 0.09, 0.44, 8], [0.09, 0.08, 0.3, -5], [0.14, 0.05, 0.18, 2]].forEach(([u, w, h, l], i) => shard(c, iw * u, ih + 4, iw * w, ih * h, l, i % 2 ? dark2 : dark));
    [[0.97, 0.07, 0.56, -5], [0.92, 0.06, 0.36, 4], [0.89, 0.03, 0.2, 1]].forEach(([u, w, h, l], i) => shard(c, iw * u, ih + 4, iw * w, ih * h, l, i % 2 ? dark2 : dark));
  } else if (key === 'space') {
    lump(c, lw * 0.32, ih + 2, lw * 1.2, ih * 0.24, 5, dark);
    lump(c, lw * 0.74, ih + 2, lw * 0.5, ih * 0.11, 9, dark2);
    lump(c, iw - rw * 0.42, ih + 2, rw * 1.1, ih * 0.3, 3, dark);
    c.fillStyle = dark2; c.fillRect(iw - rw * 0.46, ih * 0.5, 3, ih * 0.3);
    c.beginPath(); c.arc(iw - rw * 0.46 + 1.5, ih * 0.5, 7, 0, 7); c.fill();
  } else {
    lump(c, lw * 0.3, ih + 2, lw * 1.1, ih * 0.26, 2, dark);
    lump(c, lw * 0.72, ih + 2, lw * 0.6, ih * 0.13, 7, dark2);
    for (let i = 0; i < 6; i++) { c.fillStyle = i % 2 ? dark : dark2; bladeDark(c, iw - rw * (0.1 + i * 0.13), ih + 2, ih * (0.6 - i * 0.07), iw * 0.012, -iw * (0.004 + i * 0.004)); }
    lump(c, iw - rw * 0.34, ih + 2, rw * 0.9, ih * 0.1, 4, dark);
  }
  c.clearRect(lw, 0, iw - lw - rw, ih); // 가운데는 비운다 — 실루엣이 조금 넘어와도 지움
  // 앞 겹 윗선에 물빛이 살짝 — 덩어리가 납작해 보이지 않게
  c.globalCompositeOperation = 'source-atop';
  c.fillStyle = lg(c, 0, ih * 0.4, 0, ih, [[LOOK[key].rim], ['rgba(0,0,0,0)']]);
  c.fillRect(0, 0, iw, ih);
  c.globalCompositeOperation = 'source-over';
  // 금 간 유리와 물때 — 물고기 앞에 와야 해서 폐가만 이 겹에
  if (key === 'ruin') {
    for (let i = 0; i < 18; i++) {
      const g = c.createRadialGradient(0, 0, 1, 0, 0, 40);
      g.addColorStop(0, 'rgba(76,96,50,.24)'); g.addColorStop(1, 'rgba(76,96,50,0)');
      const e = rnd(i) > 0.5;
      const x = e ? rnd(i + 2) * iw * 0.2 : iw - rnd(i + 2) * iw * 0.2;
      c.save(); c.translate(x, rnd(i + 5) * ih); c.scale(0.8 + rnd(i + 3), 0.5 + rnd(i + 7)); c.fillStyle = g; c.beginPath(); c.arc(0, 0, 40, 0, 7); c.fill(); c.restore();
    }
    c.strokeStyle = 'rgba(240,245,240,.55)'; c.lineWidth = 1.3;
    const cx = iw * 0.78; const cy = ih * 0.26;
    [[-60, -30], [52, -36], [40, 60], [-28, 66], [72, 14]].forEach(([dx, dy]) => { c.beginPath(); c.moveTo(cx, cy); c.lineTo(cx + dx * 0.55, cy + dy * 0.4); c.lineTo(cx + dx, cy + dy); c.stroke(); });
  }
  return L;
}
/** 물속 빛 — 경계 없는 빛줄기 한 장 + 물 위쪽 띠 + 유리 반사 */
function raysLayer(key, iw, ih) {
  const R = layer(iw, ih);
  const c = R.c;
  const look = LOOK[key];
  const tint = look.ray;
  const n = look.rays;
  for (let i = 0; i < n; i++) {
    const x = iw * ((i + 0.5) / n);
    const sp = look.lean === 'fan' ? (x - iw / 2) * 0.5 : ih * look.lean;
    const w = iw * (0.05 + rnd(i + 3) * 0.05);
    c.fillStyle = lg(c, 0, 0, 0, ih * 0.92, [[`${tint}.2)`], [`${tint}0)`]]);
    poly(c, [[x - w * 0.4, 0], [x + w * 0.4, 0], [x + sp + w * 1.5, ih * 0.92], [x + sp - w * 1.5, ih * 0.92]]); c.fill();
  }
  const soft = softened(R.cv, iw, ih, 0.045);
  const d = soft.c;
  d.fillStyle = lg(d, 0, 0, 0, ih * 0.05, [[`${tint}.2)`], [`${tint}0)`]]);
  d.fillRect(0, 0, iw, ih * 0.05);
  d.fillStyle = 'rgba(255,255,255,.05)';
  poly(d, [[iw * 0.2, 0], [iw * 0.29, 0], [iw * 0.15, ih], [iw * 0.06, ih]]); d.fill();
  return soft;
}

// ───────────── 물고기 ─────────────
const DEPTH = {
  back: { k: 0.6, top: 0.1, low: 0.6, tint: 0.46, ax: [0.38, 0.45], sp: 0.5 },
  mid: { k: 0.9, top: 0.14, low: 0.7, tint: 0.08, ax: [0.28, 0.4], sp: 0.72 },
  front: { k: 1.24, top: 0.26, low: 0.78, tint: 0, ax: [0.16, 0.27], sp: 1 },
};
const ORDER = ['mid', 'back', 'front', 'back', 'mid', 'mid', 'back', 'front', 'mid', 'back'];
/** 앱 drawFish로 다섯 꼬리 모습을 한 번씩 찍어 둔다 — 장면마다는 붙이기만 */
function sprites(key, L, tint, fog) {
  const w = Math.ceil(L * 1.72 + 14);
  const h = Math.ceil(L * 1.28 + 14);
  const frames = WAGS.map((wag) => {
    const cv = document.createElement('canvas');
    cv.width = Math.ceil(w * SC);
    cv.height = Math.ceil(h * SC);
    const c = cv.getContext('2d');
    drawFish(c, key, cv.width / 2, cv.height / 2, L * SC, { wag });
    if (tint) {
      c.globalCompositeOperation = 'source-atop';
      c.fillStyle = fog.replace(',1)', `,${tint})`);
      c.fillRect(0, 0, cv.width, cv.height);
    }
    return cv;
  });
  return { frames, w, h };
}
/** 물고기 바꾸기 — keys 수조 차례 · nameOf(key) 이름 · 같은 모습은 찍어 둔 것을 쓴다 */
export function setFish(s, keys, nameOf = (k) => k) {
  const { iw, ih } = s.in;
  const base = Math.max(40, Math.min(92, iw / (5 + s.tank.fish * 0.17)));
  const fog = midWater(s.tank.key);
  const count = { back: 0, mid: 0, front: 0 };
  const used = new Map();
  s.fish = keys.map((key, i) => {
    const flat = !!(LOOKS[key] && LOOKS[key].flat); // 가자미 무리는 바닥에 눕는다 — 몸을 뒤집으면 눈 방향이 틀린다(좌광우도)
    const where = flat ? 'mid' : ORDER[i % ORDER.length];
    const D = DEPTH[where];
    const no = count[where]++;
    const L = Math.round(base * D.k * (0.86 + rnd(i + 21) * 0.28));
    const u = (no * 0.618 + 0.17 + i * 0.03) % 1;
    const axF = D.ax[0] + rnd(i + 2) * (D.ax[1] - D.ax[0]);
    const id = `${key}|${where}|${L}`;
    const spr = s.sprites.get(id) || sprites(key, L, D.tint, fog);
    used.set(id, spr);
    return {
      i, key, ko: nameOf(key), where, L, flat, spr,
      y: flat ? floorAt(0.42, ih) - L * 0.14 : ih * (D.top + (D.low - D.top) * u),
      cx: iw * (flat ? 0.3 + rnd(i + 5) * 0.4 : 0.5 + (rnd(i + 8) - 0.5) * (1 - axF * 2) * 0.9),
      ax: flat ? 8 : iw * axF,
      w: (flat ? 0.08 : 0.16 + rnd(i + 3) * 0.14) * D.sp,
      ph: rnd(i + 11) * 6.28,
      bob: flat ? 0 : 7 * D.k,
      wag: 4 + rnd(i + 6) * 3,
    };
  });
  s.sprites = used; // 뺀 물고기 그림은 버린다
  s.picked = null;
}
function pose(f, t, ix, iy) {
  const a = t * f.w + f.ph;
  const cos = Math.cos(a);
  return { x: ix + f.cx + f.ax * Math.sin(a), y: iy + f.y + Math.sin(t * 0.6 + f.ph * 3) * f.bob, right: cos > 0, turn: f.flat ? 1 : Math.min(1, Math.abs(cos) * 3.2 + 0.22) };
}
function swim(c, s, where, t) {
  const { ix, iy } = s.in;
  for (const f of s.fish) {
    if (f.where !== where) continue;
    const p = pose(f, t, ix, iy);
    const k = Math.min(4, Math.floor(((Math.sin(t * f.wag + f.ph) + 1) / 2) * 5));
    const { frames, w, h } = f.spr;
    c.save();
    c.translate(p.x, p.y);
    if (!f.flat) c.scale(p.right ? -p.turn : p.turn, 1);
    c.drawImage(frames[k], -w / 2, -h / 2, w, h);
    c.restore();
  }
}
function weedDraw(c, wd, s, t) {
  const { ix, iy, iw, ih } = s.in;
  const x0 = ix + iw * wd.u;
  const y0 = iy + floorAt(wd.d, ih) + 3;
  const H = ih * wd.h;
  for (let b = 0; b < 4; b++) {
    c.fillStyle = wd.col[b % 3];
    const r = wd.w * (1 - b * 0.1) * 0.62; // 뿌리 쪽 반폭 — 끝으로 갈수록 뾰족하게
    const ox = (b - 1.5) * wd.w * 1.5;
    const hb = H * (1 - b * 0.12);
    const sw = Math.sin(t * 0.9 + wd.ph + b * 0.7) * hb * 0.09;
    const x1 = x0 + ox;
    c.beginPath(); c.moveTo(x1 - r, y0);
    c.bezierCurveTo(x1 - sw * 0.6 - r, y0 - hb * 0.4, x1 + sw * 1.2 - r * 0.7, y0 - hb * 0.7, x1 + sw * 2, y0 - hb);
    c.bezierCurveTo(x1 + sw * 1.2 + r * 0.7, y0 - hb * 0.7, x1 - sw * 0.6 + r, y0 - hb * 0.4, x1 + r, y0);
    c.closePath(); c.fill();
  }
}
/** 방바닥 물결 무늬 두 장 — 부드러운 납작한 빛 덩어리 */
function rippleSheet(key, seed) {
  const R = layer(AQ_W, 70);
  const c = R.c;
  const col = mixc(WATER_HEX[key][0], WATER_HEX[key][1], 0.3, 0.2);
  for (let i = 0; i < 34; i++) {
    const x = rnd(i * 3 + seed) * AQ_W;
    const y = 16 + rnd(i * 5 + seed) * 50;
    const rx = 18 + rnd(i + seed) * 40;
    c.fillStyle = col;
    c.beginPath(); c.ellipse(x, y, rx, rx * 0.09, 0, 0, 7); c.fill();
  }
  const S = softened(R.cv, AQ_W, 70, 0.14);
  // 위쪽은 벽과 닿는 곳이라 스르르 사라지게
  S.c.globalCompositeOperation = 'destination-in';
  S.c.fillStyle = lg(S.c, 0, 0, 0, 70, [['rgba(0,0,0,0)', 0], ['rgba(0,0,0,1)', 0.5], ['rgba(0,0,0,.8)', 1]]);
  S.c.fillRect(0, 0, AQ_W, 70);
  return S;
}

// ───────────── 방 (한 번만) ─────────────
function baseLayer(tank, b, photo) {
  const key = tank.key;
  const look = LOOK[key];
  const room = layer(AQ_W, AQ_H);
  paintRoom(room.c, key);
  const L = softened(room.cv, AQ_W, AQ_H, 0.12);
  const c = L.c;
  c.fillStyle = look.dim; c.fillRect(0, 0, AQ_W, AQ_H);
  const cx = AQ_W / 2;
  const cy = b.y + b.h * 0.5;
  const [wa, wb] = WATER_HEX[key];
  // 수조에서 멀어질수록 어둡게
  const vg = c.createRadialGradient(cx, cy, b.w * 0.42, cx, cy, AQ_W * 0.72);
  vg.addColorStop(0, 'rgba(4,6,12,0)');
  vg.addColorStop(1, 'rgba(4,6,12,.62)');
  c.fillStyle = vg; c.fillRect(0, 0, AQ_W, AQ_H);
  c.globalCompositeOperation = 'lighter';
  // 벽에 번지는 물빛
  const wall = c.createRadialGradient(cx, cy, b.w * 0.2, cx, cy, b.w * 0.92);
  wall.addColorStop(0, mixc(wa, wb, 0.3, key === 'ruin' ? 0.26 : 0.42));
  wall.addColorStop(1, mixc(wa, wb, 0.3, 0));
  c.fillStyle = wall; c.fillRect(0, 0, AQ_W, AQ_H);
  // 수조 위 조명
  const topY = look.top > 0 ? look.top : look.half < 1 ? b.y + look.top : look.top;
  const G = layer(AQ_W, AQ_H);
  const cone = G.c.createLinearGradient(0, topY, 0, b.y + 12);
  cone.addColorStop(0, `rgba(${look.lamp},${look.cone[0]})`);
  cone.addColorStop(1, `rgba(${look.lamp},${look.cone[1]})`);
  G.c.fillStyle = cone;
  const half = look.half < 1 ? b.w * look.half : look.half;
  poly(G.c, [[cx - half, topY], [cx + half, topY], [b.x + b.w * 0.92, b.y + 12], [b.x + b.w * 0.08, b.y + 12]]); G.c.fill();
  c.drawImage(softened(G.cv, AQ_W, AQ_H, 0.05).cv, 0, 0, AQ_W, AQ_H); // 경계 없는 조명
  // 방바닥에 번지는 물빛
  const fy = AQ_H - 40;
  const fg = c.createRadialGradient(0, 0, 4, 0, 0, b.w * 0.82);
  fg.addColorStop(0, mixc(wa, wb, 0.2, key === 'ruin' ? 0.3 : 0.5));
  fg.addColorStop(1, mixc(wa, wb, 0.2, 0));
  c.save(); c.translate(cx, fy); c.scale(1, 0.14); c.fillStyle = fg; c.beginPath(); c.arc(0, 0, b.w * 0.82, 0, 7); c.fill(); c.restore();
  c.globalCompositeOperation = 'source-over';
  // 받침 그늘 → 재질 틀(또렷하게) → 받침은 방 쪽으로 어둡게
  c.save(); c.translate(cx, AQ_H - 8); c.scale(1, 0.09);
  const sh = c.createRadialGradient(0, 0, b.w * 0.3, 0, 0, b.w * 0.62);
  sh.addColorStop(0, 'rgba(0,0,0,.55)'); sh.addColorStop(1, 'rgba(0,0,0,0)');
  c.fillStyle = sh; c.beginPath(); c.arc(0, 0, b.w * 0.62, 0, 7); c.fill(); c.restore();
  drawFrame(c, tank, b, 0);
  c.fillStyle = lg(c, 0, b.bottom, 0, AQ_H, [['rgba(5,8,14,.2)'], ['rgba(5,8,14,.62)']]);
  const inset = key === 'plain' ? 10 : 0; // 일반은 받침이 틀보다 좁다 — 방바닥까지 어둡게 하지 않게
  c.fillRect(b.x + inset, b.bottom, b.w - inset * 2, AQ_H - b.bottom);
  c.globalCompositeOperation = 'lighter';
  c.fillStyle = lg(c, 0, b.y, 0, b.y + b.f, [[`rgba(${look.lamp},.2)`], [`rgba(${look.lamp},0)`]]);
  c.fillRect(b.x, b.y, b.w, b.f);
  c.globalCompositeOperation = 'source-over';
  if (key === 'ruin') { // 켜진 전구
    c.strokeStyle = '#0c0a0e'; c.lineWidth = 2; c.beginPath(); c.moveTo(cx, 0); c.lineTo(cx, 60); c.stroke();
    const bulb = c.createRadialGradient(cx, 70, 2, cx, 70, 46);
    bulb.addColorStop(0, 'rgba(255,226,160,.85)'); bulb.addColorStop(1, 'rgba(255,226,160,0)');
    c.fillStyle = bulb; c.beginPath(); c.arc(cx, 70, 46, 0, 7); c.fill();
    c.fillStyle = '#ffe9b8'; c.beginPath(); c.arc(cx, 70, 8, 0, 7); c.fill();
  }
  if (photo) photoFrame(c, 16, 14);
  return L;
}
/** 📸 어름치 사진 액자 — 천연기념물이라 수조 대신 벽에 */
function photoFrame(c, x, y) {
  c.fillStyle = 'rgba(0,0,0,.3)'; c.fillRect(x + 3, y + 4, 92, 64);
  c.fillStyle = lg(c, x, y, x + 92, y + 64, [['#b98d2e'], ['#7f5f1e']]); c.fillRect(x, y, 92, 64);
  c.fillStyle = lg(c, 0, y + 6, 0, y + 58, [['#bfe4ef'], ['#6fb3c6']]); c.fillRect(x + 6, y + 6, 80, 52);
  drawFish(c, 'eoreumchi', x + 46, y + 32, 62, {});
}

/** 그림이 시작되는 높이 — 가운데 겹의 위쪽 빈 물은 붙이지 않는다 (작게 줄여 한 번만 잰다) */
function topOf(cv, ih) {
  const w = 48;
  const h = 96;
  const t = document.createElement('canvas');
  t.width = w; t.height = h;
  const c = t.getContext('2d', { willReadFrequently: true });
  c.drawImage(cv, 0, 0, w, h);
  let d = null;
  try { d = c.getImageData(0, 0, w, h).data; } catch { return 0; } // 못 재면 통째로 붙인다
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (d[(y * w + x) * 4 + 3] > 0) return Math.max(0, Math.floor(((y - 1) / h) * ih * SC) / SC);
  return ih;
}
/** 한 단계 장면 — 무거운 일은 여기서 한 번만 · 물고기는 setFish · 장식은 setDeco */
export function makeScene(tank, { photo = false } = {}) {
  const b = tankBox(tank);
  // 물 칸을 픽셀에 맞춘다 — 그려 둔 그림을 늘이지 않고 그대로 붙여야 빠르고 또렷하다
  const ix = Math.floor((b.x + b.f) * SC) / SC;
  const iy = Math.floor((b.y + b.f) * SC) / SC;
  const iw = Math.ceil((b.x + b.w - b.f) * SC) / SC - ix;
  const ih = Math.ceil((b.y + b.h - b.f) * SC) / SC - iy;
  const key = tank.key;
  const lw = Math.ceil(iw * EDGE_L * SC) / SC;
  const rw = Math.ceil(iw * EDGE_R * SC) / SC;
  const s = {
    tank, box: b, in: { ix, iy, iw, ih }, slots: slotsOf(tank),
    base: baseLayer(tank, b, photo),
    back: backLayer(key, iw, ih),
    front: frontLayer(key, iw, ih),
    strips: key === 'ruin' ? null : [[0, lw], [iw - rw, rw]], // 앞 겹은 가장자리뿐이라 그 띠만 붙인다 (폐가는 유리 금이 가운데에 있어 통째로)
    rays: raysLayer(key, iw, ih),
    ripple: [rippleSheet(key, 3), rippleSheet(key, 41)],
    sprites: new Map(),
    fish: [],
    picked: null,
    mid: null, midTop: 0, weedsBack: [], weedsFront: [],
  };
  setDeco(s, []);
  return s;
}
/** 장식 바꾸기 — arts = 칸마다 그림 이름 또는 '' (aquarium.js의 art) */
export function setDeco(s, arts) {
  const { iw, ih } = s.in;
  const tank = s.tank;
  const key = tank.key;
  const k = 0.5 + tank.size * 0.62;
  const look = LOOK[key];
  const placed = [];
  const sway = [];
  arts.forEach((art, i) => {
    const q = s.slots[i];
    if (!q || !art) return;
    if (SWAY[art]) sway.push({ u: q.u, d: q.d, h: SWAY[art].h * (q.big ? 1.25 : 1), ph: i * 1.3 + 1, kelp: SWAY[art].kelp });
    else placed.push({ art, u: q.u, d: q.d, s: q.big ? 1 : 0.68 });
  });
  s.mid = midLayer(key, iw, ih, placed, k);
  s.midTop = topOf(s.mid.cv, ih);
  const weeds = [...look.base.map(([u, d, h], i) => ({ u, d, h, ph: i * 2.1, kelp: false })), ...sway].map((wd) => {
    const col = wd.kelp ? ['#6b6a2e', '#8a8638', '#4f5224'] : look.weeds;
    return { ...wd, w: (5.4 - wd.d * 2) * (0.7 + tank.size * 0.5) * (wd.kelp ? 1.7 : 1), col: wd.d > 0.6 ? col.map((x) => hexOf(mixc(x, hexOf(midWater(key)), 0.4))) : col };
  });
  s.weedsBack = weeds.filter((wd) => wd.d >= 0.6);
  s.weedsFront = weeds.filter((wd) => wd.d < 0.6);
}
/** 방과 틀을 한 번 깐다 — 장면을 바꿀 때만 */
export function resetScene(s, c) {
  c.drawImage(s.base.cv, 0, 0, AQ_W, AQ_H);
}
/** 장면 한 번 — 물 안쪽과 방바닥 양옆만 다시 칠한다 · opts.slots 칸 보기 · opts.sel 고른 칸 */
export function drawScene(s, c, t, opts = {}) {
  const { ix, iy, iw, ih } = s.in;
  const b = s.box;
  // 방바닥 물빛 (받침 양옆)
  const gy = AQ_H - 72;
  [[0, b.x - 2], [b.x + b.w + 2, AQ_W - b.x - b.w - 2]].forEach(([x, w]) => {
    if (w <= 1) return;
    c.drawImage(s.base.cv, x * SC, gy * SC, w * SC, 72 * SC, x, gy, w, 72);
    c.globalCompositeOperation = 'lighter';
    const a = 0.5 + Math.sin(t * 0.8) * 0.5;
    c.globalAlpha = a; c.drawImage(s.ripple[0].cv, x * SC, 0, w * SC, 70 * SC, x, gy, w, 70);
    c.globalAlpha = 1 - a; c.drawImage(s.ripple[1].cv, x * SC, 0, w * SC, 70 * SC, x, gy, w, 70);
    c.globalAlpha = 1;
    c.globalCompositeOperation = 'source-over';
  });
  c.drawImage(s.back.cv, ix, iy, iw, ih);
  c.save();
  c.beginPath(); c.rect(ix, iy, iw, ih); c.clip();
  swim(c, s, 'back', t);
  const ty = s.midTop;
  if (ty < ih) c.drawImage(s.mid.cv, 0, ty * SC, iw * SC, (ih - ty) * SC, ix, iy + ty, iw, ih - ty);
  s.weedsBack.forEach((wd) => weedDraw(c, wd, s, t));
  swim(c, s, 'mid', t);
  s.weedsFront.forEach((wd) => weedDraw(c, wd, s, t));
  swim(c, s, 'front', t);
  c.globalCompositeOperation = 'lighter';
  c.globalAlpha = 0.62 + Math.sin(t * 0.35) * 0.24; // 한 장을 천천히 흔든다 — 두 장을 겹치면 큰 그림을 한 번 더 붙여야 한다
  c.drawImage(s.rays.cv, ix + Math.round(Math.sin(t * 0.21) * 7 * SC) / SC, iy, iw, ih);
  c.globalAlpha = 1;
  c.globalCompositeOperation = 'source-over';
  c.lineWidth = 1.2;
  for (let i = 0; i < 9; i++) {
    const p = (t * (0.07 + rnd(i) * 0.07) + rnd(i + 3)) % 1;
    c.strokeStyle = `rgba(255,255,255,${0.5 * (1 - p)})`;
    c.beginPath(); c.arc(ix + iw * (0.2 + rnd(i + 5) * 0.6) + Math.sin(p * 8 + i) * 5, iy + ih * (0.9 - p * 0.9), 1.6 + rnd(i + 8) * 3, 0, 7); c.stroke();
  }
  if (s.strips) s.strips.forEach(([x, w]) => c.drawImage(s.front.cv, x * SC, 0, w * SC, ih * SC, ix + x, iy, w, ih));
  else c.drawImage(s.front.cv, ix, iy, iw, ih);
  if (opts.slots) drawSlots(c, s, opts.sel);
  if (s.picked) drawPick(c, s, t);
  c.restore();
}
/** 칸 타원 크기 */
const slotR = (q) => (q.big ? 58 : 34) * (0.68 + (1 - q.d) * 0.44);
function drawSlots(c, s, sel) {
  const { ix, iy, iw, ih } = s.in;
  c.save();
  c.lineWidth = 2;
  s.slots.forEach((q, i) => {
    const x = ix + iw * q.u;
    const y = iy + floorAt(q.d, ih);
    const rx = slotR(q);
    const on = i === sel;
    c.setLineDash(on ? [] : [6, 5]);
    c.strokeStyle = on ? '#ffd24a' : q.big ? 'rgba(255,214,110,.95)' : 'rgba(255,255,255,.92)';
    c.fillStyle = on ? 'rgba(255,210,74,.3)' : 'rgba(255,255,255,.1)';
    c.beginPath(); c.ellipse(x, y, rx, rx * 0.36, 0, 0, 7); c.fill(); c.stroke();
  });
  c.restore();
}
function drawPick(c, s, t) {
  const f = s.picked;
  const p = pose(f, t, s.in.ix, s.in.iy);
  c.save();
  c.strokeStyle = '#fff'; c.lineWidth = 2; c.setLineDash([5, 4]);
  c.beginPath(); c.ellipse(p.x, p.y, Math.max(24, f.L * 0.62), Math.max(18, f.L * 0.4), 0, 0, 7); c.stroke();
  c.restore();
}
/** 눌러 본 물고기 — 앞 겹 실루엣은 보지 않으므로 가장자리 물고기도 눌린다 · 앞 → 뒤 차례 */
export function fishAt(s, x, y, t) {
  const { ix, iy } = s.in;
  for (const where of ['front', 'mid', 'back']) {
    for (const f of s.fish) {
      if (f.where !== where) continue;
      const p = pose(f, t, ix, iy);
      const rx = Math.max(26, f.L * 0.62);
      const ry = Math.max(20, f.L * 0.4);
      if (((x - p.x) / rx) ** 2 + ((y - p.y) / ry) ** 2 <= 1) return f;
    }
  }
  return null;
}
/** 눌러 본 장식 칸 — 없으면 -1 · 겹치면 가까운 칸 */
export function slotAt(s, x, y) {
  const { ix, iy, iw, ih } = s.in;
  let best = -1;
  let dist = Infinity;
  s.slots.forEach((q, i) => {
    const r = Math.max(30, slotR(q));
    const dx = (x - (ix + iw * q.u)) / r;
    const dy = (y - (iy + floorAt(q.d, ih))) / (r * 0.7);
    const e = dx * dx + dy * dy;
    if (e <= 1.4 && e < dist) { dist = e; best = i; }
  });
  return best;
}
/** 가게 그림 — 그림 하나를 작은 캔버스에 */
export function decoThumb(cv, art) {
  const c = cv.getContext('2d');
  const w = cv.width;
  const h = cv.height;
  c.clearRect(0, 0, w, h);
  const sand = ['#e9dfc8', '#c9b995'];
  c.save();
  c.translate(w / 2, h * 0.88);
  if (SWAY[art]) {
    const col = SWAY[art].kelp ? ['#6b6a2e', '#8a8638', '#4f5224'] : ['#2e8f58', '#3fae6c', '#247a4a'];
    for (let b = 0; b < 4; b++) {
      c.fillStyle = col[b % 3];
      const ox = (b - 1.5) * w * 0.09;
      const hb = h * 0.78 * (1 - b * 0.1);
      const r = w * (SWAY[art].kelp ? 0.05 : 0.03);
      c.beginPath(); c.moveTo(ox - r, 0);
      c.quadraticCurveTo(ox - r + 4, -hb * 0.5, ox + (b % 2 ? 5 : -5), -hb);
      c.quadraticCurveTo(ox + r + 4, -hb * 0.5, ox + r, 0);
      c.closePath(); c.fill();
    }
  } else if (DRAW[art]) {
    const tall = { wreck: 210, castle: 210, tower: 190, rocket: 190, pillar: 170, arch: 130, diver: 140, anchor: 130, chest: 120 }[art] || 110;
    const wide = { wreck: 320, castle: 300, arch: 220, pillar: 190, moon: 150, stone: 130 }[art] || 130;
    const k = Math.min((h * 0.84) / tall, (w * 0.94) / wide);
    c.scale(k, k);
    DRAW[art][0](c, sand);
  }
  c.restore();
}
