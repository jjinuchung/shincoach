// 🖼️ 포켓몬 그림 맞추기 — 🎮 게임기 미니 게임 열째 (v339 · 2026-10-25 아버님 "퍼즐을 포켓몬스터들로 20피스 정도 나눠놓고 맞추는 게임" → 기본안 "이대로")
// 진우가 잡은 포켓몬 셋 가운데 하나를 고르면 → 그 포켓몬 그림(타입 색 배경·무늬·아래 이름 띠)을 5×4 = 20조각(볼록·오목)으로 잘라 판 양옆에 흩어 놓는다
// 끌어다 제자리 가까이 놓으면 딸깍 붙는다(⭐1) · 틀린 곳에 놓으면 그 자리에 둔다(감점·✕ 소리 없음) · 조각 돌리기 없음 ·
// 위에 작은 완성 그림(퍼즐 상자 그림처럼 — 판에 흐린 밑그림은 깔지 않는다)
// 시간 제한 없이 다 맞추면 끝(🗺️ 대모험이 깃대에서 끝나는 것처럼) — 걸린 시간(sec)을 넘기고, 가장 빠른 시간이 최고 기록(homeplay fast)
// 「어떤 포켓몬?」에서 그만두면 한 판도 안 한 것(unplayed — 게임기가 판을 돌려준다, 🤼 「누구랑?」과 같게)
//
// 그림이 투명 배경이라 그대로 자르면 텅 빈 조각이 생긴다 → 타입 색 둥근 그러데이션(가운데 밝고 귀퉁이 어둡게)·반짝이 무늬·큰 몬스터볼 테두리·이름 띠를
// 그려 넣어 어느 조각에도 단서가 있게 · 저장한 그림은 256px로 줄여 둬서 크게 펴면 흐리다 → 고르는 동안 원본 크기 그림을 받아 보고(o.big) 못 받으면 저장한 그림으로
//
// 자리는 모두 마당(가로:세로 = 2:1)에 대한 % — 조각 한 칸은 가로 10% · 세로 20%(화면에서 정사각형) · 판은 가운데(가로 25~75% · 세로 10~90%) ·
// 처음 조각은 판 양옆에 두 줄씩 다섯 칸(20자리) — 돌리거나 크기가 바뀌어도 다시 잴 것이 없다
// 위쪽(엔진)은 순수 — 시각(ms)과 rng만 받아 상태를 바꾼다(node 시험이 끝까지) · 아래쪽(runJig)이 화면(캔버스로 그림을 그려 조각마다 잘라 낸다)
import { sfx } from './sfx.js';
import { musicMode } from './gamesong.js'; // 🎵 게임 음악 상태 (v335 · 순수)

/** 판(칸 수) · 고를 포켓몬 수 · 보통 걸리는 시간(초 — minigame.GAMES sec · 끝은 다 맞출 때) */
export const JIG_COLS = 6; // 5 × 4 = 20조각이었다 (v351 — 진우 「너무 쉬워요」 → 아버님 「추천대로」)
export const JIG_ROWS = 4;
export const JIG_N = JIG_COLS * JIG_ROWS;
export const JIG_CHOICES = 3;
export const JIG_SEC = 150;
/** 한 칸(마당 %) · 판 왼쪽 위(마당 %) */
// 24조각(v351) — 칸을 조금 줄여(10×20 → 9×18) 판(54%×72%)이 가운데에 오고 양옆에 두 줄씩 여섯 칸이 남게
export const CELL_W = 9;
export const CELL_H = 18;
export const BOARD_X = 23;
export const BOARD_Y = 14;
/** 조각 둘레 여유(칸에 대한 비 — 볼록한 꼭지가 들어갈 자리) · 제자리에서 이만큼(칸에 대한 비) 안에 놓으면 붙는다 */
export const TAB = 0.25;
export const SNAP = 0.35;
/** 고른 뒤 원본 크기 그림을 더 기다리는 끝(ms) — 못 받으면 저장한 그림으로 */
export const BIG_WAIT_MS = 1500;
/** 조각을 놓을 수 있는 자리(조각 칸 왼쪽 위 — 꼭지까지 마당 안에) */
export const X_MIN = TAB * CELL_W;
export const X_MAX = 100 - CELL_W - TAB * CELL_W;
export const Y_MIN = TAB * CELL_H;
export const Y_MAX = 100 - CELL_H - TAB * CELL_H;
/** 처음 흩어 놓는 자리 — 판 왼쪽 두 줄 · 오른쪽 두 줄 × 여섯 칸 (v351 — 다섯 칸이었다) */
const SLOT_X = [X_MIN, X_MIN + CELL_W, 100 - TAB * CELL_W - 2 * CELL_W, X_MAX];
const SLOT_Y = [0, 1, 2, 3, 4, 5].map((k) => Y_MIN + ((Y_MAX - Y_MIN) * k) / 5);
const JITTER_Y = 1.5;

const nz = (v) => {
  const n = Math.floor(Number(v) || 0);
  return n > 0 ? n : 0;
};
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
function shuffle(list, rng) {
  const a = list.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.min(i, Math.floor(rng() * (i + 1)));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * 고를 포켓몬 (순수) — pool [{ id, mine }] → 잡은 것(mine) 먼저 섞어서 · 모자라면 나머지에서 · 같은 id는 한 번 → id JIG_CHOICES개까지(없으면 [])
 */
export function jigChoices(pool, rng = Math.random) {
  const seen = new Set();
  const mine = [];
  const rest = [];
  for (const p of Array.isArray(pool) ? pool : []) {
    const id = Number(p && p.id);
    if (!Number.isSafeInteger(id) || id <= 0 || seen.has(id)) continue;
    seen.add(id);
    (p.mine ? mine : rest).push(id);
  }
  return [...shuffle(mine, rng), ...shuffle(rest, rng)].slice(0, JIG_CHOICES);
}

/**
 * 조각 모양 (순수) — 칸마다 { top, right, bottom, left }: 1 볼록 · -1 오목 · 0 판 테두리(곧은 변)
 * 붙은 두 조각은 늘 반대(한쪽이 볼록이면 이웃은 오목) — 경계마다 한 번만 정해 양쪽에 나눠 준다
 */
export function jigShapes(rng = Math.random) {
  const sign = () => (rng() < 0.5 ? 1 : -1);
  const right = []; // right[r][c] — 칸 (r, c)와 오른쪽 이웃 사이 (왼쪽 칸 기준)
  const down = [];  // down[r][c] — 칸 (r, c)와 아래 이웃 사이 (위 칸 기준)
  for (let r = 0; r < JIG_ROWS; r++) {
    right.push([]);
    down.push([]);
    for (let c = 0; c < JIG_COLS; c++) {
      right[r].push(c < JIG_COLS - 1 ? sign() : 0);
      down[r].push(r < JIG_ROWS - 1 ? sign() : 0);
    }
  }
  const out = [];
  for (let r = 0; r < JIG_ROWS; r++) {
    for (let c = 0; c < JIG_COLS; c++) {
      out.push({
        top: r > 0 ? -down[r - 1][c] : 0,
        right: right[r][c],
        bottom: down[r][c],
        left: c > 0 ? -right[r][c - 1] : 0,
      });
    }
  }
  return out;
}

/** 처음 자리 (순수) — 판 양옆 20자리를 섞어서 · 위아래로 조금씩 흔들어(마당 안에서) → [{ x, y }] JIG_N개 */
export function jigSlots(rng = Math.random) {
  const slots = [];
  for (const y of SLOT_Y) for (const x of SLOT_X) slots.push({ x, y });
  return shuffle(slots, rng).map((p) => ({ x: p.x, y: clamp(p.y + (rng() * 2 - 1) * JITTER_Y, Y_MIN, Y_MAX) }));
}

/** 새 판 (순수) — 조각마다 { i, r, c, shape, tx, ty (제자리), x, y (지금 자리), done } */
export function jigStart(now, rng = Math.random) {
  const shapes = jigShapes(rng);
  const slots = jigSlots(rng);
  const pieces = shapes.map((shape, i) => {
    const r = Math.floor(i / JIG_COLS);
    const c = i % JIG_COLS;
    return { i, r, c, shape, tx: BOARD_X + c * CELL_W, ty: BOARD_Y + r * CELL_H, x: slots[i].x, y: slots[i].y, done: false };
  });
  return { t0: Number.isFinite(now) ? now : 0, pieces, placed: 0, score: 0, moves: 0, doneAt: 0, sec: 0 };
}

/** 제자리 가까이인가 (순수) — 칸에 대한 거리로(가로·세로 % 크기가 달라도 화면 거리대로) */
export function jigNear(p) {
  const dx = (p.x - p.tx) / CELL_W;
  const dy = (p.y - p.ty) / CELL_H;
  return dx * dx + dy * dy <= SNAP * SNAP;
}

/** 끄는 동안 (순수) — 마당 안으로 잘라 옮긴다 · 붙은 조각·끝난 판·깨진 값은 그대로 → 옮겼으면 true */
export function jigMove(s, i, x, y) {
  const p = s.pieces[i];
  if (!p || p.done || s.doneAt || !Number.isFinite(x) || !Number.isFinite(y)) return false;
  p.x = clamp(x, X_MIN, X_MAX);
  p.y = clamp(y, Y_MIN, Y_MAX);
  return true;
}

/** 걸린 시간(초 · 순수) — 다 맞춘 때(없으면 now)까지 · 내려 둔 동안은 jigShift가 뺐다 · 적어도 1초 */
export function jigSec(s, now) {
  const end = s.doneAt || now;
  const ms = Number(end) - Number(s.t0);
  return Number.isFinite(ms) ? Math.max(1, Math.round(ms / 1000)) : 1;
}

/**
 * 손을 뗐다 (순수) → { kind, i?, pts?, sec? }
 *   'snap' 제자리에 붙음(⭐1) · 'done' 붙었고 다 맞춤(sec = 걸린 시간) · 'loose' 그 자리에 둠(감점 없음)
 *   'locked' 이미 붙은 조각 · 'over' 이미 다 맞춤 · 'none' 없는 조각
 */
export function jigDrop(s, i, x, y, now) {
  if (s.doneAt) return { kind: 'over' };
  const p = s.pieces[i];
  if (!p) return { kind: 'none' };
  if (p.done) return { kind: 'locked', i };
  jigMove(s, i, x, y);
  s.moves += 1;
  if (!jigNear(p)) return { kind: 'loose', i };
  p.x = p.tx;
  p.y = p.ty;
  p.done = true;
  s.placed += 1;
  s.score += 1;
  if (s.placed < JIG_N) return { kind: 'snap', i, pts: 1 };
  s.doneAt = Number.isFinite(now) && now > s.t0 ? now : s.t0 + 1;
  s.sec = jigSec(s);
  return { kind: 'done', i, pts: 1, sec: s.sec };
}

/** 멈췄던 만큼 뒤로 민다 (순수) — 앱을 내렸다 돌아오면 걸린 시간에 안 들어간다 · 다 맞춘 뒤엔 그대로 */
export function jigShift(s, ms) {
  const d = nz(ms);
  if (!d || s.doneAt) return;
  s.t0 += d;
}

/**
 * 꼭지 모양 — 길이 1인 변(0 → 1) 위에서 · v는 바깥쪽(칸 크기에 대한 비) · 가운데를 두고 좌우가 똑같다
 * (이웃 조각은 같은 경계를 거꾸로 따라간다 — 좌우가 같아야 두 선이 딱 겹친다 · 시험이 점마다 맞춰 본다)
 */
const KNOB = [
  ['L', 0.36, 0],
  ['C', 0.40, 0, 0.43, 0.03, 0.40, 0.08],
  ['C', 0.34, 0.17, 0.42, 0.22, 0.50, 0.22],
  ['C', 0.58, 0.22, 0.66, 0.17, 0.60, 0.08],
  ['C', 0.57, 0.03, 0.60, 0, 0.64, 0],
  ['L', 1, 0],
];
/** 꼭지가 바깥으로 나가는 끝(칸에 대한 비) — TAB보다 작아야 캔버스 여유 안에 든다 */
export const KNOB_OUT = 0.22;

/**
 * 변 하나 (순수) — (x0, y0) → (x1, y1) · (nx, ny) = 조각 바깥쪽 · sign 1 볼록 · -1 오목 · 0 곧은 변 · size = 한 칸
 * → [['L', x, y] | ['C', x1, y1, x2, y2, x, y]]
 */
export function edgeOps(x0, y0, x1, y1, nx, ny, sign, size) {
  if (!sign) return [['L', x1, y1]];
  const at = (u, v) => [x0 + (x1 - x0) * u + nx * v * sign * size, y0 + (y1 - y0) * u + ny * v * sign * size];
  return KNOB.map(([k, ...n]) => {
    const pts = [];
    for (let j = 0; j < n.length; j += 2) pts.push(...at(n[j], n[j + 1]));
    return [k, ...pts];
  });
}

/** 조각 테두리 (순수) — 칸 왼쪽 위가 (0, 0) · 시계 방향(위 → 오른쪽 → 아래 → 왼쪽) → [['M', 0, 0], ...edgeOps] */
export function jigPath(shape, size) {
  const z = size;
  const sh = shape || {};
  return [
    ['M', 0, 0],
    ...edgeOps(0, 0, z, 0, 0, -1, sh.top || 0, z),
    ...edgeOps(z, 0, z, z, 1, 0, sh.right || 0, z),
    ...edgeOps(z, z, 0, z, 0, 1, sh.bottom || 0, z),
    ...edgeOps(0, z, 0, 0, -1, 0, sh.left || 0, z),
  ];
}

/** 타입 색 (그림 배경) — 모르는 타입은 노말 */
export const TYPE_COLOR = {
  normal: '#a8a77a', fire: '#ee8130', water: '#6390f0', grass: '#7ac74c', electric: '#f7d02c', ice: '#96d9d6',
  fighting: '#c22e28', poison: '#a33ea1', ground: '#e2bf65', flying: '#a98ff3', psychic: '#f95587', bug: '#a6b91a',
  rock: '#b6a136', ghost: '#735797', dragon: '#6f35fc', dark: '#705746', steel: '#b7b7ce', fairy: '#d685ad',
};
/** 두 색 섞기 (순수) — '#rrggbb' 둘 · t = 0이면 a · 1이면 b */
export function mixColor(a, b, t) {
  const rgb = (h) => {
    const m = /^#([0-9a-f]{6})$/i.exec(String(h || ''));
    const n = m ? parseInt(m[1], 16) : 0;
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  };
  const k = clamp(Number(t) || 0, 0, 1);
  const [x, y] = [rgb(a), rgb(b)];
  return `#${x.map((v, j) => Math.round(v + (y[j] - v) * k).toString(16).padStart(2, '0')).join('')}`;
}

// ───────────────────── 화면 (여기부터 브라우저) ─────────────────────

/** 한 칸 그림 크기(캔버스 점) — 화면에서 한 칸 약 85px × 기기 배율 2쯤 */
const PX = 160;

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}
function replay(node, cls) {
  node.classList.remove(cls);
  void node.offsetWidth;
  node.classList.add(cls);
}
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
function trace(ctx, ops) {
  ctx.beginPath();
  for (const [k, ...a] of ops) {
    if (k === 'M') ctx.moveTo(a[0], a[1]);
    else if (k === 'L') ctx.lineTo(a[0], a[1]);
    else ctx.bezierCurveTo(a[0], a[1], a[2], a[3], a[4], a[5]);
  }
  ctx.closePath();
}
function star(ctx, x, y, r) {
  ctx.beginPath();
  for (let k = 0; k < 10; k++) {
    const a = -Math.PI / 2 + (k * Math.PI) / 5;
    const rr = k % 2 ? r * 0.45 : r;
    if (k) ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    else ctx.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath();
  ctx.fill();
}

/** 완성 그림 그리기 — 타입 색 그러데이션 · 반짝이 무늬 · 큰 몬스터볼 테두리 · 포켓몬 · 이름 띠 (W × H 캔버스) */
function paint(ctx, W, H, img, mon, rng) {
  const base = TYPE_COLOR[mon.type] || TYPE_COLOR.normal;
  const g = ctx.createRadialGradient(W * 0.5, H * 0.42, H * 0.06, W * 0.5, H * 0.5, W * 0.62);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(0.35, mixColor(base, '#ffffff', 0.55));
  g.addColorStop(1, mixColor(base, '#000000', 0.3));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  // 반짝이·동그라미 — 귀퉁이 빈 조각에도 단서가 있게 (크기·자리가 판마다 다르다)
  for (let k = 0; k < 48; k++) {
    const x = rng() * W;
    const y = rng() * H;
    const r = (0.008 + rng() * 0.02) * W;
    ctx.fillStyle = `rgba(255, 255, 255, ${(0.25 + rng() * 0.35).toFixed(2)})`;
    if (k % 3) star(ctx, x, y, r);
    else { ctx.beginPath(); ctx.arc(x, y, r * 0.7, 0, Math.PI * 2); ctx.fill(); }
  }
  // 큰 몬스터볼 테두리 (흐리게 — 포켓몬 뒤)
  const cx = W / 2;
  const cy = H * 0.44;
  const R = H * 0.42;
  ctx.lineWidth = H * 0.025;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
  ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx - R, cy); ctx.lineTo(cx - R * 0.22, cy); ctx.moveTo(cx + R * 0.22, cy); ctx.lineTo(cx + R, cy); ctx.stroke();
  ctx.beginPath(); ctx.arc(cx, cy, R * 0.2, 0, Math.PI * 2); ctx.stroke();
  // 포켓몬
  const S = H * 0.8;
  if (img) { try { ctx.drawImage(img, cx - S / 2, H * 0.04, S, S); } catch { /* 깨진 그림 — 배경만 */ } }
  // 이름 띠
  const name = String(mon.ko || '');
  if (name) {
    ctx.font = `bold ${Math.round(H * 0.075)}px sans-serif`;
    const tw = ctx.measureText ? ctx.measureText(name).width : name.length * H * 0.075;
    const bw = tw + H * 0.12;
    const bh = H * 0.12;
    const bx = cx - bw / 2;
    const by = H * 0.85;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') ctx.roundRect(bx, by, bw, bh, bh / 2);
    else ctx.rect(bx, by, bw, bh);
    ctx.fill();
    ctx.fillStyle = mixColor(base, '#000000', 0.55);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(name, cx, by + bh / 2);
  }
}

/** 조각 한 장 그리기 — 테두리 모양으로 오려 낸 그림 + 흰 테두리 (캔버스는 칸 둘레에 TAB만큼 여유) */
function cutPiece(cv, pic, p) {
  const pad = TAB * PX;
  const size = PX + pad * 2;
  cv.width = size;
  cv.height = size;
  const ctx = typeof cv.getContext === 'function' ? cv.getContext('2d') : null;
  if (!ctx || !pic) return;
  ctx.translate(pad, pad);
  trace(ctx, jigPath(p.shape, PX));
  ctx.save();
  ctx.clip();
  ctx.drawImage(pic, -p.c * PX, -p.r * PX);
  ctx.restore();
  ctx.lineJoin = 'round';
  ctx.lineWidth = 4;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
  ctx.stroke();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.35)';
  ctx.stroke();
}

/**
 * 한 판 돌리기 → { done: Promise<{ score, quit, sec?, unplayed?, msg? }>, stop(), music() }
 * stage = 그릴 자리(비워서 쓴다) · o.pool = [{ id, ko, url, type, mine }] (기기에 그림이 있는 포켓몬 — mine = 진우가 잡은 것) ·
 * o.big = id → Promise<원본 크기 그림 주소 | null> (없어도 된다) · o.hero = 응원하는 쪽 { html } · o.rng
 * sec = 다 맞췄을 때 걸린 시간(초) · unplayed = 「어떤 포켓몬?」에서 그만둠 · 그림을 못 펼침(판을 돌려받는다 — msg는 고르기 화면에 한 줄) ·
 * stop()은 ✕·집을 닫을 때 — 그 자리에서 끝(quit · 고른 뒤라면 판을 쓴 것)
 */
export function runJig(stage, o = {}) {
  const now = () => performance.now();
  const rng = typeof o.rng === 'function' ? o.rng : Math.random;
  const pool = Array.isArray(o.pool) ? o.pool : [];
  const byId = new Map(pool.map((p) => [Number(p.id), p]));
  stage.innerHTML = '';
  const root = el('div', 'gd gj');
  const top = el('div', 'gd-top gj-top');
  const scoreEl = el('span', 'gd-score', '⭐ 0');
  const peek = el('canvas', 'gj-peek');
  peek.setAttribute('aria-hidden', 'true');
  peek.hidden = true;
  top.append(scoreEl, peek);
  const field = el('div', 'gj-field');
  const board = el('div', 'gj-board');
  const full = el('canvas', 'gj-full');
  full.setAttribute('aria-hidden', 'true');
  field.append(board, full);
  const pick = el('div', 'gj-pick');
  pick.appendChild(el('p', 'gj-pick-q', '어떤 포켓몬 그림을 맞출까요?'));
  const pickRow = el('div', 'gj-pick-row');
  const pickMsg = el('p', 'gj-wait', '');
  pick.append(pickRow, pickMsg);
  field.appendChild(pick);
  const pal = el('div', 'gd-pal');
  pal.innerHTML = (o.hero && o.hero.html) || '<span class="gd-pal-emoji">🐾</span>';
  const fx = el('div', 'gd-fx');
  const banner = el('div', 'gd-banner', '');
  const say = el('p', 'sr-only'); // 화면 읽기 — 다 맞췄을 때
  say.setAttribute('role', 'status');
  say.setAttribute('aria-live', 'polite');
  root.append(top, field, pal, fx, banner, say);
  stage.appendChild(root);

  let s = null;
  let go = false;      // 조각을 끌 수 있다(「준비!」 뒤)
  let chosen = false;  // 포켓몬을 골랐다(그림 펴는 중 포함)
  let pausedAt = 0;
  let finished = false;
  let z = 10;          // 끄는 조각을 맨 위로 — 붙은 조각은 1
  let drag = null;     // { i, id (pointerId), sx, sy, x0, y0 }
  let resolveDone;
  const done = new Promise((r) => { resolveDone = r; });
  const parts = [];    // 조각마다 { wrap, cv, hit }

  const place = (i) => {
    const p = s.pieces[i];
    const w = parts[i].wrap;
    w.style.left = `${(p.x - TAB * CELL_W).toFixed(3)}%`;
    w.style.top = `${(p.y - TAB * CELL_H).toFixed(3)}%`;
  };
  const fly = (text, i, cls) => {
    const p = s.pieces[i];
    const f = el('span', `gd-fly ${cls || ''}`, text);
    f.style.left = `${p.x + CELL_W / 2}%`;
    f.style.top = `${p.y}%`;
    fx.appendChild(f);
    setTimeout(() => f.remove(), 900);
  };
  /** 끄는 자리 — 누른 곳에서 손가락이 움직인 만큼(마당 %) */
  const posOf = (e) => {
    const r = field.getBoundingClientRect();
    if (!drag || !(r.width > 0) || !(r.height > 0)) return null;
    return { x: drag.x0 + ((Number(e.clientX) - drag.sx) / r.width) * 100, y: drag.y0 + ((Number(e.clientY) - drag.sy) / r.height) * 100 };
  };
  const drop = (i, x, y) => {
    const r = jigDrop(s, i, x, y, now());
    place(i);
    if (r.kind !== 'snap' && r.kind !== 'done') return;
    const w = parts[i].wrap;
    w.classList.add('is-done');
    w.style.zIndex = '1';
    replay(w, 'is-snap');
    scoreEl.textContent = `⭐ ${s.score}`;
    fly('+1', i);
    sfx.ding();
    replay(pal, 'is-hop');
    if (r.kind === 'done') finish(false);
  };
  const letGo = (i, e, keep) => {
    if (!drag || drag.i !== i || (e && e.pointerId !== drag.id)) return;
    const at = keep ? null : posOf(e);
    drag = null;
    parts[i].wrap.classList.remove('is-drag');
    const p = s.pieces[i];
    drop(i, at ? at.x : p.x, at ? at.y : p.y);
  };
  const hook = (i) => {
    const { wrap, hit } = parts[i];
    hit.addEventListener('pointerdown', (e) => {
      if (!go || finished || pausedAt || drag || s.pieces[i].done) return;
      if (e && typeof e.preventDefault === 'function') e.preventDefault();
      const p = s.pieces[i];
      drag = { i, id: e.pointerId, sx: Number(e.clientX) || 0, sy: Number(e.clientY) || 0, x0: p.x, y0: p.y };
      if (typeof hit.setPointerCapture === 'function' && e.pointerId !== undefined) { try { hit.setPointerCapture(e.pointerId); } catch { /* 옛 브라우저 */ } }
      z += 1;
      wrap.style.zIndex = String(z);
      wrap.classList.add('is-drag');
      sfx.tick();
    });
    hit.addEventListener('pointermove', (e) => {
      if (!drag || drag.i !== i || e.pointerId !== drag.id || pausedAt) return;
      const at = posOf(e);
      if (at && jigMove(s, i, at.x, at.y)) place(i);
    });
    hit.addEventListener('pointerup', (e) => letGo(i, e, false));
    hit.addEventListener('pointercancel', (e) => letGo(i, e, true)); // 끊긴 끌기 — 마지막 자리에 놓는다
    hit.addEventListener('lostpointercapture', (e) => letGo(i, e, true));
  };

  /** 그림을 펴서 조각을 깐다 → 「준비!」 → 시작 */
  const build = (img, mon) => {
    if (finished) return;
    s = jigStart(0, rng);
    const pic = el('canvas');
    pic.width = JIG_COLS * PX;
    pic.height = JIG_ROWS * PX;
    const ctx = typeof pic.getContext === 'function' ? pic.getContext('2d') : null;
    if (ctx) paint(ctx, pic.width, pic.height, img, mon, rng);
    for (const [cv, w, h] of [[full, pic.width, pic.height], [peek, 160, 128]]) {
      cv.width = w;
      cv.height = h;
      const c2 = typeof cv.getContext === 'function' ? cv.getContext('2d') : null;
      if (c2 && ctx) c2.drawImage(pic, 0, 0, w, h);
    }
    for (const p of s.pieces) {
      const wrap = el('div', 'gj-pc');
      const cv = el('canvas');
      cutPiece(cv, ctx ? pic : null, p);
      const hit = el('span', 'gj-hit');
      wrap.append(cv, hit);
      field.appendChild(wrap);
      parts.push({ wrap, cv, hit });
      place(p.i);
      hook(p.i);
    }
    pick.hidden = true;
    peek.hidden = false;
    banner.textContent = '준비!';
    banner.classList.add('is-on');
    sfx.tick();
    setTimeout(() => {
      if (finished) return;
      banner.classList.remove('is-on');
      s.t0 = now();
      go = true;
      root.classList.add('is-go');
      if (document.hidden) { pausedAt = now(); root.classList.add('is-paused'); }
    }, 800);
  };

  /** 그림 한 장 받기 → img | null */
  const load = (url) => new Promise((resolve) => {
    if (!url) { resolve(null); return; }
    const img = el('img');
    img.addEventListener('load', () => resolve(img));
    img.addEventListener('error', () => resolve(null));
    img.src = url;
  });
  /** 골랐다 — 원본 크기 그림을 BIG_WAIT_MS까지 더 기다리고 → 못 받으면 저장한 그림 · 그것도 깨지면 그만(판을 돌려받는다) */
  const choose = async (id, big) => {
    if (chosen || finished) return;
    chosen = true;
    for (const b of pickRow.children) b.disabled = true;
    pickMsg.textContent = '그림을 펼치는 중…';
    const mon = byId.get(id) || { id, ko: '', url: '' };
    const bigUrl = await Promise.race([big, wait(BIG_WAIT_MS).then(() => null)]);
    if (finished) return;
    let img = bigUrl ? await load(bigUrl) : null;
    if (!img && !finished) img = await load(mon.url);
    if (finished) return;
    if (!img) { finishUnplayed('앗, 그림을 못 펼쳤어요 — 다시 골라 봐요.'); return; }
    build(img, mon);
  };

  // 「어떤 포켓몬?」 — 그림이 뜬 카드만 누를 수 있다(본 그림과 펴는 그림이 같게 · 🔍 Codex 114차) · 깨진 카드는 뺀다
  const ids = jigChoices(pool, rng);
  const bigs = new Map(ids.map((id) => [id, typeof o.big === 'function' ? Promise.resolve().then(() => o.big(id)).catch(() => null) : Promise.resolve(null)]));
  for (const id of ids) {
    const mon = byId.get(id) || {};
    const b = el('button', 'gj-who');
    b.type = 'button';
    b.disabled = true;
    const img = el('img', 'gj-who-img');
    img.alt = '';
    img.draggable = false;
    img.addEventListener('load', () => { if (!chosen && !finished) b.disabled = false; });
    img.addEventListener('error', () => {
      b.remove();
      if (!pickRow.children.length && !chosen) finishUnplayed('앗, 포켓몬 그림을 못 불러왔어요.');
    });
    b.append(img, el('span', 'gj-who-name', mon.ko || ''));
    b.setAttribute('aria-label', mon.ko || '포켓몬');
    b.addEventListener('click', () => { choose(id, bigs.get(id)).catch(() => finishUnplayed('앗, 그림을 못 펼쳤어요 — 다시 골라 봐요.')); });
    pickRow.appendChild(b);
    img.src = mon.url || '';
  }

  function onVis() {
    if (!go || finished) return;
    if (document.hidden) {
      // 끄던 조각은 숨기기 **전에** 그 자리에 놓는다 — 숨긴 동안 온 pointercancel이 마지막 조각을 놓으면 숨긴 시간이 완성 기록에 들었다 (🔍 Codex 143차 #1)
      if (drag) letGo(drag.i, null, true);
      if (finished) return; // 그 조각이 마지막이었다 — 다 맞춘 때는 숨기기 전
      pausedAt = now();
      root.classList.add('is-paused');
      return;
    }
    if (pausedAt) { jigShift(s, now() - pausedAt); pausedAt = 0; root.classList.remove('is-paused'); }
  }
  const stopAll = () => {
    finished = true;
    drag = null;
    document.removeEventListener('visibilitychange', onVis);
    for (const b of pickRow.children) b.disabled = true;
  };
  /** 한 판도 안 함 — 게임기가 판을 돌려준다 (msg = 고르기 화면에 띄울 한 줄) */
  function finishUnplayed(msg) {
    if (finished) return;
    stopAll();
    resolveDone({ score: 0, quit: true, unplayed: true, msg: msg || '' });
  }
  function finish(quit) {
    if (finished) return;
    if (!chosen) { finishUnplayed(''); return; } // 「어떤 포켓몬?」에서 ✕ — 한 판도 안 함
    stopAll();
    const score = s ? s.score : 0;
    if (quit || !go) { resolveDone({ score, quit: true }); return; } // 고른 뒤(그림 펴는 중·「준비!」)는 판을 쓴 것 — 🤼 「누구랑?」 뒤 「준비!」와 같게
    full.classList.add('is-on');
    banner.textContent = '완성!';
    banner.classList.add('is-on');
    say.textContent = '완성! 그림을 다 맞췄어요';
    sfx.success();
    setTimeout(() => resolveDone({ score, quit: false, sec: s.sec }), 2200);
  }

  document.addEventListener('visibilitychange', onVis);
  if (!ids.length) setTimeout(() => finishUnplayed('포켓몬 그림이 아직 없어요 — 인터넷이 될 때 다시 해 봐요.'), 0); // 게임기가 판을 쓰기 전에 막지만, 혹시 몰라
  sfx.tick();

  // 🎵 게임 음악(v335) — 다 맞추면 stop · 시간 제한이 없어 서두르기(hurry)는 없다
  return { done, stop: () => finish(true), music: () => musicMode({ over: finished || !!(s && s.doneAt) }) };
}
