// 🔢 수학 — K 자료와 그래프 줄기 (초4 막대그래프·꺾은선그래프 → 초5 평균과 가능성 → 초6 띠그래프·원그래프):
// 개념 사다리 + 문제 생성기 + 내용 형식 검사. 순수 함수만 — 화면 없음 (node 테스트에서 그대로 돈다).
//
// 왜 이 줄기인가 (2026-10-01, 아버님 "「자료와 그래프」 줄기 설계 가자"): 교과 영역 넷 중 **자료와 가능성이 0칸**이었다.
// 지금 학기(4-2) 5단원이 꺾은선그래프라 학교·문제집과 겹치고, 🎯 도전 문제 5단원 20문항이 꺾은선 그림이 없어 막혀 있었다
// (같은 [lgraph]를 쓴다). K9 띠·원그래프는 F 비와 비율의 %를 다시 쓴다. 글자 D는 문자와 식 몫, J까지 썼으므로 K.
//
// 오답은 아이가 실제로 하는 틀린 생각 흉내다:
//   · ★ 눈금 한 칸을 1로 읽음(칸 수를 값으로) · 이름 붙은 눈금 사이를 한 칸으로 봄 · ★ 물결선을 무시하고 0부터 읽음
//   · 값이 가장 큰 때를 "가장 많이 변한 때"로 · 차를 구할 때 더함 · 몇 배를 차로 답함
//   · 평균을 (가장 큰 값 + 가장 작은 값) ÷ 2로 · 0을 빼고 나눔 · 사람 수가 다른데 합으로 비교
//   · "~일 것 같다"를 "확실하다"로 · 경우의 수를 가능성으로 · 백분율을 그대로 사람 수로
//
// 새 줄기의 함정(메모 stem-generator-pitfalls)을 처음부터:
//   · 🔁 쌍둥이 열쇠(tplKey = 숫자를 #로 바꾼 문제 글)에 그래프 지시문의 **항목 이름**과 **? 자리**가 들어간다 →
//     주제마다 항목 묶음을 고정하고, 요청한 틀(want)이 오면 그 주제·그 항목·그 ? 자리를 다시 고른다(pickFor·pickLabel·askIdx).
//     조건이 붙은 문항(몇 배 짝·그래프로 줄 수 있는 평균 자료)은 요청이 오면 조건을 맞출 때까지 다시 뽑는다
//   · 수가 없는 글은 쌍둥이가 글자까지 같아진다 → 상황 글에도 수를 넣는다(반 친구 24명·수 카드 1부터 8까지)
//   · 그래프는 **문제 글 안의 그림 지시문**([bgraph …] [lgraph …] [band …] [pie …]) — ❓ 복사문·테스트가 글에서 그래프를 읽는다
//   · 값은 눈금선 위에만, 그래프는 16칸 이하 — 값을 **칸 수**로 먼저 정하고 눈금 한 칸을 곱한다
//   · 칸마다 아직 안 배운 말(꺾은선 K3 · 물결선 K4 · 평균 K6 · 가능성 K8 · 띠·원그래프·백분율 K9)
//
// ★ 그리기(K2 막대·K5 점)는 문항의 `draw`에 그릴 그래프와 칸을 적어 둔다 — 화면의 점 찍기 위젯이 그린 칸 수를
//   보기 값으로 바꿔 같은 채점 길로 간다(숫자판과 같은 모양). 위젯이 없으면 보기로 풀린다.

import { rng, shuffle, fill, castOf, worldPick, ask, solve, int, pick, pickFamily, humanQuestion, checkHuman, diagnosticOf, placeFromOf, ladderOf, josa, numJosa, tplKey } from './mathgen.js';
import { gradeLabel } from './mathmix.js';
import { figureSvg } from './mathdraw.js';
import { textVal } from './mathpad.js';

export { gradeLabel };

// ───────────────────── 글자 ─────────────────────

const sum = (a) => a.reduce((x, y) => x + y, 0);

/** 보기 글자 → 값 (겹침 검사용 — 수·분수·%만, 문장은 null) */
export function valueOf(text) {
  const v = textVal(text);
  if (!v || v.form === 'ratio') return null;
  return v.v.n / v.v.d;
}
const sameValue = (a, b) => a !== null && b !== null && Math.abs(a - b) < 1e-9;

// ── 조사 — 수 뒤에서는 읽는 소리로 ──
const BAT = new Set(['0', '1', '3', '6', '7', '8']);
const lastDigit = (t) => String(t).replace(/\D+$/, '').slice(-1);
/** 수 글자 + 조사 (이/가·을/를·은/는·과/와·이에요/예요…) */
function jn(t, withB, without) {
  const s = String(t);
  return s + (BAT.has(lastDigit(s)) ? withB : without);
}
/** 수 글자 + (으)로 — ㄹ받침(1·7·8) 뒤에는 '로' */
function ro(t) {
  const s = String(t);
  return s + numJosa(Number(lastDigit(s)), '으로', '로');
}
/** 낱말 + 조사 (사과를·귤을) */
const jw = (w, a, b) => w + josa(w, a, b);
/** 영문 단위의 받침 — kg(킬로그램) 있음 · L(리터)·cm(센티미터) 없음 */
const LATIN_BAT = { kg: true, L: false, cm: false };
/** 단위 + 조사 (명이에요·개예요·kg이에요·cm예요) */
function uj(u, a, b) {
  if (u in LATIN_BAT) return u + (LATIN_BAT[u] ? a : b);
  return jw(u, a, b);
}
/** 수 + 단위 (영문 단위는 띄운다: 30 kg · 12명) */
const nu = (v, u) => `${v}${/^[A-Za-z]/.test(u) ? ' ' : ''}${u}`;
/** 수 + 단위 + 조사 (12명이에요 · 30 kg이에요) */
const nuj = (v, u, a, b) => `${v}${/^[A-Za-z]/.test(u) ? ' ' : ''}${uj(u, a, b)}`;

// ───────────────────── 보기 ─────────────────────

/** 수 보기 4개 — 정답 + 오개념 오답. 0·분수·%도 받는다. 글자·값이 같은 보기는 넣지 않는다 */
function choices(r, answer, wrongs, nearStep = 1) {
  const list = [{ text: String(answer), ok: true }];
  const vals = [valueOf(answer)];
  const seen = new Set([String(answer)]);
  const dup = (t) => { const v = valueOf(t); return seen.has(String(t)) || (v !== null && vals.some((x) => sameValue(x, v))); };
  const add = (t, tag) => { seen.add(String(t)); vals.push(valueOf(t)); list.push({ text: String(t), ok: false, tag }); };
  for (const w of wrongs) {
    if (!w || w.text === undefined || w.text === null || w.text === '' || valueOf(w.text) === null || valueOf(w.text) < 0 || dup(w.text) || list.length >= 4) continue;
    add(w.text, w.tag);
  }
  // 모자라면 정답 근처 "계산 실수" — 정답이 % 꼴이면 % 꼴로 (혼자 다른 꼴이면 답이 보인다)
  const a = valueOf(answer); const pct = /%$/.test(String(answer));
  for (let k = 0; list.length < 4 && k < 30 && a !== null && Number.isInteger(a); k++) {
    const st = [1, -1, 2, -2, 3, -3][k % 6] * nearStep * (1 + Math.floor(k / 6));
    const v = a + st;
    if (v <= 0) continue;
    const t = pct ? `${v}%` : String(v);
    if (!dup(t)) add(t, '계산 실수');
  }
  return shuffle(r, list);
}
/** 문장 보기 — 근처 수로 채우지 않는다. order면 섞지 않는다(㉠㉡㉢㉣) */
function textChoices(r, ok, wrongs, order = null) {
  const list = [{ text: ok, ok: true }];
  const seen = new Set([ok]);
  for (const w of wrongs) {
    if (!w || !w.text || seen.has(w.text) || list.length >= 4) continue;
    seen.add(w.text);
    list.push({ text: w.text, ok: false, tag: w.tag });
  }
  return order ? order.map((t) => list.find((x) => x.text === t)).filter(Boolean) : shuffle(r, list);
}

/** ② 갈래 고르기 — 🔁 쌍둥이·🤔 오답 노트가 요청한 갈래를 먼저 (다른 줄기와 같은 규칙) */
function branchOf(r, c, names) {
  const want = c && c.want && c.want.startsWith('misread:') ? c.want.slice(8) : '';
  if (names.includes(want)) return want;
  const fresh = names.filter((n) => !(c && c.recent && c.recent.includes(`misread:${n}`)));
  return pick(r, fresh.length ? fresh : names);
}
/** 요청한 ① 틀(want) — ② 갈래 열쇠는 빼고 */
const wantOf = (c) => (c && c.want && !c.want.startsWith('misread:') ? c.want : '');
/** 요청한 틀(want)의 주제를 다시 고른다 — 무작위로 새로 뽑으면 🔁 쌍둥이가 다른 틀로 간다 */
function pickFor(r, c, list, has) {
  const w = wantOf(c);
  if (w) {
    const hit = list.filter((x) => has(x, w));
    if (hit.length) return hit[hit.length - 1];
  }
  return pick(r, list);
}
/** 물어볼 항목 — 요청한 틀에 그 항목의 말("포도를 좋아하는 학생 수")이 있으면 그것 */
function pickLabel(r, c, T, labels) {
  const w = wantOf(c);
  if (w) {
    const hit = labels.filter((l) => w.includes(T.cnt(l)));
    if (hit.length) return hit[hit.length - 1];
  }
  return pick(r, labels);
}
/** 요청한 틀의 그래프 지시문에서 ? 자리 — 항목 이름에 수가 있으면(1월·10시) 열쇠에서 #이 되어 이름으로는 못 찾는다 */
function askIdx(c, kind) {
  const w = wantOf(c);
  const m = w && new RegExp(`\\[${kind} ([^\\]]+)\\]`).exec(w);
  if (!m) return -1;
  return m[1].split(/\s+/).filter((t) => t.includes(':')).findIndex((t) => /:\?$/.test(t));
}
const showWork = (line, verb = '말했어요') => `{mon/이/가} 이렇게 ${verb}.\n\n**${line}**\n\n어디가 틀렸을까요?`;
const step = (no, text) => `${['①', '②', '③', '④'][no] || '·'} ${text}`;

const RIGHT_AS_WRONG = '틀린 줄 모름';
const OFF = '엉뚱한 지적';
const MIS_OK = '오개념을 옳다고 함';
const SLIP_TAG = '계산 실수';

/** 이 줄기의 오개념 이름표 (📊·🤔 노트에 그대로 뜬다) */
export const TAGS = {
  cellAsOne: '눈금 한 칸을 1로 봄',                    // 눈금 한 칸이 2명인데 막대 6칸을 6명으로
  labelGap: '이름 붙은 눈금 사이를 한 칸으로 봄',       // 0·10·20 사이가 5칸인데 한 칸을 10으로
  countAsScale: '칸 수를 눈금 한 칸의 값으로 봄',       // 10을 5칸으로 나눴으니 한 칸은 5
  addForDiff: '차를 구할 때 더함',
  maxOnly: '큰 값만 읽음',
  diffForTimes: '몇 배를 차로 답함',
  valueAsCells: '값을 그대로 칸 수로 봄',              // 30명을 30칸으로
  mulScale: '눈금 한 칸의 값을 곱함',                  // 30명 → 30 × 5칸
  tooSmall: '가장 큰 값이 그래프 밖으로 나감',
  notSmallest: '가장 작은 것을 고르지 않음',
  maxValueAsChange: '값이 가장 큰 때를 가장 많이 변한 때로 봄',
  leastChange: '가장 적게 변한 곳을 고름',
  endOnly: '끝 값만 읽음',
  fromZero: '물결선을 무시하고 0부터 읽음',
  sumForMid: '두 값을 더하기만 함',
  nearOnly: '한쪽 값만 읽음',
  noChange: '변하지 않는다고 봄',
  diffOnly: '늘어난 양만 답함',
  skipOne: '한 번 더 늘림',
  barForLine: '크기 비교를 꺾은선그래프로 봄',
  lineForBar: '시간에 따른 변화를 막대그래프로 봄',
  aboveMin: '가장 작은 값보다 크게 줄임',
  noWave: '물결선으로 줄이지 않음',
  sumOnly: '합만 구함',
  midrange: '(가장 큰 값 + 가장 작은 값) ÷ 2로 구함',
  wrongCount: '자료의 수를 잘못 셈',
  dropZero: '0을 빼고 나눔',
  addForTimes: '평균과 자료의 수를 더함',
  meanAsTotal: '평균을 합계로 봄',
  meanAsMissing: '평균을 그대로 답함',
  totalOnly: '합계만 구함',
  sumCompare: '사람 수가 다른데 합으로 비교함',
  equalGuess: '차이를 못 봄',
  likelyAsCertain: '"~일 것 같다"를 "확실하다"로 봄',
  certainAsLikely: '"확실하다"를 "~일 것 같다"로 봄',
  unlikelyAsImpossible: '"~아닐 것 같다"를 "불가능하다"로 봄',
  impossibleAsUnlikely: '"불가능하다"를 "~아닐 것 같다"로 봄',
  evenAsLikely: '"반반이다"를 한쪽으로 기울게 봄',
  leanAsEven: '한쪽으로 기운 것을 "반반이다"로 봄',
  oppositeChance: '가능성을 거꾸로 봄',
  farChance: '가능성의 정도를 크게 잘못 봄',
  countAsChance: '경우의 수를 가능성으로 봄',
  fewerAsLikely: '적은 쪽을 더 잘 나온다고 봄',
  restAsPart: '나머지의 합을 답함',
  dropOne: '하나를 빠뜨림',
  pctAsCount: '백분율을 그대로 수로 봄',
  restCount: '나머지를 구함',
  wrongDiv: '100이 아니라 10으로 나눔',
};

// ───────────────────── 이야기 재료 ─────────────────────

/** 막대그래프 주제 — 항목 묶음은 고정(🔁 쌍둥이 열쇠). cnt(항목) = "포도를 좋아하는 학생 수" */
const BAR_THEMES = [
  { id: 'fruit', topic: '반 친구들이 좋아하는 과일을 조사하여', labels: ['사과', '배', '포도', '귤'], unit: '명', cnt: (l) => `${jw(l, '을', '를')} 좋아하는 학생 수` },
  { id: 'type', topic: '{me}네 반 친구들이 좋아하는 포켓몬 타입을 조사하여', labels: ['불꽃', '물', '풀', '전기'], unit: '명', cnt: (l) => `${l} 타입을 좋아하는 학생 수` },
  { id: 'berry', topic: '{mon/이/가} 요일마다 모은 나무열매를', labels: ['월', '화', '수', '목', '금'], unit: '개', cnt: (l) => `${l}요일에 모은 나무열매 수` },
  { id: 'book', topic: '학급 문고에 있는 책을 종류별로 세어', labels: ['동화', '과학', '역사', '만화'], unit: '권', cnt: (l) => `${l} 책의 수` },
  { id: 'ball', topic: '포켓몬센터에서 하루 동안 팔린 볼을 세어', labels: ['몬스터볼', '슈퍼볼', '하이퍼볼'], unit: '개', cnt: (l) => `팔린 ${l}의 수` },
];
/** 막대그래프 눈금 — 한 칸 s, 이름은 lab칸마다 (lab > 1이라 한 칸을 나눗셈으로 알아내야 한다) */
const BAR_SCALES = [{ s: 2, lab: 5 }, { s: 5, lab: 2 }, { s: 5, lab: 4 }, { s: 10, lab: 5 }, { s: 2, lab: 2 }];

/** 꺾은선그래프 주제 — 시간 순서 이름은 고정. noun은 "몸무게는" 꼴로 */
const LINE_THEMES = [
  { id: 'weight', topic: '{mon}의 몸무게를 달마다 재어', xs: ['1월', '2월', '3월', '4월', '5월'], unit: 'kg', noun: '몸무게', steps: [1, 2] },
  { id: 'bean', topic: '{me}네 강낭콩의 키를 닷새마다 재어', xs: ['1일', '6일', '11일', '16일', '21일'], unit: 'cm', noun: '강낭콩의 키', steps: [1, 2] },
  { id: 'temp', topic: '교실의 온도를 한 시간마다 재어', xs: ['10시', '11시', '12시', '1시', '2시'], unit: '도', noun: '온도', steps: [2] },
  { id: 'visit', topic: '포켓몬센터에 온 손님 수를 요일마다 세어', xs: ['월', '화', '수', '목', '금'], unit: '명', noun: '손님 수', steps: [5, 10] },
  { id: 'jump', topic: '{me}의 줄넘기 기록을 한 주마다 적어', xs: ['1주', '2주', '3주', '4주', '5주'], unit: '번', noun: '줄넘기 기록', steps: [5, 10] },
];
/** 눈금 한 칸 → 이름 붙은 눈금 간격 */
const LAB_OF = { 1: 5, 2: 5, 5: 2, 10: 5 };
/** 물결선 주제 — 값이 크고 변화는 작아서 0부터 그리면 변화가 안 보이는 것 */
const WAVE_THEMES = [
  { id: 'wweight', topic: '{mon}의 몸무게를 달마다 재어', xs: ['1월', '2월', '3월', '4월', '5월'], unit: 'kg', noun: '몸무게', base: [25, 30, 35], steps: [1] },
  { id: 'wvisit', topic: '포켓몬센터에 온 손님 수를 요일마다 세어', xs: ['월', '화', '수', '목', '금'], unit: '명', noun: '손님 수', base: [200, 250, 300], steps: [5] },
  { id: 'wtall', topic: '{me}의 키를 해마다 재어', xs: ['1학년', '2학년', '3학년', '4학년'], unit: 'cm', noun: '키', base: [110, 120], steps: [2] },
];

/** 평균 주제 — 자료 이름(회·요일)은 고정 */
const MEAN_THEMES = [
  { id: 'mjump', topic: '{me}의 줄넘기 기록', names: ['1회', '2회', '3회', '4회', '5회'], unit: '번', noun: '줄넘기 기록', lo: 30, hi: 90, zero: false, mul: 2 },
  { id: 'mquiz', topic: '{me}의 수학 쪽지 시험 점수', names: ['1회', '2회', '3회', '4회'], unit: '점', noun: '점수', lo: 60, hi: 100, zero: false, mul: 5 },
  { id: 'mfish', topic: '{mon/이/가} 날마다 잡은 물고기 수', names: ['월', '화', '수', '목', '금'], unit: '마리', noun: '잡은 물고기 수', lo: 0, hi: 12, zero: true, mul: 1 },
  { id: 'mpage', topic: '{me}가 날마다 읽은 책의 쪽수', names: ['월', '화', '수', '목', '금'], unit: '쪽', noun: '읽은 쪽수', lo: 0, hi: 40, zero: true, mul: 2 },
];

/** 띠·원그래프 주제 — 칸 안에 이름이 들어가게 짧은 이름만 */
const PCT_THEMES = [
  { id: 'season', topic: '반 친구들이 좋아하는 계절', labels: ['봄', '여름', '가을', '겨울'], cnt: (l) => `${jw(l, '을', '를')} 좋아하는 학생` },
  { id: 'ptype', topic: '{me}네 반 친구들이 좋아하는 포켓몬 타입', labels: ['불꽃', '물', '풀', '전기'], cnt: (l) => `${l} 타입을 좋아하는 학생` },
  { id: 'snack', topic: '반 친구들이 좋아하는 간식', labels: ['떡', '과자', '과일', '빵'], cnt: (l) => `${jw(l, '을', '를')} 좋아하는 학생` },
];

/** 서로 다른 칸 수 n개 (lo..hi칸) */
const distinctCells = (r, n, lo, hi) => shuffle(r, Array.from({ length: hi - lo + 1 }, (_, i) => lo + i)).slice(0, n);
/** 막대그래프 지시문 (? 자리는 ask) */
const bg = (sc, unit, labels, vals, ask = -1) => `[bgraph ${sc.s}x${sc.lab} ${unit} ${labels.map((l, i) => `${l}:${i === ask ? '?' : vals[i]}`).join(' ')}]`;
/** 꺾은선그래프 지시문 (~base면 물결선) */
const lg = (s, unit, xs, vals, base = 0, ask = -1) => `[lgraph ${s}x${LAB_OF[s] || 5} ${unit}${base ? ` ~${base}` : ''} ${xs.map((x, i) => `${x}:${i === ask ? '?' : vals[i]}`).join(' ')}]`;

/**
 * 꺾은선 칸 수 — lo..hi칸 안에서 이웃끼리 1~4칸씩(내려가기도), 가장 많이 변한 곳이 하나.
 * want(i, j)가 있으면 j칸 값이 i칸 값보다 크게(늘어난 구간을 묻는 쌍둥이)
 */
function lineCells(r, n, lo, hi, opt = {}) {
  for (let t = 0; t < 80; t++) {
    const k = [int(r, lo, hi)];
    for (let i = 1; i < n; i++) k.push(k[i - 1] + (opt.up ? int(r, 1, 3) : pick(r, [-2, -1, 1, 2, 3, 4])));
    if (k.some((x) => x < lo || x > hi)) continue;
    const ad = k.slice(1).map((x, i) => Math.abs(x - k[i]));
    if (ad.filter((x) => x === Math.max(...ad)).length !== 1) continue;
    if (opt.rise && !(k[opt.rise[1]] > k[opt.rise[0]])) continue;
    if (opt.anyRise && !k.some((x, i) => i && x > k[i - 1])) continue;
    if (opt.topNotBig) { const top = k.indexOf(Math.max(...k)); const big = ad.indexOf(Math.max(...ad)); if (k.filter((x) => x === Math.max(...k)).length !== 1 || top === 0 || top - 1 === big) continue; }
    return k;
  }
  // 예비 — 처음 구간만 3칸, 나머지는 1칸씩 오른다 (가장 많이 변한 곳 0, 가장 높은 점 n−1)
  return Array.from({ length: n }, (_, i) => lo + (i ? 2 + i : 0));
}

// ───────────────────── 문항 마무리 (출연진 이름을 글·보기·풀이에 모두 채운다) ─────────────────────

function finish(id, r, c, f) {
  const F = (t) => fill(t, c);
  const wr = f.wr.filter(Boolean).map((w) => ({ ...w, text: F(w.text) }));
  const chs = f.words ? textChoices(r, F(f.ans), wr, f.order || null) : choices(r, f.ans, wr, f.near || 1);
  return {
    ...ask(id, 'calc', F(worldPick(r, c, f.pools)), chs, {
      solve: solve(f.steps.map((t, i) => step(i, F(t))), {
        why: Object.fromEntries(Object.entries(f.why || {}).map(([k, v]) => [k, F(v)])),
        // 이름표 없는 오답(계산 실수·짐작)의 설명 — 없으면 개념의 slip인데, 한 개념 안에 가족이 여럿이면 slip이 다른 가족 이야기다
        // (K5 점 찍기에 "시간에 따라 변하는지, 비교하는지부터" — 2026-10-01 헤드리스)
        ...(f.whyAny ? { whyAny: F(f.whyAny) } : {}),
        rule: f.rule,
      }),
    }),
    ...(f.draw ? { draw: f.draw } : {}),
    probe: f.probe || null,
  };
}
function finishMis(id, branch, r, c, m) {
  const F = (t) => fill(t, c);
  const chs = textChoices(r, F(m.ok), m.wr.map((w) => ({ ...w, text: F(w.text) })));
  return {
    ...ask(id, 'misread', F(m.q), chs, { solve: solve(m.steps.map((t, i) => step(i, F(t))), { whyAny: F(m.whyAny), rule: m.rule }) }),
    key: `misread:${branch}`,
    probe: m.probe,
  };
}

/** 막대그래프 한 벌 — 주제·눈금·값(서로 다른 칸 1~12) */
function barSet(r, c) {
  const T = pickFor(r, c, BAR_THEMES, (t, w) => w.includes(t.topic));
  const sc = pick(r, BAR_SCALES);
  const vals = distinctCells(r, T.labels.length, 1, 12).map((k) => k * sc.s);
  return { T, sc, vals };
}
/** 백분율 한 벌 — 5의 배수·10% 이상·합 100·서로 다르게. fix(ps) 조건까지 */
function pctSet(r, n, fix = () => true) {
  for (let t = 0; t < 200; t++) {
    const ps = Array.from({ length: n - 1 }, () => int(r, 2, 7) * 5);
    const last = 100 - sum(ps);
    if (last < 10 || last > 45) continue;
    ps.push(last);
    if (new Set(ps).size === n && fix(ps)) return ps;
  }
  return null;
}
/** 1부터 f까지 수 카드 · 구슬 · 동전 — 가능성 상황 (글에 수가 들어가야 쌍둥이 글이 달라진다) */
function chanceSits(r) {
  const f = pick(r, [6, 8, 10]); const k = int(r, 3, 9); const a = int(r, 6, 12); const b = int(r, 1, 2); const nth = int(r, 2, 9);
  return [
    { t: `1부터 ${f}까지의 수 카드 ${f}장 중 한 장을 뽑을 때 ${jn(f + 1, '이', '가')} 나올 가능성`, lv: 0, num: '0', count: null },
    { t: `빨간 구슬만 ${k}개 들어 있는 주머니에서 구슬 하나를 꺼낼 때 파란 구슬이 나올 가능성`, lv: 0, num: '0', count: null },
    { t: `빨간 구슬 ${a}개와 파란 구슬 ${b}개가 들어 있는 주머니에서 구슬 하나를 꺼낼 때 파란 구슬이 나올 가능성`, lv: 1, num: null, count: null },
    { t: `동전 한 개를 ${nth}번째로 던질 때 그림 면이 나올 가능성`, lv: 2, num: '1/2', count: null },
    { t: `1부터 ${f}까지의 수 카드 ${f}장 중 한 장을 뽑을 때 짝수가 나올 가능성`, lv: 2, num: '1/2', count: String(f / 2) },
    { t: `빨간 구슬 ${k}개와 파란 구슬 ${k}개가 들어 있는 주머니에서 구슬 하나를 꺼낼 때 빨간 구슬이 나올 가능성`, lv: 2, num: '1/2', count: String(k) },
    { t: `빨간 구슬 ${a}개와 파란 구슬 ${b}개가 들어 있는 주머니에서 구슬 하나를 꺼낼 때 빨간 구슬이 나올 가능성`, lv: 3, num: null, count: null },
    { t: `1부터 ${f}까지의 수 카드 ${f}장 중 한 장을 뽑을 때 ${f} 이하의 수가 나올 가능성`, lv: 4, num: '1', count: String(f) },
    { t: `빨간 구슬만 ${k}개 들어 있는 주머니에서 구슬 하나를 꺼낼 때 빨간 구슬이 나올 가능성`, lv: 4, num: '1', count: String(k) },
  ];
}
const LV = ['불가능하다', '~아닐 것 같다', '반반이다', '~일 것 같다', '확실하다'];
/** 고른 말(pick)과 참(truth) 사이의 틀린 생각 */
function chanceTag(truth, picked) {
  if (truth === 3 && picked === 4) return TAGS.likelyAsCertain;
  if (truth === 4 && picked === 3) return TAGS.certainAsLikely;
  if (truth === 1 && picked === 0) return TAGS.unlikelyAsImpossible;
  if (truth === 0 && picked === 1) return TAGS.impossibleAsUnlikely;
  if (truth === 2 && (picked === 1 || picked === 3)) return TAGS.evenAsLikely;
  if ((truth === 1 || truth === 3) && picked === 2) return TAGS.leanAsEven;
  if (picked === 4 - truth) return TAGS.oppositeChance;
  return TAGS.farChance;
}

// ───────────────────── 개념 사다리 (K. 자료와 그래프 줄기) ─────────────────────

export const DATA = [
  {
    id: 'dat.bar', grade: 4, name: '막대그래프 읽기', needs: [],
    idea: '막대그래프는 **막대의 길이**로 크기를 비교해요. 먼저 **세로 눈금 한 칸**이 얼마인지 알아내요 — 이름이 붙은 눈금 사이가 몇 칸으로 나뉘었는지 세어서 나눠요.',
    slip: '세로 눈금 한 칸이 얼마인지부터 다시 알아내 봐요.',
    calc(r, c) {
      const { T, sc, vals } = barSet(r, c);
      const G = bg(sc, T.unit, T.labels, vals);
      const head = (g) => `${T.topic} 막대그래프로 나타냈어요.\n\n${g}\n\n`;
      const X = pickLabel(r, c, T, T.labels); const xi = T.labels.indexOf(X); const v = vals[xi]; const k = v / sc.s;
      const mx = Math.max(...vals); const mn = Math.min(...vals);
      // 몇 배 — 따로 고른 두 항목이 2~3배 (나머지는 다른 값)
      const pairs = []; for (const a of T.labels) for (const b of T.labels) if (a !== b) pairs.push([a, b]);
      const [A, B] = pairs.find(([a, b]) => wantOf(c).includes(`${T.cnt(a)}는 ${T.cnt(b)}의 몇 배`)) || pick(r, pairs);
      const tm = pick(r, [2, 3]); const kb = int(r, 1, Math.floor(12 / tm));
      const tk = distinctCells(r, T.labels.length + 2, 1, 12).filter((x) => x !== kb && x !== kb * tm);
      const tvals = T.labels.map((l, i) => (l === A ? kb * tm : l === B ? kb : tk[i]) * sc.s);
      const sab = sc.s * sc.lab;
      const fams = [
        { ans: String(sc.s), near: 1,
          wr: [{ text: '1', tag: TAGS.cellAsOne }, { text: String(sab), tag: TAGS.labelGap }, sc.lab !== sc.s && { text: String(sc.lab), tag: TAGS.countAsScale }],
          why: {
            [TAGS.cellAsOne]: `칸 하나가 늘 1인 건 아니에요. 0과 ${sab} 사이가 ${sc.lab}칸이니까 한 칸은 ${sab} ÷ ${jn(sc.lab, '이에요', '예요')}.`,
            [TAGS.labelGap]: `${jn(sab, '은', '는')} 이름이 붙은 눈금 **사이 전체**예요. 그 사이가 ${sc.lab}칸으로 나뉘어 있어요.`,
            [TAGS.countAsScale]: `${jn(sc.lab, '은', '는')} 칸의 **수**예요. ${sab} ÷ ${jn(sc.lab, '을', '를')} 해야 한 칸의 값이 나와요.`,
          },
          steps: [`이름이 붙은 눈금 0과 ${sab} 사이가 ${sc.lab}칸으로 나뉘어 있어요`, `${sab} ÷ ${sc.lab} = ${sc.s}`, `세로 눈금 한 칸은 ${nu(sc.s, T.unit)}`],
          rule: '눈금 한 칸 = 이름 붙은 두 눈금의 차 ÷ 그 사이 칸 수.',
          pools: { pokemon: [`${head(G)}세로 눈금 한 칸은 몇 ${uj(T.unit, '을', '를')} 나타낼까요?`] } },
        { ans: String(v), near: sc.s,
          wr: [{ text: String(k), tag: TAGS.cellAsOne }, { text: String(k * sab), tag: TAGS.labelGap }],
          why: {
            [TAGS.cellAsOne]: `막대는 ${k}칸이지만 눈금 한 칸이 ${nuj(sc.s, T.unit, '이에요', '예요')}. ${k} × ${jn(sc.s, '을', '를')} 해요.`,
            [TAGS.labelGap]: `한 칸이 ${jn(sab, '이', '가')} 아니라 ${sab} ÷ ${sc.lab} = ${jn(sc.s, '이에요', '예요')}.`,
          },
          steps: [`세로 눈금 한 칸: ${sab} ÷ ${sc.lab} = ${nu(sc.s, T.unit)}`, `${X} 막대는 ${k}칸`, `${k} × ${sc.s} = ${nu(v, T.unit)}`],
          rule: '막대의 값 = 칸 수 × 눈금 한 칸.',
          pools: { pokemon: [`${head(G)}${T.cnt(X)}는 몇 ${T.unit}일까요?`] } },
        { ans: String(mx - mn), near: sc.s,
          wr: [{ text: String(mx + mn), tag: TAGS.addForDiff }, { text: String((mx - mn) / sc.s), tag: TAGS.cellAsOne }, { text: String(mx), tag: TAGS.maxOnly }],
          why: {
            [TAGS.addForDiff]: `차는 큰 값에서 작은 값을 **빼요**. ${mx} − ${mn}.`,
            [TAGS.cellAsOne]: `막대 칸 수의 차가 ${(mx - mn) / sc.s}칸이에요. 한 칸이 ${jn(sc.s, '이니까', '니까')} ${(mx - mn) / sc.s} × ${sc.s}.`,
            [TAGS.maxOnly]: `${jn(mx, '은', '는')} 가장 긴 막대의 값이에요. 가장 짧은 막대의 값 ${jn(mn, '을', '를')} 빼야 해요.`,
          },
          steps: [`가장 긴 막대 ${nu(mx, T.unit)}, 가장 짧은 막대 ${nu(mn, T.unit)}`, `${mx} − ${mn} = ${nu(mx - mn, T.unit)}`],
          rule: '차는 큰 값 − 작은 값. 칸 수의 차 × 눈금 한 칸으로도 구할 수 있다.',
          pools: { pokemon: [`${head(G)}막대가 가장 긴 것과 가장 짧은 것의 차는 몇 ${T.unit}일까요?`] } },
        { ans: String(tm),
          wr: [{ text: String(tvals[T.labels.indexOf(A)] - tvals[T.labels.indexOf(B)]), tag: TAGS.diffForTimes }, { text: String(kb * tm - kb), tag: TAGS.cellAsOne }],
          why: {
            [TAGS.diffForTimes]: `몇 배는 빼지 않고 **나눠요**. ${kb * tm * sc.s} ÷ ${kb * sc.s}.`,
            [TAGS.cellAsOne]: `칸 수의 차를 답했어요. 몇 배는 ${kb * tm * sc.s} ÷ ${jn(kb * sc.s, '이에요', '예요')}.`,
          },
          steps: [`${A} ${nu(kb * tm * sc.s, T.unit)}, ${B} ${nu(kb * sc.s, T.unit)}`, `${kb * tm * sc.s} ÷ ${kb * sc.s} = ${tm}`, `${tm}배`],
          rule: '몇 배 = 큰 값 ÷ 작은 값.',
          pools: { pokemon: [`${head(bg(sc, T.unit, T.labels, tvals))}${T.cnt(A)}는 ${T.cnt(B)}의 몇 배일까요?`] } },
      ];
      return finish(this.id, r, c, pickFamily(r, c, fams));
    },
    misread(r, c) {
      const { T, sc, vals } = barSet(r, c);
      const G = bg(sc, T.unit, T.labels, vals);
      const sab = sc.s * sc.lab;
      if (branchOf(r, c, ['scale', 'diff']) === 'scale') {
        const xi = int(r, 0, vals.length - 1); const X = T.labels[xi]; const v = vals[xi]; const k = v / sc.s;
        return finishMis(this.id, 'scale', r, c, {
          q: `${T.topic} 막대그래프로 나타냈어요.\n\n${G}\n\n${showWork(`${T.cnt(X)}는 ${nuj(k, T.unit, '이에요', '예요')} — 막대가 ${k}칸이니까요`)}`,
          ok: `눈금 한 칸이 ${nuj(sc.s, T.unit, '이라서', '라서')} ${k}칸은 ${nuj(v, T.unit, '이에요', '예요')}`,
          wr: [
            { text: '맞게 말했어요', tag: RIGHT_AS_WRONG },
            { text: `눈금 한 칸이 ${nuj(sab, T.unit, '이라서', '라서')} ${nuj(k * sab, T.unit, '이에요', '예요')}`, tag: TAGS.labelGap },
            { text: '막대그래프로는 수를 알 수 없어요', tag: OFF },
          ],
          steps: [`세로 눈금 한 칸: ${sab} ÷ ${sc.lab} = ${nu(sc.s, T.unit)}`, `${k} × ${sc.s} = ${nu(v, T.unit)}`],
          whyAny: `칸 수를 그대로 값으로 읽었어요. 눈금 한 칸이 ${jn(sc.s, '이니까', '니까')} 칸 수에 ${jn(sc.s, '을', '를')} 곱해요.`,
          rule: '막대의 값 = 칸 수 × 눈금 한 칸.',
          probe: { v, k, s: sc.s },
        });
      }
      const mx = Math.max(...vals); const mn = Math.min(...vals);
      return finishMis(this.id, 'diff', r, c, {
        q: `${T.topic} 막대그래프로 나타냈어요.\n\n${G}\n\n${showWork(`막대가 가장 긴 것과 가장 짧은 것의 차는 ${nuj(mx + mn, T.unit, '이에요', '예요')}`)}`,
        ok: `차는 빼서 구해요 — ${mx} − ${mn} = ${nu(mx - mn, T.unit)}`,
        wr: [
          { text: '맞게 말했어요', tag: RIGHT_AS_WRONG },
          { text: `칸 수의 차인 ${nuj((mx - mn) / sc.s, T.unit, '이에요', '예요')}`, tag: TAGS.cellAsOne },
          { text: '두 값을 더하면 차가 나와요', tag: MIS_OK },
        ],
        steps: [`가장 긴 막대 ${nu(mx, T.unit)}, 가장 짧은 막대 ${nu(mn, T.unit)}`, `${mx} − ${mn} = ${nu(mx - mn, T.unit)}`],
        whyAny: '두 값을 더했어요. 차는 큰 값에서 작은 값을 빼요.',
        rule: '차는 큰 값 − 작은 값.',
        probe: { mx, mn },
      });
    },
  },
  {
    id: 'dat.barmake', grade: 4, name: '막대그래프로 나타내기', needs: ['dat.bar'],
    idea: '막대그래프로 나타낼 때는 ① 세로 눈금 한 칸을 몇으로 할지 정하고 ② **값 ÷ 눈금 한 칸 = 막대의 칸 수**만큼 그려요. 가장 큰 값까지 그래프 안에 들어가야 해요.',
    slip: '값을 눈금 한 칸으로 나누면 몇 칸인지 나와요.',
    calc(r, c) {
      const { T, sc, vals } = barSet(r, c);
      // ㉮ 그리기 — 그릴 항목을 먼저 고르고, 그 값이 가장 크면 다른 값과 바꾼다 (그릴 막대가 그래프 안에 들어가게)
      const ai = askIdx(c, 'bgraph');
      const xi = ai >= 0 && ai < T.labels.length ? ai : T.labels.indexOf(pickLabel(r, c, T, T.labels));
      const top = vals.indexOf(Math.max(...vals));
      if (top === xi) { const j = (xi + 1) % vals.length; [vals[xi], vals[j]] = [vals[j], vals[xi]]; }
      const X = T.labels[xi]; const v = vals[xi];
      const G = bg(sc, T.unit, T.labels, vals, xi);
      // ㉯ 눈금 고르기 — 세로 눈금 N칸, 가장 큰 값 M: 1·2·5·10 중 N칸에 M이 들어가는 가장 작은 것
      const N = pick(r, [8, 10, 12]); const S4 = [1, 2, 5, 10];
      const goal = pick(r, S4.slice(1)); const lowS = S4[S4.indexOf(goal) - 1];
      const M = int(r, lowS * N + 1, goal * N);
      const items = T.labels.map((l, i) => (i === 0 ? M : Math.max(1, M - (i * 2 + 1) * Math.max(1, Math.round(M / 8)))));
      const list = `**${T.labels.map((l, i) => `${l} ${nu(items[i], T.unit)}`).join(' · ')}**`;
      const fams = [
        { ans: String(v / sc.s), near: 1,
          wr: [{ text: String(v), tag: TAGS.valueAsCells }, { text: String(v * sc.s), tag: TAGS.mulScale }],
          why: {
            [TAGS.valueAsCells]: `${nuj(v, T.unit, '을', '를')} ${v}칸으로 그리면 눈금 한 칸이 1인 그래프가 돼요. 이 그래프는 한 칸이 ${jn(sc.s, '이에요', '예요')}.`,
            [TAGS.mulScale]: `칸 수는 값을 눈금 한 칸으로 **나눠요**. ${v} ÷ ${sc.s}.`,
          },
          steps: [`세로 눈금 한 칸: ${sc.s * sc.lab} ÷ ${sc.lab} = ${nu(sc.s, T.unit)}`, `${v} ÷ ${sc.s} = ${v / sc.s}`, `${v / sc.s}칸만큼 그려요`],
          rule: '막대의 칸 수 = 값 ÷ 눈금 한 칸.',
          draw: { fig: G.slice(1, -1), mode: 'bar', target: xi },
          pools: { pokemon: [`${T.topic} 막대그래프로 나타내고 있어요. ${T.cnt(X)}는 ${nuj(v, T.unit, '이에요', '예요')}.\n\n${G}\n\n${X} 막대는 몇 칸만큼 그려야 할까요?`] } },
        { ans: String(goal), near: 1,
          wr: S4.filter((x) => x !== goal).map((x) => ({ text: String(x), tag: x < goal ? TAGS.tooSmall : TAGS.notSmallest })),
          why: {
            [TAGS.tooSmall]: `한 칸이 너무 작으면 ${N}칸으로는 ${jn(M, '을', '를')} 다 못 나타내요 — 그래프 밖으로 나가요.`,
            [TAGS.notSmallest]: '그 눈금으로도 들어가지만, 들어가는 것 중 **가장 작은** 눈금을 찾아야 해요.',
          },
          steps: [`가장 큰 값은 ${nu(M, T.unit)}`, `한 칸이 ${jn(lowS, '이면', '면')} ${N}칸에 ${lowS * N}까지 — 모자라요`, `한 칸이 ${jn(goal, '이면', '면')} ${N}칸에 ${goal * N}까지 — 들어가요`],
          rule: '눈금 한 칸 × 칸 수가 가장 큰 값보다 크거나 같아야 한다.',
          pools: { pokemon: [`${T.topic} 막대그래프로 나타내려고 해요.\n\n${list}\n\n세로 눈금은 ${N}칸이에요. 가장 큰 값까지 나타낼 수 있도록 세로 눈금 한 칸을 1, 2, 5, 10 중 하나로 정할 때, 가장 작은 것은 몇 ${T.unit}일까요?`] } },
      ];
      return finish(this.id, r, c, pickFamily(r, c, fams));
    },
    misread(r, c) {
      const { T, sc, vals } = barSet(r, c);
      if (branchOf(r, c, ['cells', 'scale']) === 'cells') {
        const xi = vals.indexOf(Math.min(...vals)); const X = T.labels[xi]; const v = vals[xi];
        return finishMis(this.id, 'cells', r, c, {
          q: `세로 눈금 한 칸이 ${nuj(sc.s, T.unit, '인', '인')} 막대그래프에 ${T.cnt(X)} ${nuj(v, T.unit, '을', '를')} 그리려고 해요.\n\n${showWork(`${nuj(v, T.unit, '이니까', '니까')} ${v}칸만큼 그려요`)}`,
          ok: `${v} ÷ ${sc.s} = ${v / sc.s} — ${v / sc.s}칸만큼 그려요`,
          wr: [
            { text: '맞게 말했어요', tag: RIGHT_AS_WRONG },
            { text: `${v} × ${sc.s} = ${v * sc.s} — ${v * sc.s}칸만큼 그려요`, tag: TAGS.mulScale },
            { text: `눈금 한 칸은 언제나 ${nuj(1, T.unit, '이라서', '라서')} 맞아요`, tag: MIS_OK },
          ],
          steps: [`눈금 한 칸이 ${nu(sc.s, T.unit)}`, `${v} ÷ ${sc.s} = ${v / sc.s}칸`],
          whyAny: `값을 그대로 칸 수로 그렸어요. 한 칸이 ${jn(sc.s, '이니까', '니까')} ${v} ÷ ${sc.s}칸이에요.`,
          rule: '막대의 칸 수 = 값 ÷ 눈금 한 칸.',
          probe: { v, s: sc.s },
        });
      }
      const N = 10; const M = int(r, 21, 50); const goal = 5;
      return finishMis(this.id, 'scale', r, c, {
        q: `세로 눈금이 10칸인 막대그래프에 가장 큰 값 ${nuj(M, T.unit, '을', '를')} 나타내려고 해요.\n\n${showWork(`세로 눈금 한 칸을 ${nu(1, T.unit)}${josa(T.unit, '으로', '로')} 정했어요`)}`,
        ok: `10칸이면 ${nu(10, T.unit)}까지뿐 — 한 칸을 ${nu(goal, T.unit)}${josa(T.unit, '으로', '로')} 하면 ${nu(goal * N, T.unit)}까지 들어가요`,
        wr: [
          { text: '맞게 말했어요', tag: RIGHT_AS_WRONG },
          { text: `한 칸을 ${nu(2, T.unit)}${josa(T.unit, '으로', '로')} 하면 다 들어가요`, tag: TAGS.tooSmall },
          { text: '세로 눈금이 10칸이라 그릴 수 없어요', tag: OFF },
        ],
        steps: [`한 칸이 1이면 10칸에 10까지 — ${jn(M, '을', '를')} 못 나타내요`, `한 칸이 ${jn(goal, '이면', '면')} 10칸에 ${goal * N}까지 — 들어가요`],
        whyAny: `한 칸 × 10칸이 가장 큰 값 ${M}보다 작으면 막대가 그래프 밖으로 나가요.`,
        rule: '눈금 한 칸 × 칸 수가 가장 큰 값보다 크거나 같아야 한다.',
        probe: { M, N, goal },
      });
    },
  },
  {
    id: 'dat.line', grade: 4, name: '꺾은선그래프 읽기', needs: ['dat.barmake'],
    idea: '꺾은선그래프는 **시간에 따라 변하는 모양**을 보여 줘요. 점이 그때의 값이고, 선이 **오르면 늘고 내리면 줄어요**. 선이 **가장 많이 기울어진 곳**이 가장 많이 변한 때예요.',
    slip: '세로 눈금 한 칸이 얼마인지, 선이 어디서 가장 많이 기울어졌는지 다시 봐요.',
    calc(r, c) {
      const T = pickFor(r, c, LINE_THEMES, (t, w) => w.includes(t.topic));
      const s = pick(r, T.steps); const lab = LAB_OF[s]; const n = T.xs.length;
      // 늘어난 구간을 묻는 쌍둥이 — 요일처럼 이름에 수가 없으면 열쇠에 구간이 남는다
      const reqs = []; for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) reqs.push([i, j]);
      const req = reqs.find(([i, j]) => wantOf(c).includes(`${T.xs[i]}부터 ${T.xs[j]}까지`));
      const cells = lineCells(r, n, 1, 12, { rise: req || null, anyRise: true });
      const vals = cells.map((k) => k * s);
      const G = lg(s, T.unit, T.xs, vals);
      const head = `${T.topic} 꺾은선그래프로 나타냈어요.\n\n${G}\n\n`;
      const ds = vals.slice(1).map((v, i) => v - vals[i]);
      const absd = ds.map(Math.abs); const big = absd.indexOf(Math.max(...absd));
      const gap = (i) => `${jw(T.xs[i], '과', '와')} ${T.xs[i + 1]} 사이`;
      const top = vals.indexOf(Math.max(...vals));
      const least = absd.indexOf(Math.min(...absd));
      const X = pickFor(r, c, T.xs, (x, w) => w.includes(`${x}의 ${T.noun}`)); const xi = T.xs.indexOf(X);
      const ups = reqs.filter(([i, j]) => vals[j] > vals[i]);
      const [ui, uj2] = (req && vals[req[1]] > vals[req[0]]) ? req : pick(r, ups);
      // 가장 많이 변한 때 — 오답 구간: 값이 가장 큰 점으로 들어가는 구간 · 가장 적게 변한 구간 · 그 밖의 구간
      const gw = [];
      const seenG = new Set([big]);
      const addG = (i, tag) => { if (i >= 0 && i < n - 1 && !seenG.has(i)) { seenG.add(i); gw.push({ text: gap(i), tag }); } };
      if (top > 0) addG(top - 1, TAGS.maxValueAsChange);
      addG(least, TAGS.leastChange);
      for (let i = 0; i < n - 1; i++) addG(i, SLIP_TAG);
      const fams = [
        { ans: String(vals[xi]), near: s,
          wr: [s > 1 && { text: String(cells[xi]), tag: TAGS.cellAsOne }, { text: String(cells[xi] * s * lab), tag: TAGS.labelGap }],
          why: {
            [TAGS.cellAsOne]: `점은 0에서 ${cells[xi]}칸 위에 있어요. 한 칸이 ${jn(s, '이니까', '니까')} ${cells[xi]} × ${s}.`,
            [TAGS.labelGap]: `한 칸은 ${s * lab} ÷ ${lab} = ${jn(s, '이에요', '예요')}.`,
          },
          steps: [`세로 눈금 한 칸: ${s * lab} ÷ ${lab} = ${nu(s, T.unit)}`, `${X}의 점은 0에서 ${cells[xi]}칸 위`, `${cells[xi]} × ${s} = ${nu(vals[xi], T.unit)}`],
          rule: '점의 값 = 칸 수 × 눈금 한 칸.',
          pools: { pokemon: [`${head}${X}의 ${jw(T.noun, '은', '는')} 몇 ${T.unit}일까요?`] } },
        { words: true, ans: gap(big), wr: gw,
          why: {
            [TAGS.maxValueAsChange]: `${T.xs[top]}에 값이 가장 크지만, **변한 양**은 선이 가장 많이 기울어진 곳에서 가장 커요.`,
            [TAGS.leastChange]: '그곳은 선이 가장 **덜** 기울어졌어요 — 가장 적게 변한 때예요.',
            [SLIP_TAG]: '구간마다 변한 양을 모두 구해서 견줘 봐요.',
          },
          steps: [`구간마다 변한 양: ${ds.map((d, i) => `${T.xs[i]}→${T.xs[i + 1]} ${d > 0 ? '+' : '−'}${Math.abs(d)}`).join(', ')}`, `가장 큰 것은 ${absd[big]} — ${gap(big)}`],
          rule: '가장 많이 변한 때 = 선이 가장 많이 기울어진 곳.',
          pools: { pokemon: [`${head}${jw(T.noun, '이', '가')} 가장 많이 변한 때는 언제와 언제 사이일까요?`] } },
        { ans: String(vals[uj2] - vals[ui]), near: s,
          wr: [{ text: String(vals[uj2] + vals[ui]), tag: TAGS.addForDiff }, s > 1 && { text: String((vals[uj2] - vals[ui]) / s), tag: TAGS.cellAsOne }, { text: String(vals[uj2]), tag: TAGS.endOnly }],
          why: {
            [TAGS.addForDiff]: '늘어난 양은 나중 값에서 처음 값을 **빼요**.',
            [TAGS.cellAsOne]: `${(vals[uj2] - vals[ui]) / s}칸 늘었어요. 한 칸이 ${jn(s, '이니까', '니까')} × ${s}.`,
            [TAGS.endOnly]: `${jn(vals[uj2], '은', '는')} ${T.xs[uj2]}의 값이에요. ${T.xs[ui]}의 값 ${jn(vals[ui], '을', '를')} 빼야 해요.`,
          },
          steps: [`${T.xs[ui]} ${nu(vals[ui], T.unit)} → ${T.xs[uj2]} ${nu(vals[uj2], T.unit)}`, `${vals[uj2]} − ${vals[ui]} = ${nu(vals[uj2] - vals[ui], T.unit)}`],
          rule: '늘어난 양 = 나중 값 − 처음 값.',
          pools: { pokemon: [`${head}${T.xs[ui]}부터 ${T.xs[uj2]}까지 ${jw(T.noun, '은', '는')} 몇 ${T.unit} 늘었을까요?`] } },
      ];
      return finish(this.id, r, c, pickFamily(r, c, fams));
    },
    misread(r, c) {
      const T = pickFor(r, c, LINE_THEMES, (t, w) => w.includes(t.topic));
      const n = T.xs.length;
      if (branchOf(r, c, ['most', 'cells']) === 'most') {
        const s = pick(r, T.steps);
        const cells = lineCells(r, n, 1, 12, { topNotBig: true }); const vals = cells.map((k) => k * s);
        const ad = vals.slice(1).map((v, i) => Math.abs(v - vals[i])); const big = ad.indexOf(Math.max(...ad)); const top = vals.indexOf(Math.max(...vals));
        const G = lg(s, T.unit, T.xs, vals);
        const gap = (i) => `${jw(T.xs[i], '과', '와')} ${T.xs[i + 1]} 사이`;
        return finishMis(this.id, 'most', r, c, {
          q: `${T.topic} 꺾은선그래프로 나타냈어요.\n\n${G}\n\n${showWork(`${jw(T.noun, '이', '가')} 가장 많이 변한 때는 ${gap(top - 1)}예요 — ${T.xs[top]}의 점이 가장 높으니까요`)}`,
          ok: `선이 가장 많이 기울어진 곳 — ${gap(big)}`,
          wr: [
            { text: '맞게 말했어요', tag: RIGHT_AS_WRONG },
            { text: `점이 가장 높은 ${T.xs[top]} 한 때가 답이에요`, tag: TAGS.maxValueAsChange },
            { text: '꺾은선그래프로는 변한 양을 알 수 없어요', tag: OFF },
          ],
          steps: ['구간마다 변한 양을 견줘요', `가장 많이 변한 곳: ${gap(big)}`],
          whyAny: '점이 가장 높은 것은 값이 가장 큰 것이에요. 가장 많이 **변한** 때는 선이 가장 많이 기울어진 곳이에요.',
          rule: '가장 많이 변한 때 = 선이 가장 많이 기울어진 곳.',
          probe: { vals, big, top },
        });
      }
      const s = T.steps.find((x) => x > 1) || 2; const lab = LAB_OF[s];
      const cells = lineCells(r, n, 1, 12); const vals = cells.map((k) => k * s);
      const G = lg(s, T.unit, T.xs, vals);
      const xi = int(r, 0, n - 1); const v = vals[xi]; const k = cells[xi];
      return finishMis(this.id, 'cells', r, c, {
        q: `${T.topic} 꺾은선그래프로 나타냈어요.\n\n${G}\n\n${showWork(`${T.xs[xi]}의 ${jw(T.noun, '은', '는')} ${nuj(k, T.unit, '이에요', '예요')} — 점이 ${k}칸 위에 있으니까요`)}`,
        ok: `눈금 한 칸이 ${nuj(s, T.unit, '이라서', '라서')} ${k}칸은 ${nuj(v, T.unit, '이에요', '예요')}`,
        wr: [
          { text: '맞게 말했어요', tag: RIGHT_AS_WRONG },
          { text: `한 칸이 ${nuj(s * lab, T.unit, '이라서', '라서')} ${nuj(k * s * lab, T.unit, '이에요', '예요')}`, tag: TAGS.labelGap },
          { text: '점은 선 위에 있어서 값을 읽을 수 없어요', tag: OFF },
        ],
        steps: [`세로 눈금 한 칸: ${nu(s, T.unit)}`, `${k} × ${s} = ${nu(v, T.unit)}`],
        whyAny: '칸 수를 그대로 값으로 읽었어요. 칸 수 × 눈금 한 칸이 값이에요.',
        rule: '점의 값 = 칸 수 × 눈금 한 칸.',
        probe: { v, k, s },
      });
    },
  },
  {
    id: 'dat.wave', grade: 4, name: '물결선과 짐작하기', needs: ['dat.line'],
    idea: '**물결선**(≈)은 필요 없는 부분을 줄였다는 표시예요. 0부터가 아니라 **물결선 위 첫 눈금**부터 세어야 해요. 두 점 **사이의 값**은 선의 가운데쯤으로 짐작하고, 같은 만큼씩 변하면 다음 값도 짐작할 수 있어요.',
    slip: '물결선 위 첫 눈금이 몇인지부터 확인해요.',
    calc(r, c) {
      const T = pickFor(r, c, WAVE_THEMES, (t, w) => w.includes(t.topic));
      const s = pick(r, T.steps); const base = pick(r, T.base); const n = T.xs.length;
      const cells = lineCells(r, n, 1, 10); const vals = cells.map((k) => base + k * s);
      const G = lg(s, T.unit, T.xs, vals, base);
      const X = pickFor(r, c, T.xs, (x, w) => w.includes(`${x}의 ${T.noun}`)); const xi = T.xs.indexOf(X); const v = vals[xi]; const k = cells[xi];
      // 가운데 값 — 온도(한 시간마다, 2도 눈금)
      const hrs = ['10시', '11시', '12시', '1시', '2시'];
      const tc = lineCells(r, 5, 5, 14); const temps = tc.map((x) => x * 2);
      const t0 = int(r, 0, 3); const mid = (temps[t0] + temps[t0 + 1]) / 2;
      const GT = lg(2, '도', hrs, temps);
      // 다음 값 — 같은 만큼씩 늘어나는 기록 (마지막 칸이 ?)
      const dk = int(r, 1, 2); const k0 = int(r, 1, 2);
      const seq = Array.from({ length: n }, (_, i) => base + (k0 + i * dk) * s); const d = dk * s;
      const seqG = lg(s, T.unit, T.xs, seq, base, n - 1);
      const fams = [
        { ans: String(v), near: s,
          wr: [{ text: String(v - base), tag: TAGS.fromZero }, s > 1 && { text: String(base + k), tag: TAGS.cellAsOne }],
          why: {
            [TAGS.fromZero]: `물결선 아래는 줄인 부분이에요. 맨 아래 눈금이 0이 아니라 ${jn(base, '이에요', '예요')}.`,
            [TAGS.cellAsOne]: `${k}칸 위예요. 한 칸이 ${jn(s, '이니까', '니까')} ${base} + ${k} × ${s}.`,
          },
          steps: [`물결선 위 첫 눈금: ${nu(base, T.unit)}`, `${X}의 점은 그보다 ${k}칸 위, 한 칸은 ${nu(s, T.unit)}`, `${base} + ${k} × ${s} = ${nu(v, T.unit)}`],
          rule: '물결선이 있으면 물결선 위 첫 눈금부터 센다.',
          pools: { pokemon: [`${T.topic} 꺾은선그래프로 나타냈어요.\n\n${G}\n\n${X}의 ${jw(T.noun, '은', '는')} 몇 ${T.unit}일까요?`] } },
        { ans: String(mid), near: 1,
          wr: [{ text: String(temps[t0] + temps[t0 + 1]), tag: TAGS.sumForMid }, { text: String(temps[t0]), tag: TAGS.nearOnly }, { text: String(temps[t0 + 1]), tag: TAGS.nearOnly }],
          why: {
            [TAGS.sumForMid]: `두 값을 더하기만 했어요. 가운데 값은 (${temps[t0]} + ${temps[t0 + 1]}) ÷ 2.`,
            [TAGS.nearOnly]: '그것은 정각의 값이에요. 30분은 두 점 사이 **가운데쯤**이에요.',
          },
          steps: [`${hrs[t0]} ${temps[t0]}도, ${hrs[t0 + 1]} ${temps[t0 + 1]}도`, `가운데쯤: (${temps[t0]} + ${temps[t0 + 1]}) ÷ 2 = ${mid}`, `약 ${mid}도`],
          rule: '두 점 사이의 값은 선의 가운데쯤으로 짐작한다.',
          pools: { pokemon: [`교실의 온도를 한 시간마다 재어 꺾은선그래프로 나타냈어요.\n\n${GT}\n\n${hrs[t0]} 30분의 온도는 약 몇 도일까요?`] } },
        { ans: String(seq[n - 1]), near: s,
          wr: [{ text: String(seq[n - 2]), tag: TAGS.noChange }, { text: String(d), tag: TAGS.diffOnly }, { text: String(seq[n - 2] + 2 * d), tag: TAGS.skipOne }],
          why: {
            [TAGS.noChange]: `${jn(seq[n - 2], '은', '는')} 바로 앞 값이에요. 같은 만큼씩 늘어나니까 ${jn(d, '을', '를')} 더해요.`,
            [TAGS.diffOnly]: `${jn(d, '은', '는')} 한 번에 늘어나는 양이에요. 앞 값에 더해야 해요.`,
            [TAGS.skipOne]: `한 번만 더 늘어나요 — ${seq[n - 2]} + ${d}.`,
          },
          steps: [`한 번에 늘어나는 양: ${seq[1]} − ${seq[0]} = ${nu(d, T.unit)}`, `${seq[n - 2]} + ${d} = ${nu(seq[n - 1], T.unit)}`],
          rule: '같은 만큼씩 변하면 마지막 값 + 늘어나는 양으로 짐작한다.',
          pools: { pokemon: [`${T.topic} 꺾은선그래프로 나타냈어요.\n\n${seqG}\n\n이대로 같은 만큼씩 늘어난다면 ${T.xs[n - 1]}의 ${jw(T.noun, '은', '는')} 몇 ${T.unit}일까요?`] } },
      ];
      return finish(this.id, r, c, pickFamily(r, c, fams));
    },
    misread(r, c) {
      const T = pickFor(r, c, WAVE_THEMES, (t, w) => w.includes(t.topic));
      const s = pick(r, T.steps); const base = pick(r, T.base); const n = T.xs.length;
      if (branchOf(r, c, ['zero', 'mid']) === 'zero') {
        const cells = lineCells(r, n, 1, 10); const vals = cells.map((k) => base + k * s);
        const G = lg(s, T.unit, T.xs, vals, base);
        const xi = int(r, 0, n - 1); const v = vals[xi];
        return finishMis(this.id, 'zero', r, c, {
          q: `${T.topic} 꺾은선그래프로 나타냈어요.\n\n${G}\n\n${showWork(`${T.xs[xi]}의 ${jw(T.noun, '은', '는')} ${nuj(v - base, T.unit, '이에요', '예요')} — 맨 아래에서 ${cells[xi]}칸 위니까요`)}`,
          ok: `물결선 위 첫 눈금이 ${jn(base, '이라서', '라서')} ${base} + ${v - base} = ${nu(v, T.unit)}`,
          wr: [
            { text: '맞게 말했어요', tag: RIGHT_AS_WRONG },
            { text: '물결선은 그림을 꾸미는 무늬라서 신경 쓰지 않아도 돼요', tag: MIS_OK },
            { text: `${T.xs[xi]}에는 점이 없어서 알 수 없어요`, tag: OFF },
          ],
          steps: [`물결선 위 첫 눈금: ${nu(base, T.unit)}`, `${base} + ${cells[xi]} × ${s} = ${nu(v, T.unit)}`],
          whyAny: `물결선으로 0부터 ${base}까지를 줄였어요. 맨 아래 눈금은 ${jn(base, '이에요', '예요')}.`,
          rule: '물결선이 있으면 물결선 위 첫 눈금부터 센다.',
          probe: { v, base },
        });
      }
      const hrs = ['10시', '11시', '12시', '1시', '2시'];
      const temps = lineCells(r, 5, 5, 14).map((x) => x * 2);
      const t0 = int(r, 0, 3); const mid = (temps[t0] + temps[t0 + 1]) / 2;
      return finishMis(this.id, 'mid', r, c, {
        q: `교실의 온도를 한 시간마다 재어 꺾은선그래프로 나타냈어요.\n\n${lg(2, '도', hrs, temps)}\n\n${showWork(`${hrs[t0]} 30분의 온도는 약 ${temps[t0] + temps[t0 + 1]}도예요`)}`,
        ok: `두 값의 가운데쯤 — (${temps[t0]} + ${temps[t0 + 1]}) ÷ 2 = 약 ${mid}도`,
        wr: [
          { text: '맞게 말했어요', tag: RIGHT_AS_WRONG },
          { text: '30분에는 재지 않아서 짐작할 수 없어요', tag: OFF },
          { text: `${hrs[t0]}의 값 그대로 약 ${temps[t0]}도예요`, tag: TAGS.nearOnly },
        ],
        steps: [`${hrs[t0]} ${temps[t0]}도, ${hrs[t0 + 1]} ${temps[t0 + 1]}도`, `가운데쯤: (${temps[t0]} + ${temps[t0 + 1]}) ÷ 2 = ${mid}`],
        whyAny: '두 값을 더하기만 했어요. 가운데쯤은 두 값을 더해 2로 나눠요.',
        rule: '두 점 사이의 값은 선의 가운데쯤으로 짐작한다.',
        probe: { a: temps[t0], b: temps[t0 + 1] },
      });
    },
  },
  {
    id: 'dat.choose', grade: 4, name: '꺾은선그래프로 나타내기', needs: ['dat.wave'],
    idea: '**시간에 따라 변하는 것**(키·기온·몸무게)은 꺾은선그래프, **여러 가지의 크기를 비교**하는 것(좋아하는 과일)은 막대그래프가 알맞아요. 꺾은선그래프를 그릴 때 가장 작은 값보다 아래는 물결선으로 줄여 변화가 잘 보이게 해요.',
    slip: '시간에 따라 변하는지, 여러 가지를 비교하는지부터 봐요.',
    calc(r, c) {
      // 알맞은 그래프 — 상황 넷(㉠~㉣, 수가 들어가 쌍둥이 글이 달라진다). 묶음마다 순서·답 자리 고정
      const nA = int(r, 20, 30); const nB = int(r, 3, 9); const nC = int(r, 4, 8); const nD = int(r, 30, 90);
      const time = [`{mon}의 몸무게를 ${nC}달 동안 달마다 잰 것`, `교실의 온도를 ${nC}시간 동안 한 시간마다 잰 것`, `강낭콩의 키를 ${nC * 5}일 동안 닷새마다 잰 것`, `{me}의 줄넘기 기록을 ${nC}주 동안 한 주마다 적은 것`];
      const cat = [`반 친구 ${nA}명이 좋아하는 과일`, `마을 ${nB}곳의 자전거 수`, `학급 문고의 책 ${nD}권을 종류별로 센 것`, `반 친구 ${nA}명이 좋아하는 포켓몬 타입`];
      const SETS = [
        { line: true, items: [cat[0], cat[1], time[0], cat[2]], ans: 2 },
        { line: true, items: [time[1], cat[1], cat[3], cat[2]], ans: 0 },
        { line: false, items: [time[0], time[2], time[3], cat[3]], ans: 3 },
        { line: false, items: [time[1], cat[0], time[2], time[0]], ans: 1 },
      ];
      const MK = ['㉠', '㉡', '㉢', '㉣'];
      const setFam = (S) => ({ words: true, order: MK, ans: MK[S.ans],
        wr: MK.filter((_, i) => i !== S.ans).map((m) => ({ text: m, tag: S.line ? TAGS.barForLine : TAGS.lineForBar })),
        why: S.line
          ? { [TAGS.barForLine]: '여러 가지를 **비교**하는 자료는 막대그래프가 알맞아요. 꺾은선은 시간에 따라 **변하는** 모양을 보여 줘요.' }
          : { [TAGS.lineForBar]: '시간에 따라 **변하는** 모양은 꺾은선그래프가 잘 보여 줘요. 막대그래프는 여러 가지를 **비교**할 때 알맞아요.' },
        steps: [S.line ? '시간에 따라 변하는 자료를 찾아요' : '여러 가지의 크기를 비교하는 자료를 찾아요', `→ ${MK[S.ans]} ${S.items[S.ans]}`],
        rule: '시간에 따른 변화 = 꺾은선그래프, 여러 가지 비교 = 막대그래프.',
        pools: { pokemon: [`${S.line ? '꺾은선그래프' : '막대그래프'}로 나타내기에 가장 알맞은 것은 어느 것일까요?\n\n${S.items.map((t, i) => `${MK[i]} ${t}`).join('\n')}`] } });
      // 점 찍기 — 물결선 그래프에 빠진 점 하나 (가장 큰 값이 아닌 것)
      const T = pickFor(r, c, WAVE_THEMES, (t, w) => w.includes(t.topic));
      const s = pick(r, T.steps); const base = pick(r, T.base); const n = T.xs.length;
      const cells = lineCells(r, n, 1, 10); const vals = cells.map((k) => base + k * s);
      const ai = askIdx(c, 'lgraph');
      const xi = ai >= 0 && ai < n ? ai : int(r, 0, n - 1);
      const tp = vals.indexOf(Math.max(...vals));
      if (tp === xi) { const j = (xi + 1) % n; [vals[xi], vals[j]] = [vals[j], vals[xi]]; [cells[xi], cells[j]] = [cells[j], cells[xi]]; }
      const X = T.xs[xi]; const v = vals[xi];
      const G = lg(s, T.unit, T.xs, vals, base, xi);
      // 물결선 위 첫 눈금 — 모든 값을 나타낼 수 있는 가장 큰 5의 배수
      const mn = int(r, 6, 19) * 5 + int(r, 1, 4); const mx = mn + int(r, 8, 20);
      const okBase = Math.floor(mn / 5) * 5;
      const fams = [
        ...SETS.map(setFam),
        { ans: String((v - base) / s), near: 1,
          wr: [{ text: String(v / s), tag: TAGS.fromZero }, s > 1 && { text: String(v - base), tag: TAGS.cellAsOne }],
          why: {
            [TAGS.fromZero]: `물결선 위 첫 눈금이 ${jn(base, '이에요', '예요')}. 0이 아니라 ${base}부터 세요.`,
            [TAGS.cellAsOne]: `한 칸이 ${jn(s, '이니까', '니까')} ${v - base} ÷ ${s}칸이에요.`,
          },
          steps: [`물결선 위 첫 눈금 ${nu(base, T.unit)}에서 ${nu(v, T.unit)}까지 ${v - base}`, `${v - base} ÷ ${s} = ${(v - base) / s}칸`],
          whyAny: `물결선 위 첫 눈금 ${base}에서 ${v}까지가 ${v - base}, 눈금 한 칸이 ${jn(s, '이니까', '니까')} ${v - base} ÷ ${s} = ${(v - base) / s}칸이에요.`,
          rule: '물결선 위 첫 눈금부터 (값 − 첫 눈금) ÷ 눈금 한 칸만큼 올라가 찍는다.',
          draw: { fig: G.slice(1, -1), mode: 'point', target: xi },
          pools: { pokemon: [`${T.topic} 꺾은선그래프로 나타내고 있어요. ${X}의 ${jw(T.noun, '은', '는')} ${nuj(v, T.unit, '이에요', '예요')}.\n\n${G}\n\n${X}의 점은 물결선 위 첫 눈금에서 몇 칸 위에 찍어야 할까요?`] } },
        { ans: String(okBase), near: 5,
          wr: [{ text: String(okBase + 5), tag: TAGS.aboveMin }, { text: '0', tag: TAGS.noWave }, { text: String(Math.floor(mx / 5) * 5), tag: TAGS.aboveMin }],
          why: {
            [TAGS.aboveMin]: `그 눈금부터 그리면 가장 작은 값 ${jn(mn, '을', '를')} 나타낼 수 없어요.`,
            [TAGS.noWave]: '0부터 그리면 줄이지 않은 것이라 변화가 잘 안 보여요. 물결선 위 첫 눈금을 물었어요.',
          },
          steps: [`가장 작은 값은 ${mn}`, `5의 배수 중 ${mn}보다 크지 않은 가장 큰 수: ${okBase}`, `물결선 위 첫 눈금: ${okBase}`],
          whyAny: `첫 눈금은 가장 작은 값 ${mn}보다 크면 안 돼요 — 5의 배수 중 ${mn}보다 크지 않은 가장 큰 수를 찾아요.`,
          rule: '물결선 위 첫 눈금은 가장 작은 값보다 크면 안 된다.',
          pools: { pokemon: [`어떤 자료를 꺾은선그래프로 나타내려고 해요.

**가장 작은 값 ${mn} · 가장 큰 값 ${mx}**

세로 눈금 한 칸을 5로 하고 물결선으로 줄여서 변화가 잘 보이게 할 때, 모든 값을 나타낼 수 있는 물결선 위 첫 눈금 중 가장 큰 수는 몇일까요?`] } },
      ];
      return finish(this.id, r, c, pickFamily(r, c, fams));
    },
    misread(r, c) {
      if (branchOf(r, c, ['kind', 'wave']) === 'kind') {
        const k = int(r, 3, 9);
        const t = pick(r, [`{mon}의 몸무게를 ${k}달 동안 달마다 잰 것`, `교실의 온도를 ${k}시간 동안 한 시간마다 잰 것`, `강낭콩의 키를 ${k * 5}일 동안 닷새마다 잰 것`]);
        return finishMis(this.id, 'kind', r, c, {
          q: showWork(`${t}은 막대그래프로 나타내는 것이 가장 알맞아요`),
          ok: '시간에 따라 변하는 모양은 꺾은선그래프가 잘 보여 줘요',
          wr: [
            { text: '맞게 말했어요', tag: RIGHT_AS_WRONG },
            { text: '막대그래프와 꺾은선그래프는 언제나 똑같이 알맞아요', tag: MIS_OK },
            { text: '이 자료는 그래프로 나타낼 수 없어요', tag: OFF },
          ],
          steps: ['시간에 따라 변하는 자료인가요? → 네', '→ 꺾은선그래프가 알맞아요'],
          whyAny: '시간에 따른 변화를 막대로 그리면 늘고 준 모양이 선처럼 잘 안 보여요.',
          rule: '시간에 따른 변화 = 꺾은선그래프, 여러 가지 비교 = 막대그래프.',
          probe: { t },
        });
      }
      const mn = int(r, 6, 19) * 5 + int(r, 1, 4); const okBase = Math.floor(mn / 5) * 5; const shown = okBase + 5;
      return finishMis(this.id, 'wave', r, c, {
        q: `가장 작은 값이 ${jn(mn, '인', '인')} 자료를 세로 눈금 한 칸 5로 꺾은선그래프에 나타내요.\n\n${showWork(`물결선 위 첫 눈금을 ${ro(shown)} 했어요`)}`,
        ok: `${jn(shown, '은', '는')} ${mn}보다 커서 ${jn(mn, '을', '를')} 못 나타내요 — ${okBase} 이하로 해야 해요`,
        wr: [
          { text: '맞게 말했어요', tag: RIGHT_AS_WRONG },
          { text: '물결선은 언제나 0 바로 위에 넣어야 해요', tag: MIS_OK },
          { text: '세로 눈금 한 칸을 1로 바꿔야 해요', tag: OFF },
        ],
        steps: [`가장 작은 값 ${mn}`, `첫 눈금은 ${mn}보다 크면 안 돼요 → ${okBase}`],
        whyAny: '첫 눈금이 가장 작은 값보다 크면 그 값의 점을 찍을 자리가 없어요.',
        rule: '물결선 위 첫 눈금은 가장 작은 값보다 크면 안 된다.',
        probe: { mn, shown, okBase },
      });
    },
  },
  {
    id: 'dat.mean', grade: 5, name: '평균 구하기', needs: ['dat.choose'],
    idea: '**평균**은 자료를 고르게 했을 때의 값이에요. **(자료를 모두 더한 값) ÷ (자료의 수)**. 0도 자료의 하나라서 수에 넣어요.',
    slip: '모두 더한 다음, 자료가 몇 개인지 세어 나눠요.',
    calc(r, c) {
      const T = pickFor(r, c, MEAN_THEMES, (t, w) => w.includes(t.topic));
      const n = T.names.length; const mul = T.mul;
      // 막대그래프로 줄 자료인가 (요청한 틀이 그래프면 그래프로 그릴 수 있는 값만)
      const sc = mul === 5 ? { s: 5, lab: 2 } : { s: 2, lab: 5 };
      const wantG = wantOf(c).includes('[bgraph');
      const okG = (vs) => vs.every((v) => v > 0 && v % sc.s === 0 && v / sc.s <= 12);
      // 평균이 자연수, (가장 큰 값 + 가장 작은 값) ÷ 2는 평균과 다르게, 서로 다른 값 셋 이상
      let vals = null;
      for (let t = 0; t < 400 && !vals; t++) {
        const vs = Array.from({ length: n }, () => Math.round(int(r, T.lo, T.hi) / mul) * mul);
        const S = sum(vs); const mr = (Math.max(...vs) + Math.min(...vs)) / 2;
        if (S % n !== 0 || mr === S / n || new Set(vs).size < 3) continue;
        if (wantG && !okG(vs)) continue;
        vals = vs;
      }
      if (!vals) vals = mul === 5 ? [60, 70, 90, 100].slice(0, n) : [2, 4, 6, 12, 6].slice(0, n).map((x) => x * mul);
      const S = sum(vals); const mean = S / n;
      const list = `**${T.names.map((x, i) => `${x} ${nu(vals[i], T.unit)}`).join(' · ')}**`;
      const mr = (Math.max(...vals) + Math.min(...vals)) / 2;
      const zero = vals.includes(0); const nz = vals.filter((v) => v !== 0).length;
      const wr = [{ text: String(S), tag: TAGS.sumOnly }, Number.isInteger(mr) && { text: String(mr), tag: TAGS.midrange },
        zero && Number.isInteger(S / nz) && { text: String(S / nz), tag: TAGS.dropZero }, !zero && Number.isInteger(S / (n - 1)) && { text: String(S / (n - 1)), tag: TAGS.wrongCount }];
      const why = {
        [TAGS.sumOnly]: `${jn(S, '은', '는')} 모두 더한 값이에요. 자료의 수 ${ro(n)} 나눠야 평균이에요.`,
        [TAGS.midrange]: `가장 큰 값과 가장 작은 값만 쓰면 나머지 자료가 빠져요. 모두 더해 ${ro(n)} 나눠요.`,
        [TAGS.dropZero]: `0도 자료예요. ${n}개로 나눠야 해요.`,
        [TAGS.wrongCount]: `자료는 ${n}개예요. ${ro(n)} 나눠요.`,
      };
      const fams = [
        { ans: String(mean), near: mul, wr, why,
          steps: [`모두 더하기: ${vals.join(' + ')} = ${S}`, `자료의 수: ${n}`, `${S} ÷ ${n} = ${nu(mean, T.unit)}`],
          rule: '평균 = (자료를 모두 더한 값) ÷ (자료의 수).',
          pools: { pokemon: [`${T.topic}${josa(T.topic, '이에요', '예요')}.\n\n${list}\n\n${T.noun}의 평균은 몇 ${T.unit}일까요?`] } },
      ];
      if (okG(vals)) {
        fams.push({ ans: String(mean), near: mul, wr: [...wr, Number.isInteger(mean / sc.s) && { text: String(mean / sc.s), tag: TAGS.cellAsOne }], why: { ...why, [TAGS.cellAsOne]: `막대 칸 수의 평균이에요. 한 칸이 ${jn(sc.s, '이니까', '니까')} 값으로 바꿔요.` },
          steps: [`막대의 값: ${vals.join(', ')}`, `${vals.join(' + ')} = ${S}`, `${S} ÷ ${n} = ${nu(mean, T.unit)}`],
          rule: '평균 = (자료를 모두 더한 값) ÷ (자료의 수).',
          pools: { pokemon: [`${T.topic}${josa(T.topic, '을', '를')} 막대그래프로 나타냈어요.\n\n${bg(sc, T.unit, T.names, vals)}\n\n막대를 고르게 하면 막대 하나는 몇 ${T.unit}만큼이 될까요?`] } });
      }
      return finish(this.id, r, c, pickFamily(r, c, fams));
    },
    misread(r, c) {
      const T = pickFor(r, c, MEAN_THEMES, (t, w) => w.includes(t.topic));
      const n = T.names.length;
      if (branchOf(r, c, ['mid', 'zero']) === 'zero') {
        // 0이 하나 든 자료 — 0을 빼고 나눈 값도 자연수
        let vals = null;
        for (let t = 0; t < 400 && !vals; t++) {
          const vs = Array.from({ length: n }, () => int(r, 1, 12) * 2); vs[int(r, 0, n - 1)] = 0;
          const S = sum(vs); if (S % n === 0 && S % (n - 1) === 0 && S > 0) vals = vs;
        }
        if (!vals) vals = n === 4 ? [0, 6, 2, 4] : [0, 8, 4, 6, 2];
        const S = sum(vals);
        const list = T.names.map((x, i) => `${x} ${nu(vals[i], T.unit)}`).join(' · ');
        return finishMis(this.id, 'zero', r, c, {
          q: `${T.topic}: ${list}\n\n${showWork(`0은 빼고 ${n - 1}개로 나눠요 — 평균은 ${S} ÷ ${n - 1} = ${nuj(S / (n - 1), T.unit, '이에요', '예요')}`)}`,
          ok: `0도 자료라서 ${ro(n)} 나눠요 — ${S} ÷ ${n} = ${nu(S / n, T.unit)}`,
          wr: [
            { text: '맞게 말했어요', tag: RIGHT_AS_WRONG },
            { text: '0이 있으면 평균을 구할 수 없어요', tag: OFF },
            { text: `평균은 모두 더한 ${nuj(S, T.unit, '이에요', '예요')}`, tag: TAGS.sumOnly },
          ],
          steps: [`모두 더하기: ${S}`, `자료의 수: ${n}개 (0도 하나)`, `${S} ÷ ${n} = ${S / n}`],
          whyAny: '0을 뺐어요. 0도 그날의 자료라서 자료의 수에 넣어요.',
          rule: '평균 = (자료를 모두 더한 값) ÷ (자료의 수) — 0도 센다.',
          probe: { vals },
        });
      }
      let vals = null;
      for (let t = 0; t < 400 && !vals; t++) {
        const vs = Array.from({ length: n }, () => int(r, 2, 20) * 2);
        const mean = sum(vs) / n; const mr = (Math.max(...vs) + Math.min(...vs)) / 2;
        if (Number.isInteger(mean) && Number.isInteger(mr) && mr !== mean) vals = vs;
      }
      if (!vals) vals = n === 4 ? [10, 12, 14, 32] : [10, 12, 14, 36, 8];
      const mean = sum(vals) / n; const mr = (Math.max(...vals) + Math.min(...vals)) / 2;
      const list = T.names.map((x, i) => `${x} ${nu(vals[i], T.unit)}`).join(' · ');
      return finishMis(this.id, 'mid', r, c, {
        q: `${T.topic}: ${list}\n\n${showWork(`평균은 (가장 큰 값 + 가장 작은 값) ÷ 2 = (${Math.max(...vals)} + ${Math.min(...vals)}) ÷ 2 = ${nuj(mr, T.unit, '이에요', '예요')}`)}`,
        ok: `모두 더해 자료의 수로 나눠요 — ${sum(vals)} ÷ ${n} = ${nu(mean, T.unit)}`,
        wr: [
          { text: '맞게 말했어요', tag: RIGHT_AS_WRONG },
          // "가운데에 있는 값 하나가 평균"은 이 자료에서 참일 때가 있었다(16% — 32·28·22·14·14의 가운데 22 = 평균, Codex 19차 #1).
          // (가장 큰 값 + 가장 작은 값) ÷ 2는 위에서 평균과 다르게 뽑았으니 이 자료에서도 늘 틀린 말이다
          { text: '(가장 큰 값 + 가장 작은 값) ÷ 2는 언제나 평균과 같아요', tag: MIS_OK },
          { text: `평균은 모두 더한 ${nuj(sum(vals), T.unit, '이에요', '예요')}`, tag: TAGS.sumOnly },
        ],
        steps: [`모두 더하기: ${vals.join(' + ')} = ${sum(vals)}`, `${sum(vals)} ÷ ${n} = ${mean}`],
        whyAny: '가장 큰 값과 가장 작은 값만 썼어요. 평균은 자료를 **모두** 더해 자료의 수로 나눠요.',
        rule: '평균 = (자료를 모두 더한 값) ÷ (자료의 수).',
        probe: { vals },
      });
    },
  },
  {
    id: 'dat.meanuse', grade: 5, name: '평균 활용하기', needs: ['dat.mean'],
    idea: '평균을 알면 **합계 = 평균 × 자료의 수**를 구할 수 있어요. 모르는 값 = 합계 − 아는 값들의 합. 사람 수가 다른 두 모둠은 **합이 아니라 평균**으로 비교해요.',
    slip: '먼저 합계 = 평균 × 자료의 수를 구해 봐요.',
    calc(r, c) {
      const units = [{ unit: '점', noun: '점수', what: '시험', verb: '받아야' }, { unit: '번', noun: '기록', what: '줄넘기', verb: '넘어야' }];
      const U = pickFor(r, c, units, (u, w) => w.includes(`${u.what} `));
      // 앞 기록 개수가 열쇠에 든다("#점, #점, #점") — 요청한 틀이면 그 개수로
      const wm = /앞 #번 동안 ([^.]*?)(?:이었어요|였어요)\./.exec(wantOf(c));
      const n = wm ? wm[1].split(', ').length + 1 : int(r, 3, 5); const m = int(r, 6, 18) * 5;
      // 모르는 값 — 앞 n−1번을 정하고 마지막을 맞춘다 (0 이상, 점수면 100 이하)
      let prev = null; let miss = 0;
      for (let t = 0; t < 200 && !prev; t++) {
        const pv = Array.from({ length: n - 1 }, () => int(r, Math.max(1, m / 5 - 4), m / 5 + 4) * 5);
        const ms = m * n - sum(pv);
        if (ms >= 5 && ms <= (U.unit === '점' ? 100 : 150) && ms !== m) { prev = pv; miss = ms; }
      }
      if (!prev) { prev = Array.from({ length: n - 1 }, () => m - 5); miss = m + 5 * (n - 1); }
      // 모둠 비교 — 사람이 많은 모둠이 합은 크고 평균은 작다. 어느 모둠(가·나)이 그쪽인지는 바꿔 낸다
      const aSmall = int(r, 10, 14); const aBig = aSmall + 2;
      const manyIsGa = r() < 0.5;
      const ga = manyIsGa ? { n: 5, avg: aSmall } : { n: 4, avg: aBig };
      const na = manyIsGa ? { n: 4, avg: aBig } : { n: 5, avg: aSmall };
      const winner = ga.avg > na.avg ? '가 모둠' : '나 모둠'; const loser = winner === '가 모둠' ? '나 모둠' : '가 모둠';
      // 평균 올리기
      const k = int(r, 3, 5); const m0 = int(r, 10, 20);
      const fams = [
        { ans: String(m * n), near: 5,
          wr: [{ text: String(m + n), tag: TAGS.addForTimes }, { text: String(m), tag: TAGS.meanAsTotal }, { text: String(m * (n - 1)), tag: TAGS.wrongCount }],
          why: {
            [TAGS.addForTimes]: `평균과 횟수를 더하면 안 돼요. 합계는 평균 × 횟수 = ${m} × ${n}.`,
            [TAGS.meanAsTotal]: `${jn(m, '은', '는')} 한 번의 평균이에요. ${n}번을 모두 더하면 ${m} × ${n}.`,
            [TAGS.wrongCount]: `${n}번이에요 — × ${n}.`,
          },
          steps: ['합계 = 평균 × 자료의 수', `${m} × ${n} = ${nu(m * n, U.unit)}`],
          rule: '합계 = 평균 × 자료의 수.',
          pools: { pokemon: [`{me}의 ${U.what} ${n}번의 ${U.noun} 평균이 ${nuj(m, U.unit, '이에요', '예요')}. ${n}번의 ${jw(U.noun, '을', '를')} 모두 더하면 몇 ${U.unit}일까요?`] } },
        { ans: String(miss), near: 5,
          wr: [{ text: String(m), tag: TAGS.meanAsMissing }, { text: String(m * n), tag: TAGS.totalOnly }, m * (n - 1) - sum(prev) > 0 && { text: String(m * (n - 1) - sum(prev)), tag: TAGS.wrongCount }],
          why: {
            [TAGS.meanAsMissing]: '평균만큼 받는다고 평균이 맞춰지는 게 아니에요 — 앞의 기록에 따라 달라요. 합계부터 구해요.',
            [TAGS.totalOnly]: `${jn(m * n, '은', '는')} ${n}번의 합계예요. 앞 ${n - 1}번의 합을 빼야 해요.`,
            [TAGS.wrongCount]: `합계는 ${n}번 모두의 것 — ${m} × ${n}.`,
          },
          steps: [`${n}번의 합계: ${m} × ${n} = ${m * n}`, `앞 ${n - 1}번의 합: ${prev.join(' + ')} = ${sum(prev)}`, `${m * n} − ${sum(prev)} = ${nu(miss, U.unit)}`],
          rule: '모르는 값 = 평균 × 자료의 수 − 아는 값들의 합.',
          pools: { pokemon: [`{me}의 ${U.what} ${jw(U.noun, '이', '가')} 앞 ${n - 1}번 동안 ${prev.map((v) => nu(v, U.unit)).join(', ')}${josa(U.unit, '이었어요', '였어요')}. ${n}번의 평균이 ${nuj(m, U.unit, '이', '가')} 되려면 ${n}번째에 몇 ${uj(U.unit, '을', '를')} ${U.verb} 할까요?`] } },
        { words: true, ans: winner,
          wr: [{ text: loser, tag: TAGS.sumCompare }, { text: '두 모둠이 같아요', tag: TAGS.equalGuess }],
          why: {
            [TAGS.sumCompare]: `사람이 많은 모둠은 합이 커지기 쉬워요. 평균은 가 ${ga.avg * ga.n} ÷ ${ga.n} = ${ga.avg}, 나 ${na.avg * na.n} ÷ ${na.n} = ${jn(na.avg, '이에요', '예요')}.`,
            [TAGS.equalGuess]: `평균을 구해 보면 ${jn(ga.avg, '과', '와')} ${ro(na.avg)} 달라요.`,
          },
          steps: [`가 모둠: ${ga.avg * ga.n} ÷ ${ga.n} = ${ga.avg}`, `나 모둠: ${na.avg * na.n} ÷ ${na.n} = ${na.avg}`, `평균이 더 큰 것은 ${winner}`],
          rule: '사람 수가 다르면 합이 아니라 평균으로 비교한다.',
          pools: { pokemon: [`나무열매를 가 모둠 ${ga.n}명은 모두 ${ga.avg * ga.n}개, 나 모둠 ${na.n}명은 모두 ${na.avg * na.n}개 모았어요. 한 사람이 모은 나무열매 수의 평균이 더 많은 모둠은 어느 모둠일까요?`] } },
        { ans: String(m0 + k + 1), near: 1,
          wr: [{ text: String(m0 + 1), tag: TAGS.meanAsMissing }, { text: '1', tag: TAGS.diffOnly }, { text: String((m0 + 1) * (k + 1)), tag: TAGS.totalOnly }],
          why: {
            [TAGS.meanAsMissing]: `새 평균만큼만 받으면 평균이 ${m0 + 1}까지 오르지 않아요. 합계로 생각해요.`,
            [TAGS.diffOnly]: `평균이 1 오르려면 ${k + 1}판 모두가 1씩 오른 만큼이 필요해요.`,
            [TAGS.totalOnly]: `${jn((m0 + 1) * (k + 1), '은', '는')} 새 합계예요. 지금까지의 합계 ${jn(m0 * k, '을', '를')} 빼요.`,
          },
          steps: [`지금 합계: ${m0} × ${k} = ${m0 * k}`, `새 합계: ${m0 + 1} × ${k + 1} = ${(m0 + 1) * (k + 1)}`, `${(m0 + 1) * (k + 1)} − ${m0 * k} = ${m0 + k + 1}`],
          rule: '필요한 값 = 새 평균 × 새 자료의 수 − 지금까지의 합계.',
          pools: { pokemon: [`{me}가 게임을 ${k}판 해서 점수 평균이 ${m0}점이에요. 한 판을 더 해서 ${k + 1}판의 평균을 ${m0 + 1}점으로 올리려면 다음 판에 몇 점을 받아야 할까요?`] } },
      ];
      return finish(this.id, r, c, pickFamily(r, c, fams));
    },
    misread(r, c) {
      if (branchOf(r, c, ['total', 'compare']) === 'total') {
        const n = int(r, 3, 5); const m = int(r, 10, 20);
        return finishMis(this.id, 'total', r, c, {
          q: `{me}의 줄넘기 ${n}번 기록의 평균이 ${m}번이에요.\n\n${showWork(`${n}번 기록을 모두 더하면 ${m} + ${n} = ${m + n}번이에요`)}`,
          ok: `합계 = 평균 × 횟수 — ${m} × ${n} = ${m * n}번`,
          wr: [
            { text: '맞게 말했어요', tag: RIGHT_AS_WRONG },
            { text: `합계는 평균과 같은 ${m}번이에요`, tag: TAGS.meanAsTotal },
            { text: '평균만으로는 합계를 알 수 없어요', tag: OFF },
          ],
          steps: ['합계 = 평균 × 자료의 수', `${m} × ${n} = ${m * n}`],
          whyAny: '평균과 횟수를 더했어요. 평균은 고르게 한 값이라 횟수만큼 **곱해야** 합계예요.',
          rule: '합계 = 평균 × 자료의 수.',
          probe: { m, n },
        });
      }
      const aSmall = int(r, 10, 14); const aBig = aSmall + 2;
      return finishMis(this.id, 'compare', r, c, {
        q: `나무열매를 가 모둠 5명은 모두 ${aSmall * 5}개, 나 모둠 4명은 모두 ${aBig * 4}개 모았어요.\n\n${showWork('가 모둠이 더 많이 모았으니까 한 사람이 모은 수의 평균도 가 모둠이 더 많아요')}`,
        ok: `사람 수가 달라서 평균으로 — 가 ${aSmall * 5} ÷ 5 = ${aSmall}, 나 ${aBig * 4} ÷ 4 = ${aBig}, 나 모둠이 더 많아요`,
        wr: [
          { text: '맞게 말했어요', tag: RIGHT_AS_WRONG },
          { text: '두 모둠의 평균은 같아요', tag: TAGS.equalGuess },
          { text: '사람 수가 달라서 비교할 수 없어요', tag: OFF },
        ],
        steps: [`가 모둠 평균: ${aSmall * 5} ÷ 5 = ${aSmall}`, `나 모둠 평균: ${aBig * 4} ÷ 4 = ${aBig}`],
        whyAny: '합은 사람이 많은 모둠이 커지기 쉬워요. 한 사람의 평균을 구해 비교해요.',
        rule: '사람 수가 다르면 합이 아니라 평균으로 비교한다.',
        probe: { aSmall, aBig },
      });
    },
  },
  {
    id: 'dat.chance', grade: 5, name: '일이 일어날 가능성', needs: ['dat.meanuse'],
    idea: '**가능성**은 일이 일어날 것 같은 정도예요. **불가능하다 · ~아닐 것 같다 · 반반이다 · ~일 것 같다 · 확실하다**. 수로는 **불가능 0 · 반반 1/2 · 확실 1**이에요.',
    slip: '꼭 일어나는지, 절대 안 일어나는지, 반반인지부터 봐요.',
    calc(r, c) {
      const SIT = chanceSits(r);
      const w = wantOf(c);
      const S1 = SIT.find((s) => w.includes(tplKey(s.t))) || pick(r, SIT);
      const NUMS = SIT.filter((s) => s.num);
      const S2 = NUMS.find((s) => w.includes(tplKey(s.t))) || pick(r, NUMS);
      const adj = [S1.lv - 1, S1.lv + 1, 4 - S1.lv, S1.lv - 2, S1.lv + 2].filter((i, k, a) => i >= 0 && i <= 4 && i !== S1.lv && a.indexOf(i) === k).slice(0, 3);
      const nv = { '0': 0, '1/2': 2, '1': 4 };
      // 어느 색이 더 잘 나오나
      const ra = int(r, 3, 9); let rb = int(r, 1, 9); if (rb === ra) rb = ra === 9 ? 1 : ra + 1;
      const more = ra > rb ? '빨간 구슬' : '파란 구슬'; const less = ra > rb ? '파란 구슬' : '빨간 구슬';
      const fams = [
        { words: true, ans: LV[S1.lv], wr: adj.map((i) => ({ text: LV[i], tag: chanceTag(S1.lv, i) })),
          why: {
            // 규칙으로 읽혀도 참이게 — "일어나지 않을 수도 있으면 ~일 것 같다"는 반반·~아닐 것 같다까지 덮었다 (Codex 19차 #5)
            [TAGS.likelyAsCertain]: '꼭 일어나는 것만 "확실하다"예요. 일어나지 않을 수도 있지만 일어날 때가 훨씬 많으면 "~일 것 같다"예요.',
            [TAGS.certainAsLikely]: '다른 것이 나올 수 없으면 "확실하다"예요.',
            [TAGS.unlikelyAsImpossible]: '절대 안 일어나는 것만 "불가능하다"예요. 일어날 수는 있지만 안 일어날 때가 훨씬 많으면 "~아닐 것 같다"예요.',
            [TAGS.impossibleAsUnlikely]: '나올 수 있는 것이 하나도 없으면 "불가능하다"예요.',
            [TAGS.evenAsLikely]: '일어날 것과 안 일어날 것이 같은 만큼이면 "반반이다"예요.',
            [TAGS.leanAsEven]: '두 쪽의 수가 달라요 — 많은 쪽으로 기울어요.',
            [TAGS.oppositeChance]: '가능성을 거꾸로 봤어요. 일어날 수 있는 경우를 다시 세어 봐요.',
            [TAGS.farChance]: '일어날 수 있는 경우를 다시 세어 봐요.',
          },
          steps: [`${S1.t.replace(/ 가능성$/, '')} — 나올 수 있는 경우를 세어 봐요`, `→ ${LV[S1.lv]}`],
          rule: '불가능하다 · ~아닐 것 같다 · 반반이다 · ~일 것 같다 · 확실하다.',
          pools: { pokemon: [`${S1.t}${josa(S1.t, '을', '를')} 말로 나타내면 어느 것일까요?`] } },
        { ans: S2.num, wr: [...['0', '1/2', '1'].filter((x) => x !== S2.num).map((x) => ({ text: x, tag: chanceTag(nv[S2.num], nv[x]) })), S2.count && { text: S2.count, tag: TAGS.countAsChance }],
          why: {
            [TAGS.oppositeChance]: '불가능은 0, 확실은 1이에요. 거꾸로 봤어요.',
            [TAGS.farChance]: '불가능 0 · 반반 1/2 · 확실 1 중 어느 것인지 다시 봐요.',
            [TAGS.countAsChance]: '경우의 수를 그대로 썼어요. 가능성은 0부터 1 사이의 수로 나타내요.',
          },
          steps: [`${S2.t.replace(/ 가능성$/, '')} → ${S2.num === '0' ? '불가능하다' : S2.num === '1' ? '확실하다' : '반반이다'}`, `수로 나타내면 ${S2.num}`],
          rule: '불가능 0 · 반반 1/2 · 확실 1.',
          pools: { pokemon: [`${S2.t}${josa(S2.t, '을', '를')} 수로 나타내면 얼마일까요?`] } },
        { words: true, ans: more, wr: [{ text: less, tag: TAGS.fewerAsLikely }, { text: '두 색이 같아요', tag: TAGS.equalGuess }],
          why: { [TAGS.fewerAsLikely]: '구슬이 **많은** 색이 꺼낼 가능성이 더 높아요.', [TAGS.equalGuess]: `빨간 구슬 ${ra}개, 파란 구슬 ${rb}개 — 수가 달라요.` },
          steps: [`빨간 구슬 ${ra}개, 파란 구슬 ${rb}개`, `더 많은 것: ${more}`],
          rule: '많이 들어 있는 것일수록 꺼낼 가능성이 높다.',
          pools: { pokemon: [`빨간 구슬 ${ra}개와 파란 구슬 ${rb}개가 들어 있는 주머니에서 구슬 하나를 꺼내요. 꺼낼 가능성이 더 높은 것은 어느 것일까요?`] } },
      ];
      return finish(this.id, r, c, pickFamily(r, c, fams));
    },
    misread(r, c) {
      if (branchOf(r, c, ['likely', 'count']) === 'likely') {
        const a = int(r, 6, 12); const b = int(r, 1, 2);
        return finishMis(this.id, 'likely', r, c, {
          q: `빨간 구슬 ${a}개와 파란 구슬 ${b}개가 들어 있는 주머니에서 구슬 하나를 꺼내요.\n\n${showWork('빨간 구슬이 나오는 것은 확실해요')}`,
          ok: '파란 구슬이 나올 수도 있어요 — 빨간 구슬이 나올 가능성은 "~일 것 같다"예요',
          wr: [
            { text: '맞게 말했어요', tag: RIGHT_AS_WRONG },
            { text: '빨간 구슬이 나오는 것은 불가능해요', tag: TAGS.oppositeChance },
            { text: '구슬을 꺼내기 전에는 아무것도 알 수 없어요', tag: OFF },
          ],
          steps: [`파란 구슬도 ${b}개 있어요 → 꼭 빨간 구슬은 아니에요`, '→ ~일 것 같다'],
          whyAny: '"확실하다"는 다른 것이 나올 수 없을 때만이에요. 파란 구슬이 하나라도 있으면 확실하지 않아요.',
          rule: '꼭 일어나는 것만 "확실하다".',
          probe: { a, b },
        });
      }
      const f = pick(r, [6, 8, 10]);
      return finishMis(this.id, 'count', r, c, {
        q: `1부터 ${f}까지의 수 카드 ${f}장 중 한 장을 뽑아요.\n\n${showWork(`짝수 카드가 ${f / 2}장이니까 짝수가 나올 가능성을 수로 나타내면 ${jn(f / 2, '이에요', '예요')}`)}`,
        ok: '가능성은 0부터 1 사이의 수 — 짝수와 홀수가 같은 수라서 반반, 1/2이에요',
        wr: [
          { text: '맞게 말했어요', tag: RIGHT_AS_WRONG },
          { text: '짝수는 확실히 나와서 1이에요', tag: TAGS.evenAsLikely },
          { text: '카드는 뽑아 봐야 알아서 수로 나타낼 수 없어요', tag: OFF },
        ],
        steps: [`짝수 ${f / 2}장, 홀수 ${f / 2}장 → 반반이다`, '반반을 수로 → 1/2'],
        whyAny: `경우의 수 ${jn(f / 2, '을', '를')} 그대로 썼어요. 가능성은 불가능 0부터 확실 1 사이의 수예요.`,
        rule: '불가능 0 · 반반 1/2 · 확실 1.',
        probe: { f },
      });
    },
  },
  {
    id: 'dat.percent', grade: 6, name: '띠그래프와 원그래프', needs: ['dat.chance'],
    idea: '띠그래프·원그래프는 전체를 **100%**로 보고 각 부분이 몇 %인지 보여 줘요. 모든 부분을 더하면 **100%**. **부분의 양 = 전체 × 백분율 ÷ 100**.',
    slip: '모든 부분을 더하면 100%인지 먼저 확인해요.',
    calc(r, c) {
      const T = pickFor(r, c, PCT_THEMES, (t, w) => w.includes(t.topic));
      const n = T.labels.length;
      const kind = pickFor(r, c, ['band', 'pie'], (k, w) => w.includes(`[${k} `));
      const name = kind === 'band' ? '띠그래프' : '원그래프';
      const ps = pctSet(r, n) || [35, 30, 20, 15];
      // 몇 명 더 많은가 — 두 항목이 열쇠에 든다(요청이 오면 그 둘), 앞 항목의 %가 더 크게 값을 바꿔 둔다.
      // ("몇 배"는 네 항목의 합이 100이고 정수 배라는 조건이 답을 늘 4배로 몰아서 뺐다)
      const tp = []; for (const a of T.labels) for (const b of T.labels) if (a !== b) tp.push([a, b]);
      const [A, B] = tp.find(([a, b]) => wantOf(c).includes(`${T.cnt(a)}은 ${T.cnt(b)}보다`)) || pick(r, tp);
      const ia = T.labels.indexOf(A); const ib = T.labels.indexOf(B);
      if (ps[ia] < ps[ib]) [ps[ia], ps[ib]] = [ps[ib], ps[ia]];
      const ai = askIdx(c, kind);
      const X = ai >= 0 && ai < n ? T.labels[ai] : pickLabel(r, c, T, T.labels); const xi = T.labels.indexOf(X); const p = ps[xi];
      const fig = (q) => `[${kind} ${T.labels.map((l, i) => `${l}:${i === q ? '?' : ps[i]}`).join(' ')}]`;
      const head = (q) => `${T.topic}${josa(T.topic, '을', '를')} 조사하여 ${jw(name, '으로', '로')} 나타냈어요.\n\n${fig(q)}\n\n`;
      const others = ps.filter((_, i) => i !== xi);
      const N = pick(r, [20, 40, 60, 80, 100, 200]); const cnt = (N * p) / 100;
      const dab = (N * (ps[ia] - ps[ib])) / 100;
      const fams = [
        { ans: `${p}%`, near: 5,
          wr: [{ text: `${sum(others)}%`, tag: TAGS.restAsPart }, { text: `${100 - sum(others) + others[others.length - 1]}%`, tag: TAGS.dropOne }],
          why: {
            [TAGS.restAsPart]: `${jn(sum(others), '은', '는')} 나머지를 모두 더한 것이에요. 100에서 빼야 ${X}의 몫이에요.`,
            [TAGS.dropOne]: `나머지 ${others.length}개를 모두 빼야 해요 — 100 − (${others.join(' + ')}).`,
          },
          steps: [`나머지의 합: ${others.join(' + ')} = ${sum(others)}`, `100 − ${sum(others)} = ${p}`, `${X}: ${p}%`],
          rule: '모든 부분을 더하면 100%.',
          pools: { pokemon: [`${head(xi)}${jw(X, '은', '는')} 전체의 몇 %일까요?`] } },
        { ans: String(cnt), near: 1,
          wr: [cnt !== p && { text: String(p), tag: TAGS.pctAsCount }, { text: String(N - cnt), tag: TAGS.restCount }, { text: String((N * p) / 10), tag: TAGS.wrongDiv }],
          why: {
            [TAGS.pctAsCount]: `${p}%는 사람 수가 아니라 전체 중의 비율이에요. ${N} × ${p} ÷ 100.`,
            [TAGS.restCount]: `나머지 학생 수를 구했어요 — ${N} − ${cnt}. 물은 것은 ${T.cnt(X)}이에요.`,
            [TAGS.wrongDiv]: '백분율은 100에 대한 비율이에요. 10이 아니라 100으로 나눠요.',
          },
          steps: [`전체 ${N}명의 ${p}%`, `${N} × ${p} ÷ 100 = ${cnt}`, `${cnt}명`],
          rule: '부분의 양 = 전체 × 백분율 ÷ 100.',
          pools: { pokemon: [`${head(-1)}조사한 학생이 모두 ${N}명이라면 ${T.cnt(X)}은 몇 명일까요?`] } },
        { ans: String(dab), near: 1,
          wr: [{ text: String(ps[ia] - ps[ib]), tag: TAGS.pctAsCount }, { text: String((N * (ps[ia] + ps[ib])) / 100), tag: TAGS.addForDiff }, { text: String((N * (ps[ia] - ps[ib])) / 10), tag: TAGS.wrongDiv }],
          why: {
            [TAGS.pctAsCount]: `${ps[ia]}%와 ${ps[ib]}%의 차 ${jn(ps[ia] - ps[ib], '을', '를')} 그대로 사람 수로 썼어요. 사람 수로 바꾸려면 ${N} × ${ps[ia] - ps[ib]} ÷ 100.`,
            [TAGS.addForDiff]: '몇 명 더 많은지는 두 수를 **빼요**.',
            [TAGS.wrongDiv]: '백분율은 100에 대한 비율이에요. 10이 아니라 100으로 나눠요.',
          },
          steps: [`${A} ${ps[ia]}%, ${B} ${ps[ib]}% — 차는 ${ps[ia] - ps[ib]}%`, `${N} × ${ps[ia] - ps[ib]} ÷ 100 = ${dab}`, `${dab}명 더 많아요`],
          rule: '부분의 양 = 전체 × 백분율 ÷ 100 — 차도 같은 방법으로.',
          pools: { pokemon: [`${head(-1)}조사한 학생이 모두 ${N}명이라면 ${T.cnt(A)}은 ${T.cnt(B)}보다 몇 명 더 많을까요?`] } },
      ];
      return finish(this.id, r, c, pickFamily(r, c, fams));
    },
    misread(r, c) {
      const T = pickFor(r, c, PCT_THEMES, (t, w) => w.includes(t.topic));
      const n = T.labels.length;
      const ps = pctSet(r, n) || [35, 30, 20, 15];
      if (branchOf(r, c, ['pct', 'sum']) === 'pct') {
        const N = pick(r, [20, 40, 60]); const xi = int(r, 0, n - 1); const X = T.labels[xi]; const p = ps[xi];
        return finishMis(this.id, 'pct', r, c, {
          q: `${T.topic}${josa(T.topic, '을', '를')} 조사하여 원그래프로 나타냈어요. 조사한 학생은 ${N}명이에요.\n\n[pie ${T.labels.map((l, i) => `${l}:${ps[i]}`).join(' ')}]\n\n${showWork(`${T.cnt(X)}은 ${p}명이에요`)}`,
          ok: `${p}%는 비율이에요 — ${N} × ${p} ÷ 100 = ${(N * p) / 100}명`,
          wr: [
            { text: '맞게 말했어요', tag: RIGHT_AS_WRONG },
            { text: `${N}명 중 ${p}%니까 ${N - p}명이에요`, tag: TAGS.restCount },
            { text: '원그래프로는 학생 수를 알 수 없어요', tag: OFF },
          ],
          steps: [`${X}: 전체의 ${p}%`, `${N} × ${p} ÷ 100 = ${(N * p) / 100}`],
          whyAny: `백분율을 그대로 사람 수로 읽었어요. 전체 ${N}명에 ${p}%를 곱해야 해요.`,
          rule: '부분의 양 = 전체 × 백분율 ÷ 100.',
          probe: { N, p },
        });
      }
      const ask = n - 1; const known = ps.slice(0, n - 1); const shown = 100 - sum(known.slice(0, -1));
      return finishMis(this.id, 'sum', r, c, {
        q: `${T.topic}${josa(T.topic, '을', '를')} 조사하여 띠그래프로 나타냈어요.\n\n[band ${T.labels.map((l, i) => `${l}:${i === ask ? '?' : ps[i]}`).join(' ')}]\n\n${showWork(`${jw(T.labels[ask], '은', '는')} 100 − (${known.slice(0, -1).join(' + ')}) = ${shown}%예요`)}`,
        ok: `나머지를 모두 빼요 — 100 − (${known.join(' + ')}) = ${ps[ask]}%`,
        wr: [
          { text: '맞게 말했어요', tag: RIGHT_AS_WRONG },
          { text: `나머지를 모두 더한 ${sum(known)}%예요`, tag: TAGS.restAsPart },
          { text: '띠그래프는 더해서 100이 안 될 수도 있어요', tag: MIS_OK },
        ],
        steps: ['모든 부분의 합은 100%', `100 − (${known.join(' + ')}) = ${ps[ask]}`],
        whyAny: `나머지 하나(${known[known.length - 1]}%)를 빠뜨렸어요. 띠그래프의 부분을 모두 더하면 100%예요.`,
        rule: '모든 부분을 더하면 100%.',
        probe: { ps },
      });
    },
  },
];

export function conceptById(id) {
  return DATA.find((c) => c.id === id) || null;
}

// ───────────────────── 문항 만들기 (mathcor·mathshape와 같은 모양) ─────────────────────

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
const SLIP = '한 번 더 천천히 — 눈금 한 칸이 얼마인지부터 다시 봐요.';

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
  return diagnosticOf(DATA, makeQuestion, seed, n, opts);
}
export function placeFrom(answers) {
  return placeFromOf(DATA, answers);
}
export function ladder(doneIds) {
  return ladderOf(DATA, doneIds);
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
 * coach/math/data.json 형식 검사 — mathcor.checkContent와 같은 규칙
 * @returns {string[]}
 */
export function checkContent(content) {
  const bad = [];
  for (const c of DATA) {
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
