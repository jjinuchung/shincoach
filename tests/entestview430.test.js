// 📝 v430 영어 영상 시험 — 화면 (2026-11-16 아버님 「추천대로」) — node --test tests/entestview430.test.js
//   시작(단계 이름 칩) → 문제(고르기 · 쳐 넣기 · 카드 놓기 · 🔊 그 장면) → 답마다 풀이 → 끝(「20개 중 N개 맞았어요」 · 💰 차액 · 다음 단계) →
//   그 단계 처음 100점이면 🎯 영어 포켓몬 잡기(띄우기 전 빼기 · 장부 줄 · 안 던지면 돌려주기) · 판 도중 닫으면 결과 없음 · 영어 목록 카드 단추
//   ★ 시험 재료는 지어낸 짧은 영어 문장뿐 (영상 대사·원고는 공개 저장소에 두지 않는다)
import { fakeIdb } from './fakeidb.js'; // ★ db.js·xp.js보다 먼저
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { STAGES, PLAN, KIND, STAGE_NAMES, checkTestQ, okIndex, enDayKey, openMapOf } from '../js/entest.js';
import { putEnTestCache, getDaily } from '../js/db.js';
import { loadEnTests, enTestsNow } from '../js/entestsync.js';
import { initProfile, houseDo, getProfileSnapshot, enThrowsLeft, enTakeThrow } from '../js/xp.js';
import { initCatch, closeCatch, isCatchOpen } from '../js/catch.js';
import { HOLD_BEAT_MS, holdAdd, PAGE_ID } from '../js/throwhold.js';
import { setSfxEnabled } from '../js/sfx.js';
import { setBgmEnabled } from '../js/bgm.js';

void fakeIdb;
const src = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const pad = (n) => String(n).padStart(2, '0');
const ok = (t) => ({ t, ok: true });
const no = (t, type = 'made') => ({ t, type, why: `지어낸 풀이: ${t}은(는) 아니에요.` });
const MOVIE = 'Test Movie';
const SAY = 'We play soccer after school.';
const KO = '우리는 방과 후에 축구를 해.';

/** 지어낸 문제 한 줄 — 유형마다 원고 꼴 그대로 (at은 문제마다 달라 🔊 장면을 가를 수 있다) */
function mkQ(stage, n, type, from = MOVIE) {
  const base = { id: `T01-${stage}-${pad(n)}`, from, stage, type, kind: KIND[type], at: stage * 100 + n, end: stage * 100 + n + 2, say: SAY, ko: KO };
  const sentOpts = [ok(SAY), no('We play soccer before school.', 'flip'), no('We watch soccer after school.', 'swap'), no('We watch soccer before school.', 'swap')];
  switch (type) {
    case 'word': return { ...base, w: 'soccer', ask: '이 문장에서 soccer의 뜻은?', opts: [ok('축구'), no('야구'), no('학교', 'other'), no('양말', 'sound')] };
    case 'wordko': return { ...base, w: 'soccer', en: 'We play ___ after school.', ask: '\'축구\'에 맞는 낱말을 고르세요.', opts: [ok('soccer'), no('sucker', 'sound'), no('locker', 'look'), no('tennis', 'other')] };
    case 'hear': return { ...base, listen: true, w: 'soccer', en: 'We play ___ after school.', ask: '들린 낱말을 고르세요.', opts: [ok('soccer'), no('sucker', 'sound'), no('socket', 'look'), no('soaker', 'sound')] };
    case 'meaning': return { ...base, ask: '이 문장의 뜻으로 알맞은 것은?', opts: [ok(KO), no('우리는 방과 후에 야구를 해.', 'part'), no('우리는 학교 전에 축구를 해.', 'flip'), no('우리는 학교 전에 야구를 해.', 'flip')] };
    case 'match': return { ...base, ask: `우리말에 맞는 문장을 고르세요: ${KO}`, opts: sentOpts };
    case 'hearsent': return { ...base, listen: true, ask: '들린 문장을 고르세요.', opts: sentOpts };
    case 'grammar': return { ...base, en: 'We ___ soccer after school.', ask: '빈칸에 알맞은 말은?', opts: [ok('play'), no('plays', 'sextra'), no('played', 'time'), no('playing', 'ing')] };
    case 'spell': return { ...base, en: 'We play ___ after school.', ans: ['soccer'], hint: '\'축구\' · s로 시작', why: '축구는 soccer예요.', traps: { socer: ['look', 'c가 둘이에요.'] } };
    case 'form': return { ...base, say: 'She played soccer yesterday.', ko: '그녀는 어제 축구를 했어.', en: 'She ___ (play) soccer yesterday.', ans: ['played'], hint: '어제 일이에요 — 지난 꼴로', why: 'play의 지난 꼴은 played예요.' };
    case 'dict': return { ...base, listen: true, en: 'We play soccer after ___.', ans: ['school'], hint: '\'학교\'라는 뜻', why: '들린 말은 school이에요.' };
    case 'order': return { ...base, ask: `우리말에 맞게 카드를 놓으세요: ${KO}`, tiles: ['We', 'play', 'soccer', 'after', 'school', '.'], ans: SAY };
    case 'next': return { ...base, ctx: { before: ['What do you do after school?'] }, ask: '다음에 올 말로 알맞은 것은?', opts: [no('The bus is late.', 'flow'), ok(SAY), no('Close the door.', 'flow'), no('It is cold outside.', 'flow')] };
    case 'why': return { ...base, ask: '이 말에서 알 수 있는 것은?', opts: [ok('방과 후에 축구를 한다'), no('축구를 싫어한다', 'flip'), no('학교에 안 간다'), no('축구를 처음 본다')] };
    case 'idiom': return { ...base, say: 'Do not give up now.', ko: '지금 포기하지 마.', x: 'give up', ask: '\'give up\'의 뜻으로 알맞은 것은?', opts: [ok('포기하다'), no('위로 주다', 'literal'), no('계속하다', 'flip'), no('나눠 주다', 'near')] };
    default: throw new Error(type);
  }
}
/** 지어낸 영상 하나 — PLAN대로 단계마다 스무 문제 */
function video(from = MOVIE) {
  const rows = [];
  for (let s = 1; s <= STAGES; s++) {
    let n = 0;
    for (const [type, k] of Object.entries(PLAN[s])) for (let i = 0; i < k; i++) rows.push(mkQ(s, ++n, type, from));
  }
  return rows;
}

// ───────────────────── 순수 — 카드 단추 · 끝 화면 줄 ─────────────────────

test('지어낸 원고는 앱 검사를 통과한다 (화면 시험 재료)', () => {
  const rows = video();
  assert.equal(rows.length, STAGES * 20);
  for (const q of rows) assert.deepEqual(checkTestQ(q), [], q.id);
});

let V; // entestview (가짜 화면을 만든 뒤 불러온다 — 장부가 localStorage를 잡도록)

// ───────────────────── 가짜 화면 ─────────────────────

const all = [];
class El {
  constructor(tag) {
    this.tagName = String(tag).toUpperCase();
    this.children = []; this.parent = null; this.on = {}; this.attrs = {}; this.dataset = {}; this.style = { setProperty() {} };
    this.hidden = false; this.disabled = false; this._text = ''; this._html = ''; this.className = ''; this.id = ''; this.value = ''; this.src = ''; this.alt = ''; this.type = ''; this.placeholder = '';
    this.offsetWidth = 0; this.scrollTop = 0;
    all.push(this);
  }
  get classList() {
    const list = () => this.className.split(/\s+/).filter(Boolean);
    return {
      add: (...cs) => { this.className = [...new Set([...list(), ...cs])].join(' '); },
      remove: (...cs) => { this.className = list().filter((x) => !cs.includes(x)).join(' '); },
      toggle: (cl, on) => { const has = list().includes(cl); const want = on === undefined ? !has : !!on; if (want !== has) this.className = want ? [...list(), cl].join(' ') : list().filter((x) => x !== cl).join(' '); return want; },
      contains: (cl) => list().includes(cl),
    };
  }
  get textContent() { return this._text + this.children.map((c) => c.textContent).join(''); }
  set textContent(v) { for (const c of this.children) c.parent = null; this.children = []; this._text = String(v); }
  get innerHTML() { return this._html; }
  set innerHTML(v) { this.textContent = ''; this._html = String(v); }
  appendChild(c) { c.parent = this; this.children.push(c); return c; }
  remove() { if (this.parent) { this.parent.children = this.parent.children.filter((c) => c !== this); this.parent = null; } }
  addEventListener(t, f) { (this.on[t] ||= []).push(f); }
  click() { for (const f of this.on.click || []) f({ offsetX: 10, offsetY: 10, stopPropagation() {}, preventDefault() {} }); }
  submit() { for (const f of this.on.submit || []) f({ preventDefault() {} }); }
  focus() {}
  setAttribute(k, v) { this.attrs[k] = String(v); }
  getAttribute(k) { return k in this.attrs ? this.attrs[k] : null; }
  matches(sel) {
    if (sel.startsWith('.')) return this.className.split(/\s+/).includes(sel.slice(1));
    const m = /^([a-z]+)(?:\[data-([a-z]+)\])?$/i.exec(sel);
    return !!m && this.tagName === m[1].toUpperCase() && (!m[2] || this.dataset[m[2]] !== undefined);
  }
  querySelectorAll(sel) { const out = []; const walk = (e) => { for (const c of e.children) { if (c.matches(sel)) out.push(c); walk(c); } }; walk(this); return out; }
  querySelector(sel) { return this.querySelectorAll(sel)[0] || null; }
  getBoundingClientRect() { return { top: 80, left: 0, width: 1000, height: 600 }; }
  get clientWidth() { return 1000; }
}
const ROOT = new El('html');
const BODY = new El('body');
ROOT.appendChild(BODY);
const mk = (tag, id, parent = BODY) => { const e = new El(tag); e.id = id; parent.appendChild(e); return e; };
const LIB = mk('section', 'view-library');
const LIB_BOX = mk('div', 'library-entest', LIB);
const PLAYER = mk('section', 'view-player');
const ET = mk('div', 'en-test');
ET.hidden = true;
mk('div', 'en-test-main', ET);
// 🎯 잡기 창 (index.html #catch와 같은 id들)
const CATCH = mk('div', 'catch');
CATCH.hidden = true;
for (const id of ['catch-xp', 'catch-xpbar-fill', 'catch-next', 'catch-levelup', 'catch-truegold', 'catch-msg', 'catch-radar', 'catch-pick', 'catch-golden', 'catch-confirm', 'catch-stage', 'catch-ball', 'catch-fx', 'catch-result']) mk('div', id, CATCH);
const MON = mk('span', 'catch-mon', CATCH);
MON.appendChild(new El('img'));
const CONT = mk('button', 'catch-continue', CATCH);
CONT.hidden = true;
const attached = (e) => { for (let x = e; x; x = x.parent) if (x === ROOT) return true; return false; };
const byId = (id) => { for (let i = all.length - 1; i >= 0; i -= 1) if (all[i].id === id && attached(all[i])) return all[i]; return null; };
const live = (cls) => all.filter((e) => attached(e) && e.className.split(/\s+/).includes(cls));
function button(text) {
  for (let i = all.length - 1; i >= 0; i -= 1) if (all[i].tagName === 'BUTTON' && all[i].textContent.trim() === text && attached(all[i])) return all[i];
  throw new Error(`단추 없음: ${text}`);
}
const hasButton = (text) => { try { button(text); return true; } catch { return false; } };
globalThis.document = {
  hidden: false, documentElement: ROOT, body: BODY, getElementById: byId, createElement: (t) => new El(t),
  createTextNode: (s) => { const e = new El('#text'); e._text = String(s); return e; }, addEventListener() {}, querySelectorAll: () => [],
};
class Param { constructor(v = 1) { this.value = v; } setValueAtTime() {} exponentialRampToValueAtTime() {} linearRampToValueAtTime() {} setTargetAtTime() {} cancelScheduledValues() {} }
class FakeAC {
  constructor() { this.currentTime = 0; this.state = 'running'; this.destination = {}; }
  createGain() { return { gain: new Param(1), connect: (x) => x, disconnect() {} }; }
  createDynamicsCompressor() { return { connect: (x) => x }; }
  createOscillator() { return { type: '', frequency: new Param(440), connect: (x) => x, start() {}, stop() {}, onended: null }; }
  resume() { return Promise.resolve(); }
}
globalThis.window = { addEventListener() {}, innerHeight: 800, devicePixelRatio: 1, AudioContext: FakeAC };
// 실패한 시험이 잡기 창을 연 채 끝나면 장부 박동이 남아 node --test가 끝나지 않는다 — 박동만 unref (music429와 같다)
const realSetInterval = globalThis.setInterval;
globalThis.setInterval = (fn, ms, ...a) => { const t = realSetInterval(fn, ms, ...a); if (ms === HOLD_BEAT_MS && t && typeof t.unref === 'function') t.unref(); return t; };
globalThis.requestAnimationFrame = () => 1;
globalThis.cancelAnimationFrame = () => {};
globalThis.fetch = () => Promise.reject(new Error('시험에선 그림을 안 받는다'));
Object.defineProperty(globalThis, 'navigator', { value: { onLine: false, wakeLock: { request: () => Promise.reject(new Error('없음')) } }, configurable: true });
const store = new Map();
globalThis.localStorage = { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => { store.set(k, String(v)); }, removeItem: (k) => { store.delete(k); } };
const settle = (ms = 20) => new Promise((r) => setTimeout(r, ms));
async function waitFor(cond, what, ms = 4000) {
  const t0 = Date.now();
  while (!(await cond())) {
    if (Date.now() - t0 > ms) throw new Error(`기다림 넘침: ${what}`);
    await settle(10);
  }
}
const HOLD_KEY = 'shincoach.entest.throwHolds';
const CATCH_WAIT = 1500; // 끝 화면 뒤 잡기 화면까지(CATCH_DELAY_MS)보다 넉넉히
const holdRows = () => Object.keys(JSON.parse(store.get(HOLD_KEY) || '{}'));
const cands = () => byId('catch-pick').children.map((b) => Number(b.dataset.id));
const savedP = () => fakeIdb.get('profile', 'me') || {};
const throws = () => ({ earned: 0, used: 0, refunded: 0, ...(savedP().enThrow || {}) });
const recOf = () => (savedP().enTest || {})[MOVIE] || null;
const today = async (k = enDayKey(Date.now())) => (await getDaily(k)) || {};
// 시험 도중 자정을 넘기면 하루 칸은 못 본다 — 처음 읽은 날과 같은 날일 때만 견준다 (🔍 Codex 235차 #7)
const sameDay = (k) => enDayKey(Date.now()) === k;
const mainText = () => byId('en-test-main').textContent;
// 그림이 있는 영어 포켓몬 — 거름을 지나는 셋 + 😴 하나 + 🌌 하나 (후보 넷 자리보다 적어 거른 아이가 섞이면 반드시 보인다)
const EN_MONS = [25, 7, 1];
const UB = 793; // 🌌 울트라비스트(영어 쪽) — 🕳 울트라홀이 닫혀 있으면 후보에 없어야 한다
const TIRED = 4; // 😴 쉬는 중 (❤️ 0) — ⚙ ❤️ 켬(기본)
const heard = [];
let closedN = 0;
const coinsSeen = [];
const HOOKS = { listen: (q) => { heard.push(q); return true; }, onClose: () => { closedN += 1; }, onCoins: (n) => { coinsSeen.push(n); } };
const S = () => globalThis.window.__entest.S;
/** 지금 문제 */
const cur = () => { const r = S().w.round; return { r, d: r.deal[r.k], q: r.deal[r.k].q, k: r.k }; };

/** 지금 문제에 답한다 — right면 맞는 답, 아니면 틀린 답 (고르기 · 쳐 넣기 · 카드 놓기를 화면 단추로) */
function answerNow(right) {
  const { q } = cur();
  if (q.kind === 'pick') {
    const oi = right ? okIndex(q) : q.opts.findIndex((o) => o.ok !== true);
    const want = q.opts[oi].t;
    const b = live('et-opt').find((x) => x.children[1] && x.children[1].textContent === want);
    assert.ok(b, `보기 단추 ${want}`);
    b.click();
  } else if (q.kind === 'type') {
    const input = live('et-input')[0];
    input.value = right ? q.ans[0] : 'zzz';
    live('et-type')[0].submit();
  } else {
    const order = right ? q.tiles.map((_, i) => i) : q.tiles.map((_, i) => q.tiles.length - 1 - i);
    for (const ti of order) {
      const b = live('et-pool')[0].children.find((x) => x.textContent === q.tiles[ti]);
      b.click();
    }
    button('확인').click();
  }
}
const goNext = () => { const b = live('et-next')[0]; assert.ok(b, '다음 단추'); b.click(); };
/** 지금 단계 판 하나를 끝까지 — 앞에서부터 right개 맞히고 나머지는 틀림 → 저장 끝까지 기다린다 */
async function playRound(right) {
  for (let i = 0; i < 20; i++) { answerNow(i < right); goNext(); }
  await waitFor(() => S().w && S().w.round.result, '저장');
  return S().w.round.result;
}
const setRec = (rec) => houseDo((p) => { if (rec) p.enTest = { [MOVIE]: rec }; else delete p.enTest; return { ok: true }; });

test('화면 준비 — 원고 사본 · 그림 · 잡기 창 · 창 불러오기', async () => {
  setSfxEnabled(false);
  setBgmEnabled(false);
  await initProfile();
  await putEnTestCache({ 'english/tests/t1.json': video() });
  await loadEnTests();
  assert.ok(enTestsNow().tests[MOVIE], '받아 둔 시험');
  for (const id of [...EN_MONS, TIRED, UB]) fakeIdb.put('characters', { id, ko: '', en: '', blob: new Blob(['x']), anchor: { x: 0.5, y: 0.2 }, savedAt: 0 });
  await houseDo((p) => { p.mons = { ...(p.mons || {}), [TIRED]: { hp: 0 } }; return { ok: true }; });
  initCatch();
  V = await import('../js/entestview.js');
  assert.ok(globalThis.window.__entest, '걷기용');
});

test('카드 단추(순수) — 열린 영상·원고가 있을 때만 · 같은 제목이면 첫 편 · 깨진 영상 빼고 · 글은 지금 단계 이름만(숫자 없음)', () => {
  const tests = enTestsNow().tests;
  const items = [{ id: 'a', title: MOVIE }, { id: 'b', title: MOVIE }, { id: 'c', title: 'Other Film' }, { id: 'd', title: 'Closed Film' }, { id: 'e', title: MOVIE, broken: true }];
  const open = { [MOVIE]: { id: 'a', open: true }, 'Other Film': { id: 'c', open: true }, 'Closed Film': { id: 'd', open: false } };
  const out = V.testCardsOf(items, open, tests, {});
  assert.deepEqual(Object.keys(out), ['a'], '원고 없는 영상(Other Film)·안 열린 영상·둘째 편·깨진 영상은 단추 없음');
  assert.equal(out.a.label, '📝 시험 · 낱말');
  assert.ok(!/\d/.test(out.a.label), '숫자 셈 없음');
  assert.equal(V.testCardsOf(items, open, tests, { [MOVIE]: { s: 2 } }).a.label, '📝 시험 · 빈칸·문법', '지금 단계 = 넘은 단계 다음');
  assert.equal(V.testCardsOf(items, open, tests, { [MOVIE]: { s: 5 } }).a.label, '📝 시험 · 이해', '다 넘었으면 마지막 단계');
  assert.deepEqual(V.testCardsOf(items, { [MOVIE]: { id: 'b', open: true } }, tests, {}), { b: { title: MOVIE, stage: 1, label: '📝 시험 · 낱말' } }, '열림 표가 고른 편');
  assert.deepEqual(V.testCardsOf(items, {}, tests, {}), {});
  assert.deepEqual(V.testCardsOf(null, null, null, null), {});
  assert.deepEqual(V.testCardsOf([{ id: 'x', title: 'constructor' }], { constructor: { id: 'x', open: true } }, tests, {}), {}, '프로토타입 이름도 안전');
  // 열림 표는 entest.openMapOf 그대로 — 95% 미만이면 단추 없음
  const recs = Array.from({ length: 19 }, (_, i) => ({ itemId: 'a', key: `a|${i}`, done: 1 }));
  const keys = new Set(Array.from({ length: 20 }, (_, i) => `a|${i}`));
  const m19 = openMapOf([{ id: 'a', title: MOVIE }], recs, () => 20, () => keys);
  assert.equal(m19[MOVIE].open, true, '열아홉 · 스물 = 95%');
  const m18 = openMapOf([{ id: 'a', title: MOVIE }], recs.slice(1), () => 20, () => keys);
  assert.deepEqual(V.testCardsOf([{ id: 'a', title: MOVIE }], m18, tests, {}), {}, '95% 미만');
});

test('끝 화면 줄(순수) — 💰 차액 · 다음 단계(받침에 맞는 조사) · 마지막 단계 · 넘음 · 전에 넘음 · 다시 · 🎯 · 저장 못 함 · 💰 말고 숫자 없음', () => {
  const base = { ok: true, coins: 0, passed: false, firstPass: false, opened: 0, chance: false, s: 0 };
  assert.deepEqual(V.doneLines({ ...base, stage: 1, coins: 10, passed: true, firstPass: true, opened: 2, s: 1 }), ['💰 10 받았어요!', '🎉 다음 단계 「문장 뜻」이 열렸어요!']);
  assert.deepEqual(V.doneLines({ ...base, stage: 3, passed: true, firstPass: true, opened: 4, s: 3 }), ['🎉 다음 단계 「문장 만들기」가 열렸어요!']);
  assert.deepEqual(V.doneLines({ ...base, stage: 5, coins: 38, passed: true, firstPass: true, s: 5, chance: true }), ['💰 38 받았어요!', '🏆 마지막 단계까지 넘었어요!', '🎯 처음 100점! 영어 포켓몬을 만나러 가요']);
  assert.deepEqual(V.doneLines({ ...base, stage: 2, passed: true, s: 3 }), ['✅ 이 단계를 넘었어요']);
  assert.deepEqual(V.doneLines({ ...base, stage: 2, s: 3 }), ['✅ 이 단계는 전에 넘었어요']);
  assert.deepEqual(V.doneLines({ ...base, stage: 2, s: 1 }), ['80점을 넘으면 다음 단계가 열려요 — 다시 풀어 봐요']);
  assert.deepEqual(V.doneLines({ ...base, stage: 5, s: 4 }), ['80점을 넘으면 이 단계를 넘어요 — 다시 풀어 봐요']);
  assert.match(V.doneLines({ ok: false, why: 'save' })[0], /다시 저장하기/);
  assert.match(V.doneLines({ ok: false, why: 'title' })[0], /저장되지 않았어요/);
  for (const t of Object.values(V.CATCH_WHY)) assert.ok(!/\d/.test(t), `잡기 한 줄에 숫자 없음: ${t}`);
});

test('시작 — 원고가 없으면 안 연다 · 처음엔 「낱말」 칩 하나 · 넘은 단계는 ✅ 칩으로 다시 고른다 · 지금 단계 = 열린 단계 중 가장 높은 것 · 남은 수 글 없음', async () => {
  LIB.hidden = true;
  PLAYER.hidden = false;
  assert.equal(V.openEnTest('No Such Film', HOOKS), false);
  assert.equal(ET.hidden, true);
  await setRec(null);
  assert.equal(V.openEnTest(MOVIE, HOOKS), true);
  assert.equal(ET.hidden, false, '불투명 창');
  assert.equal(V.isEnTestOpen(), true);
  assert.deepEqual(live('et-chip').map((c) => c.textContent), ['낱말']);
  assert.match(mainText(), /지금 단계: 낱말/);
  assert.match(mainText(), /🎬 Test Movie/);
  await setRec({ s: 2, p: [100, 80, 0, 0, 0] });
  assert.equal(V.openEnTest(MOVIE, HOOKS), true);
  assert.deepEqual(live('et-chip').map((c) => c.textContent), ['낱말 💯', '문장 뜻 ✅', '빈칸·문법'], '숫자 셈 없이 단계 이름만');
  assert.equal(live('et-chip').find((c) => c.className.includes('is-on')).dataset.stage, '3', '지금 단계를 골라 둔다');
  live('et-chip')[0].click();
  assert.match(mainText(), /지금 단계: 낱말/, '넘은 단계를 다시 고른다');
  assert.ok(!/남은|밀린|\d+\s*\/\s*\d+/.test(mainText()));
  V.closeEnTest();
  assert.equal(ET.hidden, true);
  assert.equal(V.isEnTestOpen(), false);
});

test('고르기·🔊 — 「몇 번째 문제」만 · 듣기 문제는 그 장면을 저절로 한 번 + 다시 듣기 · 듣기 전엔 대사를 안 보인다 · 처음 고른 답만 · 풀이 · 판 도중 그만하면 결과 없음', async () => {
  await setRec({ s: 1 });
  const k0 = enDayKey(Date.now());
  const runs0 = Number((await today(k0)).enTestRuns) || 0;
  assert.equal(V.openEnTest(MOVIE, HOOKS), true);
  live('et-chip').find((c) => c.dataset.stage === '2').click();
  heard.length = 0;
  button('시작 ▶').click();
  assert.match(mainText(), /📝 문장 뜻 · 1번째 문제/);
  assert.ok(!/남은|\d+\s*\/\s*20/.test(mainText()), '남은 수 없음');
  // 처음 고른 답만 — 틀린 답을 고른 뒤 (옛 단추로) 맞는 답을 눌러도 그대로
  const { q, k } = cur();
  const right = live('et-opt').find((x) => x.children[1].textContent === q.opts[okIndex(q)].t);
  answerNow(false);
  right.click();
  assert.equal(S().w.round.ans[k].ok, false, '처음 낸 답만 센다');
  assert.ok(live('et-opt').every((b) => b.disabled), '고른 뒤엔 잠긴다');
  assert.ok(live('et-opt').some((b) => b.className.includes('is-ok')) && live('et-opt').some((b) => b.className.includes('is-no')), '고른 것과 정답 표시');
  assert.match(mainText(), /✗ 아쉬워요/);
  assert.match(mainText(), /지어낸 풀이/, '고른 틀린 보기의 까닭');
  assert.match(mainText(), new RegExp(`💬 ${KO}`), '그 대사의 우리말 뜻');
  // 듣기 문제를 만날 때까지 — 저절로 한 번 · 다시 듣기 · 답하기 전엔 대사(say) 글이 안 보인다
  let saw = false;
  for (let i = 0; i < 19; i++) {
    goNext();
    const c = cur();
    if (c.q.type === 'hearsent' && !saw) {
      saw = true;
      assert.equal(heard[heard.length - 1], c.q, '그 문제로 장면을 틀었다(저절로)');
      const before = heard.length;
      button('🔊 다시 듣기').click();
      assert.equal(heard.length, before + 1);
      const sentBox = live('et-sent')[0];
      assert.ok(!sentBox || !sentBox.textContent.includes(SAY), '듣기 전엔 대사를 화면에 안 보인다(보기에만)');
    }
    if (c.q.type !== 'hearsent') assert.ok(!live('et-listen-btn').length, '듣기 문제가 아니면 🔊 없음');
    answerNow(true);
  }
  assert.ok(saw, '문장 듣기 문제를 만났다');
  assert.ok(heard.every((x) => x.type === 'hearsent'), '듣기 문제만 장면을 튼다');
  // 마지막 문제에서 그만하기 — 결과 없음(저장·하루 칸 그대로) · 플레이어에 알림
  const n0 = (recOf() || {}).n;
  const c0 = closedN;
  button('그만하기 ✕').click();
  assert.equal(closedN, c0 + 1, 'onClose');
  assert.equal(V.isEnTestOpen(), false);
  await settle(50);
  assert.deepEqual((recOf() || {}).n, n0, '판 도중 닫으면 결과 없음');
  if (sameDay(k0)) assert.equal(Number((await today(k0)).enTestRuns) || 0, runs0, '하루 칸도 그대로');
});

test('끝 — 「20개 중 N개 맞았어요」 · 80점이면 다음 단계 열림 · 💰는 더 높은 칸을 처음 넘을 때 차액만 · 다시 풀기는 보기를 새로 섞는다 · 한 판 한 번만 저장', async () => {
  await setRec(null);
  const coins0 = Number(savedP().coins) || 0;
  const k0 = enDayKey(Date.now());
  const runs0 = Number((await today(k0)).enTestRuns) || 0;
  coinsSeen.length = 0;
  assert.equal(V.openEnTest(MOVIE, HOOKS), true);
  button('시작 ▶').click();
  const deal1 = S().w.round.deal.map((d) => d.q.id).join();
  let res = await playRound(16);
  assert.match(mainText(), /20개 중 16개 맞았어요/);
  assert.match(mainText(), /💰 10 받았어요!/);
  assert.match(mainText(), /🎉 다음 단계 「문장 뜻」이 열렸어요!/);
  assert.deepEqual([res.tier, res.coins, res.opened], [80, 10, 2]);
  assert.equal(Number(savedP().coins) - coins0, 10);
  assert.deepEqual(coinsSeen, [10], '칩 다시 그리기 알림');
  assert.equal(recOf().s, 1);
  // 한 판 한 번만 — 끝 화면에서 저장을 또 부를 길이 없다 · 두 번 눌러도
  live('et-next').forEach((b) => b.click());
  await settle(50);
  assert.equal(recOf().n[0], 1);
  if (sameDay(k0)) assert.equal(Number((await today(k0)).enTestRuns) || 0, runs0 + 1, '하루 칸 판 하나 (xp가 올린다 — 화면은 다시 안 더한다)');
  // 다시 풀기 — 같은 단계 · 새로 섞음 · 90점 → 차액 💰10
  button('🔁 다시 풀기').click();
  assert.match(mainText(), /📝 낱말 · 1번째 문제/);
  const deal2 = S().w.round.deal.map((d) => d.q.id).join();
  assert.notEqual(deal2, deal1, '문제 차례를 새로 섞는다');
  res = await playRound(18);
  assert.deepEqual([res.tier, res.prevTier, res.coins], [90, 80, 10]);
  assert.match(mainText(), /20개 중 18개 맞았어요/);
  assert.match(mainText(), /💰 10 받았어요!/);
  assert.match(mainText(), /✅ 이 단계를 넘었어요/);
  // 같은 칸 또 — 💰 없음
  button('🔁 다시 풀기').click();
  res = await playRound(18);
  assert.equal(res.coins, 0);
  assert.ok(!/💰/.test(mainText()), '받은 칸이면 💰 줄 없음');
  // 70점 — 전에 넘은 단계
  button('🔁 다시 풀기').click();
  res = await playRound(14);
  assert.match(mainText(), /20개 중 14개 맞았어요/);
  assert.match(mainText(), /✅ 이 단계는 전에 넘었어요/);
  assert.equal(Number(savedP().coins) - coins0, 20, '모두 합쳐 💰20 (차액만)');
  assert.equal(recOf().n[0], 4);
  // 다음 단계 ▶ — 열린 단계로 바로
  button('닫기').click();
  assert.equal(V.openEnTest(MOVIE, HOOKS), true);
  assert.match(mainText(), /지금 단계: 문장 뜻/);
  V.closeEnTest();
});

test('쳐 넣기 — 빈 칸은 낸 답이 아니다 · 처음 낸 답만 · 내가 쓴 답과 맞는 답·풀이 · 카드 놓기 — 하나 빼기·놓은 카드 빼기 · 다 놓아야 확인', async () => {
  await setRec({ s: 3 });
  assert.equal(V.openEnTest(MOVIE, HOOKS), true);
  live('et-chip').find((c) => c.dataset.stage === '4').click();
  button('시작 ▶').click();
  let typed = false;
  let ordered = false;
  for (let i = 0; i < 20; i++) {
    const { q, k } = cur();
    if (q.kind === 'type' && !typed) {
      typed = true;
      const input = live('et-input')[0];
      input.value = '   ';
      live('et-type')[0].submit();
      assert.equal(S().w.round.ans[k], undefined, '빈 칸은 낸 답이 아니다');
      input.value = 'Wrong';
      live('et-type')[0].submit();
      assert.equal(S().w.round.ans[k].ok, false);
      assert.match(mainText(), /내가 쓴 답: Wrong/);
      assert.match(mainText(), new RegExp(`맞는 답: ${q.ans[0]}`));
      assert.match(mainText(), new RegExp(q.why));
      assert.equal(live('et-input').length, 0, '낸 뒤엔 칸이 없다');
    } else if (q.kind === 'order' && !ordered) {
      ordered = true;
      assert.equal(button('확인').disabled, true, '다 놓아야 확인');
      const pool = () => live('et-pool')[0].children;
      pool().find((x) => x.textContent === 'We').click();
      pool().find((x) => x.textContent === 'school').click();
      button('↩ 하나 빼기').click();
      assert.deepEqual(S().w.round.cur.placed, [0], '마지막 카드를 뺐다');
      live('gr-built')[0].children[0].click();
      assert.deepEqual(S().w.round.cur.placed, [], '놓은 카드를 눌러 뺐다');
      answerNow(true);
      assert.equal(S().w.round.ans[k].ok, true);
      assert.match(mainText(), /✓ 맞아요!/);
    } else answerNow(true);
    goNext();
  }
  assert.ok(typed && ordered);
  await waitFor(() => S().w.round.result, '저장');
  assert.match(mainText(), /20개 중 19개 맞았어요/);
  V.closeEnTest();
});

test('100점 처음 → 끝 화면 뒤 바로 잡기 화면: 띄우기 전에 뺌 · 장부 줄 · 영어 문구 · 후보는 같은 거름(울트라비스트·😴 빼고) · 안 던지고 닫으면 돌려줌 · 🎯 단추(숫자 없음)', async () => {
  await setRec(null);
  await houseDo((p) => { delete p.enThrow; return { ok: true }; });
  const kb = enDayKey(Date.now());
  const balls0 = Number((await today(kb)).enTestBall) || 0;
  assert.equal(V.openEnTest(MOVIE, HOOKS), true);
  button('시작 ▶').click();
  const res = await playRound(20);
  assert.deepEqual([res.tier, res.chance, res.coins], [100, true, 30]);
  assert.match(mainText(), /🎯 처음 100점! 영어 포켓몬을 만나러 가요/);
  assert.equal(isCatchOpen(), false, '점수를 먼저 보여 준다');
  await waitFor(() => isCatchOpen(), '잡기 화면', 6000);
  assert.deepEqual(throws(), { earned: 1, used: 1, refunded: 0 }, '띄우기 전에 저장소에서 뺐다');
  assert.equal(holdRows().length, 1, '뺀 기회 장부 줄');
  assert.equal(byId('catch-msg').textContent, '📝 영상 시험 100점 · 포켓몬을 한 마리 골라 몬스터볼을 던져봐요!');
  const c = cands();
  assert.deepEqual([...c].sort((a, b) => a - b), [1, 7, 25], '거름을 지난 셋 모두(넷 자리보다 적다)');
  assert.ok(!c.includes(UB), '🕳 울트라홀이 닫혀 있으면 울트라비스트 없음');
  assert.ok(!c.includes(TIRED), '😴 쉬는 포켓몬 없음');
  assert.ok(c.every((id) => EN_MONS.includes(id)), '영어 포켓몬만');
  if (sameDay(kb)) assert.equal(Number((await today(kb)).enTestBall) || 0, balls0 + 1, '📤 기회 생김 (xp가 올렸다)');
  await V.runEnCatch();
  assert.equal(throws().used, 1, '창이 떠 있으면 또 눌러도 겹쳐 열지 않는다');
  CONT.click(); // 안 던지고 닫았다
  await waitFor(() => throws().refunded === 1 && !S().catching, '돌려주기');
  assert.deepEqual(holdRows(), [], '돌려주기가 저장되면 장부 줄도 지운다');
  assert.equal(enThrowsLeft(), 1);
  assert.ok(hasButton('🎯 영어 포켓몬 잡기'), '끝 화면에 단추로 다시');
  assert.equal(byId('et-catch').hidden, false);
  // 영어 목록 단추 칸에도 (숫자 없음)
  V.drawEnCatch();
  assert.equal(LIB_BOX.hidden, false);
  assert.equal(LIB_BOX.children[0].textContent, '🎯 영어 포켓몬 잡기');
  // 그 단계 100점은 처음만 — 또 100점이어도 기회 없음
  button('🔁 다시 풀기').click();
  const again = await playRound(20);
  assert.deepEqual([again.chance, again.coins], [false, 0]);
  await settle(CATCH_WAIT);
  assert.equal(isCatchOpen(), false);
  V.closeEnTest();
});

test('영어 목록 단추로 던지기 — 판정 때 장부 줄을 지움 · 잡으면 도감에 · 📤 잡음 · 쓴 기회는 돌려주지 않음 · 남은 기회가 없으면 단추가 사라짐', async () => {
  PLAYER.hidden = true;
  LIB.hidden = false;
  await V.enterEnList();
  assert.equal(enThrowsLeft(), 1);
  const kc = enDayKey(Date.now());
  const caught0 = Number((await today(kc)).enTestCaught) || 0;
  LIB_BOX.children[0].click();
  await waitFor(() => isCatchOpen(), '잡기 화면');
  assert.deepEqual(throws(), { earned: 1, used: 2, refunded: 1 });
  assert.equal(LIB_BOX.children[0].disabled, true, '도는 동안 단추 잠김 — 한 번에 하나만');
  const id = cands()[0];
  const realRandom = Math.random;
  Math.random = () => 0; // 반드시 잡힘
  try {
    byId('catch-pick').children[0].click();
    await waitFor(() => holdRows().length === 0, '판정 — 장부 줄 지움', 6000);
    await waitFor(() => CONT.hidden === false, '결과', 8000);
  } finally { Math.random = realRandom; }
  assert.ok(Number(getProfileSnapshot().caught[id]) >= 1, '잡은 포켓몬이 도감에');
  CONT.click();
  await waitFor(() => !S().catching, '닫힘');
  await settle(30);
  assert.deepEqual(throws(), { earned: 1, used: 2, refunded: 1 }, '던졌으면 돌려주지 않는다');
  assert.equal(enThrowsLeft(), 0);
  assert.equal(LIB_BOX.hidden, true, '남은 기회가 없으면 단추 없음');
  if (sameDay(kc)) await waitFor(async () => (Number((await today(kc)).enTestCaught) || 0) === caught0 + 1, '📤 잡음');
});

test('바깥에서 닫힌 잡기 창(영상을 닫음 — onDone 없음) · 앱이 꺼져 남은 장부 줄 — 영어 목록에 들어오면 돌려준다', async () => {
  await houseDo((p) => { p.enThrow = { earned: 2, used: 1, refunded: 1 }; return { ok: true }; });
  await V.enterEnList();
  LIB_BOX.children[0].click();
  V.runEnCatch(); // 그림을 읽는 사이 또 눌렀다 — 한 번에 하나만
  await waitFor(() => isCatchOpen(), '잡기 화면');
  await settle(150);
  assert.deepEqual(throws(), { earned: 2, used: 2, refunded: 1 }, '두 번 눌러도 기회는 하나만 뺀다');
  closeCatch(); // 영상을 닫으며 (closeMedia → closeCatch) — onDone이 안 온다
  await V.enterEnList();
  await waitFor(() => throws().refunded === 2, '들어올 때 돌려줌');
  assert.equal(S().catching, false);
  assert.deepEqual(holdRows(), []);
  // 앱이 꺼진 흉내 — 뺀 기회와 이 창의 장부 줄만 남았다 (새로 켠 앱은 흐름을 모른다)
  const t = await enTakeThrow();
  assert.equal(t.ok, true);
  store.set(HOLD_KEY, JSON.stringify(holdAdd({}, 'crash1', PAGE_ID, Date.now())));
  await V.enterEnList();
  await waitFor(() => throws().refunded === 3, '남은 줄을 돌려줌');
  assert.deepEqual(holdRows(), []);
  assert.equal(enThrowsLeft(), 2);
});

test('빼기가 저장되지 않으면 띄우지 않는다 — 한 줄(숫자 없음) · 장부 그대로 · 다시 누를 수 있다', async () => {
  const t0 = throws();
  fakeIdb.failNext('profile');
  LIB_BOX.children[0].click();
  await waitFor(() => !S().catching && S().catchMsg, '한 줄');
  assert.equal(isCatchOpen(), false);
  assert.equal(S().catchMsg, V.CATCH_WHY.save);
  assert.deepEqual(throws(), t0);
  assert.deepEqual(holdRows(), []);
  assert.equal(LIB_BOX.children[0].textContent, '🎯 영어 포켓몬 잡기');
  assert.equal(LIB_BOX.children[1].textContent, V.CATCH_WHY.save);
  // 다시 누르면 열린다 → 안 던지고 닫기
  LIB_BOX.children[0].click();
  await waitFor(() => isCatchOpen(), '잡기 화면');
  CONT.click();
  await waitFor(() => !S().catching, '닫힘');
});

test('안 던지고 닫았는데 돌려주는 저장이 안 됐다 — 사실대로 한 줄(숫자 없음) · 장부 줄이 남아 영어 목록에 들어오면 돌려준다 · 정리되면 한 줄을 지운다', async () => {
  const t0 = throws();
  LIB_BOX.children[0].click();
  await waitFor(() => isCatchOpen(), '잡기 화면');
  assert.equal(throws().used, t0.used + 1);
  fakeIdb.failNext('profile');
  CONT.click();
  await waitFor(() => !S().catching, '닫힘');
  assert.equal(S().catchMsg, V.CATCH_WHY.owed);
  assert.equal(throws().refunded, t0.refunded, '돌려주기가 저장되지 않았다');
  assert.equal(holdRows().length, 1, '장부 줄이 남는다');
  assert.ok(LIB_BOX.textContent.includes(V.CATCH_WHY.owed));
  await V.enterEnList();
  await waitFor(() => throws().refunded === t0.refunded + 1, '들어올 때 돌려줌');
  assert.deepEqual(holdRows(), []);
  assert.equal(S().catchMsg, '', '「돌려줘요」 한 줄은 정리되면 지운다');
  assert.ok(!LIB_BOX.textContent.includes(V.CATCH_WHY.owed));
});

test('다 푼 판을 저장하는 사이 창을 닫았다 — 결과는 한 번 저장 · 잡기 화면은 안 띄우고 기회는 단추로 남는다', async () => {
  LIB.hidden = true;
  PLAYER.hidden = false;
  await setRec({ s: 1 });
  const left0 = enThrowsLeft();
  assert.equal(V.openEnTest(MOVIE, HOOKS), true);
  live('et-chip').find((c) => c.dataset.stage === '2').click();
  button('시작 ▶').click();
  for (let i = 0; i < 20; i++) { answerNow(true); if (i < 19) goNext(); }
  const last = live('et-next')[0];
  last.click();
  last.click(); // 두 번 눌러도
  button('닫기 ✕').click(); // 저장하는 사이 닫음
  assert.equal(V.isEnTestOpen(), false);
  await waitFor(() => recOf() && Array.isArray(recOf().n) && recOf().n[1] === 1, '저장');
  await settle(CATCH_WAIT);
  assert.equal(recOf().n[1], 1, '한 번만');
  assert.equal(isCatchOpen(), false, '닫은 창 뒤에 잡기 화면을 띄우지 않는다');
  assert.equal(enThrowsLeft(), left0 + 1, '기회는 남는다(영어 목록 단추)');
});

test('잇기(소스) — 플레이어·영어 목록·창·등록부·셸·CSS', () => {
  const lib = src('js/library.js');
  assert.ok(lib.includes("guardStart('english', () => { openTestNow().catch((err) => console.warn('시험 열기 실패:', err)); });"), '⏳ 잠겼으면 연장권 뒤 계속하기로');
  assert.equal((lib.match(/guardStart\('english', \(\) => \{ open\(\)/g) || []).length, 2, 'timelimit 시험이 못 박은 두 곳 그대로');
  assert.ok(lib.includes('await openPlayer(item.id, { test: true });'));
  assert.ok(lib.includes('enterEnList().catch(() => {});') && lib.includes('await loadEnTests().catch(() => null);') && lib.includes('syncEnTests().then((r) => { if (r && r.changed && seq === renderSeq) drawTestBtns(items, records, cards); })'));
  assert.ok(lib.includes('map = openMapOf(items, records, (it) => cueInfoOf(it).count, (it) => cueInfoOf(it).keys, titles);'), '열림 셈');
  assert.ok(src('js/stats.js').includes('const v = { sig, en, count: cueCountOf(item), keys: cueKeysOf(item) };') && src('js/stats.js').includes('if (m && m.sig === sig && m.en === en) return m;'), '📊 진도와 같은 문장 수·지금 문장 열쇠 (자막 글 전체·길이·설정이 같으면 다시 안 나눔 — 📤와 같이 쓰는 stats.cueInfoOf · Codex 236차 #2)');
  assert.ok(lib.includes('renderEnTests(items, records, cards, seq).catch(() => {});'), '🎟️ 카드를 늦추지 않는다');
  assert.ok(lib.includes('const btns = testCardsOf(items, map, tests, enTestMap());'));
  assert.ok(lib.includes("if (e.target.closest('.library-test')) return;") && lib.includes('e.stopPropagation(); openTest(item);'), '단추를 눌러도 카드(영상 열기)가 안 열린다');
  const v = src('js/entestview.js');
  assert.ok(!/from '\.\/(player|library)\.js'/.test(v), '고리 없음');
  assert.ok(v.includes("const holds = holdStore('shincoach.entest.throwHolds');"));
  assert.ok(v.includes("subject: 'english'"));
  assert.ok(v.includes('return forHole(forSubject(chars, \'english\'), hole).filter((c) => isUnlocked(c.id, level) && !(hp && isTired(c.id)))'), 'player.englishCandidates와 같은 거름');
  assert.ok(!/\b(awardCoins|gainCoins|applyDailyDelta)\(/.test(v), '💰·하루 칸은 xp 트랜잭션만 (부르는 곳 없음)');
  const pl = src('js/player.js');
  assert.ok(pl.includes('    if (!(state.open && state.item === myItem)) return;\n      if (opts.test) return;') || pl.includes('if (opts.test) return; // 📝 시험으로 들어왔다'));
  const html = src('index.html');
  for (const id of ['en-test', 'en-test-main', 'library-entest']) assert.equal(html.split(`id="${id}"`).length, 2, `하나만 ${id}`);
  assert.ok(html.indexOf('id="library-review"') < html.indexOf('id="library-entest"') && html.indexOf('id="library-entest"') < html.indexOf('id="library-list"'));
  assert.ok(src('sw.js').includes("'./js/entestview.js',"), '셸');
  assert.ok(src('js/blackbox.js').includes("['en-test', '📝 영상 시험']"), '🛑 블랙박스 겹친 창');
  const css = src('css/style.css');
  for (const s of ['.et {', '.et[hidden] { display: none; }', '.et-chip.is-on {', '.library-test {', '.library-entest[hidden] { display: none; }']) assert.ok(css.includes(s), s);
  assert.match(css, /\.et \{[^}]*background: #1f2340;/, '불투명 (영상 그림이 비치지 않게)');
  assert.ok(!/grammar/i.test(src('js/app.js')), 'app.js 배선 없음(grammar348)');
});

// ───────────────────── 🔍 v430 검토·Codex 235차 고침 ─────────────────────

test('100점 끝 화면 1.2초 안에 단추 → 잡기 화면이 먼저(판은 안 시작) · 잡기 창이 떠 있는 동안엔 판을 시작 안 함 · 닫은 뒤 같은 단추로 판 · 「단계 고르기」 → 시작 화면', async () => {
  LIB.hidden = true;
  PLAYER.hidden = false;
  await setRec({ s: 2 });
  await houseDo((p) => { delete p.enThrow; return { ok: true }; });
  assert.equal(V.openEnTest(MOVIE, HOOKS), true);
  button('시작 ▶').click();
  assert.equal(S().w.round.stage, 3);
  const res = await playRound(20);
  assert.equal(res.chance, true);
  button('🔁 다시 풀기').click(); // 1.2초 안
  assert.equal(S().w.step, 'done', '판은 아직 — 「끝나자마자 잡기 화면」이 먼저');
  await waitFor(() => isCatchOpen(), '잡기 화면이 먼저');
  button('🔁 다시 풀기').click();
  button('단계 고르기').click();
  assert.equal(S().w.step, 'done', '잡기 창 밑에서 판을 시작하거나 화면을 바꾸지 않는다');
  CONT.click(); // 안 던지고 닫음
  await waitFor(() => !S().catching, '닫힘');
  assert.equal(enThrowsLeft(), 1, '기회는 단추로 남는다');
  button('🔁 다시 풀기').click();
  assert.equal(S().w.step, 'q', '닫은 뒤엔 같은 단추로 판');
  // 판을 푸는 중엔 잡기 단추를 눌러도(다른 길) 문제 위에 띄우지 않는다 — 빼지도 않는다
  const t0 = throws();
  await V.runEnCatch();
  assert.equal(isCatchOpen(), false);
  assert.deepEqual(throws(), t0, '판 도중엔 빼지 않는다');
  const again = await playRound(16);
  assert.equal(again.chance, false);
  await settle(CATCH_WAIT);
  assert.equal(isCatchOpen(), false);
  button('단계 고르기').click();
  assert.equal(S().w.step, 'start');
  assert.deepEqual(live('et-chip').map((c) => c.textContent), ['낱말 ✅', '문장 뜻 ✅', '빈칸·문법 💯', '문장 만들기'], '다른 단계를 다시 고를 수 있다');
  V.closeEnTest();
});

test('저절로 부른 잡기는 그 판 끝 화면을 떠났으면(창을 닫음·다른 판) 빼지 않는다 · 끝 화면이면 띄운다', async () => {
  LIB.hidden = true;
  PLAYER.hidden = false;
  const t0 = throws();
  assert.equal(V.openEnTest(MOVIE, HOOKS), true);
  await V.runEnCatch(() => false);
  assert.equal(isCatchOpen(), false);
  assert.deepEqual(throws(), t0, '떠났으면 안 뺀다 — 기회는 단추로');
  V.closeEnTest();
  const v = src('js/entestview.js');
  assert.ok(v.includes("const still = () => S.w === w && w.round === r && w.step === 'done';\n      if (still()) runEnCatch(still).catch(() => {});"), '1.2초 타이머는 판 끝 화면 확인을 넘긴다(그림을 받는 사이 떠나면 안 띄움 · 뺐으면 돌려줌)');
  assert.ok(v.includes("  return !!S.w && S.w.step !== 'q' && !!pl && !pl.hidden;"), '판을 푸는 중엔 잡기 자리가 아니다');
  assert.ok(v.includes('  if (S.catching || isCatchOpen()) return; // 🎯 잡기를 부르는 중·잡기 창이 떠 있다'), '잡기를 부르는 중에도 판을 시작하지 않는다(음악 ▶와 같다)');
});

test('쳐 넣기 — 한글 자판으로 친 글은 낸 답으로 안 센다(처음 답이 자판 실수로 굳지 않게) · 영어로 다시 쓰면 채점', async () => {
  LIB.hidden = true;
  PLAYER.hidden = false;
  await setRec({ s: 2 });
  assert.equal(V.openEnTest(MOVIE, HOOKS), true);
  button('시작 ▶').click();
  let guard = 0;
  while (cur().q.kind !== 'type' && guard++ < 20) { answerNow(true); goNext(); }
  const { r, k } = cur();
  assert.equal(cur().q.kind, 'type');
  live('et-input')[0].value = '사커';
  live('et-type')[0].submit();
  assert.equal(r.ans[k], undefined, '한글은 낸 답이 아니다');
  assert.match(mainText(), /⌨️ 영어 자판으로 바꿔서 써 주세요/);
  live('et-input')[0].value = cur().q.ans[0];
  live('et-type')[0].submit();
  assert.equal(r.ans[k].ok, true, '영어로 쓰면 그대로 채점');
  assert.doesNotMatch(mainText(), /영어 자판으로/);
  V.closeEnTest();
});

test('🔍 변이 빈틈 — 저장이 안 된 판에서 「다시 저장하기」를 빨리 두 번 눌러도 한 판은 한 번만 저장', async () => {
  LIB.hidden = true;
  PLAYER.hidden = false;
  await setRec({ s: 1 });
  assert.equal(V.openEnTest(MOVIE, HOOKS), true);
  button('시작 ▶').click();
  const stage = S().w.round.stage;
  for (let i = 0; i < 20; i++) { answerNow(i < 10); if (i === 19) fakeIdb.failNext('profile'); goNext(); }
  await waitFor(() => S().w.round.result, '저장 실패');
  assert.deepEqual(S().w.round.result, { ok: false, why: 'save' });
  assert.equal(fakeIdb.failsLeft(), 0);
  const nOf = () => Number(((recOf() || {}).n || [])[stage - 1]) || 0;
  assert.equal(nOf(), 0, '실패한 판은 없던 일');
  const again = button('다시 저장하기');
  again.click();
  again.click(); // 그리기 전에 한 번 더
  await waitFor(() => S().w.round.result && S().w.round.result.ok, '다시 저장');
  await settle(50);
  assert.equal(nOf(), 1, '한 판은 한 번만');
  V.closeEnTest();
});

test('카드 단추 — 한 번 푼 시험은 「한 문장」이 95% 밑으로 내려가도(영상을 다시 넣음·⚙ 문장 합치기) 그대로 · 기록 없는 영상은 95% 전엔 없음', () => {
  const tests = enTestsNow().tests;
  const items = [{ id: 'a2', title: MOVIE }];
  const shut = { [MOVIE]: { id: 'a2', open: false } };
  assert.deepEqual(V.testCardsOf(items, shut, tests, {}), {});
  assert.deepEqual(V.testCardsOf(items, shut, tests, { [MOVIE]: { s: 0, n: [1, 0, 0, 0, 0] } }), { a2: { title: MOVIE, stage: 1, label: '📝 시험 · 낱말' } }, '떨어진 판 하나라도 끝냈으면');
  assert.equal(V.testCardsOf(items, shut, tests, { [MOVIE]: { s: 2 } }).a2.label, '📝 시험 · 빈칸·문법');
  assert.deepEqual(V.testCardsOf([{ id: 'b2', title: MOVIE }], shut, tests, { [MOVIE]: { s: 2 } }), {}, '첫 편이 아닌 영상엔 여전히 없음');
});

test('잇기(소스) — ⏳ 새 판은 guardStart · 👀 그냥 보기는 시험이 쉼 · 닫으면 칩 · 겹친 창 목록 · 답한 뒤 끌어올림', () => {
  const v = src('js/entestview.js');
  assert.ok(v.includes("  if (S.w !== w || catchFirst(w)) return;"), '1.2초 안 단추는 잡기 먼저');
  assert.ok(v.includes("  guardStart('english', () => { if (w.round === r0 && w.step === step0) beginRound(w, stage); });"), '⏳ 오늘 영어 시간이 다 됐으면 새 판(시작·다시 풀기·다음 단계)은 연장권 뒤 계속하기로 — 그 사이 같은 창에서 판이 바뀌었으면 덮지 않는다 (Codex 235차 #1 · 236차 #1)');
  assert.ok(v.includes("  if (S.w !== w || w.step === 'q' || (w.round && w.round.saving)) return;"), '푸는 중·저장 중인 판 위에 새 판을 덮지 않는다');
  assert.ok(v.includes("import { guardStart } from './timeup.js';"));
  assert.ok(v.includes("nx.scrollIntoView({ block: 'nearest' })") && v.includes('  render();\n  showNext();\n}'), '1024×600 — 답한 뒤 풀이·다음 단추를 끌어올린다');
  const pl = src('js/player.js');
  const st = pl.slice(pl.indexOf('function startTestNow() {'), pl.indexOf('function setTestOpen(on) {'));
  assert.ok(st.indexOf('if (state.parentMode) {') > 0 && st.indexOf('if (state.parentMode) {') < st.indexOf('setTestOpen(true);'), '👀 그냥 보기는 시험 창을 열기 전에 막는다 (Codex 235차 #2)');
  assert.ok(st.includes("showPlayerMessage('👀 그냥 보기 중에는 시험이 쉬어요"));
  assert.ok(st.includes('onClose: () => { stopGrammarCue(); setTestOpen(false); updateLevelChip(); updatePartnerChip();'), '잡은 뒤 칩');
  for (const f of ['js/hatch.js', 'js/parcel.js', 'js/taken.js', 'js/korbattleview.js']) assert.ok(src(f).includes("['catch', 'en-test', "), `겹친 창 목록에 시험 창 — ${f} (Codex 235차 #5)`);
});
