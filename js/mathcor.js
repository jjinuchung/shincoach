// 🔢 수학 — H 규칙과 대응 줄기 (초4 「규칙 찾기」 → 초5 1학기 「규칙과 대응」):
// 개념 사다리 + 문제 생성기 + 내용 형식 검사. 순수 함수만 — 화면 없음 (node 테스트에서 그대로 돈다).
// v289 (2026-10-18): 4-1 「규칙 찾기」에서 비어 있던 계산식 배열 · 등호 · ⭐ 활용 세 칸을 4학년 칸 뒤에 더했다 (아래 "4학년 「규칙 찾기」 새 칸").
//
// 왜 이 줄기인가 (2026-09-30, 아버님 "다음 줄기로 규칙과 대응 만들어보자"): F 비례식, 중1 정비례, D 문자와 식(x·y)이
// "두 양의 대응 관계를 식으로 쓴다"를 안다고 치는데 가르치는 칸이 없었다. 글자 D는 문자와 식 몫, G까지 썼으므로 H.
//
// 오답은 아이가 실제로 하는 틀린 생각 흉내다:
//   · ★ 표에서 **옆으로 늘어나는 수**를 대응 규칙으로 봄 (△가 4씩 커지니까 △ = □ + 4 — 실은 □ × 4)
//   · 첫 칸만 보고 규칙을 정함 (1 → 4니까 + 3) · □와 △를 거꾸로 씀 (□ = △ × 4)
//   · 거꾸로 구할 때 같은 셈 (△ = □ × 6, △ 72 → 72 × 6) · 차이가 그대로인 관계를 배로 봄 (함께 오르는 레벨)
//   · 통나무 도막 수 = 자른 횟수 · 곱해 가는 수 배열을 더하기로 봄 · 몇 번째를 한 칸 밀려 셈
//
// 새 줄기의 함정(메모 stem-generator-pitfalls)을 처음부터:
//   · 🔁 쌍둥이 틀 이름(tplKey)이 수에 따라 갈리지 않게 — 몇 번째는 **숫자**("10번째"), 표는 칸 수·? 자리 고정,
//     물건 이야기(탁자·상자…)·도시는 `pickFor`로 요청한 틀의 것을 다시 고른다
//   · 대응표·도형 배열은 **문제 글 안의 그림 지시문**([table …] [steps …]) — ❓ 복사문·테스트가 글에서 표를 읽는다
//   · ② 갈래는 요청(want)을 따르고, 진단 보기가 그 예에서 우연히 맞는 말이 되지 않게
//   · 이름표는 값만이 아니라 **방향**까지 (앞으로/거꾸로·어느 양이 큰가)
//
// ★ 답은 테스트가 문제 글·표·그림 지시문을 **직접 읽어** 규칙을 따로 찾고 다시 푼다.

import { figureSvg } from './mathdraw.js';
import { rng, shuffle, fill, castOf, worldPick, ask, solve, int, pick, pickFamily, humanQuestion, checkHuman, diagnosticOf, placeFromOf, ladderOf, josa, numJosa } from './mathgen.js';
import { gradeLabel, valueOf as numValue } from './mathmix.js';

export { gradeLabel };

// ───────────────────── 글자 ─────────────────────

const L = (arr) => arr.join(', ');
const range = (n, f) => Array.from({ length: n }, (_, i) => f(i));

/**
 * 보기 글자 → 값 (겹침 검사용). 식("△ = □ × 4")·문장 보기는 null — mathmix.valueOf는 수가 하나뿐인 글에서
 * 그 수를 값으로 읽으므로 "△ = □ × 4"와 "△ = □ + 4"가 같은 4로 보여 한쪽이 버려진다
 */
export function valueOf(text) {
  const s = String(text == null ? '' : text).trim();
  if (/[□△]/.test(s)) return null;
  if (/[가-힣]/.test(s.replace(/(개|대|마리|번째|번|시)$/, ''))) return null;
  return numValue(s);
}
const sameValue = (a, b) => a !== null && b !== null && Math.abs(a - b) < 1e-9;

// ── 조사 — 수 뒤에서는 읽는 소리로. □(네모)·△(세모)는 받침이 없어 가·를·는·와·라고 ──
const BAT = new Set(['0', '1', '3', '6', '7', '8']);
const lastDigit = (t) => String(t).replace(/\D+$/, '').slice(-1);
/** 수 글자 + 조사 (이/가·을/를·은/는·과/와·이에요/예요·이라서/라서…) */
function jn(t, withB, without) {
  const s = String(t);
  return s + (BAT.has(lastDigit(s)) ? withB : without);
}
/** 수 글자 + (으)로 — ㄹ받침(1·7·8) 뒤에는 '로' */
function ro(t) {
  const s = String(t);
  return s + numJosa(Number(lastDigit(s)), '으로', '로');
}
/** 낱말 + 조사 (탁자가·몬스터볼이·방콕은) */
const jw = (w, a, b) => w + josa(w, a, b);

// ───────────────────── 보기 ─────────────────────

/** 정답 근처의 "계산 실수" — 보기가 모자랄 때만 (자연수 답) */
function nearOf(answer, k) {
  const v = Number(answer); const st = [1, -1, 2, -2, 3, -3, 5, -5][k % 8];
  return Number.isInteger(v) && v + st > 0 ? String(v + st) : '';
}
/** 수 보기 4개 — 정답 + 오개념 오답. 글자·값이 같은 보기는 넣지 않는다 */
function choices(r, answer, wrongs) {
  const list = [{ text: String(answer), ok: true }];
  const vals = [valueOf(answer)];
  const seen = new Set([String(answer)]);
  const dup = (t) => { const v = valueOf(t); return seen.has(String(t)) || (v !== null && vals.some((x) => sameValue(x, v))); };
  const add = (t, tag) => { seen.add(String(t)); vals.push(valueOf(t)); list.push({ text: String(t), ok: false, tag }); };
  for (const w of wrongs) {
    if (!w || w.text === undefined || w.text === '' || Number(w.text) <= 0 || dup(w.text) || list.length >= 4) continue;
    add(w.text, w.tag);
  }
  for (let k = 0; list.length < 4 && k < 30; k++) {
    const alt = nearOf(answer, k);
    if (alt && !dup(alt)) add(alt, '계산 실수');
  }
  return shuffle(r, list);
}
/** 식·문장 보기 — 근처 수로 채우지 않는다 (채운 식이 우연히 표에 맞으면 답이 둘이 된다) */
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

/** ② 갈래 고르기 — 🔁 쌍둥이·🤔 오답 노트가 요청한 갈래를 먼저 (Codex 12차 P1, 다른 줄기와 같은 규칙) */
function branchOf(r, c, names) {
  const want = c && c.want && c.want.startsWith('misread:') ? c.want.slice(8) : '';
  if (names.includes(want)) return want;
  const fresh = names.filter((n) => !(c && c.recent && c.recent.includes(`misread:${n}`)));
  return pick(r, fresh.length ? fresh : names);
}
/** 요청한 틀(want)에 든 물건·도시를 다시 고른다 — 무작위로 새로 뽑으면 🔁 쌍둥이가 다른 틀로 간다 (mathrat pickFor) */
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
const MIS_OK = '오개념을 옳다고 함';

/** 이 줄기의 오개념 이름표 (📊·🤔 노트에 그대로 뜬다) */
export const TAGS = {
  addForMul: '곱하는 규칙을 더하기로 봄',        // 3, 6, 12, 24 → 27 · 탁자 5개면 의자 5 + 4
  growDiff: '늘어나는 차이를 못 봄',             // 3, 6, 12, 24 → 36 (마지막 차이 12를 또 더함)
  mulForAdd: '더하는 규칙을 곱하기로 봄',        // 표 1 → 4를 보고 × 4 (실은 + 3)
  offByOne: '몇 번째를 한 칸 밀려 셈',           // 10번째 = 처음 수 + 늘어나는 수 × 10
  nextOnly: '바로 다음 것만 구함',
  stepTimesPos: '늘어나는 수에 순서를 바로 곱함', // 10번째 = 늘어나는 수 × 10 — "처음 수를 빠뜨림"이면 × 9가 된다 (Codex 15차 #1)
  wrongDir: '커지는지 작아지는지 거꾸로 봄',
  countAsStep: '놓인 수를 늘어나는 수로 봄',      // 1번째 모양 5개 → "5개씩 늘어요"
  stepAsRule: '옆으로 늘어나는 수를 대응 규칙으로 봄', // ★ △가 4씩 커지니까 △ = □ + 4
  firstPairOnly: '첫 칸만 보고 규칙을 정함',      // 1 → 4니까 △ = □ + 3
  swapDir: '두 양을 거꾸로 봄',                  // □ = △ × 4 · 방콕이 서울보다 늦다 · 도막 수 + 1번
  noFollow: '한 양이 변해도 다른 양은 그대로라고 봄',
  noInverse: '거꾸로 구할 때 같은 셈을 함',       // △ = □ × 6, △ 72 → 72 × 6
  wrongInverse: '반대 셈을 잘못 고름',           // △ = □ × 6, △ 72 → 72 − 6
  halfInverse: '거꾸로 셈을 반만 함',            // △ = □ × 2 + 1, △ 21 → 21 − 1 (나누기를 빠뜨림)
  propForAdd: '차이가 그대로인데 배로 늘어난다고 봄', // 레벨 4·7 → 12·21
  sameCount: '두 양이 같다고 봄',                // 도막 12개 → 12번 자름
  dropAdd: '더하는 수를 빠뜨림',                 // △ = □ × 2 + 1을 □ × 2
  firstAsMul: '1번째 모양 수를 곱함',            // 1번째가 3개 → 10번째 30개
  // 4학년 「규칙 찾기」 새 칸 (v289) — 2022 4-1 지도서의 오류 표 그대로 (천재 박만구 379쪽·한대희 306쪽·비상 410쪽)
  ruleIgnored: '규칙은 안 보고 결과만 맞춤',      // 32 × 12 = 384 … 넷째에 16 × 24 = 384를 씀 (결과가 같은 식을 고름)
  oneSide: '한쪽 수만 바꿈',                     // 더해지는 수만 바꾸고 더하는 수는 그대로
  digitCount: '자리 수를 잘못 셈',               // 37 × 15 = 5555
  keepGrows: '두 수가 함께 변해도 결과가 변한다고 봄', // 100 − 1, 101 − 2 … 차도 커진다고
  resultAsBox: '등호 뒤에 계산 결과를 씀',        // 8 + 4 = □ + 5 → 12 (등호를 "답을 쓰라"는 표시로)
  sumAll: '모든 수를 더함',                      // 8 + 4 = □ + 5 → 17
  sameWay: '두 수를 같은 쪽으로 고침',            // 38 + 17 = □ + 15 → 36 (덧셈은 반대쪽으로 고쳐야)
  addLogicSub: '덧셈 논리를 뺄셈에 씀',           // 97 − 63 = □ − 62 → 98
  copyOne: '한 수를 그대로 옮김',                // □에 보이는 수 하나를 그대로
  pairMix: '짝을 잘못 지음',                     // 두 친구의 수를 섞어 더함
  lastDiff: '마지막 차이만 봄',                  // 1, 3, 6, 10 → 14
  digitAsOrder: '자리 숫자를 순서로 봄',          // 9999 ÷ 99 = 101 → 아홉째
};

// ───────────────────── 이야기 재료 ─────────────────────

/** 곱하는 대응 관계 이야기 — 한 개마다 똑같이 몇 개씩 (k는 물건마다 말이 되는 수만) */
const FRAMES = [
  { x: '탁자', xc: '개', y: '의자', yc: '개', ks: [4, 6], line: (k) => `탁자 1개에 의자가 ${k}개씩 있어요.` },
  { x: '상자', xc: '개', y: '몬스터볼', yc: '개', ks: [4, 6, 8, 10, 12], line: (k) => `상자 1개에 몬스터볼이 ${k}개씩 들어 있어요.` },
  { x: '세발자전거', xc: '대', y: '바퀴', yc: '개', ks: [3], line: (k) => `세발자전거 1대에 바퀴가 ${k}개씩 있어요.` },
  { x: '문어', xc: '마리', y: '다리', yc: '개', ks: [8], line: (k) => `문어 1마리에 다리가 ${k}개씩 있어요.` },
  { x: '봉지', xc: '개', y: '사탕', yc: '개', ks: [3, 4, 5, 6, 7, 8, 9, 10, 11, 12], line: (k) => `봉지 1개에 사탕이 ${k}개씩 들어 있어요.` },
];
const frameFor = (r, c, list = FRAMES) => pickFor(r, c, list, (F, w) => w.includes(F.x) && w.includes(F.y));
/**
 * 문항 속 수가 k 하나뿐인 틀(관계 문장·이야기로 식 세우기)은 k가 여럿인 이야기만 — 문어(8)·세발자전거(3)로 내면
 * 🔁 쌍둥이가 원래 문제와 글자까지 똑같이 나온다 (헤드리스가 잡음: "문어 1마리에 다리가 8개씩" 쌍둥이)
 */
const MANY_K = FRAMES.filter((F) => F.ks.length >= 4);

/** 시차 — 서머타임이 없는 도시만 (서울 UTC+9 · 방콕 +7 · 베이징 +8 · 두바이 +4) */
const CITIES = [{ name: '방콕', g: 2 }, { name: '베이징', g: 1 }, { name: '두바이', g: 5 }];

/** 처음 수 a와 늘어나는 수 d — a = d면 "d × n"이 우연히 정답이라 다르게 */
function startStep(r) {
  let a = int(r, 2, 9); const d = int(r, 2, 9);
  if (a === d) a = a === 9 ? 2 : a + 1;
  return [a, d];
}
/** 도형 배열 1번째 블록 수 s와 늘어나는 수 d — s = d면 "처음 수를 빠뜨림"이 정답과 같아진다 */
function shapeStart(r) {
  let s = int(r, 1, 6); const d = int(r, 2, 5);
  if (s === d) s = s === 6 ? 1 : s + 1;
  return [s, d];
}

// ───────────────────── 문항 마무리 (출연진 이름을 글·보기·풀이에 모두 채운다) ─────────────────────

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

// ───────────────────── 4학년 「규칙 찾기」 새 칸 재료 (v289 — 계산식 배열 · 등호 · ⭐ 활용) ─────────────────────
// 2022 개정 4-1 (천재 한대희 6단원·박만구 5단원·비상 6단원 — 세 종 모두 4-1) [4수02-02]·[4수02-03].
// 성취기준 적용 시 고려 사항대로: 등호(동치 관계)는 **두 자리 수**, 덧셈·뺄셈만(천재 두 종과 같게) · 혼합 계산식·일반항 식은 쓰지 않는다.
// 차례 말은 교과서대로 "첫째 … 다섯째 · 몇째" (H1·H2의 "10번째"와 다르다) — 틀 글에서는 물을 차례를 틀마다 고정(쌍둥이 열쇠).
// 오답은 지도서의 오류 표 그대로: 등호를 "답을 쓰라"는 표시로 봄(8 + 4 = □ + 5에 12) · 모든 수를 더함(17) ·
// 덧셈 논리를 뺄셈에(97 − 63 = □ − 62에 98) · 등호로 계산을 이어 씀(98 − 55 = 43 + 29 = 72) · 규칙 대신 결과만 맞는 식 · 마지막 차이만 봄(1, 3, 6, 10 → 14).

const ORD = ['첫째', '둘째', '셋째', '넷째', '다섯째', '여섯째', '일곱째', '여덟째', '아홉째', '열째'];
/** 1 → 첫째 */
const ord = (n) => ORD[n - 1];
/** 계산식 줄 — 한 줄에 하나씩 굵게 */
const rowsText = (rows) => rows.map((t) => `**${t}**`).join('\n');
const CALC_HEAD = '규칙적인 계산식을 늘어놓았어요.\n\n';
const CALC_RULE = '계산식의 배열은 수마다 따로 — 한 줄에 얼마씩 변하는지, 변하지 않는 수는 무엇인지 본다.';

/** 백의 자리 수가 1씩, 더하는 수가 1씩 커지는 덧셈식 (천재 140쪽 101 + 10 = 111 꼴) — i줄(0부터): (h + i)·100 + u + (b + i) */
function addRows(r, hLo = 1, hHi = 3) {
  const h = int(r, hLo, hHi); const u = int(r, 1, 9); const b = int(r, 11, 38);
  const x = (i) => (h + i) * 100 + u; const y = (i) => b + i;
  return { h, u, b, x, y, s: (i) => x(i) + y(i), line: (i) => `${x(i)} + ${y(i)} = ${x(i) + y(i)}` };
}
/** 같은 숫자로 된 곱 — 37 × 3 = 111 · 101 × 11 = 1111 (k줄의 곱은 숫자 k가 len개) */
const REP = [{ a: 37, m: 3, len: 3 }, { a: 101, m: 11, len: 4 }];
const repOf = (k, len) => Number(String(k).repeat(len));

/** H3 ㉮ 다섯째(여섯째)에 알맞은 덧셈식 — 오답도 셈은 맞는 식(결과만 맞음 · 한쪽만 바꿈 · 한 줄 밀림) */
function nextAddFam(r, n) {
  const R = addRows(r); const i = n - 1;
  const ok = R.line(i);
  const shiftI = n === 5 ? i + 1 : i - 1;
  return { words: true, ans: ok, wr: [
      { text: `${R.x(i) + 1} + ${R.y(i) - 1} = ${R.s(i)}`, tag: TAGS.ruleIgnored },
      { text: `${R.x(i)} + ${R.y(i - 1)} = ${R.x(i) + R.y(i - 1)}`, tag: TAGS.oneSide },
      { text: R.line(shiftI), tag: n === 5 ? TAGS.offByOne : TAGS.nextOnly }],
    why: {
      [TAGS.ruleIgnored]: `계산 결과 ${jn(R.s(i), '은', '는')} 맞지만 규칙에 맞는 식이 아니에요. 더해지는 수의 일의 자리는 늘 ${jn(R.u, '이고', '고')}, ${ord(n)} 더하는 수는 ${jn(R.y(i), '이에요', '예요')}.`,
      [TAGS.oneSide]: `더해지는 수만 바꿨어요. 더하는 수도 한 줄마다 1씩 커지니까 ${ord(n)}에는 ${jn(R.y(i), '을', '를')} 더해요.`,
      [TAGS.offByOne]: '그건 여섯째 덧셈식이에요. 넷째 바로 다음이 다섯째예요.',
      [TAGS.nextOnly]: '그건 다섯째 덧셈식이에요. 여섯째까지 한 줄 더 가야 해요.',
    },
    steps: [`더해지는 수: ${R.x(0)} → ${R.x(1)} → ${R.x(2)} — 백의 자리 수가 1씩 커져요`, `더하는 수: ${R.y(0)} → ${R.y(1)} → ${R.y(2)} — 1씩 커져요`, `${ord(n)}: ${ok}`],
    rule: CALC_RULE,
    pools: { pokemon: [`${CALC_HEAD}${rowsText([0, 1, 2, 3].map(R.line))}\n\n${ord(n)}에 알맞은 덧셈식은 어느 것일까요?`] } };
}
/** H3 ㉯ 같은 숫자로 된 곱 — 다섯째(여섯째) 계산 결과 짐작 (37 × 3 = 111 · 101 × 11 = 1111) */
function repFam(r, n) {
  const P = pick(r, REP); const s = int(r, 1, 10 - n); // k = s … s + n − 1 ≤ 9
  const line = (i) => `${P.a} × ${P.m * (s + i)} = ${repOf(s + i, P.len)}`;
  const K = s + n - 1; const ans = repOf(K, P.len);
  const shift = n === 5 ? (K + 1 <= 9 ? { text: String(repOf(K + 1, P.len)), tag: TAGS.offByOne } : null) : { text: String(repOf(K - 1, P.len)), tag: TAGS.nextOnly };
  return { ans: String(ans), wr: [{ text: String(repOf(K, P.len - 1)), tag: TAGS.digitCount }, { text: String(repOf(K, P.len + 1)), tag: TAGS.digitCount }, shift],
    why: {
      [TAGS.digitCount]: `계산 결과는 늘 같은 숫자 ${P.len}개예요 — ${P.len}자리 그대로, 숫자만 한 줄마다 1씩 커져요.`,
      [TAGS.offByOne]: '그건 여섯째 계산 결과예요. 넷째 바로 다음이 다섯째예요.',
      [TAGS.nextOnly]: '그건 다섯째 계산 결과예요. 여섯째까지 한 줄 더 가야 해요.',
    },
    steps: [`곱하는 수: ${P.m * s} → ${P.m * (s + 1)} → ${P.m * (s + 2)} — ${P.m}씩 커져요`, `계산 결과: 같은 숫자 ${P.len}개 — 그 숫자가 1씩 커져요`, `${ord(n)}: ${P.a} × ${P.m * K} = ${ans}`],
    rule: CALC_RULE,
    pools: { pokemon: [`${CALC_HEAD}${rowsText([0, 1, 2, 3].map(line))}\n\n${ord(n)} 계산식의 계산 결과는 얼마일까요?`] } };
}
/** H3 ㉰ 차(합)가 그대로인 배열 — 다섯째 식의 □ (비상 100 − 1 = 99, 101 − 2 = 99 … · 박만구 200 + 150 = 350, 210 + 140 = 350 …) */
function keepFam(r, op) {
  const t = pick(r, [1, 2, 5, 10]); const A = int(r, 120, 480);
  const B = op === '−' ? int(r, 11, 99) : int(r, 10 + 4 * t, 99);
  const keep = op === '−' ? A - B : A + B;
  const bOf = (i) => (op === '−' ? B + t * i : B - t * i);
  const rows = [0, 1, 2, 3].map((i) => `${A + t * i} ${op} ${bOf(i)} = ${keep}`);
  const fifth = `${A + 4 * t} ${op} ${bOf(4)}`;
  const sub = op === '−';
  return { ans: String(keep), wr: [{ text: String(keep + 4 * t), tag: TAGS.keepGrows }, { text: String(keep + t), tag: TAGS.keepGrows }],
    why: { [TAGS.keepGrows]: sub
      ? `빼지는 수와 빼는 수가 똑같이 ${t}씩 커지면 차는 변하지 않아요 — 늘 ${jn(keep, '이에요', '예요')}.`
      : `더해지는 수가 ${t}씩 커지는 만큼 더하는 수가 ${t}씩 작아져서 합은 변하지 않아요 — 늘 ${jn(keep, '이에요', '예요')}.` },
    steps: [`${sub ? '빼지는' : '더해지는'} 수: ${A} → ${A + t} → ${A + 2 * t} — ${t}씩 커져요`, `${sub ? '빼는' : '더하는'} 수: ${bOf(0)} → ${bOf(1)} → ${bOf(2)} — ${t}씩 ${sub ? '커져요' : '작아져요'}`, `${sub ? '차' : '합'}는 늘 그대로: ${fifth} = ${keep}`],
    rule: sub ? '빼지는 수와 빼는 수가 똑같이 커지면 차는 그대로다.' : '더해지는 수가 커진 만큼 더하는 수가 작아지면 합은 그대로다.',
    pools: { pokemon: [`${CALC_HEAD}${rowsText(rows)}\n\n다섯째 ${sub ? '뺄셈식' : '덧셈식'} **${fifth} = □**에서 □에 알맞은 수는 얼마일까요?`] } };
}
/** H3 ㉱ 거꾸로 — 계산 결과가 ○○이 되는 덧셈식 (천재 140쪽 "계산 결과가 616이 되는 덧셈식") · 보기는 식의 왼쪽만 */
function findAddFam(r) {
  const R = addRows(r); const i = pick(r, [5, 6]); const S = R.s(i);
  const ok = `${R.x(i)} + ${R.y(i)}`;
  return { words: true, ans: ok, wr: [
      { text: `${R.x(i) + 1} + ${R.y(i) - 1}`, tag: TAGS.ruleIgnored },
      { text: `${R.x(i)} + ${R.y(i - 1)}`, tag: TAGS.oneSide },
      { text: `${R.x(i - 1)} + ${R.y(i - 1)}`, tag: TAGS.offByOne }],
    why: {
      [TAGS.ruleIgnored]: `두 수의 합은 ${jn(S, '이지만', '지만')} 규칙에 맞는 식이 아니에요. 더해지는 수의 일의 자리는 늘 ${jn(R.u, '이에요', '예요')}.`,
      [TAGS.oneSide]: `${R.x(i)} + ${R.y(i - 1)} = ${jn(R.x(i) + R.y(i - 1), '이라서', '라서')} ${jn(S, '이', '가')} 아니에요. 더하는 수도 한 줄마다 1씩 커져요.`,
      [TAGS.offByOne]: `그건 ${ord(i)} 덧셈식이라 계산 결과가 ${jn(R.s(i - 1), '이에요', '예요')}.`,
    },
    steps: [`계산 결과: ${R.s(0)} → ${R.s(1)} → ${R.s(2)} — 101씩 커져요`, `${jn(S, '은', '는')} ${ord(i + 1)} 계산 결과예요`, `${ord(i + 1)} 덧셈식: ${ok} = ${S}`],
    rule: CALC_RULE,
    pools: { pokemon: [`${CALC_HEAD}${rowsText([0, 1, 2, 3].map(R.line))}\n\n규칙에 따라 계산 결과가 ${S}인 덧셈식은 어느 것일까요?`] } };
}

const EQ_RULE = '등호(=)는 양쪽의 크기가 같다는 뜻 — 덧셈은 한 수가 커진 만큼 다른 수가 작아져야, 뺄셈은 두 수가 같은 쪽으로 변해야 그대로다.';
/** 수 n과 차이 k를 말로 — "5 작아요" · "5 커요" */
const moreLess = (k, dir) => `${k} ${dir > 0 ? '커요' : '작아요'}`;

/** H4 ㉮ a + b = □ + d (side 'L') · a + b = c + □ ('R') — 두 자리 수, 한쪽이 k 변한 만큼 □는 반대로 */
function boxAddFam(r, side) {
  const a = int(r, 15, 79); const b = int(r, 15, 79); const k = int(r, 1, 5); const dir = pick(r, [1, -1]);
  // L: d = b − dir·k (더하는 수가 k 작아지면 □는 a보다 k 크다) · R: c = a + dir·k (더해지는 수가 k 커지면 □는 b보다 k 작다)
  const L = side === 'L';
  const shownN = L ? b - dir * k : a + dir * k;
  const ans = L ? a + dir * k : b - dir * k;
  const keep = L ? b : a; const boxed = L ? a : b;          // 바뀐 수의 원래 값 · □ 자리의 원래 값
  const eq = L ? `${a} + ${b} = □ + ${shownN}` : `${a} + ${b} = ${shownN} + □`;
  const moved = L ? -dir : dir;                              // 보이는 수가 원래보다 커졌나(1) 작아졌나(−1)
  return { ans: String(ans), wr: [{ text: String(a + b), tag: TAGS.resultAsBox }, { text: String(a + b + shownN), tag: TAGS.sumAll }, { text: String(boxed - (ans - boxed)), tag: TAGS.sameWay }],
    why: {
      [TAGS.resultAsBox]: `${jn(a + b, '은', '는')} 왼쪽 ${a} + ${b}의 계산 결과예요. 등호는 "답을 쓰라"는 표시가 아니라 양쪽 크기가 같다는 뜻이에요.`,
      [TAGS.sumAll]: `보이는 수를 모두 더했어요. 오른쪽 식의 크기가 ${a} + ${jn(b, '과', '와')} 같아지는 □를 찾아요.`,
      [TAGS.sameWay]: `${jn(shownN, '은', '는')} ${keep}보다 ${moreLess(k, moved)}. 덧셈에서 합이 그대로이려면 □는 ${boxed}보다 ${k} ${moved > 0 ? '작아야' : '커야'} 해요 — 같은 쪽으로 고치면 합이 ${2 * k}만큼 달라져요.`,
    },
    steps: [`${jn(shownN, '은', '는')} ${keep}보다 ${moreLess(k, moved)}`, `크기가 같으려면 □는 ${boxed}보다 ${k} ${moved > 0 ? '작아야' : '커야'} 해요 — □는 ${boxed} ${moved > 0 ? '−' : '+'} ${k} = ${ans}`, `확인: ${a} + ${b} = ${a + b}, ${L ? `${ans} + ${shownN}` : `${shownN} + ${ans}`} = ${a + b}`],
    rule: EQ_RULE,
    pools: { pokemon: [`**${eq}**\n\n□에 알맞은 수는 얼마일까요?`] } };
}
/** H4 ㉯ a − b = □ − d — 빼는 수가 k 변한 만큼 □도 같은 쪽으로 (덧셈 논리를 뺄셈에 쓰면 98) */
function boxSubFam(r) {
  const a = int(r, 40, 94); const b = int(r, 15, a - 20); const k = int(r, 1, 5); const dir = pick(r, [1, -1]);
  const d = b + dir * k; const ans = a + dir * k;
  return { ans: String(ans), wr: [{ text: String(a - b), tag: TAGS.resultAsBox }, { text: String(a - dir * k), tag: TAGS.addLogicSub }, { text: String(a), tag: TAGS.copyOne }],
    why: {
      [TAGS.resultAsBox]: `${jn(a - b, '은', '는')} 왼쪽 ${a} − ${b}의 계산 결과예요. 등호는 양쪽 크기가 같다는 뜻 — □ − ${jn(d, '이', '가')} ${jn(a - b, '이', '가')} 되는 수를 찾아요.`,
      [TAGS.addLogicSub]: `덧셈처럼 반대쪽으로 고쳤어요. 뺄셈은 빼는 수가 ${k} ${dir > 0 ? '커지면' : '작아지면'} 빼지는 수도 ${k} ${dir > 0 ? '커져야' : '작아져야'} 차가 그대로예요.`,
      [TAGS.copyOne]: `${jn(a, '을', '를')} 그대로 옮겼어요. 빼는 수가 ${b}에서 ${ro(d)} 바뀌었으니 빼지는 수도 바뀌어야 해요.`,
    },
    steps: [`${jn(d, '은', '는')} ${b}보다 ${moreLess(k, dir)}`, `차가 같으려면 빼지는 수도 ${k} ${dir > 0 ? '커져야' : '작아져야'} 해요 — □는 ${a} ${dir > 0 ? '+' : '−'} ${k} = ${ans}`, `확인: ${a} − ${b} = ${a - b}, ${ans} − ${d} = ${a - b}`],
    rule: EQ_RULE,
    pools: { pokemon: [`**${a} − ${b} = □ − ${d}**\n\n□에 알맞은 수는 얼마일까요?`] } };
}
/** H4 ㉰ 옳은 식 고르기 — 정답 하나만 참, 오답 셋은 일부러 틀린 식(같은 쪽으로 · 한쪽만 · 결과 뒤에 붙임 / 뺄셈은 덧셈 논리) */
function judgeFam(r, op) {
  const k = int(r, 1, 5); const c = int(r, 1, 9);
  let a; let b;
  if (op === '+') { a = int(r, 15, 60); b = int(r, 15, 99 - a); if (b < 15) b = 15; } else { a = int(r, 40, 94); b = int(r, 15, a - 20); }
  const sub = op === '−';
  const left = `${a} ${op} ${b}`; const val = sub ? a - b : a + b;
  const ok = sub ? `${left} = ${a + k} − ${b + k}` : `${left} = ${a + k} + ${b - k}`;
  const wr = sub
    ? [{ text: `${left} = ${a + k} − ${b - k}`, tag: TAGS.addLogicSub }, { text: `${left} = ${a + k} − ${b}`, tag: TAGS.oneSide }, { text: `${left} = ${val} + ${c}`, tag: TAGS.resultAsBox }]
    : [{ text: `${left} = ${a + k} + ${b + k}`, tag: TAGS.sameWay }, { text: `${left} = ${a + k} + ${b}`, tag: TAGS.oneSide }, { text: `${left} = ${val} + ${c}`, tag: TAGS.resultAsBox }];
  return { words: true, ans: ok, wr,
    why: {
      [TAGS.sameWay]: `두 수를 모두 ${k}씩 키우면 합이 ${2 * k}만큼 커져요 — ${a + k} + ${b + k} = ${jn(a + b + 2 * k, '이에요', '예요')}.`,
      [TAGS.addLogicSub]: `빼는 수를 ${k} 줄이고 빼지는 수를 ${k} 늘리면 차가 ${2 * k}만큼 커져요 — ${a + k} − ${b - k} = ${jn(a - b + 2 * k, '이에요', '예요')}.`,
      [TAGS.oneSide]: sub ? `빼지는 수만 ${k} 키우면 차도 ${k} 커져요 — ${a + k} − ${b} = ${jn(a - b + k, '이에요', '예요')}.` : `한 수만 ${k} 키우면 합도 ${k} 커져요 — ${a + k} + ${b} = ${jn(a + b + k, '이에요', '예요')}.`,
      [TAGS.resultAsBox]: `등호 바로 뒤에 왼쪽의 계산 결과 ${jn(val, '을', '를')} 쓰고 수를 더 붙였어요. 그러면 오른쪽은 ${val} + ${c} = ${jn(val + c, '이라서', '라서')} 왼쪽과 크기가 달라요.`,
    },
    steps: [`왼쪽: ${left} = ${val}`, sub ? `${a + k} − ${b + k} = ${val} — 두 수가 똑같이 ${k}씩 커지면 차는 그대로예요` : `${a + k} + ${b - k} = ${val} — 한 수가 ${k} 커진 만큼 다른 수가 ${k} 작아졌어요`, `옳은 식: ${ok}`],
    rule: EQ_RULE,
    pools: { pokemon: [`${a} ${op} ${jn(b, '과', '와')} 크기가 같은 것을 등호로 바르게 나타낸 식은 어느 것일까요?`] } };
}
/** H4 ㉱ 이야기 속 크기가 같은 두 양을 등호로 (천재 "같은 값을 나타내는 두 카드" · 비상 짧은 글) */
function storyFam(r) {
  const a = int(r, 12, 45); const b = int(r, 12, 45); const S = a + b;
  // 다른 짝 c + d — c가 a·b면 같은 짝이 된다 (S ≥ 24라 10 … S − 10에 늘 다른 수가 남는다)
  let c = int(r, 10, S - 10);
  for (let t = 0; t < 30 && (c === a || c === b); t++) c = int(r, 10, S - 10);
  if (c === a || c === b) c = [10, 11, 12].find((v) => v !== a && v !== b);
  const d = S - c; const x = int(r, 1, 9);
  const ok = `${a} + ${b} = ${c} + ${d}`;
  return { words: true, ans: ok, wr: [
      { text: `${a} + ${c} = ${b} + ${d}`, tag: TAGS.pairMix },
      { text: `${a} + ${b} = ${S} + ${x}`, tag: TAGS.resultAsBox },
      { text: `${a} + ${b} + ${c} + ${d}`, tag: TAGS.sumAll }],
    why: {
      [TAGS.pairMix]: '{mon}의 스티커끼리, {mon2}의 스티커끼리 더해야 해요 — 두 친구의 스티커를 섞어 더했어요.',
      [TAGS.resultAsBox]: `등호 바로 뒤에 왼쪽의 계산 결과 ${jn(S, '을', '를')} 썼어요. 오른쪽에는 {mon2/이/가} 모은 ${c}장과 ${d}장을 더한 식이 와야 해요.`,
      [TAGS.sumAll]: '넷을 모두 더하면 둘이 모은 스티커를 합친 수예요. "수가 같다"는 것은 등호로 양쪽을 이어야 나타낼 수 있어요.',
    },
    steps: [`{mon}: ${a} + ${b} = ${S}`, `{mon2}: ${c} + ${d} = ${S}`, `크기가 같으니 등호로 이어요: ${ok}`],
    rule: '크기가 같은 두 양은 등호(=)로 이어 하나의 식으로 나타낸다.',
    pools: { pokemon: [`{mon/은/는} 스티커를 ${a}장과 ${b}장 모았고, {mon2/은/는} ${c}장과 ${d}장 모았어요. 둘이 모은 스티커 수는 같아요.\n\n이것을 등호를 써서 바르게 나타낸 식은 어느 것일까요?`] } };
}

/** ⭐ ㉮ 차이가 점점 커지는 수 배열 — 일곱째 수 (박만구 지도서 1, 3, 6, 10 → 14 오류) */
function growFam(r) {
  const a = int(r, 1, 9); const d = int(r, 1, 4); const e = pick(r, [1, 1, 2]);
  const vs = [a]; for (let i = 0; i < 6; i++) vs.push(vs[i] + d + e * i);
  const last = d + 3 * e;
  return { ans: String(vs[6]), wr: [{ text: String(vs[5]), tag: TAGS.nextOnly }, { text: String(vs[4] + 2 * last), tag: TAGS.lastDiff }],
    why: {
      [TAGS.nextOnly]: `${jn(vs[5], '은', '는')} 바로 다음 여섯째 수예요. 일곱째까지 한 번 더 가야 해요.`,
      [TAGS.lastDiff]: `마지막 차이 ${jn(last, '을', '를')} 두 번 더했어요. 차이가 ${e}씩 커지니까 다음 차이는 ${d + 4 * e}, 그다음은 ${jn(d + 5 * e, '이에요', '예요')}.`,
    },
    steps: [`이웃한 수의 차이: ${L([0, 1, 2, 3].map((i) => d + e * i))} — 차이가 ${e}씩 커져요`, `여섯째: ${vs[4]} + ${d + 4 * e} = ${vs[5]}`, `일곱째: ${vs[5]} + ${d + 5 * e} = ${vs[6]}`],
    rule: '차이가 점점 커지는 수 배열은 차이의 규칙부터 찾는다.',
    pools: { pokemon: [`규칙에 따라 수를 늘어놓았어요.\n\n**${L(vs.slice(0, 5))}, …**\n\n이 규칙대로라면 일곱째 수는 얼마일까요?`] } };
}
/** 나눗셈 배열 둘 — 1111 × k ÷ 11 × k = 101 (비상 142쪽) · 111 × k ÷ 37 = 3 × k (지도서 37 × 3 = 111을 거꾸로) */
const DIVROWS = [
  { line: (k) => `${1111 * k} ÷ ${11 * k} = 101`, lead: (k) => 1111 * k },
  { line: (k) => `${111 * k} ÷ 37 = ${3 * k}`, lead: (k) => 111 * k },
];
/** ⭐ ㉯ 몇째 계산식일까 — 첫째가 k = s(3·4)부터라 앞의 숫자 K ≠ 차례 (비상 "9999 ÷ 99 = 101은 몇째?") */
function orderDivFam(r) {
  const P = pick(r, DIVROWS); const s = pick(r, [3, 4]); const K = int(r, s + 5, 9); const n = K - s + 1;
  return { ans: String(n), wr: [{ text: String(K), tag: TAGS.digitAsOrder }, { text: String(n - 1), tag: TAGS.offByOne }, { text: String(n + 1), tag: TAGS.offByOne }],
    why: {
      [TAGS.digitAsOrder]: `${ro(K)} 된 수라서 ${ord(K)}라고 봤어요. 첫째가 ${P.lead(s)}에서 시작하니까 첫째부터 세어요.`,
      [TAGS.offByOne]: `첫째부터 한 줄씩 세어 봐요 — ${jn(P.line(s), '이', '가')} 첫째예요.`,
    },
    steps: [`첫째는 ${P.line(s)} — 앞의 수가 ${P.lead(1)}씩 커져요`, `${P.lead(s)}에서 ${P.lead(K)}까지 ${K - s}줄 더 가요`, `첫째에서 ${K - s}줄 뒤 → ${ord(n)} (${n})`],
    rule: '몇째인지는 첫째가 무엇인지부터 보고 센다.',
    // 굵은 식 뒤에 조사를 붙이지 않는다 — "**…**은/는"은 틀 열쇠(tplKey)가 지우지 못해 🔁 쌍둥이가 다른 틀로 간다
    pools: { pokemon: [`${CALC_HEAD}${rowsText([0, 1, 2, 3].map((i) => P.line(s + i)))}\n\n규칙에 따라 계산식을 계속 늘어놓을 때, 몇째 계산식이 **${P.line(K)}**일까요?`] } };
}
/** ⭐ ㉰ 계산 결과가 ○○인 덧셈식은 몇째 — 백의 자리 숫자 ≠ 차례 (첫째가 3백·4백부터) */
function orderAddFam(r) {
  const R = addRows(r, 3, 4); const i = int(r, 5, 9 - R.h); const S = R.s(i); const n = i + 1;
  return { ans: String(n), wr: [{ text: String(R.h + i), tag: TAGS.digitAsOrder }, { text: String(n - 1), tag: TAGS.offByOne }, { text: String(n + 1), tag: TAGS.offByOne }],
    why: {
      [TAGS.digitAsOrder]: `더해지는 수의 백의 자리 숫자 ${jn(R.h + i, '을', '를')} 차례로 봤어요. 첫째의 백의 자리 숫자가 ${jn(R.h, '이라서', '라서')} 차례와 달라요.`,
      [TAGS.offByOne]: `첫째부터 한 줄씩 세어 봐요 — 계산 결과가 101씩 커지니까 ${R.s(0)}에서 ${S}까지 ${i}줄이에요.`,
    },
    steps: [`계산 결과: ${R.s(0)} → ${R.s(1)} → ${R.s(2)} — 101씩 커져요`, `${S} − ${R.s(0)} = ${S - R.s(0)}, 101이 ${i}번 → 첫째에서 ${i}줄 뒤`, `${ord(n)} (${n}) — ${R.line(i)}`],
    rule: '몇째인지는 첫째가 무엇인지부터 보고 센다.',
    pools: { pokemon: [`${CALC_HEAD}${rowsText([0, 1, 2, 3].map(R.line))}\n\n규칙에 따라 덧셈식을 계속 늘어놓을 때, 계산 결과가 ${S}인 덧셈식은 몇째일까요?`] } };
}
/** ⭐ ㉱ 등호 두 걸음 — 같은 부분 찾기 (비상 지도서 심화 58 + 13 + 17 = □ + 30 · 79 − □ = 79 − 50 − 8) */
function groupAddFam(r) {
  const T = pick(r, [30, 40, 50, 60]); let b = int(r, 11, T - 11); if (b % 10 === 0) b += 1; const c = T - b;
  // 같은 수가 두 번 나오면(18 + 18 + 42) 어느 둘을 묶는지 헷갈린다 — a는 b·c와 다르게
  let a = int(r, 12, 69); for (let t = 0; t < 30 && (a === b || a === c); t++) a = int(r, 12, 69);
  if (a === b || a === c) a = [12, 13, 14].find((v) => v !== b && v !== c);
  return { ans: String(a), wr: [{ text: String(a + T), tag: TAGS.resultAsBox }, { text: String(a + 2 * T), tag: TAGS.sumAll }],
    why: {
      [TAGS.resultAsBox]: `${jn(a + T, '은', '는')} 왼쪽의 계산 결과예요. 오른쪽 □ + ${jn(T, '이', '가')} 그만큼이 되는 □를 찾아요.`,
      [TAGS.sumAll]: `보이는 수를 모두 더했어요. ${b} + ${c} = ${jn(T, '이라서', '라서')} 왼쪽은 ${a} + ${jn(T, '과', '와')} 크기가 같아요.`,
    },
    steps: [`같은 부분 찾기: ${b} + ${c} = ${T}`, `왼쪽은 ${a} + ${jn(T, '과', '와')} 크기가 같아요`, `${a} + ${T} = □ + ${T} → □는 ${a}`],
    rule: '등호 양쪽에서 같은 부분을 먼저 찾으면 계산이 짧아진다.',
    pools: { pokemon: [`**${a} + ${b} + ${c} = □ + ${T}**\n\n□에 알맞은 수는 얼마일까요?`] } };
}
function groupSubFam(r) {
  const b = pick(r, [20, 30, 40, 50]); const c = int(r, 1, 9); const a = int(r, b + c + 12, 99);
  return { ans: String(b + c), wr: [{ text: String(a - b - c), tag: TAGS.resultAsBox }, { text: String(b), tag: TAGS.copyOne }],
    why: {
      [TAGS.resultAsBox]: `${jn(a - b - c, '은', '는')} 오른쪽의 계산 결과예요. ${a}에서 □를 한 번 빼서 그 수가 되는 □를 찾아요.`,
      [TAGS.copyOne]: `${b}만 빼면 ${jn(c, '을', '를')} 덜 빼요 — ${jn(b, '과', '와')} ${jn(c, '을', '를')} 모두 빼야 해요.`,
    },
    steps: [`오른쪽: ${a}에서 ${jn(b, '을', '를')} 빼고 또 ${jn(c, '을', '를')} 빼요`, `${jn(b, '과', '와')} ${jn(c, '을', '를')} 한꺼번에 빼는 것과 같아요 — ${b} + ${c} = ${b + c}`, `□는 ${b + c}`],
    rule: '등호 양쪽에서 같은 부분을 먼저 찾으면 계산이 짧아진다.',
    pools: { pokemon: [`**${a} − □ = ${a} − ${b} − ${c}**\n\n□에 알맞은 수는 얼마일까요?`] } };
}

// ───────────────────── 개념 사다리 (H. 규칙과 대응 줄기) ─────────────────────

export const CORRESPOND = [
  {
    id: 'cor.numseq', grade: 4, name: '수 배열의 규칙', needs: [],
    idea: '늘어놓은 수에서 **규칙**을 찾아요. 이웃한 두 수의 **차이**부터 구해 봐요 — 차이가 늘 같으면 그만큼 더하는(빼는) 규칙, 차이가 점점 커지면 **곱하는** 규칙인지 봐요.',
    slip: '이웃한 수끼리 차이를 모두 구해서, 늘 같은지부터 봐요.',
    calc(r, c) {
      // ㉮ 몇 번째 수 (더하는 규칙)
      const [a, d] = startStep(r); const n = int(r, 8, 12);
      const t4 = range(4, (i) => a + i * d); const nth = a + (n - 1) * d;
      // ㉯ 곱하는 규칙의 다음 수 — 다섯째 수가 200을 넘지 않게
      const k = pick(r, [2, 2, 3]); const g0 = k === 2 ? int(r, 1, 6) : int(r, 1, 2);
      const gs = range(4, (i) => g0 * Math.pow(k, i)); const gNext = g0 * Math.pow(k, 4);
      const gd = [gs[1] - gs[0], gs[2] - gs[1], gs[3] - gs[2]];
      // ㉰ 줄어드는 규칙의 가운데 빈칸 — 다섯째 수가 1 이상
      const e = int(r, 3, 12); const top = int(r, 5 * e, 5 * e + 30);
      const ds = range(5, (i) => top - i * e);
      // ㉱ 규칙 말하기
      const [a2, d2] = startStep(r);
      const ws = range(5, (i) => a2 + i * d2);
      const say = `${a2}부터 시작해서 ${d2}씩 커져요`;
      const fams = [
        { ans: String(nth), wr: [{ text: String(a + n * d), tag: TAGS.offByOne }, { text: String(n * d), tag: TAGS.stepTimesPos }, { text: String(a + 4 * d), tag: TAGS.nextOnly }],
          why: {
            [TAGS.offByOne]: `1번째 수가 벌써 ${jn(a, '이에요', '예요')}. ${n}번째까지는 ${jn(d, '을', '를')} ${n - 1}번만 더해요.`,
            [TAGS.stepTimesPos]: `늘어나는 수 ${d}에 순서 ${jn(n, '을', '를')} 바로 곱했어요. 1번째가 ${jn(a, '이니까', '니까')} ${a}에서 ${jn(d, '을', '를')} ${n - 1}번 더해요.`,
            [TAGS.nextOnly]: `${jn(a + 4 * d, '은', '는')} 바로 다음 5번째 수예요. ${n}번째까지 더 가야 해요.`,
          },
          steps: [`이웃한 수의 차이: ${d}씩 커져요`, `1번째 ${a}에서 ${n}번째까지 ${jn(d, '을', '를')} ${n - 1}번 더해요`, `${a} + ${d} × ${n - 1} = ${nth}`],
          rule: '몇 번째 수 = 처음 수 + 늘어나는 수 × (몇 번째 − 1).',
          pools: { pokemon: [
            `규칙에 따라 수를 늘어놓았어요.\n\n**${L(t4)}, …**\n\n이 규칙대로라면 ${n}번째 수는 얼마일까요?`,
            `{mon/이/가} 모은 나무열매를 날마다 세어 보니 ${L(t4)}, …처럼 늘어나요. 이대로라면 ${n}번째 날에는 모두 몇 개일까요?`,
          ] } },
        { ans: String(gNext), wr: [{ text: String(gs[3] + gd[0]), tag: TAGS.addForMul }, { text: String(gs[3] + gd[2]), tag: TAGS.growDiff }],
          why: {
            [TAGS.addForMul]: `처음 차이 ${gd[0]}만 보고 더했어요. 차이가 ${ro(L(gd))} 커지니까 같은 수를 계속 더하는 규칙이 아니라 ${k}씩 곱하는 규칙이에요.`,
            [TAGS.growDiff]: `차이도 ${k}배씩 커져요 — 다음 차이는 ${jn(gd[2], '이', '가')} 아니라 ${jn(gNext - gs[3], '이에요', '예요')}.`,
          },
          steps: [`이웃한 수의 차이: ${L(gd)} — 차이가 점점 커져요`, `앞의 수에 ${jn(k, '을', '를')} 곱하면 다음 수: ${gs[0]} × ${k} = ${gs[1]}`, `${gs[3]} × ${k} = ${gNext}`],
          rule: '차이가 점점 커지면 곱하는 규칙인지 확인한다.',
          pools: { pokemon: [`규칙에 따라 수를 늘어놓았어요.\n\n**${L(gs)}, □**\n\n□에 알맞은 수는 얼마일까요?`] } },
        { ans: String(ds[2]), wr: [{ text: String(ds[1] + e), tag: TAGS.wrongDir }],
          why: { [TAGS.wrongDir]: `이 수들은 ${e}씩 **작아져요**. ${ds[1]}에서 ${jn(e, '을', '를')} 빼야 해요.` },
          steps: [`${ds[0]} → ${ds[1]}: ${e}씩 작아져요`, `${ds[1]} − ${e} = ${ds[2]}`, `확인: ${ds[2]} − ${e} = ${ds[3]}`],
          rule: '빈칸 앞뒤의 수로 규칙이 맞는지 확인한다.',
          pools: { pokemon: [`규칙에 따라 수를 늘어놓았어요.\n\n**${ds[0]}, ${ds[1]}, □, ${ds[3]}, ${ds[4]}**\n\n□에 알맞은 수는 얼마일까요?`] } },
        { words: true, ans: say, wr: [
            { text: `${a2}부터 시작해서 ${d2}씩 곱해요`, tag: TAGS.mulForAdd },
            { text: `${a2}부터 시작해서 ${a2 + d2}씩 커져요`, tag: TAGS.countAsStep },
            { text: `${a2}부터 시작해서 ${d2}씩 작아져요`, tag: TAGS.wrongDir }],
          why: {
            [TAGS.mulForAdd]: `${a2} × ${d2} = ${jn(a2 * d2, '이라서', '라서')} 둘째 수 ${jn(ws[1], '이', '가')} 안 나와요. ${jn(d2, '을', '를')} 더하는 규칙이에요.`,
            [TAGS.countAsStep]: `${jn(a2 + d2, '은', '는')} 둘째 수예요. 늘어나는 수는 차이 ${ws[1]} − ${ws[0]} = ${jn(d2, '이에요', '예요')}.`,
            [TAGS.wrongDir]: `수가 ${ro(L(ws.slice(0, 3)))} 점점 커지고 있어요.`,
          },
          steps: [`처음 수: ${a2}`, `차이: ${ws[1]} − ${ws[0]} = ${d2}, ${ws[2]} − ${ws[1]} = ${d2}`, `→ ${say}`],
          rule: '규칙은 "처음 수 + 늘어나는 수"로 말한다.',
          pools: { pokemon: [`**${L(ws)}**\n\n이 수 배열의 규칙을 바르게 말한 것은 어느 것일까요?`] } },
      ];
      return finish(this.id, r, c, pickFamily(r, c, fams));
    },
    misread(r, c) {
      if (branchOf(r, c, ['mul', 'nth']) === 'mul') {
        const k = pick(r, [2, 2, 3]); const g0 = k === 2 ? int(r, 1, 6) : int(r, 1, 2);
        const gs = range(4, (i) => g0 * Math.pow(k, i)); const right = g0 * Math.pow(k, 4);
        const gd = [gs[1] - gs[0], gs[2] - gs[1], gs[3] - gs[2]]; const shown = gs[3] + gd[0];
        return finishMis(this.id, 'mul', r, c, {
          q: `규칙에 따라 수를 늘어놓았어요: ${L(gs)}, □\n\n${showWork(`□는 ${jn(shown, '이에요', '예요')} — ${gd[0]}씩 커지니까요`)}`,
          ok: `차이가 ${ro(L(gd))} 커져요 — ${k}씩 곱하면 ${right}`,
          wr: [
            { text: '맞게 말했어요', tag: RIGHT_AS_WRONG },
            { text: `마지막 차이 ${gd[2]}만큼 커져서 □는 ${jn(gs[3] + gd[2], '이에요', '예요')}`, tag: TAGS.growDiff },
            { text: '수가 커지면 언제나 같은 수만큼 더하는 규칙이에요', tag: MIS_OK },
          ],
          steps: [`이웃한 수의 차이: ${L(gd)} — 점점 커져요`, `${k}씩 곱하는 규칙: ${gs[3]} × ${k} = ${right}`],
          whyAny: `처음 차이 ${gd[0]}만 보고 더했어요. 차이가 커지는 수 배열은 곱하는 규칙인지 봐요.`,
          rule: '차이가 점점 커지면 곱하는 규칙인지 확인한다.',
          probe: { seq: gs, shown },
        });
      }
      const [a, d] = startStep(r); const n = int(r, 8, 12);
      const t4 = range(4, (i) => a + i * d); const right = a + (n - 1) * d; const shown = a + d * n;
      return finishMis(this.id, 'nth', r, c, {
        q: `규칙에 따라 수를 늘어놓았어요: ${L(t4)}, …\n\n${showWork(`${n}번째 수는 ${a} + ${d} × ${n} = ${jn(shown, '이에요', '예요')}`)}`,
        ok: `${jn(d, '을', '를')} ${n - 1}번만 더해요 — ${a} + ${d} × ${n - 1} = ${right}`,
        wr: [
          { text: '맞게 말했어요', tag: RIGHT_AS_WRONG },
          { text: `늘어나는 수에 순서를 곱해서 ${d} × ${n} = ${jn(d * n, '이에요', '예요')}`, tag: TAGS.stepTimesPos },
          { text: `${n}번째 수는 늘어놓지 않아서 알 수 없어요`, tag: OFF },
        ],
        steps: [`1번째가 ${a} — ${n}번째까지 ${d}씩 ${n - 1}번 커져요`, `${a} + ${d} × ${n - 1} = ${right}`],
        whyAny: `1번째 수 ${jn(a, '을', '를')} 이미 셌는데 ${jn(d, '을', '를')} ${n}번 더했어요 — 한 번 많아요.`,
        rule: '몇 번째 수 = 처음 수 + 늘어나는 수 × (몇 번째 − 1).',
        probe: { seq: t4, nth: n, shown },
      });
    },
  },

  {
    id: 'cor.shapeseq', grade: 4, name: '도형 배열의 규칙', needs: ['cor.numseq'],
    idea: '모양이 하나씩 늘어날 때 **블록이 몇 개씩 늘어나는지** 찾아요. 1번째 모양의 블록 수에서 시작해서, 늘어나는 수를 (몇 번째 − 1)번 더하면 돼요.',
    slip: '이웃한 두 모양의 블록 수 차이를 먼저 구해 봐요.',
    calc(r, c) {
      const [s, d] = shapeStart(r);
      const cs = range(4, (i) => s + i * d);
      const head = `{mon/이/가} 블록으로 규칙에 따라 모양을 만들었어요.\n\n[steps ${cs.join(' ')}]\n\n`;
      const n = int(r, 7, 12); const nth = s + (n - 1) * d;
      const m = int(r, 6, 12); const M = s + (m - 1) * d;
      const fams = [
        { ans: String(nth), wr: [{ text: String(s + n * d), tag: TAGS.offByOne }, { text: String(n * d), tag: TAGS.stepTimesPos }, { text: String(s + 4 * d), tag: TAGS.nextOnly }],
          why: {
            [TAGS.offByOne]: `1번째가 벌써 ${s}개예요. ${n}번째까지는 ${n - 1}번만 늘어요.`,
            [TAGS.stepTimesPos]: `${d}개씩에 순서 ${jn(n, '을', '를')} 바로 곱했어요. 1번째가 ${s}개라서 ${s}개에서 ${d}개씩 ${n - 1}번 늘어요.`,
            [TAGS.nextOnly]: `${s + 4 * d}개는 바로 다음 5번째 모양이에요. ${n}번째까지 더 가야 해요.`,
          },
          steps: [`블록 수: ${L(cs)} — ${d}개씩 늘어요`, `1번째 ${s}개에서 ${n}번째까지 ${d}개씩 ${n - 1}번 늘어요`, `${s} + ${d} × ${n - 1} = ${nth}개`],
          rule: '몇 번째 모양 = 1번째 블록 수 + 늘어나는 수 × (몇 번째 − 1).',
          pools: { pokemon: [`${head}${n}번째 모양에는 블록이 몇 개일까요?`] } },
        { ans: String(d), wr: [{ text: String(s), tag: TAGS.countAsStep }, { text: String(s + d), tag: TAGS.countAsStep }],
          why: { [TAGS.countAsStep]: `그건 모양 하나의 블록 수예요. 늘어나는 수는 이웃한 두 모양의 차이 ${s + d} − ${s} = ${jn(d, '이에요', '예요')}.` },
          steps: [`블록 수: ${s}개 → ${s + d}개 → ${s + 2 * d}개`, `${s + d} − ${s} = ${d} → ${d}개씩 늘어요`],
          rule: '늘어나는 수 = 이웃한 두 모양의 블록 수 차이.',
          pools: { pokemon: [`${head}모양이 하나씩 늘어날 때마다 블록은 몇 개씩 늘어날까요?`] } },
        { ans: String(m), wr: [{ text: String(m - 1), tag: TAGS.offByOne }, { text: String(m + 1), tag: TAGS.offByOne }, M % d === 0 && M / d !== m ? { text: String(M / d), tag: TAGS.stepTimesPos } : null],
          why: {
            [TAGS.offByOne]: `${d}개씩 ${m - 1}번 늘었으니까 1번째에서 ${m - 1}번 더 간 ${m}번째예요.`,
            [TAGS.stepTimesPos]: `블록 수를 ${d} × 순서로 봤어요. 1번째가 ${s}개라서 먼저 ${s}개를 빼고, ${d}개씩 몇 번 늘었는지 세요.`,
          },
          steps: [`1번째 ${s}개에서 ${d}개씩 늘어요`, `${M} − ${s} = ${M - s}, ${M - s} ÷ ${d} = ${m - 1} → ${m - 1}번 늘었어요`, `1번째에서 ${m - 1}번 더 가면 ${m}번째`],
          rule: '늘어난 횟수 + 1 = 몇 번째.',
          pools: { pokemon: [`${head}블록이 ${M}개인 모양은 몇 번째일까요?`] } },
      ];
      return finish(this.id, r, c, pickFamily(r, c, fams));
    },
    misread(r, c) {
      const [s, d] = shapeStart(r);
      const cs = range(4, (i) => s + i * d);
      const head = `{me/이/가} 블록으로 규칙에 따라 모양을 만들었어요.\n\n[steps ${cs.join(' ')}]\n\n`;
      if (branchOf(r, c, ['nth', 'step']) === 'nth') {
        const n = int(r, 7, 12); const right = s + (n - 1) * d; const shown = s + d * n;
        return finishMis(this.id, 'nth', r, c, {
          q: `${head}${showWork(`${n}번째 모양은 ${d}개씩 ${n}번 늘어서 ${s} + ${d} × ${n} = ${shown}개예요`)}`,
          ok: `1번째가 ${s}개라서 ${n - 1}번만 늘어요 — ${s} + ${d} × ${n - 1} = ${right}개`,
          wr: [
            { text: '맞게 말했어요', tag: RIGHT_AS_WRONG },
            { text: `${d}개씩 ${n}번이니까 ${d} × ${n} = ${d * n}개예요`, tag: TAGS.stepTimesPos },
            { text: '모양이 커질수록 늘어나는 블록 수도 커져요', tag: OFF },
          ],
          steps: [`블록 수: ${L(cs)} — ${d}개씩`, `${s} + ${d} × ${n - 1} = ${right}개`],
          whyAny: `1번째 모양에 이미 ${s}개가 있어요. ${n}번째까지 ${d}개씩 ${n - 1}번만 늘어요.`,
          rule: '몇 번째 모양 = 1번째 블록 수 + 늘어나는 수 × (몇 번째 − 1).',
          probe: { steps: cs, nth: n, shown },
        });
      }
      return finishMis(this.id, 'step', r, c, {
        q: `${head}${showWork(`모양이 하나 늘 때마다 블록이 ${s + d}개씩 늘어나요`)}`,
        ok: `${s}개 → ${s + d}개 → ${s + 2 * d}개 — ${d}개씩 늘어나요`,
        wr: [
          { text: '맞게 말했어요', tag: RIGHT_AS_WRONG },
          { text: `${s}개씩 늘어나요`, tag: TAGS.countAsStep },
          { text: '늘어나는 블록 수는 모양마다 달라요', tag: OFF },
        ],
        steps: [`블록 수: ${L(cs)}`, `이웃한 두 모양의 차이: ${s + d} − ${s} = ${d}`],
        whyAny: `${s + d}개는 2번째 모양의 블록 수예요. 늘어나는 수는 두 모양의 차이예요.`,
        rule: '늘어나는 수 = 이웃한 두 모양의 블록 수 차이.',
        probe: { steps: cs, shownStep: s + d },
      });
    },
  },

  // ── 4학년 「규칙 찾기」 새 칸 셋 (v289, 2026-10-18 아버님 "이대로 진행") — 4-1 계산식의 배열 · 등호 · ⭐ 활용 ──
  // · 5학년 칸(cor.pair)으로 가는 길은 막지 않는다 — cor.pair는 그대로 cor.shapeseq만 필요 · 📏 진단 5문제에서는 뺀다(DIAG)
  // · △와 □·△ 식은 여전히 5학년 칸부터 — 여기의 □는 교과서처럼 빈칸으로만 쓴다
  {
    id: 'cor.calcseq', grade: 4, name: '계산식 배열의 규칙', needs: ['cor.shapeseq'],
    idea: '계산식이 줄지어 있으면 **변하는 수**와 **변하지 않는 수**를 나눠 봐요. 수마다 한 줄에 얼마씩 변하는지 찾으면 다음 계산식과 계산 결과를 계산하기 전에 짐작할 수 있어요.',
    slip: '위아래 계산식에서 수마다 한 줄에 얼마씩 변하는지 먼저 짚어 봐요.',
    calc(r, c) {
      const fams = [nextAddFam(r, 5), nextAddFam(r, 6), repFam(r, 5), repFam(r, 6), keepFam(r, '−'), keepFam(r, '+'), findAddFam(r)];
      return finish(this.id, r, c, pickFamily(r, c, fams));
    },
    misread(r, c) {
      if (branchOf(r, c, ['keep', 'one']) === 'keep') {
        const t = pick(r, [1, 2, 5, 10]); const A = int(r, 120, 480); const B = int(r, 11, 99); const D = A - B;
        const rows = [0, 1, 2, 3].map((i) => `${A + t * i} − ${B + t * i} = ${D}`);
        const shown = D + t;
        return finishMis(this.id, 'keep', r, c, {
          q: `${CALC_HEAD}${rowsText(rows)}\n\n${showWork(`다섯째 계산 결과는 ${jn(shown, '이에요', '예요')} — 빼지는 수가 ${t}씩 커지니까요`)}`,
          ok: `빼는 수도 ${t}씩 커져서 차는 그대로예요 — ${D}`,
          wr: [
            { text: '맞게 말했어요', tag: RIGHT_AS_WRONG },
            { text: '두 수가 커지면 계산 결과도 언제나 커져요', tag: MIS_OK },
            { text: '뺄셈식의 배열에는 규칙이 없어요', tag: OFF },
          ],
          steps: [`빼지는 수: ${A} → ${A + t} → ${A + 2 * t} — ${t}씩 커져요`, `빼는 수: ${B} → ${B + t} → ${B + 2 * t} — ${t}씩 커져요`, `똑같이 커지니까 차는 늘 ${D}`],
          whyAny: `빼지는 수만 봤어요. 빼는 수도 똑같이 ${t}씩 커지면 차는 변하지 않아요.`,
          rule: '빼지는 수와 빼는 수가 똑같이 커지면 차는 그대로다.',
          probe: { keep: D, shown },
        });
      }
      const R = addRows(r);
      const shownEq = `${R.x(4)} + ${R.y(3)} = ${R.x(4) + R.y(3)}`;
      return finishMis(this.id, 'one', r, c, {
        q: `${CALC_HEAD}${rowsText([0, 1, 2, 3].map(R.line))}\n\n${showWork(`다섯째 덧셈식은 ${jn(shownEq, '이에요', '예요')} — 백의 자리 수가 1 커지니까요`)}`,
        ok: `더하는 수도 1씩 커져요 — ${R.line(4)}`,
        wr: [
          { text: '맞게 말했어요', tag: RIGHT_AS_WRONG },
          { text: '계산 결과만 맞으면 어떤 식이든 다섯째가 될 수 있어요', tag: MIS_OK }, // 결과 수를 보기에 쓰면 정답의 결과를 미리 알려 준다
          { text: '다섯째 덧셈식은 넷째와 같아요', tag: OFF },
        ],
        steps: ['더해지는 수: 백의 자리 수가 1씩 커져요', `더하는 수: ${R.y(0)} → ${R.y(1)} → ${R.y(2)} — 1씩 커져요`, `다섯째: ${R.line(4)}`],
        whyAny: '더해지는 수만 바꾸고 더하는 수는 넷째 그대로 두었어요. 더하는 수도 한 줄마다 1씩 커져요.',
        rule: CALC_RULE,
        probe: { shown: shownEq },
      });
    },
  },

  {
    id: 'cor.equal', grade: 4, name: '등호(=)와 크기가 같은 두 양', needs: ['cor.calcseq'],
    idea: '등호(=)는 **왼쪽과 오른쪽의 크기가 같다**는 뜻이에요. "답을 쓰세요"라는 표시가 아니에요. 덧셈에서 한 수가 커진 만큼 다른 수가 작아지면 크기가 그대로예요 — 38 + 17과 40 + 15는 크기가 같아서 38 + 17 = 40 + 15.',
    slip: '등호 양쪽을 따로 계산해서 크기가 같은지 견주어 봐요.',
    calc(r, c) {
      const fams = [boxAddFam(r, 'L'), boxAddFam(r, 'R'), boxSubFam(r), judgeFam(r, '+'), judgeFam(r, '−'), storyFam(r)];
      return finish(this.id, r, c, pickFamily(r, c, fams));
    },
    misread(r, c) {
      const br = branchOf(r, c, ['result', 'sub', 'chain']);
      if (br === 'result') {
        const a = int(r, 15, 79); const b = int(r, 15, 79); const k = int(r, 1, 5); const d = b - k;
        return finishMis(this.id, 'result', r, c, {
          q: showWork(`${a} + ${b} = □ + ${d}에서 □는 ${jn(a + b, '이에요', '예요')}`),
          ok: `등호는 양쪽 크기가 같다는 뜻 — ${jn(d, '은', '는')} ${b}보다 ${k} 작으니 □는 ${a + k}`,
          wr: [
            { text: '맞게 말했어요', tag: RIGHT_AS_WRONG },
            { text: `보이는 수를 모두 더해서 □는 ${jn(a + b + d, '이에요', '예요')}`, tag: TAGS.sumAll },
            { text: '등호 바로 뒤에는 늘 계산 결과를 써요', tag: MIS_OK },
          ],
          steps: [`${a} + ${b} = ${a + b}`, `□ + ${d}도 ${jn(a + b, '이', '가')} 되어야 해요 — □는 ${a + b} − ${d} = ${a + k}`],
          whyAny: '등호를 "답을 쓰라"는 표시로 봤어요. 등호는 양쪽 크기가 같다는 뜻이에요.',
          rule: EQ_RULE,
          probe: { right: a + k, shown: a + b },
        });
      }
      if (br === 'sub') {
        const a = int(r, 40, 94); const b = int(r, 15, a - 20); const k = int(r, 1, 5); const d = b - k;
        return finishMis(this.id, 'sub', r, c, {
          q: showWork(`${a} − ${b} = □ − ${d}에서 □는 ${jn(a + k, '이에요', '예요')} — ${jn(d, '이', '가')} ${b}보다 ${k} 작으니까 □는 ${a}보다 ${k} 커야 해요`),
          ok: `빼는 수가 ${k} 작아지면 빼지는 수도 ${k} 작아져야 차가 같아요 — □는 ${a - k}`,
          wr: [
            { text: '맞게 말했어요', tag: RIGHT_AS_WRONG },
            { text: `□는 ${jn(a - b, '이에요', '예요')} — ${a} − ${b}의 계산 결과니까요`, tag: TAGS.resultAsBox },
            { text: '뺄셈식에는 등호를 쓸 수 없어요', tag: OFF },
          ],
          steps: [`${a} − ${b} = ${a - b}`, `□ − ${d}도 ${jn(a - b, '이', '가')} 되어야 해요 — □는 ${a - b} + ${d} = ${a - k}`],
          whyAny: '덧셈처럼 반대쪽으로 고쳤어요. 뺄셈은 빼는 수와 빼지는 수가 같은 쪽으로 변해야 차가 그대로예요.',
          rule: EQ_RULE,
          probe: { right: a - k, shown: a + k },
        });
      }
      // 등호로 계산을 이어 씀 (박만구 지도서 98 − 55 = 43 + 29 = 72 · 비상 135쪽 17 + 54 = 71 + 4 = 75)
      const a = int(r, 15, 60); const b = int(r, 15, 39); const x = int(r, 2, 9); const S = a + b; const T = S + x;
      return finishMis(this.id, 'chain', r, c, {
        q: `{mon/이/가} ${a} + ${b} + ${jn(x, '을', '를')} 계산하며 이렇게 썼어요.\n\n**${a} + ${b} = ${S} + ${x} = ${T}**\n\n어디가 틀렸을까요?`,
        ok: `${a} + ${jn(b, '과', '와')} ${S} + ${jn(x, '은', '는')} 크기가 달라서 등호로 이을 수 없어요 — ${a} + ${b} = ${S}, ${S} + ${x} = ${T}`,
        wr: [
          { text: '맞게 썼어요', tag: RIGHT_AS_WRONG },
          { text: '계산한 차례대로 등호로 이어 쓰면 돼요', tag: MIS_OK },
          { text: `${a} + ${b} + ${x}의 계산 결과는 ${jn(S, '이에요', '예요')}`, tag: OFF },
        ],
        steps: [`${a} + ${b} = ${S}`, `${S} + ${x} = ${T}`, `${a} + ${jn(b, '은', '는')} ${jn(S, '이고', '고')} ${S} + ${jn(x, '은', '는')} ${jn(T, '이라서', '라서')} 크기가 달라요`],
        whyAny: '등호로 계산을 이어 썼어요. 등호 양쪽은 늘 크기가 같아야 해요 — 계산은 식을 나누어 써요.',
        rule: '등호(=) 양쪽은 늘 크기가 같아야 한다 — 계산을 이어 갈 때는 식을 나누어 쓴다.',
        probe: { chain: [a, b, x] },
      });
    },
  },

  {
    // ⭐ 4학년 활용 — 교과서 심화·마무리 꼴의 두세 걸음 (차이가 커지는 배열 · 몇째 계산식 · 등호의 같은 부분)
    id: 'cor.apply4', grade: 4, name: '⭐ 규칙 찾기 활용', needs: ['cor.equal'],
    idea: '두세 걸음으로 푸는 규칙 문제예요. **차이가 점점 커지는** 수 배열은 차이의 규칙부터 찾고, 계산식이 **몇째**인지는 첫째가 무엇인지부터 봐요. 등호 문제는 양쪽에서 **같은 부분**을 먼저 찾아요.',
    slip: '이 문제에서 무엇을 먼저 찾아야 하는지, 풀이를 한 줄씩 따라가 봐요.',
    calc(r, c) {
      const fams = [growFam(r), orderDivFam(r), orderAddFam(r), groupAddFam(r), groupSubFam(r)];
      return finish(this.id, r, c, pickFamily(r, c, fams));
    },
    misread(r, c) {
      if (branchOf(r, c, ['grow', 'order']) === 'grow') {
        const a = int(r, 1, 9); const d = int(r, 1, 4); const e = pick(r, [1, 1, 2]);
        const vs = [a]; for (let i = 0; i < 6; i++) vs.push(vs[i] + d + e * i);
        const last = d + 3 * e; const shown = vs[4] + 2 * last;
        return finishMis(this.id, 'grow', r, c, {
          q: `규칙에 따라 수를 늘어놓았어요: ${L(vs.slice(0, 5))}, …\n\n${showWork(`일곱째 수는 ${jn(shown, '이에요', '예요')} — 마지막 차이 ${jn(last, '을', '를')} 두 번 더했어요`)}`,
          ok: `차이가 ${e}씩 커져요 — 여섯째 ${vs[5]}, 일곱째 ${vs[6]}`,
          wr: [
            { text: '맞게 말했어요', tag: RIGHT_AS_WRONG },
            { text: '차이는 늘 같아서 마지막 차이를 계속 더하면 돼요', tag: MIS_OK },
            { text: '일곱째 수는 늘어놓지 않아서 알 수 없어요', tag: OFF },
          ],
          steps: [`이웃한 수의 차이: ${L([0, 1, 2, 3].map((i) => d + e * i))} — ${e}씩 커져요`, `여섯째 ${vs[4]} + ${d + 4 * e} = ${vs[5]}, 일곱째 ${vs[5]} + ${d + 5 * e} = ${vs[6]}`],
          whyAny: `차이가 ${e}씩 커지는데 마지막 차이를 그대로 더했어요. 다음 차이도 ${e}만큼 커져요.`,
          rule: '차이가 점점 커지는 수 배열은 차이의 규칙부터 찾는다.',
          probe: { seq: vs.slice(0, 5), shown, right: vs[6] },
        });
      }
      const P = DIVROWS[0]; const s = pick(r, [3, 4]); const K = int(r, s + 5, 9); const n = K - s + 1;
      return finishMis(this.id, 'order', r, c, {
        q: `${CALC_HEAD}${rowsText([0, 1, 2, 3].map((i) => P.line(s + i)))}\n\n${showWork(`${P.line(K)}은 ${ord(K)} 계산식이에요 — ${K}로 된 수니까요`)}`,
        ok: `첫째가 ${jn(P.line(s), '이에요', '예요')} — ${P.line(K)}은 ${ord(n)}`,
        wr: [
          { text: '맞게 말했어요', tag: RIGHT_AS_WRONG },
          { text: '계산식이 몇째인지는 늘 앞의 수의 숫자와 같아요', tag: MIS_OK },
          { text: '나눗셈식은 몇째인지 셀 수 없어요', tag: OFF },
        ],
        steps: [`첫째는 ${P.line(s)}`, `${P.lead(s)}에서 ${P.lead(K)}까지 ${K - s}줄 더 → ${ord(n)}`],
        whyAny: `앞의 수의 숫자 ${jn(K, '을', '를')} 차례로 봤어요. 첫째가 ${P.lead(s)}부터라서 첫째부터 세어야 해요.`,
        rule: '몇째인지는 첫째가 무엇인지부터 보고 센다.',
        probe: { s, K, n },
      });
    },
  },

  {
    id: 'cor.pair', grade: 5, name: '두 양 사이의 관계', needs: ['cor.shapeseq'],
    idea: '한 양이 변할 때 다른 양이 **따라서** 변하는 관계를 **대응 관계**라고 해요. 탁자가 1개 늘면 의자가 4개씩 늘어요 — 의자 수는 늘 탁자 수의 4배예요.',
    slip: '1개일 때, 2개일 때, 3개일 때를 차례로 세어 봐요.',
    calc(r, c) {
      const F = frameFor(r, c); const k = pick(r, F.ks); const N = int(r, 5, 12);
      const X = `${F.x} 수`; const Y = `${F.y} 수`;
      // 관계 문장은 k 말고 수가 없다 — k가 여럿인 이야기로 (문어·세발자전거면 🔁 쌍둥이가 같은 글)
      const G = frameFor(r, c, MANY_K); const kg = pick(r, G.ks);
      const GX = `${G.x} 수`; const GY = `${G.y} 수`;
      const say = `${GY}는 ${GX}의 ${kg}배예요`;
      const s5 = int(r, 1, 3); const xs5 = range(5, (i) => s5 + i); const xq = xs5[2]; // 표 칸 채우기 — 1·2·3 중에서 시작
      const fams = [
        { ans: String(k * N), wr: [{ text: String(N + k), tag: TAGS.addForMul }],
          why: { [TAGS.addForMul]: `${jw(F.x, '이', '가')} 하나 늘 때마다 ${jw(F.y, '이', '가')} ${k}${F.yc}씩 늘어요 — ${N} + ${jn(k, '이', '가')} 아니라 ${N} × ${jn(k, '이에요', '예요')}.` },
          steps: [`${F.x} 1${F.xc}마다 ${F.y} ${k}${F.yc} → ${Y}는 ${X}의 ${k}배`, `${N} × ${k} = ${k * N}${F.yc}`],
          rule: '한 개마다 똑같이 몇 개씩이면 곱하는 대응 관계.',
          pools: { pokemon: [`${F.line(k)} ${jw(F.x, '이', '가')} ${N}${F.xc}면 ${jw(F.y, '은', '는')} 모두 몇 ${F.yc}일까요?`] } },
        { words: true, ans: say, wr: [
            { text: `${GY}는 ${GX}보다 ${kg} 많아요`, tag: TAGS.addForMul },
            { text: `${GX}는 ${GY}의 ${kg}배예요`, tag: TAGS.swapDir },
            { text: `${jw(G.x, '이', '가')} 늘어도 ${GY}는 그대로예요`, tag: TAGS.noFollow }],
          why: {
            [TAGS.addForMul]: `${G.x} 2${G.xc}면 ${jw(G.y, '은', '는')} ${2 * kg}${G.yc} — 2보다 ${kg} 많은 ${2 + kg}${G.yc}가 아니에요.`,
            [TAGS.swapDir]: `거꾸로 말했어요. 더 많은 쪽은 ${jw(G.y, '이에요', '예요')} — ${GY}가 ${GX}의 ${kg}배.`,
            [TAGS.noFollow]: `${jw(G.x, '이', '가')} 하나 늘면 ${G.y}도 ${kg}${G.yc} 늘어요 — 따라서 변해요.`,
          },
          steps: [`${G.x} 1${G.xc} → ${G.y} ${kg}${G.yc}, ${G.x} 2${G.xc} → ${G.y} ${2 * kg}${G.yc}, ${G.x} 3${G.xc} → ${G.y} ${3 * kg}${G.yc}`, `→ ${say}`],
          rule: '한 양이 변할 때 다른 양이 어떻게 따라 변하는지를 말한다.',
          pools: { pokemon: [`${G.line(kg)}\n\n${GX}와 ${GY} 사이의 대응 관계를 바르게 말한 것은 어느 것일까요?`] } },
        // 표 칸 채우기도 수가 k와 시작 칸뿐 — k가 여럿인 이야기로, 표는 1·2·3 중에서 시작
        { ans: String(xq * kg), wr: [{ text: String(xq + kg), tag: TAGS.addForMul }],
          why: { [TAGS.addForMul]: `표를 보면 ${GY}는 ${GX}의 ${kg}배예요 — ${xq} + ${jn(kg, '이', '가')} 아니라 ${xq} × ${jn(kg, '이에요', '예요')}.` },
          steps: [`${GY}는 ${GX}의 ${kg}배`, `${xq} × ${kg} = ${xq * kg}`],
          rule: '한 개마다 똑같이 몇 개씩이면 곱하는 대응 관계.',
          pools: { pokemon: [`${G.line(kg)}\n\n[table ${GX}(${G.xc}):${L(xs5)} / ${GY}(${G.yc}):${xs5[0] * kg}, ${xs5[1] * kg}, ?, ${xs5[3] * kg}, ${xs5[4] * kg}]\n\n표의 ?에 알맞은 수는 얼마일까요?`] } },
      ];
      return finish(this.id, r, c, pickFamily(r, c, fams));
    },
    misread(r, c) {
      const F = frameFor(r, c); const k = pick(r, F.ks); const N = int(r, 5, 12);
      const X = `${F.x} 수`; const Y = `${F.y} 수`;
      return finishMis(this.id, 'add', r, c, {
        q: `${F.line(k)}\n\n${showWork(`${jw(F.x, '이', '가')} ${N}${F.xc}면 ${jw(F.y, '은', '는')} ${N} + ${k} = ${N + k}${F.yc}예요`)}`,
        ok: `${F.x} 1${F.xc}마다 ${k}${F.yc}씩 — ${N} × ${k} = ${N * k}${F.yc}`,
        wr: [
          { text: '맞게 말했어요', tag: RIGHT_AS_WRONG },
          { text: `${X}가 ${Y}의 ${k}배예요`, tag: TAGS.swapDir },
          { text: `${Y}와 ${X}는 늘 같아요`, tag: OFF },
        ],
        steps: [`${F.x} 1${F.xc}마다 ${F.y} ${k}${F.yc} → ${Y}는 ${X}의 ${k}배`, `${N} × ${k} = ${N * k}${F.yc}`],
        whyAny: `${jw(F.x, '이', '가')} 하나 늘 때마다 ${jw(F.y, '이', '가')} ${k}${F.yc}씩 늘어요. 더하기가 아니라 곱하기예요.`,
        rule: '한 개마다 똑같이 몇 개씩이면 곱하는 대응 관계.',
        probe: { k, N, shown: N + k },
      });
    },
  },

  {
    id: 'cor.table', grade: 5, name: '대응표로 규칙 찾기', needs: ['cor.pair'],
    idea: '대응표에서는 **위아래 짝**을 봐요. 옆으로 몇씩 커지는지만 보면 규칙을 잘못 찾기 쉬워요 — 모든 짝에 같은 셈이 맞는지 확인하면, 표에 없는 칸도 구할 수 있어요.',
    slip: '위아래 짝 두세 개에 같은 셈이 맞는지 확인해 봐요.',
    calc(r, c) {
      const F = frameFor(r, c); const k = pick(r, F.ks); const s0 = int(r, 1, 3);
      const xs = range(4, (i) => s0 + i); const ys = xs.map((x) => k * x); const fp = ys[0] - xs[0];
      const X = `${F.x} 수`; const Y = `${F.y} 수`;
      const head = `${X}와 ${Y} 사이의 대응 관계를 표로 나타냈어요.\n\n[table ${X}(${F.xc}):${L(xs)} / ${Y}(${F.yc}):${L(ys)}]\n\n`;
      const N = int(r, s0 + 6, 15);
      const Nb = int(r, 6, 15); const M = k * Nb;
      const cc = int(r, 2, 9); const Nl = int(r, 10, 30);
      const lv = `[table {mon}의 레벨:1, 2, 3, 4 / {mon2}의 레벨:${L([1, 2, 3, 4].map((x) => x + cc))}]`;
      const pairs = `위아래 짝: ${xs[0]} → ${ys[0]}, ${xs[1]} → ${ys[1]}, ${xs[2]} → ${ys[2]}`;
      const fams = [
        { ans: String(k * N), wr: [{ text: String(N + k), tag: TAGS.stepAsRule }, { text: String(N + fp), tag: TAGS.firstPairOnly }, { text: String(k * (s0 + 4)), tag: TAGS.nextOnly }],
          why: {
            [TAGS.stepAsRule]: `${Y}가 옆으로 ${k}씩 커지는 건 ${X}가 1씩 커질 때예요. 위아래 짝을 보면 ${k}배 — ${N} + ${jn(k, '이', '가')} 아니라 ${N} × ${jn(k, '이에요', '예요')}.`,
            [TAGS.firstPairOnly]: `첫 칸(${xs[0]} → ${ys[0]})만 보면 ${jn(fp, '을', '를')} 더한 것 같지만, 둘째 칸은 ${xs[1]} + ${fp} = ${jn(xs[1] + fp, '이라서', '라서')} ${jn(ys[1], '과', '와')} 달라요. 모든 짝에 맞는 셈은 × ${jn(k, '이에요', '예요')}.`,
            [TAGS.nextOnly]: `${jn(k * (s0 + 4), '은', '는')} 표 바로 다음 칸(${X} ${s0 + 4})이에요.`,
          },
          steps: [pairs, `${Y}는 늘 ${X}의 ${k}배`, `${N} × ${k} = ${k * N}`],
          rule: '대응표는 위아래 짝으로 규칙을 찾는다 — 모든 짝에 맞는지 확인.',
          pools: { pokemon: [`${head}표를 보고, ${X}가 ${N}${F.xc}일 때 ${Y}는 몇 ${F.yc}일까요?`] } },
        { ans: String(Nl + cc), wr: [{ text: String(Nl * (1 + cc)), tag: TAGS.mulForAdd }, { text: String(Nl + 1), tag: TAGS.stepAsRule }, { text: String(5 + cc), tag: TAGS.nextOnly }],
          why: {
            [TAGS.mulForAdd]: `첫 칸(1 → ${1 + cc})만 보면 ${1 + cc}배 같지만, 2 → ${jn(2 + cc, '은', '는')} ${1 + cc}배가 아니에요. 늘 ${cc} 차이예요.`,
            [TAGS.stepAsRule]: `위아래 모두 1씩 커지는 건 옆으로 본 거예요. 위아래 짝은 늘 ${cc} 차이예요.`,
            [TAGS.nextOnly]: `${jn(5 + cc, '은', '는')} 표 바로 다음 칸(레벨 5)이에요.`,
          },
          steps: [`위아래 짝: 1 → ${1 + cc}, 2 → ${2 + cc}, 3 → ${3 + cc}`, `{mon2}의 레벨이 늘 ${cc} 높아요`, `${Nl} + ${cc} = ${Nl + cc}`],
          rule: '대응표는 위아래 짝으로 규칙을 찾는다 — 모든 짝에 맞는지 확인.',
          pools: { pokemon: [`{mon/과/와} {mon2/은/는} 늘 함께 배틀해서 레벨이 같이 올라요.\n\n${lv}\n\n표를 보고, {mon}의 레벨이 ${Nl}일 때 {mon2}의 레벨은 얼마일까요?`] } },
        { ans: String(Nb), wr: [{ text: String(M * k), tag: TAGS.noInverse }, { text: String(M - k), tag: TAGS.stepAsRule }, { text: String(M - fp), tag: TAGS.firstPairOnly }],
          why: {
            [TAGS.noInverse]: `${M} × ${jn(k, '은', '는')} ${Y}를 또 ${k}배 한 거예요. ${Y}가 ${X}의 ${k}배니까 거꾸로는 ${ro(k)} 나눠요.`,
            [TAGS.stepAsRule]: `${Y}가 ${k}씩 커지는 건 옆으로 본 거예요. 위아래 짝은 ${k}배라서 ${ro(k)} 나눠요.`,
            [TAGS.firstPairOnly]: `첫 칸의 차이 ${fp}만 뺐어요. 모든 짝에 맞는 셈은 × ${k} — 거꾸로는 ÷ ${jn(k, '이에요', '예요')}.`,
          },
          steps: [pairs, `${Y}는 ${X}의 ${k}배 → 거꾸로 ${X} = ${Y} ÷ ${k}`, `${M} ÷ ${k} = ${Nb}`],
          rule: '거꾸로 구할 때는 반대 셈 — 곱했으면 나눈다.',
          pools: { pokemon: [`${head}표를 보고, ${Y}가 ${M}${F.yc}일 때 ${X}는 몇 ${F.xc}일까요?`] } },
      ];
      return finish(this.id, r, c, pickFamily(r, c, fams));
    },
    misread(r, c) {
      const F = frameFor(r, c); const k = pick(r, F.ks); const N = int(r, 8, 15);
      const xs = [1, 2, 3, 4]; const ys = xs.map((x) => k * x);
      const X = `${F.x} 수`; const Y = `${F.y} 수`;
      return finishMis(this.id, 'step', r, c, {
        q: `${X}와 ${Y} 사이의 대응 관계를 표로 나타냈어요.\n\n[table ${X}(${F.xc}):${L(xs)} / ${Y}(${F.yc}):${L(ys)}]\n\n${showWork(`${Y}가 ${k}씩 커지니까 ${X}가 ${N}${F.xc}면 ${Y}는 ${N} + ${k} = ${N + k}${F.yc}예요`)}`,
        ok: `${Y}는 ${X}의 ${k}배예요 — ${N} × ${k} = ${N * k}${F.yc}`,
        wr: [
          { text: '맞게 말했어요', tag: RIGHT_AS_WRONG },
          { text: `첫 칸에서 ${k - 1} 많으니까 ${N} + ${k - 1} = ${N + k - 1}${F.yc}예요`, tag: TAGS.firstPairOnly },
          { text: '표에 없는 칸은 구할 수 없어요', tag: OFF },
        ],
        steps: [`위아래 짝: 1 → ${k}, 2 → ${2 * k}, 3 → ${3 * k} — ${k}배`, `${N} × ${k} = ${N * k}${F.yc}`],
        whyAny: `옆으로 ${k}씩 커지는 건 ${X}가 1씩 커질 때예요. 대응 규칙은 위아래 짝 — ${k}배예요.`,
        rule: '대응표는 위아래 짝으로 규칙을 찾는다.',
        probe: { xs, ys, N, shown: N + k },
      });
    },
  },

  {
    id: 'cor.symbol', grade: 5, name: '대응 관계를 식으로', needs: ['cor.table'],
    idea: '두 양을 **□, △ 같은 기호**로 두면 대응 관계를 식으로 쓸 수 있어요. 탁자 수를 □, 의자 수를 △라고 하면 △ = □ × 4 — 거꾸로 쓰면 □ = △ ÷ 4예요.',
    slip: '표의 짝 몇 개를 식에 넣어 보고 모두 맞는지 확인해요.',
    calc(r, c) {
      const k = int(r, 3, 9); const s0 = int(r, 1, 3);
      const xs = range(4, (i) => s0 + i); const ys = xs.map((x) => k * x); const fp = ys[0] - xs[0];
      const tbl = `[table □:${L(xs)} / △:${L(ys)}]`;
      const pairs = `위아래 짝: ${xs[0]} → ${ys[0]}, ${xs[1]} → ${ys[1]}, ${xs[2]} → ${ys[2]}`;
      const cc = int(r, 2, 9);
      const F = frameFor(r, c, MANY_K); const kf = pick(r, F.ks); // 수가 kf 하나뿐인 틀 — k가 여럿인 이야기로
      const mulEq = `△ = □ × ${k}`; const addEq = `△ = □ + ${cc}`; const frEq = `△ = □ × ${kf}`; const invEq = `□ = △ ÷ ${k}`;
      const fams = [
        { words: true, ans: mulEq, wr: [{ text: `△ = □ + ${k}`, tag: TAGS.stepAsRule }, { text: `△ = □ + ${fp}`, tag: TAGS.firstPairOnly }, { text: `□ = △ × ${k}`, tag: TAGS.swapDir }],
          why: {
            [TAGS.stepAsRule]: `△가 ${k}씩 커지는 건 □가 1씩 커질 때예요. 짝마다 보면 □ × ${k} = △.`,
            [TAGS.firstPairOnly]: `□ + ${jn(fp, '은', '는')} 첫 칸(${xs[0]} → ${ys[0]})에만 맞아요. ${xs[1]} + ${fp} = ${jn(xs[1] + fp, '이라서', '라서')} ${jn(ys[1], '이', '가')} 안 나와요.`,
            [TAGS.swapDir]: `□ = △ × ${jn(k, '이라면', '라면')} □가 △보다 커야 해요. 거꾸로 쓰려면 반대 셈 — □ = △ ÷ ${k}.`,
          },
          steps: [pairs, `△는 늘 □의 ${k}배 → ${mulEq}`],
          rule: '식은 표의 모든 짝에 맞아야 한다.',
          pools: { pokemon: [`${tbl}\n\n□와 △ 사이의 대응 관계를 식으로 나타내면 어느 것일까요?`] } },
        { words: true, ans: addEq, wr: [{ text: `△ = □ × ${1 + cc}`, tag: TAGS.mulForAdd }, { text: `□ = △ + ${cc}`, tag: TAGS.swapDir }, { text: '△ = □ + 1', tag: TAGS.stepAsRule }],
          why: {
            [TAGS.mulForAdd]: `□ × ${jn(1 + cc, '은', '는')} 첫 칸(1 → ${1 + cc})에만 맞아요. 2 × ${1 + cc} = ${2 + 2 * cc}인데 표에서는 ${jn(2 + cc, '이에요', '예요')}.`,
            [TAGS.swapDir]: `□ = △ + ${jn(cc, '이라면', '라면')} □가 △보다 커야 해요. 표에서는 □가 더 작아요.`,
            [TAGS.stepAsRule]: `1씩 커지는 건 옆으로 본 거예요. 위아래 짝은 늘 ${cc} 차이예요.`,
          },
          steps: [`위아래 짝: 1 → ${1 + cc}, 2 → ${2 + cc}, 3 → ${3 + cc}`, `△는 늘 □보다 ${cc} 커요 → ${addEq}`],
          rule: '식은 표의 모든 짝에 맞아야 한다.',
          pools: { pokemon: [`{mon}의 레벨을 □, {mon2}의 레벨을 △라고 해요. 둘은 늘 함께 레벨이 올라요.\n\n[table □:1, 2, 3, 4 / △:${L([1, 2, 3, 4].map((x) => x + cc))}]\n\n□와 △ 사이의 대응 관계를 식으로 나타내면 어느 것일까요?`] } },
        { words: true, ans: frEq, wr: [{ text: `△ = □ + ${kf}`, tag: TAGS.addForMul }, { text: `□ = △ × ${kf}`, tag: TAGS.swapDir }, { text: `△ = □ ÷ ${kf}`, tag: TAGS.swapDir }],
          why: {
            [TAGS.addForMul]: `${jw(F.x, '이', '가')} 하나 늘 때마다 ${jw(F.y, '이', '가')} ${kf}${F.yc}씩 늘어요 — 더하기가 아니라 곱하기예요.`,
            [TAGS.swapDir]: `${F.y} 수(△)가 더 많아요 — △가 □의 ${kf}배예요.`,
          },
          steps: [`${F.x} 1${F.xc}마다 ${F.y} ${kf}${F.yc} → △는 □의 ${kf}배`, `→ ${frEq}`],
          rule: '곱하는 대응 관계: △ = □ × (한 개에 몇 개).',
          pools: { pokemon: [`${F.line(kf)} ${F.x} 수를 □, ${F.y} 수를 △라고 할 때, 두 양 사이의 대응 관계를 식으로 나타내면 어느 것일까요?`] } },
        { words: true, ans: invEq, wr: [{ text: `□ = △ × ${k}`, tag: TAGS.noInverse }, { text: `□ = △ − ${k}`, tag: TAGS.stepAsRule }, { text: `△ = □ ÷ ${k}`, tag: TAGS.swapDir }],
          why: {
            [TAGS.noInverse]: `△ = □ × ${jn(k, '을', '를')} 거꾸로 쓸 때는 곱하기를 되돌려 나눠요.`,
            [TAGS.stepAsRule]: `△는 □보다 ${k} 큰 게 아니라 ${k}배예요.`,
            [TAGS.swapDir]: `△ = □ ÷ ${jn(k, '이라면', '라면')} △가 □보다 작아야 해요. 표에서는 △가 더 커요.`,
          },
          steps: [`${pairs} → △ = □ × ${k}`, `거꾸로는 반대 셈 → ${invEq}`],
          rule: '거꾸로 쓰면 반대 셈: △ = □ × 4 이면 □ = △ ÷ 4.',
          pools: { pokemon: [`${tbl}\n\n△를 알 때 □를 구하는 식은 어느 것일까요?`] } },
      ];
      return finish(this.id, r, c, pickFamily(r, c, fams));
    },
    misread(r, c) {
      const k = int(r, 3, 9);
      if (branchOf(r, c, ['swap', 'step']) === 'swap') {
        const s0 = int(r, 1, 3); const xs = range(4, (i) => s0 + i); const ys = xs.map((x) => k * x);
        return finishMis(this.id, 'swap', r, c, {
          q: `[table □:${L(xs)} / △:${L(ys)}]\n\n${showWork(`△ = □ × ${jn(k, '이니까', '니까')} □ = △ × ${jn(k, '이에요', '예요')}`)}`,
          ok: `거꾸로 쓸 때는 반대 셈이에요 — □ = △ ÷ ${k}`,
          wr: [
            { text: '맞게 말했어요', tag: RIGHT_AS_WRONG },
            { text: `□ = △ − ${jn(k, '이에요', '예요')}`, tag: TAGS.wrongInverse },
            { text: '□와 △는 자리를 바꿔 쓸 수 없어요', tag: OFF },
          ],
          steps: [`△가 □의 ${k}배 → □는 △를 ${ro(k)} 나눈 수`, `□ = △ ÷ ${k}`],
          whyAny: `□ = △ × ${jn(k, '이라면', '라면')} □가 △보다 커야 해요. 거꾸로 쓸 때는 곱하기를 나누기로 바꿔요.`,
          rule: '거꾸로 쓰면 반대 셈: △ = □ × 4 이면 □ = △ ÷ 4.',
          probe: { xs, ys, shownEq: `□ = △ × ${k}` },
        });
      }
      const xs = [1, 2, 3, 4]; const ys = xs.map((x) => k * x);
      return finishMis(this.id, 'step', r, c, {
        q: `[table □:${L(xs)} / △:${L(ys)}]\n\n${showWork(`△가 ${k}씩 커지니까 △ = □ + ${jn(k, '이에요', '예요')}`)}`,
        ok: `□가 1이면 △는 ${k} — △ = □ × ${k}`,
        wr: [
          { text: '맞게 말했어요', tag: RIGHT_AS_WRONG },
          { text: `△ = □ + ${jn(k - 1, '이에요', '예요')}`, tag: TAGS.firstPairOnly },
          { text: '이 표는 식으로 나타낼 수 없어요', tag: OFF },
        ],
        steps: [`위아래 짝: 1 → ${k}, 2 → ${2 * k}, 3 → ${3 * k}`, `△는 □의 ${k}배 → △ = □ × ${k}`],
        whyAny: `△가 ${k}씩 커지는 건 □가 1씩 커질 때예요. 짝마다 보면 ${k}배예요.`,
        rule: '식은 표의 모든 짝에 맞아야 한다.',
        probe: { xs, ys, shownEq: `△ = □ + ${k}` },
      });
    },
  },

  {
    id: 'cor.value', grade: 5, name: '식으로 값 구하기', needs: ['cor.symbol'],
    idea: '식이 있으면 표를 끝까지 쓰지 않아도 돼요. △ = □ × 6에서 □가 15면 △ = 15 × 6 = 90. **거꾸로** △를 알 때는 **반대 셈**으로 □를 구해요 — □ = △ ÷ 6.',
    slip: '□와 △ 중에 어느 것을 알려 줬는지 먼저 봐요.',
    calc(r, c) {
      const k = int(r, 3, 9); const t = int(r, 2, 9); const N = k * t;          // 앞으로 ×
      const kb = int(r, 3, 9); const Nb = int(r, 5, 20); const Mb = kb * Nb;    // 거꾸로 ×
      const cc = int(r, 3, 15); const Nc = int(r, 5, 40); const Mc = Nc + cc;   // 거꾸로 +
      const kd = int(r, 2, 6); const Md = int(r, 3, 20);                        // 거꾸로 ÷
      const ce = int(r, 2, 9); const Ne = int(r, ce + 3, 40);                   // 앞으로 −
      const fams = [
        { ans: String(k * N), wr: [{ text: String(N + k), tag: TAGS.addForMul }, { text: String(t), tag: TAGS.swapDir }],
          why: {
            [TAGS.addForMul]: `식은 × ${jn(k, '이에요', '예요')}. □에 ${jn(k, '을', '를')} 더하지 않고 곱해요.`,
            [TAGS.swapDir]: `${N} ÷ ${jn(k, '은', '는')} △가 ${N}일 때 □를 구하는 셈이에요. 지금은 □가 ${jn(N, '이에요', '예요')}.`,
          },
          steps: [`□ 자리에 ${jn(N, '을', '를')} 넣어요 → △ = ${N} × ${k}`, `△ = ${k * N}`],
          rule: '□를 알면 식대로, △를 알면 반대 셈으로.',
          pools: { pokemon: [`△ = □ × ${k}에서 □가 ${N}일 때 △는 얼마일까요?`] } },
        { ans: String(Nb), wr: [{ text: String(Mb * kb), tag: TAGS.noInverse }, { text: String(Mb - kb), tag: TAGS.wrongInverse }],
          why: {
            [TAGS.noInverse]: `${Mb} × ${jn(kb, '은', '는')} △를 또 ${kb}배 한 거예요. 거꾸로는 ${ro(kb)} 나눠요.`,
            [TAGS.wrongInverse]: '곱하기를 되돌리는 셈은 빼기가 아니라 나누기예요.',
          },
          steps: [`□ × ${kb} = ${Mb}`, `거꾸로는 반대 셈: □ = ${Mb} ÷ ${kb} = ${Nb}`],
          rule: '□를 알면 식대로, △를 알면 반대 셈으로.',
          pools: { pokemon: [`△ = □ × ${kb}에서 △가 ${Mb}일 때 □는 얼마일까요?`] } },
        { ans: String(Nc), wr: [{ text: String(Mc + cc), tag: TAGS.noInverse }],
          why: { [TAGS.noInverse]: `${Mc} + ${jn(cc, '은', '는')} △에 또 더한 거예요. 거꾸로는 빼요.` },
          steps: [`□ + ${cc} = ${Mc}`, `거꾸로는 반대 셈: □ = ${Mc} − ${cc} = ${Nc}`],
          rule: '□를 알면 식대로, △를 알면 반대 셈으로.',
          pools: { pokemon: [`△ = □ + ${cc}에서 △가 ${Mc}일 때 □는 얼마일까요?`] } },
        { ans: String(Md * kd), wr: [Md % kd === 0 ? { text: String(Md / kd), tag: TAGS.noInverse } : null, { text: String(Md + kd), tag: TAGS.wrongInverse }],
          why: {
            [TAGS.noInverse]: `${Md} ÷ ${jn(kd, '은', '는')} △를 또 나눈 거예요. 거꾸로는 곱해요.`,
            [TAGS.wrongInverse]: '나누기를 되돌리는 셈은 더하기가 아니라 곱하기예요.',
          },
          steps: [`□ ÷ ${kd} = ${Md}`, `거꾸로는 반대 셈: □ = ${Md} × ${kd} = ${Md * kd}`],
          rule: '□를 알면 식대로, △를 알면 반대 셈으로.',
          pools: { pokemon: [`△ = □ ÷ ${kd}에서 △가 ${Md}일 때 □는 얼마일까요?`] } },
        { ans: String(Ne - ce), wr: [{ text: String(Ne + ce), tag: TAGS.swapDir }],
          why: { [TAGS.swapDir]: `□에서 ${jn(ce, '을', '를')} 빼야 △예요. ${Ne} + ${jn(ce, '은', '는')} △가 ${Ne}일 때 □를 구하는 셈이에요.` },
          steps: [`□ 자리에 ${jn(Ne, '을', '를')} 넣어요 → △ = ${Ne} − ${ce}`, `△ = ${Ne - ce}`],
          rule: '□를 알면 식대로, △를 알면 반대 셈으로.',
          pools: { pokemon: [`△ = □ − ${ce}에서 □가 ${Ne}일 때 △는 얼마일까요?`] } },
      ];
      return finish(this.id, r, c, pickFamily(r, c, fams));
    },
    misread(r, c) {
      if (branchOf(r, c, ['inv', 'fwd']) === 'inv') {
        // 보여 주는 틀린 곱(M × k)이 500을 넘지 않게
        const k = int(r, 3, 6); const N = int(r, 4, 12); const M = k * N;
        return finishMis(this.id, 'inv', r, c, {
          q: `△ = □ × ${k}에서 △가 ${M}일 때 □를 구했어요.\n\n${showWork(`□ = ${M} × ${k} = ${jn(M * k, '이에요', '예요')}`)}`,
          ok: `□ × ${k} = ${jn(M, '이니까', '니까')} □ = ${M} ÷ ${k} = ${N}`,
          wr: [
            { text: '맞게 말했어요', tag: RIGHT_AS_WRONG },
            { text: `□ = ${M} − ${k} = ${jn(M - k, '이에요', '예요')}`, tag: TAGS.wrongInverse },
            { text: '□는 △보다 커야 해요', tag: OFF },
          ],
          steps: [`□ × ${k} = ${M}`, `□ = ${M} ÷ ${k} = ${N}`],
          whyAny: `△에 식을 또 썼어요. △를 알 때는 반대 셈 — ${ro(k)} 나눠요.`,
          rule: '□를 알면 식대로, △를 알면 반대 셈으로.',
          probe: { eq: `△ = □ × ${k}`, given: '△', val: M, shown: M * k },
        });
      }
      const cc = int(r, 3, 9); const N = int(r, cc + 2, 30);
      return finishMis(this.id, 'fwd', r, c, {
        q: `△ = □ + ${cc}에서 □가 ${N}일 때 △를 구했어요.\n\n${showWork(`△ = ${N} − ${cc} = ${jn(N - cc, '이에요', '예요')}`)}`,
        ok: `□에 ${jn(cc, '을', '를')} 더해요 — △ = ${N} + ${cc} = ${N + cc}`,
        wr: [
          { text: '맞게 말했어요', tag: RIGHT_AS_WRONG },
          { text: `△ = ${N} × ${cc} = ${jn(N * cc, '이에요', '예요')}`, tag: TAGS.mulForAdd },
          { text: '△는 □보다 작아요', tag: OFF },
        ],
        steps: [`□ 자리에 ${jn(N, '을', '를')} 넣어요`, `△ = ${N} + ${cc} = ${N + cc}`],
        whyAny: `빼기로 했어요. 식이 □ + ${jn(cc, '이라서', '라서')} □에 더해요.`,
        rule: '□를 알면 식대로, △를 알면 반대 셈으로.',
        probe: { eq: `△ = □ + ${cc}`, given: '□', val: N, shown: N - cc },
      });
    },
  },

  {
    id: 'cor.life', grade: 5, name: '생활 속 대응 관계', needs: ['cor.value'],
    idea: '생활 속에도 대응 관계가 많아요 — 도시마다 다른 시각, 통나무 도막과 자른 횟수, 함께 오르는 레벨. **곱하는 관계인지, 차이가 늘 같은 관계인지**부터 가려요.',
    slip: '작은 수로 몇 번 해 보고 두 양이 어떻게 따라 변하는지 봐요.',
    calc(r, c) {
      const p = int(r, 2, 9); const cc = int(r, 2, 6); const q = p + cc; const t = int(r, 2, 4); const N = p * t;
      const C = pickFor(r, c, CITIES, (x, w) => w.includes(x.name)); const g = C.g;
      // 물어보는 시각 H는 H + g가 12를 넘지 않게 ("오후 14시" 같은 오답이 안 나오게), 알려 주는 시각 h는 H와 다르게
      const H = int(r, g + 1, 12 - g); let h = int(r, g + 1, 11); if (h === H) h = h === 11 ? g + 1 : h + 1;
      const n = int(r, 5, 15);
      const pr = pick(r, [5, 10, 15, 20]); const Nd = int(r, 3, 10); const Md = pr * Nd;
      const fams = [
        { ans: String(N + cc), wr: [{ text: String(q * t), tag: TAGS.propForAdd }, { text: String(N - cc), tag: TAGS.swapDir }],
          why: {
            [TAGS.propForAdd]: `레벨이 ${t}배가 되는 게 아니라 둘 다 똑같이 ${N - p}씩 올라요. 차이 ${jn(cc, '은', '는')} 그대로예요.`,
            [TAGS.swapDir]: `{mon2}의 레벨이 늘 ${cc} 높아요 — 빼지 않고 더해요.`,
          },
          steps: [`레벨이 똑같이 오르니까 차이는 늘 ${q} − ${p} = ${cc}`, `${N} + ${cc} = ${N + cc}`],
          rule: '두 양이 같은 수만큼 늘어나면 차이는 그대로다.',
          pools: { pokemon: [`{mon/과/와} {mon2/은/는} 늘 함께 배틀해서 레벨이 똑같이 올라요. 지금 {mon}의 레벨은 ${p}, {mon2}의 레벨은 ${q}인데, {mon}의 레벨이 ${jn(N, '이', '가')} 되면 {mon2}의 레벨은 얼마일까요?`] } },
        { ans: String(H - g), wr: [{ text: String(H + g), tag: TAGS.swapDir }, { text: String(H), tag: TAGS.sameCount }],
          why: {
            [TAGS.swapDir]: `${jw(C.name, '은', '는')} 서울보다 ${g}시간 느려요 — 더하지 않고 빼요.`,
            [TAGS.sameCount]: `두 도시의 시각은 달라요 — 늘 ${g}시간 차이예요.`,
          },
          steps: [`서울 ${h}시일 때 ${C.name} ${h - g}시 → ${jw(C.name, '은', '는')} 서울보다 늘 ${g}시간 느려요`, `${H} − ${g} = ${H - g} → 오후 ${H - g}시`],
          rule: '시차처럼 차이가 늘 같은 관계는 더하거나 뺀다.',
          pools: { pokemon: [`서울이 오후 ${h}시일 때 ${jw(C.name, '은', '는')} 오후 ${h - g}시예요. 서울이 오후 ${H}시일 때 ${jw(C.name, '은', '는')} 오후 몇 시일까요?`] } },
        { ans: String(n - 1), wr: [{ text: String(n), tag: TAGS.sameCount }, { text: String(n + 1), tag: TAGS.swapDir }],
          why: {
            [TAGS.sameCount]: '마지막 도막은 자르지 않아도 생겨요 — 1번만 잘라도 벌써 2도막이에요.',
            [TAGS.swapDir]: '자른 횟수가 도막 수보다 1 적어요 — 더하지 않고 빼요.',
          },
          steps: ['1번 자르면 2도막, 2번 자르면 3도막 — 자른 횟수는 도막 수보다 1 적어요', `${n} − 1 = ${n - 1}번`],
          rule: '자른 횟수 = 도막 수 − 1.',
          pools: { pokemon: [`{mon/이/가} 통나무를 잘라서 똑같은 길이의 도막 ${n}개를 만들려고 해요. 몇 번 잘라야 할까요?`] } },
        { ans: String(Nd), wr: [{ text: String(Md * pr), tag: TAGS.noInverse }, { text: String(Md - pr), tag: TAGS.wrongInverse }],
          why: {
            [TAGS.noInverse]: `${Md} × ${jn(pr, '은', '는')} 코인을 또 ${pr}배 한 거예요. 코인 수를 알 때는 ${ro(pr)} 나눠요.`,
            [TAGS.wrongInverse]: `한 개에 ${pr}개씩이니까 빼기가 아니라 나누기예요.`,
          },
          steps: [`(코인 수) = (나무열매 수) × ${pr}`, `거꾸로: ${Md} ÷ ${pr} = ${Nd}개`],
          rule: '곱하는 관계를 거꾸로 → 나누기.',
          pools: { pokemon: [`{mon/이/가} 나무열매를 사요. 나무열매는 한 개에 코인 ${pr}개예요. 코인 ${Md}개를 모두 쓰면 나무열매를 몇 개 살 수 있을까요?`] } },
        // (통나무 식 "△ = □ − 1" 고르기는 수가 하나도 없어 🔁 쌍둥이가 늘 같은 글이 된다 — 배움 장 H7-2에만 둔다)
      ];
      return finish(this.id, r, c, pickFamily(r, c, fams));
    },
    misread(r, c) {
      if (branchOf(r, c, ['prop', 'fence']) === 'prop') {
        const p = int(r, 2, 9); const cc = int(r, 2, 6); const q = p + cc; const t = int(r, 2, 4); const N = p * t;
        return finishMis(this.id, 'prop', r, c, {
          q: `{mon/과/와} {mon2/은/는} 늘 함께 배틀해서 레벨이 똑같이 올라요. 지금 {mon}의 레벨은 ${p}, {mon2}의 레벨은 ${jn(q, '이에요', '예요')}.\n\n${showWork(`{mon}의 레벨이 ${jn(N, '이', '가')} 되면 {mon2}의 레벨은 ${jn(q * t, '이에요', '예요')} — 둘 다 ${t}배가 되니까요`)}`,
          ok: `레벨 차이는 늘 ${cc} — ${N} + ${cc} = ${N + cc}`,
          wr: [
            { text: '맞게 말했어요', tag: RIGHT_AS_WRONG },
            { text: `${N} − ${cc} = ${jn(N - cc, '이에요', '예요')}`, tag: TAGS.swapDir },
            { text: '두 레벨은 곧 똑같아져요', tag: OFF },
          ],
          steps: [`둘 다 똑같이 ${N - p}씩 올라요 — 차이 ${jn(cc, '은', '는')} 그대로`, `${N} + ${cc} = ${N + cc}`],
          whyAny: `레벨은 배로 늘지 않고 둘 다 똑같이 올라요. 차이 ${jn(cc, '이', '가')} 그대로예요.`,
          rule: '두 양이 같은 수만큼 늘어나면 차이는 그대로다.',
          probe: { p, q, N, shown: q * t },
        });
      }
      const n = int(r, 5, 15);
      return finishMis(this.id, 'fence', r, c, {
        q: `통나무를 잘라서 똑같은 길이의 도막 ${n}개를 만들려고 해요.\n\n${showWork(`도막이 ${n}개니까 ${n}번 잘라야 해요`)}`,
        ok: `마지막 도막은 안 잘라도 생겨요 — ${n - 1}번`,
        wr: [
          { text: '맞게 말했어요', tag: RIGHT_AS_WRONG },
          { text: `${n + 1}번 잘라야 해요`, tag: TAGS.swapDir },
          { text: '자른 횟수와 도막 수는 상관없어요', tag: OFF },
        ],
        steps: ['1번 자르면 2도막, 2번 자르면 3도막', `도막 ${n}개 → ${n - 1}번`],
        whyAny: '자른 횟수는 도막 수보다 1 적어요 — 1번만 잘라도 2도막이에요.',
        rule: '자른 횟수 = 도막 수 − 1.',
        probe: { n, shown: n },
      });
    },
  },

  {
    id: 'cor.twostep', grade: 5, name: '두 번 셈하는 대응', needs: ['cor.life'],
    idea: '늘어나는 수가 2인데 1번째가 2가 아니면 식이 **두 번 셈**이 돼요. 3, 5, 7, 9 → 2씩 늘고 1번째가 3 = 2 × 1 + 1 → △ = □ × 2 + 1. 곱하는 수는 **늘어나는 수**, 더하는 수는 **처음에 남는 수**예요.',
    slip: '늘어나는 수를 먼저 찾고, 1번째에서 얼마가 남는지 봐요.',
    calc(r, c) {
      const a = int(r, 2, 5); const b = int(r, 1, 4); const s = a + b;
      const cs3 = [s, s + a, s + 2 * a]; const ys = [s, s + a, s + 2 * a, s + 3 * a];
      const N = int(r, 8, 15);
      const Nc = int(r, 6, 15); const M = a * Nc + b;
      const two = `△ = □ × ${a} + ${b}`;
      const fams = [
        { ans: String(a * N + b), wr: [{ text: String(a * N), tag: TAGS.dropAdd }, { text: String(s * N), tag: TAGS.firstAsMul }, { text: String(N + a), tag: TAGS.stepAsRule }],
          why: {
            [TAGS.dropAdd]: `${a} × ${N}에는 처음에 남는 ${b}개가 빠졌어요 — 1번째가 ${a}개가 아니라 ${s}개예요.`,
            [TAGS.firstAsMul]: `1번째가 ${s}개지만, 그다음부터는 ${s}개씩이 아니라 ${a}개씩 늘어요.`,
            [TAGS.stepAsRule]: `${N} + ${jn(a, '은', '는')} 모양 순서에 늘어나는 수를 한 번 더한 거예요. 늘어나는 수는 모양마다 한 번씩 — 곱해요.`,
          },
          steps: [`블록 수: ${L(cs3)} — ${a}개씩 늘어요`, `1번째 ${s}개 = ${a} × 1 + ${b} → 몇 번째 × ${a} + ${b}`, `${a} × ${N} + ${b} = ${a * N + b}개`],
          rule: '블록 수 = 늘어나는 수 × 몇 번째 + 처음에 남는 수.',
          pools: { pokemon: [`{mon/이/가} 블록으로 규칙에 따라 모양을 만들었어요.\n\n[steps ${cs3.join(' ')}]\n\n${N}번째 모양에는 블록이 몇 개일까요?`] } },
        { words: true, ans: two, wr: [{ text: `△ = □ × ${a}`, tag: TAGS.dropAdd }, { text: `△ = □ + ${a}`, tag: TAGS.stepAsRule }, { text: `△ = □ × ${s}`, tag: TAGS.firstAsMul }],
          why: {
            [TAGS.dropAdd]: `□ × ${jn(a, '은', '는')} □가 1일 때 ${jn(a, '이에요', '예요')}. 표는 ${jn(s, '이라서', '라서')} ${jn(b, '을', '를')} 더해야 해요.`,
            [TAGS.stepAsRule]: `□ + ${jn(a, '은', '는')} □가 2일 때 ${jn(2 + a, '이에요', '예요')}. 표는 ${jn(s + a, '이에요', '예요')}.`,
            [TAGS.firstAsMul]: `□ × ${jn(s, '은', '는')} 1번째에만 맞아요 — □가 2면 ${2 * s}인데 표는 ${jn(s + a, '이에요', '예요')}.`,
          },
          steps: [`△가 ${a}씩 커져요 → □ × ${a}에서 시작`, `□가 1일 때 □ × ${a} = ${a}, △는 ${jn(s, '이라서', '라서')} ${b} 더 → ${two}`],
          rule: '△ = □ × (늘어나는 수) + (처음에 남는 수).',
          pools: { pokemon: [`블록 모양의 순서와 블록 수를 표로 나타냈어요.\n\n[table 모양의 순서(□):1, 2, 3, 4 / 블록 수(△):${L(ys)}]\n\n□와 △ 사이의 대응 관계를 식으로 나타내면 어느 것일까요?`] } },
        { ans: String(Nc), wr: [{ text: String(M - b), tag: TAGS.halfInverse }, (M + b) % a === 0 ? { text: String((M + b) / a), tag: TAGS.wrongInverse } : null, { text: String(a * M + b), tag: TAGS.noInverse }],
          why: {
            [TAGS.halfInverse]: `${jn(b, '은', '는')} 뺐지만 × ${jn(a, '을', '를')} 되돌리지 않았어요 — ${ro(a)} 나눠야 해요.`,
            [TAGS.wrongInverse]: `더한 ${jn(b, '은', '는')} 되돌릴 때 빼요.`,
            [TAGS.noInverse]: '△에 식을 또 쓴 거예요. 거꾸로는 반대 셈을 반대 순서로 해요.',
          },
          steps: [`□ × ${a} + ${b} = ${M}`, `거꾸로 — 먼저 ${jn(b, '을', '를')} 빼요: ${M} − ${b} = ${M - b}`, `그다음 ${ro(a)} 나눠요: ${M - b} ÷ ${a} = ${Nc}`],
          rule: '두 번 셈을 거꾸로: 더한 것을 먼저 빼고, 곱한 것을 나눈다.',
          pools: { pokemon: [`${two}에서 △가 ${M}일 때 □는 얼마일까요?`] } },
      ];
      return finish(this.id, r, c, pickFamily(r, c, fams));
    },
    misread(r, c) {
      const a = int(r, 2, 5); const b = int(r, 1, 4); const s = a + b;
      if (branchOf(r, c, ['drop', 'first']) === 'drop') {
        const ys = [s, s + a, s + 2 * a, s + 3 * a];
        return finishMis(this.id, 'drop', r, c, {
          q: `블록 모양의 순서와 블록 수를 표로 나타냈어요.\n\n[table 모양의 순서(□):1, 2, 3, 4 / 블록 수(△):${L(ys)}]\n\n${showWork(`△ = □ × ${jn(a, '이에요', '예요')} — ${a}개씩 늘어나니까요`)}`,
          ok: `□가 1일 때 △는 ${s} — △ = □ × ${a} + ${b}`,
          wr: [
            { text: '맞게 말했어요', tag: RIGHT_AS_WRONG },
            { text: `△ = □ + ${jn(a, '이에요', '예요')}`, tag: TAGS.stepAsRule },
            { text: '두 번 셈하는 식은 쓸 수 없어요', tag: OFF },
          ],
          steps: [`□가 1일 때 □ × ${a} = ${a}, 표는 ${s} → ${b} 더 많아요`, `△ = □ × ${a} + ${b}`],
          whyAny: `늘어나는 수만 봤어요. □가 1일 때 △가 ${jn(s, '이라서', '라서')} ${jn(b, '을', '를')} 더해야 해요.`,
          rule: '△ = □ × (늘어나는 수) + (처음에 남는 수).',
          probe: { xs: [1, 2, 3, 4], ys, shownEq: `△ = □ × ${a}` },
        });
      }
      const cs3 = [s, s + a, s + 2 * a]; const N = int(r, 8, 15);
      return finishMis(this.id, 'first', r, c, {
        q: `{me/이/가} 블록으로 규칙에 따라 모양을 만들었어요.\n\n[steps ${cs3.join(' ')}]\n\n${showWork(`1번째 모양이 ${s}개니까 ${N}번째는 ${s} × ${N} = ${s * N}개예요`)}`,
        ok: `${a}개씩 늘어요 — ${a} × ${N} + ${b} = ${a * N + b}개`,
        wr: [
          { text: '맞게 말했어요', tag: RIGHT_AS_WRONG },
          { text: `${a} × ${N} = ${a * N}개예요`, tag: TAGS.dropAdd },
          { text: `${N}번째 모양은 1번째 모양과 블록 수가 같아요`, tag: OFF },
        ],
        steps: [`${s}개 → ${s + a}개 → ${s + 2 * a}개: ${a}개씩`, `${a} × ${N} + ${b} = ${a * N + b}개`],
        whyAny: `1번째 블록 수를 곱했어요. 그다음부터는 ${a}개씩 늘어요.`,
        rule: '블록 수 = 늘어나는 수 × 몇 번째 + 처음에 남는 수.',
        probe: { steps: cs3, nth: N, shown: s * N },
      });
    },
  },
];

export function conceptById(id) {
  return CORRESPOND.find((c) => c.id === id) || null;
}

// ───────────────────── 문항 만들기 (mathfac·mathrat와 같은 모양) ─────────────────────

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
const SLIP = '한 번 더 천천히 — 위아래 짝에 같은 셈이 맞는지 확인해 봐요.';

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

// 4학년 「규칙 찾기」 새 칸 셋(v289)은 진단에서 뺀다 — 그 전과 같은 다섯 칸(수 배열 · 두 양 · 식 · 값 · 두 번 셈)을 진단한다
const NEW4 = ['cor.calcseq', 'cor.equal', 'cor.apply4'];
const DIAG = CORRESPOND.filter((c) => !NEW4.includes(c.id));
export function diagnosticSet(seed, n = 5, opts) {
  return diagnosticOf(DIAG, makeQuestion, seed, n, opts);
}
export function placeFrom(answers) {
  return placeFromOf(CORRESPOND, answers);
}
export function ladder(doneIds) {
  return ladderOf(CORRESPOND, doneIds);
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
 * coach/math/correspond.json 형식 검사 — mathfac.checkContent와 같은 규칙
 * @returns {string[]}
 */
export function checkContent(content) {
  const bad = [];
  for (const c of CORRESPOND) {
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
