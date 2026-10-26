// 🧠 포켓몬 따라 하기 — 🎮 게임기 미니 게임 열다섯째 (v346 · 2026-10-26 아버님 "다음 미니 게임 가자" → 기본안 "이대로")
// 네 자리(🔥 불꽃 · 💧 물 · 🌿 풀 · ⚡ 전기 — 자리마다 진우가 잡은 그 타입 포켓몬)가 차례로 반짝 → 같은 차례로 톡
// 처음 셋 → 다 맞히면 그 줄 끝에 한 마리 더 · 맞게 누른 하나마다 ⭐1 · 한 줄을 끝까지 맞히면 ⭐2 더
// 틀리면 감점 없이 「앗! 다시 볼까?」 맞는 포켓몬을 살짝 → 같은 줄을 처음부터 (다시 볼 때 이미 ⭐를 받은 자리는 또 안 준다 — 틀릴수록 ⭐가 느는 일이 없게)
// 같은 줄에서 두 번 틀리면 한 마리 줄인 새 줄(셋까지) · 8초 동안 안 누르면 한 번 더 보여 줌 · 줄이 길수록 조금 빨리 · 60초
// 배경 음악은 없다(minigame GAMES quiet) — 자리마다 도·미·솔·높은 도(🎹 sfx.key)가 노래 대신 · 효과음을 꺼도 반짝·폴짝으로 할 수 있다
//
// 위쪽(엔진)은 순수 — 시각(ms)과 rng만 받는다(node 시험이 가짜 시계로 끝까지) · 아래쪽(runSimon)이 화면 · 앱을 내리면 멈췄다가 돌아오면 지금 줄을 다시 보여 준다
// 보여 주는 중 화면이 0.2초 넘게 멈췄다 오면(못 그린 반짝·틈이 있을 수 있다) 그 줄을 처음부터 다시 보여 준다(simonLag — 🔍 Codex 150차)
import { sfx } from './sfx.js';
import { musicMode } from './gamesong.js'; // 🎵 게임 음악 상태 (v335 · 순수)
import { TYPE_KO } from './journey.js'; // 타입 이름 — 대여행과 같은 말 (순수)
import { TYPE_COLOR, TYPE_DARK_TEXT } from './gamesort.js'; // 타입 색 — 🔀 타입 나누기 상자와 같게 (순수)

/** 한 판(초) */
export const SIMON_SEC = 60;
/** 네 자리 — 왼쪽 위·오른쪽 위·왼쪽 아래·오른쪽 아래 · 자리마다 음(Hz — 도·미·솔·높은 도) */
export const SIMON_PADS = ['fire', 'water', 'grass', 'electric'];
export const PAD_HZ = [523.25, 659.25, 783.99, 1046.5];
/** 그 타입 포켓몬 그림이 기기에 없을 때 대신 받아 볼 포켓몬 (파이리 · 꼬부기 · 이상해씨 · 피카츄) */
export const STAND_IN = { fire: 4, water: 7, grass: 1, electric: 25 };
/** 파트너가 그 자리 타입이면 이만큼은 파트너가 (개굴닌자는 물 자리에 자주) */
export const PAL_RATE = 0.5;
/** 처음 줄 · 가장 짧은 줄 · 한 줄을 끝까지 맞힌 ⭐ · 같은 줄에서 이만큼 틀리면 한 마리 줄임 */
export const START_LEN = 3;
export const MIN_LEN = 3;
export const LINE_BONUS = 2;
export const MISS_MAX = 2;
/** (ms) 「준비!」 뒤 첫 줄까지 · 반짝 사이 · 한 줄을 맞힌 뒤 · 틀린 뒤(맞는 포켓몬을 보여 주는 틈) · 맞는 포켓몬이 빛나는 동안 · 누른 자리가 빛나는 동안 · 이만큼 안 누르면 한 번 더 */
export const FIRST_MS = 900;
export const GAP_MS = 250;
export const PAUSE_MS = 800;
export const OOPS_MS = 1100;
export const HINT_MS = 700;
export const TAP_MS = 250;
export const IDLE_MS = 8000;
/** (ms) 화면이 이보다 오래 멈췄다 오면 못 그린 반짝·틈이 있을 수 있다 — 가장 짧은 틈(GAP_MS)보다 짧게 (🔍 Codex 150차 #1) */
export const LAG_MS = 200;

/** 한 마리가 빛나는 동안(ms) (순수) — 셋 0.7초 → 한 마리 늘 때마다 0.05초 짧게 → 0.45초까지 */
export function simonOn(len) {
  const n = Math.max(MIN_LEN, Math.floor(Number(len) || 0));
  return Math.max(450, 700 - 50 * (n - MIN_LEN));
}

/** 줄 끝에 자리 하나 (순수) — 같은 자리가 셋 잇달아 나오지 않게 */
export function simonAdd(seq, rng = Math.random) {
  const n = seq.length;
  const ban = n >= 2 && seq[n - 1] === seq[n - 2] ? seq[n - 1] : -1;
  const pick = () => Math.min(SIMON_PADS.length - 1, Math.floor(rng() * SIMON_PADS.length));
  let p = pick();
  for (let k = 0; k < 8 && p === ban; k++) p = pick();
  if (p === ban) p = (ban + 1) % SIMON_PADS.length;
  return [...seq, p];
}

/** 새 줄 (순수) */
export function simonFresh(len, rng = Math.random) {
  let seq = [];
  while (seq.length < len) seq = simonAdd(seq, rng);
  return seq;
}

/**
 * 네 자리 포켓몬 고르기 (순수 · gameview simonPrep) — list = [{ id, ko, url, types, mine }](기기에 그림이 있는 것) · partner = 파트너 번호
 * 자리마다 그 타입 가운데: 잡은 포켓몬(첫 타입이 그 타입 → 둘째 타입) → 앱 포켓몬(같은 차례) · 파트너가 맞으면 반쯤은 파트너 · 한 포켓몬은 한 자리만
 * → [{ type, id, ko, url }] 넷 · 못 채운 자리가 있으면 null(판을 안 쓴다)
 */
export function simonPick(list, partner, rng = Math.random) {
  const pool = (Array.isArray(list) ? list : []).filter((p) => p && Number.isInteger(p.id) && p.url && Array.isArray(p.types));
  const used = new Set();
  const out = [];
  for (const type of SIMON_PADS) {
    const fit = pool.filter((p) => !used.has(p.id) && p.types.includes(type));
    const pal = fit.find((p) => p.mine && p.id === partner);
    let pick = pal && rng() < PAL_RATE ? pal : null;
    if (!pick) {
      const tier = [fit.filter((p) => p.mine && p.types[0] === type), fit.filter((p) => p.mine), fit.filter((p) => p.types[0] === type), fit].find((x) => x.length);
      if (!tier) return null;
      pick = tier[Math.min(tier.length - 1, Math.floor(rng() * tier.length))];
    }
    used.add(pick.id);
    out.push({ type, id: pick.id, ko: pick.ko, url: pick.url });
  }
  return out;
}

/** 새 판 (순수) — 「잘 봐!」 틈(FIRST_MS) 뒤 셋 */
export function simonStart(now, rng = Math.random) {
  return {
    t0: now, end: now + SIMON_SEC * 1000, last: now,
    seq: simonFresh(START_LEN, rng), phase: 'wait', why: 'first', at: now, next: now + FIRST_MS, shown: 0,
    step: 0, paid: 0, misses: 0, turn: 0, idleAt: 0,
    tapPad: -1, tapUntil: 0, hintPad: -1, hintUntil: 0,
    score: 0, right: 0, wrong: 0, lines: 0, best: 0, replays: 0, shorter: 0, lags: 0,
  };
}

/** 한 마리 몫(ms) — 빛남 + 사이 */
const slot = (s) => simonOn(s.seq.length) + GAP_MS;
/** 보여 주기가 끝나는 때 */
export function simonShowEnd(s) {
  return s.at + s.seq.length * slot(s) - GAP_MS;
}
function startShow(s, t) {
  s.phase = 'show';
  s.at = t;
  s.shown = 0;
  s.step = 0;
}

/**
 * 시계 (순수) — 지난번부터 now까지 차례로 · 판 끝을 넘지 않는다
 * → { flashes: [{ pad, at }] 새로 빛난 자리(소리) · input: 따라 할 차례가 왔나 · replay: 안 눌러서 한 번 더 보여 주기 시작 }
 * 화면이 오래 멈췄다 와도 한 번에 따라잡는다(지나간 반짝도 차례로 flashes에)
 */
export function simonTick(s, now) {
  const ev = { flashes: [], input: false, replay: false };
  const t = Math.min(Number(now) || 0, s.end);
  for (let k = 0; k < 1000; k++) {
    if ((s.phase === 'wait' || s.phase === 'oops') && t >= s.next) { startShow(s, s.next); continue; }
    if (s.phase === 'show') {
      while (s.shown < s.seq.length && s.at + s.shown * slot(s) <= t) {
        ev.flashes.push({ pad: s.seq[s.shown], at: s.at + s.shown * slot(s) });
        s.shown += 1;
      }
      const e = simonShowEnd(s);
      if (t >= e) {
        s.phase = 'input';
        s.at = e;
        s.idleAt = e;
        s.turn += 1;
        ev.input = true;
        continue;
      }
      break;
    }
    if (s.phase === 'input' && t - s.idleAt >= IDLE_MS) {
      s.replays += 1;
      s.why = 'idle';
      ev.replay = true;
      startShow(s, s.idleAt + IDLE_MS);
      continue;
    }
    break;
  }
  if (t > s.last) s.last = t;
  return ev;
}

/**
 * 자리를 눌렀다 (순수) — 따라 할 차례에만 → { kind: 'right'(+pts) | 'line'(줄 끝 · +pts · len) | 'wrong'(want · shorter) | 'none'(차례 아님·없는 자리) | 'over', pad }
 * 맞으면 ⭐1 — 이 줄에서 이미 ⭐를 받은 자리면 0(같은 줄을 다시 볼 때) · 줄 끝이면 ⭐2 더하고 한 마리 늘림
 * 틀리면 감점 없이 맞는 자리를 살짝 → 같은 줄을 처음부터 · 같은 줄에서 MISS_MAX번이면 한 마리 줄인 새 줄
 */
export function simonTap(s, pad, now, rng = Math.random) {
  if (!(Number(now) < s.end)) return { kind: 'over' };
  if (s.phase !== 'input' || !Number.isInteger(pad) || pad < 0 || pad >= SIMON_PADS.length) return { kind: 'none' };
  const want = s.seq[s.step];
  s.idleAt = now;
  if (pad !== want) {
    s.wrong += 1;
    s.misses += 1;
    s.hintPad = want;
    s.hintUntil = now + HINT_MS;
    s.phase = 'oops';
    s.why = 'oops';
    s.next = now + OOPS_MS;
    let shorter = false;
    if (s.misses >= MISS_MAX) {
      s.seq = simonFresh(Math.max(MIN_LEN, s.seq.length - 1), rng);
      s.paid = 0;
      s.misses = 0;
      s.shorter += 1;
      s.why = 'short';
      shorter = true;
    }
    return { kind: 'wrong', pad, want, shorter };
  }
  s.right += 1;
  s.tapPad = pad;
  s.tapUntil = now + TAP_MS;
  let pts = 0;
  if (s.step >= s.paid) { pts = 1; s.paid = s.step + 1; }
  s.step += 1;
  if (s.step < s.seq.length) {
    s.score += pts;
    return { kind: 'right', pad, pts };
  }
  const len = s.seq.length;
  pts += LINE_BONUS;
  s.score += pts;
  s.lines += 1;
  s.best = Math.max(s.best, len);
  s.seq = simonAdd(s.seq, rng);
  s.paid = 0;
  s.misses = 0;
  s.phase = 'wait';
  s.why = 'line';
  s.next = now + PAUSE_MS;
  return { kind: 'line', pad, pts, len };
}

/** 지금 빛나는 자리 (순수) → { pad, kind: 'show' | 'tap' | 'hint' } | null */
export function simonLit(s, t) {
  if (s.phase === 'show') {
    const d = t - s.at;
    const i = Math.floor(d / slot(s));
    if (d >= 0 && i < s.seq.length && d - i * slot(s) < simonOn(s.seq.length)) return { pad: s.seq[i], kind: 'show' };
    return null;
  }
  if (t < s.hintUntil) return { pad: s.hintPad, kind: 'hint' };
  if (t < s.tapUntil) return { pad: s.tapPad, kind: 'tap' };
  return null;
}

/** 멈췄던 만큼 뒤로 민다 (순수) — 앱을 내렸다 돌아오면 남은 시간이 그대로 */
export function simonShift(s, ms) {
  const d = Math.floor(Number(ms) || 0);
  if (!(d > 0)) return;
  s.t0 += d; s.end += d; s.last += d; s.at += d; s.next += d; s.idleAt += d;
  if (s.tapUntil) s.tapUntil += d;
  if (s.hintUntil) s.hintUntil += d;
}

/** 돌아왔다 (순수) — 보던 줄·따라 하던 줄은 처음부터 다시 보여 준다(내린 동안 잊었을 테니) · 틈(wait·oops)은 그대로 */
export function simonReplay(s, now) {
  if (s.phase !== 'show' && s.phase !== 'input') return false;
  s.why = 'back';
  startShow(s, now);
  return true;
}

/**
 * 화면이 멈췄다 왔다 (순수 · 화면이 simonTick 바로 앞에) — 지난 시계(s.last)에서 now까지가 LAG_MS를 넘었고, 그 사이에
 * 보여 주는 중이었거나 · 보여 주기가 시작됐어야 했거나(틈이 끝남) · 안 눌러 다시 보여 줄 때가 지났으면 → now부터 그 줄을 처음부터 보여 준다 → true
 * simonTick만 쓰면 못 그린 반짝(같은 칸 두 번 사이의 0.25초 틈 포함)을 본 것으로 치고 「따라 해 봐!」로 넘어간다 (🔍 Codex 150차 #1)
 * 밀린 소리는 한꺼번에 내지 않는다 — 다시 보여 주며 하나씩
 */
export function simonLag(s, now, lag = LAG_MS) {
  const t = Math.min(Number(now) || 0, s.end);
  if (!(t - s.last > lag)) return false;
  const idle = s.phase === 'input' && t - s.idleAt >= IDLE_MS;
  const due = s.phase === 'show' || ((s.phase === 'wait' || s.phase === 'oops') && t >= s.next) || idle;
  if (!due) return false;
  if (s.phase === 'show') s.why = 'back';
  if (idle) { s.why = 'idle'; s.replays += 1; }
  s.lags += 1;
  startShow(s, t);
  s.last = t;
  return true;
}

/** 위에 뜨는 말 (순수) — 단계·까닭으로 */
export function simonSay(s) {
  if (s.phase === 'input') return '따라 해 봐!';
  if (s.phase === 'oops') return s.why === 'short' ? '앗! 한 마리 줄여서 다시 볼까?' : '앗! 다시 볼까?';
  if (s.phase === 'wait' && s.why === 'line') return `잘했어! 이번엔 ${s.seq.length}마리`;
  if (s.why === 'idle' || s.why === 'back') return '한 번 더 볼게요 — 잘 봐!';
  return '잘 봐!';
}

/** 끝 화면 한 줄 (순수) — 「🧠 가장 긴 줄 5마리」 · 한 줄도 못 끝냈으면 '' */
export function simonLine(best) {
  const n = Math.floor(Number(best) || 0);
  return n >= MIN_LEN ? `🧠 가장 긴 줄 ${n}마리` : '';
}

// ───────────────────── 화면 (여기부터 브라우저) ─────────────────────

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}

/**
 * 한 판 돌리기 → { done: Promise<{ score, quit, line }>, stop(), music() }
 * stage = 그릴 자리 · o.pads = [{ type, id, ko, url }] 넷 (gameview simonPrep) · o.rng
 */
export function runSimon(stage, o = {}) {
  const now = () => performance.now();
  const rng = typeof o.rng === 'function' ? o.rng : Math.random;
  const pads = Array.isArray(o.pads) ? o.pads : [];
  stage.innerHTML = '';
  const root = el('div', 'gd gc');
  root.style.setProperty('--gd-sec', `${SIMON_SEC}s`);
  const top = el('div', 'gd-top');
  const scoreEl = el('span', 'gd-score', '⭐ 0');
  const time = el('div', 'gd-time');
  time.appendChild(el('i'));
  top.append(scoreEl, time);
  const say = el('p', 'gc-say', '잘 봐!');
  say.setAttribute('aria-live', 'polite');
  const dots = el('div', 'gc-dots');
  dots.setAttribute('aria-hidden', 'true');
  const grid = el('div', 'gc-grid');
  const padEls = SIMON_PADS.map((type, i) => {
    const p = pads[i] || {};
    const b = el('button', `gc-pad is-${type}${TYPE_DARK_TEXT.has(type) ? ' is-dark' : ''}`);
    b.type = 'button';
    b.style.backgroundColor = TYPE_COLOR[type] || '#888';
    b.setAttribute('aria-label', `${p.ko || '포켓몬'} (${TYPE_KO[type] || type})`);
    const art = el('span', 'gc-art');
    if (p.url) {
      const img = el('img', 'gc-img');
      img.alt = '';
      img.draggable = false;
      img.addEventListener('error', () => { art.innerHTML = '<span class="gc-alt">❔</span>'; });
      img.src = p.url;
      art.appendChild(img);
    } else art.innerHTML = '<span class="gc-alt">❔</span>';
    b.append(art, el('span', 'gc-name', p.ko || ''));
    b.addEventListener('pointerdown', (e) => { e.preventDefault(); press(i); });
    b.addEventListener('click', (e) => { if (e.detail === 0) press(i); }); // ⌨️ Enter·스페이스
    grid.appendChild(b);
    return b;
  });
  const hint = el('p', 'gc-hint', '포켓몬이 반짝인 차례대로 톡! (숫자 1·2·3·4도 돼요)');
  const fx = el('div', 'gd-fx');
  const banner = el('div', 'gd-banner', '준비!');
  root.append(top, say, dots, grid, hint, fx, banner);
  stage.appendChild(root);

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
  const fly = (text, cls) => {
    const f = el('span', `gd-fly gc-fly ${cls || ''}`, text);
    fx.appendChild(f);
    later(() => f.remove(), 1400);
  };
  let sayText = '';
  let dotKey = '';
  const draw = () => {
    if (!s) return;
    const lit = simonLit(s, s.last);
    padEls.forEach((b, i) => {
      b.classList.toggle('is-lit', !!lit && lit.pad === i && lit.kind !== 'hint');
      b.classList.toggle('is-hint', !!lit && lit.pad === i && lit.kind === 'hint');
    });
    root.classList.toggle('is-input', s.phase === 'input');
    root.classList.toggle('is-show', s.phase !== 'input');
    if (root.dataset.phase !== s.phase) root.dataset.phase = s.phase; // wait · show · input · oops (브라우저 확인·시험이 반짝을 셀 때)
    const t = simonSay(s);
    if (t !== sayText) { sayText = t; say.textContent = t; }
    // 따라 하는 동안 몇 마리째인지 ● ● ○ (셈 말 없이 동그라미만)
    const k = `${s.seq.length}:${s.phase === 'input' ? s.step : -1}`;
    if (k !== dotKey) {
      dotKey = k;
      dots.innerHTML = '';
      for (let i = 0; i < s.seq.length; i++) dots.appendChild(el('i', s.phase === 'input' && i < s.step ? 'is-on' : ''));
    }
  };
  const apply = (ev) => {
    if (ev.flashes.length) sfx.key(PAD_HZ[ev.flashes[ev.flashes.length - 1].pad]); // 늦게 그린 프레임에 여럿이 와도 소리는 마지막 하나
  };
  /** 시계 한 걸음 — 화면이 멈췄다 왔으면 지금 줄을 처음부터 다시 보여 주고(simonLag), 아니면 그대로 (🔍 Codex 150차 #1) */
  const step = (t) => {
    simonLag(s, t);
    apply(simonTick(s, t));
  };
  // 누른 순간 보이던 차례(turn) — 화면이 밀린 사이 시계가 차례를 넘겼으면(안 눌러 다시 보여 주기 등) 그 손길은 매기지 않는다 (🔍 Codex 149차 #2와 같은 꼴)
  const press = (i) => {
    if (!s || finished || pausedAt) return;
    const turn = s.phase === 'input' ? s.turn : -1;
    const t = now();
    step(t);
    if (s.phase !== 'input' || s.turn !== turn) { draw(); return; } // 보여 주기를 보던 손길(-1)은 어느 차례와도 안 같다
    const r = simonTap(s, i, t, rng);
    if (r.kind === 'right' || r.kind === 'line') {
      sfx.key(PAD_HZ[i]);
      scoreEl.textContent = `⭐ ${s.score}`;
      if (r.kind === 'line') {
        fly(`+${r.pts} 잘했어!`, 'is-big');
        later(() => sfx.ding(), 180);
      } else if (r.pts) fly('+1', '');
    } else if (r.kind === 'wrong') {
      const b = padEls[i];
      if (b) { b.classList.remove('is-no'); void b.offsetWidth; b.classList.add('is-no'); }
      sfx.tick();
    }
    draw();
  };
  const onKey = (e) => {
    const k = e && e.key;
    if (e && e.repeat) return; // 꾹 누른 키의 자동 반복은 안 셈 — 한 번 누름에 한 칸 (🔍 Codex 150차 #2)
    if (k === '1' || k === '2' || k === '3' || k === '4') {
      if (typeof e.preventDefault === 'function') e.preventDefault();
      press(Number(k) - 1);
    }
  };

  const onVis = () => {
    if (!s || finished) return;
    if (document.hidden) { pausedAt = now(); root.classList.add('is-paused'); return; }
    if (pausedAt) {
      simonShift(s, now() - pausedAt);
      pausedAt = 0;
      root.classList.remove('is-paused');
      simonReplay(s, now());
      draw();
    }
  };
  let settled = false;
  let settleTimer = 0;
  const result = (quit) => ({ score: s ? s.score : 0, quit, line: simonLine(s ? s.best : 0) });
  const settle = (r) => {
    if (settled) return;
    settled = true;
    clearTimeout(settleTimer);
    resolveDone(r);
  };
  const finish = (quit) => {
    if (finished) { if (quit) settle(result(false)); return; }
    finished = true;
    clearInterval(timer);
    for (const id of timers) clearTimeout(id);
    timers.clear();
    if (frame && typeof cancelAnimationFrame === 'function') cancelAnimationFrame(frame);
    document.removeEventListener('visibilitychange', onVis);
    document.removeEventListener('keydown', onKey);
    for (const b of padEls) { b.disabled = true; b.classList.remove('is-lit', 'is-hint'); }
    if (quit) { settle(result(true)); return; }
    banner.textContent = '끝!';
    banner.classList.add('is-on');
    sfx.success();
    settleTimer = setTimeout(() => settle(result(false)), 900);
  };
  const loop = () => {
    if (!s || pausedAt || finished) return;
    const t = now();
    step(t);
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

  document.addEventListener('visibilitychange', onVis);
  document.addEventListener('keydown', onKey);
  later(() => {
    if (finished) return;
    banner.classList.remove('is-on');
    s = simonStart(now(), rng);
    root.classList.add('is-go');
    if (document.hidden) { pausedAt = now(); root.classList.add('is-paused'); }
    draw();
    startLoop();
  }, 800);
  banner.classList.add('is-on');
  sfx.tick();

  return { done, stop: () => finish(true), music: () => musicMode({ over: true }) }; // 배경 음악 없음(GAMES quiet) — 혹시 불려도 늘 멈춤
}
