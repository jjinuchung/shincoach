// 🔢 Codex 리뷰(2026-09-20) 10건을 고정하는 테스트: node --test tests/mathreview.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { FRACTION, makeQuestion, valueOf, WORLDS } from '../js/mathgen.js';
import { applyRound, applyPlacement, roundReward, ladderOf } from '../js/mathprog.js';
import { emptyMath, mergeMath, mergeStatRecord } from '../js/db.js';
import { GRADUATED } from '../js/review.js';

const content = JSON.parse(readFileSync(new URL('../coach/math/fraction.json', import.meta.url), 'utf8'));
const T = '2026-09-20';
const perfect = { correct: 4, total: 4, missTags: [] };

test('#1 차례가 아닌 연습은 라이트너를 안 움직인다 — 같은 날 여섯 번 풀어도 👑이 안 된다', () => {
  const m = emptyMath();
  const first = applyRound(m, 'frac.mean', perfect, T);
  assert.equal(first.first, true);
  for (let i = 0; i < 6; i++) {
    const r = applyRound(m, 'frac.mean', perfect, T);
    assert.equal(r.practice, true, `${i}: 같은 날은 연습`);
    assert.equal(r.review, false);
    assert.equal(r.crowned, false);
  }
  assert.equal(m.concepts['frac.mean'].box, 0, 'box 그대로');
  assert.equal(m.concepts['frac.mean'].dueAt, '2026-09-21', '내일 복습 그대로');
  assert.equal(m.concepts['frac.mean'].passes, 7, '푼 횟수는 남는다');
  // 연습 보상은 정답 수만큼만, 잡기 없음
  assert.deepEqual(roundReward({ passed: true, practice: true }, 4), { xp: 12, coin: 4, catchOnce: false });
  // 연습에서 틀려도 👑·box는 안 내려간다
  const m2 = emptyMath();
  applyRound(m2, 'frac.mean', perfect, T);
  let day = '2026-09-21';
  for (let i = 0; i < 5; i++) { applyRound(m2, 'frac.mean', perfect, day); day = m2.concepts['frac.mean'].dueAt || day; }
  assert.equal(m2.concepts['frac.mean'].box, GRADUATED, '👑');
  const fail = applyRound(m2, 'frac.mean', { correct: 1, total: 4, missTags: ['x'] }, '2026-12-01');
  assert.equal(fail.practice, true, '졸업한 개념은 복습 차례가 없으니 연습');
  assert.equal(m2.concepts['frac.mean'].box, GRADUATED, '👑는 연습에서 틀려도 그대로');
});

test('#1 두 창: 먼저 끝낸 창이 dueAt을 미루면 늦은 창은 연습이 된다 (복습 보상 두 번 없음)', () => {
  const m = emptyMath();
  applyRound(m, 'frac.mean', perfect, T);
  const a = applyRound(m, 'frac.mean', perfect, '2026-09-21'); // 창 A가 먼저 (저장소 rec 기준)
  assert.equal(a.review, true);
  const b = applyRound(m, 'frac.mean', perfect, '2026-09-21'); // 창 B는 갱신된 rec로 판정
  assert.equal(b.practice, true);
  assert.equal(m.concepts['frac.mean'].box, 1, '한 번만 올라간다');
});

test('#2 생성 문항의 오답은 정답과 값이 다르다 (6/36 ≠ 1/6 같은 글자 트릭 없음)', () => {
  const q22 = makeQuestion('frac.same', 'calc', 22);
  const ok = q22.choices.find((c) => c.ok);
  for (const c of q22.choices) if (!c.ok) assert.ok(!same(valueOf(c.text), valueOf(ok.text)), `${q22.expr}: 오답 ${c.text} = 정답 ${ok.text}`);
  let n = 0;
  for (const c of FRACTION) {
    for (let seed = 1; seed <= 500; seed++) {
      const q = makeQuestion(c.id, 'calc', seed);
      const okV = valueOf(q.choices.find((x) => x.ok).text);
      for (const ch of q.choices) {
        if (ch.ok) continue;
        const v = valueOf(ch.text);
        if (v && okV) { n++; assert.ok(!same(v, okV), `${c.id}/${seed} ${q.expr}: 오답 ${ch.text}이 정답과 같은 값`); }
      }
    }
  }
  assert.ok(n > 5000, `값을 비교한 오답 ${n}개`);
  assert.deepEqual(valueOf('2 3/8'), { n: 19, d: 8 });
  assert.equal(valueOf('분모끼리 더했어요'), null);
});
function same(a, b) { return !!(a && b && a.n * b.d === b.n * a.d); }

test('#3 통분 문항은 "가장 작은"을 묻는다 — 24도 공통 분모라서', () => {
  for (let s = 1; s <= 60; s++) {
    const q = makeQuestion('frac.common', 'calc', s, { worlds: { pokemon: [], toystory: [], minions: [], moana: [] } });
    assert.ok(/가장 작은/.test(q.q), `${s}: ${q.q}`);
    assert.ok(/가장 작은 공통 분모/.test(q.expr));
  }
  for (const sp of content['frac.common'].special) assert.ok(/가장 작은/.test(sp.q), sp.q);
});

test('#4 곱셈에서 통분은 틀린 게 아니다 — 오개념 문항은 실제로 틀린 계산을 보여 준다', () => {
  for (let s = 1; s <= 40; s++) {
    const q = makeQuestion('frac.mul', 'misread', s);
    assert.ok(/분자만 곱해서/.test(q.q), '틀린 계산(분모를 한 번만 씀)이 문장에 있다');
    const ok = q.choices.find((c) => c.ok);
    assert.ok(/분모끼리도 곱해야/.test(ok.text));
    assert.ok(/틀린 건 아니에요/.test(ok.text), '통분이 틀린 게 아니라고 명시');
  }
  assert.ok(/필요가 없어요/.test(content['frac.mul'].story.text), '이야기도 "안 돼요"가 아니라 "필요 없어요"');
  assert.ok(!/통분하면 안 돼요/.test(content['frac.mul'].story.text));
  const calc = makeQuestion('frac.mul', 'calc', 3);
  assert.ok(!calc.choices.some((c) => c.tag === '통분해서 곱함'), '오답 이름표가 정확해졌다 (통분한 뒤 분모를 한 번만 씀)');
});

test('#6 옛 백업을 넣어도 오늘의 수학 수치가 줄지 않는다', () => {
  const cur = { date: T, doneKeys: [], mathQ: 20, mathOk: 15, mathRounds: 5, matches: 3 };
  const rec = { date: T, doneKeys: [], mathQ: 4, mathOk: 3, mathRounds: 1, matches: 1 };
  const out = mergeStatRecord('daily', cur, rec);
  assert.equal(out.mathQ, 20); assert.equal(out.mathOk, 15); assert.equal(out.mathRounds, 5);
  assert.equal(out.matches, 3, '🔤 단어 잇기 횟수도 (원래 빠져 있던 것)');
});

test('#7 다른 기기의 늦은 실패가 앞선 통과를 지우지 않는다', () => {
  const a = emptyMath();
  applyRound(a, 'frac.mean', perfect, T);
  a.concepts['frac.mean'].lastAt = 100;
  const b = emptyMath();
  applyRound(b, 'frac.mean', { correct: 2, total: 4, missTags: ['분모끼리 더함'] }, T);
  b.concepts['frac.mean'].lastAt = 200; // 늦게, 그러나 못 배움
  for (const [x, y] of [[a, b], [b, a]]) {
    const m = mergeMath(x, y);
    const c = m.concepts['frac.mean'];
    assert.equal(c.done, true, '한쪽이라도 배웠으면 배운 것');
    assert.equal(c.box, 0); assert.equal(c.dueAt, '2026-09-21', '일정은 배운 쪽 것');
    assert.equal(c.passes, 1); assert.equal(c.fails, 1); assert.equal(c.lastAt, 200);
    assert.equal(ladderOf(m, T)[1].state, 'now', '다음 개념이 잠기지 않는다');
  }
  // 둘 다 배웠으면 최근 일정
  const c1 = emptyMath(); applyRound(c1, 'frac.mean', perfect, T); c1.concepts['frac.mean'].lastAt = 100;
  const c2 = emptyMath(); applyRound(c2, 'frac.mean', perfect, T); applyRound(c2, 'frac.mean', perfect, '2026-09-21'); c2.concepts['frac.mean'].lastAt = 300;
  assert.equal(mergeMath(c1, c2).concepts['frac.mean'].box, 1);
  assert.equal(mergeMath(c2, c1).concepts['frac.mean'].box, 1);
  assert.equal(mergeStatRecord('profile', { id: 'math', concepts: {} }, b).concepts['frac.mean'].done, false, 'importStats 경로도 mergeMath로 간다');
});

test('#8 진단에서 고른 오개념도 부모 화면에 쌓인다', () => {
  const m = emptyMath();
  applyPlacement(m, [{ concept: 'frac.mean', correct: false }], T, 'fraction', ['위아래를 바꿔 씀']);
  assert.equal(m.miss['위아래를 바꿔 씀'], 1);
});

test('#9 잡은 포켓몬이 한 마리뿐이면 둘째 출연은 기본 출연진에서 — 자기와 자기를 비교하지 않는다', () => {
  for (let s = 1; s <= 200; s++) {
    const q = makeQuestion('frac.div', 'calc', s, { names: ['리자몽'] });
    const times = q.q.split('리자몽').length - 1;
    assert.ok(times <= 2 || !/리자몽의 .* 리자몽의/.test(q.q), `${s}: ${q.q}`);
  }
  let other = 0;
  for (let s = 1; s <= 100; s++) {
    const q = makeQuestion('frac.same', 'calc', s, { names: ['리자몽'] });
    if (WORLDS.pokemon.cast.some((n) => q.q.includes(n))) other++;
  }
  assert.ok(other > 0, '기본 출연진이 둘째로 나온다');
});
