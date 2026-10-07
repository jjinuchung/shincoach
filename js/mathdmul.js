// ✖️ 수학 — W 소수의 곱셈 줄기 (초5 「소수의 곱셈」 5-2): 개념 사다리 + 문제 생성기 + 내용 형식 검사.
// 순수 함수만 — 화면 없음 (node 테스트에서 그대로 돈다).
//
// 왜 이 줄기인가 (2026-10-07, 아버님 "Codex 37차를 먼저 끝낸 후에 W 설계부터" → 설계안 "이대로 진행"):
//   C 소수 줄기의 곱셈은 두 칸뿐(소수 × 자연수 · 소수 × 소수)이고 배움 장이 없다 — A 분수 줄기를 V·U·T로 세운 것과 같은 빈자리.
//   소수의 곱셈은 "소수점 찍기 오류 > 자연수 곱셈 오류 > 알고리즘 오류" 순으로 흔하고 자릿수가 늘수록 많아진다(2022 미래엔 5-2 지도서).
//   (아이 기록의 수치·칸별 진단은 공개 코드에 적지 않는다 — Codex 36·37차, 기록은 비공개 저장소에만)
// 칸 범위: 2015 미래엔 5-2 지도서 4단원 차시 계획(플립북 237쪽): (소수)×(자연수) 한 자리 → 두 자리 → (자연수)×(소수) 한 자리 → 두 자리
//   → (소수)×(소수) 한 자리 × 한 자리 → 두 자리 × 한 자리·한 자리 × 두 자리 → 곱의 소수점 위치 → 문제 해결 (2022 미래엔 5-2 4단원도 같은 일곱 차시)
//   · 241쪽 "곱해지는 소수가 1보다 큰지, 작은지보다 소수점 아래 자리 수에 따른 난이도에 더욱 영향" → 칸을 한 자리·두 자리로 나눈다
//   · 시각 모델 "수 모형, 띠 모델, 넓이 모델" → mathdraw `[dmul rep|band|area]` · 271쪽 곱의 소수점 위치(10배마다 오른쪽, 1/10배마다 왼쪽, 자리 수의 합)
//   · 2022 성취기준 [6수01-13] 소수의 곱셈의 계산 원리를 탐구하고 그 계산을 할 수 있다
//     (고려사항: 원리를 이해하는 수준 · 복잡한 계산은 계산기 · 어림셈이 필요한 실생활 상황).
// 답의 꼴: 끝자리 0을 지운 꼴(0.25 × 4 = 1). 숫자판은 지우지 않은 답(1.00)도 맞음 — 지도서 채점 기준 "끝자리 0을 생략하지 않은 경우도 정답".
// 오답은 아이가 실제로 하는 틀린 생각 흉내 — C 소수 줄기·U 줄기 이름표와 같은 말을 쓴다(📊에서 같은 오개념으로 모인다):
//   소수점을 빼먹음 · 소수점 위치를 잘못 찍음(익힘 53쪽 6.39 × 7 = 447.3) · 소수점 자리 수를 더하지 않음 · 분모를 10으로 봄(익힘 57쪽 13 × 0.38 = 49.4)
//   · 받아올림을 안 함(자연수 곱셈 오류) · 소수점을 반대로 옮김 · 옮긴 칸 수가 틀림 · 0을 붙임 · 곱하면 항상 커진다 · 곱하지 않고 더함
//   + 새것: 자연수 부분과 소수 부분을 따로 곱함(2.3 × 4 → 8.12)
//
// 새 줄기의 함정(메모 stem-generator-pitfalls)을 처음부터:
//   · 가족 = 틀 여러 개 — 🔁 쌍둥이가 요청한 틀(tplKey)로 온다 · ② 갈래마다 key
//   · ★ 단위 글자(m·L·kg·km) 바로 뒤에는 조사를 붙이지 않는다 · 수 뒤 조사는 jfix가 끝자리 소리로 고친다(2.1을 · 0.4는)
//   · 수가 답인 ①은 숫자판 · 고르는 ①은 "어느 것" 말투
//   · 오답끼리·정답과 같은 값은 뽑지 않는다(clean → probe.allWrong) · 틀린 방법이 우연히 바른 값을 내면 그 오답은 버린다
// ★ 정답·오답은 테스트가 **문제 글을 따로 읽어** 소수 셈으로 다시 푼다 (tests/mathdmul.test.js).

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
/** 무작위 소수 — 정수 부분 lo~hi, 소수 p자리, 마지막 자리는 0이 아니게 (3.40은 글자로 3.4라 "두 자리 소수"를 물을 수 없다) */
function rd(r, lo, hi, p) {
  const w = int(r, lo, hi);
  let f = int(r, 0, P10[p] - 1);
  if (f % 10 === 0) f += int(r, 1, 9);
  // 0.1 · 0.01은 뽑지 않는다 — × 0.1은 W7 "곱의 소수점 위치" 문제가 된다 (그 칸 밖에서 판정이 갈린다)
  if (w === 0 && f === 1) f += int(r, 1, 8);
  return { u: w * P10[p] + f, p };
}
const mulD = (a, b) => ({ u: a.u * b.u, p: a.p + b.p });
const addD = (a, b) => { const p = Math.max(a.p, b.p); return { u: a.u * P10[p - a.p] + b.u * P10[p - b.p], p }; };
const sameD = (a, b) => !!(a && b && a.u * P10[b.p] === b.u * P10[a.p]);
const whole = (x) => Math.floor(x.u / P10[x.p]);
const fpart = (x) => x.u % P10[x.p];
/** 글자 → 분수 값 {n, d} (checkHuman이 쓴다) */
const ratOf = (t) => { const x = D(String(t || '').trim()); return x ? { n: x.u, d: P10[x.p] } : null; };
/** 조건에 맞을 때까지 다시 뽑기 */
function draw(gen, ok) {
  for (let k = 0; k < 4000; k++) { const v = gen(); if (ok(v)) return v; }
  throw new Error('draw: 조건에 맞는 수를 못 뽑음');
}

// ───────────────────── 틀린 셈 (아이가 실제로 하는 계산을 그대로) ─────────────────────

const WR = {
  /** 소수점을 빼먹음 — 자연수처럼 곱하고 끝 */
  drop: (a, b) => String(a.u * b.u),
  /** 소수점 위치를 한 자리 잘못 — 두 수의 자리 수 합 + d */
  pos: (a, b, d) => { const p = a.p + b.p + d; return p >= 0 ? decText(a.u * b.u, p) : ''; },
  /** 소수점 자리 수를 더하지 않음 — 두 수 중 많은 쪽의 자리 수만 */
  places: (a, b) => decText(a.u * b.u, Math.max(a.p, b.p)),
  /** 분모를 10으로 봄 — 소수 두 자리 수를 (숫자)/10으로 (13 × 0.38 = 13 × 38/10) */
  tenth: (n, x) => decText(n.u * x.u, 1),
  /** 곱하지 않고 더함 */
  add: (a, b) => T(addD(a, b)),
  /** 자연수 부분과 소수 부분을 따로 곱해 이어 씀 — (소수) × (자연수): 2.3 × 4 → 8 과 12 → 8.12 (소수 부분의 곱이 자리를 넘칠 때만 바른 답과 다르다) */
  splitNat: (x, n) => (whole(x) >= 1 && fpart(x) * n >= P10[x.p] ? T(D(`${whole(x) * n}.${fpart(x) * n}`)) : ''),
  /** (소수 한 자리) × (소수 한 자리): 1.9 × 2.8 → 1 × 2 와 9 × 8 → 2.72 */
  splitDec: (a, b) => (a.p === 1 && b.p === 1 && (whole(a) >= 1 || whole(b) >= 1) ? T(D(`${whole(a) * whole(b)}.${fpart(a) * fpart(b)}`)) : ''),
  /** 받아올림을 안 함 — 자연수 곱셈에서 아랫자리의 받아올림을 버림 (곱하는 수가 한 자리 수일 때만) */
  noCarry: (x, n) => {
    if (n < 2 || n > 9) return '';
    const ds = String(x.u).split('').map(Number);
    let carry = false;
    const parts = ds.map((d, i) => { const v = d * n; if (i > 0 && v >= 10) carry = true; return i === 0 ? String(v) : String(v % 10); });
    return carry ? decText(Number(parts.join('')), x.p) : '';
  },
};
/** 오답 후보 정리 — 빈 글자·정답과 같은 값·앞의 오답과 같은 값은 버린다 (probe.allWrong이 곧 이 목록) */
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

// ───────────────────── 보기 ─────────────────────

/** 정답 근처의 "계산 실수" — 오개념 오답이 모자랄 때만 (같은 자리 수에서 ±) */
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
/** 고른 틀로 ① 문항 만들기 — v: { t, ans, wr, steps, why, whyAny, rule, words(말 보기), probe } */
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

/** 이 줄기의 오개념 이름표 (📊·🤔 노트·결과 카드에 그대로 뜬다) — 이름표 하나에 셈 하나 · C·U 줄기와 같은 말 */
export const TAGS = {
  dropPoint: '소수점을 빼먹음',
  pointPos: '소수점 위치를 잘못 찍음',
  placesNotAdded: '소수점 자리 수를 더하지 않음',
  tenth: '분모를 10으로 봄',
  noCarry: '받아올림을 안 함',
  splitMul: '자연수 부분과 소수 부분을 따로 곱함',
  addInstead: '곱하지 않고 더함',
  reverse: '소수점을 반대로 옮김',
  moves: '옮긴 칸 수가 틀림',
  padZero: '0을 붙임',
  mulBigger: '곱하면 항상 커진다',
};

/** (소수) × (자연수) · (자연수) × (소수) 오답 이유 — 이 문제의 수로, 문제의 곱셈 순서 그대로 (natFirst = 자연수가 앞, W3·W4)
 *  (헤드리스가 잡음: "2 m 리본의 0.3배" 풀이 카드가 "0.3 × 2는 0.3을 2번 더한 거예요"로 순서를 뒤집어 말했다) */
function whyNat(a, n, ans, places, natFirst = false) {
  const e = natFirst ? `${n} × ${a.u}` : `${a.u} × ${n}`;
  return {
    [TAGS.dropPoint]: `소수점을 빼먹었어요 — ${e} = ${a.u * n}은 ${places}이 ${a.u * n}개라는 뜻이에요. 곱은 ${ans}.`,
    [TAGS.pointPos]: `소수점을 한 자리 잘못 찍었어요 — ${natFirst ? '곱하는' : '곱해지는'} 수의 소수 자리 수만큼 곱도 소수 ${a.p}자리예요.`,
    [TAGS.tenth]: `소수 두 자리 수는 분모가 100인 분수예요 — ${T(a)} = ${a.u}/${P10[a.p]}.`,
    [TAGS.splitMul]: `자연수 부분과 소수 부분을 따로 곱하면 안 돼요 — 소수 부분의 곱이 자리를 넘쳐요. ${places}이 ${a.u * n}개예요.`,
    [TAGS.noCarry]: `자연수 곱셈에서 받아올림을 빠뜨렸어요 — ${e} = ${a.u * n}.`,
    [TAGS.addInstead]: natFirst ? `더하지 않고 곱해요 — ${n} × ${T(a)}는 ${n}의 ${T(a)}배예요.` : `더하지 않고 곱해요 — ${T(a)} × ${n}은 ${T(a)}를 ${n}번 더한 거예요.`,
  };
}

// ───────────────────── 개념 사다리 (W. 소수의 곱셈 줄기) ─────────────────────

export const DMUL = [
  {
    id: 'dmul.d1nat', grade: 5, name: '(소수 한 자리 수) × (자연수)', needs: [],
    idea: '0.7 × 3 — 0.7은 0.1이 7개라서 0.7 × 3은 0.1이 7 × 3 = 21개 → **2.1**. 분수로 바꿔도 돼요: 0.7 × 3 = 7/10 × 3 = 21/10 = 2.1. 2.3 × 4는 23 × 4 = 92의 1/10배라서 9.2.',
    rule: '자연수처럼 곱한 다음, 곱해지는 수의 소수 자리 수만큼 소수점을 찍어요.',
    slip: '소수점을 빼먹지 않았는지, 곱이 어림한 값과 비슷한지 봐요.',
    calc(r, c) {
      const one = (big, t) => {
        const a = rd(r, big ? 1 : 0, big ? 9 : 0, 1); const n = int(r, 2, 9); const N = nat(n);
        const ans = T(mulD(a, N));
        const wr = clean(ans, [
          { text: WR.drop(a, N), tag: TAGS.dropPoint }, { text: WR.pos(a, N, 1), tag: TAGS.pointPos }, { text: WR.splitNat(a, n), tag: TAGS.splitMul },
          { text: WR.noCarry(a, n), tag: TAGS.noCarry }, { text: WR.add(a, N), tag: TAGS.addInstead },
        ]);
        return {
          t: t(T(a), n), ans, wr, why: whyNat(a, n, ans, '0.1'),
          steps: [`${T(a)}은 0.1이 ${a.u}개 — 0.1이 ${a.u} × ${n} = ${a.u * n}개`, `${T(a)} × ${n} = ${ans}`],
          probe: { ask: 'calc', big },
        };
      };
      return askFam(r, c, this, [
        famOf([one(false, (A, n) => calcQ(`${A} × ${n}`))]),
        famOf([one(true, (A, n) => calcQ(`${A} × ${n}`))]),
        famOf([one(false, (A, n) => `{mon/은/는} 하루에 나무열매 주스를 ${A} L씩 마셔요. ${n}일 동안 마신 주스는 모두 몇 L일까요?`)]),
        famOf([one(true, (A, n) => `한 상자의 무게가 ${A} kg인 몬스터볼 상자가 ${n}개 있어요. 상자는 모두 몇 kg일까요?`)]),
      ]);
    },
    misread(r, c) {
      if (branchOf(r, c, ['drop', 'est']) === 'drop') {
        // 1.2 × 6 = 7.2 = 1.2 + 6 — 더한 값이 우연히 곱과 같은 수는 다시 뽑는다
        const [a, n] = draw(() => [rd(r, 0, 3, 1), int(r, 2, 9)], ([x, k]) => !sameD(addD(x, nat(k)), mulD(x, nat(k))));
        const N = nat(n); const ans = T(mulD(a, N)); const drop = WR.drop(a, N);
        return misAsk(r, c, this, 'drop', {
          q: WORK(`${T(a)} × ${n} = ${drop}`),
          ok: `소수점을 찍어요 — ${T(a)} × ${n} = ${ans}`,
          wr: [RIGHT, { text: `곱하지 않고 더해서 ${WR.add(a, N)}`, tag: TAGS.addInstead }, { text: '소수는 자연수와 곱할 수 없어요', tag: OFF }],
          steps: [`0.1이 ${a.u} × ${n} = ${a.u * n}개`, `${T(a)} × ${n} = ${ans}`],
          whyAny: `소수점을 빼먹었어요. ${T(a)}이 ${n}개라서 ${ans}쯤이어야 해요 — ${drop}은 너무 커요.`,
          probe: { ask: 'drop', calc: `${T(a)} × ${n}` },
        });
      }
      const a = rd(r, 1, 6, 1); const n = int(r, 2, 9); const N = nat(n);
      const ans = T(mulD(a, N)); const shown = WR.pos(a, N, 1);
      return misAsk(r, c, this, 'est', {
        q: `어림해서 확인해요.\n\n${WORK(`${T(a)} × ${n} = ${shown}`)}`,
        ok: `${T(a)}는 ${whole(a)}보다 크니까 곱은 ${whole(a) * n}보다 커요 — ${T(a)} × ${n} = ${ans}`,
        wr: [RIGHT, { text: `소수점을 빼서 ${WR.drop(a, N)}`, tag: TAGS.dropPoint }, { text: '소수의 곱셈은 어림할 수 없어요', tag: OFF }],
        steps: [`어림하면 ${whole(a)} × ${n} = ${whole(a) * n}보다 커요`, `${a.u} × ${n} = ${a.u * n} — 소수 한 자리로 ${ans}`],
        whyAny: `소수점을 한 자리 더 옮겼어요. 어림하면 ${whole(a) * n}보다 커야 해요.`,
        probe: { ask: 'est', calc: `${T(a)} × ${n}` },
      });
    },
  },

  {
    id: 'dmul.d2nat', grade: 5, name: '(소수 두 자리 수) × (자연수)', needs: ['dmul.d1nat'],
    idea: '0.46 × 7 — 0.46은 0.01이 46개라서 0.01이 46 × 7 = 322개 → **3.22**. 1.27 × 5는 1.27을 5번 더한 것과 같아요 — 127 × 5 = 635의 1/100배라서 6.35.',
    rule: '자연수처럼 곱한 다음 소수 두 자리로 — 곱의 1/100배예요.',
    slip: '소수 두 자리 수를 곱했으면 곱도 소수 두 자리인지 봐요.',
    calc(r, c) {
      const one = (big, t) => {
        const a = rd(r, big ? 1 : 0, big ? 6 : 0, 2); const n = int(r, 2, 9); const N = nat(n);
        const ans = T(mulD(a, N));
        const wr = clean(ans, [
          { text: WR.pos(a, N, -1), tag: TAGS.pointPos }, { text: WR.drop(a, N), tag: TAGS.dropPoint }, { text: WR.splitNat(a, n), tag: TAGS.splitMul },
          { text: WR.noCarry(a, n), tag: TAGS.noCarry }, { text: WR.add(a, N), tag: TAGS.addInstead }, { text: WR.pos(a, N, 1), tag: TAGS.pointPos },
        ]);
        return {
          t: t(T(a), n), ans, wr, why: whyNat(a, n, ans, '0.01'),
          steps: [`${T(a)}은 0.01이 ${a.u}개 — ${a.u} × ${n} = ${a.u * n}`, `0.01이 ${a.u * n}개 — ${T(a)} × ${n} = ${ans}`],
          probe: { ask: 'calc', big },
        };
      };
      return askFam(r, c, this, [
        famOf([one(false, (A, n) => calcQ(`${A} × ${n}`))]),
        famOf([one(true, (A, n) => calcQ(`${A} × ${n}`))]),
        famOf([one(true, (A, n) => `{me/은/는} 날마다 ${A} km씩 달려요. ${n}일 동안 달린 거리는 모두 몇 km일까요?`)]),
        famOf([one(false, (A, n) => `한 컵에 ${A} L씩 담긴 물이 ${n}컵 있어요. 물은 모두 몇 L일까요?`)]),
      ]);
    },
    misread(r, c) {
      if (branchOf(r, c, ['pos', 'split']) === 'pos') {
        const a = rd(r, 1, 8, 2); const n = int(r, 2, 9); const N = nat(n);
        const ans = T(mulD(a, N)); const shown = WR.pos(a, N, -1);
        return misAsk(r, c, this, 'pos', {
          q: WORK(`${T(a)} × ${n} = ${shown}`),
          ok: `${T(a)}는 ${a.u}의 1/100배라서 곱도 ${a.u * n}의 1/100배 — ${T(a)} × ${n} = ${ans}`,
          wr: [RIGHT, { text: `소수점을 빼서 ${WR.drop(a, N)}`, tag: TAGS.dropPoint }, { text: '소수 두 자리 수는 자연수와 곱할 수 없어요', tag: OFF }],
          steps: [`${a.u} × ${n} = ${a.u * n}`, `1/100배 — ${T(a)} × ${n} = ${ans}`],
          whyAny: `소수 두 자리 수를 곱했는데 곱을 소수 한 자리로 썼어요. 어림하면 ${whole(a)} × ${n} = ${whole(a) * n}쯤이에요.`,
          probe: { ask: 'pos', calc: `${T(a)} × ${n}` },
        });
      }
      const [a, n] = draw(() => [rd(r, 1, 5, 2), int(r, 3, 9)], ([x, k]) => !!WR.splitNat(x, k));
      const N = nat(n); const ans = T(mulD(a, N)); const shown = WR.splitNat(a, n);
      return misAsk(r, c, this, 'split', {
        q: WORK(`${T(a)} × ${n} = ${shown}`),
        ok: `자연수 부분과 소수 부분을 따로 곱하면 안 돼요 — ${T(a)} × ${n} = ${ans}`,
        wr: [RIGHT, { text: `소수점을 한 자리만 옮겨 ${WR.pos(a, N, -1)}`, tag: TAGS.pointPos }, { text: '소수 두 자리 수는 자연수와 곱할 수 없어요', tag: OFF }],
        steps: [`${a.u} × ${n} = ${a.u * n}`, `0.01이 ${a.u * n}개 — ${ans}`],
        whyAny: `${whole(a)} × ${n}과 ${fpart(a)} × ${n}을 따로 곱해 이어 썼어요. 소수 부분의 곱 ${fpart(a) * n}은 1을 넘어요.`,
        probe: { ask: 'split', calc: `${T(a)} × ${n}` },
      });
    },
  },

  {
    id: 'dmul.natd1', grade: 5, name: '(자연수) × (소수 한 자리 수)', needs: ['dmul.d2nat'],
    idea: '2 × 0.9 — 2의 0.9배는 2를 똑같이 10묶음으로 나눈 것 중 9묶음이에요. 한 칸이 0.1이면 18칸 → **1.8**. 1보다 작은 수를 곱하면 처음 수보다 작아져요. 곱하는 순서를 바꿔도 곱은 같아요 — 4 × 3.2 = 3.2 × 4 = 12.8.',
    rule: '자연수처럼 곱한 다음 소수 한 자리로 — 1보다 작은 수를 곱하면 작아져요.',
    slip: '1보다 작은 소수를 곱했는데 곱이 처음 수보다 커지지 않았는지 봐요.',
    calc(r, c) {
      const one = (big, t) => {
        const n = int(r, 2, 9); const N = nat(n); const a = rd(r, big ? 1 : 0, big ? 9 : 0, 1);
        const ans = T(mulD(N, a));
        const wr = clean(ans, [
          { text: WR.drop(N, a), tag: TAGS.dropPoint }, { text: WR.pos(N, a, 1), tag: TAGS.pointPos }, { text: WR.splitNat(a, n), tag: TAGS.splitMul },
          { text: WR.noCarry(a, n), tag: TAGS.noCarry }, { text: WR.add(N, a), tag: TAGS.addInstead },
        ]);
        return {
          t: t(n, T(a)), ans, wr, why: whyNat(a, n, ans, '0.1', true),
          steps: [`${n} × ${a.u} = ${n * a.u}`, `그 1/10배 — ${n} × ${T(a)} = ${ans}`],
          probe: { ask: 'calc', big },
        };
      };
      return askFam(r, c, this, [
        famOf([one(false, (n, A) => calcQ(`${n} × ${A}`))]),
        famOf([one(true, (n, A) => calcQ(`${n} × ${A}`))]),
        famOf([one(false, (n, A) => `{mon/은/는} ${n} m 리본의 ${A}배만큼을 썼어요. 쓴 리본은 몇 m일까요?`)]),
        famOf([one(true, (n, A) => `한 바퀴가 ${n} km인 산책길을 ${A}바퀴 걸었어요. 걸은 거리는 모두 몇 km일까요?`)]),
      ]);
    },
    misread(r, c) {
      if (branchOf(r, c, ['small', 'pos']) === 'small') {
        const n = int(r, 2, 4); const N = nat(n); const a = rd(r, 0, 0, 1);
        const ans = T(mulD(N, a)); const drop = WR.drop(N, a);
        return misAsk(r, c, this, 'small', {
          q: `그림을 보고 곱셈을 계산해요.\n\n[dmul band ${n} ${T(a)}]\n\n${WORK(`${n} × ${T(a)} = ${drop}`)}`,
          ok: `${n}의 ${T(a)}배는 ${n}보다 작아요 — ${n} × ${T(a)} = ${ans}`,
          wr: [RIGHT, { text: `곱하지 않고 더해서 ${WR.add(N, a)}`, tag: TAGS.addInstead }, { text: '자연수에 소수를 곱할 수는 없어요', tag: OFF }],
          steps: [`${n}을 똑같이 10묶음으로 나눈 것 중 ${a.u}묶음 — 0.1이 ${n * a.u}칸`, `${n} × ${T(a)} = ${ans}`],
          whyAny: `소수점을 빼먹었어요. 1보다 작은 수를 곱하면 처음 수 ${n}보다 작아져야 해요.`,
          probe: { ask: 'small', calc: `${n} × ${T(a)}` },
        });
      }
      const n = int(r, 2, 9); const N = nat(n); const a = rd(r, 1, 6, 1);
      const ans = T(mulD(N, a)); const shown = WR.pos(N, a, 1);
      return misAsk(r, c, this, 'pos', {
        q: `어림해서 확인해요.\n\n${WORK(`${n} × ${T(a)} = ${shown}`)}`,
        ok: `${T(a)}는 ${whole(a)}보다 크니까 곱은 ${n * whole(a)}보다 커요 — ${n} × ${T(a)} = ${ans}`,
        wr: [RIGHT, { text: `소수점을 빼서 ${WR.drop(N, a)}`, tag: TAGS.dropPoint }, { text: '자연수에 소수를 곱할 수는 없어요', tag: OFF }],
        steps: [`어림하면 ${n} × ${whole(a)} = ${n * whole(a)}보다 커요`, `${n} × ${a.u} = ${n * a.u} — 소수 한 자리로 ${ans}`],
        whyAny: `소수점을 한 자리 더 옮겼어요. ${n}의 ${T(a)}배는 ${n}보다 커요.`,
        probe: { ask: 'pos', calc: `${n} × ${T(a)}` },
      });
    },
  },

  {
    id: 'dmul.natd2', grade: 5, name: '(자연수) × (소수 두 자리 수)', needs: ['dmul.natd1'],
    idea: '6 × 0.64 — 0.64는 64의 1/100배라서 6 × 64 = 384의 1/100배 → **3.84**. 분수로 바꾸면 0.64 = 64/100 — 분모가 100이에요(10이 아니에요). 3 × 3.16 = 9.48.',
    rule: '자연수처럼 곱한 다음 소수 두 자리로 — 소수 두 자리 수는 분모가 100인 분수예요.',
    slip: '소수 두 자리 수를 분모가 10인 분수로 보지 않았는지 봐요.',
    calc(r, c) {
      const one = (big, two, t) => {
        const n = two ? int(r, 11, 19) : int(r, 2, 9); const N = nat(n); const a = rd(r, big ? 1 : 0, big ? 4 : 0, 2);
        const ans = T(mulD(N, a));
        const wr = clean(ans, [
          { text: WR.tenth(N, a), tag: TAGS.tenth }, { text: WR.drop(N, a), tag: TAGS.dropPoint }, { text: WR.pos(N, a, 1), tag: TAGS.pointPos },
          { text: WR.splitNat(a, n), tag: TAGS.splitMul }, { text: WR.noCarry(a, n), tag: TAGS.noCarry }, { text: WR.add(N, a), tag: TAGS.addInstead },
        ]);
        return {
          t: t(n, T(a)), ans, wr, why: whyNat(a, n, ans, '0.01', true),
          steps: [`${T(a)}는 ${a.u}의 1/100배 — ${n} × ${a.u} = ${n * a.u}`, `그 1/100배 — ${n} × ${T(a)} = ${ans}`],
          probe: { ask: 'calc', big, two },
        };
      };
      return askFam(r, c, this, [
        famOf([one(false, false, (n, A) => calcQ(`${n} × ${A}`))]),
        famOf([one(true, false, (n, A) => calcQ(`${n} × ${A}`))]),
        famOf([one(false, true, (n, A) => calcQ(`${n} × ${A}`))]),
        famOf([one(false, false, (n, A) => `{mon/은/는} 무게가 ${n} kg인 나무열매 바구니의 ${A}배만큼을 먹었어요. 먹은 나무열매는 몇 kg일까요?`)]),
      ]);
    },
    misread(r, c) {
      if (branchOf(r, c, ['tenth', 'drop']) === 'tenth') {
        const n = int(r, 11, 19); const N = nat(n); const a = rd(r, 0, 0, 2);
        const ans = T(mulD(N, a)); const shown = WR.tenth(N, a);
        return misAsk(r, c, this, 'tenth', {
          q: WORK(`${n} × ${T(a)} = ${n} × ${a.u}/10 = ${shown}`),
          ok: `${T(a)}는 분모가 100인 분수예요 — ${n} × ${T(a)} = ${ans}`,
          wr: [RIGHT, { text: `소수점을 빼서 ${WR.drop(N, a)}`, tag: TAGS.dropPoint }, { text: '자연수와 소수 두 자리 수는 곱할 수 없어요', tag: OFF }],
          steps: [`${T(a)} = ${a.u}/100 — ${n} × ${a.u} = ${n * a.u}`, `그 1/100배 — ${n} × ${T(a)} = ${ans}`],
          whyAny: `분모를 10으로 봤어요. ${T(a)}는 1보다 작으니 곱은 ${n}보다 작아야 해요.`,
          probe: { ask: 'tenth', calc: `${n} × ${T(a)}` },
        });
      }
      const n = int(r, 2, 9); const N = nat(n); const a = rd(r, 0, 0, 2);
      const ans = T(mulD(N, a)); const drop = WR.drop(N, a);
      return misAsk(r, c, this, 'drop', {
        q: WORK(`${n} × ${T(a)} = ${drop}`),
        ok: `소수점을 찍어요 — ${n} × ${T(a)} = ${ans}`,
        wr: [RIGHT, { text: `분모를 10으로 봐서 ${WR.tenth(N, a)}`, tag: TAGS.tenth }, { text: '자연수와 소수 두 자리 수는 곱할 수 없어요', tag: OFF }],
        steps: [`${n} × ${a.u} = ${n * a.u}`, `그 1/100배 — ${ans}`],
        whyAny: `소수점을 빼먹었어요. ${T(a)}는 1보다 작으니 곱은 ${n}보다 작아야 해요.`,
        probe: { ask: 'drop', calc: `${n} × ${T(a)}` },
      });
    },
  },

  {
    id: 'dmul.d1d1', grade: 5, name: '(소수 한 자리 수) × (소수 한 자리 수)', needs: ['dmul.natd2'],
    idea: '0.4 × 0.8 — 1 m² 정사각형을 가로·세로 10칸씩(한 칸 0.01 m²)으로 나눠 가로 4칸, 세로 8칸을 칠하면 두 번 칠한 칸이 32개 → **0.32**. 분수로는 4/10 × 8/10 = 32/100 = 0.32. 0.1 × 0.1 = 0.01 — 소수 한 자리 수끼리 곱하면 소수 두 자리 수예요. 1.9 × 2.8 = 5.32.',
    rule: '자연수처럼 곱한 다음 소수 두 자리로 — 두 수의 소수 자리 수를 더해요.',
    slip: '소수 한 자리 수끼리 곱했는데 곱을 소수 한 자리로 쓰지 않았는지 봐요.',
    calc(r, c) {
      const one = (shape, t) => {
        const [a, b] = shape === 'small' ? [rd(r, 0, 0, 1), rd(r, 0, 0, 1)] : shape === 'one' ? [rd(r, 1, 5, 1), rd(r, 0, 0, 1)] : [rd(r, 1, 4, 1), rd(r, 1, 4, 1)];
        const ans = T(mulD(a, b));
        const wr = clean(ans, [
          { text: WR.places(a, b), tag: TAGS.placesNotAdded }, { text: WR.drop(a, b), tag: TAGS.dropPoint },
          { text: WR.splitDec(a, b), tag: TAGS.splitMul }, { text: WR.add(a, b), tag: TAGS.addInstead },
        ]);
        return {
          t: t(T(a), T(b)), ans, wr,
          why: {
            [TAGS.placesNotAdded]: `소수 한 자리 수끼리 곱하면 소수 두 자리 수예요 — 0.1 × 0.1 = 0.01.`,
            [TAGS.dropPoint]: `소수점을 빼먹었어요 — ${a.u} × ${b.u} = ${a.u * b.u}은 0.01이 ${a.u * b.u}개예요.`,
            [TAGS.splitMul]: `자연수 부분과 소수 부분을 따로 곱하면 안 돼요 — ${a.u} × ${b.u} = ${a.u * b.u}에서 소수 두 자리로.`,
            [TAGS.addInstead]: `더하지 않고 곱해요 — 넓이는 가로 × 세로예요.`,
          },
          steps: [`${a.u} × ${b.u} = ${a.u * b.u}`, `소수 한 자리 × 소수 한 자리 → 소수 두 자리 — ${T(a)} × ${T(b)} = ${ans}`],
          probe: { ask: 'calc', shape },
        };
      };
      return askFam(r, c, this, [
        famOf([one('small', (A, B) => calcQ(`${A} × ${B}`))]),
        famOf([one('one', (A, B) => calcQ(`${A} × ${B}`))]),
        famOf([one('big', (A, B) => calcQ(`${A} × ${B}`))]),
        famOf([one('small', (A, B) => `가로가 ${A} m, 세로가 ${B} m인 직사각형 모양 꽃밭이 있어요. 꽃밭의 넓이는 몇 m²일까요?`)]),
      ]);
    },
    misread(r, c) {
      if (branchOf(r, c, ['places', 'split']) === 'places') {
        const a = rd(r, 0, 0, 1); const b = rd(r, 0, 0, 1);
        const ans = T(mulD(a, b)); const shown = WR.places(a, b);
        return misAsk(r, c, this, 'places', {
          q: `그림을 보고 곱셈을 계산해요.\n\n[dmul area ${T(a)} ${T(b)}]\n\n${WORK(`${T(a)} × ${T(b)} = ${shown}`)}`,
          ok: `진한 칸 한 칸은 0.01이에요 — ${T(a)} × ${T(b)} = ${ans}`,
          wr: [RIGHT, { text: `소수점을 빼서 ${WR.drop(a, b)}`, tag: TAGS.dropPoint }, { text: '1보다 작은 소수끼리는 곱할 수 없어요', tag: OFF }],
          steps: [`진한 칸 ${a.u} × ${b.u} = ${a.u * b.u}개 — 한 칸 0.01`, `${T(a)} × ${T(b)} = ${ans}`],
          whyAny: `소수 한 자리로 썼어요. 1보다 작은 두 수를 곱했는데 ${shown}은 두 수보다 커요.`,
          probe: { ask: 'places', calc: `${T(a)} × ${T(b)}` },
        });
      }
      const [a, b] = draw(() => [rd(r, 1, 4, 1), rd(r, 1, 4, 1)], ([x, y]) => { const s = WR.splitDec(x, y); return !!s && !sameD(D(s), mulD(x, y)); });
      const ans = T(mulD(a, b)); const shown = WR.splitDec(a, b);
      return misAsk(r, c, this, 'split', {
        q: WORK(`${T(a)} × ${T(b)} = ${shown}`),
        ok: `자연수 부분과 소수 부분을 따로 곱하면 안 돼요 — ${T(a)} × ${T(b)} = ${ans}`,
        wr: [RIGHT, { text: `소수점 자리 수를 하나만 세어 ${WR.places(a, b)}`, tag: TAGS.placesNotAdded }, { text: '1보다 큰 소수끼리는 곱할 수 없어요', tag: OFF }],
        steps: [`${a.u} × ${b.u} = ${a.u * b.u}`, `소수 두 자리로 — ${ans}`],
        whyAny: `${whole(a)} × ${whole(b)}과 ${fpart(a)} × ${fpart(b)}만 곱했어요. 어림하면 ${whole(a)} × ${whole(b)} = ${whole(a) * whole(b)}보다 커요.`,
        probe: { ask: 'split', calc: `${T(a)} × ${T(b)}` },
      });
    },
  },

  {
    id: 'dmul.d2d1', grade: 5, name: '(소수 두 자리 수) × (소수 한 자리 수)', needs: ['dmul.d1d1'],
    idea: '0.58 × 0.3 — 58 × 3 = 174, 소수 두 자리 × 소수 한 자리 → 소수 세 자리 → **0.174**. 분수로는 58/100 × 3/10 = 174/1000. 5.1 × 1.12 = 5.712 — 곱하는 순서가 바뀌어도 자리 수를 더해요.',
    rule: '자연수처럼 곱한 다음, 두 수의 소수 자리 수를 더한 만큼 소수점을 찍어요.',
    slip: '두 수의 소수 자리 수를 더했는지 봐요.',
    calc(r, c) {
      const one = (flip, big, t) => {
        const x = rd(r, big ? 1 : 0, big ? 5 : 0, 2); const y = rd(r, big ? 1 : 0, big ? 3 : 0, 1);
        const [a, b] = flip ? [y, x] : [x, y];
        const ans = T(mulD(a, b));
        const wr = clean(ans, [
          { text: WR.places(a, b), tag: TAGS.placesNotAdded }, { text: WR.drop(a, b), tag: TAGS.dropPoint },
          { text: WR.pos(a, b, 1), tag: TAGS.pointPos }, { text: WR.add(a, b), tag: TAGS.addInstead },
        ]);
        return {
          t: t(T(a), T(b)), ans, wr,
          why: {
            [TAGS.placesNotAdded]: `두 수의 소수 자리 수를 더해요 — ${a.p}자리 + ${b.p}자리 = ${a.p + b.p}자리.`,
            [TAGS.dropPoint]: `소수점을 빼먹었어요 — ${a.u} × ${b.u} = ${a.u * b.u}에서 소수 ${a.p + b.p}자리로.`,
            [TAGS.pointPos]: `소수점을 한 자리 더 옮겼어요 — 곱은 소수 ${a.p + b.p}자리예요.`,
            [TAGS.addInstead]: '더하지 않고 곱해요.',
          },
          steps: [`${a.u} × ${b.u} = ${a.u * b.u}`, `소수 ${a.p}자리 + ${b.p}자리 = ${a.p + b.p}자리 — ${T(a)} × ${T(b)} = ${ans}`],
          probe: { ask: 'calc', flip, big },
        };
      };
      return askFam(r, c, this, [
        famOf([one(false, false, (A, B) => calcQ(`${A} × ${B}`))]),
        famOf([one(true, false, (A, B) => calcQ(`${A} × ${B}`))]),
        famOf([one(false, true, (A, B) => calcQ(`${A} × ${B}`))]),
        famOf([one(true, true, (A, B) => `1 m의 무게가 ${A} kg인 철사가 있어요. 이 철사 ${B} m의 무게는 몇 kg일까요?`)]),
      ]);
    },
    misread(r, c) {
      if (branchOf(r, c, ['places', 'est']) === 'places') {
        const a = rd(r, 0, 0, 2); const b = rd(r, 0, 0, 1);
        const ans = T(mulD(a, b)); const shown = WR.places(a, b);
        return misAsk(r, c, this, 'places', {
          q: WORK(`${T(a)} × ${T(b)} = ${shown}`),
          ok: `소수 두 자리 × 소수 한 자리는 소수 세 자리 — ${T(a)} × ${T(b)} = ${ans}`,
          wr: [RIGHT, { text: `소수점을 빼서 ${WR.drop(a, b)}`, tag: TAGS.dropPoint }, { text: '자리 수가 다른 소수끼리는 곱할 수 없어요', tag: OFF }],
          steps: [`${a.u} × ${b.u} = ${a.u * b.u}`, `2자리 + 1자리 = 3자리 — ${ans}`],
          whyAny: `소수 자리 수를 더하지 않았어요. 1보다 작은 두 수의 곱은 두 수보다 작아야 해요.`,
          probe: { ask: 'places', calc: `${T(a)} × ${T(b)}` },
        });
      }
      const a = rd(r, 2, 6, 2); const b = rd(r, 1, 3, 1);
      const ans = T(mulD(a, b)); const shown = WR.pos(a, b, 1);
      return misAsk(r, c, this, 'est', {
        q: `어림해서 확인해요.\n\n${WORK(`${T(a)} × ${T(b)} = ${shown}`)}`,
        ok: `어림하면 ${whole(a)} × ${whole(b)} = ${whole(a) * whole(b)}보다 커요 — ${T(a)} × ${T(b)} = ${ans}`,
        wr: [RIGHT, { text: `소수 자리 수를 하나만 세어 ${WR.places(a, b)}`, tag: TAGS.placesNotAdded }, { text: '소수의 곱셈은 어림할 수 없어요', tag: OFF }],
        steps: [`${a.u} × ${b.u} = ${a.u * b.u}`, `소수 3자리 — ${ans}`],
        whyAny: `소수점을 한 자리 더 옮겼어요. 어림하면 ${whole(a) * whole(b)}보다 커야 해요.`,
        probe: { ask: 'est', calc: `${T(a)} × ${T(b)}` },
      });
    },
  },

  {
    id: 'dmul.point', grade: 5, name: '곱의 소수점 위치', needs: ['dmul.d2d1'],
    idea: '곱하는 수가 10배가 될 때마다 곱의 소수점이 **오른쪽으로 한 자리씩** — 2.45 × 10 = 24.5, 2.45 × 100 = 245. 곱하는 수가 1/10배가 될 때마다 **왼쪽으로 한 자리씩** — 2450 × 0.1 = 245, 2450 × 0.01 = 24.5. 6 × 8 = 48이면 0.6 × 0.08 = 0.048 — 소수 한 자리 + 두 자리 = 세 자리.',
    rule: '× 10·100·1000은 소수점을 오른쪽으로, × 0.1·0.01·0.001은 왼쪽으로 — 소수끼리는 자리 수를 더해요.',
    slip: '소수점을 옮기는 방향과 칸 수를 봐요 — 0을 붙이는 게 아니에요.',
    calc(r, c) {
      const up = () => {
        const a = rd(r, 1, 9, int(r, 2, 3)); const k = int(r, 1, 3); const M = nat(P10[k]);
        const ans = T(mulD(a, M));
        const wr = clean(ans, [
          { text: decText(a.u, a.p + k), tag: TAGS.reverse }, { text: T(mulD(a, nat(P10[k + 1]))), tag: TAGS.moves },
          { text: k > 1 ? T(mulD(a, nat(P10[k - 1]))) : '', tag: TAGS.moves }, { text: `${T(a)}${'0'.repeat(k)}`, tag: TAGS.padZero },
        ]);
        return {
          t: calcQ(`${T(a)} × ${P10[k]}`), ans, wr,
          why: {
            [TAGS.reverse]: `${P10[k]}을 곱하면 커져요 — 소수점을 오른쪽으로 옮겨요.`,
            [TAGS.moves]: `${P10[k]}은 0이 ${k}개 — 소수점을 ${k}자리 옮겨요.`,
            [TAGS.padZero]: '소수 뒤에 0을 붙이면 값이 그대로예요 — 소수점을 옮겨요.',
          },
          steps: [`${P10[k]}을 곱하면 소수점이 오른쪽으로 ${k}자리`, `${T(a)} × ${P10[k]} = ${ans}`],
          probe: { ask: 'up', k },
        };
      };
      const down = (natural) => {
        const k = int(r, 1, 3); const a = natural ? nat(int(r, 11, 99) * 10 + int(r, 1, 9)) : rd(r, 10, 99, 1); const M = { u: 1, p: k };
        const ans = T(mulD(a, M));
        const wr = clean(ans, [
          { text: T(mulD(a, nat(P10[k]))), tag: TAGS.reverse }, { text: T(mulD(a, { u: 1, p: k + 1 })), tag: TAGS.moves },
          { text: k > 1 ? T(mulD(a, { u: 1, p: k - 1 })) : '', tag: TAGS.moves },
        ]);
        return {
          t: calcQ(`${T(a)} × ${T(M)}`), ans, wr,
          why: {
            [TAGS.reverse]: `${T(M)}을 곱하면 작아져요 — 소수점을 왼쪽으로 옮겨요.`,
            [TAGS.moves]: `${T(M)}은 소수 ${k}자리 — 소수점을 왼쪽으로 ${k}자리 옮겨요.`,
          },
          steps: [`${T(M)}을 곱하면 소수점이 왼쪽으로 ${k}자리`, `${T(a)} × ${T(M)} = ${ans}`],
          probe: { ask: 'down', k, natural },
        };
      };
      const sum = () => {
        const [x, y, px, py] = draw(() => [int(r, 2, 9), int(r, 2, 9), int(r, 1, 2), int(r, 1, 2)], ([x1, y1, p1, p2]) => p1 + p2 >= 2 && (x1 * y1) % 10 !== 0);
        const a = { u: x, p: px }; const b = { u: y, p: py };
        const ans = T(mulD(a, b));
        const wr = clean(ans, [
          { text: WR.places(a, b), tag: TAGS.placesNotAdded }, { text: WR.pos(a, b, 1), tag: TAGS.pointPos },
          { text: WR.pos(a, b, -1), tag: TAGS.pointPos }, { text: WR.drop(a, b), tag: TAGS.dropPoint },
        ]);
        return {
          t: `${x} × ${y} = ${x * y} — 이 곱셈을 이용하여 다음을 계산하면 얼마일까요?\n\n**${T(a)} × ${T(b)}**`, ans, wr,
          why: {
            [TAGS.placesNotAdded]: `두 수의 소수 자리 수를 더해요 — ${px}자리 + ${py}자리 = ${px + py}자리.`,
            [TAGS.pointPos]: `곱은 소수 ${px + py}자리예요 — 한 자리 잘못 옮겼어요.`,
            [TAGS.dropPoint]: `${x * y}에 소수점을 찍어야 해요 — 소수 ${px + py}자리.`,
          },
          steps: [`${x} × ${y} = ${x * y}`, `소수 ${px}자리 + ${py}자리 = ${px + py}자리 — ${T(a)} × ${T(b)} = ${ans}`],
          probe: { ask: 'sum' },
        };
      };
      return askFam(r, c, this, [famOf([up()]), famOf([down(true)]), famOf([down(false)]), famOf([sum()])]);
    },
    misread(r, c) {
      const a = rd(r, 1, 9, 2); const ans = T(mulD(a, nat(10)));
      if (branchOf(r, c, ['reverse', 'zero']) === 'reverse') {
        const shown = decText(a.u, a.p + 1);
        return misAsk(r, c, this, 'reverse', {
          q: WORK(`${T(a)} × 10 = ${shown}`),
          ok: `10을 곱하면 소수점이 오른쪽으로 한 자리 — ${T(a)} × 10 = ${ans}`,
          wr: [RIGHT, { text: `0을 붙여 ${T(a)}0`, tag: TAGS.padZero }, { text: '소수에는 10을 곱할 수 없어요', tag: OFF }],
          steps: ['10을 곱하면 커져요 — 소수점이 오른쪽으로 한 자리', `${T(a)} × 10 = ${ans}`],
          whyAny: `소수점을 반대쪽으로 옮겼어요. 10을 곱했는데 ${shown}은 처음 수보다 작아요.`,
          probe: { ask: 'reverse', calc: `${T(a)} × 10` },
        });
      }
      const shown = `${T(a)}0`;
      return misAsk(r, c, this, 'zero', {
        q: WORK(`${T(a)} × 10 = ${shown}`),
        ok: `0을 붙이는 게 아니라 소수점을 옮겨요 — ${T(a)} × 10 = ${ans}`,
        wr: [RIGHT, { text: `소수점을 왼쪽으로 옮겨 ${decText(a.u, a.p + 1)}`, tag: TAGS.reverse }, { text: '소수에는 10을 곱할 수 없어요', tag: OFF }],
        steps: ['10을 곱하면 소수점이 오른쪽으로 한 자리', `${T(a)} × 10 = ${ans}`],
        whyAny: `소수 뒤에 0을 붙이면 ${shown} = ${T(a)} — 값이 그대로예요. 소수점을 옮겨요.`,
        probe: { ask: 'zero', calc: `${T(a)} × 10` },
      });
    },
  },

  {
    id: 'dmul.apply', grade: 5, name: '⭐ 소수의 곱셈 활용', needs: ['dmul.point'],
    idea: '생활 속 곱셈 — 1 kg에 3200원인 고구마 2.5 kg의 값은 3200 × 2.5 = 8000원. 계산하기 전에 어림해요: 2.5는 3보다 작으니 3200 × 3 = 9600보다 적어요. **1보다 큰 수를 곱하면 커지고, 1보다 작은 수를 곱하면 작아져요.**',
    rule: '무엇과 무엇을 곱하는지 정하고, 어림한 값과 맞는지 확인해요.',
    slip: '곱이 어림한 값과 비슷한지, 1보다 작은 수를 곱했는데 커지지 않았는지 봐요.',
    calc(r, c) {
      const price = () => {
        const X = int(r, 15, 60) * 100; const a = rd(r, 1, 4, 1); const XN = nat(X);
        const ans = T(mulD(XN, a));
        const wr = clean(ans, [{ text: WR.drop(XN, a), tag: TAGS.dropPoint }, { text: WR.pos(XN, a, 1), tag: TAGS.pointPos }]);
        return {
          t: `1 kg에 ${X}원인 고구마를 ${T(a)} kg 샀어요. 고구마값은 몇 원일까요?`, ans, wr,
          why: { [TAGS.dropPoint]: `소수점을 빼먹었어요 — ${X} × ${a.u} = ${X * a.u}의 1/10배예요.`, [TAGS.pointPos]: `곱은 소수 한 자리만 옮겨요 — ${X} × ${a.u}의 1/10배.` },
          steps: [`어림하면 ${X} × ${whole(a)} = ${X * whole(a)}보다 많아요`, `${X} × ${T(a)} = ${ans}`],
          probe: { ask: 'price' },
        };
      };
      const area = () => {
        const a = rd(r, 1, 6, 1); const b = rd(r, 1, 4, 1);
        const ans = T(mulD(a, b));
        const wr = clean(ans, [
          { text: WR.places(a, b), tag: TAGS.placesNotAdded }, { text: WR.add(a, b), tag: TAGS.addInstead },
          { text: WR.drop(a, b), tag: TAGS.dropPoint }, { text: WR.splitDec(a, b), tag: TAGS.splitMul },
        ]);
        return {
          t: `가로가 ${T(a)} m, 세로가 ${T(b)} m인 직사각형 모양의 텃밭이 있어요. 텃밭의 넓이는 몇 m²일까요?`, ans, wr,
          why: {
            [TAGS.placesNotAdded]: '소수 한 자리 수끼리 곱하면 소수 두 자리 수예요.',
            [TAGS.addInstead]: '넓이는 가로와 세로를 곱해요 — 더하면 둘레의 반이에요.',
            [TAGS.dropPoint]: `소수점을 빼먹었어요 — ${a.u} × ${b.u} = ${a.u * b.u}에서 소수 두 자리로.`,
            [TAGS.splitMul]: '자연수 부분과 소수 부분을 따로 곱하면 안 돼요.',
          },
          steps: [`넓이 = 가로 × 세로 — ${a.u} × ${b.u} = ${a.u * b.u}`, `소수 두 자리로 — ${T(a)} × ${T(b)} = ${ans}`],
          probe: { ask: 'area' },
        };
      };
      const times = () => {
        const a = rd(r, 1, 9, 1); const b = rd(r, 0, 1, 1);
        const ans = T(mulD(a, b));
        const wr = clean(ans, [{ text: WR.places(a, b), tag: TAGS.placesNotAdded }, { text: WR.drop(a, b), tag: TAGS.dropPoint }, { text: WR.add(a, b), tag: TAGS.addInstead }]);
        return {
          t: `{mon/이/가} 가진 리본은 ${T(a)} m짜리예요. {mon2/이/가} 가진 리본은 그 ${T(b)}배라면 몇 m일까요?`, ans, wr,
          why: {
            [TAGS.placesNotAdded]: '소수 한 자리 수끼리 곱하면 소수 두 자리 수예요.',
            [TAGS.dropPoint]: `소수점을 빼먹었어요 — ${a.u} × ${b.u} = ${a.u * b.u}에서 소수 두 자리로.`,
            [TAGS.addInstead]: '"몇 배"는 곱셈이에요 — 더하지 않아요.',
          },
          steps: [`${T(a)}의 ${T(b)}배 — ${a.u} × ${b.u} = ${a.u * b.u}`, `${T(a)} × ${T(b)} = ${ans}`],
          probe: { ask: 'times' },
        };
      };
      const bigger = () => {
        const N = int(r, 3, 9);
        const [hi, lo1, lo2] = draw(() => [rd(r, 1, 1, 1), rd(r, 0, 0, 1), rd(r, 0, 0, 1)], ([x, y, z]) => !sameD(y, z));
        return {
          words: true,
          t: `계산하지 않고 고르려고 해요. 곱이 ${N}보다 큰 것은 어느 것일까요?`, ans: `${N} × ${T(hi)}`,
          wr: [{ text: `${N} × ${T(lo1)}`, tag: TAGS.mulBigger }, { text: `${N} × ${T(lo2)}`, tag: TAGS.mulBigger }],
          why: { [TAGS.mulBigger]: '1보다 작은 수를 곱하면 처음 수보다 작아져요 — 곱한다고 늘 커지는 건 아니에요.' },
          steps: [`${T(hi)}는 1보다 커요 — ${N} × ${T(hi)} = ${T(mulD(nat(N), hi))}`, `1보다 작은 수를 곱하면 ${N}보다 작아져요`],
          probe: { ask: 'bigger', N },
        };
      };
      return askFam(r, c, this, [famOf([price()]), famOf([area()]), famOf([times()]), famOf([bigger()])]);
    },
    misread(r, c) {
      if (branchOf(r, c, ['est', 'big']) === 'est') {
        const X = int(r, 15, 60) * 100; const a = rd(r, 1, 4, 1); const XN = nat(X);
        const ans = T(mulD(XN, a)); const drop = WR.drop(XN, a);
        return misAsk(r, c, this, 'est', {
          q: `1 kg에 ${X}원인 고구마를 ${T(a)} kg 샀어요.\n\n${WORK(`${X} × ${T(a)} = ${drop}`)}`,
          ok: `어림하면 ${X} × ${whole(a) + 1} = ${X * (whole(a) + 1)}보다 적어요 — ${X} × ${T(a)} = ${ans}`,
          wr: [RIGHT, { text: `소수점을 두 자리 옮겨 ${WR.pos(XN, a, 1)}`, tag: TAGS.pointPos }, { text: '돈은 소수와 곱할 수 없어요', tag: OFF }],
          steps: [`어림하면 ${X} × ${whole(a) + 1} = ${X * (whole(a) + 1)}보다 적어요`, `${X} × ${T(a)} = ${ans}`],
          whyAny: `소수점을 빼먹었어요. ${T(a)} kg값이 ${whole(a) + 1} kg값보다 많을 수는 없어요.`,
          probe: { ask: 'est', calc: `${X} × ${T(a)}` },
        });
      }
      const N = int(r, 3, 9); const b = rd(r, 0, 0, 1); const ans = T(mulD(nat(N), b));
      return misAsk(r, c, this, 'big', {
        q: showWork(`${N} × ${T(b)}는 ${N}보다 커요`, '말했어요'),
        ok: `1보다 작은 수를 곱하면 작아져요 — ${N} × ${T(b)} = ${ans}`,
        wr: [{ text: '맞게 말했어요', tag: RIGHT_AS_WRONG }, { text: `곱하지 않고 더해서 ${WR.add(nat(N), b)}`, tag: TAGS.addInstead }, { text: '자연수에 소수를 곱할 수는 없어요', tag: OFF }],
        steps: [`${T(b)}는 1보다 작아요`, `${N} × ${T(b)} = ${ans} — ${N}보다 작아요`],
        whyAny: '곱하면 늘 커진다고 생각했어요. 1보다 작은 수를 곱하면 처음 수보다 작아져요.',
        probe: { ask: 'big', calc: `${N} × ${T(b)}`, base: String(N) },
      });
    },
  },
];

export function conceptById(id) {
  return DMUL.find((c) => c.id === id) || null;
}

// ───────────────────── 문항 만들기 (mathfadd와 같은 모양) ─────────────────────

const SLIP = '한 번 더 천천히 — 소수점 아래 자리 수를 세고, 곱이 어림한 값과 비슷한지 확인해요.';
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
  return diagnosticOf(DMUL, makeQuestion, seed, n, opts);
}
export function placeFrom(answers) {
  return placeFromOf(DMUL, answers);
}
export function ladder(doneIds) {
  return ladderOf(DMUL, doneIds);
}

// ───────────────────── 사람이 쓴 내용 검사 (check.mjs가 부른다) ─────────────────────

function badPlaceholders(txt) {
  const leak = String(txt || '').match(/\{[^}]*\}/g) || [];
  return leak.filter((l) => !/^\{(me|mon|mon2)(\/[^/}]+\/[^}]+)?\}$/.test(l));
}

/**
 * coach/math/decmul.json 형식 검사 — mathfadd.checkContent와 같은 규칙 (값은 소수까지 읽는다)
 * @returns {string[]}
 */
export function checkContent(content) {
  const bad = [];
  const same = (a, b) => !!(a && b && a.n * b.d === b.n * a.d);
  for (const c of DMUL) {
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
