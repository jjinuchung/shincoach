// 🖊️ 논술 화면 (v303, 2026-10-20) — 규칙은 nonsul.js · 홈 🖊️ 카드 → 이 화면(⏳는 국어 시간 — app.subjectOfView가 'korean') ·
// 한 판 = 주제 하나: ① 내 의견 ② 이유 둘 ③ 친구가 반대로 말한다면 ④ 글 순서 → 내가 만든 글 · 판을 끝낼 때 한 번 저장(그만두면 안 남는다 — 🧩 퍼즐과 같다)
// 🎯 논술 포켓몬 잡기는 국어 잡기와 같은 길: 화면을 띄우기 전에 기회를 빼고(nonsulTakeThrow), 안 던지고 닫으면 돌려주고,
//   판정 전에 앱이 꺼지면 장부(throwhold)에 남아 다음에 논술에 들어올 때 돌려준다 · 기회는 국어와 따로 센다
// 아이 화면에는 셈·진행 수를 띄우지 않는다 (2026-10-15)
// ✍️ 짧은 글 (v304): 판을 끝낸 주제 — 판 끝 「✍️ 이번엔 내 말로 써 볼까요?」 · 첫 화면 「✍️ 내 말로 짧은 글 쓰기」 목록 · 📬 아빠 답장 띠 ·
//   쓰기 화면(S.w)은 korwriteview.writeBoxEl에 칸마다 머리말 채우기(nonsulwriteview.essayFormEl)를 끼운다 · 들어올 때 비공개 저장소 답장 받기
import { allTopics, planTopic, dealTopic, essayParts, nonsulFinishText, nonsulTodayLine, ORDER_HINTS, nonsulWriteCards, essayTopics, readingTopicOf, isSolved } from './nonsul.js';
import { circled } from './korean.js';
import { wordsToday } from './korwords.js';
import { nonsulFinish, nonsulMap, nonsulDayMap, nonsulTakeThrow, nonsulGiveBackThrow, nonsulThrowsLeft, profileReady, getLevelInfo, isTired, getLook, inventory, catchAttempt, korWritesMap } from './xp.js';
import { cardWriteState, unreadReplies } from './korwrite.js';
import { writeBoxEl, syncWrites, appliedLine } from './korwriteview.js';
import { essayFormEl, ESSAY_WORDS } from './nonsulwriteview.js';
import { loadCharacters, downloadCharacters, forSubject, isUnlocked, pickCharacters } from './pokemon.js';
import { openCatch, isCatchOpen } from './catch.js';
import { holdStore, refundOutcome } from './throwhold.js';
import { guardStart } from './timeup.js';
import { sfx, unlock as sfxUnlock } from './sfx.js';
import { nonsulBattleQ } from './korbattle.js';
import { rollOffer, offerEl, overlayOpen } from './korbattleview.js'; // ⚔️ 논술 배틀 (v325) — 이 파일을 import하지 않는다
import { isBattleOpen } from './battle.js';
import { korGainXp } from './korxp.js'; // ⚡ 논술 경험치 (v327)
import { loadKorRocketToday, korRocketDone, korRocketTally, korRocketPending, korRocketClear, korRocketAt, resumeKorRocketIfAny } from './korrocket.js'; // 🚀 논술 로켓단 (v327)
import { korCheer, warmKorCheer } from './korcheer.js'; // 📣 응원 포켓몬 (v327)
import { tickKorDay, eggLine } from './koreanview.js'; // 🥚 논술 판도 국어 알 하루 칸 (v327 — 국어 글·낱말·퍼즐과 같은 칸)
import { korDayDone } from './kordayview.js'; // 🔥 연속 학습(국어와 합쳐 하나) · ✨ 논술 오늘의 보너스 (v329)
import { streakLine, bonusLine } from './korday.js';
import { addCell } from './zygview.js'; // 🟢 지가르데 셀 — 끝 화면 구석 (v352)

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
// wcards: ✍️ 짧은 글 카드(채점 기준이 깨졌으면 [] — 짧은 글을 안 연다) · w: 쓰기 화면의 주제 id(돌아오면 그대로) · writeNote: 답장이 붙었다는 한 줄(한 번)
// stories: 📖 독서 논술 주제의 국어 글(카드 id → { title, lines }, v316 — 못 받으면 한 줄 소개만)
const S = { data: null, list: [], wcards: [], loadErr: '', r: null, w: '', writeNote: '', catching: false, catchState: null, catchMsg: '', wired: false, charBusy: false, stories: null };
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
    S.wcards = nonsulWriteCards(S.data);
    S.loadErr = S.list.length ? '' : '주제를 읽지 못했어요';
  } catch {
    S.loadErr = '주제를 받지 못했어요 — 인터넷이 되는 곳에서 다시 들어와 주세요';
  }
}

/** 📖 독서 논술 주제의 국어 글 (v316) — 한 번 받아 둔다 · 못 받으면 빈 칸(📖 한 줄 소개만 보인다 — 다음에 들어올 때 다시) */
async function loadStories() {
  if (S.stories) return;
  const want = new Set(S.list.map((t) => t.card).filter(Boolean));
  if (!want.size) return;
  try {
    const res = await fetch('./coach/korean/reading.json');
    if (!res.ok) throw new Error(String(res.status));
    const cards = (await res.json()).cards;
    S.stories = new Map((Array.isArray(cards) ? cards : []).filter((c) => c && want.has(c.id) && Array.isArray(c.lines)).map((c) => [c.id, { title: String(c.title || ''), lines: c.lines }]));
  } catch { S.stories = null; }
}
/** 글 한 줄 (극본 대사 {who, t}도) */
const storyLine = (l) => (typeof l === 'string' ? l : l && typeof l === 'object' ? `${l.who ? `${l.who}: ` : ''}${l.t || l.text || ''}` : '');

/**
 * 📖 독서 논술 머리 (v316) — 「이야기 제목」 한 줄 소개 + [📖 글 다시 보기](접어 둠 · 판 안에서는 펼친 채로 다시 그린다)
 * 글을 못 받았으면 한 줄 소개만
 */
function storyEl(t, r) {
  const box = el('div', 'ns-story');
  const st = S.stories && S.stories.get(t.card);
  box.appendChild(el('p', 'ns-story-intro', `📖 ${st ? `「${st.title}」 ` : ''}${t.intro}`));
  if (st) {
    const det = el('details', 'kor-script ns-story-text');
    det.open = !!(r && r.storyOpen);
    det.addEventListener('toggle', () => { if (r) r.storyOpen = det.open; });
    det.appendChild(el('summary', '', '📖 글 다시 보기'));
    st.lines.forEach((l, i) => det.appendChild(el('p', 'kor-script-line', `${circled(i + 1)} ${storyLine(l)}`)));
    box.appendChild(det);
  }
  return box;
}

// ───────────────────── 첫 화면 ─────────────────────

function renderHome() {
  const m = mainEl();
  if (!m) return;
  m.innerHTML = '';
  if (S.writeNote) { m.appendChild(el('p', 'kor-wnote ns-wnote', S.writeNote)); S.writeNote = ''; } // 📬 답장이 붙었다 — 한 번
  const wb = replyBannerEl();
  if (wb) m.appendChild(wb);
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
  const st = nonsulMap();
  const next = planTopic(S.list, st, Date.now());
  card.appendChild(el('p', 'ns-today', nonsulTodayLine(today, !!next))); // ⭐와 🎯는 오늘 할 주제가 있을 때만 말한다 (v338)
  const practice = next ? null : planTopic(S.list, st, Date.now(), true);
  if (next) card.appendChild(btn('btn btn-primary btn-big-wide ns-start', today ? '🖊️ 다음 주제 하기' : '🖊️ 오늘의 논술 시작', () => guardStart('korean', () => startRound(false))));
  else if (practice) card.appendChild(btn('btn btn-primary btn-big-wide ns-start', '⭐ 주제 다시 해 보기 (연습)', () => guardStart('korean', () => startRound(true))));
  else card.appendChild(el('p', 'ns-note', '오늘 할 주제를 다 했어요 — 내일 다시 만나요!'));
  m.appendChild(card);
  const es = essaysEl();
  if (es) m.appendChild(es);
  const cb = catchBtnEl();
  if (cb) m.appendChild(cb);
}

// ───────────────────── ✍️ 짧은 글 (v304) ─────────────────────

const wcardOf = (id) => S.wcards.find((c) => c.id === id) || null;
/** korwriteview.writeBoxEl에 건네는 것 — 쓰기 칸은 칸마다 머리말 채우기, 말은 논술 말 */
const writeCtx = { cards: () => S.wcards, form: essayFormEl, words: ESSAY_WORDS };

/** 📬 안 읽은 논술 글 답장 — [열어 보기] (첫 것부터 · 셈 없이) */
function replyBannerEl() {
  const list = unreadReplies(korWritesMap()).filter((u) => !!wcardOf(u.card));
  if (!list.length) return null;
  // ⏳ 쓰기 화면은 어디서 열든 국어 시간을 본다 — 띠로 들어가 「다시 써 보기」까지 갈 수 있다(Codex 110차 #2)
  return btn('btn btn-primary kor-wbanner ns-wbanner', '📬 아빠가 봐 준 논술 글이 있어요 — 열어 보기', () => guardStart('korean', () => openWrite(list[0].card)));
}

/** 첫 화면 ✍️ 목록 — 판을 끝낸 주제만(셈 없이 주제 이름 · 📬·✉️·✅ 표시) · 안 읽은 답장이 있으면 펼친 채로 */
function essaysEl() {
  if (!S.wcards.length) return null;
  const items = essayTopics(S.list, nonsulMap(), korWritesMap()).filter((it) => !!wcardOf(it.id));
  if (!items.length) return null;
  const det = el('details', 'ns-essays');
  det.open = items.some((it) => cardWriteState(korWritesMap(), it.id).unread);
  det.appendChild(el('summary', 'ns-essays-sum', '✍️ 내 말로 짧은 글 쓰기'));
  det.appendChild(el('p', 'ns-note', '판을 끝낸 주제로 써요 — 하고 싶을 때만'));
  for (const it of items) {
    const b = btn('btn ns-essay-btn', undefined, () => guardStart('korean', () => openWrite(it.id)));
    b.appendChild(el('span', 'ns-essay-q', `${it.icon} ${it.q}`));
    if (it.tag) b.appendChild(el('span', 'ns-essay-tag', it.tag));
    det.appendChild(b);
  }
  return det;
}

/** 판 끝 — 이 주제로 짧은 글 쓰러 가기 (✅로 끝난 주제는 안 띄운다) */
function writeLinkEl(id) {
  if (!wcardOf(id)) return null;
  const st = cardWriteState(korWritesMap(), id);
  if (st.done && !st.unread) return null;
  const label = st.unread ? '📬 이 주제 글에 아빠 답장이 왔어요' : st.pending ? '✉️ 이 주제 글은 아빠 답장을 기다려요' : '✍️ 이번엔 내 말로 써 볼까요? (하고 싶을 때만)';
  const box = el('div', 'ns-wlink');
  box.appendChild(btn('btn ns-wlink-btn', label, () => guardStart('korean', () => openWrite(id))));
  return box;
}

/** 쓰기 화면 열기 — 판은 이미 저장됐거나(판 끝) 없다(첫 화면) */
function openWrite(id) {
  if (!wcardOf(id)) return;
  S.r = null;
  S.w = id;
  renderWrite();
  window.scrollTo(0, 0);
}
function closeWrite() {
  S.w = '';
  renderHome();
  window.scrollTo(0, 0);
}
function renderWrite() {
  const m = mainEl();
  const card = wcardOf(S.w);
  const t = byId(S.w);
  if (!m) return;
  if (!card || !t) { S.w = ''; renderHome(); return; }
  m.innerHTML = '';
  m.appendChild(btn('btn ns-quit ns-wback', '← 🖊️ 논술 처음으로', closeWrite));
  const sec = el('section', 'ns-card ns-write');
  const head = el('div', 'ns-q');
  head.appendChild(el('span', 'ns-q-icon', t.icon));
  head.appendChild(el('h2', 'ns-q-text', t.q));
  sec.appendChild(head);
  sec.appendChild(writeBoxEl(card, writeCtx));
  m.appendChild(sec);
  const h = sec.querySelector('.kor-wgrade') || sec.querySelector('.kor-wh');
  if (h) { h.tabIndex = -1; h.focus({ preventScroll: true }); }
}

// ───────────────────── 한 판 ─────────────────────

/** 판 시작 — want(주제 id)를 주면 그 주제로(📖 국어 글을 다 읽은 화면에서, v316) · 아니면 오늘 할 주제(planTopic) */
function startRound(practice, want = '') {
  const id = want || planTopic(S.list, nonsulMap(), Date.now(), practice);
  const t = byId(id);
  if (!t) { renderHome(); return; }
  const cur = nonsulMap()[id];
  S.w = '';
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
  if (r.t.card) card.appendChild(storyEl(r.t, r)); // 📖 독서 논술 — 한 줄 소개 · 글 다시 보기 (v316)
  card.appendChild(stepsEl(r.step));
  if (r.step === 'side') sideEl(card, r);
  else if (r.step === 'reasons') reasonsEl(card, r);
  else if (r.step === 'counter') counterEl(card, r);
  else if (r.step === 'order') orderEl(card, r);
  else card.appendChild(finishEl(r));
  m.appendChild(card);
  if (r.step !== 'done') {
    // 그만두기 — 판을 버린다(저장 안 함 · 손해 없음)
    m.appendChild(btn('btn ns-quit', '← 그만하고 처음으로', () => { if (korRocketPending('nonsul')) korRocketClear(); S.r = null; renderHome(); window.scrollTo(0, 0); }));
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
      onAnswer(r, o.k === 'mine');
      ding(o.k === 'mine');
      renderRound();
    }));
  });
  card.appendChild(list);
  if (why) card.appendChild(el('p', 'kor-fb is-no', `✗ ${why}`));
  if (r.picks.length >= 2) {
    card.appendChild(el('p', 'kor-fb is-ok', '✓ 내 의견에 맞는 이유를 둘 다 찾았어요!'));
    card.appendChild(nextBtn(r, 'counter'));
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
      onAnswer(r, o.k === 'other');
      ding(o.k === 'other');
      renderRound();
    }));
  });
  card.appendChild(list);
  if (why) card.appendChild(el('p', 'kor-fb is-no', `✗ ${why}`));
  if (r.counter) {
    card.appendChild(el('p', 'kor-fb is-ok', '✓ 맞아요 — 반대 의견의 이유예요.'));
    card.appendChild(nextBtn(r, 'order'));
  }
}

/** 🚀 논술 로켓단의 문제 원천 — 의견에 알맞은 이유(배틀과 같은 것 · 원고를 받은 뒤) */
const nsMakeQ = async () => { await loadData(); return (seen) => nonsulBattleQ(S.list, nonsulMap(), seen); };

/** 🚀·📣 ② 이유 · ③ 반대 의견에서 고른 답 하나 (v327) — 로켓단 이어진 수(처음 고른 답 — 틀리면 0부터) · 응원 포켓몬 */
function onAnswer(r, ok) {
  korRocketTally(ok, 'nonsul');
  korCheer(!ok, { subject: 'nonsul', visible: () => S.r === r && nonsulVisible(), busy: () => !!S.catching || overlayOpen() || korRocketPending('nonsul') });
}

/**
 * 다음 걸음으로 — 🚀 로켓단이 걸려 있으면 그 전에 (v327 · ④ 글 순서 뒤 판 끝에는 안 — 다 한 판을 먼저 저장) · 끝나면 그 판의 그 걸음이 아직 떠 있을 때만 한 번 이어서
 * 기다리는 동안은 다시 그린 「다음 →」도 잠긴다(nextBtn — 🔍 Codex 131차 #2, 국어와 같다)
 */
function stepNext(r, step, button) {
  if (r.rocketWait) return;
  const from = r.step;
  const go = () => { r.step = step; renderRound(); };
  if (korRocketPending('nonsul')) {
    if (button) button.disabled = true; // 연달아 눌러 건너뛰지 않게
    korRocketAt(r, from, { kind: 'nonsul', visible: () => S.r === r && nonsulVisible(), makeQ: nsMakeQ, next: () => { if (S.r === r && r.step === from) go(); } });
    return;
  }
  go();
}

/** ② ③ 끝의 「다음 →」 — 🚀 로켓단을 기다리는 동안이면 잠긴 채 */
function nextBtn(r, step) {
  const b = btn('btn btn-primary btn-big-wide ns-next', '다음 →', (e) => stepNext(r, step, e.currentTarget));
  b.disabled = !!r.rocketWait;
  return b;
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

/** 판 끝 — 한 번 저장(그날 처음이면 💰·🎯 논술 잡기 기회 · 처음 ⭐면 🎯 하나 더) · 실패하면 [다시 저장하기] */
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
  if (korRocketPending('nonsul')) korRocketClear(); // 🚀 판 끝 뒤에는 열지 않는다 — 걸린 채 남지 않게 (v327)
  if (res && res.ok) {
    korGainXp(res.xp); // ⚡ (v327) — 같은 주제는 하루 한 번 · 연습·[다시 저장]은 0(규칙이 정함) · 화면이 바뀌었어도 준다
    korRocketDone('nonsul'); // 🚀 오늘 끝낸 판 (로켓단 등장 조건 — 하루 기록 nsRounds)
    // 🔥·✨ (v329) — ⭐ 연습 판도 · 준 것은 화면과 상관없이 · 줄은 그 끝 화면이 떠 있을 때만
    korDayDone('nonsul').then((day) => {
      if ((day.streak || day.bonus) && S.r === r && r.result === res) { r.day = day; if (nonsulVisible()) renderRound(); }
    }).catch(() => {});
    // 🥚 논술 판을 끝낸 날 = 국어 알 하루 칸 (국어 글·낱말·퍼즐과 같은 칸 — 5일째면 그 트랜잭션에서 부화)
    tickKorDay().then((egg) => { if (egg && egg.ok && S.r === r) { r.egg = egg; if (nonsulVisible()) renderRound(); } }).catch(() => {});
  }
  // ⚔️ 논술 배틀 (v325) — 저장된 한 판 끝에 가끔 단추 하나(턴 문제는 이 의견에 알맞은 이유 — 원고 문장 그대로) · 그 사이 다음 판으로 갔으면 안 붙인다
  if (res && res.ok) {
    rollOffer('nonsul', () => (seen) => nonsulBattleQ(S.list, nonsulMap(), seen)).then((b) => {
      if (b && S.r === r && r.result === res) { r.battle = b; if (nonsulVisible()) renderRound(); }
    }).catch(() => {});
  }
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
  if (res.ok && res.xp > 0) box.appendChild(el('p', 'ns-done-line kor-xp', `⚡ 경험치 +${res.xp}`)); // v327
  const sl = res.ok && r.day ? streakLine(r.day.streak) : ''; // 🔥 (v329)
  if (sl) box.appendChild(el('p', 'ns-done-line kor-streak', sl));
  const bl = res.ok && r.day ? bonusLine(r.day.bonus) : ''; // ✨ (v329)
  if (bl) box.appendChild(el('p', 'ns-done-line kor-bonus', bl));
  const eg = eggLine(r.egg); // 🥚 (v327)
  if (eg) box.appendChild(el('p', 'ns-done-line kor-egg', eg));
  const wl = res.ok ? writeLinkEl(r.id) : null; // ✍️ 이 주제로 짧은 글 (v304 · 저장이 된 뒤에만)
  if (wl) box.appendChild(wl);
  const row = el('div', 'ns-done-btns');
  if (!res.ok && res.why !== 'empty') row.appendChild(btn('btn btn-primary', '다시 저장하기', () => { r.step = 'done'; finishRound(); }));
  if (res.ok && planTopic(S.list, nonsulMap(), Date.now())) row.appendChild(btn('btn btn-primary', '🖊️ 다음 주제', () => guardStart('korean', () => startRound(false))));
  row.appendChild(btn('btn', '🖊️ 논술 처음으로', () => { S.r = null; renderHome(); window.scrollTo(0, 0); }));
  box.appendChild(row);
  const cb = catchBtnEl(); // 🎯 논술 잡기 기회가 있으면(그날 첫 판 · 처음 ⭐ — v338) 논술 포켓몬 잡기
  if (cb) box.appendChild(cb);
  if (res.ok && r.battle) { // ⚔️ 배틀 단추 (v325) — 이 끝 화면이 떠 있을 때만 열린다 · 🎯 잡기를 준비하는 동안은 안 눌린다 (🔍 Codex 129차 #1·#4)
    const offer = r.battle;
    box.appendChild(offerEl(offer, 'view-nonsul', () => { r.battle = null; if (S.r === r && nonsulVisible()) renderRound(); }, { live: () => S.r === r && r.battle === offer, busy: () => !!S.catching }));
  }
  if (res.ok) addCell(box, 'nonsul', { live: () => S.r === r }); // 🟢 숨은 셀 (v352)
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

/** 잡은 뒤(또는 못 열었을 때) 지금 화면을 다시 그린다 — 쓰기 화면은 다시 그리지 않는다(쓰던 칸·커서를 지키게) */
function refreshAfterCatch() {
  if (!nonsulVisible()) return;
  if (S.r) renderRound();
  else if (!S.w) renderHome();
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
  if (isBattleOpen()) { await st.hold.refund(giveBack); done(); return; } // 뺀 사이 ⚔️ 배틀이 열렸다 — 겹쳐 열지 않고 돌려준다 (🔍 Codex 129차 #4)
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
  // 📖 국어 글(v316)은 기다리지 않는다 — 화면을 먼저 그리고, 받으면 글이 아직 안 붙은 독서 논술 판만 다시 그린다(고른 것·펼친 상태는 판에 남아 있다) (🔍 Codex 122차 #2)
  loadStories().then(() => {
    const r = S.r;
    const m = mainEl();
    if (r && r.t.card && S.stories && S.stories.has(r.t.card) && nonsulVisible() && m && !m.querySelector('.ns-story-text')) renderRound();
  }).catch(() => {});
  try { await profileReady(); } catch { /* 못 읽어도 빈 칸으로 그린다 */ }
  // 📥 ✍️ 짧은 글 아빠 답장 — 국어와 같은 파일에서 받아 그 글에 한 번만 붙인다(보상도 한 트랜잭션) · 못 받으면 조용히
  syncWrites(S.wcards).then((r) => {
    const line = appliedLine(r, 'N');
    if (!line) return;
    S.writeNote = line;
    if (nonsulVisible() && !S.r && !S.w) renderHome();
  }).catch(() => {});
  if (!nonsulVisible()) return;
  if (S.r) renderRound();
  else if (S.w) renderWrite();
  else renderHome();
  // 📣 응원 포켓몬 그림 · 🚀 오늘 끝낸 글·판 수 · 끝나지 않은 논술 로켓단이 있으면 이어 간다 — 풀던 판·쓰던 글이 있으면 그것을 마친 뒤 (v327)
  warmKorCheer();
  loadKorRocketToday().catch(() => {});
  resumeKorRocketIfAny({ kind: 'nonsul', visible: nonsulVisible, busy: () => !!(S.r && S.r.step !== 'done') || !!S.w || !!S.catching, makeQ: nsMakeQ });
}

// ───────────────────── 📖 국어 글에서 들어오기 (v316) ─────────────────────

/**
 * 그 국어 글로 만든 독서 논술 주제 — 아직 ⭐가 아니면 { id, icon, q }, 없거나 ⭐면 null (국어 글을 다 읽은 화면이 단추를 띄울지)
 * 원고를 못 받으면 null (단추가 안 뜰 뿐)
 */
export async function readingTopicFor(cardId) {
  await loadData();
  const t = readingTopicOf(S.list, cardId);
  if (!t) return null;
  try { await profileReady(); } catch { /* 못 읽으면 ⭐인지 모른다 — 단추를 띄운다(판은 연습이면 연습으로 저장) */ }
  return isSolved(nonsulMap()[t.id]) ? null : { id: t.id, icon: t.icon, q: t.q };
}
/** 그 주제로 판을 준비한다 — 부르는 쪽이 이어서 논술 화면을 연다(enterNonsul이 이 판을 그린다) · 푸는 판·쓰기 화면은 버린다 */
export function openTopic(id) {
  if (!byId(id)) return false;
  startRound(false, id);
  return true;
}

/** 배선 — ← 과목 고르기 */
export function initNonsul({ showView }) {
  if (S.wired) return;
  S.wired = true;
  const back = $('btn-nonsul-back');
  if (back) back.addEventListener('click', () => showView('home'));
}
