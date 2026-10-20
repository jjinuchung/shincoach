// 🌱 수학 v301 (2026-10-19, 아버님 "니 추천대로 진행해보자") — 학교 진도 먼저 · 선행 칸 쉬기
//  ☀️ 오늘의 수학이 줄기와 상관없이 가장 오래 밀린 복습부터 내면(v257) 빠르게 연 선행 칸(6학년·중1)의 밀린 복습이 늘 먼저 나온다 →
//  m.rest가 켜져 있으면 ☀️는 6학년·중1 칸을 안 내고(복습·새로 배우기·섞어 풀기·🤔 노트) · 복습은 4학년 칸 → 통과가 실패보다 많은 칸 → 나머지 ·
//  새로 배우기는 낮은 학년 먼저 · 켤 때 이미 일정이 잡힌 6학년·중1 칸은 쉰다(사다리에 🔁 없음 · 열면 연습 · 🥚 잠금에 안 셈 · 기록 그대로) ·
//  켠 뒤에 새로 배운 칸은 예전처럼 · 끄면 예전 그대로 · 📊에서 아버님이 끄고 켠다 · 설정이 없으면 수학을 처음 열 때 한 번 켠다
import { fakeIdb } from './fakeidb.js'; // ★ db.js보다 먼저
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  STEMS, STEM_ORDER, ladderOf, dailyPlan, oldestDue, schoolDue, schoolNow, applyRound, applyQuit, reviewKeep, practiceNote, repeatNote, rungSub, waitNote,
  gradeOf, restOf, setRest, restInit, isResting, dailyOk, restLine, mathReportText, REST_GRADE, SCHOOL_GRADE,
} from '../js/mathprog.js';
import { emptyMath, cloneMath, mergeMath, updateMath, getMath } from '../js/db.js';

void fakeIdb;
const read = (f) => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');
const TODAY = '2026-10-20';
const T_OLD = new Date(2026, 9, 5, 12).getTime();
const T_REST = new Date(2026, 9, 20, 9).getTime();
const T_NEW = new Date(2026, 9, 20, 10).getTime();
const ON = { on: true, at: T_REST };
const OFF = { on: false, at: T_REST };
/** 배운 칸 하나 — 기본은 켜기 전에 일정이 잡혔고 오늘 이전에 복습 차례 */
const rec = (o = {}) => ({ done: true, box: 1, dueAt: '2026-10-10', passes: 2, fails: 0, lastAt: T_OLD, schedAt: T_OLD, ...o });
const mk = (concepts, rest, placed = {}) => ({ ...emptyMath(), concepts, placed, ...(rest ? { rest } : {}) });
const ids = (stem) => STEMS[stem].list.map((c) => c.id);
const doneAll = (stem, o = {}) => Object.fromEntries(ids(stem).map((id) => [id, rec({ dueAt: '2026-11-30', ...o })]));

test('🌱 설정 (순수): 없으면 꺼짐 · 처음 한 번만 켠다(restInit) · 끄고 켤 때 바꾼 시각은 늘 앞으로 · 학년은 원고 그대로', () => {
  assert.deepEqual([REST_GRADE, SCHOOL_GRADE], [6, 4]);
  for (const bad of [undefined, null, 5, 'on', {}, { on: 'yes', at: 5 }, { on: true }, { on: true, at: 0 }, { on: true, at: -3 }, { on: true, at: 1.5 }]) {
    assert.deepEqual(restOf({ rest: bad }), { on: false, at: 0 }, JSON.stringify(bad));
  }
  const m = emptyMath();
  assert.equal(restInit(m, T_REST), true);
  assert.deepEqual(m.rest, { on: true, at: T_REST });
  assert.equal(restInit(m, T_NEW), false, '이미 있으면 그대로 — 아버님이 끈 뒤에 다시 켜지 않는다');
  setRest(m, false, T_NEW);
  assert.deepEqual(m.rest, { on: false, at: T_NEW });
  setRest(m, true, T_OLD); // 시계가 뒤로 간 기기
  assert.deepEqual(m.rest, { on: true, at: T_NEW + 1 }, '바꾼 시각은 늘 앞으로');
  const off = { rest: { on: false, at: 9 } };
  assert.equal(restInit(off, T_NEW), false, '꺼 둔 것도 설정이다');
  assert.deepEqual([gradeOf('frac.mean'), gradeOf('frac.div'), gradeOf('rat.value'), gradeOf('nope')], [4, 6, 6, 0]);
  const g7 = Object.values(STEMS).flatMap((s) => s.list).find((c) => c.grade === 7);
  assert.equal(gradeOf(g7.id), 7, '중1');
  assert.deepEqual([dailyOk(mk({}, ON), 'frac.div'), dailyOk(mk({}, ON), g7.id), dailyOk(mk({}, ON), 'frac.mul'), dailyOk(mk({}, OFF), 'frac.div'), dailyOk(mk({}), 'frac.div')], [false, false, true, true, true]);
});

test('🌱 쉬는 칸 (isResting, 순수): 켜져 있고 · 6학년·중1 · 배운 칸 · 일정이 켜기 전(schedAt만 — 없는 옛 기록은 켜기 전)', () => {
  const m = mk({
    'frac.div': rec(),
    'frac.divnat': rec({ schedAt: T_NEW }),
    'frac.mul': rec(),
    'rat.value': rec({ done: false }),
    'rat.ratio': rec({ schedAt: undefined, lastAt: T_OLD }),
    'rat.compare': rec({ schedAt: undefined, lastAt: T_NEW }),
  }, ON);
  assert.equal(isResting(m, 'frac.div'), true);
  assert.equal(isResting(m, 'frac.divnat'), false, '켠 뒤에 일정이 잡힌 칸(새로 배우거나 확인한 칸)은 예전처럼');
  assert.equal(isResting(m, 'frac.mul'), false, '5학년은 쉬지 않는다');
  assert.equal(isResting(m, 'rat.value'), false, '아직 못 배운 칸');
  assert.deepEqual([isResting(m, 'rat.ratio'), isResting(m, 'rat.compare')], [true, true], 'schedAt이 없는 옛 기록은 켜기 전 — lastAt은 안 본다(연습·그만두기도 올린다, Codex 107차 #2)');
  assert.equal(isResting({ ...m, rest: OFF }, 'frac.div'), false, '꺼져 있으면 없음');
  assert.equal(isResting({ ...m, rest: undefined }, 'frac.div'), false, '설정이 없으면 없음');
  assert.equal(isResting(m, 'nope'), false);
});

test('🌱 사다리 (ladderOf): 쉬는 칸은 복습 차례가 아니다(🔁·남은 날 없음 · rest 표시) · 🥚 잠금에 안 센다 · 잠금 안내도 같게 · 칸 부제는 셈 없이', () => {
  const r = ids('ratio');
  const learning = { [r[0]]: rec({ box: 0 }), [r[1]]: rec({ box: 0 }) }; // 6학년 🥚 둘 — 켜기 전에 배움
  const on = ladderOf(mk(learning, ON), TODAY, 'ratio');
  const off = ladderOf(mk(learning, OFF), TODAY, 'ratio');
  assert.deepEqual(on.slice(0, 3).map((x) => [x.rest, x.due, x.dueIn, x.state]), [[true, false, null, 'done'], [true, false, null, 'done'], [undefined, false, null, 'now']]);
  assert.deepEqual(off.slice(0, 3).map((x) => [x.rest, x.due, x.state]), [[undefined, true, 'done'], [undefined, true, 'done'], [undefined, false, 'wait']], '끄면 예전처럼 🥚 둘이 잠근다');
  assert.equal(waitNote(on), null, '쉬는 🥚는 잠금 안내에도 안 센다');
  assert.ok(waitNote(off));
  // 켠 뒤에 새로 배운 6학년 칸은 예전처럼 — 다음 날 확인 · 🥚 잠금에 센다
  const fresh = ladderOf(mk({ [r[0]]: rec({ box: 0, schedAt: T_NEW, dueAt: TODAY }), [r[1]]: rec({ box: 0, schedAt: T_NEW, dueAt: '2026-10-21' }) }, ON), TODAY, 'ratio');
  assert.deepEqual(fresh.slice(0, 3).map((x) => [x.rest, x.due, x.state]), [[undefined, true, 'done'], [undefined, false, 'done'], [undefined, false, 'wait']]);
  // 쉬는 🥚 둘 + 켠 뒤에 새로 배운 🥚 둘로 잠겼다 — 안내는 새 🥚만 센다("🥚 칸 하나"이지 셋이 아니다)
  const mixed = ladderOf(mk({ ...learning, [r[2]]: rec({ box: 0, schedAt: T_NEW, dueAt: '2026-10-21' }), [r[3]]: rec({ box: 0, schedAt: T_NEW, dueAt: '2026-10-21' }) }, ON), TODAY, 'ratio');
  assert.equal(mixed[4].state, 'wait');
  const wn = waitNote(mixed);
  assert.ok(wn.includes('🥚 칸 하나') && !wn.includes('개를'), wn);
  // 👑은 쉼 표시 없이 그대로 · 5학년은 그대로
  const f = ladderOf(mk({ 'frac.div': rec({ box: 5, dueAt: '' }), 'frac.mul': rec() }, ON), TODAY, 'fraction');
  assert.deepEqual([f.find((x) => x.id === 'frac.div').rest, f.find((x) => x.id === 'frac.div').crowned, f.find((x) => x.id === 'frac.mul').due], [undefined, true, true]);
  // 칸 부제 — 셈·날짜 없이
  const sub = rungSub(on[0]);
  assert.equal(sub, '🌱 잠깐 쉬는 칸 — 풀면 연습이에요 (틀려도 칸은 그대로)');
  assert.ok(!/\d/.test(sub));
  assert.equal(rungSub({ ...on[0], crowned: true }), '이해 완료!', '👑이 먼저');
});

test('🌱 쉬는 칸을 열면 연습 — applyRound는 일정(box·dueAt·schedAt) 그대로 · 그만둬도 못 통과로 안 침 · 💪 확인 표시 없음 · 연습 안내(셈 없이) · 같은 날 몫도 연습으로 · 끄면 예전처럼 확인', () => {
  const qs = (n, ok) => Array.from({ length: n }, (_, i) => ({ k: 'calc', ok: i < ok ? 1 : 0, key: `t${i}` }));
  const base = () => mk({ 'frac.div': rec({ box: 2, passes: 3, fails: 5 }) }, ON);
  const m = base();
  const res = applyRound(m, 'frac.div', { correct: 4, total: 4, missTags: [], qs: qs(4, 4), rid: 11 }, TODAY);
  assert.deepEqual([res.practice, res.review, res.passed, res.rest], [true, false, true, true], 'rest — 결과 카드가 확인 날을 약속하지 않게 (Codex 107차 #1)');
  const pr = applyRound(mk({ 'frac.mul': rec({ dueAt: '2026-11-30' }) }, ON), 'frac.mul', { correct: 4, total: 4, missTags: [], qs: qs(4, 4), rid: 10 }, TODAY);
  assert.deepEqual([pr.practice, 'rest' in pr], [true, false], '쉬지 않는 칸의 연습은 예전 말(다음 확인 날)');
  const fl = applyRound(mk({}, ON), 'frac.div', { correct: 4, total: 4, missTags: [], qs: qs(4, 4), rid: 9 }, TODAY);
  assert.deepEqual([fl.first, 'rest' in fl], [true, false], '켠 뒤 처음 배운 6학년 칸은 쉼 표시 없음');
  assert.deepEqual([m.concepts['frac.div'].box, m.concepts['frac.div'].dueAt, m.concepts['frac.div'].schedAt, m.concepts['frac.div'].passes], [2, '2026-10-10', T_OLD, 4], '일정 그대로 · 쉬는 채로 남는다');
  assert.equal(isResting(m, 'frac.div'), true);
  const w = base();
  const rw = applyRound(w, 'frac.div', { correct: 1, total: 4, missTags: [], qs: qs(4, 1), rid: 12 }, TODAY);
  assert.deepEqual([rw.practice, w.concepts['frac.div'].box, w.concepts['frac.div'].fails], [true, 2, 6], '틀려도 칸은 그대로');
  // 끄면 예전처럼 확인 편
  const o = { ...base(), rest: OFF };
  const ro = applyRound(o, 'frac.div', { correct: 4, total: 4, missTags: [], qs: qs(4, 4), rid: 13 }, TODAY);
  assert.deepEqual([ro.review, o.concepts['frac.div'].box > 2, 'rest' in ro], [true, true, false]);
  // 그만두기 — 확인 편 표시(due)가 있어도 쉬는 칸이면 못 통과로 안 친다
  const q = base();
  assert.equal(applyQuit(q, { rid: 21, id: 'frac.div', d: TODAY, n: 4, due: 1, qs: qs(1, 0) }, TODAY), true);
  assert.deepEqual([q.log.at(-1).rf, q.concepts['frac.div'].box, q.concepts['frac.div'].fails], [undefined, 2, 5]);
  const qo = { ...base(), rest: OFF };
  applyQuit(qo, { rid: 22, id: 'frac.div', d: TODAY, n: 4, due: 1, qs: qs(1, 0) }, TODAY);
  assert.deepEqual([qo.log.at(-1).rf, qo.concepts['frac.div'].box], [1, 1], '끄면 예전처럼 한 칸 내려감');
  // 화면 말
  const r0 = base().concepts['frac.div'];
  assert.equal(reviewKeep(r0, TODAY, true), null, '💪 확인 표시 없음');
  assert.ok(reviewKeep(r0, TODAY), '쉬지 않으면 확인 편');
  const pn = practiceNote(r0, TODAY, null, 1, true);
  assert.ok(pn.startsWith('🌱 잠깐 쉬는 칸이라 연습이에요 — 틀려도 칸은 그대로 · ⚡💰만'), pn);
  assert.ok(!/\d/.test(pn), '날짜·셈 없이');
  assert.equal(practiceNote(r0, TODAY, null, 1), null, '쉬지 않는 확인 차례는 연습 안내 없음');
  assert.deepEqual([repeatNote(base(), 'frac.div', TODAY).practice, repeatNote({ ...base(), rest: OFF }, 'frac.div', TODAY).practice], [true, false]);
});

test('🌱 schedAt 없는 옛 기록 (Codex 107차 #2) — 연습 4/4·1/4·그만두기로 lastAt이 올라도 계속 쉰다 · 일정 그대로 · 사다리 복습 차례 아님 · 🥚 잠금에 안 셈 · 다음 날도 연습 · 끄면 예전처럼 확인', () => {
  const qs = (n, ok) => Array.from({ length: n }, (_, i) => ({ k: 'calc', ok: i < ok ? 1 : 0, key: `t${i}` }));
  const ON1 = { on: true, at: T_OLD + 1 }; // 켠 때가 시험을 돌리는 지금보다 늘 앞 — 풀면 lastAt(지금)이 켠 때를 넘는다
  const r = ids('ratio');
  const old = () => { const x = rec({ box: 0 }); delete x.schedAt; return x; };
  const base = (rest = ON1) => mk({ [r[0]]: old(), [r[1]]: old() }, rest);
  const check = (m, why) => {
    for (const id of [r[0], r[1]]) {
      assert.equal(isResting(m, id), true, `${why} ${id}`);
      assert.deepEqual([m.concepts[id].box, m.concepts[id].dueAt, 'schedAt' in m.concepts[id]], [0, '2026-10-10', false], `${why} ${id}`);
    }
    const lad = ladderOf(m, TODAY, 'ratio');
    assert.deepEqual(lad.slice(0, 3).map((x) => [x.rest, x.due, x.state]), [[true, false, 'done'], [true, false, 'done'], [undefined, false, 'now']], why);
    assert.equal(waitNote(lad), null, why);
  };
  const m = base();
  check(m, '처음');
  const a = applyRound(m, r[0], { correct: 4, total: 4, missTags: [], qs: qs(4, 4), rid: 31 }, TODAY);
  assert.deepEqual([a.practice, a.review, a.rest], [true, false, true]);
  assert.ok(m.concepts[r[0]].lastAt > ON1.at, 'lastAt은 켠 때 뒤로 올랐다');
  check(m, '4/4 뒤');
  applyRound(m, r[1], { correct: 1, total: 4, missTags: [], qs: qs(4, 1), rid: 32 }, TODAY);
  check(m, '1/4 뒤');
  assert.equal(applyQuit(m, { rid: 33, id: r[0], d: TODAY, n: 4, due: 1, qs: qs(1, 0) }, TODAY), true);
  assert.equal(m.log.at(-1).rf, undefined, '그만둬도 못 통과로 안 친다');
  check(m, '그만두기 뒤');
  const b = applyRound(m, r[0], { correct: 4, total: 4, missTags: [], qs: qs(4, 4), rid: 34 }, '2026-10-21');
  assert.deepEqual([b.practice, b.review, b.rest], [true, false, true], '다음 날도 연습');
  const o = base(OFF);
  const ro = applyRound(o, r[0], { correct: 4, total: 4, missTags: [], qs: qs(4, 4), rid: 35 }, TODAY);
  assert.deepEqual([ro.review, 'rest' in ro, typeof o.concepts[r[0]].schedAt], [true, false, 'number'], '끄면 예전처럼 확인 편');
});

/** ☀️ 계획 시험용 — 네 줄기를 진단했고 모두 배운 상태(복습은 먼 뒤) */
function planBase(rest) {
  const c = { ...doneAll('fraction'), ...doneAll('decimal'), ...doneAll('bignum') };
  delete c['big.apply']; delete c['dec.divnat']; delete c['dec.divdec']; // ▶: 큰 수 big.apply(4) · 소수 dec.divnat(6)
  return mk(c, rest, { fraction: 1, decimal: 1, bignum: 1 });
}

test('☀️ dailyPlan — 켜져 있으면 4학년 칸 복습 먼저(가장 늦게 밀렸어도) → 통과가 실패보다 많은 칸 → 나머지 · 6학년·중1은 안 냄 · 끄면 예전처럼 가장 오래 밀린 칸', () => {
  const set = (m, id, o) => { m.concepts[id] = { ...m.concepts[id], ...o }; return m; };
  const due = (rest) => {
    const m = planBase(rest);
    set(m, 'frac.div', { dueAt: '2026-10-02', passes: 1, fails: 3 }); // 6학년 · 쉼
    set(m, 'frac.mulnat', { dueAt: '2026-10-01', passes: 7, fails: 50 }); // 5학년 · 실패가 많다 · 가장 오래
    set(m, 'dec.mulnat', { dueAt: '2026-10-03', passes: 1, fails: 0 }); // 5학년 · 통과가 많다
    set(m, 'big.compare', { dueAt: '2026-10-12' }); // 4학년 · 가장 늦게 밀림
    return m;
  };
  const off = dailyPlan(due(OFF), TODAY, 'fraction', 1);
  assert.deepEqual([off.roundId, off.roundMode], ['frac.mulnat', 'review'], '끄면 예전 그대로');
  assert.equal(off.roundId, oldestDue(due(OFF), TODAY, 'fraction').id);
  const on = dailyPlan(due(ON), TODAY, 'fraction', 1);
  assert.deepEqual([on.roundId, on.roundMode, on.roundStem, on.late], ['big.compare', 'review', 'bignum', 8], '4학년 칸 먼저');
  const m2 = set(due(ON), 'big.compare', { dueAt: '2026-11-30' });
  assert.equal(dailyPlan(m2, TODAY, 'fraction', 1).roundId, 'dec.mulnat', '그다음 통과가 실패보다 많은 칸 — 더 오래 밀린 약한 칸보다 먼저');
  const m3 = set(set(due(ON), 'big.compare', { dueAt: '2026-11-30' }), 'dec.mulnat', { dueAt: '2026-11-30' });
  assert.equal(dailyPlan(m3, TODAY, 'fraction', 1).roundId, 'frac.mulnat', '그다음 나머지');
  assert.equal(schoolDue(m3, TODAY, 'fraction').tier, 2);
  // 켠 뒤에 새로 배운 6학년 칸이 오늘 차례여도 ☀️에는 안 낸다(사다리에서만)
  const m4 = set(set(set(due(ON), 'big.compare', { dueAt: '2026-11-30' }), 'dec.mulnat', { dueAt: '2026-11-30' }), 'frac.mulnat', { dueAt: '2026-11-30' });
  set(m4, 'frac.divnat', { dueAt: TODAY, schedAt: T_NEW });
  assert.equal(ladderOf(m4, TODAY, 'fraction').find((x) => x.id === 'frac.divnat').due, true, '사다리에서는 오늘 확인');
  const p4 = dailyPlan(m4, TODAY, 'fraction', 1);
  assert.notEqual(p4.roundMode, 'review', '☀️ 복습으로는 안 낸다');
});

test('☀️ dailyPlan — 켜져 있고 복습이 없으면 새로 배우기는 낮은 학년의 ▶ 먼저(지금 줄기 · 진단한 줄기) · 6학년·중1 ▶는 안 냄 · 섞어 풀기·🤔 노트도 6학년·중1을 뺀다', () => {
  const learn = dailyPlan(planBase(ON), TODAY, 'decimal', 2);
  assert.deepEqual([learn.roundMode, learn.roundId, learn.roundStem], ['learn', 'big.apply', 'bignum'], '지금 줄기(소수)의 ▶는 6학년 — 진단한 큰 수 줄기의 4학년 ▶');
  assert.deepEqual(schoolNow(planBase(ON), TODAY, 'decimal'), { id: 'big.apply', stem: 'bignum' });
  const offLearn = dailyPlan(planBase(OFF), TODAY, 'decimal', 2);
  assert.deepEqual([offLearn.roundMode, offLearn.roundId], ['learn', 'dec.divnat'], '끄면 예전처럼 지금 줄기의 ▶');
  // 진단 안 한 줄기의 ▶는 고르지 않는다
  const np = planBase(ON);
  np.placed = { fraction: 1, decimal: 1 };
  assert.equal(dailyPlan(np, TODAY, 'decimal', 2).roundId, null, '6학년 ▶뿐이고 큰 수는 진단 전');
  // 섞어 풀기 · 🤔 노트 — 분수 줄기 복습(5학년)이 나오는 날, 오래 안 본 6학년 칸·6학년 노트는 빠진다
  const mix = (rest) => {
    const m = planBase(rest);
    m.concepts['frac.mulnat'] = { ...m.concepts['frac.mulnat'], dueAt: '2026-10-05' };
    m.concepts['frac.divnat'] = { ...m.concepts['frac.divnat'], lastAt: 1 };
    m.concepts['frac.div'] = { ...m.concepts['frac.div'], lastAt: 2, notes: [{ key: 'n1', k: 'calc', d: '2026-10-10', t: 3 }] };
    return dailyPlan(m, TODAY, 'fraction', 3);
  };
  const off = mix(OFF);
  assert.ok(off.mix.some((x) => x.id === 'frac.divnat') && off.mix.some((x) => x.id === 'frac.div' && x.note), '끄면 예전처럼 들어간다');
  const on = mix(ON);
  assert.equal(on.roundId, 'frac.mulnat');
  assert.ok(on.mix.length > 0 && on.mix.every((x) => gradeOf(x.id) < REST_GRADE), JSON.stringify(on.mix.map((x) => x.id)));
  // 끈 채 세운 계획 뒤에 📊에서 켰다 — 섞어 풀기가 문항을 만들 때 거르면(startMixRound의 dailyOk) 6학년·중1만 빠지고 나머지는 남는다 (Codex 107차 #3)
  const later = off.mix.filter((x) => dailyOk(mk({}, ON), x.id));
  assert.ok(later.length > 0 && later.length < off.mix.length && later.every((x) => gradeOf(x.id) < REST_GRADE), JSON.stringify(off.mix.map((x) => x.id)));
});

test('☀️ 넓게: 무작위 기록 수백 개 — 켜져 있으면 ☀️의 칸·섞어 풀기는 늘 6학년 아래 · 낼 복습이 있으면 늘 복습 · 무리가 가장 앞 · 같은 무리에선 가장 오래 · 새로 배우기는 가장 낮은 학년 · 쉬는 칸은 사다리에서 늘 복습 차례가 아님 · 끄면 oldestDue 그대로', () => {
  let seed = 301;
  const rnd = (k) => { seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return Math.floor((((t ^ (t >>> 14)) >>> 0) / 4294967296) * k); };
  const all = Object.values(STEMS).flatMap((s) => s.list.map((c) => c.id));
  const day = (d) => `2026-10-${String(d).padStart(2, '0')}`;
  let reviews = 0; let learns = 0; let rests = 0;
  for (let i = 0; i < 400; i++) {
    const concepts = {};
    for (const id of all) {
      if (rnd(10) < 4) continue;
      // 셋에 하나는 복습이 모두 앞날 — 새로 배우기 길도 넓게
      concepts[id] = { done: rnd(10) < 8, box: rnd(5), dueAt: day(i % 3 === 0 ? 21 + rnd(10) : 1 + rnd(30)), passes: rnd(8), fails: rnd(8), lastAt: 1 + rnd(1000), schedAt: rnd(2) ? T_OLD : T_NEW };
    }
    const placed = Object.fromEntries(STEM_ORDER.filter(() => rnd(3) === 0).map((k) => [k, 1]));
    const prefer = STEM_ORDER[rnd(STEM_ORDER.length)];
    const on = mk(concepts, ON, placed);
    const p = dailyPlan(on, TODAY, prefer, i);
    assert.ok(!p.roundId || gradeOf(p.roundId) < REST_GRADE, `칸 ${p.roundId}`);
    assert.ok(p.mix.every((x) => gradeOf(x.id) < REST_GRADE), '섞어 풀기');
    // 낼 수 있는 복습 (사다리 due · 6학년 아래)
    const cand = [];
    for (const key of STEM_ORDER) for (const r of ladderOf(on, TODAY, key)) {
      if (r.rest) { rests++; assert.equal(r.due, false, '쉬는 칸은 복습 차례가 아니다'); }
      if (r.due && gradeOf(r.id) < REST_GRADE) {
        const c = concepts[r.id];
        cand.push({ id: r.id, tier: gradeOf(r.id) <= SCHOOL_GRADE ? 0 : c.passes > c.fails ? 1 : 2, dueAt: c.dueAt });
      }
    }
    if (cand.length) {
      reviews++;
      assert.equal(p.roundMode, 'review');
      const got = cand.find((x) => x.id === p.roundId);
      assert.ok(got, '사다리 복습 차례 칸');
      const minTier = Math.min(...cand.map((x) => x.tier));
      assert.equal(got.tier, minTier, '무리가 가장 앞');
      assert.equal(got.dueAt, cand.filter((x) => x.tier === minTier).map((x) => x.dueAt).sort()[0], '같은 무리에선 가장 오래');
    } else if (p.roundMode === 'learn') {
      learns++;
      const nows = [prefer, ...STEM_ORDER.filter((k) => k !== prefer && placed[k])].map((k) => ladderOf(on, TODAY, k).find((x) => x.state === 'now')).filter((x) => x && gradeOf(x.id) < REST_GRADE);
      assert.equal(gradeOf(p.roundId), Math.min(...nows.map((x) => gradeOf(x.id))), '가장 낮은 학년');
    }
    // 끄면 예전 그대로
    const off = mk(concepts, OFF, placed);
    const po = dailyPlan(off, TODAY, prefer, i);
    const od = oldestDue(off, TODAY, prefer);
    if (od) assert.equal(po.roundId, od.id);
  }
  assert.ok(reviews > 100 && rests > 100 && learns > 30, `복습 ${reviews} · 쉬는 칸 ${rests} · 새로 배우기 ${learns}`);
});

test('🌱 병합 (db.mergeMath): 늦게 바꾼 쪽 — 두 차례 모두 · 같은 시각이면 켜진 쪽 · 깨진 쪽은 없는 것으로 · 둘 다 없으면 없음 · cloneMath는 새 객체', () => {
  const a = { ...emptyMath(), rest: { on: true, at: 100 } };
  const b = { ...emptyMath(), rest: { on: false, at: 200 } };
  assert.deepEqual([mergeMath(a, b).rest, mergeMath(b, a).rest], [{ on: false, at: 200 }, { on: false, at: 200 }]);
  const c = { ...emptyMath(), rest: { on: false, at: 100 } };
  assert.deepEqual([mergeMath(a, c).rest, mergeMath(c, a).rest], [{ on: true, at: 100 }, { on: true, at: 100 }], '같은 시각이면 켜진 쪽');
  for (const bad of [{ on: 'x', at: 300 }, { on: true }, 7, null]) {
    const d = { ...emptyMath(), rest: bad };
    assert.deepEqual([mergeMath(a, d).rest, mergeMath(d, a).rest], [{ on: true, at: 100 }, { on: true, at: 100 }], JSON.stringify(bad));
  }
  assert.ok(!('rest' in mergeMath(emptyMath(), emptyMath())));
  assert.ok(!('rest' in mergeMath({ ...emptyMath(), rest: 'junk' }, emptyMath())), '깨진 것만 있으면 지운다');
  const cl = cloneMath(a);
  cl.rest.on = false;
  assert.equal(a.rest.on, true, '복사본을 고쳐도 원본은 그대로');
});

test('🌱 📊·📤 한 줄 (restLine): 아직 안 켬 · 꺼짐 · 켜짐(쉬는 칸 수) · 수학 요약 글에 들어간다', () => {
  assert.match(restLine(mk({})), /^🌱 학교 진도 먼저 — 아직 안 켬/);
  assert.match(restLine(mk({}, OFF)), /^🌱 학교 진도 먼저 꺼짐 — ☀️는 줄기와 상관없이 가장 오래 밀린 복습부터/);
  const m = mk({ 'frac.div': rec(), 'frac.divnat': rec({ schedAt: T_NEW }), 'rat.value': rec(), 'frac.mul': rec() }, ON);
  assert.equal(restLine(m), '🌱 학교 진도 먼저 켜짐 — ☀️는 4학년 칸 복습 → 통과가 실패보다 많은 칸 · 6학년·중1 칸은 ☀️에 안 냄 · 켤 때 이미 배운 6학년·중1 칸 2개는 복습 쉼(사다리에서 열면 연습)');
  assert.ok(mathReportText(m, TODAY).split('\n').includes(restLine(m)));
});

test('★ 🌱 저장 (가짜 IndexedDB): 수학을 처음 열 때 한 번 켜고 · 📊 단추가 저장된 값을 뒤집는다(바꾼 시각은 앞으로) · 다시 열어도 다시 켜지 않는다', async () => {
  const s1 = await updateMath((m) => { restInit(m, T_REST); });
  assert.deepEqual(s1.rest, { on: true, at: T_REST });
  const s2 = await updateMath((m) => { setRest(m, !restOf(m).on, T_NEW); });
  assert.deepEqual(s2.rest, { on: false, at: T_NEW });
  const s3 = await updateMath((m) => { restInit(m, T_NEW + 5); });
  assert.deepEqual(s3.rest, { on: false, at: T_NEW }, '꺼 둔 것을 다시 켜지 않는다');
  assert.deepEqual((await getMath()).rest, { on: false, at: T_NEW });
});

test('🌱 화면 배선: 수학을 열 때 ensureRest(설정이 없을 때만 한 번) · 쉬는 칸 표시를 확인 편·연습 안내에 · 📊 단추·쉼 표시 · sw v301', () => {
  const src = read('js/math.js');
  const body = (head) => { const i = src.indexOf(head); assert.ok(i >= 0, head); return src.slice(i, src.indexOf('\n}\n', i)); };
  assert.ok(src.includes('isResting, restOf, restInit, dailyOk, // 🌱'));
  const rm = body('export async function renderMath() {');
  assert.ok(rm.indexOf('state = await settleLive(state);') < rm.indexOf('state = await ensureRest(state);') && rm.indexOf('state = await ensureRest(state);') < rm.indexOf('renderLadder(state);'), '사다리·☀️를 그리기 전에');
  // ☀️ 개념 편 뒤 📊에서 켜고 돌아오면 — 최신 기록을 읽고 섞어 풀기가 6학년·중1을 거른다 (Codex 107차 #3)
  const ri = rm.indexOf("if (ui.daily && ui.daily.step === 'round' && ui.daily.roundInfo && ui.daily.plan.mix.length) {");
  assert.ok(ri >= 0);
  const resume = rm.slice(ri, rm.indexOf('startMixRound();', ri));
  const guard = "if (run !== ui.run || !ui.daily || ui.daily.step !== 'round' || ui.round) return;";
  assert.ok(resume.includes('const fresh = await getMath().catch(() => null);') && resume.includes(guard) && resume.indexOf(guard) < resume.indexOf('if (fresh) ui.state = fresh;'), resume);
  assert.ok(body('function startMixRound() {').includes('d.plan.mix.forEach((x, i) => {\n    if (!dailyOk(ui.state, x.id)) return;'));
  // 결과 카드 — 쉬는 칸을 다 맞혀도 오지 않는 확인 날을 약속하지 않는다 (Codex 107차 #1)
  assert.ok(src.includes("result.practice ? (result.rest ? '🌱 잠깐 쉬는 칸이라 연습했어요 — 칸은 그대로예요.' : '연습이라 👑 확인은 안 올라가요 — 다음 확인 날에 다시 물어볼게요.')"));
  const er = body('async function ensureRest(state) {');
  assert.ok(er.includes('if (restOf(state).at > 0) return state;') && er.includes('updateMath((m) => { restInit(m, Date.now()); })') && er.includes('catch { return state; }'));
  assert.ok(body('function startRound(').includes('reviewKeep(ui.state && ui.state.concepts && ui.state.concepts[id], day, isResting(ui.state, id))'));
  assert.ok(src.includes('r.rep ? r.rep.pay : 1, isResting(ui.state, r.id));'));
  const st = read('js/stats.js');
  assert.ok(st.includes("restBox.appendChild(el('p', 'stats-sub', restLine(math)));"));
  assert.ok(st.includes('updateMath((m) => { setRest(m, !restOf(m).on, Date.now()); })'), '저장된 값을 뒤집는다');
  assert.ok(st.includes("else if (r.rest) chip.appendChild(el('span', 'n', ' 🌱 쉼'));"));
  assert.ok(Number((/const CACHE_VERSION = 'v(\d+)';/.exec(read('sw.js')) || [])[1]) >= 301);
});
