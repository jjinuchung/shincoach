// 🔢 수학 — Y 큰 수 줄기 (초4 「큰 수」 4-1): 개념 사다리 + 문제 생성기 + 내용 형식 검사.
// 순수 함수만 — 화면 없음 (node 테스트에서 그대로 돈다).
//
// 왜 이 줄기인가 (2026-10-08, 아버님 "다음 줄기로 4-1 단원 시작하자" → 4-1 네 단원 설계안 "이대로 진행"):
//   사다리에 4-1 단원이 없었다 — 큰 수(자릿값·네 자리씩 끊어 읽기)는 어림·큰 수의 곱셈·나눗셈의 바탕인데 빈자리였다.
//   지도서가 꼽은 흔한 오류: 자리 수를 잘못 셈(1500만을 7자리로) · 0인 자리를 빼고 씀 · 세 자리 쉼표와 네 자리 단위 혼동
//   · 자리 수를 안 보고 앞자리만 비교(9670000이 50730000보다 크다).
//   (아이 기록의 수치·칸별 진단은 공개 코드에 적지 않는다 — Codex 36~39차, 기록은 비공개 저장소에만)
// 칸 범위: 2015 개정 4-1 1단원 지도서(비상 118쪽 흐름도 11차시)·미래엔 2015 교과서 12~33쪽 · 2022 [4수01-01] 자릿값·위치적 기수법·읽고 쓰기
//   · [4수01-02] 다섯 자리 이상 수의 계열·크기 비교와 그 방법 설명 — 2022 교과서(비상·천재 두 종)도 같은 차례, 천조 자리(16자리)까지.
// 수는 9000조 미만만 뽑는다 — JavaScript 정수는 2^53(약 9007조)까지 정확하다.
// 문제 수는 교과서처럼 쉼표 없이 쓴다(2022 천재 지도서 52쪽 "네 자리마다 ','를 사용하지 않는 것이 좋습니다").
// 답의 꼴: 8자리 이하 자연수는 숫자판, 9자리 이상·만/억/조를 섞어 쓴 꼴·한글로 읽은 말은 보기에서 고른다("어느 것").
// 억·조 아래 단위를 생략한 꼴(1278억)은 반올림과 연결 짓지 않는다(2015 지도서 123쪽) — 어림은 L 줄기.
//
// 새 줄기의 함정(메모 stem-generator-pitfalls)을 처음부터: 가족 = 틀 여러 개 · 틀마다 수의 꼴 고정 · ② 갈래마다 key ·
//   바뀌는 수·읽은 말은 문제 끝 굵은 글씨에 둬서 조사를 안 붙인다 · 수 뒤 조사는 jo(끝소리)로 ·
//   오답끼리·정답과 같은 값은 뽑지 않는다(clean → probe.allWrong) · 읽기 보기는 서로 다른 수를 읽은 말
// ★ 정답·오답은 테스트가 **문제 글을 따로 읽어**(한글로 읽은 수도 따로 풀어) 다시 푼다 (tests/mathbig.test.js).

import { rng, castOf, fill, int, pick, shuffle, ask, solve, humanQuestion, checkHuman, diagnosticOf, placeFromOf, ladderOf } from './mathgen.js';
import { gradeLabel } from './mathmix.js';
import { _kit } from './mathexpr.js';

export { gradeLabel };

const { famOf, runFamily, misAsk, textChoices, choices, jfix, branchOf, showWork, step, RIGHT_AS_WRONG, OFF } = _kit;

// ───────────────────── 큰 수 — 네 자리 묶음 ─────────────────────

const P10 = (k) => 10 ** k;
const LIMIT = 9e15; // 9000조 — 2^53 아래에서만 뽑는다
const DG = ['', '일', '이', '삼', '사', '오', '육', '칠', '팔', '구'];
const BIGU = ['', '만', '억', '조'];
/** 자리 이름 (일의 자리부터) */
const PN = ['일', '십', '백', '천', '만', '십만', '백만', '천만', '억', '십억', '백억', '천억', '조', '십조', '백조', '천조'];
/** 네 자리 묶음 [일, 만, 억, 조] — 글자로 잘라 정확하게 */
export function groupsOf(n) {
  const s = String(n).padStart(16, '0');
  return [3, 2, 1, 0].map((i) => +s.slice(i * 4, i * 4 + 4));
}
function readGroup(g) {
  const d = [Math.floor(g / 1000), Math.floor(g / 100) % 10, Math.floor(g / 10) % 10, g % 10];
  const u = ['천', '백', '십', ''];
  return d.map((x, i) => (!x ? '' : (x === 1 && i < 3 ? '' : DG[x]) + u[i])).join('');
}
/**
 * 수를 한글로 읽은 말 — 30481 → "삼만 사백팔십일" · 맨 앞의 만의 묶음이 1이면 "만"(교과서 "만 또는 일만"), 억·조가 1이면 "일억"·"일조"
 * 앞에 억·조가 있으면 끼인 1만은 "일만"(300010000 → "삼억 일만", Codex 40차 #3)
 */
export function readKo(n) {
  if (!n) return '영';
  const g = groupsOf(n); const parts = [];
  for (let i = 3; i >= 0; i--) if (g[i]) parts.push((i === 1 && g[i] === 1 && !parts.length ? '' : readGroup(g[i])) + BIGU[i]);
  return parts.join(' ');
}
/** 만·억·조를 섞어 쓴 꼴 — 15690000 → "1569만" · 1620000000000 → "1조 6200억" */
export function mixed(n) {
  const g = groupsOf(n); const parts = [];
  for (let i = 3; i >= 0; i--) if (g[i]) parts.push(`${g[i]}${BIGU[i]}`);
  return parts.join(' ');
}
/** 0인 자리를 모두 빼고 이어 쓴 수 (30408 → 348) */
const zeroSkip = (n) => +String(n).replace(/0/g, '');
/** 0이 아닌 네 자리 묶음을 채우지 않고 이어 쓴 수 (삼만 오백 30500 → 3500 · 이천칠백오십구만 삼백 → 2759300) */
const zeroPad = (n) => +groupsOf(n).filter(Boolean).reverse().join('');
const lenOf = (n) => String(n).length;
const BAT = new Set(['0', '1', '3', '6', '7', '8']);
/** 끝소리로 조사 — 끝이 숫자면 읽는 소리(받침: 0·1·3·6·7·8), 한글이면 받침 */
function jo(w, a, b) {
  const s = String(w); const ch = s.slice(-1);
  if (/\d/.test(ch)) return s + (BAT.has(ch) ? a : b);
  const c = ch.charCodeAt(0) - 0xac00;
  return s + (c >= 0 && c < 11172 && c % 28 ? a : b);
}
/** 숫자 d가 한 번만 나오는 자리 k (없으면 -1) */
function onlyAt(n, d) {
  const s = String(n); const at = s.indexOf(String(d));
  return at >= 0 && at === s.lastIndexOf(String(d)) ? s.length - 1 - at : -1;
}
/** n의 k자리 숫자 (일의 자리 k = 0) */
const digitAt = (n, k) => Math.floor(n / P10(k)) % 10;
/** k자리를 times번 1씩 키울 때 9를 넘으면 붙이는 말 (Codex 40차 #1) */
const carryNote = (n, k, times) => (digitAt(n, k) + times > 9 ? ' — 9 다음에는 0이 되고 바로 윗자리가 1 커져요' : '');
const PATTERN_RULE = '앞의 두 수의 차를 먼저 보고, 그만큼씩 계속 더해요.';
/** 조건에 맞을 때까지 다시 뽑기 */
function draw(gen, ok) {
  for (let k = 0; k < 6000; k++) { const v = gen(); if (ok(v)) return v; }
  throw new Error('draw: 조건에 맞는 수를 못 뽑음');
}

// ───────────────────── 오답 정리·보기 ─────────────────────

/** 오답 후보 정리 — 자연수가 아니거나·9000조 넘거나·정답과 같거나·앞의 오답과 같은 값은 버린다 (probe.allWrong이 곧 이 목록) */
function clean(ans, list) {
  const out = [];
  for (const w of list) {
    if (!w || !Number.isSafeInteger(w.v) || w.v <= 0 || w.v >= LIMIT || w.v === ans || out.some((o) => o.v === w.v)) continue;
    out.push(w);
  }
  return out;
}
const W = (v, tag) => ({ v, tag });
/**
 * 고른 틀로 ① 문항 — v: { t, text, ans(수), fmt(수 → 보기 글, 없으면 숫자 그대로), words(보기에서 고르기), wr: [{v, tag}], steps, why, whyAny, rule, probe }
 * t는 틀 열쇠(tplKey — 숫자만 #로 바뀐다)를 만드는 글 — 한글로 읽은 수가 든 문제는 t에 숫자를, 실제 문제 글은 text에 둔다(아니면 문제마다 열쇠가 달라 🔁 쌍둥이가 같은 틀을 못 찾는다)
 * 숫자판 문제(words 없음)는 8자리 이하 수만 — 보기도 숫자 그대로라 숫자판으로 친다
 */
function bcalcAsk(r, c, concept, v) {
  const F = (t) => jfix(fill(t, c));
  const fmt = v.fmt || String;
  const wr = v.wr.map((w) => ({ text: fmt(w.v), tag: w.tag }));
  const chs = v.words ? textChoices(r, fmt(v.ans), wr) : choices(r, String(v.ans), wr);
  const why = Object.fromEntries(Object.entries(v.why || {}).map(([k, t]) => [k, F(t)]));
  return {
    ...ask(concept.id, 'calc', F(v.text || v.t), chs, { solve: solve(v.steps.map((s, i) => step(i, F(s))), { why, whyAny: F(v.whyAny || ''), rule: v.rule || concept.rule }) }),
    probe: { ...(v.probe || {}), allWrong: wr },
  };
}
const askFam = (r, c, concept, fams) => bcalcAsk(r, c, concept, runFamily(r, c, fams));
const WORK = (line, verb = '말했어요') => showWork(line, verb);
const RIGHT = { text: '맞게 말했어요', tag: RIGHT_AS_WRONG };
const BOLD = (x) => `\n\n**${x}**`;

/** 이 줄기의 오개념 이름표 (📊·🤔 노트·결과 카드에 그대로 뜬다) — 이름표 하나에 셈 하나 */
export const TAGS = {
  zeroSkip: '0인 자리를 빼고 씀',
  zeroPad: '단위 아래 네 자리를 다 채우지 않음',
  placeOff: '자리를 한 칸 잘못 셈',
  faceValue: '숫자만 보고 자리의 값으로 안 봄',
  unitShift: '만·억·조 단위를 잘못 붙임',
  frontDigit: '자리 수를 안 보고 앞자리만 봄',
  lowFirst: '낮은 자리부터 비교함',
  skipPlace: '뛰어 세는 자리를 잘못 봄',
  zeroFront: '0을 맨 앞에 둠',
  reverse: '가장 큰 수와 가장 작은 수를 바꿔 만듦',
};

/** 숫자 d가 k자리에 한 번만 있는 len자리 수 */
function withDigitAt(r, len, kLo, kHi) {
  return draw(() => {
    const n = int(r, P10(len - 1), P10(len) - 1); const k = int(r, kLo, Math.min(kHi, len - 1));
    const d = +String(n)[String(n).length - 1 - k];
    return { n, k, d };
  }, ({ n, k, d }) => d >= 2 && onlyAt(n, d) === k);
}
/** 나타내는 값 문제의 오답 이유 */
const whyValue = (d, k, ans) => ({
  [TAGS.faceValue]: `${jo(d, '은', '는')} ${PN[k]}의 자리 숫자 — ${jo(ans, '을', '를')} 나타내요.`,
  [TAGS.placeOff]: `자리를 한 칸 잘못 셌어요 — ${jo(d, '은', '는')} ${PN[k]}의 자리 숫자예요.`,
  [TAGS.unitShift]: `네 자리씩 끊어 묶음을 다시 봐요 — ${jo(d, '은', '는')} ${PN[k]}의 자리 숫자예요.`,
});

// ───────────────────── 개념 사다리 (Y. 큰 수 줄기) ─────────────────────

export const BIG = [
  {
    id: 'big.man', grade: 4, name: '10000 알아보기', needs: [],
    idea: '1000이 10개인 수를 **10000**이라 쓰고 만 또는 일만이라고 읽어요. 10000은 9000보다 1000, 9900보다 100, 9990보다 10, 9999보다 1 큰 수예요.',
    rule: '10000은 1000이 10개, 100이 100개, 10이 1000개인 수예요.',
    slip: '10000이 그 수의 몇 개인지, 얼마 큰 수인지 0의 개수를 세어 봐요.',
    calc(r, c) {
      const more = (t) => {
        const ans = int(r, 1, 9) * pick(r, [10, 100, 1000]); const a = 10000 - ans;
        return {
          t: t(a), ans, wr: clean(ans, [W(ans * 10, TAGS.placeOff), W(ans / 10, TAGS.placeOff)]),
          why: { [TAGS.placeOff]: `${a} + ${ans} = 10000 — 0의 개수를 세어 봐요.` },
          steps: [`${a} + ${ans} = 10000`, `10000은 ${a}보다 ${ans} 큰 수예요`],
          probe: { ask: 'more', a },
        };
      };
      const count = (t) => {
        const u = pick(r, [1000, 100, 10]); const ans = 10000 / u;
        return {
          t: t(u), ans, wr: clean(ans, [W(ans * 10, TAGS.placeOff), W(ans / 10, TAGS.placeOff)]),
          why: { [TAGS.placeOff]: `${u} × ${ans} = 10000 — 0의 개수를 세어 봐요.` },
          steps: [`${u} × ${ans} = 10000`, `10000은 ${jo(u, '이', '가')} ${ans}개인 수예요`],
          probe: { ask: 'count', u },
        };
      };
      return askFam(r, c, this, [
        famOf([more((a) => `10000은 ${a}보다 얼마 큰 수일까요?`)]),
        famOf([count((u) => `10000은 ${jo(u, '이', '가')} 몇 개인 수일까요?`)]),
        famOf([count((u) => `${u}원짜리 돈이 몇 개 있으면 10000원이 될까요?`)]),
        famOf([more((a) => `${a}원에서 얼마를 더 모으면 10000원이 될까요?`)]),
      ]);
    },
    misread(r, c) {
      if (branchOf(r, c, ['count', 'more']) === 'count') {
        const u = pick(r, [1000, 100, 10]); const right = 10000 / u;
        const shown = right >= 100 ? right / 10 : right * 10; const other = shown === right * 10 ? right / 10 : right * 10;
        return misAsk(r, c, this, 'count', {
          q: WORK(`10000은 ${jo(u, '이', '가')} ${shown}개인 수예요`),
          ok: `${u} × ${right} = 10000 — ${jo(u, '이', '가')} ${right}개예요`,
          wr: [RIGHT, { text: `${jo(u, '이', '가')} ${other}개예요`, tag: TAGS.placeOff }, { text: '10000은 너무 커서 셀 수 없어요', tag: OFF }],
          steps: [`${u} × ${right} = 10000`, `10000은 ${jo(u, '이', '가')} ${right}개인 수예요`],
          whyAny: `0의 개수를 잘못 셌어요 — ${u} × ${shown}은 10000이 아니에요.`,
          probe: { ask: 'count', u },
        });
      }
      const right = int(r, 1, 9) * pick(r, [10, 100, 1000]); const a = 10000 - right;
      const shown = right >= 100 ? right / 10 : right * 10; const other = shown === right * 10 ? right / 10 : right * 10;
      return misAsk(r, c, this, 'more', {
        q: WORK(`10000은 ${a}보다 ${shown} 큰 수예요`),
        ok: `${a} + ${right} = 10000 — ${right} 큰 수예요`,
        wr: [RIGHT, { text: `${other} 큰 수예요`, tag: TAGS.placeOff }, { text: '10000보다 작은 수와는 비교할 수 없어요', tag: OFF }],
        steps: [`${a} + ${right} = 10000`, `10000은 ${a}보다 ${right} 큰 수예요`],
        whyAny: `0의 개수를 잘못 셌어요 — ${a} + ${shown}은 10000이 아니에요.`,
        probe: { ask: 'more', a },
      });
    },
  },

  {
    id: 'big.five', grade: 4, name: '다섯 자리 수', needs: ['big.man'],
    idea: '10000이 2개, 1000이 5개, 100이 6개, 10이 4개, 1이 8개인 수는 **25648** — 이만 오천육백사십팔이라고 읽어요. 25648 = 20000 + 5000 + 600 + 40 + 8. 0인 자리는 읽지 않지만 쓸 때는 0을 써요: 30481은 삼만 사백팔십일.',
    rule: '자리마다 숫자가 나타내는 값을 생각해요 — 0인 자리는 읽지 않지만 쓸 때는 0을 써요.',
    slip: '0인 자리에 0을 썼는지, 숫자가 어느 자리에 있는지 봐요.',
    calc(r, c) {
      // 만의 자리 2~9 (만의 묶음이 1이면 "만"·"일만" 두 가지로 읽혀서 뺀다)
      const five = (ok) => draw(() => int(r, 20000, 99999), ok);
      const write = () => {
        // 0인 자리가 천의 자리 하나뿐이면(30468) "0 빼기"와 "네 자리를 채우지 않음"이 같은 3468 — 두 생각이 다른 값이 되는 수만 (Codex 40차 #2)
        const n = five((x) => x % 10000 >= 1 && x % 10000 < 1000 && zeroSkip(x) !== zeroPad(x));
        return {
          t: `다음을 수로 쓰면 얼마일까요?${BOLD(n)}`, text: `다음을 수로 쓰면 얼마일까요?${BOLD(readKo(n))}`, ans: n, wr: clean(n, [W(zeroPad(n), TAGS.zeroPad), W(n * 10, TAGS.placeOff)]),
          why: { [TAGS.zeroPad]: `만 아래는 천·백·십·일 네 자리 — 빈 자리에 0을 써서 ${n}.`, [TAGS.placeOff]: `다섯 자리 수예요 — 0을 하나 더 써서 여섯 자리가 됐어요.` },
          steps: [`만의 자리 숫자 ${Math.floor(n / 10000)}, 그 아래 네 자리 ${String(n % 10000).padStart(4, '0')}`, `${jo(readKo(n), '을', '를')} 수로 쓰면 ${n}`],
          probe: { ask: 'write', n },
        };
      };
      const expand = () => {
        const n = five((x) => /0/.test(String(x).slice(1, 4)) && zeroSkip(x) !== zeroPad(x));
        const parts = String(n).split('').map((d, i, a) => +d * P10(a.length - 1 - i)).filter(Boolean).join(' + ');
        return {
          t: `다음을 하나의 수로 나타내면 얼마일까요?${BOLD(n)}`, text: `다음을 하나의 수로 나타내면 얼마일까요?${BOLD(parts)}`, ans: n, wr: clean(n, [W(zeroSkip(n), TAGS.zeroSkip), W(n * 10, TAGS.placeOff)]),
          why: { [TAGS.zeroSkip]: `0인 자리에도 0을 써야 해요 — ${parts} = ${n}.`, [TAGS.placeOff]: '가장 큰 자리가 만의 자리 — 다섯 자리 수예요.' },
          steps: ['가장 큰 자리가 만의 자리 — 다섯 자리 수', `${parts} = ${n}`],
          probe: { ask: 'expand', n },
        };
      };
      const value = () => {
        const { n, k, d } = withDigitAt(r, 5, 2, 4); // 십의 자리면 1/10배가 그 숫자 하나 — "숫자만 봄"과 같은 값
        const ans = d * P10(k);
        return {
          t: `다음 수에서 숫자 ${jo(d, '이', '가')} 나타내는 값은 얼마일까요?${BOLD(n)}`, ans,
          wr: clean(ans, [W(d, TAGS.faceValue), W(ans * 10, TAGS.placeOff), W(ans / 10, TAGS.placeOff)]),
          why: whyValue(d, k, ans),
          steps: [`${jo(d, '은', '는')} ${PN[k]}의 자리 숫자`, `${jo(d, '이', '가')} 나타내는 값은 ${ans}`],
          probe: { ask: 'value', n, d },
        };
      };
      const read = () => {
        // 오답도 다섯 자리 이하로 읽게 — 10배(여섯 자리)를 읽으면 아직 안 배운 "십만"이 나온다
        const n = five((x) => /0/.test(String(x).slice(0, 4)) && x % 10 === 0 && zeroSkip(x) >= 100);
        return {
          words: true, fmt: readKo,
          t: `다음 수를 바르게 읽은 것은 어느 것일까요?${BOLD(n)}`, ans: n, wr: clean(n, [W(zeroSkip(n), TAGS.zeroSkip), W(n / 10, TAGS.placeOff)]),
          why: { [TAGS.zeroSkip]: `0인 자리는 읽지 않을 뿐 자리는 그대로예요 — ${readKo(n)}.`, [TAGS.placeOff]: '다섯 자리 수예요 — 가장 큰 자리가 만의 자리.' },
          steps: [`${n} — 만의 자리 숫자 ${Math.floor(n / 10000)}, 그 아래 ${String(n % 10000).padStart(4, '0')}`, `${readKo(n)}`],
          probe: { ask: 'read', n },
        };
      };
      return askFam(r, c, this, [famOf([write()]), famOf([expand()]), famOf([value()]), famOf([read()])]);
    },
    misread(r, c) {
      if (branchOf(r, c, ['write', 'value']) === 'write') {
        const n = draw(() => int(r, 20000, 99999), (x) => x % 10000 >= 1 && x % 10000 < 1000 && zeroSkip(x) !== zeroPad(x));
        return misAsk(r, c, this, 'write', {
          q: WORK(`${readKo(n)} → ${zeroPad(n)}`, '썼어요'),
          ok: `만 아래 네 자리를 다 채워요 — 빈 자리에 0을 써서 ${n}`,
          wr: [RIGHT, { text: `0을 하나 더 써서 ${n * 10}`, tag: TAGS.placeOff }, { text: '다섯 자리 수에는 0을 쓰지 않아요', tag: OFF }],
          steps: [`만의 자리 숫자 ${Math.floor(n / 10000)}, 그 아래 네 자리 ${String(n % 10000).padStart(4, '0')}`, `${jo(readKo(n), '을', '를')} 수로 쓰면 ${n}`],
          whyAny: `만 아래 네 자리를 다 채우지 않았어요 — ${jo(zeroPad(n), '은', '는')} ${lenOf(zeroPad(n))}자리 수예요.`,
          probe: { ask: 'write', n },
        });
      }
      const { n, k, d } = withDigitAt(r, 5, 2, 4);
      const ans = d * P10(k);
      return misAsk(r, c, this, 'value', {
        q: `[place ${n}]\n\n${WORK(`${n}에서 숫자 ${jo(d, '이', '가')} 나타내는 값은 ${ans / 10}`)}`,
        ok: `${jo(d, '은', '는')} ${PN[k]}의 자리 숫자 — ${jo(ans, '을', '를')} 나타내요`,
        wr: [RIGHT, { text: `${jo(d, '을', '를')} 나타내요`, tag: TAGS.faceValue }, { text: '숫자는 어느 자리에 있어도 같은 값이에요', tag: OFF }],
        steps: [`${jo(d, '은', '는')} ${PN[k]}의 자리 숫자`, `${jo(d, '이', '가')} 나타내는 값은 ${ans}`],
        whyAny: `자리를 한 칸 잘못 셌어요 — ${jo(d, '은', '는')} ${PN[k]}의 자리에 있어요.`,
        probe: { ask: 'value', n, d },
      });
    },
  },

  {
    id: 'big.manunit', grade: 4, name: '십만·백만·천만', needs: ['big.five'],
    idea: '10000이 10개면 **100000**(십만), 100개면 **1000000**(백만), 1000개면 **10000000**(천만). 10000이 2759개인 수는 27590000 — 일의 자리부터 네 자리씩 끊으면 2759 | 0000, 앞 묶음에 "만"을 붙여 이천칠백오십구만이라고 읽어요.',
    rule: '일의 자리부터 네 자리씩 끊어, 둘째 묶음에 "만"을 붙여 읽어요.',
    slip: '일의 자리부터 네 자리씩 끊어 만의 묶음이 어디인지 봐요.',
    calc(r, c) {
      const count = () => {
        const k = draw(() => int(r, 11, 9999), (x) => x % 10 !== 0);
        const ans = k * 10000;
        return {
          t: `10000이 ${k}개인 수는 얼마일까요?`, ans, wr: clean(ans, [W(k, TAGS.faceValue), W(k * 1000, TAGS.placeOff)]),
          why: { [TAGS.faceValue]: `${jo(k, '은', '는')} 10000의 개수예요 — ${k} 뒤에 0을 4개 써서 ${ans}.`, [TAGS.placeOff]: `10000은 0이 4개 — ${k} 뒤에 0을 4개 써요.` },
          steps: [`10000이 ${k}개 — ${k}만`, `${k} 뒤에 0을 4개 써서 ${ans}`],
          probe: { ask: 'count', k },
        };
      };
      const write = () => {
        const n = draw(() => int(r, 10, 9999) * 10000 + int(r, 1, 99) * 10, (x) => Math.floor(x / 10000) >= 2);
        return {
          t: `다음을 수로 쓰면 얼마일까요?${BOLD(n)}`, text: `다음을 수로 쓰면 얼마일까요?${BOLD(readKo(n))}`, ans: n, wr: clean(n, [W(zeroPad(n), TAGS.zeroPad), W(n / 10, TAGS.placeOff)]),
          why: { [TAGS.zeroPad]: `만 아래는 네 자리 — 빈 자리에 0을 써서 ${String(n % 10000).padStart(4, '0')}까지 채워요.`, [TAGS.placeOff]: '0을 하나 빼먹었어요 — 만의 묶음 아래는 꼭 네 자리예요.' },
          steps: [`만의 묶음 ${Math.floor(n / 10000)}, 그 아래 네 자리 ${String(n % 10000).padStart(4, '0')}`, `${jo(readKo(n), '을', '를')} 수로 쓰면 ${n}`],
          probe: { ask: 'write', n },
        };
      };
      const value = () => {
        const { n, k, d } = withDigitAt(r, int(r, 7, 8), 4, 7);
        const ans = d * P10(k);
        return {
          t: `다음 수에서 숫자 ${jo(d, '이', '가')} 나타내는 값은 얼마일까요?${BOLD(n)}`, ans,
          wr: clean(ans, [W(d, TAGS.faceValue), W(ans / 10, TAGS.placeOff), W(lenOf(ans * 10) <= 8 ? ans * 10 : 0, TAGS.placeOff)]),
          why: whyValue(d, k, ans),
          steps: [`${jo(d, '은', '는')} ${PN[k]}의 자리 숫자`, `${jo(d, '이', '가')} 나타내는 값은 ${ans}`],
          probe: { ask: 'value', n, d },
        };
      };
      const read = () => {
        // 여섯·일곱 자리 — 10배를 읽은 오답이 여덟 자리를 넘으면 아직 안 배운 "억"이 나온다
        // 0이 끝에만 있으면 1/10배를 읽은 말이 "0인 자리를 빼고 씀"과 같다 — 가운데에도 0이 있는 수만
        const n = draw(() => int(r, 10, 999) * 10000 + int(r, 1, 999) * 10, (x) => Math.floor(x / 10000) >= 2 && /0/.test(String(x).slice(0, -1)));
        return {
          words: true, fmt: readKo,
          t: `다음 수를 바르게 읽은 것은 어느 것일까요?${BOLD(n)}`, ans: n, wr: clean(n, [W(n * 10, TAGS.placeOff), W(n / 10, TAGS.placeOff)]),
          why: { [TAGS.placeOff]: `일의 자리부터 네 자리씩 끊어요 — ${Math.floor(n / 10000)} | ${String(n % 10000).padStart(4, '0')}.` },
          steps: [`네 자리씩 끊으면 ${Math.floor(n / 10000)} | ${String(n % 10000).padStart(4, '0')}`, `${readKo(n)}`],
          probe: { ask: 'read', n },
        };
      };
      return askFam(r, c, this, [famOf([count()]), famOf([write()]), famOf([value()]), famOf([read()])]);
    },
    misread(r, c) {
      if (branchOf(r, c, ['count', 'value']) === 'count') {
        const k = draw(() => int(r, 11, 9999), (x) => x % 10 !== 0);
        return misAsk(r, c, this, 'count', {
          q: WORK(`10000이 ${k}개인 수는 ${k * 1000}`),
          ok: `${k} 뒤에 0을 4개 써서 ${k * 10000}`,
          wr: [RIGHT, { text: `10000의 개수라서 ${k}`, tag: TAGS.faceValue }, { text: '10000이 1000개를 넘으면 셀 수 없어요', tag: OFF }],
          steps: [`10000이 ${k}개 — ${k}만`, `${k} 뒤에 0을 4개 써서 ${k * 10000}`],
          whyAny: `0을 3개만 썼어요 — 10000은 0이 4개예요.`,
          probe: { ask: 'count', k },
        });
      }
      const { n, k, d } = withDigitAt(r, 8, 5, 7);
      const ans = d * P10(k);
      return misAsk(r, c, this, 'value', {
        q: `[place ${n}]\n\n${WORK(`${n}에서 숫자 ${jo(d, '이', '가')} 나타내는 값은 ${ans / 10}`)}`,
        ok: `${jo(d, '은', '는')} ${PN[k]}의 자리 숫자 — ${jo(ans, '을', '를')} 나타내요`,
        wr: [RIGHT, { text: `${jo(d, '을', '를')} 나타내요`, tag: TAGS.faceValue }, { text: '만보다 큰 자리는 값을 셀 수 없어요', tag: OFF }],
        steps: [`${jo(d, '은', '는')} ${PN[k]}의 자리 숫자`, `${jo(d, '이', '가')} 나타내는 값은 ${ans}`],
        whyAny: `자리를 한 칸 잘못 셌어요 — 네 자리씩 끊어 만의 묶음을 다시 봐요.`,
        probe: { ask: 'value', n, d },
      });
    },
  },

  {
    id: 'big.eok', grade: 4, name: '억', needs: ['big.manunit'],
    idea: '1000만이 10개인 수는 **100000000** — 1억이라 쓰고 억 또는 일억이라고 읽어요. 1억이 3529개인 수는 352900000000 — 네 자리씩 끊으면 3529 | 0000 | 0000, 셋째 묶음에 "억"을 붙여 3529억(삼천오백이십구억)이에요.',
    rule: '일의 자리부터 네 자리씩 끊어, 셋째 묶음에 "억", 둘째 묶음에 "만"을 붙여 읽어요.',
    slip: '네 자리씩 끊어 억의 묶음이 어디인지 봐요.',
    calc(r, c) {
      const count = () => {
        const k = draw(() => int(r, 11, 9999), (x) => x % 10 !== 0);
        const ans = k * 1e8;
        return {
          words: true, t: `1억이 ${k}개인 수는 어느 것일까요?`, ans,
          wr: clean(ans, [W(k * 1e4, TAGS.unitShift), W(k * 1e9, TAGS.placeOff), W(k * 1e7, TAGS.placeOff)]),
          why: { [TAGS.unitShift]: `${k}만이 아니라 ${k}억 — ${k} 뒤에 0을 8개 써요.`, [TAGS.placeOff]: `1억은 0이 8개 — ${k} 뒤에 0을 8개 써요.` },
          steps: [`1억이 ${k}개 — ${k}억`, `${k} 뒤에 0을 8개 써서 ${ans}`],
          probe: { ask: 'count', k },
        };
      };
      // 억·만 묶음 안에도 0이 있게 — 없으면 "0인 자리를 빼고 씀"(끝의 0000까지 빠짐)과 "억을 만으로 읽음"이 같은 수가 된다
      const ab = () => draw(() => int(r, 11, 9999) * 1e8 + int(r, 100, 9999) * 1e4, (x) => groupsOf(x)[1] !== 1 && groupsOf(x)[2] % 10 !== 0 && /0/.test(String(x).slice(0, -4)));
      const write = () => {
        // 만의 묶음은 세 자리 이하 — 네 자리면 "네 자리를 다 채우지 않음"(억·만 묶음을 이어 씀)과 "억을 만으로 씀"이 같은 수가 된다
        const n = draw(() => int(r, 11, 9999) * 1e8 + int(r, 11, 999) * 1e4, (x) => groupsOf(x)[2] % 10 !== 0 && zeroSkip(x) !== zeroPad(x));
        return {
          words: true, t: `다음을 수로 쓴 것은 어느 것일까요?${BOLD(n)}`, text: `다음을 수로 쓴 것은 어느 것일까요?${BOLD(readKo(n))}`, ans: n,
          wr: clean(n, [W(zeroPad(n), TAGS.zeroPad), W(n / 1e4, TAGS.unitShift), W(n * 10, TAGS.placeOff)]),
          why: { [TAGS.zeroPad]: `억 아래 만의 묶음·일의 묶음도 네 자리씩 다 채워요 — ${n}.`, [TAGS.unitShift]: '억을 만으로 썼어요 — 억은 네 자리씩 셋째 묶음이에요.', [TAGS.placeOff]: '0을 하나 더 썼어요 — 묶음마다 꼭 네 자리예요.' },
          steps: [`억의 묶음 ${groupsOf(n)[2]}, 만의 묶음 ${String(groupsOf(n)[1]).padStart(4, '0')}, 일의 묶음 0000`, `수로 쓰면 ${n}`],
          probe: { ask: 'write', n },
        };
      };
      const read = () => {
        const n = ab();
        return {
          words: true, fmt: readKo, t: `다음 수를 바르게 읽은 것은 어느 것일까요?${BOLD(n)}`, ans: n,
          // 10배가 아니라 1/10배 — 10배를 읽으면 열세 자리라 아직 안 배운 "조"가 나온다
          wr: clean(n, [W(n / 1e4, TAGS.unitShift), W(n / 10, TAGS.placeOff)]),
          why: { [TAGS.unitShift]: '네 자리씩 끊으면 셋째 묶음이 억이에요.', [TAGS.placeOff]: '자리를 한 칸 잘못 셌어요 — 네 자리씩 다시 끊어 봐요.' },
          steps: [`네 자리씩 끊으면 ${groupsOf(n)[2]} | ${String(groupsOf(n)[1]).padStart(4, '0')} | 0000`, `${readKo(n)}`],
          probe: { ask: 'read', n },
        };
      };
      const value = () => {
        const { n, k, d } = withDigitAt(r, int(r, 10, 12), 8, 11);
        const ans = d * P10(k);
        return {
          words: true, t: `다음 수에서 숫자 ${jo(d, '이', '가')} 나타내는 값은 어느 것일까요?${BOLD(n)}`, ans,
          wr: clean(ans, [W(ans / 1e4, TAGS.unitShift), W(ans / 10, TAGS.placeOff), W(d, TAGS.faceValue)]),
          why: whyValue(d, k, ans),
          steps: [`${jo(d, '은', '는')} ${PN[k]}의 자리 숫자`, `${jo(d, '이', '가')} 나타내는 값은 ${ans}`],
          probe: { ask: 'value', n, d },
        };
      };
      return askFam(r, c, this, [famOf([count()]), famOf([write()]), famOf([read()]), famOf([value()])]);
    },
    misread(r, c) {
      const k = draw(() => int(r, 11, 9999), (x) => x % 10 !== 0);
      const n = k * 1e8;
      if (branchOf(r, c, ['unit', 'count']) === 'unit') {
        return misAsk(r, c, this, 'unit', {
          q: `[place ${n}]\n\n${WORK(`${jo(n, '은', '는')} ${k}만`, '읽었어요')}`,
          ok: `네 자리씩 끊으면 셋째 묶음 — ${k}억`,
          wr: [RIGHT, { text: `한 자리 더 커서 ${k * 10}억`, tag: TAGS.placeOff }, { text: '억은 너무 커서 쓸 수 없어요', tag: OFF }],
          steps: [`네 자리씩 끊으면 ${k} | 0000 | 0000`, `셋째 묶음에 억 — ${k}억`],
          whyAny: '억을 만으로 읽었어요 — 둘째 묶음이 만, 셋째 묶음이 억이에요.',
          probe: { ask: 'unit', n },
        });
      }
      return misAsk(r, c, this, 'count', {
        q: WORK(`1억이 ${k}개인 수는 ${k * 1e4}`),
        ok: `${k} 뒤에 0을 8개 써서 ${n}`,
        wr: [RIGHT, { text: `${k} 뒤에 0을 9개 써서 ${k * 1e9}`, tag: TAGS.placeOff }, { text: '1억이 1000개를 넘으면 셀 수 없어요', tag: OFF }],
        steps: [`1억이 ${k}개 — ${k}억`, `${k} 뒤에 0을 8개 써서 ${n}`],
        whyAny: `${k}만을 썼어요 — 1억은 0이 8개예요.`,
        probe: { ask: 'count', k },
      });
    },
  },

  {
    id: 'big.jo', grade: 4, name: '조', needs: ['big.eok'],
    idea: '1000억이 10개인 수는 **1000000000000** — 1조라 쓰고 조 또는 일조라고 읽어요. 1조가 5438개인 수는 5438000000000000 — 네 자리씩 끊어 넷째 묶음에 "조"를 붙여 5438조(오천사백삼십팔조). 1조가 764개, 1억이 1239개인 수는 764조 1239억 — 칠백육십사조 천이백삼십구억이에요.',
    rule: '일의 자리부터 네 자리씩 끊어 넷째 묶음에 "조", 셋째 묶음에 "억", 둘째 묶음에 "만"을 붙여 읽어요.',
    slip: '네 자리씩 끊어 조와 억의 묶음이 어디인지 봐요.',
    calc(r, c) {
      const count = () => {
        const k = draw(() => int(r, 11, 8999), (x) => x % 10 !== 0);
        const ans = k * 1e12;
        return {
          words: true, t: `1조가 ${k}개인 수는 어느 것일까요?`, ans,
          wr: clean(ans, [W(k * 1e8, TAGS.unitShift), W(k * 1e11, TAGS.placeOff)]),
          why: { [TAGS.unitShift]: `${k}억이 아니라 ${k}조 — ${k} 뒤에 0을 12개 써요.`, [TAGS.placeOff]: `1조는 0이 12개 — ${k} 뒤에 0을 12개 써요.` },
          steps: [`1조가 ${k}개 — ${k}조`, `${k} 뒤에 0을 12개 써서 ${ans}`],
          probe: { ask: 'count', k },
        };
      };
      // 조·억 묶음에 0이 하나도 없으면(8715조 2882억) "0 빼기"와 "채우지 않고 이어 씀"이 같은 87152882 (Codex 40차 #2)
      const ab = () => draw(() => [int(r, 11, 8999), int(r, 100, 9999)], ([a, b]) => b % 10 !== 0 && a % 10 !== 0 && zeroSkip(a * 1e12 + b * 1e8) !== zeroPad(a * 1e12 + b * 1e8));
      const mix = () => {
        const [a, b] = ab(); const ans = a * 1e12 + b * 1e8;
        return {
          words: true, t: `1조가 ${a}개, 1억이 ${b}개인 수는 어느 것일까요?`, ans,
          wr: clean(ans, [W(+`${a}${b}`, TAGS.zeroPad), W(a * 1e12 + b * 1e4, TAGS.unitShift)]),
          why: { [TAGS.zeroPad]: `조·억 아래 묶음도 네 자리씩 다 채워요 — ${ans}.`, [TAGS.unitShift]: '1억의 개수는 셋째 묶음(억)에 써요 — 둘째 묶음은 만이에요.' },
          steps: [`${a}조 ${b}억 — ${a} | ${String(b).padStart(4, '0')} | 0000 | 0000`, `수로 쓰면 ${ans}`],
          probe: { ask: 'mix', a, b },
        };
      };
      const write = () => {
        const [a, b] = ab(); const n = a * 1e12 + b * 1e8;
        return {
          words: true, t: `다음을 수로 쓴 것은 어느 것일까요?${BOLD(n)}`, text: `다음을 수로 쓴 것은 어느 것일까요?${BOLD(readKo(n))}`, ans: n,
          wr: clean(n, [W(zeroPad(n), TAGS.zeroPad), W(n / 1e4, TAGS.unitShift)]),
          why: { [TAGS.zeroPad]: `조 아래 억·만·일의 묶음도 네 자리씩 다 채워요 — ${n}.`, [TAGS.unitShift]: '조를 억으로 썼어요 — 조는 네 자리씩 넷째 묶음이에요.' },
          steps: [`조의 묶음 ${a}, 억의 묶음 ${String(b).padStart(4, '0')}, 그 아래 0000 0000`, `수로 쓰면 ${n}`],
          probe: { ask: 'write', n },
        };
      };
      const read = () => {
        const [a, b] = ab(); const n = a * 1e12 + b * 1e8;
        return {
          words: true, fmt: readKo, t: `다음 수를 바르게 읽은 것은 어느 것일까요?${BOLD(n)}`, ans: n,
          wr: clean(n, [W(n / 1e4, TAGS.unitShift), W(n / 10, TAGS.placeOff)]),
          why: { [TAGS.unitShift]: '네 자리씩 끊으면 넷째 묶음이 조, 셋째 묶음이 억이에요.', [TAGS.placeOff]: '자리를 한 칸 잘못 셌어요 — 네 자리씩 다시 끊어 봐요.' },
          steps: [`네 자리씩 끊으면 ${a} | ${String(b).padStart(4, '0')} | 0000 | 0000`, `${readKo(n)}`],
          probe: { ask: 'read', n },
        };
      };
      return askFam(r, c, this, [famOf([count()]), famOf([mix()]), famOf([write()]), famOf([read()])]);
    },
    misread(r, c) {
      if (branchOf(r, c, ['unit', 'mix']) === 'unit') {
        const k = draw(() => int(r, 11, 899), (x) => x % 10 !== 0);
        const n = k * 1e12;
        return misAsk(r, c, this, 'unit', {
          q: `[place ${n}]\n\n${WORK(`${jo(n, '은', '는')} ${k}억`, '읽었어요')}`,
          ok: `네 자리씩 끊으면 넷째 묶음 — ${k}조`,
          wr: [RIGHT, { text: `한 자리 더 커서 ${k * 10}조`, tag: TAGS.placeOff }, { text: '조는 너무 커서 쓸 수 없어요', tag: OFF }],
          steps: [`네 자리씩 끊으면 ${k} | 0000 | 0000 | 0000`, `넷째 묶음에 조 — ${k}조`],
          whyAny: '조를 억으로 읽었어요 — 셋째 묶음이 억, 넷째 묶음이 조예요.',
          probe: { ask: 'unit', n },
        });
      }
      const [a, b] = draw(() => [int(r, 11, 8999), int(r, 100, 9999)], ([x, y]) => y % 10 !== 0 && x % 10 !== 0 && zeroSkip(x * 1e12 + y * 1e8) !== zeroPad(x * 1e12 + y * 1e8));
      const n = a * 1e12 + b * 1e8;
      return misAsk(r, c, this, 'mix', {
        q: WORK(`1조가 ${a}개, 1억이 ${b}개인 수는 ${a}${b}`),
        ok: `${a} | ${String(b).padStart(4, '0')} | 0000 | 0000 — ${n}`,
        wr: [RIGHT, { text: `1억을 1만으로 보아 ${a}조 ${b}만`, tag: TAGS.unitShift }, { text: '조와 억은 함께 쓸 수 없어요', tag: OFF }],
        steps: [`${a}조 ${b}억 — ${a} | ${String(b).padStart(4, '0')} | 0000 | 0000`, `수로 쓰면 ${n}`],
        whyAny: '조·억 아래 묶음을 네 자리씩 채우지 않고 이어 썼어요.',
        probe: { ask: 'mix', a, b },
      });
    },
  },

  {
    id: 'big.skip', grade: 4, name: '뛰어 세기', needs: ['big.jo'],
    idea: '120000에서 10000씩 뛰어 세면 130000, 140000, 150000 — 만의 자리 숫자가 1씩 커져요. 3250만에서 1000만씩 뛰어 세면 4250만, 5250만 — 천만의 자리 숫자가 1씩 커져요. 어느 자리 숫자가 바뀌는지 보면 얼마씩 뛰어 셌는지 알 수 있어요.',
    rule: '얼마씩 뛰어 세는지 보고 그만큼씩 더해요 — 10000씩이면 만의 자리 숫자가 1씩 커지고, 9 다음에는 0이 되며 바로 윗자리가 1 커져요.',
    slip: '어느 자리 숫자가 1씩 커지는지 봐요.',
    calc(r, c) {
      const man = () => {
        const st = pick(r, [10000, 100000]); const s = int(r, 100000, 899999); const k = int(r, 2, 5);
        const ans = s + k * st; const list = Array.from({ length: k }, (_, i) => s + (i + 1) * st);
        const pl = lenOf(st) - 1; const note = carryNote(s, pl, k);
        return {
          t: `${s}에서 ${st}씩 ${k}번 뛰어 세면 얼마일까요?`, ans,
          wr: clean(ans, [W(s + k * st * 10, TAGS.skipPlace), W(s + (k * st) / 10, TAGS.skipPlace)]),
          why: { [TAGS.skipPlace]: `${st}씩 — ${PN[pl]}의 자리 숫자가 1씩 커져요${note}.` },
          steps: [`${st}씩 뛰어 세면 ${PN[pl]}의 자리 숫자가 1씩 커져요${note}`, `${s} → ${list.join(' → ')}`],
          probe: { ask: 'man', s, st, k },
        };
      };
      const eok = () => {
        const a = int(r, 1000, 4999); const st = pick(r, [100, 1000]); const k = int(r, 2, 4);
        const ans = (a + k * st) * 1e8; const note = carryNote(a, lenOf(st) - 1, k);
        return {
          words: true, fmt: mixed, t: `${a}억에서 ${st}억씩 ${k}번 뛰어 센 수는 어느 것일까요?`, ans,
          wr: clean(ans, [W((a + k * st * 10) * 1e8, TAGS.skipPlace), W((a + (k * st) / 10) * 1e8, TAGS.skipPlace)]),
          why: { [TAGS.skipPlace]: `${st}억씩 — 억의 묶음에서 ${PN[lenOf(st) - 1]}의 자리 숫자가 1씩 커져요${note}.` },
          steps: [`${st}억씩 ${k}번 — ${k * st}억 커져요`, `${a}억 → ${mixed(ans)}`],
          probe: { ask: 'eok', a, st, k },
        };
      };
      const pattern = (unit) => () => {
        const d = pick(r, [10, 20, 50, 100, 200, 500, 1000]); const a = int(r, 1000, 8000);
        const x = [0, 1, 2].map((i) => (a + i * d) * unit); const ans = (a + 3 * d) * unit;
        return {
          words: true, fmt: mixed,
          // 섞어 쓴 꼴의 모양(9250억 · 1조 1000억)이 문제마다 달라 열쇠는 단위로만
          t: `규칙에 따라 뛰어 세었어요 — ${unit === 1e4 ? '만' : '억'} 단위`, text: `규칙에 따라 뛰어 세었어요. □에 알맞은 수는 어느 것일까요?${BOLD(`${x.map(mixed).join(' — ')} — □`)}`, ans,
          wr: clean(ans, [W((a + 2 * d + 10 * d) * unit, TAGS.skipPlace), W((a + 2 * d + d / 10) * unit, TAGS.skipPlace)]),
          why: { [TAGS.skipPlace]: `${mixed(d * unit)}씩 커져요 — 앞의 두 수의 차를 먼저 봐요.` },
          steps: [`${mixed(x[1])} − ${mixed(x[0])} — ${mixed(d * unit)}씩 커져요`, `${mixed(x[2])} 다음은 ${mixed(ans)}`],
          rule: PATTERN_RULE,
          probe: { ask: 'pattern', unit, d },
        };
      };
      return askFam(r, c, this, [famOf([man()]), famOf([eok()]), famOf([pattern(1e4)()]), famOf([pattern(1e8)()])]);
    },
    misread(r, c) {
      if (branchOf(r, c, ['place', 'pattern']) === 'place') {
        const st = pick(r, [10000, 100000]); const pl = lenOf(st) - 1;
        // 받아올림이 있으면 "그 자리 숫자가 1씩 커져요"가 거짓 — 보여 준 자리·고칠 자리·틀린 자리 모두 3번 더해도 9 이하 (Codex 40차 #1)
        const s = draw(() => int(r, 100000, 799999), (x) => [pl - 1, pl, pl + 1].every((p) => digitAt(x, p) <= 6));
        const shown = [1, 2, 3].map((i) => s + (i * st) / 10); const right = [1, 2, 3].map((i) => s + i * st); const big = [1, 2, 3].map((i) => s + i * st * 10);
        return misAsk(r, c, this, 'place', {
          q: WORK(`${s}에서 ${st}씩 뛰어 세면 ${shown.join(', ')}`),
          ok: `${PN[lenOf(st) - 1]}의 자리 숫자가 1씩 커져요 — ${right.join(', ')}`,
          wr: [RIGHT, { text: `${PN[lenOf(st)]}의 자리 숫자가 1씩 커져요 — ${big.join(', ')}`, tag: TAGS.skipPlace }, { text: '뛰어 세기는 1씩만 할 수 있어요', tag: OFF }],
          steps: [`${st}씩 — ${PN[lenOf(st) - 1]}의 자리 숫자가 1씩 커져요`, `${s} → ${right.join(' → ')}`],
          whyAny: `${PN[lenOf(st) - 2]}의 자리를 키웠어요 — ${st}씩이면 ${PN[lenOf(st) - 1]}의 자리예요.`,
          probe: { ask: 'place', s, st },
        });
      }
      const d = pick(r, [10, 20, 50, 100, 200, 500, 1000]); const a = int(r, 1000, 8000);
      const x = [0, 1, 2].map((i) => (a + i * d) * 1e4); const ans = (a + 3 * d) * 1e4;
      return misAsk(r, c, this, 'pattern', {
        q: WORK(`${x.map(mixed).join(', ')} 다음은 ${mixed((a + 2 * d + d / 10) * 1e4)}`),
        ok: `${mixed(d * 1e4)}씩 커져요 — ${mixed(x[2])} 다음은 ${mixed(ans)}`,
        wr: [RIGHT, { text: `${mixed(d * 10 * 1e4)}씩 커져서 ${mixed((a + 2 * d + 10 * d) * 1e4)}`, tag: TAGS.skipPlace }, { text: '만이 붙은 수는 뛰어 셀 수 없어요', tag: OFF }],
        steps: [`${mixed(x[1])} − ${mixed(x[0])} — ${mixed(d * 1e4)}씩`, `${mixed(x[2])} 다음은 ${mixed(ans)}`],
        whyAny: `앞의 두 수의 차를 다시 봐요 — ${mixed(d * 1e4)}씩 커지고 있어요.`,
        rule: PATTERN_RULE,
        probe: { ask: 'pattern', d },
      });
    },
  },

  {
    id: 'big.compare', grade: 4, name: '큰 수의 크기 비교', needs: ['big.skip'],
    idea: '자리 수가 다르면 자리 수가 많은 쪽이 커요: 50730000(여덟 자리)은 9670000(일곱 자리)보다 커요. 자리 수가 같으면 가장 높은 자리부터 차례로 비교해요: 1569만과 1581만은 천만·백만의 자리가 같고, 십만의 자리 8이 6보다 커서 1581만이 더 커요.',
    rule: '자리 수부터 비교하고, 같으면 가장 높은 자리부터 차례로 비교해요.',
    slip: '자리 수가 같은지 먼저 보고, 높은 자리부터 비교했는지 봐요.',
    calc(r, c) {
      const fam = (len, big, unit, fmt) => () => {
        const { ok, front, low } = trio(r, len, big);
        const t = `다음 중 ${big ? '가장 큰' : '가장 작은'} 수는 어느 것일까요?`;
        const O = ok * unit; const F = front * unit; const L = low * unit;
        return {
          words: true, fmt, t, ans: O,
          wr: clean(O, [W(F, TAGS.frontDigit), W(L, TAGS.lowFirst)]),
          why: {
            [TAGS.frontDigit]: `자리 수부터 비교해요 — ${jo(fmt(F), '은', '는')} ${lenOf(F)}자리, ${jo(fmt(O), '은', '는')} ${lenOf(O)}자리예요.`,
            [TAGS.lowFirst]: '자리 수가 같으면 가장 높은 자리부터 비교해요 — 낮은 자리부터 보면 안 돼요.',
          },
          steps: [`자리 수: ${[O, F, L].map((x) => `${fmt(x)}(${lenOf(x)}자리)`).join(', ')}`, `${big ? '가장 큰' : '가장 작은'} 수는 ${fmt(O)}`],
          probe: { ask: 'compare', big },
        };
      };
      return askFam(r, c, this, [
        famOf([fam(int(r, 7, 9), true, 1, String)()]),
        famOf([fam(int(r, 7, 9), false, 1, String)()]),
        famOf([fam(4, true, 1e4, mixed)()]),
        famOf([fam(6, true, 1e8, mixed)()]),
      ]);
    },
    misread(r, c) {
      if (branchOf(r, c, ['front', 'low']) === 'front') {
        const { ok, front, low } = trio(r, 8, true);
        return misAsk(r, c, this, 'front', {
          q: WORK(`${ok}, ${front}, ${low} 중에서 가장 큰 수는 ${front}`),
          ok: `${jo(front, '은', '는')} ${lenOf(front)}자리 — 자리 수가 많은 수 중에서 높은 자리부터 보면 ${jo(ok, '이', '가')} 가장 커요`,
          wr: [RIGHT, { text: `낮은 자리부터 보면 ${jo(low, '이', '가')} 가장 커요`, tag: TAGS.lowFirst }, { text: '자리 수가 다르면 비교할 수 없어요', tag: OFF }],
          steps: [`자리 수: ${ok}(${lenOf(ok)}자리), ${front}(${lenOf(front)}자리), ${low}(${lenOf(low)}자리)`, `가장 큰 수는 ${ok}`],
          whyAny: '앞자리 숫자만 봤어요 — 자리 수부터 세어 봐요.',
          probe: { ask: 'front', big: true },
        });
      }
      const { ok, front, low } = trio(r, 4, true);
      const [O, F, L] = [ok, front, low].map((x) => x * 1e4);
      return misAsk(r, c, this, 'low', {
        q: WORK(`${mixed(O)}, ${mixed(F)}, ${mixed(L)} 중에서 가장 큰 수는 ${mixed(L)}`),
        ok: `자리 수가 같으면 높은 자리부터 — ${jo(mixed(O), '이', '가')} 가장 커요`,
        wr: [RIGHT, { text: `앞자리 숫자가 가장 큰 ${jo(mixed(F), '이', '가')} 가장 커요`, tag: TAGS.frontDigit }, { text: '만이 붙은 수끼리는 비교할 수 없어요', tag: OFF }],
        steps: [`${mixed(O)}과 ${mixed(L)}은 자리 수가 같아요 — 높은 자리부터 비교`, `가장 큰 수는 ${mixed(O)}`],
        whyAny: '낮은 자리부터 비교했어요 — 자리 수가 같으면 가장 높은 자리부터 봐요.',
        probe: { ask: 'low', big: true },
      });
    },
  },

  {
    id: 'big.apply', grade: 4, name: '⭐ 큰 수 활용', needs: ['big.compare'],
    idea: '숫자 카드로 가장 큰 수를 만들 때는 큰 숫자부터 높은 자리에 놓아요. 가장 작은 수는 작은 숫자부터 — 0은 맨 앞에 올 수 없어서 둘째 자리에 둬요: 0, 2, 3, 5, 8로 만든 가장 큰 수는 85320, 가장 작은 수는 20358. 1억에 가장 가까운 수는 자리 수부터 보고 1억과의 차이를 비교해요.',
    rule: '가장 큰 수는 큰 숫자부터, 가장 작은 수는 0이 아닌 가장 작은 숫자부터 높은 자리에 놓아요.',
    slip: '카드를 모두 썼는지, 0이 맨 앞에 오지 않았는지 봐요.',
    calc(r, c) {
      const cards = () => { const m = int(r, 4, 7); const ds = shuffle(r, [1, 2, 3, 4, 5, 6, 7, 8, 9]).slice(0, m); return shuffle(r, [0, ...ds]); };
      const small = () => {
        const cs = cards(); const ans = smallest(cs); const L = largest(cs);
        return {
          t: '숫자 카드 — 가장 작은 수', text: `숫자 카드 **${cs.join(', ')}**${jo(cs.join(', '), '을', '를').slice(-1)} 한 번씩 모두 써서 만들 수 있는 가장 작은 수는 얼마일까요?`, ans,
          wr: clean(ans, [W(zeroFrontOf(cs), TAGS.zeroFront), W(L, TAGS.reverse)]),
          why: { [TAGS.zeroFront]: `0은 맨 앞에 올 수 없어요 — 맨 앞에 두면 카드를 한 장 덜 쓴 수가 돼요.`, [TAGS.reverse]: '가장 작은 수는 작은 숫자부터 높은 자리에 놓아요.' },
          steps: [`0은 맨 앞에 올 수 없어요 — 맨 앞에 ${String(ans)[0]}, 그다음 0`, `가장 작은 수는 ${ans}`],
          probe: { ask: 'small', cards: cs },
        };
      };
      const large = () => {
        const cs = cards(); const ans = largest(cs);
        return {
          t: '숫자 카드 — 가장 큰 수', text: `숫자 카드 **${cs.join(', ')}**${jo(cs.join(', '), '을', '를').slice(-1)} 한 번씩 모두 써서 만들 수 있는 가장 큰 수는 얼마일까요?`, ans,
          wr: clean(ans, [W(smallest(cs), TAGS.reverse), W(zeroSkip(ans), TAGS.zeroSkip)]),
          why: { [TAGS.reverse]: '가장 큰 수는 큰 숫자부터 높은 자리에 놓아요.', [TAGS.zeroSkip]: `0도 한 번 써야 해요 — 맨 끝에 두어 ${ans}.` },
          steps: ['큰 숫자부터 높은 자리에 — 0은 맨 끝', `가장 큰 수는 ${ans}`],
          probe: { ask: 'large', cards: cs },
        };
      };
      const near = (e) => () => {
        const T = P10(e); const d = int(r, 1, 5); const ans = T - d * P10(e - 2);
        const A = int(r, 11, 19) * P10(e); const B = int(r, 11, 19) * P10(e - 2);
        const name = e === 8 ? '1억' : '1조';
        return {
          words: true, t: `다음 중 ${name}에 가장 가까운 수는 어느 것일까요?`, ans,
          wr: clean(ans, [W(A, TAGS.frontDigit), W(B, TAGS.frontDigit)]),
          why: { [TAGS.frontDigit]: `앞자리 1만 보면 안 돼요 — 자리 수부터 세어 ${jo(name, '과', '와')} 견줘요. ${jo(name, '은', '는')} ${e + 1}자리예요.` },
          steps: [`${jo(name, '은', '는')} ${e + 1}자리 — ${jo(ans, '은', '는')} ${name}보다 ${mixed(T - ans)} 작아요`, `가장 가까운 수는 ${ans}`],
          probe: { ask: 'near', e },
        };
      };
      return askFam(r, c, this, [famOf([small()]), famOf([large()]), famOf([near(8)()]), famOf([near(12)()])]);
    },
    misread(r, c) {
      const m = int(r, 4, 6); const ds = shuffle(r, [1, 2, 3, 4, 5, 6, 7, 8, 9]).slice(0, m); const cs = shuffle(r, [0, ...ds]);
      const S = smallest(cs); const L = largest(cs);
      if (branchOf(r, c, ['cards', 'largest']) === 'cards') {
        return misAsk(r, c, this, 'cards', {
          q: WORK(`숫자 카드 ${cs.join(', ')}로 만든 가장 작은 수는 ${zeroFrontOf(cs)}`),
          ok: `0은 맨 앞에 올 수 없어요 — 둘째 자리에 두어 ${S}`,
          wr: [RIGHT, { text: `큰 숫자부터 놓아 ${L}`, tag: TAGS.reverse }, { text: '0은 카드로 쓸 수 없어요', tag: OFF }],
          steps: [`맨 앞에 ${String(S)[0]}, 그다음 0`, `가장 작은 수는 ${S}`],
          whyAny: '0을 맨 앞에 두면 카드를 한 장 덜 쓴 수가 돼요.',
          probe: { ask: 'cards', cards: cs },
        });
      }
      return misAsk(r, c, this, 'largest', {
        q: WORK(`숫자 카드 ${cs.join(', ')}로 만든 가장 큰 수는 ${zeroSkip(L)}`),
        ok: `0도 써야 해요 — 맨 끝에 두어 ${L}`,
        wr: [RIGHT, { text: `작은 숫자부터 놓아 ${S}`, tag: TAGS.reverse }, { text: '0은 맨 끝에 올 수 없어요', tag: OFF }],
        steps: ['큰 숫자부터 높은 자리에 — 0은 맨 끝', `가장 큰 수는 ${L}`],
        whyAny: '카드를 모두 써야 해요 — 0을 빼먹었어요.',
        probe: { ask: 'largest', cards: cs },
      });
    },
  },
];

// ───────────────────── 비교·카드 도우미 ─────────────────────

/**
 * 크기 비교 보기 셋 — ok(정답) · front(자리 수가 하나 다르고 앞자리 숫자가 "더 그럴듯한" 수) · low(자리 수가 같고, 낮은 자리부터 보면 "더 그럴듯한" 수)
 * big = 가장 큰 수를 묻는가. len = 정답의 자리 수
 */
function trio(r, len, big) {
  return draw(() => {
    const okD = String(int(r, P10(len - 1), P10(len) - 1)).split('').map(Number);
    const lead = okD[0];
    const fLen = big ? len - 1 : len + 1;
    const fLead = big ? int(r, lead + 1, 9) : int(r, 1, lead - 1);
    const front = fLead * P10(fLen - 1) + int(r, 0, P10(fLen - 1) - 1);
    // low — 높은 자리 i는 정답보다 작게(가장 큰 수) / 크게(가장 작은 수), 낮은 자리 j(< i)는 그 반대로 — 다른 자리는 그대로
    const lowD = okD.slice();
    const i = int(r, 1, len - 2); const j = int(r, i + 1, len - 1); // 왼쪽부터 센 자리 (0 = 맨 앞)
    if (big) { lowD[i] -= int(r, 1, 3); lowD[j] += int(r, 1, 3); } else { lowD[i] += int(r, 1, 3); lowD[j] -= int(r, 1, 3); }
    const low = lowD.every((x) => x >= 0 && x <= 9) ? +lowD.join('') : 0;
    return { ok: +okD.join(''), front, low, lead, fLead };
  }, ({ ok, front, low, lead, fLead }) => low > 0 && lenOf(low) === len && fLead >= 1 && fLead <= 9 && (big ? lead <= 8 : lead >= 2) && lenOf(front) === (big ? len - 1 : len + 1) && new Set([ok, front, low]).size === 3);
}
/** 카드로 만든 가장 큰 수 */
const largest = (cs) => +cs.slice().sort((a, b) => b - a).join('');
/** 카드로 만든 가장 작은 수 — 0이 아닌 가장 작은 숫자를 맨 앞에 */
function smallest(cs) {
  const s = cs.slice().sort((a, b) => a - b); const first = s.find((x) => x > 0);
  s.splice(s.indexOf(first), 1);
  return +[first, ...s].join('');
}
/** 0을 맨 앞에 두고 작은 숫자부터 놓은 수 — 0이 빠진 값이 된다 */
const zeroFrontOf = (cs) => +cs.slice().sort((a, b) => a - b).join('');

export function conceptById(id) {
  return BIG.find((c) => c.id === id) || null;
}

// ───────────────────── 문항 만들기 (mathddiv와 같은 모양) ─────────────────────

const SLIP = '한 번 더 천천히 — 일의 자리부터 네 자리씩 끊어 자리를 세어 봐요.';
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
  return diagnosticOf(BIG, makeQuestion, seed, n, opts);
}
export function placeFrom(answers) {
  return placeFromOf(BIG, answers);
}
export function ladder(doneIds) {
  return ladderOf(BIG, doneIds);
}

// ───────────────────── 사람이 쓴 내용 검사 (check.mjs가 부른다) ─────────────────────

function badPlaceholders(txt) {
  const leak = String(txt || '').match(/\{[^}]*\}/g) || [];
  return leak.filter((l) => !/^\{(me|mon|mon2)(\/[^/}]+\/[^}]+)?\}$/.test(l));
}
/** 글자 → 분수 값 {n, d} (checkHuman이 쓴다) — 자연수만 */
const ratOf = (t) => { const s = String(t || '').trim(); return /^\d+$/.test(s) ? { n: +s, d: 1 } : null; };

/**
 * coach/math/bignum.json 형식 검사 — mathddiv.checkContent와 같은 규칙
 * @returns {string[]}
 */
export function checkContent(content) {
  const bad = [];
  const same = (a, b) => !!(a && b && a.n * b.d === b.n * a.d);
  for (const c of BIG) {
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
