// 🎈 로켓단 열기구 — 🎮 게임기 미니 게임 여섯째 (v310 · 2026-10-21 아버님 "로켓단 열기구 진행하자" → 물음 추천안)
// 하늘에 로켓단 나옹 열기구(⚔️ 로켓단 배틀과 같은 노란 열기구 · R)가 둥실둥실 — 톡 누르면 🤝 파트너 기술(⚔️ 배틀과 같은 강한 기술)이 날아가 펑 ⭐1
// 가끔 나오는 **큰 나옹 열기구는 ❤️ 세 번 맞혀야 펑 ⭐5**(로켓단 배틀처럼) · 터지면 「불쌍한 내 인생~」 하며 하늘 저편으로 ✨
// v332(아버님 "너무 쉬운 것 같으니"): 1.5배 빠르게 · 🆕 거대 열기구 ❤️ 여섯 번 ⭐12 · 🆕 꼬마 열기구(작고 아주 빠름) ⭐2
// 한 판 30초 · 목숨·게임 오버 없이 늘 끝까지 · 빈 하늘·놓친 열기구는 감점 없음 · 끝으로 갈수록 빨라지고 많아진다 · 점수는 최고 기록만(homeplay.best)
//
// 위쪽(엔진)은 순수 — 시각(ms)과 rng만 받아 상태를 바꾼다(node 시험이 가짜 시계로 끝까지) · 아래쪽(runBalloon)이 화면
// 자리는 "칸": 하늘 너비 100 · 높이 70(y는 위에서 아래로) · 움직이는 것은 transform만(구형 태블릿) · 앱을 내리면 멈췄다가 이어서
import { sfx } from './sfx.js';
import { BLAST } from './rocketview.js'; // 「불쌍한 내 인생~」 — 아버님이 고르신 말 (2026-10-09)

/** 한 판(초) · 하늘(칸) */
export const BAL_SEC = 30;
export const BAL_W = 100;
export const BAL_H = 70;
/**
 * 열기구 — 크기(칸) · 맞혀야 할 수 · ⭐
 * v332(2026-10-25 아버님 "너무 쉬운 것 같으니 열기구가 더 큰 것도 있고 더 빠르게"): 🆕 꼬마(작고 아주 빠름 ⭐2) · 거대(큰 것의 1.4배 · 여섯 번 ⭐12)
 */
export const BAL_KINDS = {
  small: { w: 14, h: 17, hp: 1, pts: 1 },
  big: { w: 22, h: 27, hp: 3, pts: 5 },
  tiny: { w: 10, h: 12, hp: 1, pts: 2 },
  huge: { w: 31, h: 38, hp: 6, pts: 12 },
};
/** 이름 (읽어 주는 말) */
const BAL_KO = { small: '로켓단 열기구', big: '큰 로켓단 열기구', tiny: '꼬마 로켓단 열기구', huge: '거대한 로켓단 열기구' };
/** 빠르기 배 — 꼬마는 빠르게 · 클수록 느리게 */
const SPEED_OF = { small: 1, big: 0.6, tiny: 1.6, huge: 0.45 };
/** 나옹 (열기구 얼굴 — ⚔️ 로켓단과 같은 움직이는 그림) */
export const BAL_MEOWTH = 52;
/** 큰 열기구 — 이 뒤부터(ms) · 나올 때마다 이만큼 · 한 번에 하나만 */
export const BIG_FROM = 5000;
export const BIG_RATE = 0.12;
/** 거대 열기구 (v332) — 이 뒤부터(ms) · 나올 때마다 이만큼 · 한 번에 하나만 */
export const HUGE_FROM = 12000;
export const HUGE_RATE = 0.08;
/** 꼬마 열기구 (v332) — 이 뒤부터(ms) · 나올 때마다 이만큼 (처음 몇 초는 작은 열기구만 — 손을 풀 틈) */
export const TINY_FROM = 4000;
export const TINY_RATE = 0.18;
const FIRST_MS = 600;
const BOB = 3;          // 위아래로 흔들리는 칸
const BOB_MS = 2400;    // 한 번 흔들리는 데
const STEP_MS = 50;

const nz = (v) => {
  const n = Math.floor(Number(v) || 0);
  return n > 0 ? n : 0;
};

/**
 * 빠르기 (순수) — 지난 시간 ms → { most: 한 번에 떠 있는 끝, speed: 칸/초, gap: 다음 열기구까지 ms } · 끝으로 갈수록 많이·빨리
 * v332: 1.5배 빠르게(12→24칸/초였다) · 더 자주(0.9→0.45초였다) · 한 번에 하나 더(2~4였다)
 */
export function balPace(ms) {
  const k = Math.min(1, Math.max(0, (Number(ms) || 0) / (BAL_SEC * 1000)));
  return { most: k < 0.35 ? 3 : k < 0.7 ? 4 : 5, speed: 18 + 18 * k, gap: Math.round(750 - 400 * k) };
}

/** 새 판 (순수) */
export function balStart(now) {
  return { t0: now, end: now + BAL_SEC * 1000, last: now, next: now + FIRST_MS, bals: [], seq: 0, score: 0, pops: 0, bigs: 0, huges: 0, tinies: 0, hits: 0, escaped: 0 };
}

/** 다음 열기구의 종류 (순수) — 거대·큰 것은 한 번에 하나씩 · 처음 몇 초는 작은 것만 */
export function balKind(s, ms, rng) {
  const has = (kind) => s.bals.some((it) => it.kind === kind);
  if (ms >= HUGE_FROM && !has('huge') && rng() < HUGE_RATE) return 'huge';
  if (ms >= BIG_FROM && !has('big') && rng() < BIG_RATE) return 'big';
  if (ms >= TINY_FROM && rng() < TINY_RATE) return 'tiny';
  return 'small';
}

/** 이름 (순수) — 화면이 읽어 주는 말 */
export function balKo(kind) {
  return BAL_KO[kind] || BAL_KO.small;
}

/** 열기구의 지금 높이 (순수) — 가운데 높이에서 둥실둥실 */
export function balY(it, t) {
  return it.y0 + BOB * Math.sin(it.phase + (2 * Math.PI * (t - it.born)) / BOB_MS);
}

function spawn(s, t, rng) {
  const ms = t - s.t0;
  const pace = balPace(ms);
  const kind = balKind(s, ms, rng);
  const k = BAL_KINDS[kind];
  const fromLeft = rng() < 0.5;
  const speed = pace.speed * SPEED_OF[kind] * (0.8 + rng() * 0.4);
  const it = {
    n: ++s.seq, kind, hp: k.hp, w: k.w, h: k.h,
    x: fromLeft ? -k.w / 2 : BAL_W + k.w / 2, vx: fromLeft ? speed : -speed,
    y0: k.h / 2 + BOB + rng() * (BAL_H * 0.72 - k.h - 2 * BOB), phase: rng() * Math.PI * 2, born: t,
  };
  s.bals.push(it);
  return it;
}

/**
 * 시계 (순수) — 지난번부터 now까지 50ms씩 나눠 움직인다 · 판 끝을 넘지 않는다
 * → { added, gone(하늘 밖으로 — 감점 없음) }
 */
export function balTick(s, now, rng = Math.random) {
  const ev = { added: [], gone: [] };
  const to = Math.min(Number(now) || 0, s.end);
  while (s.last < to) {
    const dt = Math.min(STEP_MS, to - s.last);
    s.last += dt;
    const t = s.last;
    for (let i = s.bals.length - 1; i >= 0; i--) {
      const it = s.bals[i];
      it.x += (it.vx * dt) / 1000;
      if (it.x < -it.w || it.x > BAL_W + it.w) {
        s.bals.splice(i, 1);
        s.escaped += 1;
        ev.gone.push(it);
      }
    }
    if (t >= s.next && s.bals.length < balPace(t - s.t0).most) {
      ev.added.push(spawn(s, t, rng));
      s.next = t + balPace(t - s.t0).gap;
    }
  }
  return ev;
}

/**
 * 열기구를 눌렀다 (순수) — n = 열기구 번호 → { kind: 'pop'(+pts) | 'hit'(큰 열기구 · 남은 ❤️) | 'miss'(이미 없음) | 'over', it?, pts?, hp? }
 * 빈 하늘·놓친 열기구는 아무것도 안 깎는다
 */
export function balTap(s, n, now) {
  if (now >= s.end) return { kind: 'over' };
  const i = s.bals.findIndex((it) => it.n === n);
  if (i < 0) return { kind: 'miss' };
  const it = s.bals[i];
  it.hp -= 1;
  s.hits += 1;
  if (it.hp > 0) return { kind: 'hit', it, hp: it.hp };
  s.bals.splice(i, 1);
  const pts = BAL_KINDS[it.kind].pts;
  s.score += pts;
  s.pops += 1;
  if (it.kind === 'big') s.bigs += 1;
  if (it.kind === 'huge') s.huges += 1;
  if (it.kind === 'tiny') s.tinies += 1;
  return { kind: 'pop', it, pts };
}

/** 멈췄던 만큼 뒤로 민다 (순수) — 앱을 내렸다 돌아오면 남은 시간이 그대로(둥실 흔들림도 이어서) */
export function balShift(s, ms) {
  const d = nz(ms);
  if (!d) return;
  s.t0 += d; s.end += d; s.last += d; s.next += d;
  for (const it of s.bals) it.born += d;
}

// ───────────────────── 화면 (여기부터 브라우저) ─────────────────────

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}
/** 「으로/로」 (순수) — 받침이 없거나 ㄹ이면 「로」 (물수리검으로 · 백만볼트로) */
export function ro(word) {
  const c = String(word || '').slice(-1).charCodeAt(0) - 0xAC00;
  if (!(c >= 0 && c <= 11171)) return '로';
  const b = c % 28;
  return b === 0 || b === 8 ? '로' : '으로';
}
function replay(node, cls) {
  node.classList.remove(cls);
  void node.offsetWidth;
  node.classList.add(cls);
}

/**
 * 한 판 돌리기 → { done: Promise<{ score, quit }>, stop() }
 * stage = 그릴 자리(비워서 쓴다) · o.meowth = 나옹 움직이는 그림 주소|null(없으면 😼) · o.move = { name, emoji } 파트너 기술 ·
 * o.hero = 아래에서 기술을 쏘는 쪽 { html } (파트너 그림 또는 캐릭터) · o.rng
 * stop()은 ✕·집을 닫을 때 — 그 자리에서 끝(quit)
 */
export function runBalloon(stage, o = {}) {
  const now = () => performance.now();
  const rng = typeof o.rng === 'function' ? o.rng : Math.random;
  const move = o.move && o.move.emoji ? o.move : { name: '별 던지기', emoji: '⭐' };
  stage.innerHTML = '';
  const root = el('div', 'gd gl');
  root.style.setProperty('--gd-sec', `${BAL_SEC}s`);
  const top = el('div', 'gd-top');
  const scoreEl = el('span', 'gd-score', '⭐ 0');
  const time = el('div', 'gd-time');
  time.appendChild(el('i'));
  top.append(scoreEl, time);
  const field = el('div', 'gl-field');
  const layer = el('div', 'gl-layer');
  const me = el('div', 'gl-me');
  me.innerHTML = (o.hero && o.hero.html) || '<span class="gd-pal-emoji">🐾</span>';
  field.append(el('span', 'gl-cloud'), el('span', 'gl-cloud is-b'), layer, me);
  const hint = el('p', 'gl-hint', `톡! ${move.emoji} ${move.name}${ro(move.name)} 열기구를 터뜨려요`);
  const fx = el('div', 'gd-fx');
  const banner = el('div', 'gd-banner', '준비!');
  root.append(top, field, hint, fx, banner);
  stage.appendChild(root);

  let unit = 3; // 한 칸 = px (하늘 너비 ÷ 100)
  const measure = () => {
    const w = field.getBoundingClientRect().width;
    if (w > 0) unit = w / BAL_W;
  };
  let meowth = o.meowth ? String(o.meowth) : '';
  const els = new Map(); // 열기구 n → 그림

  let s = null;
  let timer = 0;
  let frame = 0;
  let pausedAt = 0;
  let finished = false;
  let resolveDone;
  const done = new Promise((r) => { resolveDone = r; });

  const hearts = (e, hp) => {
    const box = e.querySelector ? e.querySelector('.gl-hp') : null;
    if (box) box.textContent = '❤️'.repeat(Math.max(0, hp));
  };
  const make = (it) => {
    const b = el('button', `gl-bal is-${it.kind}`);
    b.type = 'button';
    b.setAttribute('aria-label', balKo(it.kind));
    b.style.width = `${it.w}%`;
    b.style.height = `${(it.h / BAL_H) * 100}%`;
    const env = el('span', 'gl-env');
    if (meowth) {
      const img = el('img', 'gl-meowth');
      img.alt = '';
      img.draggable = false;
      img.addEventListener('error', () => { meowth = ''; env.innerHTML = '<span class="gl-meowth-alt">😼</span>'; });
      img.src = meowth;
      env.appendChild(img);
    } else env.innerHTML = '<span class="gl-meowth-alt">😼</span>';
    env.appendChild(el('span', 'gl-r', 'R'));
    b.append(env, el('span', 'gl-basket'));
    if (it.hp > 1) b.appendChild(el('span', 'gl-hp', '❤️'.repeat(it.hp))); // 큰·거대 열기구
    b.addEventListener('pointerdown', (e) => { e.preventDefault(); tap(it.n); });
    b.addEventListener('click', (e) => { if (e.detail === 0) tap(it.n); }); // ⌨️ Enter·스페이스(포인터 없이 누른 click)도
    layer.appendChild(b);
    els.set(it.n, b);
  };
  const drop = (it, cls) => {
    const e = els.get(it.n);
    els.delete(it.n);
    if (!e) return;
    if (!cls) { e.remove(); return; }
    e.disabled = true;
    e.classList.remove('is-hit'); // 큰 열기구 — 흔들림이 남으면 몸통만 안 날아간다 (🔍 Codex 116차 #2)
    e.classList.add(cls); // is-pop은 누름을 안 받는다(css) — 날아가는 동안 아래 열기구를 가리지 않게 (🔍 Codex 116차 #1)
    setTimeout(() => e.remove(), 700);
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
    setTimeout(() => f.remove(), 1100);
  };
  /** 기술이 아래(파트너)에서 열기구로 날아간다 — 보기만(점수는 누르는 순간) */
  const shoot = (x, y) => {
    const from = spot(BAL_W / 2, BAL_H - 6);
    const to = spot(x, y);
    const f = el('span', 'gl-shot', move.emoji);
    f.style.left = `${from.left}px`;
    f.style.top = `${from.top}px`;
    f.style.setProperty('--dx', `${(to.left - from.left).toFixed(1)}px`);
    f.style.setProperty('--dy', `${(to.top - from.top).toFixed(1)}px`);
    fx.appendChild(f);
    setTimeout(() => f.remove(), 400);
    replay(me, 'is-shoot');
  };
  const draw = () => {
    if (!s) return;
    for (const it of s.bals) {
      const e = els.get(it.n);
      if (e) e.style.transform = `translate3d(${((it.x - it.w / 2) * unit).toFixed(1)}px, ${((balY(it, s.last) - it.h / 2) * unit).toFixed(1)}px, 0)`;
    }
  };
  const apply = (ev) => {
    for (const it of ev.added) make(it);
    for (const it of ev.gone) drop(it);
  };
  const tap = (n) => {
    if (!s || finished || pausedAt) return;
    const t = now();
    apply(balTick(s, t, rng));
    const it = s.bals.find((x) => x.n === n);
    const at = it ? { x: it.x, y: balY(it, s.last) } : null;
    const r = balTap(s, n, t);
    if (r.kind !== 'pop' && r.kind !== 'hit') return;
    shoot(at.x, at.y);
    if (r.kind === 'hit') {
      const e = els.get(n);
      if (e) {
        replay(e, 'is-hit');
        hearts(e, r.hp);
        e.setAttribute('aria-label', `${balKo(r.it.kind)} ${'❤️'.repeat(r.hp)}`); // 남은 ❤️도 읽힌다
      }
      sfx.hit();
    } else {
      drop(r.it, 'is-pop');
      scoreEl.textContent = `⭐ ${s.score}`;
      fly(`+${r.pts}`, at.x, at.y - 4, r.pts > 1 ? 'is-big' : '');
      if (r.it.kind === 'big' || r.it.kind === 'huge') { fly(BLAST, at.x, at.y + 6, 'is-blast'); sfx.boom(); }
      else sfx.hit();
      setTimeout(() => { if (!finished) sfx.twinkle(); }, 450);
    }
    draw();
  };

  const onVis = () => {
    if (!s || finished) return;
    if (document.hidden) { pausedAt = now(); root.classList.add('is-paused'); return; }
    if (pausedAt) { balShift(s, now() - pausedAt); pausedAt = 0; root.classList.remove('is-paused'); }
  };
  const hasWin = typeof window !== 'undefined' && typeof window.addEventListener === 'function';
  const finish = (quit) => {
    if (finished) return;
    finished = true;
    clearInterval(timer);
    if (frame && typeof cancelAnimationFrame === 'function') cancelAnimationFrame(frame);
    document.removeEventListener('visibilitychange', onVis);
    if (hasWin) window.removeEventListener('resize', measure);
    for (const e of els.values()) e.disabled = true;
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
    apply(balTick(s, t, rng));
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
    s = balStart(now());
    root.classList.add('is-go');
    if (document.hidden) { pausedAt = now(); root.classList.add('is-paused'); }
    draw();
    startLoop();
  }, 800);
  banner.classList.add('is-on');
  measure();
  sfx.tick();

  return { done, stop: () => finish(true) };
}
