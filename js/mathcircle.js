// 🔵 수학 — N 원의 넓이 줄기 (초6 2학기 5단원 「원의 둘레와 넓이」):
// 개념 사다리 + 문제 생성기 + 내용 형식 검사. 순수 함수만 — 화면 없음 (node 테스트에서 그대로 돈다).
//
// 왜 이 줄기인가 (2026-10-02, 아버님 "이대로 진행하자"): I 다각형의 넓이 → M 합동과 대칭 다음, 도형·측정의 남은 큰 칸.
// 칸 범위는 미래엔 6-2 지도서 「원의 둘레와 넓이」 11차시 흐름도(265~267쪽)로 확인했다 —
//   원주와 지름의 관계 · 원주율 · 원주와 지름 구하기 · 원의 넓이 어림(모눈 · 원 안팎 정사각형) · 원의 넓이 · 활용(꽃밭·색칠한 부분).
// N1(원의 중심·반지름·지름)은 초3 복습 칸 — 📏 진단에서 알면 건너뛴다.
//
// 오답은 아이가 실제로 하는 틀린 생각 흉내다:
//   · 반지름과 지름을 바꿔 봄 · × 2 대신 + 2 · 원주를 반지름으로 나눔(6.28) · 큰 원은 원주율도 크다고 봄
//   · 반지름에 바로 원주율 · 지름에 또 × 2 · 거꾸로 할 때 곱함 · 바퀴 수를 빠뜨림
//   · 원 밖 정사각형을 원의 넓이로 · 원 안 칸만 셈 · 잘라 붙인 가로를 원주 전체로
//   · 지름 × 지름 × 원주율 · 원주를 넓이로 · 반지름이 2배면 넓이도 2배 · 고리를 반지름의 차로 · 반원 둘레에 지름을 빠뜨림
//
// 새 줄기의 함정(메모 stem-generator-pitfalls)을 처음부터:
//   · 가족 = 틀 여러 개(variant), 틀마다 수를 미리 뽑아 둔다 — 🔁 쌍둥이·🤔 노트가 요청한 틀이 그대로 골라진다 (L과 같은 모양)
//   · 틀 글 속 수의 모양이 늘 같게 — 원주·넓이가 글에 나오면 늘 소수(지름이 50의 배수·반지름이 10의 배수면 자연수가 되어 뺀다)
//   · "(원주율: 3.14)"는 질문 줄 **앞**에 — 숫자판은 마지막 줄의 "몇 cm"에서 단위를 읽는다
//   · 수 답 보기는 수만 (단위를 붙이면 숫자판이 안 뜬다) · 틀린 방법이 우연히 맞는 값을 내는 수(반지름 2: 2 × 2 = 2 × 2)는 뽑지 않는다
//   · 참말에 일반화를 쓰지 않는다 — 원주율은 **약** 3.14 (3.1415…), 잘라 붙인 모양은 직사각형에 **가까워진다**
//   · 아직 안 배운 말: 원주·원주율(N2) → 원의 넓이(N4) → 반지름 × 반지름(N5) → 반원·고리(N7)
//
// ★ 수는 0.01 단위 정수로 센다 (원주율 3.14 = 314) — 소수 셈이 어긋나지 않게.
// ★ 답은 테스트가 **문제 글을 직접 읽어** 따로 다시 푼다.

import { circleCells, figureSvg } from './mathdraw.js';
import { rng, shuffle, fill, castOf, worldPick, ask, solve, int, pick, pickFamily, humanQuestion, checkHuman, diagnosticOf, placeFromOf, ladderOf, numJosa } from './mathgen.js';
import { gradeLabel } from './mathmix.js';

export { gradeLabel };

// ───────────────────── 수 (0.01 단위 정수) ─────────────────────

const U = 100;
const PI = 314; // 원주율 3.14
/** 0.01 단위 정수 → 글자 ("31.4", "78.5", "113.04", "12") */
function fmt(v) {
  const i = Math.floor(v / U);
  const f = v - i * U;
  return f ? `${i}.${String(f).padStart(2, '0').replace(/0+$/, '')}` : String(i);
}
/** 자연수(또는 0.01 단위가 아닌 값) → 0.01 단위 */
const H = (n) => Math.round(n * U);
/** 지름 d의 원주 (0.01 단위) */
const circ = (d) => d * PI;
/** 반지름 r의 넓이 (0.01 단위) */
const area = (r) => r * r * PI;
/** 0.01 단위 값 × 3.14 — 0.0001 단위까지 그대로 (거꾸로 곱한 오답: 37.68 × 3.14 = 118.3152) */
const timesPi = (v) => fmt4(v * PI);
/** 0.0001 단위 정수 → 글자 */
function fmt4(v) {
  const i = Math.floor(v / 10000);
  const f = v - i * 10000;
  return f ? `${i}.${String(f).padStart(4, '0').replace(/0+$/, '')}` : String(i);
}
const PI_NOTE = '(원주율: 3.14)';

// ── 조사 — 수 뒤에서는 읽는 소리로 (0·1·3·6·7·8은 받침) ──
const BAT = new Set(['0', '1', '3', '6', '7', '8']);
const lastDigit = (t) => String(t).replace(/\D+$/, '').slice(-1);
/** 수 글자 + 조사 (이/가·을/를·은/는·과/와·이에요/예요·이니까/니까…) */
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

/** 보기 글자 → 값 (겹침 검사용). 수 하나일 때만 — 문장·식 보기는 null */
export function valueOf(text) {
  const s = String(text == null ? '' : text).trim();
  return /^\d+(\.\d+)?$/.test(s) ? Number(s) : null;
}
const sameValue = (a, b) => a !== null && b !== null && Math.abs(a - b) < 1e-9;

/** 정답 근처의 "계산 실수" — 보기가 모자랄 때만. 소수 답은 마지막 자리 한 칸씩 */
function nearOf(answer, k) {
  const s = String(answer);
  const dec = (s.split('.')[1] || '').length;
  const unit = 10 ** -dec;
  const st = [1, -1, 2, -2, 3, -3, 5, -5][k % 8];
  const v = Math.round((Number(s) + st * unit) * 10 ** dec) / 10 ** dec;
  return v > 0 ? v.toFixed(dec) : '';
}
/** 수 보기 4개 — 정답 + 오개념 오답. 글자·값이 같은 보기는 넣지 않는다 */
function choices(r, answer, wrongs) {
  const list = [{ text: String(answer), ok: true }];
  const vals = [valueOf(answer)];
  const seen = new Set([String(answer)]);
  const dup = (t) => { const v = valueOf(t); return seen.has(String(t)) || (v !== null && vals.some((x) => sameValue(x, v))); };
  const add = (t, tag) => { seen.add(String(t)); vals.push(valueOf(t)); list.push({ text: String(t), ok: false, tag }); };
  for (const w of wrongs) {
    if (!w || w.text === undefined || w.text === '' || valueOf(w.text) === null || valueOf(w.text) <= 0 || dup(w.text) || list.length >= 4) continue;
    add(w.text, w.tag);
  }
  for (let k = 0; list.length < 4 && k < 30; k++) {
    const alt = nearOf(answer, k);
    if (alt && !dup(alt)) add(alt, '계산 실수');
  }
  return shuffle(r, list);
}
/** 문장·식 보기 — 근처 수로 채우지 않는다 */
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

/** ② 갈래 고르기 — 🔁 쌍둥이·🤔 오답 노트가 요청한 갈래를 먼저 (다른 줄기와 같은 규칙) */
function branchOf(r, c, names) {
  const want = c && c.want && c.want.startsWith('misread:') ? c.want.slice(8) : '';
  if (names.includes(want)) return want;
  const fresh = names.filter((n) => !(c && c.recent && c.recent.includes(`misread:${n}`)));
  return pick(r, fresh.length ? fresh : names);
}
const showWork = (line, verb = '말했어요') => `{mon/이/가} 이렇게 ${verb}.\n\n**${line}**\n\n어디가 틀렸을까요?`;
const step = (no, text) => `${['①', '②', '③', '④'][no] || '·'} ${text}`;

const RIGHT_AS_WRONG = '틀린 줄 모름';
const OFF = '엉뚱한 지적';

/** 이 줄기의 오개념 이름표 (📊·🤔 노트·결과 카드에 그대로 뜬다 — 아직 안 배운 말을 쓰지 않는다) */
export const TAGS = {
  // N1 원의 중심·반지름·지름
  rForD: '반지름과 지름을 바꿔 봄',
  addTwo: '× 2 대신 + 2를 함',
  subTwo: '÷ 2 대신 − 2를 함',
  longR: '가장 긴 선분을 반지름으로 봄',
  radiusWidth: '한 개의 폭을 반지름으로 봄',      // 원 n개를 붙인 길이 = 반지름 × n
  addForMul: '곱하지 않고 더함',
  // N2 원주와 원주율
  byRadius: '반지름으로 나눔',                     // 원주 ÷ 반지름 = 6.28
  subForDiv: '나누지 않고 뺌',                     // 원주 − 지름
  bigPi: '큰 원은 원주율도 크다고 봄',
  invRatio: '지름을 원주로 나눔',
  rangeR: '지름 대신 반지름으로 셈',               // 정육각형·정사각형 둘레를 반지름으로
  sideAsD: '지름을 정육각형의 한 변으로 봄',
  outerLonger: '원주가 원 밖 정사각형보다 길다고 봄',
  addGrow: '늘어난 만큼 더함',                     // 지름이 10 → 20이면 원주도 10 더함
  sameC: '원주는 그대로라고 봄',
  // N3 원주 구하기
  extraDouble: '지름에 또 × 2를 함',
  halfD: '지름을 반으로 나눠 곱함',
  addPi: '원주율을 곱하지 않고 더함',
  noDouble: '반지름에 바로 원주율을 곱함',
  rTwice: '반지름을 두 번 곱함',
  invMul: '거꾸로 할 때 곱함',                     // 지름 = 원주 × 3.14
  subInv: '거꾸로 할 때 뺌',                       // 지름 = 원주 − 3.14
  rForDinv: '지름을 물었는데 반지름을 구함',
  dForR: '반지름을 물었는데 지름을 구함',
  turnsMiss: '바퀴 수를 빠뜨림',
  piMiss: '원주율을 빠뜨림',
  // N4 원의 넓이 어림
  innerOnly: '원 안에 꼭 들어간 칸만 셈',
  touchAll: '걸친 칸까지 모두 원의 넓이로 봄',
  sumUp: '두 수를 더함',
  sumNoHalf: '더하고 ÷ 2를 빠뜨림',
  outerAsArea: '원 밖 정사각형을 원의 넓이로 봄',
  innerSq: '원 안 정사각형을 원의 넓이로 봄',
  rSquare: '반지름을 한 변으로 봄',
  perimForArea: '넓이를 물었는데 둘레를 구함',
  noHalf: '÷ 2를 빠뜨림',
  // N5 원의 넓이 구하는 방법
  widthFull: '원주 전체를 가로로 봄',
  widthR: '가로를 반지름으로 봄',
  widthD: '가로를 지름으로 봄',
  heightD: '세로를 지름으로 봄',
  swapWH: '가로와 세로를 바꿈',
  conserve: '잘라 붙이면 넓이가 변한다고 봄',
  dSquared: '지름 × 지름 × 원주율로 셈',
  circForArea: '넓이를 물었는데 원주를 구함',
  rOnce: '반지름을 한 번만 곱함',
  // N6 원의 넓이 구하기
  dAsR: '지름을 반지름처럼 씀',
  cToD: '원주에서 반지름 대신 지름을 씀',
  circAsArea: '원주를 그대로 넓이로 씀',
  scaleSame: '반지름이 몇 배면 넓이도 그만큼이라고 봄',
  squareAsDouble: '같은 수를 두 번 곱하지 않고 × 2를 함', // 반지름 3배 → 넓이 3 × 2 = 6배 (원고 확인 질문이 먼저 썼다)
  piTimes: '배를 구할 때 원주율까지 곱함',
  rrOnly: '반지름 × 반지름까지만 구함',
  // N7 여러 가지 모양
  noDivide: '원 전체의 넓이를 구함',
  halfForQuarter: '4분의 1인데 반으로 나눔',
  ringDiff: '반지름의 차로 원 하나를 구함',
  ringAdd: '빼지 않고 더함',
  bigOnly: '큰 원만 구함',
  circleOnly: '원의 넓이만 구함',
  subCirc: '넓이에서 원주를 뺌',
  noDiam: '곧은 선(지름)을 빠뜨림',
  arcFull: '원주 전체를 더함',
  noRadii: '곧은 선(반지름 두 개)을 빠뜨림',
  oneRadius: '반지름을 하나만 더함',
};

// ───────────────────── 가족·틀 (variant) — mathrange.js와 같은 모양 ─────────────────────

function famOf(variants) {
  return { variants, pools: { pokemon: variants.map((x) => x.t) } };
}
function runFamily(r, c, fams) {
  const f = pickFamily(r, c, fams);
  const t = worldPick(r, c, f.pools);
  return f.variants.find((x) => x.t === t) || f.variants[0];
}
/** 고른 틀로 ① 문항 만들기 — v: { t, ans, wr, steps, why, rule, text(문장·식 보기), probe } */
function calcAsk(r, c, concept, v) {
  const chs = v.text ? textChoices(r, v.ans, v.wr) : choices(r, v.ans, v.wr);
  return {
    ...ask(concept.id, 'calc', fill(v.t, c), chs, {
      solve: solve(v.steps.map((s, i) => step(i, s)), { why: v.why || {}, whyAny: v.whyAny || '', rule: v.rule || concept.rule }),
    }),
    probe: v.probe || null,
  };
}
/** ② 문항 — m: { q, ok, wr, steps, whyAny, rule, probe } */
function misAsk(r, c, concept, branch, m) {
  const F = (t) => fill(t, c);
  const chs = textChoices(r, F(m.ok), m.wr.map((w) => ({ ...w, text: F(w.text) })));
  return {
    ...ask(concept.id, 'misread', F(m.q), chs, { solve: solve(m.steps.map((t, i) => step(i, F(t))), { whyAny: F(m.whyAny), rule: m.rule || concept.rule }) }),
    key: `misread:${branch}`,
    probe: m.probe || null,
  };
}

/** 지름 d — 원주가 소수로 나오게 (50의 배수면 자연수가 되어 틀 글의 수 모양이 바뀐다) */
const pickD = (r, lo, hi) => { let d = int(r, lo, hi); if (d % 50 === 0) d += 1; return d; };
/** 반지름 r — 넓이가 소수로 나오게 (10의 배수면 자연수) */
const pickR = (r, lo, hi) => { let x = int(r, lo, hi); if (x % 10 === 0) x += 1; return x; };

// ───────────────────── 개념 사다리 (N. 원의 넓이 줄기) ─────────────────────

export const CIRCLE = [
  {
    id: 'cir.parts', grade: 6, name: '원의 중심·반지름·지름', needs: [],
    idea: '원의 한가운데 점이 **원의 중심**, 중심에서 원 위의 한 점까지 이은 선분이 **반지름**, 원 위의 두 점을 이은 선분 중 원의 중심을 지나는 선분이 **지름**이에요. 한 원에서 **지름 = 반지름 × 2**, 반지름 = 지름 ÷ 2. 원 안에 그을 수 있는 가장 긴 선분이 지름이에요.',
    rule: '지름 = 반지름 × 2, 반지름 = 지름 ÷ 2.',
    slip: '주어진 것이 반지름인지 지름인지 먼저 보고, 2배인지 반인지 정해요.',
    calc(r, c) {
      const fams = [];
      // 반지름 → 지름
      fams.push(famOf([
        (() => { const R = int(r, 3, 20); return rToD(R, `{mon/이/가} 컴퍼스를 ${R} cm만큼 벌려서 원을 그렸어요.\n\n[circle r=${R} d=?]\n\n이 원의 지름은 몇 cm일까요?`); })(),
        (() => { const R = int(r, 3, 20); return rToD(R, `반지름이 ${R} cm인 원 모양 배지가 있어요.\n\n[circle r=${R} d=?]\n\n배지의 지름은 몇 cm일까요?`); })(),
      ]));
      // 지름 → 반지름
      fams.push(famOf([
        (() => { const D = 2 * int(r, 3, 20); return dToR(D, `지름이 ${D} cm인 원 모양 접시가 있어요.\n\n[circle d=${D} r=?]\n\n접시의 반지름은 몇 cm일까요?`); })(),
        (() => { const D = 2 * int(r, 3, 20); return dToR(D, `{mon}의 원 모양 훌라후프는 지름이 ${D} cm예요.\n\n[circle d=${D} r=?]\n\n훌라후프의 반지름은 몇 cm일까요?`); })(),
      ]));
      // 가장 긴 선분
      fams.push(famOf([(() => {
        const R = int(r, 3, 20);
        return {
          t: `반지름이 ${R} cm인 원이 있어요.\n\n[circle r=${R}]\n\n원 위의 두 점을 이은 선분 중에서 가장 긴 선분은 몇 cm일까요?`,
          ans: String(2 * R), wr: [{ text: String(R), tag: TAGS.longR }, { text: String(R + 2), tag: TAGS.addTwo }],
          steps: ['원 위의 두 점을 이은 선분 중에서 가장 긴 것은 원의 중심을 지나는 지름', `지름 = ${R} × 2 = ${2 * R}`],
          why: { [TAGS.longR]: `반지름은 원의 중심에서 끝나요. 원의 중심을 지나 끝까지 이은 지름이 더 길어요.`, [TAGS.addTwo]: `지름은 반지름 두 개 — ${R} + 2가 아니라 ${R} × 2예요.` },
          probe: { r: R, ask: 'longest' },
        };
      })()]));
      // 원 여러 개를 한 줄로
      fams.push(famOf([
        (() => { const [R, n] = rowPick(r); return rowOf(R, n, `반지름이 ${R} cm인 동전 ${n}개를 한 줄로 맞닿게 놓았어요.\n\n[circle row n=${n} r=${R}]\n\n양 끝 사이의 길이는 몇 cm일까요?`); })(),
        (() => { const [R, n] = rowPick(r); return rowOf(R, n, `{mon/이/가} 반지름이 ${R} cm인 원 모양 쿠키 ${n}개를 한 줄로 맞닿게 놓았어요.\n\n[circle row n=${n} r=${R}]\n\n쿠키 줄의 전체 길이는 몇 cm일까요?`); })(),
      ]));
      return calcAsk(r, c, this, runFamily(r, c, fams));
    },
    misread(r, c) {
      if (branchOf(r, c, ['half', 'row']) === 'half') {
        const R = int(r, 3, 15);
        return misAsk(r, c, this, 'half', {
          q: `반지름이 ${R} cm인 원이 있어요.\n\n[circle r=${R}]\n\n${showWork(`반지름이 ${R} cm인 원의 지름은 ${R} ÷ 2 = ${fmt(H(R / 2))} cm예요`)}`,
          ok: `지름은 반지름의 2배 — ${R} × 2 = ${2 * R} cm`,
          wr: [
            { text: '맞게 말했어요', tag: RIGHT_AS_WRONG },
            { text: `${R} + 2 = ${R + 2} cm예요`, tag: TAGS.addTwo },
            { text: '원의 지름은 잴 수 없어요', tag: OFF },
          ],
          steps: ['지름은 원의 중심을 지나니까 반지름 두 개를 이은 길이', `${R} × 2 = ${2 * R} cm`],
          whyAny: '반으로 나눴어요. 지름은 반지름 두 개를 이은 길이라서 반지름보다 길어요.',
          rule: '지름 = 반지름 × 2.',
          probe: { r: R, shown: H(R / 2), ask: 'd' },
        });
      }
      const [R, n] = rowPick(r);
      return misAsk(r, c, this, 'row', {
        q: `동전 ${n}개를 한 줄로 맞닿게 놓았어요.\n\n[circle row n=${n} r=${R}]\n\n${showWork(`반지름이 ${R} cm인 동전 ${n}개를 한 줄로 놓으면 전체 길이는 ${R} × ${n} = ${R * n} cm예요`)}`,
        ok: `동전 하나의 폭은 지름 — ${R} × 2 × ${n} = ${2 * R * n} cm`,
        wr: [
          { text: '맞게 말했어요', tag: RIGHT_AS_WRONG },
          { text: `${R} × 2 + ${n} = ${2 * R + n} cm예요`, tag: TAGS.addForMul },
          { text: '동전은 둥글어서 길이를 잴 수 없어요', tag: OFF },
        ],
        steps: [`동전 하나의 폭 = 지름 = ${R} × 2 = ${2 * R} cm`, `${n}개 → ${2 * R} × ${n} = ${2 * R * n} cm`],
        whyAny: '동전 하나가 차지하는 길이는 반지름이 아니라 지름이에요.',
        rule: '맞닿게 놓은 원 하나의 폭은 지름.',
        probe: { r: R, n, shown: R * n, ask: 'row' },
      });
    },
  },

  {
    id: 'cir.ratio', grade: 6, name: '원주와 원주율', needs: ['cir.parts'],
    idea: '원의 둘레를 **원주**라고 해요. 원주는 지름의 3배보다 길고 4배보다 짧아요. 원의 크기와 상관없이 **원주 ÷ 지름**은 늘 같은데, 이 값을 **원주율**이라고 해요. 원주율은 3.1415…처럼 끝없이 이어져서 보통 **약 3.14**로 써요.',
    rule: '원주율 = 원주 ÷ 지름 — 원의 크기와 상관없이 같아요 (약 3.14).',
    slip: '원주를 무엇으로 나누는지 먼저 봐요 — 지름이에요.',
    calc(r, c) {
      const fams = [];
      // 원주 ÷ 지름
      fams.push(famOf([
        (() => { const d = pickD(r, 3, 40); return ratioOf(d, `{mon/이/가} 원 모양 접시의 둘레를 줄자로 재었더니 ${fmt(circ(d))} cm였어요. 접시의 지름은 ${d} cm예요.\n\n원주는 지름의 몇 배일까요?`); })(),
        (() => { const d = pickD(r, 3, 40); return ratioOf(d, `지름이 ${d} cm인 바퀴의 원주를 재었더니 ${fmt(circ(d))} cm였어요.\n\n(원주) ÷ (지름)은 얼마일까요?`); })(),
      ]));
      // 크기가 다른 두 원
      fams.push(famOf([(() => {
        const d1 = int(r, 3, 10); const k = int(r, 2, 4); const d2 = d1 * k;
        return {
          t: `크기가 다른 원 두 개가 있어요. 작은 원은 지름이 ${d1} cm, 원주가 ${fmt(circ(d1))} cm예요. 큰 원은 지름이 ${d2} cm, 원주가 ${fmt(circ(d2))} cm예요.\n\n큰 원의 (원주) ÷ (지름)은 얼마일까요?`,
          ans: '3.14',
          wr: [{ text: fmt(PI * k), tag: TAGS.bigPi }, { text: fmt(circ(d2) - H(d2)), tag: TAGS.subForDiv }],
          steps: [`큰 원: ${fmt(circ(d2))} ÷ ${d2} = 3.14`, `작은 원도 ${fmt(circ(d1))} ÷ ${d1} = 3.14 — 크기가 달라도 원주 ÷ 지름은 같아요`],
          why: {
            [TAGS.bigPi]: `원이 ${k}배 커지면 원주도 지름도 똑같이 ${k}배가 돼요. 그래서 나눈 값은 그대로 3.14예요.`,
            [TAGS.subForDiv]: '빼면 원주가 지름보다 얼마나 긴지가 나와요. 몇 배인지는 나눠서 구해요.',
          },
          probe: { d: [d1, d2], ask: 'ratio2' },
        };
      })()]));
      // 원주의 범위 — 원 안 정육각형 · 원 밖 정사각형
      fams.push(famOf([(() => {
        const d = 2 * int(r, 2, 10); const rr = d / 2;
        return {
          t: `지름이 ${d} cm인 원 안에 꼭짓점이 원에 닿는 정육각형을, 원 밖에 원을 둘러싼 정사각형을 그렸어요.\n\n[circle poly d=${d}]\n\n원주를 바르게 말한 것은 어느 것일까요?`,
          text: true, ans: `${3 * d} cm보다 길고 ${4 * d} cm보다 짧아요`,
          wr: [
            { text: `${3 * rr} cm보다 길고 ${4 * rr} cm보다 짧아요`, tag: TAGS.rangeR },
            { text: `${4 * d} cm보다 길고 ${6 * d} cm보다 짧아요`, tag: TAGS.sideAsD },
            { text: `${4 * d} cm보다 길어요`, tag: TAGS.outerLonger },
          ],
          steps: [
            `정육각형의 한 변은 반지름 ${rr} cm → 둘레 ${rr} × 6 = ${3 * d} cm`,
            `정사각형의 한 변은 지름 ${d} cm → 둘레 ${d} × 4 = ${4 * d} cm`,
            `원주는 그 사이 — ${3 * d} cm보다 길고 ${4 * d} cm보다 짧아요`,
          ],
          why: {
            [TAGS.rangeR]: `정육각형의 둘레는 반지름 6개, 정사각형의 둘레는 지름 4개예요. 반지름으로만 세면 둘 다 반으로 줄어요.`,
            [TAGS.sideAsD]: `정육각형의 한 변은 지름이 아니라 반지름(${rr} cm)과 같아요 — 정삼각형 6개로 나뉘어요.`,
            [TAGS.outerLonger]: '원은 원 밖 정사각형 안에 들어 있어서 원주가 정사각형의 둘레보다 짧아요.',
          },
          probe: { d, ask: 'range' },
        };
      })()]));
      // 지름이 몇 배 → 원주도 몇 배
      fams.push(famOf([(() => {
        const d1 = int(r, 3, 12); const k = int(r, 2, 4); const d2 = d1 * k;
        return {
          t: `지름이 ${d1} cm인 원의 원주는 ${fmt(circ(d1))} cm예요.\n\n지름이 ${d2} cm인 원의 원주는 몇 cm일까요?`,
          ans: fmt(circ(d2)),
          wr: [{ text: fmt(circ(d1) + H(d2 - d1)), tag: TAGS.addGrow }, { text: fmt(circ(d1)), tag: TAGS.sameC }],
          steps: [`지름이 ${d1} cm에서 ${d2} cm로 ${k}배`, `원주도 ${k}배 — ${fmt(circ(d1))} × ${k} = ${fmt(circ(d2))}`],
          why: {
            [TAGS.addGrow]: `지름이 ${d2 - d1} cm 늘었다고 원주도 ${d2 - d1} cm 느는 게 아니에요. 원주는 지름의 약 3.14배라서 지름이 ${k}배면 원주도 ${k}배예요.`,
            [TAGS.sameC]: `원이 커지면 둘레도 길어져요. 지름이 ${k}배면 원주도 ${k}배예요.`,
          },
          probe: { d: [d1, d2], ask: 'scale' },
        };
      })()]));
      return calcAsk(r, c, this, runFamily(r, c, fams));
    },
    misread(r, c) {
      if (branchOf(r, c, ['radius', 'big']) === 'radius') {
        const d = 2 * int(r, 2, 15); const rr = d / 2;
        return misAsk(r, c, this, 'radius', {
          q: `원주가 ${fmt(circ(d))} cm인 원이 있어요.\n\n[circle r=${rr}]\n\n${showWork(`이 원의 원주율은 ${fmt(circ(d))} ÷ ${rr} = 6.28이에요`)}`,
          ok: `원주율은 원주 ÷ 지름 — ${fmt(circ(d))} ÷ ${d} = 3.14`,
          wr: [
            { text: '맞게 말했어요', tag: RIGHT_AS_WRONG },
            { text: `원주 − 지름으로 ${fmt(circ(d))} − ${d} = ${jn(fmt(circ(d) - H(d)), '이에요', '예요')}`, tag: TAGS.subForDiv },
            { text: '원의 둘레는 잴 수 없어요', tag: OFF },
          ],
          steps: [`지름 = ${rr} × 2 = ${d} cm`, `원주율 = 원주 ÷ 지름 = ${fmt(circ(d))} ÷ ${d} = 3.14`],
          whyAny: '반지름으로 나눴어요. 원주율은 원주를 지름으로 나눈 값이에요 — 지름은 반지름의 2배.',
          rule: '원주율 = 원주 ÷ 지름.',
          probe: { r: rr, ask: 'ratio' },
        });
      }
      const d1 = int(r, 3, 10); const k = int(r, 2, 4); const d2 = d1 * k;
      return misAsk(r, c, this, 'big', {
        q: `지름이 ${d1} cm인 원과 지름이 ${d2} cm인 원이 있어요.\n\n${showWork(`큰 원은 지름이 ${k}배니까 원주율도 3.14 × ${k} = ${jn(fmt(PI * k), '이에요', '예요')}`)}`,
        ok: '원의 크기와 상관없이 원주 ÷ 지름은 같아요 — 약 3.14',
        wr: [
          { text: '맞게 말했어요', tag: RIGHT_AS_WRONG },
          { text: '원주율은 지름 ÷ 원주라서 큰 원일수록 작아져요', tag: TAGS.invRatio },
          { text: '큰 원은 원주율을 구할 수 없어요', tag: OFF },
        ],
        steps: [`큰 원은 지름도 원주도 ${k}배`, `${fmt(circ(d2))} ÷ ${d2} = 3.14 — 작은 원과 같아요`],
        whyAny: `지름이 ${k}배가 되면 원주도 ${k}배가 돼서, 원주 ÷ 지름은 그대로예요.`,
        rule: '원주율은 원의 크기와 상관없이 같아요.',
        probe: { d: [d1, d2], ask: 'big', shown: PI * k },
      });
    },
  },

  {
    id: 'cir.circum', grade: 6, name: '원주와 지름 구하기', needs: ['cir.ratio'],
    idea: '원주 ÷ 지름 = 원주율이니까 **원주 = 지름 × 원주율**. 반지름을 알면 **반지름 × 2 × 원주율**. 거꾸로 원주를 알면 **지름 = 원주 ÷ 원주율**, 반지름은 거기서 ÷ 2. 바퀴가 한 바퀴 굴러간 거리는 바퀴의 원주예요.',
    rule: '원주 = 지름 × 원주율, 지름 = 원주 ÷ 원주율.',
    slip: '주어진 것이 지름인지 반지름인지, 구하는 것이 원주인지 지름인지 먼저 봐요.',
    calc(r, c) {
      const fams = [];
      // 지름 → 원주
      fams.push(famOf([
        (() => { const d = pickD(r, 3, 40); return dToC(d, 'cm', `지름이 ${d} cm인 원이 있어요. ${PI_NOTE}\n\n[circle d=${d}]\n\n이 원의 원주는 몇 cm일까요?`); })(),
        (() => { const d = pickD(r, 3, 40); return dToC(d, 'm', `{mon/이/가} 지름이 ${d} m인 원 모양 연못 둘레를 한 바퀴 걸어요. ${PI_NOTE}\n\n[circle d=${d} m]\n\n{mon/이/가} 걸은 거리는 몇 m일까요?`); })(),
      ]));
      // 반지름 → 원주
      fams.push(famOf([
        (() => { const R = int(r, 3, 20); return rToC(R, `반지름이 ${R} cm인 원이 있어요. ${PI_NOTE}\n\n[circle r=${R}]\n\n이 원의 원주는 몇 cm일까요?`); })(),
        (() => { const R = int(r, 3, 20); return rToC(R, `{mon/이/가} 반지름이 ${R} cm인 원 모양 쿠키를 구웠어요. ${PI_NOTE}\n\n[circle r=${R}]\n\n쿠키의 둘레는 몇 cm일까요?`); })(),
      ]));
      // 원주 → 지름
      fams.push(famOf([
        (() => { const d = pickD(r, 3, 40); return cToDiam(d, `원주가 ${fmt(circ(d))} cm인 원이 있어요. ${PI_NOTE}\n\n[circle d=?]\n\n이 원의 지름은 몇 cm일까요?`); })(),
        (() => { const d = pickD(r, 3, 40); return cToDiam(d, `{mon/이/가} 둥근 나무의 둘레를 재었더니 ${fmt(circ(d))} cm였어요. ${PI_NOTE}\n\n나무의 지름은 몇 cm일까요?`); })(),
      ]));
      // 원주 → 반지름
      fams.push(famOf([(() => {
        const R = int(r, 2, 20); const C = circ(2 * R);
        return {
          t: `원주가 ${fmt(C)} cm인 원 모양 시계가 있어요. ${PI_NOTE}\n\n[circle r=?]\n\n시계의 반지름은 몇 cm일까요?`,
          ans: String(R), wr: [{ text: String(2 * R), tag: TAGS.dForR }, { text: timesPi(C), tag: TAGS.invMul }],
          steps: [`지름 = ${fmt(C)} ÷ 3.14 = ${2 * R}`, `반지름 = ${2 * R} ÷ 2 = ${R}`],
          why: {
            [TAGS.dForR]: `${fmt(C)} ÷ 3.14 = ${jn(2 * R, '은', '는')} 지름이에요. 반지름은 한 번 더 ÷ 2.`,
            [TAGS.invMul]: '원주를 알 때 지름은 곱하지 않고 나눠서 구해요 — 원주 ÷ 원주율.',
          },
          probe: { C, ask: 'r' },
        };
      })()]));
      // 바퀴가 굴러간 거리
      fams.push(famOf([
        (() => { const d = int(r, 3, 9) * 10; const n = int(r, 2, 5); return wheelOf(d, n, `지름이 ${d} cm인 굴렁쇠를 ${n}바퀴 굴렸어요. ${PI_NOTE}\n\n굴렁쇠가 굴러간 거리는 몇 cm일까요?`); })(),
        (() => { const d = int(r, 3, 9) * 10; const n = int(r, 2, 5); return wheelOf(d, n, `{mon/이/가} 지름이 ${d} cm인 바퀴 자를 ${n}바퀴 굴려 복도의 길이를 재었어요. ${PI_NOTE}\n\n복도의 길이는 몇 cm일까요?`); })(),
      ]));
      return calcAsk(r, c, this, runFamily(r, c, fams));
    },
    misread(r, c) {
      if (branchOf(r, c, ['radius', 'inverse']) === 'radius') {
        const R = int(r, 3, 20);
        return misAsk(r, c, this, 'radius', {
          q: `반지름이 ${R} cm인 원이 있어요. ${PI_NOTE}\n\n[circle r=${R}]\n\n${showWork(`원주는 ${R} × 3.14 = ${fmt(R * PI)} cm예요`)}`,
          ok: `반지름 × 2 × 원주율 — ${R} × 2 × 3.14 = ${fmt(circ(2 * R))} cm`,
          wr: [
            { text: '맞게 말했어요', tag: RIGHT_AS_WRONG },
            { text: `${R} × ${R} × 3.14 = ${fmt(area(R))} cm예요`, tag: TAGS.rTwice },
            { text: '반지름으로는 원주를 구할 수 없어요', tag: OFF },
          ],
          steps: [`지름 = ${R} × 2 = ${2 * R} cm`, `원주 = ${2 * R} × 3.14 = ${fmt(circ(2 * R))} cm`],
          whyAny: '반지름에 바로 원주율을 곱했어요. 원주율은 원주 ÷ **지름**이라서 지름(반지름 × 2)에 곱해요.',
          rule: '원주 = 반지름 × 2 × 원주율.',
          probe: { r: R, shown: R * PI, ask: 'C' },
        });
      }
      const d = pickD(r, 3, 40); const C = circ(d);
      return misAsk(r, c, this, 'inverse', {
        q: `원주가 ${fmt(C)} cm인 원이 있어요. ${PI_NOTE}\n\n${showWork(`지름은 ${fmt(C)} × 3.14 = ${timesPi(C)} cm예요`)}`,
        ok: `지름 = 원주 ÷ 원주율 — ${fmt(C)} ÷ 3.14 = ${d} cm`,
        wr: [
          { text: '맞게 말했어요', tag: RIGHT_AS_WRONG },
          { text: `${fmt(C)} − 3.14 = ${fmt(C - PI)} cm예요`, tag: TAGS.subInv },
          { text: '원주를 알아도 지름은 구할 수 없어요', tag: OFF },
        ],
        steps: ['원주 = 지름 × 원주율이니까 거꾸로 지름 = 원주 ÷ 원주율', `${fmt(C)} ÷ 3.14 = ${d} cm`],
        whyAny: '거꾸로 갈 때도 곱했어요. 지름에 3.14를 곱해서 원주가 됐으니, 원주에서 지름으로 갈 때는 3.14로 나눠요.',
        rule: '지름 = 원주 ÷ 원주율.',
        probe: { C, ask: 'd', shown: timesPi(C) },
      });
    },
  },

  {
    id: 'cir.estimate', grade: 6, name: '원의 넓이 어림하기', needs: ['cir.circum'],
    idea: '원의 넓이는 **원 안 정사각형**보다 크고 **원 밖 정사각형**보다 작아요. 원 안 정사각형은 두 대각선이 지름이라 넓이가 지름 × 지름 ÷ 2, 원 밖 정사각형은 한 변이 지름이라 지름 × 지름. 모눈으로 세면 원 안에 꼭 들어간 칸보다 크고, 원에 걸친 칸까지 센 것보다 작아요.',
    rule: '원 안 정사각형 < 원의 넓이 < 원 밖 정사각형.',
    slip: '원보다 작은 것과 원보다 큰 것을 먼저 찾고, 원은 그 사이에 있어요.',
    calc(r, c) {
      const fams = [];
      // 모눈 — 범위
      fams.push(famOf([(() => {
        const R = int(r, 3, 7); const { inside: a, touch: b } = circleCells(R);
        const ans = `${a} cm²보다 크고 ${b} cm²보다 작아요`;
        return {
          t: `모눈 한 칸의 넓이는 1 cm²예요. 반지름이 ${R} cm인 원을 그렸더니 원 안에 꼭 들어간 칸은 ${a}칸, 원에 걸친 칸까지 모두 세면 ${b}칸이에요.\n\n[circle grid r=${R}]\n\n원의 넓이를 바르게 어림한 것은 어느 것일까요?`,
          text: true, ans,
          wr: [{ text: `${a} cm²예요`, tag: TAGS.innerOnly }, { text: `${b} cm²예요`, tag: TAGS.touchAll }, { text: `${a + b} cm²보다 커요`, tag: TAGS.sumUp }],
          steps: [`원 안에 꼭 들어간 ${a}칸은 모두 원 안 → 원의 넓이는 ${a} cm²보다 커요`, `걸친 칸은 일부만 원 안 → ${b} cm²보다 작아요`, `그래서 ${ans}`],
          why: {
            [TAGS.innerOnly]: '걸친 칸에도 원이 조금씩 들어 있어요. 꼭 들어간 칸만 세면 원보다 작아요.',
            [TAGS.touchAll]: '걸친 칸은 일부만 원 안이에요. 다 세면 원보다 커요.',
            [TAGS.sumUp]: '두 수를 더하면 원보다 훨씬 커져요. 원의 넓이는 두 수 사이예요.',
          },
          probe: { grid: R, ask: 'range' },
        };
      })()]));
      // 모눈 — 한가운데로 어림
      fams.push(famOf([(() => {
        const R = int(r, 3, 7); const { inside: a, touch: b } = circleCells(R);
        return {
          t: `모눈 한 칸의 넓이는 1 cm²예요. 반지름이 ${R} cm인 원 안에 꼭 들어간 칸은 ${a}칸, 원에 걸친 칸까지 세면 ${b}칸이에요.\n\n[circle grid r=${R}]\n\n원의 넓이를 두 수의 한가운데로 어림하면 약 몇 cm²일까요?`,
          ans: String((a + b) / 2),
          wr: [{ text: String(a + b), tag: TAGS.sumNoHalf }, { text: String(a), tag: TAGS.innerOnly }, { text: String(b), tag: TAGS.touchAll }],
          steps: [`${a} + ${b} = ${a + b}`, `${a + b} ÷ 2 = ${(a + b) / 2} → 약 ${(a + b) / 2} cm²`],
          why: {
            [TAGS.sumNoHalf]: '더한 다음 ÷ 2를 해야 두 수의 한가운데예요.',
            [TAGS.innerOnly]: '꼭 들어간 칸만 세면 원보다 작아요. 한가운데는 두 수를 더해 ÷ 2.',
            [TAGS.touchAll]: '걸친 칸까지 세면 원보다 커요. 한가운데는 두 수를 더해 ÷ 2.',
          },
          probe: { grid: R, ask: 'mid' },
        };
      })()]));
      // 원 밖 정사각형 — 지름 16이면 반지름 × 반지름(64)과 둘레(16 × 4 = 64)가 같아 두 오답이 하나로 합쳐진다
      fams.push(famOf([(() => {
        let d = 2 * int(r, 3, 10); if (d === 16) d = 18; const rr = d / 2;
        return {
          t: `지름이 ${d} cm인 원과 원 안 정사각형, 원 밖 정사각형을 그렸어요.\n\n[circle box d=${d}]\n\n원 밖 정사각형의 넓이는 몇 cm²일까요?`,
          ans: String(d * d), wr: [{ text: String(rr * rr), tag: TAGS.rSquare }, { text: String(d * 4), tag: TAGS.perimForArea }],
          steps: [`원 밖 정사각형의 한 변 = 지름 ${d} cm`, `${d} × ${d} = ${d * d}`],
          why: {
            [TAGS.rSquare]: `원 밖 정사각형의 한 변은 반지름이 아니라 지름(${d} cm)이에요.`,
            [TAGS.perimForArea]: `${d} × 4는 정사각형의 둘레예요. 넓이는 한 변 × 한 변.`,
          },
          probe: { d, ask: 'outer' },
        };
      })()]));
      // 원 안 정사각형
      fams.push(famOf([(() => {
        const d = 2 * int(r, 3, 10); const rr = d / 2;
        return {
          t: `지름이 ${d} cm인 원 안에 네 꼭짓점이 원에 닿는 정사각형을 그렸어요.\n\n[circle box d=${d}]\n\n원 안 정사각형의 넓이는 몇 cm²일까요?`,
          ans: String((d * d) / 2), wr: [{ text: String(d * d), tag: TAGS.noHalf }, { text: String(rr * rr), tag: TAGS.rSquare }],
          steps: [`원 안 정사각형의 두 대각선은 모두 지름 ${d} cm`, `대각선 × 대각선 ÷ 2 = ${d} × ${d} ÷ 2 = ${(d * d) / 2}`],
          why: {
            [TAGS.noHalf]: `${d} × ${jn(d, '은', '는')} 원 밖 정사각형의 넓이예요. 대각선으로 구할 때는 ÷ 2를 해요.`,
            [TAGS.rSquare]: '원 안 정사각형의 대각선이 지름이에요. 반지름을 한 변으로 한 정사각형과는 달라요.',
          },
          probe: { d, ask: 'inner' },
        };
      })()]));
      // 두 정사각형 사이 — 범위
      fams.push(famOf([(() => {
        const d = 2 * int(r, 3, 10); const rr = d / 2;
        const ans = `${(d * d) / 2} cm²보다 크고 ${d * d} cm²보다 작아요`;
        return {
          t: `지름이 ${d} cm인 원에 원 안 정사각형과 원 밖 정사각형을 그렸어요.\n\n[circle box d=${d}]\n\n원의 넓이를 바르게 어림한 것은 어느 것일까요?`,
          text: true, ans,
          wr: [
            { text: `${d * d} cm²예요`, tag: TAGS.outerAsArea },
            { text: `${(d * d) / 2} cm²예요`, tag: TAGS.innerSq },
            { text: `${rr * rr} cm²보다 크고 ${(d * d) / 2} cm²보다 작아요`, tag: TAGS.rSquare },
          ],
          steps: [`원 안 정사각형 ${d} × ${d} ÷ 2 = ${(d * d) / 2} cm² — 원이 더 커요`, `원 밖 정사각형 ${d} × ${d} = ${d * d} cm² — 원이 더 작아요`, `그래서 ${ans}`],
          why: {
            [TAGS.outerAsArea]: '원 밖 정사각형은 원보다 모서리만큼 더 커요.',
            [TAGS.innerSq]: '원 안 정사각형 바깥에도 원이 남아 있어요. 원이 더 커요.',
            [TAGS.rSquare]: '원 안 정사각형도 원 안에 들어 있으니 원은 그보다 커요.',
          },
          probe: { d, ask: 'range' },
        };
      })()]));
      return calcAsk(r, c, this, runFamily(r, c, fams));
    },
    misread(r, c) {
      if (branchOf(r, c, ['outer', 'grid']) === 'outer') {
        const d = 2 * int(r, 3, 10);
        return misAsk(r, c, this, 'outer', {
          q: `지름이 ${d} cm인 원이 있어요.\n\n[circle box d=${d}]\n\n${showWork(`원을 둘러싼 정사각형의 넓이가 ${d * d} cm²니까 원의 넓이도 ${d * d} cm²예요`)}`,
          ok: `원은 원 밖 정사각형보다 작아요 — ${(d * d) / 2} cm²보다 크고 ${d * d} cm²보다 작아요`,
          wr: [
            { text: '맞게 말했어요', tag: RIGHT_AS_WRONG },
            { text: `원은 원 안 정사각형과 같아서 ${(d * d) / 2} cm²예요`, tag: TAGS.innerSq },
            { text: '원은 넓이를 어림할 수 없어요', tag: OFF },
          ],
          steps: [`원 밖 정사각형 ${d * d} cm²에는 원 바깥 모서리까지 들어 있어요`, `원 안 정사각형 ${d} × ${d} ÷ 2 = ${(d * d) / 2} cm²보다는 커요`],
          whyAny: '원 밖 정사각형은 원보다 네 모서리만큼 커요. 원의 넓이는 원 안 정사각형과 원 밖 정사각형 사이예요.',
          probe: { d, ask: 'outer', shown: d * d },
        });
      }
      const R = int(r, 3, 7); const { inside: a, touch: b } = circleCells(R);
      return misAsk(r, c, this, 'grid', {
        q: `모눈 한 칸의 넓이는 1 cm²예요. 반지름이 ${R} cm인 원에 걸친 칸까지 세면 ${b}칸이에요.\n\n[circle grid r=${R}]\n\n${showWork(`원 안에 꼭 들어간 칸만 세면 ${a}칸이니까 원의 넓이는 ${a} cm²예요`)}`,
        ok: `걸친 칸도 일부는 원 안이에요 — ${a} cm²보다 크고 ${b} cm²보다 작아요`,
        wr: [
          { text: '맞게 말했어요', tag: RIGHT_AS_WRONG },
          { text: `두 수를 더해서 ${a + b} cm²예요`, tag: TAGS.sumUp },
          { text: '모눈으로는 넓이를 셀 수 없어요', tag: OFF },
        ],
        steps: [`꼭 들어간 ${a}칸 → 원의 넓이는 ${a} cm²보다 커요`, `걸친 칸까지 ${b}칸 → ${b} cm²보다 작아요`],
        whyAny: '걸친 칸에도 원이 조금씩 들어 있어요. 꼭 들어간 칸만 세면 원보다 작게 어림한 거예요.',
        probe: { grid: R, ask: 'range', shown: a },
      });
    },
  },

  {
    id: 'cir.formula', grade: 6, name: '원의 넓이 구하는 방법', needs: ['cir.estimate'],
    idea: '원을 잘게 잘라 엇갈려 붙이면 **직사각형에 가까워져요**. 조각의 호가 위아래로 반씩 나뉘어서 가로는 **원주의 반**(= 반지름 × 원주율), 세로는 **반지름**. 그래서 **원의 넓이 = 반지름 × 반지름 × 원주율**.',
    rule: '원의 넓이 = 반지름 × 반지름 × 원주율.',
    slip: '잘라 붙인 모양의 가로·세로가 원의 어디였는지 떠올려 봐요.',
    calc(r, c) {
      const fams = [];
      const cut = (R) => `반지름이 ${R} cm인 원을 잘게 잘라 엇갈려 붙였더니 직사각형에 가까운 모양이 되었어요. ${PI_NOTE}\n\n[circle slices r=${R}]\n\n`;
      // 가로
      fams.push(famOf([(() => {
        const R = int(r, 2, 20);
        return {
          t: `${cut(R)}이 모양의 가로는 몇 cm일까요?`,
          ans: fmt(R * PI), wr: [{ text: fmt(circ(2 * R)), tag: TAGS.widthFull }, { text: String(R), tag: TAGS.widthR }, { text: String(2 * R), tag: TAGS.widthD }],
          steps: ['가로 = 원주의 반 (조각의 호가 위아래로 반씩 나뉘어요)', `원주 ${R} × 2 × 3.14 = ${fmt(circ(2 * R))}, 그 반은 ${fmt(circ(2 * R))} ÷ 2 = ${fmt(R * PI)}`],
          why: {
            [TAGS.widthFull]: '원주 전체가 아니라 반만 위쪽(가로)에 있어요. 나머지 반은 아래쪽이에요.',
            [TAGS.widthR]: '반지름은 조각의 옆변 — 세로예요. 가로는 원주의 반.',
            [TAGS.widthD]: '지름이 아니라 원주의 반이 가로예요.',
          },
          probe: { r: R, ask: 'width' },
        };
      })()]));
      // 세로
      fams.push(famOf([(() => {
        const R = int(r, 2, 20);
        return {
          t: `${cut(R)}이 모양의 세로는 몇 cm일까요?`,
          ans: String(R), wr: [{ text: String(2 * R), tag: TAGS.heightD }, { text: fmt(R * PI), tag: TAGS.swapWH }],
          steps: ['조각의 꼭짓점은 원의 중심, 호는 원 위 — 조각의 옆변은 반지름', `세로 = 반지름 = ${R}`],
          why: {
            [TAGS.heightD]: '조각은 원의 중심에서 원 위까지 — 반지름 길이예요. 지름이 아니에요.',
            [TAGS.swapWH]: '원주의 반은 가로예요. 세로는 반지름.',
          },
          probe: { r: R, ask: 'height' },
        };
      })()]));
      // 넓이
      fams.push(famOf([
        (() => { const R = int(r, 3, 20); return areaOfR(R, 'cm', `반지름이 ${R} cm인 원이 있어요. ${PI_NOTE}\n\n[circle r=${R}]\n\n이 원의 넓이는 몇 cm²일까요?`); })(),
        (() => { const R = int(r, 3, 20); return areaOfR(R, 'cm', `{mon/이/가} 반지름이 ${R} cm인 원 모양 피자를 구웠어요. ${PI_NOTE}\n\n[circle r=${R}]\n\n피자의 넓이는 몇 cm²일까요?`); })(),
      ]));
      // 넓이를 구하는 식
      fams.push(famOf([(() => {
        const R = int(r, 3, 15);
        const ans = `${R} × ${R} × 3.14`;
        return {
          t: `반지름이 ${R} cm인 원이 있어요. ${PI_NOTE}\n\n[circle r=${R}]\n\n원의 넓이를 구하는 식은 어느 것일까요?`,
          text: true, ans,
          wr: [{ text: `${2 * R} × ${2 * R} × 3.14`, tag: TAGS.dSquared }, { text: `${R} × 2 × 3.14`, tag: TAGS.circForArea }, { text: `${R} × 3.14`, tag: TAGS.rOnce }],
          steps: ['원의 넓이 = 반지름 × 반지름 × 원주율', `반지름이 ${R} cm → ${ans}`],
          why: {
            [TAGS.dSquared]: `${2 * R} cm는 지름이에요. 넓이에는 반지름을 두 번 곱해요.`,
            [TAGS.circForArea]: `${R} × 2 × 3.14는 원주예요. 넓이는 반지름 × 반지름 × 원주율.`,
            [TAGS.rOnce]: `${R} × 3.14는 잘라 붙인 모양의 가로(원주의 반)뿐이에요. 세로(반지름)까지 곱해야 넓이.`,
          },
          probe: { r: R, ask: 'expr' },
        };
      })()]));
      return calcAsk(r, c, this, runFamily(r, c, fams));
    },
    misread(r, c) {
      if (branchOf(r, c, ['width', 'dsq']) === 'width') {
        const R = int(r, 2, 20);
        return misAsk(r, c, this, 'width', {
          q: `반지름이 ${R} cm인 원을 잘게 잘라 엇갈려 붙였어요. ${PI_NOTE}\n\n[circle slices r=${R}]\n\n${showWork(`잘라 붙인 모양의 가로는 원주와 같아서 ${R} × 2 × 3.14 = ${fmt(circ(2 * R))} cm예요`)}`,
          ok: `원주의 반은 위, 나머지 반은 아래 — 가로는 ${R} × 3.14 = ${fmt(R * PI)} cm`,
          wr: [
            { text: '맞게 말했어요', tag: RIGHT_AS_WRONG },
            { text: `가로는 반지름과 같아서 ${R} cm예요`, tag: TAGS.widthR },
            { text: '잘라 붙이면 넓이가 달라져서 가로를 알 수 없어요', tag: TAGS.conserve },
          ],
          steps: ['조각의 호가 위아래로 반씩 나뉘어요', `가로 = 원주의 반 = ${fmt(circ(2 * R))} ÷ 2 = ${fmt(R * PI)} cm`],
          whyAny: '원주 전체가 가로가 되지 않아요. 조각의 호가 위아래로 반씩 나뉘어서 가로는 원주의 반이에요.',
          rule: '잘라 붙인 모양: 가로 = 원주의 반, 세로 = 반지름.',
          probe: { r: R, ask: 'width', shown: circ(2 * R) },
        });
      }
      const R = int(r, 3, 15);
      return misAsk(r, c, this, 'dsq', {
        q: `반지름이 ${R} cm인 원이 있어요. ${PI_NOTE}\n\n[circle r=${R}]\n\n${showWork(`이 원의 넓이는 ${2 * R} × ${2 * R} × 3.14 = ${fmt(area(2 * R))} cm²예요`)}`,
        ok: `반지름 × 반지름 × 원주율 — ${R} × ${R} × 3.14 = ${fmt(area(R))} cm²`,
        wr: [
          { text: '맞게 말했어요', tag: RIGHT_AS_WRONG },
          { text: `${R} × 2 × 3.14 = ${fmt(circ(2 * R))} cm²예요`, tag: TAGS.circForArea },
          { text: '원은 곡선이라서 넓이를 구할 수 없어요', tag: OFF },
        ],
        steps: ['원의 넓이 = 반지름 × 반지름 × 원주율', `${R} × ${R} × 3.14 = ${fmt(area(R))} cm²`],
        whyAny: `${2 * R} cm는 지름이에요. 지름을 두 번 곱하면 원 밖 정사각형처럼 4배나 커져요.`,
        probe: { r: R, ask: 'area', shown: area(2 * R) },
      });
    },
  },

  {
    id: 'cir.area', grade: 6, name: '원의 넓이 구하기', needs: ['cir.formula'],
    idea: '넓이 식에는 **반지름**이 들어가요. 지름을 알면 ÷ 2, 원주를 알면 ÷ 원주율 ÷ 2로 **반지름부터** 구해요. 반지름이 2배가 되면 넓이는 2 × 2 = 4배.',
    rule: '반지름부터 — 넓이 = 반지름 × 반지름 × 원주율.',
    slip: '주어진 길이가 반지름인지 먼저 확인해요.',
    calc(r, c) {
      const fams = [];
      // 지름 → 넓이
      fams.push(famOf([
        (() => { const d = 2 * int(r, 3, 15); return areaOfD(d, 'cm', `지름이 ${d} cm인 원 모양 거울이 있어요. ${PI_NOTE}\n\n[circle d=${d}]\n\n거울의 넓이는 몇 cm²일까요?`); })(),
        (() => { const d = 2 * int(r, 3, 15); return areaOfD(d, 'm', `{mon/이/가} 지름이 ${d} m인 원 모양 꽃밭에 꽃을 심어요. ${PI_NOTE}\n\n[circle d=${d} m]\n\n꽃밭의 넓이는 몇 m²일까요?`); })(),
      ]));
      // 원주 → 넓이
      fams.push(famOf([(() => {
        const R = int(r, 3, 15); const C = circ(2 * R);
        return {
          t: `원주가 ${fmt(C)} cm인 원 모양 과녁이 있어요. ${PI_NOTE}\n\n과녁의 넓이는 몇 cm²일까요?`,
          ans: fmt(area(R)), wr: [{ text: fmt(area(2 * R)), tag: TAGS.cToD }, { text: fmt(C), tag: TAGS.circAsArea }],
          steps: [`지름 = ${fmt(C)} ÷ 3.14 = ${2 * R}, 반지름 = ${2 * R} ÷ 2 = ${R}`, `${R} × ${R} × 3.14 = ${fmt(area(R))}`],
          why: {
            [TAGS.cToD]: `${fmt(C)} ÷ 3.14 = ${jn(2 * R, '은', '는')} 지름이에요. 반지름은 ${R}.`,
            [TAGS.circAsArea]: '원주는 둘레의 길이예요. 넓이는 반지름을 구해서 반지름 × 반지름 × 원주율.',
          },
          probe: { C, ask: 'area' },
        };
      })()]));
      // 반지름 → 넓이 (생활)
      fams.push(famOf([
        (() => { const R = int(r, 3, 20); return areaOfR(R, 'm', `{mon/이/가} 반지름이 ${R} m인 원 모양 무대에서 노래해요. ${PI_NOTE}\n\n[circle r=${R} m]\n\n무대의 넓이는 몇 m²일까요?`); })(),
        (() => { const R = int(r, 3, 20); return areaOfR(R, 'cm', `반지름이 ${R} cm인 원 모양 방석이 있어요. ${PI_NOTE}\n\n[circle r=${R}]\n\n방석의 넓이는 몇 cm²일까요?`); })(),
      ]));
      // 반지름이 몇 배 → 넓이는 몇 배
      fams.push(famOf([
        (() => { const r1 = int(r, 2, 6); const k = int(r, 2, 4); return scaleOf(r1, k, `반지름이 ${r1} cm인 원과 반지름이 ${r1 * k} cm인 원이 있어요.\n\n큰 원의 넓이는 작은 원의 넓이의 몇 배일까요?`); })(),
        (() => { const r1 = int(r, 2, 6); const k = int(r, 2, 4); return scaleOf(r1, k, `{mon}의 원 모양 방패는 반지름이 ${r1} cm, {mon2}의 방패는 반지름이 ${r1 * k} cm예요.\n\n{mon2}의 방패 넓이는 {mon}의 방패 넓이의 몇 배일까요?`); })(),
      ]));
      // 넓이 → 반지름
      fams.push(famOf([(() => {
        const R = pickR(r, 3, 15); const A = area(R);
        return {
          t: `넓이가 ${fmt(A)} cm²인 원이 있어요. ${PI_NOTE}\n\n[circle r=?]\n\n이 원의 반지름은 몇 cm일까요?`,
          ans: String(R), wr: [{ text: String(R * R), tag: TAGS.rrOnly }, { text: String(2 * R), tag: TAGS.dForR }],
          steps: [`반지름 × 반지름 = ${fmt(A)} ÷ 3.14 = ${R * R}`, `${R} × ${R} = ${jn(R * R, '이니까', '니까')} 반지름은 ${R}`],
          why: {
            [TAGS.rrOnly]: `${jn(R * R, '은', '는')} 반지름 × 반지름이에요. 같은 수를 두 번 곱해 ${jn(R * R, '이', '가')} 되는 수를 찾아요.`,
            [TAGS.dForR]: `${jn(R * 2, '은', '는')} 지름이에요. 넓이 식에 들어가는 것은 반지름.`,
          },
          probe: { A, ask: 'r' },
        };
      })()]));
      return calcAsk(r, c, this, runFamily(r, c, fams));
    },
    misread(r, c) {
      if (branchOf(r, c, ['diam', 'scale']) === 'diam') {
        const d = 2 * int(r, 3, 15); const R = d / 2;
        return misAsk(r, c, this, 'diam', {
          q: `지름이 ${d} cm인 원이 있어요. ${PI_NOTE}\n\n[circle d=${d}]\n\n${showWork(`이 원의 넓이는 ${d} × ${d} × 3.14 = ${fmt(area(d))} cm²예요`)}`,
          ok: `반지름부터 — ${d} ÷ 2 = ${R}, ${R} × ${R} × 3.14 = ${fmt(area(R))} cm²`,
          wr: [
            { text: '맞게 말했어요', tag: RIGHT_AS_WRONG },
            { text: `${d} × 3.14 = ${fmt(circ(d))} cm²예요`, tag: TAGS.circForArea },
            { text: '지름으로는 넓이를 구할 수 없어요', tag: OFF },
          ],
          steps: [`반지름 = ${d} ÷ 2 = ${R} cm`, `${R} × ${R} × 3.14 = ${fmt(area(R))} cm²`],
          whyAny: '지름을 반지름처럼 썼어요. 넓이 식에는 반지름이 들어가요 — 지름을 쓰면 4배가 돼요.',
          probe: { d, ask: 'area', shown: area(d) },
        });
      }
      const r1 = int(r, 2, 6); const k = int(r, 2, 4); const r2 = r1 * k;
      return misAsk(r, c, this, 'scale', {
        q: `반지름이 ${r1} cm인 원과 반지름이 ${r2} cm인 원이 있어요.\n\n${showWork(`반지름이 ${k}배니까 큰 원의 넓이도 작은 원의 ${k}배예요`)}`,
        ok: `넓이는 반지름을 두 번 곱해요 — ${k} × ${k} = ${k * k}배`,
        wr: [
          { text: '맞게 말했어요', tag: RIGHT_AS_WRONG },
          { text: `넓이는 ${k} × 3.14 = ${fmt(PI * k)}배예요`, tag: TAGS.piTimes },
          { text: '반지름이 다르면 넓이를 비교할 수 없어요', tag: OFF },
        ],
        steps: [`작은 원 ${r1} × ${r1} = ${r1 * r1}, 큰 원 ${r2} × ${r2} = ${r2 * r2} (둘 다 × 3.14)`, `${r2 * r2} ÷ ${r1 * r1} = ${k * k} → ${k * k}배`],
        whyAny: `넓이는 반지름 × 반지름이라서 반지름이 ${k}배면 넓이는 ${k} × ${k}배예요.`,
        probe: { r: [r1, r2], ask: 'scale', shown: k },
      });
    },
  },

  {
    id: 'cir.apply', grade: 6, name: '⭐ 여러 가지 모양의 넓이와 둘레', needs: ['cir.area'],
    idea: '**반원**은 원의 넓이 ÷ 2, 원을 4등분한 조각은 ÷ 4. **고리 모양**은 큰 원에서 작은 원을 빼요. 정사각형 안의 원을 빼면 모서리 넓이. 둘레는 **곡선과 곧은 선을 모두** 더해요 — 반원의 둘레 = 원주의 반 + 지름.',
    rule: '넓이는 나누거나 빼서, 둘레는 곡선과 곧은 선을 모두 더해서.',
    slip: '색칠한 부분이 원의 몇 분의 몇인지, 곧은 선도 둘레에 드는지 봐요.',
    calc(r, c) {
      const fams = [];
      // 반원의 넓이
      fams.push(famOf([
        (() => {
          const d = 2 * int(r, 3, 15); const R = d / 2;
          return {
            t: `지름이 ${d} cm인 반원 모양 부채가 있어요. ${PI_NOTE}\n\n[circle half d=${d}]\n\n부채의 넓이는 몇 cm²일까요?`,
            ans: fmt(area(R) / 2), wr: [{ text: fmt(area(R)), tag: TAGS.noDivide }, { text: fmt(area(d) / 2), tag: TAGS.dAsR }],
            steps: [`반지름 = ${d} ÷ 2 = ${R}`, `원의 넓이 ${R} × ${R} × 3.14 = ${fmt(area(R))}, 반원은 ${fmt(area(R))} ÷ 2 = ${fmt(area(R) / 2)}`],
            why: { [TAGS.noDivide]: '반원은 원의 반이에요 — ÷ 2를 해요.', [TAGS.dAsR]: `${d} cm는 지름이에요. 반지름 ${R} cm로 구해요.` },
            probe: { half: R, ask: 'area' },
          };
        })(),
        (() => {
          const R = int(r, 3, 15);
          return {
            t: `{mon/이/가} 반지름이 ${R} m인 반원 모양 텃밭을 가꿔요. ${PI_NOTE}\n\n[circle half r=${R} m]\n\n텃밭의 넓이는 몇 m²일까요?`,
            ans: fmt(area(R) / 2), wr: [{ text: fmt(area(R)), tag: TAGS.noDivide }, { text: fmt((R * PI) / 2), tag: TAGS.rOnce }],
            steps: [`원의 넓이 = ${R} × ${R} × 3.14 = ${fmt(area(R))}`, `반원 = ${fmt(area(R))} ÷ 2 = ${fmt(area(R) / 2)}`],
            why: { [TAGS.noDivide]: '반원은 원의 반이에요 — ÷ 2를 해요.', [TAGS.rOnce]: '반지름을 두 번 곱해야 넓이예요.' },
            probe: { half: R, ask: 'area' },
          };
        })(),
      ]));
      // 원을 4등분한 조각의 넓이
      fams.push(famOf([(() => {
        const R = 2 * int(r, 2, 10);
        return {
          t: `반지름이 ${R} cm인 원을 4등분한 조각이 있어요. ${PI_NOTE}\n\n[circle quarter r=${R}]\n\n이 조각의 넓이는 몇 cm²일까요?`,
          ans: fmt(area(R) / 4), wr: [{ text: fmt(area(R) / 2), tag: TAGS.halfForQuarter }, { text: fmt(area(R)), tag: TAGS.noDivide }],
          steps: [`원의 넓이 = ${R} × ${R} × 3.14 = ${fmt(area(R))}`, `4등분한 조각 = ${fmt(area(R))} ÷ 4 = ${fmt(area(R) / 4)}`],
          why: { [TAGS.halfForQuarter]: '원을 4등분한 조각이라 ÷ 4예요. ÷ 2는 반원.', [TAGS.noDivide]: '조각은 원의 4분의 1이에요 — ÷ 4를 해요.' },
          probe: { quarter: R, ask: 'area' },
        };
      })()]));
      // 고리 모양
      fams.push(famOf([
        (() => { const [R, s] = ringPick(r); return ringOf(R, s, `큰 원과 작은 원의 중심이 같아요. 큰 원의 반지름은 ${R} cm, 작은 원의 반지름은 ${s} cm예요. ${PI_NOTE}\n\n[circle ring R=${R} r=${s}]\n\n색칠한 고리 모양의 넓이는 몇 cm²일까요?`); })(),
        (() => { const [R, s] = ringPick(r); return ringOf(R, s, `{mon/이/가} 도넛을 만들었어요. 도넛의 바깥 반지름은 ${R} cm, 구멍의 반지름은 ${s} cm예요. ${PI_NOTE}\n\n[circle ring R=${R} r=${s}]\n\n도넛 윗면의 넓이는 몇 cm²일까요?`); })(),
      ]));
      // 정사각형에서 원을 뺀 부분
      fams.push(famOf([(() => {
        const d = 2 * int(r, 3, 10); const R = d / 2; const ans = H(d * d) - area(R);
        return {
          t: `한 변이 ${d} cm인 정사각형 안에 꼭 맞는 원을 그렸어요. ${PI_NOTE}\n\n[circle sq d=${d}]\n\n색칠한 부분의 넓이는 몇 cm²일까요?`,
          ans: fmt(ans), wr: [{ text: fmt(area(R)), tag: TAGS.circleOnly }, { text: fmt(H(d * d) - circ(d)), tag: TAGS.subCirc }],
          steps: [`정사각형 ${d} × ${d} = ${d * d}`, `원의 반지름 ${d} ÷ 2 = ${R} → 원 ${R} × ${R} × 3.14 = ${fmt(area(R))}`, `${d * d} − ${fmt(area(R))} = ${fmt(ans)}`],
          why: {
            [TAGS.circleOnly]: '색칠한 부분은 원 바깥의 모서리예요. 정사각형에서 원을 빼요.',
            [TAGS.subCirc]: `${d} × 3.14는 원주(길이)예요. 넓이에서는 원의 넓이를 빼요.`,
          },
          probe: { sq: d, ask: 'area' },
        };
      })()]));
      // 반원의 둘레
      fams.push(famOf([(() => {
        const d = 2 * int(r, 2, 15); const arc = (d * PI) / 2;
        return {
          t: `지름이 ${d} cm인 반원이 있어요. ${PI_NOTE}\n\n[circle half d=${d}]\n\n반원의 둘레는 몇 cm일까요?`,
          ans: fmt(arc + H(d)), wr: [{ text: fmt(arc), tag: TAGS.noDiam }, { text: fmt(circ(d) + H(d)), tag: TAGS.arcFull }],
          steps: [`곡선 = 원주의 반 = ${d} × 3.14 ÷ 2 = ${fmt(arc)}`, `곧은 선 = 지름 ${d}`, `${fmt(arc)} + ${d} = ${fmt(arc + H(d))}`],
          why: { [TAGS.noDiam]: '반원의 둘레에는 아래쪽 곧은 선(지름)도 들어가요.', [TAGS.arcFull]: '곡선은 원주의 반이에요 — 원주 전체가 아니에요.' },
          probe: { half: d / 2, ask: 'perim' },
        };
      })()]));
      // 원을 4등분한 조각의 둘레
      fams.push(famOf([(() => {
        const R = int(r, 2, 20); const arc = (circ(2 * R)) / 4;
        return {
          t: `반지름이 ${R} cm인 원을 4등분한 조각이 있어요. ${PI_NOTE}\n\n[circle quarter r=${R}]\n\n이 조각의 둘레는 몇 cm일까요?`,
          ans: fmt(arc + H(2 * R)), wr: [{ text: fmt(arc), tag: TAGS.noRadii }, { text: fmt(arc + H(R)), tag: TAGS.oneRadius }],
          steps: [`곡선 = 원주의 4분의 1 = ${R} × 2 × 3.14 ÷ 4 = ${fmt(arc)}`, `곧은 선 = 반지름 두 개 = ${R} × 2 = ${2 * R}`, `${fmt(arc)} + ${2 * R} = ${fmt(arc + H(2 * R))}`],
          why: { [TAGS.noRadii]: '조각의 둘레에는 곧은 선 두 개(반지름)도 들어가요.', [TAGS.oneRadius]: '곧은 선은 두 개예요 — 반지름 두 개를 모두 더해요.' },
          probe: { quarter: R, ask: 'perim' },
        };
      })()]));
      return calcAsk(r, c, this, runFamily(r, c, fams));
    },
    misread(r, c) {
      if (branchOf(r, c, ['ring', 'halfperim']) === 'ring') {
        const [R, s] = ringPick(r);
        const ok = area(R) - area(s);
        return misAsk(r, c, this, 'ring', {
          q: `큰 원의 반지름은 ${R} cm, 작은 원의 반지름은 ${s} cm예요. ${PI_NOTE}\n\n[circle ring R=${R} r=${s}]\n\n${showWork(`반지름의 차 ${R} − ${s} = ${ro(R - s)} 원을 하나 구하면 ${R - s} × ${R - s} × 3.14 = ${fmt(area(R - s))} cm²예요`)}`,
          ok: `큰 원에서 작은 원을 빼요 — ${R} × ${R} × 3.14 − ${s} × ${s} × 3.14 = ${fmt(ok)} cm²`,
          wr: [
            { text: '맞게 말했어요', tag: RIGHT_AS_WRONG },
            { text: `두 원을 더해서 ${R} × ${R} × 3.14 + ${s} × ${s} × 3.14 = ${fmt(area(R) + area(s))} cm²예요`, tag: TAGS.ringAdd },
            { text: '고리 모양은 넓이를 구할 수 없어요', tag: OFF },
          ],
          steps: [`큰 원 ${R} × ${R} × 3.14 = ${fmt(area(R))}, 작은 원 ${s} × ${s} × 3.14 = ${fmt(area(s))}`, `${fmt(area(R))} − ${fmt(area(s))} = ${fmt(ok)} cm²`],
          whyAny: '고리의 폭으로 원을 하나 만들면 고리보다 훨씬 작아요. 고리는 큰 원에서 작은 원을 뺀 모양이에요.',
          probe: { ring: [R, s], ask: 'area', shown: area(R - s) },
        });
      }
      const d = 2 * int(r, 2, 15); const arc = (d * PI) / 2;
      return misAsk(r, c, this, 'halfperim', {
        q: `지름이 ${d} cm인 반원이 있어요. ${PI_NOTE}\n\n[circle half d=${d}]\n\n${showWork(`반원의 둘레는 ${d} × 3.14 ÷ 2 = ${fmt(arc)} cm예요`)}`,
        ok: `곡선에 지름까지 더해요 — ${fmt(arc)} + ${d} = ${fmt(arc + H(d))} cm`,
        wr: [
          { text: '맞게 말했어요', tag: RIGHT_AS_WRONG },
          { text: `${d} × 3.14 + ${d} = ${fmt(circ(d) + H(d))} cm예요`, tag: TAGS.arcFull },
          { text: '반원은 곡선이라 둘레를 잴 수 없어요', tag: OFF },
        ],
        steps: [`곡선 = ${d} × 3.14 ÷ 2 = ${fmt(arc)}`, `곧은 선(지름) ${jn(d, '을', '를')} 더해 ${fmt(arc)} + ${d} = ${fmt(arc + H(d))} cm`],
        whyAny: '곡선만 셌어요. 반원을 한 바퀴 돌면 아래쪽 곧은 선(지름)도 지나요.',
        probe: { half: d / 2, ask: 'perim', shown: arc },
      });
    },
  },
];

// ── 가족 재료 (칸 여러 곳에서 같은 틀 모양을 쓴다) ──

function rToD(R, t) {
  return {
    t, ans: String(2 * R),
    wr: [{ text: fmt(H(R / 2)), tag: TAGS.rForD }, { text: String(R + 2), tag: TAGS.addTwo }],
    steps: ['지름은 반지름의 2배', `${R} × 2 = ${2 * R}`],
    why: {
      [TAGS.rForD]: `${R} ÷ 2는 반지름의 반이에요. 지름은 반지름보다 길어요 — 반지름의 2배.`,
      [TAGS.addTwo]: `2배는 2를 더하는 게 아니라 2를 곱하는 거예요 — ${R} × 2 = ${2 * R}.`,
    },
    probe: { r: R, ask: 'd' },
  };
}
function dToR(D, t) {
  return {
    t, ans: String(D / 2),
    wr: [{ text: String(D * 2), tag: TAGS.rForD }, { text: String(D - 2), tag: TAGS.subTwo }],
    steps: ['반지름은 지름의 반', `${D} ÷ 2 = ${D / 2}`],
    why: {
      [TAGS.rForD]: `${D} × 2는 지름보다 더 길어요. 반지름은 지름의 반 — ÷ 2.`,
      [TAGS.subTwo]: `반은 2를 빼는 게 아니라 2로 나누는 거예요 — ${D} ÷ 2 = ${D / 2}.`,
    },
    probe: { d: D, ask: 'r' },
  };
}
/** 원 n개 — 반지름 × n(반지름을 폭으로)과 지름 + n(더함)이 같은 값이면(3·3, 2·4) 두 오답이 하나로 합쳐져 다시 뽑는다 */
function rowPick(r) {
  for (let k = 0; k < 20; k++) { const R = int(r, 2, 9); const n = int(r, 2, 5); if (2 * R + n !== R * n) return [R, n]; }
  return [4, 3];
}
function rowOf(R, n, t) {
  return {
    t, ans: String(2 * R * n),
    wr: [{ text: String(R * n), tag: TAGS.radiusWidth }, { text: String(2 * R + n), tag: TAGS.addForMul }],
    steps: [`원 하나의 폭 = 지름 = ${R} × 2 = ${2 * R}`, `${n}개를 맞닿게 놓으면 ${2 * R} × ${n} = ${2 * R * n}`],
    why: {
      [TAGS.radiusWidth]: `원 하나가 차지하는 길이는 반지름이 아니라 지름(${2 * R} cm)이에요.`,
      [TAGS.addForMul]: `지름 ${2 * R} cm가 ${n}개 — 더하지 않고 곱해요.`,
    },
    probe: { r: R, n, ask: 'row' },
  };
}
function ratioOf(d, t) {
  const C = circ(d);
  return {
    t, ans: '3.14',
    wr: [{ text: fmt(PI * 2), tag: TAGS.byRadius }, { text: fmt(C - H(d)), tag: TAGS.subForDiv }],
    steps: [`원주 ÷ 지름 = ${fmt(C)} ÷ ${d}`, `${fmt(C)} ÷ ${d} = 3.14 — 원주는 지름의 약 3.14배`],
    why: {
      [TAGS.byRadius]: `6.28은 반지름(${fmt(H(d / 2))} cm)으로 나눈 값이에요. 원주율은 원주를 지름으로 나눠요.`,
      [TAGS.subForDiv]: '빼면 원주가 지름보다 얼마나 긴지가 나와요. 몇 배인지는 나눠서 구해요.',
    },
    probe: { d, ask: 'ratio' },
  };
}
function dToC(d, u, t) {
  const C = circ(d);
  return {
    t, ans: fmt(C),
    wr: [{ text: fmt(C * 2), tag: TAGS.extraDouble }, { text: fmt(C / 2), tag: TAGS.halfD }, { text: fmt(H(d) + PI), tag: TAGS.addPi }],
    steps: ['원주 = 지름 × 원주율', `${d} × 3.14 = ${fmt(C)}`],
    why: {
      [TAGS.extraDouble]: `${d} ${u}는 이미 지름이에요. × 2는 반지름일 때만 해요.`,
      [TAGS.halfD]: `지름을 반으로 나누면 반지름이에요. 지름에 바로 3.14를 곱해요.`,
      [TAGS.addPi]: `원주율은 더하는 게 아니라 곱해요 — ${d} × 3.14.`,
    },
    probe: { d, ask: 'C' },
  };
}
function rToC(R, t) {
  const C = circ(2 * R);
  return {
    t, ans: fmt(C),
    wr: [{ text: fmt(R * PI), tag: TAGS.noDouble }, { text: fmt(area(R)), tag: TAGS.rTwice }],
    steps: [`지름 = ${R} × 2 = ${2 * R}`, `원주 = ${2 * R} × 3.14 = ${fmt(C)}`],
    why: {
      [TAGS.noDouble]: '원주율은 원주 ÷ 지름이라서 지름에 곱해요. 반지름은 먼저 × 2.',
      [TAGS.rTwice]: `반지름을 두 번 곱하면 원주가 아니에요. 원주는 ${R} × 2 × 3.14.`,
    },
    probe: { r: R, ask: 'C' },
  };
}
function cToDiam(d, t) {
  const C = circ(d);
  return {
    t, ans: String(d),
    wr: [{ text: timesPi(C), tag: TAGS.invMul }, { text: fmt(H(d / 2)), tag: TAGS.rForDinv }, { text: fmt(C - PI), tag: TAGS.subInv }],
    steps: ['지름 = 원주 ÷ 원주율', `${fmt(C)} ÷ 3.14 = ${d}`],
    why: {
      [TAGS.invMul]: '원주를 알 때 지름은 곱하지 않고 나눠서 구해요 — 원주 ÷ 원주율.',
      [TAGS.rForDinv]: `${fmt(C)} ÷ 3.14가 바로 지름이에요. 한 번 더 ÷ 2를 하면 반지름.`,
      [TAGS.subInv]: '3.14를 빼지 않고 3.14로 나눠요.',
    },
    probe: { C, ask: 'd' },
  };
}
function wheelOf(d, n, t) {
  const C = circ(d);
  return {
    t, ans: fmt(C * n),
    wr: [{ text: fmt(C), tag: TAGS.turnsMiss }, { text: fmt((C / 2) * n), tag: TAGS.halfD }, { text: String(d * n), tag: TAGS.piMiss }],
    steps: [`한 바퀴 = 원주 = ${d} × 3.14 = ${fmt(C)}`, `${n}바퀴 = ${fmt(C)} × ${n} = ${fmt(C * n)}`],
    why: {
      [TAGS.turnsMiss]: `${fmt(C)} cm는 한 바퀴 거리예요. ${n}바퀴면 × ${n}.`,
      [TAGS.halfD]: '지름에 바로 3.14를 곱해요 — 반으로 나누면 반지름이에요.',
      [TAGS.piMiss]: '한 바퀴는 지름이 아니라 원주(지름 × 3.14)만큼 가요.',
    },
    probe: { d, n, ask: 'wheel' },
  };
}
function areaOfR(R, u, t) {
  return {
    t, ans: fmt(area(R)),
    wr: [{ text: fmt(area(2 * R)), tag: TAGS.dSquared }, { text: fmt(circ(2 * R)), tag: TAGS.circForArea }, { text: fmt(R * PI), tag: TAGS.rOnce }],
    steps: ['원의 넓이 = 반지름 × 반지름 × 원주율', `${R} × ${R} × 3.14 = ${fmt(area(R))}`],
    why: {
      [TAGS.dSquared]: `${2 * R} ${u}는 지름이에요. 넓이에는 반지름 ${R} ${u}를 두 번 곱해요.`,
      [TAGS.circForArea]: `${R} × 2 × 3.14는 원주(둘레)예요. 넓이는 반지름 × 반지름 × 원주율.`,
      [TAGS.rOnce]: '반지름을 한 번만 곱했어요. 반지름 × 반지름 × 원주율.',
    },
    probe: { r: R, ask: 'area' },
  };
}
function areaOfD(d, u, t) {
  const R = d / 2;
  return {
    t, ans: fmt(area(R)),
    wr: [{ text: fmt(area(d)), tag: TAGS.dAsR }, { text: fmt(circ(d)), tag: TAGS.circForArea }, { text: fmt(R * PI), tag: TAGS.rOnce }],
    steps: [`반지름 = ${d} ÷ 2 = ${R}`, `${R} × ${R} × 3.14 = ${fmt(area(R))}`],
    why: {
      [TAGS.dAsR]: `${d} ${u}는 지름이에요. 넓이 식에는 반지름 ${R} ${u}를 넣어요.`,
      [TAGS.circForArea]: `${d} × 3.14는 원주(둘레)예요. 넓이는 반지름 × 반지름 × 원주율.`,
      [TAGS.rOnce]: '반지름을 한 번만 곱했어요. 반지름 × 반지름 × 원주율.',
    },
    probe: { d, ask: 'area' },
  };
}
function scaleOf(r1, k, t) {
  const r2 = r1 * k;
  return {
    t, ans: String(k * k),
    // × 2 오답은 반지름 2배일 때 2 × 2 = 4로 정답과 같아져 보기에서 빠진다 (그때도 이름표 붙은 오답은 둘)
    wr: [{ text: String(k), tag: TAGS.scaleSame }, { text: String(k * 2), tag: TAGS.squareAsDouble }, { text: fmt(PI * k * k), tag: TAGS.piTimes }],
    steps: [`작은 원 ${r1} × ${r1} = ${r1 * r1}, 큰 원 ${r2} × ${r2} = ${r2 * r2} (둘 다 × 3.14)`, `${r2 * r2} ÷ ${r1 * r1} = ${k * k} → ${k * k}배`],
    why: {
      [TAGS.scaleSame]: `넓이는 반지름을 두 번 곱해요. 반지름이 ${k}배면 넓이는 ${k} × ${k} = ${k * k}배.`,
      [TAGS.squareAsDouble]: `두 번 곱한다는 건 × 2가 아니라 ${k} × ${jn(k, '이에요', '예요')} — ${k * k}배.`,
      [TAGS.piTimes]: '두 원 모두 × 3.14를 해서, 몇 배인지 견줄 때는 3.14가 사라져요.',
    },
    probe: { r: [r1, r2], ask: 'scale' },
  };
}
/** 고리 — 큰 원 R, 작은 원 s (그림에서 작은 원이 보이게 s ≥ R / 4, 폭 2 이상) */
function ringPick(r) {
  const R = int(r, 5, 15);
  const s = int(r, Math.ceil(R / 4), R - 2);
  return [R, s];
}
function ringOf(R, s, t) {
  const ans = area(R) - area(s);
  return {
    t, ans: fmt(ans),
    wr: [{ text: fmt(area(R - s)), tag: TAGS.ringDiff }, { text: fmt(area(R) + area(s)), tag: TAGS.ringAdd }, { text: fmt(area(R)), tag: TAGS.bigOnly }],
    steps: [`큰 원 ${R} × ${R} × 3.14 = ${fmt(area(R))}`, `작은 원 ${s} × ${s} × 3.14 = ${fmt(area(s))}`, `${fmt(area(R))} − ${fmt(area(s))} = ${fmt(ans)}`],
    why: {
      [TAGS.ringDiff]: `고리의 폭(${R - s} cm)으로 원을 하나 만들면 고리보다 훨씬 작아요. 큰 원 − 작은 원.`,
      [TAGS.ringAdd]: '가운데 구멍은 빼야 해요 — 더하지 않고 빼요.',
      [TAGS.bigOnly]: '가운데 작은 원은 비어 있어요. 큰 원에서 빼요.',
    },
    probe: { ring: [R, s], ask: 'area' },
  };
}

export function conceptById(id) {
  return CIRCLE.find((c) => c.id === id) || null;
}

// ───────────────────── 문항 만들기 (mathrange·mathsym과 같은 모양) ─────────────────────

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
const SLIP = '한 번 더 천천히 — 반지름인지 지름인지, 둘레인지 넓이인지 먼저 봐요.';

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
  return diagnosticOf(CIRCLE, makeQuestion, seed, n, opts);
}
export function placeFrom(answers) {
  return placeFromOf(CIRCLE, answers);
}
export function ladder(doneIds) {
  return ladderOf(CIRCLE, doneIds);
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
 * coach/math/circle.json 형식 검사 — mathrange.checkContent와 같은 규칙
 * @returns {string[]}
 */
export function checkContent(content) {
  const bad = [];
  for (const c of CIRCLE) {
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
      for (const f of badFigures(ck.q)) bad.push(`${c.id}[${i}]: 확인 질문의 못 그리는 그림 ${f}`);
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

export const _kit = { fmt, H, circ, area, PI, famOf, runFamily, calcAsk, choices, textChoices, branchOf, showWork, step, jn, ro, RIGHT_AS_WRONG, OFF };
