// ➕ 수학 — V 분수의 덧셈·뺄셈 줄기 (초4 「분수의 덧셈과 뺄셈」 같은 분모 → 초5 「분수의 덧셈과 뺄셈」 다른 분모): 개념 사다리 + 문제 생성기 + 내용 형식 검사.
// 순수 함수만 — 화면 없음 (node 테스트에서 그대로 돈다).
//
// 왜 이 줄기인가 (2026-10-07, 아버님 "분수의 덧셈·뺄셈 줄기 가자" → 설계안 "이대로 진행"):
//   A 분수 줄기의 덧셈·뺄셈은 두 칸뿐(같은 분모 진분수 · 다른 분모 진분수)이고 배움 장이 없다 — 대분수·받아올림·받아내림·(자연수)−(분수)는 한 번도 안 나왔다.
//   📊 기록에서 A "분모가 다른 분수의 덧셈·뺄셈"은 오답이 "통분 없이 분자만 더함"에 몰렸다(찍기가 아니라 오개념).
//   (아이 기록의 수치는 공개 코드에 적지 않는다 — 기록은 비공개 저장소에만)
// 칸 범위: 2015 미래엔 4-2 교과서 1단원(덧셈 (1) 진분수 → (2) 대분수 두 방법 → 뺄셈 (1) 진분수 → (2) 대분수 → (3) 1−(진분수)·(자연수)−(대분수)
//   → (4) 받아내림) · 2015 미래엔 5-1 지도서 248쪽 흐름도(받아올림 없는·있는 진분수 덧셈 → 대분수 덧셈 → 진분수 뺄셈 → 대분수 뺄셈 → 받아내림)
//   · 2022 성취기준 [4수01-15] 분모가 같은 분수의 덧셈과 뺄셈 · [6수01-08] 분모가 다른 분수의 덧셈과 뺄셈의 계산 원리를 탐구하고 계산하기
//   (고려사항: 기약분수를 요구하지 않으면 기약분수가 아닌 답도 허용 · 통분은 최소공배수뿐 아니라 두 분모의 곱도).
//
// 답의 꼴: 4학년 칸(V1~V5)은 **분모를 그대로 둔 꼴**(1 2/4 — 약분은 5학년, A 줄기 "같은 분모" 칸과 같은 결정),
//   5학년 칸(V6~V9)은 기약분수·대분수(교과서 예시 답). 숫자판은 어느 꼴이든 값이 같으면 맞음(2022 고려사항, T·U와 같다).
// 오답은 아이가 실제로 하는 틀린 생각 흉내다 (A 줄기 이름표와 같은 말을 쓴다 — 📊에서 같은 오개념으로 모인다) — 지도서가 드는 흔한 오류:
//   분모끼리 더함(261·275쪽) · 받아올림을 빠뜨림(271쪽 형성평가) · 받아내리고 자연수를 안 줄임(288쪽 5 5/12 − 3 7/8 = 2 13/24)
//
// 새 줄기의 함정(메모 stem-generator-pitfalls)을 처음부터:
//   · 가족 = 틀 여러 개, 틀마다 수를 미리 뽑아 둔다 — 🔁 쌍둥이가 요청한 틀(tplKey)로 온다
//   · ★ 분수 바로 뒤·단위 글자(m·L·kg·km) 바로 뒤에는 조사를 붙이지 않는다 — "— " · "만큼" · "씩"으로 잇는다
//   · 수가 답인 ①은 숫자판(수·분수·대분수 칸) · 문제 글에 "분수로"를 쓰지 않는다
//   · 오답끼리·정답과 같은 값은 뽑지 않는다(probe.allWrong) · 틀린 방법이 우연히 맞는 값을 내는 수는 다시 뽑는다
// ★ 정답·오답은 테스트가 **문제 글을 따로 읽어** 분수 셈으로 다시 푼다 (tests/mathfadd.test.js).

import { rng, castOf, fill, int, shuffle, gcd, ask, solve, humanQuestion, checkHuman, diagnosticOf, placeFromOf, ladderOf, valueOf as fracVal } from './mathgen.js';
import { gradeLabel } from './mathmix.js';
import { _kit } from './mathexpr.js';

export { gradeLabel };

const { famOf, runFamily, misAsk, textChoices, jfix, branchOf, showWork, step, RIGHT_AS_WRONG, OFF } = _kit;

// ───────────────────── 분수 글자 ─────────────────────

const red = (n, d) => { const g = gcd(n, d); return [n / g, d / g]; };
const lcm = (a, b) => (a / gcd(a, b)) * b;
const coprime = (a, b) => gcd(a, b) === 1;
/** 값 → 보기 글: 자연수 · 진분수 · 대분수 (기약) — 5학년 칸 */
export function V(n, d) {
  const [a, b] = red(n, d);
  if (b === 1) return String(a);
  return a < b ? `${a}/${b}` : `${Math.floor(a / b)} ${a % b}/${b}`;
}
/** 값 → 분모를 그대로 둔 글: 6/4 → 1 2/4 · 8/4 → 2 · 3/4 — 4학년 칸 (약분은 5학년) */
export function S(n, d) {
  if (n % d === 0) return String(n / d);
  return n < d ? `${n}/${d}` : `${Math.floor(n / d)} ${n % d}/${d}`;
}
/** 가분수 → 대분수로 바꾸는 줄 — "7/5 = 1 2/5" (4학년) · "21/12 = 1 3/4" (5학년, 약분까지) */
const chainS = (n, d) => { const raw = `${n}/${d}`; const v = S(n, d); return raw === v ? raw : `${raw} = ${v}`; };
const chain = (n, d) => { const raw = `${n}/${d}`; const v = V(n, d); return raw === v ? raw : `${raw} = ${v}`; };
/** 분모를 그대로 둔 대분수 → 기약 꼴 — "2 14/30 = 2 7/15" */
const chainM = (n, d) => { const raw = S(n, d); const v = V(n, d); return raw === v ? raw : `${raw} = ${v}`; };
/** 대분수 글자 (w가 0이면 진분수) — 분수 부분이 1 이상이어도 그대로 ("2 5/4" — 받아내린 꼴) */
const MX = (w, n, d) => (w ? `${w} ${n}/${d}` : `${n}/${d}`);
const keyOf = ([n, d]) => red(n, d).join('/');
/** 값들이 모두 다른가 — [분자, 분모] 쌍으로 (0 이하는 다르다고 치지 않는다) */
const distinct = (...pairs) => pairs.every(([n, d]) => n > 0 && d > 0) && new Set(pairs.map(keyOf)).size === pairs.length;
/** 조건에 맞을 때까지 다시 뽑기 */
function draw(gen, ok) {
  for (let k = 0; k < 4000; k++) { const v = gen(); if (ok(v)) return v; }
  throw new Error('draw: 조건에 맞는 수를 못 뽑음');
}
/** 두 분모 고르기 — 서로 다르고, 최소공배수가 너무 크지 않게 (multiple: 한 분모가 다른 분모의 배수 — 지도서 254쪽 "먼저 제시") */
function pairDen(r, multiple) {
  return draw(() => [int(r, 2, 12), int(r, 2, 12)], ([b, d]) => b !== d && lcm(b, d) <= 36 && (multiple ? (b % d === 0 || d % b === 0) : (b % d !== 0 && d % b !== 0)));
}
/** 분모 b의 진분수 분자 (서로소 — 1/2·3/4처럼 약분이 끝난 수만) */
const numOf = (r, b) => draw(() => int(r, 1, b - 1), (n) => coprime(n, b));

// ───────────────────── 보기 ─────────────────────

const sameV = (x, y) => !!(x && y && x.n * y.d === y.n * x.d);
/** 정답 근처의 "계산 실수" — 오개념 오답끼리 겹쳐 모자랄 때만 (보기의 분모 그대로 분자 ±1) */
function nearOf(A, k, fmt) {
  const s = [1, -1, 2, -2, 3, -3][k % 6];
  if (!A) return '';
  return A.n + s > 0 ? fmt(A.n + s, A.d) : '';
}
/** 수 보기 4개 — 정답 + 오개념 오답. 글자·값이 같은 보기는 넣지 않는다 (값은 대분수까지 읽는다) */
function fchoices(r, answer, wrongs, fmt) {
  const list = [{ text: answer, ok: true }]; const vals = [fracVal(answer)];
  const dup = (t) => { const v = fracVal(t); return !v || list.some((x) => x.text === t) || vals.some((x) => sameV(x, v)); };
  const add = (t, tag) => { list.push({ text: t, ok: false, tag }); vals.push(fracVal(t)); };
  for (const w of wrongs) { if (w && w.text && !dup(w.text) && list.length < 4) add(w.text, w.tag); }
  for (let k = 0; list.length < 4 && k < 12; k++) { const alt = nearOf(vals[0], k, fmt); if (alt && !dup(alt)) add(alt, '계산 실수'); }
  return shuffle(r, list);
}
/** 고른 틀로 ① 문항 만들기 — v: { t, ans, wr, steps, why, whyAny, rule, fmt(근처 수의 꼴), probe } */
function fcalcAsk(r, c, concept, v) {
  const F = (t) => jfix(fill(t, c));
  const chs = fchoices(r, v.ans, v.wr, v.fmt || V);
  const why = Object.fromEntries(Object.entries(v.why || {}).map(([k, t]) => [k, F(t)]));
  return {
    ...ask(concept.id, 'calc', F(v.t), chs, { solve: solve(v.steps.map((s, i) => step(i, F(s))), { why, whyAny: F(v.whyAny || ''), rule: v.rule || concept.rule }) }),
    probe: { ...(v.probe || {}), allWrong: v.wr.map((w) => ({ text: String(w.text), tag: w.tag })) },
  };
}
const askFam = (r, c, concept, fams) => fcalcAsk(r, c, concept, runFamily(r, c, fams));

const CALC = '다음을 계산하면 얼마일까요?';
const calcQ = (e) => `${CALC}\n\n**${e}**`;

/** 이 줄기의 오개념 이름표 (📊·🤔 노트·결과 카드에 그대로 뜬다) — 이름표 하나에 셈 하나 */
export const TAGS = {
  // 같은 분모 (A 줄기 "같은 분모끼리"와 같은 말)
  denToo: '분모끼리도 더함',
  addForSub: '빼지 않고 더함',
  mulInstead: '곱셈으로 풂',
  oneSide: '한쪽만 씀',
  // 가분수 → 대분수 · 받아올림
  dropOne: '자연수 1을 빠뜨림',
  noCarry: '받아올림을 빠뜨림',
  dropWhole: '자연수 부분을 빠뜨림',
  badImproper: '가분수로 잘못 바꿈',
  // 대분수 뺄셈
  wholeOnlySub: '자연수끼리만 뺌',
  fracOnlySub: '분수끼리만 뺌',
  // (자연수)−(분수) · 받아내림
  keepFrac: '빼는 분수를 그대로 씀',
  noReduce: '받아내리고 자연수를 안 줄임',
  numFromWhole: '자연수에서 분자를 뺌',
  swapSub: '분수 부분을 거꾸로 뺌',
  // 다른 분모 (A 줄기 "분모가 다른 분수의 덧셈·뺄셈"과 같은 말)
  denSum: '분모끼리 더함',
  noLcd: '통분 없이 분자만 더함',
  oneLcd: '한쪽만 통분함',
  denSub: '분모끼리 뺌',
  noLcdSub: '통분 없이 분자만 뺌',
  // 활용
  allAdd: '빼야 할 것까지 더함',
  dropLast: '앞의 두 수만 계산함',
  subAll: '더할 것까지 뺌',
};

// ───────────────────── 다른 분모 재료 ─────────────────────

/** a/b, c/d → 통분 재료 { L, A, C } (최소공배수로) */
const lcdOf = (a, b, c, d) => { const L = lcm(b, d); return { L, A: a * (L / b), C: c * (L / d) }; };
/** 통분 줄 — 바뀌는 쪽만 쓴다 ("1/4 = 1/4" 같은 줄을 쓰지 않게) */
function lcdLine(w1, a, b, w2, c, d) {
  const { L, A, C } = lcdOf(a, b, c, d);
  const parts = [];
  if (b !== L) parts.push(`${MX(w1, a, b)} = ${MX(w1, A, L)}`);
  if (d !== L) parts.push(`${MX(w2, c, d)} = ${MX(w2, C, L)}`);
  return `통분해요 — ${parts.join(', ')}`;
}

// ───────────────────── 개념 사다리 (V. 분수의 덧셈·뺄셈 줄기) ─────────────────────

export const FADD = [
  {
    id: 'fadd.same', grade: 4, name: '분모가 같은 진분수의 덧셈', needs: [],
    idea: '2/5 + 4/5 — 분모가 같으면 조각의 크기가 같아서 **분모는 그대로 두고 분자끼리 더해요**: 2 + 4 = 6 → 6/5. 분자가 분모보다 커지면 대분수로 — 6/5 = 1 1/5. 분모끼리 더하면 조각의 크기가 바뀌어서 틀려요.',
    rule: '분모가 같으면 분모는 그대로, 분자끼리 더해요 — 가분수가 되면 대분수로.',
    slip: '분모까지 더하지 않았는지, 대분수로 바꿀 때 1을 빠뜨리지 않았는지 봐요.',
    calc(r, c) {
      const fams = [];
      const pickS = (gt1) => draw(() => [int(r, 3, 12), int(r, 1, 11), int(r, 1, 11)], ([d, a, b]) => a < d && b < d && (gt1 ? a + b > d : a + b < d)
        && distinct([a + b, d], [a + b, 2 * d], [a * b, d * d], ...(gt1 ? [[a + b - d, d]] : [[a, d]])));
      const wrongs = (a, b, d) => [
        { text: `${a + b}/${2 * d}`, tag: TAGS.denToo },
        { text: `${a * b}/${d * d}`, tag: TAGS.mulInstead },
        a + b > d ? { text: S(a + b - d, d), tag: TAGS.dropOne } : { text: `${a}/${d}`, tag: TAGS.oneSide },
      ];
      const whys = (a, b, d) => ({
        [TAGS.denToo]: `분모 ${d}는 조각의 크기 — 그대로 두고 분자끼리만 더해요.`,
        [TAGS.mulInstead]: '곱셈이 아니라 덧셈이에요 — 조각 개수를 합쳐요.',
        [TAGS.dropOne]: `분자 ${a + b}이 분모 ${d}보다 커서 1(= ${d}/${d})이 들어 있어요 — 대분수로 ${S(a + b, d)}.`,
        [TAGS.oneSide]: `한쪽 수만 썼어요 — 두 분자를 더해요: ${a} + ${b} = ${a + b}.`,
      });
      const steps = (a, b, d) => [`분모는 그대로, 분자끼리 더해요 — ${a} + ${b} = ${a + b}`, `${a}/${d} + ${b}/${d} = ${chainS(a + b, d)}`];
      const one = (gt1, t) => { const [d, a, b] = pickS(gt1); return { t: t(a, b, d), ans: S(a + b, d), wr: wrongs(a, b, d), steps: steps(a, b, d), why: whys(a, b, d), fmt: S, probe: { ask: 'calc', carry: gt1 } }; };
      fams.push(famOf([one(false, (a, b, d) => calcQ(`${a}/${d} + ${b}/${d}`))]));
      fams.push(famOf([one(true, (a, b, d) => calcQ(`${a}/${d} + ${b}/${d}`))]));
      const gt = r() < 0.5;
      fams.push(famOf([
        one(gt, (a, b, d) => `물을 ${a}/${d} L 마시고, 조금 뒤에 ${b}/${d} L 더 마셨어요. 마신 물은 모두 몇 L일까요?`),
        one(gt, (a, b, d) => `{mon/은/는} 오전에 ${a}/${d}시간, 오후에 ${b}/${d}시간 연습했어요. 모두 몇 시간 연습했을까요?`),
      ]));
      return askFam(r, c, this, fams);
    },
    misread(r, c) {
      if (branchOf(r, c, ['den', 'one']) === 'den') {
        const [d, a, b] = draw(() => [int(r, 4, 9), int(r, 1, 7), int(r, 1, 7)], ([d1, a1, b1]) => a1 + b1 < d1 && distinct([a1 + b1, d1], [a1 + b1, 2 * d1], [a1 * b1, d1 * d1]));
        return misAsk(r, c, this, 'den', {
          q: `그림을 보고 덧셈을 계산해요.\n\n[bar ${a}/${d}+${b}/${d}]\n\n${showWork(`${a}/${d} + ${b}/${d} = ${a + b}/${2 * d}`)}`,
          ok: `분모는 그대로, 분자끼리 더해요 — ${a}/${d} + ${b}/${d} = ${a + b}/${d}`,
          wr: [{ text: '맞게 말했어요', tag: RIGHT_AS_WRONG }, { text: `곱해서 ${a * b}/${d * d}`, tag: TAGS.mulInstead }, { text: '분모가 같은 분수끼리는 더할 수 없어요', tag: OFF }],
          steps: [`1/${d}짜리 ${a}칸과 ${b}칸 — 1/${d}짜리 ${a + b}칸`, `${a}/${d} + ${b}/${d} = ${a + b}/${d}`],
          whyAny: `분모끼리도 더했어요. 분모 ${d}는 조각의 크기라 그대로 — 조각의 개수(분자)만 더해요.`,
          probe: { ask: 'den', a, b, d },
        });
      }
      const [d, a, b] = draw(() => [int(r, 3, 9), int(r, 1, 8), int(r, 1, 8)], ([d1, a1, b1]) => a1 < d1 && b1 < d1 && a1 + b1 > d1 && distinct([a1 + b1, d1], [a1 + b1 - d1, d1], [a1 + b1, 2 * d1]));
      return misAsk(r, c, this, 'one', {
        q: `덧셈을 계산해요.\n\n${showWork(`${a}/${d} + ${b}/${d} = ${a + b - d}/${d}`)}`,
        ok: `분자끼리 더하면 ${a + b}/${d} — 대분수로 ${S(a + b, d)}`,
        wr: [{ text: '맞게 말했어요', tag: RIGHT_AS_WRONG }, { text: `분모끼리도 더해서 ${a + b}/${2 * d}`, tag: TAGS.denToo }, { text: '분자의 합이 분모보다 크면 더할 수 없어요', tag: OFF }],
        steps: [`${a} + ${b} = ${a + b} — ${a}/${d} + ${b}/${d} = ${a + b}/${d}`, `${a + b}/${d} = ${d}/${d} + ${a + b - d}/${d} = ${S(a + b, d)}`],
        whyAny: `대분수로 바꿀 때 1을 빠뜨렸어요. 분자의 합 ${a + b}에는 ${d}/${d} = 1이 들어 있어요.`,
        probe: { ask: 'one', a, b, d },
      });
    },
  },

  {
    id: 'fadd.mixadd', grade: 4, name: '분모가 같은 대분수의 덧셈', needs: ['fadd.same'],
    idea: '1 1/5 + 2 2/5 — **자연수끼리, 분수끼리** 더해요: 1 + 2 = 3, 1/5 + 2/5 = 3/5 → 3 3/5. 또는 **가분수로 바꿔** 더해요 — 6/5 + 12/5 = 18/5 = 3 3/5. 분수끼리 더한 값이 1보다 크면 자연수로 **받아올림**해요 — 2 2/4 + 1 3/4 = 3 5/4 = 4 1/4.',
    rule: '자연수끼리, 분수끼리 더해요 — 분수 부분이 1을 넘으면 받아올림.',
    slip: '분수끼리 더한 값이 1보다 크면 받아올림했는지 봐요.',
    calc(r, c) {
      const fams = [];
      const pickM = (carry) => draw(() => [int(r, 1, 4), int(r, 1, 3), int(r, 3, 9), int(r, 1, 8), int(r, 1, 8)], ([w1, w2, d, n1, n2]) => n1 < d && n2 < d && (carry ? n1 + n2 > d : n1 + n2 < d)
        && distinct(...candM(w1, n1, w2, n2, d, carry)));
      const T = (w1, n1, w2, n2, d) => (w1 + w2) * d + n1 + n2;
      function candM(w1, n1, w2, n2, d, carry) {
        const t = T(w1, n1, w2, n2, d);
        return [[t, d], [(w1 + w2) * 2 * d + n1 + n2, 2 * d], [w1 + n1 + w2 + n2, d], carry ? [t - d, d] : [n1 + n2, d]];
      }
      const wrongs = (w1, n1, w2, n2, d) => {
        const carry = n1 + n2 > d;
        return [
          carry ? { text: S(T(w1, n1, w2, n2, d) - d, d), tag: TAGS.noCarry } : { text: S(n1 + n2, d), tag: TAGS.dropWhole },
          { text: `${w1 + w2} ${n1 + n2}/${2 * d}`, tag: TAGS.denToo },
          { text: S(w1 + n1 + w2 + n2, d), tag: TAGS.badImproper },
        ];
      };
      const whys = (w1, n1, w2, n2, d) => ({
        [TAGS.noCarry]: `분수끼리 ${n1}/${d} + ${n2}/${d} = ${n1 + n2}/${d} — 1보다 커서 1을 자연수로 받아올려요.`,
        [TAGS.dropWhole]: `자연수끼리도 더해요 — ${w1} + ${w2} = ${w1 + w2}.`,
        [TAGS.denToo]: `분모 ${d}는 그대로 — 분자끼리만 더해요.`,
        [TAGS.badImproper]: `${MX(w1, n1, d)} = (${w1} × ${d} + ${n1})/${d} = ${w1 * d + n1}/${d} — 자연수에 분모를 곱해요.`,
      });
      const way1 = (w1, n1, w2, n2, d) => {
        const f = n1 + n2;
        return f > d
          ? [`자연수끼리 ${w1} + ${w2} = ${w1 + w2}, 분수끼리 ${n1}/${d} + ${n2}/${d} = ${chainS(f, d)}`, `${w1 + w2} + ${S(f, d)} = ${S(T(w1, n1, w2, n2, d), d)}`]
          : [`자연수끼리 ${w1} + ${w2} = ${w1 + w2}, 분수끼리 ${n1}/${d} + ${n2}/${d} = ${f}/${d}`, `${w1 + w2} + ${f}/${d} = ${S(T(w1, n1, w2, n2, d), d)}`];
      };
      const way2 = (w1, n1, w2, n2, d) => [`가분수로 바꿔요 — ${MX(w1, n1, d)} = ${w1 * d + n1}/${d}, ${MX(w2, n2, d)} = ${w2 * d + n2}/${d}`, `${w1 * d + n1}/${d} + ${w2 * d + n2}/${d} = ${chainS(T(w1, n1, w2, n2, d), d)}`];
      const one = (carry, t, way) => {
        const [w1, w2, d, n1, n2] = pickM(carry);
        return { t: t(w1, n1, w2, n2, d), ans: S(T(w1, n1, w2, n2, d), d), wr: wrongs(w1, n1, w2, n2, d), steps: way(w1, n1, w2, n2, d), why: whys(w1, n1, w2, n2, d), fmt: S, probe: { ask: 'calc', carry } };
      };
      const expr = (w1, n1, w2, n2, d) => calcQ(`${MX(w1, n1, d)} + ${MX(w2, n2, d)}`);
      fams.push(famOf([one(false, expr, way1)]));
      fams.push(famOf([one(true, expr, way1)]));
      fams.push(famOf([one(true, expr, way2)]));
      fams.push(famOf([one(r() < 0.6, (w1, n1, w2, n2, d) => `{mon/은/는} 어제 ${MX(w1, n1, d)} km, 오늘 ${MX(w2, n2, d)} km 걸었어요. 모두 몇 km 걸었을까요?`, way1)]));
      return askFam(r, c, this, fams);
    },
    misread(r, c) {
      const pick2 = (carry) => draw(() => [int(r, 1, 3), int(r, 1, 3), int(r, 3, 8), int(r, 1, 7), int(r, 1, 7)], ([w1, w2, d, n1, n2]) => n1 < d && n2 < d && (carry ? n1 + n2 > d : n1 + n2 < d)
        && distinct([(w1 + w2) * d + n1 + n2, d], [(w1 + w2) * d + n1 + n2 - d, d], [w1 + n1 + w2 + n2, d], [n1 + n2, d], [(w1 + w2) * 2 * d + n1 + n2, 2 * d]));
      if (branchOf(r, c, ['carry', 'den']) === 'carry') {
        const [w1, w2, d, n1, n2] = pick2(true); const t = (w1 + w2) * d + n1 + n2;
        return misAsk(r, c, this, 'carry', {
          q: `덧셈을 계산해요.\n\n${showWork(`${MX(w1, n1, d)} + ${MX(w2, n2, d)} = ${S(t - d, d)}`)}`,
          ok: `분수끼리 더하면 ${S(n1 + n2, d)} — 받아올려서 ${S(t, d)}`,
          wr: [{ text: '맞게 말했어요', tag: RIGHT_AS_WRONG }, { text: `가분수로 잘못 바꿔서 ${S(w1 + n1 + w2 + n2, d)}`, tag: TAGS.badImproper }, { text: '대분수끼리는 더할 수 없어요', tag: OFF }],
          steps: [`자연수끼리 ${w1 + w2}, 분수끼리 ${n1}/${d} + ${n2}/${d} = ${chainS(n1 + n2, d)}`, `${w1 + w2} + ${S(n1 + n2, d)} = ${S(t, d)}`],
          whyAny: `받아올림을 빠뜨렸어요. 분수끼리 더한 값(${n1 + n2}/${d})에 1이 들어 있어요 — 자연수에 1을 더해요.`,
          probe: { ask: 'carry', w1, n1, w2, n2, d },
        });
      }
      const [w1, w2, d, n1, n2] = pick2(false); const t = (w1 + w2) * d + n1 + n2;
      return misAsk(r, c, this, 'den', {
        q: `덧셈을 계산해요.\n\n${showWork(`${MX(w1, n1, d)} + ${MX(w2, n2, d)} = ${w1 + w2} ${n1 + n2}/${2 * d}`)}`,
        ok: `분모는 그대로 — ${MX(w1, n1, d)} + ${MX(w2, n2, d)} = ${S(t, d)}`,
        wr: [{ text: '맞게 말했어요', tag: RIGHT_AS_WRONG }, { text: `자연수 부분을 빠뜨려서 ${S(n1 + n2, d)}`, tag: TAGS.dropWhole }, { text: '대분수끼리는 더할 수 없어요', tag: OFF }],
        steps: [`자연수끼리 ${w1} + ${w2} = ${w1 + w2}, 분수끼리 ${n1}/${d} + ${n2}/${d} = ${n1 + n2}/${d}`, `${w1 + w2} + ${n1 + n2}/${d} = ${S(t, d)}`],
        whyAny: `분수 부분의 분모끼리도 더했어요. 분모 ${d}는 그대로 — 분자끼리만 더해요.`,
        probe: { ask: 'den', w1, n1, w2, n2, d },
      });
    },
  },

  {
    id: 'fadd.sub', grade: 4, name: '분모가 같은 분수의 뺄셈', needs: ['fadd.mixadd'],
    idea: '7/9 − 5/9 — **분모는 그대로, 분자끼리 빼요**: 7 − 5 = 2 → 2/9. 대분수는 자연수끼리, 분수끼리 빼요 — 4 7/8 − 1 3/8 = 3 4/8. 가분수로 바꿔 빼도 돼요 — 39/8 − 11/8 = 28/8 = 3 4/8.',
    rule: '분모는 그대로, 분자끼리 빼요 — 대분수는 자연수끼리, 분수끼리.',
    slip: '빼야 할 것을 더하지 않았는지, 자연수 부분과 분수 부분을 모두 뺐는지 봐요.',
    calc(r, c) {
      const fams = [];
      const pickP = () => draw(() => [int(r, 3, 12), int(r, 2, 11), int(r, 1, 10)], ([d, a, b]) => a < d && b < a && distinct([a - b, d], [a + b, d], [a * b, d * d], [a, d]));
      const pickM = () => draw(() => [int(r, 2, 5), int(r, 1, 4), int(r, 3, 9), int(r, 2, 8), int(r, 1, 7)], ([w1, w2, d, n1, n2]) => w2 <= w1 && n1 < d && n2 < n1
        && distinct(...candM(w1, n1, w2, n2, d)));
      const T1 = (w1, n1, d) => w1 * d + n1;
      function candM(w1, n1, w2, n2, d) {
        const a = T1(w1, n1, d); const b = T1(w2, n2, d);
        return [[a - b, d], [a + b, d], [(w1 - w2) * d + n1, d], [w1 * d + n1 - n2, d], [(w1 + n1) - (w2 + n2), d]];
      }
      const pwr = (a, b, d) => [{ text: S(a + b, d), tag: TAGS.addForSub }, { text: `${a * b}/${d * d}`, tag: TAGS.mulInstead }, { text: `${a}/${d}`, tag: TAGS.oneSide }];
      const pwhy = (a, b, d) => ({
        [TAGS.addForSub]: `"남은"을 물었으니 빼요 — ${a} − ${b} = ${a - b}.`,
        [TAGS.mulInstead]: '곱셈이 아니라 뺄셈이에요 — 조각 개수를 덜어 내요.',
        [TAGS.oneSide]: `처음 수를 그대로 썼어요 — 분자끼리 빼요: ${a} − ${b} = ${a - b}.`,
      });
      const psteps = (a, b, d) => [`분모는 그대로, 분자끼리 빼요 — ${a} − ${b} = ${a - b}`, `${a}/${d} − ${b}/${d} = ${a - b}/${d}`];
      const mwr = (w1, n1, w2, n2, d) => [
        { text: S(T1(w1, n1, d) + T1(w2, n2, d), d), tag: TAGS.addForSub },
        { text: S((w1 - w2) * d + n1, d), tag: TAGS.wholeOnlySub },
        { text: S(w1 * d + n1 - n2, d), tag: TAGS.fracOnlySub },
        { text: S((w1 + n1) - (w2 + n2), d), tag: TAGS.badImproper },
      ];
      const mwhy = (w1, n1, w2, n2, d) => ({
        [TAGS.addForSub]: '빼야 해요 — 더하지 않아요.',
        [TAGS.wholeOnlySub]: `분수 부분도 빼요 — ${n1}/${d} − ${n2}/${d} = ${n1 - n2}/${d}.`,
        [TAGS.fracOnlySub]: `자연수 부분도 빼요 — ${w1} − ${w2} = ${w1 - w2}.`,
        [TAGS.badImproper]: `${MX(w1, n1, d)} = (${w1} × ${d} + ${n1})/${d} = ${T1(w1, n1, d)}/${d} — 자연수에 분모를 곱해요.`,
      });
      const msteps = (w1, n1, w2, n2, d) => [`자연수끼리 ${w1} − ${w2} = ${w1 - w2}, 분수끼리 ${n1}/${d} − ${n2}/${d} = ${n1 - n2}/${d}`, `${w1 - w2} + ${n1 - n2}/${d} = ${S(T1(w1, n1, d) - T1(w2, n2, d), d)}`];
      const p = (t) => { const [d, a, b] = pickP(); return { t: t(a, b, d), ans: `${a - b}/${d}`, wr: pwr(a, b, d), steps: psteps(a, b, d), why: pwhy(a, b, d), fmt: S, probe: { ask: 'calc' } }; };
      const m = (t) => { const [w1, w2, d, n1, n2] = pickM(); return { t: t(w1, n1, w2, n2, d), ans: S(T1(w1, n1, d) - T1(w2, n2, d), d), wr: mwr(w1, n1, w2, n2, d), steps: msteps(w1, n1, w2, n2, d), why: mwhy(w1, n1, w2, n2, d), fmt: S, probe: { ask: 'calc' } }; };
      fams.push(famOf([p((a, b, d) => calcQ(`${a}/${d} − ${b}/${d}`))]));
      fams.push(famOf([m((w1, n1, w2, n2, d) => calcQ(`${MX(w1, n1, d)} − ${MX(w2, n2, d)}`))]));
      fams.push(famOf([
        p((a, b, d) => `주스 ${a}/${d} L 중 ${b}/${d} L만큼 마셨어요. 남은 주스는 몇 L일까요?`),
        m((w1, n1, w2, n2, d) => `리본 ${MX(w1, n1, d)} m 중 ${MX(w2, n2, d)} m만큼 잘라 썼어요. 남은 리본은 몇 m일까요?`),
      ]));
      return askFam(r, c, this, fams);
    },
    misread(r, c) {
      const [w1, w2, d, n1, n2] = draw(() => [int(r, 2, 5), int(r, 1, 3), int(r, 3, 9), int(r, 2, 8), int(r, 1, 7)], ([a, b, dd, x, y]) => b < a && x < dd && y < x
        && distinct([(a - b) * dd + x - y, dd], [(a + b) * dd + x + y, dd], [(a - b) * dd + x, dd], [a * dd + x - y, dd]));
      const A = w1 * d + n1; const B = w2 * d + n2; const ans = S(A - B, d);
      if (branchOf(r, c, ['add', 'part']) === 'add') {
        return misAsk(r, c, this, 'add', {
          q: `뺄셈을 계산해요.\n\n${showWork(`${MX(w1, n1, d)} − ${MX(w2, n2, d)} = ${S(A + B, d)}`)}`,
          ok: `빼야 해요 — ${MX(w1, n1, d)} − ${MX(w2, n2, d)} = ${ans}`,
          wr: [{ text: '맞게 말했어요', tag: RIGHT_AS_WRONG }, { text: `분수끼리만 빼서 ${S(w1 * d + n1 - n2, d)}`, tag: TAGS.fracOnlySub }, { text: '대분수끼리는 뺄 수 없어요', tag: OFF }],
          steps: [`자연수끼리 ${w1} − ${w2} = ${w1 - w2}, 분수끼리 ${n1}/${d} − ${n2}/${d} = ${n1 - n2}/${d}`, `${w1 - w2} + ${n1 - n2}/${d} = ${ans}`],
          whyAny: '빼야 할 것을 더했어요. 기호를 먼저 봐요.',
          probe: { ask: 'add', w1, n1, w2, n2, d },
        });
      }
      return misAsk(r, c, this, 'part', {
        q: `뺄셈을 계산해요.\n\n${showWork(`${MX(w1, n1, d)} − ${MX(w2, n2, d)} = ${S((w1 - w2) * d + n1, d)}`)}`,
        ok: `분수 부분도 빼요 — ${MX(w1, n1, d)} − ${MX(w2, n2, d)} = ${ans}`,
        wr: [{ text: '맞게 말했어요', tag: RIGHT_AS_WRONG }, { text: `빼지 않고 더해서 ${S(A + B, d)}`, tag: TAGS.addForSub }, { text: '대분수끼리는 뺄 수 없어요', tag: OFF }],
        steps: [`자연수끼리 ${w1} − ${w2} = ${w1 - w2}, 분수끼리 ${n1}/${d} − ${n2}/${d} = ${n1 - n2}/${d}`, `${w1 - w2} + ${n1 - n2}/${d} = ${ans}`],
        whyAny: '자연수끼리만 빼고 분수 부분은 그대로 뒀어요. 분수끼리도 빼요.',
        probe: { ask: 'part', w1, n1, w2, n2, d },
      });
    },
  },

  {
    id: 'fadd.whole', grade: 4, name: '(자연수)−(분수)', needs: ['fadd.sub'],
    idea: '1 − 2/3 — 1을 분모가 같은 분수로 바꿔서 빼요: 1 = 3/3, 3/3 − 2/3 = 1/3. 3 − 1 1/5 — 3에서 1을 **받아내려** 바꾸면 3 = 2 5/5, 2 5/5 − 1 1/5 = 1 4/5. 가분수로 바꿔 빼도 돼요 — 15/5 − 6/5 = 9/5 = 1 4/5.',
    rule: '자연수에서 1을 받아내려 분수로 바꾼 다음 빼요 — 받아내린 만큼 자연수는 1 작아져요.',
    slip: '자연수에서 1을 받아내렸으면 자연수를 1 줄였는지 봐요.',
    calc(r, c) {
      const fams = [];
      // 1 − a/d
      const pick1 = () => draw(() => [int(r, 3, 12), int(r, 1, 11)], ([d, a]) => a < d && distinct([d - a, d], [a, d], [2 * d - a, d], [d + a, d]));
      // W − a/d (W > a: "자연수에서 분자를 뺌"이 0이 되지 않게)
      const pickW = () => draw(() => [int(r, 2, 5), int(r, 3, 9), int(r, 1, 8)], ([W, d, a]) => a < d && W > a
        && distinct([W * d - a, d], [(W - 1) * d + a, d], [W * d + d - a, d], [W - a, d], [W * d + a, d]));
      // W − w n/d (w ≥ 1)
      const pickWM = () => draw(() => [int(r, 3, 6), int(r, 1, 4), int(r, 3, 9), int(r, 1, 8)], ([W, w, d, n]) => n < d && w <= W - 1
        && distinct([W * d - w * d - n, d], [(W - w - 1) * d + n, d], [(W - w) * d + d - n, d], [W * d + w * d + n, d]));
      const wr = (W, w, n, d) => {
        const out = [
          { text: S((W - w - 1) * d + n, d), tag: TAGS.keepFrac },
          { text: S((W - w) * d + d - n, d), tag: TAGS.noReduce },
          { text: S(W * d + w * d + n, d), tag: TAGS.addForSub },
        ];
        if (w === 0 && W > n) out.splice(2, 0, { text: S(W - n, d), tag: TAGS.numFromWhole });
        return out;
      };
      const whys = (W, w, n, d) => ({
        [TAGS.keepFrac]: `빼는 수의 분수 부분(${n}/${d})을 그대로 붙였어요 — 받아내린 1(= ${d}/${d})에서 ${n}/${d}만큼 빼면 ${d - n}/${d}.`,
        [TAGS.noReduce]: `1을 받아내렸으면 자연수 ${W}은 ${W - 1}로 줄어요.`,
        [TAGS.numFromWhole]: `자연수 ${W}에서 분자 ${n}을 빼면 안 돼요 — 1을 받아내려 바꿔서 빼요: ${W} = ${MX(W - 1, d, d)}.`,
        [TAGS.addForSub]: '빼야 해요 — 더하지 않아요.',
      });
      const steps = (W, w, n, d) => (W === 1
        ? [`1을 분모가 ${d}인 분수로 — 1 = ${d}/${d}`, `${d}/${d} − ${n}/${d} = ${d - n}/${d}`]
        : [`자연수에서 1을 받아내려요 — ${W} = ${MX(W - 1, d, d)}`, `${MX(W - 1, d, d)} − ${MX(w, n, d)} = ${S(W * d - w * d - n, d)}`]);
      const one = (kind, t) => {
        let W; let w = 0; let n; let d;
        if (kind === 1) { [d, n] = pick1(); W = 1; } else if (kind === 2) { [W, d, n] = pickW(); } else { [W, w, d, n] = pickWM(); }
        return { t: t(W, w, n, d), ans: S(W * d - w * d - n, d), wr: wr(W, w, n, d), steps: steps(W, w, n, d), why: whys(W, w, n, d), fmt: S, probe: { ask: 'calc' } };
      };
      const expr = (W, w, n, d) => calcQ(`${W} − ${MX(w, n, d)}`);
      fams.push(famOf([one(1, expr)]));
      fams.push(famOf([one(2, expr)]));
      fams.push(famOf([one(3, expr)]));
      // 빼는 수가 진분수인 글과 대분수인 글은 열쇠(tplKey)가 달라 틀을 따로 둔다 — 쌍둥이가 같은 모양으로 온다
      const story = (W, w, n, d) => `물 ${W} L 중 ${MX(w, n, d)} L만큼 썼어요. 남은 물은 몇 L일까요?`;
      fams.push(famOf([one(2, story), one(3, story)]));
      return askFam(r, c, this, fams);
    },
    misread(r, c) {
      if (branchOf(r, c, ['keep', 'num']) === 'keep') {
        const [W, w, d, n] = draw(() => [int(r, 2, 5), int(r, 0, 2), int(r, 3, 8), int(r, 1, 7)], ([W1, w1, d1, n1]) => n1 < d1 && w1 <= W1 - 1 && 2 * n1 !== d1
          && distinct([(W1 - w1) * d1 - n1, d1], [(W1 - w1 - 1) * d1 + n1, d1], [(W1 - w1) * d1 + d1 - n1, d1]));
        const ans = S((W - w) * d - n, d);
        return misAsk(r, c, this, 'keep', {
          q: `그림을 보고 뺄셈을 계산해요.\n\n[fsub ${W} | ${MX(w, n, d)}]\n\n${showWork(`${W} − ${MX(w, n, d)} = ${S((W - w - 1) * d + n, d)}`)}`,
          ok: `${W} = ${MX(W - 1, d, d)} — ${MX(W - 1, d, d)} − ${MX(w, n, d)} = ${ans}`,
          wr: [{ text: '맞게 말했어요', tag: RIGHT_AS_WRONG }, { text: `받아내리고 자연수를 그대로 둬서 ${S((W - w) * d + d - n, d)}`, tag: TAGS.noReduce }, { text: '자연수에서는 분수를 뺄 수 없어요', tag: OFF }],
          steps: [`자연수에서 1을 받아내려요 — ${W} = ${MX(W - 1, d, d)}`, `${MX(W - 1, d, d)} − ${MX(w, n, d)} = ${ans}`],
          whyAny: `빼는 수의 분수 부분(${n}/${d})을 그대로 붙였어요. 받아내린 1(= ${d}/${d})에서 ${n}/${d}만큼 빼면 남는 것은 ${d - n}/${d}.`,
          probe: { ask: 'keep', W, w, n, d },
        });
      }
      const [W, d, n] = draw(() => [int(r, 2, 5), int(r, 3, 9), int(r, 1, 8)], ([W1, d1, n1]) => n1 < d1 && W1 > n1
        && distinct([W1 * d1 - n1, d1], [W1 - n1, d1], [W1 * d1 + n1, d1]));
      const ans = S(W * d - n, d);
      return misAsk(r, c, this, 'num', {
        q: `뺄셈을 계산해요.\n\n${showWork(`${W} − ${n}/${d} = ${S(W - n, d)}`)}`,
        ok: `${W} = ${MX(W - 1, d, d)} — ${MX(W - 1, d, d)} − ${n}/${d} = ${ans}`,
        wr: [{ text: '맞게 말했어요', tag: RIGHT_AS_WRONG }, { text: `빼지 않고 더해서 ${S(W * d + n, d)}`, tag: TAGS.addForSub }, { text: '자연수에서는 분수를 뺄 수 없어요', tag: OFF }],
        steps: [`자연수에서 1을 받아내려요 — ${W} = ${MX(W - 1, d, d)}`, `${MX(W - 1, d, d)} − ${n}/${d} = ${ans}`],
        whyAny: `자연수 ${W}에서 분자 ${n}을 뺐어요. ${W}은 ${n}/${d}보다 훨씬 커요 — 1을 받아내려 분수로 바꾼 다음 빼요.`,
        probe: { ask: 'num', W, n, d },
      });
    },
  },

  {
    id: 'fadd.borrow', grade: 4, name: '받아내림이 있는 대분수의 뺄셈', needs: ['fadd.whole'],
    idea: '3 1/4 − 1 3/4 — 분수 부분은 1/4, 빼는 분수는 3/4 — 작은 수에서 큰 수를 뺄 수 없어서 **자연수에서 1을 받아내려요**: 3 1/4 = 2 5/4. 2 5/4 − 1 3/4 = 1 2/4. 가분수로 바꿔 빼도 돼요 — 13/4 − 7/4 = 6/4 = 1 2/4. 받아내리면 자연수는 1 작아져요.',
    rule: '분수 부분끼리 뺄 수 없으면 자연수에서 1을 받아내려요 — 자연수는 1 작아져요.',
    slip: '받아내린 다음 자연수를 1 줄였는지, 분수 부분을 거꾸로 빼지 않았는지 봐요.',
    calc(r, c) {
      const fams = [];
      const pickB = () => draw(() => [int(r, 2, 6), int(r, 1, 4), int(r, 3, 9), int(r, 1, 7), int(r, 2, 8)], ([W1, W2, d, n1, n2]) => n1 < n2 && n2 < d && W2 <= W1 - 1
        && distinct(...candB(W1, n1, W2, n2, d)));
      function candB(W1, n1, W2, n2, d) {
        const t = (W1 - W2) * d + n1 - n2;
        return [[t, d], [(W1 - W2) * d + n2 - n1, d], [(W1 - W2) * d + n1 + d - n2, d], [(W1 + W2) * d + n1 + n2, d]];
      }
      const wr = (W1, n1, W2, n2, d) => {
        const out = [
          { text: S((W1 - W2) * d + n2 - n1, d), tag: TAGS.swapSub },
          { text: S((W1 - W2) * d + n1 + d - n2, d), tag: TAGS.noReduce },
          { text: S((W1 + W2) * d + n1 + n2, d), tag: TAGS.addForSub },
        ];
        const bad = (W1 + n1) - (W2 + n2);
        if (bad > 0 && ![(W1 - W2) * d + n1 - n2, (W1 - W2) * d + n2 - n1, (W1 - W2) * d + n1 + d - n2, (W1 + W2) * d + n1 + n2].includes(bad)) out.push({ text: S(bad, d), tag: TAGS.badImproper });
        return out;
      };
      const whys = (W1, n1, W2, n2, d) => ({
        [TAGS.swapSub]: `분수 부분을 거꾸로(${n2}/${d} − ${n1}/${d}) 뺐어요 — 빼는 순서는 바꿀 수 없어요. 1을 받아내려요: ${MX(W1, n1, d)} = ${MX(W1 - 1, n1 + d, d)}.`,
        [TAGS.noReduce]: `1을 받아내렸으면 자연수 ${W1}은 ${W1 - 1}로 줄어요.`,
        [TAGS.addForSub]: '빼야 해요 — 더하지 않아요.',
        [TAGS.badImproper]: `${MX(W1, n1, d)} = (${W1} × ${d} + ${n1})/${d} = ${W1 * d + n1}/${d} — 자연수에 분모를 곱해요.`,
      });
      const way1 = (W1, n1, W2, n2, d) => [`자연수에서 1을 받아내려요 — ${MX(W1, n1, d)} = ${MX(W1 - 1, n1 + d, d)}`, `${MX(W1 - 1, n1 + d, d)} − ${MX(W2, n2, d)} = ${S((W1 - W2) * d + n1 - n2, d)}`];
      const way2 = (W1, n1, W2, n2, d) => [`가분수로 바꿔요 — ${MX(W1, n1, d)} = ${W1 * d + n1}/${d}, ${MX(W2, n2, d)} = ${W2 * d + n2}/${d}`, `${W1 * d + n1}/${d} − ${W2 * d + n2}/${d} = ${chainS((W1 - W2) * d + n1 - n2, d)}`];
      const one = (t, way) => { const [W1, W2, d, n1, n2] = pickB(); return { t: t(W1, n1, W2, n2, d), ans: S((W1 - W2) * d + n1 - n2, d), wr: wr(W1, n1, W2, n2, d), steps: way(W1, n1, W2, n2, d), why: whys(W1, n1, W2, n2, d), fmt: S, probe: { ask: 'calc' } }; };
      const expr = (W1, n1, W2, n2, d) => calcQ(`${MX(W1, n1, d)} − ${MX(W2, n2, d)}`);
      fams.push(famOf([one(expr, way1)]));
      fams.push(famOf([one(expr, way2)]));
      fams.push(famOf([one((W1, n1, W2, n2, d) => `철사 ${MX(W1, n1, d)} m 중 ${MX(W2, n2, d)} m만큼 썼어요. 남은 철사는 몇 m일까요?`, way1)]));
      return askFam(r, c, this, fams);
    },
    misread(r, c) {
      const [W1, W2, d, n1, n2] = draw(() => [int(r, 2, 5), int(r, 1, 3), int(r, 3, 8), int(r, 1, 6), int(r, 2, 7)], ([a, b, dd, x, y]) => x < y && y < dd && b <= a - 1
        && distinct([(a - b) * dd + x - y, dd], [(a - b) * dd + y - x, dd], [(a - b) * dd + x + dd - y, dd]));
      const ans = S((W1 - W2) * d + n1 - n2, d);
      const swap = S((W1 - W2) * d + n2 - n1, d); const noRed = S((W1 - W2) * d + n1 + d - n2, d);
      if (branchOf(r, c, ['swap', 'keep']) === 'swap') {
        return misAsk(r, c, this, 'swap', {
          q: `그림을 보고 뺄셈을 계산해요.\n\n[fsub ${MX(W1, n1, d)} | ${MX(W2, n2, d)}]\n\n${showWork(`${MX(W1, n1, d)} − ${MX(W2, n2, d)} = ${swap}`)}`,
          ok: `받아내려서 ${MX(W1 - 1, n1 + d, d)} − ${MX(W2, n2, d)} = ${ans}`,
          wr: [{ text: '맞게 말했어요', tag: RIGHT_AS_WRONG }, { text: `받아내리고 자연수를 그대로 둬서 ${noRed}`, tag: TAGS.noReduce }, { text: '분수 부분이 작으면 뺄 수 없어요', tag: OFF }],
          steps: [`자연수에서 1을 받아내려요 — ${MX(W1, n1, d)} = ${MX(W1 - 1, n1 + d, d)}`, `${MX(W1 - 1, n1 + d, d)} − ${MX(W2, n2, d)} = ${ans}`],
          whyAny: '분수 부분을 거꾸로 뺐어요(큰 것에서 작은 것을). 빼는 순서는 바꿀 수 없어요 — 1을 받아내려요.',
          probe: { ask: 'swap', W1, n1, W2, n2, d },
        });
      }
      return misAsk(r, c, this, 'keep', {
        q: `뺄셈을 계산해요.\n\n${showWork(`${MX(W1, n1, d)} − ${MX(W2, n2, d)} = ${MX(W1, n1 + d, d)} − ${MX(W2, n2, d)} = ${noRed}`)}`,
        ok: `받아내리면 자연수가 1 작아져요 — ${MX(W1 - 1, n1 + d, d)} − ${MX(W2, n2, d)} = ${ans}`,
        wr: [{ text: '맞게 말했어요', tag: RIGHT_AS_WRONG }, { text: `분수 부분을 거꾸로 빼서 ${swap}`, tag: TAGS.swapSub }, { text: '분수 부분이 작으면 뺄 수 없어요', tag: OFF }],
        steps: [`${MX(W1, n1, d)} = ${MX(W1 - 1, n1 + d, d)} — 자연수가 ${W1 - 1}`, `${MX(W1 - 1, n1 + d, d)} − ${MX(W2, n2, d)} = ${ans}`],
        whyAny: `1을 받아내려 분수 부분을 바꾸고(${n1 + d}/${d}) 자연수 ${W1}은 그대로 뒀어요. 받아내리면 자연수는 ${W1 - 1}이 돼요.`,
        probe: { ask: 'keep', W1, n1, W2, n2, d },
      });
    },
  },

  {
    id: 'fadd.diff', grade: 5, name: '분모가 다른 진분수의 덧셈과 뺄셈', needs: ['fadd.borrow'],
    idea: '1/6 + 2/9 — 분모가 다르면 조각의 크기가 달라서 바로 못 더해요. **통분**해서 분모를 같게 한 다음 분자끼리 더해요: 두 분모의 최소공배수 18로 3/18 + 4/18 = 7/18. 두 분모의 곱 54로 통분해도 돼요 — 9/54 + 12/54 = 21/54 = 7/18. 뺄셈도 같아요 — 3/4 − 1/6 = 9/12 − 2/12 = 7/12.',
    rule: '분모가 다르면 통분한 다음 분자끼리 더하고 빼요 — 분모는 그대로.',
    slip: '통분할 때 분자에도 같은 수를 곱했는지 봐요.',
    calc(r, c) {
      const fams = [];
      // 덧셈 — mult: 한 분모가 다른 분모의 배수 · carry: 합이 1보다 큼
      const pickAdd = (mult, carry) => draw(() => { const [b, d] = pairDen(r, mult); return [b, d, numOf(r, b), numOf(r, d)]; }, ([b, d, a, cc]) => {
        const { L, A, C } = lcdOf(a, b, cc, d);
        return (carry ? A + C > L : A + C < L) && distinct(...addWr(a, b, cc, d).map((w) => w.pair), [A + C, L]);
      });
      function addWr(a, b, cc, d) {
        const { L, A, C } = lcdOf(a, b, cc, d);
        const out = [{ pair: [a + cc, b + d], tag: TAGS.denSum }, { pair: [a + cc, L], tag: TAGS.noLcd }];
        if (b !== L && d !== L) out.push({ pair: [A + cc, L], tag: TAGS.oneLcd });
        if (A + C > L) out.push({ pair: [A + C - L, L], tag: TAGS.dropOne });
        return out;
      }
      const pickSub = () => draw(() => { const [b, d] = pairDen(r, r() < 0.5); return [b, d, numOf(r, b), numOf(r, d)]; }, ([b, d, a, cc]) => {
        const { L, A, C } = lcdOf(a, b, cc, d);
        const w = subWr(a, b, cc, d);
        return A > C && w.length >= 2 && distinct(...w.map((x) => x.pair), [A - C, L]);
      });
      function subWr(a, b, cc, d) {
        const { L, A, C } = lcdOf(a, b, cc, d);
        const out = [{ pair: [A + C, L], tag: TAGS.addForSub }];
        if (a > cc) out.push({ pair: [a - cc, L], tag: TAGS.noLcdSub });
        if (a > cc && b > d) out.push({ pair: [a - cc, b - d], tag: TAGS.denSub });
        if (b !== L && d !== L && A - cc > 0) out.push({ pair: [A - cc, L], tag: TAGS.oneLcd });
        return out;
      }
      const whys = (a, b, cc, d) => {
        const { L, A, C } = lcdOf(a, b, cc, d);
        return {
          [TAGS.denSum]: `분모끼리 더하면 조각의 크기가 바뀌어요 — ${L}칸으로 통분해서 분자끼리 더해요.`,
          [TAGS.noLcd]: `분모를 ${L}로 바꿨으면 분자에도 같은 수를 곱해요 — ${a} → ${A}, ${cc} → ${C}.`,
          [TAGS.oneLcd]: `한쪽만 통분했어요 — 두 분수 모두 ${L}칸으로: ${A}/${L}, ${C}/${L}.`,
          [TAGS.dropOne]: `분자 ${A + C}이 분모 ${L}보다 커서 1이 들어 있어요 — 대분수로 ${V(A + C, L)}.`,
          [TAGS.addForSub]: '빼야 해요 — 더하지 않아요.',
          [TAGS.noLcdSub]: `분모를 ${L}로 바꿨으면 분자에도 같은 수를 곱해요 — ${a} → ${A}, ${cc} → ${C}.`,
          [TAGS.denSub]: `분모끼리 빼면 조각의 크기가 바뀌어요 — ${L}칸으로 통분해서 분자끼리 빼요.`,
        };
      };
      const addOne = (mult, carry, t) => {
        const [b, d, a, cc] = pickAdd(mult, carry); const { L, A, C } = lcdOf(a, b, cc, d);
        return { t: t(a, b, cc, d), ans: V(A + C, L), wr: addWr(a, b, cc, d).map((w) => ({ text: V(...w.pair), tag: w.tag })), steps: [lcdLine(0, a, b, 0, cc, d), `${A}/${L} + ${C}/${L} = ${chain(A + C, L)}`], why: whys(a, b, cc, d), probe: { ask: 'calc', carry } };
      };
      const subOne = (t) => {
        const [b, d, a, cc] = pickSub(); const { L, A, C } = lcdOf(a, b, cc, d);
        return { t: t(a, b, cc, d), ans: V(A - C, L), wr: subWr(a, b, cc, d).map((w) => ({ text: V(...w.pair), tag: w.tag })), steps: [lcdLine(0, a, b, 0, cc, d), `${A}/${L} − ${C}/${L} = ${chain(A - C, L)}`], why: whys(a, b, cc, d), probe: { ask: 'calc' } };
      };
      fams.push(famOf([addOne(true, false, (a, b, cc, d) => calcQ(`${a}/${b} + ${cc}/${d}`))]));
      fams.push(famOf([addOne(false, false, (a, b, cc, d) => calcQ(`${a}/${b} + ${cc}/${d}`))]));
      fams.push(famOf([addOne(r() < 0.5, true, (a, b, cc, d) => calcQ(`${a}/${b} + ${cc}/${d}`))]));
      fams.push(famOf([subOne((a, b, cc, d) => calcQ(`${a}/${b} − ${cc}/${d}`))]));
      fams.push(famOf([
        addOne(r() < 0.5, r() < 0.4, (a, b, cc, d) => `{mon/은/는} 우유를 ${a}/${b} L 마시고 주스를 ${cc}/${d} L 마셨어요. 마신 것은 모두 몇 L일까요?`),
        subOne((a, b, cc, d) => `색 테이프 ${a}/${b} m 중 ${cc}/${d} m만큼 썼어요. 남은 테이프는 몇 m일까요?`),
      ]));
      return askFam(r, c, this, fams);
    },
    misread(r, c) {
      const [b, d, a, cc] = draw(() => { const [b1, d1] = pairDen(r, r() < 0.5); return [b1, d1, numOf(r, b1), numOf(r, d1)]; }, ([b1, d1, a1, c1]) => {
        const { L, A, C } = lcdOf(a1, b1, c1, d1);
        return A + C < L && distinct([A + C, L], [a1 + c1, b1 + d1], [a1 + c1, L]);
      });
      const { L, A, C } = lcdOf(a, b, cc, d); const ans = V(A + C, L);
      if (branchOf(r, c, ['den', 'nolcd']) === 'den') {
        return misAsk(r, c, this, 'den', {
          q: `그림을 보고 덧셈을 계산해요.\n\n[bars ${a}/${b} ${cc}/${d}]\n\n${showWork(`${a}/${b} + ${cc}/${d} = ${a + cc}/${b + d}`)}`,
          ok: `통분해서 분자끼리 — ${A}/${L} + ${C}/${L} = ${ans}`,
          wr: [{ text: '맞게 말했어요', tag: RIGHT_AS_WRONG }, { text: `통분 없이 분자만 더해서 ${V(a + cc, L)}`, tag: TAGS.noLcd }, { text: '분모가 다르면 더할 수 없어요', tag: OFF }],
          steps: [lcdLine(0, a, b, 0, cc, d), `${A}/${L} + ${C}/${L} = ${chain(A + C, L)}`],
          whyAny: '분모끼리 더했어요. 조각의 크기가 다르면 먼저 통분해서 크기를 맞춰요.',
          probe: { ask: 'den', a, b, cc, d },
        });
      }
      return misAsk(r, c, this, 'nolcd', {
        q: `덧셈을 계산해요.\n\n${showWork(`${a}/${b} + ${cc}/${d} = ${a + cc}/${L}`)}`,
        ok: `분자에도 같은 수를 곱해요 — ${A}/${L} + ${C}/${L} = ${ans}`,
        wr: [{ text: '맞게 말했어요', tag: RIGHT_AS_WRONG }, { text: `분모끼리 더해서 ${V(a + cc, b + d)}`, tag: TAGS.denSum }, { text: '분모가 다르면 더할 수 없어요', tag: OFF }],
        steps: [lcdLine(0, a, b, 0, cc, d), `${A}/${L} + ${C}/${L} = ${chain(A + C, L)}`],
        whyAny: `분모만 ${L}로 바꾸고 분자는 그대로 더했어요. 통분할 때는 분모와 분자에 같은 수를 곱해요.`,
        probe: { ask: 'nolcd', a, b, cc, d },
      });
    },
  },

  {
    id: 'fadd.dmixadd', grade: 5, name: '분모가 다른 대분수의 덧셈', needs: ['fadd.diff'],
    idea: '1 1/4 + 2 2/3 — 통분한 다음 **자연수끼리, 분수끼리** 더해요: 1 3/12 + 2 8/12 = 3 11/12. 분수끼리 더한 값이 1보다 크면 받아올림해요 — 3 5/6 + 2 1/4 = 3 10/12 + 2 3/12 = 5 13/12 = 6 1/12. 가분수로 바꿔 통분해서 더해도 돼요. 계산하기 전에 결과를 어림하면(5 + 1보다 커요) 실수를 찾기 쉬워요.',
    rule: '통분한 다음 자연수끼리, 분수끼리 더해요 — 분수 부분이 1을 넘으면 받아올림.',
    slip: '통분한 다음 분수끼리 더한 값이 1보다 크면 받아올림했는지 봐요.',
    calc(r, c) {
      const fams = [];
      const pickD = (carry) => draw(() => { const [b, d] = pairDen(r, r() < 0.4); return [int(r, 1, 4), b, numOf(r, b), int(r, 1, 3), d, numOf(r, d)]; }, ([w1, b, a, w2, d, cc]) => {
        const { L, A, C } = lcdOf(a, b, cc, d);
        return (carry ? A + C > L : A + C < L) && distinct(...wrD(w1, a, b, w2, cc, d).map((x) => x.pair), [(w1 + w2) * L + A + C, L]);
      });
      function wrD(w1, a, b, w2, cc, d) {
        const { L, A, C } = lcdOf(a, b, cc, d); const W = w1 + w2;
        const out = [];
        if (A + C > L) out.push({ pair: [W * L + A + C - L, L], tag: TAGS.noCarry });
        out.push({ pair: [W * (b + d) + a + cc, b + d], tag: TAGS.denSum });
        out.push({ pair: [W * L + a + cc, L], tag: TAGS.noLcd });
        out.push({ pair: [(w1 + a) * d + (w2 + cc) * b, b * d], tag: TAGS.badImproper });
        return out;
      }
      const whys = (w1, a, b, w2, cc, d) => {
        const { L, A, C } = lcdOf(a, b, cc, d);
        return {
          [TAGS.noCarry]: `분수끼리 ${A}/${L} + ${C}/${L} = ${A + C}/${L} — 1보다 커서 1을 자연수로 받아올려요.`,
          [TAGS.denSum]: `분모끼리 더하면 조각의 크기가 바뀌어요 — ${L}칸으로 통분해요.`,
          [TAGS.noLcd]: `분모를 ${L}로 바꿨으면 분자에도 같은 수를 곱해요 — ${a} → ${A}, ${cc} → ${C}.`,
          [TAGS.badImproper]: `${MX(w1, a, b)} = (${w1} × ${b} + ${a})/${b} = ${w1 * b + a}/${b} — 자연수에 분모를 곱해요.`,
        };
      };
      const way1 = (w1, a, b, w2, cc, d) => {
        const { L, A, C } = lcdOf(a, b, cc, d); const W = w1 + w2; const f = A + C; const tot = W * L + f;
        return f > L
          ? [lcdLine(w1, a, b, w2, cc, d), `자연수끼리 ${w1} + ${w2} = ${W}, 분수끼리 ${A}/${L} + ${C}/${L} = ${chain(f, L)}`, `${W} + ${V(f, L)} = ${V(tot, L)}`]
          : [lcdLine(w1, a, b, w2, cc, d), `자연수끼리 ${w1} + ${w2} = ${W}, 분수끼리 ${A}/${L} + ${C}/${L} = ${chain(f, L)}`, `${W} + ${V(f, L)} = ${V(tot, L)}`];
      };
      const way2 = (w1, a, b, w2, cc, d) => {
        const { L } = lcdOf(a, b, cc, d); const P = w1 * b + a; const Q = w2 * d + cc;
        return [`가분수로 바꿔요 — ${MX(w1, a, b)} = ${P}/${b}, ${MX(w2, cc, d)} = ${Q}/${d}`, `통분하면 ${P * (L / b)}/${L} + ${Q * (L / d)}/${L} = ${chain(P * (L / b) + Q * (L / d), L)}`];
      };
      const one = (carry, t, way) => {
        const [w1, b, a, w2, d, cc] = pickD(carry); const { L, A, C } = lcdOf(a, b, cc, d);
        return { t: t(w1, a, b, w2, cc, d), ans: V((w1 + w2) * L + A + C, L), wr: wrD(w1, a, b, w2, cc, d).map((w) => ({ text: V(...w.pair), tag: w.tag })), steps: way(w1, a, b, w2, cc, d), why: whys(w1, a, b, w2, cc, d), probe: { ask: 'calc', carry } };
      };
      const expr = (w1, a, b, w2, cc, d) => calcQ(`${MX(w1, a, b)} + ${MX(w2, cc, d)}`);
      fams.push(famOf([one(false, expr, way1)]));
      fams.push(famOf([one(true, expr, way1)]));
      fams.push(famOf([one(true, expr, way2)]));
      fams.push(famOf([one(r() < 0.6, (w1, a, b, w2, cc, d) => `{mon/은/는} 어제 ${MX(w1, a, b)} km, 오늘 ${MX(w2, cc, d)} km 달렸어요. 모두 몇 km 달렸을까요?`, way1)]));
      return askFam(r, c, this, fams);
    },
    misread(r, c) {
      const [w1, b, a, w2, d, cc] = draw(() => { const [b1, d1] = pairDen(r, r() < 0.4); return [int(r, 1, 3), b1, numOf(r, b1), int(r, 1, 3), d1, numOf(r, d1)]; }, ([x1, b1, a1, x2, d1, c1]) => {
        const { L, A, C } = lcdOf(a1, b1, c1, d1); const W = x1 + x2;
        return A + C > L && distinct([W * L + A + C, L], [W * L + A + C - L, L], [W * (b1 + d1) + a1 + c1, b1 + d1]);
      });
      const { L, A, C } = lcdOf(a, b, cc, d); const W = w1 + w2; const ans = V(W * L + A + C, L); const noC = V(W * L + A + C - L, L);
      if (branchOf(r, c, ['carry', 'est']) === 'carry') {
        return misAsk(r, c, this, 'carry', {
          q: `덧셈을 계산해요.\n\n${showWork(`${MX(w1, a, b)} + ${MX(w2, cc, d)} = ${noC}`)}`,
          ok: `분수끼리 더하면 1보다 커요 — 받아올려서 ${ans}`,
          wr: [{ text: '맞게 말했어요', tag: RIGHT_AS_WRONG }, { text: `분모끼리 더해서 ${V(W * (b + d) + a + cc, b + d)}`, tag: TAGS.denSum }, { text: '대분수는 통분할 수 없어요', tag: OFF }],
          steps: [lcdLine(w1, a, b, w2, cc, d), `분수끼리 ${A}/${L} + ${C}/${L} = ${chain(A + C, L)} — ${W} + ${V(A + C, L)} = ${ans}`],
          whyAny: '받아올림을 빠뜨렸어요. 분수끼리 더한 값에 1이 들어 있으면 자연수에 1을 더해요.',
          probe: { ask: 'carry', w1, a, b, w2, cc, d },
        });
      }
      return misAsk(r, c, this, 'est', {
        q: `덧셈 ${MX(w1, a, b)} + ${MX(w2, cc, d)} — 결과를 어림해요.\n\n${showWork(`자연수끼리 더하면 ${W}이니까 결과는 ${W + 1}보다 작아요`)}`,
        ok: `분수끼리 더하면 1보다 커요 — ${MX(w1, a, b)} + ${MX(w2, cc, d)} = ${ans}`,
        wr: [{ text: '맞게 말했어요', tag: RIGHT_AS_WRONG }, { text: `받아올림을 빠뜨려서 ${noC}`, tag: TAGS.noCarry }, { text: '대분수의 덧셈은 어림할 수 없어요', tag: OFF }],
        steps: [`${a}/${b} + ${cc}/${d} — 통분하면 ${A}/${L} + ${C}/${L} = ${chain(A + C, L)}, 1보다 커요`, `${W} + ${V(A + C, L)} = ${ans} — ${W + 1}보다 커요`],
        whyAny: `분수 부분도 봐야 해요. 분수 부분의 합(${a}/${b} + ${cc}/${d})이 1보다 크면 결과는 ${W + 1}보다 커요.`,
        probe: { ask: 'est', w1, a, b, w2, cc, d },
      });
    },
  },

  {
    id: 'fadd.dmixsub', grade: 5, name: '분모가 다른 대분수의 뺄셈', needs: ['fadd.dmixadd'],
    idea: '2 4/5 − 1 1/6 — 통분한 다음 자연수끼리, 분수끼리 빼요: 2 24/30 − 1 5/30 = 1 19/30. 분수 부분끼리 뺄 수 없으면 **자연수에서 1을 받아내려요** — 4 3/10 − 1 5/6 = 4 9/30 − 1 25/30 = 3 39/30 − 1 25/30 = 2 14/30 = 2 7/15. 받아내린 다음에는 자연수가 1 작아져요.',
    rule: '통분한 다음 자연수끼리, 분수끼리 빼요 — 분수 부분끼리 뺄 수 없으면 받아내림.',
    slip: '받아내린 다음 자연수를 1 줄였는지 봐요.',
    calc(r, c) {
      const fams = [];
      const pickD = (borrow) => draw(() => { const [b, d] = pairDen(r, r() < 0.4); return [int(r, 2, 5), b, numOf(r, b), int(r, 1, 3), d, numOf(r, d)]; }, ([w1, b, a, w2, d, cc]) => {
        const { L, A, C } = lcdOf(a, b, cc, d);
        if (borrow ? !(A < C && w2 <= w1 - 1) : !(A > C && w2 <= w1)) return false;
        const w = wrD(w1, a, b, w2, cc, d);
        return w.length >= 2 && distinct(...w.map((x) => x.pair), [(w1 - w2) * L + A - C, L]);
      });
      function wrD(w1, a, b, w2, cc, d) {
        const { L, A, C } = lcdOf(a, b, cc, d); const W = w1 - w2;
        const out = [];
        if (A < C) {
          out.push({ pair: [W * L + A + L - C, L], tag: TAGS.noReduce });
          out.push({ pair: [W * L + C - A, L], tag: TAGS.swapSub });
        } else {
          out.push({ pair: [W * L + A, L], tag: TAGS.wholeOnlySub });
          if (a > cc) out.push({ pair: [W * L + a - cc, L], tag: TAGS.noLcdSub });
        }
        out.push({ pair: [(w1 + w2) * L + A + C, L], tag: TAGS.addForSub });
        return out;
      }
      const whys = (w1, a, b, w2, cc, d) => {
        const { L, A, C } = lcdOf(a, b, cc, d);
        return {
          [TAGS.noReduce]: `1을 받아내렸으면 자연수 ${w1}은 ${w1 - 1}로 줄어요.`,
          [TAGS.swapSub]: `분수 부분을 거꾸로(${C}/${L} − ${A}/${L}) 뺐어요 — 1을 받아내려요: ${MX(w1, A, L)} = ${MX(w1 - 1, A + L, L)}.`,
          [TAGS.wholeOnlySub]: `분수 부분도 빼요 — ${A}/${L} − ${C}/${L}.`,
          [TAGS.noLcdSub]: `분모를 ${L}로 바꿨으면 분자에도 같은 수를 곱해요 — ${a} → ${A}, ${cc} → ${C}.`,
          [TAGS.addForSub]: '빼야 해요 — 더하지 않아요.',
        };
      };
      const way1 = (w1, a, b, w2, cc, d) => {
        const { L, A, C } = lcdOf(a, b, cc, d); const tot = (w1 - w2) * L + A - C;
        return A < C
          ? [lcdLine(w1, a, b, w2, cc, d), `받아내려요 — ${MX(w1, A, L)} = ${MX(w1 - 1, A + L, L)}`, `${MX(w1 - 1, A + L, L)} − ${MX(w2, C, L)} = ${chainM(tot, L)}`]
          : [lcdLine(w1, a, b, w2, cc, d), `${MX(w1, A, L)} − ${MX(w2, C, L)} = ${chainM(tot, L)}`];
      };
      const way2 = (w1, a, b, w2, cc, d) => {
        const { L } = lcdOf(a, b, cc, d); const P = w1 * b + a; const Q = w2 * d + cc;
        return [`가분수로 바꿔요 — ${MX(w1, a, b)} = ${P}/${b}, ${MX(w2, cc, d)} = ${Q}/${d}`, `통분하면 ${P * (L / b)}/${L} − ${Q * (L / d)}/${L} = ${chain(P * (L / b) - Q * (L / d), L)}`];
      };
      const one = (borrow, t, way) => {
        const [w1, b, a, w2, d, cc] = pickD(borrow); const { L, A, C } = lcdOf(a, b, cc, d);
        return { t: t(w1, a, b, w2, cc, d), ans: V((w1 - w2) * L + A - C, L), wr: wrD(w1, a, b, w2, cc, d).map((w) => ({ text: V(...w.pair), tag: w.tag })), steps: way(w1, a, b, w2, cc, d), why: whys(w1, a, b, w2, cc, d), probe: { ask: 'calc', borrow } };
      };
      const expr = (w1, a, b, w2, cc, d) => calcQ(`${MX(w1, a, b)} − ${MX(w2, cc, d)}`);
      fams.push(famOf([one(false, expr, way1)]));
      fams.push(famOf([one(true, expr, way1)]));
      fams.push(famOf([one(true, expr, way2)]));
      fams.push(famOf([one(r() < 0.6, (w1, a, b, w2, cc, d) => `밀가루 ${MX(w1, a, b)} kg 중 ${MX(w2, cc, d)} kg만큼 썼어요. 남은 밀가루는 몇 kg일까요?`, way1)]));
      return askFam(r, c, this, fams);
    },
    misread(r, c) {
      const [w1, b, a, w2, d, cc] = draw(() => { const [b1, d1] = pairDen(r, r() < 0.4); return [int(r, 2, 5), b1, numOf(r, b1), int(r, 1, 3), d1, numOf(r, d1)]; }, ([x1, b1, a1, x2, d1, c1]) => {
        const { L, A, C } = lcdOf(a1, b1, c1, d1); const W = x1 - x2;
        return A < C && x2 <= x1 - 1 && distinct([W * L + A - C, L], [W * L + A + L - C, L], [W * L + C - A, L]);
      });
      const { L, A, C } = lcdOf(a, b, cc, d); const W = w1 - w2;
      const ans = V(W * L + A - C, L); const noRed = V(W * L + A + L - C, L); const swap = V(W * L + C - A, L);
      if (branchOf(r, c, ['keep', 'swap']) === 'keep') {
        return misAsk(r, c, this, 'keep', {
          q: `뺄셈을 계산해요.\n\n${showWork(`${MX(w1, a, b)} − ${MX(w2, cc, d)} = ${noRed}`)}`,
          ok: `받아내리면 자연수가 1 작아져요 — ${MX(w1 - 1, A + L, L)} − ${MX(w2, C, L)} = ${ans}`,
          wr: [{ text: '맞게 말했어요', tag: RIGHT_AS_WRONG }, { text: `분수 부분을 거꾸로 빼서 ${swap}`, tag: TAGS.swapSub }, { text: '분모가 다른 대분수는 뺄 수 없어요', tag: OFF }],
          steps: [lcdLine(w1, a, b, w2, cc, d), `받아내려요 — ${MX(w1, A, L)} = ${MX(w1 - 1, A + L, L)}, ${MX(w1 - 1, A + L, L)} − ${MX(w2, C, L)} = ${ans}`],
          whyAny: `1을 받아내려 분수 부분을 바꾸고(${A + L}/${L}) 자연수는 그대로 뒀어요. 받아내리면 자연수는 ${w1 - 1}이 돼요.`,
          probe: { ask: 'keep', w1, a, b, w2, cc, d },
        });
      }
      return misAsk(r, c, this, 'swap', {
        q: `뺄셈을 계산해요.\n\n${showWork(`${MX(w1, a, b)} − ${MX(w2, cc, d)} = ${swap}`)}`,
        ok: `받아내려서 빼요 — ${MX(w1 - 1, A + L, L)} − ${MX(w2, C, L)} = ${ans}`,
        wr: [{ text: '맞게 말했어요', tag: RIGHT_AS_WRONG }, { text: `받아내리고 자연수를 그대로 둬서 ${noRed}`, tag: TAGS.noReduce }, { text: '분모가 다른 대분수는 뺄 수 없어요', tag: OFF }],
        steps: [lcdLine(w1, a, b, w2, cc, d), `받아내려요 — ${MX(w1, A, L)} = ${MX(w1 - 1, A + L, L)}, ${MX(w1 - 1, A + L, L)} − ${MX(w2, C, L)} = ${ans}`],
        whyAny: '분수 부분을 거꾸로 뺐어요. 빼는 순서는 바꿀 수 없어요 — 1을 받아내려요.',
        probe: { ask: 'swap', w1, a, b, w2, cc, d },
      });
    },
  },

  {
    id: 'fadd.apply', grade: 5, name: '⭐ 분수의 덧셈과 뺄셈 활용', needs: ['fadd.dmixsub'],
    idea: '생활 문제를 분수의 덧셈과 뺄셈으로 풀어요 — **"몇 m 더"는 큰 수에서 작은 수를 빼고**, 남은 양은 처음 양에서 쓴 양을 빼요. 더 붓고 쓰면 더하고 빼요 — 2 1/2 + 3/4 − 1 1/4 = 2. □ + 2/5 = 7/10처럼 □를 구할 때는 뺄셈으로 — 7/10 − 2/5 = 3/10.',
    rule: '무엇을 묻는지 보고 더할지 뺄지 정해요 — □는 거꾸로 셈해서.',
    slip: '"더 많이"·"남은"·"□"가 더하기인지 빼기인지 봐요.',
    calc(r, c) {
      const fams = [];
      // 두 수의 차 — X > Y, 분모가 다른 대분수·진분수
      // 두 수 모두 대분수 — 진분수가 섞이면 글 모양(열쇠)이 갈려 쌍둥이가 다른 틀로 간다
      const pickXY = () => draw(() => { const [b, d] = pairDen(r, r() < 0.4); return [int(r, 2, 4), b, numOf(r, b), int(r, 1, 2), d, numOf(r, d)]; }, ([w1, b, a, w2, d, cc]) => {
        const { L, A, C } = lcdOf(a, b, cc, d);
        const X = w1 * L + A; const Y = w2 * L + C;
        const w = wrXY(w1, a, b, w2, cc, d);
        return X > Y && w.length >= 2 && distinct(...w.map((x) => x.pair), [X - Y, L]);
      });
      function wrXY(w1, a, b, w2, cc, d) {
        const { L, A, C } = lcdOf(a, b, cc, d); const W = w1 - w2;
        const out = [{ pair: [(w1 + w2) * L + A + C, L], tag: TAGS.addForSub }];
        if (A < C && W >= 1) { out.push({ pair: [W * L + A + L - C, L], tag: TAGS.noReduce }); out.push({ pair: [W * L + C - A, L], tag: TAGS.swapSub }); }
        if (A > C && a > cc) out.push({ pair: [W * L + a - cc, L], tag: TAGS.noLcdSub });
        return out;
      }
      const whyXY = (w1, a, b, w2, cc, d) => {
        const { L, A, C } = lcdOf(a, b, cc, d);
        return {
          [TAGS.addForSub]: '"몇 m 더"는 차이 — 큰 수에서 작은 수를 빼요.',
          [TAGS.noReduce]: `1을 받아내렸으면 자연수 ${w1}은 ${w1 - 1}로 줄어요.`,
          [TAGS.swapSub]: `분수 부분을 거꾸로(${C}/${L} − ${A}/${L}) 뺐어요 — 1을 받아내려요.`,
          [TAGS.noLcdSub]: `분모를 ${L}로 바꿨으면 분자에도 같은 수를 곱해요 — ${a} → ${A}, ${cc} → ${C}.`,
        };
      };
      const stepsXY = (w1, a, b, w2, cc, d) => {
        const { L, A, C } = lcdOf(a, b, cc, d); const tot = (w1 - w2) * L + A - C;
        return A < C
          ? [lcdLine(w1, a, b, w2, cc, d), `받아내려요 — ${MX(w1, A, L)} = ${MX(w1 - 1, A + L, L)}, ${MX(w1 - 1, A + L, L)} − ${MX(w2, C, L)} = ${chainM(tot, L)}`]
          : [lcdLine(w1, a, b, w2, cc, d), `${MX(w1, A, L)} − ${MX(w2, C, L)} = ${chainM(tot, L)}`];
      };
      const xy = (t) => {
        const [w1, b, a, w2, d, cc] = pickXY(); const { L, A, C } = lcdOf(a, b, cc, d);
        return { t: t(w1, a, b, w2, cc, d), ans: V((w1 - w2) * L + A - C, L), wr: wrXY(w1, a, b, w2, cc, d).map((w) => ({ text: V(...w.pair), tag: w.tag })), steps: stepsXY(w1, a, b, w2, cc, d), why: whyXY(w1, a, b, w2, cc, d), probe: { ask: 'diff' } };
      };
      fams.push(famOf([xy((w1, a, b, w2, cc, d) => `초록 로봇은 ${MX(w1, a, b)} m, 파란 로봇은 ${MX(w2, cc, d)} m 움직였어요. 초록 로봇은 파란 로봇보다 몇 m 더 움직였을까요?`)]));
      fams.push(famOf([xy((w1, a, b, w2, cc, d) => `**□ + ${MX(w2, cc, d)} = ${MX(w1, a, b)}** — □에 알맞은 수는 얼마일까요?`)]));
      // 더 붓고 쓰기 — X + Y − Z (분모 2·3·4·6·12)
      fams.push(famOf([(() => {
        const DEN = [2, 3, 4, 6, 12];
        const [w, x, p, y, q, z, s] = draw(() => { const p1 = DEN[int(r, 0, 4)]; const q1 = DEN[int(r, 0, 4)]; const s1 = DEN[int(r, 0, 4)]; return [int(r, 1, 3), numOf(r, p1), p1, numOf(r, q1), q1, numOf(r, s1), s1]; }, ([w1, x1, p1, y1, q1, z1, s1]) => {
          const L = lcm(lcm(p1, q1), s1); const X = w1 * L + x1 * (L / p1); const Y = y1 * (L / q1); const Z = z1 * (L / s1);
          return !(p1 === q1 && q1 === s1) && X + Y - Z > 0 && distinct([X + Y - Z, L], [X + Y + Z, L], [X + Y, L], [X - Y - Z, L]);
        });
        const L = lcm(lcm(p, q), s); const X = w * L + x * (L / p); const Y = y * (L / q); const Z = z * (L / s);
        return {
          t: `물통에 물이 ${MX(w, x, p)} L 있었어요. ${y}/${q} L만큼 더 붓고 ${z}/${s} L만큼 썼다면 남은 물은 몇 L일까요?`, ans: V(X + Y - Z, L),
          wr: [{ text: V(X + Y + Z, L), tag: TAGS.allAdd }, { text: V(X + Y, L), tag: TAGS.dropLast }, { text: V(X - Y - Z, L), tag: TAGS.subAll }],
          steps: [`세 수를 ${L}로 통분하면 ${MX(w, X - w * L, L)} + ${Y}/${L} − ${Z}/${L}`, `더 부은 것은 더하고 쓴 것은 빼요 — ${X}/${L} + ${Y}/${L} − ${Z}/${L} = ${chain(X + Y - Z, L)}`],
          why: { [TAGS.allAdd]: '쓴 물은 빼요 — 더하지 않아요.', [TAGS.dropLast]: `쓴 물 ${z}/${s} L까지 빼요.`, [TAGS.subAll]: '더 부은 물은 더해요 — 빼지 않아요.' },
          probe: { ask: 'water' }, rule: '더 부은 것은 더하고, 쓴 것은 빼요.',
        };
      })()]));
      return askFam(r, c, this, fams);
    },
    misread(r, c) {
      const [w1, b, a, w2, d, cc] = draw(() => { const [b1, d1] = pairDen(r, r() < 0.4); return [int(r, 1, 3), b1, numOf(r, b1), int(r, 0, 1), d1, numOf(r, d1)]; }, ([x1, b1, a1, x2, d1, c1]) => {
        const { L, A, C } = lcdOf(a1, b1, c1, d1);
        return A > C && a1 > c1 && x2 <= x1 && distinct([(x1 - x2) * L + A - C, L], [(x1 + x2) * L + A + C, L], [(x1 - x2) * L + a1 - c1, L]);
      });
      const { L, A, C } = lcdOf(a, b, cc, d);
      const ans = V((w1 - w2) * L + A - C, L); const sum = V((w1 + w2) * L + A + C, L); const nol = V((w1 - w2) * L + a - cc, L);
      if (branchOf(r, c, ['diff', 'box']) === 'diff') {
        return misAsk(r, c, this, 'diff', {
          q: `초록 로봇은 ${MX(w1, a, b)} m, 파란 로봇은 ${MX(w2, cc, d)} m 움직였어요. 초록 로봇은 파란 로봇보다 몇 m 더 움직였을까요?\n\n${showWork(`${MX(w1, a, b)} + ${MX(w2, cc, d)} = ${sum}`, '구했어요')}`,
          ok: `더 움직인 거리는 빼서 — ${MX(w1, a, b)} − ${MX(w2, cc, d)} = ${ans}`,
          wr: [{ text: '맞게 말했어요', tag: RIGHT_AS_WRONG }, { text: `통분 없이 분자만 빼서 ${nol}`, tag: TAGS.noLcdSub }, { text: '움직인 거리는 서로 비교할 수 없어요', tag: OFF }],
          steps: [lcdLine(w1, a, b, w2, cc, d), `${MX(w1, A, L)} − ${MX(w2, C, L)} = ${chainM((w1 - w2) * L + A - C, L)}`],
          whyAny: '"몇 m 더"는 차이예요 — 두 거리를 더하지 않고 빼요.',
          probe: { ask: 'diff', w1, a, b, w2, cc, d },
        });
      }
      return misAsk(r, c, this, 'box', {
        q: `**□ + ${MX(w2, cc, d)} = ${MX(w1, a, b)}** — □를 구해요.\n\n${showWork(`□ = ${MX(w1, a, b)} + ${MX(w2, cc, d)} = ${sum}`)}`,
        ok: `□는 빼서 구해요 — ${MX(w1, a, b)} − ${MX(w2, cc, d)} = ${ans}`,
        wr: [{ text: '맞게 말했어요', tag: RIGHT_AS_WRONG }, { text: `통분 없이 분자만 빼서 ${nol}`, tag: TAGS.noLcdSub }, { text: '□가 있는 식은 풀 수 없어요', tag: OFF }],
        steps: [`거꾸로 셈해요 — □ = ${MX(w1, a, b)} − ${MX(w2, cc, d)}`, `${MX(w1, A, L)} − ${MX(w2, C, L)} = ${chainM((w1 - w2) * L + A - C, L)}`],
        whyAny: '□에 더한 수를 또 더했어요. □를 구하려면 거꾸로 — 빼요.',
        probe: { ask: 'box', w1, a, b, w2, cc, d },
      });
    },
  },
];

export function conceptById(id) {
  return FADD.find((c) => c.id === id) || null;
}

// ───────────────────── 문항 만들기 (mathfmul과 같은 모양) ─────────────────────

const SLIP = '한 번 더 천천히 — 분모가 같은지 보고, 분자끼리 계산했는지 확인해요.';
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
  return diagnosticOf(FADD, makeQuestion, seed, n, opts);
}
export function placeFrom(answers) {
  return placeFromOf(FADD, answers);
}
export function ladder(doneIds) {
  return ladderOf(FADD, doneIds);
}

// ───────────────────── 사람이 쓴 내용 검사 (check.mjs가 부른다) ─────────────────────

function badPlaceholders(txt) {
  const leak = String(txt || '').match(/\{[^}]*\}/g) || [];
  return leak.filter((l) => !/^\{(me|mon|mon2)(\/[^/}]+\/[^}]+)?\}$/.test(l));
}

/**
 * coach/math/fracadd.json 형식 검사 — mathfmul.checkContent와 같은 규칙 (값은 분수·대분수까지 읽는다)
 * @returns {string[]}
 */
export function checkContent(content) {
  const bad = [];
  for (const c of FADD) {
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
      const ov = fracVal(ck.ok);
      for (const n of ck.no) {
        if (String(n).trim() === String(ck.ok).trim()) bad.push(`${c.id}[${i}]: 정답이 오답에도 있음`);
        if (sameV(ov, fracVal(n))) bad.push(`${c.id}[${i}]: 값이 같은 보기 (${ck.ok} = ${n})`);
      }
      if (new Set(ck.no.map((n) => String(n).trim())).size !== ck.no.length) bad.push(`${c.id}[${i}]: 오답끼리 겹침`);
    }
    const d = v.dad;
    if (!d || !d.goal || !Array.isArray(d.say) || !d.say.length || !d.do) bad.push(`${c.id}: 아빠 카드 미완`);
    if (d && (!Array.isArray(d.traps) || !d.traps.length || !d.pass)) bad.push(`${c.id}: 아빠 카드 함정·통과 기준 없음`);
    if (v.why || v.special) checkHuman(c.id, v, bad, fracVal);
  }
  return bad;
}
