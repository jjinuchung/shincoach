// 💪 v279 고친 실수 하나까지 통과 (2026-10-17 아버님 "그래 니 제안대로 하고 진행하자") 테스트: node --test tests/mathslip279.test.js
// 왜: 개념 편은 "4문항 다 맞혀야 통과"라 첫 오답 뒤엔 그 편에 받을 것이 없었다 — 틀리면 바로 그만두고 새 편을 뽑는 쪽이 이득.
// 기본안 다섯: ① 처음 배우기·연습 — 하나 틀려도 그 쌍둥이를 맞히고 끝까지 풀면 통과(🎯·🔷·통과 보너스 그대로) · 쌍둥이 없는 문제(③⭐)를 틀리면 못 통과
//   ② 확인 차례 — v262 💪 칸 지키기 그대로 + ☀️ 안이면 🎯 1 (🔷은 다 맞힌 확인에서만) ③ 처음 틀린 직후 💪 말 ④ 첫 문제 위 한 줄 ⑤ 일지 sl
//   하지 않을 것: 그만두면 벌 · 틀린 뒤 할 일(풀이·이유·쌍둥이) 줄이기
import { fakeIdb } from './fakeidb.js'; // ★ db.js보다 먼저
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { applyRound, keptReview, keepLine, slipLine, roundReward, stoneReward, roundCatches, luckyCatch, conceptReport, mathReportText, STEMS } from '../js/mathprog.js';
import { emptyMath } from '../js/db.js';

void fakeIdb;
const T = '2026-10-17';
const T1 = '2026-10-18';
const [ID] = STEMS.fraction.list.map((c) => c.id);
const read = (f) => fs.readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');
const ok = (key, k = 'calc') => ({ k, ok: 1, key });
const no = (key, o = {}) => ({ k: 'calc', ok: 0, key, tag: '분모끼리 더함', ...o });
const dueRec = (o = {}) => ({ done: true, box: 2, dueAt: '2026-10-16', passes: 3, fails: 0, lastAt: 1, schedAt: 1, ...o });
const withRec = (rec) => { const m = emptyMath(); if (rec) m.concepts[ID] = rec; return m; };
const run = (m, qs, mode = 'learn') => applyRound(m, ID, { correct: qs.filter((q) => q && q.ok).length, total: qs.length, missTags: [], qs, mode }, T);
const SLIP = [ok('A'), no('B', { fx: 1 }), ok('C', 'why'), ok('D', 'special')]; // 1번 계산은 맞고 2번(②)을 틀린 뒤 쌍둥이를 맞힘

test('① 처음 배우기: 하나 틀려도 쌍둥이를 맞히면 통과 — 배움(done)·첫 통과·🎯·🔷·통과 보너스 · 일지 sl', () => {
  const m = withRec(null);
  const r = run(m, SLIP);
  assert.deepEqual([r.passed, r.first, r.slip, r.kept, r.practice, r.review], [true, true, true, false, false, false]);
  assert.equal(m.concepts[ID].done, true);
  assert.equal(m.concepts[ID].passes, 1);
  assert.equal(m.log.at(-1).sl, 1, '일지에 고쳐서 통과');
  assert.equal(m.log.at(-1).mode, 'learn');
  const rw = roundReward(r, 3);
  assert.equal(rw.catchOnce, true, '첫 통과 🎯');
  assert.ok(rw.coin >= 12 && rw.xp >= 40, '통과 보너스');
  assert.equal(stoneReward({ mode: 'learn', result: r }), 1, '🔷');
  assert.equal(roundCatches({ mode: 'learn', result: r, inDaily: true, dailyFirst: false }), 1);
  // 다 맞힌 편은 sl 없음
  const a = withRec(null);
  const ra = run(a, [ok('A'), ok('B'), ok('C', 'why'), ok('D', 'special')]);
  assert.deepEqual([ra.passed, ra.slip], [true, false]);
  assert.equal('sl' in a.log.at(-1), false);
});

test('① 못 통과는 그대로: 쌍둥이도 틀림 · 쌍둥이가 없던 문제(③⭐) · 둘 틀림 · 셈과 기록이 어긋남', () => {
  const cases = [
    ['쌍둥이도 틀림', [ok('A'), no('B', { fx: 0 }), ok('C'), ok('D')]],
    ['쌍둥이 없는 ③ 틀림', [ok('A'), ok('B'), { k: 'why', ok: 0, key: 'C' }, ok('D')]],
    ['⭐ 틀림', [ok('A'), ok('B'), ok('C'), { k: 'special', ok: 0, key: 'D' }]],
    ['둘 틀림(하나는 고침)', [no('A', { fx: 1 }), no('B', { fx: 0 }), ok('C'), ok('D')]],
    ['둘 다 고쳐도 둘 틀림', [no('A', { fx: 1 }), no('B', { fx: 1 }), ok('C'), ok('D')]],
  ];
  for (const [name, qs] of cases) {
    const m = withRec(null);
    const r = run(m, qs);
    assert.deepEqual([r.passed, r.slip, !!(m.concepts[ID] && m.concepts[ID].done)], [false, false, false], name);
    assert.equal('sl' in m.log.at(-1), false, name);
  }
  // 정답 수는 3인데 문항 기록에 고친 표시가 없다 — 기록이 없으면 통과로 치지 않는다
  const m = withRec(null);
  const r = applyRound(m, ID, { correct: 3, total: 4, missTags: [], qs: [], mode: 'learn' }, T);
  assert.equal(r.passed, false);
});

test('① 연습(차례가 아닌 아는 칸): 고친 실수 하나 = 통과 — 일정은 그대로 · 🍀 자격도 통과로', () => {
  const m = withRec(dueRec({ dueAt: T1 }));
  const before = { ...m.concepts[ID] };
  const r = run(m, SLIP, 'practice');
  assert.deepEqual([r.passed, r.practice, r.slip, r.kept], [true, true, true, false]);
  assert.deepEqual([m.concepts[ID].box, m.concepts[ID].dueAt, m.concepts[ID].schedAt], [before.box, before.dueAt, before.schedAt], '연습은 일정을 안 건드린다');
  assert.equal(stoneReward({ mode: 'practice', result: r }), 0, '연습은 🔷 없음(예전 그대로)');
  const luck = { ...m };
  assert.equal(luckyCatch(luck, { mode: 'practice', result: r, inDaily: false, roll: true, today: T }), 1, '🍀 통과한 연습');
});

test('② 확인 차례: v262 칸 지키기 그대로(통과 아님 · 실패 +1 · 내일 다시 · 🔷 없음) + ☀️ 안이면 🎯 1', () => {
  const m = withRec(dueRec());
  const r = run(m, SLIP, 'review');
  assert.deepEqual([r.passed, r.kept, r.slip, r.review], [false, true, false, true]);
  assert.deepEqual([m.concepts[ID].box, m.concepts[ID].dueAt, m.concepts[ID].fails], [2, T1, 1]);
  assert.equal(m.log.at(-1).kp, 1);
  assert.equal('sl' in m.log.at(-1), false, '확인 편은 sl이 아니라 kp');
  assert.equal(stoneReward({ mode: 'review', result: r }), 0);
  assert.equal(roundCatches({ mode: 'review', result: r, inDaily: true, dailyFirst: false }), 1, '☀️ 안이면 🎯');
  assert.equal(roundCatches({ mode: 'review', result: r, inDaily: false, dailyFirst: false }), 0, '☀️ 밖은 없음');
  assert.equal(roundCatches({ mode: 'review', result: { ...r, kept: false }, inDaily: true, dailyFirst: false }), 0, '못 지킨 확인 편은 그대로 없음');
  // 다 맞힌 확인 편은 예전 그대로 통과
  const a = withRec(dueRec());
  const ra = run(a, [ok('A'), ok('B'), ok('C'), ok('D')], 'review');
  assert.deepEqual([ra.passed, ra.kept, ra.slip], [true, false, false]);
});

test('🎲 무작위 3,000편: 통과 = 다 맞힘 또는 (확인 차례가 아니고 · 틀린 것이 하나 · 그 쌍둥이를 맞힘) — 손으로 적은 규칙과 같다', () => {
  let seed = 279;
  const rnd = () => { seed = (seed * 1103515245 + 12345) >>> 0; return seed / 2 ** 32; };
  const kinds = ['calc', 'misread', 'why', 'special'];
  for (let n = 0; n < 3000; n += 1) {
    const qs = kinds.map((k, i) => {
      const okk = rnd() < 0.7;
      const q = { k, ok: okk ? 1 : 0, key: `K${i}` };
      if (!okk && (k === 'calc' || k === 'misread') && rnd() < 0.7) q.fx = rnd() < 0.6 ? 1 : 0;
      return q;
    });
    const kind = ['new', 'due', 'practice'][Math.floor(rnd() * 3)];
    const m = withRec(kind === 'new' ? null : kind === 'due' ? dueRec() : dueRec({ dueAt: T1 }));
    const r = run(m, qs, kind === 'new' ? 'learn' : kind === 'due' ? 'review' : 'practice');
    const wrong = qs.filter((q) => !q.ok);
    const expectPass = wrong.length === 0 || (kind !== 'due' && wrong.length === 1 && wrong[0].fx === 1);
    assert.equal(r.passed, expectPass, JSON.stringify({ kind, qs }));
    assert.equal(r.slip, expectPass && wrong.length === 1);
    assert.equal(r.kept, kind === 'due' && wrong.length === 1 && wrong[0].fx === 1);
    if (kind === 'new') assert.equal(!!(m.concepts[ID] && m.concepts[ID].done), expectPass);
  }
});

test('💬 아이에게 보이는 말 — 셈(숫자) 없이 · 결과 보기 전엔 "통과했어요"라고 못 박지 않음 · 확인 차례는 칸 그림', () => {
  for (const s of ['start', 'wrong', 'fixed', 'passed']) assert.ok(slipLine(s) && !/\d/.test(slipLine(s)), s);
  assert.ok(!/\d/.test(slipLine('fixed', 2)));
  assert.equal(slipLine('nope'), null);
  assert.ok(!slipLine('wrong').includes('통과했어요') && !slipLine('fixed', 1).includes('통과했어요'), '아직 ←로 나가면 그만둠');
  assert.ok(slipLine('passed').includes('통과했어요'));
  assert.equal(keepLine('🐥', 'start'), '💪 한 문제 틀려도 비슷한 문제를 맞히면 🐥 그대로예요');
  assert.equal(keepLine(null, 'start'), null);
  assert.ok(keptReview(SLIP));
});

test('📊 아빠 보고: 고쳐서 통과한 편은 통과로 세고 따로 표시 — 정답 수는 그대로 · "1통과/0실패 · ✘3/4" 같은 모순 없음 (Codex 87차 P2)', () => {
  const m = withRec(null);
  run(m, SLIP);
  const [row] = conceptReport(m, 8);
  assert.deepEqual([row.passes, row.fails], [1, 0]);
  assert.deepEqual([row.trail[0].pass, row.trail[0].slip, row.trail[0].ok, row.trail[0].n], [true, 1, 3, 4]);
  const txt = mathReportText(m, T);
  const line = txt.split('\n').find((l) => l.includes(row.name));
  assert.ok(line.includes('1통과/0실패 · ✔💪3/4'), line);
  assert.ok(!line.includes('✘3/4'));
  // 다 맞힌 편 · 못 통과 · 그만둠은 예전 그대로
  const a = withRec(null);
  run(a, [ok('A'), ok('B'), ok('C', 'why'), ok('D', 'special')]);
  assert.equal(conceptReport(a, 8)[0].trail[0].slip, undefined);
  assert.ok(mathReportText(a, T).includes('1통과/0실패 · ✔'));
  const f = withRec(null);
  run(f, [ok('A'), no('B', { fx: 0 }), ok('C', 'why'), ok('D', 'special')]);
  assert.deepEqual([conceptReport(f, 8)[0].trail[0].pass, conceptReport(f, 8)[0].trail[0].slip], [false, undefined]);
  // 일지에 sl이 있어도 그만둔 편은 통과가 아니다
  const q = withRec(null);
  q.log = [{ d: T, t: 1, id: ID, mode: 'quit', ok: 3, n: 4, of: 4, sl: 1, qs: [] }];
  q.concepts[ID] = { done: false, box: 0, passes: 0, fails: 0, lastAt: 1 };
  assert.equal(conceptReport(q, 8)[0].trail[0].pass, false);
  // 📊 점·설명
  const st = read('js/stats.js');
  assert.ok(st.includes("t.pass ? `dot ok${t.slip ? ' slip' : ''}`") && st.includes("t.pass ? (t.slip ? '💪' : '✔')"), '초록 점에 💪');
  assert.ok(st.includes("if (report.some((r) => r.trail.some((t) => t.slip))) cM.appendChild(el('p', 'stats-note', '💪 초록 💪 점은"));
});

test('☀️ 완주 카드·같은 날 다시 푼 편의 말 — 고쳐서 통과면 "다 맞았어요"·"다 맞혀"라고 하지 않는다 (Codex 87차 P2)', () => {
  const src = read('js/math.js');
  assert.ok(src.includes('d.roundInfo = { id: r.id, mode: r.mode, passed: result.passed, slip: !!result.slip, correct: r.correct, total: r.qs.length };'));
  assert.ok(src.includes("info.passed ? (info.slip ? '✅ 통과했어요 (💪 비슷한 문제로 고쳤어요)' : '✅ 다 맞았어요')"));
  assert.ok(src.includes("${result.slip ? '' : '다 맞혀 '}통과해서 ⚡💰를 다 받았어요"));
  assert.ok(!src.includes('번째 편이지만 다 맞혀 통과해서'), '옛 말이 남지 않게');
  // P3: "끝까지 풀면"이 아니라 "다른 문제도 끝까지 맞히면"
  assert.ok(slipLine('wrong').includes('다른 문제도 끝까지 맞히면'));
});

test('🔌 화면 배선: 첫 문제 위 한 줄 · 처음 틀린 직후 · 쌍둥이를 맞힌 직후 · 결과 카드 · 확인 차례는 keepLine 그대로', () => {
  const src = read('js/math.js');
  assert.ok(src.includes("const slipRound = (r) => isConceptRound(r) && !r.keep && !light(r);"));
  assert.match(src, /if \(r\.at === 0\) \{\s*const sl = r\.keep \? keepLine\(r\.keep, 'start'\) : slipRound\(r\) \? slipLine\('start'\) : null;\s*if \(sl\) card\.appendChild\(el\('p', 'math-practice-note math-slip-note', sl\)\);/, '첫 문제 위에 실제로 붙인다');
  assert.ok(src.includes("(r.keep ? keepLine(r.keep, 'wrong') : slipRound(r) ? slipLine('wrong') : null)"), '처음 틀린 직후');
  assert.ok(src.includes("(r.keep ? keepLine(r.keep, 'fixed', left) : slipRound(r) ? slipLine('fixed', left) : null)"), '쌍둥이를 맞힌 직후');
  assert.ok(src.includes("if (result.slip) card.appendChild(el('p', 'math-keep', slipLine('passed')));"), '결과 카드');
  assert.ok(src.includes("result.practice ? (result.slip ? '✅ 통과했어요!' : '✅ 다 맞았어요!')"), '연습 통과 제목이 "다 맞았어요"가 아니게');
  const css = read('css/style.css');
  assert.ok(css.includes('.math-practice-note.math-slip-note {'), '첫 문제 위 줄 모양(초록 — 💪 말과 같은 빛)');
  assert.ok(Number((/const CACHE_VERSION = 'v(\d+)';/.exec(read('sw.js')) || [])[1]) >= 279);
});
