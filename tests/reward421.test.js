// 🔍 v421 (2026-11-13 「누르기만 하면 보상」 점검 3·4 → 아버님 「추천대로」) — node --test tests/reward421.test.js
//   공통 규칙: 끝내기 💰·⚡는 그대로 · 🎯·🥚·✨·🎟️는 그 판에서 처음 낸 답이 반 이상일 때 · 못 미치면 그날 둘째 판까지 · 하루 한 번
//   ☀️ 오늘의 수학 — 묶음(🎯 1·🥚 하루치·✨ 오늘의 보너스·🎟️ 20점)은 마지막 편(🎲 섞어 풀기 · 없는 날은 개념 편)의 처음 답 반 이상 · 9/22 결정 ⑦을 바꿈
//   🧩 수학 퍼즐 — 🎯는 그 판 셋 중 둘 이상을 한 번에 · 🕵️ 나옹의 숙제 — 🎯는 그 판 처음 답 여섯(줄 셋 + 보기 셋) 중 셋 이상(그날 이미 본 문제는 그때 답)
//   기회는 답을 낸 판부터 센다(그만둔 판도) · 규칙을 바꾼 날 v420 이하가 이미 준 것은 받은 것으로
import { fakeIdb } from './fakeidb.js'; // ★ db.js·xp.js보다 먼저
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { markDaily, dailyDone, tallyRound, roundCatches, SUN_PRIZE, halfRight, sunPrizeRule, sunPrizeOf, prizeKey, prizeReport, SUN_DAY_LISTS, mathReportText } from '../js/mathprog.js';
import { answerRule as puzzleAnswer, finishRule as puzzleFinish, puzzleOf, mergePuzzle, puzzlePrizeOf, puzzleTodayLine, puzzleReport, KIND_LIST, BALL_TRIES } from '../js/mathpuzzle.js';
import { answerRule as detectAnswer, finishRule as detectFinish, detectOf, mergeDetect, detectPrizeOf, detectTodayLine, detectReport, BALL_TRIES as DETECT_TRIES } from '../js/detective.js';
import { emptyMath, mergeMath, cloneMath, mergeDailyDelta, emptyDaily } from '../js/db.js';
import { mathBonusFor } from '../js/home.js';

void fakeIdb;
const src = (f) => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const T = '2026-11-13';
const T2 = '2026-11-14';
const Y = '2026-11-12';

/** ☀️ 마지막 편을 끝냈다 — finishRound의 트랜잭션 안과 같은 차례 */
const sunDone = (m, day, ok, total, perfect) => {
  const daily = markDaily(m, day, perfect === undefined ? undefined : { perfect });
  return { daily, prize: sunPrizeRule(m, day, daily.n, { ok, total }) };
};

// ───────────── 공통 기준 ─────────────

test('halfRight — 처음 낸 답이 반 이상 · 낸 답이 없으면 아님 · 이상한 값은 아님 · 🧩·🕵️ 파일 안의 같은 함수와 같은 답', () => {
  const rows = [[0, 0, false], [1, 2, true], [1, 3, false], [2, 3, true], [2, 4, true], [3, 6, true], [2, 6, false], [4, 4, true], [0, 4, false]];
  for (const [ok, total, want] of rows) assert.equal(halfRight(ok, total), want, `${ok}/${total}`);
  for (const bad of [[NaN, 3], [1, NaN], [-1, 2], [1, -2], ['x', 3], [1, Infinity]]) assert.equal(halfRight(...bad), false, String(bad));
  // 🧩·🕵️ 파일은 import가 없어 같은 함수를 따로 둔다 — 몸통이 같아야 한다
  const body = (f) => /function halfRight\(ok, total\) \{[\s\S]*?\n\}/.exec(src(f))[0];
  assert.equal(body('js/mathpuzzle.js'), body('js/detective.js'));
  assert.equal(body('js/mathpuzzle.js').replace(/^export /, ''), body('js/mathprog.js').replace(/^export /, ''));
});

// ───────────── ☀️ 오늘의 수학 ─────────────

test('☀️ 묶음 — 첫 완주에 처음 답 반 이상이면 받음(🎟️ 완주 몫 +1) · 못 미치면 둘째 완주에 한 번 더 · 둘째도 못 미치면 내일 · 셋째는 셈 밖 · 하루 한 번', () => {
  assert.equal(SUN_PRIZE.tries, 2);
  // 첫 완주에 받음
  const a = emptyMath();
  let r = sunDone(a, T, 2, 3);
  assert.equal(r.daily.first, true, '끝내기 ⚡·💰는 첫 완주 그대로');
  assert.deepEqual(r.prize, { prize: true, won: true, again: false, s: 'w' });
  assert.deepEqual(a.tot, { ok: 0, daily: 1, rev: 0 }, '🎟️ 완주 몫');
  assert.deepEqual(a.sunPrize, { d: T, won: 1 });
  r = sunDone(a, T, 3, 3);
  assert.deepEqual(r.prize, { prize: false, won: true, again: false, s: 'd' }, '하루 한 번');
  assert.equal(a.tot.daily, 1);
  // 🤷·아무 보기로 끝냄 → 못 미침 → 둘째에 받음
  const b = emptyMath();
  r = sunDone(b, T, 0, 3);
  assert.equal(r.daily.first, true, '못 미쳐도 끝내기 몫은 받는다(틀림이 무섭지 않게)');
  assert.deepEqual(r.prize, { prize: false, won: false, again: true, s: 'm' });
  assert.equal(b.tot, undefined, '🎟️ 없음');
  r = sunDone(b, T, 2, 4);
  assert.equal(r.daily.first, false, '둘째 완주는 끝내기 몫 없음(그대로)');
  assert.deepEqual(r.prize, { prize: true, won: true, again: false, s: 'w' }, '둘째 완주에 반 이상 → 받음');
  assert.equal(b.tot.daily, 1);
  // 둘 다 못 미침 → 셋째는 셈 밖
  const c = emptyMath();
  sunDone(c, T, 1, 3);
  r = sunDone(c, T, 1, 4);
  assert.deepEqual(r.prize, { prize: false, won: false, again: false, s: 'm' }, '둘째도 못 미침 → 내일');
  r = sunDone(c, T, 3, 3);
  assert.deepEqual(r.prize, { prize: false, won: false, again: false, s: 'o' }, '셋째 완주는 다 맞혀도 셈 밖');
  assert.equal(c.tot, undefined);
  // 다음 날은 새로
  r = sunDone(c, T2, 2, 3);
  assert.deepEqual(r.prize, { prize: true, won: true, again: false, s: 'w' });
  assert.deepEqual(c.sunPrize, { d: T2, won: 1 });
  // 문항이 하나도 없는 편(있을 일이 거의 없다)은 판정할 답이 없다
  assert.equal(sunDone(emptyMath(), T, 0, 0).prize.prize, false);
});

test('☀️ 규칙을 바꾼 날 — v420 이하가 오늘 이미 완주했으면(묶음 기록 없이 n이 둘 이상) 받은 것으로 · 시계가 뒤로 가면 장부를 건드리지 않는다', () => {
  // v420이 오늘 첫 완주를 적었다(그때 묶음을 줬다) — v421의 둘째 완주는 다시 못 받는다
  const m = { daily: { d: T, n: 1 } };
  assert.deepEqual(sunPrizeOf(m, T), { won: true, left: false }, '화면도 받은 것으로');
  const r = sunDone(m, T, 3, 3);
  assert.equal(r.daily.n, 2);
  assert.deepEqual(r.prize, { prize: false, won: true, again: false, s: 'd' });
  assert.equal(m.tot, undefined);
  assert.deepEqual(m.sunPrize, { d: T, won: 1 }, '받은 것으로 적어 둔다 — 다음 완주가 기록을 보고 다시 주지 않게');
  assert.deepEqual(sunPrizeOf(m, T), { won: true, left: false });
  assert.equal(sunDone(m, T, 3, 3).prize.s, 'd');
  // 어제 완주 기록만 있으면 오늘은 새로
  assert.deepEqual(sunPrizeOf({ daily: { d: Y, n: 3 } }, T), { won: false, left: true });
  // 시계가 뒤로 — 그날은 끝낸 것으로(markDaily와 같게)
  const back = { daily: { d: T2, n: 1 }, sunPrize: { d: T2, won: 0 } };
  const rb = sunDone(back, T, 3, 3);
  assert.deepEqual(rb.prize, { prize: false, won: true, again: false, s: 'o' });
  assert.deepEqual(back.sunPrize, { d: T2, won: 0 }, '장부 그대로');
  assert.deepEqual(sunPrizeOf(back, T), { won: false, left: false }, '받았나는 장부대로(못 받았는데 ✅라고 하지 않게) · 기회는 없음 (Codex 224차 P3)');
  assert.deepEqual(sunPrizeOf({ daily: { d: T2, n: 1 }, sunPrize: { d: T2, won: 1 } }, T), { won: true, left: false });
  assert.deepEqual(sunPrizeOf({ daily: { d: T2, n: 1 } }, T), { won: true, left: false }, '묶음 기록이 없으면 v420 몫');
});

test('☀️ 화면용 sunPrizeOf · 홈 카드 mathBonusFor — 받기 전엔 반짝 · 받으면 ✅ · 기회가 지나면 반짝이지 않고 「내일 또」', () => {
  const m = emptyMath();
  assert.deepEqual(sunPrizeOf(m, T), { won: false, left: true });
  assert.deepEqual(mathBonusFor(m, T).got, false);
  assert.equal(mathBonusFor(m, T).rest, undefined);
  sunDone(m, T, 0, 3);
  assert.deepEqual(sunPrizeOf(m, T), { won: false, left: true }, '첫 완주를 못 미침 — 아직 기회');
  assert.equal(mathBonusFor(m, T).got, false);
  sunDone(m, T, 1, 3);
  assert.deepEqual(sunPrizeOf(m, T), { won: false, left: false });
  assert.deepEqual({ got: mathBonusFor(m, T).got, rest: mathBonusFor(m, T).rest }, { got: false, rest: true });
  const w = emptyMath();
  sunDone(w, T, 3, 3);
  assert.deepEqual(sunPrizeOf(w, T), { won: true, left: false });
  assert.equal(mathBonusFor(w, T).got, true);
  assert.equal(dailyDone(w, T), 1, '완주 수는 그대로');
  assert.equal(mathBonusFor(null, T).got, false, '레코드가 없어도 터지지 않는다');
});

test('☀️ 🎯·🎟️ 자격 — 섞어 풀기의 🎟️ 정답 몫과 🎯 +1은 묶음을 받은 판에만(tallyRound·roundCatches sunPrize)', () => {
  assert.deepEqual(tallyRound({}, { mode: 'mix', correct: 3, sunPrize: true }), { ok: 3, rev: 0 });
  assert.deepEqual(tallyRound({}, { mode: 'mix', correct: 3, sunPrize: false }), { ok: 0, rev: 0 });
  assert.deepEqual(tallyRound({}, { mode: 'mix', correct: 3, dailyFirst: true }), { ok: 0, rev: 0 }, '옛 이름(dailyFirst)은 더는 안 받는다');
  assert.equal(roundCatches({ mode: 'mix', result: { ok: 1, total: 3 }, sunPrize: false }), 0);
  assert.equal(roundCatches({ mode: 'mix', result: { ok: 2, total: 3 }, sunPrize: true }), 1);
  assert.equal(roundCatches({ mode: 'learn', result: { passed: true, first: false, practice: false }, inDaily: true, sunPrize: false }), 1, '☀️ 안 개념 편 통과 🎯는 그대로');
});

test('☀️ 백업 병합 — 묶음은 늦은 날짜 쪽 · 같은 날이면 어느 쪽이 받았든 받음 · 입력은 안 건드린다 · 복사도', () => {
  const a = emptyMath(); sunDone(a, T, 0, 3);
  const b = emptyMath(); sunDone(b, T, 3, 3);
  assert.deepEqual(mergeMath(a, b).sunPrize, { d: T, won: 1 });
  assert.deepEqual(mergeMath(b, a).sunPrize, { d: T, won: 1 });
  assert.deepEqual(a.sunPrize, { d: T, won: 0 }, '입력 그대로');
  const old = emptyMath(); sunDone(old, Y, 3, 3);
  assert.deepEqual(mergeMath(a, old).sunPrize, { d: T, won: 0 }, '어제 받은 것은 오늘 기록에 안 붙는다');
  assert.deepEqual(mergeMath(old, a).sunPrize, { d: T, won: 0 });
  assert.equal(mergeMath(emptyMath(), emptyMath()).sunPrize, undefined, '없으면 안 만든다');
  const cl = cloneMath(b);
  assert.deepEqual(cl.sunPrize, { d: T, won: 1 });
  // 병합 뒤 둘째 완주 — 다른 기기가 받았으면 다시 못 받는다
  const merged = mergeMath(a, b);
  assert.equal(sunDone(merged, T, 3, 3).prize.prize, false);
});

test('☀️ 📤 🎯 처음 답 줄 — 하루 기록 목록 칸 · 열쇠 꼴 · 오늘부터 7일 · 날짜·열쇠 차례 · 수학 요약에 한 줄', () => {
  assert.ok(SUN_DAY_LISTS.includes('mathPrize'));
  assert.equal(prizeKey('sun', '1731.2', 2, 1, 3, 'm'), 'sun:1731.2:2:1/3:m');
  assert.equal(prizeKey('nope', 'a<b>9', -1, 'x', 3.7, 'zz'), 'sun:9:0:0/3:o', '이상한 값은 안전하게');
  let day = mergeDailyDelta(emptyDaily(T), T, { mathPrize: [prizeKey('puzzle', 200, 2, 3, 3, 'w'), prizeKey('puzzle', 100, 1, 1, 3, 'm')] });
  day = mergeDailyDelta(day, T, { mathPrize: [prizeKey('puzzle', 100, 1, 1, 3, 'm')] });
  assert.equal(day.mathPrize.length, 2, '같은 칸은 한 번');
  const days = [
    day,
    { date: Y, mathPrize: [prizeKey('sun', '5.1', 1, 2, 3, 'w'), prizeKey('detect', 7, 1, 2, 6, 'm'), 'broken'] },
    { date: '2026-11-01', mathPrize: [prizeKey('sun', '1.1', 1, 0, 3, 'm')] },
  ];
  const line = prizeReport(days, T);
  assert.equal(line, '🎯 처음 답 반 이상(v421 · 최근 7일 · 끝낸 판마다 · 둘째 판까지): ☀️ 11-12 1째 2/3 ✅받음 | 🧩 11-13 1째 1/3 ❌못 미침 · 11-13 2째 3/3 ✅받음 | 🕵️ 11-12 1째 2/6 ❌못 미침');
  assert.match(prizeReport([], T), /☀️ 없음 \| 🧩 없음 \| 🕵️ 없음$/);
  assert.ok(mathReportText(emptyMath(), T, days).includes('🎯 처음 답 반 이상(v421'), '하루 기록을 받은 📤에만');
  assert.ok(!mathReportText(emptyMath(), T).includes('🎯 처음 답 반 이상'));
});

// ───────────── 🧩 수학 퍼즐 ─────────────

test('🧩 🎯 — 그 판 셋 중 둘 이상을 한 번에 · 못 미치면 둘째 판 · 💰는 첫 판 그대로 · 하루 한 번 · 🔷는 그대로', () => {
  assert.equal(BALL_TRIES, 2);
  const m = cloneMath(emptyMath());
  // 첫 판: 아무 수나 채워 셋 다 틀림 → 💰는 받고 🎯는 없음
  for (const k of KIND_LIST) puzzleAnswer(m, k, false, 1, T, 101);
  let r = puzzleFinish(m, T, { rid: 101, ok: 0, total: 3 });
  assert.deepEqual(r, { first: true, coin: 10, throws: 0, stone: 0, ball: { idx: 1, ok: 0, total: 3, s: 'm' }, again: true });
  assert.deepEqual(puzzlePrizeOf(m.puzzle, T), { won: false, left: true });
  assert.equal(puzzleTodayLine(m.puzzle.day[T], puzzlePrizeOf(m.puzzle, T)), '오늘의 퍼즐 끝 ✅ — 한 번에 많이 맞히면 🎯');
  // 둘째 판: 둘을 한 번에 → 🎯
  puzzleAnswer(m, 'magic', true, 1, T, 202);
  r = puzzleFinish(m, T, { rid: 202, ok: 2, total: 3 });
  assert.deepEqual(r, { first: false, coin: 0, throws: 1, stone: 0, ball: { idx: 2, ok: 2, total: 3, s: 'w' }, again: false });
  assert.deepEqual(m.puzzle.won, { [T]: 1 });
  assert.deepEqual(puzzlePrizeOf(m.puzzle, T), { won: true, left: false });
  assert.equal(puzzleTodayLine(1, puzzlePrizeOf(m.puzzle, T)), '오늘의 퍼즐 끝 ✅ — 더 풀어도 단계는 올라가요');
  // 셋째 판은 다 맞혀도 이미 받은 날
  r = puzzleFinish(m, T, { rid: 303, ok: 3, total: 3 });
  assert.deepEqual(r.ball, { idx: 0, ok: 3, total: 3, s: 'd' });
  assert.equal(r.throws, 0);
  assert.equal(m.puzzle.ball.f, 3, '그날 끝낸 판');
  // 첫 판에 셋 다 맞힘 → 🎯 + 🔷 + 💰
  const w = cloneMath(emptyMath());
  for (const k of KIND_LIST) puzzleAnswer(w, k, true, 1, T, 1);
  assert.deepEqual(puzzleFinish(w, T, { rid: 1, ok: 3, total: 3 }), { first: true, coin: 10, throws: 1, stone: 1, ball: { idx: 1, ok: 3, total: 3, s: 'w' }, again: false });
});

test('🧩 기회는 답을 낸 판부터 — 그만둔 판도 한 번 · 둘 다 쓰면 셋째 판은 셈 밖 · 같은 판 답은 한 번만 · 다음 날은 새로', () => {
  const m = cloneMath(emptyMath());
  puzzleAnswer(m, 'magic', false, 1, T, 11); // 첫 판 — 하나 틀리고 그만둠
  puzzleAnswer(m, 'magic', false, 1, T, 11);
  assert.deepEqual(m.puzzle.ball, { d: T, r: [11], f: 0 });
  assert.deepEqual(puzzlePrizeOf(m.puzzle, T), { won: false, left: true });
  puzzleAnswer(m, 'cards', false, 1, T, 22); // 둘째 판 — 또 그만둠
  assert.deepEqual(puzzlePrizeOf(m.puzzle, T), { won: false, left: false }, '기회를 다 씀');
  assert.equal(puzzleTodayLine(0, puzzlePrizeOf(m.puzzle, T)), '끝내면 💰10 · 🎯는 내일 또 기회가 있어요 · 셋 다 한 번에 맞히면 🔷 수학스톤');
  // 셋째 판을 다 맞혀 끝내도 🎯는 없다(💰는 첫 끝냄이라 받음)
  for (const k of KIND_LIST) puzzleAnswer(m, k, true, 1, T, 33);
  const r = puzzleFinish(m, T, { rid: 33, ok: 3, total: 3 });
  assert.deepEqual(r, { first: true, coin: 10, throws: 0, stone: 0, ball: { idx: 0, ok: 3, total: 3, s: 'o' }, again: false });
  assert.deepEqual(m.puzzle.ball.r, [11, 22]);
  // 다음 날은 새로
  puzzleAnswer(m, 'magic', true, 1, T2, 44);
  assert.deepEqual(m.puzzle.ball, { d: T2, r: [44], f: 0 });
  assert.deepEqual(puzzlePrizeOf(m.puzzle, T2), { won: false, left: true });
  // 판 열쇠가 없는 답(옛 화면)은 기회를 안 쓴다
  const n = cloneMath(emptyMath());
  puzzleAnswer(n, 'magic', true, 1, T);
  assert.deepEqual(n.puzzle.ball, { d: '', r: [], f: 0 });
});

test('🧩 규칙을 바꾼 날 — v420 이하가 오늘 판을 끝냈으면(🎯를 줬다) 받은 것으로 · v421로 끝낸 판이 있으면 아니다', () => {
  const legacy = { puzzle: { day: { [T]: 1 }, sets: 1 } };
  assert.deepEqual(puzzlePrizeOf(legacy.puzzle, T), { won: true, left: false });
  const r = puzzleFinish(legacy, T, { rid: 5, ok: 3, total: 3 });
  assert.equal(r.throws, 0);
  assert.equal(r.ball.s, 'd');
  // v421로 끝낸 판이 못 미쳤던 날 — 받은 것이 아니다
  const m = cloneMath(emptyMath());
  puzzleFinish(m, T, { rid: 1, ok: 0, total: 3 });
  assert.deepEqual(puzzlePrizeOf(m.puzzle, T), { won: false, left: true });
});

test('🧩 기록 고쳐 읽기·병합 — 🎯 받은 날은 합집합 · 판 열쇠는 같은 날이면 합쳐 이른 둘 · 끝낸 판 수는 큰 쪽 · 다른 날이면 나중 날 · 깨진 값은 처음 값', () => {
  assert.deepEqual(puzzleOf({ ball: { d: T, r: [5, 'x', -1, 3, 3, 9], f: -2 }, won: { bad: 1, [T]: 7 } }).ball, { d: T, r: [3, 5], f: 0 });
  assert.deepEqual(puzzleOf({ won: { bad: 1, [T]: 7 } }).won, { [T]: 2 }, '날 칸은 daysOf 꼴(0~2)');
  assert.deepEqual(puzzleOf({ ball: { d: 'nope', r: [1], f: 3 } }).ball, { d: '', r: [], f: 0 });
  const a = { ball: { d: T, r: [30], f: 1 }, won: { [Y]: 1 } };
  const b = { ball: { d: T, r: [10, 20], f: 2 }, won: { [T]: 1 } };
  const ab = mergePuzzle(a, b);
  assert.deepEqual(ab.ball, { d: T, r: [10, 20], f: 2 });
  assert.deepEqual(ab.won, { [Y]: 1, [T]: 1 });
  assert.deepEqual(mergePuzzle(b, a), ab, '차례와 상관없이 같다');
  assert.deepEqual(mergePuzzle({ ball: { d: Y, r: [1, 2], f: 5 } }, { ball: { d: T, r: [9], f: 0 } }).ball, { d: T, r: [9], f: 0 }, '다른 날이면 나중 날');
  assert.deepEqual(mergeMath({ ...emptyMath(), puzzle: a }, { ...emptyMath(), puzzle: b }).puzzle.ball, ab.ball, 'db 병합도');
  const cur = { ...emptyMath(), puzzle: a };
  const cl = cloneMath(cur);
  cl.puzzle.ball.r.push(99);
  assert.deepEqual(cur.puzzle.ball.r, [30], '복사본을 고쳐도 원본은 그대로');
});

test('🧩 📤 요약 줄에 🎯 받은 날 · 오늘 보상 줄 꼴(셈 문구 없음)', () => {
  const p = { day: { [T]: 1, [Y]: 2 }, won: { [T]: 1 }, sets: 3, solved: 7 };
  assert.match(puzzleReport(p, T), /최근 7일 퍼즐 한 날 2 · 그중 🎯 받은 날 1\(v421부터 — 한 번에 많이 맞힌 판\)$/);
  assert.equal(puzzleTodayLine(0), '끝내면 💰10 · 한 번에 많이 맞히면 🎯 · 셋 다 한 번에 맞히면 🔷 수학스톤');
  assert.equal(puzzleTodayLine(2, { won: false, left: false }), '오늘의 퍼즐 끝 ✅ 🔷까지 받았어요 — 🎯는 내일 또 기회가 있어요');
  for (const g of [0, 1, 2]) for (const p2 of [{ won: true, left: false }, { won: false, left: true }, { won: false, left: false }]) {
    assert.doesNotMatch(puzzleTodayLine(g, p2), /\d+ ?\/ ?\d+|\d+ ?(번|판) ?(남|더)/, '아이 화면에 셈 없음');
  }
});

// ───────────── 🕵️ 나옹의 숙제 ─────────────

const ITEMS = JSON.parse(src('coach/math/detective.json')).items;
const cellOf = (id) => ITEMS.find((x) => x.id === id).cell;
const IDS = ['D1', 'D7', 'D13'];
/** 한 문제 — 처음 누른 줄 l · 처음 고른 보기 f (true/false) · 바르게 고침 */
const solve = (m, id, l, f, rid, day = T) => {
  detectAnswer(m, { id, cell: cellOf(id), step: 'line', ok: l, d: day, rid }, day);
  detectAnswer(m, { id, cell: cellOf(id), step: 'fix', ok: f, d: day, rid }, day);
  detectAnswer(m, { id, cell: cellOf(id), step: 'solve', ok: true, d: day, rid }, day);
};

test('🕵️ 🎯 — 처음 답 여섯 중 셋 이상 · 둘이면 못 미침(둘째 판 기회) · 💰는 첫 판 그대로 · 하루 한 번', () => {
  assert.equal(DETECT_TRIES, 2);
  const m = {};
  solve(m, 'D1', true, false, 1); solve(m, 'D7', false, true, 1); solve(m, 'D13', false, false, 1); // 2/6
  let r = detectFinish(m, T, IDS, false, { rid: 1 });
  assert.deepEqual(r, { first: true, coin: 10, throws: 0, stone: 0, ball: { idx: 1, ok: 2, total: 6, s: 'm' }, again: true });
  assert.deepEqual(detectPrizeOf(m.detect, T), { won: false, left: true });
  assert.equal(detectTodayLine(1, detectPrizeOf(m.detect, T)), '오늘의 숙제 끝 ✅ — 한 번에 많이 맞히면 🎯');
  const more = ['D2', 'D8', 'D14'].filter((id) => ITEMS.some((x) => x.id === id));
  assert.equal(more.length, 3, '시험에 쓸 새 문제 셋');
  solve(m, more[0], true, true, 2); solve(m, more[1], true, false, 2); solve(m, more[2], false, false, 2); // 3/6
  r = detectFinish(m, T, more, false, { rid: 2 });
  assert.deepEqual(r, { first: false, coin: 0, throws: 1, stone: 0, ball: { idx: 2, ok: 3, total: 6, s: 'w' }, again: false });
  assert.deepEqual(detectPrizeOf(m.detect, T), { won: true, left: false });
  assert.equal(detectTodayLine(1, detectPrizeOf(m.detect, T)), '오늘의 숙제 끝 ✅ — 더 봐 줘도 돼요');
});

test('🕵️ 그날 이미 본 문제는 그때 처음 답으로 — 앞 판에서 답을 본 뒤 맞혀도 안 센다 · 그만둔 판도 기회를 쓴다', () => {
  const m = {};
  // 첫 판: D1·D7을 틀리고 그만둠(기회 하나)
  solve(m, 'D1', false, false, 10); solve(m, 'D7', false, false, 10);
  // 둘째 판: 같은 D1·D7이 다시 나와 이번엔 다 맞힘 + D13 다 맞힘 → 그날 처음 답은 2/6 → 못 미침, 기회도 다 씀
  solve(m, 'D1', true, true, 20); solve(m, 'D7', true, true, 20); solve(m, 'D13', true, true, 20);
  const r = detectFinish(m, T, IDS, true, { rid: 20 });
  assert.deepEqual(r.ball, { idx: 2, ok: 2, total: 6, s: 'm' });
  assert.equal(r.throws, 0);
  assert.equal(r.again, false, '그만둔 첫 판이 기회 하나를 썼다');
  assert.equal(r.stone, 0, '🔷도 그대로 막힌다');
  assert.deepEqual(detectPrizeOf(m.detect, T), { won: false, left: false });
  assert.equal(detectTodayLine(1, detectPrizeOf(m.detect, T)), '오늘의 숙제 끝 ✅ — 🎯는 내일 또 기회가 있어요');
});

test('🕵️ 규칙을 바꾼 날 · 늦게 온 전날 답 · 병합 · 고쳐 읽기', () => {
  const legacy = { detect: { day: { [T]: 1 }, sets: 1 } };
  assert.deepEqual(detectPrizeOf(legacy.detect, T), { won: true, left: false });
  solve(legacy, 'D1', true, true, 7); solve(legacy, 'D7', true, true, 7); solve(legacy, 'D13', true, true, 7);
  assert.equal(detectFinish(legacy, T, IDS, true, { rid: 7 }).ball.s, 'd');
  // 늦게 온 전날 답은 오늘 기회를 안 쓴다
  const m = {};
  solve(m, 'D1', true, true, 50, T);
  detectAnswer(m, { id: 'D7', cell: cellOf('D7'), step: 'line', ok: true, d: Y, rid: 40 }, T);
  assert.deepEqual(detectOf(m.detect).ball, { d: T, r: [50], f: 0 });
  // 병합
  const a = { ball: { d: T, r: [30], f: 1 }, won: { [Y]: 1 } };
  const b = { ball: { d: T, r: [10, 20], f: 2 }, won: { [T]: 1 } };
  assert.deepEqual(mergeDetect(a, b).ball, { d: T, r: [10, 20], f: 2 });
  assert.deepEqual(mergeDetect(a, b).won, { [Y]: 1, [T]: 1 });
  assert.deepEqual(mergeDetect(a, b), mergeDetect(b, a));
  assert.deepEqual(detectOf({ ball: { d: T, r: [2, 1, 1, 'z'], f: 'q' } }).ball, { d: T, r: [1, 2], f: 0 });
  assert.match(detectReport({ day: { [T]: 1 }, won: { [T]: 1 } }, T), /최근 7일 한 날 1 · 그중 🎯 받은 날 1\(v421부터 — 처음 답이 반 이상인 판\)/);
});

// ───────────── 화면 잇기 (소스 꼴) ─────────────

test('☀️ 화면 — 두 갈래 모두 markDaily 바로 뒤 sunPrizeRule · 🥚·✨·🎟️·🎯는 묶음에만 · 끝내기 ⚡💰는 첫 완주 · 📤 칸 · 다시 하기 단추 · 머리줄 글', () => {
  const m = src('js/math.js');
  assert.ok(m.includes("          daily = markDaily(s, today, r.mode === 'mix' ? { perfect: !!result && result.total > 0 && result.ok === result.total } : undefined);\n          prize = sunPrizeRule(s, today, daily.n, { ok: r.correct, total: r.qs.length });"), '🎲 갈래');
  assert.ok(m.includes('          daily = markDaily(s, today);\n          prize = sunPrizeRule(s, today, daily.n, { ok: r.correct, total: r.qs.length });'), '개념 편 갈래');
  assert.equal((m.match(/sunPrize: !!\(prize && prize\.prize\)/g) || []).length, 3, 'tallyRound 하나 + roundCatches 둘');
  assert.ok(m.includes("  if (daily && daily.first) { rw.xp += REWARD.daily.xp; rw.coin += REWARD.daily.coin; }"), '끝내기 몫은 첫 완주 그대로');
  assert.ok(m.includes('  const sunWin = !!(prize && prize.prize); // ☀️ 묶음'), '묶음은 판정이 준 것만');
  assert.ok(m.includes("  if (sunWin) { try { rw.egg = await tickEgg('math', today); } catch { rw.egg = null; } }"));
  assert.ok(m.includes('  rw.bonus = sunWin ? dailyBonus(today) : null;'));
  assert.ok(m.includes('progress: tally.ok * MATH_PTS.ok + (sunWin ? MATH_PTS.daily : 0)'));
  assert.ok(!/daily && daily\.first \? dailyBonus|daily && daily\.first\) \{ try \{ rw\.egg|daily && daily\.first \? MATH_PTS/.test(m), '옛 길은 없다');
  assert.ok(m.includes("    if (daily && prize) noteSun({ mathPrize: [prizeKey('sun', `${d.t0 || 0}.${daily.n}`, daily.n <= SUN_PRIZE.tries ? daily.n : 0, r.correct, r.qs.length, prize.s)] }, today);"), '📤 칸은 판정한 날로 (Codex 224차)');
  assert.ok(m.includes('function noteSun(delta, day = todayKey()) {\n  applyDailyDelta(day, delta).catch(() => {});'));
  // 🎲 새 문제로 한 번 더 — 기회가 남았을 때만 · d.marked를 풀고 같은 흐름에서 섞어 풀기 · 🤔 한 번 더도 마지막 편이면 같게
  assert.ok(m.includes('  const retry = !pz.won && pz.again && d && d.plan && d.plan.mix.length > 0;'));
  assert.ok(m.includes('  const sunRetry = lastOfDaily && !!prize && !prize.won && prize.again && !all;'));
  assert.ok(m.includes("'🎲 새 문제로 한 번 더'") && m.includes('if (ui.daily === d) { d.marked = false; startMixRound(); }'));
  assert.ok(m.includes('if (sunRetry && ui.daily === d) d.marked = false;'));
  assert.ok(m.includes("'🎯·🥚·✨는 처음에 많이 맞히면 나와요 — 🎲 새 문제로 한 번 더 해 볼까요?'"));
  assert.ok(m.includes("'🎯·🥚·✨는 처음에 많이 맞히면 나와요 — 🤔 한 번 더 해 볼까요?'"));
  assert.equal((m.match(/'🎯·🥚·✨는 내일 또 기회가 있어요!'/g) || []).length, 2);
  assert.ok(m.includes('— ☀️에서 처음에 잘 맞히면 받아요`') && m.includes('— 내일 또 기회가 있어요`'), '머리줄 ✨');
  assert.ok(!m.includes('☀️ 완주하면 받아요') && !m.includes('완주한 날이 쌓여요') && !m.includes('☀️ 완주한 날마다'), '옛 약속 글은 없다');
  const h = src('js/home.js');
  assert.ok(h.includes("'☀️ 오늘의 수학에서 처음에 잘 맞히면 받아요'") && h.includes('if (!subject.bonus.got && !subject.bonus.rest)'));
  assert.ok(!h.includes('dailyDone'), '홈 카드는 완주가 아니라 묶음을 본다');
});

test('🧩·🕵️ 화면 — 판 열쇠(rid)를 답과 판 끝에 · 판 끝 📤 칸 · 못 미치면 「한 판 더」를 앞으로', () => {
  const pv = src('js/mathpuzzleview.js');
  assert.ok(pv.includes('S.ps = { rid: Date.now() * 1000 + Math.floor(Math.random() * 1000), day: todayKey(), items,'), '판 열쇠는 시각×1000+무작위 · 판을 연 날 (Codex 224차)');
  assert.ok(pv.includes('it.from, todayKey(), ps.rid, ps.day); });') && pv.includes('{ rid: ps.rid, ok, total: ps.items.length, day: ps.day }'));
  assert.ok(pv.includes('  const ok = ps.results.filter((x) => x && x.ok).length;'));
  assert.ok(pv.includes("applyDailyDelta(today, { mathPrize: [prizeKey('puzzle', ps.rid, b.idx, b.ok, b.total, b.s)] })"));
  assert.ok(pv.includes("const more = el('button', `btn${retry ? ' btn-primary' : ''} mpz-more`, '🧩 한 판 더');"));
  for (const v of [pv, src('js/detectiveview.js')]) assert.ok(v.includes("  const st = (d.ball && d.ball.s) || 'd';\n  const retry = st === 'm' && !!d.again;"), '못 미쳤고 기회가 남았을 때만 「한 판 더」를 앞으로');
  assert.ok(pv.includes("'🎯는 한 번에 많이 맞히면 나와요 — 🧩 한 판 더 해 볼까요?'"));
  assert.ok(pv.includes('puzzleTodayLine(got, puzzlePrizeOf(raw, today))'));
  const dv = src('js/detectiveview.js');
  assert.ok(dv.includes('    rid: Date.now() * 1000 + Math.floor(Math.random() * 1000), day: todayKey(),\n    seed, items:'));
  assert.ok(dv.includes('  Q.push({ ...ans, d: ds.day, rid: ds.rid })') && dv.includes('{ rid: ds.rid, day: ds.day }'), '답·판 끝 모두 판을 연 날로');
  assert.ok(dv.includes("applyDailyDelta(today, { mathPrize: [prizeKey('detect', ds.rid, b.idx, b.ok, b.total, b.s)] })"));
  assert.ok(dv.includes("const more = el('button', `btn${retry ? ' btn-primary' : ''} dtv-more`, '🕵️ 한 판 더');"));
  assert.ok(dv.includes("'🎯는 한 번에 많이 맞히면 나와요 — 🕵️ 한 판 더 해 볼까요?'"));
  assert.ok(dv.includes('detectTodayLine(got, detectPrizeOf(raw, today))'));
  for (const f of ['js/mathpuzzle.js', 'js/detective.js']) assert.equal(/^import /m.test(src(f)), false, `${f} 규칙 파일은 import 없음`);
  assert.ok(src('sw.js').includes("const CACHE_VERSION = 'v421';") && src('js/version.js').includes("export const APP_VERSION = 'v421';"));
});

// ───────────── 🔍 Codex 224차 고침 ─────────────

test('P2-1 규칙을 바꾼 날 — v420이 준 🧩·🕵️ 🎯를 첫 v421 판에서 「받음」으로 적어 둔다 · 다음 판·화면도 받은 것으로', () => {
  const m = { puzzle: { day: { [T]: 1 }, sets: 1 } };
  assert.equal(puzzleFinish(m, T, { rid: 1, ok: 3, total: 3 }).ball.s, 'd');
  assert.deepEqual(m.puzzle.won, { [T]: 1 }, '적어 둠');
  assert.deepEqual(puzzlePrizeOf(m.puzzle, T), { won: true, left: false });
  const r = puzzleFinish(m, T, { rid: 2, ok: 3, total: 3 });
  assert.deepEqual([r.ball.s, r.throws], ['d', 0], '둘째 v421 판도 다시 못 받는다');
  const d = { detect: { day: { [T]: 1 }, sets: 1 } };
  solve(d, 'D1', true, true, 5); solve(d, 'D7', true, true, 5); solve(d, 'D13', true, true, 5);
  assert.equal(detectFinish(d, T, IDS, true, { rid: 5 }).ball.s, 'd');
  assert.deepEqual(d.detect.won, { [T]: 1 });
  const more = ['D2', 'D8', 'D14'];
  for (const id of more) solve(d, id, true, true, 6);
  assert.deepEqual(detectFinish(d, T, more, true, { rid: 6 }).ball, { idx: 2, ok: 6, total: 6, s: 'd' });
  assert.deepEqual(detectPrizeOf(d.detect, T), { won: true, left: false });
});

test('P2-5 판은 연 날의 것 — 🕵️ 자정 전에 답하고 자정 뒤에 끝내도 그날 처음 답으로 · 새날 기회를 안 씀 · 💰도 그날 몫 · 🧩도 같게', () => {
  const m = {};
  for (const id of IDS) solve(m, id, true, true, 9, T); // 답은 판을 연 날(T)로
  const r = detectFinish(m, T2, IDS, true, { rid: 9, day: T }); // 끝내기는 T2
  assert.deepEqual(r.ball, { idx: 1, ok: 6, total: 6, s: 'w' });
  assert.equal(r.throws, 1);
  assert.equal(r.first, true);
  assert.deepEqual(detectOf(m.detect).day, { [T]: 2 }, '💰·🔷는 판을 연 날 몫(새날 첫 판 💰는 남는다)');
  assert.deepEqual(detectOf(m.detect).won, { [T]: 1 });
  assert.deepEqual(detectPrizeOf(m.detect, T2), { won: false, left: true }, '새날 기회는 그대로');
  assert.equal(r.again, true, '「다음 판도 기회」는 오늘(새날) 기준');
  // 이상한 날·앞날은 오늘로
  const w = {};
  for (const id of IDS) solve(w, id, true, true, 3, T);
  assert.equal(detectFinish(w, T, IDS, true, { rid: 3, day: T2 }).ball.idx, 1, '앞날이면 오늘');
  // 🧩 — 자정 뒤에 낸 답도 판을 연 날의 기회로 · 끝내기도 그 날
  const p = cloneMath(emptyMath());
  puzzleAnswer(p, 'magic', true, 1, T, 70, T);
  puzzleAnswer(p, 'pyramid', true, 1, T2, 70, T); // 자정을 넘겨 낸 답
  assert.deepEqual(p.puzzle.ball, { d: T, r: [70], f: 0 }, '새날 기회를 안 씀');
  const pr = puzzleFinish(p, T2, { rid: 70, ok: 2, total: 3, day: T });
  assert.deepEqual([pr.ball.idx, pr.ball.s, pr.throws, pr.again], [1, 'w', 1, true], '다음 판 기회는 오늘(새날) 기준');
  assert.deepEqual(puzzlePrizeOf(p.puzzle, T2), { won: false, left: true });
  assert.deepEqual(Object.keys(p.puzzle.won), [T]);
  puzzleAnswer(p, 'magic', true, 1, T2, 80, 'nope');
  assert.deepEqual(p.puzzle.ball, { d: T2, r: [80], f: 0 }, '이상한 날이면 오늘');
  const q = cloneMath(emptyMath());
  puzzleAnswer(q, 'magic', true, 1, T, 90, T2);
  assert.deepEqual(q.puzzle.ball, { d: T, r: [90], f: 0 }, '앞날이면 오늘');
  assert.equal(puzzleFinish(q, T, { rid: 90, ok: 2, total: 3, day: T2 }).ball.idx, 1);
  assert.deepEqual(Object.keys(q.puzzle.won), [T]);
});

test('P2-2 병합 — 기록마다 v420 이하가 준 몫을 먼저 「받음」으로 · ☀️·🧩·🕵️ 어느 차례로 합쳐도 · v421 판이 뒤에 있었으면 손대지 않음', () => {
  // ☀️ v420 백업(오늘 완주 · 묶음 기록 없음 = 받음) + v421 기록(오늘 못 미침)
  const oldBk = { ...emptyMath(), daily: { d: T, n: 1 } };
  const v421 = emptyMath(); sunDone(v421, T, 0, 3);
  for (const [a, b] of [[oldBk, v421], [v421, oldBk]]) {
    const mg = mergeMath(a, b);
    assert.deepEqual(mg.sunPrize, { d: T, won: 1 });
    assert.equal(sunDone(mg, T, 3, 3).prize.prize, false, '다시 못 받는다');
  }
  assert.equal(mergeMath(oldBk, { ...emptyMath(), daily: { d: Y, n: 2 } }).sunPrize, undefined, '둘 다 묶음 기록이 없으면 칸을 안 만든다');
  // 🧩 v420 백업(오늘 끝낸 판 — 🎯 줌) + v421 기록(오늘 못 미친 판 하나)
  const oldP = { day: { [T]: 1 }, sets: 3 };
  const newP = cloneMath(emptyMath()); puzzleFinish(newP, T, { rid: 1, ok: 0, total: 3 });
  for (const [a, b] of [[oldP, newP.puzzle], [newP.puzzle, oldP]]) assert.deepEqual(puzzlePrizeOf(mergePuzzle(a, b), T), { won: true, left: false });
  assert.deepEqual(mergePuzzle(newP.puzzle, newP.puzzle).won, {}, 'v421로 끝낸 날(f>0)은 손대지 않음');
  assert.deepEqual(mergePuzzle({ day: { [Y]: 1 }, ball: { d: T, r: [5], f: 0 } }, {}).won, {}, '그 뒤에 v421 판이 있었으면 알 수 없어 그대로');
  // 🕵️ 같게
  const oldD = { day: { [T]: 1 }, sets: 2 };
  const newD = {}; solve(newD, 'D1', false, false, 1); detectFinish(newD, T, ['D1'], false, { rid: 1 });
  for (const [a, b] of [[oldD, newD.detect], [newD.detect, oldD]]) assert.deepEqual(detectPrizeOf(mergeDetect(a, b), T), { won: true, left: false });
  assert.deepEqual(mergeMath({ ...emptyMath(), detect: oldD }, { ...emptyMath(), detect: newD.detect }).detect.won, { [T]: 1 }, 'db 병합도');
});

test('P3-1 시계가 뒤로 — 🧩·🕵️ 기회 칸이 앞날이면 「맞히면 🎯」라고 하지 않는다(기회 없음)', () => {
  const p = cloneMath(emptyMath());
  puzzleAnswer(p, 'magic', true, 1, T2, 1);
  assert.deepEqual(puzzlePrizeOf(p.puzzle, T), { won: false, left: false });
  assert.equal(puzzleTodayLine(0, puzzlePrizeOf(p.puzzle, T)), '끝내면 💰10 · 🎯는 내일 또 기회가 있어요 · 셋 다 한 번에 맞히면 🔷 수학스톤');
  const d = {};
  solve(d, 'D1', true, true, 1, T2);
  assert.deepEqual(detectPrizeOf(d.detect, T), { won: false, left: false });
});
