// 🔁 틀린 배운 수학 칸 다시 풀기 · 🎚️ 과목 단계 (v387 — 낚시터 문제 손보기 기본안 「추천대로」) — node --test tests/redo387.test.js
// 다시 풀기: 틀린 배운 칸은 다음 물고기의 첫 수학 차례에 한 번(같은 단계 · 똑같은 문제 글은 피함) → 또 틀리면 다음 낚시 날 처음에 한 번 → 그래도 틀리면 멈춤(「거듭 틀린 칸」) ·
//   한 칸은 하루 한 번 · 물고기마다 하나 · 1단계(계산)도 틀린 보기에 풀이 한 줄
// 과목 단계: 그날 처음 열 때 과목마다 −2~+2 · 지금 단계로 30문제 넘게 쌓이면 90% 넘게 → +1 · 60% 아래 → −1 · 문제 단계 = 물고기 단계 + 과목 단계(1~3 안) ·
//   오른 과목은 열 때 한 줄 · 하루 기록 fishSteps · 📊·📤 줄 · 진짜 저장 경로 · 잇기(소스)
import { fakeIdb } from './fakeidb.js'; // ★ db.js보다 먼저
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  REDO_SAME, REDO_NEXT, REDO_NEXT_MAX, REDO_BADGE, REDO_BADGE_NEXT, REDO_OK, redoBadge, redoKey, redoRows, wrongIds, stuckIds, redoPlan, redoQueue,
  qFingerprint, waitKey, waitInfo,
  STEP_NEED, STEP_UP, STEP_DOWN, STEP_MAX, stepsOfDay, topsOfDay, subjectSteps, stepLevel, stepLines, stepUpLine, FISH_REDO_Q, lakeDayLine, fishMathKey,
} from '../js/fishing.js';
import { emptyDaily, mergeDailyDelta, applyDailyDelta, listDaily } from '../js/db.js';
import { startOf, redoMake, redoAsker } from '../js/lakeview.js';
import * as mp from '../js/mathprog.js';
import { mathHint } from '../js/lakelevel.js';

void fakeIdb;
const src = (f) => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
// 칸별 줄 · 다시 풀기 줄 (시각은 36진수 + 무작위 두 자리 — 앱과 같은 꼴)
const mk = (id, ok, ts) => `${id}|${ok}|${ts.toString(36)}00`;
const rk = (id, step, ok, ts) => `${id}|${step}|${ok}|${ts.toString(36)}00`;
const T0 = new Date(2026, 10, 9, 18, 0, 0).getTime();
const TODAY = '2026-11-10';
const d0 = (date, fishMathKeys) => ({ date, fishMathKeys });

test('🔁 줄 꼴 — redoKey는 칸|차례|맞음|시각 · 이상한 칸·차례는 빈 줄 · redoRows는 이상한 줄을 버림 · wrongIds는 처음 틀린 때 차례로 한 번씩(맞힌 줄은 안 셈)', () => {
  assert.equal(REDO_SAME, 1);
  assert.equal(REDO_NEXT, 2);
  const k = redoKey('frac.add', REDO_SAME, false, T0, () => 0.5);
  assert.match(k, /^frac\.add\|1\|0\|[0-9a-z]+$/);
  assert.equal(redoKey('frac.add', 3, true, T0), '', '차례는 1·2뿐');
  assert.equal(redoKey('bad id!', 1, true, T0), '');
  assert.equal(redoKey('', 2, true, T0), '');
  assert.deepEqual(redoRows([k, rk('ang.compare', 2, 1, 5), 'x|1|0', 'y|9|1|abc', 7, null]), [
    { id: 'frac.add', step: 1, ok: false }, { id: 'ang.compare', step: 2, ok: true },
  ]);
  assert.deepEqual(wrongIds([mk('b', 0, 300), mk('a', 0, 500), mk('b', 0, 100), mk('c', 1, 50), mk('d', 0, 400), 'x|0', 'bad']), ['b', 'd', 'a']);
  assert.deepEqual(wrongIds(null), []);
  // 앱이 쓰는 칸별 줄(fishMathKey)도 그대로 읽힘
  assert.deepEqual(wrongIds([fishMathKey('m:frac.add', false, T0, () => 0), fishMathKey('m:frac.add', true, T0 + 1, () => 0)]), ['frac.add']);
});

test('🔁 다시 풀기 계획 — 지난 낚시 날의 같은 날 다시 풀기 실패·다시 풀 틈 없이 끝난 칸 → 오늘 처음 · 다음 날 다시 풀기까지 틀린 칸은 멈춤 · 오늘 이미 다시 푼 칸은 안 냄 · 7일 넘으면 안 봄', () => {
  const prev = {
    date: '2026-11-09',
    fishMathKeys: [mk('a', 0, 100), mk('b', 0, 200), mk('c', 0, 300), mk('d', 1, 50), mk('e', 0, 400), mk('a', 0, 160)],
    fishRedoKeys: [rk('a', 1, 0, 150), rk('b', 1, 1, 250), rk('e', 2, 0, 450)],
  };
  const today = { date: TODAY, fishMathKeys: [mk('f', 0, 1000), mk('a', 0, 900), mk('g', 0, 800)], fishRedoKeys: [rk('g', 1, 1, 1100)] };
  const plan = redoPlan([prev, today, { date: '2026-11-01', fishMathKeys: [mk('old', 0, 1)] }], TODAY);
  assert.deepEqual(plan.next, ['a', 'c'], '같은 날 다시 풀기 실패(a) 먼저 → 다시 풀 틈 없이 끝난 칸(c) · 다시 풀어 맞힌 b·맞힌 d·다음 날까지 틀린 e는 아님');
  assert.deepEqual(plan.same, ['f'], '오늘 틀린 칸 가운데 이미 다시 푼 g·다음 날 몫 a는 뺌');
  assert.deepEqual(plan.done, ['g']);
  assert.deepEqual(stuckIds(prev), ['e'], '📊 「거듭 틀린 칸」');
  // 가장 가까운 「낚시 문제를 푼」 날 — 낚시를 안 한 날은 건너뜀
  const plan2 = redoPlan([{ date: '2026-11-09', appOpens: 3 }, { date: '2026-11-08', fishMathKeys: [mk('z', 0, 1)] }], TODAY);
  assert.deepEqual(plan2.next, ['z']);
  // 지난 낚시 날들에서 아직 안 푼 몫은 이어 감 — 옛날 것부터 (Codex 190차 #1)
  const plan5 = redoPlan([d0('2026-11-07', [mk('far', 0, 1)]), d0('2026-11-09', [mk('near', 0, 2)]), d0('2026-11-08', [mk('mid', 0, 3)])], TODAY);
  assert.deepEqual(plan5.next, ['far', 'mid', 'near']);
  // 8일 전은 안 봄 · 오늘 기록이 없어도 됨
  assert.deepEqual(redoPlan([{ date: '2026-11-02', fishMathKeys: [mk('z', 0, 1)] }], TODAY), { next: [], same: [], done: [], meta: {} });
  assert.deepEqual(redoPlan([{ date: '2026-11-03', fishMathKeys: [mk('z', 0, 1)] }], TODAY).next, ['z'], '7일 전까지는 봄');
  // 다음 날 몫 상한
  const many = Array.from({ length: 20 }, (_, i) => mk(`k${i}`, 0, 10 + i));
  const plan3 = redoPlan([{ date: '2026-11-09', fishMathKeys: many }], TODAY);
  assert.equal(plan3.next.length, REDO_NEXT_MAX);
  assert.deepEqual(plan3.next.slice(0, 3), ['k0', 'k1', 'k2'], '먼저 틀린 칸부터');
  // 다음 날 몫을 오늘 이미 다시 풀었으면(다른 창) 안 냄
  const plan4 = redoPlan([prev, { date: TODAY, fishRedoKeys: [rk('a', 2, 1, 2000)] }], TODAY);
  assert.deepEqual(plan4.next, ['c']);
  assert.deepEqual(redoPlan(null, TODAY), { next: [], same: [], done: [], meta: {} });
});

test('🔁 (Codex 190차) 하나만 풀고 닫아도 남은 다음 날 몫은 이어 감 · 다시 열거나 다음 날에도 처음 틀린 문제의 단계·지문 · 다음 날 몫 12는 하루에 (다시 열 때마다가 아님)', () => {
  // #1 — 8일 A·B 틀림 → 9일 A만 다음 날 다시 풀기(B 카드는 보다가 닫음) → 10일에도 B
  const d8 = { date: '2026-11-08', fishMathKeys: [mk('x.a', 0, 10), mk('x.b', 0, 20)], fishRedoWait: [waitKey('x.a', 3, 'k1', 10, () => 0), waitKey('x.b', 2, 'k2', 20, () => 0)] };
  const d9 = { date: '2026-11-09', fishMathKeys: [mk('x.a', 1, 30)], fishRedoKeys: [rk('x.a', 2, 1, 30)] };
  const p10 = redoPlan([d8, d9], TODAY);
  assert.deepEqual(p10.next, ['x.b']);
  assert.deepEqual(p10.meta['x.b'], { lv: 2, avoid: 'k2' }, '처음 틀린 문제의 단계·지문');
  // 10일에 B를 다음 날 다시 풀기로 풀면(틀려도) 11일엔 없음
  const d10 = { date: TODAY, fishMathKeys: [mk('x.b', 0, 40)], fishRedoKeys: [rk('x.b', 2, 0, 40)] };
  assert.deepEqual(redoPlan([d8, d9, d10], '2026-11-11').next, []);
  assert.deepEqual(stuckIds(d10), ['x.b']);
  // #2 — 같은 날 다시 열어도 단계·지문 그대로 · 적힌 줄이 없으면 1단계·피할 글 없음
  const today = { date: TODAY, fishMathKeys: [mk('x.c', 0, 50), mk('x.d', 0, 60)], fishRedoWait: [waitKey('x.c', 3, 'abc', 50, () => 0), waitKey('x.c', 1, 'zzz', 70, () => 0)] };
  const pt = redoPlan([today], TODAY);
  assert.deepEqual(pt.same, ['x.c', 'x.d']);
  assert.deepEqual(pt.meta, { 'x.c': { lv: 3, avoid: 'abc' }, 'x.d': { lv: 1, avoid: '' } }, '처음 틀린 줄의 것');
  const q = redoQueue(pt);
  assert.deepEqual(q.take(1), { id: 'x.c', step: REDO_SAME, lv: 3, avoid: 'abc' });
  assert.deepEqual(redoQueue(p10).take(1), { id: 'x.b', step: REDO_NEXT, lv: 2, avoid: 'k2' });
  // #3 — 14칸 빚 가운데 오늘 이미 12칸을 다음 날 몫으로 냈으면 다시 열어도 더 안 냄 · 2칸만 냈으면 10칸까지
  const many = { date: '2026-11-09', fishMathKeys: Array.from({ length: 14 }, (_, i) => mk(`k${i}`, 0, 10 + i)) };
  const done12 = { date: TODAY, fishRedoKeys: Array.from({ length: 12 }, (_, i) => rk(`k${i}`, 2, 1, 100 + i)) };
  assert.deepEqual(redoPlan([many, done12], TODAY).next, []);
  const done2 = { date: TODAY, fishRedoKeys: [rk('k0', 2, 1, 100), rk('k1', 2, 0, 101)] };
  const p2 = redoPlan([many, done2], TODAY);
  assert.equal(p2.next.length, 10);
  assert.equal(p2.next[0], 'k2');
});

test('🔁 줄 꼴(Codex 190차) — 틀린 칸 줄 칸|단계|지문|시각 · 읽기는 처음 틀린 것 · 지문은 짧고 같은 글이면 같음 · 다음 날 몫 카드 머리는 「지난번」', () => {
  assert.match(waitKey('frac.add', 2, 'ab12', T0, () => 0), /^frac\.add\|2\|ab12\|[0-9a-z]+$/);
  assert.equal(waitKey('bad id!', 2, 'ab', T0), '');
  assert.match(waitKey('frac.add', 9, 'AB!', T0, () => 0), /^frac\.add\|1\|\|/, '이상한 단계는 1 · 이상한 지문은 비움');
  const info = waitInfo([waitKey('x.a', 2, 'late', 900, () => 0), waitKey('x.a', 3, 'early', 100, () => 0), 'x.b|7|zz|abc', 'junk', null]);
  assert.deepEqual([...info.entries()], [['x.a', { lv: 3, avoid: 'early' }]]);
  const f1 = qFingerprint('8과 20의 공배수는?');
  assert.equal(f1, qFingerprint('8과 20의 공배수는?'));
  assert.notEqual(f1, qFingerprint('8과 12의 공배수는?'));
  assert.match(f1, /^[0-9a-z]{1,8}$/);
  assert.equal(qFingerprint(''), '');
  assert.equal(redoBadge(REDO_SAME), REDO_BADGE);
  assert.equal(redoBadge(REDO_NEXT), REDO_BADGE_NEXT);
  assert.equal(REDO_BADGE_NEXT, '🔁 지난번 그 문제, 다시 한 번!');
  assert.deepEqual(stepLines({ english: 1, math: -2, korean: 7, nonsul: 'x' }), ['math:-2', 'english:1', 'korean:0', 'nonsul:0']);
  assert.deepEqual(stepLines(null), ['math:0', 'english:0', 'korean:0', 'nonsul:0']);
});

test('🔁 창 하나 동안의 차례 — 물고기마다 하나 · 계획 몫은 첫 물고기부터 · 이번 물고기에서 틀린 칸은 다음 물고기부터(같은 단계·틀린 문제 글) · 한 칸은 하루 한 번', () => {
  const rq = redoQueue({ next: ['a'], same: ['f'], done: ['g'] });
  rq.at(1);
  assert.deepEqual(rq.take(), { id: 'a', step: REDO_NEXT, lv: 1, avoid: '' });
  assert.equal(rq.take(), null, '같은 물고기에선 하나만');
  assert.equal(rq.wrong('h', 2, '문제 글'), true);
  assert.equal(rq.wrong('h', 1), false, '같은 칸 두 번 안 넣음');
  assert.equal(rq.wrong('a'), false, '오늘 이미 낸 칸');
  assert.equal(rq.wrong('g'), false, '오늘 이미 다시 푼 칸(다른 창)');
  assert.equal(rq.wrong('bad id!'), false);
  assert.deepEqual(rq.take(2), { id: 'f', step: REDO_SAME, lv: 1, avoid: '' }, '앞 창에서 틀린 칸이 먼저');
  assert.deepEqual(rq.take(3), { id: 'h', step: REDO_SAME, lv: 2, avoid: '문제 글' });
  assert.equal(rq.take(4), null);
  const r2 = redoQueue({});
  r2.at(2);
  r2.wrong('x', 9);
  assert.equal(r2.take(), null, '틀린 그 물고기에서는 안 냄');
  assert.equal(r2.take(2), null);
  assert.deepEqual(r2.take(3), { id: 'x', step: REDO_SAME, lv: 1, avoid: '' }, '이상한 단계는 1');
  assert.deepEqual(r2.left(), []);
  const r3 = redoQueue(null);
  assert.equal(r3.take(1), null);
});

test('🔁 문제 내기에 끼우기 — 그 물고기의 첫 수학 차례에 같은 칸(redo 표시) · 다른 과목·둘째 수학 차례는 그대로 · 틀린 문제 글과 같으면 다음 씨앗 · 못 만들면 보통 문제', () => {
  const made = [];
  const good = (id, n) => ({ id: `m:${id}`, qk: `${id} 문제 ${n}`, lv: 1, choices: [{ text: '1', ok: true }, { text: '2', ok: false }] });
  const mathSrc = { make(id, seed, lv) { made.push({ id, seed, lv }); return { ...good(id, made.length), lv }; } };
  const base = (subj, seed, lv) => ({ id: `base:${subj}`, lv, choices: [{ text: 'o', ok: true }, { text: 'x', ok: false }] });
  const rq = redoQueue({ next: ['frac.add'] });
  const ask = redoAsker(base, mathSrc, rq);
  assert.equal(ask('english', 5, 1, { fish: 1 }).id, 'base:english');
  const q = ask('math', 5, 1, { fish: 1 });
  assert.equal(q.id, 'm:frac.add');
  assert.deepEqual(q.redo, { id: 'frac.add', step: REDO_NEXT });
  assert.equal(ask('math', 6, 2, { fish: 1 }).id, 'base:math', '한 물고기에 하나');
  assert.equal(ask('math', 7, 2, { fish: 2 }).id, 'base:math', '차례가 비면 보통 문제');
  // 틀린 칸은 같은 단계로 · 그 문제 글과 같으면 다음 씨앗
  made.length = 0;
  rq.wrong('ang.compare', 2, qFingerprint('ang.compare 문제 1')); // 앱은 틀린 문제 글의 지문을 넘긴다
  const q2 = ask('math', 9, 1, { fish: 3 });
  assert.equal(q2.qk, 'ang.compare 문제 2');
  assert.equal(made.length, 2);
  assert.ok(made.every((m) => m.lv === 2 && m.id === 'ang.compare'));
  assert.notEqual(made[0].seed, made[1].seed);
  // 못 만들면 보통 문제 · 그 칸은 버림(다음 물고기에 또 안 냄)
  const rq2 = redoQueue({ same: ['x.one'] });
  const ask2 = redoAsker(base, { make: () => null }, rq2);
  assert.equal(ask2('math', 1, 1, { fish: 1 }).id, 'base:math');
  assert.deepEqual(rq2.left(), []);
  // 원천이 없으면 그대로
  assert.equal(redoAsker(base, null, redoQueue({ next: ['a'] }))('math', 1, 1, { fish: 1 }).id, 'base:math');
  // 창을 연 뒤 자정이 지나면(alive 거짓) 다시 풀기 없이 보통 문제 · 차례는 그대로 남음 (Codex 190차 #5)
  const rq3 = redoQueue({ next: ['x.one'] });
  assert.equal(redoAsker(base, mathSrc, rq3, () => false)('math', 1, 1, { fish: 1 }).id, 'base:math');
  assert.deepEqual(rq3.left(), ['x.one']);
  assert.equal(redoMake(mathSrc, null, 1), null);
});

const d = (date, o = {}) => ({ date, ...o });
test('🎚️ 과목 단계 — 30문제 넘게 쌓였을 때만 · 90% 넘게 → +1 · 60% 아래 → −1 · 딱 90%·60%는 그대로 · 단계가 안 적힌 옛날은 0단계 · 오른 과목 · 적을 줄', () => {
  assert.equal(STEP_NEED, 30);
  assert.equal(STEP_UP, 0.9);
  assert.equal(STEP_DOWN, 0.6);
  assert.equal(STEP_MAX, 2);
  const days = [
    d('2026-11-09', { fishEnQ: 20, fishEnOk: 19, fishKorQ: 15, fishKorOk: 9, fishMathQ: 20, fishMathOk: 12, fishNsQ: 10, fishNsOk: 10 }),
    d('2026-11-08', { fishEnQ: 12, fishEnOk: 12, fishKorQ: 15, fishKorOk: 8, fishMathQ: 10, fishMathOk: 6, fishNsQ: 10, fishNsOk: 9 }),
  ];
  const r = subjectSteps(days, TODAY);
  assert.deepEqual(r.steps, { math: 0, english: 1, korean: -1, nonsul: 0 }, '영어 31/32 오름 · 국어 17/30 내림 · 수학 18/30(딱 60%) 그대로 · 논술 20문제뿐');
  assert.deepEqual(r.up, ['english']);
  assert.deepEqual(r.write, ['math:0', 'english:1', 'korean:-1', 'nonsul:0']);
  // 딱 90%는 그대로
  assert.equal(subjectSteps([d('2026-11-09', { fishEnQ: 30, fishEnOk: 27 })], TODAY).steps.english, 0);
  assert.equal(subjectSteps([d('2026-11-09', { fishEnQ: 30, fishEnOk: 28 })], TODAY).steps.english, 1);
  assert.equal(subjectSteps([d('2026-11-09', { fishEnQ: 29, fishEnOk: 29 })], TODAY).steps.english, 0, '30문제가 안 되면 그대로');
  // 8일 전은 안 봄 · 7일 전까지는 봄
  assert.equal(subjectSteps([d('2026-11-02', { fishEnQ: 40, fishEnOk: 40 })], TODAY).steps.english, 0);
  assert.equal(subjectSteps([d('2026-11-03', { fishEnQ: 40, fishEnOk: 40 })], TODAY).steps.english, 1);
  // 오늘 기록은 셈에 안 넣음(처음 열 때 정함)
  assert.equal(subjectSteps([d(TODAY, { fishEnQ: 40, fishEnOk: 40 })], TODAY).steps.english, 0);
  assert.deepEqual(subjectSteps([], TODAY).up, []);
});

test('🎚️ 과목 단계 — 오늘 적힌 단계는 그대로(다시 안 셈·안 적음) · 지난 단계에서 이어 셈 · 다른 단계 날에서 멈춤 · 낚시 안 한 날은 건너뜀 · 위아래 끝 · 맨 위에서도 쉬우면 top', () => {
  const stored = subjectSteps([d(TODAY, { fishSteps: ['english:1', 'math:0', 'korean:0', 'nonsul:-1'] }), d('2026-11-09', { fishEnQ: 40, fishEnOk: 40 })], TODAY);
  assert.deepEqual(stored.steps, { math: 0, english: 1, korean: 0, nonsul: -1 });
  assert.deepEqual(stored.write, []);
  assert.deepEqual(stored.up, []);
  // 지난 단계 1에서 이어 셈 — 다른 단계(0) 날에서 멈춤 → 20문제뿐이라 그대로 1
  const run = subjectSteps([d('2026-11-09', { fishSteps: ['english:1'], fishEnQ: 20, fishEnOk: 19 }), d('2026-11-08', { fishSteps: ['english:0'], fishEnQ: 40, fishEnOk: 40 })], TODAY);
  assert.equal(run.steps.english, 1);
  assert.deepEqual(run.up, []);
  // 낚시를 안 한 날은 건너뜀
  const skip = subjectSteps([d('2026-11-09', { appOpens: 4 }), d('2026-11-08', { fishSteps: ['english:1'], fishEnQ: 31, fishEnOk: 30 })], TODAY);
  assert.equal(skip.steps.english, 2);
  assert.deepEqual(skip.up, ['english']);
  // 단계가 안 적혔는데 낚시를 한 날(옛 판 창)은 0단계 날 — 1단계 이어 세기를 멈춤
  assert.equal(subjectSteps([d('2026-11-09', { fishEnQ: 40, fishEnOk: 40 }), d('2026-11-08', { fishSteps: ['english:1'] })], TODAY).steps.english, 1);
  // 맨 위에서도 쉬우면 그대로 2 + top · 맨 아래에서도 버거우면 그대로 −2
  const top = subjectSteps([d('2026-11-09', { fishSteps: ['english:2', 'math:-2'], fishEnQ: 40, fishEnOk: 40, fishMathQ: 40, fishMathOk: 10 })], TODAY);
  assert.equal(top.steps.english, 2);
  assert.equal(top.steps.math, -2);
  assert.ok(top.write.includes('top:english'));
  assert.ok(!top.write.some((w) => w === 'top:math'));
  assert.deepEqual(top.up, []);
  // 줄 읽기 — 이상한 줄은 버림 · 같은 과목 둘이면 앞의 것
  assert.deepEqual(stepsOfDay({ fishSteps: ['english:1', 'english:2', 'math:3', 'korean:-2', 'top:nonsul', 'x:1'] }), { english: 1, korean: -2 });
  assert.deepEqual(topsOfDay({ fishSteps: ['top:english', 'top:english', 'top:x', 'math:1'] }), ['english']);
});

test('🎚️ 문제 단계 = 물고기 단계 + 과목 단계(1~3 안) — 기본안 표 그대로 · 오른 과목 한 줄(셈 없음)', () => {
  // 행 = 과목 단계 +2 … −2 · 열 = 물기 전(1) · ★1·2(1) · ★3(2) · ★4·5(3)
  const table = { 2: [3, 3, 3, 3], 1: [2, 2, 3, 3], 0: [1, 1, 2, 3], '-1': [1, 1, 1, 2], '-2': [1, 1, 1, 1] };
  for (const [step, row] of Object.entries(table)) assert.deepEqual([1, 1, 2, 3].map((b) => stepLevel(b, Number(step))), row, `과목 단계 ${step}`);
  assert.equal(stepLevel(2, undefined), 2);
  assert.equal(stepLevel(9, 0), 1, '이상한 물고기 단계는 1');
  assert.equal(stepUpLine(['english']), '⬆️ 영어 실력이 늘었어요! 이제 한 단계 위 영어 문제가 나와요');
  assert.equal(stepUpLine(['english', 'korean']), '⬆️ 영어·국어 실력이 늘었어요! 이제 한 단계 위 문제가 나와요');
  assert.equal(stepUpLine([]), '');
  assert.equal(stepUpLine(['x']), '');
  assert.equal(stepUpLine(undefined), '');
  assert.doesNotMatch(stepUpLine(['math', 'nonsul']), /\d/, '셈·숫자 없음');
  assert.equal(REDO_BADGE, '🔁 아까 그 문제, 다시 한 번!');
  assert.equal(REDO_OK, '🔁 이번엔 맞혔어요!');
});

test('📊·📤 하루 줄 — 🔁 다시 풀기 맞힘/낸 · 거듭 틀린 칸 · 🎚️ 과목 단계(0이 아닌 것) · 맨 위 단계도 쉬움 · 없으면 옛 줄 그대로 · 다시 열 때 차례 자리에서 다시 풀기 수를 뺌', () => {
  const day = {
    fishSec: 600, fishCatch: 5, fishMathQ: 10, fishMathOk: 7, [FISH_REDO_Q[0]]: 3, [FISH_REDO_Q[1]]: 2,
    fishRedoKeys: [rk('x.one', 2, 0, 1), rk('x.two', 2, 1, 2), rk('x.three', 1, 0, 3), rk('x.one', 2, 0, 4)],
    fishSteps: ['english:2', 'math:-1', 'korean:0', 'nonsul:0', 'top:english'],
  };
  assert.equal(lakeDayLine(day), '🎣 낚시터 10분 · 물고기 5마리 · 맞힘/낸 문제 수학 7/10 · 🔁 다시 풀기 2/3 · 거듭 틀린 칸 x.one · 🎚️ 과목 단계 수학 −1 · 영어 +2 · ⬆️ 영어 맨 위 단계도 쉬움');
  assert.equal(lakeDayLine({ fishSec: 300, fishCatch: 4, fishSteps: ['math:0', 'english:0', 'korean:0', 'nonsul:0'] }), '🎣 낚시터 5분 · 물고기 4마리', '모두 0이면 단계 줄 없음');
  assert.equal(lakeDayLine({ fishSec: 300, fishCatch: 4, fishBoat: 3 }), '🎣 낚시터 5분 · 물고기 4마리(🚤 배 3)', 'v386 줄 그대로');
  assert.deepEqual(startOf({ fishMathQ: 20, fishFmQ: 5, fishRedoQ: 3, fishEnQ: 4 }), { math: 12, english: 4, korean: 0, nonsul: 0 });
  assert.deepEqual(startOf({ fishMathQ: 2, fishFmQ: 1, fishRedoQ: 5 }).math, 0);
});

test('💾 하루 칸 — fishRedoQ/Ok는 더하기(병합 큰 쪽) · fishRedoKeys·fishSteps는 합집합(같은 줄 한 번)', () => {
  const e = emptyDaily(TODAY);
  assert.equal(e.fishRedoQ, 0);
  assert.equal(e.fishRedoOk, 0);
  let m = mergeDailyDelta(e, TODAY, { fishRedoQ: 2, fishRedoOk: 1, fishRedoKeys: [rk('x.one', 1, 0, 1)], fishSteps: ['english:1', 'math:0'] });
  m = mergeDailyDelta(m, TODAY, { fishRedoQ: 1, fishRedoKeys: [rk('x.one', 1, 0, 1), rk('x.two', 1, 1, 2)], fishSteps: ['english:1', 'korean:0'] });
  assert.equal(m.fishRedoQ, 3);
  assert.equal(m.fishRedoOk, 1);
  assert.equal(m.fishRedoKeys.length, 2);
  assert.deepEqual(m.fishSteps, ['english:1', 'math:0', 'korean:0']);
});

test('★ 진짜 저장 경로 — 어제 틀린 칸·다시 풀기 줄을 적고 오늘 열면 다음 날 몫 · 오늘 단계를 두 번 적어도 한 번 · 오늘 적힌 단계는 다시 안 셈', async () => {
  const Y = '2026-11-09';
  // 칸별 줄·틀린 칸 줄(단계·지문)·다시 풀기 줄은 한 번에 (앱 onAnswer와 같은 꼴)
  await applyDailyDelta(Y, { fishMathQ: 32, fishMathOk: 31, fishEnQ: 31, fishEnOk: 30, fishMathKeys: [mk('x.one', 0, T0)], fishRedoWait: [waitKey('x.one', 2, 'f1', T0, () => 0)] });
  await applyDailyDelta(Y, { fishMathKeys: [mk('x.one', 0, T0 + 5)], fishRedoKeys: [rk('x.one', 1, 0, T0 + 5)], fishRedoQ: 1 });
  await applyDailyDelta(Y, { fishMathKeys: [mk('x.two', 0, T0 + 9)], fishRedoWait: [waitKey('x.two', 3, 'f2', T0 + 9, () => 0)] });
  let days = await listDaily();
  const py = redoPlan(days, TODAY);
  assert.deepEqual(py.next, ['x.one', 'x.two']);
  assert.deepEqual(py.meta, { 'x.one': { lv: 2, avoid: 'f1' }, 'x.two': { lv: 3, avoid: 'f2' } }, '저장된 틀린 칸 줄의 단계·지문');
  const s1 = subjectSteps(days, TODAY);
  assert.deepEqual(s1.up, ['math', 'english']);
  await applyDailyDelta(TODAY, { fishSteps: s1.write });
  await applyDailyDelta(TODAY, { fishSteps: s1.write }); // 두 창이 같이 처음 열어도
  days = await listDaily();
  const today = days.find((x) => x.date === TODAY);
  assert.deepEqual(today.fishSteps, ['math:1', 'english:1', 'korean:0', 'nonsul:0']);
  const s2 = subjectSteps(days, TODAY);
  assert.deepEqual(s2.steps, { math: 1, english: 1, korean: 0, nonsul: 0 });
  assert.deepEqual(s2.write, []);
  assert.deepEqual(s2.up, [], '오른 줄은 처음 연 때 한 번');
  // 오늘 다음 날 몫을 다시 풀면 계획에서 빠짐
  await applyDailyDelta(TODAY, { fishMathKeys: [mk('x.one', 1, T0 + 86400000)], fishRedoKeys: [rk('x.one', 2, 1, T0 + 86400000)] });
  assert.deepEqual(redoPlan(await listDaily(), TODAY).next, ['x.two']);
});

test('💡 1단계(계산)에도 풀이 한 줄 — 수학 모든 칸에서 틀린 보기 대부분에 그 실수의 한 줄이 있음(새 원고 없이) · 한 줄은 카드에 들어갈 길이', () => {
  const OPTS = { names: ['피카츄', '리자몽', '개굴닌자'], me: '진우', worlds: { pokemon: [], toystory: [], minions: [], moana: [] }, recent: [] };
  let wrong = 0;
  let hinted = 0;
  let longest = 0;
  const bare = [];
  for (const key of mp.STEM_ORDER) {
    const st = mp.STEMS[key];
    if (!st) continue;
    let content = {};
    try { content = JSON.parse(readFileSync(new URL(`../${st.file.replace(/^\.\//, '')}`, import.meta.url), 'utf8')); } catch { content = {}; }
    for (const c of st.list) {
      let h = 0;
      let w = 0;
      for (let s = 1; s <= 3; s++) {
        let q = null;
        try { q = st.gen.makeQuestion(c.id, 'calc', s, { ...OPTS, content }); } catch { q = null; }
        for (const ch of (q && q.choices) || []) {
          if (ch.ok) continue;
          w += 1;
          const t = mathHint(q, ch);
          if (t) { h += 1; longest = Math.max(longest, t.length); }
        }
      }
      wrong += w;
      hinted += h;
      if (w && !h) bare.push(c.id);
    }
  }
  assert.ok(wrong > 1000, `틀린 보기 ${wrong}`);
  assert.ok(hinted / wrong >= 0.95, `풀이 한 줄 ${hinted}/${wrong}`);
  assert.deepEqual(bare, [], '한 줄도 없는 칸');
  assert.ok(longest <= 140, `가장 긴 한 줄 ${longest}자`);
});

test('🔌 잇기 — 1단계 풀이 한 줄·문제 글(qk) · 물고기 번호·과목 단계를 넘김 · 다시 풀기 카드 머리·맞힘 한 줄 · 열 때 오른 과목 한 줄 → 들어서기 안내 · 칸별 줄과 다시 풀기 줄은 한 번에 · 판', () => {
  const m = src('js/math.js');
  assert.match(m, /const hint = \(c\) => mathHint\(q, c\);/);
  assert.match(m, /qk: String\(q\.q\)/);
  const v = src('js/fishview.js');
  assert.match(v, /h\.ask\(s, nextSeed\(\), stepLevel\(lv, ui\.steps\[s\], lvTop\(s\)\), \{ fish: ui\.castN, stage \}\)/); // v416 — 과목 맨 위 단계까지
  assert.match(v, /ui\.castN \+= 1;[^\n]*\n\s*const before = openSpots\(ui\.okToday\);\n\s*const ok = await ask\('cast'\);/, '던질 때마다 새 물고기 번호 — 던지기 문제보다 먼저');
  assert.match(v, /const badge = q\.redo \? redoBadge\(q\.redo\.step\) : q\.ud \? '' : lvBadge\(stage, ui\.fish\);/, '다음 날 몫은 「지난번」 (Codex 190차)');
  assert.match(v, /lvb\.classList\.toggle\('is-redo', !!q\.redo\);/);
  assert.match(v, /if \(ok && q\.redo\) toast\(REDO_OK, \d+\);/);
  assert.match(v, /const up = stepUpLine\(h\.stepUp\);[\s\S]{0,200}else if \(up\) \{\n\s*const me = ui;\n\s*toast\(up, \d+\);\n\s*setTimeout\(\(\) => \{ if \(ui === me && ui\.st === 'ready' && !ui\.dexOpen && !ui\.shopOpen && !ui\.sail && ui\.place === place\) enter\(\); \}, \d+\);\n\s*\} else enter\(\);/);
  assert.match(v, /steps: h\.steps && typeof h\.steps === 'object' \? h\.steps : \{\}/);
  const l = src('js/lakeview.js');
  assert.match(l, /const rq = redoQueue\(redoPlan\(days, today\)\);/);
  assert.match(l, /const stp = subjectSteps\(days, today\);[^\n]*\n\s*if \(stp\.write\.length\) applyDailyDelta\(today, \{ fishSteps: stp\.write \}\)/);
  assert.match(l, /steps: stp\.steps,/);
  assert.match(l, /stepUp: stp\.up,/);
  assert.match(l, /return redoAsker\(\(subj, seed, lv\) => base\(subj, seed, lvFor\(subj, lv, \{ listen: canListen\(\) \}\)\), srcs && srcs\.math, rq, alive\);/);
  assert.match(l, /if \(mk \|\| rk \|\| wk\) applyDailyDelta\(now, \{ \.\.\.\(mk \? \{ fishMathKeys: \[mk\] \} : \{\}\), \.\.\.\(rk \? \{ fishRedoKeys: \[rk\] \} : \{\}\), \.\.\.\(wk \? \{ fishRedoWait: \[wk\] \} : \{\}\) \}\)/, '세 줄은 한 번에');
  assert.match(l, /const cm = !ok && subj === 'math' && q && !q\.fm && !q\.redo \?/);
  assert.match(l, /const fp = cm \? qFingerprint\(q\.qk\) : '';\n\s*const wk = cm \? waitKey\(cm\[1\], q\.lv, fp, Date\.now\(\), Math\.random\) : '';/, '틀린 칸 줄에 단계·지문 (Codex 190차 #2)');
  assert.match(l, /if \(cm && alive\(\)\) rq\.wrong\(cm\[1\], q\.lv, fp\);/);
  assert.match(l, /\.\.\.lvDelta\(q, ok\), \.\.\.rd, \.\.\.padDelta\(subj, ok, a\) \}\);/);
  // Codex 190차 #5 — 자정이 지나면 다시 풀기를 멈추고 새 날에도 지금 단계를 적음
  assert.match(l, /const alive = \(\) => clockDay\(\) === today;/);
  assert.match(l, /if \(now !== stepDay\) \{ stepDay = now; applyDailyDelta\(now, \{ fishSteps: stepLines\(stp\.steps\) \}\)/);
  assert.match(l, /const redo = q && q\.redo && alive\(\) \? q\.redo : null;/);
  assert.match(l, /const rd = redo \?/);
  assert.match(l, /const rk = subj === 'math' && redo \? redoKey\(redo\.id, redo\.step, ok,/);
  assert.match(l, /if \(r\.avoid && qFingerprint\(q\.qk\) === r\.avoid\) continue;/);
  assert.match(src('js/db.js'), /'fishRedoKeys', 'fishSteps', 'fishRedoWait',/);
  assert.ok(src('js/upload.js').includes('영어 목소리가 없는 기기는 영어 3·4단계가 2단계로 나와요'), 'Codex 190차 #6 설명 한 줄 (v416 — 4단계도)');
  assert.match(src('css/style.css'), /\.lk-lvb\.is-redo \{/);
  const st = src('js/stats.js');
  assert.ok(st.includes('🎚️ 과목마다 지금 단계로 ${STEP_NEED}문제 넘게 쌓이면'));
  assert.ok(src('js/upload.js').includes('🔁 다시 풀기 맞힘/낸 = 틀린 배운 수학 칸을 다음 물고기의 첫 수학 차례에 한 번'));
  assert.match(src('sw.js'), /const CACHE_VERSION = 'v(38[7-9]|39\d|[4-9]\d\d)';/);
  assert.match(src('js/version.js'), /APP_VERSION = 'v(38[7-9]|39\d|[4-9]\d\d)'/);
});
