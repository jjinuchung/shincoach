// 🔷 수학 — P 입체도형 줄기 (초6 1학기 2단원 「각기둥과 각뿔」 + 초6 2학기 6단원 「원기둥, 원뿔, 구」):
// 개념 사다리 + 문제 생성기 + 내용 형식 검사. 순수 함수만 — 화면 없음 (node 테스트에서 그대로 돈다).
//
// 왜 이 줄기인가 (2026-10-02, 아버님 "P 입체도형 줄기 가보자" → 설계안 "진행하자"): O 직육면체 다음, 초등 5·6학년에서 남은 입체 칸.
// 칸 범위는 미래엔 6-1 지도서 126쪽 학습 흐름도(11차시)와 6-2 지도서 310쪽(11차시), 323쪽 정의, 2022 성취기준 [6수03-05~08]로 확인했다 —
//   밑면·옆면 → 밑면 모양으로 이름 → 모서리·꼭짓점·높이·각뿔의 꼭짓점 → 규칙(면 n+2·꼭짓점 2n·모서리 3n / n+1·n+1·2n) → 각기둥의 전개도
//   / 원기둥·원뿔(돌려 만들기, 모선) → 구(반원 돌리기, 위·앞·옆에서 본 모양) → 원기둥의 전개도(옆면 가로 = 밑면의 둘레).
//   성취기준: 각기둥의 전개도는 간단한 형태만, **각뿔과 원뿔의 전개도는 다루지 않는다**.
//
// 오답은 아이가 실제로 하는 틀린 생각 흉내다:
//   · 아래에 놓인 면만 밑면 · 각뿔도 밑면 2개 · 각기둥과 각뿔의 옆면 모양을 바꿈 · 꼭짓점·면의 수로 이름을 붙임
//   · 보이는 모서리만 셈 · 옆 모서리를 높이로 · 각뿔의 꼭짓점을 모든 꼭짓점으로 · 각기둥 규칙을 각뿔에(거꾸로도)
//   · 두 밑면이 같은 쪽인 전개도 · 옆면 수가 다른 전개도 · 밑면의 변과 높이를 바꿈
//   · 모선을 높이로 · 돌린 변의 길이를 지름으로 · 반원의 지름을 구의 반지름으로 · 위에서 본 모양을 앞에서 본 모양으로
//   · 옆면의 가로를 지름으로 · 반지름 × 원주율(둘레의 반) · 거꾸로 할 때 곱함
//
// 새 줄기의 함정(메모 stem-generator-pitfalls)을 처음부터:
//   · 가족 = 틀 여러 개, 틀마다 수를 미리 뽑아 둔다 — 🔁 쌍둥이가 요청한 틀(tplKey)로 온다
//   · tplKey는 숫자만 묶는다 → ① 문제 글에는 "오각기둥" 같은 이름을 쓰지 않는다(이름이 바뀌면 열쇠가 갈린다) — 그림(n=5)이나 숫자("밑면의 변이 9개")로, 이름은 보기에만
//   · 수 답 보기는 수만 (단위는 질문 끝 "몇 cm"·"몇 개"에서 숫자판이 읽는다)
//   · 틀린 방법이 우연히 맞는 값은 뽑지 않는다 — 오답끼리도 서로 다르게 (probe.allWrong)
//   · 참말에 일반화를 쓰지 않는다 — 원주율은 "약" 아니라 3.14로 셈만 · "직육면체는 사각기둥이라고 할 수 있어요"
//   · 아직 안 배운 말: 각뿔의 꼭짓점(P3) → 전개도(P5) → 원기둥·원뿔·모선·돌리기(P6) → 구(P7) → 원주율(P8)
//   · 원주율 곱은 0.01 단위 정수로 (원주율 314) — mathcircle과 같다
// ★ 그림의 답(보이는 모서리 수·전개도가 될까·맞닿는 변의 길이)은 테스트가 **따로** 다시 구한다.

import { figureSvg, parseSolid, solidMesh } from './mathdraw.js';
import { rng, shuffle, fill, castOf, worldPick, ask, solve, int, pick, pickFamily, humanQuestion, checkHuman, diagnosticOf, placeFromOf, ladderOf } from './mathgen.js';
import { gradeLabel } from './mathmix.js';

export { gradeLabel };

// ───────────────────── 수·이름·조사 ─────────────────────

/** 소수 둘째 자리까지 (원주율 곱) — 0.01 단위 정수 → 글자 */
const c2 = (v) => { const s = String(Math.round(v)); const neg = s.startsWith('-'); const t = (neg ? s.slice(1) : s).padStart(3, '0'); const out = `${t.slice(0, -2)}.${t.slice(-2)}`.replace(/\.?0+$/, ''); return (neg ? '-' : '') + out; };
/** 0.0001 단위 정수 → 글자 (거꾸로 곱한 오답 37.68 × 3.14 = 118.3152) */
const c4 = (v) => { const t = String(Math.round(v)).padStart(5, '0'); return `${t.slice(0, -4)}.${t.slice(-4)}`.replace(/\.?0+$/, ''); };
const BAT = new Set(['0', '1', '3', '6', '7', '8']);
const lastDigit = (t) => String(t).replace(/\D+$/, '').slice(-1);
/** 수 글자 + 조사 (읽는 소리로 — 0·1·3·6·7·8은 받침) */
function jn(t, withB, without) {
  const s = String(t);
  return s + (BAT.has(lastDigit(s)) ? withB : without);
}
/** 이름 + 조사 — 각기둥·각뿔·각형·면은 모두 받침 (각뿔은 ㄹ이라 '로') */
function jw(t, withB, without) {
  const s = String(t); const code = s.charCodeAt(s.length - 1) - 0xac00;
  const jong = code >= 0 && code < 11172 ? code % 28 : 0;
  if (withB === '으로' && jong === 8) return s + without;
  return s + (jong ? withB : without);
}
const KN = ['', '일', '이', '삼', '사', '오', '육', '칠', '팔', '구'];
/** 한자어 수 이름 (3 → 삼, 12 → 십이, 24 → 이십사) */
export function kn(n) { const t = Math.floor(n / 10); const o = n % 10; return (t ? (t > 1 ? KN[t] : '') + '십' : '') + (o ? KN[o] : ''); }
const polyName = (n) => `${kn(n)}각형`;
const prismName = (n) => `${kn(n)}각기둥`;
const pyrName = (n) => `${kn(n)}각뿔`;
/** 오답 값이 서로 다르고 정답과도 다르며 모두 0보다 크다 */
const allDiff = (...vals) => vals.every((v) => v > 0) && new Set(vals.map((v) => String(v))).size === vals.length;

// ───────────────────── 보기 ─────────────────────

/** 보기 글자 → 값 (겹침 검사용). 수 하나일 때만 — 문장·이름 보기는 null */
export function valueOf(text) {
  const s = String(text == null ? '' : text).trim();
  return /^\d+(\.\d+)?$/.test(s) ? Number(s) : null;
}
const sameValue = (a, b) => a !== null && b !== null && Math.abs(a - b) < 1e-9;
/** 정답 근처의 "계산 실수" — 보기가 모자랄 때만 */
function nearOf(answer, k) {
  const s = String(answer);
  const st = [1, -1, 2, -2, 3, -3, 5, -5][k % 8];
  if (s.includes('.')) {
    const dec = s.split('.')[1].length;
    const v = Math.round((Number(s) + st * 10 ** -dec) * 10 ** dec) / 10 ** dec;
    return v > 0 ? v.toFixed(dec) : '';
  }
  const v = Number(s) + st;
  return v > 0 ? String(v) : '';
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

/** ② 갈래 고르기 — 🔁 쌍둥이·🤔 오답 노트가 요청한 갈래를 먼저 */
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
  // P1 각기둥과 각뿔
  kindSwap: '각기둥과 각뿔을 바꿈',
  bottomOnly: '아래에 놓인 면만 밑면이라고 봄',
  twoBasePyr: '각뿔도 밑면이 2개라고 봄',
  oneBasePrism: '각기둥도 밑면이 1개라고 봄',
  sideAsBase: '옆면을 밑면으로 봄',
  sideShapeSwap: '각기둥과 각뿔의 옆면 모양을 바꿈',
  baseShape: '옆면이 밑면과 같은 모양이라고 봄',
  allFaces: '면을 모두 셈',
  baseCount: '밑면의 수를 답함',
  notFace: '면이 아닌 것을 고름',
  parSwap: '수직과 평행을 바꿈',
  // P2 이름
  byVertex: '꼭짓점의 수로 이름을 붙임',
  byFace: '면의 수로 이름을 붙임',
  byEdge: '모서리의 수로 이름을 붙임',
  cuboidNot: '직육면체는 각기둥이 아니라고 봄',
  // P3 구성 요소
  visibleOnly: '보이는 것만 셈',
  asVertex: '꼭짓점의 수를 답함',
  asEdge: '모서리의 수를 답함',
  asFace: '면의 수를 답함',
  oneBaseV: '한 밑면의 꼭짓점만 셈',
  baseEdgeOnly: '밑면의 모서리만 셈',
  noApex: '각뿔의 꼭짓점을 빼고 셈',
  heightBase: '밑면의 변을 높이로 봄',
  heightSide: '옆 모서리를 높이로 봄',
  apexAll: '꼭짓점을 모두 각뿔의 꼭짓점이라고 봄',
  apexBase: '밑면의 꼭짓점을 셈',
  sumOneBase: '밑면 하나의 모서리만 더함',
  sumNoSide: '옆 모서리를 빼고 더함',
  sumNoBase: '밑면의 모서리를 빼고 더함',
  twoOnly: '적힌 두 모서리만 더함',
  // P4 규칙
  pyrRule: '각뿔의 규칙을 씀',
  prismRule: '각기둥의 규칙을 씀',
  sideOnlyF: '옆면만 셈',
  swap23: '× 2와 × 3을 바꿈',
  sameN: '밑면의 변의 수를 그대로 답함',
  // P5 각기둥의 전개도
  sameSideOk: '두 밑면이 같은 쪽에 붙어도 된다고 봄',
  sideCountOk: '옆면의 수가 달라도 된다고 봄',
  validNo: '될 수 있는데 안 된다고 봄',
  wrongReason: '안 되는 까닭을 잘못 앎',
  lenSwap: '밑면의 변과 높이를 바꿈',
  stripLen: '옆면을 모두 이은 길이를 씀',
  perimAsSide: '밑면의 둘레를 씀',
  rtWrongSide: '맞닿지 않는 변의 길이를 씀',
  // P6 원기둥과 원뿔
  diaAsH: '밑면의 지름을 높이로 봄',
  radAsH: '밑면의 반지름을 높이로 봄',
  rAsD: '반지름을 지름으로 봄',
  hAsD: '높이를 지름으로 봄',
  slantAsH: '모선을 높이로 봄',
  hAsSlant: '높이를 모선으로 봄',
  rAsSlant: '반지름을 모선으로 봄',
  oneSlant: '모선이 하나뿐이라고 봄',
  twoSlant: '그림에 그린 모선만 셈',
  spinSide: '돌리는 축에 붙은 변과 다른 변을 바꿈',
  roundSwap: '원기둥과 원뿔을 바꿈',
  roundPoly: '돌려 만든 것을 각기둥·각뿔로 봄',
  cylVertex: '원기둥에도 꼭짓점이 있다고 봄',
  oneBaseCyl: '원기둥의 밑면이 1개라고 봄',
  // P7 구
  halfDAsR: '반원의 지름을 구의 반지름으로 봄',
  dAsR: '지름을 반지름으로 봄',
  doubleD: '지름을 다시 두 배로 함',
  oneRadius: '반지름이 하나뿐이라고 봄',
  radiusDiff: '반지름의 길이가 서로 다르다고 봄',
  viewTop: '위에서 본 모양을 답함',
  viewFront: '앞에서 본 모양을 답함',
  viewSwap: '원기둥과 원뿔의 본 모양을 바꿈',
  otherFront: '다른 입체도형을 앞에서 본 모양을 답함',
  sphereView: '구도 보는 방향마다 다르다고 봄',
  // P8 원기둥의 전개도
  wAsD: '옆면의 가로를 지름으로 봄',
  wHalf: '반지름에 원주율을 곱함(둘레의 반)',
  wSwapH: '옆면의 가로와 세로를 바꿈',
  hAsW: '높이를 옆면의 가로로 봄',
  sameSideOkC: '두 밑면이 같은 쪽에 붙어도 된다고 봄',
  diffOk: '두 밑면의 크기가 달라도 된다고 봄',
  paraOk: '옆면이 직사각형이 아니어도 된다고 봄',
  // P9 활용
  invMul: '거꾸로 할 때 곱함',
  stopAtD: '지름에서 멈춤',
  noPiInv: '원주율로 나누지 않음',
  condCount: '규칙을 거꾸로 하지 않고 수를 그대로 씀',
  viewOne: '본 모양 하나만 봄',
  equalSplit: '모서리 수로 똑같이 나눔',
  noSubH: '높이 모서리를 빼지 않고 나눔',
  roundFlat: '원기둥의 옆면도 평평하다고 봄',
};

// ───────────────────── 가족·틀 (variant) — mathcuboid와 같은 모양 ─────────────────────

function famOf(variants) {
  return { variants, pools: { pokemon: variants.map((x) => x.t) } };
}
function runFamily(r, c, fams) {
  const f = pickFamily(r, c, fams);
  const t = worldPick(r, c, f.pools);
  return f.variants.find((x) => x.t === t) || f.variants[0];
}
/** 고른 틀로 ① 문항 만들기 — v: { t, ans, wr, steps, why, whyAny, rule, text(문장·이름 보기), probe } */
function calcAsk(r, c, concept, v) {
  const chs = v.text ? textChoices(r, v.ans, v.wr) : choices(r, v.ans, v.wr);
  return {
    ...ask(concept.id, 'calc', fill(v.t, c), chs, {
      solve: solve(v.steps.map((s, i) => step(i, s)), { why: v.why || {}, whyAny: v.whyAny || '', rule: v.rule || concept.rule }),
    }),
    probe: v.probe ? { ...v.probe, allWrong: v.wr.map((w) => ({ text: String(w.text), tag: w.tag })) } : null,
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
/** 정n각기둥 그림이 그려지는 비율인가 (높이 ÷ 밑면의 지름) — mathdraw.parseSolid는 0.3 ~ 3.2 밖이면 그리지 않는다 */
const prismOK = (n, a, h) => { const q = (h * Math.sin(Math.PI / n)) / a; return q >= 0.32 && q <= 3.1; };
/** 각기둥 전개도가 그려지는 높이인가 — mathdraw.parsePnet: 0.6 × 가장 짧은 가로 ≤ 높이 ≤ 4 × 가장 긴 가로 */
const pnetOK = (a, h) => h >= 0.6 * a && h <= 4 * a;
/** 조건에 맞는 수 하나 */
function intWhere(r, lo, hi, ok) {
  for (let k = 0; k < 400; k++) { const v = int(r, lo, hi); if (ok(v)) return v; }
  throw new Error(`intWhere: ${lo}..${hi}에서 못 뽑음`);
}

// ───────────────────── 그림 재료 ─────────────────────

/** 각기둥·각뿔 그림에서 보이는 모서리·꼭짓점 수 (그리는 쪽 계산 — 테스트는 그린 SVG에서 따로 센다) */
function visibleCounts(kind, n) {
  const M = solidMesh(parseSolid(kind, `n=${n}`));
  const hidV = M.V.map((_, i) => M.F.every((f) => !f.vis || !f.idx.includes(i)));
  return { edges: M.E.filter((e) => !e.hid).length, vertices: hidV.filter((h) => !h).length };
}
/** 정사각뿔·정육각뿔·정삼각뿔의 (밑면의 한 변, 높이, 옆 모서리) — 서로 맞는 자연수만 (그림이 실제 비율로 그려진다) */
const PYR_SETS = {
  3: [[9, 13, 14], [12, 11, 13], [15, 11, 14]],
  4: [[8, 7, 9], [12, 7, 11], [16, 14, 18]],
  6: [[3, 4, 5], [6, 8, 10], [5, 12, 13], [9, 12, 15], [8, 15, 17], [12, 16, 20]],
};
/** 원뿔의 (반지름, 높이, 모선) */
const CONE_SETS = [[3, 4, 5], [4, 3, 5], [6, 8, 10], [8, 6, 10], [5, 12, 13], [9, 12, 15], [12, 9, 15], [8, 15, 17], [12, 16, 20], [15, 20, 25], [10, 24, 26], [7, 24, 25]];
/** 원주율 곱 (0.01 단위 정수): 지름 × 3.14 */
const piOf = (d) => d * 314;
const PI_LINE = '(원주율: 3.14)';

// ───────────────────── 개념 사다리 (P. 입체도형 줄기) ─────────────────────

export const SOLID = [
  {
    id: 'sol.parts', grade: 6, name: '각기둥과 각뿔', needs: [],
    idea: '서로 **평행하고 합동인 두 다각형**이 있는 기둥 모양의 입체도형을 **각기둥**, 밑에 놓인 면이 다각형이고 옆면이 모두 **삼각형**인 뿔 모양의 입체도형을 **각뿔**이라고 해요. 각기둥에서 서로 평행하고 합동인 두 면이 **밑면**(2개), 두 밑면과 만나는 면이 **옆면**이에요 — 옆면은 모두 **직사각형**이고 밑면과 수직이에요. 각뿔은 밑면이 **1개**, 옆면은 모두 삼각형이에요. 밑면은 놓인 자리가 아니라 모양으로 찾아요 — 옆으로 눕혀도 평행하고 합동인 두 면이 밑면이에요.',
    rule: '각기둥: 밑면 2개(평행·합동), 옆면은 직사각형 / 각뿔: 밑면 1개, 옆면은 삼각형.',
    slip: '서로 평행하고 합동인 두 면이 어느 것인지, 옆면이 직사각형인지 삼각형인지 먼저 봐요.',
    calc(r, c) {
      const fams = [];
      // 무엇일까 — 바르게 말한 것
      fams.push(famOf([
        (() => {
          const n = int(r, 3, 8);
          return {
            t: `입체도형이 있어요.\n\n[prism n=${n}]\n\n이 입체도형을 바르게 말한 것은 어느 것일까요?`,
            text: true, ans: '각기둥이에요 — 서로 평행하고 합동인 두 밑면이 있어요',
            wr: [{ text: '각뿔이에요 — 옆면이 모두 삼각형이에요', tag: TAGS.kindSwap }, { text: '각기둥이에요 — 밑면이 1개예요', tag: TAGS.oneBasePrism }, { text: '각뿔이에요 — 밑면이 2개예요', tag: TAGS.twoBasePyr }],
            steps: ['위와 아래의 두 면이 서로 평행하고 합동인 다각형이에요', '옆면은 모두 직사각형 → 각기둥이에요, 밑면은 2개'],
            why: { [TAGS.kindSwap]: '옆면이 직사각형이면 각기둥이에요. 각뿔은 옆면이 삼각형이에요.', [TAGS.oneBasePrism]: '각기둥은 서로 평행하고 합동인 두 면이 밑면 — 2개예요.', [TAGS.twoBasePyr]: '두 밑면이 있는 것은 각기둥이에요.' },
            probe: { ask: 'kind', kind: 'prism', n },
          };
        })(),
        (() => {
          const n = int(r, 3, 8);
          return {
            t: `입체도형이 있어요.\n\n[pyramid n=${n}]\n\n이 입체도형을 바르게 말한 것은 어느 것일까요?`,
            text: true, ans: '각뿔이에요 — 밑면이 1개이고 옆면이 모두 삼각형이에요',
            wr: [{ text: '각기둥이에요 — 옆면이 모두 직사각형이에요', tag: TAGS.kindSwap }, { text: '각뿔이에요 — 밑면이 2개예요', tag: TAGS.twoBasePyr }, { text: '각뿔이에요 — 옆면이 모두 직사각형이에요', tag: TAGS.sideShapeSwap }],
            steps: ['밑에 놓인 면이 다각형이고, 옆면이 모두 한 점에서 만나는 삼각형이에요', '그래서 각뿔 — 밑면은 1개예요'],
            why: { [TAGS.kindSwap]: '옆면이 삼각형이고 뾰족하면 각뿔이에요.', [TAGS.twoBasePyr]: '각뿔의 밑면은 1개예요. 밑면이 2개인 것은 각기둥이에요.', [TAGS.sideShapeSwap]: '각뿔의 옆면은 삼각형이에요. 직사각형 옆면은 각기둥이에요.' },
            probe: { ask: 'kind', kind: 'pyramid', n },
          };
        })(),
      ]));
      // 밑면의 수
      fams.push(famOf([
        (() => { const n = int(r, 3, 8); return { t: `각기둥이 있어요.\n\n[prism n=${n}]\n\n이 각기둥의 밑면은 몇 개일까요?`, ans: '2', wr: [{ text: '1', tag: TAGS.bottomOnly }, { text: String(n), tag: TAGS.sideAsBase }], steps: ['서로 평행하고 합동인 두 면이 밑면 — 위에 1개, 아래에 1개', '1 + 1 = 2 → 2개'], why: { [TAGS.bottomOnly]: '아래에 놓인 면만 밑면이 아니에요. 서로 평행하고 합동인 두 면이 모두 밑면이에요.', [TAGS.sideAsBase]: `${n}개는 옆면의 수예요. 밑면은 서로 평행하고 합동인 두 면이에요.` }, probe: { ask: 'bases', kind: 'prism', n } }; })(),
        (() => { const n = int(r, 3, 8); return { t: `각뿔이 있어요.\n\n[pyramid n=${n}]\n\n이 각뿔의 밑면은 몇 개일까요?`, ans: '1', wr: [{ text: '2', tag: TAGS.twoBasePyr }, { text: String(n), tag: TAGS.sideAsBase }], steps: ['각뿔에서 밑에 놓인 다각형이 밑면이에요', '나머지 면은 모두 삼각형인 옆면 → 밑면은 1개'], why: { [TAGS.twoBasePyr]: '밑면이 2개인 것은 각기둥이에요. 각뿔은 1개예요.', [TAGS.sideAsBase]: `${n}개는 옆면의 수예요.` }, probe: { ask: 'bases', kind: 'pyramid', n } }; })(),
      ]));
      // 옆면의 모양 — 밑면이 오각형~팔각형 (삼각형·사각형 밑면이면 "밑면과 같은 모양" 오답이 참이 될 수 있어서)
      fams.push(famOf([
        (() => { const n = int(r, 5, 8); return { t: `각기둥이 있어요.\n\n[prism n=${n}]\n\n이 각기둥의 옆면은 어떤 모양일까요?`, text: true, ans: '직사각형', wr: [{ text: '삼각형', tag: TAGS.sideShapeSwap }, { text: polyName(n), tag: TAGS.baseShape }], steps: ['옆면은 두 밑면과 만나는 면이에요', '각기둥의 옆면은 모두 직사각형이에요'], why: { [TAGS.sideShapeSwap]: '옆면이 삼각형인 것은 각뿔이에요.', [TAGS.baseShape]: `${polyName(n)}은 밑면의 모양이에요.` }, probe: { ask: 'sideShape', kind: 'prism', n } }; })(),
        (() => { const n = int(r, 5, 8); return { t: `각뿔이 있어요.\n\n[pyramid n=${n}]\n\n이 각뿔의 옆면은 어떤 모양일까요?`, text: true, ans: '삼각형', wr: [{ text: '직사각형', tag: TAGS.sideShapeSwap }, { text: polyName(n), tag: TAGS.baseShape }], steps: ['옆면은 밑면과 만나는 면이에요', '각뿔의 옆면은 모두 삼각형 — 한 점에서 만나요'], why: { [TAGS.sideShapeSwap]: '옆면이 직사각형인 것은 각기둥이에요.', [TAGS.baseShape]: `${polyName(n)}은 밑면의 모양이에요.` }, probe: { ask: 'sideShape', kind: 'pyramid', n } }; })(),
      ]));
      // 옆면의 수
      fams.push(famOf([
        (() => { const n = int(r, 3, 8); return { t: `각기둥이 있어요.\n\n[prism n=${n}]\n\n이 각기둥의 옆면은 몇 개일까요?`, ans: String(n), wr: [{ text: String(n + 2), tag: TAGS.allFaces }, { text: '2', tag: TAGS.baseCount }], steps: [`밑면의 변 하나마다 옆면이 하나 — 밑면의 변이 ${n}개`, `옆면은 ${n}개`], why: { [TAGS.allFaces]: '두 밑면까지 센 면 전체의 수예요. 옆면만 세요.', [TAGS.baseCount]: '2는 밑면의 수예요.' }, probe: { ask: 'sides', kind: 'prism', n } }; })(),
        (() => { const n = int(r, 3, 8); return { t: `각뿔이 있어요.\n\n[pyramid n=${n}]\n\n이 각뿔의 옆면은 몇 개일까요?`, ans: String(n), wr: [{ text: String(n + 1), tag: TAGS.allFaces }, { text: '1', tag: TAGS.baseCount }], steps: [`밑면의 변 하나마다 삼각형 옆면이 하나 — 밑면의 변이 ${n}개`, `옆면은 ${n}개`], why: { [TAGS.allFaces]: '밑면까지 센 면 전체의 수예요. 옆면만 세요.', [TAGS.baseCount]: '1은 밑면의 수예요.' }, probe: { ask: 'sides', kind: 'pyramid', n } }; })(),
      ]));
      // 눕혀 놓은 각기둥 — 색칠한 면 (밑면은 놓인 자리가 아니라 모양으로)
      fams.push(famOf([
        (() => { const n = int(r, 3, 6); return { t: `각기둥을 옆으로 눕혀 놓았어요.\n\n[prism n=${n} lie shade=b]\n\n색칠한 면은 무엇일까요?`, text: true, ans: '밑면', wr: [{ text: '옆면', tag: TAGS.bottomOnly }, { text: '모서리', tag: TAGS.notFace }], steps: ['색칠한 면은 맞은편 면과 서로 평행하고 합동인 다각형이에요', '그래서 밑면 — 옆으로 눕혀도 밑면이에요'], why: { [TAGS.bottomOnly]: '아래에 놓인 면이 밑면인 것이 아니에요. 서로 평행하고 합동인 두 면이 밑면이에요.', [TAGS.notFace]: '모서리는 면과 면이 만나는 선분이에요. 색칠한 것은 면이에요.' }, probe: { ask: 'shaded', lie: true, shade: 'b', n } }; })(),
        (() => { const n = int(r, 3, 6); return { t: `각기둥을 옆으로 눕혀 놓았어요.\n\n[prism n=${n} lie shade=s]\n\n색칠한 면은 무엇일까요?`, text: true, ans: '옆면', wr: [{ text: '밑면', tag: TAGS.sideAsBase }, { text: '모서리', tag: TAGS.notFace }], steps: ['색칠한 면은 직사각형 — 두 밑면과 만나요', '그래서 옆면이에요'], why: { [TAGS.sideAsBase]: '밑면은 서로 평행하고 합동인 두 다각형이에요. 색칠한 직사각형은 두 밑면과 만나는 옆면이에요.', [TAGS.notFace]: '모서리는 면과 면이 만나는 선분이에요. 색칠한 것은 면이에요.' }, probe: { ask: 'shaded', lie: true, shade: 's', n } }; })(),
      ]));
      // 밑면과 옆면은 어떻게 만날까
      fams.push(famOf([(() => {
        const n = int(r, 3, 8);
        return {
          t: `각기둥이 있어요.\n\n[prism n=${n} shade=s]\n\n색칠한 옆면과 밑면은 어떻게 만날까요?`,
          text: true, ans: '수직으로 만나요', wr: [{ text: '서로 평행해요', tag: TAGS.parSwap }, { text: '만나지 않아요', tag: TAGS.parSwap }],
          steps: ['옆면은 직사각형 — 밑면과 만나는 모서리에서 직각을 이뤄요', '그래서 옆면과 밑면은 수직이에요'],
          why: { [TAGS.parSwap]: '서로 평행한 것은 두 밑면이에요. 옆면은 밑면과 수직으로 만나요.' },
          probe: { ask: 'perp', n },
        };
      })()]));
      return calcAsk(r, c, this, runFamily(r, c, fams));
    },
    misread(r, c) {
      const n = int(r, 3, 6);
      if (branchOf(r, c, ['bottom', 'pyrbase']) === 'bottom') {
        return misAsk(r, c, this, 'bottom', {
          q: `각기둥을 옆으로 눕혀 놓았어요.\n\n[prism n=${n} lie shade=b]\n\n${showWork('색칠한 면은 옆에 서 있으니까 옆면이에요')}`,
          ok: '서로 평행하고 합동인 두 면이 밑면이에요 — 색칠한 면은 밑면이에요',
          wr: [
            { text: '맞게 말했어요', tag: RIGHT_AS_WRONG },
            { text: '각기둥의 밑면은 1개라서 색칠한 면은 밑면이 아니에요', tag: TAGS.oneBasePrism },
            { text: '색칠한 면은 꼭짓점이에요', tag: OFF },
          ],
          steps: ['색칠한 면과 맞은편 면은 서로 평행하고 합동인 다각형이에요', '그래서 두 면이 밑면 — 놓인 자리와 상관없이 밑면이에요'],
          whyAny: '아래에 놓인 면만 밑면인 것이 아니에요. 서로 평행하고 합동인 두 면이 밑면이에요.',
          probe: { ask: 'shaded', n },
        });
      }
      return misAsk(r, c, this, 'pyrbase', {
        q: `각뿔이 있어요.\n\n[pyramid n=${n + 1}]\n\n${showWork('각뿔도 각기둥처럼 밑면이 2개예요')}`,
        ok: '각뿔의 밑면은 1개예요 — 나머지 면은 모두 삼각형인 옆면이에요',
        wr: [
          { text: '맞게 말했어요', tag: RIGHT_AS_WRONG },
          { text: '각뿔의 옆면은 직사각형이에요', tag: TAGS.sideShapeSwap },
          { text: '각뿔에는 면이 없어요', tag: OFF },
        ],
        steps: ['각뿔에서 다각형인 면은 밑에 놓인 1개뿐이에요', '나머지 면은 모두 삼각형인 옆면 → 밑면은 1개'],
        whyAny: '밑면이 2개인 것은 각기둥이에요. 각뿔의 밑면은 1개예요.',
        probe: { ask: 'bases', kind: 'pyramid' },
      });
    },
  },

  {
    id: 'sol.name', grade: 6, name: '각기둥과 각뿔의 이름', needs: ['sol.parts'],
    idea: '각기둥과 각뿔은 **밑면의 모양**에 따라 이름을 붙여요. 밑면이 삼각형이면 **삼각기둥**·**삼각뿔**, 오각형이면 **오각기둥**·**오각뿔**이에요. 꼭짓점이나 면의 수로 이름을 붙이지 않아요. 직육면체는 두 밑면이 서로 평행하고 합동인 사각형이라서 **사각기둥이라고 할 수 있어요**.',
    rule: '이름은 밑면의 모양으로 — 밑면이 □각형이면 □각기둥·□각뿔.',
    slip: '밑면이 어떤 다각형인지 먼저 세고, 기둥인지 뿔인지 봐요.',
    calc(r, c) {
      const fams = [];
      // 그림 → 이름
      fams.push(famOf([
        (() => {
          const n = int(r, 3, 8);
          return {
            t: `각기둥이 있어요.\n\n[prism n=${n}]\n\n이 각기둥의 이름은 무엇일까요?`, text: true, ans: prismName(n),
            wr: [{ text: prismName(2 * n), tag: TAGS.byVertex }, { text: prismName(n + 2), tag: TAGS.byFace }, { text: pyrName(n), tag: TAGS.kindSwap }],
            steps: [`밑면의 변을 세면 ${n}개 — 밑면은 ${polyName(n)}`, `밑면이 ${polyName(n)}인 각기둥 → ${prismName(n)}`],
            why: { [TAGS.byVertex]: `꼭짓점이 ${2 * n}개라서 붙인 이름이에요. 이름은 밑면의 모양으로 붙여요.`, [TAGS.byFace]: `면이 ${n + 2}개라서 붙인 이름이에요. 이름은 밑면의 모양으로 붙여요.`, [TAGS.kindSwap]: '옆면이 직사각형이니 각뿔이 아니라 각기둥이에요.' },
            probe: { ask: 'name', kind: 'prism', n },
          };
        })(),
        (() => {
          const n = int(r, 3, 8);
          return {
            t: `각뿔이 있어요.\n\n[pyramid n=${n}]\n\n이 각뿔의 이름은 무엇일까요?`, text: true, ans: pyrName(n),
            wr: [{ text: pyrName(n + 1), tag: TAGS.byVertex }, { text: pyrName(2 * n), tag: TAGS.byEdge }, { text: prismName(n), tag: TAGS.kindSwap }],
            steps: [`밑면의 변을 세면 ${n}개 — 밑면은 ${polyName(n)}`, `밑면이 ${polyName(n)}인 각뿔 → ${pyrName(n)}`],
            why: { [TAGS.byVertex]: `꼭짓점이 ${n + 1}개라서 붙인 이름이에요. 이름은 밑면의 모양으로 붙여요.`, [TAGS.byEdge]: `모서리가 ${2 * n}개라서 붙인 이름이에요. 이름은 밑면의 모양으로 붙여요.`, [TAGS.kindSwap]: '옆면이 삼각형이니 각기둥이 아니라 각뿔이에요.' },
            probe: { ask: 'name', kind: 'pyramid', n },
          };
        })(),
      ]));
      // 글 → 이름 (밑면의 변의 수로 — 이름 낱말은 보기에만)
      fams.push(famOf([
        (() => {
          const n = int(r, 3, 12);
          return {
            t: `밑면의 변이 ${n}개인 각기둥이 있어요.\n\n이 각기둥의 이름은 무엇일까요?`, text: true, ans: prismName(n),
            wr: [{ text: prismName(n + 2), tag: TAGS.byFace }, { text: prismName(3 * n), tag: TAGS.byEdge }, { text: pyrName(n), tag: TAGS.kindSwap }],
            steps: [`밑면의 변이 ${n}개 — 밑면은 ${polyName(n)}`, `→ ${prismName(n)}`],
            why: { [TAGS.byFace]: '면의 수로 붙인 이름이에요. 밑면의 모양으로 붙여요.', [TAGS.byEdge]: '모서리의 수로 붙인 이름이에요. 밑면의 모양으로 붙여요.', [TAGS.kindSwap]: '각기둥이라고 했어요.' },
            probe: { ask: 'name', kind: 'prism', n },
          };
        })(),
        (() => {
          const n = int(r, 3, 12);
          return {
            t: `밑면의 변이 ${n}개인 각뿔이 있어요.\n\n이 각뿔의 이름은 무엇일까요?`, text: true, ans: pyrName(n),
            wr: [{ text: pyrName(n + 1), tag: TAGS.byFace }, { text: pyrName(2 * n), tag: TAGS.byEdge }, { text: prismName(n), tag: TAGS.kindSwap }],
            steps: [`밑면의 변이 ${n}개 — 밑면은 ${polyName(n)}`, `→ ${pyrName(n)}`],
            why: { [TAGS.byFace]: '면의 수로 붙인 이름이에요. 밑면의 모양으로 붙여요.', [TAGS.byEdge]: '모서리의 수로 붙인 이름이에요. 밑면의 모양으로 붙여요.', [TAGS.kindSwap]: '각뿔이라고 했어요.' },
            probe: { ask: 'name', kind: 'pyramid', n },
          };
        })(),
      ]));
      // 직육면체는 사각기둥
      fams.push(famOf([(() => {
        const d = [int(r, 4, 9), int(r, 2, 4), int(r, 3, 7)];
        return {
          t: `직육면체 모양의 상자가 있어요.\n\n[cuboid ${d.join(' ')}]\n\n이 상자를 각기둥의 이름으로 부르면 무엇일까요?`, text: true, ans: '사각기둥',
          wr: [{ text: '각기둥이 아니에요', tag: TAGS.cuboidNot }, { text: '육각기둥', tag: TAGS.byFace }, { text: '팔각기둥', tag: TAGS.byVertex }],
          steps: ['직육면체는 마주 보는 두 면이 서로 평행하고 합동인 사각형 — 그 두 면을 밑면으로 하는 각기둥이에요', '밑면이 사각형 → 사각기둥이라고 할 수 있어요'],
          why: { [TAGS.cuboidNot]: '직육면체도 서로 평행하고 합동인 두 사각형이 있어서 각기둥이에요.', [TAGS.byFace]: '면이 6개라서 붙인 이름이에요. 밑면의 모양으로 붙여요.', [TAGS.byVertex]: '꼭짓점이 8개라서 붙인 이름이에요. 밑면의 모양으로 붙여요.' },
          probe: { ask: 'cuboid' },
        };
      })()]));
      // 그림 → 밑면의 모양
      fams.push(famOf([
        (() => { const n = int(r, 5, 8); return { t: `각기둥이 있어요.\n\n[prism n=${n}]\n\n이 각기둥의 밑면은 어떤 도형일까요?`, text: true, ans: polyName(n), wr: [{ text: '직사각형', tag: TAGS.sideAsBase }, { text: polyName(n + 2), tag: TAGS.byFace }], steps: [`밑면의 변을 세면 ${n}개`, `밑면은 ${polyName(n)}`], why: { [TAGS.sideAsBase]: '직사각형은 옆면이에요.', [TAGS.byFace]: '면의 수를 센 것이에요. 밑면의 변을 세요.' }, probe: { ask: 'baseShape', kind: 'prism', n } }; })(),
        (() => { const n = int(r, 5, 8); return { t: `각뿔이 있어요.\n\n[pyramid n=${n}]\n\n이 각뿔의 밑면은 어떤 도형일까요?`, text: true, ans: polyName(n), wr: [{ text: '삼각형', tag: TAGS.sideAsBase }, { text: polyName(n + 1), tag: TAGS.byFace }], steps: [`밑면의 변을 세면 ${n}개`, `밑면은 ${polyName(n)}`], why: { [TAGS.sideAsBase]: '삼각형은 옆면이에요.', [TAGS.byFace]: '면의 수를 센 것이에요. 밑면의 변을 세요.' }, probe: { ask: 'baseShape', kind: 'pyramid', n } }; })(),
      ]));
      return calcAsk(r, c, this, runFamily(r, c, fams));
    },
    misread(r, c) {
      if (branchOf(r, c, ['vertex', 'cuboid']) === 'vertex') {
        const n = int(r, 3, 8);
        return misAsk(r, c, this, 'vertex', {
          q: `각기둥이 있어요.\n\n[prism n=${n}]\n\n${showWork(`꼭짓점이 ${2 * n}개라서 ${prismName(2 * n)}이에요`)}`,
          ok: `이름은 밑면의 모양으로 — 밑면이 ${polyName(n)}이라서 ${prismName(n)}이에요`,
          wr: [
            { text: '맞게 말했어요', tag: RIGHT_AS_WRONG },
            { text: `면이 ${n + 2}개라서 ${prismName(n + 2)}이에요`, tag: TAGS.byFace },
            { text: '각기둥은 이름이 없어요', tag: OFF },
          ],
          steps: [`밑면의 변을 세면 ${n}개 — 밑면은 ${polyName(n)}`, `밑면이 ${polyName(n)}인 각기둥 → ${prismName(n)}`],
          whyAny: '꼭짓점의 수로 이름을 붙였어요. 각기둥의 이름은 밑면의 모양으로 붙여요.',
          probe: { ask: 'name', kind: 'prism', n },
        });
      }
      const d = [int(r, 4, 9), int(r, 2, 4), int(r, 3, 7)];
      return misAsk(r, c, this, 'cuboid', {
        q: `직육면체 모양의 상자가 있어요.\n\n[cuboid ${d.join(' ')}]\n\n${showWork('직육면체는 각기둥이 아니에요')}`,
        ok: '마주 보는 두 면이 서로 평행하고 합동인 사각형 — 직육면체는 사각기둥이라고 할 수 있어요',
        wr: [
          { text: '맞게 말했어요', tag: RIGHT_AS_WRONG },
          { text: '직육면체는 사각뿔이에요', tag: TAGS.kindSwap },
          { text: '직육면체에는 모서리가 없어요', tag: OFF },
        ],
        steps: ['직육면체의 마주 보는 두 면은 서로 평행하고 합동인 사각형이에요', '그 두 면을 밑면으로 하면 옆면은 직사각형 → 사각기둥이라고 할 수 있어요'],
        whyAny: '직육면체도 서로 평행하고 합동인 두 사각형이 있어서 각기둥 — 사각기둥이라고 할 수 있어요.',
        probe: { ask: 'cuboid' },
      });
    },
  },

  {
    id: 'sol.elem', grade: 6, name: '모서리·꼭짓점·높이', needs: ['sol.name'],
    idea: '면과 면이 만나는 선분이 **모서리**, 모서리와 모서리가 만나는 점이 **꼭짓점**이에요. 각기둥에서 두 밑면 사이의 거리를 **높이**라고 해요. 각뿔에서 옆면이 모두 만나는 한 점을 **각뿔의 꼭짓점**이라고 하고, 각뿔의 꼭짓점에서 밑면에 수직인 선분의 길이를 **높이**라고 해요 — 옆 모서리의 길이는 높이가 아니에요. 그림의 점선은 뒤쪽에 숨은 모서리예요.',
    rule: '각기둥의 높이 = 두 밑면 사이의 거리 · 각뿔의 높이 = 각뿔의 꼭짓점에서 밑면에 수직인 선분의 길이.',
    slip: '점선으로 그린 뒤쪽 것까지 셌는지, 높이가 수직인 선분인지 다시 봐요.',
    calc(r, c) {
      const fams = [];
      // 그림에서 세기 — 모서리·꼭짓점 (보이는 것만 센 오답은 그림에서 센 값)
      const count = (kind, what) => {
        for (let k = 0; k < 40; k++) {
          const n = int(r, 3, 8); const vc = visibleCounts(kind, n);
          const P = kind === 'prism';
          const tot = what === 'edge' ? (P ? 3 * n : 2 * n) : (P ? 2 * n : n + 1);
          const vis = what === 'edge' ? vc.edges : vc.vertices;
          const wr = what === 'edge'
            ? [{ text: String(vis), tag: TAGS.visibleOnly }, { text: String(P ? 2 * n : n + 1), tag: TAGS.asVertex }, { text: String(P ? n : n), tag: P ? TAGS.baseEdgeOnly : TAGS.baseEdgeOnly }]
            : [{ text: String(vis), tag: TAGS.visibleOnly }, { text: String(P ? 3 * n : 2 * n), tag: TAGS.asEdge }, { text: String(P ? n : n), tag: P ? TAGS.oneBaseV : TAGS.noApex }];
          if (!allDiff(tot, ...wr.map((w) => +w.text))) continue;
          const word = what === 'edge' ? '모서리는' : '꼭짓점은';
          return {
            t: `${P ? '각기둥' : '각뿔'}이 있어요.\n\n[${kind} n=${n}]\n\n이 ${P ? '각기둥' : '각뿔'}의 ${word} 모두 몇 개일까요?`, ans: String(tot), wr,
            steps: what === 'edge'
              ? (P ? [`위 밑면에 ${n}개, 아래 밑면에 ${n}개, 두 밑면을 잇는 모서리 ${n}개`, `${n} + ${n} + ${n} = ${3 * n} → ${3 * n}개`] : [`밑면에 ${n}개, 각뿔의 꼭짓점으로 모이는 모서리 ${n}개`, `${n} + ${n} = ${2 * n} → ${2 * n}개`])
              : (P ? [`위 밑면에 ${n}개, 아래 밑면에 ${n}개`, `${n} + ${n} = ${2 * n} → ${2 * n}개`] : [`밑면에 ${n}개, 옆면이 모두 만나는 점 1개`, `${n} + 1 = ${n + 1} → ${n + 1}개`]),
            why: what === 'edge'
              ? { [TAGS.visibleOnly]: '점선으로 그린 뒤쪽 모서리도 세어요.', [TAGS.asVertex]: '꼭짓점의 수예요. 모서리는 면과 면이 만나는 선분이에요.', [TAGS.baseEdgeOnly]: '밑면의 모서리만 셌어요. 옆면 사이의 모서리도 세어요.' }
              : { [TAGS.visibleOnly]: '점선이 만나는 뒤쪽 꼭짓점도 세어요.', [TAGS.asEdge]: '모서리의 수예요. 꼭짓점은 모서리와 모서리가 만나는 점이에요.', [TAGS.oneBaseV]: '한 밑면의 꼭짓점만 셌어요.', [TAGS.noApex]: '옆면이 모두 만나는 위쪽 점도 꼭짓점이에요.' },
            probe: { ask: what, kind, n, vis },
          };
        }
        throw new Error('count: 못 뽑음');
      };
      fams.push(famOf([count('prism', 'edge'), count('pyramid', 'edge')]));
      fams.push(famOf([count('prism', 'vertex'), count('pyramid', 'vertex')]));
      // 각기둥의 높이
      fams.push(famOf([(() => {
        const n = int(r, 3, 8); const a = int(r, 3, 9); const h = intWhere(r, 4, 14, (v) => v !== a && v !== 2 * a && prismOK(n, a, v));
        return {
          t: `밑면이 정다각형인 각기둥이 있어요.\n\n[prism n=${n} a=${a} h=${h}]\n\n이 각기둥의 높이는 몇 cm일까요?`, ans: String(h),
          wr: [{ text: String(a), tag: TAGS.heightBase }],
          steps: ['각기둥의 높이는 두 밑면 사이의 거리 — 두 밑면을 잇는 모서리의 길이와 같아요', `→ ${h} cm`],
          why: { [TAGS.heightBase]: `${a} cm는 밑면의 한 변이에요. 높이는 두 밑면 사이의 거리예요.` },
          probe: { ask: 'prismH', n, a, h },
        };
      })()]));
      // 각뿔의 높이 — 옆 모서리가 아니다
      fams.push(famOf([(() => {
        const n = pick(r, [3, 4, 6]); const [a, h, e] = pick(r, PYR_SETS[n]);
        return {
          t: `밑면이 정다각형인 각뿔이 있어요.\n\n[pyramid n=${n} a=${a} h=${h} e=${e}]\n\n이 각뿔의 높이는 몇 cm일까요?`, ans: String(h),
          wr: [{ text: String(e), tag: TAGS.heightSide }, { text: String(a), tag: TAGS.heightBase }],
          steps: ['각뿔의 높이는 각뿔의 꼭짓점에서 밑면에 수직인 선분의 길이 — 그림의 점선', `→ ${h} cm`],
          why: { [TAGS.heightSide]: `${e} cm는 옆 모서리예요. 비스듬해서 높이가 아니에요.`, [TAGS.heightBase]: `${a} cm는 밑면의 한 변이에요.` },
          probe: { ask: 'pyrH', n, a, h, e },
        };
      })()]));
      // 각뿔의 꼭짓점
      fams.push(famOf([(() => {
        const n = int(r, 3, 8);
        return {
          t: `각뿔이 있어요.\n\n[pyramid n=${n}]\n\n이 각뿔에서 각뿔의 꼭짓점은 몇 개일까요?`, ans: '1',
          wr: [{ text: String(n + 1), tag: TAGS.apexAll }, { text: String(n), tag: TAGS.apexBase }],
          steps: ['각뿔의 꼭짓점은 옆면이 모두 만나는 점이에요', '맨 위의 한 점 → 1개'],
          why: { [TAGS.apexAll]: '꼭짓점 전체의 수예요. 각뿔의 꼭짓점은 옆면이 모두 만나는 한 점이에요.', [TAGS.apexBase]: '밑면의 꼭짓점을 셌어요. 각뿔의 꼭짓점은 맨 위의 한 점이에요.' },
          probe: { ask: 'apex', n },
        };
      })()]));
      // 모서리 길이의 합
      fams.push(famOf([
        (() => {
          for (let k = 0; k < 60; k++) {
            const n = int(r, 3, 8); const a = int(r, 2, 9); const h = int(r, 3, 12);
            const ans = 2 * n * a + n * h; const w1 = n * a + n * h; const w2 = 2 * n * a; const w3 = a + h;
            if (!allDiff(ans, w1, w2, w3) || a === h || !prismOK(n, a, h)) continue;
            return {
              t: `밑면이 정다각형인 각기둥이 있어요.\n\n[prism n=${n} a=${a} h=${h}]\n\n이 각기둥의 모든 모서리 길이의 합은 몇 cm일까요?`, ans: String(ans),
              wr: [{ text: String(w1), tag: TAGS.sumOneBase }, { text: String(w2), tag: TAGS.sumNoSide }, { text: String(w3), tag: TAGS.twoOnly }],
              steps: [`${a} cm인 모서리: 두 밑면에 ${n}개씩 → ${2 * n}개, ${h} cm인 모서리 ${n}개`, `${a} × ${2 * n} = ${2 * n * a}, ${h} × ${n} = ${n * h}`, `${2 * n * a} + ${n * h} = ${ans}`],
              why: { [TAGS.sumOneBase]: '밑면 하나의 모서리만 더했어요. 두 밑면 모두 더해요.', [TAGS.sumNoSide]: '두 밑면을 잇는 모서리를 빠뜨렸어요.', [TAGS.twoOnly]: '적힌 두 모서리만 더했어요. 같은 길이 모서리가 여러 개예요.' },
              probe: { ask: 'edgeSum', kind: 'prism', n, a, h },
            };
          }
          throw new Error('edgeSum');
        })(),
        (() => {
          const n = pick(r, [3, 4, 6]); const [a, , e] = pick(r, PYR_SETS[n]);
          const ans = n * a + n * e; const w1 = n * a; const w2 = a + e; const w3 = n * e;
          return {
            t: `밑면이 정다각형인 각뿔이 있어요.\n\n[pyramid n=${n} a=${a} e=${e}]\n\n이 각뿔의 모든 모서리 길이의 합은 몇 cm일까요?`, ans: String(ans),
            wr: [{ text: String(w1), tag: TAGS.sumNoSide }, { text: String(w2), tag: TAGS.twoOnly }, { text: String(w3), tag: TAGS.sumNoBase }].filter((w) => allDiff(ans, +w.text)),
            steps: [`밑면의 모서리 ${a} cm가 ${n}개, 옆 모서리 ${e} cm가 ${n}개`, `${a} × ${n} = ${n * a}, ${e} × ${n} = ${n * e}`, `${n * a} + ${n * e} = ${ans}`],
            why: { [TAGS.sumNoSide]: '옆 모서리를 빠뜨렸어요.', [TAGS.twoOnly]: '적힌 두 모서리만 더했어요.', [TAGS.sumNoBase]: '밑면의 모서리를 빠뜨렸어요.' },
            probe: { ask: 'edgeSum', kind: 'pyramid', n, a, e },
          };
        })(),
      ]));
      return calcAsk(r, c, this, runFamily(r, c, fams));
    },
    misread(r, c) {
      if (branchOf(r, c, ['height', 'apex']) === 'height') {
        const n = pick(r, [3, 4, 6]); const [a, h, e] = pick(r, PYR_SETS[n]);
        return misAsk(r, c, this, 'height', {
          q: `밑면이 정다각형인 각뿔이 있어요.\n\n[pyramid n=${n} a=${a} h=${h} e=${e}]\n\n${showWork(`이 각뿔의 높이는 옆 모서리의 길이와 같은 ${e} cm예요`)}`,
          ok: `높이는 각뿔의 꼭짓점에서 밑면에 수직인 선분의 길이 — ${h} cm예요`,
          wr: [
            { text: '맞게 말했어요', tag: RIGHT_AS_WRONG },
            { text: `높이는 밑면의 한 변과 같은 ${a} cm예요`, tag: TAGS.heightBase },
            { text: '각뿔에는 높이가 없어요', tag: OFF },
          ],
          steps: ['각뿔의 높이는 각뿔의 꼭짓점에서 밑면에 수직인 선분의 길이(점선)', `옆 모서리 ${e} cm는 비스듬해서 높이가 아니에요 → 높이는 ${h} cm`],
          whyAny: '옆 모서리를 높이로 봤어요. 각뿔의 높이는 각뿔의 꼭짓점에서 밑면에 수직인 선분의 길이예요.',
          probe: { ask: 'pyrH', n, a, h, e },
        });
      }
      const n = int(r, 3, 8);
      return misAsk(r, c, this, 'apex', {
        q: `각뿔이 있어요.\n\n[pyramid n=${n}]\n\n${showWork(`이 각뿔에서 각뿔의 꼭짓점은 ${n + 1}개예요`)}`,
        ok: '각뿔의 꼭짓점은 옆면이 모두 만나는 한 점 — 1개예요',
        wr: [
          { text: '맞게 말했어요', tag: RIGHT_AS_WRONG },
          { text: `각뿔의 꼭짓점은 밑면의 꼭짓점 ${n}개예요`, tag: TAGS.apexBase },
          { text: '각뿔에는 꼭짓점이 없어요', tag: OFF },
        ],
        steps: [`${n + 1}개는 꼭짓점 전체의 수예요`, '그중 옆면이 모두 만나는 맨 위의 한 점이 각뿔의 꼭짓점 → 1개'],
        whyAny: '꼭짓점을 모두 각뿔의 꼭짓점으로 셌어요. 각뿔의 꼭짓점은 옆면이 모두 만나는 한 점이에요.',
        probe: { ask: 'apex', n },
      });
    },
  },

  {
    id: 'sol.rule', grade: 6, name: '면·꼭짓점·모서리의 규칙', needs: ['sol.elem'],
    idea: '한 밑면의 변의 수를 □라고 하면 — **각기둥**: 면 □ + 2 · 꼭짓점 □ × 2 · 모서리 □ × 3. **각뿔**: 면 □ + 1 · 꼭짓점 □ + 1 · 모서리 □ × 2. 각기둥은 밑면이 2개라서 꼭짓점이 두 밑면에 □개씩, 모서리는 두 밑면에 □개씩과 두 밑면을 잇는 것 □개예요. 거꾸로 수를 알면 나누거나 빼서 밑면의 변의 수를 찾아요.',
    rule: '각기둥: 면 □ + 2 · 꼭짓점 □ × 2 · 모서리 □ × 3 / 각뿔: 면 □ + 1 · 꼭짓점 □ + 1 · 모서리 □ × 2.',
    slip: '각기둥인지 각뿔인지 먼저 — 규칙이 달라요.',
    calc(r, c) {
      const fams = [];
      const RULE = {
        prism: {
          face: { f: (n) => n + 2, w: (n) => [[n, TAGS.sideOnlyF], [n + 1, TAGS.pyrRule], [2 * n, TAGS.asVertex]], s: (n) => [`옆면 ${n}개 + 밑면 2개`, `${n} + 2 = ${n + 2}`] },
          vertex: { f: (n) => 2 * n, w: (n) => [[n, TAGS.oneBaseV], [n + 1, TAGS.pyrRule], [3 * n, TAGS.swap23]], s: (n) => [`두 밑면에 ${n}개씩`, `${n} × 2 = ${2 * n}`] },
          edge: { f: (n) => 3 * n, w: (n) => [[2 * n, TAGS.pyrRule], [n, TAGS.sameN], [n + 2, TAGS.asFace]], s: (n) => [`두 밑면에 ${n}개씩, 두 밑면을 잇는 모서리 ${n}개`, `${n} × 3 = ${3 * n}`] },
        },
        pyramid: {
          face: { f: (n) => n + 1, w: (n) => [[n + 2, TAGS.prismRule], [n, TAGS.sideOnlyF], [2 * n, TAGS.asEdge]], s: (n) => [`옆면 ${n}개 + 밑면 1개`, `${n} + 1 = ${n + 1}`] },
          vertex: { f: (n) => n + 1, w: (n) => [[2 * n, TAGS.prismRule], [n, TAGS.noApex]], s: (n) => [`밑면에 ${n}개 + 각뿔의 꼭짓점 1개`, `${n} + 1 = ${n + 1}`] },
          edge: { f: (n) => 2 * n, w: (n) => [[3 * n, TAGS.prismRule], [n, TAGS.baseEdgeOnly], [n + 1, TAGS.asVertex]], s: (n) => [`밑면에 ${n}개, 각뿔의 꼭짓점으로 모이는 모서리 ${n}개`, `${n} × 2 = ${2 * n}`] },
        },
      };
      const WORD = { face: '면은', vertex: '꼭짓점은', edge: '모서리는' };
      const WHY = {
        [TAGS.sideOnlyF]: '옆면만 셌어요. 밑면도 면이에요.', [TAGS.pyrRule]: '각뿔의 규칙이에요. 각기둥은 밑면이 2개예요.', [TAGS.prismRule]: '각기둥의 규칙이에요. 각뿔은 밑면이 1개예요.',
        [TAGS.oneBaseV]: '한 밑면의 꼭짓점만 셌어요.', [TAGS.swap23]: '× 3은 모서리의 규칙이에요.', [TAGS.sameN]: '밑면의 변의 수 그대로예요.', [TAGS.noApex]: '각뿔의 꼭짓점을 빼먹었어요.',
        [TAGS.baseEdgeOnly]: '밑면의 모서리만 셌어요.', [TAGS.asVertex]: '꼭짓점의 수예요.', [TAGS.asEdge]: '모서리의 수예요.', [TAGS.asFace]: '면의 수예요.',
      };
      for (const kind of ['prism', 'pyramid']) {
        fams.push(famOf(['face', 'vertex', 'edge'].map((what) => {
          const R = RULE[kind][what];
          const n = intWhere(r, 3, 12, (v) => allDiff(R.f(v), ...R.w(v).map((x) => x[0])));
          const nm = kind === 'prism' ? '각기둥' : '각뿔';
          return {
            t: `밑면의 변이 ${n}개인 ${nm}이 있어요.\n\n이 ${nm}의 ${WORD[what]} 모두 몇 개일까요?`, ans: String(R.f(n)),
            wr: R.w(n).map(([v, tag]) => ({ text: String(v), tag })), steps: R.s(n),
            why: Object.fromEntries(R.w(n).map(([, tag]) => [tag, WHY[tag]])),
            probe: { ask: 'rule', kind, what, n },
          };
        })));
      }
      // 거꾸로 — 수에서 이름 (이름은 보기에만)
      fams.push(famOf([
        (() => { const n = pick(r, [4, 6, 8, 10, 12]); const E = 3 * n; return { t: `모서리가 ${E}개인 각기둥이 있어요.\n\n이 각기둥의 이름은 무엇일까요?`, text: true, ans: prismName(n), wr: [{ text: prismName(E), tag: TAGS.condCount }, { text: prismName(E / 2), tag: TAGS.pyrRule }, { text: pyrName(n), tag: TAGS.kindSwap }], steps: ['각기둥의 모서리 = 밑면의 변의 수 × 3', `${E} ÷ 3 = ${n} → 밑면이 ${polyName(n)} → ${prismName(n)}`], why: { [TAGS.condCount]: '모서리의 수를 그대로 이름에 썼어요. 3으로 나눠요.', [TAGS.pyrRule]: '2로 나눈 것은 각뿔의 규칙이에요.', [TAGS.kindSwap]: '각기둥이라고 했어요.' }, probe: { ask: 'inv', kind: 'prism', what: 'edge', v: E } }; })(),
        (() => { const n = int(r, 3, 12); const F = n + 2; return { t: `면이 ${F}개인 각기둥이 있어요.\n\n이 각기둥의 이름은 무엇일까요?`, text: true, ans: prismName(n), wr: [{ text: prismName(F), tag: TAGS.condCount }, { text: prismName(F - 1), tag: TAGS.pyrRule }, { text: pyrName(n), tag: TAGS.kindSwap }], steps: ['각기둥의 면 = 밑면의 변의 수 + 2', `${F} − 2 = ${n} → ${prismName(n)}`], why: { [TAGS.condCount]: '면의 수를 그대로 이름에 썼어요. 2를 빼요.', [TAGS.pyrRule]: '1을 뺀 것은 각뿔의 규칙이에요.', [TAGS.kindSwap]: '각기둥이라고 했어요.' }, probe: { ask: 'inv', kind: 'prism', what: 'face', v: F } }; })(),
        (() => { const n = pick(r, [6, 9, 12]); const E = 2 * n; return { t: `모서리가 ${E}개인 각뿔이 있어요.\n\n이 각뿔의 이름은 무엇일까요?`, text: true, ans: pyrName(n), wr: [{ text: pyrName(E), tag: TAGS.condCount }, { text: pyrName(E / 3), tag: TAGS.prismRule }, { text: prismName(n), tag: TAGS.kindSwap }], steps: ['각뿔의 모서리 = 밑면의 변의 수 × 2', `${E} ÷ 2 = ${n} → ${pyrName(n)}`], why: { [TAGS.condCount]: '모서리의 수를 그대로 이름에 썼어요. 2로 나눠요.', [TAGS.prismRule]: '3으로 나눈 것은 각기둥의 규칙이에요.', [TAGS.kindSwap]: '각뿔이라고 했어요.' }, probe: { ask: 'inv', kind: 'pyramid', what: 'edge', v: E } }; })(),
        (() => { const n = pick(r, [5, 7, 9, 11]); const V = n + 1; /* n = 3이면 2로 나눈 오답이 "이각뿔" — 없는 입체도형 */ return { t: `꼭짓점이 ${V}개인 각뿔이 있어요.\n\n이 각뿔의 이름은 무엇일까요?`, text: true, ans: pyrName(n), wr: [{ text: pyrName(V), tag: TAGS.condCount }, { text: pyrName(V / 2), tag: TAGS.prismRule }, { text: prismName(n), tag: TAGS.kindSwap }], steps: ['각뿔의 꼭짓점 = 밑면의 변의 수 + 1', `${V} − 1 = ${n} → ${pyrName(n)}`], why: { [TAGS.condCount]: '꼭짓점의 수를 그대로 이름에 썼어요. 1을 빼요.', [TAGS.prismRule]: '2로 나눈 것은 각기둥의 규칙이에요.', [TAGS.kindSwap]: '각뿔이라고 했어요.' }, probe: { ask: 'inv', kind: 'pyramid', what: 'vertex', v: V } }; })(),
      ]));
      return calcAsk(r, c, this, runFamily(r, c, fams));
    },
    misread(r, c) {
      if (branchOf(r, c, ['pyr', 'prism']) === 'pyr') {
        const n = int(r, 4, 12);
        return misAsk(r, c, this, 'pyr', {
          q: `밑면의 변이 ${n}개인 각뿔이 있어요.\n\n${showWork(`이 각뿔의 모서리는 ${n} × 3 = ${3 * n}개예요`)}`,
          ok: `각뿔의 모서리는 밑면의 변의 수 × 2 — ${n} × 2 = ${2 * n}개예요`,
          wr: [
            { text: '맞게 말했어요', tag: RIGHT_AS_WRONG },
            { text: `${n} + 1 = ${n + 1}개예요`, tag: TAGS.asVertex },
            { text: '각뿔의 모서리는 셀 수 없어요', tag: OFF },
          ],
          steps: [`밑면에 ${n}개, 각뿔의 꼭짓점으로 모이는 모서리 ${n}개`, `${n} × 2 = ${2 * n}개`],
          whyAny: '× 3은 각기둥의 규칙이에요. 각뿔은 밑면이 1개라서 모서리가 밑면의 변의 수 × 2예요.',
          probe: { ask: 'rule', kind: 'pyramid', what: 'edge', n },
        });
      }
      const n = int(r, 4, 12);
      return misAsk(r, c, this, 'prism', {
        q: `밑면의 변이 ${n}개인 각기둥이 있어요.\n\n${showWork(`이 각기둥의 꼭짓점은 ${n} + 2 = ${n + 2}개예요`)}`,
        ok: `각기둥의 꼭짓점은 밑면의 변의 수 × 2 — ${n} × 2 = ${2 * n}개예요`,
        wr: [
          { text: '맞게 말했어요', tag: RIGHT_AS_WRONG },
          { text: `한 밑면의 꼭짓점만 세어 ${n}개예요`, tag: TAGS.oneBaseV },
          { text: '각기둥에는 꼭짓점이 없어요', tag: OFF },
        ],
        steps: [`두 밑면에 꼭짓점이 ${n}개씩`, `${n} × 2 = ${2 * n}개`],
        whyAny: '+ 2는 면의 규칙이에요. 각기둥의 꼭짓점은 두 밑면에 있어서 밑면의 변의 수 × 2예요.',
        probe: { ask: 'rule', kind: 'prism', what: 'vertex', n },
      });
    },
  },

  {
    id: 'sol.pnet', grade: 6, name: '각기둥의 전개도', needs: ['sol.rule'],
    idea: '각기둥의 모서리를 잘라서 펼친 그림이 **각기둥의 전개도**예요. 옆면 직사각형이 밑면의 변의 수만큼 한 줄로 이어지고, **두 밑면은 한 줄의 위와 아래에 하나씩** 붙어요 — 같은 쪽에 붙으면 접었을 때 겹쳐요. 접으면 맞닿는 선분은 길이가 같아요: 옆면의 가로 = 밑면의 한 변, 옆면의 세로 = 높이.',
    rule: '옆면은 밑면의 변의 수만큼, 두 밑면은 위·아래에 하나씩 — 맞닿는 선분은 길이가 같아요.',
    slip: '옆면이 몇 개인지, 두 밑면이 서로 다른 쪽에 있는지, 그 선분이 접으면 어디와 맞닿는지 봐요.',
    calc(r, c) {
      const fams = [];
      // 될까 — 세 가지 모양
      const SAME = (n) => (n >= 6 ? [0, 3] : [0, 2]);
      const OK = '네, 각기둥이 돼요'; const NO_SAME = '아니요, 두 밑면이 같은 쪽에 있어서 겹쳐요'; const NO_CNT = '아니요, 옆면의 수가 밑면의 변의 수와 달라요';
      fams.push(famOf([
        (() => { const n = int(r, 3, 8); const i = int(r, 0, n - 1); const j = int(r, 0, n - 1); return { t: `직사각형 ${n}개와 정다각형 2개를 이어 붙였어요.\n\n[pnet n=${n} up=${i} dn=${j}]\n\n이 그림을 접으면 각기둥이 될까요?`, text: true, ans: OK, wr: [{ text: NO_SAME, tag: TAGS.validNo }, { text: NO_CNT, tag: TAGS.validNo }], steps: [`옆면 직사각형 ${n}개 = 밑면의 변 ${n}개`, '두 밑면이 위·아래에 하나씩 → 접으면 각기둥이 돼요'], why: { [TAGS.validNo]: '옆면의 수가 밑면의 변의 수와 같고, 두 밑면이 위·아래에 하나씩이라 각기둥이 돼요.' }, probe: { ask: 'isnet', n } }; })(),
        (() => { const n = int(r, 3, 8); const [i, j] = SAME(n); return { t: `직사각형 ${n}개와 정다각형 2개를 이어 붙였어요.\n\n[pnet n=${n} up=${i},${j}]\n\n이 그림을 접으면 각기둥이 될까요?`, text: true, ans: NO_SAME, wr: [{ text: OK, tag: TAGS.sameSideOk }, { text: NO_CNT, tag: TAGS.wrongReason }], steps: ['두 밑면이 모두 위쪽에 붙어 있어요', '접으면 두 밑면이 같은 자리에서 겹치고 아래쪽은 비어요 → 각기둥이 안 돼요'], why: { [TAGS.sameSideOk]: '두 밑면이 같은 쪽에 있으면 접었을 때 겹쳐요.', [TAGS.wrongReason]: `옆면은 ${n}개로 밑면의 변의 수와 같아요. 안 되는 까닭은 두 밑면의 자리예요.` }, probe: { ask: 'isnet', n } }; })(),
        (() => { const n = int(r, 3, 7); const s = n + 1; const i = int(r, 0, s - 1); const j = int(r, 0, s - 1); return { t: `직사각형 ${s}개와 정다각형 2개를 이어 붙였어요.\n\n[pnet n=${n} s=${s} up=${i} dn=${j}]\n\n이 그림을 접으면 각기둥이 될까요?`, text: true, ans: NO_CNT, wr: [{ text: OK, tag: TAGS.sideCountOk }, { text: NO_SAME, tag: TAGS.wrongReason }], steps: [`밑면의 변은 ${n}개인데 옆면 직사각형은 ${s}개`, '옆면이 하나 남아서 각기둥이 안 돼요'], why: { [TAGS.sideCountOk]: '옆면의 수는 밑면의 변의 수와 같아야 해요.', [TAGS.wrongReason]: '두 밑면은 위·아래에 하나씩 있어요. 안 되는 까닭은 옆면의 수예요.' }, probe: { ask: 'isnet', n } }; })(),
      ]));
      // 무슨 각기둥의 전개도
      fams.push(famOf([(() => {
        const n = int(r, 3, 8); const i = int(r, 0, n - 1); const j = int(r, 0, n - 1);
        return {
          t: `각기둥의 전개도예요.\n\n[pnet n=${n} up=${i} dn=${j}]\n\n이 전개도를 접어서 만든 각기둥의 이름은 무엇일까요?`, text: true, ans: prismName(n),
          wr: [{ text: prismName(n + 2), tag: TAGS.byFace }, { text: pyrName(n), tag: TAGS.kindSwap }, { text: prismName(2 * n), tag: TAGS.byVertex }],
          steps: [`밑면은 변이 ${n}개인 ${polyName(n)}, 옆면 직사각형 ${n}개`, `→ ${prismName(n)}`],
          why: { [TAGS.byFace]: '면의 수로 붙인 이름이에요. 밑면의 모양으로 붙여요.', [TAGS.kindSwap]: '옆면이 직사각형이라 각기둥이에요.', [TAGS.byVertex]: '꼭짓점의 수로 붙인 이름이에요.' },
          probe: { ask: 'netName', n },
        };
      })()]));
      // ? 길이 — 맞닿는 선분
      fams.push(famOf([
        (() => {
          const n = int(r, 3, 8); const a = int(r, 2, 8); const h = intWhere(r, 3, 12, (v) => v !== a && v !== a * n && pnetOK(a, v)); const i = int(r, 0, n - 1); const j = int(r, 0, n - 1);
          return {
            t: `밑면이 정다각형인 각기둥의 전개도예요.\n\n[pnet n=${n} a=${a} h=${h} up=${i} dn=${j} q=base]\n\n?로 표시한 선분의 길이는 몇 cm일까요?`, ans: String(a),
            wr: [{ text: String(h), tag: TAGS.lenSwap }, { text: String(a * n), tag: TAGS.perimAsSide }],
            steps: ['?는 밑면 정다각형의 한 변이에요', `밑면은 정다각형이라 변의 길이가 모두 같고, 옆면의 가로와 맞닿아요 → ${a} cm`],
            why: { [TAGS.lenSwap]: `${h} cm는 높이(옆면의 세로)예요.`, [TAGS.perimAsSide]: `${a * n} cm는 밑면의 둘레예요.` },
            probe: { ask: 'netLen', n, a, h, q: 'base' },
          };
        })(),
        (() => {
          const n = int(r, 3, 8); const a = int(r, 2, 8); const h = intWhere(r, 3, 12, (v) => v !== a && v !== a * n && pnetOK(a, v)); const i = int(r, 0, n - 1); const j = int(r, 0, n - 1);
          return {
            t: `밑면이 정다각형인 각기둥의 전개도예요.\n\n[pnet n=${n} a=${a} h=${h} up=${i} dn=${j} q=end]\n\n?로 표시한 선분의 길이는 몇 cm일까요?`, ans: String(h),
            wr: [{ text: String(a), tag: TAGS.lenSwap }, { text: String(a * n), tag: TAGS.stripLen }],
            steps: ['?는 옆면 줄의 왼쪽 끝 세로 선분 — 접으면 오른쪽 끝 세로 선분과 맞닿아요', `오른쪽 끝 세로가 ${h} cm → ? = ${h} cm`],
            why: { [TAGS.lenSwap]: `${a} cm는 밑면의 한 변(옆면의 가로)이에요.`, [TAGS.stripLen]: `${a * n} cm는 옆면을 모두 이은 가로 길이예요.` },
            probe: { ask: 'netLen', n, a, h, q: 'end' },
          };
        })(),
      ]));
      // 직각삼각형 밑면 — 맞닿는 변 (교과서 3·4·5). ? 자리마다 틀을 따로 (틀 안에서 고르면 🔁 쌍둥이 열쇠가 갈렸다)
      fams.push(famOf(['up0', 'up1', 'dn0', 'dn1'].map((q) => {
        const k = pick(r, [1, 2]); const base = shuffle(r, [3 * k, 4 * k, 5 * k]); const h = intWhere(r, 4, 12, (v) => !base.includes(v));
        const i = int(r, 0, 2); const j = int(r, 0, 2);
        const at = q.startsWith('up') ? i : j; const ans = q.endsWith('0') ? base[(at + 2) % 3] : base[(at + 1) % 3];
        const others = base.filter((v) => v !== ans);
        return {
          t: `밑면이 직각삼각형인 각기둥의 전개도예요.\n\n[pnet rt=${base.join(',')} h=${h} up=${i} dn=${j} q=${q}]\n\n?로 표시한 선분의 길이는 몇 cm일까요?`, ans: String(ans),
          wr: [{ text: String(others[0]), tag: TAGS.rtWrongSide }, { text: String(others[1]), tag: TAGS.rtWrongSide }, { text: String(h), tag: TAGS.lenSwap }],
          steps: ['?인 삼각형의 변은 접으면 바로 옆 직사각형의 가로와 맞닿아요', `맞닿는 직사각형의 가로가 ${ans} cm → ? = ${ans} cm`],
          why: { [TAGS.rtWrongSide]: '접었을 때 맞닿는 직사각형이 아니에요. ?가 있는 꼭짓점에서 이어진 직사각형을 찾아요.', [TAGS.lenSwap]: `${h} cm는 높이예요.` },
          probe: { ask: 'rtLen', base, h, i, j, q },
        };
      })));
      // 옆면의 수
      fams.push(famOf([(() => {
        const n = int(r, 3, 8); const i = int(r, 0, n - 1); const j = int(r, 0, n - 1);
        return {
          t: `각기둥의 전개도예요.\n\n[pnet n=${n} up=${i} dn=${j}]\n\n이 전개도를 접어서 만든 각기둥의 옆면은 몇 개일까요?`, ans: String(n),
          wr: [{ text: String(n + 2), tag: TAGS.allFaces }, { text: '2', tag: TAGS.baseCount }],
          steps: ['옆면은 한 줄로 이어진 직사각형이에요', `직사각형을 세면 ${n}개`],
          why: { [TAGS.allFaces]: '두 밑면까지 센 면 전체의 수예요.', [TAGS.baseCount]: '2는 밑면의 수예요.' },
          probe: { ask: 'netSides', n },
        };
      })()]));
      return calcAsk(r, c, this, runFamily(r, c, fams));
    },
    misread(r, c) {
      if (branchOf(r, c, ['same', 'count']) === 'same') {
        const n = int(r, 3, 8); const [i, j] = n >= 6 ? [0, 3] : [0, 2];
        return misAsk(r, c, this, 'same', {
          q: `직사각형 ${n}개와 정다각형 2개를 이어 붙였어요.\n\n[pnet n=${n} up=${i},${j}]\n\n${showWork('옆면의 수가 맞으니까 접으면 각기둥이 돼요')}`,
          ok: '두 밑면이 모두 위쪽에 있어서 접으면 겹쳐요 — 각기둥이 안 돼요',
          wr: [
            { text: '맞게 말했어요', tag: RIGHT_AS_WRONG },
            { text: '옆면이 하나 모자라서 각기둥이 안 돼요', tag: TAGS.wrongReason },
            { text: '정다각형은 접을 수 없어요', tag: OFF },
          ],
          steps: ['두 밑면은 옆면 줄의 위와 아래에 하나씩 있어야 해요', '이 그림은 둘 다 위 — 접으면 겹치고 아래가 비어요'],
          whyAny: '옆면의 수만 봤어요. 두 밑면이 같은 쪽에 있으면 접었을 때 겹쳐요.',
          probe: { ask: 'isnet', n },
        });
      }
      const n = int(r, 3, 7); const s = n + 1; const i = int(r, 0, s - 1); const j = int(r, 0, s - 1);
      return misAsk(r, c, this, 'count', {
        q: `직사각형 ${s}개와 정다각형 2개를 이어 붙였어요.\n\n[pnet n=${n} s=${s} up=${i} dn=${j}]\n\n${showWork('두 밑면이 위·아래에 하나씩 있으니까 접으면 각기둥이 돼요')}`,
        ok: `밑면의 변은 ${n}개인데 옆면이 ${s}개예요 — 각기둥이 안 돼요`,
        wr: [
          { text: '맞게 말했어요', tag: RIGHT_AS_WRONG },
          { text: '두 밑면이 같은 쪽에 있어서 안 돼요', tag: TAGS.wrongReason },
          { text: '직사각형은 접을 수 없어요', tag: OFF },
        ],
        steps: ['옆면의 수는 밑면의 변의 수와 같아야 해요', `밑면의 변 ${n}개, 옆면 ${s}개 → 옆면 하나가 남아요`],
        whyAny: '두 밑면의 자리만 봤어요. 옆면의 수가 밑면의 변의 수와 같아야 각기둥이 돼요.',
        probe: { ask: 'isnet', n },
      });
    },
  },

  {
    id: 'sol.round', grade: 6, name: '원기둥과 원뿔', needs: ['sol.pnet'],
    idea: '서로 평행하고 합동인 **두 원**을 밑면으로 하는 기둥 모양을 **원기둥**이라고 해요 — 옆면은 굽은 면이고, 두 밑면 사이의 거리가 **높이**예요. 밑면이 **원 1개**이고 뾰족한 뿔 모양을 **원뿔**이라고 해요. 뾰족한 점이 **원뿔의 꼭짓점**, 원뿔의 꼭짓점과 밑면의 둘레의 한 점을 이은 선분이 **모선**(셀 수 없이 많고 길이가 모두 같아요), 원뿔의 꼭짓점에서 밑면에 수직인 선분의 길이가 **높이**예요. 직사각형의 한 변을 축으로 한 바퀴 돌리면 원기둥, 직각삼각형의 직각을 낀 변을 축으로 돌리면 원뿔이 돼요 — 축에서 떨어진 변의 길이가 밑면의 **반지름**이에요.',
    rule: '원기둥: 밑면 2개(원), 높이 = 두 밑면 사이의 거리 / 원뿔: 높이 = 꼭짓점에서 밑면에 수직인 선분, 모선은 비스듬한 선분.',
    slip: '높이가 수직인 선분인지, 반지름인지 지름인지 다시 봐요.',
    calc(r, c) {
      const fams = [];
      // 원기둥 — 높이·지름
      fams.push(famOf([
        (() => { const R = int(r, 2, 8); const H = intWhere(r, 3, 15, (v) => v !== 2 * R && v !== R && v / R >= 0.5 && v / R <= 3.5); return { t: `원기둥이 있어요.\n\n[cyl r=${R} h=${H}]\n\n이 원기둥의 높이는 몇 cm일까요?`, ans: String(H), wr: [{ text: String(2 * R), tag: TAGS.diaAsH }, { text: String(R), tag: TAGS.radAsH }], steps: ['원기둥의 높이는 두 밑면 사이의 거리', `→ ${H} cm`], why: { [TAGS.diaAsH]: `${2 * R} cm는 밑면의 지름이에요.`, [TAGS.radAsH]: `${R} cm는 밑면의 반지름이에요.` }, probe: { ask: 'cylH', R, H } }; })(),
        (() => { const R = int(r, 2, 8); const H = intWhere(r, 3, 15, (v) => v !== 2 * R && v !== R && v / R >= 0.5 && v / R <= 3.5); return { t: `원기둥이 있어요.\n\n[cyl r=${R} h=${H}]\n\n이 원기둥의 밑면의 지름은 몇 cm일까요?`, ans: String(2 * R), wr: [{ text: String(R), tag: TAGS.rAsD }, { text: String(H), tag: TAGS.hAsD }], steps: [`밑면의 반지름이 ${R} cm`, `지름 = 반지름 × 2 = ${R} × 2 = ${2 * R}`], why: { [TAGS.rAsD]: `${R} cm는 반지름이에요. 지름은 반지름의 2배예요.`, [TAGS.hAsD]: `${H} cm는 높이예요.` }, probe: { ask: 'cylD', R, H } }; })(),
      ]));
      // 원뿔 — 높이·모선
      fams.push(famOf([
        (() => { const [R, H, L] = pick(r, CONE_SETS.filter(([x, y]) => allDiff(y, 2 * x) && y !== x)); return { t: `원뿔이 있어요.\n\n[cone r=${R} h=${H} l=${L}]\n\n이 원뿔의 높이는 몇 cm일까요?`, ans: String(H), wr: [{ text: String(L), tag: TAGS.slantAsH }, { text: String(2 * R), tag: TAGS.diaAsH }], steps: ['원뿔의 높이는 원뿔의 꼭짓점에서 밑면에 수직인 선분의 길이(점선)', `→ ${H} cm`], why: { [TAGS.slantAsH]: `${L} cm는 모선이에요. 비스듬해서 높이가 아니에요.`, [TAGS.diaAsH]: `${2 * R} cm는 밑면의 지름이에요.` }, probe: { ask: 'coneH', R, H, L } }; })(),
        (() => { const [R, H, L] = pick(r, CONE_SETS); return { t: `원뿔이 있어요.\n\n[cone r=${R} h=${H} l=${L}]\n\n이 원뿔의 모선의 길이는 몇 cm일까요?`, ans: String(L), wr: [{ text: String(H), tag: TAGS.hAsSlant }, { text: String(R), tag: TAGS.rAsSlant }], steps: ['모선은 원뿔의 꼭짓점과 밑면의 둘레의 한 점을 이은 비스듬한 선분', `→ ${L} cm`], why: { [TAGS.hAsSlant]: `${H} cm는 높이예요. 모선은 비스듬한 선분이에요.`, [TAGS.rAsSlant]: `${R} cm는 밑면의 반지름이에요.` }, probe: { ask: 'coneL', R, H, L } }; })(),
      ]));
      // 모선의 수
      fams.push(famOf([(() => {
        const [R, H, L] = pick(r, CONE_SETS);
        return {
          t: `원뿔이 있어요.\n\n[cone r=${R} l=${L}]\n\n이 원뿔의 모선을 바르게 말한 것은 어느 것일까요?`, text: true, ans: '셀 수 없이 많고, 길이가 모두 같아요',
          wr: [{ text: '1개뿐이에요', tag: TAGS.oneSlant }, { text: '그림에 그린 2개뿐이에요', tag: TAGS.twoSlant }],
          steps: ['밑면의 둘레의 점마다 원뿔의 꼭짓점과 이을 수 있어요', '그래서 모선은 셀 수 없이 많고 길이가 모두 같아요'],
          why: { [TAGS.oneSlant]: '둘레의 어느 점에서나 모선을 그을 수 있어요.', [TAGS.twoSlant]: '그림에 그린 것은 2개지만 둘레를 따라 셀 수 없이 많아요.' },
          probe: { ask: 'slants', R, H, L },
        };
      })()]));
      // 돌리기
      fams.push(famOf([
        (() => { const a = int(r, 2, 8); const b = intWhere(r, 3, 15, (v) => v !== 2 * a && v !== a && Math.max(v, a) <= 4 * Math.min(v, a)); return { t: `직사각형의 한 변을 축으로 한 바퀴 돌렸어요.\n\n[spin rect ${a} ${b}]\n\n만들어진 입체도형의 밑면의 지름은 몇 cm일까요?`, ans: String(2 * a), wr: [{ text: String(a), tag: TAGS.rAsD }, { text: String(b), tag: TAGS.spinSide }], steps: [`축에서 ${a} cm 떨어진 변이 돌아요 — 밑면의 반지름이 ${a} cm`, `지름 = ${a} × 2 = ${2 * a}`], why: { [TAGS.rAsD]: `${a} cm는 반지름이에요. 축의 양쪽으로 돌아서 지름은 2배예요.`, [TAGS.spinSide]: `${b} cm는 축에 붙은 변 — 높이예요.` }, probe: { ask: 'spinD', shape: 'rect', a, b } }; })(),
        (() => { const [a, b, cc] = pick(r, CONE_SETS); return { t: `직각삼각형의 직각을 낀 한 변을 축으로 한 바퀴 돌렸어요.\n\n[spin tri ${a} ${b} c=${cc}]\n\n만들어진 입체도형의 높이는 몇 cm일까요?`, ans: String(b), wr: [{ text: String(cc), tag: TAGS.slantAsH }, { text: String(a), tag: TAGS.spinSide }], steps: ['축에 붙은 변이 높이가 돼요', `→ ${b} cm (빗변 ${cc} cm는 모선)`], why: { [TAGS.slantAsH]: `${cc} cm는 빗변 — 모선이 돼요.`, [TAGS.spinSide]: `${a} cm는 밑면의 반지름이 되는 변이에요.` }, probe: { ask: 'spinH', shape: 'tri', a, b, c: cc } }; })(),
        (() => { const [a, b, cc] = pick(r, CONE_SETS.filter(([x, y, z]) => allDiff(2 * x, x, y, z))); return { t: `직각삼각형의 직각을 낀 한 변을 축으로 한 바퀴 돌렸어요.\n\n[spin tri ${a} ${b} c=${cc}]\n\n만들어진 입체도형의 밑면의 지름은 몇 cm일까요?`, ans: String(2 * a), wr: [{ text: String(a), tag: TAGS.rAsD }, { text: String(b), tag: TAGS.spinSide }, { text: String(cc), tag: TAGS.rAsSlant }], steps: [`축에서 ${a} cm 떨어진 변 — 밑면의 반지름 ${a} cm`, `지름 = ${a} × 2 = ${2 * a}`], why: { [TAGS.rAsD]: `${a} cm는 반지름이에요.`, [TAGS.spinSide]: `${b} cm는 축에 붙은 변 — 높이예요.`, [TAGS.rAsSlant]: `${cc} cm는 모선이 되는 빗변이에요.` }, probe: { ask: 'spinD', shape: 'tri', a, b, c: cc } }; })(),
      ]));
      fams.push(famOf([
        (() => { const a = int(r, 2, 8); const b = intWhere(r, 3, 15, (v) => v !== a && Math.max(v, a) <= 4 * Math.min(v, a)); return { t: `직사각형의 한 변을 축으로 한 바퀴 돌렸어요.\n\n[spin rect ${a} ${b}]\n\n만들어진 입체도형은 무엇일까요?`, text: true, ans: '원기둥', wr: [{ text: '원뿔', tag: TAGS.roundSwap }, { text: '사각기둥', tag: TAGS.roundPoly }], steps: ['직사각형을 한 바퀴 돌리면 위·아래가 합동인 원 — 기둥 모양', '→ 원기둥'], why: { [TAGS.roundSwap]: '원뿔은 직각삼각형을 돌려서 만들어요.', [TAGS.roundPoly]: '돌려 만든 입체도형의 밑면은 원이에요.' }, probe: { ask: 'spinKind', shape: 'rect' } }; })(),
        (() => { const [a, b, cc] = pick(r, CONE_SETS); return { t: `직각삼각형의 직각을 낀 한 변을 축으로 한 바퀴 돌렸어요.\n\n[spin tri ${a} ${b} c=${cc}]\n\n만들어진 입체도형은 무엇일까요?`, text: true, ans: '원뿔', wr: [{ text: '원기둥', tag: TAGS.roundSwap }, { text: '삼각뿔', tag: TAGS.roundPoly }], steps: ['직각삼각형을 돌리면 밑면이 원 하나, 위가 뾰족', '→ 원뿔'], why: { [TAGS.roundSwap]: '원기둥은 직사각형을 돌려서 만들어요.', [TAGS.roundPoly]: '돌려 만든 입체도형의 밑면은 원이에요.' }, probe: { ask: 'spinKind', shape: 'tri' } }; })(),
      ]));
      // 원기둥과 각기둥
      fams.push(famOf([(() => {
        const n = int(r, 3, 8);
        return {
          t: `원기둥과 각기둥이 있어요.\n\n[cyl r=3 h=6]\n\n[prism n=${n}]\n\n원기둥과 각기둥의 다른 점을 바르게 말한 것은 어느 것일까요?`, text: true, ans: '원기둥은 옆면이 굽은 면이고 꼭짓점이 없어요',
          wr: [{ text: '원기둥에도 꼭짓점이 있어요', tag: TAGS.cylVertex }, { text: '원기둥은 밑면이 1개예요', tag: TAGS.oneBaseCyl }],
          steps: ['원기둥의 밑면은 원, 옆면은 굽은 면이라 모서리도 꼭짓점도 없어요', '각기둥은 밑면이 다각형, 옆면이 직사각형이고 꼭짓점이 있어요'],
          why: { [TAGS.cylVertex]: '원기둥에는 모서리가 없어서 꼭짓점도 없어요.', [TAGS.oneBaseCyl]: '원기둥의 밑면은 서로 평행하고 합동인 원 2개예요.' },
          probe: { ask: 'cylVsPrism' },
        };
      })()]));
      return calcAsk(r, c, this, runFamily(r, c, fams));
    },
    misread(r, c) {
      if (branchOf(r, c, ['slant', 'spin']) === 'slant') {
        const [R, H, L] = pick(r, CONE_SETS.filter(([x, y]) => 2 * x !== y));
        return misAsk(r, c, this, 'slant', {
          q: `원뿔이 있어요.\n\n[cone r=${R} h=${H} l=${L}]\n\n${showWork(`이 원뿔의 높이는 모선의 길이와 같은 ${L} cm예요`)}`,
          ok: `높이는 원뿔의 꼭짓점에서 밑면에 수직인 선분의 길이 — ${H} cm예요`,
          wr: [
            { text: '맞게 말했어요', tag: RIGHT_AS_WRONG },
            { text: `높이는 밑면의 지름과 같은 ${2 * R} cm예요`, tag: TAGS.diaAsH },
            { text: '원뿔에는 높이가 없어요', tag: OFF },
          ],
          steps: ['원뿔의 높이는 원뿔의 꼭짓점에서 밑면에 수직인 선분의 길이(점선)', `모선 ${L} cm는 비스듬해서 높이가 아니에요 → ${H} cm`],
          whyAny: '모선을 높이로 봤어요. 높이는 원뿔의 꼭짓점에서 밑면에 수직인 선분의 길이예요.',
          probe: { ask: 'coneH', R, H, L },
        });
      }
      const a = int(r, 2, 8); const b = intWhere(r, 3, 15, (v) => v !== 2 * a && v !== a && Math.max(v, a) <= 4 * Math.min(v, a));
      return misAsk(r, c, this, 'spin', {
        q: `직사각형의 한 변을 축으로 한 바퀴 돌렸어요.\n\n[spin rect ${a} ${b}]\n\n${showWork(`만들어진 원기둥의 밑면의 지름은 ${a} cm예요`)}`,
        ok: `축에서 ${a} cm 떨어진 변이 돌아서 반지름이 ${a} cm — 지름은 ${2 * a} cm예요`,
        wr: [
          { text: '맞게 말했어요', tag: RIGHT_AS_WRONG },
          { text: `밑면의 지름은 축에 붙은 변과 같은 ${b} cm예요`, tag: TAGS.spinSide },
          { text: '돌려 만든 입체도형에는 밑면이 없어요', tag: OFF },
        ],
        steps: [`축에서 ${a} cm 떨어진 변이 한 바퀴 돌며 원을 그려요 — 반지름 ${a} cm`, `지름 = ${a} × 2 = ${2 * a} cm`],
        whyAny: '반지름을 지름으로 봤어요. 축의 양쪽으로 돌아서 지름은 반지름의 2배예요.',
        probe: { ask: 'spinD', shape: 'rect', a, b },
      });
    },
  },

  {
    id: 'sol.sphere', grade: 6, name: '구', needs: ['sol.round'],
    idea: '공처럼 둥근 입체도형을 **구**라고 해요. 구에서 가장 안쪽에 있는 점이 **구의 중심**, 구의 중심에서 구의 겉면의 한 점을 이은 선분이 **구의 반지름**이에요 — 반지름은 셀 수 없이 많고 길이가 모두 같아요. 반원의 지름을 축으로 한 바퀴 돌리면 구가 돼요: 반원의 지름 = 구의 지름. 원기둥은 위에서 보면 원·앞에서 보면 직사각형, 원뿔은 위에서 보면 원·앞에서 보면 삼각형, 구는 **어느 방향에서 보아도 원**이에요.',
    rule: '구의 반지름은 모두 같고 셀 수 없이 많아요 · 반원을 돌리면 반원의 지름 = 구의 지름 · 구는 어느 쪽에서 보아도 원.',
    slip: '반지름인지 지름인지, 위에서 본 것인지 앞에서 본 것인지 다시 봐요.',
    calc(r, c) {
      const fams = [];
      fams.push(famOf([
        (() => { const R = int(r, 2, 20); return { t: `구가 있어요.\n\n[sphere r=${R}]\n\n이 구의 지름은 몇 cm일까요?`, ans: String(2 * R), wr: [{ text: String(R), tag: TAGS.rAsD }, { text: String(4 * R), tag: TAGS.doubleD }], steps: [`구의 반지름이 ${R} cm`, `지름 = ${R} × 2 = ${2 * R}`], why: { [TAGS.rAsD]: `${R} cm는 반지름이에요.`, [TAGS.doubleD]: '두 배를 두 번 했어요.' }, probe: { ask: 'sphD', R } }; })(),
        (() => { const R = int(r, 2, 15); return { t: `구가 있어요.\n\n[sphere d=${2 * R}]\n\n이 구의 반지름은 몇 cm일까요?`, ans: String(R), wr: [{ text: String(2 * R), tag: TAGS.dAsR }, { text: String(4 * R), tag: TAGS.doubleD }], steps: [`구의 지름이 ${2 * R} cm`, `반지름 = ${2 * R} ÷ 2 = ${R}`], why: { [TAGS.dAsR]: `${2 * R} cm는 지름이에요. 반지름은 지름의 반이에요.`, [TAGS.doubleD]: '지름을 두 배로 했어요. 반지름은 반으로 나눠요.' }, probe: { ask: 'sphR', R } }; })(),
      ]));
      // 반원 돌리기
      fams.push(famOf([
        (() => { const R = int(r, 2, 15); return { t: `반원의 지름을 축으로 한 바퀴 돌렸어요.\n\n[spin half ${2 * R}]\n\n만들어진 구의 반지름은 몇 cm일까요?`, ans: String(R), wr: [{ text: String(2 * R), tag: TAGS.halfDAsR }, { text: String(4 * R), tag: TAGS.doubleD }], steps: [`반원의 지름 ${2 * R} cm가 구의 지름이 돼요`, `반지름 = ${2 * R} ÷ 2 = ${R}`], why: { [TAGS.halfDAsR]: '반원의 지름은 구의 지름이에요. 반지름은 그 반이에요.', [TAGS.doubleD]: '지름을 두 배로 했어요.' }, probe: { ask: 'halfR', D: 2 * R } }; })(),
        (() => { const R = int(r, 2, 15); return { t: `반원의 지름을 축으로 한 바퀴 돌렸어요.\n\n[spin half ${2 * R}]\n\n만들어진 구의 지름은 몇 cm일까요?`, ans: String(2 * R), wr: [{ text: String(R), tag: TAGS.dAsR }, { text: String(4 * R), tag: TAGS.doubleD }], steps: [`반원의 지름이 그대로 구의 지름 — ${2 * R} cm`], why: { [TAGS.dAsR]: '반지름이에요. 반원의 지름이 그대로 구의 지름이에요.', [TAGS.doubleD]: '반원의 지름을 두 배로 했어요. 그대로 구의 지름이에요.' }, probe: { ask: 'halfD', D: 2 * R } }; })(),
      ]));
      // 반지름의 수
      fams.push(famOf([(() => {
        const R = int(r, 3, 12);
        return {
          t: `구가 있어요.\n\n[sphere r=${R}]\n\n이 구의 반지름을 바르게 말한 것은 어느 것일까요?`, text: true, ans: '셀 수 없이 많고, 길이가 모두 같아요',
          wr: [{ text: '1개뿐이에요', tag: TAGS.oneRadius }, { text: '셀 수 없이 많고, 길이가 모두 달라요', tag: TAGS.radiusDiff }],
          steps: ['구의 중심에서 겉면의 어느 점으로나 선분을 그을 수 있어요', '그래서 반지름은 셀 수 없이 많고 길이가 모두 같아요'],
          why: { [TAGS.oneRadius]: '구의 중심에서 겉면의 어느 점으로나 그을 수 있어요 — 반지름은 셀 수 없이 많아요.', [TAGS.radiusDiff]: '구의 중심에서 겉면의 어느 점까지나 거리가 같아요 — 반지름의 길이는 모두 같아요.' },
          probe: { ask: 'radii', R },
        };
      })()]));
      // 본 모양
      const VIEW = [
        { solid: '원기둥', fig: '[cyl r=3 h=5]', dir: '앞', ans: '직사각형', wr: [['원', TAGS.viewTop], ['삼각형', TAGS.viewSwap]] },
        { solid: '원기둥', fig: '[cyl r=3 h=5]', dir: '위', ans: '원', wr: [['직사각형', TAGS.viewFront], ['삼각형', TAGS.otherFront]] },
        { solid: '원뿔', fig: '[cone r=3 h=4 l=5]', dir: '앞', ans: '삼각형', wr: [['원', TAGS.viewTop], ['직사각형', TAGS.viewSwap]] },
        { solid: '원뿔', fig: '[cone r=3 h=4 l=5]', dir: '위', ans: '원', wr: [['삼각형', TAGS.viewFront], ['직사각형', TAGS.otherFront]] },
        { solid: '구', fig: '[sphere r=4]', dir: '앞', ans: '원', wr: [['반원', TAGS.sphereView], ['직사각형', TAGS.sphereView]] },
      ];
      fams.push(famOf(VIEW.map((v) => ({
        t: `${v.solid === '구' ? '구가' : `${v.solid}이`} 있어요.\n\n${v.fig}\n\n이 입체도형을 ${v.dir}에서 본 모양은 어떤 도형일까요?`, text: true, ans: v.ans,
        wr: v.wr.map(([text, tag]) => ({ text, tag })),
        steps: [`${jw(v.solid, '을', '를')} ${v.dir}에서 보면`, `→ ${v.ans}`],
        why: { [TAGS.viewTop]: '위에서 본 모양이에요.', [TAGS.viewFront]: '앞에서 본 모양이에요.', [TAGS.viewSwap]: '원기둥과 원뿔을 바꿔 생각했어요.', [TAGS.otherFront]: '다른 입체도형을 앞에서 본 모양이에요. 위에서 보면 원기둥도 원뿔도 원이에요.', [TAGS.sphereView]: '구는 어느 방향에서 보아도 원이에요.' },
        probe: { ask: 'view', solid: v.solid, dir: v.dir },
      }))));
      fams.push(famOf([{
        t: '원기둥, 원뿔, 구가 있어요.\n\n[cyl r=3 h=5]\n\n[cone r=3 h=4 l=5]\n\n[sphere r=4]\n\n어느 방향에서 보아도 모양이 같은 입체도형은 무엇일까요?', text: true, ans: '구',
        wr: [{ text: '원기둥', tag: TAGS.viewOne }, { text: '원뿔', tag: TAGS.viewOne }],
        steps: ['원기둥은 앞에서 보면 직사각형, 원뿔은 앞에서 보면 삼각형', '구는 어느 방향에서 보아도 원 → 구'],
        why: { [TAGS.viewOne]: '위에서 본 모양만 봤어요. 앞에서 보면 원이 아니에요.' },
        probe: { ask: 'viewSame' },
      }]));
      return calcAsk(r, c, this, runFamily(r, c, fams));
    },
    misread(r, c) {
      if (branchOf(r, c, ['half', 'view']) === 'half') {
        const R = int(r, 2, 15);
        return misAsk(r, c, this, 'half', {
          q: `반원의 지름을 축으로 한 바퀴 돌렸어요.\n\n[spin half ${2 * R}]\n\n${showWork(`반원의 지름이 ${2 * R} cm이니까 구의 반지름도 ${2 * R} cm예요`)}`,
          ok: `반원의 지름이 구의 지름 — 구의 반지름은 ${R} cm예요`,
          wr: [
            { text: '맞게 말했어요', tag: RIGHT_AS_WRONG },
            { text: `구의 반지름은 ${4 * R} cm예요`, tag: TAGS.doubleD },
            { text: '반원을 돌리면 원기둥이 돼요', tag: OFF },
          ],
          steps: [`반원의 지름 ${2 * R} cm가 축 — 구의 지름이 돼요`, `반지름 = ${2 * R} ÷ 2 = ${R} cm`],
          whyAny: '반원의 지름을 구의 반지름으로 봤어요. 반원의 지름이 구의 지름이에요.',
          probe: { ask: 'halfR', D: 2 * R },
        });
      }
      return misAsk(r, c, this, 'view', {
        q: `구가 있어요.\n\n[sphere r=4]\n\n${showWork('구는 앞에서 보면 원이지만 위에서 보면 다른 모양이에요')}`,
        ok: '구는 어느 방향에서 보아도 원이에요',
        wr: [
          { text: '맞게 말했어요', tag: RIGHT_AS_WRONG },
          { text: '구는 위에서 보면 직사각형이에요', tag: TAGS.sphereView },
          { text: '구는 볼 수 없어요', tag: OFF },
        ],
        steps: ['구는 중심에서 겉면까지 거리가 모두 같아요', '그래서 어느 방향에서 보아도 원이에요'],
        whyAny: '구는 보는 방향이 바뀌어도 모양이 그대로 원이에요.',
        probe: { ask: 'view', solid: '구' },
      });
    },
  },

  {
    id: 'sol.cnet', grade: 6, name: '원기둥의 전개도', needs: ['sol.sphere'],
    idea: '원기둥을 잘라서 펼친 그림이 **원기둥의 전개도**예요 — 밑면인 원 2개와 옆면인 **직사각형** 1개. 옆면을 감아 두 밑면에 붙이니까 **옆면의 가로 = 밑면의 둘레(지름 × 원주율)**, **옆면의 세로 = 원기둥의 높이**예요. 두 원은 직사각형의 위와 아래에 하나씩, 크기가 같아야 해요.',
    rule: '옆면의 가로 = 밑면의 둘레(지름 × 원주율) · 옆면의 세로 = 높이.',
    slip: '옆면의 가로는 둘레 — 지름에 원주율을 곱했는지 봐요.',
    calc(r, c) {
      const fams = [];
      // 옆면의 가로
      fams.push(famOf([
        (() => {
          const R = int(r, 2, 9); const H = intWhere(r, 3, 12, (v) => v !== 2 * R && v / R >= 0.5 && v / R <= 5);
          const ans = piOf(2 * R); const w1 = piOf(R);
          return {
            t: `원기둥의 전개도예요.\n\n[cnet r=${R} h=${H} w=?]\n\n${PI_LINE}\n옆면의 가로(?)는 몇 cm일까요?`, ans: c2(ans),
            wr: [{ text: c2(w1), tag: TAGS.wHalf }, { text: String(2 * R), tag: TAGS.wAsD }, { text: String(H), tag: TAGS.hAsW }],
            steps: ['옆면의 가로 = 밑면의 둘레 = 지름 × 원주율', `${2 * R} × 3.14 = ${c2(ans)}`],
            why: { [TAGS.wHalf]: '반지름에 원주율을 곱하면 둘레의 반이에요. 지름에 곱해요.', [TAGS.wAsD]: `${2 * R} cm는 밑면의 지름이에요. 원주율을 곱해 둘레를 구해요.`, [TAGS.hAsW]: `${H} cm는 높이 — 옆면의 세로예요.` },
            probe: { ask: 'cnetW', R, H },
          };
        })(),
        (() => {
          const R = int(r, 2, 9); const H = intWhere(r, 3, 12, (v) => v !== 2 * R && v / R >= 0.5 && v / R <= 5);
          const ans = piOf(2 * R); const w1 = piOf(R);
          return {
            t: `원기둥의 전개도예요.\n\n[cnet d=${2 * R} h=${H} w=?]\n\n${PI_LINE}\n옆면의 가로(?)는 몇 cm일까요?`, ans: c2(ans),
            wr: [{ text: c2(w1), tag: TAGS.wHalf }, { text: String(2 * R), tag: TAGS.wAsD }, { text: String(H), tag: TAGS.hAsW }],
            steps: ['옆면의 가로 = 밑면의 둘레 = 지름 × 원주율', `${2 * R} × 3.14 = ${c2(ans)}`],
            why: { [TAGS.wHalf]: '지름의 반에 곱하면 둘레의 반이에요.', [TAGS.wAsD]: `${2 * R} cm는 밑면의 지름이에요. 원주율을 곱해요.`, [TAGS.hAsW]: `${H} cm는 높이 — 옆면의 세로예요.` },
            probe: { ask: 'cnetW', R, H },
          };
        })(),
      ]));
      // 옆면의 세로
      fams.push(famOf([(() => {
        const R = int(r, 2, 9); const H = intWhere(r, 3, 12, (v) => v !== 2 * R && v !== R && v / R >= 0.5 && v / R <= 5);
        const W = piOf(2 * R);
        return {
          t: `원기둥의 전개도예요.\n\n[cnet r=${R} h=${H} w=${c2(W)}]\n\n이 전개도로 만든 원기둥의 높이는 몇 cm일까요?`, ans: String(H),
          wr: [{ text: c2(W), tag: TAGS.wSwapH }, { text: String(2 * R), tag: TAGS.diaAsH }],
          steps: ['옆면의 세로가 원기둥의 높이가 돼요', `→ ${H} cm`],
          why: { [TAGS.wSwapH]: `${c2(W)} cm는 옆면의 가로 — 밑면의 둘레예요.`, [TAGS.diaAsH]: `${2 * R} cm는 밑면의 지름이에요.` },
          probe: { ask: 'cnetH', R, H },
        };
      })()]));
      // 될까
      const OK = '네, 원기둥이 돼요'; const NO = { same: '아니요, 두 밑면이 같은 쪽에 있어서 겹쳐요', diff: '아니요, 두 밑면의 크기가 달라요', para: '아니요, 옆면이 직사각형이 아니에요' };
      const TAGB = { same: TAGS.sameSideOkC, diff: TAGS.diffOk, para: TAGS.paraOk };
      fams.push(famOf([
        (() => { const R = int(r, 2, 4); const H = int(r, 3, 8); return { t: `원 2개와 사각형 하나를 이어 붙였어요.\n\n[cnet r=${R} h=${H}]\n\n이 그림을 접으면 원기둥이 될까요?`, text: true, ans: OK, wr: [{ text: NO.same, tag: TAGS.validNo }, { text: NO.diff, tag: TAGS.validNo }], steps: ['두 원은 크기가 같고 직사각형의 위·아래에 하나씩', '옆면이 직사각형 → 접으면 원기둥이 돼요'], why: { [TAGS.validNo]: '두 밑면의 크기가 같고 위·아래에 하나씩, 옆면은 직사각형이라 원기둥이 돼요.' }, probe: { ask: 'cnetOk', bad: '' } }; })(),
        ...['same', 'diff', 'para'].map((bad) => (() => {
          const R = int(r, 2, 4); const H = int(r, 3, 8);
          // 글은 모두 "사각형 하나" — "평행사변형을 이어 붙였어요"라고 쓰면 글이 답을 흘린다
          return { t: `원 2개와 사각형 하나를 이어 붙였어요.\n\n[cnet r=${R} h=${H} ${bad}]\n\n이 그림을 접으면 원기둥이 될까요?`, text: true, ans: NO[bad], wr: [{ text: OK, tag: TAGB[bad] }, ...Object.keys(NO).filter((k) => k !== bad).map((k) => ({ text: NO[k], tag: TAGS.wrongReason }))], steps: [{ same: '두 원이 모두 위쪽에 붙어 있어요', diff: '아래쪽 원이 위쪽 원보다 작아요', para: '옆면이 평행사변형이에요' }[bad], `→ ${NO[bad].replace('아니요, ', '')}`], why: { [TAGB[bad]]: { same: '두 밑면이 같은 쪽에 있으면 접었을 때 겹쳐요.', diff: '원기둥의 두 밑면은 합동이에요.', para: '옆면을 감으면 두 밑면에 꼭 맞아야 해서 직사각형이어야 해요.' }[bad], [TAGS.wrongReason]: '안 되는 까닭을 다시 봐요.' }, probe: { ask: 'cnetOk', bad } };
        })()),
      ]));
      return calcAsk(r, c, this, runFamily(r, c, fams));
    },
    misread(r, c) {
      const R = int(r, 2, 9); const H = intWhere(r, 3, 12, (v) => v !== 2 * R && v / R >= 0.5 && v / R <= 5);
      const W = piOf(2 * R);
      if (branchOf(r, c, ['dia', 'half']) === 'dia') {
        return misAsk(r, c, this, 'dia', {
          q: `원기둥의 전개도예요.\n\n[cnet r=${R} h=${H} w=?]\n\n${PI_LINE}\n${showWork(`옆면의 가로는 밑면의 지름과 같은 ${2 * R} cm예요`)}`,
          ok: `옆면의 가로는 밑면의 둘레 — ${2 * R} × 3.14 = ${c2(W)} cm예요`,
          wr: [
            { text: '맞게 말했어요', tag: RIGHT_AS_WRONG },
            { text: `옆면의 가로는 높이와 같은 ${H} cm예요`, tag: TAGS.hAsW },
            { text: '옆면에는 가로가 없어요', tag: OFF },
          ],
          steps: ['옆면을 감아 밑면의 둘레를 한 바퀴 둘러요', `가로 = 지름 × 원주율 = ${2 * R} × 3.14 = ${c2(W)}`],
          whyAny: '지름에서 멈췄어요. 옆면의 가로는 밑면의 둘레 — 지름 × 원주율이에요.',
          probe: { ask: 'cnetW', R, H },
        });
      }
      return misAsk(r, c, this, 'half', {
        q: `원기둥의 전개도예요.\n\n[cnet r=${R} h=${H} w=?]\n\n${PI_LINE}\n${showWork(`옆면의 가로는 ${R} × 3.14 = ${c2(piOf(R))} cm예요`)}`,
        ok: `둘레는 지름 × 원주율 — ${2 * R} × 3.14 = ${c2(W)} cm예요`,
        wr: [
          { text: '맞게 말했어요', tag: RIGHT_AS_WRONG },
          { text: `옆면의 가로는 지름과 같은 ${2 * R} cm예요`, tag: TAGS.wAsD },
          { text: '원주율은 곱하지 않아요', tag: OFF },
        ],
        steps: [`반지름 ${R} cm → 지름 ${2 * R} cm`, `옆면의 가로 = ${2 * R} × 3.14 = ${c2(W)}`],
        whyAny: '반지름에 원주율을 곱하면 둘레의 반이에요. 지름에 곱해요.',
        probe: { ask: 'cnetW', R, H },
      });
    },
  },

  {
    id: 'sol.apply', grade: 6, name: '⭐ 입체도형 활용', needs: ['sol.cnet'],
    idea: '배운 것을 거꾸로, 섞어서 써요. 옆면의 가로(밑면의 둘레)를 알면 **÷ 3.14 = 지름**, 지름 ÷ 2 = 반지름. 면·꼭짓점·모서리의 수로 어떤 입체도형인지 찾고, 위·앞에서 본 모양으로 원기둥·원뿔·구를 가려요. 각기둥과 원기둥은 둘 다 **서로 평행하고 합동인 두 밑면**이 있어요.',
    rule: '거꾸로는 나눠서 — 둘레 ÷ 3.14 = 지름 · 규칙을 거꾸로 써서 밑면의 변의 수.',
    slip: '거꾸로 할 때 곱하지 않았는지, 반지름까지 갔는지 봐요.',
    calc(r, c) {
      const fams = [];
      // 둘레 → 반지름
      fams.push(famOf([(() => {
        const R = int(r, 2, 9); const W = piOf(2 * R);
        return {
          t: `옆면의 가로가 ${c2(W)} cm인 원기둥이 있어요.\n\n${PI_LINE}\n이 원기둥의 밑면의 반지름은 몇 cm일까요?`, ans: String(R),
          wr: [{ text: String(2 * R), tag: TAGS.stopAtD }, { text: c4(W * 314), tag: TAGS.invMul }, { text: c2(W / 2), tag: TAGS.noPiInv }],
          steps: [`옆면의 가로 = 밑면의 둘레 = 지름 × 3.14 → 지름 = ${c2(W)} ÷ 3.14 = ${2 * R}`, `반지름 = ${2 * R} ÷ 2 = ${R}`],
          why: { [TAGS.stopAtD]: `${2 * R} cm는 지름이에요. 반지름은 그 반이에요.`, [TAGS.invMul]: '거꾸로 할 때는 곱하지 않고 나눠요.', [TAGS.noPiInv]: '둘레를 2로만 나눴어요. 먼저 3.14로 나눠 지름을 구해요.' },
          probe: { ask: 'invR', R },
        };
      })()]));
      // 수로 찾기
      fams.push(famOf([
        (() => { const n = int(r, 3, 10); return { t: `면이 ${n + 1}개, 꼭짓점이 ${n + 1}개, 모서리가 ${2 * n}개인 입체도형이 있어요.\n\n이 입체도형의 이름은 무엇일까요?`, text: true, ans: pyrName(n), wr: [{ text: pyrName(n + 1), tag: TAGS.condCount }, { text: prismName(n), tag: TAGS.kindSwap }, { text: pyrName(2 * n), tag: TAGS.byEdge }], steps: ['면과 꼭짓점의 수가 같으면 각뿔(□ + 1)', `모서리 ${2 * n} ÷ 2 = ${n} → ${pyrName(n)}`], why: { [TAGS.condCount]: '면의 수를 그대로 이름에 썼어요. 1을 빼요.', [TAGS.kindSwap]: '각기둥은 꼭짓점이 □ × 2라서 면의 수와 달라요.', [TAGS.byEdge]: '모서리의 수로 이름을 붙였어요.' }, probe: { ask: 'cond', kind: 'pyramid', n } }; })(),
        (() => { const n = int(r, 3, 10); return { t: `면이 ${n + 2}개, 꼭짓점이 ${2 * n}개, 모서리가 ${3 * n}개인 입체도형이 있어요.\n\n이 입체도형의 이름은 무엇일까요?`, text: true, ans: prismName(n), wr: [{ text: prismName(n + 2), tag: TAGS.condCount }, { text: pyrName(n), tag: TAGS.kindSwap }, { text: prismName(2 * n), tag: TAGS.byVertex }], steps: ['꼭짓점이 짝수 개, 모서리가 3의 배수 → 각기둥', `모서리 ${3 * n} ÷ 3 = ${n} → ${prismName(n)}`], why: { [TAGS.condCount]: '면의 수를 그대로 이름에 썼어요. 2를 빼요.', [TAGS.kindSwap]: '각뿔은 면과 꼭짓점의 수가 같아요.', [TAGS.byVertex]: '꼭짓점의 수로 이름을 붙였어요.' }, probe: { ask: 'cond', kind: 'prism', n } }; })(),
      ]));
      // 본 모양으로 찾기
      fams.push(famOf([
        { t: '위에서 본 모양은 원, 앞에서 본 모양은 삼각형인 입체도형이 있어요.\n\n이 입체도형은 무엇일까요?', text: true, ans: '원뿔', wr: [{ text: '원기둥', tag: TAGS.viewOne }, { text: '구', tag: TAGS.viewOne }], steps: ['위에서 원 — 원기둥·원뿔·구', '앞에서 삼각형 → 원뿔'], why: { [TAGS.viewOne]: '위에서 본 모양만 봤어요. 앞에서 본 모양까지 맞아야 해요.' }, probe: { ask: 'viewCond', top: '원', front: '삼각형' } },
        { t: '위에서 본 모양은 원, 앞에서 본 모양은 직사각형인 입체도형이 있어요.\n\n이 입체도형은 무엇일까요?', text: true, ans: '원기둥', wr: [{ text: '원뿔', tag: TAGS.viewOne }, { text: '구', tag: TAGS.viewOne }], steps: ['위에서 원 — 원기둥·원뿔·구', '앞에서 직사각형 → 원기둥'], why: { [TAGS.viewOne]: '위에서 본 모양만 봤어요. 앞에서 본 모양까지 맞아야 해요.' }, probe: { ask: 'viewCond', top: '원', front: '직사각형' } },
      ]));
      // 모서리 길이의 합 → 밑면의 한 변
      fams.push(famOf([(() => {
        for (let k = 0; k < 80; k++) {
          const n = int(r, 3, 8); const a = int(r, 2, 9); const h = intWhere(r, 3, 12, (v) => v !== a);
          const S = 2 * n * a + n * h;
          const w1 = (S - n * h) / n; const w2 = S / (2 * n); const w3 = S / (3 * n);
          const wr = [[w1, TAGS.sumOneBase], [w2, TAGS.noSubH], [w3, TAGS.equalSplit]].filter(([v]) => Number.isInteger(v) && v !== a && v > 0);
          if (wr.length < 2 || !allDiff(a, ...wr.map(([v]) => v)) || !prismOK(n, a, h)) continue;
          return {
            t: `밑면이 정다각형이고 높이가 ${h} cm인 각기둥이 있어요.\n\n[prism n=${n} a=? h=${h}]\n\n모든 모서리 길이의 합이 ${S} cm일 때, 밑면의 한 변은 몇 cm일까요?`, ans: String(a),
            wr: wr.map(([v, tag]) => ({ text: String(v), tag })),
            steps: [`높이 ${h} cm인 모서리 ${n}개: ${h} × ${n} = ${n * h} → 밑면의 모서리 합 ${S} − ${n * h} = ${S - n * h}`, `두 밑면의 모서리는 ${2 * n}개 → ${S - n * h} ÷ ${2 * n} = ${a}`],
            why: { [TAGS.sumOneBase]: '밑면이 2개라서 밑면의 모서리는 □ × 2개예요.', [TAGS.noSubH]: '높이 모서리의 길이를 먼저 빼요.', [TAGS.equalSplit]: '모서리의 길이가 모두 같지 않아요 — 높이 모서리를 먼저 빼요.' },
            probe: { ask: 'sumInv', n, a, h, S },
          };
        }
        throw new Error('sumInv');
      })()]));
      // 각기둥과 원기둥의 같은 점
      fams.push(famOf([(() => {
        const n = int(r, 3, 8);
        return {
          t: `각기둥과 원기둥이 있어요.\n\n[prism n=${n}]\n\n[cyl r=3 h=6]\n\n두 입체도형의 같은 점을 바르게 말한 것은 어느 것일까요?`, text: true, ans: '둘 다 서로 평행하고 합동인 두 밑면이 있어요',
          wr: [{ text: '둘 다 꼭짓점이 있어요', tag: TAGS.cylVertex }, { text: '둘 다 옆면이 평평해요', tag: TAGS.roundFlat }],
          steps: ['각기둥: 두 밑면이 서로 평행하고 합동인 다각형', '원기둥: 두 밑면이 서로 평행하고 합동인 원 → 같은 점'],
          why: { [TAGS.cylVertex]: '원기둥에는 꼭짓점이 없어요.', [TAGS.roundFlat]: '원기둥의 옆면은 굽은 면이에요.' },
          probe: { ask: 'same' },
        };
      })()]));
      return calcAsk(r, c, this, runFamily(r, c, fams));
    },
    misread(r, c) {
      if (branchOf(r, c, ['inv', 'cond']) === 'inv') {
        const R = int(r, 2, 9); const W = piOf(2 * R);
        return misAsk(r, c, this, 'inv', {
          q: `옆면의 가로가 ${c2(W)} cm인 원기둥이 있어요.\n\n${PI_LINE}\n${showWork(`밑면의 반지름은 ${c2(W)} × 3.14 = ${c4(W * 314)} cm예요`)}`,
          ok: `거꾸로는 나눠서 — ${c2(W)} ÷ 3.14 = ${2 * R}(지름), 반지름은 ${R} cm예요`,
          wr: [
            { text: '맞게 말했어요', tag: RIGHT_AS_WRONG },
            { text: `반지름은 ${c2(W)} ÷ 3.14 = ${2 * R} cm예요`, tag: TAGS.stopAtD },
            { text: '원기둥에는 반지름이 없어요', tag: OFF },
          ],
          steps: [`옆면의 가로 = 지름 × 3.14 → 지름 = ${c2(W)} ÷ 3.14 = ${2 * R}`, `반지름 = ${2 * R} ÷ 2 = ${R} cm`],
          whyAny: '거꾸로 할 때 곱했어요. 둘레에서 지름은 3.14로 나눠서 구해요.',
          probe: { ask: 'invR', R },
        });
      }
      const n = pick(r, [6, 9, 12]);
      return misAsk(r, c, this, 'cond', {
        q: `모서리가 ${2 * n}개인 각뿔이 있어요.\n\n${showWork(`${2 * n} ÷ 3 = ${jn(2 * n / 3, '이니까', '니까')} ${pyrName(2 * n / 3)}이에요`)}`,
        ok: `각뿔의 모서리는 밑면의 변의 수 × 2 — ${2 * n} ÷ 2 = ${n}, ${pyrName(n)}이에요`,
        wr: [
          { text: '맞게 말했어요', tag: RIGHT_AS_WRONG },
          { text: `${2 * n} + 1 = ${jn(2 * n + 1, '이니까', '니까')} ${pyrName(2 * n + 1)}이에요`, tag: TAGS.condCount },
          { text: '각뿔은 모서리로 알 수 없어요', tag: OFF },
        ],
        steps: ['÷ 3은 각기둥의 모서리 규칙이에요', `각뿔은 × 2 → ${2 * n} ÷ 2 = ${n} → ${pyrName(n)}`],
        whyAny: '각기둥의 규칙(× 3)을 각뿔에 썼어요. 각뿔의 모서리는 밑면의 변의 수 × 2예요.',
        probe: { ask: 'inv', kind: 'pyramid', what: 'edge', v: 2 * n },
      });
    },
  },
];

export function conceptById(id) {
  return SOLID.find((c) => c.id === id) || null;
}

// ───────────────────── 문항 만들기 (mathcuboid와 같은 모양) ─────────────────────

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
const SLIP = '한 번 더 천천히 — 각기둥인지 각뿔인지, 반지름인지 지름인지 먼저 봐요.';

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
  return diagnosticOf(SOLID, makeQuestion, seed, n, opts);
}
export function placeFrom(answers) {
  return placeFromOf(SOLID, answers);
}
export function ladder(doneIds) {
  return ladderOf(SOLID, doneIds);
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
 * coach/math/solid.json 형식 검사 — mathcuboid.checkContent와 같은 규칙
 * @returns {string[]}
 */
export function checkContent(content) {
  const bad = [];
  for (const c of SOLID) {
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

export const _kit = { famOf, runFamily, calcAsk, choices, textChoices, branchOf, showWork, step, jn, jw, kn, c2, c4, RIGHT_AS_WRONG, OFF, PYR_SETS, CONE_SETS, visibleCounts };
