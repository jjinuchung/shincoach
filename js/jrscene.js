// 🎒 대여행 장면 그림 (v375) — 구역 배경 여섯 · 받침대 · 기술 효과 조각 · 그림판 돌리기
// 그림 파일 없이 캔버스에 직접 그린다(시안 .context/v374/scene_preview.html에서 옮김 — 아버님 「추천대로」)
// 장면 차례는 journey.ZONES와 같다(산·숲·바다·화산·하늘·우주) · init(rng)은 0~1 자리라 크기와 상관없고 paint(c, w, h, t, S)는 매 장면
// 움직이는 그림판은 makeStage 하나가 지금 화면 것만 돌린다(새 화면은 set으로 바꿔 끼움) · 「동작 줄이기」면 한 장면만 그리고 멈춘다
// 배틀 흐름(기다리는 시간)은 journeyview가 타이머로 정한다 — 효과는 보이기만 하고 흐름을 붙잡지 않는다(화면이 숨어 그림판이 멈춰도 배틀은 이어 간다)

const TAU = Math.PI * 2;
const wrap01 = (v) => ((v % 1) + 1) % 1;
const lerp = (a, b, k) => a + (b - a) * k;
const rgba = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;

/** 씨앗 고정 난수 — 같은 씨앗이면 같은 산·같은 별 (화면을 다시 그려도 배경이 바뀌지 않게) */
export function seeded(seed) {
  let x = (seed >>> 0) || 1;
  return () => { x ^= x << 13; x ^= x >>> 17; x ^= x << 5; return (x >>> 0) / 4294967296; };
}

// ───────── 그리기 도구 ─────────
function vgrad(c, y0, y1, stops) { const g = c.createLinearGradient(0, y0, 0, y1); for (const [o, col] of stops) g.addColorStop(o, col); return g; }
function glow(c, x, y, r, col, a = 1) { if (!(r > 0)) return; const g = c.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, rgba(col, a)); g.addColorStop(1, rgba(col, 0)); c.fillStyle = g; c.fillRect(x - r, y - r, r * 2, r * 2); }
function circle(c, x, y, r) { c.beginPath(); c.arc(x, y, Math.max(0, r), 0, TAU); c.fill(); }
function ellipse(c, x, y, rx, ry) { c.beginPath(); c.ellipse(x, y, Math.max(0, rx), Math.max(0, ry), 0, 0, TAU); c.fill(); }
const PUFF = [[-1, 0, 0.5], [-0.45, -0.32, 0.58], [0.2, -0.42, 0.66], [0.8, -0.14, 0.52], [1.25, 0.06, 0.4], [0.1, 0.08, 0.5]];
function cloud(c, x, y, s, top = '#ffffff', bottom = '#e2edf9') {
  c.fillStyle = vgrad(c, y - s * 1.1, y + s * 0.55, [[0, top], [1, bottom]]);
  c.beginPath();
  for (const [dx, dy, r] of PUFF) { c.moveTo(x + dx * s + r * s, y + dy * s); c.arc(x + dx * s, y + dy * s, Math.max(0, r * s), 0, TAU); }
  c.fill();
}
function makeRidge(r, n, top, low) {
  const pts = [];
  for (let i = 0; i <= n; i++) pts.push([-0.05 + i * (1.1 / n) + (r() - 0.5) * 0.03, i % 2 === 0 ? top + r() * (low - top) * 0.55 : low - r() * (low - top) * 0.25]);
  return pts;
}
function ridgePath(c, w, h, pts) { c.beginPath(); c.moveTo(0, h); for (const [x, y] of pts) c.lineTo(x * w, y * h); c.lineTo(w, h); c.closePath(); }
function ridge(c, w, h, pts, fill) { ridgePath(c, w, h, pts); c.fillStyle = fill; c.fill(); }
function snow(c, w, h, pts, line) {
  c.save(); ridgePath(c, w, h, pts); c.clip();
  c.beginPath(); c.moveTo(0, 0); c.lineTo(w, 0);
  const n = 40;
  for (let i = n; i >= 0; i--) c.lineTo(i / n * w, (line + (i % 2 ? 0.018 : 0)) * h);
  c.closePath(); c.fillStyle = '#f7fbff'; c.fill(); c.restore();
}
function pine(c, x, y, s, col) {
  c.fillStyle = '#4a3523'; c.fillRect(x - s * 0.05, y - s * 0.22, s * 0.1, s * 0.22);
  c.fillStyle = col;
  for (let k = 0; k < 3; k++) { const base = y - s * (0.18 + k * 0.24); const hw = s * (0.3 - k * 0.07); c.beginPath(); c.moveTo(x, base - s * 0.38); c.lineTo(x + hw, base); c.lineTo(x - hw, base); c.closePath(); c.fill(); }
}
const hy = (x, y0, a, f, p) => y0 + a * Math.sin(x * f * TAU + p);
function hill(c, w, h, y0, a, f, p, fill) { c.beginPath(); c.moveTo(0, h); for (let i = 0; i <= 48; i++) { const x = i / 48; c.lineTo(x * w, hy(x, y0, a, f, p) * h); } c.lineTo(w, h); c.closePath(); c.fillStyle = fill; c.fill(); }
function bird(c, x, y, s, flap, col) {
  const wy = Math.sin(flap) * s * 0.45;
  c.strokeStyle = col; c.lineWidth = Math.max(1, s * 0.16); c.lineCap = 'round';
  c.beginPath(); c.moveTo(x - s, y - wy); c.quadraticCurveTo(x - s * 0.45, y - s * 0.35 - wy * 0.4, x, y); c.quadraticCurveTo(x + s * 0.45, y - s * 0.35 - wy * 0.4, x + s, y - wy); c.stroke();
}
function palm(c, x, y, s) {
  c.strokeStyle = '#2f5d47'; c.lineWidth = Math.max(1, s * 0.08); c.lineCap = 'round';
  c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + s * 0.15, y - s * 0.5, x + s * 0.05, y - s); c.stroke();
  c.fillStyle = '#2f6b4f';
  for (let k = 0; k < 5; k++) { const a = -Math.PI / 2 + (k - 2) * 0.65; c.beginPath(); c.ellipse(x + s * 0.05 + Math.cos(a) * s * 0.28, y - s * 0.92 + Math.sin(a) * s * 0.12, Math.max(0, s * 0.3), Math.max(0, s * 0.07), a, 0, TAU); c.fill(); }
}
function starPath(c, s) { c.beginPath(); for (let i = 0; i < 10; i++) { const r = i % 2 ? s * 0.45 : s, a = -Math.PI / 2 + i * Math.PI / 5; if (i) c.lineTo(Math.cos(a) * r, Math.sin(a) * r); else c.moveTo(Math.cos(a) * r, Math.sin(a) * r); } c.closePath(); }

// ───────── 구역 그림 여섯 (journey.ZONES 차례 — key가 같아야 한다) ─────────
export const SCENES = [
  { key: 'mount', ko: '산', what: '눈 덮인 먼 산과 소나무 언덕',
    init(r) { return {
      far: makeRidge(r, 10, 0.14, 0.4), mid: makeRidge(r, 8, 0.3, 0.5),
      clouds: [0, 1, 2].map(() => ({ x: r(), y: 0.07 + r() * 0.14, s: 0.05 + r() * 0.035, v: 0.004 + r() * 0.006 })),
      pines: Array.from({ length: 16 }, () => ({ x: r(), s: 0.07 + r() * 0.07 })).sort((a, b) => a.s - b.s),
      birds: [0, 1, 2].map(() => ({ x: r(), y: 0.1 + r() * 0.14, v: 0.015 + r() * 0.012, p: r() * 6 })),
      tufts: Array.from({ length: 34 }, () => ({ x: r(), y: 0.8 + r() * 0.18, p: r() * 6 })),
    }; },
    paint(c, w, h, t, S) {
      c.fillStyle = vgrad(c, 0, h * 0.6, [[0, '#6fbcf1'], [1, '#e2f4ff']]); c.fillRect(0, 0, w, h);
      glow(c, w * 0.82, h * 0.16, h * 0.26, [255, 244, 200], 0.85); c.fillStyle = '#fff7d9'; circle(c, w * 0.82, h * 0.16, h * 0.055);
      for (const k of S.clouds) cloud(c, wrap01(k.x + t * k.v) * w * 1.3 - w * 0.15, k.y * h, k.s * h * 1.5);
      ridge(c, w, h, S.far, '#a7bfdf'); snow(c, w, h, S.far, 0.24);
      ridge(c, w, h, S.mid, '#7ba48f');
      hill(c, w, h, 0.62, 0.03, 1.2, 0.7, '#5e9c49');
      for (const p of S.pines) pine(c, p.x * w, hy(p.x, 0.62, 0.03, 1.2, 0.7) * h + h * 0.03, p.s * h, '#2e6838');
      hill(c, w, h, 0.76, 0.014, 0.7, 2.1, vgrad(c, h * 0.7, h, [[0, '#93cd5f'], [1, '#6aa944']]));
      c.strokeStyle = '#4f8f34'; c.lineWidth = Math.max(1, h * 0.004); c.lineCap = 'round';
      for (const g of S.tufts) {
        const x = g.x * w, y = g.y * h;
        if (y < hy(g.x, 0.76, 0.014, 0.7, 2.1) * h + 4) continue;
        const sw = Math.sin(t * 1.6 + g.p) * h * 0.008;
        c.beginPath(); c.moveTo(x, y); c.lineTo(x - h * 0.008 + sw, y - h * 0.028); c.moveTo(x, y); c.lineTo(x + h * 0.006 + sw, y - h * 0.022); c.stroke();
      }
      for (const b of S.birds) bird(c, wrap01(b.x + t * b.v) * w * 1.2 - w * 0.1, (b.y + Math.sin(t * 0.7 + b.p) * 0.01) * h, h * 0.018, t * 7 + b.p, '#3b4a63');
    } },
  { key: 'forest', ko: '숲', what: '나뭇잎 사이 햇살과 반딧불',
    init(r) { return {
      far: Array.from({ length: 14 }, () => ({ x: r(), w: 0.015 + r() * 0.02 })),
      canopy: Array.from({ length: 18 }, () => ({ x: r(), y: 0.02 + r() * 0.22, r: 0.07 + r() * 0.07 })),
      rays: [0.12, 0.34, 0.56, 0.78].map((x) => ({ x: x + (r() - 0.5) * 0.08, p: r() * 6, w: 0.04 + r() * 0.04 })),
      flies: Array.from({ length: 24 }, () => ({ x: r(), y: 0.3 + r() * 0.6, p: r() * 6, q: r() * 6 })),
      leaves: Array.from({ length: 6 }, () => ({ x: r(), v: 0.025 + r() * 0.02, p: r() * 6, o: r() })),
      shrooms: Array.from({ length: 5 }, () => ({ x: 0.08 + r() * 0.84, s: 0.022 + r() * 0.018, d: r() })),
      ferns: Array.from({ length: 12 }, () => ({ x: r(), s: 0.05 + r() * 0.05 })),
    }; },
    paint(c, w, h, t, S) {
      c.fillStyle = vgrad(c, 0, h, [[0, '#dcf0b4'], [0.55, '#9cc874'], [1, '#5f9440']]); c.fillRect(0, 0, w, h);
      c.fillStyle = 'rgba(110,150,90,.55)'; for (const f of S.far) c.fillRect(f.x * w, h * 0.05, f.w * w, h * 0.75);
      c.fillStyle = '#8fbf6f'; for (const k of S.canopy) circle(c, k.x * w, (k.y + 0.12) * h, k.r * h * 1.2);
      for (const ray of S.rays) {
        const a = 0.16 + 0.1 * Math.sin(t * 0.6 + ray.p), x0 = ray.x * w;
        c.fillStyle = vgrad(c, 0, h * 0.85, [[0, `rgba(255,252,220,${a.toFixed(3)})`], [1, 'rgba(255,252,220,0)']]);
        c.beginPath(); c.moveTo(x0, 0); c.lineTo(x0 + ray.w * w, 0); c.lineTo(x0 + ray.w * w * 2.6 + w * 0.18, h * 0.85); c.lineTo(x0 + w * 0.18, h * 0.85); c.closePath(); c.fill();
      }
      c.fillStyle = '#4c8a3a'; for (const k of S.canopy) circle(c, k.x * w + w * 0.03, k.y * h, k.r * h);
      hill(c, w, h, 0.78, 0.012, 0.9, 1.3, vgrad(c, h * 0.74, h, [[0, '#5e9a3c'], [1, '#3f7428']]));
      for (const [x, tw] of [[0.03, 0.085], [0.965, 0.1]]) {
        c.fillStyle = '#5b3f2a'; c.fillRect((x - tw / 2) * w, 0, tw * w, h * 0.86);
        c.fillStyle = 'rgba(0,0,0,.18)'; c.fillRect((x + tw / 6) * w, 0, tw * w / 3, h * 0.86);
      }
      c.fillStyle = '#2e6230'; for (let i = 0; i < 9; i++) circle(c, (i / 8) * w, h * (0.02 + (i % 2) * 0.05), h * 0.12);
      c.strokeStyle = '#2f6a2a'; c.lineWidth = Math.max(1, h * 0.006); c.lineCap = 'round';
      for (const f of S.ferns) { const x = f.x * w, y = h * 0.98, s = f.s * h; for (let k = -2; k <= 2; k++) { c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + k * s * 0.25, y - s * 0.9, x + k * s * 0.55, y - s * (0.6 + 0.1 * Math.abs(k))); c.stroke(); } }
      for (const m of S.shrooms) {
        const x = m.x * w, y = h * (0.9 + m.d * 0.07), s = m.s * h;
        c.fillStyle = '#f3ead6'; c.fillRect(x - s * 0.18, y - s * 0.7, s * 0.36, s * 0.7);
        c.fillStyle = '#e0463b'; c.beginPath(); c.ellipse(x, y - s * 0.7, Math.max(0, s * 0.6), Math.max(0, s * 0.42), 0, Math.PI, TAU); c.fill();
        c.fillStyle = '#ffffff'; circle(c, x - s * 0.22, y - s * 0.88, s * 0.08); circle(c, x + s * 0.18, y - s * 0.95, s * 0.07); circle(c, x + s * 0.02, y - s * 0.78, s * 0.06);
      }
      c.globalCompositeOperation = 'lighter';
      for (const f of S.flies) { const x = (f.x + Math.sin(t * 0.35 + f.p) * 0.03) * w, y = (f.y + Math.cos(t * 0.42 + f.q) * 0.025) * h; glow(c, x, y, h * 0.022, [255, 246, 160], 0.35 + 0.4 * (0.5 + 0.5 * Math.sin(t * 2.2 + f.p * 3))); }
      c.globalCompositeOperation = 'source-over';
      for (const l of S.leaves) {
        const ph = wrap01(l.o + t * l.v);
        c.save(); c.translate((l.x + Math.sin(ph * 9 + l.p) * 0.04) * w, ph * h * 1.1 - h * 0.05); c.rotate(Math.sin(t * 2 + l.p) * 1.2);
        c.fillStyle = '#d6b23c'; ellipse(c, 0, 0, h * 0.014, h * 0.007); c.restore();
      }
    } },
  { key: 'sea', ko: '바다', what: '반짝이는 물결과 모래사장',
    init(r) { return {
      clouds: [0, 1].map(() => ({ x: r(), y: 0.08 + r() * 0.12, s: 0.04 + r() * 0.03, v: 0.003 + r() * 0.004 })),
      glints: Array.from({ length: 46 }, () => ({ k: r(), y: r(), p: r() * 6 })),
      gulls: [0, 1].map(() => ({ x: r(), y: 0.12 + r() * 0.12, v: 0.02 + r() * 0.01, p: r() * 6 })),
      shells: Array.from({ length: 6 }, () => ({ x: r(), y: 0.89 + r() * 0.09, star: r() < 0.4 })),
    }; },
    paint(c, w, h, t, S) {
      const hz = 0.46;
      c.fillStyle = vgrad(c, 0, h * hz, [[0, '#5fb6ee'], [1, '#d6f0ff']]); c.fillRect(0, 0, w, h * hz + 1);
      glow(c, w * 0.76, h * 0.18, h * 0.25, [255, 245, 205], 0.8); c.fillStyle = '#fff8dc'; circle(c, w * 0.76, h * 0.18, h * 0.05);
      for (const k of S.clouds) cloud(c, wrap01(k.x + t * k.v) * w * 1.3 - w * 0.15, k.y * h, k.s * h * 1.5);
      c.fillStyle = '#3d8a6c'; c.beginPath(); c.ellipse(w * 0.18, h * hz, Math.max(0, w * 0.1), Math.max(0, h * 0.045), 0, Math.PI, TAU); c.fill();
      palm(c, w * 0.2, h * (hz - 0.035), h * 0.1);
      c.fillStyle = vgrad(c, h * hz, h * 0.82, [[0, '#3aa3df'], [1, '#1766ad']]); c.fillRect(0, h * hz, w, h * (1 - hz));
      c.fillStyle = '#fffbe6';
      for (const g of S.glints) {
        const y = hz + 0.02 + g.y * 0.3, spread = 0.02 + (y - hz) * 0.45, x = 0.76 + (g.k - 0.5) * spread * 2, a = Math.sin(t * 2.4 + g.p);
        if (a < 0.3) continue;
        c.globalAlpha = a * 0.9; c.fillRect(x * w - h * 0.012, y * h, h * 0.024, Math.max(1, h * 0.004));
      }
      c.globalAlpha = 1;
      c.strokeStyle = 'rgba(190,235,255,.55)'; c.lineWidth = Math.max(1, h * 0.005);
      for (let i = 0; i < 7; i++) {
        const y0 = hz + 0.035 + i * 0.045, amp = 0.004 + i * 0.0015, f = 10 - i, dir = i % 2 ? 1 : -1;
        c.beginPath();
        for (let k = 0; k <= 60; k++) { const x = k / 60, y = y0 + amp * Math.sin(x * f * TAU + t * dir * (0.8 + i * 0.1)); if (k) c.lineTo(x * w, y * h); else c.moveTo(x * w, y * h); }
        c.stroke();
      }
      const surf = 0.8 + Math.sin(t * 0.9) * 0.012;
      const shore = (x) => surf + 0.02 * Math.sin(x * 2.2 * TAU + 0.8);
      const band = (fn, fill) => { c.beginPath(); c.moveTo(0, h); for (let k = 0; k <= 48; k++) { const x = k / 48; c.lineTo(x * w, fn(x) * h); } c.lineTo(w, h); c.closePath(); c.fillStyle = fill; c.fill(); };
      band((x) => shore(x) - 0.012, 'rgba(255,255,255,.9)');
      band(shore, '#d6b877');
      band((x) => 0.845 + 0.018 * Math.sin(x * 2.2 * TAU + 0.8), vgrad(c, h * 0.82, h, [[0, '#f5e0a8'], [1, '#e6c47c']]));
      for (const s of S.shells) {
        const x = s.x * w, y = s.y * h, r = h * 0.014;
        if (s.star) { c.fillStyle = '#f08a5d'; c.save(); c.translate(x, y); starPath(c, r * 1.4); c.fill(); c.restore(); } else { c.fillStyle = '#fbeee0'; c.beginPath(); c.ellipse(x, y, Math.max(0, r * 1.1), Math.max(0, r * 0.8), 0, Math.PI, TAU); c.fill(); }
      }
      for (const b of S.gulls) bird(c, wrap01(b.x + t * b.v) * w * 1.2 - w * 0.1, (b.y + Math.sin(t * 0.8 + b.p) * 0.012) * h, h * 0.02, t * 6 + b.p, '#5a6b80');
    } },
  { key: 'volcano', ko: '화산', what: '흘러내리는 용암과 떠오르는 불씨',
    init(r) { return {
      far: makeRidge(r, 9, 0.42, 0.62),
      embers: Array.from({ length: 40 }, () => ({ x: r(), o: r(), v: 0.05 + r() * 0.07, p: r() * 6, s: 0.004 + r() * 0.006 })),
      cracks: Array.from({ length: 6 }, () => { const pts = [[r(), 0.78 + r() * 0.18]]; for (let k = 0; k < 4; k++) { const [px, py] = pts[pts.length - 1]; pts.push([px + (r() - 0.3) * 0.07, py + (r() - 0.5) * 0.03]); } return { pts, p: r() * 6 }; }),
    }; },
    paint(c, w, h, t, S) {
      c.fillStyle = vgrad(c, 0, h * 0.72, [[0, '#240b0a'], [0.55, '#7c2113'], [1, '#e4692b']]); c.fillRect(0, 0, w, h);
      ridge(c, w, h, S.far, '#4b1d17');
      c.fillStyle = vgrad(c, h * 0.2, h * 0.72, [[0, '#45251f'], [1, '#1f1210']]);
      c.beginPath(); c.moveTo(w * 0.1, h * 0.72); c.quadraticCurveTo(w * 0.36, h * 0.45, w * 0.43, h * 0.24); c.lineTo(w * 0.57, h * 0.24); c.quadraticCurveTo(w * 0.64, h * 0.45, w * 0.92, h * 0.72); c.closePath(); c.fill();
      glow(c, w * 0.5, h * 0.24, h * 0.2, [255, 120, 40], 0.85 + 0.1 * Math.sin(t * 2));
      for (let i = 0; i < 8; i++) {
        const ph = wrap01(t * 0.045 + i / 8);
        c.fillStyle = `rgba(70,58,58,${(0.55 * (1 - ph)).toFixed(3)})`;
        circle(c, (0.5 + Math.sin(ph * 4 + i) * 0.05 + ph * 0.16) * w, (0.22 - ph * 0.28) * h, (0.035 + ph * 0.09) * h);
      }
      c.save(); c.lineCap = 'round'; c.shadowColor = '#ff6a00'; c.shadowBlur = h * 0.03;
      for (const L of [[[0.47, 0.25], [0.4, 0.45], [0.3, 0.7]], [[0.54, 0.25], [0.6, 0.47], [0.7, 0.7]]]) {
        c.beginPath(); c.moveTo(L[0][0] * w, L[0][1] * h); c.quadraticCurveTo(L[1][0] * w, L[1][1] * h, L[2][0] * w, L[2][1] * h);
        c.setLineDash([]); c.strokeStyle = '#ff6d17'; c.lineWidth = Math.max(1, h * 0.018); c.stroke();
        c.setLineDash([Math.max(1, h * 0.03), Math.max(1, h * 0.025)]); c.lineDashOffset = -t * h * 0.06; c.strokeStyle = '#ffd47a'; c.lineWidth = Math.max(1, h * 0.006); c.stroke();
      }
      c.setLineDash([]); c.restore();
      hill(c, w, h, 0.74, 0.012, 1.1, 0.4, vgrad(c, h * 0.72, h, [[0, '#3a221c'], [1, '#1d110e']]));
      c.save(); c.lineCap = 'round'; c.lineJoin = 'round'; c.shadowColor = '#ff5a00'; c.shadowBlur = h * 0.02; c.lineWidth = Math.max(1, h * 0.006);
      for (const k of S.cracks) {
        const s = Math.sin(t * 1.8 + k.p);
        c.strokeStyle = `rgba(255,${Math.round(110 + 60 * s)},30,${(0.6 + 0.35 * s).toFixed(3)})`;
        c.beginPath(); k.pts.forEach(([x, y], i) => (i ? c.lineTo(x * w, y * h) : c.moveTo(x * w, y * h))); c.stroke();
      }
      c.restore();
      c.globalCompositeOperation = 'lighter';
      for (const e of S.embers) { const ph = wrap01(e.o + t * e.v); glow(c, (e.x + Math.sin(t * 1.3 + e.p) * 0.02) * w, (1 - ph * 0.85) * h, e.s * h * 3, [255, 160, 60], 0.9 * (1 - ph)); }
      c.globalCompositeOperation = 'source-over';
    } },
  { key: 'sky', ko: '하늘', what: '구름 바닥과 지나가는 바람',
    init(r) { return {
      far: Array.from({ length: 5 }, () => ({ x: r(), y: 0.1 + r() * 0.25, s: 0.03 + r() * 0.025, v: 0.004 + r() * 0.004 })),
      near: Array.from({ length: 3 }, () => ({ x: r(), y: 0.4 + r() * 0.18, s: 0.06 + r() * 0.03, v: 0.012 + r() * 0.01 })),
      wind: Array.from({ length: 9 }, () => ({ y: 0.12 + r() * 0.6, o: r(), v: 0.12 + r() * 0.14, l: 0.08 + r() * 0.12 })),
      birds: [0, 1, 2].map(() => ({ x: r(), y: 0.2 + r() * 0.2, v: 0.03 + r() * 0.015, p: r() * 6 })),
    }; },
    paint(c, w, h, t, S) {
      c.fillStyle = vgrad(c, 0, h, [[0, '#2f8fe3'], [0.55, '#9fd6ff'], [1, '#fff3d6']]); c.fillRect(0, 0, w, h);
      c.save(); c.translate(w * 0.88, -h * 0.05); c.rotate(t * 0.03); c.fillStyle = 'rgba(255,255,240,.12)';
      for (let i = 0; i < 12; i++) { c.rotate(TAU / 12); c.beginPath(); c.moveTo(0, 0); c.lineTo(h * 1.4, -h * 0.08); c.lineTo(h * 1.4, h * 0.08); c.closePath(); c.fill(); }
      c.restore();
      glow(c, w * 0.88, 0, h * 0.35, [255, 250, 220], 0.9);
      c.save(); c.globalAlpha = 0.28; c.lineWidth = Math.max(1, h * 0.014);
      ['#ff6b6b', '#ffa94d', '#ffe066', '#69db7c', '#4dabf7', '#9775fa'].forEach((col, i) => { c.strokeStyle = col; c.beginPath(); c.arc(w * 0.25, h * 0.95, Math.max(0, h * (0.62 - i * 0.014)), Math.PI * 1.05, Math.PI * 1.75); c.stroke(); });
      c.restore();
      for (const k of S.far) cloud(c, wrap01(k.x + t * k.v) * w * 1.3 - w * 0.15, k.y * h, k.s * h * 1.5, '#ffffff', '#dceafb');
      for (const b of S.birds) bird(c, wrap01(b.x + t * b.v) * w * 1.2 - w * 0.1, (b.y + Math.sin(t * 0.8 + b.p) * 0.01) * h, h * 0.014, t * 6 + b.p, '#5b7fa8');
      c.strokeStyle = 'rgba(255,255,255,.7)'; c.lineCap = 'round'; c.lineWidth = Math.max(1, h * 0.004); c.globalAlpha = 0.55;
      for (const s of S.wind) { const x = wrap01(s.o + t * s.v) * w * 1.6 - w * 0.3, y = s.y * h + Math.sin(t * 2 + s.o * 9) * h * 0.01; c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + s.l * w * 0.5, y - h * 0.012, x + s.l * w, y); c.stroke(); }
      c.globalAlpha = 1;
      for (const k of S.near) cloud(c, wrap01(k.x + t * k.v) * w * 1.4 - w * 0.2, k.y * h, k.s * h * 1.6);
      const off = (t * 0.01) % (2 / 7);
      for (let i = -1; i < 10; i++) cloud(c, (i / 7 - off) * w * 1.1, h * (0.86 + (i % 2 ? 0.03 : 0)), h * 0.11, '#ffffff', '#d7e7fa');
      c.fillStyle = '#eef5ff'; c.fillRect(0, h * 0.93, w, h * 0.07);
    } },
  { key: 'space', ko: '우주', what: '반짝이는 별과 고리 달린 행성',
    init(r) { return {
      stars: Array.from({ length: 150 }, () => ({ x: r(), y: r() * 0.85, s: 0.5 + r() * 1.3, p: r() * 6, v: 0.8 + r() * 2.2 })),
      bright: Array.from({ length: 7 }, () => ({ x: r(), y: r() * 0.6, p: r() * 6 })),
      craters: Array.from({ length: 9 }, () => ({ x: r(), y: 0.86 + r() * 0.11, r: 0.015 + r() * 0.03 })),
    }; },
    paint(c, w, h, t, S) {
      c.fillStyle = vgrad(c, 0, h, [[0, '#04051a'], [0.6, '#120b3a'], [1, '#22134f']]); c.fillRect(0, 0, w, h);
      c.globalCompositeOperation = 'lighter';
      glow(c, w * 0.3, h * 0.32, h * 0.55, [138, 63, 252], 0.32);
      glow(c, w * 0.58, h * 0.14, h * 0.4, [34, 193, 195], 0.2);
      glow(c, w * 0.14, h * 0.62, h * 0.35, [255, 79, 163], 0.16);
      c.globalCompositeOperation = 'source-over';
      c.fillStyle = '#ffffff';
      for (const s of S.stars) { c.globalAlpha = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * s.v + s.p)); const sz = Math.max(1, s.s * h * 0.004); c.fillRect(wrap01(s.x - t * 0.002 * s.s) * w, s.y * h, sz, sz); }
      c.globalAlpha = 1;
      for (const b of S.bright) {
        const a = 0.6 + 0.4 * Math.sin(t * 1.5 + b.p), x = b.x * w, y = b.y * h, L = h * 0.03 * a;
        c.strokeStyle = `rgba(255,255,255,${a.toFixed(3)})`; c.lineWidth = 1;
        c.beginPath(); c.moveTo(x - L, y); c.lineTo(x + L, y); c.moveTo(x, y - L); c.lineTo(x, y + L); c.stroke();
        glow(c, x, y, h * 0.012, [255, 255, 255], a);
      }
      const px = w * 0.8, py = h * 0.24, pr = h * 0.1;
      const ring = (a0, a1, alpha) => { c.save(); c.translate(px, py); c.rotate(-0.35); c.strokeStyle = `rgba(255,214,170,${alpha})`; c.lineWidth = Math.max(1, h * 0.014); c.beginPath(); c.ellipse(0, 0, Math.max(0, pr * 1.9), Math.max(0, pr * 0.5), 0, a0, a1); c.stroke(); c.restore(); };
      ring(Math.PI, TAU, 0.7);
      if (pr > 0) {
        const pg = c.createRadialGradient(px - pr * 0.4, py - pr * 0.4, pr * 0.1, px, py, pr); pg.addColorStop(0, '#ffd1a1'); pg.addColorStop(0.6, '#e8875f'); pg.addColorStop(1, '#8a3d55');
        c.fillStyle = pg; circle(c, px, py, pr);
      }
      ring(0, Math.PI, 0.9);
      c.fillStyle = '#c9d2e8'; circle(c, w * 0.12, h * 0.17, h * 0.035);
      c.fillStyle = 'rgba(120,130,160,.6)'; circle(c, w * 0.115, h * 0.16, h * 0.009); circle(c, w * 0.128, h * 0.185, h * 0.006);
      const ph = (t % 4.5) / 4.5;
      if (ph < 0.2) {
        const k = ph / 0.2, x = lerp(0.15, 0.62, k) * w, y = lerp(0.06, 0.3, k) * h;
        const g = c.createLinearGradient(x, y, x - w * 0.12, y - h * 0.06); g.addColorStop(0, `rgba(255,255,255,${(1 - k).toFixed(3)})`); g.addColorStop(1, 'rgba(255,255,255,0)');
        c.strokeStyle = g; c.lineWidth = Math.max(1, h * 0.006); c.beginPath(); c.moveTo(x, y); c.lineTo(x - w * 0.12, y - h * 0.06); c.stroke();
      }
      c.fillStyle = vgrad(c, h * 0.74, h, [[0, '#a3a9c2'], [1, '#5c6179']]);
      c.beginPath(); c.moveTo(0, h); c.lineTo(0, h * 0.82); c.quadraticCurveTo(w * 0.5, h * 0.7, w, h * 0.82); c.lineTo(w, h); c.closePath(); c.fill();
      for (const k of S.craters) { const x = k.x * w, y = k.y * h, r = k.r * h; c.fillStyle = 'rgba(70,74,96,.55)'; ellipse(c, x, y, r * 1.6, r * 0.55); c.fillStyle = 'rgba(220,224,240,.35)'; ellipse(c, x, y + r * 0.22, r * 1.4, r * 0.28); }
    } },
];

/** 구역 그림의 자리 상태 — 씨앗이 같으면 같은 그림 */
export function sceneState(zi, seed) {
  const sc = SCENES[zi] || SCENES[0];
  return sc.init(seeded(seed));
}
/** 구역 그림 한 장면 */
export function paintScene(c, w, h, t, zi, S) {
  (SCENES[zi] || SCENES[0]).paint(c, w, h, t, S);
}

/** 받침대 — 산 풀밭 · 숲 이끼 · 바다 모래 · 화산 바위(빛나는 테) · 하늘 구름 · 우주 달 바위 */
export const PLAT = [['#a7d873', '#5b9638'], ['#86c35c', '#3c7a2c'], ['#f7e3b0', '#d3aa5e'], ['#55332a', '#ff7a1a'], ['#ffffff', '#c9def6'], ['#b9bed1', '#6f748b']];
export function platform(c, x, y, rx, zi) {
  if (!(rx > 0)) return;
  const [fill, rim] = PLAT[zi] || PLAT[0], ry = rx * 0.26;
  c.save(); if (zi === 3) { c.shadowColor = '#ff6a00'; c.shadowBlur = rx * 0.25; } c.fillStyle = rim; ellipse(c, x, y + ry * 0.2, rx, ry); c.restore();
  c.fillStyle = fill; ellipse(c, x, y, rx * 0.94, ry * 0.8);
  c.fillStyle = 'rgba(0,0,0,.14)'; ellipse(c, x, y, rx * 0.5, ry * 0.35);
}
/** 배틀 무대의 두 자리(0~1) — css/style.css의 .jr-stand.is-foe · .is-me 자리와 같아야 받침대 위에 선다 */
export const FOE_AT = { x: 0.72, y: 0.47 };
export const ME_AT = { x: 0.27, y: 0.87 };

// ───────── 기술 효과 ─────────
/**
 * 타입 → 효과 꼴(k)과 색 — 꼴은 열두 가지(불꽃·물·전기·풀·얼음·바위·고스트·에스퍼·페어리·드래곤·비행·노말) ·
 * 나머지 여섯 타입은 닮은 꼴을 빌려 쓰고 색만 다르게(격투 → 노말 몸으로 · 독·악 → 고스트 · 땅 → 바위 · 벌레 → 풀 · 강철 → 얼음 조각)
 */
export const FX_KIND = {
  fire: { k: 'fire', col: [255, 122, 26] },
  water: { k: 'water', col: [70, 170, 255] },
  electric: { k: 'electric', col: [255, 214, 40] },
  grass: { k: 'grass', col: [96, 196, 72] },
  ice: { k: 'ice', col: [150, 225, 255] },
  rock: { k: 'rock', col: [168, 140, 100] },
  ghost: { k: 'ghost', col: [130, 80, 200] },
  psychic: { k: 'psychic', col: [255, 90, 170] },
  fairy: { k: 'fairy', col: [255, 160, 210] },
  dragon: { k: 'dragon', col: [110, 90, 255] },
  flying: { k: 'flying', col: [200, 225, 255] },
  normal: { k: 'normal', col: [255, 255, 255] },
  fighting: { k: 'normal', col: [255, 150, 90] },
  poison: { k: 'ghost', col: [170, 80, 200] },
  ground: { k: 'rock', col: [190, 150, 90] },
  bug: { k: 'grass', col: [170, 200, 40] },
  dark: { k: 'ghost', col: [90, 70, 120] },
  steel: { k: 'ice', col: [200, 205, 225] },
};
export const fxKindOf = (type) => FX_KIND[type] || FX_KIND.normal;
/** 몸으로 부딪는 기술(노말·격투) — 날아가는 것 없이 달려든다 */
export const lungesFor = (type) => fxKindOf(type).k === 'normal';

/** 효과 조각 엔진 — 자리는 캔버스 픽셀 · step(dt)로 움직이고 draw로 그린다 · 조각이 너무 많으면 새로 만들지 않는다 */
export function createFx(rand = Math.random) {
  const fx = { parts: [], ems: [], bolts: [], rand, max: 600 };
  fx.rnd = (a) => (rand() - 0.5) * 2 * a;
  fx.spawn = (p) => {
    if (fx.parts.length >= fx.max) return;
    fx.parts.push(Object.assign({ vx: 0, vy: 0, ax: 0, ay: 0, age: 0, life: 0.6, size: 6, grow: 0, rot: 0, vr: 0, shape: 'dot', col: [255, 255, 255], add: false, fade: true, seed: rand() }, p));
  };
  /** dur초 동안 매 걸음 fn(0~1 진행) — 끝 걸음에 꼭 한 번 fn(1) */
  fx.emit = (dur, fn) => { fx.ems.push({ age: 0, dur: Math.max(0.001, dur), fn }); };
  fx.later = (sec, fn) => fx.emit(sec, (k) => { if (k >= 1) fn(); });
  fx.step = (dt) => {
    const list = fx.ems;
    fx.ems = [];
    const keep = [];
    for (const e of list) { e.age += dt; e.fn(Math.min(1, e.age / e.dur), dt); if (e.age < e.dur) keep.push(e); }
    fx.ems = keep.concat(fx.ems); // 걸음 안에서 새로 건 것(later 안의 emit)은 다음 걸음부터
    for (const p of fx.parts) { p.age += dt; p.vx += p.ax * dt; p.vy += p.ay * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt; p.size = Math.max(0, p.size + p.grow * dt); }
    fx.parts = fx.parts.filter((p) => p.age < p.life);
    for (const b of fx.bolts) b.age += dt;
    fx.bolts = fx.bolts.filter((b) => b.age < b.life);
  };
  fx.busy = () => fx.parts.length + fx.ems.length + fx.bolts.length > 0;
  fx.clear = () => { fx.parts = []; fx.ems = []; fx.bolts = []; };
  fx.draw = (c) => {
    for (const p of fx.parts) {
      c.globalAlpha = Math.max(0, Math.min(1, p.fade ? 1 - p.age / p.life : 1));
      c.globalCompositeOperation = p.add ? 'lighter' : 'source-over';
      c.save(); c.translate(p.x, p.y); c.rotate(p.rot); drawShape(c, p); c.restore();
    }
    c.globalAlpha = 1; c.globalCompositeOperation = 'lighter';
    for (const b of fx.bolts) drawBolt(c, b, fx.rnd);
    c.globalCompositeOperation = 'source-over';
  };
  return fx;
}

function drawShape(c, p) {
  const s = p.size, col = p.col;
  if (!(s > 0)) return;
  switch (p.shape) {
    case 'flame': { const g = c.createRadialGradient(0, 0, 0, 0, 0, s); g.addColorStop(0, 'rgba(255,250,200,1)'); g.addColorStop(0.4, rgba(col, 0.95)); g.addColorStop(1, rgba(col, 0)); c.fillStyle = g; c.fillRect(-s, -s, s * 2, s * 2); break; }
    case 'glow': { glow(c, 0, 0, s, col, 1); break; }
    case 'drop': { c.rotate(Math.atan2(p.vy, p.vx)); c.fillStyle = rgba(col, 0.95); ellipse(c, 0, 0, s * 1.4, s * 0.7); c.fillStyle = 'rgba(255,255,255,.8)'; ellipse(c, s * 0.4, -s * 0.2, s * 0.35, s * 0.18); break; }
    case 'leaf': { c.fillStyle = rgba(col, 1); c.beginPath(); c.moveTo(-s, 0); c.quadraticCurveTo(0, -s * 0.7, s, 0); c.quadraticCurveTo(0, s * 0.7, -s, 0); c.fill(); c.strokeStyle = 'rgba(30,90,30,.7)'; c.lineWidth = Math.max(1, s * 0.12); c.beginPath(); c.moveTo(-s * 0.8, 0); c.lineTo(s * 0.8, 0); c.stroke(); break; }
    case 'shard': { c.fillStyle = 'rgba(235,250,255,.95)'; c.strokeStyle = rgba(col, 1); c.lineWidth = Math.max(1, s * 0.15); c.beginPath(); c.moveTo(0, -s * 1.3); c.lineTo(s * 0.45, 0); c.lineTo(0, s * 1.3); c.lineTo(-s * 0.45, 0); c.closePath(); c.fill(); c.stroke(); break; }
    case 'star': { c.fillStyle = rgba(col, 1); starPath(c, s); c.fill(); break; }
    case 'rock': { c.fillStyle = '#9b8566'; c.strokeStyle = '#5c4a35'; c.lineWidth = Math.max(1, s * 0.12); c.beginPath(); for (let i = 0; i < 7; i++) { const a = i / 7 * TAU, r = s * (0.75 + 0.3 * Math.sin(p.seed * 50 + i * 2.3)); if (i) c.lineTo(Math.cos(a) * r, Math.sin(a) * r); else c.moveTo(Math.cos(a) * r, Math.sin(a) * r); } c.closePath(); c.fill(); c.stroke(); break; }
    case 'ring': { c.strokeStyle = rgba(col, 1); c.lineWidth = Math.max(1, p.lw || s * 0.12); c.beginPath(); c.arc(0, 0, s, 0, TAU); c.stroke(); break; }
    case 'spark': { const L = Math.hypot(p.vx, p.vy) * 0.06 + s; c.rotate(Math.atan2(p.vy, p.vx)); c.strokeStyle = rgba(col, 1); c.lineWidth = Math.max(1, s * 0.3); c.lineCap = 'round'; c.beginPath(); c.moveTo(-L, 0); c.lineTo(0, 0); c.stroke(); break; }
    case 'slash': { c.strokeStyle = rgba(col, 1); c.lineWidth = Math.max(1, s * 0.18); c.lineCap = 'round'; c.beginPath(); c.arc(0, 0, s, -1.1, 1.1); c.stroke(); break; }
    case 'dust': { c.fillStyle = rgba(col, 0.6); circle(c, 0, 0, s); break; }
    default: { c.fillStyle = rgba(col, 1); circle(c, 0, 0, s); }
  }
}
function drawBolt(c, b, rnd) {
  const a = 1 - b.age / b.life, n = 9, pts = [];
  for (let i = 0; i <= n; i++) { const k = i / n; pts.push([lerp(b.x0, b.x1, k) + (i && i < n ? rnd(b.jit / 2) : 0), lerp(b.y0, b.y1, k)]); }
  for (const [lw, col] of [[b.w * 3, `rgba(255,220,60,${(0.35 * a).toFixed(3)})`], [b.w, `rgba(255,255,230,${a.toFixed(3)})`]]) {
    c.strokeStyle = col; c.lineWidth = Math.max(1, lw); c.lineJoin = 'round'; c.lineCap = 'round';
    c.beginPath(); pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.stroke();
  }
}

/**
 * 기술이 날아감 — P(내 포켓몬) → Q(상대) · u = 640폭 기준 배율 · soft < 1이면 작게
 * 전기(하늘에서)·바위(위에서)·노말(몸으로)은 날아가는 것 없이 impact만
 */
export function travel(fx, type, P, Q, dur, u, soft = 1) {
  const { k, col } = fxKindOf(type);
  const rnd = fx.rnd, R = fx.rand;
  const head = (q) => ({ x: lerp(P.x, Q.x, q), y: lerp(P.y, Q.y, q) - Math.sin(q * Math.PI) * 40 * u * (k === 'water' ? 1 : 0.4) });
  if (k === 'fire') { fx.emit(dur, (q) => { const H = head(q); for (let i = 0; i < Math.round(3 * soft); i++) fx.spawn({ x: H.x + rnd(8) * u, y: H.y + rnd(8) * u, vx: rnd(30) * u, vy: (-20 + rnd(30)) * u, life: 0.35, size: (10 + R() * 10) * u, grow: -10 * u, shape: 'flame', col, add: true }); }); return; }
  if (k === 'water') { fx.emit(dur, (q) => { const H = head(q), dx = Q.x - P.x, dy = Q.y - P.y, d = Math.hypot(dx, dy) || 1; for (let i = 0; i < Math.round(2 * soft); i++) fx.spawn({ x: H.x + rnd(6) * u, y: H.y + rnd(6) * u, vx: (dx / d * 120 + rnd(40)) * u, vy: (dy / d * 120 + rnd(40)) * u, life: 0.3, size: (5 + R() * 4) * u, shape: 'drop', col }); }); return; }
  if (k === 'grass' || k === 'fairy' || k === 'ice' || k === 'flying') {
    const shape = { grass: 'leaf', fairy: 'star', ice: 'shard', flying: 'slash' }[k];
    const n = Math.max(1, Math.round((k === 'flying' ? 4 : 9) * soft)), tt = dur * 0.7;
    let made = 0;
    fx.emit(dur * 0.6, (q) => {
      while (made < n && made <= q * (n - 1)) {
        made++;
        fx.spawn({ x: P.x, y: P.y, vx: (Q.x - P.x) / tt + rnd(60) * u, vy: (Q.y - P.y) / tt + rnd(60) * u, life: tt, size: (k === 'flying' ? 22 : 9) * u, vr: k === 'flying' ? 0 : rnd(14), rot: Math.atan2(Q.y - P.y, Q.x - P.x), shape, col: k === 'fairy' ? [255, 200, 90] : col, add: k === 'fairy', fade: false });
      }
    });
    if (k === 'ice') fx.emit(dur, (q) => { const H = head(q); fx.spawn({ x: H.x, y: H.y, life: 0.25, size: 7 * u, shape: 'glow', col: [210, 245, 255], add: true }); });
    return;
  }
  if (k === 'ghost' || k === 'psychic' || k === 'dragon') {
    fx.emit(dur, (q) => {
      const H = head(q);
      fx.spawn({ x: H.x, y: H.y, life: 0.12, size: (k === 'dragon' ? 26 : 22) * u * soft, shape: 'glow', col, add: true });
      fx.spawn({ x: H.x + rnd(14) * u, y: H.y + rnd(14) * u, vx: rnd(40) * u, vy: rnd(40) * u, life: 0.4, size: 5 * u, shape: 'glow', col: k === 'dragon' ? [80, 200, 255] : [255, 255, 255], add: true });
      if (k === 'dragon') { const a = q * 18; fx.spawn({ x: H.x + Math.cos(a) * 18 * u, y: H.y + Math.sin(a) * 18 * u, life: 0.35, size: 7 * u, shape: 'glow', col: [80, 200, 255], add: true }); }
    });
  }
}

/** 맞는 자리 — big = 효과가 굉장함 · soft < 1이면 작게(상대의 가벼운 반격) · 돌려준 색이 있으면 화면을 그 색으로 살짝 번쩍(전기) */
export function impact(fx, type, Q, u, big = false, soft = 1) {
  const { k, col } = fxKindOf(type);
  const rnd = fx.rnd, R = fx.rand, m = (big ? 1.6 : 1) * soft;
  const ring = (rc, size, life, lw) => fx.spawn({ x: Q.x, y: Q.y, size: size * u, grow: 260 * u * m, life, shape: 'ring', col: rc, lw: lw * u * soft, add: true });
  const burst = (n, o) => { for (let i = 0; i < Math.round(n * m); i++) { const a = R() * TAU, sp = (o.sp || 160) * (0.4 + R() * 0.8) * u; fx.spawn(Object.assign({}, o, { x: Q.x, y: Q.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, size: (o.size || 6) * (0.7 + R() * 0.6) * u, vr: o.spin ? rnd(12) : 0 })); } };
  let flash = '';
  switch (k) {
    case 'fire': burst(26, { shape: 'flame', col, life: 0.55, size: 14, grow: -12 * u, ay: -160 * u, add: true, sp: 200 }); ring(col, 10, 0.4, 6); break;
    case 'water': burst(22, { shape: 'drop', col, life: 0.6, size: 6, ay: 520 * u, sp: 220 }); ring([170, 225, 255], 8, 0.45, 5); break;
    case 'electric': {
      if (soft >= 1) flash = '#fff6b0';
      // 하늘에서 내리치는 번개는 내 기술만 — 반격(soft < 1)은 불꽃 튐만 작게 (🔍 Codex 179차 #1 「가벼운 반격」)
      if (soft >= 1) for (let i = 0; i < (big ? 3 : 2); i++) fx.bolts.push({ x0: Q.x + rnd(60) * u, y0: 0, x1: Q.x + rnd(10) * u, y1: Q.y, age: 0, life: 0.28 + i * 0.06, jit: 34 * u, w: 4 * u });
      burst(18, { shape: 'spark', col: [255, 230, 90], life: 0.35, size: 6, sp: 300, add: true }); ring([255, 230, 90], 8, 0.35, 5); break;
    }
    case 'grass': burst(16, { shape: 'leaf', col, life: 0.7, size: 9, ay: 120 * u, sp: 200, spin: true }); ring([180, 240, 150], 8, 0.4, 4); break;
    case 'ice': burst(16, { shape: 'shard', col, life: 0.6, size: 8, sp: 220, spin: true }); ring([220, 248, 255], 10, 0.5, 7); break;
    case 'rock': {
      const n = Math.max(1, Math.round((big ? 6 : 4) * soft));
      for (let i = 0; i < n; i++) fx.spawn({ x: Q.x + rnd(50) * u, y: Q.y - (180 + R() * 20) * u, vy: 260 * u, ay: 2200 * u, life: 0.32, size: (11 + R() * 7) * u * Math.max(0.6, soft), vr: rnd(6), shape: 'rock', fade: false });
      fx.later(0.3, () => burst(14, { shape: 'dust', col: [170, 150, 120], life: 0.6, size: 9, grow: 14 * u, sp: 120 }));
      break;
    }
    case 'ghost': case 'psychic': ring(col, 6, 0.5, 8); fx.later(0.12, () => ring(col, 6, 0.5, 5)); burst(16, { shape: 'glow', col, life: 0.5, size: 8, sp: 140, add: true }); break;
    case 'fairy': burst(20, { shape: 'star', col: [255, 214, 110], life: 0.7, size: 7, sp: 180, spin: true }); burst(14, { shape: 'glow', col: [255, 170, 220], life: 0.5, size: 7, add: true, sp: 120 }); break;
    case 'dragon': ring([120, 100, 255], 10, 0.5, 9); burst(24, { shape: 'glow', col: [90, 200, 255], life: 0.55, size: 8, sp: 240, add: true }); break;
    case 'flying': burst(10, { shape: 'slash', col: [255, 255, 255], life: 0.35, size: 18, sp: 60, add: true }); ring([230, 245, 255], 8, 0.35, 4); break;
    default: fx.spawn({ x: Q.x, y: Q.y, size: 10 * u, grow: 120 * u * m, life: 0.25, shape: 'star', col: k === 'normal' && col[1] < 200 ? col : [255, 236, 140], add: true }); burst(14, { shape: 'spark', col: [255, 255, 255], life: 0.3, size: 6, sp: 340, add: true });
  }
  if (big) ring([255, 255, 255], 14, 0.5, 10);
  return flash;
}

/** 쓰러짐 — 별이 위로 튀어 떨어진다 (Q.s = 그림 높이) */
export function faintStars(fx, Q, u) {
  for (let i = 0; i < 16; i++) { const a = -Math.PI / 2 + fx.rnd(1.3), sp = (150 + fx.rand() * 160) * u; fx.spawn({ x: Q.x, y: Q.y + Q.s * 0.2, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, ay: 420 * u, life: 0.9, size: (5 + fx.rand() * 4) * u, vr: fx.rnd(10), shape: 'star', col: [255, 214, 90] }); }
}
/** 내려앉음 — 발밑 흙먼지 (구역마다 색: 화산은 검은 재 · 우주는 회색 달 먼지) */
export function landDust(fx, Q, u, zi) {
  const col = zi === 5 ? [190, 196, 214] : zi === 3 ? [90, 70, 64] : zi === 4 ? [235, 242, 255] : [220, 210, 190];
  for (let i = 0; i < 10; i++) { const a = Math.PI + fx.rand() * Math.PI, sp = (60 + fx.rand() * 80) * u; fx.spawn({ x: Q.x, y: Q.y + Q.s * 0.45, vx: Math.cos(a) * sp * 1.6, vy: -Math.abs(Math.sin(a)) * sp * 0.4, life: 0.6, size: 7 * u, grow: 12 * u, shape: 'dust', col }); }
}
/** 몬스터볼에서 나옴 — 하얀 빛 고리 */
export function popRing(fx, Q, u) {
  fx.spawn({ x: Q.x, y: Q.y, size: 8 * u, grow: 300 * u, life: 0.35, shape: 'ring', col: [255, 255, 255], lw: 6 * u, add: true });
  fx.spawn({ x: Q.x, y: Q.y, size: 50 * u, life: 0.3, shape: 'glow', col: [255, 255, 255], add: true });
}
/** 👑 대장이 두르는 금빛 — dur초 동안 몸 둘레를 돈다 */
export function crownGlow(fx, Q, u, dur = 0.9) {
  fx.emit(dur, (q) => { const a = q * TAU * 2; for (let i = 0; i < 2; i++) { const b = a + i * Math.PI; fx.spawn({ x: Q.x + Math.cos(b) * Q.s * 0.6, y: Q.y + Math.sin(b) * Q.s * 0.35, vy: -40 * u, life: 0.5, size: 9 * u, shape: 'glow', col: [255, 200, 60], add: true }); } });
}

// ───────── 그림판 돌리기 ─────────
/**
 * 지금 화면의 그림판만 돌린다 — set([{ cv, draw(c, w, h, t, dt), fps?, fx? }])로 바꿔 끼우고 stop()으로 멈춘다
 * 배경은 fps(기본 30)만큼만 다시 그리고, 효과판(fx)은 조각이 있을 때만 · 「동작 줄이기」면 시간이 흐르지 않아 처음 한 번(크기가 바뀌면 다시)만
 * 한 판이 그리다 오류가 나면 그 판만 멈춘다(다른 판·배틀은 그대로)
 */
export function makeStage(win = globalThis) {
  let reduce = false;
  try { reduce = !!(win.matchMedia && win.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch { reduce = false; }
  let views = [];
  let raf = 0;
  let last = 0;
  let fitAt = 0;
  let T = 0;
  const dpr = () => Math.min(1.5, Number(win.devicePixelRatio) || 1);
  function fit(v) {
    const W = Math.max(1, Math.round((v.cv.clientWidth || 0) * dpr()));
    const H = Math.max(1, Math.round((v.cv.clientHeight || 0) * dpr()));
    if (W !== v.w || H !== v.h) { v.cv.width = W; v.cv.height = H; v.w = W; v.h = H; v.dirty = true; }
  }
  function paint(v, dt) {
    try { v.draw(v.ctx, v.w, v.h, T, dt); } catch { v.dead = true; }
  }
  function frame(now) {
    raf = 0;
    if (!views.length) return;
    const dt = last ? Math.min(0.05, Math.max(0, (now - last) / 1000)) : 0;
    last = now;
    if (!reduce) T += dt;
    if (now - fitAt > 400) { fitAt = now; views.forEach(fit); }
    for (const v of views) {
      if (v.dead) continue;
      let due;
      if (v.fx) { const busy = v.fx.busy(); due = busy || v.wasBusy || v.dirty; v.wasBusy = busy; } else due = v.dirty || (!reduce && now - v.at >= 1000 / v.fps - 2);
      if (!due) continue;
      v.at = now;
      v.dirty = false;
      paint(v, dt);
    }
    // 「동작 줄이기」면 그릴 것이 없을 때 쉰다 — 다음 장은 크기가 바뀔 때(resize)만 (🔍 Codex 179차 #2)
    const more = !reduce || views.some((v) => !v.dead && (v.dirty || (v.fx && v.fx.busy())));
    raf = more ? win.requestAnimationFrame(frame) : 0;
  }
  /** 쉬던 그림판 깨우기 — 창 크기가 바뀌면 바로 다시 재고 그린다 */
  function wake() {
    if (!views.length || raf || !win.requestAnimationFrame) return;
    fitAt = 0;
    last = 0;
    raf = win.requestAnimationFrame(frame);
  }
  let watching = false;
  function stop() {
    views = [];
    if (raf && win.cancelAnimationFrame) win.cancelAnimationFrame(raf);
    raf = 0;
    last = 0;
  }
  /** 지금 화면 그림판으로 바꿔 끼움 — 빈 목록이면 멈춘다 · 배경은 처음 한 장면을 바로 그린다(빈 판이 보이지 않게) */
  function set(list) {
    views = [];
    for (const o of list || []) {
      let ctx = null;
      try { ctx = o.cv.getContext('2d'); } catch { ctx = null; }
      if (!ctx) continue;
      const v = { cv: o.cv, ctx, draw: o.draw, fps: o.fps || 30, fx: o.fx || null, w: 0, h: 0, at: 0, dirty: true, dead: false, wasBusy: false };
      fit(v);
      if (!v.fx) { paint(v, 0); v.dirty = false; }
      views.push(v);
    }
    if (!views.length) { stop(); return 0; }
    if (!watching && win.addEventListener) { win.addEventListener('resize', wake); watching = true; }
    if (!raf && win.requestAnimationFrame) { last = 0; raf = win.requestAnimationFrame(frame); }
    return views.length;
  }
  return {
    reduce,
    set,
    stop,
    /** 시험용 — 돌고 있는 판 수 · 지금 시각 */
    count: () => views.filter((v) => !v.dead).length,
    time: () => T,
  };
}
