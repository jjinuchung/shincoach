// 🖊️ 논술 화면 (v303, 2026-10-20) — 규칙은 nonsul.js · 홈 🖊️ 카드 → 이 화면(⏳는 국어 시간 — app.subjectOfView가 'korean') ·
// 한 판 = 주제 하나: ① 내 의견 ② 이유 둘 ③ 친구가 반대로 말한다면 ④ 글 순서 → 내가 만든 글 · 판을 끝낼 때 한 번 저장(그만두면 안 남는다 — 🧩 퍼즐과 같다)
// 🎯 논술 포켓몬 잡기는 국어 잡기와 같은 길: 화면을 띄우기 전에 기회를 빼고(nonsulTakeThrow), 안 던지고 닫으면 돌려주고,
//   판정 전에 앱이 꺼지면 장부(throwhold)에 남아 다음에 논술에 들어올 때 돌려준다 · 기회는 국어와 따로 센다
// 아이 화면에는 셈·진행 수를 띄우지 않는다 (2026-10-15)
import { allTopics, planTopic, dealTopic, essayParts, nonsulFinishText, nonsulTodayLine, ORDER_HINTS } from './nonsul.js';
import { wordsToday } from './korwords.js';
import { nonsulFinish, nonsulMap, nonsulDayMap, nonsulTakeThrow, nonsulGiveBackThrow, nonsulThrowsLeft, profileReady, getLevelInfo, isTired, getLook, inventory, catchAttempt } from './xp.js';
import { loadCharacters, downloadCharacters, forSubject, isUnlocked, pickCharacters } from './pokemon.js';
import { openCatch, isCatchOpen } from './catch.js';
import { holdStore, refundOutcome } from './throwhold.js';
import { guardStart } from './timeup.js';
import { sfx, unlock as sfxUnlock } from './sfx.js';

const $ = (id) => document.getElementById(id);
const el = (tag, cls, text) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
};
const btn = (cls, text, onClick) => { const b = el('button', cls, text); b.type = 'button'; b.addEventListener('click', onClick); return b; };
const ding = (ok) => { try { sfxUnlock(); if (ok) sfx.ding(); else sfx.wrong(); } catch { /* 소리는 없어도 */ } };

// data: 원고 · list: 쓸 수 있는 주제 · r: 푸는 판(화면을 떠나도 남아 돌아오면 이어서) · 잡기 상태는 국어 화면과 같은 꼴
const S = { data: null, list: [], loadErr: '', r: null, catching: false, catchState: null, catchMsg: '', wired: false, charBusy: false };
const STEP_NAMES = ['① 내 의견', '② 이유', '③ 반대 의견', '④ 글 순서'];
const STEP_OF = { side: 0, reasons: 1, counter: 2, order: 3, done: 4 };

function nonsulVisible() {
  const v = $('view-nonsul');
  return !!v && !v.hidden;
}
function mainEl() {
  return $('nonsul-main');
}
const byId = (id) => S.list.find((t) => t.id === id) || null;

/** 원고 — 한 번 받아 두고 계속 쓴다 (못 받으면 다음에 들어올 때 다시) */
async function loadData() {
  if (S.data) return;
  try {
    const res = await fetch('./coach/korean/nonsul.json');
    if (!res.ok) throw new Error(String(res.status));
    S.data = await res.json();
    S.list = allTopics(S.data);
    S.loadErr = S.list.length ? '' : '주제를 읽지 못했어요';
  } catch {
    S.loadErr = '주제를 받지 못했어요 — 인터넷이 되는 곳에서 다시 들어와 주세요';
  }
}

// ───────────────────── 첫 화면 ─────────────────────

function renderHome() {
  const m = mainEl();
  if (!m) return;
  m.innerHTML = '';
  const card = el('section', 'ns-card');
  card.appendChild(el('h2', 'ns-title', '🖊️ 내 의견과 이유를 말해 봐요'));
  const how = el('ol', 'ns-how');
  for (const t of ['내 의견을 골라요 — 정답은 없어요', '내 의견에 맞는 이유를 골라요', '친구가 반대로 말한다면 어떤 말일지 골라요', '글 순서를 맞추면 내 글이 완성돼요']) how.appendChild(el('li', '', t));
  card.appendChild(how);
  if (S.loadErr) {
    card.appendChild(el('p', 'ns-err', S.loadErr));
    m.appendChild(card);
    return;
  }
  const today = wordsToday(nonsulDayMap(), Date.now());
  card.appendChild(el('p', 'ns-today', nonsulTodayLine(today)));
  const st = nonsulMap();
  const next = planTopic(S.list, st, Date.now());
  const practice = next ? null : planTopic(S.list, st, Date.now(), true);
  if (next) card.appendChild(btn('btn btn-primary btn-big-wide ns-start', today ? '🖊️ 다음 주제 하기' : '🖊️ 오늘의 논술 시작', () => guardStart('korean', () => startRound(false))));
  else if (practice) card.appendChild(btn('btn btn-primary btn-big-wide ns-start', '⭐ 주제 다시 해 보기 (연습)', () => guardStart('korean', () => startRound(true))));
  else card.appendChild(el('p', 'ns-note', '오늘 할 주제를 다 했어요 — 내일 다시 만나요!'));
  m.appendChild(card);
  const cb = catchBtnEl();
  if (cb) m.appendChild(cb);
}

// ───────────────────── 한 판 ─────────────────────

function startRound(practice) {
  const id = planTopic(S.list, nonsulMap(), Date.now(), practice);
  const t = byId(id);
  if (!t) { renderHome(); return; }
  const cur = nonsulMap()[id];
  // from = 시작할 때 그 주제의 at — 그 사이 다른 창이 옮겼으면 이 판은 연습(nonsulRule)
  S.r = { id, t, from: cur ? cur.at : 0, side: '', deal: null, step: 'side', picks: [], tapped: [], counter: '', ctapped: [], placed: [], hint: '', miss: false, saving: false, result: null };
  renderRound();
  window.scrollTo(0, 0);
}

function stepsEl(step) {
  const now = STEP_OF[step];
  const row = el('ol', 'ns-steps');
  STEP_NAMES.forEach((name, i) => row.appendChild(el('li', i < now ? 'is-done' : i === now ? 'is-now' : '', name)));
  return row;
}

function renderRound() {
  const r = S.r;
  const m = mainEl();
  if (!m) return;
  if (!r) { renderHome(); return; }
  m.innerHTML = '';
  const card = el('section', 'ns-card ns-round');
  const head = el('div', 'ns-q');
  head.appendChild(el('span', 'ns-q-icon', r.t.icon));
  head.appendChild(el('h2', 'ns-q-text', r.t.q));
  card.appendChild(head);
  card.appendChild(stepsEl(r.step));
  if (r.step === 'side') sideEl(card, r);
  else if (r.step === 'reasons') reasonsEl(card, r);
  else if (r.step === 'counter') counterEl(card, r);
  else if (r.step === 'order') orderEl(card, r);
  else card.appendChild(finishEl(r));
  m.appendChild(card);
  if (r.step !== 'done') {
    // 그만두기 — 판을 버린다(저장 안 함 · 손해 없음)
    m.appendChild(btn('btn ns-quit', '← 그만하고 처음으로', () => { S.r = null; renderHome(); window.scrollTo(0, 0); }));
  }
}

function sideEl(card, r) {
  card.appendChild(el('p', 'ns-ask', '내 의견을 골라요 — 정답은 없어요'));
  const row = el('div', 'ns-sides');
  for (const side of ['yes', 'no']) {
    row.appendChild(btn('btn ns-side', r.t[side].label, () => {
      r.side = side;
      r.deal = dealTopic(r.t, side);
      r.step = 'reasons';
      ding(true);
      renderRound();
    }));
  }
  card.appendChild(row);
}

/** 보기 단추 — 고른 뒤 맞으면 ✓, 틀리면 ✗와 까닭 한 줄 */
function optEl(o, state, onPick) {
  const b = el('button', `kor-opt ns-opt${state === 'ok' ? ' is-ok' : state === 'no' ? ' is-no' : ''}`);
  b.type = 'button';
  b.appendChild(el('span', 'kor-opt-mark', state === 'ok' ? '✓' : state === 'no' ? '✗' : '•'));
  b.appendChild(el('span', '', o.t));
  b.disabled = !!state;
  if (!state) b.addEventListener('click', onPick);
  return b;
}

function reasonsEl(card, r) {
  card.appendChild(el('p', 'ns-mine', `내 의견: ${r.t[r.side].label}`));
  card.appendChild(el('p', 'ns-ask', '내 의견에 맞는 이유 두 개를 골라요'));
  const list = el('div', 'kor-opts');
  let why = '';
  r.deal.reasons.forEach((o, i) => {
    const tapped = r.tapped.includes(i);
    const state = tapped ? (o.k === 'mine' ? 'ok' : 'no') : '';
    if (tapped && o.k !== 'mine' && i === r.tapped[r.tapped.length - 1]) why = o.why;
    list.appendChild(optEl(o, state, () => {
      if (r.picks.length >= 2) return;
      r.tapped.push(i);
      if (o.k === 'mine') r.picks.push(o.t);
      else r.miss = true;
      ding(o.k === 'mine');
      renderRound();
    }));
  });
  card.appendChild(list);
  if (why) card.appendChild(el('p', 'kor-fb is-no', `✗ ${why}`));
  if (r.picks.length >= 2) {
    card.appendChild(el('p', 'kor-fb is-ok', '✓ 내 의견에 맞는 이유를 둘 다 찾았어요!'));
    card.appendChild(btn('btn btn-primary btn-big-wide ns-next', '다음 →', () => { r.step = 'counter'; renderRound(); }));
  }
}

function counterEl(card, r) {
  card.appendChild(el('p', 'ns-mine', `내 의견: ${r.t[r.side].label}`));
  card.appendChild(el('p', 'ns-ask', '친구가 반대 의견이라면 어떤 이유를 말할까요?'));
  const list = el('div', 'kor-opts');
  let why = '';
  r.deal.counter.forEach((o, i) => {
    const tapped = r.ctapped.includes(i);
    const state = tapped ? (o.k === 'other' ? 'ok' : 'no') : '';
    if (tapped && o.k !== 'other' && i === r.ctapped[r.ctapped.length - 1]) why = o.why;
    list.appendChild(optEl(o, state, () => {
      if (r.counter) return;
      r.ctapped.push(i);
      if (o.k === 'other') r.counter = o.t;
      else r.miss = true;
      ding(o.k === 'other');
      renderRound();
    }));
  });
  card.appendChild(list);
  if (why) card.appendChild(el('p', 'kor-fb is-no', `✗ ${why}`));
  if (r.counter) {
    card.appendChild(el('p', 'kor-fb is-ok', '✓ 맞아요 — 반대 의견의 이유예요.'));
    card.appendChild(btn('btn btn-primary btn-big-wide ns-next', '다음 →', () => { r.step = 'order'; renderRound(); }));
  }
}

function orderEl(card, r) {
  const parts = essayParts(r.t, r.side, r.picks, r.counter);
  card.appendChild(el('p', 'ns-ask', '글 순서를 맞춰요 — 처음부터 차례로 눌러요'));
  const built = el('div', 'ns-built');
  if (!r.placed.length) built.appendChild(el('p', 'ns-built-empty', '여기에 내 글이 차례로 쌓여요'));
  for (const i of r.placed) built.appendChild(el('p', 'ns-piece is-placed', parts[i]));
  card.appendChild(built);
  const pool = el('div', 'ns-pool');
  for (const i of r.deal.order) {
    if (r.placed.includes(i)) continue;
    pool.appendChild(btn('kor-opt ns-piece', parts[i], () => {
      if (i === r.placed.length) { r.placed.push(i); r.hint = ''; ding(true); }
      else { r.miss = true; r.hint = ORDER_HINTS[r.placed.length]; ding(false); }
      if (r.placed.length >= parts.length) { r.step = 'done'; finishRound(); return; }
      renderRound();
    }));
  }
  card.appendChild(pool);
  if (r.hint) card.appendChild(el('p', 'kor-fb is-no', `✗ 아직이에요 — ${r.hint}`));
}

/** 판 끝 — 한 번 저장(그날 처음이면 💰·🎯 논술 잡기 기회) · 실패하면 [다시 저장하기] */
async function finishRound() {
  const r = S.r;
  if (!r || r.saving) return;
  r.saving = true;
  r.result = null;
  renderRound();
  let res;
  try { res = await nonsulFinish({ id: r.id, ok: !r.miss, from: r.from }, S.list.map((t) => t.id)); } catch { res = { ok: false, why: 'save' }; }
  r.saving = false;
  r.result = res;
  if (res && res.ok && (res.first || res.solved)) { try { sfx.success(); } catch { /* 소리는 없어도 */ } }
  if (S.r === r && nonsulVisible()) renderRound();
}

function finishEl(r) {
  const box = el('div', 'ns-done');
  if (r.saving || !r.result) { box.appendChild(el('p', 'ns-done-title', '저장하는 중…')); return box; }
  const res = r.result;
  box.appendChild(el('p', 'ns-done-label', '🖊️ 내가 만든 글'));
  const essay = el('div', 'ns-essay');
  for (const p of essayParts(r.t, r.side, r.picks, r.counter)) essay.appendChild(el('p', '', p));
  box.appendChild(essay);
  const t = nonsulFinishText(res);
  box.appendChild(el('p', 'ns-done-title', t.title));
  for (const line of t.lines) box.appendChild(el('p', 'ns-done-line', line));
  const row = el('div', 'ns-done-btns');
  if (!res.ok && res.why !== 'empty') row.appendChild(btn('btn btn-primary', '다시 저장하기', () => { r.step = 'done'; finishRound(); }));
  if (res.ok && planTopic(S.list, nonsulMap(), Date.now())) row.appendChild(btn('btn btn-primary', '🖊️ 다음 주제', () => guardStart('korean', () => startRound(false))));
  row.appendChild(btn('btn', '🖊️ 논술 처음으로', () => { S.r = null; renderHome(); window.scrollTo(0, 0); }));
  box.appendChild(row);
  const cb = catchBtnEl(); // 🎯 그날 처음 끝냈으면 논술 포켓몬 잡기
  if (cb) box.appendChild(cb);
  return box;
}

// ───────────────────── 🎯 논술 포켓몬 잡기 (국어 잡기와 같은 길) ─────────────────────

export const CATCH_WHY = {
  nopics: '🎯 포켓몬 그림을 아직 못 받았어요 — 인터넷이 되는 곳에서 다시 눌러 주세요 (몬스터볼은 그대로 있어요)',
  noavail: '🎯 지금은 만날 수 있는 포켓몬이 없어요 — 조금 뒤에 다시 눌러 주세요 (몬스터볼은 그대로 있어요)',
  save: '🎯 기록이 잠깐 저장되지 않았어요 — 다시 눌러 주세요 (몬스터볼은 그대로 있어요)',
  error: '🎯 잡기 화면을 열지 못했어요 — 다시 눌러 주세요 (몬스터볼은 돌려놨어요)',
  errorOwed: '🎯 잡기 화면을 열지 못했어요 — 몬스터볼은 논술에 다시 들어오면 돌려줘요',
  owed: '🎯 몬스터볼을 돌려주는 기록이 잠깐 저장되지 않았어요 — 논술에 다시 들어오면 돌려줘요',
};

// 🎯 뺀 기회 장부 — 뺄 때 한 줄, 판정이 나면(attempt) 지우고, 돌려주기가 저장되면 지운다. 남은 줄은 논술에 들어올 때 돌려준다
const holds = holdStore('shincoach.nonsul.throwHolds');
/** 기회 하나 돌려주기 → 'ok' · 'none' · 'fail' */
async function giveBack() {
  try { return refundOutcome(await nonsulGiveBackThrow()); } catch { return 'fail'; }
}
let holdTimer = null;
/** 남은 예약을 돌려준다 — 돌려준 게 있으면 다시 그린다 · 다른 창의 줄은 그 창이 닫힌 지 1분 뒤에 */
function settleThrows() {
  return holds.settle(giveBack).then((n) => {
    if (n > 0) refreshAfterCatch();
    const w = holds.waitMs();
    if (w !== null && !holdTimer) holdTimer = setTimeout(() => { holdTimer = null; settleThrows(); }, w + 1000);
    return n;
  }).catch(() => 0);
}

/** 논술 포켓몬 후보 — 열린 것 · 지치지 않은 것 · 4마리가 안 되면 몇 마리 받아서라도(8초 안에 못 받으면 있는 만큼) */
async function nsPool() {
  const read = async () => {
    let chars = [];
    try { chars = await loadCharacters(); } catch { chars = []; }
    const level = getLevelInfo().level;
    return forSubject(chars, 'nonsul').filter((c) => isUnlocked(c.id, level) && !isTired(c.id)).map((c) => ({ ...c, look: getLook(c.id) }));
  };
  let pool = await read();
  if (pool.length < 4 && navigator.onLine !== false) {
    try {
      await Promise.race([downloadCharacters(null, 6, 'nonsul'), new Promise((res) => setTimeout(res, 8000))]);
      pool = await read();
    } catch { /* 오프라인·실패 — 있는 만큼으로 */ }
  }
  return pool;
}

/** 논술 화면에 들어올 때마다 논술 포켓몬 그림을 조금씩 먼저 받아 둔다 (명단 맨 뒤라 자동 받기로는 늦게 온다) */
function topUpChars() {
  if (S.charBusy || (typeof navigator !== 'undefined' && navigator.onLine === false)) return;
  S.charBusy = true;
  downloadCharacters(null, 8, 'nonsul').catch(() => {}).then(() => { S.charBusy = false; });
}

/** 잡기 창이 소식 없이 닫혔다(다른 화면이 catch.closeCatch를 불렀다) — 안 던졌으면 기회를 돌려주고 단추를 다시 살린다 */
function settleLostCatch() {
  const st = S.catchState;
  if (!S.catching || !st || isCatchOpen()) return null;
  S.catchState = null;
  S.catching = false;
  if (st.threw) return null; // 판정이 났다 — 쓴 기회
  return st.hold.refund(giveBack).then((ok) => { if (!ok) S.catchMsg = CATCH_WHY.owed; refreshAfterCatch(); });
}

function catchBtnEl() {
  settleLostCatch();
  const n = nonsulThrowsLeft();
  const box = el('div', 'kor-catch ns-catch');
  if (n > 0) {
    const b = btn('btn btn-primary kor-catch-btn', '🎯 논술 포켓몬 잡기', () => { runCatch().catch(() => {}); });
    b.disabled = !!S.catching;
    box.appendChild(b);
  }
  if (S.catchMsg) box.appendChild(el('p', 'kor-catch-msg', S.catchMsg));
  return box.childNodes.length ? box : null;
}

/** 잡은 뒤(또는 못 열었을 때) 지금 화면을 다시 그린다 */
function refreshAfterCatch() {
  if (!nonsulVisible()) return;
  if (S.r) renderRound();
  else renderHome();
}

export async function runCatch() {
  await settleLostCatch(); // 지난 창이 소식 없이 닫혔으면 먼저 정리
  if (S.catching) return;
  S.catching = true;
  S.catchMsg = '';
  const done = () => { S.catching = false; refreshAfterCatch(); };
  let pool = [];
  try { pool = await nsPool(); } catch { pool = []; }
  if (!nonsulVisible()) { S.catching = false; return; } // 그 사이 나갔다 — 기회는 그대로(빼기 전)
  if (!pool.length) {
    let hasPics = false;
    try { hasPics = forSubject(await loadCharacters(), 'nonsul').length > 0; } catch { hasPics = false; }
    S.catchMsg = CATCH_WHY[hasPics ? 'noavail' : 'nopics'];
    done();
    return;
  }
  let taken;
  try { taken = await nonsulTakeThrow(); } catch { taken = { ok: false, why: 'save' }; }
  if (!taken || !taken.ok) { S.catchMsg = taken && taken.why === 'none' ? '' : CATCH_WHY.save; done(); return; }
  const st = { threw: false, hold: holds.track() }; // 뺀 기회를 장부에 — 판정 전에 앱이 꺼져도 다음에 돌려준다
  if (!nonsulVisible()) { await st.hold.refund(giveBack); S.catching = false; return; } // 뺀 사이 나갔다 — 돌려준다
  S.catchState = st;
  try {
    openCatch({
      candidates: pickCharacters(pool, 4), subject: 'nonsul', xpGain: 0, coinGain: 0, levelInfo: getLevelInfo(), levelUp: 0,
      ballCounts: inventory(),
      // 판정이 나는 순간 쓴 기회 — 장부의 줄을 지운다(동기). 판정 전에 닫히면 attempt가 안 불려 돌려준다
      attempt: (id, opts) => { st.threw = true; st.hold.judged(); return catchAttempt(id, Math.random, opts); },
      // ★ 한 번도 안 던지고 닫았으면 기회를 돌려준다 — 화면을 띄우기 전에 이미 뺐다 (저장이 안 되면 장부에 남아 다음에)
      onDone: (res) => {
        if (S.catchState === st) S.catchState = null;
        if (res && res.threw === false && !st.threw) st.hold.refund(giveBack).then((ok) => { if (!ok) S.catchMsg = CATCH_WHY.owed; }).finally(done);
        else done();
      },
    });
  } catch {
    if (S.catchState === st) S.catchState = null;
    const back = await st.hold.refund(giveBack);
    S.catchMsg = back ? CATCH_WHY.error : CATCH_WHY.errorOwed;
    done();
  }
}

// ───────────────────── 배선 (app.js) ─────────────────────

/** 🖊️ 논술 화면에 들어올 때 — 소식 없이 닫힌 잡기 창을 먼저, 그다음 남은 예약 정리 · 원고 · 프로필을 기다려 그린다 (푸는 판이 있으면 이어서) */
export async function enterNonsul() {
  await Promise.resolve(settleLostCatch()).catch(() => {});
  settleThrows();
  topUpChars();
  await loadData();
  try { await profileReady(); } catch { /* 못 읽어도 빈 칸으로 그린다 */ }
  if (!nonsulVisible()) return;
  if (S.r) renderRound();
  else renderHome();
}

/** 배선 — ← 과목 고르기 */
export function initNonsul({ showView }) {
  if (S.wired) return;
  S.wired = true;
  const back = $('btn-nonsul-back');
  if (back) back.addEventListener('click', () => showView('home'));
}
