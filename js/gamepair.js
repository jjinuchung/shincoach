// 🃏 포켓몬 짝 맞추기 — 🎮 게임기 미니 게임 넷째 (v309 · 2026-10-21 아버님 "다음 진행하자" → 물음 둘 모두 추천안)
// 카드 12장(6쌍)에 **진우가 잡은 포켓몬**(기기에 그림이 있는 것 · 6마리가 안 되면 앱 포켓몬으로 채움) — 두 장씩 뒤집어 같은 포켓몬 찾기
// 한 판은 **60초 동안 짝 몇 개나**(12장을 다 맞히면 새 12장) · 짝 하나 ⭐1 · 틀린 짝은 0.8초 뒤 덮는다(감점 없음)
// 카드가 깔릴 때마다 **2초 동안 앞면을 보여 주고 덮는다**(외우는 재미 · 처음부터 찍지 않아도 되게)
//
// 위쪽(엔진)은 순수 — 시각(ms)과 rng만 받아 상태를 바꾼다(node 시험이 가짜 시계로 끝까지) · 아래쪽(runPair)이 화면 · 앱을 내리면 멈췄다가 이어서
import { sfx } from './sfx.js';
import { musicMode } from './gamesong.js'; // 🎵 게임 음악 상태 (v335 · 순수)

/** 한 판(초) · 한 번에 까는 짝 수 · 앞면 보여 주기 · 틀린 짝을 보여 주는 동안 · 다 맞힌 뒤 새 카드까지 (ms) */
export const PAIR_SEC = 60;
export const PAIR_PAIRS = 6;
export const PEEK_MS = 2000;
export const MISS_MS = 800;
export const CLEAR_MS = 700;

const nz = (v) => {
  const n = Math.floor(Number(v) || 0);
  return n > 0 ? n : 0;
};
function shuffle(list, rng) {
  const a = list.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.min(i, Math.floor(rng() * (i + 1)));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * 카드 포켓몬 고르기 (순수) — pool [{ id, mine }] → 잡은 것(mine) 먼저 섞어서 · 모자라면 나머지에서 · 같은 id는 한 번
 * → id PAIR_PAIRS개 · 모자라면 null
 */
export function pairPick(pool, rng = Math.random) {
  const seen = new Set();
  const mine = [];
  const rest = [];
  for (const p of Array.isArray(pool) ? pool : []) {
    const id = Number(p && p.id);
    if (!Number.isSafeInteger(id) || id <= 0 || seen.has(id)) continue;
    seen.add(id);
    (p.mine ? mine : rest).push(id);
  }
  const ids = [...shuffle(mine, rng), ...shuffle(rest, rng)].slice(0, PAIR_PAIRS);
  return ids.length >= PAIR_PAIRS ? ids : null;
}

/** 카드 깔기 (순수) — id마다 두 장 · 섞어서 · 앞면 보여 주기부터 */
export function pairDeal(s, now, ids, rng = Math.random) {
  s.cards = shuffle([...ids, ...ids], rng).map((id, i) => ({ i, id, open: false, done: false }));
  s.first = -1;
  s.lock = 0;
  s.shut = null;
  s.dealAt = 0;
  s.peekUntil = now + PEEK_MS;
  s.boards += 1;
  return s.cards;
}

/** 새 판 (순수) — 카드 포켓몬이 모자라면 카드 없이(cards []) */
export function pairStart(now, pool, rng = Math.random) {
  const s = {
    t0: now, end: now + PAIR_SEC * 1000, pool: Array.isArray(pool) ? pool : [], cards: [],
    first: -1, lock: 0, shut: null, dealAt: 0, peekUntil: 0, score: 0, pairs: 0, misses: 0, boards: 0,
  };
  const ids = pairPick(s.pool, rng);
  if (ids) pairDeal(s, now, ids, rng);
  return s;
}

/** 틀린 짝을 보여 줄 만큼 보여 줬으면 덮는다 → 덮은 두 장 번호 또는 null */
function settle(s, now) {
  if (!s.shut || now < s.lock) return null;
  const shut = s.shut;
  for (const k of shut) s.cards[k].open = false;
  s.shut = null;
  return shut;
}

/**
 * 카드를 눌렀다 (순수) → { kind, i, j?, pts?, shut? }
 *   'flip' 한 장 뒤집음 · 'match' 짝(+1) · 'clear' 짝(+1)이고 다 맞힘(CLEAR_MS 뒤 새 카드) · 'miss' 짝이 아님(MISS_MS 뒤 덮음 · 감점 없음)
 *   'peek' 앞면 보여 주는 중 · 'busy' 틀린 짝을 보여 주는 중·새 카드를 기다리는 중 · 'open' 이미 열린 카드 · 'over' 끝
 * 덮을 때가 지난 틀린 짝은 먼저 덮는다(shut)
 */
export function pairTap(s, i, now) {
  if (now >= s.end) return { kind: 'over' };
  if (!s.cards.length || s.dealAt) return { kind: 'busy' };
  if (now < s.peekUntil) return { kind: 'peek' };
  const shut = settle(s, now);
  if (s.shut) return { kind: 'busy' };
  const c = s.cards[i];
  if (!c || c.open || c.done) return { kind: 'open', shut };
  c.open = true;
  if (s.first < 0) {
    s.first = i;
    return { kind: 'flip', i, shut };
  }
  const a = s.cards[s.first];
  s.first = -1;
  if (a.id === c.id) {
    a.done = true;
    c.done = true;
    s.score += 1;
    s.pairs += 1;
    const clear = s.cards.every((x) => x.done);
    if (clear) s.dealAt = now + CLEAR_MS;
    return { kind: clear ? 'clear' : 'match', i, j: a.i, pts: 1, shut };
  }
  s.misses += 1;
  s.lock = now + MISS_MS;
  s.shut = [a.i, c.i];
  return { kind: 'miss', i, j: a.i, shut };
}

/** 시계 (순수) — 틀린 짝 덮기 · 다 맞혔으면 새 카드 → { shut: [i, j] | null, dealt } */
export function pairTick(s, now, rng = Math.random) {
  const ev = { shut: settle(s, now), dealt: false };
  if (s.dealAt && now >= s.dealAt && now < s.end) {
    const ids = pairPick(s.pool, rng);
    if (ids) { pairDeal(s, now, ids, rng); ev.dealt = true; }
  }
  return ev;
}

/** 멈췄던 만큼 뒤로 민다 (순수) — 앱을 내렸다 돌아오면 남은 시간이 그대로 */
export function pairShift(s, ms) {
  const d = nz(ms);
  if (!d) return;
  s.t0 += d; s.end += d;
  if (s.peekUntil) s.peekUntil += d;
  if (s.lock) s.lock += d;
  if (s.dealAt) s.dealAt += d;
}

// ───────────────────── 화면 (여기부터 브라우저) ─────────────────────

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}
function hop(node) {
  node.classList.remove('is-hop');
  void node.offsetWidth;
  node.classList.add('is-hop');
}

/**
 * 한 판 돌리기 → { done: Promise<{ score, quit }>, stop() }
 * stage = 그릴 자리(비워서 쓴다) · o.pool = [{ id, ko, url, mine }] (기기에 그림이 있는 포켓몬 — mine = 진우가 잡은 것) · o.hero = 응원하는 쪽 { html } · o.rng
 * stop()은 ✕·집을 닫을 때 — 그 자리에서 끝(quit)
 */
export function runPair(stage, o = {}) {
  const now = () => performance.now();
  const rng = typeof o.rng === 'function' ? o.rng : Math.random;
  const pool = Array.isArray(o.pool) ? o.pool : [];
  const byId = new Map(pool.map((p) => [Number(p.id), p]));
  stage.innerHTML = '';
  const root = el('div', 'gd gp');
  root.style.setProperty('--gd-sec', `${PAIR_SEC}s`);
  const top = el('div', 'gd-top');
  const scoreEl = el('span', 'gd-score', '⭐ 0');
  const time = el('div', 'gd-time');
  time.appendChild(el('i'));
  top.append(scoreEl, time);
  const grid = el('div', 'gp-grid');
  const cards = [];
  for (let i = 0; i < PAIR_PAIRS * 2; i++) {
    const b = el('button', 'gp-card');
    b.type = 'button';
    b.setAttribute('aria-label', `카드 ${i + 1}`);
    const inner = el('span', 'gp-in');
    const back = el('span', 'gp-back');
    const front = el('span', 'gp-front');
    inner.append(back, front);
    b.appendChild(inner);
    grid.appendChild(b);
    cards.push({ b, front });
  }
  const pal = el('div', 'gd-pal');
  pal.innerHTML = (o.hero && o.hero.html) || '<span class="gd-pal-emoji">🐾</span>';
  const fx = el('div', 'gd-fx');
  const banner = el('div', 'gd-banner', '준비!');
  root.append(top, grid, pal, fx, banner);
  stage.appendChild(root);

  let s = null;
  let timer = 0;
  let pausedAt = 0;
  let finished = false;
  let resolveDone;
  const done = new Promise((r) => { resolveDone = r; });

  const koOf = (id) => (byId.get(id) || {}).ko || '';
  /**
   * 카드를 깔았다 — 앞면을 바꾸고 모두 덮은 모습으로(앞면 보여 주기는 grid의 is-peek)
   * 🔍 Codex 115차 #3: 앞면엔 **이름을 먼저** 쓰고 그림이 뜨면 그림으로(is-ready) — 그림이 늦거나 깨져도 2초 동안 누구인지 보인다
   * 🔍 Codex 115차 #2: 앞 판 그림의 늦은 load·error는 그 카드의 지금 그림이 아니라 무시한다
   */
  const deal = () => {
    s.cards.forEach((c, i) => {
      const card = cards[i];
      const { b, front } = card;
      b.className = 'gp-card';
      front.className = 'gp-front';
      front.innerHTML = '';
      const p = byId.get(c.id);
      const img = el('img', 'gp-img');
      img.alt = '';
      img.draggable = false;
      card.img = img;
      img.addEventListener('load', () => { if (card.img === img) front.classList.add('is-ready'); });
      img.addEventListener('error', () => { if (card.img === img) img.remove(); }); // 깨지면 이름만
      img.src = (p && p.url) || '';
      front.append(img, el('span', 'gp-name', koOf(c.id)));
    });
    peekShown = null; // 앞면 보여 주기 이름표를 다시 맞춘다
  };
  /** 열린 카드·앞면 보여 주는 동안은 이름으로 읽힌다(그 밖엔 「카드 n」) */
  const label = (i) => {
    const c = s.cards[i];
    const named = c && (c.open || c.done || peekShown);
    cards[i].b.setAttribute('aria-label', named ? koOf(c.id) : `카드 ${i + 1}`);
  };
  let peekShown = null;
  const syncPeek = (t) => {
    const on = t < s.peekUntil;
    if (on === peekShown) return;
    peekShown = on;
    grid.classList.toggle('is-peek', on);
    for (let i = 0; i < cards.length; i++) label(i);
  };
  const show = (i, on) => {
    cards[i].b.classList.toggle('is-open', on);
    label(i);
  };
  const fly = (text, i, cls) => {
    const a = cards[i].b.getBoundingClientRect();
    const r = root.getBoundingClientRect();
    const f = el('span', `gd-fly ${cls || ''}`, text);
    f.style.left = `${a.left - r.left + a.width / 2}px`;
    f.style.top = `${a.top - r.top + a.height * 0.2}px`;
    fx.appendChild(f);
    setTimeout(() => f.remove(), 900);
  };
  const apply = (ev) => {
    if (ev.shut) for (const k of ev.shut) show(k, false);
    if (ev.dealt) deal();
  };
  const tap = (i) => {
    if (!s || finished || pausedAt) return;
    const t = now();
    apply(pairTick(s, t, rng));
    const r = pairTap(s, i, t);
    if (r.shut) for (const k of r.shut) show(k, false);
    if (r.kind === 'flip') { show(i, true); sfx.tick(); }
    else if (r.kind === 'match' || r.kind === 'clear') {
      show(i, true);
      for (const k of [i, r.j]) cards[k].b.classList.add('is-done');
      scoreEl.textContent = `⭐ ${s.score}`;
      fly('+1', i);
      sfx.ding();
      hop(pal);
      if (r.kind === 'clear') { fly('다 맞혔어요!', i, 'is-big'); sfx.success(); }
    } else if (r.kind === 'miss') { show(i, true); }
    syncPeek(t);
  };
  cards.forEach((c, i) => c.b.addEventListener('click', () => tap(i)));

  const finish = (quit) => {
    if (finished) return;
    finished = true;
    clearInterval(timer);
    document.removeEventListener('visibilitychange', onVis);
    for (const c of cards) c.b.disabled = true;
    const score = s ? s.score : 0;
    if (quit) { resolveDone({ score, quit: true }); return; }
    banner.textContent = '끝!';
    banner.classList.add('is-on');
    sfx.success();
    setTimeout(() => resolveDone({ score, quit: false }), 900);
  };
  const loop = () => {
    if (!s || pausedAt || finished) return;
    const t = now();
    apply(pairTick(s, t, rng));
    syncPeek(t);
    if (t >= s.end) finish(false);
  };
  function onVis() {
    if (!s || finished) return;
    if (document.hidden) { pausedAt = now(); root.classList.add('is-paused'); return; }
    if (pausedAt) { pairShift(s, now() - pausedAt); pausedAt = 0; root.classList.remove('is-paused'); }
  }

  // 준비! → 시작 · 앱이 내려간 것은 「준비!」 때부터 듣는다(디그다와 같게 — 🔍 Codex 113차 #3)
  document.addEventListener('visibilitychange', onVis);
  setTimeout(() => {
    if (finished) return;
    banner.classList.remove('is-on');
    s = pairStart(now(), pool, rng);
    if (!s.cards.length) { finish(false); return; } // 카드 포켓몬이 모자란다 — gameview가 판을 쓰기 전에 막지만, 혹시 몰라 빈 판으로 끝
    root.classList.add('is-go');
    if (document.hidden) { pausedAt = now(); root.classList.add('is-paused'); }
    deal();
    syncPeek(now());
    timer = setInterval(loop, 50);
    try { cards[0].b.focus({ preventScroll: true }); } catch { /* 옛 브라우저 · 시험 */ } // 키보드로도 바로 (🔍 Codex 115차 — 접근성)
  }, 800);
  banner.classList.add('is-on');
  sfx.tick();

  // 🎵 게임 음악(v335) — 끝나면 stop · 마지막 10초면 hurry (내려 둔 동안은 멈춘 때로 셈)
  return { done, stop: () => finish(true), music: () => musicMode({ over: finished, left: s ? s.end - (pausedAt || now()) : null }) };
}
