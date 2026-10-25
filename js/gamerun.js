// 🏃 파트너 달리기 — 🎮 게임기 미니 게임 둘째 (v308 · 2026-10-21 아버님 "배포하고 다음 판 진행하자" → 기본안 그대로)
// 🤝 파트너가 달린다(없으면 내 캐릭터) — 톡 누르면 폴짝 · 공중에서 한 번 더 누르면 한 번 더 · 🍓 나무열매 ⭐1 · ✨ 황금 열매(높은 곳 — 두 번 뛰어야) ⭐3
// 🪨 돌에 부딪히면 꽈당 — 1초 멈칫(점수는 안 깎는다) · 목숨·게임 오버 없이 30초가 끝나면 늘 끝까지 · 점수는 최고 기록만(homeplay.best)
//
// 위쪽(엔진)은 순수 — 시각(ms)과 rng만 받아 상태를 바꾼다(node 시험이 가짜 시계로 끝까지 돌린다) · 아래쪽(runRun)이 화면
// 자리는 "칸": 마당 너비 100칸 · 땅 위 56칸(화면은 너비에 맞춰 늘린다) · 움직이는 것은 transform만(구형 태블릿) · 앱을 내리면 멈췄다가 이어서
import { sfx, vibrate } from './sfx.js';
import { musicMode } from './gamesong.js'; // 🎵 게임 음악 상태 (v335 · 순수)

/** 한 판(초) · 꽈당 동안(ms) */
export const RUN_SEC = 30;
export const STUMBLE_MS = 1000;
/** 마당 — 너비 · 땅 위 높이 · 땅 두께(그림만) (칸) */
export const RUN_W = 100;
export const RUN_H = 56;
const GROUND = 8;
const FIELD_H = RUN_H + GROUND;
/** 달리는 쪽 — 왼쪽에서 16칸 · 11×13칸 */
export const ME = { x: 16, w: 11, h: 13 };
/** 뛰기 — 중력 · 땅에서 뛰는 힘 · 공중에서 한 번 더 (칸/초) → 한 번이면 24칸 · 두 번이면 40칸까지 */
export const GRAVITY = 300;
export const JUMP_V = 120;
export const JUMP2_V = 100;
/** 땅에 닿기 바로 앞에 누른 것은 닿자마자 뛴다(ms) — 아이 손이 조금 빨라도 */
export const BUFFER_MS = 150;
/** 물건 — 크기(칸) · ⭐ */
export const RUN_KINDS = {
  rock: { w: 8, h: 8, pts: 0 },
  berry: { w: 6, h: 6, pts: 1 },
  gold: { w: 6, h: 6, pts: 3 },
};
/** 나무열매 높이 — 땅 · 한 번 뛰면 닿는 곳 · 두 번 뛰어야 닿는 곳(황금) */
export const BERRY_Y = { ground: 2, air: 20, high: 38 };
/** 돌과 돌 사이는 적어도 이만큼(칸) — 내려앉아 다시 뛸 틈 (가장 빠를 때 1초) */
export const ROCK_GAP = 60;
const SPAWN_X = 104;
const FIRST_AT = 30;
const STEP_MS = 16;
/** 땅 무늬 한 칸(칸) — 땅이 흐르는 것처럼 */
const STRIPE = 10;

const nz = (v) => {
  const n = Math.floor(Number(v) || 0);
  return n > 0 ? n : 0;
};

/** 빠르기 (순수) — 지난 시간 ms → 칸/초 · 40에서 끝으로 갈수록 60까지 */
export function runSpeed(ms) {
  const k = Math.min(1, Math.max(0, (Number(ms) || 0) / (RUN_SEC * 1000)));
  return 40 + 20 * k;
}

/**
 * 다음 묶음 (순수) — r = rng() 하나 · 돌 30% · 돌 위 열매 25% · 땅 열매 줄 20% · 공중 열매 17% · 황금 열매 8%
 * (땅 열매가 많으면 안 누르고 달리기만 해도 점수가 많이 나온다 — 뛰어야 먹는 열매를 더 많이)
 */
export function runChunk(r) {
  if (r < 0.3) return 'rock';
  if (r < 0.55) return 'rockBerry';
  if (r < 0.75) return 'row';
  if (r < 0.92) return 'arc';
  return 'gold';
}

/** 새 판 (순수) — now = 시작 시각(ms) */
export function runStart(now) {
  return {
    t0: now, end: now + RUN_SEC * 1000, last: now,
    dist: 0, nextAt: FIRST_AT, rockAt: -ROCK_GAP, objs: [], seq: 0,
    y: 0, vy: 0, jumps: 0, buffer: 0, stumbleUntil: 0,
    score: 0, berries: 0, golds: 0, bumps: 0,
  };
}

function put(s, kind, dx, y) {
  const k = RUN_KINDS[kind];
  const o = { n: ++s.seq, kind, x: SPAWN_X + dx, y, w: k.w, h: k.h };
  s.objs.push(o);
  return o;
}
/** 묶음 하나 내기 → 낸 것들 · 다음 묶음 자리(s.nextAt)도 정한다 · 돌이 너무 붙으면 땅 열매 줄로 */
function spawn(s, rng) {
  let kind = runChunk(rng());
  if ((kind === 'rock' || kind === 'rockBerry') && s.dist - s.rockAt < ROCK_GAP) kind = 'row';
  const out = [];
  let len = 8;
  if (kind === 'rock' || kind === 'rockBerry') {
    out.push(put(s, 'rock', 0, 0));
    if (kind === 'rockBerry') out.push(put(s, 'berry', 1, BERRY_Y.air));
    s.rockAt = s.dist;
  } else if (kind === 'row') {
    for (let i = 0; i < 3; i++) out.push(put(s, 'berry', i * 8, BERRY_Y.ground));
    len = 22;
  } else if (kind === 'arc') {
    [16, 22, 16].forEach((y, i) => out.push(put(s, 'berry', i * 8, y)));
    len = 22;
  } else {
    out.push(put(s, 'gold', 0, BERRY_Y.high));
    len = 6;
  }
  s.nextAt = s.dist + len + 24 + Math.floor(rng() * 20);
  return out;
}

/** 닿았나 (순수) — 달리는 쪽 가장자리는 조금 봐준다(돌은 아깝게 스친 건 안 넘어지게 · 열매는 조금 넉넉히) */
export function runHits(s, o) {
  const l = ME.x + 1.5;
  const r = ME.x + ME.w - 1.5;
  const b = s.y + 1;
  const t = s.y + ME.h;
  if (o.kind === 'rock') return o.x + 1 < r && o.x + o.w - 1 > l && b < o.y + o.h - 1;
  return o.x < r + 1 && o.x + o.w > l - 1 && b < o.y + o.h && t > o.y;
}

function jumpNow(s) {
  s.vy = JUMP_V;
  s.jumps = 1;
  s.buffer = 0;
}

function step(s, t, dt, rng, ev) {
  const stumbling = t < s.stumbleUntil;
  // 마당이 흐른다 (꽈당 동안은 멈춤)
  const dx = stumbling ? 0 : runSpeed(t - s.t0) * dt;
  if (dx > 0) {
    s.dist += dx;
    for (const o of s.objs) o.x -= dx;
    if (s.dist >= s.nextAt) ev.added.push(...spawn(s, rng));
  }
  // 뛰기
  if (s.y > 0 || s.vy > 0) {
    s.vy -= GRAVITY * dt;
    s.y += s.vy * dt;
    if (s.y <= 0) {
      s.y = 0;
      s.vy = 0;
      s.jumps = 0;
      if (s.buffer && t <= s.buffer && !stumbling) { jumpNow(s); ev.jumped = true; }
      s.buffer = 0;
    }
  }
  // 닿기 · 지나간 것
  for (let i = s.objs.length - 1; i >= 0; i--) {
    const o = s.objs[i];
    if (o.x + o.w < -4) { s.objs.splice(i, 1); ev.gone.push(o); continue; }
    if (!runHits(s, o)) continue;
    if (o.kind === 'rock') {
      if (t < s.stumbleUntil) continue;
      s.objs.splice(i, 1);
      s.stumbleUntil = t + STUMBLE_MS;
      s.bumps += 1;
      ev.bumps.push(o);
    } else {
      s.objs.splice(i, 1);
      const pts = RUN_KINDS[o.kind].pts;
      s.score += pts;
      if (o.kind === 'gold') s.golds += 1; else s.berries += 1;
      ev.got.push({ o, pts });
    }
  }
}

/**
 * 시계 (순수) — 지난번부터 now까지 16ms씩 나눠 움직인다(빨라도 돌을 뚫고 지나가지 않게) · 판 끝을 넘지 않는다
 * → { added, got: [{ o, pts }], bumps, gone, jumped(내려앉자마자 뛰었다) }
 */
export function runTick(s, now, rng = Math.random) {
  const ev = { added: [], got: [], bumps: [], gone: [], jumped: false };
  const to = Math.min(Number(now) || 0, s.end);
  while (s.last < to) {
    const dt = Math.min(STEP_MS, to - s.last);
    s.last += dt;
    step(s, s.last, dt / 1000, rng, ev);
  }
  return ev;
}

/**
 * 톡 (순수) → 'jump'(땅에서) | 'double'(공중에서 한 번 더) | 'buffer'(내려앉기 바로 앞 — 닿자마자 뛴다) | 'air'(더는 못 뜀) | 'stumble'(꽈당 동안) | 'over'
 * 화면은 먼저 runTick(s, now)으로 now까지 움직인 뒤에 부른다
 */
export function runTap(s, now) {
  if (now >= s.end) return 'over';
  if (now < s.stumbleUntil) return 'stumble';
  if (s.jumps === 0 && s.y <= 0) { jumpNow(s); return 'jump'; }
  if (s.jumps === 1) { s.vy = JUMP2_V; s.jumps = 2; return 'double'; }
  if (s.vy < 0 && s.y < 8) { s.buffer = now + BUFFER_MS; return 'buffer'; }
  return 'air';
}

/** 멈췄던 만큼 뒤로 민다 (순수) — 앱을 내렸다 돌아오면 남은 시간이 그대로 */
export function runShift(s, ms) {
  const d = nz(ms);
  if (!d) return;
  s.t0 += d; s.end += d; s.last += d;
  if (s.stumbleUntil) s.stumbleUntil += d;
  if (s.buffer) s.buffer += d;
}

// ───────────────────── 화면 (여기부터 브라우저) ─────────────────────

/** 돌 · 나무열매 · 황금 열매 (코드로 그린 것 — 인터넷 없이도 · 🍓 나무열매 받기도 같은 열매) */
export const ART = {
  rock: '<svg viewBox="0 0 40 40" aria-hidden="true"><path d="M3 39 8 17 18 5 30 9 37 23 38 39Z" fill="#8d99ae" stroke="#4a5160" stroke-width="2.5" stroke-linejoin="round"/><path d="M12 19l7-8M24 15l6 6" stroke="#c4cad6" stroke-width="2.5" stroke-linecap="round"/></svg>',
  berry: '<svg viewBox="0 0 40 40" aria-hidden="true"><path d="M20 10c-3-5-9-6-12-4 2 4 7 6 12 4zM20 10c3-5 9-6 12-4-2 4-7 6-12 4z" fill="#40c057"/><circle cx="20" cy="24" r="14" fill="#e8413b" stroke="#a61e1e" stroke-width="2"/><circle cx="14" cy="19" r="3.5" fill="#fff" opacity=".7"/></svg>',
  gold: '<svg viewBox="0 0 40 40" aria-hidden="true"><path d="M20 8c-2-4-6-5-9-3 2 3 6 4 9 3z" fill="#40c057"/><circle cx="20" cy="23" r="15" fill="#ffd43b" stroke="#e67700" stroke-width="2.5"/><path d="M20 13l3 7 7 .6-5.4 4.6 1.7 7-6.3-3.9-6.3 3.9 1.7-7L10 20.6l7-.6z" fill="#fff3bf"/></svg>',
};

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}
/** 애니메이션 다시 틀기 — 꼴을 뗐다가 다시 붙인다 */
function replay(node, cls) {
  node.classList.remove(cls);
  void node.offsetWidth;
  node.classList.add(cls);
}

/**
 * 한 판 돌리기 → { done: Promise<{ score, quit }>, stop() }
 * stage = 그릴 자리(비워서 쓴다) · o.hero = 달리는 쪽 { html } (파트너 그림 또는 캐릭터) · o.rng
 * stop()은 ✕·집을 닫을 때 — 그 자리에서 끝(quit)
 */
export function runRun(stage, o = {}) {
  const now = () => performance.now();
  const rng = typeof o.rng === 'function' ? o.rng : Math.random;
  stage.innerHTML = '';
  const root = el('div', 'gd gr');
  root.style.setProperty('--gd-sec', `${RUN_SEC}s`);
  const top = el('div', 'gd-top');
  const scoreEl = el('span', 'gd-score', '⭐ 0');
  const time = el('div', 'gd-time');
  time.appendChild(el('i'));
  top.append(scoreEl, time);
  const field = el('div', 'gr-field');
  field.setAttribute('aria-label', '톡 누르면 폴짝');
  const ground = el('div', 'gr-ground');
  const layer = el('div', 'gr-layer');
  const dot = el('div', 'gr-dot');
  const me = el('div', 'gr-me');
  const meIn = el('div', 'gr-me-in');
  meIn.innerHTML = (o.hero && o.hero.html) || '<span class="gd-pal-emoji">🐾</span>';
  me.appendChild(meIn);
  field.append(el('span', 'gr-cloud'), el('span', 'gr-cloud is-b'), ground, layer, dot, me);
  const hint = el('p', 'gr-hint', '톡! 누르면 폴짝 · 공중에서 한 번 더');
  const fx = el('div', 'gd-fx');
  const banner = el('div', 'gd-banner', '준비!');
  root.append(top, field, hint, fx, banner);
  stage.appendChild(root);

  let unit = 3; // 한 칸 = px (마당 너비 ÷ 100)
  const measure = () => {
    const w = field.getBoundingClientRect().width;
    if (w > 0) unit = w / RUN_W;
    ground.style.backgroundSize = `${STRIPE * unit}px 100%`;
  };
  const els = new Map(); // 물건 n → 그림
  const make = (ob) => {
    const e = el('span', `gr-obj is-${ob.kind}`);
    e.innerHTML = ART[ob.kind];
    e.style.width = `${ob.w}%`;
    e.style.height = `${(ob.h / FIELD_H) * 100}%`;
    layer.appendChild(e);
    els.set(ob.n, e);
  };
  const drop = (ob, cls) => {
    const e = els.get(ob.n);
    els.delete(ob.n);
    if (!e) return;
    if (!cls) { e.remove(); return; }
    e.classList.add(cls);
    setTimeout(() => e.remove(), 400);
  };
  const fly = (text, x, y, cls) => {
    const a = field.getBoundingClientRect();
    const b = root.getBoundingClientRect();
    const f = el('span', `gd-fly ${cls || ''}`, text);
    f.style.left = `${a.left - b.left + x * unit}px`;
    f.style.top = `${a.top - b.top + (RUN_H - y) * unit - 12}px`;
    fx.appendChild(f);
    setTimeout(() => f.remove(), 900);
  };

  let s = null;
  let timer = 0;
  let frame = 0;
  let pausedAt = 0;
  let finished = false;
  let resolveDone;
  const done = new Promise((r) => { resolveDone = r; });

  const draw = () => {
    if (!s) return;
    for (const ob of s.objs) {
      const e = els.get(ob.n);
      if (e) e.style.transform = `translate3d(${(ob.x * unit).toFixed(1)}px, ${(-ob.y * unit).toFixed(1)}px, 0)`;
    }
    me.style.transform = `translate3d(0, ${(-s.y * unit).toFixed(1)}px, 0)`;
    dot.style.transform = `scale(${(1 - Math.min(0.6, s.y / 60)).toFixed(2)})`;
    me.classList.toggle('is-air', s.y > 0);
    ground.style.transform = `translate3d(${(-(s.dist % STRIPE) * unit).toFixed(1)}px, 0, 0)`;
  };
  const apply = (ev) => {
    for (const ob of ev.added) make(ob);
    for (const ob of ev.gone) drop(ob);
    for (const g of ev.got) {
      drop(g.o, 'is-got');
      fly(`+${g.pts}`, g.o.x + g.o.w / 2, g.o.y + g.o.h, g.pts > 1 ? 'is-big' : '');
      if (g.pts > 1) sfx.twinkle(); else sfx.ding();
    }
    if (ev.got.length) scoreEl.textContent = `⭐ ${s.score}`;
    for (const ob of ev.bumps) {
      drop(ob, 'is-knock');
      fly('꽈당!', ME.x + ME.w / 2, ME.h + 6, 'is-zap');
      replay(me, 'is-bonk');
      sfx.hit();
      vibrate(80);
    }
    if (ev.jumped) sfx.tick();
  };

  const onVis = () => {
    if (!s || finished) return;
    if (document.hidden) { pausedAt = now(); root.classList.add('is-paused'); return; }
    if (pausedAt) { runShift(s, now() - pausedAt); pausedAt = 0; root.classList.remove('is-paused'); }
  };
  const hasWin = typeof window !== 'undefined' && typeof window.addEventListener === 'function';
  const finish = (quit) => {
    if (finished) return;
    finished = true;
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
    apply(runTick(s, t, rng));
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
  const jump = () => {
    if (!s || finished || pausedAt) return;
    const t = now();
    apply(runTick(s, t, rng)); // 누른 때까지 움직이고 나서 뛴다
    const r = runTap(s, t);
    if (r === 'jump' || r === 'double') sfx.tick();
    if (r === 'double') replay(me, 'is-flip');
    draw();
  };
  field.addEventListener('pointerdown', (e) => { e.preventDefault(); jump(); });
  // ⌨️ 마당에 포커스가 있을 때만 키보드로도 (✕ 단추 위의 스페이스와 겹치지 않게 — 🔍 Codex 114차 접근성)
  field.tabIndex = 0;
  field.setAttribute('role', 'button');
  field.addEventListener('keydown', (e) => {
    if (e.key !== ' ' && e.key !== 'Enter' && e.key !== 'ArrowUp') return;
    e.preventDefault();
    if (!e.repeat) jump();
  });
  // 꽈당·한 바퀴는 끝나면 꼴을 뗀다 — 남아 있으면 다음 한 바퀴가 안 보인다 (🔍 Codex 114차 #3)
  me.addEventListener('animationend', (e) => {
    if (e.animationName === 'gr-bonk') me.classList.remove('is-bonk');
    if (e.animationName === 'gr-flip') me.classList.remove('is-flip');
  });

  // 준비! → 시작 · 앱이 내려간 것은 「준비!」 때부터 듣는다(디그다와 같게 — 🔍 Codex 113차 #3)
  document.addEventListener('visibilitychange', onVis);
  if (hasWin) window.addEventListener('resize', measure);
  setTimeout(() => {
    if (finished) return;
    banner.classList.remove('is-on');
    measure();
    s = runStart(now());
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
