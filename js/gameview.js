// 🎮 게임기 화면 (v307 · 2026-10-21) — 방의 🎮 게임기 → [🎮 게임하기] → 게임 고르기 → 한 판 → 끝(점수·새 기록) → 그만하면 방 장면(playshow)으로
// 판 규칙은 minigame.js(순수) · 게임 하나하나는 game*.js · 💗·최고 기록 저장은 xp.gameEnd(저장된 프로필로 한 트랜잭션)
//
// 판 쓰기: 게임을 고르는 순간 db.claimDailyCount(오늘, 'gamePlays', 그날 공부 시간으로 셈한 끝) — 트랜잭션 안에서 다시 세어
//   두 창이 같은 판을 두 번 쓰지 못하고, 다른 창이 공부 시간을 아직 못 적었으면 판이 없다고 나온다(늘 적게 — 많게는 안 된다)
// 아이 화면 규칙(아버님 2026-10-21): 판은 게임기 화면에만 🎮 그림으로 · "몇 분 더" 같은 셈은 어디에도 안 쓴다 ·
//   공부하는 동안 판이 생기면 한 줄(🎮 게임 1판이 생겼어요!) — 🎮 게임기를 가졌을 때만
import { GAMES, gameById, playState, playLimit, gameConfOf, studyPlays, studySec, earnedPlays, usedPlays, clockText } from './minigame.js';
import { runDig, DIG_KINDS } from './gamedig.js';
import { runRun } from './gamerun.js'; // 🏃 파트너 달리기 (v308)
import { runShadow, shadowPoolOf, shadowShuffle, SHADOW_MIN } from './gameshadow.js'; // 👤 그림자 포켓몬 (v308)
import { runPair, PAIR_PAIRS } from './gamepair.js'; // 🃏 포켓몬 짝 맞추기 (v309)
import { runBerry, BERRY_KINDS } from './gameberry.js'; // 🍓 나무열매 받기 (v309)
import { runBalloon, BAL_MEOWTH } from './gameballoon.js'; // 🎈 로켓단 열기구 (v310)
import { runTower } from './gametower.js'; // 🗼 몬스터볼 탑 쌓기 (v311)
import { runTug } from './gametug.js'; // 🤼 아빠랑 줄다리기 (v312)
import { runAdv, ADV_ART } from './gameadv.js'; // 🗺️ 파트너 대모험 (v333)
import { runJig, JIG_CHOICES } from './gamejig.js'; // 🖼️ 포켓몬 그림 맞추기 (v339)
import { runThrow, THR_FEW } from './gamethrow.js'; // 🎯 몬스터볼 던지기 (v344)
import { runFish, FISH } from './gamefish.js'; // 🎣 잉어킹 낚시 (v344)
import { animUrl, ensureAnim } from './sprite.js';
import { SUBJECTS, FIELD, KO, status, currentSubject, clockDay, ensureToday, flushTime, adoptDaily, todayDaily, isReady, limitConf, usedSec } from './timelimit.js';
import { claimDailyCount, releaseDailyCount, applyDailyDelta } from './db.js';
import { gameEnd, gameBest, gameFast, itemCount, ownedMonIds, getPartner } from './xp.js';
import { ROSTER, ensureArt, ensureCast, artUrl, characterUrl, fullArt } from './pokemon.js';
import { typeOf, movesOf } from './battle.js';
import { sfx, unlock } from './sfx.js';
import { gameMusicStart, gameMusicStop, gameMusicWake, toggleGameMusic, gameMusicOn, gameMusicAllowed } from './gamebgm.js'; // 🎵 게임 음악 (v335)

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
  pair: { run: runPair, prep: () => pairPrep(), none: '포켓몬 그림이 아직 없어요 — 인터넷이 될 때 다시 해 봐요.' },
  berry: { run: runBerry, prep: async () => ({ art: await artFor([BERRY_KINDS.voltorb.id]) }) },
  balloon: { run: runBalloon, prep: () => balloonPrep() },
  tower: { run: runTower, prep: async () => ({}) }, // 볼은 CSS 무늬 — 받을 그림이 없다
  tug: { run: runTug, prep: async () => ({ meowth: (await balloonPrep()).meowth }) }, // 혼자일 때 상대 😼 나옹 — 🎈와 같은 그림
  adv: { run: runAdv, prep: async () => ({ art: await artFor([ADV_ART.volt, ADV_ART.bird]) }) }, // ⚡ 찌리리공 · 🐦 피죤 — 못 받으면 코드로 그린 모습
  jig: { run: runJig, prep: () => jigPrep(), none: '포켓몬 그림이 아직 없어요 — 인터넷이 될 때 다시 해 봐요.' }, // 🖼️ 잡은 포켓몬 셋 가운데 고르기 · 원본 크기 그림은 고르는 동안(fullArt)
  throw: { run: runThrow, prep: () => throwPrep(), none: '포켓몬 그림이 아직 없어요 — 인터넷이 될 때 다시 해 봐요.' }, // 🎯 잡은 포켓몬 그림 먼저 (도감과는 따로)
  fish: { run: runFish, prep: async () => ({ art: await artFor(Object.values(FISH).map((f) => f.id).filter(Boolean)) }) }, // 🎣 물 포켓몬 다섯 — 못 받으면 🐟 · 낚싯대는 파트너(ctx.hero)
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
      + '<button type="button" class="btn btn-icon gm-music" aria-label="게임 음악" aria-pressed="true">🎵</button>'
      + '<button type="button" class="btn btn-icon gm-x" aria-label="닫기">✕</button></div><div class="gm-body"></div></div>';
    document.body.appendChild(box);
  }
  box.querySelector('.gm-x').addEventListener('click', () => {
    if (ui.view === 'play' && ui.run) { ui.run.stop(); return; } // 판 도중 ✕ = 여기까지 (점수는 그대로)
    if (ui.view === 'play') return; // 끝난 판을 저장하는 잠깐 — 다 저장하고 끝 화면이 뜬다 (🔍 Codex 113차 #2)
    closeGames();
  });
  // 🎵 진우가 끄고 켬 — 판 도중에도 바로 (이 기기에 기억)
  const mb = box.querySelector('.gm-music');
  if (mb) mb.addEventListener('click', () => { toggleGameMusic(); syncMusicBtn(); });
  ui.box = box;
  return box;
}
const body = () => ui.box.querySelector('.gm-body');

/** 🎵 단추 모양 — 켬 🎵 · 끔 🔇 · ⚙ 이벤트 배경음악을 끄면 단추도 없음 (v335) */
function syncMusicBtn() {
  const b = ui.box && ui.box.querySelector('.gm-music');
  if (!b) return;
  const on = gameMusicOn();
  b.hidden = !gameMusicAllowed();
  b.textContent = on ? '🎵' : '🔇';
  b.setAttribute('aria-pressed', on ? 'true' : 'false');
  b.title = on ? '게임 음악 끄기' : '게임 음악 켜기';
}

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
  syncMusicBtn();
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
  gameMusicStop();
  wideCard(false);
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

/** 게임기 첫 화면 말 (순수) — 셈 없이 (몇 분·몇 판은 아래 설명 줄이 맡는다) */
export const MOOD_LINE = {
  ready: '🎮 하고 싶은 게임을 골라요!',
  study: '📚 공부하고 오면 게임기가 켜져요',
  done: '🌙 오늘 게임은 끝! 내일 또 만나요',
  rest: '💤 게임기가 쉬는 중이에요',
};

/**
 * 🎮 판이 생기는 규칙 (순수 — v328, 아버님: 아이가 얼마나 공부해야 하는지 몰라 헷갈렸다) · 0판(게임기 쉼)이면 [] (공부로는 안 생긴다)
 * @param {{min:number, cap:number}} conf
 */
export function ruleLines(conf) {
  const c = gameConfOf(conf);
  if (c.cap <= 0) return [];
  return [
    `공부 ${c.min}분마다 한 판 (수학·영어·국어·논술 모두 세요)`,
    `하루 ${c.cap}판까지 · 받은 판은 오늘만 (밤 12시가 지나면 없어져요)`,
    '공부 화면을 켜 두기만 하고 가만히 있으면 안 세요',
  ];
}

/**
 * 오늘 형편 두 줄 (순수 — v328) — "오늘 공부 37분 → 🎮 2판 받았어요 (1판 했어요)" · "📚 8분 더 공부하면 한 판이 생겨요"
 * 🔒 부모가 준 판은 "🎁 선물 N판"으로 따로(공부로 받은 판과 섞으면 "공부 0분 → 1판"·"하루 12판인데 13판"이 된다, 🔍 Codex 132차 #3) ·
 * 다 받았으면 "🌙 오늘 공부로 받을 판은 다 받았어요"(남은 판이 있을 때만 — 다 썼으면 MOOD_LINE.done이 말한다) ·
 * 게임기 쉼(⚙ 0판)이면 [] — 🔒 부모 판이 남아 있어도 공부로는 안 생기니 셈을 말하지 않는다
 * @param {{mood:string, left:number, sec:number, study:number, bonus:number, used:number, next:number, cap:number}} st playState
 */
export function statusLines(st) {
  if (!st || st.mood === 'rest' || !(st.cap > 0)) return [];
  const m = Math.floor((Number(st.sec) || 0) / 60);
  const out = [`오늘 공부 ${m}분${st.study > 0 ? ` → 🎮 ${st.study}판 받았어요` : ''}${st.bonus > 0 ? ` · 🎁 선물 ${st.bonus}판` : ''}${st.used > 0 ? ` (${st.used}판 했어요)` : ''}`];
  if (st.next > 0) out.push(`📚 ${Math.max(1, Math.ceil(st.next / 60))}분 더 공부하면 한 판이 생겨요`);
  else if (st.mood !== 'done') out.push('🌙 오늘 공부로 받을 판은 다 받았어요');
  return out;
}

function renderPick() {
  ui.view = 'pick';
  wideCard(false);
  const b = body();
  b.innerHTML = '';
  const conf = gameConf();
  const st = playState(dailyNow(), conf);
  const plays = el('div', 'gm-plays');
  plays.setAttribute('aria-hidden', 'true');
  for (let i = 0; i < st.left; i++) plays.appendChild(el('span', 'gm-coin', '🎮'));
  if (st.left) b.appendChild(plays);
  b.appendChild(el('p', 'gm-mood', MOOD_LINE[st.mood] || ''));
  // 📚 오늘 형편 · 규칙 (v328) — 몇 분 더 하면 한 판인지 게임기 화면에서만 (공부 화면엔 셈을 안 띄운다)
  const now = statusLines(st);
  if (now.length) {
    const box = el('div', 'gm-now');
    for (const t of now) box.appendChild(el('p', 'gm-now-line', t));
    b.appendChild(box);
  }
  const rules = ruleLines(conf);
  if (rules.length) {
    const box = el('div', 'gm-rule');
    box.appendChild(el('p', 'gm-rule-title', '🎮 미니 게임은 이렇게 생겨요'));
    const ul = el('ul', 'gm-rule-list');
    for (const t of rules) ul.appendChild(el('li', '', t));
    box.appendChild(ul);
    b.appendChild(box);
  }
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
    const rec = recordText(g);
    if (rec) txt.appendChild(el('span', 'gm-game-best', rec));
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

/** 고르기 카드의 최고 기록 한 줄 — ⭐ 점수 · ⏱️ 다 맞추면 끝나는 게임(GAMES clock — v339)은 가장 빠른 시간 · 기록이 없으면 '' */
function recordText(g) {
  if (g.clock) {
    const t = clockText(gameFast(g.id));
    return t ? `최고 ⏱️ ${t}` : '';
  }
  const best = gameBest(g.id);
  return best > 0 ? `최고 ⭐ ${best}` : '';
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
 * 🎈 나옹 얼굴(⚔️ 로켓단과 같은 움직이는 그림 — ART_WAIT_MS까지 · 없으면 일러스트 · 그것도 없으면 😼) ·
 * 파트너 기술(⚔️ 배틀과 같은 강한 기술 — 개굴닌자는 💧 물수리검 · 파트너가 없으면 ⭐ 별 던지기)
 */
async function balloonPrep() {
  await Promise.race([ensureAnim(BAL_MEOWTH).catch(() => null), wait(ART_WAIT_MS)]);
  const pid = getPartner();
  const m = pid ? movesOf(pid)[0] : null;
  return {
    meowth: animUrl(BAL_MEOWTH) || characterUrl(BAL_MEOWTH) || artUrl(BAL_MEOWTH) || null,
    move: m ? { name: m.name, emoji: m.emoji } : null,
  };
}
/**
 * 🃏 짝 카드 — **진우가 잡은 포켓몬**(mine)을 먼저(아버님 2026-10-21) · 그림이 없는 잡은 포켓몬은 몇 장 받아 본다(ART_WAIT_MS까지만)
 * 모자라면 앱 포켓몬 그림으로 채움(gamepair.pairPick) → { pool } · 그래도 여섯이 안 되면 null(판을 안 쓴다)
 */
async function pairPrep() {
  const mine = new Set(ownedMonIds());
  const withMine = () => shadowPool().map((p) => ({ ...p, mine: mine.has(p.id) }));
  let pool = withMine();
  const haveMine = pool.filter((p) => p.mine).length;
  const gap = [...mine].filter((id) => ROSTER.some((r) => r.id === id) && !(characterUrl(id) || artUrl(id)));
  if (haveMine < PAIR_PAIRS && gap.length) {
    await Promise.race([ensureCast(shadowShuffle(gap).slice(0, PAIR_PAIRS * 2)).catch(() => []), wait(ART_WAIT_MS)]);
    pool = withMine();
  }
  if (pool.length < PAIR_PAIRS) {
    const extra = await shadowPrep(); // 기기 그림이 거의 없을 때 — 👤와 같이 몇 장 더 받아 본다
    if (extra) pool = withMine();
  }
  return pool.length >= PAIR_PAIRS ? { pool } : null;
}
/**
 * 🖼️ 그림 맞추기(v339) — 🃏 짝 카드와 같은 그림 모음(**잡은 포켓몬 먼저** · 그림 없는 잡은 포켓몬은 몇 장 받아 봄 · ART_WAIT_MS까지만) ·
 * 고를 그림이 하나도 없으면 null(판을 안 쓴다) → { pool, big } — big = 원본 크기 그림(고르는 동안 받아 본다 · 못 받으면 게임이 저장한 그림으로)
 */
async function jigPrep() {
  const mine = new Set(ownedMonIds());
  const withMine = () => shadowPool().map((p) => ({ ...p, mine: mine.has(p.id) }));
  let pool = withMine();
  const gap = [...mine].filter((id) => ROSTER.some((r) => r.id === id) && !(characterUrl(id) || artUrl(id)));
  if (pool.filter((p) => p.mine).length < JIG_CHOICES && gap.length) {
    await Promise.race([ensureCast(shadowShuffle(gap).slice(0, JIG_CHOICES * 2)).catch(() => []), wait(ART_WAIT_MS)]);
    pool = withMine();
  }
  if (pool.length < JIG_CHOICES) {
    await shadowPrep(); // 기기 그림이 거의 없을 때 — 👤와 같이 몇 장 더 받아 본다
    pool = withMine();
  }
  return pool.length ? { pool, big: (id) => fullArt(id) } : null;
}

/**
 * 🎯 던지기(v344) — 🃏 짝 카드와 같은 그림 모음 · **잡은 포켓몬이 THR_FEW 이상이면 그것만**(진우 포켓몬을 맞히는 놀이) · 모자라면 앱 포켓몬으로 채움 ·
 * 그림 없는 잡은 포켓몬은 몇 장 받아 본다(ART_WAIT_MS까지만) · 하나도 없으면 null(판을 안 쓴다) → { pool: [{ id, ko, url }] }
 * 맞혀도 도감·잡기와는 따로 — 그림만 쓴다
 */
async function throwPrep() {
  const mine = new Set(ownedMonIds());
  const withMine = () => shadowPool().map((p) => ({ ...p, mine: mine.has(p.id) }));
  let pool = withMine();
  const gap = [...mine].filter((id) => ROSTER.some((r) => r.id === id) && !(characterUrl(id) || artUrl(id)));
  if (pool.filter((p) => p.mine).length < THR_FEW && gap.length) {
    await Promise.race([ensureCast(shadowShuffle(gap).slice(0, THR_FEW * 2)).catch(() => []), wait(ART_WAIT_MS)]);
    pool = withMine();
  }
  if (!pool.length) {
    await shadowPrep(); // 기기 그림이 거의 없을 때 — 👤와 같이 몇 장 더 받아 본다
    pool = withMine();
  }
  const own = pool.filter((p) => p.mine);
  const use = own.length >= THR_FEW ? own : pool;
  return use.length ? { pool: use.map((p) => ({ id: p.id, ko: p.ko, url: p.url })) } : null;
}

/** 넓은 게임기 카드 (🖼️ 그림 맞추기처럼 판이 큰 게임 — GAMES wide · v339) — 판 동안만 */
function wideCard(on) {
  const card = ui.box && ui.box.querySelector('.gm-card');
  if (card) card.classList.toggle('is-wide', !!on);
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
  gameMusicWake(); // 🎵 누른 손길 안에서 미리 (효과음을 꺼 두었어도)
  let day = '';
  let spent = false;   // 판을 썼나
  let started = false; // 판이 시작됐나 — 시작한 판은 돌려주지 않는다(오락실 동전처럼)
  let tune = 0;        // 🎵 이 판의 음악 번호표 — 끝낼 때 내 판 음악만 (늦게 끝난 앞 판이 새 판 음악을 끄지 않게, 🔍 Codex 139차 #1)
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
    wideCard(g.wide);
    const b = body();
    b.innerHTML = '';
    b.appendChild(el('p', 'gm-play-title', `${g.emoji} ${g.ko}`));
    const stage = el('div', 'gm-stage');
    b.appendChild(stage);
    const run = R.run(stage, { ...prep, hero: ctx.hero });
    started = true;
    ui.run = run;
    tune = gameMusicStart(id, typeof run.music === 'function' ? run.music : null); // 🎵 (v335) — 끝·⏰는 run.music()이 알린다
    const res = await run.done;
    gameMusicStop(tune);
    if (ui.run === run) ui.run = null;
    if (res && res.unplayed) { // 🤼 「누구랑?」·🖼️ 「어떤 포켓몬?」에서 그만둠 — 한 판도 안 했으니 판을 돌려주고 고르기로 (v312 · 💗·최고 기록도 없음)
      started = false;
      await giveBack();
      if (live() && res.msg) ui.msg = res.msg; // 🖼️ 그림을 못 펼쳤으면 고르기 화면에 한 줄 (v339)
      if (live()) { ui.busy = false; renderPick(); }
      return;
    }
    // 여기부터는 닫혔어도 이 판을 정산한다 (집을 닫아 끝난 판도 점수·💗를 남긴다)
    sum.played += 1;
    sum.score = Math.max(sum.score, res.score); // 방 장면엔 이번에 가장 잘한 판 (도중에 그만둔 마지막 판이 아니라)
    let end = null;
    try { end = await gameEnd(ctx.roomId, ctx.u, id, res.score, g.clock ? res.sec || 0 : 0); } catch { end = null; } // ⏱️ 다 맞춘 시간 (v339 — 그만둔 판은 sec 없음)
    if (end && end.ok) sum.r = { ...end, heart: !!(end.heart || (sum.r && sum.r.heart)) };
    else sum.why = (end && end.why) || 'save';
    if (!live()) return;
    ui.busy = false;
    renderResult(g, res, end);
  } catch {
    // 판이 깨져도 게임기 첫 화면으로 — 시작도 못 했으면 판을 돌려주고 나서 (멈춘 채 두지 않는다)
    if (tune) gameMusicStop(tune);
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

/**
 * 끝 말 (순수) — { head, rec, recNew } · head = 큰 글씨 · rec = 기록 한 줄 · recNew = 새 기록인가(소리)
 *   ⭐ 게임: 「끝! ⭐ 12」 · 새 기록 「🎉 새 기록!」(처음이면 「⭐ 첫 기록!」) · 아니면 「최고 ⭐ 20」
 *   ⏱️ 다 맞추면 끝나는 게임(GAMES clock — v339): 다 맞췄으면 「완성! ⏱️ 2분 13초」 · 그만둔 판은 「끝! ⭐ 7」(맞춘 조각) ·
 *   새 기록 「🎉 새 기록!」(처음이면 「⏱️ 첫 기록!」) · 아니면 「최고 ⏱️ 1분 50초」 — 저장을 못 했으면 기록 줄 없음
 */
export function resultLines(g, res, end) {
  const r = res || {};
  const ok = !!(end && end.ok);
  if (g && g.clock) {
    const t = clockText(r.sec);
    const head = t ? `완성! ⏱️ ${t}` : `끝! ⭐ ${Number(r.score) || 0}`;
    if (ok && end.newFast) return { head, rec: end.prevFast > 0 ? '🎉 새 기록!' : '⏱️ 첫 기록!', recNew: true };
    const old = ok ? clockText(end.fast) : '';
    return { head, rec: old ? `최고 ⏱️ ${old}` : '', recNew: false };
  }
  const head = `끝! ⭐ ${Number(r.score) || 0}`;
  if (ok && end.newBest) return { head, rec: end.prevBest > 0 ? '🎉 새 기록!' : '⭐ 첫 기록!', recNew: true };
  return { head, rec: ok && end.best > 0 ? `최고 ⭐ ${end.best}` : '', recNew: false };
}

/** 끝 화면 — 점수 · 새 기록 · [🎮 한 판 더](판이 남았을 때만) · [그만하기] */
function renderResult(g, res, end) {
  ui.view = 'result';
  wideCard(false);
  const b = body();
  b.innerHTML = '';
  const L = resultLines(g, res, end);
  b.appendChild(el('p', 'gm-end', L.head));
  if (res.line) b.appendChild(el('p', 'gm-line', res.line)); // 🤼 「🏆 진우 2 : 1 아빠 — 진우 승!」 (v312 · 다른 게임은 없음)
  if (L.recNew) {
    b.appendChild(el('p', 'gm-best', L.rec));
    sfx.ding();
  } else if (L.rec) b.appendChild(el('p', 'gm-best-old', L.rec));
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

const seen = { day: '', n: null, key: '' };
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
 * ⏳ 시계가 1초마다 부른다(app.js onTick) — 공부하는 동안 판이 하나 늘었으면 한 줄 (판은 과목을 합친 오늘 공부 시간으로 — v328).
 * 기준은 처음 본 때의 판(앱을 켜자마자 울리지 않게) · 오늘 기록을 읽기 전엔 기준을 잡지 않는다 · 공부 화면에서만
 */
export function noteStudyPlays() {
  if (!isReady()) return;
  if (!currentSubject()) return;
  const conf = gameConf();
  const n = studyPlays(studySec(dailyNow()), conf);
  if (playNoteStep(seen, clockDay(), `${conf.min}:${conf.cap}`, n) && itemCount(GAME_DEVICE) > 0) {
    toast(`🎮 게임 1판이 생겼어요! (공부 ${conf.min}분마다 한 판)`);
    sfx.ding();
  }
}

/**
 * 🎮 알림을 울릴까 (순수) — seen = { day, key, n }을 고쳐 쓰고, 공부로 받은 판(n)이 기준보다 늘었을 때만 true
 *   · 날이 바뀌었거나 ⚙ 분·상한(key)을 바꿨으면 기준을 새로 잡는다(그때는 안 울린다 — 앱을 켜자마자도)
 *   · 기준은 내리지 않는다 — 과목을 옮길 때 flushTime이 모아 둔 초를 먼저 비우고 저장을 기다리는 사이 합친 시간이 잠깐 줄었다가
 *     되돌아오면, 내렸던 기준 때문에 같은 판을 또 알린다 (🔍 Codex 132차 #2) · 공부 시간은 하루 안에서 줄지 않는다(병합도 큰 쪽)
 */
export function playNoteStep(seen, day, key, n) {
  if (seen.day !== day || seen.key !== key) { seen.day = day; seen.key = key; seen.n = null; }
  if (seen.n === null) { seen.n = n; return false; }
  if (n > seen.n) { seen.n = n; return true; }
  return false;
}

// ───────────────────── ⚙ 부모 ─────────────────────

/** 🔒 오늘 +1판 (⚙ 설정 — 비밀번호 뒤) → 새 오늘 기록 */
export async function grantPlay() {
  await ensureToday();
  const d = await applyDailyDelta(clockDay(), { gameBonus: 1 });
  adoptDaily(d);
  return d;
}

/** ⚙ 아래 한 줄 (부모만 봄) — 오늘 공부 분(과목별) · 받은 판(🔒 포함) · 쓴 판 */
export function gameTodayLine(conf) {
  const d = dailyNow();
  const e = earnedPlays(d, conf || gameConf());
  const by = SUBJECTS.map((s) => `${KO[s]} ${Math.floor(usedSec(d, s) / 60)}분`).join(' · ');
  return `오늘 — 공부 ${Math.floor(e.sec / 60)}분 (${by}) · 받은 판 ${e.total}${e.bonus ? ` (🔒 +${e.bonus})` : ''} · 쓴 판 ${usedPlays(d)}`;
}
