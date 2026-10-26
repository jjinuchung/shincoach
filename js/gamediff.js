// 🔍 우리 집 다른 그림 찾기 — 🎮 게임기 미니 게임 열넷째 (v345 · 2026-10-26 아버님 "다음 미니 게임 진행하자" → 기본안 "이대로")
// 진우가 꾸민 1층 방 그림 두 장(벽지·바닥·가구 그대로 — 태블릿 가로는 옆으로, 폰 세로는 위아래로) · 다른 곳 다섯:
//   가구 하나 없어짐 · 하나 더 있음 · 다른 칸으로 옮겨짐 · 다른 가구로 바뀜 (방향 뒤집기는 뺐다 — 좌우가 같은 이모지는 뒤집어도 안 보여서 억울)
// 두 그림 어느 쪽이든 다른 곳을 톡 → 양쪽에 동그라미 · 틀린 곳은 살짝 표시만(감점 없음) · 20초 동안 못 찾으면 남은 곳 하나가 반짝(힌트)
// 다섯을 다 찾으면 끝 — 시간 제한 없이 가장 빠른 시간(🖼️ 그림 맞추기와 같게 · GAMES clock) · 도중에 ✕면 찾은 수가 ⭐
// 방에 가구가 일곱보다 적으면 가구 상점 가구를 **이 게임 그림에만** 채운다(진우의 진짜 방은 안 바뀐다 — 저장을 안 만진다)
//
// 위쪽(엔진)은 순수 — rng·시각만 받는다(node 시험이 끝까지) · 아래쪽(runDiff)이 화면 · 가구 자리 셈은 houseview.boxOf와 같은 꼴(벽 줄 = 칸 × 1.3)
import { sfx } from './sfx.js';
import { musicMode } from './gamesong.js'; // 🎵 게임 음악 상태 (v335 · 순수)
import { FURN, HEAL, furnById, canPlace, turnOf } from './house.js'; // 🏠 집 규칙 (순수 — 저장을 안 만진다)
import { FURN_ART, FURN_ART_TURN } from './furnart.js'; // 🖍️ 코드로 그린 가구 그림 (순수 자료)

/** 보통 걸리는 시간(초) — 끝은 시간이 아니라 다섯을 다 찾을 때 (게임 목록에 적는 값) */
export const DIFF_SEC = 90;
/** 다른 곳 수 · 그림에 있어야 할 가구 수(모자라면 게임 그림에만 채움) · 힌트까지(ms) · 누른 곳 둘레 너그러움(% — 그림에 대해) */
export const DIFF_N = 5;
export const FILL_MIN = 7;
export const HINT_MS = 20000;
export const PAD = 3;
/** 벽 줄 높이 = 칸 × WALL_RATIO (houseview와 같은 값 — 시험이 맞춰 본다) */
export const WALL_RATIO = 1.3;
/** 다른 곳의 종류 */
export const KINDS = ['gone', 'extra', 'moved', 'swap'];
export const KIND_KO = { gone: '없어진 가구', extra: '더 있는 가구', moved: '옮겨진 가구', swap: '바뀐 가구' };
/** 그림에 채우거나 더 놓을 가구 — 💊 회복 캡슐은 뺀다(쉬는 포켓몬 장식이 있는 특별한 기계라) */
export const FILL_IDS = FURN.filter((d) => d.id !== HEAL).map((d) => d.id);

const own = (o, k) => !!o && Object.prototype.hasOwnProperty.call(o, k);
const pickOf = (arr, rng) => arr[Math.min(arr.length - 1, Math.floor(rng() * arr.length))];

/** 방 전체 높이(칸) */
export function diffRows(size) {
  return WALL_RATIO + size.H;
}
/** 가구 하나의 자리(그림에 대한 %) — houseview.boxOf와 같은 셈 */
export function diffBox(size, id, x, y, r = 0) {
  const d = furnById(id);
  if (!d || !size) return null;
  const rows = diffRows(size);
  const top = d.at === 'wall' ? (WALL_RATIO - 1) / 2 : WALL_RATIO + y;
  const down = turnOf(d, r) === 1;
  return { left: (x / size.W) * 100, top: (top / rows) * 100, width: ((down ? 1 : d.w) / size.W) * 100, height: ((down ? d.w : 1) / rows) * 100 };
}
/** 가구가 차지하는 칸 열쇠 — 바닥 "x,y" · 벽 "w:x" (house.js와 같은 꼴) */
function cellKeys(d, x, y, r = 0) {
  const out = [];
  const down = turnOf(d, r) === 1;
  for (let i = 0; i < d.w; i++) out.push(d.at === 'wall' ? `w:${x + i}` : down ? `${x},${y + i}` : `${x + i},${y}`);
  return out;
}
/** 그 칸 둘레(위아래 옆) — 다른 곳끼리 바짝 붙지 않게 */
function around(key) {
  if (key.startsWith('w:')) { const x = Number(key.slice(2)); return [key, `w:${x - 1}`, `w:${x + 1}`]; }
  const [x, y] = key.split(',').map(Number);
  return [key, `${x - 1},${y}`, `${x + 1},${y}`, `${x},${y - 1}`, `${x},${y + 1}`];
}
/** 그 가구를 놓을 수 있는 모든 자리 (순수) — 두 그림 모두에서 비었고 다른 곳 둘레와 안 겹치는 */
function freeSpots(size, d, rooms, reserved) {
  const out = [];
  if (d.at === 'wall') {
    for (let x = 0; x + d.w <= size.WALL; x++) out.push({ x, y: 0 });
  } else {
    for (let y = 0; y < size.H; y++) for (let x = 0; x + d.w <= size.W; x++) out.push({ x, y });
  }
  return out.filter((p) => rooms.every((room) => canPlace(size, room, d.id, p.x, p.y, undefined, 0)) && cellKeys(d, p.x, p.y).every((k) => !reserved.has(k)));
}

/**
 * 그림 바탕 (순수) — 진우 방(raw = { wall, floor, items })을 그대로 · 가구가 FILL_MIN보다 적으면 FILL_IDS에서 채운다(게임 그림에만)
 * → { wall, floor, items: [{ u, id, x, y, r?, f? }] } · 입력은 안 바꾼다
 */
export function diffScene(raw, size, rng = Math.random) {
  const items = [];
  const room = { items };
  for (const it of raw && Array.isArray(raw.items) ? raw.items : []) {
    if (!it || !furnById(it.id)) continue;
    const r = it.r === 1 ? 1 : 0;
    if (!canPlace(size, room, it.id, it.x, it.y, undefined, r)) continue; // 깨진 자리·겹침은 뺀다
    items.push({ u: items.length + 1, id: it.id, x: it.x, y: it.y, ...(r ? { r } : {}), ...(it.f ? { f: 1 } : {}) });
  }
  for (let k = 0; items.length < FILL_MIN && k < 60; k++) {
    const d = furnById(pickOf(FILL_IDS, rng));
    const spots = freeSpots(size, d, [room], new Set());
    if (!spots.length) continue;
    const p = pickOf(spots, rng);
    items.push({ u: items.length + 1, id: d.id, x: p.x, y: p.y });
  }
  return { wall: raw && raw.wall ? String(raw.wall) : '', floor: raw && raw.floor ? String(raw.floor) : '', items };
}

/**
 * 다른 곳 만들기 (순수) — 왼쪽은 바탕 그대로 · 오른쪽만 바꾼다
 * → { left, right, spots: [{ kind, ko, boxes: [그림에 대한 % 상자] }] } · 한 가구는 한 번만 · 다른 곳끼리 둘레가 안 겹친다
 * 종류는 번갈아(없어짐 · 더 있음 · 옮겨짐 · 바뀜) — 만들 수 없으면 다음 종류로
 */
export function diffMake(scene, size, rng = Math.random, n = DIFF_N) {
  const left = scene.items.map((it) => ({ ...it }));
  const right = left.map((it) => ({ ...it }));
  const spots = [];
  const usedU = new Set();
  const reserved = new Set();
  const reserve = (d, x, y, r) => { for (const k of cellKeys(d, x, y, r)) for (const a of around(k)) reserved.add(a); };
  let nextU = Math.max(0, ...left.map((it) => it.u)) + 1;
  const free = (filter) => left.filter((it) => !usedU.has(it.u) && filter(furnById(it.id), it) && cellKeys(furnById(it.id), it.x, it.y, it.r).every((k) => !reserved.has(k)));
  const order = KINDS.slice();
  for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
  const make = {
    gone() {
      const c = free(() => true);
      if (!c.length) return null;
      const it = pickOf(c, rng);
      const d = furnById(it.id);
      usedU.add(it.u);
      reserve(d, it.x, it.y, it.r);
      right.splice(right.findIndex((x) => x.u === it.u), 1);
      return { kind: 'gone', boxes: [diffBox(size, it.id, it.x, it.y, it.r)] };
    },
    swap() {
      const c = free((d) => FILL_IDS.some((id) => id !== d.id && furnById(id).at === d.at && furnById(id).w === d.w && furnById(id).emoji !== d.emoji));
      if (!c.length) return null;
      const it = pickOf(c, rng);
      const d = furnById(it.id);
      const to = pickOf(FILL_IDS.filter((id) => id !== d.id && furnById(id).at === d.at && furnById(id).w === d.w && furnById(id).emoji !== d.emoji), rng);
      usedU.add(it.u);
      reserve(d, it.x, it.y, it.r);
      const ri = right.find((x) => x.u === it.u);
      ri.id = to;
      if (!canPlace(size, { items: right }, to, ri.x, ri.y, ri.u, ri.r || 0)) { delete ri.r; } // 바뀐 가구가 돌릴 수 없는 가구면 가로로
      return { kind: 'swap', boxes: [diffBox(size, it.id, it.x, it.y, it.r)] };
    },
    moved() {
      const c = free((d) => d.w === 1);
      for (const it of c.slice().sort(() => rng() - 0.5)) {
        const d = furnById(it.id);
        const blocked = new Set(reserved);
        for (const k of cellKeys(d, it.x, it.y, it.r)) for (const a of around(k)) blocked.add(a); // 제자리 둘레로는 안 옮김(옮긴 게 보이게)
        const spotsTo = freeSpots(size, d, [{ items: left }, { items: right }], blocked);
        if (!spotsTo.length) continue;
        const p = pickOf(spotsTo, rng);
        usedU.add(it.u);
        reserve(d, it.x, it.y, it.r);
        reserve(d, p.x, p.y, 0);
        const ri = right.find((x) => x.u === it.u);
        ri.x = p.x; ri.y = p.y; delete ri.r;
        return { kind: 'moved', boxes: [diffBox(size, it.id, it.x, it.y, it.r), diffBox(size, it.id, p.x, p.y, 0)] };
      }
      return null;
    },
    extra() {
      const ids = FILL_IDS.filter((id) => furnById(id).w === 1).sort(() => rng() - 0.5);
      for (const id of ids) {
        const d = furnById(id);
        const spotsTo = freeSpots(size, d, [{ items: left }, { items: right }], reserved);
        if (!spotsTo.length) continue;
        const p = pickOf(spotsTo, rng);
        reserve(d, p.x, p.y, 0);
        right.push({ u: nextU++, id, x: p.x, y: p.y });
        return { kind: 'extra', boxes: [diffBox(size, id, p.x, p.y, 0)] };
      }
      return null;
    },
  };
  for (let k = 0; spots.length < n && k < n * 4; k++) {
    const kind = order[k % order.length];
    const sp = make[kind]();
    if (sp) spots.push({ ...sp, ko: KIND_KO[kind] });
  }
  return { left, right, spots };
}

/** 누른 곳이 상자 안인가 (순수) — px·py는 그림에 대한 % · 둘레 PAD% 너그럽게 */
export function inBox(b, px, py, pad = PAD) {
  return px >= b.left - pad && px <= b.left + b.width + pad && py >= b.top - pad && py <= b.top + b.height + pad;
}

/** 새 판 (순수) */
export function diffStart(now, spots) {
  return { t0: now, spots: Array.isArray(spots) ? spots : [], found: [], lastFind: now, hint: -1, doneAt: 0, sec: 0, score: 0, misses: 0 };
}

/** 걸린 시간(초) — 1초보다 짧으면 1 */
function secOf(s) {
  return Math.max(1, Math.round((s.doneAt - s.t0) / 1000));
}

/**
 * 그림을 눌렀다 (순수) — px·py = 그림에 대한 % → { kind: 'found'(i) | 'done'(i · sec) | 'miss' | 'over' }
 * 아직 못 찾은 다른 곳 가운데 그 자리를 덮는 첫째 · 이미 찾은 곳을 또 누르면 miss(셈 없음)
 */
export function diffTap(s, px, py, now) {
  if (s.doneAt) return { kind: 'over' };
  const x = Number(px);
  const y = Number(py);
  const i = Number.isFinite(x) && Number.isFinite(y) ? s.spots.findIndex((sp, k) => !s.found.includes(k) && sp.boxes.some((b) => inBox(b, x, y))) : -1;
  if (i < 0) { s.misses += 1; return { kind: 'miss' }; }
  s.found.push(i);
  s.score += 1;
  s.lastFind = now;
  if (s.hint === i) s.hint = -1;
  if (s.found.length < s.spots.length) return { kind: 'found', i };
  s.doneAt = Number.isFinite(now) && now > s.t0 ? now : s.t0 + 1;
  s.sec = secOf(s);
  return { kind: 'done', i, sec: s.sec };
}

/** 힌트 (순수) — 마지막으로 찾은 뒤 HINT_MS가 지나면 남은 곳 하나(맨 앞) → 그 번호 · 이미 힌트가 있으면 -1(그대로) */
export function diffHint(s, now) {
  if (s.doneAt || s.hint >= 0 || !(now - s.lastFind >= HINT_MS)) return -1;
  const i = s.spots.findIndex((sp, k) => !s.found.includes(k));
  if (i < 0) return -1;
  s.hint = i;
  return i;
}

/** 멈췄던 만큼 뒤로 민다 (순수) — 앱을 내린 동안은 걸린 시간·힌트 시계에 안 들어간다 · 다 찾은 뒤엔 그대로 */
export function diffShift(s, ms) {
  const d = Math.floor(Number(ms) || 0);
  if (!(d > 0) || s.doneAt) return;
  s.t0 += d;
  s.lastFind += d;
}

// ───────────────────── 화면 (여기부터 브라우저) ─────────────────────

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}
const attr = (o) => Object.entries(o).map(([k, v]) => `${k}="${String(v).replace(/[&<>"]/g, '')}"`).join(' ');
/** 코드로 그린 가구 그림 → SVG 글자 (furnart.furnArtSvg와 같은 꼴 · 🔄 세로 그림도) */
function artHtml(a) {
  return `<svg class="house-art is-${a.shape}" viewBox="${a.vb}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${a.parts.map(([t, o]) => `<${t} ${attr(o)}/>`).join('')}</svg>`;
}

/**
 * 한 판 돌리기 → { done: Promise<{ score, quit, sec? }>, stop(), music() }
 * stage = 그릴 자리 · o.scene = { size: { W, H, WALL }, wall: 벽 색, floor: 바닥 색, items } (gameview diffPrep — 진우 1층 방) · o.rng
 */
export function runDiff(stage, o = {}) {
  const now = () => performance.now();
  const rng = typeof o.rng === 'function' ? o.rng : Math.random;
  const sc = o.scene && typeof o.scene === 'object' ? o.scene : {};
  const size = sc.size && sc.size.W > 0 && sc.size.H > 0 ? sc.size : { W: 8, H: 6, WALL: 8 };
  const scene = diffScene({ items: sc.items }, size, rng);
  const made = diffMake(scene, size, rng);
  const rows = diffRows(size);
  stage.innerHTML = '';
  const root = el('div', 'gd gq');
  const top = el('div', 'gd-top');
  const scoreEl = el('span', 'gd-score', '⭐ 0');
  const left = el('span', 'gq-left', '');
  top.append(scoreEl, left);
  const pics = el('div', 'gq-pics');
  const picEls = [];
  const markEls = [];
  for (const [k, items] of [[0, made.left], [1, made.right]]) {
    const pic = el('div', 'house-room gq-pic');
    pic.style.aspectRatio = `${size.W} / ${rows}`;
    pic.style.setProperty('--ar', String(size.W / rows));
    pic.setAttribute('aria-label', k ? '오른쪽 그림' : '왼쪽 그림');
    const wall = el('div', 'house-wall');
    wall.style.height = `${(WALL_RATIO / rows) * 100}%`;
    wall.style.background = sc.wall || '#fbf3e4';
    const floor = el('div', 'house-floor');
    floor.style.top = `${(WALL_RATIO / rows) * 100}%`;
    floor.style.backgroundColor = sc.floor || '#e2c79f';
    pic.append(wall, floor);
    for (const it of items) {
      const d = furnById(it.id);
      const turn = turnOf(d, it.r);
      const b = diffBox(size, it.id, it.x, it.y, turn);
      const e = el('div', `house-item gq-item is-${d.at}${it.f ? ' is-flip' : ''}${turn ? ' is-turn' : d.w > 1 ? ' is-wide' : ''}`);
      Object.assign(e.style, { left: `${b.left}%`, top: `${b.top}%`, width: `${b.width}%`, height: `${b.height}%`, zIndex: String(d.at === 'wall' ? 5 : 10 + it.y + (turn ? d.w - 1 : 0)) });
      const art = turn && own(FURN_ART_TURN, d.id) ? FURN_ART_TURN[d.id] : d.art && own(FURN_ART, d.art) ? FURN_ART[d.art] : null;
      const em = el('span', 'house-emoji');
      if (art) em.innerHTML = artHtml(art);
      else em.textContent = d.emoji;
      e.appendChild(em);
      pic.appendChild(e);
    }
    const marks = el('div', 'gq-marks');
    pic.appendChild(marks);
    pics.appendChild(pic);
    picEls.push(pic);
    markEls.push(marks);
  }
  const hint = el('p', 'gq-hint', '두 그림에서 다른 곳 다섯 개를 톡! 어느 그림을 눌러도 돼요');
  const fx = el('div', 'gd-fx');
  const banner = el('div', 'gd-banner', '준비!');
  root.append(top, pics, hint, fx, banner);
  stage.appendChild(root);

  const measure = () => {
    for (const p of picEls) {
      const w = p.getBoundingClientRect().width;
      if (w > 0) p.style.setProperty('--cell', `${(w / size.W).toFixed(2)}px`);
    }
  };
  let s = null;
  let timer = 0;
  let frame = 0;
  let pausedAt = 0;
  let finished = false;
  let resolveDone;
  const done = new Promise((r) => { resolveDone = r; });
  const timers = new Set();
  const later = (fn, ms) => {
    const id = setTimeout(() => { timers.delete(id); fn(); }, ms);
    timers.add(id);
  };
  const leftText = () => { left.textContent = s ? `남은 곳 ${s.spots.length - s.found.length}` : ''; };

  /** 동그라미 — 그 다른 곳의 상자마다 두 그림 모두 */
  const ring = (i, cls) => {
    const sp = made.spots[i];
    for (const marks of markEls) {
      for (const b of sp.boxes) {
        const r = el('span', `gq-ring ${cls}`);
        Object.assign(r.style, { left: `${b.left - 1.5}%`, top: `${b.top - 1.5}%`, width: `${b.width + 3}%`, height: `${b.height + 3}%` });
        r.dataset.i = String(i);
        marks.appendChild(r);
      }
    }
  };
  const tapAt = (k, e) => {
    if (e && typeof e.preventDefault === 'function') e.preventDefault();
    if (!s || finished || pausedAt || s.doneAt) return;
    const r = picEls[k].getBoundingClientRect();
    if (!(r.width > 0 && r.height > 0)) return;
    const px = (((Number(e.clientX) || 0) - r.left) / r.width) * 100;
    const py = (((Number(e.clientY) || 0) - r.top) / r.height) * 100;
    const t = now();
    const res = diffTap(s, px, py, t);
    if (res.kind === 'miss') {
      const m = el('span', 'gq-miss', '✕');
      Object.assign(m.style, { left: `${px}%`, top: `${py}%` });
      markEls[k].appendChild(m);
      later(() => m.remove(), 700);
      return;
    }
    if (res.kind !== 'found' && res.kind !== 'done') return;
    for (const marks of markEls) for (const h of marks.children.slice ? marks.children.slice() : [...marks.children]) if (h.dataset && h.dataset.i === String(res.i) && /is-hint/.test(h.className)) h.remove(); // 찾은 곳의 힌트 반짝은 지운다
    ring(res.i, 'is-found');
    scoreEl.textContent = `⭐ ${s.score}`;
    leftText();
    sfx.ding();
    if (res.kind === 'done') finish(false);
  };
  picEls.forEach((p, k) => p.addEventListener('pointerdown', (e) => tapAt(k, e)));

  const onVis = () => {
    if (!s || finished) return;
    if (document.hidden) { pausedAt = now(); root.classList.add('is-paused'); return; }
    if (pausedAt) { diffShift(s, now() - pausedAt); pausedAt = 0; root.classList.remove('is-paused'); }
  };
  const hasWin = typeof window !== 'undefined' && typeof window.addEventListener === 'function';
  let settled = false;
  let settleTimer = 0;
  const settle = (r) => {
    if (settled) return;
    settled = true;
    clearTimeout(settleTimer);
    resolveDone(r);
  };
  const finish = (quit) => {
    if (finished) { if (quit) settle({ score: s ? s.score : 0, quit: false, sec: s && s.doneAt ? s.sec : 0 }); return; }
    finished = true;
    clearInterval(timer);
    for (const id of timers) clearTimeout(id);
    timers.clear();
    if (frame && typeof cancelAnimationFrame === 'function') cancelAnimationFrame(frame);
    document.removeEventListener('visibilitychange', onVis);
    if (hasWin) window.removeEventListener('resize', measure);
    const score = s ? s.score : 0;
    if (quit || !s || !s.doneAt) { settle({ score, quit: true }); return; } // 다 못 찾고 그만둠 — 찾은 수가 ⭐ (시간 기록 없음)
    banner.textContent = '완성!';
    banner.classList.add('is-on');
    sfx.success();
    settleTimer = setTimeout(() => settle({ score, quit: false, sec: s.sec }), 1500);
  };
  const loop = () => {
    if (!s || pausedAt || finished) return;
    const i = diffHint(s, now());
    if (i >= 0) {
      const sp = made.spots[i];
      const b = sp.boxes[0];
      for (const marks of markEls) {
        const h = el('span', 'gq-ring is-hint', '✨');
        Object.assign(h.style, { left: `${b.left - 1.5}%`, top: `${b.top - 1.5}%`, width: `${b.width + 3}%`, height: `${b.height + 3}%` });
        h.dataset.i = String(i);
        marks.appendChild(h);
      }
      sfx.twinkle();
    }
  };
  const startLoop = () => { timer = setInterval(loop, 250); }; // 힌트 시계만 — 움직이는 그림이 없다

  document.addEventListener('visibilitychange', onVis);
  if (hasWin) window.addEventListener('resize', measure);
  later(() => {
    if (finished) return;
    banner.classList.remove('is-on');
    measure();
    s = diffStart(now(), made.spots);
    leftText();
    root.classList.add('is-go');
    if (document.hidden) { pausedAt = now(); root.classList.add('is-paused'); }
    startLoop();
  }, 800);
  banner.classList.add('is-on');
  measure();
  sfx.tick();

  // 🎵 게임 음악(v335) — 다 찾으면 stop · 시간 제한이 없어 서두르기(hurry)는 없다
  return { done, stop: () => finish(true), music: () => musicMode({ over: finished || !!(s && s.doneAt) }), made };
}
