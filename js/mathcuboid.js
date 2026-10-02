// 🧊 수학 — O 직육면체 → 부피·겉넓이 줄기 (초5 2학기 5단원 「직육면체」 + 초6 1학기 6단원 「직육면체의 부피와 겉넓이」):
// 개념 사다리 + 문제 생성기 + 내용 형식 검사. 순수 함수만 — 화면 없음 (node 테스트에서 그대로 돈다).
//
// 왜 이 줄기인가 (2026-10-02, 아버님 "그래 O 줄기로 가자" → 설계안 "이대로 진행"): M 합동과 대칭 → N 원의 넓이 다음, 도형·측정의 마지막 빈 칸(입체).
// 칸 범위는 미래엔 5-2 지도서 284쪽 학습 흐름도(12차시)와 6-1 지도서 308쪽(11차시), 2022 성취기준 [6수03-03]·[6수03-04]·[6수03-17~19]로 확인했다 —
//   직육면체 · 정육면체 · 겨냥도 · 성질(평행한 면·수직인 면) · 전개도 / 겉넓이 → 부피 비교 · cm³ · 부피 · m³ · 두부의 부피와 겉넓이.
//   교과서는 겉넓이를 부피보다 먼저 한다.
//
// 오답은 아이가 실제로 하는 틀린 생각 흉내다:
//   · 보이는 것만 셈(모서리 9·꼭짓점 7·면 3) · 꼭짓점·모서리·면의 수를 바꿈 · 정육면체는 직육면체가 아니라고 봄
//   · 보이지 않는 모서리도 실선 · 모서리 길이의 합에서 × 4를 빠뜨림 · 만나는 면을 평행으로 · 수직인 면에 마주 보는 면까지
//   · 전개도에서 붙어 있는 면·줄 양 끝을 마주 보는 면으로 · 세 면만 더한 겉넓이 · 세 길이를 곱한 겉넓이
//   · 보이는 쌓기나무만 · 한 층만 · 세 길이를 더한 부피 · 겉넓이를 부피로 · 1 m³ = 100 cm³ · 단위를 안 맞추고 곱함
//
// 새 줄기의 함정(메모 stem-generator-pitfalls)을 처음부터:
//   · 가족 = 틀 여러 개(variant), 틀마다 수를 미리 뽑아 둔다 — 🔁 쌍둥이·🤔 노트가 요청한 틀이 그대로 골라진다 (L·N과 같은 모양)
//   · 틀 글 속 수의 모양이 늘 같게 — 그림 지시문의 선택지도 수(miss=#,#,# · shade=# · s=#)로, 칸 숫자를 섞어 면 이름 자리를 바꾼다
//   · 수 답 보기는 수만 (단위는 질문 끝 "몇 cm³"에서 숫자판이 읽는다)
//   · 틀린 방법이 우연히 맞는 값(한 모서리 6 cm: 겉넓이 216 = 6 × 6 × 6)은 뽑지 않는다 — 오답끼리도 서로 다르게
//   · 참말에 일반화를 쓰지 않는다 — 정육면체는 직육면체라고 **할 수 있다**, 한 줄로 **셋**이 이어지면 양 끝이 마주 본다
//   · 아직 안 배운 말: 겨냥도(O2) → 평행·수직·밑면·옆면(O3) → 전개도(O4) → 겉넓이(O5) → 부피·쌓기나무·cm³(O6) → m³(O8)
// ★ 그림의 답(마주 보는 면·만나는 점·겹치는 선분·선분의 길이)은 테스트가 **따로 굴려 접어** 다시 구한다.

import { figureSvg, parseNet, labelBoxesOf, CUB_FACES, CUB_SHADE, CUB_EDGES, NET_FACE, NET_PT } from './mathdraw.js';
import { rng, shuffle, fill, castOf, worldPick, ask, solve, int, pick, pickFamily, humanQuestion, checkHuman, diagnosticOf, placeFromOf, ladderOf } from './mathgen.js';
import { gradeLabel } from './mathmix.js';

export { gradeLabel };

// ───────────────────── 수·조사 ─────────────────────

/** 소수 넷째 자리까지 그대로 (0.5 m³ · 3.75 m³) */
const num = (v) => String(Math.round(v * 10000) / 10000);
const BAT = new Set(['0', '1', '3', '6', '7', '8']);
const lastDigit = (t) => String(t).replace(/\D+$/, '').slice(-1);
/** 수 글자 + 조사 (읽는 소리로 — 0·1·3·6·7·8은 받침) */
function jn(t, withB, without) {
  const s = String(t);
  return s + (BAT.has(lastDigit(s)) ? withB : without);
}
/** 이름 + 조사 — 자모(기역·니은…)는 모두 받침, ㉮~㉳(가·나…)는 받침 없음. ㄹ 뒤 (으)로는 '로' */
function jw(t, withB, without) {
  const s = String(t); const ch = s.slice(-1);
  if (withB === '으로' && ch === 'ㄹ') return s + without;
  return s + (/[ㄱ-ㅎ]/.test(ch) ? withB : without);
}
/** 오답 값이 서로 다르고 정답과도 다르며 모두 0보다 크다 (틀린 방법이 우연히 맞는 값을 내는 수는 뽑지 않는다 — Codex 23차 #3) */
const allDiff = (...vals) => vals.every((v) => v > 0) && new Set(vals.map(num)).size === vals.length;

// ───────────────────── 보기 ─────────────────────

/** 보기 글자 → 값 (겹침 검사용). 수 하나일 때만 — 문장·이름 보기는 null */
export function valueOf(text) {
  const s = String(text == null ? '' : text).trim();
  return /^\d+(\.\d+)?$/.test(s) ? Number(s) : null;
}
const sameValue = (a, b) => a !== null && b !== null && Math.abs(a - b) < 1e-9;

/** 정답 근처의 "계산 실수" — 보기가 모자랄 때만. 자연수는 끝의 0을 뺀 자리 단위로(9000000 → 8000000), 소수는 마지막 자리 */
function nearOf(answer, k) {
  const s = String(answer);
  const st = [1, -1, 2, -2, 3, -3, 5, -5][k % 8];
  if (s.includes('.')) {
    const dec = s.split('.')[1].length;
    const v = Math.round((Number(s) + st * 10 ** -dec) * 10 ** dec) / 10 ** dec;
    return v > 0 ? v.toFixed(dec) : '';
  }
  const zeros = /0*$/.exec(s)[0].length;
  const v = Number(s) + st * 10 ** Math.min(zeros, s.length - 1);
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
  // O1 직육면체·정육면체
  visibleOnly: '보이는 것만 셈',
  asVertex: '꼭짓점의 수를 답함',
  asEdge: '모서리의 수를 답함',
  asFace: '면의 수를 답함',
  sameFour: '같은 길이 모서리를 4개씩만 셈',
  labelOnly: '길이가 적힌 모서리만 셈',
  notSubset: '정육면체는 직육면체가 아니라고 봄',
  subsetSwap: '직육면체를 모두 정육면체라고 봄',
  sixFaces: '면의 수만 보고 정육면체라고 봄',
  sameLenNeed: '모서리 길이가 모두 같아야 직육면체라고 봄',
  // O2 겨냥도
  hidVsVis: '보이는 것과 보이지 않는 것을 바꿈',
  hidVertex: '보이지 않는 꼭짓점의 수를 답함',
  countAll: '보이지 않는 것까지 셈',
  visEdgeCount: '보이는 모서리의 수를 답함',
  visVertexCount: '보이는 꼭짓점의 수를 답함',
  swapLine: '실선과 점선을 바꿈',
  allSolid: '보이지 않는 모서리도 실선으로 그림',
  allDash: '빠진 모서리를 모두 점선으로 그림',
  allSame: '모든 모서리의 길이가 같다고 봄',
  threeOnly: '적힌 세 모서리만 더함',
  visSum: '보이는 모서리만 더함',
  timesTwo: '× 4 대신 × 2를 함',
  faceTimes: '면의 수 6을 곱함',
  div4: '12가 아니라 4로 나눔',
  div6: '면의 수 6으로 나눔',
  div8: '꼭짓점의 수 8로 나눔',
  noDash: '보이지 않는 모서리는 그리지 않는다고 봄',
  // O3 직육면체의 성질
  nextFace: '만나는 면을 평행한 면으로 봄',
  notFace: '면이 아닌 것을 고름',
  withOpp: '마주 보는 면까지 셈',
  visPerp: '보이는 면만 셈',
  addForMul: '곱하지 않고 더함',
  // O4 전개도
  netNext: '전개도에서 붙어 있는 면을 마주 보는 면으로 봄',
  netFar: '전개도에서 멀리 있는 면을 마주 보는 면으로 봄',
  netEnds: '한 줄로 이어진 네 면의 양 끝을 마주 보는 면으로 봄',
  netMeet: '접으면 만나는 면을 마주 보는 면으로 봄',
  ptOne: '만나는 점을 하나만 찾음',
  ptShift: '만나는 점의 바로 옆 점을 고름',
  ptNext: '선분으로 이어진 바로 옆 점을 고름',
  segShift: '겹치는 선분의 바로 옆 선분을 고름',
  segOpp: '같은 면의 맞은편 선분을 고름',
  foldWrong: '접을 수 있는데 겹친다고 봄',
  crossOnly: '십자 모양만 전개도라고 봄',
  sixOnly: '정사각형 6개면 모두 전개도라고 봄',
  connOnly: '이어져 있기만 하면 전개도라고 봄',
  wrongDim: '다른 모서리의 길이로 봄',
  // O5 겉넓이
  noDouble: '세 면의 넓이만 더함',
  mulAll: '세 길이를 곱함',
  sideOnly: '옆면의 넓이만 구함',
  fourFaces: '네 면의 넓이만 구함',
  edgeTimes6: '한 모서리에 6을 곱함',
  halfPerim: '밑면 둘레의 반만 곱함',
  withBase: '밑면의 넓이까지 더함',
  // O6 부피의 뜻
  visCubes: '보이는 쌓기나무만 셈',
  oneLayer: '한 층만 셈',
  addDims: '곱하지 않고 세 수를 더함',
  addLayers: '층 수를 곱하지 않고 더함',
  tallWins: '높이가 높은 쪽이 더 크다고 봄',
  sameVol: '쌓기나무를 세지 않고 같다고 봄',
  // O7 부피 구하기
  surfAsVol: '겉넓이를 구함',
  baseOnly: '밑면의 넓이만 구함',
  times3: '한 모서리에 3을 곱함',
  squareOnly: '한 면의 넓이만 구함',
  sumWins: '세 길이의 합이 큰 쪽이 더 크다고 봄',
  sameGuess: '곱해 보지 않고 같다고 봄',
  // O8 1 m³
  lenUnit: '1 m = 100 cm처럼 100배로 봄',
  areaUnit: '1 m² = 10000 cm²처럼 10000배로 봄',
  thousand: '1000배로 봄',
  noConvert: '단위를 맞추지 않고 곱함',
  wrongUnit: '묻는 단위로 바꾸지 않음',
  oneConvert: '한 길이만 단위를 바꿈',
  tenTimes: '1 m = 10 cm로 봄',
  // O9 활용
  divOne: '한 길이로만 나눔',
  subForDiv: '나누지 않고 뺌',
  invMul: '거꾸로 할 때 곱함',
  faceStop: '한 면의 넓이에서 멈춤',
  edgeStop: '한 모서리의 길이에서 멈춤',
  oneCut: '잘린 면을 하나만 셈',
  doubleSurf: '겉넓이가 두 배가 된다고 봄',
  doubleVol: '자르면 부피가 두 배가 된다고 봄',
  halfVol: '자르면 부피가 반이 된다고 봄',
  divOnce: '부피를 한 모서리의 길이로만 나눔',
  volOnly: '상자의 부피를 답함',
};

// ───────────────────── 가족·틀 (variant) — mathrange·mathcircle과 같은 모양 ─────────────────────

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
    // allWrong: 보기에서 겹쳐 빠지기 전의 오답 전부 — 테스트가 오답끼리 같은 값이 되는지 본다 (Codex 23차 #3)
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

// ───────────────────── 그림 재료 ─────────────────────

const cub = (d, opt = '') => `[cuboid ${d.join(' ')}${opt ? ` ${opt}` : ''}]`;
const cubBare = (d, opt = '') => `[cuboid ${d.map((v) => `_${v}`).join(' ')}${opt ? ` ${opt}` : ''}]`;
const cubAsk = (d, opt = '') => `[cuboid ${d.map((v) => `?${v}`).join(' ')}${opt ? ` ${opt}` : ''}]`;

/** 서로 다른 세 길이 — 그림이 읽히게 가장 긴 것이 가장 짧은 것의 ratio배 안, ok로 오답이 서로 다른지까지 */
function dims3(r, lo, hi, ok = () => true, ratio = 3) {
  for (let k = 0; k < 400; k++) {
    const d = [int(r, lo, hi), int(r, lo, hi), int(r, lo, hi)];
    if (new Set(d).size < 3 || Math.max(...d) > ratio * Math.min(...d) || !ok(d)) continue;
    return d;
  }
  throw new Error(`dims3: ${lo}..${hi}에서 못 뽑음`);
}
/** 조건에 맞는 수 하나 */
function intWhere(r, lo, hi, ok) {
  for (let k = 0; k < 400; k++) { const v = int(r, lo, hi); if (ok(v)) return v; }
  throw new Error(`intWhere: ${lo}..${hi}에서 못 뽑음`);
}

// ── 면 (O3) ──
const FACE_LIST = Object.values(CUB_FACES);
const shareN = (f, g) => [...f].filter((ch) => g.includes(ch)).length;
const oppOf = (f) => FACE_LIST.find((g) => shareN(f, g) === 0);
const adjOf = (f) => FACE_LIST.filter((g) => shareN(f, g) === 2);
/** 면이 아닌 네 꼭짓점 — 서로 마주 보는 두 모서리로 만든 비스듬한 사각형 */
const NOT_FACES = ['ㄱㄴㅅㅇ', 'ㄹㄷㅂㅁ', 'ㄴㄷㅇㅁ', 'ㄱㄹㅅㅂ', 'ㄱㅁㅅㄷ', 'ㄴㅂㅇㄹ'];
const FACE_AXES = { top: [0, 1], bottom: [0, 1], front: [0, 2], back: [0, 2], left: [1, 2], right: [1, 2] };
const faceKey = (f) => Object.keys(CUB_FACES).find((k) => CUB_FACES[k] === f);
const faceArea = (f, d) => { const [i, j] = FACE_AXES[faceKey(f)]; return d[i] * d[j]; };

// ── 전개도 (O4·O5) ──
/** 정육면체 전개도 11가지 (X = 칸) — 1-4-1 여섯 · 2-3-1 셋 · 2-2-2 · 3-3 */
export const CUBE_NETS = ['.X../XXXX/.X..', 'X.../XXXX/X...', 'X.../XXXX/.X..', 'X.../XXXX/..X.', 'X.../XXXX/...X', '.X../XXXX/..X.', 'XX../.XXX/.X..', 'XX../.XXX/..X.', 'XX../.XXX/...X', 'XX../.XX./..XX', 'XXX../..XXX'];
/** 정사각형 6개를 이었지만 접으면 겹치는 모양 — 위로 붙은 두 칸이 같은 면이 되거나, 다섯 줄, 2×2 덩어리 */
export const NOT_NETS = ['X..X/XXXX', 'X.X./XXXX', '.X.X/XXXX', 'XXXXX/X....', 'XXXX/..XX', 'XX../XXXX', 'XXX./.XXX'];
const F = (d) => NET_FACE[d - 1];
/** X 칸에 1~6을 섞어 넣는다 — 면 ㉮가 매번 다른 칸에 (틀 열쇠는 숫자를 #로 지우니 같은 모양이면 같은 틀) */
function labelShape(r, pat) {
  const ds = shuffle(r, [1, 2, 3, 4, 5, 6]);
  let k = 0;
  return pat.replace(/X/g, () => String(ds[k++]));
}
const cellOf = (L, d) => L.cells.find((c) => c.d === d);
const oppD = (L, d) => { const n = cellOf(L, d).f[2]; return L.cells.find((c) => c.f[2].every((x, i) => x === -n[i])).d; };
const netNbrs = (L, d) => L.links.filter((l) => l.a.d === d || l.b.d === d).map((l) => (l.a.d === d ? l.b.d : l.a.d)).sort((a, b) => a - b);
function netDist(L, d) {
  const dist = { [d]: 0 }; const q = [d];
  while (q.length) { const x = q.shift(); for (const y of netNbrs(L, x)) if (!(y in dist)) { dist[y] = dist[x] + 1; q.push(y); } }
  return dist;
}
/** d에서 한 줄로 네 칸이 이어지면 반대쪽 끝 칸 */
function endOf4(L, d) {
  const c = cellOf(L, d);
  for (const [dr, dc] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
    const run = [1, 2, 3].map((k) => L.cells.find((x) => x.r === c.r + k * dr && x.c === c.c + k * dc));
    if (run.every(Boolean)) return run[2].d;
  }
  return 0;
}
/** d와 e 사이에 한 칸을 두고 한 줄로 놓였는가 */
function straight3(L, d, e) {
  const a = cellOf(L, d); const b = cellOf(L, e);
  if (!((a.r === b.r && Math.abs(a.c - b.c) === 2) || (a.c === b.c && Math.abs(a.r - b.r) === 2))) return false;
  return !!L.cells.find((x) => x.r === (a.r + b.r) / 2 && x.c === (a.c + b.c) / 2);
}
function cubeNet(r, pat, opt = '') {
  const shape = labelShape(r, pat);
  const spec = `${shape}${opt ? ` ${opt}` : ''}`;
  const sp = parseNet(spec);
  return { shape, spec, L: sp.L, fig: `[net ${spec}]` };
}
/** 이름표가 서로 안 겹치고 그림 안에 있는가 (그린 SVG에서) */
function labelsFit(svg) {
  const [W, H] = /viewBox="0 0 (\d+) (\d+)"/.exec(svg).slice(1).map(Number);
  const b = labelBoxesOf(svg);
  for (let i = 0; i < b.length; i++) {
    if (b[i].x0 < 0 || b[i].y0 < 0 || b[i].x1 > W || b[i].y1 > H) return false;
    for (let j = i + 1; j < b.length; j++) if (b[i].x0 < b[j].x1 && b[j].x0 < b[i].x1 && b[i].y0 < b[j].y1 && b[j].y0 < b[i].y1) return false;
  }
  return true;
}
/** 직육면체 전개도 1-4-1 — 가운데 줄 둘째 칸이 앞면(가로 × 높이) */
const CUBOID_NETS = ['.X../XXXX/.X..', 'X.../XXXX/X...', '.X../XXXX/..X.', '.X../XXXX/...X', 'X.../XXXX/.X..'];
/** 직육면체 전개도 + 길이 이름표 (가로·세로·높이 길이의 선분 하나씩) + ?(withQ) — 이름표가 겹치지 않게 다시 고른다 */
function cuboidNet(r, pat, d, withQ) {
  let last = null;
  for (let k = 0; k < 60; k++) {
    const shape = labelShape(r, pat);
    const base = `${d.join(' ')} ${shape} r=${shape.split('/')[1][1]}`;
    const L = parseNet(base).L;
    const lab = d.map((v) => pick(r, L.segs.filter((g) => g.len === v).map((g) => g.i)));
    const q = withQ ? pick(r, L.segs.filter((g) => !lab.includes(g.i)).map((g) => g.i)) : -1;
    const spec = `${base} lab=${lab.join(',')}${withQ ? ` q=${q}` : ''}`;
    last = { spec, L, lab, q, fig: `[net ${spec}]` };
    if (labelsFit(figureSvg(`net ${spec}`))) return last;
  }
  return last;
}

// ───────────────────── 개념 사다리 (O. 직육면체 줄기) ─────────────────────

export const CUBOID = [
  {
    id: 'cub.parts', grade: 5, name: '직육면체와 정육면체', needs: [],
    idea: '**직사각형 6개**로 둘러싸인 도형을 **직육면체**, **정사각형 6개**로 둘러싸인 도형을 **정육면체**라고 해요. 선분으로 둘러싸인 부분이 **면**(6개), 면과 면이 만나는 선분이 **모서리**(12개), 모서리와 모서리가 만나는 점이 **꼭짓점**(8개)이에요. 그림의 점선은 뒤쪽에 숨어 보이지 않는 모서리예요. 정육면체는 모서리 12개의 길이가 모두 같아요. 정사각형은 직사각형이라고 할 수 있으니 **정육면체는 직육면체라고 할 수 있어요**.',
    rule: '면 6 · 모서리 12 · 꼭짓점 8 — 정육면체는 직육면체라고 할 수 있어요.',
    slip: '뒤쪽에 숨은 것까지 셌는지, 묻는 것이 면·모서리·꼭짓점 중 무엇인지 다시 봐요.',
    calc(r, c) {
      const fams = [];
      const PART = {
        edge: {
          word: '모서리는', ans: 12, wr: [[9, TAGS.visibleOnly], [8, TAGS.asVertex], [6, TAGS.asFace]],
          steps: ['면과 면이 만나는 선분이 모서리 — 위에 4개, 아래에 4개, 옆에 세운 것 4개', '4 + 4 + 4 = 12 → 12개'],
          why: { [TAGS.visibleOnly]: '점선으로 그린 뒤쪽 모서리 3개도 세어요 — 9 + 3 = 12.', [TAGS.asVertex]: '8은 꼭짓점의 수예요. 모서리는 면과 면이 만나는 선분이에요.', [TAGS.asFace]: '6은 면의 수예요. 모서리는 면과 면이 만나는 선분이에요.' },
        },
        vertex: {
          word: '꼭짓점은', ans: 8, wr: [[7, TAGS.visibleOnly], [12, TAGS.asEdge], [6, TAGS.asFace]],
          steps: ['모서리와 모서리가 만나는 점이 꼭짓점 — 윗면에 4개, 아랫면에 4개', '4 + 4 = 8 → 8개'],
          why: { [TAGS.visibleOnly]: '뒤쪽 아래에 숨은 꼭짓점 1개도 세어요 — 7 + 1 = 8.', [TAGS.asEdge]: '12는 모서리의 수예요. 꼭짓점은 모서리와 모서리가 만나는 점이에요.', [TAGS.asFace]: '6은 면의 수예요. 꼭짓점은 모서리와 모서리가 만나는 점이에요.' },
        },
        face: {
          word: '면은', ans: 6, wr: [[3, TAGS.visibleOnly], [8, TAGS.asVertex], [12, TAGS.asEdge]],
          steps: ['선분으로 둘러싸인 부분이 면 — 위·아래, 앞·뒤, 왼쪽·오른쪽', '2 + 2 + 2 = 6 → 6개'],
          why: { [TAGS.visibleOnly]: '보이지 않는 아래·뒤·왼쪽 면 3개도 세어요 — 3 + 3 = 6.', [TAGS.asVertex]: '8은 꼭짓점의 수예요. 면은 선분으로 둘러싸인 부분이에요.', [TAGS.asEdge]: '12는 모서리의 수예요. 면은 선분으로 둘러싸인 부분이에요.' },
        },
      };
      const partOf = (k, t) => {
        const p = PART[k];
        return { t, ans: String(p.ans), wr: p.wr.map(([v, tag]) => ({ text: String(v), tag })), steps: p.steps, why: p.why, probe: { ask: k } };
      };
      for (const k of ['edge', 'vertex', 'face']) {
        fams.push(famOf([
          (() => { const d = dims3(r, 3, 9); return partOf(k, `{mon/이/가} 직육면체 모양의 상자를 그렸어요.\n\n${cubBare(d)}\n\n직육면체의 ${PART[k].word} 모두 몇 개일까요?`); })(),
          (() => { const s = int(r, 3, 9); return partOf(k, `정육면체 모양의 주사위가 있어요.\n\n${cubBare([s, s, s])}\n\n정육면체의 ${PART[k].word} 모두 몇 개일까요?`); })(),
        ]));
      }
      // 정육면체 — 모서리의 길이가 모두 같다
      fams.push(famOf([(() => {
        const s = int(r, 2, 12);
        return {
          t: `한 모서리가 ${s} cm인 정육면체가 있어요.\n\n${cub([s, s, s])}\n\n길이가 ${s} cm인 모서리는 모두 몇 개일까요?`,
          ans: '12', wr: [{ text: '4', tag: TAGS.sameFour }, { text: '9', tag: TAGS.visibleOnly }, { text: '3', tag: TAGS.labelOnly }],
          steps: ['정육면체는 정사각형 6개로 둘러싸여 있어서 모서리의 길이가 모두 같아요', `모서리 12개가 모두 ${s} cm → 12개`],
          why: {
            [TAGS.sameFour]: '길이가 같은 모서리 4개씩은 직육면체 이야기예요. 정육면체는 12개가 모두 같아요.',
            [TAGS.visibleOnly]: '점선으로 그린 뒤쪽 모서리 3개도 길이가 같아요.',
            [TAGS.labelOnly]: '길이를 적은 것은 3개뿐이지만, 정육면체는 모서리 12개의 길이가 모두 같아요.',
          },
          probe: { ask: 'sameLen' },
        };
      })()]));
      // 정육면체는 직육면체라고 할 수 있다
      fams.push(famOf([(() => {
        const s = int(r, 2, 12);
        return {
          t: `한 모서리가 ${s} cm인 정육면체가 있어요.\n\n${cub([s, s, s])}\n\n이 도형을 바르게 말한 것은 어느 것일까요?`,
          text: true, ans: '직육면체라고도 할 수 있어요',
          wr: [{ text: '정육면체라서 직육면체는 아니에요', tag: TAGS.notSubset }, { text: '모서리가 8개예요', tag: TAGS.asVertex }, { text: '면이 3개예요', tag: TAGS.visibleOnly }],
          steps: ['정육면체의 면은 정사각형 6개 — 정사각형은 네 각이 모두 직각이라 직사각형이라고 할 수 있어요', '그래서 정육면체는 직육면체라고도 할 수 있어요'],
          why: {
            [TAGS.notSubset]: '정사각형도 직사각형이에요. 그래서 정육면체는 직육면체라고 할 수 있어요.',
            [TAGS.asVertex]: '8은 꼭짓점의 수예요. 모서리는 12개예요.',
            [TAGS.visibleOnly]: '보이는 면은 3개지만 뒤쪽까지 면은 6개예요.',
          },
          probe: { ask: 'cubeSay' },
        };
      })()]));
      fams.push(famOf([(() => {
        const d = dims3(r, 3, 12);
        return {
          t: `가로 ${d[0]} cm, 세로 ${d[1]} cm, 높이 ${d[2]} cm인 상자가 있어요.\n\n${cub(d)}\n\n이 도형을 바르게 말한 것은 어느 것일까요?`,
          text: true, ans: '직육면체예요 — 면 6개가 모두 직사각형이에요',
          wr: [
            { text: '정육면체예요 — 면이 6개예요', tag: TAGS.sixFaces },
            { text: '직육면체가 아니에요 — 모서리의 길이가 서로 달라요', tag: TAGS.sameLenNeed },
            { text: '꼭짓점이 12개예요', tag: TAGS.asEdge },
          ],
          steps: ['면 6개가 모두 직사각형이고, 정사각형이 아닌 면도 있어요', '그래서 직육면체예요 — 면 6개가 모두 직사각형이에요'],
          why: {
            [TAGS.sixFaces]: '면이 6개인 것은 직육면체도 같아요. 정육면체는 면 6개가 모두 정사각형이어야 해요.',
            [TAGS.sameLenNeed]: '모서리 길이가 모두 같아야 하는 것은 정육면체예요. 직육면체는 직사각형 6개면 돼요.',
            [TAGS.asEdge]: '12는 모서리의 수예요. 꼭짓점은 8개예요.',
          },
          probe: { d, ask: 'cuboidSay' },
        };
      })()]));
      return calcAsk(r, c, this, runFamily(r, c, fams));
    },
    misread(r, c) {
      if (branchOf(r, c, ['visible', 'cube']) === 'visible') {
        const d = dims3(r, 3, 9);
        return misAsk(r, c, this, 'visible', {
          q: `직육면체 모양의 상자가 있어요.\n\n${cubBare(d)}\n\n${showWork('이 직육면체의 모서리는 9개예요')}`,
          ok: '점선으로 그린 뒤쪽 모서리 3개까지 — 모서리는 12개예요',
          wr: [
            { text: '맞게 말했어요', tag: RIGHT_AS_WRONG },
            { text: '꼭짓점이 8개니까 모서리도 8개예요', tag: TAGS.asVertex },
            { text: '상자는 모서리를 셀 수 없어요', tag: OFF },
          ],
          steps: ['보이는 모서리 9개 + 뒤쪽에 숨은 모서리 3개', '9 + 3 = 12 → 모서리는 12개'],
          whyAny: '보이는 것만 셌어요. 직육면체의 모서리는 뒤쪽에 숨은 것까지 12개예요.',
          probe: { ask: 'edge', shown: 9 },
        });
      }
      const s = int(r, 2, 12);
      return misAsk(r, c, this, 'cube', {
        q: `한 모서리가 ${s} cm인 정육면체가 있어요.\n\n${cub([s, s, s])}\n\n${showWork('정육면체는 면이 정사각형이라서 직육면체가 아니에요')}`,
        ok: '정사각형도 직사각형이에요 — 정육면체는 직육면체라고 할 수 있어요',
        wr: [
          { text: '맞게 말했어요', tag: RIGHT_AS_WRONG },
          { text: '직육면체는 모두 정육면체예요', tag: TAGS.subsetSwap },
          { text: '정육면체에는 면이 없어요', tag: OFF },
        ],
        steps: ['정사각형은 네 각이 모두 직각이라서 직사각형이라고 할 수 있어요', '정육면체는 직사각형 6개로 둘러싸인 셈 — 직육면체라고 할 수 있어요'],
        whyAny: '정사각형도 직사각형이에요. 그래서 정육면체는 직육면체라고 할 수 있어요 — 거꾸로 직육면체가 모두 정육면체인 것은 아니에요.',
        probe: { ask: 'cubeSay' },
      });
    },
  },

  {
    id: 'cub.sketch', grade: 5, name: '직육면체의 겨냥도', needs: ['cub.parts'],
    idea: '직육면체 모양을 잘 알 수 있게 나타낸 그림을 **겨냥도**라고 해요. 보이는 모서리는 **실선**, 보이지 않는 모서리는 **점선**으로 그려요. 겨냥도에서 보이는 모서리 9개 · 보이지 않는 모서리 3개, 보이는 꼭짓점 7개 · 보이지 않는 꼭짓점 1개, 보이는 면 3개 · 보이지 않는 면 3개. 직육면체에는 길이가 같은 모서리가 **4개씩** 세 묶음 있어서 **모든 모서리 길이의 합 = (가로 + 세로 + 높이) × 4**.',
    rule: '보이지 않는 모서리는 점선 3개 — 모서리 길이의 합 = (가로 + 세로 + 높이) × 4.',
    slip: '보이는 것인지 보이지 않는 것인지, 같은 길이 모서리가 몇 개씩인지 다시 봐요.',
    calc(r, c) {
      const fams = [];
      // 겨냥도에서 세기
      const SEE = {
        hidEdge: { q: '보이지 않는 모서리는', ans: 3, wr: [[9, TAGS.hidVsVis], [1, TAGS.hidVertex]], steps: ['보이지 않는 꼭짓점 1개에 모서리 3개가 모여요', '그 3개가 모두 점선 → 3개'] },
        visVertex: { q: '보이는 꼭짓점은', ans: 7, wr: [[1, TAGS.hidVsVis], [8, TAGS.countAll], [9, TAGS.visEdgeCount]], steps: ['꼭짓점 8개 중 뒤쪽 아래 1개만 보이지 않아요', '8 − 1 = 7 → 7개'] },
        visEdge: { q: '보이는 모서리는', ans: 9, wr: [[3, TAGS.hidVsVis], [12, TAGS.countAll], [7, TAGS.visVertexCount]], steps: ['모서리 12개 중 점선은 3개', '12 − 3 = 9 → 9개'] },
        visFace: { q: '보이는 면은', ans: 3, wr: [[6, TAGS.countAll], [9, TAGS.visEdgeCount], [7, TAGS.visVertexCount]], steps: ['위·앞·오른쪽 면이 보이고, 아래·뒤·왼쪽 면은 보이지 않아요', '보이는 면 → 3개'] },
      };
      const WHY = {
        [TAGS.hidVsVis]: '보이는 것과 보이지 않는 것을 바꿔 셌어요. 점선이 보이지 않는 모서리예요.',
        [TAGS.hidVertex]: '보이지 않는 꼭짓점은 1개지만, 거기에 모서리 3개가 모여요.',
        [TAGS.countAll]: '보이지 않는 것까지 셌어요. 겨냥도에서 보이는 것만 물었어요.',
        [TAGS.visEdgeCount]: '9는 보이는 모서리의 수예요.',
        [TAGS.visVertexCount]: '7은 보이는 꼭짓점의 수예요.',
      };
      fams.push(famOf(Object.entries(SEE).map(([k, s]) => {
        const d = dims3(r, 3, 9);
        return {
          t: `직육면체의 겨냥도예요.\n\n${cubBare(d)}\n\n겨냥도에서 ${s.q} 몇 개일까요?`,
          ans: String(s.ans), wr: s.wr.map(([v, tag]) => ({ text: String(v), tag })), steps: s.steps, why: WHY, probe: { ask: k },
        };
      })));
      // 겨냥도 완성하기 — 빠진 모서리 3개 (실선 x개, 점선 3 − x개)
      fams.push(famOf([(() => {
        const d = dims3(r, 3, 9);
        const x = int(r, 1, 2); const y = 3 - x;
        const vis = shuffle(r, [0, 1, 2, 3, 5, 6, 9, 10, 11]).slice(0, x); const hid = shuffle(r, [4, 7, 8]).slice(0, y);
        const miss = [...vis, ...hid].sort((a, b) => a - b);
        const say = (s, h) => `실선 ${s}개, 점선 ${h}개`;
        return {
          t: `{mon/이/가} 직육면체의 겨냥도를 그리다가 모서리 몇 개를 빠뜨렸어요.\n\n${cubBare(d, `miss=${miss.join(',')}`)}\n\n겨냥도를 완성하려면 실선과 점선을 각각 몇 개 더 그려야 할까요?`,
          text: true, ans: say(x, y),
          wr: [{ text: say(y, x), tag: TAGS.swapLine }, { text: say(3, 0), tag: TAGS.allSolid }, { text: say(0, 3), tag: TAGS.allDash }],
          steps: ['겨냥도에는 실선 9개, 점선 3개', `그림에는 실선 ${9 - x}개, 점선 ${3 - y}개`, `더 그릴 것: ${say(x, y)}`],
          why: {
            [TAGS.swapLine]: '보이는 모서리는 실선, 보이지 않는 모서리는 점선 — 빠진 자리가 보이는 곳인지 숨은 곳인지 봐요.',
            [TAGS.allSolid]: '보이지 않는 모서리는 점선으로 그려요.',
            [TAGS.allDash]: '보이는 자리에서 빠진 모서리는 실선으로 그려요.',
          },
          probe: { miss, ask: 'complete' },
        };
      })()]));
      // 길이가 같은 모서리
      fams.push(famOf([(() => {
        const d = dims3(r, 3, 12); const L = pick(r, d);
        return {
          t: `직육면체의 겨냥도예요.\n\n${cub(d)}\n\n길이가 ${L} cm인 모서리는 모두 몇 개일까요?`,
          ans: '4', wr: [{ text: '3', tag: TAGS.visibleOnly }, { text: '1', tag: TAGS.labelOnly }, { text: '12', tag: TAGS.allSame }],
          steps: ['직육면체에는 길이가 같은 모서리가 4개씩 있어요 — 그중 하나는 뒤쪽에 숨은 점선', `길이가 ${L} cm인 모서리: 보이는 것 3개 + 점선 1개 → 4개`],
          why: {
            [TAGS.visibleOnly]: '점선으로 그린 뒤쪽 모서리 하나도 같은 길이예요.',
            [TAGS.labelOnly]: '길이는 한 곳에만 적었지만 같은 길이의 모서리가 4개씩 있어요.',
            [TAGS.allSame]: '모든 모서리가 같은 길이인 것은 정육면체예요. 이 직육면체는 4개씩 같아요.',
          },
          probe: { d, len: L, ask: 'sameLen' },
        };
      })()]));
      // 모든 모서리 길이의 합 — 직육면체
      fams.push(famOf([
        (() => { const d = dims3(r, 3, 12); return edgeSum(d, `직육면체의 겨냥도예요.\n\n${cub(d)}\n\n모든 모서리 길이의 합은 몇 cm일까요?`); })(),
        (() => { const d = dims3(r, 3, 12); return edgeSum(d, `{mon/이/가} 가로 ${d[0]} cm, 세로 ${d[1]} cm, 높이 ${d[2]} cm인 직육면체 모양의 상자를 끈으로 만들어요.\n\n${cub(d)}\n\n모든 모서리 길이의 합은 몇 cm일까요?`); })(),
      ]));
      // 정육면체
      fams.push(famOf([(() => {
        const s = int(r, 2, 12);
        return {
          t: `한 모서리가 ${s} cm인 정육면체가 있어요.\n\n${cub([s, s, s])}\n\n모든 모서리 길이의 합은 몇 cm일까요?`,
          ans: String(12 * s), wr: [{ text: String(3 * s), tag: TAGS.threeOnly }, { text: String(9 * s), tag: TAGS.visSum }, { text: String(6 * s), tag: TAGS.faceTimes }],
          steps: ['정육면체는 모서리 12개의 길이가 모두 같아요', `${s} × 12 = ${12 * s}`],
          why: {
            [TAGS.threeOnly]: '길이를 적은 세 모서리만 더했어요. 모서리는 12개예요.',
            [TAGS.visSum]: '보이는 모서리 9개만 더했어요. 점선 3개도 더해요.',
            [TAGS.faceTimes]: '6은 면의 수예요. 모서리 12개를 더해요.',
          },
          probe: { d: [s, s, s], ask: 'edgeSum' },
        };
      })()]));
      // 거꾸로 — 모서리 길이의 합으로 한 모서리
      fams.push(famOf([(() => {
        const s = int(r, 2, 12); const Lsum = 12 * s;
        return {
          t: `모든 모서리 길이의 합이 ${Lsum} cm인 정육면체가 있어요.\n\n${cubAsk([s, s, s])}\n\n한 모서리의 길이는 몇 cm일까요?`,
          ans: String(s), wr: [{ text: num(Lsum / 4), tag: TAGS.div4 }, { text: num(Lsum / 6), tag: TAGS.div6 }, { text: num(Lsum / 8), tag: TAGS.div8 }],
          steps: ['정육면체는 길이가 같은 모서리가 12개', `${Lsum} ÷ 12 = ${s}`],
          why: {
            [TAGS.div4]: '4개씩 같은 것은 직육면체예요. 정육면체는 12개가 모두 같아서 ÷ 12.',
            [TAGS.div6]: '6은 면의 수예요. 모서리 12개로 나눠요.',
            [TAGS.div8]: '8은 꼭짓점의 수예요. 모서리 12개로 나눠요.',
          },
          probe: { sum: Lsum, ask: 'edgeInv' },
        };
      })()]));
      return calcAsk(r, c, this, runFamily(r, c, fams));
    },
    misread(r, c) {
      if (branchOf(r, c, ['hidden', 'sum']) === 'hidden') {
        const d = dims3(r, 3, 9);
        return misAsk(r, c, this, 'hidden', {
          q: `직육면체의 겨냥도예요.\n\n${cubBare(d)}\n\n${showWork('보이지 않는 꼭짓점이 1개니까 보이지 않는 모서리도 1개예요')}`,
          ok: '보이지 않는 꼭짓점에 모서리 3개가 모여요 — 보이지 않는 모서리는 3개예요',
          wr: [
            { text: '맞게 말했어요', tag: RIGHT_AS_WRONG },
            { text: '보이지 않는 모서리는 9개예요', tag: TAGS.hidVsVis },
            { text: '보이지 않는 모서리는 겨냥도에 그리지 않아요', tag: TAGS.noDash },
          ],
          steps: ['꼭짓점 하나에는 모서리 3개가 모여요', '보이지 않는 꼭짓점에 모인 모서리 3개가 모두 점선 → 3개'],
          whyAny: '꼭짓점 1개에 모서리가 3개씩 모여요. 보이지 않는 꼭짓점에 모인 모서리 3개가 모두 보이지 않아요.',
          probe: { ask: 'hidEdge', shown: 1 },
        });
      }
      const d = dims3(r, 3, 12); const s = d[0] + d[1] + d[2];
      return misAsk(r, c, this, 'sum', {
        q: `직육면체의 겨냥도예요.\n\n${cub(d)}\n\n${showWork(`모든 모서리 길이의 합은 ${d[0]} + ${d[1]} + ${d[2]} = ${s} cm예요`)}`,
        ok: `길이가 같은 모서리가 4개씩 — ${s} × 4 = ${4 * s} cm`,
        wr: [
          { text: '맞게 말했어요', tag: RIGHT_AS_WRONG },
          { text: `${s} × 2 = ${2 * s} cm예요`, tag: TAGS.timesTwo },
          { text: '모서리의 길이는 더할 수 없어요', tag: OFF },
        ],
        steps: [`${d[0]} + ${d[1]} + ${d[2]} = ${s} — 길이가 다른 모서리 세 개`, `같은 길이가 4개씩 → ${s} × 4 = ${4 * s} cm`],
        whyAny: '적힌 세 모서리만 더했어요. 직육면체에는 길이가 같은 모서리가 4개씩 있어요.',
        probe: { d, ask: 'edgeSum', shown: s },
      });
    },
  },

  {
    id: 'cub.faces', grade: 5, name: '직육면체의 성질', needs: ['cub.sketch'],
    idea: '직육면체에서 계속 늘여도 만나지 않는 두 면을 **평행하다**고 해요. **마주 보는 면 3쌍**이 서로 평행하고, 평행한 두 면을 **밑면**이라고 해요. 서로 만나는 두 면은 **수직**이에요 — 한 면과 수직인 면은 **4개**이고, 밑면과 수직인 면을 **옆면**이라고 해요. 면은 꼭짓점 이름 네 개로 불러요(면 ㄱㄴㄷㄹ).',
    rule: '마주 보는 면은 평행(3쌍), 만나는 면은 수직 — 한 면과 수직인 면은 4개.',
    slip: '두 면이 모서리에서 만나는지, 마주 보는지 먼저 봐요.',
    calc(r, c) {
      const fams = [];
      // 평행한 면 · 다른 밑면 — 색칠한 면
      fams.push(famOf(['색칠한 면과 평행한 면은 어느 것일까요?', '색칠한 면을 한 밑면이라고 할 때, 다른 밑면은 어느 것일까요?'].map((ask) => {
        const d = dims3(r, 3, 9); const i = int(r, 0, 2); const f = CUB_FACES[CUB_SHADE[i]];
        return parallelOf(r, f, `직육면체의 겨냥도에 면 하나를 색칠했어요.\n\n${cubBare(d, `names shade=${i}`)}\n\n${ask}`, d);
      })));
      // 평행한 면 — 이름으로 (보이지 않는 면도)
      fams.push(famOf(FACE_LIST.map((f) => {
        const d = dims3(r, 3, 9);
        return parallelOf(r, f, `직육면체의 겨냥도예요.\n\n${cubBare(d, 'names')}\n\n면 ${jw(f, '과', '와')} 평행한 면은 어느 것일까요?`, d);
      })));
      // 수직인 면 · 옆면의 수
      fams.push(famOf(['색칠한 면과 수직인 면은 모두 몇 개일까요?', '색칠한 면을 밑면으로 할 때, 옆면은 모두 몇 개일까요?'].map((ask) => {
        const d = dims3(r, 3, 9); const i = int(r, 0, 2);
        return {
          t: `직육면체의 겨냥도에 면 하나를 색칠했어요.\n\n${cubBare(d, `names shade=${i}`)}\n\n${ask}`,
          ans: '4', wr: [{ text: '5', tag: TAGS.withOpp }, { text: '2', tag: TAGS.visPerp }],
          steps: ['색칠한 면과 모서리에서 만나는 면이 수직 — 마주 보는 면 하나만 만나지 않아요', '6 − 1 − 1 = 4 → 4개'],
          why: {
            [TAGS.withOpp]: '마주 보는 면은 색칠한 면과 만나지 않아요 — 그 면은 평행이에요.',
            [TAGS.visPerp]: '보이지 않는 면 중에도 색칠한 면과 만나는 면이 있어요.',
          },
          probe: { shade: i, ask: 'perpCount' },
        };
      })));
      // 평행한 면의 넓이
      fams.push(famOf(['top', 'front', 'right', 'back'].map((k) => {
        const f = CUB_FACES[k]; const [i, j] = FACE_AXES[k];
        // 이웃한 면 넷은 넓이가 두 가지 (마주 보는 두 쌍) — 오답은 그 두 넓이
        const nbAreas = (x) => [...new Set(adjOf(f).map((g) => faceArea(g, x)))];
        const d = dims3(r, 3, 12, (x) => allDiff(faceArea(f, x), ...nbAreas(x), x[i] + x[j]));
        const o = oppOf(f); const A = faceArea(o, d);
        return {
          t: `직육면체의 겨냥도예요.\n\n${cub(d, 'names')}\n\n면 ${jw(f, '과', '와')} 평행한 면의 넓이는 몇 cm²일까요?`,
          ans: String(A),
          wr: [...nbAreas(d).map((v) => ({ text: String(v), tag: TAGS.nextFace })), { text: String(d[i] + d[j]), tag: TAGS.addForMul }],
          steps: [`면 ${jw(f, '과', '와')} 평행한 면은 마주 보는 면 ${o} — 크기가 같아요`, `${d[i]} × ${d[j]} = ${A}`],
          why: {
            [TAGS.nextFace]: '색칠하지 않아도 모서리에서 만나는 면은 평행이 아니에요. 마주 보는 면의 넓이를 구해요.',
            [TAGS.addForMul]: '직사각형의 넓이는 두 변을 곱해요.',
          },
          probe: { d, face: f, ask: 'parArea' },
        };
      })));
      return calcAsk(r, c, this, runFamily(r, c, fams));
    },
    misread(r, c) {
      const d = dims3(r, 3, 9); const i = int(r, 0, 2); const f = CUB_FACES[CUB_SHADE[i]]; const o = oppOf(f);
      if (branchOf(r, c, ['next', 'perp']) === 'next') {
        const [a1, a2] = shuffle(r, adjOf(f));
        return misAsk(r, c, this, 'next', {
          q: `직육면체의 겨냥도에 면 하나를 색칠했어요.\n\n${cubBare(d, `names shade=${i}`)}\n\n${showWork(`색칠한 면과 평행한 면은 면 ${jw(a1, '이에요', '예요')}`)}`,
          ok: `면 ${jw(a1, '은', '는')} 색칠한 면과 모서리에서 만나요 — 평행한 면은 마주 보는 면 ${o}`,
          wr: [
            { text: '맞게 말했어요', tag: RIGHT_AS_WRONG },
            { text: `평행한 면은 면 ${jw(a2, '이에요', '예요')}`, tag: TAGS.nextFace },
            { text: '직육면체에는 평행한 면이 없어요', tag: OFF },
          ],
          steps: ['평행한 면은 계속 늘여도 만나지 않는 면 — 마주 보는 면', `색칠한 면 ${jw(f, '과', '와')} 마주 보는 면은 면 ${o}`],
          whyAny: `면 ${jw(a1, '은', '는')} 색칠한 면과 모서리를 함께 쓰는 이웃한 면이에요. 만나는 면은 수직이고, 평행한 면은 마주 보는 면이에요.`,
          probe: { shade: i, ask: 'parallel', shown: a1 },
        });
      }
      return misAsk(r, c, this, 'perp', {
        q: `직육면체의 겨냥도에 면 하나를 색칠했어요.\n\n${cubBare(d, `names shade=${i}`)}\n\n${showWork('색칠한 면과 수직인 면은 마주 보는 면까지 5개예요')}`,
        ok: `마주 보는 면 ${jw(o, '은', '는')} 색칠한 면과 만나지 않아요 — 수직인 면은 4개`,
        wr: [
          { text: '맞게 말했어요', tag: RIGHT_AS_WRONG },
          { text: '수직인 면은 보이는 2개뿐이에요', tag: TAGS.visPerp },
          { text: '면끼리는 수직일 수 없어요', tag: OFF },
        ],
        steps: ['색칠한 면과 모서리에서 만나는 면이 수직', `마주 보는 면 ${o} 하나만 빼면 6 − 1 − 1 = 4개`],
        whyAny: '마주 보는 면은 색칠한 면과 만나지 않는 평행한 면이에요. 수직인 면은 만나는 면 4개뿐이에요.',
        probe: { shade: i, ask: 'perpCount', shown: 5 },
      });
    },
  },

  {
    id: 'cub.net', grade: 5, name: '직육면체의 전개도', needs: ['cub.faces'],
    idea: '직육면체의 모서리를 잘라서 펼친 그림을 **전개도**라고 해요. 잘린 모서리는 실선, 접히는 모서리는 점선으로 그려요. 전개도를 접으면 **겹치는 선분은 길이가 같아요**. 전개도에서 바로 붙어 있는 두 면은 접으면 만나고, **한 줄로 셋이 이어지면 양 끝 두 면이 마주 봐요**. 정육면체의 전개도는 모양이 여러 가지예요(11가지).',
    rule: '전개도에서 붙어 있는 면은 접으면 만나고, 한 줄로 셋이 이어지면 양 끝이 마주 봐요.',
    slip: '머릿속으로 한 면씩 접어 보고, 붙어 있는 면인지 건너뛴 면인지 봐요.',
    calc(r, c) {
      const fams = [];
      // 마주 보는 면 (평행한 면)
      fams.push(famOf(['.X../XXXX/.X..', 'X.../XXXX/..X.', 'XX../.XXX/..X.', 'XX../.XX./..XX', 'XXX../..XXX', '.X../XXXX/..X.'].map((pat, i) => {
        const N = cubeNet(r, pat);
        return oppAsk(r, N, `정육면체의 전개도예요.\n\n${N.fig}\n\n전개도를 접었을 때 면 ㉮와 ${i % 2 ? '평행한 면' : '마주 보는 면'}은 어느 것일까요?`);
      })));
      // 만나는 점
      fams.push(famOf(['.X../XXXX/.X..', 'X.../XXXX/...X', 'XX../.XXX/.X..', 'XXX../..XXX'].map((pat) => meetAsk(r, pat))));
      // 겹치는 선분
      fams.push(famOf(['.X../XXXX/..X.', 'X.../XXXX/X...', 'XX../.XXX/...X', 'XX../.XX./..XX'].map((pat) => segAsk(r, pat))));
      // 전개도가 될까 — 접히는 모양 다섯 · 겹치는 모양 다섯
      fams.push(famOf(['.X../XXXX/.X..', 'X.../XXXX/..X.', 'XX../.XXX/.X..', 'XX../.XX./..XX', 'XXX../..XXX', 'X..X/XXXX', 'X.X./XXXX', 'XXXXX/X....', 'XXXX/..XX', '.X.X/XXXX'].map((pat) => isNetAsk(r, pat))));
      // 직육면체 전개도에서 ?의 길이
      fams.push(famOf(CUBOID_NETS.slice(0, 4).map((pat) => {
        const d = dims3(r, 2, 9, () => true, 2.5);
        const N = cuboidNet(r, pat, d, true);
        const ans = N.L.segs[N.q].len;
        return {
          t: `직육면체의 전개도예요.\n\n${N.fig}\n\n?로 표시한 선분의 길이는 몇 cm일까요?`,
          ans: String(ans), wr: d.filter((v) => v !== ans).map((v) => ({ text: String(v), tag: TAGS.wrongDim })),
          steps: ['전개도를 접으면 겹치는 선분끼리, 한 면에서 마주 보는 변끼리 길이가 같아요', `?로 표시한 선분은 접었을 때 길이가 ${ans} cm인 모서리가 돼요 → ${ans}`],
          why: { [TAGS.wrongDim]: '다른 모서리의 길이예요. ?로 표시한 선분과 길이가 같은 선분을 접어서 찾아요.' },
          probe: { net: N.spec, ask: 'netLen' },
        };
      })));
      return calcAsk(r, c, this, runFamily(r, c, fams));
    },
    misread(r, c) {
      if (branchOf(r, c, ['next', 'ends']) === 'next') {
        const N = cubeNet(r, pick(r, CUBE_NETS)); const L = N.L;
        const o = oppD(L, 1); const nb = shuffle(r, netNbrs(L, 1)); const a = nb[0];
        // 다른 오답: 붙어 있는 다른 면, 없으면 접으면 만나는 면 중 하나 (마주 보는 면만 아니면 된다)
        const b = nb[1] || pick(r, [2, 3, 4, 5, 6].filter((x) => x !== o && x !== a));
        return misAsk(r, c, this, 'next', {
          q: `정육면체의 전개도예요.\n\n${N.fig}\n\n${showWork(`면 ㉮와 마주 보는 면은 면 ${jw(F(a), '이에요', '예요')}`)}`,
          ok: `면 ${jw(F(a), '은', '는')} ㉮와 붙어 있어서 접으면 만나요 — 마주 보는 면은 면 ${F(o)}`,
          wr: [
            { text: '맞게 말했어요', tag: RIGHT_AS_WRONG },
            { text: `마주 보는 면은 면 ${jw(F(b), '이에요', '예요')}`, tag: nb[1] ? TAGS.netNext : TAGS.netMeet },
            { text: '전개도로는 마주 보는 면을 알 수 없어요', tag: OFF },
          ],
          steps: [`면 ${jw(F(a), '은', '는')} ㉮와 변이 붙어 있어서 접으면 ㉮와 만나요`, `접어 보면 ㉮와 만나지 않는 면은 면 ${F(o)}`],
          whyAny: '전개도에서 붙어 있는 두 면은 그 변을 따라 접혀 서로 만나요. 마주 보는 면은 만나지 않는 면이에요.',
          probe: { net: N.spec, ask: 'opp', shown: a },
        });
      }
      // 한 줄로 이어진 네 면의 양 끝 — 1-4-1 모양에서 ㉮를 가운데 줄 끝 칸에 (숫자를 서로 바꿔서)
      const shape0 = labelShape(r, pick(r, CUBE_NETS.slice(0, 6)));
      const endCh = shape0.split('/')[1][pick(r, [0, 3])];
      const shape = shape0.replace(/[1-6]/g, (ch) => (ch === '1' ? endCh : ch === endCh ? '1' : ch));
      const L = parseNet(shape).L;
      const e = endOf4(L, 1); const o = oppD(L, 1);
      const nb = netNbrs(L, 1).filter((x) => x !== e);
      return misAsk(r, c, this, 'ends', {
        q: `정육면체의 전개도예요.\n\n[net ${shape}]\n\n${showWork(`면 ㉮와 마주 보는 면은 줄의 반대쪽 끝에 있는 면 ${jw(F(e), '이에요', '예요')}`)}`,
        ok: `줄 양 끝의 두 면은 접으면 만나요 — 마주 보는 면은 한 면을 건너뛴 면 ${F(o)}`,
        wr: [
          { text: '맞게 말했어요', tag: RIGHT_AS_WRONG },
          { text: `마주 보는 면은 바로 옆의 면 ${jw(F(nb[0]), '이에요', '예요')}`, tag: TAGS.netNext },
          { text: '정육면체에는 마주 보는 면이 없어요', tag: OFF },
        ],
        steps: ['한 줄로 이어진 네 면을 접으면 빙 둘러 이어져서 양 끝이 만나요', `한 면을 건너뛴 면 ${F(o)} — 면 ㉮와 마주 봐요`],
        whyAny: '한 줄로 이어진 네 면은 접으면 상자의 옆을 한 바퀴 둘러서, 양 끝 두 면이 모서리에서 만나요.',
        probe: { net: shape, ask: 'opp', shown: e },
      });
    },
  },

  {
    id: 'cub.surface', grade: 6, name: '직육면체의 겉넓이', needs: ['cub.net'],
    idea: '직육면체의 **여섯 면의 넓이의 합**을 **겉넓이**라고 해요. 마주 보는 면은 넓이가 같아서 **(한 꼭짓점에서 만나는 세 면의 넓이의 합) × 2**로 구할 수 있고, **옆면의 넓이(밑면의 둘레 × 높이) + 밑면의 넓이 × 2**로도 구해요. 정육면체의 겉넓이 = **한 면의 넓이 × 6**.',
    rule: '겉넓이 = (세 면의 넓이의 합) × 2, 정육면체는 한 면의 넓이 × 6.',
    slip: '여섯 면을 모두 더했는지 — 마주 보는 면까지 셌는지 봐요.',
    calc(r, c) {
      const fams = [];
      const okSurf = ([a, b, h]) => allDiff(2 * (a * b + b * h + a * h), a * b + b * h + a * h, a * b * h, 2 * (a + b) * h);
      fams.push(famOf([
        (() => { const d = dims3(r, 2, 12, okSurf); return surfOf(d, `직육면체의 겨냥도예요.\n\n${cub(d)}\n\n이 직육면체의 겉넓이는 몇 cm²일까요?`); })(),
        (() => { const d = dims3(r, 2, 12, okSurf); return surfOf(d, `{mon/이/가} 가로 ${d[0]} cm, 세로 ${d[1]} cm, 높이 ${d[2]} cm인 직육면체 모양의 상자를 포장지로 빈틈없이 감싸요.\n\n${cub(d)}\n\n상자의 겉넓이는 몇 cm²일까요?`); })(),
        // 전개도 모양은 틀마다 고정 — 무작위로 고르면 🔁 쌍둥이가 같은 틀(열쇠)을 못 찾는다
        ...[CUBOID_NETS[0], CUBOID_NETS[2]].map((pat) => { const d = dims3(r, 2, 9, okSurf, 2.5); const N = cuboidNet(r, pat, d, false); return surfOf(d, `직육면체의 전개도예요.\n\n${N.fig}\n\n이 전개도로 만든 직육면체의 겉넓이는 몇 cm²일까요?`, N.spec); }),
      ]));
      // 정육면체 — 한 모서리 4·6은 뺀다 (4: 4 × 4 × 4 = 64 = 네 면, 6: 6 × 6 × 6 = 216 = 겉넓이)
      const cubeEdge = () => intWhere(r, 2, 12, (s) => allDiff(6 * s * s, 4 * s * s, s * s * s, 6 * s));
      fams.push(famOf([
        (() => { const s = cubeEdge(); return cubeSurf(s, `한 모서리가 ${s} cm인 정육면체가 있어요.\n\n${cub([s, s, s])}\n\n이 정육면체의 겉넓이는 몇 cm²일까요?`); })(),
        (() => { const s = cubeEdge(); return cubeSurf(s, `{mon/이/가} 한 모서리가 ${s} cm인 정육면체 모양의 선물 상자를 만들어요.\n\n${cub([s, s, s])}\n\n선물 상자의 겉넓이는 몇 cm²일까요?`); })(),
      ]));
      // 옆면의 넓이 — 밑면의 둘레 × 높이
      fams.push(famOf([(() => {
        const d = dims3(r, 2, 12, ([a, b, h]) => allDiff(2 * (a + b) * h, (a + b) * h, 2 * (a + b) * h + 2 * a * b, a * b * h));
        const [a, b, h] = d; const p = 2 * (a + b); const ans = p * h;
        return {
          t: `직육면체의 겨냥도예요. 아랫면을 밑면으로 해요.\n\n${cub(d)}\n\n옆면 4개의 넓이의 합은 몇 cm²일까요?`,
          ans: String(ans), wr: [{ text: String((a + b) * h), tag: TAGS.halfPerim }, { text: String(ans + 2 * a * b), tag: TAGS.withBase }, { text: String(a * b * h), tag: TAGS.mulAll }],
          steps: [`밑면의 둘레 = ${a} + ${b} + ${a} + ${b} = ${p}`, `옆면 4개를 펼치면 가로 ${p}, 세로 ${h}인 직사각형 → ${p} × ${h} = ${ans}`],
          why: {
            [TAGS.halfPerim]: `${jn(`${a} + ${b}`, '은', '는')} 밑면 둘레의 반이에요. 옆면은 네 개라서 둘레 전체(${p})를 곱해요.`,
            [TAGS.withBase]: '밑면 두 개까지 더하면 겉넓이예요. 옆면만 물었어요.',
            [TAGS.mulAll]: '세 길이를 곱하면 넓이가 아니에요. 옆면은 밑면의 둘레 × 높이.',
          },
          probe: { d, ask: 'side' },
        };
      })()]));
      return calcAsk(r, c, this, runFamily(r, c, fams));
    },
    misread(r, c) {
      if (branchOf(r, c, ['three', 'cube4']) === 'three') {
        // 6 · 12 · 4면 세 길이를 곱한 오답 288이 겉넓이 288과 같다 (2만 씨앗이 잡음) — ①과 같은 조건으로 뽑는다
        const d = dims3(r, 2, 12, ([x, y, z]) => allDiff(2 * (x * y + y * z + x * z), x * y + y * z + x * z, x * y * z));
        const [a, b, h] = d; const s3 = a * b + b * h + a * h;
        return misAsk(r, c, this, 'three', {
          q: `직육면체의 겨냥도예요.\n\n${cub(d)}\n\n${showWork(`이 직육면체의 겉넓이는 ${a * b} + ${b * h} + ${a * h} = ${s3} cm²예요`)}`,
          ok: `마주 보는 면도 넓이가 같아요 — ${s3} × 2 = ${2 * s3} cm²`,
          wr: [
            { text: '맞게 말했어요', tag: RIGHT_AS_WRONG },
            { text: `${a} × ${b} × ${h} = ${a * b * h} cm²예요`, tag: TAGS.mulAll },
            { text: '상자는 겉넓이를 구할 수 없어요', tag: OFF },
          ],
          steps: [`보이는 세 면: ${a * b} + ${b * h} + ${a * h} = ${s3}`, `마주 보는 세 면도 같은 넓이 → ${s3} × 2 = ${2 * s3} cm²`],
          whyAny: '세 면만 더했어요. 겉넓이는 여섯 면의 넓이의 합이라서, 마주 보는 면까지 × 2를 해요.',
          probe: { d, ask: 'surf', shown: s3 },
        });
      }
      const s = intWhere(r, 2, 12, (x) => x !== 4 && x !== 6);
      return misAsk(r, c, this, 'cube4', {
        q: `한 모서리가 ${s} cm인 정육면체가 있어요.\n\n${cub([s, s, s])}\n\n${showWork(`정육면체의 겉넓이는 ${s} × ${s} × 4 = ${4 * s * s} cm²예요`)}`,
        ok: `면은 6개예요 — ${s} × ${s} × 6 = ${6 * s * s} cm²`,
        wr: [
          { text: '맞게 말했어요', tag: RIGHT_AS_WRONG },
          { text: `${s} × 6 = ${6 * s} cm²예요`, tag: TAGS.edgeTimes6 },
          { text: '정육면체는 겉넓이가 없어요', tag: OFF },
        ],
        steps: [`한 면의 넓이 ${s} × ${s} = ${s * s}`, `면이 6개 → ${s * s} × 6 = ${6 * s * s} cm²`],
        whyAny: '옆면 4개만 셌어요. 위와 아래 면까지 정육면체의 면은 6개예요.',
        probe: { d: [s, s, s], ask: 'surf', shown: 4 * s * s },
      });
    },
  },

  {
    id: 'cub.unit', grade: 6, name: '부피와 1 cm³', needs: ['cub.surface'],
    idea: '어떤 물건이 공간에서 차지하는 크기를 **부피**라고 해요. 한 모서리가 1 cm인 정육면체의 부피를 **1 cm³**(1 세제곱센티미터)라고 써요. 부피가 1 cm³인 쌓기나무로 직육면체를 쌓으면 **한 층의 개수(가로 × 세로) × 층 수**만큼이 부피예요. 높이만 보고는 부피를 비교할 수 없어요 — 쌓기나무 수로 비교해요.',
    rule: '부피 = 쌓기나무 수 — 한 층의 개수 × 층 수 (cm³).',
    slip: '안쪽에 숨은 쌓기나무까지 셌는지, 층마다 같은 개수인지 봐요.',
    calc(r, c) {
      const fams = [];
      // 쌓기나무 그림
      fams.push(famOf([(() => {
        const d = dims3(r, 2, 5, ([a, b, h]) => allDiff(a * b * h, a * b + b * h + a * h - a - b - h + 1, a * b, a + b + h), 2.5);
        const [a, b, h] = d; const vis = a * b + b * h + a * h - a - b - h + 1;
        return {
          t: `부피가 1 cm³인 쌓기나무로 직육면체를 쌓았어요.\n\n${cubBare(d, 'cubes')}\n\n이 직육면체의 부피는 몇 cm³일까요?`,
          ans: String(a * b * h), wr: [{ text: String(vis), tag: TAGS.visCubes }, { text: String(a * b), tag: TAGS.oneLayer }, { text: String(a + b + h), tag: TAGS.addDims }],
          steps: [`한 층에 가로 ${a}개 × 세로 ${b}개 = ${a * b}개`, `${h}층 → ${a * b} × ${h} = ${a * b * h}개`, `1 cm³가 ${a * b * h}개 → ${a * b * h} cm³`],
          why: {
            [TAGS.visCubes]: '안쪽에 숨은 쌓기나무도 있어요. 한 층의 개수 × 층 수로 세요.',
            [TAGS.oneLayer]: `한 층만 셌어요. ${h}층이에요.`,
            [TAGS.addDims]: '가로·세로·높이의 개수를 더하면 한 줄씩만 센 거예요. 곱해요.',
          },
          probe: { d, ask: 'cubes' },
        };
      })()]));
      // 글로 — 한 층 가로 a개, 세로 b개씩 h층
      fams.push(famOf([(() => {
        // 가로·세로가 둘 다 2면 2 × 2 = 2 + 2라서 "한 층 + 층 수"와 "세 수의 합"이 같아진다 — 셋을 함께 다시 뽑는다
        let a; let b; let h;
        do { a = int(r, 2, 9); b = int(r, 2, 9); h = int(r, 2, 9); } while (!allDiff(a * b * h, a * b, a * b + h, a + b + h));
        return {
          t: `{mon/이/가} 부피가 1 cm³인 쌓기나무를 한 층에 가로 ${a}개, 세로 ${b}개씩 놓고 ${h}층으로 쌓아 직육면체를 만들었어요.\n\n만든 직육면체의 부피는 몇 cm³일까요?`,
          ans: String(a * b * h), wr: [{ text: String(a * b), tag: TAGS.oneLayer }, { text: String(a * b + h), tag: TAGS.addLayers }, { text: String(a + b + h), tag: TAGS.addDims }],
          steps: [`한 층 = ${a} × ${b} = ${a * b}개`, `${h}층 = ${a * b} × ${h} = ${a * b * h}개 → ${a * b * h} cm³`],
          why: {
            [TAGS.oneLayer]: `한 층만 셌어요. ${h}층을 쌓았으니 × ${h}.`,
            [TAGS.addLayers]: `층 수는 더하지 않고 곱해요 — 한 층이 ${h}번 있어요.`,
            [TAGS.addDims]: '세 수를 더하지 않고 곱해요.',
          },
          probe: { d: [a, b, h], ask: 'cubes' },
        };
      })()]));
      // 부피 비교 — 높은 쪽이 작다
      fams.push(famOf([(() => {
        let tall; let wide;
        for (;;) {
          tall = [int(r, 2, 3), int(r, 2, 3), int(r, 4, 6)];
          wide = [int(r, 3, 5), int(r, 3, 5), int(r, 1, 3)];
          const vt = tall[0] * tall[1] * tall[2]; const vw = wide[0] * wide[1] * wide[2];
          if (vw > vt && wide[2] < tall[2]) break;
        }
        const first = r() < 0.5 ? 'wide' : 'tall';
        const [g1, g2] = first === 'wide' ? [wide, tall] : [tall, wide];
        const big = first === 'wide' ? '㉮' : '㉯'; const small = big === '㉮' ? '㉯' : '㉮';
        const vt = tall[0] * tall[1] * tall[2]; const vw = wide[0] * wide[1] * wide[2];
        return {
          // with= — 두 그림을 같은 축척으로 (따로 맞추면 넓은 쪽 쌓기나무가 1.6배 커 보였다, O 3단계 헤드리스)
          t: `부피가 1 cm³인 쌓기나무로 직육면체 ㉮와 ㉯를 쌓았어요.\n\n㉮\n${cubBare(g1, `cubes with=${g2.join(',')}`)}\n\n㉯\n${cubBare(g2, `cubes with=${g1.join(',')}`)}\n\n부피가 더 큰 것은 어느 것일까요?`,
          text: true, ans: big, wr: [{ text: small, tag: TAGS.tallWins }, { text: '두 부피가 같아요', tag: TAGS.sameVol }],
          steps: [`${big}: ${wide[0]} × ${wide[1]} × ${wide[2]} = ${vw}개`, `${small}: ${tall[0]} × ${tall[1]} × ${tall[2]} = ${vt}개`, `${vw} > ${vt} → ${big}`],
          why: {
            [TAGS.tallWins]: '높이만 보면 안 돼요. 쌓기나무 수를 세어 비교해요.',
            [TAGS.sameVol]: '쌓기나무를 세어 보면 개수가 달라요.',
          },
          probe: { ask: 'compare' },
        };
      })()]));
      return calcAsk(r, c, this, runFamily(r, c, fams));
    },
    misread(r, c) {
      const d = dims3(r, 2, 5, ([a, b, h]) => allDiff(a * b * h, a * b + b * h + a * h - a - b - h + 1, a * b, a + b + h), 2.5);
      const [a, b, h] = d; const vis = a * b + b * h + a * h - a - b - h + 1;
      if (branchOf(r, c, ['visible', 'layer']) === 'visible') {
        return misAsk(r, c, this, 'visible', {
          q: `부피가 1 cm³인 쌓기나무로 직육면체를 쌓았어요.\n\n${cubBare(d, 'cubes')}\n\n${showWork(`보이는 쌓기나무를 세면 ${vis}개니까 부피는 ${vis} cm³예요`)}`,
          ok: `안쪽에 숨은 쌓기나무도 있어요 — ${a} × ${b} × ${h} = ${a * b * h} cm³`,
          wr: [
            { text: '맞게 말했어요', tag: RIGHT_AS_WRONG },
            { text: `한 층만 세어 ${a * b} cm³예요`, tag: TAGS.oneLayer },
            { text: '쌓기나무로는 부피를 잴 수 없어요', tag: OFF },
          ],
          steps: [`한 층 ${a} × ${b} = ${a * b}개`, `${h}층 → ${a * b} × ${h} = ${a * b * h}개 → ${a * b * h} cm³`],
          whyAny: '보이는 쌓기나무만 셌어요. 안쪽과 뒤쪽에 가려진 쌓기나무도 부피에 들어가요.',
          probe: { d, ask: 'cubes', shown: vis },
        });
      }
      return misAsk(r, c, this, 'layer', {
        q: `부피가 1 cm³인 쌓기나무로 직육면체를 쌓았어요.\n\n${cubBare(d, 'cubes')}\n\n${showWork(`한 층에 ${a} × ${b} = ${a * b}개니까 부피는 ${a * b} cm³예요`)}`,
        ok: `${h}층이에요 — ${a * b} × ${h} = ${a * b * h} cm³`,
        wr: [
          { text: '맞게 말했어요', tag: RIGHT_AS_WRONG },
          { text: `${a} + ${b} + ${h} = ${a + b + h} cm³예요`, tag: TAGS.addDims },
          { text: '쌓기나무는 층으로 셀 수 없어요', tag: OFF },
        ],
        steps: [`한 층 = ${a} × ${b} = ${a * b}개`, `${h}층 → ${a * b} × ${h} = ${a * b * h} cm³`],
        whyAny: `한 층만 셌어요. 같은 층이 ${h}번 쌓여 있어요.`,
        probe: { d, ask: 'cubes', shown: a * b },
      });
    },
  },

  {
    id: 'cub.volume', grade: 6, name: '직육면체의 부피 구하기', needs: ['cub.unit'],
    idea: '쌓기나무를 하나씩 세는 대신 곱해요 — **직육면체의 부피 = 가로 × 세로 × 높이**(= 밑면의 넓이 × 높이). **정육면체의 부피 = 한 모서리 × 한 모서리 × 한 모서리**. 겉넓이(cm²)와 헷갈리지 않게 단위 cm³를 봐요.',
    rule: '부피 = 가로 × 세로 × 높이 (cm³).',
    slip: '세 길이를 모두 곱했는지, 넓이를 구한 건 아닌지 봐요.',
    calc(r, c) {
      const fams = [];
      const okVol = ([a, b, h]) => allDiff(a * b * h, a + b + h, 2 * (a * b + b * h + a * h), a * b);
      fams.push(famOf([
        (() => { const d = dims3(r, 2, 12, okVol); return volOf(d, `직육면체의 겨냥도예요.\n\n${cub(d)}\n\n이 직육면체의 부피는 몇 cm³일까요?`); })(),
        (() => { const d = dims3(r, 2, 12, okVol); return volOf(d, `{mon/이/가} 가로 ${d[0]} cm, 세로 ${d[1]} cm, 높이 ${d[2]} cm인 직육면체 모양의 상자에 모래를 가득 담아요.\n\n${cub(d)}\n\n상자의 부피는 몇 cm³일까요?`); })(),
      ]));
      // 정육면체 — 한 모서리 3(3 × 3 = 3 × 3)·6(6 × 6 × 6 = 겉넓이)은 뺀다
      fams.push(famOf([(() => {
        const s = intWhere(r, 2, 12, (x) => allDiff(x ** 3, 3 * x, x * x, 6 * x * x));
        return {
          t: `한 모서리가 ${s} cm인 정육면체가 있어요.\n\n${cub([s, s, s])}\n\n이 정육면체의 부피는 몇 cm³일까요?`,
          ans: String(s ** 3), wr: [{ text: String(3 * s), tag: TAGS.times3 }, { text: String(s * s), tag: TAGS.squareOnly }, { text: String(6 * s * s), tag: TAGS.surfAsVol }],
          steps: ['정육면체의 부피 = 한 모서리 × 한 모서리 × 한 모서리', `${s} × ${s} × ${s} = ${s ** 3}`],
          why: {
            [TAGS.times3]: `세 번 곱해요 — ${s} × 3이 아니라 ${s} × ${s} × ${s}.`,
            [TAGS.squareOnly]: '한 면의 넓이까지만 구했어요. 높이까지 한 번 더 곱해요.',
            [TAGS.surfAsVol]: '여섯 면의 넓이의 합은 겉넓이예요. 부피는 세 모서리를 곱해요.',
          },
          probe: { d: [s, s, s], ask: 'vol' },
        };
      })()]));
      // 밑면의 넓이 × 높이
      fams.push(famOf([(() => {
        const S = int(r, 12, 80); const h = intWhere(r, 2, 12, (x) => allDiff(S * x, S + x, S));
        return {
          t: `밑면의 넓이가 ${S} cm², 높이가 ${h} cm인 직육면체가 있어요.\n\n이 직육면체의 부피는 몇 cm³일까요?`,
          ans: String(S * h), wr: [{ text: String(S + h), tag: TAGS.addForMul }, { text: String(S), tag: TAGS.baseOnly }],
          steps: ['부피 = 가로 × 세로 × 높이 = 밑면의 넓이 × 높이', `${S} × ${h} = ${S * h}`],
          why: { [TAGS.addForMul]: '높이는 더하지 않고 곱해요 — 밑면만큼 한 층이 높이만큼 쌓여요.', [TAGS.baseOnly]: '밑면의 넓이는 한 층의 크기예요. 높이를 곱해요.' },
          probe: { S, h, ask: 'baseVol' },
        };
      })()]));
      // 부피 비교 — 세 길이의 합이 큰 쪽이 작다
      fams.push(famOf([(() => {
        let p; let q;
        for (;;) {
          const s = int(r, 4, 7); p = [s, s, s];
          q = [int(r, 8, 12), int(r, 2, 3), int(r, 3, 6)];
          const vp = s ** 3; const vq = q[0] * q[1] * q[2];
          if (vp > vq && q[0] + q[1] + q[2] > 3 * s) break;
        }
        const firstBig = r() < 0.5;
        const [g1, g2] = firstBig ? [p, q] : [q, p];
        const big = firstBig ? '㉮' : '㉯'; const small = big === '㉮' ? '㉯' : '㉮';
        const line = (nm, g) => `${nm} 가로 ${g[0]} cm · 세로 ${g[1]} cm · 높이 ${g[2]} cm`;
        return {
          t: `두 직육면체 ㉮와 ㉯가 있어요.\n\n${line('㉮', g1)}\n${line('㉯', g2)}\n\n부피가 더 큰 것은 어느 것일까요?`,
          text: true, ans: big, wr: [{ text: small, tag: TAGS.sumWins }, { text: '두 부피가 같아요', tag: TAGS.sameGuess }],
          steps: [`${big}: ${p[0]} × ${p[1]} × ${p[2]} = ${p[0] ** 3}`, `${small}: ${q[0]} × ${q[1]} × ${q[2]} = ${q[0] * q[1] * q[2]}`, `${p[0] ** 3} > ${q[0] * q[1] * q[2]} → ${big}`],
          why: {
            [TAGS.sumWins]: '세 길이를 더한 값이 크다고 부피가 큰 것은 아니에요. 곱해서 비교해요.',
            [TAGS.sameGuess]: '곱해 보면 부피가 달라요.',
          },
          probe: { ask: 'compare' },
        };
      })()]));
      return calcAsk(r, c, this, runFamily(r, c, fams));
    },
    misread(r, c) {
      const d = dims3(r, 2, 12, ([a, b, h]) => allDiff(a * b * h, a + b + h, 2 * (a * b + b * h + a * h), a * b));
      const [a, b, h] = d; const sum = a + b + h; const surf = 2 * (a * b + b * h + a * h);
      if (branchOf(r, c, ['add', 'surf']) === 'add') {
        return misAsk(r, c, this, 'add', {
          q: `직육면체의 겨냥도예요.\n\n${cub(d)}\n\n${showWork(`부피는 ${a} + ${b} + ${h} = ${sum} cm³예요`)}`,
          ok: `세 길이를 곱해요 — ${a} × ${b} × ${h} = ${a * b * h} cm³`,
          wr: [
            { text: '맞게 말했어요', tag: RIGHT_AS_WRONG },
            { text: `${a} × ${b} = ${a * b} cm³예요`, tag: TAGS.baseOnly },
            { text: '상자의 부피는 잴 수 없어요', tag: OFF },
          ],
          steps: [`한 층 ${a} × ${b} = ${a * b}`, `${h}층 → ${a * b} × ${h} = ${a * b * h} cm³`],
          whyAny: '세 길이를 더하면 쌓기나무를 한 줄씩만 센 거예요. 부피는 가로 × 세로 × 높이.',
          probe: { d, ask: 'vol', shown: sum },
        });
      }
      return misAsk(r, c, this, 'surf', {
        q: `직육면체의 겨냥도예요.\n\n${cub(d)}\n\n${showWork(`부피는 여섯 면의 넓이를 더해서 ${surf} cm³예요`)}`,
        ok: `여섯 면의 넓이의 합은 겉넓이예요 — 부피는 ${a} × ${b} × ${h} = ${a * b * h} cm³`,
        wr: [
          { text: '맞게 말했어요', tag: RIGHT_AS_WRONG },
          { text: `${a} + ${b} + ${h} = ${sum} cm³예요`, tag: TAGS.addDims },
          { text: '부피와 겉넓이는 늘 같아요', tag: OFF },
        ],
        steps: ['겉넓이는 겉을 싸는 넓이(cm²), 부피는 안을 채우는 크기(cm³)', `${a} × ${b} × ${h} = ${a * b * h} cm³`],
        whyAny: '겉넓이를 구했어요. 부피는 안을 채운 쌓기나무 수라서 가로 × 세로 × 높이.',
        probe: { d, ask: 'vol', shown: surf },
      });
    },
  },

  {
    id: 'cub.m3', grade: 6, name: '1 m³와 단위 바꾸기', needs: ['cub.volume'],
    idea: '한 모서리가 1 m인 정육면체의 부피를 **1 m³**(1 세제곱미터)라고 해요. 1 m = 100 cm라서 1 m³에는 1 cm³ 쌓기나무가 가로·세로·높이로 100개씩 — **1 m³ = 100 × 100 × 100 = 1000000 cm³**. 길이 단위가 섞여 있으면 **먼저 한 단위로 맞춘 다음** 곱해요.',
    rule: '1 m³ = 1000000 cm³ — 단위를 맞춘 다음 곱해요.',
    slip: '길이(100배)·넓이(10000배)·부피(1000000배) 중 무엇을 바꾸는지 봐요.',
    calc(r, c) {
      const fams = [];
      const M = 1000000;
      // m³ → cm³ (자연수 · 소수 — 틀 글 속 수의 모양이 같게 틀을 나눈다)
      const toCm = (X, t) => ({
        t, ans: num(X * M), wr: [{ text: num(X * 100), tag: TAGS.lenUnit }, { text: num(X * 10000), tag: TAGS.areaUnit }, { text: num(X * 1000), tag: TAGS.thousand }],
        steps: ['1 m³ = 100 × 100 × 100 = 1000000 cm³', `${X} × 1000000 = ${num(X * M)}`],
        why: {
          [TAGS.lenUnit]: '100배는 길이(1 m = 100 cm)예요. 부피는 가로·세로·높이 모두 100배 → 1000000배.',
          [TAGS.areaUnit]: '10000배는 넓이(1 m² = 10000 cm²)예요. 부피는 한 번 더 100배 → 1000000배.',
          [TAGS.thousand]: '1 m³ = 100 × 100 × 100 cm³ — 1000이 아니라 1000000이에요.',
        },
        probe: { X, ask: 'm3cm3' },
      });
      fams.push(famOf([
        (() => { const X = int(r, 2, 9); return toCm(X, `{mon}의 물놀이 수조의 부피는 ${X} m³예요.\n\n${jw(`${X} m³`, '은', '는')} 몇 cm³일까요?`); })(),
        (() => { const X = int(r, 0, 4) + 0.5; return toCm(X, `{mon}의 물놀이 수조의 부피는 ${X} m³예요.\n\n${jw(`${X} m³`, '은', '는')} 몇 cm³일까요?`); })(),
      ]));
      // cm³ → m³
      fams.push(famOf([(() => {
        const X = r() < 0.6 ? int(r, 2, 9) : int(r, 0, 4) + 0.5; const N = Math.round(X * M);
        return {
          t: `${jw(`${N} cm³`, '은', '는')} 몇 m³일까요?`,
          ans: num(X), wr: [{ text: num(N / 100), tag: TAGS.lenUnit }, { text: num(N / 10000), tag: TAGS.areaUnit }, { text: num(N / 1000), tag: TAGS.thousand }],
          steps: ['1000000 cm³ = 1 m³', `${N} ÷ 1000000 = ${num(X)}`],
          why: {
            [TAGS.lenUnit]: '100으로 나누는 것은 길이(cm → m)예요. 부피는 1000000으로 나눠요.',
            [TAGS.areaUnit]: '10000으로 나누는 것은 넓이(cm² → m²)예요. 부피는 1000000으로 나눠요.',
            [TAGS.thousand]: '1 m³ = 1000000 cm³ — 1000이 아니라 1000000으로 나눠요.',
          },
          probe: { N, ask: 'cm3m3' },
        };
      })()]));
      // 섞인 단위 → m³
      const mixPick = () => {
        for (;;) {
          const a = int(r, 1, 5); const b = pick(r, [100, 150, 200, 250, 300]); const h = pick(r, [100, 150, 200, 250, 300]);
          const ans = (a * b * h) / 10000;
          if (b !== h && allDiff(ans, a * b * h, a * 100 * b * h, (a * b * h) / 100)) return [a, b, h];
        }
      };
      const mixM3 = ([a, b, h], t) => {
        const ans = (a * b * h) / 10000;
        return {
          t, ans: num(ans), wr: [{ text: num(a * b * h), tag: TAGS.noConvert }, { text: num(a * 100 * b * h), tag: TAGS.wrongUnit }, { text: num((a * b * h) / 100), tag: TAGS.oneConvert }],
          steps: [`cm를 m로: ${b} cm = ${num(b / 100)} m, ${h} cm = ${num(h / 100)} m`, `${a} × ${num(b / 100)} × ${num(h / 100)} = ${num(ans)}`],
          why: {
            [TAGS.noConvert]: 'm와 cm를 그대로 곱했어요. 먼저 단위를 m로 맞춰요.',
            [TAGS.wrongUnit]: '그건 cm³로 구한 값이에요. m³로 물었어요.',
            [TAGS.oneConvert]: 'cm인 길이가 둘이에요. 둘 다 m로 바꿔요.',
          },
          probe: { a, b, h, ask: 'mixM3' },
        };
      };
      fams.push(famOf([
        (() => { const g = mixPick(); return mixM3(g, `직육면체의 겨냥도예요.\n\n[cuboid ${g[0]}m ${g[1]}cm ${g[2]}cm]\n\n이 직육면체의 부피는 몇 m³일까요?`); })(),
        (() => { const g = mixPick(); return mixM3(g, `{mon/이/가} 가로 ${g[0]} m, 세로 ${g[1]} cm, 높이 ${g[2]} cm인 직육면체 모양의 창고를 지었어요.\n\n창고의 부피는 몇 m³일까요?`); })(),
      ]));
      // 섞인 단위 → cm³
      fams.push(famOf([(() => {
        let a; let b; let h;
        for (;;) { a = int(r, 1, 3); b = pick(r, [20, 30, 40, 50, 60]); h = pick(r, [20, 30, 40, 50, 60]); if (b !== h && allDiff(a * 100 * b * h, a * b * h, a * 10 * b * h, (a * 100 * b * h) / M)) break; }
        const ans = a * 100 * b * h;
        return {
          t: `가로 ${a} m, 세로 ${b} cm, 높이 ${h} cm인 직육면체 모양의 수조가 있어요.\n\n수조의 부피는 몇 cm³일까요?`,
          ans: num(ans), wr: [{ text: num(a * b * h), tag: TAGS.noConvert }, { text: num(a * 10 * b * h), tag: TAGS.tenTimes }, { text: num(ans / M), tag: TAGS.wrongUnit }],
          steps: [`${a} m = ${a * 100} cm`, `${a * 100} × ${b} × ${h} = ${ans}`],
          why: {
            [TAGS.noConvert]: 'm와 cm를 그대로 곱했어요. 먼저 m를 cm로 바꿔요.',
            [TAGS.tenTimes]: '1 m = 100 cm예요. 10 cm가 아니에요.',
            [TAGS.wrongUnit]: '그건 m³로 구한 값이에요. cm³로 물었어요.',
          },
          probe: { a, b, h, ask: 'mixCm3' },
        };
      })()]));
      // 정육면체 — 한 모서리 k m
      fams.push(famOf([(() => {
        const k = int(r, 1, 4); const v = k ** 3;
        return {
          t: `한 모서리가 ${k} m인 정육면체가 있어요.\n\n${cub([k, k, k], 'm')}\n\n이 정육면체의 부피는 몇 cm³일까요?`,
          ans: num(v * M), wr: [{ text: num(v * 100), tag: TAGS.lenUnit }, { text: num(v * 10000), tag: TAGS.areaUnit }, { text: num(v), tag: TAGS.wrongUnit }],
          steps: [`${k} × ${k} × ${k} = ${jn(v, '이니까', '니까')} ${v} m³`, `1 m³ = 1000000 cm³ → ${v} × 1000000 = ${num(v * M)}`],
          why: {
            [TAGS.lenUnit]: '100배는 길이예요. 부피는 1000000배.',
            [TAGS.areaUnit]: '10000배는 넓이예요. 부피는 1000000배.',
            [TAGS.wrongUnit]: '그건 m³로 구한 값이에요. cm³로 물었어요.',
          },
          probe: { k, ask: 'cubeM' },
        };
      })()]));
      return calcAsk(r, c, this, runFamily(r, c, fams));
    },
    misread(r, c) {
      const M = 1000000;
      if (branchOf(r, c, ['hundred', 'mix']) === 'hundred') {
        const X = int(r, 2, 9);
        return misAsk(r, c, this, 'hundred', {
          q: `{mon}의 물놀이 수조의 부피는 ${X} m³예요.\n\n${showWork(`${jw(`${X} m³`, '은', '는')} ${X} × 100 = ${X * 100} cm³예요`)}`,
          ok: `1 m³ = 100 × 100 × 100 cm³ — ${X} × 1000000 = ${X * M} cm³`,
          wr: [
            { text: '맞게 말했어요', tag: RIGHT_AS_WRONG },
            { text: `${X} × 10000 = ${X * 10000} cm³예요`, tag: TAGS.areaUnit },
            { text: 'm³는 cm³로 바꿀 수 없어요', tag: OFF },
          ],
          steps: ['1 m = 100 cm라서 1 m³는 가로·세로·높이로 100개씩 → 100 × 100 × 100 = 1000000 cm³', `${X} × 1000000 = ${X * M} cm³`],
          whyAny: '길이처럼 100배만 했어요. 부피는 가로·세로·높이가 모두 100배라서 1000000배예요.',
          probe: { X, ask: 'm3cm3', shown: X * 100 },
        });
      }
      let a; let b; let h;
      for (;;) { a = int(r, 1, 5); b = pick(r, [100, 150, 200, 250, 300]); h = pick(r, [100, 150, 200, 250, 300]); if (b !== h && (a * b * h) % 10000 === 0) break; }
      const ans = (a * b * h) / 10000;
      return misAsk(r, c, this, 'mix', {
        q: `직육면체의 겨냥도예요.\n\n[cuboid ${a}m ${b}cm ${h}cm]\n\n${showWork(`부피는 ${a} × ${b} × ${h} = ${a * b * h} m³예요`)}`,
        ok: `cm를 m로 바꿔서 — ${a} × ${num(b / 100)} × ${num(h / 100)} = ${num(ans)} m³`,
        wr: [
          { text: '맞게 말했어요', tag: RIGHT_AS_WRONG },
          { text: `${a} × ${num(b / 100)} × ${h} = ${num((a * b * h) / 100)} m³예요`, tag: TAGS.oneConvert },
          { text: 'm와 cm가 섞이면 부피를 구할 수 없어요', tag: OFF },
        ],
        steps: [`${b} cm = ${num(b / 100)} m, ${h} cm = ${num(h / 100)} m`, `${a} × ${num(b / 100)} × ${num(h / 100)} = ${num(ans)} m³`],
        whyAny: '단위를 맞추지 않고 곱했어요. cm는 m로 바꾼 다음 곱해요.',
        probe: { a, b, h, ask: 'mixM3', shown: a * b * h },
      });
    },
  },

  {
    id: 'cub.apply', grade: 6, name: '⭐ 부피와 겉넓이 활용', needs: ['cub.m3'],
    idea: '부피와 겉넓이를 **거꾸로** 쓰는 문제: 높이 = 부피 ÷ (가로 × 세로) — 곱해서 부피가 됐으니 나눠서 돌아와요. 정육면체는 겉넓이 ÷ 6 = 한 면의 넓이 → 같은 수를 두 번 곱해 그 넓이가 되는 수가 한 모서리. 두부를 잘라도 **부피는 그대로**지만 잘린 면이 새로 생겨 **겉넓이는 늘어나요**.',
    rule: '거꾸로는 나눠서 — 잘라도 부피는 그대로, 겉넓이는 잘린 면만큼 늘어요.',
    slip: '곱했던 것을 나눠서 되돌렸는지, 새로 생긴 면이 몇 개인지 봐요.',
    calc(r, c) {
      const fams = [];
      // 높이 구하기
      fams.push(famOf([
        (() => {
          const d = dims3(r, 2, 12, ([a, b, h]) => allDiff(h, (a * b * h) / a, a * b * h - a - b, a * b * h * a * b));
          const [a, b, h] = d; const V = a * b * h;
          return {
            t: `부피가 ${V} cm³인 직육면체의 가로는 ${a} cm, 세로는 ${b} cm예요.\n\n${cub([a, b, `?${h}`])}\n\n높이는 몇 cm일까요?`,
            ans: String(h), wr: [{ text: num(V / a), tag: TAGS.divOne }, { text: String(V - a - b), tag: TAGS.subForDiv }, { text: String(V * a * b), tag: TAGS.invMul }],
            steps: [`가로 × 세로 × 높이 = 부피 → 높이 = 부피 ÷ (가로 × 세로)`, `${a} × ${b} = ${a * b}, ${V} ÷ ${a * b} = ${h}`],
            why: {
              [TAGS.divOne]: `가로로만 나눴어요. 가로 × 세로(${a * b})로 나눠요.`,
              [TAGS.subForDiv]: '곱해서 부피가 됐으니 빼지 않고 나눠요.',
              [TAGS.invMul]: '거꾸로 갈 때는 곱하지 않고 나눠요.',
            },
            probe: { V, a, b, ask: 'height' },
          };
        })(),
        (() => {
          const S = int(r, 12, 60); const h = intWhere(r, 2, 12, (x) => allDiff(x, S * x - S, S * x * S)); const V = S * h;
          return {
            t: `밑면의 넓이가 ${S} cm², 부피가 ${V} cm³인 직육면체가 있어요.\n\n높이는 몇 cm일까요?`,
            ans: String(h), wr: [{ text: String(V - S), tag: TAGS.subForDiv }, { text: String(V * S), tag: TAGS.invMul }],
            steps: ['밑면의 넓이 × 높이 = 부피 → 높이 = 부피 ÷ 밑면의 넓이', `${V} ÷ ${S} = ${h}`],
            why: { [TAGS.subForDiv]: '곱해서 부피가 됐으니 빼지 않고 나눠요.', [TAGS.invMul]: '거꾸로 갈 때는 곱하지 않고 나눠요.' },
            probe: { V, S, ask: 'heightS' },
          };
        })(),
      ]));
      // 정육면체 겉넓이 → 부피 (한 모서리 6은 뺀다: 6 × 6 × 6 = 겉넓이)
      fams.push(famOf([(() => {
        const s = intWhere(r, 2, 10, (x) => allDiff(x ** 3, x * x, x, 6 * x * x)); const S = 6 * s * s;
        return {
          t: `겉넓이가 ${S} cm²인 정육면체가 있어요.\n\n${cubAsk([s, s, s])}\n\n이 정육면체의 부피는 몇 cm³일까요?`,
          ans: String(s ** 3), wr: [{ text: String(s * s), tag: TAGS.faceStop }, { text: String(s), tag: TAGS.edgeStop }, { text: String(S), tag: TAGS.surfAsVol }],
          steps: [`한 면의 넓이 = ${S} ÷ 6 = ${s * s}`, `${s} × ${s} = ${jn(s * s, '이니까', '니까')} 한 모서리는 ${s}`, `부피 = ${s} × ${s} × ${s} = ${s ** 3}`],
          why: {
            [TAGS.faceStop]: '한 면의 넓이에서 멈췄어요. 한 모서리를 찾아 세 번 곱해요.',
            [TAGS.edgeStop]: '한 모서리의 길이에서 멈췄어요. 부피는 세 번 곱해요.',
            [TAGS.surfAsVol]: '겉넓이를 그대로 썼어요. 겉넓이와 부피는 달라요.',
          },
          probe: { S, ask: 'cubeVol' },
        };
      })()]));
      // 두부 — 가로를 반으로 잘라 두 조각
      const tofu = () => dims3(r, 2, 12, ([a, b, h]) => a % 2 === 0 && allDiff(2 * b * h, b * h, 2 * (a * b + b * h + a * h)) && allDiff(a * b * h, 2 * a * b * h, (a * b * h) / 2));
      fams.push(famOf([
        (() => {
          const d = tofu(); const [a, b, h] = d; const S0 = 2 * (a * b + b * h + a * h);
          return {
            t: `가로 ${a} cm, 세로 ${b} cm, 높이 ${h} cm인 두부를 가로가 반이 되게 똑같이 둘로 잘랐어요.\n\n${cub(d)}\n\n두 조각의 겉넓이의 합은 처음 두부의 겉넓이보다 몇 cm² 늘었을까요?`,
            ans: String(2 * b * h), wr: [{ text: String(b * h), tag: TAGS.oneCut }, { text: String(S0), tag: TAGS.doubleSurf }],
            steps: [`자른 자리에 세로 ${b} cm, 높이 ${h} cm인 면이 두 조각에 하나씩 생겨요`, `${b} × ${h} × 2 = ${2 * b * h}`],
            why: {
              [TAGS.oneCut]: '한 번 자르면 잘린 면이 두 조각에 하나씩 — 2개가 생겨요.',
              [TAGS.doubleSurf]: '겉넓이가 두 배가 되는 게 아니라, 잘린 면 2개만큼 늘어요.',
            },
            probe: { d, ask: 'tofuSurf' },
          };
        })(),
        (() => {
          const d = tofu(); const [a, b, h] = d; const V = a * b * h;
          return {
            t: `가로 ${a} cm, 세로 ${b} cm, 높이 ${h} cm인 두부를 가로가 반이 되게 똑같이 둘로 잘랐어요.\n\n${cub(d)}\n\n두 조각의 부피의 합은 몇 cm³일까요?`,
            ans: String(V), wr: [{ text: String(2 * V), tag: TAGS.doubleVol }, { text: String(V / 2), tag: TAGS.halfVol }],
            steps: ['잘라도 두부의 양은 그대로 — 부피의 합은 처음과 같아요', `${a} × ${b} × ${h} = ${V}`],
            why: {
              [TAGS.doubleVol]: '조각이 둘이 돼도 두부가 늘어나지 않아요. 부피의 합은 그대로예요.',
              [TAGS.halfVol]: '한 조각의 부피는 반이지만, 두 조각을 합하면 처음과 같아요.',
            },
            probe: { d, ask: 'tofuVol' },
          };
        })(),
      ]));
      // 상자에 정육면체 블록
      fams.push(famOf([(() => {
        let k; let m;
        for (;;) {
          k = int(r, 2, 5); m = [int(r, 2, 5), int(r, 2, 5), int(r, 2, 5)];
          const [a, b, h] = m.map((x) => x * k); const ans = m[0] * m[1] * m[2];
          if (allDiff(ans, (a * b * h) / k, (a + b + h) / k, a * b * h) && new Set(m).size > 1) break;
        }
        const [a, b, h] = m.map((x) => x * k); const ans = m[0] * m[1] * m[2];
        return {
          t: `상자 안쪽의 크기가 가로 ${a} cm, 세로 ${b} cm, 높이 ${h} cm예요. 이 상자에 한 모서리가 ${k} cm인 정육면체 모양 블록을 빈틈없이 쌓으려고 해요.\n\n블록은 모두 몇 개 들어갈까요?`,
          ans: String(ans), wr: [{ text: num((a * b * h) / k), tag: TAGS.divOnce }, { text: num((a + b + h) / k), tag: TAGS.addDims }, { text: String(a * b * h), tag: TAGS.volOnly }],
          steps: [`가로 ${a} ÷ ${k} = ${m[0]}개, 세로 ${b} ÷ ${k} = ${m[1]}개, 높이 ${h} ÷ ${k} = ${m[2]}층`, `${m[0]} × ${m[1]} × ${m[2]} = ${ans}`],
          why: {
            [TAGS.divOnce]: `블록 하나의 부피는 ${k} × ${k} × ${jn(k, '이에요', '예요')}. 한 모서리로 한 번만 나누면 안 돼요 — 줄마다 몇 개인지 세요.`,
            [TAGS.addDims]: '줄마다 들어가는 개수를 더하지 않고 곱해요.',
            [TAGS.volOnly]: '상자의 부피예요. 블록이 몇 개 들어가는지 물었어요.',
          },
          probe: { a, b, h, k, ask: 'blocks' },
        };
      })()]));
      return calcAsk(r, c, this, runFamily(r, c, fams));
    },
    misread(r, c) {
      if (branchOf(r, c, ['invMul', 'tofu']) === 'invMul') {
        const d = dims3(r, 2, 9); const [a, b, h] = d; const V = a * b * h;
        return misAsk(r, c, this, 'invMul', {
          q: `부피가 ${V} cm³, 가로 ${a} cm, 세로 ${b} cm인 직육면체가 있어요.\n\n${showWork(`높이는 ${V} × ${a} × ${b} = ${V * a * b} cm예요`)}`,
          ok: `곱해서 부피가 됐으니 나눠요 — ${V} ÷ ${a * b} = ${h} cm`,
          wr: [
            { text: '맞게 말했어요', tag: RIGHT_AS_WRONG },
            { text: `${V} − ${a} − ${b} = ${V - a - b} cm예요`, tag: TAGS.subForDiv },
            { text: '부피로는 높이를 구할 수 없어요', tag: OFF },
          ],
          steps: ['가로 × 세로 × 높이 = 부피 → 높이 = 부피 ÷ (가로 × 세로)', `${V} ÷ ${a * b} = ${h} cm`],
          whyAny: '거꾸로 갈 때도 곱했어요. 가로 × 세로를 곱해서 부피가 됐으니, 부피를 가로 × 세로로 나눠요.',
          probe: { V, a, b, ask: 'height', shown: V * a * b },
        });
      }
      const d = dims3(r, 2, 12, ([a]) => a % 2 === 0); const [a, b, h] = d; const S0 = 2 * (a * b + b * h + a * h);
      return misAsk(r, c, this, 'tofu', {
        q: `가로 ${a} cm, 세로 ${b} cm, 높이 ${h} cm인 두부를 가로가 반이 되게 둘로 잘랐어요.\n\n${cub(d)}\n\n${showWork(`잘라도 두부는 그대로니까 두 조각의 겉넓이의 합은 처음과 같은 ${S0} cm²예요`)}`,
        ok: `잘린 면 2개가 새로 생겨요 — ${S0} + ${b} × ${h} × 2 = ${S0 + 2 * b * h} cm²`,
        wr: [
          { text: '맞게 말했어요', tag: RIGHT_AS_WRONG },
          { text: `잘린 면 1개만 늘어서 ${S0} + ${b * h} = ${S0 + b * h} cm²예요`, tag: TAGS.oneCut },
          { text: '자른 두부는 겉넓이를 구할 수 없어요', tag: OFF },
        ],
        steps: [`처음 겉넓이 ${S0}`, `자른 자리에 ${b} × ${h}인 면이 두 조각에 하나씩 → ${S0} + ${b} × ${h} × 2 = ${S0 + 2 * b * h} cm²`],
        whyAny: '잘라도 부피는 그대로지만 겉넓이는 달라요. 자른 자리에 새 면이 두 개 생겨요.',
        probe: { d, ask: 'tofuSurf', shown: S0 },
      });
    },
  },
];

// ── 가족 재료 (칸 여러 곳에서 같은 틀 모양을 쓴다) ──

function edgeSum(d, t) {
  const s = d[0] + d[1] + d[2];
  return {
    t, ans: String(4 * s), wr: [{ text: String(s), tag: TAGS.threeOnly }, { text: String(3 * s), tag: TAGS.visSum }, { text: String(2 * s), tag: TAGS.timesTwo }],
    steps: [`길이가 다른 모서리 세 개: ${d[0]} + ${d[1]} + ${d[2]} = ${s}`, `같은 길이가 4개씩 → ${s} × 4 = ${4 * s}`],
    why: {
      [TAGS.threeOnly]: '적힌 세 모서리만 더했어요. 같은 길이의 모서리가 4개씩 있어요.',
      [TAGS.visSum]: '보이는 모서리 9개만 더했어요. 점선 3개도 더해요.',
      [TAGS.timesTwo]: '같은 길이 모서리는 2개가 아니라 4개씩이에요.',
    },
    probe: { d, ask: 'edgeSum' },
  };
}
/** 평행한 면 고르기 — 정답은 마주 보는 면, 오답은 이웃한 면 둘과 면이 아닌 네 점 */
function parallelOf(r, f, t, d) {
  const o = oppOf(f); const adj = shuffle(r, adjOf(f)).slice(0, 2); const nf = pick(r, NOT_FACES);
  return {
    t, text: true, ans: `면 ${o}`,
    wr: [...adj.map((g) => ({ text: `면 ${g}`, tag: TAGS.nextFace })), { text: `면 ${nf}`, tag: TAGS.notFace }],
    steps: ['평행한 면은 계속 늘여도 만나지 않는 면 — 마주 보는 면이에요', `면 ${jw(f, '과', '와')} 마주 보는 면 → 면 ${o}`],
    why: {
      [TAGS.nextFace]: '모서리를 함께 쓰는 이웃한 면은 만나요. 만나는 면은 수직이에요.',
      [TAGS.notFace]: '그 네 점은 직육면체의 면이 아니라 비스듬히 자른 자리예요.',
    },
    probe: { d, face: f, ask: 'parallel' },
  };
}
/** 정육면체 전개도에서 면 ㉮와 마주 보는 면 */
function oppAsk(r, N, t) {
  const L = N.L; const o = oppD(L, 1);
  const nb = shuffle(r, netNbrs(L, 1));
  const dist = netDist(L, 1);
  const non = [2, 3, 4, 5, 6].filter((x) => x !== o);
  const far = non.reduce((best, x) => (dist[x] > dist[best] || (dist[x] === dist[best] && x < best) ? x : best), non[0]);
  const end = endOf4(L, 1);
  const wr = [];
  if (end && end !== o) wr.push({ text: `면 ${F(end)}`, tag: TAGS.netEnds });
  wr.push({ text: `면 ${F(nb[0])}`, tag: TAGS.netNext });
  wr.push({ text: `면 ${F(far)}`, tag: TAGS.netFar });
  if (nb[1]) wr.push({ text: `면 ${F(nb[1])}`, tag: TAGS.netNext });
  // 보기가 모자라면 접으면 ㉮와 만나는 다른 면으로 채운다
  for (const x of shuffle(r, non)) wr.push({ text: `면 ${F(x)}`, tag: TAGS.netMeet });
  // 같은 면이 두 이름표로 들어가지 않게 (줄 끝 = 가장 먼 면일 때) — 먼저 넣은 뜻을 남긴다
  const uniq = wr.filter((w, i) => wr.findIndex((z) => z.text === w.text) === i);
  wr.length = 0; wr.push(...uniq);
  const nbList = netNbrs(L, 1).map((x) => `면 ${F(x)}`).join('·');
  return {
    t, text: true, ans: `면 ${F(o)}`, wr,
    steps: [
      `면 ㉮와 붙어 있는 ${jw(nbList, '은', '는')} 접으면 ㉮와 만나요`,
      straight3(L, 1, o) ? `면 ㉮와 면 ${jw(F(o), '은', '는')} 한 면을 건너뛰고 한 줄로 이어진 양 끝 — 접으면 마주 봐요` : `접어 보면 ㉮와 만나지 않는 면은 면 ${F(o)} 하나 — 마주 보는 면이에요`,
    ],
    why: {
      [TAGS.netNext]: '전개도에서 붙어 있는 면은 그 변을 따라 접혀 ㉮와 만나요.',
      [TAGS.netFar]: '전개도에서 멀리 떨어져 보여도 접으면 ㉮와 모서리에서 만나요.',
      [TAGS.netEnds]: '한 줄로 이어진 네 면은 접으면 빙 둘러 이어져서 양 끝이 만나요.',
      [TAGS.netMeet]: '접어 보면 그 면은 ㉮와 모서리에서 만나요. 마주 보는 면은 ㉮와 만나지 않는 면이에요.',
    },
    probe: { net: N.spec, ask: 'opp' },
  };
}
/** 만나는 점 — 접으면 점 ㄱ과 같은 꼭짓점이 되는 점 */
function meetAsk(r, pat) {
  const N0 = cubeNet(r, pat); const L = N0.L; const n = L.pts.length;
  const part = (i) => L.pts.map((_, j) => j).filter((j) => j !== i && L.pts[j].v === L.pts[i].v);
  const two = L.pts.map((_, i) => i).filter((i) => part(i).length === 2);
  const one = L.pts.map((_, i) => i).filter((i) => part(i).length === 1);
  const s = two.length && (!one.length || r() < 0.6) ? pick(r, two) : pick(r, one);
  const nm = (j) => NET_PT[(j - s + n) % n];
  const order = (js) => [...js].sort((a, b) => NET_PT.indexOf(nm(a)) - NET_PT.indexOf(nm(b)));
  const say = (js) => order(js).map((j) => `점 ${nm(j)}`).join(', ');
  const ps = order(part(s));
  const spec = `${N0.shape} names s=${s}`;
  // 만나는 점의 바로 옆 점 (만나는 점도 ㄱ도 아닌 것)
  const shifts = [];
  for (const p of ps) for (const j of [(p + 1) % n, (p - 1 + n) % n]) if (j !== s && !ps.includes(j) && !shifts.includes(j)) shifts.push(j);
  const sh = shuffle(r, shifts);
  const wr = [];
  if (ps.length === 2) {
    wr.push({ text: say([ps[0]]), tag: TAGS.ptOne });
    wr.push({ text: say([ps[0], sh[0]]), tag: TAGS.ptShift });
  } else {
    wr.push({ text: say([sh[0]]), tag: TAGS.ptShift });
    if (sh[1] !== undefined) wr.push({ text: say([sh[1]]), tag: TAGS.ptShift });
  }
  wr.push({ text: say([(s + 1) % n]), tag: TAGS.ptNext });
  // 점 ㄴ이 만나는 점의 바로 옆 점이기도 하면 하나만 (먼저 넣은 뜻을 남긴다)
  const uniq = wr.filter((w, i) => wr.findIndex((z) => z.text === w.text) === i);
  wr.length = 0; wr.push(...uniq);
  const faces = L.cells.filter((cl) => [[cl.x, cl.y], [cl.x + 1, cl.y], [cl.x, cl.y + 1], [cl.x + 1, cl.y + 1]].some(([x, y]) => L.pts.some((p, j) => p.v === L.pts[s].v && p.x === x && p.y === y && j >= 0))).map((cl) => F(cl.d));
  return {
    t: `정육면체의 전개도예요.\n\n[net ${spec}]\n\n전개도를 접었을 때 점 ㄱ과 만나는 점을 모두 찾은 것은 어느 것일까요?`,
    text: true, ans: say(ps), wr,
    steps: [`접으면 점 ㄱ이 닿는 꼭짓점에는 면 ${faces.join('·')} 세 면이 모여요`, `세 면에서 그 꼭짓점이 되는 점: 점 ㄱ, ${say(ps)}`],
    why: {
      [TAGS.ptOne]: '꼭짓점에는 면 세 개가 모여서, 점 ㄱ과 만나는 점이 하나 더 있어요.',
      [TAGS.ptShift]: '만나는 점의 바로 옆 점이에요. 접히는 선을 따라 한 칸씩 짝지어 봐요.',
      [TAGS.ptNext]: '선분 하나의 양 끝 점은 접어도 서로 떨어져 있어요.',
    },
    probe: { net: spec, ask: 'meet' },
  };
}
/** 겹치는 선분 — 접으면 선분 ㄱㄴ과 같은 모서리가 되는 선분 */
function segAsk(r, pat) {
  const N0 = cubeNet(r, pat); const L = N0.L; const n = L.pts.length;
  const s = int(r, 0, n - 1);
  const nm = (j) => NET_PT[(j - s + n) % n];
  const segSay = (a, b) => `선분 ${[a, b].sort((x, y) => NET_PT.indexOf(nm(x)) - NET_PT.indexOf(nm(y))).map(nm).join('')}`;
  const j = L.segs.findIndex((g, i) => i !== s && g.e === L.segs[s].e);
  const pj = L.segs[j];
  // 만나는 점 짝: 선분 j의 어느 끝이 ㄱ과 만나는가
  const meetA = L.pts[pj.a].v === L.pts[s].v ? pj.a : pj.b; const meetB = meetA === pj.a ? pj.b : pj.a;
  const shifts = [(j + 1) % n, (j - 1 + n) % n].filter((x) => x !== s && x !== j);
  // 같은 칸의 맞은편 변
  const p = L.pts[s]; const q = L.pts[(s + 1) % n];
  const cell = L.cells.find((cl) => [p, q].every((z) => z.x >= cl.x && z.x <= cl.x + 1 && z.y >= cl.y && z.y <= cl.y + 1));
  const cs = [[cell.x, cell.y], [cell.x + 1, cell.y], [cell.x + 1, cell.y + 1], [cell.x, cell.y + 1]].filter(([x, y]) => !((x === p.x && y === p.y) || (x === q.x && y === q.y)));
  const oppIdx = cs.map(([x, y]) => L.pts.findIndex((z) => z.x === x && z.y === y));
  const wr = shuffle(r, shifts).map((x) => ({ text: segSay(L.segs[x].a, L.segs[x].b), tag: TAGS.segShift }));
  wr.splice(1, 0, { text: segSay(oppIdx[0], oppIdx[1]), tag: TAGS.segOpp });
  const spec = `${N0.shape} names s=${s}`;
  return {
    t: `정육면체의 전개도예요.\n\n[net ${spec}]\n\n전개도를 접었을 때 선분 ㄱㄴ과 겹치는 선분은 어느 것일까요?`,
    text: true, ans: segSay(pj.a, pj.b), wr,
    // 두 선분이 끝점 하나를 함께 쓰면 그 점은 "만나는" 게 아니라 원래 같은 점 — "점 ㄱ과 점 ㄱ이 만나요"가 되지 않게 (Codex 24차 #2)
    steps: ['선분 ㄱㄴ의 양 끝 점 ㄱ·ㄴ과 각각 만나는 점을 찾아요',
      meetA === s ? `점 ㄱ은 두 선분이 함께 쓰는 점이에요. 접으면 점 ㄴ과 점 ${jw(nm(meetB), '이', '가')} 만나요 → ${segSay(pj.a, pj.b)}`
        : meetB === (s + 1) % n ? `점 ㄴ은 두 선분이 함께 쓰는 점이에요. 접으면 점 ㄱ과 점 ${jw(nm(meetA), '이', '가')} 만나요 → ${segSay(pj.a, pj.b)}`
          : `점 ㄱ과 점 ${nm(meetA)}, 점 ㄴ과 점 ${jw(nm(meetB), '이', '가')} 만나요 → ${segSay(pj.a, pj.b)}`],
    why: {
      [TAGS.segShift]: '겹치는 선분의 바로 옆 선분이에요. 양 끝 점이 각각 어디와 만나는지 확인해요.',
      [TAGS.segOpp]: '같은 면의 맞은편 변은 접어도 선분 ㄱㄴ과 떨어져 있어요.',
    },
    probe: { net: spec, ask: 'seg' },
  };
}
/** 전개도가 될까 — 접히는 모양과 겹치는 모양 */
function isNetAsk(r, pat) {
  const shape = labelShape(r, pat);
  const spec = `${shape} plain`;
  const ok = parseNet(spec).L.valid;
  const cross = pat === '.X../XXXX/.X..';
  if (ok) {
    return {
      t: `정사각형 6개를 이어 붙였어요.\n\n[net ${spec}]\n\n이 그림을 접으면 정육면체가 될까요?`,
      text: true, ans: '네, 정육면체가 돼요',
      wr: [
        { text: '아니요, 두 면이 겹쳐요', tag: TAGS.foldWrong },
        cross ? { text: '아니요, 면 하나가 비어요', tag: TAGS.foldWrong } : { text: '아니요, 십자 모양이 아니라서 안 돼요', tag: TAGS.crossOnly },
      ],
      steps: ['한 면씩 접어 보면 여섯 면이 위·아래·앞·뒤·왼쪽·오른쪽을 하나씩 덮어요', '겹치는 면이 없어요 → 네, 정육면체가 돼요'],
      why: {
        [TAGS.foldWrong]: '한 면씩 차례로 접어 보면 겹치는 면 없이 여섯 면이 모두 제자리에 와요.',
        [TAGS.crossOnly]: '정육면체의 전개도는 십자 모양만 있는 게 아니에요 — 모두 11가지예요.',
      },
      probe: { net: spec, ask: 'isnet' },
    };
  }
  return {
    t: `정사각형 6개를 이어 붙였어요.\n\n[net ${spec}]\n\n이 그림을 접으면 정육면체가 될까요?`,
    text: true, ans: '아니요, 두 면이 겹쳐요',
    wr: [
      { text: '네, 정사각형이 6개라서 돼요', tag: TAGS.sixOnly },
      { text: '네, 모두 이어져 있어서 돼요', tag: TAGS.connOnly },
    ],
    steps: ['한 면씩 접어 보면 두 면이 같은 자리에 와서 한 면은 비어요', '아니요, 두 면이 겹쳐요'],
    why: {
      [TAGS.sixOnly]: '정사각형이 6개여도 놓인 모양에 따라 접으면 겹쳐요.',
      [TAGS.connOnly]: '이어져 있어도 접었을 때 두 면이 같은 자리에 오면 정육면체가 안 돼요.',
    },
    probe: { net: spec, ask: 'isnet' },
  };
}
function surfOf(d, t, net = '') {
  const [a, b, h] = d; const s3 = a * b + b * h + a * h;
  return {
    t, ans: String(2 * s3),
    wr: [{ text: String(s3), tag: TAGS.noDouble }, { text: String(a * b * h), tag: TAGS.mulAll }, { text: String(2 * (a + b) * h), tag: TAGS.sideOnly }],
    steps: [`한 꼭짓점에서 만나는 세 면: ${a} × ${b} = ${a * b}, ${b} × ${h} = ${b * h}, ${a} × ${h} = ${a * h}`, `${a * b} + ${b * h} + ${a * h} = ${s3}`, `마주 보는 면까지 ${s3} × 2 = ${2 * s3}`],
    why: {
      [TAGS.noDouble]: '세 면만 더했어요. 마주 보는 면도 넓이가 같으니 × 2.',
      [TAGS.mulAll]: '세 길이를 곱하면 겉넓이가 아니에요. 여섯 면의 넓이를 더해요.',
      [TAGS.sideOnly]: '옆면 4개만 구했어요. 위와 아래 면도 더해요.',
    },
    probe: net ? { d, net, ask: 'surf' } : { d, ask: 'surf' },
  };
}
function cubeSurf(s, t) {
  return {
    t, ans: String(6 * s * s),
    wr: [{ text: String(4 * s * s), tag: TAGS.fourFaces }, { text: String(s ** 3), tag: TAGS.mulAll }, { text: String(6 * s), tag: TAGS.edgeTimes6 }],
    steps: [`한 면의 넓이 ${s} × ${s} = ${s * s}`, `면이 6개 → ${s * s} × 6 = ${6 * s * s}`],
    why: {
      [TAGS.fourFaces]: '옆면 4개만 셌어요. 위·아래 면까지 6개예요.',
      [TAGS.mulAll]: '세 번 곱하면 겉넓이가 아니에요. 한 면의 넓이 × 6.',
      [TAGS.edgeTimes6]: '한 모서리가 아니라 한 면의 넓이(정사각형)에 6을 곱해요.',
    },
    probe: { d: [s, s, s], ask: 'surf' },
  };
}
function volOf(d, t) {
  const [a, b, h] = d;
  return {
    t, ans: String(a * b * h),
    wr: [{ text: String(a + b + h), tag: TAGS.addDims }, { text: String(2 * (a * b + b * h + a * h)), tag: TAGS.surfAsVol }, { text: String(a * b), tag: TAGS.baseOnly }],
    steps: ['직육면체의 부피 = 가로 × 세로 × 높이', `${a} × ${b} × ${h} = ${a * b * h}`],
    why: {
      [TAGS.addDims]: '세 길이를 더하지 않고 곱해요.',
      [TAGS.surfAsVol]: '여섯 면의 넓이의 합은 겉넓이예요. 부피는 가로 × 세로 × 높이.',
      [TAGS.baseOnly]: '밑면의 넓이(한 층)까지만 구했어요. 높이를 곱해요.',
    },
    probe: { d, ask: 'vol' },
  };
}

export function conceptById(id) {
  return CUBOID.find((c) => c.id === id) || null;
}

// ───────────────────── 문항 만들기 (mathcircle과 같은 모양) ─────────────────────

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
const SLIP = '한 번 더 천천히 — 보이지 않는 것까지 셌는지, 넓이인지 부피인지 먼저 봐요.';

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
  return diagnosticOf(CUBOID, makeQuestion, seed, n, opts);
}
export function placeFrom(answers) {
  return placeFromOf(CUBOID, answers);
}
export function ladder(doneIds) {
  return ladderOf(CUBOID, doneIds);
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
 * coach/math/cuboid.json 형식 검사 — mathcircle.checkContent와 같은 규칙
 * @returns {string[]}
 */
export function checkContent(content) {
  const bad = [];
  for (const c of CUBOID) {
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

export const _kit = { num, famOf, runFamily, calcAsk, choices, textChoices, branchOf, showWork, step, jn, jw, RIGHT_AS_WRONG, OFF, CUBE_NETS, NOT_NETS, CUBOID_NETS };
