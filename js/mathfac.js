// 🔢 수학 — G 약수와 배수 줄기 (초5 1학기 「약수와 배수」):
// 개념 사다리 + 문제 생성기 + 내용 형식 검사. 순수 함수만 — 화면 없음 (node 테스트에서 그대로 돈다).
//
// 왜 이 줄기인가 (2026-09-30, 아버님 "1단계 시작하자"): 이미 만든 두 줄기가 이것을 안다고 치고 있다 —
// A 분수의 약분·통분(최소공배수), F 비와 비율의 간단한 자연수의 비(최대공약수·분모의 공배수).
// 그런데 약수·배수 자체를 가르치는 칸이 없어서, 거기서 막히면 되돌아가 배울 곳이 없었다.
// 글자 D는 문자와 식 몫으로 비워 두었고 F까지 썼으므로 G.
//
// 오답은 아이가 실제로 하는 틀린 생각 흉내다:
//   · 1이나 자기 자신을 약수에서 빠뜨림 · 36의 6처럼 짝이 같은 약수를 빠뜨림
//   · 약수와 배수를 뒤바꿈 (8의 배수 = 1, 2, 4, 8) · 3의 배수 = 3, 13, 23, 33 (끝자리가 같으면 배수)
//   · 최소공배수 = 두 수의 곱 · 최대공약수 = 가장 작은 공약수
//   · 나눗셈 사다리에서 아래 수를 곱함 / 왼쪽 수만 곱함
//   · "최대 몇 명에게 나눠 줄까"와 "다음에 함께 오는 날"을 바꿔 씀
//
// 새 줄기의 함정(메모 stem-generator-pitfalls)을 처음부터:
//   · 🔁 쌍둥이 틀 이름(tplKey)이 수에 따라 갈리지 않게 — 나눗셈 사다리는 **늘 두 번**, 곱셈식은 **늘 소인수 세 개**
//   · ② 갈래는 요청(want)을 따르고, 진단 보기가 그 예에서만 우연히 맞는 말이 되지 않게
//   · 이름표는 값만이 아니라 **방향**까지 (더함/뺌·어느 자리) — 테스트가 문제 글을 직접 읽어 확인한다
//
// ★ 답은 테스트가 **따로 만든 계산기**로, 문제 글을 **직접 읽어** 다시 푼다.

import { figureSvg } from './mathdraw.js';
import { rng, shuffle, fill, castOf, worldPick, ask, solve, int, pick, pickFamily, humanQuestion, checkHuman, diagnosticOf, placeFromOf, ladderOf, gcd, lcm, numJosa } from './mathgen.js';
import { gradeLabel, valueOf as numValue } from './mathmix.js';

export { gradeLabel };

// ───────────────────── 수 ─────────────────────

/** n의 약수 (작은 수부터) */
export function divisorsOf(n) {
  const out = [];
  for (let d = 1; d <= n; d++) if (n % d === 0) out.push(d);
  return out;
}
/** 수 목록 글자 "1, 2, 3, 6" */
const L = (arr) => arr.join(', ');
/** k의 배수 n개 (k부터) */
const firstMultiples = (k, n) => Array.from({ length: n }, (_, i) => k * (i + 1));
/** 1 다음으로 작은 약수 (= 가장 작은 소인수) */
const smallestPrime = (n) => { for (let p = 2; p <= n; p++) if (n % p === 0) return p; return n; };
/** 소인수 곱셈식 재료 (작은 수부터) — 12 → [2, 2, 3] */
function factorsOf(n) {
  const out = []; let x = n;
  for (let p = 2; x > 1; p++) while (x % p === 0) { out.push(p); x /= p; }
  return out;
}
const times = (arr) => arr.join(' × ');
/** 두 곱셈식에 **함께** 들어 있는 곱 (겹치는 만큼) */
function commonFactors(fa, fb) {
  const rest = [...fb]; const out = [];
  for (const p of fa) { const i = rest.indexOf(p); if (i >= 0) { out.push(p); rest.splice(i, 1); } }
  return out;
}

/**
 * 보기 글자 → 값 (겹침 검사용). 수 목록("1, 2, 3, 6")·말 보기는 null.
 * 화면이 G().valueOf를 부르는데 숫자를 돌려주므로 🎯 감 잡기(1/2보다 큰가?)는 이 줄기에 붙지 않는다 (B·C·F와 같다)
 */
export function valueOf(text) {
  const s = String(text == null ? '' : text).trim();
  if (/\d, \d/.test(s)) return null;
  return numValue(s);
}
const sameValue = (a, b) => a !== null && b !== null && Math.abs(a - b) < 1e-9;

// ── 조사 — 수 뒤에서는 읽는 소리로 (12 십이·36 삼십육…). 수 목록은 마지막 수를 읽는다 ──
const BAT = new Set(['0', '1', '3', '6', '7', '8']);
const lastDigit = (t) => String(t).replace(/\D+$/, '').slice(-1);
/** 수 글자 + 조사 (이/가·을/를·은/는·과/와·이에요/예요·이라서/라서…) */
function jn(t, withB, without) {
  const s = String(t);
  return s + (BAT.has(lastDigit(s)) ? withB : without);
}
/** 수 글자 + (으)로 — ㄹ받침(1·7·8) 뒤에는 '로' */
function ro(t) {
  const s = String(t);
  return s + numJosa(Number(lastDigit(s)), '으로', '로');
}

// ───────────────────── 보기 ─────────────────────

/** 정답 근처의 "계산 실수" — 보기가 모자랄 때만 (자연수 답) */
function nearOf(answer, k) {
  const v = Number(answer); const st = [1, -1, 2, -2, 3, -3, 5, -5][k % 8];
  return Number.isInteger(v) && v + st > 0 ? String(v + st) : '';
}
/** 수 보기 4개 — 정답 + 오개념 오답. 글자·값이 같은 보기는 넣지 않는다 */
function choices(r, answer, wrongs) {
  const list = [{ text: String(answer), ok: true }];
  const vals = [valueOf(answer)];
  const seen = new Set([String(answer)]);
  const dup = (t) => { const v = valueOf(t); return seen.has(String(t)) || (v !== null && vals.some((x) => sameValue(x, v))); };
  const add = (t, tag) => { seen.add(String(t)); vals.push(valueOf(t)); list.push({ text: String(t), ok: false, tag }); };
  for (const w of wrongs) {
    if (!w || w.text === undefined || w.text === '' || dup(w.text) || list.length >= 4) continue;
    add(w.text, w.tag);
  }
  for (let k = 0; list.length < 4 && k < 30; k++) {
    const alt = nearOf(answer, k);
    if (alt && !dup(alt)) add(alt, '계산 실수');
  }
  return shuffle(r, list);
}
/**
 * 목록·말 보기, 그리고 "~가 아닌 것은?" — 근처 수로 채우지 않는다
 * (채운 수가 또 "약수가 아닌 수"면 답이 둘이 된다)
 */
function textChoices(r, ok, wrongs) {
  const list = [{ text: ok, ok: true }];
  const seen = new Set([ok]);
  for (const w of wrongs) {
    if (!w || !w.text || seen.has(w.text) || list.length >= 4) continue;
    seen.add(w.text);
    list.push({ text: w.text, ok: false, tag: w.tag });
  }
  return shuffle(r, list);
}

/** ② 갈래 고르기 — 🔁 쌍둥이·🤔 오답 노트가 요청한 갈래를 먼저 (Codex 12차 P1, mathdec·mathneg·mathrat와 같은 규칙) */
function branchOf(r, c, names) {
  const want = c && c.want && c.want.startsWith('misread:') ? c.want.slice(8) : '';
  if (names.includes(want)) return want;
  const fresh = names.filter((n) => !(c && c.recent && c.recent.includes(`misread:${n}`)));
  return pick(r, fresh.length ? fresh : names);
}
function misreadAsk(id, branch, q, chs, o) {
  return { ...ask(id, 'misread', q, chs, o), key: `misread:${branch}` };
}
const showWork = (line, verb = '말했어요') => `{mon/이/가} 이렇게 ${verb}.\n\n**${line}**\n\n어디가 틀렸을까요?`;
const step = (no, text) => `${['①', '②', '③', '④'][no] || '·'} ${text}`;

const RIGHT_AS_WRONG = '틀린 줄 모름';
const OFF = '엉뚱한 지적';
const MIS_OK = '오개념을 옳다고 함';

/** 이 줄기의 오개념 이름표 (📊·🤔 노트에 그대로 뜬다) */
export const TAGS = {
  missEnds: '1이나 자기 자신을 빠뜨림',
  missPair: '약수 짝을 빠뜨림',
  missSquare: '짝이 같은 약수를 빠뜨림',   // 36의 6 (6 × 6)
  halfPairs: '약수 짝을 하나로 셈',
  multAsDiv: '배수를 약수로 봄',
  divAsMult: '약수를 배수로 봄',
  skipSelf: '자기 자신을 배수에서 뺌',
  sameEnd: '끝자리가 같은 수를 배수로 봄', // 3의 배수 = 3, 13, 23, 33
  addForMult: '곱하지 않고 더함',
  swapRel: '약수와 배수를 뒤바꿈',
  noRel: '약수와 배수의 관계를 잘못 봄',
  commonAsRel: '공약수만 있어도 관계가 있다고 봄',
  allDiv: '두 수의 약수를 모두 모음',
  oneSideDiv: '한 수의 약수만 구함',
  smallCommon: '1 다음으로 작은 공약수를 고름', // 가장 작은 공약수는 언제나 1이다 — 18과 27에서 3에 "가장 작은"은 틀린 이름 (Codex 14차 #3)
  notGreatest: '가장 큰 공약수가 아님',
  lcmForGcd: '최소공배수를 구함',
  bottomProd: '아래 수를 곱함',
  stopEarly: '끝까지 나누지 않음',
  addLeft: '왼쪽 수를 더함',
  prodAsLcm: '두 수의 곱을 최소공배수로 봄',
  oneSideMult: '한 수의 배수만 구함',
  gcdForLcm: '최대공약수를 구함',
  notLeast: '가장 작은 공배수가 아님',
  cdAsCm: '공약수를 구함',
  cmNotMultL: '공배수가 최소공배수의 배수임을 모름',
  leftOnly: '왼쪽 수만 곱함',
  useSwap: '최대공약수와 최소공배수를 바꿔 씀',
  addBoth: '두 수를 더함',
  askedWrong: '묻는 것을 잘못 봄',
};

// ───────────────────── 수 고르기 ─────────────────────

/** 약수와 배수 관계가 **아닌** 두 수 (곱셈식 a × b에서 a가 b를 나누지 않게 — 다른 관계가 우연히 참이 되지 않게) */
const REL_PAIRS = [];
for (let a = 2; a <= 8; a++) for (let b = a + 1; b <= 9; b++) if (b % a !== 0) REL_PAIRS.push([a, b]);

/**
 * 최대공약수가 g인 두 수 a = g·m, b = g·n (m, n 서로소, 다름) — m·n 범위와 두 수의 상한, 조건을 받는다
 * @returns {{g:number, m:number, n:number, a:number, b:number, L:number}}
 */
function gcdPair(r, gs, maxAB, [lo, hi] = [2, 5], ok = () => true) {
  const cand = [];
  for (const g of gs) {
    for (let m = lo; m <= hi; m++) {
      for (let n = m + 1; n <= hi; n++) {
        if (gcd(m, n) === 1 && g * n <= maxAB && ok(g, m, n)) cand.push([g, m, n]);
      }
    }
  }
  const [g, m, n] = pick(r, cand);
  return { g, m, n, a: g * m, b: g * n, L: g * m * n };
}

/**
 * 나눗셈 사다리 — 공약수로 **꼭 두 번** 나누고 끝난다 (틀 이름이 수에 따라 갈리지 않게).
 * g = p × q, 아래 수 m, n은 서로소·2 이상 (그래서 둘 중 하나가 다른 수를 나누지 않는다)
 */
function ladderPair(r, maxAB, ok = () => true) {
  const cand = [];
  for (const [p, q] of [[2, 2], [2, 3], [3, 3], [2, 5], [3, 5]]) {
    for (let m = 2; m <= 7; m++) {
      for (let n = m + 1; n <= 7; n++) {
        if (gcd(m, n) === 1 && p * q * n <= maxAB && ok(p, q, m, n)) cand.push([p, q, m, n]);
      }
    }
  }
  const [p, q, m, n] = pick(r, cand);
  const g = p * q;
  return { p, q, g, m, n, a: g * m, b: g * n, L: g * m * n };
}
function ladderText(s) {
  return `${jn(s.a, '과', '와')} ${jn(s.b, '을', '를')} 공약수로 계속 나눴어요.\n\n`
    + `· ${ro(s.p)} 나누면 → ${s.a / s.p}, ${s.b / s.p}\n`
    + `· ${ro(s.q)} 나누면 → ${s.m}, ${s.n} (더 나눌 수 없어요)`;
}

/** 소인수가 **꼭 세 개**인 수 (2·3·5·7로만) — 곱셈식 모양이 늘 같아 틀 이름이 갈리지 않는다 */
const F3 = [8, 12, 18, 20, 27, 28, 30, 42, 45, 50, 63, 70, 75, 98];
const F3_PAIRS = [];
// 최소공배수 180 이하·곱 1000 이하인 짝만 — 27과 75(최소공배수 675)나 50 × 75 = 3750 같은 "두 수의 곱" 오답은 초5 손셈에 너무 크다
for (const a of F3) for (const b of F3) if (a < b && gcd(a, b) > 1 && lcm(a, b) <= 180 && a * b <= 1000) F3_PAIRS.push([a, b]);
const factorLines = (a, b) => `${a} = ${times(factorsOf(a))}\n${b} = ${times(factorsOf(b))}`;

// ───────────────────── 개념 사다리 (G. 약수와 배수 줄기) ─────────────────────

export const FACTOR = [
  {
    id: 'fac.divisor', grade: 5, name: '약수', needs: [],
    idea: '어떤 수를 **나누어떨어지게** 하는 수가 약수예요. 12의 약수는 1, 2, 3, 4, 6, 12 — **1과 자기 자신**도 약수예요. 곱해서 12가 되는 짝(1 × 12, 2 × 6, 3 × 4)으로 찾으면 빠뜨리지 않아요.',
    slip: '1부터 차례로 나눠 보거나, 곱해서 그 수가 되는 짝을 찾아 봐요.',
    calc(r, c) {
      const N = pick(r, [12, 18, 20, 24, 28, 30, 32, 40, 42, 44, 45, 48]); // 약수 6개 이상, 제곱수가 아니다 (제곱수는 ②에서)
      const ds = divisorsOf(N);
      const inner = ds.slice(1, -1);
      const d = pick(r, inner.filter((x) => x * x < N)); // 빠뜨릴 짝 (d, N/d)
      const noPair = ds.filter((x) => x !== d && x !== N / d);
      const pairs = ds.filter((x) => x * x < N).map((x) => `${x} × ${N / x}`).join(', ');
      const cnt = ds.length;
      const nonDiv = pick(r, Array.from({ length: 14 }, (_, i) => i + 2).filter((x) => x < N && N % x !== 0));
      const mids = shuffle(r, inner).slice(0, 2);
      const fams = [
        { list: true, ans: L(ds), wr: [{ text: L(inner), tag: TAGS.missEnds }, { text: L(noPair), tag: TAGS.missPair }, { text: L(firstMultiples(N, 4)), tag: TAGS.multAsDiv }],
          probe: { divisors: N }, steps: [`곱해서 ${jn(N, '이', '가')} 되는 짝: ${pairs}`, `짝의 수를 작은 수부터 모두 → ${L(ds)}`], pools: {
            pokemon: [
              `${N}의 약수를 모두 구하면 어느 것일까요?`,
              `{mon/이/가} 몬스터볼 ${N}개를 상자에 남김없이 똑같이 나눠 담으려고 해요. 상자 수가 될 수 있는 수를 모두 고르면?`,
            ],
          } },
        { ans: String(cnt), wr: [{ text: String(cnt - 2), tag: TAGS.missEnds }, { text: String(cnt / 2), tag: TAGS.halfPairs }],
          probe: { count: N }, steps: [`${N}의 약수: ${L(ds)}`, `모두 ${cnt}개`], pools: {
            pokemon: [`${N}의 약수는 모두 몇 개일까요?`],
          } },
        { noFill: true, ans: String(nonDiv), wr: [{ text: String(N), tag: TAGS.missEnds }, ...mids.map((x) => ({ text: String(x), tag: '계산 실수' }))],
          probe: { notDivisor: N }, steps: [`${N}의 약수: ${L(ds)}`, `${N} ÷ ${jn(nonDiv, '은', '는')} 나누어떨어지지 않아요 → ${jn(nonDiv, '은', '는')} 약수가 아니에요`], pools: {
            pokemon: [`다음 중 ${N}의 약수가 **아닌** 수는 어느 것일까요?`],
          } },
      ];
      const f = pickFamily(r, c, fams);
      const chs = f.list || f.noFill ? textChoices(r, f.ans, f.wr) : choices(r, f.ans, f.wr);
      return {
        ...ask(this.id, 'calc', fill(worldPick(r, c, f.pools), c), chs, {
          solve: solve(f.steps.map((t, i) => step(i, t)), {
            why: {
              [TAGS.missEnds]: `1과 ${jn(N, '은', '는')} 언제나 ${N}의 약수예요 — 1 × ${N} = ${N}.`,
              [TAGS.missPair]: `짝 하나를 빠뜨렸어요. ${d} × ${N / d} = ${jn(N, '이라서', '라서')} ${jn(d, '과', '와')} ${N / d}도 약수예요.`,
              [TAGS.multAsDiv]: `그건 ${N}의 **배수**(${L(firstMultiples(N, 3))}…)예요. 약수는 ${jn(N, '을', '를')} 나누어떨어지게 하는 수예요.`,
              [TAGS.halfPairs]: `짝(${pairs})만 세면 ${cnt / 2}개지만, 짝마다 수가 **두 개**씩이에요.`,
            },
            rule: '약수는 곱해서 그 수가 되는 짝으로 찾는다. 1과 자기 자신도 약수.',
          }),
        }),
        probe: f.probe,
      };
    },
    misread(r, c) {
      if (branchOf(r, c, ['ends', 'square']) === 'ends') {
        const N = pick(r, [12, 18, 20, 28, 30, 32, 44, 45]);
        const ds = divisorsOf(N); const inner = ds.slice(1, -1);
        const q = showWork(`${N}의 약수는 ${jn(L(inner), '이에요', '예요')}`);
        const chs = textChoices(r, `1과 ${N}도 약수예요 — ${L(ds)}`, [
          { text: '맞게 말했어요', tag: RIGHT_AS_WRONG },
          { text: `${N}의 약수는 ${N}의 배수와 같아요`, tag: TAGS.multAsDiv },
          { text: '짝수만 약수가 될 수 있어요', tag: OFF },
        ]);
        return {
          ...misreadAsk(this.id, 'ends', fill(q, c), chs, {
            solve: solve([step(0, `1 × ${N} = ${N} → 1과 ${jn(N, '은', '는')} 언제나 약수`), step(1, `${N}의 약수: ${L(ds)}`)], {
              whyAny: `1과 자기 자신(${N})을 빠뜨렸어요.`,
              rule: '1과 자기 자신도 약수.',
            }),
          }),
          probe: { divisors: N, shown: L(inner) },
        };
      }
      // 제곱수 — 6 × 6 = 36처럼 짝이 자기 자신인 약수를 빠뜨린다
      const N = pick(r, [16, 25, 36, 49, 64, 100]);
      const s = Math.round(Math.sqrt(N));
      const ds = divisorsOf(N); const shown = ds.filter((x) => x !== s);
      const q = showWork(`${N}의 약수는 ${jn(L(shown), '이에요', '예요')}`);
      const chs = textChoices(r, `${s} × ${s} = ${jn(N, '이라서', '라서')} ${s}도 약수예요 — ${L(ds)}`, [
        { text: '맞게 말했어요', tag: RIGHT_AS_WRONG },
        { text: `${jn(s, '은', '는')} 짝이 없어서 약수가 아니에요`, tag: TAGS.missSquare },
        { text: `1과 ${jn(N, '은', '는')} 빼야 해요`, tag: TAGS.missEnds },
      ]);
      return {
        ...misreadAsk(this.id, 'square', fill(q, c), chs, {
          solve: solve([step(0, `${s} × ${s} = ${N} — 짝이 같은 수도 약수`), step(1, `${N}의 약수: ${L(ds)}`)], {
            whyAny: `${jn(s, '을', '를')} 빠뜨렸어요. 짝이 자기 자신(${s} × ${s})이라 한 번만 쓰지만, 약수예요.`,
            rule: '짝이 같은 수(6 × 6)도 약수 — 한 번만 쓴다.',
          }),
        }),
        probe: { divisors: N, shown: L(shown) },
      };
    },
  },

  {
    id: 'fac.multiple', grade: 5, name: '배수', needs: ['fac.divisor'],
    idea: '어떤 수를 **1배, 2배, 3배…** 한 수가 배수예요. 4의 배수는 4, 8, 12, 16… — **자기 자신**부터 시작하고, 끝없이 있어요.',
    slip: '그 수에 1, 2, 3…을 차례로 곱해 봐요.',
    calc(r, c) {
      // 5·10은 빼고(끝자리 흉내 오답이 진짜 배수가 된다) — 3, 13, 23처럼 "끝자리가 같으면 배수"라는 실수를 쓸 수 있는 수
      const k = pick(r, [3, 4, 6, 7, 8, 9, 11, 12]);
      const m = int(r, 5, 12);
      const m2 = int(r, 3, 9);
      const ok4 = firstMultiples(k, 4);
      const smallDiv = divisorsOf(k).filter((x) => x > 1 && x < k);
      const fams = [
        { list: true, ans: L(ok4), wr: [{ text: L(firstMultiples(k, 5).slice(1)), tag: TAGS.skipSelf }, { text: L(divisorsOf(k)), tag: TAGS.divAsMult }, { text: L([k, k + 10, k + 20, k + 30]), tag: TAGS.sameEnd }],
          probe: { multiples: [k, 4] }, steps: [`${k} × 1, ${k} × 2, ${k} × 3, ${k} × 4`, `→ ${L(ok4)}`], pools: {
            pokemon: [`${k}의 배수를 작은 수부터 4개 쓰면 어느 것일까요?`],
          } },
        { ans: String(k * m), wr: [{ text: String(k + m), tag: TAGS.addForMult }, { text: String(k * (m + 1)), tag: '계산 실수' }],
          probe: { nth: [k, m] }, steps: [`${m}번째 배수 = ${k} × ${m}`, `${k} × ${m} = ${k * m}`], pools: {
            pokemon: [`${k}의 배수 중에서 ${m}번째로 작은 수는 얼마일까요?`],
          } },
        { noFill: true, ans: String(k * m2), wr: [{ text: String(smallDiv.length ? pick(r, smallDiv) : 1), tag: TAGS.divAsMult }, { text: String(k + 10), tag: TAGS.sameEnd }, { text: String(k * m2 + 1), tag: '계산 실수' }],
          probe: { isMultiple: k }, steps: [`${k * m2} = ${k} × ${m2}`, `${jn(k * m2, '은', '는')} ${k}의 배수예요`], pools: {
            pokemon: [
              `다음 중 ${k}의 배수는 어느 것일까요?`,
              `{mon/이/가} 하루에 몬스터볼을 ${k}개씩 모아요. 며칠 동안 모은 몬스터볼 수가 될 수 있는 것은 어느 것일까요?`,
            ],
          } },
      ];
      const f = pickFamily(r, c, fams);
      const chs = f.list || f.noFill ? textChoices(r, f.ans, f.wr) : choices(r, f.ans, f.wr);
      return {
        ...ask(this.id, 'calc', fill(worldPick(r, c, f.pools), c), chs, {
          solve: solve(f.steps.map((t, i) => step(i, t)), {
            why: {
              [TAGS.skipSelf]: `${k} × 1 = ${k} — ${k}도 ${k}의 배수예요.`,
              [TAGS.divAsMult]: `그건 ${k}의 **약수**예요. 배수는 ${jn(k, '을', '를')} 1배, 2배, 3배… 한 수예요.`,
              [TAGS.sameEnd]: `끝자리가 같다고 배수가 아니에요. ${k + 10} ÷ ${jn(k, '은', '는')} 나누어떨어지지 않아요.`,
              [TAGS.addForMult]: `${m}번째 배수는 ${jn(k, '을', '를')} ${m}번 더한 것 — ${k} × ${jn(m, '이에요', '예요')}. ${k} + ${jn(m, '이', '가')} 아니에요.`,
            },
            rule: '배수는 1배, 2배, 3배… — 자기 자신부터, 끝없이.',
          }),
        }),
        probe: f.probe,
      };
    },
    misread(r, c) {
      if (branchOf(r, c, ['self', 'divisor']) === 'self') {
        const k = int(r, 3, 9);
        const shown = firstMultiples(k, 5).slice(1);
        const q = showWork(`${k}의 배수를 작은 수부터 쓰면 ${jn(L(shown), '이에요', '예요')}`);
        const chs = textChoices(r, `${k} × 1 = ${k} — ${k}도 배수예요: ${L(firstMultiples(k, 4))}`, [
          { text: '맞게 말했어요', tag: RIGHT_AS_WRONG },
          { text: `${k}의 배수는 1과 ${jn(k, '이에요', '예요')}`, tag: TAGS.divAsMult },
          { text: `배수는 ${5 * k}까지만 있어요`, tag: OFF },
        ]);
        return {
          ...misreadAsk(this.id, 'self', fill(q, c), chs, {
            solve: solve([step(0, `${k} × 1 = ${k}`), step(1, `${k}의 배수: ${L(firstMultiples(k, 4))}…`)], {
              whyAny: `자기 자신(${k})을 빠뜨렸어요. 1배도 배수예요.`,
              rule: '배수는 자기 자신부터.',
            }),
          }),
          probe: { multiples: [k, 4], shown: L(shown) },
        };
      }
      // 약수와 뒤바꿈 — 약수가 셋 이상인 수라야 "배수"라고 우길 만한 목록이 된다
      const k = pick(r, [4, 6, 8, 9, 10, 12]);
      const shown = divisorsOf(k);
      const q = showWork(`${k}의 배수는 ${jn(L(shown), '이에요', '예요')}`);
      const chs = textChoices(r, `그건 ${k}의 약수예요 — 배수는 ${L(firstMultiples(k, 3))}…`, [
        { text: '맞게 말했어요', tag: RIGHT_AS_WRONG },
        { text: `${k}보다 작은 수만 배수예요`, tag: MIS_OK },
        // "1은 빼야 해요"는 맞는 지적이었다(1은 배수가 아니다) — 분명히 틀린 말로 (Codex 14차 #1)
        { text: `1만 빼면 모두 ${k}의 배수예요`, tag: OFF },
      ]);
      return {
        ...misreadAsk(this.id, 'divisor', fill(q, c), chs, {
          solve: solve([step(0, `${L(shown)} → ${jn(k, '을', '를')} 나누어떨어지게 하는 수 = 약수`), step(1, `${k}의 배수: ${L(firstMultiples(k, 4))}…`)], {
            whyAny: `약수와 배수를 뒤바꿨어요. 배수는 ${k}보다 작을 수 없어요.`,
            rule: '약수는 나누는 수, 배수는 곱해서 나온 수.',
          }),
        }),
        probe: { multiples: [k, 3], shown: L(shown) },
      };
    },
  },

  {
    id: 'fac.relation', grade: 5, name: '약수와 배수의 관계', needs: ['fac.multiple'],
    idea: '곱셈식 3 × 4 = 12에서 **곱하는 수** 3과 4는 12의 **약수**, **곱해서 나온 수** 12는 3과 4의 **배수**예요.',
    slip: '곱셈식을 만들어 보고, 곱하는 수와 나온 수를 가려 봐요.',
    calc(r, c) {
      const [a, b] = pick(r, REL_PAIRS); const N = a * b;
      const s = int(r, 3, 9); const t = int(r, 2, 6);
      // 공약수는 있지만 서로 나누지 않는 두 수 (6과 20) — "둘 다 짝수면 관계가 있다"는 실수
      const x1 = gcdPair(r, [2, 3, 4, 5, 6], 60, [2, 7]);
      const x2 = gcdPair(r, [2, 3, 4, 5, 6], 60, [2, 7], (g, m, n) => g * m !== x1.a || g * n !== x1.b);
      const pairText = (x, y) => `${jn(x, '과', '와')} ${y}`;
      const fams = [
        { words: true, ans: `${jn(a, '과', '와')} ${jn(b, '은', '는')} ${N}의 약수예요`, wr: [
            { text: `${jn(a, '과', '와')} ${jn(b, '은', '는')} ${N}의 배수예요`, tag: TAGS.swapRel },
            { text: `${jn(N, '은', '는')} ${a}의 약수예요`, tag: TAGS.swapRel },
            { text: `${jn(a, '은', '는')} ${b}의 약수예요`, tag: TAGS.noRel }],
          why: { [TAGS.noRel]: `${b} ÷ ${jn(a, '은', '는')} 나누어떨어지지 않아요. 곱셈식이 알려 주는 건 곱하는 수와 나온 수(${N})의 관계예요.` },
          probe: { rel: [a, b, N] }, steps: [`${a} × ${b} = ${N} — 곱하는 수는 약수, 곱해서 나온 수는 배수`, `그래서 ${jn(a, '과', '와')} ${jn(b, '은', '는')} ${N}의 약수예요`], pools: {
            pokemon: [`곱셈식 ${a} × ${b} = ${jn(N, '을', '를')} 보고 바르게 말한 것은 어느 것일까요?`],
          } },
        { words: true, ans: `${jn(N, '은', '는')} ${a}의 배수예요`, wr: [
            { text: `${jn(N, '은', '는')} ${a}의 약수예요`, tag: TAGS.swapRel },
            { text: `${jn(a, '은', '는')} ${N}의 배수예요`, tag: TAGS.swapRel },
            { text: `${jn(N, '과', '와')} ${jn(a, '은', '는')} 약수와 배수의 관계가 아니에요`, tag: TAGS.noRel }],
          why: { [TAGS.noRel]: `${a} × ${b} = ${jn(N, '이라서', '라서')} ${jn(N, '은', '는')} ${a}의 배수예요 — 관계가 있어요.` },
          probe: { rel: [a, b, N] }, steps: [`${a} × ${b} = ${N} — 곱하는 수는 약수, 곱해서 나온 수는 배수`, `그래서 ${jn(N, '은', '는')} ${a}의 배수예요`], pools: {
            pokemon: [`${a} × ${b} = ${N}에서 ${jn(N, '과', '와')} ${a}의 관계를 바르게 말한 것은 어느 것일까요?`],
          } },
        { words: true, ans: pairText(s, s * t), wr: [
            { text: pairText(x1.a, x1.b), tag: TAGS.commonAsRel },
            { text: pairText(x2.a, x2.b), tag: TAGS.commonAsRel },
            { text: pairText(s, s * t + 1), tag: '계산 실수' }],
          why: { [TAGS.commonAsRel]: '둘 다 같은 수로 나누어떨어진다고(공약수가 있다고) 관계가 있는 게 아니에요. **큰 수를 작은 수로 나누어떨어져야** 약수와 배수의 관계예요.' },
          probe: { relPair: true }, steps: [`${s * t} ÷ ${s} = ${jn(t, '이라서', '라서')} 나누어떨어져요`, `${jn(s * t, '은', '는')} ${s}의 배수 → ${pairText(s, s * t)}`], pools: {
            pokemon: [`두 수가 약수와 배수의 관계인 것은 어느 것일까요?`],
          } },
      ];
      const f = pickFamily(r, c, fams);
      return {
        ...ask(this.id, 'calc', fill(worldPick(r, c, f.pools), c), textChoices(r, f.ans, f.wr), {
          solve: solve(f.steps.map((tx, i) => step(i, tx)), {
            why: {
              [TAGS.swapRel]: `거꾸로 말했어요. 곱하는 두 수 ${jn(a, '과', '와')} ${jn(b, '이', '가')} 약수, 곱해서 나온 ${jn(N, '이', '가')} 배수예요.`,
              ...f.why,
            },
            rule: '□ × △ = ○ — □와 △는 ○의 약수, ○는 □와 △의 배수.',
          }),
        }),
        probe: f.probe,
      };
    },
    misread(r, c) {
      const [a, b] = pick(r, REL_PAIRS); const N = a * b;
      const q = showWork(`${a} × ${b} = ${jn(N, '이니까', '니까')} ${jn(N, '은', '는')} ${a}의 약수예요`);
      const chs = textChoices(r, `${jn(N, '은', '는')} ${a}의 배수예요 — ${jn(a, '이', '가')} ${N}의 약수`, [
        { text: '맞게 말했어요', tag: RIGHT_AS_WRONG },
        { text: `${jn(N, '은', '는')} ${b}의 약수예요`, tag: TAGS.swapRel },
        { text: '곱셈식으로는 알 수 없어요', tag: OFF },
      ]);
      return {
        ...misreadAsk(this.id, 'swap', fill(q, c), chs, {
          solve: solve([step(0, `${a} × ${b} = ${N}`), step(1, `곱하는 ${jn(a, '이', '가')} 약수, 나온 ${jn(N, '이', '가')} 배수`)], {
            whyAny: `약수와 배수를 뒤바꿨어요. ${jn(N, '은', '는')} ${a}보다 커서 ${a}의 약수가 될 수 없어요.`,
            rule: '곱하는 수가 약수, 곱해서 나온 수가 배수.',
          }),
        }),
        probe: { rel: [a, b, N], shown: `${N}은 ${a}의 약수` },
      };
    },
  },

  {
    id: 'fac.common', grade: 5, name: '공약수와 최대공약수', needs: ['fac.relation'],
    idea: '두 수의 공통인 약수가 **공약수**, 그중 가장 큰 수가 **최대공약수**예요. 12와 18의 공약수 1, 2, 3, 6 → 최대공약수 6. 공약수는 **최대공약수의 약수**예요.',
    slip: '두 수의 약수를 따로 쓰고, 둘 다 있는 수를 찾아 봐요.',
    calc(r, c) {
      // 최대공약수는 약수가 셋 이상인 수 — 그래야 "가장 작은 공약수"·"덜 큰 공약수" 오답이 생긴다
      const P = gcdPair(r, [4, 6, 8, 9, 12], 40, [1, 5]);
      const { g, a, b } = P;
      const cds = divisorsOf(g); const p = smallestPrime(g); const Lm = lcm(a, b);
      const other = a === g ? b : a;
      const union = [...new Set([...divisorsOf(a), ...divisorsOf(b)])].sort((x, y) => x - y);
      const fams = [
        { list: true, ans: L(cds), wr: [{ text: L(union), tag: TAGS.allDiv }, { text: L(divisorsOf(other)), tag: TAGS.oneSideDiv }, { text: L(cds.slice(1)), tag: TAGS.missEnds }],
          steps: [`${a}의 약수: ${L(divisorsOf(a))}`, `${b}의 약수: ${L(divisorsOf(b))}`, `둘 다 있는 수 → ${L(cds)}`], pools: {
            pokemon: [`${jn(a, '과', '와')} ${b}의 공약수를 모두 구하면 어느 것일까요?`],
          } },
        { ans: String(g), wr: [{ text: String(p), tag: TAGS.smallCommon }, { text: String(Lm), tag: TAGS.lcmForGcd }, { text: String(g / p), tag: TAGS.notGreatest }],
          steps: [`${jn(a, '과', '와')} ${b}의 공약수: ${L(cds)}`, `그중 가장 큰 수 → ${g}`], pools: {
            pokemon: [`${jn(a, '과', '와')} ${b}의 최대공약수는 얼마일까요?`],
          } },
        { list: true, ans: L(cds), wr: [{ text: `1, ${g}`, tag: TAGS.missPair }, { text: L(firstMultiples(g, 3)), tag: TAGS.multAsDiv }, { text: L(cds.slice(1)), tag: TAGS.missEnds }],
          steps: ['공약수는 최대공약수의 약수예요', `${g}의 약수 → ${L(cds)}`], pools: {
            pokemon: [`${jn(a, '과', '와')} ${b}의 최대공약수가 ${g}일 때, 두 수의 공약수를 모두 구하면 어느 것일까요?`],
          } },
      ];
      const f = pickFamily(r, c, fams);
      const chs = f.list ? textChoices(r, f.ans, f.wr) : choices(r, f.ans, f.wr);
      return {
        ...ask(this.id, 'calc', fill(worldPick(r, c, f.pools), c), chs, {
          solve: solve(f.steps.map((t, i) => step(i, t)), {
            why: {
              [TAGS.allDiv]: '두 수의 약수를 다 모았어요. 공약수는 **둘 다**에 있는 수만이에요.',
              [TAGS.oneSideDiv]: `${other}의 약수만 구했어요. 다른 수도 나누어떨어져야 공약수예요.`,
              [TAGS.missEnds]: '1은 어떤 수든 나누어떨어지게 해요 — 1도 공약수예요.',
              [TAGS.smallCommon]: `${p}도 공약수지만, 가장 큰 공약수는 ${jn(g, '이에요', '예요')}.`,
              [TAGS.notGreatest]: `${g / p}도 공약수지만, 가장 큰 공약수는 ${jn(g, '이에요', '예요')}.`,
              // 최소공배수는 G6에서 처음 배운다 — 여기선 이미 배운 말로 (Codex 14차 #8)
              [TAGS.lcmForGcd]: `${jn(Lm, '은', '는')} ${a}보다 커서 ${a}의 약수가 될 수 없어요. 최대공약수는 두 수를 나누는 수예요.`,
              [TAGS.missPair]: `${g}의 약수를 다 찾지 않았어요: ${L(cds)}.`,
              [TAGS.multAsDiv]: `그건 ${g}의 배수예요. 공약수는 ${g}의 **약수**예요.`,
            },
            rule: '공약수는 두 수에 공통인 약수, 최대공약수는 그중 가장 큰 수. 공약수는 최대공약수의 약수.',
          }),
        }),
        probe: { gcd: [a, b] },
      };
    },
    misread(r, c) {
      const P = gcdPair(r, [4, 6, 8, 9, 12], 40, [1, 5]);
      const { g, a, b } = P; const p = smallestPrime(g); const Lm = lcm(a, b);
      if (branchOf(r, c, ['notgreatest', 'lcm']) === 'notgreatest') {
        const q = showWork(`${jn(a, '과', '와')} ${b}의 최대공약수는 ${jn(p, '이에요', '예요')} — 둘 다 ${ro(p)} 나누어떨어져요`);
        const chs = textChoices(r, `${g}도 둘 다 나누어떨어져요 — 가장 큰 공약수는 ${g}`, [
          { text: '맞게 말했어요', tag: RIGHT_AS_WRONG },
          { text: '최대공약수는 두 수를 곱해서 구해요', tag: OFF },
          { text: '최대공약수는 언제나 1이에요', tag: TAGS.notGreatest }, // 1은 가장 작은 공약수 — "1 다음으로 작은"이 아니다
        ]);
        return {
          ...misreadAsk(this.id, 'notgreatest', fill(q, c), chs, {
            solve: solve([step(0, `${jn(a, '과', '와')} ${b}의 공약수: ${L(divisorsOf(g))}`), step(1, `가장 큰 공약수 → ${g}`)], {
              whyAny: `${jn(p, '은', '는')} 공약수 중 하나일 뿐이에요. **가장 큰** 공약수를 찾아야 해요.`,
              rule: '최대공약수 = 공약수 중 가장 큰 수.',
            }),
          }),
          probe: { gcd: [a, b], shown: String(p) },
        };
      }
      // 최소공배수는 G6에서 처음 배운다 — 고친 말은 이미 배운 말(약수·공약수)로 (Codex 14차 #8)
      const q = showWork(`${jn(a, '과', '와')} ${b}의 최대공약수는 ${jn(Lm, '이에요', '예요')}`);
      const chs = textChoices(r, `${jn(Lm, '은', '는')} ${a}보다 커서 ${a}의 약수가 될 수 없어요 — 가장 큰 공약수는 ${g}`, [
        { text: '맞게 말했어요', tag: RIGHT_AS_WRONG },
        { text: '최대공약수는 두 수보다 커야 해요', tag: MIS_OK },
        { text: '최대공약수는 두 수를 더해서 구해요', tag: OFF },
      ]);
      return {
        ...misreadAsk(this.id, 'lcm', fill(q, c), chs, {
          solve: solve([step(0, `${jn(Lm, '은', '는')} ${a}보다 커서 ${jn(a, '을', '를')} 나누어떨어지게 할 수 없어요`), step(1, `두 수를 나누는 가장 큰 수 → ${g}`)], {
            whyAny: '최대공약수는 두 수를 **나누는** 공약수라 두 수보다 클 수 없어요.',
            rule: '최대공약수는 두 수보다 클 수 없다.',
          }),
        }),
        probe: { gcd: [a, b], shown: String(Lm) },
      };
    },
  },

  {
    id: 'fac.gcd', grade: 5, name: '최대공약수 구하기', needs: ['fac.common'],
    idea: '두 수를 **공약수로 더 나눌 수 없을 때까지** 나누고, **왼쪽 수를 모두 곱해요**. **더 쪼갤 수 없을 때까지 쪼갠** 곱셈식에서 **둘 다에 들어 있는 곱**을 찾아도 돼요.',
    slip: '끝까지 나눴는지, 왼쪽 수를 곱했는지 봐요.',
    calc(r, c) {
      const S = ladderPair(r, 90);
      const [fa, fb] = pick(r, F3_PAIRS);
      const cf = commonFactors(factorsOf(fa), factorsOf(fb)); const g2 = gcd(fa, fb);
      const N = gcdPair(r, [6, 8, 9, 10, 12, 14, 15, 16, 18], 90, [2, 5]);
      const pN = smallestPrime(N.g);
      const fams = [
        { ans: String(S.g), wr: [{ text: String(S.m * S.n), tag: TAGS.bottomProd }, { text: String(S.L), tag: TAGS.lcmForGcd }, { text: String(S.p), tag: TAGS.stopEarly }, { text: String(S.p + S.q), tag: TAGS.addLeft }],
          why: {
            [TAGS.bottomProd]: `아래 수 ${jn(S.m, '과', '와')} ${jn(S.n, '은', '는')} 나누고 남은 수예요. 최대공약수는 **왼쪽** 수를 곱해요.`,
            [TAGS.lcmForGcd]: `왼쪽과 아래를 모두 곱한 ${jn(S.L, '은', '는')} 두 수보다 커요. 최대공약수는 왼쪽 수만 곱해요.`,
            [TAGS.stopEarly]: `${ro(S.p)} 나눈 다음에도 ${ro(S.q)} 한 번 더 나눴어요. 나눈 수를 **모두** 곱해요.`,
            [TAGS.addLeft]: `왼쪽 수는 **곱해요**: ${S.p} × ${S.q} = ${S.g}.`,
          },
          steps: ['최대공약수 = 왼쪽 수를 모두 곱한 수', `${S.p} × ${S.q} = ${S.g}`], pools: {
            pokemon: [`${ladderText(S)}\n\n최대공약수는 얼마일까요?`],
          } },
        { ans: String(g2), wr: [{ text: String(lcm(fa, fb)), tag: TAGS.lcmForGcd }, { text: String(smallestPrime(g2)), tag: TAGS.smallCommon }],
          why: {
            [TAGS.lcmForGcd]: `${jn(lcm(fa, fb), '은', '는')} 모든 곱을 곱한 수라 두 수보다 커요. 최대공약수는 둘 다에 **들어 있는** 곱만 곱해요.`,
            [TAGS.smallCommon]: `${jn(smallestPrime(g2), '은', '는')} 둘 다에 들어 있는 수 하나일 뿐이에요. 겹치는 곱을 **모두** 곱해요.`,
          },
          // 사다리 규칙이 곱셈식 문항에 뜨지 않게 (헤드리스가 잡음) · "더 쪼갤 수 없을 때까지"가 빠지면 24 = 4 × 6, 36 = 6 × 6에서 6이 나온다 (Codex 14차 #5)
          rule: '더 쪼갤 수 없을 때까지 쪼갠 곱셈식에서, 둘 다에 들어 있는 곱을 모두 곱한다.',
          steps: [`${fa} = ${times(factorsOf(fa))}, ${fb} = ${times(factorsOf(fb))}`, `둘 다에 들어 있는 곱: ${cf.length > 1 ? `${times(cf)} = ${g2}` : String(g2)}`], pools: {
            pokemon: [`${factorLines(fa, fb)}\n\n곱셈식을 보고 ${jn(fa, '과', '와')} ${fb}의 최대공약수를 구하면 얼마일까요?`],
          } },
        { ans: String(N.g), wr: [{ text: String(N.L), tag: TAGS.lcmForGcd }, { text: String(pN), tag: TAGS.smallCommon }, { text: String(N.g / pN), tag: TAGS.notGreatest }],
          why: {
            [TAGS.lcmForGcd]: `${jn(N.L, '은', '는')} 두 수보다 커서 공약수가 될 수 없어요.`,
            [TAGS.smallCommon]: `${pN}도 공약수지만, 가장 큰 공약수는 ${jn(N.g, '이에요', '예요')}.`,
            [TAGS.notGreatest]: `${N.g / pN}도 공약수지만, 끝까지 나누면 ${N.g}까지 나와요.`,
          },
          steps: [`${N.a} = ${N.g} × ${N.m}, ${N.b} = ${N.g} × ${N.n}`, `${jn(N.m, '과', '와')} ${jn(N.n, '은', '는')} 더 나눌 수 없어요 → 최대공약수 ${N.g}`], pools: {
            pokemon: [`${jn(N.a, '과', '와')} ${N.b}의 최대공약수를 구하면 얼마일까요?`],
          } },
      ];
      const f = pickFamily(r, c, fams);
      const probe = f === fams[0] ? { gcd: [S.a, S.b] } : f === fams[1] ? { gcd: [fa, fb] } : { gcd: [N.a, N.b] };
      return {
        ...ask(this.id, 'calc', fill(worldPick(r, c, f.pools), c), choices(r, f.ans, f.wr), {
          solve: solve(f.steps.map((t, i) => step(i, t)), {
            why: f.why,
            rule: f.rule || '공약수로 끝까지 나누고, 왼쪽 수를 모두 곱한다.',
          }),
        }),
        probe,
      };
    },
    misread(r, c) {
      if (branchOf(r, c, ['bottom', 'stop']) === 'bottom') {
        // 2 × 2만은 빼고(왼쪽 수를 더해도 4라 "더해야 해요"가 우연히 맞는 말이 된다), 아래 수의 곱이 우연히 답이 되지 않게
        const S = ladderPair(r, 90, (p, q, m, n) => !(p === 2 && q === 2) && m * n !== p * q);
        const q = `${ladderText(S)}\n\n${showWork(`최대공약수는 아래 수를 곱한 ${jn(S.m * S.n, '이에요', '예요')}`)}`;
        const chs = textChoices(r, `최대공약수는 왼쪽 수를 곱해요 — ${S.p} × ${S.q} = ${S.g}`, [
          { text: '맞게 말했어요', tag: RIGHT_AS_WRONG },
          { text: '왼쪽 수와 아래 수를 모두 곱해야 해요', tag: TAGS.lcmForGcd },
          { text: '왼쪽 수를 더해야 해요', tag: TAGS.addLeft },
        ]);
        return {
          ...misreadAsk(this.id, 'bottom', fill(q, c), chs, {
            solve: solve([step(0, '최대공약수 = 왼쪽 수의 곱'), step(1, `${S.p} × ${S.q} = ${S.g}`)], {
              whyAny: `아래 수 ${jn(S.m, '과', '와')} ${jn(S.n, '은', '는')} 나누고 남은 수예요. 두 수를 나눈 **왼쪽** 수를 곱해요.`,
              rule: '최대공약수 = 왼쪽 수의 곱.',
            }),
          }),
          probe: { gcd: [S.a, S.b], shown: String(S.m * S.n) },
        };
      }
      const S = ladderPair(r, 90);
      const q = showWork(`${jn(S.a, '과', '와')} ${jn(S.b, '을', '를')} ${ro(S.p)} 한 번 나눴으니 최대공약수는 ${jn(S.p, '이에요', '예요')}`);
      const chs = textChoices(r, `${jn(S.a / S.p, '과', '와')} ${S.b / S.p}도 ${ro(S.q)} 더 나눌 수 있어요 — 최대공약수는 ${S.g}`, [
        { text: '맞게 말했어요', tag: RIGHT_AS_WRONG },
        { text: '한 번 나눴으면 충분해요', tag: MIS_OK },
        { text: `나눈 몫 ${jn(S.a / S.p, '과', '와')} ${jn(S.b / S.p, '을', '를')} 곱해야 해요`, tag: TAGS.bottomProd },
      ]);
      return {
        ...misreadAsk(this.id, 'stop', fill(q, c), chs, {
          solve: solve([step(0, `${S.a / S.p}, ${S.b / S.p} → ${ro(S.q)} 또 나눠요 → ${S.m}, ${S.n}`), step(1, `${S.p} × ${S.q} = ${S.g}`)], {
            whyAny: `한 번 나눈 뒤에도 공약수(${S.q})가 남아 있었어요. 끝까지 나눠야 해요.`,
            rule: '더 나눌 수 없을 때까지 나눈다.',
          }),
        }),
        probe: { gcd: [S.a, S.b], shown: String(S.p) },
      };
    },
  },

  {
    id: 'fac.cm', grade: 5, name: '공배수와 최소공배수', needs: ['fac.gcd'],
    idea: '두 수의 공통인 배수가 **공배수**, 그중 가장 작은 수가 **최소공배수**예요. 4와 6의 공배수 12, 24, 36… → 최소공배수 12. 공배수는 **최소공배수의 배수**예요.',
    slip: '큰 수의 배수를 차례로 쓰고, 작은 수로도 나누어떨어지는지 봐요.',
    calc(r, c) {
      // 최대공약수가 1이 아니다 — 그래야 "두 수의 곱"이 최소공배수와 달라 실수가 드러난다
      const { g, a, b, L: Lm } = gcdPair(r, [2, 3, 4], 20, [2, 5]);
      const ab = a * b;
      const nonCm = pick(r, [2, 3, 4, 5, 6, 7].map((t) => a * t).filter((x) => x % Lm !== 0 && x > Lm));
      const fams = [
        { list: true, ans: L([Lm, 2 * Lm, 3 * Lm]), wr: [{ text: L([ab, 2 * ab, 3 * ab]), tag: TAGS.prodAsLcm }, { text: L(firstMultiples(a, 3)), tag: TAGS.oneSideMult }, { text: L(divisorsOf(g)), tag: TAGS.cdAsCm }],
          steps: [`${a}의 배수이면서 ${b}의 배수인 가장 작은 수: ${Lm}`, `공배수는 ${Lm}의 배수 → ${L([Lm, 2 * Lm, 3 * Lm])}`], pools: {
            pokemon: [`${jn(a, '과', '와')} ${b}의 공배수를 작은 수부터 3개 쓰면 어느 것일까요?`],
          } },
        { ans: String(Lm), wr: [{ text: String(ab), tag: TAGS.prodAsLcm }, { text: String(g), tag: TAGS.gcdForLcm }, { text: String(2 * Lm), tag: TAGS.notLeast }],
          steps: [`${b}의 배수: ${L(firstMultiples(b, Lm / b))}`, `그중 ${a}의 배수이기도 한 가장 작은 수 → ${Lm}`], pools: {
            pokemon: [`${jn(a, '과', '와')} ${b}의 최소공배수는 얼마일까요?`],
          } },
        { noFill: true, ans: String(nonCm), wr: [2, 3, 4].map((t) => ({ text: String(t * Lm), tag: TAGS.cmNotMultL })),
          steps: [`공배수는 ${Lm}의 배수: ${L([Lm, 2 * Lm, 3 * Lm, 4 * Lm])}`, `${nonCm} ÷ ${jn(Lm, '은', '는')} 나누어떨어지지 않아요 → ${jn(nonCm, '은', '는')} 공배수가 아니에요`], pools: {
            pokemon: [`${jn(a, '과', '와')} ${b}의 최소공배수가 ${Lm}일 때, 두 수의 공배수가 **아닌** 것은 어느 것일까요?`],
          } },
      ];
      const f = pickFamily(r, c, fams);
      const chs = f.list || f.noFill ? textChoices(r, f.ans, f.wr) : choices(r, f.ans, f.wr);
      return {
        ...ask(this.id, 'calc', fill(worldPick(r, c, f.pools), c), chs, {
          solve: solve(f.steps.map((t, i) => step(i, t)), {
            why: {
              [TAGS.prodAsLcm]: `${a} × ${b} = ${ab}도 공배수지만, 더 작은 ${jn(Lm, '이', '가')} 있어요.`,
              [TAGS.oneSideMult]: `${a}의 배수만 썼어요. ${b}의 배수이기도 해야 공배수예요.`,
              [TAGS.cdAsCm]: '그건 공**약수**예요. 공배수는 두 수의 공통인 **배수**예요.',
              [TAGS.gcdForLcm]: `${jn(g, '은', '는')} 최대공약수예요. 최소공배수는 두 수보다 작을 수 없어요.`,
              [TAGS.notLeast]: `${2 * Lm}도 공배수지만, 가장 작은 건 ${jn(Lm, '이에요', '예요')}.`,
              [TAGS.cmNotMultL]: `${Lm}의 배수는 모두 두 수의 공배수예요.`,
            },
            rule: '공배수는 두 수에 공통인 배수, 최소공배수는 그중 가장 작은 수. 공배수는 최소공배수의 배수.',
          }),
        }),
        probe: { lcm: [a, b] },
      };
    },
    misread(r, c) {
      const { g, a, b, L: Lm } = gcdPair(r, [2, 3, 4], 20, [2, 5]);
      const ab = a * b;
      if (branchOf(r, c, ['prod', 'gcd']) === 'prod') {
        const q = showWork(`${jn(a, '과', '와')} ${b}의 최소공배수는 ${a} × ${b} = ${jn(ab, '이에요', '예요')}`);
        const chs = textChoices(r, `${ab}도 공배수지만 더 작은 ${jn(Lm, '이', '가')} 있어요`, [
          { text: '맞게 말했어요', tag: RIGHT_AS_WRONG },
          { text: `최소공배수는 ${jn(g, '이에요', '예요')}`, tag: TAGS.gcdForLcm },
          { text: '최소공배수는 두 수를 더해서 구해요', tag: OFF },
        ]);
        return {
          ...misreadAsk(this.id, 'prod', fill(q, c), chs, {
            solve: solve([step(0, `${b}의 배수: ${L(firstMultiples(b, Lm / b))}`), step(1, `${a}의 배수이기도 한 가장 작은 수 → ${Lm}`)], {
              // "공약수가 있으면"은 거짓 — 1은 언제나 공약수라 3과 4(곱 12 = 최소공배수)에서 틀린다 (Codex 14차 #4)
              whyAny: `두 수의 곱은 공배수이긴 하지만, 1보다 큰 공약수(${g})가 있으면 가장 작지 않아요.`,
              rule: '1보다 큰 공약수가 있으면 최소공배수는 두 수의 곱보다 작다.',
            }),
          }),
          probe: { lcm: [a, b], shown: String(ab) },
        };
      }
      const q = showWork(`${jn(a, '과', '와')} ${b}의 최소공배수는 ${jn(g, '이에요', '예요')}`);
      const chs = textChoices(r, `${jn(g, '은', '는')} 최대공약수예요 — 최소공배수는 ${Lm}`, [
        { text: '맞게 말했어요', tag: RIGHT_AS_WRONG },
        { text: '최소공배수는 두 수보다 작아야 해요', tag: MIS_OK },
        { text: `최소공배수는 두 수를 곱한 ${jn(ab, '이에요', '예요')}`, tag: TAGS.prodAsLcm },
      ]);
      return {
        ...misreadAsk(this.id, 'gcd', fill(q, c), chs, {
          solve: solve([step(0, `${jn(g, '은', '는')} 두 수를 나누는 수 — 최대공약수`), step(1, `두 수의 공통인 배수 중 가장 작은 수 → ${Lm}`)], {
            whyAny: '최소공배수와 최대공약수를 바꿨어요. 배수는 그 수보다 작을 수 없어요.',
            rule: '최대공약수 ≤ 두 수 ≤ 최소공배수.',
          }),
        }),
        probe: { lcm: [a, b], shown: String(g) },
      };
    },
  },

  {
    id: 'fac.lcm', grade: 5, name: '최소공배수 구하기', needs: ['fac.cm'],
    idea: '공약수로 끝까지 나눈 뒤 **왼쪽 수와 아래 수를 모두 곱해요**. 최소공배수 = 최대공약수 × 아래 수들이에요.',
    slip: '왼쪽 수와 아래 수를 모두 곱했는지 봐요.',
    calc(r, c) {
      // 두 수의 곱(오답)이 1500을 넘지 않게 — 45 × 60 = 2700은 초5에게 흉내 오답으로도 너무 크다
      const smallProd = (p, q, m, n) => p * q * m * p * q * n <= 1500;
      const S = ladderPair(r, 60, smallProd);
      const [fa, fb] = pick(r, F3_PAIRS);
      const Lf = lcm(fa, fb); const gf = gcd(fa, fb);
      const uf = [...factorsOf(fa)];
      { const rest = [...factorsOf(fb)]; for (const p of factorsOf(fa)) { const i = rest.indexOf(p); if (i >= 0) rest.splice(i, 1); } uf.push(...rest); uf.sort((x, y) => x - y); }
      const N = gcdPair(r, [2, 3, 4, 5, 6], 40, [2, 7]);
      const fams = [
        { ans: String(S.L), wr: [{ text: String(S.g), tag: TAGS.leftOnly }, { text: String(S.m * S.n), tag: TAGS.bottomProd }, { text: String(S.a * S.b), tag: TAGS.prodAsLcm }],
          why: {
            [TAGS.leftOnly]: `왼쪽 수만 곱하면 최대공약수(${S.g})예요. 최소공배수는 아래 수 ${jn(S.m, '과', '와')} ${S.n}까지 곱해요.`,
            [TAGS.bottomProd]: `아래 수만 곱했어요. 왼쪽 수 ${jn(S.p, '과', '와')} ${S.q}도 곱해야 해요.`,
            [TAGS.prodAsLcm]: `${S.a} × ${S.b} = ${S.a * S.b}도 공배수지만 가장 작지 않아요.`,
          },
          steps: ['최소공배수 = 왼쪽 수 × 아래 수', `${S.p} × ${S.q} × ${S.m} × ${S.n} = ${S.L}`], pools: {
            pokemon: [`${ladderText(S)}\n\n최소공배수는 얼마일까요?`],
          } },
        { ans: String(Lf), wr: [{ text: String(gf), tag: TAGS.gcdForLcm }, { text: String(fa * fb), tag: TAGS.prodAsLcm }],
          why: {
            [TAGS.gcdForLcm]: `${jn(gf, '은', '는')} 둘 다에 들어 있는 곱 — 최대공약수예요. 최소공배수는 겹치지 않는 곱까지 모두 곱해요.`,
            [TAGS.prodAsLcm]: `두 곱셈식을 통째로 곱하면 겹치는 곱을 두 번 곱해요. 겹치는 곱은 한 번만.`,
          },
          rule: '더 쪼갤 수 없을 때까지 쪼갠 곱셈식에서, 겹치는 곱은 한 번만 곱하고 나머지 곱도 모두 곱한다.',
          steps: [`${fa} = ${times(factorsOf(fa))}, ${fb} = ${times(factorsOf(fb))}`, `겹치는 곱은 한 번만: ${times(uf)} = ${Lf}`], pools: {
            pokemon: [`${factorLines(fa, fb)}\n\n곱셈식을 보고 ${jn(fa, '과', '와')} ${fb}의 최소공배수를 구하면 얼마일까요?`],
          } },
        { ans: String(N.L), wr: [{ text: String(N.a * N.b), tag: TAGS.prodAsLcm }, { text: String(N.g), tag: TAGS.gcdForLcm }, { text: String(2 * N.L), tag: TAGS.notLeast }],
          why: {
            [TAGS.prodAsLcm]: `${N.a} × ${N.b} = ${N.a * N.b}도 공배수지만, 공약수 ${jn(N.g, '이', '가')} 있어서 더 작은 공배수가 있어요.`,
            [TAGS.gcdForLcm]: `${jn(N.g, '은', '는')} 최대공약수예요. 최소공배수는 두 수보다 작을 수 없어요.`,
            [TAGS.notLeast]: `${2 * N.L}도 공배수지만, 가장 작은 건 ${jn(N.L, '이에요', '예요')}.`,
          },
          steps: [`최대공약수 ${N.g}: ${N.a} = ${N.g} × ${N.m}, ${N.b} = ${N.g} × ${N.n}`, `${N.g} × ${N.m} × ${N.n} = ${N.L}`], pools: {
            pokemon: [`${jn(N.a, '과', '와')} ${N.b}의 최소공배수를 구하면 얼마일까요?`],
          } },
      ];
      const f = pickFamily(r, c, fams);
      const probe = f === fams[0] ? { lcm: [S.a, S.b] } : f === fams[1] ? { lcm: [fa, fb] } : { lcm: [N.a, N.b] };
      return {
        ...ask(this.id, 'calc', fill(worldPick(r, c, f.pools), c), choices(r, f.ans, f.wr), {
          solve: solve(f.steps.map((t, i) => step(i, t)), {
            why: f.why,
            rule: f.rule || '최소공배수 = 왼쪽 수 × 아래 수 (= 최대공약수 × 아래 수).',
          }),
        }),
        probe,
      };
    },
    misread(r, c) {
      const S = ladderPair(r, 60, (p, q, m, n) => m * n !== p * q && p * q * m * p * q * n <= 1500);
      const right = `왼쪽 수와 아래 수를 모두 곱해요 — ${S.p} × ${S.q} × ${S.m} × ${S.n} = ${S.L}`;
      const steps = [step(0, '최소공배수 = 왼쪽 수 × 아래 수'), step(1, `${S.p} × ${S.q} × ${S.m} × ${S.n} = ${S.L}`)];
      if (branchOf(r, c, ['left', 'bottom']) === 'left') {
        const q = `${ladderText(S)}\n\n${showWork(`최소공배수는 왼쪽 수만 곱한 ${jn(S.g, '이에요', '예요')}`)}`;
        const chs = textChoices(r, right, [
          { text: '맞게 말했어요', tag: RIGHT_AS_WRONG },
          { text: '아래 수만 곱해야 해요', tag: TAGS.bottomProd },
          { text: `두 수를 곱한 ${jn(S.a * S.b, '이에요', '예요')}`, tag: TAGS.prodAsLcm },
        ]);
        return {
          ...misreadAsk(this.id, 'left', fill(q, c), chs, {
            solve: solve(steps, { whyAny: `왼쪽 수만 곱하면 최대공약수(${S.g})예요.`, rule: '최소공배수는 왼쪽 수와 아래 수를 모두 곱한다.' }),
          }),
          probe: { lcm: [S.a, S.b], shown: String(S.g) },
        };
      }
      const q = `${ladderText(S)}\n\n${showWork(`최소공배수는 아래 수만 곱한 ${jn(S.m * S.n, '이에요', '예요')}`)}`;
      const chs = textChoices(r, right, [
        { text: '맞게 말했어요', tag: RIGHT_AS_WRONG },
        { text: '왼쪽 수만 곱해야 해요', tag: TAGS.leftOnly },
        { text: '두 수를 더해야 해요', tag: OFF },
      ]);
      return {
        ...misreadAsk(this.id, 'bottom', fill(q, c), chs, {
          solve: solve(steps, { whyAny: `아래 수만 곱하면 두 수 ${jn(S.a, '과', '와')} ${S.b}의 배수가 되지 않아요.`, rule: '최소공배수는 왼쪽 수와 아래 수를 모두 곱한다.' }),
        }),
        probe: { lcm: [S.a, S.b], shown: String(S.m * S.n) },
      };
    },
  },

  {
    id: 'fac.use', grade: 5, name: '최대공약수·최소공배수 활용', needs: ['fac.lcm'],
    idea: '**최대 몇 명에게 똑같이 나눠 줄까**, **가장 큰 정사각형**은 최대공약수. **다음에 함께 오는 날**은 최소공배수예요.',
    slip: '"똑같이 나눠 준다·자른다"인지 "다시 함께 만난다"인지 문제를 다시 읽어요.',
    calc(r, c) {
      // 나눠 주기: 한 명이 받는 수(m, n)가 사람 수(g)와 겹치지 않게 — "몇 명"과 "몇 개"를 헷갈린 오답이 드러나야 한다
      const G = gcdPair(r, [4, 6, 8, 9, 10, 12], 60, [2, 5], (g, m, n) => m !== g && n !== g);
      const pG = smallestPrime(G.g);
      const D = gcdPair(r, [2, 3, 4], 20, [2, 5]);   // 함께 오는 날
      const T = gcdPair(r, [4, 6, 8, 9, 10, 12], 60, [2, 5]); // 정사각형 자르기
      const pT = smallestPrime(T.g);
      const fams = [
        { ans: String(G.g), wr: [{ text: String(G.L), tag: TAGS.useSwap }, { text: String(pG), tag: TAGS.smallCommon }],
          why: {
            [TAGS.useSwap]: `${G.L}명이면 나무열매가 모자라요(${G.a}개뿐). 똑같이 나눠 줄 수 있는 가장 많은 사람 수는 최대공약수 ${jn(G.g, '이에요', '예요')}.`,
            [TAGS.smallCommon]: `${pG}명에게도 나눠 줄 수 있지만, **최대** 몇 명인지 물었어요.`,
          },
          probe: { gcd: [G.a, G.b] }, steps: ['남김없이 똑같이, 가장 많은 사람 → 최대공약수', `${jn(G.a, '과', '와')} ${G.b}의 최대공약수 = ${G.g}`], pools: {
            pokemon: [`{mon/이/가} 나무열매 ${G.a}개와 포션 ${G.b}개를 친구들에게 남김없이 똑같이 나눠 주려고 해요. 최대 몇 명에게 나눠 줄 수 있을까요?`],
          } },
        { ans: String(G.n), wr: [{ text: String(G.g), tag: TAGS.askedWrong }, { text: String(G.m), tag: TAGS.askedWrong }],
          why: { [TAGS.askedWrong]: `친구 수(${G.g}명)나 나무열매 수(${G.m}개)가 아니라, 한 명이 받는 **포션** 수를 물었어요.` },
          probe: { share: [G.a, G.b] }, steps: [`가장 많은 친구 수 = 최대공약수 ${G.g}명`, `포션 ${G.b} ÷ ${G.g} = ${G.n}개`], pools: {
            pokemon: [`{mon/이/가} 나무열매 ${G.a}개와 포션 ${G.b}개를 최대한 많은 친구에게 남김없이 똑같이 나눠 주려고 해요. 한 명이 받는 포션은 몇 개일까요?`],
          } },
        { ans: String(D.L), wr: [{ text: String(D.g), tag: TAGS.useSwap }, { text: String(D.a * D.b), tag: TAGS.prodAsLcm }, { text: String(D.a + D.b), tag: TAGS.addBoth }],
          why: {
            [TAGS.useSwap]: `${D.g}일 뒤에는 둘 다 안 와요. 함께 오는 날은 두 수의 **공배수** — 가장 가까운 날은 최소공배수 ${D.L}일 뒤예요.`,
            [TAGS.prodAsLcm]: `${D.a} × ${D.b} = ${D.a * D.b}일 뒤에도 함께 오지만, 더 빠른 날이 있어요.`,
            [TAGS.addBoth]: `${D.a + D.b}일 뒤는 ${D.a}의 배수도, ${D.b}의 배수도 아니에요.`,
          },
          probe: { lcm: [D.a, D.b] }, steps: ['다음에 함께 → 두 수의 공배수 중 가장 작은 수', `${jn(D.a, '과', '와')} ${D.b}의 최소공배수 = ${D.L} → ${D.L}일 뒤`], pools: {
            pokemon: [`{mon/은/는} ${D.a}일마다, {mon2/은/는} ${D.b}일마다 체육관에 와요. 오늘 둘이 함께 왔다면, 다음에 함께 오는 날은 며칠 뒤일까요?`],
          } },
        { ans: String(T.g), wr: [{ text: String(T.L), tag: TAGS.useSwap }, { text: String(pT), tag: TAGS.smallCommon }],
          why: {
            [TAGS.useSwap]: `한 변이 ${T.L}cm면 종이(${T.a}cm × ${T.b}cm)보다 커요. 가로·세로를 모두 나누는 가장 큰 수를 찾아요.`,
            [TAGS.smallCommon]: `${pT}cm 정사각형으로도 자를 수 있지만, **가장 큰** 정사각형을 물었어요.`,
          },
          probe: { gcd: [T.a, T.b] }, steps: ['가로와 세로를 모두 나누어떨어지게 하는 가장 큰 수 → 최대공약수', `${jn(T.a, '과', '와')} ${T.b}의 최대공약수 = ${T.g}`], pools: {
            pokemon: [`가로 ${T.a}cm, 세로 ${T.b}cm인 종이를 남는 부분 없이 똑같은 정사각형으로 자르려고 해요. 가장 큰 정사각형의 한 변은 몇 cm일까요?`],
          } },
      ];
      const f = pickFamily(r, c, fams);
      return {
        ...ask(this.id, 'calc', fill(worldPick(r, c, f.pools), c), choices(r, f.ans, f.wr), {
          solve: solve(f.steps.map((t, i) => step(i, t)), {
            why: f.why,
            rule: '최대 몇 명에게 똑같이·가장 큰 정사각형 → 최대공약수. 다음에 함께 → 최소공배수.',
          }),
        }),
        probe: f.probe,
      };
    },
    misread(r, c) {
      if (branchOf(r, c, ['share', 'meet']) === 'share') {
        const G = gcdPair(r, [4, 6, 8, 9, 10, 12], 48, [2, 5]);
        const q = showWork(`나무열매 ${G.a}개와 포션 ${G.b}개를 남김없이 똑같이 나눠 주면 최대 ${G.L}명에게 줄 수 있어요`);
        const chs = textChoices(r, `나무열매가 ${G.a}개뿐이라 ${G.L}명에게는 못 줘요 — 최대공약수 ${G.g}명`, [
          { text: '맞게 말했어요', tag: RIGHT_AS_WRONG },
          { text: `두 수를 더한 ${G.a + G.b}명이에요`, tag: TAGS.addBoth },
          { text: `두 수를 곱한 ${G.a * G.b}명이에요`, tag: OFF },
        ]);
        return {
          ...misreadAsk(this.id, 'share', fill(q, c), chs, {
            solve: solve([step(0, '남김없이 똑같이 나눠 줄 가장 많은 사람 → 최대공약수'), step(1, `${jn(G.a, '과', '와')} ${G.b}의 최대공약수 = ${G.g}명`)], {
              whyAny: '최소공배수를 썼어요. 나눠 주는 사람 수는 가진 수보다 많을 수 없어요.',
              rule: '똑같이 나눠 주기 → 최대공약수.',
            }),
          }),
          probe: { gcd: [G.a, G.b], shown: String(G.L) },
        };
      }
      const D = gcdPair(r, [2, 3, 4], 20, [2, 5]);
      // "오늘 함께 왔다면"이 없으면 12일 전·16일 전에 왔던 둘이 4일 뒤에 함께 올 수도 있다 — 기준 날을 글에 (Codex 14차 #2)
      const q = showWork(`오늘 함께 온 둘이 ${D.a}일마다, ${D.b}일마다 온다면 다음에 함께 오는 날은 ${D.g}일 뒤예요`);
      const chs = textChoices(r, `${D.g}일 뒤에는 둘 다 안 와요 — 최소공배수 ${D.L}일 뒤`, [
        { text: '맞게 말했어요', tag: RIGHT_AS_WRONG },
        { text: `두 수를 더한 ${D.a + D.b}일 뒤예요`, tag: TAGS.addBoth },
        { text: `두 수를 곱한 ${D.a * D.b}일 뒤예요`, tag: TAGS.prodAsLcm },
      ]);
      return {
        ...misreadAsk(this.id, 'meet', fill(q, c), chs, {
          solve: solve([step(0, '다음에 함께 → 두 수의 공배수 중 가장 작은 수'), step(1, `${jn(D.a, '과', '와')} ${D.b}의 최소공배수 = ${D.L}일 뒤`)], {
            whyAny: '최대공약수를 썼어요. 함께 오는 날은 두 수의 **배수**라 두 수보다 작을 수 없어요.',
            rule: '다음에 함께 → 최소공배수.',
          }),
        }),
        probe: { lcm: [D.a, D.b], shown: String(D.g) },
      };
    },
  },
];

export function conceptById(id) {
  return FACTOR.find((c) => c.id === id) || null;
}

// ───────────────────── 문항 만들기 (mathdec·mathrat와 같은 모양) ─────────────────────

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
  // "계산 실수" 오답(보기를 채운 근처 값)에도 한 마디 — 이름표별 설명이 없는 오답은 이것을 본다
  if (q && q.solve && !q.solve.whyAny) q.solve.whyAny = c.slip || SLIP;
  return q ? { ...q, key: q.key || cast.key || '' } : q;
}
const SLIP = '한 번 더 천천히 — 약수인지 배수인지 먼저 가려 봐요.';

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
  return diagnosticOf(FACTOR, makeQuestion, seed, n, opts);
}
export function placeFrom(answers) {
  return placeFromOf(FACTOR, answers);
}
export function ladder(doneIds) {
  return ladderOf(FACTOR, doneIds);
}

// ───────────────────── 사람이 쓴 내용 검사 (check.mjs가 부른다) ─────────────────────

function badPlaceholders(txt) {
  const leak = String(txt || '').match(/\{[^}]*\}/g) || [];
  return leak.filter((l) => !/^\{(me|mon|mon2)(\/[^/}]+\/[^}]+)?\}$/.test(l));
}
function badFigures(txt) {
  const figs = String(txt || '').match(/\[[a-z]+ [^\]]+\]/g) || [];
  return figs.filter((f) => !figureSvg(f.slice(1, -1)));
}
/** 보기 글자 → {n, d} — checkHuman의 "정답과 같은 값" 검사용 */
function fracValue(text) {
  const v = valueOf(text);
  if (v === null) return null;
  return { n: Math.round(v * 10000), d: 10000 };
}

/**
 * coach/math/factor.json 형식 검사 — mathrat.checkContent와 같은 규칙
 * @returns {string[]}
 */
export function checkContent(content) {
  const bad = [];
  for (const c of FACTOR) {
    const v = content && content[c.id];
    if (!v) { bad.push(`${c.id}: 내용 없음`); continue; }
    if (!Array.isArray(v.lesson) || v.lesson.length < 3) bad.push(`${c.id}: lesson 3장 이상이어야 함`);
    if (!v.rule) bad.push(`${c.id}: rule 없음`);
    const checks = (v.lesson || []).filter((p) => p && p.check);
    if (checks.length < 2) bad.push(`${c.id}: 확인 질문 2개 이상이어야 함`);
    for (const [i, p] of (v.lesson || []).entries()) {
      if (!p || !p.say) { bad.push(`${c.id}[${i}]: say 없음`); continue; }
      for (const l of badPlaceholders(p.say)) bad.push(`${c.id}[${i}]: 잘못된 자리표시 ${l}`);
      for (const f of badFigures(p.say)) bad.push(`${c.id}[${i}]: 못 그리는 그림 ${f}`);
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
