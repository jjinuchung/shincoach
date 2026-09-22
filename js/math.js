// 🔢 수학 화면 — 줄기 고르기(분수·음수) → 📏 진단 → 사다리 → 개념 한 편(📖 이야기 또는 📚 배움 → ①②③⭐ → 보상)
//
// 규칙은 mathgen.js·mathneg.js(문제)·mathprog.js(진도)에 있고 여기는 그리기와 배선만 한다.
// 줄기는 mathprog.STEMS에서 온다 — 화면은 `S()`(지금 줄기)와 `G()`(그 생성기)만 부르고 줄기 이름을 직접 알지 않는다.
// 영어 화면은 한 줄도 건드리지 않는다 — 🏠 홈에서 갈라져 들어오고 ←로 홈으로 나간다.
// 보상(⚡💰🎯)은 영어와 같은 xp.js·catch.js를 그대로 쓴다 — 도감·코인이 한 몸이라야 "수학을 해서 마스터볼을 산다"가 된다.

import { WORLDS, rng, shuffle, josa } from './mathgen.js';
import { renderFigures, barSvg, compareLineSvg, walkWidget, walkRange, shadeWidget } from './mathdraw.js';
import {
  needsPlacement, applyPlacement, applyRound, roundReward, ladderOf, dueIds, nowId, nameOf, seenWorlds, REWARD, kidTags, META_TAGS, nextNote,
  dueNotes, countNotes, applyNotesRound, STEMS, STEM_ORDER, stemOf, gradeLabel, dailyPlan, applyMixRound, markDaily, dailyDone, tallyRound, roundCatches, addPending, takePending, giveBackPending, pendingThrows, stoneReward,
} from './mathprog.js';
import { getMath, updateMath, applyDailyDelta, listItems, getAllSentenceStats } from './db.js';
import { askContext, addAsk, unreadAsks, openAsks, markAskRead, decideAsk, applyAskTry, applyReply, askedToday, pendingAskFor, ASK_REWARD, ASK_DAILY_MAX } from './mathask.js';
import { todayKey } from './track.js';
import { gainXp, gainCoins, getLevelInfo, coins, caughtCount, getLook, isTired, catchAttempt, inventory, addItem, unlockBase, itemCount, useItem, rarityOf, RARITY } from './xp.js';
import { LOCKED, nextLocked, ticketId, unlockState, MATH_PTS } from './unlock.js';
import { GOLDEN, STONE_MATH, RADAR } from './items.js';
import { dailyBonus, bonusText } from './mathbonus.js';
import { ROSTER, loadCharacters, isUnlocked, pickCharacters, forSubject, downloadCharacters, ensureCast } from './pokemon.js';
import { openCatch } from './catch.js';
import { contentSummary, cueCountOf } from './stats.js';
import { sfx } from './sfx.js';

const $ = (id) => document.getElementById(id);

// 화면 상태 — 전역 boolean/Set은 두지 않는다 ("껐다 켜면 낫는다" 병의 뿌리). 한 편의 상태는 round 객체 하나에 담고 끝나면 null
const ui = {
  showView: null,
  stem: null,           // 지금 고른 줄기 key ('fraction'·'negative') — 없으면 줄기 고르기 화면
  contents: {},         // 줄기별 사람이 쓴 내용 (coach/math/*.json, 한 번 받아 둠)
  charBusy: false,      // 🔢 수학 포켓몬 그림을 받는 중 (topUpMathCharacters 중복 방지)
  catching: false,      // 🎯 잡기 흐름이 도는 중 (runCatches 하나만)
  opts: null,           // makeRound에 넘길 출연진·세계 (content는 줄기별로 optsFor가 끼운다)
  round: null,          // 진행 중인 한 편 { id, mode:'learn'|'review'|'diag'|'notes'|'mix', qs, at, correct, missTags, answered }
  daily: null,          // ☀️ 오늘의 수학 흐름 { plan, step:'round'|'mix', roundInfo } — 개념 편 → 🎲 섞어 풀기. 사다리로 나가면 null
  run: 0,               // 화면을 지우고 await 하는 함수의 요청 번호 (겹쳐 그리기 방지)
  recent: {},           // 개념별로 방금 나온 이야기 틀·문항 (같은 개념을 다시 풀 때 같은 이야기가 또 나오지 않게)
  state: null,          // 마지막으로 읽은 수학 진도 (🤔 오답 노트를 다음 편에 끼우려고)
};
const RECENT_KEEP = 10; // 두 편 반 분량 — 틀이 4개뿐인 개념도 한 바퀴는 돈다
const STEM_KEY = 'shincoach.mathStem'; // 마지막에 고른 줄기 (이 기기 편의용 — 없어도 고르기 화면이 나올 뿐)

/** 지금 줄기 / 그 생성기 / 개념 */
const S = () => STEMS[ui.stem] || STEMS.fraction;
const G = () => S().gen;
const conceptOf = (id) => { const s = stemOf(id); return s ? s.list.find((c) => c.id === id) || null : null; };
/** 출연진·세계 + 그 줄기의 사람이 쓴 내용 — 🤔 오답 노트 회차는 줄기를 섞을 수 있어 개념마다 따로 끼운다 */
const optsFor = (stemKey) => ({ ...(ui.opts || {}), content: ui.contents[stemKey || ui.stem] || {} });

// ───────────────────── 분수를 세로로 ─────────────────────

/** "2 3/8" → 2 와 세로 분수, "5/6" → 세로 분수, **굵게**. DOM으로 만든다 (innerHTML에 글을 넣지 않는다) */
function richNode(text) {
  const frag = document.createDocumentFragment();
  const parts = String(text || '').split(/(\*\*[^*]+\*\*|(?<![\d/])\d+ \d+\/\d+(?![\d/])|(?<![\d/])\d+\/\d+(?![\d/]))/g);
  for (const p of parts) {
    if (!p) continue;
    let m;
    if ((m = /^\*\*([^*]+)\*\*$/.exec(p))) {
      const b = document.createElement('strong'); b.appendChild(richNode(m[1])); frag.appendChild(b);
    } else if ((m = /^(\d+) (\d+)\/(\d+)$/.exec(p))) {
      const mx = el('span', 'mx'); mx.appendChild(el('span', 'w', m[1])); mx.appendChild(fracEl(m[2], m[3])); frag.appendChild(mx);
    } else if ((m = /^(\d+)\/(\d+)$/.exec(p))) {
      frag.appendChild(fracEl(m[1], m[2]));
    } else {
      frag.appendChild(document.createTextNode(p));
    }
  }
  return frag;
}

function fracEl(n, d) {
  const f = el('span', 'fr');
  f.appendChild(el('span', 'n', n));
  f.appendChild(el('span', 'd', d));
  return f;
}

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}

/** SVG 문자열(우리 코드가 만든 것)만 innerHTML로 — 글은 절대 여기로 넣지 않는다 */
function svgBox(svg, cls) {
  const box = el('div', cls || 'math-fig');
  box.innerHTML = svg;
  return box;
}

/** 이야기 본문: 문단 나누기(빈 줄) + 줄 바꿈(한 줄 — 규칙표처럼 줄이 뜻인 글) + [bar 7/8] 그림 + 세로 분수 */
function storyBody(text) {
  const wrap = el('div', 'math-story-body');
  for (const para of String(text || '').split(/\n\n+/)) {
    const segs = para.split(/(\[[a-z]+ [^\]]+\])/g);
    const p = el('p');
    let onlyFig = true;
    for (const seg of segs) {
      if (!seg) continue;
      if (/^\[[a-z]+ [^\]]+\]$/.test(seg)) p.appendChild(svgBox(renderFigures(seg), 'math-fig inline'));
      else {
        seg.split('\n').forEach((line, i) => { if (i) p.appendChild(el('br')); p.appendChild(richNode(line)); });
        if (seg.trim()) onlyFig = false;
      }
    }
    if (onlyFig) p.className = 'fig-only';
    wrap.appendChild(p);
  }
  return wrap;
}

// ───────────────────── 준비: 내용·출연진·본 영상 ─────────────────────

/** 줄기의 사람이 쓴 내용 — 한 번 받아 둔다. 못 받으면 {} (오프라인 첫 실행 — 코드 안의 예비 문항으로 간다) */
async function loadContent(stemKey) {
  if (ui.contents[stemKey]) return ui.contents[stemKey];
  try {
    const res = await fetch(STEMS[stemKey].file);
    ui.contents[stemKey] = res.ok ? await res.json() : {};
  } catch { ui.contents[stemKey] = {}; }
  return ui.contents[stemKey];
}

/** 출연진: 진우가 잡은 포켓몬 이름 + 끝까지 본 영상 세계 (+ 모든 줄기의 내용을 받아 둔다 — 🤔 노트 회차가 줄기를 섞는다) */
async function buildOpts() {
  await Promise.all(STEM_ORDER.map(loadContent));
  const names = ROSTER.filter((r) => caughtCount(r.id) > 0).map((r) => r.ko);
  let worlds = { pokemon: [] };
  try {
    const [items, records] = await Promise.all([listItems(), getAllSentenceStats()]);
    worlds = seenWorlds(contentSummary(items.filter((it) => !it.broken), records, cueCountOf));
  } catch { /* 영상 기록을 못 읽어도 포켓몬 세계로 간다 */ }
  ui.opts = { names, worlds, me: '진우' };
  return ui.opts;
}

/** 마지막에 고른 줄기 — 이 기기 편의용. 못 읽어도 고르기 화면으로 갈 뿐 */
function savedStem() {
  try { const k = localStorage.getItem(STEM_KEY); return STEMS[k] ? k : null; } catch { return null; }
}
function rememberStem(k) {
  try { localStorage.setItem(STEM_KEY, k); } catch { /* 사생활 모드 등 — 무시 */ }
}

/**
 * 🎯 잡기 후보 풀 — **🔢 수학 전용 포켓몬만**(pokemon.js subject 'math'), 레벨에 열린 것, 😴 쉬는 중 제외.
 * 영어 것은 영어 퍼즐에서만 잡힌다 — "수학에서만 만나는 얼굴"이 아이를 수학으로 끄는 힘이다 (2026-09-22).
 */
async function catchPool() {
  const read = async () => {
    let chars = [];
    try { chars = await loadCharacters(); } catch { chars = []; }
    const level = getLevelInfo().level;
    return forSubject(chars, 'math').filter((c) => isUnlocked(c.id, level) && !isTired(c.id)).map((c) => ({ ...c, look: getLook(c.id) }));
  };
  let pool = await read();
  // 수학 그림이 아직 4마리도 없으면(새 명단을 넣은 첫날) 몇 마리 받아서라도 던지게 — 번 잡기를 그림이 없다고 삼키지 않는다.
  // 8초 안에 못 받으면 있는 만큼으로(0이면 미룬 던지기로 남아 사다리에서 다시) — 느린 와이파이가 "다음 →"를 붙들지 않게 (Codex 5차 #5)
  if (pool.length < 4 && navigator.onLine !== false) {
    try {
      await Promise.race([downloadCharacters(null, 6, 'math'), new Promise((res) => setTimeout(res, 8000))]);
      pool = await read();
    } catch { /* 오프라인·실패 — 있는 만큼으로 */ }
  }
  return pool;
}

/**
 * 🧭 레이더 — 잡기 화면에서 **아이가 눌러야** 쓴다 (Codex 6차 #7: 저절로 쓰면 이미 희귀가 있어도 없어지고, 어느 게 레이더 것인지 안 보인다).
 * 쓰면 후보 4마리 중 한 마리를 **희귀 이상**으로 바꾸고 🧭 표시. 받아 둔 그림 중에 희귀 이상이 없으면 명단(수학·희귀 이상·😴 아님)에서
 * 하나를 즉석에서 받아 온다. 소모는 프로필 트랜잭션(useItem — 두 창이 같은 하나를 둘 다 쓰지 못한다), 그림을 못 받으면 되돌려 준다.
 * @returns {Promise<{candidates:Array, pickId:number, note:string}|null>} null이면 못 씀
 */
async function useRadar(pool, candidates) {
  if (!(await useItem(RADAR.id))) return null;
  const level = getLevelInfo().level;
  const rare = (c) => rarityOf(c.id) >= 3;
  const star = pool.filter(rare);
  let pick = star.length ? pickCharacters(star, 1)[0] : null;
  if (!pick) {
    const ids = forSubject(ROSTER, 'math').filter((r) => rare(r) && isUnlocked(r.id, level) && !isTired(r.id)).map((r) => r.id);
    const id = ids.length ? ids[Math.floor(Math.random() * ids.length)] : 0;
    try {
      const got = id ? await Promise.race([ensureCast([id]), new Promise((res) => setTimeout(() => res([]), 8000))]) : [];
      if (got && got.length) { const r = ROSTER.find((x) => x.id === id); pick = { id, ko: r ? r.ko : '', url: got[0].url, look: getLook(id) }; }
    } catch { pick = null; }
  }
  if (!pick) { addItem(RADAR.id, 1); return null; } // 그림을 못 받았다 — 레이더는 돌려준다
  const out = candidates.filter((c) => c.id !== pick.id).slice(0, 3);
  out.splice(Math.floor(Math.random() * (out.length + 1)), 0, pick);
  const rr = RARITY[rarityOf(pick.id)];
  return { candidates: out, pickId: pick.id, note: `🧭 레이더! ${rr.stars} ${rr.label} ${pick.ko}${josa(pick.ko, '이', '가')} 나타났어요` };
}

/** 수학 화면이 지금 보이나 — 🎒·📊는 ui.run을 안 올리므로 모달을 띄우기 전에 직접 본다 (Codex 5차 #3) */
function mathVisible() {
  const v = $('view-math');
  return !!v && !v.hidden;
}

const MATH_CHAR_BATCH = 8;
/** 수학 화면에 들어올 때마다 🔢 수학 포켓몬 그림을 조금씩 먼저 받아 둔다 (영어의 3분마다 8마리 자동 받기는 명단 순서라 수학 것이 맨 뒤) */
function topUpMathCharacters() {
  if (ui.charBusy || navigator.onLine === false) return;
  ui.charBusy = true;
  downloadCharacters(null, MATH_CHAR_BATCH, 'math').catch(() => {}).then(() => { ui.charBusy = false; });
}

/**
 * 🎯 몬스터볼을 n번 — 한 번 끝나면(onDone) 다음 후보 4마리로 다시. 화면을 떠났으면(run 바뀜) 그만.
 * 개념 편 통과 + ☀️ 첫 완주가 한 카드에 겹치면 2번이 된다.
 */
async function runCatches(n, { g, c, run, onAll }) {
  if (n <= 0) return;
  if (ui.catching) return; // 한 번에 하나의 잡기 흐름만 — 버튼을 연타해도 둘이 같이 돌며 던지기를 둘 다 쓰지 않게 (Codex 6차 #3)
  ui.catching = true;
  const finish = () => { ui.catching = false; if (typeof onAll === 'function' && run === ui.run && mathVisible()) onAll(); };
  const pool = await catchPool();
  // 나가 있으면(다른 화면·🎒) 안 띄운다 — 던질 기회는 레코드에 남아 사다리의 "🎯 받은 몬스터볼"로 다시 온다
  if (run !== ui.run || !mathVisible()) { ui.catching = false; return; }
  if (!pool.length) { finish(); return; } // 그림이 하나도 없다(오프라인 첫날) — 역시 레코드에 남는다
  let left = n;
  const one = async () => {
    if (run !== ui.run || !mathVisible()) { ui.catching = false; return; }
    // 던지기 하나를 **먼저** 레코드에서 뺀다(트랜잭션) — 두 창이 같은 기회를 두 번 던지지 못하게. 없으면 끝
    let taken = false;
    try { const s = await updateMath((m) => { taken = takePending(m); }); ui.state = s; } catch { taken = false; }
    if (!taken) { finish(); return; } // 남은 게 없다 — 사다리를 새로 그린다
    if (run !== ui.run || !mathVisible()) {
      // 뺀 사이에 나갔다 — 되돌려 준다 (Codex 6차 #4: 빼고 나서 화면을 보면 그 사이 나간 던지기가 사라졌다)
      try { ui.state = await updateMath((m) => { giveBackPending(m); }); } catch { /* 다음 병합에서 max로 잡힌다 */ }
      ui.catching = false;
      return;
    }
    const candidates = pickCharacters(pool, 4);
    openCatch({
      candidates, subject: 'math', xpGain: g ? g.gained : 0, coinGain: c || 0, levelInfo: g ? g.info : getLevelInfo(), levelUp: g && g.leveledUp ? g.to : 0,
      ballCounts: inventory(),
      radar: itemCount(RADAR.id) > 0 ? { count: itemCount(RADAR.id), use: (cur) => useRadar(pool, cur) } : null, // 🧭 아이가 눌러야 쓴다
      attempt: (id, opts) => catchAttempt(id, Math.random, opts),
      onDone: () => { updateChip(); left--; if (left > 0) one(); else finish(); },
    });
  };
  one();
}

/**
 * 🎟️ 다음 영상 교환권까지 — 영어 문장 + 🔢 수학이 같은 막대(2026-09-22). 아이가 목표로 삼은 그 영상이 수학으로도 가까워지는 걸 보여 준다.
 * @param {object|null} state 수학 레코드(tot)
 * @param {{progress?:number, review?:number}|null} earned 이번 편이 보탠 점수 (없으면 안 적음)
 * @returns {Promise<HTMLElement|null>} 광고 중인 영상이 없으면 null
 */
async function ticketNote(state, earned) {
  try {
    const bag = inventory();
    const next = nextLocked(LOCKED.filter((c) => (bag[ticketId(c.id)] || 0) > 0).map((c) => c.id));
    if (!next) return null;
    const records = await getAllSentenceStats().catch(() => []);
    const st = unlockState({ coins: coins(), records, price: next.price, base: unlockBase(), math: (state && state.tot) || null });
    const p = st.items.find((i) => i.key === 'progress');
    const rv = st.items.find((i) => i.key === 'review');
    const line = el('p', 'math-note math-ticket');
    const e = earned || {};
    const got = [e.progress > 0 ? `📼+${e.progress}` : '', e.review > 0 ? `🔁+${e.review}` : ''].filter(Boolean).join(' ');
    line.textContent = `🎟️ 다음 영상 「${next.ko}」까지 — 📼+🔢 ${p.have.toLocaleString()}/${p.need.toLocaleString()} · 🔁 ${rv.have}/${rv.need}${got ? ` (이번 수학 ${got})` : ' · 수학도 채워요'}`;
    return line;
  } catch { return null; }
}

function updateChip() {
  const chip = $('math-chip');
  if (!chip) return;
  const i = getLevelInfo();
  chip.textContent = `Lv.${i.level} ⚡${i.into}/${i.need} · 💰 ${coins()} · 🔷 ${itemCount(STONE_MATH.id)}`;
}

// ───────────────────── 화면들 ─────────────────────

function main() { return $('math-main'); }

function clearMain() {
  const m = main();
  m.innerHTML = '';
  m.scrollTop = 0;
  window.scrollTo(0, 0);
  return m;
}

/** 진입 — 진단 전이면 진단, 아니면 사다리 */
export async function renderMath() {
  topUpMathCharacters();
  // 🎒·📊를 보고 돌아온 것이면 풀던 편을 이어서 (2026-09-20: 과목 화면에도 🎒·📊를 두면서 필요해졌다).
  // 답을 고른 뒤였으면 다음 문항으로 — 같은 문항을 다시 그리면 두 번 답해 두 번 세어진다.
  const r = ui.round;
  // 저장 중에 🎒를 다녀온 것이면 — 기다린다. 사다리 로딩으로 내려가면 run이 바뀌어 저장을 끝낸 finishRound가 결과·☀️ 다음 단계를
  // 못 그리고, renderLadder가 ui.daily를 지운다 (Codex 3차 #2). run은 그대로 두어 finishRound가 이어서 그린다
  if (r && r.saving) {
    const m = main();
    if (m) { m.innerHTML = ''; m.appendChild(el('p', 'math-loading', '기록하는 중…')); }
    return;
  }
  if (r) {
    ui.run++;
    if (r.phase === 'story') renderStory(r.id, r.seed);
    else if (r.phase === 'lesson') renderLesson(r.id, r.seed, r.page || 0);
    else if (r.phase === 'retry') renderRetry(r.id, r.wrong || []);
    else if (r.twin) renderTwin(true);
    else if (r.at >= r.qs.length) finishRound(); // 다 풀고 저장이 실패한 상태 — 다시 저장 (Codex 2차 #2: 문항 없는 자리를 그리다 죽었다)
    else renderQuestion(r.answered); // 답한 뒤였으면 풀이·버튼까지 그대로 (채점은 안 한다)
    return;
  }
  // ☀️ 개념 편 결과 카드에서 🎒(🎯 잡은 걸 보러)를 다녀온 것이면 — 섞어 풀기가 남아 있으니 사다리 대신 거기로
  if (ui.daily && ui.daily.step === 'round' && ui.daily.roundInfo && ui.daily.plan.mix.length) { ui.run++; startMixRound(); return; }
  const run = ++ui.run;
  const m = main();
  if (!m) return;
  m.innerHTML = '';
  m.appendChild(el('p', 'math-loading', '불러오는 중…'));
  let [state] = await Promise.all([getMath(), buildOpts()]);
  state = await syncMathReplies(state); // 📬 배포로 온 아빠 답장이 있으면 붙인다
  if (run !== ui.run) return; // 그 사이에 다른 화면으로 갔다
  updateChip();
  ui.state = state;
  if (!ui.stem) ui.stem = savedStem();
  if (!ui.stem) { renderStemPicker(state); return; }
  if (needsPlacement(state, ui.stem)) renderDiagIntro();
  else renderLadder(state);
}

// ── 🌳 줄기 고르기

function renderStemPicker(state) {
  const m = clearMain();
  const card = el('section', 'math-card');
  card.appendChild(el('h2', '', '🌳 어떤 줄기를 할까?'));
  card.appendChild(el('p', 'math-p muted', '줄기 하나가 개념 사다리 하나예요. 하던 줄기를 이어서 해도 되고, 새 줄기를 시작해도 돼요.'));
  const list = el('div', 'math-stems');
  for (const key of STEM_ORDER) {
    const st = STEMS[key];
    const rows = ladderOf(state, todayKey(), key);
    const done = rows.filter((r) => r.state === 'done').length;
    const crown = rows.filter((r) => r.crowned).length;
    const started = !needsPlacement(state, key);
    const b = el('button', 'math-stem-btn');
    b.type = 'button';
    b.appendChild(el('span', 'math-stem-code', st.code));
    const body = el('span', 'math-stem-body');
    body.appendChild(el('span', 'math-stem-name', `${st.label} · ${st.range}`));
    body.appendChild(el('span', 'math-stem-sub', started ? `개념 ${rows.length}개 중 ${done}개를 알아요 · 👑 ${crown}` : (st.lesson ? '처음 배우는 줄기 — 한 장씩 배우고 문제를 풀어요' : '📏 진단 5문제로 시작해요')));
    b.appendChild(body);
    b.addEventListener('click', () => { ui.stem = key; rememberStem(key); if (needsPlacement(state, key)) renderDiagIntro(); else renderLadder(state); });
    list.appendChild(b);
  }
  card.appendChild(list);
  m.appendChild(card);
}

// ── 📏 진단

function renderDiagIntro() {
  const m = clearMain();
  const card = el('section', 'math-card');
  card.appendChild(el('div', 'math-eyebrow', `${S().code}. ${S().label} · ${S().range}`));
  card.appendChild(el('h2', '', '📏 어디서부터 할까?'));
  card.appendChild(el('p', 'math-p', S().intro));
  card.appendChild(el('p', 'math-p muted', '연습장에 풀고 답만 고르면 돼요.'));
  const b = el('button', 'btn btn-primary btn-big-wide', '시작!');
  b.type = 'button';
  b.addEventListener('click', () => startDiag());
  card.appendChild(b);
  const sw = el('button', 'btn btn-big-wide', '🌳 다른 줄기 고르기');
  sw.type = 'button';
  sw.addEventListener('click', () => renderStemPicker(ui.state));
  card.appendChild(sw);
  m.appendChild(card);
}

function startDiag() {
  const seed = (Date.now() % 1000000) | 0;
  ui.round = { id: null, mode: 'diag', qs: G().diagnosticSet(seed, 5, optsFor()), at: 0, correct: 0, missTags: [], answers: [], answered: false };
  renderQuestion();
}

// ── 사다리

function renderLadder(state) {
  const m = clearMain();
  ui.daily = null; // 사다리로 나오면 ☀️ 흐름은 끝
  const today = todayKey();
  const rows = ladderOf(state, today, ui.stem);
  const due = dueIds(state, today, ui.stem);

  const head = el('section', 'math-card math-strand');
  const eye = el('div', 'math-eyebrow math-eyebrow-row');
  eye.appendChild(el('span', '', `${S().code}. ${S().label} · ${S().range}`));
  const sw = el('button', 'btn btn-small math-stem-switch', '🌳 다른 줄기');
  sw.type = 'button';
  sw.addEventListener('click', () => renderStemPicker(state));
  eye.appendChild(sw);
  head.appendChild(eye);
  const doneN = rows.filter((r) => r.state === 'done').length;
  const crownN = rows.filter((r) => r.crowned).length;
  head.appendChild(el('h2', '', `개념 ${rows.length}개 중 ${doneN}개를 알아요 · 👑 ${crownN}`));
  // 📬 아빠의 답장 — 사다리 맨 위, 읽어야 ☀️가 열린다 (아버님 결정 2026-09-21: 수학 전체는 안 막고 ☀️만)
  const unread = unreadAsks(state);
  if (unread.length) {
    const ab = el('button', 'btn btn-primary btn-big-wide math-reply-btn', `📬 아빠의 답장 ${unread.length}개가 왔어요 — 먼저 읽어요`);
    ab.type = 'button';
    ab.addEventListener('click', () => renderReply(unread[0]));
    head.appendChild(ab);
  }
  // 🎯 미룬 던지기 — 후보 그림을 받는 사이 나갔거나 그림이 없었던 몬스터볼 (레코드 pend). 던질 때마다 하나씩 빠진다
  const pend = pendingThrows(state);
  if (pend > 0) {
    const pb = el('button', 'btn btn-accent btn-big-wide math-pend-btn', `🎯 받은 몬스터볼 ${pend}개가 남았어요 — 던지기`);
    pb.type = 'button';
    pb.addEventListener('click', () => { pb.disabled = true; runCatches(pend, { g: null, c: 0, run: ui.run, onAll: () => { if (ui.state) renderLadder(ui.state); } }); }); // 끝나면 사다리를 새로 그린다 (버튼은 그때까지 잠금)
    head.appendChild(pb);
  }
  // ☀️ 오늘의 수학 — 버튼 하나로 오늘 할 것: 개념 편 하나(복습 차례 우선) → 🎲 섞어 풀기. 아이가 쉬운 것만 고르지 않게 맨 위에 (2026-09-21 ④)
  const preview = dailyPlan(state, today, ui.stem, 0);
  if (preview.roundId || preview.mix.length) {
    const dn = dailyDone(state, today);
    const db = el('button', `btn btn-big-wide math-daily-btn${dn || unread.length ? '' : ' btn-primary'}`, dn ? `☀️ 오늘의 수학 완주 ✅ — 한 번 더 할래요?` : '☀️ 오늘의 수학 — 한 번에 다 하기');
    db.type = 'button';
    if (unread.length) db.disabled = true; // 📬를 읽으면 열린다
    db.addEventListener('click', () => startDaily());
    head.appendChild(db);
    const parts = [];
    if (preview.roundId) parts.push(`${preview.roundMode === 'review' ? '🔁 다시 확인' : '▶ 새로 배우기'} · ${nameOf(preview.roundId)}`);
    if (preview.mix.length) parts.push(`🎲 배운 것 섞어 풀기 ${preview.mix.length}문제`);
    head.appendChild(el('p', 'math-note math-daily-sub', unread.length ? `📬 답장을 읽으면 열려요 · ${parts.join(' → ')}` : parts.join(' → ')));
    // ✨ 오늘의 보너스 — 홈 카드와 같은 것. 완주했으면 받았다고, 아니면 완주하면 준다고
    const bonus = dailyBonus(today);
    head.appendChild(el('p', `math-note math-daily-bonus${dn ? ' got' : ''}`, dn ? `✅ 오늘의 보너스 ${bonusText(bonus)} 받았어요` : `✨ 오늘의 보너스 ${bonusText(bonus)} — ☀️ 완주하면 받아요`));
    ticketNote(state, null).then((t) => { if (t && head.isConnected) head.appendChild(t); }); // 🎟️ 다음 영상까지 — 수학도 같은 막대를 채운다
  }
  // ❓ 아빠 답을 기다리는 질문 · 😄 이해했는데 아직 안 풀어 본 문제
  const waiting = openAsks(state).length;
  const tryable = ((state && state.asks) || []).filter((x) => x && x.status === 'understood');
  if (tryable.length) {
    const tb = el('button', 'btn btn-big-wide math-ask-try-btn', `🔁 아빠 답장 문제 풀어보기 ${tryable.length}개 — 맞히면 ⚡${ASK_REWARD.xp}`);
    tb.type = 'button';
    tb.addEventListener('click', () => startAskTry(tryable[0]));
    head.appendChild(tb);
  }
  if (waiting) head.appendChild(el('p', 'math-note', `❓ 아빠 답을 기다리는 질문 ${waiting}개`));
  if (due.length) {
    const b = el('button', 'btn btn-accent btn-big-wide', `🔁 오늘 다시 확인할 개념 ${due.length}개 — 정말 아는지 볼까?`);
    b.type = 'button';
    b.addEventListener('click', () => startRound(due[0], 'review'));
    head.appendChild(b);
  }
  // 🤔 오답 노트 회차 — 어제 이전에 틀린 유형만 (개념 일정과 따로). 오늘 틀린 건 그 개념을 다시 열면 끼어 든다. 이 줄기의 것만
  const notesDue = dueNotes(state, today).filter((x) => { const s = stemOf(x.id); return s && s.key === ui.stem; });
  if (notesDue.length) {
    const nb = el('button', 'btn btn-big-wide math-notes-btn', `🤔 틀렸던 유형 ${notesDue.length}개 다시 풀기 — 이번엔 맞혀서 지워요`);
    nb.type = 'button';
    nb.addEventListener('click', () => startNotesRound(notesDue));
    head.appendChild(nb);
  } else {
    const nc = countNotes(state, today);
    if (nc.all) head.appendChild(el('p', 'math-note', `🤔 오늘 틀린 유형 ${nc.all}개는 내일부터 다시 풀 수 있어요.`));
  }
  m.appendChild(head);

  const list = el('ul', 'math-ladder');
  for (const r of rows) {
    const li = el('li', `math-rung ${r.state}${r.due ? ' due' : ''}${r.crowned ? ' crowned' : ''}`);
    const btn = el('button', 'math-rung-btn');
    btn.type = 'button';
    btn.appendChild(el('span', 'math-rung-icon', r.icon));
    const body = el('span', 'math-rung-body');
    body.appendChild(el('span', 'math-rung-name', r.name));
    const sub = r.state === 'locked' ? '앞 개념을 먼저 알아야 열려요'
      : r.crowned ? '이해 완료!'
        : r.due ? '오늘 다시 확인하기'
          : r.state === 'done' ? `알아요 (${r.left}번 더 확인하면 👑)`
            : r.state === 'now' ? '지금 배울 차례' : '배울 수 있어요';
    body.appendChild(el('span', 'math-rung-sub', `${gradeLabel(r.grade)} · ${sub}${r.notes ? ` · 🤔 다시 볼 유형 ${r.notes}` : ''}`));
    btn.appendChild(body);
    if (r.state === 'locked') btn.disabled = true;
    else btn.addEventListener('click', () => startRound(r.id, r.state === 'done' ? (r.due ? 'review' : 'practice') : 'learn'));
    li.appendChild(btn);
    list.appendChild(li);
  }
  m.appendChild(list);
  m.appendChild(el('p', 'math-note', '👑는 며칠에 걸쳐 다섯 번 확인해야 받아요. 그날 맞힌 건 "안다"이고, 며칠 뒤에도 맞아야 "이해했다"예요.'));
}

// ── 개념 한 편

/**
 * @param {'learn'|'review'|'practice'} mode learn: 처음 배움(📖 먼저) / review: 오늘 복습 / practice: 이미 아는 것 다시 풀기(보상 작게)
 */
/**
 * @param {'learn'|'review'|'practice'} mode
 * @param {{again?:boolean}} [o] again: 방금 틀려서 한 번 더 — 📖 이야기를 통째로 다시 보이지 않고 되짚기 카드로
 */
function startRound(id, mode, o = {}) {
  const seed = (Date.now() % 1000000) | 0;
  const recent = ui.recent[id] || [];
  // 🤔 오답 노트: 지난번에 틀린 유형이 있으면 그 유형을 한 문제 끼운다 (want) — 맞히면 노트에서 지워진다
  const note = nextNote(ui.state, id);
  const qs = G().makeRound(id, seed, { ...optsFor(), recent, ...(note && note.key ? { want: { k: note.k, key: note.key } } : {}) });
  if (note) for (const q of qs) if (q.key === note.key) q.fromNote = true;
  ui.recent[id] = [...recent, ...qs.map((q) => q.key).filter(Boolean)].slice(-RECENT_KEEP);
  // 처음 배우는 줄기(S().lesson)는 📖 이야기 대신 📚 단계식 배움 — 한 장씩 확인하며 간다
  const first = S().lesson ? 'lesson' : 'story';
  ui.round = { id, mode, qs, at: 0, correct: 0, missTags: [], answers: [], answered: false, seed, page: 0, phase: o.again ? 'retry' : mode === 'learn' ? first : 'q', wrong: o.again ? (o.wrong || []) : [] };
  if (o.again) renderRetry(id, o.wrong || []);
  else if (mode === 'learn') { if (S().lesson) renderLesson(id, seed, 0); else renderStory(id, seed); }
  else renderQuestion();
}

/**
 * 🤔 오답 노트 회차 — 노트마다 그 유형 한 문제(계산은 숫자만 다른 쌍둥이, ③⭐는 같은 문항). 개념 통과·👑은 안 건드린다.
 * 맞히면 노트에서 지워지고, 틀리면 내일 이후에 다시 나온다.
 */
function startNotesRound(list) {
  const base = (Date.now() % 1000000) | 0;
  const qs = [];
  const ids = [];
  const stale = [];
  list.forEach((x, i) => {
    let q = null;
    const sx = stemOf(x.id);
    for (let t = 0; sx && t < 6 && !q; t++) q = sx.gen.makeQuestion(x.id, x.note.k, base + i * 101 + t * 7919, { ...optsFor(sx.key), want: { k: x.note.k, key: x.note.key } });
    // 그 틀이 이제 없다(내용을 고쳐서) — 엉뚱한 문제를 맞히고 "고쳤다"가 되면 안 되니 노트를 지운다 (Codex 2차 #4)
    if (!q || q.key !== x.note.key) { stale.push(x); return; }
    q.fromNote = true;
    qs.push(q); ids.push(x.id);
  });
  if (stale.length) {
    updateMath((m) => { for (const x of stale) { const rec = m.concepts && m.concepts[x.id]; if (rec && Array.isArray(rec.notes)) rec.notes = rec.notes.filter((n) => n.key !== x.note.key); } })
      .then((m) => { ui.state = m; }).catch(() => {});
  }
  if (!qs.length) { renderLadder(ui.state); return; }
  ui.round = { id: null, mode: 'notes', qs, ids, at: 0, correct: 0, missTags: [], answers: [], answered: false, seed: base, phase: 'q' };
  renderQuestion();
}

/**
 * ☀️ 오늘의 수학 — 개념 편 하나(🔁 복습 차례가 있으면 그것, 없으면 ▶ 새 개념) → 🎲 섞어 풀기(아는 개념 3개 × 1문항 + 🤔 노트 1문항).
 * 흐름은 ui.daily에, 편은 평소처럼 ui.round에 — 🎒 다녀와도 편이 복원되고 흐름도 남는다. 사다리로 나가면 흐름은 끝.
 */
function startDaily() {
  const today = todayKey();
  const seed = (Date.now() % 1000000) | 0;
  const plan = dailyPlan(ui.state, today, ui.stem, seed);
  ui.daily = { plan, step: plan.roundId ? 'round' : 'mix', roundInfo: null };
  if (plan.roundId) startRound(plan.roundId, plan.roundMode);
  else startMixRound();
}

/**
 * 🎲 섞어 풀기 — 계획의 개념마다 약한 얼굴 순서로 문항 하나(첫 성공), 🤔 노트는 그 유형(want). 개념이 뒤섞인 편이라
 * 노트 회차와 같은 모양(ids)이다. 연습이라 통과·👑은 안 건드린다 — 결과 반영은 applyMixRound.
 */
function startMixRound() {
  const d = ui.daily;
  if (!d) { renderLadder(ui.state); return; }
  d.step = 'mix';
  const base = (Date.now() % 1000000) | 0;
  const qs = [];
  const ids = [];
  // 🤔 노트 문항의 틀은 같은 개념의 일반 문항이 피한다 — 같은 틀이 한 편에 두 번 나오면 하나 맞히고 하나 틀렸을 때 노트가 꼬인다 (Codex 3차 #3)
  const noteKeys = {};
  for (const x of d.plan.mix) if (x.note && x.note.key) (noteKeys[x.id] = noteKeys[x.id] || []).push(x.note.key);
  d.plan.mix.forEach((x, i) => {
    const sx = stemOf(x.id);
    if (!sx) return;
    const recent = ui.recent[x.id] || [];
    let q = null;
    if (x.note) {
      for (let t = 0; t < 6 && !q; t++) {
        const c = sx.gen.makeQuestion(x.id, x.note.k, base + i * 101 + t * 7919, { ...optsFor(sx.key), want: { k: x.note.k, key: x.note.key } });
        if (c && c.key === x.note.key) q = c;
      }
      if (!q) return; // 그 틀이 이제 없다 — 🤔 노트 회차가 정리한다
      q.fromNote = true;
    } else {
      const avoid = [...recent, ...(noteKeys[x.id] || [])];
      for (const k of x.kinds) { q = sx.gen.makeQuestion(x.id, k, base + i * 101, { ...optsFor(sx.key), recent: avoid }); if (q) break; }
      if (!q) return;
    }
    ui.recent[x.id] = [...recent, q.key].filter(Boolean).slice(-RECENT_KEEP);
    qs.push(q); ids.push(x.id);
  });
  // 문항이 하나도 안 만들어져도(있을 일이 거의 없다) 빈 편으로 같은 finishRound를 탄다 — 완주 기록·보상·저장 실패 재시도가 한 경로 (Codex 3차 #7)
  ui.round = { id: null, mode: 'mix', qs, ids, at: 0, correct: 0, missTags: [], answers: [], answered: false, seed: base, phase: 'q' };
  if (!qs.length) { finishRound(); return; }
  renderQuestion();
}

/** ☀️ 완주 카드 — 개념 편 결과 + 🎲 섞어 풀기 결과 + 보상(첫 완주 보너스) */
function renderDailyDone(state, { g, c, daily, result, offer = null, catches = 0, gold = false, bonus = null, ticket = 0 }) {
  const m = clearMain();
  const d = ui.daily;
  const info = d && d.roundInfo;
  const card = el('section', 'math-card math-result math-daily-done');
  card.appendChild(el('h2', '', '☀️ 오늘의 수학 끝!'));
  const ul = el('ul', 'math-daily-list');
  if (info) ul.appendChild(el('li', '', `${info.mode === 'review' ? '🔁' : '▶'} ${nameOf(info.id)} — ${info.passed ? '✅ 다 맞았어요' : `${info.correct}/${info.total} 맞았어요`}`));
  if (result && result.total) ul.appendChild(el('li', '', `🎲 섞어 풀기 — ${result.total}개 중 ${result.ok}개 맞았어요${result.ok < result.total ? ' · 헷갈린 유형은 🤔 노트에 남겨 다음에 다시 풀어요' : ''}`));
  card.appendChild(ul);
  card.appendChild(el('p', 'math-p', daily && daily.first
    ? '오늘 할 것을 다 했어요. 내일도 ☀️ 하나면 돼요.'
    : gold ? '오늘 두 번째 완주 — 이번엔 섞어 풀기를 다 맞혔네요!' : '오늘은 벌써 완주했던 거라 완주 보너스는 없어요 — 그래도 푼 만큼은 쌓였어요.'));
  card.appendChild(el('p', 'math-reward', `⚡+${g.gained} 💰+${c}${catches ? ` 🎯 몬스터볼 ${catches}개!` : ''}${gold ? ' 🌟 황금 몬스터볼 +1!' : ''}${daily && daily.first ? ' ☀️ 첫 완주 보너스!' : ''}${g.leveledUp ? ` 🎉 Lv.${g.to}!` : ''}`));
  if (gold) card.appendChild(el('p', 'math-p', '🌟 섞어 풀기를 다 맞혀서 황금 몬스터볼! 잡힐 확률이 2배 — 🎯 잡기에서 써 봐요'));
  if (bonus) card.appendChild(el('p', 'math-bonus-got', `✨ 오늘의 보너스 ${bonusText(bonus)} 받았어요!`));
  ticketNote(state, ticket).then((t) => { if (t && card.isConnected) card.appendChild(t); }); // 🎟️ 다음 영상까지 (수학도 채운다)
  if (offer) card.appendChild(offer); // ❓ 섞어 풀기에서 틀린 문제를 아빠에게
  const b = el('button', 'btn btn-primary btn-big-wide', '사다리로');
  b.type = 'button';
  b.addEventListener('click', () => renderLadder(state));
  card.appendChild(b);
  m.appendChild(card);
}

/**
 * 🤔 되짚기 — 틀려서 다시 할 때. 같은 📖를 통째로 또 읽히면 "피자 얘기만 반복"이 된다(아버님, 2026-09-20).
 * 핵심 한 줄(idea)과 방금 헷갈린 것만 보여 주고 바로 문제로. 이야기는 원하면 다시 읽는다.
 */
function renderRetry(id, wrong) {
  const m = clearMain();
  const c = conceptOf(id);
  const card = el('section', 'math-card math-story');
  card.appendChild(el('div', 'math-eyebrow', `🤔 한 번 더 · ${nameOf(id)}`));
  card.appendChild(el('h2', '', wrong.length ? '방금 틀린 문제를 다시 봐요' : '이것만 기억하고 다시 해 봐요'));
  if (c && c.idea) {
    const idea = el('p', 'math-idea big');
    idea.appendChild(document.createTextNode('💡 '));
    idea.appendChild(richNode(c.idea));
    card.appendChild(idea);
  }
  // 📖 오답 노트 — 틀린 문제마다 문제·내 답·풀이를 접어서 (진우: "왜 틀렸는지 한 문장 말고")
  for (const w of wrong) {
    const det = document.createElement('details');
    det.className = 'math-wrongnote';
    const sum = document.createElement('summary');
    sum.appendChild(el('span', 'k', KIND_LABEL[w.q.kind] || ''));
    const qt = el('span', 'qt'); qt.appendChild(richNode(w.q.q.length > 60 ? w.q.q.slice(0, 60) + '…' : w.q.q)); sum.appendChild(qt);
    det.appendChild(sum);
    const body = el('div', 'body');
    if (w.q.expr) { const ex = el('p', 'math-expr small'); ex.appendChild(richNode(w.q.expr)); body.appendChild(ex); }
    body.appendChild(solveCard(w.q, w.chosen));
    det.appendChild(body);
    card.appendChild(det);
  }
  card.appendChild(el('p', 'math-p muted', '이번엔 다른 이야기로 물어볼게요.'));
  const go = el('button', 'btn btn-primary btn-big-wide', '문제 다시 풀기 →');
  go.type = 'button';
  go.addEventListener('click', () => { if (ui.round) ui.round.phase = 'q'; renderQuestion(); });
  card.appendChild(go);
  const read = el('button', 'btn btn-big-wide', S().lesson ? '📚 다시 배우기' : '📖 이야기 다시 읽기');
  read.type = 'button';
  read.addEventListener('click', () => { if (!ui.round) return; if (S().lesson) { ui.round.phase = 'lesson'; ui.round.page = 0; renderLesson(id, ui.round.seed, 0); } else { ui.round.phase = 'story'; renderStory(id, ui.round.seed); } });
  card.appendChild(read);
  m.appendChild(card);
}

function renderStory(id, seed) {
  const m = clearMain();
  const st = G().conceptStory(id, seed, optsFor());
  const c = conceptOf(id);
  const card = el('section', 'math-card math-story');
  card.appendChild(el('div', 'math-eyebrow', `📖 개념 이야기 · ${c ? gradeLabel(c.grade) : ''} ${nameOf(id)}`));
  card.appendChild(el('h2', '', st.title));
  card.appendChild(storyBody(st.text));
  // ✋ 해 보기 — 그림을 읽는 것이 개념인 자리(분수의 뜻·같은 분모)에는 읽기 전에 손으로 만든다: 막대를 탭해서 n/d 칠하기
  if (SHADE_IDS.has(id)) card.appendChild(shadeActivity(seed));
  if (c && c.idea) {
    const idea = el('p', 'math-idea');
    idea.appendChild(document.createTextNode('💡 '));
    idea.appendChild(richNode(c.idea));
    card.appendChild(idea);
  }
  const b = el('button', 'btn btn-primary btn-big-wide', '문제 풀어 볼게요 →');
  b.type = 'button';
  b.addEventListener('click', () => { if (ui.round) ui.round.phase = 'q'; renderQuestion(); });
  card.appendChild(b);
  m.appendChild(card);
}

const SHADE_IDS = new Set(['frac.mean', 'frac.same']);
/** 🟦 "3/8만큼 칠해 봐요" — 확인은 칸 수로. 통과 여부는 편에 영향 없음 (배움 활동). 씨앗으로 같은 편이면 같은 분수 */
function shadeActivity(seed) {
  const r = rng(seed + 7);
  const d = [4, 5, 6, 8][Math.floor(r() * 4)];
  const n = 1 + Math.floor(r() * (d - 1));
  const box = el('div', 'math-lesson-check');
  box.appendChild(el('div', 'math-solve-h', '✋ 해 보기'));
  const qt = el('p', 'math-qt'); qt.appendChild(richNode(`막대를 눌러서 ${n}/${d}만큼 칠해 봐요.`)); box.appendChild(qt);
  const w = shadeWidget({ d });
  box.appendChild(w.el);
  const fb = el('div', 'math-feedback');
  const ok = el('button', 'btn btn-accent btn-big-wide', '다 칠했어요!');
  ok.type = 'button';
  ok.addEventListener('click', () => {
    fb.innerHTML = '';
    if (w.count() === n) { w.lock(); ok.disabled = true; sfx.success(); const p = el('p', 'math-fb ok'); p.appendChild(richNode(`맞아요! ${d}칸 중 ${n}칸 — 그게 바로 ${n}/${d}예요 🎉`)); fb.appendChild(p); }
    else { sfx.wrong(); const p = el('p', 'math-fb no'); p.appendChild(richNode(`지금은 ${d}칸 중 ${w.count()}칸이에요. ${n}/${d}은 ${d}칸 중 **${n}칸**이에요.`)); fb.appendChild(p); }
  });
  box.appendChild(ok);
  box.appendChild(fb);
  return box;
}

// ── 📚 단계식 배움 (처음 배우는 줄기 — 음수)

/**
 * 한 장 = 설명(say) + ✋ 확인(check). 확인은 고르기(ok/no) 또는 **끌어 보기**(walk: [출발, 이동] — 수직선 위 말을 답 자리로 옮긴다).
 * 확인을 맞혀야 다음 장이 열린다 (틀리면 why를 보고 다시 — 채점이 아니라 배움이다). 마지막 장에 📏 한 줄 요약 → 문항으로.
 * 상태는 ui.round.page 하나 — 🎒·📊 다녀오면 그 장을 다시 그린다(확인은 다시 한다).
 * 구체(만지기) → 그림 → 기호: 글로 "왼쪽으로 5칸"을 읽는 것과 손가락으로 말을 5칸 끄는 것은 다르다 (2026-09-21, 만지는 그림 1차).
 */
function renderLesson(id, seed, page) {
  const r = ui.round;
  const L = G().lessonOf ? G().lessonOf(id, seed, optsFor()) : null;
  if (!L || !L.pages.length) { if (r) r.phase = 'q'; renderQuestion(); return; }
  page = Math.max(0, Math.min(L.pages.length - 1, page | 0));
  if (r) { r.phase = 'lesson'; r.page = page; }
  if (/[?&]nosw=1/.test(location.search)) { window.__mathLesson = L; window.__mathRound = r; } // 헤드리스 검증용 (개발 모드에서만)
  const m = clearMain();
  const c = conceptOf(id);
  const n = L.pages.length; const p = L.pages[page];
  const card = el('section', 'math-card math-story math-lesson');
  const top = el('div', 'math-q-top');
  top.appendChild(el('span', 'math-eyebrow', `📚 배우기 · ${c ? gradeLabel(c.grade) : ''} ${nameOf(id)}`));
  top.appendChild(el('span', 'math-kind', `${page + 1} / ${n}`));
  card.appendChild(top);
  const dots = el('div', 'math-lesson-dots');
  for (let i = 0; i < n; i++) dots.appendChild(el('span', 'dot' + (i < page ? ' done' : i === page ? ' now' : '')));
  card.appendChild(dots);
  if (page === 0) card.appendChild(el('h2', '', L.title));
  card.appendChild(storyBody(p.say));

  const next = el('button', 'btn btn-primary btn-big-wide', page + 1 < n ? '다음 장 →' : '문제 풀어 볼게요 →');
  next.type = 'button';
  next.addEventListener('click', () => {
    if (page + 1 < n) renderLesson(id, seed, page + 1);
    else { if (ui.round) ui.round.phase = 'q'; renderQuestion(); }
  });
  if (p.check) {
    next.disabled = true;
    card.appendChild(checkBlock(p.check, seed + page * 31, () => { next.disabled = false; focusQuiet(next); }));
  }
  if (page + 1 === n) {
    const rule = el('p', 'math-idea big');
    rule.appendChild(document.createTextNode('📏 한 줄로: '));
    rule.appendChild(richNode(L.rule));
    card.appendChild(rule);
  }
  card.appendChild(next);
  if (page > 0) {
    const back = el('button', 'btn btn-big-wide', '← 앞 장');
    back.type = 'button';
    back.addEventListener('click', () => renderLesson(id, seed, page - 1));
    card.appendChild(back);
  }
  m.appendChild(card);
}

const fmtInt = (v) => String(v).replace('-', '−');

/** ✋ 확인 — 고르기 또는 끌어 보기. 맞히면 onPass(). 틀리면 why를 보여 주고 다시 해 본다 */
function checkBlock(check, seed, onPass) {
  const box = el('div', 'math-lesson-check');
  box.appendChild(el('div', 'math-solve-h', '✋ 확인해 봐요'));
  const qt = el('p', 'math-qt'); qt.appendChild(richNode(check.q)); box.appendChild(qt);
  const fb = el('div', 'math-feedback');
  let passed = false;
  const pass = (msg) => { passed = true; fb.innerHTML = ''; fb.appendChild(el('p', 'math-fb ok', msg)); sfx.success(); onPass(); };
  const fail = () => { fb.innerHTML = ''; const p = el('p', 'math-fb no'); p.appendChild(richNode(`아직이에요 — ${check.why || '다시 생각해 봐요.'}`)); fb.appendChild(p); sfx.wrong(); };
  if (Array.isArray(check.walk) && check.walk.length === 2) {
    // 🚶 끌어 보기: 말을 답 자리로. 정답은 출발 + 이동 (사람이 쓴 ok와 같은지는 checkContent가 본다)
    const [start, delta] = check.walk.map(Number); const end = start + delta; const [lo, hi] = walkRange(start, end);
    const w = walkWidget({ start, lo, hi });
    box.appendChild(el('p', 'math-hint', '✏️ 말을 손가락으로 끌거나, 눈금을 누르거나, ◀▶로 옮겨요'));
    box.appendChild(w.el);
    const ok = el('button', 'btn btn-accent btn-big-wide', '여기예요!');
    ok.type = 'button';
    ok.addEventListener('click', () => {
      if (passed) return;
      if (w.get() === end) { w.lock(); ok.disabled = true; pass(`맞아요! ${fmtInt(start)}에서 ${delta > 0 ? '오른쪽' : '왼쪽'}으로 ${Math.abs(delta)}칸 → ${fmtInt(end)} 🎉`); }
      else fail();
    });
    box.appendChild(ok);
  } else {
    const list = el('div', 'math-choices');
    const opts = shuffle(rng(seed), [{ text: check.ok, ok: true }, ...(check.no || []).map((t) => ({ text: t, ok: false }))]);
    opts.forEach((ch, i) => {
      const b = el('button', 'math-choice');
      b.type = 'button';
      b.appendChild(el('span', 'math-choice-no', ['①', '②', '③', '④'][i]));
      const t = el('span', 'math-choice-text'); t.appendChild(richNode(ch.text)); b.appendChild(t);
      b.addEventListener('click', () => {
        if (passed) return;
        if (ch.ok) { b.classList.add('ok'); for (const x of list.querySelectorAll('.math-choice')) x.disabled = true; pass('맞아요! 👍'); }
        else { b.classList.add('no'); b.disabled = true; fail(); }
      });
      list.appendChild(b);
    });
    box.appendChild(list);
  }
  box.appendChild(fb);
  return box;
}

const KIND_LABEL = { calc: '① 계산', misread: '② 누가 틀렸을까', why: '③ 왜 그럴까', special: '⭐ 특별 문제' };

// ── 🎯 감 잡기 · 🙈 틀린 이유 (③, 2026-09-21)
//
// 감 잡기: 식이 있는 문항은 계산하기 전에 "답이 어느 쪽일까"를 먼저 고른다 — 음수는 부호(음수/0/양수), 분수는 크기(1/2 미만·1/2~1·1 초과).
//   답을 미리 알려 주지 않는다(고른 뒤 "이제 계산해 봐요"만) — 알려 주면 보기 절반이 지워져 계산 문항이 쉬워진다. 맞았는지는 답한 뒤에 같이 보여 준다.
//   수 감각을 만들고, 나중에 "감은 맞는데 계산이 틀리는지 / 감부터 틀리는지"를 📊에서 가른다.
// 틀린 이유: 틀린 직후 아이가 "실수로 눌렀어요 / 헷갈렸어요 / 잘 몰랐어요"를 고른다. 실수는 오개념·오답 노트에 안 쌓인다(mathprog).
//   아이가 자기 상태를 말하는 것(메타인지) 자체가 공부다. 진단(diag)에서는 둘 다 안 묻는다 — 처음 보는 개념이라 뜻이 없다.
const SENSE = {
  sign: { title: '답은 어느 쪽일까요?', options: ['음수 (0보다 작아요)', '0', '양수 (0보다 커요)'], nouns: ['음수', '0', '양수'], bucket: (v) => (v < 0 ? 0 : v === 0 ? 1 : 2) },
  size: { title: '답은 얼마쯤일까요?', options: ['1/2보다 작아요', '1/2과 1 사이', '1보다 커요'], nouns: ['1/2보다 작은 수', '1/2과 1 사이의 수', '1보다 큰 수'], bucket: (v) => (v < 0.5 ? 0 : v < 1 ? 1 : 2) },
};
const WHY = [['s', '🙈 실수로 눌렀어요'], ['c', '🤔 헷갈렸어요'], ['u', '😶 잘 몰랐어요']];

/** 이 문항의 감 잡기 — { kind, ok(정답 칸), options, title } 또는 null (식이 없거나, 경계값이거나, 진단) */
/** 감 잡기·🙈 이유·쌍둥이가 없는 가벼운 편 — 📏 진단(처음 보는 개념)과 ❓ 답장 뒤 풀기(한 문제만 가볍게) */
const light = (r) => !!r && (r.mode === 'diag' || r.mode === 'ask');

function senseOf(q) {
  if (!q || !q.expr || light(ui.round)) return null;
  const okCh = q.choices.find((x) => x.ok);
  const val = G().valueOf ? G().valueOf(okCh && okCh.text) : null;
  if (!val || !val.d) return null;
  const v = val.n / val.d;
  const kind = S().key === 'negative' ? 'sign' : 'size';
  if (kind === 'size' && (v === 0.5 || v === 1 || v <= 0)) return null; // 경계에 걸리면 감 잡기가 함정이 된다
  const def = SENSE[kind];
  return { kind, ok: def.bucket(v), options: def.options, nouns: def.nouns, title: def.title };
}

/** 🎯 감 잡기 블록 — 고르면 r.senses[at]에 두고 문항을 다시 그린다(보기가 열린다) */
function senseBlock(sense, onPick) {
  const box = el('div', 'math-sense');
  box.appendChild(el('div', 'math-solve-h', `🎯 감 잡기 — 계산하기 전에, ${sense.title}`));
  const row = el('div', 'math-sense-row');
  sense.options.forEach((t, i) => {
    const b = el('button', 'btn math-sense-btn');
    b.type = 'button';
    b.appendChild(richNode(t));
    b.addEventListener('click', () => onPick(i));
    row.appendChild(b);
  });
  box.appendChild(row);
  box.appendChild(el('p', 'math-hint', '✏️ 대충 짐작만 해도 돼요. 고르면 보기가 열려요.'));
  return box;
}

/**
 * 문항 그리기. `restore`면 이미 답한 문항을 채점 없이 다시 그린다 — 🎒·📊를 보고 돌아왔을 때
 * 풀이 카드와 쌍둥이 버튼이 그대로 있어야 한다 (Codex 2026-09-21 #4: 전에는 바로 다음 문항으로 넘어가 풀이를 건너뛰었다).
 */
function renderQuestion(restore = false) {
  const r = ui.round;
  if (!r) return;
  if (/[?&]nosw=1/.test(location.search)) window.__mathRound = r; // 헤드리스 검증용 (개발 모드에서만)
  const m = clearMain();
  const q = r.qs[r.at];
  if (!restore) { r.answered = false; r.chosenIdx = -1; }
  const card = el('section', 'math-card math-q');

  const top = el('div', 'math-q-top');
  top.appendChild(el('span', 'math-eyebrow', r.mode === 'diag' ? `📏 진단 ${r.at + 1} / ${r.qs.length}` : r.mode === 'notes' ? `🤔 오답 노트 ${r.at + 1} / ${r.qs.length} · ${nameOf(q.concept)}` : r.mode === 'mix' ? `🎲 섞어 풀기 ${r.at + 1} / ${r.qs.length}` : r.mode === 'ask' ? `❓ 답장 뒤 풀어보기 · ${nameOf(q.concept)}` : `${nameOf(r.id)} · ${r.at + 1} / ${r.qs.length}`));
  top.appendChild(el('span', 'math-kind', KIND_LABEL[q.kind] || ''));
  card.appendChild(top);
  if (q.fromNote) card.appendChild(el('p', 'math-note-badge', '🤔 지난번에 틀렸던 유형이에요 — 이번엔 맞혀 봐요'));

  const qt = el('p', 'math-qt');
  qt.appendChild(richNode(q.q));
  card.appendChild(qt);
  if (q.figure) card.appendChild(svgBox(q.figure));
  if (q.expr) { const ex = el('p', 'math-expr'); ex.appendChild(richNode(q.expr)); card.appendChild(ex); }

  // 🎯 감 잡기 — 아직 안 골랐으면 보기 대신 감 잡기부터 (답한 뒤 복원이면 건너뛴다)
  const sense = senseOf(q);
  r.senses = r.senses || {};
  if (sense && r.senses[r.at] === undefined && !(restore && r.answered)) {
    card.appendChild(senseBlock(sense, (i) => { r.senses[r.at] = i; renderQuestion(true); }));
    m.appendChild(card);
    return;
  }
  if (sense && r.senses[r.at] !== undefined) {
    const s = el('p', 'math-sense-picked'); s.appendChild(document.createTextNode('🎯 감 잡기: ')); s.appendChild(richNode(sense.options[r.senses[r.at]])); s.appendChild(document.createTextNode(' — 이제 정확히 계산해 봐요')); card.appendChild(s);
  }
  if (q.hint) card.appendChild(el('p', 'math-hint', `✏️ ${q.hint}`));

  const list = el('div', 'math-choices');
  q.choices.forEach((ch, i) => {
    const b = el('button', 'math-choice');
    b.type = 'button';
    b.dataset.i = String(i);
    b.appendChild(el('span', 'math-choice-no', ['①', '②', '③', '④'][i]));
    const t = el('span', 'math-choice-text');
    t.appendChild(richNode(ch.text));
    b.appendChild(t);
    b.addEventListener('click', () => answer(i, list, card));
    list.appendChild(b);
  });
  card.appendChild(list);
  card.appendChild(el('div', 'math-feedback'));
  m.appendChild(card);
  if (restore && r.answered && r.chosenIdx >= 0) paintAnswer(r.chosenIdx, list, card, true);
}

/** 답을 고름 — 채점(한 번만)하고 그린다 */
function answer(i, list, card) {
  const r = ui.round;
  if (!r || r.answered) return; // 두 번 누르면 두 번 세지 않는다
  r.answered = true;
  r.chosenIdx = i;
  const q = r.qs[r.at];
  const ch = q.choices[i];
  if (ch.ok) { r.correct++; sfx.success(); } else { sfx.wrong(); if (ch.tag) r.missTags.push(ch.tag); }
  const sense = senseOf(q);
  const picked = r.senses && r.senses[r.at];
  r.answers.push({
    concept: q.concept, correct: !!ch.ok, kind: q.kind, chosen: ch.text, ...(ch.ok || !ch.tag ? {} : { tag: ch.tag }), // 얼굴·오개념까지 — 📒 일지용
    ...(sense && picked !== undefined ? { sn: picked === sense.ok ? 1 : 0 } : {}), // 🎯 감 잡기가 맞았나
  });
  paintAnswer(i, list, card, false);
}

/** 저장할 문항 기록에 🎯 감 잡기(sn)·🙈 이유(w)를 붙인다 — 실수(w:s)는 mathprog가 오개념·노트에서 뺀다 */
const extraQ = (a) => ({ ...(a.sn === undefined ? {} : { sn: a.sn }), ...(a.w ? { w: a.w } : {}) });

/** 🙈 틀린 이유 고르기 — 고를 때까지 다음 버튼이 잠긴다. 실수면 이 문항의 오개념 이름표를 거둔다 */
function whyBlock(a, next, onDone) {
  const box = el('div', 'math-why');
  box.appendChild(el('div', 'math-solve-h', '🙈 왜 틀렸을까요? 솔직하게 골라요 — 실수면 노트에 안 남겨요'));
  const row = el('div', 'math-why-row');
  for (const [code, label] of WHY) {
    const b = el('button', 'btn math-why-btn', label);
    b.type = 'button';
    b.addEventListener('click', () => {
      a.w = code;
      if (code === 's' && a.tag) { const r = ui.round; const k = r.missTags.lastIndexOf(a.tag); if (k >= 0) r.missTags.splice(k, 1); }
      box.replaceWith(whyPicked(a));
      next.disabled = false;
      onDone && onDone();
    });
    row.appendChild(b);
  }
  box.appendChild(row);
  return box;
}
const WHY_SAID = { s: '🙈 실수라고 했어요 — 오답 노트에는 안 남겨요. 비슷한 문제로 바로 확인해 봐요.', c: '🤔 헷갈렸다고 했어요 — 풀이를 읽고 비슷한 문제로 확인해요.', u: '😶 잘 몰랐다고 했어요 — 괜찮아요, 풀이를 천천히 읽어요.' };
function whyPicked(a) {
  return el('p', 'math-why-picked', WHY_SAID[a.w] || '');
}

// ───────────────────── ❓ 아빠에게 묻기 (2026-09-21, 아버님 제안) ─────────────────────
//
// 아이는 "무엇을 모르는지"를 글로 못 쓴다 → 문맥(개념·문항·식·내 답·정답·오개념)은 앱이 담고 아이는 ❓ 한 번 + 한마디(선택).
// 묻는 자리: 😶 잘 몰랐어요 직후 · 🤔 노트 문항을 또 틀렸을 때 · 편 결과 카드. 하루 ASK_DAILY_MAX개, 같은 틀은 하나.
// 답장(📬)은 사다리 위에 먼저 뜨고, 읽어야 ☀️가 열린다(아버님 결정). 읽고 😄 이해했어요 → 같은 틀 문제 하나 → 맞히면 보상 + 🤔 노트 지움.

/** ❓ 제안 블록 — 틀린 문항에서 "잘 몰랐어요"를 골랐거나 🤔 노트 문항을 또 틀렸을 때만. 이미 보냈으면 보냈다는 줄 */
function askOffer(q, a) {
  const r = ui.round;
  if (!r || light(r) || !a || a.correct || a.w === 's' || !(a.w === 'u' || q.fromNote) || !q.key) return null;
  if (a.asked) return el('p', 'math-ask-sent', `📮 아빠에게 보냈어요 (❓${a.asked}) — 답장이 오면 📬로 알려 줄게요`);
  const box = el('div', 'math-ask');
  box.appendChild(el('p', 'math-ask-lead', q.fromNote ? '❓ 아직 헷갈리면 아빠에게 물어볼까요? 문제는 앱이 그대로 보내요.' : '❓ 잘 몰랐다면 아빠에게 물어볼래요? 문제는 앱이 그대로 보내요.'));
  const b = el('button', 'btn math-ask-btn', '❓ 아빠에게 물어보기');
  b.type = 'button';
  b.addEventListener('click', () => { box.replaceWith(askForm(askContext(q, a), (res) => { if (res.ok) a.asked = res.ask.no; })); });
  box.appendChild(b);
  return box;
}

/** 📮 보내기 폼 — 한마디는 선택. 저장은 updateMath 한 트랜잭션(하루 개수·중복은 저장소 상태로 판정) */
function askForm(ctx, onSent) {
  const box = el('div', 'math-ask math-ask-form');
  box.appendChild(el('p', 'math-ask-lead', '한마디 덧붙일래요? 안 써도 돼요.'));
  const ta = el('textarea', 'math-ask-input');
  ta.rows = 2; ta.maxLength = 200; ta.placeholder = '예) 왜 분모는 안 더해요?';
  box.appendChild(ta);
  const row = el('div', 'math-actions');
  const send = el('button', 'btn btn-primary', '📮 보내기');
  send.type = 'button';
  const skip = el('button', 'btn', '안 할래요');
  skip.type = 'button';
  skip.addEventListener('click', () => box.remove());
  send.addEventListener('click', async () => {
    send.disabled = true; skip.disabled = true;
    const today = todayKey();
    let res = null;
    try { ui.state = await updateMath((m) => { res = addAsk(m, ctx, today, ta.value); }); }
    catch (err) {
      send.disabled = false; skip.disabled = false;
      box.appendChild(el('p', 'math-note', `저장을 못 했어요 — 한 번 더 눌러 주세요 (${String((err && err.message) || err)})`));
      return;
    }
    const msg = res.ok ? `📮 아빠에게 보냈어요 (❓${res.ask.no}). 답장이 오면 📬로 알려 줄게요.`
      : res.reason === 'dup' ? '이미 물어본 문제예요 — 아빠 답장을 기다려요.'
        : `오늘은 ${ASK_DAILY_MAX}개를 다 물어봤어요. 내일 또 물어봐요.`;
    box.replaceWith(el('p', 'math-ask-sent', msg));
    if (onSent) onSent(res);
  });
  row.appendChild(send); row.appendChild(skip);
  box.appendChild(row);
  return box;
}

/** 편 결과 카드의 ❓ — 틀린 문항(실수 제외, 아직 안 보낸 것) 중 하나를 골라 보낸다 */
function askOfferForRound(r, state, today) {
  if (!r || light(r) || r.mode === 'notes') return null;
  if (askedToday(state, today) >= ASK_DAILY_MAX) return null;
  const wrongs = r.answers.map((a, i) => ({ a, q: r.qs[i] })).filter((x) => x.a && !x.a.correct && x.a.w !== 's' && !x.a.asked && x.q && x.q.key && !pendingAskFor(state, x.q.concept, x.q.key));
  if (!wrongs.length) return null;
  const box = el('div', 'math-ask');
  box.appendChild(el('p', 'math-ask-lead', '❓ 아빠에게 물어볼 게 있어요? 틀린 문제를 골라요 — 문제는 앱이 그대로 보내요.'));
  for (const x of wrongs) {
    const b = el('button', 'btn math-ask-btn', `❓ ${KIND_LABEL[x.q.kind] || ''} · ${String(x.q.q).slice(0, 26)}${String(x.q.q).length > 26 ? '…' : ''}`);
    b.type = 'button';
    b.addEventListener('click', () => { box.replaceWith(askForm(askContext(x.q, x.a), (res) => { if (res.ok) x.a.asked = res.ask.no; })); });
    box.appendChild(b);
  }
  return box;
}

/** 배포로 온 답장(coach/math/replies.json)을 붙인다 — 이미 붙은 글은 건너뛰어 여러 번 불려도 안전. 못 받으면 그대로 */
async function syncMathReplies(state) {
  let list = [];
  try {
    const res = await fetch('./coach/math/replies.json');
    if (!res.ok) return state;
    list = await res.json();
  } catch { return state; }
  if (!Array.isArray(list) || !list.length) return state;
  const probe = JSON.parse(JSON.stringify(state));
  const todo = list.filter((e) => e && applyReply(probe, e.no, e.text));
  if (!todo.length) return state;
  try { return await updateMath((m) => { for (const e of todo) applyReply(m, e.no, e.text); }); } catch { return state; }
}

/** 📬 답장 화면 — 문맥(문제·내 답·정답·내 한마디) + 💬 아빠 답장(그림 지시문 가능) → 😄 이해했어요 / 😶 아직 모르겠어요 */
async function renderReply(ask, note = '') {
  ui.daily = null;
  const run = ++ui.run;
  try { ui.state = await updateMath((s) => { markAskRead(s, ask.id); }); } catch { /* 읽음 표시는 다음에 */ }
  if (run !== ui.run) return;
  ask = ((ui.state && ui.state.asks) || []).find((x) => x && x.id === ask.id) || ask; // 다른 창에서 답장이 더 붙었을 수 있다 — 최신으로 (Codex 4차 #5)
  const seenT = (ask.replies && ask.replies.length) ? ask.replies[ask.replies.length - 1].t : 0;
  const m = clearMain();
  const card = el('section', 'math-card math-reply');
  card.appendChild(el('div', 'math-eyebrow', `📬 아빠의 답장 · ❓${ask.no} · ${nameOf(ask.concept)}`));
  if (note) card.appendChild(el('p', 'math-ask-sent', note));
  const ctx = el('div', 'math-reply-ctx');
  const qt = el('p', 'math-qt'); qt.appendChild(richNode(ask.q)); ctx.appendChild(qt);
  if (ask.expr) { const ex = el('p', 'math-expr'); ex.appendChild(richNode(ask.expr)); ctx.appendChild(ex); }
  const my = el('p', 'math-reply-my'); my.appendChild(document.createTextNode('❌ 내 답: ')); my.appendChild(richNode(ask.my || '(없음)')); ctx.appendChild(my);
  const an = el('p', 'math-reply-ans'); an.appendChild(document.createTextNode('✔ 정답: ')); an.appendChild(richNode(ask.ans)); ctx.appendChild(an);
  if (ask.kid) ctx.appendChild(el('p', 'math-reply-kid', `🙋 내가 물은 것: "${ask.kid}"`));
  card.appendChild(ctx);
  const replies = ask.replies || [];
  replies.forEach((rp, i) => {
    const box = el('div', 'math-reply-body');
    box.appendChild(el('div', 'math-solve-h', i === 0 ? '💬 아빠' : `💬 아빠 — ${i + 1}번째 답장`));
    box.appendChild(storyBody(rp.text));
    card.appendChild(box);
    const ag = (ask.again || [])[i];
    if (ag && i < replies.length - 1) card.appendChild(el('p', 'math-reply-kid', `🙋 나: 아직 모르겠어요${ag.kid ? ` — "${ag.kid}"` : ''}`));
  });
  if (!replies.length) card.appendChild(el('p', 'math-p', '답장 글이 비어 있어요 — 아빠에게 말해 주세요.'));

  const row = el('div', 'math-actions');
  const yes = el('button', 'btn btn-primary btn-big-wide', '😄 이해했어요');
  yes.type = 'button';
  const no = el('button', 'btn btn-big-wide', '😶 아직 모르겠어요');
  no.type = 'button';
  yes.addEventListener('click', async () => {
    yes.disabled = true; no.disabled = true;
    let res = false;
    try { ui.state = await updateMath((s) => { res = decideAsk(s, ask.id, true, '', seenT); }); }
    catch (err) { yes.disabled = false; no.disabled = false; card.appendChild(el('p', 'math-note', `저장을 못 했어요 — 한 번 더 (${String((err && err.message) || err)})`)); return; }
    if (res === 'stale') { renderReply(ask, '📬 그 사이에 아빠가 답장을 더 보냈어요 — 이것도 읽어 봐요'); return; }
    if (!res) { nextReplyOrLadder(); return; } // 이미 정해진 질문(다른 창에서) — 조용히 다음으로
    row.replaceWith(askTryOffer(ask));
  });
  no.addEventListener('click', () => { row.replaceWith(againForm(ask, seenT)); });
  if (ask.status === 'understood') {
    // 이미 "이해했어요"라고 한 뒤 다시 온 것(문제를 틀리고 "📬 답장 다시 보기") — 😄 대신 🔁 풀어보기, 😶는 되물음으로 (Codex 4차 #2)
    const again = el('button', 'btn btn-primary btn-big-wide', '🔁 다시 풀어보기');
    again.type = 'button';
    again.addEventListener('click', () => startAskTry(ask));
    row.appendChild(again); row.appendChild(no);
  } else if (ask.status === 'answered') {
    row.appendChild(yes); row.appendChild(no);
  } else {
    const back = el('button', 'btn btn-primary btn-big-wide', '사다리로'); // fixed·again·closed — 읽기만
    back.type = 'button';
    back.addEventListener('click', () => renderLadder(ui.state));
    row.appendChild(back);
  }
  card.appendChild(row);
  m.appendChild(card);
}

/** 😶 아직 모르겠어요 — 한마디(선택)와 함께 다시 아빠에게 */
function againForm(ask, seenT = undefined) {
  const box = el('div', 'math-ask math-ask-form');
  box.appendChild(el('p', 'math-ask-lead', '어디가 모르겠어요? 한마디 덧붙일래요? 안 써도 돼요.'));
  const ta = el('textarea', 'math-ask-input');
  ta.rows = 2; ta.maxLength = 200; ta.placeholder = '예) 조각 크기가 뭐예요?';
  box.appendChild(ta);
  const row = el('div', 'math-actions');
  const send = el('button', 'btn btn-primary btn-big-wide', '📮 아빠에게 다시 보내기');
  send.type = 'button';
  send.addEventListener('click', async () => {
    send.disabled = true;
    let res = false;
    try { ui.state = await updateMath((s) => { res = decideAsk(s, ask.id, false, ta.value, seenT); }); }
    catch (err) { send.disabled = false; box.appendChild(el('p', 'math-note', `저장을 못 했어요 — 한 번 더 (${String((err && err.message) || err)})`)); return; }
    // 전이가 실제로 됐을 때만 "보냈어요" — 안 됐는데 보냈다고 하면 아이의 메모가 조용히 사라진다 (Codex 4차 #2)
    if (res === 'stale') { renderReply(ask, '📬 그 사이에 아빠가 답장을 더 보냈어요 — 이것도 읽어 봐요'); return; }
    if (!res) { box.replaceWith(afterReplyRow('이 질문은 벌써 끝났어요 — 새로 물어보려면 문제에서 ❓를 눌러요.')); return; }
    box.replaceWith(afterReplyRow('📮 아빠에게 다시 보냈어요. 답장이 오면 📬로 알려 줄게요.'));
  });
  row.appendChild(send);
  box.appendChild(row);
  return box;
}

/** 😄 뒤 — 같은 틀 문제 하나 권유 */
function askTryOffer(ask) {
  const box = el('div', 'math-ask');
  box.appendChild(el('p', 'math-ask-lead', `😄 좋아요! 그럼 이 유형 문제 하나 풀어볼래요? 맞히면 ⚡${ASK_REWARD.xp} 💰${ASK_REWARD.coin} — 🤔 노트에서도 지워져요.`));
  const row = el('div', 'math-actions');
  const go = el('button', 'btn btn-primary btn-big-wide', '🔁 풀어보기');
  go.type = 'button';
  go.addEventListener('click', () => startAskTry(ask));
  const later = el('button', 'btn btn-big-wide', '나중에');
  later.type = 'button';
  later.addEventListener('click', () => nextReplyOrLadder());
  row.appendChild(go); row.appendChild(later);
  box.appendChild(row);
  return box;
}

function afterReplyRow(msg) {
  const box = el('div', 'math-ask');
  box.appendChild(el('p', 'math-ask-sent', msg));
  const b = el('button', 'btn btn-primary btn-big-wide', '다음 →');
  b.type = 'button';
  b.addEventListener('click', () => nextReplyOrLadder());
  box.appendChild(b);
  return box;
}

/** 안 읽은 답장이 더 있으면 그것부터, 없으면 사다리 */
function nextReplyOrLadder() {
  const left = unreadAsks(ui.state);
  if (left.length) renderReply(left[0]); else renderLadder(ui.state);
}

/** 🔁 답장 뒤 풀어보기 — 같은 틀(want) 한 문제. 감 잡기·이유·쌍둥이 없는 가벼운 편(mode 'ask') */
function startAskTry(ask) {
  const sx = stemOf(ask.concept);
  if (!sx) { renderLadder(ui.state); return; }
  const base = (Date.now() % 1000000) | 0;
  let q = null; let any = null;
  for (let t = 0; t < 8 && !q; t++) {
    const c = sx.gen.makeQuestion(ask.concept, ask.k, base + t * 7919, { ...optsFor(sx.key), want: { k: ask.k, key: ask.key } });
    if (!c) break;
    any = any || c;
    if (c.key === ask.key) q = c;
  }
  const sameKey = !!q; // 그 틀이 이제 없으면(내용이 바뀌어) 같은 얼굴의 아무 문제로 — 맞혀도 원래 유형의 노트·보너스는 안 준다 (Codex 4차 #7)
  q = q || any;
  if (!q) { renderLadder(ui.state); return; }
  ui.daily = null;
  ui.round = { id: null, mode: 'ask', qs: [q], ids: [ask.concept], askId: ask.id, askNo: ask.no, askSameKey: sameKey, at: 0, correct: 0, missTags: [], answers: [], answered: false, seed: base, phase: 'q' };
  renderQuestion();
}

/** 답한 뒤의 화면 — 보기 표시·피드백·풀이 카드·다음 버튼. 채점은 하지 않는다 (복원에도 쓴다) */
function paintAnswer(i, list, card, restoring) {
  const r = ui.round;
  const q = r.qs[r.at];
  const ch = q.choices[i];
  const okIdx = q.choices.findIndex((x) => x.ok);
  for (const b of list.querySelectorAll('.math-choice')) {
    b.disabled = true;
    const k = Number(b.dataset.i);
    if (k === okIdx) b.classList.add('ok');
    if (k === i && !ch.ok) b.classList.add('no');
  }
  const fb = card.querySelector('.math-feedback');
  fb.innerHTML = '';
  let scrollTo = null;
  const a = r.answers[r.at] || {}; // 이 문항의 답 기록 (감 잡기·이유가 여기 붙는다)
  const sense = senseOf(q);
  // 🎲 섞어 풀기는 답하기 전엔 개념 이름을 숨긴다("어떤 개념인지 알아내기"가 목적) — 답한 뒤에 알려 준다 (Codex 3차 #8)
  if (r.mode === 'mix') fb.appendChild(el('p', 'math-mix-concept', `📚 ${nameOf(q.concept)} 문제였어요`));
  if (ch.ok) {
    fb.appendChild(el('p', 'math-fb ok', ['맞았어요! 🎉', '정확해요! ⭐', '바로 그거예요! 👍'][r.at % 3]));
    // 맞혀도 풀이는 접어 두고 볼 수 있게 — "왜 맞았는지"도 개념이다
    if (q.solve) {
      const t = el('button', 'btn math-solve-toggle', '📖 풀이 보기');
      t.type = 'button';
      t.addEventListener('click', () => { t.replaceWith(solveCard(q, ch)); });
      fb.appendChild(t);
    }
  } else {
    const p = el('p', 'math-fb no');
    const showTag = ch.tag && !META_TAGS.has(ch.tag);
    p.appendChild(document.createTextNode(showTag ? `아쉬워요 — 이건 "${ch.tag}"이에요.` : '아쉬워요.'));
    fb.appendChild(p);
    scrollTo = solveCard(q, ch); // 틀린 직후가 가르치기 제일 좋은 순간 — 이름표만 붙이고 넘어가지 않는다 (진우, 2026-09-21)
    fb.appendChild(scrollTo);
  }
  // 🎯 감 잡기 결과 — 답을 본 뒤에야 알려 준다
  if (sense && a.sn !== undefined) {
    const s = el('p', `math-sense-verdict ${a.sn ? 'ok' : 'no'}`);
    const noun = sense.nouns[sense.ok];
    s.appendChild(document.createTextNode(a.sn ? '🎯 감 잡기도 맞았어요 — 답은 ' : `🎯 감 잡기는 "${sense.options[r.senses[r.at]]}"라고 했는데, 답은 `));
    s.appendChild(richNode(noun));
    s.appendChild(document.createTextNode(a.sn ? '' : `${noun === '0' ? '이었어요' : josa(noun, '이었어요', '였어요')}. 계산 전에 어느 쪽일지 한 번 더 생각해요.`));
    fb.appendChild(s);
  }
  const canTwin = !ch.ok && q.solve && (q.kind === 'calc' || q.kind === 'misread') && !light(r) && q.key;
  const next = el('button', 'btn btn-primary btn-big-wide', canTwin ? '알겠어요, 비슷한 문제 하나 더 →' : r.at + 1 < r.qs.length ? '다음 →' : '결과 보기');
  next.type = 'button';
  next.addEventListener('click', () => { if (canTwin) startTwin(); else advance(); });
  // 🙈 틀린 이유 — 고를 때까지 다음이 잠긴다 (진단 제외). 복원이면 고른 것을 보여 준다
  if (!ch.ok && !light(r)) {
    if (a.w) { fb.appendChild(whyPicked(a)); const offer = askOffer(q, a); if (offer) fb.appendChild(offer); }
    else { next.disabled = true; fb.appendChild(whyBlock(a, next, () => { const offer = askOffer(q, a); if (offer) next.before(offer); })); }
  }
  fb.appendChild(next);
  // 포커스가 버튼으로 가면서 화면이 풀이 아래로 밀리면 아이가 풀이를 못 본다 (Codex #10) — 풀이 카드 머리를 보이게
  focusQuiet(next);
  if (scrollTo && !restoring) scrollTo.scrollIntoView({ block: 'start', behavior: 'smooth' });
}

function focusQuiet(elm) {
  try { elm.focus({ preventScroll: true }); } catch { elm.focus(); }
}

/** 다음 문항으로 (쌍둥이가 있었으면 지운다) */
function advance() {
  const r = ui.round;
  if (!r) return;
  r.twin = null;
  r.at += 1;
  if (r.at < r.qs.length) renderQuestion(); else finishRound();
}

/**
 * 📖 풀이 카드 — 보기 아래에 펼쳐진다.
 *   ❌ 내 답 / ✔ 정답 → 1️⃣ 왜 틀렸나(이 오개념을 이 숫자로) + 내 답·정답 막대 비교 → 2️⃣ 이렇게 풀어요 + 정답 그림 → 3️⃣ 다음에 기억할 것
 * 사람이 쓴 ③⭐ 문항은 아직 풀이가 없어 정답과 개념 한 줄만 (2차에서 채운다).
 */
function solveCard(q, ch) {
  const card = el('div', 'math-solve');
  const okCh = q.choices.find((x) => x.ok) || { text: '' };
  const head = el('div', 'math-solve-head');
  if (!ch.ok) { const mine = el('span', 'mine'); mine.appendChild(document.createTextNode('❌ 내 답: ')); mine.appendChild(richNode(ch.text)); head.appendChild(mine); }
  const ans = el('span', 'ans'); ans.appendChild(document.createTextNode('✔ 정답: ')); ans.appendChild(richNode(okCh.text)); head.appendChild(ans);
  card.appendChild(head);
  const s = q.solve;
  const c = conceptOf(q.concept);
  if (!s) {
    if (c && c.idea) { const p = el('p', 'math-solve-p'); p.appendChild(document.createTextNode('💡 ')); p.appendChild(richNode(c.idea)); card.appendChild(p); }
    return card;
  }
  if (!ch.ok) {
    const why = s.why[ch.tag] || s.whyAny || (ch.tag && !META_TAGS.has(ch.tag) ? `이 답은 "${ch.tag}" 실수예요.` : '');
    if (why) {
      card.appendChild(el('div', 'math-solve-h', s.steps.length ? '1️⃣ 왜 틀렸나' : '📖 왜 틀렸나'));
      const p = el('p', 'math-solve-p'); p.appendChild(richNode(why)); card.appendChild(p);
    }
    // 내 답과 정답을 막대로 나란히 — 글보다 먼저 눈에 들어온다 (분수 모양 답이고 너무 크지 않을 때만)
    if (s.compare) {
      const a = fracOf(ch.text); const b = fracOf(okCh.text);
      if (a && b && a.d <= 12 && b.d <= 12 && a.n / a.d <= 3 && b.n / b.d <= 3) {
        const row = el('div', 'math-compare');
        row.appendChild(compareBox('내 답', ch.text, barSvg(a.d, a.n), 'no'));
        row.appendChild(compareBox('정답', okCh.text, barSvg(b.d, b.n), 'ok'));
        card.appendChild(row);
      }
    }
    // 정수 답(음수 줄기) — 내 답과 정답을 한 수직선에: 부호 실수가 "0의 어느 쪽으로 갔나"로 보인다
    if (s.numline) {
      const svg = compareLineSvg(intOf(ch.text), intOf(okCh.text));
      if (svg) card.appendChild(svgBox(svg, 'math-fig math-numline'));
    }
  } else if (!s.steps.length && s.whyAny) {
    // ③ 왜 그런가 — 맞혔어도 "왜"를 읽을 수 있게 (사람이 쓴 풀이는 단계가 없고 이유 한 덩이다)
    card.appendChild(el('div', 'math-solve-h', '📖 왜 그런가'));
    const p = el('p', 'math-solve-p'); p.appendChild(richNode(s.whyAny)); card.appendChild(p);
  }
  if (s.steps.length) {
    card.appendChild(el('div', 'math-solve-h', ch.ok ? '📖 이렇게 풀어요' : '2️⃣ 이렇게 풀어요'));
    const ol = el('ol', 'math-solve-steps');
    for (const st of s.steps) { const li = el('li'); li.appendChild(richNode(st)); ol.appendChild(li); }
    card.appendChild(ol);
  }
  if (s.figure) card.appendChild(svgBox(s.figure, 'math-fig'));
  const rule = s.rule || (c && c.idea) || '';
  if (rule) {
    card.appendChild(el('div', 'math-solve-h', (ch.ok || !s.steps.length) ? '💡 기억할 것' : '3️⃣ 다음에 기억할 것'));
    const p = el('p', 'math-solve-p rule'); p.appendChild(richNode(rule)); card.appendChild(p);
  }
  return card;
}

/** "−5" · "-5" · "+5" · "(−5)" · "5" → 정수. 아니면 NaN (compareLineSvg가 안 그린다) */
function intOf(text) {
  const s = String(text || '').trim().replace(/[−–]/g, '-').replace(/[()\s]/g, '');
  return /^[+-]?\d+$/.test(s) ? Number(s) : NaN;
}

/** "5/6" · "3" · "1 2/3" → {n, d} (대분수는 가분수로). 아니면 null */
function fracOf(text) {
  const s = String(text || '').trim();
  let m;
  if ((m = /^(\d+) (\d+)\/(\d+)$/.exec(s))) return { n: Number(m[1]) * Number(m[3]) + Number(m[2]), d: Number(m[3]) };
  if ((m = /^(\d+)\/(\d+)$/.exec(s))) return { n: Number(m[1]), d: Number(m[2]) };
  if ((m = /^(\d+)$/.exec(s))) return { n: Number(m[1]), d: 1 };
  return null;
}

function compareBox(label, text, svg, cls) {
  const box = el('div', `math-compare-box ${cls}`);
  const cap = el('div', 'cap'); cap.appendChild(document.createTextNode(`${label} `)); cap.appendChild(richNode(text)); box.appendChild(cap);
  box.appendChild(svgBox(svg, 'math-fig'));
  return box;
}

/**
 * 🔁 쌍둥이 문제 — 풀이를 읽은 직후 같은 틀에 숫자만 다른 문제 하나. 읽기만 하면 "알 것 같은" 느낌으로 끝나서,
 * 바로 풀어 봐야 진짜 잡혔는지 그 자리에서 드러난다. 편의 통과 여부는 안 바뀐다("틀린 게 있으면 안다가 아니다") —
 * 맞히면 ⚡ 조금과 일지에 "바로 고침"(fx)만 남는다.
 */
function startTwin() {
  const r = ui.round;
  if (!r) return;
  const q = r.qs[r.at];
  const base = ((Date.now() % 1000000) | 0) + 17;
  let tq = null;
  // 새 씨앗이 새 숫자를 보장하지 않는다 (Codex #6) — 같은 문장이면 다른 씨앗으로 다시, 그래도 같으면 그냥 낸다
  for (let i = 0; i < 8; i++) {
    const cand = G().makeQuestion(q.concept, q.kind, base + i * 7919, { ...optsFor(), want: { k: q.kind, key: q.key } });
    if (!cand) break;
    tq = cand;
    if (numSig(cand) !== numSig(q)) break; // 이름만 바뀌고 숫자가 같으면 쌍둥이가 아니다 (Codex 2차 — #6 후속)
  }
  if (!tq) { advance(); return; }
  r.twin = { q: tq, of: r.at, answered: false, chosenIdx: -1 };
  renderTwin();
}

/** 문항의 숫자 서명 — 식이 있으면 식, 없으면 글 속 숫자들 (이름이 바뀌어도 같으면 같은 문제) */
function numSig(q) {
  return q.expr ? String(q.expr) : (String(q.q).match(/\d+/g) || []).join(',');
}

function renderTwin(restore = false) {
  const r = ui.round;
  if (!r || !r.twin) return;
  const t = r.twin;
  const q = t.q;
  const m = clearMain();
  const card = el('section', 'math-card math-q math-twin');
  const top = el('div', 'math-q-top');
  top.appendChild(el('span', 'math-eyebrow', `🔁 비슷한 문제 · ${nameOf(q.concept)}`));
  top.appendChild(el('span', 'math-kind', '이번엔 맞혀 봐요'));
  card.appendChild(top);
  const qt = el('p', 'math-qt'); qt.appendChild(richNode(q.q)); card.appendChild(qt);
  if (q.figure) card.appendChild(svgBox(q.figure));
  if (q.expr) { const ex = el('p', 'math-expr'); ex.appendChild(richNode(q.expr)); card.appendChild(ex); }
  const list = el('div', 'math-choices');
  q.choices.forEach((ch, i) => {
    const b = el('button', 'math-choice');
    b.type = 'button';
    b.dataset.i = String(i);
    b.appendChild(el('span', 'math-choice-no', ['①', '②', '③', '④'][i]));
    const tx = el('span', 'math-choice-text'); tx.appendChild(richNode(ch.text)); b.appendChild(tx);
    b.addEventListener('click', () => answerTwin(i, list, card));
    list.appendChild(b);
  });
  card.appendChild(list);
  card.appendChild(el('div', 'math-feedback'));
  m.appendChild(card);
  if (restore && t.answered && t.chosenIdx >= 0) paintTwin(t.chosenIdx, list, card, true);
}

/** 쌍둥이 답 — 채점(한 번만)하고 그린다. 편의 정답 수(r.correct)는 안 건드린다 */
function answerTwin(i, list, card) {
  const r = ui.round;
  if (!r || !r.twin || r.twin.answered) return;
  const t = r.twin;
  t.answered = true;
  t.chosenIdx = i;
  const ch = t.q.choices[i];
  const a = r.answers[t.of];
  if (a) a.fixed = !!ch.ok;
  if (ch.ok) { r.fixed = (r.fixed || 0) + 1; sfx.success(); } else { sfx.wrong(); if (ch.tag) r.missTags.push(ch.tag); }
  paintTwin(i, list, card, false);
}

function paintTwin(i, list, card, restoring) {
  const r = ui.round;
  const t = r.twin;
  const q = t.q;
  const ch = q.choices[i];
  const okIdx = q.choices.findIndex((x) => x.ok);
  for (const b of list.querySelectorAll('.math-choice')) {
    b.disabled = true;
    const k = Number(b.dataset.i);
    if (k === okIdx) b.classList.add('ok');
    if (k === i && !ch.ok) b.classList.add('no');
  }
  const fb = card.querySelector('.math-feedback');
  fb.innerHTML = '';
  let scrollTo = null;
  if (ch.ok) {
    fb.appendChild(el('p', 'math-fb ok', `고쳤어요! 이제 알겠죠? ⚡+${REWARD.fix.xp} — 내일 한 번 더 물어볼게요`));
  } else {
    fb.appendChild(el('p', 'math-fb no', '아직 헷갈리나 봐요. 풀이를 한 번 더 읽어요.'));
    scrollTo = solveCard(q, ch);
    fb.appendChild(scrollTo);
  }
  const next = el('button', 'btn btn-primary btn-big-wide', t.of + 1 < r.qs.length ? '다음 →' : '결과 보기');
  next.type = 'button';
  next.addEventListener('click', () => { r.at = t.of; advance(); });
  fb.appendChild(next);
  focusQuiet(next);
  if (scrollTo && !restoring) scrollTo.scrollIntoView({ block: 'start', behavior: 'smooth' });
}

/**
 * 한 편 끝 — 저장 → 보상 → 결과 화면 → (처음 통과면) 🎯 잡기.
 *
 * ★ 저장이 끝나기 전에는 `ui.round`를 비우지 않는다 (Codex 리뷰 #10: 저장이 실패하면 "기록하는 중…"에 갇혔다).
 *   실패하면 "다시 저장" 버튼으로 같은 결과를 다시 넣는다. 보상은 저장이 된 뒤에만 준다.
 * ★ await 뒤마다 `ui.run`을 본다 (Codex 리뷰 #5: 저장 중에 ←로 나갔다 들어오면 옛 결과가 새 화면을 덮고,
 *   후보를 받는 사이에 나가면 🎯 잡기가 홈이나 영어 위에 떴다). 진도·보상은 이미 저장됐으니 그리기만 건너뛴다.
 */
async function finishRound() {
  const r = ui.round;
  if (!r || r.saving) return;
  const run = ui.run;
  const today = todayKey();
  const m = clearMain();
  m.appendChild(el('p', 'math-loading', '기록하는 중…'));
  r.saving = true;

  let state = null;
  let placed = null;
  let result = null;
  let tally = { ok: 0, rev: 0 }; // 🎟️ 이번 편이 실제로 더한 몫 (tallyRound가 돌려줌)
  let catches = 0;              // 🎯 이번 편이 준 몬스터볼 (roundCatches, 레코드 pend에 적힘)
  let daily = null; // ☀️ 이 편이 오늘의 수학의 마지막이면 완주 기록 (같은 트랜잭션 — 두 창이 같이 끝내도 첫 창만 보너스)
  const d = ui.daily;
  // 한 ☀️ 흐름에서 완주는 한 번만 적는다 — 섞어 풀기가 없는 날 "🤔 한 번 더"를 거듭해도 완주 횟수가 늘지 않게 (Codex 3차 #4)
  const lastOfDaily = !!d && !d.marked && (r.mode === 'mix' || (d.step === 'round' && !d.plan.mix.length));
  try {
    if (r.mode === 'diag') {
      state = await updateMath((s) => { placed = applyPlacement(s, r.answers, today, ui.stem, r.missTags); });
    } else if (r.mode === 'ask') {
      state = await updateMath((s) => { result = applyAskTry(s, r.askId, r.correct > 0, today, { sameKey: r.askSameKey !== false }); tally = tallyRound(s, { mode: r.mode, correct: r.correct, result }); });
    } else if (r.mode === 'notes' || r.mode === 'mix') {
      const qs = r.answers.map((a, i) => ({ id: r.ids[i], key: r.qs[i].key, k: a.kind, ok: a.correct ? 1 : 0, ...(a.tag ? { tag: a.tag } : {}), ...(a.fixed === undefined ? {} : { fx: a.fixed ? 1 : 0 }), ...(r.qs[i].fromNote ? { note: true } : {}), ...extraQ(a) }));
      state = await updateMath((s) => {
        result = r.mode === 'mix' ? applyMixRound(s, qs, today) : applyNotesRound(s, qs, today);
        // 🌟 섞어 풀기를 전부 맞히면 황금볼 — 하루 1개, 판정은 같은 트랜잭션(두 창·재시도 멱등)
        if (lastOfDaily) daily = markDaily(s, today, r.mode === 'mix' ? { perfect: !!result && result.total > 0 && result.ok === result.total } : undefined);
        tally = tallyRound(s, { mode: r.mode, correct: r.correct, dailyFirst: !!(daily && daily.first) }); // 🎟️ 교환권 누적 (같은 트랜잭션)
        catches = roundCatches({ mode: r.mode, result, inDaily: false, dailyFirst: !!(daily && daily.first) }); // 🎯 자격도 같은 트랜잭션 — 미룬 던지기로 적어 둔다
        addPending(s, catches);
      });
    } else {
      const qs = r.answers.map((a, i) => ({ k: a.kind, ok: a.correct ? 1 : 0, ...(a.tag ? { tag: a.tag } : {}), ...(a.fixed === undefined ? {} : { fx: a.fixed ? 1 : 0 }), ...(r.qs[i] && r.qs[i].key ? { key: r.qs[i].key } : {}), ...extraQ(a) }));
      state = await updateMath((s) => {
        result = applyRound(s, r.id, { correct: r.correct, total: r.qs.length, missTags: r.missTags, qs, mode: r.mode }, today);
        if (lastOfDaily) daily = markDaily(s, today);
        tally = tallyRound(s, { mode: r.mode, correct: r.correct, result }); // 🎟️ 교환권 누적 (같은 트랜잭션)
        catches = roundCatches({ mode: r.mode, result, inDaily: !!d && d.step === 'round', dailyFirst: !!(daily && daily.first) }); // 🎯 자격 (mathprog 순수 규칙)
        addPending(s, catches);
      });
    }
  } catch (err) {
    r.saving = false;
    if (run !== ui.run) return;
    clearMain();
    const card = el('section', 'math-card');
    card.appendChild(el('h2', '', '앗, 기록을 저장하지 못했어요'));
    card.appendChild(el('p', 'math-p', `푼 건 그대로 있어요. 한 번 더 눌러 주세요. (${String((err && err.message) || err)})`));
    const retry = el('button', 'btn btn-primary btn-big-wide', '💾 다시 저장');
    retry.type = 'button';
    retry.addEventListener('click', () => finishRound());
    card.appendChild(retry);
    m.appendChild(card);
    return;
  }
  ui.round = null; // 저장이 됐으니 이제 비운다
  ui.state = state; // 🤔 오답 노트가 바뀌었을 수 있다
  // ☀️ 흐름의 다음 단계는 화면을 그리든 말든 저장 성공 직후에 정한다 — 🎒에 가 있어도 돌아오면 섞어 풀기로 이어진다 (Codex 3차 #2)
  if (d && lastOfDaily) d.marked = true;
  if (d && d.step === 'round' && result) d.roundInfo = { id: r.id, mode: r.mode, passed: result.passed, correct: r.correct, total: r.qs.length };

  // 보상은 화면과 상관없이 지급 (나가 있어도 번 것은 번 것)
  const rw = r.mode === 'diag'
    ? { xp: r.correct * REWARD.diag.xp, coin: r.correct * REWARD.diag.coin, catchOnce: false }
    : r.mode === 'ask'
      ? (result && result.fixed && r.askSameKey !== false ? { xp: ASK_REWARD.xp, coin: ASK_REWARD.coin, catchOnce: false } : { xp: r.correct * REWARD.q.xp, coin: r.correct * REWARD.q.coin, catchOnce: false }) // ❓ 답장 뒤 같은 틀을 처음 맞히면 보상, 틀이 바뀌었거나 이미 고친 뒤면 문항 정답만
    : r.mode === 'notes' || r.mode === 'mix'
      ? { xp: r.correct * REWARD.q.xp, coin: r.correct * REWARD.q.coin, catchOnce: false } // 🤔 노트 회차·🎲 섞어 풀기: 문항 정답만, 잡기 없음 (연습)
      : roundReward(result, r.correct); // practice 여부는 저장소가 판정한 result에서 온다
  rw.xp += (r.fixed || 0) * REWARD.fix.xp; // 🔁 쌍둥이로 바로 고친 문항 (통과 여부와 무관)
  if (daily && daily.first) { rw.xp += REWARD.daily.xp; rw.coin += REWARD.daily.coin; } // ☀️ 하루 첫 완주 보너스
  // 🎯 수학 잡기 (2026-09-22, 아버님 결정): ☀️ 안의 개념 편을 다 맞히면 1번(처음이든 복습이든), ☀️ 하루 첫 완주에 1번 — 좋은 날 2번.
  // 영어는 퍼즐마다(하루 4번쯤) 던지는데 수학은 첫 통과 때만이라 아이가 영어만 골랐다. 자격은 트랜잭션 안(mathprog.roundCatches)에서 정해 레코드에 적혔다
  rw.catches = catches;
  rw.gold = !!(daily && daily.gold);
  if (rw.gold) addItem(GOLDEN.id, 1);
  // 🔷 수학스톤 — "제대로 배웠나"에서만 (mathprog.stoneReward). 코인처럼 트랜잭션 결과(result)에 따라 준다
  rw.stone = stoneReward({ mode: r.mode, result });
  if (rw.stone) addItem(STONE_MATH.id, rw.stone);
  // ✨ 오늘의 보너스 — 하루 첫 완주에만(daily.first는 트랜잭션 판정이라 두 창·재시도에도 한 번). 홈 카드가 미리 보여 준 바로 그것
  rw.bonus = daily && daily.first ? dailyBonus(today) : null;
  if (rw.bonus) {
    const gv = rw.bonus.give;
    if (gv.xp) rw.xp += gv.xp;
    if (gv.coin) rw.coin += gv.coin;
    if (gv.item) addItem(gv.item, gv.n || 1);
  }
  // 🎟️ 이번 편이 교환권 막대에 보탠 몫 — tallyRound가 실제로 더한 것 × 환산 (막대가 둘이라 따로: 📼 진행 · 🔁 복습)
  rw.ticket = { progress: tally.ok * MATH_PTS.ok + (daily && daily.first ? MATH_PTS.daily : 0), review: tally.rev * MATH_PTS.rev };
  const g = gainXp(rw.xp);
  const c = gainCoins(rw.coin).gained;
  applyDailyDelta(today, r.mode === 'diag' || r.mode === 'ask' ? { mathQ: r.qs.length, mathOk: r.correct } : { mathQ: r.qs.length, mathOk: r.correct, mathRounds: 1 }).catch(() => {});
  updateChip();
  if (g.leveledUp) sfx.levelUp();
  if (run !== ui.run) return; // 그 사이에 다른 화면으로 갔다 — 그리지 않는다
  clearMain(); // await 뒤에 한 번 더 비운다 — "기록하는 중…"이 결과 위에 남지 않게

  if (r.mode === 'diag') {
    const card = el('section', 'math-card');
    card.appendChild(el('h2', '', `📏 ${r.qs.length}개 중 ${r.correct}개 맞았어요`));
    card.appendChild(el('p', 'math-p', placed && placed.knownIds.length
      ? `${placed.knownIds.length}개 개념은 벌써 아는 것 같아요 — 며칠 뒤에 한 번씩 다시 확인할게요.`
      : '처음부터 차근차근 가요.'));
    const startP = el('p', 'math-p big');
    startP.textContent = `여기서 시작! → ${nameOf(placed ? placed.startId : S().list[0].id)}`;
    card.appendChild(startP);
    card.appendChild(el('p', 'math-reward', `⚡+${g.gained} 💰+${c}`));
    const b = el('button', 'btn btn-primary btn-big-wide', '사다리 보기');
    b.type = 'button';
    b.addEventListener('click', () => renderLadder(state));
    card.appendChild(b);
    m.appendChild(card);
    return;
  }

  if (r.mode === 'mix') {
    renderDailyDone(state, { g, c, daily, result, offer: askOfferForRound(r, state, today), catches: rw.catches, gold: rw.gold, bonus: rw.bonus, ticket: rw.ticket });
    runCatches(rw.catches, { g, c, run });
    return;
  }

  if (r.mode === 'ask') {
    const card = el('section', 'math-card math-result');
    const fixed = !!(result && result.fixed);
    card.appendChild(el('h2', '', fixed ? '🎉 아빠 답장으로 고쳤어요!' : r.correct ? '✅ 맞았어요!' : '아직 헷갈리네요'));
    card.appendChild(el('p', 'math-p', fixed
      ? (r.askSameKey === false ? `❓${r.askNo}의 문제 틀이 바뀌어 비슷한 문제로 확인했어요 — 잘했어요!` : `❓${r.askNo} 유형을 이제 알아요 — 🤔 노트에서도 지웠어요.`)
      : r.correct ? '이미 고친 유형이라 문항 정답만 받아요.' : '답장을 한 번 더 읽어 볼까요? 다시 풀어 볼 수도 있어요 — 틀려도 개념 진도는 내려가지 않아요.'));
    card.appendChild(el('p', 'math-reward', `⚡+${g.gained} 💰+${c}${rw.stone ? ` 🔷 수학스톤 +${rw.stone}` : ''}${g.leveledUp ? ` 🎉 Lv.${g.to}!` : ''}`));
    const row = el('div', 'math-actions');
    if (!r.correct) {
      const ask = ((state && state.asks) || []).find((x) => x && x.id === r.askId);
      if (ask) { const rb = el('button', 'btn btn-primary btn-big-wide', '📬 답장 다시 보기'); rb.type = 'button'; rb.addEventListener('click', () => renderReply(ask)); row.appendChild(rb); }
    }
    const back = el('button', r.correct ? 'btn btn-primary btn-big-wide' : 'btn btn-big-wide', '사다리로');
    back.type = 'button';
    back.addEventListener('click', () => renderLadder(state));
    row.appendChild(back);
    card.appendChild(row);
    m.appendChild(card);
    return;
  }

  if (r.mode === 'notes') {
    const card = el('section', 'math-card math-result');
    const nc = countNotes(state, today);
    card.appendChild(el('h2', '', result.ok === result.total ? '🤔 → 😄 틀렸던 유형을 다 고쳤어요!' : `🤔 ${result.total}개 중 ${result.ok}개를 고쳤어요`));
    const tail = nc.due ? `아직 ${nc.due}개 더 있어요 — 사다리에서 이어서 풀 수 있어요.` : nc.all ? `남은 ${nc.all}개는 내일 이후에 나와요.` : '오답 노트가 비었어요. 다음에 틀린 것이 있으면 다시 쌓여요.';
    card.appendChild(el('p', 'math-p', result.ok === result.total ? tail : `못 고친 ${result.total - result.ok}개는 내일 이후에 다시 나와요. 풀이를 한 번 더 읽어 봐요. ${tail}`));
    card.appendChild(el('p', 'math-reward', `⚡+${g.gained} 💰+${c}${rw.stone ? ` 🔷 수학스톤 +${rw.stone}` : ''}`));
    const b = el('button', 'btn btn-primary btn-big-wide', '사다리로');
    b.type = 'button';
    b.addEventListener('click', () => renderLadder(state));
    card.appendChild(b);
    m.appendChild(card);
    return;
  }

  const card = el('section', 'math-card math-result');
  const all = result.passed;
  card.appendChild(el('h2', '', all
    ? (result.crowned ? '👑 이해 완료!' : result.first ? '🎉 이 개념, 이제 알아요!' : result.practice ? '✅ 다 맞았어요!' : '✅ 다시 확인해도 맞았어요!')
    : `${r.qs.length}개 중 ${r.correct}개 맞았어요`));
  card.appendChild(el('p', 'math-p', all
    ? (result.crowned ? `${nameOf(r.id)} — 다섯 번 확인을 다 통과했어요. 정말 이해한 거예요.`
      : result.first ? '내일 한 번 더 물어볼게요. 며칠 뒤에도 맞으면 👑!'
        : result.practice ? '연습이라 👑 확인은 안 올라가요 — 다음 확인 날에 다시 물어볼게요.'
          : '다음 확인은 며칠 뒤예요.')
    : (result.practice
      ? '연습이라 기록은 그대로예요. 이야기를 다시 읽어 봐요.'
      : '아직 조금 헷갈리나 봐요. 이야기를 다시 읽고 한 번 더 해 봐요 — 틀린 게 있으면 "안다"가 안 돼요.')));
  const shown = kidTags(r.missTags);
  if (shown.length) {
    const tags = el('p', 'math-tags');
    tags.textContent = `🤔 이번에 헷갈린 것: ${shown.join(' · ')}`;
    card.appendChild(tags);
  }
  // ☀️ 오늘의 수학의 개념 편이면 — 섞어 풀기가 남았으면 "다음 →", 없으면 여기가 완주
  const inDaily = !!d && d.step === 'round';
  if (lastOfDaily) card.appendChild(el('p', 'math-p big', daily && daily.first ? '☀️ 오늘의 수학 끝! 내일도 ☀️ 하나면 돼요.' : '☀️ 오늘의 수학 끝!'));
  card.appendChild(el('p', 'math-reward', `⚡+${g.gained} 💰+${c}${rw.stone ? ` 🔷 수학스톤 +${rw.stone}` : ''}${rw.catches ? ` 🎯 몬스터볼 ${rw.catches}개!` : ''}${daily && daily.first ? ' ☀️ 첫 완주 보너스!' : ''}${g.leveledUp ? ` 🎉 Lv.${g.to}!` : ''}`));
  if (rw.bonus) card.appendChild(el('p', 'math-bonus-got', `✨ 오늘의 보너스 ${bonusText(rw.bonus)} 받았어요!`));
  ticketNote(state, rw.ticket).then((t) => { if (t && card.isConnected) card.appendChild(t); }); // 🎟️ 다음 영상까지 (수학도 채운다)
  const offer = askOfferForRound(r, state, today); // ❓ 틀린 문제를 아빠에게
  if (offer) card.appendChild(offer);

  const row = el('div', 'math-actions');
  if (!all) {
    const again = el('button', 'btn btn-primary btn-big-wide', '🤔 한 번 더');
    again.type = 'button';
    const wrong = r.answers.map((a, i) => ({ a, q: r.qs[i] })).filter((x) => x.a && !x.a.correct && x.q).map((x) => ({ q: x.q, chosen: x.q.choices.find((ch) => ch.text === x.a.chosen) || { text: x.a.chosen || '', ok: false, tag: x.a.tag } }));
    again.addEventListener('click', () => startRound(r.id, r.mode === 'review' ? 'review' : 'learn', { again: true, wrong }));
    row.appendChild(again);
  }
  let dailyNext = null;
  if (inDaily && !lastOfDaily) {
    dailyNext = el('button', 'btn btn-primary btn-big-wide math-daily-next', `다음 → 🎲 배운 것 섞어 풀기 ${d.plan.mix.length}문제`);
    dailyNext.type = 'button';
    dailyNext.disabled = rw.catches > 0; // 🎯 후보를 받는 동안은 잠근다 — 섞어 풀기 위에 잡기가 뒤늦게 뜨지 않게 (Codex 3차 B)
    dailyNext.addEventListener('click', () => startMixRound());
    row.appendChild(dailyNext);
  } else {
    const back = el('button', all ? 'btn btn-primary btn-big-wide' : 'btn btn-big-wide', '사다리로');
    back.type = 'button';
    back.addEventListener('click', () => renderLadder(state));
    row.appendChild(back);
  }
  card.appendChild(row);
  m.appendChild(card);

  // 🎯 몬스터볼 — 영어 퍼즐 정답과 같은 보상 경로(후보만 🔢 수학 포켓몬). 2번이면 한 번 끝난 뒤 이어서. 끝나야 "다음 → 🎲"가 열린다
  runCatches(rw.catches, { g, c, run, onAll: () => { if (dailyNext) dailyNext.disabled = false; } });
  if (dailyNext && !rw.catches) dailyNext.disabled = false;
}

// ───────────────────── 배선 ─────────────────────

export function initMath({ showView }) {
  ui.showView = showView;
  const back = $('btn-math-back');
  if (back) back.addEventListener('click', () => { ui.round = null; ui.daily = null; ui.run++; showView('home'); });
}

/** 홈에서 진우가 본 영상 세계를 미리 알고 싶을 때 (표시용) */
export function worldLabels() {
  const w = (ui.opts && ui.opts.worlds) || { pokemon: [] };
  return Object.keys(w).map((k) => WORLDS[k] ? WORLDS[k].label : k);
}
