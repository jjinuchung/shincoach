// 🔀 타입 나누기 — 🎮 게임기 미니 게임 열셋째 (v345 · 2026-10-26 아버님 "다음 미니 게임 진행하자" → 기본안 "이대로")
// 위에서 포켓몬 카드(그림·이름)가 천천히 내려온다 — 아래 타입 상자 가운데 맞는 상자를 톡(카드를 끌어 상자에 넣어도 된다)
// 맞히면 ⭐1 · 절반도 내려오기 전에 맞히면 ⭐2 · 틀리면 「피카츄는 전기 타입!」처럼 알려 주고 다음 카드(감점 없음) · 바닥까지 가도 감점 없음
// 타입이 둘인 포켓몬은 둘 중 어느 상자든 정답 · 처음 다섯 장은 🔥 불꽃 · 💧 물 · 🌿 풀 → 여섯 장마다 다른 타입 셋 · 뒤로 갈수록 빨리 · 끝 무렵 상자 넷
// 타입은 대여행 때 PokeAPI에서 받은 표(montypes.js 592마리) 그대로 · 진우가 잡은 포켓몬을 먼저 · 한 판 40초 · 점수는 최고 기록만
//
// 위쪽(엔진)은 순수 — 시각(ms)과 rng만 받는다(node 시험이 가짜 시계로 끝까지) · 아래쪽(runSort)이 화면
// 자리는 "칸": 마당 너비 100 · 높이 70(y는 위에서 아래로) · 카드는 위 4칸에서 아래 30칸까지 · 상자 줄은 그 아래 · 앱을 내리면 멈췄다가 이어서
import { sfx } from './sfx.js';
import { musicMode } from './gamesong.js'; // 🎵 게임 음악 상태 (v335 · 순수)
import { TYPE_KO } from './journey.js'; // 타입 이름 — 대여행과 같은 말 (순수)

/** 한 판(초) · 마당(칸) */
export const SORT_SEC = 40;
export const SORT_W = 100;
export const SORT_H = 70;
/** 카드가 내려오는 곳 (칸) · 카드 크기 */
export const TOP_Y = 4;
export const BOT_Y = 30;
export const CARD_W = 20;
/** 맞았다·틀렸다 말이 뜨는 높이 (칸) — 상자 줄 바로 위 */
export const SAY_Y = 44;
/** 첫 카드 · 답한 뒤 다음 카드까지 (ms) — 맞았는지 보여 주는 틈 */
export const FIRST_MS = 700;
export const GAP_MS = 550;
/** 처음 상자 셋 · 처음 상자로 내는 카드 수 · 그 뒤 상자를 바꾸는 카드 수 · 이 뒤부터(ms) 상자 넷 */
export const FIRST_SET = ['fire', 'water', 'grass'];
export const FIRST_CARDS = 5;
export const SET_CARDS = 6;
export const FOUR_FROM = 18000; // 25초였다 (v351 — 진우 「너무 쉬워요」 → 아버님 「추천대로」)
/** 빨리 맞힌 ⭐2 — 내려온 몫이 이보다 적을 때 */
export const FAST = 0.5;
/** 같은 포켓몬이 이만큼 안에 다시 안 나온다 */
const RECENT = 8;
/** 상자로 쓸 타입 — 그림 있는 포켓몬이 이만큼은 있어야 */
const TYPE_MIN = 2;
const STEP_MS = 50;

/** 그림 있는 포켓몬이 이만큼은 있어야 한 판 (sortReady · gameview sortPrep — 모자라면 몇 장 더 받아 보고, 그래도 모자라면 판을 안 쓴다) */
export const SORT_FEW = 12;
/** 상자로 쓸 타입(카드가 TYPE_MIN 이상)도 이만큼은 있어야 한 판 — 끝 무렵 상자 넷 (🔍 Codex 149차 #1) */
export const SORT_KINDS = 4;
/** 타입마다 색 (상자) — 흔히 쓰는 타입 색 · 글자는 흰색이 안 보이면 진한 색으로 */
export const TYPE_COLOR = {
  normal: '#a8a77a', fire: '#ee8130', water: '#6390f0', electric: '#f7d02c', grass: '#7ac74c', ice: '#96d9d6',
  fighting: '#c22e28', poison: '#a33ea1', ground: '#e2bf65', flying: '#a98ff3', psychic: '#f95587', bug: '#a6b91a',
  rock: '#b6a136', ghost: '#735797', dragon: '#6f35fc', dark: '#705746', steel: '#b7b7ce', fairy: '#d685ad',
};
/** 밝은 상자는 진한 글씨 */
export const TYPE_DARK_TEXT = new Set(['electric', 'ice', 'ground', 'normal', 'steel', 'bug', 'rock', 'fairy', 'grass']);

const nz = (v) => {
  const n = Math.floor(Number(v) || 0);
  return n > 0 ? n : 0;
};
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

/** 빠르기 (순수) — 지난 시간 ms → 카드가 다 내려오는 데(ms) · 4.4초 → 2.4초 (5.2→2.8이었다 (v351 — 진우 「너무 쉬워요」 → 아버님 「추천대로」)) */
export function sortFall(ms) {
  const k = clamp((Number(ms) || 0) / (SORT_SEC * 1000), 0, 1);
  return Math.round(4400 - 2000 * k);
}

/** 쓸 수 있는 카드 (순수) — [{ id, types, mine }] 가운데 타입이 있는 것만 · 같은 번호는 하나 */
export function sortPool(list) {
  const seen = new Set();
  const out = [];
  for (const p of Array.isArray(list) ? list : []) {
    if (!p || !Number.isInteger(p.id) || seen.has(p.id) || !Array.isArray(p.types)) continue;
    const types = p.types.filter((t) => Object.prototype.hasOwnProperty.call(TYPE_KO, t));
    if (!types.length) continue;
    seen.add(p.id);
    out.push({ id: p.id, types, mine: !!p.mine });
  }
  return out;
}

/** 타입마다 카드 수 (순수) */
function typeCount(pool) {
  const c = {};
  for (const p of pool) for (const t of p.types) c[t] = (c[t] || 0) + 1;
  return c;
}

/** 상자로 쓸 수 있는 타입 수 (순수) — 카드가 TYPE_MIN 이상인 타입 */
export function sortKinds(pool) {
  const c = typeCount(sortPool(pool));
  return Object.keys(TYPE_KO).filter((t) => (c[t] || 0) >= TYPE_MIN).length;
}

/**
 * 한 판을 열 수 있나 (순수 · gameview sortPrep) — 그림 SORT_FEW장 이상 + 상자로 쓸 타입 SORT_KINDS 이상
 * 그림이 열둘이어도 타입이 모두 다르면 상자를 못 만들어 40초 빈 화면이 된다 (🔍 Codex 149차 #1)
 */
export function sortReady(pool) {
  return sortPool(pool).length >= SORT_FEW && sortKinds(pool) >= SORT_KINDS;
}

/** 새 판 (순수) — pool = sortPool 결과 · kinds = 상자로 쓸 수 있는 타입 수(상자는 이보다 많이 안 만든다) */
export function sortStart(now, pool) {
  const p = sortPool(pool);
  return {
    t0: now, end: now + SORT_SEC * 1000, last: now, next: now + FIRST_MS,
    pool: p, kinds: sortKinds(p), boxes: [], setLeft: 0, first: true, card: null, seq: 0, recent: [],
    score: 0, right: 0, wrong: 0, drops: 0, fast: 0, sets: 0,
  };
}

/** 다음 상자 (순수) — 처음엔 불꽃·물·풀 · 그 뒤 카드가 넉넉한 타입에서 n개(앞과 같은 묶음은 피함) */
export function sortSet(s, n, rng) {
  const c = typeCount(s.pool);
  if (s.first && FIRST_SET.every((t) => (c[t] || 0) >= TYPE_MIN) && n === FIRST_SET.length) return FIRST_SET.slice();
  const ok = Object.keys(TYPE_KO).filter((t) => (c[t] || 0) >= TYPE_MIN);
  const pickN = () => {
    const a = ok.slice();
    const out = [];
    while (out.length < n && a.length) out.push(a.splice(Math.min(a.length - 1, Math.floor(rng() * a.length)), 1)[0]);
    return out;
  };
  let set = pickN();
  const same = (x) => x.length === s.boxes.length && x.every((t) => s.boxes.includes(t));
  for (let k = 0; k < 4 && same(set); k++) set = pickN();
  return set;
}

/** 카드 하나 고르기 (순수) — 상자 타입이 하나라도 있는 포켓몬 · 최근에 나온 것은 피함 · 잡은 포켓몬을 먼저(반쯤) */
function pickCard(s, rng) {
  const fits = s.pool.filter((p) => p.types.some((t) => s.boxes.includes(t)));
  if (!fits.length) return null;
  const fresh = fits.filter((p) => !s.recent.includes(p.id));
  const from = fresh.length ? fresh : fits;
  const mine = from.filter((p) => p.mine);
  const list = mine.length && rng() < 0.6 ? mine : from;
  return list[Math.min(list.length - 1, Math.floor(rng() * list.length))];
}

/** 카드가 지금 내려온 몫 0~1 (순수) */
export function sortProg(card, t) {
  return clamp((t - card.born) / card.fall, 0, 1);
}
/** 카드의 지금 높이 (칸) */
export function sortY(card, t) {
  return TOP_Y + (BOT_Y - TOP_Y) * sortProg(card, t);
}

function spawn(s, t, rng, ev) {
  const ms = t - s.t0;
  const n = Math.min(ms >= FOUR_FROM ? 4 : 3, s.kinds); // 타입이 모자라면 만들 수 있는 만큼만 — 카드마다 상자를 다시 만들지 않게
  if (s.setLeft <= 0 || s.boxes.length !== n) {
    const wasFirst = s.first;
    s.boxes = sortSet(s, n, rng);
    s.first = false;
    s.setLeft = wasFirst && n === 3 ? FIRST_CARDS : SET_CARDS;
    s.sets += 1;
    ev.set = s.boxes.slice();
  }
  const p = pickCard(s, rng);
  if (!p) { s.setLeft = 0; s.next = t + GAP_MS; return; } // 이 상자로 낼 카드가 없다 — 다음에 상자를 바꾼다
  s.recent = [...s.recent, p.id].slice(-RECENT);
  s.card = { n: ++s.seq, id: p.id, types: p.types, born: t, fall: sortFall(ms) };
  ev.added = s.card;
}

/**
 * 시계 (순수) — 지난번부터 now까지 50ms씩 · 판 끝을 넘지 않는다
 * → { added: 새 카드 | null, set: 새 상자 | null, drop: 바닥까지 간 카드 | null }
 */
export function sortTick(s, now, rng = Math.random) {
  const ev = { added: null, set: null, drop: null };
  const to = Math.min(Number(now) || 0, s.end);
  while (s.last < to) {
    const dt = Math.min(STEP_MS, to - s.last);
    s.last += dt;
    const t = s.last;
    if (s.card && t - s.card.born >= s.card.fall) {
      ev.drop = s.card;
      s.drops += 1;
      s.card = null;
      s.setLeft -= 1;
      s.next = t + GAP_MS;
    }
    if (!s.card && t >= s.next) spawn(s, t, rng, ev);
  }
  return ev;
}

/**
 * 상자를 골랐다 (순수) — i = 상자 번호 → { kind: 'right'(+pts) | 'wrong' | 'none'(카드 없음·없는 상자) | 'over', card?, box?, pts? }
 * 정답 = 카드 타입 가운데 하나가 그 상자 · 절반도 안 내려왔으면 ⭐2
 */
export function sortPick(s, i, now) {
  if (!(Number(now) < s.end)) return { kind: 'over' };
  if (!s.card || !Number.isInteger(i) || i < 0 || i >= s.boxes.length) return { kind: 'none' };
  const card = s.card;
  const box = s.boxes[i];
  s.card = null;
  s.setLeft -= 1;
  s.next = now + GAP_MS;
  if (!card.types.includes(box)) {
    s.wrong += 1;
    return { kind: 'wrong', card, box };
  }
  const fast = sortProg(card, now) < FAST;
  const pts = fast ? 2 : 1;
  s.score += pts;
  s.right += 1;
  if (fast) s.fast += 1;
  return { kind: 'right', card, box, pts };
}

/** 멈췄던 만큼 뒤로 민다 (순수) — 앱을 내렸다 돌아오면 남은 시간·카드 높이가 그대로 */
export function sortShift(s, ms) {
  const d = nz(ms);
  if (!d) return;
  s.t0 += d; s.end += d; s.last += d; s.next += d;
  if (s.card) s.card.born += d;
}

/** 틀렸을 때 알려 주는 말 (순수) — 「피카츄는 ⚡ 전기 타입!」 · 타입이 둘이면 「이상해씨는 풀·독 타입!」 */
export function typeLine(ko, types) {
  return `${ko}${josaNeun(ko)} ${types.map((t) => TYPE_KO[t] || t).join('·')} 타입!`;
}
/** 「은/는」 (순수) */
export function josaNeun(word) {
  const c = String(word || '').slice(-1).charCodeAt(0) - 0xAC00;
  if (!(c >= 0 && c <= 11171)) return '는';
  return c % 28 === 0 ? '는' : '은';
}

// ───────────────────── 화면 (여기부터 브라우저) ─────────────────────

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}

/**
 * 한 판 돌리기 → { done: Promise<{ score, quit }>, stop(), music() }
 * stage = 그릴 자리 · o.pool = [{ id, ko, url, types, mine }] (gameview가 잡은 포켓몬 먼저) · o.rng
 */
export function runSort(stage, o = {}) {
  const now = () => performance.now();
  const rng = typeof o.rng === 'function' ? o.rng : Math.random;
  const list = (Array.isArray(o.pool) ? o.pool : []).filter((p) => p && p.url);
  const byId = new Map(list.map((p) => [p.id, p]));
  stage.innerHTML = '';
  const root = el('div', 'gd gk');
  root.style.setProperty('--gd-sec', `${SORT_SEC}s`);
  const top = el('div', 'gd-top');
  const scoreEl = el('span', 'gd-score', '⭐ 0');
  const time = el('div', 'gd-time');
  time.appendChild(el('i'));
  top.append(scoreEl, time);
  const field = el('div', 'gk-field');
  const cardEl = el('div', 'gk-card');
  const artEl = el('span', 'gk-art');
  const nameEl = el('span', 'gk-name');
  cardEl.append(artEl, nameEl);
  const boxRow = el('div', 'gk-boxes');
  field.append(cardEl, boxRow);
  const hint = el('p', 'gk-hint', '맞는 타입 상자를 톡! (끌어 넣어도 돼요)');
  const fx = el('div', 'gd-fx');
  const banner = el('div', 'gd-banner', '준비!');
  root.append(top, field, hint, fx, banner);
  stage.appendChild(root);

  let unit = 3;
  const measure = () => {
    const w = field.getBoundingClientRect().width;
    if (w > 0) unit = w / SORT_W;
  };
  let s = null;
  let timer = 0;
  let frame = 0;
  let pausedAt = 0;
  let finished = false;
  let drag = null; // { id, x0, y0 } 카드를 끄는 손가락 하나
  let boxEls = [];
  let resolveDone;
  const done = new Promise((r) => { resolveDone = r; });
  const timers = new Set();
  const later = (fn, ms) => {
    const id = setTimeout(() => { timers.delete(id); fn(); }, ms);
    timers.add(id);
  };

  // 맞았다·「○○는 △ 타입!」은 상자 줄 바로 위 가운데에 — 카드보다 앞(css .gk .gd-fx)이라 가려지지 않는다
  const fly = (text, cls) => {
    const f = el('span', `gd-fly gk-say ${cls || ''}`, text);
    const a = field.getBoundingClientRect();
    const b = root.getBoundingClientRect();
    f.style.left = `${(a.left - b.left + a.width / 2).toFixed(1)}px`;
    f.style.top = `${(a.top - b.top + SAY_Y * unit).toFixed(1)}px`;
    fx.appendChild(f);
    later(() => f.remove(), 1400);
  };
  const drawBoxes = () => {
    boxRow.innerHTML = '';
    boxEls = s.boxes.map((t, i) => {
      const b = el('button', `gk-box is-${t}${TYPE_DARK_TEXT.has(t) ? ' is-dark' : ''}`, TYPE_KO[t] || t);
      b.type = 'button';
      b.style.backgroundColor = TYPE_COLOR[t] || '#888';
      b.setAttribute('aria-label', `${TYPE_KO[t] || t} 타입 상자`);
      b.addEventListener('pointerdown', (e) => { e.preventDefault(); pick(i, shown()); });
      b.addEventListener('click', (e) => { if (e.detail === 0) pick(i, shown()); }); // ⌨️ Enter·스페이스
      boxRow.appendChild(b);
      return b;
    });
    boxRow.className = `gk-boxes is-${s.boxes.length}`;
  };
  const showCard = (card) => {
    const p = byId.get(card.id);
    artEl.innerHTML = '';
    if (p && p.url) {
      const img = el('img', 'gk-img');
      img.alt = '';
      img.draggable = false;
      img.addEventListener('error', () => { artEl.innerHTML = '<span class="gk-alt">❔</span>'; });
      img.src = p.url;
      artEl.appendChild(img);
    } else artEl.innerHTML = '<span class="gk-alt">❔</span>';
    nameEl.textContent = p ? p.ko : '';
    cardEl.className = 'gk-card is-on';
    cardEl.setAttribute('aria-label', p ? `${p.ko} — 어떤 타입일까?` : '포켓몬');
  };
  const draw = () => {
    if (!s || !s.card) return;
    const y = sortY(s.card, s.last);
    const dx = drag && drag.dx ? drag.dx : 0;
    const dy = drag && drag.dy ? drag.dy : 0;
    cardEl.style.transform = `translate3d(calc(-50% + ${dx.toFixed(1)}px), ${(y * unit + dy).toFixed(1)}px, 0)`;
  };
  const apply = (ev) => {
    if ((ev.drop || ev.added) && drag) { drag = null; cardEl.classList.remove('is-drag'); } // 끌던 카드가 바닥에 닿았다 — 새 카드는 손가락을 따라오지 않는다
    if (ev.drop) {
      cardEl.className = 'gk-card is-drop';
      const p = byId.get(ev.drop.id);
      fly(p ? typeLine(p.ko, ev.drop.types) : '놓쳤어요', '');
    }
    if (ev.set) drawBoxes();
    if (ev.added) showCard(ev.added);
  };
  /** 지금 화면에 보이는 카드 번호 (없으면 0) — 시계(loop)가 카드를 바꾸면 그 자리에서 그린다 */
  const shown = () => (s && s.card ? s.card.n : 0);
  // n = 누른 순간 보이던 카드 · 화면이 밀린 사이 시계가 카드를 바꿨으면 채점하지 않는다 — 안 보이던 새 카드를 앞 카드의 손길로 매기지 않게 (🔍 Codex 149차 #2)
  const pick = (i, n) => {
    if (!s || finished || pausedAt) return;
    const t = now();
    apply(sortTick(s, t, rng));
    if (!n || !s.card || s.card.n !== n) { draw(); return; }
    const r = sortPick(s, i, t);
    drag = null;
    if (r.kind !== 'right' && r.kind !== 'wrong') return;
    const p = byId.get(r.card.id);
    const b = boxEls[i];
    if (r.kind === 'right') {
      scoreEl.textContent = `⭐ ${s.score}`;
      cardEl.className = 'gk-card is-right';
      if (b) { b.classList.remove('is-ok'); void b.offsetWidth; b.classList.add('is-ok'); }
      fly(`+${r.pts}${r.pts > 1 ? ' 빨라요!' : ''}`, r.pts > 1 ? 'is-big' : '');
      sfx.ding();
    } else {
      cardEl.className = 'gk-card is-wrong';
      if (b) { b.classList.remove('is-no'); void b.offsetWidth; b.classList.add('is-no'); }
      fly(p ? typeLine(p.ko, r.card.types) : '앗!', '');
      sfx.tick();
    }
  };

  const onVis = () => {
    if (!s || finished) return;
    if (document.hidden) { pausedAt = now(); root.classList.add('is-paused'); drag = null; cardEl.classList.remove('is-drag'); draw(); return; }
    if (pausedAt) { sortShift(s, now() - pausedAt); pausedAt = 0; root.classList.remove('is-paused'); }
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
    if (finished) { if (quit) settle({ score: s ? s.score : 0, quit: false }); return; }
    finished = true;
    clearInterval(timer);
    for (const id of timers) clearTimeout(id);
    timers.clear();
    if (frame && typeof cancelAnimationFrame === 'function') cancelAnimationFrame(frame);
    document.removeEventListener('visibilitychange', onVis);
    document.removeEventListener('pointermove', move);
    document.removeEventListener('pointerup', up);
    document.removeEventListener('pointercancel', cancel);
    if (hasWin) window.removeEventListener('resize', measure);
    drag = null;
    for (const b of boxEls) b.disabled = true;
    const score = s ? s.score : 0;
    if (quit) { settle({ score, quit: true }); return; }
    banner.textContent = '끝!';
    banner.classList.add('is-on');
    sfx.success();
    settleTimer = setTimeout(() => settle({ score, quit: false }), 900);
  };
  const loop = () => {
    if (!s || pausedAt || finished) return;
    const t = now();
    apply(sortTick(s, t, rng));
    draw();
    if (t >= s.end) finish(false);
  };
  const startLoop = () => {
    if (typeof requestAnimationFrame === 'function') {
      const f = () => {
        if (finished) return;
        loop();
        if (!finished) frame = requestAnimationFrame(f);
      };
      frame = requestAnimationFrame(f);
    } else timer = setInterval(loop, 33);
  };

  // 카드 끌기 — 손가락 하나만 · 놓은 자리 아래 상자로 (상자 밖이면 제자리로 · 감점 없음)
  const pid = (e) => (e && e.pointerId !== undefined ? e.pointerId : 'touch');
  cardEl.addEventListener('pointerdown', (e) => {
    if (e && typeof e.preventDefault === 'function') e.preventDefault();
    if (!s || !s.card || finished || pausedAt || drag) return;
    drag = { id: pid(e), x0: Number(e.clientX) || 0, y0: Number(e.clientY) || 0, dx: 0, dy: 0, n: s.card.n };
    cardEl.classList.add('is-drag');
  });
  function move(e) {
    if (!drag || pid(e) !== drag.id) return;
    drag.dx = (Number(e.clientX) || 0) - drag.x0;
    drag.dy = (Number(e.clientY) || 0) - drag.y0;
    draw();
  }
  function up(e) {
    if (!drag || pid(e) !== drag.id) return;
    const d = drag;
    drag = null;
    cardEl.classList.remove('is-drag');
    const x = Number(e.clientX) || 0;
    const y = Number(e.clientY) || 0;
    const i = boxEls.findIndex((b) => { const r = b.getBoundingClientRect(); return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom; });
    if (i >= 0) pick(i, d.n); // 끌기 시작한 카드 그대로일 때만 (pick이 시계를 맞춘 뒤 본다)
    else draw();
  }
  function cancel(e) {
    if (!drag || pid(e) !== drag.id) return;
    drag = null;
    cardEl.classList.remove('is-drag');
    draw();
  }
  document.addEventListener('pointermove', move);
  document.addEventListener('pointerup', up);
  document.addEventListener('pointercancel', cancel);

  document.addEventListener('visibilitychange', onVis);
  if (hasWin) window.addEventListener('resize', measure);
  later(() => {
    if (finished) return;
    banner.classList.remove('is-on');
    measure();
    s = sortStart(now(), list);
    root.classList.add('is-go');
    if (document.hidden) { pausedAt = now(); root.classList.add('is-paused'); }
    startLoop();
  }, 800);
  banner.classList.add('is-on');
  measure();
  sfx.tick();

  return { done, stop: () => finish(true), music: () => musicMode({ over: finished, left: s ? s.end - (pausedAt || now()) : null }) };
}
