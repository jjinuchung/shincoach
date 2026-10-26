// 🎯 몬스터볼 던지기 — 🎮 게임기 미니 게임 열한째 (v344 · 2026-10-26 아버님 미니 게임 추천 "추천 순서대로" → 기본안 "이대로")
// 풀숲 마당의 포켓몬(진우가 잡은 포켓몬 그림 먼저)이 좌우로 움직이고 가끔 깡총 — 아래 몬스터볼을 끌어서 위로 휙 놓아 던진다
// 끈 방향 = 던지는 방향 · 끈 길이 = 세기(모자라면 앞에 떨어진다) · 포켓몬 둘레 원이 커졌다 작아졌다 — 작을 때 맞힐수록 Nice ⭐1 · Great ⭐2 · Excellent ⭐3
// 맞으면 볼이 세 번 흔들리고 「명중!」 → 다음 포켓몬 · 빗나가도 감점 없음 · 뒤로 갈수록 빠르고 넓게 · ✨ 반짝이는 포켓몬은 ⭐ 두 배
// 한 판 30초 · 목숨·게임 오버 없음 · 점수는 최고 기록만(homeplay.best) ·
// **진짜 잡기·도감과는 따로**(아버님 2026-10-26 — 공부 없이 도감이 늘지 않게 · 설명에 「도감엔 안 들어가요」 · 말도 「잡았다」 대신 「명중!」)
//
// 위쪽(엔진)은 순수 — 시각(ms)과 rng만 받는다(node 시험이 가짜 시계로 끝까지) · 아래쪽(runThrow)이 화면
// 자리는 "칸": 마당 너비 100 · 높이 70(y는 위에서 아래로) · 움직이는 것은 transform만(구형 태블릿) · 앱을 내리면 멈췄다가 이어서
import { sfx } from './sfx.js';
import { musicMode } from './gamesong.js'; // 🎵 게임 음악 상태 (v335 · 순수)

/** 한 판(초) · 마당(칸) */
export const THR_SEC = 30;
export const THR_W = 100;
export const THR_H = 70;
/** 몬스터볼 — 쉬는 자리(가운데 아래) · 반지름(칸) */
export const BALL = { x: 50, y: 62, r: 3.2 };
/** 포켓몬 — 크기(칸) · 가운데 높이 */
export const MON = { w: 16, y: 22 };
/** 원 — 한 번 커졌다 작아지는 데(ms) · 가장 작을 때 크기(1 = 가장 클 때) */
export const RING_MS = 1500;
export const RING_MIN = 0.35;
/** 맞힌 때 원 크기 → 등급 (작은 것부터) */
export const GRADES = [
  { key: 'excellent', ko: 'Excellent', at: 0.48, pts: 3 },
  { key: 'great', ko: 'Great', at: 0.72, pts: 2 },
  { key: 'nice', ko: 'Nice', at: 1, pts: 1 },
];
/** 날아가는 데 · 명중 뒤 흔들리는 데 · 빗나간 뒤 다시 던지기까지 · 첫 포켓몬 (ms) */
export const FLY_MS = 420;
export const CATCH_MS = 1000;
export const MISS_MS = 400;
export const FIRST_MS = 600;
/** 던지기 — 이보다 짧게 끌면 안 던진다 · 끈 길이 × 이만큼 날아간다 · 가장 멀리 (칸) */
export const MIN_LEN = 5;
export const REACH_K = 2.6;
export const REACH_MAX = 95;
/** 볼 가운데가 포켓몬 가운데에서 이만큼 안이면 명중 (칸) — 4학년 손가락에 너그럽게 */
export const HIT_R = MON.w * 0.38 + BALL.r;
/** ✨ 반짝이는 포켓몬 — 이 뒤부터(ms) · 나올 때마다 이만큼 · ⭐ 두 배 */
export const SHINY_FROM = 5000;
export const SHINY_RATE = 0.1;
/** 잡은 포켓몬 그림이 이만큼 있으면 그것만 나온다(gameview throwPrep) */
export const THR_FEW = 4;
/** 깡총 — 높이(칸) · 걸리는 데(ms) */
export const HOP = { h: 7, ms: 420 };
const STEP_MS = 50;
const TAU = Math.PI * 2;

const nz = (v) => {
  const n = Math.floor(Number(v) || 0);
  return n > 0 ? n : 0;
};
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

/** 빠르기 (순수) — 지난 시간 ms → { amp: 좌우로 움직이는 폭(칸), per: 한 번 오가는 데(ms) } · 끝으로 갈수록 넓고 빠르게 */
export function thrPace(ms) {
  const k = clamp((Number(ms) || 0) / (THR_SEC * 1000), 0, 1);
  return { amp: 12 + 18 * k, per: Math.round(3200 - 1400 * k) };
}
/** 포켓몬이 오가는 가운데가 마당 가운데에서 이만큼까지 비켜난다(칸) — 똑바로 위로만 던져서는 잘 안 맞게 */
export const CX_SPREAD = 8;
/** 포켓몬이 마당 가장자리에서 이만큼 안쪽에서만 (칸) */
const EDGE = MON.w / 2 + 1;

/** 새 판 (순수) — pool = 나올 포켓몬 id들(그림이 있는 것) */
export function thrStart(now, pool = []) {
  return {
    t0: now, end: now + THR_SEC * 1000, last: now, next: now + FIRST_MS, ready: now,
    pool: (Array.isArray(pool) ? pool : []).filter((id) => Number.isInteger(id) && id > 0),
    mon: null, fly: null, catching: null, away: false, seq: 0, prev: 0,
    score: 0, throws: 0, hits: 0, misses: 0, shorts: 0, shinies: 0, grades: { nice: 0, great: 0, excellent: 0 },
  };
}

/** 포켓몬의 지금 자리 (순수) — 좌우로 오가고, 정해진 때마다 깡총 */
export function thrPos(mon, t) {
  const x = mon.cx + mon.amp * Math.sin(mon.phase + (TAU * (t - mon.born)) / mon.per);
  let y = MON.y;
  const d = t - mon.born - mon.h0;
  if (d >= 0) {
    const u = (d % mon.gap) / HOP.ms;
    if (u < 1) y -= HOP.h * 4 * u * (1 - u);
  }
  return { x, y };
}

/** 원 크기 (순수) — 커졌다(1) 작아졌다(RING_MIN) · 시작 자리(ring)는 포켓몬마다 달라서 바로 던져도 늘 같은 등급이 아니다 */
export function thrRing(mon, t) {
  return RING_MIN + (1 - RING_MIN) * (0.5 + 0.5 * Math.cos((Number(mon.ring) || 0) + (TAU * (t - mon.born)) / RING_MS));
}

/** 원 크기 → 등급 (순수) */
export function thrGrade(k) {
  return GRADES.find((g) => k <= g.at) || GRADES[GRADES.length - 1];
}

function spawn(s, t, rng) {
  const ms = t - s.t0;
  const pace = thrPace(ms);
  let id = 0;
  if (s.pool.length) {
    const others = s.pool.length > 1 ? s.pool.filter((x) => x !== s.prev) : s.pool;
    id = others[Math.min(others.length - 1, Math.floor(rng() * others.length))];
  }
  s.prev = id;
  const cx = THR_W / 2 + (rng() * 2 - 1) * CX_SPREAD;
  const amp = Math.min(pace.amp, cx - EDGE, THR_W - EDGE - cx); // 가장자리 밖으로 안 나가게
  const mon = {
    n: ++s.seq, id, born: t, cx, amp, per: pace.per, phase: rng() * TAU, ring: rng() * TAU,
    h0: 800 + rng() * 1200, gap: 1600 + rng() * 1200, shiny: ms >= SHINY_FROM && rng() < SHINY_RATE,
  };
  s.mon = mon;
  return mon;
}

/**
 * 던졌다 (순수) — v = 끈 방향·길이 { dx, dy }(칸 · 위가 -) → { kind: 'throw'(+ hit·grade·pts·short·to·tl) | 'weak'(위로 휙이 아님) | 'busy' | 'over' }
 * 명중은 **떨어지는 때(now + FLY_MS)의 포켓몬 자리**로 미리 정한다(볼이 날아가는 동안 포켓몬이 움직이니까) — 점수는 떨어질 때(thrTick) 더한다
 * 끝나기 전에 떨어지지 못하는 던지기는 받지 않는다(over)
 */
export function thrThrow(s, v, now) {
  if (!(Number(now) + FLY_MS <= s.end)) return { kind: 'over' };
  if (s.fly || s.catching || now < s.ready) return { kind: 'busy' };
  const dx = Number(v && v.dx) || 0;
  const dy = Number(v && v.dy) || 0;
  const len = Math.hypot(dx, dy);
  if (!(len >= MIN_LEN) || dy > -MIN_LEN * 0.6) return { kind: 'weak' };
  const ux = dx / len;
  const uy = dy / len;
  const reach = Math.min(REACH_MAX, len * REACH_K);
  const tl = now + FLY_MS;
  s.throws += 1;
  let hit = false;
  let grade = '';
  let pts = 0;
  let short = false;
  let to = { x: BALL.x + ux * reach, y: BALL.y + uy * reach };
  if (s.mon) {
    const p = thrPos(s.mon, tl);
    const proj = (p.x - BALL.x) * ux + (p.y - BALL.y) * uy; // 볼이 가는 줄 위에서 포켓몬까지
    const along = clamp(proj, 0, reach);
    const d = Math.hypot(p.x - (BALL.x + ux * along), p.y - (BALL.y + uy * along));
    if (d <= HIT_R) {
      hit = true;
      const g = thrGrade(thrRing(s.mon, tl));
      grade = g.key;
      pts = g.pts * (s.mon.shiny ? 2 : 1);
      to = p;
    } else short = proj > reach && Math.hypot(p.x - (BALL.x + ux * proj), p.y - (BALL.y + uy * proj)) <= HIT_R; // 줄은 맞는데 세기가 모자람
  }
  s.fly = { t0: now, tl, to, hit, grade, pts, short, mon: s.mon ? s.mon.n : 0 };
  s.away = true;
  return { kind: 'throw', ...s.fly };
}

/** ⌨️ 키보드로 던지기 (순수) — 떨어지는 때의 포켓몬 자리를 향해 넉넉한 세기로 → { dx, dy } | null(포켓몬이 없음) */
export function thrAuto(s, now) {
  if (!s.mon) return null;
  const p = thrPos(s.mon, now + FLY_MS);
  const dx = p.x - BALL.x;
  const dy = p.y - BALL.y;
  const len = Math.hypot(dx, dy) || 1;
  const want = Math.max(MIN_LEN, len / REACH_K + 2);
  return { dx: (dx / len) * want, dy: (dy / len) * want };
}

/**
 * 시계 (순수) — 지난번부터 now까지 50ms씩 · 판 끝을 넘지 않는다
 * → { added: [포켓몬], landed: 명중 { mon, grade, pts } | null, missed: 빗나감 { short, to } | null, back: 볼이 다시 손에 }
 */
export function thrTick(s, now, rng = Math.random) {
  const ev = { added: [], landed: null, missed: null, back: false };
  const to = Math.min(Number(now) || 0, s.end);
  while (s.last < to) {
    const dt = Math.min(STEP_MS, to - s.last);
    s.last += dt;
    const t = s.last;
    if (s.fly && t >= s.fly.tl) {
      const f = s.fly;
      s.fly = null;
      if (f.hit && s.mon && s.mon.n === f.mon) {
        s.score += f.pts;
        s.hits += 1;
        s.grades[f.grade] += 1;
        if (s.mon.shiny) s.shinies += 1;
        s.catching = { until: t + CATCH_MS, mon: s.mon, grade: f.grade, pts: f.pts, at: f.to };
        ev.landed = { mon: s.mon, grade: f.grade, pts: f.pts, at: f.to };
        s.mon = null;
      } else {
        s.misses += 1;
        if (f.short) s.shorts += 1;
        s.ready = t + MISS_MS;
        ev.missed = { short: f.short, to: f.to };
      }
    }
    if (s.catching && t >= s.catching.until) {
      s.catching = null;
      s.ready = t;
      s.next = t;
    }
    if (s.away && !s.fly && !s.catching && t >= s.ready) { s.away = false; ev.back = true; } // 볼이 다시 손에
    if (!s.mon && !s.catching && !s.fly && t >= s.next) ev.added.push(spawn(s, t, rng));
  }
  return ev;
}

/** 멈췄던 만큼 뒤로 민다 (순수) — 앱을 내렸다 돌아오면 남은 시간·포켓몬 자리·원 크기가 그대로 */
export function thrShift(s, ms) {
  const d = nz(ms);
  if (!d) return;
  s.t0 += d; s.end += d; s.last += d; s.next += d; s.ready += d;
  if (s.mon) s.mon.born += d;
  if (s.fly) { s.fly.t0 += d; s.fly.tl += d; }
  if (s.catching) s.catching.until += d;
}

// ───────────────────── 화면 (여기부터 브라우저) ─────────────────────

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}
/** 볼을 이만큼(px)까지만 손가락을 따라 끌린다 */
const DRAG_MAX_PX = 60;

/**
 * 한 판 돌리기 → { done: Promise<{ score, quit }>, stop(), music() }
 * stage = 그릴 자리(비워서 쓴다) · o.pool = [{ id, ko, url }] 나올 포켓몬 그림(gameview가 잡은 포켓몬 먼저) · o.rng
 * stop()은 ✕·집을 닫을 때 — 그 자리에서 끝(quit)
 */
export function runThrow(stage, o = {}) {
  const now = () => performance.now();
  const rng = typeof o.rng === 'function' ? o.rng : Math.random;
  const pool = (Array.isArray(o.pool) ? o.pool : []).filter((p) => p && Number.isInteger(p.id) && p.url);
  const byId = new Map(pool.map((p) => [p.id, p]));
  stage.innerHTML = '';
  const root = el('div', 'gd gx');
  root.style.setProperty('--gd-sec', `${THR_SEC}s`);
  const top = el('div', 'gd-top');
  const scoreEl = el('span', 'gd-score', '⭐ 0');
  const time = el('div', 'gd-time');
  time.appendChild(el('i'));
  top.append(scoreEl, time);
  const field = el('div', 'gx-field');
  const monEl = el('div', 'gx-mon');
  const ringEl = el('span', 'gx-ring');
  const artEl = el('span', 'gx-art');
  monEl.append(ringEl, artEl);
  const ball = el('div', 'gx-ball');
  ball.appendChild(el('span', 'gx-ball-in'));
  field.append(el('span', 'gx-bush'), el('span', 'gx-bush is-b'), monEl, ball);
  field.setAttribute('aria-label', '몬스터볼 던지기 — 볼을 끌어서 위로 휙 · 키보드는 스페이스');
  const hint = el('p', 'gx-hint', '볼을 끌어서 위로 휙! 원이 작을 때 맞히면 ⭐가 더');
  const fx = el('div', 'gd-fx');
  const banner = el('div', 'gd-banner', '준비!');
  root.append(top, field, hint, fx, banner);
  stage.appendChild(root);

  let unit = 3; // 한 칸 = px (마당 너비 ÷ 100)
  const measure = () => {
    const w = field.getBoundingClientRect().width;
    if (w > 0) unit = w / THR_W;
  };

  let s = null;
  let timer = 0;
  let frame = 0;
  let pausedAt = 0;
  let finished = false;
  let ballMode = 'rest'; // rest · drag · fly · catch · miss
  let drag = null;       // { id, x0, y0 } 끄는 손가락 하나
  let resolveDone;
  const done = new Promise((r) => { resolveDone = r; });
  // 판 안의 잠깐 타이머(날아가는 글·「명중!」·「준비!」)는 모아 두었다가 끝날 때 모두 지운다 — 닫은 뒤에 화면을 만지지 않게 (🔍 Codex 148차 #2)
  const timers = new Set();
  const later = (fn, ms) => {
    const id = setTimeout(() => { timers.delete(id); fn(); }, ms);
    timers.add(id);
  };

  /** 볼 그림 자리 — 칸 가운데 (x, y) · 크기 */
  const ballTo = (x, y, sc = 1) => {
    ball.style.transform = `translate3d(${((x - BALL.r) * unit).toFixed(1)}px, ${((y - BALL.r) * unit).toFixed(1)}px, 0) scale(${sc})`;
  };
  const setBall = (mode) => {
    ballMode = mode;
    ball.className = `gx-ball is-${mode}`;
  };
  const restBall = () => {
    setBall('rest');
    ballTo(BALL.x, BALL.y);
  };
  const showMon = (mon) => {
    artEl.innerHTML = '';
    const p = byId.get(mon.id);
    if (p) {
      const img = el('img', 'gx-img');
      img.alt = '';
      img.draggable = false;
      img.addEventListener('error', () => { artEl.innerHTML = '<span class="gx-alt">🐾</span>'; });
      img.src = p.url;
      artEl.appendChild(img);
    } else artEl.innerHTML = '<span class="gx-alt">🐾</span>';
    monEl.className = `gx-mon${mon.shiny ? ' is-shiny' : ''}`;
    if (mon.shiny) artEl.appendChild(el('span', 'gx-spark', '✨'));
    monEl.setAttribute('aria-label', `${p ? p.ko : '포켓몬'}${mon.shiny ? ' (반짝)' : ''}`);
  };
  /** 화면 안의 자리(px) — 루트 기준 */
  const spot = (x, y) => {
    const a = field.getBoundingClientRect();
    const b = root.getBoundingClientRect();
    return { left: a.left - b.left + x * unit, top: a.top - b.top + y * unit };
  };
  const fly = (text, x, y, cls) => {
    const p = spot(x, y);
    const f = el('span', `gd-fly ${cls || ''}`, text);
    f.style.left = `${p.left}px`;
    f.style.top = `${p.top}px`;
    fx.appendChild(f);
    later(() => f.remove(), 1100);
  };
  const draw = () => {
    if (!s) return;
    if (s.mon) {
      const p = thrPos(s.mon, s.last);
      const k = thrRing(s.mon, s.last);
      monEl.style.transform = `translate3d(${((p.x - MON.w / 2) * unit).toFixed(1)}px, ${((p.y - MON.w / 2) * unit).toFixed(1)}px, 0)`;
      ringEl.style.transform = `scale(${k.toFixed(3)})`;
      ringEl.className = `gx-ring is-${thrGrade(k).key}`;
    }
  };
  // 차례: 앞 볼이 떨어진 것(명중·빗나감) → 새 포켓몬 → 볼이 손에 — 화면이 오래 멈췄다 한꺼번에 와도 새 포켓몬이 투명하게 남지 않게 (🔍 Codex 148차 #1)
  const apply = (ev) => {
    if (ev.landed) {
      const { grade, pts, at } = ev.landed;
      const g = GRADES.find((x) => x.key === grade);
      monEl.className = 'gx-mon is-in';
      setBall('catch');
      ballTo(at.x, at.y, 0.9);
      scoreEl.textContent = `⭐ ${s.score}`;
      fly(`${g.ko}! +${pts}`, at.x, at.y - 10, pts > 1 ? 'is-big' : '');
      sfx.hit();
      later(() => { if (!finished && !pausedAt) { fly('명중!', at.x, at.y + 6, ''); sfx.success(); } }, CATCH_MS - 250); // 흔들리는 볼 아래에 (볼 위에 겹치지 않게) · 내려 둔 동안은 안 띄움
    }
    if (ev.missed) {
      setBall('miss');
      fly(ev.missed.short ? '조금 더 세게 휙!' : '앗, 빗나갔다!', BALL.x, BALL.y - 14, '');
    }
    for (const m of ev.added) showMon(m);
    if (ev.back && !s.fly && !s.catching) restBall();
  };
  /** 던지기 — 끈 길이(px) → 칸 · 결과에 따라 볼이 날아간다 */
  const throwBy = (v) => {
    if (!s || finished || pausedAt) return;
    const t = now();
    apply(thrTick(s, t, rng));
    const r = thrThrow(s, v, t);
    if (r.kind !== 'throw') {
      if (ballMode === 'drag') restBall();
      if (r.kind === 'weak') { hint.classList.remove('is-nudge'); void hint.offsetWidth; hint.classList.add('is-nudge'); }
      return;
    }
    setBall('fly');
    ballTo(r.to.x, r.to.y, 0.55);
    sfx.whoosh();
    draw();
  };

  const onVis = () => {
    if (!s || finished) return;
    if (document.hidden) {
      pausedAt = now();
      root.classList.add('is-paused');
      if (drag) { drag = null; if (ballMode === 'drag') restBall(); } // 끄던 중에 내렸으면 놓친 것으로
      return;
    }
    if (pausedAt) { thrShift(s, now() - pausedAt); pausedAt = 0; root.classList.remove('is-paused'); }
  };
  const hasWin = typeof window !== 'undefined' && typeof window.addEventListener === 'function';
  // 끝을 알리는 것은 한 번만 — 「끝!」을 보여 주는 동안 ✕·집 닫기가 오면 기다리지 않고 바로(끝난 판이라 점수 그대로 · 🗺️ 대모험 Codex 137차 #3과 같게 · 🔍 Codex 148차 #2)
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
    apply(thrTick(s, t, rng));
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

  // 끌기 — 손가락 하나만(다른 손가락은 무시) · 마당 어디서 끌어도 된다(볼은 늘 가운데 아래에서 날아간다)
  const pid = (e) => (e && e.pointerId !== undefined ? e.pointerId : 'touch');
  const down = (e) => {
    if (e && typeof e.preventDefault === 'function') e.preventDefault();
    if (!s || finished || pausedAt || drag || ballMode !== 'rest') return;
    if (s.fly || s.catching || s.away) return;
    drag = { id: pid(e), x0: Number(e.clientX) || 0, y0: Number(e.clientY) || 0 };
    setBall('drag');
  };
  function move(e) {
    if (!drag || pid(e) !== drag.id) return;
    let dx = (Number(e.clientX) || 0) - drag.x0;
    let dy = (Number(e.clientY) || 0) - drag.y0;
    const len = Math.hypot(dx, dy);
    if (len > DRAG_MAX_PX) { dx = (dx / len) * DRAG_MAX_PX; dy = (dy / len) * DRAG_MAX_PX; }
    ballTo(BALL.x + dx / unit, BALL.y + dy / unit);
  }
  function up(e) {
    if (!drag || pid(e) !== drag.id) return;
    const d = drag;
    drag = null;
    throwBy({ dx: ((Number(e.clientX) || 0) - d.x0) / unit, dy: ((Number(e.clientY) || 0) - d.y0) / unit });
  }
  function cancel(e) {
    if (!drag || pid(e) !== drag.id) return;
    drag = null;
    if (ballMode === 'drag') restBall();
  }
  field.addEventListener('pointerdown', down);
  document.addEventListener('pointermove', move);
  document.addEventListener('pointerup', up);
  document.addEventListener('pointercancel', cancel);
  // ⌨️ 마당에 포커스가 있을 때 스페이스·Enter — 포켓몬 쪽으로 넉넉한 세기로 (손가락 없이도 끝까지)
  field.tabIndex = 0;
  field.setAttribute('role', 'button');
  field.addEventListener('keydown', (e) => {
    if (e.key !== ' ' && e.key !== 'Enter') return;
    e.preventDefault();
    if (e.repeat || !s || ballMode !== 'rest') return;
    apply(thrTick(s, now(), rng));
    const v = thrAuto(s, now());
    if (v) throwBy(v);
  });

  // 준비! → 시작 · 앱이 내려간 것은 「준비!」 때부터 듣는다
  document.addEventListener('visibilitychange', onVis);
  if (hasWin) window.addEventListener('resize', measure);
  later(() => {
    if (finished) return;
    banner.classList.remove('is-on');
    measure();
    s = thrStart(now(), pool.map((p) => p.id));
    root.classList.add('is-go');
    if (document.hidden) { pausedAt = now(); root.classList.add('is-paused'); }
    restBall();
    draw();
    startLoop();
    if (typeof field.focus === 'function') { try { field.focus({ preventScroll: true }); } catch { /* 옛 브라우저 */ } }
  }, 800);
  banner.classList.add('is-on');
  measure();
  restBall();
  sfx.tick();

  // 🎵 게임 음악(v335) — 끝나면 stop · 마지막 10초면 hurry (내려 둔 동안은 멈춘 때로 셈)
  return { done, stop: () => finish(true), music: () => musicMode({ over: finished, left: s ? s.end - (pausedAt || now()) : null }) };
}
