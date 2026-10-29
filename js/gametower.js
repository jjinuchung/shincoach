// 🗼 몬스터볼 탑 쌓기 — 🎮 게임기 미니 게임 일곱째 (v311 · 2026-10-21 아버님 "몬스터볼 탑 쌓기 진행하자" → 물음 둘 모두 추천안)
// 맨 위에서 몬스터볼이 **좌우로 미끄러지며** 왔다 갔다(크레인 흔들기 대신 — 물음 ②) — 톡 누르면 똑바로 떨어진다
// 맨 위 볼과 거의 딱 맞으면 ✨ 딱! ⭐2(탑이 반듯하게) · 조금 비껴도 올라가면 ⭐1(그 자리에 비뚤게) ·
// 많이 비끼면 **데굴데굴 굴러떨어지고 탑은 그대로**(감점·무너짐 없음 — 물음 ①) · 높이 쌓을수록 조금씩 빨라진다 ·
// 탑이 높아지면 마당이 아래로 내려가 꼭대기가 늘 보인다 · 한 판 60초(v365 — 진우 「너무 짧다」 → 아버님 「두 배로」 · 처음 30초) · 목숨·게임 오버 없이 늘 끝까지 · 점수는 최고 기록만(homeplay.best)
// 볼 그림은 🃏 카드 뒷면과 같은 CSS 무늬 — 가방의 볼과 상관없다(쌓아도 볼이 줄지 않는다)
//
// 위쪽(엔진)은 순수 — 시각(ms)과 rng만 받아 상태를 바꾼다(node 시험이 가짜 시계로 끝까지) · 아래쪽(runTower)이 화면
// 자리는 "칸": 마당 너비 100 · 높이 75 · 탑은 땅에서 잰 높이 h(위로) · 화면 y = FLOOR_Y − (h − cam)
// 화면 자리는 마당 크기에 대한 %로만 — 돌리거나 크기가 바뀌어도 다시 잴 것이 없다 · 움직이는 볼은 transform만(구형 태블릿) · 앱을 내리면 멈췄다가 이어서
import { sfx } from './sfx.js';
import { musicMode } from './gamesong.js'; // 🎵 게임 음악 상태 (v335 · 순수)

/** 한 판(초) · 마당(칸) */
export const TOWER_SEC = 60;
export const TOWER_W = 100;
export const TOWER_H = 75;
/** 땅(처음 화면 y) · 매달린 볼 가운데(화면 y) · 탑 꼭대기가 올라올 수 있는 끝(화면 y — 넘으면 마당이 내려간다) */
export const FLOOR_Y = 70;
export const HANG_Y = 10;
export const TOP_Y = 36;
/** 볼 지름 · 한 층 높이(조금 겹쳐 쌓인 듯) · 받침돌 높이·너비 */
export const BALL = 12;
export const STEP = 11;
export const BASE_H = 8;
export const BASE_W = 28;
/** 맞음 — 떨어진 볼 가운데와 맨 위 볼 가운데의 거리(칸) · 딱 · 받침돌 위 첫 볼은 넓게 */
export const PERFECT_D = 2;
export const OK_D = 7; // 8칸이었다 (v351 — 진우 「너무 쉬워요」 → 아버님 「추천대로」)
export const BASE_OK_D = 12;
/** 볼이 좌우로 가는 끝(가운데 x) — 탑도 이 안에서만 쌓인다(비뚤게 쌓여도 마당 밖으로 안 나간다) */
export const X_MIN = BALL / 2 + 1;
export const X_MAX = TOWER_W - BALL / 2 - 1;
/** ⭐ */
export const TOWER_PTS = { perfect: 2, stack: 1 };
const FIRST_MS = 400; // 「준비!」 뒤 첫 볼까지
const NEXT_MS = 350;  // 쌓인 뒤 다음 볼까지 (마당이 내려가는 0.25초가 끝난 뒤)
const MISS_MS = 700;  // 굴러떨어진 뒤 다음 볼까지 (굴러가는 모습을 보게)
const FALL = 180;     // 떨어지는 빠르기 칸/초
const STEP_MS = 16;
const LATE_MS = 100;  // 화면이 이만큼 넘게 늦게 내려앉음을 그리면 마당을 바로 옮긴다 (🔍 Codex 117차 #2)

const nz = (v) => {
  const n = Math.floor(Number(v) || 0);
  return n > 0 ? n : 0;
};

/** 볼 빠르기 (순수) — 쌓은 층 → 칸/초 · 높이 쌓을수록 조금씩(36 → 64 · 32에서 시작했다 (v351 — 진우 「너무 쉬워요」 → 아버님 「추천대로」)) · 놓쳐도 느린 채로(못 쌓아도 어려워지지 않는다) */
export function towerSpeed(floors) {
  return Math.min(64, 36 + 2 * nz(floors));
}
/** 꼭대기 높이 (순수) — 받침돌 + 층 */
export function topH(floors) {
  return BASE_H + nz(floors) * STEP;
}
/** 마당이 내려간 만큼 (순수) — 꼭대기가 화면 TOP_Y보다 위로 오면 그만큼 */
export function camFor(floors) {
  return Math.max(0, topH(floors) - (FLOOR_Y - TOP_Y));
}
/** 맨 위 볼 가운데 x (순수) — 아직 없으면 받침돌 가운데 */
export function topX(s) {
  return s.tower.length ? s.tower[s.tower.length - 1].x : TOWER_W / 2;
}

/** 새 판 (순수) */
export function towerStart(now) {
  return { t0: now, end: now + TOWER_SEC * 1000, last: now, phase: 'wait', next: now + FIRST_MS, ball: null, seq: 0, tower: [], cam: 0, score: 0, perfects: 0, misses: 0 };
}

/** 떨어진 자리 판정 (순수) — x = 볼 가운데 → 'perfect' | 'stack' | 'miss' */
export function towerJudge(s, x) {
  const d = Math.abs(Number(x) - topX(s));
  if (d <= PERFECT_D) return 'perfect';
  return d <= (s.tower.length ? OK_D : BASE_OK_D) ? 'stack' : 'miss';
}

/**
 * 시계 (순수) — 지난번부터 now까지 16ms씩 나눠 움직인다(느린 태블릿에서도 끝을 건너뛰지 않게) · 판 끝을 넘지 않는다
 * → { added: [볼], landed: [{ ball, kind: 'perfect'|'stack', pts, floor, at }], missed: [{ ball, side: -1|1, at }] } · at = 내려앉은 때(ms)
 * ★ 화면이 늦게 불러 한 번에 따라잡으면 앞 볼의 landed/missed와 다음 볼의 added가 함께 온다 — 차례는 늘 앞 볼이 먼저 (🔍 Codex 117차 #1)
 */
export function towerTick(s, now, rng = Math.random) {
  const ev = { added: [], landed: [], missed: [] };
  const to = Math.min(Number(now) || 0, s.end);
  while (s.last < to) {
    const dt = Math.min(STEP_MS, to - s.last);
    s.last += dt;
    const t = s.last;
    if (s.phase === 'wait') {
      if (t >= s.next) {
        const fromLeft = rng() < 0.5;
        const sp = towerSpeed(s.tower.length);
        s.ball = { n: ++s.seq, x: fromLeft ? X_MIN : X_MAX, vx: fromLeft ? sp : -sp, h: FLOOR_Y - HANG_Y + s.cam };
        s.phase = 'slide';
        ev.added.push(s.ball);
      }
      continue;
    }
    const b = s.ball;
    if (s.phase === 'slide') {
      b.x += (b.vx * dt) / 1000;
      if (b.x > X_MAX) { b.x = 2 * X_MAX - b.x; b.vx = -Math.abs(b.vx); }
      else if (b.x < X_MIN) { b.x = 2 * X_MIN - b.x; b.vx = Math.abs(b.vx); }
      continue;
    }
    // 'fall' — 똑바로 아래로 (x는 누른 자리 그대로)
    const land = topH(s.tower.length) + STEP / 2;
    b.h -= (FALL * dt) / 1000;
    if (b.h > land) continue;
    b.h = land;
    const kind = towerJudge(s, b.x);
    if (kind === 'miss') {
      s.misses += 1;
      ev.missed.push({ ball: b, side: b.x < topX(s) ? -1 : 1, at: t });
      s.next = t + MISS_MS;
    } else {
      if (kind === 'perfect') { b.x = topX(s); s.perfects += 1; } // 딱 — 반듯하게
      const pts = TOWER_PTS[kind];
      s.score += pts;
      s.tower.push({ n: b.n, x: b.x, perfect: kind === 'perfect' });
      s.cam = camFor(s.tower.length);
      ev.landed.push({ ball: b, kind, pts, floor: s.tower.length, at: t });
      s.next = t + NEXT_MS;
    }
    s.ball = null;
    s.phase = 'wait';
  }
  return ev;
}

/** 톡 (순수 · 부르는 쪽이 먼저 now까지 시계를 돌린다) → 'drop' | 'busy'(떨어지는 중·다음 볼 기다림 — 아무것도 안 함) | 'over' */
export function towerTap(s, now) {
  if (now >= s.end) return 'over';
  if (s.phase !== 'slide' || !s.ball) return 'busy';
  s.phase = 'fall';
  return 'drop';
}

/** 멈췄던 만큼 뒤로 민다 (순수) — 앱을 내렸다 돌아오면 남은 시간이 그대로 */
export function towerShift(s, ms) {
  const d = nz(ms);
  if (!d) return;
  s.t0 += d; s.end += d; s.last += d; s.next += d;
}

// ───────────────────── 화면 (여기부터 브라우저) ─────────────────────

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
const pct = (v) => `${v.toFixed(3)}%`;
/** 볼 그림 하나 — 무늬는 안쪽(.gt-ball-in · css)에 · 바깥은 자리만 */
function ballEl(cls) {
  const b = el('span', `gt-ball${cls ? ` ${cls}` : ''}`);
  b.appendChild(el('span', 'gt-ball-in'));
  return b;
}
/** 마당 안 자리(%) — 땅에서 잰 높이 h · 왼쪽 위 모서리 */
const leftOf = (x, w) => pct(x - w / 2);
const topOf = (h, ht) => pct(((FLOOR_Y - h - ht / 2) / TOWER_H) * 100);

/**
 * 한 판 돌리기 → { done: Promise<{ score, quit }>, stop() }
 * stage = 그릴 자리(비워서 쓴다) · o.hero = 응원하는 쪽 { html } (파트너 그림 또는 캐릭터) · o.rng
 * stop()은 ✕·집을 닫을 때 — 그 자리에서 끝(quit)
 */
export function runTower(stage, o = {}) {
  const now = () => performance.now();
  const rng = typeof o.rng === 'function' ? o.rng : Math.random;
  stage.innerHTML = '';
  const root = el('div', 'gd gt');
  root.style.setProperty('--gd-sec', `${TOWER_SEC}s`);
  const top = el('div', 'gd-top');
  const scoreEl = el('span', 'gd-score', '⭐ 0');
  const time = el('div', 'gd-time');
  time.appendChild(el('i'));
  const floorEl = el('span', 'gt-floor', '🗼 0층');
  top.append(scoreEl, floorEl, time);
  const field = el('div', 'gt-field');
  field.tabIndex = 0;
  field.setAttribute('role', 'button');
  field.setAttribute('aria-label', '톡 하면 몬스터볼이 떨어져요');
  // 땅·받침돌·쌓인 볼·구름 — 탑이 높아지면 이 층이 통째로 내려간다 (매달린 볼은 sky에 — 늘 같은 높이)
  const world = el('div', 'gt-world');
  for (let i = 0; i < 8; i++) {
    const c = el('span', 'gt-cloud');
    c.style.left = pct(i % 2 ? 60 : 8);
    c.style.top = pct(((FLOOR_Y - (46 + i * 52)) / TOWER_H) * 100);
    world.appendChild(c);
  }
  const ground = el('span', 'gt-ground');
  ground.style.top = pct((FLOOR_Y / TOWER_H) * 100);
  const base = el('span', 'gt-base');
  base.style.left = pct(TOWER_W / 2 - BASE_W / 2);
  base.style.top = pct(((FLOOR_Y - BASE_H) / TOWER_H) * 100);
  base.style.width = pct(BASE_W);
  base.style.height = pct((BASE_H / TOWER_H) * 100);
  world.append(ground, base);
  const sky = el('div', 'gt-sky');
  field.append(world, sky);
  const hint = el('p', 'gt-hint', '톡! 맨 위 볼에 딱 맞춰 떨어뜨려요');
  const pal = el('div', 'gd-pal');
  pal.innerHTML = (o.hero && o.hero.html) || '<span class="gd-pal-emoji">🐾</span>';
  const fx = el('div', 'gd-fx');
  const banner = el('div', 'gd-banner', '준비!');
  // 화면 읽기 — 쌓였는지·굴러떨어졌는지 짧게 (보이지 않는 한 줄 · 🔍 Codex 117차 접근성)
  const say = el('p', 'sr-only');
  say.setAttribute('role', 'status');
  say.setAttribute('aria-live', 'polite');
  root.append(top, field, hint, pal, fx, banner, say);
  stage.appendChild(root);

  let s = null;
  const skyEls = new Map(); // 매달린·떨어지는·굴러가는 볼 번호 → 그림 (한 번에 따라잡아도 볼끼리 안 섞이게 — 🔍 Codex 117차 #1)
  let timer = 0;
  let frame = 0;
  let pausedAt = 0;
  let finished = false;
  let resolveDone;
  const done = new Promise((r) => { resolveDone = r; });

  /** 마당 안 자리(칸) → 루트 기준 px (날아가는 글씨) */
  const spot = (x, y) => {
    const a = field.getBoundingClientRect();
    const b = root.getBoundingClientRect();
    return { left: a.left - b.left + (x / TOWER_W) * a.width, top: a.top - b.top + (y / TOWER_H) * a.height };
  };
  const fly = (text, x, y, cls) => {
    const p = spot(x, y);
    const f = el('span', `gd-fly ${cls || ''}`, text);
    f.style.left = `${p.left}px`;
    f.style.top = `${p.top}px`;
    fx.appendChild(f);
    setTimeout(() => f.remove(), 1100);
  };
  /** 매달린·떨어지는 볼 자리 — 제 크기에 대한 %(transform) */
  const place = (e, b) => {
    const y = FLOOR_Y - b.h + s.cam;
    e.style.transform = `translate3d(${pct(((b.x - BALL / 2) / BALL) * 100)}, ${pct(((y - BALL / 2) / BALL) * 100)}, 0)`;
  };
  const draw = () => {
    const e = s && s.ball ? skyEls.get(s.ball.n) : null;
    if (e) place(e, s.ball);
  };
  /**
   * 마당이 내려간 만큼 — 보통은 css가 0.25초에 걸쳐(다음 볼은 0.35초 뒤라 그 전에 끝난다)
   * snap: 화면이 늦게 불러 내려앉은 지 한참 지났으면 바로 그 자리로 — 다음 볼이 이미 나와 곧 떨어질 수 있다 (🔍 Codex 117차 #2)
   */
  const camera = (snap) => {
    const tf = `translate3d(0, ${pct((s.cam / TOWER_H) * 100)}, 0)`;
    if (!snap) { world.style.transform = tf; return; }
    world.style.transition = 'none';
    world.style.transform = tf;
    void world.offsetWidth; // 옮긴 자리를 먼저 그리게
    world.style.transition = '';
  };
  // 차례: 앞 볼(굴러떨어짐·쌓임)을 먼저 끝내고 다음 볼 — 한 번에 따라잡은 시계도 이 차례로 온다 (🔍 Codex 117차 #1)
  const apply = (ev) => {
    for (const m of ev.missed) {
      const e = skyEls.get(m.ball.n);
      skyEls.delete(m.ball.n);
      if (e) {
        place(e, m.ball);
        e.classList.remove('is-hang');
        e.classList.add('is-miss', m.side < 0 ? 'is-l' : 'is-r');
        setTimeout(() => e.remove(), 700);
      }
      fly('데굴데굴~', m.ball.x, FLOOR_Y - m.ball.h + s.cam - 8, 'is-roll');
      say.textContent = '데굴데굴 굴러떨어졌어요';
      sfx.whoosh();
    }
    for (const l of ev.landed) {
      const old = skyEls.get(l.ball.n);
      skyEls.delete(l.ball.n);
      if (old) old.remove();
      // 쌓인 볼은 마당(world) 안 제자리에 — 그 순간 화면에선 같은 자리(마당은 아래에서 내려간다)
      const e = ballEl(`is-land${l.kind === 'perfect' ? ' is-perfect' : ''}`);
      e.style.left = leftOf(l.ball.x, BALL);
      e.style.top = topOf(l.ball.h, BALL);
      world.appendChild(e);
      const late = s.last - l.at > LATE_MS;
      const y = FLOOR_Y - l.ball.h + (late ? s.cam : camFor(l.floor - 1)); // 마당이 내려가기 전 화면 자리 (바로 옮기면 옮긴 자리)
      fly(l.kind === 'perfect' ? `✨ 딱! +${l.pts}` : `+${l.pts}`, l.ball.x, y - 8, l.kind === 'perfect' ? 'is-big' : '');
      if (l.floor % 10 === 0) fly(`🎉 ${l.floor}층!`, TOWER_W / 2, y + 4, 'is-big');
      if (l.kind === 'perfect') { sfx.twinkle(); replay(pal, 'is-hop'); } else sfx.ding();
      scoreEl.textContent = `⭐ ${s.score}`;
      floorEl.textContent = `🗼 ${s.tower.length}층`;
      say.textContent = `${l.kind === 'perfect' ? '딱! ' : ''}${l.floor}층`;
      camera(late);
    }
    for (const b of ev.added) {
      const e = ballEl('is-hang');
      sky.appendChild(e);
      skyEls.set(b.n, e);
      place(e, b);
    }
  };
  const drop = () => {
    if (!s || finished || pausedAt) return;
    const t = now();
    apply(towerTick(s, t, rng)); // 누른 때까지 움직이고 나서 떨어뜨린다
    if (towerTap(s, t) === 'drop') {
      sfx.tick();
      const e = skyEls.get(s.ball.n);
      if (e) e.classList.remove('is-hang');
    }
    draw();
  };
  field.addEventListener('pointerdown', (e) => { e.preventDefault(); drop(); });
  // ⌨️ 마당에 포커스가 있을 때만 키보드로도 (✕ 단추 위의 스페이스와 겹치지 않게 — 🏃 달리기와 같게)
  field.addEventListener('keydown', (e) => {
    if (e.key !== ' ' && e.key !== 'Enter' && e.key !== 'ArrowDown') return;
    e.preventDefault();
    if (!e.repeat) drop();
  });

  const onVis = () => {
    if (!s || finished) return;
    if (document.hidden) { pausedAt = now(); root.classList.add('is-paused'); return; }
    if (pausedAt) { towerShift(s, now() - pausedAt); pausedAt = 0; root.classList.remove('is-paused'); }
  };
  const finish = (quit) => {
    if (finished) return;
    finished = true;
    clearInterval(timer);
    if (frame && typeof cancelAnimationFrame === 'function') cancelAnimationFrame(frame);
    document.removeEventListener('visibilitychange', onVis);
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
    apply(towerTick(s, t, rng));
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
  setTimeout(() => {
    if (finished) return;
    banner.classList.remove('is-on');
    s = towerStart(now());
    root.classList.add('is-go');
    if (document.hidden) { pausedAt = now(); root.classList.add('is-paused'); }
    camera();
    startLoop();
    if (typeof field.focus === 'function') { try { field.focus({ preventScroll: true }); } catch { /* 옛 브라우저 */ } }
  }, 800);
  banner.classList.add('is-on');
  sfx.tick();

  // 🎵 게임 음악(v335) — 끝나면 stop · 마지막 10초면 hurry (내려 둔 동안은 멈춘 때로 셈)
  return { done, stop: () => finish(true), music: () => musicMode({ over: finished, left: s ? s.end - (pausedAt || now()) : null }) };
}
