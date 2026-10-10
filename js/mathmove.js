// 🔄 수학 — AB 평면도형의 이동 줄기 (초4 「평면도형의 이동」 4-1): 개념 사다리 + 문제 생성기 + 내용 형식 검사.
// 순수 함수만 — 화면 없음 (node 테스트에서 그대로 돈다).
//
// 왜 이 줄기인가 (2026-10-09, 아버님 "4-1의 마지막 줄기인 AB 평면도형의 이동을 설계부터 시작 하자" → 칸별 설계안 "이대로 진행"):
//   4-1 네 단원의 마지막 — 처음으로 도형을 머릿속에서 움직여 본다. 5-2 합동과 대칭(M)의 뒤집기·돌리기 감각이 여기서 시작된다.
// 칸 범위: 2022 천재(한대희) 4-1 지도서 4단원(12차시) — 점의 이동 → 밀기 → 뒤집기 → 돌리기 → 무늬 · 2022 [4수03-04]·[4수03-05]
//   · 2022 고려 사항 "돌리고 뒤집기나 뒤집고 돌리기 등 복잡한 변화를 지양" → 두 움직임을 잇는 문항은 없다(2022판에 그 차시도 없다)
//   · 밀기·뒤집기는 위쪽·아래쪽·왼쪽·오른쪽, 돌리기는 시계·시계 반대 방향 90°·180°·270°·360°만 (지도서 단원 지도 유의 사항)
//   · 점의 이동은 모눈 선을 따라 '몇 칸'·'몇 cm'(한 칸 1 cm) — 꼭짓점을 옮겨 도형의 이동을 말하지 않는다(2022 성취기준 해설)
//   · 무늬는 2022 성취기준에서 빠졌지만 천재 2022 9차시에 있어 규칙 찾기만(꾸미기 활동은 없다)
//   · ⭐ 활용 = 2022 마무리 — 처음 도형 거꾸로 찾기 · 디지털 숫자 카드를 뒤집거나 돌려 만든 수
// 도형은 모눈 칸으로 만든 모양(4~5칸) — 어느 쪽으로 봐도 대칭이 없는 모양만 써서 뒤집기·돌리기 결과가 늘 다르다(지도서: 비대칭 모양부터).
//   칸 모양이라 ✍️ 칸 칠하기 판에 그대로 칠할 수 있다 — 밀기는 자리까지, 뒤집기·돌리기는 모양만(지도서 ②: 모눈을 같이 옮겨 그리게 강요하지 않음)
// 오답은 지도서·연구(이승진 2017, 천재 2022 지도서 210쪽 인용)·2015 지도서 오답 유형이 꼽은 흔한 생각:
//   · 밀기를 뒤집기와 헷갈림(모양을 바꿈) · 두 도형 사이의 빈칸을 민 길이로 봄 · 방향을 반대로 봄 · 출발점도 한 칸으로 셈
//   · 두 점 사이의 점만 셈(점 몇 cm — 두 도형 사이의 빈칸만 세는 생각의 점 판, Codex 44차 #4)
//   · 위쪽과 아래쪽으로 뒤집은 모양이 다르다고 봄 · 뒤집기를 180° 돌리기로 봄 · 오른쪽으로 뒤집었는데 위아래를 바꿈
//   · 돌리는 방향을 반대로 봄 · 돌리는 각도를 헷갈림 · 180°만큼 돌리기를 위아래 뒤집기로 봄 · 처음 도형을 찾을 때 거꾸로 하지 않음 · 카드 줄의 순서가 바뀌는 것을 놓침
//
// 새 줄기의 함정(메모 stem-generator-pitfalls)을 처음부터:
//   · 가족 = 틀 여러 개(방향·각도 낱말마다 한 틀) — 🔁 쌍둥이가 요청한 틀(tplKey)로 온다
//   · ★ tplKey는 숫자만 #로 지운다 → 그림 속 칸 모양은 "가로 칸 수.칸들"(3.011110010) 꼴로 적는다 — "011/110/010"처럼 적으면
//     모양의 줄 수가 열쇠에 들어가 같은 틀도 열쇠가 갈린다. 모눈 크기는 틀마다 고정
//   · 후보에서 고르는 ①은 "어느 것" 말투 (아니면 숫자판이 뜬다) · ㉠~㉣는 늘 받침 — "㉠은 · ㉠과"
//   · 한 값(한 모양·한 자리)이 서로 다른 두 틀린 생각에서 다 나오면 그 후보는 진단이 안 된다 — 후보 모양·자리는 서로 다르게
//   · ★ 틀린 생각은 **묻는 움직임 전체**에 적용해 오답을 만든다 — "두 번 뒤집기"에 다른 축을 두 번 다 하면 처음 모양(= 정답)이라
//     묻는 움직임을 한 번(가를 한 번 더)으로 묻는다 (Codex 44차 #2)
//   · 셈이 없는 줄기라 수 답(점 몇 cm·민 길이·숫자 카드)에도 근처 수 "계산 실수"를 채우지 않는다 — 일부러 만든 오답만 (Codex 44차 #4)
//   · 아직 안 배운 말을 앞 칸에 쓰지 않는다(점의 이동에 밀기·뒤집기·돌리기 · 밀기에 뒤집기·돌리기 · 뒤집기에 돌리기·°)
// ★ 정답·오답은 테스트가 **문제 글과 그림 지시문을 따로 읽어** 다시 움직여 본다 (tests/mathmove.test.js).

import { rng, shuffle, fill, castOf, int, pick, humanQuestion, checkHuman, diagnosticOf, placeFromOf, ladderOf } from './mathgen.js';
import { gradeLabel } from './mathmix.js';
import { _kit } from './mathexpr.js';

export { gradeLabel };

const { famOf, runFamily, calcAsk, misAsk, branchOf, RIGHT_AS_WRONG, OFF } = _kit;

/** 가족에서 틀 하나를 골라 ① 문항으로 — ✍️ 판(draw)도 넘긴다 (공용 calcAsk는 draw를 모른다) · 수 답에도 근처 수 "계산 실수"를 채우지 않는다(셈이 없는 줄기, Codex 44차 #4) */
function askFam(r, c, concept, fams) {
  const v = runFamily(r, c, fams);
  const q = calcAsk(r, c, concept, { ...v, near: false });
  return v.draw ? { ...q, draw: v.draw } : q;
}
/** 조건에 맞을 때까지 다시 뽑기 */
function drawUntil(gen, ok) {
  for (let k = 0; k < 4000; k++) { const v = gen(); if (ok(v)) return v; }
  throw new Error('drawUntil: 조건에 맞는 것을 못 뽑음');
}

// ───────────────────── 칸 모양 ─────────────────────
// 모양 글 "011/110/010" — 첫 줄이 위쪽, 1이 칠한 칸. 그림에는 enc()로 "3.011110010" (위 머리말의 tplKey 까닭)

const G = (v) => String(v).split('/').map((row) => [...row].map(Number));
const S = (g) => g.map((row) => row.join('')).join('/');
/** 그림 지시문용 — "가로 칸 수.칸들" */
export const enc = (v) => { const g = G(v); return `${g[0].length}.${g.map((row) => row.join('')).join('')}`; };
const widthOf = (v) => G(v)[0].length;
const heightOf = (v) => G(v).length;
/** 왼쪽·오른쪽으로 뒤집기 — 왼쪽과 오른쪽이 바뀐다 */
export const flipLR = (v) => S(G(v).map((row) => [...row].reverse()));
/** 위쪽·아래쪽으로 뒤집기 — 위쪽과 아래쪽이 바뀐다 */
export const flipUD = (v) => S([...G(v)].reverse());
/** 시계 방향으로 90°만큼 돌리기 */
export const rotCW = (v) => { const g = G(v); const H = g.length; const W = g[0].length; return S(Array.from({ length: W }, (_, i) => Array.from({ length: H }, (_, j) => g[H - 1 - j][i]))); };
/** 시계 방향으로 90° × k (k는 음수도 — 시계 반대 방향) */
export const rot = (v, k) => { let out = v; for (let n = 0; n < ((k % 4) + 4) % 4; n++) out = rotCW(out); return out; };

/** 모양 바탕 — 어느 쪽으로 봐도 대칭이 없는 4~5칸 모양(여덟 모습이 모두 다르다 — 테스트가 확인) */
export const BASES = ['10/10/11', '011/110/010', '10/10/10/11', '01/01/11/10', '11/11/10', '01/11/01/01'];
/** 아무 모습으로 놓은 모양 (가로·세로 칸 수 상한) */
function shapeOf(r, maxW = 4, maxH = 4) {
  return drawUntil(() => {
    let v = pick(r, BASES);
    v = rot(v, int(r, 0, 3));
    return r() < 0.5 ? flipLR(v) : v;
  }, (v) => widthOf(v) <= maxW && heightOf(v) <= maxH);
}

const LBL = ['㉠', '㉡', '㉢', '㉣'];
/**
 * 후보를 ㉠~㉣에 섞어 놓기 — list[0]이 정답. 돌려주는 것: { pairs:[[㉠, 값]…], ans:'㉡', wr:[{text:'㉠', tag}…] }
 * 값은 서로 달라야 한다 (같은 그림이 둘이면 정답이 둘) — 다르지 않으면 null
 */
function placeCands(r, list) {
  if (new Set(list.map((x) => x.v)).size !== list.length) return null;
  const order = shuffle(r, list.map((_, i) => i));
  const pairs = order.map((idx, n) => [LBL[n], list[idx].v]);
  const at = (idx) => LBL[order.indexOf(idx)];
  return { pairs, ans: at(0), wr: list.slice(1).map((x, n) => ({ text: at(n + 1), tag: x.tag })) };
}
/** 모양 나란히 그림 `[shapes 처음=… ㉠=…]` */
const SH = (pairs) => `[shapes ${pairs.map(([k, v]) => (v === '?' ? `${k}=?` : `${k}=${enc(v)}`)).join(' ')}]`;
/** 모양 후보로 ① — 처음 모양 그림 + 후보 그림 · ✍️ 판은 모양만 맞으면(kind 'shape') */
function shapeAsk(r, { head, given, list, steps, why, probe }) {
  const P = placeCands(r, list);
  const candFig = SH(P.pairs);
  return {
    t: `${head}\n\n${given}\n\n${candFig}`,
    text: true, ans: P.ans, wr: P.wr, steps: [...steps, `→ ${P.ans}`], why,
    draw: { fig: candFig.slice(1, -1), mode: 'mcells', kind: 'shape', target: list[0].v, cands: P.pairs.map(([k, v]) => ({ k, v })) },
    probe: { ...probe, cands: Object.fromEntries(P.pairs) },
  };
}

// ───────────────────── 움직임의 말 ─────────────────────

const FLIP_KO = { right: '오른쪽', left: '왼쪽', up: '위쪽', down: '아래쪽' };
/** 그쪽으로 뒤집기 */
const flipBy = (dir, v) => (dir === 'right' || dir === 'left' ? flipLR(v) : flipUD(v));
/** 다른 축으로 뒤집기 (오른쪽으로 뒤집기에 위아래를 바꿈) */
const flipOther = (dir, v) => (dir === 'right' || dir === 'left' ? flipUD(v) : flipLR(v));
const SWAP_KO = { right: '왼쪽과 오른쪽', left: '왼쪽과 오른쪽', up: '위쪽과 아래쪽', down: '위쪽과 아래쪽' };
const OTHER_KO = { right: '위쪽과 아래쪽', left: '위쪽과 아래쪽', up: '왼쪽과 오른쪽', down: '왼쪽과 오른쪽' };
/** 돌리기 — cw: 시계 방향, deg: 90·180·270·360 → 시계 방향 90° 횟수 */
const quarter = (cw, deg) => (cw ? 1 : -1) * (deg / 90);
const TURN_KO = (cw, deg) => `${cw ? '시계 방향' : '시계 반대 방향'}으로 ${deg}°만큼`;
/** 위쪽 부분이 가는 쪽 (시계 방향 90° 횟수) */
const TOP_GOES = ['위쪽', '오른쪽', '아래쪽', '왼쪽'];
const topGoes = (k) => TOP_GOES[((k % 4) + 4) % 4];

// ───────────────────── 이름표 ─────────────────────

/** 이 줄기의 오개념 이름표 (📊·🤔 노트·결과 카드에 그대로 뜬다) — 이름표 하나에 생각 하나 */
export const TAGS = {
  startCount: '출발점도 한 칸으로 셈',
  between: '두 점 사이의 점만 셈', // 점 몇 cm에서 n − 1 — 두 점 사이에 있는 점만 셈 (Codex 44차 #4: 그 자리에 근처 수 "계산 실수"가 들어갔다)
  wayBack: '방향을 반대로 봄',
  swapXY: '가로와 세로 칸 수를 바꿈',
  oneWay: '한 방향만 움직임',
  gapOnly: '두 도형 사이의 빈칸을 민 길이로 봄',
  spanAll: '두 도형을 모두 지나는 칸을 셈',
  slideFlip: '밀었는데 모양을 바꿈',
  axisMix: '뒤집는 방향을 바꿔 봄',
  keep: '모양이 바뀌지 않는다고 봄',
  flipAsTurn: '뒤집을 때 두 쪽을 모두 바꿈', // 위쪽·아래쪽과 왼쪽·오른쪽을 다 바꿈(= 180° 돌린 모양) — 돌리기를 배우기 전 칸에도 뜨는 이름표라 돌리기 말을 쓰지 않는다
  upDownDiff: '반대쪽으로 뒤집으면 다른 모양이라고 봄',
  twiceFlip: '두 번 뒤집으면 처음 모양인 것을 모름',
  turnBack: '돌리는 방향을 반대로 봄',
  turnHalf: '돌리는 각도를 헷갈림', // 90°↔180°만이 아니라 270°에서 180°를 고르는 것도 — 어느 각도인지는 풀이 글이 말한다 (Codex 44차 #3)
  turnAsFlip: '돌리기를 뒤집기로 봄',
  dirIgnore: '돌리는 방향을 생각하지 않음',
  full360: '360°만큼 돌리면 처음 모양인 것을 모름',
  ruleSkip: '규칙대로 한 번 더 움직이지 않음',
  noUndo: '움직인 모양을 처음 모양으로 봄',
  notReverse: '거꾸로 하지 않고 같은 쪽으로 또 움직임',
  orderKeep: '카드 줄의 순서가 바뀌는 것을 놓침', // 한꺼번에 돌리기·왼쪽(오른쪽)으로 뒤집기 둘 다 — 어느 움직임인지는 문제 글이 말한다 (Codex 44차 #5)
  orderSwap: '위아래로 뒤집어도 카드 순서가 바뀐다고 봄',
  digitKeep: '숫자 모양은 그대로 둠',
};

// ───────────────────── 점의 이동 (모눈점 · 위에서부터 셈) ─────────────────────

const PW = 8; const PH = 6; // 모눈 가로 8칸 · 세로 6칸 — 틀마다 늘 같은 크기
const DIRS = { R: [1, 0], L: [-1, 0], U: [0, -1], D: [0, 1] };
const DIR_KO = { R: '오른쪽', L: '왼쪽', U: '위쪽', D: '아래쪽' };
const OPP = { R: 'L', L: 'R', U: 'D', D: 'U' };
const inP = (p) => p.x >= 0 && p.x <= PW && p.y >= 0 && p.y <= PH;
const go = (p, d, n) => ({ x: p.x + DIRS[d][0] * n, y: p.y + DIRS[d][1] * n });
const pk = (p) => `${p.x},${p.y}`;
const unpk = (s) => { const [x, y] = s.split(',').map(Number); return { x, y }; };
const PT = (list, cm = false) => `[move ${PW}x${PH}${cm ? ' cm' : ''} ${list.map(([k, p]) => `${k}@${p.x},${p.y}`).join(' ')}]`;
/** 두 방향 말 — "오른쪽으로 3칸, 위쪽으로 2칸" */
const two = (h, a, v, b) => `${DIR_KO[h]}으로 ${a}칸, ${DIR_KO[v]}으로 ${b}칸`;

// ───────────────────── 밀기 (모눈 칸 · 위에서부터 셈) ─────────────────────
// 가로로 미는 틀은 가로 12칸 · 세로 4칸, 세로로 미는 틀은 가로 5칸 · 세로 12칸 (거꾸로 찾는 ⭐는 가로 14칸)

const SLIDE = { R: [1, 0], L: [-1, 0], U: [0, -1], D: [0, 1] };
const horiz = (d) => d === 'R' || d === 'L';
/** 모눈 위 도형 하나 "x,y=모양" (판·후보의 값) */
const tok = (x, y, v) => `${x},${y}=${v}`;
const MV = (W, H, cm, items) => `[move ${W}x${H}${cm ? ' cm' : ''} ${items.map(([k, x, y, v]) => `${k}@${x},${y}=${enc(v)}`).join(' ')}]`;
/** 미는 쪽으로 도형이 차지하는 칸 수 */
const extent = (d, v) => (horiz(d) ? widthOf(v) : heightOf(v));
/** 미는 쪽으로 뒤집은 모양 — 가로로 밀면 왼쪽·오른쪽이, 세로로 밀면 위쪽·아래쪽이 바뀐 모양 */
const flipAlong = (d, v) => (horiz(d) ? flipLR(v) : flipUD(v));
/**
 * 밀기 자리 뽑기 — 처음 도형 v의 자리(x,y)와 민 길이 n (n > 미는 쪽 칸 수 → 두 도형이 겹치지 않고 빈칸이 1칸 이상)
 * need: 처음 자리에서 미는 쪽(+)·반대쪽(−)으로 확보해야 할 칸 수 [앞, 뒤] (도형 칸 수 w를 받아)
 */
function slideSpot(r, d, W, H, v, nRange, need) {
  const w = extent(d, v);
  return drawUntil(() => {
    const n = int(r, w + nRange[0], w + nRange[1]);
    const along = horiz(d) ? W : H; const across = horiz(d) ? H : W; const side = horiz(d) ? heightOf(v) : widthOf(v);
    const [fwd, back] = need(w, n);
    // 미는 쪽 좌표(a)의 범위: 미는 쪽으로 fwd칸(처음 도형 끝에서), 반대쪽으로 back칸이 모눈 안 — 미는 쪽이 왼쪽·위쪽이면 거꾸로
    const [lo, hi] = (d === 'R' || d === 'D') ? [back, along - w - fwd] : [fwd, along - w - back];
    if (lo > hi || across - side < 0) return { ok: false };
    return { n, w, a: int(r, lo, hi), b: int(r, 0, across - side), ok: true };
  }, (s) => s.ok);
}
/** 축 좌표(a: 미는 쪽, b: 가로지르는 쪽) → x, y */
const xyOf = (d, a, b) => (horiz(d) ? [a, b] : [b, a]);
/** 미는 쪽 부호 (오른쪽·아래쪽 +) */
const sgn = (d) => (d === 'R' || d === 'D' ? 1 : -1);
const SLIDE_KO = DIR_KO;
/** 미는 쪽의 맨 앞 칸 이름 — 같은 칸이 움직인 칸 수를 셀 때 */
const EDGE_KO = { R: '맨 왼쪽 칸', L: '맨 왼쪽 칸', U: '맨 위 칸', D: '맨 위 칸' };

// ───────────────────── 디지털 숫자 ─────────────────────

const R180 = { 0: 0, 2: 2, 5: 5, 6: 9, 8: 8, 9: 6 };
const UD = { 0: 0, 2: 5, 3: 3, 5: 2, 8: 8 };
const LR = { 0: 0, 2: 5, 5: 2, 8: 8 };

// ───────────────────── ② 공용 ─────────────────────

const SAID = (fig, line) => `{mon/이/가} 이렇게 말했어요.${fig ? `\n\n${fig}` : ''}\n\n**${line}**\n\n어디가 틀렸을까요?`;
const DREW = (what, fig) => `{mon/이/가} ${what}\n\n${fig}\n\n어디가 틀렸을까요?`;
const RIGHT_SAID = { text: '맞게 말했어요', tag: RIGHT_AS_WRONG };
const RIGHT_DREW = { text: '맞게 그렸어요', tag: RIGHT_AS_WRONG };

// ───────────────────── 개념 사다리 (AB. 평면도형의 이동 줄기) ─────────────────────

export const MOVE = [
  {
    id: 'mv.point', grade: 4, name: '점의 이동', needs: [],
    idea: '점은 모눈 선을 따라 움직여요. 점 ㄱ을 오른쪽으로 3칸 이동하면 — 점 ㄱ이 있는 곳은 세지 않고, 다음 점부터 1, 2, 3 하고 세어 셋째 점에 가요. 두 방향으로 갈 때는 "오른쪽으로 3칸, 위쪽으로 2칸"처럼 한 방향씩 차례로 가요. 모눈 한 칸이 1 cm면 3칸은 3 cm예요.',
    rule: '점 ㄱ이 있는 곳은 세지 않고 다음 점부터 1, 2, 3 — 두 방향이면 한 방향씩 차례로.',
    slip: '출발한 점은 세지 않아요 — 한 칸 옮길 때마다 1씩 세요.',
    calc(r, c) {
      // 한 방향 — 후보 셋(바르게 · 출발점도 셈 · 반대쪽)
      const oneDir = (d) => {
        const { n, p } = drawUntil(() => ({ n: int(r, 2, 5), p: { x: int(r, 0, PW), y: int(r, 0, PH) } }),
          (s) => [go(s.p, d, s.n), go(s.p, d, s.n - 1), go(s.p, OPP[d], s.n)].every(inP));
        const P = placeCands(r, [{ v: pk(go(p, d, n)) }, { v: pk(go(p, d, n - 1)), tag: TAGS.startCount }, { v: pk(go(p, OPP[d], n)), tag: TAGS.wayBack }]);
        return {
          t: `점 ㄱ을 ${DIR_KO[d]}으로 ${n}칸 이동한 곳은 어느 것일까요?\n\n${PT([['ㄱ', p], ...P.pairs.map(([k, v]) => [k, unpk(v)])])}`,
          text: true, ans: P.ans, wr: P.wr,
          steps: [`점 ㄱ이 있는 곳은 세지 않고, 다음 점부터 ${DIR_KO[d]}으로 1, 2, …, ${n}`, `${n}칸 간 곳 → ${P.ans}`],
          why: { [TAGS.startCount]: `점 ㄱ이 있는 곳부터 세어 ${n - 1}칸만 갔어요 — 점 ㄱ에서 다음 점으로 한 번 옮길 때가 1칸이에요.`, [TAGS.wayBack]: `${DIR_KO[OPP[d]]}으로 갔어요 — 묻는 쪽은 ${DIR_KO[d]}이에요.` },
          draw: { fig: `move ${PW}x${PH} ㄱ@${pk(p)}`, mode: 'mpoint', target: [go(p, d, n).x, go(p, d, n).y], cands: P.pairs.map(([k, v]) => ({ k, ...unpk(v) })), from: [p.x, p.y] },
          probe: { ask: 'one', d, n, p },
        };
      };
      // 두 방향 — 후보 넷(바르게 · 가로세로 바꿈 · 가로를 반대쪽 · 한 방향만)
      const twoDir = (h, v) => {
        const { a, b, p } = drawUntil(() => ({ a: int(r, 2, 4), b: int(r, 1, 4), p: { x: int(r, 0, PW), y: int(r, 0, PH) } }), (s) => {
          if (s.a === s.b) return false;
          const L = [go(go(s.p, h, s.a), v, s.b), go(go(s.p, h, s.b), v, s.a), go(go(s.p, OPP[h], s.a), v, s.b), go(s.p, h, s.a)];
          return L.every(inP) && new Set(L.map(pk)).size === 4;
        });
        const P = placeCands(r, [
          { v: pk(go(go(p, h, a), v, b)) },
          { v: pk(go(go(p, h, b), v, a)), tag: TAGS.swapXY },
          { v: pk(go(go(p, OPP[h], a), v, b)), tag: TAGS.wayBack },
          { v: pk(go(p, h, a)), tag: TAGS.oneWay },
        ]);
        const end = go(go(p, h, a), v, b);
        return {
          t: `점 ㄱ을 ${two(h, a, v, b)} 이동한 곳은 어느 것일까요?\n\n${PT([['ㄱ', p], ...P.pairs.map(([k, w]) => [k, unpk(w)])])}`,
          text: true, ans: P.ans, wr: P.wr,
          steps: [`먼저 ${DIR_KO[h]}으로 ${a}칸`, `그다음 ${DIR_KO[v]}으로 ${b}칸 → ${P.ans}`],
          why: {
            [TAGS.swapXY]: `${two(h, b, v, a)} 갔어요 — 가로로 ${a}칸, 세로로 ${b}칸이에요.`,
            [TAGS.wayBack]: `${DIR_KO[OPP[h]]}으로 갔어요 — 묻는 쪽은 ${DIR_KO[h]}이에요.`,
            [TAGS.oneWay]: `${DIR_KO[h]}으로 ${a}칸만 갔어요 — ${DIR_KO[v]}으로 ${b}칸도 가요.`,
          },
          draw: { fig: `move ${PW}x${PH} ㄱ@${pk(p)}`, mode: 'mpoint', target: [end.x, end.y], cands: P.pairs.map(([k, w]) => ({ k, ...unpk(w) })), from: [p.x, p.y] },
          probe: { ask: 'two', h, v, a, b, p },
        };
      };
      // 어떻게 이동했나 — 말 보기
      const howTo = (h, v) => {
        const { a, b, p } = drawUntil(() => ({ a: int(r, 1, 4), b: int(r, 1, 4), p: { x: int(r, 0, PW), y: int(r, 0, PH) } }),
          (s) => s.a !== s.b && inP(go(go(s.p, h, s.a), v, s.b)));
        const t = go(go(p, h, a), v, b);
        return {
          t: `점 ㄱ이 ㉮에 도착하려면 어떻게 이동해야 할까요?\n\n${PT([['ㄱ', p], ['㉮', t]])}`,
          text: true, ans: two(h, a, v, b),
          wr: [{ text: two(h, b, v, a), tag: TAGS.swapXY }, { text: two(OPP[h], a, OPP[v], b), tag: TAGS.wayBack }, { text: two(h, a + 1, v, b + 1), tag: TAGS.startCount }],
          steps: [`가로로 ${DIR_KO[h]}으로 ${a}칸 — 점 ㄱ이 있는 곳은 세지 않아요`, `세로로 ${DIR_KO[v]}으로 ${b}칸 → ${two(h, a, v, b)}`],
          why: {
            [TAGS.swapXY]: `가로와 세로를 바꿨어요 — 가로로 ${a}칸, 세로로 ${b}칸이에요.`,
            [TAGS.wayBack]: `㉮는 점 ㄱ의 ${DIR_KO[h]}, ${DIR_KO[v]}에 있어요.`,
            [TAGS.startCount]: `점 ㄱ이 있는 곳까지 세었어요 — 한 칸 옮길 때마다 1씩, ${a}칸과 ${b}칸이에요.`,
          },
          probe: { ask: 'how', h, v, a, b, p },
        };
      };
      // 몇 cm — 숫자판
      const cmTo = (d) => {
        const { n, p } = drawUntil(() => ({ n: int(r, 2, 6), p: { x: int(r, 0, PW), y: int(r, 0, PH) } }), (s) => inP(go(s.p, d, s.n)));
        return {
          t: `모눈 한 칸의 길이는 1 cm예요. 점 ㄱ을 ${DIR_KO[d]}으로 몇 cm 이동하면 ㉮에 도착할까요?\n\n${PT([['ㄱ', p], ['㉮', go(p, d, n)]], true)}`,
          ans: String(n), wr: [{ text: String(n + 1), tag: TAGS.startCount }, { text: String(n - 1), tag: TAGS.between }],
          steps: [`점 ㄱ에서 ㉮까지 ${DIR_KO[d]}으로 ${n}칸 — 점 ㄱ이 있는 곳은 세지 않아요`, `한 칸이 1 cm → ${n} cm`],
          why: {
            [TAGS.startCount]: `점을 세었어요 — 점 ㄱ까지 세면 ${n + 1}개지만, 칸은 ${n}칸이에요.`,
            [TAGS.between]: `두 점 사이에 있는 점 ${n - 1}개만 셌어요 — 점 ㄱ에서 ㉮까지 옮긴 칸은 ${n}칸이에요.`,
          },
          probe: { ask: 'cm', d, n, p },
        };
      };
      return askFam(r, c, this, [
        famOf(['R', 'L', 'U', 'D'].map((d) => oneDir(d))),
        famOf([['R', 'U'], ['R', 'D'], ['L', 'U'], ['L', 'D']].map(([h, v]) => twoDir(h, v))),
        famOf([howTo(pick(r, ['R', 'L']), pick(r, ['U', 'D']))]), // 문제 글이 방향마다 같다 — 방향은 가족 안에서
        famOf(['R', 'L', 'U', 'D'].map((d) => cmTo(d))),
      ]);
    },
    misread(r, c) {
      if (branchOf(r, c, ['count', 'swap']) === 'count') {
        const d = pick(r, ['R', 'L', 'U', 'D']);
        const { n, p } = drawUntil(() => ({ n: int(r, 3, 5), p: { x: int(r, 0, PW), y: int(r, 0, PH) } }), (s) => inP(go(s.p, d, s.n)));
        const kid = go(p, d, n - 1);
        return misAsk(r, c, this, 'count', {
          q: DREW(`점 ㄱ을 ${DIR_KO[d]}으로 ${n}칸 이동해서 ★에 놓았어요.`, PT([['ㄱ', p], ['★', kid]])),
          ok: `점 ㄱ이 있는 곳부터 세어서 ${n - 1}칸만 갔어요 — ★에서 ${DIR_KO[d]}으로 1칸 더 가야 해요`,
          wr: [RIGHT_DREW, { text: `${DIR_KO[OPP[d]]}으로 가야 해요`, tag: TAGS.wayBack }, { text: '점은 모눈 선을 따라 움직일 수 없어요', tag: OFF }],
          steps: [`점 ㄱ에서 다음 점이 1칸 — ${DIR_KO[d]}으로 1, 2, …, ${n}`, `★은 ${n - 1}칸 간 곳 — 1칸 더`],
          whyAny: '출발한 점은 세지 않아요. 점 ㄱ에서 다음 점으로 옮길 때가 1칸이에요.',
          probe: { ask: 'count', d, n, p, kid },
        });
      }
      const h = pick(r, ['R', 'L']); const v = pick(r, ['U', 'D']);
      const { a, b, p } = drawUntil(() => ({ a: int(r, 2, 4), b: int(r, 1, 4), p: { x: int(r, 0, PW), y: int(r, 0, PH) } }),
        (s) => s.a !== s.b && inP(go(go(s.p, h, s.a), v, s.b)) && inP(go(go(s.p, h, s.b), v, s.a)));
      const kid = go(go(p, h, b), v, a);
      return misAsk(r, c, this, 'swap', {
        q: DREW(`점 ㄱ을 ${two(h, a, v, b)} 이동해서 ★에 놓았어요.`, PT([['ㄱ', p], ['★', kid]])),
        ok: `가로와 세로를 바꿨어요 — ${two(h, a, v, b)} 가야 해요`,
        wr: [RIGHT_DREW, { text: `${DIR_KO[OPP[h]]}으로 ${a}칸 가야 해요`, tag: TAGS.wayBack }, { text: '점은 두 방향으로 이동할 수 없어요', tag: OFF }],
        steps: [`가로로 ${DIR_KO[h]}으로 ${a}칸`, `세로로 ${DIR_KO[v]}으로 ${b}칸 — ★은 ${two(h, b, v, a)} 간 곳`],
        whyAny: `가로로 ${a}칸, 세로로 ${b}칸 — 수를 바꾸면 다른 곳에 가요.`,
        probe: { ask: 'swap', h, v, a, b, p, kid },
      });
    },
  },

  {
    id: 'mv.slide', grade: 4, name: '평면도형 밀기', needs: ['mv.point'],
    idea: '도형을 밀면 **모양과 크기는 그대로**, 놓인 자리만 바뀌어요. 오른쪽으로 5 cm 밀면 도형의 모든 칸이 오른쪽으로 5칸씩 가요. 얼마나 밀었는지는 도형의 같은 칸(맨 왼쪽 칸)이 움직인 칸 수로 세요 — 두 도형 사이의 빈칸만 세면 안 돼요.',
    rule: '밀기 — 모양은 그대로, 같은 칸이 움직인 칸 수가 민 길이.',
    slip: '처음 도형의 맨 왼쪽(맨 위) 칸이 어디로 갔는지 세어 봐요.',
    calc(r, c) {
      // 몇 cm 밀었나 — 숫자판 (빈칸만 셈 · 두 도형을 모두 지나는 칸)
      const howFar = (d) => {
        const W = horiz(d) ? 12 : 5; const H = horiz(d) ? 4 : 12;
        const v = shapeOf(r, horiz(d) ? 3 : 4, horiz(d) ? 3 : 3);
        const s = slideSpot(r, d, W, H, v, [1, 4], (w, n) => [n, 0]);
        const [x0, y0] = xyOf(d, s.a, s.b); const [x1, y1] = xyOf(d, s.a + sgn(d) * s.n, s.b);
        return {
          t: `모눈 한 칸의 길이는 1 cm예요. 처음 도형을 ${SLIDE_KO[d]}으로 몇 cm 밀었을까요?\n\n${MV(W, H, true, [['처음', x0, y0, v], ['나중', x1, y1, v]])}`,
          ans: String(s.n), wr: [{ text: String(s.n - s.w), tag: TAGS.gapOnly }, { text: String(s.n + s.w), tag: TAGS.spanAll }],
          steps: [`처음 도형의 ${EDGE_KO[d]}에서 나중 도형의 ${EDGE_KO[d]}까지 ${s.n}칸`, `한 칸이 1 cm → ${s.n} cm`],
          why: {
            [TAGS.gapOnly]: `두 도형 사이의 빈칸 ${s.n - s.w}칸만 셌어요 — 도형의 같은 칸이 움직인 칸 수는 ${s.n}칸이에요.`,
            [TAGS.spanAll]: `두 도형을 모두 지나는 칸을 셌어요 — 같은 칸끼리 세면 ${s.n}칸이에요.`,
          },
          probe: { ask: 'far', d, n: s.n, w: s.w, v },
        };
      };
      // 어느 쪽으로 몇 cm — 말 보기
      const whichWay = (d) => {
        const W = horiz(d) ? 12 : 5; const H = horiz(d) ? 4 : 12;
        const v = shapeOf(r, 3, 3);
        const s = slideSpot(r, d, W, H, v, [1, 4], (w, n) => [n, 0]);
        const [x0, y0] = xyOf(d, s.a, s.b); const [x1, y1] = xyOf(d, s.a + sgn(d) * s.n, s.b);
        const say = (dd, n) => `${SLIDE_KO[dd]}으로 ${n} cm`;
        return {
          t: `모눈 한 칸의 길이는 1 cm예요. 처음 도형을 밀었더니 나중 도형이 되었어요. 어느 쪽으로 몇 cm 밀었을까요?\n\n${MV(W, H, true, [['처음', x0, y0, v], ['나중', x1, y1, v]])}`,
          text: true, ans: say(d, s.n),
          wr: [{ text: say(OPP[d], s.n), tag: TAGS.wayBack }, { text: say(d, s.n - s.w), tag: TAGS.gapOnly }, { text: say(d, s.n + s.w), tag: TAGS.spanAll }],
          steps: [`나중 도형은 처음 도형의 ${SLIDE_KO[d]}에 있어요`, `같은 칸끼리 ${s.n}칸 → ${say(d, s.n)}`],
          why: {
            [TAGS.wayBack]: `처음 도형에서 나중 도형 쪽으로 밀었어요 — ${SLIDE_KO[d]}이에요.`,
            [TAGS.gapOnly]: `두 도형 사이의 빈칸만 셌어요 — 같은 칸이 움직인 칸 수는 ${s.n}칸이에요.`,
            [TAGS.spanAll]: `두 도형을 모두 지나는 칸을 셌어요 — 같은 칸끼리 세면 ${s.n}칸이에요.`,
          },
          probe: { ask: 'way', d, n: s.n, w: s.w, v },
        };
      };
      // 민 도형 고르기 — 후보마다 작은 모눈 (빈칸만큼 띄움 · 출발 칸도 셈 · 모양을 바꿈) · ✍️ 판은 자리까지(kind 'place')
      const pickSlid = (d) => {
        const W = horiz(d) ? 12 : 5; const H = horiz(d) ? 4 : 12;
        const v = shapeOf(r, 3, 3);
        const s = slideSpot(r, d, W, H, v, [1, 3], (w, n) => [n + w, 0]);
        const at = (k) => xyOf(d, s.a + sgn(d) * k, s.b);
        const [x0, y0] = xyOf(d, s.a, s.b);
        const list = [
          { v: tok(...at(s.n), v) },
          { v: tok(...at(s.n + s.w), v), tag: TAGS.gapOnly },
          { v: tok(...at(s.n - 1), v), tag: TAGS.startCount },
          { v: tok(...at(s.n), flipAlong(d, v)), tag: TAGS.slideFlip },
        ];
        const P = placeCands(r, list);
        const cand = P.pairs.map(([k, t]) => { const [xy, sv] = t.split('='); const [x, y] = xy.split(',').map(Number); return [k, x, y, sv]; });
        return {
          t: `모눈 한 칸의 길이는 1 cm예요. 처음 도형을 ${SLIDE_KO[d]}으로 ${s.n} cm 밀었을 때의 도형은 어느 것일까요?\n\n${MV(W, H, false, [['처음', x0, y0, v], ...cand])}`,
          text: true, ans: P.ans, wr: P.wr,
          steps: [`도형의 모든 칸을 ${SLIDE_KO[d]}으로 ${s.n}칸씩 — 모양은 그대로`, `${EDGE_KO[d]}이 ${s.n}칸 움직인 도형 → ${P.ans}`],
          why: {
            [TAGS.gapOnly]: `두 도형 사이에 빈칸을 ${s.n}칸 두었어요 — 같은 칸이 ${s.n}칸 움직여야 해요.`,
            [TAGS.startCount]: `${s.n - 1}칸만 밀었어요 — 처음 칸은 세지 않고 다음 칸부터 1, 2, …, ${s.n}.`,
            [TAGS.slideFlip]: '모양이 바뀌었어요 — 밀면 모양은 그대로예요.',
          },
          draw: { fig: MV(W, H, true, [['처음', x0, y0, v]]).slice(1, -1), mode: 'mcells', kind: 'place', target: list[0].v, cands: P.pairs.map(([k, t]) => ({ k, v: t })) },
          probe: { ask: 'pick', d, n: s.n, w: s.w, v, x0, y0 },
        };
      };
      return askFam(r, c, this, [
        famOf(['R', 'L', 'U', 'D'].map((d) => howFar(d))),
        famOf([whichWay(pick(r, ['R', 'L', 'U', 'D']))]), // 문제 글이 방향마다 같다 — 방향은 가족 안에서
        famOf(['R', 'L', 'U', 'D'].map((d) => pickSlid(d))),
      ]);
    },
    misread(r, c) {
      const d = pick(r, ['R', 'L']);
      const W = 12; const H = 4;
      const v = shapeOf(r, 3, 3);
      const s = slideSpot(r, d, W, H, v, [1, 4], (w, n) => [n, 0]);
      const [x0, y0] = xyOf(d, s.a, s.b); const [x1, y1] = xyOf(d, s.a + sgn(d) * s.n, s.b);
      if (branchOf(r, c, ['gap', 'shape']) === 'gap') {
        return misAsk(r, c, this, 'gap', {
          q: SAID(`모눈 한 칸의 길이는 1 cm예요.\n\n${MV(W, H, true, [['처음', x0, y0, v], ['나중', x1, y1, v]])}`, `두 도형 사이에 빈칸이 ${s.n - s.w}칸이니까 ${SLIDE_KO[d]}으로 ${s.n - s.w} cm 밀었어요.`),
          ok: `같은 칸이 움직인 칸 수를 세야 해요 — ${EDGE_KO[d]}끼리 ${s.n}칸, ${SLIDE_KO[d]}으로 ${s.n} cm`,
          wr: [RIGHT_SAID, { text: `두 도형을 모두 지나는 칸을 세서 ${s.n + s.w} cm예요`, tag: TAGS.spanAll }, { text: '도형은 cm로 밀 수 없어요', tag: OFF }],
          steps: [`처음 도형의 ${EDGE_KO[d]}에서 나중 도형의 ${EDGE_KO[d]}까지 ${s.n}칸`, `빈칸 ${s.n - s.w}칸에 도형의 칸 ${s.w}칸을 더해도 ${s.n}칸`],
          whyAny: '민 길이는 도형의 같은 칸이 움직인 칸 수예요. 두 도형 사이의 빈칸은 그보다 적어요.',
          probe: { ask: 'gap', d, n: s.n, w: s.w, v },
        });
      }
      return misAsk(r, c, this, 'shape', {
        q: DREW(`처음 도형을 ${SLIDE_KO[d]}으로 ${s.n} cm 밀어서 나중 도형을 그렸어요. 모눈 한 칸의 길이는 1 cm예요.`, MV(W, H, true, [['처음', x0, y0, v], ['나중', x1, y1, flipLR(v)]])),
        ok: '모양이 바뀌었어요 — 밀면 모양은 그대로이고 자리만 바뀌어요',
        wr: [RIGHT_DREW, { text: `두 도형 사이의 빈칸이 ${s.n} cm가 되게 그려야 해요`, tag: TAGS.gapOnly }, { text: '도형은 오른쪽이나 왼쪽으로 밀 수 없어요', tag: OFF }],
        steps: [`밀면 모양과 크기는 그대로 — 자리만 ${SLIDE_KO[d]}으로 ${s.n}칸`, '나중 도형은 칠한 칸의 모양이 처음 도형과 달라요'],
        whyAny: '밀기는 도형을 그대로 미끄러뜨리는 거예요. 모양이 달라지면 민 것이 아니에요.',
        probe: { ask: 'shape', d, n: s.n, w: s.w, v },
      });
    },
  },

  {
    id: 'mv.flip', grade: 4, name: '평면도형 뒤집기', needs: ['mv.slide'],
    idea: '도형을 **오른쪽(왼쪽)으로 뒤집으면 왼쪽과 오른쪽이 서로 바뀌고**, 위쪽(아래쪽)으로 뒤집으면 위쪽과 아래쪽이 서로 바뀌어요. 종이에 그린 도형을 그쪽으로 넘긴다고 생각해 봐요 — 오른쪽으로 넘기면 오른쪽 끝에 있던 부분이 왼쪽 끝에 와요.',
    rule: '오른쪽·왼쪽으로 뒤집으면 왼쪽과 오른쪽이, 위쪽·아래쪽으로 뒤집으면 위쪽과 아래쪽이 바뀐다.',
    slip: '뒤집는 쪽이 왼쪽·오른쪽인지 위쪽·아래쪽인지 먼저 봐요.',
    calc(r, c) {
      const pickFlip = (dir) => {
        const v = shapeOf(r);
        return shapeAsk(r, {
          head: `처음 도형을 ${FLIP_KO[dir]}으로 뒤집었을 때의 도형은 어느 것일까요?`,
          given: SH([['처음', v]]),
          list: [{ v: flipBy(dir, v) }, { v: flipOther(dir, v), tag: TAGS.axisMix }, { v, tag: TAGS.keep }, { v: rot(v, 2), tag: TAGS.flipAsTurn }],
          steps: [`${FLIP_KO[dir]}으로 뒤집으면 ${SWAP_KO[dir]}이 서로 바뀌어요`],
          why: {
            [TAGS.axisMix]: `${OTHER_KO[dir]}이 바뀌었어요 — ${FLIP_KO[dir]}으로 뒤집으면 ${SWAP_KO[dir]}이 바뀌어요.`,
            [TAGS.keep]: `처음 도형과 같은 모양이에요 — 뒤집으면 ${SWAP_KO[dir]}이 바뀌어요.`,
            [TAGS.flipAsTurn]: `위쪽과 아래쪽, 왼쪽과 오른쪽이 모두 바뀌었어요 — ${FLIP_KO[dir]}으로 뒤집으면 ${SWAP_KO[dir]}만 바뀌어요.`,
          },
          probe: { ask: 'flip', dir, v },
        });
      };
      // 무엇이 바뀌나 — 말 보기
      const whatSwaps = (dir) => {
        const v = shapeOf(r);
        return {
          t: `처음 도형을 ${FLIP_KO[dir]}으로 뒤집으면 어떻게 될까요?\n\n${SH([['처음', v]])}`,
          text: true, ans: `${SWAP_KO[dir]}이 서로 바뀌어요`,
          wr: [{ text: `${OTHER_KO[dir]}이 서로 바뀌어요`, tag: TAGS.axisMix }, { text: '모양이 바뀌지 않아요', tag: TAGS.keep }, { text: '위쪽과 아래쪽, 왼쪽과 오른쪽이 모두 바뀌어요', tag: TAGS.flipAsTurn }],
          steps: [`${FLIP_KO[dir]}으로 넘기면 ${dir === 'right' || dir === 'left' ? '오른쪽 끝에 있던 부분이 왼쪽 끝에' : '위쪽 끝에 있던 부분이 아래쪽 끝에'} 와요`, `→ ${SWAP_KO[dir]}이 서로 바뀌어요`],
          why: {
            [TAGS.axisMix]: `${FLIP_KO[dir]}으로 뒤집으면 ${SWAP_KO[dir]}이 바뀌어요.`,
            [TAGS.keep]: `뒤집으면 ${SWAP_KO[dir]}이 바뀌어서 모양이 달라 보여요.`,
            [TAGS.flipAsTurn]: `${OTHER_KO[dir]}은 그대로예요 — ${SWAP_KO[dir]}만 바뀌어요.`,
          },
          probe: { ask: 'swaps', dir, v },
        };
      };
      return askFam(r, c, this, [
        famOf(['right', 'left', 'up', 'down'].map((dir) => pickFlip(dir))),
        famOf(['right', 'left', 'up', 'down'].map((dir) => pickFlip(dir))),
        famOf(['right', 'left', 'up', 'down'].map((dir) => whatSwaps(dir))),
      ]);
    },
    misread(r, c) {
      const v = shapeOf(r);
      if (branchOf(r, c, ['axis', 'both']) === 'axis') {
        const dir = pick(r, ['right', 'left', 'up', 'down']);
        return misAsk(r, c, this, 'axis', {
          q: DREW(`처음 도형을 ${FLIP_KO[dir]}으로 뒤집어서 가처럼 그렸어요.`, SH([['처음', v], ['가', flipOther(dir, v)]])),
          ok: `가는 ${OTHER_KO[dir]}이 바뀌었어요 — ${FLIP_KO[dir]}으로 뒤집으면 ${SWAP_KO[dir]}이 바뀌어요`,
          wr: [RIGHT_DREW, { text: '모양을 그대로 두어야 해요', tag: TAGS.keep }, { text: `도형은 ${FLIP_KO[dir]}으로 뒤집을 수 없어요`, tag: OFF }],
          steps: [`${FLIP_KO[dir]}으로 뒤집기 — ${SWAP_KO[dir]}이 바뀌어요`, `가는 ${OTHER_KO[dir]}이 바뀐 모양`],
          whyAny: `뒤집는 쪽을 봐요. ${FLIP_KO[dir]}으로 넘기면 ${SWAP_KO[dir]}이 바뀌어요.`,
          probe: { ask: 'axis', dir, v },
        });
      }
      const dir = pick(r, ['right', 'left', 'up', 'down']);
      return misAsk(r, c, this, 'both', {
        q: DREW(`처음 도형을 ${FLIP_KO[dir]}으로 뒤집어서 가처럼 그렸어요.`, SH([['처음', v], ['가', rot(v, 2)]])),
        ok: `가는 위쪽과 아래쪽, 왼쪽과 오른쪽이 모두 바뀌었어요 — ${FLIP_KO[dir]}으로 뒤집으면 ${SWAP_KO[dir]}만 바뀌어요`,
        wr: [RIGHT_DREW, { text: `${OTHER_KO[dir]}이 바뀌어야 해요`, tag: TAGS.axisMix }, { text: `도형은 ${FLIP_KO[dir]}으로 뒤집을 수 없어요`, tag: OFF }],
        steps: [`${FLIP_KO[dir]}으로 뒤집기 — ${SWAP_KO[dir]}만 바뀌어요`, '가는 두 쪽이 모두 바뀐 모양'],
        whyAny: `한 번 뒤집으면 한 쌍만 바뀌어요 — ${SWAP_KO[dir]}.`,
        probe: { ask: 'both', dir, v },
      });
    },
  },

  {
    id: 'mv.flip2', grade: 4, name: '뒤집기의 성질', needs: ['mv.flip'],
    idea: '위쪽으로 뒤집은 도형과 아래쪽으로 뒤집은 도형은 **같아요** — 둘 다 위쪽과 아래쪽이 바뀌니까요. 왼쪽과 오른쪽도 마찬가지예요. 같은 쪽으로 **두 번 뒤집으면 처음 도형**으로 돌아와요.',
    rule: '위쪽 = 아래쪽, 왼쪽 = 오른쪽 · 두 번 뒤집으면 처음 모양.',
    slip: '뒤집으면 어느 두 쪽이 바뀌는지만 봐요 — 위쪽이든 아래쪽이든 위아래가 바뀌어요.',
    calc(r, c) {
      const PAIR = { up: 'down', down: 'up', right: 'left', left: 'right' };
      // 위쪽으로 뒤집은 것이 가 → 아래쪽으로 뒤집은 것은?
      const sameOther = (dir) => {
        const v = shapeOf(r);
        return shapeAsk(r, {
          head: `처음 도형을 ${FLIP_KO[dir]}으로 뒤집었더니 가가 되었어요. 처음 도형을 ${FLIP_KO[PAIR[dir]]}으로 뒤집었을 때의 도형은 어느 것일까요?`,
          given: SH([['처음', v], ['가', flipBy(dir, v)]]),
          list: [{ v: flipBy(dir, v) }, { v, tag: TAGS.upDownDiff }, { v: flipOther(dir, v), tag: TAGS.axisMix }, { v: rot(v, 2), tag: TAGS.flipAsTurn }],
          steps: [`${FLIP_KO[dir]}으로 뒤집든 ${FLIP_KO[PAIR[dir]]}으로 뒤집든 ${SWAP_KO[dir]}이 바뀌어요`, '→ 가와 같은 모양'],
          why: {
            [TAGS.upDownDiff]: `처음 도형 그대로예요 — ${FLIP_KO[PAIR[dir]]}으로 뒤집어도 ${SWAP_KO[dir]}이 바뀌어 가와 같아요.`,
            [TAGS.axisMix]: `${OTHER_KO[dir]}이 바뀌었어요 — ${FLIP_KO[PAIR[dir]]}으로 뒤집으면 ${SWAP_KO[dir]}이 바뀌어요.`,
            [TAGS.flipAsTurn]: `두 쪽이 모두 바뀌었어요 — 한 번 뒤집으면 ${SWAP_KO[dir]}만 바뀌어요.`,
          },
          probe: { ask: 'pair', dir, v },
        });
      };
      // 두 번 뒤집기 — 한 번 뒤집은 가를 보여 주고 같은 쪽으로 한 번 더. 오답은 그 한 번에 생각 하나씩
      //   (Codex 44차 #2: "두 번"을 통째로 물으면 다른 축·두 쪽 모두는 그 생각을 두 번 다 하면 처음 모양 = 정답이라
      //    "한 번만 뒤집음"이 하나 더 붙어야 나오는 모양이었다)
      const twice = (dir) => {
        const v = shapeOf(r); const w = flipBy(dir, v);
        return shapeAsk(r, {
          head: `처음 도형을 ${FLIP_KO[dir]}으로 뒤집었더니 가가 되었어요. 가를 ${FLIP_KO[dir]}으로 한 번 더 뒤집었을 때의 도형은 어느 것일까요?`,
          given: SH([['처음', v], ['가', w]]),
          list: [{ v }, { v: w, tag: TAGS.twiceFlip }, { v: flipOther(dir, w), tag: TAGS.axisMix }, { v: rot(w, 2), tag: TAGS.flipAsTurn }],
          steps: [`가를 ${FLIP_KO[dir]}으로 뒤집으면 ${SWAP_KO[dir]}이 다시 바뀌어요`, '→ 처음 도형과 같은 모양 — 같은 쪽으로 두 번 뒤집으면 처음 도형'],
          why: {
            [TAGS.twiceFlip]: '가 그대로예요 — 가를 한 번 더 뒤집으면 바뀐 두 쪽이 제자리로 돌아와 처음 도형이 돼요.',
            [TAGS.axisMix]: `가의 ${OTHER_KO[dir]}이 바뀌었어요 — ${FLIP_KO[dir]}으로 뒤집으면 ${SWAP_KO[dir]}이 바뀌어요.`,
            [TAGS.flipAsTurn]: `가의 두 쪽이 모두 바뀌었어요 — 한 번 뒤집으면 ${SWAP_KO[dir]}만 바뀌어요.`,
          },
          probe: { ask: 'twice', dir, v },
        });
      };
      // 어느 쪽으로 뒤집었나 — 말 보기
      const whichSide = (lr) => {
        const v = shapeOf(r);
        const w = lr ? flipLR(v) : flipUD(v);
        return {
          t: `처음 도형을 뒤집었더니 가가 되었어요. 어느 쪽으로 뒤집었을까요?\n\n${SH([['처음', v], ['가', w]])}`,
          text: true, ans: lr ? '왼쪽이나 오른쪽으로 뒤집었어요' : '위쪽이나 아래쪽으로 뒤집었어요',
          wr: [{ text: lr ? '위쪽이나 아래쪽으로 뒤집었어요' : '왼쪽이나 오른쪽으로 뒤집었어요', tag: TAGS.axisMix }, { text: '뒤집지 않고 밀기만 했어요', tag: TAGS.keep }],
          steps: [`가는 처음 도형의 ${lr ? '왼쪽과 오른쪽' : '위쪽과 아래쪽'}이 바뀐 모양이에요`, `→ ${lr ? '왼쪽이나 오른쪽' : '위쪽이나 아래쪽'}으로 뒤집었어요 (어느 쪽으로 뒤집어도 같은 모양)`],
          why: {
            [TAGS.axisMix]: `가는 ${lr ? '왼쪽과 오른쪽' : '위쪽과 아래쪽'}이 바뀌었어요.`,
            [TAGS.keep]: '모양이 바뀌었어요 — 밀기만 하면 모양이 그대로예요.',
          },
          probe: { ask: 'side', lr, v },
        };
      };
      return askFam(r, c, this, [
        famOf(['up', 'down', 'right', 'left'].map((dir) => sameOther(dir))),
        famOf(['up', 'down', 'right', 'left'].map((dir) => twice(dir))),
        famOf([whichSide(r() < 0.5)]), // 문제 글이 같다 — 어느 축인지는 가족 안에서
      ]);
    },
    misread(r, c) {
      if (branchOf(r, c, ['pair', 'twice']) === 'pair') {
        const ud = r() < 0.5;
        return misAsk(r, c, this, 'pair', {
          q: SAID('', ud ? '위쪽으로 뒤집은 모양과 아래쪽으로 뒤집은 모양은 서로 달라요.' : '왼쪽으로 뒤집은 모양과 오른쪽으로 뒤집은 모양은 서로 달라요.'),
          ok: `두 모양은 같아요 — 어느 쪽으로 뒤집든 ${ud ? '위쪽과 아래쪽' : '왼쪽과 오른쪽'}이 서로 바뀌어요`,
          wr: [RIGHT_SAID, { text: `두 모양은 ${ud ? '왼쪽과 오른쪽' : '위쪽과 아래쪽'}이 서로 반대예요`, tag: TAGS.axisMix }, { text: `도형은 ${ud ? '위쪽으로' : '왼쪽으로'} 뒤집을 수 없어요`, tag: OFF }],
          steps: [`${ud ? '위쪽' : '왼쪽'}으로 뒤집어도 ${ud ? '아래쪽' : '오른쪽'}으로 뒤집어도 ${ud ? '위쪽과 아래쪽' : '왼쪽과 오른쪽'}이 바뀌어요`, '→ 같은 모양'],
          whyAny: '뒤집으면 어느 두 쪽이 바뀌는지만 봐요. 반대쪽으로 뒤집어도 바뀌는 두 쪽은 같아요.',
          probe: { ask: 'pairSaid', ud },
        });
      }
      const dir = pick(r, ['right', 'left', 'up', 'down']);
      return misAsk(r, c, this, 'twice', {
        q: SAID('', `${FLIP_KO[dir]}으로 두 번 뒤집으면 ${FLIP_KO[dir]}으로 한 번 뒤집은 모양과 같아요.`),
        ok: '두 번 뒤집으면 처음 모양으로 돌아와요',
        wr: [RIGHT_SAID, { text: `두 번 뒤집으면 ${OTHER_KO[dir]}이 바뀌어요`, tag: TAGS.axisMix }, { text: '도형은 두 번 뒤집을 수 없어요', tag: OFF }],
        steps: [`한 번 뒤집으면 ${SWAP_KO[dir]}이 바뀌어요`, '한 번 더 뒤집으면 다시 바뀌어 처음 모양'],
        whyAny: '뒤집은 것을 같은 쪽으로 한 번 더 뒤집으면 바뀐 두 쪽이 제자리로 돌아와요.',
        probe: { ask: 'twiceSaid', dir },
      });
    },
  },

  {
    id: 'mv.turn', grade: 4, name: '평면도형 돌리기', needs: ['mv.flip2'],
    idea: '**시계 방향**은 시곗바늘이 도는 쪽, **시계 반대 방향**은 그 반대쪽이에요. 시계 방향으로 90°만큼 돌리면 도형의 위쪽 부분이 오른쪽으로 가요. 180°만큼 돌리면 위쪽 부분이 아래쪽으로 가고, 왼쪽과 오른쪽도 바뀌어요 — 위쪽과 아래쪽만 바뀌는 뒤집기와 달라요.',
    rule: '도형의 위쪽 부분이 어디로 가는지 따라가요 — 시계 방향으로 90°만큼이면 오른쪽.',
    slip: '시곗바늘이 도는 쪽인지 먼저 보고, 위쪽 부분이 어디로 가는지 따라가요.',
    calc(r, c) {
      const pickTurn = (cw, deg) => {
        const v = shapeOf(r);
        const k = quarter(cw, deg);
        const list = deg === 180
          ? [{ v: rot(v, 2) }, { v: flipUD(v), tag: TAGS.turnAsFlip }, { v: rot(v, cw ? 1 : -1), tag: TAGS.turnHalf }, { v, tag: TAGS.keep }]
          : [{ v: rot(v, k) }, { v: rot(v, -k), tag: TAGS.turnBack }, { v: rot(v, 2), tag: TAGS.turnHalf }, { v: flipLR(v), tag: TAGS.turnAsFlip }];
        return shapeAsk(r, {
          head: `처음 도형을 ${TURN_KO(cw, deg)} 돌렸을 때의 도형은 어느 것일까요?`,
          given: SH([['처음', v]]),
          list,
          steps: [`${TURN_KO(cw, deg)} 돌리면 위쪽 부분이 ${topGoes(k)}으로 가요`],
          why: deg === 180 ? {
            [TAGS.turnAsFlip]: '위쪽과 아래쪽만 바뀌었어요 — 그것은 뒤집은 모양이에요. 180°만큼 돌리면 왼쪽과 오른쪽도 바뀌어요.',
            [TAGS.turnHalf]: `90°만큼만 돌렸어요 — 180°만큼이면 위쪽 부분이 아래쪽으로 가요.`,
            [TAGS.keep]: '처음 도형과 같은 모양이에요 — 180°만큼 돌리면 위쪽 부분이 아래쪽으로 가요.',
          } : {
            [TAGS.turnBack]: `${TURN_KO(!cw, deg)} 돌린 모양이에요 — 위쪽 부분이 ${topGoes(-k)}으로 갔어요.`,
            [TAGS.turnHalf]: `180°만큼 돌린 모양이에요 — 위쪽 부분이 아래쪽으로 갔어요.`,
            [TAGS.turnAsFlip]: '왼쪽과 오른쪽만 바뀌었어요 — 그것은 뒤집은 모양이에요.',
          },
          probe: { ask: 'turn', cw, deg, v },
        });
      };
      // 위쪽 부분은 어디로 — 말 보기
      const topTo = (cw, deg) => {
        const v = shapeOf(r);
        const k = quarter(cw, deg);
        const wrong = deg === 180
          ? [{ text: `${topGoes(cw ? 1 : -1)}으로 가요`, tag: TAGS.turnHalf }, { text: '위쪽에 그대로 있어요', tag: TAGS.keep }]
          : [{ text: `${topGoes(-k)}으로 가요`, tag: TAGS.turnBack }, { text: '아래쪽으로 가요', tag: TAGS.turnHalf }, { text: '위쪽에 그대로 있어요', tag: TAGS.keep }];
        return {
          t: `처음 도형을 ${TURN_KO(cw, deg)} 돌리면 처음 도형의 위쪽 부분은 어느 쪽으로 갈까요?\n\n${SH([['처음', v]])}`,
          text: true, ans: `${topGoes(k)}으로 가요`, wr: wrong,
          steps: [cw ? '시계 방향 — 시곗바늘처럼 위쪽 → 오른쪽 → 아래쪽 → 왼쪽' : '시계 반대 방향 — 위쪽 → 왼쪽 → 아래쪽 → 오른쪽', `${deg}°만큼 → ${topGoes(k)}으로 가요`],
          why: {
            [TAGS.turnBack]: `돌리는 방향을 반대로 봤어요 — ${cw ? '시계 방향은 위쪽 다음이 오른쪽' : '시계 반대 방향은 위쪽 다음이 왼쪽'}이에요.`,
            [TAGS.turnHalf]: deg === 180 ? '90°만큼만 돌렸어요 — 180°만큼이면 아래쪽까지 가요.' : '180°만큼 돌린 곳이에요 — 90°만큼씩 한 쪽씩 가요.',
            [TAGS.keep]: '돌리면 위쪽 부분도 함께 돌아가요.',
          },
          probe: { ask: 'top', cw, deg },
        };
      };
      const TURNS = [[true, 90], [false, 90], [true, 180], [false, 180], [true, 270], [false, 270]];
      return askFam(r, c, this, [
        famOf(TURNS.map(([cw, deg]) => pickTurn(cw, deg))),
        famOf(TURNS.map(([cw, deg]) => pickTurn(cw, deg))),
        famOf(TURNS.map(([cw, deg]) => topTo(cw, deg))),
      ]);
    },
    misread(r, c) {
      const v = shapeOf(r);
      if (branchOf(r, c, ['back', 'flip']) === 'back') {
        const cw = r() < 0.5;
        return misAsk(r, c, this, 'back', {
          q: DREW(`처음 도형을 ${TURN_KO(cw, 90)} 돌려서 가처럼 그렸어요.`, SH([['처음', v], ['가', rot(v, cw ? -1 : 1)]])),
          ok: `가는 ${TURN_KO(!cw, 90)} 돌린 모양이에요 — ${cw ? '시계 방향은 시곗바늘이 도는 쪽이에요' : '시계 반대 방향은 시곗바늘과 반대쪽이에요'}`,
          wr: [RIGHT_DREW, { text: '180°만큼 돌려야 해요', tag: TAGS.turnHalf }, { text: '도형은 90°만큼 돌릴 수 없어요', tag: OFF }],
          steps: [`${TURN_KO(cw, 90)} 돌리면 위쪽 부분이 ${cw ? '오른쪽' : '왼쪽'}으로 가요`, `가는 위쪽 부분이 ${cw ? '왼쪽' : '오른쪽'}으로 간 모양`],
          whyAny: '시계 방향은 시곗바늘이 도는 쪽이에요. 위쪽 부분이 어디로 가는지 따라가 봐요.',
          probe: { ask: 'back', cw, v },
        });
      }
      const cw = r() < 0.5;
      return misAsk(r, c, this, 'flip', {
        q: DREW(`처음 도형을 ${TURN_KO(cw, 180)} 돌려서 가처럼 그렸어요.`, SH([['처음', v], ['가', flipUD(v)]])),
        ok: '가는 위쪽과 아래쪽만 바뀌었어요 — 180°만큼 돌리면 위쪽과 아래쪽, 왼쪽과 오른쪽이 모두 바뀌어요',
        wr: [RIGHT_DREW, { text: `${TURN_KO(!cw, 180)} 돌려야 해요`, tag: TAGS.turnBack }, { text: '도형은 180°만큼 돌릴 수 없어요', tag: OFF }],
        steps: ['180°만큼 돌리면 위쪽 부분이 아래쪽으로, 왼쪽 부분이 오른쪽으로 가요', '가는 위쪽과 아래쪽만 바뀐 모양 — 아래쪽으로 뒤집은 모양'],
        whyAny: '180°만큼 돌리기와 아래쪽으로 뒤집기는 달라요 — 돌리면 왼쪽과 오른쪽도 바뀌어요.',
        probe: { ask: 'flip', cw, v },
      });
    },
  },

  {
    id: 'mv.turn2', grade: 4, name: '돌리기의 성질', needs: ['mv.turn'],
    idea: '시계 방향으로 90°만큼 돌린 도형은 시계 반대 방향으로 270°만큼 돌린 도형과 **같아요**. 180°만큼은 어느 방향으로 돌려도 같고, 360°만큼 돌리면 한 바퀴라서 **처음 도형** 그대로예요.',
    rule: '시계 방향 90° = 시계 반대 방향 270° · 180°는 어느 방향이나 같다 · 360°는 처음 모양.',
    slip: '돌리는 방향과 각도를 함께 보고, 위쪽 부분이 멈추는 곳을 견줘요.',
    calc(r, c) {
      // 같은 도형이 되는 돌리기 — 말 보기
      const same = (cw, deg) => {
        const v = shapeOf(r);
        const flipKo = deg === 180 ? '아래쪽으로 뒤집은 도형' : '오른쪽으로 뒤집은 도형';
        const wr = deg === 180
          ? [{ text: `${TURN_KO(cw, 90)} 돌린 도형`, tag: TAGS.turnHalf }, { text: flipKo, tag: TAGS.turnAsFlip }, { text: '처음 도형', tag: TAGS.keep }]
          : [{ text: `${TURN_KO(!cw, deg)} 돌린 도형`, tag: TAGS.dirIgnore }, { text: `${TURN_KO(cw, 180)} 돌린 도형`, tag: TAGS.turnHalf }, { text: flipKo, tag: TAGS.turnAsFlip }];
        return {
          t: `처음 도형을 ${TURN_KO(cw, deg)} 돌린 도형과 같은 도형은 어느 것일까요?\n\n${SH([['처음', v]])}`,
          text: true, ans: `${TURN_KO(!cw, 360 - deg)} 돌린 도형`, wr,
          steps: [`${TURN_KO(cw, deg)} 돌리면 위쪽 부분이 ${topGoes(quarter(cw, deg))}으로 가요`, `${TURN_KO(!cw, 360 - deg)} 돌려도 위쪽 부분이 ${topGoes(quarter(!cw, 360 - deg))}으로 → 같은 도형`],
          why: {
            [TAGS.dirIgnore]: `방향이 반대면 위쪽 부분이 ${topGoes(quarter(!cw, deg))}으로 가요 — 같은 각도라도 방향이 다르면 다른 도형이에요.`,
            [TAGS.turnHalf]: '180°만큼 돌리면 위쪽 부분이 아래쪽으로 가요.',
            [TAGS.turnAsFlip]: '돌린 도형과 뒤집은 도형은 달라요.',
            [TAGS.keep]: '180°만큼 돌리면 위쪽 부분이 아래쪽으로 가서 처음 도형과 달라요.',
          },
          probe: { ask: 'same', cw, deg, v },
        };
      };
      // 몇 도만큼 돌렸나 — 90°·180°·270°·360° 중에서
      const howMuch = (cw, k) => {
        const v = shapeOf(r);
        const deg = 90 * k; const w = rot(v, cw ? k : -k);
        const other = (4 - k) * 90; // 반대 방향으로 돌린 각도
        const all = [90, 180, 270, 360];
        const tagOf = (dd) => (dd === 360 ? TAGS.full360 : dd === other ? TAGS.turnBack : TAGS.turnHalf);
        return {
          t: `처음 도형을 ${cw ? '시계 방향' : '시계 반대 방향'}으로 몇 도만큼 돌리면 가가 될까요? 어느 것일까요?\n\n${SH([['처음', v], ['가', w]])}`,
          text: true, ans: `${deg}°`, wr: all.filter((dd) => dd !== deg).map((dd) => ({ text: `${dd}°`, tag: tagOf(dd) })),
          steps: [`가는 처음 도형의 위쪽 부분이 ${topGoes(cw ? k : -k)}으로 간 모양`, `${cw ? '시계 방향' : '시계 반대 방향'}으로 ${deg}°만큼`],
          why: {
            [TAGS.turnBack]: `${other}°는 반대 방향으로 돌린 각도예요 — ${cw ? '시계 방향' : '시계 반대 방향'}으로는 ${deg}°만큼이에요.`,
            [TAGS.turnHalf]: `위쪽 부분이 ${topGoes(cw ? k : -k)}으로 갔어요 — 90°만큼씩 한 쪽씩 세어 봐요.`,
            [TAGS.full360]: '360°만큼 돌리면 처음 도형 그대로예요.',
          },
          probe: { ask: 'much', cw, k, v },
        };
      };
      // 360°만큼
      const full = (cw) => {
        const v = shapeOf(r);
        return shapeAsk(r, {
          head: `처음 도형을 ${TURN_KO(cw, 360)} 돌렸을 때의 도형은 어느 것일까요?`,
          given: SH([['처음', v]]),
          list: [{ v }, { v: rot(v, 2), tag: TAGS.full360 }, { v: flipLR(v), tag: TAGS.turnAsFlip }],
          steps: ['360°만큼은 한 바퀴 — 처음 도형 그대로'],
          why: { [TAGS.full360]: '180°만큼 돌린 모양이에요 — 360°만큼이면 한 바퀴 돌아 처음 모양이에요.', [TAGS.turnAsFlip]: '뒤집은 모양이에요 — 한 바퀴 돌리면 처음 모양 그대로예요.' },
          probe: { ask: 'full', cw, v },
        });
      };
      return askFam(r, c, this, [
        famOf([[true, 90], [false, 90], [true, 180], [false, 180], [true, 270], [false, 270]].map(([cw, deg]) => same(cw, deg))),
        famOf([[true, 1], [true, 3], [false, 1], [false, 3]].map(([cw, k]) => howMuch(cw, k))),
        famOf([true, false].map((cw) => full(cw))),
      ]);
    },
    misread(r, c) {
      if (branchOf(r, c, ['same', 'full']) === 'same') {
        const cw = r() < 0.5;
        return misAsk(r, c, this, 'same', {
          q: SAID('', `${TURN_KO(cw, 90)} 돌린 모양과 ${TURN_KO(!cw, 270)} 돌린 모양은 서로 달라요.`),
          ok: `두 모양은 같아요 — ${TURN_KO(!cw, 270)} 돌려도 위쪽 부분이 ${cw ? '오른쪽' : '왼쪽'}에서 멈춰요`,
          wr: [RIGHT_SAID, { text: '두 모양은 위쪽과 아래쪽이 서로 반대예요', tag: TAGS.turnHalf }, { text: '도형은 270°만큼 돌릴 수 없어요', tag: OFF }],
          steps: [`${TURN_KO(cw, 90)} — 위쪽 부분이 ${cw ? '오른쪽' : '왼쪽'}으로`, `${TURN_KO(!cw, 270)} — ${cw ? '왼쪽 → 아래쪽 → 오른쪽' : '오른쪽 → 아래쪽 → 왼쪽'}에서 멈춰요`],
          whyAny: '돌린 방향과 각도가 달라도 위쪽 부분이 멈춘 곳이 같으면 같은 모양이에요.',
          probe: { ask: 'sameSaid', cw },
        });
      }
      const cw = r() < 0.5;
      return misAsk(r, c, this, 'full', {
        q: SAID('', `${TURN_KO(cw, 360)} 돌리면 위쪽과 아래쪽이 바뀌어요.`),
        ok: '360°만큼 돌리면 한 바퀴 — 처음 모양 그대로예요',
        wr: [RIGHT_SAID, { text: '360°만큼 돌리면 왼쪽과 오른쪽이 바뀌어요', tag: TAGS.full360 }, { text: '도형은 360°만큼 돌릴 수 없어요', tag: OFF }],
        steps: ['90°만큼씩 네 번 — 위쪽 부분이 한 바퀴 돌아 위쪽으로', '→ 처음 모양'],
        whyAny: '360°는 한 바퀴예요. 한 바퀴 돌면 처음 자리로 돌아와요.',
        probe: { ask: 'fullSaid', cw },
      });
    },
  },

  {
    id: 'mv.pattern', grade: 4, name: '무늬의 규칙', needs: ['mv.turn2'],
    idea: '무늬는 한 모양을 규칙대로 밀고, 뒤집고, 돌려서 만들어요. 1에서 2로, 2에서 3으로 갈 때 모양이 어떻게 바뀌었는지 찾고, 같은 규칙을 한 번 더 해서 다음 모양을 정해요.',
    rule: '앞에서 뒤로 갈 때마다 같은 움직임 — 그 움직임을 한 번 더.',
    slip: '1 → 2와 2 → 3이 같은 움직임인지 먼저 확인해요.',
    calc(r, c) {
      // 규칙: 시계 방향 90° · 시계 반대 방향 90° · 오른쪽으로 뒤집기 되풀이 · 아래쪽으로 뒤집기 되풀이 · 180°
      const RULES = {
        cw: { f: (v) => rot(v, 1), ko: '시계 방향으로 90°만큼씩 돌렸어요' },
        ccw: { f: (v) => rot(v, -1), ko: '시계 반대 방향으로 90°만큼씩 돌렸어요' },
        lr: { f: flipLR, ko: '오른쪽으로 뒤집기를 되풀이했어요' },
        ud: { f: flipUD, ko: '아래쪽으로 뒤집기를 되풀이했어요' },
        half: { f: (v) => rot(v, 2), ko: '시계 방향으로 180°만큼씩 돌렸어요' },
      };
      const seq = (rule, v) => { const out = [v]; for (let n = 1; n < 4; n++) out.push(RULES[rule].f(out[n - 1])); return out; };
      const nextOne = (rule) => {
        const v = shapeOf(r); const s = seq(rule, v);
        const list = rule === 'lr' || rule === 'ud'
          ? [{ v: s[3] }, { v: s[2], tag: TAGS.ruleSkip }, { v: rule === 'lr' ? flipUD(s[2]) : flipLR(s[2]), tag: TAGS.axisMix }, { v: rot(s[2], 2), tag: TAGS.flipAsTurn }]
          : rule === 'half'
            ? [{ v: s[3] }, { v: s[2], tag: TAGS.ruleSkip }, { v: flipUD(s[2]), tag: TAGS.turnAsFlip }, { v: rot(s[2], 1), tag: TAGS.turnHalf }] // 후보는 늘 넷 — 수가 다르면 🔁 쌍둥이 열쇠가 갈린다
            // 3을 반대로 돌린 모양은 2와 같고 180° 돌린 모양은 1과 같다(앞 모양을 되풀이한다는 다른 생각과 겹침) — 넷째 후보는 다른 쪽으로 뒤집은 모양
            : [{ v: s[3] }, { v: s[2], tag: TAGS.ruleSkip }, { v: flipLR(s[2]), tag: TAGS.turnAsFlip }, { v: flipUD(s[2]), tag: TAGS.turnAsFlip }];
        return shapeAsk(r, {
          head: '규칙에 따라 모양을 늘어놓았어요. 4에 알맞은 모양은 어느 것일까요?',
          given: SH([['1', s[0]], ['2', s[1]], ['3', s[2]], ['4', '?']]),
          list,
          steps: [`1 → 2, 2 → 3 — ${RULES[rule].ko.replace('했어요', '하는').replace('렸어요', '리는')} 규칙`, '3에 같은 움직임을 한 번 더 → 4'],
          why: {
            [TAGS.ruleSkip]: '3과 같은 모양이에요 — 규칙대로 한 번 더 움직여야 해요.',
            [TAGS.axisMix]: '뒤집는 쪽이 달라요 — 1 → 2에서 어느 두 쪽이 바뀌었는지 봐요.',
            [TAGS.flipAsTurn]: '두 쪽이 모두 바뀌었어요 — 이 무늬는 뒤집기를 되풀이했어요.',
            [TAGS.turnAsFlip]: '뒤집은 모양이에요 — 이 무늬는 돌리기를 되풀이했어요.',
            [TAGS.turnHalf]: '90°만큼만 돌린 모양이에요 — 이 무늬는 180°만큼씩 돌렸어요.',
          },
          probe: { ask: 'next', rule, v },
        });
      };
      // 규칙 고르기 — 말 보기
      const ruleOf = (rule) => {
        const v = shapeOf(r); const s = seq(rule, v);
        const WR = {
          cw: [{ text: RULES.ccw.ko, tag: TAGS.turnBack }, { text: RULES.lr.ko, tag: TAGS.turnAsFlip }, { text: '오른쪽으로 밀기만 했어요', tag: TAGS.keep }],
          ccw: [{ text: RULES.cw.ko, tag: TAGS.turnBack }, { text: RULES.lr.ko, tag: TAGS.turnAsFlip }, { text: '오른쪽으로 밀기만 했어요', tag: TAGS.keep }],
          lr: [{ text: '위쪽으로 뒤집기를 되풀이했어요', tag: TAGS.axisMix }, { text: RULES.half.ko, tag: TAGS.flipAsTurn }, { text: '오른쪽으로 밀기만 했어요', tag: TAGS.keep }],
          ud: [{ text: '왼쪽으로 뒤집기를 되풀이했어요', tag: TAGS.axisMix }, { text: RULES.half.ko, tag: TAGS.flipAsTurn }, { text: '오른쪽으로 밀기만 했어요', tag: TAGS.keep }],
        }[rule];
        return {
          t: `규칙에 따라 모양을 늘어놓았어요. 무늬를 만든 규칙은 어느 것일까요?\n\n${SH([['1', s[0]], ['2', s[1]], ['3', s[2]], ['4', s[3]]])}`,
          text: true, ans: RULES[rule].ko, wr: WR,
          steps: [rule === 'cw' || rule === 'ccw' ? `1의 위쪽 부분이 2에서 ${rule === 'cw' ? '오른쪽' : '왼쪽'}으로 갔어요` : `1과 2는 ${rule === 'lr' ? '왼쪽과 오른쪽' : '위쪽과 아래쪽'}이 바뀐 모양`, `→ ${RULES[rule].ko}`],
          why: {
            [TAGS.turnBack]: `돌린 방향을 반대로 봤어요 — 위쪽 부분이 ${rule === 'cw' ? '오른쪽' : '왼쪽'}으로 갔어요.`,
            [TAGS.turnAsFlip]: '돌린 것을 뒤집기로 봤어요.',
            [TAGS.axisMix]: `${rule === 'lr' ? '왼쪽과 오른쪽' : '위쪽과 아래쪽'}이 바뀌었어요.`,
            [TAGS.flipAsTurn]: '두 쪽이 모두 바뀐 것은 아니에요 — 뒤집기를 되풀이했어요.',
            [TAGS.keep]: '모양이 바뀌었어요 — 밀기만 하면 모양이 그대로예요.',
          },
          probe: { ask: 'rule', rule, v },
        };
      };
      return askFam(r, c, this, [
        famOf([nextOne(pick(r, ['cw', 'ccw', 'lr', 'ud', 'half']))]), // 문제 글이 규칙마다 같다 — 규칙은 가족 안에서
        famOf([ruleOf(pick(r, ['cw', 'ccw', 'lr', 'ud']))]),
      ]);
    },
    misread(r, c) {
      const v = shapeOf(r); const s = [v, rot(v, 1), rot(v, 2), rot(v, 3)];
      if (branchOf(r, c, ['skip', 'dir']) === 'skip') {
        return misAsk(r, c, this, 'skip', {
          q: DREW('규칙에 따라 늘어놓은 모양의 4에 이 모양을 놓았어요.', SH([['1', s[0]], ['2', s[1]], ['3', s[2]], ['4', s[2]]])),
          ok: '4는 3을 한 번 더 시계 방향으로 90°만큼 돌린 모양이에요 — 3과 같으면 규칙이 멈춘 거예요',
          wr: [RIGHT_DREW, { text: '4는 3을 오른쪽으로 뒤집은 모양이에요', tag: TAGS.turnAsFlip }, { text: '무늬에는 규칙이 없어요', tag: OFF }],
          steps: ['1 → 2 → 3 — 시계 방향으로 90°만큼씩', '3을 한 번 더 돌린 모양이 4'],
          whyAny: '규칙은 매번 같은 움직임이에요. 3 다음에도 한 번 더 움직여요.',
          probe: { ask: 'skip', v },
        });
      }
      return misAsk(r, c, this, 'dir', {
        q: SAID(SH([['1', s[0]], ['2', s[1]], ['3', s[2]], ['4', s[3]]]), '이 무늬는 시계 반대 방향으로 90°만큼씩 돌린 거예요.'),
        ok: '시계 방향으로 90°만큼씩 돌렸어요 — 1의 위쪽 부분이 2에서 오른쪽으로 갔어요',
        wr: [RIGHT_SAID, { text: '오른쪽으로 뒤집기를 되풀이했어요', tag: TAGS.turnAsFlip }, { text: '무늬에는 규칙이 없어요', tag: OFF }],
        steps: ['1의 위쪽 부분이 2에서 오른쪽으로', '→ 시계 방향으로 90°만큼씩'],
        whyAny: '위쪽 부분이 오른쪽으로 가면 시계 방향, 왼쪽으로 가면 시계 반대 방향이에요.',
        probe: { ask: 'dirSaid', v },
      });
    },
  },

  {
    id: 'mv.apply', grade: 4, name: '⭐ 평면도형의 이동 활용', needs: ['mv.pattern'],
    idea: '처음 도형을 찾을 때는 **거꾸로** 해요 — 시계 방향으로 90°만큼 돌려서 가가 되었으면, 가를 시계 반대 방향으로 90°만큼 돌려요. 오른쪽으로 7 cm 밀었으면 왼쪽으로 7 cm. 디지털 숫자 카드를 한꺼번에 180°만큼 돌리면 숫자 모양뿐 아니라 **카드의 순서도** 바뀌어요.',
    rule: '처음을 찾을 때는 거꾸로 — 반대 방향으로 같은 만큼.',
    slip: '움직인 방법을 거꾸로 해 보고, 다시 움직여 확인해요.',
    calc(r, c) {
      // 처음 도형 — 돌리기를 거꾸로
      const undoTurn = (cw, deg) => {
        const w = shapeOf(r); const k = quarter(cw, deg);
        return shapeAsk(r, {
          head: `어떤 도형을 ${TURN_KO(cw, deg)} 돌렸더니 가가 되었어요. 처음 도형은 어느 것일까요?`,
          given: SH([['가', w]]),
          list: [{ v: rot(w, -k) }, { v: rot(w, k), tag: TAGS.notReverse }, { v: w, tag: TAGS.noUndo }, { v: flipLR(w), tag: TAGS.turnAsFlip }],
          steps: [`거꾸로 — 가를 ${TURN_KO(!cw, deg)} 돌려요`, `확인: 그 도형을 ${TURN_KO(cw, deg)} 돌리면 가`],
          why: {
            [TAGS.notReverse]: `가를 ${TURN_KO(cw, deg)} 한 번 더 돌렸어요 — 거꾸로 ${TURN_KO(!cw, deg)} 돌려야 해요.`,
            [TAGS.noUndo]: `가 그대로예요 — 처음 도형을 ${TURN_KO(cw, deg)} 돌린 것이 가예요.`,
            [TAGS.turnAsFlip]: '뒤집은 모양이에요 — 돌린 것을 거꾸로 돌려요.',
          },
          probe: { ask: 'undoTurn', cw, deg, w },
        });
      };
      // 처음 도형 — 뒤집기를 거꾸로 (같은 쪽으로 한 번 더 뒤집으면 처음)
      const undoFlip = (dir) => {
        const w = shapeOf(r);
        return shapeAsk(r, {
          head: `어떤 도형을 ${FLIP_KO[dir]}으로 뒤집었더니 가가 되었어요. 처음 도형은 어느 것일까요?`,
          given: SH([['가', w]]),
          list: [{ v: flipBy(dir, w) }, { v: w, tag: TAGS.noUndo }, { v: flipOther(dir, w), tag: TAGS.axisMix }, { v: rot(w, 2), tag: TAGS.flipAsTurn }],
          steps: [`거꾸로 — 가를 다시 ${FLIP_KO[dir]}으로 뒤집으면 처음 도형`, `${SWAP_KO[dir]}이 다시 바뀌어요`],
          why: {
            [TAGS.noUndo]: `가 그대로예요 — 처음 도형을 ${FLIP_KO[dir]}으로 뒤집은 것이 가예요.`,
            [TAGS.axisMix]: `${OTHER_KO[dir]}이 바뀌었어요 — ${SWAP_KO[dir]}이 바뀌어야 해요.`,
            [TAGS.flipAsTurn]: `두 쪽이 모두 바뀌었어요 — ${SWAP_KO[dir]}만 바뀌어요.`,
          },
          probe: { ask: 'undoFlip', dir, w },
        });
      };
      // 처음 도형 — 밀기를 거꾸로 (가로 14칸 · 후보마다 작은 모눈)
      const undoSlide = (d) => {
        const W = horiz(d) ? 14 : 5; const H = horiz(d) ? 4 : 14;
        const v = shapeOf(r, 3, 3);
        const s = slideSpot(r, d, W, H, v, [1, 2], (w, n) => [n, n + w]); // 앞쪽: 같은 쪽으로 또 민 후보 · 뒤쪽: 빈칸만큼 띄운 후보
        const at = (k) => xyOf(d, s.a - sgn(d) * k, s.b);
        const [x1, y1] = xyOf(d, s.a, s.b);
        const list = [
          { v: tok(...at(s.n), v) },
          { v: tok(...at(-s.n), v), tag: TAGS.notReverse },
          { v: tok(...at(s.n + s.w), v), tag: TAGS.gapOnly },
          { v: tok(...at(s.n), flipAlong(d, v)), tag: TAGS.slideFlip },
        ];
        const P = placeCands(r, list);
        const cand = P.pairs.map(([k, t]) => { const [xy, sv] = t.split('='); const [x, y] = xy.split(',').map(Number); return [k, x, y, sv]; });
        return {
          t: `모눈 한 칸의 길이는 1 cm예요. 어떤 도형을 ${SLIDE_KO[d]}으로 ${s.n} cm 밀었더니 나중 도형이 되었어요. 처음 도형은 어느 것일까요?\n\n${MV(W, H, false, [['나중', x1, y1, v], ...cand])}`,
          text: true, ans: P.ans, wr: P.wr,
          steps: [`거꾸로 — 나중 도형을 ${SLIDE_KO[OPP[d]]}으로 ${s.n} cm`, `확인: 그 도형을 ${SLIDE_KO[d]}으로 ${s.n} cm 밀면 나중 도형 → ${P.ans}`],
          why: {
            [TAGS.notReverse]: `${SLIDE_KO[d]}으로 한 번 더 밀었어요 — 거꾸로 ${SLIDE_KO[OPP[d]]}으로 ${s.n} cm예요.`,
            [TAGS.gapOnly]: `두 도형 사이에 빈칸을 ${s.n}칸 두었어요 — 같은 칸이 ${s.n}칸 떨어져야 해요.`,
            [TAGS.slideFlip]: '모양이 바뀌었어요 — 밀면 모양은 그대로예요.',
          },
          draw: { fig: MV(W, H, true, [['나중', x1, y1, v]]).slice(1, -1), mode: 'mcells', kind: 'place', target: list[0].v, cands: P.pairs.map(([k, t]) => ({ k, v: t })) },
          probe: { ask: 'undoSlide', d, n: s.n, w: s.w, v, x1, y1 },
        };
      };
      // 디지털 숫자 카드 — 숫자판
      const cards = (how) => {
        const pool = how === 'turn' ? [2, 5, 6, 8, 9] : how === 'ud' ? [2, 3, 5, 8] : [2, 5, 8];
        const map = how === 'turn' ? R180 : how === 'ud' ? UD : LR;
        const reversed = how !== 'ud'; // 한꺼번에 돌리거나 왼쪽·오른쪽으로 뒤집으면 카드 순서도 바뀐다
        const { ds } = drawUntil(() => ({ ds: Array.from({ length: int(r, 2, 3) }, () => pick(r, pool)) }), ({ ds: x }) => {
          const m = x.map((dd) => map[dd]);
          const ans = (reversed ? [...m].reverse() : m).join('');
          const vals = [ans, reversed ? m.join('') : [...m].reverse().join(''), reversed ? [...x].reverse().join('') : x.join('')];
          return new Set(vals).size === 3 && ans !== x.join('');
        });
        const m = ds.map((dd) => map[dd]);
        const ans = (reversed ? [...m].reverse() : m).join('');
        const HOW = { turn: '시계 방향으로 180°만큼 돌리면', ud: '아래쪽으로 뒤집으면', lr: '오른쪽으로 뒤집으면' }[how];
        const wr = reversed
          ? [{ text: m.join(''), tag: TAGS.orderKeep }, { text: [...ds].reverse().join(''), tag: TAGS.digitKeep }]
          : [{ text: [...m].reverse().join(''), tag: TAGS.orderSwap }, { text: ds.join(''), tag: TAGS.digitKeep }];
        return {
          t: `디지털 숫자 카드를 놓았어요. 카드를 한꺼번에 ${HOW} 어떤 수가 될까요?\n\n[seg ${ds.join('')}]`,
          ans, wr,
          steps: [
            `숫자마다: ${ds.map((dd) => `${dd} → ${map[dd]}`).join(', ')}`,
            reversed ? `카드의 순서도 바뀌어요 — ${ans}` : `위쪽과 아래쪽만 바뀌어 카드 순서는 그대로 — ${ans}`,
          ],
          why: {
            [TAGS.orderKeep]: `카드의 순서도 바뀌어요 — 맨 왼쪽 카드가 맨 오른쪽으로 가요. 답은 ${ans}이에요.`,
            [TAGS.digitKeep]: `숫자 모양도 바뀌어요 — ${ds.map((dd) => `${dd} → ${map[dd]}`).join(', ')}.`,
            [TAGS.orderSwap]: `아래쪽으로 뒤집으면 왼쪽과 오른쪽은 그대로라 카드 순서는 안 바뀌어요 — 답은 ${ans}이에요.`,
          },
          probe: { ask: 'cards', how, ds },
        };
      };
      return askFam(r, c, this, [
        famOf([[true, 90], [false, 90], [true, 270], [false, 270]].map(([cw, deg]) => undoTurn(cw, deg))),
        famOf(['right', 'left', 'up', 'down'].map((dir) => undoFlip(dir))),
        famOf(['R', 'L', 'U', 'D'].map((d) => undoSlide(d))),
        famOf(['turn', 'ud', 'lr'].map((how) => cards(how))),
      ]);
    },
    misread(r, c) {
      if (branchOf(r, c, ['order', 'back']) === 'order') {
        const { ds } = drawUntil(() => ({ ds: [pick(r, [2, 5, 6, 8, 9]), pick(r, [6, 9])] }), ({ ds: x }) => x[0] !== x[1] && new Set([[...x.map((d) => R180[d])].reverse().join(''), x.map((d) => R180[d]).join(''), [...x].reverse().join('')]).size === 3);
        const m = ds.map((d) => R180[d]);
        return misAsk(r, c, this, 'order', {
          q: SAID(`[seg ${ds.join('')}]`, `카드를 한꺼번에 시계 방향으로 180°만큼 돌리면 ${m.join('')}이에요.`),
          ok: `카드의 순서도 바뀌어요 — ${[...m].reverse().join('')}이에요`,
          wr: [RIGHT_SAID, { text: `숫자 모양은 그대로라서 ${[...ds].reverse().join('')}이에요`, tag: TAGS.digitKeep }, { text: '디지털 숫자는 돌릴 수 없어요', tag: OFF }],
          steps: [`숫자마다: ${ds.map((d) => `${d} → ${R180[d]}`).join(', ')}`, `180°만큼 돌리면 맨 왼쪽 카드가 맨 오른쪽으로 → ${[...m].reverse().join('')}`],
          whyAny: '카드를 한꺼번에 돌리면 숫자 모양과 함께 카드의 순서도 거꾸로 돼요.',
          probe: { ask: 'order', ds },
        });
      }
      const cw = r() < 0.5;
      return misAsk(r, c, this, 'back', {
        q: SAID('', `어떤 도형을 ${TURN_KO(cw, 90)} 돌렸더니 가가 되었으면, 처음 도형은 가를 ${TURN_KO(cw, 90)} 한 번 더 돌린 모양이에요.`),
        ok: `거꾸로 해야 해요 — 가를 ${TURN_KO(!cw, 90)} 돌린 모양이 처음 도형이에요`,
        wr: [RIGHT_SAID, { text: '처음 도형은 가와 같은 모양이에요', tag: TAGS.noUndo }, { text: '처음 도형은 찾을 수 없어요', tag: OFF }],
        steps: [`처음 도형 → ${TURN_KO(cw, 90)} → 가`, `거꾸로: 가 → ${TURN_KO(!cw, 90)} → 처음 도형`],
        whyAny: '처음을 찾을 때는 움직인 방법을 거꾸로 해요 — 반대 방향으로 같은 만큼.',
        probe: { ask: 'backSaid', cw },
      });
    },
  },
];

// ───────────────────── 내보내기 (다른 줄기와 같은 꼴) ─────────────────────

export function conceptById(id) {
  return MOVE.find((c) => c.id === id) || null;
}

const SLIP = '한 번 더 천천히 — 움직이는 쪽과 바뀌는 쪽을 확인해요.';
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
  return diagnosticOf(MOVE, makeQuestion, seed, n, opts);
}
export function placeFrom(answers) {
  return placeFromOf(MOVE, answers);
}
export function ladder(doneIds) {
  return ladderOf(MOVE, doneIds);
}

// ───────────────────── 사람이 쓴 내용 검사 (check.mjs가 부른다) ─────────────────────

function badPlaceholders(txt) {
  const leak = String(txt || '').match(/\{[^}]*\}/g) || [];
  return leak.filter((l) => !/^\{(me|mon|mon2)(\/[^/}]+\/[^}]+)?\}$/.test(l));
}
/** 글자 → 비교용 값 (checkHuman이 쓴다) — 수만 (㉠~㉣·말 보기는 글자로 견준다) */
const ratOf = (t) => (/^\d+$/.test(String(t == null ? '' : t).trim()) ? { n: +String(t).trim(), d: 1 } : null);

/**
 * coach/math/move.json 형식 검사 — mathmuldiv.checkContent와 같은 규칙
 * @returns {string[]}
 */
export function checkContent(content) {
  const bad = [];
  const same = (a, b) => !!(a && b && a.n * b.d === b.n * a.d);
  for (const c of MOVE) {
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
