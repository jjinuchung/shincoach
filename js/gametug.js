// 🤼 아빠랑 줄다리기 — 🎮 게임기 미니 게임 여덟째(마지막) (v312 · 2026-10-21 아버님 "🤼 아빠랑 줄다리기 진행하자" → 물음 둘 모두 추천안)
// 한 태블릿을 가로로 놓고 나란히 앉아 각자 큰 버튼을 톡톡 — 톡 할 때마다 줄이 그쪽으로 끌려온다 · 리본이 승리선에 닿으면 그 판 🏆 → 1.2초 쉬고 다시 가운데
// 시작할 때 「누구랑?」 👨 아빠 · 👩 엄마 · 😼 로켓단 나옹(컴퓨터 — 아빠·엄마가 없을 때 · 물음 ②) · 두 손가락이 동시에 눌러도 따로 센다
// ① 힘은 **따라잡기** — 지고 있는 쪽 한 번 당김이 승리선에 가까울수록 더 세다(최대 1.3배 · 설정 없음) · 빠르기가 20%쯤 차이면 팽팽, 훨씬 빨리 누르면 이긴다
//    (1.6배로 해 보니 초당 다섯 번 누르는 진우도 나옹에게 한 판을 못 끝냈다 — 승리선 앞에서 멈춰 버림)
// ⭐ = **진우가 당긴 횟수**(💪 힘 기록) — 져도 ⭐와 최고 기록이 남는다 · 한 판 30초 · 시간이 끝날 때 줄이 한쪽으로 꽤 가 있으면 마지막 판은 그쪽
//
// 위쪽(엔진)은 순수 — 시각(ms)과 rng만 받아 상태를 바꾼다(node 시험이 가짜 시계로 끝까지) · 아래쪽(runTug)이 화면
// 리본 자리 p(칸): 0 가운데 · 음수 = 진우 쪽(왼쪽) · 양수 = 상대 쪽(오른쪽) · 마당 너비 100칸이라 p칸 = p% · 움직이는 것은 transform만 · 앱을 내리면 멈췄다가 이어서
import { sfx } from './sfx.js';
import { musicMode } from './gamesong.js'; // 🎵 게임 음악 상태 (v335 · 순수)

/** 한 판(초) · 승리선(가운데에서 칸) · 한 번 당김(칸) · 따라잡기(승리선 바로 앞에서 1 + 이만큼 배) · 판 사이 쉼 · 시간이 끝날 때 마지막 판을 가져가는 앞섬 */
export const TUG_SEC = 30;
export const TUG_WIN = 30;
export const TUG_PULL = 2.4;
export const TUG_CATCH = 0.3;
export const TUG_REST_MS = 1200;
export const TUG_LEAN = 3;
/** 상대 — 나옹은 컴퓨터(bot) · 그림은 ⚔️ 로켓단과 같은 움직이는 나옹(gameview prep) */
export const FOES = {
  dad: { ko: '아빠', emoji: '👨' },
  mom: { ko: '엄마', emoji: '👩' },
  meowth: { ko: '나옹', emoji: '😼', bot: true },
};
/** 나옹 — 초당 당김 · 진우가 이긴 판마다 이만큼 빨라짐 · 끝 · 처음 당기기까지(ms) */
export const BOT = { rate: 3.5, step: 0.5, max: 5.5, first: 500 }; // 3→5였다 (v351 — 진우 「너무 쉬워요」 → 아버님 「추천대로」)

const nz = (v) => {
  const n = Math.floor(Number(v) || 0);
  return n > 0 ? n : 0;
};

/** 한 번 당김의 세기 (순수) — 지고 있는 쪽(리본이 상대 쪽에 가 있는 쪽)은 승리선에 가까울수록 더 세다 */
export function tugStrength(p, who) {
  const x = Number(p) || 0;
  const behind = who === 'me' ? x > 0 : x < 0;
  const depth = behind ? Math.min(1, Math.abs(x) / TUG_WIN) : 0;
  return TUG_PULL * (1 + TUG_CATCH * depth);
}

/** 새 판 (순수) — foe: 'dad' | 'mom' | 'meowth' (모르는 값은 아빠) */
export function tugStart(now, foe) {
  const f = FOES[foe] ? foe : 'dad';
  return { t0: now, end: now + TUG_SEC * 1000, last: now, foe: f, p: 0, round: 1, wins: { me: 0, foe: 0 }, pulls: { me: 0, foe: 0 }, restUntil: 0, score: 0, nextBot: FOES[f].bot ? now + BOT.first : 0 };
}

function resetRound(s) {
  s.p = 0;
  s.restUntil = 0;
  s.round += 1;
}

/**
 * 당김 (순수) — who 'me'(진우) | 'foe'(상대) → { kind: 'pull' | 'win'(그 판 승리 · side) | 'rest'(판 사이 — 안 셈) | 'over' }
 * 진우가 당긴 것만 ⭐(score) · 쉼이 끝났는데 아직 가운데로 안 돌렸으면 여기서 돌린다
 */
export function tugPull(s, who, now) {
  if (now >= s.end) return { kind: 'over' };
  if (s.restUntil && now < s.restUntil) return { kind: 'rest' };
  if (s.restUntil) resetRound(s);
  const side = who === 'me' ? 'me' : 'foe';
  const str = tugStrength(s.p, side);
  s.pulls[side] += 1;
  if (side === 'me') s.score += 1;
  s.p += side === 'me' ? -str : str;
  if (Math.abs(s.p) >= TUG_WIN) {
    s.p = side === 'me' ? -TUG_WIN : TUG_WIN;
    s.wins[side] += 1;
    s.restUntil = now + TUG_REST_MS;
    return { kind: 'win', side };
  }
  return { kind: 'pull', side };
}

/** 나옹의 다음 당김까지(ms) (순수) — 진우가 이긴 판마다 조금씩 빨라짐 · ±25% 흔들림 */
export function botGap(s, rng = Math.random) {
  const rate = Math.min(BOT.max, BOT.rate + BOT.step * s.wins.me);
  return Math.round((1000 / rate) * (0.75 + rng() * 0.5));
}

/**
 * 시계 (순수) — now까지 일어날 일(판 사이 쉼 끝 → 가운데로 · 나옹 당김)을 때 차례로 · 판 끝을 넘지 않는다
 * → { pulls: [나옹 당김 결과], resets: 가운데로 돌린 수 }
 */
export function tugTick(s, now, rng = Math.random) {
  const ev = { pulls: [], resets: 0 };
  const to = Math.min(Number(now) || 0, s.end);
  if (!(to > s.last)) return ev;
  for (let guard = 0; guard < 2000; guard++) {
    const rest = s.restUntil && s.restUntil <= to ? s.restUntil : Infinity;
    const bot = s.nextBot && s.nextBot <= to ? s.nextBot : Infinity;
    if (rest === Infinity && bot === Infinity) break;
    if (rest <= bot) { resetRound(s); ev.resets += 1; continue; }
    if (s.restUntil && bot < s.restUntil) { s.nextBot = s.restUntil + botGap(s, rng); continue; } // 쉬는 동안은 안 당긴다
    ev.pulls.push(tugPull(s, 'foe', bot));
    s.nextBot = bot + botGap(s, rng);
  }
  s.last = to;
  return ev;
}

/** 멈췄던 만큼 뒤로 민다 (순수) — 앱을 내렸다 돌아오면 남은 시간·쉼·나옹 차례가 그대로 */
export function tugShift(s, ms) {
  const d = nz(ms);
  if (!d) return;
  s.t0 += d; s.end += d; s.last += d;
  if (s.restUntil) s.restUntil += d;
  if (s.nextBot) s.nextBot += d;
}

/** 끝 결과 (순수) → { me, foe, last } — 판 사이 쉼이 아니고 줄이 TUG_LEAN칸 넘게 한쪽에 가 있으면 마지막 판은 그쪽(last) */
export function tugResult(s) {
  const out = { me: s.wins.me, foe: s.wins.foe, last: null };
  if (!s.restUntil && Math.abs(s.p) > TUG_LEAN) {
    out.last = s.p < 0 ? 'me' : 'foe';
    out[out.last] += 1;
  }
  return out;
}

/** 끝 한 줄 (순수) — 「🏆 진우 2 : 1 아빠 — 진우 승!」 · 마지막 판을 앞섬으로 가져갔으면 까닭도 (🔍 Codex 118차 — 승리선에 안 닿았는데 판이 는 까닭) */
export function tugLine(r, foe) {
  const ko = (FOES[foe] || FOES.dad).ko;
  const verdict = r.me > r.foe ? '진우 승!' : r.me < r.foe ? `${ko} 승!` : '비겼어요!';
  return `🏆 진우 ${r.me} : ${r.foe} ${ko} — ${verdict}${r.last ? ' · 마지막 판은 줄이 더 간 쪽이 이겼어요' : ''}`;
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

/**
 * 한 판 돌리기 → { done: Promise<{ score, quit, line, unplayed? }>, stop() } · unplayed = 「누구랑?」에서 그만둠(판을 돌려받는다)
 * stage = 그릴 자리(비워서 쓴다) · o.meowth = 나옹 움직이는 그림 주소|null(없으면 😼) · o.hero = 진우 쪽 { html } (파트너 그림 또는 캐릭터) · o.rng
 * 먼저 「누구랑?」을 고른 뒤 「준비!」 → 30초 · stop()은 ✕·집을 닫을 때 — 그 자리에서 끝(quit)
 */
export function runTug(stage, o = {}) {
  const now = () => performance.now();
  const rng = typeof o.rng === 'function' ? o.rng : Math.random;
  stage.innerHTML = '';
  const root = el('div', 'gd gu');
  root.style.setProperty('--gd-sec', `${TUG_SEC}s`);
  const top = el('div', 'gd-top');
  const scoreEl = el('span', 'gd-score', '⭐ 0');
  const time = el('div', 'gd-time');
  time.appendChild(el('i'));
  top.append(scoreEl, time);
  const field = el('div', 'gu-field');
  const board = el('div', 'gu-board', '진우 🏆 0 : 0 🏆');
  const team = el('div', 'gu-team'); // 줄·리본·두 쪽 — 리본 자리만큼 통째로 옮긴다
  const rope = el('span', 'gu-rope');
  const flag = el('span', 'gu-flag');
  const me = el('div', 'gu-me');
  me.innerHTML = (o.hero && o.hero.html) || '<span class="gd-pal-emoji">🐾</span>';
  const foeEl = el('div', 'gu-foe');
  team.append(rope, flag, me, foeEl);
  field.append(el('span', 'gu-ground'), el('span', 'gu-line is-l'), el('span', 'gu-line is-r'), team, board);
  const pick = el('div', 'gu-pick');
  pick.appendChild(el('p', 'gu-pick-q', '누구랑 할까?'));
  const pickRow = el('div', 'gu-pick-row');
  pick.appendChild(pickRow);
  const pad = el('div', 'gu-pad');
  const btnMe = el('button', 'gu-btn is-me', '💪 진우 당겨!');
  btnMe.type = 'button';
  const btnFoe = el('button', 'gu-btn is-foe', '💪 당겨!');
  btnFoe.type = 'button';
  btnMe.disabled = true;
  btnFoe.disabled = true;
  pad.append(btnMe, btnFoe);
  pad.hidden = true;
  const hint = el('p', 'gu-hint', '톡톡 빨리 눌러 줄을 당겨요!');
  const fx = el('div', 'gd-fx');
  const banner = el('div', 'gd-banner', '');
  const say = el('p', 'sr-only'); // 화면 읽기 — 판마다 누가 이겼는지
  say.setAttribute('role', 'status');
  say.setAttribute('aria-live', 'polite');
  root.append(top, field, pick, pad, hint, fx, banner, say);
  stage.appendChild(root);

  let meowth = o.meowth ? String(o.meowth) : '';
  const foeFace = (f) => {
    foeEl.innerHTML = '';
    if (FOES[f].bot && meowth) {
      const img = el('img', 'gu-foe-img');
      img.alt = '';
      img.draggable = false;
      img.addEventListener('error', () => { meowth = ''; foeEl.innerHTML = '<span class="gu-foe-emoji">😼</span>'; });
      img.src = meowth;
      foeEl.appendChild(img);
    } else foeEl.appendChild(el('span', 'gu-foe-emoji', FOES[f].emoji));
  };

  let s = null;
  let foe = '';
  let timer = 0;
  let frame = 0;
  let pausedAt = 0;
  let finished = false;
  let lastTick = 0;
  let resolveDone;
  const done = new Promise((r) => { resolveDone = r; });

  const draw = () => {
    if (!s) return;
    team.style.transform = `translate3d(${s.p.toFixed(2)}%, 0, 0)`;
  };
  const showBoard = () => {
    if (s) board.textContent = `진우 🏆 ${s.wins.me} : ${s.wins.foe} 🏆 ${FOES[s.foe].ko}`;
  };
  const won = (side) => {
    const who = side === 'me' ? '진우' : FOES[s.foe].ko;
    banner.textContent = `${who} 이겼다!`;
    banner.classList.add('is-on');
    say.textContent = `${who} 이겼어요 — 진우 ${s.wins.me} : ${s.wins.foe} ${FOES[s.foe].ko}`;
    showBoard();
    if (side === 'me') { sfx.ding(); setTimeout(() => { if (!finished) sfx.twinkle(); }, 250); } else sfx.hit();
  };
  const result = (r) => {
    if (r.kind === 'pull' || r.kind === 'win') replay(r.side === 'me' ? me : foeEl, 'is-pull');
    if (r.kind === 'win') won(r.side);
  };
  /**
   * 일어난 일을 그린 뒤 — 쉬는 중이 아니면(가운데로 돌아왔으면) 이긴 글씨를 내린다
   * 화면이 늦게 불러 지난 판의 승리와 다음 판 시작이 한 번에 와도 그 글씨는 이미 끝난 판 것이다 (🔍 Codex 118차 #1)
   */
  const apply = (ev) => {
    for (const r of ev.pulls) result(r);
    if (s && !s.restUntil) banner.classList.remove('is-on');
  };
  const pull = (who) => {
    if (!s || finished || pausedAt) return;
    if (who === 'foe' && FOES[s.foe].bot) return; // 나옹 쪽은 컴퓨터가 당긴다
    const t = now();
    apply(tugTick(s, t, rng)); // 누른 때까지 일어난 일을 먼저
    const r = tugPull(s, who, t);
    if (r.kind === 'over' || r.kind === 'rest') return;
    if (who === 'me') {
      scoreEl.textContent = `⭐ ${s.score}`;
      if (t - lastTick > 120) { lastTick = t; sfx.tick(); }
    }
    result(r);
    draw();
  };
  // 손가락마다 따로 — pointerdown만 센다(따라오는 click은 안 셈) · ⌨️ 단추에 포커스가 있을 때 Enter·스페이스(포인터 없는 click)도
  for (const [btn, who] of [[btnMe, 'me'], [btnFoe, 'foe']]) {
    btn.addEventListener('pointerdown', (e) => { e.preventDefault(); pull(who); });
    btn.addEventListener('click', (e) => { if (e.detail === 0) pull(who); });
  }
  // ⌨️ 진우 ← · A / 상대 → · L (꾹 누름은 한 번)
  root.addEventListener('keydown', (e) => {
    const k = String(e.key || '').toLowerCase();
    const who = k === 'arrowleft' || k === 'a' ? 'me' : k === 'arrowright' || k === 'l' ? 'foe' : '';
    if (!who) return;
    e.preventDefault();
    if (!e.repeat) pull(who);
  });

  const onVis = () => {
    if (!s || finished) return;
    if (document.hidden) { pausedAt = now(); root.classList.add('is-paused'); return; }
    if (pausedAt) { tugShift(s, now() - pausedAt); pausedAt = 0; root.classList.remove('is-paused'); }
  };
  const finish = (quit) => {
    if (finished) return;
    finished = true;
    clearInterval(timer);
    if (frame && typeof cancelAnimationFrame === 'function') cancelAnimationFrame(frame);
    document.removeEventListener('visibilitychange', onVis);
    btnMe.disabled = true;
    btnFoe.disabled = true;
    for (const b of pickRow.children) b.disabled = true;
    const score = s ? s.score : 0;
    const r = s ? (quit ? { me: s.wins.me, foe: s.wins.foe, last: null } : tugResult(s)) : null;
    const line = r ? tugLine(r, s.foe) : '';
    // 「누구랑?」에서 그만두면 한 판도 안 한 것 — 게임기가 판을 돌려준다(gameview · 잘못 고른 카드에서 ✕를 눌러도 판이 안 없어지게)
    if (quit && !foe) { resolveDone({ score: 0, quit: true, line: '', unplayed: true }); return; }
    if (quit) { resolveDone({ score, quit: true, line }); return; }
    board.textContent = `진우 🏆 ${r.me} : ${r.foe} 🏆 ${FOES[s.foe].ko}`;
    banner.textContent = '끝!';
    banner.classList.add('is-on');
    say.textContent = line;
    sfx.success();
    setTimeout(() => resolveDone({ score, quit: false, line }), 900);
  };
  const loop = () => {
    if (!s || pausedAt || finished) return;
    const t = now();
    apply(tugTick(s, t, rng));
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

  /** 상대를 고르면 → 단추 이름 · 얼굴 → 「준비!」 → 30초 (앱 내림은 「준비!」 때부터 듣는다 — 디그다와 같게) */
  const choose = (f) => {
    if (finished || foe) return;
    foe = f;
    foeFace(f);
    btnFoe.textContent = FOES[f].bot ? `${FOES[f].emoji} 나옹이 당겨요` : `💪 ${FOES[f].ko} 당겨!`;
    board.textContent = `진우 🏆 0 : 0 🏆 ${FOES[f].ko}`;
    pick.hidden = true;
    pad.hidden = false;
    document.addEventListener('visibilitychange', onVis);
    banner.textContent = '준비!';
    banner.classList.add('is-on');
    sfx.tick();
    setTimeout(() => {
      if (finished) return;
      banner.classList.remove('is-on');
      s = tugStart(now(), f);
      root.classList.add('is-go');
      if (document.hidden) { pausedAt = now(); root.classList.add('is-paused'); }
      btnMe.disabled = false;
      btnFoe.disabled = !!FOES[f].bot;
      draw();
      startLoop();
      try { btnMe.focus({ preventScroll: true }); } catch { /* 옛 브라우저 */ }
    }, 800);
  };
  for (const f of Object.keys(FOES)) {
    const b = el('button', `gu-who is-${f}`);
    b.type = 'button';
    b.appendChild(el('span', 'gu-who-face', FOES[f].emoji));
    b.appendChild(el('span', 'gu-who-name', FOES[f].bot ? `${FOES[f].ko}(혼자일 때)` : FOES[f].ko));
    b.addEventListener('click', () => choose(f));
    pickRow.appendChild(b);
  }
  foeFace('dad');
  try { pickRow.children[0].focus({ preventScroll: true }); } catch { /* 옛 브라우저 */ }

  // 🎵 게임 음악(v335) — 끝나면 stop · 마지막 10초면 hurry (내려 둔 동안은 멈춘 때로 셈)
  return { done, stop: () => finish(true), music: () => musicMode({ over: finished, left: s ? s.end - (pausedAt || now()) : null }) };
}
