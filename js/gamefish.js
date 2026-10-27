// 🎣 잉어킹 낚시 — 🎮 게임기 미니 게임 열두째 (v344 · 2026-10-26 아버님 미니 게임 추천 "추천 순서대로" → 기본안 "이대로")
// 물가에서 🤝 파트너(없으면 내 캐릭터)가 낚싯대를 든다 — ① 톡 하면 찌를 던진다 ② 1~4초 뒤 찌가 「쏙!」 들어가면 톡 해서 챈다
//   (너무 일찍 누르면 「아직이야~」만 · 늦으면 「놓쳤다」 하고 다시 기다린다 — 감점 없음)
// ③ 걸리면 힘겨루기 — 꾹 누르면 막대가 오르고 떼면 내려간다 · 움직이는 초록 칸 안에 막대를 두면 줄이 감기고 다 감으면 낚았다!
//   (칸 밖이면 천천히 풀린다 · 칸 밖에 3초 줄곧 있거나 너무 오래 끌면 「도망갔다」 — 감점 없이 다시 던진다 · 한 마리에 판 내내 묶이지 않게)
//   숫자는 사람 손이 0.3초쯤 늦게 눌러도 잉어킹 약 3초 · 콘치·쏘드라 약 5초 · 고라파덕 약 7초에 낚게 맞췄다(갸라도스는 잘해야)
// 낚이는 것(PokeAPI 이름): 잉어킹 ⭐1 · 콘치·쏘드라 ⭐2 · 고라파덕 ⭐3 · 아주 드물게 갸라도스 ⭐8(칸이 좁고 오래) · 가끔 🥾 낡은 장화(⭐0 — 웃음용)
// 한 판 45초(기다리는 시간이 있어서) · 목숨·게임 오버 없음 · 점수는 최고 기록만 · **진짜 잡기·도감과는 따로**(아버님 2026-10-26 — 「낚았다!」만)
//
// 위쪽(엔진)은 순수 — 시각(ms)·rng만 받는다(node 시험이 가짜 시계로 끝까지) · 아래쪽(runFish)이 화면
// 자리는 "칸": 마당 너비 100 · 높이 70(y는 위에서 아래로 · 물 윗면 26) · 힘겨루기 막대·칸은 0(아래)~100(위) · 앱을 내리면 멈췄다가 이어서
import { sfx } from './sfx.js';
import { musicMode } from './gamesong.js'; // 🎵 게임 음악 상태 (v335 · 순수)

/** 한 판(초) · 마당(칸) · 물 윗면 */
export const FISH_SEC = 45;
export const FISH_W = 100;
export const FISH_H = 70;
export const WATER_Y = 26;
/** 찌 — 던지는 데 · 던진 뒤 입질까지 가장 짧게 · 더 기다릴 수 있는 만큼 · 입질에 톡 할 수 있는 때 · 놓친 뒤 다음 입질까지 (ms) */
export const CAST_MS = 500;
export const BITE_MIN = 1000;
export const BITE_SPAN = 3000;
export const BITE_MS = 800; // 1초였다 (v351 — 진우 「너무 쉬워요」 → 아버님 「추천대로」)
export const AGAIN_MIN = 800;
export const AGAIN_SPAN = 2500;
/** 낚은 뒤 보여 주는 데 (ms) */
export const GOT_MS = 1300;
/** 힘겨루기 — 꾹 누르면 오르는 빠르기 · 떼면 내리는 빠르기 (칸/초) · 막대가 처음 있는 곳 */
export const RISE = 75;
export const FALL = 60;
export const BAR0 = 20;
/** 막대가 초록 칸 밖에 이만큼(ms) 줄곧 있으면 도망간다 — 한 마리에 판 내내 묶이지 않게(감점 없이 다시 던진다) */
export const ESCAPE_MS = 3000;
/** 힘겨루기가 다 감는 데(need)의 이만큼 배를 넘기면 도망간다 — 칸을 넘나들며 오래 버티는 큰 놈(갸라도스)에 묶이지 않게 */
export const REEL_MAX_K = 4;
/**
 * 낚이는 것 — id(그림 · 0이면 그림 없음) · ⭐ · 나오는 몫(합 1) · 초록 칸 반쪽 높이 · 다 감는 데(ms) · 칸이 오르내리는 폭 · 한 번 오르내리는 데(ms)
 * 잉어킹은 느긋하게 · 갸라도스는 칸이 좁고 빠르고 오래
 */
export const FISH = {
  magikarp: { id: 129, ko: '잉어킹', pts: 1, w: 0.42, hw: 18, need: 1800, amp: 12, per: 3600 },
  goldeen: { id: 118, ko: '콘치', pts: 2, w: 0.17, hw: 15, need: 2200, amp: 16, per: 3200 },
  horsea: { id: 116, ko: '쏘드라', pts: 2, w: 0.17, hw: 15, need: 2200, amp: 16, per: 3000 },
  psyduck: { id: 54, ko: '고라파덕', pts: 3, w: 0.12, hw: 14, need: 2600, amp: 20, per: 2800 },
  boot: { id: 0, ko: '낡은 장화', pts: 0, w: 0.08, hw: 18, need: 1200, amp: 10, per: 3600, emoji: '🥾' },
  gyarados: { id: 130, ko: '갸라도스', pts: 8, w: 0.04, hw: 11, need: 3500, amp: 24, per: 2400 },
};
/** 칸 밖이면 풀리는 빠르기 — 다 감는 데의 이만큼 배로 천천히 (손이 조금 늦어도 금방 다 풀리지 않게) */
export const UNWIND = 3;
export const FISH_KEYS = Object.keys(FISH);
const STEP_MS = 50;
const TAU = Math.PI * 2;

const nz = (v) => {
  const n = Math.floor(Number(v) || 0);
  return n > 0 ? n : 0;
};
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

/** 무엇이 걸렸나 (순수) — r = rng() 하나 · 몫(w)대로 */
export function fishPick(r) {
  let acc = 0;
  const x = clamp(Number(r) || 0, 0, 0.999999);
  for (const k of FISH_KEYS) {
    acc += FISH[k].w;
    if (x < acc) return k;
  }
  return 'magikarp';
}

/** 초록 칸 가운데 (순수) — 걸린 지 ms → 0~100 (칸이 마당 밖으로 안 나가게) */
export function fishZone(kind, ms) {
  const f = FISH[kind] || FISH.magikarp;
  const z = 50 + f.amp * Math.sin((TAU * ms) / f.per) + f.amp * 0.25 * Math.sin((TAU * ms) / (f.per * 0.5) + 1);
  return clamp(z, f.hw, 100 - f.hw);
}

/** 새 판 (순수) */
export function fishStart(now) {
  return {
    t0: now, end: now + FISH_SEC * 1000, last: now,
    st: 'idle', biteAt: 0, biteEnd: 0, kind: '', reel: null, gotEnd: 0, got: null, hold: false,
    score: 0, casts: 0, bites: 0, early: 0, slips: 0, hooks: 0, escapes: 0, caught: Object.fromEntries(FISH_KEYS.map((k) => [k, 0])),
  };
}

/**
 * 톡 (순수) → { kind: 'cast' | 'early'(기다리는 중 — 아무것도 안 바뀜) | 'hook'(걸렸다 · fish) | 'busy' | 'over' }
 * 힘겨루기·낚은 뒤 보여 주는 동안의 톡은 busy(힘겨루기는 fishHold가 맡는다)
 */
export function fishTap(s, now, rng = Math.random) {
  if (!(Number(now) < s.end)) return { kind: 'over' };
  if (s.st === 'idle') {
    s.st = 'wait';
    s.casts += 1;
    s.biteAt = now + CAST_MS + BITE_MIN + rng() * BITE_SPAN;
    return { kind: 'cast' };
  }
  if (s.st === 'wait') {
    s.early += 1;
    return { kind: 'early' };
  }
  if (s.st === 'bite') {
    s.st = 'reel';
    s.hooks += 1;
    s.reel = { kind: s.kind, t0: now, b: BAR0, p: 0 };
    return { kind: 'hook', fish: s.kind };
  }
  return { kind: 'busy' };
}

/** 꾹 누름·뗌 (순수) — 힘겨루기 막대를 올리는 손 · 다른 때에도 기억만 한다(챈 손가락을 그대로 누르고 있으면 바로 오르게) */
export function fishHold(s, on) {
  s.hold = !!on;
}

/**
 * 시계 (순수) — 지난번부터 now까지 50ms씩 · 판 끝을 넘지 않는다
 * → { bite: 입질(무엇) | '', slip: 놓침, got: 낚음 { kind, pts } | null, escape: 도망감(무엇) | '', idle: 다시 던질 수 있음 }
 */
export function fishTick(s, now, rng = Math.random) {
  const ev = { bite: '', slip: false, got: null, escape: '', idle: false };
  const to = Math.min(Number(now) || 0, s.end);
  while (s.last < to) {
    const dt = Math.min(STEP_MS, to - s.last);
    s.last += dt;
    const t = s.last;
    if (s.st === 'wait' && t >= s.biteAt) {
      s.st = 'bite';
      s.bites += 1;
      s.kind = fishPick(rng());
      s.biteEnd = t + BITE_MS;
      ev.bite = s.kind;
    } else if (s.st === 'bite' && t >= s.biteEnd) {
      s.st = 'wait';
      s.slips += 1;
      s.biteAt = t + AGAIN_MIN + rng() * AGAIN_SPAN;
      ev.slip = true;
    } else if (s.st === 'reel') {
      const r = s.reel;
      const f = FISH[r.kind] || FISH.magikarp;
      r.b = clamp(r.b + ((s.hold ? RISE : -FALL) * dt) / 1000, 0, 100);
      const inZone = Math.abs(r.b - fishZone(r.kind, t - r.t0)) <= f.hw;
      r.p = clamp(r.p + (inZone ? dt / f.need : -dt / (f.need * UNWIND)), 0, 1);
      r.out = inZone ? 0 : (r.out || 0) + dt;
      if (r.out >= ESCAPE_MS || t - r.t0 >= f.need * REEL_MAX_K) {
        s.escapes += 1;
        ev.escape = r.kind;
        s.reel = null;
        s.st = 'idle';
      } else if (r.p >= 1) {
        s.score += f.pts;
        s.caught[r.kind] += 1;
        s.got = { kind: r.kind, pts: f.pts };
        ev.got = s.got;
        s.reel = null;
        s.st = 'got';
        s.gotEnd = t + GOT_MS;
      }
    } else if (s.st === 'got' && t >= s.gotEnd) {
      s.st = 'idle';
      s.got = null;
      ev.idle = true;
    }
  }
  return ev;
}

/** 멈췄던 만큼 뒤로 민다 (순수) — 앱을 내렸다 돌아오면 남은 시간·입질 때·칸 움직임이 그대로 */
export function fishShift(s, ms) {
  const d = nz(ms);
  if (!d) return;
  s.t0 += d; s.end += d; s.last += d; s.biteAt += d; s.biteEnd += d; s.gotEnd += d;
  if (s.reel) s.reel.t0 += d;
}

// ───────────────────── 화면 (여기부터 브라우저) ─────────────────────

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}
/** 찌가 떨어지는 자리 · 낚싯대 끝 (칸) */
export const FLOAT = { x: 64, y: 40 };
export const ROD_TIP = { x: 26, y: 18 };
/** 줄 — 낚싯대 끝에서 찌까지 (순수) → { len, deg } (칸 · 도) */
export function lineOf(a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return { len: Math.hypot(dx, dy), deg: (Math.atan2(dy, dx) * 180) / Math.PI };
}
/** 단계마다 아래 한 줄 */
export const FISH_HINT = {
  idle: '톡! 찌를 던져요',
  wait: '찌가 쏙 들어갈 때까지 기다려요…',
  bite: '지금 톡!',
  reel: '꾹 누르면 위로 · 떼면 아래로 — 초록 칸 안에!',
  got: '',
};

/**
 * 한 판 돌리기 → { done: Promise<{ score, quit }>, stop(), music() }
 * stage = 그릴 자리 · o.art = { id: 그림 주소 } (못 받은 것은 🐟) · o.hero = 낚싯대를 든 쪽 { html } · o.rng
 */
export function runFish(stage, o = {}) {
  const now = () => performance.now();
  const rng = typeof o.rng === 'function' ? o.rng : Math.random;
  const art = o.art && typeof o.art === 'object' ? o.art : {};
  stage.innerHTML = '';
  const root = el('div', 'gd gf');
  root.style.setProperty('--gd-sec', `${FISH_SEC}s`);
  const top = el('div', 'gd-top');
  const scoreEl = el('span', 'gd-score', '⭐ 0');
  const time = el('div', 'gd-time');
  time.appendChild(el('i'));
  top.append(scoreEl, time);
  const field = el('div', 'gf-field');
  const water = el('span', 'gf-water');
  const me = el('div', 'gf-me');
  me.innerHTML = (o.hero && o.hero.html) || '<span class="gd-pal-emoji">🐾</span>';
  const rod = el('span', 'gf-rod');
  const line = el('span', 'gf-line');
  const float = el('span', 'gf-float');
  const ripple = el('span', 'gf-ripple');
  const catchEl = el('div', 'gf-catch');
  const gauge = el('div', 'gf-gauge');
  const zone = el('span', 'gf-zone');
  const bar = el('span', 'gf-bar', '🐟');
  const prog = el('span', 'gf-prog');
  const progIn = el('i');
  prog.appendChild(progIn);
  gauge.append(zone, bar, prog);
  field.append(water, ripple, line, float, me, rod, catchEl, gauge);
  field.setAttribute('aria-label', '잉어킹 낚시 — 톡 하면 던지고 · 쏙 하면 톡 · 걸리면 꾹 · 키보드는 스페이스');
  const hint = el('p', 'gf-hint', FISH_HINT.idle);
  const fx = el('div', 'gd-fx');
  const banner = el('div', 'gd-banner', '준비!');
  root.append(top, field, hint, fx, banner);
  stage.appendChild(root);

  let unit = 3;
  const measure = () => {
    const w = field.getBoundingClientRect().width;
    if (w > 0) unit = w / FISH_W;
  };

  let s = null;
  let timer = 0;
  let frame = 0;
  let pausedAt = 0;
  let finished = false;
  let shown = '';
  let resolveDone;
  const done = new Promise((r) => { resolveDone = r; });
  // 판 안의 잠깐 타이머(날아가는 글·「준비!」)는 모아 두었다가 끝날 때 모두 지운다 — 닫은 뒤에 화면을 만지지 않게 (🔍 Codex 148차 #2)
  const timers = new Set();
  const later = (fn, ms) => {
    const id = setTimeout(() => { timers.delete(id); fn(); }, ms);
    timers.add(id);
  };

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
  /** 줄 — 찌가 물에 있으면 찌까지 · 아니면 낚싯대 끝에서 아래로 짧게 */
  const drawLine = (out) => {
    const end = out ? FLOAT : { x: ROD_TIP.x + 2, y: ROD_TIP.y + 12 };
    const l = lineOf(ROD_TIP, end);
    line.style.width = `${(l.len * unit).toFixed(1)}px`;
    line.style.transform = `translate3d(${(ROD_TIP.x * unit).toFixed(1)}px, ${(ROD_TIP.y * unit).toFixed(1)}px, 0) rotate(${l.deg.toFixed(1)}deg)`;
  };
  const showCatch = (kind) => {
    const f = FISH[kind] || FISH.magikarp;
    catchEl.innerHTML = '';
    const url = f.id ? art[f.id] : '';
    if (url) {
      const img = el('img', 'gf-img');
      img.alt = '';
      img.draggable = false;
      img.addEventListener('error', () => { catchEl.innerHTML = `<span class="gf-alt">${f.emoji || '🐟'}</span>`; });
      img.src = url;
      catchEl.appendChild(img);
    } else catchEl.innerHTML = `<span class="gf-alt">${f.emoji || '🐟'}</span>`;
    catchEl.className = `gf-catch is-on is-${kind}`;
    catchEl.setAttribute('aria-label', f.ko);
  };
  const draw = () => {
    if (!s) return;
    if (s.st !== shown) {
      shown = s.st;
      root.classList.remove('is-idle', 'is-wait', 'is-bite', 'is-reel', 'is-got');
      root.classList.add(`is-${s.st}`);
      hint.textContent = s.st === 'got' && s.got ? `${FISH[s.got.kind].ko} 낚았다!` : FISH_HINT[s.st] || '';
      drawLine(s.st !== 'idle');
      if (s.st !== 'got') catchEl.className = 'gf-catch';
    }
    if (s.st === 'reel' && s.reel) {
      const f = FISH[s.reel.kind] || FISH.magikarp;
      const z = fishZone(s.reel.kind, s.last - s.reel.t0);
      zone.style.bottom = `${(z - f.hw).toFixed(1)}%`;
      zone.style.height = `${(f.hw * 2).toFixed(1)}%`;
      bar.style.bottom = `${s.reel.b.toFixed(1)}%`;
      progIn.style.transform = `scaleY(${s.reel.p.toFixed(3)})`;
      bar.className = `gf-bar${Math.abs(s.reel.b - z) <= f.hw ? ' is-in' : ''}`;
    }
  };
  const apply = (ev) => {
    if (ev.bite) {
      fly('쏙!', FLOAT.x, FLOAT.y - 8, 'is-big');
      sfx.tick();
    }
    if (ev.slip) fly('놓쳤다… 다시 기다려요', FLOAT.x, FLOAT.y - 8, '');
    if (ev.escape) fly('도망갔다… 다시 톡!', FLOAT.x, FLOAT.y - 8, '');
    if (ev.got) {
      const f = FISH[ev.got.kind];
      showCatch(ev.got.kind);
      scoreEl.textContent = `⭐ ${s.score}`;
      fly(ev.got.pts ? `+${ev.got.pts}` : '하하!', FLOAT.x, FLOAT.y - 16, ev.got.pts >= 3 ? 'is-big' : '');
      if (ev.got.kind === 'gyarados') sfx.boom();
      else if (ev.got.pts) sfx.success();
      else sfx.wrong();
      if (f && !f.pts) hint.textContent = `${f.ko}… 하하!`;
    }
  };
  const tap = () => {
    if (!s || finished || pausedAt) return;
    const t = now();
    apply(fishTick(s, t, rng));
    const r = fishTap(s, t, rng);
    if (r.kind === 'cast') { sfx.whoosh(); fly('휙!', FLOAT.x, FLOAT.y - 6, ''); }
    else if (r.kind === 'early') fly('아직이야~', FLOAT.x, FLOAT.y - 6, '');
    else if (r.kind === 'hook') { sfx.hit(); fly('걸렸다!', FLOAT.x, FLOAT.y - 10, 'is-big'); }
    draw();
  };

  const onVis = () => {
    if (!s || finished) return;
    if (document.hidden) {
      pausedAt = now();
      root.classList.add('is-paused');
      pressing = false; pressId = null; fishHold(s, false); // 내린 동안은 손을 뗀 것으로
      return;
    }
    if (pausedAt) { fishShift(s, now() - pausedAt); pausedAt = 0; root.classList.remove('is-paused'); }
  };
  const hasWin = typeof window !== 'undefined' && typeof window.addEventListener === 'function';
  // 끝을 알리는 것은 한 번만 — 「끝!」을 보여 주는 동안 ✕·집 닫기가 오면 기다리지 않고 바로(끝난 판이라 점수 그대로 · 🔍 Codex 148차 #2)
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
    document.removeEventListener('pointerup', up);
    document.removeEventListener('pointercancel', up);
    if (hasWin) window.removeEventListener('resize', measure);
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
    apply(fishTick(s, t, rng));
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

  // 누른 손가락 하나만 기억한다 — 다른 손가락을 눌렀다 떼도 힘겨루기가 끊기지 않게 (🗺️ 대모험과 같은 꼴) · 키보드는 'key'
  let pressing = false;
  let pressId = null;
  const down = (id) => {
    if (!s || finished || pausedAt) return;
    if (pressing && id !== pressId) return;
    pressing = true;
    pressId = id;
    const t = now();
    apply(fishTick(s, t, rng)); // 누른 때까지 움직이고 나서
    fishHold(s, true);
    tap();
  };
  function up(e) {
    if (!pressing) return;
    const id = !e ? 'key' : e.pointerId !== undefined ? e.pointerId : 'touch';
    if (id !== pressId) return;
    pressing = false;
    pressId = null;
    if (!s || finished) return;
    if (!pausedAt) apply(fishTick(s, now(), rng)); // 뗀 때까지는 누른 것으로
    fishHold(s, false);
  }
  field.addEventListener('pointerdown', (e) => { e.preventDefault(); down(e.pointerId !== undefined ? e.pointerId : 'touch'); });
  document.addEventListener('pointerup', up);
  document.addEventListener('pointercancel', up);
  field.tabIndex = 0;
  field.setAttribute('role', 'button');
  field.addEventListener('keydown', (e) => {
    if (e.key !== ' ' && e.key !== 'Enter') return;
    e.preventDefault();
    if (!e.repeat) down('key');
  });
  field.addEventListener('keyup', (e) => {
    if (e.key !== ' ' && e.key !== 'Enter') return;
    e.preventDefault();
    up(null);
  });
  // ⌨️ 키를 누른 채 초점이 마당 밖으로 가면(Tab 등) keyup이 마당에 안 온다 — 뗀 것으로 (🔍 Codex 148차 #3)
  field.addEventListener('blur', () => { if (pressing && pressId === 'key') up(null); });

  document.addEventListener('visibilitychange', onVis);
  if (hasWin) window.addEventListener('resize', measure);
  later(() => {
    if (finished) return;
    banner.classList.remove('is-on');
    measure();
    s = fishStart(now());
    root.classList.add('is-go');
    if (document.hidden) { pausedAt = now(); root.classList.add('is-paused'); }
    draw();
    startLoop();
    if (typeof field.focus === 'function') { try { field.focus({ preventScroll: true }); } catch { /* 옛 브라우저 */ } }
  }, 800);
  banner.classList.add('is-on');
  measure();
  drawLine(false);
  sfx.tick();

  return { done, stop: () => finish(true), music: () => musicMode({ over: finished, left: s ? s.end - (pausedAt || now()) : null }) };
}
