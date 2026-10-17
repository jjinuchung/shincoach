// 💪 확인 편에서 한 번 틀려도 괜찮게 (v262, 2026-10-15 — 아버님 "이대로 진행")
//  · 확인 편(오늘 확인 차례)에서 하나만 틀리고 그 문제의 쌍둥이를 맞히면 칸(box)·📏은 그대로, 내일 다시 (실패 +1, 일지 kp)
//  · 쌍둥이도 틀리거나 둘 넘게 틀리면 예전처럼 한 칸 내려간다
//  · 확인 차례에 틀린 뒤 그만두면(← · 앱 닫기) 틀린 채 끝낸 확인 편과 같다 — 한 칸 내려가고 내일 다시 (일지 rf)
//    → 그날 새 편을 받아 다 맞혀도 연습이라 칸이 안 오른다(그만두고 새 편 받기로 칸을 올리던 길이 닫힌다)
//  · 틀리기 전에 그만두거나, 처음 배우기·연습 편은 예전 그대로
//  · 아이 화면 말은 지키는 칸 그림으로만 — 셈은 없다 · 📊·📋는 노란 점 / 빨간 ⏹ · 🛡️ 줄 맨 끝에 💪
//  · Codex 73차: 그만둠이 못 통과인지는 연 날의 표시(due)로 · 다른 창이 이 칸 확인 편에서 틀린 채 풀고 있으면 연습 ·
//    푸는 중 편이 넘쳐 밀려나도 칸은 그대로 · 결과 보기 전에는 "그대로예요"라고 못 박지 않는다
import { fakeIdb } from './fakeidb.js'; // ★ db.js보다 먼저
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  keptReview, stageIcon, reviewKeep, keepLine, rivalWrong, applyRound, applyQuit, setLive, settleLives, LIVE_MAX, sameDayRounds, roundReward, tallyRound, stoneReward, lateBonus,
  conceptReport, mathReportText, guardReport, guardLines, stageOf, dailyPlan, STEMS,
} from '../js/mathprog.js';
import { emptyMath, mergeMath, cloneMath, updateMath, getMath } from '../js/db.js';

const T = '2026-10-15';
const T1 = '2026-10-16';
const [ID, ID2] = STEMS.fraction.list.map((c) => c.id);
const read = (f) => fs.readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');
/** 오늘 확인 차례인 아는 칸 (box 2 = 🐥) */
const dueRec = (o = {}) => ({ done: true, box: 2, dueAt: '2026-10-14', passes: 3, fails: 0, lastAt: 1, schedAt: 1, ...o });
const ok = (key) => ({ k: 'calc', ok: 1, key });
const no = (key, o = {}) => ({ k: 'calc', ok: 0, key, tag: '분모끼리 더함', ...o });
const round = (m, qs, o = {}) => applyRound(m, o.id || ID, { correct: qs.filter((q) => q.ok).length, total: o.total || qs.length, missTags: [], qs, mode: 'review', ...(o.rid ? { rid: o.rid, day: T } : {}) }, o.today || T);
const withRec = (rec) => { const m = emptyMath(); m.concepts[ID] = rec; return m; };

test('💪 keptReview: 틀린 문항이 꼭 하나이고 그 쌍둥이를 맞혔을 때만', () => {
  assert.equal(keptReview([ok('A'), no('B', { fx: 1 }), ok('C'), ok('D')]), true);
  assert.equal(keptReview([ok('A'), no('B', { fx: 0 }), ok('C')]), false, '쌍둥이도 틀림');
  assert.equal(keptReview([ok('A'), no('B'), ok('C')]), false, '쌍둥이가 없었다(③⭐) · 아직 안 풂');
  assert.equal(keptReview([no('A', { fx: 1 }), no('B', { fx: 1 })]), false, '둘 틀림');
  assert.equal(keptReview([ok('A'), ok('B')]), false, '다 맞음은 통과지 지킴이 아니다');
  assert.equal(keptReview([null, no('B', { fx: 1 }), undefined]), true);
  assert.equal(keptReview(undefined), false);
});

test('💪 stageIcon · reviewKeep: 사다리와 같은 그림 · 오늘 확인 차례일 때만', () => {
  assert.equal(stageIcon(dueRec()), '🐥');
  assert.equal(stageIcon(dueRec({ box: 0 })), '🥚');
  assert.equal(stageIcon(dueRec({ box: 1, placed: true })), '📏');
  assert.equal(stageIcon(dueRec({ box: 9 })), '👑');
  assert.equal(stageIcon(null), '');
  assert.equal(reviewKeep(dueRec(), T), '🐥');
  assert.equal(reviewKeep(dueRec({ dueAt: T }), T), '🐥', '오늘이 차례인 날');
  assert.equal(reviewKeep(dueRec({ dueAt: T1 }), T), null, '차례가 아니면(연습) 없다');
  assert.equal(reviewKeep(dueRec({ done: false }), T), null, '처음 배우기');
  assert.equal(reviewKeep(dueRec({ box: 5, dueAt: '' }), T), null, '👑');
  assert.equal(reviewKeep(undefined, T), null);
});

test('💪 keepLine: 지키는 칸 그림으로만 말하고 셈은 없다 · 남은 문제가 있으면 "끝까지" · 결과 보기 전에는 조건으로 · 그림이 없으면 null', () => {
  const lines = [keepLine('🐥', 'wrong'), keepLine('🐥', 'fixed', 2), keepLine('🐥', 'fixed', 0), keepLine('🐥', 'kept')];
  assert.deepEqual(lines, [
    '💪 괜찮아요! 한 문제는 틀려도 비슷한 문제를 맞히고 끝까지 풀면 🐥 그대로예요.',
    '💪 좋아요! 남은 문제도 끝까지 맞히면 🐥 그대로예요.',
    '💪 좋아요! [결과 보기]를 누르면 🐥 그대로예요.',
    '💪 틀린 문제와 비슷한 문제를 맞혀서 🐥 그대로예요 — 내일 한 번 더 확인해요.',
  ]);
  // 저장 전(결과 카드가 아닌) 말은 모두 조건(…면)이 붙는다 — ←로 나가면 못 통과라서 (Codex 73차 #4)
  for (const l of lines.slice(0, 3)) assert.ok(/(풀면|맞히면|누르면) 🐥 그대로예요\.$/.test(l), l);
  for (const l of lines) assert.ok(!/\d|번째|내려|떨어|남은 날|밀린/.test(l), `셈·내려감 말 없음: ${l}`);
  // 🛟(U+1F6DF)는 📊 "기록 되돌리기" 그림이고 2021년 그림 문자라 옛 기기에서 네모로 보인다 — 새 말은 💪
  assert.ok(!/\u{1F6DF}/u.test(lines.join('')) && lines.every((l) => l.startsWith('💪 ')));
  assert.equal(keepLine(null, 'wrong'), null);
  assert.equal(keepLine('', 'kept'), null);
  assert.equal(keepLine('🐥', 'other'), null);
});

test('💪 applyRound 확인 편: 하나만 틀리고 쌍둥이를 맞히면 칸 그대로·내일 다시(실패 +1 · 일지 kp) — 쌍둥이도 틀리면·둘 틀리면 예전처럼 한 칸 내려감', () => {
  const m = withRec(dueRec());
  const r = round(m, [ok('A'), ok('B'), no('C', { fx: 1 }), ok('D')], { rid: 5 });
  assert.deepEqual([r.kept, r.passed, r.review, r.practice, r.known], [true, false, true, false, false]);
  const rec = m.concepts[ID];
  assert.deepEqual([rec.box, rec.dueAt, rec.passes, rec.fails], [2, T1, 3, 1]);
  assert.ok(rec.schedAt > 1, '일정이 바뀌었다 — 합칠 때 이쪽이 이긴다');
  assert.deepEqual([m.log.at(-1).mode, m.log.at(-1).kp, m.log.at(-1).ok, m.log.at(-1).n], ['review', 1, 3, 4]);
  // 쌍둥이도 틀림 → 한 칸 내려감
  const m2 = withRec(dueRec());
  const r2 = round(m2, [ok('A'), no('B', { fx: 0 }), ok('C'), ok('D')]);
  assert.deepEqual([r2.kept, m2.concepts[ID].box, m2.concepts[ID].dueAt, 'kp' in m2.log.at(-1)], [false, 1, T1, false]);
  // 둘 틀림(하나는 쌍둥이를 맞힘) → 한 칸 내려감
  const m3 = withRec(dueRec());
  assert.equal(round(m3, [ok('A'), no('B', { fx: 1 }), no('C', { fx: 1 }), ok('D')]).kept, false);
  assert.equal(m3.concepts[ID].box, 1);
  // 정답 수와 문항 기록이 어긋나면(2/4인데 기록엔 틀림 하나) 지키지 않는다
  const m4 = withRec(dueRec());
  assert.equal(applyRound(m4, ID, { correct: 2, total: 4, missTags: [], qs: [ok('A'), no('B', { fx: 1 }), ok('C'), ok('D')], mode: 'review' }, T).kept, false);
  assert.equal(m4.concepts[ID].box, 1);
  // 다 맞히면 예전처럼 한 칸 오름
  const m5 = withRec(dueRec());
  const r5 = round(m5, [ok('A'), ok('B'), ok('C'), ok('D')]);
  assert.deepEqual([r5.passed, r5.kept, m5.concepts[ID].box, 'kp' in m5.log.at(-1)], [true, false, 3, false]);
});

test('💪 applyRound: 📏 진단 칸을 지키면 📏 그대로(🐣 "안다"가 되지 않는다) · 연습·처음 배우기는 지킴이 없다', () => {
  const m = withRec(dueRec({ box: 1, placed: true }));
  const r = round(m, [ok('A'), no('B', { fx: 1 }), ok('C'), ok('D')]);
  assert.deepEqual([r.kept, r.known, m.concepts[ID].placed, m.concepts[ID].box, stageOf(m.concepts[ID])], [true, false, true, 1, 'placed']);
  // 연습(차례가 내일) — 일정 그대로, 지킴 아님
  const p = withRec(dueRec({ dueAt: T1 }));
  const rp = round(p, [ok('A'), no('B', { fx: 1 }), ok('C'), ok('D')]);
  assert.deepEqual([rp.practice, rp.kept, p.concepts[ID].box, p.concepts[ID].dueAt, p.concepts[ID].schedAt], [true, false, 2, T1, 1]);
  // 처음 배우기 — v262엔 다 맞혀야 배움 → v279부터 고친 실수 하나까지 통과(지킴이 아니라 통과 — tests/mathslip279)
  const l = emptyMath();
  const rl = applyRound(l, ID, { correct: 3, total: 4, missTags: [], qs: [ok('A'), no('B', { fx: 1 }), ok('C'), ok('D')], mode: 'learn' }, T);
  assert.deepEqual([rl.kept, !!l.concepts[ID].done, rl.passed, rl.slip], [false, true, true, true]);
  assert.equal(rp.slip, true, '연습도 고친 실수 하나는 통과 — 일정은 그대로');
});

test('💪 지킨 편의 보상은 못 통과한 확인 편과 같다 — 확인 통과 보너스·🎟️ 복습·🔷·⏰ 없음', () => {
  const m = withRec(dueRec({ dueAt: '2026-10-01' }));
  const r = round(m, [ok('A'), no('B', { fx: 1 }), ok('C'), ok('D')]);
  assert.equal(r.late, 14);
  assert.deepEqual(roundReward(r, 3), roundReward({ ...r, kept: false }, 3));
  assert.equal(tallyRound(m, { mode: 'review', correct: 3, result: r }).rev, 0);
  assert.equal(stoneReward({ mode: 'review', result: r }), 0);
  assert.equal(lateBonus(m, { mode: 'review', result: r, today: T }), 0);
});

test('💪 applyQuit: 확인 차례에 틀린 뒤 그만두면 못 통과 — 한 칸 내려가고 내일 다시 · 실패 +1 · 📏 지움 · 일지 rf · 같은 편은 한 번', () => {
  const m = withRec(dueRec({ box: 1, placed: true }));
  assert.equal(applyQuit(m, { rid: 7, id: ID, mode: 'review', d: T, n: 4, due: 1, qs: [ok('A'), no('B')] }, T), true);
  const rec = m.concepts[ID];
  assert.deepEqual([rec.box, rec.dueAt, rec.fails, rec.passes, 'placed' in rec], [0, T1, 1, 3, false]);
  assert.ok(rec.schedAt > 1);
  assert.deepEqual([m.log.at(-1).mode, m.log.at(-1).rf, m.log.at(-1).ok, m.log.at(-1).n, m.log.at(-1).of], ['quit', 1, 1, 2, 4]);
  assert.equal(applyQuit(m, { rid: 7, id: ID, mode: 'review', d: T, n: 4, due: 1, qs: [ok('A'), no('B')] }, T), false, '같은 편은 한 번');
  assert.equal(m.concepts[ID].fails, 1);
  // 쌍둥이를 맞힌 뒤 그만둬도(남은 문제를 안 풂) · 🙈 확인된 실수여도 틀린 답이 있으면 못 통과
  for (const q of [no('B', { fx: 1 }), no('B', { w: 's', sv: 1, fx: 1 })]) {
    const mm = withRec(dueRec());
    applyQuit(mm, { rid: 8, id: ID, d: T, n: 4, due: 1, qs: [ok('A'), q] }, T);
    assert.deepEqual([mm.concepts[ID].box, mm.log.at(-1).rf], [1, 1], JSON.stringify(q));
  }
});

test('💪 applyQuit: 틀리기 전에 나가면 · 차례가 아니면 · 처음 배우기면 · 연 날 확인이 아니었으면 · 넘쳐 밀려났으면 예전 그대로(일정·실패 안 건드림, rf 없음)', () => {
  const cases = [
    ['다 맞힌 채 나감', dueRec(), [ok('A'), ok('B')], { due: 1 }],
    ['연 뒤 다른 창이 먼저 끝내 차례가 내일', dueRec({ dueAt: T1 }), [no('A')], { due: 1 }],
    ['처음 배우기', { done: false, box: 0, dueAt: '', passes: 0, fails: 0, lastAt: 0 }, [no('A')], { due: 1 }],
    ['연 날 연습 편(표시 없음) — 지금은 차례여도', dueRec(), [no('A')], {}],
    ['넘쳐 밀려남(evict)', dueRec(), [no('A')], { due: 1 }, { evict: true }],
  ];
  for (const [name, rec, qs, live, o] of cases) {
    const m = withRec(rec);
    const before = JSON.stringify({ box: rec.box, dueAt: rec.dueAt, fails: rec.fails, passes: rec.passes, schedAt: rec.schedAt, done: rec.done });
    assert.equal(applyQuit(m, { rid: 9, id: ID, d: T, n: 4, ...live, qs }, T, o), true, name);
    const r = m.concepts[ID];
    assert.equal(JSON.stringify({ box: r.box, dueAt: r.dueAt, fails: r.fails, passes: r.passes, schedAt: r.schedAt, done: r.done }), before, name);
    assert.equal('rf' in m.log.at(-1), false, name);
  }
});

test('💪 막힌 길: 틀린 뒤 그만두고 그날 새 편을 다 맞혀도 연습 — 칸이 안 오른다 · 편 수에는 그만둔 편도', () => {
  const m = withRec(dueRec());
  applyQuit(m, { rid: 11, id: ID, mode: 'review', d: T, n: 4, due: 1, qs: [ok('A'), ok('B'), no('C')] }, T);
  const r = round(m, [ok('A'), ok('B'), ok('C'), ok('D')], { rid: 12 });
  assert.deepEqual([r.passed, r.practice, r.review, m.concepts[ID].box, m.concepts[ID].dueAt], [true, true, false, 1, T1]);
  assert.equal(roundReward({ ...r, repeat: sameDayRounds(m, ID, T, 12) }, 4).xp, 6, '둘째 편 연습이라 문항 몫 반 · 확인 보너스 없음');
  // 내일은 다시 확인 차례 — 다 맞히면 오른다
  const r2 = round(m, [ok('A'), ok('B'), ok('C'), ok('D')], { today: T1 });
  assert.deepEqual([r2.review, r2.passed, m.concepts[ID].box], [true, true, 2]);
  // ☀️ 오늘의 수학도 이 칸을 오늘 확인으로 다시 뽑지 않는다
  const m2 = withRec(dueRec());
  applyQuit(m2, { rid: 13, id: ID, d: T, n: 4, due: 1, qs: [no('A')] }, T);
  assert.notEqual(dailyPlan(m2, T, 'fraction').roundId === ID && dailyPlan(m2, T, 'fraction').roundMode === 'review', true);
});

test('💪 앱을 닫아 다음에 열 때 정리(settleLives)도 같은 규칙 · 자정을 넘겨 정리하면 정리한 날 기준 내일', () => {
  const m = withRec(dueRec());
  m.lives = { 21: { rid: 21, id: ID, mode: 'review', d: T, n: 4, due: 1, qs: [no('A')] } };
  assert.equal(settleLives(m, new Set(), T1), 1);
  assert.deepEqual([m.concepts[ID].box, m.concepts[ID].dueAt, m.log.at(-1).rf, m.log.at(-1).d], [1, '2026-10-17', 1, T]);
  assert.equal(m.lives, undefined);
});

test('💪 Codex 73차 #1: 연습 편(차례가 내일)에서 틀리고 닫았다가 그 칸 차례인 날에 정리해도 못 통과가 아니다 — 확인 편을 다음 날 정리한 것과 다르다', () => {
  // 연습 편: 연 날(T) 차례가 내일(T1)이라 표시 없음 → T1에 정리하면 그날은 차례지만 그대로
  const p = withRec(dueRec({ dueAt: T1 }));
  p.lives = { 22: { rid: 22, id: ID, mode: 'practice', d: T, n: 4, qs: [no('A')] } };
  assert.equal(settleLives(p, new Set(), T1), 1);
  assert.deepEqual([p.concepts[ID].box, p.concepts[ID].dueAt, p.concepts[ID].fails, p.concepts[ID].schedAt, 'rf' in p.log.at(-1)], [2, T1, 0, 1, false]);
  // 🤔 한 번 더(편 이름 'review'지만 연 날 차례가 아님)도 같다 — 이름이 아니라 표시로 본다
  const a = withRec(dueRec({ dueAt: T1 }));
  a.lives = { 23: { rid: 23, id: ID, mode: 'review', d: T, n: 4, qs: [no('A')] } };
  settleLives(a, new Set(), T1);
  assert.deepEqual([a.concepts[ID].box, 'rf' in a.log.at(-1)], [2, false]);
  // 확인 편(표시 있음)을 다음 날 정리 → 못 통과
  const r = withRec(dueRec());
  r.lives = { 24: { rid: 24, id: ID, mode: 'review', d: T, n: 4, due: 1, qs: [no('A')] } };
  settleLives(r, new Set(), T1);
  assert.deepEqual([r.concepts[ID].box, r.log.at(-1).rf], [1, 1]);
});

test('💪 Codex 73차 #2: 한 창이 확인 편에서 틀린 채 열려 있으면 다른 창이 다 맞혀도 연습 — 어느 쪽이 먼저 끝나도 칸이 안 오른다', () => {
  const A = (qs, o = {}) => ({ rid: 101, id: ID, mode: 'review', d: T, n: 4, due: 1, qs, ...o });
  // rivalWrong: 같은 칸 · 다른 편 · 연 날 확인(due) · 틀린 문항이 있을 때만
  const base = withRec(dueRec());
  setLive(base, A([ok('A'), no('B')]));
  assert.equal(rivalWrong(base, ID, 202), true);
  assert.equal(rivalWrong(base, ID, 101), false, '제 편');
  assert.equal(rivalWrong(base, ID2, 202), false, '다른 칸');
  const noDue = withRec(dueRec()); setLive(noDue, A([no('B')], { due: undefined }));
  assert.equal(rivalWrong(noDue, ID, 202), false, '연 날 연습 편');
  const allOk = withRec(dueRec()); setLive(allOk, A([ok('A')]));
  assert.equal(rivalWrong(allOk, ID, 202), false, '아직 안 틀림');
  assert.equal(rivalWrong(emptyMath(), ID, 1), false);
  assert.equal(rivalWrong(null, ID, 1), false);
  // ① B가 먼저 4/4 → 연습(칸 그대로) → A 그만둠 → 못 통과(한 칸 내려감)
  const m = withRec(dueRec());
  setLive(m, A([ok('A'), no('B')]));
  const rb = round(m, [ok('A'), ok('B'), ok('C'), ok('D')], { rid: 202 });
  assert.deepEqual([rb.passed, rb.practice, rb.review, m.concepts[ID].box, m.concepts[ID].dueAt], [true, true, false, 2, '2026-10-14']);
  assert.ok(m.lives[101], 'A의 푸는 중 기록은 그대로');
  applyQuit(m, m.lives[101], T);
  assert.deepEqual([m.concepts[ID].box, m.concepts[ID].dueAt, m.log.at(-1).rf], [1, T1, 1]);
  // B가 하나 틀리고 쌍둥이를 맞혀도 연습이라 지킴 아님
  const k = withRec(dueRec());
  setLive(k, A([no('B')]));
  const rk = round(k, [ok('A'), no('B', { fx: 1 }), ok('C'), ok('D')], { rid: 203 });
  assert.deepEqual([rk.kept, rk.practice, k.concepts[ID].box], [false, true, 2]);
  // ② A가 먼저 끝냄(쌍둥이 맞혀 지킴) → B 4/4는 차례가 지나 연습
  const m2 = withRec(dueRec());
  setLive(m2, A([ok('A'), no('B', { fx: 1 })]));
  const ra = round(m2, [ok('A'), no('B', { fx: 1 }), ok('C'), ok('D')], { rid: 101 });
  assert.deepEqual([ra.kept, m2.lives], [true, undefined]);
  const rb2 = round(m2, [ok('A'), ok('B'), ok('C'), ok('D')], { rid: 204 });
  assert.deepEqual([rb2.practice, m2.concepts[ID].box, m2.concepts[ID].dueAt], [true, 2, T1]);
  // A가 아직 안 틀렸을 때 B가 먼저 다 맞히면 오른다(그 뒤 A의 틀림은 차례가 지나 그냥 그만둠)
  const m3 = withRec(dueRec());
  setLive(m3, A([ok('A')]));
  assert.equal(round(m3, [ok('A'), ok('B'), ok('C'), ok('D')], { rid: 205 }).review, true);
  applyQuit(m3, A([ok('A'), no('B')]), T);
  assert.deepEqual([m3.concepts[ID].box, 'rf' in m3.log.at(-1)], [3, false]);
});

test('💪 Codex 73차 #3: 푸는 중 편이 넘쳐 가장 오래된 편이 밀려나도 칸은 그대로 — 그 창이 이어서 끝내면 지킴', () => {
  const m = withRec(dueRec());
  setLive(m, { rid: 301, id: ID, mode: 'review', d: T, n: 4, due: 1, qs: [ok('A'), no('B')] });
  for (let i = 0; i < LIVE_MAX; i++) setLive(m, { rid: 310 + i, id: ID2, mode: 'learn', d: T, n: 4, qs: [ok('A')] });
  assert.equal(m.lives[301], undefined, '밀려남');
  const q = m.log.find((e) => e.rid === 301);
  assert.deepEqual([q.mode, 'rf' in q, m.concepts[ID].box, m.concepts[ID].dueAt, m.concepts[ID].fails], ['quit', false, 2, '2026-10-14', 0]);
  // 아직 푸는 창이 쌍둥이를 맞히고 끝냄 → 칸 지킴(실패는 한 번만)
  const r = round(m, [ok('A'), no('B', { fx: 1 }), ok('C'), ok('D')], { rid: 301 });
  assert.deepEqual([r.kept, m.concepts[ID].box, m.concepts[ID].dueAt, m.concepts[ID].fails], [true, 2, T1, 1]);
});

test('💪 합치기: 못 통과로 친 일정이 더 최근이면 그쪽 · 일지의 kp·rf는 그대로 남는다 · 복사본을 고쳐도 원본 그대로', () => {
  const a = withRec(dueRec());
  const b = cloneMath(a);
  applyQuit(a, { rid: 31, id: ID, d: T, n: 4, due: 1, qs: [no('A')] }, T);
  b.concepts[ID2] = dueRec();
  applyRound(b, ID2, { correct: 3, total: 4, missTags: [], qs: [ok('A'), no('B', { fx: 1 }), ok('C'), ok('D')], mode: 'review', rid: 32, day: T }, T);
  for (const mm of [mergeMath(a, b), mergeMath(b, a)]) {
    assert.deepEqual([mm.concepts[ID].box, mm.concepts[ID].dueAt, mm.concepts[ID2].box, mm.concepts[ID2].dueAt], [1, T1, 2, T1]);
    assert.ok(mm.log.some((e) => e.rid === 31 && e.rf === 1) && mm.log.some((e) => e.rid === 32 && e.kp === 1));
  }
  assert.equal(b.concepts[ID].box, 2, '합쳐도 입력은 그대로');
});

test('💪 📊·📋: 개념 줄의 노란 점(kept)·빨간 ⏹(rf) · 기록 글 ✘3/4💪 · ⏹✘ · 일지 줄 · 🛡️ 맨 끝 줄과 ⏹ 줄의 "못 통과로 침"', () => {
  const m = withRec(dueRec());
  m.concepts[ID2] = dueRec();
  round(m, [ok('A'), no('B', { fx: 1 }), ok('C'), ok('D')], { rid: 41 });
  applyQuit(m, { rid: 42, id: ID2, mode: 'review', d: T, n: 4, due: 1, qs: [no('A')] }, T);
  applyQuit(m, { rid: 43, id: ID2, d: T, n: 4, qs: [ok('A')] }, T); // 차례가 내일이 된 뒤 — 그냥 그만둠
  const rep = conceptReport(m);
  assert.deepEqual(rep.find((r) => r.id === ID).trail.map((t) => [t.pass, t.kept || 0]), [[false, 1]]);
  assert.deepEqual(rep.find((r) => r.id === ID2).trail.map((t) => [t.quit, t.rf || 0]), [[1, 1], [1, 0]]);
  const txt = mathReportText(m, T);
  assert.ok(txt.includes(' · ✘3/4💪') && txt.includes(' · ⏹✘0/1 ⏹1/1'), txt);
  assert.ok(txt.includes('review 3/4 💪칸 그대로') && txt.includes('⏹그만둠 0/1 (4문제 중) → 확인 못 통과로 침'), txt);
  const g = guardReport(m, T);
  assert.deepEqual(g.kept, [{ id: ID, name: g.kept[0].name, d: T }]);
  assert.deepEqual(g.quits.map((x) => x.rf || 0), [0, 1], '최근 것부터');
  const L = guardLines(g);
  assert.ok(L[1].startsWith('⏹ 그만둔 편 2(그중 확인 차례에 틀린 뒤 그만둬 못 통과로 친 편 1): ') && L[1].includes('맞힘 · 못 통과로 침)'), L[1]);
  assert.equal(L.at(-1), `💪 확인 편에서 한 문제만 틀리고 비슷한 문제를 맞혀 칸을 지킨 편 1: ${g.kept[0].name} 10-15`);
  for (const l of L) assert.ok(txt.includes(`\n${l}\n`) || txt.endsWith(`\n${l}`) || txt.includes(`\n${l}`), l);
});

test('💪 진짜 저장 경로(fakeidb): 확인 차례에 틀린 뒤 그만둠을 적고 다시 읽으면 칸이 내려가 있다 · 지킨 편도', async () => {
  assert.equal(fakeIdb.get('profile', 'math'), undefined, '이 파일의 첫 저장');
  await updateMath((s) => { s.concepts[ID] = dueRec(); s.concepts[ID2] = dueRec(); });
  await updateMath((s) => { applyQuit(s, { rid: 51, id: ID, mode: 'review', d: T, n: 4, due: 1, qs: [no('A')] }, T); });
  await updateMath((s) => { applyRound(s, ID2, { correct: 3, total: 4, missTags: [], qs: [ok('A'), no('B', { fx: 1 }), ok('C'), ok('D')], mode: 'review', rid: 52, day: T }, T); });
  const s = await getMath();
  assert.deepEqual([s.concepts[ID].box, s.concepts[ID].dueAt, s.concepts[ID2].box, s.concepts[ID2].dueAt], [1, T1, 2, T1]);
  assert.ok(s.log.some((e) => e.rid === 51 && e.rf === 1) && s.log.some((e) => e.rid === 52 && e.kp === 1));
});

test('💪 화면 배선: 편을 열 때 keep · 처음 틀린 문제(쌍둥이가 나올 때)에 💪 말 · 쌍둥이를 맞히면 · 결과 카드 · 📊 점과 설명 · css · sw v262', () => {
  const src = read('js/math.js');
  const fn = (name) => { const i = src.indexOf(`function ${name}(`); assert.ok(i >= 0, name); return src.slice(i, src.indexOf('\n}\n', i)); };
  assert.ok(src.includes('keepLine, reviewKeep, rivalWrong, stageIcon,'), 'import');
  const sr = fn('startRound');
  assert.ok(sr.includes('const keep = rivalWrong(ui.state, id, ui.lastRid) ? null : reviewKeep(ui.state && ui.state.concepts && ui.state.concepts[id], day);') && sr.includes('rid: ui.lastRid, day, rep, keep };'));
  assert.ok(sr.indexOf('ui.lastRid = Math.max(') < sr.indexOf('const keep = '), '새 편 번호를 정한 뒤에 다른 창 편을 본다');
  // 푸는 중 기록에 연 날 확인 표시 — 그만둠·다음 정리가 이 표시로 (Codex 73차 #1)
  assert.ok(src.includes("const liveOf = (r) => ({ rid: r.rid, id: r.id, mode: r.mode, d: r.day || todayKey(), n: r.qs.length, ...(r.keep ? { due: 1 } : {}), qs: conceptQs(r) });"));
  const pa = fn('paintAnswer');
  const ct = pa.indexOf("const canTwin = !ch.ok && q.solve && (q.kind === 'calc' || q.kind === 'misread') && !light(r) && q.key;");
  assert.ok(ct > 0 && ct < pa.indexOf('if (ch.ok) {'), 'canTwin은 맞음/틀림 갈래보다 먼저');
  const kl = pa.indexOf("const kl = canTwin && r.answers.slice(0, r.at).every((x) => x && x.correct) ? (r.keep ? keepLine(r.keep, 'wrong') : slipRound(r) ? slipLine('wrong') : null) : null;"); // v279: 처음 배우기·연습은 slipLine
  assert.ok(kl > 0 && kl < pa.indexOf('scrollTo = solveCard(q, shown, rv);'), '풀이 카드보다 먼저');
  assert.ok(pa.includes("if (kl) fb.appendChild(el('p', 'math-keep', kl));"));
  const pt = fn('paintTwin');
  const fx = pt.indexOf("const kl = r.answers.slice(0, t.of).every((x) => x && x.correct) ? (r.keep ? keepLine(r.keep, 'fixed', left) : slipRound(r) ? slipLine('fixed', left) : null) : null;"); // v279
  assert.ok(fx > pt.indexOf('if (ch.ok) {') && fx < pt.indexOf('} else {'), '쌍둥이를 맞혔을 때만');
  // 쌍둥이를 맞힌 말은 다 알았다고 대답하게 하지 않고 한 일을 짚는다 (Codex 73차 PART 2)
  assert.ok(pt.includes('`고쳤어요! 같은 방법으로 잘 풀었어요 ⚡+${REWARD.fix.xp} — 내일 한 번 더 물어볼게요`') && !src.includes('이제 알겠죠'));
  assert.ok(pt.includes("t.of + 1 < r.qs.length ? '다음 →' : '결과 보기'"), '말 속 [결과 보기]는 그 단추 이름');
  assert.ok(fn('finishRound').includes("(result.kept && keepLine(stageIcon(state && state.concepts && state.concepts[r.id]), 'kept'))"), '결과 카드');
  const st = read('js/stats.js');
  assert.ok(st.includes("if (report.some((r) => r.trail.some((t) => t.kept || t.rf))) cM.appendChild(el('p', 'stats-note', '💪 노란 점은"));
  const css = read('css/style.css');
  for (const sel of ['.math-keep {', '.math-report .dot.quit.rf {', '.math-report .dot.no.kept {']) assert.ok(css.includes(sel), sel);
  assert.ok(+(/const CACHE_VERSION = 'v(\d+)';/.exec(read('sw.js')) || [])[1] >= 262, 'sw v262 이상');
});
