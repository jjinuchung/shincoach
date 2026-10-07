// ➗ 수학 — T 분수의 나눗셈 줄기 (초6 「분수의 나눗셈」 6-1·6-2): 개념 사다리 + 문제 생성기 + 내용 형식 검사.
// 순수 함수만 — 화면 없음 (node 테스트에서 그대로 돈다).
//
// 왜 이 줄기인가 (2026-10-06, 아버님 "초등 과정으로 만들 줄기는 없는거야?" → 5·6학년 단원 대조 → "초등 줄기(분수의 나눗셈)를 먼저 하자"
//   → 설계안 "이대로 진행하자"): A 분수 줄기의 나눗셈은 두 칸뿐이고(분수 ÷ 자연수 · 분수 ÷ 분수 뒤집어 곱하기) 배움 장이 없다.
//   분수 ÷ 분수는 규칙("뒤집어 곱하기")만 외우면 까닭 없이 보기를 찍게 되기 쉽다 — 몫의 뜻부터 차례로 배우는 줄기가 필요했다.
//   (아이 기록의 수치는 공개 코드에 적지 않는다 — Codex 36차 #1, 기록은 비공개 저장소에만)
// 칸 범위는 미래엔 6-1 지도서 86쪽 학습 흐름도((자연수)÷(자연수)의 몫을 분수로 (1)(2) → 분수의 곱셈으로 → (분수)÷(자연수)
//   → (대분수)÷(자연수))와 6-2 지도서 86쪽((분수)÷(분수) (1)(2)(3) — 84쪽: 2·3차시 분모가 같은, 4차시 분모가 다른 →
//   (자연수)÷(단위분수) → (자연수)÷(분수) → 분수의 곱셈으로 → 대분수의 나눗셈 → 분수의 나눗셈 비교하기),
//   2022 성취기준 [6수01-10] (자연수)÷(자연수)의 몫을 분수로 · [6수01-11] 분수의 나눗셈의 계산 원리를 탐구하고 계산
//   (고려사항: (분수)÷(자연수), (자연수)÷(분수), (분수)÷(분수)를 다룬다 · 기약분수를 요구하지 않으면 기약분수가 아닌 답도 허용).
//
// 오답은 아이가 실제로 하는 틀린 생각 흉내다:
//   · 나누는 수를 분자로 씀(3 ÷ 4 = 4/3) · 1을 나눈 몫만 씀 · 나머지를 버림 · 나누지 않고 분자에 곱함 · 분모를 빠뜨림
//   · 대분수의 자연수 부분을 빠뜨림·잘못 바꿈 · 분모를 그대로 둠(6/7 ÷ 2/7 = 3/7) · 거꾸로 나눔 · 통분하지 않고 분자끼리
//   · 나누기를 곱하기로 · 1에 들어가는 개수만 · 단위분수만큼에서 멈춤 · 나누는 분수를 그대로 곱함 · 앞 분수를 바꿈
//   · 자연수 부분은 그대로 둠 · 몇 배를 거꾸로 · "나누면 늘 작아진다"
//
// 새 줄기의 함정(메모 stem-generator-pitfalls)을 처음부터:
//   · 가족 = 틀 여러 개, 틀마다 수를 미리 뽑아 둔다 — 🔁 쌍둥이가 요청한 틀(tplKey)로 온다 · 틀마다 수의 꼴(자연수·분수·대분수)을 고정
//   · ★ 분수 바로 뒤에는 조사를 붙이지 않는다("3/4을"은 "4분의 3을" — 끝자리 소리 검사가 틀린다). 식은 굵게 다음 줄,
//     글은 "— " · "짜리" · "만큼" · "씩"으로 잇는다. 단위 글자(m·L·kg) 바로 뒤에도 조사를 붙이지 않는다
//   · 수가 답인 ①은 숫자판(수·분수·대분수 칸) — 약분 안 한 답도 맞음 + 한 줄 안내(2022 고려사항과 같다).
//     "분수로"·"대분수로"를 물을 때만 꼴까지 · 후보에서 고르는 ①은 "어느 것" 말투
//   · 오답은 기약분수·대분수로 맞춰 쓴다(정답만 다른 꼴이면 힌트) · 오답끼리·정답과 같은 값은 뽑지 않는다(probe.allWrong)
//   · 아직 안 배운 말: "뒤집" — T7 (분수)÷(분수)를 곱셈으로에서 처음
// ★ 정답·오답은 테스트가 **문제 글을 따로 읽어** 분수 셈으로 다시 푼다 (tests/mathfdiv.test.js).

import { rng, castOf, fill, int, shuffle, gcd, ask, solve, humanQuestion, checkHuman, diagnosticOf, placeFromOf, ladderOf, valueOf as fracVal } from './mathgen.js';
import { gradeLabel } from './mathmix.js';
import { _kit } from './mathexpr.js';

export { gradeLabel };

const { famOf, runFamily, misAsk, textChoices, jfix, branchOf, showWork, step, RIGHT_AS_WRONG, OFF } = _kit;

// ───────────────────── 분수 글자 ─────────────────────

const red = (n, d) => { const g = gcd(n, d); return [n / g, d / g]; };
/** 값 → 보기 글: 자연수 · 진분수 · 대분수 (기약) */
export function V(n, d) {
  const [a, b] = red(n, d);
  if (b === 1) return String(a);
  return a < b ? `${a}/${b}` : `${Math.floor(a / b)} ${a % b}/${b}`;
}
/** 약분·대분수로 바꾸는 줄 — "15/8 = 1 7/8" · "6/3 = 2" · "3/8" */
function chain(n, d) {
  const raw = `${n}/${d}`; const v = V(n, d);
  return raw === v ? raw : `${raw} = ${v}`;
}
const coprime = (a, b) => gcd(a, b) === 1;
const keyOf = ([n, d]) => red(n, d).join('/');
/** 값들이 모두 다른가 — [분자, 분모] 쌍으로 */
const distinct = (...pairs) => new Set(pairs.map(keyOf)).size === pairs.length;
/** 조건에 맞을 때까지 다시 뽑기 */
function draw(gen, ok) {
  for (let k = 0; k < 4000; k++) { const v = gen(); if (ok(v)) return v; }
  throw new Error('draw: 조건에 맞는 수를 못 뽑음');
}

// ───────────────────── 보기 ─────────────────────

const sameV = (x, y) => !!(x && y && x.n * y.d === y.n * x.d);
/** 정답 근처의 "계산 실수" — 오개념 오답끼리 겹쳐 모자랄 때만 (분수는 분자 ±1, 자연수는 ±1) */
function nearOf(A, k) {
  const s = [1, -1, 2, -2, 3, -3][k % 6];
  if (!A) return '';
  if (A.d === 1) return A.n + s > 0 ? String(A.n + s) : '';
  return A.n + s > 0 ? V(A.n + s, A.d) : '';
}
/** 수 보기 4개 — 정답 + 오개념 오답. 글자·값이 같은 보기는 넣지 않는다 (값은 대분수까지 읽는다) */
function fchoices(r, answer, wrongs) {
  const list = [{ text: answer, ok: true }]; const vals = [fracVal(answer)];
  const dup = (t) => { const v = fracVal(t); return !v || list.some((x) => x.text === t) || vals.some((x) => sameV(x, v)); };
  const add = (t, tag) => { list.push({ text: t, ok: false, tag }); vals.push(fracVal(t)); };
  for (const w of wrongs) { if (w && w.text && !dup(w.text) && list.length < 4) add(w.text, w.tag); }
  for (let k = 0; list.length < 4 && k < 12; k++) { const alt = nearOf(vals[0], k); if (alt && !dup(alt)) add(alt, '계산 실수'); }
  return shuffle(r, list);
}
/** 고른 틀로 ① 문항 만들기 — v: { t, ans, wr, steps, why, whyAny, rule, text(식·문장 보기), probe } */
function fcalcAsk(r, c, concept, v) {
  const F = (t) => jfix(fill(t, c));
  const chs = v.text ? textChoices(r, v.ans, v.wr) : fchoices(r, v.ans, v.wr);
  const why = Object.fromEntries(Object.entries(v.why || {}).map(([k, t]) => [k, F(t)]));
  return {
    ...ask(concept.id, 'calc', F(v.t), chs, { solve: solve(v.steps.map((s, i) => step(i, F(s))), { why, whyAny: F(v.whyAny || ''), rule: v.rule || concept.rule }) }),
    probe: { ...(v.probe || {}), allWrong: v.wr.map((w) => ({ text: String(w.text), tag: w.tag })) },
  };
}
const askFam = (r, c, concept, fams) => fcalcAsk(r, c, concept, runFamily(r, c, fams));

const CALC = '다음을 계산하면 얼마일까요?';
const calcQ = (e) => `${CALC}\n\n**${e}**`;

/** 이 줄기의 오개념 이름표 (📊·🤔 노트·결과 카드에 그대로 뜬다 — 아직 안 배운 말 "뒤집"을 쓰지 않는다) */
export const TAGS = {
  // T1 (자연수)÷(자연수)의 몫을 분수로
  flipNat: '나누는 수를 분자로 씀',
  unitOnly: '1을 나눈 몫만 씀',
  dropRem: '나머지를 버림',
  remDen: '나머지를 나누어지는 수로 나눔',
  keepK: '나누는 수를 그대로 곱함',
  flipWhich: '나누어지는 수를 분모로 씀',
  // T2 (진분수)÷(자연수)
  mulNum: '나누지 않고 분자에 곱함',
  dropDen: '분모를 빠뜨림',
  sameOnly: '크기가 같은 분수로 바꾸기만 하고 나누지 않음',
  flipFirstToo: '앞 분수의 분모와 분자도 바꿈',
  // T3 (대분수)÷(자연수)
  dropWhole: '자연수 부분을 빠뜨림',
  badImproper: '가분수로 잘못 바꿈',
  wholeOnly: '자연수 부분만 나눔',
  // T4 분모가 같은 (분수)÷(분수)
  keepDen: '분모를 그대로 둠',
  mulInstead: '나누기를 곱하기로 함',
  flipAns: '거꾸로 나눔',
  // T5 분모가 다른 (분수)÷(분수)
  noLCD: '통분하지 않고 분자끼리 나눔',
  // T6 (자연수)÷(분수)
  oneOnly: '1에 들어가는 개수만 셈',
  partOnly: '단위분수만큼의 양에서 멈춤',
  // T7 (분수)÷(분수)를 곱셈으로
  noFlip: '나누는 분수를 그대로 곱함',
  flipFirst: '앞 분수의 분모와 분자를 바꿈',
  flipBoth: '두 분수의 분모와 분자를 모두 바꿈',
  // T8 대분수의 나눗셈
  wholeKeep: '자연수 부분은 그대로 둠',
  // T9 활용
  timesFlip: '몇 배를 거꾸로 셈',
  fracBig: '분수로 나누면 늘 커진다고 봄',
  mulBig: '곱하면 늘 커진다고 봄',
};

// ───────────────────── 개념 사다리 (T. 분수의 나눗셈 줄기) ─────────────────────

export const FDIV = [
  {
    id: 'fdv.natdiv', grade: 6, name: '(자연수)÷(자연수)의 몫을 분수로', needs: [],
    idea: '나눗셈의 몫은 분수로 나타낼 수 있어요 — **나누어지는 수가 분자, 나누는 수가 분모**. 1 ÷ 4 = 1/4 — 3 ÷ 4는 1/4짜리 3개라서 3/4. 7 ÷ 3 = 7/3 = 2 1/3처럼 대분수로도 나타내요. 3 ÷ 4 = 3 × 1/4처럼 곱셈으로도 나타낼 수 있어요.',
    rule: '나누어지는 수는 분자, 나누는 수는 분모 — 3 ÷ 4 = 3/4 = 3 × 1/4.',
    slip: '나누어지는 수를 분자에 썼는지 봐요.',
    calc(r, c) {
      const fams = [];
      fams.push(famOf([(() => {
        const [a, b] = draw(() => [int(r, 2, 8), int(r, 3, 9)], ([x, y]) => x < y && coprime(x, y));
        return {
          t: `나눗셈의 몫을 분수로 나타내면 얼마일까요?\n\n**${a} ÷ ${b}**`, ans: `${a}/${b}`,
          wr: [{ text: `${b}/${a}`, tag: TAGS.flipNat }, { text: `1/${b}`, tag: TAGS.unitOnly }],
          steps: [`1 ÷ ${b} = 1/${b}`, `${a} ÷ ${b} — 1/${b}짜리 ${a}개 → ${a}/${b}`],
          why: { [TAGS.flipNat]: `나누어지는 수 ${a}가 분자, 나누는 수 ${b}가 분모예요.`, [TAGS.unitOnly]: `1 ÷ ${b}만 했어요 — ${a} ÷ ${b}는 1/${b}짜리가 ${a}개예요.` },
          probe: { ask: 'frac' },
        };
      })()]));
      fams.push(famOf([(() => {
        const [a, b] = draw(() => [int(r, 5, 29), int(r, 2, 9)], ([x, y]) => x > y && coprime(x, y) && x < 6 * y);
        const w = Math.floor(a / b); const rm = a % b;
        return {
          t: `나눗셈의 몫을 대분수로 나타내면 얼마일까요?\n\n**${a} ÷ ${b}**`, ans: `${w} ${rm}/${b}`,
          wr: [{ text: String(w), tag: TAGS.dropRem }, { text: V(w * a + rm, a), tag: TAGS.remDen }, { text: `${b}/${a}`, tag: TAGS.flipNat }],
          steps: [`${a} ÷ ${b} = ${w} … ${rm}`, `나머지 ${rm}도 ${b}로 나눠요 — ${a}/${b} = ${w} ${rm}/${b}`],
          why: { [TAGS.dropRem]: `나머지 ${rm}도 ${b}로 나눠 분수 부분이 돼요 — 버리면 안 돼요.`, [TAGS.remDen]: `나머지 ${rm}를 나누는 수 ${b}로 나눠요.`, [TAGS.flipNat]: `나누어지는 수 ${a}가 분자예요.` },
          probe: { ask: 'mixed' },
        };
      })()]));
      fams.push(famOf([(() => {
        const [a, b] = draw(() => [int(r, 2, 9), int(r, 2, 9)], ([x, y]) => x !== y);
        return {
          t: `나눗셈을 곱셈으로 나타내려고 해요. □ 안에 알맞은 수는 얼마일까요?\n\n**${a} ÷ ${b} = ${a} × □**`, ans: `1/${b}`,
          wr: [{ text: String(b), tag: TAGS.keepK }, { text: `1/${a}`, tag: TAGS.flipWhich }],
          steps: [`÷ ${b}는 × 1/${b}`, `${a} ÷ ${b} = ${a} × 1/${b} = ${a}/${b}`],
          why: { [TAGS.keepK]: `${a} × ${b}는 오히려 커져요 — ÷ ${b}는 × 1/${b}.`, [TAGS.flipWhich]: `나누는 수 ${b}가 분모예요 — 1/${b}.` },
          probe: { ask: 'box' },
        };
      })()]));
      fams.push(famOf([
        (() => {
          const [a, b] = draw(() => [int(r, 2, 8), int(r, 3, 9)], ([x, y]) => x < y && coprime(x, y));
          return {
            t: `케이크 ${a}개를 ${b}명이 똑같이 나누어 먹으려고 해요. 한 명이 먹는 케이크는 몇 개일까요?`, ans: `${a}/${b}`,
            wr: [{ text: V(b, a), tag: TAGS.flipNat }, { text: `1/${b}`, tag: TAGS.unitOnly }],
            steps: [`${a} ÷ ${b}`, `1/${b}짜리 ${a}개 → ${a}/${b}`],
            why: { [TAGS.flipNat]: `나누는 케이크 ${a}개가 분자, 사람 ${b}명이 분모예요.`, [TAGS.unitOnly]: `케이크 1개를 나눈 몫이에요 — 케이크가 ${a}개예요.` },
            probe: { ask: 'story' },
          };
        })(),
        (() => {
          const [a, b] = draw(() => [int(r, 2, 8), int(r, 3, 9)], ([x, y]) => x < y && coprime(x, y));
          return {
            t: `{me/이/가} 길이가 ${a} m인 리본을 ${b}명에게 똑같이 나누어 주려고 해요. 한 명에게 주는 리본은 몇 m일까요?`, ans: `${a}/${b}`,
            wr: [{ text: V(b, a), tag: TAGS.flipNat }, { text: `1/${b}`, tag: TAGS.unitOnly }],
            steps: [`${a} ÷ ${b}`, `1/${b}짜리 ${a}개 → ${a}/${b}`],
            why: { [TAGS.flipNat]: `나누는 리본 길이 ${a}가 분자, 사람 수 ${b}가 분모예요.`, [TAGS.unitOnly]: `1 m만 나눈 몫이에요 — 리본은 ${a} m 있어요.` },
            probe: { ask: 'story' },
          };
        })(),
      ]));
      return askFam(r, c, this, fams);
    },
    misread(r, c) {
      if (branchOf(r, c, ['flip', 'rem']) === 'flip') {
        const [a, b] = draw(() => [int(r, 2, 8), int(r, 3, 9)], ([x, y]) => x < y && coprime(x, y));
        return misAsk(r, c, this, 'flip', {
          q: `나눗셈 ${a} ÷ ${b}의 몫을 분수로 나타내요.\n\n${showWork(`${a} ÷ ${b} = ${b}/${a}`)}`,
          ok: `나누어지는 수가 분자예요 — ${a} ÷ ${b} = ${a}/${b}`,
          wr: [{ text: '맞게 말했어요', tag: RIGHT_AS_WRONG }, { text: `1 ÷ ${b}만 해서 1/${b}`, tag: TAGS.unitOnly }, { text: '작은 수를 큰 수로는 나눌 수 없어요', tag: OFF }],
          steps: [`1 ÷ ${b} = 1/${b}`, `${a} ÷ ${b} — 1/${b}짜리 ${a}개 → ${a}/${b}`],
          whyAny: '나누는 수와 나누어지는 수를 바꿔 썼어요. 나누어지는 수가 분자, 나누는 수가 분모예요.',
          probe: { ask: 'flip', a, b },
        });
      }
      const [a, b] = draw(() => [int(r, 5, 29), int(r, 2, 9)], ([x, y]) => x > y && coprime(x, y) && x < 6 * y);
      const w = Math.floor(a / b); const rm = a % b;
      return misAsk(r, c, this, 'rem', {
        q: `나눗셈 ${a} ÷ ${b}의 몫을 대분수로 나타내요.\n\n${showWork(`${a} ÷ ${b} = ${w} ${rm}/${a}`)}`,
        ok: `나머지 ${rm}도 나누는 수 ${b}로 나눠요 — ${w} ${rm}/${b}`,
        wr: [{ text: '맞게 말했어요', tag: RIGHT_AS_WRONG }, { text: `나머지는 버려서 ${w}`, tag: TAGS.dropRem }, { text: '나누어떨어지지 않으면 분수로 나타낼 수 없어요', tag: OFF }],
        steps: [`${a} ÷ ${b} = ${w} … ${rm}`, `나머지 ${rm}를 ${b}로 나누면 ${rm}/${b} → ${w} ${rm}/${b}`],
        whyAny: '나머지를 나누어지는 수로 나눴어요. 나머지도 나누는 수로 나눠요.',
        probe: { ask: 'rem', a, b },
      });
    },
  },

  {
    id: 'fdv.fracnat', grade: 6, name: '(진분수)÷(자연수)', needs: ['fdv.natdiv'],
    idea: '분자가 자연수로 나누어떨어지면 **분자를 나눠요** — 4/5 ÷ 2 = 2/5. 나누어떨어지지 않으면 **크기가 같은 분수로 바꿔** 분자를 나눠요 — 3/5 ÷ 2 = 6/10 ÷ 2 = 3/10. ÷ 2는 곱셈 × 1/2 — 3/5 ÷ 2 = 3/5 × 1/2 = 3/10.',
    rule: '분자를 나눠요 — 나누어떨어지지 않으면 크기가 같은 분수로 바꿔서 (÷ 2 = × 1/2).',
    slip: '나눗셈인데 커지지 않았는지, 분모를 빠뜨리지 않았는지 봐요.',
    calc(r, c) {
      const fams = [];
      fams.push(famOf([(() => {
        const [d, k, m] = draw(() => [int(r, 5, 13), int(r, 2, 4), int(r, 1, 4)], ([d1, k1, m1]) => k1 * m1 < d1 && coprime(k1 * m1, d1) && d1 % k1 !== 0 && distinct([m1, d1], [k1 * k1 * m1, d1], [m1, 1]));
        const n = k * m;
        return {
          t: calcQ(`${n}/${d} ÷ ${k}`), ans: V(m, d),
          wr: [{ text: V(n * k, d), tag: TAGS.mulNum }, { text: String(m), tag: TAGS.dropDen }],
          steps: [`분자를 ${k}로 나눠요 — ${n} ÷ ${k} = ${m}`, `${n}/${d} ÷ ${k} = ${m}/${d}`],
          why: { [TAGS.mulNum]: `${k}로 나누는데 분자에 곱했어요 — 2 이상인 자연수로 나누면 작아져요.`, [TAGS.dropDen]: `분모 ${d}는 그대로 — 몫은 ${m}/${d}` },
          probe: { ask: 'calc' },
        };
      })()]));
      fams.push(famOf([(() => {
        const [d, k, n] = draw(() => [int(r, 3, 11), int(r, 2, 5), int(r, 1, 10)], ([d1, k1, n1]) => n1 < d1 && coprime(n1, d1) && coprime(n1, k1) && d1 % k1 !== 0 && d1 * k1 <= 50 && distinct([n1, d1 * k1], [n1 * k1, d1], [n1, d1]));
        return {
          t: calcQ(`${n}/${d} ÷ ${k}`), ans: V(n, d * k),
          wr: [{ text: V(n * k, d), tag: TAGS.mulNum }, { text: V(n, d), tag: TAGS.sameOnly }],
          steps: [`분자 ${n}는 ${k}로 나누어떨어지지 않아요 — ${n}/${d} = ${n * k}/${d * k}`, `${n * k}/${d * k} ÷ ${k} = ${n}/${d * k}`],
          why: { [TAGS.mulNum]: `${k}로 나누는데 분자에 곱했어요 — 2 이상인 자연수로 나누면 작아져요.`, [TAGS.sameOnly]: `크기가 같은 분수 ${n * k}/${d * k} — 바꾸기만 했어요. 분자 ${n * k}를 ${k}로 나눠야 해요.` },
          probe: { ask: 'calc' },
        };
      })()]));
      fams.push(famOf([(() => {
        const [d, k, n] = draw(() => [int(r, 3, 9), int(r, 2, 6), int(r, 2, 8)], ([d1, k1, n1]) => n1 < d1 && coprime(n1, d1));
        return {
          t: `나눗셈을 곱셈으로 나타낸 것은 어느 것일까요?\n\n**${n}/${d} ÷ ${k}**`, text: true, ans: `${n}/${d} × 1/${k}`,
          wr: [{ text: `${n}/${d} × ${k}`, tag: TAGS.keepK }, { text: `${d}/${n} × 1/${k}`, tag: TAGS.flipFirstToo }],
          steps: [`÷ ${k}는 × 1/${k}`, `${n}/${d} ÷ ${k} = ${n}/${d} × 1/${k}`],
          why: { [TAGS.keepK]: `× ${k}는 오히려 커져요 — ÷ ${k}는 × 1/${k}.`, [TAGS.flipFirstToo]: `앞 분수는 그대로 두어요 — 바뀌는 것은 ÷ ${k}뿐이에요.` },
          probe: { ask: 'asMul' },
        };
      })()]));
      fams.push(famOf([
        (() => {
          const [d, k, n] = draw(() => [int(r, 3, 9), int(r, 2, 5), int(r, 1, 8)], ([d1, k1, n1]) => n1 < d1 && coprime(n1, d1) && coprime(n1, k1) && d1 % k1 !== 0 && distinct([n1, d1 * k1], [n1 * k1, d1], [n1, d1]));
          return {
            t: `주스가 ${n}/${d} L 있어요. 이 주스를 컵 ${k}개에 똑같이 나누어 담으면 한 컵에 몇 L씩 담게 될까요?`, ans: V(n, d * k),
            wr: [{ text: V(n * k, d), tag: TAGS.mulNum }, { text: V(n, d), tag: TAGS.sameOnly }],
            steps: [`${n}/${d} ÷ ${k} = ${n * k}/${d * k} ÷ ${k}`, `= ${n}/${d * k}`],
            why: { [TAGS.mulNum]: `컵 ${k}개에 나누면 한 컵은 적어져요 — 곱하지 않고 나눠요.`, [TAGS.sameOnly]: `크기가 같은 분수로 바꾼 다음 분자를 ${k}로 나눠야 해요.` },
            probe: { ask: 'story' },
          };
        })(),
        (() => {
          const [d, k, n] = draw(() => [int(r, 3, 9), int(r, 2, 5), int(r, 1, 8)], ([d1, k1, n1]) => n1 < d1 && coprime(n1, d1) && coprime(n1, k1) && d1 % k1 !== 0 && distinct([n1, d1 * k1], [n1 * k1, d1], [n1, d1]));
          return {
            t: `길이가 ${n}/${d} m인 끈을 ${k}도막으로 똑같이 자르면 한 도막은 몇 m일까요?`, ans: V(n, d * k),
            wr: [{ text: V(n * k, d), tag: TAGS.mulNum }, { text: V(n, d), tag: TAGS.sameOnly }],
            steps: [`${n}/${d} ÷ ${k} = ${n * k}/${d * k} ÷ ${k}`, `= ${n}/${d * k}`],
            why: { [TAGS.mulNum]: `${k}도막으로 자르면 한 도막은 짧아져요 — 곱하지 않고 나눠요.`, [TAGS.sameOnly]: `크기가 같은 분수로 바꾼 다음 분자를 ${k}로 나눠야 해요.` },
            probe: { ask: 'story' },
          };
        })(),
      ]));
      return askFam(r, c, this, fams);
    },
    misread(r, c) {
      if (branchOf(r, c, ['mul', 'same']) === 'mul') {
        const [d, k, m] = draw(() => [int(r, 5, 13), int(r, 2, 4), int(r, 1, 4)], ([d1, k1, m1]) => k1 * m1 < d1 && coprime(k1 * m1, d1) && d1 % k1 !== 0);
        const n = k * m;
        return misAsk(r, c, this, 'mul', {
          q: `나눗셈을 계산해요.\n\n${showWork(`${n}/${d} ÷ ${k} = ${n * k}/${d}`)}`,
          ok: `나눗셈이라 분자를 ${k}로 나눠요 — ${m}/${d}`,
          wr: [{ text: '맞게 말했어요', tag: RIGHT_AS_WRONG }, { text: `분자를 나눈 ${m}가 몫이에요`, tag: TAGS.dropDen }, { text: '분수는 자연수로 나눌 수 없어요', tag: OFF }],
          steps: [`${n} ÷ ${k} = ${m}`, `${n}/${d} ÷ ${k} = ${m}/${d}`],
          whyAny: '나누는데 분자에 곱했어요. 자연수로 나누면 몫은 작아져요.',
          probe: { ask: 'mul', n, d, k },
        });
      }
      const [d, k, n] = draw(() => [int(r, 3, 7), int(r, 2, 3), int(r, 1, 6)], ([d1, k1, n1]) => n1 < d1 && coprime(n1, d1) && coprime(n1, k1) && d1 % k1 !== 0);
      return misAsk(r, c, this, 'same', {
        q: `그림을 보고 나눗셈을 계산해요.\n\n[fbar share ${n}/${d} ${k}]\n\n${showWork(`${n}/${d} ÷ ${k} = ${n * k}/${d * k}`)}`,
        ok: `바꾼 다음 분자를 ${k}로 나눠야 해요 — ${n * k}/${d * k} ÷ ${k} = ${n}/${d * k}`,
        wr: [{ text: '맞게 말했어요', tag: RIGHT_AS_WRONG }, { text: `분자에 ${k}를 곱해서 ${V(n * k, d)}`, tag: TAGS.mulNum }, { text: '분자가 나누어떨어지지 않으면 계산할 수 없어요', tag: OFF }],
        steps: [`${n}/${d} = ${n * k}/${d * k} — 크기가 같은 분수`, `${n * k}/${d * k} ÷ ${k} = ${n}/${d * k} (그림에서 진한 칸 ${n}개)`],
        whyAny: '크기가 같은 분수로 바꾸기만 하고 나누지 않았어요. 그다음 분자를 나눠야 해요.',
        probe: { ask: 'same', n, d, k },
      });
    },
  },

  {
    id: 'fdv.mixnat', grade: 6, name: '(대분수)÷(자연수)', needs: ['fdv.fracnat'],
    idea: '대분수는 **가분수로 바꾼 다음** 나눠요. 2 2/5 ÷ 3 = 12/5 ÷ 3 = 4/5. 분자가 나누어떨어지지 않으면 진분수처럼 크기가 같은 분수로 — 2 1/3 ÷ 2 = 7/3 ÷ 2 = 14/6 ÷ 2 = 7/6 = 1 1/6.',
    rule: '대분수 → 가분수(자연수 × 분모 + 분자) → 분자를 나눠요.',
    slip: '가분수로 바꿀 때 자연수 × 분모 + 분자를 했는지 봐요.',
    calc(r, c) {
      const fams = [];
      const pickDiv = () => draw(() => [int(r, 1, 3), int(r, 2, 7), int(r, 1, 6), int(r, 2, 5)], ([w1, d1, n1, k1]) => n1 < d1 && coprime(n1, d1) && (w1 * d1 + n1) % k1 === 0
        && distinct([w1 * d1 + n1, d1 * k1], [n1, d1 * k1], [w1 + n1, d1 * k1], [(w1 * d1 + n1) * k1, d1]));
      const pickNon = () => draw(() => [int(r, 1, 3), int(r, 2, 7), int(r, 1, 6), int(r, 2, 4)], ([w1, d1, n1, k1]) => n1 < d1 && coprime(n1, d1) && coprime(w1 * d1 + n1, k1) && d1 * k1 <= 28
        && distinct([w1 * d1 + n1, d1 * k1], [n1, d1 * k1], [w1 + n1, d1 * k1], [(w1 * d1 + n1) * k1, d1]));
      const wrongs = (w, d, n, k, W) => [{ text: V(n, d * k), tag: TAGS.dropWhole }, { text: V(w + n, d * k), tag: TAGS.badImproper }, { text: V(W * k, d), tag: TAGS.mulNum }];
      const whys = (w, d, n, k, W) => ({ [TAGS.dropWhole]: `자연수 ${w}도 함께 나눠야 해요 — 먼저 가분수 ${W}/${d}.`, [TAGS.badImproper]: `${w} ${n}/${d} = (${w} × ${d} + ${n})/${d} = ${W}/${d} — 자연수에 분모를 곱해요.`, [TAGS.mulNum]: `${k}로 나누는데 곱했어요.` });
      fams.push(famOf([(() => {
        const [w, d, n, k] = pickDiv(); const W = w * d + n;
        return { t: calcQ(`${w} ${n}/${d} ÷ ${k}`), ans: V(W, d * k), wr: wrongs(w, d, n, k, W), steps: [`대분수를 가분수로 — ${w} ${n}/${d} = ${W}/${d}`, `${W}/${d} ÷ ${k} = ${chain(W / k, d)}`], why: whys(w, d, n, k, W), probe: { ask: 'calc' } };
      })()]));
      fams.push(famOf([(() => {
        const [w, d, n, k] = pickNon(); const W = w * d + n;
        return { t: calcQ(`${w} ${n}/${d} ÷ ${k}`), ans: V(W, d * k), wr: wrongs(w, d, n, k, W), steps: [`대분수를 가분수로 — ${w} ${n}/${d} = ${W}/${d}`, `${W}/${d} ÷ ${k} = ${W * k}/${d * k} ÷ ${k} = ${chain(W, d * k)}`], why: whys(w, d, n, k, W), probe: { ask: 'calc' } };
      })()]));
      fams.push(famOf([(() => {
        const [w, d, n, k] = pickDiv(); const W = w * d + n;
        return { t: `밀가루가 ${w} ${n}/${d} kg 있어요. 봉지 ${k}개에 똑같이 나누어 담으면 한 봉지에 몇 kg씩 담게 될까요?`, ans: V(W, d * k), wr: wrongs(w, d, n, k, W), steps: [`${w} ${n}/${d} ÷ ${k} — 가분수로 ${W}/${d}`, `${W}/${d} ÷ ${k} = ${chain(W / k, d)}`], why: whys(w, d, n, k, W), probe: { ask: 'story' } };
      })()]));
      return askFam(r, c, this, fams);
    },
    misread(r, c) {
      if (branchOf(r, c, ['whole', 'improper']) === 'whole') {
        const [w, d, n, k] = draw(() => [int(r, 2, 6), int(r, 3, 7), int(r, 1, 6), int(r, 2, 3)], ([w1, d1, n1, k1]) => n1 < d1 && coprime(n1, d1) && w1 % k1 === 0);
        const W = w * d + n;
        return misAsk(r, c, this, 'whole', {
          q: `나눗셈을 계산해요.\n\n${showWork(`${w} ${n}/${d} ÷ ${k} = ${w / k} ${n}/${d}`)}`,
          ok: `분수 부분도 나눠야 해요 — ${W}/${d} ÷ ${k} = ${V(W, d * k)}`,
          wr: [{ text: '맞게 말했어요', tag: RIGHT_AS_WRONG }, { text: `가분수로 바꾸고 ${k}를 곱해서 ${V(W * k, d)}`, tag: TAGS.mulNum }, { text: '대분수는 자연수로 나눌 수 없어요', tag: OFF }],
          steps: [`${w} ${n}/${d} = ${W}/${d}`, `${W}/${d} ÷ ${k} = ${chain(W, d * k)}`],
          whyAny: '자연수 부분만 나눴어요. 대분수를 가분수로 바꾸면 전부 나눌 수 있어요.',
          probe: { ask: 'whole', w, n, d, k },
        });
      }
      const [w, d, n, k] = draw(() => [int(r, 1, 3), int(r, 3, 7), int(r, 1, 6), int(r, 2, 4)], ([w1, d1, n1, k1]) => n1 < d1 && coprime(n1, d1) && (w1 * d1 + n1) % k1 === 0 && distinct([w1 * d1 + n1, d1 * k1], [w1 + n1, d1 * k1], [n1, d1 * k1]));
      const W = w * d + n;
      return misAsk(r, c, this, 'improper', {
        q: `나눗셈을 계산해요.\n\n${showWork(`${w} ${n}/${d} ÷ ${k} = ${w + n}/${d} ÷ ${k} = ${V(w + n, d * k)}`)}`,
        ok: `${w} ${n}/${d} = ${W}/${d} — ${W}/${d} ÷ ${k} = ${V(W, d * k)}`,
        wr: [{ text: '맞게 말했어요', tag: RIGHT_AS_WRONG }, { text: `자연수 ${w}는 빼고 ${n}/${d} ÷ ${k} = ${V(n, d * k)}`, tag: TAGS.dropWhole }, { text: '대분수는 가분수로 바꿀 수 없어요', tag: OFF }],
        steps: [`${w} ${n}/${d} = (${w} × ${d} + ${n})/${d} = ${W}/${d}`, `${W}/${d} ÷ ${k} = ${chain(W / k, d)}`],
        whyAny: '가분수로 바꿀 때 자연수와 분자를 더하기만 했어요. 자연수 × 분모 + 분자예요.',
        probe: { ask: 'improper', w, n, d, k },
      });
    },
  },

  {
    id: 'fdv.same', grade: 6, name: '분모가 같은 (분수)÷(분수)', needs: ['fdv.mixnat'],
    idea: '분모가 같으면 **분자끼리 나눠요** — 6/7 ÷ 2/7 = 6 ÷ 2 = 3. 1/7짜리 6칸을 2칸씩 묶으면 3묶음이에요. 나누어떨어지지 않으면 5/7 ÷ 2/7 = 5 ÷ 2 = 5/2 = 2 1/2 — 2묶음과 반 묶음.',
    rule: '분모가 같으면 분자끼리 나눠요 — 몇 번 덜어 낼 수 있나.',
    slip: '분모를 그대로 두지 않았는지, 앞 분자를 뒤 분자로 나눴는지 봐요.',
    calc(r, c) {
      const fams = [];
      const divNums = () => draw(() => [int(r, 5, 13), int(r, 2, 4), int(r, 2, 6)], ([d1, b1, q1]) => b1 * q1 < d1 && coprime(b1 * q1, d1) && coprime(b1, d1) && distinct([q1, 1], [q1, d1], [b1 * b1 * q1, d1 * d1], [1, q1]));
      const divWr = (a, b, d, q) => [{ text: V(q, d), tag: TAGS.keepDen }, { text: V(a * b, d * d), tag: TAGS.mulInstead }, { text: V(1, q), tag: TAGS.flipAns }];
      const divWhy = (a, b, d) => ({ [TAGS.keepDen]: `분자끼리 나눈 수가 몫이에요 — ${b}칸씩 몇 묶음인지 세요.`, [TAGS.mulInstead]: '나눗셈이에요 — 곱하지 않아요.', [TAGS.flipAns]: `${a}칸에서 ${b}칸씩 덜어 내요 — ${a} ÷ ${b}.` });
      fams.push(famOf([(() => {
        const [d, b, q] = divNums(); const a = b * q;
        return { t: calcQ(`${a}/${d} ÷ ${b}/${d}`), ans: String(q), wr: divWr(a, b, d, q), steps: ['분모가 같으면 분자끼리 나눠요', `${a}/${d} ÷ ${b}/${d} = ${a} ÷ ${b} = ${q}`], why: divWhy(a, b, d), probe: { ask: 'calc' } };
      })()]));
      fams.push(famOf([(() => {
        const [d, a, b] = draw(() => [int(r, 5, 13), int(r, 1, 12), int(r, 2, 9)], ([d1, a1, b1]) => a1 < d1 && b1 < d1 && a1 !== b1 && a1 % b1 !== 0 && coprime(a1, d1) && coprime(b1, d1) && distinct([a1, b1], [a1, b1 * d1], [a1 * b1, d1 * d1], [b1, a1]));
        return {
          t: calcQ(`${a}/${d} ÷ ${b}/${d}`), ans: V(a, b),
          wr: [{ text: V(a, b * d), tag: TAGS.keepDen }, { text: V(a * b, d * d), tag: TAGS.mulInstead }, { text: V(b, a), tag: TAGS.flipAns }],
          steps: ['분모가 같으면 분자끼리 나눠요', `${a} ÷ ${b} = ${chain(a, b)}`],
          why: { [TAGS.keepDen]: `분자끼리 나눈 ${a} ÷ ${b}가 몫이에요 — 분모 ${d}는 붙이지 않아요.`, [TAGS.mulInstead]: '나눗셈이에요 — 곱하지 않아요.', [TAGS.flipAns]: `앞의 분자 ${a}를 뒤의 분자 ${b}로 나눠요.` },
          probe: { ask: 'calc' },
        };
      })()]));
      fams.push(famOf([(() => {
        const [d, b, q] = divNums(); const a = b * q;
        return { t: `물이 ${a}/${d} L 있어요. 한 컵에 ${b}/${d} L씩 담으면 몇 컵이 될까요?`, ans: String(q), wr: divWr(a, b, d, q), steps: [`${a}/${d} ÷ ${b}/${d}`, `= ${a} ÷ ${b} = ${q}`], why: divWhy(a, b, d), probe: { ask: 'story' } };
      })()]));
      return askFam(r, c, this, fams);
    },
    misread(r, c) {
      // 묶음이 보이게 2칸 이상씩 (1칸씩이면 그림이 칸 세기와 같다)
      const [d, b, q] = draw(() => [int(r, 5, 11), int(r, 2, 3), int(r, 2, 5)], ([d1, b1, q1]) => b1 * q1 < d1 && coprime(b1 * q1, d1) && coprime(b1, d1) && q1 * q1 !== d1);
      const a = b * q;
      if (branchOf(r, c, ['den', 'flip']) === 'den') {
        return misAsk(r, c, this, 'den', {
          q: `그림을 보고 몫을 구해요.\n\n[fbar take ${a}/${d} ${b}/${d}]\n\n${showWork(`${a}/${d} ÷ ${b}/${d} = ${q}/${d}`)}`,
          ok: `${b}칸씩 ${q}묶음 — 분자끼리 나눈 ${q}가 몫이에요`,
          wr: [{ text: '맞게 말했어요', tag: RIGHT_AS_WRONG }, { text: `작은 쪽을 큰 쪽으로 나눠서 1/${q}`, tag: TAGS.flipAns }, { text: '분모가 같으면 나눌 수 없어요', tag: OFF }],
          steps: [`${a}칸을 ${b}칸씩 묶으면 ${q}묶음`, `${a}/${d} ÷ ${b}/${d} = ${a} ÷ ${b} = ${q}`],
          whyAny: '분모를 그대로 두었어요. 분모가 같으면 분자끼리 나눈 수가 바로 몫이에요.',
          probe: { ask: 'den', a, b, d },
        });
      }
      return misAsk(r, c, this, 'flip', {
        q: `나눗셈을 계산해요.\n\n${showWork(`${a}/${d} ÷ ${b}/${d} = ${b} ÷ ${a} = 1/${q}`)}`,
        ok: `앞의 분자를 뒤의 분자로 나눠요 — ${a} ÷ ${b} = ${q}`,
        wr: [{ text: '맞게 말했어요', tag: RIGHT_AS_WRONG }, { text: `분모는 그대로 두어서 ${q}/${d}`, tag: TAGS.keepDen }, { text: '큰 분수를 작은 분수로는 나눌 수 없어요', tag: OFF }],
        steps: ['분모가 같으면 분자끼리 나눠요', `${a} ÷ ${b} = ${q}`],
        whyAny: '거꾸로 나눴어요. 나누어지는 수의 분자를 나누는 수의 분자로 나눠요.',
        probe: { ask: 'flip', a, b, d },
      });
    },
  },

  {
    id: 'fdv.diff', grade: 6, name: '분모가 다른 (분수)÷(분수)', needs: ['fdv.same'],
    idea: '분모가 다르면 **통분한 다음 분자끼리 나눠요**. 3/4 ÷ 1/8 = 6/8 ÷ 1/8 = 6 ÷ 1 = 6. 2/3 ÷ 3/4 = 8/12 ÷ 9/12 = 8 ÷ 9 = 8/9.',
    rule: '분모가 다르면 통분부터 — 그다음 분자끼리 나눠요.',
    slip: '통분했는지, 앞 분자를 뒤 분자로 나눴는지 봐요.',
    calc(r, c) {
      const fams = [];
      const intNums = () => draw(() => [int(r, 2, 6), int(r, 2, 4), int(r, 1, 5), int(r, 1, 11)], ([d1, m1, a1, b1]) => a1 < d1 && coprime(a1, d1) && b1 < d1 * m1 && coprime(b1, d1 * m1)
        && (a1 * m1) % b1 === 0 && a1 * m1 / b1 >= 2 && distinct([a1 * m1, b1], [a1, b1], [a1 * b1, d1 * d1 * m1], [b1, a1 * m1]));
      const intWr = (a, b, d1, d2, A) => [{ text: V(a, b), tag: TAGS.noLCD }, { text: V(a * b, d1 * d2), tag: TAGS.mulInstead }, { text: V(b, A), tag: TAGS.flipAns }];
      const intWhy = (a, b, d1, d2, A) => ({ [TAGS.noLCD]: `분모가 ${d1}와 ${d2}로 달라요 — 먼저 통분해서 ${A}/${d2}.`, [TAGS.mulInstead]: '나눗셈이에요 — 곱하지 않아요.', [TAGS.flipAns]: `앞의 분자 ${A}를 뒤의 분자 ${b}로 나눠요.` });
      fams.push(famOf([(() => {
        const [d1, m, a, b] = intNums(); const d2 = d1 * m; const A = a * m;
        return { t: calcQ(`${a}/${d1} ÷ ${b}/${d2}`), ans: String(A / b), wr: intWr(a, b, d1, d2, A), steps: [`통분하면 ${a}/${d1} = ${A}/${d2}`, `${A}/${d2} ÷ ${b}/${d2} = ${A} ÷ ${b} = ${A / b}`], why: intWhy(a, b, d1, d2, A), probe: { ask: 'calc' } };
      })()]));
      fams.push(famOf([(() => {
        const [d1, d2, a, b] = draw(() => [int(r, 2, 7), int(r, 2, 7), int(r, 1, 6), int(r, 1, 6)], ([x, y, a1, b1]) => x !== y && coprime(x, y) && a1 < x && b1 < y && coprime(a1, x) && coprime(b1, y)
          && distinct([a1 * y, b1 * x], [a1, b1], [a1 * b1, x * y], [b1 * x, a1 * y]));
        const L = d1 * d2; const A = a * d2; const B = b * d1;
        return {
          t: calcQ(`${a}/${d1} ÷ ${b}/${d2}`), ans: V(A, B),
          wr: [{ text: V(a, b), tag: TAGS.noLCD }, { text: V(a * b, L), tag: TAGS.mulInstead }, { text: V(B, A), tag: TAGS.flipAns }],
          steps: [`통분하면 ${a}/${d1} = ${A}/${L}, ${b}/${d2} = ${B}/${L}`, `${A} ÷ ${B} = ${chain(A, B)}`],
          why: { [TAGS.noLCD]: `분모가 ${d1}와 ${d2}로 달라요 — 먼저 통분해요.`, [TAGS.mulInstead]: '나눗셈이에요 — 곱하지 않아요.', [TAGS.flipAns]: `통분한 다음 앞의 분자 ${A}를 뒤의 분자 ${B}로 나눠요.` },
          probe: { ask: 'calc' },
        };
      })()]));
      fams.push(famOf([(() => {
        const [d1, m, a, b] = intNums(); const d2 = d1 * m; const A = a * m;
        return { t: `끈이 ${a}/${d1} m 있어요. 한 도막을 ${b}/${d2} m씩 자르면 몇 도막이 될까요?`, ans: String(A / b), wr: intWr(a, b, d1, d2, A), steps: [`${a}/${d1} ÷ ${b}/${d2} — 통분하면 ${A}/${d2} ÷ ${b}/${d2}`, `= ${A} ÷ ${b} = ${A / b}`], why: intWhy(a, b, d1, d2, A), probe: { ask: 'story' } };
      })()]));
      return askFam(r, c, this, fams);
    },
    misread(r, c) {
      const [d1, d2, a, b] = draw(() => [int(r, 2, 7), int(r, 2, 7), int(r, 1, 6), int(r, 1, 6)], ([x, y, a1, b1]) => x !== y && coprime(x, y) && a1 < x && b1 < y && coprime(a1, x) && coprime(b1, y)
        && distinct([a1 * y, b1 * x], [a1, b1], [a1 * b1, x * y], [b1 * x, a1 * y]));
      const L = d1 * d2; const A = a * d2; const B = b * d1;
      if (branchOf(r, c, ['lcd', 'flip']) === 'lcd') {
        return misAsk(r, c, this, 'lcd', {
          q: `나눗셈을 계산해요.\n\n${showWork(`${a}/${d1} ÷ ${b}/${d2} = ${a} ÷ ${b} = ${V(a, b)}`)}`,
          ok: `분모가 다르면 먼저 통분해요 — ${A}/${L} ÷ ${B}/${L} = ${V(A, B)}`,
          wr: [{ text: '맞게 말했어요', tag: RIGHT_AS_WRONG }, { text: `나누지 말고 곱해서 ${V(a * b, L)}`, tag: TAGS.mulInstead }, { text: '분모가 다르면 나눌 수 없어요', tag: OFF }],
          steps: [`통분하면 ${A}/${L} ÷ ${B}/${L}`, `${A} ÷ ${B} = ${chain(A, B)}`],
          whyAny: '분모가 다른데 분자끼리 나눴어요. 분자끼리 나누는 것은 분모가 같을 때예요.',
          probe: { ask: 'lcd', a, b, d1, d2 },
        });
      }
      return misAsk(r, c, this, 'flip', {
        q: `나눗셈을 계산해요.\n\n${showWork(`${a}/${d1} ÷ ${b}/${d2} = ${A}/${L} ÷ ${B}/${L} = ${B} ÷ ${A} = ${V(B, A)}`)}`,
        ok: `앞의 분자를 뒤의 분자로 나눠요 — ${A} ÷ ${B} = ${V(A, B)}`,
        wr: [{ text: '맞게 말했어요', tag: RIGHT_AS_WRONG }, { text: `통분하지 않고 분자끼리 나눠서 ${V(a, b)}`, tag: TAGS.noLCD }, { text: '통분하면 나눌 수 없어요', tag: OFF }],
        steps: [`통분하면 ${A}/${L} ÷ ${B}/${L}`, `${A} ÷ ${B} = ${chain(A, B)}`],
        whyAny: '통분은 맞게 했는데 거꾸로 나눴어요. 나누어지는 수의 분자를 나누는 수의 분자로 나눠요.',
        probe: { ask: 'flip', a, b, d1, d2 },
      });
    },
  },

  {
    id: 'fdv.natfrac', grade: 6, name: '(자연수)÷(분수)', needs: ['fdv.diff'],
    idea: '3 ÷ 1/4 — 1 안에 1/4짜리가 4개, 3 안에는 3 × 4 = 12개. 6 ÷ 2/3 — 2/3만큼이 6이면 1/3만큼은 6 ÷ 2 = 3, 1만큼은 3 × 3 = 9. 그래서 6 ÷ 2/3 = (6 ÷ 2) × 3 = 9.',
    rule: '자연수 ÷ 분수 = (자연수 ÷ 분자) × 분모 — 1만큼이 얼마인지 구해요.',
    slip: '분자로 나눈 다음 분모를 곱했는지 봐요.',
    calc(r, c) {
      const fams = [];
      const unitNums = () => draw(() => [int(r, 2, 9), int(r, 2, 9)], ([k1, m1]) => distinct([k1 * m1, 1], [k1, m1], [m1, 1], [1, k1 * m1]));
      const unitWr = (k, m) => [{ text: V(k, m), tag: TAGS.mulInstead }, { text: String(m), tag: TAGS.oneOnly }, { text: V(1, k * m), tag: TAGS.flipAns }];
      const unitWhy = (k, m) => ({ [TAGS.mulInstead]: `÷ 1/${m} — 곱하지 않아요. 1/${m}짜리가 몇 개 들어가는지 세요.`, [TAGS.oneOnly]: `1 안에 ${m}개 — ${k} 안에는 그 ${k}배예요.`, [TAGS.flipAns]: `${k} 안에 1/${m}짜리가 몇 개인지 — 거꾸로 나눴어요.` });
      fams.push(famOf([(() => {
        const [k, m] = unitNums();
        return { t: calcQ(`${k} ÷ 1/${m}`), ans: String(k * m), wr: unitWr(k, m), steps: [`1 안에 1/${m}짜리가 ${m}개`, `${k} ÷ 1/${m} = ${k} × ${m} = ${k * m}`], why: unitWhy(k, m), probe: { ask: 'calc' } };
      })()]));
      const genNums = () => draw(() => [int(r, 2, 6), int(r, 3, 9), int(r, 2, 6)], ([n1, m1, t1]) => n1 < m1 && coprime(n1, m1) && distinct([t1 * m1, 1], [n1 * n1 * t1, m1], [t1, 1], [n1, n1 * t1 * m1]));
      const genWr = (k, n, m, t) => [{ text: V(k * n, m), tag: TAGS.mulInstead }, { text: String(t), tag: TAGS.partOnly }, { text: V(n, k * m), tag: TAGS.flipAns }];
      const genWhy = (k, n, m, t) => ({ [TAGS.mulInstead]: `나눗셈이에요 — 1보다 작은 분수로 나누면 몫은 ${k}보다 커요.`, [TAGS.partOnly]: `${t}는 1/${m}만큼이에요 — 1만큼은 ${t} × ${m}.`, [TAGS.flipAns]: '거꾸로 나눴어요 — 자연수를 분수로 나눠요.' });
      fams.push(famOf([(() => {
        const [n, m, t] = genNums(); const k = n * t;
        return { t: calcQ(`${k} ÷ ${n}/${m}`), ans: String(t * m), wr: genWr(k, n, m, t), steps: [`${k} ÷ ${n} = ${t} — 1/${m}만큼`, `${t} × ${m} = ${t * m} — 1만큼`], why: genWhy(k, n, m, t), probe: { ask: 'calc' } };
      })()]));
      fams.push(famOf([
        (() => {
          const [n, m, t] = genNums(); const k = n * t;
          return { t: `물통의 ${n}/${m}만큼 채우는 데 물이 ${k} L 들었어요. 빈 물통을 가득 채우려면 물이 모두 몇 L 들까요?`, ans: String(t * m), wr: genWr(k, n, m, t), steps: [`${k} ÷ ${n}/${m} — ${n}/${m}만큼이 ${k} L`, `1/${m}만큼은 ${k} ÷ ${n} = ${t}, 1만큼은 ${t} × ${m} = ${t * m}`], why: genWhy(k, n, m, t), probe: { ask: 'story' } };
        })(),
        (() => {
          const [k, m] = unitNums();
          return { t: `길이가 ${k} m인 끈을 1/${m} m씩 자르면 모두 몇 도막이 될까요?`, ans: String(k * m), wr: unitWr(k, m), steps: [`${k} ÷ 1/${m} — 1 m에서 ${m}도막`, `${k} × ${m} = ${k * m}`], why: unitWhy(k, m), probe: { ask: 'story' } };
        })(),
      ]));
      return askFam(r, c, this, fams);
    },
    misread(r, c) {
      const [n, m, t] = draw(() => [int(r, 2, 4), int(r, 3, 7), int(r, 2, 5)], ([n1, m1, t1]) => n1 < m1 && coprime(n1, m1) && distinct([t1 * m1, 1], [n1 * n1 * t1, m1], [t1, 1]));
      const k = n * t;
      if (branchOf(r, c, ['mul', 'part']) === 'mul') {
        return misAsk(r, c, this, 'mul', {
          q: `나눗셈을 계산해요.\n\n${showWork(`${k} ÷ ${n}/${m} = ${k} × ${n}/${m} = ${V(k * n, m)}`)}`,
          ok: `${n}/${m}만큼이 ${k} — 1만큼은 (${k} ÷ ${n}) × ${m} = ${t * m}`,
          wr: [{ text: '맞게 말했어요', tag: RIGHT_AS_WRONG }, { text: `몫은 ${k} ÷ ${n} = ${t}`, tag: TAGS.partOnly }, { text: '자연수는 분수로 나눌 수 없어요', tag: OFF }],
          steps: [`${k} ÷ ${n} = ${t} — 1/${m}만큼`, `${t} × ${m} = ${t * m} — 1만큼`],
          whyAny: '나누기를 곱하기로 했어요. 1보다 작은 분수로 나누면 몫이 나누어지는 수보다 커져요.',
          probe: { ask: 'mul', k, n, m },
        });
      }
      return misAsk(r, c, this, 'part', {
        q: `그림을 보고 나눗셈을 계산해요.\n\n[fbar unit ${n}/${m} ${k}]\n\n${showWork(`${k} ÷ ${n}/${m} = ${k} ÷ ${n} = ${t}`)}`,
        ok: `${t}는 1/${m}만큼 — 1만큼은 ${t} × ${m} = ${t * m}`,
        wr: [{ text: '맞게 말했어요', tag: RIGHT_AS_WRONG }, { text: `곱해서 ${k} × ${n}/${m} = ${V(k * n, m)}`, tag: TAGS.mulInstead }, { text: '그림으로는 나눗셈을 할 수 없어요', tag: OFF }],
        steps: [`${n}칸이 ${k} — 1칸은 ${k} ÷ ${n} = ${t}`, `${m}칸(1만큼)은 ${t} × ${m} = ${t * m}`],
        whyAny: `1/${m}만큼의 양에서 멈췄어요. 막대 전체(1만큼)까지 구해야 해요.`,
        probe: { ask: 'part', k, n, m },
      });
    },
  },

  {
    id: 'fdv.flip', grade: 6, name: '(분수)÷(분수)를 곱셈으로', needs: ['fdv.natfrac'],
    idea: '÷ (분수)는 그 분수의 **분모와 분자를 바꾼 수를 곱하는 것**과 같아요 — "뒤집어 곱해요". 3/4 ÷ 2/5 = 3/4 × 5/2 = 15/8. 까닭: 통분해서 나눠도 15/20 ÷ 8/20 = 15 ÷ 8 = 15/8 — 같아요. 앞 분수는 그대로 두어요.',
    rule: '나누는 분수만 뒤집어 곱해요 — 앞 분수는 그대로.',
    slip: '나누는 분수를 뒤집었는지, 앞 분수는 그대로 두었는지 봐요.',
    calc(r, c) {
      const fams = [];
      const props = () => draw(() => [int(r, 2, 7), int(r, 3, 9), int(r, 2, 7), int(r, 3, 9)], ([a1, b1, c1, d1]) => a1 < b1 && c1 < d1 && coprime(a1, b1) && coprime(c1, d1) && a1 * d1 !== b1 * c1
        && distinct([a1 * d1, b1 * c1], [a1 * c1, b1 * d1], [b1 * c1, a1 * d1], [b1 * d1, a1 * c1]));
      const wr = (a, b, cc, d) => [{ text: V(a * cc, b * d), tag: TAGS.noFlip }, { text: V(b * cc, a * d), tag: TAGS.flipFirst }, { text: V(b * d, a * cc), tag: TAGS.flipBoth }];
      const why = (a, b, cc, d) => ({ [TAGS.noFlip]: `÷ ${cc}/${d} → × ${d}/${cc} — 나누는 분수를 뒤집어요.`, [TAGS.flipFirst]: `앞 분수 ${a}/${b} — 그대로 두어요. 뒤집는 것은 나누는 분수예요.`, [TAGS.flipBoth]: '앞 분수는 그대로 두어요 — 나누는 분수만 뒤집어요.' });
      fams.push(famOf([(() => {
        const [a, b, cc, d] = props();
        return {
          t: `나눗셈을 곱셈으로 나타낸 것은 어느 것일까요?\n\n**${a}/${b} ÷ ${cc}/${d}**`, text: true, ans: `${a}/${b} × ${d}/${cc}`,
          wr: [{ text: `${a}/${b} × ${cc}/${d}`, tag: TAGS.noFlip }, { text: `${b}/${a} × ${cc}/${d}`, tag: TAGS.flipFirst }, { text: `${b}/${a} × ${d}/${cc}`, tag: TAGS.flipBoth }],
          steps: [`÷ ${cc}/${d} → × ${d}/${cc}`, `${a}/${b} ÷ ${cc}/${d} = ${a}/${b} × ${d}/${cc}`], why: why(a, b, cc, d), probe: { ask: 'asMul' },
        };
      })()]));
      fams.push(famOf([(() => {
        const [a, b, cc, d] = props();
        return { t: calcQ(`${a}/${b} ÷ ${cc}/${d}`), ans: V(a * d, b * cc), wr: wr(a, b, cc, d), steps: [`÷ ${cc}/${d} → × ${d}/${cc}`, `${a}/${b} × ${d}/${cc} = ${chain(a * d, b * cc)}`], why: why(a, b, cc, d), probe: { ask: 'calc' } };
      })()]));
      fams.push(famOf([(() => {
        const [a, b, cc, d] = draw(() => [int(r, 5, 13), int(r, 2, 5), int(r, 2, 7), int(r, 3, 9)], ([a1, b1, c1, d1]) => a1 > b1 && a1 % b1 !== 0 && coprime(a1, b1) && c1 < d1 && coprime(c1, d1)
          && distinct([a1 * d1, b1 * c1], [a1 * c1, b1 * d1], [b1 * c1, a1 * d1], [b1 * d1, a1 * c1]));
        return { t: calcQ(`${a}/${b} ÷ ${cc}/${d}`), ans: V(a * d, b * cc), wr: wr(a, b, cc, d), steps: [`÷ ${cc}/${d} → × ${d}/${cc}`, `${a}/${b} × ${d}/${cc} = ${chain(a * d, b * cc)}`], why: why(a, b, cc, d), probe: { ask: 'calc' } };
      })()]));
      return askFam(r, c, this, fams);
    },
    misread(r, c) {
      const [a, b, cc, d] = draw(() => [int(r, 2, 7), int(r, 3, 9), int(r, 2, 7), int(r, 3, 9)], ([a1, b1, c1, d1]) => a1 < b1 && c1 < d1 && coprime(a1, b1) && coprime(c1, d1) && a1 * d1 !== b1 * c1
        && distinct([a1 * d1, b1 * c1], [a1 * c1, b1 * d1], [b1 * c1, a1 * d1]));
      const ok = `나누는 분수만 뒤집어 곱해요 — ${a}/${b} × ${d}/${cc} = ${V(a * d, b * cc)}`;
      const steps = [`÷ ${cc}/${d} → × ${d}/${cc}`, `${a}/${b} × ${d}/${cc} = ${chain(a * d, b * cc)}`];
      if (branchOf(r, c, ['noflip', 'first']) === 'noflip') {
        return misAsk(r, c, this, 'noflip', {
          q: `나눗셈을 곱셈으로 바꿔 계산해요.\n\n${showWork(`${a}/${b} ÷ ${cc}/${d} = ${a}/${b} × ${cc}/${d} = ${V(a * cc, b * d)}`)}`,
          ok, steps,
          wr: [{ text: '맞게 말했어요', tag: RIGHT_AS_WRONG }, { text: `앞 분수를 뒤집어 ${b}/${a} × ${cc}/${d} = ${V(b * cc, a * d)}`, tag: TAGS.flipFirst }, { text: '분수끼리는 나눌 수 없어요', tag: OFF }],
          whyAny: '÷를 ×로만 바꾸고 나누는 분수를 뒤집지 않았어요.',
          probe: { ask: 'noflip', a, b, cc, d },
        });
      }
      return misAsk(r, c, this, 'first', {
        q: `나눗셈을 곱셈으로 바꿔 계산해요.\n\n${showWork(`${a}/${b} ÷ ${cc}/${d} = ${b}/${a} × ${cc}/${d} = ${V(b * cc, a * d)}`)}`,
        ok, steps,
        wr: [{ text: '맞게 말했어요', tag: RIGHT_AS_WRONG }, { text: `뒤집지 않고 ${a}/${b} × ${cc}/${d} = ${V(a * cc, b * d)}`, tag: TAGS.noFlip }, { text: '앞 분수가 더 크면 나눌 수 없어요', tag: OFF }],
        whyAny: '앞 분수를 뒤집었어요. 뒤집는 것은 나누는 분수(뒤의 분수)예요.',
        probe: { ask: 'first', a, b, cc, d },
      });
    },
  },

  {
    id: 'fdv.mixed', grade: 6, name: '대분수의 나눗셈', needs: ['fdv.flip'],
    idea: '대분수가 있으면 **가분수로 바꾼 다음** 나누는 분수를 뒤집어 곱해요. 2 1/4 ÷ 3/8 = 9/4 ÷ 3/8 = 9/4 × 8/3 = 6. 자연수 부분만 따로 두면 안 돼요.',
    rule: '대분수 → 가분수 → 나누는 분수를 뒤집어 곱해요.',
    slip: '대분수를 가분수로 바꿨는지(자연수 × 분모 + 분자) 봐요.',
    calc(r, c) {
      const fams = [];
      // 나누는 분수의 분자는 2 이상 — 1이면 뒤집은 수가 "4/1"이 된다
      const mixFirst = (integer) => draw(() => [int(r, 1, 3), int(r, 2, 6), int(r, 1, 5), int(r, 2, 7), int(r, 3, 9)], ([w1, b1, n1, c1, d1]) => {
        const W = w1 * b1 + n1;
        if (!(n1 < b1 && coprime(n1, b1) && c1 < d1 && coprime(c1, d1))) return false;
        if (integer ? (W * d1) % (b1 * c1) !== 0 : (W * d1) % (b1 * c1) === 0) return false;
        return distinct([W * d1, b1 * c1], [w1 * b1 * c1 + n1 * d1, b1 * c1], [(w1 + n1) * d1, b1 * c1], [W * c1, b1 * d1]);
      });
      const mixWr = (w, b, n, cc, d, W) => [{ text: V(w * b * cc + n * d, b * cc), tag: TAGS.wholeKeep }, { text: V((w + n) * d, b * cc), tag: TAGS.badImproper }, { text: V(W * cc, b * d), tag: TAGS.noFlip }];
      const mixWhy = (w, b, n, cc, d, W) => ({ [TAGS.wholeKeep]: `자연수 ${w}도 함께 나눠야 해요 — 먼저 가분수 ${W}/${b}.`, [TAGS.badImproper]: `${w} ${n}/${b} = (${w} × ${b} + ${n})/${b} = ${W}/${b}.`, [TAGS.noFlip]: `÷ ${cc}/${d} → × ${d}/${cc} — 나누는 분수를 뒤집어요.` });
      fams.push(famOf([(() => {
        const [w, b, n, cc, d] = mixFirst(false); const W = w * b + n;
        return { t: calcQ(`${w} ${n}/${b} ÷ ${cc}/${d}`), ans: V(W * d, b * cc), wr: mixWr(w, b, n, cc, d, W), steps: [`대분수를 가분수로 — ${w} ${n}/${b} = ${W}/${b}`, `${W}/${b} × ${d}/${cc} = ${chain(W * d, b * cc)}`], why: mixWhy(w, b, n, cc, d, W), probe: { ask: 'calc' } };
      })()]));
      fams.push(famOf([(() => {
        const [a, b, w, n, d] = draw(() => [int(r, 1, 7), int(r, 2, 9), int(r, 1, 3), int(r, 1, 5), int(r, 2, 6)], ([a1, b1, w1, n1, d1]) => {
          const W = w1 * d1 + n1;
          return a1 < b1 && coprime(a1, b1) && n1 < d1 && coprime(n1, d1) && distinct([a1 * d1, b1 * W], [a1 * d1, b1 * n1], [a1 * d1, b1 * (w1 + n1)], [a1 * W, b1 * d1]);
        });
        const W = w * d + n;
        return {
          t: calcQ(`${a}/${b} ÷ ${w} ${n}/${d}`), ans: V(a * d, b * W),
          wr: [{ text: V(a * d, b * n), tag: TAGS.dropWhole }, { text: V(a * d, b * (w + n)), tag: TAGS.badImproper }, { text: V(a * W, b * d), tag: TAGS.noFlip }],
          steps: [`대분수를 가분수로 — ${w} ${n}/${d} = ${W}/${d}`, `${a}/${b} × ${d}/${W} = ${chain(a * d, b * W)}`],
          why: { [TAGS.dropWhole]: `나누는 수는 ${w} ${n}/${d} — 자연수 ${w}도 들어가요.`, [TAGS.badImproper]: `${w} ${n}/${d} = (${w} × ${d} + ${n})/${d} = ${W}/${d}.`, [TAGS.noFlip]: `÷ ${W}/${d} → × ${d}/${W} — 나누는 분수를 뒤집어요.` },
          probe: { ask: 'calc' },
        };
      })()]));
      fams.push(famOf([(() => {
        const [w, b, n, cc, d] = mixFirst(true); const W = w * b + n;
        return { t: `쌀이 ${w} ${n}/${b} kg 있어요. 한 봉지에 ${cc}/${d} kg씩 담으면 몇 봉지가 될까요?`, ans: V(W * d, b * cc), wr: mixWr(w, b, n, cc, d, W), steps: [`${w} ${n}/${b} ÷ ${cc}/${d} — 가분수로 ${W}/${b}`, `${W}/${b} × ${d}/${cc} = ${chain(W * d, b * cc)}`], why: mixWhy(w, b, n, cc, d, W), probe: { ask: 'story' } };
      })()]));
      return askFam(r, c, this, fams);
    },
    misread(r, c) {
      const [w, b, n, cc, d] = draw(() => [int(r, 1, 3), int(r, 2, 6), int(r, 1, 5), int(r, 2, 5), int(r, 3, 7)], ([w1, b1, n1, c1, d1]) => {
        const W = w1 * b1 + n1;
        return n1 < b1 && coprime(n1, b1) && c1 < d1 && coprime(c1, d1) && distinct([W * d1, b1 * c1], [w1 * b1 * c1 + n1 * d1, b1 * c1], [(w1 + n1) * d1, b1 * c1], [W * c1, b1 * d1]);
      });
      const W = w * b + n; const ans = V(W * d, b * cc);
      const steps = [`${w} ${n}/${b} = ${W}/${b}`, `${W}/${b} × ${d}/${cc} = ${chain(W * d, b * cc)}`];
      if (branchOf(r, c, ['whole', 'improper']) === 'whole') {
        return misAsk(r, c, this, 'whole', {
          q: `나눗셈을 계산해요.\n\n${showWork(`${w} ${n}/${b} ÷ ${cc}/${d} = ${w} + ${n}/${b} ÷ ${cc}/${d} = ${V(w * b * cc + n * d, b * cc)}`)}`,
          ok: `자연수 부분까지 가분수로 바꿔 나눠요 — ${W}/${b} × ${d}/${cc} = ${ans}`,
          wr: [{ text: '맞게 말했어요', tag: RIGHT_AS_WRONG }, { text: `가분수 ${w + n}/${b} × ${d}/${cc} = ${V((w + n) * d, b * cc)}`, tag: TAGS.badImproper }, { text: '대분수는 분수로 나눌 수 없어요', tag: OFF }],
          steps,
          whyAny: '자연수 부분은 그대로 두고 분수 부분만 나눴어요. 대분수 전체를 가분수로 바꿔 나눠요.',
          probe: { ask: 'whole', w, b, n, cc, d },
        });
      }
      return misAsk(r, c, this, 'improper', {
        q: `나눗셈을 계산해요.\n\n${showWork(`${w} ${n}/${b} ÷ ${cc}/${d} = ${w + n}/${b} × ${d}/${cc} = ${V((w + n) * d, b * cc)}`)}`,
        ok: `${w} ${n}/${b} = ${W}/${b} — ${W}/${b} × ${d}/${cc} = ${ans}`,
        wr: [{ text: '맞게 말했어요', tag: RIGHT_AS_WRONG }, { text: `가분수로 바꾼 다음 그대로 곱해서 ${V(W * cc, b * d)}`, tag: TAGS.noFlip }, { text: '대분수는 가분수로 바꿀 수 없어요', tag: OFF }],
        steps,
        whyAny: '가분수로 바꿀 때 자연수와 분자를 더하기만 했어요. 자연수 × 분모 + 분자예요.',
        probe: { ask: 'improper', w, b, n, cc, d },
      });
    },
  },

  {
    id: 'fdv.apply', grade: 6, name: '⭐ 분수의 나눗셈 활용', needs: ['fdv.mixed'],
    idea: '**몇 배**는 (비교하는 양) ÷ (기준이 되는 양), **1만큼의 양**은 (주어진 양) ÷ (분수)예요. 그리고 **1보다 작은 수로 나누면 몫이 나누어지는 수보다 커지고**, 1보다 큰 수로 나누면 작아져요 — 나눈다고 늘 작아지는 것은 아니에요.',
    rule: '무엇이 기준인지 보고 나눠요 — 1보다 작은 수로 나누면 몫이 커져요.',
    slip: '기준이 되는 양으로 나눴는지 봐요.',
    calc(r, c) {
      const fams = [];
      // 나누는 분수의 분자는 2 이상 — 1이면 뒤집은 수가 "3/1"이 된다
      const pq = () => draw(() => [int(r, 1, 7), int(r, 2, 9), int(r, 2, 7), int(r, 3, 9)], ([a1, b1, c1, d1]) => a1 < b1 && c1 < d1 && coprime(a1, b1) && coprime(c1, d1) && b1 !== d1
        && distinct([a1 * d1, b1 * c1], [b1 * c1, a1 * d1], [a1 * c1, b1 * d1], [a1, c1]));
      const pair = (a, b, cc, d) => ({ ans: V(a * d, b * cc), flip: V(b * cc, a * d), mul: V(a * cc, b * d) });
      fams.push(famOf([(() => {
        const [a, b, cc, d] = pq(); const p = pair(a, b, cc, d);
        return {
          t: `{mon/은/는} 나무열매를 ${a}/${b} kg 땄고, {mon2/은/는} ${cc}/${d} kg 땄어요. {mon}의 나무열매 무게는 {mon2}의 몇 배일까요?`, ans: p.ans,
          wr: [{ text: p.flip, tag: TAGS.timesFlip }, { text: p.mul, tag: TAGS.mulInstead }, { text: V(a, cc), tag: TAGS.noLCD }],
          steps: ['{mon}의 무게 ÷ {mon2}의 무게', `${a}/${b} ÷ ${cc}/${d} = ${a}/${b} × ${d}/${cc} = ${chain(a * d, b * cc)}`],
          why: { [TAGS.timesFlip]: '기준은 {mon2}의 무게 — {mon2}의 것으로 나눠요.', [TAGS.mulInstead]: '몇 배는 나눗셈이에요 — 곱하지 않아요.', [TAGS.noLCD]: '분모가 달라요 — 분자끼리만 나눌 수 없어요.' },
          probe: { ask: 'times' }, rule: '몇 배 = (비교하는 양) ÷ (기준이 되는 양).',
        };
      })()]));
      fams.push(famOf([
        (() => {
          const [a, b, cc, d] = pq(); const p = pair(a, b, cc, d);
          return {
            t: `철근 ${cc}/${d} m 무게를 재었더니 ${a}/${b} kg 나갔어요. 이 철근 1 m 무게는 몇 kg일까요?`, ans: p.ans,
            wr: [{ text: p.flip, tag: TAGS.flipAns }, { text: p.mul, tag: TAGS.mulInstead }],
            steps: [`1 m 무게 = 무게 ÷ 길이`, `${a}/${b} ÷ ${cc}/${d} = ${a}/${b} × ${d}/${cc} = ${chain(a * d, b * cc)}`],
            why: { [TAGS.flipAns]: '길이를 무게로 나눴어요 — 1 m 무게는 무게 ÷ 길이.', [TAGS.mulInstead]: '1만큼의 양은 나눗셈으로 구해요.' },
            probe: { ask: 'unit' }, rule: '1만큼의 양 = (주어진 양) ÷ (분수).',
          };
        })(),
        (() => {
          const [a, b, cc, d] = pq(); const p = pair(a, b, cc, d);
          return {
            t: `가로가 ${cc}/${d} m, 넓이가 ${a}/${b} m²인 직사각형이 있어요. 세로는 몇 m일까요?`, ans: p.ans,
            wr: [{ text: p.flip, tag: TAGS.flipAns }, { text: p.mul, tag: TAGS.mulInstead }],
            steps: ['세로 = 넓이 ÷ 가로', `${a}/${b} ÷ ${cc}/${d} = ${a}/${b} × ${d}/${cc} = ${chain(a * d, b * cc)}`],
            why: { [TAGS.flipAns]: '가로를 넓이로 나눴어요 — 세로는 넓이 ÷ 가로.', [TAGS.mulInstead]: '넓이 = 가로 × 세로 — 세로는 넓이 ÷ 가로.' },
            probe: { ask: 'area' }, rule: '세로 = 넓이 ÷ 가로.',
          };
        })(),
      ]));
      fams.push(famOf([(() => {
        const [k, p, q, X, Y] = draw(() => [int(r, 2, 9), int(r, 1, 4), int(r, 2, 7), int(r, 3, 9), int(r, 2, 6)], ([k1, p1, q1, X1, Y1]) => p1 < q1 && coprime(p1, q1) && X1 > Y1 && coprime(X1, Y1));
        return {
          t: `계산하지 않고 고르려고 해요. 몫이 ${k}보다 큰 것은 어느 것일까요?`, text: true, ans: `${k} ÷ ${p}/${q}`,
          wr: [{ text: `${k} ÷ ${X}/${Y}`, tag: TAGS.fracBig }, { text: `${k} × ${p}/${q}`, tag: TAGS.mulBig }],
          steps: ['1보다 작은 수로 나누면 몫이 나누어지는 수보다 커져요', `${p}/${q} — 1보다 작아요 → ${k} ÷ ${p}/${q}`],
          why: { [TAGS.fracBig]: `${X}/${Y} — 1보다 커요. 1보다 큰 수로 나누면 몫이 작아져요.`, [TAGS.mulBig]: `1보다 작은 수를 곱하면 ${k}보다 작아져요.` },
          probe: { ask: 'bigger', k }, rule: '1보다 작은 수로 나누면 몫이 커지고, 1보다 큰 수로 나누면 작아져요.',
        };
      })()]));
      return askFam(r, c, this, fams);
    },
    misread(r, c) {
      if (branchOf(r, c, ['times', 'small']) === 'times') {
        const [a, b, cc, d] = draw(() => [int(r, 1, 7), int(r, 2, 9), int(r, 2, 7), int(r, 3, 9)], ([a1, b1, c1, d1]) => a1 < b1 && c1 < d1 && coprime(a1, b1) && coprime(c1, d1) && b1 !== d1
          && distinct([a1 * d1, b1 * c1], [b1 * c1, a1 * d1], [a1 * c1, b1 * d1]));
        return misAsk(r, c, this, 'times', {
          q: `{mon/은/는} 나무열매를 ${a}/${b} kg, {mon2/은/는} ${cc}/${d} kg 땄어요. {mon}의 나무열매 무게는 {mon2}의 몇 배일까요?\n\n${showWork(`${cc}/${d} ÷ ${a}/${b} = ${V(b * cc, a * d)} — ${V(b * cc, a * d)}배`)}`,
          ok: `기준은 {mon2}의 무게 — ${a}/${b} ÷ ${cc}/${d} = ${V(a * d, b * cc)}배`,
          wr: [{ text: '맞게 말했어요', tag: RIGHT_AS_WRONG }, { text: `두 무게를 곱해서 ${V(a * cc, b * d)}배`, tag: TAGS.mulInstead }, { text: '분수끼리는 몇 배인지 구할 수 없어요', tag: OFF }],
          steps: ['{mon}의 무게 ÷ {mon2}의 무게', `${a}/${b} × ${d}/${cc} = ${chain(a * d, b * cc)}`],
          whyAny: '거꾸로 나눴어요. "{mon2}의 몇 배"에서는 {mon2}의 무게가 기준 — 기준이 되는 양으로 나눠요.',
          probe: { ask: 'times', a, b, cc, d },
        });
      }
      const [k, p, q] = draw(() => [int(r, 2, 9), int(r, 1, 4), int(r, 2, 7)], ([, p1, q1]) => p1 < q1 && coprime(p1, q1));
      return misAsk(r, c, this, 'small', {
        q: `나눗셈 ${k} ÷ ${p}/${q} — 몫을 어림해요.\n\n${showWork(`나누면 늘 작아지니까 몫은 ${k}보다 작아요`)}`,
        ok: `1보다 작은 수로 나누면 몫이 커져요 — ${k} ÷ ${p}/${q} = ${V(k * q, p)}`,
        wr: [{ text: '맞게 말했어요', tag: RIGHT_AS_WRONG }, { text: `몫은 ${k} × ${p}/${q} = ${V(k * p, q)}`, tag: TAGS.mulInstead }, { text: '분수로 나눈 몫은 어림할 수 없어요', tag: OFF }],
        steps: [`${p}/${q} — 1보다 작아요`, p === 1 ? `${k} ÷ 1/${q} = ${k} × ${q} = ${k * q}` : `${k} ÷ ${p}/${q} = ${k} × ${q}/${p} = ${chain(k * q, p)}`],
        whyAny: '나눈다고 늘 작아지는 것은 아니에요. 1보다 작은 수로 나누면 몫이 커져요.',
        probe: { ask: 'small', k, p, q },
      });
    },
  },
];

export function conceptById(id) {
  return FDIV.find((c) => c.id === id) || null;
}

// ───────────────────── 문항 만들기 (mathequ와 같은 모양) ─────────────────────

const SLIP = '한 번 더 천천히 — 나누어지는 수와 나누는 수를 확인해요.';
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
  return diagnosticOf(FDIV, makeQuestion, seed, n, opts);
}
export function placeFrom(answers) {
  return placeFromOf(FDIV, answers);
}
export function ladder(doneIds) {
  return ladderOf(FDIV, doneIds);
}

// ───────────────────── 사람이 쓴 내용 검사 (check.mjs가 부른다) ─────────────────────

function badPlaceholders(txt) {
  const leak = String(txt || '').match(/\{[^}]*\}/g) || [];
  return leak.filter((l) => !/^\{(me|mon|mon2)(\/[^/}]+\/[^}]+)?\}$/.test(l));
}

/**
 * coach/math/fracdiv.json 형식 검사 — mathequ.checkContent와 같은 규칙 (값은 분수·대분수까지 읽는다)
 * @returns {string[]}
 */
export function checkContent(content) {
  const bad = [];
  for (const c of FDIV) {
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
