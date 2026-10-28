// 🔤 진우 철자 쪽지 창 (v356, 2026-10-28 아버님 「추천대로」) — 규칙은 spell.js · 거는 자리는 player.js(📝 문법 쪽지의 그날 첫 자리) · 저장은 xp.spellFinish
// 낱말 하나 = 진우가 썼던 그 문장(고친 글)에서 그 낱말 자리를 비우고 🔊 → 쳐 넣기 → 맞으면 다음 · 틀리면 내 철자 ↔ 바른 철자(다른 글자에 색) + 한 번 따라 쳐 보기
//   하트·감점 없음 · 아이 화면엔 셈 없음(점만) · 영상을 닫으면 그냥 접는다(남는 것 없음 — 📝 쪽지와 같다) · 아이 글은 늘 textContent로
// 낱말은 비공개 저장소 essay/fixes.json의 spell 칸을 📤 열쇠로 받아 이 기기(localStorage)에 둔다 (🎬 영상 문장 문제 grammarvideo.js와 같은 꼴 · 배포 없이 더해진다)
import { spellRows, spellRowsOf, pickSpell, spellJudge, spellMarks, blankParts, spellFinishText } from './spell.js';
import { spellFinish, spellMap, spellSeenMap } from './xp.js';
import { readAloud, canReadAloud, stopReading } from './essay.js';
import { sfx, unlock as sfxUnlock } from './sfx.js';

/** 받기 — 10분에 한 번까지 · 30초 넘으면 끊는다(받아 둔 것 그대로) */
export const SYNC_MS = 10 * 60 * 1000;
export const LIST_MS = 30 * 1000;
/** 따라 쳐 보기를 이만큼 틀리면 [다음]을 그냥 띄운다 (막혀서 멈추지 않게) */
const COPY_TRIES = 2;
const KEY = { rows: 'shincoach.spellRows', at: 'shincoach.spellRowsAt' };

const $ = (id) => document.getElementById(id);
const el = (tag, cls, text) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
};
const btn = (cls, text, onClick) => { const b = el('button', cls, text); b.type = 'button'; b.addEventListener('click', onClick); return b; };
const ding = (ok) => { try { sfxUnlock(); if (ok) sfx.ding(); else sfx.wrong(); } catch { /* 소리는 없어도 */ } };
function load(k, d) {
  try { const v = JSON.parse(localStorage.getItem(k) || 'null'); return v === null ? d : v; } catch { return d; }
}
function save(k, v) {
  try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch { return false; }
}
const within = (p, ms) => Promise.race([p, new Promise((_, no) => setTimeout(() => no(new Error('시간 초과')), ms))]);

// ── 이 기기: 받아 둔 낱말 ──

/** 받아 둔 노트 낱말 (spellRows 꼴 · 깨진 줄은 뺀다) */
export function spellRowsNow() {
  return spellRowsOf(load(KEY.rows, []));
}

let syncing = null;
/**
 * 받기 — 10분에 한 번까지(force면 바로) · 받은 목록이 비었으면(열쇠 없음·파일 없음·인터넷 없음) 받아 둔 것 그대로 · 받아 둔 낱말 수
 * @param {{now?:Function, readList?:Function, listMs?:number}} [deps] 시험용
 */
export function syncSpellRows(force = false, deps = {}) {
  if (syncing) return syncing;
  syncing = doSync(force, deps).finally(() => { syncing = null; });
  return syncing;
}
async function doSync(force, deps) {
  const now = (deps.now || Date.now)();
  const at = Number(load(KEY.at, 0)) || 0;
  if (!force && at > 0 && now - at >= 0 && now - at < SYNC_MS) return spellRowsNow().length; // 한 번도 안 받았으면 바로
  save(KEY.at, now);
  const readList = deps.readList || (async () => { const up = await import('./upload.js'); return up.readPrivateList(up.PRIVATE_FIXES); });
  let list = [];
  try { list = await within(readList(), deps.listMs || LIST_MS); } catch { list = []; }
  if (!Array.isArray(list) || !list.length) return spellRowsNow().length;
  const rows = spellRows(list);
  save(KEY.rows, rows); // 못 두면(저장 공간) 받아 둔 것 그대로
  return spellRowsNow().length;
}

// ── 창 ──

// r: 열린 쪽지 { words, k, results, q, saving, result, onDone }
const S = { r: null };
const rootEl = () => $('spell-note');
const mainEl = () => $('spell-note-main');

export function isSpellNoteOpen() {
  return !!S.r;
}

/**
 * 쪽지 열기 — words = pickSpell 결과(받아 둔 낱말 · 오늘 낼 것) · rows = 받아 둔 낱말 전부(진도 규칙이 마지막으로 틀린 날을 본다) ·
 * onDone = [계속하기 ▶] · 낼 낱말이 없으면 false(부르는 쪽이 이어 간다)
 */
export function openSpellNote(words, rows, { onDone = null, onCoins = null } = {}) {
  closeSpellNote();
  const list = (Array.isArray(words) ? words : []).filter((w) => w && typeof w.w === 'string');
  if (!list.length) return false;
  S.r = { words: list, rows: Array.isArray(rows) ? rows : [], k: 0, results: [], q: null, saving: false, result: null, onDone, onCoins };
  const root = rootEl();
  if (root) root.hidden = false;
  render();
  say(list[0].w);
  return true;
}

/** 쪽지 접기 — 영상을 닫을 때 (저장·보상 없음 · onDone도 안 부른다) */
export function closeSpellNote() {
  S.r = null;
  try { stopReading(); } catch { /* 읽고 있지 않았다 */ }
  const root = rootEl();
  if (root) root.hidden = true;
  const m = mainEl();
  if (m) m.innerHTML = '';
}

/** 🔊 낱말 하나를 들려준다 (못 들려줘도 쪽지는 그대로 — 문장과 글자 칸으로) */
function say(w) {
  if (!canReadAloud()) return;
  readAloud(w).catch(() => {});
}

/** 낱말 하나의 상태 — 처음 볼 때 만든다 · phase: ask(쳐 넣기) → ok(맞음) | copy(틀림 — 따라 쳐 보기) → done */
function qState(r) {
  if (!r.q || r.q.k !== r.k) r.q = { k: r.k, phase: 'ask', input: '', typed: '', copy: '', copyTries: 0, copyOk: false, fb: '' };
  return r.q;
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
  const card = el('section', 'gr-card gnote-paper sp-card');
  const head = el('div', 'gr-head');
  head.appendChild(el('h2', 'gr-head-title', '🔤 내 철자 쪽지'));
  if (r.k < r.words.length) head.appendChild(dotsEl(r.words.length, r.k));
  card.appendChild(head);
  if (r.k < r.words.length) wordEl(card, r, r.words[r.k]);
  else card.appendChild(finishEl(r));
  m.appendChild(card);
}

/**
 * 빈칸 문장 — 진우가 썼던 문장(고친 글) · 문장이 없으면(옛 기록·너무 긴 글) 빈칸만 · filled면 바른 낱말로 채운다 ·
 * 글자 수 칸(＿ ＿ ＿)은 소리를 못 내는 기기에서만 — 소리가 나면 그냥 빈칸(글자 수가 철자 힌트가 되지 않게)
 */
function sentenceEl(word, filled) {
  const box = el('div', 'gr-sent sp-sent');
  box.setAttribute('lang', 'en');
  const p = el('p', 'gr-en-line');
  const empty = canReadAloud() ? '＿＿＿＿' : '＿ '.repeat([...word.w].length).trim();
  const blankEl = (shown) => el('span', `gr-blank sp-blank${filled ? ' is-filled' : ''}`, filled ? shown : empty);
  // 그 낱말이 두 번 나오면 둘 다 빈칸 — 뒤쪽 답을 보고 베끼지 않게 (🔍 Codex 161차 #2)
  const parts = word.s ? blankParts(word.s, word.w) : null;
  if (parts) for (const x of parts) p.appendChild(x.blank !== undefined ? blankEl(x.blank) : document.createTextNode(x.text));
  else p.appendChild(blankEl(word.w));
  box.appendChild(p);
  return box;
}

/** 글자에 색 — 바뀐 글자만 칠한다 */
function marksEl(cls, marks) {
  const s = el('span', `sp-word ${cls}`);
  s.setAttribute('lang', 'en');
  for (const m of marks) s.appendChild(el('span', m.chg ? 'sp-chg' : '', m.ch));
  return s;
}

function inputEl(value, label, onInput) {
  const input = el('input', 'gr-input sp-input');
  input.type = 'text';
  input.value = value;
  input.setAttribute('lang', 'en');
  input.setAttribute('autocomplete', 'off');
  input.setAttribute('autocapitalize', 'off');
  input.setAttribute('autocorrect', 'off');
  input.setAttribute('spellcheck', 'false'); // 기기 자동 고침이 철자를 대신 고치지 않게
  input.setAttribute('aria-label', label);
  input.placeholder = '여기에 써요';
  input.addEventListener('input', () => onInput(input.value));
  return input;
}
const focusLater = (r, s, input) => setTimeout(() => { if (S.r === r && r.q === s) input.focus({ preventScroll: true }); }, 0);

function wordEl(card, r, word) {
  const s = qState(r);
  card.appendChild(el('p', 'gr-ask', s.phase === 'ask' ? '🔊 잘 듣고 빈칸에 들어갈 낱말을 써요' : s.phase === 'copy' ? '바른 철자를 보고 한 번 따라 써 봐요' : '맞아요!'));
  if (canReadAloud()) card.appendChild(btn('btn gnote-listen sp-listen', '🔊 다시 듣기', () => say(word.w)));
  card.appendChild(sentenceEl(word, s.phase !== 'ask'));
  if (s.phase === 'ask') {
    const form = el('form', 'gr-type');
    form.setAttribute('autocomplete', 'off');
    const input = inputEl(s.input, '빈칸에 쓸 낱말', (v) => { s.input = v; });
    form.appendChild(input);
    const ok = el('button', 'btn btn-primary gr-check', '확인');
    ok.type = 'submit';
    form.appendChild(ok);
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const j = spellJudge(input.value, word.w);
      if (j.kind === 'empty') { input.focus(); return; }
      s.typed = input.value.trim();
      r.results.push({ w: word.w, ok: j.ok }); // 처음 답 — 진도는 이것으로
      s.phase = j.ok ? 'ok' : 'copy';
      ding(j.ok);
      render();
    });
    card.appendChild(form);
    focusLater(r, s, input);
    return;
  }
  if (s.phase === 'ok') {
    card.appendChild(el('p', 'kor-fb is-ok', `✓ 맞아요! ${word.w}`));
    card.appendChild(nextBtnEl(r));
    return;
  }
  // 틀림 — 방금 쓴 철자 ↔ 바른 철자 · 한 번 따라 쓰기
  const mk = spellMarks(s.typed, word.w);
  const cmp = el('div', 'sp-compare');
  const mine = el('p', 'sp-row');
  mine.appendChild(el('span', 'sp-label', '내가 쓴 것'));
  mine.appendChild(marksEl('is-mine', mk.from));
  const right = el('p', 'sp-row');
  right.appendChild(el('span', 'sp-label', '바른 철자'));
  right.appendChild(marksEl('is-right', mk.to));
  cmp.appendChild(mine);
  cmp.appendChild(right);
  card.appendChild(cmp);
  if (s.copyOk || s.copyTries >= COPY_TRIES) {
    if (s.copyOk) card.appendChild(el('p', 'kor-fb is-ok', '✓ 잘 따라 썼어요 — 다음에 또 만나요!'));
    card.appendChild(nextBtnEl(r));
    return;
  }
  const form = el('form', 'gr-type');
  form.setAttribute('autocomplete', 'off');
  const input = inputEl(s.copy, '바른 철자 따라 쓰기', (v) => { s.copy = v; });
  form.appendChild(input);
  const ok = el('button', 'btn btn-primary gr-check', '확인');
  ok.type = 'submit';
  form.appendChild(ok);
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const j = spellJudge(input.value, word.w);
    if (j.kind === 'empty') { input.focus(); return; }
    s.copyTries += 1;
    s.copyOk = j.ok;
    s.fb = j.ok ? '' : '한 번 더 — 색칠한 글자를 잘 봐요';
    ding(j.ok);
    render();
  });
  card.appendChild(form);
  if (s.fb) card.appendChild(el('p', 'kor-fb is-no', s.fb));
  focusLater(r, s, input);
}

function nextBtnEl(r) {
  const last = r.k + 1 >= r.words.length;
  return btn('btn btn-primary btn-big-wide gr-next', last ? '다 했어요 →' : '다음 →', () => {
    if (S.r !== r) return;
    r.k += 1;
    render();
    if (last) finishNote();
    else say(r.words[r.k].w);
  });
}

async function finishNote() {
  const r = S.r;
  if (!r || r.saving) return;
  r.saving = true;
  r.result = null;
  render();
  let res;
  try { res = await spellFinish(r.results, r.rows); } catch { res = { ok: false, why: 'save' }; }
  r.saving = false;
  r.result = res;
  if (res && res.ok) {
    if (res.coins && typeof r.onCoins === 'function') { try { r.onCoins(res.coins); } catch { /* 칩만 못 바꿈 */ } }
    if (res.first || (res.grads && res.grads.length)) { try { sfx.success(); } catch { /* 소리는 없어도 */ } }
  }
  if (S.r === r) render();
}

function finishEl(r) {
  const box = el('div', 'gr-done');
  if (r.saving || !r.result) { box.appendChild(el('p', 'gr-done-title', '저장하는 중…')); return box; }
  const res = r.result;
  const t = spellFinishText(res);
  box.appendChild(el('p', 'gr-done-title', t.title));
  for (const line of t.lines) box.appendChild(el('p', 'gr-done-line', line));
  const row = el('div', 'gr-done-btns');
  if (!res.ok && res.why !== 'empty') row.appendChild(btn('btn', '다시 저장하기', () => { finishNote(); }));
  row.appendChild(btn('btn btn-primary btn-big-wide gnote-go', '계속하기 ▶', () => {
    if (S.r !== r) return;
    const done = r.onDone;
    closeSpellNote();
    if (typeof done === 'function') done();
  }));
  box.appendChild(row);
  return box;
}

/** 지금 낼 낱말 — 받아 둔 낱말 · 저장된 진도 (player.js가 쪽지를 열 때) */
export function spellWordsNow(now = Date.now()) {
  const rows = spellRowsNow();
  return { rows, words: pickSpell(rows, spellMap(), now, spellSeenMap()) };
}
