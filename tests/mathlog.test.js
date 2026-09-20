// 🔢 수학 일지·개념별 보고·이야기 반복 방지·전용 기술 (아버님 실기기 신고 2026-09-20): node --test tests/mathlog.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { applyPlacement, applyRound, conceptReport, mathReportText, mathSummary, LOG_MAX, KIND_SHORT } from '../js/mathprog.js';
import { emptyMath, mergeMath } from '../js/db.js';
import { FRACTION, makeRound, makeQuestion } from '../js/mathgen.js';

const T = '2026-09-20';
const content = JSON.parse(readFileSync(new URL('../coach/math/fraction.json', import.meta.url), 'utf8'));
const opts = { content, names: ['피카츄', '리자몽', '이브이'], worlds: { pokemon: [] } };
const round = (ok, tags = []) => ({
  correct: ok.filter(Boolean).length, total: ok.length, missTags: tags.filter(Boolean),
  qs: ['calc', 'misread', 'why', 'special'].map((k, i) => ({ k, ok: ok[i] ? 1 : 0, ...(tags[i] ? { tag: tags[i] } : {}) })),
});

test('📒 일지: 한 편마다 한 줄 — 날짜·개념·결과·문항별 얼굴과 오개념', () => {
  const m = emptyMath();
  applyRound(m, 'frac.same', round([1, 0, 1, 1], ['', '분모끼리도 더함']), T);
  applyRound(m, 'frac.same', round([1, 1, 1, 1]), T);
  assert.equal(m.log.length, 2);
  assert.deepEqual({ ...m.log[0], t: 0 }, { d: T, t: 0, id: 'frac.same', mode: 'learn', ok: 3, n: 4, qs: [{ k: 'calc', ok: 1 }, { k: 'misread', ok: 0, tag: '분모끼리도 더함' }, { k: 'why', ok: 1 }, { k: 'special', ok: 1 }] });
  assert.equal(m.log[1].ok, 4);
  assert.ok(m.log[1].t >= m.log[0].t, '시각이 있다 (병합 합집합 키)');
  // 개념별 누적: 얼굴별 [정답, 문항]과 오개념
  const rec = m.concepts['frac.same'];
  assert.deepEqual(rec.kinds, { calc: [2, 2], misread: [1, 2], why: [2, 2], special: [2, 2] });
  assert.deepEqual(rec.miss, { '분모끼리도 더함': 1 });
  assert.equal(rec.passes, 1); assert.equal(rec.fails, 1);
});

test('📒 일지: 진단도 남는다 (개념별 정오) · 차례 아닌 연습은 mode가 practice', () => {
  const m = emptyMath();
  const answers = [{ concept: 'frac.mean', correct: true }, { concept: 'frac.equal', correct: false, tag: '분자만 나눔' }];
  applyPlacement(m, answers, T, 'fraction', ['분자만 나눔']);
  assert.equal(m.log.length, 1);
  assert.equal(m.log[0].id, 'diag');
  assert.deepEqual(m.log[0].qs, [{ k: 'calc', c: 'frac.mean', ok: 1 }, { k: 'calc', c: 'frac.equal', ok: 0, tag: '분자만 나눔' }]);
  applyRound(m, 'frac.mean', round([1, 1, 1, 1]), T); // 진단으로 이미 "안다"인데 오늘 또 풀면 연습
  assert.equal(m.log[1].mode, 'practice');
});

test('📒 일지는 최근 LOG_MAX편만 — 누적(kinds·passes)은 안 잘린다', () => {
  const m = emptyMath();
  for (let i = 0; i < LOG_MAX + 25; i++) applyRound(m, 'frac.mean', round([1, 1, 1, 1]), T);
  assert.equal(m.log.length, LOG_MAX);
  assert.equal(m.concepts['frac.mean'].passes, LOG_MAX + 25);
  assert.deepEqual(m.concepts['frac.mean'].kinds.calc, [LOG_MAX + 25, LOG_MAX + 25]);
});

test('📊 개념별 보고: 최근 편 흔적(오래된 → 최근), 약한 얼굴, 이 개념의 오개념 TOP', () => {
  const m = emptyMath();
  applyRound(m, 'frac.add', round([0, 1, 0, 1], ['분모끼리 더함', '', '개념을 다르게 이해함']), T);
  applyRound(m, 'frac.add', round([0, 1, 1, 1], ['분모끼리 더함']), T);
  applyRound(m, 'frac.add', round([1, 1, 1, 1]), T);
  applyRound(m, 'frac.mean', round([1, 1, 1, 1]), T);
  m.concepts['frac.mean'].lastAt += 5; // 같은 밀리초에 끝난 테스트라 순서를 확실히
  const rep = conceptReport(m);
  assert.deepEqual(rep.map((r) => r.id), ['frac.mean', 'frac.add'], '최근에 푼 것이 먼저');
  const add = rep.find((r) => r.id === 'frac.add');
  assert.deepEqual(add.trail.map((t) => t.pass), [false, false, true], '틀리다 나아진 모양이 보인다');
  assert.equal(add.weak.k, 'calc', '①계산 1/3이 제일 약하다');
  assert.deepEqual(add.miss, [{ tag: '분모끼리 더함', n: 2 }, { tag: '개념을 다르게 이해함', n: 1 }]);
  assert.equal(add.passes, 1); assert.equal(add.fails, 2); assert.equal(add.done, true);
  assert.deepEqual(conceptReport(emptyMath()), []);
  assert.equal(mathSummary(m).logged, 4);
});

test('📋 붙여 넣을 글: 개념별 한 줄 + 최근 일지, 개념 이름은 사람 말로', () => {
  const m = emptyMath();
  applyRound(m, 'frac.add', round([0, 1, 1, 1], ['분모끼리 더함']), T);
  applyRound(m, 'frac.add', round([1, 1, 1, 1]), T);
  const txt = mathReportText(m, T);
  assert.ok(txt.startsWith(`🔢 신코치 수학 기록 (${T})`));
  assert.ok(txt.includes('분모가 다른 분수의 덧셈·뺄셈 ✅: 1통과/1실패 · ✘3/4 ✔'), txt);
  assert.ok(txt.includes('①계산 1/2'), '얼굴별 정답');
  assert.ok(txt.includes('헷갈림: 분모끼리 더함×1'));
  assert.ok(txt.includes('최근 2편'));
  assert.ok(txt.includes('①✘(분모끼리 더함)'), '문항별 정오와 오개념');
  assert.ok(!txt.includes('frac.add'), 'id가 아니라 이름');
  assert.equal(KIND_SHORT.special, '⭐특별');
});

test('두 기기 병합: 일지는 시각으로 합집합, 얼굴별 누적·개념별 오개념은 큰 값', () => {
  const a = emptyMath();
  applyRound(a, 'frac.same', round([1, 0, 1, 1], ['', '분모끼리도 더함']), T);
  const b = emptyMath();
  applyRound(b, 'frac.same', round([1, 1, 1, 1]), T);
  applyRound(b, 'frac.mixed', round([1, 1, 0, 1], ['', '', '개념을 다르게 이해함']), T);
  a.log[0].t = 1000; b.log[0].t = 1000; b.log[1].t = 2000; // 같은 편이 두 기기에 있는 경우 — 하나만
  const m = mergeMath(a, b);
  assert.equal(m.log.length, 2, '겹친 편 하나 + b의 둘째 편');
  assert.ok(m.log.every((e, i, arr) => i === 0 || e.t >= arr[i - 1].t), '시각 순');
  assert.deepEqual(m.concepts['frac.same'].kinds, { calc: [1, 1], misread: [1, 1], why: [1, 1], special: [1, 1] }, '얼굴별 큰 값');
  assert.deepEqual(m.concepts['frac.same'].miss, { '분모끼리도 더함': 1 });
  assert.deepEqual(m.concepts['frac.mixed'].miss, { '개념을 다르게 이해함': 1 }, '한쪽에만 있는 개념은 그대로');
  // 옛 기록(kinds 없음)과 섞여도 깨지지 않는다
  const old = { concepts: { 'frac.same': { done: true, box: 2, dueAt: '2026-09-22', passes: 3, fails: 0, lastAt: 1 } } };
  const m2 = mergeMath(a, old);
  assert.equal(m2.concepts['frac.same'].passes, 3);
  assert.deepEqual(m2.concepts['frac.same'].kinds, a.concepts['frac.same'].kinds);
});

test('🍕 이야기 반복 방지: 방금 나온 틀·문항은 다음 편에서 피한다 (recent), 다 최근이면 전부에서', () => {
  // 분수의 뜻: 포켓몬 틀 4개 — recent에 셋을 넣으면 남은 하나만 나온다
  const tpls = new Set();
  for (let s = 1; s <= 40; s++) tpls.add(makeQuestion('frac.mean', 'calc', s, opts).key);
  assert.equal(tpls.size, 4, '틀 4개가 다 나온다');
  const [t1, t2, t3, t4] = [...tpls];
  for (let s = 1; s <= 40; s++) assert.equal(makeQuestion('frac.mean', 'calc', s, { ...opts, recent: [t1, t2, t3] }).key, t4);
  // 넷 다 최근이면 그래도 문제는 나온다 (전부에서 고른다)
  assert.ok(makeQuestion('frac.mean', 'calc', 7, { ...opts, recent: [t1, t2, t3, t4] }).key);
  // ③ 왜·⭐ 특별도 같은 규칙 — 사람이 쓴 문항은 유한해서 외우기 방지가 더 중요하다
  const whyQ = makeQuestion('frac.mean', 'why', 3, opts);
  assert.ok(whyQ.key);
  for (let s = 1; s <= 30; s++) assert.notEqual(makeQuestion('frac.mean', 'why', s, { ...opts, recent: [whyQ.key] }).key, whyQ.key);
  const sp = makeQuestion('frac.mean', 'special', 3, opts);
  assert.ok(sp.key);
  for (let s = 1; s <= 30; s++) assert.notEqual(makeQuestion('frac.mean', 'special', s, { ...opts, recent: [sp.key] }).key, sp.key);
  // 계산·왜·특별 문항은 key를 가진다 (화면이 recent에 쌓는다). ② 오개념 문항은 틀이 하나라 key가 없어도 된다
  for (const c of FRACTION) for (const q of makeRound(c.id, 11, opts)) if (q.kind !== 'misread') assert.ok(q.key, `${c.id} ${q.kind}`);
});

test('🍕 분수의 뜻: 피자 이야기는 넷 중 하나일 뿐 — 그림은 피자·케이크일 때만 원, 나머지는 막대', () => {
  let pizza = 0; let bar = 0;
  for (let s = 1; s <= 80; s++) {
    const q = makeQuestion('frac.mean', 'calc', s, opts);
    if (/피자|케이크/.test(q.q)) { pizza++; assert.ok(q.figure.includes('피자')); } else { bar++; assert.ok(q.figure.includes('막대')); }
  }
  assert.ok(pizza > 5 && bar > pizza, `피자 ${pizza} / 막대 ${bar}`);
});
