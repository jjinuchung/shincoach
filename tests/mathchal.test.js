// 🎯 도전 문제 규칙 + 문제집 자료 검산: node --test tests/mathchal.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  ROUND_N, REWARD, INPUTS, qid, setOf, setsOf, checkPart, checkItem,
  solved, solvedCount, setCleared, setClaimed, nextItems, nextNo, applyChalRound, chalReward, setNote,
} from '../js/mathchal.js';
import { cloneMath, emptyMath, mergeStatRecord } from '../js/db.js';

const DATA = JSON.parse(fs.readFileSync(new URL('../coach/math/challenge.json', import.meta.url), 'utf8'));
const U3 = setOf(DATA, 'u3');
const byNo = (n) => U3.items.find((it) => it.no === n);
const ans = (n, i = 0) => byNo(n).parts[i].answer;
const num = (n, i = 0) => Number(ans(n, i));

// ───────────────────── 자료가 형식에 맞나 ─────────────────────

test('🎯 자료: 3단원 20문제, 번호가 1~20으로 빠짐·겹침 없음', () => {
  assert.equal(DATA.book, '만점왕 수학 플러스 4-2');
  assert.equal(setsOf(DATA).length, 1, '지금은 3단원만 (5단원 꺾은선그래프는 다음에)');
  assert.equal(U3.items.length, 20);
  assert.deepEqual(U3.items.map((it) => it.no), Array.from({ length: 20 }, (_, i) => i + 1));
  assert.ok(U3.unit.includes('소수') && U3.pages);
});

test('🎯 자료: 모든 칸이 쓸 수 있는 모양인가 (입력 방식·답·보기)', () => {
  for (const it of U3.items) {
    assert.ok(it.q && it.q.length > 5, `${it.no}번 문제 글이 없다`);
    assert.ok(it.why && it.why.length > 10, `${it.no}번 풀이가 없다 — 틀렸을 때 보여 줄 말이 없다`);
    assert.ok(Array.isArray(it.parts) && it.parts.length >= 1, `${it.no}번 답 칸이 없다`);
    for (const p of it.parts) {
      assert.ok(INPUTS.includes(p.input), `${it.no}번: 모르는 입력 방식 ${p.input}`);
      if (p.input === 'num') {
        assert.ok(Number.isFinite(Number(p.answer)), `${it.no}번: 숫자 답이 아니다 (${p.answer})`);
      }
      if (p.input === 'choice') {
        assert.ok(Array.isArray(p.choices) && p.choices.length >= 2, `${it.no}번: 보기가 모자라다`);
        assert.ok(p.choices.includes(p.answer), `${it.no}번: 답이 보기 안에 없다 (${p.answer})`);
        assert.equal(new Set(p.choices).size, p.choices.length, `${it.no}번: 보기가 겹친다`);
      }
      if (p.input === 'many') {
        assert.ok(Array.isArray(p.answer) && p.answer.length >= 1, `${it.no}번: 답 목록이 비었다`);
        for (const a of p.answer) assert.ok(p.choices.includes(a), `${it.no}번: 답 ${a}가 보기에 없다`);
        assert.ok(p.answer.length < p.choices.length, `${it.no}번: 전부 고르는 문제는 문제가 아니다`);
      }
      if (p.input === 'order') {
        assert.equal(p.answer.length, p.choices.length, `${it.no}번: 순서 답의 개수가 보기와 다르다`);
        assert.deepEqual([...p.answer].sort(), [...p.choices].sort(), `${it.no}번: 순서 답이 보기의 재배열이 아니다`);
      }
    }
  }
});

// ───────────────────── ★ 답을 **처음부터 다시 풀어** 대조 ─────────────────────
// 옮겨 적다 틀리는 것이 이 기능에서 제일 위험하다. 문제집 숫자를 여기 다시 적고,
// 자료에 적힌 답이 아니라 **계산으로 나온 값**과 비교한다.

/**
 * 숫자 d가 **나타내는 값** (1.614에서 6은 0.6, 3.245에서 5는 0.005).
 * ★ 자릿값(0.001)만 돌려주면 04번처럼 "5가 0.005를 나타내는 수"를 못 고른다 — 자리 × 숫자여야 한다
 */
function valueOfDigit(text, digit) {
  const [i, f = ''] = String(text).split('.');
  for (let k = i.length - 1; k >= 0; k--) if (i[k] === digit) return Number(digit) * 10 ** (i.length - 1 - k);
  for (let k = 0; k < f.length; k++) if (f[k] === digit) return Number(digit) * 10 ** -(k + 1);
  return 0;
}

test('🎯 검산 01~05', () => {
  // 01 — 0부터 1/10까지 10등분, ㉠는 6번째 눈금 (사진을 픽셀로 재서 확인한 값)
  assert.ok(Math.abs(num(1) - (6 * (0.1 / 10))) < 1e-12, '01 ㉠');
  assert.equal(ans(1, 1), '영 점 영육');

  // 02 — 6이 나타내는 값이 가장 큰 것
  const c2 = ['1.614', '0.765', '6.019', '3.956', '2.659'];
  const best2 = c2.reduce((a, b) => (valueOfDigit(b, '6') > valueOfDigit(a, '6') ? b : a));
  assert.equal(ans(2), best2);
  assert.equal(best2, '6.019');

  // 03 — 소수 둘째 자리 숫자가 가장 작은 수
  const second = (t) => Number((String(t).split('.')[1] || '')[1] || 0);
  const c3 = ['1.791', '5.373', '8.06'];
  assert.equal(ans(3), c3.reduce((a, b) => (second(b) < second(a) ? b : a)));

  // 04 — 5가 소수 셋째 자리인 수 모두
  const c4 = ['3.245', '0.529', '8.052', '5.041', '3.258', '7.925'];
  assert.deepEqual(ans(4), c4.filter((t) => Math.abs(valueOfDigit(t, '5') - 0.005) < 1e-12));

  // 05 — 작은 수부터 놓으면 사자성어
  const c5 = [['2.89', '진'], ['3.12', '래'], ['2.91', '감'], ['1.59', '고']];
  const sorted = [...c5].sort((a, b) => Number(a[0]) - Number(b[0]));
  assert.deepEqual(ans(5), sorted.map(([v, w]) => `${v} ${w}`));
  assert.equal(sorted.map(([, w]) => w).join(''), '고진감래', '사자성어가 안 되면 옮겨 적기를 틀린 것');
});

test('🎯 검산 06~10', () => {
  // 06 — 9.35 > 9.□7 을 만족하는 0~9의 개수
  let n6 = 0;
  for (let d = 0; d <= 9; d++) if (9.35 > Number(`9.${d}7`)) n6 += 1;
  assert.equal(num(6), n6);
  assert.equal(n6, 3);

  // 07 — ㉠의 1/10 = 8.07 · 8.07의 1/10 = ㉡
  assert.ok(Math.abs(num(7, 0) / 10 - 8.07) < 1e-12, '07 ㉠');
  assert.ok(Math.abs(num(7, 1) - 8.07 / 10) < 1e-12, '07 ㉡');

  // 08 — 413의 1/100 vs 4.13의 10배
  assert.equal(ans(8), 413 / 100 > 4.13 * 10 ? '㉠' : '㉡');
  assert.ok(4.13 * 10 > 413 / 100);

  // 09 — 배수가 다른 하나
  const r9 = [['㉠', 4.6 / 0.046], ['㉡', 10 / 0.1], ['㉢', 62.09 / 6.209]];
  const odd = r9.find(([, v]) => r9.filter(([, w]) => Math.abs(w - v) < 1e-6).length === 1);
  assert.equal(ans(9), odd[0]);
  assert.equal(odd[0], '㉢');

  // 10 — 잘못 구한 1/10이 7.18 → 바르게는 1/100
  assert.ok(Math.abs(num(10) - (7.18 * 10) / 100) < 1e-12);
});

test('🎯 검산 11~15', () => {
  assert.ok(Math.abs(num(11) - (0.5 + 3.6)) < 1e-12, '11');
  assert.ok(Math.abs(num(12) - (0.01 * 75 + 459 / 100)) < 1e-12, '12');

  // 13 — 계산 결과가 작은 것부터
  const r13 = [['㉠', 2.2 - 0.5], ['㉡', 8.3 - 6.9], ['㉢', 3.2 - 1.7]];
  assert.deepEqual(ans(13), [...r13].sort((a, b) => a[1] - b[1]).map(([k]) => k));

  // 14 — 연우 32.4 · 수혁 +3.7 · 혜빈 −5.6
  assert.ok(Math.abs(num(14) - (32.4 + 3.7 - 5.6)) < 1e-12, '14');

  // 15 — 7.5−1.86 vs 8.24−2.8
  assert.equal(ans(15), 7.5 - 1.86 > 8.24 - 2.8 ? '>' : '<');
});

test('🎯 검산 16~20', () => {
  assert.ok(Math.abs(num(16, 0) - (0.76 + 0.31)) < 1e-12, '16 가로');
  assert.ok(Math.abs(num(16, 1) - (0.76 - 0.59)) < 1e-12, '16 세로');

  // 17 — 3장, 겹치는 곳은 2군데 (★ 3군데가 아니다)
  assert.ok(Math.abs(num(17) - (6.3 * 3 - 0.75 * 2)) < 1e-12, '17');

  // 18 — 2.84 + □ < 12.57 − 7.28 을 만족하는 가장 큰 소수 두 자리 수
  const limit = 12.57 - 7.28 - 2.84;
  let best18 = 0;
  for (let k = 1; k < 1000; k++) { const v = k / 100; if (2.84 + v < 12.57 - 7.28) best18 = v; }
  assert.ok(Math.abs(num(18) - best18) < 1e-12, `18 (한계 ${limit})`);
  assert.ok(Math.abs(num(18) - 2.44) < 1e-12);

  // 19 — 6·9·8과 소수점으로 만드는 □.□□ 의 가장 큰 수 + 가장 작은 수
  const made = [];
  for (const a of [6, 9, 8]) for (const b of [6, 9, 8]) for (const c of [6, 9, 8]) {
    if (a === b || b === c || a === c) continue;
    made.push(Number(`${a}.${b}${c}`));
  }
  assert.ok(Math.abs(num(19) - (Math.max(...made) + Math.min(...made))) < 1e-12, '19');

  // 20 — 재훈(2.5<x<3) · 유리(8 없음, 2<x<3) 의 차
  const pick = ['2.85', '3.01', '2.48', '2.42'];
  const jae = pick.filter((t) => Number(t) > 2.5 && Number(t) < 3);
  const yu = pick.filter((t) => !t.includes('8') && Number(t) > 2 && Number(t) < 3);
  assert.equal(jae.length, 1, `재훈이의 수가 하나로 안 정해진다: ${jae}`);
  assert.equal(yu.length, 1, `유리의 수가 하나로 안 정해진다: ${yu}`);
  assert.ok(Math.abs(num(20) - (Number(jae[0]) - Number(yu[0]))) < 1e-12, '20');
});

// ───────────────────── 채점 ─────────────────────

test('🎯 숫자는 **값으로** 본다 — 0.06 · 0.060 · .06 은 같은 답', () => {
  const p = { input: 'num', answer: '0.06' };
  for (const g of ['0.06', '0.060', '.06', ' 0.06 ', 0.06]) assert.equal(checkPart(p, g), true, String(g));
  for (const g of ['0.6', '0.006', '6', '', null, 'abc', '0.0 6']) assert.equal(checkPart(p, g), false, String(g));
});

test('🎯 고르기·여러 개·순서 채점', () => {
  assert.equal(checkPart({ input: 'choice', answer: '㉢' }, '㉢'), true);
  assert.equal(checkPart({ input: 'choice', answer: '㉢' }, '㉡'), false);

  const many = { input: 'many', choices: ['a', 'b', 'c'], answer: ['a', 'c'] };
  assert.equal(checkPart(many, ['c', 'a']), true, '순서는 상관없다');
  assert.equal(checkPart(many, ['a']), false, '하나만 고르면 틀림');
  assert.equal(checkPart(many, ['a', 'b', 'c']), false, '다 고르면 틀림');
  assert.equal(checkPart(many, ['a', 'c', 'c']), false, '같은 걸 두 번 넣어 개수를 맞출 수 없다');

  const order = { input: 'order', choices: ['㉠', '㉡', '㉢'], answer: ['㉡', '㉢', '㉠'] };
  assert.equal(checkPart(order, ['㉡', '㉢', '㉠']), true);
  assert.equal(checkPart(order, ['㉢', '㉡', '㉠']), false, '순서가 다르면 틀림');
  assert.equal(checkPart(order, ['㉡', '㉢']), false);
});

test('🎯 칸이 여럿인 문제는 **하나라도 틀리면** 틀린 것 (문제집도 그렇다)', () => {
  const it = byNo(7); // ㉠ 80.7 · ㉡ 0.807
  assert.equal(checkItem(it, ['80.7', '0.807']).ok, true);
  assert.deepEqual(checkItem(it, ['80.7', '8.07']).parts, [true, false]);
  assert.equal(checkItem(it, ['80.7', '8.07']).ok, false);
  assert.equal(checkItem(it, ['80.7']).ok, false, '안 낸 칸은 틀린 것');
});

// ───────────────────── 진도 · 보상 ─────────────────────

test('🎯 다음 회차는 **못 맞힌 것부터 번호 순서대로**, 다 맞히면 처음부터 다시', () => {
  const m = cloneMath(emptyMath());
  assert.deepEqual(nextItems(U3, m, 5).map((it) => it.no), [1, 2, 3, 4, 5]);
  assert.equal(nextNo(U3, m), 1);

  applyChalRound(m, 'u3', [{ no: 1, ok: true }, { no: 2, ok: true }, { no: 3, ok: false }], U3);
  assert.deepEqual(nextItems(U3, m, 3).map((it) => it.no), [3, 4, 5], '틀린 3번이 다시 나온다');
  assert.equal(solvedCount(m, U3), 2);

  for (const it of U3.items) applyChalRound(m, 'u3', [{ no: it.no, ok: true }], U3);
  assert.equal(setCleared(m, U3), true);
  assert.deepEqual(nextItems(U3, m, 2).map((it) => it.no), [1, 2], '다 맞히면 연습으로 처음부터');
});

test('🎯 보상은 **처음 맞힌 문제에만** — 같은 문제를 다시 풀어 캘 수 없다', () => {
  const m = cloneMath(emptyMath());
  const five = [1, 2, 3, 4, 5].map((no) => ({ no, ok: true }));

  const r1 = applyChalRound(m, 'u3', five, U3);
  assert.equal(r1.fresh, 5);
  const w1 = chalReward({ fresh: r1.fresh, n: 5, firstClear: r1.firstClear });
  assert.equal(w1.xp, REWARD.item.xp * 5 + REWARD.round.xp);
  assert.equal(w1.stone, 1);
  assert.equal(w1.throws, 1);
  assert.equal(w1.round, true);

  const r2 = applyChalRound(m, 'u3', five, U3);   // 똑같이 또 풀었다
  assert.equal(r2.correct, 5, '맞힌 건 맞다');
  assert.equal(r2.fresh, 0, '★ 처음이 아니라 보상은 0');
  const w2 = chalReward({ fresh: r2.fresh, n: 5, firstClear: r2.firstClear });
  assert.deepEqual([w2.xp, w2.coin, w2.stone, w2.throws, w2.round], [0, 0, 0, 0, false]);

  assert.equal(Number(m.chal.tries['u3-1']), 2, '푼 횟수는 쌓인다');
  assert.equal(Number(m.chal.ok['u3-1']), 1, '맞힘 표시는 1로 그대로');
});

test('🎯 한 회차를 **다 맞혔을 때만** 회차 보너스', () => {
  const four = chalReward({ fresh: 4, n: 5 });
  assert.equal(four.round, false);
  assert.equal(four.xp, REWARD.item.xp * 4);
  assert.equal(chalReward({ fresh: 5, n: 5 }).round, true);
  assert.equal(chalReward({ fresh: 0, n: 5 }).xp, 0);
  assert.equal(chalReward({ fresh: -3, n: 5 }).xp, 0, '음수는 0으로');
});

test('🏅 단원 완주 보상은 **한 번만** (백업을 되돌려도 두 번 안 준다)', () => {
  const m = cloneMath(emptyMath());
  let last = null;
  for (const it of U3.items) last = applyChalRound(m, 'u3', [{ no: it.no, ok: true }], U3);
  assert.equal(last.cleared, true);
  assert.equal(last.firstClear, true);
  const w = chalReward({ fresh: last.fresh, n: 1, firstClear: last.firstClear });
  assert.equal(w.set, true);
  assert.equal(w.items[REWARD.set.ball], 1);
  assert.equal(setClaimed(m, 'u3'), true);

  const again = applyChalRound(m, 'u3', [{ no: 1, ok: true }], U3);
  assert.equal(again.cleared, true);
  assert.equal(again.firstClear, false, '★ 두 번째부터는 단원 보상 없음');
  assert.equal(chalReward({ fresh: 0, n: 1, firstClear: again.firstClear }).set, false);
});

test('🎯 규칙이 입력을 건드리지 않는다 (cloneMath로 복사한 뒤에 쓴다)', () => {
  const src = cloneMath(emptyMath());
  applyChalRound(src, 'u3', [{ no: 1, ok: true }], U3);
  const copy = cloneMath(src);
  applyChalRound(copy, 'u3', [{ no: 2, ok: true }], U3);
  assert.equal(solved(src, 'u3', 2), false, '복사본을 고쳤는데 원본이 바뀌었다');
  assert.equal(solved(copy, 'u3', 2), true);
});

test('★ 🎯 백업을 되돌려도 푼 문제가 사라지지 않는다 (키마다 max)', () => {
  const now = cloneMath(emptyMath());
  for (const no of [1, 2, 3, 4, 5]) applyChalRound(now, 'u3', [{ no, ok: true }], U3);
  const old = cloneMath(emptyMath());
  applyChalRound(old, 'u3', [{ no: 1, ok: true }], U3);

  const merged = mergeStatRecord('profile', { ...now, id: 'math' }, { ...old, id: 'math' });
  for (const no of [1, 2, 3, 4, 5]) assert.equal(Number(merged.chal.ok[qid('u3', no)]), 1, `${no}번이 사라졌다`);
  assert.equal(merged.chal.rounds, 5, '회차 수는 큰 쪽');

  // 반대 방향도 같다
  const back = mergeStatRecord('profile', { ...old, id: 'math' }, { ...now, id: 'math' });
  assert.equal(Object.keys(back.chal.ok).filter((k) => back.chal.ok[k] > 0).length, 5);
});

test('🎯 사다리에 쓸 한 줄', () => {
  const m = cloneMath(emptyMath());
  assert.match(setNote(m, U3), /0\/20/);
  assert.match(setNote(m, U3), /1번/);
  for (const it of U3.items) applyChalRound(m, 'u3', [{ no: it.no, ok: true }], U3);
  assert.match(setNote(m, U3), /🏅/);
  assert.equal(ROUND_N, 5);
});

test('★ 🎯 새 파일 셋이 sw.js APP_SHELL에 있어야 한다 (빠지면 오프라인에서 도전 문제가 안 열린다)', async () => {
  const sw = fs.readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
  for (const f of ['./js/mathchal.js', './js/chalview.js', './coach/math/challenge.json']) {
    assert.ok(sw.includes(`'${f}'`), `${f}이 APP_SHELL에 없다`);
  }
});

test('★ ⏳ 도전 문제를 켜면 반드시 끄는 자리가 있어야 한다 (안 끄면 수학 시간이 영영 안 센다)', () => {
  const math = fs.readFileSync(new URL('../js/math.js', import.meta.url), 'utf8');
  const on = (math.match(/setExempt\(true\)/g) || []).length;
  const off = (math.match(/setExempt\(false\)/g) || []).length;
  assert.ok(on >= 1, 'setExempt(true)가 없다');
  assert.ok(off >= 1, 'setExempt(false)가 없다 — 켜 놓고 안 끄면 제한이 통째로 무의미해진다');
  // 끄는 곳(endChal)을 나가는 모든 길이 지나가는지 — 저장 실패·그만두기·끝내기
  assert.ok(/function endChal\(\)/.test(math), 'endChal이 없다');
  assert.ok((math.match(/endChal\(\)/g) || []).length >= 3, '나가는 길마다 endChal을 부르지 않는다');
});
