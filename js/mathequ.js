// 🟰 수학 — Q 일차방정식 줄기 (중1 「일차방정식」): 개념 사다리 + 문제 생성기 + 내용 형식 검사. 순수 함수만 — 화면 없음 (node 테스트에서 그대로 돈다).
//
// 왜 이 줄기인가 (2026-10-03, 아버님 "D 문자와 식 먼저 가고 다음에 일차방정식 가자" → 설계안 "이대로 진행하자"): D 다음 칸.
// H 규칙과 대응의 □ 구하기가 방정식이 되고, D의 분배법칙·동류항·괄호 앞 −가 풀이에 다시 나온다.
// 범위: 2022 성취기준 [9수02-03] 방정식과 그 해의 뜻을 알고, 등식의 성질을 설명할 수 있다 · [9수02-04] 일차방정식을 풀 수 있고,
//   이를 활용하여 문제를 해결할 수 있다 (용어: 등식·방정식·미지수·해·근·항등식·이항·일차방정식 · "해의 타당성 확인")
//
// 오답은 아이가 실제로 하는 틀린 생각 흉내다:
//   · 등호 없는 식·부등호 식을 등식으로 · 2x에 3을 넣어 23 · 우변의 수를 해로 · 방정식을 항등식으로
//   · 한쪽 변에만 계산 · 0으로 나눔 · 빼야 할 것을 더함 · 나눠야 할 것을 빼거나 곱함 · 마지막에 나누기를 빠뜨림
//   · 이항할 때 부호를 그대로 · x항을 옮길 때 부호를 그대로 · 괄호 안 첫째 항에만 곱함 · 괄호 앞 −를 첫째 항에만
//   · 수만 있는 항에는 10·최소공배수를 곱하지 않음 · 구한 x와 묻는 것이 다름 · 한 사람만 나이를 먹음
//
// 새 줄기의 함정(메모 stem-generator-pitfalls)을 처음부터:
//   · 가족 = 틀 여러 개, 틀마다 수를 미리 뽑아 둔다 — 🔁 쌍둥이가 요청한 틀(tplKey)로 온다
//   · ★ tplKey는 숫자만 지운다 → 틀마다 부호(+·−)·계수 1 여부·보이는 수의 부호를 고정한다 (해는 음수여도 글에 보이는 수는 양수)
//   · 방정식은 질문 먼저, 식은 굵게 다음 줄 — 식 바로 뒤에 조사를 붙이지 않는다(분수 x/3 뒤는 특히)
//   · 해는 숫자판(± 늘 켬, 3단계), 등식·바꾼 식은 보기 고르기 · 틀린 방법이 우연히 맞는 값·오답끼리 같은 값은 뽑지 않는다
//   · 아직 안 배운 말: 항등식(Q2) → 등식의 성질(Q3) → 이항·일차방정식(Q5)
// ★ 정답·오답은 테스트가 **문제 글을 따로 읽어** 다시 푼다 (tests/mathequ.test.js).

import { rng, castOf, fill, int, pick, humanQuestion, checkHuman, diagnosticOf, placeFromOf, ladderOf } from './mathgen.js';
import { gradeLabel } from './mathmix.js';
import { _kit, valueOf } from './mathexpr.js';

export { gradeLabel };

const { famOf, runFamily, calcAsk, misAsk, showWork, branchOf, num, term, RIGHT_AS_WRONG, OFF } = _kit;
/** 계수 n의 x항 — 1이면 "x" (풀이에 "1x"가 나오지 않게) */
const tx = (n) => term(n, 'x');

/** 조건에 맞을 때까지 다시 뽑기 */
function draw(gen, ok) {
  for (let k = 0; k < 2000; k++) { const v = gen(); if (ok(v)) return v; }
  throw new Error('draw: 조건에 맞는 수를 못 뽑음');
}
const allDiff = (...vals) => new Set(vals.map((v) => String(v))).size === vals.length;
const isInt = (v) => Number.isInteger(v);
/** 소수 한 자리 → 글자 (0.3 · −1.1) */
const dec = (v) => num(Math.round(v * 10) / 10);
const gcd = (a, b) => (b ? gcd(b, a % b) : Math.abs(a));

const SOLVE = '다음 방정식의 해는 얼마일까요?';
const eqQ = (e) => `${SOLVE}\n\n**${e}**`;
const SCALE = (L, R, ask) => `저울이 수평이에요.\n\n[scale ${L} | ${R}]\n\n${ask}`;
const ONE_X = 'x 상자 하나의 무게는 1 추 몇 개와 같을까요?'; // Codex 27차: "x 한 개는 1 몇 개"보다 저울 그림의 말로

/** 이 줄기의 오개념 이름표 (📊·🤔 노트·결과 카드에 그대로 뜬다 — 아직 안 배운 말을 쓰지 않는다) */
export const TAGS = {
  // Q1 등식과 방정식
  exprAsEq: '등호가 없는 식을 등식으로 봄',
  ineqAsEq: '부등호가 있는 식을 등식으로 봄',
  calcAsEq: '계산식을 등식으로 봄',
  concat: '곱하지 않고 수를 나란히 붙임',
  addForMul: '곱해야 할 것을 더함',
  rhsAsSol: '우변의 수를 해로 봄',
  wrongReason: '틀린 까닭을 잘못 앎',
  // Q2 항등식
  eqAsIdent: '방정식을 항등식으로 봄',
  constAsLike: '상수항까지 x와 더해 같다고 봄',
  distribFirst: '괄호 안의 첫째 항에만 곱함',
  mulForAdd: '더해야 할 것을 곱함',
  firstOnly: '첫째 항만 봄',
  // Q3 등식의 성질
  oneSide: '한쪽 변에만 계산함',
  diffOps: '양변에 다른 계산을 함',
  divZero: '0으로 나눠도 된다고 봄',
  zeroMul: '0을 곱하는 것도 안 된다고 봄',
  rhsAsDiv: '우변의 수로 나눈다고 봄',
  solAsDiv: '해를 나눈 수로 봄',
  // Q4 등식의 성질로 풀기
  addInstead: '빼야 할 것을 더함',
  subInstead: '더해야 할 것을 뺌',
  dropConst: '더한 수를 빼지 않고 지움',
  subForDiv: '나눠야 할 것을 뺌',
  mulForDiv: '나눠야 할 것을 곱함',
  flipDiv: '나누는 순서를 바꿈',
  noDivide: '마지막에 나누기를 빠뜨림',
  // Q5 이항과 일차방정식
  moveSign: '이항할 때 부호를 바꾸지 않음',
  swapSides: '빼는 순서를 바꿈',
  coefMove: '곱해진 수까지 이항함',
  divSign: '음수로 나눌 때 부호를 바꾸지 않음',
  xCancel: 'x가 없어지는 방정식을 일차방정식으로 봄',
  squareLin: '차수가 2인 방정식을 일차방정식으로 봄',
  // Q6 양변에 x가 있는 방정식
  constSign: '수를 이항할 때 부호를 바꾸지 않음',
  xSign: 'x항을 이항할 때 부호를 바꾸지 않음',
  xOneSide: '한쪽의 x만 셈',
  // Q7 괄호가 있는 방정식
  signKeep: '음수를 곱할 때 둘째 항의 부호를 그대로 둠',
  signFlip: '괄호를 풀며 부호를 바꿈',
  minusFirst: '괄호 앞 −를 첫째 항에만 적용함',
  minusDrop: '괄호 앞 −를 빠뜨림',
  // Q8 계수가 분수·소수인 방정식
  mulOnlyX: '10을 x항에만 곱함',
  mulOnlyLeft: '좌변에만 10을 곱함',
  noLCDconst: '수만 있는 항에는 최소공배수를 곱하지 않음',
  flipMul: '분모마다 곱할 수를 바꿔 씀',
  // Q9 활용
  askedOther: '구한 x와 묻는 것이 다름',
  oneAges: '한 사람만 나이를 먹는다고 봄',
  allFour: '겹치는 막대까지 따로 셈',
};

// ───────────────────── 개념 사다리 (Q. 일차방정식 줄기) ─────────────────────

export const EQU = [
  {
    id: 'equ.eq', grade: 7, name: '등식과 방정식', needs: [],
    idea: '등호(=)를 써서 두 수나 식이 같음을 나타낸 식을 **등식**이라고 해요. 등호의 왼쪽은 **좌변**, 오른쪽은 **우변**, 둘을 함께 **양변**이라고 해요. x의 값에 따라 참이 되기도 하고 거짓이 되기도 하는 등식을 x에 대한 **방정식**, 이때 x를 **미지수**라고 해요. 방정식을 참이 되게 하는 x의 값이 그 방정식의 **해**(또는 **근**)예요.',
    rule: '등호가 있으면 등식 · x 자리에 넣어 양변이 같아지는 값이 해.',
    slip: '등호가 있는지, x 자리에 넣어 양변이 같아지는지 봐요.',
    calc(r, c) {
      const fams = [];
      fams.push(famOf([
        (() => { const [a, b, k, p, q, d] = [int(r, 2, 9), int(r, 1, 9), int(r, 11, 30), int(r, 2, 9), int(r, 2, 9), int(r, 1, 9)]; return { t: '다음 중 등식은 어느 것일까요?', text: true, ans: `${a}x + ${b} = ${k}`, wr: [{ text: `${a}x + ${b}`, tag: TAGS.exprAsEq }, { text: `${a}x + ${b} < ${k}`, tag: TAGS.ineqAsEq }, { text: `${p} × ${q} − ${d}`, tag: TAGS.calcAsEq }], steps: ['등호(=)로 두 수나 식이 같음을 나타낸 식이 등식', `${a}x + ${b} = ${k}에는 등호가 있어요`], why: { [TAGS.exprAsEq]: '등호가 없어서 등식이 아니에요 — 식일 뿐이에요.', [TAGS.ineqAsEq]: '<는 크기를 비교하는 기호예요. 등식은 등호(=)가 있어야 해요.', [TAGS.calcAsEq]: '계산식에는 등호가 없어요.' }, probe: { ask: 'iseq' } }; })(),
      ]));
      fams.push(famOf([
        (() => { const [a, s, b] = draw(() => [int(r, 2, 9), int(r, 2, 9), int(r, 1, 9)], ([a1, s1, b1]) => allDiff(a1 * s1 + b1, Number(`${a1}${s1}`) + b1, a1 + s1 + b1)); return { t: `다음 중 해가 x = ${s}인 방정식은 어느 것일까요?`, text: true, ans: `${a}x + ${b} = ${a * s + b}`, wr: [{ text: `${a}x + ${b} = ${Number(`${a}${s}`) + b}`, tag: TAGS.concat }, { text: `${a}x + ${b} = ${a + s + b}`, tag: TAGS.addForMul }], steps: [`x 자리에 ${s}를 넣어 양변이 같은지 봐요`, `${a} × ${s} + ${b} = ${a * s + b} → ${a}x + ${b} = ${a * s + b}`], why: { [TAGS.concat]: `${a}x는 ${a} × x — ${a}와 ${s}를 나란히 붙이면 안 돼요.`, [TAGS.addForMul]: `${a}x는 ${a} × x — 더하지 않고 곱해요.` }, probe: { ask: 'hassol', s } }; })(),
      ]));
      fams.push(famOf([
        (() => { const [a, s, b] = draw(() => [int(r, 2, 9), int(r, 1, 5), int(r, 1, 9)], ([a1, s1, b1]) => { const k = a1 * s1 + b1; return allDiff(s1, k, k - a1 - b1); }); const k = a * s + b; return { t: `x의 값이 1, 2, 3, 4, 5일 때, 방정식 ${a}x + ${b} = ${k}의 해는 얼마일까요?`, ans: num(s), wr: [{ text: num(k), tag: TAGS.rhsAsSol }, { text: num(k - a - b), tag: TAGS.addForMul }], steps: ['x에 1, 2, 3, 4, 5를 차례로 넣어 봐요', `x = ${s}일 때 ${a} × ${s} + ${b} = ${k} — 해는 x = ${s}`], why: { [TAGS.rhsAsSol]: `${k}는 우변의 수예요. 해는 x 자리에 넣어 참이 되는 값이에요.`, [TAGS.addForMul]: `${a}x는 ${a} × x — 더하지 않고 곱해서 확인해요.` }, probe: { ask: 'find' } }; })(),
      ]));
      return calcAsk(r, c, this, runFamily(r, c, fams));
    },
    misread(r, c) {
      if (branchOf(r, c, ['eq', 'sol']) === 'eq') {
        const [a, b] = [int(r, 2, 9), int(r, 1, 9)];
        return misAsk(r, c, this, 'eq', {
          q: `식 ${a}x + ${b}를 보고\n\n${showWork(`${a}x + ${b}도 등식이에요`)}`,
          ok: '등호(=)가 없어서 등식이 아니에요',
          wr: [{ text: '맞게 말했어요', tag: RIGHT_AS_WRONG }, { text: 'x가 있어서 등식이 아니에요', tag: TAGS.wrongReason }, { text: '식에는 x를 쓸 수 없어요', tag: OFF }],
          steps: ['등식은 등호(=)로 두 수나 식이 같음을 나타낸 식', `${a}x + ${b}에는 등호가 없어요`],
          whyAny: '등호가 없는 식은 등식이 아니에요. x가 있어도 등호가 있으면 등식이에요.',
          probe: { ask: 'eq', a, b },
        });
      }
      const [a, s, b] = draw(() => [int(r, 2, 9), int(r, 2, 9), int(r, 1, 9)], ([a1, s1, b1]) => allDiff(a1 * s1 + b1, Number(`${a1}${s1}`) + b1, a1 + s1 + b1));
      const k = a * s + b; const cc = Number(`${a}${s}`) + b;
      return misAsk(r, c, this, 'sol', {
        q: `방정식 ${a}x + ${b} = ${k}에 x = ${s}를 넣어 봐요.\n\n${showWork(`${a}${s} + ${b} = ${cc}이라서 x = ${s}는 해가 아니에요`)}`,
        ok: `${a}x는 ${a} × x — ${a} × ${s} + ${b} = ${k}라서 x = ${s}는 해예요`,
        wr: [{ text: '맞게 말했어요', tag: RIGHT_AS_WRONG }, { text: `${a} + ${s} + ${b} = ${a + s + b}라서 해가 아니에요`, tag: TAGS.addForMul }, { text: '방정식에는 수를 넣을 수 없어요', tag: OFF }],
        steps: [`${a}x = ${a} × x, x 자리에 ${s}`, `${a} × ${s} + ${b} = ${k} — 양변이 같아요`],
        whyAny: `${a}와 ${s}를 나란히 붙였어요. ${a}x는 ${a} × x예요.`,
        probe: { ask: 'sol', a, s, b },
      });
    },
  },

  {
    id: 'equ.ident', grade: 7, name: '항등식', needs: ['equ.eq'],
    idea: 'x에 어떤 값을 넣어도 늘 참인 등식을 x에 대한 **항등식**이라고 해요. 2x + 3x = 5x처럼 좌변을 간단히 하면 우변과 똑같아지는 등식이에요. 방정식은 어떤 값을 넣을 때만 참이지만, 항등식은 모든 값에서 참이에요.',
    rule: '양변을 간단히 해서 똑같으면 항등식 — 어떤 값을 넣어도 참.',
    slip: '양변을 간단히 했을 때 똑같은지 봐요.',
    calc(r, c) {
      const fams = [];
      fams.push(famOf([
        (() => { const [a, b, k, m, d] = [int(r, 2, 9), int(r, 2, 9), int(r, 2, 6), int(r, 2, 9), int(r, 11, 30)]; return { t: '다음 중 x에 대한 항등식은 어느 것일까요?', text: true, ans: `${a}x + ${b}x = ${a + b}x`, wr: [{ text: `${a}x + ${b} = ${a + b}x`, tag: TAGS.constAsLike }, { text: `${k}(x + ${m}) = ${k}x + ${m}`, tag: TAGS.distribFirst }, { text: `${a}x = ${d}`, tag: TAGS.eqAsIdent }], steps: ['좌변을 간단히 해서 우변과 똑같은지 봐요', `${a}x + ${b}x = ${a + b}x — 양변이 똑같아요`], why: { [TAGS.constAsLike]: `${b}는 상수항이라 x와 동류항이 아니에요 — x = 1일 때만 참인 방정식이에요.`, [TAGS.distribFirst]: `${k}(x + ${m}) = ${k}x + ${k * m} — 우변과 달라요.`, [TAGS.eqAsIdent]: `x에 따라 참·거짓이 바뀌는 방정식이에요.` }, probe: { ask: 'ident' } }; })(),
      ]));
      fams.push(famOf([
        (() => { const [k, m] = draw(() => [int(r, 2, 6), int(r, 2, 9)], ([k1, m1]) => allDiff(k1 * m1, m1, k1 + m1)); return { t: `등식 ${k}(x + ${m}) = ${k}x + □가 x에 대한 항등식이 되려면 □ 안에 알맞은 수는 얼마일까요?`, ans: num(k * m), wr: [{ text: num(m), tag: TAGS.distribFirst }, { text: num(k + m), tag: TAGS.addForMul }], steps: [`좌변을 간단히 하면 ${k}(x + ${m}) = ${k}x + ${k * m}`, `우변과 똑같으려면 □ = ${k * m}`], why: { [TAGS.distribFirst]: `괄호 안 ${m}에도 ${k}를 곱해요.`, [TAGS.addForMul]: `${k}와 ${m}를 곱해요 — 더하지 않아요.` }, probe: { ask: 'box', f: 'dist', k, m } }; })(),
        (() => { const [p, q, b] = draw(() => [int(r, 2, 9), int(r, 2, 9), int(r, 1, 9)], ([p1, q1]) => allDiff(p1 + q1, p1 * q1, p1)); return { t: `등식 ${p}x + ${q}x − ${b} = □x − ${b}가 x에 대한 항등식이 되려면 □ 안에 알맞은 수는 얼마일까요?`, ans: num(p + q), wr: [{ text: num(p * q), tag: TAGS.mulForAdd }, { text: num(p), tag: TAGS.firstOnly }], steps: [`좌변을 간단히 하면 ${p}x + ${q}x − ${b} = ${p + q}x − ${b}`, `우변과 똑같으려면 □ = ${p + q}`], why: { [TAGS.mulForAdd]: '동류항은 계수끼리 더해요 — 곱하지 않아요.', [TAGS.firstOnly]: `${q}x도 더해야 해요.` }, probe: { ask: 'box', f: 'like', p, q, b } }; })(),
      ]));
      return calcAsk(r, c, this, runFamily(r, c, fams));
    },
    misread(r, c) {
      if (branchOf(r, c, ['eq', 'dist']) === 'eq') {
        const [a, s, b] = [int(r, 2, 9), int(r, 1, 9), int(r, 1, 9)];
        const k = a * s + b;
        return misAsk(r, c, this, 'eq', {
          q: `등식 ${a}x + ${b} = ${k}를 보고\n\n${showWork(`${a}x + ${b} = ${k}도 항등식이에요`)}`,
          ok: `x = ${s}일 때만 참이라서 항등식이 아니라 방정식이에요`,
          wr: [{ text: '맞게 말했어요', tag: RIGHT_AS_WRONG }, { text: 'x가 있는 등식은 모두 항등식이에요', tag: TAGS.eqAsIdent }, { text: '등식에는 x를 쓸 수 없어요', tag: OFF }],
          // Codex 27차: "6 × 2 + 9 = 21 — 거짓"은 셈 자체가 맞아서 헷갈린다 → 원래 우변과 비교해 말한다
          steps: [`x = ${s}이면 좌변 ${a} × ${s} + ${b} = ${k}, 우변 ${k} — 같아서 참`, `x = ${s + 1}이면 좌변 ${a} × ${s + 1} + ${b} = ${a * (s + 1) + b}, 우변 ${k} — 달라서 거짓 → 방정식`],
          whyAny: '어떤 값을 넣을 때만 참이면 방정식이에요. 항등식은 모든 값에서 참이에요.',
          probe: { ask: 'eq', a, s, b },
        });
      }
      const [k, m] = draw(() => [int(r, 2, 6), int(r, 2, 9)], ([k1, m1]) => allDiff(k1 * m1, m1, k1 + m1));
      return misAsk(r, c, this, 'dist', {
        q: `등식 ${k}(x + ${m}) = ${k}x + ${m}를 보고\n\n${showWork(`${k}(x + ${m}) = ${k}x + ${m}는 항등식이에요`)}`,
        ok: `${k}(x + ${m}) = ${k}x + ${k * m}이라서 우변이 ${k}x + ${m}이면 항등식이 아니에요`,
        wr: [{ text: '맞게 말했어요', tag: RIGHT_AS_WRONG }, { text: `우변이 ${k}x + ${k + m}이어야 항등식이에요`, tag: TAGS.addForMul }, { text: '괄호가 있으면 항등식이 될 수 없어요', tag: OFF }],
        steps: [`${k}(x + ${m}) = ${k}x + ${k * m}`, `${k}x + ${k * m}과 ${k}x + ${m}는 달라요 → 항등식이 아니에요`],
        whyAny: '괄호 안 첫째 항에만 곱했어요. 둘째 항에도 곱해서 비교해요.',
        probe: { ask: 'dist', k, m },
      });
    },
  },

  {
    id: 'equ.prop', grade: 7, name: '등식의 성질', needs: ['equ.ident'],
    idea: '등식의 양변에 같은 수를 더하거나 빼거나 곱해도 등식은 그대로 성립해요. 0이 아닌 같은 수로 나누어도 성립해요. 이것을 **등식의 성질**이라고 해요. 수평인 저울 양쪽에 같은 무게를 올리거나 내려도 수평인 것과 같아요. 0으로는 나눌 수 없어요.',
    rule: '양변에 같은 수를 더하고 빼고 곱하고, 0이 아닌 같은 수로 나눠도 등식.',
    slip: '양변에 똑같이 했는지, 0으로 나누지 않았는지 봐요.',
    calc(r, c) {
      const fams = [];
      fams.push(famOf([
        (() => { const k = int(r, 2, 9); const op = pick(r, ['+', '−', '×', '÷']); const op2 = pick(r, ['+', '−', '×', '÷'].filter((o) => o !== op)); return { t: 'a = b일 때, 다음 중 항상 옳은 것은 어느 것일까요?', text: true, ans: `a ${op} ${k} = b ${op} ${k}`, wr: [{ text: `a ${op} ${k} = b`, tag: TAGS.oneSide }, { text: `a ${op} ${k} = b ${op2} ${k}`, tag: TAGS.diffOps }, { text: 'a ÷ 0 = b ÷ 0', tag: TAGS.divZero }], steps: ['양변에 같은 수로 같은 계산을 하면 등식', `a ${op} ${k} = b ${op} ${k}`], why: { [TAGS.oneSide]: '한쪽 변에만 계산하면 양변이 같다고 할 수 없어요.', [TAGS.diffOps]: '양변에 다른 계산을 하면 같다고 할 수 없어요 — 같은 계산을 해야 해요.', [TAGS.divZero]: '0으로는 나눌 수 없어요.' }, probe: { ask: 'prop', op, k } }; })(),
      ]));
      fams.push(famOf([
        (() => { const [a, s, b] = draw(() => [int(r, 2, 4), int(r, 1, 3), int(r, 1, 6)], ([a1, s1, b1]) => a1 * s1 + b1 <= 15); const k = a * s + b; return { t: SCALE(`${a}x + ${b}`, `${k}`, `양쪽에서 1 추를 ${b}개씩 덜어 내면, 오른쪽에 남는 1 추는 몇 개일까요?`), ans: num(k - b), wr: [{ text: num(k), tag: TAGS.oneSide }, { text: num(k + b), tag: TAGS.addInstead }], steps: [`오른쪽 1 추 ${k}개에서 ${b}개를 덜어 내요`, `${k} − ${b} = ${k - b}`], why: { [TAGS.oneSide]: '양쪽에서 똑같이 덜어 내야 수평이 그대로예요.', [TAGS.addInstead]: '덜어 내는 것은 빼기예요.' }, probe: { ask: 'take' } }; })(),
      ]));
      fams.push(famOf([
        (() => { const [a, s] = draw(() => [int(r, 2, 9), int(r, 2, 9)], ([a1, s1]) => allDiff(a1, s1, a1 * s1)); return { t: `방정식 ${a}x = ${a * s}의 양변을 같은 수로 나누어 x = ${s}를 얻었어요.\n\n양변을 얼마로 나누었을까요?`, ans: num(a), wr: [{ text: num(a * s), tag: TAGS.rhsAsDiv }, { text: num(s), tag: TAGS.solAsDiv }], steps: [`x 앞에 곱해진 수로 나누면 x만 남아요`, `${a}x ÷ ${a} = x, ${a * s} ÷ ${a} = ${s}`], why: { [TAGS.rhsAsDiv]: `${a * s}로 나누면 우변이 1이 돼요.`, [TAGS.solAsDiv]: `${s}는 나눈 결과 — 나눈 수는 x 앞의 ${a}예요.` }, probe: { ask: 'divby' } }; })(),
      ]));
      return calcAsk(r, c, this, runFamily(r, c, fams));
    },
    misread(r, c) {
      if (branchOf(r, c, ['one', 'zero']) === 'one') {
        const [b, k] = draw(() => [int(r, 2, 9), int(r, 3, 20)], ([b1, k1]) => k1 > b1);
        return misAsk(r, c, this, 'one', {
          q: `방정식 x + ${b} = ${k}를 풀어요.\n\n${showWork(`좌변에서만 ${b}를 빼면 x = ${k}예요`)}`,
          ok: `양변에서 똑같이 ${b}를 빼야 해요 — x = ${k} − ${b} = ${k - b}`,
          wr: [{ text: '맞게 말했어요', tag: RIGHT_AS_WRONG }, { text: `우변에는 ${b}를 더해서 x = ${k + b}예요`, tag: TAGS.addInstead }, { text: '등식에서는 아무 수도 뺄 수 없어요', tag: OFF }],
          steps: [`양변에서 ${b}를 빼면 x = ${k} − ${b}`, `x = ${k - b}`],
          whyAny: '한쪽 변에서만 뺐어요. 양변에서 똑같이 빼야 등식이 그대로예요.',
          probe: { ask: 'one', b, k },
        });
      }
      return misAsk(r, c, this, 'zero', {
        q: `a = b예요.\n\n${showWork('a ÷ 0 = b ÷ 0도 등식의 성질이에요')}`,
        ok: '0으로는 나눌 수 없어요 — 나누는 수는 0이 아니어야 해요',
        wr: [{ text: '맞게 말했어요', tag: RIGHT_AS_WRONG }, { text: 'a × 0 = b × 0도 성립하지 않아요', tag: TAGS.zeroMul }, { text: '등식의 양변에는 같은 수를 더할 수 없어요', tag: OFF }],
        steps: ['같은 수를 곱하는 것은 0이어도 돼요 — a × 0 = b × 0 = 0', '나누는 수만 0이 아니어야 해요'],
        whyAny: '0으로는 나눌 수 없어요. 등식의 성질에서 나누는 수는 0이 아닌 수예요.',
        probe: { ask: 'zero' },
      });
    },
  },

  {
    id: 'equ.solve', grade: 7, name: '등식의 성질로 방정식 풀기', needs: ['equ.prop'],
    idea: '등식의 성질로 방정식을 x = (수) 꼴로 만들어요. x + 3 = 7은 양변에서 3을 빼서 x = 4, 3x = 12는 양변을 3으로 나누어 x = 4예요. 2x + 1 = 9는 먼저 양변에서 1을 빼고(2x = 8) 양변을 2로 나누어 x = 4예요.',
    rule: '더해진 수는 양변에서 빼고, 곱해진 수는 양변을 나눠요 — 수만 있는 항을 먼저 없애고 나누면 편해요.', // Codex 27차: "순서는 빼기 먼저"는 규칙이 아니다(나누기 먼저도 맞고, 빼진 수는 더한다)
    slip: '양변에 똑같이 했는지, 마지막에 곱해진 수로 나눴는지 봐요.',
    calc(r, c) {
      const fams = [];
      fams.push(famOf([
        (() => { const [s, b] = draw(() => [int(r, 1, 9), int(r, 1, 6)], ([s1, b1]) => s1 + b1 <= 15); const k = s + b; return { t: SCALE(`x + ${b}`, `${k}`, ONE_X), ans: num(s), wr: [{ text: num(k + b), tag: TAGS.addInstead }, { text: num(k), tag: TAGS.dropConst }], steps: [`양쪽에서 1 추를 ${b}개씩 덜어 내요`, `x = ${k} − ${b} = ${s}`], why: { [TAGS.addInstead]: '덜어 내는 것은 빼기예요.', [TAGS.dropConst]: `왼쪽의 1 추 ${b}개도 함께 있어요 — 양쪽에서 빼요.` }, probe: { ask: 'scale' } }; })(),
        (() => { const [s, b] = draw(() => [int(r, -9, -1), int(r, 2, 12)], ([s1, b1]) => s1 + b1 > 0); const k = s + b; return { t: eqQ(`x + ${b} = ${k}`), ans: num(s), wr: [{ text: num(k + b), tag: TAGS.addInstead }, { text: num(k), tag: TAGS.dropConst }], steps: [`양변에서 ${b}를 빼요`, `x = ${k} − ${b} = ${num(s)}`], why: { [TAGS.addInstead]: `더해진 ${b}는 빼서 없애요.`, [TAGS.dropConst]: `${b}를 지우기만 하면 안 돼요 — 우변에서도 빼요.` }, probe: { ask: 'eq' } }; })(),
      ]));
      fams.push(famOf([
        (() => { const [a, s] = draw(() => [int(r, 2, 9), int(r, 2, 9)], ([a1, s1]) => allDiff(s1, a1 * s1 - a1)); const k = a * s; return { t: eqQ(`${a}x = ${k}`), ans: num(s), wr: [{ text: num(k - a), tag: TAGS.subForDiv }, { text: `${a}/${k}`, tag: TAGS.flipDiv }], steps: [`양변을 ${a}로 나눠요`, `x = ${k} ÷ ${a} = ${s}`], why: { [TAGS.subForDiv]: `${a}는 x에 곱해진 수 — 빼지 않고 나눠요.`, [TAGS.flipDiv]: `${k}를 ${a}로 나눠요 — 순서가 거꾸로예요.` }, probe: { ask: 'eq' } }; })(),
        (() => { const [a, s] = draw(() => [int(r, 2, 9), int(r, -9, -2)], ([a1, s1]) => allDiff(s1, a1 * s1 - a1)); const k = -a * s; return { t: eqQ(`${a}x = −${k}`), ans: num(s), wr: [{ text: num(-k - a), tag: TAGS.subForDiv }, { text: `−${a}/${k}`, tag: TAGS.flipDiv }], steps: [`양변을 ${a}로 나눠요`, `x = (−${k}) ÷ ${a} = ${num(s)}`], why: { [TAGS.subForDiv]: `${a}는 x에 곱해진 수 — 빼지 않고 나눠요.`, [TAGS.flipDiv]: `−${k}를 ${a}로 나눠요 — 순서가 거꾸로예요.` }, probe: { ask: 'eq' } }; })(),
      ]));
      fams.push(famOf([
        (() => { const [a, s, b] = draw(() => [int(r, 2, 4), int(r, 1, 3), int(r, 1, 6)], ([a1, s1, b1]) => { const k = a1 * s1 + b1; return k <= 15 && (k + b1) % a1 === 0 && allDiff(s1, k - b1, (k + b1) / a1); }); const k = a * s + b; return { t: SCALE(`${a}x + ${b}`, `${k}`, ONE_X), ans: num(s), wr: [{ text: num(k - b), tag: TAGS.noDivide }, { text: num((k + b) / a), tag: TAGS.addInstead }], steps: [`양쪽에서 1 추를 ${b}개씩 덜어 내면 x 상자 ${a}개와 1 추 ${k - b}개가 같아요`, `x 상자 하나는 1 추 ${k - b} ÷ ${a} = ${s}개`], why: { [TAGS.noDivide]: `x 상자가 ${a}개예요 — ${a}묶음으로 똑같이 나눠요.`, [TAGS.addInstead]: '덜어 내는 것은 빼기예요.' }, probe: { ask: 'scale' } }; })(),
        (() => { const [a, s, b] = draw(() => [int(r, 2, 9), int(r, 1, 9), int(r, 1, 9)], ([a1, s1, b1]) => { const k = a1 * s1 - b1; return k > 0 && (k - b1) % a1 === 0 && allDiff(s1, k + b1, (k - b1) / a1); }); const k = a * s - b; return { t: eqQ(`${a}x − ${b} = ${k}`), ans: num(s), wr: [{ text: num(k + b), tag: TAGS.noDivide }, { text: num((k - b) / a), tag: TAGS.subInstead }], steps: [`양변에 ${b}를 더하면 ${a}x = ${k + b}`, `양변을 ${a}로 나누면 x = ${s}`], why: { [TAGS.noDivide]: `${a}x = ${k + b}에서 양변을 ${a}로 나눠야 해요.`, [TAGS.subInstead]: `빼진 ${b}는 양변에 더해서 없애요.` }, probe: { ask: 'eq' } }; })(),
      ]));
      return calcAsk(r, c, this, runFamily(r, c, fams));
    },
    misread(r, c) {
      if (branchOf(r, c, ['sub', 'div']) === 'sub') {
        const [b, k] = draw(() => [int(r, 2, 9), int(r, 3, 20)], ([b1, k1]) => k1 > b1);
        return misAsk(r, c, this, 'sub', {
          q: `방정식 x + ${b} = ${k}를 풀어요.\n\n${showWork(`x = ${k} + ${b} = ${k + b}예요`)}`,
          ok: `양변에서 ${b}를 빼요 — x = ${k} − ${b} = ${k - b}`,
          wr: [{ text: '맞게 말했어요', tag: RIGHT_AS_WRONG }, { text: `${b}는 그냥 지워서 x = ${k}예요`, tag: TAGS.dropConst }, { text: 'x는 구할 수 없어요', tag: OFF }],
          steps: [`양변에서 ${b}를 빼면 x = ${k} − ${b}`, `x = ${k - b}`],
          whyAny: '더해진 수를 없애려면 양변에서 빼요. 더하면 오히려 커져요.',
          probe: { ask: 'sub', b, k },
        });
      }
      const [a, s] = draw(() => [int(r, 2, 9), int(r, 2, 9)], ([a1, s1]) => allDiff(s1, a1 * s1 - a1));
      const k = a * s;
      return misAsk(r, c, this, 'div', {
        q: `방정식 ${a}x = ${k}를 풀어요.\n\n${showWork(`x = ${k} − ${a} = ${k - a}예요`)}`,
        ok: `양변을 ${a}로 나눠요 — x = ${k} ÷ ${a} = ${s}`,
        wr: [{ text: '맞게 말했어요', tag: RIGHT_AS_WRONG }, { text: `x = ${k} × ${a} = ${k * a}예요`, tag: TAGS.mulForDiv }, { text: '곱해진 수가 있으면 풀 수 없어요', tag: OFF }],
        steps: [`${a}x = ${a} × x — 양변을 ${a}로 나눠요`, `x = ${s}`],
        whyAny: 'x에 곱해진 수는 빼지 않고 양변을 그 수로 나눠요.',
        probe: { ask: 'div', a, s },
      });
    },
  },

  {
    id: 'equ.move', grade: 7, name: '이항과 일차방정식', needs: ['equ.solve'],
    idea: '등식의 성질을 써서 한 변의 항을 **부호를 바꾸어** 다른 변으로 옮기는 것을 **이항**이라고 해요. x + 3 = 7에서 3을 이항하면 x = 7 − 3이에요. 이항해서 정리했을 때 (x에 대한 일차식) = 0 꼴이 되는 방정식을 x에 대한 **일차방정식**이라고 해요.',
    rule: '이항하면 부호가 바뀌어요 — 곱해진 수는 이항하지 않고 양변을 나눠요.',
    slip: '옮긴 항의 부호를 바꿨는지 봐요.',
    calc(r, c) {
      const fams = [];
      fams.push(famOf([
        (() => { const [a, b, k] = draw(() => [int(r, 2, 9), int(r, 2, 9), int(r, 2, 20)], ([a1, b1, k1]) => b1 !== k1 && (k1 - b1 - a1) * a1 !== k1 - b1); return { t: `방정식 ${a}x + ${b} = ${k}에서 ${b}를 이항하면 어느 것일까요?`, text: true, ans: `${a}x = ${k} − ${b}`, wr: [{ text: `${a}x = ${k} + ${b}`, tag: TAGS.moveSign }, { text: `${a}x = ${b} − ${k}`, tag: TAGS.swapSides }, { text: `x = ${k} − ${b} − ${a}`, tag: TAGS.coefMove }], steps: [`+${b}를 우변으로 옮기면 −${b}`, `${a}x = ${k} − ${b}`], why: { [TAGS.moveSign]: '이항하면 부호가 바뀌어요.', [TAGS.swapSides]: `우변 ${k}에서 ${b}를 빼요 — 순서가 거꾸로예요.`, [TAGS.coefMove]: `${a}는 x에 곱해진 수예요 — 이항하지 않아요.` }, probe: { ask: 'move' } }; })(),
      ]));
      fams.push(famOf([
        (() => { const [a, b, k, d] = [int(r, 2, 9), int(r, 1, 9), int(r, 2, 20), int(r, 1, 9)]; return { t: '다음 중 일차방정식은 어느 것일까요?', text: true, ans: `${a}x − ${b} = ${k}`, wr: [{ text: `${a}x + ${b} = ${a}x − ${d}`, tag: TAGS.xCancel }, { text: `x² + ${b} = ${k}`, tag: TAGS.squareLin }, { text: `${a}x − ${b}`, tag: TAGS.exprAsEq }], steps: ['우변을 모두 좌변으로 이항해 (x에 대한 일차식) = 0 꼴인지 봐요', `${a}x − ${b} = ${k}에서 ${k}를 이항하면 ${a}x − ${b + k} = 0 → 일차방정식`], why: { [TAGS.xCancel]: '이항하면 x가 없어져요 — 일차방정식이 아니에요.', [TAGS.squareLin]: 'x²은 차수가 2예요.', [TAGS.exprAsEq]: '등호가 없어서 방정식이 아니에요.' }, probe: { ask: 'linear' } }; })(),
      ]));
      fams.push(famOf([
        (() => { const [a, b, k] = draw(() => [int(r, 2, 9), int(r, 2, 20), int(r, 1, 20)], ([a1, b1, k1]) => b1 !== k1 && (b1 - k1) % a1 === 0); const s = (b - k) / a; return { t: eqQ(`${b} − ${a}x = ${k}`), ans: num(s), wr: [{ text: num(k - b), tag: TAGS.noDivide }, { text: num(-s), tag: TAGS.divSign }], steps: [`${b}를 이항하면 −${a}x = ${k} − ${b} = ${num(k - b)}`, `양변을 −${a}로 나누면 x = ${num(s)}`], why: { [TAGS.noDivide]: `−${a}x = ${num(k - b)}에서 양변을 −${a}로 나눠야 해요.`, [TAGS.divSign]: `x 앞의 수는 −${a} — 음수로 나누면 부호가 바뀌어요.` }, probe: { ask: 'eq' } }; })(),
      ]));
      return calcAsk(r, c, this, runFamily(r, c, fams));
    },
    misread(r, c) {
      if (branchOf(r, c, ['sign', 'coef']) === 'sign') {
        const [a, b, k] = draw(() => [int(r, 2, 9), int(r, 2, 9), int(r, 2, 20)], ([, b1, k1]) => b1 !== k1);
        return misAsk(r, c, this, 'sign', {
          q: `방정식 ${a}x + ${b} = ${k}에서 ${b}를 이항해요.\n\n${showWork(`${a}x = ${k} + ${b}`)}`,
          ok: `이항하면 부호가 바뀌어요 — ${a}x = ${k} − ${b}`,
          wr: [{ text: '맞게 말했어요', tag: RIGHT_AS_WRONG }, { text: `${a}x = ${b} − ${k}`, tag: TAGS.swapSides }, { text: '상수항은 이항할 수 없어요', tag: OFF }],
          steps: [`좌변의 +${b} → 우변으로 옮기면 −${b}`, `${a}x = ${k} − ${b}`],
          whyAny: '이항할 때 부호를 그대로 두었어요. 옮기면 +는 −, −는 +가 돼요.',
          probe: { ask: 'sign', a, b, k },
        });
      }
      const [a, s] = draw(() => [int(r, 2, 9), int(r, 2, 9)], ([a1, s1]) => allDiff(s1, a1 * s1 - a1, a1 * s1 + a1));
      const k = a * s;
      return misAsk(r, c, this, 'coef', {
        q: `방정식 ${a}x = ${k}를 풀어요.\n\n${showWork(`${a}를 이항하면 x = ${k} − ${a}`)}`,
        ok: `${a}는 x에 곱해진 수라서 이항하지 않고 양변을 ${a}로 나눠요 — x = ${s}`,
        wr: [{ text: '맞게 말했어요', tag: RIGHT_AS_WRONG }, { text: `x = ${k} + ${a}예요`, tag: TAGS.moveSign }, { text: '곱해진 수가 있으면 이항할 수 없어서 풀 수 없어요', tag: OFF }],
        steps: [`${a}x = ${a} × x — 더해진 항이 아니에요`, `양변을 ${a}로 나누면 x = ${s}`],
        whyAny: '곱해진 수는 이항하지 않아요. 양변을 그 수로 나눠요.',
        probe: { ask: 'coef', a, s },
      });
    },
  },

  {
    id: 'equ.both', grade: 7, name: '양변에 x가 있는 방정식', needs: ['equ.move'],
    idea: 'x가 있는 항은 좌변으로, 수만 있는 항은 우변으로 이항해서 (수)x = (수) 꼴로 정리한 다음 양변을 x의 계수로 나눠요. 5x − 3 = 2x + 9 → 5x − 2x = 9 + 3 → 3x = 12 → x = 4. 구한 해를 처음 방정식에 넣어 맞는지 확인해요.',
    rule: 'x항은 왼쪽, 수는 오른쪽 — 옮긴 항은 부호를 바꿔요.',
    slip: 'x항과 수를 옮길 때 둘 다 부호를 바꿨는지 봐요.',
    calc(r, c) {
      const fams = [];
      fams.push(famOf([
        (() => { const [a, cc, b, d] = draw(() => [int(r, 3, 9), int(r, 2, 8), int(r, 1, 9), int(r, 1, 20)], ([a1, c1, b1, d1]) => a1 > c1 && (d1 + b1) % (a1 - c1) === 0 && (d1 + b1) / (a1 - c1) <= 10 && (d1 - b1) % (a1 - c1) === 0 && allDiff((d1 + b1) / (a1 - c1), (d1 - b1) / (a1 - c1), d1 + b1)); const s = (d + b) / (a - cc); return { t: eqQ(`${a}x − ${b} = ${cc}x + ${d}`), ans: num(s), wr: [{ text: num((d - b) / (a - cc)), tag: TAGS.constSign }, { text: num(d + b), tag: TAGS.noDivide }], steps: [`이항하면 ${a}x − ${cc}x = ${d} + ${b}`, `${tx(a - cc)} = ${d + b}, x = ${s}`], why: { [TAGS.constSign]: `−${b}를 이항하면 +${b}예요.`, [TAGS.noDivide]: `${a - cc}x = ${d + b}에서 양변을 ${a - cc}로 나눠요.` }, probe: { ask: 'eq' } }; })(),
        (() => { const [a, b, k, d] = draw(() => [int(r, 2, 9), int(r, 2, 20), int(r, 1, 20), int(r, 2, 9)], ([a1, b1, k1, d1]) => a1 !== d1 && k1 !== b1 && (k1 - b1) % (a1 + d1) === 0 && Math.abs((k1 - b1) / (a1 + d1)) <= 10 && (k1 - b1) % (a1 - d1) === 0 && allDiff((k1 - b1) / (a1 + d1), (k1 - b1) / (a1 - d1), k1 - b1)); const s = (k - b) / (a + d); return { t: eqQ(`${a}x + ${b} = ${k} − ${d}x`), ans: num(s), wr: [{ text: num((k - b) / (a - d)), tag: TAGS.xSign }, { text: num(k - b), tag: TAGS.noDivide }], steps: [`이항하면 ${a}x + ${d}x = ${k} − ${b}`, `${a + d}x = ${num(k - b)}, x = ${num(s)}`], why: { [TAGS.xSign]: `−${d}x를 이항하면 +${d}x예요.`, [TAGS.noDivide]: `${a + d}x = ${num(k - b)}에서 양변을 ${a + d}로 나눠요.` }, probe: { ask: 'eq' } }; })(),
      ]));
      fams.push(famOf([
        (() => { const [a, s, b] = draw(() => [int(r, 2, 4), int(r, 1, 4), int(r, 1, 6)], ([a1, s1, b1]) => { const d = (a1 - 1) * s1 + b1; return d <= 15 && a1 * s1 + b1 <= 15 && (d - b1) % a1 === 0 && allDiff(s1, d - b1, (d - b1) / a1); }); const d = (a - 1) * s + b; return { t: SCALE(`${a}x + ${b}`, `x + ${d}`, ONE_X), ans: num(s), wr: [{ text: num(d - b), tag: TAGS.noDivide }, { text: num((d - b) / a), tag: TAGS.xOneSide }], steps: [`양쪽에서 x 상자를 1개씩, 1 추를 ${b}개씩 덜어 내면 x 상자 ${a - 1}개와 1 추 ${d - b}개가 같아요`, `x 상자 하나는 1 추 ${d - b} ÷ ${a - 1} = ${s}개`], why: { [TAGS.noDivide]: `x 상자가 ${a - 1}개 남아요 — 그 수로 똑같이 나눠요.`, [TAGS.xOneSide]: '오른쪽에도 x 상자가 1개 있어요 — 양쪽에서 똑같이 덜어 내요.' }, probe: { ask: 'scale' } }; })(),
      ]));
      return calcAsk(r, c, this, runFamily(r, c, fams));
    },
    misread(r, c) {
      const pickNums = () => draw(() => [int(r, 3, 9), int(r, 2, 8), int(r, 1, 9), int(r, 1, 20)], ([a1, c1, b1, d1]) => a1 > c1 && b1 !== d1);
      if (branchOf(r, c, ['xsign', 'const']) === 'xsign') {
        const [a, cc, b, d] = pickNums();
        return misAsk(r, c, this, 'xsign', {
          q: `방정식 ${a}x − ${b} = ${cc}x + ${d}를 정리해요.\n\n${showWork(`${a}x + ${cc}x = ${d} + ${b}`)}`,
          ok: `x항도 이항하면 부호가 바뀌어요 — ${a}x − ${cc}x = ${d} + ${b}`,
          wr: [{ text: '맞게 말했어요', tag: RIGHT_AS_WRONG }, { text: `${a}x − ${cc}x = ${d} − ${b}`, tag: TAGS.constSign }, { text: 'x가 양변에 있으면 풀 수 없어요', tag: OFF }],
          steps: [`우변의 +${cc}x → 좌변으로 −${cc}x, 좌변의 −${b} → 우변으로 +${b}`, `${a}x − ${cc}x = ${d} + ${b}`],
          whyAny: 'x항을 이항할 때 부호를 그대로 두었어요. x항도 옮기면 부호가 바뀌어요.',
          probe: { ask: 'xsign', a, cc, b, d },
        });
      }
      const [a, cc, b, d] = pickNums();
      return misAsk(r, c, this, 'const', {
        q: `방정식 ${a}x − ${b} = ${cc}x + ${d}를 정리해요.\n\n${showWork(`${a}x − ${cc}x = ${d} − ${b}`)}`,
        ok: `−${b}를 이항하면 +${b} — ${a}x − ${cc}x = ${d} + ${b}`,
        wr: [{ text: '맞게 말했어요', tag: RIGHT_AS_WRONG }, { text: `${a}x + ${cc}x = ${d} + ${b}`, tag: TAGS.xSign }, { text: '수만 있는 항은 이항할 수 없어요', tag: OFF }],
        steps: [`좌변의 −${b} → 우변으로 +${b}`, `${a}x − ${cc}x = ${d} + ${b}`],
        whyAny: '수를 이항할 때 부호를 그대로 두었어요. 옮기면 −는 +가 돼요.',
        probe: { ask: 'const', a, cc, b, d },
      });
    },
  },

  {
    id: 'equ.paren', grade: 7, name: '괄호가 있는 방정식', needs: ['equ.both'],
    idea: '괄호가 있으면 분배법칙으로 괄호를 먼저 풀어요. 2(x − 3) = x + 4 → 2x − 6 = x + 4 → 2x − x = 4 + 6 → x = 10. 괄호 앞이 −이면 괄호 안 모든 항의 부호를 바꿔요.',
    rule: '괄호를 먼저 풀고(모든 항에 곱하기) 이항해요 — 괄호 앞 −는 모든 부호를 바꿔요.',
    slip: '괄호 안 둘째 항에도 곱했는지, 부호를 바꿨는지 봐요.',
    calc(r, c) {
      const fams = [];
      fams.push(famOf([
        (() => { const [k, m, cc, d] = draw(() => [int(r, 3, 6), int(r, 1, 9), int(r, 2, 5), int(r, 1, 20)], ([k1, m1, c1, d1]) => k1 > c1 && (d1 + k1 * m1) % (k1 - c1) === 0 && (d1 + k1 * m1) / (k1 - c1) <= 10 && (d1 + m1) % (k1 - c1) === 0 && allDiff((d1 + k1 * m1) / (k1 - c1), (d1 + m1) / (k1 - c1), d1 + k1 * m1)); const s = (d + k * m) / (k - cc); return { t: eqQ(`${k}(x − ${m}) = ${cc}x + ${d}`), ans: num(s), wr: [{ text: num((d + m) / (k - cc)), tag: TAGS.distribFirst }, { text: num(d + k * m), tag: TAGS.noDivide }], steps: [`괄호를 풀면 ${k}x − ${k * m} = ${cc}x + ${d}`, `${tx(k - cc)} = ${d + k * m}, x = ${s}`], why: { [TAGS.distribFirst]: `괄호 안 ${m}에도 ${k}를 곱해 −${k * m}이에요.`, [TAGS.noDivide]: `${k - cc}x = ${d + k * m}에서 양변을 ${k - cc}로 나눠요.` }, probe: { ask: 'eq' } }; })(),
      ]));
      fams.push(famOf([
        (() => { const [a, p, q, k] = draw(() => [int(r, 4, 9), int(r, 2, 7), int(r, 1, 9), int(r, 1, 30)], ([a1, p1, q1, k1]) => a1 > p1 && k1 !== q1 && (k1 - q1) % (a1 - p1) === 0 && Math.abs((k1 - q1) / (a1 - p1)) <= 10 && (k1 + q1) % (a1 - p1) === 0 && (k1 + q1) % (a1 + p1) === 0 && allDiff((k1 - q1) / (a1 - p1), (k1 + q1) / (a1 - p1), (k1 + q1) / (a1 + p1))); const s = (k - q) / (a - p); return { t: eqQ(`${a}x − (${p}x − ${q}) = ${k}`), ans: num(s), wr: [{ text: num((k + q) / (a - p)), tag: TAGS.minusFirst }, { text: num((k + q) / (a + p)), tag: TAGS.minusDrop }], steps: [`괄호를 풀면 ${a}x − ${p}x + ${q} = ${k}`, `${tx(a - p)} = ${num(k - q)}, x = ${num(s)}`], why: { [TAGS.minusFirst]: `괄호 앞 −로 −${q}도 +${q}가 돼요.`, [TAGS.minusDrop]: `괄호 앞 −를 빠뜨렸어요 — −${p}x예요.` }, probe: { ask: 'eq' } }; })(),
      ]));
      fams.push(famOf([
        (() => { const [k, m, j] = draw(() => [int(r, 2, 6), int(r, 1, 5), int(r, 1, 5)], ([k1, m1, j1]) => allDiff(-(j1 + m1), m1 - j1, k1 * j1 + k1 * m1, 0)); const cc = k * j; const s = -(j + m); return { t: eqQ(`−${k}(x + ${m}) = ${cc}`), ans: num(s), wr: [{ text: num(m - j), tag: TAGS.signKeep }, { text: num(cc + k * m), tag: TAGS.noDivide }], steps: [`괄호를 풀면 −${k}x − ${k * m} = ${cc}`, `−${k}x = ${cc + k * m}, x = ${num(s)}`], why: { [TAGS.signKeep]: `−${k} × ${m} = −${k * m} — 부호가 바뀌어요.`, [TAGS.noDivide]: `−${k}x = ${cc + k * m}에서 양변을 −${k}로 나눠요.` }, probe: { ask: 'eq' } }; })(),
      ]));
      return calcAsk(r, c, this, runFamily(r, c, fams));
    },
    misread(r, c) {
      if (branchOf(r, c, ['first', 'minus']) === 'first') {
        const [k, m, d] = draw(() => [int(r, 2, 6), int(r, 2, 9), int(r, 1, 30)], ([k1, m1, d1]) => d1 !== k1 * m1);
        return misAsk(r, c, this, 'first', {
          q: `방정식 ${k}(x − ${m}) = ${d}의 괄호를 풀어요.\n\n${showWork(`${k}x − ${m} = ${d}`)}`,
          ok: `괄호 안 모든 항에 곱해요 — ${k}x − ${k * m} = ${d}`,
          wr: [{ text: '맞게 말했어요', tag: RIGHT_AS_WRONG }, { text: `${k}x + ${k * m} = ${d}`, tag: TAGS.signFlip }, { text: '괄호가 있으면 방정식을 풀 수 없어요', tag: OFF }],
          steps: [`${k} × x = ${k}x, ${k} × (−${m}) = −${k * m}`, `${k}x − ${k * m} = ${d}`],
          whyAny: '괄호 안 첫째 항에만 곱했어요. 분배법칙은 모든 항에 곱해요.',
          probe: { ask: 'first', k, m, d },
        });
      }
      const [a, p, q, k] = draw(() => [int(r, 4, 9), int(r, 2, 7), int(r, 1, 9), int(r, 1, 30)], ([a1, p1, q1, k1]) => a1 > p1 && k1 !== q1);
      return misAsk(r, c, this, 'minus', {
        q: `방정식 ${a}x − (${p}x − ${q}) = ${k}의 괄호를 풀어요.\n\n${showWork(`${a}x − ${p}x − ${q} = ${k}`)}`,
        ok: `괄호 앞 −는 모든 항의 부호를 바꿔요 — ${a}x − ${p}x + ${q} = ${k}`,
        wr: [{ text: '맞게 말했어요', tag: RIGHT_AS_WRONG }, { text: `${a}x + ${p}x − ${q} = ${k}`, tag: TAGS.minusDrop }, { text: '괄호 앞에 −가 있으면 풀 수 없어요', tag: OFF }],
        steps: [`−(${p}x − ${q}) = −${p}x + ${q}`, `${a}x − ${p}x + ${q} = ${k}`],
        whyAny: '괄호 앞 −를 첫째 항에만 적용했어요. 둘째 항의 부호도 바뀌어요.',
        probe: { ask: 'minus', a, p, q, k },
      });
    },
  },

  {
    id: 'equ.frac', grade: 7, name: '계수가 분수·소수인 방정식', needs: ['equ.paren'],
    idea: '계수가 소수이면 양변에 10을 곱하고, 분수이면 양변에 분모의 최소공배수를 곱해서 계수를 정수로 고친 다음 풀어요. 이때 수만 있는 항까지 **모든 항**에 곱해야 해요. 0.3x + 0.2 = 1.1 → 양변에 10을 곱하면 3x + 2 = 11 → x = 3.',
    rule: '소수는 10을, 분수는 분모의 최소공배수를 모든 항에 곱해요.',
    slip: '수만 있는 항에도 곱했는지 봐요.',
    calc(r, c) {
      const fams = [];
      fams.push(famOf([
        (() => { const [A, B, s] = draw(() => [int(r, 2, 9), int(r, 1, 9), int(r, 1, 9)], ([A1, B1, s1]) => { const C = A1 * s1 + B1; return C % 10 !== 0 && C < 100 && (C - 10 * B1) % A1 === 0 && allDiff(s1, s1 / 10, (C - 10 * B1) / A1 / 10); }); const C = A * s + B; return { t: eqQ(`0.${A}x + 0.${B} = ${dec(C / 10)}`), ans: num(s), wr: [{ text: dec(s / 10), tag: TAGS.mulOnlyX }, { text: dec((C - 10 * B) / A / 10), tag: TAGS.mulOnlyLeft }], steps: [`양변에 10을 곱하면 ${A}x + ${B} = ${C}`, `${A}x = ${C - B}, x = ${s}`], why: { [TAGS.mulOnlyX]: `0.${B}와 ${dec(C / 10)}에도 10을 곱해요.`, [TAGS.mulOnlyLeft]: `우변 ${dec(C / 10)}에도 10을 곱해요.` }, probe: { ask: 'eq' } }; })(),
      ]));
      fams.push(famOf([
        (() => { const [[p, q], t, b] = draw(() => [pick(r, [[2, 3], [3, 4], [2, 5], [4, 6], [3, 5]]), pick(r, [-2, -1, 1, 2]), int(r, 1, 9)], ([[p1, q1], t1, b1]) => { const L = p1 * q1 / gcd(p1, q1); const s1 = L * t1; const d = b1 + s1 / p1 - s1 / q1; return isInt(d) && d >= 1 && d <= 20 && d !== b1 && Math.abs(s1) <= 24; }); const L = p * q / gcd(p, q); const s = L * t; const d = b + s / p - s / q; return { t: eqQ(`x/${p} + ${b} = x/${q} + ${d}`), ans: num(s), wr: [{ text: num(t), tag: TAGS.noLCDconst }, { text: num(-s), tag: TAGS.moveSign }], steps: [`양변에 ${p}와 ${q}의 최소공배수 ${L}를 곱하면 ${L / p}x + ${L * b} = ${L / q}x + ${L * d}`, `${tx(L / p - L / q)} = ${num(L * d - L * b)}, x = ${num(s)}`], why: { [TAGS.noLCDconst]: `수만 있는 ${b}와 ${d}에도 ${L}를 곱해요.`, [TAGS.moveSign]: '이항할 때 부호를 바꿔요.' }, probe: { ask: 'eq' } }; })(),
      ]));
      return calcAsk(r, c, this, runFamily(r, c, fams));
    },
    misread(r, c) {
      if (branchOf(r, c, ['const', 'dec']) === 'const') {
        const [[p, q], b, d] = draw(() => [pick(r, [[2, 3], [3, 4], [2, 5], [4, 6], [3, 5]]), int(r, 1, 9), int(r, 1, 9)], ([, b1, d1]) => b1 !== d1);
        const L = p * q / gcd(p, q);
        return misAsk(r, c, this, 'const', {
          q: `방정식 x/${p} + ${b} = x/${q} + ${d}의 양변에 ${L}를 곱해요.\n\n${showWork(`${L / p}x + ${b} = ${L / q}x + ${d}`)}`,
          ok: `수만 있는 항에도 ${L}를 곱해요 — ${L / p}x + ${L * b} = ${L / q}x + ${L * d}`,
          wr: [{ text: '맞게 말했어요', tag: RIGHT_AS_WRONG }, { text: `${L / q}x + ${L * b} = ${L / p}x + ${L * d}`, tag: TAGS.flipMul }, { text: '분수가 있으면 방정식을 풀 수 없어요', tag: OFF }],
          steps: [`x/${p} × ${L} = ${L / p}x, x/${q} × ${L} = ${L / q}x`, `${b} × ${L} = ${L * b}, ${d} × ${L} = ${L * d}`],
          whyAny: '수만 있는 항에는 곱하지 않았어요. 모든 항에 곱해야 등식이 그대로예요.',
          probe: { ask: 'const', p, q, b, d, L },
        });
      }
      const [A, B, s] = draw(() => [int(r, 2, 9), int(r, 1, 9), int(r, 1, 9)], ([A1, B1, s1]) => (A1 * s1 + B1) % 10 !== 0 && A1 * s1 + B1 < 100);
      const C = A * s + B;
      return misAsk(r, c, this, 'dec', {
        q: `방정식 0.${A}x + 0.${B} = ${dec(C / 10)}의 양변에 10을 곱해요.\n\n${showWork(`${A}x + 0.${B} = ${C}`)}`,
        ok: `모든 항에 10을 곱해요 — ${A}x + ${B} = ${C}`,
        wr: [{ text: '맞게 말했어요', tag: RIGHT_AS_WRONG }, { text: `${A}x + ${B} = ${dec(C / 10)}`, tag: TAGS.mulOnlyLeft }, { text: '소수가 있으면 방정식을 풀 수 없어요', tag: OFF }],
        steps: [`0.${A}x × 10 = ${A}x, 0.${B} × 10 = ${B}`, `${dec(C / 10)} × 10 = ${C}`],
        whyAny: '어떤 항에는 10을 곱하지 않았어요. 모든 항에 곱해야 등식이 그대로예요.',
        probe: { ask: 'dec', A, B, C },
      });
    },
  },

  {
    id: 'equ.apply', grade: 7, name: '⭐ 일차방정식의 활용', needs: ['equ.frac'],
    idea: '활용 문제는 ① 구하려는 것을 x로 놓고 ② 문제의 뜻에 맞게 방정식을 세우고 ③ 풀고 ④ 구한 값이 문제에 맞는지 확인해요 — 개수·사람 수는 자연수인지, 묻는 것이 x 그대로인지도 봐요.',
    rule: 'x로 놓고 → 방정식 → 풀고 → 답이 문제에 맞는지 확인.',
    slip: 'x를 무엇으로 놓았는지, 묻는 것이 x 그대로인지 봐요.',
    calc(r, c) {
      const fams = [];
      fams.push(famOf([
        (() => { const [a, s, b] = draw(() => [int(r, 2, 9), int(r, 2, 20), int(r, 1, 20)], ([a1, s1, b1]) => { const k = a1 * s1 - b1; return k > 0 && (k - b1) % a1 === 0 && allDiff(s1, k + b1, (k - b1) / a1); }); const k = a * s - b; return { t: `어떤 수의 ${a}배에서 ${b}를 뺐더니 ${k}가 되었어요.\n\n어떤 수는 얼마일까요?`, ans: num(s), wr: [{ text: num(k + b), tag: TAGS.noDivide }, { text: num((k - b) / a), tag: TAGS.subInstead }], steps: [`어떤 수를 x라고 하면 ${a}x − ${b} = ${k}`, `${a}x = ${k + b}, x = ${s}`], why: { [TAGS.noDivide]: `${a}x = ${k + b}에서 양변을 ${a}로 나눠요.`, [TAGS.subInstead]: `−${b}를 이항하면 +${b}예요.` }, probe: { ask: 'num' }, rule: '어떤 수를 x로 놓고 말 그대로 방정식으로 — 이항하면 부호가 바뀌어요.' }; })(),
        (() => { const [a, s, b] = draw(() => [int(r, 2, 9), int(r, 2, 20), int(r, 1, 9)], ([a1, s1, b1]) => { const k = a1 * (s1 + b1); return (k - b1) % a1 === 0 && allDiff(s1, k / a1, (k - b1) / a1); }); const k = a * (s + b); return { t: `어떤 수에 ${b}를 더한 다음 ${a}배 했더니 ${k}가 되었어요.\n\n어떤 수는 얼마일까요?`, ans: num(s), wr: [{ text: num(k / a), tag: TAGS.dropConst }, { text: num((k - b) / a), tag: TAGS.distribFirst }], steps: [`어떤 수를 x라고 하면 ${a}(x + ${b}) = ${k}`, `x + ${b} = ${k / a}, x = ${s}`], why: { [TAGS.dropConst]: `${k / a}는 어떤 수에 ${b}를 더한 수예요 — ${b}를 빼야 해요.`, [TAGS.distribFirst]: `${a}(x + ${b}) = ${a}x + ${a * b} — ${b}에도 ${a}를 곱해요.` }, probe: { ask: 'num2' }, rule: '먼저 더한 것은 괄호로 묶어요 — 괄호 안 모든 항에 곱해요.' }; })(),
      ]));
      fams.push(famOf([
        (() => { const x = int(r, 5, 40); const S = 3 * x + 3; return { t: `연속하는 세 자연수를 모두 더했더니 ${S}가 되었어요.\n\n세 수 중 가장 작은 수는 얼마일까요?`, ans: num(x), wr: [{ text: num(x + 1), tag: TAGS.askedOther }, { text: num(S - 3), tag: TAGS.noDivide }], steps: [`가장 작은 수를 x라고 하면 x + (x + 1) + (x + 2) = ${S}`, `3x + 3 = ${S}, 3x = ${S - 3}, x = ${x}`], why: { [TAGS.askedOther]: `${x + 1}은 가운데 수예요 — 가장 작은 수를 물었어요.`, [TAGS.noDivide]: `3x = ${S - 3}에서 양변을 3으로 나눠요.` }, probe: { ask: 'consec' }, rule: '연속하는 세 자연수는 x, x + 1, x + 2 — 묻는 수가 무엇인지 확인해요.' }; })(),
      ]));
      fams.push(famOf([
        (() => { const [a, k, y] = draw(() => [int(r, 9, 12), 3, int(r, 1, 9)], ([a1, k1, y1]) => { const b = k1 * a1 + (k1 - 1) * y1; return b >= 33 && b <= 48 && (b - k1 * a1) % k1 === 0 && allDiff(y1, (b - k1 * a1) / k1, b - k1 * a1); }); const b = k * a + (k - 1) * y; return { t: `지금 {me/은/는} ${a}살이고 아빠는 ${b}살이에요.\n\n아빠 나이가 {me}의 나이의 ${k}배가 되는 것은 몇 년 후일까요?`, ans: num(y), wr: [{ text: num((b - k * a) / k), tag: TAGS.oneAges }, { text: num(b - k * a), tag: TAGS.noDivide }], steps: [`x년 후에는 (${a} + x)살과 (${b} + x)살`, `${b} + x = ${k}(${a} + x), ${b} + x = ${k * a} + ${k}x, ${k - 1}x = ${b - k * a}, x = ${y}`], why: { [TAGS.oneAges]: '두 사람 모두 x살씩 나이를 먹어요.', [TAGS.noDivide]: `${k - 1}x = ${b - k * a}에서 양변을 ${k - 1}로 나눠요.` }, probe: { ask: 'age' }, rule: 'x년 후에는 두 사람 모두 x살씩 많아져요.' }; })(),
      ]));
      fams.push(famOf([
        (() => { const [p, x, rem] = draw(() => [int(r, 2, 6), int(r, 3, 9), int(r, 1, 5)], ([p1, x1, r1]) => r1 < p1 && (2 * r1) % p1 === 0 && allDiff(x1, (p1 * x1 + 2 * r1) / p1, p1 * x1)); const N = p * x + rem; return { t: `{me/이/가} 카드 ${N}장을 친구들에게 ${p}장씩 나누어 주었더니 ${rem}장이 남았어요.\n\n카드를 받은 친구는 몇 명일까요?`, ans: num(x), wr: [{ text: num((N + rem) / p), tag: TAGS.addInstead }, { text: num(N - rem), tag: TAGS.noDivide }], steps: [`친구를 x명이라고 하면 ${p}x + ${rem} = ${N}`, `${p}x = ${N - rem}, x = ${x}`], why: { [TAGS.addInstead]: `남은 ${rem}장은 더하지 않고 빼야 해요.`, [TAGS.noDivide]: `${p}x = ${N - rem}에서 양변을 ${p}로 나눠요.` }, probe: { ask: 'card' }, rule: '나누어 준 것 + 남은 것 = 처음 것 — 사람 수는 자연수인지 확인해요.' }; })(),
      ]));
      fams.push(famOf([
        (() => { const [v1, dv, tt] = draw(() => [int(r, 2, 6), int(r, 1, 4), int(r, 1, 4)], ([v, dv1, t1]) => (v * t1) % dv1 === 0 && v * t1 / dv1 >= 1 && allDiff(v * t1 / dv1, v * t1 / dv1 + t1, v * t1)); const v2 = v1 + dv; const x = v1 * tt / dv; return { t: `{mon/이/가} 한 시간에 ${v1} km씩 걸어서 먼저 출발했어요. ${tt}시간 뒤에 {mon2/이/가} 같은 곳에서 출발해 같은 길을 한 시간에 ${v2} km씩 따라갔어요.\n\n{mon2/은/는} 출발하고 몇 시간 뒤에 {mon/을/를} 만날까요?`, ans: num(x), wr: [{ text: num(x + tt), tag: TAGS.askedOther }, { text: num(v1 * tt), tag: TAGS.noDivide }], steps: [`나중에 출발한 쪽이 x시간 갈 때 먼저 출발한 쪽은 (x + ${tt})시간 가요 — 간 거리가 같아요`, `${v2}x = ${v1}(x + ${tt}), ${tx(dv)} = ${v1 * tt}, x = ${x}`], why: { [TAGS.askedOther]: `${x + tt}시간은 먼저 출발한 쪽이 걸은 시간이에요.`, [TAGS.noDivide]: `${dv}x = ${v1 * tt}에서 양변을 ${dv}로 나눠요.` }, probe: { ask: 'meet' }, rule: '만날 때는 간 거리가 같아요 — 거리 = 속력 × 시간.' }; })(),
      ]));
      fams.push(famOf([
        (() => { const x = pick(r, [5, 9, 13, 17, 21]); const N = 3 * x + 1; return { t: `성냥개비로 정사각형을 옆으로 이어 붙였더니 성냥개비가 모두 ${N}개 들었어요. 정사각형 1개에는 4개, 하나 늘 때마다 3개씩 더 들어요.\n\n정사각형은 몇 개일까요?`, ans: num(x), wr: [{ text: num(N / 4), tag: TAGS.allFour }, { text: num(N - 1), tag: TAGS.noDivide }], steps: [`정사각형을 x개라고 하면 3x + 1 = ${N}`, `3x = ${N - 1}, x = ${x}`], why: { [TAGS.allFour]: '이어 붙이면 변 하나를 같이 써요 — 4개씩이 아니에요.', [TAGS.noDivide]: `3x = ${N - 1}에서 양변을 3으로 나눠요.` }, probe: { ask: 'match' }, rule: '규칙을 식으로(3x + 1) 세우고 거꾸로 풀어요.' }; })(),
      ]));
      return calcAsk(r, c, this, runFamily(r, c, fams));
    },
    misread(r, c) {
      if (branchOf(r, c, ['other', 'age']) === 'other') {
        const m = int(r, 6, 40); const S = 3 * m;
        return misAsk(r, c, this, 'other', {
          q: `연속하는 세 자연수를 모두 더했더니 ${S}가 되었어요. 가장 작은 수를 구해요.\n\n${showWork(`가운데 수를 x로 놓으면 (x − 1) + x + (x + 1) = ${S}, x = ${m} — 가장 작은 수는 ${m}예요`)}`,
          ok: `x는 가운데 수예요 — 가장 작은 수는 ${m} − 1 = ${m - 1}`,
          wr: [{ text: '맞게 말했어요', tag: RIGHT_AS_WRONG }, { text: `가장 작은 수는 ${m} + 1 = ${m + 1}`, tag: TAGS.askedOther }, { text: '세 수의 합으로는 방정식을 세울 수 없어요', tag: OFF }],
          steps: [`3x = ${S}, x = ${m} — x는 가운데 수`, `가장 작은 수는 x − 1 = ${m - 1}`],
          whyAny: '구한 x는 가운데 수예요. 묻는 것이 x 그대로인지 확인해요.',
          probe: { ask: 'other', m },
          rule: 'x를 무엇으로 놓았는지 기억하고, 묻는 수로 답해요.',
        });
      }
      const [a, k, y] = draw(() => [int(r, 9, 12), 3, int(r, 1, 9)], ([a1, k1, y1]) => { const b = k1 * a1 + (k1 - 1) * y1; return b >= 33 && b <= 48 && (b - k1 * a1) % k1 === 0 && (b - k1 * a1) / k1 !== y1; });
      const b = k * a + (k - 1) * y;
      return misAsk(r, c, this, 'age', {
        q: `지금 {me/은/는} ${a}살, 아빠는 ${b}살이에요. 아빠 나이가 {me}의 나이의 ${k}배가 되는 것은 몇 년 후일까요?\n\n${showWork(`${b} = ${k}(${a} + x)라서 ${(b - k * a) / k}년 후예요`)}`,
        ok: `두 사람 모두 x살씩 많아져요 — ${b} + x = ${k}(${a} + x), x = ${y}`,
        wr: [{ text: '맞게 말했어요', tag: RIGHT_AS_WRONG }, { text: `${b} + x = ${k} × ${a}라서 x = ${num(k * a - b)}`, tag: TAGS.oneAges }, { text: '나이 문제는 방정식으로 풀 수 없어요', tag: OFF }],
        steps: [`x년 후 아빠는 (${b} + x)살, {me/은/는} (${a} + x)살`, `${b} + x = ${k}(${a} + x) → x = ${y}`],
        whyAny: '아빠 나이만 그대로 두었어요. x년 후에는 두 사람 모두 x살씩 많아져요.',
        probe: { ask: 'age', a, b, k, y },
        rule: 'x년 후에는 두 사람 모두 x살씩 많아져요.',
      });
    },
  },
];

export function conceptById(id) {
  return EQU.find((c) => c.id === id) || null;
}

// ───────────────────── 문항 만들기 (mathexpr와 같은 모양) ─────────────────────

/**
 * 개념 하나의 문항 한 개. `probe` = 테스트가 쓰는 재료 (화면은 쓰지 않는다)
 * @param {'calc'|'misread'|'why'|'special'} kind
 */
export function makeQuestion(conceptId, kind, seed, opts) {
  const c = conceptById(conceptId);
  if (!c) return null;
  const r = rng(seed);
  const cast = castOf(r, opts);
  if (cast.wantKind && cast.wantKind !== kind) cast.want = '';
  if (kind === 'why' || kind === 'special') return humanQuestion(c, kind, r, cast, opts);
  const q = kind === 'misread' ? c.misread(r, cast) : c.calc(r, cast);
  if (q && q.solve && !q.solve.whyAny) q.solve.whyAny = c.slip || SLIP;
  return q ? { ...q, key: q.key || cast.key || '' } : q;
}
const SLIP = '한 번 더 천천히 — 양변에 똑같이 했는지 봐요.';

export function makeRound(conceptId, seed, opts) {
  const out = ['calc', 'misread', 'why'].map((k, i) => makeQuestion(conceptId, k, seed + i * 7919, opts));
  const sp = makeQuestion(conceptId, 'special', seed + 3 * 7919, opts);
  if (sp) out.push(sp);
  return out.filter(Boolean);
}

export function lessonOf(conceptId, seed, opts) {
  const c = conceptById(conceptId);
  if (!c) return null;
  const cast = castOf(rng(seed), opts);
  const v = opts && opts.content && opts.content[conceptId];
  if (!v || !Array.isArray(v.lesson)) return { title: c.name, pages: [{ say: fill(c.idea, cast), check: null }], rule: c.idea };
  const pages = v.lesson.map((p) => ({
    say: fill(p.say, cast),
    check: p.check ? { q: fill(p.check.q, cast), ok: fill(p.check.ok, cast), no: p.check.no.map((t) => fill(t, cast)), why: fill(p.check.why, cast) } : null,
  }));
  return { title: c.name, pages, rule: v.rule || c.idea };
}

export function diagnosticSet(seed, n = 5, opts) {
  return diagnosticOf(EQU, makeQuestion, seed, n, opts);
}
export function placeFrom(answers) {
  return placeFromOf(EQU, answers);
}
export function ladder(doneIds) {
  return ladderOf(EQU, doneIds);
}

// ───────────────────── 사람이 쓴 내용 검사 (check.mjs가 부른다) ─────────────────────

function badPlaceholders(txt) {
  const leak = String(txt || '').match(/\{[^}]*\}/g) || [];
  return leak.filter((l) => !/^\{(me|mon|mon2)(\/[^/}]+\/[^}]+)?\}$/.test(l));
}
const sameValue = (a, b) => a !== null && b !== null && Math.abs(a - b) < 1e-9;
function fracValue(text) {
  const v = valueOf(text);
  if (v === null) return null;
  return { n: Math.round(v * 10000), d: 10000 };
}

/**
 * coach/math/equation.json 형식 검사 — mathexpr.checkContent와 같은 규칙
 * @returns {string[]}
 */
export function checkContent(content) {
  const bad = [];
  for (const c of EQU) {
    const v = content && content[c.id];
    if (!v) { bad.push(`${c.id}: 내용 없음`); continue; }
    if (!Array.isArray(v.lesson) || v.lesson.length < 3) bad.push(`${c.id}: lesson 3장 이상이어야 함`);
    if (!v.rule) bad.push(`${c.id}: rule 없음`);
    const checks = (v.lesson || []).filter((p) => p && p.check);
    if (checks.length < 2) bad.push(`${c.id}: 확인 질문 2개 이상이어야 함`);
    for (const [i, p] of (v.lesson || []).entries()) {
      if (!p || !p.say) { bad.push(`${c.id}[${i}]: say 없음`); continue; }
      for (const l of badPlaceholders(p.say)) bad.push(`${c.id}[${i}]: 잘못된 자리표시 ${l}`);
      if (!p.check) continue;
      const ck = p.check;
      if (!ck.q || !ck.ok || !Array.isArray(ck.no) || !ck.no.length || !ck.why) { bad.push(`${c.id}[${i}]: check 칸이 빔`); continue; }
      for (const l of badPlaceholders(`${ck.q} ${ck.ok} ${ck.no.join(' ')} ${ck.why}`)) bad.push(`${c.id}[${i}]: 잘못된 자리표시 ${l}`);
      const ov = valueOf(ck.ok);
      for (const n of ck.no) {
        if (String(n).trim() === String(ck.ok).trim()) bad.push(`${c.id}[${i}]: 정답이 오답에도 있음`);
        const nv = valueOf(n);
        if (ov !== null && nv !== null && sameValue(ov, nv)) bad.push(`${c.id}[${i}]: 값이 같은 보기 (${ck.ok} = ${n})`);
      }
      if (new Set(ck.no.map((n) => String(n).trim())).size !== ck.no.length) bad.push(`${c.id}[${i}]: 오답끼리 겹침`);
    }
    const d = v.dad;
    if (!d || !d.goal || !Array.isArray(d.say) || !d.say.length || !d.do) bad.push(`${c.id}: 아빠 카드 미완`);
    if (d && (!Array.isArray(d.traps) || !d.traps.length || !d.pass)) bad.push(`${c.id}: 아빠 카드 함정·통과 기준 없음`);
    if (v.why || v.special) checkHuman(c.id, v, bad, fracValue);
  }
  return bad;
}
