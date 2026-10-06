// 🧊 수학 — S 공간과 입체 줄기 (초6 2학기 「공간과 입체」 — 쌓기나무): 개념 사다리 + 문제 생성기 + 내용 형식 검사.
// 순수 함수만 — 화면 없음 (node 테스트에서 그대로 돈다).
//
// 왜 이 줄기인가 (2026-10-06, 아버님 "다음 줄기 「공간과 입체」 해보자" → 설계안 "이대로 진행하자"): R 좌표평면 다음, 추천 순서 둘째.
// 칸 범위는 미래엔 6-2 지도서 134~135쪽 학습 흐름도(13차시)·162쪽(위에서 본 모양에 수·층별)·166쪽(조건에 따라 모양 만들기)과
//   2022 성취기준 [6수03-09] 쌓기나무로 만든 입체도형을 보고 사용된 쌓기나무의 개수를 구할 수 있다 ·
//   [6수03-10] 위, 앞, 옆에서 본 모양을 표현할 수 있고, 이러한 표현을 보고 입체도형의 모양을 추측할 수 있다 — 로 확인했다.
//   차시: 어느 방향에서 보았는지 → 위·앞·옆에서 본 모양 → 개수 (1)(2) → 위에서 본 모양에 수 · 층별 → 조건에 따라 모양 만들기
//   ("돌리거나 뒤집었을 때 모양이 같은 것은 하나의 모양") → 위·앞·옆 모양에 맞게 쌓기(가장 적은 개수) → 쌓기 프로그래밍
//
// 그림은 모두 높이 표 하나(위에서 본 모양에 수를 쓴 것)에서 — mathdraw `[stack]`·`[stacks]`·`[views]`·`[top]`·`[layers]`.
// 약속(교과서와 같게): "옆"은 오른쪽 옆. 오른쪽 옆에서 보면 왼쪽이 앞 줄, 뒤에서 보면 좌우가 바뀐다.
//
// 오답은 아이가 실제로 하는 틀린 생각 흉내다:
//   · 뒤·왼쪽에서 보면 좌우가 바뀌는 것을 놓침 · 앞과 옆을 헷갈림 · 기둥의 쌓기나무 수를 모두 쌓아 그림 · 바로 앞 줄만 봄
//   · 보이는 쌓기나무만 셈 · 위에서 본 칸 수만 셈 · 모든 칸을 가장 높은 층으로 봄 · 세 모양의 칸 수를 더함
//   · 1층만 셈 · 꼭대기가 그 층인 것만 셈 · 돌린 모양을 다른 모양으로 봄 · 거울에 비친 모양을 같은 모양으로 봄
//   · 가장 적을 때와 가장 많을 때를 바꿈 · 정육면체 전체 수를 답함 · 바닥 면까지 셈
//
// 새 줄기의 함정(메모 stem-generator-pitfalls)을 처음부터:
//   · 가족 = 틀 여러 개, 틀마다 수를 미리 뽑아 둔다 — 🔁 쌍둥이가 요청한 틀(tplKey)로 온다
//   · ★ tplKey는 숫자만 #로 지운다 → 틀마다 높이 표의 가로·세로 칸 수를 고정한다(지시문의 수 개수가 열쇠에 든다).
//     후보 넷을 섞어 적는 그림은 후보끼리 길이가 같은 것만(정사각형 바닥 · 같은 크기 상자) — 길이가 다르면 섞은 자리마다 열쇠가 갈린다
//   · 후보에서 고르는 문항은 "어느 것" 말투로 (아니면 숫자판이 뜬다, v189) · 수 답 보기는 수만
//   · 틀린 방법이 우연히 맞는 값·오답끼리 같은 값은 뽑지 않는다 (probe.allWrong)
//   · ㉠~㉣는 기역·니은·디귿·리을이라 늘 받침 — "㉠은 · ㉠과"
// ★ 정답·오답은 테스트가 **문제 글의 그림 지시문을 따로 읽어** 다시 푼다 (tests/mathspace.test.js) — 보이는 쌓기나무는 그린 SVG를 다시 칠해서.

import { figureSvg, stackText, stackTok, stackVis } from './mathdraw.js';
import { rng, shuffle, fill, castOf, ask, solve, int, pick, humanQuestion, checkHuman, diagnosticOf, placeFromOf, ladderOf } from './mathgen.js';
import { gradeLabel } from './mathmix.js';
import { _kit as cubKit } from './mathcuboid.js';

export { gradeLabel };

const { famOf, runFamily, calcAsk, textChoices, branchOf, showWork, step, RIGHT_AS_WRONG, OFF } = cubKit;
/** 가족에서 틀 하나를 골라 ① 문항으로 — 본 모양 고르기 틀(S1·S2·S5)의 draw(✍️ 칸 칠하기 판)도 넘긴다 (공용 calcAsk는 draw를 모른다) */
function askFam(r, c, concept, fams) {
  const v = runFamily(r, c, fams);
  const q = calcAsk(r, c, concept, v);
  return v.draw ? { ...q, draw: v.draw } : q;
}

/** ② 문항 — m: { q, ok, wr, steps, whyAny, rule, probe } (O 직육면체와 같은 모양) */
function misAsk(r, c, concept, branch, m) {
  const F = (t) => fill(t, c);
  const chs = textChoices(r, F(m.ok), m.wr.map((w) => ({ ...w, text: F(w.text) })));
  return {
    ...ask(concept.id, 'misread', F(m.q), chs, { solve: solve(m.steps.map((t, i) => step(i, F(t))), { whyAny: F(m.whyAny), rule: m.rule || concept.rule }) }),
    key: `misread:${branch}`,
    probe: m.probe || null,
  };
}

/** 오답 값이 서로 다르고 정답과도 다르며 모두 0보다 크다 */
const allDiff = (...vals) => vals.every((v) => v > 0) && new Set(vals.map(String)).size === vals.length;
const LBL = ['㉠', '㉡', '㉢', '㉣'];

// ───────────────────── 높이 표 (g[j][i]: j = 0이 앞 줄, i = 0이 왼쪽) ─────────────────────

const total = (g) => g.flat().reduce((a, b) => a + b, 0);
const cellsOf = (g) => g.flat().filter(Boolean).length;
const maxH = (g) => Math.max(...g.flat());
/** 앞에서 본 모양 — 왼쪽부터 기둥마다 가장 높은 층 */
const frontV = (g) => g[0].map((_, i) => Math.max(...g.map((row) => row[i])));
/** 오른쪽 옆에서 본 모양 — 왼쪽이 앞 줄 */
const sideV = (g) => g.map((row) => Math.max(...row));
/** 위에서 본 모양 "110/111" (첫 줄이 뒤) */
const footV = (g) => [...g].reverse().map((row) => row.map((h) => (h ? 1 : 0)).join('')).join('/');
/** 위에서 본 모양 "110/011/111"을 종이째 시계 방향으로 90° 돌린 것 (정사각형 바닥) — 가로세로 바꾸기(전치)는 대각선 뒤집기라 "돌려 놓음"이 아니다 (Codex 34차 #5) */
const turnFoot = (f) => { const R = f.split('/'); return [...R[0]].map((_, i) => R.map((row) => row[i]).reverse().join('')).join('/'); };
const prof = (h) => h.join(',');
const rev = (a) => [...a].reverse();
const mirrorG = (g) => g.map((row) => rev(row));
const flipG = (g) => rev(g);
const sameG = (a, b) => stackText(a) === stackText(b);
/** 바닥이 한 덩이로 이어져 있나 (위에서 본 칸끼리 변으로) */
function connected(g) {
  const D = g.length; const W = g[0].length;
  const on = []; for (let j = 0; j < D; j++) for (let i = 0; i < W; i++) if (g[j][i]) on.push(`${i},${j}`);
  const seen = new Set([on[0]]); const st = [on[0]];
  while (st.length) {
    const [i, j] = st.pop().split(',').map(Number);
    for (const [a, b] of [[i + 1, j], [i - 1, j], [i, j + 1], [i, j - 1]]) { const k = `${a},${b}`; if (on.includes(k) && !seen.has(k)) { seen.add(k); st.push(k); } }
  }
  return seen.size === on.length;
}
/**
 * 높이 표 뽑기 — W×D, 칸마다 0~mh, 줄·칸마다 하나 이상(그림 크기가 W×D 그대로), 바닥이 이어지고, 쌓기나무 수 lo~hi
 * zero: 빈 칸이 나올 몫
 */
function genStack(r, W, D, mh, lo, hi, ok = () => true, zero = 0.2) {
  for (let t = 0; t < 4000; t++) {
    const g = Array.from({ length: D }, () => Array.from({ length: W }, () => (r() < zero ? 0 : int(r, 1, mh))));
    if (!g.every((row) => row.some(Boolean)) || !g[0].every((_, i) => g.some((row) => row[i]))) continue;
    const n = total(g);
    if (n < lo || n > hi || !connected(g) || !ok(g)) continue;
    return g;
  }
  throw new Error(`genStack: 조건에 맞는 모양 없음 ${W}×${D}`);
}
/** 기둥마다 높이를 읽을 수 있나 — 기둥마다 맨 위 쌓기나무의 윗면이 30% 넘게 보인다 (위에서 본 모양을 함께 줄 때는 이것만) */
const topsVisible = (g) => stackVis(g).topVis.flat().every((v) => v === null || v >= 0.3);
/**
 * 빈 칸도 빈 줄 알 수 있나 — 그 자리에 쌓기나무 1개를 놓으면 윗면이 30% 넘게 보인다.
 * 키 큰 기둥 뒤에 가려진 빈 칸은 "낮은 기둥이 숨어 있다"와 구별이 안 된다 (갤러리 눈 확인: 위에서 본 모양을 묻는 S2)
 */
const emptyClear = (g) => g.every((row, j) => row.every((h, i) => {
  if (h) return true;
  const t = g.map((rw) => [...rw]); t[j][i] = 1;
  return stackVis(t).topVis[j][i] >= 0.3;
}));
/** 겨냥도만 보고 쌓은 모양을 다 알 수 있나 — 위에서 본 모양 없이 그림만 줄 때 */
const readable = (g) => topsVisible(g) && emptyClear(g);
/** 그림에서 하나도 안 보이는 쌓기나무 수 */
const hiddenOf = (g) => stackVis(g).cubes.filter((c) => !c.any).length;

const ST = (g) => `[stack ${stackText(g)}]`;
const TOP = (g) => `[top ${stackText(g)}]`;
const LAY = (g) => `[layers ${stackText(g)}]`;
const VW = (pairs) => `[views ${pairs.map(([k, v]) => `${k}=${v}`).join(' ')}]`;
/** 위에서 본 모양에 쓴 수를 뒤 줄부터 "2 + 1 + 1 + 3 + 1" */
const sumText = (g) => [...g].reverse().flat().filter(Boolean).join(' + ');
/** 줄마다 "뒤 줄 2, 1 · 앞 줄 1, 3, 1" (빈 칸은 0) */
const rowsText = (g) => [...g].reverse().map((row, n, all) => `${n === all.length - 1 ? '앞 줄' : n === 0 ? '뒤 줄' : '가운데 줄'} ${row.join(', ')}`).join(' · ');

/**
 * 후보 넷을 ㉠~㉣에 섞어 놓기 — list[0]이 정답. 돌려주는 것: { pairs:[[㉠, 값]…], ans:'㉡', wr:[{text:'㉠', tag}…] }
 * 값은 서로 달라야 한다 (같은 그림이 둘이면 정답이 둘)
 */
function placeCands(r, list) {
  if (new Set(list.map((x) => x.v)).size !== list.length) return null;
  const order = shuffle(r, list.map((_, i) => i));
  const pairs = order.map((idx, n) => [LBL[n], list[idx].v]);
  const at = (idx) => LBL[order.indexOf(idx)];
  return { pairs, ans: at(0), wr: list.slice(1).map((x, n) => ({ text: at(n + 1), tag: x.tag })), at };
}

// ───────────────────── 쌓기나무 4개로 만든 모양 (S7) ─────────────────────

/** 정육면체를 돌리는 24가지 (축 바꿈 + 부호, 행렬식 +1만 — 거울은 안 된다) */
const ROTS = (() => {
  const out = [];
  const perms = [[0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0]];
  const parity = (p) => ((p[0] > p[1]) + (p[0] > p[2]) + (p[1] > p[2])) % 2;
  for (const p of perms) for (let s = 0; s < 8; s++) {
    const sg = [s & 1 ? -1 : 1, s & 2 ? -1 : 1, s & 4 ? -1 : 1];
    const det = (parity(p) ? -1 : 1) * sg[0] * sg[1] * sg[2];
    if (det === 1) out.push((v) => [sg[0] * v[p[0]], sg[1] * v[p[1]], sg[2] * v[p[2]]]);
  }
  return out;
})();
const normCubes = (cs) => { const m = [0, 1, 2].map((d) => Math.min(...cs.map((c) => c[d]))); return cs.map((c) => c.map((v, d) => v - m[d])).sort((a, b) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2]); };
const cubesKey = (cs) => normCubes(cs).map((c) => c.join('')).join(' ');
/** 돌려서 같은 것끼리 같은 열쇠 */
const shapeKey = (cs) => ROTS.map((R) => cubesKey(cs.map(R))).sort()[0];
/** 쌓기나무 목록 → 높이 표 (3 × 3 상자, 앞 왼쪽에 붙여서). 기둥이 바닥부터 이어지지 않거나(떠 있는 쌓기나무) 상자를 넘으면 null */
function cubesToG(cs) {
  const n = normCubes(cs);
  if (n.some((c) => c[0] > 2 || c[1] > 2 || c[2] > 2)) return null;
  const g = [0, 1, 2].map(() => [0, 0, 0]);
  for (const [i, j, k] of n) g[j][i] = Math.max(g[j][i], k + 1);
  return total(g) === n.length ? g : null;
}
const gToCubes = (g) => { const out = []; g.forEach((row, j) => row.forEach((h, i) => { for (let k = 0; k < h; k++) out.push([i, j, k]); })); return out; };
/**
 * 쌓기나무 4개로 만든 서로 다른 모양 — 3 × 3 × 3 상자에 들어가는 것(일자 4개는 빼고): 모양마다 놓을 수 있는 높이 표들.
 * 쌓기나무 하나라도 그림에서 다 가려지는 놓기는 뺀다 — 세 갈래 모양을 `0 0 0 / 2 1 0 / 1 0 0`으로 놓으면
 * 가운데 아래 쌓기나무가 앞·위·오른쪽 모두 막혀 3개만 보인다 (2단계 원고를 쓰며 잡음)
 */
const TETRA = (() => {
  const seen = new Map();
  const grow = (cs) => {
    if (cs.length === 4) { const k = shapeKey(cs); if (!seen.has(k)) seen.set(k, cs); return; }
    for (const c of cs) for (const d of [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]]) {
      const nc = [c[0] + d[0], c[1] + d[1], c[2] + d[2]];
      if (!cs.some((x) => x[0] === nc[0] && x[1] === nc[1] && x[2] === nc[2])) grow([...cs, nc]);
    }
  };
  grow([[0, 0, 0]]);
  const out = [];
  for (const [key, cs] of seen) {
    const maps = new Map();
    for (const R of ROTS) { const g = cubesToG(cs.map(R)); if (g && stackVis(g).cubes.every((c) => c.any)) maps.set(stackText(g), g); }
    if (maps.size) out.push({ key, mirror: shapeKey(cs.map(([x, y, z]) => [-x, y, z])), gs: [...maps.values()] });
  }
  return out;
})();
const tetraOf = (g) => TETRA.find((t) => t.key === shapeKey(gToCubes(g)));

// ───────────────────── 위·앞·옆에서 본 모양에 맞게 쌓기 (S4·S8) ─────────────────────

/**
 * 위·앞·옆에서 본 모양에 맞는 높이 표를 모두 센다 — 위 칸마다 1 ~ min(앞, 옆), 앞·옆의 가장 높은 층이 맞게.
 * @returns {{n:number, min:number, max:number, minG:number[][]|null}} (n은 3에서 멈추지 않고 모두)
 */
export function fitAll(top, F, S) {
  const D = top.length; const W = top[0].length;
  const cells = []; for (let j = 0; j < D; j++) for (let i = 0; i < W; i++) if (top[j][i]) cells.push([i, j]);
  const h = top.map((row) => row.map(() => 0));
  let n = 0; let min = Infinity; let max = -Infinity; let minG = null;
  const go = (k) => {
    if (k === cells.length) {
      if (!F.every((f, i) => Math.max(...h.map((row) => row[i])) === f) || !S.every((s, j) => Math.max(...h[j]) === s)) return;
      n++; const t = total(h);
      if (t < min) { min = t; minG = h.map((row) => [...row]); }
      if (t > max) max = t;
      return;
    }
    const [i, j] = cells[k];
    for (let v = 1; v <= Math.min(F[i], S[j]); v++) { h[j][i] = v; go(k + 1); }
    h[j][i] = 0;
  };
  go(0);
  return { n, min, max, minG };
}
const topOf = (g) => g.map((row) => row.map((v) => (v ? 1 : 0)));

// ───────────────────── 오개념 이름표 ─────────────────────

/** 이 줄기의 오개념 이름표 (📊·🤔 노트·결과 카드에 그대로 뜬다) */
export const TAGS = {
  // S1 어느 방향에서 보았나
  mirrorDir: '좌우가 바뀐 모양을 같은 쪽에서 본 것으로 봄',
  sideMix: '앞과 옆을 헷갈림',
  // S2 위·앞·옆에서 본 모양
  mirrorView: '좌우를 바꿔 봄',
  flipFB: '앞뒤를 바꿔 봄',
  nearOnly: '바로 앞에 보이는 줄만 봄',
  sumView: '기둥의 쌓기나무 수를 모두 쌓음',
  turnTop: '위에서 본 모양을 돌려 놓음',
  // S3 개수 (1)
  visibleOnly: '보이는 쌓기나무만 셈',
  cellsOnly: '위에서 본 칸 수만 셈',
  frontOnly: '앞에서 보이는 칸만 셈',
  skipFront: '앞 줄을 빼고 셈',
  hiddenAll: '모두 센 수를 답함',
  // S4 개수 (2)
  viewsSum: '본 모양들의 칸 수를 더함',
  maxTimes: '모든 칸을 가장 높은 층으로 봄',
  topWrong: '위에서 본 모양과 맞춰 보지 않음',
  frontWrong: '앞에서 본 모양과 맞춰 보지 않음',
  sideWrong: '옆에서 본 모양과 맞춰 보지 않음',
  // S5 위에서 본 모양에 수 쓰기
  mirrorStack: '좌우를 바꿔 쌓음',
  flipStack: '앞뒤를 바꿔 쌓음',
  heightOff: '수를 잘못 옮김',
  // S6 층별로 나타내기
  firstOnly: '1층만 셈',
  sameLayers: '모든 층을 1층과 같게 봄',
  onlyTop: '꼭대기가 그 층인 것만 셈',
  aboveAll: '그 층과 그 위를 모두 셈',
  // S7 조건에 따라 모양 만들기
  rotDiff: '돌린 모양을 다른 모양으로 봄',
  diffShape: '다른 모양을 같은 모양으로 봄',
  mirrorSame: '겹쳐지지 않는 거울 모양을 같은 모양으로 봄',
  // S8 가장 적게·가장 많이
  maxForMin: '가장 많을 때를 답함',
  minForMax: '가장 적을 때를 답함',
  // S9 활용
  cubeAll: '정육면체 전체 수를 답함',
  floorOnly: '바닥 한 층만 채움',
  countOnly: '쌓은 수를 답함',
  withBottom: '바닥 면까지 셈',
  allFaces: '쌓기나무마다 여섯 면을 셈',
  viewOnce: '앞·옆을 한 번씩만 셈',
  wrongReason: '틀린 까닭을 잘못 앎',
};

// ───────────────────── 개념 사다리 (S. 공간과 입체 줄기) ─────────────────────

const DIRS = { front: '앞에서', back: '뒤에서', right: '오른쪽 옆에서', left: '왼쪽 옆에서' };
const MIRROR = { front: 'back', back: 'front', right: 'left', left: 'right' };
const dirViews = (g) => ({ front: prof(frontV(g)), back: prof(rev(frontV(g))), right: prof(sideV(g)), left: prof(rev(sideV(g))) });
const DIR_STEP = {
  front: (g) => `앞에서 보면 기둥마다 가장 높은 층이 보여요 — 왼쪽부터 ${frontV(g).join(', ')}층`,
  back: (g) => `뒤에서 보면 좌우가 바뀌어요 — 왼쪽부터 ${rev(frontV(g)).join(', ')}층`,
  right: (g) => `오른쪽 옆에서 보면 앞 줄이 왼쪽이에요 — 왼쪽부터 ${sideV(g).join(', ')}층`,
  left: (g) => `왼쪽 옆에서 보면 뒤 줄이 왼쪽이에요 — 왼쪽부터 ${rev(sideV(g)).join(', ')}층`,
};

export const SPACE = [
  {
    id: 'spc.dir', grade: 6, name: '어느 방향에서 보았나', needs: [],
    idea: '같은 쌓기나무 모양도 **어느 쪽에서 보느냐**에 따라 다르게 보여요. 앞에서 보면 기둥마다 가장 높은 층이 보이고, **뒤에서 보면 좌우가 바뀌어요**. 오른쪽 옆에서 보면 왼쪽이 앞 줄, 왼쪽 옆에서 보면 왼쪽이 뒤 줄이에요.',
    rule: '보는 쪽에 서 있다고 생각하기 — 뒤·왼쪽에서 보면 좌우가 바뀐다.',
    slip: '그 쪽에 서 있다고 생각하고, 내 왼쪽에 무엇이 오는지 봐요.',
    calc(r, c) {
      const fams = [];
      // 본 모양 하나 → 어느 쪽 (가로 3칸 · 세로 2줄 — 앞·뒤는 3칸, 옆은 2칸)
      const whichDir = (d) => {
        const g = genStack(r, 3, 2, 3, 4, 11, (x) => new Set(Object.values(dirViews(x))).size === 4 && readable(x));
        const V = dirViews(g);
        return {
          t: `쌓기나무로 쌓은 모양을 어느 한 쪽에서 본 모양이 ㉠이에요. ㉠은 어느 쪽에서 본 모양일까요?\n\n${ST(g)}\n\n${VW([['㉠', V[d]]])}`,
          text: true, ans: DIRS[d],
          wr: Object.keys(DIRS).filter((k) => k !== d).map((k) => ({ text: DIRS[k], tag: MIRROR[d] === k ? TAGS.mirrorDir : TAGS.sideMix })),
          steps: [DIR_STEP[d](g), `㉠과 같아요 → ${DIRS[d]} 본 모양`],
          why: { [TAGS.mirrorDir]: `${DIRS[MIRROR[d]]} 보면 좌우가 바뀌어 왼쪽부터 ${V[MIRROR[d]].split(',').join(', ')}층이에요.`, [TAGS.sideMix]: '앞·뒤에서는 가로 3칸, 옆에서는 2줄이 보여요 — 칸 수부터 세어 봐요.' },
          probe: { ask: 'whichDir', d },
        };
      };
      fams.push(famOf([whichDir('front'), whichDir('back'), whichDir('right'), whichDir('left')]));
      // 어느 쪽 → 본 모양 고르기 (바닥 3 × 3 — 네 쪽 모양의 칸 수가 같아 섞어 놓아도 열쇠가 같다)
      const pickView = (d) => {
        const g = genStack(r, 3, 3, 3, 5, 14, (x) => new Set(Object.values(dirViews(x))).size === 4 && readable(x));
        const V = dirViews(g);
        const P = placeCands(r, [{ v: V[d] }, ...Object.keys(DIRS).filter((k) => k !== d).map((k) => ({ v: V[k], tag: MIRROR[d] === k ? TAGS.mirrorDir : TAGS.sideMix }))]);
        // ✍️ 칸 칠하기 판(S2와 같은 판): 후보 그림을 빼고 그 쪽에서 본 모양을 칠한다 — 네 쪽 모양 모두 3칸·3층 안이라 판은 늘 3 × 3
        const fig = VW(P.pairs).slice(1, -1);
        const draw = { fig, mode: 'cells', kind: 'side', target: V[d], cands: P.pairs.map(([k, v]) => ({ k, v })) };
        return {
          t: `쌓기나무로 쌓은 모양을 ${DIRS[d]} 본 모양은 어느 것일까요?\n\n${ST(g)}\n\n[${fig}]`,
          text: true, ans: P.ans, wr: P.wr,
          steps: [DIR_STEP[d](g), `→ ${P.ans}`],
          why: { [TAGS.mirrorDir]: `그것은 ${DIRS[MIRROR[d]]} 본 모양이에요 — ${DIRS[d]} 보면 좌우가 바뀌어요.`, [TAGS.sideMix]: `그것은 ${d === 'front' || d === 'back' ? '옆' : '앞이나 뒤'}에서 본 모양이에요.` },
          probe: { ask: 'pickView', d },
          draw,
        };
      };
      fams.push(famOf([pickView('front'), pickView('back'), pickView('right'), pickView('left')]));
      return askFam(r, c, this, fams);
    },
    misread(r, c) {
      if (branchOf(r, c, ['back', 'left']) === 'back') {
        // "앞 줄만" 오답이 "0층"을 말하지 않게 앞 줄은 빈 칸 없이, 그 수가 뒤에서 본 모양과 다르게
        const g = genStack(r, 3, 2, 3, 4, 11, (x) => x[0].every(Boolean) && prof(rev(x[0])) !== prof(rev(frontV(x))) && new Set(Object.values(dirViews(x))).size === 4 && readable(x));
        const F = frontV(g);
        return misAsk(r, c, this, 'back', {
          q: `쌓기나무로 쌓은 모양을 보고\n\n${ST(g)}\n\n${showWork(`뒤에서 본 모양은 앞에서 본 모양과 같아요 — 왼쪽부터 ${F.join(', ')}층`)}`,
          ok: `뒤에서 보면 좌우가 바뀌어요 — 왼쪽부터 ${rev(F).join(', ')}층`,
          wr: [{ text: '맞게 말했어요', tag: RIGHT_AS_WRONG }, { text: `뒤에서 보면 앞 줄만 보여요 — 왼쪽부터 ${rev(g[0]).join(', ')}층`, tag: TAGS.nearOnly }, { text: '뒤에서는 쌓기나무가 보이지 않아요', tag: OFF }],
          steps: [`앞에서 보면 왼쪽부터 ${F.join(', ')}층`, `뒤로 돌아가 보면 오른쪽 기둥이 왼쪽에 와요 — ${rev(F).join(', ')}층`],
          whyAny: '뒤에서 보면 좌우가 바뀌어요. 앞에서 본 모양을 뒤집은 모양이에요.',
          probe: { ask: 'misBack' },
        });
      }
      const g = genStack(r, 3, 2, 3, 4, 11, (x) => new Set(Object.values(dirViews(x))).size === 4 && readable(x));
      const S = sideV(g);
      return misAsk(r, c, this, 'left', {
        q: `쌓기나무로 쌓은 모양을 보고\n\n${ST(g)}\n\n${showWork(`오른쪽 옆에서 본 모양 — 왼쪽부터 ${rev(S).join(', ')}층`)}`,
        ok: `오른쪽 옆에서 보면 왼쪽이 앞 줄이에요 — 왼쪽부터 ${S.join(', ')}층`,
        wr: [{ text: '맞게 말했어요', tag: RIGHT_AS_WRONG }, { text: `오른쪽 옆에서는 앞에서 본 모양과 같아요 — 왼쪽부터 ${frontV(g).join(', ')}층`, tag: TAGS.sideMix }, { text: '옆에서 본 모양은 그릴 수 없어요', tag: OFF }],
        steps: [`오른쪽 옆에 서면 내 왼쪽에 앞 줄, 오른쪽에 뒤 줄이 와요`, `앞 줄의 가장 높은 층 ${S[0]}, 뒤 줄 ${S[1]} → 왼쪽부터 ${S.join(', ')}층`],
        whyAny: '그것은 왼쪽 옆에서 본 모양이에요. 오른쪽 옆에서 보면 왼쪽이 앞 줄이에요.',
        probe: { ask: 'misLeft' },
      });
    },
  },

  {
    id: 'spc.view', grade: 6, name: '위·앞·옆에서 본 모양', needs: ['spc.dir'],
    idea: '**위에서 본 모양**은 바닥에 놓인 칸의 모양(앞이 아래쪽), **앞에서 본 모양**은 왼쪽부터 기둥마다 가장 높은 층, **옆에서 본 모양**(오른쪽 옆)은 앞 줄부터 줄마다 가장 높은 층이에요. 뒤에 숨은 쌓기나무는 앞의 것에 가려 보이지 않아요.',
    rule: '앞·옆에서 본 모양은 줄마다 가장 높은 층, 위에서 본 모양은 바닥 칸 — 앞이 아래쪽.',
    slip: '가장 높은 층만 보이는지, 좌우·앞뒤가 바뀌지 않았는지 봐요.',
    calc(r, c) {
      const fams = [];
      const viewQ = (d) => {
        const g = genStack(r, 3, 3, 3, 5, 14, (x) => {
          const F = frontV(x); const S = sideV(x);
          const list = d === 'front' ? [prof(F), prof(rev(F)), prof(S), prof(x[0])] : d === 'side' ? [prof(S), prof(rev(S)), prof(F), prof(x.map((row) => row[2]))] : null;
          if (list) return new Set(list).size === 4 && list.every((v) => !/(^|,)0(,|$)/.test(v)) && readable(x);
          const T = [footV(x), footV(mirrorG(x)), footV(flipG(x)), turnFoot(footV(x))];
          return new Set(T).size === 4 && readable(x); // 무거운 보임 검사는 맨 뒤에
        }, 0.25);
        const F = frontV(g); const S = sideV(g);
        let list; let steps; let why;
        if (d === 'front') {
          list = [{ v: prof(F) }, { v: prof(rev(F)), tag: TAGS.mirrorView }, { v: prof(S), tag: TAGS.sideMix }, { v: prof(g[0]), tag: TAGS.nearOnly }];
          steps = [`왼쪽 기둥부터 가장 높은 층을 세요 — ${F.join(', ')}층`];
          why = { [TAGS.mirrorView]: '좌우가 바뀌었어요 — 앞에서 보면 왼쪽 기둥이 왼쪽에 그대로 있어요.', [TAGS.sideMix]: '그것은 옆에서 본 모양이에요.', [TAGS.nearOnly]: `앞 줄만 본 모양이에요 — 뒤 줄이 더 높으면 앞 줄 위로 보여요.` };
        } else if (d === 'side') {
          const R = g.map((row) => row[2]);
          list = [{ v: prof(S) }, { v: prof(rev(S)), tag: TAGS.mirrorView }, { v: prof(F), tag: TAGS.sideMix }, { v: prof(R), tag: TAGS.nearOnly }];
          steps = [`오른쪽 옆에서는 왼쪽이 앞 줄 — 줄마다 가장 높은 층 ${S.join(', ')}층`];
          why = { [TAGS.mirrorView]: '그것은 왼쪽 옆에서 본 모양이에요 — 오른쪽 옆에서 보면 앞 줄이 왼쪽이에요.', [TAGS.sideMix]: '그것은 앞에서 본 모양이에요.', [TAGS.nearOnly]: '오른쪽 끝 기둥들만 본 모양이에요 — 안쪽 기둥이 더 높으면 그 위로 보여요.' };
        } else {
          const turned = turnFoot(footV(g));
          list = [{ v: footV(g) }, { v: footV(mirrorG(g)), tag: TAGS.mirrorView }, { v: footV(flipG(g)), tag: TAGS.flipFB }, { v: turned, tag: TAGS.turnTop }];
          steps = ['위에서 내려다보면 바닥 칸이 보여요 — 앞 줄이 아래쪽', `뒤 줄부터 ${footV(g).split('/').map((row) => [...row].map((x) => (x === '1' ? '■' : '□')).join('')).join(' / ')}`];
          why = { [TAGS.mirrorView]: '좌우가 바뀌었어요.', [TAGS.flipFB]: '앞뒤가 바뀌었어요 — 위에서 본 모양은 앞 줄이 아래쪽이에요.', [TAGS.turnTop]: '돌려 놓은 모양이에요 — 앞 줄이 아래쪽에 오게 놓아요.' };
        }
        const P = placeCands(r, list);
        steps.push(`→ ${P.ans}`);
        // ✍️ 칸 칠하기 판(3단계): 후보 ㉠~㉣ 그림을 빼고 빈 칸에 칠한다 — 칠한 모양이 후보와 같으면 그 보기, 아니면 짐작한 답
        const fig = `views ${P.pairs.map(([k, v]) => `${k}=${v}`).join(' ')}`;
        const draw = { fig, mode: 'cells', kind: d === 'top' ? 'top' : 'side', target: list[0].v, cands: P.pairs.map(([k, v]) => ({ k, v })) };
        return { t: `쌓기나무로 쌓은 모양을 ${d === 'front' ? '앞에서' : d === 'side' ? '오른쪽 옆에서' : '위에서'} 본 모양은 어느 것일까요?\n\n${ST(g)}\n\n[${fig}]`, text: true, ans: P.ans, wr: P.wr, steps, why, probe: { ask: 'view', d }, draw };
      };
      fams.push(famOf([viewQ('front'), viewQ('side')]));
      fams.push(famOf([viewQ('top')]));
      return askFam(r, c, this, fams);
    },
    misread(r, c) {
      if (branchOf(r, c, ['sum', 'flip']) === 'sum') {
        const g = genStack(r, 3, 2, 3, 4, 10, (x) => x[0].every(Boolean) && prof(x[0]) !== prof(frontV(x)) && readable(x) && x[0].some((_, i) => x[0][i] && x[1][i]) && Math.max(...x[0].map((_, i) => x[0][i] + x[1][i])) <= 5);
        const F = frontV(g); const sum = g[0].map((_, i) => g[0][i] + g[1][i]);
        return misAsk(r, c, this, 'sum', {
          q: `쌓기나무로 쌓은 모양을 보고\n\n${ST(g)}\n\n${showWork(`앞에서 본 모양 — 기둥마다 쌓기나무를 모두 세어 왼쪽부터 ${sum.join(', ')}층`)}`,
          ok: `앞에서는 가장 높은 층만 보여요 — 왼쪽부터 ${F.join(', ')}층`,
          wr: [{ text: '맞게 말했어요', tag: RIGHT_AS_WRONG }, { text: `앞 줄만 세어야 해요 — 왼쪽부터 ${g[0].join(', ')}층`, tag: TAGS.nearOnly }, { text: '앞에서 본 모양은 위에서 본 모양과 같아요', tag: OFF }],
          steps: ['앞에서 보면 뒤 줄은 앞 줄에 가려지고, 더 높은 층만 위로 보여요', `왼쪽부터 가장 높은 층 ${F.join(', ')}층`],
          whyAny: '앞에서 보면 겹친 쌓기나무는 하나로 보여요 — 줄마다 가장 높은 층만 그려요.',
          probe: { ask: 'misSum' },
        });
      }
      const g = genStack(r, 3, 3, 2, 5, 12, (x) => readable(x) && footV(x) !== footV(flipG(x)), 0.3);
      return misAsk(r, c, this, 'flip', {
        q: `쌓기나무로 쌓은 모양을 보고\n\n${ST(g)}\n\n${showWork(`위에서 본 모양 — 뒤 줄부터 ${footV(flipG(g)).split('/').map((row) => [...row].map((x) => (x === '1' ? '■' : '□')).join('')).join(' / ')}`)}`,
        ok: `위에서 본 모양은 앞 줄이 아래쪽이에요 — 뒤 줄부터 ${footV(g).split('/').map((row) => [...row].map((x) => (x === '1' ? '■' : '□')).join('')).join(' / ')}`,
        wr: [{ text: '맞게 말했어요', tag: RIGHT_AS_WRONG }, { text: '위에서 본 모양은 좌우를 바꿔 그려요', tag: TAGS.mirrorView }, { text: '위에서 본 모양에는 높이도 그려요', tag: OFF }],
        steps: ['위에서 내려다볼 때 앞 줄은 아래쪽, 뒤 줄은 위쪽', `뒤 줄부터 ${footV(g).split('/').map((row) => [...row].map((x) => (x === '1' ? '■' : '□')).join('')).join(' / ')}`],
        whyAny: '앞뒤가 바뀌었어요. 위에서 본 모양은 앞 줄을 아래쪽에 그려요.',
        probe: { ask: 'misFlip' },
      });
    },
  },

  {
    id: 'spc.count1', grade: 6, name: '쌓기나무의 개수 (1)', needs: ['spc.view'],
    idea: '쌓은 모양만 보면 **뒤에 숨은 쌓기나무**가 있는지 알 수 없어요. **위에서 본 모양**을 함께 보면 기둥이 놓인 자리를 알 수 있어요 — 자리마다 몇 층인지 세어 모두 더해요.',
    rule: '위에서 본 모양으로 기둥 자리를 찾고, 자리마다 층 수를 더한다.',
    slip: '보이지 않는 쌓기나무까지 셌는지 봐요 — 기둥마다 몇 층인지.',
    calc(r, c) {
      const fams = [];
      const countQ = (W, D) => {
        const g = genStack(r, W, D, 3, 5, 14, (x) => topsVisible(x) && hiddenOf(x) >= 1 && allDiff(total(x), total(x) - hiddenOf(x), cellsOf(x), frontV(x).reduce((a, b) => a + b, 0)));
        const vis = total(g) - hiddenOf(g); const fs = frontV(g).reduce((a, b) => a + b, 0);
        return {
          t: `쌓기나무로 쌓은 모양과 위에서 본 모양이에요. 쌓기나무는 모두 몇 개일까요?\n\n${ST(g)}\n\n${VW([['위', footV(g)]])}`,
          ans: String(total(g)),
          wr: [{ text: String(vis), tag: TAGS.visibleOnly }, { text: String(cellsOf(g)), tag: TAGS.cellsOnly }, { text: String(fs), tag: TAGS.frontOnly }],
          steps: [`위에서 본 모양으로 기둥 자리 ${cellsOf(g)}곳`, `자리마다 층 수: ${rowsText(g)}`, `${sumText(g)} = ${total(g)}`],
          why: { [TAGS.visibleOnly]: `보이지 않는 쌓기나무가 ${hiddenOf(g)}개 더 있어요 — 위에서 본 모양으로 기둥 자리를 찾아요.`, [TAGS.cellsOnly]: '위에서 본 칸 수는 기둥 자리 수예요 — 기둥마다 층 수를 더해요.', [TAGS.frontOnly]: '앞에서 보이는 칸만 셌어요 — 뒤에 가려진 쌓기나무도 세요.' },
          probe: { ask: 'count' },
        };
      };
      fams.push(famOf([countQ(3, 2), countQ(3, 3), countQ(2, 3)]));
      const hiddenQ = (W, D) => {
        const g = genStack(r, W, D, 3, 6, 14, (x) => topsVisible(x) && hiddenOf(x) >= 2 && allDiff(hiddenOf(x), total(x), total(x) - hiddenOf(x)));
        const h = hiddenOf(g);
        return {
          t: `쌓기나무로 쌓은 모양과 위에서 본 모양이에요. 그림에서 보이지 않는 쌓기나무는 몇 개일까요?\n\n${ST(g)}\n\n${VW([['위', footV(g)]])}`,
          ans: String(h),
          wr: [{ text: String(total(g)), tag: TAGS.hiddenAll }, { text: String(total(g) - h), tag: TAGS.visibleOnly }],
          steps: [`기둥마다 층 수를 더하면 ${sumText(g)} = ${total(g)}개`, `그림에서 보이는 쌓기나무 ${total(g) - h}개 → ${total(g)} − ${total(g) - h} = ${h}`],
          why: { [TAGS.hiddenAll]: `${total(g)}개는 모두 센 수예요 — 그중 보이지 않는 것만.`, [TAGS.visibleOnly]: `${total(g) - h}개는 보이는 쌓기나무예요.` },
          probe: { ask: 'hidden' },
        };
      };
      fams.push(famOf([hiddenQ(3, 3), hiddenQ(3, 2)]));
      return calcAsk(r, c, this, runFamily(r, c, fams));
    },
    misread(r, c) {
      if (branchOf(r, c, ['visible', 'cells']) === 'visible') {
        const g = genStack(r, 3, 3, 3, 6, 14, (x) => topsVisible(x) && hiddenOf(x) >= 1);
        const vis = total(g) - hiddenOf(g);
        return misAsk(r, c, this, 'visible', {
          q: `쌓기나무로 쌓은 모양과 위에서 본 모양을 보고\n\n${ST(g)}\n\n${VW([['위', footV(g)]])}\n\n${showWork(`보이는 쌓기나무를 세었더니 모두 ${vis}개예요`)}`,
          ok: `보이지 않는 쌓기나무도 있어요 — 기둥마다 층 수를 더하면 ${total(g)}개`,
          wr: [{ text: '맞게 말했어요', tag: RIGHT_AS_WRONG }, { text: `위에서 본 칸 수만 세어야 해요 — ${cellsOf(g)}개`, tag: TAGS.cellsOnly }, { text: '쌓기나무의 개수는 그림으로 알 수 없어요', tag: OFF }],
          steps: [`위에서 본 모양으로 기둥 자리 ${cellsOf(g)}곳`, `${sumText(g)} = ${total(g)}`],
          whyAny: '뒤나 아래에 가려 보이지 않는 쌓기나무도 세야 해요.',
          probe: { ask: 'misVisible' },
        });
      }
      const g = genStack(r, 3, 2, 3, 5, 12, (x) => topsVisible(x) && maxH(x) >= 2);
      return misAsk(r, c, this, 'cells', {
        q: `쌓기나무로 쌓은 모양과 위에서 본 모양을 보고\n\n${ST(g)}\n\n${VW([['위', footV(g)]])}\n\n${showWork(`위에서 본 모양의 칸이 ${cellsOf(g)}개니까 쌓기나무도 ${cellsOf(g)}개예요`)}`,
        ok: `칸마다 몇 층인지 더해야 해요 — ${total(g)}개`,
        wr: [{ text: '맞게 말했어요', tag: RIGHT_AS_WRONG }, { text: `가장 높은 층만 세어야 해요 — ${maxH(g)}개`, tag: TAGS.wrongReason }, { text: '위에서 본 모양은 개수와 상관없어요', tag: OFF }],
        steps: [`위에서 본 칸 ${cellsOf(g)}개는 기둥 자리`, `자리마다 층 수 ${sumText(g)} = ${total(g)}`],
        whyAny: '위에서 본 칸 하나에 쌓기나무가 여러 층 쌓여 있을 수 있어요.',
        probe: { ask: 'misCells' },
      });
    },
  },

  {
    id: 'spc.count2', grade: 6, name: '쌓기나무의 개수 (2)', needs: ['spc.count1'],
    idea: '**위·앞·옆에서 본 모양**을 함께 보면 칸마다 몇 층인지 알아낼 수 있을 때가 많아요(세 모양이 같아도 여러 가지로 쌓을 수 있는 경우는 뒤에서 배워요). 위에서 본 모양으로 자리를, 앞에서 본 모양으로 왼쪽부터 기둥마다 가장 높은 층을, 옆에서 본 모양으로 앞 줄부터 줄마다 가장 높은 층을 맞춰 보아요.',
    rule: '위 모양으로 자리, 앞·옆 모양으로 층 — 세 모양에 모두 맞게.',
    slip: '세 모양에 모두 맞는지, 칸마다 몇 층인지 봐요.',
    calc(r, c) {
      const fams = [];
      const uniqQ = (W, D) => {
        const g = genStack(r, W, D, 3, 5, 13, (x) => {
          const F = frontV(x); const S = sideV(x); const fa = fitAll(topOf(x), F, S);
          const fs = F.reduce((a, b) => a + b, 0); const ss = S.reduce((a, b) => a + b, 0);
          return fa.n === 1 && allDiff(total(x), cellsOf(x), fs + ss + cellsOf(x), cellsOf(x) * maxH(x));
        });
        const F = frontV(g); const S = sideV(g); const fs = F.reduce((a, b) => a + b, 0); const ss = S.reduce((a, b) => a + b, 0);
        return {
          t: `쌓기나무로 쌓은 모양을 위, 앞, 옆에서 본 모양이에요. 쌓기나무는 모두 몇 개일까요?\n\n${VW([['위', footV(g)], ['앞', prof(F)], ['옆', prof(S)]])}`,
          ans: String(total(g)),
          wr: [{ text: String(cellsOf(g)), tag: TAGS.cellsOnly }, { text: String(fs + ss + cellsOf(g)), tag: TAGS.viewsSum }, { text: String(cellsOf(g) * maxH(g)), tag: TAGS.maxTimes }],
          steps: ['위에서 본 칸마다 앞(기둥)·옆(줄)에서 본 높이를 맞춰요', `칸마다 층 수: ${rowsText(g)}`, `${sumText(g)} = ${total(g)}`],
          why: { [TAGS.cellsOnly]: '위에서 본 칸 수는 자리 수예요 — 칸마다 몇 층인지 앞·옆 모양으로 알아내요.', [TAGS.viewsSum]: '본 모양의 칸을 더하면 같은 쌓기나무를 여러 번 세요.', [TAGS.maxTimes]: '모든 칸이 가장 높은 층은 아니에요 — 앞·옆 모양에서 낮은 곳을 찾아요.' },
          probe: { ask: 'uniq' },
        };
      };
      fams.push(famOf([uniqQ(3, 2), uniqQ(2, 3), uniqQ(3, 3)]));
      // 세 모양에 맞는 쌓은 모양 고르기 — 후보는 같은 크기(3 × 2)라 섞어도 열쇠가 같다
      const matchQ = () => {
        for (let t = 0; t < 200; t++) {
          const g = genStack(r, 3, 2, 3, 4, 11, (x) => readable(x));
          const F = frontV(g); const S = sideV(g); const T = footV(g);
          const wrongs = [];
          for (let k = 0; k < 60 && wrongs.length < 3; k++) {
            const h = g.map((row) => [...row]);
            const j = int(r, 0, 1); const i = int(r, 0, 2);
            h[j][i] = Math.max(0, Math.min(3, h[j][i] + pick(r, [-1, 1, 2])));
            if (!h.every((row) => row.some(Boolean)) || !h[0].every((_, x) => h.some((row) => row[x])) || !connected(h) || !readable(h)) continue;
            if (sameG(h, g) || wrongs.some((w) => sameG(w, h))) continue;
            const tag = footV(h) !== T ? TAGS.topWrong : prof(frontV(h)) !== prof(F) ? TAGS.frontWrong : prof(sideV(h)) !== prof(S) ? TAGS.sideWrong : null;
            if (!tag) continue; // 세 모양에 다 맞으면 이것도 정답이다
            wrongs.push(h); wrongs[wrongs.length - 1].tag = tag;
          }
          if (wrongs.length < 3) continue;
          const P = placeCands(r, [{ v: stackTok(g) }, ...wrongs.map((w) => ({ v: stackTok(w), tag: w.tag }))]);
          if (!P) continue;
          return {
            t: `위, 앞, 옆에서 본 모양이 다음과 같은 쌓은 모양은 어느 것일까요?\n\n${VW([['위', T], ['앞', prof(F)], ['옆', prof(S)]])}\n\n[stacks ${P.pairs.map(([k, v]) => `${k}=${v}`).join(' ')}]`,
            text: true, ans: P.ans, wr: P.wr,
            steps: [`위에서 본 자리 ${T.split('/').map((row) => [...row].map((x) => (x === '1' ? '■' : '□')).join('')).join(' / ')}`, `앞에서 왼쪽부터 ${F.join(', ')}층 · 옆에서 앞 줄부터 ${S.join(', ')}층 → ${P.ans}`],
            why: { [TAGS.topWrong]: '바닥 칸의 자리가 위에서 본 모양과 달라요.', [TAGS.frontWrong]: '앞에서 보면 기둥 높이가 달라요.', [TAGS.sideWrong]: '옆에서 보면 줄 높이가 달라요.' },
            probe: { ask: 'match' },
          };
        }
        throw new Error('matchQ: 후보를 못 만듦');
      };
      fams.push(famOf([matchQ()]));
      return calcAsk(r, c, this, runFamily(r, c, fams));
    },
    misread(r, c) {
      if (branchOf(r, c, ['sum', 'max']) === 'sum') {
        const g = genStack(r, 3, 2, 3, 5, 12, (x) => total(x) !== cellsOf(x) && fitAll(topOf(x), frontV(x), sideV(x)).n === 1); // 칸 수 ≠ 개수 — "위에서 본 칸만"이 우연히 맞지 않게 (Codex 34차 #1)
        const F = frontV(g); const S = sideV(g); const fs = F.reduce((a, b) => a + b, 0); const ss = S.reduce((a, b) => a + b, 0);
        return misAsk(r, c, this, 'sum', {
          q: `위, 앞, 옆에서 본 모양을 보고\n\n${VW([['위', footV(g)], ['앞', prof(F)], ['옆', prof(S)]])}\n\n${showWork(`세 모양의 칸을 더하면 ${cellsOf(g)} + ${fs} + ${ss} = ${cellsOf(g) + fs + ss}, 쌓기나무는 ${cellsOf(g) + fs + ss}개예요`)}`,
          ok: `칸마다 몇 층인지 찾아 더해야 해요 — ${total(g)}개`,
          wr: [{ text: '맞게 말했어요', tag: RIGHT_AS_WRONG }, { text: `위에서 본 칸만 세어야 해요 — ${cellsOf(g)}개`, tag: TAGS.cellsOnly }, { text: '세 모양으로는 개수를 알 수 없어요', tag: OFF }],
          steps: [`칸마다 층 수: ${rowsText(g)}`, `${sumText(g)} = ${total(g)}`],
          whyAny: '세 모양의 칸을 더하면 한 쌓기나무를 여러 번 세요.',
          probe: { ask: 'misViewsSum' },
        });
      }
      const g = genStack(r, 3, 2, 3, 5, 12, (x) => fitAll(topOf(x), frontV(x), sideV(x)).n === 1 && cellsOf(x) * maxH(x) !== total(x));
      const F = frontV(g); const S = sideV(g);
      return misAsk(r, c, this, 'max', {
        q: `위, 앞, 옆에서 본 모양을 보고\n\n${VW([['위', footV(g)], ['앞', prof(F)], ['옆', prof(S)]])}\n\n${showWork(`가장 높은 층이 ${maxH(g)}층이니까 ${cellsOf(g)} × ${maxH(g)} = ${cellsOf(g) * maxH(g)}개예요`)}`,
        ok: `칸마다 높이가 달라요 — 앞·옆 모양으로 칸마다 층을 찾으면 ${total(g)}개`,
        wr: [{ text: '맞게 말했어요', tag: RIGHT_AS_WRONG }, { text: `가장 낮은 층으로 모두 세어야 해요 — ${cellsOf(g)}개`, tag: TAGS.cellsOnly }, { text: '앞에서 본 모양만 보면 돼요', tag: OFF }],
        steps: [`칸마다 층 수: ${rowsText(g)}`, `${sumText(g)} = ${total(g)}`],
        whyAny: '모든 칸이 가장 높은 층은 아니에요. 앞·옆에서 본 모양으로 칸마다 층을 찾아요.',
        probe: { ask: 'misMax' },
      });
    },
  },

  {
    id: 'spc.topnum', grade: 6, name: '위에서 본 모양에 수 쓰기', needs: ['spc.count2'],
    idea: '위에서 본 모양의 칸에 **그 자리에 쌓은 쌓기나무 수**를 써서 나타낼 수 있어요. 수를 모두 더하면 쌓기나무의 개수, 앞에서 본 모양은 세로 줄마다 가장 큰 수, 옆에서 본 모양은 가로 줄마다 가장 큰 수예요.',
    rule: '수의 합 = 개수 · 앞 모양 = 세로 줄의 가장 큰 수 · 옆 모양 = 가로 줄의 가장 큰 수.',
    slip: '수를 모두 더했는지, 줄마다 가장 큰 수를 골랐는지 봐요.',
    calc(r, c) {
      const fams = [];
      const sumQ = (W, D) => {
        const g = genStack(r, W, D, 3, 5, 15, (x) => maxH(x) >= 2 && allDiff(total(x), cellsOf(x), cellsOf(x) * maxH(x), total(x) - x[0].reduce((a, b) => a + b, 0)), 0.15);
        const back = total(g) - g[0].reduce((a, b) => a + b, 0);
        return {
          t: `위에서 본 모양에 쌓은 쌓기나무의 수를 썼어요. 쌓기나무는 모두 몇 개일까요?\n\n${TOP(g)}`,
          ans: String(total(g)),
          wr: [{ text: String(cellsOf(g)), tag: TAGS.cellsOnly }, { text: String(cellsOf(g) * maxH(g)), tag: TAGS.maxTimes }, { text: String(back), tag: TAGS.skipFront }],
          steps: ['칸에 쓴 수는 그 자리의 층 수', `${sumText(g)} = ${total(g)}`],
          why: { [TAGS.cellsOnly]: '칸 수가 아니라 칸에 쓴 수를 더해요.', [TAGS.maxTimes]: '칸마다 쓴 수가 달라요 — 쓴 수 그대로 더해요.', [TAGS.skipFront]: '앞 줄을 빼고 더했어요 — 아래쪽 줄이 앞 줄이에요.' },
          probe: { ask: 'sum' },
        };
      };
      fams.push(famOf([sumQ(3, 2), sumQ(3, 3), sumQ(2, 3)]));
      const viewQ = (d) => {
        const g = genStack(r, 3, 3, 3, 6, 15, (x) => {
          const F = frontV(x); const S = sideV(x);
          const colSum = x[0].map((_, i) => x.reduce((a, row) => a + row[i], 0)); const rowSum = x.map((row) => row.reduce((a, b) => a + b, 0));
          const list = d === 'front' ? [prof(F), prof(rev(F)), prof(S), prof(colSum)] : [prof(S), prof(rev(S)), prof(F), prof(rowSum)];
          return new Set(list).size === 4 && Math.max(...(d === 'front' ? colSum : rowSum)) <= 4;
        }, 0.3);
        const F = frontV(g); const S = sideV(g);
        const colSum = g[0].map((_, i) => g.reduce((a, row) => a + row[i], 0)); const rowSum = g.map((row) => row.reduce((a, b) => a + b, 0));
        const list = d === 'front'
          ? [{ v: prof(F) }, { v: prof(rev(F)), tag: TAGS.mirrorView }, { v: prof(S), tag: TAGS.sideMix }, { v: prof(colSum), tag: TAGS.sumView }]
          : [{ v: prof(S) }, { v: prof(rev(S)), tag: TAGS.mirrorView }, { v: prof(F), tag: TAGS.sideMix }, { v: prof(rowSum), tag: TAGS.sumView }];
        const P = placeCands(r, list);
        // ✍️ 칸 칠하기 판(S2와 같은 판) — "줄의 수를 더함" 후보가 4층까지라 판은 늘 4층(rows): 후보에 4가 있을 때만 4층이면 문항마다 판 높이가 갈린다
        const fig = VW(P.pairs).slice(1, -1);
        const draw = { fig, mode: 'cells', kind: 'side', rows: 4, target: list[0].v, cands: P.pairs.map(([k, v]) => ({ k, v })) };
        // 풀이 카드는 판에서 칠한 말("왼쪽부터 2, 3, 1층")까지 — 옆은 "앞 줄이 왼쪽"을 한 줄 더
        const seenLine = d === 'front' ? `앞에서 보면 왼쪽부터 ${F.join(', ')}층` : `오른쪽 옆에서는 앞 줄이 왼쪽 — 왼쪽부터 ${S.join(', ')}층`;
        return {
          t: `위에서 본 모양에 쌓은 쌓기나무의 수를 썼어요. ${d === 'front' ? '앞에서' : '오른쪽 옆에서'} 본 모양은 어느 것일까요?\n\n${TOP(g)}\n\n[${fig}]`,
          text: true, ans: P.ans, wr: P.wr,
          steps: [d === 'front' ? `세로 줄마다 가장 큰 수 — 왼쪽부터 ${F.join(', ')}` : `가로 줄마다 가장 큰 수 — 앞 줄(아래쪽)부터 ${S.join(', ')}`, seenLine, `→ ${P.ans}`],
          why: { [TAGS.mirrorView]: '좌우가 바뀌었어요.', [TAGS.sideMix]: `그것은 ${d === 'front' ? '옆' : '앞'}에서 본 모양이에요.`, [TAGS.sumView]: '줄의 수를 더하지 않고 가장 큰 수만 — 겹친 쌓기나무는 하나로 보여요.' },
          probe: { ask: 'topView', d },
          draw,
        };
      };
      fams.push(famOf([viewQ('front'), viewQ('side')]));
      const stackQ = () => {
        let g = null; let off = null;
        for (let t = 0; t < 200 && !off; t++) {
          g = genStack(r, 3, 2, 3, 5, 12, (x) => readable(x) && readable(mirrorG(x)) && readable(flipG(x)) && !sameG(x, mirrorG(x)) && !sameG(x, flipG(x)) && !sameG(mirrorG(x), flipG(x)));
          for (let k = 0; k < 40 && !off; k++) {
            const h = g.map((row) => [...row]); const j = int(r, 0, 1); const i = int(r, 0, 2);
            if (!h[j][i]) continue;
            h[j][i] = h[j][i] === 1 ? 2 : h[j][i] - 1;
            if (readable(h) && ![g, mirrorG(g), flipG(g)].some((x) => sameG(x, h))) off = h;
          }
        }
        if (!off) throw new Error('stackQ: 수를 잘못 옮긴 후보를 못 만듦');
        const P = placeCands(r, [{ v: stackTok(g) }, { v: stackTok(mirrorG(g)), tag: TAGS.mirrorStack }, { v: stackTok(flipG(g)), tag: TAGS.flipStack }, { v: stackTok(off), tag: TAGS.heightOff }]);
        return {
          t: `위에서 본 모양에 쌓은 쌓기나무의 수를 썼어요. 쌓은 모양은 어느 것일까요?\n\n${TOP(g)}\n\n[stacks ${P.pairs.map(([k, v]) => `${k}=${v}`).join(' ')}]`,
          text: true, ans: P.ans, wr: P.wr,
          steps: ['아래쪽 줄이 앞 줄 — 왼쪽부터 칸마다 쓴 수만큼', `${rowsText(g)} → ${P.ans}`],
          why: { [TAGS.mirrorStack]: '좌우가 바뀌었어요.', [TAGS.flipStack]: '앞뒤가 바뀌었어요 — 위에서 본 모양의 아래쪽 줄이 앞 줄이에요.', [TAGS.heightOff]: '한 자리의 층 수가 쓴 수와 달라요.' },
          probe: { ask: 'stack' },
        };
      };
      fams.push(famOf([stackQ()]));
      return askFam(r, c, this, fams);
    },
    misread(r, c) {
      if (branchOf(r, c, ['sumview', 'cells']) === 'sumview') {
        const g = genStack(r, 3, 2, 3, 4, 10, (x) => x[0].every(Boolean) && prof(x[0]) !== prof(frontV(x)) && x[0].some((_, i) => x[0][i] && x[1][i]) && Math.max(...x[0].map((_, i) => x[0][i] + x[1][i])) <= 5, 0.15);
        const F = frontV(g); const colSum = g[0].map((_, i) => g[0][i] + g[1][i]);
        return misAsk(r, c, this, 'sumview', {
          q: `위에서 본 모양에 수를 쓴 그림을 보고\n\n${TOP(g)}\n\n${showWork(`앞에서 본 모양 — 세로 줄의 수를 더해 왼쪽부터 ${colSum.join(', ')}층`)}`,
          ok: `세로 줄마다 가장 큰 수만 — 왼쪽부터 ${F.join(', ')}층`,
          wr: [{ text: '맞게 말했어요', tag: RIGHT_AS_WRONG }, { text: `앞 줄의 수만 보면 돼요 — 왼쪽부터 ${g[0].join(', ')}층`, tag: TAGS.nearOnly }, { text: '수를 쓴 그림으로는 앞에서 본 모양을 알 수 없어요', tag: OFF }],
          steps: ['앞에서 보면 뒤 줄은 앞 줄에 가려 더 높은 층만 보여요', `세로 줄마다 가장 큰 수 ${F.join(', ')}`],
          whyAny: '앞에서 보면 겹친 쌓기나무는 하나로 보여요 — 세로 줄마다 가장 큰 수예요.',
          probe: { ask: 'misSumView' },
        });
      }
      const g = genStack(r, 3, 2, 3, 5, 12, (x) => maxH(x) >= 2 && cellsOf(x) !== total(x), 0.15);
      return misAsk(r, c, this, 'cells', {
        q: `위에서 본 모양에 수를 쓴 그림을 보고\n\n${TOP(g)}\n\n${showWork(`수가 쓰인 칸이 ${cellsOf(g)}개니까 쌓기나무는 ${cellsOf(g)}개예요`)}`,
        ok: `칸에 쓴 수를 모두 더해야 해요 — ${sumText(g)} = ${total(g)}`,
        wr: [{ text: '맞게 말했어요', tag: RIGHT_AS_WRONG }, { text: `가장 큰 수만 더해야 해요 — ${maxH(g)}개`, tag: TAGS.wrongReason }, { text: '수를 쓴 그림으로는 개수를 알 수 없어요', tag: OFF }],
        steps: ['칸에 쓴 수 = 그 자리의 층 수', `${sumText(g)} = ${total(g)}`],
        whyAny: '칸 수가 아니라 칸에 쓴 수를 더해요.',
        probe: { ask: 'misTopCells' },
      });
    },
  },

  {
    id: 'spc.layer', grade: 6, name: '층별로 나타내기', needs: ['spc.topnum'],
    idea: '쌓은 모양을 **1층, 2층, 3층**으로 나누어 층마다 위에서 본 모양으로 나타낼 수 있어요. 1층 모양은 위에서 본 모양과 같고, 위층의 칸은 늘 아래층 칸 위에 있어요. 층마다 칸 수를 더하면 쌓기나무의 개수예요.',
    rule: '층마다 칸 수를 더한다 · 1층 모양 = 위에서 본 모양.',
    slip: '모든 층을 셌는지, 그 층에 있는 칸만 셌는지 봐요.',
    calc(r, c) {
      const fams = [];
      const sumQ = (W, D) => {
        const g = genStack(r, W, D, 3, 6, 15, (x) => maxH(x) === 3 && allDiff(total(x), cellsOf(x), cellsOf(x) * 3, total(x) - cellsOf(x)), 0.15);
        const L = [1, 2, 3].map((k) => g.flat().filter((h) => h >= k).length);
        return {
          t: `쌓기나무로 쌓은 모양을 층별로 나타냈어요. 쌓기나무는 모두 몇 개일까요?\n\n${LAY(g)}`,
          ans: String(total(g)),
          wr: [{ text: String(cellsOf(g)), tag: TAGS.firstOnly }, { text: String(cellsOf(g) * 3), tag: TAGS.sameLayers }, { text: String(total(g) - cellsOf(g)), tag: TAGS.aboveAll }],
          steps: [`1층 ${L[0]}개 · 2층 ${L[1]}개 · 3층 ${L[2]}개`, `${L.join(' + ')} = ${total(g)}`],
          why: { [TAGS.firstOnly]: '1층만 셌어요 — 2층, 3층도 더해요.', [TAGS.sameLayers]: '층마다 칸 수가 달라요 — 그림에서 층마다 세어요.', [TAGS.aboveAll]: '1층을 빼고 셌어요.' },
          probe: { ask: 'layerSum' },
        };
      };
      fams.push(famOf([sumQ(3, 2), sumQ(3, 3), sumQ(2, 3)]));
      const floorQ = (W, D) => {
        const g = genStack(r, W, D, 3, 6, 14, (x) => {
          const at2 = x.flat().filter((h) => h >= 2).length; const ex2 = x.flat().filter((h) => h === 2).length; const ab = x.flat().reduce((a, h) => a + Math.max(0, h - 1), 0);
          return topsVisible(x) && allDiff(at2, ex2, ab, cellsOf(x));
        }, 0.15);
        const at2 = g.flat().filter((h) => h >= 2).length; const ex2 = g.flat().filter((h) => h === 2).length; const ab = g.flat().reduce((a, h) => a + Math.max(0, h - 1), 0);
        return {
          t: `쌓기나무로 쌓은 모양과 위에서 본 모양이에요. 2층에 있는 쌓기나무는 몇 개일까요?\n\n${ST(g)}\n\n${VW([['위', footV(g)]])}`,
          ans: String(at2),
          wr: [{ text: String(ex2), tag: TAGS.onlyTop }, { text: String(ab), tag: TAGS.aboveAll }, { text: String(cellsOf(g)), tag: TAGS.firstOnly }],
          steps: [`기둥마다 층 수: ${rowsText(g)}`, `2층 이상인 기둥 ${at2}곳 → 2층에 ${at2}개`],
          why: { [TAGS.onlyTop]: '3층까지 쌓은 기둥에도 2층이 있어요.', [TAGS.aboveAll]: '3층에 있는 것까지 셌어요 — 2층에 있는 것만.', [TAGS.firstOnly]: '그것은 1층의 개수예요.' },
          probe: { ask: 'floor2' },
        };
      };
      fams.push(famOf([floorQ(3, 2), floorQ(3, 3)]));
      return calcAsk(r, c, this, runFamily(r, c, fams));
    },
    misread(r, c) {
      if (branchOf(r, c, ['first', 'top']) === 'first') {
        const g = genStack(r, 3, 3, 3, 6, 14, (x) => maxH(x) >= 2, 0.2);
        return misAsk(r, c, this, 'first', {
          q: `층별로 나타낸 모양을 보고\n\n${LAY(g)}\n\n${showWork(`1층 모양의 칸이 ${cellsOf(g)}개니까 쌓기나무는 ${cellsOf(g)}개예요`)}`,
          ok: `층마다 칸 수를 모두 더해야 해요 — ${total(g)}개`,
          wr: [{ text: '맞게 말했어요', tag: RIGHT_AS_WRONG }, { text: `맨 위층의 칸만 세어야 해요 — ${g.flat().filter((h) => h >= maxH(g)).length}개`, tag: TAGS.wrongReason }, { text: '층별 모양으로는 개수를 알 수 없어요', tag: OFF }],
          steps: [[1, 2, 3].filter((k) => k <= maxH(g)).map((k) => `${k}층 ${g.flat().filter((h) => h >= k).length}개`).join(' · '), `모두 더하면 ${total(g)}`],
          whyAny: '1층만 셌어요. 2층 위로 쌓인 쌓기나무도 더해요.',
          probe: { ask: 'misFirst' },
        });
      }
      const g = genStack(r, 3, 2, 3, 5, 12, (x) => topsVisible(x) && x.flat().includes(3) && x.flat().includes(2), 0.15);
      const at2 = g.flat().filter((h) => h >= 2).length; const ex2 = g.flat().filter((h) => h === 2).length;
      return misAsk(r, c, this, 'top', {
        q: `쌓은 모양과 위에서 본 모양을 보고\n\n${ST(g)}\n\n${VW([['위', footV(g)]])}\n\n${showWork(`2층에 있는 쌓기나무는 꼭대기가 2층인 기둥 ${ex2}개예요`)}`,
        ok: `3층까지 쌓은 기둥에도 2층이 있어요 — 2층 이상인 기둥 ${at2}곳, ${at2}개`,
        wr: [{ text: '맞게 말했어요', tag: RIGHT_AS_WRONG }, { text: `1층을 빼고 모두 세어야 해요 — ${total(g) - cellsOf(g)}개`, tag: TAGS.aboveAll }, { text: '2층은 그림에서 보이지 않아요', tag: OFF }],
        steps: [`기둥마다 층 수: ${rowsText(g)}`, `2층 이상인 기둥 ${at2}곳 → ${at2}개`],
        whyAny: '3층 기둥의 2층도 2층에 있는 쌓기나무예요.',
        probe: { ask: 'misOnlyTop' },
      });
    },
  },

  {
    id: 'spc.make', grade: 6, name: '조건에 따라 모양 만들기', needs: ['spc.layer'],
    idea: '쌓기나무 2개로는 1가지, 3개로는 2가지 모양을 만들 수 있어요. **돌리거나 뒤집었을 때 모양이 같으면 같은 모양**으로 생각해요. 거울에 비친 것처럼 마주 보는 두 모양도 돌리거나 뒤집어 보고, 겹쳐지면 같은 모양, 끝까지 겹쳐지지 않으면 다른 모양이에요.',
    rule: '돌리거나 뒤집어서 겹쳐지면 같은 모양.',
    slip: '머릿속으로 돌려 보고, 쌓기나무가 몇 개씩 어떻게 붙어 있는지 봐요.',
    calc(r, c) {
      const fams = [];
      const sameQ = () => {
        const A = pick(r, TETRA.filter((t) => t.gs.length >= 2));
        const [given, ok] = shuffle(r, A.gs).slice(0, 2);
        const others = shuffle(r, TETRA.filter((t) => t.key !== A.key));
        const mir = others.find((t) => t.key === A.mirror);
        const pickD = mir ? [mir, ...others.filter((t) => t !== mir)] : others;
        const list = [{ v: stackTok(ok) }, ...pickD.slice(0, 3).map((t) => ({ v: stackTok(pick(r, t.gs)), tag: t === mir ? TAGS.mirrorSame : TAGS.diffShape }))];
        const P = placeCands(r, list);
        return {
          t: `쌓기나무 4개로 만든 모양이에요. 돌리거나 뒤집었을 때 이 모양과 같은 모양은 어느 것일까요?\n\n[stack ${stackText(given)} free]\n\n[stacks ${P.pairs.map(([k, v]) => `${k}=${v}`).join(' ')} free]`,
          text: true, ans: P.ans, wr: P.wr,
          steps: ['쌓기나무가 몇 개씩 어떻게 붙어 있는지 봐요 — 한 줄에 몇 개, 위에 몇 개', `돌려 보면 ${P.ans}과 겹쳐져요`],
          why: { [TAGS.diffShape]: '돌리거나 뒤집어도 겹쳐지지 않아요 — 붙어 있는 모양이 달라요.', [TAGS.mirrorSame]: '주어진 모양이 거울에 비친 모양인데, 돌리거나 뒤집어도 겹쳐지지 않아요 — 다른 모양이에요.' },
          probe: { ask: 'same' },
        };
      };
      fams.push(famOf([sameQ()]));
      const diffQ = () => {
        const A = pick(r, TETRA.filter((t) => t.gs.length >= 3));
        const three = shuffle(r, A.gs).slice(0, 3);
        const B = pick(r, TETRA.filter((t) => t.key !== A.key));
        const P = placeCands(r, [{ v: stackTok(pick(r, B.gs)) }, ...three.map((g) => ({ v: stackTok(g), tag: TAGS.rotDiff }))]);
        return {
          t: `쌓기나무 4개로 만든 모양들이에요. 돌리거나 뒤집었을 때 나머지와 다른 모양은 어느 것일까요?\n\n[stacks ${P.pairs.map(([k, v]) => `${k}=${v}`).join(' ')} free]`,
          text: true, ans: P.ans, wr: P.wr,
          steps: ['셋은 돌리거나 뒤집으면 서로 겹쳐져요', `겹쳐지지 않는 하나 → ${P.ans}`],
          why: { [TAGS.rotDiff]: '그 모양은 돌리면 다른 둘과 겹쳐져요 — 놓인 방향만 달라요.' },
          probe: { ask: 'diff' },
        };
      };
      fams.push(famOf([diffQ()]));
      return calcAsk(r, c, this, runFamily(r, c, fams));
    },
    misread(r, c) {
      if (branchOf(r, c, ['rot', 'mirror']) === 'rot') {
        const A = pick(r, TETRA.filter((t) => t.gs.length >= 2));
        const [g1, g2] = shuffle(r, A.gs).slice(0, 2);
        return misAsk(r, c, this, 'rot', {
          q: `쌓기나무 4개로 만든 두 모양 ㉠, ㉡을 보고\n\n[stacks ㉠=${stackTok(g1)} ㉡=${stackTok(g2)} free]\n\n${showWork('㉠과 ㉡은 놓인 모양이 달라서 다른 모양이에요')}`,
          ok: '돌리거나 뒤집으면 ㉠과 ㉡이 겹쳐져요 — 같은 모양이에요',
          wr: [{ text: '맞게 말했어요', tag: RIGHT_AS_WRONG }, { text: '쌓기나무 수가 달라서 다른 모양이에요', tag: TAGS.wrongReason }, { text: '쌓기나무 모양은 돌릴 수 없어요', tag: OFF }],
          steps: ['㉠을 돌리거나 뒤집어 ㉡처럼 놓아 봐요', '겹쳐지니까 같은 모양'],
          whyAny: '놓인 방향만 다를 뿐, 돌리면 겹쳐지는 같은 모양이에요.',
          probe: { ask: 'misRot' },
        });
      }
      const A = pick(r, TETRA.filter((t) => t.mirror !== t.key));
      const M = TETRA.find((t) => t.key === A.mirror);
      return misAsk(r, c, this, 'mirror', {
        q: `쌓기나무 4개로 만든 두 모양 ㉠, ㉡을 보고\n\n[stacks ㉠=${stackTok(pick(r, A.gs))} ㉡=${stackTok(pick(r, M.gs))} free]\n\n${showWork('㉠과 ㉡은 거울에 비친 것처럼 마주 보니까 같은 모양이에요')}`,
        ok: '㉠을 아무리 돌리거나 뒤집어도 ㉡과 꼭 맞게 겹쳐지지 않아요 — 다른 모양이에요',
        wr: [{ text: '맞게 말했어요', tag: RIGHT_AS_WRONG }, { text: '쌓기나무 수가 달라서 다른 모양이에요', tag: TAGS.wrongReason }, { text: '쌓기나무 모양은 돌릴 수 없어요', tag: OFF }],
        steps: ['㉠을 이리저리 돌려 ㉡에 맞춰 봐요', '어떻게 돌려도 하나는 반대쪽에 붙어 겹쳐지지 않아요 → 다른 모양'],
        whyAny: '거울에 비친 것처럼 보여도 겹쳐지는지 직접 돌리고 뒤집어 봐야 해요 — 이 두 모양은 끝까지 겹쳐지지 않아요.',
        probe: { ask: 'misMirror' },
      });
    },
  },

  {
    id: 'spc.minmax', grade: 6, name: '위·앞·옆 모양에 맞게 쌓기', needs: ['spc.make'],
    idea: '위·앞·옆에서 본 모양이 같아도 쌓은 모양이 여러 가지일 수 있어요. **가장 많이** 쌓을 때는 칸마다 앞·옆 높이 중 낮은 쪽까지, **가장 적게** 쌓을 때는 앞·옆에서 본 높이가 나오는 데 꼭 필요한 곳만 높이고 나머지 칸은 1개씩 놓아요.',
    rule: '가장 많이: 칸마다 앞·옆 높이 중 낮은 쪽 · 가장 적게: 필요한 곳만 높이고 나머지는 1개.',
    slip: '가장 적을 때인지 많을 때인지, 세 모양에 모두 맞는지 봐요.',
    calc(r, c) {
      const fams = [];
      const mmQ = (want, W, D) => {
        const g = genStack(r, W, D, 3, 5, 14, (x) => {
          const fa = fitAll(topOf(x), frontV(x), sideV(x));
          return fa.min < fa.max && allDiff(fa.min, fa.max, cellsOf(x), want === 'max' ? cellsOf(x) * maxH(x) : cellsOf(x) + frontV(x).reduce((a, b) => a + b, 0) + sideV(x).reduce((a, b) => a + b, 0));
        });
        const F = frontV(g); const S = sideV(g); const fa = fitAll(topOf(g), F, S);
        const T = topOf(g);
        const maxG = T.map((row, j) => row.map((v, i) => (v ? Math.min(F[i], S[j]) : 0)));
        const ans = want === 'min' ? fa.min : fa.max;
        const third = want === 'max' ? { text: String(cellsOf(g) * maxH(g)), tag: TAGS.maxTimes } : { text: String(cellsOf(g) + F.reduce((a, b) => a + b, 0) + S.reduce((a, b) => a + b, 0)), tag: TAGS.viewsSum };
        return {
          t: `쌓기나무로 쌓은 모양을 위, 앞, 옆에서 본 모양이에요. 쌓기나무를 ${want === 'min' ? '가장 적게' : '가장 많이'} 사용할 때 몇 개일까요?\n\n${VW([['위', footV(g)], ['앞', prof(F)], ['옆', prof(S)]])}`,
          ans: String(ans),
          wr: [{ text: String(want === 'min' ? fa.max : fa.min), tag: want === 'min' ? TAGS.maxForMin : TAGS.minForMax }, { text: String(cellsOf(g)), tag: TAGS.cellsOnly }, third],
          steps: want === 'max'
            ? ['칸마다 앞(기둥)·옆(줄) 높이 중 낮은 쪽까지 쌓아요', `칸마다 ${rowsText(maxG)}`, `${sumText(maxG)} = ${fa.max}`]
            : ['칸마다 1개씩 놓고, 앞·옆 높이가 나와야 하는 곳만 높여요', `가장 적은 예: ${rowsText(fa.minG)}`, `${sumText(fa.minG)} = ${fa.min}`],
          why: { [TAGS.maxForMin]: `${fa.max}개는 가장 많을 때예요.`, [TAGS.minForMax]: `${fa.min}개는 가장 적을 때예요.`, [TAGS.cellsOnly]: '칸마다 1개씩이면 앞·옆에서 본 높이가 안 나와요.', [TAGS.maxTimes]: '모든 칸을 가장 높은 층까지 쌓으면 앞·옆 모양이 달라져요.', [TAGS.viewsSum]: '본 모양의 칸을 더하면 같은 쌓기나무를 두 번 세요.' },
          probe: { ask: 'mm', want },
        };
      };
      fams.push(famOf([mmQ('min', 3, 2), mmQ('min', 3, 3)]));
      fams.push(famOf([mmQ('max', 3, 2), mmQ('max', 3, 3)]));
      return calcAsk(r, c, this, runFamily(r, c, fams));
    },
    misread(r, c) {
      const g = genStack(r, 3, 2, 3, 5, 12, (x) => { const fa = fitAll(topOf(x), frontV(x), sideV(x)); return fa.min < fa.max && fa.min > cellsOf(x); });
      const F = frontV(g); const S = sideV(g); const fa = fitAll(topOf(g), F, S);
      if (branchOf(r, c, ['swap', 'ones']) === 'swap') {
        return misAsk(r, c, this, 'swap', {
          q: `위, 앞, 옆에서 본 모양을 보고 쌓기나무를 가장 적게 사용하려고 해요.\n\n${VW([['위', footV(g)], ['앞', prof(F)], ['옆', prof(S)]])}\n\n${showWork(`칸마다 앞·옆 높이 중 낮은 쪽까지 쌓으면 ${fa.max}개 — 가장 적게 쓰면 ${fa.max}개예요`)}`,
          ok: `그것은 가장 많을 때예요 — 필요한 곳만 높이면 ${fa.min}개`,
          wr: [{ text: '맞게 말했어요', tag: RIGHT_AS_WRONG }, { text: `칸마다 1개씩이면 돼요 — ${cellsOf(g)}개`, tag: TAGS.cellsOnly }, { text: '가장 적은 수는 알 수 없어요', tag: OFF }],
          steps: [`가장 많을 때: ${fa.max}개`, `가장 적은 예: ${rowsText(fa.minG)} → ${fa.min}개`],
          whyAny: '낮은 쪽까지 다 채우는 것은 가장 많이 쓸 때예요. 가장 적게 쓰려면 필요한 곳만 높여요.',
          probe: { ask: 'misSwap' },
        });
      }
      return misAsk(r, c, this, 'ones', {
        q: `위, 앞, 옆에서 본 모양을 보고 쌓기나무를 가장 적게 사용하려고 해요.\n\n${VW([['위', footV(g)], ['앞', prof(F)], ['옆', prof(S)]])}\n\n${showWork(`위에서 본 칸마다 1개씩 놓으면 되니까 ${cellsOf(g)}개예요`)}`,
        ok: `1개씩이면 앞·옆에서 본 높이가 안 나와요 — 필요한 곳을 높이면 ${fa.min}개`,
        wr: [{ text: '맞게 말했어요', tag: RIGHT_AS_WRONG }, { text: `모든 칸을 가장 높게 쌓아야 해요 — ${cellsOf(g) * maxH(g)}개`, tag: TAGS.maxTimes }, { text: '위에서 본 모양은 필요 없어요', tag: OFF }],
        steps: [`앞에서 왼쪽부터 ${F.join(', ')}층, 옆에서 앞 줄부터 ${S.join(', ')}층이 보여야 해요`, `가장 적은 예: ${rowsText(fa.minG)} → ${fa.min}개`],
        whyAny: '칸마다 1개씩이면 모두 1층으로 보여요. 앞·옆 모양의 높이가 나오게 몇 곳은 높여야 해요.',
        probe: { ask: 'misOnes' },
      });
    },
  },

  {
    id: 'spc.apply', grade: 6, name: '⭐ 쌓기나무 활용', needs: ['spc.minmax'],
    idea: '쌓기나무로 **정육면체**를 만들려면 가로·세로·높이의 개수가 모두 같아야 해요(2 × 2 × 2 = 8개, 3 × 3 × 3 = 27개). 쌓은 모양의 바깥 면은 위·앞·뒤·왼쪽·오른쪽에서 보이는 면을 세요 — 사이가 움푹 들어간 곳이 없으면 그쪽에서 본 모양의 칸 수와 같아요.',
    rule: '정육면체는 한 모서리 개수를 세 번 곱한다 · 바깥 면은 보이는 쪽마다 센다.',
    slip: '무엇을 묻는지(더 필요한 수·남은 수·면의 수) 먼저 봐요.',
    calc(r, c) {
      const fams = [];
      const cubeQ = (n) => {
        const g = genStack(r, n, n, n, n === 2 ? 3 : 7, n === 2 ? 6 : 15, (x) => maxH(x) === n && allDiff(n ** 3 - total(x), n ** 3, n * n - cellsOf(x), total(x)), n === 2 ? 0.15 : 0.2);
        return {
          t: `위에서 본 모양에 쌓은 쌓기나무의 수를 썼어요. 쌓기나무를 더 쌓아서 가장 작은 정육면체를 만들려면 쌓기나무가 적어도 몇 개 더 필요할까요?\n\n${TOP(g)}`,
          ans: String(n ** 3 - total(g)),
          wr: [{ text: String(n ** 3), tag: TAGS.cubeAll }, { text: String(n * n - cellsOf(g)), tag: TAGS.floorOnly }, { text: String(total(g)), tag: TAGS.countOnly }],
          steps: [`가장 높은 곳이 ${n}층이고 바닥이 ${n} × ${n} — 가장 작은 정육면체는 ${n} × ${n} × ${n} = ${n ** 3}개`, `지금 ${sumText(g)} = ${total(g)}개`, `${n ** 3} − ${total(g)} = ${n ** 3 - total(g)}`],
          why: { [TAGS.cubeAll]: `${n ** 3}개는 정육면체 전체예요 — 이미 쌓은 것을 빼요.`, [TAGS.floorOnly]: '1층의 빈 칸만 채웠어요 — 위층도 채워요.', [TAGS.countOnly]: '지금 쌓은 수예요 — 더 필요한 수를 물었어요.' },
          probe: { ask: 'cube', n },
        };
      };
      fams.push(famOf([cubeQ(2), cubeQ(3)]));
      const paintQ = (W, D) => {
        const g = genStack(r, W, D, 3, 4, 12, (x) => {
          const fs = frontV(x).reduce((a, b) => a + b, 0); const ss = sideV(x).reduce((a, b) => a + b, 0);
          const p = paintOf(x);
          return p === 2 * fs + 2 * ss + cellsOf(x) && allDiff(p, p + cellsOf(x), 6 * total(x), fs + ss + cellsOf(x));
        }, 0.15);
        const fs = frontV(g).reduce((a, b) => a + b, 0); const ss = sideV(g).reduce((a, b) => a + b, 0); const p = paintOf(g);
        return {
          t: `위에서 본 모양에 쌓은 쌓기나무의 수를 썼어요. 쌓은 모양의 바깥쪽 면에 바닥에 닿은 면만 빼고 모두 색칠하면, 색칠한 쌓기나무 면은 모두 몇 개일까요?\n\n${TOP(g)}`,
          ans: String(p),
          wr: [{ text: String(p + cellsOf(g)), tag: TAGS.withBottom }, { text: String(6 * total(g)), tag: TAGS.allFaces }, { text: String(fs + ss + cellsOf(g)), tag: TAGS.viewOnce }],
          steps: [`앞·뒤에서 보이는 면 ${fs}개씩 · 왼쪽·오른쪽 옆에서 ${ss}개씩 · 위에서 ${cellsOf(g)}개`, `${fs} × 2 + ${ss} × 2 + ${cellsOf(g)} = ${p}`],
          why: { [TAGS.withBottom]: '바닥에 닿은 면은 빼요.', [TAGS.allFaces]: '서로 맞닿은 면과 바닥 면은 칠할 수 없어요.', [TAGS.viewOnce]: '뒤와 왼쪽에서 보이는 면도 있어요 — 앞·옆은 두 번씩.' },
          probe: { ask: 'paint' },
        };
      };
      fams.push(famOf([paintQ(2, 2), paintQ(3, 2)]));
      return calcAsk(r, c, this, runFamily(r, c, fams));
    },
    misread(r, c) {
      if (branchOf(r, c, ['cube', 'paint']) === 'cube') {
        const g = genStack(r, 2, 2, 2, 3, 6, (x) => maxH(x) === 2 && total(x) < 8 && cellsOf(x) < 4, 0.15); // 1층에 빈 칸이 있어야 "1층 빈 칸만" 오답이 선다 (Codex 34차 #2)
        return misAsk(r, c, this, 'cube', {
          q: `위에서 본 모양에 수를 쓴 그림을 보고, 더 쌓아서 가장 작은 정육면체를 만들려고 해요.\n\n${TOP(g)}\n\n${showWork('정육면체는 2 × 2 × 2 = 8개니까 8개가 더 필요해요')}`,
          ok: `이미 쌓은 ${total(g)}개를 빼야 해요 — 8 − ${total(g)} = ${8 - total(g)}개`,
          wr: [{ text: '맞게 말했어요', tag: RIGHT_AS_WRONG }, { text: `1층의 빈 칸만 채우면 돼요 — ${4 - cellsOf(g)}개`, tag: TAGS.floorOnly }, { text: '정육면체는 쌓기나무로 만들 수 없어요', tag: OFF }],
          steps: ['가장 작은 정육면체: 2 × 2 × 2 = 8개', `지금 ${sumText(g)} = ${total(g)}개 → 8 − ${total(g)} = ${8 - total(g)}`],
          whyAny: '8개는 정육면체 전체예요. 더 필요한 수는 이미 쌓은 것을 빼요.',
          probe: { ask: 'misCube' },
        });
      }
      const g = genStack(r, 2, 2, 3, 4, 8, (x) => { const fs = frontV(x).reduce((a, b) => a + b, 0); const ss = sideV(x).reduce((a, b) => a + b, 0); return paintOf(x) === 2 * fs + 2 * ss + cellsOf(x) && 6 * total(x) !== paintOf(x); }, 0.15);
      const fs = frontV(g).reduce((a, b) => a + b, 0); const ss = sideV(g).reduce((a, b) => a + b, 0);
      return misAsk(r, c, this, 'paint', {
        q: `위에서 본 모양에 수를 쓴 그림을 보고, 바닥에 닿은 면만 빼고 바깥쪽 면에 색칠하려고 해요.\n\n${TOP(g)}\n\n${showWork(`쌓기나무가 ${total(g)}개이고 한 개에 면이 6개니까 ${total(g)} × 6 = ${6 * total(g)}개를 칠해요`)}`,
        ok: `맞닿은 면과 바닥 면은 칠하지 않아요 — ${fs} × 2 + ${ss} × 2 + ${cellsOf(g)} = ${paintOf(g)}개`,
        wr: [{ text: '맞게 말했어요', tag: RIGHT_AS_WRONG }, { text: `위에서 보이는 면만 칠하면 돼요 — ${cellsOf(g)}개`, tag: TAGS.wrongReason }, { text: '쌓기나무 면은 셀 수 없어요', tag: OFF }],
        steps: [`앞·뒤 ${fs}개씩 · 왼쪽·오른쪽 ${ss}개씩 · 위 ${cellsOf(g)}개`, `${fs} × 2 + ${ss} × 2 + ${cellsOf(g)} = ${paintOf(g)}`],
        whyAny: '쌓기나무끼리 맞닿은 면과 바닥에 닿은 면은 바깥에 없어요.',
        probe: { ask: 'misPaint' },
      });
    },
  },
];

/** 바깥에 드러난 면 수 (바닥 면 빼고) — 쌓기나무마다 위·앞·뒤·왼쪽·오른쪽에 이웃이 없는 면 */
function paintOf(g) {
  const has = (i, j, k) => j >= 0 && j < g.length && i >= 0 && i < g[0].length && k >= 0 && g[j][i] > k;
  let n = 0;
  g.forEach((row, j) => row.forEach((h, i) => {
    for (let k = 0; k < h; k++) for (const [a, b, d] of [[0, 0, 1], [1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0]]) if (!has(i + a, j + b, k + d)) n++;
  }));
  return n;
}

export function conceptById(id) {
  return SPACE.find((c) => c.id === id) || null;
}

// ───────────────────── 문항 만들기 (mathcuboid와 같은 모양) ─────────────────────

const SLIP = '한 번 더 천천히 — 보이지 않는 쌓기나무와 보는 쪽(앞·옆·위)을 먼저 봐요.';
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
  return diagnosticOf(SPACE, makeQuestion, seed, n, opts);
}
export function placeFrom(answers) {
  return placeFromOf(SPACE, answers);
}
export function ladder(doneIds) {
  return ladderOf(SPACE, doneIds);
}

// ───────────────────── 사람이 쓴 내용 검사 (check.mjs가 부른다) ─────────────────────

/**
 * coach/math/space.json 형식 검사 — mathcuboid.checkContent와 같은 규칙
 * @returns {string[]}
 */
export function checkContent(content) {
  const bad = [];
  const valueOf = (t) => { const s = String(t == null ? '' : t).trim(); return /^\d+(\.\d+)?$/.test(s) ? Number(s) : null; };
  const badFig = (txt) => (String(txt || '').match(/\[[a-z]+ [^\]]+\]/g) || []).filter((f) => !figureSvg(f.slice(1, -1)));
  const badPh = (txt) => (String(txt || '').match(/\{[^}]*\}/g) || []).filter((l) => !/^\{(me|mon|mon2)(\/[^/}]+\/[^}]+)?\}$/.test(l));
  for (const c of SPACE) {
    const v = content && content[c.id];
    if (!v) { bad.push(`${c.id}: 내용 없음`); continue; }
    if (!Array.isArray(v.lesson) || v.lesson.length < 3) bad.push(`${c.id}: lesson 3장 이상이어야 함`);
    if (!v.rule) bad.push(`${c.id}: rule 없음`);
    const checks = (v.lesson || []).filter((p) => p && p.check);
    if (checks.length < 2) bad.push(`${c.id}: 확인 질문 2개 이상이어야 함`);
    for (const [i, p] of (v.lesson || []).entries()) {
      if (!p || !p.say) { bad.push(`${c.id}[${i}]: say 없음`); continue; }
      for (const l of badPh(p.say)) bad.push(`${c.id}[${i}]: 잘못된 자리표시 ${l}`);
      for (const f of badFig(p.say)) bad.push(`${c.id}[${i}]: 못 그리는 그림 ${f}`);
      if (!p.check) continue;
      const ck = p.check;
      if (!ck.q || !ck.ok || !Array.isArray(ck.no) || !ck.no.length || !ck.why) { bad.push(`${c.id}[${i}]: check 칸이 빔`); continue; }
      for (const l of badPh(`${ck.q} ${ck.ok} ${ck.no.join(' ')} ${ck.why}`)) bad.push(`${c.id}[${i}]: 잘못된 자리표시 ${l}`);
      for (const f of badFig(ck.q)) bad.push(`${c.id}[${i}]: 확인 질문의 못 그리는 그림 ${f}`);
      const ov = valueOf(ck.ok);
      for (const n of ck.no) {
        if (String(n).trim() === String(ck.ok).trim()) bad.push(`${c.id}[${i}]: 정답이 오답에도 있음`);
        const nv = valueOf(n);
        if (ov !== null && nv !== null && ov === nv) bad.push(`${c.id}[${i}]: 값이 같은 보기 (${ck.ok} = ${n})`);
      }
      if (new Set(ck.no.map((n) => String(n).trim())).size !== ck.no.length) bad.push(`${c.id}[${i}]: 오답끼리 겹침`);
    }
    const d = v.dad;
    if (!d || !d.goal || !Array.isArray(d.say) || !d.say.length || !d.do) bad.push(`${c.id}: 아빠 카드 미완`);
    if (d && (!Array.isArray(d.traps) || !d.traps.length || !d.pass)) bad.push(`${c.id}: 아빠 카드 함정·통과 기준 없음`);
    if (v.why || v.special) checkHuman(c.id, v, bad, (t) => { const x = valueOf(t); return x === null ? null : { n: x, d: 1 }; });
  }
  return bad;
}
export const _kit = { TETRA, shapeKey, fitAll, paintOf };
