// 📈 수학 — R 좌표평면과 그래프 줄기 (중1 「좌표평면과 그래프」): 개념 사다리 + 문제 생성기 + 내용 형식 검사. 순수 함수만 — 화면 없음 (node 테스트에서 그대로 돈다).
//
// 왜 이 줄기인가 (2026-10-05, 아버님 "니가 추천하는 순서대로 가보자" → 설계안 "이대로 진행하자"): Q 일차방정식 다음 칸.
// E 음수가 좌표의 부호로, H 규칙과 대응의 식이 정비례·반비례로 다시 나온다. 중1 「변화와 관계」의 마지막 단원.
// 범위: 2022 성취기준 [9수02-05] 순서쌍과 좌표를 이해하고, 그 편리함을 인식할 수 있다 · [9수02-06] 다양한 상황을 그래프로
//   나타내고, 주어진 그래프를 해석할 수 있다 · [9수02-07] 정비례, 반비례 관계를 이해하고, 그 관계를 표, 식, 그래프로 나타낼 수 있다
//   (용어: 변수·좌표·순서쌍·x좌표·y좌표·원점·좌표축·x축·y축·좌표평면·제1~4사분면·그래프·정비례·반비례)
//
// 오답은 아이가 실제로 하는 틀린 생각 흉내다:
//   · x좌표와 y좌표를 바꿔 읽음 · 부호를 반대로 읽음 · 원점이 아닌 끝에서 셈 · 0이 있으면 원점으로 봄
//   · 사분면 번호를 시계 방향으로 셈 · 좌표축 위의 점을 사분면에 넣음(0을 양수·음수로 봄) · 바꾼 점도 같은 사분면
//   · 그래프의 평평한 구간을 "움직였다"로 · 그래프 모양을 실제 길 모양으로 · 눈금 한 칸을 1로 셈 · 가장 높은 곳까지를 한 바퀴로
//   · "x가 커질 때 y도 커지면 정비례"(y = x + 3) · "x가 커질 때 y가 작아지면 반비례"(y = 10 − x) · a가 음수면 정비례가 아님
//   · y ÷ x를 거꾸로 · a의 부호를 빠뜨림 · 정비례로 계산함(반비례인데) · 반비례 그래프가 원점·좌표축을 지난다고 봄
//
// 새 줄기의 함정(메모 stem-generator-pitfalls)을 처음부터:
//   · 가족 = 틀 여러 개, 틀마다 수를 미리 뽑아 둔다 — 🔁 쌍둥이가 요청한 틀(tplKey)로 온다
//   · ★ tplKey는 숫자만 지운다 → 틀마다 좌표의 부호(사분면)·점 이름·식 모양(정수 a/분수 a)을 고정한다. 그림 지시문도 글이라 같다
//   · ★ 좌표 "(2, −3)" 바로 뒤에는 조사를 붙이지 않는다 — 읽는 소리가 끝자리 수를 따르는데 jfix는 ")" 뒤를 못 고친다 ("…인 점", "…일 때", ":")
//   · ★ 식 바로 뒤·분수 바로 뒤 조사도 붙이지 않는다 (D·Q와 같다). g·L·m 같은 단위 글자 뒤 조사도 안 붙인다(jfix가 받침 없는 쪽으로 바꾼다)
//   · 좌표·식·문장 답은 보기 고르기, 수 답(a·y 값·넓이·시간)은 숫자판 · 점 고르기는 ✍️ 점 찍기 판(3단계 — 문항의 draw)
//   · 틀린 방법이 우연히 맞는 값·오답끼리 같은 값은 뽑지 않는다 (probe.allWrong)
//   · 아직 안 배운 말: 사분면(R3) → 변수(R4) → 정비례(R5) → 반비례(R7)
// ★ 정답·오답은 테스트가 **문제 글과 그림 지시문을 따로 읽어** 다시 푼다 (tests/mathcoord.test.js).

import { rng, castOf, fill, int, pick, humanQuestion, checkHuman, diagnosticOf, placeFromOf, ladderOf } from './mathgen.js';
import { gradeLabel } from './mathmix.js';
import { _kit, valueOf } from './mathexpr.js';

export { gradeLabel };

const { famOf, runFamily, calcAsk, misAsk, showWork, branchOf, num, jfix, RIGHT_AS_WRONG, OFF } = _kit;
/** 가족에서 틀 하나를 골라 ① 문항으로 — 점 고르기 틀의 draw(✍️ 점 찍기 판)도 넘긴다 (공용 calcAsk는 draw를 모른다) */
function askFam(r, c, concept, fams) {
  const v0 = runFamily(r, c, fams);
  // 문장 보기("x = 1일 때 y = 3예요")의 조사도 수에 맞게 — 공용 calcAsk는 문제 글·풀이만 고친다
  const v = v0.text ? { ...v0, ans: jfix(v0.ans), wr: v0.wr.map((w) => ({ ...w, text: jfix(w.text) })) } : v0;
  const q = calcAsk(r, c, concept, v);
  return v.draw ? { ...q, draw: v.draw } : q;
}

/** 조건에 맞을 때까지 다시 뽑기 */
function draw(gen, ok) {
  for (let k = 0; k < 4000; k++) { const v = gen(); if (ok(v)) return v; }
  throw new Error('draw: 조건에 맞는 수를 못 뽑음');
}
const allDiff = (...vals) => new Set(vals.map((v) => String(v))).size === vals.length;
const gcd = (a, b) => (b ? gcd(b, a % b) : Math.abs(a));
/** 분수 n/d → 기약분수 글자 ("−1/2" · "3") */
function fr(n, d) {
  if (d < 0) { n = -n; d = -d; }
  const g = gcd(Math.abs(n), d) || 1; n /= g; d /= g;
  return d === 1 ? num(n) : `${n < 0 ? '−' : ''}${Math.abs(n)}/${d}`;
}
/** 좌표 글자 "(2, −3)" */
const co = (x, y) => `(${num(x)}, ${num(y)})`;
/** 그림 지시문 속 점 "A(2,−3)" */
const pt = (name, x, y) => `${name}(${num(x)},${num(y)})`;
const PL = (...tokens) => `[plane ${tokens.filter(Boolean).join(' ')}]`;
const BOX5 = 'x=−5..5 y=−5..5';
const BOX6 = 'x=−6..6 y=−6..6';
/** y = (n/d)x 의 오른쪽 — "2x" · "−x" · "x/2" · "−x/3" */
function linF(n, d = 1) {
  if (d < 0) { n = -n; d = -d; }
  const g = gcd(Math.abs(n), d) || 1; n /= g; d /= g;
  const s = n < 0 ? '−' : ''; const k = Math.abs(n);
  if (d === 1) return k === 1 ? `${s}x` : `${s}${k}x`;
  return k === 1 ? `${s}x/${d}` : `${s}${k}x/${d}`;
}
const linEq = (n, d = 1) => `y = ${linF(n, d)}`;
const invEq = (a) => `y = ${num(a)}/x`;
/** 사분면 번호 (축 위는 0) */
const quadOf = (x, y) => (!x || !y ? 0 : x > 0 ? (y > 0 ? 1 : 4) : (y > 0 ? 2 : 3));
const QNAME = (q) => (q ? `제${q}사분면` : '어느 사분면에도 속하지 않아요');
/** 시계 방향으로 센 번호 — 제2와 제4가 바뀐다 */
const CLOCK = { 1: 1, 2: 4, 3: 3, 4: 2 };

/** 이 줄기의 오개념 이름표 (📊·🤔 노트·결과 카드에 그대로 뜬다 — 아직 안 배운 말을 쓰지 않는다) */
export const TAGS = {
  // R1 순서쌍과 좌표
  signFlip: '부호를 반대로 읽음',
  fromEdge: '원점이 아닌 왼쪽 끝에서 셈',
  swapXY: 'x좌표와 y좌표를 바꿈',
  signX: 'x좌표의 부호를 반대로 봄',
  signY: 'y좌표의 부호를 반대로 봄',
  coordOther: '다른 좌표를 답함',
  wrongReason: '틀린 까닭을 잘못 앎',
  // R2 점 나타내기
  sameBoth: '두 좌표를 같은 수로 씀',
  zeroOrigin: '0이 하나라도 있으면 원점으로 봄',
  noHalf: '÷ 2를 빠뜨림',
  distSign: '음수 좌표까지의 거리를 빼서 셈',
  // R3 사분면
  quadOrder: '사분면 번호를 시계 방향으로 셈',
  dropSign: '부호를 보지 않음',
  zeroPos: '0을 양수로 봄',
  zeroNeg: '0을 음수로 봄',
  sameQuad: '바꾼 점도 처음 점과 같은 곳으로 봄',
  signWrong: '부호를 잘못 따짐',
  // R4 그래프와 그 해석
  cellCount: '눈금 한 칸을 1로 셈',
  xForY: '가로축의 값을 답함',
  yForX: '세로축의 값을 답함',
  endAsLen: '끝난 때를 걸린 시간으로 봄',
  flatAsMove: '평평한 구간을 변했다고 봄',
  upAsDown: '오른쪽 위로 향하는 것을 줄어듦으로 봄',
  downAsUp: '오른쪽 아래로 향하는 것을 늘어남으로 봄',
  moveAsFlat: '변한 구간을 그대로라고 봄',
  halfPeriod: '가장 높은 곳까지만 셈',
  // R5 정비례 관계
  stepAsAdd: '늘어나는 수를 더하는 식으로 봄',
  flipRatio: 'y ÷ x를 거꾸로 셈',
  diffSame: '차가 늘 같다고 봄',
  signDrop: '음수의 부호를 빠뜨림',
  growAsProp: 'x와 y가 함께 커지면 정비례로 봄',
  constAdd: '수를 더한 식도 정비례로 봄',
  sumAsProp: '합이 일정한 관계를 정비례로 봄',
  negNotProp: 'a가 음수이면 정비례가 아니라고 봄',
  // R6 정비례 관계의 그래프
  aSign: 'a의 부호를 반대로 봄',
  mulSign: '곱의 부호를 잘못 정함',
  divForMul: '곱해야 할 것을 나눔',
  addForMul: '곱해야 할 것을 더함',
  notOrigin: '정비례 그래프가 원점을 지나지 않는다고 봄',
  dirWrong: '직선의 방향을 거꾸로 앎',
  signBig: '부호까지 넣어 가장 큰 수를 고름',
  smallClose: 'a가 작을수록 y축에 가깝다고 봄',
  // R7 반비례 관계
  flipInv: '나누는 순서를 바꿈',
  shrinkAsSub: '작아지는 관계를 빼기로 봄',
  propInstead: '정비례처럼 계산함',
  sumSame: '합이 늘 같다고 봄',
  shrinkAsInv: 'x가 커질 때 y가 작아지면 반비례로 봄',
  fracAsInv: '분수 꼴이면 반비례로 봄',
  negAsInv: '음수를 곱한 식을 반비례로 봄',
  stepAsInv: '줄어드는 수가 같으면 반비례로 봄',
  // R8 반비례 관계의 그래프
  mulForDiv: '나눠야 할 것을 곱함',
  originInv: '곡선도 원점을 지난다고 봄',
  axisMeet: '곡선이 좌표축과 만난다고 봄',
  oneBranch: '곡선이 한쪽에만 있다고 봄',
  // R9 활용
  subForDiv: '나눠야 할 것을 뺌',
  sameTurns: '두 바퀴가 같은 수만큼 돈다고 봄',
  addDiff: '늘어난 만큼을 그대로 더함',
};

// ───────────────────── 그래프 해석에 쓰는 이야기 (R4) ─────────────────────

/** 자전거 — 가다가 쉬고 다시 감 (가로 5분 칸 · 세로 1 km 칸) */
function bikeOf(r) {
  return draw(() => {
    const t1 = pick(r, [10, 15, 20]); const rest = pick(r, [5, 10, 15]); const d1 = int(r, 2, 5); const D = int(r, d1 + 2, 10);
    return { t1, t2: t1 + rest, rest, d1, D };
  }, (b) => b.t2 <= 35 && allDiff(b.rest, b.t2, b.d1));
}
const bikePlane = (b) => PL('x=0..50 y=0..10 xs=5 xl=시간(분) yl=거리(km)', `path=0:0,${b.t1}:${b.d1},${b.t2}:${b.d1},50:${b.D}`);
const BIKE = '{me/이/가} 자전거를 타고 집에서 출발해 공원까지 갔어요. 그래프는 출발한 지 x분 뒤 집에서 떨어진 거리 y km를 나타내요.';

/** 물통 — 물을 넣다가 멈추고 다시 뺌 (가로 1분 칸 · 세로 5 cm 칸) */
function tankOf(r) {
  return draw(() => {
    const t1 = int(r, 2, 4); const t2 = t1 + int(r, 2, 3); const h1 = 5 * int(r, 4, 8); const h3 = 5 * int(r, 0, 3);
    return { t1, t2, h1, h3 };
  }, (w) => w.t2 <= 8 && w.h3 < w.h1 && allDiff(w.h1, w.h1 / 5, w.t1, w.t2) && w.h1 / 5 !== w.t2);
}
const tankPlane = (w) => PL('x=0..10 y=0..40 ys=5 xl=시간(분) yl=물의_높이(cm)', `path=0:0,${w.t1}:${w.h1},${w.t2}:${w.h1},10:${w.h3}`);
const TANK = '물통에 물을 넣다가 잠시 멈춘 뒤, 다시 물을 뺐어요. 그래프는 x분 뒤 물의 높이 y cm를 나타내요.';

/** 관람차 — 같은 모양이 되풀이 (가로 1분 칸 · 세로 5 m 칸) */
function wheelOf(r) {
  const P = pick(r, [4, 6, 8]); const lo = 5; const hi = pick(r, [20, 25, 30]);
  return { P, lo, hi };
}
const wheelPlane = (w) => PL('x=0..16 y=0..30 ys=5 xl=시간(분) yl=높이(m)', `path=${[0, 1, 2, 3, 4].map((k) => `${(k * w.P) / 2}:${k % 2 ? w.hi : w.lo}`).join(',')}`);
const WHEEL = '관람차에 탄 지 x분 뒤의 높이를 y m라고 할 때, 그래프는 x와 y 사이의 관계를 나타내요.';

// ───────────────────── 개념 사다리 (R. 좌표평면과 그래프 줄기) ─────────────────────

export const COORD = [
  {
    id: 'crd.read', grade: 7, name: '순서쌍과 좌표', needs: [],
    idea: '수직선 위의 점에 대응하는 수를 그 점의 **좌표**라고 해요. 두 수직선을 원점 O에서 수직으로 만나게 그린 것이 **좌표평면** — 가로 수직선이 **x축**, 세로 수직선이 **y축**, 둘을 함께 **좌표축**이라고 해요. 좌표평면 위의 점 P에서 x축·y축으로 수직인 선을 그어 만나는 수가 a, b이면 순서쌍 (a, b)를 점 P의 좌표라 하고 P(a, b)로 나타내요. a는 **x좌표**, b는 **y좌표** — 순서를 정해 짝 지은 쌍이라 (2, 3)과 (3, 2)는 다른 점이에요.',
    rule: '(x좌표, y좌표) — 가로(x축) 먼저, 세로(y축) 나중, 부호까지.',
    slip: 'x좌표(가로)를 먼저 썼는지, 부호를 맞게 읽었는지 봐요.',
    calc(r, c) {
      const fams = [];
      // 수직선 위의 점 — 음수 쪽 · 양수 쪽 (부호가 틀마다 같아야 열쇠가 같다)
      fams.push(famOf([
        (() => { const [L, a] = draw(() => { const L1 = int(r, 5, 7); return [L1, -int(r, 1, L1 - 1)]; }, ([L1, a1]) => a1 + L1 !== -a1); return { t: `수직선 위에 찍은 점의 좌표는 얼마일까요?\n\n[line −${L}..${L} @${num(a)}]`, ans: num(a), wr: [{ text: num(-a), tag: TAGS.signFlip }, { text: num(a + L), tag: TAGS.fromEdge }], steps: ['원점(0)에서 왼쪽은 음수, 오른쪽은 양수', `점은 0에서 왼쪽으로 ${-a}칸 — 좌표는 ${num(a)}`], why: { [TAGS.signFlip]: '원점보다 왼쪽에 있는 점의 좌표는 음수예요.', [TAGS.fromEdge]: '왼쪽 끝이 아니라 원점(0)에서 세요.' }, probe: { ask: 'nline' } }; })(),
        (() => { const L = int(r, 5, 7); const a = int(r, 1, L - 1); return { t: `수직선 위에 찍은 점의 좌표는 얼마일까요?\n\n[line −${L}..${L} @${num(a)}]`, ans: num(a), wr: [{ text: num(-a), tag: TAGS.signFlip }, { text: num(a + L), tag: TAGS.fromEdge }], steps: ['원점(0)에서 왼쪽은 음수, 오른쪽은 양수', `점은 0에서 오른쪽으로 ${a}칸 — 좌표는 ${a}`], why: { [TAGS.signFlip]: '원점보다 오른쪽에 있는 점의 좌표는 양수예요.', [TAGS.fromEdge]: '왼쪽 끝이 아니라 원점(0)에서 세요.' }, probe: { ask: 'nline' } }; })(),
      ]));
      // 좌표평면 위의 점 읽기 — 사분면마다 틀 하나
      const readPt = (sx, sy) => { const [a, b] = draw(() => [sx * int(r, 1, 5), sy * int(r, 1, 5)], ([x, y]) => Math.abs(x) !== Math.abs(y)); return { t: `좌표평면 위의 점 P의 좌표는 어느 것일까요?\n\n${PL(BOX5, pt('P', a, b))}`, text: true, ans: co(a, b), wr: [{ text: co(b, a), tag: TAGS.swapXY }, { text: co(-a, b), tag: TAGS.signX }, { text: co(a, -b), tag: TAGS.signY }], steps: [`점 P에서 x축으로 내린 수 ${num(a)} — x좌표`, `점 P에서 y축으로 그은 수 ${num(b)} — y좌표 → P${co(a, b)}`], why: { [TAGS.swapXY]: 'x좌표(가로)를 먼저, y좌표(세로)를 나중에 써요.', [TAGS.signX]: `점 P는 원점보다 ${a > 0 ? '오른쪽' : '왼쪽'} — x좌표는 ${a > 0 ? '양수' : '음수'}예요.`, [TAGS.signY]: `점 P는 원점보다 ${b > 0 ? '위' : '아래'} — y좌표는 ${b > 0 ? '양수' : '음수'}예요.` }, probe: { ask: 'read' } }; };
      fams.push(famOf([readPt(1, 1), readPt(-1, 1), readPt(-1, -1), readPt(1, -1)]));
      // x좌표 · y좌표 하나만
      const onePt = (sx, sy, which) => { const [a, b] = draw(() => [sx * int(r, 1, 5), sy * int(r, 1, 5)], ([x, y]) => Math.abs(x) !== Math.abs(y)); const [v, o] = which === 'x' ? [a, b] : [b, a]; return { t: `좌표평면 위의 점 A의 ${which}좌표는 얼마일까요?\n\n${PL(BOX5, pt('A', a, b))}`, ans: num(v), wr: [{ text: num(o), tag: TAGS.coordOther }, { text: num(-v), tag: TAGS.signFlip }], steps: [`점 A${co(a, b)} — 앞이 x좌표, 뒤가 y좌표`, `${which}좌표는 ${num(v)}`], why: { [TAGS.coordOther]: `${num(o)}는 ${which === 'x' ? 'y' : 'x'}좌표예요.`, [TAGS.signFlip]: `${which === 'x' ? (a > 0 ? '원점보다 오른쪽 — 양수' : '원점보다 왼쪽 — 음수') : (b > 0 ? '원점보다 위 — 양수' : '원점보다 아래 — 음수')}예요.` }, probe: { ask: 'one', which } }; };
      fams.push(famOf([onePt(-1, 1, 'x'), onePt(1, -1, 'x'), onePt(-1, 1, 'y'), onePt(1, -1, 'y')]));
      return askFam(r, c, this, fams);
    },
    misread(r, c) {
      if (branchOf(r, c, ['swap', 'order']) === 'swap') {
        const [a, b] = draw(() => [int(r, 1, 5), -int(r, 1, 5)], ([x, y]) => Math.abs(x) !== Math.abs(y));
        return misAsk(r, c, this, 'swap', {
          q: `좌표평면 위의 점 P를 보고\n\n${PL(BOX5, pt('P', a, b))}\n\n${showWork(`점 P의 좌표: ${co(b, a)}`)}`,
          ok: `x좌표를 먼저 써요 — 점 P의 좌표: ${co(a, b)}`,
          wr: [{ text: '맞게 말했어요', tag: RIGHT_AS_WRONG }, { text: `부호를 바꿔야 해요 — 점 P의 좌표: ${co(-b, -a)}`, tag: TAGS.signFlip }, { text: '좌표평면 위의 점은 좌표로 나타낼 수 없어요', tag: OFF }],
          steps: [`x축으로 내리면 ${num(a)} — x좌표`, `y축으로 그으면 ${num(b)} — y좌표 → ${co(a, b)}`],
          whyAny: 'x좌표와 y좌표를 바꿔 썼어요. 순서쌍은 (x좌표, y좌표) 순서예요.',
          probe: { ask: 'swap', a, b },
        });
      }
      const [a, b] = draw(() => [int(r, 1, 5), int(r, 1, 5)], ([x, y]) => x !== y);
      return misAsk(r, c, this, 'order', {
        q: `두 점 A${co(a, b)}, B${co(b, a)} — 이 두 점을 보고\n\n${showWork('두 점은 같은 점이에요')}`,
        ok: `순서가 바뀌면 다른 점이에요 — 점 A의 x좌표는 ${a}, 점 B의 x좌표는 ${b}`,
        wr: [{ text: '맞게 말했어요', tag: RIGHT_AS_WRONG }, { text: '두 점은 y좌표가 같고 x좌표만 달라요', tag: TAGS.wrongReason }, { text: '순서쌍은 좌표평면에 나타낼 수 없어요', tag: OFF }],
        steps: [`A${co(a, b)}: 오른쪽으로 ${a}칸, 위로 ${b}칸`, `B${co(b, a)}: 오른쪽으로 ${b}칸, 위로 ${a}칸 — 다른 자리`],
        whyAny: '순서쌍은 순서가 있어요. 앞 수와 뒤 수를 바꾸면 다른 점이에요.',
        probe: { ask: 'order', a, b },
      });
    },
  },

  {
    id: 'crd.plot', grade: 7, name: '좌표평면에 점 나타내기', needs: ['crd.read'],
    idea: '점 (a, b)를 찍을 때는 원점에서 x좌표만큼 가로로(양수는 오른쪽, 음수는 왼쪽), y좌표만큼 세로로(양수는 위, 음수는 아래) 가요. x좌표가 0인 점은 y축 위에, y좌표가 0인 점은 x축 위에 있어요. 원점의 좌표는 (0, 0)이에요. 좌표평면 위의 점을 이어 도형을 그리면, 좌표의 차로 변의 길이를 구할 수 있어요.',
    rule: '원점에서 x좌표만큼 가로로, y좌표만큼 세로로 — 0이면 축 위.',
    slip: '가로 먼저 x좌표만큼, 세로로 y좌표만큼 갔는지, 부호 방향을 봐요.',
    calc(r, c) {
      const fams = [];
      // 점 고르기 (✍️ 점 찍기 판: draw) — 후보 넷: 정답 · x와 y 바꿈 · x 부호 반대 · y 부호 반대.
      // 지시문 속 후보는 사분면·x·y 순으로 늘 같은 자리에 적는다 — 섞어 적으면 부호 모양이 바뀌어 🔁 열쇠가 갈린다 (메모 21번)
      const pickPt = (sx, sy) => {
        const [a, b] = draw(() => [sx * int(r, 1, 5), sy * int(r, 1, 5)], ([x, y]) => Math.abs(x) !== Math.abs(y));
        const raw = [{ x: a, y: b, ok: true }, { x: b, y: a, tag: TAGS.swapXY }, { x: -a, y: b, tag: TAGS.signX }, { x: a, y: -b, tag: TAGS.signY }];
        const qn = (p) => [1, 2, 3, 4].indexOf(quadOf(p.x, p.y));
        const sorted = [...raw].sort((p, q) => qn(p) - qn(q) || p.x - q.x || p.y - q.y);
        const K = ['㉠', '㉡', '㉢', '㉣'];
        sorted.forEach((p, i) => { p.k = K[i]; });
        const okc = sorted.find((p) => p.ok);
        return {
          t: `좌표가 ${co(a, b)}인 점은 어느 것일까요?\n\n${PL(BOX5, ...sorted.map((p) => pt(p.k, p.x, p.y)))}`,
          text: true, ans: okc.k, wr: sorted.filter((p) => !p.ok).map((p) => ({ text: p.k, tag: p.tag })),
          steps: [`원점에서 ${a > 0 ? '오른쪽' : '왼쪽'}으로 ${Math.abs(a)}칸`, `${b > 0 ? '위' : '아래'}로 ${Math.abs(b)}칸 → ${okc.k}`],
          why: { [TAGS.swapXY]: 'x좌표만큼 가로로 먼저, y좌표만큼 세로로 가요.', [TAGS.signX]: `x좌표가 ${a > 0 ? '양수 — 오른쪽' : '음수 — 왼쪽'}으로 가요.`, [TAGS.signY]: `y좌표가 ${b > 0 ? '양수 — 위' : '음수 — 아래'}로 가요.` },
          probe: { ask: 'pick', a, b },
          draw: { fig: `plane ${BOX5}`, mode: 'plane', target: [a, b], cands: sorted.map((p) => ({ k: p.k, x: p.x, y: p.y })) },
        };
      };
      fams.push(famOf([pickPt(1, 1), pickPt(-1, 1), pickPt(-1, -1), pickPt(1, -1)]));
      // 축 위의 점
      const axisPt = (axis, s) => { const v = s * int(r, 1, 9); const ans = axis === 'x' ? co(v, 0) : co(0, v); return { t: `${axis}축 위에 있고 ${axis}좌표가 ${num(v)}인 점의 좌표는 어느 것일까요?`, text: true, ans, wr: [{ text: axis === 'x' ? co(0, v) : co(v, 0), tag: TAGS.swapXY }, { text: co(v, v), tag: TAGS.sameBoth }], steps: [`${axis}축 위의 점은 ${axis === 'x' ? 'y' : 'x'}좌표가 0`, `${axis}좌표 ${num(v)} → ${ans}`], why: { [TAGS.swapXY]: `${axis}좌표는 ${axis === 'x' ? '앞' : '뒤'} 자리예요.`, [TAGS.sameBoth]: `${axis}축 위에 있으면 ${axis === 'x' ? 'y' : 'x'}좌표는 0이에요.` }, probe: { ask: 'axis', axis, v } }; };
      fams.push(famOf([axisPt('x', 1), axisPt('x', -1), axisPt('y', 1), axisPt('y', -1)]));
      // 좌표평면 위의 직각삼각형 넓이 — 꼭짓점 B에서 직각, 변이 축과 나란하다
      fams.push(famOf([
        (() => {
          const [p, p2, q1, q2] = draw(() => [-int(r, 1, 4), int(r, 1, 5), int(r, 1, 5), -int(r, 1, 4)], ([x1, x2, y1, y2]) => {
            const w = x2 - x1; const h = y1 - y2; const w2 = x2 + x1; // 음수 좌표까지의 거리를 빼서 센 가로
            return (w * h) % 2 === 0 && w2 > 0 && (w2 * h) % 2 === 0 && allDiff((w * h) / 2, w * h, (w2 * h) / 2) && Math.abs(x1) !== x2;
          });
          const w = p2 - p; const h = q1 - q2; const A = (w * h) / 2;
          return { t: `세 점 A${co(p, q1)}, B${co(p, q2)}, C${co(p2, q2)} — 이 세 점을 꼭짓점으로 하는 삼각형 ABC의 넓이는 얼마일까요?\n\n${PL(BOX5, pt('A', p, q1), pt('B', p, q2), pt('C', p2, q2), 'poly=ABC')}`, ans: num(A), wr: [{ text: num(w * h), tag: TAGS.noHalf }, { text: num(((p2 + p) * h) / 2), tag: TAGS.distSign }], steps: [`밑변 BC = ${p2} − (${num(p)}) = ${w}, 높이 AB = ${q1} − (${num(q2)}) = ${h}`, `넓이 = ${w} × ${h} ÷ 2 = ${A}`], why: { [TAGS.noHalf]: '삼각형의 넓이는 밑변 × 높이 ÷ 2예요.', [TAGS.distSign]: `${num(p)}에서 ${p2}까지는 ${p2} − (${num(p)}) = ${w}칸이에요.` }, probe: { ask: 'area', p, p2, q1, q2 } };
        })(),
      ]));
      return askFam(r, c, this, fams);
    },
    misread(r, c) {
      if (branchOf(r, c, ['axis', 'move']) === 'axis') {
        const b = int(r, 1, 5);
        return misAsk(r, c, this, 'axis', {
          q: `점 P의 좌표: ${co(0, b)}\n\n${showWork('점 P는 x축 위에 있어요')}`,
          ok: 'x좌표가 0이라서 y축 위에 있어요',
          wr: [{ text: '맞게 말했어요', tag: RIGHT_AS_WRONG }, { text: '점 P는 원점에 있어요', tag: TAGS.zeroOrigin }, { text: '좌표에 0이 있는 점은 좌표평면에 나타낼 수 없어요', tag: OFF }],
          steps: ['x좌표가 0 — 원점에서 가로로 가지 않아요', `위로 ${b}칸 — y축 위의 점`],
          whyAny: 'x좌표가 0인 점은 y축 위에, y좌표가 0인 점은 x축 위에 있어요.',
          probe: { ask: 'axis', b },
        });
      }
      const [a, b] = draw(() => [int(r, 1, 5), -int(r, 1, 5)], ([x, y]) => x !== -y);
      return misAsk(r, c, this, 'move', {
        q: `점 P의 좌표: ${co(a, b)}\n\n${showWork(`원점에서 오른쪽으로 ${a}칸, 위로 ${-b}칸 가서 찍었어요`, '찍었어요')}`,
        ok: `y좌표가 ${num(b)} — 원점에서 오른쪽으로 ${a}칸, 아래로 ${-b}칸`,
        wr: [{ text: '맞게 찍었어요', tag: RIGHT_AS_WRONG }, { text: `원점에서 위로 ${a}칸, 오른쪽으로 ${-b}칸`, tag: TAGS.swapXY }, { text: '음수 좌표는 좌표평면에 찍을 수 없어요', tag: OFF }],
        steps: [`x좌표 ${a} — 오른쪽으로 ${a}칸`, `y좌표 ${num(b)} — 아래로 ${-b}칸`],
        whyAny: 'y좌표가 음수면 아래로 가요. 부호까지 보고 방향을 정해요.',
        probe: { ask: 'move', a, b },
      });
    },
  },

  {
    id: 'crd.quad', grade: 7, name: '사분면', needs: ['crd.plot'],
    idea: '좌표축은 좌표평면을 네 부분으로 나눠요. 오른쪽 위부터 **시계 반대 방향**으로 **제1사분면**, **제2사분면**, **제3사분면**, **제4사분면**이라고 해요. 제1사분면은 (+, +), 제2사분면은 (−, +), 제3사분면은 (−, −), 제4사분면은 (+, −) — 부호만 보면 알 수 있어요. 좌표축 위의 점은 어느 사분면에도 속하지 않아요.',
    rule: '(+, +) 제1 · (−, +) 제2 · (−, −) 제3 · (+, −) 제4 — 축 위는 어느 사분면도 아님.',
    slip: '두 좌표의 부호를 먼저 보고, 시계 반대 방향으로 셌는지 봐요.',
    calc(r, c) {
      const fams = [];
      const QS = [1, 2, 3, 4];
      /** 정답 사분면 ans, 처음 점의 사분면 g(없으면 0) — 오답 이름표는 그 사분면이 무엇을 잘못한 것인지로 */
      const quadTags = (ans, x, y, g = 0) => QS.filter((q) => q !== ans).map((q) => {
        if (g && q === g) return { text: QNAME(q), tag: TAGS.sameQuad };
        if (q === CLOCK[ans]) return { text: QNAME(q), tag: TAGS.quadOrder };
        if (!g && q === 1) return { text: QNAME(q), tag: TAGS.dropSign };
        if (!g && q === quadOf(-x, y)) return { text: QNAME(q), tag: TAGS.signX };
        if (!g && q === quadOf(x, -y)) return { text: QNAME(q), tag: TAGS.signY };
        return { text: QNAME(q), tag: TAGS.signWrong };
      });
      const whichQ = (sx, sy) => { const [a, b] = [sx * int(r, 1, 9), sy * int(r, 1, 9)]; const q = quadOf(a, b); return { t: `좌표가 ${co(a, b)}인 점은 어느 사분면 위에 있을까요?`, text: true, ans: QNAME(q), wr: quadTags(q, a, b), steps: [`x좌표 ${num(a)}는 ${a > 0 ? '+' : '−'}, y좌표 ${num(b)}는 ${b > 0 ? '+' : '−'}`, `(${a > 0 ? '+' : '−'}, ${b > 0 ? '+' : '−'}) → ${QNAME(q)}`], why: { [TAGS.quadOrder]: '사분면은 오른쪽 위에서 시계 반대 방향으로 세요.', [TAGS.dropSign]: '부호를 보세요 — 음수가 있으면 제1사분면이 아니에요.', [TAGS.signX]: `x좌표 ${num(a)}의 부호를 다시 보세요.`, [TAGS.signY]: `y좌표 ${num(b)}의 부호를 다시 보세요.` }, probe: { ask: 'which' } }; };
      fams.push(famOf([whichQ(-1, 1), whichQ(-1, -1), whichQ(1, -1)]));
      // 축 위의 점
      const onAxis = (axis, s) => { const v = s * int(r, 1, 9); const [x, y] = axis === 'x' ? [v, 0] : [0, v]; const qp = axis === 'x' ? quadOf(v, 1) : quadOf(1, v); const qn = axis === 'x' ? quadOf(v, -1) : quadOf(-1, v); return { t: `좌표가 ${co(x, y)}인 점은 어느 사분면 위에 있을까요?`, text: true, ans: QNAME(0), wr: [{ text: QNAME(qp), tag: TAGS.zeroPos }, { text: QNAME(qn), tag: TAGS.zeroNeg }], steps: [`${axis === 'x' ? 'y' : 'x'}좌표가 0 — ${axis}축 위의 점`, '좌표축 위의 점은 어느 사분면에도 속하지 않아요'], why: { [TAGS.zeroPos]: '0은 양수가 아니에요 — 축 위의 점이에요.', [TAGS.zeroNeg]: '0은 음수가 아니에요 — 축 위의 점이에요.' }, probe: { ask: 'axis' } }; };
      fams.push(famOf([onAxis('x', 1), onAxis('x', -1), onAxis('y', 1), onAxis('y', -1)]));
      // 부호로 따지기 — 점 (a, b)가 제g사분면에 있을 때 바꾼 점은?
      const MOVES = { swap: (k) => [`(${k}b, a)`, (x, y) => [y, x]], negx: (k) => [`(−${k}a, b)`, (x, y) => [-x, y]], negy: (k) => [`(a, −${k}b)`, (x, y) => [x, -y]], neg: (k) => [`(−${k}a, −${k}b)`, (x, y) => [-x, -y]] };
      const signQ = (g, mv) => { const [sx, sy] = { 1: [1, 1], 2: [-1, 1], 3: [-1, -1], 4: [1, -1] }[g]; const [lab, f] = MOVES[mv](int(r, 2, 9)); const [x, y] = f(sx, sy); const ans = quadOf(x, y); return { t: `점 (a, b)가 제${g}사분면 위에 있을 때, 점 ${lab}는 어느 사분면 위에 있을까요?`, text: true, ans: QNAME(ans), wr: quadTags(ans, x, y, g), steps: [`제${g}사분면이면 a는 ${sx > 0 ? '+' : '−'}, b는 ${sy > 0 ? '+' : '−'}`, `${lab}는 (${x > 0 ? '+' : '−'}, ${y > 0 ? '+' : '−'}) → ${QNAME(ans)}`], why: { [TAGS.sameQuad]: '좌표의 자리·부호가 바뀌었어요 — 다시 따져요.', [TAGS.quadOrder]: '사분면은 오른쪽 위에서 시계 반대 방향으로 세요.', [TAGS.signWrong]: 'a, b의 부호부터 적고, 바꾼 점의 부호를 하나씩 따져요.' }, probe: { ask: 'sign', g, mv } }; };
      fams.push(famOf([signQ(2, 'swap'), signQ(4, 'swap'), signQ(2, 'negx'), signQ(3, 'negx'), signQ(4, 'negy'), signQ(2, 'neg')]));
      return askFam(r, c, this, fams);
    },
    misread(r, c) {
      if (branchOf(r, c, ['axis', 'order']) === 'axis') {
        const a = int(r, 1, 9);
        return misAsk(r, c, this, 'axis', {
          q: `점의 좌표: ${co(a, 0)}\n\n${showWork('이 점은 제1사분면 위의 점이에요')}`,
          ok: 'y좌표가 0이라 x축 위의 점 — 어느 사분면에도 속하지 않아요',
          wr: [{ text: '맞게 말했어요', tag: RIGHT_AS_WRONG }, { text: '제4사분면 위의 점이에요', tag: TAGS.zeroNeg }, { text: 'x좌표가 양수인 점은 사분면을 알 수 없어요', tag: OFF }],
          steps: ['y좌표가 0 — x축 위의 점', '좌표축 위의 점은 어느 사분면에도 속하지 않아요'],
          whyAny: '0은 양수도 음수도 아니에요. 좌표가 0인 점은 축 위에 있어요.',
          probe: { ask: 'axis', a },
        });
      }
      const [a, b] = [-int(r, 1, 9), int(r, 1, 9)];
      return misAsk(r, c, this, 'order', {
        q: `점의 좌표: ${co(a, b)}\n\n${showWork('이 점은 제4사분면 위의 점이에요')}`,
        ok: 'x좌표는 음수, y좌표는 양수 — 제2사분면 위의 점이에요',
        wr: [{ text: '맞게 말했어요', tag: RIGHT_AS_WRONG }, { text: '제3사분면 위의 점이에요', tag: TAGS.signY }, { text: '음수가 있는 점은 사분면에 없어요', tag: OFF }],
        steps: ['(−, +) — 원점보다 왼쪽 위', '오른쪽 위에서 시계 반대 방향으로 두 번째 → 제2사분면'],
        whyAny: '사분면은 시계 반대 방향으로 세요. 왼쪽 위가 제2사분면이에요.',
        probe: { ask: 'order', a, b },
      });
    },
  },

  {
    id: 'crd.graph', grade: 7, name: '그래프와 그 해석', needs: ['crd.quad'],
    idea: 'x, y처럼 여러 가지로 변하는 값을 나타내는 문자를 **변수**라고 해요. 두 변수 x, y의 순서쌍 (x, y)를 좌표로 하는 점을 좌표평면 위에 모두 나타낸 것을 그 관계의 **그래프**라고 해요. 그래프를 보면 언제 늘어나는지(오른쪽 위로), 언제 그대로인지(가로로 평평), 언제 줄어드는지(오른쪽 아래로), 같은 모양이 되풀이되는지 한눈에 보여요. 먼저 가로축과 세로축이 무엇인지, 한 칸이 얼마인지 읽어요.',
    rule: '축이 무엇인지·한 칸이 얼마인지 먼저 — 오른쪽 위로 늘어남, 평평하면 그대로, 오른쪽 아래로 줄어듦.',
    slip: '가로축·세로축이 무엇인지, 눈금 한 칸이 얼마인지 봐요.',
    calc(r, c) {
      const fams = [];
      // 값 읽기 — 물통 (세로 한 칸 5 cm)
      fams.push(famOf([
        (() => { const w = tankOf(r); return { t: `${TANK}\n\n${tankPlane(w)}\n\n물을 넣기 시작한 지 ${w.t1}분 뒤 물의 높이는 몇 cm일까요?`, ans: num(w.h1), wr: [{ text: num(w.h1 / 5), tag: TAGS.cellCount }, { text: num(w.t1), tag: TAGS.xForY }], steps: [`가로축에서 ${w.t1}분을 찾아 위로 올라가요`, `세로 눈금 한 칸은 5 cm — 그래프의 높이는 ${w.h1} cm`], why: { [TAGS.cellCount]: '세로 눈금 한 칸은 5 cm예요 — 칸 수에 5를 곱해요.', [TAGS.xForY]: `${w.t1}은 가로축(시간) 값이에요. 물의 높이는 세로축에서 읽어요.` }, probe: { ask: 'tankval' } }; })(),
      ]));
      // 쉰 시간 — 자전거 (평평한 구간)
      fams.push(famOf([
        (() => { const b = bikeOf(r); return { t: `${BIKE}\n\n${bikePlane(b)}\n\n{me/은/는} 가는 도중에 몇 분 동안 쉬었을까요?`, ans: num(b.rest), wr: [{ text: num(b.t2), tag: TAGS.endAsLen }, { text: num(b.d1), tag: TAGS.yForX }], steps: [`그래프가 가로로 평평한 때 — 거리가 그대로(쉼)`, `${b.t1}분부터 ${b.t2}분까지 → ${b.t2} − ${b.t1} = ${b.rest}분`], why: { [TAGS.endAsLen]: `${b.t2}분은 다시 출발한 때예요. 쉰 시간은 ${b.t2} − ${b.t1}이에요.`, [TAGS.yForX]: `${b.d1} km는 쉰 곳까지의 거리 — 세로축 값이에요.` }, probe: { ask: 'rest' } }; })(),
      ]));
      // 구간의 뜻 — 늘어남 · 그대로 · 줄어듦 (틀마다 묻는 구간이 하나)
      const UP = '높아졌어요'; const FLAT = '그대로였어요'; const DOWN = '낮아졌어요';
      const seg = (kind) => {
        const w = tankOf(r);
        const [a, b] = kind === 'up' ? [0, w.t1] : kind === 'flat' ? [w.t1, w.t2] : [w.t2, 10];
        const ans = { up: UP, flat: FLAT, down: DOWN }[kind];
        const tagOf = (o) => (kind === 'flat' ? TAGS.flatAsMove : o === FLAT ? TAGS.moveAsFlat : kind === 'up' ? TAGS.upAsDown : TAGS.downAsUp);
        return { t: `${TANK}\n\n${tankPlane(w)}\n\n${a}분부터 ${b}분까지 물의 높이는 어떻게 되었을까요?`, text: true, ans, wr: [UP, FLAT, DOWN].filter((o) => o !== ans).map((o) => ({ text: o, tag: tagOf(o) })), steps: [`${a}분부터 ${b}분까지 그래프는 ${kind === 'up' ? '오른쪽 위로 향해요' : kind === 'flat' ? '가로로 평평해요' : '오른쪽 아래로 향해요'}`, `물의 높이가 ${ans}`], why: { [TAGS.flatAsMove]: '평평한 동안은 높이가 바뀌지 않아요.', [TAGS.moveAsFlat]: '그래프가 기울어 있으면 높이가 바뀌고 있어요.', [TAGS.upAsDown]: '오른쪽 위로 향하면 시간이 지날수록 높아져요.', [TAGS.downAsUp]: '오른쪽 아래로 향하면 시간이 지날수록 낮아져요.' }, probe: { ask: 'seg', kind } };
      };
      fams.push(famOf([seg('up'), seg('flat'), seg('down')]));
      // 되풀이 — 관람차 한 바퀴
      fams.push(famOf([
        (() => { const w = wheelOf(r); return { t: `${WHEEL}\n\n${wheelPlane(w)}\n\n관람차가 가장 낮은 곳에서 출발해 다시 가장 낮은 곳으로 돌아오는 데 몇 분이 걸릴까요?`, ans: num(w.P), wr: [{ text: num(w.P / 2), tag: TAGS.halfPeriod }, { text: num(w.hi), tag: TAGS.yForX }], steps: [`높이 ${w.lo} m(가장 낮은 곳)에서 출발 — 0분`, `다시 ${w.lo} m가 되는 때는 ${w.P}분 → ${w.P}분`], why: { [TAGS.halfPeriod]: `${w.P / 2}분은 가장 높은 곳에 닿은 때예요. 다시 내려와야 한 바퀴예요.`, [TAGS.yForX]: `${w.hi} m는 가장 높은 곳의 높이 — 세로축 값이에요.` }, probe: { ask: 'period' } }; })(),
      ]));
      return askFam(r, c, this, fams);
    },
    misread(r, c) {
      const b = bikeOf(r);
      if (branchOf(r, c, ['flat', 'shape']) === 'flat') {
        return misAsk(r, c, this, 'flat', {
          q: `${BIKE}\n\n${bikePlane(b)}\n\n${showWork(`${b.t1}분부터 ${b.t2}분까지 그래프가 가로로 평평하니까 그동안 계속 달렸어요`)}`,
          ok: '평평한 동안 집에서 떨어진 거리가 그대로 — 쉬고 있었어요',
          wr: [{ text: '맞게 말했어요', tag: RIGHT_AS_WRONG }, { text: '그동안 집 쪽으로 돌아왔어요', tag: TAGS.flatAsMove }, { text: '그래프로는 쉰 때를 알 수 없어요', tag: OFF }],
          steps: [`${b.t1}분일 때도 ${b.t2}분일 때도 거리는 ${b.d1} km`, '거리가 그대로 — 그동안 움직이지 않았어요'],
          whyAny: '그래프가 평평하면 세로축 값이 그대로예요. 거리가 그대로면 멈춰 있었던 거예요.',
          probe: { ask: 'flat' },
        });
      }
      return misAsk(r, c, this, 'shape', {
        q: `${BIKE}\n\n${bikePlane(b)}\n\n${showWork(`처음 ${b.t1}분 동안 그래프가 오른쪽 위로 올라가니까 언덕길을 올라갔어요`)}`,
        ok: '세로축은 집에서 떨어진 거리 — 집에서 점점 멀어졌다는 뜻이에요',
        wr: [{ text: '맞게 말했어요', tag: RIGHT_AS_WRONG }, { text: '집에 점점 가까워졌다는 뜻이에요', tag: TAGS.upAsDown }, { text: '그래프로는 거리를 알 수 없어요', tag: OFF }],
        steps: ['가로축은 시간, 세로축은 집에서 떨어진 거리', `0분에 0 km, ${b.t1}분에 ${b.d1} km — 멀어졌어요`],
        whyAny: '그래프의 모양은 길 모양이 아니에요. 세로축이 무엇인지 읽어요.',
        probe: { ask: 'shape' },
      });
    },
  },

  {
    id: 'crd.prop', grade: 7, name: '정비례 관계', needs: ['crd.graph'],
    idea: '두 변수 x, y에서 x의 값이 2배, 3배, 4배, …로 변할 때 y의 값도 2배, 3배, 4배, …로 변하는 관계가 있으면 y는 x에 **정비례**한다고 해요. 이때 y = ax (a ≠ 0) 꼴로 나타낼 수 있고, y ÷ x의 값은 항상 a로 같아요. a가 음수여도 정비례예요. "x가 커질 때 y도 커진다"만으로는 정비례가 아니에요 — y = x + 3은 x가 2배가 되어도 y가 2배가 되지 않아요.',
    rule: 'y = ax 꼴(a ≠ 0) — y ÷ x가 늘 a로 같으면 정비례.',
    slip: 'x가 2배가 될 때 y도 2배가 되는지, y ÷ x가 늘 같은지 봐요.',
    calc(r, c) {
      const fams = [];
      // 표 → 식 (표는 양수만 — 표 그림이 음수를 그리지 않는다)
      fams.push(famOf([
        (() => { const a = int(r, 2, 9); return { t: `y가 x에 정비례할 때, x와 y 사이의 관계를 식으로 나타내면 어느 것일까요?\n\n[table x:1, 2, 3, 4 / y:${a}, ${2 * a}, ${3 * a}, ${4 * a}]`, text: true, ans: linEq(a), wr: [{ text: `y = x + ${a}`, tag: TAGS.stepAsAdd }, { text: linEq(1, a), tag: TAGS.flipRatio }], steps: [`y ÷ x를 구하면 ${a} ÷ 1 = ${a}, ${2 * a} ÷ 2 = ${a} — 늘 ${a}`, `y = ${a}x`], why: { [TAGS.stepAsAdd]: `x = 1이면 1 + ${a} = ${a + 1} — 표의 ${a}와 달라요.`, [TAGS.flipRatio]: `y를 x로 나눠요 — ${a} ÷ 1 = ${a}.` }, probe: { ask: 'table' } }; })(),
      ]));
      // 한 쌍 → 다른 값 (부호가 틀마다 같다)
      fams.push(famOf([
        (() => { const [a, p, s] = draw(() => [-int(r, 2, 6), int(r, 1, 5), int(r, 2, 6)], ([a1, p1, s1]) => s1 !== p1 && allDiff(a1 * s1, -a1 * s1, s1 + a1 * p1 - p1)); const q = a * p; return { t: `y가 x에 정비례하고, x = ${p}일 때 y = ${num(q)}인 관계예요. x = ${s}일 때 y의 값은 얼마일까요?`, ans: num(a * s), wr: [{ text: num(-a * s), tag: TAGS.signDrop }, { text: num(s + q - p), tag: TAGS.diffSame }], steps: [`y ÷ x = ${num(q)} ÷ ${p} = ${num(a)} → y = ${num(a)}x`, `x = ${s}일 때 y = ${num(a)} × ${s} = ${num(a * s)}`], why: { [TAGS.signDrop]: `a = ${num(a)} — 음수예요.`, [TAGS.diffSame]: '정비례는 차가 아니라 y ÷ x가 같아요.' }, probe: { ask: 'pair' } }; })(),
        (() => { const [a, p, s] = draw(() => [int(r, 2, 6), int(r, 1, 5), -int(r, 2, 6)], ([a1, p1, s1]) => allDiff(a1 * s1, -a1 * s1, s1 + a1 * p1 - p1)); const q = a * p; return { t: `y가 x에 정비례하고, x = ${p}일 때 y = ${q}인 관계예요. x = ${num(s)}일 때 y의 값은 얼마일까요?`, ans: num(a * s), wr: [{ text: num(-a * s), tag: TAGS.signDrop }, { text: num(s + q - p), tag: TAGS.diffSame }], steps: [`y ÷ x = ${q} ÷ ${p} = ${a} → y = ${a}x`, `x = ${num(s)}일 때 y = ${a} × (${num(s)}) = ${num(a * s)}`], why: { [TAGS.signDrop]: `x = ${num(s)} — 음수를 곱하면 음수예요.`, [TAGS.diffSame]: '정비례는 차가 아니라 y ÷ x가 같아요.' }, probe: { ask: 'pair' } }; })(),
      ]));
      // 정비례인 것 고르기
      fams.push(famOf([
        (() => { const [k, m] = draw(() => [int(r, 2, 9), int(r, 2, 9)], ([k1, m1]) => k1 !== m1); return { t: '다음 중 y가 x에 정비례하는 것은 어느 것일까요?', text: true, ans: linEq(-k), wr: [{ text: `y = x + ${m}`, tag: TAGS.growAsProp }, { text: `y = ${k}x + ${m}`, tag: TAGS.constAdd }, { text: `x + y = ${m}`, tag: TAGS.sumAsProp }], steps: ['y = ax 꼴(a ≠ 0)이면 정비례', `y = −${k}x — a = −${k}여도 정비례`], why: { [TAGS.growAsProp]: `x가 1에서 2로 2배가 되면 y는 ${1 + m}에서 ${2 + m} — 2배가 아니에요.`, [TAGS.constAdd]: `${m}를 더하면 y ÷ x가 늘 같지 않아요.`, [TAGS.sumAsProp]: '합이 같은 관계는 정비례가 아니에요.' }, probe: { ask: 'which' } }; })(),
        (() => { const [k, m] = draw(() => [int(r, 2, 9), int(r, 2, 9)], ([k1, m1]) => k1 !== m1); return { t: '다음 중 y가 x에 정비례하는 것은 어느 것일까요?', text: true, ans: linEq(1, k), wr: [{ text: `y = x + ${m}`, tag: TAGS.growAsProp }, { text: `y = ${k}x + ${m}`, tag: TAGS.constAdd }, { text: `x + y = ${m}`, tag: TAGS.sumAsProp }], steps: ['y = ax 꼴(a ≠ 0)이면 정비례', `y = x/${k} — y = ax에서 a가 ${k}분의 1이라 정비례`], why: { [TAGS.growAsProp]: `x가 1에서 2로 2배가 되면 y는 ${1 + m}에서 ${2 + m} — 2배가 아니에요.`, [TAGS.constAdd]: `${m}를 더하면 y ÷ x가 늘 같지 않아요.`, [TAGS.sumAsProp]: '합이 같은 관계는 정비례가 아니에요.' }, probe: { ask: 'which' } }; })(),
      ]));
      return askFam(r, c, this, fams);
    },
    misread(r, c) {
      if (branchOf(r, c, ['grow', 'neg']) === 'grow') {
        const m = int(r, 2, 9);
        return misAsk(r, c, this, 'grow', {
          q: `식: y = x + ${m}\n\n${showWork('x가 커질 때 y도 커지니까 정비례예요')}`,
          ok: `x가 1에서 2로 2배가 될 때 y는 ${1 + m}에서 ${2 + m} — 2배가 아니라서 정비례가 아니에요`,
          wr: [{ text: '맞게 말했어요', tag: RIGHT_AS_WRONG }, { text: 'x가 1 커질 때 y도 1 커지니까 정비례가 맞아요', tag: TAGS.stepAsAdd }, { text: '더하기가 있는 식은 x와 y의 관계가 아니에요', tag: OFF }],
          steps: [`x = 1이면 y = ${1 + m}, x = 2이면 y = ${2 + m}`, `${2 + m} ÷ ${1 + m}은 2가 아니에요 — 정비례가 아니에요`],
          whyAny: '함께 커진다고 정비례는 아니에요. x가 2배일 때 y도 2배인지 봐요.',
          probe: { ask: 'grow', m },
        });
      }
      const k = int(r, 2, 9);
      return misAsk(r, c, this, 'neg', {
        q: `식: y = −${k}x\n\n${showWork('x가 커질 때 y가 작아지니까 정비례가 아니에요')}`,
        ok: `y = ax 꼴이라 a가 음수여도 정비례 — x가 1에서 2로 2배가 되면 y도 −${k}에서 −${2 * k}로 2배`,
        wr: [{ text: '맞게 말했어요', tag: RIGHT_AS_WRONG }, { text: `a가 음수라서 정비례가 아니에요 — y = ${k}x만 정비례예요`, tag: TAGS.negNotProp }, { text: '음수를 곱한 식은 그래프로도 나타낼 수 없어요', tag: OFF }],
        steps: [`x = 1이면 y = −${k}, x = 2이면 y = −${2 * k}`, `y ÷ x는 늘 −${k} — 정비례`],
        whyAny: 'a가 음수여도 y = ax 꼴이면 정비례예요. x가 2배일 때 y도 2배가 돼요.',
        probe: { ask: 'neg', k },
      });
    },
  },

  {
    id: 'crd.pgraph', grade: 7, name: '정비례 관계의 그래프', needs: ['crd.prop'],
    idea: 'y = ax (a ≠ 0)의 그래프는 **원점을 지나는 직선**이에요. a > 0이면 오른쪽 위로 향하는 직선 — 제1사분면과 제3사분면을 지나고 x의 값이 커지면 y의 값도 커져요. a < 0이면 오른쪽 아래로 향하는 직선 — 제2사분면과 제4사분면을 지나고 x의 값이 커지면 y의 값은 작아져요. a의 절댓값이 클수록 그래프는 y축에 가까워요. 그래프 위의 한 점 (p, q)를 알면 a = q ÷ p로 구해요.',
    rule: '원점을 지나는 직선 — a > 0 오른쪽 위, a < 0 오른쪽 아래, a = y ÷ x.',
    slip: 'a의 부호로 방향을, 그래프 위의 점으로 a = y ÷ x를 봐요.',
    calc(r, c) {
      const fams = [];
      // 그래프 → 식 (정수 a · 분수 a, 부호마다 틀)
      const g2f = (kind) => {
        const k = kind === 'int+' || kind === 'int−' ? int(r, 2, 5) : int(r, 2, 3);
        const s = kind.endsWith('−') ? -1 : 1;
        const [n, d] = kind.startsWith('int') ? [s * k, 1] : [s, k];
        const m = kind.startsWith('int') ? int(r, 1, Math.max(1, Math.floor(6 / k))) : int(r, 1, 2); // 점 P = 직선 위 격자점 (그림 안)
        const [px, py] = kind.startsWith('int') ? [m, s * k * m] : [k * m, s * m];
        return { t: `다음 그래프가 나타내는 식은 어느 것일까요?\n\n${PL(BOX6, `lin=${num(n)}${d > 1 ? `/${d}` : ''}`, pt('P', px, py))}`, text: true, ans: linEq(n, d), wr: [{ text: linEq(-n, d), tag: TAGS.aSign }, { text: linEq(d, n), tag: TAGS.flipRatio }], steps: [`원점을 지나는 직선 — y = ax 꼴, 그래프 위의 점 P의 좌표는 ${co(px, py)}`, `a = ${num(py)} ÷ ${px} = ${fr(py, px)} → ${linEq(n, d)}`], why: { [TAGS.aSign]: `직선이 오른쪽 ${s > 0 ? '위' : '아래'}로 향해요 — a는 ${s > 0 ? '양수' : '음수'}예요.`, [TAGS.flipRatio]: 'a = y ÷ x — y좌표를 x좌표로 나눠요.' }, probe: { ask: 'g2f', px, py } };
      };
      fams.push(famOf([g2f('int+'), g2f('int−'), g2f('frac+'), g2f('frac−')]));
      // 점 → a
      const p2a = (sx) => { const [p, q] = draw(() => [sx * int(r, 1, 6), -sx * int(r, 1, 12)], ([p1, q1]) => q1 % p1 === 0 && Math.abs(q1 / p1) >= 2 && Math.abs(p1) !== Math.abs(q1)); const a = q / p; return { t: `y = ax의 그래프가 점 P를 지나요. 점 P의 좌표가 ${co(p, q)}일 때, a의 값은 얼마일까요?`, ans: num(a), wr: [{ text: fr(p, q), tag: TAGS.flipRatio }, { text: num(-a), tag: TAGS.aSign }], steps: [`점 P에서 x = ${num(p)}, y = ${num(q)}`, `a = y ÷ x = ${num(q)} ÷ (${num(p)}) = ${num(a)}`], why: { [TAGS.flipRatio]: 'a = y ÷ x — y좌표를 x좌표로 나눠요.', [TAGS.aSign]: '부호가 다른 두 수를 나누면 음수예요.' }, probe: { ask: 'p2a' } }; };
      fams.push(famOf([p2a(1), p2a(-1)]));
      // 그래프 위의 점의 y좌표
      const yOn = (sa) => { const [a, s] = draw(() => [sa * int(r, 2, 6), -int(r, 2, 6)], ([a1, s1]) => allDiff(a1 * s1, -a1 * s1, a1 + s1, s1 / a1) && Math.abs(a1) !== Math.abs(s1)); return { t: `y = ${num(a)}x의 그래프 위에 점 A가 있어요. 점 A의 x좌표가 ${num(s)}일 때, y좌표는 얼마일까요?`, ans: num(a * s), wr: [{ text: num(-a * s), tag: TAGS.mulSign }, { text: num(a + s), tag: TAGS.addForMul }, { text: fr(s, a), tag: TAGS.divForMul }], steps: [`y = ${num(a)}x에 x = ${num(s)}를 넣어요`, `y = ${num(a)} × (${num(s)}) = ${num(a * s)}`], why: { [TAGS.mulSign]: sa < 0 ? '음수 × 음수는 양수예요.' : '양수 × 음수는 음수예요.', [TAGS.addForMul]: `${num(a)}x는 ${num(a)} × x — 곱해요.`, [TAGS.divForMul]: `${num(a)}x는 ${num(a)} × x — 나누지 않고 곱해요.` }, probe: { ask: 'yon' } }; };
      fams.push(famOf([yOn(1), yOn(-1)]));
      // 그래프의 성질 (a의 부호마다 틀)
      fams.push(famOf([
        (() => { const k = int(r, 2, 9); return { t: `y = −${k}x의 그래프에 대한 설명으로 옳은 것은 어느 것일까요?`, text: true, ans: '오른쪽 아래로 향하는 직선이에요', wr: [{ text: '제1사분면과 제3사분면을 지나요', tag: TAGS.aSign }, { text: '원점을 지나지 않아요', tag: TAGS.notOrigin }, { text: `x = 1일 때 y = ${k}예요`, tag: TAGS.signDrop }], steps: ['y = ax 꼴 — 원점을 지나는 직선', `a = −${k} < 0 — 오른쪽 아래로, 제2사분면과 제4사분면`], why: { [TAGS.aSign]: 'a < 0이면 제2사분면과 제4사분면을 지나요.', [TAGS.notOrigin]: `x = 0이면 y = −${k} × 0 = 0 — 원점을 지나요.`, [TAGS.signDrop]: `x = 1이면 y = −${k} × 1 = −${k}예요.` }, probe: { ask: 'prop-' } }; })(),
        (() => { const k = int(r, 2, 9); return { t: `y = ${k}x의 그래프에 대한 설명으로 옳은 것은 어느 것일까요?`, text: true, ans: 'x의 값이 커지면 y의 값도 커져요', wr: [{ text: '오른쪽 아래로 향하는 직선이에요', tag: TAGS.dirWrong }, { text: '원점을 지나지 않아요', tag: TAGS.notOrigin }, { text: `x = 1일 때 y = −${k}예요`, tag: TAGS.signFlip }], steps: ['y = ax 꼴 — 원점을 지나는 직선', `a = ${k} > 0 — 오른쪽 위로, x가 커지면 y도 커져요`], why: { [TAGS.dirWrong]: 'a > 0이면 오른쪽 위로 향해요.', [TAGS.notOrigin]: `x = 0이면 y = ${k} × 0 = 0 — 원점을 지나요.`, [TAGS.signFlip]: `x = 1이면 y = ${k} × 1 = ${k}예요.` }, probe: { ask: 'prop+' } }; })(),
      ]));
      // y축에 가장 가까운 것 — a의 절댓값이 가장 큰 것
      fams.push(famOf([
        (() => { const [k, m, d] = draw(() => [int(r, 4, 7), int(r, 2, 6), int(r, 2, 4)], ([k1, m1]) => m1 < k1); return { t: '다음 중 그래프가 y축에 가장 가까운 것은 어느 것일까요?', text: true, ans: linEq(-k), wr: [{ text: linEq(m), tag: TAGS.signBig }, { text: linEq(1, d), tag: TAGS.smallClose }], steps: [`a의 절댓값: ${k}, ${m}, ${d}분의 1`, `가장 큰 것은 ${k} → y = −${k}x`], why: { [TAGS.signBig]: `−${k}의 절댓값 ${k}가 ${m}보다 커요 — 부호는 방향만 정해요.`, [TAGS.smallClose]: 'a의 절댓값이 클수록 y축에 가까워요.' }, probe: { ask: 'close' } }; })(),
      ]));
      return askFam(r, c, this, fams);
    },
    misread(r, c) {
      if (branchOf(r, c, ['origin', 'dir']) === 'origin') {
        const a = int(r, 2, 9);
        return misAsk(r, c, this, 'origin', {
          q: `식: y = ${a}x\n\n${showWork(`y = ${a}x의 그래프는 x = 0일 때 y = ${a}인 점을 지나요`)}`,
          ok: `x = 0이면 y = ${a} × 0 = 0 — 원점을 지나요`,
          wr: [{ text: '맞게 말했어요', tag: RIGHT_AS_WRONG }, { text: '원점을 지나지 않고 x = 0일 때 y = 1이에요', tag: TAGS.notOrigin }, { text: 'x = 0인 점은 그래프에 없어요', tag: OFF }],
          steps: [`x = 0을 넣으면 y = ${a} × 0 = 0`, '정비례 그래프는 늘 원점을 지나요'],
          whyAny: 'y = ax에서 x = 0이면 y = 0이에요. 정비례 그래프는 늘 원점을 지나요.',
          probe: { ask: 'origin', a },
        });
      }
      const k = int(r, 2, 9);
      return misAsk(r, c, this, 'dir', {
        q: `식: y = −${k}x\n\n${showWork(`y = −${k}x의 그래프는 오른쪽 위로 향하는 직선이에요`)}`,
        ok: `a = −${k} < 0 — 오른쪽 아래로 향하는 직선이에요`,
        wr: [{ text: '맞게 말했어요', tag: RIGHT_AS_WRONG }, { text: '제1사분면과 제3사분면을 지나는 직선이에요', tag: TAGS.aSign }, { text: '−가 있는 식의 그래프는 직선이 아니에요', tag: OFF }],
        steps: [`x = 1이면 y = −${k}, x = 2이면 y = −${2 * k}`, 'x가 커질 때 y가 작아져요 — 오른쪽 아래로'],
        whyAny: 'a < 0이면 x가 커질 때 y가 작아져요. 오른쪽 아래로 향해요.',
        probe: { ask: 'dir', k },
      });
    },
  },

  {
    id: 'crd.inv', grade: 7, name: '반비례 관계', needs: ['crd.pgraph'],
    idea: '두 변수 x, y에서 x의 값이 2배, 3배, 4배, …로 변할 때 y의 값은 2분의 1배, 3분의 1배, 4분의 1배, …로 변하는 관계가 있으면 y는 x에 **반비례**한다고 해요. 이때 y = a/x (a ≠ 0) 꼴로 나타낼 수 있고, x × y의 값은 항상 a로 같아요. "x가 커질 때 y가 작아진다"만으로는 반비례가 아니에요 — y = 10 − x는 x가 2배가 되어도 y가 2분의 1배가 되지 않아요.',
    rule: 'y = a/x 꼴(a ≠ 0) — x × y가 늘 a로 같으면 반비례.',
    slip: 'x가 2배가 될 때 y가 2분의 1배가 되는지, x × y가 늘 같은지 봐요.',
    calc(r, c) {
      const fams = [];
      // 표 → 식
      fams.push(famOf([
        (() => { const a = 12 * int(r, 1, 5); return { t: `y가 x에 반비례할 때, x와 y 사이의 관계를 식으로 나타내면 어느 것일까요?\n\n[table x:1, 2, 3, 4 / y:${a}, ${a / 2}, ${a / 3}, ${a / 4}]`, text: true, ans: invEq(a), wr: [{ text: linEq(1, a), tag: TAGS.flipInv }, { text: `y = ${a} − x`, tag: TAGS.shrinkAsSub }], steps: [`x × y를 구하면 1 × ${a} = ${a}, 2 × ${a / 2} = ${a} — 늘 ${a}`, `y = ${a}/x`], why: { [TAGS.flipInv]: `${a}를 x로 나눠요 — x를 ${a}로 나누면 순서가 거꾸로예요.`, [TAGS.shrinkAsSub]: `x = 2이면 ${a} − 2 = ${a - 2} — 표의 ${a / 2}와 달라요.` }, probe: { ask: 'table' } }; })(),
      ]));
      // 한 쌍 → 다른 값
      fams.push(famOf([
        (() => { const [p, q, s] = draw(() => [int(r, 2, 4), int(r, 2, 9), int(r, 2, 4) * 2], ([p1, q1, s1]) => s1 !== p1 && (p1 * q1) % s1 === 0 && (q1 * s1) % p1 === 0 && allDiff((p1 * q1) / s1, (q1 * s1) / p1, p1 + q1 - s1)); const a = p * q; return { t: `y가 x에 반비례하고, x = ${p}일 때 y = ${q}인 관계예요. x = ${s}일 때 y의 값은 얼마일까요?`, ans: num(a / s), wr: [{ text: num((q * s) / p), tag: TAGS.propInstead }, { text: num(p + q - s), tag: TAGS.sumSame }], steps: [`x × y = ${p} × ${q} = ${a} → y = ${a}/x`, `x = ${s}일 때 y = ${a} ÷ ${s} = ${a / s}`], why: { [TAGS.propInstead]: '반비례는 x가 커지면 y가 작아져요 — x × y가 같아요.', [TAGS.sumSame]: '반비례는 합이 아니라 x × y가 같아요.' }, probe: { ask: 'pair' } }; })(),
        (() => { const [p, q, s] = draw(() => [int(r, 2, 4), -int(r, 2, 9), int(r, 2, 4) * 2], ([p1, q1, s1]) => s1 !== p1 && (p1 * q1) % s1 === 0 && (q1 * s1) % p1 === 0 && allDiff((p1 * q1) / s1, (q1 * s1) / p1, -(p1 * q1) / s1)); const a = p * q; return { t: `y가 x에 반비례하고, x = ${p}일 때 y = ${num(q)}인 관계예요. x = ${s}일 때 y의 값은 얼마일까요?`, ans: num(a / s), wr: [{ text: num((q * s) / p), tag: TAGS.propInstead }, { text: num(-a / s), tag: TAGS.signDrop }], steps: [`x × y = ${p} × (${num(q)}) = ${num(a)} → y = ${num(a)}/x`, `x = ${s}일 때 y = ${num(a)} ÷ ${s} = ${num(a / s)}`], why: { [TAGS.propInstead]: '반비례는 x × y가 같아요 — 정비례처럼 같은 배수로 늘지 않아요.', [TAGS.signDrop]: `a = ${num(a)} — 음수예요.` }, probe: { ask: 'pair' } }; })(),
      ]));
      // 반비례인 것 고르기
      fams.push(famOf([
        (() => { const [k, m] = draw(() => [int(r, 4, 24), int(r, 5, 20)], ([k1, m1]) => k1 !== m1); return { t: '다음 중 y가 x에 반비례하는 것은 어느 것일까요?', text: true, ans: invEq(-k), wr: [{ text: `y = ${m} − x`, tag: TAGS.shrinkAsInv }, { text: linEq(1, k), tag: TAGS.fracAsInv }, { text: linEq(-k), tag: TAGS.negAsInv }], steps: ['y = a/x 꼴(a ≠ 0)이면 반비례', `y = −${k}/x — a = −${k}여도 반비례`], why: { [TAGS.shrinkAsInv]: `x가 1에서 2로 2배가 되면 y는 ${m - 1}에서 ${m - 2} — 2분의 1배가 아니에요.`, [TAGS.fracAsInv]: `y = x/${k} — x를 ${k}로 나눈 것이라 y = ax 꼴(정비례)이에요.`, [TAGS.negAsInv]: `y = −${k}x는 y = ax 꼴 — 정비례예요.` }, probe: { ask: 'which' } }; })(),
        (() => { const [k, m] = draw(() => [int(r, 4, 24), int(r, 5, 20)], ([k1, m1]) => k1 !== m1); return { t: '다음 중 y가 x에 반비례하는 것은 어느 것일까요?', text: true, ans: invEq(k), wr: [{ text: `y = ${m} − x`, tag: TAGS.shrinkAsInv }, { text: linEq(1, k), tag: TAGS.fracAsInv }, { text: linEq(-k), tag: TAGS.negAsInv }], steps: ['y = a/x 꼴(a ≠ 0)이면 반비례', `y = ${k}/x — x × y = ${k}`], why: { [TAGS.shrinkAsInv]: `x가 1에서 2로 2배가 되면 y는 ${m - 1}에서 ${m - 2} — 2분의 1배가 아니에요.`, [TAGS.fracAsInv]: `y = x/${k} — x를 ${k}로 나눈 것이라 y = ax 꼴(정비례)이에요.`, [TAGS.negAsInv]: `y = −${k}x는 y = ax 꼴 — 정비례예요.` }, probe: { ask: 'which' } }; })(),
      ]));
      // a 구하기
      fams.push(famOf([
        (() => { const [p, q] = draw(() => [int(r, 2, 9), int(r, 2, 9)], ([p1, q1]) => p1 !== q1 && allDiff(p1 * q1, p1 + q1, q1 / p1)); return { t: `y가 x에 반비례하고, x = ${p}일 때 y = ${q}인 관계예요. 이 관계를 식 y = a/x 꼴로 나타낼 때, a의 값은 얼마일까요?`, ans: num(p * q), wr: [{ text: fr(q, p), tag: TAGS.propInstead }, { text: num(p + q), tag: TAGS.addForMul }], steps: ['a = x × y', `a = ${p} × ${q} = ${p * q}`], why: { [TAGS.propInstead]: 'y ÷ x는 정비례의 a — 반비례는 x × y예요.', [TAGS.addForMul]: 'a = x × y — 더하지 않고 곱해요.' }, probe: { ask: 'a' } }; })(),
      ]));
      return askFam(r, c, this, fams);
    },
    misread(r, c) {
      if (branchOf(r, c, ['shrink', 'times']) === 'shrink') {
        const m = int(r, 8, 20);
        return misAsk(r, c, this, 'shrink', {
          q: `식: y = ${m} − x\n\n${showWork('x가 커질 때 y가 작아지니까 반비례예요')}`,
          ok: `x가 1에서 2로 2배가 될 때 y는 ${m - 1}에서 ${m - 2} — 2분의 1배가 아니라서 반비례가 아니에요`,
          wr: [{ text: '맞게 말했어요', tag: RIGHT_AS_WRONG }, { text: 'x가 1 커질 때 y가 1 작아지니까 반비례가 맞아요', tag: TAGS.stepAsInv }, { text: '빼기가 있는 식은 x와 y의 관계가 아니에요', tag: OFF }],
          steps: [`x = 1이면 y = ${m - 1}, x = 2이면 y = ${m - 2}`, `1 × ${m - 1}과 2 × ${m - 2}가 달라요 — 반비례가 아니에요`],
          whyAny: '작아진다고 반비례는 아니에요. x가 2배일 때 y가 2분의 1배인지 봐요.',
          probe: { ask: 'shrink', m },
        });
      }
      const a = 4 * int(r, 3, 9);
      return misAsk(r, c, this, 'times', {
        q: `식: y = ${a}/x\n\n${showWork('x가 2배가 되면 y도 2배가 돼요')}`,
        ok: `x = 2일 때 y = ${a / 2}, x = 4일 때 y = ${a / 4} — y는 2분의 1배가 돼요`,
        wr: [{ text: '맞게 말했어요', tag: RIGHT_AS_WRONG }, { text: 'x가 2배가 되면 y는 2만큼 작아져요', tag: TAGS.stepAsInv }, { text: '이 식에서는 x가 2배가 될 수 없어요', tag: OFF }],
        steps: [`x = 2 → y = ${a} ÷ 2 = ${a / 2}`, `x = 4 → y = ${a} ÷ 4 = ${a / 4} — 2분의 1배`],
        whyAny: '반비례는 x가 2배가 되면 y는 2분의 1배가 돼요. x × y가 늘 같아요.',
        probe: { ask: 'times', a },
      });
    },
  },

  {
    id: 'crd.igraph', grade: 7, name: '반비례 관계의 그래프', needs: ['crd.inv'],
    idea: 'y = a/x (a ≠ 0)의 그래프는 좌표축에 한없이 가까워지는 **한 쌍의 매끄러운 곡선**이에요. a > 0이면 제1사분면과 제3사분면에, a < 0이면 제2사분면과 제4사분면에 있어요. x = 0일 때는 a를 0으로 나눌 수 없어서 원점을 지나지 않고, 좌표축과도 만나지 않아요. 그래프 위의 한 점 (p, q)를 알면 a = p × q로 구해요.',
    rule: '한 쌍의 곡선 — a > 0 제1·3사분면, a < 0 제2·4사분면, 원점·축과 안 만남, a = x × y.',
    slip: 'a의 부호로 사분면을, 그래프 위의 점으로 a = x × y를 봐요.',
    calc(r, c) {
      const fams = [];
      // 그래프 → a
      const g2a = (sx, sy) => { const [p, q] = draw(() => [sx * int(r, 2, 6), sy * int(r, 2, 6)], ([p1, q1]) => Math.abs(p1) !== Math.abs(q1) && allDiff(p1 * q1, -(p1 * q1), p1 + q1, q1 / p1)); const a = p * q; return { t: `다음은 y = a/x의 그래프예요. 점 P가 그래프 위에 있을 때, a의 값은 얼마일까요?\n\n${PL(BOX6, `inv=${num(a)}`, pt('P', p, q))}`, ans: num(a), wr: [{ text: fr(q, p), tag: TAGS.propInstead }, sx * sy < 0 ? { text: num(-a), tag: TAGS.signDrop } : { text: num(p + q), tag: TAGS.addForMul }], steps: [`그래프 위의 점 P의 좌표는 ${co(p, q)}`, `a = x × y = ${num(p)} × ${q < 0 ? `(${num(q)})` : num(q)} = ${num(a)}`], why: { [TAGS.propInstead]: 'y ÷ x는 정비례의 a — 반비례는 a = x × y예요.', [TAGS.signDrop]: `곡선이 제2사분면과 제4사분면에 있어요 — a는 음수예요.`, [TAGS.addForMul]: 'a = x × y — 더하지 않고 곱해요.' }, probe: { ask: 'g2a' } }; };
      fams.push(famOf([g2a(1, 1), g2a(-1, 1), g2a(1, -1)]));
      // 그래프 위의 점의 x좌표
      const xOn = (sa) => { const [a, q] = draw(() => [sa * pick(r, [6, 8, 12, 18, 24]), int(r, 2, 6)], ([a1, q1]) => a1 % q1 === 0 && Math.abs(a1 / q1) >= 2 && allDiff(a1 / q1, a1 * q1, q1 / a1)); return { t: `y = ${num(a)}/x의 그래프 위에 점 A가 있어요. 점 A의 y좌표가 ${q}일 때, x좌표는 얼마일까요?`, ans: num(a / q), wr: [{ text: num(a * q), tag: TAGS.mulForDiv }, { text: fr(q, a), tag: TAGS.flipInv }], steps: [`x × y = ${num(a)} 이고 y = ${q}`, `x = ${num(a)} ÷ ${q} = ${num(a / q)}`], why: { [TAGS.mulForDiv]: `x × ${q} = ${num(a)} — x는 ${num(a)}를 ${q}로 나눠 구해요.`, [TAGS.flipInv]: `${num(a)}를 ${q}로 나눠요 — 순서가 거꾸로예요.` }, probe: { ask: 'xon' } }; };
      fams.push(famOf([xOn(1), xOn(-1)]));
      // 그래프의 성질
      fams.push(famOf([
        (() => { const k = int(r, 2, 24); return { t: `y = −${k}/x의 그래프에 대한 설명으로 옳은 것은 어느 것일까요?`, text: true, ans: '제2사분면과 제4사분면을 지나는 곡선이에요', wr: [{ text: '제1사분면과 제3사분면을 지나는 곡선이에요', tag: TAGS.aSign }, { text: '원점을 지나는 곡선이에요', tag: TAGS.originInv }, { text: 'x축과 만나는 곡선이에요', tag: TAGS.axisMeet }], steps: ['y = a/x 꼴 — 좌표축에 가까워지는 한 쌍의 곡선', `a = −${k} < 0 — 제2사분면과 제4사분면`], why: { [TAGS.aSign]: 'a < 0이면 제2사분면과 제4사분면이에요.', [TAGS.originInv]: 'x = 0이면 나눌 수 없어요 — 원점을 지나지 않아요.', [TAGS.axisMeet]: `y = 0이 되는 x가 없어요 — x축과 만나지 않아요.` }, probe: { ask: 'prop-' } }; })(),
        (() => { const k = int(r, 2, 24); return { t: `y = ${k}/x의 그래프에 대한 설명으로 옳은 것은 어느 것일까요?`, text: true, ans: '제1사분면과 제3사분면을 지나는 곡선이에요', wr: [{ text: '제2사분면과 제4사분면을 지나는 곡선이에요', tag: TAGS.aSign }, { text: '원점을 지나는 곡선이에요', tag: TAGS.originInv }, { text: 'y축과 만나는 곡선이에요', tag: TAGS.axisMeet }], steps: ['y = a/x 꼴 — 좌표축에 가까워지는 한 쌍의 곡선', `a = ${k} > 0 — 제1사분면과 제3사분면`], why: { [TAGS.aSign]: 'a > 0이면 제1사분면과 제3사분면이에요.', [TAGS.originInv]: 'x = 0이면 나눌 수 없어요 — 원점을 지나지 않아요.', [TAGS.axisMeet]: 'x = 0일 수 없어요 — y축과 만나지 않아요.' }, probe: { ask: 'prop+' } }; })(),
      ]));
      return askFam(r, c, this, fams);
    },
    misread(r, c) {
      if (branchOf(r, c, ['origin', 'quad']) === 'origin') {
        const a = int(r, 2, 24);
        return misAsk(r, c, this, 'origin', {
          q: `식: y = ${a}/x\n\n${showWork(`y = ${a}/x의 그래프는 원점을 지나요`)}`,
          ok: `x = 0일 때는 ${a}를 0으로 나눌 수 없어요 — 원점을 지나지 않아요`,
          wr: [{ text: '맞게 말했어요', tag: RIGHT_AS_WRONG }, { text: 'x = 0일 때 y = 0이라서 원점을 지나요', tag: TAGS.originInv }, { text: '반비례 관계는 그래프로 나타낼 수 없어요', tag: OFF }],
          steps: [`x = 0이면 ${a} ÷ 0 — 계산할 수 없어요`, '원점도, y축 위의 점도 지나지 않아요'],
          whyAny: '0으로는 나눌 수 없어요. 반비례 그래프는 원점을 지나지 않아요.',
          probe: { ask: 'origin', a },
        });
      }
      const k = int(r, 2, 24);
      return misAsk(r, c, this, 'quad', {
        q: `식: y = −${k}/x\n\n${showWork(`y = −${k}/x의 그래프는 제1사분면과 제3사분면에 있어요`)}`,
        ok: `a = −${k} < 0 — 제2사분면과 제4사분면에 있어요`,
        wr: [{ text: '맞게 말했어요', tag: RIGHT_AS_WRONG }, { text: '제2사분면에만 있어요', tag: TAGS.oneBranch }, { text: '−가 있는 식은 그래프를 그릴 수 없어요', tag: OFF }],
        steps: [`x = 1이면 y = −${k} — 제4사분면`, `x = −1이면 y = ${k} — 제2사분면`],
        whyAny: 'a < 0이면 x와 y의 부호가 달라요 — 제2사분면과 제4사분면이에요.',
        probe: { ask: 'quad', k },
      });
    },
  },

  {
    id: 'crd.apply', grade: 7, name: '⭐ 정비례와 반비례의 활용', needs: ['crd.igraph'],
    idea: '활용 문제는 ① 두 변수 x, y를 정하고 ② 한쪽이 2배가 될 때 다른 쪽도 2배가 되는지(정비례, y = ax), 2분의 1배가 되는지(반비례, y = a/x) 따져 식을 세우고 ③ 주어진 값을 넣어 구해요. 일정한 빠르기로 간 거리와 시간은 정비례, 맞물린 톱니바퀴의 톱니 수와 회전수는 반비례예요.',
    rule: '정비례(y = ax)인지 반비례(y = a/x)인지 먼저 — 식을 세우고 값을 넣어요.',
    slip: '한쪽이 2배가 될 때 다른 쪽이 2배인지, 2분의 1배인지 먼저 봐요.',
    calc(r, c) {
      const fams = [];
      fams.push(famOf([
        (() => { const [v, t] = [pick(r, [50, 60, 70, 80]), int(r, 5, 20)]; const D = v * t; return { t: `{me/은/는} 1분에 ${v} m씩 일정하게 걸어요. x분 동안 걸은 거리를 y m라고 할 때, ${D} m를 걷는 데 몇 분이 걸릴까요?`, ans: num(t), wr: [{ text: num(D * v), tag: TAGS.mulForDiv }, { text: num(D - v), tag: TAGS.subForDiv }], steps: [`y = ${v}x (정비례)`, `${D} = ${v} × x → x = ${D} ÷ ${v} = ${t}`], why: { [TAGS.mulForDiv]: `${D} = ${v} × x — x는 나눠서 구해요.`, [TAGS.subForDiv]: `${v}는 1분에 걷는 거리 — 빼지 않고 나눠요.` }, probe: { ask: 'walk', v, D }, rule: '일정한 빠르기로 간 거리는 시간에 정비례 — y = (1분에 가는 거리) × x.' }; })(),
      ]));
      fams.push(famOf([
        (() => { const [a, t, b] = draw(() => [pick(r, [12, 15, 16, 18, 20, 24, 30]), int(r, 2, 6), pick(r, [10, 12, 15, 16, 18, 20, 24, 30, 36, 40])], ([a1, t1, b1]) => a1 !== b1 && (a1 * t1) % b1 === 0 && (b1 * t1) % a1 === 0 && allDiff((a1 * t1) / b1, (b1 * t1) / a1, t1)); return { t: `맞물려 돌아가는 두 톱니바퀴 A, B가 있어요. 톱니가 ${a}개인 A가 1분에 ${t}바퀴 돌 때, 톱니가 ${b}개인 B는 1분에 몇 바퀴 돌까요?`, ans: num((a * t) / b), wr: [{ text: num((b * t) / a), tag: TAGS.propInstead }, { text: num(t), tag: TAGS.sameTurns }], steps: [`맞물린 톱니 수는 같아요 — ${a} × ${t} = ${a * t}개`, `B의 회전수 = ${a * t} ÷ ${b} = ${(a * t) / b} (톱니 수와 회전수는 반비례)`], why: { [TAGS.propInstead]: '톱니가 많을수록 덜 돌아요 — 반비례예요.', [TAGS.sameTurns]: '두 바퀴가 맞물리는 톱니 수가 같아요 — 회전수는 달라요.' }, probe: { ask: 'gear', a, t, b }, rule: '맞물린 톱니 수가 같아요 — 톱니 수 × 회전수가 일정(반비례).' }; })(),
      ]));
      fams.push(famOf([
        (() => { const [V, x] = draw(() => [pick(r, [120, 180, 240, 300, 360]), pick(r, [10, 12, 15, 20, 24, 30])], ([V1, x1]) => V1 % x1 === 0 && allDiff(V1 / x1, V1 - x1)); return { t: `물 ${V} L를 채우는데, 1분에 x L씩 넣으면 y분이 걸려요. 1분에 ${x} L씩 넣으면 몇 분이 걸릴까요?`, ans: num(V / x), wr: [{ text: num(V * x), tag: TAGS.mulForDiv }, { text: num(V - x), tag: TAGS.subForDiv }], steps: [`x × y = ${V} → y = ${V}/x (반비례)`, `y = ${V} ÷ ${x} = ${V / x}`], why: { [TAGS.mulForDiv]: `x × y = ${V} — y는 ${V}를 ${x}로 나눠 구해요.`, [TAGS.subForDiv]: `${x}는 1분에 넣는 양 — 빼지 않고 나눠요.` }, probe: { ask: 'tank', V, x }, rule: '전체 양이 일정하면 1분에 넣는 양과 걸리는 시간은 반비례 — y = (전체)/x.' }; })(),
      ]));
      fams.push(famOf([
        (() => { const [g1, c1, g2] = draw(() => [pick(r, [10, 20, 30, 40]), int(r, 2, 8), pick(r, [20, 30, 50, 60, 80])], ([a1, b1, d1]) => a1 !== d1 && (b1 * d1) % a1 === 0 && allDiff((b1 * d1) / a1, b1 + d1 - a1, (b1 * a1) / d1)); return { t: `용수철에 추를 매달면 늘어나는 길이는 추의 무게에 정비례해요. 무게가 ${g1} g인 추를 매달았더니 ${c1} cm 늘어났어요. 무게가 ${g2} g인 추를 매달면 몇 cm 늘어날까요?`, ans: num((c1 * g2) / g1), wr: [{ text: num(c1 + g2 - g1), tag: TAGS.addDiff }, { text: fr(c1 * g1, g2), tag: TAGS.propInstead }], steps: [`y = ax에서 a = ${c1} ÷ ${g1}`, `y = ${c1} ÷ ${g1} × ${g2} = ${(c1 * g2) / g1}`], why: { [TAGS.addDiff]: '정비례는 늘어난 무게만큼 더하는 것이 아니라 같은 배수로 늘어요.', [TAGS.propInstead]: '무게가 늘면 늘어나는 길이도 늘어요 — 정비례예요.' }, probe: { ask: 'spring', g1, c1, g2 }, rule: '정비례는 한쪽이 몇 배가 되면 다른 쪽도 그만큼 — 차가 아니라 배수.' }; })(),
      ]));
      fams.push(famOf([
        (() => { const [S, w] = draw(() => [pick(r, [24, 36, 48, 60, 72]), int(r, 2, 12)], ([S1, w1]) => S1 % w1 === 0 && S1 / w1 !== w1 && allDiff(S1 / w1, S1 - w1)); return { t: `넓이가 ${S} cm²인 직사각형의 가로를 x cm, 세로를 y cm라고 해요. 가로가 ${w} cm일 때 세로는 몇 cm일까요?`, ans: num(S / w), wr: [{ text: num(S - w), tag: TAGS.subForDiv }, { text: num(S * w), tag: TAGS.mulForDiv }], steps: [`x × y = ${S} → y = ${S}/x (반비례)`, `y = ${S} ÷ ${w} = ${S / w}`], why: { [TAGS.subForDiv]: '넓이는 가로 × 세로 — 빼지 않고 나눠요.', [TAGS.mulForDiv]: `가로 × 세로 = ${S} — 세로는 ${S}를 ${w}로 나눠 구해요.` }, probe: { ask: 'rect', S, w }, rule: '넓이가 일정하면 가로와 세로는 반비례 — y = (넓이)/x.' }; })(),
      ]));
      return askFam(r, c, this, fams);
    },
    misread(r, c) {
      if (branchOf(r, c, ['walk', 'gear']) === 'walk') {
        const v = pick(r, [50, 60, 70, 80]);
        return misAsk(r, c, this, 'walk', {
          q: `{me/은/는} 1분에 ${v} m씩 일정하게 걸어요.\n\n${showWork('걷는 시간이 2배가 되면 걸은 거리는 2분의 1배가 돼요')}`,
          ok: `y = ${v}x — 정비례라서 시간이 2배가 되면 거리도 2배가 돼요`,
          wr: [{ text: '맞게 말했어요', tag: RIGHT_AS_WRONG }, { text: '걸은 거리는 2만큼 늘어나요', tag: TAGS.stepAsAdd }, { text: '걷는 시간으로는 거리를 알 수 없어요', tag: OFF }],
          steps: [`1분 → ${v} m, 2분 → ${2 * v} m`, '시간이 2배 → 거리도 2배 (정비례)'],
          whyAny: '일정한 빠르기로 걸으면 거리는 시간에 정비례해요. 반비례가 아니에요.',
          probe: { ask: 'walk', v },
        });
      }
      const [a, b] = draw(() => [pick(r, [12, 16, 20, 24]), pick(r, [30, 36, 40, 48])], ([a1, b1]) => b1 > a1);
      return misAsk(r, c, this, 'gear', {
        q: `톱니가 ${a}개인 A와 톱니가 ${b}개인 B가 맞물려 돌아가요.\n\n${showWork('톱니가 더 많은 B가 A보다 더 많이 돌아요')}`,
        ok: '맞물린 톱니 수가 같아서 톱니 수 × 회전수가 같아요 — 톱니가 많은 B가 덜 돌아요',
        wr: [{ text: '맞게 말했어요', tag: RIGHT_AS_WRONG }, { text: '두 바퀴는 1분에 같은 수만큼 돌아요', tag: TAGS.sameTurns }, { text: '톱니 수로는 회전수를 알 수 없어요', tag: OFF }],
        steps: [`A가 한 바퀴 돌면 톱니 ${a}개가 지나가요`, `B는 톱니 ${b}개가 지나가야 한 바퀴 — A보다 덜 돌아요`],
        whyAny: '톱니 수와 회전수는 반비례예요. 톱니가 많을수록 덜 돌아요.',
        probe: { ask: 'gear', a, b },
      });
    },
  },
];

export function conceptById(id) {
  return COORD.find((c) => c.id === id) || null;
}

// ───────────────────── 문항 만들기 (mathequ와 같은 모양) ─────────────────────

/**
 * 개념 하나의 문항 한 개. `probe` = 테스트가 쓰는 재료 (화면은 쓰지 않는다).
 * 점 고르기 문항은 `draw`(✍️ 점 찍기 판 — 3단계 화면이 쓴다)를 그대로 넘긴다
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
const SLIP = '한 번 더 천천히 — x좌표·y좌표의 순서와 부호를 봐요.';

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
  return diagnosticOf(COORD, makeQuestion, seed, n, opts);
}
export function placeFrom(answers) {
  return placeFromOf(COORD, answers);
}
export function ladder(doneIds) {
  return ladderOf(COORD, doneIds);
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
 * coach/math/coord.json 형식 검사 — mathequ.checkContent와 같은 규칙
 * @returns {string[]}
 */
export function checkContent(content) {
  const bad = [];
  for (const c of COORD) {
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

