// 🎮 게임기 화면 (v307 · 2026-10-21) — 방의 🎮 게임기 → [🎮 게임하기] → 게임 고르기 → 한 판 → 끝(점수·새 기록) → 그만하면 방 장면(playshow)으로
// 판 규칙은 minigame.js(순수) · 게임 하나하나는 game*.js · 💗·최고 기록 저장은 xp.gameEnd(저장된 프로필로 한 트랜잭션)
//
// 판 쓰기: 게임을 고르는 순간 db.claimDailyCount(오늘, 'gamePlays', 그날 공부 시간으로 셈한 끝) — 트랜잭션 안에서 다시 세어
//   두 창이 같은 판을 두 번 쓰지 못하고, 다른 창이 공부 시간을 아직 못 적었으면 판이 없다고 나온다(늘 적게 — 많게는 안 된다)
// 아이 화면 규칙(아버님 2026-10-21): 판은 게임기 화면에만 🎮 그림으로 · "몇 분 더" 같은 셈은 어디에도 안 쓴다 ·
//   공부하는 동안 판이 생기면 한 줄(🎮 게임 1판이 생겼어요!) — 🎮 게임기를 가졌을 때만
import { GAMES, gameById, playState, playLimit, gameConfOf, subjectPlays, earnedPlays, usedPlays } from './minigame.js';
import { runDig, DIG_KINDS } from './gamedig.js';
import { runRun } from './gamerun.js'; // 🏃 파트너 달리기 (v308)
import { runShadow, shadowPoolOf, shadowShuffle, SHADOW_MIN } from './gameshadow.js'; // 👤 그림자 포켓몬 (v308)
import { SUBJECTS, FIELD, KO, status, currentSubject, clockDay, ensureToday, flushTime, adoptDaily, todayDaily, isReady, limitConf } from './timelimit.js';
import { claimDailyCount, releaseDailyCount, applyDailyDelta } from './db.js';
import { gameEnd, gameBest, itemCount } from './xp.js';
import { ROSTER, ensureArt, ensureCast, artUrl, characterUrl } from './pokemon.js';
import { typeOf } from './battle.js';
import { sfx, unlock } from './sfx.js';

/** 🎮 게임기 가구 id (house.js) */
export const GAME_DEVICE = 'f_game';
/** 그림을 기다리는 끝(ms) — 못 받으면 코드로 그린 모습으로 */
const ART_WAIT_MS = 2500;
/** 👤 그림자 — 기기에 그림이 이보다 적으면(처음 켠 기기) 몇 장 더 받아 본다 */
const SHADOW_FEW = 12;
/**
 * 게임마다 — run: 돌리는 것 · prep: **판을 쓰기 전에** 준비할 것(→ run에 넘길 것 · null이면 지금은 못 함 — 판을 안 쓴다) · none: 못 할 때 한 줄
 * ★ 새 게임은 minigame.GAMES와 여기에 함께 (시험이 둘을 맞춰 본다)
 */
const RUNNERS = {
  dig: { run: runDig, prep: async () => ({ art: await artFor(Object.values(DIG_KINDS).map((k) => k.id)) }) },
  run: { run: runRun, prep: async () => ({}) },
  shadow: { run: runShadow, prep: () => shadowPrep(), none: '포켓몬 그림이 아직 없어요 — 인터넷이 될 때 다시 해 봐요.' },
};

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}

/** ⚙ 설정의 게임 판 { min, cap } */
export function gameConf() {
  const c = limitConf() || {};
  return gameConfOf({ min: c.gameMin, cap: c.gameCap });
}
/** 지금 오늘 기록 — 과목 시간은 아직 저장 안 한 초까지 (⏳ status) */
function dailyNow() {
  const d = { ...(todayDaily() || {}) };
  for (const s of SUBJECTS) {
    const st = status(s);
    if (st) d[FIELD[s].used] = st.used;
  }
  return d;
}

// ───────────────────── 게임기 화면 ─────────────────────

// seq: 열 때마다 +1 — 닫은 뒤에 끝난 판·저장이 화면을 다시 그리지 않게 · run: 돌고 있는 판 { done, stop } · sum: 이번에 논 것(방 장면에 넘긴다)
const ui = { box: null, open: false, seq: 0, busy: false, view: 'pick', msg: '', ctx: null, resolve: null, run: null, sum: null, lastFocus: null };

/** index.html의 #game (없으면 만든다) */
function ensureBox() {
  if (ui.box) return ui.box;
  let box = document.getElementById('game');
  if (!box) {
    box = el('div', 'gm');
    box.id = 'game';
    box.hidden = true;
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-label', '게임기');
    box.innerHTML = '<div class="gm-card"><div class="gm-head"><span class="gm-title">🎮 게임기</span>'
      + '<button type="button" class="btn btn-icon gm-x" aria-label="닫기">✕</button></div><div class="gm-body"></div></div>';
    document.body.appendChild(box);
  }
  box.querySelector('.gm-x').addEventListener('click', () => {
    if (ui.view === 'play' && ui.run) { ui.run.stop(); return; } // 판 도중 ✕ = 여기까지 (점수는 그대로)
    if (ui.view === 'play') return; // 끝난 판을 저장하는 잠깐 — 다 저장하고 끝 화면이 뜬다 (🔍 Codex 113차 #2)
    closeGames();
  });
  ui.box = box;
  return box;
}
const body = () => ui.box.querySelector('.gm-body');

/**
 * 🎮 게임기 열기 → Promise<{ played, score, r }> (닫으면 풀린다) · score = 이번에 가장 잘한 판
 * ctx = { roomId, u (게임기 가구 번호), hero: { html } (응원하는 파트너·캐릭터 그림) }
 * r = 마지막으로 저장된 gameEnd 결과(💗는 이번에 한 번이라도 받았으면 heart) · why = 저장이 안 된 까닭(r이 없을 때) · 판 없이 닫으면 played 0
 */
export function openGames(ctx = {}) {
  ensureBox();
  if (ui.open) return Promise.resolve({ played: 0, score: 0, r: null });
  ui.open = true;
  ui.seq += 1;
  ui.busy = false;
  ui.view = 'pick';
  ui.msg = '';
  ui.ctx = ctx;
  ui.run = null;
  ui.sum = { played: 0, score: 0, r: null };
  ui.lastFocus = document.activeElement;
  ui.box.hidden = false;
  renderPick();
  return new Promise((resolve) => { ui.resolve = resolve; });
}

/** 닫기 — 돌던 판은 그 자리에서 끝(판은 이미 썼다) · 집을 닫을 때도 */
export function closeGames() {
  if (!ui.open) return;
  ui.open = false;
  ui.seq += 1;
  ui.busy = false;
  if (ui.run) { try { ui.run.stop(); } catch { /* 이미 끝남 */ } ui.run = null; }
  ui.box.hidden = true;
  body().innerHTML = '';
  const back = ui.lastFocus;
  ui.lastFocus = null;
  if (back && back.isConnected && typeof back.focus === 'function') { try { back.focus({ preventScroll: true }); } catch { /* 옛 브라우저 */ } }
  const f = ui.resolve;
  ui.resolve = null;
  if (typeof f === 'function') f(ui.sum || { played: 0, score: 0, r: null });
}

export function isGamesOpen() {
  return ui.open;
}

/** 게임기 첫 화면 말 (순수) — 셈 없이 */
export const MOOD_LINE = {
  ready: '🎮 하고 싶은 게임을 골라요!',
  study: '📚 공부하고 오면 게임기가 켜져요',
  done: '🌙 오늘 게임은 끝! 내일 또 만나요',
  rest: '💤 게임기가 쉬는 중이에요',
};

function renderPick() {
  ui.view = 'pick';
  const b = body();
  b.innerHTML = '';
  const st = playState(dailyNow(), gameConf());
  const plays = el('div', 'gm-plays');
  plays.setAttribute('aria-hidden', 'true');
  for (let i = 0; i < st.left; i++) plays.appendChild(el('span', 'gm-coin', '🎮'));
  if (st.left) b.appendChild(plays);
  b.appendChild(el('p', 'gm-mood', MOOD_LINE[st.mood] || ''));
  if (ui.msg) b.appendChild(el('p', 'gm-msg', ui.msg));
  const list = el('div', 'gm-list');
  for (const g of GAMES) {
    const card = el('button', 'gm-game');
    card.type = 'button';
    card.disabled = !st.left || ui.busy;
    card.appendChild(el('span', 'gm-game-emoji', g.emoji));
    const txt = el('span', 'gm-game-txt');
    txt.appendChild(el('span', 'gm-game-name', g.ko));
    txt.appendChild(el('span', 'gm-game-how', g.how));
    const best = gameBest(g.id);
    if (best > 0) txt.appendChild(el('span', 'gm-game-best', `최고 ⭐ ${best}`));
    card.appendChild(txt);
    card.addEventListener('click', () => { startRound(g.id).catch(() => {}); });
    list.appendChild(card);
  }
  b.appendChild(list);
  const close = el('button', 'btn gm-close', '닫기');
  close.type = 'button';
  close.addEventListener('click', () => closeGames());
  b.appendChild(close);
  const first = list.querySelector('.gm-game:not([disabled])') || close;
  try { first.focus({ preventScroll: true }); } catch { /* 옛 브라우저 */ }
}

/** 그림 미리 받기 — ART_WAIT_MS까지만 기다리고, 그때까지 받은 것만 쓴다 */
async function artFor(ids) {
  await Promise.race([Promise.all(ids.map((id) => ensureArt(id).catch(() => null))), wait(ART_WAIT_MS)]);
  const out = {};
  for (const id of ids) out[id] = artUrl(id);
  return out;
}

/** 👤 그림자 문제 — 명단(ROSTER) 가운데 기기에 그림이 있는 포켓몬 (아버님 2026-10-21 "앱 포켓몬 전체") */
function shadowPool() {
  const out = [];
  for (const r of ROSTER) {
    const url = characterUrl(r.id) || artUrl(r.id);
    if (url) out.push({ id: r.id, ko: r.ko, type: typeOf(r.id), url });
  }
  return out;
}
/** 그림이 적으면 몇 장 더 받아 본다(ART_WAIT_MS까지만) → { pool } · 그래도 보기 넷이 안 되면 null */
async function shadowPrep() {
  let pool = shadowPool();
  if (pool.length < SHADOW_FEW) {
    const have = new Set(pool.map((p) => p.id));
    const want = shadowShuffle(ROSTER.filter((r) => !have.has(r.id))).slice(0, SHADOW_FEW).map((r) => r.id);
    await Promise.race([ensureCast(want).catch(() => []), wait(ART_WAIT_MS)]);
    pool = shadowPool();
  }
  return shadowPoolOf(pool).length >= SHADOW_MIN ? { pool } : null;
}

/**
 * 게임 하나 고름 → 준비(그림 · 👤 문제 포켓몬) → 판 쓰기(트랜잭션) → 한 판 → 💗·최고 기록 저장 → 끝 화면
 * 🔍 Codex 113차:
 *   #1 그림은 **판을 쓰기 전에** 준비하고, 판을 쓰기 바로 앞에서 아직 열려 있는지 본다 — 기다리다 닫아도 판이 안 없어진다.
 *      준비가 안 되면(👤 그림이 넷이 안 됨) 판을 쓰지 않고 한 줄만 (v308)
 *      판을 쓰는 그 짧은 사이에 닫혔거나 판이 시작도 못 하고 깨지면 그 판을 돌려준다(releaseDailyCount — finally)
 *   #2 이 판의 화면 기록(sum)·자리(ctx)는 여기서 붙잡는다 — **시작한 판은 닫혀도 꼭 한 번 저장**하고(💗·최고 기록),
 *      닫고 다시 연 뒤 늦게 끝난 저장이 새 화면 기록에 섞이지 않게 · 저장하는 동안 ✕는 안 먹는다(gm-x)
 */
async function startRound(id) {
  const g = gameById(id);
  const R = RUNNERS[id];
  if (!g || !R || ui.busy || !ui.open) return;
  const seq = ui.seq;
  const live = () => ui.open && ui.seq === seq;
  const sum = ui.sum;
  const ctx = ui.ctx || {};
  ui.busy = true;
  unlock();
  let day = '';
  let spent = false;   // 판을 썼나
  let started = false; // 판이 시작됐나 — 시작한 판은 돌려주지 않는다(오락실 동전처럼)
  const giveBack = async () => {
    if (!spent || started) return;
    spent = false;
    try { const x = await releaseDailyCount(day, 'gamePlays'); if (x && x.daily) adoptDaily(x.daily); } catch { /* 못 돌려줌 — 그날만의 판 */ }
  };
  try {
    for (const c of body().querySelectorAll('.gm-game')) c.disabled = true; // 두 번 눌러 두 판 쓰지 않게
    await ensureToday(); // 자정을 넘겼으면 오늘 기록으로
    await flushTime().catch(() => {});
    const prep = await R.prep();
    if (!live()) return; // 준비하다 닫았다 — 판을 안 쓴다
    if (!prep) {
      ui.msg = R.none || '';
      ui.busy = false;
      renderPick();
      return;
    }
    day = clockDay();
    let r = null;
    try { r = await claimDailyCount(day, 'gamePlays', playLimit(gameConf())); } catch { r = null; }
    if (r && r.daily) adoptDaily(r.daily);
    spent = !!(r && r.won);
    if (!live()) return; // 판을 쓰는 사이에 닫았다 — 아래 finally에서 돌려준다
    if (!spent) {
      ui.msg = r ? '' : '앗, 저장을 못 했어요 — 한 번 더 눌러 봐요.';
      ui.busy = false;
      renderPick();
      return;
    }
    ui.msg = '';
    ui.view = 'play';
    const b = body();
    b.innerHTML = '';
    b.appendChild(el('p', 'gm-play-title', `${g.emoji} ${g.ko}`));
    const stage = el('div', 'gm-stage');
    b.appendChild(stage);
    const run = R.run(stage, { ...prep, hero: ctx.hero });
    started = true;
    ui.run = run;
    const res = await run.done;
    if (ui.run === run) ui.run = null;
    // 여기부터는 닫혔어도 이 판을 정산한다 (집을 닫아 끝난 판도 점수·💗를 남긴다)
    sum.played += 1;
    sum.score = Math.max(sum.score, res.score); // 방 장면엔 이번에 가장 잘한 판 (도중에 그만둔 마지막 판이 아니라)
    let end = null;
    try { end = await gameEnd(ctx.roomId, ctx.u, id, res.score); } catch { end = null; }
    if (end && end.ok) sum.r = { ...end, heart: !!(end.heart || (sum.r && sum.r.heart)) };
    else sum.why = (end && end.why) || 'save';
    if (!live()) return;
    ui.busy = false;
    renderResult(g, res, end);
  } catch {
    // 판이 깨져도 게임기 첫 화면으로 — 시작도 못 했으면 판을 돌려주고 나서 (멈춘 채 두지 않는다)
    await giveBack();
    if (live()) {
      if (ui.run) { try { ui.run.stop(); } catch { /* 이미 끝남 */ } ui.run = null; }
      ui.busy = false;
      ui.msg = '앗, 게임이 멈췄어요 — 다시 골라 봐요.';
      renderPick();
    }
  } finally {
    await giveBack();
  }
}

/** 끝 화면 — 점수 · 새 기록 · [🎮 한 판 더](판이 남았을 때만) · [그만하기] */
function renderResult(g, res, end) {
  ui.view = 'result';
  const b = body();
  b.innerHTML = '';
  b.appendChild(el('p', 'gm-end', `끝! ⭐ ${res.score}`));
  if (end && end.ok && end.newBest) {
    b.appendChild(el('p', 'gm-best', end.prevBest > 0 ? '🎉 새 기록!' : '⭐ 첫 기록!'));
    sfx.ding();
  } else if (end && end.ok && end.best > 0) b.appendChild(el('p', 'gm-best-old', `최고 ⭐ ${end.best}`));
  if (!end || end.why === 'save') b.appendChild(el('p', 'gm-msg', '앗, 기록을 저장하지 못했어요.'));
  const row = el('div', 'gm-row');
  const st = playState(dailyNow(), gameConf());
  if (st.left > 0) {
    const again = el('button', 'btn btn-primary gm-again', '🎮 한 판 더');
    again.type = 'button';
    again.addEventListener('click', () => { startRound(g.id).catch(() => {}); });
    row.appendChild(again);
  }
  const stop = el('button', `btn${st.left > 0 ? '' : ' btn-primary'} gm-stop`, '그만하기');
  stop.type = 'button';
  stop.addEventListener('click', () => closeGames());
  row.appendChild(stop);
  b.appendChild(row);
  try { (row.querySelector('.gm-again') || stop).focus({ preventScroll: true }); } catch { /* 옛 브라우저 */ }
}

// ───────────────────── 공부하는 동안 — 🎮 판이 생겼어요 ─────────────────────

const seen = { day: '', n: {} };
let toastEl = null;
let toastTimer = 0;

/** 짧은 알림 한 줄 (누를 것 없음 · 3초) */
function toast(text) {
  if (typeof document === 'undefined') return;
  if (!toastEl) {
    toastEl = el('div', 'gm-toast');
    toastEl.setAttribute('role', 'status');
    toastEl.hidden = true;
    document.body.appendChild(toastEl);
  }
  toastEl.textContent = text;
  toastEl.hidden = false;
  toastEl.classList.remove('is-on');
  void toastEl.offsetWidth;
  toastEl.classList.add('is-on');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toastEl.hidden = true; toastEl.classList.remove('is-on'); }, 3200);
}

/**
 * ⏳ 시계가 1초마다 부른다(app.js onTick) — 지금 과목에서 판이 하나 늘었으면 한 줄.
 * 기준은 그 과목을 처음 본 때의 판(앱을 켜자마자·과목을 옮기자마자 울리지 않게) · 오늘 기록을 읽기 전엔 기준을 잡지 않는다
 */
export function noteStudyPlays() {
  if (!isReady()) return;
  const s = currentSubject();
  if (!s) return;
  const st = status(s);
  if (!st) return;
  const day = clockDay();
  if (seen.day !== day) { seen.day = day; seen.n = {}; }
  const n = subjectPlays(st.used, gameConf());
  if (!(s in seen.n)) { seen.n[s] = n; return; }
  if (n > seen.n[s]) {
    seen.n[s] = n;
    if (itemCount(GAME_DEVICE) > 0) { toast('🎮 게임 1판이 생겼어요!'); sfx.ding(); }
  } else if (n < seen.n[s]) seen.n[s] = n; // ⚙에서 분을 늘렸다
}

// ───────────────────── ⚙ 부모 ─────────────────────

/** 🔒 오늘 +1판 (⚙ 설정 — 비밀번호 뒤) → 새 오늘 기록 */
export async function grantPlay() {
  await ensureToday();
  const d = await applyDailyDelta(clockDay(), { gameBonus: 1 });
  adoptDaily(d);
  return d;
}

/** ⚙ 아래 한 줄 (부모만 봄) — 받은 판(과목별 · 🔒) · 쓴 판 */
export function gameTodayLine(conf) {
  const d = dailyNow();
  const e = earnedPlays(d, conf || gameConf());
  const by = SUBJECTS.map((s) => `${KO[s]} ${e[s]}`).join(' · ');
  return `오늘 — 받은 판 ${e.total} (${by}${e.bonus ? ` · 🔒 +${e.bonus}` : ''}) · 쓴 판 ${usedPlays(d)}`;
}
