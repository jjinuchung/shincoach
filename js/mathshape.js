// 📐 수학 — J 삼각형·사각형 줄기 (초4-2 「삼각형」·「사각형」·「다각형」 + 4-1 각도의 합):
// 개념 사다리 + 문제 생성기 + 내용 형식 검사. 순수 함수만 — 화면 없음 (node 테스트에서 그대로 돈다).
//
// 왜 이 줄기인가 (2026-09-30, 아버님 "새 줄기로 가자" → J 선택): 도형 성질 칸이 하나도 없었고, I 둘레와 넓이 줄기가
// 평행사변형·사다리꼴·마름모라는 이름과 포함관계(정사각형도 마름모 — Codex 16차 #2)를 안다고 친다. 초4-2 = 지금 학기.
//
// 오답은 아이가 실제로 하는 틀린 생각 흉내다:
//   · 만나기만 하면 수직 · 세로로 선 선이면 수직 · 짧게 그려 안 만나 보이면 평행 · 비스듬한 선분을 평행선 사이의 거리로
//   · 정삼각형은 이등변삼각형이 아니다 · 두 변만 같아도 정삼각형 · 예각이 하나만 있어도 예각삼각형 · 90°를 둔각으로
//   · ★ 사다리꼴은 평행한 변이 한 쌍"뿐" · 정사각형은 직사각형(마름모)이 아니다 · 기울어진 정사각형은 정사각형이 아니다
//   · 마름모는 네 각이 직각 · 대각선을 두 번 셈 · 삼각형 세 각의 합을 360°로 · 이등변삼각형 밑각을 둘로 안 나눔
//
// 도형은 **문제 글 속 그림 지시문**(mathdraw.js): 모눈 위 도형 `[gpoly ㄱ:0,0 ㄴ:6,0 …]` — 꼭짓점이 모눈점이라 평행·수직·같은 길이를
// 아이가 칸으로 셀 수 있다 · 모눈 위 직선 `[lines W H ㉮:x1,y1,x2,y2 …]` · 세 변 `[tris 5 5 6]` · 세 각 `[tria 50 60 ?70]` · 네 각 `[quad …]`.
// ★ 테스트가 지시문에서 꼭짓점을 따로 읽어 평행(외적)·수직(내적)·같은 길이·각을 다시 계산하고, 보기 문장의 참거짓을 정한다.

import { VNAMES } from './mathdraw.js';
import { rng, shuffle, fill, castOf, worldPick, ask, solve, int, pick, pickFamily, humanQuestion, checkHuman, diagnosticOf, placeFromOf, ladderOf, josa, numJosa } from './mathgen.js';
import { gradeLabel, valueOf as numValue } from './mathmix.js';
import { figureSvg } from './mathdraw.js';

export { gradeLabel };

// ───────────────────── 글자 ─────────────────────

/** 보기 글자 → 값 (겹침 검사용). 이름·문장 보기는 null */
export function valueOf(text) {
  const s = String(text == null ? '' : text).trim();
  if (/[가-힣ㄱ-ㅎ㉠-㉯]/.test(s)) return null;
  return numValue(s.replace(/ ?(cm|°|개)$/, ''));
}
const sameValue = (a, b) => a !== null && b !== null && Math.abs(a - b) < 1e-9;

/** 낱말 + 조사 — ㄱ·ㄴ 같은 자모로 끝나면 이름(기역·니은…)이 받침으로 끝나므로 받침 쪽 */
const jw = (w, a, b) => w + (/[ㄱ-ㅎ]$/.test(w) ? a : josa(w, a, b));
const BAT = new Set(['0', '1', '3', '6', '7', '8']);
const lastDigit = (t) => String(t).replace(/\D+$/, '').slice(-1);
/** 수 글자 + 조사 */
const jn = (t, withB, without) => { const s = String(t); return s + (BAT.has(lastDigit(s)) ? withB : without); };

// 이름 문장 — "이 사각형은 …"에 붙는다. 테스트가 같은 말투를 따로 읽어 참거짓을 정한다
const IS = (n) => jw(n, '이에요', '예요');
const ISNOT = (n) => `${jw(n, '이', '가')} 아니에요`;
const AND = (a, b) => `${jw(a, '이면서', '면서')} ${IS(b)}`;
const BUTNOT = (a, b) => `${jw(a, '이지만', '지만')} ${jw(b, '은', '는')} 아니에요`;
const NEITHER = (a, b) => `${a}도 ${b}도 아니에요`;

// ───────────────────── 보기 ─────────────────────

function nearOf(answer, k) {
  const v = Number(answer); const st = [1, -1, 2, -2, 5, -5, 10, -10][k % 8];
  return Number.isInteger(v) && v + st > 0 ? String(v + st) : '';
}
/** 수 보기 4개 — 정답 + 오개념 오답. 자연수만, 값이 같으면 하나로 */
function choices(r, answer, wrongs) {
  const list = [{ text: String(answer), ok: true }];
  const vals = [valueOf(answer)];
  const seen = new Set([String(answer)]);
  const dup = (t) => { const v = valueOf(t); return seen.has(String(t)) || (v !== null && vals.some((x) => sameValue(x, v))); };
  const add = (t, tag) => { seen.add(String(t)); vals.push(valueOf(t)); list.push({ text: String(t), ok: false, tag }); };
  for (const w of wrongs) {
    if (!w || w.text === undefined || w.text === '' || !Number.isInteger(Number(w.text)) || Number(w.text) <= 0 || dup(w.text) || list.length >= 4) continue;
    add(w.text, w.tag);
  }
  for (let k = 0; list.length < 4 && k < 30; k++) {
    const alt = nearOf(answer, k);
    if (alt && !dup(alt)) add(alt, '계산 실수');
  }
  return shuffle(r, list);
}
/** 문장·이름 보기 — 근처 수로 채우지 않는다 */
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
/** ② 갈래 — 요청(want)을 먼저 (Codex 12차 P1, 다른 줄기와 같은 규칙) */
function branchOf(r, c, names) {
  const want = c && c.want && c.want.startsWith('misread:') ? c.want.slice(8) : '';
  if (names.includes(want)) return want;
  const fresh = names.filter((n) => !(c && c.recent && c.recent.includes(`misread:${n}`)));
  return pick(r, fresh.length ? fresh : names);
}
/** 요청한 틀(want)에 든 낱말(도형 이름)을 다시 고른다 — 무작위로 새로 뽑으면 🔁 쌍둥이가 다른 틀로 간다 */
function pickFor(r, c, list, has) {
  if (c && c.want) {
    const hit = list.filter((x) => has(x, c.want));
    if (hit.length) return hit[hit.length - 1];
  }
  return pick(r, list);
}
const showWork = (line, verb = '말했어요') => `{mon/이/가} 이렇게 ${verb}.\n\n**${line}**\n\n어디가 틀렸을까요?`;
const step = (no, text) => `${['①', '②', '③', '④'][no] || '·'} ${text}`;

const RIGHT_AS_WRONG = '틀린 줄 모름';
const OFF = '엉뚱한 지적';

/** 이 줄기의 오개념 이름표 (📊·🤔 노트에 그대로 뜬다) */
export const TAGS = {
  meetAsPerp: '만나기만 하면 수직이라고 봄',
  uprightAsPerp: '세로로 선 선을 수직이라고 봄',
  apartAsPerp: '만나지 않는 선을 수직이라고 봄',
  looksParallel: '짧게 그려 안 만나 보이면 평행이라고 봄',
  perpAsPara: '수직인 두 직선을 평행이라고 봄',
  slantAsDist: '비스듬한 선분의 길이를 평행선 사이의 거리로 씀',
  eqNotIsos: '정삼각형은 이등변삼각형이 아니라고 봄',
  twoAsAll: '두 변만 같아도 정삼각형이라고 봄',
  missEqual: '길이가 같은 변을 못 봄',
  looksEqual: '비슷한 길이를 같다고 봄',
  missSide: '숨긴 변을 빼고 더함',
  allEqual: '세 변이 모두 같다고 봄',
  wrongPair: '다른 두 변이 같다고 봄',
  isoAngleSub: '같은 각을 180°에서 뺌',
  isoApex: '같은 두 각 대신 다른 한 각을 구함',
  oneAcute: '예각이 하나만 있어도 예각삼각형이라고 봄',
  rightAsObtuse: '직각을 둔각으로 봄',
  obtuseAsRight: '둔각을 직각으로 봄',
  wrongBiggest: '가장 큰 각을 잘못 봄',
  trapOnlyOne: '사다리꼴은 평행한 변이 한 쌍뿐이라고 봄',
  oneAsTwo: '평행한 변이 한 쌍이어도 평행사변형이라고 봄',
  missParallel: '평행한 변을 못 찾음',
  oppAsAdj: '마주 보는 각을 180°에서 뺌',
  oppFrom360: '마주 보는 각을 360°에서 뺌',
  adjSame: '이웃한 각도 크기가 같다고 봄',
  rhomRight: '마름모는 네 각이 직각이라고 봄',
  sidesAsSquare: '네 변만 같으면 정사각형이라고 봄',
  tiltNotSquare: '기울어진 정사각형은 정사각형이 아니라고 봄',
  rightAsRhom: '네 각이 직각이면 마름모라고 봄',
  rectAsSquare: '직사각형을 정사각형이라고 봄',
  squareNotRect: '정사각형은 직사각형이 아니라고 봄',
  squareNotRhom: '정사각형은 마름모가 아니라고 봄',
  specialNotPara: '직사각형·마름모는 평행사변형이 아니라고 봄',
  countWrong: '변의 수를 잘못 셈',
  sidesOnlyReg: '변만 같으면 정다각형이라고 봄',
  anglesOnlyReg: '각만 같으면 정다각형이라고 봄',
  wrongReason: '같은 것과 다른 것을 거꾸로 봄',
  diagNoHalf: '대각선을 두 번 셈 (÷ 2를 빠뜨림)',
  diagWithSides: '이웃한 꼭짓점을 이은 선분도 대각선으로 셈',
  diagOneVertex: '한 꼭짓점에서 그은 대각선만 셈',
  triAs360: '삼각형의 세 각의 합을 360°로 봄',
  quadAs180: '사각형의 네 각의 합을 180°로 봄',
  addNotSub: '아는 각을 더하기만 함',
  missOne: '아는 각 하나를 빼지 않음',
  noHalfBase: '두 밑각으로 나누지 않음',
  apexAsBase: '꼭짓각과 밑각이 같다고 봄',
  sumNotEach: '각의 합을 한 각으로 봄',
  centerAngle: '360°를 나눔 (한 각이 아니다)',
};

// ───────────────────── 도형 재료 ─────────────────────

const W0 = 10; const H0 = 8; // 직선 그림의 모눈 (한 칸 1 cm)
/** 점 p에서 방향 q로 모눈 안에서 양쪽으로 가장 길게 — 양쪽으로 한 걸음 이상 못 가면 null */
function through(p, q, W = W0, H = H0) {
  const inside = (x, y) => x >= 0 && x <= W && y >= 0 && y <= H;
  let a = 0; while (inside(p[0] + (a + 1) * q[0], p[1] + (a + 1) * q[1])) a++;
  let b = 0; while (inside(p[0] - (b + 1) * q[0], p[1] - (b + 1) * q[1])) b++;
  if (a < 1 || b < 1) return null;
  return [p[0] - b * q[0], p[1] - b * q[1], p[0] + a * q[0], p[1] + a * q[1]];
}
const seg = (label, s, len = false) => `${label ? `${label}:` : ''}${s.join(',')}${len ? '=' : ''}`;
const cross = (a, b) => a[0] * b[1] - a[1] * b[0];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1];
/** 두 선분이 만나는가 (끝점 포함) */
function segMeet(s, t) {
  const o = (a, b, c) => Math.sign((b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]));
  const [p1, p2, p3, p4] = [[s[0], s[1]], [s[2], s[3]], [t[0], t[1]], [t[2], t[3]]];
  return o(p1, p2, p3) !== o(p1, p2, p4) && o(p3, p4, p1) !== o(p3, p4, p2);
}
const CIRC = ['㉮', '㉯', '㉰', '㉱'];
const SEGN = ['㉠', '㉡', '㉢'];

/** 사각형 — 모눈 위 꼭짓점 네 개 (반시계), 종류마다 모양을 고른다. 좌표는 0~12 */
function quadOf(r, type, tilt = false) { // tilt: 정사각형을 기울어진 것만 (기울기를 두고 말하는 문항)
  let pts;
  if (type === 'trap') { // 평행한 변이 딱 한 쌍 (아랫변 ∥ 윗변, 길이가 달라 옆변끼리는 안 평행)
    const b = int(r, 6, 10); const a = int(r, 2, b - 3); const h = int(r, 2, 5); const s = int(r, 0, b - a);
    pts = [[0, 0], [b, 0], [s + a, h], [s, h]];
  } else if (type === 'para') { // 평행사변형 (직사각형·마름모가 아닌)
    const b = int(r, 4, 9); const h = int(r, 2, 5); let s = int(r, 1, 3);
    if (b * b === s * s + h * h) s = s === 3 ? 2 : s + 1; // 옆변 = 밑변이면 마름모
    pts = [[0, 0], [b, 0], [b + s, h], [s, h]];
  } else if (type === 'rhom') { // 마름모 (정사각형이 아닌) — 대각선이 모눈을 따르는 것 · 세 수로 비스듬한 것
    if (r() < 0.5) { const w = int(r, 2, 4); let h = int(r, 2, 5); if (h === w) h += 1; pts = [[0, h], [w, 0], [2 * w, h], [w, 2 * h]]; } else {
      const [dx, dy, s] = pick(r, [[3, 4, 5], [4, 3, 5]]); pts = [[0, 0], [s, 0], [s + dx, dy], [dx, dy]];
    }
  } else if (type === 'rect') { // 직사각형 (정사각형이 아닌) — 모눈을 따르거나 기울어진 것
    if (r() < 0.6) { const w = int(r, 3, 9); let h = int(r, 2, 6); if (h === w) h = w > 3 ? w - 1 : w + 1; pts = [[0, 0], [w, 0], [w, h], [0, h]]; } else {
      const [a, b] = pick(r, [[2, 1], [3, 1], [1, 2]]); const m = 2; // 변 (a,b)와 (−b·m, a·m)
      pts = [[b * m, 0], [b * m + a, b], [b * m + a - b * m, b + a * m], [0, a * m]];
    }
  } else if (type === 'square') { // 정사각형 — 모눈을 따르거나 기울어진 것
    if (!tilt && r() < 0.4) { const s = int(r, 3, 6); pts = [[0, 0], [s, 0], [s, s], [0, s]]; } else {
      const [a, b] = pick(r, [[2, 1], [3, 1], [3, 2], [4, 1], [1, 2]]);
      pts = [[b, 0], [a + b, b], [a, a + b], [0, a]];
    }
  } else { // 평행한 변이 없는 사각형
    for (let k = 0; k < 40; k++) {
      const b = int(r, 5, 9); const p = [int(r, b - 2, b + 1), int(r, 2, 5)]; const q = [int(r, 0, 3), int(r, 2, 6)];
      const P = [[0, 0], [b, 0], p, q];
      const e = P.map((u, i) => [P[(i + 1) % 4][0] - u[0], P[(i + 1) % 4][1] - u[1]]);
      if (cross(e[0], e[2]) !== 0 && cross(e[1], e[3]) !== 0 && e.every((v, i) => cross(v, e[(i + 1) % 4]) > 0) && p[1] !== q[1]) { pts = P; break; }
    }
    if (!pts) pts = [[0, 0], [7, 0], [6, 4], [1, 2]];
  }
  return pts;
}
const gp = (pts) => `[gpoly ${pts.map((p, i) => `${VNAMES[i]}:${p[0]},${p[1]}`).join(' ')}]`;
const FIG4 = { trap: '사다리꼴', para: '평행사변형', rhom: '마름모', rect: '직사각형', square: '정사각형', none: '사각형' };

// ───────────────────── 문항 마무리 ─────────────────────

function finish(id, r, c, f) {
  const F = (t) => fill(t, c);
  const wr = f.wr.filter(Boolean).map((w) => ({ ...w, text: F(w.text) }));
  const chs = f.words ? textChoices(r, F(f.ans), wr) : choices(r, f.ans, wr);
  return {
    ...ask(id, 'calc', F(worldPick(r, c, f.pools)), chs, {
      solve: solve(f.steps.map((t, i) => step(i, F(t))), {
        why: Object.fromEntries(Object.entries(f.why || {}).map(([k, v]) => [k, F(v)])),
        rule: f.rule,
      }),
    }),
  };
}
function finishMis(id, branch, r, c, m) {
  const F = (t) => fill(t, c);
  const chs = textChoices(r, F(m.ok), m.wr.map((w) => ({ ...w, text: F(w.text) })));
  return {
    ...ask(id, 'misread', F(m.q), chs, { solve: solve(m.steps.map((t, i) => step(i, F(t))), { whyAny: F(m.whyAny), rule: m.rule }) }),
    key: `misread:${branch}`,
  };
}

// ───────────────────── 장면 ─────────────────────

/** J1 수직 장면 — 직선 ㉮에 수직 하나, 만나지만 비스듬한 것 하나, 세로로 선 것(㉮가 기울었을 때) 또는 안 만나는 것 하나 */
function perpScene(r, tilt = false) {
  for (let k = 0; k < 60; k++) {
    // tilt: ② "세로로 선 직선" 갈래 — ㉮가 기울어야 세로 직선이 수직이 아니다 (🔁 쌍둥이가 그 갈래를 요청해도 만들 수 있게)
    const d = pick(r, tilt ? [[2, 1], [2, -1], [3, 1], [3, -1]] : [[1, 0], [2, 1], [2, -1], [3, 1], [3, -1], [1, 0]]);
    const base = through([5, 4], d); if (!base) continue;
    const pts = []; for (let t = -3; t <= 3; t++) { const p = [5 + t * d[0], 4 + t * d[1]]; if (p[0] >= 1 && p[0] <= 9 && p[1] >= 1 && p[1] <= 7) pts.push(p); }
    if (pts.length < 3) continue;
    const [p1, p2, p3] = shuffle(r, pts);
    const perp = through(p1, [-d[1], d[0]]);
    const q = pick(r, [[1, 1], [1, -1], [1, 2], [1, -2], [2, 3], [2, -3], [1, 3], [1, -3]].filter((v) => cross(v, d) !== 0 && dot(v, d) !== 0));
    const slant = through(p2, q);
    const tilted = d[1] !== 0;
    // ㉮가 기울었으면 세로로 선 직선(수직처럼 보인다), 가로면 ㉮와 만나지 않는 가로 직선
    const fourth = tilted ? through(p3, [0, 1]) : through([int(r, 1, 3), r() < 0.5 ? 7 : 1], [1, 0]);
    if (!perp || !slant || !fourth) continue;
    if (!tilted && fourth[1] === base[1]) continue;
    return { base, perp, slant, fourth, fourthTag: tilted ? TAGS.uprightAsPerp : TAGS.apartAsPerp, tilted };
  }
  return { base: [0, 4, 10, 4], perp: [3, 0, 3, 8], slant: [5, 0, 9, 8], fourth: [0, 7, 10, 7], fourthTag: TAGS.apartAsPerp, tilted: false };
}
/** J2 평행 장면 — 평행한 두 직선, 짧게 그려 안 만나 보이는 것(늘이면 만난다), 수직인 것 */
function paraScene(r) {
  const FAM = [
    { d: [1, 0], near: [[6, 1], [6, -1], [5, 1]] },
    { d: [0, 1], near: [[1, 6], [-1, 6], [1, 5]] },
    { d: [1, 1], near: [[4, 3], [3, 4]] },
    { d: [1, -1], near: [[4, -3], [3, -4]] },
  ];
  for (let k = 0; k < 80; k++) {
    const F = pick(r, FAM); const d = F.d;
    const p1 = [int(r, 1, 9), int(r, 1, 7)]; const p2 = [int(r, 1, 9), int(r, 1, 7)];
    if (cross([p2[0] - p1[0], p2[1] - p1[1]], d) === 0) continue; // 같은 직선
    const l1 = through(p1, d); const l2 = through(p2, d);
    const nd = pick(r, F.near); const p3 = [int(r, 1, 9), int(r, 1, 7)];
    let near = through(p3, nd, W0, H0); if (!near) continue;
    // 짧게: 한 걸음씩만 — 그림 안에서 ㉮와 만나지 않게
    near = [p3[0] - nd[0], p3[1] - nd[1], p3[0] + nd[0], p3[1] + nd[1]];
    if (near.some((v, i) => v < 0 || v > (i % 2 ? H0 : W0))) continue;
    const perp = through([int(r, 1, 9), int(r, 1, 7)], [-d[1], d[0]]);
    if (!l1 || !l2 || !perp) continue;
    if (segMeet(near, l1) || segMeet(near, l2)) continue;
    // 네 선이 서로 너무 가깝게 겹치지 않게 (끝점이 같은 것도 피한다)
    const ends = [l1, l2, near, perp].map((s) => `${s[2]},${s[3]}`);
    if (new Set(ends).size < 4) continue;
    return { l1, l2, near, perp };
  }
  return { l1: [0, 1, 10, 1], l2: [0, 5, 10, 5], near: [2, 2, 8, 3], perp: [7, 0, 7, 8] };
}
/** 평행선 사이의 거리 장면 — 가로 평행선 둘(거리 d) + 수직 선분 하나 + 비스듬한 선분 둘(세 수라 길이가 정수) */
function distScene(r) {
  const [d, dx, L] = pick(r, [[3, 4, 5], [4, 3, 5], [6, 8, 10], [8, 6, 10], [4, 3, 5], [3, 4, 5]]);
  const W = 12; const H = d + 2; const y0 = 1;
  // 수직 선분은 왼쪽 끝, 비스듬한 둘은 x = 3부터 — 짧으면 나란히(/ \), 길면(6·8칸) X자로 겹친다
  const g = dx >= 6 ? 0 : dx + 1;
  let segs = { v: [1, y0, 1, y0 + d], s1: [3, y0, 3 + dx, y0 + d], s2: [3 + dx + g, y0, 3 + g, y0 + d] };
  if (r() < 0.5) segs = Object.fromEntries(Object.entries(segs).map(([k, s]) => [k, [W - s[0], s[1], W - s[2], s[3]]])); // 좌우 뒤집기
  const names = shuffle(r, SEGN);
  return { d, L, W, H, y0, segs, name: { v: names[0], s1: names[1], s2: names[2] } };
}
// 지시문 안 순서는 이름순(이름 없는 평행선 먼저)으로 고정 — 역할(수직·비스듬)만 섞는다. 순서까지 섞으면 틀 열쇠(tplKey)가 매번 달라
// 🔁 쌍둥이가 같은 틀을 못 찾았다
const LORDER = ['', '㉮', '㉯', '㉰', '㉱', '㉠', '㉡', '㉢'];
const labelOf = (s) => (s.includes(':') ? s.split(':')[0] : '');
const linesFig = (W, H, items) => `[lines ${W} ${H} ${[...items].sort((a, b) => LORDER.indexOf(labelOf(a)) - LORDER.indexOf(labelOf(b))).join(' ')}]`;
/** 사각형의 아는 세 각 (65°~115°) — 모르는 넷째 각이 45°~140°가 되게 (40°에서 세 가지가 그림으로 안 닫혔다) */
function quadAngles(r) {
  for (let k = 0; k < 50; k++) {
    const q = [5 * int(r, 13, 23), 5 * int(r, 13, 23), 5 * int(r, 13, 23)];
    const s = q[0] + q[1] + q[2];
    if (s >= 220 && s <= 315) return q;
  }
  return [80, 95, 110];
}

/** J8 볼록 다각형 — 꼭짓점 n개 (모눈점, 세 점이 한 줄에 서지 않게) */
const POLYN = { 5: [[[2, 0], [6, 0], [8, 3], [4, 6], [0, 3]], [[1, 0], [6, 0], [7, 4], [3, 6], [0, 3]]], 6: [[[2, 0], [6, 0], [8, 3], [6, 6], [2, 6], [0, 3]], [[1, 0], [5, 0], [7, 2], [6, 5], [2, 6], [0, 3]]], 7: [[[2, 0], [6, 0], [8, 2], [8, 5], [5, 7], [1, 6], [0, 3]]], 8: [[[2, 0], [5, 0], [7, 2], [7, 5], [5, 7], [2, 7], [0, 5], [0, 2]]] };
const NGON = { 3: '삼각형', 4: '사각형', 5: '오각형', 6: '육각형', 7: '칠각형', 8: '팔각형', 9: '구각형', 10: '십각형' };
const REGN = { 3: '정삼각형', 4: '정사각형', 5: '정오각형', 6: '정육각형', 7: '정칠각형', 8: '정팔각형' };

// ───────────────────── 개념 사다리 (J. 삼각형·사각형 줄기) ─────────────────────

export const SHAPE = [
  {
    id: 'shp.perp', grade: 4, name: '수직과 수선', needs: [],
    idea: '두 직선이 만나서 이루는 각이 **직각**이면 두 직선은 서로 **수직**이에요. 이때 한 직선을 다른 직선에 대한 **수선**이라고 해요. 만나기만 해서는 안 되고, 세로로 서 있다고 수직인 것도 아니에요 — **직각**으로 만나야 해요.',
    slip: '두 직선이 만나는 곳에 삼각자의 직각을 대 본다고 생각해 봐요.',
    calc(r, c) {
      const S = perpScene(r);
      const lab = shuffle(r, ['㉯', '㉰', '㉱']);
      const [lp, ls, lf] = lab;
      const fig = linesFig(W0, H0, [seg('㉮', S.base), seg(lp, S.perp), seg(ls, S.slant), seg(lf, S.fourth)]);
      // 모눈 위 변 — ㄱㄴ에 수직인 변 (ㄴ에서 직각, 다른 꼭짓점은 비스듬히)
      // ㄹ은 대각선 ㄱㄷ보다 위(b × hs − s × h ≥ b) — 아니면 ㄹ이 대각선 위에 서거나 오목해서 사각형처럼 안 보인다
      const b = int(r, 5, 9); const h = int(r, 3, 6); let hs = h + 1; let s = 1;
      for (let k = 0; k < 30; k++) { hs = int(r, 2, 7); s = int(r, 1, b - 2); if (hs !== h && b * hs - s * h >= b) break; hs = h + 1; s = 1; }
      const P = [[0, 0], [b, 0], [b, h], [s, hs]];
      const fams = [
        { words: true, ans: `직선 ${lp}`, wr: [{ text: `직선 ${ls}`, tag: TAGS.meetAsPerp }, { text: `직선 ${lf}`, tag: S.fourthTag }],
          why: {
            [TAGS.meetAsPerp]: `직선 ${ls}도 직선 ㉮와 만나지만, 만나서 이루는 각이 직각이 아니에요.`,
            [S.fourthTag]: S.tilted ? `직선 ${lf}는 세로로 서 있지만 직선 ㉮가 기울어져 있어서 둘이 이루는 각은 직각이 아니에요.` : `직선 ${lf}는 직선 ㉮와 아무리 늘여도 만나지 않아요. 수직은 직각으로 만나야 해요.`,
          },
          steps: ['수직 = 두 직선이 만나서 이루는 각이 직각', `직각으로 만나는 것은 직선 ${lp}`],
          rule: '두 직선이 만나서 이루는 각이 직각이면 서로 수직이다.',
          pools: { pokemon: [`모눈 위에 직선 네 개를 그렸어요.\n\n${fig}\n\n직선 ㉮에 수직인 직선은 어느 것일까요?`, `{mon/이/가} 모눈종이에 직선을 그렸어요.\n\n${fig}\n\n직선 ㉮에 대한 수선은 어느 것일까요?`] } },
        { words: true, ans: '변 ㄴㄷ', wr: [{ text: '변 ㄹㄱ', tag: TAGS.meetAsPerp }, { text: '변 ㄷㄹ', tag: TAGS.apartAsPerp }],
          why: {
            [TAGS.meetAsPerp]: '변 ㄹㄱ도 변 ㄱㄴ과 만나지만 비스듬해서 직각이 아니에요.',
            [TAGS.apartAsPerp]: '변 ㄷㄹ은 변 ㄱㄴ과 만나지 않아요. 수직은 만나서 직각을 이뤄야 해요.',
          },
          steps: ['변 ㄱㄴ과 만나는 변: 변 ㄴㄷ, 변 ㄹㄱ', '모눈을 보면 변 ㄴㄷ만 직각으로 만나요'],
          rule: '두 직선이 만나서 이루는 각이 직각이면 서로 수직이다.',
          pools: { pokemon: [`모눈 위에 그린 도형이에요.\n\n${gp(P)}\n\n변 ㄱㄴ에 수직인 변은 어느 것일까요?`] } },
      ];
      return finish(this.id, r, c, pickFamily(r, c, fams));
    },
    misread(r, c) {
      const br = branchOf(r, c, ['meet', 'upright']);
      const S = perpScene(r, br === 'upright');
      const [lp, ls, lf] = shuffle(r, ['㉯', '㉰', '㉱']);
      const fig = linesFig(W0, H0, [seg('㉮', S.base), seg(lp, S.perp), seg(ls, S.slant), seg(lf, S.fourth)]);
      if (br === 'upright') {
        return finishMis(this.id, 'upright', r, c, {
          q: `모눈 위에 직선 네 개를 그렸어요.\n\n${fig}\n\n${showWork(`직선 ${lf}는 똑바로 서 있으니까 직선 ㉮에 수직이에요`)}`,
          ok: `직선 ㉮가 기울어져 있어서 직각이 아니에요 — 수직인 것은 직선 ${lp}`,
          wr: [
            { text: '맞게 말했어요', tag: RIGHT_AS_WRONG },
            { text: `직선 ${ls}도 직선 ㉮와 만나니까 수직이에요`, tag: TAGS.meetAsPerp },
            { text: '직선끼리는 수직일 수 없어요', tag: OFF },
          ],
          steps: ['수직은 두 직선이 이루는 각이 직각일 때', `직선 ㉮와 직각으로 만나는 것은 직선 ${lp}`],
          whyAny: '세로로 서 있다고 수직이 아니에요. 두 직선이 만나서 이루는 각이 직각이어야 해요.',
          rule: '수직은 두 직선이 이루는 각으로 정한다 (세로로 서 있는지가 아니다).',
        });
      }
      return finishMis(this.id, 'meet', r, c, {
        q: `모눈 위에 직선 네 개를 그렸어요.\n\n${fig}\n\n${showWork(`직선 ${ls}는 직선 ㉮와 만나니까 수선이에요`)}`,
        ok: `만나서 이루는 각이 직각이 아니에요 — 수선은 직선 ${lp}`,
        wr: [
          { text: '맞게 말했어요', tag: RIGHT_AS_WRONG },
          { text: `직선 ${lf}${josa(lf, '이', '가')} 수선이에요`, tag: S.fourthTag },
          { text: '수선은 가장 긴 직선이에요', tag: OFF },
        ],
        steps: ['수선 = 직각으로 만나는 직선', `직선 ㉮와 직각으로 만나는 것은 직선 ${lp}`],
        whyAny: '만나기만 하면 수선이 아니에요. 만나서 이루는 각이 직각이어야 해요.',
        rule: '두 직선이 만나서 이루는 각이 직각이면 서로 수직이고, 한 직선은 다른 직선에 대한 수선이다.',
      });
    },
  },

  {
    id: 'shp.para', grade: 4, name: '평행선과 평행선 사이의 거리', needs: ['shp.perp'],
    idea: '한 직선에 수직인 두 직선처럼 **아무리 늘여도 서로 만나지 않는** 두 직선을 **평행**하다고 해요. 짧게 그려서 안 만나 보이는 것은 늘이면 만날 수 있어요. 평행선 사이에 **수직인 선분의 길이**가 평행선 사이의 거리예요.',
    slip: '두 직선을 모눈 끝까지 늘여 본다고 생각해 봐요. 거리는 수직인 선분으로 재요.',
    calc(r, c) {
      const S = paraScene(r);
      const [a, b, n, p] = shuffle(r, CIRC);
      const fig = linesFig(W0, H0, [seg(a, S.l1), seg(b, S.l2), seg(n, S.near), seg(p, S.perp)]);
      const pair = (x, y) => { const [u, v] = [x, y].sort((s, t) => CIRC.indexOf(s) - CIRC.indexOf(t)); return `직선 ${u}와 직선 ${v}`; };
      const D = distScene(r);
      const figD = linesFig(D.W, D.H, [seg('', [0, D.y0, D.W, D.y0]), seg('', [0, D.y0 + D.d, D.W, D.y0 + D.d]), seg(D.name.v, D.segs.v, true), seg(D.name.s1, D.segs.s1, true), seg(D.name.s2, D.segs.s2, true)]);
      const fams = [
        { words: true, ans: pair(a, b), wr: [{ text: pair(a, n), tag: TAGS.looksParallel }, { text: pair(b, n), tag: TAGS.looksParallel }, { text: pair(a, p), tag: TAGS.perpAsPara }],
          why: {
            [TAGS.looksParallel]: `직선 ${n}는 짧게 그려져서 안 만나 보이지만, 늘이면 만나요. 평행이 아니에요.`,
            [TAGS.perpAsPara]: `직선 ${p}는 직각으로 만나요 — 수직이에요. 평행은 만나지 않는 거예요.`,
          },
          steps: ['모눈에서 같은 방향으로 가는 두 직선을 찾아요', `늘여도 만나지 않는 것은 ${pair(a, b)}`],
          rule: '아무리 늘여도 만나지 않는 두 직선은 서로 평행하다.',
          pools: { pokemon: [`모눈 위에 직선 네 개를 그렸어요.\n\n${fig}\n\n서로 평행한 두 직선은 어느 것일까요?`] } },
        { ans: String(D.d), wr: [{ text: String(D.L), tag: TAGS.slantAsDist }],
          why: { [TAGS.slantAsDist]: `${D.L} cm는 비스듬한 선분이에요. 거리는 평행선에 수직인 선분 ${D.name.v}의 길이예요.` },
          steps: ['평행선 사이의 거리 = 평행선에 수직인 선분의 길이', `수직인 선분은 ${D.name.v} — ${D.d} cm`],
          rule: '평행선 사이의 거리는 평행선에 수직인 선분의 길이다.',
          pools: { pokemon: [`모눈 한 칸은 1 cm예요. 가로로 그은 두 직선은 서로 평행해요.\n\n${figD}\n\n평행선 사이의 거리는 몇 cm일까요?`] } },
        { words: true, ans: `선분 ${D.name.v}`, wr: [{ text: `선분 ${D.name.s1}`, tag: TAGS.slantAsDist }, { text: `선분 ${D.name.s2}`, tag: TAGS.slantAsDist }],
          why: { [TAGS.slantAsDist]: '비스듬한 선분은 평행선에 수직이 아니에요. 거리는 수직인 선분으로 재요.' },
          steps: ['평행선 사이의 거리 = 평행선에 수직인 선분의 길이', `모눈을 따라 똑바로 선 것은 선분 ${D.name.v}`],
          rule: '평행선 사이의 거리는 평행선에 수직인 선분의 길이다.',
          pools: { pokemon: [`모눈 한 칸은 1 cm예요. 가로로 그은 두 직선은 서로 평행해요.\n\n${figD}\n\n평행선 사이의 거리를 나타내는 선분은 어느 것일까요?`] } },
      ];
      return finish(this.id, r, c, pickFamily(r, c, fams));
    },
    misread(r, c) {
      if (branchOf(r, c, ['dist', 'near']) === 'dist') {
        const D = distScene(r);
        const figD = linesFig(D.W, D.H, [seg('', [0, D.y0, D.W, D.y0]), seg('', [0, D.y0 + D.d, D.W, D.y0 + D.d]), seg(D.name.v, D.segs.v, true), seg(D.name.s1, D.segs.s1, true), seg(D.name.s2, D.segs.s2, true)]);
        return finishMis(this.id, 'dist', r, c, {
          q: `모눈 한 칸은 1 cm예요. 가로로 그은 두 직선은 서로 평행해요.\n\n${figD}\n\n${showWork(`평행선 사이의 거리는 선분 ${D.name.s1}의 길이인 ${D.L} cm예요`)}`,
          ok: `거리는 평행선에 수직인 선분 ${D.name.v}의 길이 — ${D.d} cm`,
          wr: [
            { text: '맞게 말했어요', tag: RIGHT_AS_WRONG },
            { text: `가장 긴 선분의 길이가 거리예요 — ${D.L} cm`, tag: TAGS.slantAsDist },
            { text: '평행선 사이의 거리는 잴 수 없어요', tag: OFF },
          ],
          steps: ['평행선 사이의 거리 = 수직인 선분의 길이', `선분 ${D.name.v}: ${D.d} cm`],
          whyAny: '비스듬한 선분의 길이를 썼어요. 평행선 사이의 거리는 평행선에 수직인 선분으로 재요.',
          rule: '평행선 사이의 거리는 평행선에 수직인 선분의 길이다.',
        });
      }
      const S = paraScene(r);
      const [a, b, n, p] = shuffle(r, CIRC);
      const fig = linesFig(W0, H0, [seg(a, S.l1), seg(b, S.l2), seg(n, S.near), seg(p, S.perp)]);
      return finishMis(this.id, 'near', r, c, {
        q: `모눈 위에 직선 네 개를 그렸어요.\n\n${fig}\n\n${showWork(`직선 ${a}와 직선 ${n}는 그림에서 만나지 않으니까 서로 평행해요`)}`,
        ok: `늘이면 만나요 — 평행한 것은 직선 ${a}와 직선 ${b}`,
        wr: [
          { text: '맞게 말했어요', tag: RIGHT_AS_WRONG },
          { text: `직선 ${a}와 직선 ${p}${josa(p, '이', '가')} 평행해요`, tag: TAGS.perpAsPara },
          { text: '직선은 평행할 수 없어요', tag: OFF },
        ],
        steps: ['두 직선을 늘여 봐요', `늘여도 만나지 않는 것은 직선 ${a}와 직선 ${b}`],
        whyAny: '짧게 그려서 안 만나 보일 뿐이에요. 평행은 아무리 늘여도 만나지 않는 거예요.',
        rule: '아무리 늘여도 만나지 않는 두 직선은 서로 평행하다.',
      });
    },
  },

  {
    id: 'shp.isos', grade: 4, name: '이등변삼각형과 정삼각형', needs: ['shp.para'],
    idea: '두 변의 길이가 같은 삼각형은 **이등변삼각형**, 세 변의 길이가 모두 같은 삼각형은 **정삼각형**이에요. 정삼각형도 두 변의 길이가 같으니까 **이등변삼각형이에요**. 이등변삼각형은 두 각의 크기가 같아요.',
    slip: '같은 표시(눈금)가 있는 변이 몇 개인지 먼저 세어 봐요.',
    calc(r, c) {
      const kind = pick(r, ['eq', 'iso', 'iso', 'sca']);
      let T;
      if (kind === 'eq') { const s = int(r, 4, 9); T = [s, s, s]; } else if (kind === 'iso') {
        const a = int(r, 5, 9); let b = int(r, 3, 2 * a - 2); if (b === a) b = a > 5 ? a - 2 : a + 2; T = shuffle(r, [[a, a, b], [b, a, a], [a, b, a]])[0];
      } else { const a = int(r, 5, 8); T = [a, a + 1, a + 2]; T = shuffle(r, T); } // 비슷한 길이 — "같아 보이는" 함정
      const iso = kind !== 'sca'; const eq = kind === 'eq';
      const A = '이등변삼각형'; const E = '정삼각형';
      const ok = eq ? AND(E, A) : iso ? BUTNOT(A, E) : NEITHER(A, E);
      const wr = eq ? [{ text: BUTNOT(E, A), tag: TAGS.eqNotIsos }, { text: BUTNOT(A, E), tag: TAGS.missEqual }, { text: NEITHER(A, E), tag: TAGS.missEqual }]
        : iso ? [{ text: IS(E), tag: TAGS.twoAsAll }, { text: AND(E, A), tag: TAGS.twoAsAll }, { text: NEITHER(A, E), tag: TAGS.missEqual }]
          : [{ text: IS(A), tag: TAGS.looksEqual }, { text: BUTNOT(A, E), tag: TAGS.looksEqual }, { text: IS(E), tag: TAGS.looksEqual }];
      // 둘레 — 같은 두 변 중 하나를 숨긴 이등변삼각형
      const a2 = int(r, 5, 12); let b2 = int(r, 3, Math.min(2 * a2 - 2, 15)); if (b2 === a2) b2 = a2 - 1; if (a2 + 2 * b2 === 2 * a2 + b2) b2 += 1;
      // 같은 각 — 이등변삼각형 ㄱㄴㄷ(변 ㄴㄷ = 변 ㄷㄱ)에서 각 ㄱ = 각 ㄴ
      let g = 5 * int(r, 6, 15); if (g === 60) g = 65; // 60이면 180 − 2 × 60 = 60 이 우연히 맞는 값 · 75까지(나머지 각 30°↑ — 좁으면 각 이름표가 안 들어간다)
      const fams = [
        { words: true, ans: `이 삼각형은 ${ok}`, wr: wr.map((w) => ({ ...w, text: `이 삼각형은 ${w.text}` })),
          why: {
            [TAGS.eqNotIsos]: '정삼각형도 두 변의 길이가 같아요 — 이등변삼각형이에요.',
            [TAGS.twoAsAll]: '같은 변이 두 개뿐이에요. 정삼각형은 세 변이 모두 같아야 해요.',
            [TAGS.missEqual]: '길이가 같은 변을 다시 세어 봐요 — 같은 눈금 표시가 있어요.',
            [TAGS.looksEqual]: `세 변이 ${T.join(' cm, ')} cm로 모두 달라요. 비슷해 보여도 같은 변이 없어요.`,
          },
          steps: [`세 변: ${T.join(' cm, ')} cm`, eq ? '세 변이 모두 같아요 → 정삼각형이고, 두 변이 같으니 이등변삼각형이기도 해요' : iso ? '두 변만 같아요 → 이등변삼각형 (정삼각형은 아니에요)' : '같은 변이 없어요 → 이등변삼각형도 정삼각형도 아니에요'],
          rule: '두 변이 같으면 이등변삼각형, 세 변이 같으면 정삼각형 — 정삼각형도 이등변삼각형이다.',
          pools: { pokemon: [`세 변의 길이를 잰 삼각형이에요.\n\n[tris ${T.join(' ')}]\n\n바르게 말한 것은 어느 것일까요?`, `{mon/이/가} 만든 삼각형 모양 깃발이에요.\n\n[tris ${T.join(' ')}]\n\n바르게 말한 것은 어느 것일까요?`] } },
        { ans: String(2 * a2 + b2), wr: [{ text: String(a2 + b2), tag: TAGS.missSide }, { text: String(3 * a2), tag: TAGS.allEqual }, { text: String(a2 + 2 * b2), tag: TAGS.wrongPair }],
          why: {
            [TAGS.missSide]: `숨긴 변도 ${a2} cm예요 — 같은 눈금 표시가 있어요. 세 변을 모두 더해요.`,
            [TAGS.allEqual]: `세 변이 모두 같은 것은 아니에요. ${b2} cm인 변이 하나 있어요.`,
            [TAGS.wrongPair]: `같은 눈금이 있는 것은 ${a2} cm인 두 변이에요.`,
          },
          steps: [`같은 눈금이 있는 두 변: ${a2} cm, ${a2} cm`, `${a2} + ${a2} + ${b2} = ${2 * a2 + b2}`],
          rule: '이등변삼각형은 같은 눈금이 있는 두 변의 길이가 같다.',
          pools: { pokemon: [`이등변삼각형이에요.\n\n[tris ${a2} ?${a2} ${b2}]\n\n세 변의 길이의 합은 몇 cm일까요?`] } },
        { ans: String(g), wr: [{ text: String(180 - g), tag: TAGS.isoAngleSub }, { text: String(180 - 2 * g), tag: TAGS.isoApex }],
          why: {
            [TAGS.isoAngleSub]: `180°에서 뺄 까닭이 없어요. 이등변삼각형은 두 각의 크기가 같아요 — 각 ㄴ도 ${g}°.`,
            [TAGS.isoApex]: `${180 - 2 * g}°는 각 ㄷ이에요. 물은 것은 각 ㄱ과 크기가 같은 각 ㄴ이에요.`,
          },
          steps: ['변 ㄴㄷ과 변 ㄷㄱ의 길이가 같은 이등변삼각형', `같은 두 변 아래의 두 각(ㄱ, ㄴ)은 크기가 같아요 → ${g}°`],
          rule: '이등변삼각형은 두 각의 크기가 같다.',
          pools: { pokemon: [`이등변삼각형 ㄱㄴㄷ이에요.\n\n[tria ${g} ?${g} _${180 - 2 * g} iso]\n\n각 ㄴ의 크기는 몇 도일까요?`] } },
      ];
      if (180 - 2 * g <= 0) fams.pop();
      return finish(this.id, r, c, pickFamily(r, c, fams));
    },
    misread(r, c) {
      if (branchOf(r, c, ['eq', 'two']) === 'eq') {
        const s = int(r, 4, 9);
        return finishMis(this.id, 'eq', r, c, {
          q: `세 변의 길이를 잰 삼각형이에요.\n\n[tris ${s} ${s} ${s}]\n\n${showWork('세 변이 모두 같으니까 정삼각형이고, 그래서 이등변삼각형은 아니에요')}`,
          ok: '정삼각형도 두 변의 길이가 같아요 — 이등변삼각형이에요',
          wr: [
            { text: '맞게 말했어요', tag: RIGHT_AS_WRONG },
            { text: '세 변이 같으니까 정삼각형도 아니에요', tag: TAGS.missEqual },
            { text: '삼각형은 변의 길이로 나눌 수 없어요', tag: OFF },
          ],
          steps: ['이등변삼각형 = 두 변의 길이가 같은 삼각형', '정삼각형은 두 변도 같으니까 이등변삼각형이에요'],
          whyAny: '정삼각형은 세 변이 모두 같아서, 두 변이 같다는 조건도 채워요.',
          rule: '정삼각형도 이등변삼각형이다.',
        });
      }
      const a = int(r, 5, 9); let b = int(r, 3, 2 * a - 2); if (b === a) b = a - 2;
      return finishMis(this.id, 'two', r, c, {
        q: `세 변의 길이를 잰 삼각형이에요.\n\n[tris ${a} ${a} ${b}]\n\n${showWork('두 변의 길이가 같으니까 정삼각형이에요')}`,
        ok: '정삼각형은 세 변이 모두 같아야 해요 — 이 삼각형은 이등변삼각형이에요',
        wr: [
          { text: '맞게 말했어요', tag: RIGHT_AS_WRONG },
          { text: '같은 변이 있으니까 이등변삼각형도 정삼각형도 아니에요', tag: TAGS.missEqual },
          { text: '삼각형은 변의 길이로 나눌 수 없어요', tag: OFF },
        ],
        steps: [`세 변: ${a} cm, ${a} cm, ${b} cm — 같은 변은 두 개`, '두 변만 같으면 이등변삼각형'],
        whyAny: '두 변만 같아요. 정삼각형은 세 변이 모두 같아야 해요.',
        rule: '두 변이 같으면 이등변삼각형, 세 변이 같으면 정삼각형.',
      });
    },
  },

  {
    id: 'shp.acute', grade: 4, name: '예각삼각형·직각삼각형·둔각삼각형', needs: ['shp.isos'],
    idea: '세 각이 모두 **예각**이면 **예각삼각형**, 한 각이 **직각**이면 **직각삼각형**, 한 각이 **둔각**이면 **둔각삼각형**이에요. 예각은 어느 삼각형에나 두 개 이상 있어서, **가장 큰 각**을 보면 돼요.',
    slip: '세 각 중 가장 큰 각이 예각인지, 직각인지, 둔각인지 봐요.',
    calc(r, c) {
      const typeOf = (t) => (Math.max(...t) > 90 ? '둔각삼각형' : Math.max(...t) === 90 ? '직각삼각형' : '예각삼각형');
      const tri = (kind) => {
        for (let k = 0; k < 40; k++) {
          // 가장 작은 각도 25°↑ — 15°처럼 좁으면 납작한 삼각형이 되어 각 이름표가 겹치거나 변을 가로질렀다
          const big = kind === 'o' ? 5 * int(r, 20, 26) : kind === 'r' ? 90 : 5 * int(r, 13, 17);
          const a = 5 * int(r, 5, Math.floor((180 - big) / 5) - 5); const b = 180 - big - a;
          if (b < 25 || a < 25 || (kind === 'a' && (a >= 90 || b >= 90))) continue;
          return shuffle(r, [big, a, b]);
        }
        return kind === 'o' ? [110, 40, 30] : kind === 'r' ? [90, 50, 40] : [70, 60, 50];
      };
      const kind = pick(r, ['o', 'r', 'a', 'o']);
      const T = tri(kind); const ty = typeOf(T);
      const NAMES = ['예각삼각형', '직각삼각형', '둔각삼각형'];
      const tagOf = (tru, ch) => (ch === '예각삼각형' ? TAGS.oneAcute : tru === '직각삼각형' && ch === '둔각삼각형' ? TAGS.rightAsObtuse : TAGS.wrongBiggest);
      // 세 삼각형 중 하나 고르기
      // 묻는 종류가 틀 글에 들어간다 — 🔁 쌍둥이는 요청한 틀의 종류를 다시 고른다
      const target = pickFor(r, c, NAMES, (n, w) => w.includes(`${n}${josa(n, '은', '는')} 어느 것`));
      const others = NAMES.filter((n) => n !== target);
      const three = shuffle(r, [{ t: tri({ 예각삼각형: 'a', 직각삼각형: 'r', 둔각삼각형: 'o' }[target]), ty: target }, ...others.map((n) => ({ t: tri({ 예각삼각형: 'a', 직각삼각형: 'r', 둔각삼각형: 'o' }[n]), ty: n }))]);
      const lab = ['㉮', '㉯', '㉰'];
      const listTxt = three.map((x, i) => `${lab[i]} ${x.t.map((v) => `${v}°`).join(', ')}`).join('\n');
      const fams = [
        { words: true, ans: ty, wr: NAMES.filter((n) => n !== ty).map((n) => ({ text: n, tag: tagOf(ty, n) })),
          why: {
            [TAGS.oneAcute]: `예각이 있어도 세 각이 모두 예각이어야 예각삼각형이에요. 가장 큰 각 ${Math.max(...T)}°를 봐요.`,
            [TAGS.rightAsObtuse]: '90°는 둔각이 아니라 직각이에요. 둔각은 90°보다 커요.',
            [TAGS.wrongBiggest]: `가장 큰 각은 ${Math.max(...T)}°예요 — ${Math.max(...T) > 90 ? '둔각' : Math.max(...T) === 90 ? '직각' : '예각'}이에요.`,
          },
          steps: [`세 각: ${T.join('°, ')}°`, `가장 큰 각 ${Math.max(...T)}° → ${ty}`],
          rule: '가장 큰 각이 예각이면 예각삼각형, 직각이면 직각삼각형, 둔각이면 둔각삼각형.',
          pools: { pokemon: [`세 각의 크기를 잰 삼각형이에요.\n\n[tria ${T.join(' ')}]\n\n이 삼각형은 어떤 삼각형일까요?`, `{mon/이/가} 종이로 접은 삼각형이에요.\n\n[tria ${T.join(' ')}]\n\n이 삼각형은 어떤 삼각형일까요?`] } },
        { words: true, ans: lab[three.findIndex((x) => x.ty === target)], wr: three.map((x, i) => (x.ty === target ? null : { text: lab[i], tag: tagOf(x.ty, target) })).filter(Boolean),
          why: {
            [TAGS.oneAcute]: '예각삼각형은 세 각이 모두 예각이어야 해요. 직각이나 둔각이 하나라도 있으면 아니에요.',
            [TAGS.rightAsObtuse]: '90°는 직각이에요. 둔각은 90°보다 큰 각이에요.',
            [TAGS.wrongBiggest]: '세 각 중 가장 큰 각을 다시 봐요.',
          },
          steps: three.map((x, i) => `${lab[i]} 가장 큰 각 ${Math.max(...x.t)}° → ${x.ty}`).slice(0, 3),
          rule: '가장 큰 각이 예각이면 예각삼각형, 직각이면 직각삼각형, 둔각이면 둔각삼각형.',
          pools: { pokemon: [`세 삼각형의 각을 재었어요.\n\n${listTxt}\n\n${target}${josa(target, '은', '는')} 어느 것일까요?`] } },
      ];
      return finish(this.id, r, c, pickFamily(r, c, fams));
    },
    misread(r, c) {
      if (branchOf(r, c, ['acute', 'right']) === 'acute') {
        const big = 5 * int(r, 20, 26); const a = 5 * int(r, 5, Math.floor((180 - big) / 5) - 5); const b = 180 - big - a;
        const T = shuffle(r, [big, a, b]);
        return finishMis(this.id, 'acute', r, c, {
          q: `세 각의 크기를 잰 삼각형이에요.\n\n[tria ${T.join(' ')}]\n\n${showWork(`예각이 두 개 있으니까 예각삼각형이에요`)}`,
          ok: `세 각이 모두 예각이어야 예각삼각형 — ${big}°가 둔각이라 둔각삼각형이에요`,
          wr: [
            { text: '맞게 말했어요', tag: RIGHT_AS_WRONG },
            { text: `${big}°는 직각이라서 직각삼각형이에요`, tag: TAGS.obtuseAsRight }, // 둔각을 직각으로 — 거꾸로(rightAsObtuse)가 아니다 (Codex 17차 #2)
            { text: '삼각형은 각으로 나눌 수 없어요', tag: OFF },
          ],
          steps: [`가장 큰 각: ${big}°`, `${big}°는 둔각 → 둔각삼각형`],
          whyAny: '예각은 어느 삼각형에나 두 개 이상 있어요. 가장 큰 각을 봐야 해요.',
          rule: '세 각이 모두 예각일 때만 예각삼각형이다.',
        });
      }
      const a = 5 * int(r, 5, 13); const T = shuffle(r, [90, a, 90 - a]);
      return finishMis(this.id, 'right', r, c, {
        q: `세 각의 크기를 잰 삼각형이에요.\n\n[tria ${T.join(' ')}]\n\n${showWork('90°는 큰 각이니까 둔각삼각형이에요')}`,
        ok: '90°는 직각이에요 — 직각삼각형',
        wr: [
          { text: '맞게 말했어요', tag: RIGHT_AS_WRONG },
          { text: '예각이 두 개 있으니까 예각삼각형이에요', tag: TAGS.oneAcute },
          { text: '90°인 각은 삼각형에 있을 수 없어요', tag: OFF },
        ],
        steps: ['가장 큰 각: 90°', '90°는 직각 → 직각삼각형'],
        whyAny: '둔각은 90°보다 크고 180°보다 작은 각이에요. 90°는 직각이에요.',
        rule: '한 각이 직각이면 직각삼각형, 둔각이면 둔각삼각형.',
      });
    },
  },

  {
    id: 'shp.trap', grade: 4, name: '사다리꼴과 평행사변형', needs: ['shp.acute'],
    idea: '평행한 변이 **한 쌍이라도** 있는 사각형은 **사다리꼴**, 마주 보는 **두 쌍의 변이 모두** 평행한 사각형은 **평행사변형**이에요. 평행사변형도 평행한 변이 있으니까 **사다리꼴이에요**. 평행사변형은 마주 보는 변의 길이와 마주 보는 각의 크기가 같아요.',
    slip: '모눈을 따라 마주 보는 변끼리 같은 방향인지(평행인지) 세어 봐요.',
    calc(r, c) {
      const type = pick(r, ['trap', 'para', 'none', 'para']);
      const P = quadOf(r, type);
      const T = '사다리꼴'; const PA = '평행사변형';
      const ok = type === 'para' ? AND(T, PA) : type === 'trap' ? BUTNOT(T, PA) : NEITHER(T, PA);
      const wr = type === 'para' ? [{ text: BUTNOT(PA, T), tag: TAGS.trapOnlyOne }, { text: BUTNOT(T, PA), tag: TAGS.missParallel }, { text: NEITHER(T, PA), tag: TAGS.missParallel }]
        : type === 'trap' ? [{ text: IS(PA), tag: TAGS.oneAsTwo }, { text: AND(T, PA), tag: TAGS.oneAsTwo }, { text: NEITHER(T, PA), tag: TAGS.missParallel }]
          : [{ text: IS(T), tag: TAGS.looksParallel }, { text: AND(T, PA), tag: TAGS.looksParallel }, { text: BUTNOT(T, PA), tag: TAGS.looksParallel }];
      let a = 5 * int(r, 10, 26); if (a === 90) a = 95;
      const askOpp = pickFor(r, c, [true, false], (v, w) => w.includes(v ? '각 ㄷ의 크기' : '각 ㄴ의 크기'));
      const q4 = askOpp ? `${a} _${180 - a} ?${a} _${180 - a}` : `${a} ?${180 - a} _${a} _${180 - a}`;
      const fams = [
        { words: true, ans: `이 사각형은 ${ok}`, wr: wr.map((w) => ({ ...w, text: `이 사각형은 ${w.text}` })),
          why: {
            [TAGS.trapOnlyOne]: '사다리꼴은 평행한 변이 한 쌍이라도 있으면 돼요. 두 쌍이면 평행사변형이면서 사다리꼴이에요.',
            [TAGS.oneAsTwo]: '평행한 변이 한 쌍뿐이에요. 평행사변형은 두 쌍이 모두 평행해야 해요.',
            [TAGS.missParallel]: '모눈을 따라 마주 보는 변을 다시 봐요 — 평행한 변이 있어요.',
            [TAGS.looksParallel]: '평행해 보이는 변도 모눈을 세어 보면 방향이 달라요. 늘이면 만나요.',
          },
          steps: [`평행한 변: ${{ para: '두 쌍', trap: '한 쌍', none: '없음' }[type]}`, { para: '두 쌍 → 평행사변형, 한 쌍이라도 있으니 사다리꼴', trap: '한 쌍 → 사다리꼴 (평행사변형은 아니에요)', none: '없음 → 사다리꼴도 평행사변형도 아니에요' }[type]],
          rule: '평행한 변이 한 쌍이라도 있으면 사다리꼴, 두 쌍이면 평행사변형 — 평행사변형도 사다리꼴이다.',
          pools: { pokemon: [`모눈 위에 그린 사각형이에요.\n\n${gp(P)}\n\n바르게 말한 것은 어느 것일까요?`, `{mon/이/가} 모눈종이에 그린 사각형이에요.\n\n${gp(P)}\n\n바르게 말한 것은 어느 것일까요?`] } },
        askOpp
          ? { ans: String(a), wr: [{ text: String(180 - a), tag: TAGS.oppAsAdj }],
            why: { [TAGS.oppAsAdj]: `각 ㄷ은 각 ㄱ과 마주 보는 각이에요. 평행사변형은 마주 보는 각의 크기가 같아요 — ${a}°.` },
            steps: ['각 ㄷ은 각 ㄱ과 마주 보는 각', `마주 보는 각은 크기가 같아요 → ${a}°`],
            rule: '평행사변형은 마주 보는 각의 크기가 같다.',
            pools: { pokemon: [`평행사변형 ㄱㄴㄷㄹ이에요.\n\n[quad ${q4}]\n\n각 ㄷ의 크기는 몇 도일까요?`] } }
          : { ans: String(180 - a), wr: [{ text: String(a), tag: TAGS.adjSame }],
            why: { [TAGS.adjSame]: `각 ㄴ은 각 ㄱ과 이웃한 각이에요. 평행사변형에서 이웃한 두 각을 더하면 180°예요.` },
            steps: ['각 ㄴ은 각 ㄱ과 이웃한 각', `180° − ${a}° = ${180 - a}°`],
            rule: '평행사변형은 이웃한 두 각을 더하면 180°이다.',
            pools: { pokemon: [`평행사변형 ㄱㄴㄷㄹ이에요.\n\n[quad ${q4}]\n\n각 ㄴ의 크기는 몇 도일까요?`] } },
      ];
      return finish(this.id, r, c, pickFamily(r, c, fams));
    },
    misread(r, c) {
      if (branchOf(r, c, ['only', 'opp']) === 'only') {
        const P = quadOf(r, 'para');
        return finishMis(this.id, 'only', r, c, {
          q: `모눈 위에 그린 사각형이에요.\n\n${gp(P)}\n\n${showWork('평행한 변이 두 쌍이니까 사다리꼴은 아니에요')}`,
          ok: '평행한 변이 한 쌍이라도 있으면 사다리꼴 — 평행사변형도 사다리꼴이에요',
          wr: [
            { text: '맞게 말했어요', tag: RIGHT_AS_WRONG },
            { text: '평행한 변이 한 쌍뿐이라서 평행사변형은 아니에요', tag: TAGS.missParallel },
            { text: '사각형은 사다리꼴이 될 수 없어요', tag: OFF },
          ],
          steps: ['사다리꼴 = 평행한 변이 한 쌍이라도 있는 사각형', '두 쌍이 평행하면 한 쌍도 평행 → 사다리꼴'],
          whyAny: '사다리꼴은 평행한 변이 "한 쌍뿐"인 것이 아니라 "한 쌍이라도 있는" 사각형이에요.',
          rule: '평행사변형도 사다리꼴이다.',
        });
      }
      let a = 5 * int(r, 10, 26); if (a === 90) a = 95;
      return finishMis(this.id, 'opp', r, c, {
        q: `평행사변형 ㄱㄴㄷㄹ이에요.\n\n[quad ${a} _${180 - a} ?${a} _${180 - a}]\n\n${showWork(`각 ㄷ은 180° − ${a}° = ${180 - a}°예요`)}`,
        ok: `각 ㄷ은 각 ㄱ과 마주 보는 각 — 크기가 같아서 ${a}°`,
        wr: [
          { text: '맞게 말했어요', tag: RIGHT_AS_WRONG },
          { text: `각 ㄷ은 360° − ${a}° = ${360 - a}°예요`, tag: TAGS.oppFrom360 },
          { text: '평행사변형의 각은 알 수 없어요', tag: OFF },
        ],
        steps: ['각 ㄷ은 각 ㄱ과 마주 보는 각', `마주 보는 각은 크기가 같아요 → ${a}°`],
        whyAny: '180°에서 빼는 것은 이웃한 각이에요. 마주 보는 각은 크기가 같아요.',
        rule: '평행사변형은 마주 보는 각의 크기가 같고, 이웃한 두 각을 더하면 180°이다.',
      });
    },
  },

  {
    id: 'shp.rhom', grade: 4, name: '마름모·직사각형·정사각형', needs: ['shp.trap'],
    idea: '네 변의 길이가 모두 같은 사각형은 **마름모**, 네 각이 모두 직각인 사각형은 **직사각형**, 네 변이 같고 네 각도 직각인 사각형은 **정사각형**이에요. 기울어지게 놓아도 이름은 그대로예요. 마름모는 마주 보는 각의 크기가 같아요.',
    slip: '모눈으로 네 변의 길이가 같은지, 네 각이 직각인지 따로 확인해 봐요.',
    calc(r, c) {
      const type = pick(r, ['rhom', 'square', 'rect']);
      // 정사각형 오답은 셋 다 "기울어져서 정사각형이 아니다"라 반듯한 정사각형에 내면 말이 안 맞았다(36%) — 기울어진 것만 (Codex 17차 #6)
      const P = quadOf(r, type, true);
      const M = '마름모'; const R = '직사각형'; const S = '정사각형';
      const EQ = '네 변의 길이가 모두 같아요'; const RT = '네 각이 모두 직각이에요';
      const ok = type === 'rhom' ? BUTNOT(M, S) : type === 'square' ? IS(S) : IS(R);
      const wr = type === 'rhom' ? [{ text: IS(S), tag: TAGS.sidesAsSquare }, { text: RT, tag: TAGS.rhomRight }, { text: IS(R), tag: TAGS.rhomRight }]
        : type === 'square' ? [{ text: `기울어져 있어서 ${ISNOT(S)}`, tag: TAGS.tiltNotSquare }, { text: '네 각이 모두 직각은 아니에요', tag: TAGS.tiltNotSquare }, { text: '네 변의 길이가 모두 같지는 않아요', tag: TAGS.tiltNotSquare }]
          : [{ text: IS(S), tag: TAGS.rectAsSquare }, { text: IS(M), tag: TAGS.rightAsRhom }, { text: EQ, tag: TAGS.rectAsSquare }];
      let a = 5 * int(r, 10, 26); if (a === 90) a = 95;
      const fams = [
        { words: true, ans: `이 사각형은 ${ok}`, wr: wr.map((w) => ({ ...w, text: `이 사각형은 ${w.text}` })),
          why: {
            [TAGS.sidesAsSquare]: '네 변은 같지만 네 각이 직각이 아니에요. 정사각형은 네 각도 직각이어야 해요.',
            [TAGS.rhomRight]: '마름모는 네 변이 같은 사각형이에요. 이 마름모의 각은 직각이 아니에요.',
            [TAGS.tiltNotSquare]: '기울어지게 놓아도 네 변이 같고 네 각이 직각이면 정사각형이에요 — 모눈으로 확인해 봐요.',
            [TAGS.rectAsSquare]: '네 각은 직각이지만 가로와 세로의 길이가 달라요. 정사각형은 네 변도 같아야 해요.',
            [TAGS.rightAsRhom]: '마름모는 네 변의 길이가 같아야 해요. 이 사각형은 가로와 세로가 달라요.',
          },
          steps: [{ rhom: '네 변이 같아요, 네 각은 직각이 아니에요', square: '네 변이 같고 네 각이 모두 직각이에요 (기울어져 있을 뿐)', rect: '네 각이 모두 직각이에요, 가로와 세로는 달라요' }[type], { rhom: '→ 마름모 (정사각형은 아니에요)', square: '→ 정사각형', rect: '→ 직사각형' }[type]],
          rule: '네 변이 같으면 마름모, 네 각이 직각이면 직사각형, 둘 다면 정사각형.',
          pools: { pokemon: [`모눈 위에 그린 사각형이에요.\n\n${gp(P)}\n\n바르게 말한 것은 어느 것일까요?`, `{mon/이/가} 모눈종이에 그린 사각형이에요.\n\n${gp(P)}\n\n바르게 말한 것은 어느 것일까요?`] } },
        { ans: String(a), wr: [{ text: String(180 - a), tag: TAGS.oppAsAdj }],
          why: { [TAGS.oppAsAdj]: `각 ㄷ은 각 ㄱ과 마주 보는 각이에요. 마름모는 마주 보는 각의 크기가 같아요 — ${a}°.` },
          steps: ['각 ㄷ은 각 ㄱ과 마주 보는 각', `마주 보는 각은 크기가 같아요 → ${a}°`],
          rule: '마름모는 마주 보는 각의 크기가 같다.',
          pools: { pokemon: [`마름모 ㄱㄴㄷㄹ이에요.\n\n[quad ${a} _${180 - a} ?${a} _${180 - a} rh]\n\n각 ㄷ의 크기는 몇 도일까요?`] } },
      ];
      return finish(this.id, r, c, pickFamily(r, c, fams));
    },
    misread(r, c) {
      if (branchOf(r, c, ['tilt', 'right']) === 'tilt') {
        const P = quadOf(r, 'square', true); // 기울어진 정사각형 (다시 뽑기 열 번은 드물게 반듯한 것이 남을 수 있었다)
        return finishMis(this.id, 'tilt', r, c, {
          q: `모눈 위에 그린 사각형이에요.\n\n${gp(P)}\n\n${showWork('기울어져 있으니까 정사각형이 아니라 마름모예요')}`,
          ok: '네 변이 같고 네 각이 모두 직각 — 돌려 놓아도 정사각형이에요',
          wr: [
            { text: '맞게 말했어요', tag: RIGHT_AS_WRONG },
            { text: '네 각이 직각이 아니라서 정사각형이 아니에요', tag: TAGS.tiltNotSquare },
            { text: '모눈 위에는 정사각형을 그릴 수 없어요', tag: OFF },
          ],
          steps: ['모눈으로 네 변과 네 각을 확인해요', '네 변이 같고 네 각이 직각 → 정사각형'],
          whyAny: '도형의 이름은 놓인 방향으로 정하지 않아요. 변의 길이와 각의 크기로 정해요.',
          rule: '기울어지게 놓아도 네 변이 같고 네 각이 직각이면 정사각형이다.',
        });
      }
      const P = quadOf(r, 'rhom');
      return finishMis(this.id, 'right', r, c, {
        q: `모눈 위에 그린 마름모예요.\n\n${gp(P)}\n\n${showWork('마름모니까 네 각이 모두 직각이에요')}`,
        ok: '마름모는 네 변이 같은 사각형 — 이 마름모의 각은 직각이 아니에요',
        wr: [
          { text: '맞게 말했어요', tag: RIGHT_AS_WRONG },
          { text: '네 각이 직각이니까 정사각형이에요', tag: TAGS.rhomRight }, // 보여 준 말(마름모는 네 각이 직각)을 믿고 이어 간 것
          { text: '마름모는 변의 길이가 모두 달라요', tag: OFF },
        ],
        steps: ['마름모 = 네 변의 길이가 모두 같은 사각형', '각이 직각이어야 한다는 조건은 없어요'],
        whyAny: '네 변이 같다고 네 각이 직각인 것은 아니에요. 네 각까지 직각이면 정사각형이에요.',
        rule: '마름모는 네 변이 같다 — 네 각이 직각인 것은 정사각형일 때뿐.',
      });
    },
  },

  {
    id: 'shp.relate', grade: 4, name: '여러 가지 사각형 사이의 관계', needs: ['shp.rhom'],
    idea: '정사각형은 네 변이 같으니까 **마름모**, 네 각이 직각이니까 **직사각형**이기도 해요. 직사각형과 마름모는 마주 보는 두 쌍의 변이 평행하니까 **평행사변형**, 평행사변형은 **사다리꼴**이에요. 한 사각형에 이름이 여러 개 있을 수 있어요.',
    slip: '이름마다 조건(평행한 변·같은 변·직각)을 하나씩 대 봐요.',
    calc(r, c) {
      const NAMES = ['사다리꼴', '평행사변형', '마름모', '직사각형', '정사각형'];
      const has = (type, n) => ({ square: NAMES, rect: ['사다리꼴', '평행사변형', '직사각형'], rhom: ['사다리꼴', '평행사변형', '마름모'], para: ['사다리꼴', '평행사변형'] }[type].includes(n));
      const tA = pick(r, ['rect', 'rhom']);
      const PA = quadOf(r, tA);
      const cant = pick(r, NAMES.filter((n) => !has(tA, n)));
      const tB = pick(r, ['square', 'rect', 'rhom']);
      const PB = quadOf(r, tB);
      const okB = tB === 'square' ? AND('정사각형', pick(r, ['마름모', '직사각형'])) : tB === 'rect' ? AND('직사각형', '평행사변형') : AND('마름모', '평행사변형');
      const wrB = tB === 'square' ? [{ text: BUTNOT('정사각형', '마름모'), tag: TAGS.squareNotRhom }, { text: BUTNOT('정사각형', '직사각형'), tag: TAGS.squareNotRect }, { text: ISNOT('평행사변형'), tag: TAGS.specialNotPara }]
        : tB === 'rect' ? [{ text: BUTNOT('직사각형', '평행사변형'), tag: TAGS.specialNotPara }, { text: IS('정사각형'), tag: TAGS.rectAsSquare }, { text: BUTNOT('직사각형', '사다리꼴'), tag: TAGS.trapOnlyOne }]
          : [{ text: BUTNOT('마름모', '평행사변형'), tag: TAGS.specialNotPara }, { text: IS('정사각형'), tag: TAGS.sidesAsSquare }, { text: BUTNOT('마름모', '사다리꼴'), tag: TAGS.trapOnlyOne }];
      const fams = [
        { words: true, ans: cant, wr: [{ text: '사다리꼴', tag: TAGS.trapOnlyOne }, { text: '평행사변형', tag: TAGS.specialNotPara }],
          why: {
            [TAGS.trapOnlyOne]: '이 사각형은 평행한 변이 있으니 사다리꼴이라고 부를 수 있어요.',
            [TAGS.specialNotPara]: '마주 보는 두 쌍의 변이 평행해요 — 평행사변형이라고 부를 수 있어요.',
          },
          steps: [{ rect: '네 각이 직각, 두 쌍의 변이 평행, 가로와 세로는 달라요', rhom: '네 변이 같고, 두 쌍의 변이 평행, 각은 직각이 아니에요' }[tA], `${cant}의 조건을 채우지 못해요 → ${cant}${josa(cant, '이라고', '라고')} 부를 수 없어요`],
          rule: '정사각형 → 마름모·직사각형 → 평행사변형 → 사다리꼴 (이름을 여러 개 가질 수 있다).',
          pools: { pokemon: [`모눈 위에 그린 사각형이에요.\n\n${gp(PA)}\n\n이 사각형을 부를 수 **없는** 이름은 어느 것일까요?`] } },
        { words: true, ans: `이 사각형은 ${okB}`, wr: wrB.map((w) => ({ ...w, text: `이 사각형은 ${w.text}` })),
          why: {
            [TAGS.squareNotRhom]: '정사각형도 네 변의 길이가 같아요 — 마름모예요.',
            [TAGS.squareNotRect]: '정사각형도 네 각이 모두 직각이에요 — 직사각형이에요.',
            [TAGS.specialNotPara]: '마주 보는 두 쌍의 변이 모두 평행해요 — 평행사변형이에요.',
            [TAGS.rectAsSquare]: '가로와 세로의 길이가 달라요. 정사각형은 네 변이 모두 같아야 해요.',
            [TAGS.sidesAsSquare]: '네 변은 같지만 각이 직각이 아니에요 — 정사각형은 아니에요.',
            [TAGS.trapOnlyOne]: '평행한 변이 한 쌍이라도 있으면 사다리꼴이에요. 두 쌍이어도 사다리꼴이에요.',
          },
          steps: [{ square: '네 변이 같고 네 각이 직각', rect: '네 각이 직각, 두 쌍의 변이 평행', rhom: '네 변이 같고, 두 쌍의 변이 평행' }[tB], `→ ${okB.replace(/이에요$|예요$/, '')}`],
          rule: '정사각형 → 마름모·직사각형 → 평행사변형 → 사다리꼴 (이름을 여러 개 가질 수 있다).',
          pools: { pokemon: [`모눈 위에 그린 사각형이에요.\n\n${gp(PB)}\n\n바르게 말한 것은 어느 것일까요?`, `{mon/이/가} 모눈종이에 그린 사각형이에요.\n\n${gp(PB)}\n\n바르게 말한 것은 어느 것일까요?`] } },
      ];
      return finish(this.id, r, c, pickFamily(r, c, fams));
    },
    misread(r, c) {
      if (branchOf(r, c, ['square', 'rect']) === 'square') {
        const P = quadOf(r, 'square');
        return finishMis(this.id, 'square', r, c, {
          q: `모눈 위에 그린 정사각형이에요.\n\n${gp(P)}\n\n${showWork('정사각형이니까 직사각형은 아니에요')}`,
          ok: '정사각형도 네 각이 모두 직각 — 직사각형이에요',
          wr: [
            { text: '맞게 말했어요', tag: RIGHT_AS_WRONG },
            { text: '정사각형은 마름모도 아니에요', tag: TAGS.squareNotRhom },
            { text: '정사각형은 사각형이 아니에요', tag: OFF },
          ],
          steps: ['직사각형 = 네 각이 모두 직각인 사각형', '정사각형도 네 각이 직각 → 직사각형'],
          whyAny: '정사각형은 직사각형의 조건(네 각이 직각)을 모두 채워요.',
          rule: '정사각형은 직사각형이면서 마름모이다.',
        });
      }
      const P = quadOf(r, 'rect');
      return finishMis(this.id, 'rect', r, c, {
        q: `모눈 위에 그린 직사각형이에요.\n\n${gp(P)}\n\n${showWork('직사각형은 평행사변형이 아니에요')}`,
        ok: '마주 보는 두 쌍의 변이 평행 — 직사각형도 평행사변형이에요',
        wr: [
          { text: '맞게 말했어요', tag: RIGHT_AS_WRONG },
          { text: '직사각형은 사다리꼴도 아니에요', tag: TAGS.trapOnlyOne },
          { text: '직사각형은 사각형이 아니에요', tag: OFF },
        ],
        steps: ['평행사변형 = 마주 보는 두 쌍의 변이 평행한 사각형', '직사각형도 두 쌍이 평행 → 평행사변형'],
        whyAny: '직사각형은 평행사변형의 조건을 모두 채워요. 네 각이 직각인 평행사변형이에요.',
        rule: '직사각형과 마름모는 평행사변형이고, 평행사변형은 사다리꼴이다.',
      });
    },
  },

  {
    id: 'shp.poly', grade: 4, name: '다각형·정다각형·대각선', needs: ['shp.relate'],
    idea: '선분으로만 둘러싸인 도형이 **다각형** — 변이 5개면 오각형, 6개면 육각형이에요. 변의 길이가 모두 같고 **각의 크기도 모두 같은** 다각형이 **정다각형**이에요. 서로 이웃하지 않는 두 꼭짓점을 이은 선분이 **대각선**이에요.',
    slip: '변을 하나씩 세고, 정다각형은 변과 각 두 가지를 모두 확인해요.',
    calc(r, c) {
      // 꼭짓점 수가 틀 열쇠("#,#"의 개수)에 들어간다 — 🔁 쌍둥이는 요청한 틀의 꼭짓점 수로
      const n = pickFor(r, c, [5, 6, 7, 8], (k, w) => /^\[gpoly (#,# ?)+\]$/m.test(w) && (w.match(/#,#/g) || []).length === k); const shape = pick(r, POLYN[n]);
      // 모양 틀이 몇 개뿐이라 옮겨 놓는다 — 안 그러면 🔁 쌍둥이가 원래 문제와 글자까지 같아진다
      const flip = r() < 0.5; const ox = int(r, 0, 3); const oy = int(r, 0, 3);
      const P = shape.map(([x, y]) => [(flip ? 8 - x : x) + ox, y + oy]);
      const ordered = flip ? [...P].reverse() : P;
      const figN = `[gpoly ${ordered.map((p) => `${p[0]},${p[1]}`).join(' ')}]`;
      const Rg = pickFor(r, c, [4, 5, 6, 7, 8], (k, w) => w.includes(REGN[k]));
      const s = int(r, 2, 9);
      const diag = (Rg * (Rg - 3)) / 2;
      const type = pick(r, ['rhom', 'rect']);
      const PQ = quadOf(r, type);
      const okR = type === 'rhom' ? '정다각형이 아니에요 — 각의 크기가 모두 같지는 않아요' : '정다각형이 아니에요 — 변의 길이가 모두 같지는 않아요';
      const wrR = type === 'rhom'
        ? [{ text: '정다각형이에요 — 변의 길이가 모두 같아요', tag: TAGS.sidesOnlyReg }, { text: '정다각형이 아니에요 — 변의 길이가 모두 같지는 않아요', tag: TAGS.wrongReason }]
        : [{ text: '정다각형이에요 — 각의 크기가 모두 같아요', tag: TAGS.anglesOnlyReg }, { text: '정다각형이 아니에요 — 각의 크기가 모두 같지는 않아요', tag: TAGS.wrongReason }];
      const fams = [
        { words: true, ans: NGON[n], wr: [{ text: NGON[n - 1], tag: TAGS.countWrong }, { text: NGON[n + 1], tag: TAGS.countWrong }],
          why: { [TAGS.countWrong]: `변을 한 번씩만 세어 봐요 — 변이 ${n}개예요.` },
          steps: [`변(또는 꼭짓점)을 세면 ${n}개`, `→ ${NGON[n]}`],
          rule: '변이 ■개인 다각형은 ■각형.',
          pools: { pokemon: [`모눈 위에 그린 도형이에요.\n\n${figN}\n\n이 도형의 이름은 무엇일까요?`] } },
        { words: true, ans: `이 도형은 ${okR}`, wr: wrR.map((w) => ({ ...w, text: `이 도형은 ${w.text}` })),
          why: {
            [TAGS.sidesOnlyReg]: '변의 길이는 모두 같지만 각의 크기가 달라요. 정다각형은 둘 다 같아야 해요.',
            [TAGS.anglesOnlyReg]: '각은 모두 직각이지만 변의 길이가 달라요. 정다각형은 둘 다 같아야 해요.',
            [TAGS.wrongReason]: type === 'rhom' ? '이 도형은 변의 길이는 모두 같아요. 다른 것은 각이에요.' : '이 도형은 각은 모두 직각으로 같아요. 다른 것은 변의 길이예요.',
          },
          steps: [type === 'rhom' ? '변의 길이: 모두 같아요 · 각의 크기: 달라요' : '각의 크기: 모두 직각 · 변의 길이: 달라요', '둘 중 하나라도 다르면 정다각형이 아니에요'],
          rule: '정다각형 = 변의 길이도, 각의 크기도 모두 같은 다각형.',
          pools: { pokemon: [`모눈 위에 그린 도형이에요.\n\n${gp(PQ)}\n\n바르게 말한 것은 어느 것일까요?`] } },
        { ans: String(diag), wr: [{ text: String(Rg * (Rg - 3)), tag: TAGS.diagNoHalf }, { text: String((Rg * (Rg - 1)) / 2), tag: TAGS.diagWithSides }, { text: String(Rg - 3), tag: TAGS.diagOneVertex }],
          why: {
            [TAGS.diagNoHalf]: `꼭짓점마다 ${Rg - 3}개씩 세면 ${Rg} × ${Rg - 3} = ${Rg * (Rg - 3)} — 한 대각선을 양 끝에서 두 번 센 거예요. ÷ 2를 해요.`,
            [TAGS.diagWithSides]: '이웃한 꼭짓점을 이은 선분은 변이에요. 대각선이 아니에요.',
            [TAGS.diagOneVertex]: `${Rg - 3}개는 한 꼭짓점에서 그은 대각선뿐이에요. 모든 꼭짓점에서 그어요.`,
          },
          steps: [`한 꼭짓점에서 그을 수 있는 대각선: ${Rg} − 3 = ${Rg - 3}개`, `${Rg} × ${Rg - 3} ÷ 2 = ${diag}개 (한 대각선을 두 번 셌으니 ÷ 2)`],
          rule: '대각선의 수 = 꼭짓점의 수 × (꼭짓점의 수 − 3) ÷ 2.',
          pools: { pokemon: [`${REGN[Rg]} 모양 배지예요.\n\n[reg ${Rg} ${s}]\n\n이 도형에 그을 수 있는 대각선은 모두 몇 개일까요?`] } },
      ];
      return finish(this.id, r, c, pickFamily(r, c, fams));
    },
    misread(r, c) {
      if (branchOf(r, c, ['diag', 'reg']) === 'diag') {
        // 오각형은 뺀다 — "바른 대각선 + 변"(5 + 5)이 보여 준 틀린 값(5 × 2)과 같은 10이 된다
        const Rg = pickFor(r, c, [6, 7, 8], (k, w) => w.includes(REGN[k])); const s = int(r, 2, 9);
        return finishMis(this.id, 'diag', r, c, {
          q: `${REGN[Rg]} 모양 배지예요.\n\n[reg ${Rg} ${s}]\n\n${showWork(`꼭짓점마다 대각선이 ${Rg - 3}개씩이니까 ${Rg} × ${Rg - 3} = ${Rg * (Rg - 3)}개예요`)}`,
          ok: `한 대각선을 양 끝에서 두 번 셌어요 — ${Rg * (Rg - 3)} ÷ 2 = ${(Rg * (Rg - 3)) / 2}개`,
          wr: [
            { text: '맞게 말했어요', tag: RIGHT_AS_WRONG },
            // 두 번 센 값(보여 준 말)에 변을 더하면 실수가 둘 — 바른 대각선에 변만 더한 값 (Codex 16차 #1과 같은 모양, 17차 ② 이름표 검사가 잡음)
            { text: `변도 더해서 ${(Rg * (Rg - 3)) / 2 + Rg}개예요`, tag: TAGS.diagWithSides },
            { text: '대각선은 한 꼭짓점에서만 그어요', tag: OFF },
          ],
          steps: [`${Rg} × ${Rg - 3} = ${Rg * (Rg - 3)} (한 대각선을 두 번 셈)`, `${Rg * (Rg - 3)} ÷ 2 = ${(Rg * (Rg - 3)) / 2}개`],
          whyAny: '대각선 하나는 양 끝 꼭짓점에서 한 번씩, 두 번 세어져요.',
          rule: '대각선의 수 = 꼭짓점의 수 × (꼭짓점의 수 − 3) ÷ 2.',
        });
      }
      const P = quadOf(r, 'rhom');
      return finishMis(this.id, 'reg', r, c, {
        q: `모눈 위에 그린 마름모예요.\n\n${gp(P)}\n\n${showWork('네 변의 길이가 모두 같으니까 정다각형이에요')}`,
        ok: '각의 크기가 모두 같지는 않아요 — 정다각형이 아니에요',
        wr: [
          { text: '맞게 말했어요', tag: RIGHT_AS_WRONG },
          { text: '네 변의 길이가 달라서 정다각형이 아니에요', tag: TAGS.wrongReason },
          { text: '사각형은 다각형이 아니에요', tag: OFF },
        ],
        steps: ['정다각형 = 변의 길이도, 각의 크기도 모두 같은 다각형', '이 마름모는 변은 같지만 각이 달라요 → 정다각형이 아니에요'],
        whyAny: '변의 길이만 같다고 정다각형이 아니에요. 각의 크기도 모두 같아야 해요.',
        rule: '정다각형 = 변의 길이도, 각의 크기도 모두 같은 다각형.',
      });
    },
  },

  {
    id: 'shp.angle', grade: 4, name: '삼각형·사각형의 각의 합', needs: ['shp.poly'],
    idea: '삼각형의 세 각의 크기의 합은 **180°**, 사각형의 네 각의 크기의 합은 **360°**예요 (사각형은 삼각형 두 개로 나눠져요). 모르는 각은 합에서 아는 각을 **모두** 빼서 구해요.',
    slip: '삼각형이면 180°, 사각형이면 360°에서 아는 각을 하나씩 모두 빼 봐요.',
    calc(r, c) {
      // 세 각 모두 30°↑ (좁은 각은 이름표가 안 들어간다)
      let a = 5 * int(r, 6, 16); let b = 5 * int(r, 6, 16);
      if (a + b > 150) b = 150 - a;
      if (a + b === 90) b += 5; // 90이면 "더하기만 함"이 우연히 맞는 값
      const q = quadAngles(r);
      let p = 10 * int(r, 3, 12); if (p === 60) p = 70; // 60이면 밑각도 60 — 꼭짓각 = 밑각이 우연히 맞는 값 · 120까지(밑각 30°↑)
      const base = (180 - p) / 2;
      const Rg = pickFor(r, c, [5, 6, 8], (k, w) => w.includes(REGN[k])); const s = int(r, 2, 9);
      const inner = ((Rg - 2) * 180) / Rg;
      const angs = [a, b, 180 - a - b]; const askI = pickFor(r, c, [0, 1, 2], (i, w) => w.includes(`각 ${VNAMES[i]}의 크기`));
      const triTok = angs.map((v, i) => (i === askI ? `?${v}` : `${v}`));
      const known = angs.filter((_, i) => i !== askI);
      const Q4 = [...q, 360 - q[0] - q[1] - q[2]];
      const fams = [
        { ans: String(angs[askI]), wr: [{ text: String(360 - known[0] - known[1]), tag: TAGS.triAs360 }, { text: String(known[0] + known[1]), tag: TAGS.addNotSub }, { text: String(180 - known[0]), tag: TAGS.missOne }],
          why: {
            [TAGS.triAs360]: '360°는 사각형의 네 각의 합이에요. 삼각형은 180°예요.',
            [TAGS.addNotSub]: '아는 두 각을 더한 다음, 180°에서 빼야 해요.',
            [TAGS.missOne]: `아는 각이 두 개예요 — ${known[1]}°도 빼요.`,
          },
          steps: ['삼각형의 세 각의 합은 180°', `180° − ${known[0]}° − ${known[1]}° = ${angs[askI]}°`],
          rule: '삼각형의 세 각의 크기의 합은 180°.',
          pools: { pokemon: [`삼각형 ㄱㄴㄷ이에요.\n\n[tria ${triTok.join(' ')}]\n\n각 ${VNAMES[askI]}의 크기는 몇 도일까요?`] } },
        { ans: String(Q4[3]), wr: [{ text: String(q[0] + q[1] + q[2]), tag: TAGS.addNotSub }, { text: String(360 - q[0] - q[1]), tag: TAGS.missOne }],
          why: {
            [TAGS.addNotSub]: '아는 세 각을 더한 다음, 360°에서 빼야 해요.',
            [TAGS.missOne]: `아는 각이 세 개예요 — ${q[2]}°도 빼요.`,
          },
          steps: ['사각형의 네 각의 합은 360°', `360° − ${q[0]}° − ${q[1]}° − ${q[2]}° = ${Q4[3]}°`],
          rule: '사각형의 네 각의 크기의 합은 360°.',
          pools: { pokemon: [`사각형 ㄱㄴㄷㄹ이에요.\n\n[quad ${q[0]} ${q[1]} ${q[2]} ?${Q4[3]}]\n\n각 ㄹ의 크기는 몇 도일까요?`] } },
        { ans: String(base), wr: [{ text: String(180 - p), tag: TAGS.noHalfBase }, { text: String(p), tag: TAGS.apexAsBase }],
          why: {
            [TAGS.noHalfBase]: `${180 - p}°는 두 각 ㄱ과 ㄴ을 합한 크기예요. 둘은 크기가 같으니 반으로 나눠요.`,
            [TAGS.apexAsBase]: `${p}°는 각 ㄷ이에요. 크기가 같은 것은 각 ㄱ과 각 ㄴ이에요.`,
          },
          steps: [`각 ㄱ + 각 ㄴ = 180° − ${p}° = ${180 - p}°`, `두 각은 크기가 같아요: ${180 - p}° ÷ 2 = ${base}°`],
          rule: '이등변삼각형은 두 각의 크기가 같다 — 180°에서 나머지 각을 빼고 둘로 나눈다.',
          pools: { pokemon: [`변 ㄴㄷ과 변 ㄷㄱ의 길이가 같은 이등변삼각형이에요.\n\n[tria _${base} ?${base} ${p} iso]\n\n각 ㄴ의 크기는 몇 도일까요?`] } },
        { ans: String(inner), wr: [{ text: String((Rg - 2) * 180), tag: TAGS.sumNotEach }, { text: String(360 / Rg), tag: TAGS.centerAngle }],
          why: {
            [TAGS.sumNotEach]: `${(Rg - 2) * 180}°는 ${Rg}개 각을 모두 더한 크기예요. 정다각형은 각이 모두 같으니 ${Rg}로 나눠요.`,
            [TAGS.centerAngle]: `360° ÷ ${Rg}${numJosa(Rg, '은', '는')} 한 각이 아니에요. 먼저 삼각형으로 나눠 각의 합을 구해요.`,
          },
          steps: [`한 꼭짓점에서 대각선을 그으면 삼각형 ${Rg - 2}개 → 각의 합 180° × ${Rg - 2} = ${(Rg - 2) * 180}°`, `각이 ${Rg}개로 모두 같아요: ${(Rg - 2) * 180}° ÷ ${Rg} = ${inner}°`],
          rule: '정다각형의 한 각 = 각의 합 ÷ 각의 수 (각의 합은 삼각형으로 나눠서).',
          pools: { pokemon: [`${REGN[Rg]} 모양 배지예요.\n\n[reg ${Rg} ${s}]\n\n${REGN[Rg]}의 한 각의 크기는 몇 도일까요?`] } },
      ];
      return finish(this.id, r, c, pickFamily(r, c, fams));
    },
    misread(r, c) {
      if (branchOf(r, c, ['quad', 'tri']) === 'quad') {
        // 나머지 두 각의 합이 180°면 "180° − 첫째 각" 오답이 우연히 맞는 값이 된다 (105, 90, 90 → 75)
        let q = quadAngles(r); for (let k = 0; k < 20 && q[1] + q[2] === 180; k++) q = quadAngles(r);
        const d = 360 - q[0] - q[1] - q[2];
        return finishMis(this.id, 'quad', r, c, {
          q: `사각형 ㄱㄴㄷㄹ이에요.\n\n[quad ${q[0]} ${q[1]} ${q[2]} ?${d}]\n\n${showWork(`각 ㄹ은 360° − ${q[0]}° − ${q[1]}° = ${360 - q[0] - q[1]}°예요`)}`,
          ok: `각 ㄷ의 ${q[2]}°도 빼야 해요 — 360° − ${q[0]}° − ${q[1]}° − ${q[2]}° = ${d}°`,
          wr: [
            { text: '맞게 말했어요', tag: RIGHT_AS_WRONG },
            // "180° − 첫째 각"은 180°와 빠뜨림 두 실수가 섞인 값이었다 — 실수 하나만, 수 없이 (Codex 17차 #2)
            { text: '사각형도 삼각형처럼 180°에서 빼야 해요', tag: TAGS.quadAs180 },
            { text: '이 사각형의 각은 알 수 없어요', tag: OFF },
          ],
          steps: ['사각형의 네 각의 합은 360°', `360° − ${q[0]}° − ${q[1]}° − ${q[2]}° = ${d}°`],
          whyAny: '아는 각을 하나 빠뜨렸어요. 아는 각은 모두 빼요.',
          rule: '사각형의 네 각의 크기의 합은 360°.',
        });
      }
      let a = 5 * int(r, 6, 16); let b = 5 * int(r, 6, 16); if (a + b > 150) b = 150 - a; if (a + b === 90) b += 5;
      const cc = 180 - a - b;
      return finishMis(this.id, 'tri', r, c, {
        q: `삼각형 ㄱㄴㄷ이에요.\n\n[tria ${a} ${b} ?${cc}]\n\n${showWork(`각 ㄷ은 180° − ${a}° = ${180 - a}°예요`)}`,
        ok: `각 ㄴ의 ${b}°도 빼야 해요 — 180° − ${a}° − ${b}° = ${cc}°`,
        wr: [
          { text: '맞게 말했어요', tag: RIGHT_AS_WRONG },
          { text: `삼각형은 360°에서 빼야 해요 — ${360 - a - b}°`, tag: TAGS.triAs360 },
          { text: '이 삼각형의 각은 알 수 없어요', tag: OFF },
        ],
        steps: ['삼각형의 세 각의 합은 180°', `180° − ${a}° − ${b}° = ${cc}°`],
        whyAny: '아는 각을 하나 빠뜨렸어요. 아는 두 각을 모두 빼요.',
        rule: '삼각형의 세 각의 크기의 합은 180°.',
      });
    },
  },
];

export function conceptById(id) {
  return SHAPE.find((c) => c.id === id) || null;
}

// ───────────────────── 문항 만들기 (다른 줄기와 같은 모양) ─────────────────────

/**
 * 개념 하나의 문항 한 개
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
const SLIP = '한 번 더 천천히 — 변의 길이·평행·직각을 모눈으로 하나씩 확인해요.';

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
  return diagnosticOf(SHAPE, makeQuestion, seed, n, opts);
}
export function placeFrom(answers) {
  return placeFromOf(SHAPE, answers);
}
export function ladder(doneIds) {
  return ladderOf(SHAPE, doneIds);
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
 * coach/math/shape.json 형식 검사 — matharea.checkContent와 같은 규칙
 * @returns {string[]}
 */
export function checkContent(content) {
  const bad = [];
  for (const c of SHAPE) {
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
