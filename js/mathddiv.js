// ➗ 수학 — X 소수의 나눗셈 줄기 (초6 「소수의 나눗셈」 6-1 · 6-2): 개념 사다리 + 문제 생성기 + 내용 형식 검사.
// 순수 함수만 — 화면 없음 (node 테스트에서 그대로 돈다).
//
// 왜 이 줄기인가 (2026-10-07, 아버님 "X 소수의 나눗셈 줄기 하자" → 설계안 "이대로 진행"):
//   C 소수 줄기의 나눗셈은 두 칸뿐(소수 ÷ 자연수 · 소수 ÷ 소수)이고 배움 장이 없다 — W 소수의 곱셈과 같은 빈자리.
//   지도서가 꼽은 흔한 오류는 몫의 소수점 위치 · 몫의 0을 빠뜨림 · 0을 내리지 않고 멈춤 · 나누는 수만 옮김이다.
//   (아이 기록의 수치·칸별 진단은 공개 코드에 적지 않는다 — Codex 36~38차, 기록은 비공개 저장소에만)
// 칸 범위: 2015 미래엔 지도서 6-1 3단원(차시 계획 플립 169쪽 — 나누는 수가 자연수) · 6-2 3단원(183쪽 — 나누는 수가 소수, 몫 반올림, 남는 양)
//   · 6-1 186쪽 오류 경향(6)4.8의 몫을 8, 28)19.88을 1.5) · 188쪽 "몫의 소수점은 나누어지는 수의 소수점을 올려 찍는다"
//   · 6-2 187쪽 "나누는 수의 소수점을 옮긴 만큼 나누어지는 수의 소수점도 동일하게" · 181쪽 "'나머지'라는 용어를 사용하지 않도록 … '나누어 주고 남은 양'"
//   · 212쪽 "남는 양이 몫의 소수 부분이 아님" · 2022 [6수01-14] (자연수)÷(자연수)의 몫을 소수로 · [6수01-15] 소수의 나눗셈의 계산 원리
//     (고려사항: 원리를 이해하는 수준 · 복잡한 계산은 계산기 · 어림셈) — 2022 교과서(천재 두 종)도 6-1 · 6-2 같은 짜임.
// 답의 꼴: 소수 부분의 끝자리 0을 지운 꼴. 숫자판은 지우지 않은 답(2.10)도 맞음 (W와 같은 지도서 채점 기준).
// 오답은 아이가 실제로 하는 틀린 생각 흉내 — C·L 줄기 이름표와 같은 말을 쓴다(📊에서 같은 오개념으로 모인다):
//   소수점을 빼먹음 · 소수점 위치를 잘못 찍음 · 몫의 0을 빠뜨림 · 나머지를 버림(6-1 세로셈에서 0을 내리지 않고 멈춤 — C와 같은 글자)
//   · 나누는 수만 옮김 · 나누어지는 수만 옮김 · 옮긴 칸 수가 틀림 · 나누면 항상 작아진다 · 분자·분모를 이어 씀
//   · 올려야 하는데 버림 · 5를 버림 · 한 자리 아래까지 어림함 · 한 자리 위까지 어림함 · 남는데 올림 (L 줄기와 같은 말)
//   + 새것: 나누는 수와 나누어지는 수를 바꿈 · 몫의 소수 부분을 남는 양으로 봄 · 남는 양에 옮긴 소수점을 그대로 씀
// 6-2 칸(X6~X10)의 글에는 "나머지"라는 말을 쓰지 않는다 — "나누어 주고 남는 양" (지도서 181쪽).
//
// 새 줄기의 함정(메모 stem-generator-pitfalls)을 처음부터:
//   · 가족 = 틀 여러 개 — 🔁 쌍둥이가 요청한 틀(tplKey)로 온다 · 틀마다 수의 꼴(자연수/소수)을 고정한다 · ② 갈래마다 key
//   · ★ 단위 글자(m·L·kg·km) 바로 뒤에는 조사를 붙이지 않는다 · 수 뒤 조사는 jfix가 끝자리 소리로 고친다
//   · 수가 답인 ①은 숫자판 · 고르는 ①은 "어느 것" 말투 · 틀 글에 수 뒤 "이에요/예요"를 쓰지 않는다
//   · 오답끼리·정답과 같은 값은 뽑지 않는다(clean → probe.allWrong) · 일반 규칙엔 조건을("0보다 큰 수를 1보다 작은 수로 나누면")
// ★ 정답·오답은 테스트가 **문제 글을 따로 읽어** 분수 셈으로 다시 푼다 (tests/mathddiv.test.js).

import { rng, castOf, fill, int, pick, shuffle, ask, solve, humanQuestion, checkHuman, diagnosticOf, placeFromOf, ladderOf } from './mathgen.js';
import { gradeLabel } from './mathmix.js';
import { D, decText } from './mathdec.js';
import { _kit } from './mathexpr.js';

export { gradeLabel };

const { famOf, runFamily, misAsk, textChoices, jfix, branchOf, showWork, step, RIGHT_AS_WRONG, OFF } = _kit;

// ───────────────────── 소수 — 정수 단위로 정확하게 ({u, p}: 값 = u / 10^p) ─────────────────────

const P10 = [1, 10, 100, 1000, 10000, 100000, 1000000, 10000000, 100000000];
const T = (x) => decText(x.u, x.p);
const nat = (n) => ({ u: n, p: 0 });
/** 무작위 소수 — 정수 부분 lo~hi, 소수 p자리, 마지막 자리는 0이 아니게 */
function rd(r, lo, hi, p) {
  const w = int(r, lo, hi);
  let f = int(r, 0, P10[p] - 1);
  if (f % 10 === 0) f += int(r, 1, 9);
  return { u: w * P10[p] + f, p };
}
const mulD = (a, b) => ({ u: a.u * b.u, p: a.p + b.p });
const sameD = (a, b) => !!(a && b && a.u * P10[b.p] === b.u * P10[a.p]);
const whole = (x) => Math.floor(x.u / P10[x.p]);
/** 꼭 p자리로 보이는 소수인가 (마지막 자리가 0이 아니다) — 틀마다 수의 꼴을 고정한다 */
const isP = (x, p) => x.p === p && (p === 0 || x.u % 10 !== 0);
/** a ÷ b — 끝나는 소수면 {u, p} (maxP자리까지), 아니면 null */
function divD(a, b, maxP = 6) {
  const num = a.u * P10[b.p]; const den = b.u * P10[a.p];
  for (let p = 0; p <= maxP; p++) { const t = num * P10[p]; if (t % den === 0) return tidy({ u: t / den, p }); }
  return null;
}
/** 끝자리 0을 지운 {u, p} */
function tidy(x) { let { u, p } = x; while (p > 0 && u % 10 === 0) { u /= 10; p -= 1; } return { u, p }; }
/** 10^k배 (k가 음수면 1/10^k배) */
const shiftD = (x, k) => tidy(k >= 0 ? { u: x.u * P10[k], p: x.p } : { u: x.u, p: x.p - k });
/** 반올림·버림 (a ÷ b를 소수 k자리까지) — 정수 셈으로 */
function roundQ(a, b, k, mode) {
  const num = a.u * P10[b.p]; const den = b.u * P10[a.p];
  const v = mode === 'down' ? Math.floor((num * P10[k]) / den) : Math.floor((2 * num * P10[k] + den) / (2 * den));
  return { u: v, p: k };
}
/** a ÷ b의 소수 (k+1)째 자리 숫자 (반올림할 때 보는 숫자) */
function nextDigit(a, b, k) {
  const num = a.u * P10[b.p]; const den = b.u * P10[a.p];
  return Math.floor((num * P10[k + 1]) / den) % 10;
}
/** 정수 u를 꼭 p자리 소수 글자로 (끝자리 0도 그대로) — 반올림 풀이에서 "3.50…"을 "3.5…"로 줄이지 않게 */
const fixed = (u, p) => { if (!p) return String(u); const t = String(u).padStart(p + 1, "0"); return t.slice(0, -p) + "." + t.slice(-p); };
/** 조건에 맞을 때까지 다시 뽑기 */
function draw(gen, ok) {
  for (let k = 0; k < 6000; k++) { const v = gen(); if (ok(v)) return v; }
  throw new Error('draw: 조건에 맞는 수를 못 뽑음');
}

// ───────────────────── 오답 정리·보기 ─────────────────────

/** 오답 후보 정리 — 빈 글자·정답과 같은 값·앞의 오답과 같은 값·0은 버린다 (probe.allWrong이 곧 이 목록) */
function clean(ans, list) {
  const A = D(ans); const out = [];
  for (const w of list) {
    if (!w || !w.text) continue;
    const v = D(w.text);
    if (!v || v.u === 0 || sameD(v, A) || out.some((o) => sameD(D(o.text), v))) continue;
    out.push(w);
  }
  return out;
}
const W = (x, tag) => ({ text: x ? T(x) : '', tag });
/** 자리 수를 말로 — "2자리" 말고 "두 자리" */
const PL = ['', '한', '두', '세', '네'];
/**
 * 옮김 오답 x가 몫에 소수점을 빼먹은 수(몫의 숫자)와 같으면 — 보기에 남은 이름표만으로는 어느 생각인지 모른다 (Codex 39차 #3, 4.5 ÷ 2.5 → 18)
 * → 이름표 글자는 그대로 두고(📊 집계), 풀이 글이 두 생각을 다 말한 뒤 바른 셈을 보인다
 */
const orDrop = (x, q, one, fix) => (x && q.p > 0 && sameD(x, nat(q.u)) ? `${one}거나, 몫에 소수점을 빼먹었어요 — ${fix}.` : null);
/** 정답 근처의 "계산 실수" — 오개념 오답이 모자랄 때만 */
function nearD(ans, k) {
  const x = D(ans); if (!x) return '';
  const st = [1, -1, 2, -2, 10, -10, 3, -3][k % 8];
  const u = x.u + st;
  return u > 0 ? decText(u, x.p) : '';
}
/** 수 보기 4개 — 정답 + 오개념 오답. 글자·값이 같은 보기는 넣지 않는다 */
function dchoices(r, answer, wrongs) {
  const list = [{ text: answer, ok: true }]; const vals = [D(answer)];
  const dup = (t) => { const v = D(t); return !v || list.some((x) => x.text === t) || vals.some((x) => sameD(x, v)); };
  const add = (t, tag) => { list.push({ text: t, ok: false, tag }); vals.push(D(t)); };
  for (const w of wrongs) { if (w && w.text && !dup(w.text) && list.length < 4) add(w.text, w.tag); }
  for (let k = 0; list.length < 4 && k < 16; k++) { const alt = nearD(answer, k); if (alt && !dup(alt)) add(alt, '계산 실수'); }
  return shuffle(r, list);
}
/** 고른 틀로 ① 문항 만들기 — v: { t, ans, wr, steps, why, whyAny, rule, words(식 보기), probe } */
function dcalcAsk(r, c, concept, v) {
  const F = (t) => jfix(fill(t, c));
  const chs = v.words ? textChoices(r, F(v.ans), v.wr.map((w) => ({ ...w, text: F(w.text) }))) : dchoices(r, v.ans, v.wr);
  const why = Object.fromEntries(Object.entries(v.why || {}).map(([k, t]) => [k, F(t)]));
  return {
    ...ask(concept.id, 'calc', F(v.t), chs, { solve: solve(v.steps.map((s, i) => step(i, F(s))), { why, whyAny: F(v.whyAny || ''), rule: v.rule || concept.rule }) }),
    probe: { ...(v.probe || {}), allWrong: v.words ? [] : v.wr.map((w) => ({ text: String(w.text), tag: w.tag })) },
  };
}
const askFam = (r, c, concept, fams) => dcalcAsk(r, c, concept, runFamily(r, c, fams));

const CALC = '다음을 계산하면 얼마일까요?';
const calcQ = (e) => `${CALC}\n\n**${e}**`;
const WORK = (line) => showWork(line, '계산했어요');
const RIGHT = { text: '맞게 계산했어요', tag: RIGHT_AS_WRONG };

/** 이 줄기의 오개념 이름표 (📊·🤔 노트·결과 카드에 그대로 뜬다) — 이름표 하나에 셈 하나 · C·L 줄기와 같은 말 */
export const TAGS = {
  dropPoint: '소수점을 빼먹음',
  pointPos: '소수점 위치를 잘못 찍음',
  quotZero: '몫의 0을 빠뜨림',
  stopEarly: '나머지를 버림',
  concat: '분자·분모를 이어 씀',
  swapDiv: '나누는 수와 나누어지는 수를 바꿈',
  divisorOnly: '나누는 수만 옮김',
  dividendOnly: '나누어지는 수만 옮김',
  moves: '옮긴 칸 수가 틀림',
  divSmaller: '나누면 항상 작아진다',
  roundDown: '올려야 하는데 버림',
  fiveDown: '5를 버림',
  lowPlace: '한 자리 아래까지 어림함',
  highPlace: '한 자리 위까지 어림함',
  useUp: '남는데 올림',
  remFrac: '몫의 소수 부분을 남는 양으로 봄',
  remScaled: '남는 양에 옮긴 소수점을 그대로 씀',
};

/** (소수) ÷ (자연수) 오답 이유 — 이 문제의 수로 */
function whyDN(A, n, q) {
  const U = A.u * P10[Math.max(0, q.p - A.p)]; // 내린 0까지 붙인 수 (4.3 ÷ 2 → 430)
  return {
    [TAGS.dropPoint]: `몫에 소수점을 안 찍었어요 — ${U} ÷ ${n} = ${q.u}은 ${['1', '0.1', '0.01', '0.001'][q.p]}이 ${q.u}개라는 뜻이에요. 몫은 ${T(q)}.`,
    [TAGS.pointPos]: '몫의 소수점은 나누어지는 수의 소수점 바로 위에 찍어요.',
    [TAGS.quotZero]: '나눌 수 없는 자리에서 몫에 0을 쓰지 않았어요 — 그 0이 없으면 숫자가 한 자리씩 밀려요.',
    [TAGS.stopEarly]: '나누어떨어지지 않았는데 멈췄어요 — 소수점 아래 0을 내려 끝까지 나눠요.',
  };
}

// ───────────────────── 개념 사다리 (X. 소수의 나눗셈 줄기) ─────────────────────

export const DDIV = [
  {
    id: 'ddiv.dnat', grade: 6, name: '(소수) ÷ (자연수)', needs: [],
    idea: '9.36 ÷ 3 — 936 ÷ 3 = 312이고, 9.36은 936의 1/100배라서 몫도 1/100배 → **3.12**. 11.2 ÷ 4는 세로로 — 자연수처럼 나누고 몫의 소수점은 나누어지는 수의 소수점 바로 위에 찍어요: 11.2 ÷ 4 = 2.8.',
    rule: '자연수처럼 나눈 다음, 몫의 소수점은 나누어지는 수의 소수점 바로 위에 찍어요.',
    slip: '몫에 소수점을 찍었는지, 몫이 어림한 값과 비슷한지 봐요.',
    calc(r, c) {
      // 각 자리에서 나누어떨어지는 — 몫의 숫자마다 × n이 한 자리 (9.36 ÷ 3 = 3.12)
      const even = (t) => {
        const n = int(r, 2, 4);
        const q = draw(() => ({ u: int(r, 1, Math.floor(9 / n)) * 100 + int(r, 0, Math.floor(9 / n)) * 10 + int(r, 1, Math.floor(9 / n)), p: 2 }), () => true);
        return one(q, n, t, 'even');
      };
      // 각 자리에서 나누어떨어지지 않는 — 세로셈 (11.2 ÷ 4 = 2.8 · 25.36 ÷ 8 = 3.17)
      const uneven = (p, t) => {
        const [q, n] = draw(() => [rd(r, 1, 9, p), int(r, 3, 9)], ([x, k]) => isP(mulD(x, nat(k)), p) && whole(mulD(x, nat(k))) % k !== 0);
        return one(q, n, t, 'uneven');
      };
      const one = (q, n, t, shape) => {
        const A = mulD(q, nat(n)); const ans = T(q);
        const wr = clean(ans, [W(nat(q.u), TAGS.dropPoint), W(shiftD(q, -1), TAGS.pointPos), W(q.p > 1 ? shiftD(q, 1) : null, TAGS.pointPos)]);
        return {
          t: t(T(A), n), ans, wr, why: whyDN(A, n, q),
          steps: [`${A.u} ÷ ${n} = ${q.u}`, `${T(A)}은 ${A.u}의 1/${P10[A.p]}배 — 몫도 1/${P10[A.p]}배: ${T(A)} ÷ ${n} = ${ans}`],
          probe: { ask: 'calc', shape },
        };
      };
      return askFam(r, c, this, [
        famOf([even((A, n) => calcQ(`${A} ÷ ${n}`))]),
        famOf([uneven(1, (A, n) => calcQ(`${A} ÷ ${n}`))]),
        famOf([uneven(2, (A, n) => calcQ(`${A} ÷ ${n}`))]),
        famOf([uneven(1, (A, n) => `무게가 ${A} kg인 밀가루를 ${n}봉지에 똑같이 나누어 담았어요. 한 봉지에 담은 밀가루는 몇 kg일까요?`)]),
      ]);
    },
    misread(r, c) {
      if (branchOf(r, c, ['share', 'est']) === 'share') {
        // 0.1 칸을 똑같이 나누는 그림 — 몫이 한 자리 소수, 한 묶음 15칸 이하
        const [q, n] = draw(() => [rd(r, 0, 1, 1), int(r, 2, 4)], ([x, k]) => x.u <= 15 && x.u * k <= 40 && isP(mulD(x, nat(k)), 1) && x.u >= 2);
        const A = mulD(q, nat(n)); const ans = T(q);
        return misAsk(r, c, this, 'share', {
          q: `그림을 보고 나눗셈을 계산해요.\n\n[ddiv share ${T(A)} ${n}]\n\n${WORK(`${T(A)} ÷ ${n} = ${q.u}`)}`,
          ok: `0.1이 ${A.u}개를 ${n}묶음으로 — 한 묶음은 0.1이 ${q.u}개: ${T(A)} ÷ ${n} = ${ans}`,
          wr: [RIGHT, { text: `소수점을 한 자리 더 옮겨 ${T(shiftD(q, -1))}`, tag: TAGS.pointPos }, { text: '소수는 자연수로 나눌 수 없어요', tag: OFF }],
          steps: [`0.1이 ${A.u}개 — ${A.u} ÷ ${n} = ${q.u}`, `${T(A)} ÷ ${n} = ${ans}`],
          whyAny: `몫에 소수점을 안 찍었어요. ${T(A)}를 ${n}묶음으로 나눈 한 묶음이 ${q.u}일 수는 없어요.`,
          probe: { ask: 'share', calc: `${T(A)} ÷ ${n}` },
        });
      }
      const [q, n] = draw(() => [rd(r, 1, 9, 1), int(r, 3, 9)], ([x, k]) => isP(mulD(x, nat(k)), 1) && whole(x) >= 1);
      const A = mulD(q, nat(n)); const ans = T(q); const shown = T(shiftD(q, -1));
      return misAsk(r, c, this, 'est', {
        q: `어림해서 확인해요.\n\n${WORK(`${T(A)} ÷ ${n} = ${shown}`)}`,
        ok: `${whole(q)} × ${n} = ${whole(q) * n}이니까 몫은 ${whole(q)}보다 커요 — ${T(A)} ÷ ${n} = ${ans}`,
        wr: [RIGHT, { text: `소수점을 빼서 ${q.u}`, tag: TAGS.dropPoint }, { text: '소수는 자연수로 나눌 수 없어요', tag: OFF }],
        steps: [`${A.u} ÷ ${n} = ${q.u}`, `몫의 소수점은 나누어지는 수의 소수점 바로 위 — ${ans}`],
        whyAny: `소수점을 한 자리 더 옮겼어요. ${whole(q)} × ${n} = ${whole(q) * n}이라 몫은 ${whole(q)}보다 커야 해요.`,
        probe: { ask: 'est', calc: `${T(A)} ÷ ${n}` },
      });
    },
  },

  {
    id: 'ddiv.small', grade: 6, name: '몫이 1보다 작은 (소수) ÷ (자연수)', needs: ['ddiv.dnat'],
    idea: '3.5 ÷ 5 — 3.5는 5보다 작아서 몫은 1보다 작아요. 35 ÷ 5 = 7이니까 몫은 0.7 — **일의 자리에 0을 써요**. 8.55 ÷ 15 = 0.57.',
    rule: '나누어지는 수가 나누는 수보다 작으면 몫은 1보다 작아요 — 일의 자리에 0을 쓰고 소수점을 찍어요.',
    slip: '나누어지는 수가 나누는 수보다 작으면 몫이 1보다 작은지 봐요.',
    calc(r, c) {
      const one = (pq, lo, hi, t) => {
        const [q, n] = draw(() => [rd(r, 0, 0, pq), int(r, lo, hi)], ([x, k]) => isP(mulD(x, nat(k)), pq) && Math.floor(x.u / P10[pq - 1]) >= 1);
        const A = mulD(q, nat(n)); const ans = T(q);
        const wr = clean(ans, [W(nat(q.u), TAGS.dropPoint), W(shiftD(q, -1), TAGS.pointPos)]);
        return {
          t: t(T(A), n), ans, wr, why: whyDN(A, n, q),
          steps: [`${A.u} ÷ ${n} = ${q.u}`, `${T(A)}는 ${n}보다 작아서 몫은 1보다 작아요 — ${T(A)} ÷ ${n} = ${ans}`],
          probe: { ask: 'calc', pq, big: n > 9 },
        };
      };
      return askFam(r, c, this, [
        famOf([one(1, 2, 9, (A, n) => calcQ(`${A} ÷ ${n}`))]),
        famOf([one(2, 2, 9, (A, n) => calcQ(`${A} ÷ ${n}`))]),
        famOf([one(2, 11, 19, (A, n) => calcQ(`${A} ÷ ${n}`))]),
        famOf([one(1, 2, 9, (A, n) => `길이가 ${A} m인 끈을 ${n}도막으로 똑같이 잘랐어요. 한 도막은 몇 m일까요?`)]),
      ]);
    },
    misread(r, c) {
      const [q, n] = draw(() => [rd(r, 0, 0, 1), int(r, 2, 9)], ([x, k]) => isP(mulD(x, nat(k)), 1));
      const A = mulD(q, nat(n)); const ans = T(q);
      if (branchOf(r, c, ['drop', 'est']) === 'drop') {
        return misAsk(r, c, this, 'drop', {
          q: WORK(`${T(A)} ÷ ${n} = ${q.u}`),
          ok: `${T(A)}는 ${n}보다 작아서 몫은 1보다 작아요 — ${T(A)} ÷ ${n} = ${ans}`,
          wr: [RIGHT, { text: `소수점을 한 자리 더 옮겨 ${T(shiftD(q, -1))}`, tag: TAGS.pointPos }, { text: '작은 수를 큰 수로 나눌 수는 없어요', tag: OFF }],
          steps: [`${A.u} ÷ ${n} = ${q.u}`, `일의 자리에 0 — ${T(A)} ÷ ${n} = ${ans}`],
          whyAny: `소수점을 빼먹었어요. ${T(A)}를 ${n}로 나눈 몫이 ${q.u}이면 ${q.u} × ${n} = ${q.u * n}이 되어 버려요.`,
          probe: { ask: 'drop', calc: `${T(A)} ÷ ${n}` },
        });
      }
      const shown = T(shiftD(q, -1));
      return misAsk(r, c, this, 'est', {
        q: `어림해서 확인해요.\n\n${WORK(`${T(A)} ÷ ${n} = ${shown}`)}`,
        ok: `${n} × 0.1 = ${T({ u: n, p: 1 })}이고 ${n} × 1 = ${n} — ${T(A)}는 그 사이라서 몫은 0.1과 1 사이: ${ans}`,
        wr: [RIGHT, { text: `소수점을 빼서 ${q.u}`, tag: TAGS.dropPoint }, { text: '작은 수를 큰 수로 나눌 수는 없어요', tag: OFF }],
        steps: [`${n} × 0.1 = ${T({ u: n, p: 1 })}, ${n} × 1 = ${n}`, `${T(A)} ÷ ${n} = ${ans}`],
        whyAny: `소수점을 한 자리 더 옮겼어요. ${T(A)}는 ${n} × 0.1 = ${T({ u: n, p: 1 })}보다 커서 몫은 0.1보다 커요.`,
        probe: { ask: 'est', calc: `${T(A)} ÷ ${n}` },
      });
    },
  },

  {
    id: 'ddiv.down', grade: 6, name: '소수점 아래 0을 내려 계산하는 (소수) ÷ (자연수)', needs: ['ddiv.small'],
    idea: '4.3 ÷ 2 — 43 ÷ 2는 나누어떨어지지 않아요. 4.3 = 4.30이니까 0을 내려 430 ÷ 2 = 215 → **2.15**. 분수로는 43/10 ÷ 2 = 43/20 = 215/100 = 2.15.',
    rule: '나누어떨어지지 않으면 소수점 아래 0을 내려 끝까지 나눠요 — 4.3과 4.30은 같아요.',
    slip: '나누어떨어질 때까지 0을 내려 계산했는지 봐요.',
    calc(r, c) {
      // 나누어지는 수 p자리 → 몫은 더 긴 소수 (0을 내려야 끝난다), 몫의 소수 첫째 자리는 0이 아니다 (그건 X4)
      const one = (pA, lo, hi, ns, t) => {
        const [A, n, q] = draw(() => { const a = rd(r, lo, hi, pA); const k = pick(r, ns); return [a, k, divD(a, nat(k), pA + 1)]; },
          ([a, k, x]) => !!x && x.p === pA + 1 && Math.floor(x.u / P10[x.p - 1]) % 10 !== 0 && (lo === 0 ? whole(x) === 0 : whole(x) >= 1));
        const ans = T(q); const stop = { u: Math.floor(A.u / n), p: A.p };
        const wr = clean(ans, [W(stop.u ? tidy(stop) : null, TAGS.stopEarly), W(shiftD(q, -1), TAGS.pointPos), W(nat(q.u), TAGS.dropPoint)]);
        return {
          t: t(T(A), n), ans, wr, why: whyDN(A, n, q),
          steps: [`${T(A)} = ${T(A)}${'0'.repeat(q.p - A.p)} — ${A.u * P10[q.p - A.p]} ÷ ${n} = ${q.u}`, `몫의 소수점은 나누어지는 수의 소수점 바로 위 — ${T(A)} ÷ ${n} = ${ans}`],
          probe: { ask: 'calc', zeros: q.p - A.p },
        };
      };
      return askFam(r, c, this, [
        famOf([one(1, 1, 9, [2, 4, 5, 6, 8], (A, n) => calcQ(`${A} ÷ ${n}`))]),
        famOf([one(1, 0, 0, [2, 4, 5], (A, n) => calcQ(`${A} ÷ ${n}`))]),
        famOf([one(2, 1, 9, [2, 4, 5, 8], (A, n) => calcQ(`${A} ÷ ${n}`))]),
        famOf([one(1, 1, 9, [2, 4, 5], (A, n) => `길이가 ${A} m인 돗자리를 ${n}명이 똑같이 나누어 쓰려고 해요. 한 사람이 쓰는 돗자리는 몇 m일까요?`)]),
      ]);
    },
    misread(r, c) {
      const [A, n, q] = draw(() => { const a = rd(r, 1, 9, 1); const k = pick(r, [2, 4, 5]); return [a, k, divD(a, nat(k), 3)]; },
        ([a, k, x]) => !!x && x.p === 2 && Math.floor(x.u / 10) % 10 !== 0 && whole(x) >= 1);
      const ans = T(q); const stop = tidy({ u: Math.floor(A.u / n), p: 1 });
      if (branchOf(r, c, ['stop', 'point']) === 'stop') {
        return misAsk(r, c, this, 'stop', {
          q: WORK(`${T(A)} ÷ ${n} = ${T(stop)}`),
          ok: `${T(A)} = ${T(A)}0 — 0을 내려 끝까지 나눠요: ${T(A)} ÷ ${n} = ${ans}`,
          wr: [RIGHT, { text: `몫에 소수점을 빼서 ${q.u}`, tag: TAGS.dropPoint }, { text: '나누어떨어지지 않으면 그만 나눠요', tag: OFF }],
          steps: [`${A.u}0 ÷ ${n} = ${q.u}`, `${T(A)} ÷ ${n} = ${ans}`],
          whyAny: `나누어떨어지지 않았는데 멈췄어요. ${T(stop)} × ${n} = ${T(mulD(stop, nat(n)))} — ${T(A)}가 안 돼요.`,
          probe: { ask: 'stop', calc: `${T(A)} ÷ ${n}` },
        });
      }
      const shown = T(shiftD(q, -1));
      return misAsk(r, c, this, 'point', {
        q: WORK(`${T(A)} ÷ ${n} = ${shown}`),
        ok: `몫의 소수점은 나누어지는 수의 소수점 바로 위 — ${T(A)} ÷ ${n} = ${ans}`,
        wr: [RIGHT, { text: `0을 내리지 않고 멈춰서 ${T(stop)}`, tag: TAGS.stopEarly }, { text: '나누어떨어지지 않으면 그만 나눠요', tag: OFF }],
        steps: [`${A.u}0 ÷ ${n} = ${q.u}`, `${T(A)} ÷ ${n} = ${ans}`],
        whyAny: `몫의 소수점을 잘못 찍었어요. ${whole(q)} × ${n} = ${whole(q) * n}이니까 몫은 ${whole(q)}보다 커요.`,
        probe: { ask: 'point', calc: `${T(A)} ÷ ${n}` },
      });
    },
  },

  {
    id: 'ddiv.zeroq', grade: 6, name: '몫의 소수 첫째 자리에 0이 있는 (소수) ÷ (자연수)', needs: ['ddiv.down'],
    idea: '16.2 ÷ 4 — 16 ÷ 4 = 4이고 소수 첫째 자리 2는 4로 나눌 수 없어요. 그 자리에 **0**을 쓰고 0을 내려 20 ÷ 4 = 5 → **4.05**. 1620 ÷ 4 = 405의 1/100배라고 봐도 같아요.',
    rule: '나눌 수 없는 자리에는 몫에 0을 쓰고 다음 자리를 내려요.',
    slip: '몫의 소수 첫째 자리에 0을 빠뜨리지 않았는지 봐요.',
    calc(r, c) {
      // 몫 = w.0d — 나누어지는 수가 두 자리(3.24 ÷ 3)거나 한 자리(16.2 ÷ 4, 0을 내림)
      const one = (pA, wlo, whi, t) => {
        const [q, n] = draw(() => [{ u: int(r, wlo, whi) * 100 + int(r, 1, 9), p: 2 }, int(r, 2, 9)], ([x, k]) => isP(tidy(mulD(x, nat(k))), pA));
        const A = tidy(mulD(q, nat(n))); const ans = T(q);
        const miss = { u: whole(q) * 10 + (q.u % 10), p: 1 };
        const wr = clean(ans, [W(miss, TAGS.quotZero), W(shiftD(q, 1), TAGS.pointPos), W(nat(q.u), TAGS.dropPoint)]);
        return {
          t: t(T(A), n), ans, wr, why: whyDN(A, n, q),
          steps: [`${A.u * P10[2 - A.p]} ÷ ${n} = ${q.u}`, `소수 첫째 자리는 나눌 수 없어 0 — ${T(A)} ÷ ${n} = ${ans}`],
          probe: { ask: 'calc', pA },
        };
      };
      return askFam(r, c, this, [
        famOf([one(2, 1, 9, (A, n) => calcQ(`${A} ÷ ${n}`))]),
        famOf([one(1, 1, 9, (A, n) => calcQ(`${A} ÷ ${n}`))]),
        famOf([one(2, 0, 0, (A, n) => calcQ(`${A} ÷ ${n}`))]),
        famOf([one(1, 1, 9, (A, n) => `길이가 ${A} km인 길을 ${n}구간으로 똑같이 나누었어요. 한 구간은 몇 km일까요?`)]),
      ]);
    },
    misread(r, c) {
      const [q, n] = draw(() => [{ u: int(r, 1, 9) * 100 + int(r, 1, 9), p: 2 }, int(r, 2, 9)], ([x, k]) => isP(tidy(mulD(x, nat(k))), 1));
      const A = tidy(mulD(q, nat(n))); const ans = T(q); const miss = T({ u: whole(q) * 10 + (q.u % 10), p: 1 });
      if (branchOf(r, c, ['zero', 'est']) === 'zero') {
        return misAsk(r, c, this, 'zero', {
          q: WORK(`${T(A)} ÷ ${n} = ${miss}`),
          ok: `소수 첫째 자리는 나눌 수 없어 0을 써요 — ${T(A)} ÷ ${n} = ${ans}`,
          wr: [RIGHT, { text: `소수점을 빼서 ${q.u}`, tag: TAGS.dropPoint }, { text: '나눌 수 없는 자리는 건너뛰어요', tag: OFF }],
          steps: [`${A.u}0 ÷ ${n} = ${q.u}`, `${T(A)} ÷ ${n} = ${ans}`],
          whyAny: `몫의 0을 빠뜨렸어요. ${miss} × ${n} = ${T(mulD(D(miss), nat(n)))} — ${T(A)}가 안 돼요.`,
          probe: { ask: 'zero', calc: `${T(A)} ÷ ${n}` },
        });
      }
      const shown = T(shiftD(q, 1));
      return misAsk(r, c, this, 'est', {
        q: `어림해서 확인해요.\n\n${WORK(`${T(A)} ÷ ${n} = ${shown}`)}`,
        ok: `${whole(q)} × ${n} = ${whole(q) * n}이니까 몫은 ${whole(q)}쯤 — ${T(A)} ÷ ${n} = ${ans}`,
        wr: [RIGHT, { text: `0을 빼고 ${miss}`, tag: TAGS.quotZero }, { text: '나눌 수 없는 자리는 건너뛰어요', tag: OFF }],
        steps: [`${A.u}0 ÷ ${n} = ${q.u}`, `${T(A)} ÷ ${n} = ${ans}`],
        whyAny: `몫의 소수점을 잘못 찍었어요. ${whole(q)} × ${n} = ${whole(q) * n}이라 몫은 ${whole(q)}쯤이어야 해요.`,
        probe: { ask: 'est', calc: `${T(A)} ÷ ${n}` },
      });
    },
  },

  {
    id: 'ddiv.natnat', grade: 6, name: '(자연수) ÷ (자연수)의 몫을 소수로', needs: ['ddiv.zeroq'],
    idea: '3 ÷ 4 — 3 = 3.00으로 보고 0을 내려 300 ÷ 4 = 75 → **0.75**. 분수로는 3 ÷ 4 = 3/4 = 75/100 = 0.75. 6 ÷ 5 = 6/5 = 12/10 = 1.2.',
    rule: '자연수 뒤에 소수점을 찍고 0을 내려 끝까지 나눠요 — 3과 3.0은 같아요.',
    slip: '나누어떨어지지 않을 때 멈추지 않고 0을 내려 나눴는지 봐요.',
    calc(r, c) {
      const NS = [2, 4, 5, 8, 12, 15, 16, 20, 25];
      const one = (small, t) => {
        const [a, n, q] = draw(() => { const k = pick(r, NS); const x = small ? int(r, 1, k - 1) : int(r, k + 1, k * 9); return [x, k, divD(nat(x), nat(k), 3)]; },
          ([x, k, y]) => !!y && y.p >= 1 && (small || x % k !== 0));
        const ans = T(q);
        const sw = divD(nat(n), nat(a), 3);
        const wr = clean(ans, [
          W(small ? null : nat(Math.floor(a / n)), TAGS.stopEarly), W(small ? D(`0.${a}${n}`) : null, TAGS.concat),
          W(sw, TAGS.swapDiv), W(shiftD(q, -1), TAGS.pointPos),
        ]);
        return {
          t: t(a, n), ans, wr,
          why: {
            [TAGS.stopEarly]: `나누어떨어지지 않았는데 멈췄어요 — ${a} = ${a}.0으로 보고 0을 내려 끝까지 나눠요.`,
            [TAGS.concat]: `분모를 10·100으로 만들어 소수로 바꿔요 — 두 수를 이어 쓴 수가 아니에요.`,
            [TAGS.swapDiv]: `나누는 수와 나누어지는 수를 바꿨어요 — ${a}를 ${n}으로 나눠요.`,
            [TAGS.pointPos]: '몫의 소수점은 나누어지는 수의 소수점(자연수 바로 뒤) 바로 위에 찍어요.',
          },
          steps: [`${a} = ${a}${'.' + '0'.repeat(q.p)} — ${a * P10[q.p]} ÷ ${n} = ${q.u}`, `${a} ÷ ${n} = ${ans}`],
          probe: { ask: 'calc', small },
        };
      };
      return askFam(r, c, this, [
        famOf([one(true, (a, n) => `다음 나눗셈의 몫을 소수로 나타내면 얼마일까요?\n\n**${a} ÷ ${n}**`)]),
        famOf([one(false, (a, n) => `다음 나눗셈의 몫을 소수로 나타내면 얼마일까요?\n\n**${a} ÷ ${n}**`)]),
        famOf([one(false, (a, n) => `길이가 ${a} m인 리본을 ${n}명이 똑같이 나누어 가졌어요. 한 사람이 가진 리본은 몇 m일까요?`)]),
        famOf([one(true, (a, n) => `${a} L인 주스를 ${n}컵에 똑같이 나누어 담았어요. 한 컵에 담은 주스는 몇 L일까요?`)]),
      ]);
    },
    misread(r, c) {
      const NS = [4, 5, 8, 20, 25];
      if (branchOf(r, c, ['stop', 'concat']) === 'stop') {
        const [a, n, q] = draw(() => { const k = pick(r, NS); const x = int(r, k + 1, k * 9); return [x, k, divD(nat(x), nat(k), 3)]; }, ([x, k, y]) => !!y && y.p >= 1 && !!divD(nat(k), nat(x), 6));
        const ans = T(q); const stop = Math.floor(a / n);
        return misAsk(r, c, this, 'stop', {
          q: WORK(`${a} ÷ ${n} = ${stop}`),
          ok: `${a} = ${a}.0 — 0을 내려 끝까지 나눠요: ${a} ÷ ${n} = ${ans}`,
          wr: [RIGHT, { text: `나누는 수와 나누어지는 수를 바꿔서 ${T(divD(nat(n), nat(a), 6))}`, tag: TAGS.swapDiv }, { text: '자연수끼리 나눈 몫은 소수가 될 수 없어요', tag: OFF }],
          steps: [`${a * P10[q.p]} ÷ ${n} = ${q.u}`, `${a} ÷ ${n} = ${ans}`],
          whyAny: `나누어떨어지지 않았는데 멈췄어요. ${stop} × ${n} = ${stop * n} — ${a}가 안 돼요.`,
          probe: { ask: 'stop', calc: `${a} ÷ ${n}` },
        });
      }
      const [a, n, q] = draw(() => { const k = pick(r, [4, 5, 8]); const x = int(r, 1, k - 1); return [x, k, divD(nat(x), nat(k), 3)]; }, ([, , y]) => !!y);
      const ans = T(q); const shown = `0.${a}${n}`;
      return misAsk(r, c, this, 'concat', {
        q: WORK(`${a} ÷ ${n} = ${shown}`),
        ok: `분모를 10·100·1000으로 만들어 소수로 — ${a} ÷ ${n} = ${ans}`,
        wr: [RIGHT, { text: `소수점을 한 자리 더 옮겨 ${T(shiftD(q, -1))}`, tag: TAGS.pointPos }, { text: '작은 수를 큰 수로 나눌 수는 없어요', tag: OFF }],
        steps: [`${a} ÷ ${n} = ${a}/${n} = ${q.u}/${P10[q.p]}`, `${a} ÷ ${n} = ${ans}`],
        whyAny: `${a}와 ${n}를 이어 썼어요. ${shown} × ${n}은 ${a}가 안 돼요.`,
        probe: { ask: 'concat', calc: `${a} ÷ ${n}` },
      });
    },
  },

  {
    id: 'ddiv.same', grade: 6, name: '자릿수가 같은 (소수) ÷ (소수)', needs: ['ddiv.natnat'],
    idea: '4.8 ÷ 1.2 — 두 수에 똑같이 10을 곱해도 몫은 같아요: 48 ÷ 12 = 4. 분수로는 48/10 ÷ 12/10 = 48 ÷ 12 = 4. 1.44 ÷ 0.06 = 144 ÷ 6 = 24 — 두 자리면 100을 곱해요.',
    rule: '나누는 수가 자연수가 되도록 두 수의 소수점을 똑같이 옮겨요 — 같은 수를 곱해도 몫은 같아요.',
    slip: '두 수의 소수점을 똑같이 옮겼는지 봐요.',
    calc(r, c) {
      // 소수 두 자리끼리는 나누는 수를 1보다 작게(교과서 1.44 ÷ 0.06 · 0.35 ÷ 0.14) — 3.24처럼 크면 4536 ÷ 324 같은 무거운 나눗셈이 된다 (Codex 39차 #5)
      const one = (pB, qDec, lo, hi, t) => {
        const [B, q] = draw(() => [rd(r, 0, pB > 1 ? 0 : 3, pB), qDec ? rd(r, 1, 9, 1) : nat(int(r, lo, hi))], ([b, x]) => b.u >= 2 && isP(tidy(mulD(b, x)), pB));
        const A = tidy(mulD(B, q)); const ans = T(q);
        const wr = clean(ans, [W(shiftD(q, -pB), TAGS.divisorOnly), W(shiftD(q, pB), TAGS.dividendOnly), W(qDec ? nat(q.u) : null, TAGS.dropPoint)]);
        return {
          t: t(T(A), T(B)), ans, wr,
          why: {
            [TAGS.divisorOnly]: `나누는 수만 옮겼어요 — 나누어지는 수도 똑같이 ${PL[pB]} 자리 옮겨야 몫이 같아요.`,
            [TAGS.dividendOnly]: orDrop(shiftD(q, pB), q, '나누어지는 수만 옮겼', `두 수를 함께 옮기면 ${A.u} ÷ ${B.u} = ${ans}`) || '나누어지는 수만 옮겼어요 — 두 수를 함께 옮겨요.',
            [TAGS.dropPoint]: `몫에 소수점을 안 찍었어요 — ${A.u} ÷ ${B.u} = ${T(q)}.`,
          },
          steps: [`두 수에 ${P10[pB]}을 곱해요 — ${T(A)} ÷ ${T(B)} = ${A.u} ÷ ${B.u}`, `${A.u} ÷ ${B.u} = ${ans}`],
          probe: { ask: 'calc', pB, qDec },
        };
      };
      return askFam(r, c, this, [
        famOf([one(1, false, 2, 15, (A, B) => calcQ(`${A} ÷ ${B}`))]),
        famOf([one(1, true, 0, 0, (A, B) => calcQ(`${A} ÷ ${B}`))]),
        famOf([one(2, false, 2, 30, (A, B) => calcQ(`${A} ÷ ${B}`))]),
        famOf([one(1, false, 2, 12, (A, B) => `무게가 ${A} kg인 호두를 ${B} kg씩 묶으려고 해요. 몇 묶음이 될까요?`)]),
      ]);
    },
    misread(r, c) {
      if (branchOf(r, c, ['fit', 'dividend']) === 'fit') {
        // 띠에 B씩 선 긋기 — 몫이 자연수, 도막 10개 이하
        const [B, q] = draw(() => [rd(r, 0, 2, 1), nat(int(r, 2, 10))], ([b, x]) => b.u >= 2 && isP(tidy(mulD(b, x)), 1) && b.u * x.u <= 96);
        const A = tidy(mulD(B, q)); const ans = T(q); const shown = T(shiftD(q, -1));
        return misAsk(r, c, this, 'fit', {
          q: `그림을 보고 나눗셈을 계산해요.\n\n[ddiv fit ${T(A)} ${T(B)}]\n\n${WORK(`${T(A)} ÷ ${T(B)} = ${shown}`)}`,
          ok: `${T(A)}에서 ${T(B)}씩 ${q.u}번 덜어 낼 수 있어요 — ${T(A)} ÷ ${T(B)} = ${ans}`,
          wr: [RIGHT, { text: `나누어지는 수만 옮겨서 ${T(shiftD(q, 1))}`, tag: TAGS.dividendOnly }, { text: '소수는 소수로 나눌 수 없어요', tag: OFF }],
          steps: [`${T(A)} ÷ ${T(B)} = ${A.u} ÷ ${B.u}`, `${A.u} ÷ ${B.u} = ${ans}`],
          whyAny: `나누는 수만 옮겼어요. 그림에서 ${T(B)}짜리 도막이 ${q.u}개예요.`,
          probe: { ask: 'fit', calc: `${T(A)} ÷ ${T(B)}` },
        });
      }
      const [B, q] = draw(() => [rd(r, 0, 3, 1), nat(int(r, 2, 15))], ([b, x]) => b.u >= 2 && isP(tidy(mulD(b, x)), 1));
      const A = tidy(mulD(B, q)); const ans = T(q); const shown = T(shiftD(q, 1));
      return misAsk(r, c, this, 'dividend', {
        q: WORK(`${T(A)} ÷ ${T(B)} = ${A.u} ÷ ${T(B)} = ${shown}`),
        ok: `두 수를 똑같이 옮겨요 — ${A.u} ÷ ${B.u} = ${ans}`,
        wr: [RIGHT, { text: `나누는 수만 옮겨서 ${T(shiftD(q, -1))}`, tag: TAGS.divisorOnly }, { text: '소수는 소수로 나눌 수 없어요', tag: OFF }],
        steps: [`두 수에 10을 곱해요 — ${A.u} ÷ ${B.u}`, `${A.u} ÷ ${B.u} = ${ans}`],
        whyAny: `나누어지는 수만 옮겼어요. ${ans} × ${T(B)} = ${T(A)}인지 곱해서 확인해요.`,
        probe: { ask: 'dividend', calc: `${T(A)} ÷ ${T(B)}` },
      });
    },
  },

  {
    id: 'ddiv.diff', grade: 6, name: '자릿수가 다른 (소수) ÷ (소수)', needs: ['ddiv.same'],
    idea: '3.48 ÷ 0.4 — 나누는 수가 자연수가 되게 두 수에 10을 곱해요: 34.8 ÷ 4 = 8.7. 몫의 소수점은 **옮긴** 소수점 위에 찍어요. 9.5 ÷ 0.19는 100을 곱해 950 ÷ 19 = 50 — 빈 자리에는 0을 써요.',
    rule: '나누는 수를 자연수로 만들 만큼 두 수의 소수점을 똑같이 옮기고, 몫의 소수점은 옮긴 자리 위에 찍어요.',
    slip: '나누는 수를 옮긴 칸 수만큼 나누어지는 수도 옮겼는지 봐요.',
    calc(r, c) {
      // (가) 두 자리 ÷ 한 자리 → 10배 (3.48 ÷ 0.4 = 8.7) · (나) 한 자리 ÷ 두 자리 → 100배, 몫은 자연수 (9.5 ÷ 0.19 = 50)
      const one = (pA, pB, qp, Bhi, t) => {
        const [B, q] = draw(() => [rd(r, 0, Bhi, pB), qp ? rd(r, 1, 9, qp) : nat(int(r, 2, 9) * 10)], ([b, x]) => b.u >= 2 && isP(tidy(mulD(b, x)), pA));
        const A = tidy(mulD(B, q)); const ans = T(q);
        const wr = clean(ans, [W(shiftD(q, pA - pB), TAGS.moves), W(shiftD(q, -pB), TAGS.divisorOnly), W(shiftD(q, pA), TAGS.dividendOnly)]);
        return {
          t: t(T(A), T(B)), ans, wr,
          why: {
            [TAGS.moves]: orDrop(shiftD(q, pA - pB), q, `나누어지는 수를 ${PL[pA]} 자리 옮겼`, `두 수를 ${PL[pB]} 자리씩 옮기면 ${T(shiftD(A, pB))} ÷ ${B.u} = ${ans}`) || `나누는 수를 ${PL[pB]} 자리 옮겼으면 나누어지는 수도 ${PL[pB]} 자리만 옮겨요 — 빈 자리에는 0.`,
            [TAGS.divisorOnly]: `나누는 수만 옮겼어요 — 나누어지는 수도 똑같이 ${PL[pB]} 자리 옮겨야 몫이 같아요.`,
            [TAGS.dividendOnly]: '나누어지는 수만 옮겼어요 — 두 수를 함께 옮겨요.',
          },
          steps: [`두 수에 ${P10[pB]}을 곱해요 — ${T(A)} ÷ ${T(B)} = ${T(shiftD(A, pB))} ÷ ${B.u}`, `${T(shiftD(A, pB))} ÷ ${B.u} = ${ans}`],
          probe: { ask: 'calc', pA, pB },
        };
      };
      return askFam(r, c, this, [
        famOf([one(2, 1, 1, 0, (A, B) => calcQ(`${A} ÷ ${B}`))]),
        famOf([one(2, 1, 1, 3, (A, B) => calcQ(`${A} ÷ ${B}`))]),
        famOf([one(1, 2, 0, 0, (A, B) => calcQ(`${A} ÷ ${B}`))]),
        famOf([one(2, 1, 1, 0, (A, B) => `넓이가 ${A} m²인 직사각형의 세로가 ${B} m일 때, 가로는 몇 m일까요?`)]),
      ]);
    },
    misread(r, c) {
      if (branchOf(r, c, ['moves', 'divisor']) === 'moves') {
        const [B, q] = draw(() => [rd(r, 0, 0, 1), rd(r, 1, 9, 1)], ([b, x]) => isP(tidy(mulD(b, x)), 2));
        const A = tidy(mulD(B, q)); const ans = T(q); const shown = T(shiftD(q, 1));
        return misAsk(r, c, this, 'moves', {
          q: WORK(`${T(A)} ÷ ${T(B)} = ${A.u} ÷ ${B.u} = ${shown}`),
          ok: `나누는 수를 한 자리 옮겼으니 나누어지는 수도 한 자리만 — ${T(shiftD(A, 1))} ÷ ${B.u} = ${ans}`,
          wr: [RIGHT, { text: `나누는 수만 옮겨서 ${T(shiftD(q, -1))}`, tag: TAGS.divisorOnly }, { text: '자릿수가 다른 소수끼리는 나눌 수 없어요', tag: OFF }],
          steps: [`두 수에 10을 곱해요 — ${T(shiftD(A, 1))} ÷ ${B.u}`, `${T(shiftD(A, 1))} ÷ ${B.u} = ${ans}`],
          whyAny: `두 수를 옮긴 칸 수가 달라요. ${ans} × ${T(B)} = ${T(A)}인지 곱해서 확인해요.`,
          probe: { ask: 'moves', calc: `${T(A)} ÷ ${T(B)}` },
        });
      }
      const [B, q] = draw(() => [rd(r, 0, 0, 2), nat(int(r, 2, 9) * 10)], ([b, x]) => isP(tidy(mulD(b, x)), 1));
      const A = tidy(mulD(B, q)); const ans = T(q); const shown = T(shiftD(q, -2));
      return misAsk(r, c, this, 'divisor', {
        q: WORK(`${T(A)} ÷ ${T(B)} = ${T(A)} ÷ ${B.u} = ${shown}`),
        ok: `두 수에 똑같이 100을 곱해요 — ${A.u * 10} ÷ ${B.u} = ${ans}`,
        wr: [RIGHT, { text: `나누어지는 수를 한 자리만 옮겨서 ${T(shiftD(q, -1))}`, tag: TAGS.moves }, { text: '자릿수가 다른 소수끼리는 나눌 수 없어요', tag: OFF }],
        steps: [`두 수에 100을 곱해요 — ${A.u * 10} ÷ ${B.u}`, `${A.u * 10} ÷ ${B.u} = ${ans}`],
        whyAny: `나누는 수만 옮겼어요. 0보다 큰 수를 1보다 작은 수로 나누면 몫은 처음 수보다 커요 — ${shown}은 ${T(A)}보다 작아요.`,
        probe: { ask: 'divisor', calc: `${T(A)} ÷ ${T(B)}` },
      });
    },
  },

  {
    id: 'ddiv.natdec', grade: 6, name: '(자연수) ÷ (소수)', needs: ['ddiv.diff'],
    idea: '8 ÷ 0.5 — 두 수에 10을 곱하면 80 ÷ 5 = 16. 0.5가 8에 16번 들어가요. 5 ÷ 1.25는 100을 곱해 500 ÷ 125 = 4 — 자연수 뒤에 0을 붙여요. 0보다 큰 수를 1보다 작은 수로 나누면 몫은 처음 수보다 커요.',
    rule: '두 수에 같은 수를 곱해 나누는 수를 자연수로 — 자연수 쪽에는 0을 붙여요.',
    slip: '나누는 수가 1보다 작으면 몫이 처음 수보다 커지는지 봐요.',
    calc(r, c) {
      const one = (pB, qDec, t) => {
        const [B, q] = draw(() => [rd(r, 0, 2, pB), qDec ? rd(r, 1, 9, 1) : nat(int(r, 2, 40))], ([b, x]) => b.u >= 2 && isP(tidy(mulD(b, x)), 0) && tidy(mulD(b, x)).u >= 2);
        const A = tidy(mulD(B, q)); const ans = T(q);
        const wr = clean(ans, [W(shiftD(q, -pB), TAGS.divisorOnly), W(pB > 1 ? shiftD(q, -1) : null, TAGS.moves), W(shiftD(q, pB), TAGS.dividendOnly)]);
        return {
          t: t(T(A), T(B)), ans, wr,
          why: {
            [TAGS.divisorOnly]: `나누는 수만 옮겼어요 — ${T(A)}에도 ${P10[pB]}을 곱해 ${A.u * P10[pB]}로 만들어요.`,
            [TAGS.moves]: `${T(A)}에 0을 ${pB}개 붙여야 해요 — ${A.u * P10[pB]} ÷ ${B.u}.`,
            [TAGS.dividendOnly]: orDrop(shiftD(q, pB), q, '나누어지는 수만 옮겼', `두 수에 ${P10[pB]}을 곱하면 ${A.u * P10[pB]} ÷ ${B.u} = ${ans}`) || '나누어지는 수만 옮겼어요 — 두 수를 함께 옮겨요.',
          },
          steps: [`두 수에 ${P10[pB]}을 곱해요 — ${A.u * P10[pB]} ÷ ${B.u}`, `${T(A)} ÷ ${T(B)} = ${ans}`],
          probe: { ask: 'calc', pB, qDec },
        };
      };
      const bigger = () => {
        const N = int(r, 3, 9);
        const [lo, hi1, hi2] = draw(() => [rd(r, 0, 0, 1), rd(r, 1, 2, 1), rd(r, 1, 3, 1)], ([, y, z]) => !sameD(y, z));
        return {
          words: true,
          t: `계산하지 않고 고르려고 해요. 몫이 ${N}보다 큰 것은 어느 것일까요?`, ans: `${N} ÷ ${T(lo)}`,
          wr: [{ text: `${N} ÷ ${T(hi1)}`, tag: TAGS.divSmaller }, { text: `${N} ÷ ${T(hi2)}`, tag: TAGS.divSmaller }],
          why: { [TAGS.divSmaller]: `${N}를 1보다 큰 수로 나누면 몫이 ${N}보다 작아져요 — 나눈다고 늘 작아지는 건 아니에요.` },
          steps: [`${N} ÷ ${T(lo)} — ${T(lo)}는 1보다 작아서 ${N}에 ${T(lo)}가 ${N}번보다 많이 들어가요`, `0보다 큰 수를 1보다 작은 수로 나누면 몫은 처음 수보다 커요`],
          probe: { ask: 'bigger', N },
        };
      };
      return askFam(r, c, this, [
        famOf([one(1, false, (A, B) => calcQ(`${A} ÷ ${B}`))]),
        famOf([one(2, false, (A, B) => calcQ(`${A} ÷ ${B}`))]),
        famOf([one(1, true, (A, B) => calcQ(`${A} ÷ ${B}`))]),
        famOf([bigger()]),
      ]);
    },
    misread(r, c) {
      if (branchOf(r, c, ['big', 'zero']) === 'big') {
        const [B, q] = draw(() => [rd(r, 0, 0, 1), nat(int(r, 2, 20))], ([b, x]) => isP(tidy(mulD(b, x)), 0) && tidy(mulD(b, x)).u >= 2);
        const A = tidy(mulD(B, q)); const ans = T(q);
        return misAsk(r, c, this, 'big', {
          q: showWork(`${T(A)} ÷ ${T(B)}의 몫은 ${T(A)}보다 작아요`, '말했어요'),
          ok: `${T(A)}를 1보다 작은 ${T(B)}로 나누면 몫은 ${T(A)}보다 커요 — ${T(A)} ÷ ${T(B)} = ${ans}`,
          wr: [RIGHT, { text: `나누는 수만 옮겨서 ${T(shiftD(q, -1))}`, tag: TAGS.divisorOnly }, { text: '자연수는 소수로 나눌 수 없어요', tag: OFF }],
          steps: [`${T(B)}는 1보다 작아요 — ${T(A)}에 ${T(B)}가 ${T(A)}번보다 많이 들어가요`, `${A.u * 10} ÷ ${B.u} = ${ans}`],
          whyAny: '나누면 늘 작아진다고 생각했어요. 0보다 큰 수를 1보다 작은 수로 나누면 몫은 처음 수보다 커요.',
          probe: { ask: 'big', calc: `${T(A)} ÷ ${T(B)}`, base: T(A) },
        });
      }
      const [B, q] = draw(() => [rd(r, 0, 2, 2), nat(int(r, 2, 20))], ([b, x]) => b.u >= 12 && isP(tidy(mulD(b, x)), 0) && tidy(mulD(b, x)).u >= 2);
      const A = tidy(mulD(B, q)); const ans = T(q); const shown = T(shiftD(q, -1));
      return misAsk(r, c, this, 'zero', {
        q: WORK(`${T(A)} ÷ ${T(B)} = ${A.u * 10} ÷ ${B.u} = ${shown}`),
        ok: `두 수에 똑같이 100을 곱해요 — ${A.u * 100} ÷ ${B.u} = ${ans}`,
        wr: [RIGHT, { text: `나누는 수만 옮겨서 ${T(shiftD(q, -2))}`, tag: TAGS.divisorOnly }, { text: '자연수는 소수로 나눌 수 없어요', tag: OFF }],
        steps: [`${T(B)}에 100을 곱했으니 ${T(A)}에도 — 0을 2개 붙여 ${A.u * 100}`, `${A.u * 100} ÷ ${B.u} = ${ans}`],
        whyAny: `${T(A)}에 0을 하나만 붙였어요. 나누는 수를 두 자리 옮겼으면 ${T(A)}에도 0을 2개 붙여요.`,
        probe: { ask: 'zero', calc: `${T(A)} ÷ ${T(B)}` },
      });
    },
  },

  {
    id: 'ddiv.round', grade: 6, name: '몫을 반올림하여 나타내기', needs: ['ddiv.natdec'],
    idea: '2.5 ÷ 0.7 → 3.571… 처럼 나누어떨어지지 않으면 몫을 반올림해요. 소수 첫째 자리까지 나타내려면 **바로 아래** 소수 둘째 자리(7)를 보고 올려 3.6, 소수 둘째 자리까지면 3.57.',
    rule: '나타낼 자리 바로 아래 숫자가 0~4면 버리고, 5~9면 올려요.',
    slip: '나타낼 자리보다 한 자리 더 구한 다음 반올림했는지 봐요.',
    calc(r, c) {
      const PLACE = ['일의 자리까지', '소수 첫째 자리까지', '소수 둘째 자리까지'];
      // k자리까지 — 몫은 k자리에서 끝나지 않고, 반올림한 수의 끝자리는 0이 아니다(4.0이 안 나오게) · k=0이면 올리는 경우만(버림 오답이 생기게)
      const one = (A_, B_, k, t) => {
        const [A, B] = draw(() => [A_(), B_()], ([a, b]) => {
          // 몫은 1보다 크게 — 몫이 1보다 작으면 한 자리 위(일의 자리)·버린 값이 0이 되어 오답이 빠진다 (1.2 ÷ 2.8 = 0.428…, 씨앗 3,000개가 잡음)
          if (sameD(a, b) || divD(a, b, k) || roundQ(a, b, 0, 'down').u < 1) return false;
          const R = roundQ(a, b, k, 'half');
          if (R.u <= 0 || (k > 0 && (R.u % 10 === 0 || roundQ(a, b, k, "down").u % 10 === 0))) return false;
          const lp = roundQ(a, b, k + 1, 'half');
          if (lp.u % 10 === 0) return false;
          return k > 0 || (nextDigit(a, b, k) >= 5 && roundQ(a, b, 0, 'down').u >= 1);
        });
        const R = roundQ(A, B, k, 'half'); const ans = T(R);
        const nd = nextDigit(A, B, k); const dn = roundQ(A, B, k, 'down');
        const wr = clean(ans, [
          W(!sameD(dn, R) ? dn : null, nd === 5 ? TAGS.fiveDown : TAGS.roundDown),
          W(roundQ(A, B, k + 1, 'half'), TAGS.lowPlace), W(k > 0 ? roundQ(A, B, k - 1, 'half') : null, TAGS.highPlace),
        ]);
        const digits = fixed(roundQ(A, B, k + 1, 'down').u, k + 1);
        return {
          t: t(T(A), T(B), PLACE[k]), ans, wr,
          why: {
            [TAGS.roundDown]: `바로 아래 숫자가 ${nd}이니까 올려요.`,
            [TAGS.fiveDown]: '바로 아래 숫자가 5면 올려요 — 5부터 올려요.',
            [TAGS.lowPlace]: `${PLACE[k]} 나타내요 — 한 자리 아래까지 나타냈어요.`,
            [TAGS.highPlace]: `${PLACE[k]} 나타내요 — 한 자리 위까지 나타냈어요.`,
          },
          steps: [`${T(A)} ÷ ${T(B)} → ${digits}…`, `${PLACE[k]} — 바로 아래 숫자 ${nd}${nd >= 5 ? '는 올려' : '는 버려'} ${ans}`],
          probe: { ask: 'calc', k, nd },
        };
      };
      const Q = (t) => (A, B, place) => `다음 나눗셈의 몫을 반올림하여 ${place} 나타내면 얼마일까요?\n\n**${A} ÷ ${B}**${t}`;
      return askFam(r, c, this, [
        famOf([one(() => rd(r, 1, 9, 1), () => rd(r, 0, 2, 1), 1, Q(''))]),
        famOf([one(() => nat(int(r, 2, 30)), () => nat(pick(r, [3, 6, 7, 9, 11, 12])), 2, Q(''))]),
        famOf([one(() => rd(r, 2, 9, 1), () => rd(r, 0, 2, 1), 0, Q(''))]),
        famOf([one(() => rd(r, 1, 9, 1), () => nat(pick(r, [3, 6, 7, 9])), 2, Q(''))]),
      ]);
    },
    misread(r, c) {
      // 소수 첫째 자리까지 — 바로 아래 숫자 6~9 (버림과 다르게)
      const [A, B] = draw(() => [rd(r, 1, 9, 1), rd(r, 0, 2, 1)], ([a, b]) => !divD(a, b, 1) && nextDigit(a, b, 1) >= 6 && roundQ(a, b, 1, 'down').u % 10 !== 0 && roundQ(a, b, 1, 'half').u % 10 !== 0 && roundQ(a, b, 2, 'half').u % 10 !== 0 && b.u >= 2);
      const R = roundQ(A, B, 1, 'half'); const ans = T(R); const dn = T(roundQ(A, B, 1, 'down')); const digits = fixed(roundQ(A, B, 2, 'down').u, 2);
      if (branchOf(r, c, ['down', 'place']) === 'down') {
        return misAsk(r, c, this, 'down', {
          q: `몫을 반올림하여 소수 첫째 자리까지 나타내요.\n\n${WORK(`${T(A)} ÷ ${T(B)} → ${digits}… → ${dn}`)}`,
          ok: `바로 아래 숫자 ${nextDigit(A, B, 1)}는 올려요 — ${ans}`,
          wr: [RIGHT, { text: `소수 둘째 자리까지 나타내서 ${T(roundQ(A, B, 2, 'half'))}`, tag: TAGS.lowPlace }, { text: '나누어떨어지지 않으면 몫을 구할 수 없어요', tag: OFF }],
          steps: [`${T(A)} ÷ ${T(B)} → ${digits}…`, `소수 둘째 자리 ${nextDigit(A, B, 1)} — 올려서 ${ans}`],
          whyAny: `반올림하지 않고 버렸어요. 바로 아래 숫자가 ${nextDigit(A, B, 1)}이면 올려요.`,
          probe: { ask: 'down', calc: `${T(A)} ÷ ${T(B)}`, k: 1 },
        });
      }
      const low = T(roundQ(A, B, 2, 'half'));
      return misAsk(r, c, this, 'place', {
        q: `몫을 반올림하여 소수 첫째 자리까지 나타내요.\n\n${WORK(`${T(A)} ÷ ${T(B)} → ${digits}… → ${low}`)}`,
        ok: `소수 첫째 자리까지 — 바로 아래 숫자 ${nextDigit(A, B, 1)}를 보고 ${ans}`,
        wr: [RIGHT, { text: `반올림하지 않고 버려서 ${dn}`, tag: TAGS.roundDown }, { text: '나누어떨어지지 않으면 몫을 구할 수 없어요', tag: OFF }],
        steps: [`${T(A)} ÷ ${T(B)} → ${digits}…`, `소수 첫째 자리까지 — ${ans}`],
        whyAny: '한 자리 아래까지 나타냈어요. "소수 첫째 자리까지"면 답도 소수 첫째 자리까지예요.',
        probe: { ask: 'place', calc: `${T(A)} ÷ ${T(B)}`, k: 1 },
      });
    },
  },

  {
    id: 'ddiv.apply', grade: 6, name: '⭐ 나누어 주고 남는 양', needs: ['ddiv.round'],
    idea: '6.4 kg인 알밤을 한 사람에게 2.1 kg씩 나누어 주면 — 2.1 × 3 = 6.3이라 **3명**에게 주고, 6.4 − 6.3 = 0.1 → 남는 알밤은 **0.1 kg**. 사람 수는 자연수까지만 구해요. 남는 양은 몫의 소수 부분이 아니에요.',
    rule: '나누어 줄 수 있는 만큼(자연수)만 몫을 구하고, 남는 양은 처음 양에서 나누어 준 양을 빼서 구해요.',
    slip: '사람 수는 자연수인지, 남는 양을 처음 양에서 빼서 구했는지 봐요.',
    calc(r, c) {
      // 몇 명 — 나누는 양은 자연수(kg), 나누어지는 양은 소수 한 자리 (9.5 kg을 2 kg씩 → 4명)
      const count = () => {
        const [A, n] = draw(() => [rd(r, 4, 30, 1), int(r, 2, 6)], ([a, k]) => whole(a) >= 2 * k && a.u % (k * 10) !== 0);
        const k = Math.floor(A.u / (n * 10)); const ans = String(k);
        const wr = clean(ans, [W(nat(k + 1), TAGS.useUp), W(nat(Math.floor(A.u / n)), TAGS.dropPoint)]);
        return {
          t: `무게가 ${T(A)} kg인 알밤을 한 사람에게 ${n} kg씩 나누어 주려고 해요. 몇 명에게 나누어 줄 수 있을까요?`, ans, wr,
          why: {
            [TAGS.useUp]: `${n} kg보다 적게 남은 알밤으로는 한 사람에게 줄 수 없어요 — 사람 수는 올리지 않아요.`,
            [TAGS.dropPoint]: `${T(A)}에서 소수점을 빼면 안 돼요 — ${n} × ${k} = ${n * k}이라 ${k}명이에요.`,
          },
          steps: [`${n} × ${k} = ${n * k}, ${n} × ${k + 1} = ${n * (k + 1)}`, `${T(A)} kg에서 ${n} kg씩 — ${k}명`],
          probe: { ask: 'count', A: T(A), n },
        };
      };
      // 남는 양 — 몫이 소수 한 자리에서 끝나는 수 (6.6 kg을 1.5 kg씩 → 4명, 0.6 kg 남음 · 몫 4.4의 소수 부분 0.4와 다르다)
      const remain = () => {
        const [B, q] = draw(() => [rd(r, 1, 3, 1), rd(r, 2, 6, 1)], ([b, x]) => isP(tidy(mulD(b, x)), 1) && b.u % 10 !== 0 && (b.u * (x.u % 10)) % 10 === 0 && ((b.u * (x.u % 10)) / 10) % 10 !== 0);
        const A = tidy(mulD(B, q)); const k = whole(q); const rem = tidy({ u: A.u - B.u * k, p: 1 }); const ans = T(rem);
        const wr = clean(ans, [W(nat(rem.u), TAGS.remScaled), W({ u: q.u % 10, p: 1 }, TAGS.remFrac)]);
        return {
          t: `무게가 ${T(A)} kg인 알밤을 한 사람에게 ${T(B)} kg씩 나누어 주면, 나누어 주고 남는 알밤은 몇 kg일까요?`, ans, wr,
          why: {
            [TAGS.remScaled]: `${A.u} ÷ ${B.u}로 계산했으면 남는 양에는 처음 소수점을 다시 찍어요 — ${ans} kg.`,
            [TAGS.remFrac]: `몫 ${T(q)}의 소수 부분 0.${q.u % 10}은 남는 양이 아니에요 — ${T(B)} × ${k} = ${T(mulD(B, nat(k)))}을 빼요.`,
          },
          steps: [`${T(B)} × ${k} = ${T(mulD(B, nat(k)))} — ${k}명에게 줘요`, `${T(A)} − ${T(mulD(B, nat(k)))} = ${ans}`],
          probe: { ask: 'remain' },
        };
      };
      // 몇 배 — 파란 리본은 빨간 리본의 몇 배 (몫은 2·4·5·2.5·1.6처럼 끝나는 수)
      const times = () => {
        const [B, q] = draw(() => [rd(r, 0, 3, 1), D(pick(r, ['2', '4', '5', '8', '2.5', '1.6', '1.25', '3.2']))], ([b, x]) => b.u >= 2 && isP(tidy(mulD(b, x)), 1));
        const A = tidy(mulD(B, q)); const ans = T(q);
        const wr = clean(ans, [W(divD(B, A, 6), TAGS.swapDiv), W(shiftD(q, -1), TAGS.divisorOnly), W(shiftD(q, 1), TAGS.dividendOnly)]);
        return {
          t: `파란 리본의 길이는 ${T(A)} m, 빨간 리본의 길이는 ${T(B)} m — 파란 리본의 길이는 빨간 리본의 몇 배일까요?`, ans, wr,
          why: {
            [TAGS.swapDiv]: `"파란 리본은 빨간 리본의 몇 배" — 파란 리본의 길이를 빨간 리본의 길이로 나눠요.`,
            [TAGS.divisorOnly]: '나누는 수만 옮겼어요 — 두 수를 함께 옮겨요.',
            [TAGS.dividendOnly]: orDrop(shiftD(q, 1), q, '나누어지는 수만 옮겼', `두 수를 함께 옮기면 ${A.u} ÷ ${B.u} = ${ans}`) || '나누어지는 수만 옮겼어요 — 두 수를 함께 옮겨요.',
          },
          steps: [`${T(A)} ÷ ${T(B)} = ${A.u} ÷ ${B.u}`, `${A.u} ÷ ${B.u} = ${ans} — ${ans}배`],
          // 몫이 소수로 끝나는 문제 — 칸 규칙(자연수만·남는 양)을 물려받지 않는다 (Codex 39차 #2)
          rule: '"몇 배"는 비교하는 양을 기준이 되는 양으로 나눠요 — 두 수의 소수점은 똑같이 옮겨요.',
          whyAny: '무엇을 무엇으로 나누는지(기준이 되는 양으로), 두 수의 소수점을 똑같이 옮겼는지 봐요.',
          probe: { ask: 'times' },
        };
      };
      // 1 m의 무게 — 철근 몇 m의 무게로 1 m를 구한다
      const unit = () => {
        const [L, q] = draw(() => [rd(r, 1, 4, 1), rd(r, 1, 9, 1)], ([l, x]) => isP(tidy(mulD(l, x)), 2) && !sameD(l, x));
        const Wt = tidy(mulD(L, q)); const ans = T(q);
        const wr = clean(ans, [W(divD(L, Wt, 6), TAGS.swapDiv), W(shiftD(q, -1), TAGS.divisorOnly), W(shiftD(q, 1), TAGS.moves)]);
        return {
          t: `철근 ${T(L)} m의 무게가 ${T(Wt)} kg일 때, 이 철근 1 m의 무게는 몇 kg일까요?`, ans, wr,
          why: {
            [TAGS.swapDiv]: '1 m의 무게 = 무게 ÷ 길이 — 나누는 수와 나누어지는 수를 바꿨어요.',
            [TAGS.divisorOnly]: '나누는 수만 옮겼어요 — 두 수를 함께 옮겨요.',
            [TAGS.moves]: orDrop(shiftD(q, 1), q, '나누어지는 수를 두 자리 옮겼', `두 수를 한 자리씩 옮기면 ${T(shiftD(Wt, 1))} ÷ ${L.u} = ${ans}`) || '나누는 수를 한 자리 옮겼으면 나누어지는 수도 한 자리만 옮겨요.',
          },
          steps: [`1 m의 무게 = ${T(Wt)} ÷ ${T(L)} = ${T(shiftD(Wt, 1))} ÷ ${L.u}`, `${T(shiftD(Wt, 1))} ÷ ${L.u} = ${ans}`],
          rule: '1 m의 무게는 무게 ÷ 길이 — 두 수의 소수점을 똑같이 옮겨 나눠요.',
          whyAny: '무게를 길이로 나눴는지, 두 수의 소수점을 똑같이 옮겼는지 봐요.',
          probe: { ask: 'unit' },
        };
      };
      return askFam(r, c, this, [famOf([count()]), famOf([remain()]), famOf([times()]), famOf([unit()])]);
    },
    misread(r, c) {
      const [B, q] = draw(() => [rd(r, 1, 3, 1), rd(r, 2, 6, 1)], ([b, x]) => isP(tidy(mulD(b, x)), 1) && b.u % 10 !== 0 && (b.u * (x.u % 10)) % 10 === 0 && ((b.u * (x.u % 10)) / 10) % 10 !== 0);
      const A = tidy(mulD(B, q)); const k = whole(q); const rem = tidy({ u: A.u - B.u * k, p: 1 }); const ans = T(rem); const given = T(mulD(B, nat(k)));
      if (branchOf(r, c, ['frac', 'scaled']) === 'frac') {
        const shown = T({ u: q.u % 10, p: 1 });
        return misAsk(r, c, this, 'frac', {
          q: `${T(A)} kg인 알밤을 한 사람에게 ${T(B)} kg씩 나누어 주었어요.\n\n${showWork(`${T(A)} ÷ ${T(B)} = ${T(q)} — 남는 알밤은 ${shown} kg`, '말했어요')}`,
          ok: `${k}명에게 주는 양은 ${given} kg — 남는 양은 ${T(A)} − ${given} = ${ans}`,
          wr: [{ text: '맞게 말했어요', tag: RIGHT_AS_WRONG }, { text: `처음 소수점을 빼고 ${rem.u}`, tag: TAGS.remScaled }, { text: '소수끼리 나누면 남는 양이 없어요', tag: OFF }],
          steps: [`${T(B)} × ${k} = ${given}`, `${T(A)} − ${given} = ${ans}`],
          whyAny: `몫의 소수 부분을 남는 양으로 봤어요. ${shown}는 "${T(B)} kg씩 몇 번"의 0.${q.u % 10}번이지 남는 무게가 아니에요.`,
          probe: { ask: 'frac', calc: `${T(A)} − ${given}` },
        });
      }
      return misAsk(r, c, this, 'scaled', {
        q: `${T(A)} kg인 알밤을 한 사람에게 ${T(B)} kg씩 나누어 주었어요.\n\n${showWork(`${A.u} ÷ ${B.u}는 ${k}명에게 주고 ${rem.u} 남으니까, 남는 알밤은 ${rem.u} kg`, '말했어요')}`,
        ok: `남는 양에는 처음 소수점을 찍어요 — ${T(A)} − ${given} = ${ans}`,
        wr: [{ text: '맞게 말했어요', tag: RIGHT_AS_WRONG }, { text: `몫의 소수 부분이라서 ${T({ u: q.u % 10, p: 1 })}`, tag: TAGS.remFrac }, { text: '소수끼리 나누면 남는 양이 없어요', tag: OFF }],
        steps: [`${T(B)} × ${k} = ${given}`, `${T(A)} − ${given} = ${ans}`],
        whyAny: `옮긴 소수점을 그대로 썼어요. 남는 양은 처음 양 ${T(A)} kg보다 작아야 하고 ${T(B)} kg보다도 작아요.`,
        probe: { ask: 'scaled', calc: `${T(A)} − ${given}` },
      });
    },
  },
];

export function conceptById(id) {
  return DDIV.find((c) => c.id === id) || null;
}

// ───────────────────── 문항 만들기 (mathdmul과 같은 모양) ─────────────────────

const SLIP = '한 번 더 천천히 — 몫의 소수점 자리를 보고, 몫 × 나누는 수가 나누어지는 수가 되는지 확인해요.';
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
  return diagnosticOf(DDIV, makeQuestion, seed, n, opts);
}
export function placeFrom(answers) {
  return placeFromOf(DDIV, answers);
}
export function ladder(doneIds) {
  return ladderOf(DDIV, doneIds);
}

// ───────────────────── 사람이 쓴 내용 검사 (check.mjs가 부른다) ─────────────────────

function badPlaceholders(txt) {
  const leak = String(txt || '').match(/\{[^}]*\}/g) || [];
  return leak.filter((l) => !/^\{(me|mon|mon2)(\/[^/}]+\/[^}]+)?\}$/.test(l));
}
/** 글자 → 분수 값 {n, d} (checkHuman이 쓴다) */
const ratOf = (t) => { const x = D(String(t || '').trim()); return x ? { n: x.u, d: P10[x.p] } : null; };

/**
 * coach/math/decdiv.json 형식 검사 — mathdmul.checkContent와 같은 규칙
 * @returns {string[]}
 */
export function checkContent(content) {
  const bad = [];
  const same = (a, b) => !!(a && b && a.n * b.d === b.n * a.d);
  for (const c of DDIV) {
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
