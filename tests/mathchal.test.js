// 🎯 도전 문제 규칙 + 문제집 자료 검산: node --test tests/mathchal.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  ROUND_N, REWARD, INPUTS, qid, setOf, setsOf, checkPart, checkItem,
  solved, solvedCount, setCleared, setClaimed, nextItems, nextNo, applyChalRound, chalReward, setNote,
} from '../js/mathchal.js';
import { cloneMath, emptyMath, mergeStatRecord } from '../js/db.js';
import { figureSvg, parseChart, chartGeom } from '../js/mathdraw.js';

const DATA = JSON.parse(fs.readFileSync(new URL('../coach/math/challenge.json', import.meta.url), 'utf8'));
const U3 = setOf(DATA, 'u3');
const byNo = (n) => U3.items.find((it) => it.no === n);
const ans = (n, i = 0) => byNo(n).parts[i].answer;
const num = (n, i = 0) => Number(ans(n, i));

// ───────────────────── 자료가 형식에 맞나 ─────────────────────

test('🎯 자료: 3단원 20문제, 번호가 1~20으로 빠짐·겹침 없음', () => {
  assert.equal(DATA.book, '만점왕 수학 플러스 4-2');
  assert.deepEqual(setsOf(DATA).map((s) => s.id), ['u3', 'u5'], '3단원 소수 · 5단원 꺾은선그래프 (2026-10-01)');
  assert.equal(U3.items.length, 20);
  assert.deepEqual(U3.items.map((it) => it.no), Array.from({ length: 20 }, (_, i) => i + 1));
  assert.ok(U3.unit.includes('소수') && U3.pages);
});

test('🎯 자료: 모든 칸이 쓸 수 있는 모양인가 (입력 방식·답·보기) — 두 단원 모두', () => {
  for (const it of setsOf(DATA).flatMap((s) => s.items)) {
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
      if (p.input === 'plot') {
        // 빈 그래프는 정답 그래프의 눈금 그대로 — 답은 그 그래프의 값과 같아야 (다르면 맞게 찍어도 틀린다)
        const sp = parseChart('lgraph', String(p.chart).replace(/^lgraph /, ''));
        assert.ok(sp && figureSvg(p.chart), `${it.no}번: 못 그리는 그래프 ${p.chart}`);
        assert.deepEqual(sp.items.map((x) => x.v), p.answer.map(Number), `${it.no}번: 답과 그래프 값이 다르다`);
        assert.ok(p.title, `${it.no}번: 그래프 제목이 없다`);
      }
    }
    // 그림은 모두 그려진다 (그래프 지시문·표)
    for (const f of [].concat(it.fig || [])) {
      if (f.kind === 'chart') assert.ok(figureSvg(f.spec), `${it.no}번: 못 그리는 그래프 ${f.spec}`);
      if (f.kind === 'charts') for (const c of f.list) assert.ok(figureSvg(c.spec), `${it.no}번: 못 그리는 그래프 ${c.spec}`);
      if (f.kind === 'table') assert.ok(f.rows.length >= 2 && f.rows.every((r) => r.length === f.rows[0].length), `${it.no}번: 표의 칸 수가 줄마다 다르다`);
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

// ───────────────────── ★ 5단원 꺾은선그래프 — 처음부터 다시 풀어 대조 (2026-10-01) ─────────────────────
// 문제집 숫자를 여기 **다시 적는다**(「정답과 풀이」 51~52쪽 + 풀이에 없는 점은 사진을 픽셀로 잰 값).
// ① 자료의 그래프 지시문이 이 숫자와 같은지 ② 이 숫자로 **계산한 답**이 자료의 답과 같은지 본다.
const U5 = setOf(DATA, 'u5');
const no5 = (n) => U5.items.find((it) => it.no === n);
const ans5 = (n, i = 0) => no5(n).parts[i].answer;
const BOOK = {
  ice: { '6월': 180, '7월': 280, '8월': 320, '9월': 260, '10월': 80 },          // 판매량(개), 눈금 한 칸 20
  milk: { 월: 0.6, 화: 0.7, 수: 1.1, 목: 0.5, 금: 0.4 },                       // L
  tour: { '2020년': 370, '2021년': 630, '2022년': 510, '2023년': 470, '2024년': 590 }, // 만 명
  rise: { '5일': '6:59', '10일': '6:55', '15일': '6:51', '20일': '6:47' },   // 오전
  set: { '5일': '4:59', '10일': '5:01', '15일': '5:04', '20일': '5:06' },    // 오후
  play: { 월: 270, 화: 290, 목: 330, 금: 360 },                              // 명 (수요일은 찢어짐)
  school: { '2020년': 295, '2021년': 305, '2022년': 280, '2023년': 270, '2024년': 300 }, // 명, 260부터
  skiIn: { '11월': 20, '12월': 27, '1월': 29, '2월': 23 },                    // 만 명
  skiWon: { '11월': 72, '12월': 84, '1월': 80, '2월': 72 },                   // 억 원
};
const toMin = (t) => { const [h, m] = String(t).split(':').map(Number); return h * 60 + m; };
/** 자료의 그래프 지시문 → {이름: 값} (시각은 분으로) */
const chartVals = (spec) => Object.fromEntries(parseChart('lgraph', spec.replace(/^lgraph /, '')).items.map((x) => [x.label, x.v]));
const figsOf = (n) => [].concat(no5(n).fig || []).flatMap((f) => (f.kind === 'charts' ? f.list : f.kind === 'chart' ? [f] : []));
const keysVals = (o) => Object.entries(o);
const argmax = (o) => keysVals(o).reduce((a, b) => (b[1] > a[1] ? b : a))[0];
const argmin = (o) => keysVals(o).reduce((a, b) => (b[1] < a[1] ? b : a))[0];

test('🎯 5단원: 20문제 1~20 · 그래프 지시문의 값이 문제집 숫자와 같다 (옮겨 적기 검사)', () => {
  assert.equal(U5.items.length, 20);
  assert.deepEqual(U5.items.map((it) => it.no), Array.from({ length: 20 }, (_, i) => i + 1));
  assert.ok(U5.unit.includes('꺾은선그래프') && U5.pages === '127~129쪽');
  for (const n of [1, 2, 3, 4, 5]) assert.deepEqual(chartVals(figsOf(n)[0].spec), BOOK.ice, `${n}번`);
  for (const n of [8, 9]) assert.deepEqual(chartVals(figsOf(n)[0].spec), BOOK.milk, `${n}번`);
  for (const n of [13, 14, 15]) {
    const [r, s] = figsOf(n).map((f) => chartVals(f.spec));
    assert.deepEqual(r, Object.fromEntries(keysVals(BOOK.rise).map(([k, v]) => [k, toMin(v)])), `${n}번 해 뜨는 시각`);
    assert.deepEqual(s, Object.fromEntries(keysVals(BOOK.set).map(([k, v]) => [k, toMin(v)])), `${n}번 해 지는 시각`);
  }
  for (const n of [16, 17]) assert.deepEqual(chartVals(figsOf(n)[0].spec), { ...BOOK.play, 수: null }, `${n}번 — 수요일은 찢어져 ?`);
  assert.deepEqual(chartVals(figsOf(18)[0].spec), BOOK.school);
  for (const n of [19, 20]) {
    const [a, b] = figsOf(n).map((f) => chartVals(f.spec));
    assert.deepEqual(a, BOOK.skiIn, `${n}번 입장객`); assert.deepEqual(b, BOOK.skiWon, `${n}번 매출액`);
  }
  // 표 — 06~09 우유, 10~12 관광객
  const milkT = [].concat(no5(6).fig)[0].rows; assert.deepEqual(milkT[1].slice(1).map(Number), Object.values(BOOK.milk));
  const tourT = [].concat(no5(10).fig)[0].rows; assert.deepEqual(tourT[1].slice(1).map((t) => Number(t.replace('만', ''))), Object.values(BOOK.tour));
  // 07·12 그리기의 답 = 표의 값
  assert.deepEqual(ans5(7), Object.values(BOOK.milk));
  assert.deepEqual(ans5(12), Object.values(BOOK.tour));
});

test('★ 🎯 5단원 검산 01~10 — 문제집 숫자로 다시 푼 답 = 자료의 답', () => {
  assert.deepEqual([ans5(1, 0), ans5(1, 1)], ['월', '판매량']);
  // 02 눈금 한 칸: 0과 100 사이 5칸
  assert.equal(Number(ans5(2)), 100 / 5);
  assert.equal(Number(ans5(3)), BOOK.ice['7월']);
  // 04 변화가 가장 큰 때 — 이웃한 두 달의 차가 가장 큰 곳 하나
  const months = Object.keys(BOOK.ice); const v = Object.values(BOOK.ice);
  const d = v.slice(1).map((x, i) => Math.abs(x - v[i])); const big = d.indexOf(Math.max(...d));
  assert.equal(d.filter((x) => x === d[big]).length, 1, '변화가 가장 큰 때가 둘이면 문제가 안 된다');
  assert.deepEqual([Number(ans5(4, 0)), Number(ans5(4, 1))], [parseInt(months[big], 10), parseInt(months[big + 1], 10)]);
  assert.equal(Number(ans5(5)), Math.max(...v) - Math.min(...v));
  // 06 세로 눈금 한 칸: 0.1·0.2·0.5·1 L 중 모든 값이 눈금선 위에 오는 것 (가장 큰 것)
  const m = Object.values(BOOK.milk);
  const fits = [0.1, 0.2, 0.5, 1].filter((s) => m.every((x) => Math.abs(Math.round(x / s) - x / s) < 1e-9));
  assert.equal(Number(ans5(6)), Math.max(...fits));
  // 08 전날보다 가장 많이 줄어든 요일
  const days = Object.keys(BOOK.milk); const dd = m.slice(1).map((x, i) => x - m[i]);
  assert.equal(ans5(8), `${days[dd.indexOf(Math.min(...dd)) + 1]}요일`);
  // 09 바르게 설명한 것 — 가장 많이 마신 날이 화요일인가 · 늘다가 주는가
  const top = argmax(BOOK.milk); const ti = days.indexOf(top);
  const upThenDown = m.slice(0, ti + 1).every((x, i) => !i || x > m[i - 1]) && m.slice(ti).every((x, i) => !i || x < m[ti + i - 1]);
  const truth = { '우유를 가장 많이 마신 날은 화요일입니다.': top === '화', '마신 우유의 양이 늘어났다가 줄어들고 있습니다.': upThenDown };
  assert.deepEqual([...ans5(9)].sort(), Object.keys(truth).filter((k) => truth[k]).sort());
  assert.deepEqual(no5(9).parts[0].choices.sort(), Object.keys(truth).sort());
  // 10 물결선: 350만·400만·450만 중 가장 작은 값(370만)보다 크지 않은 가장 큰 것
  const lo = Math.min(...Object.values(BOOK.tour));
  assert.equal(ans5(10), `${Math.max(...[350, 400, 450].filter((x) => x <= lo))}만 명`);
});

test('★ 🎯 5단원 검산 11~20 — 문제집 숫자로 다시 푼 답 = 자료의 답 · 18번은 그린 그래프에서 칸을 센다', () => {
  // 11 세로 눈금 한 칸: 350만부터 모든 값이 떨어지는 가장 큰 간격 (최대공약수)
  const gcd = (a, b) => (b ? gcd(b, a % b) : a);
  assert.equal(Number(ans5(11)), Object.values(BOOK.tour).map((x) => x - 350).reduce(gcd));
  // 13 빨라짐/늦어짐
  const r = Object.values(BOOK.rise).map(toMin); const s = Object.values(BOOK.set).map(toMin);
  const dir = (a) => (a.every((x, i) => !i || x < a[i - 1]) ? '점점 빨라지고 있습니다.' : a.every((x, i) => !i || x > a[i - 1]) ? '점점 늦어지고 있습니다.' : '변하지 않습니다.');
  assert.deepEqual([ans5(13, 0), ans5(13, 1)], [dir(r), dir(s)]);
  // 14 옳지 않은 것 — 다섯 문장을 따로 판정
  const dr = r.slice(1).map((x, i) => Math.abs(x - r[i]));
  const days = Object.keys(BOOK.rise);
  const st14 = [
    Math.max(...r) - Math.min(...r) > Math.max(...s) - Math.min(...s),                       // ① 해 뜨는 쪽 변화가 더 크다
    parseChart('lgraph', figsOf(14)[0].spec.replace(/^lgraph /, '')).step === 1 && parseChart('lgraph', figsOf(14)[1].spec.replace(/^lgraph /, '')).step === 1, // ② 한 칸 1분
    days[s.indexOf(Math.max(...s))] === '5일',                                                // ③ 해 지는 시각이 가장 늦은 때는 5일
    dr.filter((x) => x === Math.max(...dr)).length === 1 && dr.indexOf(Math.max(...dr)) === 1, // ④ 변화가 가장 큰 때는 10일과 15일 사이(하나뿐)
    s[days.indexOf('15일')] === toMin('5:04'),                                                // ⑤ 오후 5시 4분일 때는 15일
  ];
  const wrong = no5(14).parts[0].choices.filter((_, i) => !st14[i]);
  assert.deepEqual([...ans5(14)].sort(), wrong.sort());
  // 15 25일 해 뜨는 시각: 같은 만큼씩 빨라진다
  assert.ok(dr.every((x) => x === dr[0]), '해 뜨는 시각이 같은 만큼씩 변해야 짐작할 수 있다');
  const t25 = r[r.length - 1] - dr[0];
  assert.deepEqual([Number(ans5(15, 0)), Number(ans5(15, 1))], [Math.floor(t25 / 60), t25 % 60]);
  // 16 수요일 = 합 − 나머지 · 17 (금 − 목) ÷ 5
  assert.equal(Number(ans5(16)), 1620 - Object.values(BOOK.play).reduce((a, b) => a + b, 0));
  assert.equal(Number(ans5(17)), (BOOK.play.금 - BOOK.play.목) / 5);
  // 18 — 눈금에 수가 없는 그래프: **그린 SVG에서** 점이 260에서 몇 칸 위인지 재서, 305명인 해의 칸으로 한 칸을 알아낸다
  const spec18 = figsOf(18)[0].spec; const sp = parseChart('lgraph', spec18.replace(/^lgraph /, '')); const G = chartGeom(sp);
  const svg = figureSvg(spec18);
  const labels = [...svg.matchAll(/text-anchor="end" fill="currentColor">([^<]+)</g)].map((x) => x[1]);
  assert.deepEqual(labels.filter((t) => /^\d/.test(t)), ['260', '0'], '18번 그래프는 260(과 물결선 아래 0) 말고는 눈금에 수가 없어야 — 눈금 한 칸을 알아내는 문제');
  const cy = [...svg.matchAll(/<circle class="pt" data-i="(\d+)" cx="[\d.]+" cy="([\d.]+)"/g)].map((x) => [Number(x[1]), Number(x[2])]);
  const cellsAt = Object.fromEntries(cy.map(([i, y]) => [sp.items[i].label, Math.round((G.y0 - y) / G.ch)]));
  const topYear = argmax(cellsAt); // 점이 가장 높은 해 = 학생 수가 가장 많던 때
  const per = (305 - 260) / cellsAt[topYear];
  assert.ok(Number.isInteger(per), `한 칸이 정수가 아니다 (${per})`);
  assert.equal(Number(ans5(18)), 260 + per * cellsAt['2024년']);
  // 19 입장객이 가장 적은 달의 매출액 · 20 입장객은 늘고 매출은 준 달 → 줄어든 만큼
  const low = argmin(BOOK.skiIn);
  assert.deepEqual([Number(ans5(19, 0)), Number(ans5(19, 1))], [parseInt(low, 10), BOOK.skiWon[low]]);
  const mo = Object.keys(BOOK.skiIn);
  const hit = mo.filter((k, i) => i && BOOK.skiIn[k] > BOOK.skiIn[mo[i - 1]] && BOOK.skiWon[k] < BOOK.skiWon[mo[i - 1]]);
  assert.equal(hit.length, 1, '그런 달이 하나여야');
  const prev = mo[mo.indexOf(hit[0]) - 1];
  assert.deepEqual([Number(ans5(20, 0)), Number(ans5(20, 1))], [parseInt(hit[0], 10), BOOK.skiWon[prev] - BOOK.skiWon[hit[0]]]);
});

test('🎯 5단원: 그래프 그림 — 시각 눈금(6:45~7:00)·띄어쓴 단위(만 명) · 그린 점을 재면 지시문 값', () => {
  const [rise, set] = figsOf(13).map((f) => f.spec);
  const labs = (spec) => [...figureSvg(spec).matchAll(/text-anchor="end" fill="currentColor">([^<]+)</g)].map((x) => x[1]);
  assert.deepEqual(labs(rise), ['6:45', '6:50', '6:55', '7:00', '(시각)', '0']);
  assert.deepEqual(labs(set), ['4:55', '5:00', '5:05', '5:10', '(시각)', '0']);
  assert.ok(labs(figsOf(19)[0].spec).includes('(만 명)'));
  // 모든 그래프: 점·막대가 눈금선 위, 값 = 지시문 (시각은 분)
  for (const it of U5.items) {
    for (const f of figsOf(it.no)) {
      const sp = parseChart('lgraph', f.spec.replace(/^lgraph /, '')); const G = chartGeom(sp);
      for (const [, i, y] of figureSvg(f.spec).matchAll(/<circle class="pt" data-i="(\d+)" cx="[\d.]+" cy="([\d.]+)"/g)) {
        const k = (G.y0 - Number(y)) / G.ch;
        assert.ok(Math.abs(k - Math.round(k)) < 1e-6, `${it.no}번 ${f.spec}: 점이 눈금선 위가 아니다`);
        assert.ok(Math.abs(G.valueOfCells(Math.round(k)) - sp.items[Number(i)].v) < 1e-9, `${it.no}번 ${f.spec}: 점 ${i}의 값이 다르다`);
      }
    }
  }
});

test('🎯 점 여러 개 찍기(plot) 채점 — 모든 날이 제자리여야 · 하나라도 빠지거나 틀리면 틀림 · 그린 칸 → 값은 같은 자', () => {
  const p = no5(7).parts[0];
  assert.equal(checkPart(p, [0.6, 0.7, 1.1, 0.5, 0.4]), true);
  assert.equal(checkPart(p, ['0.6', '0.7', '1.1', '0.5', '0.4']), true);
  assert.equal(checkPart(p, [0.6, 0.7, 1.1, 0.5, 0.5]), false, '하나 틀림');
  assert.equal(checkPart(p, [0.6, 0.7, 1.1, 0.5, null]), false, '하나 안 찍음');
  assert.equal(checkPart(p, [0.6, 0.7, 1.1, 0.5]), false);
  assert.equal(checkPart(p, null), false);
  // 판(chalview)은 칸 → chartGeom.valueOfCells로 값을 낸다 — 정답 칸을 찍으면 정답 값
  for (const n of [7, 12]) {
    const q = no5(n).parts[0];
    const full = parseChart('lgraph', q.chart.replace(/^lgraph /, ''));
    const G = chartGeom({ ...full, top: Math.max(...q.answer), items: full.items.map((x) => ({ label: x.label, v: null })) });
    const drawn = q.answer.map((v) => G.valueOfCells(Math.round((v - full.base) / full.step)));
    assert.equal(checkPart(q, drawn), true, `${n}번: 정답 칸을 찍으면 맞아야`);
  }
});

test('🎯 회차를 저장하면 맨 위 칩(Lv·⚡·💰·🔷)을 다시 그린다 — 안 그리면 도전 문제를 푸는 내내 옛 숫자 (2026-10-01 헤드리스)', () => {
  const math = fs.readFileSync(new URL('../js/math.js', import.meta.url), 'utf8');
  const i = math.indexOf('const saved = await commitChalRound(');
  const j = math.indexOf('ui.state = saved.math;', i);
  assert.ok(i > 0 && j > i && /^\s*updateChip\(\);/.test(math.slice(j + 'ui.state = saved.math;'.length)), 'finishChal: ui.state = saved.math 바로 뒤에 updateChip()');
});

test('🎯 5단원 06·11 "눈금 한 칸은?": 07·12와 같은 빈 그래프가 같이 나오고, 그 칸 수에 들어맞는 눈금은 정답 하나뿐 (Codex 20차 #2)', () => {
  for (const [q, p, book, cands] of [[6, 7, BOOK.milk, [0.01, 0.02, 0.05, 0.1, 0.2, 0.25, 0.5, 1]], [11, 12, BOOK.tour, [1, 2, 4, 5, 10, 20, 25, 40, 50, 100]]]) {
    const figs = [].concat(no5(q).fig);
    const bg = figs.find((f) => f.kind === 'blankgraph');
    assert.ok(figs.some((f) => f.kind === 'table') && bg, `${q}번: 표 + 빈 그래프`);
    const plot = no5(p).parts.find((x) => x.input === 'plot');
    assert.equal(bg.chart, plot.chart, `${q}번 빈 그래프 = ${p}번 점 찍기 판 (같은 칸 수)`);
    assert.deepEqual(chartVals(bg.chart), book);
    // 화면이 그리는 빈 그래프와 같은 모양으로 칸 수를 잰다 (chalview.blankChart: top = 가장 큰 값)
    const full = parseChart('lgraph', bg.chart.replace(/^lgraph /, ''));
    const blank = { ...full, top: Math.max(...full.items.map((x) => x.v)), items: full.items.map((x) => ({ label: x.label, v: null })), hide: true };
    const cells = chartGeom(blank).cells;
    const K = 100; const sc = (v) => Math.round(v * K);
    const fits = cands.filter((s) => Object.values(book).every((v) => (sc(v) - sc(full.base)) % sc(s) === 0 && (sc(v) - sc(full.base)) / sc(s) <= cells));
    assert.deepEqual(fits.map(String), [no5(q).parts[0].answer], `${q}번: ${cells}칸에 들어맞는 눈금 ${fits}`);
    assert.match(no5(q).why, new RegExp(`${cells}칸`), `${q}번 풀이가 빈 그래프 칸 수를 말한다`);
  }
  const view = fs.readFileSync(new URL('../js/chalview.js', import.meta.url), 'utf8');
  assert.match(view, /case 'blankgraph': return blankGraphEl\(fig\);/);
  assert.match(view, /function plotInput\(part, wrap, onChange\) \{\s*const blank = blankChart\(part\.chart\);/, '점 찍기 판도 같은 blankChart');
  assert.match(view, /function blankGraphEl\(f\) \{\s*const blank = blankChart\(f\.chart, true\);/, '빈 그래프는 눈금 숫자를 숨긴다');
});

test('🎯 도전 문제 이어 풀기·⏳ 예외 끄기: 🎒·📊에서 돌아오면 풀던 문제로 · ← 뒤로와 사다리로 나가는 길은 endChal (Codex 20차 #1)', () => {
  const math = fs.readFileSync(new URL('../js/math.js', import.meta.url), 'utf8');
  assert.match(math, /if \(ui\.chal\) \{ ui\.run\+\+; resumeChal\(\); return; \}\s*const r = ui\.round;/, 'renderMath가 풀던 편보다 먼저 도전 문제를 이어 준다');
  assert.match(math, /back\.addEventListener\('click', \(\) => \{ ui\.round = null; ui\.daily = null; endChal\(\);/, '← 뒤로(홈)도 예외를 끈다');
  assert.match(math, /function renderLadder\(state\) \{[\s\S]{0,200}if \(ui\.chal\) endChal\(\);/, '사다리로 나오는 길은 전부 예외를 끈다');
  assert.match(math, /function resumeChal\(\) \{[\s\S]{0,300}if \(c\.phase === 'a'\) renderChalA\(\);\s*else renderChalQ\(\);/, '답한 뒤면 정답 화면을 채점 없이');
  assert.match(math, /function renderChalA\(\) \{[\s\S]{0,200}const r = c\.results\[c\.at\]/, '정답 화면은 저장된 채점 결과로');
  assert.ok(!/function renderChalA\(\) \{[\s\S]{0,400}checkItem\(/.test(math), '다시 그릴 때 다시 채점하지 않는다');
  assert.match(math, /c\.phase = 'saving';/, '저장 중 다녀와도 두 번 저장하지 않는다');
});
