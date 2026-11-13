// 🔍 v422 (2026-11-13 「누르기만 하면 보상」 점검 5 → 아버님 「추천대로」) — node --test tests/reward422.test.js
//   국어·논술도 수학 v421과 같은 규칙: 끝내기 💰·⚡·🔥는 그대로 · 🎯·🥚·✨는 처음 고른 답이 반 이상일 때
//   📚 새 글 ★ 🎯 — ★★·★★★(v300)와 같은 조건(CATCH_FIRST_STAR 1) · 못 받으면 다음 날 ★★에서 다시
//   🔤 오늘의 낱말·🧩 국어 퍼즐 🎯 — 그 판의 처음 답 반 이상 · 그날 둘째 판까지(끝낸 판으로 셈) · 하루 한 번 · 💰·🟩 그대로
//   🖊️ 논술 🎯 — 세 걸음(이유·반대 의견·글 순서) 중 둘 이상을 안 틀린 판 · 둘째 판까지 · ⭐ 🎯 하나 더는 그대로
//   ✨ 국어·논술 오늘의 보너스 · 🥚 국어 알 하루 칸 — 반 이상인 글·판에서(기회 제한 없음) · 🔥는 그대로
import { fakeIdb } from './fakeidb.js'; // ★ db.js·xp.js보다 먼저
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { BALL_TRIES, halfRight, ballRule, ballOf, mergeBall, korPrizeKey, korPrizeReport, KOR_PRIZE_KINDS, allWords, korWordsRule, wordsToday } from '../js/korwords.js';
import { korPuzzleRule, puzzleTodayLine, puzzleFinishText, gotLine, ballTip } from '../js/korpuzzle.js';
import { allTopics, nonsulRule, nonsulTodayLine, nonsulFinishText, NONSUL_STEPS } from '../js/nonsul.js';
import { korFinishRule, validCards, dayNum, CATCH_FIRST_STAR, catchFirstOk, KOR_DAY_LISTS, KOR_COINS } from '../js/korean.js';
import { halfRight as mathHalf, prizeReport as mathPrizeReport, prizeKey as mathPrizeKey } from '../js/mathprog.js';
import { emptyProfile, cloneProfile, mergeStatRecord } from '../js/db.js';
import { korReportFromRaw } from '../js/korreport.js';

void fakeIdb;
const read = (f) => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const T0 = new Date(2026, 10, 13, 15, 0, 0).getTime();
const at = (days, h = 15) => new Date(2026, 10, 13 + days, h, 0, 0).getTime();
const D0 = dayNum(T0);
const pf = (o = {}) => cloneProfile({ ...emptyProfile(), ...o });

const CARDS = validCards(JSON.parse(read('coach/korean/reading.json')));
const CIDS = CARDS.map((c) => c.id);
const WORDS = allWords(JSON.parse(read('coach/korean/words.json')), JSON.parse(read('coach/korean/reading.json')).cards);
const WIDS = WORDS.map((w) => w.id);
const CON = WORDS.filter((w) => w.deck === 'concept').map((w) => w.id);
const PIDS = ['O11', 'F1', 'O12', 'O13', 'F2', 'F3'];
const NS = allTopics(JSON.parse(read('coach/korean/nonsul.json')));
const NIDS = NS.map((t) => t.id);
/** 낱말 판 — 앞 k개만 처음에 맞힘 */
const words = (ids, k) => ids.map((id, i) => ({ id, ok: i < k }));

// ───────────── 공통 기록 ─────────────

test('halfRight — 수학과 같은 기준(같은 몸통) · ballRule: 첫 판 반 이상 → 받음 · 못 미치면 둘째 판까지 · 하루 한 번 · 셋째는 셈 밖 · 다음 날 새로', () => {
  assert.equal(BALL_TRIES, 2);
  for (const [ok, t] of [[0, 0], [1, 2], [1, 3], [2, 3], [3, 6], [2, 6], [5, 10], [4, 10]]) assert.equal(halfRight(ok, t), mathHalf(ok, t), `${ok}/${t}`);
  const body = (f) => /function halfRight\(ok, total\) \{[\s\S]*?\n\}/.exec(read(f))[0].replace(/^export /, '');
  assert.equal(body('js/korwords.js'), body('js/mathprog.js'));
  let r = ballRule(null, D0, { paid: false, ok: 1, total: 3 });
  assert.deepEqual(r, { rec: { d: D0, n: 1, w: 0 }, prize: false, ball: { idx: 1, ok: 1, total: 3, s: 'm' }, again: true });
  r = ballRule(r.rec, D0, { paid: true, ok: 2, total: 3 });
  assert.deepEqual(r, { rec: { d: D0, n: 2, w: 1 }, prize: true, ball: { idx: 2, ok: 2, total: 3, s: 'w' }, again: false });
  r = ballRule(r.rec, D0, { paid: true, ok: 3, total: 3 });
  assert.deepEqual([r.prize, r.ball.s, r.ball.idx], [false, 'd', 0], '하루 한 번');
  // 둘 다 못 미침 → 셋째는 셈 밖
  let q = ballRule(null, D0, { ok: 0, total: 4 });
  q = ballRule(q.rec, D0, { paid: true, ok: 1, total: 4 });
  assert.deepEqual([q.prize, q.ball.s, q.again], [false, 'm', false]);
  q = ballRule(q.rec, D0, { paid: true, ok: 4, total: 4 });
  assert.deepEqual([q.prize, q.ball.s, q.ball.idx], [false, 'o', 0]);
  // 다음 날은 새로
  assert.equal(ballRule(q.rec, D0 + 1, { ok: 2, total: 4 }).prize, true);
  // 낸 답이 없는 판은 아님
  assert.equal(ballRule(null, D0, { ok: 0, total: 0 }).prize, false);
});

test('규칙을 바꾼 날 — 오늘 💰를 받은 판이 있는데 기록이 없으면 v421 이하가 준 것(받음으로 적음) · 시계가 뒤로면 판정 안 함 · 화면 ballOf', () => {
  const r = ballRule(null, D0, { paid: true, ok: 3, total: 3 });
  assert.deepEqual([r.prize, r.ball.s, r.rec.w, r.again], [false, 'd', 1, false]);
  assert.deepEqual(ballOf(null, D0, true), { won: true, left: false }, '화면도 받은 것으로');
  assert.deepEqual(ballOf(r.rec, D0, true), { won: true, left: false });
  assert.deepEqual(ballOf(null, D0, false), { won: false, left: true });
  assert.deepEqual(ballOf({ d: D0, n: 1, w: 0 }, D0, true), { won: false, left: true }, 'v422로 끝낸 판이 있으면 v421 몫이 아니다');
  assert.deepEqual(ballOf({ d: D0, n: 2, w: 0 }, D0, true), { won: false, left: false });
  assert.deepEqual(ballOf({ d: D0 - 1, n: 2, w: 1 }, D0, false), { won: false, left: true }, '어제 기록은 오늘 것이 아니다');
  // 시계가 뒤로 — 앞날 기록은 그대로 · 기회 없음
  const ahead = { d: D0 + 1, n: 1, w: 0 };
  const b = ballRule(ahead, D0, { ok: 3, total: 3 });
  assert.deepEqual([b.prize, b.ball.s, b.again, b.rec], [false, 'o', false, ahead]);
  assert.deepEqual(ballOf(ahead, D0, false), { won: false, left: false });
  assert.deepEqual(ballOf({ d: 'x', n: 9, w: 1 }, D0, false), { won: false, left: true }, '깨진 기록은 없는 것으로');
});

test('mergeBall — 늦은 날 · 같은 날 판 수 큰 쪽·받음은 어느 쪽이든 · 합친 날에 💰를 받았는데 그날 기록이 없는 쪽이 있으면 v421 이하 몫(받음) · 둘 다 없으면 null', () => {
  assert.equal(mergeBall(null, null, {}, {}), null);
  assert.deepEqual(mergeBall({ d: D0, n: 1, w: 0 }, { d: D0, n: 2, w: 0 }, { [D0]: 1 }, { [D0]: 1 }), { d: D0, n: 2, w: 0 });
  assert.deepEqual(mergeBall({ d: D0, n: 1, w: 1 }, { d: D0, n: 2, w: 0 }, { [D0]: 1 }, { [D0]: 1 }), { d: D0, n: 2, w: 1 });
  assert.deepEqual(mergeBall({ d: D0, n: 2, w: 0 }, { d: D0, n: 1, w: 1 }, { [D0]: 1 }, { [D0]: 1 }), { d: D0, n: 2, w: 1 }, '받음이 뒤쪽에만 있어도');
  assert.deepEqual(mergeBall({ d: D0 - 1, n: 2, w: 1 }, { d: D0, n: 1, w: 0 }, { [D0 - 1]: 1 }, { [D0]: 1 }), { d: D0, n: 1, w: 0 }, '늦은 날');
  // v421 백업(오늘 💰 받음 · 기록 없음) + v422 기록(오늘 못 미침) → 받음 (어느 차례로 합쳐도)
  const legacy = [null, { [D0]: 1 }];
  const fresh = [{ d: D0, n: 1, w: 0 }, { [D0]: 1 }];
  assert.deepEqual(mergeBall(legacy[0], fresh[0], legacy[1], fresh[1]), { d: D0, n: 1, w: 1 });
  assert.deepEqual(mergeBall(fresh[0], legacy[0], fresh[1], legacy[1]), { d: D0, n: 1, w: 1 });
  // db.mergeStatRecord('profile') — 세 칸 모두
  const a = { ...emptyProfile(), korWordBall: { d: D0, n: 1, w: 0 }, korWordDay: { [D0]: 1 }, nonsulBall: { d: D0, n: 2, w: 1 }, nonsulDay: { [D0]: 1 } };
  const b2 = { ...emptyProfile(), korPuzzleDay: { [D0]: 1 }, korWordDay: { [D0]: 1 } };
  const m = mergeStatRecord('profile', a, b2);
  // 🔤 b2는 오늘 💰를 받았는데 기록이 없다 = v421 몫(받음) · 🧩는 양쪽 다 기록이 없어 칸을 안 둔다(화면·판정이 날 기록으로 v421 몫을 읽는다)
  assert.deepEqual([m.korWordBall, m.korPuzzleBall, m.nonsulBall], [{ d: D0, n: 1, w: 1 }, undefined, { d: D0, n: 2, w: 1 }]);
  assert.deepEqual(ballOf(m.korPuzzleBall, D0, true), { won: true, left: false }, '칸이 없어도 v421 몫은 받은 것으로');
  assert.equal(mergeStatRecord('profile', { ...emptyProfile() }, { ...emptyProfile() }).korWordBall, undefined, '둘 다 없으면 칸을 안 둔다');
});

test('mergeBall — 옛 백업의 앞날 💰 날로 오늘 기록을 덮지 않는다(Codex 225차) · 자기 병합·옛 백업 양방향 · 날이 다르면 실제 기록 그대로(오늘 v421 몫은 paid가)', () => {
  // v421 때 시계 오류로 앞날 💰 날이 남은 프로필 → 시계를 고치고 v422 오늘 첫 판 못 미침
  const p = pf({ korWordDay: { [D0 + 30]: 1 } });
  const r1 = korWordsRule(p, words(CON.slice(0, 6), 1), T0, WIDS);
  assert.deepEqual([r1.first, r1.prize, r1.again, p.korWordBall], [true, false, true, { d: D0, n: 1, w: 0 }]);
  const back = pf({ korWordDay: { [D0 + 30]: 1 } }); // 옛 v421 백업 — 기록 없음
  for (const [label, a, b] of [['자기 병합', p, p], ['프로필 + 옛 백업', p, back], ['옛 백업 + 프로필', back, p]]) {
    const m = cloneProfile(mergeStatRecord('profile', a, b));
    assert.deepEqual(m.korWordBall, { d: D0, n: 1, w: 0 }, label);
    assert.deepEqual(ballOf(m.korWordBall, D0, true), { won: false, left: true }, `${label} — 둘째 판 기회가 남는다`);
    const r2 = korWordsRule(m, words(CON.slice(6, 10), 2), T0 + 60000, WIDS);
    assert.deepEqual([r2.first, r2.prize, r2.ball.idx, r2.ball.s], [false, true, 2, 'w'], `${label} — 둘째 판이 반 이상이면 받는다`);
  }
  // 순수 — 앞날 💰 날만 있는 쪽은 짐작하지 않는다 · 💰 날만으로 기록을 만들지 않는다(오늘 몫은 paid가)
  assert.deepEqual(mergeBall({ d: D0, n: 1, w: 0 }, null, { [D0]: 1, [D0 + 30]: 1 }, { [D0 + 30]: 1 }), { d: D0, n: 1, w: 0 });
  assert.equal(mergeBall(null, null, { [D0]: 1 }, { [D0]: 1 }), null);
  // 날이 다르면 실제 기록 그대로 — 어제 기록 + 오늘 💰(v421 몫) → 기록은 어제 · 오늘은 화면·판정의 paid가 받은 것으로 본다
  const old = mergeBall({ d: D0 - 1, n: 2, w: 0 }, null, { [D0 - 1]: 1 }, { [D0]: 1 });
  assert.deepEqual(old, { d: D0 - 1, n: 2, w: 0 });
  assert.deepEqual(ballOf(old, D0, true), { won: true, left: false });
  assert.equal(ballRule(old, D0, { paid: true, ok: 3, total: 3 }).ball.s, 'd');
});

// ───────────── 🔤·🧩·🖊️ 판 ─────────────

test('🔤 오늘의 낱말 — 첫 판 💰10은 그대로 · 🎯는 처음 고른 답이 반 이상일 때 · 못 미치면 둘째 판 · half는 ✨·🥚용', () => {
  const p = pf();
  const ids = CON.slice(0, 6);
  const r1 = korWordsRule(p, words(ids, 2), T0, WIDS); // 2/6
  assert.deepEqual([r1.first, r1.coins, r1.prize, r1.ball.s, r1.again, r1.half, p.korThrow.earned], [true, 10, false, 'm', true, false, 0]);
  const r2 = korWordsRule(p, words(CON.slice(6, 10), 2), T0 + 60000, WIDS); // 2/4
  assert.deepEqual([r2.first, r2.coins, r2.prize, r2.ball, r2.half, p.korThrow.earned], [false, 0, true, { idx: 2, ok: 2, total: 4, s: 'w' }, true, 1]);
  const r3 = korWordsRule(p, words(CON.slice(10, 14), 4), T0 + 120000, WIDS);
  assert.deepEqual([r3.prize, r3.ball.s, p.korThrow.earned], [false, 'd', 1], '하루 한 번');
  assert.deepEqual(p.korWordBall, { d: D0, n: 3, w: 1 });
  // 🟩는 그대로(첫 판 · 5개 이상 다 맞힘) · 그 판은 🎯도
  const s = pf();
  const rs = korWordsRule(s, words(CON.slice(0, 5), 5), T0, WIDS);
  assert.deepEqual([rs.stone, rs.prize, s.korThrow.earned], [1, true, 1]);
  assert.equal(wordsToday(s.korWordDay, T0), 2);
  // 바뀐 날 — v421이 오늘 첫 판에 🎯를 줬다(💰 받은 날은 있는데 기록이 없다) → 다시 못 받는다
  const old = pf({ korWordDay: { [D0]: 1 } });
  const ro = korWordsRule(old, words(CON.slice(0, 4), 4), T0, WIDS);
  assert.deepEqual([ro.first, ro.prize, ro.ball.s, old.korWordBall.w, old.korThrow.earned], [false, false, 'd', 1, 0]);
});

test('🧩 국어 퍼즐 — 🎯는 한 번에 맞힌 퍼즐이 반 이상인 판 · 글 끝 퍼즐 하나도 한 판 · 둘째 판까지 · 💰·🟩 그대로', () => {
  const p = pf();
  const r1 = korPuzzleRule(p, [{ id: 'O11', ok: false, from: 0 }], T0, PIDS); // 글 끝 퍼즐 하나 — 틀림
  assert.deepEqual([r1.first, r1.coins, r1.prize, r1.ball.idx, r1.ball.s, r1.again, r1.half], [true, 10, false, 1, 'm', true, false]);
  const r2 = korPuzzleRule(p, [{ id: 'F1', ok: true, from: 0 }, { id: 'O12', ok: false, from: 0 }], T0 + 1000, PIDS); // 1/2
  assert.deepEqual([r2.prize, r2.ball.s, p.korThrow.earned, r2.half], [true, 'w', 1, true]);
  // 둘 다 못 미치면 내일
  const q = pf();
  korPuzzleRule(q, [{ id: 'O11', ok: false, from: 0 }], T0, PIDS);
  const q2 = korPuzzleRule(q, [{ id: 'F1', ok: false, from: 0 }, { id: 'O12', ok: false, from: 0 }, { id: 'O13', ok: true, from: 0 }], T0 + 1000, PIDS);
  assert.deepEqual([q2.prize, q2.ball.s, q2.again, q.korThrow.earned], [false, 'm', false, 0]);
  const q3 = korPuzzleRule(q, [{ id: 'F2', ok: true, from: 0 }], T0 + 2000, PIDS);
  assert.deepEqual([q3.prize, q3.ball.s, q3.ball.idx], [false, 'o', 0], '셋째 판은 셈 밖');
  // 다 맞힌 첫 판 — 💰 · 🎯 · 🟩
  const w = pf();
  const rw = korPuzzleRule(w, ['O11', 'F1', 'O12'].map((id) => ({ id, ok: true, from: 0 })), T0, PIDS);
  assert.deepEqual([rw.coins, rw.prize, rw.stone, w.korThrow.earned], [10, true, 1, 1]);
  // 바뀐 날 — v421이 오늘 첫 판에 🎯를 줬다
  const old = pf({ korPuzzleDay: { [D0]: 1 } });
  const ro = korPuzzleRule(old, [{ id: 'F3', ok: true, from: 0 }], T0, PIDS);
  assert.deepEqual([ro.prize, ro.ball.s, old.korPuzzleBall.w, old.korThrow.earned], [false, 'd', 1, 0]);
});

test('🖊️ 논술 — 판 🎯는 세 걸음 중 둘 이상을 안 틀린 판 · 둘째 판까지 · ⭐ 🎯 하나 더는 그대로 · steps가 없으면 처음부터 다 맞혔나로', () => {
  assert.equal(NONSUL_STEPS, 3);
  const p = pf();
  const r1 = nonsulRule(p, { id: NIDS[0], ok: false, from: 0, steps: { ok: 1 } }, T0, NIDS);
  assert.deepEqual([r1.first, r1.coins, r1.prize, r1.ball.s, r1.again, r1.half, p.nonsulThrow.earned], [true, 10, false, 'm', true, false, 0]);
  const r2 = nonsulRule(p, { id: NIDS[1], ok: false, from: 0, steps: { ok: 2 } }, T0 + 1000, NIDS);
  assert.deepEqual([r2.prize, r2.ball.s, r2.half, p.nonsulThrow.earned], [true, 'w', true, 1]);
  // 처음 ⭐(처음부터 다 맞힘) — 판 🎯 + ⭐ 🎯 = 둘
  const s = pf();
  const rs = nonsulRule(s, { id: NIDS[0], ok: true, from: 0, steps: { ok: 3 } }, T0, NIDS);
  assert.deepEqual([rs.prize, rs.starCatch, s.nonsulThrow.earned], [true, true, 2]);
  // 이상한 steps는 옛 부름처럼
  const o = pf();
  assert.equal(nonsulRule(o, { id: NIDS[0], ok: false, from: 0, steps: { ok: 9 } }, T0, NIDS).prize, false);
  assert.equal(nonsulRule(pf(), { id: NIDS[0], ok: true, from: 0 }, T0, NIDS).prize, true, 'steps 없고 처음부터 다 맞힘 — 셋 다');
});

// ───────────── 📚 새 글 ★ ─────────────

test('📚 새 글 ★ 🎯 — ★★·★★★와 같은 조건(처음 고른 답 반 이상) · 별·💰는 그대로 · half는 별이 없는 읽기에도', () => {
  assert.equal(CATCH_FIRST_STAR, 1);
  assert.equal(catchFirstOk(1, 1, 3), false);
  assert.equal(catchFirstOk(1, 2, 3), true);
  const c = CARDS.find((x) => x.qs.length === 3);
  const rd = (n, f) => ({ t: T0, s: 60, a: 10, n, f, x: 0, e: 0, h: 0, m: '', q: 3 });
  const p = pf();
  const r = korFinishRule(p, c.id, T0, { detail: 2 }, CIDS, 0, { read: rd(3, 1) });
  assert.deepEqual([r.star, r.coins, r.noCatch, r.half, p.korThrow.earned], [1, KOR_COINS[1], 'first', false, 0]);
  const q = pf();
  const r2 = korFinishRule(q, c.id, T0, {}, CIDS, 0, { read: rd(3, 2) });
  assert.deepEqual([r2.star, r2.noCatch, r2.half, q.korThrow.earned], [1, undefined, true, 1]);
  // 같은 날 다시 읽기(별 없음)에도 half
  const r3 = korFinishRule(q, c.id, T0 + 60000, {}, CIDS, 0, { read: { ...rd(3, 3), t: T0 + 60000 } });
  assert.deepEqual([r3.star, r3.half], [0, true]);
});

// ───────────── 말 · 📤 ─────────────

test('아이 화면 말 — 시작 줄·끝 화면 🎯 줄은 셈 없이 · 받으면 받은 것만 · 못 미치면 「한 판 더」 · 기회 지나면 「내일 또」', () => {
  const L = { won: false, left: true }; const W = { won: true, left: false }; const X = { won: false, left: false };
  assert.equal(puzzleTodayLine(0, L), '끝내면 💰10 · 한 번에 많이 맞히면 🎯 · 퍼즐 3개 이상을 모두 한 번에 맞히면 🟩 국어스톤');
  assert.equal(puzzleTodayLine(1, X), '오늘 퍼즐 보상은 받았어요 ✅ — 🎯는 내일 또 기회가 있어요');
  assert.equal(puzzleTodayLine(2, W), '오늘의 퍼즐 끝 ✅ 🟩까지 받았어요');
  assert.equal(nonsulTodayLine(0, true, X), '끝내면 💰10 · 🎯는 내일 또 기회가 있어요 · 처음부터 다 맞히면 ⭐와 🎯 하나 더');
  assert.equal(gotLine({ coins: 10, prize: false, stone: 0 }), '💰 +10');
  assert.equal(gotLine({ coins: 0, prize: true, stone: 0 }), '🎯 국어 포켓몬 잡기 1번');
  assert.equal(ballTip({ ball: { s: 'm' }, again: true }, '🧩 퍼즐에서'), '🎯는 한 번에 많이 맞히면 나와요 — 🧩 퍼즐에서 한 판 더 해 볼까요?');
  assert.equal(ballTip({ ball: { s: 'm' }, again: false }), '🎯는 내일 또 기회가 있어요!');
  assert.equal(ballTip({ ball: { s: 'o' } }), '🎯는 내일 또 기회가 있어요!');
  assert.equal(ballTip({ ball: { s: 'w' } }), '');
  const f = puzzleFinishText({ ok: true, first: true, coins: 10, prize: false, stone: 0, ball: { s: 'm' }, again: true, n: 3, okN: 1, solved: [] });
  assert.deepEqual(f.lines, ['한 번에 맞힌 퍼즐 1 / 3', '💰 +10', '🎯는 한 번에 많이 맞히면 나와요 — 🧩 퍼즐에서 한 판 더 해 볼까요?']);
  const n = nonsulFinishText({ ok: true, first: true, coins: 10, prize: false, ball: { s: 'm' }, again: true, solved: false, starCatch: false, practice: false });
  assert.deepEqual(n.lines.slice(0, 2), ['💰 +10', '🎯는 한 번에 많이 맞히면 나와요 — 한 판 더 해 볼까요?']);
  // 첫 판인데 판 🎯는 없고(바뀐 날 등) ⭐ 🎯만 — 「더」를 붙이지 않는다(🎯가 하나뿐)
  assert.equal(nonsulFinishText({ ok: true, first: true, coins: 10, prize: false, ball: { s: 'd' }, solved: true, starCatch: true, practice: false }).lines.at(-1), '⭐ 처음부터 다 맞혔어요! · 🎯 논술 포켓몬 잡기 1번');
  for (const t of [puzzleTodayLine(1, L), puzzleTodayLine(0, X), nonsulTodayLine(1, false, L), f.lines[2], n.lines[1]]) assert.doesNotMatch(t, /남은|\d+ ?번 (더|남)|\d+\s*\/\s*\d+/, `셈 없음: ${t}`);
});

test('📤 korPrize — 하루 기록 목록 칸 · 열쇠 꼴 · 최근 7일 · 기록이 있는 꼴만(논술 원고가 없는 요약에 🖊️가 끼지 않게) · 국어 요약에 한 줄', async () => {
  assert.ok(KOR_DAY_LISTS.includes('korPrize'));
  assert.deepEqual(KOR_PRIZE_KINDS, ['read', 'pz', 'word', 'ns']);
  assert.equal(korPrizeKey('pz', 123, 2, 1, 3, 'w'), 'pz:123:2:1/3:w');
  assert.equal(korPrizeKey('nope', 'a1.5', -1, 'x', 4, 'z'), 'pz:15:0:0/4:o');
  const days = [
    { date: '2026-11-13', korPrize: [korPrizeKey('read', 5, 1, 1, 3, 'm'), korPrizeKey('read', 6, 1, 2, 3, 'w'), korPrizeKey('pz', 9, 1, 0, 1, 'm'), korPrizeKey('pz', 10, 2, 2, 3, 'w')] },
    { date: '2026-11-01', korPrize: [korPrizeKey('ns', 1, 1, 3, 3, 'w')] },
  ];
  const keys = Array.from({ length: 7 }, (_, k) => `2026-11-${String(13 - k).padStart(2, '0')}`);
  assert.equal(korPrizeReport(days, keys), '🎯 처음 답 반 이상(v422 · 최근 7일): 📚 별 받은 글 ★ 받음 1·못 미침 1 · ★★ 받음 0·못 미침 0 · ★★★ 받음 0·못 미침 0 | 🧩 11-13 1째 0/1 ❌못 미침 · 11-13 2째 2/3 ✅받음');
  assert.equal(korPrizeReport([], keys), '🎯 처음 답 반 이상(v422 · 최근 7일): 아직 없음');
  // 시계가 뒤로라 판정을 건너뛴 판(첫 판이어도)·셋째 판 — 「셈 밖」(Codex 225차 P3 — 「셋째 뒤」로 적혔다) · 수학 📤도
  const ahead = ballRule({ d: D0 + 1, n: 1, w: 0 }, D0, { ok: 3, total: 3 }).ball;
  assert.equal(korPrizeReport([{ date: '2026-11-13', korPrize: [korPrizeKey('word', 1, ahead.idx, ahead.ok, ahead.total, ahead.s)] }], keys), '🎯 처음 답 반 이상(v422 · 최근 7일): 🔤 11-13 셈 밖 3/3 (기회 지남)');
  assert.ok(mathPrizeReport([{ date: '2026-11-13', mathPrize: [mathPrizeKey('sun', '1.1', 0, 3, 3, 'o')] }], '2026-11-13').includes('☀️ 11-13 셈 밖 3/3 (기회 지남)'));
  // 📤 국어 요약(korReportFromRaw)에 한 줄 — 하루 기록을 받았을 때
  const raw = [JSON.parse(read('coach/korean/reading.json')), JSON.parse(read('coach/korean/words.json')), JSON.parse(read('coach/korean/puzzles.json'))];
  const rep = await korReportFromRaw(emptyProfile(), raw, '2026-11-13', days);
  assert.ok(rep.includes('\n- 🎯 처음 답 반 이상(v422 · 최근 7일): 📚 별 받은 글 ★ 받음 1·못 미침 1'), rep.slice(-400));
});

// ───────────── 화면 잇기 (소스 꼴) ─────────────

test('화면 잇기 — ✨는 반 이상인 글·판만(🔥는 그대로) · 🥚 네 곳 모두 half · 📤 칸 · 시작 줄에 오늘 기회 · 논술 세 걸음 · 안내 한 줄', () => {
  const kv = read('js/koreanview.js');
  assert.ok(kv.includes("korDayDone('korean', { bonus: !!res.half })") && kv.includes('const eggP = res && res.ok && res.half ? tickKorDay() : null;'));
  assert.ok(!/from '\.\/db\.js'/.test(kv), '국어 글 화면은 저장소를 직접 만지지 않는다 — 📤 칸은 xp.korFinish가');
  assert.ok(read('js/xp.js').includes("  if (dd && dd.date && r.star) dd.delta = { ...dd.delta, korPrize: [korPrizeKey('read', r.newRead.t, r.star, r.newRead.f, r.newRead.n, r.noCatch ? 'm' : 'w')] };"), '📚 별 받은 글 📤 칸 — 같은 날 기록에');
  assert.ok(kv.includes("if (star === 1) return '🎯 처음 고른 답이 반 이상 맞으면 포켓몬을 만나요';"));
  const kd = read('js/kordayview.js');
  assert.ok(kd.includes("const field = opts.bonus === false ? '' : bonusField(kind);"), '✨만 건너뛰고 🔥는 그대로');
  assert.ok(kd.indexOf('KOR_DAY.streak') < kd.indexOf("opts.bonus === false"), '🔥 선점이 ✨ 조건보다 먼저');
  const pv = read('js/korpuzzleview.js');
  assert.ok(pv.includes('const egg = res.half ? await ctx.tickKorDay() : null;') && pv.includes("    if (res.ball) notePlay({ korPrize: [korPrizeKey('pz', ps.t0, res.ball.idx, res.ball.ok, res.ball.total, res.ball.s)] });") && pv.includes("korBallToday('pz', now)"));
  assert.ok(pv.includes("const retry = !!(res.ok && res.ball && res.ball.s === 'm' && res.again);"));
  const kt = read('js/kortabs.js');
  assert.ok(kt.includes('const egg = res.half ? await ctx.tickKorDay() : null;') && kt.includes("    if (res.ball) applyDailyDelta(todayKey(), { korPrize: [korPrizeKey('word', ws.t0, res.ball.idx, res.ball.ok, res.ball.total, res.ball.s)] })") && kt.includes("korBallToday('word', now)") && kt.includes('S.ws = { t0: Date.now(),'));
  const nv = read('js/nonsulview.js');
  assert.ok(nv.includes("korDayDone('nonsul', { bonus: !!res.half })") && nv.includes('if (res.half) tickKorDay().then(') && nv.includes("    if (res.ball) applyDailyDelta(todayKey(), { korPrize: [korPrizeKey('ns', r.t0, res.ball.idx, res.ball.ok, res.ball.total, res.ball.s)] })"));
  assert.ok(nv.includes('const steps = { ok: [r.missR, r.missC, r.missO].filter((x) => !x).length };'));
  for (const s of ['else { r.miss = true; r.missR = true; }', 'else { r.miss = true; r.missC = true; }', 'r.miss = true; r.missO = true;']) assert.ok(nv.includes(s), s);
  assert.ok(nv.includes("import { todayKey } from './track.js';"), '📤 날');
  assert.ok(read('js/korday.js').includes("korean: '📚 글을 잘 읽고 처음에 많이 맞히면 받아요'"));
  assert.ok(read('js/korreport.js').includes('korPrizeReport('));
  const db = read('js/db.js');
  assert.ok(db.includes("for (const [f, days] of [['korWordBall', 'korWordDay'], ['korPuzzleBall', 'korPuzzleDay'], ['nonsulBall', 'nonsulDay']]) {"));
  assert.ok(Number((/const CACHE_VERSION = 'v(\d+)';/.exec(read('sw.js')) || [])[1]) >= 422);
});
