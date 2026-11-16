// 📝 영어 영상 시험 창 (v430, 2026-11-16 아버님 「추천대로」 — 설계 .context/v430/spec.md) — 그리기·흐름만 (규칙은 entest.js · 원고 사본은 entestsync.js)
// 자리: 영어 목록 영상 카드 「📝 시험」 → 그 영상을 열고(player.openPlayer(id, { test: true })) 메타데이터 뒤 **플레이어 위를 다 덮는 불투명 창** —
//   영상 그림은 시험 내내 안 보인다(쿵푸팬더 4·수퍼 소닉 3은 화면에 한글이 박혀 있다) · 🔊 듣기 문제는 그 장면(원고 at~end) 소리만(player가 튼다) + 다시 듣기
// 창: 시작(단계 이름 칩 — 열린 단계 중 가장 높은 단계를 골라 둠 · 넘은 단계는 칩으로 다시 고른다) → 문제(고르기 · 쳐 넣기 · 카드 놓기) →
//   답마다 맞음/틀림과 풀이 → 끝(「20개 중 N개 맞았어요」 · 받은 💰 · 다음 단계 열림 · 다시 풀기·닫기) → 그 단계 100점을 처음이면 🎯 영어 포켓몬 잡기
// 채점은 문제마다 **처음 낸 답만**(빈 답은 낸 답이 아니다) · 판 안에서는 「몇 번째 문제」만(남은 수·밀린 수 금지) · 판 도중 닫으면 결과 없음(보상 없음)
// 결과는 xp.enTestFinish 한 번(한 트랜잭션 — 💰 차액·넘은 단계·🎯 기회·하루 칸은 거기서) · 💰는 그 결과만 보여 준다(player.awardCoins를 쓰지 않는다)
// 🎯 잡기(runEnCatch)는 국어 runKorCatch·음악 runMusicCatch 차례 그대로 — 한 번에 하나 · 띄우기 전에 빼고(못 빼면 안 띄움) · 판정 때 장부 줄을 지우고 ·
//   안 던지고 닫으면 돌려준다 · 앱이 꺼져 남은 장부 줄은 영어 목록에 들어올 때(enterEnList) 돌려준다 ·
//   후보는 player.englishCandidates와 같은 거름(영어 명단 · 🕳 울트라홀 · 레벨에 열린 것 · ❤️ 켰을 때 😴 빼고) — 시험 끝 화면·영어 목록 단추 두 길 모두 enPool 하나
// ★ player.js·library.js를 import하지 않는다(그 둘이 이 파일을 부른다 — 고리 없음)
import { STAGES, STAGE_QS, STAGE_NAMES, askOf, isListen, dealRound, judge, tally, testOf, enRecFor, stageNow, stagesOpen, everOpened } from './entest.js';
import { guardStart } from './timeup.js'; // ⏳ 오늘 영어 시간이 다 됐으면 새 판은 연장권 뒤 「계속하기」로 (영어 목록 「📝 시험」과 같은 막이)
import { enTestsNow } from './entestsync.js';
import { enTestFinish, enTakeThrow, enGiveBackThrow, enThrowsLeft, enJudged, enTestMap, catchAttempt, getLevelInfo, isTired, getLook, inventory } from './xp.js';
import { openCatch, isCatchOpen, josa } from './catch.js';
import { loadCharacters, downloadCharacters, pickCharacters, forSubject, forHole, isUnlocked } from './pokemon.js';
import { holdStore, refundOutcome, PAGE_ID } from './throwhold.js'; // 🎯 뺀 기회 장부 (국어·수학·음악과 같은 도구)
import { getMath } from './db.js'; // 🕳 울트라홀 — 수학 💎 배지 여덟 (player.refreshHole과 같은 원천)
import { gymClaimed } from './mathprog.js';
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
const own = (o, k) => !!o && Object.prototype.hasOwnProperty.call(o, k);

/** 잡기 후보 수 · 끝 화면을 보여 준 뒤 잡기 화면까지 (점수를 먼저 보게) */
export const CANDS = 4;
export const CATCH_DELAY_MS = 1200;
/** 보기가 영어인 고르기 유형 (나머지 고르기는 보기가 우리말) */
const EN_OPTS = new Set(['wordko', 'hear', 'match', 'hearsent', 'grammar', 'next']);
/** 문장을 그대로 보여 주는 고르기 유형 — 「이 문장에서」·「이 말」을 묻는다 (낱말·표현은 형광펜) */
const SAY_SHOWN = new Set(['word', 'meaning', 'why', 'idiom']);

// w = 열린 창 { title, stages, hooks, pick 고른 단계, step 'start'|'q'|'done', round, catchTimer, mute }
// round = { id, stage, deal, k 지금 문제, ans[k] = { ok, j, given } 처음 낸 답, cur 지금 문제 칸 상태, saving, sent, result, correct }
const S = { w: null, catching: false, catchState: null, catchMsg: '' };
let roundSeq = 0;

const rootEl = () => $('en-test');
const mainEl = () => $('en-test-main');

/** 📝 시험 창이 떠 있나 */
export function isEnTestOpen() {
  return !!S.w;
}

/**
 * 📝 시험 창 열기 (player.startTestNow) — 그 영상 원고가 받아져 있어야 연다(아니면 false)
 * @param {string} title 영상 제목(item.title — 원고 from과 같은 글)
 * @param {{listen?:(q:object)=>boolean, onClose?:Function, onCoins?:Function}} [hooks] listen = 🔊 그 장면 소리(틀었으면 true) ·
 *   onClose = 아이가 「닫기」로 닫았을 때(창은 이미 닫혔다 — closeEnTest로 접을 때는 안 부른다) · onCoins = 💰를 받았을 때(칩 다시 그리기)
 */
export function openEnTest(title, hooks = {}) {
  closeEnTest();
  const stages = testOf(enTestsNow().tests, title);
  const root = rootEl();
  if (!stages || !root) return false;
  settleLostEnCatch(); // 지난 잡기 창이 소식 없이 닫혔으면 먼저 — 단추가 「도는 중」으로 잠긴 채 남지 않게
  S.w = { title, stages, hooks: hooks || {}, pick: stageNow(enRecFor(enTestMap(), title)), step: 'start', round: null, catchTimer: null, mute: false };
  root.hidden = false;
  render();
  toTop();
  return true;
}

/** 시험 창 접기 — 영상을 닫을 때·다른 길로 나갈 때 (판 도중이면 결과·보상 없음 · onClose는 안 부른다) */
export function closeEnTest() {
  const w = S.w;
  S.w = null;
  if (w && w.catchTimer) clearTimeout(w.catchTimer);
  stopSpeak();
  const root = rootEl();
  if (root) root.hidden = true;
  const m = mainEl();
  if (m) m.innerHTML = '';
}

/** 아이가 「닫기」·「그만하기」를 눌렀다 — 접고 플레이어에 알린다(보던 자리로) */
function userClose() {
  const w = S.w;
  if (!w) return;
  const done = w.hooks && w.hooks.onClose;
  closeEnTest();
  if (typeof done === 'function') { try { done(); } catch { /* 플레이어가 못 받아도 창은 닫혔다 */ } }
}

function toTop() {
  const r = rootEl();
  if (r) r.scrollTop = 0;
}

// ───────────────────── 그리기 ─────────────────────

function render() {
  const w = S.w;
  const m = mainEl();
  if (!w || !m) return;
  m.innerHTML = '';
  const card = el('section', 'gr-card et-card');
  card.appendChild(headEl(w));
  if (w.step === 'start') startEl(card, w);
  else if (w.step === 'q') questionEl(card, w);
  else doneEl(card, w);
  m.appendChild(card);
}

/** 머리 — 🎬 영상 제목 · 푸는 중이면 「단계 · 몇 번째 문제」 · 닫기 */
function headEl(w) {
  const head = el('div', 'et-head');
  const t = el('div', 'et-head-text');
  t.appendChild(el('p', 'et-film', `🎬 ${w.title}`));
  const r = w.round;
  if (w.step === 'q' && r) t.appendChild(el('p', 'et-step', `📝 ${STAGE_NAMES[r.stage - 1]} · ${r.k + 1}번째 문제`));
  else t.appendChild(el('p', 'et-step', '📝 영상 시험'));
  head.appendChild(t);
  // 푸는 중에 닫으면 그 판은 없던 것 (보상 없음) — 글로 알 수 있게 「그만하기」
  head.appendChild(btn('btn et-close', w.step === 'q' ? '그만하기 ✕' : '닫기 ✕', userClose));
  return head;
}

/** 시작 — 단계 이름 칩(열린 단계만 · 넘은 단계는 ✅ · 그 단계 100점이면 💯) · 지금 단계 · 시작 · 🎯 */
function startEl(card, w) {
  const rec = enRecFor(enTestMap(), w.title);
  const open = stagesOpen(rec);
  if (!open.includes(w.pick)) w.pick = open[open.length - 1];
  card.appendChild(el('p', 'gr-ask', '단계를 골라요'));
  const row = el('div', 'et-chips');
  for (const s of open) {
    const mark = rec.p[s - 1] === 100 ? ' 💯' : rec.s >= s ? ' ✅' : '';
    const c = btn(`et-chip${s === w.pick ? ' is-on' : ''}`, `${STAGE_NAMES[s - 1]}${mark}`, () => {
      if (S.w !== w || w.step !== 'start') return;
      w.pick = s;
      render();
    });
    c.dataset.stage = String(s);
    c.setAttribute('aria-pressed', s === w.pick ? 'true' : 'false');
    row.appendChild(c);
  }
  card.appendChild(row);
  card.appendChild(el('p', 'et-now', `지금 단계: ${STAGE_NAMES[w.pick - 1]}`));
  card.appendChild(el('p', 'et-rule', '80점을 넘으면 다음 단계가 열려요 · 단계마다 처음 100점이면 🎯 영어 포켓몬을 만나요'));
  card.appendChild(btn('btn btn-primary btn-big-wide et-go', '시작 ▶', () => startRound(w, w.pick)));
  card.appendChild(catchBox());
}

/**
 * 100점 끝 화면에서 1.2초가 지나기 전에 단추(다시 풀기·다음 단계·단계 고르기)를 눌렀다 — 「끝나자마자 잡기 화면」이 먼저 (설계서) ·
 * 잡기 창을 닫은 뒤 같은 단추를 다시 누르면 그때 그 일을 한다 → 잡기를 먼저 띄웠나
 */
function catchFirst(w) {
  if (!w.catchTimer) return false;
  clearTimeout(w.catchTimer);
  w.catchTimer = null;
  const r = w.round;
  runEnCatch(() => S.w === w && w.round === r && w.step === 'done').catch(() => {});
  return true;
}

/** 판 시작 — 그 단계 문제·보기·카드 차례를 새로 섞는다 (다시 풀 때마다) · ⏳ 시간이 다 됐으면 연장권 뒤 「계속하기」로 */
function startRound(w, stage) {
  if (S.w !== w || catchFirst(w)) return;
  // ⏳ 연장권 뒤 「계속하기」는 누른 때와 같은 화면일 때만 (그 사이 같은 창에서 다른 판을 시작했으면 덮어쓰지 않는다 — 🔍 Codex 236차 #1)
  const r0 = w.round;
  const step0 = w.step;
  guardStart('english', () => { if (w.round === r0 && w.step === step0) beginRound(w, stage); });
}
function beginRound(w, stage) {
  if (S.w !== w || w.step === 'q' || (w.round && w.round.saving)) return; // 푸는 중·저장 중인 판 위에 새 판을 덮지 않는다
  settleLostEnCatch(); // 지난 잡기 창이 소식 없이 닫혔으면 먼저
  if (S.catching || isCatchOpen()) return; // 🎯 잡기를 부르는 중·잡기 창이 떠 있다 — 그 밑에서 판을 시작하지 않는다 (음악 ▶와 같은 막이)
  const qs = w.stages[stage - 1];
  if (!Array.isArray(qs) || qs.length < STAGE_QS) return;
  if (stage > stageNow(enRecFor(enTestMap(), w.title))) return; // 아직 안 열린 단계 (다른 창에서 기록이 바뀌었을 때)
  stopSpeak();
  w.pick = stage;
  w.round = { id: ++roundSeq, stage, deal: dealRound(qs), k: 0, ans: [], cur: null, saving: false, sent: false, result: null, correct: 0 };
  w.step = 'q';
  render();
  toTop();
  autoListen(w);
}

/** 지금 문제 칸 상태 (쳐 넣기 글 · 놓은 카드) — 문제가 바뀌면 새로 */
function curOf(r) {
  if (!r.cur || r.cur.k !== r.k) r.cur = { k: r.k, input: '', placed: [] };
  return r.cur;
}

function questionEl(card, w) {
  const r = w.round;
  const d = r.deal[r.k];
  const q = d.q;
  const a = r.ans[r.k] || null;
  if (isListen(q)) card.appendChild(listenEl(w, q));
  card.appendChild(el('p', 'gr-ask', askOf(q)));
  const sent = sentEl(q, a);
  if (sent) card.appendChild(sent);
  if (q.kind === 'type' && typeof q.hint === 'string' && q.hint) card.appendChild(el('p', 'et-hint', `💡 ${q.hint}`));
  if (q.kind === 'pick') pickEl(card, w, r, d, q, a);
  else if (q.kind === 'type') typeEl(card, w, r, q, a);
  else orderEl(card, w, r, d, q, a);
  if (a) {
    card.appendChild(fbEl(q, a));
    const last = r.k + 1 >= r.deal.length;
    card.appendChild(btn('btn btn-primary btn-big-wide gr-next et-next', last ? '다 했어요 →' : '다음 →', () => next(w, r)));
  }
}

/** 🔊 듣기 문제 머리 — 그 장면 소리 다시 듣기 (그림은 이 창이 덮고 있다) */
function listenEl(w, q) {
  const box = el('div', 'et-listen');
  box.appendChild(btn('btn et-listen-btn', '🔊 다시 듣기', () => playScene(w, q)));
  box.appendChild(el('p', 'et-listen-note', w.mute ? '🔇 소리가 안 나왔어요 — 🔊를 한 번 더 눌러 봐요' : '🎬 영상 속 그 장면 소리예요'));
  return box;
}

/** 영어 한 줄 — ___ 자리는 빈칸(답한 뒤엔 정답으로 채움) · mark면 그 낱말·표현에 형광펜 */
function enLine(text, cls = '', { fill = '', mark = '' } = {}) {
  const p = el('p', `gr-en-line et-en${cls ? ` ${cls}` : ''}`);
  p.setAttribute('lang', 'en');
  const s = String(text == null ? '' : text);
  if (s.includes('___')) {
    const parts = s.split('___');
    p.appendChild(document.createTextNode(parts[0]));
    p.appendChild(el('span', `gr-blank${fill ? ' is-filled' : ''}`, fill || '____'));
    p.appendChild(document.createTextNode(parts.slice(1).join('___')));
    return p;
  }
  if (mark) {
    const esc = String(mark).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const m = new RegExp(`(^|[^A-Za-z'])(${esc})(?=$|[^A-Za-z'])`, 'i').exec(s);
    if (m) {
      const at = m.index + m[1].length;
      p.appendChild(document.createTextNode(s.slice(0, at)));
      p.appendChild(el('mark', 'et-mark', s.slice(at, at + m[2].length)));
      p.appendChild(document.createTextNode(s.slice(at + m[2].length)));
      return p;
    }
  }
  p.textContent = s;
  return p;
}

/**
 * 문제 글 상자 — 앞뒤 대사(ctx) · 빈칸 문장(en) · 「이 문장」을 묻는 유형은 대사(say) ·
 * 🔊 듣기 문제는 답하기 전엔 say를 안 보인다(빈칸 문장만) · 다음 말(next)은 앞 대사 뒤 「?」 줄 · 답한 뒤엔 빈칸을 정답으로 채운다
 */
function sentEl(q, a) {
  const box = el('div', 'gr-sent et-sent');
  const ctx = q.ctx && typeof q.ctx === 'object' ? q.ctx : {};
  const before = Array.isArray(ctx.before) ? ctx.before : [];
  const after = Array.isArray(ctx.after) ? ctx.after : [];
  const fill = a ? okTextOf(q) : '';
  for (const line of before) box.appendChild(enLine(line, 'is-ctx'));
  if (q.type === 'next') box.appendChild(a ? enLine(q.say, 'is-say') : el('p', 'et-ask-next', '❓'));
  else if (typeof q.en === 'string' && q.en) box.appendChild(enLine(q.en, 'is-say', { fill }));
  else if (SAY_SHOWN.has(q.type)) box.appendChild(enLine(q.say, 'is-say', { mark: q.type === 'word' ? q.w : q.type === 'idiom' ? q.x : '' }));
  for (const line of after) box.appendChild(enLine(line, 'is-ctx'));
  return box.children.length ? box : null;
}

/** 맞는 답 글 (고르기 정답 보기 · 쳐 넣기 ans 첫째 · 순서 문장) */
function okTextOf(q) {
  return judge(q, null).okText;
}

function optEl(text, state, english, onPick) {
  const b = el('button', `kor-opt et-opt${english ? ' gr-opt' : ''}${state === 'ok' ? ' is-ok' : state === 'no' ? ' is-no' : state === 'dim' ? ' is-dim' : ''}`);
  b.type = 'button';
  if (english) b.setAttribute('lang', 'en');
  b.appendChild(el('span', 'kor-opt-mark', state === 'ok' ? '✓' : state === 'no' ? '✗' : '•'));
  b.appendChild(el('span', '', text));
  b.disabled = !!state;
  if (!state) b.addEventListener('click', onPick);
  return b;
}

/** 고르기 — 보기 넷(섞은 차례) · 처음 고른 것만 · 고른 뒤엔 내가 고른 것과 정답을 표시하고 잠근다 */
function pickEl(card, w, r, d, q, a) {
  const list = el('div', 'kor-opts et-opts');
  const english = EN_OPTS.has(q.type);
  const k = r.k;
  for (const oi of d.opts) {
    const o = q.opts[oi];
    let state = '';
    if (a) state = o.ok === true ? 'ok' : a.given === oi ? 'no' : 'dim';
    list.appendChild(optEl(o.t, state, english, () => answer(w, r, k, judge(q, oi), oi)));
  }
  card.appendChild(list);
}

/** 쳐 넣기 — 칸 하나 + 확인 (빈 칸은 낸 답이 아니다) · 낸 뒤엔 칸 대신 내가 쓴 답 */
function typeEl(card, w, r, q, a) {
  const k = r.k;
  if (a) {
    if (!a.ok) {
      const mine = el('p', 'et-mine');
      mine.appendChild(document.createTextNode('내가 쓴 답: '));
      const b = el('b', '', String(a.given));
      b.setAttribute('lang', 'en');
      mine.appendChild(b);
      card.appendChild(mine);
    }
    return;
  }
  const s = curOf(r);
  const form = el('form', 'gr-type et-type');
  form.setAttribute('autocomplete', 'off');
  const input = el('input', 'gr-input et-input');
  input.type = 'text';
  input.value = s.input;
  input.setAttribute('lang', 'en');
  input.setAttribute('autocapitalize', 'off');
  input.setAttribute('autocorrect', 'off');
  input.setAttribute('spellcheck', 'false');
  input.setAttribute('aria-label', '빈칸에 쓸 말');
  input.placeholder = '여기에 써요';
  input.addEventListener('input', () => { s.input = input.value; });
  form.appendChild(input);
  const ok = el('button', 'btn btn-primary gr-check', '확인');
  ok.type = 'submit';
  form.appendChild(ok);
  form.addEventListener('submit', (e) => {
    if (e && typeof e.preventDefault === 'function') e.preventDefault();
    const text = input.value;
    // 한글 자판으로 친 글은 낸 답으로 세지 않는다 — 처음 낸 답만 세므로 자판 실수가 틀림으로 굳지 않게 (✍️ 에세이와 같은 거름)
    if (/[가-힣ㄱ-ㅎㅏ-ㅣ]/.test(String(text))) { s.ko = true; render(); return; }
    const j = judge(q, text);
    if (j.kind === 'empty') { try { input.focus(); } catch { /* 없어도 */ } return; }
    s.ko = false;
    answer(w, r, k, j, String(text).trim());
  });
  card.appendChild(form);
  if (s.ko) card.appendChild(el('p', 'et-ko-key', '⌨️ 영어 자판으로 바꿔서 써 주세요'));
  setTimeout(() => { if (S.w === w && w.round === r && r.k === k && !r.ans[k]) { try { input.focus({ preventScroll: true }); } catch { /* 없어도 */ } } }, 0);
}

/** 순서 — 카드를 눌러 차례로 놓기 · 놓은 카드를 누르면 빼기 · ↩ 하나 빼기 · 다 놓으면 확인 · 낸 뒤엔 어긋난 자리부터 빨갛게 */
function orderEl(card, w, r, d, q, a) {
  const k = r.k;
  const s = curOf(r);
  const placed = a ? a.given : s.placed;
  const bad = a && !a.ok ? (Number.isInteger(a.j.at) ? a.j.at : 0) : -1;
  const built = el('div', 'gr-built et-built');
  built.setAttribute('lang', 'en');
  if (!placed.length) built.appendChild(el('span', 'gr-built-empty', '여기에 문장이 차례로 쌓여요'));
  placed.forEach((ti, pos) => {
    const b = btn(`gr-tile is-placed${a ? (a.ok ? ' is-ok' : pos >= bad ? ' is-bad' : '') : ''}`, q.tiles[ti], () => {
      if (S.w !== w || w.round !== r || r.k !== k || r.ans[k]) return;
      s.placed.splice(pos, 1);
      render();
    });
    b.disabled = !!a;
    built.appendChild(b);
  });
  card.appendChild(built);
  if (a) return;
  const pool = el('div', 'gr-pool et-pool');
  pool.setAttribute('lang', 'en');
  for (const ti of d.tiles) {
    if (s.placed.includes(ti)) continue;
    pool.appendChild(btn('gr-tile', q.tiles[ti], () => {
      if (S.w !== w || w.round !== r || r.k !== k || r.ans[k] || s.placed.includes(ti)) return;
      s.placed.push(ti);
      render();
    }));
  }
  card.appendChild(pool);
  const row = el('div', 'gr-order-btns');
  const chk = btn('btn btn-primary gr-check', '확인', () => {
    if (s.placed.length !== q.tiles.length) return;
    answer(w, r, k, judge(q, s.placed.slice()), s.placed.slice());
  });
  chk.disabled = s.placed.length !== q.tiles.length;
  row.appendChild(chk);
  if (s.placed.length) {
    row.appendChild(btn('btn et-undo', '↩ 하나 빼기', () => {
      if (S.w !== w || w.round !== r || r.k !== k || r.ans[k]) return;
      s.placed.pop();
      render();
    }));
  }
  card.appendChild(row);
}

/** 풀이 — 맞음/틀림 · 고른 틀린 보기의 까닭·쳐 넣기 흔한 오답 풀이 · 맞는 답(쳐 넣기·순서) · 정답 풀이 · 그 대사와 우리말 뜻 */
function fbEl(q, a) {
  const box = el('div', `et-fb${a.ok ? ' is-ok' : ' is-no'}`);
  const j = a.j;
  if (a.ok) box.appendChild(el('p', 'kor-fb is-ok', '✓ 맞아요!'));
  else {
    box.appendChild(el('p', 'kor-fb is-no', j.kind === 'apos' ? `✗ ${j.why}` : '✗ 아쉬워요'));
    if (j.why && j.kind !== 'apos') box.appendChild(el('p', 'et-why', j.why));
    if (q.kind !== 'pick') {
      const right = el('p', 'et-right');
      right.appendChild(document.createTextNode('맞는 답: '));
      const b = el('b', '', j.okText);
      b.setAttribute('lang', 'en');
      right.appendChild(b);
      box.appendChild(right);
    }
  }
  if (j.expl) box.appendChild(el('p', 'et-expl', `💡 ${j.expl}`));
  const line = el('div', 'et-line');
  // 대사 한 줄은 문제 글 상자에 다 보이지 않았을 때만 (🔊 문장 듣기·우리말 → 문장·순서 · 괄호가 붙은 꼴 바꾸기) — 빈칸 문장은 정답으로 채워졌다
  if (q.type === 'form' || (!q.en && !SAY_SHOWN.has(q.type) && q.type !== 'next')) line.appendChild(enLine(q.say, 'is-say'));
  if (typeof q.ko === 'string' && q.ko) line.appendChild(el('p', 'gr-kor et-ko', `💬 ${q.ko}`));
  if (line.children.length) box.appendChild(line);
  return box;
}

// ───────────────────── 판 흐름 ─────────────────────

/** 처음 낸 답만 적는다 — 이미 낸 문제·다른 판·빈 답(kind 'empty')은 무시 */
function answer(w, r, k, j, given) {
  if (S.w !== w || w.round !== r || w.step !== 'q' || r.k !== k || r.ans[k]) return;
  if (!j || j.kind === 'empty') return;
  r.ans[k] = { ok: !!j.ok, j, given };
  stopSpeak();
  ding(!!j.ok);
  render();
  showNext();
}

/** 답한 뒤 풀이·「다음 →」이 창 아래로 밀려 있으면 끌어올린다 (1024×600 — 긴 문제·보기 넷 아래) · 시험 창 안에서만 */
function showNext() {
  const root = rootEl();
  const nx = root && (root.querySelector('.et-next') || root.querySelector('.et-fb'));
  if (!nx || typeof nx.scrollIntoView !== 'function') return;
  try { nx.scrollIntoView({ block: 'nearest' }); } catch { /* 옛 기기 — 손으로 내리면 된다 */ }
}

/** 다음 문제 — 마지막이면 끝 화면과 저장 (두 번 눌러도 한 번) */
function next(w, r) {
  if (S.w !== w || w.round !== r || w.step !== 'q' || !r.ans[r.k]) return;
  stopSpeak();
  if (r.k + 1 < r.deal.length) {
    r.k += 1;
    r.cur = null;
    render();
    toTop();
    autoListen(w);
    return;
  }
  w.step = 'done';
  render();
  toTop();
  finishRound(w, r);
}

/**
 * 판 끝 — 처음 낸 답으로 센 맞힌 수·틀린 유형을 xp.enTestFinish에 **한 번** (저장 실패면 「다시 저장하기」로만 다시) ·
 * 창을 닫는 사이 끝나도 결과는 저장된다(다 푼 판) — 그때는 그리지 않고 🎯도 띄우지 않는다(기회는 영어 목록 단추로)
 */
async function finishRound(w, r) {
  if (r.saving || r.sent) return;
  r.saving = true;
  const t = tally(r.deal.map((d, k) => ({ q: d.q, ok: !!(r.ans[k] && r.ans[k].ok) })));
  r.correct = t.correct;
  let res;
  try { res = await enTestFinish({ title: w.title, stage: r.stage, correct: t.correct, wrong: t.wrong }); } catch { res = { ok: false, why: 'save' }; }
  r.saving = false;
  r.result = res || { ok: false, why: 'save' };
  if (r.result.ok) {
    r.sent = true;
    if (r.result.coins > 0 && w.hooks && typeof w.hooks.onCoins === 'function') { try { w.hooks.onCoins(r.result.coins); } catch { /* 칩만 못 바꿈 */ } }
    if (r.result.passed) { try { sfx.success(); } catch { /* 소리는 없어도 */ } }
  }
  if (S.w !== w || w.round !== r) return;
  render();
  if (r.result.ok && r.result.chance) {
    w.catchTimer = setTimeout(() => {
      w.catchTimer = null;
      // 그림을 받는 사이(최대 8초) 창을 닫거나 다른 판으로 갔으면 띄우지 않는다(뺐다면 돌려준다) — 기회는 단추로 남는다
      const still = () => S.w === w && w.round === r && w.step === 'done';
      if (still()) runEnCatch(still).catch(() => {});
    }, CATCH_DELAY_MS);
  }
}

/**
 * 끝 화면 줄 (순수) — 받은 💰 · 다음 단계 열림 · 넘음 · 🎯 · 저장 못 함 (숫자는 💰만 — 남은 수·밀린 수 없음)
 * @param {object} res xp.enTestFinish의 돌려줌
 * @returns {string[]}
 */
export function doneLines(res) {
  if (!res || !res.ok) return [res && res.why === 'save' ? '😢 기록을 저장하지 못했어요 — 「다시 저장하기」를 눌러 주세요' : '😢 이번 판 기록은 저장되지 않았어요'];
  const out = [];
  if (res.coins > 0) out.push(`💰 ${res.coins} 받았어요!`);
  if (res.passed && res.opened) { const nm = STAGE_NAMES[res.opened - 1]; out.push(`🎉 다음 단계 「${nm}」${josa(nm, '이', '가')} 열렸어요!`); }
  else if (res.passed && res.firstPass && res.stage === STAGES) out.push('🏆 마지막 단계까지 넘었어요!');
  else if (res.passed) out.push('✅ 이 단계를 넘었어요');
  else if (res.s >= res.stage) out.push('✅ 이 단계는 전에 넘었어요');
  else out.push(res.stage < STAGES ? '80점을 넘으면 다음 단계가 열려요 — 다시 풀어 봐요' : '80점을 넘으면 이 단계를 넘어요 — 다시 풀어 봐요');
  if (res.chance) out.push('🎯 처음 100점! 영어 포켓몬을 만나러 가요');
  return out;
}

/** 끝 — 「20개 중 N개 맞았어요」 · 💰 · 다음 단계 · 다시 풀기 · (열렸으면) 다음 단계 · 닫기 · 🎯 */
function doneEl(card, w) {
  const r = w.round;
  const box = el('div', 'gr-done et-done');
  if (r.saving || !r.result) {
    box.appendChild(el('p', 'gr-done-title', '저장하는 중…'));
    card.appendChild(box);
    return;
  }
  const res = r.result;
  box.appendChild(el('p', 'gr-done-title et-score', `${STAGE_QS}개 중 ${res.ok ? res.correct : r.correct}개 맞았어요`));
  for (const line of doneLines(res)) box.appendChild(el('p', `gr-done-line${line.startsWith('🎯') || line.startsWith('🎉') ? ' is-gift' : ''}`, line));
  const row = el('div', 'gr-done-btns');
  if (!res.ok && res.why === 'save') row.appendChild(btn('btn', '다시 저장하기', () => { if (S.w === w && w.round === r) { finishRound(w, r); render(); } }));
  row.appendChild(btn('btn', '🔁 다시 풀기', () => startRound(w, r.stage)));
  if (res.ok && res.opened) row.appendChild(btn('btn btn-primary', '다음 단계 ▶', () => startRound(w, res.opened)));
  row.appendChild(btn('btn', '단계 고르기', () => toStart(w, r)));
  row.appendChild(btn('btn', '닫기', userClose));
  box.appendChild(row);
  box.appendChild(catchBox());
  card.appendChild(box);
}

/** 끝 화면 → 시작 화면(단계 칩) — 다른 단계를 다시 고를 때 · 저장 중이면 기다린다 */
function toStart(w, r) {
  if (S.w !== w || w.round !== r || r.saving || catchFirst(w)) return;
  settleLostEnCatch();
  if (S.catching || isCatchOpen()) return; // 잡기 창 밑에서 화면을 바꾸지 않는다
  stopSpeak();
  w.pick = stageNow(enRecFor(enTestMap(), w.title));
  w.step = 'start';
  w.round = null;
  render();
  toTop();
}

// ───────────────────── 🔊 그 장면 소리 ─────────────────────

/** 듣기 문제가 처음 보일 때 한 번 저절로 (「시작」·「다음」을 누른 바로 그때라 소리를 낼 수 있다) */
function autoListen(w) {
  const r = w.round;
  if (!r || w.step !== 'q') return;
  const q = r.deal[r.k].q;
  if (isListen(q) && !r.ans[r.k]) playScene(w, q);
}

/** 🔊 그 장면 — 플레이어가 튼다(원고 대사와 같은 문장 · 없으면 원고 시각) · 못 틀면 기기 읽어 주기 · 둘 다 안 되면 🔇 한 줄 */
function playScene(w, q) {
  if (S.w !== w) return;
  let ok = false;
  try { ok = !!(w.hooks && typeof w.hooks.listen === 'function' && w.hooks.listen(q)); } catch { ok = false; }
  if (!ok) ok = speak(q.say);
  if (w.mute !== !ok) { w.mute = !ok; if (w.step === 'q') render(); }
}

/** 기기 읽어 주기 (장면을 못 찾았을 때만) → 읽기 시작했나 */
function speak(text) {
  try {
    const ss = globalThis.speechSynthesis;
    const U = globalThis.SpeechSynthesisUtterance;
    if (!ss || typeof U !== 'function' || !text) return false;
    ss.cancel();
    const u = new U(String(text));
    u.lang = 'en-US';
    u.rate = 0.9;
    ss.speak(u);
    return true;
  } catch { return false; }
}
function stopSpeak() {
  try { const ss = globalThis.speechSynthesis; if (ss) ss.cancel(); } catch { /* 없어도 */ }
}

// ───────────────────── 📝 카드 단추 (영어 목록) ─────────────────────

/**
 * 영어 목록 카드마다 「📝 시험」 단추 (순수) — 그 영상 원고가 받아져 있고(tests) · 시험이 열린 영상(openMap — entest.openMapOf · 같은 제목이면 첫 편)일 때만 ·
 * 단추 글엔 지금 단계 이름만(숫자 셈 없음)
 * @param {object[]} items 영상 목록
 * @param {Object<string, {id:string, open:boolean}>} openMap entest.openMapOf
 * @param {object} tests entestsync.enTestsNow().tests
 * @param {object} recs xp.enTestMap()
 * @returns {Object<string, {title:string, stage:number, label:string}>} 영상 id → 단추
 */
export function testCardsOf(items, openMap, tests, recs) {
  const out = {};
  for (const it of Array.isArray(items) ? items : []) {
    if (!it || typeof it !== 'object' || it.broken || typeof it.title !== 'string') continue;
    const o = own(openMap, it.title) ? openMap[it.title] : null;
    if (!o || o.id !== it.id) continue;
    const rec = enRecFor(recs, it.title);
    if (o.open !== true && !everOpened(rec)) continue; // 한 번 푼 시험은 「한 문장」이 다시 내려가도(영상을 다시 넣음·⚙ 문장 합치기) 그대로
    if (!testOf(tests, it.title)) continue;
    const stage = stageNow(rec);
    out[String(it.id)] = { title: it.title, stage, label: `📝 시험 · ${STAGE_NAMES[stage - 1]}` };
  }
  return out;
}

// ───────────────────── 🎯 영어 포켓몬 잡기 (v430) ─────────────────────
// 그 단계 100점을 처음 넘으면 기회 하나(entest.enTestRule — profile.enThrow.earned +1). 끝 화면 뒤 바로 잡기 화면 · 안 던지고 닫으면 기회로 남아
// 영어 목록(·시험 시작·끝 화면) 「🎯 영어 포켓몬 잡기」 단추(숫자 없음)

/** 못 열었을 때 단추 밑 한 줄 — 숫자 없음 (아이 화면 셈 글 금지) */
export const CATCH_WHY = {
  nopics: '🎯 영어 포켓몬 그림을 아직 못 받았어요 — 인터넷이 되는 곳에서 다시 눌러 주세요 (잡을 기회는 그대로 있어요)',
  noavail: '🎯 지금은 만날 수 있는 영어 포켓몬이 없어요 — 조금 뒤에 다시 눌러 주세요 (잡을 기회는 그대로 있어요)',
  save: '🎯 기록이 잠깐 저장되지 않았어요 — 다시 눌러 주세요 (잡을 기회는 그대로 있어요)',
  error: '🎯 잡기 화면을 열지 못했어요 — 다시 눌러 주세요 (잡을 기회는 돌려놨어요)',
  // 돌려주는 저장까지 안 됐다 — "돌려놨어요"라고 하면 거짓말이다 (국어 Codex 49차 #2와 같은 까닭)
  errorOwed: '🎯 잡기 화면을 열지 못했어요 — 잡을 기회는 영어 목록에 다시 들어오면 돌려줘요',
  owed: '🎯 잡을 기회를 돌려주는 기록이 잠깐 저장되지 않았어요 — 영어 목록에 다시 들어오면 돌려줘요',
};
/** 「다시 들어오면 돌려줘요」 한 줄 — 장부 줄이 정리될 때까지 남긴다 */
const OWED = [CATCH_WHY.owed, CATCH_WHY.errorOwed];

// 🎯 뺀 기회 장부 — 뺄 때 한 줄, 판정이 나면(attempt) 지우고, 돌려주기가 저장되면 지운다. 남은 줄은 영어 목록에 들어올 때 돌려준다
const holds = holdStore('shincoach.entest.throwHolds');
/** 기회 하나 돌려주기 → 'ok' · 'none'(돌려줄 게 없다) · 'fail'(저장 안 됨 — houseDo는 실패를 오류 대신 {ok:false}로 준다) */
async function enGiveBack() {
  try { return refundOutcome(await enGiveBackThrow()); } catch { return 'fail'; }
}
let holdTimer = null;
/** 남은 예약을 돌려준다 — 돌려준 게 있으면 단추를 다시 그린다 · 다른 창의 줄은 그 창이 닫힌 지 1분 뒤에 (그때 다시 돈다) */
function settleEnThrows() {
  return holds.settle(enGiveBack).then((n) => {
    // 「다시 들어오면 돌려줘요」라고 한 이 창의 몫이 다 정리됐으면 그 한 줄을 지운다 (음악 Codex 233차 P3와 같다)
    const cleared = OWED.includes(S.catchMsg) && !Object.values(holds.list()).some((h) => h.page === PAGE_ID);
    if (cleared) S.catchMsg = '';
    if (n > 0 || cleared) drawEnCatch();
    const w = holds.waitMs();
    if (w !== null && !holdTimer) holdTimer = setTimeout(() => { holdTimer = null; settleEnThrows(); }, w + 1000);
    return n;
  }).catch(() => 0);
}
/** 잡기 창이 소식 없이 닫혔다(영상을 닫으며 closeCatch — onDone이 안 온다) — 안 던졌으면 기회를 돌려주고 단추를 다시 살린다 */
function settleLostEnCatch() {
  const st = S.catchState;
  if (!S.catching || !st || isCatchOpen()) return null;
  S.catchState = null;
  S.catching = false;
  if (st.threw) return null; // 판정이 났다 — 쓴 기회
  return st.hold.refund(enGiveBack).then((ok) => { if (!ok) S.catchMsg = CATCH_WHY.owed; drawEnCatch(); });
}

/** 영어 목록에 들어올 때 (library.refreshList) — 소식 없이 닫힌 잡기 창부터, 그다음 앱이 꺼져 남은 장부 줄 (국어 Codex 49차·50차 차례) */
export function enterEnList() {
  return Promise.resolve(settleLostEnCatch()).catch(() => {}).then(() => settleEnThrows()).then(() => { drawEnCatch(); }).catch(() => {});
}

/** ❤️ 파트너 HP를 켰나 (⚙ 설정 — player.loadSettings와 같은 칸 · 기본 켜짐) — 켰을 때만 😴 쉬는 포켓몬을 뺀다(player.unlockedCharacters와 같다) */
function hpOn() {
  try { return JSON.parse(localStorage.getItem('shincoach.settings') || '{}').hp !== false; } catch { return true; }
}

/**
 * 잡기 후보 — player.englishCandidates와 같은 거름: 🎤 영어 명단 · 🕳 울트라홀이 닫혔으면 울트라비스트 빼고 · 레벨에 열린 것 · ❤️를 켰으면 😴 빼고 ·
 * 그림이 넷도 없으면 몇 마리 받아서라도(8초 안에 못 받으면 있는 만큼) — 시험 끝 화면·영어 목록 단추 두 길이 이 하나를 쓴다
 */
async function enPool() {
  const read = async (force = false) => {
    let chars = [];
    try { chars = await loadCharacters(force); } catch { chars = []; }
    let hole = false;
    try { hole = gymClaimed(await getMath()); } catch { hole = false; } // 못 읽으면 닫힌 채로 — 새어 나가지 않는 쪽
    const level = getLevelInfo().level;
    const hp = hpOn();
    return forHole(forSubject(chars, 'english'), hole).filter((c) => isUnlocked(c.id, level) && !(hp && isTired(c.id))).map((c) => ({ ...c, look: getLook(c.id) }));
  };
  let pool = await read();
  if (pool.length < CANDS && (typeof navigator === 'undefined' || navigator.onLine !== false)) {
    let wait = 0;
    let late = false;
    try {
      await Promise.race([downloadCharacters(null, 6, 'english').catch(() => null), new Promise((res) => { wait = setTimeout(() => { late = true; res(); }, 8000); })]);
    } finally { clearTimeout(wait); }
    pool = await read(late);
  }
  return pool;
}

/** 잡기를 띄울 자리인가 — 영어 목록이 보이거나, 플레이어 위에 시험 창이 떠 있고 문제를 푸는 중이 아니다 (그 사이 나갔거나 판을 시작했으면 안 띄운다) */
function enHere() {
  const lib = $('view-library');
  if (lib && !lib.hidden) return true;
  const pl = $('view-player');
  return !!S.w && S.w.step !== 'q' && !!pl && !pl.hidden;
}

/** 🎯 단추 칸 (시험 시작·끝 화면) — 남은 기회가 있을 때만 「🎯 영어 포켓몬 잡기」 · 못 열었을 때 한 줄 */
function catchBox() {
  const box = el('div', 'et-catch');
  box.id = 'et-catch';
  fillEnCatch(box);
  return box;
}
function fillEnCatch(box) {
  settleLostEnCatch(); // 지난 창이 소식 없이 닫혔으면 먼저 — 단추가 「도는 중」으로 잠긴 채 남지 않게
  box.textContent = '';
  const left = enThrowsLeft();
  // 「다시 눌러 주세요 (기회 그대로)」는 누를 단추가 있을 때만 맞는 말 — 기회가 없으면 지운다 · 「돌려줘요」 한 줄은 장부가 정리될 때까지
  if (left <= 0 && !OWED.includes(S.catchMsg)) S.catchMsg = '';
  if (left > 0) {
    const b = btn('btn btn-primary et-catch-btn', '🎯 영어 포켓몬 잡기', () => { runEnCatch().catch(() => {}); });
    b.disabled = !!S.catching;
    box.appendChild(b);
  }
  if (S.catchMsg) box.appendChild(el('p', 'et-catch-msg', S.catchMsg));
  box.hidden = !box.children.length;
}
/** 남은 기회·한 줄이 바뀌었다 — 영어 목록(#library-entest)과 시험 창(#et-catch)의 단추 칸을 다시 */
export function drawEnCatch() {
  for (const id of ['library-entest', 'et-catch']) {
    const box = $(id);
    if (box) fillEnCatch(box);
  }
}

/**
 * 🎯 영어 포켓몬 잡기 — 시험 끝 화면(처음 100점) · 단추(「🎯 영어 포켓몬 잡기」) · 한 번에 하나만
 * @param {Function} [still] 끝 화면에서 저절로 부를 때 — 그 판 끝 화면에 아직 있나 (그림을 받는 사이 닫았거나 다른 판으로 갔으면 안 띄운다)
 */
export async function runEnCatch(still = null) {
  const here = () => enHere() && (typeof still !== 'function' || !!still());
  if (!here()) return;
  await settleLostEnCatch(); // 남은 단추를 눌렀다 — 지난 창이 소식 없이 닫혔으면 먼저 정리
  if (S.catching || isCatchOpen()) return; // 한 번에 하나만 — 다른 잡기 창 위에 겹쳐 열지 않는다
  S.catching = true;
  S.catchMsg = '';
  stopSpeak();
  drawEnCatch();
  const done = () => { S.catching = false; drawEnCatch(); };
  let pool = [];
  try { pool = await enPool(); } catch { pool = []; }
  if (!here()) { done(); return; } // 그 사이 나갔다 — 기회는 그대로(빼기 전)
  if (!pool.length) {
    let hasPics = false;
    try { hasPics = forSubject(await loadCharacters(), 'english').length > 0; } catch { hasPics = false; }
    S.catchMsg = CATCH_WHY[hasPics ? 'noavail' : 'nopics'];
    done();
    return;
  }
  let taken;
  try { taken = await enTakeThrow(); } catch { taken = { ok: false, why: 'save' }; }
  if (!taken || !taken.ok) { S.catchMsg = taken && taken.why === 'none' ? '' : CATCH_WHY.save; done(); return; }
  const st = { threw: false, hold: holds.track() }; // 뺀 기회를 장부에 — 판정 전에 앱이 꺼져도 다음에 돌려준다
  if (!here() || isCatchOpen()) { // 뺀 사이 나갔거나 다른 잡기 창이 열렸다 — 돌려준다
    const back = await st.hold.refund(enGiveBack);
    if (!back) S.catchMsg = CATCH_WHY.owed;
    done();
    return;
  }
  S.catchState = st;
  try {
    openCatch({
      candidates: pickCharacters(pool, CANDS), subject: 'english', note: '📝 영상 시험 100점', xpGain: 0, coinGain: 0, levelInfo: getLevelInfo(), levelUp: 0,
      ballCounts: inventory(),
      // 판정이 나는 순간 쓴 기회 — 장부의 줄을 지운다(동기). 판정 전에 닫히면 attempt가 안 불려 돌려준다 · 📤 하루 칸 잡음·놓침(xp.enJudged)
      attempt: (id, opts) => {
        st.threw = true;
        st.hold.judged();
        const r = catchAttempt(id, Math.random, opts);
        enJudged(id, !!(r && r.caught)).catch(() => {});
        return r;
      },
      // ★ 한 번도 안 던지고 닫았으면 기회를 돌려준다 — 화면을 띄우기 전에 이미 뺐다 (저장이 안 되면 장부에 남아 다음에)
      onDone: (r) => {
        if (S.catchState === st) S.catchState = null;
        if (r && r.threw === false && !st.threw) st.hold.refund(enGiveBack).then((ok) => { if (!ok) S.catchMsg = CATCH_WHY.owed; }).finally(done);
        else done();
      },
    });
  } catch {
    if (S.catchState === st) S.catchState = null;
    const back = await st.hold.refund(enGiveBack);
    S.catchMsg = back ? CATCH_WHY.error : CATCH_WHY.errorOwed;
    done();
  }
}

if (typeof window !== 'undefined') window.__entest = { S, holds, runEnCatch, isEnTestOpen }; // 진짜 Chrome 걷기용
