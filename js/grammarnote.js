// 📝 문법 쪽지 창 (v349, 2026-10-27) — 🎬 영상 따라 하기 문장 사이에 끼는 쪽지 · 규칙은 grammar.js · 거는 자리·⚡💰 계단은 player.js
// ★ 아버님 "문법 문제를 만들자는 건 과목을 새롭게 만들자는 게 아니었다 — 기존 영어 과목 중간중간에" → v348 문법 화면(grammarview.js)을 여기로 옮기고
//   첫 화면 카드·단원 지도·🔍 진단은 걷었다 (기본안 https://claude.ai/artifact/82H7QD9oZpRHU5m1VjNtjM "모두 추천대로")
// 쪽지 한 장 = (새 단원·다시 볼 단원이면 📘 개념 한 장) → 문제 3(고르기 2 · 쳐 넣기나 순서 하나) → 끝(⚡💰 → 저장 → [계속하기 ▶])
//   영상을 닫으면 그냥 접는다(남는 것 없음 — 끝낸 게 아니다) · 틀려도 하트·감점 없음 · 아이 화면엔 셈 없음(점 세 개만)
import { allUnits, planUnit, dealNote, judgeType, judgeOrder, joinTiles, grammarFinishText, unitMark, giftPoolOf } from './grammar.js';
import { grammarFinish, grammarMap, grammarKnownMap, grammarSeenMap, getLevelInfo } from './xp.js';
import { ROSTER, subjectOf, isUnlocked, LEGENDARY } from './pokemon.js';
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
/** 쳐 넣기·순서에서 이만큼 틀리면 맞는 답을 보여 준다 (막혀서 멈추지 않게) */
const SHOW_AFTER = 2;

// data: 원고 · units: 쓸 수 있는 단원 · loading: 받는 중인 약속 · r: 열린 쪽지
const S = { data: null, units: [], loading: null, r: null };

const rootEl = () => $('grammar-note');
const mainEl = () => $('grammar-note-main');
const unitById = (id) => S.units.find((u) => u.id === id) || null;

/** 원고 — 한 번 받아 두고 계속 쓴다 (못 받으면 다음 쪽지 때 다시) · 받았으면 true */
export function loadGrammar() {
  if (S.data) return Promise.resolve(true);
  if (!S.loading) {
    S.loading = fetch('./coach/english/grammar.json')
      .then((res) => { if (!res.ok) throw new Error(String(res.status)); return res.json(); })
      .then((json) => {
        const units = allUnits(json);
        if (units.length) { S.data = json; S.units = units; }
        return !!S.data;
      })
      .catch(() => false)
      .finally(() => { S.loading = null; });
  }
  return S.loading;
}

/** 🎁 깜짝 포켓몬 후보 — 영어 명단 · 지금 레벨에 열린 것 · 전설 아닌 것 (못 잡은 것은 규칙이 트랜잭션 안에서 고른다) */
function giftPool() {
  let level = 1;
  try { level = getLevelInfo().level; } catch { level = 1; }
  return giftPoolOf(ROSTER, subjectOf, LEGENDARY, (id) => isUnlocked(id, level));
}
const monName = (id) => { const m = ROSTER.find((x) => x.id === id); return m ? m.ko : ''; };

/**
 * 다음 쪽지 고르기 (원고를 받은 뒤) — 다시 볼 단원(다음 날부터) → 차례로 새 단원 → 다 ⭐면 오래 안 본 단원으로 연습 · 낼 단원이 없으면 null
 * from = 지금 그 단원의 at(그 사이 다른 창이 옮겼으면 연습 — grammarRule) · rolls = 🎁 추첨 수(쪽지마다 한 번 — [다시 저장하기]도 같은 추첨)
 */
export function prepareNote(now = Date.now()) {
  if (!S.units.length) return null;
  const st = grammarMap();
  const kn = grammarKnownMap();
  const id = planUnit(S.units, st, kn, now) || planUnit(S.units, st, kn, now, true);
  const u = id ? unitById(id) : null;
  if (!u) return null;
  const mark = unitMark(id, st, kn);
  return { u, id, from: st[id] ? st[id].at : 0, concept: mark === 'new' || mark === 'again', deal: dealNote(u, grammarSeenMap()[id] || 0), rolls: [Math.random(), Math.random()] };
}

export function isGrammarNoteOpen() {
  return !!S.r;
}

/**
 * 쪽지 열기 — onReward(wrong) = ⚡💰 계단을 주고 { xp, coin }을 돌려준다(하루 몫이 없으면 null — 쪽지마다 한 번만 부른다) ·
 * onDone() = [계속하기 ▶]를 눌렀을 때(창은 이미 닫혔다)
 */
export function openGrammarNote(note, { onReward = null, onDone = null } = {}) {
  closeGrammarNote();
  if (!note || !note.u || !Array.isArray(note.deal) || !note.deal.length) return false;
  S.r = { ...note, step: note.concept ? 'concept' : 'q', k: 0, miss: false, missTypes: {}, wrong: 0, q: null, saving: false, result: null, reward: undefined, giftName: '', showConcept: false, onReward, onDone };
  const root = rootEl();
  if (root) root.hidden = false;
  render();
  return true;
}

/** 쪽지 접기 — 영상을 닫을 때 (저장·보상 없음 · onDone도 안 부른다) */
export function closeGrammarNote() {
  S.r = null;
  const root = rootEl();
  if (root) root.hidden = true;
  const m = mainEl();
  if (m) m.innerHTML = '';
}

/** 문제 하나의 상태 — 처음 볼 때 만든다 */
function qState(r) {
  if (!r.q || r.q.k !== r.k) r.q = { k: r.k, tapped: [], done: false, input: '', fb: null, tries: 0, placed: [], bad: -1 };
  return r.q;
}
/** 틀림 — ⭐(한 번도 안 틀림)와 ⚡💰 계단(틀린 수)에 함께 쓴다 */
function noteMiss(r, type) {
  r.miss = true;
  r.wrong += 1;
  if (type) r.missTypes[type] = (r.missTypes[type] || 0) + 1;
}

function dotsEl(n, at) {
  const row = el('ol', 'gr-dots');
  row.setAttribute('aria-hidden', 'true');
  for (let i = 0; i < n; i++) row.appendChild(el('li', i < at ? 'is-done' : i === at ? 'is-now' : ''));
  return row;
}

function render() {
  const r = S.r;
  const m = mainEl();
  if (!m || !r) return;
  m.innerHTML = '';
  const card = el('section', 'gr-card gnote-paper');
  const head = el('div', 'gr-head');
  head.appendChild(el('h2', 'gr-head-title', `📝 문법 쪽지 · ${r.u.title}`));
  if (r.step === 'q') head.appendChild(dotsEl(r.deal.length, r.k));
  card.appendChild(head);
  if (r.step === 'concept') conceptEl(card, r, true);
  else if (r.step === 'q') {
    // ⭐·연습 단원은 개념을 접어 둔다 — 필요하면 펼쳐 본다
    if (!r.concept) {
      if (r.showConcept) conceptEl(card, r, false);
      else card.appendChild(btn('btn gnote-peek', '📘 개념 다시 보기', () => { r.showConcept = true; render(); }));
    }
    const d = r.deal[r.k];
    const q = r.u.qs[d.i];
    if (d.kind === 'pick') pickEl(card, r, d, q);
    else if (d.kind === 'type') typeEl(card, r, q);
    else orderEl(card, r, d, q);
  } else card.appendChild(finishEl(r));
  m.appendChild(card);
}
function toTop() {
  const m = mainEl();
  if (m) m.scrollTop = 0;
}

/** 📘 개념 한 장 — first면 아래에 [문제 풀기 →] */
function conceptEl(card, r, first) {
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
  if (first) card.appendChild(btn('btn btn-primary btn-big-wide gr-next', '문제 풀기 →', () => { r.step = 'q'; r.k = 0; render(); toTop(); }));
}

/** 문제 머리 — 할 일 · 우리말 뜻 · 빈칸 문장(또는 대화·물음) */
function questionHead(card, q, filled = '') {
  card.appendChild(el('p', 'gr-ask', q.ask || KIND_ASK[q.kind]));
  const ko = el('p', 'gr-kor', `💬 ${q.ko}`);
  if (q.kind === 'type' && q.hint) ko.appendChild(el('span', 'gr-typehint', ` (${q.hint})`));
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
    if (last) { r.step = 'done'; finishNote(); }
    else { r.k += 1; r.showConcept = false; }
    render();
    toTop();
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
      render();
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
      render();
    });
    card.appendChild(form);
    setTimeout(() => { if (S.r === r && r.q === s && !s.done && r.step === 'q') input.focus({ preventScroll: true }); }, 0);
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
      render();
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
      pool.appendChild(btn('gr-tile', q.tiles[ti], () => { s.placed.push(ti); s.bad = -1; s.fb = null; render(); }));
    }
    card.appendChild(pool);
    const row = el('div', 'gr-order-btns');
    const chk = btn('btn btn-primary gr-check', '확인', () => {
      const j = judgeOrder(q, s.placed.map((ti) => q.tiles[ti]));
      s.tries += 1;
      if (j.ok) s.done = true;
      else { noteMiss(r, ''); s.bad = j.at; s.fb = j; }
      ding(j.ok);
      render();
    });
    chk.disabled = s.placed.length !== q.tiles.length;
    row.appendChild(chk);
    if (s.placed.length) row.appendChild(btn('btn gr-clear', '모두 빼기', () => { s.placed = []; s.bad = -1; s.fb = null; render(); }));
    card.appendChild(row);
  }
  if (s.done) { card.appendChild(el('p', 'kor-fb is-ok', `✓ 맞아요! ${q.ans}`)); card.appendChild(nextBtnEl(r)); return; }
  if (s.fb) card.appendChild(el('p', 'kor-fb is-no', '✗ 빨간 카드부터 차례가 달라요 — 카드를 눌러 빼고 다시 놓아 봐요'));
  if (s.tries >= SHOW_AFTER) card.appendChild(el('p', 'kor-fb kor-hint2', `💡 이렇게 돼요: ${joinTiles(q.tiles)}`));
}

/**
 * 쪽지 끝 — ⚡💰 계단(쪽지마다 한 번 — [다시 저장하기]로 또 받지 않는다) → 한 번 저장(⭐·처음 ⭐ 💰·🎁는 규칙이 정한다) · 실패하면 [다시 저장하기]
 */
async function finishNote() {
  const r = S.r;
  if (!r || r.saving) return;
  r.saving = true;
  r.result = null;
  if (r.reward === undefined) {
    r.reward = null;
    if (typeof r.onReward === 'function') {
      try { r.reward = (await r.onReward(r.wrong)) || null; } catch { r.reward = null; }
    }
  }
  let res;
  try { res = await grammarFinish({ id: r.id, ok: !r.miss, from: r.from, qs: r.deal.map((d) => d.i), miss: r.missTypes }, S.units.map((u) => u.id), giftPool(), r.rolls); } catch { res = { ok: false, why: 'save' }; }
  r.saving = false;
  r.result = res;
  r.giftName = res && res.gift ? monName(res.gift) : '';
  if (res && res.ok && (res.solved || res.gift || r.reward)) { try { sfx.success(); } catch { /* 소리는 없어도 */ } }
  if (S.r === r) render();
}

function finishEl(r) {
  const box = el('div', 'gr-done');
  if (r.saving || !r.result) { box.appendChild(el('p', 'gr-done-title', '저장하는 중…')); return box; }
  const res = r.result;
  const t = grammarFinishText(res, r.giftName, r.reward);
  box.appendChild(el('p', 'gr-done-title', t.title));
  for (const line of t.lines) box.appendChild(el('p', `gr-done-line${line.startsWith('🎁') ? ' is-gift' : ''}`, line));
  const row = el('div', 'gr-done-btns');
  if (!res.ok && res.why !== 'empty') row.appendChild(btn('btn', '다시 저장하기', () => { finishNote(); render(); }));
  row.appendChild(btn('btn btn-primary btn-big-wide gnote-go', '계속하기 ▶', () => {
    if (S.r !== r) return;
    const done = r.onDone;
    closeGrammarNote();
    if (typeof done === 'function') done();
  }));
  box.appendChild(row);
  return box;
}
