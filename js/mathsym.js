// 🪞 수학 — M 합동과 대칭 줄기 (초5-2 3단원 「합동과 대칭」):
// 개념 사다리 + 문제 생성기 + 내용 형식 검사. 순수 함수만 — 화면 없음 (node 테스트에서 그대로 돈다).
//
// 왜 이 줄기인가 (2026-10-01, 아버님 "합동과 대칭 → 원의 넓이 → 직육면체·부피·겉넓이 이렇게 가자"):
// 5-2에서 L(수의 범위와 어림) 다음으로 처음 비는 단원. J 줄기의 모눈 도형을 그대로 쓰고, 그리기(대응점 찍기)가 손에 잡힌다.
//
// 오답은 아이가 실제로 하는 틀린 생각 흉내다:
//   · 돌리거나 뒤집어 놓으면 합동이 아니다 · 모양만 같으면(크기가 달라도) 합동 · 넓이만 같으면 합동
//   · 대응점을 **이름 순서대로**(ㄱ↔ㄹ, ㄴ↔ㅁ) 또는 **같은 자리**로 짝지음 — 돌려 놓은 그림에서
//   · 세 각만 같아도 합동인 삼각형 · 두 변과 그 사이에 있지 않은 각으로도 하나로 정해진다
//   · 직사각형의 대각선을 대칭축으로 · 평행사변형을 선대칭도형으로 · 대칭축 개수를 덜/두 번 셈
//   · 대응점까지의 거리를 반으로 안 나눔/두 배로 안 함 · 완성할 때 **밀어서** 옮김 · 축까지 거리를 두 배로
//   · 선대칭이면 점대칭이다 · 점대칭을 선대칭처럼 **뒤집어** 그림
//
// 그림은 **문제 글 속 지시문** `[sym …]`(mathdraw.parseSym) — 꼭짓점이 모눈점이라 대칭·합동을 칸으로 센다.
// 모눈 도형 하나(대칭축 개수)는 J의 `[gpoly …]`를 그대로 쓴다.
// ★ 테스트가 지시문의 좌표를 **따로 읽어** 대칭(뒤집기·180° 돌리기)·합동(변 길이·꺾이는 방향)을 다시 계산하고 답을 정한다.

import { VNAMES, figureSvg } from './mathdraw.js';
import { rng, shuffle, fill, castOf, worldPick, ask, solve, int, pick, pickFamily, humanQuestion, checkHuman, diagnosticOf, placeFromOf, ladderOf, josa } from './mathgen.js';
import { gradeLabel } from './mathmix.js';

export { gradeLabel };

// ───────────────────── 글자 ─────────────────────

/** 보기 글자 → 값 (겹침 검사용). "6 cm"·"4개"·"70°" → 수, 이름·문장 보기는 null */
export function valueOf(text) {
  const s = String(text == null ? '' : text).trim();
  const m = /^(\d+(?:\.\d+)?)(?: ?(?:cm|개|°))?$/.exec(s);
  return m ? Number(m[1]) : null;
}
const sameValue = (a, b) => a !== null && b !== null && Math.abs(a - b) < 1e-9;

// 조사 — ㄱ·ㄴ 같은 자모는 이름(기역·니은·디귿·리을·미음·비읍·시옷·이응)이 모두 받침으로 끝난다
const BAT = new Set(['0', '1', '3', '6', '7', '8']);
const lastDigit = (t) => String(t).replace(/\D+$/, '').slice(-1);
/** 수 글자 + 조사 */
const jn = (t, withB, without) => { const s = String(t); return s + (BAT.has(lastDigit(s)) ? withB : without); };
/** 자모 이름(점 ㄴ·변 ㄱㄴ) + 조사 — 늘 받침 쪽 */
const jm = (t, withB) => `${t}${withB}`;

// ───────────────────── 보기 ─────────────────────

function nearOf(answer, k, unit) {
  const v = valueOf(answer); const st = [1, -1, 2, -2, 3, -3][k % 6];
  if (v === null || !Number.isInteger(v) || v + st < 0) return '';
  return `${v + st}${unit}`;
}
/** 수 보기 4개 — 정답 + 오개념 오답 (unit: ' cm'·'개'·'°') */
function choices(r, answer, wrongs, unit = '') {
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
    const alt = nearOf(answer, k, unit);
    if (alt && !dup(alt)) add(alt, '계산 실수');
  }
  return shuffle(r, list);
}
/** 이름·문장 보기 — 근처 수로 채우지 않는다. same(a, b)가 참이면 같은 보기로 친다 (변 ㄱㄴ = 변 ㄴㄱ) */
function textChoices(r, ok, wrongs, same = (a, b) => a === b) {
  const list = [{ text: ok, ok: true }];
  for (const w of wrongs) {
    if (!w || !w.text || list.some((x) => same(x.text, w.text)) || list.length >= 4) continue;
    list.push({ text: w.text, ok: false, tag: w.tag });
  }
  return shuffle(r, list);
}
/** "변 ㄱㄴ" = "변 ㄴㄱ" */
const sameSide = (a, b) => a === b || (/^변 ..$/.test(a) && /^변 ..$/.test(b) && a[2] === b[3] && a[3] === b[2]);

/** ② 갈래 고르기 — 🔁 쌍둥이·🤔 오답 노트가 요청한 갈래를 먼저 */
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

/** 이 줄기의 오개념 이름표 (📊·🤔 노트·결과 카드에 그대로 뜬다 — 아직 안 배운 말을 쓰지 않는다) */
export const TAGS = {
  turnNot: '돌리거나 뒤집으면 합동이 아니라고 봄',
  scaleSame: '모양만 같으면 합동이라고 봄',
  areaSame: '넓이만 같으면 합동이라고 봄',
  lookWrong: '두 도형을 잘못 봄',
  nameOrder: '이름 순서대로 짝지음',            // ㄱ↔ㄹ, ㄴ↔ㅁ … (그림을 안 보고)
  posSame: '같은 자리끼리 짝지음',              // 돌려 놓은 그림에서 위치가 같은 점·변
  pairWrong: '짝을 잘못 지음',
  sumOne: '한 각만 뺌',                          // 180 − 한 각
  threeAngles: '세 각만 같아도 된다고 봄',
  notIncluded: '사이에 있지 않은 각도 된다고 봄',
  twoOnly: '두 변만으로 된다고 봄',
  diagAxis: '대각선을 대칭축으로 봄',
  paraLine: '평행사변형을 선대칭으로 봄',
  missDiag: '대각선 쪽 대칭축을 빠뜨림',
  likeSquare: '정사각형처럼 셈',
  likeRegular: '정삼각형처럼 셈',
  likeRect: '직사각형처럼 셈',
  halfCount: '대칭축을 반만 셈',
  doubleCount: '대칭축을 두 번 셈',
  halfOnly: '반만 셈',                           // 축(중심)까지 거리를 대응점까지 거리로
  noHalf: '반으로 안 나눔',                      // 대응점까지 거리를 축(중심)까지 거리로
  halfPerim: '한쪽 둘레만 셈',
  notRight: '직각으로 만난다는 것을 모름',
  slide: '밀어서 옮김',                          // 뒤집지(돌리지) 않고 옆으로 그대로
  doubleDist: '거리를 두 배로 옮김',
  flipBoth: '위아래까지 뒤집음',                 // 세로 대칭축 — 좌우로 뒤집고 위아래도
  flipSide: '양옆까지 뒤집음',                   // 가로 대칭축 — 위아래로 뒤집고 양옆도 (헤드리스: 가로 축 문제에 "위아래까지"가 떴다)
  lineToPoint: '선대칭이면 점대칭이라고 봄',
  rot90: '90°만 돌림',
  asLine: '돌리지 않고 뒤집음',                  // 점대칭을 선대칭처럼
  sideMid: '변의 가운데를 중심으로 봄',
  tooFew: '모자란 줄 모름',                        // 한 변과 한 각만으로 된다고 봄
  rot360: '한 바퀴(360°) 돌려 봄',
};

// ───────────────────── 모눈 도형 (좌표는 모눈점 — 정수) ─────────────────────

const P = (x, y) => ({ x, y });
const d2 = (a, b) => (a.x - b.x) ** 2 + (a.y - b.y) ** 2;
const cross = (o, a, b) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
const isInt = (v) => Math.abs(v - Math.round(v)) < 1e-9;
const sideLen = (a, b) => Math.sqrt(d2(a, b));
/** 가장 짧은 변이 2칸 이상인가 — 1칸짜리 변은 두 꼭짓점 이름이 붙어 어느 점인지 헷갈린다 */
const longSides = (poly, open = false) => poly.every((p, i) => (open && i === poly.length - 1) || d2(p, poly[(i + 1) % poly.length]) >= 4);
/** 이웃한 세 꼭짓점이 한 줄이면 꼭짓점이 아니다 */
const noCollinear = (poly) => poly.every((p, i) => cross(poly[(i + poly.length - 1) % poly.length], p, poly[(i + 1) % poly.length]) !== 0);
const reflX = (p, a) => P(2 * a - p.x, p.y);
const reflY = (p, b) => P(p.x, 2 * b - p.y);
const rot180 = (p, c) => P(2 * c.x - p.x, 2 * c.y - p.y);

/** 모눈의 여덟 가지 돌리기·뒤집기 (0 = 그대로) */
const ISO = [
  (p) => P(p.x, p.y), (p) => P(-p.y, p.x), (p) => P(-p.x, -p.y), (p) => P(p.y, -p.x),
  (p) => P(-p.x, p.y), (p) => P(p.x, -p.y), (p) => P(p.y, p.x), (p) => P(-p.y, -p.x),
];
/** 도형의 모양 글(변 길이² · 꺾이는 방향) — 순서를 돌리거나 뒤집어 같은 글이 되면 합동 */
function shapeSeq(poly) {
  const n = poly.length;
  return poly.map((p, i) => { const q = poly[(i + 1) % n]; const s = poly[(i + 2) % n]; const cr = cross(p, q, s); return `${d2(p, q)}:${(q.x - p.x) * (s.x - q.x) + (q.y - p.y) * (s.y - q.y)}:${Math.abs(cr)}`; });
}
/** 도형을 자기 자신에게 겹치는 방법의 수 (1이면 대칭이 없어 대응이 하나로 정해진다) */
function selfMaps(poly) {
  const n = poly.length; const seq = shapeSeq(poly).join('|'); let k = 0;
  for (const rev of [false, true]) {
    const pp = rev ? [...poly].reverse() : poly;
    for (let s = 0; s < n; s++) { const rot = [...pp.slice(s), ...pp.slice(0, s)]; if (shapeSeq(rot).join('|') === seq) k++; }
  }
  return k;
}
const shift = (poly, dx, dy) => poly.map((p) => P(p.x + dx, p.y + dy));
const bbox = (poly) => ({ x0: Math.min(...poly.map((p) => p.x)), x1: Math.max(...poly.map((p) => p.x)), y0: Math.min(...poly.map((p) => p.y)), y1: Math.max(...poly.map((p) => p.y)) });
/** 원점 쪽으로 붙이기 */
const toOrigin = (poly) => { const b = bbox(poly); return shift(poly, -b.x0, -b.y0); };
/** 신발끈 넓이 ×2 */
const area2 = (poly) => Math.abs(poly.reduce((a, p, i) => { const q = poly[(i + 1) % poly.length]; return a + p.x * q.y - q.x * p.y; }, 0));

/** 대칭이 없는 삼각형·사각형 (모눈점, 가로 ≤ 4·세로 ≤ 4) — 대응이 하나로 정해진다 */
function asymPoly(r, n) {
  for (let t = 0; t < 300; t++) {
    const poly = [];
    for (let i = 0; i < n; i++) poly.push(P(int(r, 0, 4), int(r, 0, 4)));
    if (new Set(poly.map((p) => `${p.x},${p.y}`)).size !== n || !noCollinear(poly) || !longSides(poly)) continue;
    // 꼬이지 않은 볼록한 도형만 (사각형은 네 꺾임이 모두 같은 쪽)
    const turns = poly.map((p, i) => Math.sign(cross(p, poly[(i + 1) % n], poly[(i + 2) % n])));
    if (!turns.every((s) => s === turns[0])) continue;
    if (area2(poly) < 6 || selfMaps(poly) !== 1) continue;
    const b = bbox(poly);
    if (b.x1 - b.x0 < 2 || b.y1 - b.y0 < 2) continue;
    return toOrigin(poly);
  }
  // 못 찾으면 꼭짓점 수에 맞는 대칭 없는 도형 (삼각형만 돌려주면 사각형 문항의 이름이 모자랐다)
  return n === 3 ? [P(0, 0), P(4, 0), P(1, 3)] : [P(0, 0), P(4, 0), P(4, 3), P(1, 2)];
}
/** 변 길이가 모두 정수인 대칭 없는 도형 — 3·4·5 직각삼각형 · 빗변 5 cm 직각사다리꼴 */
const INT_SHAPES = [
  [P(0, 0), P(4, 0), P(4, 3)], [P(0, 0), P(3, 0), P(3, 4)],
  [P(0, 0), P(6, 0), P(6, 4), P(3, 4)], [P(0, 0), P(6, 0), P(6, 3), P(4, 3)], [P(0, 0), P(8, 0), P(8, 3), P(4, 3)],
];

/**
 * 합동인 두 도형 — A는 왼쪽, B는 A를 돌리거나 뒤집어 오른쪽에. 이름은 A = ㄱㄴㄷ(ㄹ), B = 다음 이름부터.
 * k: B의 이름을 몇 칸 돌려 붙였나 — 대응 ㄱ ↔ B 이름[k] (이름 순서대로 짝지으면 틀리게 0이 아닌 수)
 */
function congruentPair(r, n, o = {}) {
  for (let t = 0; t < 200; t++) {
    const A0 = o.intSides ? toOrigin(pick(r, INT_SHAPES.filter((s) => s.length === n)).map(pick(r, ISO))) : asymPoly(r, n);
    const T = o.same ? ISO[0] : pick(r, ISO.slice(1));
    let B0 = toOrigin(A0.map(T));
    if (o.scale) B0 = B0.map((p) => P(p.x * 2, p.y * 2));
    const bA = bbox(A0); const bB = bbox(B0);
    const ay = int(r, 0, Math.max(0, 5 - bA.y1)); const gap = int(r, 3, 4);
    const A = shift(A0, 0, ay);
    const by = int(r, 0, Math.max(0, 6 - bB.y1));
    const B = shift(B0, bA.x1 + gap, by);
    if (bbox(B).x1 > 14 || bbox(B).y1 > 14) continue;
    const k = o.k !== undefined ? o.k : int(r, 1, n - 1);
    return { A, B, k, n };
  }
  return null;
}
const NAMES_A = (n) => VNAMES.slice(0, n);
const NAMES_B = (n) => VNAMES.slice(n, 2 * n);
/** B의 이름: B[i](= A[i]의 짝)에 B 이름[(i + k) % n] — 지시문은 이름 순서대로 적는다(꼭짓점 순서와 같다) */
function pairDirective(pr, o = {}) {
  const { A, B, k, n } = pr;
  const na = NAMES_A(n); const nb = NAMES_B(n);
  const bAt = (j) => B[(j - k + n) % n]; // 이름 nb[j]가 붙은 점
  const a = A.map((p, i) => `${na[i]}:${p.x},${p.y}`).join(' ');
  const b = nb.map((nm, j) => { const p = bAt(j); return `${nm}:${p.x},${p.y}`; }).join(' ');
  return `[sym ${o.len ? 'len ' : ''}${a} | ${b}]`;
}
/** A의 i번째 꼭짓점의 대응점 이름 */
const corrName = (pr, i) => NAMES_B(pr.n)[(i + pr.k) % pr.n];
/** 그림만 보고 "같은 자리"로 짝지은 점 — A의 점을 B의 상자 쪽으로 옮겨 가장 가까운 B 꼭짓점 */
function posSameName(pr, i) {
  const { A, B, k, n } = pr;
  const bA = bbox(A); const bB = bbox(B);
  const q = P(A[i].x - bA.x0 + bB.x0, A[i].y - bA.y0 + bB.y0);
  let best = 0;
  B.forEach((p, j) => { if (d2(p, q) < d2(B[best], q)) best = j; });
  // 가장 가까운 점이 둘이면 "같은 자리"를 하나로 못 정한다 — 이 오답은 빼고 다른 오답을 쓴다
  if (B.some((p, j) => j !== best && d2(p, q) === d2(B[best], q))) return null;
  return NAMES_B(n)[(best + k) % n];
}

// ───────────────────── 선대칭·점대칭 도형 ─────────────────────

/**
 * 세로 대칭축(x = a) 선대칭 도형 — 위 축 위 점 → 왼쪽으로 m개 → 아래 축 위 점 → 오른쪽(거울)으로. 꼭짓점 2 + 2m개
 * horiz면 x·y를 바꿔 가로 대칭축(y = a)으로
 */
function lineSymPoly(r, m, horiz = false) {
  for (let t = 0; t < 300; t++) {
    const a = int(r, 5, 7);
    const yT = int(r, m + 2, 7); const yB = int(r, 0, yT - m - 1);
    const ys = [];
    while (ys.length < m) { const y = int(r, yB + 1, yT - 1); if (!ys.includes(y)) ys.push(y); }
    ys.sort((u, v) => v - u);
    const left = ys.map((y) => P(a - int(r, 1, 4), y));
    const half = [P(a, yT), ...left, P(a, yB)];
    const poly = [...half, ...left.slice().reverse().map((p) => reflX(p, a))];
    if (!noCollinear(poly) || !longSides(poly)) continue;
    const out = horiz ? poly.map((p) => P(p.y, p.x)) : poly;
    return { poly: out, axis: horiz ? { y: a } : { x: a }, half: horiz ? half.map((p) => P(p.y, p.x)) : half };
  }
  return null;
}
const axisRefl = (p, axis) => (axis.x !== undefined ? reflX(p, axis.x) : reflY(p, axis.y));
const axisDist = (p, axis) => (axis.x !== undefined ? Math.abs(p.x - axis.x) : Math.abs(p.y - axis.y));

/**
 * 점대칭 도형 — 대칭의 중심 c(모눈점) 둘레로 반쪽 m개를 각도 순으로 뽑고, 180° 돌린 반쪽을 이어 붙인다. 꼭짓점 2m개
 */
function pointSymPoly(r, m) {
  for (let t = 0; t < 400; t++) {
    const c = P(int(r, 4, 6), int(r, 4, 5));
    const vs = [];
    for (let u = 0; u < 60 && vs.length < m; u++) {
      const v = P(int(r, -4, 4), int(r, 0, 4));
      if ((v.y === 0 && v.x <= 0) || v.x * v.x + v.y * v.y < 4) continue; // 반쪽은 중심의 위쪽 반(0°~180°)에서, 중심에 너무 가깝지 않게
      if (vs.some((w) => w.x * v.y === w.y * v.x)) continue; // 같은 방향 둘이면 꼭짓점이 겹치거나 한 줄
      vs.push(v);
    }
    if (vs.length !== m) continue;
    const half = vs.sort((u, w) => Math.atan2(u.y, u.x) - Math.atan2(w.y, w.x)).map((v) => P(c.x + v.x, c.y + v.y));
    const poly = [...half, ...half.map((p) => rot180(p, c))];
    if (poly.some((p) => p.x < 0 || p.y < 0 || p.x > 12 || p.y > 10) || !noCollinear(poly) || !longSides(poly)) continue;
    // 볼록한 도형만 — 별처럼 들쭉날쭉하면 초5가 180° 돌린 모양을 떠올리기 어렵다 (평행사변형·육각형 모양)
    const turns = poly.map((p, i) => Math.sign(cross(p, poly[(i + 1) % poly.length], poly[(i + 2) % poly.length])));
    if (!turns.every((s) => s === turns[0])) continue;
    return { poly, c, half };
  }
  return null;
}

const named = (poly) => poly.map((p, i) => `${VNAMES[i]}:${p.x},${p.y}`).join(' ');
const axisTok = (axis) => (axis.x !== undefined ? `x=${axis.x}` : `y=${axis.y}`);
const centerTok = (c) => `c=${c.x},${c.y}`;
const range0 = (m) => Array.from({ length: m }, (_, i) => i);
const range1 = (m) => Array.from({ length: m }, (_, i) => i + 1);
const LABELS = ['㉠', '㉡', '㉢', '㉣'];
const onGrid = (p) => p.x >= 0 && p.y >= 0 && p.x <= 14 && p.y <= 14;
const same = (a, b) => a.x === b.x && a.y === b.y;

// ── 합동인 삼각형 그리기 (M3) ──
function threeAngles(r) {
  for (let t = 0; t < 100; t++) {
    const a = int(r, 3, 8) * 10; const b = int(r, 3, 8) * 10; const cc = 180 - a - b;
    if (cc >= 30 && a !== b && a !== cc && b !== cc) return [a, b, cc];
  }
  return [40, 60, 80];
}
/** 보기 글 여섯 가지 — 정해지는 셋(세 변·두 변과 사이 각·한 변과 양 끝 각) + 안 되는 셋(세 각·사이에 있지 않은 각·두 변만) */
function triItems(r) {
  let a = 0; let b = 0; let cc = 0;
  for (let t = 0; t < 100; t++) {
    a = int(r, 3, 9); b = int(r, 3, 9); cc = int(r, 3, 9);
    if (new Set([a, b, cc]).size === 3 && a + b > cc && b + cc > a && a + cc > b) break;
  }
  const two = () => { const x = int(r, 3, 9); let y = int(r, 3, 9); while (y === x) y = int(r, 3, 9); return [x, y]; };
  const [s1, s2] = two(); const [u1, u2] = two(); const [w1, w2] = two();
  const g = int(r, 3, 12) * 10; const gb = int(r, 3, 8) * 10;
  const s3 = int(r, 3, 9); const p = int(r, 3, 8) * 10; let q = int(r, 3, 8) * 10; while (q === p) q = int(r, 3, 8) * 10;
  const [A1, A2, A3] = threeAngles(r);
  return {
    sss: `세 변의 길이 ${a} cm, ${b} cm, ${cc} cm`,
    sas: `두 변의 길이 ${s1} cm, ${s2} cm와 그 사이에 있는 각 ${g}°`,
    asa: `한 변의 길이 ${s3} cm와 그 양 끝 각 ${p}°, ${q}°`,
    aaa: `세 각의 크기 ${A1}°, ${A2}°, ${A3}°`,
    ssa: `두 변의 길이 ${u1} cm, ${u2} cm와 그 사이에 있지 않은 각 ${gb}°`,
    two: `두 변의 길이 ${w1} cm, ${w2} cm`,
  };
}

// ── 모눈 위 기본 도형 (M4·M7) ──
const SHAPE_KO = { square: '정사각형', rect: '직사각형', rhombus: '마름모', isoTri: '이등변삼각형', para: '평행사변형', isoTrap: '사다리꼴' };
const josaOf = (w, a, b) => josa(w, a, b);
/** 모눈 위 도형 — 정사각형·직사각형(가로 ≠ 세로)·마름모(정사각형 아님)·이등변삼각형·평행사변형(직사각형·마름모 아님)·사다리꼴(양옆 같음) */
function gshape(r, kind) {
  const ox = int(r, 0, 2); const oy = int(r, 0, 2);
  let v;
  if (kind === 'square') { const s = int(r, 2, 5); v = [P(0, 0), P(s, 0), P(s, s), P(0, s)]; }
  else if (kind === 'rect') { let w = int(r, 2, 7); let h = int(r, 2, 5); while (w === h) { w = int(r, 2, 7); h = int(r, 2, 5); } v = [P(0, 0), P(w, 0), P(w, h), P(0, h)]; }
  else if (kind === 'rhombus') { let w = int(r, 2, 4); let h = int(r, 1, 3); while (w === h) { w = int(r, 2, 4); h = int(r, 1, 3); } v = [P(0, h), P(w, 0), P(2 * w, h), P(w, 2 * h)]; }
  else if (kind === 'isoTri') { const w = int(r, 1, 4); const h = int(r, 2, 6); v = [P(0, 0), P(2 * w, 0), P(w, h)]; }
  else if (kind === 'para') { let w; let s; let h; do { w = int(r, 3, 6); s = int(r, 1, 3); h = int(r, 2, 4); } while (w * w === s * s + h * h); v = [P(0, 0), P(w, 0), P(w + s, h), P(s, h)]; }
  else { let w; let s; let h; do { w = int(r, 4, 8); s = int(r, 1, 3); h = int(r, 2, 4); } while (2 * s >= w); v = [P(0, 0), P(w, 0), P(w - s, h), P(s, h)]; }
  return v.map((p) => P(p.x + ox, p.y + oy));
}
/** 대칭축 수와 그 도형에서 나오는 오답 (값, 이름표) */
const AX = {
  square: { n: 4, wr: [[2, TAGS.missDiag], [8, TAGS.doubleCount]] },
  rect: { n: 2, wr: [[4, TAGS.diagAxis], [1, TAGS.halfCount]] },
  rhombus: { n: 2, wr: [[4, TAGS.likeSquare], [1, TAGS.halfCount]] },
  isoTri: { n: 1, wr: [[3, TAGS.likeRegular], [2, TAGS.doubleCount]] },
  para: { n: 0, wr: [[2, TAGS.paraLine], [4, TAGS.diagAxis]] },
  isoTrap: { n: 1, wr: [[2, TAGS.likeRect], [0, TAGS.lookWrong]] },
};
const AX_STEP = {
  square: '가로·세로 가운데를 지나는 선 2개 + 대각선 2개',
  rect: '가로·세로 가운데를 지나는 선 2개 — 대각선은 아니에요',
  rhombus: '두 대각선이 대칭축이에요',
  isoTri: '꼭짓점에서 밑변의 가운데로 내린 선 하나',
  para: '어느 선으로 접어도 완전히 겹치지 않아요',
  isoTrap: '윗변과 아랫변의 가운데를 잇는 선 하나',
};
const AX_WHY = {
  [TAGS.diagAxis]: '대각선으로 접으면 안 겹쳐요 — 정사각형만 대각선도 대칭축이에요.',
  [TAGS.paraLine]: '평행사변형은 어느 선으로 접어도 완전히 겹치지 않아요.',
  [TAGS.missDiag]: '정사각형은 대각선으로 접어도 겹쳐요 — 대각선 2개도 대칭축이에요.',
  [TAGS.likeSquare]: '각이 직각이 아니면 정사각형과 달라요 — 마름모는 두 대각선만 대칭축이에요.',
  [TAGS.likeRegular]: '세 변이 다 같지 않으면 대칭축은 하나예요.',
  [TAGS.likeRect]: '윗변과 아랫변의 길이가 달라 가로 가운데 선으로는 안 겹쳐요.',
  [TAGS.halfCount]: '빠뜨린 대칭축이 있어요 — 꼭짓점을 지나는 선과 변의 가운데를 지나는 선을 모두 세요.',
  [TAGS.doubleCount]: '대칭축 하나는 선 하나예요 — 양 끝을 따로 세지 않아요.',
  [TAGS.lookWrong]: '도형을 그 선으로 접는다고 생각하고 하나씩 세어 봐요.',
};
/** 정다각형 — 변의 수 k, 대칭축 n(= k) */
const REG = {
  정삼각형: { k: 3, n: 3, wr: [[6, TAGS.doubleCount], [1, TAGS.lookWrong]] },
  정오각형: { k: 5, n: 5, wr: [[10, TAGS.doubleCount], [1, TAGS.lookWrong]] },
  정육각형: { k: 6, n: 6, wr: [[3, TAGS.halfCount], [12, TAGS.doubleCount]] },
  정팔각형: { k: 8, n: 8, wr: [[4, TAGS.halfCount], [16, TAGS.doubleCount]] },
};
const POINT_YES = new Set(['para', 'rect', 'rhombus', 'square']);

// ── 선대칭도형 완성하기 (M6) ──
/**
 * 반쪽(축 위 점 → 한쪽 꼭짓점 m개 → 축 위 점) + 묻는 점 i의 후보 넷:
 * R 대응점(정답) · S 밀기(뒤집지 않고 축 쪽으로 그대로) · D 거리 두 배 · F 위아래(양옆)까지 뒤집음
 */
function lineDrawCase(r, m, horiz, i) {
  for (let t = 0; t < 200; t++) {
    const L = lineSymPoly(r, m, horiz);
    if (!L) continue;
    const { axis, half } = L; const p = half[i];
    const R = axisRefl(p, axis);
    let S; let D; let F;
    if (axis.x !== undefined) {
      const far = Math.min(...half.map((q) => q.x));
      S = P(p.x + (axis.x - far), p.y); D = P(3 * axis.x - 2 * p.x, p.y); F = P(R.x, half[0].y + half[half.length - 1].y - p.y);
    } else {
      const far = Math.min(...half.map((q) => q.y));
      S = P(p.x, p.y + (axis.y - far)); D = P(p.x, 3 * axis.y - 2 * p.y); F = P(half[0].x + half[half.length - 1].x - p.x, R.y);
    }
    const pts = [R, S, D, F];
    if (!pts.every(onGrid) || pts.some((a, j) => pts.some((b, k) => j < k && same(a, b))) || pts.some((a) => half.some((h) => same(a, h)))) continue;
    // 대칭축 위의 후보는 빼고 다시 — 묻는 점이 축에서 가장 먼 점이면 "밀기" 자리가 축 위에 떨어져 아이가 헷갈린다 (헤드리스 그림에서 봄)
    if (pts.some((a) => axisDist(a, axis) === 0)) continue;
    const order = shuffle(r, ['R', 'S', 'D', 'F']);
    const label = {}; const cands = [];
    order.forEach((k, j) => { label[k] = LABELS[j]; const q = { R, S, D, F }[k]; cands.push({ k: LABELS[j], x: q.x, y: q.y }); });
    const base = `sym open ${axisTok(axis)} ${half.map((q, j) => `${VNAMES[j]}:${q.x},${q.y}`).join(' ')}`;
    return { base, fig: `[${base} ${cands.map((q) => `${q.k}@${q.x},${q.y}`).join(' ')}]`, R, S, D, F, label, cands, d: axisDist(p, axis), p };
  }
  return null;
}

// ── 대칭의 중심 찾기 (M7) ──
function centerCase(r, m) {
  for (let t = 0; t < 200; t++) {
    const S = pointSymPoly(r, m);
    if (!S) continue;
    const { poly, c } = S; const n = poly.length;
    const free = (q) => onGrid(q) && !poly.some((v) => same(v, q)) && !same(q, c);
    const wr = [];
    const mids = poly.map((p, k) => ({ x: (p.x + poly[(k + 1) % n].x) / 2, y: (p.y + poly[(k + 1) % n].y) / 2 })).filter((q) => Number.isInteger(q.x) && Number.isInteger(q.y) && free(q));
    if (mids.length) wr.push({ q: P(mids[0].x, mids[0].y), tag: TAGS.sideMid });
    const pw = { x: (poly[0].x + poly[m + 1 < n ? m + 1 : 1].x) / 2, y: (poly[0].y + poly[m + 1 < n ? m + 1 : 1].y) / 2 };
    if (Number.isInteger(pw.x) && Number.isInteger(pw.y) && free(pw) && !wr.some((w) => same(w.q, pw))) wr.push({ q: P(pw.x, pw.y), tag: TAGS.pairWrong });
    for (const [dx, dy] of shuffle(r, [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1]])) {
      if (wr.length >= 3) break;
      const q = P(c.x + dx, c.y + dy);
      if (free(q) && !wr.some((w) => same(w.q, q))) wr.push({ q, tag: TAGS.lookWrong });
    }
    if (wr.length < 3) continue;
    const all = shuffle(r, [{ q: c, tag: null }, ...wr.slice(0, 3)]);
    const label = {}; const cands = []; const wrongs = [];
    all.forEach((w, j) => { cands.push({ k: LABELS[j], x: w.q.x, y: w.q.y }); if (w.tag) wrongs.push({ text: LABELS[j], tag: w.tag }); else label.C = LABELS[j]; });
    return { fig: `[sym ${named(poly)} ${cands.map((q) => `${q.k}@${q.x},${q.y}`).join(' ')}]`, label, wrongs, c };
  }
  return null;
}

// ── 점대칭도형 완성하기 (M9) ──
/** 반쪽 꼭짓점 m개 + 대칭의 중심, 묻는 점 i(1 이상)의 후보 넷: R 180° 돌린 자리(정답) · V·H 세로·가로로 뒤집은 자리 · T 밀기 */
function pointDrawCase(r, m, i) {
  for (let t = 0; t < 200; t++) {
    const S = pointSymPoly(r, m);
    if (!S) continue;
    const { half, c } = S; const p = half[i];
    const R = rot180(p, c); const V = reflX(p, c.x); const H = reflY(p, c.y);
    const T = P(p.x + 2 * (c.x - half[0].x), p.y + 2 * (c.y - half[0].y));
    const pts = [R, V, H, T];
    if (!pts.every(onGrid) || pts.some((a, j) => pts.some((b, k) => j < k && same(a, b))) || pts.some((a) => same(a, c) || half.some((h) => same(a, h)))) continue;
    const order = shuffle(r, ['R', 'V', 'H', 'T']);
    const label = {}; const cands = [];
    order.forEach((k, j) => { label[k] = LABELS[j]; const q = { R, V, H, T }[k]; cands.push({ k: LABELS[j], x: q.x, y: q.y }); });
    const base = `sym open ${centerTok(c)} ${half.map((q, j) => `${VNAMES[j]}:${q.x},${q.y}`).join(' ')}`;
    return { base, fig: `[${base} ${cands.map((q) => `${q.k}@${q.x},${q.y}`).join(' ')}]`, R, V, H, T, label, cands, dx: Math.abs(c.x - p.x), dy: Math.abs(c.y - p.y), p };
  }
  return null;
}

// ───────────────────── 가족·틀 (variant) ─────────────────────
// 가족 하나 = 틀 여러 개(묻는 점·변·꼭짓점 수·축 방향마다 하나). 틀마다 그 틀에 맞는 그림을 미리 뽑아 둔다 —
// 🔁 쌍둥이·🤔 노트가 요청한 틀(c.want = tplKey)이 오면 그 틀이 그대로 골라진다.

function famOf(variants) {
  return { variants: variants.filter(Boolean), pools: { pokemon: variants.filter(Boolean).map((x) => x.t) } };
}
function runFamily(r, c, fams) {
  const f = pickFamily(r, c, fams.filter((x) => x.variants.length));
  const t = worldPick(r, c, f.pools);
  return f.variants.find((x) => x.t === t) || f.variants[0];
}
/** 고른 틀로 ① 문항 만들기 — v: { t, ans, wr, steps, why, whyAny, rule, text, unit, same, draw, probe } */
const bare = (t) => String(t).replace(/ ?(cm|개|°)$/, '');
function calcAsk(r, c, concept, v) {
  // 수 답은 보기에 수만 쓴다 — 숫자판(mathpad.textVal)이 "6 cm"·"50°"를 못 읽어 숫자판이 안 떴다. 단위는 문제 글("몇 cm일까요?")에서 읽는다 (L 줄기와 같은 모양)
  const chs = v.text ? textChoices(r, v.ans, v.wr, v.same) : choices(r, bare(v.ans), v.wr.map((w) => ({ ...w, text: bare(w.text) })), '');
  return {
    ...ask(concept.id, 'calc', fill(v.t, c), chs, {
      solve: solve(v.steps.map((s, i) => step(i, s)), { why: v.why || {}, whyAny: v.whyAny || '', rule: v.rule || concept.rule }),
    }),
    ...(v.draw ? { draw: v.draw } : {}),
    probe: v.probe || null,
  };
}

// ───────────────────── 개념 사다리 (M. 합동과 대칭 줄기) ─────────────────────

/** 합동 여부 문항 하나 (M1 ①·②가 같이 쓴다) — kind: 'turn'(합동, 돌리거나 뒤집음) · 'scale'(두 배) · 'area'(넓이만 같음) */
function congrCase(r, kind, n) {
  if (kind === 'area') {
    // 넓이는 같고 모양이 다른 두 직사각형 (2 × 6 · 3 × 4 …)
    const [w1, h1, w2, h2] = pick(r, [[2, 6, 3, 4], [2, 6, 4, 3], [3, 4, 6, 2], [2, 8, 4, 4], [1, 6, 2, 3], [2, 3, 1, 6]]);
    const ay = int(r, 0, 2); const by = int(r, 0, 2);
    const A = [P(0, ay), P(w1, ay), P(w1, ay + h1), P(0, ay + h1)];
    const bx = w1 + int(r, 3, 4);
    const B = [P(bx, by), P(bx + w2, by), P(bx + w2, by + h2), P(bx, by + h2)];
    return { A, B, congr: false, fig: `[sym ${A.map((p) => `${p.x},${p.y}`).join(' ')} | ${B.map((p) => `${p.x},${p.y}`).join(' ')}]`, area: (w1 * h1) };
  }
  const pr = congruentPair(r, n, { scale: kind === 'scale' });
  const fig = `[sym ${pr.A.map((p) => `${p.x},${p.y}`).join(' ')} | ${pr.B.map((p) => `${p.x},${p.y}`).join(' ')}]`;
  return { A: pr.A, B: pr.B, congr: kind === 'turn', fig };
}

export const SYM = [
  {
    id: 'sym.congr', grade: 5, name: '도형의 합동', needs: [],
    idea: '모양과 크기가 같아서 **포개었을 때 완전히 겹치는** 두 도형을 서로 **합동**이라고 해요. 돌리거나 뒤집어서 겹쳐도 합동이에요.',
    rule: '포개어 완전히 겹치면 합동 — 돌리거나 뒤집어도 된다. 모양만 같거나 넓이만 같으면 아니다.',
    slip: '두 도형의 변 길이를 칸으로 세어 하나씩 맞대 봐요.',
    calc(r, c) {
      const fams = [famOf(['turn', 'scale', 'area'].flatMap((kind) => (kind === 'area' ? [4] : [3, 4]).map((n) => {
        const cs = congrCase(r, kind, n);
        const what = n === 3 ? '삼각형' : '사각형';
        const ok = { turn: '합동이에요 — 돌리거나 뒤집어서 포개면 완전히 겹쳐요', scale: '합동이 아니에요 — 모양은 같아도 크기가 달라요', area: '합동이 아니에요 — 넓이는 같아도 모양이 달라요' }[kind];
        const wr = {
          turn: [{ text: '합동이 아니에요 — 놓인 방향이 달라요', tag: TAGS.turnNot }, { text: '합동이 아니에요 — 크기가 달라요', tag: TAGS.lookWrong }],
          scale: [{ text: '합동이에요 — 모양이 같아요', tag: TAGS.scaleSame }, { text: '합동이에요 — 돌리면 완전히 겹쳐요', tag: TAGS.lookWrong }],
          area: [{ text: '합동이에요 — 넓이가 같아요', tag: TAGS.areaSame }, { text: '합동이에요 — 둘 다 사각형이에요', tag: TAGS.lookWrong }],
        }[kind];
        return {
          // 틀 글이 사례마다 달라야 🔁 쌍둥이가 같은 사례로 온다 (그림만으로는 꼭짓점 수가 같아 열쇠가 겹친다)
          t: `${{ turn: '모눈 위의 두 ' + what + '은', scale: '모눈 위에 그린 두 ' + what + '은', area: '모눈 위의 두 직사각형은' }[kind]} 서로 합동일까요?\n\n${cs.fig}`,
          text: true, ans: ok, wr,
          steps: [{ turn: '한 도형을 돌리거나 뒤집어 다른 도형에 포개 봐요', scale: '두 도형의 변 길이를 칸으로 세어 봐요', area: '두 도형의 가로·세로를 칸으로 세어 봐요' }[kind],
            { turn: '변 길이와 모양이 모두 같아 완전히 겹쳐요 → 합동', scale: '한 도형의 변이 다른 도형의 두 배예요 — 포개도 안 겹쳐요 → 합동이 아니에요', area: `넓이는 둘 다 ${cs.area}칸이지만 가로·세로가 달라 안 겹쳐요 → 합동이 아니에요` }[kind]],
          why: {
            [TAGS.turnNot]: '놓인 방향은 상관없어요. 돌리거나 뒤집어서 완전히 겹치면 합동이에요.',
            [TAGS.scaleSame]: '모양이 같아도 크기가 다르면 포갰을 때 안 겹쳐요. 합동은 크기까지 같아야 해요.',
            [TAGS.areaSame]: '넓이가 같아도 모양이 다르면 안 겹쳐요. 합동은 포개서 완전히 겹쳐야 해요.',
            [TAGS.lookWrong]: '변 길이를 칸으로 세어 다시 비교해 봐요.',
          },
          probe: { congr: cs.congr },
        };
      })))];
      return calcAsk(r, c, this, runFamily(r, c, fams));
    },
    misread(r, c) {
      if (branchOf(r, c, ['turn', 'area']) === 'turn') {
        const n = pick(r, [3, 4]); const cs = congrCase(r, 'turn', n);
        const q = `{mon/이/가} 두 도형을 보고 이렇게 말했어요.\n\n${cs.fig}\n\n**두 도형은 놓인 방향이 달라서 합동이 아니에요**\n\n어디가 틀렸을까요?`;
        const chs = textChoices(r, '돌리거나 뒤집어서 완전히 겹치면 합동이에요', [
          { text: '맞게 말했어요', tag: RIGHT_AS_WRONG },
          { text: '합동은 색깔도 같아야 해요', tag: OFF },
          { text: '두 도형은 크기가 달라서 합동이 아니에요', tag: TAGS.lookWrong },
        ]);
        return {
          ...misreadAsk(this.id, 'turn', fill(q, c), chs, {
            solve: solve([step(0, '한 도형을 돌리거나 뒤집어 다른 도형에 포개 봐요'), step(1, '완전히 겹쳐요 → 합동이에요')], {
              whyAny: '놓인 방향은 상관없어요 — 포개서 완전히 겹치는지만 봐요.', rule: '돌리거나 뒤집어도 완전히 겹치면 합동.',
            }),
          }),
          probe: { congr: true },
        };
      }
      const cs = congrCase(r, 'area', 4);
      const q = `{mon/이/가} 두 도형을 보고 이렇게 말했어요.\n\n${cs.fig}\n\n**두 도형은 넓이가 같으니까 합동이에요**\n\n어디가 틀렸을까요?`;
      const chs = textChoices(r, '넓이가 같아도 모양이 달라서 포개면 안 겹쳐요', [
        { text: '맞게 말했어요', tag: RIGHT_AS_WRONG },
        { text: '넓이가 달라서 합동이 아니에요', tag: TAGS.lookWrong },
        { text: '사각형끼리는 언제나 합동이에요', tag: OFF },
      ]);
      return {
        ...misreadAsk(this.id, 'area', fill(q, c), chs, {
          solve: solve([step(0, `넓이는 둘 다 ${cs.area}칸이에요`), step(1, '가로·세로가 달라 포개도 안 겹쳐요 → 합동이 아니에요')], {
            whyAny: '합동은 넓이가 아니라 포갰을 때 완전히 겹치는지로 정해요.', rule: '넓이만 같으면 합동이 아니다.',
          }),
        }),
        probe: { congr: false },
      };
    },
  },
  {
    id: 'sym.corr', grade: 5, name: '대응점·대응변·대응각', needs: ['sym.congr'],
    idea: '합동인 두 도형을 포갰을 때 겹치는 점을 **대응점**, 겹치는 변을 **대응변**, 겹치는 각을 **대응각**이라고 해요. 대응변의 길이와 대응각의 크기는 서로 같아요.',
    rule: '대응점·대응변은 포개어 겹치는 짝 — 이름 순서나 놓인 자리가 아니라 모양으로 찾는다.',
    slip: '한 도형을 돌리거나 뒤집어 다른 도형에 포개 보고, 겹치는 짝을 찾아요.',
    calc(r, c) {
      const fams = [];
      // 대응점 — 묻는 점마다 틀 하나 (삼각형·사각형)
      fams.push(famOf([3, 4].flatMap((n) => NAMES_A(n).map((nm, i) => {
        const pr = congruentPair(r, n);
        const ans = `점 ${corrName(pr, i)}`;
        const nameO = `점 ${NAMES_B(n)[i]}`; const ps = posSameName(pr, i); const posO = ps ? `점 ${ps}` : '';
        const other = `점 ${NAMES_B(n).find((x) => `점 ${x}` !== ans && `점 ${x}` !== nameO && `점 ${x}` !== posO) || NAMES_B(n)[0]}`;
        return {
          t: `두 도형은 서로 합동이에요. 점 ${jm(nm, '의')} 대응점은 어느 것일까요?\n\n${pairDirective(pr)}`,
          text: true, ans,
          wr: [{ text: nameO, tag: TAGS.nameOrder }, ...(posO ? [{ text: posO, tag: TAGS.posSame }] : []), ...NAMES_B(n).map((x) => ({ text: `점 ${x}`, tag: TAGS.pairWrong }))],
          steps: ['한 도형을 돌리거나 뒤집어 다른 도형에 포개 봐요', `점 ${jm(nm, '과')} 겹치는 점 → ${ans}`],
          why: {
            [TAGS.nameOrder]: `이름 순서가 아니라 포갰을 때 겹치는 점이에요. 점 ${jm(nm, '과')} 겹치는 점은 ${jm(ans, '이에요')}.`,
            [TAGS.posSame]: `돌려 놓았으니 같은 자리가 아니에요. 변 길이를 맞대어 포개면 ${jm(ans, '과')} 겹쳐요.`,
            [TAGS.pairWrong]: `점 ${jm(nm, '과')} 이웃한 변의 길이를 칸으로 세어 같은 모양인 점을 찾아요 → ${ans}.`,
          },
          probe: { corrPoint: [nm] },
        };
      }))));
      // 대응변 — 묻는 변마다 틀 하나
      fams.push(famOf([3, 4].flatMap((n) => NAMES_A(n).map((nm, i) => {
        const pr = congruentPair(r, n);
        const na = NAMES_A(n); const nb = NAMES_B(n); const j = (i + 1) % n;
        const ans = `변 ${corrName(pr, i)}${corrName(pr, j)}`;
        const nameO = `변 ${nb[i]}${nb[j]}`;
        const p1 = posSameName(pr, i); const p2 = posSameName(pr, j);
        const gapI = (nb.indexOf(p1) - nb.indexOf(p2) + n) % n;
        const posO = p1 && p2 && p1 !== p2 && (gapI === 1 || gapI === n - 1) ? `변 ${p1}${p2}` : ''; // 두 끝이 이웃할 때만 변이다
        const others = nb.map((x, s) => `변 ${x}${nb[(s + 1) % n]}`).filter((s) => !sameSide(s, ans) && !sameSide(s, nameO));
        return {
          t: `두 도형은 서로 합동이에요. 변 ${jm(`${na[i]}${na[j]}`, '의')} 대응변은 어느 것일까요?\n\n${pairDirective(pr)}`,
          text: true, same: sameSide, ans,
          wr: [{ text: nameO, tag: TAGS.nameOrder }, ...(posO ? [{ text: posO, tag: TAGS.posSame }] : []), ...others.map((s) => ({ text: s, tag: TAGS.pairWrong }))],
          steps: [`변 ${na[i]}${na[j]}의 두 끝 점 ${jm(na[i], '과')} ${jm(na[j], '의')} 대응점을 찾아요: 점 ${jm(corrName(pr, i), '과')} 점 ${corrName(pr, j)}`, `→ ${ans}`],
          why: {
            [TAGS.nameOrder]: `이름 순서가 아니라 포갰을 때 겹치는 변이에요 → ${ans}.`,
            [TAGS.posSame]: `돌려 놓았으니 같은 자리가 아니에요 → ${ans}.`,
            [TAGS.pairWrong]: `두 끝 점의 대응점을 먼저 찾으면 대응변이 나와요 → ${ans}.`,
          },
          probe: { corrSide: [na[i], na[j]] },
        };
      }))));
      // 대응변의 길이 — 변 길이가 모두 정수인 도형, B의 묻는 변마다 틀 하나
      fams.push(famOf([3, 4].flatMap((n) => NAMES_B(n).map((nm, jb) => {
        const pr = congruentPair(r, n, { intSides: true });
        const nb = NAMES_B(n); const na = NAMES_A(n);
        // B의 변 nb[jb]nb[jb+1] ↔ A의 변 (jb − k)
        const ia = (jb - pr.k + n) % n;
        const L = (i) => Math.round(sideLen(pr.A[i], pr.A[(i + 1) % n]));
        const ans = `${L(ia)} cm`;
        return {
          t: `두 도형은 서로 합동이에요. 변 ${jm(`${nb[jb]}${nb[(jb + 1) % n]}`, '은')} 몇 cm일까요?\n\n${pairDirective(pr, { len: true })}`,
          ans, unit: ' cm',
          wr: [{ text: `${L(jb)} cm`, tag: TAGS.nameOrder }, ...na.map((_, i) => ({ text: `${L(i)} cm`, tag: TAGS.pairWrong }))],
          steps: [`변 ${nb[jb]}${nb[(jb + 1) % n]}의 대응변은 변 ${na[ia]}${na[(ia + 1) % n]}이에요`, `대응변의 길이는 같아요 → ${ans}`],
          why: {
            [TAGS.nameOrder]: `이름 순서로 짝지으면 안 돼요. 포개어 겹치는 변은 변 ${na[ia]}${na[(ia + 1) % n]}이에요 → ${ans}.`,
            [TAGS.pairWrong]: `대응변부터 찾아요: 변 ${na[ia]}${na[(ia + 1) % n]} → ${ans}.`,
          },
          probe: { corrLen: [nb[jb], nb[(jb + 1) % n]] },
        };
      }))));
      // 대응각 — 글로 대응을 밝힌 삼각형 두 개 (각의 합 180°)
      fams.push(famOf(['ㄹ', 'ㅁ', 'ㅂ'].map((askB) => {
        let a = 0; let b = 0;
        for (let t = 0; t < 50; t++) {
          a = int(r, 3, 9) * 10; b = int(r, 3, 10) * 10;
          const cc = 180 - a - b;
          if (cc >= 20 && a !== b && a !== cc && b !== cc && 180 - a !== cc) break; // 세 각이 다르고, "한 각만 뺀 값"도 답과 다르게
        }
        const angs = { ㄱ: a, ㄴ: b, ㄷ: 180 - a - b };
        if (angs.ㄷ < 20 || a === b) return null;
        const corr = { ㄹ: 'ㄱ', ㅁ: 'ㄴ', ㅂ: 'ㄷ' };
        const ansV = angs[corr[askB]];
        const known = askB === 'ㅂ' ? null : askB; // ㅂ을 물으면 두 각을 더해 빼야 한다
        return {
          t: `삼각형 ㄱㄴㄷ과 삼각형 ㄹㅁㅂ은 서로 합동이에요. 점 ㄱ과 점 ㄹ, 점 ㄴ과 점 ㅁ, 점 ㄷ과 점 ㅂ이 대응점이에요.\n\n**각 ㄱ ${a}° · 각 ㄴ ${b}°**\n\n각 ${jm(askB, '의')} 크기는 몇 도일까요?`,
          ans: `${ansV}°`, unit: '°',
          // 오답: 다른 두 각(짝을 잘못 지음) · ㅂ을 물으면 180°에서 한 각만 뺀 값
          wr: [
            ...['ㄱ', 'ㄴ', 'ㄷ'].filter((x) => x !== corr[askB]).map((x) => ({ text: `${angs[x]}°`, tag: TAGS.pairWrong })),
            ...(known ? [] : [{ text: `${180 - a}°`, tag: TAGS.sumOne }]),
          ],
          steps: known
            ? [`각 ${jm(askB, '의')} 대응각은 각 ${jm(corr[askB], '이에요')}`, `대응각의 크기는 같아요 → ${ansV}°`]
            : [`각 ㅂ의 대응각은 각 ㄷ — 삼각형 세 각의 합은 180°`, `180° − ${a}° − ${b}° = ${ansV}°`],
          why: {
            [TAGS.pairWrong]: `대응각부터 찾아요: 각 ${jm(askB, '은')} 각 ${jm(corr[askB], '과')} 겹쳐요 → ${ansV}°.`,
            [TAGS.sumOne]: `세 각의 합 180°에서 두 각을 모두 빼야 해요: 180° − ${a}° − ${b}° = ${ansV}°.`,
          },
          probe: { corrAngle: [askB, a, b] },
        };
      })));
      return calcAsk(r, c, this, runFamily(r, c, fams));
    },
    misread(r, c) {
      const br = branchOf(r, c, ['name', 'len']);
      const n = pick(r, [3, 4]);
      const pr = congruentPair(r, n, { intSides: br === 'len' });
      const na = NAMES_A(n); const nb = NAMES_B(n);
      if (br === 'name') {
        const ans = corrName(pr, 1);
        const q = `{mon/이/가} 합동인 두 도형을 보고 이렇게 말했어요.\n\n${pairDirective(pr)}\n\n**점 ${jm(na[1], '의')} 대응점은 이름 순서대로 점 ${jm(nb[1], '이에요')}**\n\n어디가 틀렸을까요?`;
        const chs = textChoices(r, `포개어 겹치는 점을 찾아야 해요 — 점 ${jm(ans, '이에요')}`, [
          { text: '맞게 말했어요', tag: RIGHT_AS_WRONG },
          { text: `대응점은 언제나 점 ${jm(na[1], '이에요')}`, tag: OFF },
          posSameName(pr, 1) && posSameName(pr, 1) !== ans
            ? { text: `같은 자리에 있는 점 ${jm(posSameName(pr, 1), '이에요')}`, tag: TAGS.posSame }
            : { text: `점 ${jm(nb.find((x) => x !== ans && x !== nb[1]), '이에요')}`, tag: TAGS.pairWrong },
        ]);
        return {
          ...misreadAsk(this.id, 'name', fill(q, c), chs, {
            solve: solve([step(0, '한 도형을 돌리거나 뒤집어 다른 도형에 포개 봐요'), step(1, `점 ${jm(na[1], '과')} 겹치는 점 → 점 ${ans}`)], {
              whyAny: '대응점은 이름 순서가 아니라 포갰을 때 겹치는 점이에요.', rule: '대응점은 포개어 겹치는 점.',
            }),
          }),
          probe: { corrPoint: [na[1]], shown: nb[1] },
        };
      }
      // 대응변의 길이를 이름 순서로
      const jb = 0; const ia = (jb - pr.k + n) % n;
      const L = (i) => Math.round(sideLen(pr.A[i], pr.A[(i + 1) % n]));
      const q = `{mon/이/가} 합동인 두 도형을 보고 이렇게 말했어요.\n\n${pairDirective(pr, { len: true })}\n\n**변 ${nb[0]}${jm(nb[1], '은')} 변 ${na[0]}${jm(na[1], '과')} 짝이니까 ${L(0)} cm예요**\n\n어디가 틀렸을까요?`;
      const chs = textChoices(r, `대응변은 변 ${na[ia]}${jm(na[(ia + 1) % n], '이에요')} — ${L(ia)} cm`, [
        { text: '맞게 말했어요', tag: RIGHT_AS_WRONG },
        { text: '합동인 도형은 대응변의 길이가 달라요', tag: OFF },
        { text: `두 도형의 변 길이를 모두 더해야 해요`, tag: OFF },
      ]);
      return {
        ...misreadAsk(this.id, 'len', fill(q, c), chs, {
          solve: solve([step(0, `변 ${nb[0]}${nb[1]}과 포개어 겹치는 변 → 변 ${na[ia]}${na[(ia + 1) % n]}`), step(1, `대응변의 길이는 같아요 → ${L(ia)} cm`)], {
            whyAny: '대응변은 이름 순서가 아니라 포갰을 때 겹치는 변이에요.', rule: '대응변을 먼저 찾고, 그 길이를 쓴다.',
          }),
        }),
        probe: { corrLen: [nb[0], nb[1]], shown: L(0), differ: L(0) !== L(ia) },
      };
    },
  },
  {
    id: 'sym.tri', grade: 5, name: '합동인 삼각형 그리기', needs: ['sym.corr'],
    idea: '합동인 삼각형은 **세 변의 길이**, **두 변의 길이와 그 사이에 있는 각의 크기**, **한 변의 길이와 그 양 끝 각의 크기** 중 하나만 알면 그릴 수 있어요.',
    rule: '세 변 · 두 변과 그 사이에 있는 각 · 한 변과 그 양 끝 각 — 이 중 하나면 하나로 정해진다. 세 각만으로는 안 된다.',
    slip: '주어진 것만으로 삼각형이 하나로 정해지는지 — 크기나 모양이 다른 삼각형도 그려지는지 생각해 봐요.',
    calc(r, c) {
      const fams = [];
      // 하나로 그릴 수 있는 것 고르기 — ㉠~㉣ 목록, 정답의 종류·자리마다 틀 하나
      const LB = ['㉠', '㉡', '㉢', '㉣'];
      const tagOf = { aaa: TAGS.threeAngles, ssa: TAGS.notIncluded, two: TAGS.twoOnly };
      fams.push(famOf(['sss', 'sas', 'asa'].flatMap((ok) => [0, 1, 2, 3].map((at) => {
        const it = triItems(r);
        const order = ['aaa', 'ssa', 'two']; order.splice(at, 0, ok);
        return {
          t: `다음 중 합동인 삼각형을 하나로 그릴 수 있는 것은 어느 것일까요?\n\n${order.map((k, i) => `${LB[i]} ${it[k]}`).join('\n')}`,
          text: true, ans: LB[at],
          wr: order.map((k, i) => (k === ok ? null : { text: LB[i], tag: tagOf[k] })).filter(Boolean),
          steps: [`${{ sss: '세 변의 길이를', sas: '두 변의 길이와 그 사이에 있는 각을', asa: '한 변의 길이와 그 양 끝 각을' }[ok]} 알면 삼각형이 하나로 정해져요`, `→ ${LB[at]}`],
          why: {
            [TAGS.threeAngles]: '세 각이 같아도 크기가 다른 삼각형을 여러 개 그릴 수 있어요.',
            [TAGS.notIncluded]: '각이 두 변 사이에 있지 않으면 삼각형이 하나로 정해지지 않아요.',
            [TAGS.twoOnly]: '두 변만으로는 사이의 각에 따라 모양이 달라져요.',
          },
          probe: { triPick: order },
        };
      }))));
      // 무엇을 더 알아야 하나 — 아는 것(두 변 · 한 변과 한 끝 각)과 정답(각·변)마다 틀 하나
      fams.push(famOf([['ss', 'ang'], ['ss', 'side'], ['sa', 'ang'], ['sa', 'side']].map(([known, ok]) => {
        const a = int(r, 3, 9); let b = int(r, 3, 9); while (b === a) b = int(r, 3, 9);
        const g = int(r, 3, 12) * 10;
        const t = known === 'ss'
          ? `삼각형 ㄱㄴㄷ에서 변 ㄱㄴ ${a} cm와 변 ㄴㄷ ${b} cm를 알아요. 합동인 삼각형을 하나로 그리려면 무엇을 더 알아야 할까요?`
          : `삼각형 ㄱㄴㄷ에서 변 ㄴㄷ ${a} cm와 각 ㄴ ${g}°를 알아요. 합동인 삼각형을 하나로 그리려면 무엇을 더 알아야 할까요?`;
        // 두 변 ㄱㄴ·ㄴㄷ → 그 사이의 각 ㄴ(또는 나머지 변 ㄱㄷ) · 변 ㄴㄷ과 끝 각 ㄴ → 다른 끝 각 ㄷ(또는 각 ㄴ을 끼는 변 ㄱㄴ)
        // ★ 변 ㄴㄷ·각 ㄴ에 각 ㄱ을 더하면 세 각의 합으로 각 ㄷ이 나와 하나로 정해진다 — 그래서 각 ㄱ은 오답으로 쓰지 않는다
        const ans = known === 'ss' ? (ok === 'ang' ? '각 ㄴ의 크기' : '변 ㄱㄷ의 길이') : (ok === 'ang' ? '각 ㄷ의 크기' : '변 ㄱㄴ의 길이');
        const wr = known === 'ss'
          ? [{ text: '각 ㄱ의 크기', tag: TAGS.notIncluded }, { text: '각 ㄷ의 크기', tag: TAGS.notIncluded }, { text: '더 몰라도 그릴 수 있어요', tag: TAGS.twoOnly }]
          : [{ text: '변 ㄱㄷ의 길이', tag: TAGS.notIncluded }, { text: '더 몰라도 그릴 수 있어요', tag: TAGS.tooFew }];
        return {
          t, text: true, ans, wr,
          steps: known === 'ss'
            ? [ok === 'ang' ? '변 ㄱㄴ과 변 ㄴㄷ 사이에 있는 각은 각 ㄴ이에요' : '세 변의 길이를 알면 하나로 정해져요', ok === 'ang' ? '두 변과 그 사이에 있는 각 → 각 ㄴ의 크기' : '나머지 한 변 → 변 ㄱㄷ의 길이']
            : [ok === 'ang' ? '변 ㄴㄷ의 양 끝 각은 각 ㄴ과 각 ㄷ이에요' : '각 ㄴ을 사이에 두는 두 변은 변 ㄱㄴ과 변 ㄴㄷ이에요', ok === 'ang' ? '한 변과 그 양 끝 각 → 각 ㄷ의 크기' : '두 변과 그 사이에 있는 각 → 변 ㄱㄴ의 길이'],
          why: {
            [TAGS.notIncluded]: known === 'ss' ? '각 ㄱ·각 ㄷ은 두 변 사이에 있는 각이 아니에요 — 사이에 있는 각은 각 ㄴ이에요.' : '변 ㄱㄷ을 더하면 각 ㄴ이 두 변 사이에 있지 않아요 — 하나로 정해지지 않아요.',
            [TAGS.twoOnly]: '두 변만으로는 사이의 각에 따라 모양이 달라져요.',
            [TAGS.tooFew]: '한 변과 한 각만으로는 삼각형이 하나로 정해지지 않아요.',
          },
          probe: { triMore: [known, ok] },
        };
      })));
      return calcAsk(r, c, this, runFamily(r, c, fams));
    },
    misread(r, c) {
      if (branchOf(r, c, ['angles', 'incl']) === 'angles') {
        const [A1, A2, A3] = threeAngles(r);
        const q = showWork(`세 각이 ${A1}°, ${A2}°, ${A3}°인 삼각형은 하나로 그릴 수 있어요`);
        const chs = textChoices(r, '세 각이 같아도 크기가 다른 삼각형을 여러 개 그릴 수 있어요', [
          { text: '맞게 말했어요', tag: RIGHT_AS_WRONG },
          { text: '세 각의 합이 180°가 아니라서 그릴 수 없어요', tag: OFF },
          { text: '세 각이 모두 같아야 그릴 수 있어요', tag: OFF },
        ]);
        return {
          ...misreadAsk(this.id, 'angles', fill(q, c), chs, {
            solve: solve([step(0, `세 각이 ${A1}°, ${A2}°, ${A3}°인 삼각형은 작게도 크게도 그릴 수 있어요`), step(1, '크기가 하나로 정해지지 않아요 → 변의 길이가 하나는 있어야 해요')], {
              whyAny: '세 각만으로는 크기가 정해지지 않아요.', rule: '세 각만으로는 합동인 삼각형을 하나로 그릴 수 없다.',
            }),
          }),
          probe: { triClaim: 'aaa' },
        };
      }
      const a = int(r, 3, 9); let b = int(r, 3, 9); while (b === a) b = int(r, 3, 9);
      const g = int(r, 3, 8) * 10;
      const q = showWork(`두 변 ${a} cm, ${b} cm와 그 사이에 있지 않은 각 ${g}°를 알면 합동인 삼각형을 하나로 그릴 수 있어요`);
      const chs = textChoices(r, '각이 두 변 사이에 있어야 하나로 정해져요', [
        { text: '맞게 말했어요', tag: RIGHT_AS_WRONG },
        { text: '세 변을 모두 알아야만 그릴 수 있어요', tag: OFF },
        { text: `${g}°는 너무 작은 각이라 그릴 수 없어요`, tag: OFF },
      ]);
      return {
        ...misreadAsk(this.id, 'incl', fill(q, c), chs, {
          solve: solve([step(0, '두 변과 각으로 그릴 때는 각이 두 변 사이에 있어야 해요'), step(1, '사이에 있지 않은 각이면 삼각형이 하나로 정해지지 않아요')], {
            whyAny: '두 변과 그 **사이에 있는** 각이어야 해요.', rule: '두 변과 그 사이에 있는 각.',
          }),
        }),
        probe: { triClaim: 'ssa' },
      };
    },
  },
  {
    id: 'sym.line', grade: 5, name: '선대칭도형과 대칭축', needs: ['sym.tri'],
    idea: '한 직선을 따라 접었을 때 **완전히 겹치는** 도형을 **선대칭도형**이라고 하고, 그 직선을 **대칭축**이라고 해요. 대칭축은 여러 개일 수도 있어요.',
    rule: '접어서 완전히 겹치는 선이 대칭축 — 직사각형의 대각선은 아니다. 평행사변형은 선대칭도형이 아니다.',
    slip: '도형을 그 선으로 접는다고 생각하고, 양쪽이 완전히 겹치는지 봐요.',
    calc(r, c) {
      const fams = [];
      // 모눈 위 도형 — 도형 종류마다 틀 하나 (이름을 글에 써서 🔁 쌍둥이가 같은 종류로)
      fams.push(famOf(Object.keys(AX).map((kind) => {
        const verts = gshape(r, kind);
        const { n, wr } = AX[kind];
        return {
          t: `다음 ${SHAPE_KO[kind]}${josaOf(SHAPE_KO[kind], '의', '의')} 대칭축은 모두 몇 개일까요?\n\n[gpoly ${named(verts)}]`,
          ans: `${n}개`, unit: '개',
          wr: wr.map(([v, tag]) => ({ text: `${v}개`, tag })),
          steps: [AX_STEP[kind], `→ ${n}개`],
          why: AX_WHY,
          probe: { axes: kind },
        };
      })));
      // 정다각형 — 이름과 그림 [reg n 한 변]
      fams.push(famOf(Object.keys(REG).map((name) => {
        const { k, n, wr } = REG[name];
        const side = int(r, 2, 8); // 2~4만이면 🔁 쌍둥이가 원래 글과 같은 일이 셋에 하나 — 그림 속 수가 이것 하나뿐이다
        return {
          t: `다음 ${name}의 대칭축은 모두 몇 개일까요?\n\n[reg ${k} ${side}]`,
          ans: `${n}개`, unit: '개',
          wr: wr.map(([v, tag]) => ({ text: `${v}개`, tag })),
          steps: [k % 2 ? `꼭짓점과 마주 보는 변의 가운데를 잇는 선 ${k}개` : `마주 보는 꼭짓점을 잇는 선 ${k / 2}개 + 마주 보는 변의 가운데를 잇는 선 ${k / 2}개`, `→ ${n}개`],
          why: AX_WHY,
          probe: { axesReg: name },
        };
      })));
      return calcAsk(r, c, this, runFamily(r, c, fams));
    },
    misread(r, c) {
      if (branchOf(r, c, ['diag', 'para']) === 'diag') {
        const verts = gshape(r, 'rect');
        const q = `{mon/이/가} 이 직사각형을 보고 이렇게 말했어요.\n\n[gpoly ${named(verts)}]\n\n**대각선으로 접어도 겹치니까 대칭축이 4개예요**\n\n어디가 틀렸을까요?`;
        const chs = textChoices(r, '대각선으로 접으면 완전히 겹치지 않아요 — 대칭축은 2개예요', [
          { text: '맞게 말했어요', tag: RIGHT_AS_WRONG },
          { text: '직사각형은 대칭축이 없어요', tag: OFF },
          { text: '대각선으로 접으면 겹치니까 대칭축은 8개예요', tag: TAGS.doubleCount },
        ]);
        return {
          ...misreadAsk(this.id, 'diag', fill(q, c), chs, {
            solve: solve([step(0, '대각선으로 접으면 두 삼각형이 엇갈려 겹치지 않아요'), step(1, '가로·세로 가운데를 지나는 선 2개만 대칭축이에요')], {
              whyAny: '대각선으로 접어 보면 모서리가 삐져나와요 — 정사각형만 대각선도 대칭축이에요.', rule: '직사각형의 대칭축은 2개 — 대각선은 아니다.',
            }),
          }),
          probe: { axes: 'rect', shown: 4 },
        };
      }
      const verts = gshape(r, 'para');
      const q = `{mon/이/가} 이 평행사변형을 보고 이렇게 말했어요.\n\n[gpoly ${named(verts)}]\n\n**가운데를 지나는 선으로 접으면 겹치니까 선대칭도형이에요**\n\n어디가 틀렸을까요?`;
      const chs = textChoices(r, '어느 선으로 접어도 완전히 겹치지 않아요 — 선대칭도형이 아니에요', [
        { text: '맞게 말했어요', tag: RIGHT_AS_WRONG },
        { text: '평행사변형은 대칭축이 4개예요', tag: TAGS.diagAxis },
        { text: '평행사변형은 접을 수 없는 도형이에요', tag: OFF },
      ]);
      return {
        ...misreadAsk(this.id, 'para', fill(q, c), chs, {
          solve: solve([step(0, '가로·세로·대각선 어느 선으로 접어도 양쪽이 엇갈려요'), step(1, '완전히 겹치는 선이 없어요 → 선대칭도형이 아니에요')], {
            whyAny: '평행사변형은 접으면 비스듬한 변이 엇갈려 안 겹쳐요.', rule: '평행사변형은 선대칭도형이 아니다.',
          }),
        }),
        probe: { axes: 'para', shown: 1 },
      };
    },
  },
  {
    id: 'sym.lineprop', grade: 5, name: '선대칭도형의 성질', needs: ['sym.line'],
    idea: '선대칭도형에서 대칭축으로 접었을 때 겹치는 점·변·각이 **대응점·대응변·대응각**이에요. 대응점끼리 이은 선분은 대칭축과 **수직**으로 만나고, 대칭축이 그 선분을 **똑같이 둘로** 나눠요.',
    rule: '대응점끼리 이은 선분은 대칭축과 수직, 대칭축이 반으로 나눈다 — 축까지 거리의 두 배가 대응점까지 거리.',
    slip: '대칭축으로 접는다고 생각하고 겹치는 짝을 찾아요.',
    calc(r, c) {
      const fams = [];
      // 대응점 — 축 방향(세로·가로)·꼭짓점 수·묻는 점마다 틀 하나
      fams.push(famOf([false, true].flatMap((horiz) => [2, 3].flatMap((m) => range1(m).map((i) => {
        const L = lineSymPoly(r, m, horiz); const n = 2 * m + 2;
        const mir = (j) => (j === 0 || j === m + 1 ? j : n - j);
        const ans = `점 ${VNAMES[mir(i)]}`;
        const others = [mir(i) + 1, mir(i) - 1, i + 1].filter((j) => j > m + 1 && j < n && j !== mir(i)).map((j) => `점 ${VNAMES[j]}`);
        return {
          t: `선대칭도형이에요. 점 ${jm(VNAMES[i], '의')} 대응점은 어느 것일까요?\n\n[sym ${axisTok(L.axis)} ${named(L.poly)}]`,
          text: true, ans,
          wr: [...others.map((x) => ({ text: x, tag: TAGS.pairWrong })), { text: `점 ${VNAMES[i]}`, tag: TAGS.pairWrong }],
          steps: [`대칭축으로 접으면 점 ${jm(VNAMES[i], '과')} 겹치는 점을 찾아요`, `→ ${ans}`],
          why: { [TAGS.pairWrong]: `대칭축에서 점 ${VNAMES[i]}까지와 같은 거리, 건너편에 있는 점이 대응점이에요 → ${ans}.` },
          probe: { linePair: [VNAMES[i]] },
        };
      })))));
      // 거리 — 축까지 → 대응점까지 (두 배) · 대응점까지 → 축까지 (반)
      fams.push(famOf(['toFull', 'toHalf'].flatMap((way) => [false, true].map((horiz) => {
        const L = lineSymPoly(r, 2, horiz); const i = 1; const nm = VNAMES[i];
        const d = axisDist(L.poly[i], L.axis); const m2 = VNAMES[2 * 2 + 2 - i];
        const fig = `[sym ${axisTok(L.axis)} ${named(L.poly)}]`;
        return way === 'toFull' ? {
          t: `선대칭도형이에요. 점 ${jm(nm, '에서')} 대칭축까지의 거리는 ${d} cm예요. 점 ${jm(nm, '과')} 점 ${m2} 사이의 거리는 몇 cm일까요?\n\n${fig}`,
          ans: `${2 * d} cm`, unit: ' cm', wr: [{ text: `${d} cm`, tag: TAGS.halfOnly }],
          steps: [`대칭축이 점 ${jm(nm, '과')} 점 ${jm(m2, '을')} 이은 선분을 반으로 나눠요`, `${d} × 2 = ${2 * d} → ${2 * d} cm`],
          why: { [TAGS.halfOnly]: `${d} cm는 대칭축까지예요. 대응점까지는 그 두 배 → ${2 * d} cm.` },
          probe: { lineDist: [nm, 'full'] },
        } : {
          t: `선대칭도형이에요. 점 ${jm(nm, '과')} 점 ${jm(m2, '을')} 이은 선분은 ${2 * d} cm예요. 점 ${jm(nm, '에서')} 대칭축까지의 거리는 몇 cm일까요?\n\n${fig}`,
          ans: `${d} cm`, unit: ' cm', wr: [{ text: `${2 * d} cm`, tag: TAGS.noHalf }],
          steps: ['대칭축이 대응점끼리 이은 선분을 반으로 나눠요', `${2 * d} ÷ 2 = ${d} → ${d} cm`],
          why: { [TAGS.noHalf]: `${2 * d} cm는 대응점까지예요. 대칭축까지는 그 반 → ${d} cm.` },
          probe: { lineDist: [nm, 'half'] },
        };
      }))));
      // 대응점끼리 이은 선분과 대칭축이 만나는 각
      fams.push(famOf([false, true].map((horiz) => {
        const L = lineSymPoly(r, 2, horiz); const nm = VNAMES[1]; const m2 = VNAMES[5];
        return {
          t: `선대칭도형이에요. 점 ${jm(nm, '과')} 점 ${jm(m2, '을')} 이은 선분과 대칭축이 만나서 이루는 각은 몇 도일까요?\n\n[sym ${axisTok(L.axis)} ${named(L.poly)}]`,
          ans: '90°', unit: '°', wr: [{ text: '45°', tag: TAGS.notRight }, { text: '180°', tag: TAGS.notRight }, { text: '60°', tag: TAGS.notRight }],
          steps: ['대응점끼리 이은 선분은 대칭축과 수직으로 만나요', '→ 90°'],
          why: { [TAGS.notRight]: '대응점끼리 이은 선분과 대칭축은 수직 — 직각(90°)으로 만나요.' },
          probe: { lineRight: true },
        };
      })));
      // 둘레 — 대칭축 한쪽 변의 길이 합의 두 배
      fams.push(famOf([0].map(() => {
        const h = int(r, 7, 24);
        return {
          t: `선대칭도형에서 대칭축의 한쪽에 있는 변의 길이를 모두 더하면 ${h} cm예요. 이 도형의 둘레는 몇 cm일까요?`,
          ans: `${2 * h} cm`, unit: ' cm', wr: [{ text: `${h} cm`, tag: TAGS.halfPerim }],
          steps: ['대칭축의 양쪽은 대응변끼리 길이가 같아요', `${h} × 2 = ${2 * h} → ${2 * h} cm`],
          why: { [TAGS.halfPerim]: `${h} cm는 한쪽만이에요. 반대쪽에도 같은 길이의 대응변이 있어요 → ${2 * h} cm.` },
          probe: { linePerim: h },
        };
      })));
      return calcAsk(r, c, this, runFamily(r, c, fams));
    },
    misread(r, c) {
      const L = lineSymPoly(r, 2, r() < 0.5); const nm = VNAMES[1]; const m2 = VNAMES[5];
      const d = axisDist(L.poly[1], L.axis);
      const fig = `[sym ${axisTok(L.axis)} ${named(L.poly)}]`;
      if (branchOf(r, c, ['half', 'right']) === 'half') {
        const q = `{mon/이/가} 선대칭도형을 보고 이렇게 말했어요.\n\n${fig}\n\n**점 ${jm(nm, '과')} 점 ${jm(m2, '을')} 이은 선분이 ${2 * d} cm니까 점 ${jm(nm, '에서')} 대칭축까지도 ${2 * d} cm예요**\n\n어디가 틀렸을까요?`;
        const chs = textChoices(r, `대칭축이 그 선분을 반으로 나눠요 — ${d} cm예요`, [
          { text: '맞게 말했어요', tag: RIGHT_AS_WRONG },
          { text: `대칭축까지는 그 두 배인 ${4 * d} cm예요`, tag: OFF },
          { text: '대칭축까지의 거리는 잴 수 없어요', tag: OFF },
        ]);
        return {
          ...misreadAsk(this.id, 'half', fill(q, c), chs, {
            solve: solve([step(0, '대칭축은 대응점끼리 이은 선분을 반으로 나눠요'), step(1, `${2 * d} ÷ 2 = ${d} → ${d} cm`)], {
              whyAny: '대응점까지 거리의 반이 대칭축까지의 거리예요.', rule: '대칭축이 대응점끼리 이은 선분을 반으로 나눈다.',
            }),
          }),
          probe: { lineDist: [nm, 'half'], shown: 2 * d },
        };
      }
      const q = `{mon/이/가} 선대칭도형을 보고 이렇게 말했어요.\n\n${fig}\n\n**점 ${jm(nm, '과')} 점 ${jm(m2, '을')} 이은 선분은 대칭축과 비스듬히 만나요**\n\n어디가 틀렸을까요?`;
      const chs = textChoices(r, '대응점끼리 이은 선분은 대칭축과 수직으로 만나요', [
        { text: '맞게 말했어요', tag: RIGHT_AS_WRONG },
        { text: '그 선분은 대칭축과 만나지 않아요', tag: OFF },
        { text: '그 선분은 대칭축과 겹쳐요', tag: OFF },
      ]);
      return {
        ...misreadAsk(this.id, 'right', fill(q, c), chs, {
          solve: solve([step(0, '대칭축으로 접으면 두 점이 겹쳐요'), step(1, '그래서 두 점을 이은 선분은 대칭축과 수직(90°)이에요')], {
            whyAny: '대응점끼리 이은 선분과 대칭축은 언제나 수직이에요.', rule: '대응점끼리 이은 선분 ⊥ 대칭축.',
          }),
        }),
        probe: { lineRight: true },
      };
    },
  },
  {
    id: 'sym.linedraw', grade: 5, name: '선대칭도형 완성하기', needs: ['sym.lineprop'],
    idea: '선대칭도형을 완성할 때는 각 꼭짓점에서 대칭축에 **수직인 선**을 긋고, 대칭축까지와 **같은 거리만큼 건너편**에 대응점을 찍어 이어요.',
    rule: '대응점 = 대칭축 건너편, 축까지와 같은 거리. 옆으로 밀거나 두 배로 옮기지 않는다.',
    slip: '대칭축까지 몇 칸인지 세고, 건너편으로 같은 칸 수만큼 가요.',
    calc(r, c) {
      // 반쪽 + 후보 점 ㉠~㉣ — 축 방향·반쪽 꼭짓점 수·묻는 점마다 틀 하나
      const fams = [famOf([false, true].flatMap((horiz) => [2, 3].flatMap((m) => range1(m).map((i) => {
        const dc = lineDrawCase(r, m, horiz, i);
        if (!dc) return null;
        const nm = VNAMES[i];
        return {
          t: `선대칭도형이 되도록 완성하려고 해요. 점 ${jm(nm, '의')} 대응점은 어느 것일까요?\n\n${dc.fig}`,
          text: true, ans: dc.label.R,
          wr: [{ text: dc.label.S, tag: TAGS.slide }, { text: dc.label.D, tag: TAGS.doubleDist }, { text: dc.label.F, tag: horiz ? TAGS.flipSide : TAGS.flipBoth }],
          steps: [`점 ${jm(nm, '에서')} 대칭축까지 ${dc.d}칸이에요`, `대칭축 건너편으로 같은 ${dc.d}칸 → ${dc.label.R}`],
          why: {
            [TAGS.slide]: '옆으로 그대로 밀면 안 돼요 — 대칭축 건너편에 거울처럼 찍어요.',
            [TAGS.doubleDist]: `대칭축까지 ${dc.d}칸이면 건너편으로도 ${dc.d}칸이에요 — 두 배로 가지 않아요.`,
            [TAGS.flipBoth]: '위아래는 그대로예요 — 세로 대칭축 건너편으로만 뒤집어요.',
            [TAGS.flipSide]: '양옆은 그대로예요 — 가로 대칭축 건너편으로만 뒤집어요.',
          },
          draw: { fig: dc.base, mode: 'grid', target: [dc.R.x, dc.R.y], cands: dc.cands, from: [dc.p.x, dc.p.y] }, // from = 묻는 꼭짓점 (✍️ 모눈 판의 점선·▲▼ 시작)
          probe: { lineDraw: nm },
        };
      }))))];
      return calcAsk(r, c, this, runFamily(r, c, fams));
    },
    misread(r, c) {
      const br = branchOf(r, c, ['slide', 'double']);
      let dc = null;
      for (let t = 0; t < 20 && !dc; t++) dc = lineDrawCase(r, 2, r() < 0.5, 1);
      const nm = VNAMES[1];
      const star = br === 'slide' ? dc.S : dc.D;
      const q = `{mon/이/가} 선대칭도형을 완성하려고 점 ${jm(nm, '의')} 대응점을 ★에 찍었어요.\n\n[${dc.base.replace(/^sym /, 'sym ')} ★@${star.x},${star.y}]\n\n어디가 틀렸을까요?`;
      const okText = br === 'slide' ? '★은 옆으로 밀어 놓은 자리예요 — 대칭축 건너편에 같은 거리만큼 찍어요' : `★은 대칭축에서 두 배 떨어졌어요 — 건너편으로도 ${dc.d}칸만 가요`;
      const chs = textChoices(r, okText, [
        { text: '맞게 찍었어요', tag: RIGHT_AS_WRONG },
        { text: '대응점은 대칭축 위에 찍어야 해요', tag: OFF },
        { text: br === 'slide' ? `★은 대칭축에서 두 배 떨어졌어요` : '★은 옆으로 밀어 놓은 자리예요', tag: br === 'slide' ? TAGS.doubleDist : TAGS.slide },
      ]);
      return {
        ...misreadAsk(this.id, br, fill(q, c), chs, {
          solve: solve([step(0, `점 ${jm(nm, '에서')} 대칭축까지 ${dc.d}칸`), step(1, `건너편으로 같은 ${dc.d}칸 — 그 자리가 대응점이에요`)], {
            whyAny: '대응점은 대칭축 건너편, 축까지와 같은 거리에 있어요.', rule: '대칭축 건너편, 같은 거리.',
          }),
        }),
        probe: { lineDraw: nm, star: [star.x, star.y] },
      };
    },
  },
  {
    id: 'sym.point', grade: 5, name: '점대칭도형과 대칭의 중심', needs: ['sym.linedraw'],
    idea: '한 점을 중심으로 **180° 돌렸을 때** 처음 도형과 완전히 겹치는 도형을 **점대칭도형**이라고 하고, 그 점을 **대칭의 중심**이라고 해요.',
    rule: '180° 돌려서 겹치면 점대칭 — 접어서 겹치는 선대칭과 다르다. 선대칭이라고 점대칭인 것은 아니다.',
    slip: '도형을 대칭의 중심에 핀을 꽂고 반 바퀴(180°) 돌린다고 생각해 봐요.',
    calc(r, c) {
      const fams = [];
      // 이 도형은 점대칭도형일까 — 도형 종류마다 틀 하나 (평행사변형·직사각형·마름모·정사각형은 그렇다, 이등변삼각형·사다리꼴은 아니다)
      fams.push(famOf(['para', 'rect', 'rhombus', 'square', 'isoTri', 'isoTrap'].map((kind) => {
        const verts = gshape(r, kind); const yes = POINT_YES.has(kind);
        const ok = yes ? '네 — 180° 돌리면 처음 도형과 완전히 겹쳐요' : '아니에요 — 180° 돌리면 처음 도형과 겹치지 않아요';
        const wr = yes
          ? [{ text: '아니에요 — 90°만 돌려서는 겹치지 않아요', tag: TAGS.rot90 }, kind === 'para' ? { text: '아니에요 — 어느 선으로 접어도 겹치지 않아요', tag: TAGS.asLine } : { text: '아니에요 — 돌리면 모양이 달라져요', tag: TAGS.lookWrong }]
          : [{ text: '네 — 반으로 접으면 완전히 겹쳐요', tag: TAGS.lineToPoint }, { text: '네 — 한 바퀴 돌리면 처음과 겹쳐요', tag: TAGS.rot360 }];
        return {
          t: `다음 ${SHAPE_KO[kind]}${josaOf(SHAPE_KO[kind], '은', '는')} 점대칭도형일까요?\n\n[gpoly ${named(verts)}]`,
          text: true, ans: ok, wr,
          steps: ['도형의 가운데에 핀을 꽂고 180° 돌린다고 생각해요', yes ? '처음 도형과 완전히 겹쳐요 → 점대칭도형이에요' : '처음 도형과 겹치지 않아요 → 점대칭도형이 아니에요'],
          why: {
            [TAGS.rot90]: '점대칭도형은 90°가 아니라 180° 돌려서 겹치는지 봐요.',
            [TAGS.asLine]: '접어서 겹치는지는 선대칭이에요. 점대칭은 180° 돌려서 봐요.',
            [TAGS.lookWrong]: '180° 돌린 모양을 다시 그려 봐요 — 처음과 똑같이 겹쳐요.',
            [TAGS.lineToPoint]: '접어서 겹치는 것은 선대칭이에요. 180° 돌리면 겹치지 않아요.',
            [TAGS.rot360]: '한 바퀴(360°) 돌리면 어떤 도형이든 겹쳐요. 점대칭은 반 바퀴(180°)예요.',
          },
          probe: { pointYes: kind },
        };
      })));
      // 대칭의 중심 찾기 — 후보 점 ㉠~㉣ (꼭짓점 수마다 틀 하나)
      fams.push(famOf([2, 3].map((m) => {
        const cc = centerCase(r, m);
        if (!cc) return null;
        return {
          t: `다음 점대칭도형에서 대칭의 중심은 어느 점일까요?\n\n${cc.fig}`,
          text: true, ans: cc.label.C,
          wr: cc.wrongs,
          steps: ['대응점끼리 이은 선분을 그어 봐요', `선분들이 만나는 점 → ${cc.label.C}`],
          why: {
            [TAGS.sideMid]: '변의 가운데가 아니에요 — 대응점끼리 이은 선분들이 만나는 점이에요.',
            [TAGS.pairWrong]: '대응점끼리(180° 돌려 겹치는 점끼리) 이어야 해요.',
            [TAGS.lookWrong]: '대응점끼리 이은 선분을 모두 그어 보면 한 점에서 만나요.',
          },
          probe: { center: true },
        };
      })));
      return calcAsk(r, c, this, runFamily(r, c, fams));
    },
    misread(r, c) {
      if (branchOf(r, c, ['line', 'rot']) === 'line') {
        const verts = gshape(r, 'isoTri');
        const q = `{mon/이/가} 이 이등변삼각형을 보고 이렇게 말했어요.\n\n[gpoly ${named(verts)}]\n\n**선대칭도형이니까 점대칭도형이기도 해요**\n\n어디가 틀렸을까요?`;
        const chs = textChoices(r, '180° 돌리면 겹치지 않아요 — 점대칭도형이 아니에요', [
          { text: '맞게 말했어요', tag: RIGHT_AS_WRONG },
          { text: '이등변삼각형은 선대칭도형이 아니에요', tag: OFF },
          { text: '삼각형은 모두 점대칭도형이에요', tag: OFF },
        ]);
        return {
          ...misreadAsk(this.id, 'line', fill(q, c), chs, {
            solve: solve([step(0, '이등변삼각형을 180° 돌리면 꼭짓점이 아래로 가요'), step(1, '처음 도형과 겹치지 않아요 → 점대칭도형이 아니에요')], {
              whyAny: '선대칭도형이라고 해서 점대칭도형인 것은 아니에요.', rule: '선대칭 ≠ 점대칭 — 180° 돌려서 따로 확인한다.',
            }),
          }),
          probe: { pointYes: 'isoTri' },
        };
      }
      const verts = gshape(r, 'square');
      const q = `{mon/이/가} 이 정사각형을 보고 이렇게 말했어요.\n\n[gpoly ${named(verts)}]\n\n**90° 돌려도 겹치니까, 점대칭도형인지 볼 때는 90° 돌려 보면 돼요**\n\n어디가 틀렸을까요?`;
      const chs = textChoices(r, '점대칭도형은 180° 돌려서 겹치는지 봐요', [
        { text: '맞게 말했어요', tag: RIGHT_AS_WRONG },
        { text: '점대칭도형은 접어서 겹치는지 봐요', tag: TAGS.asLine },
        { text: '정사각형은 점대칭도형이 아니에요', tag: OFF },
      ]);
      return {
        ...misreadAsk(this.id, 'rot', fill(q, c), chs, {
          solve: solve([step(0, '점대칭도형은 대칭의 중심을 중심으로 180° 돌려요'), step(1, '90° 돌려 겹치는 것은 정사각형만의 성질이에요')], {
            whyAny: '점대칭은 언제나 180°예요.', rule: '점대칭 = 180° 돌려서 겹친다.',
          }),
        }),
        probe: { pointYes: 'square' },
      };
    },
  },
  {
    id: 'sym.pointprop', grade: 5, name: '점대칭도형의 성질', needs: ['sym.point'],
    idea: '점대칭도형에서 180° 돌렸을 때 겹치는 점·변·각이 대응점·대응변·대응각이에요. 대응점끼리 이은 선분은 **대칭의 중심을 지나고**, 대칭의 중심이 그 선분을 **똑같이 둘로** 나눠요.',
    rule: '대응점끼리 이은 선분은 대칭의 중심을 지나고, 중심이 반으로 나눈다.',
    slip: '대칭의 중심에 핀을 꽂고 180° 돌린다고 생각하고 겹치는 짝을 찾아요.',
    calc(r, c) {
      const fams = [];
      // 대응점 — 꼭짓점 수·묻는 점마다 틀 하나
      fams.push(famOf([2, 3].flatMap((m) => range0(m).map((i) => {
        const S = pointSymPoly(r, m); const n = 2 * m;
        const ans = `점 ${VNAMES[(i + m) % n]}`;
        const flips = [reflX(S.poly[i], S.c.x), reflY(S.poly[i], S.c.y)]
          .map((q) => S.poly.findIndex((p) => p.x === q.x && p.y === q.y)).filter((j) => j >= 0 && j !== (i + m) % n && j !== i);
        const near = [(i + m + 1) % n, (i + m - 1 + n) % n].filter((j) => j !== i);
        return {
          t: `점대칭도형이에요. 점 ${jm(VNAMES[i], '의')} 대응점은 어느 것일까요?\n\n[sym ${centerTok(S.c)} ${named(S.poly)}]`,
          text: true, ans,
          wr: [...flips.map((j) => ({ text: `점 ${VNAMES[j]}`, tag: TAGS.asLine })), ...near.map((j) => ({ text: `점 ${VNAMES[j]}`, tag: TAGS.pairWrong })), { text: `점 ${VNAMES[i]}`, tag: TAGS.pairWrong }],
          steps: [`대칭의 중심을 중심으로 180° 돌리면 점 ${jm(VNAMES[i], '과')} 겹치는 점을 찾아요`, `→ ${ans}`],
          why: {
            [TAGS.asLine]: `접어서 겹치는 점이 아니라 180° 돌려서 겹치는 점이에요 → ${ans}.`,
            [TAGS.pairWrong]: `점 ${jm(VNAMES[i], '에서')} 대칭의 중심을 지나 같은 거리만큼 더 가면 대응점이에요 → ${ans}.`,
          },
          probe: { pointPair: [VNAMES[i]] },
        };
      }))));
      // 거리 — 글로만 (그림의 비스듬한 거리는 정수가 아니라 그림과 글이 어긋난다)
      fams.push(famOf(['toFull', 'toHalf'].flatMap((way) => ['ㄱ', 'ㄴ'].map((nm) => {
        const d = int(r, 2, 9); const m2 = nm === 'ㄱ' ? 'ㄹ' : 'ㅁ';
        return way === 'toFull' ? {
          t: `점대칭도형 ㄱㄴㄷㄹㅁㅂ에서 점 ${jm(nm, '과')} 점 ${jm(m2, '은')} 대응점이에요. 점 ${jm(nm, '에서')} 대칭의 중심까지의 거리가 ${d} cm일 때, 점 ${jm(nm, '과')} 점 ${m2} 사이의 거리는 몇 cm일까요?`,
          ans: `${2 * d} cm`, unit: ' cm', wr: [{ text: `${d} cm`, tag: TAGS.halfOnly }],
          steps: [`대칭의 중심이 점 ${jm(nm, '과')} 점 ${jm(m2, '을')} 이은 선분을 반으로 나눠요`, `${d} × 2 = ${2 * d} → ${2 * d} cm`],
          why: { [TAGS.halfOnly]: `${d} cm는 대칭의 중심까지예요. 대응점까지는 그 두 배 → ${2 * d} cm.` },
          probe: { pointDist: 'full' },
        } : {
          t: `점대칭도형 ㄱㄴㄷㄹㅁㅂ에서 점 ${jm(nm, '과')} 점 ${jm(m2, '은')} 대응점이에요. 두 점을 이은 선분이 ${2 * d} cm일 때, 점 ${jm(nm, '에서')} 대칭의 중심까지의 거리는 몇 cm일까요?`,
          ans: `${d} cm`, unit: ' cm', wr: [{ text: `${2 * d} cm`, tag: TAGS.noHalf }],
          steps: ['대칭의 중심이 대응점끼리 이은 선분을 반으로 나눠요', `${2 * d} ÷ 2 = ${d} → ${d} cm`],
          why: { [TAGS.noHalf]: `${2 * d} cm는 대응점까지예요. 대칭의 중심까지는 그 반 → ${d} cm.` },
          probe: { pointDist: 'half' },
        };
      }))));
      return calcAsk(r, c, this, runFamily(r, c, fams));
    },
    misread(r, c) {
      if (branchOf(r, c, ['half', 'line']) === 'half') {
        const d = int(r, 2, 9);
        const q = showWork(`점대칭도형에서 대응점 ㄱ과 ㄹ을 이은 선분이 ${2 * d} cm니까, 점 ㄱ에서 대칭의 중심까지도 ${2 * d} cm예요`);
        const chs = textChoices(r, `대칭의 중심이 그 선분을 반으로 나눠요 — ${d} cm예요`, [
          { text: '맞게 말했어요', tag: RIGHT_AS_WRONG },
          { text: `대칭의 중심까지는 ${4 * d} cm예요`, tag: OFF },
          { text: '대칭의 중심은 선분 위에 있지 않아요', tag: OFF },
        ]);
        return {
          ...misreadAsk(this.id, 'half', fill(q, c), chs, {
            solve: solve([step(0, '대응점끼리 이은 선분은 대칭의 중심을 지나요'), step(1, `중심이 반으로 나눠요: ${2 * d} ÷ 2 = ${d} → ${d} cm`)], {
              whyAny: '대응점까지 거리의 반이 대칭의 중심까지예요.', rule: '대칭의 중심이 대응점끼리 이은 선분을 반으로 나눈다.',
            }),
          }),
          probe: { pointDist: 'half', shown: 2 * d },
        };
      }
      // 뒤집어서 고른 대응점 — 좌우로도 대칭인 점대칭도형(직사각형·육각형)을 직접 만든다. 세로선으로 접으면 옆 꼭짓점에 닿는다
      const m = pick(r, [2, 3]);
      const c0 = P(int(r, 4, 6), int(r, 4, 5));
      let vs;
      if (m === 2) { let a = int(r, 1, 4); let b = int(r, 1, 3); while (a === b) { a = int(r, 1, 4); b = int(r, 1, 3); } vs = [P(a, b), P(-a, b)]; }
      else { const a = int(r, 2, 4); const b1 = int(r, 1, 2); const b2 = int(r, b1 + 2, 4); vs = [P(a, b1), P(0, b2), P(-a, b1)]; }
      const half = vs.map((v) => P(c0.x + v.x, c0.y + v.y));
      const poly = [...half, ...half.map((p) => rot180(p, c0))];
      const n = poly.length; const i = 0; const j = m - 1; // 점 ㄱ을 세로선으로 접으면 반쪽의 다른 끝 꼭짓점
      const ans = VNAMES[(i + m) % n];
      const q = `{mon/이/가} 점대칭도형을 보고 이렇게 말했어요.\n\n[sym ${centerTok(c0)} ${named(poly)}]\n\n**점 ${jm(VNAMES[i], '의')} 대응점은 점 ${jm(VNAMES[j], '이에요')}**\n\n어디가 틀렸을까요?`;
      const chs = textChoices(r, `180° 돌려서 겹치는 점이에요 — 점 ${jm(ans, '이에요')}`, [
        { text: '맞게 말했어요', tag: RIGHT_AS_WRONG },
        { text: `점 ${jm(VNAMES[i], '의')} 대응점은 점 ${jm(VNAMES[i], '이에요')}`, tag: OFF },
        { text: '점대칭도형에는 대응점이 없어요', tag: OFF },
      ]);
      return {
        ...misreadAsk(this.id, 'line', fill(q, c), chs, {
          solve: solve([step(0, `점 ${jm(VNAMES[j], '은')} 접어서 겹치는 점이에요`), step(1, `180° 돌려서 겹치는 점 → 점 ${ans}`)], {
            whyAny: '점대칭의 대응점은 접지 말고 180° 돌려서 찾아요.', rule: '대응점 = 대칭의 중심을 지나 반대쪽.',
          }),
        }),
        probe: { pointPair: [VNAMES[i]], shown: VNAMES[j] },
      };
    },
  },
  {
    id: 'sym.pointdraw', grade: 5, name: '⭐ 점대칭도형 완성하기', needs: ['sym.pointprop'],
    idea: '점대칭도형을 완성할 때는 각 꼭짓점에서 **대칭의 중심을 지나는** 선을 긋고, 중심까지와 **같은 거리만큼 더 간 곳**에 대응점을 찍어 이어요.',
    rule: '대응점 = 대칭의 중심을 지나 반대쪽, 같은 거리. 접듯이 뒤집거나 옆으로 밀지 않는다.',
    slip: '대칭의 중심까지 가로·세로 몇 칸인지 세고, 중심에서 같은 칸 수만큼 더 가요.',
    calc(r, c) {
      // 반쪽 + 대칭의 중심 + 후보 점 ㉠~㉣ — 반쪽 꼭짓점 수·묻는 점마다 틀 하나
      const fams = [famOf([2, 3].flatMap((m) => range1(m - 1).map((i) => {
        const pc = pointDrawCase(r, m, i);
        if (!pc) return null;
        const nm = VNAMES[i];
        return {
          t: `점대칭도형이 되도록 완성하려고 해요. 점 ${jm(nm, '의')} 대응점은 어느 것일까요?\n\n${pc.fig}`,
          text: true, ans: pc.label.R,
          wr: [{ text: pc.label.V, tag: TAGS.asLine }, { text: pc.label.H, tag: TAGS.asLine }, { text: pc.label.T, tag: TAGS.slide }],
          steps: [`점 ${jm(nm, '에서')} 대칭의 중심까지 가로 ${pc.dx}칸 · 세로 ${pc.dy}칸`, `중심에서 같은 쪽으로 가로 ${pc.dx}칸 · 세로 ${pc.dy}칸 더 → ${pc.label.R}`],
          why: {
            [TAGS.asLine]: '접듯이 뒤집은 자리예요. 점대칭은 대칭의 중심을 지나 반대쪽으로 같은 거리만큼 가요.',
            [TAGS.slide]: '옆으로 그대로 밀면 안 돼요 — 대칭의 중심을 지나 반대쪽이에요.',
          },
          draw: { fig: pc.base, mode: 'grid', target: [pc.R.x, pc.R.y], cands: pc.cands, from: [pc.p.x, pc.p.y] },
          probe: { pointDraw: nm },
        };
      })))];
      return calcAsk(r, c, this, runFamily(r, c, fams));
    },
    misread(r, c) {
      const br = branchOf(r, c, ['flip', 'slide']);
      let pc = null;
      for (let t = 0; t < 20 && !pc; t++) pc = pointDrawCase(r, 3, 1);
      const nm = VNAMES[1];
      const star = br === 'flip' ? pc.V : pc.T;
      const q = `{mon/이/가} 점대칭도형을 완성하려고 점 ${jm(nm, '의')} 대응점을 ★에 찍었어요.\n\n[${pc.base} ★@${star.x},${star.y}]\n\n어디가 틀렸을까요?`;
      const okText = br === 'flip' ? '★은 접듯이 뒤집은 자리예요 — 대칭의 중심을 지나 반대쪽으로 같은 거리만큼 가요' : '★은 옆으로 밀어 놓은 자리예요 — 대칭의 중심을 지나 반대쪽으로 가요';
      const chs = textChoices(r, okText, [
        { text: '맞게 찍었어요', tag: RIGHT_AS_WRONG },
        { text: '대응점은 대칭의 중심에 찍어야 해요', tag: OFF },
        { text: br === 'flip' ? '★은 옆으로 밀어 놓은 자리예요' : '★은 접듯이 뒤집은 자리예요', tag: br === 'flip' ? TAGS.slide : TAGS.asLine },
      ]);
      return {
        ...misreadAsk(this.id, br, fill(q, c), chs, {
          solve: solve([step(0, `점 ${jm(nm, '에서')} 대칭의 중심까지 가로 ${pc.dx}칸 · 세로 ${pc.dy}칸`), step(1, '중심에서 같은 쪽으로 같은 칸 수만큼 더 가요 — 그 자리가 대응점')], {
            whyAny: '점대칭의 대응점은 대칭의 중심을 지나 반대쪽, 같은 거리예요.', rule: '대칭의 중심을 지나 반대쪽, 같은 거리.',
          }),
        }),
        probe: { pointDraw: nm, star: [star.x, star.y] },
      };
    },
  },
];

export function conceptById(id) {
  return SYM.find((c) => c.id === id) || null;
}

// ───────────────────── 문항 만들기 (mathrange와 같은 모양) ─────────────────────

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
const SLIP = '한 번 더 천천히 — 포개 보거나 접어 보는 그림을 머릿속에 그려 봐요.';

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
  return diagnosticOf(SYM, makeQuestion, seed, n, opts);
}
export function placeFrom(answers) {
  return placeFromOf(SYM, answers);
}
export function ladder(doneIds) {
  return ladderOf(SYM, doneIds);
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
function fracValue(text) {
  const v = valueOf(text);
  if (v === null) return null;
  return { n: Math.round(v * 10000), d: 10000 };
}

/**
 * coach/math/sym.json 형식 검사 — mathrange.checkContent와 같은 규칙
 * @returns {string[]}
 */
export function checkContent(content) {
  const bad = [];
  for (const c of SYM) {
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

// 테스트·나머지 칸이 같이 쓰는 도구
export const _geo = { P, d2, cross, longSides, isInt, sideLen, noCollinear, reflX, reflY, rot180, ISO, selfMaps, bbox, area2, lineSymPoly, pointSymPoly, axisRefl, axisDist, named, congruentPair, pairDirective, corrName, posSameName };
export const _kit = { famOf, runFamily, calcAsk, choices, textChoices, sameSide, branchOf, misreadAsk, showWork, step, jn, jm, RIGHT_AS_WRONG, OFF, valueOf };
