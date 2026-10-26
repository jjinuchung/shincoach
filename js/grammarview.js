// 📝 영어 문법 화면 (v348, 2026-10-27) — 규칙은 grammar.js · 홈 📝 카드 → 이 화면(⏳는 영어 시간 — app.subjectOfView가 'english')
// 한 판 = 단원 하나: 📘 개념 한 장 → 문제 6(고르기 4 · 쳐 넣기 1 · 순서 1) → 판 끝에 한 번 저장(그만두면 안 남는다 — 🖊️ 논술과 같다)
// 틀려도 하트·감점 없음 — 틀린 보기는 ✗와 왜 한 줄, 다시 고른다 · 처음 한 번 「🔍 어디까지 알까?」(복습 단원마다 한 문제, 한 번씩만 고름)
// 보상은 💰만(아버님 10-27) — 🎁 깜짝 포켓몬은 미리 말하지 않고, 받았을 때 판 끝 화면에 한 줄만
// 아이 화면에는 셈·진행 수를 띄우지 않는다 (2026-10-15) — 단원 지도는 ⭐·✅·🔁 표시만
import { allUnits, allDiag, planUnit, dealRound, judgeType, judgeOrder, joinTiles, grammarFinishText, grammarTodayLine, unitMark, giftPoolOf } from './grammar.js';
import { wordsToday } from './korwords.js';
import { grammarFinish, grammarDiagFinish, grammarMap, grammarDayMap, grammarKnownMap, grammarSeenMap, grammarDiagDay, profileReady, getLevelInfo } from './xp.js';
import { ROSTER, subjectOf, isUnlocked, LEGENDARY } from './pokemon.js';
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
const KIND_ASK = { pick: '알맞은 말을 골라요', type: '빈칸에 알맞은 말을 써요', order: '낱말 카드를 차례대로 눌러 문장을 만들어요' };
const MARK = { star: '⭐', again: '🔁', known: '✅', new: '🌱' };
/** 쳐 넣기·순서에서 이만큼 틀리면 맞는 답을 보여 준다 (막혀서 멈추지 않게) */
const SHOW_AFTER = 2;

// data: 원고 · units: 쓸 수 있는 단원 · diag: 진단 문제 · r: 푸는 판(화면을 떠나도 남아 돌아오면 이어서) · d: 푸는 진단
const S = { data: null, units: [], diag: [], loadErr: '', r: null, d: null, wired: false };

function grammarVisible() {
  const v = $('view-grammar');
  return !!v && !v.hidden;
}
const mainEl = () => $('grammar-main');
const unitById = (id) => S.units.find((u) => u.id === id) || null;

/** 원고 — 한 번 받아 두고 계속 쓴다 (못 받으면 다음에 들어올 때 다시) */
async function loadData() {
  if (S.data) return;
  try {
    const res = await fetch('./coach/english/grammar.json');
    if (!res.ok) throw new Error(String(res.status));
    S.data = await res.json();
    S.units = allUnits(S.data);
    S.diag = allDiag(S.data, S.units);
    S.loadErr = S.units.length ? '' : '단원을 읽지 못했어요';
    if (!S.units.length) S.data = null;
  } catch {
    S.data = null;
    S.loadErr = '단원을 받지 못했어요 — 인터넷이 되는 곳에서 다시 들어와 주세요';
  }
}

/** 🎁 깜짝 포켓몬 후보 — 영어 명단 · 지금 레벨에 열린 것 · 전설 아닌 것 (못 잡은 것은 규칙이 트랜잭션 안에서 고른다) */
function giftPool() {
  let level = 1;
  try { level = getLevelInfo().level; } catch { level = 1; }
  return giftPoolOf(ROSTER, subjectOf, LEGENDARY, (id) => isUnlocked(id, level));
}
const monName = (id) => { const m = ROSTER.find((x) => x.id === id); return m ? m.ko : ''; };

// ───────────────────── 첫 화면 ─────────────────────

function renderHome() {
  const m = mainEl();
  if (!m) return;
  m.innerHTML = '';
  const card = el('section', 'gr-card');
  card.appendChild(el('h2', 'gr-title', '📝 영어 문장 규칙을 익혀요'));
  const how = el('ol', 'gr-how');
  for (const t of ['📘 개념 한 장을 읽어요', '문제 여섯 개를 풀어요 — 고르기 · 써 보기 · 낱말 순서', '틀려도 괜찮아요 — 왜 틀렸는지 보고 다시 해요']) how.appendChild(el('li', '', t));
  card.appendChild(how);
  if (S.loadErr) {
    card.appendChild(el('p', 'gr-err', S.loadErr));
    m.appendChild(card);
    return;
  }
  const st = grammarMap();
  const kn = grammarKnownMap();
  const now = Date.now();
  // 🔍 처음 한 번 — 진단을 안 했고 아직 한 단원도 안 했을 때만 권한다(건너뛸 수 있다)
  if (!grammarDiagDay() && !Object.keys(st).length && S.diag.length) {
    const box = el('div', 'gr-diag-offer');
    box.appendChild(el('p', 'gr-ask', '🔍 어디까지 알까? — 3~4학년에 배운 문장 꼴 몇 문제 (처음 한 번)'));
    box.appendChild(el('p', 'gr-note', '맞힌 단원은 ✅로 건너뛰어요. 틀려도 괜찮아요 — 그 단원부터 같이 해요.'));
    box.appendChild(btn('btn btn-primary btn-big-wide', '🔍 어디까지 알까? 시작', () => guardStart('english', startDiag)));
    box.appendChild(btn('btn gr-skip', '건너뛰고 처음 단원부터', () => guardStart('english', () => startRound(planUnit(S.units, st, kn, now)))));
    card.appendChild(box);
    m.appendChild(card);
    m.appendChild(mapEl(st, kn));
    return;
  }
  const today = wordsToday(grammarDayMap(), now);
  const next = planUnit(S.units, st, kn, now);
  card.appendChild(el('p', 'gr-today', grammarTodayLine(today, !!next)));
  const practice = next ? null : planUnit(S.units, st, kn, now, true);
  if (next) {
    const u = unitById(next);
    card.appendChild(btn('btn btn-primary btn-big-wide gr-start', today ? `📝 다음: ${u.id} ${u.title}` : `📝 오늘의 문법: ${u.id} ${u.title}`, () => guardStart('english', () => startRound(next))));
  } else if (practice) card.appendChild(btn('btn btn-primary btn-big-wide gr-start', '⭐ 단원 다시 해 보기 (연습)', () => guardStart('english', () => startRound(practice))));
  else card.appendChild(el('p', 'gr-note', '오늘 할 단원을 다 했어요 — 내일 다시 만나요!'));
  m.appendChild(card);
  m.appendChild(mapEl(st, kn));
}

/** 📘 단원 지도 — 단원마다 ⭐·✅·🔁·🌱 표시와 제목 · 누르면 그 단원 (잠그지 않는다 · 셈 없음) */
function mapEl(st, kn) {
  const det = el('details', 'gr-map');
  det.appendChild(el('summary', 'gr-map-sum', '📘 단원 고르기'));
  det.appendChild(el('p', 'gr-note', '⭐ 처음부터 다 맞힌 단원 · ✅ 이미 아는 단원 · 🔁 다시 볼 단원 · 🌱 아직 안 한 단원'));
  let band = '';
  for (const u of S.units) {
    if (u.band !== band) { band = u.band; det.appendChild(el('p', 'gr-band', band === 'review' ? '3~4학년 복습' : '5~6학년')); }
    const mk = unitMark(u.id, st, kn);
    const b = btn(`btn gr-unit is-${mk}`, undefined, () => guardStart('english', () => startRound(u.id)));
    b.appendChild(el('span', 'gr-unit-mark', MARK[mk]));
    b.appendChild(el('span', 'gr-unit-id', u.id));
    const txt = el('span', 'gr-unit-txt');
    txt.appendChild(el('span', 'gr-unit-title', u.title));
    txt.appendChild(el('span', 'gr-unit-short', u.short));
    b.appendChild(txt);
    det.appendChild(b);
  }
  return det;
}

// ───────────────────── 🔍 어디까지 알까? ─────────────────────

function startDiag() {
  if (!S.diag.length) { renderHome(); return; }
  S.r = null;
  S.d = { k: 0, picks: {}, ok: [], miss: {}, saving: false, result: null, deals: S.diag.map((q) => shuffleIdx(q.opts.length)) };
  renderDiag();
  window.scrollTo(0, 0);
}
function shuffleIdx(n) {
  const a = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

function renderDiag() {
  const d = S.d;
  const m = mainEl();
  if (!m || !d) return;
  m.innerHTML = '';
  const card = el('section', 'gr-card gr-round');
  card.appendChild(el('h2', 'gr-title', '🔍 어디까지 알까?'));
  if (d.k >= S.diag.length) { card.appendChild(diagDoneEl(d)); m.appendChild(card); return; }
  card.appendChild(dotsEl(S.diag.length, d.k));
  const q = S.diag[d.k];
  const picked = d.picks[d.k];
  questionHead(card, q);
  const list = el('div', 'kor-opts');
  for (const k of d.deals[d.k]) {
    const o = q.opts[k];
    const state = picked === undefined ? '' : o.ok ? 'ok' : k === picked ? 'no' : 'dim';
    list.appendChild(optEl(o.t, state, () => {
      if (d.picks[d.k] !== undefined) return;
      d.picks[d.k] = k;
      if (o.ok) d.ok.push(q.unit);
      else d.miss[o.type] = (d.miss[o.type] || 0) + 1;
      ding(!!o.ok);
      renderDiag();
    }));
  }
  card.appendChild(list);
  if (picked !== undefined) {
    const o = q.opts[picked];
    card.appendChild(el('p', `kor-fb ${o.ok ? 'is-ok' : 'is-no'}`, o.ok ? '✓ 맞아요!' : `✗ ${o.why}`));
    card.appendChild(btn('btn btn-primary btn-big-wide gr-next', d.k + 1 < S.diag.length ? '다음 →' : '다 했어요 →', () => {
      d.k += 1;
      if (d.k >= S.diag.length) saveDiag();
      renderDiag();
      window.scrollTo(0, 0);
    }));
  }
  m.appendChild(card);
  m.appendChild(btn('btn gr-quit', '← 그만하고 처음으로', () => { S.d = null; renderHome(); window.scrollTo(0, 0); }));
}

async function saveDiag() {
  const d = S.d;
  if (!d || d.saving) return;
  d.saving = true;
  let res;
  try { res = await grammarDiagFinish({ ok: d.ok, miss: d.miss }, S.diag.map((q) => q.unit)); } catch { res = { ok: false }; }
  d.saving = false;
  d.result = res;
  if (S.d === d && grammarVisible()) renderDiag();
}

function diagDoneEl(d) {
  const box = el('div', 'gr-done');
  if (d.saving || !d.result) { box.appendChild(el('p', 'gr-done-title', '저장하는 중…')); return box; }
  if (!d.result.ok) {
    box.appendChild(el('p', 'gr-done-title', '저장이 안 됐어요'));
    box.appendChild(btn('btn btn-primary', '다시 저장하기', () => { saveDiag(); renderDiag(); }));
    return box;
  }
  const known = S.units.filter((u) => d.result.known.includes(u.id));
  box.appendChild(el('p', 'gr-done-title', '🔍 다 했어요!'));
  if (known.length) {
    box.appendChild(el('p', 'gr-done-line', '✅ 이미 아는 단원 — 건너뛰어요 (원하면 단원 고르기에서 다시 할 수 있어요)'));
    const ul = el('ul', 'gr-known');
    for (const u of known) ul.appendChild(el('li', '', `${u.id} ${u.title}`));
    box.appendChild(ul);
  } else box.appendChild(el('p', 'gr-done-line', '처음 단원부터 차근차근 같이 해요!'));
  const next = planUnit(S.units, grammarMap(), grammarKnownMap(), Date.now());
  const row = el('div', 'gr-done-btns');
  if (next) { const u = unitById(next); row.appendChild(btn('btn btn-primary', `📝 ${u.id} ${u.title} 시작`, () => guardStart('english', () => startRound(next)))); }
  row.appendChild(btn('btn', '📝 문법 처음으로', () => { S.d = null; renderHome(); window.scrollTo(0, 0); }));
  box.appendChild(row);
  return box;
}

// ───────────────────── 한 판 ─────────────────────

function startRound(id) {
  const u = unitById(id);
  if (!u) { S.r = null; renderHome(); return; }
  const cur = grammarMap()[id];
  S.d = null;
  // from = 시작할 때 그 단원의 at — 그 사이 다른 창이 옮겼으면 이 판은 연습(grammarRule)
  // rolls = 🎁 추첨에 쓸 수 — 판마다 한 번 뽑아 둔다([다시 저장하기]도 같은 추첨, 🔍 Codex 152차 #2)
  S.r = { u, id, from: cur ? cur.at : 0, deal: dealRound(u, grammarSeenMap()[id] || 0), step: 'concept', k: 0, miss: false, missTypes: {}, q: null, saving: false, result: null, rolls: [Math.random(), Math.random()] };
  renderRound();
  window.scrollTo(0, 0);
}
/** 문제 하나의 상태 — 처음 볼 때 만든다 */
function qState(r) {
  if (!r.q || r.q.k !== r.k) r.q = { k: r.k, tapped: [], done: false, input: '', fb: null, tries: 0, placed: [], bad: -1 };
  return r.q;
}
function noteMiss(r, type) {
  r.miss = true;
  if (type) r.missTypes[type] = (r.missTypes[type] || 0) + 1;
}

function dotsEl(n, at) {
  const row = el('ol', 'gr-dots');
  row.setAttribute('aria-hidden', 'true');
  for (let i = 0; i < n; i++) row.appendChild(el('li', i < at ? 'is-done' : i === at ? 'is-now' : ''));
  return row;
}

function renderRound() {
  const r = S.r;
  const m = mainEl();
  if (!m) return;
  if (!r) { renderHome(); return; }
  m.innerHTML = '';
  const card = el('section', 'gr-card gr-round');
  const head = el('div', 'gr-head');
  head.appendChild(el('span', 'gr-head-id', r.u.id));
  head.appendChild(el('h2', 'gr-head-title', r.u.title));
  card.appendChild(head);
  if (r.step === 'concept') conceptEl(card, r);
  else if (r.step === 'q') {
    card.appendChild(dotsEl(r.deal.length, r.k));
    const d = r.deal[r.k];
    const q = r.u.qs[d.i];
    if (d.kind === 'pick') pickEl(card, r, d, q);
    else if (d.kind === 'type') typeEl(card, r, q);
    else orderEl(card, r, d, q);
  } else card.appendChild(finishEl(r));
  m.appendChild(card);
  if (r.step !== 'done') m.appendChild(btn('btn gr-quit', '← 그만하고 처음으로', () => { S.r = null; renderHome(); window.scrollTo(0, 0); }));
}

/** 📘 개념 한 장 */
function conceptEl(card, r) {
  const u = r.u;
  const box = el('div', 'gr-concept');
  box.appendChild(el('p', 'gr-short', `📘 ${u.short}`));
  const ol = el('ol', 'gr-say');
  for (const s of u.say) ol.appendChild(el('li', '', s));
  box.appendChild(ol);
  const ex = el('ul', 'gr-ex');
  for (const [en, ko] of u.ex) {
    const li = el('li', '');
    li.appendChild(el('span', 'gr-en', en));
    li.appendChild(el('span', 'gr-ko', ko));
    ex.appendChild(li);
  }
  box.appendChild(ex);
  box.appendChild(el('p', 'gr-term', u.term));
  card.appendChild(box);
  card.appendChild(btn('btn btn-primary btn-big-wide gr-next', '문제 풀기 →', () => { r.step = 'q'; r.k = 0; renderRound(); window.scrollTo(0, 0); }));
}

/** 문제 머리 — 할 일 · 우리말 뜻 · 빈칸 문장(또는 대화·물음) */
function questionHead(card, q, filled = '') {
  card.appendChild(el('p', 'gr-ask', q.ask || KIND_ASK[q.kind]));
  const ko = el('p', 'gr-kor', `💬 ${q.ko}`);
  if (q.kind === 'type' && q.hint) ko.appendChild(el('span', 'gr-hint', ` (${q.hint})`));
  card.appendChild(ko);
  const lines = q.en ? [q.en] : Array.isArray(q.talk) ? q.talk : [];
  if (!lines.length) return;
  const box = el('div', `gr-sent${q.talk ? ' is-talk' : ''}`);
  box.setAttribute('lang', 'en');
  for (const line of lines) {
    const p = el('p', 'gr-en-line');
    const parts = line.split('___');
    p.appendChild(document.createTextNode(parts[0]));
    if (parts.length > 1) {
      p.appendChild(el('span', `gr-blank${filled ? ' is-filled' : ''}`, filled || '____'));
      p.appendChild(document.createTextNode(parts.slice(1).join('___')));
    }
    box.appendChild(p);
  }
  card.appendChild(box);
}

function optEl(text, state, onPick) {
  const b = el('button', `kor-opt gr-opt${state === 'ok' ? ' is-ok' : state === 'no' ? ' is-no' : state === 'dim' ? ' is-dim' : ''}`);
  b.type = 'button';
  b.setAttribute('lang', 'en');
  b.appendChild(el('span', 'kor-opt-mark', state === 'ok' ? '✓' : state === 'no' ? '✗' : '•'));
  b.appendChild(el('span', '', text));
  b.disabled = !!state;
  if (!state) b.addEventListener('click', onPick);
  return b;
}

function nextBtnEl(r) {
  const last = r.k + 1 >= r.deal.length;
  return btn('btn btn-primary btn-big-wide gr-next', last ? '다 했어요 →' : '다음 →', () => {
    if (last) { r.step = 'done'; finishRound(); }
    else r.k += 1;
    renderRound();
    window.scrollTo(0, 0);
  });
}

function pickEl(card, r, d, q) {
  const s = qState(r);
  const okIdx = q.opts.findIndex((o) => o.ok);
  questionHead(card, q, s.done ? q.opts[okIdx].t : '');
  const list = el('div', 'kor-opts');
  let why = '';
  for (const k of d.opts) {
    const o = q.opts[k];
    const tapped = s.tapped.includes(k);
    const state = tapped ? (o.ok ? 'ok' : 'no') : s.done ? 'dim' : '';
    if (tapped && !o.ok && k === s.tapped[s.tapped.length - 1]) why = o.why;
    list.appendChild(optEl(o.t, state, () => {
      if (s.done) return;
      s.tapped.push(k);
      if (o.ok) s.done = true;
      else noteMiss(r, o.type);
      ding(!!o.ok);
      renderRound();
    }));
  }
  card.appendChild(list);
  if (s.done) { card.appendChild(el('p', 'kor-fb is-ok', '✓ 맞아요!')); card.appendChild(nextBtnEl(r)); }
  else if (why) card.appendChild(el('p', 'kor-fb is-no', `✗ ${why}`));
}

function typeEl(card, r, q) {
  const s = qState(r);
  questionHead(card, q, s.done ? q.ans[0] : '');
  if (!s.done) {
    const form = el('form', 'gr-type');
    form.setAttribute('autocomplete', 'off');
    const input = el('input', 'gr-input');
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
      e.preventDefault();
      const j = judgeType(q, input.value);
      if (j.kind === 'empty') { input.focus(); return; }
      s.tries += 1;
      if (j.ok) s.done = true;
      else noteMiss(r, j.type);
      s.fb = j;
      ding(j.ok);
      renderRound();
    });
    card.appendChild(form);
    setTimeout(() => { if (S.r === r && r.q === s && !s.done && grammarVisible()) input.focus({ preventScroll: true }); }, 0);
  }
  if (s.done) { card.appendChild(el('p', 'kor-fb is-ok', `✓ 맞아요! ${q.why}`)); card.appendChild(nextBtnEl(r)); return; }
  if (s.fb) card.appendChild(el('p', `kor-fb ${s.fb.kind === 'apos' ? 'is-gate' : 'is-no'}`, s.fb.kind === 'apos' ? `💡 ${s.fb.why}` : `✗ ${s.fb.why}`));
  if (s.tries >= SHOW_AFTER) card.appendChild(el('p', 'kor-fb kor-hint2', `💡 맞는 답: ${q.ans[0]}`));
}

function orderEl(card, r, d, q) {
  const s = qState(r);
  questionHead(card, q);
  const built = el('div', 'gr-built');
  built.setAttribute('lang', 'en');
  if (!s.placed.length) built.appendChild(el('span', 'gr-built-empty', '여기에 문장이 차례로 쌓여요'));
  s.placed.forEach((ti, pos) => {
    const b = btn(`gr-tile is-placed${s.bad >= 0 && pos >= s.bad ? ' is-bad' : ''}${s.done ? ' is-ok' : ''}`, q.tiles[ti], () => {
      if (s.done) return;
      s.placed.splice(pos, 1);
      s.bad = -1;
      s.fb = null;
      renderRound();
    });
    b.disabled = s.done;
    built.appendChild(b);
  });
  card.appendChild(built);
  if (!s.done) {
    const pool = el('div', 'gr-pool');
    pool.setAttribute('lang', 'en');
    for (const ti of d.tiles) {
      if (s.placed.includes(ti)) continue;
      pool.appendChild(btn('gr-tile', q.tiles[ti], () => { s.placed.push(ti); s.bad = -1; s.fb = null; renderRound(); }));
    }
    card.appendChild(pool);
    const row = el('div', 'gr-order-btns');
    const chk = btn('btn btn-primary gr-check', '확인', () => {
      const j = judgeOrder(q, s.placed.map((ti) => q.tiles[ti]));
      s.tries += 1;
      if (j.ok) s.done = true;
      else { noteMiss(r, ''); s.bad = j.at; s.fb = j; }
      ding(j.ok);
      renderRound();
    });
    chk.disabled = s.placed.length !== q.tiles.length;
    row.appendChild(chk);
    if (s.placed.length) row.appendChild(btn('btn gr-clear', '모두 빼기', () => { s.placed = []; s.bad = -1; s.fb = null; renderRound(); }));
    card.appendChild(row);
  }
  if (s.done) { card.appendChild(el('p', 'kor-fb is-ok', `✓ 맞아요! ${q.ans}`)); card.appendChild(nextBtnEl(r)); return; }
  if (s.fb) card.appendChild(el('p', 'kor-fb is-no', '✗ 빨간 카드부터 차례가 달라요 — 카드를 눌러 빼고 다시 놓아 봐요'));
  if (s.tries >= SHOW_AFTER) card.appendChild(el('p', 'kor-fb kor-hint2', `💡 이렇게 돼요: ${joinTiles(q.tiles)}`));
}

/** 판 끝 — 한 번 저장(그날 처음이면 💰 · 처음 ⭐면 💰 더 · 🎁는 규칙이 정한다) · 실패하면 [다시 저장하기] */
async function finishRound() {
  const r = S.r;
  if (!r || r.saving) return;
  r.saving = true;
  r.result = null;
  let res;
  try { res = await grammarFinish({ id: r.id, ok: !r.miss, from: r.from, qs: r.deal.map((d) => d.i), miss: r.missTypes }, S.units.map((u) => u.id), giftPool(), r.rolls); } catch { res = { ok: false, why: 'save' }; }
  r.saving = false;
  r.result = res;
  r.giftName = res && res.gift ? monName(res.gift) : '';
  if (res && res.ok && (res.first || res.solved || res.gift)) { try { sfx.success(); } catch { /* 소리는 없어도 */ } }
  if (S.r === r && grammarVisible()) renderRound();
}

function finishEl(r) {
  const box = el('div', 'gr-done');
  if (r.saving || !r.result) { box.appendChild(el('p', 'gr-done-title', '저장하는 중…')); return box; }
  const res = r.result;
  const t = grammarFinishText(res, r.giftName);
  box.appendChild(el('p', 'gr-done-title', t.title));
  for (const line of t.lines) box.appendChild(el('p', `gr-done-line${line.startsWith('🎁') ? ' is-gift' : ''}`, line));
  const row = el('div', 'gr-done-btns');
  if (!res.ok && res.why !== 'empty') row.appendChild(btn('btn btn-primary', '다시 저장하기', () => { finishRound(); renderRound(); }));
  const next = res.ok ? planUnit(S.units, grammarMap(), grammarKnownMap(), Date.now()) : null;
  if (next) { const u = unitById(next); row.appendChild(btn('btn btn-primary', `📝 다음: ${u.id} ${u.title}`, () => guardStart('english', () => startRound(next)))); }
  row.appendChild(btn('btn', '📝 문법 처음으로', () => { S.r = null; renderHome(); window.scrollTo(0, 0); }));
  box.appendChild(row);
  return box;
}

// ───────────────────── 배선 (app.js) ─────────────────────

/** 📝 문법 화면에 들어올 때 — 원고·프로필을 기다려 그린다 (푸는 판·진단이 있으면 이어서) */
export async function enterGrammar() {
  await loadData();
  try { await profileReady(); } catch { /* 못 읽어도 빈 칸으로 그린다 */ }
  if (!grammarVisible()) return;
  if (S.r) renderRound();
  else if (S.d) renderDiag();
  else renderHome();
}

/** 배선 — ← 과목 고르기 */
export function initGrammar({ showView }) {
  if (S.wired) return;
  S.wired = true;
  const back = $('btn-grammar-back');
  if (back) back.addEventListener('click', () => showView('home'));
}
