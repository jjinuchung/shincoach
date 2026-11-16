// 🎬 v430 영어 영상 시험 바탕 (2026-11-16 아버님 「추천대로」) — node --test --test-concurrency=1 --test-force-exit tests/entest430.test.js
//  영상마다 5단계 × 20문제 · 「한 문장」 OPEN_PCT% 넘으면 열림(toy5는 늘) · PASS개 넘으면 다음 단계 · 💰 칸 80·90·100 차액만 · 100점 처음이면 🎯 영어 잡기 기회
//  ★ 대사는 저작권 — 이 시험의 영어 문장·영상 제목은 모두 지어낸 것이다(실제 영상 대사·원고를 넣지 않는다)
import { fakeIdb } from './fakeidb.js'; // ★ db.js·xp.js보다 먼저
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  STAGES, STAGE_QS, PASS, STAGE_NAMES, PLAN, KIND, TYPES, LISTEN, TYPE_NAMES, DEFAULT_ASK, OPEN_PCT, OPEN_ALWAYS, TIERS, TIER_COINS, STAGE_BONUS, EN_TEST_DAILY,
  titleOk, tierOf, coinOf, askOf, isListen, checkTestQ, testsOf, testOf, doneNowOf, openPctOf, openOf, openMapOf, okIndex, dealRound, normAns, judge, tally,
  emptyEnRec, enRecOf, enTestOf, copyEnTest, enRecFor, stageNow, stagesOpen, mergeEnTest, enThrowOf, enThrowsLeft as leftOf, enTakeRule, enGiveBackRule, mergeEnThrow,
  enDayKey, enTestRule, everOpened,
} from '../js/entest.js';
import { joinTiles } from '../js/grammar.js';
import { mergeStatRecord, cloneProfile, emptyProfile, getEnTestCache, putEnTestCache, EN_TEST_LIST_ID, getDaily, emptyDaily } from '../js/db.js';
import { initProfile, getProfileSnapshot, houseDo, enTestFinish, enTakeThrow, enGiveBackThrow, enThrowsLeft, enTestMap, enJudged } from '../js/xp.js';
import { EN_TEST_PATHS, SYNC_MS, LIST_MS, MAX_ROWS, rowsOf, testFilesOf, enTestsNow, loadEnTests } from '../js/entestsync.js';
import { PRIVATE_EN_TESTS, readSummary } from '../js/upload.js';
import { APP_VERSION } from '../js/version.js';

void fakeIdb;
const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
// 가짜 localStorage — 받은 때(shincoach.enTestAt)
const store = new Map();
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => { store.set(k, String(v)); },
  removeItem: (k) => { store.delete(k); },
};

const NOW = new Date('2026-11-16T10:00:00').getTime();
const DAY = enDayKey(NOW);
const pad = (n) => String(n).padStart(2, '0');
const ok = (t) => ({ t, ok: true });
const no = (t, type = 'made') => ({ t, type, why: '지어낸 풀이예요.' });
const rngOf = (seed) => { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; };
const MOVIE = 'Test Movie';
const FILM = 'Second Film';

/** 지어낸 문제 한 줄 — 유형마다 원고 꼴 그대로 */
function mkQ(vno, stage, n, type, from = MOVIE) {
  const base = { id: `T${pad(vno)}-${stage}-${pad(n)}`, from, stage, type, kind: KIND[type], at: stage * 100 + n, end: stage * 100 + n + 2, say: 'I like red apples.', ko: '나는 빨간 사과를 좋아해.' };
  const sentOpts = [ok('I like red apples.'), no('I like big apples.', 'swap'), no('I hate red apples.', 'flip'), no('I hate big apples.', 'swap')];
  switch (type) {
    case 'word': return { ...base, w: 'red', ask: '이 문장에서 red의 뜻은?', opts: [ok('빨간'), no('파란'), no('큰'), no('읽은', 'sound')] };
    case 'wordko': return { ...base, w: 'red', en: 'I like ___ apples.', ask: '\'빨간\'에 맞는 낱말을 고르세요.', opts: [ok('red'), no('read', 'sound'), no('bed', 'look'), no('blue', 'other')] };
    case 'hear': return { ...base, listen: true, w: 'red', en: 'I like ___ apples.', ask: '들린 낱말을 고르세요.', opts: [ok('red'), no('read', 'sound'), no('bed', 'look'), no('rid', 'sound')] };
    case 'meaning': return { ...base, ask: '이 문장의 뜻으로 알맞은 것은?', opts: [ok('나는 빨간 사과를 좋아해.'), no('나는 파란 사과를 좋아해.', 'part'), no('나는 빨간 사과가 싫어.', 'flip'), no('나는 파란 사과가 싫어.', 'flip')] };
    case 'match': return { ...base, ask: '우리말에 맞는 문장을 고르세요: 나는 빨간 사과를 좋아해.', opts: sentOpts };
    case 'hearsent': return { ...base, listen: true, ask: '들린 문장을 고르세요.', opts: sentOpts };
    case 'grammar': return { ...base, en: 'I ___ red apples.', ask: '빈칸에 알맞은 말은?', opts: [ok('like'), no('likes', 'sextra'), no('liked', 'time'), no('liking', 'ing')] };
    case 'spell': return { ...base, en: 'I like red ___.', ans: ['apples'], hint: '\'사과들\' · a로 시작', why: '사과 여러 개는 apples예요.', traps: { aples: ['look', 'p가 둘이에요.'] } };
    case 'form': return { ...base, say: 'I saw it yesterday.', ko: '나는 어제 그걸 봤어.', en: 'I ___ (see) it yesterday.', ans: ['saw'], hint: '어제 일이에요 — 지난 꼴로', why: 'see의 지난 꼴은 saw예요.', traps: { seed: ['irreg', '-ed를 붙이지 않아요.'] } };
    case 'dict': return { ...base, listen: true, en: 'I like red ___.', ans: ['apples'], hint: '\'사과들\'이라는 뜻', why: '들린 말은 apples예요.' };
    case 'order': return { ...base, ask: '우리말에 맞게 카드를 놓으세요: 나는 빨간 사과를 좋아해.', tiles: ['I', 'like', 'red', 'apples', '.'], ans: 'I like red apples.' };
    case 'next': return { ...base, ctx: { before: ['Do you like fruit?'] }, ask: '다음에 올 말로 알맞은 것은?', opts: [no('The bus is late.', 'flow'), ok('I like red apples.'), no('Close the door.', 'flow'), no('It is cold outside.', 'flow')] };
    case 'why': return { ...base, ask: '이 말에서 알 수 있는 마음은?', opts: [ok('사과를 좋아하는 마음'), no('사과가 싫은 마음', 'flip'), no('배고프지 않은 마음'), no('사과를 팔고 싶은 마음')] };
    case 'idiom': return { ...base, say: 'Do not give up.', ko: '포기하지 마.', x: 'give up', ask: '\'give up\'의 뜻으로 알맞은 것은?', opts: [ok('포기하다'), no('위로 주다', 'literal'), no('계속하다', 'flip'), no('나눠 주다', 'near')] };
    default: throw new Error(type);
  }
}
/** 지어낸 영상 하나 — PLAN대로 100문제 */
function video(vno, from = MOVIE) {
  const rows = [];
  for (let s = 1; s <= STAGES; s++) {
    let n = 0;
    for (const [type, k] of Object.entries(PLAN[s])) for (let i = 0; i < k; i++) rows.push(mkQ(vno, s, ++n, type, from));
  }
  return rows;
}
const errs = (q) => checkTestQ(q);
const bad = (mut, type = 'word') => { const q = mkQ(1, Number(Object.keys(PLAN).find((s) => type in PLAN[s])), 1, type); mut(q); return errs(q); };

// ───────────────────── 상수 ─────────────────────

test('상수 — 5단계 × 20문제 · 단계 이름 · 유형 14 · 듣기 셋 · 넘는 수 · 열림 95%·toy5 · 칸과 💰 · 하루 칸', () => {
  assert.equal(STAGES, 5);
  assert.equal(STAGE_QS, 20);
  assert.equal(PASS, 16);
  assert.deepEqual(STAGE_NAMES, ['낱말', '문장 뜻', '빈칸·문법', '문장 만들기', '이해']);
  for (let s = 1; s <= 5; s++) assert.equal(Object.values(PLAN[s]).reduce((a, b) => a + b, 0), STAGE_QS, `${s}단계 20문제`);
  assert.deepEqual(Object.keys(PLAN).flatMap((s) => Object.keys(PLAN[s])), TYPES, '유형 차례');
  assert.equal(TYPES.length, 14);
  for (const t of TYPES) assert.ok(TYPE_NAMES[t] && DEFAULT_ASK[t], t);
  assert.deepEqual(LISTEN, ['hear', 'hearsent', 'dict']);
  assert.equal(OPEN_PCT, 95);
  assert.deepEqual(OPEN_ALWAYS, ['toy5']);
  assert.deepEqual(TIERS, [80, 90, 100]);
  assert.deepEqual(TIER_COINS, { 80: 10, 90: 20, 100: 30 });
  assert.equal(STAGE_BONUS, 2);
  assert.deepEqual(EN_TEST_DAILY, ['enTestRuns', 'enTestPass', 'enTestBall', 'enTestCaught', 'enTestFled']);
  assert.deepEqual([tierOf(15), tierOf(16), tierOf(17), tierOf(18), tierOf(19), tierOf(20), tierOf('20'), tierOf(-3)], [0, 80, 80, 90, 90, 100, 0, 0]);
  assert.deepEqual([coinOf(80, 1), coinOf(90, 1), coinOf(100, 1), coinOf(80, 5), coinOf(90, 5), coinOf(100, 5), coinOf(0, 3), coinOf(85, 1)], [10, 20, 30, 18, 28, 38, 0, 0], '5단계 18·28·38');
  assert.deepEqual([titleOk(MOVIE), titleOk(''), titleOk('  '), titleOk('__proto__'), titleOk('x'.repeat(201)), titleOk(5)], [true, false, false, false, false, false]);
  const spell = mkQ(1, 3, 1, 'spell');
  delete spell.ask;
  assert.equal(askOf(spell), DEFAULT_ASK.spell, '쳐 넣기 원고에 물음이 없으면 정한 물음');
  assert.equal(askOf(mkQ(1, 1, 1, 'word')), '이 문장에서 red의 뜻은?');
  assert.deepEqual([isListen(mkQ(1, 1, 1, 'hear')), isListen(mkQ(1, 4, 1, 'dict')), isListen(mkQ(1, 1, 1, 'word'))], [true, true, false]);
});

// ───────────────────── 원고 한 줄 검사 ─────────────────────

test('checkTestQ — 지어낸 유형 14가지 모두 통과 · 쳐 넣기 물음이 없어도 됨', () => {
  for (const q of video(1)) assert.deepEqual(errs(q), [], `${q.id} ${q.type}`);
  const q = mkQ(1, 4, 11, 'form');
  delete q.ask;
  assert.deepEqual(errs(q), []);
});

test('checkTestQ — 화면이 깨지거나 답이 틀리게 채점되는 줄은 버린다', () => {
  assert.deepEqual(checkTestQ(null), ['문제가 객체가 아님']);
  assert.deepEqual(checkTestQ([1]), ['문제가 객체가 아님']);
  assert.ok(bad((q) => { q.id = 'X01-1-01'; }).length, 'id 꼴');
  assert.ok(bad((q) => { q.id = 'T01-2-01'; }).length, 'id 단계 ≠ stage');
  assert.ok(bad((q) => { q.stage = 6; }).length, '단계 밖');
  assert.ok(bad((q) => { q.stage = '1'; }).length, '단계가 글자');
  assert.ok(bad((q) => { q.type = 'meaning'; }).length, '그 단계에 없는 유형');
  assert.ok(bad((q) => { q.kind = 'type'; }).length, '유형과 꼴이 다름');
  assert.ok(bad((q) => { q.from = ''; }).length, '영상 제목 없음');
  assert.ok(bad((q) => { q.from = '__proto__'; }).length, '객체 열쇠로 못 쓰는 제목');
  assert.ok(bad((q) => { q.end = q.at; }).length, '장면 길이 0');
  assert.ok(bad((q) => { q.at = -1; }).length, '음수 시각');
  assert.ok(bad((q) => { q.at = '3'; }).length, '시각이 글자');
  assert.ok(bad((q) => { delete q.say; }).length, 'say 없음');
  assert.ok(bad((q) => { q.ko = ''; }).length, '우리말 뜻 없음');
  assert.ok(bad((q) => { q.listen = true; }).length, '듣기 아닌데 listen');
  assert.ok(bad((q) => { delete q.listen; }, 'hear').length, '듣기인데 listen 없음');
  assert.ok(bad((q) => { q.opts.pop(); }).length, '보기 셋');
  assert.ok(bad((q) => { q.opts[1].ok = true; }).length, '정답 둘');
  assert.ok(bad((q) => { q.opts[0].ok = false; }).length, '정답 없음');
  assert.ok(bad((q) => { q.opts[2].t = q.opts[1].t; }).length, '같은 보기');
  assert.ok(bad((q) => { q.opts[3] = null; }).length, '보기가 비었음');
  assert.ok(bad((q) => { q.opts[1].why = 3; }).length, 'why가 글이 아님');
  assert.ok(bad((q) => { q.w = 'blue'; }).length, 'w가 say에 없음');
  assert.ok(bad((q) => { q.en = 'I like ___ ___.'; }, 'wordko').length, '빈칸 둘');
  assert.ok(bad((q) => { q.en = 'You like ___ apples.'; }, 'wordko').length, '빈칸에 정답을 넣어도 say가 아님');
  assert.ok(bad((q) => { q.opts[0].t = 'blue'; q.opts[3].t = 'red'; }, 'hear').length, 'hear 정답 ≠ w');
  assert.ok(bad((q) => { q.en = 'I ___ big apples.'; }, 'grammar').length, 'grammar 빈칸');
  assert.ok(bad((q) => { q.opts[0].t = 'I like red apple.'; }, 'match').length, 'match 정답 ≠ say');
  assert.ok(bad((q) => { delete q.ctx; }, 'next').length, 'next 앞 대사 없음');
  assert.ok(bad((q) => { q.ctx.before = ['a', 'b', 'c', 'd']; }, 'next').length, 'next 앞 대사 넷');
  assert.ok(bad((q) => { q.ctx = 'x'; }, 'why').length, 'ctx 꼴');
  assert.ok(bad((q) => { q.en = 'I like ___ ___.'; }, 'spell').length, '쳐 넣기 빈칸 둘');
  assert.ok(bad((q) => { q.ans = ['pears']; }, 'spell').length, 'ans 첫째가 say와 안 맞음');
  assert.ok(bad((q) => { q.ans = []; }, 'spell').length, 'ans 빔');
  assert.ok(bad((q) => { q.en = 'I like ___.'; q.say = 'I like red apples.'; q.ans = ['red apples']; }, 'spell').length, '낱말 둘');
  assert.ok(bad((q) => { delete q.hint; }, 'spell').length, '도움말 없음');
  assert.ok(bad((q) => { q.traps = ['x']; }, 'spell').length, 'traps 꼴');
  assert.ok(bad((q) => { q.en = 'I ___ it yesterday.'; }, 'form').length, 'form 괄호 없음');
  assert.ok(bad((q) => { q.ans = ['seen']; }, 'form').length, 'form 답이 say와 안 맞음');
  assert.ok(bad((q) => { q.tiles = ['I', 'like', '.']; }, 'order').length, '카드 셋');
  assert.ok(bad((q) => { q.tiles = ['I', 'like', 'big', 'apples', '.']; }, 'order').length, '이은 카드 ≠ ans');
  assert.ok(bad((q) => { delete q.ask; }, 'order').length, '순서 물음 없음');
});

test('checkTestQ — 앱에서 뺀 원고 사람용 검사(틀린 보기 종류 이름 · 우리말 why · 둥근 따옴표 · 소문자 시작 · 순서 카드 문장부호 자리)는 버리지 않는다', () => {
  assert.deepEqual(bad((q) => { q.opts[1].type = 'zzz'; delete q.opts[2].why; }), [], '모르는 종류·why 없음');
  assert.deepEqual(bad((q) => { q.say = 'it’s red.'; q.w = 'red'; q.en = 'it’s ___.'; }, 'wordko'), [], '둥근 따옴표·소문자 시작');
  assert.deepEqual(bad((q) => { q.tiles = ['I', 'like', 'red', 'apples', '.']; q.opts = undefined; }, 'order'), []);
  assert.deepEqual(bad((q) => { q.hint = '\'사과들\' · apples'; }, 'spell'), [], '도움말에 답 글자(사람용)');
});

// ───────────────────── 영상마다 시험 ─────────────────────

test('testsOf — 영상마다 5단계 × 20 · id 차례 · 깨진 줄·겹친 id는 버림(뒤 줄) · 단계가 덜 차면 안 엶 · 넘친 줄은 안 씀', () => {
  const rows = [...video(1), ...video(2, FILM)];
  const r = testsOf(rows);
  assert.deepEqual(Object.keys(r.tests), [MOVIE, FILM]);
  assert.deepEqual([r.bad, r.unused, r.closed], [0, 0, []]);
  for (const t of [MOVIE, FILM]) {
    assert.equal(r.tests[t].length, 5);
    r.tests[t].forEach((s, k) => {
      assert.equal(s.length, STAGE_QS);
      assert.ok(s.every((q) => q.stage === k + 1 && q.from === t));
      assert.deepEqual(s.map((q) => q.id), s.map((q) => q.id).slice().sort(), 'id 차례');
    });
  }
  assert.equal(r.used.size, 200);
  // 겹친 id — 뒤 줄 버림 · 깨진 줄
  const dup = { ...video(1)[0], ko: '뒤 줄' };
  const r2 = testsOf([...video(1), dup, { id: 'T01-1-99' }, 'x']);
  assert.equal(r2.bad, 3);
  assert.equal(r2.unused, 3);
  assert.notEqual(r2.tests[MOVIE][0][0].ko, '뒤 줄', '앞 줄이 이긴다');
  // 단계가 덜 참 → 그 영상만 안 엶
  const short = video(2, FILM).filter((q) => q.id !== 'T02-3-05');
  const r3 = testsOf([...video(1), ...short]);
  assert.deepEqual(Object.keys(r3.tests), [MOVIE]);
  assert.deepEqual(r3.closed, [FILM]);
  assert.equal(r3.unused, 99, '안 연 영상 줄은 안 씀');
  assert.equal(r3.bad, 0);
  // 넘친 줄 (그 단계 21째) — 안 쓴다
  const r4 = testsOf([...video(1), mkQ(1, 1, 21, 'word')]);
  assert.equal(r4.unused, 1);
  assert.ok(r4.tests[MOVIE][0].every((q) => q.id !== 'T01-1-21'));
  // 나눠 부르면 seen이 이어진다
  const seen = new Set();
  testsOf(video(1), seen);
  assert.equal(testsOf(video(1), seen).bad, 100);
  assert.equal(testOf(r.tests, MOVIE).length, 5);
  assert.equal(testOf(r.tests, 'constructor'), null, '프로토타입 이름');
  assert.equal(testOf(r.tests, 'Nope'), null);
  assert.deepEqual(testsOf(null), { tests: {}, bad: 0, closed: [], unused: 0, used: new Set() });
});

// ───────────────────── 열림 ─────────────────────

test('열림 — 지금 문장 열쇠로 거른 done ÷ 문장 수 ≥ 95% · toy5는 늘 · 같은 제목은 첫 편 · 깨진 영상 건너뜀', () => {
  assert.deepEqual([openOf(MOVIE, 19, 20), openOf(MOVIE, 18, 20), openOf(MOVIE, 95, 100), openOf(MOVIE, 94, 100), openOf(MOVIE, 0, 0), openOf(MOVIE, 5, '20')], [true, false, true, false, false, false]);
  assert.equal(openOf('toy5', 0, 1643), true, '토이 스토리 5는 따로 열어 둠');
  assert.equal(openOf('Toy5', 0, 10), false, '글자 그대로만');
  assert.deepEqual([openPctOf(19, 20), openPctOf(2, 3), openPctOf(1, 0)], [95, 66, 0]);
  const recs = [
    { key: 'a|10', itemId: 'a', start: 1, done: true },
    { key: 'a|20', itemId: 'a', start: 2, done: true },
    { key: 'a|25', itemId: 'a', start: 2.5, done: true }, // ⚙ 합치기를 바꾸기 전 옛 조각 — 지금 열쇠에 없다
    { key: 'a|30', itemId: 'a', start: 3, done: false },
    { itemId: 'a', start: 4, done: true }, // key 없는 옛 줄 — 같은 꼴로 만든다
    { key: 'b|10', itemId: 'b', start: 1, done: true },
  ];
  const keysA = new Set(['a|10', 'a|20', 'a|30', 'a|40']);
  assert.equal(doneNowOf(recs, 'a', keysA), 3);
  assert.equal(doneNowOf(recs, 'a', null), 4, '열쇠가 없으면 거르지 않는다');
  const items = [
    { id: 'z', title: MOVIE, broken: true },
    { id: 'a', title: MOVIE },
    { id: 'c', title: MOVIE }, // 같은 제목 둘째 — 안 셈
    { id: 'b', title: 'toy5' },
    { id: 'd', title: 'Other' },
  ];
  const calls = [];
  const m = openMapOf(items, recs, (it) => (it.id === 'a' ? 4 : 10), (it) => { calls.push(it.id); return it.id === 'a' ? keysA : new Set(['b|10']); }, [MOVIE, 'toy5']);
  assert.deepEqual(Object.keys(m), [MOVIE, 'toy5']);
  assert.deepEqual(m[MOVIE], { id: 'a', done: 3, total: 4, pct: 75, open: false });
  assert.equal(m.toy5.open, true);
  assert.deepEqual(calls, ['a', 'b'], '시험이 있는 영상만 문장을 나눈다');
  const all = openMapOf(items, recs, () => { throw new Error('깨짐'); }, () => { throw new Error('깨짐'); });
  assert.deepEqual(all[MOVIE], { id: 'a', done: 4, total: 0, pct: 0, open: false }, '셈이 깨져도 그리기는 이어 간다');
  assert.equal(all.Other.open, false);
  const noCount = openMapOf([{ id: 'a', title: MOVIE }], recs, null, () => keysA);
  assert.equal(noCount[MOVIE].total, 4, 'cueCountOf가 없으면 열쇠 수');
});

// ───────────────────── 판 만들기 · 채점 ─────────────────────

test('dealRound — 문제·보기·카드 차례를 섞어도 정답 표시가 맞다 · 원고 줄은 그대로', () => {
  const stages = testsOf(video(1)).tests[MOVIE];
  const before = JSON.stringify(stages);
  let moved = 0;
  let tilesMoved = 0;
  for (let seed = 1; seed <= 12; seed++) {
    for (const qs of stages) {
      const round = dealRound(qs, rngOf(seed));
      assert.deepEqual(round.map((d) => d.i).slice().sort((a, b) => a - b), qs.map((_, i) => i), '문제 20개 모두 한 번씩');
      for (const d of round) {
        assert.equal(d.q, qs[d.i]);
        if (d.q.kind === 'pick') {
          assert.deepEqual(d.opts.slice().sort(), [0, 1, 2, 3]);
          assert.equal(d.q.opts[d.opts[d.okAt]].ok, true, '보이는 자리 okAt = 정답');
          assert.equal(judge(d.q, d.opts[d.okAt]).ok, true);
          if (d.okAt !== okIndex(d.q)) moved += 1;
        } else if (d.q.kind === 'order') {
          assert.deepEqual(d.tiles.slice().sort(), d.q.tiles.map((_, k) => k));
          assert.notEqual(joinTiles(d.tiles.map((k) => d.q.tiles[k])), d.q.ans, '섞은 카드는 맞는 차례가 아니다');
          assert.equal(judge(d.q, d.q.tiles.map((_, k) => k)).ok, true);
          tilesMoved += 1;
        } else assert.equal(d.opts, undefined);
      }
    }
  }
  assert.ok(moved > 100, '정답 자리가 옮겨 다닌다');
  assert.ok(tilesMoved > 0);
  assert.equal(JSON.stringify(stages), before, '원고 줄을 고치지 않는다');
  assert.deepEqual(dealRound(null), []);
});

test('judge — 고르기(원고 보기 번호) · 쳐 넣기(대소문자·빈칸·끝 문장부호·굽은 따옴표 · ans 아무거나 · traps · 따옴표만 빠짐) · 순서(글·번호)', () => {
  const p = mkQ(1, 1, 1, 'word');
  assert.deepEqual(judge(p, 0), { ok: true, kind: 'ok', why: '', okText: '빨간', expl: '', pick: 0, okIdx: 0 });
  assert.deepEqual(judge(p, 2), { ok: false, kind: 'wrong', type: 'made', why: '지어낸 풀이예요.', okText: '빨간', expl: '', pick: 2, okIdx: 0 });
  for (const x of [-1, 4, 1.5, '0', null]) assert.equal(judge(p, x).kind, 'empty', `낸 답이 아님 ${x}`);
  const s = mkQ(1, 3, 1, 'spell');
  for (const a of ['apples', ' Apples ', 'APPLES.', 'apples!', '“apples”', 'apples,']) assert.equal(judge(s, a).ok, true, a);
  assert.deepEqual(judge(s, 'Aples'), { ok: false, kind: 'trap', type: 'look', why: 'p가 둘이에요.', okText: 'apples', expl: '사과 여러 개는 apples예요.' });
  assert.deepEqual(judge(s, 'pear'), { ok: false, kind: 'other', why: '', okText: 'apples', expl: '사과 여러 개는 apples예요.' });
  assert.equal(judge(s, '  ').kind, 'empty');
  const two = { ...s, ans: ['apples', 'fruits'] };
  assert.equal(judge(two, 'Fruits').ok, true, 'ans 목록 중 아무거나');
  const apos = { ...s, say: 'I can’t.', en: 'I ___.', ans: ['can\'t'], traps: undefined };
  assert.equal(judge(apos, 'can’t').ok, true, '굽은 작은따옴표');
  assert.equal(judge(apos, 'cant').kind, 'apos');
  assert.equal(judge(apos, 'cant').ok, false);
  const o = mkQ(1, 4, 1, 'order');
  assert.deepEqual(judge(o, ['I', 'like', 'red', 'apples', '.']), { ok: true, kind: 'ok', why: '', okText: 'I like red apples.', expl: '', at: -1 });
  assert.deepEqual(judge(o, ['I', 'red', 'like', 'apples', '.']), { ok: false, kind: 'wrong', why: '', okText: 'I like red apples.', expl: '', at: 1 });
  assert.equal(judge(o, [0, 1, 2, 3, 4]).ok, true, '원고 카드 번호');
  assert.equal(judge(o, [0, 0, 2, 3, 4]).ok, false, '같은 카드 두 번');
  assert.equal(judge(o, [0, 1, 2, 3, 9]).ok, false, '없는 카드');
  assert.equal(judge(o, []).kind, 'empty');
  assert.equal(judge(null, 1).kind, 'empty');
  assert.equal(normAns('  It’S  OK. '), 'it\'s ok');
  assert.deepEqual(tally([{ q: p, ok: true }, { q: s, ok: false }, { q: o, ok: false }, { q: s, ok: false }, null, { q: { type: 'zzz' }, ok: false }]), { correct: 1, wrong: { spell: 2, order: 1 } });
});

// ───────────────────── 프로필 칸 ─────────────────────

test('enTest 칸 고쳐 읽기 — 깨진 값(글자·배열·무한대·음수)은 없는 것 · 빈 칸·쓸 수 없는 제목은 뺀다', () => {
  assert.deepEqual(enRecOf({ s: '3', b: [Infinity, -1, '5', 25, 3.7], p: [85, 80, '90', 100, null], n: [1, 2, -3, 'x', 4.9], d: ['2026-11-16', 'x', 5, '', '2026-1-1'], w: { word: 2, zzz: 5, hear: -1, grammar: '3' }, t: -5 }),
    { s: 0, b: [0, 0, 0, 20, 3], p: [0, 80, 0, 100, 0], n: [1, 2, 0, 0, 4], d: ['2026-11-16', '', '', '', ''], w: { word: 2 }, t: 0 });
  assert.equal(enRecOf({ s: 0, b: [], w: {} }), null, '빈 칸');
  assert.equal(enRecOf([1]), null);
  assert.deepEqual(enRecOf({ s: 9 }).s, 5, '단계 수는 5까지');
  const raw = JSON.parse('{"__proto__": {"s": 2}, "": {"s": 1}, "A": {"s": 1}, "B": {"s": 0}, "C": "x"}');
  assert.deepEqual(Object.keys(enTestOf(raw)), ['A']);
  assert.deepEqual(enTestOf(null), {});
  const a = { [MOVIE]: { s: 1, b: [16, 0, 0, 0, 0] } };
  const c = copyEnTest(a);
  c[MOVIE].b[0] = 0;
  assert.equal(a[MOVIE].b[0], 16, '깊은 복사');
  assert.deepEqual(enRecFor(a, MOVIE).b, [16, 0, 0, 0, 0]);
  assert.deepEqual(enRecFor(a, 'constructor'), emptyEnRec());
  assert.deepEqual([stageNow(null), stageNow({ s: 1 }), stageNow({ s: 4 }), stageNow({ s: 5 })], [1, 2, 5, 5]);
  assert.deepEqual(stagesOpen({ s: 2 }), [1, 2, 3]);
});

test('병합 — 칸마다 큰 쪽 · 처음 넘은 날은 이른 날 · 제목 합집합 · 둘 다 비면 null · 🎯 장부는 카운터마다 max', () => {
  const x = { [MOVIE]: { s: 2, b: [18, 16, 0, 0, 0], p: [90, 80, 0, 0, 0], n: [3, 1, 0, 0, 0], d: ['2026-11-15', '2026-11-16', '', '', ''], w: { word: 2, hear: 1 }, t: 100 } };
  const y = { [MOVIE]: { s: 1, b: [20, 0, 0, 0, 0], p: [100, 0, 0, 0, 0], n: [5, 0, 0, 0, 0], d: ['2026-11-14', '', '', '', ''], w: { word: 1, wordko: 4 }, t: 50 }, [FILM]: { s: 1, b: [16, 0, 0, 0, 0], p: [80, 0, 0, 0, 0] } };
  const m = mergeEnTest(x, y);
  assert.deepEqual(m[MOVIE], { s: 2, b: [20, 16, 0, 0, 0], p: [100, 80, 0, 0, 0], n: [5, 1, 0, 0, 0], d: ['2026-11-14', '2026-11-16', '', '', ''], w: { word: 2, hear: 1, wordko: 4 }, t: 100 });
  assert.deepEqual(Object.keys(m), [MOVIE, FILM]);
  assert.deepEqual(mergeEnTest(y, x)[MOVIE], m[MOVIE], '차례와 상관없이');
  assert.equal(mergeEnTest(null, undefined), null);
  assert.equal(mergeEnTest({ A: 'x' }, {}), null, '깨진 것만이면 없는 것');
  assert.deepEqual(mergeEnThrow({ earned: 2, used: 1 }, { earned: 1, used: 2, refunded: 1 }), { earned: 2, used: 2, refunded: 1 });
  assert.equal(mergeEnThrow(null, 'x'), null);
  assert.equal(mergeEnThrow({ earned: 0 }, {}), null, '셈이 없으면 칸을 두지 않는다');
  // db 병합 'profile' 가지 — 옛 백업이 받은 칸·쓴 기회를 되살리지 못한다
  const cur = { id: 'me', updatedAt: 10, coins: 5, enTest: x, enThrow: { earned: 1, used: 1, refunded: 0 } };
  const old = { id: 'me', updatedAt: 5, coins: 9, enTest: { [MOVIE]: { s: 0, b: [3, 0, 0, 0, 0] } }, enThrow: { earned: 1, used: 0, refunded: 0 } };
  const out = mergeStatRecord('profile', cur, old);
  assert.deepEqual(out.enTest[MOVIE].p, [90, 80, 0, 0, 0]);
  assert.equal(out.enTest[MOVIE].s, 2);
  assert.deepEqual(out.enThrow, { earned: 1, used: 1, refunded: 0 });
  const none = mergeStatRecord('profile', { id: 'me', updatedAt: 1 }, { id: 'me', updatedAt: 2, enTest: 'x', enThrow: [1] });
  assert.equal('enTest' in none, false, '깨진 값뿐이면 칸 없음');
  assert.equal('enThrow' in none, false);
  // cloneProfile — 있을 때만 · 깊은 복사 · 깨진 값은 고쳐 읽음
  assert.equal('enTest' in cloneProfile(emptyProfile()), false, '없으면 칸 없음(🎹 piano 꼴)');
  assert.equal('enThrow' in cloneProfile(emptyProfile()), false);
  const p = { ...emptyProfile(), enTest: { [MOVIE]: { s: 1, b: [16, 0, 0, 0, 0] }, Bad: 'x' }, enThrow: { earned: '2', used: 1 } };
  const cl = cloneProfile(p);
  cl.enTest[MOVIE].b[0] = 0;
  assert.equal(p.enTest[MOVIE].b[0], 16);
  assert.deepEqual(Object.keys(cl.enTest), [MOVIE]);
  assert.deepEqual(cl.enThrow, { earned: 2, used: 1, refunded: 0 });
  assert.ok(EN_TEST_DAILY.every((k) => emptyDaily('2026-11-16')[k] === 0), '하루 칸(DAILY_SUMS)');
});

// ───────────────────── 보상 규칙 (순수) ─────────────────────

const ARGS = (more = {}) => ({ title: MOVIE, stage: 1, correct: 16, wrong: { word: 2, hear: 2 }, now: NOW, known: [MOVIE, FILM], ...more });

test('enTestRule — 칸을 처음 넘을 때 차액만 · coins·coinsEarned 함께 · 넘은 단계 늘기만 · 다음 단계 열림 · 100점 처음이면 🎯 하나', () => {
  const p = { coins: 3, coinsEarned: 7 };
  let r = enTestRule(p, ARGS());
  assert.deepEqual(r, { ok: true, title: MOVIE, stage: 1, correct: 16, score: 80, tier: 80, prevTier: 0, coins: 10, passed: true, firstPass: true, opened: 2, chance: false, best: 16, s: 1, left: 0, day: DAY });
  assert.deepEqual([p.coins, p.coinsEarned], [13, 17]);
  assert.deepEqual(p.enTest[MOVIE], { s: 1, b: [16, 0, 0, 0, 0], p: [80, 0, 0, 0, 0], n: [1, 0, 0, 0, 0], d: [DAY, '', '', '', ''], w: { word: 2, hear: 2 }, t: NOW });
  r = enTestRule(p, ARGS({ now: NOW + 1000 }));
  assert.deepEqual([r.coins, r.firstPass, r.opened, r.chance, p.coins, p.enTest[MOVIE].n[0]], [0, false, 0, false, 13, 2], '같은 칸 다시 — 💰 없음');
  assert.deepEqual(p.enTest[MOVIE].w, { word: 4, hear: 4 }, '틀린 수는 늘기만');
  r = enTestRule(p, ARGS({ correct: 18, wrong: { word: 2 }, now: NOW + 86400000 }));
  assert.deepEqual([r.tier, r.prevTier, r.coins, p.coins, p.coinsEarned], [90, 80, 10, 23, 27], '90점 — 차액 10');
  assert.equal(p.enTest[MOVIE].d[0], DAY, '처음 넘은 날은 그대로');
  r = enTestRule(p, ARGS({ correct: 20, wrong: {} }));
  assert.deepEqual([r.tier, r.coins, r.chance, r.left, p.coins], [100, 10, true, 1, 33], '100점 — 차액 10 · 🎯 하나');
  assert.deepEqual(p.enThrow, { earned: 1, used: 0, refunded: 0 });
  r = enTestRule(p, ARGS({ correct: 20, wrong: {} }));
  assert.deepEqual([r.coins, r.chance, p.enThrow.earned], [0, false, 1], '100점 다시 — 기회는 처음만');
  r = enTestRule(p, ARGS({ correct: 10, wrong: { word: 6, wordko: 2, hear: 2 } }));
  assert.deepEqual([r.ok, r.passed, r.tier, r.coins, r.best, p.enTest[MOVIE].s], [true, false, 0, 0, 20, 1], '못 넘어도 기록 · 넘은 단계는 안 줄어든다');
  // 2단계는 100점 바로 — 칸 셋을 한 번에(+2)
  r = enTestRule(p, ARGS({ stage: 2, correct: 20, wrong: {} }));
  assert.deepEqual([r.coins, r.chance, r.opened, r.s, p.enThrow.earned], [32, true, 3, 2, 2]);
  // 이미 넘은 단계를 다시 골라도 됨 · 앞 단계를 안 넘었으면 거절
  assert.equal(enTestRule(p, ARGS({ stage: 1 })).ok, true);
  const coins0 = p.coins;
  const before = JSON.stringify(p);
  assert.deepEqual(enTestRule(p, ARGS({ stage: 4, wrong: {} })), { ok: false, why: 'locked' });
  assert.equal(JSON.stringify(p), before, '거절하면 프로필 그대로');
  assert.equal(p.coins, coins0);
  // 5단계 — 18 · 28 · 38
  const q = { enTest: { [MOVIE]: { s: 4 } } };
  assert.equal(enTestRule(q, ARGS({ stage: 5, correct: 16, wrong: { next: 4 } })).coins, 18);
  const z = enTestRule(q, ARGS({ stage: 5, correct: 20, wrong: {} }));
  assert.deepEqual([z.coins, z.opened, z.firstPass, z.s], [20, 0, false, 5], '마지막 단계는 새로 열리는 단계 없음');
  assert.equal(coinOf(100, 5), 38);
});

test('enTestRule — 거절: 시험 없는 제목 · 깨진 요청 · 그 단계에 없는 유형의 틀린 수 · 틀린 수가 너무 많음', () => {
  const p = {};
  assert.deepEqual(enTestRule(p, ARGS({ title: 'Nope' })), { ok: false, why: 'title' });
  assert.deepEqual(enTestRule(p, ARGS({ known: undefined })), { ok: false, why: 'title' }, '시험이 있는 제목을 모르면');
  assert.deepEqual(enTestRule(p, ARGS({ title: '__proto__', known: ['__proto__'] })), { ok: false, why: 'title' });
  assert.equal(enTestRule({}, ARGS({ known: new Set([MOVIE]) })).ok, true, 'Set');
  assert.equal(enTestRule({}, ARGS({ known: { [MOVIE]: [] } })).ok, true, '시험 객체');
  assert.deepEqual(enTestRule({}, ARGS({ known: { constructor: 1 }, title: 'toString' })), { ok: false, why: 'title' }, '프로토타입 이름');
  for (const more of [{ stage: 0 }, { stage: 6 }, { stage: '1' }, { correct: 21 }, { correct: -1 }, { correct: 15.5 }, { now: 0 }, { now: NaN }, { now: '1' },
    { wrong: { meaning: 1 } }, { wrong: { word: 9 } }, { wrong: { word: 3, hear: 2 } }, { wrong: { word: -1 } }, { wrong: { word: '1' } }, { wrong: [1] }]) {
    assert.deepEqual(enTestRule({}, ARGS(more)), { ok: false, why: 'bad' }, JSON.stringify(more));
  }
  assert.equal(enTestRule({}, ARGS({ wrong: undefined })).ok, true, '틀린 수는 없어도 된다');
  assert.equal(Object.keys(p).length, 0, '거절하면 프로필 그대로');
});

test('🎯 장부 규칙 — 빼기·돌려주기(korean 꼴) · 남은 기회', () => {
  const p = {};
  assert.deepEqual(enTakeRule(p), { ok: false, why: 'none' });
  assert.deepEqual(enGiveBackRule(p), { ok: false, why: 'none' });
  p.enThrow = { earned: 1 };
  assert.equal(leftOf(p.enThrow), 1);
  assert.deepEqual(enTakeRule(p), { ok: true, left: 0 });
  assert.deepEqual(enTakeRule(p), { ok: false, why: 'none' });
  assert.deepEqual(enGiveBackRule(p), { ok: true, left: 1 });
  assert.deepEqual(enGiveBackRule(p), { ok: false, why: 'none' }, '뺀 수보다 많이 돌려주지 않는다');
  assert.deepEqual(p.enThrow, { earned: 1, used: 1, refunded: 1 });
  assert.deepEqual(enThrowOf({ earned: 3, used: 1, refunded: 5 }), { earned: 3, used: 1, refunded: 1 });
});

// ───────────────────── xp (한 트랜잭션) ─────────────────────

before(async () => {
  console.warn = () => {};
  await initProfile();
});
const reset = () => houseDo((p) => { delete p.enTest; delete p.enThrow; return { ok: true }; });
const saved = () => fakeIdb.get('profile', 'me') || {};
const KNOWN = [MOVIE];

test('xp enTestFinish — 저장된 프로필로 한 트랜잭션 · 같은 판을 두 번 끝내도(두 창이 함께여도) 차액만 · 저장 실패는 {ok:false}(그대로) · 하루 칸', async () => {
  await reset();
  const day0 = enDayKey(Date.now()); // 시험 도중 자정을 넘기면 하루 칸은 못 본다 (🔍 Codex 235차 #7)
  const c0 = getProfileSnapshot().coins;
  let r = await enTestFinish({ title: MOVIE, stage: 1, correct: 16, wrong: { word: 4 }, known: KNOWN });
  assert.deepEqual([r.ok, r.coins, r.tier, r.opened], [true, 10, 80, 2]);
  assert.equal(saved().coins, c0 + 10, '저장소');
  assert.equal(getProfileSnapshot().coins, c0 + 10, '메모리');
  assert.equal(saved().enTest[MOVIE].s, 1);
  r = await enTestFinish({ title: MOVIE, stage: 1, correct: 16, wrong: { word: 4 }, known: KNOWN });
  assert.deepEqual([r.ok, r.coins], [true, 0], '같은 칸 두 번 — 💰 없음');
  // 두 창이 같은 90점을 함께 끝냄 — 한 번만 차액
  const [a, b] = await Promise.all([1, 2].map(() => enTestFinish({ title: MOVIE, stage: 1, correct: 18, wrong: { word: 2 }, known: KNOWN })));
  assert.deepEqual([a.coins + b.coins, saved().coins], [10, c0 + 20]);
  // 저장 실패 — 없던 일
  const snap = JSON.stringify(saved().enTest);
  fakeIdb.failNext('profile');
  r = await enTestFinish({ title: MOVIE, stage: 1, correct: 20, wrong: {}, known: KNOWN });
  assert.deepEqual(r, { ok: false, why: 'save' });
  assert.equal(fakeIdb.failsLeft(), 0);
  assert.equal(JSON.stringify(saved().enTest), snap, '저장소 그대로');
  assert.equal(JSON.stringify(enTestMap()), snap, '메모리도 그대로');
  assert.equal(enThrowsLeft(), 0);
  // 하루 칸 — 판 넷(실패한 판은 안 셈) · 넘은 판 넷
  const day = enDayKey(Date.now());
  const d = await getDaily(day);
  if (day === day0) assert.deepEqual([d.enTestRuns, d.enTestPass, d.enTestBall || 0], [4, 4, 0]);
  // 거절은 하루 칸에 안 셈
  r = await enTestFinish({ title: MOVIE, stage: 3, correct: 16, wrong: {}, known: KNOWN });
  assert.deepEqual(r, { ok: false, why: 'locked' });
  if (day === day0 && enDayKey(Date.now()) === day) assert.equal((await getDaily(day)).enTestRuns, 4);
  // 그리기용 복사 — 고쳐도 프로필은 그대로
  const m = enTestMap();
  m[MOVIE].s = 0;
  assert.equal(enTestMap()[MOVIE].s, 1);
});

test('xp — 100점 처음 → 🎯 기회 · 빼기·돌려주기는 한 트랜잭션 · 없으면 none · 저장 실패는 {ok:false}(장부 그대로) · 던진 결과 하루 칸', async () => {
  await reset();
  assert.deepEqual(await enTakeThrow(), { ok: false, why: 'none' });
  const r = await enTestFinish({ title: MOVIE, stage: 1, correct: 20, known: KNOWN });
  assert.deepEqual([r.chance, r.left, r.coins], [true, 1, 30]);
  assert.equal(enThrowsLeft(), 1);
  assert.deepEqual(saved().enThrow, { earned: 1, used: 0, refunded: 0 });
  assert.equal((await enTestFinish({ title: MOVIE, stage: 1, correct: 20, known: KNOWN })).chance, false, '다시 100점 — 기회 없음');
  fakeIdb.failNext('profile');
  assert.deepEqual(await enTakeThrow(), { ok: false, why: 'save' });
  assert.deepEqual(saved().enThrow, { earned: 1, used: 0, refunded: 0 }, '못 빼면 그대로');
  assert.deepEqual(await enTakeThrow(), { ok: true, left: 0 });
  assert.deepEqual(saved().enThrow, { earned: 1, used: 1, refunded: 0 });
  assert.equal(enThrowsLeft(), 0);
  assert.deepEqual(await enTakeThrow(), { ok: false, why: 'none' });
  fakeIdb.failNext('profile');
  assert.deepEqual(await enGiveBackThrow(), { ok: false, why: 'save' });
  assert.deepEqual(await enGiveBackThrow(), { ok: true, left: 1 });
  assert.deepEqual(await enGiveBackThrow(), { ok: false, why: 'none' });
  assert.deepEqual(saved().enThrow, { earned: 1, used: 1, refunded: 1 });
  const day = enDayKey(Date.now());
  const d0 = (await getDaily(day)) || {};
  assert.deepEqual(await enJudged(25, true), { ok: true });
  assert.deepEqual(await enJudged('133', false), { ok: true });
  assert.deepEqual(await enJudged('x', true), { ok: false, why: 'id' });
  const d = await getDaily(day);
  if (enDayKey(Date.now()) === day) { // 자정을 넘겼으면 하루 칸은 못 본다 (🔍 Codex 235차 #7)
    assert.deepEqual([d.enTestCaught - (d0.enTestCaught || 0), d.enTestFled - (d0.enTestFled || 0)], [1, 1]);
  }
  assert.ok(((await getDaily(r.day)) || {}).enTestBall >= 1, '생긴 기회 — 그 판이 저장된 날(r.day)에 (Codex 236차 #3)');
});

test('xp enTestFinish — known을 안 주면 받아 둔 시험 사본(entestsync)의 제목으로 · 사본에 없는 제목은 거절', async () => {
  await reset();
  assert.deepEqual(await enTestFinish({ title: MOVIE, stage: 1, correct: 16 }), { ok: false, why: 'title' }, '아직 안 읽음');
  await loadEnTests({ getCache: async () => ({ id: EN_TEST_LIST_ID, files: { [EN_TEST_PATHS[0]]: video(1) }, at: 1 }) });
  assert.deepEqual(Object.keys(enTestsNow().tests), [MOVIE]);
  assert.equal((await enTestFinish({ title: MOVIE, stage: 1, correct: 16 })).ok, true);
  assert.deepEqual(await enTestFinish({ title: FILM, stage: 1, correct: 16 }), { ok: false, why: 'title' });
});

// ───────────────────── 받기 (entestsync) ─────────────────────

test('testFilesOf·rowsOf — 경로 차례(앞 파일 id가 이긴다) · 경로마다 안 쓴 줄(깨짐·겹친 id·안 연 영상) · 모르는 경로는 안 봄', () => {
  const [p1, p2, p3] = EN_TEST_PATHS;
  assert.deepEqual(EN_TEST_PATHS, ['english/tests/t1.json', 'english/tests/t2.json', 'english/tests/t3.json']);
  assert.deepEqual(PRIVATE_EN_TESTS, EN_TEST_PATHS, 'upload.js와 같은 경로');
  assert.deepEqual([SYNC_MS, LIST_MS], [600000, 30000]);
  const film = video(2, FILM);
  const r = testFilesOf({ [p1]: [...video(1), { id: 'T01-9-01' }], [p2]: [video(1)[0], ...film.slice(1)], [p3]: 'x', 'english/tests/t9.json': video(3, 'Third') });
  assert.deepEqual(Object.keys(r.tests), [MOVIE]);
  assert.deepEqual(r.closed, [FILM], '둘째 파일 영상은 첫 줄이 앞 파일과 겹쳐 1단계가 덜 참');
  assert.deepEqual(r.bad, { [p1]: 1, [p2]: 100 });
  assert.equal(rowsOf([...video(1), null, { id: 'x' }]).length, 100);
  assert.ok(MAX_ROWS >= 600);
});

test('syncEnTests — 10분에 한 번 · 열쇠 없음/못 받음은 그대로 · 파일마다 따로(못 받은·모두 깨진 파일은 그대로) · 저장 실패 · 같은 파일은 다시 안 씀 · 📥 noteCheck', async () => {
  store.clear();
  const m = await import('../js/entestsync.js?run=sync');
  const [p1, p2, p3] = EN_TEST_PATHS;
  const puts = [];
  const notes = [];
  let putFail = false;
  const deps = (lists, t, more = {}) => ({
    now: () => t,
    readList: async (p) => { const v = lists[p]; if (v instanceof Error) throw v; return v || []; },
    noteCheck: async (p, c) => { notes.push([p, c.rows, c.bad]); },
    getCache: async () => null,
    putCache: async (w) => { if (putFail) throw new Error('가득 참'); puts.push(Object.keys(w)); },
    ...more,
  });
  let r = await m.syncEnTests(false, deps({ [p1]: [...video(1), { id: 'broken' }], [p2]: [...video(2, FILM).slice(1)], [p3]: new Error('인터넷') }, 1000));
  assert.deepEqual(Object.keys(r.tests), [MOVIE]);
  assert.deepEqual(r.closed, [FILM]);
  assert.equal(r.changed, true);
  assert.deepEqual(puts, [[p1, p2]], '받은 파일만 · 못 받은 파일은 안 씀');
  assert.deepEqual(notes, [[p1, 101, 1], [p2, 99, 99]], '깨진 줄 · 안 연 영상 줄');
  // 10분 안 — 받지 않는다
  notes.length = 0;
  const asked = [];
  r = await m.syncEnTests(false, deps({}, 1000 + 60000, { readList: async (p) => { asked.push(p); return video(3, 'Third'); } }));
  assert.deepEqual([r.changed, notes.length, Object.keys(r.tests).length], [false, 0, 1]);
  assert.deepEqual(asked, [], '10분 안엔 받으러 가지도 않는다(새 원고가 있어도) — 🔍 변이 빈틈');
  // 열쇠 없음 — 모두 빈 목록 → 그대로
  r = await m.syncEnTests(false, deps({}, 1000 + 11 * 60000));
  assert.deepEqual([r.changed, Object.keys(r.tests)], [false, [MOVIE]]);
  // 둘째 파일을 고쳐 다시 · 첫 파일이 모두 깨짐 → 첫 파일은 받아 둔 것 그대로 · 같은 내용은 다시 안 씀
  puts.length = 0;
  notes.length = 0;
  r = await m.syncEnTests(true, deps({ [p1]: [{ id: 'x' }], [p2]: video(2, FILM), [p3]: [...video(1)] }, 1000 + 12 * 60000));
  assert.deepEqual(Object.keys(r.tests).sort(), [FILM, MOVIE].sort());
  assert.deepEqual(puts, [[p2, p3]]);
  assert.deepEqual(notes, [[p1, 1, 1], [p2, 100, 0], [p3, 100, 100]], '셋째 파일은 앞 파일과 id가 모두 겹침');
  puts.length = 0;
  r = await m.syncEnTests(true, deps({ [p2]: video(2, FILM) }, 1000 + 13 * 60000));
  assert.deepEqual([puts.length, r.changed], [0, false], '같은 파일은 다시 안 씀');
  // 저장 실패 — 받아 둔 것 그대로 · 📥엔 모두 안 씀
  putFail = true;
  notes.length = 0;
  r = await m.syncEnTests(true, deps({ [p3]: video(3, 'Third') }, 1000 + 14 * 60000));
  assert.deepEqual([r.changed, Object.keys(r.tests).includes('Third')], [false, false]);
  assert.deepEqual(notes, [[p3, 100, 100]]);
  putFail = false;
  // 늦은 파일은 끊고 나머지는 받는다
  r = await m.syncEnTests(true, deps({}, 1000 + 15 * 60000, { listMs: 20, readList: async (p) => (p === p1 ? new Promise(() => {}) : p === p3 ? video(3, 'Third') : []) }));
  assert.equal(Object.keys(r.tests).includes('Third'), true);
  // 같이 부르면 한 번
  const s1 = m.syncEnTests(true, deps({}, 1000 + 16 * 60000));
  assert.equal(m.syncEnTests(true, deps({}, 1000 + 16 * 60000)), s1);
  await s1;
  // 사본 단계 배열은 새 배열 — 받은 쪽이 섞어도 그대로
  const now = m.enTestsNow();
  now.tests[MOVIE][0].reverse();
  assert.equal(m.enTestsNow().tests[MOVIE][0][0].id, 'T01-1-01');
});

test('syncEnTests — 진짜 사본(blobs entest:list)에 두고 새 실행이 그대로 읽는다 · 다른 blobs는 그대로 · 열쇠 없는 기기는 빈 것', async () => {
  store.clear();
  fakeIdb.clear();
  await putEnTestCache({ [EN_TEST_PATHS[1]]: video(2, FILM), x: 'not list' });
  let c = await getEnTestCache();
  assert.deepEqual(Object.keys(c.files), [EN_TEST_PATHS[1]], '목록이 아닌 것은 안 넣는다');
  const at1 = c.at;
  const m = await import('../js/entestsync.js?run=blobs');
  await m.syncEnTests(true, { now: () => 5000, readList: async (p) => (p === EN_TEST_PATHS[0] ? video(1) : []), noteCheck: async () => {} });
  c = fakeIdb.get('blobs', EN_TEST_LIST_ID);
  assert.deepEqual(Object.keys(c.files).sort(), [EN_TEST_PATHS[0], EN_TEST_PATHS[1]].sort(), '받은 파일만 바뀌고 안 넘긴 파일은 그대로');
  assert.ok(c.at > at1, '쓴 때는 늘 커진다');
  fakeIdb.failNext('blobs');
  await assert.rejects(putEnTestCache({ [EN_TEST_PATHS[0]]: [] }));
  assert.equal((await getEnTestCache()).files[EN_TEST_PATHS[0]].length, 100, '못 쓰면 그대로');
  const again = await import('../js/entestsync.js?run=blobs2');
  assert.deepEqual(again.enTestsNow(), { tests: {}, closed: [] }, '읽기 전엔 빈 것');
  assert.deepEqual(Object.keys((await again.loadEnTests()).tests).sort(), [FILM, MOVIE].sort());
  fakeIdb.clear();
  const none = await import('../js/entestsync.js?run=nokey');
  assert.deepEqual(await none.syncEnTests(true, { now: () => 6000, readList: async () => [], noteCheck: async () => {} }), { tests: {}, closed: [], changed: false });
});

// ───────────────────── 이름·판·셸 ─────────────────────

test('📥 받기 줄 — 「📝 영상 시험 1~3」 · 받지 않은 문제 · 「영상 시험 확인해 줘」 · 판 v430 이상 · 셸에 새 파일', () => {
  const fmt = () => 't';
  assert.match(readSummary({ 'english/tests/t2.json': { ok: true, at: 1, n: 600 } }, fmt), /📝 영상 시험 2 ✅ t \(600개\)/);
  assert.match(readSummary({ 'english/tests/t1.json': { ok: true, at: 1, n: 600, check: { rows: 600, bad: 2 } } }, fmt), /📝 영상 시험 1 ⚠️ t \(600개 — 받지 않은 문제 2 · Claude에게 "영상 시험 확인해 줘"\)/);
  assert.match(readSummary({ 'english/tests/t3.json': { ok: true, at: 1, n: 0, missing: true } }, fmt), /📝 영상 시험 3 · 아직 없음/);
  assert.ok(Number(APP_VERSION.slice(1)) >= 430);
  const sw = read('sw.js');
  assert.match(sw, /'\.\/js\/entest\.js'/);
  assert.match(sw, /'\.\/js\/entestsync\.js'/);
  assert.match(sw, new RegExp(`const CACHE_VERSION = '${APP_VERSION}';`));
  // 앱 코드는 원고(대사)를 들고 있지 않다 — 받기 경로만
  assert.doesNotMatch(read('js/entestsync.js'), /"say"\s*:/);
});

// ───────────────────── 🔍 v430 검토 고침 ─────────────────────

test('🔍 변이 빈틈 — 높은 단계를 넘은 뒤 낮은 단계를 다시 넘어도 넘은 단계는 그대로(늘기만) · 떨어진 판은 하루 칸 「넘음」에 안 셈 · 거절·저장 실패는 하루 칸에 아무것도 안 씀', async () => {
  const p = { enTest: { [MOVIE]: { s: 3 } } };
  const r = enTestRule(p, ARGS({ stage: 1, correct: 18, wrong: { word: 2 } }));
  assert.deepEqual([r.ok, r.passed, r.firstPass, r.opened, r.s], [true, true, false, 0, 3]);
  assert.equal(p.enTest[MOVIE].s, 3, '넘은 단계가 내려가지 않는다');
  await reset();
  const day0 = enDayKey(Date.now());
  const f = await enTestFinish({ title: MOVIE, stage: 1, correct: 10, wrong: { word: 6, hear: 4 }, known: KNOWN });
  assert.deepEqual([f.ok, f.passed], [true, false]);
  assert.deepEqual(await enTestFinish({ title: MOVIE, stage: 3, correct: 20, known: KNOWN }), { ok: false, why: 'locked' });
  fakeIdb.failNext('profile');
  assert.deepEqual(await enTestFinish({ title: MOVIE, stage: 1, correct: 20, known: KNOWN }), { ok: false, why: 'save' });
  assert.equal(fakeIdb.get('daily', undefined), undefined, '거절·저장 실패는 날짜 없는 하루 칸을 만들지 않는다');
  if (enDayKey(Date.now()) === day0) {
    const d = await getDaily(day0);
    assert.deepEqual([d.enTestRuns, d.enTestPass || 0], [1, 0], '떨어진 판 — 판 하나 · 넘음 없음 · 거절·실패는 안 셈');
  }
});

test('everOpened — 끝낸 판이 하나라도 있으면(넘은 단계 · 받은 칸 · 판 수) 한 번 연 시험 · 깨진 값·빈 칸은 아님', () => {
  assert.equal(everOpened(null), false);
  assert.equal(everOpened({}), false);
  assert.equal(everOpened(emptyEnRec()), false);
  assert.equal(everOpened({ s: 'x', n: ['1'] }), false, '깨진 값');
  assert.equal(everOpened({ n: [1, 0, 0, 0, 0] }), true, '떨어진 판 하나');
  assert.equal(everOpened({ p: [80, 0, 0, 0, 0] }), true);
  assert.equal(everOpened({ s: 1 }), true);
});

test('enTestRule — 틀린 수는 유형 개수(PLAN)로 막지 않는다(원고가 단계 안 유형 수를 바꿔도 떨어진 판이 사라지지 않게) · 합·단계에 없는 유형은 그대로 막음', () => {
  assert.ok(PLAN[1].word < 9);
  const r = enTestRule({}, ARGS({ correct: 11, wrong: { word: 9 } }));
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.deepEqual(enTestRule({}, ARGS({ correct: 0, wrong: { word: 21 } })), { ok: false, why: 'bad' }, '한 판 문제 수보다 많으면');
  assert.deepEqual(enTestRule({}, ARGS({ correct: 12, wrong: { word: 9 } })), { ok: false, why: 'bad' }, '합이 20 − 맞힌 수를 넘으면');
  assert.deepEqual(enTestRule({}, ARGS({ correct: 11, wrong: { meaning: 1 } })), { ok: false, why: 'bad' }, '그 단계에 없는 유형');
});

test('judge — 따옴표만 빠진 답은 「거의 맞았어요 — 따옴표(\')가 빠졌어요」(처음 답만 세므로 「넣어요」라고 시키지 않는다)', () => {
  const q = { id: 'T01-3-01', from: MOVIE, stage: 3, type: 'spell', kind: 'type', at: 1, end: 2, say: 'I can not go.', ko: '난 못 가.', en: 'I ___ go.', ans: ['can\'t'] };
  const j = judge(q, 'cant');
  assert.deepEqual([j.ok, j.kind], [false, 'apos']);
  assert.equal(j.why, '거의 맞았어요 — 따옴표(\')가 빠졌어요');
});
