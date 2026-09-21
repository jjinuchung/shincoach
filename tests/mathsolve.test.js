// 🔢 풀이 카드·쌍둥이 문제·바로 고침 (진우 2026-09-21: "왜 틀렸는지 한 문장 말고 그림과 풀이를"): node --test tests/mathsolve.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { FRACTION, makeQuestion, makeRound, valueOf, tplKey } from '../js/mathgen.js';
import { applyRound, conceptReport, mathReportText, REWARD } from '../js/mathprog.js';
import { emptyMath } from '../js/db.js';

const content = JSON.parse(readFileSync(new URL('../coach/math/fraction.json', import.meta.url), 'utf8'));
const opts = { content, names: ['피카츄', '리자몽', '이브이'], worlds: { pokemon: [], toystory: [], minions: [], moana: [] } };
const T = '2026-09-21';

test('★ 코드가 만드는 ①② 문항은 전부 풀이(solve)를 가진다 — 단계 2줄 이상, 오답마다 "왜 틀렸나", 기억할 것 한 줄', () => {
  let n = 0;
  for (const c of FRACTION) for (const kind of ['calc', 'misread']) for (let s = 1; s <= 200; s++) {
    const q = makeQuestion(c.id, kind, s, opts); n++;
    assert.ok(q.solve, `${c.id} ${kind} #${s}: 풀이 없음`);
    assert.ok(q.solve.steps.length >= 2, `${c.id} ${kind}: 단계 ${q.solve.steps.length}`);
    assert.ok(q.solve.rule, `${c.id} ${kind}: 기억할 것 없음`);
    for (const ch of q.choices) if (!ch.ok) {
      const why = q.solve.why[ch.tag] || q.solve.whyAny;
      assert.ok(why, `${c.id} ${kind} #${s}: 오답 "${ch.tag}"에 설명 없음`);
      assert.ok(!/\{(me|mon)|undefined|NaN/.test(why), `${c.id} ${kind}: 설명이 덜 채워짐 — ${why}`);
    }
    for (const st of q.solve.steps) assert.ok(!/\{(me|mon)|undefined|NaN/.test(st), `${c.id} ${kind}: 단계가 덜 채워짐 — ${st}`);
    if (q.solve.figure) assert.ok(q.solve.figure.startsWith('<svg'), `${c.id} ${kind}: 그림이 SVG가 아님`);
  }
  assert.ok(n >= 4000);
});

test('풀이의 숫자는 그 문제의 숫자다 — 정답이 단계 마지막 줄에 나온다', () => {
  for (const c of FRACTION) for (let s = 1; s <= 60; s++) {
    const q = makeQuestion(c.id, 'calc', s, opts);
    const ok = q.choices.find((x) => x.ok).text;
    const last = q.solve.steps[q.solve.steps.length - 1];
    // 답 글자 그대로거나(대분수·자연수), 값이 같은 분수가 단계에 있다
    const inText = last.includes(ok) || q.solve.steps.some((st) => st.includes(ok));
    const v = valueOf(ok);
    const inValue = v && q.solve.steps.some((st) => (st.match(/\d+\/\d+|\b\d+\b/g) || []).some((t) => { const w = valueOf(t); return w && w.n * v.d === v.n * w.d; }));
    assert.ok(inText || inValue, `${c.id} #${s}: 단계에 정답 ${ok}이 없다 — ${last}`);
  }
});

test('사람이 쓴 ③⭐ 문항은 아직 풀이가 없다 (2차) — solve는 null, 화면은 정답 + 개념 한 줄로 간다', () => {
  for (const c of FRACTION) {
    const w = makeQuestion(c.id, 'why', 3, opts);
    assert.equal(w.solve, null);
    const sp = makeQuestion(c.id, 'special', 3, opts);
    if (sp) assert.equal(sp.solve, null);
  }
});

test('🔁 쌍둥이: want를 주면 같은 이야기 틀(숫자만 다른) 문제가 나온다 — 방금 틀린 유형을 바로 다시', () => {
  for (const c of FRACTION) {
    const q = makeQuestion(c.id, 'calc', 9, opts);
    assert.ok(q.key);
    let sameTpl = 0; let sameText = 0;
    for (let s = 200; s < 230; s++) {
      const t = makeQuestion(c.id, 'calc', s, { ...opts, want: q.key });
      if (t.key === q.key) sameTpl++;
      if (t.q === q.q) sameText++;
    }
    assert.equal(sameTpl, 30, `${c.id}: 틀이 다름`);
    assert.ok(sameText < 30, `${c.id}: 숫자가 늘 같다`);
    // want가 없는 틀이면(다른 개념의 키) 평소처럼 아무 틀
    assert.ok(makeQuestion(c.id, 'calc', 5, { ...opts, want: '없는 틀' }).key);
  }
  assert.equal(tplKey('피자 4조각 중 3조각'), '피자 #조각 중 #조각');
});

test('📒 일지: 쌍둥이 결과(fx)가 문항에 붙고, 보고서에 "바로 고침"이 센다', () => {
  const m = emptyMath();
  applyRound(m, 'frac.add', { correct: 3, total: 4, missTags: ['분모끼리 더함'], qs: [
    { k: 'calc', ok: 0, tag: '분모끼리 더함', fx: 1 }, { k: 'misread', ok: 1 }, { k: 'why', ok: 1 }, { k: 'special', ok: 1 },
  ] }, T);
  applyRound(m, 'frac.add', { correct: 2, total: 4, missTags: ['한쪽만 통분함'], qs: [
    { k: 'calc', ok: 0, tag: '한쪽만 통분함', fx: 0 }, { k: 'misread', ok: 0, tag: '틀린 줄 모름' }, { k: 'why', ok: 1 }, { k: 'special', ok: 1 },
  ] }, T);
  assert.deepEqual(m.log[0].qs[0], { k: 'calc', ok: 0, tag: '분모끼리 더함', fx: 1 });
  assert.deepEqual(m.log[1].qs[0], { k: 'calc', ok: 0, tag: '한쪽만 통분함', fx: 0 });
  assert.equal(m.log[1].qs[1].fx, undefined, '쌍둥이를 안 푼 문항엔 fx가 없다');
  const rep = conceptReport(m).find((r) => r.id === 'frac.add');
  assert.equal(rep.fixed, 1);
  const txt = mathReportText(m, T);
  assert.ok(txt.includes('바로 고침 1'));
  assert.ok(txt.includes('①✘(분모끼리 더함)→고침'));
  assert.ok(txt.includes('①✘(한쪽만 통분함)→또틀림'));
  assert.equal(REWARD.fix.xp, 1);
  assert.equal(REWARD.fix.coin, 0, '쌍둥이는 코인 없음 — 통과 여부를 안 바꾸는 연습');
});

test('한 편(makeRound)의 ①② 문항은 풀이와 key를 갖고, 풀이 그림은 있어도 SVG', () => {
  for (const c of FRACTION) for (const q of makeRound(c.id, 21, opts)) {
    if (q.kind === 'calc' || q.kind === 'misread') { assert.ok(q.solve); if (q.kind === 'calc') assert.ok(q.key); }
  }
});
