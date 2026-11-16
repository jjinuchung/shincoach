// 🎬 v430 영어 영상 시험 — 📤 보고·검사 칸 (2026-11-16 아버님 「추천대로」) — node --test --test-concurrency=1 --test-force-exit tests/entestreport430.test.js
//  english/tests.md(entest.testsMd) · usage 하루 줄(enTestDayLine) · upload.gatherFiles getEnTest · upload.enTestMdNow(받아 둔 원고 + 저장된 프로필 + 열림) ·
//  check.mjs가 공개 저장소의 english/tests 원고를 막음(privcheck publicEnTestHits) · privcheck가 비공개 english/tests/t1~t3.json을 앱과 같은 검사로(enTestProblems)
//  ★ 대사는 저작권 — 이 시험의 영어 문장·영상 제목은 모두 지어낸 것이다(실제 영상 대사·원고를 넣지 않는다)
import { fakeIdb } from './fakeidb.js'; // ★ db.js·xp.js보다 먼저
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { STAGES, PLAN, KIND, EN_TEST_DAILY, OPEN_ALWAYS, testsMd, enTestDayLine, enTestRule, enTakeRule, enGiveBackRule } from '../js/entest.js';
import { getProfile, putEnTestCache, sentenceKey } from '../js/db.js';
import { EN_TEST_PATHS, syncEnTests } from '../js/entestsync.js';
import { playableStarts } from '../js/srt.js';
import { gatherFiles, usageFiles, enTestMdNow, PRIVATE_MAX_BYTES } from '../js/upload.js';
import { checkPrivateDir, enTestProblems, isEnTestPath, publicEnTestHits, PUBLIC_EN_TEST_DIRS } from '../tools/privcheck.mjs';

void fakeIdb;
const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
// 가짜 localStorage — entestsync 받은 때 · stats 문장 합치기 설정(없으면 기본값)
const store = new Map();
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => { store.set(k, String(v)); },
  removeItem: (k) => { store.delete(k); },
};

const TODAY = '2026-11-16';
const NOW = new Date('2026-11-16T10:00:00').getTime();
const MIN = 60 * 1000;
const pad = (n) => String(n).padStart(2, '0');
const ok = (t) => ({ t, ok: true });
const no = (t, type = 'made') => ({ t, type, why: '지어낸 풀이예요.' });
const MOVIE = 'Test Movie';
const OTHER = 'Other Film';
const HALF = 'Half Film';
const svg = () => '<svg>';

/** 지어낸 문제 한 줄 — 유형마다 원고 꼴 그대로 (entest430 시험과 같은 지어낸 문장) */
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
    case 'spell': return { ...base, en: 'I like red ___.', ans: ['apples'], hint: '\'사과들\' · a로 시작', why: '사과 여러 개는 apples예요.' };
    case 'form': return { ...base, say: 'I saw it yesterday.', ko: '나는 어제 그걸 봤어.', en: 'I ___ (see) it yesterday.', ans: ['saw'], hint: '어제 일이에요 — 지난 꼴로', why: 'see의 지난 꼴은 saw예요.' };
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
/** 지어낸 자막 — 문장 n개(마침표로 끝나 합치기를 켜도 그대로) */
function srt(n) {
  const t = (s) => `00:${pad(Math.floor(s / 60))}:${pad(s % 60)},000`;
  return Array.from({ length: n }, (_, i) => `${i + 1}\n${t(i * 3 + 1)} --> ${t(i * 3 + 2)}\nSample line number ${i + 1}.\n`).join('\n');
}
/** 지어낸 기록이 쌓인 프로필 — 실제 보상 규칙(enTestRule)으로 */
function playedProfile() {
  const p = {};
  const known = [MOVIE, OTHER, 'Gone Title'];
  assert.equal(enTestRule(p, { title: MOVIE, stage: 1, correct: 15, wrong: { word: 3, wordko: 1, hear: 1 }, now: NOW, known }).passed, false);
  assert.equal(enTestRule(p, { title: MOVIE, stage: 1, correct: 18, wrong: { word: 1, hear: 1 }, now: NOW + MIN, known }).tier, 90);
  assert.equal(enTestRule(p, { title: MOVIE, stage: 2, correct: 20, now: NOW + 2 * MIN, known }).chance, true);
  assert.equal(enTestRule(p, { title: OTHER, stage: 1, correct: 16, wrong: { hear: 2, wordko: 2 }, now: NOW + 3 * MIN, known }).tier, 80);
  assert.equal(enTestRule(p, { title: 'Gone Title', stage: 1, correct: 10, wrong: { word: 8, hear: 2 }, now: NOW - 60 * MIN, known }).ok, true);
  // 🎯 하나 받아서 → 뺐다가 → 안 던져 돌려주고 → 다시 뺌 (받음 1 · 뺌 2 · 돌려줌 1)
  assert.equal(enTakeRule(p).ok, true);
  assert.equal(enGiveBackRule(p).ok, true);
  assert.equal(enTakeRule(p).ok, true);
  return p;
}
const clean = (md) => !/undefined|NaN|Infinity|\[object/.test(md);

// ───────────────────── english/tests.md (순수) ─────────────────────

test('testsMd — 영상마다 넘은 단계·지금 단계·판·마지막 · 단계 줄(최고·칸·판·처음 넘은 날·안 풂·잠김) · 틀린 유형 우리말 · 모든 영상 유형 합 · 🎯 장부 · 읽는 법', () => {
  const p = playedProfile();
  const tests = { [MOVIE]: [[]], [OTHER]: [[]], toy5: [[]], 'Missing Video': [[]], 'Shut Film': [[]] };
  const open = {
    [MOVIE]: { id: 'v1', done: 19, total: 20, pct: 95, open: true },
    [OTHER]: { id: 'v2', done: 8, total: 20, pct: 40, open: false },
    toy5: { id: 'v3', done: 0, total: 50, pct: 0, open: true },
    'Shut Film': { id: 'v4', done: 8, total: 20, pct: 40, open: false },
  };
  const md = testsMd({ enTest: p.enTest, enThrow: p.enThrow, tests, closed: [HALF], open, today: TODAY });
  const lines = md.split('\n');
  assert.ok(md.startsWith(`📝 영어 영상 시험 기록 (${TODAY}) — v430부터`), md.slice(0, 80));
  assert.ok(md.endsWith('\n') && clean(md));
  // 읽는 법 — 열림 기준 · 넘는 수 · 칸과 💰 · 한 판의 유형별 문제 수 · 🎯 · 하루 줄 자리
  const how = md.slice(md.indexOf('## 읽는 법'), md.indexOf('## 시험이 있는 영상'));
  for (const w of ['95% 이상', 'toy5는 늘 열림', '16개 이상 맞혀(80점)', '80·90·100점', '1단계 10·20·30 · 단계마다 +2', '낱말 뜻 8 · 우리말 → 낱말 6 · 🔊 낱말 듣기 6', '🎯 영어 포켓몬 잡기', 'usage/날짜.md의 「🎬 영상 시험」']) assert.ok(how.includes(w), w);
  // 시험이 있는 영상 — 받아 둔 원고 차례 · 열림 · toy5 · 이 기기에 없는 제목 · 안 연 영상
  assert.ok(lines.includes('## 시험이 있는 영상 — 이 기기에 받아 둔 원고 5편'));
  assert.ok(lines.includes(`- 「${MOVIE}」 ✅ 열림 · 한 문장 95% (19문장 · 모두 20)`));
  // 한 번 푼 시험은 「한 문장」이 95% 밑으로 내려가도(영상을 다시 넣음·⚙ 문장 합치기) 열린 채 — 영어 목록 단추(testCardsOf)와 같은 규칙 (🔍 v430 검토 F3)
  assert.ok(lines.includes(`- 「${OTHER}」 ✅ 열림(전에 푼 시험 — 「한 문장」이 다시 내려가도 그대로) · 한 문장 40% (8문장 · 모두 20)`));
  assert.ok(lines.includes('- 「Shut Film」 🔒 아직 · 한 문장 40% (8문장 · 모두 20)'), '기록 없는 영상은 95% 전엔 잠김');
  assert.ok(lines.includes('- 「toy5」 ✅ 열림(늘 열어 둔 영상) · 한 문장 0% (0문장 · 모두 50)'));
  assert.ok(lines.some((l) => l.startsWith('- 「Missing Video」 — 이 기기에 이 제목 영상이 없어요')));
  assert.ok(lines.some((l) => l.startsWith(`- ⚠️ 단계마다 20문제가 안 차 시험을 안 연 영상: 「${HALF}」`)));
  // 영상마다 — 마지막으로 끝낸 차례(OTHER가 가장 늦게)
  const heads = lines.filter((l) => l.startsWith('### '));
  assert.deepEqual(heads.map((l) => l.slice(4, l.indexOf(' — '))), [`「${OTHER}」`, `「${MOVIE}」`, '「Gone Title」']);
  assert.ok(heads[1].startsWith(`### 「${MOVIE}」 — 넘은 단계 2 · 지금 단계 3 빈칸·문법 · 판 모두 3 · 마지막 11-16 10:02`), heads[1]);
  assert.ok(heads[0].includes('넘은 단계 1 · 지금 단계 2 문장 뜻 · 판 모두 1'));
  const block = (t) => lines.slice(lines.findIndex((l) => l.startsWith(`### 「${t}」`)) + 1, lines.findIndex((l, i) => i > lines.findIndex((x) => x.startsWith(`### 「${t}」`)) && (l.startsWith('### ') || l.startsWith('## '))));
  const mv = block(MOVIE);
  assert.ok(mv.includes('- 1 낱말: 최고 18개 · 칸 90점 · 판 2 · 처음 넘은 날 11-16'), mv.join('\n'));
  assert.ok(mv.includes('- 2 문장 뜻: 최고 20개 · 칸 100점 · 판 1 · 처음 넘은 날 11-16'));
  assert.ok(mv.includes('- 3 빈칸·문법: (아직 안 풂)') && mv.includes('- 4 문장 만들기: (잠김)') && mv.includes('- 5 이해: (잠김)'));
  assert.ok(mv.includes('- 틀린 유형: 낱말 뜻(word) 4 · 🔊 낱말 듣기(hear) 2 · 우리말 → 낱말(wordko) 1'), '많은 차례 · 같으면 단계 차례 · 다시 푼 판도 더함');
  assert.ok(!mv.some((l) => l.includes('받아 둔 원고에 없는')), '원고가 있는 제목');
  const gone = block('Gone Title');
  assert.ok(gone.includes('- 1 낱말: 최고 10개 · 칸 없음 · 판 1 · 처음 넘은 날 —') && gone.includes('- 2 문장 뜻: (잠김)'), gone.join('\n'));
  assert.ok(gone.some((l) => l.startsWith('- (지금 받아 둔 원고에 없는 제목')), '기록만 있는 제목');
  // 모든 영상 유형 합 · 🎯
  const all = lines.slice(lines.indexOf('## 유형마다 틀린 수 (모든 영상 · 많은 차례)') + 1, lines.indexOf('## 🎯 영어 잡기 기회') - 1);
  assert.deepEqual(all, ['- 낱말 뜻(word) 12', '- 🔊 낱말 듣기(hear) 6', '- 우리말 → 낱말(wordko) 3']);
  assert.ok(lines.includes('- 받음 1 · 씀 1(뺌 2 · 돌려줌 1) · 남음 0'));
  // ★ 원고 글(대사·보기·우리말 뜻)은 싣지 않는다 — 넘겨받은 원고에 문제가 들어 있어도
  const md2 = testsMd({ enTest: p.enTest, enThrow: p.enThrow, tests: { [MOVIE]: [video(1).slice(0, 20)] }, open: null, today: TODAY });
  for (const w of ['I like red apples', '빨간 사과', 'apples', 'T01-']) assert.ok(!md2.includes(w), w);
  assert.ok(md2.includes(`- 「${MOVIE}」\n`) && md2.includes('(열림은 이번에 못 셌어요'), '열림을 못 셌으면 제목만');
});

test('testsMd — 시험을 끝낸 적이 없으면 짧게(한 줄 + 시험이 있는 영상) · 받아 둔 원고도 없으면 그 말 · 🎯 장부만 있어도 긴 글 · 깨진 값은 없는 것', () => {
  const short = testsMd({ tests: [MOVIE, OTHER, MOVIE, '', '__proto__'], open: { [MOVIE]: { done: 20, total: 20, pct: 100, open: true } }, today: TODAY });
  const sl = short.trim().split('\n');
  assert.equal(sl.length, 7, short); // 머리 · 빈 줄 · 한 줄 · 빈 줄 · 시험이 있는 영상 머리 · 영상 둘
  assert.ok(sl[2].startsWith('(아직 끝낸 시험이 없어요 — 「📝 시험」은 영어 목록의 열린 영상 카드에'), sl[2]);
  assert.ok(sl.includes('## 시험이 있는 영상 — 이 기기에 받아 둔 원고 2편'), '겹친 제목·못 쓰는 제목은 뺀다');
  assert.ok(!short.includes('## 읽는 법') && !short.includes('## 영상마다') && clean(short));
  const none = testsMd({ today: TODAY });
  assert.ok(none.includes('(받아 둔 원고 없음 — 📤 열쇠가 있고 비공개 english/tests를 받은 기기에서만') && none.includes('원고 0편'), none);
  // 🎯 장부만 (기록 칸이 지워졌어도 장부는 보인다)
  const th = testsMd({ enThrow: { earned: 2, used: 1, refunded: 0 }, today: TODAY });
  assert.ok(th.includes('## 영상마다') && th.includes('(아직 끝낸 시험 없음)') && th.includes('- 받음 2 · 씀 1(뺌 1 · 돌려줌 0) · 남음 1'), th);
  // 깨진 값 — 글자·배열·무한대·음수·모르는 유형·못 쓰는 제목 · 줄바꿈 든 제목은 한 줄로
  const broken = testsMd({
    enTest: { '': { s: 1 }, x: 'str', y: [1], 'Two\nLines': { s: 'x', b: [Infinity, -1, '3'], p: [85, 80], n: [NaN, 2], d: ['2026-1-1', '2026-11-15'], w: { word: -2, bogus: 3, hear: 1.5 }, t: Infinity } },
    enThrow: [1, 2], tests: 'x', closed: 'y', open: [], today: TODAY,
  });
  assert.ok(clean(broken) && !broken.includes('bogus'), broken);
  assert.ok(broken.includes('### 「Two Lines」 — 넘은 단계 0 · 지금 단계 1 낱말 · 판 모두 2 · 마지막 —'), broken);
  assert.ok(broken.includes('- 2 문장 뜻: 최고 0개 · 칸 80점 · 판 2 · 처음 넘은 날 11-15') && broken.includes('- 틀린 유형: 🔊 낱말 듣기(hear) 1'));
  assert.ok(broken.includes('- 아직 없음 (100점을 처음 넘은 단계가 없어요)'));
  for (const v of [undefined, null, 'x', []]) assert.ok(testsMd(v).startsWith('📝 영어 영상 시험 기록 ()'), String(v));
});

test('enTestDayLine — 하루 칸(EN_TEST_DAILY) 이름 그대로 · 판·넘음 · 🎯 생김·잡음·놓침(던지기만 한 날도) · 한 것이 없거나 깨진 값이면 빈 글', () => {
  assert.deepEqual(EN_TEST_DAILY, ['enTestRuns', 'enTestPass', 'enTestBall', 'enTestCaught', 'enTestFled']);
  const d = Object.fromEntries(EN_TEST_DAILY.map((k, i) => [k, i + 3])); // 3·4·5·6·7 — 칸마다 다른 수로 자리를 확인
  assert.equal(enTestDayLine(d), '🎬 영상 시험 3판(넘음 4) · 🎯 영어 잡기 기회 5번 생김 · 던져서 잡음 6 · 놓침 7');
  assert.equal(enTestDayLine({ enTestRuns: 2, enTestPass: 0 }), '🎬 영상 시험 2판(넘음 0)');
  assert.equal(enTestDayLine({ enTestFled: 1 }), '🎯 영어 잡기 기회 0번 생김 · 던져서 잡음 0 · 놓침 1', '전에 생긴 기회로 던지기만 한 날');
  for (const v of [null, undefined, {}, [], 'x', { enTestRuns: '3', enTestBall: -1, enTestCaught: Infinity, enTestFled: NaN }]) assert.equal(enTestDayLine(v), '', JSON.stringify(v));
});

// ───────────────────── 📤 upload.js ─────────────────────

test('📤 usageFiles — 날마다 줄에 🎬 영상 시험 · 🎯 영어 잡기(🎹 음악 줄 뒤) · 읽는 법 한 줄 · 한 것이 없는 날은 줄이 없다', () => {
  const days = [{ date: TODAY, appOpens: 1, enTime: 600, enTestRuns: 2, enTestPass: 1, enTestBall: 1, enTestCaught: 1, pnTapN: 1, pnTapOk: 1, pnCoins: 5 }, { date: '2026-11-15', appOpens: 1, enTime: 60 }];
  const f = usageFiles(days, TODAY, [], '')[0];
  const line = f.text.split('\n').find((l) => l.startsWith('- 11-16:'));
  assert.ok(line.includes('🎬 영상 시험 2판(넘음 1) · 🎯 영어 잡기 기회 1번 생김 · 던져서 잡음 1 · 놓침 0'), line);
  assert.ok(line.indexOf('🎹 태블릿 치기') < line.indexOf('🎬 영상 시험'), '🎹 음악 줄 뒤');
  assert.ok(!f.text.split('\n').find((l) => l.startsWith('- 11-15:')).includes('🎬'));
  const how = f.text.slice(f.text.indexOf('## 읽는 법'), f.text.indexOf('## 최근 7일'));
  assert.ok(how.includes('- 🎬 영상 시험(v430) = 영어 영상 시험을 끝까지 푼 판(넘음 = 20문제 중 16개 이상 맞혀 그 단계를 넘은 판') && how.includes('english/tests.md'));
});

test('📤 gatherFiles — getEnTest가 글을 주면 english/tests.md · null이면 없음 · 못 만들면(던짐) 이것만 빠지고 나머지는 그대로 · 안 넘기면 없음', async () => {
  const base = { getMath: async () => null, listDaily: async () => [], mathReportText: () => '', asksText: () => '', collectTodo: () => [], today: TODAY };
  let seen = null;
  const files = await gatherFiles({ ...base, getEnTest: async (t) => { seen = t; return '📝 시험 글\n'; } });
  assert.equal(seen, TODAY);
  assert.deepEqual(files.filter((f) => f.path === 'english/tests.md').map((f) => f.text), ['📝 시험 글\n']);
  const has = async (o) => (await gatherFiles(o)).some((f) => f.path === 'english/tests.md');
  assert.equal(await has(base), false, '안 넘기면 없음(옛 부름 그대로)');
  assert.equal(await has({ ...base, getEnTest: async () => null }), false);
  assert.equal(await has({ ...base, getEnTest: async () => '' }), false);
  for (const bad of [async () => { throw new Error('idb'); }, () => { throw new Error('sync'); }]) {
    const out = await gatherFiles({ ...base, getEnTest: bad });
    assert.ok(!out.some((f) => f.path === 'english/tests.md') && out.some((f) => f.path === 'essay/todo.md'), '이것만 빠진다');
  }
});

test('📤 보내기 호출 줄 — getEnTest: enTestMdNow는 `getMath, ` 바로 뒤 · 다른 시험이 못 박은 조각은 그대로(letters351·englishskip·korwrite·korreport·blackbox292·reward278·piano402)', () => {
  const u = read('js/upload.js');
  assert.ok(u.includes('files = await gatherFiles({ getLetterTodo: letterTodoNow, getMath, getEnTest: enTestMdNow, listDaily, '));
  assert.equal(u.split('getEnTest: enTestMdNow').length, 2, '호출은 한 번');
  assert.ok(u.includes('files = await gatherFiles({ getLetterTodo: letterTodoNow, getMath, '), 'letters351');
  assert.match(u, /collectTodo: st\.collectTodo, getKorTodo: korTodoNow, getEnglish: enNow, getKorReport: korReportNow, usagePlaces: [^\n]*, today \}\);\n {2}\} catch \{/, 'englishskip·korreport');
  assert.match(u, /getKorTodo: korTodoNow, getEnglish: enNow, getKorReport: korReportNow, usagePlaces: [^\n]*, today/, 'korwrite');
  assert.ok(u.includes('usagePlaces: usage ? usage.PLACES : undefined, crashLog, verLine, getReward: rewardNow,'), 'blackbox292');
  assert.ok(u.includes('getReward: rewardNow, getWeekly: weeklyNow, getFamily: familyNow, getFeedback: feedbackNow, getStock: stockNow, getJourney: journeyNow, getGrammar: grammarNow, getSpell: spellNow, getMusic: musicNow, uploadLog: logTextNow(today), today });'), 'reward278');
  assert.match(u, /const piano = pianoDayLine\(d\);\n {4}if \(piano\) parts\.push\(piano\);/, 'piano402');
  // enTestMdNow — 받기(syncEnTests·네트워크)는 하지 않고 받아 둔 것만 · 문장 기록은 첫 편 영상만(getSentenceStats) · 열림은 openMapOf
  const fn = u.slice(u.indexOf('export async function enTestMdNow(today) {'), u.indexOf('\n}\n', u.indexOf('export async function enTestMdNow(today) {')));
  assert.ok(fn.includes('es.loadEnTests()') && !fn.includes('syncEnTests') && !fn.includes('getAllSentenceStats'), fn);
  assert.ok(fn.includes('getSentenceStats(id)') && fn.includes('et.openMapOf(items, records, (it) => st.cueInfoOf(it).count, (it) => st.cueInfoOf(it).keys, titles)') && fn.includes('} catch { open = null; }'));
  assert.ok(!/^import .*entestsync\.js/m.test(u), 'upload.js는 entestsync.js를 쓸 때만 불러온다(entestsync도 upload.js를 쓸 때만 — 순환 없음)');
});

test('📤 enTestMdNow — 받아 둔 원고도 기록도 없으면 null · 받아 둔 원고만 있으면 짧은 글(열림 = 첫 편 영상 · 지금 문장 열쇠로 거른 한 문장) · 기록이 생기면 긴 글 · gatherFiles로 english/tests.md', async () => {
  assert.equal(await enTestMdNow(TODAY), null, '📤 열쇠가 없는 기기 — 파일을 안 만든다');
  // 받아 둔 원고: 지어낸 영상 셋 + 단계가 덜 찬 영상 하나
  await putEnTestCache({ [EN_TEST_PATHS[0]]: [...video(1, MOVIE), ...video(2, OTHER), ...video(3, 'toy5'), ...video(4, HALF).slice(0, -1)] });
  const re = await syncEnTests(false, { readList: async () => [], noteCheck: async () => {} }); // 다른 창이 받아 둔 것처럼 사본을 다시 읽게 (받기는 빈 목록)
  assert.deepEqual(Object.keys(re.tests).sort(), [OTHER, MOVIE, 'toy5'].sort());
  // 이 기기 영상: 같은 제목 둘(새것이 첫 편 — listItems는 최신순) · 다른 영상 · toy5
  const items = [
    { id: 'vNew', title: MOVIE, enText: srt(20), koText: '', duration: 0, createdAt: 30 },
    { id: 'vOld', title: MOVIE, enText: srt(20), koText: '', duration: 0, createdAt: 10 },
    { id: 'vOther', title: OTHER, enText: srt(20), koText: '', duration: 0, createdAt: 20 },
    { id: 'vToy', title: 'toy5', enText: srt(40), koText: '', duration: 0, createdAt: 40 },
  ];
  for (const it of items) fakeIdb.put('items', it);
  const starts = playableStarts(srt(20), { merge: true });
  assert.equal(starts.length, 20);
  const rec = (id, start, done = true) => ({ key: sentenceKey(id, start), itemId: id, start, done });
  for (const s of starts.slice(0, 19)) fakeIdb.put('sentenceStats', rec('vNew', s));
  fakeIdb.put('sentenceStats', rec('vNew', starts[19], false));
  for (const s of [0.4, 7.7, 99.9]) fakeIdb.put('sentenceStats', rec('vNew', s)); // ⚙ 문장 합치기를 바꾸기 전 옛 조각 기록 — 안 셈
  for (const s of starts) fakeIdb.put('sentenceStats', rec('vOld', s)); // 둘째 편 — 안 셈
  for (const s of starts.slice(0, 8)) fakeIdb.put('sentenceStats', rec('vOther', s));
  const short = await enTestMdNow(TODAY);
  assert.ok(short.includes('(아직 끝낸 시험이 없어요'), short);
  assert.ok(short.includes(`- 「${MOVIE}」 ✅ 열림 · 한 문장 95% (19문장 · 모두 20)`), short);
  assert.ok(short.includes(`- 「${OTHER}」 🔒 아직 · 한 문장 40% (8문장 · 모두 20)`));
  assert.ok(short.includes('- 「toy5」 ✅ 열림(늘 열어 둔 영상) · 한 문장 0% (0문장 · 모두 40)') && OPEN_ALWAYS.includes('toy5'));
  assert.ok(short.includes(`안 연 영상: 「${HALF}」`) && short.includes('원고 3편'));
  assert.ok(!short.includes('I like red apples'), '원고 글은 싣지 않는다');
  // 저장된 프로필에 기록이 생기면 긴 글
  await getProfile();
  const p = playedProfile();
  fakeIdb.put('profile', { id: 'me', coins: 0, enTest: p.enTest, enThrow: p.enThrow });
  const full = await enTestMdNow(TODAY);
  assert.ok(full.includes('## 읽는 법') && full.includes(`### 「${MOVIE}」 — 넘은 단계 2`) && full.includes('- 받음 1 · 씀 1(뺌 2 · 돌려줌 1) · 남음 0') && clean(full), full);
  // 보내기 길 그대로 — gatherFiles가 english/tests.md로
  const files = await gatherFiles({ getMath: async () => null, listDaily: async () => [], mathReportText: () => '', asksText: () => '', collectTodo: () => [], getEnTest: enTestMdNow, today: TODAY });
  assert.equal(files.find((f) => f.path === 'english/tests.md').text, full);
});

// ───────────────────── 🔒 비공개 검사 (check.mjs --private) ─────────────────────

test('🔒 privcheck enTestProblems — 앱과 같은 검사(checkTestQ) · 앞 줄과 겹친 id · 빈 목록 · 단계가 덜 찬 영상(단계마다 수) · 넘친 줄 · 글에는 경로·줄 번호·id·제목만', () => {
  const [p1, p2, p3] = EN_TEST_PATHS;
  assert.deepEqual(enTestProblems({ [p1]: video(1, MOVIE), [p2]: video(2, OTHER) }), []);
  assert.deepEqual(enTestProblems({}), []);
  assert.deepEqual(enTestProblems(null), []);
  // 깨진 줄
  const brokenRow = { ...mkQ(2, 1, 1, 'word', OTHER), opts: [] };
  let e = enTestProblems({ [p1]: video(1, MOVIE), [p2]: [brokenRow, ...video(2, OTHER).slice(1)] });
  assert.ok(e.some((m) => m === `내용 오류: ${p2}[0]: 보기는 넷`), e.join('\n'));
  assert.ok(e.some((m) => m.includes(`「${OTHER}」는 단계마다 20문제가 안 차`) && m.includes('19·20·20·20·20')), '깨진 줄 때문에 덜 찬 단계');
  // 앞 파일과 겹친 id — 앱은 앞 줄을 쓴다
  const dup = video(1, MOVIE)[0];
  e = enTestProblems({ [p1]: video(1, MOVIE), [p2]: [...video(2, OTHER), { ...dup }] });
  assert.equal(e.length, 1, e.join('\n'));
  assert.ok(e[0].startsWith(`내용 오류: ${p2}[100]: id ${dup.id}가 겹쳐요 — 앱은 앞 줄(${p1}[0])을 써요`), e[0]);
  // 빈 목록 · 덜 찬 영상 · 넘친 줄
  e = enTestProblems({ [p3]: [] });
  assert.deepEqual(e, [`내용 오류: ${p3}: 빈 목록 — 앱은 이 파일을 안 바꾸고 받아 둔 것을 그대로 써요`]);
  e = enTestProblems({ [p3]: video(4, HALF).slice(0, -1) });
  assert.ok(e.some((m) => m.includes(`「${HALF}」는 단계마다 20문제가 안 차`) && m.includes('20·20·20·20·19')) && e.some((m) => m.startsWith(`내용 오류: ${p3}: 앱이 쓰지 않는 줄 99`)), e.join('\n'));
  e = enTestProblems({ [p3]: [...video(5, 'Third'), mkQ(5, 5, 21, 'idiom', 'Third')] });
  assert.deepEqual(e.length, 1);
  assert.ok(e[0].startsWith(`내용 오류: ${p3}: 앱이 쓰지 않는 줄 1`), e[0]);
  // 글에 원고 글을 옮기지 않는다
  for (const m of enTestProblems({ [p1]: [brokenRow, { ...mkQ(1, 2, 1, 'match'), say: 'Nope.' }] })) assert.ok(!/apples|사과/.test(m), m);
});

test('🔒 privcheck checkPrivateDir — english/tests/t1~t3.json 중 있는 것을 검사 · 시험만 있는 폴더도 검사한 것 · 다른 파일 이름·크기·JSON·배열 · 빈 폴더 글에 시험 경로', () => {
  const dir = mkdtempSync(join(tmpdir(), 'entest430-'));
  const put = (rel, v) => writeFileSync(join(dir, rel), typeof v === 'string' ? v : JSON.stringify(v));
  try {
    assert.ok(checkPrivateDir(dir, svg).errors.some((m) => m.startsWith('검사할 파일이 없음:') && EN_TEST_PATHS.every((p) => m.includes(p))));
    mkdirSync(join(dir, 'english', 'tests'), { recursive: true });
    put(EN_TEST_PATHS[0], video(1, MOVIE));
    assert.deepEqual(checkPrivateDir(dir, svg), { errors: [], checked: [EN_TEST_PATHS[0]] }, '시험만 올릴 때도 「검사할 파일이 없음」이 아니다');
    const errs = (v, rel = EN_TEST_PATHS[1]) => { put(rel, v); const e = checkPrivateDir(dir, svg).errors; rmSync(join(dir, rel)); return e; };
    assert.ok(errs([{ ...video(2, OTHER)[0], stage: 9 }, ...video(2, OTHER).slice(1)]).some((m) => m.includes(`${EN_TEST_PATHS[1]}[0]: stage는 1~5`)));
    const other = errs(video(2, OTHER), 'english/tests/t9.json');
    assert.ok(other.length === 1 && other[0].includes('t9.json') && other[0].includes('만 받아요'), other.join('\n'));
    assert.ok(errs('[').some((m) => m.startsWith('JSON 오류:')));
    assert.ok(errs({ list: [] }).some((m) => m.includes('배열이 아님')));
    assert.ok(errs(`${' '.repeat(PRIVATE_MAX_BYTES)}[]`).some((m) => m.startsWith('크기 오류:') && m.includes('영상을 다른 파일로 나눌 것')), '앱이 통째로 안 받을 크기는 올리기 전에');
    // 다른 비공개 파일과 함께
    mkdirSync(join(dir, 'essay'));
    put('essay/fixes.json', [{ fixed: '고친 글' }]);
    assert.deepEqual(checkPrivateDir(dir, svg), { errors: [], checked: ['essay/fixes.json', EN_TEST_PATHS[0]] });
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

// ───────────────────── 🔒 공개 저장소 막음 (check.mjs) ─────────────────────

test('🔒 check.mjs — 공개 저장소의 english/tests/ 자리(어느 깊이든 · 빈 폴더 자리도) + 다른 이름으로 옮긴 원고(.json·.html 안 문제 id) · 지금 저장소는 깨끗 · 올릴 원고는 git이 무시', () => {
  for (const p of ['english/tests/t1.json', 'coach/english/tests/t2.json', 'a\\english\\tests\\b.json', 'x/english/tests/']) assert.equal(isEnTestPath(p), true, p);
  for (const p of ['english/tests.md', 'tests/entest430.test.js', 'js/entest.js', 'english/test/t1.json', 'myenglish/tests.json', 'coach/english/grammar.json']) assert.equal(isEnTestPath(p), false, p);
  assert.deepEqual(PUBLIC_EN_TEST_DIRS, ['english/tests', 'coach/english/tests']);
  // 원고 줄 id 꼴은 이어 붙여 만든다 — 이 파일도 검사 대상 목록에 들 수 있다
  const id = ['T0', '7-3-1', '2'].join('');
  const text = {
    'coach/english/moved.json': JSON.stringify([{ id, from: MOVIE, stage: 3 }]),
    'coach/review.html': `<td>${id}</td>`,
    'coach/math/fraction.json': JSON.stringify({ id: 'T7' }),
    'coach/notes.md': `${id}`,
    'coach/fixture.json': JSON.stringify([{ id, stage: 1 }]),
    'coach/pasted.js': `export const Q = ${JSON.stringify([{ id, from: MOVIE, say: 'A made up line.' }])};`,
    'coach/pasted.md': JSON.stringify({ id, from: MOVIE, say: 'A made up line.' }),
    'coach/idonly.js': `// ${id} 이야기만`,
    'coach/table.csv': `id,from,stage,say\n${id},${MOVIE},3,A made up line.\n`,
    'coach/other.tsv': `id\tword\n${id}\tsoccer\n`,
  };
  const readText = (f) => { if (!(f in text)) throw new Error('없음'); return text[f]; };
  const files = ['js/entest.js', 'english/tests/t1.json', ...Object.keys(text), 'gone.json'];
  assert.deepEqual(publicEnTestHits(files, (d) => d === 'coach/english/tests', readText), ['coach/english/tests/', 'english/tests/t1.json', 'coach/english/moved.json', 'coach/review.html', 'coach/pasted.js', 'coach/pasted.md', 'coach/table.csv'],'JSON은 id + from(지어낸 id 하나뿐인 재료는 안 막음) · .js·.md는 원고 줄 꼴(id + from + say)일 때만(진행 기록이 문제 번호를 말할 수 있다) · 못 읽는 파일은 건너뜀 (Codex 235차 #6)');
  assert.deepEqual(publicEnTestHits(['js/entest.js'], () => false, readText), []);
  assert.deepEqual(publicEnTestHits(null, () => false), []);
  // 지금 저장소 — git이 올릴 수 있는 파일에 원고 자리·원고 줄이 없다
  const tracked = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard'], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }).split('\n').filter(Boolean);
  assert.ok(tracked.length > 100);
  assert.deepEqual(publicEnTestHits(tracked), []);
  // 비공개 저장소에 올릴 원고(make_upload.mjs가 만드는 곳)는 git이 무시한다
  assert.equal(spawnSync('git', ['check-ignore', '-q', '.context/entest1115/upload/english/tests/t1.json']).status, 0, '.context는 git 무시');
  // check.mjs가 실제로 부른다 (신문 막음과 같은 git 목록으로)
  const chk = read('tools/check.mjs');
  assert.ok(chk.includes('const { privateArg, checkPrivateDir, publicNewsHits, publicEnTestHits } = await import(\'./privcheck.mjs\');'));
  assert.ok(chk.includes('for (const f of publicEnTestHits(tracked)) { bad++;') && chk.indexOf('publicEnTestHits(tracked)') > chk.indexOf('for (const f of publicNewsHits(tracked))'));
});
