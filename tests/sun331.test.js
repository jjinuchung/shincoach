// v331 (2026-10-24 아버님 "이대로") — ☀️ 오늘의 수학 다시 시작
// 까닭: ☀️를 며칠 쉬면 다시 시작하기가 무겁다(개념 편 + 섞어 풀기) · 🌱 학교 진도 먼저(v301)·📚 틀리면 배움 한 장(v302)으로
//   쉬워진 ☀️를 다시 만나게 · 🧩 수학 퍼즐·🕵️ 나옹의 숙제는 즐겨 한다 →
//   ① 마지막 완주가 사흘 넘게 지났으면 그날 ☀️는 개념 편 하나만(섞어 풀기 없이 완주) ② 🌱 켜져 있으면 섞어 풀기는 4학년 칸 먼저
//   ③ 🧩·🕵️ 끝 화면에 ☀️ 단추 ④ 📤 수학 요약에 ☀️ 줄(누른 곳·다시 시작 판·완주)
// node --test tests/sun331.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  STEMS, dailyPlan, isComeback, COMEBACK_DAYS, SUN_FROM, SUN_DAY_LISTS, sunKey, sunReport, mathReportText, markDaily, gradeOf, SCHOOL_GRADE, MIX_CONCEPTS,
} from '../js/mathprog.js';
import { emptyMath, mergeDailyDelta, emptyDaily } from '../js/db.js';

const read = (f) => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const TODAY = '2026-10-20';
const T_OLD = new Date(2026, 9, 5, 12).getTime();
const T_REST = new Date(2026, 9, 20, 9).getTime();
const ON = { on: true, at: T_REST };
const OFF = { on: false, at: T_REST };
const rec = (o = {}) => ({ done: true, box: 1, dueAt: '2026-11-30', passes: 2, fails: 0, lastAt: T_OLD, schedAt: T_OLD, ...o });
const ids = (stem) => STEMS[stem].list.map((c) => c.id);
/** 세 줄기를 진단했고 모두 배운 상태(복습은 먼 뒤) · ▶ 큰 수 big.apply(4학년) — tests/mathrest301 planBase와 같은 꼴 */
function base(rest, daily) {
  const c = Object.fromEntries([...ids('fraction'), ...ids('decimal'), ...ids('bignum')].map((id) => [id, rec()]));
  delete c['big.apply']; delete c['dec.divnat']; delete c['dec.divdec'];
  return { ...emptyMath(), concepts: c, placed: { fraction: 1, decimal: 1, bignum: 1 }, ...(rest ? { rest } : {}), ...(daily ? { daily } : {}) };
}
const due = (m, id, dueAt = '2026-10-08') => { m.concepts[id] = { ...m.concepts[id], dueAt }; return m; };

test('☀️ isComeback (순수) — 완주한 적이 있고 마지막 완주가 사흘 넘게 전일 때만 · 없거나 깨졌거나 앞날이면 아님', () => {
  assert.equal(COMEBACK_DAYS, 3);
  const at = (d) => isComeback({ daily: { d, n: 1 } }, TODAY);
  assert.deepEqual([at('2026-10-20'), at('2026-10-17'), at('2026-10-16'), at('2026-10-13'), at('2025-12-31')], [false, false, true, true, true], '사흘은 아직 · 나흘부터');
  assert.deepEqual([at('2026-10-21'), at('2027-01-01')], [false, false], '앞날(시계·병합)');
  for (const bad of [undefined, null, {}, { d: 5 }, { d: '' }, { d: '2026-10' }, { d: 'x-10-01' }]) assert.equal(isComeback({ daily: bad }, TODAY), false, JSON.stringify(bad));
  assert.equal(isComeback(null, TODAY), false);
  assert.equal(isComeback(emptyMath(), TODAY), false, '처음 쓰는 기기는 예전 그대로');
  assert.equal(isComeback({ daily: { d: '2026-10-01' } }, ''), false);
  const m = { daily: { d: '2026-10-01', n: 2 } };
  markDaily(m, TODAY);
  assert.equal(isComeback(m, TODAY), false, '오늘 완주하면 "한 번 더"는 예전 ☀️');
});

test('☀️ 다시 시작 판 — 개념 편 하나만(섞어 풀기·🤔 노트 없음) · 사흘이면 예전 그대로 · 새로 배우기여도 · 개념 편이 없는 날은 섞어 풀기 그대로', () => {
  const mk = (d) => {
    const m = due(base(ON, d ? { d, n: 1 } : null), 'frac.mean');
    m.concepts['frac.same'] = { ...m.concepts['frac.same'], notes: [{ k: 'calc', key: 'K1', d: '2026-10-01', t: 10 }] }; // 🤔 어제 이전 노트
    return m;
  };
  const cb = dailyPlan(mk('2026-10-13'), TODAY, 'fraction', 1);
  assert.deepEqual([cb.roundId, cb.roundMode, cb.mix, cb.comeback], ['frac.mean', 'review', [], true]);
  const near = dailyPlan(mk('2026-10-17'), TODAY, 'fraction', 1);
  assert.deepEqual([near.roundId, near.comeback], ['frac.mean', false]);
  assert.equal(near.mix.length, MIX_CONCEPTS + 1, '사흘 — 아는 개념 셋 + 🤔 노트 하나 (예전 그대로)');
  assert.ok(near.mix.some((x) => x.note), '🤔 노트');
  const never = dailyPlan(mk(null), TODAY, 'fraction', 1);
  assert.deepEqual([never.comeback, never.mix.length], [false, MIX_CONCEPTS + 1], '완주한 적 없는 기록은 예전 그대로');
  const learn = dailyPlan(base(ON, { d: '2026-10-01', n: 1 }), TODAY, 'decimal', 2);
  assert.deepEqual([learn.roundMode, learn.roundId, learn.mix, learn.comeback], ['learn', 'big.apply', [], true], '새로 배우기 편 하나도');
  const none = base(ON, { d: '2026-10-01', n: 1 });
  none.placed = { fraction: 1, decimal: 1 };
  const p = dailyPlan(none, TODAY, 'decimal', 2);
  assert.deepEqual([p.roundId, p.comeback], [null, false], '개념 편이 없다');
  assert.ok(p.mix.length > 0, '그날 ☀️의 전부인 섞어 풀기는 그대로');
});

test('☀️ 섞어 풀기 — 🌱 켜져 있으면 4학년 아는 칸 먼저(5학년이 더 오래 안 봤어도) · 모자라면 5학년으로 채움 · 끄면 예전처럼 오래 안 본 것부터', () => {
  const mk = (rest) => {
    const m = due(base(rest, { d: '2026-10-19', n: 1 }), 'frac.mean');
    for (const id of ids('fraction')) if (gradeOf(id) === 5) m.concepts[id] = { ...m.concepts[id], lastAt: 1000 }; // 5학년을 가장 오래 안 봄
    return m;
  };
  const on = dailyPlan(mk(ON), TODAY, 'fraction', 3);
  assert.equal(on.roundId, 'frac.mean');
  assert.deepEqual(on.mix.map((x) => x.id).sort(), ['frac.equal', 'frac.mixed', 'frac.same'], '4학년 둘(frac.same·frac.mixed — frac.mean은 개념 편) + 모자란 하나는 5학년');
  assert.deepEqual(on.mix.map((x) => gradeOf(x.id)).sort(), [4, 4, 5]);
  const off = dailyPlan(mk(OFF), TODAY, 'fraction', 3);
  assert.deepEqual(off.mix.map((x) => x.id).sort(), ['frac.add', 'frac.common', 'frac.equal'], '끄면 예전처럼 오래 안 본 것부터');
  // 4학년 아는 칸이 넉넉하면 모두 4학년
  const d = due(base(ON, { d: '2026-10-19', n: 1 }), 'dec.sub');
  for (const id of ids('decimal')) if (gradeOf(id) === 5) d.concepts[id] = { ...d.concepts[id], lastAt: 1000 };
  const dp = dailyPlan(d, TODAY, 'fraction', 5);
  assert.equal(dp.roundId, 'dec.sub');
  assert.equal(dp.mix.length, MIX_CONCEPTS);
  assert.ok(dp.mix.every((x) => gradeOf(x.id) <= SCHOOL_GRADE), dp.mix.map((x) => x.id).join(','));
});

test('☀️ 기록 (순수) — 시작 칸 "시각:누른 곳:다시 시작" · 모르는 곳은 사다리 · 하루 기록 합집합 · 7일 · 누른 곳·다시 시작 판·완주 · 📤 수학 요약에 한 줄(하루 기록을 받았을 때만)', () => {
  assert.deepEqual(SUN_FROM, ['ladder', 'puzzle', 'detect']);
  assert.deepEqual(SUN_DAY_LISTS, ['sunStarts', 'sunDone']);
  assert.deepEqual([sunKey(5, 'puzzle', true), sunKey(6, 'detect', false), sunKey(7, 'nope', 1), sunKey(8, undefined, 0)], ['5:puzzle:1', '6:detect:0', '7:ladder:1', '8:ladder:0']);
  const a = mergeDailyDelta(emptyDaily(TODAY), TODAY, { sunStarts: [sunKey(1, 'ladder', true)] });
  const b = mergeDailyDelta(a, TODAY, { sunStarts: [sunKey(1, 'ladder', true)], sunDone: ['1'] });
  assert.deepEqual([b.sunStarts, b.sunDone], [['1:ladder:1'], ['1']]);
  const days = [
    { date: TODAY, sunStarts: ['100:ladder:0', '200:puzzle:1', 'x', '9:zz'], sunDone: ['100', '100', 'y'] },
    { date: '2026-10-18', sunStarts: ['300:detect:1', '100:ladder:0'], sunDone: ['300'] },
    { date: '2026-10-10', sunStarts: ['400:ladder:0'], sunDone: ['400'] }, // 7일 밖
    null,
  ];
  const line = sunReport(days, TODAY, { daily: { d: '2026-10-18', n: 1 } });
  assert.equal(line, '☀️ 최근 7일 오늘의 수학(v331부터 · 이 기간에 일어난 일을 따로 셈): 시작 3(사다리 1 · 🧩 끝 화면 1 · 🕵️ 끝 화면 1 · 그중 다시 시작 판 2) · 완주 2 · 마지막 완주 2026-10-18');
  assert.ok(sunReport([], TODAY, emptyMath()).includes('시작 0(사다리 0 · 🧩 끝 화면 0 · 🕵️ 끝 화면 0 · 그중 다시 시작 판 0) · 완주 0 · 마지막 완주 없음'));
  const m = base(ON, { d: '2026-10-18', n: 1 });
  assert.ok(mathReportText(m, TODAY, days).includes(line), '📤 수학 요약');
  assert.ok(!mathReportText(m, TODAY).includes('☀️ 최근 7일'), '하루 기록이 없으면(📊) 줄 없음');
  assert.ok(read('js/upload.js').includes('mathReportText(math, today, days || [])'), '📤는 하루 기록을 건넨다');
});

test('☀️ 화면 잇기 — 단추 글 · 다시 시작 판 한 줄 · startDaily(누른 곳) 시작 기록 · 완주 기록은 저장 뒤 한 흐름에 한 번 · 🧩·🕵️ 끝 화면 단추(오늘 완주 전·📬 다 읽음·낼 것 있음) · 누르면 판을 닫고 ☀️', () => {
  const m = read('js/math.js');
  assert.ok(m.includes(": '☀️ 오늘의 수학'); // v331") && !m.includes("'☀️ 오늘의 수학 — 한 번에 다 하기'"), '「한 번에 다 하기」를 뺌');
  assert.ok(m.includes("db.addEventListener('click', () => guardStart('math', () => startDaily('ladder')));"));
  assert.ok(m.includes("if (preview.roundId) parts.push(sunRoundText(state, preview, today));"));
  const rt = m.slice(m.indexOf('function sunRoundText(state, preview, today) {'), m.indexOf('\n}\n', m.indexOf('function sunRoundText(state, preview, today) {')));
  assert.ok(rt.includes("${preview.comeback ? ' — 오늘은 이것 하나면 ☀️ 끝!' : ''}"), '다시 시작 판 한 줄 (문제 수는 칸마다 달라 안 씀)');
  const sd = m.slice(m.indexOf("function startDaily(from = 'ladder') {"), m.indexOf('\n}\n', m.indexOf("function startDaily(from = 'ladder') {")));
  assert.ok(sd.includes("ui.daily = { plan, step: plan.roundId ? 'round' : 'mix', roundInfo: null, t0 };"));
  assert.ok(sd.includes('noteSun({ sunStarts: [sunKey(t0, from, plan.comeback)] });') && sd.indexOf('noteSun(') < sd.indexOf('startRound(plan.roundId'));
  const fin = m.slice(m.indexOf('ui.round = null; // 저장이 됐으니 이제 비운다'), m.indexOf('// 보상은 화면과 상관없이 지급'));
  assert.ok(/if \(d && lastOfDaily\) \{\s+d\.marked = true;\s+if \(d\.t0\) noteSun\(\{ sunDone: \[String\(d\.t0\)\] \}\);/.test(fin), '저장이 된 뒤 · 한 흐름에 한 번(marked와 같은 자리)');
  // 🔍 Codex 135차 #2 — 완주한 흐름·섞어 풀기 없는 계획에는 「다음 → 🎲」 없음(다시 시작 판에서 못 통과 → 🤔 한 번 더를 끝내면 「0문제」가 떴다)
  assert.ok(m.includes('  if (inDaily && !lastOfDaily && !d.marked && d.plan.mix.length) {\n    dailyNext = el('), '「다음 → 🎲」은 완주 전 · 섞어 풀기가 있을 때만');
  const so = m.slice(m.indexOf('function sunOfferEl(from, leave) {'), m.indexOf('\n}\n', m.indexOf('function sunOfferEl(from, leave) {')));
  assert.ok(so.includes('if (!state || dailyDone(state, today) || unreadAsks(state).length) return null;'), '오늘 완주했거나 📬를 안 읽었으면 없음(사다리 ☀️와 같다)');
  assert.ok(so.includes('if (!preview.roundId && !preview.mix.length) return null;'));
  assert.ok(so.includes("b.addEventListener('click', () => guardStart('math', () => { leave(); startDaily(from); }));"), '⏳ · 판을 닫고 · 누른 곳');
  assert.ok(!/남은|밀린|\d+일/.test(so), '셈·밀린 날 말 없음');
  assert.ok(m.includes('updateChip, sunEl: sunOfferEl, addCell: (box) => addCell(box, \'math\') };'), '🧩·🕵️ ctx (v352 🟢 셀도 함께)');
  const pz = read('js/mathpuzzleview.js');
  assert.ok(pz.includes("const sun = ctx.sunEl ? ctx.sunEl('puzzle', () => { S.ps = null; }) : null;"));
  const dt = read('js/detectiveview.js');
  assert.ok(dt.includes("const sun = ctx.sunEl ? ctx.sunEl('detect', () => endDetect()) : null;"), '🕵️는 못 적은 처음 답을 보내는 endDetect로 닫는다');
  for (const [src, f] of [[pz, 'function finishEl(ctx) {'], [dt, 'function finishEl(ctx) {']]) {
    const body = src.slice(src.indexOf(f), src.indexOf('\n}\n', src.indexOf(f)));
    assert.ok(body.indexOf('if (sun) box.appendChild(sun);') > body.indexOf('box.appendChild(row);'), '끝 화면 맨 아래');
    assert.ok(body.indexOf('const sun =') > body.indexOf('const d = '), '저장이 된 끝 화면에서만(저장 실패 화면은 앞에서 돌아간다)');
  }
  const db = read('js/db.js');
  assert.ok(db.includes("import { normThrows, SUN_DAY_LISTS } from './mathprog.js';"));
  assert.ok(read('css/style.css').includes('.math-sun-offer {'));
});
