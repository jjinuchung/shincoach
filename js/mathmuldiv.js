// ✖️➗ 수학 — AA 곱셈과 나눗셈 줄기 (초4 「곱셈과 나눗셈」 4-1): 개념 사다리 + 문제 생성기 + 내용 형식 검사.
// 순수 함수만 — 화면 없음 (node 테스트에서 그대로 돈다).
//
// 왜 이 줄기인가 (2026-10-08, 아버님 "그다음 줄기는 AA 곱셈과 나눗셈 시작하자" → 칸별 설계안 "이대로 진행하자"):
//   4-1 네 단원 중 셋째 — 큰 수(Y)의 곱셈·나눗셈. (세 자리)×(두 자리)와 나누는 수가 두 자리인 나눗셈이 처음 나온다.
//   B 혼합계산·소수의 곱셈·나눗셈(W·X)의 자연수 셈이 여기서 굳는다.
//   (아이 기록의 수치·칸별 진단은 공개 코드에 적지 않는다 — Codex 36~41차, 기록은 비공개 저장소에만)
// 칸 범위: 2022 천재 4-1 지도서 3단원(148~197쪽) 차시 순서 — (세 자리)×(몇십) → (세 자리)×(두 자리) → (두 자리)÷(두 자리)
//   → (세 자리)÷(몇십) → ÷(두 자리) 몫 한 자리 → 몫 두 자리 · 어림은 차시마다 첫 활동 · 2022 [4수01-04] [4수01-05] [4수01-07] [4수01-08]
//   · 곱은 다섯 자리까지 · 나누어지는 수는 세 자리, 몫은 두 자리까지 · (몇백)×(몇십)은 어림에서만
//   · 나머지는 "남는 것"으로만 — 상자 하나 더(올림 해석)는 없다 · "반올림"이라는 말은 쓰지 않는다("…쯤으로 생각하면")
//   · 어림한 값은 답이 하나가 아니다(지도서) → 어림 칸은 어림할 수를 정해 주고 그 계산만 묻거나 몫의 자리 수를 고른다
// 답의 꼴: 곱·나누어떨어지는 몫은 수("9"), 나머지가 있으면 교과서처럼 "몫 … 나머지"("4 … 5") — 숫자판에 [몫 … 나머지] 두 칸.
//   나머지가 0인 답을 "9 … 0"으로 쳐도 맞음(mathpad).
// 오답은 지도서가 꼽은 흔한 오류 그대로:
//   230 × 50 = 1150(몇을 곱한 결과가 0으로 끝날 때 0을 하나만) · ×몇십을 일의 자리부터 채움 · 726 × 53 = 2178 + 3630(부분곱 자리)
//   · 어림한 몫이 커서 곱이 나누어지는 수보다 큰데 그대로 · 나머지가 나누는 수보다 큼(689 ÷ 78 = 7 … 143) · 나머지 = 나누는 수(162 ÷ 18 = 8 … 18)
//   · (몇백몇십) ÷ (몇십)의 몫을 십의 자리에 씀(180 ÷ 30 = 60) · 몫의 일의 자리 0을 빠뜨림(873 ÷ 43 = 2 … 13)
//
// 새 줄기의 함정(메모 stem-generator-pitfalls)을 처음부터:
//   · 가족 = 틀 여러 개 — 🔁 쌍둥이가 요청한 틀(tplKey)로 온다 · ② 갈래마다 key · 틀마다 수의 꼴(나머지 있음/없음)을 고정
//   · 수 뒤 조사는 jfix가 끝자리 소리로 고친다 · 수가 답인 ①은 숫자판 · 고르는 ①은 "어느 것" 말투
//   · 오답끼리·정답과 같은 값은 뽑지 않는다(clean → probe.allWrong) · 틀린 셈이 우연히 바른 값을 내면 그 오답은 버린다
//   · 채우는 근처 수는 몫은 그대로 두고 나머지만 조금 다르게(나머지 < 나누는 수) — 오개념 모양과 안 겹치게
// ★ 정답·오답은 테스트가 **문제 글을 따로 읽어** 다시 푼다 (tests/mathmuldiv.test.js).

import { rng, castOf, fill, int, pick, shuffle, ask, solve, humanQuestion, checkHuman, diagnosticOf, placeFromOf, ladderOf } from './mathgen.js';
import { gradeLabel } from './mathmix.js';
import { _kit } from './mathexpr.js';

export { gradeLabel };

const { famOf, runFamily, misAsk, textChoices, jfix, branchOf, showWork, step, RIGHT_AS_WRONG, OFF } = _kit;

// ───────────────────── 수 — "몫 … 나머지" ─────────────────────

/** 답 글: 나머지가 있으면 "4 … 5", 없으면 "9" */
export const RT = (q, r) => (r ? `${q} … ${r}` : String(q));
/** 답 글 → { q, r } (수 "9"는 나머지 0) — 못 읽으면 null */
export function remOf(t) {
  const m = /^(\d+)(?: … (\d+))?$/.exec(String(t == null ? '' : t).trim());
  return m ? { q: +m[1], r: m[2] ? +m[2] : 0 } : null;
}
const sameR = (a, b) => !!(a && b && a.q === b.q && a.r === b.r);
const divmod = (a, b) => ({ q: Math.floor(a / b), r: a % b });
const digitsOf = (n) => String(n).split('').map(Number);
/** 받아올림을 버린 곱 (곱하는 수 한 자리) — 맨 앞자리 곱은 그대로, 나머지 자리 곱은 일의 자리만 (소수의 곱셈 W와 같은 셈) */
export function noCarryMul(a, d) {
  const ds = digitsOf(a);
  return +ds.map((x, i) => (i === 0 ? String(x * d) : String((x * d) % 10))).join('');
}
const hasCarry = (a, d) => digitsOf(a).slice(1).some((x) => x * d >= 10);
const roundTo = (n, u) => Math.round(n / u) * u;
/** 조건에 맞을 때까지 다시 뽑기 */
function draw(gen, ok) {
  for (let k = 0; k < 6000; k++) { const v = gen(); if (ok(v)) return v; }
  throw new Error('draw: 조건에 맞는 수를 못 뽑음');
}

// ───────────────────── 오답 정리·보기 ─────────────────────

const W = (text, tag) => ({ text, tag });
/**
 * 오답 후보 정리 — 빈 글자·못 읽는 글·몫 0·정답과 같은 값·앞의 오답과 같은 값은 버린다 (probe.allWrong이 곧 이 목록)
 * 한 값이 서로 다른 두 틀린 생각에서 다 나오면(242 × 19: 242 × 9 + 242 = 2420 = 242 × 10) 그 값은 진단이 안 된다 — 둘 다 버린다
 */
function clean(ans, list) {
  const A = remOf(ans); const out = [];
  const ok = list.filter((w) => w && w.text && remOf(w.text) && remOf(w.text).q >= 1 && !sameR(remOf(w.text), A));
  for (const w of ok) {
    const v = remOf(w.text);
    if (ok.some((o) => o.tag !== w.tag && sameR(remOf(o.text), v))) continue;
    if (out.some((o) => sameR(remOf(o.text), v))) continue;
    out.push(w);
  }
  return out;
}
const SLIP_TAG = '계산 실수';
/** 곱의 근처 수 — 한 자리 숫자를 잘못 쓴 꼴 (10·100씩) */
const nearMul = (n) => [n + 10, n - 10, n + 100, n - 100, n + 1000, n - 1000].filter((x) => x > 0).map(String);
/** 나눗셈 근처 — 몫은 그대로, 나머지만 뺄셈 실수로 조금 다르게 (나머지는 1 이상 · 나누는 수보다 작게 — 오개념 모양과 안 겹친다) */
const nearDiv = (q, r, b) => [r + 1, r - 1, r + 2, r - 2, r + 10, r - 10].filter((x) => x >= 1 && x < b).map((x) => RT(q, x));
/** 보기 4개 — 정답 + 오개념 오답 + (모자라면) 근처 수. 글자·값이 같은 보기는 넣지 않는다 */
function mchoices(r, ans, wrongs, near) {
  const list = [{ text: ans, ok: true }];
  const has = (t) => list.some((x) => x.text === t || sameR(remOf(x.text), remOf(t)));
  for (const w of wrongs) if (list.length < 4 && !has(w.text)) list.push({ text: w.text, ok: false, tag: w.tag });
  for (const t of near || []) if (list.length < 4 && remOf(t) && !has(t)) list.push({ text: t, ok: false, tag: SLIP_TAG });
  return shuffle(r, list);
}
/** 고른 틀로 ① 문항 — v: { t, ans, wr, near, steps, why, whyAny, rule, words(말 보기), probe } */
function mdAsk(r, c, concept, v) {
  const F = (t) => jfix(fill(t, c));
  const chs = v.words ? textChoices(r, v.ans, v.wr) : mchoices(r, v.ans, v.wr, v.near);
  const why = Object.fromEntries(Object.entries(v.why || {}).map(([k, t]) => [k, F(t)]));
  return {
    ...ask(concept.id, 'calc', F(v.t), chs, { solve: solve(v.steps.map((s, i) => step(i, F(s))), { why, whyAny: F(v.whyAny || ''), rule: v.rule || concept.rule }) }),
    probe: { ...(v.probe || {}), allWrong: v.words ? [] : v.wr.map((w) => ({ text: String(w.text), tag: w.tag })) },
  };
}
const askFam = (r, c, concept, fams) => mdAsk(r, c, concept, runFamily(r, c, fams));

const CALC = '다음을 계산하면 얼마일까요?';
const calcQ = (e) => `${CALC}\n\n**${e}**`;
const WORK = (line) => showWork(line, '계산했어요');
const RIGHT = { text: '맞게 계산했어요', tag: RIGHT_AS_WRONG };
/** ② 세로셈 그림을 보여 주는 문항 */
const FIG_WORK = (fig) => `{mon/이/가} 세로셈으로 이렇게 계산했어요.\n\n${fig}\n\n어디가 틀렸을까요?`;

/** 이 줄기의 오개념 이름표 (📊·🤔 노트·결과 카드에 그대로 뜬다) — 이름표 하나에 셈 하나 · 다른 줄기와 같은 생각은 같은 말 */
export const TAGS = {
  zeroDrop: '몇십을 곱할 때 0을 빠뜨림',
  zeroExtra: '0을 하나 더 붙임',
  noCarry: '받아올림을 빠뜨림',
  partShift: '부분곱의 자리를 잘못 씀',
  partDrop: '부분곱 하나를 빠뜨림',
  overEst: '어림한 몫이 큰데 그대로 둠',
  remBig: '나머지가 나누는 수보다 큼',
  remEq: '나머지가 나누는 수와 같음',
  quotTens: '몫을 십의 자리에 씀',
  dropOnes: '몫의 일의 자리를 빠뜨림',
  frontOnly: '나누는 수와 맨 앞 숫자만 비교함',
  divForMul: '곱해야 할 것을 나눔',
  mulForDiv: '나눠야 할 것을 곱함',
  quotForRem: '나머지 대신 몫을 답함',
  oneStep: '한 단계만 계산함',
  subAsAdd: '빼야 할 것을 더함',
};

// ───────────────────── 틀린 셈 (아이가 실제로 하는 계산을 그대로) ─────────────────────

/** ×몇십 (a × 10d) 오답 */
function wrongTens(a, d) {
  const ans = a * d * 10;
  return clean(String(ans), [
    W(String(a * d), TAGS.zeroDrop),
    W(hasCarry(a, d) ? String(noCarryMul(a, d) * 10) : '', TAGS.noCarry),
    W(String(ans * 10), TAGS.zeroExtra),
  ]);
}
/** ×(두 자리) (a × (10t + u)) 오답 — 덜 옮김 · 받아올림 · 부분곱 하나 · 더 옮김 */
function wrongTwo(a, b) {
  const t = Math.floor(b / 10); const u = b % 10; const ans = a * b;
  const nc = noCarryMul(a, u) + noCarryMul(a, t) * 10;
  return clean(String(ans), [
    W(String(a * u + a * t), TAGS.partShift),
    W(nc !== ans ? String(nc) : '', TAGS.noCarry),
    W(String(a * u), TAGS.partDrop),
    W(String(a * t * 10), TAGS.partDrop),
    W(String(a * u + a * t * 100), TAGS.partShift),
  ]);
}
/** 나눗셈 오답 — 어림한 몫이 커서 거꾸로 뺌 · 몫을 1 작게(나머지 ≥ 나누는 수) · (몇백몇십) ÷ (몇십) 몫 자리 · 몫 두 자리의 일의 자리 */
function wrongDiv(a, b, o = {}) {
  const { q, r } = divmod(a, b);
  const t = Math.floor(q / 10);
  return clean(RT(q, r), [
    W(o.tens && !r ? String(q * 10) : '', TAGS.quotTens),
    W(q >= 10 ? RT(t, a - b * t * 10) : '', TAGS.dropOnes),
    W(q >= 2 ? RT(q - 1, r + b) : '', r ? TAGS.remBig : TAGS.remEq),
    W(o.noOver ? '' : RT(q + 1, b * (q + 1) - a), TAGS.overEst),
  ]);
}

/** 나눗셈 풀이 줄 — 몫 한 자리 */
function stepsOne(a, b) {
  const { q, r } = divmod(a, b);
  return [
    r ? `${b} × ${q} = ${b * q}는 ${a}보다 작고, ${b} × ${q + 1} = ${b * (q + 1)}은 ${a}보다 커요` : `${b} × ${q} = ${b * q} — 나누어지는 수 ${a}와 같아요`,
    r ? `${a} − ${b * q} = ${r} — ${r}은 ${b}보다 작아요` : `${a} − ${b * q} = 0 — 나누어떨어져요`,
    `${a} ÷ ${b} = ${RT(q, r)}`,
  ];
}
/** 나눗셈 풀이 줄 — 몫 두 자리 (십의 자리부터) */
function stepsTwo(a, b) {
  const { q, r } = divmod(a, b);
  const t = Math.floor(q / 10); const u = q % 10; const mid = a - b * t * 10;
  return [
    `${b} × ${t * 10} = ${b * t * 10} — ${a} − ${b * t * 10} = ${mid}`,
    u ? `${b} × ${u} = ${b * u} — ${mid} − ${b * u} = ${r}` : `${mid}은 ${b}보다 작아서 몫의 일의 자리는 0`,
    `${a} ÷ ${b} = ${RT(q, r)}`,
  ];
}
/** 나눗셈 오답 이유 — 이 문제의 수로 */
function whyDiv(a, b) {
  const { q, r } = divmod(a, b);
  const t = Math.floor(q / 10);
  return {
    [TAGS.overEst]: `${b} × ${q + 1} = ${b * (q + 1)}은 ${a}보다 커서 뺄 수 없어요 — 몫을 1 작게 ${q}로 해요.`,
    [TAGS.remBig]: `나머지가 나누는 수 ${b}보다 크면 ${b}를 한 번 더 뺄 수 있어요 — 몫을 1 크게 ${q}로 해요.`,
    [TAGS.remEq]: `나머지가 나누는 수 ${b}와 같으면 한 번 더 뺄 수 있어요 — 몫을 1 크게 ${q}로 해요.`,
    [TAGS.quotTens]: `${b} × ${q} = ${b * q}이니까 몫은 ${q}예요 — ${b} × ${q * 10} = ${b * q * 10}이에요. 몫은 일의 자리 위에 써요.`,
    [TAGS.dropOnes]: `${t}은 몫의 십의 자리예요 — ${b} × ${t * 10} = ${b * t * 10}을 빼고 남은 수도 마저 나눠요. 몫의 일의 자리를 비우지 않아요.`,
  };
}
const CHECK = (a, b) => { const { q, r } = divmod(a, b); return `확인: ${b} × ${q} = ${b * q}${r ? `, ${b * q} + ${r} = ${a}` : ''}`; };

// ───────────────────── 개념 사다리 (AA. 곱셈과 나눗셈 줄기) ─────────────────────

export const MULDIV = [
  {
    id: 'md.mul10s', grade: 4, name: '(세 자리 수) × (몇십)', needs: [],
    idea: '143 × 20 — 20은 2의 10배라서 143 × 20은 143 × 2 = 286의 10배 → **2860**. 세로셈으로 쓸 때는 286을 십의 자리부터 쓰고 일의 자리에 0을 써요. 230 × 50은 230 × 5 = 1150의 10배라서 11500 — 몇을 곱한 결과가 0으로 끝나도 10배를 빠뜨리지 않아요.',
    rule: '몇십을 곱할 때는 몇을 곱한 다음 10배 — 일의 자리에 0을 써요.',
    slip: '어림해서 자리를 확인해요 — 230 × 50은 200 × 50 = 10000보다 커요.',
    calc(r, c) {
      const one = (kind, t) => {
        const [a, d] = draw(() => [int(r, 101, 999), int(r, 2, 9)], ([x, k]) => (kind === 'end0' ? (x * k) % 10 === 0 && hasCarry(x, k) : hasCarry(x, k)) && x % 100 !== 0);
        const b = d * 10; const ans = a * b;
        return {
          t: t(a, b), ans: String(ans), wr: wrongTens(a, d), near: nearMul(ans),
          why: {
            [TAGS.zeroDrop]: `${a} × ${d} = ${a * d}에서 멈췄어요 — ${b}는 ${d}의 10배라서 곱도 10배예요.`,
            [TAGS.noCarry]: `${a} × ${d}에서 받아올림을 빠뜨렸어요 — ${a} × ${d} = ${a * d}.`,
            [TAGS.zeroExtra]: `${a} × ${d} = ${a * d}의 10배는 ${ans}이에요 — 0을 하나만 더 붙여요.`,
          },
          steps: [`${a} × ${d} = ${a * d}`, `${b}는 ${d}의 10배 — 곱도 10배: ${a} × ${b} = ${ans}`],
          probe: { ask: 'calc', kind },
        };
      };
      return askFam(r, c, this, [
        // 같은 틀 글은 한 가족 — 수의 꼴(받아올림·0으로 끝남)은 가족 안에서 고른다 (🔁 쌍둥이는 열쇠로 첫 가족을 찾는다)
        famOf([one(pick(r, ['plain', 'end0']), (a, b) => calcQ(`${a} × ${b}`))]),
        famOf([one(pick(r, ['plain', 'end0']), (a, b) => calcQ(`${a} × ${b}`))]),
        famOf([one('plain', (a, b) => `한 상자에 기념품이 ${a}개씩 들어 있어요. ${b}상자에 들어 있는 기념품은 모두 몇 개일까요?`)]),
        famOf([one('plain', (a, b) => `{me/은/는} 줄넘기를 하루에 ${a}번씩 했어요. ${b}일 동안 한 줄넘기는 모두 몇 번일까요?`)]),
      ]);
    },
    misread(r, c) {
      if (branchOf(r, c, ['zero', 'place']) === 'zero') {
        // 230 × 50 = 1150 — 몇을 곱한 결과가 0으로 끝날 때 0을 하나만 (지도서 167쪽)
        const [a, d] = draw(() => [int(r, 101, 999), int(r, 2, 9)], ([x, k]) => (x * k) % 10 === 0 && x % 100 !== 0);
        const b = d * 10; const ans = a * b;
        return misAsk(r, c, this, 'zero', {
          q: WORK(`${a} × ${b} = ${a * d}`),
          ok: `${a} × ${d} = ${a * d}의 10배예요 — ${a} × ${b} = ${ans}`,
          wr: [RIGHT, { text: `0을 두 개 더 붙여서 ${ans * 10}`, tag: TAGS.zeroExtra }, { text: '세 자리 수에는 몇십을 곱할 수 없어요', tag: OFF }],
          steps: [`${a} × ${d} = ${a * d}`, `${b}는 ${d}의 10배 — ${a} × ${b} = ${ans}`],
          whyAny: `${a * d} 끝의 0은 ${a} × ${d}에서 나온 0이에요. ${b}를 곱했으니 10배를 한 번 더 해요.`,
          probe: { ask: 'zero', a, b, shown: a * d },
        });
      }
      // ×몇십 세로셈에서 일의 자리부터 채움 — 216 × 40을 864로 (지도서 157쪽)
      const [a, d] = draw(() => [int(r, 101, 999), int(r, 2, 9)], ([x, k]) => (x * k) % 10 !== 0 && x % 100 !== 0);
      const b = d * 10; const ans = a * b;
      return misAsk(r, c, this, 'place', {
        q: FIG_WORK(`[vmul ${a} ${b} =${a * d}]`),
        ok: `${a} × ${d} = ${a * d}을 십의 자리부터 쓰고 일의 자리에 0 — ${a} × ${b} = ${ans}`,
        wr: [RIGHT, { text: `0을 두 개 붙여서 ${ans * 10}`, tag: TAGS.zeroExtra }, { text: '몇십은 세로셈으로 곱할 수 없어요', tag: OFF }],
        steps: [`${a} × ${d} = ${a * d}`, `${b}를 곱하면 10배 — ${a} × ${b} = ${ans}`],
        whyAny: `${a} × ${d} = ${a * d}을 일의 자리부터 썼어요. 어림하면 ${Math.floor(a / 100) * 100} × ${b} = ${Math.floor(a / 100) * 100 * b}보다 커야 해요.`,
        probe: { ask: 'place', a, b, shown: a * d },
      });
    },
  },

  {
    id: 'md.mul2d', grade: 4, name: '(세 자리 수) × (두 자리 수)', needs: ['md.mul10s'],
    idea: '123 × 24 — 24를 4와 20으로 나눠 곱하고 더해요: 123 × 4 = 492, 123 × 20 = 2460 → 492 + 2460 = **2952**. 세로셈에서 123 × 20 = 2460은 0까지 써서 자리를 맞춰요. 726 × 53 = 2178 + 36300 = 38478.',
    rule: '일의 자리 수를 곱한 값과 몇십을 곱한 값을 자리에 맞게 쓰고 더해요.',
    slip: '십의 자리 수를 곱한 값은 몇십을 곱한 값이에요 — 0까지 써서 자리를 맞췄는지 봐요.',
    calc(r, c) {
      const one = (big, t) => {
        const [a, b] = draw(() => [big ? int(r, 501, 999) : int(r, 101, 499), big ? int(r, 51, 99) : int(r, 12, 49)], ([x, y]) => y % 10 !== 0 && x % 100 !== 0);
        const u = b % 10; const t10 = b - u; const ans = a * b;
        return {
          t: t(a, b), ans: String(ans), wr: wrongTwo(a, b), near: nearMul(ans),
          why: {
            [TAGS.partShift]: `${a} × ${t10 / 10}이 아니라 ${a} × ${t10} = ${a * t10}을 더해요 — 십의 자리 수를 곱한 값은 0까지 써서 자리를 맞춰요.`,
            [TAGS.noCarry]: `받아올림을 빠뜨렸어요 — ${a} × ${u} = ${a * u}, ${a} × ${t10} = ${a * t10}.`,
            [TAGS.partDrop]: `${a} × ${u} = ${a * u}과 ${a} × ${t10} = ${a * t10}을 둘 다 구해서 더해요.`,
          },
          steps: [`${a} × ${u} = ${a * u}`, `${a} × ${t10} = ${a * t10}`, `${a * u} + ${a * t10} = ${ans}`],
          probe: { ask: 'calc', big },
        };
      };
      return askFam(r, c, this, [
        famOf([one(pick(r, [false, true]), (a, b) => calcQ(`${a} × ${b}`))]),
        famOf([one(pick(r, [false, true]), (a, b) => calcQ(`${a} × ${b}`))]),
        famOf([one(false, (a, b) => `방석 한 개를 만드는 데 양말목이 ${a}개 필요해요. 방석 ${b}개를 만들려면 양말목은 모두 몇 개 필요할까요?`)]),
        famOf([one(true, (a, b) => `{mon/은/는} 하루에 나무열매를 ${a} g씩 먹어요. ${b}일 동안 먹은 나무열매는 모두 몇 g일까요?`)]),
      ]);
    },
    misread(r, c) {
      const [a, b] = draw(() => [int(r, 201, 899), int(r, 21, 89)], ([x, y]) => y % 10 !== 0 && x % 100 !== 0);
      const u = b % 10; const t10 = b - u; const ans = a * b;
      if (branchOf(r, c, ['shift', 'est']) === 'shift') {
        // 726 × 53 = 2178 + 3630 = 5808 (교과서 63쪽 유나)
        return misAsk(r, c, this, 'shift', {
          q: FIG_WORK(`[vmul ${a} ${b} ${a * u}+${a * t10 / 10}=${a * u + a * t10 / 10}]`),
          ok: `${a} × ${t10} = ${a * t10}을 더해야 해요 — ${a} × ${b} = ${ans}`,
          wr: [RIGHT, { text: `${a} × ${u}만 해서 ${a * u}`, tag: TAGS.partDrop }, { text: '세 자리 수와 두 자리 수는 세로셈으로 곱할 수 없어요', tag: OFF }],
          steps: [`${a} × ${u} = ${a * u}`, `${a} × ${t10} = ${a * t10}`, `${a * u} + ${a * t10} = ${ans}`],
          whyAny: `${a} × ${t10 / 10} = ${a * t10 / 10}을 그대로 더했어요. ${b}의 ${t10 / 10}은 ${t10}을 나타내요 — ${a} × ${t10} = ${a * t10}.`,
          probe: { ask: 'shift', a, b },
        });
      }
      // 어림해서 확인 — 부분곱을 한 자리 더 옮긴 값은 어림한 값보다 훨씬 크다 (교과서 63쪽 해리 825 × 61)
      const A = Math.ceil(a / 100) * 100; const B = Math.ceil(b / 10) * 10; const shown = a * u + a * t10 * 10;
      return misAsk(r, c, this, 'est', {
        q: `어림해서 확인해요.\n\n${WORK(`${a} × ${b} = ${shown}`)}`,
        ok: `어림하면 곱은 ${A} × ${B} = ${A * B}보다 작아요 — ${a} × ${b} = ${ans}`,
        wr: [RIGHT, { text: `${a} × ${t10}만 해서 ${a * t10}`, tag: TAGS.partDrop }, { text: '세 자리 수와 두 자리 수의 곱은 어림할 수 없어요', tag: OFF }],
        steps: [`${a}는 ${A}보다 작고 ${b}는 ${B}보다 작아요 — 곱은 ${A} × ${B} = ${A * B}보다 작아요`, `${a} × ${u} = ${a * u}, ${a} × ${t10} = ${a * t10}`, `${a * u} + ${a * t10} = ${ans}`],
        whyAny: `${a} × ${t10}을 한 자리 더 옮겨 ${a * t10 * 10}으로 썼어요. 어림한 값 ${A * B}보다 훨씬 커요.`,
        probe: { ask: 'est', a, b, shown },
      });
    },
  },

  {
    id: 'md.div2d', grade: 4, name: '(두 자리 수) ÷ (두 자리 수)', needs: ['md.mul2d'],
    idea: '53 ÷ 12 — 12를 10쯤으로 생각하면 10 × 5 = 50이라서 몫을 5로 어림해요. 그런데 12 × 5 = 60은 53보다 커서 뺄 수 없어요 → 몫을 1 작게 4로: 12 × 4 = 48, 53 − 48 = 5 → **53 ÷ 12 = 4 … 5**. 확인: 12 × 4 = 48, 48 + 5 = 53. 80 ÷ 20은 20 × 4 = 80이라서 몫 4 — 나누어떨어져요.',
    rule: '나누는 수와 몫의 곱이 나누어지는 수보다 크면 몫을 1 작게, 나머지가 나누는 수보다 크거나 같으면 몫을 1 크게 해요.',
    slip: '나머지가 나누는 수보다 작은지 꼭 봐요.',
    calc(r, c) {
      const one = (shape, t) => {
        const exact = shape !== 'rem'; const tens = shape === 'tens';
        const [a, b] = draw(() => {
          const bb = tens ? int(r, 2, 4) * 10 : int(r, 11, 39); const q = int(r, 2, 8); // (몇십) ÷ (몇십)은 20부터 — 80 ÷ 10은 나누는 수가 두 자리여도 ÷10 (헤드리스에서 봄)
          return [bb * q + (exact ? 0 : int(r, 1, bb - 1)), bb];
        }, ([x, y]) => x <= 99 && (tens || y % 10 !== 0));
        const { q, r: m } = divmod(a, b);
        return {
          t: t(a, b), ans: RT(q, m), wr: wrongDiv(a, b), near: nearDiv(q, m, b),
          why: whyDiv(a, b), steps: [...stepsOne(a, b).slice(0, 2), `${a} ÷ ${b} = ${RT(q, m)} — ${CHECK(a, b)}`],
          probe: { ask: 'calc', exact, tens },
        };
      };
      return askFam(r, c, this, [
        famOf([one(pick(r, ['rem', 'rem', 'exact', 'tens']), (a, b) => calcQ(`${a} ÷ ${b}`))]),
        famOf([one(pick(r, ['rem', 'rem', 'exact', 'tens']), (a, b) => calcQ(`${a} ÷ ${b}`))]),
        famOf([one('rem', (a, b) => `사탕 ${a}개를 한 명에게 ${b}개씩 나누어 주려고 해요. 몇 명에게 나누어 줄 수 있고, 몇 개가 남을까요?`)]),
        famOf([one('exact', (a, b) => `구슬 ${a}개를 ${b}개씩 묶으면 몇 묶음이 될까요?`)]),
      ]);
    },
    misread(r, c) {
      const [a, b] = draw(() => { const bb = int(r, 11, 29); return [bb * int(r, 2, 7) + int(r, 1, bb - 1), bb]; }, ([x, y]) => x <= 99 && y % 10 !== 0);
      const { q, r: m } = divmod(a, b);
      if (branchOf(r, c, ['over', 'big']) === 'over') {
        return misAsk(r, c, this, 'over', {
          q: WORK(`${a} ÷ ${b} = ${RT(q + 1, b * (q + 1) - a)}`),
          ok: `${b} × ${q + 1} = ${b * (q + 1)}은 ${a}보다 커요 — 몫을 1 작게: ${a} ÷ ${b} = ${RT(q, m)}`,
          wr: [RIGHT, { text: `몫을 ${q - 1}로 해서 ${RT(q - 1, m + b)}`, tag: TAGS.remBig }, { text: '두 자리 수는 두 자리 수로 나눌 수 없어요', tag: OFF }],
          steps: [`${b} × ${q + 1} = ${b * (q + 1)} — ${a}보다 커서 뺄 수 없어요`, `${b} × ${q} = ${b * q}, ${a} − ${b * q} = ${m}`, `${a} ÷ ${b} = ${RT(q, m)}`],
          whyAny: `어림한 몫 ${q + 1}이 커요. ${b} × ${q + 1} = ${b * (q + 1)}은 ${a}보다 커서 ${a}에서 뺄 수 없는데, 거꾸로 빼서 나머지를 ${b * (q + 1) - a}로 썼어요.`,
          probe: { ask: 'over', a, b },
        });
      }
      return misAsk(r, c, this, 'big', {
        q: WORK(`${a} ÷ ${b} = ${RT(q - 1, m + b)}`),
        ok: `나머지 ${m + b}가 나누는 수 ${b}보다 커요 — 몫을 1 크게: ${a} ÷ ${b} = ${RT(q, m)}`,
        wr: [RIGHT, { text: `몫을 ${q + 1}로 해서 ${RT(q + 1, b * (q + 1) - a)}`, tag: TAGS.overEst }, { text: '나머지는 아무리 커도 괜찮아요 — 고칠 곳이 없어요', tag: OFF }],
        steps: [`나머지 ${m + b}는 ${b}보다 커요 — ${b}를 한 번 더 뺄 수 있어요`, `${b} × ${q} = ${b * q}, ${a} − ${b * q} = ${m}`, `${a} ÷ ${b} = ${RT(q, m)}`],
        whyAny: `나머지는 나누는 수보다 작아야 해요. ${m + b}에서 ${b}를 한 번 더 뺄 수 있어요.`,
        probe: { ask: 'big', a, b },
      });
    },
  },

  {
    id: 'md.div10s', grade: 4, name: '(세 자리 수) ÷ (몇십)', needs: ['md.div2d'],
    idea: '461 ÷ 90 — 90 × 5 = 450, 90 × 6 = 540이라서 몫은 5: 461 − 450 = 11 → **461 ÷ 90 = 5 … 11**. 180 ÷ 30은 30 × 6 = 180이라서 몫이 6이에요 — 몫은 나누어지는 수의 일의 자리 위에 써요(30 × 60 = 1800이라서 60이 아니에요).',
    rule: '몇십에 몇을 곱해 보며 몫을 찾고, 몫이 한 자리이면 일의 자리 위에 써요.',
    slip: '몫을 쓴 자리를 봐요 — 나누는 수와 몫을 곱해 나누어지는 수가 되는지 확인해요.',
    calc(r, c) {
      const one = (exact, t) => {
        const [a, b] = draw(() => { const bb = int(r, 2, 9) * 10; const q = int(r, 2, 8); return [bb * q + (exact ? 0 : int(r, 1, bb - 1)), bb]; }, ([x]) => x >= 100 && x <= 999);
        const { q, r: m } = divmod(a, b);
        return {
          t: t(a, b), ans: RT(q, m), wr: wrongDiv(a, b, { tens: true }), near: nearDiv(q, m, b),
          why: whyDiv(a, b), steps: stepsOne(a, b),
          probe: { ask: 'calc', exact },
        };
      };
      return askFam(r, c, this, [
        famOf([one(pick(r, [false, true]), (a, b) => calcQ(`${a} ÷ ${b}`))]),
        famOf([one(pick(r, [false, true]), (a, b) => calcQ(`${a} ÷ ${b}`))]),
        famOf([one(false, (a, b) => `사과 ${a}개를 한 상자에 ${b}개씩 담으려고 해요. 몇 상자가 되고, 몇 개가 남을까요?`)]),
        famOf([one(true, (a, b) => `색종이 ${a}장을 한 명에게 ${b}장씩 나누어 주면 몇 명에게 나누어 줄 수 있을까요?`)]),
      ]);
    },
    misread(r, c) {
      if (branchOf(r, c, ['tens', 'big']) === 'tens') {
        // 180 ÷ 30 = 60 — 0을 뺀 수(18 ÷ 3)에만 집중해 몫을 십의 자리에 (지도서 181쪽)
        const [a, b] = draw(() => { const bb = int(r, 2, 9) * 10; return [bb * int(r, 3, 9), bb]; }, ([x]) => x >= 100 && x <= 999);
        const q = a / b;
        return misAsk(r, c, this, 'tens', {
          q: WORK(`${a} ÷ ${b} = ${q * 10}`),
          ok: `${b} × ${q} = ${a}이라서 몫은 일의 자리 위에 — ${a} ÷ ${b} = ${q}`,
          wr: [RIGHT, { text: `몫을 1 작게 해서 ${RT(q - 1, b)}`, tag: TAGS.remEq }, { text: '몇백몇십은 몇십으로 나눌 수 없어요', tag: OFF }],
          steps: [`${b} × ${q} = ${a}`, `${a} ÷ ${b} = ${q} — ${b} × ${q * 10} = ${b * q * 10}이에요`],
          whyAny: `0을 뺀 ${a / 10} ÷ ${b / 10} = ${q}의 몫을 십의 자리에 썼어요. ${b} × ${q * 10} = ${b * q * 10}은 ${a}보다 훨씬 커요.`,
          probe: { ask: 'tens', a, b, shown: q * 10 },
        });
      }
      const [a, b] = draw(() => { const bb = int(r, 3, 9) * 10; return [bb * int(r, 3, 8) + int(r, 1, bb - 1), bb]; }, ([x]) => x >= 100 && x <= 999);
      const { q, r: m } = divmod(a, b);
      return misAsk(r, c, this, 'big', {
        q: FIG_WORK(`[vdiv ${a} ${b} ${q - 1} ${m + b}]`),
        ok: `나머지 ${m + b}가 나누는 수 ${b}보다 커요 — 몫을 1 크게: ${a} ÷ ${b} = ${RT(q, m)}`,
        wr: [RIGHT, { text: `몫을 ${q + 1}로 해서 ${RT(q + 1, b * (q + 1) - a)}`, tag: TAGS.overEst }, { text: '나머지는 아무리 커도 괜찮아요 — 고칠 곳이 없어요', tag: OFF }],
        steps: [`나머지 ${m + b}는 ${b}보다 커요`, `${b} × ${q} = ${b * q}, ${a} − ${b * q} = ${m}`, `${a} ÷ ${b} = ${RT(q, m)}`],
        whyAny: `몫 ${q - 1}이 작아요. 나머지 ${m + b}에서 ${b}를 한 번 더 뺄 수 있어요.`,
        probe: { ask: 'big', a, b },
      });
    },
  },

  {
    id: 'md.div3d1', grade: 4, name: '(세 자리 수) ÷ (두 자리 수) — 몫이 한 자리', needs: ['md.div10s'],
    idea: '162 ÷ 18 — 18을 20쯤으로 생각하면 20 × 8 = 160이라서 몫을 8로 어림해요. 18 × 8 = 144, 162 − 144 = 18 — 나머지가 나누는 수와 같아서 한 번 더 뺄 수 있어요 → 몫을 1 크게 9로: 18 × 9 = 162 → **162 ÷ 18 = 9**. 239 ÷ 32는 32를 30쯤으로 생각해 몫을 8로 어림하지만 32 × 8 = 256은 239보다 커서 7로: 239 ÷ 32 = 7 … 15.',
    rule: '나누는 수를 몇십쯤으로 생각해 몫을 어림하고, 곱이 크면 1 작게 · 나머지가 크거나 같으면 1 크게 고쳐요.',
    slip: '나눈 다음 나머지가 나누는 수보다 작은지 확인해요.',
    calc(r, c) {
      const one = (exact, t) => {
        const [a, b] = draw(() => { const bb = int(r, 11, 98); const q = int(r, 2, 8); return [bb * q + (exact ? 0 : int(r, 1, bb - 1)), bb]; }, ([x, y]) => x >= 100 && x <= 999 && y % 10 !== 0);
        const { q, r: m } = divmod(a, b);
        return {
          t: t(a, b), ans: RT(q, m), wr: wrongDiv(a, b), near: nearDiv(q, m, b),
          why: whyDiv(a, b), steps: [...stepsOne(a, b).slice(0, 2), `${a} ÷ ${b} = ${RT(q, m)} — ${CHECK(a, b)}`],
          probe: { ask: 'calc', exact },
        };
      };
      return askFam(r, c, this, [
        famOf([one(pick(r, [false, true]), (a, b) => calcQ(`${a} ÷ ${b}`))]),
        famOf([one(pick(r, [false, true]), (a, b) => calcQ(`${a} ÷ ${b}`))]),
        famOf([one(false, (a, b) => `색종이 ${a}장을 ${b}명에게 똑같이 나누어 주려고 해요. 한 명에게 몇 장씩 주고, 몇 장이 남을까요?`)]),
        famOf([one(true, (a, b) => `몬스터볼 ${a}개를 한 상자에 ${b}개씩 담으면 몇 상자가 될까요?`)]),
      ]);
    },
    misread(r, c) {
      if (branchOf(r, c, ['eq', 'over']) === 'eq') {
        // 162 ÷ 18 = 8 … 18 — 나머지가 나누는 수와 같음
        const [a, b] = draw(() => { const bb = int(r, 11, 98); return [bb * int(r, 3, 8), bb]; }, ([x, y]) => x >= 100 && x <= 999 && y % 10 !== 0);
        const q = a / b;
        return misAsk(r, c, this, 'eq', {
          q: FIG_WORK(`[vdiv ${a} ${b} ${q - 1} ${b}]`),
          ok: `나머지 ${b}가 나누는 수 ${b}와 같아요 — 몫을 1 크게: ${a} ÷ ${b} = ${q}`,
          wr: [RIGHT, { text: `몫을 ${q + 1}로 해서 ${RT(q + 1, b)}`, tag: TAGS.overEst }, { text: '나머지가 나누는 수와 같아도 고칠 곳이 없어요', tag: OFF }],
          steps: [`나머지 ${b}는 나누는 수 ${b}와 같아요 — 한 번 더 뺄 수 있어요`, `${b} × ${q} = ${a}`, `${a} ÷ ${b} = ${q}`],
          whyAny: `나머지는 나누는 수보다 작아야 해요. 나머지 ${b}는 ${b}를 한 번 더 뺄 수 있어요.`,
          probe: { ask: 'eq', a, b },
        });
      }
      // 239 ÷ 32 = 8 … 17 — 나누는 수를 몇십쯤(32 → 30)으로 생각해 어림한 몫이 정말 1 큰 수만 (교과서 239 ÷ 32)
      const [a, b] = draw(() => { const bb = int(r, 11, 94); return [bb * int(r, 2, 8) + int(r, 1, bb - 1), bb]; },
        ([x, y]) => x >= 100 && x <= 999 && y % 10 !== 0 && Math.floor(x / roundTo(y, 10)) === Math.floor(x / y) + 1);
      const { q, r: m } = divmod(a, b); const B = roundTo(b, 10);
      return misAsk(r, c, this, 'over', {
        q: WORK(`${a} ÷ ${b} = ${RT(q + 1, b * (q + 1) - a)}`),
        ok: `${b} × ${q + 1} = ${b * (q + 1)}은 ${a}보다 커요 — 몫을 1 작게: ${a} ÷ ${b} = ${RT(q, m)}`,
        wr: [RIGHT, { text: `몫을 ${q - 1}로 해서 ${RT(q - 1, m + b)}`, tag: TAGS.remBig }, { text: '세 자리 수는 두 자리 수로 나눌 수 없어요', tag: OFF }],
        steps: [`${b} × ${q + 1} = ${b * (q + 1)} — ${a}보다 커서 뺄 수 없어요`, `${b} × ${q} = ${b * q}, ${a} − ${b * q} = ${m}`, `${a} ÷ ${b} = ${RT(q, m)}`],
        whyAny: `${b}를 ${B}쯤으로 생각해 어림한 몫이 커요. ${b} × ${q + 1} = ${b * (q + 1)}은 ${a}에서 뺄 수 없는데, 거꾸로 빼서 나머지를 ${b * (q + 1) - a}로 썼어요.`,
        probe: { ask: 'over', a, b },
      });
    },
  },

  {
    id: 'md.div3d2', grade: 4, name: '(세 자리 수) ÷ (두 자리 수) — 몫이 두 자리', needs: ['md.div3d1'],
    idea: '527 ÷ 16 — 52 ÷ 16부터: 16 × 3 = 48, 52 − 48 = 4. 7을 내려 47 ÷ 16: 16 × 2 = 32, 47 − 32 = 15 → **527 ÷ 16 = 32 … 15**. 873 ÷ 43은 87 − 86 = 1, 3을 내려 13 — 13은 43보다 작아서 몫의 일의 자리에 0을 써요: 873 ÷ 43 = 20 … 13.',
    rule: '십의 자리부터 나누고, 남은 수에 다음 자리 수를 내려 다시 나눠요 — 나눌 수 없으면 몫에 0을 써요.',
    slip: '몫의 일의 자리를 비우지 않았는지, 나머지가 나누는 수보다 작은지 봐요.',
    calc(r, c) {
      const one = (kind, t) => {
        const [a, b] = draw(() => {
          const bb = int(r, 11, 49); let q = int(r, 10, 60);
          if (kind === 'zero') q = int(r, 1, 6) * 10;
          else if (q % 10 === 0) q += int(r, 1, 9);
          return [bb * q + (kind === 'exact' ? 0 : int(r, 1, bb - 1)), bb];
        }, ([x, y]) => x >= 100 && x <= 999 && y % 10 !== 0 && Math.floor(x / y) >= 10);
        const { q, r: m } = divmod(a, b);
        return {
          t: t(a, b), ans: RT(q, m), wr: wrongDiv(a, b, { noOver: true }), near: nearDiv(q, m, b),
          why: whyDiv(a, b), steps: stepsTwo(a, b),
          probe: { ask: 'calc', kind },
        };
      };
      return askFam(r, c, this, [
        famOf([one(pick(r, ['rem', 'rem', 'zero', 'exact']), (a, b) => calcQ(`${a} ÷ ${b}`))]),
        famOf([one(pick(r, ['rem', 'rem', 'zero', 'exact']), (a, b) => calcQ(`${a} ÷ ${b}`))]),
        famOf([one('exact', (a, b) => `색종이 ${a}장을 ${b}명에게 똑같이 나누어 주면 한 명에게 몇 장씩 줄 수 있을까요?`)]),
        famOf([one('rem', (a, b) => `구슬 ${a}개를 한 봉지에 ${b}개씩 담으려고 해요. 몇 봉지가 되고, 몇 개가 남을까요?`)]),
      ]);
    },
    misread(r, c) {
      if (branchOf(r, c, ['ones', 'big']) === 'ones') {
        // 873 ÷ 43 = 2 … 13 — 몫의 일의 자리 0을 빠뜨림
        const [a, b] = draw(() => { const bb = int(r, 11, 49); return [bb * int(r, 1, 6) * 10 + int(r, 1, bb - 1), bb]; }, ([x, y]) => x >= 100 && x <= 999 && y % 10 !== 0 && x >= 10 * y);
        const { q, r: m } = divmod(a, b); const t = q / 10;
        return misAsk(r, c, this, 'ones', {
          q: FIG_WORK(`[vdiv ${a} ${b} ${t}_ ${m}]`),
          ok: `${m}은 ${b}보다 작아서 몫의 일의 자리에 0을 써요 — ${a} ÷ ${b} = ${RT(q, m)}`,
          wr: [RIGHT, { text: `몫을 ${q - 1}로 해서 ${RT(q - 1, m + b)}`, tag: TAGS.remBig }, { text: '몫이 두 자리인 나눗셈은 없어요', tag: OFF }],
          steps: [`${b} × ${q} = ${b * q} — ${a} − ${b * q} = ${m}`, `${m}은 ${b}보다 작아서 몫의 일의 자리는 0`, `${a} ÷ ${b} = ${RT(q, m)}`],
          whyAny: `몫의 일의 자리를 비워서 몫이 ${t}이 됐어요. ${b} × ${t} = ${b * t}은 ${a}보다 훨씬 작아요 — 몫은 ${q}예요.`,
          probe: { ask: 'ones', a, b },
        });
      }
      const [a, b] = draw(() => { const bb = int(r, 11, 49); let q = int(r, 11, 60); if (q % 10 === 0) q += 1; return [bb * q + int(r, 1, bb - 1), bb]; }, ([x, y]) => x >= 100 && x <= 999 && y % 10 !== 0 && Math.floor(x / y) >= 11);
      const { q, r: m } = divmod(a, b); const t = Math.floor(q / 10);
      return misAsk(r, c, this, 'big', {
        q: FIG_WORK(`[vdiv ${a} ${b} ${q - 1} ${m + b}]`),
        ok: `나머지 ${m + b}가 나누는 수 ${b}보다 커요 — 몫을 1 크게: ${a} ÷ ${b} = ${RT(q, m)}`,
        wr: [RIGHT, { text: `몫의 일의 자리를 쓰지 않아서 ${RT(t, a - b * t * 10)}`, tag: TAGS.dropOnes }, { text: '나머지는 아무리 커도 괜찮아요 — 고칠 곳이 없어요', tag: OFF }],
        steps: [`나머지 ${m + b}는 ${b}보다 커요 — 몫의 일의 자리를 1 크게`, `${b} × ${q} = ${b * q}, ${a} − ${b * q} = ${m}`, `${a} ÷ ${b} = ${RT(q, m)}`],
        whyAny: `나머지는 나누는 수보다 작아야 해요. ${m + b}에서 ${b}를 한 번 더 뺄 수 있어요.`,
        probe: { ask: 'big', a, b },
      });
    },
  },

  {
    id: 'md.est', grade: 4, name: '곱셈과 나눗셈의 어림', needs: ['md.div3d2'],
    idea: '계산하기 전에 어림해요. 825 × 61은 825를 800쯤, 61을 60쯤으로 생각하면 800 × 60 = 48000 — 825는 800보다 크고 61은 60보다 크니까 곱은 48000보다 커요. 362 ÷ 38은 362를 360쯤, 38을 40쯤으로 생각하면 360 ÷ 40 = 9쯤이에요. 나누어지는 수의 앞의 두 자리 수가 나누는 수보다 크거나 같으면 몫은 두 자리 수예요 — 527 ÷ 16은 52가 16보다 커서 몫이 두 자리 수예요.',
    rule: '몇백·몇십쯤으로 생각해 어림하고, 계산한 값이 어림한 값과 비슷한지 확인해요.',
    slip: '몇백과 몇십을 곱할 때 0의 개수를 세어 봐요 — 500 × 60은 5 × 6 = 30에 0이 세 개 더 붙어요.',
    calc(r, c) {
      const mul = (near) => {
        const [a, b] = draw(() => [int(r, 120, 949), int(r, 12, 94)], ([x, y]) => x % 100 !== 0 && y % 10 !== 0 && (near ? roundTo(x, 100) >= 100 && roundTo(y, 10) >= 10 : true));
        const A = near ? roundTo(a, 100) : Math.floor(a / 100) * 100; const B = near ? roundTo(b, 10) : Math.floor(b / 10) * 10;
        const ans = A * B;
        return {
          t: near ? `${a}를 ${A}쯤, ${b}를 ${B}쯤으로 생각하여 ${a} × ${b}의 곱을 어림하려고 해요. ${A} × ${B}는 얼마일까요?`
            : `${a} × ${b}를 앞자리 수만 생각하여 ${A} × ${B}로 어림하려고 해요. ${A} × ${B}는 얼마일까요?`,
          ans: String(ans),
          wr: clean(String(ans), [W(String(A * (B / 10)), TAGS.zeroDrop), W(String(ans * 10), TAGS.zeroExtra)]),
          near: nearMul(ans).filter((x) => +x % 1000 === 0),
          why: {
            [TAGS.zeroDrop]: `${A} × ${B / 10} = ${A * (B / 10)}에서 멈췄어요 — ${B}를 곱하면 그 10배예요.`,
            [TAGS.zeroExtra]: `${A / 100} × ${B / 10} = ${(A / 100) * (B / 10)}에 0을 세 개 붙여요 — ${A}에 0이 둘, ${B}에 0이 하나.`,
          },
          steps: [`${A / 100} × ${B / 10} = ${(A / 100) * (B / 10)}`, `0을 세 개 붙여요 — ${A} × ${B} = ${ans}`],
          probe: { ask: near ? 'mulNear' : 'mulFront' },
        };
      };
      const div = () => {
        const [a, b, A, B] = draw(() => {
          const BB = int(r, 2, 9) * 10; const AA = BB * int(r, 2, 8);
          return [AA + int(r, -4, 4), BB + int(r, -4, 4), AA, BB];
        }, ([x, y, X, Y]) => X >= 100 && x >= 100 && x <= 999 && x !== X && y !== Y && y >= 11 && roundTo(x, 10) === X && roundTo(y, 10) === Y);
        const q = A / B;
        return {
          t: `${a} ÷ ${b}의 몫을 어림하려고 해요. ${a}를 ${A}쯤, ${b}를 ${B}쯤으로 생각하면 ${A} ÷ ${B}는 얼마일까요?`,
          ans: String(q), wr: wrongDiv(A, B, { tens: true }), near: [],
          why: whyDiv(A, B),
          steps: [`${B} × ${q} = ${A}`, `${A} ÷ ${B} = ${q} — ${a} ÷ ${b}의 몫은 ${q}쯤이에요`],
          probe: { ask: 'div' },
        };
      };
      const digits = () => {
        // 몫이 두 자리 = 나누어지는 수의 앞의 두 자리 수 ≥ 나누는 수 · 맨 앞 숫자만 같은 꼴(63X ÷ 64)이 오답
        const okOne = draw(() => [int(r, 100, 999), int(r, 12, 89)], ([x, y]) => y % 10 !== 0 && Math.floor(x / 10) >= y);
        const front = () => draw(() => { const y = int(r, 12, 89); const lead = Math.floor(y / 10); return [lead * 100 + int(r, 0, 99), y]; },
          ([x, y]) => y % 10 !== 0 && Math.floor(x / 10) < y && x >= 100);
        const [w1, w2] = draw(() => [front(), front()], ([p, s]) => p[0] !== s[0] || p[1] !== s[1]);
        const E = ([x, y]) => `${x} ÷ ${y}`;
        return {
          words: true,
          t: '계산하지 않고 어림해요. 몫이 두 자리 수인 나눗셈은 어느 것일까요?', ans: E(okOne),
          wr: [W(E(w1), TAGS.frontOnly), W(E(w2), TAGS.frontOnly)],
          why: { [TAGS.frontOnly]: '맨 앞 숫자만 보지 말고 앞의 두 자리 수와 나누는 수를 비교해요 — 앞의 두 자리 수가 나누는 수보다 작으면 몫은 한 자리 수예요.' },
          steps: [`${okOne[0]}의 앞의 두 자리 수 ${Math.floor(okOne[0] / 10)}은 ${Math.floor(okOne[0] / 10) > okOne[1] ? `${okOne[1]}보다 커요` : `나누는 수 ${okOne[1]}와 같아요`} — 몫이 두 자리 수`, `${E(okOne)} = ${RT(Math.floor(okOne[0] / okOne[1]), okOne[0] % okOne[1])}`],
          probe: { ask: 'digits' },
        };
      };
      return askFam(r, c, this, [famOf([mul(true)]), famOf([mul(false)]), famOf([div()]), famOf([digits()])]);
    },
    misread(r, c) {
      if (branchOf(r, c, ['zero', 'digits']) === 'zero') {
        // 500 × 60 = 3000 — 몇을 곱한 결과(5 × 6 = 30)가 0으로 끝날 때 0을 하나만 (지도서 167쪽)
        const [A, B] = draw(() => [int(r, 2, 9) * 100, int(r, 2, 9) * 10], ([x, y]) => ((x / 100) * (y / 10)) % 10 === 0);
        const ans = A * B;
        return misAsk(r, c, this, 'zero', {
          q: `몇백과 몇십의 곱으로 어림하려고 해요.\n\n${WORK(`${A} × ${B} = ${A * (B / 10)}`)}`,
          ok: `${A / 100} × ${B / 10} = ${(A / 100) * (B / 10)}에 0을 세 개 붙여요 — ${A} × ${B} = ${ans}`,
          wr: [RIGHT, { text: `0을 네 개 붙여서 ${ans * 10}`, tag: TAGS.zeroExtra }, { text: '몇백과 몇십은 곱할 수 없어요', tag: OFF }],
          steps: [`${A / 100} × ${B / 10} = ${(A / 100) * (B / 10)}`, `${A}에 0이 둘, ${B}에 0이 하나 — ${A} × ${B} = ${ans}`],
          whyAny: `${(A / 100) * (B / 10)} 끝의 0은 ${A / 100} × ${B / 10}에서 나온 0이에요. ${A}와 ${B}의 0 세 개를 따로 붙여요.`,
          probe: { ask: 'zero', A, B, shown: A * (B / 10) },
        });
      }
      const [a, b] = draw(() => { const y = int(r, 12, 89); return [Math.floor(y / 10) * 100 + int(r, 0, 99), y]; }, ([x, y]) => y % 10 !== 0 && Math.floor(x / 10) < y && x >= 100 && Math.floor(x / y) >= 2 && x % y !== 0);
      const { q, r: m } = divmod(a, b);
      return misAsk(r, c, this, 'digits', {
        q: showWork(`${a} ÷ ${b}의 몫은 두 자리 수예요`, '말했어요'),
        ok: `앞의 두 자리 수 ${Math.floor(a / 10)}이 ${b}보다 작아서 몫은 한 자리 수예요 — ${a} ÷ ${b} = ${RT(q, m)}`,
        wr: [{ text: '맞게 말했어요', tag: RIGHT_AS_WRONG }, { text: `몫을 ${q - 1}로 해서 ${RT(q - 1, m + b)}`, tag: TAGS.remBig }, { text: '세 자리 수를 나누면 몫은 늘 세 자리 수예요 — 틀린 곳이 아니에요', tag: OFF }],
        steps: [`${a}의 앞의 두 자리 수 ${Math.floor(a / 10)}은 ${b}보다 작아요 — 몫은 한 자리 수`, `${a} ÷ ${b} = ${RT(q, m)}`],
        whyAny: `맨 앞 숫자만 비교했어요. 앞의 두 자리 수 ${Math.floor(a / 10)}이 ${b}보다 작으면 ${b} × 10 = ${b * 10}이 ${a}보다 커요 — 몫은 10보다 작아요.`,
        probe: { ask: 'digits', a, b },
      });
    },
  },

  {
    id: 'md.apply', grade: 4, name: '⭐ 곱셈과 나눗셈 활용', needs: ['md.est'],
    idea: '몇씩 몇 묶음이면 곱셈, 똑같이 나누거나 몇씩 묶으면 나눗셈이에요. 구슬 350개를 한 봉지에 24개씩 담으면 350 ÷ 24 = 14 … 14 — 14봉지가 되고 14개가 남아요. 두 단계 문제는 먼저 구할 것부터 — 948개 중 150개를 먹고 남은 것을 57명에게 똑같이 나누면 (948 − 150) ÷ 57 = 798 ÷ 57 = 14.',
    rule: '무엇을 구하는지 먼저 정하고 곱셈인지 나눗셈인지 골라요 — 나머지는 남는 수예요.',
    slip: '묻는 것이 몫인지 나머지인지, 한 번에 구할 수 있는지 다시 읽어요.',
    calc(r, c) {
      const mulStory = () => {
        const [a, b] = draw(() => [int(r, 120, 680), int(r, 12, 48)], ([x, y]) => y % 10 !== 0 && x % 100 !== 0);
        const { q, r: m } = divmod(a, b); const u = b % 10; const t10 = b - u; const ans = a * b;
        return {
          t: `장난감 공장에서 장난감을 하루에 ${a}개씩 만들어요. ${b}일 동안 만드는 장난감은 모두 몇 개일까요?`, ans: String(ans),
          wr: clean(String(ans), [W(RT(q, m), TAGS.divForMul), ...wrongTwo(a, b).filter((w) => w.tag === TAGS.partShift || w.tag === TAGS.noCarry)]),
          near: nearMul(ans),
          why: {
            [TAGS.divForMul]: `하루에 ${a}개씩 ${b}일이면 ${a}개씩 ${b}묶음 — 곱셈이에요.`,
            [TAGS.partShift]: `${a} × ${t10} = ${a * t10}을 더해요 — 십의 자리 수를 곱한 값은 0까지 써서 자리를 맞춰요.`,
            [TAGS.noCarry]: `받아올림을 빠뜨렸어요 — ${a} × ${u} = ${a * u}, ${a} × ${t10} = ${a * t10}.`,
          },
          steps: [`${a}개씩 ${b}묶음 — ${a} × ${b}`, `${a} × ${u} = ${a * u}, ${a} × ${t10} = ${a * t10}`, `${a * u} + ${a * t10} = ${ans}`],
          probe: { ask: 'mulStory' },
        };
      };
      const divStory = () => {
        const [a, b] = draw(() => [int(r, 150, 999), int(r, 12, 48)], ([x, y]) => y % 10 !== 0 && x % y !== 0 && Math.floor(x / y) >= 2);
        const { q, r: m } = divmod(a, b);
        return {
          t: `구슬 ${a}개를 한 봉지에 ${b}개씩 담으려고 해요. 몇 봉지가 되고, 남는 구슬은 몇 개일까요?`, ans: RT(q, m),
          wr: clean(RT(q, m), [W(String(a * b), TAGS.mulForDiv), W(RT(q - 1, m + b), TAGS.remBig), W(q >= 10 ? RT(Math.floor(q / 10), a - b * Math.floor(q / 10) * 10) : '', TAGS.dropOnes)]),
          near: nearDiv(q, m, b),
          why: { ...whyDiv(a, b), [TAGS.mulForDiv]: `${b}개씩 묶어 몇 봉지인지 구하는 것은 나눗셈이에요 — ${a} ÷ ${b}.` },
          steps: [`${b}개씩 묶기 — ${a} ÷ ${b}`, ...(q >= 10 ? stepsTwo(a, b) : stepsOne(a, b)).slice(0, -1), `${a} ÷ ${b} = ${RT(q, m)} — ${q}봉지, ${m}개 남아요`],
          probe: { ask: 'divStory' },
        };
      };
      const remMean = () => {
        const [a, b] = draw(() => [int(r, 150, 999), int(r, 12, 48)], ([x, y]) => { const d = divmod(x, y); return y % 10 !== 0 && d.r > 0 && d.q !== d.r && d.q !== d.r + y && d.q >= 2; });
        const { q, r: m } = divmod(a, b);
        return {
          t: `색종이 ${a}장을 ${b}명에게 똑같이 나누어 주려고 해요. 한 명에게 될 수 있는 대로 많이 주면 남는 색종이는 몇 장일까요?`, ans: String(m),
          wr: clean(String(m), [W(String(q), TAGS.quotForRem), W(String(m + b), TAGS.remBig)]),
          near: [m + 1, m - 1, m + 2, m - 2].filter((x) => x >= 1 && x < b).map(String),
          why: {
            [TAGS.quotForRem]: `${q}는 한 명에게 주는 장수(몫)예요 — 남는 색종이는 나머지 ${m}장이에요.`,
            [TAGS.remBig]: `나머지가 ${b}보다 크면 한 명에게 한 장씩 더 줄 수 있어요 — 남는 것은 ${m}장.`,
          },
          steps: [`${a} ÷ ${b} = ${RT(q, m)}`, `한 명에게 ${q}장씩 주고 남는 것은 나머지 — ${m}`],
          probe: { ask: 'remMean' },
        };
      };
      const twoStep = () => {
        const [a, s, b] = draw(() => { const y = int(r, 12, 48); const k = int(r, 6, 19); const ss = int(r, 2, 30) * 10; return [y * k + ss, ss, y]; },
          ([x, ss, y]) => x <= 999 && y % 10 !== 0 && x % y !== 0 && (x + ss) % y !== 0);
        const q = (a - s) / b; const o = divmod(a, b); const p = divmod(a + s, b);
        return {
          t: `사탕이 ${a}개 있었는데 그중 ${s}개를 먹었어요. 남은 사탕을 ${b}명에게 똑같이 나누어 주면 한 명에게 몇 개씩 줄 수 있을까요?`, ans: String(q),
          wr: clean(String(q), [W(RT(o.q, o.r), TAGS.oneStep), W(RT(p.q, p.r), TAGS.subAsAdd)]),
          near: [String(q + 1), String(q - 1)],
          why: {
            [TAGS.oneStep]: `먹은 ${s}개를 먼저 빼요 — 남은 사탕은 ${a} − ${s} = ${a - s}개예요.`,
            [TAGS.subAsAdd]: `먹은 사탕은 빼요 — ${a} − ${s} = ${a - s}.`,
          },
          steps: [`남은 사탕: ${a} − ${s} = ${a - s}`, `${a - s} ÷ ${b} = ${q}`],
          probe: { ask: 'twoStep' },
        };
      };
      return askFam(r, c, this, [famOf([mulStory()]), famOf([divStory()]), famOf([remMean()]), famOf([twoStep()])]);
    },
    misread(r, c) {
      if (branchOf(r, c, ['op', 'rem']) === 'op') {
        const [a, b] = draw(() => [int(r, 150, 999), int(r, 12, 48)], ([x, y]) => y % 10 !== 0 && x % y !== 0 && Math.floor(x / y) >= 2);
        const { q, r: m } = divmod(a, b);
        return misAsk(r, c, this, 'op', {
          q: `구슬 ${a}개를 한 봉지에 ${b}개씩 담으면 몇 봉지가 되고, 몇 개가 남을까요?\n\n${WORK(`${a} × ${b} = ${a * b}`)}`,
          ok: `${b}개씩 묶는 것은 나눗셈이에요 — ${a} ÷ ${b} = ${RT(q, m)}`,
          wr: [RIGHT, { text: `나눗셈으로 몫을 ${q - 1}로 해서 ${RT(q - 1, m + b)}`, tag: TAGS.remBig }, { text: '봉지에 담는 것은 계산할 수 없어요', tag: OFF }],
          steps: [`${b}개씩 묶기 — ${a} ÷ ${b}`, `${a} ÷ ${b} = ${RT(q, m)}`],
          whyAny: `${b}개씩 묶어 몇 봉지인지 구하는 것은 나눗셈이에요. 구슬이 ${a}개뿐인데 ${a * b}은 너무 커요.`,
          probe: { ask: 'op', a, b },
        });
      }
      const [a, b] = draw(() => [int(r, 150, 999), int(r, 12, 48)], ([x, y]) => { const d = divmod(x, y); return y % 10 !== 0 && d.r > 0 && d.q !== d.r && d.q !== d.r + y && d.q >= 2; });
      const { q, r: m } = divmod(a, b);
      return misAsk(r, c, this, 'rem', {
        q: `색종이 ${a}장을 ${b}명에게 똑같이 나누어 주려고 해요. 남는 색종이는 몇 장일까요?\n\n${showWork(`남는 색종이는 ${q}장이에요`, '말했어요')}`,
        ok: `${a} ÷ ${b} = ${RT(q, m)} — 남는 것은 나머지 ${m}`,
        wr: [{ text: '맞게 말했어요', tag: RIGHT_AS_WRONG }, { text: `한 명에게 ${q - 1}장씩 주면 남는 것은 ${m + b}`, tag: TAGS.remBig }, { text: '똑같이 나누면 남는 색종이는 없어요', tag: OFF }],
        steps: [`${a} ÷ ${b} = ${RT(q, m)}`, `${q}는 한 명에게 주는 장수 — 남는 것은 나머지 ${m}`],
        whyAny: `${q}는 몫 — 한 명에게 주는 장수예요. 남는 색종이는 나머지 ${m}장이에요.`,
        probe: { ask: 'rem', a, b },
      });
    },
  },
];

export function conceptById(id) {
  return MULDIV.find((c) => c.id === id) || null;
}

// ───────────────────── 문항 만들기 (mathdmul과 같은 모양) ─────────────────────

const SLIP = '한 번 더 천천히 — 어림한 값과 비슷한지, 나머지가 나누는 수보다 작은지 확인해요.';
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
  return diagnosticOf(MULDIV, makeQuestion, seed, n, opts);
}
export function placeFrom(answers) {
  return placeFromOf(MULDIV, answers);
}
export function ladder(doneIds) {
  return ladderOf(MULDIV, doneIds);
}

// ───────────────────── 사람이 쓴 내용 검사 (check.mjs가 부른다) ─────────────────────

function badPlaceholders(txt) {
  const leak = String(txt || '').match(/\{[^}]*\}/g) || [];
  return leak.filter((l) => !/^\{(me|mon|mon2)(\/[^/}]+\/[^}]+)?\}$/.test(l));
}
/** 글자 → 비교용 값 (checkHuman이 쓴다) — 수와 "몫 … 나머지"(나머지를 아주 작은 수로 더해 서로 다르게) */
const ratOf = (t) => { const v = remOf(t); return v ? { n: v.q * 1000 + v.r, d: 1000 } : null; };

/**
 * coach/math/muldiv.json 형식 검사 — mathdmul.checkContent와 같은 규칙 (값은 "몫 … 나머지"까지 읽는다)
 * @returns {string[]}
 */
export function checkContent(content) {
  const bad = [];
  const same = (a, b) => !!(a && b && a.n * b.d === b.n * a.d);
  for (const c of MULDIV) {
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
      const ov = ratOf(ck.ok);
      for (const n of ck.no) {
        if (String(n).trim() === String(ck.ok).trim()) bad.push(`${c.id}[${i}]: 정답이 오답에도 있음`);
        if (same(ov, ratOf(n))) bad.push(`${c.id}[${i}]: 값이 같은 보기 (${ck.ok} = ${n})`);
      }
      if (new Set(ck.no.map((n) => String(n).trim())).size !== ck.no.length) bad.push(`${c.id}[${i}]: 오답끼리 겹침`);
    }
    const d = v.dad;
    if (!d || !d.goal || !Array.isArray(d.say) || !d.say.length || !d.do) bad.push(`${c.id}: 아빠 카드 미완`);
    if (d && (!Array.isArray(d.traps) || !d.traps.length || !d.pass)) bad.push(`${c.id}: 아빠 카드 함정·통과 기준 없음`);
    if (v.why || v.special) checkHuman(c.id, v, bad, ratOf);
  }
  return bad;
}
