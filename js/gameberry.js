// 🍓 나무열매 받기 — 🎮 게임기 미니 게임 다섯째 (v309 · 2026-10-21 아버님 "다음 진행하자" → 기본안 그대로)
// 🤝 파트너(없으면 내 캐릭터)를 손가락으로 끌어 좌우로 — 떨어지는 🍓 나무열매 ⭐1 · ✨ 황금 열매 ⭐3 · ⚡ 찌리리공을 받으면 찌릿 1초(못 움직임 · 점수는 안 깎는다)
// 한 판 30초 · 목숨·게임 오버 없이 시간이 끝나면 늘 끝까지 · 끝으로 갈수록 자주·빨리 떨어진다 · 점수는 최고 기록만(homeplay.best)
//
// 위쪽(엔진)은 순수 — 시각(ms)과 rng만 받아 상태를 바꾼다(node 시험이 가짜 시계로 끝까지) · 아래쪽(runBerry)이 화면
// 자리는 "칸": 마당 너비 100 · 높이 75(y는 위에서 아래로) · 움직이는 것은 transform만(구형 태블릿) · 앱을 내리면 멈췄다가 이어서
import { sfx, vibrate } from './sfx.js';
import { musicMode } from './gamesong.js'; // 🎵 게임 음악 상태 (v335 · 순수)
import { ART as RUN_ART } from './gamerun.js'; // 🍓·✨ 열매 그림은 🏃 달리기와 같게
import { FALLBACK as DIG_FALLBACK } from './gamedig.js'; // ⚡ 찌리리공 그림을 못 받았을 때

/** 한 판(초) · 찌릿 동안(ms) */
export const BERRY_SEC = 30;
export const BERRY_ZAP_MS = 1000;
/** 마당 — 너비 · 높이 (칸) · 받는 높이 · 받는 쪽 반 너비 · 받는 쪽이 갈 수 있는 끝 */
export const BERRY_W = 100;
export const BERRY_H = 75;
export const CATCH_Y = 62;
export const CATCH_HALF = 9;
export const X_MIN = 8;
export const X_MAX = 92;
/** 떨어지는 것 — ⭐ · 누르면(받으면) 찌릿 · 그림(찌리리공은 PokeAPI id) */
export const BERRY_KINDS = {
  berry: { pts: 1 },
  gold: { pts: 3 },
  voltorb: { pts: 0, zap: true, id: 100 },
};
const FIRST_MS = 600;
const VOLT_FROM = 3000;
const SIZE = 8; // 떨어지는 것 크기(칸)
const STEP_MS = 16;

const nz = (v) => {
  const n = Math.floor(Number(v) || 0);
  return n > 0 ? n : 0;
};
const clampX = (x) => Math.min(X_MAX, Math.max(X_MIN, Number(x)));

/** 빠르기 (순수) — 지난 시간 ms → { gap: 다음 것까지 ms, vy: 떨어지는 빠르기 칸/초 } · 끝으로 갈수록 자주·빨리 */
export function berryPace(ms) {
  const k = Math.min(1, Math.max(0, (Number(ms) || 0) / (BERRY_SEC * 1000)));
  return { gap: Math.round(900 - 510 * k), vy: 32 + 31 * k }; // 끝 0.45초·55였다 (v351 — 진우 「너무 쉬워요」 → 아버님 「추천대로」)
}

/** 무엇이 떨어지나 (순수) — r = rng() 하나 · 황금 8% · 3초 뒤부터 찌리리공 22% · 나머지 나무열매 */
export function berryKind(r, ms) {
  if (r < 0.08) return 'gold';
  if (ms >= VOLT_FROM && r < 0.3) return 'voltorb';
  return 'berry';
}

/** 새 판 (순수) — 받는 쪽은 가운데 */
export function berryStart(now) {
  return { t0: now, end: now + BERRY_SEC * 1000, last: now, next: now + FIRST_MS, x: 50, objs: [], seq: 0, zapUntil: 0, score: 0, berries: 0, golds: 0, zaps: 0 };
}

/** 받았나 (순수) — 받는 높이를 이번에 지나갔고 받는 쪽 안에 있으면 */
export function berryCatches(s, o, prevY) {
  return prevY < CATCH_Y && o.y >= CATCH_Y && Math.abs(o.x - s.x) <= CATCH_HALF;
}

/**
 * 시계 (순수) — 지난번부터 now까지 16ms씩 나눠 떨어뜨린다(빨라도 받는 높이를 건너뛰지 않게) · 판 끝을 넘지 않는다
 * → { added, got: [{ o, pts }], zaps, gone }
 */
export function berryTick(s, now, rng = Math.random) {
  const ev = { added: [], got: [], zaps: [], gone: [] };
  const to = Math.min(Number(now) || 0, s.end);
  while (s.last < to) {
    const dt = Math.min(STEP_MS, to - s.last);
    s.last += dt;
    const t = s.last;
    if (t >= s.next) {
      const ms = t - s.t0;
      const pace = berryPace(ms);
      const o = { n: ++s.seq, kind: berryKind(rng(), ms), x: X_MIN + rng() * (X_MAX - X_MIN), y: -SIZE, vy: pace.vy };
      s.objs.push(o);
      ev.added.push(o);
      s.next = t + pace.gap;
    }
    for (let i = s.objs.length - 1; i >= 0; i--) {
      const o = s.objs[i];
      const prevY = o.y;
      o.y += (o.vy * dt) / 1000;
      if (berryCatches(s, o, prevY)) {
        s.objs.splice(i, 1);
        const k = BERRY_KINDS[o.kind];
        if (k.zap) {
          s.zapUntil = t + BERRY_ZAP_MS;
          s.zaps += 1;
          ev.zaps.push(o);
        } else {
          s.score += k.pts;
          if (o.kind === 'gold') s.golds += 1; else s.berries += 1;
          ev.got.push({ o, pts: k.pts });
        }
      } else if (o.y > BERRY_H + SIZE) {
        s.objs.splice(i, 1);
        ev.gone.push(o);
      }
    }
  }
  return ev;
}

/** 받는 쪽 옮기기 (순수) → 'move' | 'zapped'(찌릿 동안 — 못 움직임) | 'over' */
export function berryMove(s, x, now) {
  if (now >= s.end) return 'over';
  if (now < s.zapUntil) return 'zapped';
  if (!Number.isFinite(Number(x))) return 'move';
  s.x = clampX(x);
  return 'move';
}

/** 멈췄던 만큼 뒤로 민다 (순수) — 앱을 내렸다 돌아오면 남은 시간이 그대로 */
export function berryShift(s, ms) {
  const d = nz(ms);
  if (!d) return;
  s.t0 += d; s.end += d; s.last += d; s.next += d;
  if (s.zapUntil) s.zapUntil += d;
}

// ───────────────────── 화면 (여기부터 브라우저) ─────────────────────

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}

/**
 * 한 판 돌리기 → { done: Promise<{ score, quit }>, stop() }
 * stage = 그릴 자리(비워서 쓴다) · o.art = { 100: 찌리리공 그림 주소|null } · o.hero = 받는 쪽 { html } (파트너 그림 또는 캐릭터) · o.rng
 * stop()은 ✕·집을 닫을 때 — 그 자리에서 끝(quit)
 */
export function runBerry(stage, o = {}) {
  const now = () => performance.now();
  const rng = typeof o.rng === 'function' ? o.rng : Math.random;
  stage.innerHTML = '';
  const root = el('div', 'gd gb');
  root.style.setProperty('--gd-sec', `${BERRY_SEC}s`);
  const top = el('div', 'gd-top');
  const scoreEl = el('span', 'gd-score', '⭐ 0');
  const time = el('div', 'gd-time');
  time.appendChild(el('i'));
  top.append(scoreEl, time);
  const field = el('div', 'gb-field');
  field.setAttribute('aria-label', '끌어서 좌우로 · 화살표로도');
  field.tabIndex = 0;
  const layer = el('div', 'gb-layer');
  const me = el('div', 'gb-me');
  const meIn = el('div', 'gb-me-in');
  meIn.innerHTML = (o.hero && o.hero.html) || '<span class="gd-pal-emoji">🐾</span>';
  me.appendChild(meIn);
  field.append(el('span', 'gb-ground'), layer, me);
  const hint = el('p', 'gb-hint', '끌어서 좌우로 · 찌리리공은 피해요');
  const fx = el('div', 'gd-fx');
  const banner = el('div', 'gd-banner', '준비!');
  root.append(top, field, hint, fx, banner);
  stage.appendChild(root);

  let unit = 3; // 한 칸 = px (마당 너비 ÷ 100)
  const measure = () => {
    const w = field.getBoundingClientRect().width;
    if (w > 0) unit = w / BERRY_W;
  };
  // ⚡ 찌리리공 — 받은 그림 · 그림이 깨지면 코드로 그린 모습으로(그 판의 다음 찌리리공도 처음부터) (🔍 Codex 115차 #5)
  let volt = (o.art && o.art[BERRY_KINDS.voltorb.id]) || '';
  const els = new Map(); // 떨어지는 것 n → 그림
  const make = (ob) => {
    const e = el('span', `gb-obj is-${ob.kind}`);
    if (ob.kind === 'voltorb' && volt) {
      const img = el('img');
      img.alt = '';
      img.draggable = false;
      img.addEventListener('error', () => { volt = ''; e.innerHTML = DIG_FALLBACK.voltorb; });
      img.src = volt;
      e.appendChild(img);
    } else e.innerHTML = ob.kind === 'voltorb' ? DIG_FALLBACK.voltorb : RUN_ART[ob.kind];
    layer.appendChild(e);
    els.set(ob.n, e);
  };
  const drop = (ob, cls) => {
    const e = els.get(ob.n);
    els.delete(ob.n);
    if (!e) return;
    if (!cls) { e.remove(); return; }
    e.classList.add(cls);
    setTimeout(() => e.remove(), 350);
  };
  const fly = (text, x, cls) => {
    const a = field.getBoundingClientRect();
    const b = root.getBoundingClientRect();
    const f = el('span', `gd-fly ${cls || ''}`, text);
    f.style.left = `${a.left - b.left + x * unit}px`;
    f.style.top = `${a.top - b.top + (CATCH_Y - 10) * unit}px`;
    fx.appendChild(f);
    setTimeout(() => f.remove(), 900);
  };

  let s = null;
  let timer = 0;
  let frame = 0;
  let pausedAt = 0;
  let finished = false;
  let dragging = false;
  let dragId = null; // 끄는 손가락 (pointerId)
  let resolveDone;
  const done = new Promise((r) => { resolveDone = r; });

  const draw = () => {
    if (!s) return;
    for (const ob of s.objs) {
      const e = els.get(ob.n);
      if (e) e.style.transform = `translate3d(${((ob.x - SIZE / 2) * unit).toFixed(1)}px, ${((ob.y - SIZE / 2) * unit).toFixed(1)}px, 0)`;
    }
    me.style.transform = `translate3d(${((s.x - 10) * unit).toFixed(1)}px, 0, 0)`;
  };
  const apply = (ev) => {
    for (const ob of ev.added) make(ob);
    for (const ob of ev.gone) drop(ob);
    for (const g of ev.got) {
      drop(g.o, 'is-got');
      fly(`+${g.pts}`, g.o.x, g.pts > 1 ? 'is-big' : '');
      if (g.pts > 1) sfx.twinkle(); else sfx.ding();
    }
    if (ev.got.length) scoreEl.textContent = `⭐ ${s.score}`;
    for (const ob of ev.zaps) {
      drop(ob, 'is-got');
      fly('찌릿!', ob.x, 'is-zap');
      sfx.zap();
      vibrate([60, 40, 60]);
    }
  };
  /** 손가락·마우스 자리 → 칸 */
  const xOf = (e) => (Number(e.clientX) - field.getBoundingClientRect().left) / unit;
  const moveTo = (x) => {
    if (!s || finished || pausedAt) return;
    const t = now();
    apply(berryTick(s, t, rng)); // 옮기기 전에 지금까지 떨어뜨린다
    berryMove(s, x, t);
    draw();
  };
  // 🔍 Codex 115차 #4: 처음 닿은 손가락 하나만 따라간다 — 두 번째 손가락이 닿거나 떨어져도 첫 손가락 끌기는 그대로
  field.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    if (dragging && e.pointerId !== dragId) return;
    dragging = true;
    dragId = e.pointerId;
    if (typeof field.setPointerCapture === 'function' && e.pointerId !== undefined) { try { field.setPointerCapture(e.pointerId); } catch { /* 옛 브라우저 */ } }
    moveTo(xOf(e));
  });
  field.addEventListener('pointermove', (e) => { if (dragging && e.pointerId === dragId) moveTo(xOf(e)); });
  const up = (e) => { if (e.pointerId === dragId) { dragging = false; dragId = null; } };
  field.addEventListener('pointerup', up);
  field.addEventListener('pointercancel', up);
  field.addEventListener('lostpointercapture', up);
  // ⌨️ 마당에 포커스가 있을 때만 화살표로도 (🔍 Codex 114차 접근성과 같게)
  field.addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    if (s) moveTo(s.x + (e.key === 'ArrowLeft' ? -10 : 10));
  });

  const onVis = () => {
    if (!s || finished) return;
    if (document.hidden) { pausedAt = now(); dragging = false; dragId = null; root.classList.add('is-paused'); return; }
    if (pausedAt) { berryShift(s, now() - pausedAt); pausedAt = 0; root.classList.remove('is-paused'); }
  };
  const hasWin = typeof window !== 'undefined' && typeof window.addEventListener === 'function';
  const finish = (quit) => {
    if (finished) return;
    finished = true;
    dragging = false;
    dragId = null;
    clearInterval(timer);
    if (frame && typeof cancelAnimationFrame === 'function') cancelAnimationFrame(frame);
    document.removeEventListener('visibilitychange', onVis);
    if (hasWin) window.removeEventListener('resize', measure);
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
    apply(berryTick(s, t, rng));
    me.classList.toggle('is-zap', t < s.zapUntil);
    draw();
    if (t >= s.end) finish(false);
  };
  // 그림이 부드럽게 — 브라우저면 화면 그릴 때마다, 아니면(시험) 33ms마다
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

  // 준비! → 시작 · 앱이 내려간 것은 「준비!」 때부터 듣는다(디그다와 같게 — 🔍 Codex 113차 #3)
  document.addEventListener('visibilitychange', onVis);
  if (hasWin) window.addEventListener('resize', measure);
  setTimeout(() => {
    if (finished) return;
    banner.classList.remove('is-on');
    measure();
    s = berryStart(now());
    root.classList.add('is-go');
    if (document.hidden) { pausedAt = now(); root.classList.add('is-paused'); }
    draw();
    startLoop();
    if (typeof field.focus === 'function') { try { field.focus({ preventScroll: true }); } catch { /* 옛 브라우저 */ } }
  }, 800);
  banner.classList.add('is-on');
  measure();
  sfx.tick();

  // 🎵 게임 음악(v335) — 끝나면 stop · 마지막 10초면 hurry (내려 둔 동안은 멈춘 때로 셈)
  return { done, stop: () => finish(true), music: () => musicMode({ over: finished, left: s ? s.end - (pausedAt || now()) : null }) };
}
