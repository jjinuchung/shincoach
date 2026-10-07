// ✖️ 수학 — U 분수의 곱셈 줄기 (초5 「분수의 곱셈」 5-2): 개념 사다리 + 문제 생성기 + 내용 형식 검사.
// 순수 함수만 — 화면 없음 (node 테스트에서 그대로 돈다).
//
// 왜 이 줄기인가 (2026-10-07, 아버님 "분수의 곱셈 줄기(초5-2) 진행하자" → 설계안 "이대로 진행"):
//   분수 × 자연수의 오답은 "분모에도 곱함"·"분모에만 곱함"·"곱하지 않고 더함" 같은 한 오개념에 몰리기 쉽고(찍기가 아니라 오개념),
//   분수 × 분수는 "전부 더함"·"통분한 뒤 분모를 한 번만 씀"처럼 덧셈 규칙과 섞이기 쉽다. A 줄기는 곱셈이 두 칸뿐이고 배움 장이 없다.
//   (아이 기록의 수치는 공개 코드에 적지 않는다 — Codex 36차 #1, 기록은 비공개 저장소에만)
// 칸 범위는 미래엔 5-2 지도서 134쪽 학습 흐름도(2단원 「분수의 곱셈」 12차시: (진분수)×(자연수) → (대분수)×(자연수) →
//   (자연수)×(진분수) → (자연수)×(대분수) → (진분수)×(진분수) [166쪽: (단위분수)×(단위분수)부터, 직사각형 넓이 모델·색종이 접기] →
//   (대분수)×(대분수) [160쪽: 대분수를 가분수로 바꾼 다음 약분] → 세 분수의 곱셈 → 문제 해결 땅의 넓이),
//   2022 성취기준 [6수01-09] 분수의 곱셈의 계산 원리를 탐구하고 그 계산을 할 수 있다 (고려사항: 계산 원리를 탐구하여 이해하는 수준).
//
// 오답은 아이가 실제로 하는 틀린 생각 흉내다 (A 줄기 이름표와 같은 말을 쓴다 — 📊에서 같은 오개념으로 모인다):
//   · 분모에도 곱함(2/5 × 3 = 6/15 — 약분하면 원래 수라 약분하지 않은 꼴로 보여 준다, A와 같은 결정) · 분모에만 곱함
//   · 곱하지 않고 더함 · 분모에 더함 · 대분수의 자연수에만 곱함 · 분수 부분에만 곱함 · 가분수로 잘못 바꿈
//   · 단위분수만큼에서 멈춤 · 분자와 분모를 바꿔 곱함 · 분모끼리 더함 · 분자끼리 더함 · 전부 더함 · 통분한 뒤 분모를 한 번만 씀
//   · 분모를 그대로 둠 · 자연수끼리·분수끼리 곱함 · 가분수로 바꾸기 전에 약분 · 앞의 두 분수만 곱함 · 남은 양을 구함
//   · 곱하면 늘 커진다 · 분수를 곱하면 늘 작아진다
//
// 새 줄기의 함정(메모 stem-generator-pitfalls)을 처음부터:
//   · 가족 = 틀 여러 개, 틀마다 수를 미리 뽑아 둔다 — 🔁 쌍둥이가 요청한 틀(tplKey)로 온다 · 틀마다 수의 꼴(자연수·분수·대분수)을 고정
//   · ★ 분수 바로 뒤에는 조사를 붙이지 않는다("2/5를"은 "5분의 2를" — 끝자리 소리 검사가 틀린다). 글은 "— " · "짜리" · "만큼" · "씩"으로 잇는다.
//     단위 글자(m·L·kg) 바로 뒤에도 조사를 붙이지 않는다
//   · 수가 답인 ①은 숫자판(수·분수·대분수 칸) — 약분 안 한 답도 맞음(2022 고려사항, T와 같다). 문제 글에 "분수로"를 쓰지 않는다(숫자판이 꼴을 묻는다)
//   · 오답은 기약분수·대분수로 맞춰 쓴다(정답만 다른 꼴이면 힌트) — "분모에도 곱함"만 약분하지 않은 꼴 · 오답끼리·정답과 같은 값은 뽑지 않는다(probe.allWrong)
//   · 후보에서 고르는 ①은 "어느 것" 말투 (숫자판이 아니라 보기)
// ★ 정답·오답은 테스트가 **문제 글을 따로 읽어** 분수 셈으로 다시 푼다 (tests/mathfmul.test.js).

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
const lcm = (a, b) => (a / gcd(a, b)) * b;
const keyOf = ([n, d]) => red(n, d).join('/');
/** 값들이 모두 다른가 — [분자, 분모] 쌍으로 */
const distinct = (...pairs) => new Set(pairs.map(keyOf)).size === pairs.length;
/** 조건에 맞을 때까지 다시 뽑기 */
function draw(gen, ok) {
  for (let k = 0; k < 4000; k++) { const v = gen(); if (ok(v)) return v; }
  throw new Error('draw: 조건에 맞는 수를 못 뽑음');
}
/** 대분수 글자 */
const MX = (w, n, d) => `${w} ${n}/${d}`;

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
/** 고른 틀로 ① 문항 만들기 — v: { t, ans, wr, steps, why, whyAny, rule, text(식 보기), probe } */
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

/** 이 줄기의 오개념 이름표 (📊·🤔 노트·결과 카드에 그대로 뜬다) — 이름표 하나에 셈 하나 */
export const TAGS = {
  // U1·U3 분수 × 자연수 (A 줄기와 같은 말)
  mulDenToo: '분모에도 곱함',
  mulDenOnly: '분모에만 곱함',
  addInstead: '곱하지 않고 더함',
  addDen: '분모에 더함',
  // U2·U4 대분수 × 자연수
  wholeOnly: '대분수의 자연수에만 곱함',
  fracOnly: '분수 부분에만 곱함',
  badImproper: '가분수로 잘못 바꿈',
  // U3 자연수 × 진분수
  partOnly: '단위분수만큼에서 멈춤',
  flipFrac: '분자와 분모를 바꿔 곱함',
  // U5·U6·U8 분수 × 분수 (A 줄기와 같은 말)
  denSum: '분모끼리 더함',
  numSum: '분자끼리 더함',
  allSum: '전부 더함',
  lcdOnce: '통분한 뒤 분모를 한 번만 씀',
  keepDen: '분모를 그대로 둠',
  // U7 대분수 × 대분수
  splitMul: '자연수끼리·분수끼리 곱함',
  earlyCancel: '가분수로 바꾸기 전에 약분',
  // U8 세 분수
  dropThird: '앞의 두 분수만 곱함',
  // U9 활용
  leftOver: '남은 양을 구함',
  mulBig: '곱하면 늘 커진다고 봄',
  fracSmall: '분수를 곱하면 늘 작아진다고 봄',
};

// ───────────────────── 개념 사다리 (U. 분수의 곱셈 줄기) ─────────────────────

export const FMUL = [
  {
    id: 'fmul.fracnat', grade: 5, name: '(진분수)×(자연수)', needs: [],
    idea: '2/5 × 3 = 2/5 + 2/5 + 2/5 — 같은 분수를 세 번 더한 것이에요. 1/5짜리가 2개씩 3묶음이라 6개 — 6/5 = 1 1/5. **분모는 그대로 두고 분자에 자연수를 곱해요.** 5/6 × 4처럼 분모와 자연수를 약분할 수 있으면 곱하기 전에 약분해도 돼요 — 5/6 × 4 = 5/3 × 2 = 10/3 = 3 1/3.',
    rule: '분모는 그대로, 분자 × 자연수 — 약분할 수 있으면 곱하기 전에 해도 돼요.',
    slip: '분모에도 곱하지 않았는지 봐요.',
    calc(r, c) {
      const fams = [];
      // 약분 없는 수 — 분모와 자연수가 서로소
      const plain = () => draw(() => [int(r, 3, 9), int(r, 1, 8), int(r, 2, 6)], ([d, n, k]) => n < d && coprime(n, d) && coprime(k, d)
        && distinct([n * k, d], [n, d], [n, d * k], [n + k * d, d], [n * k, d + k]));
      const wrongs = (n, d, k) => [{ text: `${n * k}/${d * k}`, tag: TAGS.mulDenToo }, { text: V(n, d * k), tag: TAGS.mulDenOnly }, { text: V(n + k * d, d), tag: TAGS.addInstead }, { text: V(n * k, d + k), tag: TAGS.addDen }];
      const whys = (n, d, k) => ({
        [TAGS.mulDenToo]: `분모 ${d}는 조각의 크기 — 그대로 두고 분자만 ${k}배 해요.`,
        [TAGS.mulDenOnly]: '분모에 곱하면 조각이 작아져요 — 분자에 곱해요.',
        [TAGS.addInstead]: `× ${k}는 ${k}번 더한 것 — ${k}를 더하는 게 아니에요.`,
        [TAGS.addDen]: '분모는 그대로 — 분모에 더하지 않아요.',
      });
      fams.push(famOf([(() => {
        const [d, n, k] = plain();
        return { t: calcQ(`${n}/${d} × ${k}`), ans: V(n * k, d), wr: wrongs(n, d, k), steps: [`분모는 그대로, 분자에 곱해요 — ${n} × ${k} = ${n * k}`, `${n}/${d} × ${k} = ${chain(n * k, d)}`], why: whys(n, d, k), probe: { ask: 'calc' } };
      })()]));
      fams.push(famOf([(() => {
        // 곱하기 전에 약분 — 분모와 자연수가 공약수를 가지되 약분해도 분모가 1이 되지 않게
        const [d, n, k] = draw(() => [int(r, 4, 10), int(r, 1, 9), int(r, 2, 9)], ([d1, n1, k1]) => n1 < d1 && coprime(n1, d1) && gcd(d1, k1) > 1 && k1 % d1 !== 0
          && distinct([n1 * k1, d1], [n1, d1], [n1, d1 * k1], [n1 + k1 * d1, d1], [n1 * k1, d1 + k1]));
        const g = gcd(d, k);
        return { t: calcQ(`${n}/${d} × ${k}`), ans: V(n * k, d), wr: wrongs(n, d, k), steps: [`분모 ${d}와 ${k}를 약분하면 ${n}/${d / g} × ${k / g}`, `${n}/${d / g} × ${k / g} = ${chain((n * k) / g, d / g)}`], why: whys(n, d, k), probe: { ask: 'calc' } };
      })()]));
      fams.push(famOf([
        (() => {
          const [d, n, k] = plain();
          return { t: `{mon/은/는} 하루에 나무열매를 ${n}/${d} kg씩 먹어요. ${k}일 동안 먹는 나무열매는 모두 몇 kg일까요?`, ans: V(n * k, d), wr: wrongs(n, d, k), steps: [`${n}/${d} kg씩 ${k}일 — ${n}/${d} × ${k}`, `${n}/${d} × ${k} = ${chain(n * k, d)}`], why: whys(n, d, k), probe: { ask: 'story' } };
        })(),
        (() => {
          const [d, n, k] = plain();
          return { t: `한 병에 ${n}/${d} L씩 들어 있는 주스가 ${k}병 있어요. 주스는 모두 몇 L일까요?`, ans: V(n * k, d), wr: wrongs(n, d, k), steps: [`${n}/${d} L씩 ${k}병 — ${n}/${d} × ${k}`, `${n}/${d} × ${k} = ${chain(n * k, d)}`], why: whys(n, d, k), probe: { ask: 'story' } };
        })(),
      ]));
      return askFam(r, c, this, fams);
    },
    misread(r, c) {
      const [d, n, k] = draw(() => [int(r, 3, 8), int(r, 1, 7), int(r, 2, 4)], ([d1, n1, k1]) => n1 < d1 && coprime(n1, d1) && coprime(k1, d1) && n1 * k1 <= d1 * 2 && (n1 + k1) % d1 !== 0
        && distinct([n1 * k1, d1], [n1, d1], [n1, d1 * k1], [n1 + k1, d1], [n1 + k1 * d1, d1]));
      if (branchOf(r, c, ['den', 'add']) === 'den') {
        return misAsk(r, c, this, 'den', {
          q: `그림을 보고 곱셈을 계산해요.\n\n[fmul rep ${n}/${d} ${k}]\n\n${showWork(`${n}/${d} × ${k} = ${n * k}/${d * k}`)}`,
          ok: `분모는 그대로, 분자만 ${k}배 — ${n}/${d} × ${k} = ${V(n * k, d)}`,
          wr: [{ text: '맞게 말했어요', tag: RIGHT_AS_WRONG }, { text: `분모에만 곱해서 ${V(n, d * k)}`, tag: TAGS.mulDenOnly }, { text: '분수에는 자연수를 곱할 수 없어요', tag: OFF }],
          steps: [`1/${d}짜리 ${n}칸씩 ${k}번 — 1/${d}짜리 ${n * k}칸`, `${n}/${d} × ${k} = ${chain(n * k, d)}`],
          whyAny: '분모에도 곱했어요. 분모는 조각의 크기라 그대로 — 조각의 개수(분자)만 늘어나요.',
          probe: { ask: 'den', n, d, k },
        });
      }
      return misAsk(r, c, this, 'add', {
        q: `곱셈을 계산해요.\n\n${showWork(`${n}/${d} × ${k} = ${V(n + k, d)}`)}`,
        ok: `× ${k}는 ${k}번 더한 것 — ${n}/${d} × ${k} = ${V(n * k, d)}`,
        wr: [{ text: '맞게 말했어요', tag: RIGHT_AS_WRONG }, { text: `분모에도 곱해서 ${n * k}/${d * k}`, tag: TAGS.mulDenToo }, { text: '분수에는 자연수를 곱할 수 없어요', tag: OFF }],
        steps: [`${n}/${d} × ${k} = ${Array(k).fill(`${n}/${d}`).join(' + ')}`, `= ${chain(n * k, d)}`],
        whyAny: '분자에 자연수를 더했어요. 곱하기는 같은 수를 여러 번 더하는 것 — 분자에 곱해요.',
        probe: { ask: 'add', n, d, k },
      });
    },
  },

  {
    id: 'fmul.mixnat', grade: 5, name: '(대분수)×(자연수)', needs: ['fmul.fracnat'],
    idea: '2 1/3 × 2 — **자연수 부분과 분수 부분에 각각 곱해서 더해요.** 2 × 2 = 4, 1/3 × 2 = 2/3 → 4 2/3. 또는 **가분수로 바꿔서** 곱해요 — 2 1/3 = 7/3, 7/3 × 2 = 14/3 = 4 2/3. 어느 쪽이든 답은 같아요.',
    rule: '자연수 부분·분수 부분에 각각 곱해 더하거나, 가분수로 바꿔 곱해요.',
    slip: '분수 부분에도 곱했는지 봐요.',
    calc(r, c) {
      const fams = [];
      const pickMix = (carry) => draw(() => [int(r, 1, 3), int(r, 3, 8), int(r, 1, 7), int(r, 2, 5)], ([w, d, n, k]) => n < d && coprime(n, d) && (carry ? n * k >= d : n * k < d)
        && distinct([(w * d + n) * k, d], [w * k * d + n, d], [w * d + n * k, d], [(w + n) * k, d]));
      const wrongs = (w, n, d, k) => [{ text: V(w * k * d + n, d), tag: TAGS.wholeOnly }, { text: V(w * d + n * k, d), tag: TAGS.fracOnly }, { text: V((w + n) * k, d), tag: TAGS.badImproper }];
      const whys = (w, n, d, k) => ({
        [TAGS.wholeOnly]: `분수 부분도 ${k}배 — ${n}/${d} × ${k} = ${chain(n * k, d)}`,
        [TAGS.fracOnly]: `자연수 부분도 ${k}배 — ${w} × ${k} = ${w * k}`,
        [TAGS.badImproper]: `${MX(w, n, d)} = (${w} × ${d} + ${n})/${d} = ${w * d + n}/${d} — 자연수에 분모를 곱해요.`,
      });
      const steps = (w, n, d, k) => [`자연수 부분 ${w} × ${k} = ${w * k}, 분수 부분 ${n}/${d} × ${k} = ${chain(n * k, d)}`, `${w * k} + ${V(n * k, d)} = ${V((w * d + n) * k, d)}`];
      fams.push(famOf([(() => {
        const [w, d, n, k] = pickMix(false);
        return { t: calcQ(`${MX(w, n, d)} × ${k}`), ans: V((w * d + n) * k, d), wr: wrongs(w, n, d, k), steps: steps(w, n, d, k), why: whys(w, n, d, k), probe: { ask: 'calc' } };
      })()]));
      fams.push(famOf([(() => {
        const [w, d, n, k] = pickMix(true);
        const W = w * d + n;
        return { t: calcQ(`${MX(w, n, d)} × ${k}`), ans: V(W * k, d), wr: wrongs(w, n, d, k), steps: [`가분수로 바꿔요 — ${MX(w, n, d)} = ${W}/${d}`, `${W}/${d} × ${k} = ${chain(W * k, d)}`], why: whys(w, n, d, k), probe: { ask: 'calc' } };
      })()]));
      fams.push(famOf([(() => {
        const [w, d, n, k] = pickMix(true);
        const W = w * d + n;
        return { t: `한 봉지에 ${MX(w, n, d)} kg씩 담긴 밀가루가 ${k}봉지 있어요. 밀가루는 모두 몇 kg일까요?`, ans: V(W * k, d), wr: wrongs(w, n, d, k), steps: [`${MX(w, n, d)} kg씩 ${k}봉지 — 가분수로 ${W}/${d}`, `${W}/${d} × ${k} = ${chain(W * k, d)}`], why: whys(w, n, d, k), probe: { ask: 'story' } };
      })()]));
      return askFam(r, c, this, fams);
    },
    misread(r, c) {
      const [w, d, n, k] = draw(() => [int(r, 1, 3), int(r, 3, 7), int(r, 1, 6), int(r, 2, 4)], ([w1, d1, n1, k1]) => n1 < d1 && coprime(n1, d1) && (w1 + n1) % d1 !== 0 && coprime(w1 + n1, d1)
        && distinct([(w1 * d1 + n1) * k1, d1], [w1 * k1 * d1 + n1, d1], [w1 * d1 + n1 * k1, d1], [(w1 + n1) * k1, d1]));
      const W = w * d + n; const ans = V(W * k, d);
      if (branchOf(r, c, ['whole', 'improper']) === 'whole') {
        return misAsk(r, c, this, 'whole', {
          q: `곱셈을 계산해요.\n\n${showWork(`${MX(w, n, d)} × ${k} = ${MX(w * k, n, d)}`)}`,
          ok: `분수 부분도 ${k}배 — ${MX(w, n, d)} × ${k} = ${ans}`,
          wr: [{ text: '맞게 말했어요', tag: RIGHT_AS_WRONG }, { text: `분수 부분에만 곱해서 ${V(w * d + n * k, d)}`, tag: TAGS.fracOnly }, { text: '대분수에는 자연수를 곱할 수 없어요', tag: OFF }],
          steps: [`${w} × ${k} = ${w * k}, ${n}/${d} × ${k} = ${chain(n * k, d)}`, `${w * k} + ${V(n * k, d)} = ${ans}`],
          whyAny: '자연수 부분에만 곱했어요. 분수 부분에도 곱해서 더해요.',
          probe: { ask: 'whole', w, n, d, k },
        });
      }
      return misAsk(r, c, this, 'improper', {
        q: `곱셈을 계산해요.\n\n${showWork(`${MX(w, n, d)} × ${k} = ${w + n}/${d} × ${k} = ${V((w + n) * k, d)}`)}`,
        ok: `${MX(w, n, d)} = ${W}/${d} — ${W}/${d} × ${k} = ${ans}`,
        wr: [{ text: '맞게 말했어요', tag: RIGHT_AS_WRONG }, { text: `자연수 부분에만 곱해서 ${V(w * k * d + n, d)}`, tag: TAGS.wholeOnly }, { text: '대분수는 가분수로 바꿀 수 없어요', tag: OFF }],
        steps: [`${MX(w, n, d)} = (${w} × ${d} + ${n})/${d} = ${W}/${d}`, `${W}/${d} × ${k} = ${chain(W * k, d)}`],
        whyAny: '가분수로 바꿀 때 자연수와 분자를 더하기만 했어요. 자연수 × 분모 + 분자예요.',
        probe: { ask: 'improper', w, n, d, k },
      });
    },
  },

  {
    id: 'fmul.natfrac', grade: 5, name: '(자연수)×(진분수)', needs: ['fmul.mixnat'],
    idea: '12 × 2/3 — 12를 똑같이 3묶음으로 나눈 것 중 2묶음이에요. 한 묶음이 4라서 2묶음은 8. 식으로는 **분자에 자연수를 곱하고 분모는 그대로** — 12 × 2/3 = 24/3 = 8. 곱하기 전에 자연수와 분모를 약분해도 돼요 — 12 × 2/3 = 4 × 2 = 8. **자연수에 1보다 작은 분수를 곱하면 처음 수보다 작아져요.**',
    rule: '분자에 자연수를 곱하고 분모는 그대로 — 몇 묶음 중 몇 묶음인지 생각해요.',
    slip: '분모로 나누기만 하고 멈추지 않았는지 봐요.',
    calc(r, c) {
      const fams = [];
      // 나누어떨어지는 수 — 12 × 2/3 (분자 2 이상: 1이면 "단위분수만큼에서 멈춤"이 정답과 같다)
      const even = () => draw(() => [int(r, 2, 6), int(r, 2, 6), int(r, 2, 5)], ([d, m, p]) => p < d && coprime(p, d) && distinct([m * p, 1], [m, 1], [m * d * d, p], [p, d]));
      const wrongs = (N, p, d) => [{ text: V(N, d), tag: TAGS.partOnly }, { text: V(N * d, p), tag: TAGS.flipFrac }, { text: `${N * p}/${N * d}`, tag: TAGS.mulDenToo }];
      const whys = (N, p, d) => ({
        [TAGS.partOnly]: `${N} ÷ ${d} = ${V(N, d)} — 1/${d}만큼에서 멈췄어요. ${p}배 해야 ${p}/${d}만큼이에요.`,
        [TAGS.flipFrac]: `분자와 분모를 바꾸지 않아요 — ${p}/${d} 그대로 곱해요.`,
        [TAGS.mulDenToo]: `자연수는 분자에만 곱해요 — 분모 ${d}는 그대로.`,
      });
      fams.push(famOf([(() => {
        const [d, m, p] = even(); const N = d * m;
        return { t: calcQ(`${N} × ${p}/${d}`), ans: String(m * p), wr: wrongs(N, p, d), steps: [`${N}를 똑같이 ${d}묶음으로 — 한 묶음 ${N} ÷ ${d} = ${m}`, `${p}묶음은 ${m} × ${p} = ${m * p}`], why: whys(N, p, d), probe: { ask: 'calc' } };
      })()]));
      fams.push(famOf([(() => {
        // 나누어떨어지지 않는 수 — 5 × 2/3 = 10/3
        const [N, d, p] = draw(() => [int(r, 2, 9), int(r, 3, 9), int(r, 2, 8)], ([N1, d1, p1]) => p1 < d1 && coprime(p1, d1) && coprime(N1, d1)
          && distinct([N1 * p1, d1], [N1, d1], [N1 * d1, p1], [p1, d1]));
        return { t: calcQ(`${N} × ${p}/${d}`), ans: V(N * p, d), wr: wrongs(N, p, d), steps: [`분자에 곱해요 — ${N} × ${p} = ${N * p}`, `${N} × ${p}/${d} = ${chain(N * p, d)}`], why: whys(N, p, d), probe: { ask: 'calc' } };
      })()]));
      fams.push(famOf([
        (() => {
          const [d, m, p] = even(); const N = d * m;
          return { t: `{mon/은/는} 나무열매 ${N}개 중 ${p}/${d}만큼을 먹었어요. 먹은 나무열매는 몇 개일까요?`, ans: String(m * p), wr: wrongs(N, p, d), steps: [`${N}개의 ${p}/${d} — ${N} × ${p}/${d}`, `${N} ÷ ${d} = ${m}, ${m} × ${p} = ${m * p}`], why: whys(N, p, d), probe: { ask: 'story' } };
        })(),
        (() => {
          const [d, m, p] = even(); const N = d * m;
          return { t: `길이가 ${N} m인 리본 중 ${p}/${d}만큼을 잘라 썼어요. 쓴 리본은 몇 m일까요?`, ans: String(m * p), wr: wrongs(N, p, d), steps: [`${N} m의 ${p}/${d} — ${N} × ${p}/${d}`, `${N} ÷ ${d} = ${m}, ${m} × ${p} = ${m * p}`], why: whys(N, p, d), probe: { ask: 'story' } };
        })(),
      ]));
      return askFam(r, c, this, fams);
    },
    misread(r, c) {
      const [d, m, p] = draw(() => [int(r, 2, 5), int(r, 2, 4), int(r, 2, 4)], ([d1, m1, p1]) => p1 < d1 && coprime(p1, d1) && d1 * m1 <= 20 && distinct([m1 * p1, 1], [m1, 1], [m1 * d1 * d1, p1]));
      const N = d * m;
      if (branchOf(r, c, ['part', 'big']) === 'part') {
        return misAsk(r, c, this, 'part', {
          q: `그림을 보고 곱셈을 계산해요.\n\n[fmul part ${N} ${p}/${d}]\n\n${showWork(`${N} × ${p}/${d} = ${N} ÷ ${d} = ${m}`)}`,
          ok: `한 묶음 ${m}의 ${p}묶음 — ${m} × ${p} = ${m * p}`,
          wr: [{ text: '맞게 말했어요', tag: RIGHT_AS_WRONG }, { text: `분자와 분모를 바꿔서 ${V(N * d, p)}`, tag: TAGS.flipFrac }, { text: '자연수에는 분수를 곱할 수 없어요', tag: OFF }],
          steps: [`${N}를 똑같이 ${d}묶음으로 — 한 묶음 ${m}`, `${p}묶음은 ${m} × ${p} = ${m * p}`],
          whyAny: `1/${d}만큼(한 묶음)에서 멈췄어요. ${p}/${d}만큼은 ${p}묶음이에요.`,
          probe: { ask: 'part', N, p, d },
        });
      }
      return misAsk(r, c, this, 'big', {
        q: `곱셈 ${N} × ${p}/${d} — 곱을 어림해요.\n\n${showWork(`곱하면 커지니까 곱은 ${N}보다 커요`)}`,
        ok: `자연수에 1보다 작은 분수를 곱하면 작아져요 — ${N} × ${p}/${d} = ${m * p}`,
        wr: [{ text: '맞게 말했어요', tag: RIGHT_AS_WRONG }, { text: `분모로만 나눠서 ${m}`, tag: TAGS.partOnly }, { text: '분수를 곱한 값은 어림할 수 없어요', tag: OFF }],
        steps: [`${p}/${d} — 1보다 작아요`, `${N} × ${p}/${d} = ${m * p} — ${N}보다 작아요`],
        whyAny: '곱한다고 늘 커지는 것은 아니에요. 1보다 작은 분수를 곱하면 처음 수보다 작아져요.',
        probe: { ask: 'big', N, p, d },
      });
    },
  },

  {
    id: 'fmul.natmix', grade: 5, name: '(자연수)×(대분수)', needs: ['fmul.natfrac'],
    idea: '3 × 2 1/4 — **대분수를 가분수로 바꿔 곱하거나**, 자연수 부분과 분수 부분에 각각 곱해서 더해요. 3 × 2 1/4 = 3 × 9/4 = 27/4 = 6 3/4 — 또는 3 × 2 = 6, 3 × 1/4 = 3/4 → 6 3/4.',
    rule: '가분수로 바꿔 곱하거나, 자연수 부분·분수 부분에 각각 곱해 더해요.',
    slip: '분수 부분에도 곱했는지 봐요.',
    calc(r, c) {
      const fams = [];
      const pickN = (cancel) => draw(() => [int(r, 2, 6), int(r, 1, 3), int(r, 2, 7), int(r, 1, 6)], ([N, w, d, n]) => n < d && coprime(n, d) && (cancel ? gcd(N, d) > 1 && N % d !== 0 : coprime(N, d))
        && distinct([N * (w * d + n), d], [N * w * d + n, d], [w * d + N * n, d], [N * (w + n), d]));
      const wrongs = (N, w, n, d) => [{ text: V(N * w * d + n, d), tag: TAGS.wholeOnly }, { text: V(w * d + N * n, d), tag: TAGS.fracOnly }, { text: V(N * (w + n), d), tag: TAGS.badImproper }];
      const whys = (N, w, n, d) => ({
        [TAGS.wholeOnly]: `분수 부분에도 ${N}를 곱해요 — ${N} × ${n}/${d} = ${chain(N * n, d)}`,
        [TAGS.fracOnly]: `자연수 부분에도 곱해요 — ${N} × ${w} = ${N * w}`,
        [TAGS.badImproper]: `${MX(w, n, d)} = (${w} × ${d} + ${n})/${d} = ${w * d + n}/${d} — 자연수에 분모를 곱해요.`,
      });
      fams.push(famOf([(() => {
        const [N, w, d, n] = pickN(false); const W = w * d + n;
        return { t: calcQ(`${N} × ${MX(w, n, d)}`), ans: V(N * W, d), wr: wrongs(N, w, n, d), steps: [`가분수로 바꿔요 — ${MX(w, n, d)} = ${W}/${d}`, `${N} × ${W}/${d} = ${chain(N * W, d)}`], why: whys(N, w, n, d), probe: { ask: 'calc' } };
      })()]));
      fams.push(famOf([(() => {
        const [N, w, d, n] = pickN(true); const W = w * d + n; const g = gcd(N, d);
        return { t: calcQ(`${N} × ${MX(w, n, d)}`), ans: V(N * W, d), wr: wrongs(N, w, n, d), steps: [`가분수로 바꾸고 ${N}와 ${d}를 약분 — ${N / g} × ${W}/${d / g}`, `${N / g} × ${W}/${d / g} = ${chain((N / g) * W, d / g)}`], why: whys(N, w, n, d), probe: { ask: 'calc' } };
      })()]));
      fams.push(famOf([(() => {
        const [N, w, d, n] = pickN(false); const W = w * d + n;
        return { t: `{me/은/는} 한 시간에 ${MX(w, n, d)} km씩 걸어요. ${N}시간 동안 걸으면 모두 몇 km일까요?`, ans: V(N * W, d), wr: wrongs(N, w, n, d), steps: [`${MX(w, n, d)} km씩 ${N}시간 — ${N} × ${MX(w, n, d)}`, `${N} × ${W}/${d} = ${chain(N * W, d)}`], why: whys(N, w, n, d), probe: { ask: 'story' } };
      })()]));
      return askFam(r, c, this, fams);
    },
    misread(r, c) {
      const [N, w, d, n] = draw(() => [int(r, 2, 5), int(r, 1, 3), int(r, 3, 7), int(r, 1, 6)], ([N1, w1, d1, n1]) => n1 < d1 && coprime(n1, d1) && coprime(N1, d1) && (w1 + n1) % d1 !== 0 && coprime(w1 + n1, d1)
        && distinct([N1 * (w1 * d1 + n1), d1], [N1 * w1 * d1 + n1, d1], [w1 * d1 + N1 * n1, d1], [N1 * (w1 + n1), d1]));
      const W = w * d + n; const ans = V(N * W, d);
      if (branchOf(r, c, ['whole', 'improper']) === 'whole') {
        return misAsk(r, c, this, 'whole', {
          q: `곱셈을 계산해요.\n\n${showWork(`${N} × ${MX(w, n, d)} = ${MX(N * w, n, d)}`)}`,
          ok: `분수 부분에도 곱해요 — ${N} × ${W}/${d} = ${ans}`,
          wr: [{ text: '맞게 말했어요', tag: RIGHT_AS_WRONG }, { text: `분수 부분에만 곱해서 ${V(w * d + N * n, d)}`, tag: TAGS.fracOnly }, { text: '자연수에는 대분수를 곱할 수 없어요', tag: OFF }],
          steps: [`${MX(w, n, d)} = ${W}/${d}`, `${N} × ${W}/${d} = ${chain(N * W, d)}`],
          whyAny: '대분수의 자연수 부분에만 곱했어요. 분수 부분에도 곱해야 해요.',
          probe: { ask: 'whole', N, w, n, d },
        });
      }
      return misAsk(r, c, this, 'improper', {
        q: `곱셈을 계산해요.\n\n${showWork(`${N} × ${MX(w, n, d)} = ${N} × ${w + n}/${d} = ${V(N * (w + n), d)}`)}`,
        ok: `${MX(w, n, d)} = ${W}/${d} — ${N} × ${W}/${d} = ${ans}`,
        wr: [{ text: '맞게 말했어요', tag: RIGHT_AS_WRONG }, { text: `자연수 부분에만 곱해서 ${V(N * w * d + n, d)}`, tag: TAGS.wholeOnly }, { text: '대분수는 가분수로 바꿀 수 없어요', tag: OFF }],
        steps: [`${MX(w, n, d)} = (${w} × ${d} + ${n})/${d} = ${W}/${d}`, `${N} × ${W}/${d} = ${chain(N * W, d)}`],
        whyAny: '가분수로 바꿀 때 자연수와 분자를 더하기만 했어요. 자연수 × 분모 + 분자예요.',
        probe: { ask: 'improper', N, w, n, d },
      });
    },
  },

  {
    id: 'fmul.unit', grade: 5, name: '(단위분수)×(단위분수)', needs: ['fmul.natmix'],
    idea: '1/2 × 1/3 — 반을 다시 똑같이 3조각으로 나눈 것 중 1조각이에요. 색종이를 반으로 접고 다시 3칸으로 접으면 전체가 6칸 — 그중 1칸이라 1/6. **단위분수끼리 곱하면 분자는 1, 분모는 분모끼리 곱해요** — 1/2 × 1/3 = 1/6. 1/6 — 1/2보다도 1/3보다도 작아요.',
    rule: '단위분수끼리 곱하면 분자는 1, 분모는 분모끼리 곱해요.',
    slip: '분모끼리 더하지 않았는지 봐요.',
    calc(r, c) {
      const fams = [];
      const pickU = (diff) => draw(() => [int(r, 2, 9), int(r, 2, 9)], ([b, d]) => (!diff || b !== d) && distinct([1, b * d], [1, b + d], [b + d, b * d], [2, b * d]));
      const wrongs = (b, d) => [{ text: V(1, b + d), tag: TAGS.denSum }, { text: V(b + d, b * d), tag: TAGS.addInstead }, { text: V(2, b * d), tag: TAGS.numSum }];
      const whys = (b, d) => ({
        [TAGS.denSum]: `분모끼리 더하지 않고 곱해요 — ${b} × ${d} = ${b * d}`,
        [TAGS.addInstead]: `곱셈이에요 — 1/${b}만큼을 다시 ${d}조각으로 나눈 것 중 1조각.`,
        [TAGS.numSum]: '분자는 1 × 1 = 1 — 더하지 않아요.',
      });
      fams.push(famOf([(() => {
        const [b, d] = pickU(false);
        return { t: calcQ(`1/${b} × 1/${d}`), ans: V(1, b * d), wr: wrongs(b, d), steps: [`분모끼리 곱해요 — ${b} × ${d} = ${b * d}`, `1/${b} × 1/${d} = 1/${b * d}`], why: whys(b, d), probe: { ask: 'calc' } };
      })()]));
      fams.push(famOf([(() => {
        const [b, d] = pickU(false);
        return { t: `{mon/은/는} 피자 한 판 중 1/${b}만큼을 가졌어요. 그중 1/${d}만큼을 먹었다면 먹은 피자는 한 판의 얼마일까요?`, ans: V(1, b * d), wr: wrongs(b, d), steps: [`1/${b}만큼의 1/${d} — 1/${b} × 1/${d}`, `1/${b} × 1/${d} = 1/${b * d}`], why: whys(b, d), probe: { ask: 'story' } };
      })()]));
      fams.push(famOf([(() => {
        const [b, d] = pickU(true);
        return {
          t: '계산하지 않고 고르려고 해요. 다음 중 가장 작은 것은 어느 것일까요?', text: true, ans: `1/${b} × 1/${d}`,
          wr: [{ text: `1/${b}`, tag: TAGS.mulBig }, { text: `1/${d}`, tag: TAGS.mulBig }],
          steps: ['1보다 작은 수를 곱하면 처음 수보다 작아져요', `1/${b} × 1/${d} = 1/${b * d} — 1/${b}보다도 1/${d}보다도 작아요`],
          why: { [TAGS.mulBig]: '곱한다고 늘 커지는 것은 아니에요 — 1보다 작은 수를 곱하면 작아져요.' },
          probe: { ask: 'smallest' }, rule: '1보다 작은 수를 곱하면 처음 수보다 작아져요.',
        };
      })()]));
      return askFam(r, c, this, fams);
    },
    misread(r, c) {
      const [b, d] = draw(() => [int(r, 2, 6), int(r, 2, 6)], ([b1, d1]) => b1 !== d1 && distinct([1, b1 * d1], [1, b1 + d1], [b1 + d1, b1 * d1]));
      if (branchOf(r, c, ['add', 'big']) === 'add') {
        return misAsk(r, c, this, 'add', {
          q: `그림을 보고 곱셈을 계산해요.\n\n[fmul area 1/${b} 1/${d}]\n\n${showWork(`1/${b} × 1/${d} = 1/${b + d}`)}`,
          ok: `분모끼리 곱해요 — 1/${b} × 1/${d} = 1/${b * d}`,
          wr: [{ text: '맞게 말했어요', tag: RIGHT_AS_WRONG }, { text: `통분해서 더하면 ${V(b + d, b * d)}`, tag: TAGS.addInstead }, { text: '단위분수끼리는 곱할 수 없어요', tag: OFF }],
          steps: [`전체 ${b} × ${d} = ${b * d}칸 중 진한 칸 1칸`, `1/${b} × 1/${d} = 1/${b * d}`],
          whyAny: '분모끼리 더했어요. 조각을 다시 나누니까 분모끼리 곱해요.',
          probe: { ask: 'add', b, d },
        });
      }
      return misAsk(r, c, this, 'big', {
        q: `곱셈 1/${b} × 1/${d} — 곱을 어림해요.\n\n${showWork(`곱하면 커지니까 곱은 1/${b}보다 커요`)}`,
        ok: `1보다 작은 수를 곱하면 작아져요 — 1/${b} × 1/${d} = 1/${b * d}`,
        wr: [{ text: '맞게 말했어요', tag: RIGHT_AS_WRONG }, { text: `분모끼리 더해서 1/${b + d}`, tag: TAGS.denSum }, { text: '분수끼리 곱한 값은 어림할 수 없어요', tag: OFF }],
        steps: [`1/${d} — 1보다 작아요`, `1/${b} × 1/${d} = 1/${b * d} — 1/${b}보다 작아요`],
        whyAny: '곱한다고 늘 커지는 것은 아니에요. 1보다 작은 수를 곱하면 처음 수보다 작아져요.',
        probe: { ask: 'big', b, d },
      });
    },
  },

  {
    id: 'fmul.frac', grade: 5, name: '(진분수)×(진분수)', needs: ['fmul.unit'],
    idea: '**분자는 분자끼리, 분모는 분모끼리 곱해요** — 2/3 × 4/5 = 8/15. 가로 2/3 m, 세로 4/5 m인 직사각형의 넓이와 같아요 — 전체 3 × 5 = 15칸 중 2 × 4 = 8칸. 덧셈과 달리 **통분하지 않아요.** 곱하기 전에 약분하면 편해요 — 3/4 × 2/9 = 1/2 × 1/3 = 1/6.',
    rule: '분자끼리, 분모끼리 곱해요 — 통분하지 않아요(약분은 먼저 해도 돼요).',
    slip: '덧셈처럼 통분하거나 더하지 않았는지 봐요.',
    calc(r, c) {
      const fams = [];
      const lcdV = (a, b, cc, d) => { const L = lcm(b, d); return V(a * (L / b) * cc * (L / d), L); };
      const wrongs = (a, b, cc, d) => [{ text: lcdV(a, b, cc, d), tag: TAGS.lcdOnce }, { text: V(a + cc, b + d), tag: TAGS.allSum }, { text: V(a * cc, b + d), tag: TAGS.denSum }, { text: V(a * d + cc * b, b * d), tag: TAGS.addInstead }];
      const whys = (a, b, cc, d) => ({
        [TAGS.lcdOnce]: '곱셈은 통분하지 않아요 — 분자끼리, 분모끼리 곱해요.',
        [TAGS.allSum]: '더하지 않고 곱해요 — 분자끼리, 분모끼리.',
        [TAGS.denSum]: `분모끼리 더하지 않고 곱해요 — ${b} × ${d} = ${b * d}`,
        [TAGS.addInstead]: '곱셈이에요 — 두 분수를 더하지 않아요.',
      });
      const okPair = (a, b, cc, d) => {
        const L = lcm(b, d);
        return distinct([a * cc, b * d], [a * (L / b) * cc * (L / d), L], [a + cc, b + d], [a * cc, b + d], [a * d + cc * b, b * d]);
      };
      // 약분 없음 — 엇갈린 수끼리도 서로소
      const plain = () => draw(() => [int(r, 1, 8), int(r, 2, 9), int(r, 1, 8), int(r, 2, 9)], ([a, b, cc, d]) => a < b && cc < d && b !== d && (a > 1 || cc > 1) && coprime(a, b) && coprime(cc, d) && coprime(a, d) && coprime(cc, b) && okPair(a, b, cc, d));
      fams.push(famOf([(() => {
        const [a, b, cc, d] = plain();
        return { t: calcQ(`${a}/${b} × ${cc}/${d}`), ans: V(a * cc, b * d), wr: wrongs(a, b, cc, d), steps: [`분자끼리 ${a} × ${cc} = ${a * cc}, 분모끼리 ${b} × ${d} = ${b * d}`, `${a}/${b} × ${cc}/${d} = ${chain(a * cc, b * d)}`], why: whys(a, b, cc, d), probe: { ask: 'calc' } };
      })()]));
      fams.push(famOf([(() => {
        // 곱하기 전에 약분 — 엇갈린 수(앞 분자와 뒤 분모 · 뒤 분자와 앞 분모)에 공약수, 약분해도 분모가 1이 되지 않게
        const [a, b, cc, d] = draw(() => [int(r, 1, 8), int(r, 2, 9), int(r, 1, 8), int(r, 2, 9)], ([a1, b1, c1, d1]) => a1 < b1 && c1 < d1 && b1 !== d1 && (a1 > 1 || c1 > 1) && coprime(a1, b1) && coprime(c1, d1)
          && (gcd(a1, d1) > 1 || gcd(c1, b1) > 1) && b1 / gcd(c1, b1) > 1 && d1 / gcd(a1, d1) > 1 && okPair(a1, b1, c1, d1));
        const g1 = gcd(cc, b); const g2 = gcd(a, d);
        const [a1, b1, c1, d1] = [a / g2, b / g1, cc / g1, d / g2];
        return { t: calcQ(`${a}/${b} × ${cc}/${d}`), ans: V(a * cc, b * d), wr: wrongs(a, b, cc, d), steps: [`엇갈린 수끼리 약분하면 ${a1}/${b1} × ${c1}/${d1}`, `${a1}/${b1} × ${c1}/${d1} = ${chain(a1 * c1, b1 * d1)}`], why: whys(a, b, cc, d), probe: { ask: 'calc' } };
      })()]));
      fams.push(famOf([(() => {
        const [a, b, cc, d] = plain();
        return { t: `가로가 ${a}/${b} m, 세로가 ${cc}/${d} m인 직사각형이 있어요. 이 직사각형의 넓이는 몇 m²일까요?`, ans: V(a * cc, b * d), wr: wrongs(a, b, cc, d), steps: [`넓이 = 가로 × 세로 — ${a}/${b} × ${cc}/${d}`, `${a}/${b} × ${cc}/${d} = ${chain(a * cc, b * d)}`], why: { ...whys(a, b, cc, d), [TAGS.addInstead]: '넓이는 가로 × 세로 — 더하지 않아요.' }, probe: { ask: 'area' } };
      })()]));
      fams.push(famOf([(() => {
        // 분모가 같은 두 분수 — 분모를 그대로 두는 실수 (덧셈 규칙)
        const [b, a, cc] = draw(() => [int(r, 3, 9), int(r, 1, 8), int(r, 1, 8)], ([b1, a1, c1]) => a1 < b1 && c1 < b1 && (a1 > 1 || c1 > 1) && coprime(a1, b1) && coprime(c1, b1)
          && distinct([a1 * c1, b1 * b1], [a1 * c1, b1], [a1 + c1, b1], [a1 + c1, b1 * 2]));
        return {
          t: calcQ(`${a}/${b} × ${cc}/${b}`), ans: V(a * cc, b * b),
          wr: [{ text: V(a * cc, b), tag: TAGS.keepDen }, { text: V(a + cc, b), tag: TAGS.addInstead }, { text: V(a + cc, b * 2), tag: TAGS.allSum }],
          steps: [`분모가 같아도 분모끼리 곱해요 — ${b} × ${b} = ${b * b}`, `${a}/${b} × ${cc}/${b} = ${chain(a * cc, b * b)}`],
          why: { [TAGS.keepDen]: `분모를 그대로 두는 건 덧셈 규칙 — 곱셈은 분모도 ${b} × ${b}.`, [TAGS.addInstead]: '곱셈이에요 — 더하지 않아요.', [TAGS.allSum]: '더하지 않고 곱해요 — 분자끼리, 분모끼리.' },
          probe: { ask: 'same' },
        };
      })()]));
      return askFam(r, c, this, fams);
    },
    misread(r, c) {
      const [a, b, cc, d] = draw(() => [int(r, 1, 4), int(r, 2, 5), int(r, 1, 4), int(r, 2, 5)], ([a1, b1, c1, d1]) => a1 < b1 && c1 < d1 && b1 !== d1 && coprime(b1, d1) && coprime(a1, b1) && coprime(c1, d1)
        && distinct([a1 * c1, b1 * d1], [a1 * d1 * c1 * b1, b1 * d1], [a1 * c1, b1 + d1], [a1 + c1, b1 + d1], [a1 * d1 + c1 * b1, b1 * d1]));
      const ans = V(a * cc, b * d);
      if (branchOf(r, c, ['lcd', 'add']) === 'lcd') {
        return misAsk(r, c, this, 'lcd', {
          q: `그림을 보고 곱셈을 계산해요.\n\n[fmul area ${a}/${b} ${cc}/${d}]\n\n${showWork(`${a}/${b} × ${cc}/${d} = ${a * d}/${b * d} × ${cc * b}/${b * d} = ${V(a * d * cc * b, b * d)}`)}`,
          ok: `통분하지 않아요 — 분자끼리, 분모끼리 곱해서 ${ans}`,
          wr: [{ text: '맞게 말했어요', tag: RIGHT_AS_WRONG }, { text: `분모끼리 더해서 ${V(a * cc, b + d)}`, tag: TAGS.denSum }, { text: '분모가 다르면 곱할 수 없어요', tag: OFF }],
          steps: [`전체 ${b} × ${d} = ${b * d}칸 중 진한 칸 ${a} × ${cc} = ${a * cc}칸`, `${a}/${b} × ${cc}/${d} = ${chain(a * cc, b * d)}`],
          whyAny: '덧셈처럼 통분했어요. 곱셈은 통분하지 않고 분자끼리, 분모끼리 곱해요.',
          probe: { ask: 'lcd', a, b, cc, d },
        });
      }
      return misAsk(r, c, this, 'add', {
        q: `곱셈을 계산해요.\n\n${showWork(`${a}/${b} × ${cc}/${d} = ${V(a + cc, b + d)}`)}`,
        ok: `분자끼리, 분모끼리 곱해요 — ${a}/${b} × ${cc}/${d} = ${ans}`,
        wr: [{ text: '맞게 말했어요', tag: RIGHT_AS_WRONG }, { text: `통분해서 더하면 ${V(a * d + cc * b, b * d)}`, tag: TAGS.addInstead }, { text: '분모가 다르면 곱할 수 없어요', tag: OFF }],
        steps: [`분자끼리 ${a} × ${cc} = ${a * cc}, 분모끼리 ${b} × ${d} = ${b * d}`, `${a}/${b} × ${cc}/${d} = ${chain(a * cc, b * d)}`],
        whyAny: '분자끼리, 분모끼리 더했어요. 곱셈은 분자끼리, 분모끼리 곱해요.',
        probe: { ask: 'add', a, b, cc, d },
      });
    },
  },

  {
    id: 'fmul.mixed', grade: 5, name: '(대분수)×(대분수)', needs: ['fmul.frac'],
    idea: '**대분수를 가분수로 바꾼 다음** 분자끼리, 분모끼리 곱해요 — 1 1/2 × 2 1/3 = 3/2 × 7/3 = 7/2 = 3 1/2. 자연수끼리, 분수끼리 따로 곱하면 안 돼요 — 1 × 2와 1/2 × 1/3만 곱하면 2 1/6 — 틀린 답이에요. **약분은 가분수로 바꾼 다음에** 해요.',
    rule: '대분수를 가분수로 바꾼 다음 곱해요 — 약분도 바꾼 다음에.',
    slip: '자연수끼리·분수끼리 따로 곱하지 않았는지 봐요.',
    calc(r, c) {
      const fams = [];
      const wrongVals = (w1, n1, d1, w2, n2, d2) => {
        const W1 = w1 * d1 + n1; const W2 = w2 * d2 + n2;
        return { ans: [W1 * W2, d1 * d2], split: [w1 * w2 * d1 * d2 + n1 * n2, d1 * d2], bad: [(w1 + n1) * (w2 + n2), d1 * d2], add: [W1 * d2 + W2 * d1, d1 * d2] };
      };
      const early = (w1, n1, d1, w2, n2, d2) => {
        const g1 = gcd(d1, n2); const g2 = gcd(n1, d2);
        const D1 = d1 / g1; const N2 = n2 / g1; const N1 = n1 / g2; const D2 = d2 / g2;
        return { v: [(w1 * D1 + N1) * (w2 * D2 + N2), D1 * D2], D1, D2 };
      };
      const pick = (needEarly) => draw(() => [int(r, 1, 2), int(r, 1, 5), int(r, 2, 6), int(r, 1, 2), int(r, 1, 5), int(r, 2, 6)], ([w1, n1, d1, w2, n2, d2]) => {
        if (!(n1 < d1 && n2 < d2 && coprime(n1, d1) && coprime(n2, d2))) return false;
        const v = wrongVals(w1, n1, d1, w2, n2, d2);
        const can = gcd(d1, n2) > 1 || gcd(n1, d2) > 1;
        if (!needEarly) return !can && distinct(v.ans, v.split, v.bad, v.add);
        const e = early(w1, n1, d1, w2, n2, d2);
        return can && e.D1 > 1 && e.D2 > 1 && distinct(v.ans, v.split, v.bad, v.add, e.v);
      });
      const wrongs = (w1, n1, d1, w2, n2, d2, withEarly) => {
        const v = wrongVals(w1, n1, d1, w2, n2, d2);
        const list = [{ text: V(...v.split), tag: TAGS.splitMul }, { text: V(...v.bad), tag: TAGS.badImproper }, { text: V(...v.add), tag: TAGS.addInstead }];
        if (withEarly) list.splice(1, 0, { text: V(...early(w1, n1, d1, w2, n2, d2).v), tag: TAGS.earlyCancel });
        return list;
      };
      const whys = (w1, n1, d1, w2, n2, d2) => ({
        [TAGS.splitMul]: `자연수끼리, 분수끼리 따로 곱하면 안 돼요 — 가분수로 바꿔서 ${w1 * d1 + n1}/${d1} × ${w2 * d2 + n2}/${d2}.`,
        [TAGS.badImproper]: `${MX(w1, n1, d1)} = (${w1} × ${d1} + ${n1})/${d1} = ${w1 * d1 + n1}/${d1} — 자연수에 분모를 곱해요.`,
        [TAGS.addInstead]: '곱셈이에요 — 두 수를 더하지 않아요.',
        [TAGS.earlyCancel]: '약분은 가분수로 바꾼 다음에 — 대분수 그대로 분수 부분끼리 약분하면 값이 달라져요.',
      });
      const steps = (w1, n1, d1, w2, n2, d2) => {
        const W1 = w1 * d1 + n1; const W2 = w2 * d2 + n2;
        return [`가분수로 — ${MX(w1, n1, d1)} = ${W1}/${d1}, ${MX(w2, n2, d2)} = ${W2}/${d2}`, `${W1}/${d1} × ${W2}/${d2} = ${chain(W1 * W2, d1 * d2)}`];
      };
      fams.push(famOf([(() => {
        const p = pick(false);
        return { t: calcQ(`${MX(p[0], p[1], p[2])} × ${MX(p[3], p[4], p[5])}`), ans: V(...wrongVals(...p).ans), wr: wrongs(...p, false), steps: steps(...p), why: whys(...p), probe: { ask: 'calc' } };
      })()]));
      fams.push(famOf([(() => {
        const p = pick(true);
        return { t: calcQ(`${MX(p[0], p[1], p[2])} × ${MX(p[3], p[4], p[5])}`), ans: V(...wrongVals(...p).ans), wr: wrongs(...p, true), steps: steps(...p), why: whys(...p), probe: { ask: 'calc' } };
      })()]));
      fams.push(famOf([(() => {
        const p = pick(false);
        return { t: `1 m의 무게가 ${MX(p[0], p[1], p[2])} kg인 철근이 있어요. 이 철근 ${MX(p[3], p[4], p[5])} m의 무게는 몇 kg일까요?`, ans: V(...wrongVals(...p).ans), wr: wrongs(...p, false), steps: steps(...p), why: whys(...p), probe: { ask: 'story' } };
      })()]));
      return askFam(r, c, this, fams);
    },
    misread(r, c) {
      if (branchOf(r, c, ['split', 'early']) === 'split') {
        const [w1, n1, d1, w2, n2, d2] = draw(() => [int(r, 1, 2), int(r, 1, 4), int(r, 2, 5), int(r, 1, 3), int(r, 1, 4), int(r, 2, 5)], ([a, b, cc, d, e, f]) => b < cc && e < f && coprime(b, cc) && coprime(e, f)
          && distinct([(a * cc + b) * (d * f + e), cc * f], [a * d * cc * f + b * e, cc * f], [(a + b) * (d + e), cc * f]));
        const W1 = w1 * d1 + n1; const W2 = w2 * d2 + n2; const ans = V(W1 * W2, d1 * d2);
        return misAsk(r, c, this, 'split', {
          q: `곱셈을 계산해요.\n\n${showWork(`${MX(w1, n1, d1)} × ${MX(w2, n2, d2)} = ${V(w1 * w2 * d1 * d2 + n1 * n2, d1 * d2)}`)}`,
          ok: `가분수로 바꿔 곱해요 — ${W1}/${d1} × ${W2}/${d2} = ${ans}`,
          wr: [{ text: '맞게 말했어요', tag: RIGHT_AS_WRONG }, { text: `가분수로 바꿀 때 자연수와 분자만 더해서 ${V((w1 + n1) * (w2 + n2), d1 * d2)}`, tag: TAGS.badImproper }, { text: '대분수끼리는 곱할 수 없어요', tag: OFF }],
          steps: [`${MX(w1, n1, d1)} = ${W1}/${d1}, ${MX(w2, n2, d2)} = ${W2}/${d2}`, `${W1}/${d1} × ${W2}/${d2} = ${chain(W1 * W2, d1 * d2)}`],
          whyAny: '자연수끼리, 분수끼리 따로 곱했어요. 대분수는 가분수로 바꾼 다음 곱해요.',
          probe: { ask: 'split', w1, n1, d1, w2, n2, d2 },
        });
      }
      // 가분수로 바꾸기 전에 분수 부분끼리 엇갈려 약분 (미래엔 5-2 지도서 160쪽의 오류)
      const [w1, n1, d1, w2, n2, d2] = draw(() => [int(r, 1, 3), int(r, 1, 5), int(r, 2, 6), int(r, 1, 3), int(r, 1, 5), int(r, 2, 6)], ([a, b, cc, d, e, f]) => {
        if (!(b < cc && e < f && coprime(b, cc) && coprime(e, f) && (gcd(cc, e) > 1 || gcd(b, f) > 1))) return false;
        const g1 = gcd(cc, e); const g2 = gcd(b, f);
        const D1 = cc / g1; const D2 = f / g2;
        return D1 > 1 && D2 > 1 && distinct([(a * cc + b) * (d * f + e), cc * f], [(a * D1 + b / g2) * (d * D2 + e / g1), D1 * D2], [a * d * cc * f + b * e, cc * f]);
      });
      const W1 = w1 * d1 + n1; const W2 = w2 * d2 + n2; const ans = V(W1 * W2, d1 * d2);
      const g1 = gcd(d1, n2); const g2 = gcd(n1, d2);
      const [D1, N2, N1, D2] = [d1 / g1, n2 / g1, n1 / g2, d2 / g2];
      return misAsk(r, c, this, 'early', {
        q: `곱셈을 계산해요.\n\n${showWork(`${MX(w1, n1, d1)} × ${MX(w2, n2, d2)} = ${MX(w1, N1, D1)} × ${MX(w2, N2, D2)} = ${V((w1 * D1 + N1) * (w2 * D2 + N2), D1 * D2)}`)}`,
        ok: `가분수로 바꾼 다음 약분해요 — ${W1}/${d1} × ${W2}/${d2} = ${ans}`,
        wr: [{ text: '맞게 말했어요', tag: RIGHT_AS_WRONG }, { text: `자연수끼리, 분수끼리 곱해서 ${V(w1 * w2 * d1 * d2 + n1 * n2, d1 * d2)}`, tag: TAGS.splitMul }, { text: '대분수끼리는 곱할 수 없어요', tag: OFF }],
        steps: [`${MX(w1, n1, d1)} = ${W1}/${d1}, ${MX(w2, n2, d2)} = ${W2}/${d2}`, `${W1}/${d1} × ${W2}/${d2} = ${chain(W1 * W2, d1 * d2)}`],
        whyAny: '대분수 그대로 분수 부분끼리 약분했어요. 약분은 가분수로 바꾼 다음에 해요.',
        probe: { ask: 'early', w1, n1, d1, w2, n2, d2 },
      });
    },
  },

  {
    id: 'fmul.three', grade: 5, name: '세 분수의 곱셈', needs: ['fmul.mixed'],
    idea: '세 분수의 곱셈은 **앞에서부터 두 개씩** 곱하거나, **한꺼번에** 분자끼리·분모끼리 곱해요. 1/2 × 2/3 × 3/4 — 앞에서부터: 1/2 × 2/3 = 1/3, 1/3 × 3/4 = 1/4. 한꺼번에: 분자 1 × 2 × 3 = 6, 분모 2 × 3 × 4 = 24 → 6/24 = 1/4. 약분은 한꺼번에 하면 편해요.',
    rule: '세 분수도 분자끼리, 분모끼리 — 앞에서부터 두 개씩 또는 한꺼번에.',
    slip: '세 분수를 모두 곱했는지 봐요.',
    calc(r, c) {
      const fams = [];
      const pick3 = (cancel) => draw(() => [int(r, 1, 6), int(r, 2, 7), int(r, 1, 6), int(r, 2, 7), int(r, 1, 6), int(r, 2, 7)], ([a, b, cc, d, e, f]) => a < b && cc < d && e < f && coprime(a, b) && coprime(cc, d) && coprime(e, f)
        && (cancel ? gcd(a * cc * e, b * d * f) > 1 : coprime(a * cc * e, b * d * f))
        && distinct([a * cc * e, b * d * f], [a * cc, b * d], [a * cc * e, b + d + f], [a + cc + e, b + d + f]));
      const wrongs = (a, b, cc, d, e, f) => [{ text: V(a * cc, b * d), tag: TAGS.dropThird }, { text: V(a * cc * e, b + d + f), tag: TAGS.denSum }, { text: V(a + cc + e, b + d + f), tag: TAGS.allSum }];
      const whys = (a, b, cc, d, e, f) => ({
        [TAGS.dropThird]: `세 번째 분수 ${e}/${f}까지 곱해요.`,
        [TAGS.denSum]: `분모끼리 더하지 않고 곱해요 — ${b} × ${d} × ${f} = ${b * d * f}`,
        [TAGS.allSum]: '더하지 않고 곱해요 — 분자끼리, 분모끼리.',
      });
      const steps = (a, b, cc, d, e, f) => {
        const [p, q] = red(a * cc, b * d);
        return [`앞에서부터 — ${a}/${b} × ${cc}/${d} = ${chain(a * cc, b * d)}`, `${p}/${q} × ${e}/${f} = ${chain(p * e, q * f)}`];
      };
      fams.push(famOf([(() => { const p = pick3(false); return { t: calcQ(`${p[0]}/${p[1]} × ${p[2]}/${p[3]} × ${p[4]}/${p[5]}`), ans: V(p[0] * p[2] * p[4], p[1] * p[3] * p[5]), wr: wrongs(...p), steps: steps(...p), why: whys(...p), probe: { ask: 'calc' } }; })()]));
      fams.push(famOf([(() => { const p = pick3(true); return { t: calcQ(`${p[0]}/${p[1]} × ${p[2]}/${p[3]} × ${p[4]}/${p[5]}`), ans: V(p[0] * p[2] * p[4], p[1] * p[3] * p[5]), wr: wrongs(...p), steps: steps(...p), why: whys(...p), probe: { ask: 'calc' } }; })()]));
      fams.push(famOf([(() => {
        const p = pick3(true);
        return { t: `우유 ${p[0]}/${p[1]} L 중 ${p[2]}/${p[3]}만큼을 컵에 따랐어요. 컵에 있는 우유 중 ${p[4]}/${p[5]}만큼을 마셨다면 마신 우유는 몇 L일까요?`, ans: V(p[0] * p[2] * p[4], p[1] * p[3] * p[5]), wr: wrongs(...p), steps: steps(...p), why: whys(...p), probe: { ask: 'story' } };
      })()]));
      return askFam(r, c, this, fams);
    },
    misread(r, c) {
      const [a, b, cc, d, e, f] = draw(() => [int(r, 1, 4), int(r, 2, 5), int(r, 1, 4), int(r, 2, 5), int(r, 1, 4), int(r, 2, 5)], ([a1, b1, c1, d1, e1, f1]) => a1 < b1 && c1 < d1 && e1 < f1 && coprime(a1, b1) && coprime(c1, d1) && coprime(e1, f1)
        && distinct([a1 * c1 * e1, b1 * d1 * f1], [a1 * c1, b1 * d1], [a1 * c1 * e1, b1 + d1 + f1]));
      const ans = V(a * cc * e, b * d * f);
      if (branchOf(r, c, ['two', 'den']) === 'two') {
        return misAsk(r, c, this, 'two', {
          q: `곱셈을 계산해요.\n\n${showWork(`${a}/${b} × ${cc}/${d} × ${e}/${f} = ${V(a * cc, b * d)}`)}`,
          ok: `세 분수를 모두 곱해요 — ${a}/${b} × ${cc}/${d} × ${e}/${f} = ${ans}`,
          wr: [{ text: '맞게 말했어요', tag: RIGHT_AS_WRONG }, { text: `분모끼리 더해서 ${V(a * cc * e, b + d + f)}`, tag: TAGS.denSum }, { text: '분수 세 개는 한꺼번에 곱할 수 없어요', tag: OFF }],
          steps: [`분자 ${a} × ${cc} × ${e} = ${a * cc * e}, 분모 ${b} × ${d} × ${f} = ${b * d * f}`, `${chain(a * cc * e, b * d * f)}`],
          whyAny: '앞의 두 분수만 곱했어요. 세 번째 분수까지 곱해요.',
          probe: { ask: 'two', a, b, cc, d, e, f },
        });
      }
      return misAsk(r, c, this, 'den', {
        q: `곱셈을 계산해요.\n\n${showWork(`${a}/${b} × ${cc}/${d} × ${e}/${f} = ${V(a * cc * e, b + d + f)}`)}`,
        ok: `분모끼리도 곱해요 — ${a}/${b} × ${cc}/${d} × ${e}/${f} = ${ans}`,
        wr: [{ text: '맞게 말했어요', tag: RIGHT_AS_WRONG }, { text: `앞의 두 분수만 곱해서 ${V(a * cc, b * d)}`, tag: TAGS.dropThird }, { text: '분수 세 개는 한꺼번에 곱할 수 없어요', tag: OFF }],
        steps: [`분자 ${a} × ${cc} × ${e} = ${a * cc * e}, 분모 ${b} × ${d} × ${f} = ${b * d * f}`, `${chain(a * cc * e, b * d * f)}`],
        whyAny: '분모끼리 더했어요. 분모도 분모끼리 곱해요.',
        probe: { ask: 'den', a, b, cc, d, e, f },
      });
    },
  },

  {
    id: 'fmul.apply', grade: 5, name: '⭐ 분수의 곱셈 활용', needs: ['fmul.three'],
    idea: '**"얼마 중 몇 분의 몇만큼"은 곱셈**이에요 — 우유 4/5 L 중 3/4만큼을 마셨으면 마신 양은 4/5 × 3/4 = 3/5 — 단위는 L. **직사각형 넓이**도 가로 × 세로 — 가로 2 1/2 m, 세로 1 3/5 m인 땅은 5/2 × 8/5 = 4 — 넓이 4 m². 그리고 **1보다 작은 수를 곱하면 곱은 처음 수보다 작아지고**, 1보다 큰 수를 곱하면 커져요 — 곱한다고 늘 커지는 것은 아니에요.',
    rule: '"얼마 중 몇 분의 몇만큼"은 곱셈 — 1보다 작은 수를 곱하면 작아져요.',
    slip: '무엇의 몇 분의 몇인지, 넓이는 가로 × 세로인지 봐요.',
    calc(r, c) {
      const fams = [];
      fams.push(famOf([(() => {
        const [a, b, cc, d] = draw(() => [int(r, 1, 8), int(r, 2, 9), int(r, 1, 8), int(r, 2, 9)], ([a1, b1, c1, d1]) => a1 < b1 && c1 < d1 && coprime(a1, b1) && coprime(c1, d1) && b1 !== d1
          && distinct([a1 * c1, b1 * d1], [a1 * d1 + c1 * b1, b1 * d1], [a1 * (d1 - c1), b1 * d1], [a1 + c1, b1 + d1]));
        return {
          t: `{mon/은/는} 주스 ${a}/${b} L 중 ${cc}/${d}만큼을 마셨어요. 마신 주스는 몇 L일까요?`, ans: V(a * cc, b * d),
          wr: [{ text: V(a * d + cc * b, b * d), tag: TAGS.addInstead }, { text: V(a * (d - cc), b * d), tag: TAGS.leftOver }, { text: V(a + cc, b + d), tag: TAGS.allSum }],
          steps: [`${a}/${b} L 중 ${cc}/${d}만큼 — ${a}/${b} × ${cc}/${d}`, `${a}/${b} × ${cc}/${d} = ${chain(a * cc, b * d)}`],
          why: { [TAGS.addInstead]: '"얼마 중 몇 분의 몇만큼"은 곱셈이에요 — 더하지 않아요.', [TAGS.leftOver]: `마시고 남은 양을 구했어요 — 마신 양은 ${a}/${b} × ${cc}/${d}.`, [TAGS.allSum]: '더하지 않고 곱해요 — 분자끼리, 분모끼리.' },
          probe: { ask: 'of' }, rule: '"얼마 중 몇 분의 몇만큼"은 곱셈이에요.',
        };
      })()]));
      fams.push(famOf([(() => {
        const [w1, n1, d1, w2, n2, d2] = draw(() => [int(r, 1, 3), int(r, 1, 5), int(r, 2, 6), int(r, 1, 3), int(r, 1, 5), int(r, 2, 6)], ([a, b, cc, d, e, f]) => b < cc && e < f && coprime(b, cc) && coprime(e, f)
          && distinct([(a * cc + b) * (d * f + e), cc * f], [a * d * cc * f + b * e, cc * f], [(a * cc + b) * f + (d * f + e) * cc, cc * f], [(a + b) * (d + e), cc * f]));
        const W1 = w1 * d1 + n1; const W2 = w2 * d2 + n2;
        return {
          t: `가로가 ${MX(w1, n1, d1)} m, 세로가 ${MX(w2, n2, d2)} m인 직사각형 모양의 땅이 있어요. 이 땅의 넓이는 몇 m²일까요?`, ans: V(W1 * W2, d1 * d2),
          wr: [{ text: V(w1 * w2 * d1 * d2 + n1 * n2, d1 * d2), tag: TAGS.splitMul }, { text: V(W1 * d2 + W2 * d1, d1 * d2), tag: TAGS.addInstead }, { text: V((w1 + n1) * (w2 + n2), d1 * d2), tag: TAGS.badImproper }],
          steps: [`넓이 = 가로 × 세로 — 가분수로 ${W1}/${d1} × ${W2}/${d2}`, `${W1}/${d1} × ${W2}/${d2} = ${chain(W1 * W2, d1 * d2)}`],
          why: { [TAGS.splitMul]: '자연수끼리, 분수끼리 따로 곱하면 안 돼요 — 가분수로 바꿔 곱해요.', [TAGS.addInstead]: '넓이는 가로 × 세로 — 더하지 않아요.', [TAGS.badImproper]: '가분수로 바꿀 때 자연수 × 분모 + 분자예요.' },
          probe: { ask: 'land' }, rule: '직사각형의 넓이 = 가로 × 세로 — 대분수는 가분수로 바꿔 곱해요.',
        };
      })()]));
      fams.push(famOf([(() => {
        const [k, p, q, w, n, dd, X, Y] = draw(() => [int(r, 2, 9), int(r, 1, 5), int(r, 2, 7), 1, int(r, 1, 4), int(r, 2, 5), int(r, 4, 9), int(r, 2, 5)], ([, p1, q1, , n1, d1, X1, Y1]) => p1 < q1 && coprime(p1, q1) && n1 < d1 && coprime(n1, d1) && X1 > Y1 && coprime(X1, Y1) && X1 % Y1 !== 0);
        return {
          t: `계산하지 않고 고르려고 해요. 곱이 ${k}보다 작은 것은 어느 것일까요?`, text: true, ans: `${k} × ${p}/${q}`,
          wr: [{ text: `${k} × ${MX(w, n, dd)}`, tag: TAGS.fracSmall }, { text: `${k} × ${X}/${Y}`, tag: TAGS.fracSmall }],
          steps: ['1보다 작은 수를 곱하면 처음 수보다 작아져요', `${p}/${q} — 1보다 작아요 → ${k} × ${p}/${q}`],
          why: { [TAGS.fracSmall]: '분수라도 1보다 크면(대분수·가분수) 곱이 처음 수보다 커져요.' },
          probe: { ask: 'smaller', k }, rule: '1보다 작은 수를 곱하면 작아지고, 1보다 큰 수를 곱하면 커져요.',
        };
      })()]));
      return askFam(r, c, this, fams);
    },
    misread(r, c) {
      if (branchOf(r, c, ['big', 'left']) === 'big') {
        const [N, p, q] = draw(() => [int(r, 3, 9), int(r, 1, 5), int(r, 2, 7)], ([N1, p1, q1]) => p1 < q1 && coprime(p1, q1) && distinct([N1 * p1, q1], [N1 * q1 + p1, q1]));
        return misAsk(r, c, this, 'big', {
          q: `곱셈 ${N} × ${p}/${q} — 곱을 어림해요.\n\n${showWork(`곱하면 늘 커지니까 곱은 ${N}보다 커요`)}`,
          ok: `1보다 작은 수를 곱하면 작아져요 — ${N} × ${p}/${q} = ${V(N * p, q)}`,
          wr: [{ text: '맞게 말했어요', tag: RIGHT_AS_WRONG }, { text: `곱하지 않고 더해서 ${V(N * q + p, q)}`, tag: TAGS.addInstead }, { text: '분수를 곱한 값은 어림할 수 없어요', tag: OFF }],
          steps: [`${p}/${q} — 1보다 작아요`, `${N} × ${p}/${q} = ${chain(N * p, q)} — ${N}보다 작아요`],
          whyAny: '곱한다고 늘 커지는 것은 아니에요. 1보다 작은 수를 곱하면 처음 수보다 작아져요.',
          probe: { ask: 'big', N, p, q },
        });
      }
      const [a, b, cc, d] = draw(() => [int(r, 1, 6), int(r, 2, 7), int(r, 1, 6), int(r, 2, 7)], ([a1, b1, c1, d1]) => a1 < b1 && c1 < d1 && coprime(a1, b1) && coprime(c1, d1) && b1 !== d1
        && distinct([a1 * c1, b1 * d1], [a1 * (d1 - c1), b1 * d1], [a1 * d1 + c1 * b1, b1 * d1]));
      return misAsk(r, c, this, 'left', {
        q: `{mon/은/는} 주스 ${a}/${b} L 중 ${cc}/${d}만큼을 마셨어요. 마신 주스는 몇 L일까요?\n\n${showWork(`${a}/${b} × ${d - cc}/${d} = ${V(a * (d - cc), b * d)}`, '구했어요')}`,
        ok: `마신 양은 ${a}/${b} × ${cc}/${d} = ${V(a * cc, b * d)}`,
        wr: [{ text: '맞게 말했어요', tag: RIGHT_AS_WRONG }, { text: `두 양을 더해서 ${V(a * d + cc * b, b * d)}`, tag: TAGS.addInstead }, { text: '분수만큼의 양은 구할 수 없어요', tag: OFF }],
        steps: [`마신 양 = ${a}/${b} × ${cc}/${d}`, `${a}/${b} × ${cc}/${d} = ${chain(a * cc, b * d)}`],
        whyAny: '마시고 남은 양을 구했어요. 묻는 것은 마신 양 — 마신 만큼을 곱해요.',
        probe: { ask: 'left', a, b, cc, d },
      });
    },
  },
];

export function conceptById(id) {
  return FMUL.find((c) => c.id === id) || null;
}

// ───────────────────── 문항 만들기 (mathfdiv와 같은 모양) ─────────────────────

const SLIP = '한 번 더 천천히 — 분자끼리, 분모끼리 곱했는지 확인해요.';
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
  return diagnosticOf(FMUL, makeQuestion, seed, n, opts);
}
export function placeFrom(answers) {
  return placeFromOf(FMUL, answers);
}
export function ladder(doneIds) {
  return ladderOf(FMUL, doneIds);
}

// ───────────────────── 사람이 쓴 내용 검사 (check.mjs가 부른다) ─────────────────────

function badPlaceholders(txt) {
  const leak = String(txt || '').match(/\{[^}]*\}/g) || [];
  return leak.filter((l) => !/^\{(me|mon|mon2)(\/[^/}]+\/[^}]+)?\}$/.test(l));
}

/**
 * coach/math/fracmul.json 형식 검사 — mathfdiv.checkContent와 같은 규칙 (값은 분수·대분수까지 읽는다)
 * @returns {string[]}
 */
export function checkContent(content) {
  const bad = [];
  for (const c of FMUL) {
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
