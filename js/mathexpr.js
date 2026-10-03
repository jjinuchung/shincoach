// ✏️ 수학 — D 문자와 식 줄기 (중1 「문자의 사용과 식」): 개념 사다리 + 문제 생성기 + 내용 형식 검사. 순수 함수만 — 화면 없음 (node 테스트에서 그대로 돈다).
//
// 왜 이 줄기인가 (2026-10-03, 아버님 "D 문자와 식 먼저 가고 다음에 일차방정식 가자" → 설계안 "이대로 진행하자"): 처음부터 D 자리를 비워 둔 줄기.
// H 규칙과 대응의 □·△ 식이 문자가 되고, E 음수가 계수·대입에 다시 나온다. 다음 줄기 일차방정식의 바탕.
// 범위: 2022 성취기준 [9수02-01] 다양한 상황을 문자를 사용한 식으로 나타내고 식의 값을 구한다 · [9수02-02] 일차식의 덧셈과 뺄셈
//   (용어: 대입·다항식·항·단항식·상수항·계수·차수·일차식·동류항 · "지나치게 복잡한 계산은 다루지 않음")
//
// 오답은 아이가 실제로 하는 틀린 생각 흉내다:
//   · 곱할 것을 더함 · 빼는 순서를 바꿈 · 거리 = 속력 ÷ 시간 · 백분율을 100으로 안 나눔 · 괄호를 빠뜨림
//   · 수를 문자 뒤에(x5) · 같은 문자의 곱을 2배로(a × a = 2a) · × (−3)을 빼기로 · ÷를 뒤집음(x ÷ 3 = 3/x) · ×를 먼저
//   · 2x에 3을 넣어 23 · 음수를 괄호 없이 넣음 · −3² = −9 · 계수에서 부호를 뺌 · x²·1/x도 일차식
//   · 괄호 안 첫째 항에만 곱함 · −를 곱할 때 둘째 항 부호를 그대로 · 3x + 2 = 5x · x와 x²을 동류항으로
//   · 괄호 앞 −를 첫째 항에만 · 분수 꼴 일차식에서 분자끼리·분모끼리 더함 · 거꾸로 할 때 또 뺌
//
// 새 줄기의 함정(메모 stem-generator-pitfalls)을 처음부터:
//   · 가족 = 틀 여러 개, 틀마다 수를 미리 뽑아 둔다 — 🔁 쌍둥이가 요청한 틀(tplKey)로 온다
//   · ★ tplKey는 숫자만 지운다 → 틀마다 문자(x·a)·부호(+·−)·계수 1 여부를 고정한다. 식 모양이 바뀌면 다른 틀이 된다
//   · ★ 식 바로 뒤에 조사를 붙이지 않는다("**2x − 3**을" → 숫자 조사가 바뀌어 열쇠가 갈린다) — 줄을 바꾸거나 "일 때"
//   · 수 답은 숫자판(음수·분수), 식 답은 보기 고르기 · 틀린 방법이 우연히 맞는 값은 뽑지 않는다 — 오답끼리도 서로 다르게 (probe.allWrong)
//   · 아직 안 배운 말: 생략(D2) → 식의 값·대입(D4) → 항·상수항·계수·차수·다항식·일차식(D5) → 분배법칙(D6) → 동류항(D7)
// ★ 정답·오답은 테스트가 **문제 글을 따로 읽어** 다항식으로 다시 계산한다 (tests/mathexpr.test.js).

import { rng, shuffle, fill, castOf, worldPick, ask, solve, int, pick, pickFamily, humanQuestion, checkHuman, diagnosticOf, placeFromOf, ladderOf } from './mathgen.js';
import { gradeLabel } from './mathmix.js';

export { gradeLabel };

// ───────────────────── 식 쓰기 ─────────────────────

const M = '−'; // U+2212 — E 음수 줄기와 같은 글자
/** 수 → 글자 (음수는 −) */
export const num = (v) => (v < 0 ? M + Math.abs(v) : String(v));
/** 항 하나 — 계수 c, 문자 부분 v('' = 수). 1·−1은 쓰지 않는다 */
export function term(c, v) {
  if (!v) return num(c);
  if (c === 1) return v;
  if (c === -1) return M + v;
  return num(c) + v;
}
/** 여러 항 [[계수, 문자], …] → "3x − 2y + 1" (0인 항은 뺀다) */
export function poly(terms) {
  const t = terms.filter(([c]) => c !== 0);
  if (!t.length) return '0';
  return t.map(([c, v], i) => (i === 0 ? term(c, v) : c < 0 ? ` ${M} ${term(-c, v)}` : ` + ${term(c, v)}`)).join('');
}
/** 일차식 ax + b */
export const lin = (a, b, v = 'x') => poly([[a, v], [b, '']]);

// ───────────────────── 조사 ─────────────────────

const BAT = new Set(['0', '1', '3', '6', '7', '8']);
/** 수 글자 + 조사 (읽는 소리로 — 음수는 "마이너스 삼"이라 끝자리가 같다) */
function jn(t, withB, without) {
  const s = String(t); const d = s.replace(/[^\d]+$/, '').slice(-1);
  return s + (BAT.has(d) ? withB : without);
}
const JOSA = [['을', '를'], ['은', '는'], ['이', '가'], ['과', '와'], ['이에요', '예요'], ['이니까', '니까'], ['이라서', '라서']];
/**
 * 글 전체의 조사를 앞 글자 소리에 맞춘다 — 수는 끝자리 읽는 소리, 문자 x·y·a·b는 받침 없음(엑스·와이·에이·비), ²은 "제곱"이라 받침.
 * 틀마다 수가 바뀌어 조사가 따라 바뀌므로 문항을 내보내는 두 곳(calcAsk·misAsk)에서 한 번에 고친다 (틀 글에 jn을 흩뿌리면 빠뜨린다)
 */
function jfix(text) {
  let s = String(text);
  for (const [wb, nb] of JOSA) {
    const after = '(?=[\\s.,!?)—*]|$)'; // ** 앞도 — ② 보여 준 말(굵게) 끝의 "27예요**" (Q 1단계에서 샘)
    s = s.replace(new RegExp(`(\\d)(${wb}|${nb})${after}`, 'g'), (_, d) => d + (BAT.has(d) ? wb : nb));
    s = s.replace(new RegExp(`([a-z])(${wb}|${nb})${after}`, 'g'), (_, ch) => ch + nb);
    s = s.replace(new RegExp(`(²)(${wb}|${nb})${after}`, 'g'), (_, ch) => ch + wb);
  }
  // (으)로 — ㄹ 받침(1·7·8)은 "로"
  return s.replace(/(\d)(으로|로)(?=[\s.,*]|$)/g, (_, d) => d + (['1', '7', '8'].includes(d) ? '로' : BAT.has(d) ? '으로' : '로'));
}

// ───────────────────── 보기 ─────────────────────

/** 보기 글자 → 값 (수 하나·분수 하나일 때만 — 식은 null) */
export function valueOf(text) {
  const s = String(text == null ? '' : text).trim().replace(M, '-');
  let m;
  if ((m = /^(-?)(\d+)\/(\d+)$/.exec(s))) return (m[1] ? -1 : 1) * (+m[2] / +m[3]);
  return /^-?\d+(\.\d+)?$/.test(s) ? Number(s) : null;
}
const sameValue = (a, b) => a !== null && b !== null && Math.abs(a - b) < 1e-9;
/** 정답 근처의 "계산 실수" — 정수 답만, 보기가 모자랄 때만 */
function nearOf(answer, k) {
  const v = valueOf(answer);
  if (v === null || !Number.isInteger(v)) return '';
  return num(v + [1, -1, 2, -2, 3, -3, 5, -5][k % 8]);
}
/** 수 보기 4개 — 정답 + 오개념 오답 (음수도 된다). 글자·값이 같은 보기는 넣지 않는다 */
function choices(r, answer, wrongs) {
  const list = [{ text: String(answer), ok: true }];
  const vals = [valueOf(answer)];
  const seen = new Set([String(answer)]);
  const dup = (t) => { const v = valueOf(t); return seen.has(String(t)) || (v !== null && vals.some((x) => sameValue(x, v))); };
  const add = (t, tag) => { seen.add(String(t)); vals.push(valueOf(t)); list.push({ text: String(t), ok: false, tag }); };
  for (const w of wrongs) {
    if (!w || w.text === undefined || w.text === '' || valueOf(w.text) === null || dup(w.text) || list.length >= 4) continue;
    add(w.text, w.tag);
  }
  for (let k = 0; list.length < 4 && k < 30; k++) {
    const alt = nearOf(answer, k);
    if (alt && !dup(alt)) add(alt, '계산 실수');
  }
  return shuffle(r, list);
}
/** 식·문장 보기 — 근처 수로 채우지 않는다 */
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
/** 글자가 모두 다른가 (정답과 오답들) */
const allDiffText = (...ts) => new Set(ts.map(String)).size === ts.length;
/** 값이 모두 다른가 */
const allDiff = (...vals) => new Set(vals.map((v) => String(v))).size === vals.length;

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
  // D1 문자를 사용한 식
  addForMul: '곱해야 할 것을 더함',
  divForMul: '곱해야 할 것을 나눔',
  subSwap: '빼는 순서를 바꿈',
  dropCount: '개수를 곱하지 않음',
  speedDiv: '거리를 구할 때 나눔',
  timeMul: '걸리는 시간을 구할 때 곱함',
  divSwap: '나누는 순서를 바꿈',
  pctWhole: '백분율을 100으로 나누지 않음',
  pctFlip: '백분율을 뒤집어 씀',
  halfPerim: '둘레의 반만 셈',
  perimArea: '둘레를 넓이로 봄',
  noParen: '괄호를 빠뜨림',
  mulForDiv: '나눠야 할 것을 곱함',
  // D2 곱셈 기호
  numAfter: '수를 문자 뒤에 씀',
  keepOrder: '기호만 지우고 순서를 그대로 둠',
  mulAsAdd: '곱셈을 덧셈으로 봄',
  powAsMul: '같은 문자의 곱을 2배로 봄',
  powOnce: '같은 문자를 한 번만 씀',
  signDrop: '음수의 부호를 빠뜨림',
  mulAsSub: '음수를 곱하는 것을 빼기로 봄',
  parenFirst: '괄호 안의 앞 문자에만 곱함',
  // D3 나눗셈 기호
  flip: '나누는 수와 나뉘는 수를 바꿈',
  divAsMul: '나눗셈을 곱셈으로 봄',
  noParenDiv: '괄호를 빼고 뒤의 수만 나눔',
  mulDivOrder: '앞에서부터 하지 않고 ×를 먼저 함',
  // D4 식의 값
  concat: '곱하지 않고 수를 나란히 붙임',
  noParenSub: '음수를 괄호 없이 넣어 빼기가 됨',
  negPow: '음수의 제곱을 음수로 봄',
  subNeg: '음수를 빼는데 더하지 않음',
  // D5 다항식과 일차식
  coefSign: '계수에서 부호를 뺌',
  otherCoef: '다른 문자의 계수를 답함',
  constSign: '상수항에서 부호를 뺌',
  coefAsConst: '계수를 상수항으로 봄',
  oneAsZero: '보이지 않는 계수 1을 0으로 봄',
  termAsDeg: '항의 개수를 차수로 봄',
  coefAsDeg: '계수를 차수로 봄',
  squareLinear: '차수가 2인 항이 있어도 일차식이라고 봄',
  denomVar: '분모에 문자가 있어도 일차식이라고 봄',
  prodLinear: '두 문자의 곱이 있어도 일차식이라고 봄',
  denomAsCoef: '분모를 계수로 봄',
  denomDrop: '분모를 빼고 계수를 1로 봄',
  wrongReason: '틀린 까닭을 잘못 앎',
  // D6 일차식과 수의 곱셈·나눗셈
  concatNum: '두 수를 곱하지 않고 나란히 붙임',
  distribFirst: '괄호 안의 첫째 항에만 곱함',
  signKeep: '음수를 곱할 때 둘째 항의 부호를 그대로 둠',
  divFirst: '첫째 항만 나눔',
  // D7 동류항
  powLike: '차수가 달라도 동류항이라고 봄',
  coefLike: '계수가 같으면 동류항이라고 봄',
  constLike: '수만 같아도 동류항이라고 봄',
  mulVar: '더하면서 문자끼리 곱함',
  dropVar: '계산하면서 문자를 빠뜨림',
  constWithX: '상수항까지 문자와 더함',
  minusX: 'x를 빼면 x가 사라진다고 봄',
  dropConst: '상수항을 빠뜨림',
  minusAsPlus: '빼기를 더하기로 봄',
  // D8 일차식의 덧셈과 뺄셈
  minusFirst: '괄호 앞 −를 첫째 항에만 적용함',
  minusDrop: '괄호 앞 −를 빠뜨림',
  // D9 활용
  invSub: '거꾸로 할 때 또 뺌',
  numerAdd: '분자끼리, 분모끼리 더함',
  noLCD: '통분할 때 분자에 곱하지 않음',
  allFour: '겹치는 것까지 따로 셈',
  dropStart: '처음 하나를 빠뜨림',
};

// ───────────────────── 가족·틀 (variant) — mathsolid와 같은 모양 ─────────────────────

function famOf(variants) {
  return { variants, pools: { pokemon: variants.map((x) => x.t) } };
}
function runFamily(r, c, fams) {
  const f = pickFamily(r, c, fams);
  const t = worldPick(r, c, f.pools);
  return f.variants.find((x) => x.t === t) || f.variants[0];
}
/** 고른 틀로 ① 문항 만들기 — v: { t, ans, wr, steps, why, whyAny, rule, text(식·문장 보기), probe } */
function calcAsk(r, c, concept, v) {
  const chs = v.text ? textChoices(r, v.ans, v.wr) : choices(r, v.ans, v.wr);
  const why = Object.fromEntries(Object.entries(v.why || {}).map(([k, t]) => [k, jfix(t)]));
  return {
    ...ask(concept.id, 'calc', jfix(fill(v.t, c)), chs, {
      solve: solve(v.steps.map((s, i) => step(i, jfix(s))), { why, whyAny: jfix(v.whyAny || ''), rule: v.rule || concept.rule }),
    }),
    probe: { ...(v.probe || {}), allWrong: v.wr.map((w) => ({ text: String(w.text), tag: w.tag })) },
  };
}
/** ② 문항 — m: { q, ok, wr, steps, whyAny, rule, probe } */
function misAsk(r, c, concept, branch, m) {
  const F = (t) => jfix(fill(t, c));
  const chs = textChoices(r, F(m.ok), m.wr.map((w) => ({ ...w, text: F(w.text) })));
  return {
    ...ask(concept.id, 'misread', F(m.q), chs, { solve: solve(m.steps.map((t, i) => step(i, F(t))), { whyAny: F(m.whyAny), rule: m.rule || concept.rule }) }),
    key: `misread:${branch}`,
    probe: m.probe || null,
  };
}
/** 조건에 맞을 때까지 다시 뽑기 */
function draw(gen, ok) {
  for (let k = 0; k < 400; k++) { const v = gen(); if (ok(v)) return v; }
  throw new Error('draw: 조건에 맞는 수를 못 뽑음');
}
const OMIT_MUL = '곱셈 기호 ×를 생략하여 나타내면 어느 것일까요?';
const OMIT_DIV = '나눗셈 기호 ÷를 생략하여 나타내면 어느 것일까요?';
const OMIT_BOTH = '곱셈 기호와 나눗셈 기호를 생략하여 나타내면 어느 것일까요?';
const CALC = '계산하면 어느 것일까요?';
const FORMULA = '식으로 나타내면 어느 것일까요?';

// ───────────────────── 개념 사다리 (D. 문자와 식 줄기) ─────────────────────

export const EXPR = [
  {
    id: 'exp.write', grade: 7, name: '문자를 사용한 식', needs: [],
    idea: '수 대신 **문자**(x, y, a, b …)를 써서 아직 모르는 수나 바뀌는 수를 나타낼 수 있어요. 한 개에 x원인 지우개 3개는 **x × 3**원, 5000원을 내고 받는 거스름돈은 **5000 − x × 3**원처럼 상황을 말 그대로 식으로 써요. 규칙과 대응에서 □·△로 쓰던 자리에 문자를 쓴 거예요.',
    rule: '말을 그대로 식으로 — 몇 개씩 몇 묶음은 ×, 남은 것은 −, 똑같이 나누면 ÷.',
    slip: '곱할지 더할지, 무엇에서 무엇을 빼는지 말로 먼저 해 봐요.',
    calc(r, c) {
      const fams = [];
      // 값 × 개수
      fams.push(famOf([
        (() => { const n = int(r, 3, 9); return { t: `한 개에 x원인 지우개를 ${n}개 샀어요.\n\n낸 돈은 모두 몇 원인지 ${FORMULA}`, text: true, ans: `x × ${n}`, wr: [{ text: `x + ${n}`, tag: TAGS.addForMul }, { text: `x ÷ ${n}`, tag: TAGS.divForMul }], steps: [`한 개에 x원씩 ${n}개 — x를 ${n}번 더한 것과 같아요`, `x × ${n} (원)`], why: { [TAGS.addForMul]: `${n}개를 사면 x원이 ${n}번 — 곱해요.`, [TAGS.divForMul]: '나누면 한 개 값보다 작아져요. 여러 개 값은 곱해요.' }, probe: { ask: 'price', n } }; })(),
        (() => { const n = int(r, 3, 9); return { t: `한 봉지에 사탕이 ${n}개씩 들어 있어요.\n\n봉지 a개에 든 사탕은 모두 몇 개인지 ${FORMULA}`, text: true, ans: `${n} × a`, wr: [{ text: `${n} + a`, tag: TAGS.addForMul }, { text: `a ÷ ${n}`, tag: TAGS.divForMul }], steps: [`한 봉지에 ${n}개씩 a봉지`, `${n} × a (개)`], why: { [TAGS.addForMul]: `${n}개씩 a묶음 — 곱해요.`, [TAGS.divForMul]: '똑같이 나누는 상황이 아니에요. 묶음이 a개면 곱해요.' }, probe: { ask: 'bags', n } }; })(),
      ]));
      // 거스름돈
      fams.push(famOf([
        (() => { const n = int(r, 2, 5); const P = pick(r, [5000, 10000]); return { t: `{me/이/가} ${P}원을 내고 한 권에 a원인 공책을 ${n}권 샀어요.\n\n거스름돈은 몇 원인지 ${FORMULA}`, text: true, ans: `${P} − a × ${n}`, wr: [{ text: `a × ${n} − ${P}`, tag: TAGS.subSwap }, { text: `${P} − a`, tag: TAGS.dropCount }], steps: [`공책 값은 a × ${n}원`, `낸 돈에서 공책 값을 빼요 → ${P} − a × ${n} (원)`], why: { [TAGS.subSwap]: '낸 돈에서 공책 값을 빼야 해요 — 순서가 거꾸로예요.', [TAGS.dropCount]: `공책은 ${n}권 — 한 권 값만 뺐어요.` }, probe: { ask: 'change', n, P } }; })(),
      ]));
      // 거리·시간
      fams.push(famOf([
        (() => { const v = int(r, 4, 9) * 10; return { t: `자동차가 한 시간에 ${v} km씩 x시간 동안 달렸어요.\n\n달린 거리는 몇 km인지 ${FORMULA}`, text: true, ans: `${v} × x`, wr: [{ text: `${v} ÷ x`, tag: TAGS.speedDiv }, { text: `${v} + x`, tag: TAGS.addForMul }], steps: [`한 시간에 ${v} km씩 x시간`, `${v} × x (km)`], why: { [TAGS.speedDiv]: `한 시간마다 ${v} km씩 늘어나요 — 곱해요.`, [TAGS.addForMul]: `x시간 동안 ${v} km가 x번 — 곱해요.` }, probe: { ask: 'dist', v } }; })(),
        (() => { const v = int(r, 4, 9) * 10; return { t: `y km인 길을 한 시간에 ${v} km씩 가요.\n\n걸리는 시간은 몇 시간인지 ${FORMULA}`, text: true, ans: `y ÷ ${v}`, wr: [{ text: `y × ${v}`, tag: TAGS.timeMul }, { text: `${v} ÷ y`, tag: TAGS.divSwap }], steps: [`한 시간에 ${v} km씩 — y km에 ${v} km가 몇 번 들어가는지`, `y ÷ ${v} (시간)`], why: { [TAGS.timeMul]: `y × ${v}은 한 시간에 ${v} km씩 y시간 동안 간 거리예요 — 걸리는 시간은 y km 안에 ${v} km가 몇 번 들어가는지 나눠요.`, [TAGS.divSwap]: `y km 안에 ${v} km가 몇 번 — y를 ${v}로 나눠요.` }, probe: { ask: 'time', v } }; })(),
      ]));
      // 백분율
      fams.push(famOf([
        (() => { const p = pick(r, [10, 20, 30, 40, 60, 70, 80, 90]); return { t: `정가가 a원인 옷을 ${p} % 할인했어요.\n\n할인한 금액은 몇 원인지 ${FORMULA}`, text: true, ans: `a × ${p}/100`, wr: [{ text: `a × ${p}`, tag: TAGS.pctWhole }, { text: `a × 100/${p}`, tag: TAGS.pctFlip }], steps: [`${p} %는 ${p}/100`, `a원의 ${p} % → a × ${p}/100 (원)`], why: { [TAGS.pctWhole]: `${p}를 그대로 곱하면 정가보다 커져요 — ${p} %는 ${p}/100.`, [TAGS.pctFlip]: `${p} %는 100분의 ${p} — 분모가 100, 분자가 ${p}.` }, probe: { ask: 'pct', p }, rule: '백분율만큼은 정가 × (백분율 ÷ 100) — 백분율을 100으로 나눠 곱해요.' }; })(),
      ]));
      // 둘레·평균 (괄호)
      fams.push(famOf([
        (() => { const n = int(r, 3, 9); return { t: `가로가 x cm, 세로가 ${n} cm인 직사각형이 있어요.\n\n둘레는 몇 cm인지 ${FORMULA}`, text: true, ans: `(x + ${n}) × 2`, wr: [{ text: `x + ${n}`, tag: TAGS.halfPerim }, { text: `x × ${n}`, tag: TAGS.perimArea }, { text: `x + ${n} × 2`, tag: TAGS.noParen }], steps: [`가로와 세로를 더하면 둘레의 반 — x + ${n}`, `둘레는 그 두 배 → (x + ${n}) × 2 (cm)`], why: { [TAGS.halfPerim]: '가로 하나, 세로 하나만 더했어요. 둘레는 그 두 배예요.', [TAGS.perimArea]: '가로 × 세로는 넓이예요.', [TAGS.noParen]: `괄호가 없으면 ${n} × 2만 먼저 해요. 가로와 세로를 더한 것 전체를 두 배 해요.` }, probe: { ask: 'perim', n }, rule: '한꺼번에 할 것은 괄호로 — 더한 것 전체를 곱하거나 나눠요.' }; })(),
        (() => ({ t: `두 수 a와 b가 있어요.\n\n두 수의 평균을 ${FORMULA}`, text: true, ans: '(a + b) ÷ 2', wr: [{ text: 'a + b ÷ 2', tag: TAGS.noParen }, { text: '(a + b) × 2', tag: TAGS.mulForDiv }], steps: ['평균 = 모두 더한 값 ÷ 개수', '두 수를 더한 것 전체를 2로 나눠요 → (a + b) ÷ 2'], why: { [TAGS.noParen]: '괄호가 없으면 b ÷ 2만 먼저 해요. 더한 것 전체를 나눠요.', [TAGS.mulForDiv]: '평균은 나눠서 구해요.' }, probe: { ask: 'mean' }, rule: '한꺼번에 할 것은 괄호로 — 더한 것 전체를 곱하거나 나눠요.' }))(),
      ]));
      return calcAsk(r, c, this, runFamily(r, c, fams));
    },
    misread(r, c) {
      if (branchOf(r, c, ['change', 'speed']) === 'change') {
        const n = int(r, 2, 5); const P = pick(r, [5000, 10000]);
        return misAsk(r, c, this, 'change', {
          q: `${P}원을 내고 한 권에 a원인 공책을 ${n}권 샀어요.\n\n${showWork(`거스름돈은 a × ${n} − ${P}원이에요`)}`,
          ok: `낸 돈에서 공책 값을 빼야 해요 — ${P} − a × ${n}원이에요`,
          wr: [{ text: '맞게 말했어요', tag: RIGHT_AS_WRONG }, { text: `공책이 여러 권이어도 ${P} − a원이에요`, tag: TAGS.dropCount }, { text: '거스름돈은 식으로 나타낼 수 없어요', tag: OFF }],
          steps: [`공책 값 a × ${n}원은 낸 돈 ${P}원보다 작아요`, `거스름돈 = 낸 돈 − 공책 값 → ${P} − a × ${n}`],
          whyAny: '빼는 순서가 거꾸로예요. 낸 돈에서 공책 값을 빼요.',
          probe: { ask: 'change', n, P },
        });
      }
      const v = int(r, 4, 9) * 10;
      return misAsk(r, c, this, 'speed', {
        q: `자동차가 한 시간에 ${v} km씩 x시간 동안 달렸어요.\n\n${showWork(`달린 거리는 ${v} ÷ x km예요`)}`,
        ok: `한 시간에 ${v} km씩 x시간이니까 ${v} × x km예요`,
        wr: [{ text: '맞게 말했어요', tag: RIGHT_AS_WRONG }, { text: `x ÷ ${v} km예요`, tag: TAGS.divSwap }, { text: '거리는 식으로 나타낼 수 없어요', tag: OFF }],
        steps: [`1시간에 ${v} km, 2시간에 ${v} × 2 km …`, `x시간이면 ${v} × x km`],
        whyAny: '거리는 시간이 늘수록 늘어나요 — 나누지 않고 곱해요.',
        probe: { ask: 'dist', v },
      });
    },
  },

  {
    id: 'exp.mul', grade: 7, name: '곱셈 기호의 생략', needs: ['exp.write'],
    idea: '곱셈 기호 ×는 **생략**할 수 있어요. 수는 문자 **앞에**(x × 3 = 3x), 문자는 보통 알파벳 순서로(b × a = ab), **1은 쓰지 않고**(1 × a = a, (−1) × a = −a), 같은 문자의 곱은 **거듭제곱**으로(a × a = a²) 써요. 괄호가 있는 식은 수를 괄호 앞에 써요((a + b) × 2 = 2(a + b)).',
    rule: '수는 앞에, 1은 쓰지 않고, 같은 문자는 거듭제곱으로 — ×만 지워요.',
    slip: '수가 앞에 왔는지, 같은 문자를 거듭제곱으로 썼는지 봐요.',
    calc(r, c) {
      const t = (e) => `${OMIT_MUL}\n\n**${e}**`;
      const fams = [];
      fams.push(famOf([
        (() => { const n = int(r, 2, 9); return { t: t(`x × ${n}`), text: true, ans: `${n}x`, wr: [{ text: `x${n}`, tag: TAGS.numAfter }, { text: `x + ${n}`, tag: TAGS.mulAsAdd }], steps: [`곱셈 기호를 지우고 수는 문자 앞에`, `x × ${n} = ${n}x`], why: { [TAGS.numAfter]: '수는 문자 앞에 써요.', [TAGS.mulAsAdd]: '×를 지우는 것이지 +로 바꾸는 것이 아니에요.' }, probe: { ask: 'omit', e: `x × ${n}` } }; })(),
        (() => { const n = int(r, 2, 9); return { t: t(`a × ${n} × b`), text: true, ans: `${n}ab`, wr: [{ text: `a${n}b`, tag: TAGS.keepOrder }, { text: `ab${n}`, tag: TAGS.numAfter }], steps: ['수를 맨 앞에, 문자는 그 뒤에', `a × ${n} × b = ${n}ab`], why: { [TAGS.keepOrder]: '수는 문자 사이가 아니라 맨 앞에 써요.', [TAGS.numAfter]: '수는 문자 앞에 써요.' }, probe: { ask: 'omit', e: `a × ${n} × b` } }; })(),
      ]));
      fams.push(famOf([
        (() => { const n = int(r, 2, 9); return { t: t(`x × x × ${n}`), text: true, ans: `${n}x²`, wr: [{ text: `${2 * n}x`, tag: TAGS.powAsMul }, { text: `${n}x`, tag: TAGS.powOnce }], steps: ['같은 문자의 곱 x × x는 x²', `x × x × ${n} = ${n}x²`], why: { [TAGS.powAsMul]: 'x × x는 x를 두 번 곱한 것 — x²이에요. 2x는 x + x예요.', [TAGS.powOnce]: 'x를 두 번 곱했어요 — x²으로 써요.' }, probe: { ask: 'omit', e: `x × x × ${n}` } }; })(),
        (() => { const n = int(r, 2, 9); return { t: t(`${n} × y × x × y`), text: true, ans: `${n}xy²`, wr: [{ text: `${2 * n}xy`, tag: TAGS.powAsMul }, { text: `${n}yxy`, tag: TAGS.keepOrder }], steps: ['수를 앞에, 같은 문자 y × y는 y²', `${n} × y × x × y = ${n}xy²`], why: { [TAGS.powAsMul]: 'y × y는 y²이에요. 2y는 y + y예요.', [TAGS.keepOrder]: '같은 문자 y는 모아서 y²으로 써요.' }, probe: { ask: 'omit', e: `${n} × y × x × y` } }; })(),
      ]));
      fams.push(famOf([
        (() => { const n = int(r, 2, 9); return { t: t(`y × (−${n})`), text: true, ans: `−${n}y`, wr: [{ text: `${n}y`, tag: TAGS.signDrop }, { text: `y − ${n}`, tag: TAGS.mulAsSub }], steps: ['수 −' + n + '를 문자 앞에', `y × (−${n}) = −${n}y`], why: { [TAGS.signDrop]: `−${n}를 곱했어요 — −를 그대로 써요.`, [TAGS.mulAsSub]: `−${n}를 곱하는 것이지 ${n}를 빼는 것이 아니에요.` }, probe: { ask: 'omit', e: `y × (−${n})` } }; })(),
        (() => { const n = int(r, 2, 9); return { t: t(`(a + b) × ${n}`), text: true, ans: `${n}(a + b)`, wr: [{ text: `${n}a + b`, tag: TAGS.parenFirst }, { text: `(a + b)${n}`, tag: TAGS.numAfter }], steps: ['괄호는 그대로 두고 수를 괄호 앞에', `(a + b) × ${n} = ${n}(a + b)`], why: { [TAGS.parenFirst]: `괄호를 지우면 ${n}이 a에만 곱해져요 — 괄호를 남겨요.`, [TAGS.numAfter]: '수는 괄호 앞에 써요.' }, probe: { ask: 'omit', e: `(a + b) × ${n}` } }; })(),
      ]));
      return calcAsk(r, c, this, runFamily(r, c, fams));
    },
    misread(r, c) {
      if (branchOf(r, c, ['one', 'pow']) === 'one') {
        // 1을 지우지 않는 실수 — 교과서의 (−1) × a = −a (② 열쇠는 갈래라 글이 같아도 된다)
        const v = pick(r, ['ab', 'xy']);
        const [p, q] = [...v];
        return misAsk(r, c, this, 'one', {
          q: `곱셈 기호 ×를 생략하여 나타내요.\n\n${showWork(`(−1) × ${p} × ${q}는 −1${v}예요`)}`,
          ok: `1은 쓰지 않아요 — (−1) × ${p} × ${q}는 −${v}예요`,
          wr: [{ text: '맞게 말했어요', tag: RIGHT_AS_WRONG }, { text: `${v}예요 — −1은 통째로 생략해요`, tag: TAGS.signDrop }, { text: '음수는 곱할 수 없어요', tag: OFF }],
          steps: [`1 × ${v}는 ${v} — 1은 쓰지 않아요`, `(−1) × ${p} × ${q} = −${v}`],
          whyAny: '−1의 1을 그대로 썼어요. 1은 쓰지 않고 −만 남겨요.',
          probe: { ask: 'one', v },
        });
      }
      const n = int(r, 2, 9);
      return misAsk(r, c, this, 'pow', {
        q: `곱셈 기호 ×를 생략하여 나타내요.\n\n${showWork(`a × a × ${jn(n, '은', '는')} ${2 * n}a예요`)}`,
        ok: `같은 문자의 곱은 거듭제곱으로 — ${n}a²이에요`,
        wr: [{ text: '맞게 말했어요', tag: RIGHT_AS_WRONG }, { text: `${n}a예요 — 같은 문자는 한 번만 써요`, tag: TAGS.powOnce }, { text: '같은 문자는 곱할 수 없어요', tag: OFF }],
        steps: ['a × a는 a를 두 번 곱한 것 — a²', `a × a × ${n} = ${n}a²`],
        whyAny: 'a × a를 a + a처럼 2a로 봤어요. 곱한 것은 거듭제곱 a²이에요.',
        probe: { ask: 'pow', n },
      });
    },
  },

  {
    id: 'exp.div', grade: 7, name: '나눗셈 기호의 생략', needs: ['exp.mul'],
    idea: '나눗셈 기호 ÷는 **분수** 꼴로 생략해요 — 나누는 수가 분모예요(a ÷ 3 = a/3, a ÷ b = a/b). 괄호가 있는 식은 괄호 안 전체가 분자예요((x + 2) ÷ 3 = (x + 2)/3). ×와 ÷가 섞이면 **앞에서부터** 차례로 해요(a ÷ b × c = ac/b).',
    rule: '나누는 수가 분모 — ×와 ÷가 섞이면 앞에서부터.',
    slip: '나누는 수를 분모에 썼는지, 앞에서부터 차례로 했는지 봐요.',
    calc(r, c) {
      const fams = [];
      fams.push(famOf([
        (() => { const n = int(r, 2, 9); return { t: `${OMIT_DIV}\n\n**x ÷ ${n}**`, text: true, ans: `x/${n}`, wr: [{ text: `${n}/x`, tag: TAGS.flip }, { text: `${n}x`, tag: TAGS.divAsMul }], steps: [`나누는 수 ${n}이 분모`, `x ÷ ${n} = x/${n}`], why: { [TAGS.flip]: `나누는 수 ${n}이 분모예요 — 뒤집혔어요.`, [TAGS.divAsMul]: '÷를 생략하는 것이지 곱하는 것이 아니에요.' }, probe: { ask: 'omit', e: `x ÷ ${n}` } }; })(),
        (() => ({ t: `${OMIT_DIV}\n\n**a ÷ b**`, text: true, ans: 'a/b', wr: [{ text: 'b/a', tag: TAGS.flip }, { text: 'ab', tag: TAGS.divAsMul }], steps: ['나누는 b가 분모', 'a ÷ b = a/b'], why: { [TAGS.flip]: '나누는 b가 분모예요 — 뒤집혔어요.', [TAGS.divAsMul]: '÷를 지우고 붙여 쓰면 곱셈이 돼요.' }, probe: { ask: 'omit', e: 'a ÷ b' } }))(),
        (() => { const n = int(r, 2, 9); return { t: `${OMIT_DIV}\n\n**a ÷ (−${n})**`, text: true, ans: `−a/${n}`, wr: [{ text: `a/${n}`, tag: TAGS.signDrop }, { text: `−${n}/a`, tag: TAGS.flip }], steps: [`나누는 수 −${n} — 부호는 분수 앞에`, `a ÷ (−${n}) = −a/${n}`], why: { [TAGS.signDrop]: `음수로 나눴어요 — −를 앞에 써요.`, [TAGS.flip]: '나누는 수가 분모예요 — 뒤집혔어요.' }, probe: { ask: 'omit', e: `a ÷ (−${n})` } }; })(),
      ]));
      fams.push(famOf([
        (() => { const [n, m] = draw(() => [int(r, 1, 9), int(r, 2, 9)], ([x, y]) => x !== y); return { t: `${OMIT_DIV}\n\n**(x + ${n}) ÷ ${m}**`, text: true, ans: `(x + ${n})/${m}`, wr: [{ text: `x + ${n}/${m}`, tag: TAGS.noParenDiv }, { text: `${m}/(x + ${n})`, tag: TAGS.flip }], steps: ['괄호 안 전체가 분자', `(x + ${n}) ÷ ${m} = (x + ${n})/${m}`], why: { [TAGS.noParenDiv]: `x + ${n} 전체를 나눠요 — ${n}만 나눈 것이 아니에요.`, [TAGS.flip]: '나누는 수가 분모예요 — 뒤집혔어요.' }, probe: { ask: 'omit', e: `(x + ${n}) ÷ ${m}` } }; })(),
      ]));
      fams.push(famOf([
        (() => ({ t: `${OMIT_BOTH}\n\n**a ÷ b × c**`, text: true, ans: 'ac/b', wr: [{ text: 'a/(bc)', tag: TAGS.mulDivOrder }, { text: 'abc', tag: TAGS.divAsMul }], steps: ['앞에서부터 — a ÷ b = a/b', 'a/b × c = ac/b'], why: { [TAGS.mulDivOrder]: 'b × c를 먼저 했어요. 앞에서부터 a ÷ b, 그다음 × c예요.', [TAGS.divAsMul]: '÷를 곱셈으로 바꿨어요.' }, probe: { ask: 'omit', e: 'a ÷ b × c' } }))(),
        (() => { const n = int(r, 2, 9); return { t: `${OMIT_BOTH}\n\n**x ÷ ${n} × y**`, text: true, ans: `xy/${n}`, wr: [{ text: `x/(${n}y)`, tag: TAGS.mulDivOrder }, { text: `${n}xy`, tag: TAGS.divAsMul }], steps: [`앞에서부터 — x ÷ ${n} = x/${n}`, `x/${n} × y = xy/${n}`], why: { [TAGS.mulDivOrder]: `${n} × y를 먼저 했어요. 앞에서부터 차례로 해요.`, [TAGS.divAsMul]: '÷를 곱셈으로 바꿨어요.' }, probe: { ask: 'omit', e: `x ÷ ${n} × y` } }; })(),
      ]));
      return calcAsk(r, c, this, runFamily(r, c, fams));
    },
    misread(r, c) {
      if (branchOf(r, c, ['flip', 'order']) === 'flip') {
        const n = int(r, 2, 9);
        return misAsk(r, c, this, 'flip', {
          q: `나눗셈 기호 ÷를 생략하여 나타내요.\n\n${showWork(`x ÷ ${n} = ${n}/x`)}`,
          ok: `나누는 수 ${jn(n, '이', '가')} 분모 — x ÷ ${n} = x/${n}`,
          wr: [{ text: '맞게 말했어요', tag: RIGHT_AS_WRONG }, { text: `${n}x예요 — ÷를 지우고 붙여 써요`, tag: TAGS.divAsMul }, { text: '나눗셈은 생략할 수 없어요', tag: OFF }],
          steps: [`나누는 수 ${jn(n, '이', '가')} 분모, 나뉘는 x가 분자`, `x ÷ ${n} = x/${n}`],
          whyAny: '분자와 분모가 뒤집혔어요. 나누는 수가 분모예요.',
          probe: { ask: 'flip', n },
        });
      }
      return misAsk(r, c, this, 'order', {
        q: `곱셈 기호와 나눗셈 기호를 생략하여 나타내요.\n\n${showWork('a ÷ b × c = a/(bc)')}`,
        ok: '앞에서부터 차례로 — a ÷ b × c = ac/b',
        wr: [{ text: '맞게 말했어요', tag: RIGHT_AS_WRONG }, { text: 'abc예요 — 기호를 모두 지워요', tag: TAGS.divAsMul }, { text: '곱셈과 나눗셈은 섞어 쓸 수 없어요', tag: OFF }],
        steps: ['앞에서부터 a ÷ b = a/b', 'a/b × c = ac/b'],
        whyAny: 'b × c를 먼저 계산했어요. ×와 ÷는 앞에서부터 차례로 해요.',
        probe: { ask: 'order' },
      });
    },
  },

  {
    id: 'exp.value', grade: 7, name: '식의 값', needs: ['exp.div'],
    idea: '문자에 수를 넣는 것을 **대입**, 대입해서 계산한 값을 **식의 값**이라고 해요. 생략된 곱셈 기호를 다시 살리고(2x → 2 × x), **음수는 괄호에 넣어** 대입해요. x = −3이면 2x = 2 × (−3) = −6, x² = (−3)² = 9예요.',
    rule: '× 기호를 살리고, 음수는 괄호에 넣어 대입해요.',
    slip: '곱셈 기호를 살렸는지, 음수를 괄호에 넣었는지 봐요.',
    calc(r, c) {
      const t = (pre, e) => `${pre}일 때, 다음 식의 값은 얼마일까요?\n\n**${e}**`;
      const fams = [];
      fams.push(famOf([
        (() => { const [a, p, b] = draw(() => [int(r, 2, 9), int(r, 2, 9), int(r, 1, 9)], ([a1, p1, b1]) => allDiff(a1 * p1 + b1, Number(`${a1}${p1}`) + b1, a1 + p1 + b1)); return { t: t(`x = ${p}`, `${a}x + ${b}`), ans: num(a * p + b), wr: [{ text: num(Number(`${a}${p}`) + b), tag: TAGS.concat }, { text: num(a + p + b), tag: TAGS.mulAsAdd }], steps: [`${a}x = ${a} × x — x 자리에 ${p}`, `${a} × ${p} + ${b} = ${a * p + b}`], why: { [TAGS.concat]: `${a}x는 ${a} × x — ${a}와 ${p}를 나란히 붙이면 안 돼요.`, [TAGS.mulAsAdd]: `${a}x는 ${a} × x — 곱해요.` }, probe: { ask: 'value' } }; })(),
        (() => { const [a, p, b] = draw(() => [int(r, 2, 9), int(r, 2, 9), int(r, 1, 9)], ([a1, p1, b1]) => allDiff(b1 - a1 * p1, a1 - p1 + b1, a1 * p1 + b1)); return { t: t(`x = −${p}`, `${a}x + ${b}`), ans: num(b - a * p), wr: [{ text: num(a - p + b), tag: TAGS.noParenSub }, { text: num(a * p + b), tag: TAGS.signDrop }], steps: [`음수는 괄호에 넣어 — ${a} × (−${p}) + ${b}`, `${a} × (−${p}) = −${a * p}, −${a * p} + ${b} = ${num(b - a * p)}`], why: { [TAGS.noParenSub]: `괄호 없이 넣으면 ${a} − ${p} — 곱셈이 빼기가 돼요.`, [TAGS.signDrop]: `x는 −${p} — 부호를 빠뜨렸어요.` }, probe: { ask: 'value' } }; })(),
      ]));
      fams.push(famOf([
        (() => { const [a, p] = draw(() => [int(r, 2, 6), int(r, 2, 6)], ([a1, p1]) => allDiff(a1 * p1 * p1, -a1 * p1 * p1, -2 * a1 * p1)); return { t: t(`x = −${p}`, `${a}x²`), ans: num(a * p * p), wr: [{ text: num(-a * p * p), tag: TAGS.negPow }, { text: num(-2 * a * p), tag: TAGS.powAsMul }], steps: [`x² = (−${p})² = (−${p}) × (−${p}) = ${p * p}`, `${a} × ${p * p} = ${a * p * p}`], why: { [TAGS.negPow]: `(−${p})²은 음수끼리 곱해서 양수예요.`, [TAGS.powAsMul]: 'x²은 x × x — 2배가 아니에요.' }, probe: { ask: 'value' } }; })(),
        (() => { const [m, p, q] = draw(() => [int(r, 2, 9), int(r, 2, 9), int(r, 2, 9)], ([m1, p1, q1]) => allDiff(m1 * p1 + q1, m1 * p1 - q1, Number(`${m1}${p1}`) + q1)); return { t: t(`a = ${p}, b = −${q}`, `${m}a − b`), ans: num(m * p + q), wr: [{ text: num(m * p - q), tag: TAGS.subNeg }, { text: num(Number(`${m}${p}`) + q), tag: TAGS.concat }], steps: [`${m} × ${p} − (−${q})`, `${m * p} + ${q} = ${m * p + q}`], why: { [TAGS.subNeg]: `−${q}를 빼면 ${q}를 더하는 것과 같아요.`.replace(`${q}를`, jn(q, '을', '를')).replace(` ${q}를 더하는`, ` ${jn(q, '을', '를')} 더하는`), [TAGS.concat]: `${m}a는 ${m} × a — 곱해요.` }, probe: { ask: 'value' } }; })(),
      ]));
      return calcAsk(r, c, this, runFamily(r, c, fams));
    },
    misread(r, c) {
      if (branchOf(r, c, ['paren', 'pow']) === 'paren') {
        const [a, p, b] = draw(() => [int(r, 2, 9), int(r, 2, 9), int(r, 1, 9)], ([a1, p1, b1]) => allDiff(b1 - a1 * p1, a1 - p1 + b1, a1 * p1 + b1) && a1 - p1 + b1 > 0);
        return misAsk(r, c, this, 'paren', {
          q: `x = −${p}일 때, ${a}x + ${b}의 값을 구해요.\n\n${showWork(`${a} − ${p} + ${b} = ${a - p + b}이에요`.replace(`${a - p + b}이에요`, jn(a - p + b, '이에요', '예요')))}`,
          ok: `음수는 괄호에 넣어 — ${a} × (−${p}) + ${b} = ${jn(num(b - a * p), '이에요', '예요')}`,
          wr: [{ text: '맞게 말했어요', tag: RIGHT_AS_WRONG }, { text: `${a} × ${p} + ${b} = ${jn(a * p + b, '이에요', '예요')}`, tag: TAGS.signDrop }, { text: '음수는 대입할 수 없어요', tag: OFF }],
          steps: [`${a}x = ${a} × x, x 자리에 (−${p})`, `${a} × (−${p}) + ${b} = ${num(b - a * p)}`],
          whyAny: '괄호 없이 넣어서 곱셈이 빼기가 됐어요. 음수는 괄호에 넣어 대입해요.',
          probe: { ask: 'paren', a, p, b },
        });
      }
      const p = int(r, 2, 6);
      return misAsk(r, c, this, 'pow', {
        q: `x = −${p}일 때, x²의 값을 구해요.\n\n${showWork(`x² = −${p}² = −${jn(p * p, '이에요', '예요')}`)}`,
        ok: `(−${p})² = (−${p}) × (−${p}) = ${jn(p * p, '이에요', '예요')}`,
        wr: [{ text: '맞게 말했어요', tag: RIGHT_AS_WRONG }, { text: `−${p} × 2 = −${jn(2 * p, '이에요', '예요')}`, tag: TAGS.powAsMul }, { text: '음수는 제곱할 수 없어요', tag: OFF }],
        steps: [`괄호에 넣어 (−${p})²`, `(−${p}) × (−${p}) = ${p * p}`],
        whyAny: `괄호 없이 −${p}²로 쓰면 ${p}만 제곱해요. 음수 전체를 괄호에 넣어 제곱해요.`,
        probe: { ask: 'pow', p },
      });
    },
  },

  {
    id: 'exp.terms', grade: 7, name: '다항식과 일차식', needs: ['exp.value'],
    idea: '수나 문자의 곱으로 된 식 하나하나를 **항**이라고 해요. 수만 있는 항은 **상수항**, 문자 앞에 곱해진 수는 그 문자의 **계수**(부호까지)예요. 항이 하나 이상인 식을 **다항식**이라고 하고, 그중 항이 하나뿐인 식을 **단항식**이라고 해요(단항식도 다항식). 곱해진 문자의 개수를 그 항의 **차수**라고 하고, 차수가 가장 큰 항의 차수가 다항식의 차수예요. 차수가 1인 다항식이 **일차식**이에요 — x²이 있거나 분모에 문자가 있으면 일차식이 아니에요.',
    rule: '계수는 부호까지 · 상수항도 항 · 차수가 1이면 일차식.',
    slip: '부호까지 읽었는지, 차수가 가장 큰 항을 봤는지 봐요.',
    calc(r, c) {
      const fams = [];
      fams.push(famOf([
        (() => { const [a, b, k] = draw(() => [int(r, 2, 9), int(r, 2, 9), int(r, 1, 9)], ([a1, b1]) => a1 !== b1); return { t: `다음 다항식에서 y의 계수는 얼마일까요?\n\n**${a}x − ${b}y + ${k}**`, ans: num(-b), wr: [{ text: num(b), tag: TAGS.coefSign }, { text: num(a), tag: TAGS.otherCoef }], steps: [`${a}x − ${b}y + ${k} = ${a}x + (−${b})y + ${k}`, `y의 계수는 −${b}`], why: { [TAGS.coefSign]: '계수는 부호까지 — 앞의 −를 함께 읽어요.', [TAGS.otherCoef]: `${a}는 x의 계수예요.`.replace(`${a}는`, jn(a, '은', '는')) }, probe: { ask: 'coef' } }; })(),
        (() => { const [b, k] = draw(() => [int(r, 2, 9), int(r, 2, 9)], ([b1, k1]) => b1 !== k1); return { t: `다음 다항식에서 x의 계수는 얼마일까요?\n\n**x − ${b}y + ${k}**`, ans: '1', wr: [{ text: '0', tag: TAGS.oneAsZero }, { text: num(-b), tag: TAGS.otherCoef }], steps: ['x는 1 × x — 1을 쓰지 않은 것', 'x의 계수는 1'], why: { [TAGS.oneAsZero]: 'x = 1 × x — 계수는 0이 아니라 1이에요.', [TAGS.otherCoef]: `−${b}는 y의 계수예요.`.replace(`${b}는`, jn(b, '은', '는')) }, probe: { ask: 'coef' } }; })(),
        (() => { const [n, b] = draw(() => [int(r, 2, 9), int(r, 1, 9)], ([n1, b1]) => n1 !== b1); return { t: `다음 다항식에서 x의 계수는 얼마일까요?\n\n**x/${n} − ${b}**`, ans: `1/${n}`, wr: [{ text: String(n), tag: TAGS.denomAsCoef }, { text: '1', tag: TAGS.denomDrop }], steps: [`x/${n} = 1/${n} × x`, `x의 계수는 1/${n}`], why: { [TAGS.denomAsCoef]: `${n}은 분모예요 — x에 곱한 수가 계수라서 1/${n}.`.replace(`${n}은`, jn(n, '은', '는')), [TAGS.denomDrop]: `x를 ${n}으로 나눈 것 — 1/${n} × x예요.`.replace(`${n}으로`, jn(n, '으로', '로')) }, probe: { ask: 'coef' } }; })(),
      ]));
      fams.push(famOf([
        (() => { const [a, b] = draw(() => [int(r, 2, 9), int(r, 2, 9)], ([a1, b1]) => a1 !== b1); return { t: `다음 다항식의 상수항은 얼마일까요?\n\n**${a}x − ${b}**`, ans: num(-b), wr: [{ text: num(b), tag: TAGS.constSign }, { text: num(a), tag: TAGS.coefAsConst }], steps: [`${a}x − ${b} = ${a}x + (−${b})`, `수만 있는 항 −${b}가 상수항`], why: { [TAGS.constSign]: '상수항도 부호까지 — −를 함께 읽어요.', [TAGS.coefAsConst]: `${a}는 x의 계수예요. 상수항은 수만 있는 항이에요.`.replace(`${a}는`, jn(a, '은', '는')) }, probe: { ask: 'const' } }; })(),
        (() => { const [a, b, k] = draw(() => [int(r, 4, 9), int(r, 2, 9), int(r, 1, 9)], ([a1]) => a1 !== 3); return { t: `다음 다항식의 차수는 얼마일까요?\n\n**${a}x² − ${b}x + ${k}**`, ans: '2', wr: [{ text: '3', tag: TAGS.termAsDeg }, { text: String(a), tag: TAGS.coefAsDeg }], steps: [`각 항의 차수: ${a}x²은 2, −${b}x는 1, ${k}는 0`, '가장 큰 차수 2 — 다항식의 차수는 2'], why: { [TAGS.termAsDeg]: '항이 3개라는 뜻이에요. 차수는 곱해진 문자의 개수예요.', [TAGS.coefAsDeg]: `${a}는 계수예요. 차수는 문자가 몇 번 곱해졌는지예요.`.replace(`${a}는`, jn(a, '은', '는')) }, probe: { ask: 'deg' } }; })(),
      ]));
      fams.push(famOf([
        (() => { const [a, b, k, d] = draw(() => [int(r, 2, 9), int(r, 1, 9), int(r, 2, 9), int(r, 2, 9)], () => true); return { t: '다음 중 일차식은 어느 것일까요?', text: true, ans: `${a}x − ${b}`, wr: [{ text: `x² − ${k}x`, tag: TAGS.squareLinear }, { text: `${d}/x + 1`, tag: TAGS.denomVar }, { text: `${k}xy + 1`, tag: TAGS.prodLinear }], steps: ['차수가 가장 큰 항의 차수가 1이면 일차식', `${a}x − ${b}의 차수는 1 — 일차식`], why: { [TAGS.squareLinear]: 'x²의 차수는 2 — 이차식이에요.', [TAGS.denomVar]: '분모에 문자가 있으면 다항식이 아니에요.', [TAGS.prodLinear]: 'xy는 문자 두 개를 곱해서 차수가 2예요.' }, probe: { ask: 'linear' } }; })(),
      ]));
      return calcAsk(r, c, this, runFamily(r, c, fams));
    },
    misread(r, c) {
      if (branchOf(r, c, ['coef', 'linear']) === 'coef') {
        const [a, b] = draw(() => [int(r, 2, 9), int(r, 2, 9)], ([a1, b1]) => a1 !== b1);
        return misAsk(r, c, this, 'coef', {
          q: `다항식 ${a}x − ${b}y를 보고\n\n${showWork(`y의 계수는 ${jn(b, '이에요', '예요')}`)}`,
          ok: `계수는 부호까지 — y의 계수는 −${jn(b, '이에요', '예요')}`,
          wr: [{ text: '맞게 말했어요', tag: RIGHT_AS_WRONG }, { text: `y의 계수는 ${jn(a, '이에요', '예요')}`, tag: TAGS.otherCoef }, { text: 'y에는 계수가 없어요', tag: OFF }],
          steps: [`${a}x − ${b}y = ${a}x + (−${b})y`, `y의 계수는 −${b}`],
          whyAny: '앞의 −를 빼고 읽었어요. 계수는 부호까지예요.',
          probe: { ask: 'coef', a, b },
        });
      }
      const k = int(r, 2, 9);
      return misAsk(r, c, this, 'linear', {
        q: `다항식 x² + ${k}를 보고\n\n${showWork(`x² + ${k}도 일차식이에요`)}`.replace(`x² + ${k}를`, `x² + ${jn(k, '을', '를')}`),
        ok: '차수가 2인 항 x²이 있어서 일차식이 아니에요',
        wr: [{ text: '맞게 말했어요', tag: RIGHT_AS_WRONG }, { text: '상수항이 있어서 일차식이 아니에요', tag: TAGS.wrongReason }, { text: 'x²은 항이 아니에요', tag: OFF }],
        steps: ['x²은 x × x — 차수 2', '가장 큰 차수가 2 → 일차식이 아니에요'],
        whyAny: '차수가 가장 큰 항을 봐요. x²의 차수는 2예요.',
        probe: { ask: 'linear', k },
      });
    },
  },

  {
    id: 'exp.scale', grade: 7, name: '일차식과 수의 곱셈·나눗셈', needs: ['exp.terms'],
    idea: '수를 곱할 때는 계수끼리 곱해요(3 × 2x = 6x). 괄호가 있으면 **분배법칙**으로 괄호 안 **모든 항**에 곱해요(2(3x − 1) = 6x − 2). 음수를 곱하면 모든 항의 부호가 바뀌어요(−3(x − 2) = −3x + 6). 나눌 때도 **모든 항**을 나눠요((6x + 4) ÷ 2 = 3x + 2).',
    rule: '괄호 안 모든 항에 곱하고, 모든 항을 나눠요 — 음수면 부호까지.',
    slip: '괄호 안 둘째 항에도 곱했는지, 부호를 바꿨는지 봐요.',
    calc(r, c) {
      const t = (e) => `${CALC}\n\n**${e}**`;
      const fams = [];
      fams.push(famOf([
        (() => { const [a, b] = draw(() => [int(r, 2, 9), int(r, 2, 9)], ([a1, b1]) => allDiff(a1 * b1, a1 + b1, Number(`${a1}${b1}`))); return { t: t(`${a} × ${b}x`), text: true, ans: `${a * b}x`, wr: [{ text: `${a + b}x`, tag: TAGS.mulAsAdd }, { text: `${a}${b}x`, tag: TAGS.concatNum }], steps: ['수끼리 곱해요', `${a} × ${b} = ${a * b} → ${a * b}x`], why: { [TAGS.mulAsAdd]: '수끼리 곱해요 — 더하지 않아요.', [TAGS.concatNum]: '두 수를 붙여 쓰지 않고 곱해요.' }, probe: { ask: 'calc' } }; })(),
        (() => { const [a, b] = draw(() => [int(r, 2, 9), int(r, 2, 9)], ([a1, b1]) => a1 !== b1); return { t: t(`${a}x × (−${b})`), text: true, ans: `−${a * b}x`, wr: [{ text: `${a * b}x`, tag: TAGS.signDrop }, { text: `${a}x − ${b}`, tag: TAGS.mulAsSub }], steps: [`${a} × (−${b}) = −${a * b}`, `−${a * b}x`], why: { [TAGS.signDrop]: '음수를 곱했어요 — 부호가 바뀌어요.', [TAGS.mulAsSub]: '음수를 곱하는 것이지 빼는 것이 아니에요.' }, probe: { ask: 'calc' } }; })(),
      ]));
      fams.push(famOf([
        (() => { const [a, b, k] = draw(() => [int(r, 2, 6), int(r, 2, 6), int(r, 1, 9)], ([a1, b1, k1]) => allDiffText(lin(a1 * b1, -a1 * k1), lin(a1 * b1, -k1), lin(a1 + b1, -(a1 + k1)))); return { t: t(`${a}(${b}x − ${k})`), text: true, ans: lin(a * b, -a * k), wr: [{ text: lin(a * b, -k), tag: TAGS.distribFirst }, { text: lin(a + b, -(a + k)), tag: TAGS.mulAsAdd }], steps: [`분배법칙 — ${a} × ${b}x와 ${a} × (−${k})`, `${a * b}x − ${a * k}`], why: { [TAGS.distribFirst]: `괄호 안 둘째 항 −${k}에도 ${a}를 곱해요.`.replace(`${a}를`, jn(a, '을', '를')), [TAGS.mulAsAdd]: '곱해야 해요 — 더하지 않아요.' }, probe: { ask: 'calc' } }; })(),
        (() => { const [a, b] = draw(() => [int(r, 2, 9), int(r, 2, 9)], ([a1, b1]) => allDiffText(lin(-a1, a1 * b1), lin(-a1, -a1 * b1), lin(-a1, -b1))); return { t: t(`−${a}(x − ${b})`), text: true, ans: lin(-a, a * b), wr: [{ text: lin(-a, -a * b), tag: TAGS.signKeep }, { text: lin(-a, -b), tag: TAGS.distribFirst }], steps: [`−${a} × x = −${a}x, −${a} × (−${b}) = +${a * b}`, lin(-a, a * b)], why: { [TAGS.signKeep]: `음수끼리 곱하면 양수 — −${a} × (−${b}) = +${a * b}`, [TAGS.distribFirst]: `둘째 항 −${b}에도 −${a}를 곱해요.`.replace(`${a}를`, jn(a, '을', '를')) }, probe: { ask: 'calc' } }; })(),
      ]));
      fams.push(famOf([
        (() => { const [a, b, k] = draw(() => [int(r, 2, 5), int(r, 1, 5), int(r, 2, 4)], ([a1, b1, k1]) => allDiffText(lin(a1, b1), lin(a1, b1 * k1), lin(a1 * k1 * k1, b1 * k1 * k1))); return { t: t(`(${a * k}x + ${b * k}) ÷ ${k}`), text: true, ans: lin(a, b), wr: [{ text: lin(a, b * k), tag: TAGS.divFirst }, { text: lin(a * k * k, b * k * k), tag: TAGS.divAsMul }], steps: [`모든 항을 ${k}로 나눠요`.replace(`${k}로`, jn(k, '으로', '로')), `${a * k}x ÷ ${k} = ${term(a, 'x')}, ${b * k} ÷ ${k} = ${b} → ${lin(a, b)}`], why: { [TAGS.divFirst]: `둘째 항 ${b * k}도 ${k}로 나눠요.`.replace(`${k}로`, jn(k, '으로', '로')), [TAGS.divAsMul]: '나눗셈을 곱셈으로 했어요.' }, probe: { ask: 'calc' } }; })(),
      ]));
      return calcAsk(r, c, this, runFamily(r, c, fams));
    },
    misread(r, c) {
      if (branchOf(r, c, ['first', 'sign']) === 'first') {
        const [a, b, k] = draw(() => [int(r, 2, 6), int(r, 2, 6), int(r, 1, 9)], ([a1, b1, k1]) => allDiffText(lin(a1 * b1, -a1 * k1), lin(a1 * b1, -k1), lin(a1 + b1, -(a1 + k1))));
        return misAsk(r, c, this, 'first', {
          q: `일차식을 계산해요.\n\n${showWork(`${a}(${b}x − ${k}) = ${lin(a * b, -k)}`)}`,
          ok: `괄호 안 모든 항에 곱해요 — ${lin(a * b, -a * k)}`,
          wr: [{ text: '맞게 말했어요', tag: RIGHT_AS_WRONG }, { text: lin(a + b, -(a + k)), tag: TAGS.mulAsAdd }, { text: '괄호가 있으면 계산할 수 없어요', tag: OFF }],
          steps: [`${a} × ${b}x = ${a * b}x`, `${a} × (−${k}) = −${a * k} → ${lin(a * b, -a * k)}`],
          whyAny: '괄호 안 첫째 항에만 곱했어요. 분배법칙은 모든 항에 곱해요.',
          probe: { ask: 'first', a, b, k },
        });
      }
      const [a, b] = draw(() => [int(r, 2, 9), int(r, 2, 9)], ([a1, b1]) => a1 !== b1);
      return misAsk(r, c, this, 'sign', {
        q: `일차식을 계산해요.\n\n${showWork(`−${a}(x − ${b}) = ${lin(-a, -a * b)}`)}`,
        ok: `음수끼리 곱하면 양수 — ${lin(-a, a * b)}`,
        wr: [{ text: '맞게 말했어요', tag: RIGHT_AS_WRONG }, { text: lin(-a, -b), tag: TAGS.distribFirst }, { text: '음수는 괄호 앞에 쓸 수 없어요', tag: OFF }],
        steps: [`−${a} × x = −${a}x`, `−${a} × (−${b}) = +${a * b} → ${lin(-a, a * b)}`],
        whyAny: '음수끼리 곱하면 양수예요. 둘째 항의 부호도 바뀌어요.',
        probe: { ask: 'sign', a, b },
      });
    },
  },

  {
    id: 'exp.like', grade: 7, name: '동류항', needs: ['exp.scale'],
    idea: '문자와 차수가 같은 항을 **동류항**이라고 해요(3x와 −2x). 상수항끼리도 동류항이에요. 동류항끼리만 계수를 더하거나 빼요(3x + 2x = 5x, 3x − x = 2x). 3x + 2처럼 동류항이 아니면 더 간단히 할 수 없어요. x와 x²은 차수가 달라서 동류항이 아니에요.',
    rule: '문자와 차수가 같아야 동류항 — 계수끼리만 더하고 빼요.',
    slip: '문자와 차수가 모두 같은지 보고, 계수끼리만 계산했는지 봐요.',
    calc(r, c) {
      const t = (e) => `${CALC}\n\n**${e}**`;
      const fams = [];
      fams.push(famOf([
        (() => { const [a, b] = draw(() => [int(r, 2, 9), int(r, 2, 9)], ([a1, b1]) => a1 !== b1); return { t: `다음 중 **${a}x**와 동류항인 것은 어느 것일까요?`, text: true, ans: `−${b}x`, wr: [{ text: `${a}x²`, tag: TAGS.powLike }, { text: `${a}y`, tag: TAGS.coefLike }, { text: String(a), tag: TAGS.constLike }], steps: ['동류항은 문자와 차수가 같은 항', `−${b}x는 문자 x, 차수 1 — 동류항`], why: { [TAGS.powLike]: 'x²은 차수가 2라서 동류항이 아니에요.', [TAGS.coefLike]: '문자가 달라요 — 계수가 같아도 동류항이 아니에요.', [TAGS.constLike]: '상수항은 문자가 없어요.' }, probe: { ask: 'like' } }; })(),
      ]));
      fams.push(famOf([
        (() => { const [a, b] = draw(() => [int(r, 2, 9), int(r, 2, 9)], () => true); return { t: t(`${a}x + ${b}x`), text: true, ans: `${a + b}x`, wr: [{ text: `${a + b}x²`, tag: TAGS.mulVar }, { text: String(a + b), tag: TAGS.dropVar }], steps: ['동류항끼리 계수를 더해요', `${a} + ${b} = ${a + b} → ${a + b}x`], why: { [TAGS.mulVar]: 'x를 곱하는 것이 아니에요 — x는 그대로예요.', [TAGS.dropVar]: 'x를 빠뜨렸어요.' }, probe: { ask: 'calc' } }; })(),
        (() => { const a = int(r, 3, 9); return { t: t(`${a}x − x`), text: true, ans: `${a - 1}x`, wr: [{ text: String(a), tag: TAGS.minusX }, { text: String(a - 1), tag: TAGS.dropVar }], steps: ['x = 1x', `${a} − 1 = ${a - 1} → ${a - 1}x`], why: { [TAGS.minusX]: `x는 1x — ${a}x에서 1x를 빼요.`, [TAGS.dropVar]: 'x를 빠뜨렸어요.' }, probe: { ask: 'calc' } }; })(),
      ]));
      fams.push(famOf([
        (() => { const [a, b, k] = draw(() => [int(r, 2, 9), int(r, 1, 9), int(r, 2, 9)], ([a1, b1, k1]) => allDiffText(lin(a1 + k1, b1), `${a1 + b1 + k1}x`, `${a1 + k1}x`)); return { t: t(`${a}x + ${b} + ${k}x`), text: true, ans: lin(a + k, b), wr: [{ text: `${a + b + k}x`, tag: TAGS.constWithX }, { text: `${a + k}x`, tag: TAGS.dropConst }], steps: [`동류항끼리 — ${a}x + ${k}x = ${a + k}x`, `상수항 ${b}는 그대로 → ${lin(a + k, b)}`.replace(`${b}는`, jn(b, '은', '는'))], why: { [TAGS.constWithX]: `상수항 ${b}는 x와 동류항이 아니에요.`.replace(`${b}는`, jn(b, '은', '는')), [TAGS.dropConst]: `상수항 ${jn(b, '을', '를')} 빠뜨렸어요.` }, probe: { ask: 'calc' } }; })(),
        (() => { const [a, b, k, d] = draw(() => [int(r, 3, 9), int(r, 1, 8), int(r, 2, 8), int(r, 2, 9)], ([a1, b1, k1, d1]) => a1 > k1 && d1 > b1 && allDiffText(lin(a1 - k1, d1 - b1), lin(a1 + k1, b1 + d1), lin(a1 - k1 + d1 - b1, 0))); return { t: t(`${a}x − ${b} − ${k}x + ${d}`), text: true, ans: lin(a - k, d - b), wr: [{ text: lin(a + k, b + d), tag: TAGS.minusAsPlus }, { text: lin(a - k + d - b, 0), tag: TAGS.constWithX }], steps: [`x끼리 ${a}x − ${k}x = ${term(a - k, 'x')}`, `수끼리 −${b} + ${d} = ${d - b} → ${lin(a - k, d - b)}`], why: { [TAGS.minusAsPlus]: '빼기를 더하기로 했어요. 앞의 부호를 그대로 가져가요.', [TAGS.constWithX]: '상수항은 x와 동류항이 아니에요.' }, probe: { ask: 'calc' } }; })(),
      ]));
      return calcAsk(r, c, this, runFamily(r, c, fams));
    },
    misread(r, c) {
      if (branchOf(r, c, ['const', 'pow']) === 'const') {
        const [a, b] = draw(() => [int(r, 2, 9), int(r, 1, 9)], () => true);
        return misAsk(r, c, this, 'const', {
          q: `식을 간단히 해요.\n\n${showWork(`${a}x + ${b} = ${a + b}x`)}`,
          ok: `${a}x와 ${jn(b, '은', '는')} 동류항이 아니라서 더 간단히 할 수 없어요`,
          wr: [{ text: '맞게 말했어요', tag: RIGHT_AS_WRONG }, { text: `${a}x + ${b} = ${jn(a + b, '이에요', '예요')}`, tag: TAGS.dropVar }, { text: '문자가 들어간 식에는 + 기호를 쓸 수 없어요', tag: OFF }],
          steps: [`${a}x는 문자가 있는 항, ${jn(b, '은', '는')} 상수항`, '동류항이 아니라서 그대로 둬요'],
          whyAny: '상수항까지 x와 더했어요. 동류항끼리만 더해요.',
          probe: { ask: 'const', a, b },
        });
      }
      const [a, b] = draw(() => [int(r, 2, 9), int(r, 2, 9)], () => true);
      return misAsk(r, c, this, 'pow', {
        q: `식을 간단히 해요.\n\n${showWork(`${a}x + ${b}x² = ${a + b}x²`)}`,
        ok: 'x와 x²은 차수가 달라서 동류항이 아니에요 — 더 간단히 할 수 없어요',
        wr: [{ text: '맞게 말했어요', tag: RIGHT_AS_WRONG }, { text: `${a + b}x예요`.replace(`${a + b}x예요`, `${a + b}x예요`), tag: TAGS.powLike }, { text: 'x²은 계산에 쓸 수 없어요', tag: OFF }],
        steps: ['x의 차수는 1, x²의 차수는 2', '차수가 다르면 동류항이 아니에요'],
        whyAny: '차수가 다른 항을 더했어요. 문자와 차수가 모두 같아야 동류항이에요.',
        probe: { ask: 'pow', a, b },
      });
    },
  },

  {
    id: 'exp.addsub', grade: 7, name: '일차식의 덧셈과 뺄셈', needs: ['exp.like'],
    idea: '일차식의 덧셈과 뺄셈은 **괄호를 풀고 동류항끼리** 모아 계산해요. 괄호 앞이 **−**이면 괄호 안 **모든 항의 부호**를 바꿔요(−(x − 3) = −x + 3). 괄호 앞에 수가 있으면 분배법칙으로 먼저 풀어요.',
    rule: '괄호를 풀고 동류항끼리 — 괄호 앞 −는 모든 항의 부호를 바꿔요.',
    slip: '괄호 앞 −를 둘째 항에도 적용했는지 봐요.',
    calc(r, c) {
      const t = (e) => `${CALC}\n\n**${e}**`;
      const fams = [];
      fams.push(famOf([
        (() => { const [a, b, k, d] = draw(() => [int(r, 2, 9), int(r, 1, 9), int(r, 2, 9), int(r, 1, 9)], ([a1, b1, k1, d1]) => b1 !== d1 && a1 + k1 + b1 - d1 !== 0 && allDiffText(lin(a1 + k1, b1 - d1), lin(a1 + k1, b1 + d1), lin(a1 + k1 + b1 - d1, 0))); return { t: t(`(${a}x + ${b}) + (${k}x − ${d})`), text: true, ans: lin(a + k, b - d), wr: [{ text: lin(a + k, b + d), tag: TAGS.minusAsPlus }, { text: lin(a + k + b - d, 0), tag: TAGS.constWithX }], steps: [`괄호를 풀면 ${a}x + ${b} + ${k}x − ${d}`, `x끼리 ${a + k}x, 수끼리 ${b} − ${d} = ${num(b - d)} → ${lin(a + k, b - d)}`], why: { [TAGS.minusAsPlus]: `−${d}의 부호를 그대로 가져가요.`, [TAGS.constWithX]: '상수항은 x와 동류항이 아니에요.' }, probe: { ask: 'calc' } }; })(),
        (() => { const [a, b, k, d] = draw(() => [int(r, 3, 9), int(r, 1, 9), int(r, 2, 8), int(r, 1, 9)], ([a1, b1, k1, d1]) => a1 > k1 && allDiffText(lin(a1 - k1, b1 + d1), lin(a1 - k1, b1 - d1), lin(a1 + k1, b1 - d1))); return { t: t(`(${a}x + ${b}) − (${k}x − ${d})`), text: true, ans: lin(a - k, b + d), wr: [{ text: lin(a - k, b - d), tag: TAGS.minusFirst }, { text: lin(a + k, b - d), tag: TAGS.minusAsPlus }], steps: [`괄호 앞 −로 모든 부호를 바꿔 ${a}x + ${b} − ${term(k, 'x')} + ${d}`, `x끼리 ${term(a - k, 'x')}, 수끼리 ${b + d} → ${lin(a - k, b + d)}`], why: { [TAGS.minusFirst]: `둘째 항 −${d}의 부호도 바꿔 +${d}예요.`, [TAGS.minusAsPlus]: '빼는 괄호를 더했어요.' }, probe: { ask: 'calc' } }; })(),
      ]));
      fams.push(famOf([
        (() => { const [a, b, k, d] = draw(() => [int(r, 2, 6), int(r, 1, 6), int(r, 2, 6), int(r, 1, 6)], ([a1, b1, k1, d1]) => a1 !== k1 && allDiffText(lin(a1 - k1, a1 * b1 + k1 * d1), lin(a1 - k1, a1 * b1 - k1 * d1), lin(a1 - k1, b1 + d1))); return { t: t(`${a}(x + ${b}) − ${k}(x − ${d})`), text: true, ans: lin(a - k, a * b + k * d), wr: [{ text: lin(a - k, a * b - k * d), tag: TAGS.signKeep }, { text: lin(a - k, b + d), tag: TAGS.distribFirst }], steps: [`${a}(x + ${b}) = ${a}x + ${a * b}, −${k}(x − ${d}) = −${k}x + ${k * d}`, `${a}x − ${k}x = ${term(a - k, 'x')}, ${a * b} + ${k * d} = ${a * b + k * d} → ${lin(a - k, a * b + k * d)}`], why: { [TAGS.signKeep]: `−${k} × (−${d}) = +${k * d} — 부호가 바뀌어요.`, [TAGS.distribFirst]: '괄호 안 둘째 항에도 곱해요.' }, probe: { ask: 'calc' } }; })(),
        (() => { const [a, b, k] = draw(() => [int(r, 2, 6), int(r, 1, 9), int(r, 2, 9)], ([a1, b1, k1]) => k1 !== a1 && allDiffText(lin(k1 - a1, b1), lin(k1 - a1, -b1), lin(k1 + a1, -b1))); return { t: t(`−(${a}x − ${b}) + ${k}x`), text: true, ans: lin(k - a, b), wr: [{ text: lin(k - a, -b), tag: TAGS.minusFirst }, { text: lin(k + a, -b), tag: TAGS.minusDrop }], steps: [`−(${a}x − ${b}) = −${a}x + ${b}`, `−${a}x + ${k}x = ${term(k - a, 'x')} → ${lin(k - a, b)}`], why: { [TAGS.minusFirst]: `−${b}의 부호도 바꿔 +${b}예요.`, [TAGS.minusDrop]: '괄호 앞 −를 빠뜨렸어요.' }, probe: { ask: 'calc' } }; })(),
      ]));
      return calcAsk(r, c, this, runFamily(r, c, fams));
    },
    misread(r, c) {
      if (branchOf(r, c, ['minus', 'neg']) === 'minus') {
        const [a, b, k, d] = draw(() => [int(r, 3, 9), int(r, 1, 9), int(r, 2, 8), int(r, 1, 9)], ([a1, b1, k1, d1]) => a1 > k1 && allDiffText(lin(a1 - k1, b1 + d1), lin(a1 - k1, b1 - d1), lin(a1 + k1, b1 - d1)));
        return misAsk(r, c, this, 'minus', {
          q: `일차식을 계산해요.\n\n${showWork(`(${a}x + ${b}) − (${k}x − ${d}) = ${lin(a - k, b - d)}`)}`,
          ok: `괄호 앞 −는 모든 항의 부호를 바꿔요 — ${lin(a - k, b + d)}`,
          wr: [{ text: '맞게 말했어요', tag: RIGHT_AS_WRONG }, { text: lin(a + k, b - d), tag: TAGS.minusAsPlus }, { text: '괄호끼리는 뺄 수 없어요', tag: OFF }],
          steps: [`−(${k}x − ${d}) = −${term(k, 'x')} + ${d}`, `${a}x − ${term(k, 'x')} + ${b} + ${d} = ${lin(a - k, b + d)}`],
          whyAny: '괄호 앞 −를 첫째 항에만 적용했어요. 둘째 항의 부호도 바뀌어요.',
          probe: { ask: 'minus', a, b, k, d },
        });
      }
      const b = int(r, 2, 9);
      return misAsk(r, c, this, 'neg', {
        q: `괄호를 풀어요.\n\n${showWork(`−(x − ${b}) = −x − ${b}`)}`,
        ok: `괄호 안 모든 항의 부호가 바뀌어요 — −x + ${b}`,
        wr: [{ text: '맞게 말했어요', tag: RIGHT_AS_WRONG }, { text: `x − ${b}`, tag: TAGS.minusDrop }, { text: '괄호 앞에는 −를 쓸 수 없어요', tag: OFF }],
        steps: ['−(x − ' + b + ') = (−1) × x + (−1) × (−' + b + ')', `−x + ${b}`],
        whyAny: '−를 첫째 항에만 적용했어요. 괄호 안 모든 항의 부호를 바꿔요.',
        probe: { ask: 'neg', b },
      });
    },
  },

  {
    id: 'exp.apply', grade: 7, name: '⭐ 문자와 식 활용', needs: ['exp.addsub'],
    idea: '배운 것을 섞어요 — 도형의 둘레를 식으로 나타내고, 빼서 나온 식에서 거꾸로 **어떤 식**을 찾을 때는 더해요. 분수 꼴 일차식은 **통분**해서 분자끼리 계산해요((x + 1)/2 + x/3 = (3x + 3 + 2x)/6 = (5x + 3)/6). 규칙을 식으로 세우면 큰 수도 바로 구해요.',
    rule: '거꾸로는 더해서 · 분수 꼴은 통분해서 분자끼리.',
    slip: '통분할 때 분자에도 곱했는지, 거꾸로 할 때 더했는지 봐요.',
    calc(r, c) {
      const fams = [];
      fams.push(famOf([
        (() => { const [a, b] = draw(() => [int(r, 1, 9), int(r, 2, 9)], ([a1, b1]) => allDiffText(lin(2, 2 * a1 + 2 * b1), lin(1, a1 + b1), lin(2, a1 + b1))); return { t: `가로가 (x + ${a}) cm, 세로가 ${b} cm인 직사각형이 있어요.\n\n둘레를 x를 사용한 ${FORMULA}`, text: true, ans: lin(2, 2 * a + 2 * b), wr: [{ text: lin(1, a + b), tag: TAGS.halfPerim }, { text: lin(2, a + b), tag: TAGS.distribFirst }], steps: [`둘레 = 2 × (가로 + 세로) = 2(x + ${a} + ${b})`, `2(x + ${a + b}) = ${lin(2, 2 * a + 2 * b)}`], why: { [TAGS.halfPerim]: '가로 하나, 세로 하나만 더했어요. 둘레는 그 두 배예요.', [TAGS.distribFirst]: '괄호 안 모든 항에 2를 곱해요.' }, probe: { ask: 'perim', a, b }, rule: '둘레 = 2 × (가로 + 세로) — 괄호 안 모든 항에 2를 곱해요.' }; })(),
      ]));
      fams.push(famOf([
        (() => { const [a, b, k, d] = draw(() => [int(r, 2, 9), int(r, 1, 9), int(r, 2, 9), int(r, 1, 9)], ([a1, b1, k1, d1]) => a1 !== k1 && allDiffText(lin(a1 + k1, d1 - b1), lin(k1 - a1, d1 + b1), lin(a1 + k1, d1 + b1))); return { t: `어떤 식 A가 있어요.\n\nA − (${a}x − ${b}) = ${k}x + ${d}일 때, A는 어느 것일까요?`, text: true, ans: lin(a + k, d - b), wr: [{ text: lin(k - a, d + b), tag: TAGS.invSub }, { text: lin(a + k, d + b), tag: TAGS.minusFirst }], steps: [`A = (${k}x + ${d}) + (${a}x − ${b})`, `x끼리 ${a + k}x, 수끼리 ${d} − ${b} = ${num(d - b)} → ${lin(a + k, d - b)}`], why: { [TAGS.invSub]: '뺀 것을 되돌리려면 더해요.', [TAGS.minusFirst]: `${a}x − ${b}를 더할 때 −${b}의 부호는 그대로예요.`.replace(` ${b}를`, ` ${jn(b, '을', '를')}`) }, probe: { ask: 'inv', a, b, k, d }, rule: '뺀 것을 되돌리려면 더해요 — 더할 때 괄호 안 부호는 그대로.' }; })(),
      ]));
      fams.push(famOf([
        (() => { const [a, b] = draw(() => [int(r, 1, 9), int(r, 1, 9)], ([a1, b1]) => 3 * a1 - 2 * b1 !== 0 && allDiffText(lin(5, 3 * a1 - 2 * b1), lin(2, a1 - b1), lin(5, a1 - b1)) && 3 * a1 - 2 * b1 !== a1 - b1); return { t: `${CALC}\n\n**(x + ${a})/2 + (x − ${b})/3**`, text: true, ans: `(${lin(5, 3 * a - 2 * b)})/6`, wr: [{ text: `(${lin(2, a - b)})/5`, tag: TAGS.numerAdd }, { text: `(${lin(5, a - b)})/6`, tag: TAGS.noLCD }], steps: [`분모 6으로 통분 — (3(x + ${a}) + 2(x − ${b}))/6`, `(3x + ${3 * a} + 2x − ${2 * b})/6 = (${lin(5, 3 * a - 2 * b)})/6`], why: { [TAGS.numerAdd]: '분모끼리 더하면 안 돼요. 통분해서 분자끼리 계산해요.', [TAGS.noLCD]: '분모에 곱한 수를 분자 전체에도 곱해요.' }, probe: { ask: 'frac', a, b }, rule: '분수 꼴은 통분해서 — 분모에 곱한 수를 분자 전체에 곱해요.' }; })(),
      ]));
      fams.push(famOf([
        (() => { const k = int(r, 5, 20); return { t: `성냥개비로 정사각형을 옆으로 이어 붙여요. 정사각형 1개에는 성냥개비 4개, 하나 늘 때마다 3개씩 더 들어요.\n\n정사각형 ${k}개를 만들려면 성냥개비가 몇 개 필요할까요?`, ans: String(3 * k + 1), wr: [{ text: String(4 * k), tag: TAGS.allFour }, { text: String(3 * k), tag: TAGS.dropStart }], steps: ['정사각형 n개 → 처음 1개 + 3개씩 n번 = 3n + 1', `n = ${k}: 3 × ${k} + 1 = ${3 * k + 1}`], why: { [TAGS.allFour]: '이어 붙이면 변 하나를 같이 써요 — 4개씩이 아니에요.', [TAGS.dropStart]: '맨 처음 세운 1개를 빠뜨렸어요.' }, probe: { ask: 'match', k, per: 3 }, rule: '처음 하나 + 하나 늘 때마다 같은 수씩 — 규칙을 식으로 세우면 큰 수도 바로 구해요.' }; })(),
        (() => { const k = int(r, 5, 20); return { t: `성냥개비로 삼각형을 옆으로 이어 붙여요. 삼각형 1개에는 성냥개비 3개, 하나 늘 때마다 2개씩 더 들어요.\n\n삼각형 ${k}개를 만들려면 성냥개비가 몇 개 필요할까요?`, ans: String(2 * k + 1), wr: [{ text: String(3 * k), tag: TAGS.allFour }, { text: String(2 * k), tag: TAGS.dropStart }], steps: ['삼각형 n개 → 처음 1개 + 2개씩 n번 = 2n + 1', `n = ${k}: 2 × ${k} + 1 = ${2 * k + 1}`], why: { [TAGS.allFour]: '이어 붙이면 변 하나를 같이 써요 — 3개씩이 아니에요.', [TAGS.dropStart]: '맨 처음 세운 1개를 빠뜨렸어요.' }, probe: { ask: 'match', k, per: 2 }, rule: '처음 하나 + 하나 늘 때마다 같은 수씩 — 규칙을 식으로 세우면 큰 수도 바로 구해요.' }; })(),
      ]));
      return calcAsk(r, c, this, runFamily(r, c, fams));
    },
    misread(r, c) {
      if (branchOf(r, c, ['frac', 'inv']) === 'frac') {
        const [a, b] = draw(() => [int(r, 1, 9), int(r, 1, 9)], ([a1, b1]) => 3 * a1 - 2 * b1 !== 0 && 3 * a1 - 2 * b1 !== a1 - b1 && a1 !== b1);
        return misAsk(r, c, this, 'frac', {
          q: `일차식을 계산해요.\n\n${showWork(`(x + ${a})/2 + (x − ${b})/3 = (${lin(2, a - b)})/5`)}`,
          ok: `통분해서 분자끼리 — (${lin(5, 3 * a - 2 * b)})/6`,
          wr: [{ text: '맞게 말했어요', tag: RIGHT_AS_WRONG }, { text: `(${lin(5, a - b)})/6`, tag: TAGS.noLCD }, { text: '분수 꼴 일차식은 더할 수 없어요', tag: OFF }],
          steps: [`분모 6으로 통분 — (3(x + ${a}) + 2(x − ${b}))/6`, `(${lin(5, 3 * a - 2 * b)})/6`],
          whyAny: '분자끼리, 분모끼리 더했어요. 분수의 덧셈처럼 통분해요.',
          probe: { ask: 'frac', a, b },
          rule: '분수 꼴은 통분해서 — 분모에 곱한 수를 분자 전체에 곱해요.',
        });
      }
      const [a, b, k, d] = draw(() => [int(r, 2, 9), int(r, 1, 9), int(r, 2, 9), int(r, 1, 9)], ([a1, b1, k1, d1]) => a1 !== k1 && allDiffText(lin(a1 + k1, d1 - b1), lin(k1 - a1, d1 + b1), lin(a1 + k1, d1 + b1)));
      return misAsk(r, c, this, 'inv', {
        q: `어떤 식 A가 있어요. A − (${a}x − ${b}) = ${k}x + ${d}\n\n${showWork(`A = ${k}x + ${d} − (${a}x − ${b}) = ${lin(k - a, d + b)}`)}`,
        ok: `뺀 것을 되돌리려면 더해요 — A = ${lin(a + k, d - b)}`,
        wr: [{ text: '맞게 말했어요', tag: RIGHT_AS_WRONG }, { text: `A = ${lin(a + k, d + b)}`, tag: TAGS.minusFirst }, { text: 'A는 구할 수 없어요', tag: OFF }],
        steps: [`A = (${k}x + ${d}) + (${a}x − ${b})`, lin(a + k, d - b)],
        whyAny: '거꾸로 할 때 또 뺐어요. 뺀 것을 되돌리려면 더해요.',
        probe: { ask: 'inv', a, b, k, d },
        rule: '뺀 것을 되돌리려면 더해요 — 더할 때 괄호 안 부호는 그대로.',
      });
    },
  },
];

export function conceptById(id) {
  return EXPR.find((c) => c.id === id) || null;
}

// ───────────────────── 문항 만들기 (mathsolid와 같은 모양) ─────────────────────

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
const SLIP = '한 번 더 천천히 — 부호와 괄호를 먼저 봐요.';

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
  return diagnosticOf(EXPR, makeQuestion, seed, n, opts);
}
export function placeFrom(answers) {
  return placeFromOf(EXPR, answers);
}
export function ladder(doneIds) {
  return ladderOf(EXPR, doneIds);
}

// ───────────────────── 사람이 쓴 내용 검사 (check.mjs가 부른다) ─────────────────────

function badPlaceholders(txt) {
  const leak = String(txt || '').match(/\{[^}]*\}/g) || [];
  return leak.filter((l) => !/^\{(me|mon|mon2)(\/[^/}]+\/[^}]+)?\}$/.test(l));
}
function fracValue(text) {
  const v = valueOf(text);
  if (v === null) return null;
  return { n: Math.round(v * 10000), d: 10000 };
}

/**
 * coach/math/expr.json 형식 검사 — mathsolid.checkContent와 같은 규칙 (그림 지시문은 이 줄기에 없다)
 * @returns {string[]}
 */
export function checkContent(content) {
  const bad = [];
  for (const c of EXPR) {
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

// Q 일차방정식 줄기(mathequ.js)도 같은 부품을 쓴다 — 한쪽으로만 불러온다(서로 불러오면 모듈 평가 순서 때문에 죽는다)
export const _kit = { famOf, runFamily, calcAsk, misAsk, jfix, choices, textChoices, branchOf, showWork, step, jn, term, poly, lin, num, RIGHT_AS_WRONG, OFF };
