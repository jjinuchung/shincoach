// 👤 그림자 포켓몬 누구일까? — 🎮 게임기 미니 게임 셋째 (v308 · 2026-10-21)
// 아버님 결정(물음 둘 모두 추천안): **앱 포켓몬 전체**(기기에 그림을 받아 둔 것 — 아직 못 잡은 얼굴도 나온다) · 한 판은 **40초 동안 몇 마리나**
// 까만 그림자를 보고 이름 넷 중 하나 — 맞히면 그림이 짠 · ⭐ +1 / 틀리면 "정답은 ○○!"로 그림만 보여 주고 다음(감점·삐 소리 없음)
// 보기 셋은 같은 타입에서 먼저(진우는 포켓몬을 잘 알아서 너무 쉽지 않게) · 이름이 같은 보기는 없다 · 한 판 안에서는 다 돌 때까지 같은 문제가 안 나온다
//
// 위쪽(엔진)은 순수 — 시각(ms)과 rng만 받아 상태를 바꾼다(node 시험이 가짜 시계로 끝까지) · 아래쪽(runShadow)이 화면 · 앱을 내리면 멈췄다가 이어서
import { sfx } from './sfx.js';
import { musicMode } from './gamesong.js'; // 🎵 게임 음악 상태 (v335 · 순수)

/** 한 판(초) · 보기 수 · 맞힌 뒤·틀린 뒤 그림을 보여 주는 동안(ms) */
export const SHADOW_SEC = 40;
export const SHADOW_CHOICES = 6; // 넷이었다 (v351 — 진우 「너무 쉬워요」 → 아버님 「추천대로」)
export const RIGHT_MS = 700;
export const WRONG_MS = 1500;
/** 보기를 다 만들 수 있는 끝 — 이보다 적으면 판을 쓰지 않는다(gameview) */
export const SHADOW_MIN = SHADOW_CHOICES;
/** 그림이 이만큼(ms) 안 뜨면 깨진 그림으로 친다 (🔍 Codex 114차 #1) */
export const LOAD_MS = 1500;

const nz = (v) => {
  const n = Math.floor(Number(v) || 0);
  return n > 0 ? n : 0;
};

/** 섞기 (순수) — 새 배열 */
export function shadowShuffle(list, rng = Math.random) {
  const a = list.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.min(i, Math.floor(rng() * (i + 1)));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** 문제로 쓸 포켓몬 고쳐 읽기 (순수) — { id, ko, type, url? } · id·이름이 있는 것만 · 같은 id·같은 이름은 하나만 */
export function shadowPoolOf(list) {
  const out = [];
  const ids = new Set();
  const names = new Set();
  for (const p of Array.isArray(list) ? list : []) {
    const id = Number(p && p.id);
    const ko = p && typeof p.ko === 'string' ? p.ko.trim() : '';
    if (!Number.isSafeInteger(id) || id <= 0 || !ko || ids.has(id) || names.has(ko)) continue;
    ids.add(id);
    names.add(ko);
    out.push({ ...p, id, ko, type: String((p && p.type) || 'normal') });
  }
  return out;
}

/** 보기 넷 (순수) — 정답 + 같은 타입에서 셋(모자라면 다른 타입에서) · 섞어서 */
export function shadowChoices(pool, answer, rng = Math.random) {
  const rest = pool.filter((p) => p.id !== answer.id && p.ko !== answer.ko);
  const same = shadowShuffle(rest.filter((p) => p.type === answer.type), rng);
  const other = shadowShuffle(rest.filter((p) => p.type !== answer.type), rng);
  return shadowShuffle([answer, ...[...same, ...other].slice(0, SHADOW_CHOICES - 1)], rng);
}

/** 새 판 (순수) — 보기가 넷이 안 되면 문제 없이(q null) */
export function shadowStart(now, pool, rng = Math.random) {
  const s = {
    t0: now, end: now + SHADOW_SEC * 1000, pool: shadowPoolOf(pool), order: [], oi: 0,
    q: null, phase: 'ask', until: 0, seq: 0, score: 0, right: 0, miss: 0, skips: 0, bad: [],
  };
  shadowNext(s, now, rng);
  return s;
}

/** 다음 문제 (순수) → q { n, id(정답), choices: [id ×4], at } · 다 돌면 다시 섞는다(방금 낸 것이 바로 또 나오지 않게) */
export function shadowNext(s, now, rng = Math.random) {
  if (s.pool.length < SHADOW_MIN) { s.q = null; return null; }
  if (s.oi >= s.order.length) {
    s.order = shadowShuffle(s.pool, rng);
    s.oi = 0;
    if (s.q && s.order[0].id === s.q.id) [s.order[0], s.order[1]] = [s.order[1], s.order[0]];
  }
  const ans = s.order[s.oi++];
  s.q = { n: ++s.seq, id: ans.id, choices: shadowChoices(s.pool, ans, rng).map((p) => p.id), at: now };
  s.phase = 'ask';
  s.until = 0;
  return s.q;
}

/**
 * 이름을 골랐다 (순수) → { kind: 'right'(+1) | 'wrong'(셈 없음) | 'busy'(그림을 보여 주는 중 · 보기에 없는 것) | 'over', answer, picked, pts }
 * 맞혀도 틀려도 그림을 잠깐 보여 준 뒤(shadowTick) 다음 문제
 */
export function shadowPick(s, id, now) {
  if (now >= s.end) return { kind: 'over' };
  if (!s.q || s.phase !== 'ask') return { kind: 'busy' };
  const pick = Number(id);
  if (!s.q.choices.includes(pick)) return { kind: 'busy' };
  const ok = pick === s.q.id;
  s.phase = 'reveal';
  s.until = now + (ok ? RIGHT_MS : WRONG_MS);
  if (ok) { s.score += 1; s.right += 1; } else s.miss += 1;
  return { kind: ok ? 'right' : 'wrong', answer: s.q.id, picked: pick, pts: ok ? 1 : 0 };
}

/** 시계 (순수) — 그림을 다 보여 줬으면 다음 문제 → 새 q 또는 null */
export function shadowTick(s, now, rng = Math.random) {
  if (now >= s.end || s.phase !== 'reveal' || now < s.until) return null;
  return shadowNext(s, now, rng);
}

/**
 * 그림이 깨졌다 (순수) — 묻는 중이면 셈 없이 다음 문제 → 새 q 또는 null
 * 🔍 Codex 114차 #2: 깨진 포켓몬은 이 판의 문제·보기에서 뺀다(같은 깨진 그림을 또 만나지 않게 · 넘기기가 저절로 끝난다)
 *   보기 넷을 못 만들 만큼 줄면 q가 null — 화면은 「그림을 불러오지 못했어요」로 끝낸다(그림 없는 문제를 내지 않는다)
 */
export function shadowSkip(s, now, rng = Math.random) {
  if (now >= s.end || !s.q || s.phase !== 'ask') return null;
  const bad = s.q.id;
  s.skips += 1;
  s.bad.push(bad);
  s.pool = s.pool.filter((p) => p.id !== bad);
  s.order = s.order.slice(0, s.oi).concat(s.order.slice(s.oi).filter((p) => p.id !== bad));
  return shadowNext(s, now, rng);
}

/** 멈췄던 만큼 뒤로 민다 (순수) — 앱을 내렸다 돌아오면 남은 시간이 그대로 */
export function shadowShift(s, ms) {
  const d = nz(ms);
  if (!d) return;
  s.t0 += d; s.end += d;
  if (s.until) s.until += d;
  if (s.q) s.q.at += d;
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
 * stage = 그릴 자리(비워서 쓴다) · o.pool = [{ id, ko, type, url }] (기기에 그림이 있는 포켓몬) · o.hero = 응원하는 쪽 { html } · o.rng
 * stop()은 ✕·집을 닫을 때 — 그 자리에서 끝(quit)
 */
export function runShadow(stage, o = {}) {
  const now = () => performance.now();
  const rng = typeof o.rng === 'function' ? o.rng : Math.random;
  const pool = shadowPoolOf(o.pool);
  const byId = new Map(pool.map((p) => [p.id, p]));
  const koOf = (id) => (byId.get(id) || {}).ko || '';
  stage.innerHTML = '';
  const root = el('div', 'gd gs');
  root.style.setProperty('--gd-sec', `${SHADOW_SEC}s`);
  const top = el('div', 'gd-top');
  const scoreEl = el('span', 'gd-score', '⭐ 0');
  const time = el('div', 'gd-time');
  time.appendChild(el('i'));
  top.append(scoreEl, time);
  const pic = el('div', 'gs-pic');
  const frame = el('span', 'gs-frame'); // 그림 자리 — 문제마다 새 <img>를 넣는다(아래 ask)
  const name = el('span', 'gs-name', '');
  name.setAttribute('aria-live', 'polite');
  pic.append(frame, name);
  const list = el('div', 'gs-choices');
  const btns = [];
  for (let i = 0; i < SHADOW_CHOICES; i++) {
    const b = el('button', 'gs-btn', '');
    b.type = 'button';
    b.disabled = true;
    list.appendChild(b);
    btns.push(b);
  }
  const pal = el('div', 'gd-pal');
  pal.innerHTML = (o.hero && o.hero.html) || '<span class="gd-pal-emoji">🐾</span>';
  const fx = el('div', 'gd-fx');
  const banner = el('div', 'gd-banner', '준비!');
  root.append(top, pic, list, pal, fx, banner);
  stage.appendChild(root);

  let s = null;
  let timer = 0;
  let pausedAt = 0;
  let finished = false;
  let img = null;     // 지금 문제의 그림
  let waitN = 0;      // 그림이 뜨기를 기다리는 문제 번호 (0 = 안 기다림)
  let waitAt = 0;
  let refocus = false; // 보기 단추에 있던 포커스를 다음 문제 첫 보기로 (🔍 Codex 114차 — 접근성)
  let brokenLater = false; // 앱을 내려 둔 동안 깨진 그림 — 돌아와 시간을 맞춘 뒤 넘긴다 (🔍 Codex 115차 #1)
  let resolveDone;
  const done = new Promise((r) => { resolveDone = r; });

  /**
   * 문제 그리기 — 🔍 Codex 114차 #1: 그림이 다 뜨기 전엔 그림을 감추고 보기를 끈다(아이가 본 그림과 채점하는 문제가 어긋나지 않게)
   * 문제마다 새 <img> — 앞 문제 그림의 늦은 load/error는 다른 그림 것이라 무시된다
   */
  const ask = (q) => {
    name.textContent = '';
    q.choices.forEach((id, i) => {
      btns[i].textContent = koOf(id);
      btns[i].className = 'gs-btn';
      btns[i].disabled = true;
    });
    const im = el('img', 'gs-img is-dark is-wait');
    im.alt = '';
    im.draggable = false;
    im.addEventListener('load', () => shown(q.n, im));
    im.addEventListener('error', () => broken(q.n, im));
    frame.innerHTML = '';
    frame.appendChild(im);
    img = im;
    waitN = q.n;
    waitAt = now();
    const p = byId.get(q.id);
    im.src = (p && p.url) || '';
  };
  /** 그림이 떴다 → 그림자를 보이고 보기를 켠다 */
  const shown = (n, im) => {
    if (!s || finished || im !== img || !s.q || s.q.n !== n || waitN !== n) return;
    waitN = 0;
    im.classList.remove('is-wait');
    for (const b of btns) b.disabled = false;
    if (refocus) { refocus = false; try { btns[0].focus({ preventScroll: true }); } catch { /* 옛 브라우저 */ } }
  };
  /** 그림이 깨졌다(또는 너무 늦다) → 셈 없이 다음 문제 · 보기를 못 만들 만큼 줄면 끝 (🔍 Codex 114차 #2) */
  const broken = (n, im) => {
    if (!s || finished || im !== img || !s.q || s.q.n !== n || waitN !== n) return;
    if (pausedAt) { brokenLater = true; return; } // 내려 둔 동안엔 끝 시각이 아직 안 밀렸다 — 지금 넘기면 「끝났다」로 보고 아무것도 안 한다
    waitN = 0;
    const q = shadowSkip(s, now(), rng);
    if (q) { ask(q); return; }
    if (!s.q) {
      frame.innerHTML = '';
      name.textContent = '그림을 불러오지 못했어요';
      finish(false);
    }
  };
  const fly = (text) => {
    const f = el('span', 'gd-fly', text);
    f.style.left = '50%';
    f.style.top = '30%';
    fx.appendChild(f);
    setTimeout(() => f.remove(), 900);
  };
  const pick = (i) => {
    if (!s || finished || pausedAt || !s.q || waitN) return;
    const q = s.q;
    const r = shadowPick(s, q.choices[i], now());
    if (r.kind !== 'right' && r.kind !== 'wrong') return;
    refocus = typeof document !== 'undefined' && btns.includes(document.activeElement);
    for (const b of btns) b.disabled = true;
    btns[q.choices.indexOf(r.answer)].classList.add('is-right');
    img.classList.remove('is-dark');
    if (r.kind === 'right') {
      name.textContent = `${koOf(r.answer)}!`;
      scoreEl.textContent = `⭐ ${s.score}`;
      fly('+1');
      sfx.ding();
      hop(pal);
    } else {
      btns[i].classList.add('is-picked');
      name.textContent = `정답은 ${koOf(r.answer)}!`;
      sfx.tick();
    }
  };
  btns.forEach((b, i) => b.addEventListener('click', () => pick(i)));

  const finish = (quit) => {
    if (finished) return;
    finished = true;
    waitN = 0;
    clearInterval(timer);
    document.removeEventListener('visibilitychange', onVis);
    for (const b of btns) b.disabled = true;
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
    const q = shadowTick(s, t, rng);
    if (q) ask(q);
    else if (waitN && t - waitAt >= LOAD_MS) broken(waitN, img); // 그림이 너무 늦다 — 깨진 것으로
    if (t >= s.end) finish(false);
  };
  function onVis() {
    if (!s || finished) return;
    if (document.hidden) { pausedAt = now(); root.classList.add('is-paused'); return; }
    if (pausedAt) {
      const d = now() - pausedAt;
      shadowShift(s, d);
      waitAt += d; // 내려 둔 동안은 그림 기다림에 안 센다
      pausedAt = 0;
      root.classList.remove('is-paused');
      if (brokenLater) { brokenLater = false; broken(waitN, img); }
    }
  }

  // 준비! → 시작 · 앱이 내려간 것은 「준비!」 때부터 듣는다(디그다와 같게 — 🔍 Codex 113차 #3)
  document.addEventListener('visibilitychange', onVis);
  setTimeout(() => {
    if (finished) return;
    banner.classList.remove('is-on');
    s = shadowStart(now(), pool, rng);
    if (!s.q) { finish(false); return; } // 보기가 넷이 안 된다 — gameview가 판을 쓰기 전에 막지만, 혹시 몰라 빈 판으로 끝
    root.classList.add('is-go');
    if (document.hidden) { pausedAt = now(); root.classList.add('is-paused'); }
    ask(s.q);
    timer = setInterval(loop, 50);
  }, 800);
  banner.classList.add('is-on');
  sfx.tick();

  // 🎵 게임 음악(v335) — 끝나면 stop · 마지막 10초면 hurry (내려 둔 동안은 멈춘 때로 셈)
  return { done, stop: () => finish(true), music: () => musicMode({ over: finished, left: s ? s.end - (pausedAt || now()) : null }) };
}
