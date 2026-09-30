// 🔢 수학 — F 비와 비율 줄기 (초6 1학기 「비와 비율」 → 2학기 「비례식과 비례배분」):
// 개념 사다리 + 문제 생성기 + 내용 형식 검사. 순수 함수만 — 화면 없음 (node 테스트에서 그대로 돈다).
//
// 왜 이 줄기인가 (2026-09-30, 아버님 결정 "진행 순서 제안대로"): 비율은 결국 **분수 = 소수 = 백분율**이다
// (3/4 = 0.75 = 75%). 방금 만든 A 분수·C 소수를 다시 쓰며 굳히고, 진우가 매일 보는 게임 숫자
// (잡힐 확률 30%, 🛒 할인)가 전부 비율이라 문제 이야기를 진우의 게임으로 쓸 수 있다.
// 글자 D는 문자와 식 몫으로 비워 두었으므로 F.
//
// 이 단원의 오답은 거의 전부 **무엇이 기준인가**의 오해다. 그래서 오답에 그 오해의 이름을 붙인다:
//   · 기준량과 비교량을 뒤바꿈 — "지우개 수에 대한 연필 수의 비"를 지우개 : 연필로
//   · 100을 곱하지 않음       — 0.35를 0.35%로
//   · 백분율을 그대로 뺌      — 8000원을 20% 할인하면 7980원
//   · 같은 수를 더함          — 2 : 3 = 8 : 9 (비의 성질을 덧셈으로)
//   · 전체를 합으로 나누지 않음 — 28개를 3 : 4로 나누면 28 × 3/4 = 21
//
// ★ 답은 테스트가 **따로 만든 계산기**로 다시 푼다(probe). 생성기가 답을 셈한 코드로 검산하면 의미가 없다.

import { figureSvg } from './mathdraw.js';
import { rng, shuffle, fill, castOf, worldPick, ask, solve, int, pick, pickFamily, humanQuestion, checkHuman, diagnosticOf, placeFromOf, ladderOf, gcd, josa, numJosa } from './mathgen.js';
import { gradeLabel, reduce, fracText, valueOf as numValue } from './mathmix.js';
import { decText } from './mathdec.js';

export { gradeLabel };

// ───────────────────── 수 — 글자와 값 ─────────────────────

/**
 * 보기 글자 → 값 (겹침 검사용). "35%"는 0.35, "3/4"·"0.75"·"12"는 그대로. 비("3 : 5")와 말 보기는 null.
 * 화면이 G().valueOf를 부르는데 숫자를 돌려주므로 🎯 감 잡기(1/2보다 큰가?)는 이 줄기에 붙지 않는다 (B·C와 같다)
 */
export function valueOf(text) {
  const s = String(text == null ? '' : text).trim();
  const m = /^(\d+(?:\.\d+)?)%$/.exec(s);
  if (m) return Number(m[1]) / 100;
  if (/:/.test(s)) return null;
  return numValue(s);
}
const sameValue = (a, b) => a !== null && b !== null && Math.abs(a - b) < 1e-9;

/** a/b를 분수 글자로 (기약, 분모 1이면 자연수) */
const fr = (a, b) => { const q = reduce(a, b); return fracText(q.n, q.d); };
/** a/b가 소수로 딱 떨어지면 그 글자, 아니면 '' (분모에 2·5만 있을 때) */
function decOf(a, b) {
  const q = reduce(a, b);
  let d = q.d; let p2 = 0; let p5 = 0;
  while (d % 2 === 0) { d /= 2; p2++; }
  while (d % 5 === 0) { d /= 5; p5++; }
  if (d !== 1) return '';
  const places = Math.max(p2, p5);
  return decText(q.n * (10 ** places / q.d), places);
}
/** a/b를 백분율 글자로 — 자연수나 소수 한 자리로 딱 떨어질 때만 ("12.5%"), 아니면 '' */
function pctOf(a, b) {
  const v = decOf(a * 100, b);
  if (!v) return '';
  return (v.split('.')[1] || '').length <= 1 ? `${v}%` : '';
}
/** 비 글자 */
const R = (a, b) => `${a} : ${b}`;

// ── 조사 — 수 뒤에서는 읽는 소리로 (5 오·3 삼…), %는 "퍼센트"라 받침 없음, 비 "3 : 5"는 뒤 수, 분수는 분자 ──
const BAT = new Set(['0', '1', '3', '6', '7', '8']);
function lastDigit(t) {
  const s = String(t);
  const tail = s.split(' : ').pop();
  return tail.includes('/') ? tail.split('/')[0].slice(-1) : tail.slice(-1);
}
/** 수 글자 + 조사 (이/가·을/를·은/는·과/와·이에요/예요) */
function jn(t, withB, without) {
  const s = String(t);
  if (/%$/.test(s)) return s + without;
  return s + (BAT.has(lastDigit(s)) ? withB : without);
}
/** 수 글자 + (으)로 — ㄹ받침(1·7·8) 뒤에는 '로' */
function ro(t) {
  const s = String(t);
  if (/%$/.test(s)) return `${s}로`;
  return s + numJosa(Number(lastDigit(s)), '으로', '로');
}
/** 한글 낱말 + 조사 */
const jw = (w, a, b) => w + josa(w, a, b);

// ───────────────────── 보기 ─────────────────────

/** 정답 근처의 "계산 실수" — 자연수·소수·분수·백분율 모양대로 (보기가 모자랄 때만) */
function nearOf(answer, k) {
  const s = String(answer);
  let m;
  if ((m = /^(\d+(?:\.\d+)?)%$/.exec(s))) {
    const v = Number(m[1]); const st = [5, -5, 10, -10, 1, -1][k % 6];
    return v + st > 0 ? `${Math.round((v + st) * 10) / 10}%` : '';
  }
  if ((m = /^(\d+)\/(\d+)$/.exec(s))) {
    const n = Number(m[1]); const d = Number(m[2]);
    const t = [[n + 1, d], [n, d + 1], [n + 2, d], [n * 2, d + 1]][k % 4];
    return t[0] > 0 && t[1] > 1 ? fr(t[0], t[1]) : '';
  }
  if ((m = /^(\d+)\.(\d+)$/.exec(s))) {
    const p = m[2].length; const u = Number(m[1] + m[2]); const st = [1, -1, 2, -2, 10, -10][k % 6];
    return u + st > 0 ? decText(u + st, p) : '';
  }
  if (/^\d+$/.test(s)) {
    const v = Number(s); const st = [1, -1, 2, -2, 10, -10, 5, -5][k % 8];
    return v + st > 0 ? String(v + st) : '';
  }
  return '';
}

/**
 * 수 보기 4개 — 정답 + 오개념 오답. 글자가 같거나 **값이 같은** 보기는 넣지 않는다 ("35%"와 "0.35"는 같은 수다)
 */
function choices(r, answer, wrongs) {
  const list = [{ text: String(answer), ok: true }];
  const seen = new Set([String(answer)]);
  const vals = [valueOf(answer)];
  const dup = (t) => { const v = valueOf(t); return seen.has(String(t)) || (v !== null && vals.some((x) => sameValue(x, v))); };
  const add = (t, tag) => { seen.add(String(t)); vals.push(valueOf(t)); list.push({ text: String(t), ok: false, tag }); };
  for (const w of wrongs) {
    if (!w || w.text === undefined || w.text === '' || dup(w.text) || list.length >= 4) continue;
    add(w.text, w.tag);
  }
  for (let k = 0; list.length < 4 && k < 30; k++) {
    const alt = nearOf(answer, k);
    if (alt && !dup(alt)) add(alt, '계산 실수');
  }
  return shuffle(r, list);
}

/**
 * 말 보기·비 보기 — 글자로만 겹침을 본다. 비는 값 하나가 아니다:
 * 간단한 비를 묻는 문항에서 "6 : 9"는 "2 : 3"과 비율이 같아도 오답이다
 */
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

/** ② 갈래 고르기 — 🔁 쌍둥이·🤔 오답 노트가 요청한 갈래를 먼저 (Codex 12차 P1, mathdec·mathneg와 같은 규칙) */
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
const MIS_OK = '오개념을 옳다고 함';

/** 이 줄기의 오개념 이름표 (📊·🤔 노트에 그대로 뜬다) */
export const TAGS = {
  diffForTimes: '몇 배를 뺄셈으로 셈',
  timesForDiff: '몇 개 더를 나눗셈으로 셈',
  diffConst: '뺄셈 비교가 그대로라고 봄',
  swap: '기준량과 비교량을 뒤바꿈',
  whole: '전체를 기준량으로 봄',
  noHundred: '100을 곱하지 않음',
  pctAsNum: '백분율을 그대로 수로 씀',
  pctNumerator: '분자를 그대로 백분율로 씀',
  byTen: '10만 곱하거나 나눔',
  discountAsPrice: '깎아 준 돈과 파는 값을 헷갈림',
  pctAsWon: '백분율을 그대로 뺌',
  misses: '못 잡는 횟수를 셈',
  baseWater: '기준량을 물로 봄',
  addSame: '같은 수를 더함',
  oneSide: '한쪽에만 곱함',
  notLowest: '끝까지 나누지 않음',
  numerRatio: '분자끼리 비로 씀',
  denomRatio: '분모끼리 비로 씀',
  decOneSide: '소수를 한쪽만 자연수로',
  diffSame: '차를 같게 맞춤',
  wrongPair: '곱하는 짝을 바꿈',
  divideByTerm: '비의 수로 바로 나눔',
  noSum: '전체를 합으로 나누지 않음',
  half: '똑같이 반씩 나눔',
  otherShare: '다른 사람 몫을 셈',
};

// ── 이야기 재료 — 한 낱말 이름 (테스트가 "이름 수"를 읽어 비의 순서를 따로 확인한다) ──
const PAIRS = [
  { a: '연필', b: '지우개', u: '개' },
  { a: '몬스터볼', b: '슈퍼볼', u: '개' },
  { a: '사과', b: '배', u: '개' },
  { a: '피카츄카드', b: '리자몽카드', u: '장' },
  { a: '빨간구슬', b: '파란구슬', u: '개' },
  { a: '나무열매', b: '포션', u: '개' },
  // 사람 짝(남학생·여학생)은 넣지 않는다 — "진우는 남학생 36명을 가지고 있어요"가 된다
];
/**
 * 🔁 쌍둥이·🤔 노트(c.want)면 그 틀에 들어 있던 이름을 다시 고른다 — 이야기 틀 이름(tplKey)에 물건 이름이 들어 있어서,
 * 이름을 새로 뽑으면 같은 틀을 못 찾고 다른 문제가 온다 (테스트가 잡음). 없으면 무작위
 */
function pickFor(r, c, list, has) {
  if (c && c.want) {
    const hit = list.filter((x) => has(x, c.want));
    if (hit.length) return hit[hit.length - 1];
  }
  return pick(r, list);
}
const pairFor = (r, c) => pickFor(r, c, PAIRS, (P, w) => w.includes(P.a) && w.includes(P.b));
const wordFor = (r, c, list, word = (x) => x) => pickFor(r, c, list, (x, w) => w.includes(word(x)));
/** 소수로 셋째 자리까지 딱 떨어지면 소수, 아니면 분수 (오답이 0.21875처럼 길어지지 않게) */
const decOrFrac = (a, b) => { const d = decOf(a, b); return d && (d.split('.')[1] || '').length <= 3 ? d : fr(a, b); };
/** 단위 글자 뒤 조사 (개가·장이·명이) */
const uj = (u, a, b) => u + josa(u, a, b);
/** "연필 12개, 지우개 4개" */
const have = (P, a, b) => `${P.a} ${a}${P.u}, ${P.b} ${b}${P.u}`;

// ───────────────────── 개념 사다리 (F. 비와 비율 줄기) ─────────────────────

export const RATIO = [
  {
    id: 'rat.compare', grade: 6, name: '두 수 비교하기 (뺄셈과 나눗셈)', needs: [],
    idea: '"몇 개 더 많은가"는 **뺄셈**, "몇 배인가"는 **나눗셈**으로 비교해요. 묶음이 늘어나도 늘 그대로인 건 나눗셈 비교예요.',
    slip: '"몇 배"인지 "몇 개 더"인지 문제를 다시 읽고 계산해 봐요.',
    calc(r, c) {
      const P = pairFor(r, c);
      const b = int(r, 2, 9); const k = int(r, 3, 7); const a = b * k; // k ≥ 3 → a−b ≠ a÷b
      const g = int(r, 2, 6); const s = int(r, 2, 5);                // 한 모둠에 학생 g×s명, 책상 g개
      const big = g * s; const small = g;
      const fams = [
        { ans: String(k), wr: [{ text: String(a - b), tag: TAGS.diffForTimes }, { text: fr(b, a), tag: TAGS.swap }],
          probe: { calc: `${a} ÷ ${b}` }, steps: ['몇 배 → 나눗셈', `${a} ÷ ${b} = ${k}`], pools: {
            pokemon: [
              `${have(P, a, b)}${josa(P.u, '이', '가')} 있어요. ${P.a} 수는 ${P.b} 수의 몇 배일까요?`,
              `{mon/이/가} ${have(P, a, b)}${josa(P.u, '을', '를')} 모았어요. ${P.a} 수는 ${P.b} 수의 몇 배일까요?`,
            ],
          } },
        { ans: String(a - b), wr: [{ text: String(k), tag: TAGS.timesForDiff }, { text: String(a + b), tag: '계산 실수' }],
          probe: { calc: `${a} − ${b}` }, steps: ['몇 개 더 → 뺄셈', `${a} − ${b} = ${a - b}`], pools: {
            pokemon: [
              `{mon/이/가} ${have(P, a, b)}${josa(P.u, '을', '를')} 모았어요. ${jw(P.a, '이', '가')} ${P.b}보다 몇 ${P.u} 더 많을까요?`,
              `{me/은/는} ${have(P, a, b)}${josa(P.u, '을', '를')} 가지고 있어요. ${jw(P.a, '이', '가')} 몇 ${P.u} 더 많을까요?`,
            ],
          } },
        { words: true, ans: `학생 수는 늘 책상 수의 ${s}배예요`,
          wr: [{ text: `학생이 늘 책상보다 ${big - small}명 많아요`, tag: TAGS.diffConst }, { text: '모둠마다 둘 다 달라져서 알 수 없어요', tag: '계산 실수' }],
          probe: { constant: { per: [big, small] } },
          steps: [`모둠 1개: 학생 ${big}명·책상 ${small}개, 모둠 2개: 학생 ${big * 2}명·책상 ${small * 2}개`, `차는 ${big - small}에서 ${ro((big - small) * 2)} 변하지만 배는 늘 ${s}배`, `학생 수는 늘 책상 수의 ${s}배예요`], pools: {
            pokemon: [`한 모둠에 학생 ${big}명, 책상 ${small}개씩이에요. 모둠이 늘어나도 **늘 그대로인** 것은 어느 것일까요?`],
          } },
      ];
      const f = pickFamily(r, c, fams);
      const chs = f.words ? textChoices(r, f.ans, f.wr) : choices(r, f.ans, f.wr);
      return {
        ...ask(this.id, 'calc', fill(worldPick(r, c, f.pools), c), chs, {
          solve: solve(f.steps.map((t, i) => step(i, t)), {
            why: {
              [TAGS.diffForTimes]: '"몇 배"는 나눗셈이에요. 뺄셈은 "몇 개 더 많은가"를 알려 줘요.',
              [TAGS.timesForDiff]: '"몇 개 더"는 뺄셈이에요. 나눗셈은 "몇 배인가"를 알려 줘요.',
              [TAGS.swap]: '거꾸로 나눴어요. "~의 몇 배"에서 "~의" 쪽이 기준이라 그 수로 나눠요.',
              [TAGS.diffConst]: '모둠이 늘면 학생도 책상도 함께 늘어서 차는 커져요. 늘 그대로인 건 **나눗셈** 비교(몇 배)예요.',
            },
            rule: '몇 개 더 → 뺄셈, 몇 배 → 나눗셈. 늘 그대로인 비교는 나눗셈.',
          }),
        }),
        probe: f.probe,
      };
    },
    misread(r, c) {
      const P = pairFor(r, c);
      const b = int(r, 2, 9); const k = int(r, 3, 7); const a = b * k;
      const q = showWork(`${P.a} ${a}${uj(P.u, '은', '는')} ${P.b} ${b}${P.u}의 ${a - b}배예요`);
      const chs = textChoices(r, `${jn(a - b, '은', '는')} 몇 ${P.u} 더 많은지예요 — 몇 배는 ${a} ÷ ${b} = ${k}배`, [
        { text: '맞게 말했어요', tag: RIGHT_AS_WRONG },
        { text: '몇 배는 곱셈으로 구해야 해요', tag: OFF },
        { text: '몇 배는 두 수를 더해서 구해요', tag: OFF },
      ]);
      return {
        ...misreadAsk(this.id, 'times', fill(q, c), chs, {
          solve: solve([step(0, '몇 배 → 나눗셈'), step(1, `${a} ÷ ${b} = ${k}배`)], {
            whyAny: `뺄셈(${a} − ${b} = ${a - b})은 "몇 개 더"예요. "몇 배"는 나눗셈이에요.`,
            rule: '몇 개 더 → 뺄셈, 몇 배 → 나눗셈.',
          }),
        }),
        probe: { calc: `${a} ÷ ${b}`, shown: String(a - b) },
      };
    },
  },

  {
    id: 'rat.ratio', grade: 6, name: '비 — 기준량과 비교량', needs: ['rat.compare'],
    idea: '"지우개 수에 **대한** 연필 수의 비"에서 기준은 **지우개**예요. 기준량을 **뒤에** 써서 연필 : 지우개. "~에 대한" 앞, "대" 뒤가 기준량이에요.',
    slip: '"~에 대한" 앞에 있는 것이 기준량이에요. 기준량을 뒤에 써 봐요.',
    calc(r, c) {
      const P = pairFor(r, c);
      let a = int(r, 2, 12); let b = int(r, 2, 12);
      if (a === b) b = a + int(r, 1, 3);
      // 비교량 a(P.a) · 기준량 b(P.b) — 네 가지 말투가 모두 a : b
      const ph = wordFor(r, c, [
        `${P.b} 수에 대한 ${P.a} 수의 비`,
        `${P.a} 수의 ${P.b} 수에 대한 비`,
        `${P.a} 수 대 ${P.b} 수`,
        `${P.a} 수와 ${P.b} 수의 비`,
      ]);
      const fams = [
        { ans: R(a, b), wr: [{ text: R(b, a), tag: TAGS.swap }, { text: R(a, a + b), tag: TAGS.whole }, { text: R(a + b, b), tag: TAGS.whole }],
          probe: { phrase: ph }, ratioText: true, steps: [`기준량은 ${P.b} 수(${b}), 비교량은 ${P.a} 수(${a})`, `비교량 : 기준량 → ${R(a, b)}`], pools: {
            pokemon: [
              `${have(P, a, b)}${josa(P.u, '이', '가')} 있어요. ${ph}는 어느 것일까요?`,
              `{mon/이/가} ${have(P, a, b)}${josa(P.u, '을', '를')} 모았어요. ${ph}를 고르세요.`,
            ],
          } },
        { ans: String(b), wr: [{ text: String(a), tag: TAGS.swap }, { text: String(a + b), tag: TAGS.whole }],
          probe: { base: R(a, b) }, steps: [`기호 : 의 뒤에 있는 수가 기준량`, `${R(a, b)}의 기준량은 ${b}`], pools: {
            pokemon: [`${R(a, b)}에서 **기준량**은 얼마일까요?`],
          } },
      ];
      const f = pickFamily(r, c, fams);
      const chs = f.ratioText ? textChoices(r, f.ans, f.wr) : choices(r, f.ans, f.wr);
      return {
        ...ask(this.id, 'calc', fill(worldPick(r, c, f.pools), c), chs, {
          solve: solve(f.steps.map((t, i) => step(i, t)), {
            why: {
              [TAGS.swap]: '기준량과 비교량을 바꿔 썼어요. "~에 대한" 앞(또는 "대" 뒤)이 **기준량**이고, 기준량은 비의 **뒤**에 써요.',
              [TAGS.whole]: '둘을 더한 전체를 기준으로 잡았어요. 문제는 전체가 아니라 두 수끼리 비교하라고 했어요.',
            },
            rule: '비교량 : 기준량. "~에 대한" 앞이 기준량.',
          }),
        }),
        probe: f.probe,
      };
    },
    misread(r, c) {
      const P = pairFor(r, c);
      let a = int(r, 2, 12); let b = int(r, 2, 12);
      if (a === b) b = a + int(r, 1, 3);
      const ph = `${P.b} 수에 대한 ${P.a} 수의 비`;
      const q = showWork(`${have(P, a, b)} → ${ph}는 ${jn(R(b, a), '이에요', '예요')}`);
      const chs = textChoices(r, `기준량(${P.b} 수)을 뒤에 써야 해요 — ${R(a, b)}`, [
        { text: '맞게 말했어요', tag: RIGHT_AS_WRONG },
        { text: '두 수를 더해서 기준량으로 써야 해요', tag: MIS_OK },
        { text: '비는 큰 수를 앞에 써요', tag: OFF },
      ]);
      return {
        ...misreadAsk(this.id, 'swap', fill(q, c), chs, {
          solve: solve([step(0, `"${P.b} 수에 대한" → 기준량은 ${P.b} 수 ${b}`), step(1, `비교량 : 기준량 = ${R(a, b)}`)], {
            whyAny: '기준량과 비교량을 바꿔 썼어요. "~에 대한" 앞이 기준량이고, 비의 뒤에 써요.',
            rule: '비교량 : 기준량.',
          }),
        }),
        probe: { phrase: ph, shown: R(b, a) },
      };
    },
  },

  {
    id: 'rat.value', grade: 6, name: '비율 — 분수와 소수로', needs: ['rat.ratio'],
    idea: '비율 = **비교량 ÷ 기준량**. 3 : 5의 비율은 3/5 = 0.6이에요.',
    slip: '비교량을 기준량으로 나눠요. 3 : 5면 3 ÷ 5.',
    calc(r, c) {
      // 소수로 딱 떨어지게 기준량은 2·4·5·10·20·25·50에서
      const b = pick(r, [2, 4, 5, 10, 20, 25, 50]);
      let a = int(r, 1, b - 1);
      for (let i = 0; i < 20 && gcd(a, b) !== 1; i++) a = int(r, 1, b - 1);
      const b2 = int(r, 3, 12); let a2 = int(r, 1, 12); if (a2 === b2) a2 += 1;
      const throws = pick(r, [10, 20, 25, 50]); const hit = int(r, 1, throws - 1);
      const fams = [
        { ans: fr(a2, b2), wr: [{ text: fr(b2, a2), tag: TAGS.swap }, { text: fr(a2, a2 + b2), tag: TAGS.whole }],
          probe: { calc: `${a2}/${b2}`, form: 'frac' }, steps: ['비율 = 비교량 ÷ 기준량', `${a2} ÷ ${b2} = ${fr(a2, b2)}`], pools: {
            pokemon: [`${R(a2, b2)}의 비율을 기약분수로 나타내면 얼마일까요?`],
          } },
        { ans: decOf(a, b), wr: [{ text: decOrFrac(b, a), tag: TAGS.swap }, { text: decOrFrac(a, a + b), tag: TAGS.whole }],
          probe: { calc: `${a}/${b}`, form: 'dec' }, steps: ['비율 = 비교량 ÷ 기준량', `${a} ÷ ${b} = ${decOf(a, b)}`], pools: {
            pokemon: [`${R(a, b)}의 비율을 소수로 나타내면 얼마일까요?`],
          } },
        { ans: decOf(hit, throws), wr: [{ text: decOrFrac(throws, hit), tag: TAGS.swap }, { text: decOrFrac(hit, throws + hit), tag: TAGS.whole }],
          probe: { calc: `${hit}/${throws}`, form: 'dec' }, steps: [`기준량 = 던진 횟수 ${throws}, 비교량 = 잡은 횟수 ${hit}`, `${hit} ÷ ${throws} = ${decOf(hit, throws)}`], pools: {
            pokemon: [`{mon/이/가} 몬스터볼을 ${throws}번 던져 ${hit}번 잡았어요. 던진 횟수에 대한 잡은 횟수의 비율을 소수로 나타내면?`],
            toystory: [`버즈가 공을 ${throws}번 던져 ${hit}번 넣었어요. 던진 횟수에 대한 넣은 횟수의 비율을 소수로 나타내면?`],
          } },
      ];
      const f = pickFamily(r, c, fams);
      return {
        ...ask(this.id, 'calc', fill(worldPick(r, c, f.pools), c), choices(r, f.ans, f.wr), {
          solve: solve(f.steps.map((t, i) => step(i, t)), {
            why: {
              [TAGS.swap]: '기준량을 비교량으로 나눴어요. 비율은 **비교량 ÷ 기준량**이에요.',
              [TAGS.whole]: '두 수를 더한 전체로 나눴어요. 기준량으로만 나눠요.',
            },
            rule: '비율 = 비교량 ÷ 기준량.',
          }),
        }),
        probe: f.probe,
      };
    },
    misread(r, c) {
      // 비교량이 기준량보다 작을 때만 — 11 : 4처럼 크면 "큰 수를 작은 수로 나눠요"가 우연히 맞는 말이 되어 답이 둘이다
      const b = int(r, 4, 12); const a = int(r, 1, b - 1);
      const q = showWork(`${R(a, b)}의 비율은 ${jn(fr(b, a), '이에요', '예요')}`);
      const chs = textChoices(r, `비교량 ÷ 기준량이라 ${a} ÷ ${b} = ${fr(a, b)}`, [
        { text: '맞게 말했어요', tag: RIGHT_AS_WRONG },
        { text: '비율은 큰 수를 작은 수로 나눠요', tag: MIS_OK },
        { text: '비율은 두 수를 더해서 구해요', tag: OFF },
      ]);
      return {
        ...misreadAsk(this.id, 'swap', fill(q, c), chs, {
          solve: solve([step(0, `비교량 ${a}, 기준량 ${b}`), step(1, `${a} ÷ ${b} = ${fr(a, b)}`)], {
            whyAny: '기준량을 비교량으로 나눴어요. 비율은 비교량 ÷ 기준량이에요.',
            rule: '비율 = 비교량 ÷ 기준량.',
          }),
        }),
        probe: { calc: `${a}/${b}`, shown: fr(b, a) },
      };
    },
  },

  {
    id: 'rat.percent', grade: 6, name: '백분율', needs: ['rat.value'],
    idea: '기준량을 **100**으로 볼 때의 비율이 백분율(%)이에요. 비율에 **100을 곱하고** %를 붙여요 — 0.35 → 35%, 3/4 → 75%.',
    slip: '비율에 100을 곱하면 백분율, 백분율을 100으로 나누면 비율이에요.',
    calc(r, c) {
      const u = int(r, 1, 99); const dec = decText(u, 2);                         // 0.35
      const [n, d] = pick(r, [[1, 2], [1, 4], [3, 4], [1, 5], [2, 5], [3, 5], [4, 5], [7, 20], [9, 20], [9, 25], [11, 25], [1, 8], [3, 8], [3, 10], [7, 10]]);
      const p = int(r, 1, 99);                                                    // 45%
      const fams = [
        { ans: `${u}%`, wr: [{ text: `${dec}%`, tag: TAGS.noHundred }, { text: `${decText(u, 1)}%`, tag: TAGS.byTen }],
          probe: { calc: dec, form: 'pct' }, steps: ['비율 × 100', `${dec} × 100 = ${u} → ${u}%`], pools: {
            pokemon: [
              `${jn(dec, '을', '를')} 백분율로 나타내면 얼마일까요?`,
              // 수 뒤에 "이에요/예요"를 붙이면 수에 따라 틀 이름(tplKey)이 갈려 🔁 쌍둥이가 같은 틀을 못 찾는다 — 어미 없이
              `{mon/이/가} 잡힐 비율: ${dec}. 백분율로 나타내면 몇 %일까요?`,
            ],
          } },
        { ans: pctOf(n, d), wr: [{ text: `${n}%`, tag: TAGS.pctNumerator }, { text: `${decOf(n, d)}%`, tag: TAGS.noHundred }],
          probe: { calc: `${n}/${d}`, form: 'pct' }, steps: [`${n}/${d} = ${decOf(n, d)}`, `${decOf(n, d)} × 100 → ${pctOf(n, d)}`], pools: {
            pokemon: [`${jn(`${n}/${d}`, '을', '를')} 백분율로 나타내면 얼마일까요?`],
          } },
        { ans: decText(p, 2), wr: [{ text: String(p), tag: TAGS.pctAsNum }, { text: decText(p, 1), tag: TAGS.byTen }],
          probe: { calc: `${p}/100`, form: 'dec' }, steps: ['백분율 ÷ 100 = 비율', `${p} ÷ 100 = ${decText(p, 2)}`], pools: {
            pokemon: [`${p}%를 소수로 나타내면 얼마일까요?`, `🛒 ${p}% 할인이에요. ${p}%를 소수로 나타내면?`],
          } },
      ];
      const f = pickFamily(r, c, fams);
      return {
        ...ask(this.id, 'calc', fill(worldPick(r, c, f.pools), c), choices(r, f.ans, f.wr), {
          solve: solve(f.steps.map((t, i) => step(i, t)), {
            why: {
              [TAGS.noHundred]: '%만 붙이고 100을 곱하지 않았어요. 0.35는 100개 중 35개라서 35%예요.',
              [TAGS.pctNumerator]: '분자를 그대로 %로 썼어요. 분모를 100으로 만들어야 해요.',
              [TAGS.pctAsNum]: '%를 떼고 수만 썼어요. 45%는 100개 중 45개 — 45 ÷ 100이에요.',
              [TAGS.byTen]: '10만 곱하거나 나눴어요. 백분율과 비율 사이는 **100**이에요.',
            },
            rule: '비율 × 100 = 백분율, 백분율 ÷ 100 = 비율.',
          }),
        }),
        probe: f.probe,
      };
    },
    misread(r, c) {
      if (branchOf(r, c, ['hundred', 'numer']) === 'hundred') {
        const u = int(r, 11, 99); const dec = decText(u, 2);
        const q = showWork(`${dec} = ${dec}%`, '바꿨어요');
        const chs = textChoices(r, `100을 곱해야 해요 — ${dec} = ${u}%`, [
          { text: '맞게 바꿨어요', tag: RIGHT_AS_WRONG },
          { text: '10을 곱해야 해요', tag: TAGS.byTen },
          { text: '소수는 백분율로 바꿀 수 없어요', tag: OFF },
        ]);
        return {
          ...misreadAsk(this.id, 'hundred', fill(q, c), chs, {
            solve: solve([step(0, '비율 × 100'), step(1, `${dec} × 100 = ${u} → ${u}%`)], {
              whyAny: `%만 붙였어요. ${dec}%는 ${dec}의 1/100이라 훨씬 작은 수예요.`,
              rule: '비율 × 100 = 백분율.',
            }),
          }),
          probe: { calc: dec, shown: `${dec}%` },
        };
      }
      const [n, d] = pick(r, [[1, 4], [3, 4], [2, 5], [3, 5], [7, 20], [9, 25], [3, 10]]);
      const q = showWork(`${n}/${d} = ${n}%`, '바꿨어요');
      const chs = textChoices(r, `분모를 100으로 만들어야 해요 — ${n}/${d} = ${pctOf(n, d)}`, [
        { text: '맞게 바꿨어요', tag: RIGHT_AS_WRONG },
        { text: '분모를 %로 써야 해요', tag: MIS_OK },
        { text: '분수는 백분율로 바꿀 수 없어요', tag: OFF },
      ]);
      return {
        ...misreadAsk(this.id, 'numer', fill(q, c), chs, {
          solve: solve([step(0, `${n}/${d} = ${decOf(n, d)}`), step(1, `× 100 → ${pctOf(n, d)}`)], {
            whyAny: '분자를 그대로 %로 썼어요. 분모가 100일 때만 분자가 곧 %예요.',
            rule: '분모를 100으로 → 분자가 %.',
          }),
        }),
        probe: { calc: `${n}/${d}`, shown: `${n}%` },
      };
    },
  },

  {
    id: 'rat.percentuse', grade: 6, name: '백분율 쓰기 — 할인·확률·진하기', needs: ['rat.percent'],
    idea: '8000원의 20%는 8000 × 20/100 = **1600원**. 20% 할인이면 1600원을 깎아 **6400원**에 팔아요. 20원을 깎는 게 아니에요.',
    slip: '먼저 "전체의 몇 %"가 얼마인지 구하고, 문제가 묻는 게 깎은 돈인지 파는 값인지 다시 읽어요.',
    calc(r, c) {
      const P = pick(r, [2000, 4000, 5000, 6000, 8000, 10000, 12000, 15000, 20000]);
      const rate = pick(r, [10, 20, 25, 30, 40, 50]);
      const off = (P * rate) / 100; const sale = P - off;
      const pct = pick(r, [10, 20, 30, 40, 60, 70]); const n = pick(r, [10, 20, 30, 50]); const hits = (n * pct) / 100;
      const tries = pick(r, [20, 25, 40, 50]); const got = int(r, 1, tries - 1);  // got/tries × 100 → 자연수나 소수 한 자리
      const T = pick(r, [100, 200, 300, 400, 500]); const cp = pick(r, [10, 20, 25]); const salt = (T * cp) / 100; const water = T - salt;
      const fams = [
        { ans: String(sale), wr: [{ text: String(off), tag: TAGS.discountAsPrice }, { text: String(P - rate), tag: TAGS.pctAsWon }],
          probe: { calc: `${P} × (100 − ${rate}) ÷ 100` }, steps: [`깎는 돈: ${P} × ${rate}/100 = ${off}`, `파는 값: ${P} − ${off} = ${sale}`], pools: {
            pokemon: [`🛒 ${P}원짜리 몬스터볼 세트를 ${rate}% 할인해서 팔아요. 얼마에 살 수 있을까요?`],
            minions: [`${P}원짜리 바나나 상자를 ${rate}% 할인해요. 얼마에 살 수 있을까요?`],
          } },
        { ans: String(off), wr: [{ text: String(sale), tag: TAGS.discountAsPrice }, { text: String(rate), tag: TAGS.pctAsWon }],
          probe: { calc: `${P} × ${rate} ÷ 100` }, steps: [`${P}의 ${rate}%`, `${P} × ${rate}/100 = ${off}`], pools: {
            pokemon: [`🛒 ${P}원짜리 물건을 ${rate}% 할인해요. 얼마를 깎아 줄까요?`],
          } },
        { ans: String(hits), wr: [{ text: String(pct), tag: TAGS.pctAsNum }, { text: String(n - hits), tag: TAGS.misses }],
          probe: { calc: `${n} × ${pct} ÷ 100` }, steps: [`${n}번의 ${pct}%`, `${n} × ${pct}/100 = ${hits}`], pools: {
            pokemon: [`{mon/을/를} 잡을 확률이 ${pct}%예요. 몬스터볼을 ${n}번 던지면 몇 번쯤 잡힐까요?`],
          } },
        { ans: pctOf(got, tries), wr: [{ text: `${got}%`, tag: TAGS.pctNumerator }, { text: pctOf(tries, got), tag: TAGS.swap }],
          probe: { calc: `${got}/${tries}`, form: 'pct' }, steps: [`비율 = ${got} ÷ ${tries}`, `× 100 → ${pctOf(got, tries)}`], pools: {
            pokemon: [`{mon/이/가} 몬스터볼을 ${tries}번 던져 ${got}번 잡았어요. 잡은 비율은 몇 %일까요?`],
          } },
        { ans: `${cp}%`, wr: [{ text: pctOf(salt, water), tag: TAGS.baseWater }, { text: `${salt}%`, tag: TAGS.pctNumerator }],
          probe: { calc: `${salt}/${T}`, form: 'pct' }, steps: [`소금물 = 소금 ${salt}g + 물 ${water}g = ${T}g`, `${salt} ÷ ${T} × 100 = ${cp}%`], pools: {
            pokemon: [`소금 ${salt}g을 물 ${water}g에 녹였어요. 소금물의 진하기는 몇 %일까요?`],
          } },
      ];
      const f = pickFamily(r, c, fams);
      return {
        ...ask(this.id, 'calc', fill(worldPick(r, c, f.pools), c), choices(r, f.ans, f.wr), {
          solve: solve(f.steps.map((t, i) => step(i, t)), {
            why: {
              [TAGS.discountAsPrice]: '깎아 주는 돈과 파는 값을 바꿔 골랐어요. 문제가 무엇을 묻는지 다시 봐요.',
              [TAGS.pctAsWon]: '20%는 20원이 아니에요. 값 전체의 20/100만큼이에요.',
              [TAGS.pctAsNum]: '%를 그대로 횟수로 썼어요. 던진 횟수의 몇 %인지 계산해요.',
              [TAGS.misses]: '못 잡는 횟수를 셌어요. 잡히는 쪽이 몇 번인지 물었어요.',
              [TAGS.pctNumerator]: '비교량을 그대로 %로 썼어요. 기준량으로 나누고 100을 곱해요.',
              [TAGS.swap]: '기준량과 비교량을 바꿨어요. 비교량 ÷ 기준량이에요.',
              [TAGS.baseWater]: '물로 나눴어요. 진하기의 기준량은 **소금물 전체**(소금 + 물)예요.',
            },
            rule: '전체 × 백분율/100. 기준량이 무엇인지 먼저.',
          }),
        }),
        probe: f.probe,
      };
    },
    misread(r, c) {
      const P = pick(r, [4000, 5000, 8000, 10000, 12000]);
      const rate = pick(r, [10, 20, 25, 30, 40]);
      const off = (P * rate) / 100; const sale = P - off;
      if (branchOf(r, c, ['won', 'price']) === 'won') {
        const q = showWork(`${P}원을 ${rate}% 할인하면 ${P - rate}원이에요`);
        const chs = textChoices(r, `${rate}%는 ${rate}원이 아니라 ${off}원이에요 — ${sale}원에 팔아요`, [
          { text: '맞게 말했어요', tag: RIGHT_AS_WRONG },
          { text: `${rate}원에 팔아요`, tag: TAGS.pctAsNum },
          { text: '할인은 곱하기로 해요', tag: OFF },
        ]);
        return {
          ...misreadAsk(this.id, 'won', fill(q, c), chs, {
            solve: solve([step(0, `${P} × ${rate}/100 = ${off}`), step(1, `${P} − ${off} = ${sale}`)], {
              whyAny: `${rate}%는 ${P}원의 ${rate}/100이에요. ${rate}원을 빼면 안 돼요.`,
              rule: '전체 × 백분율/100 만큼 깎는다.',
            }),
          }),
          probe: { calc: `${P} × (100 − ${rate}) ÷ 100`, shown: String(P - rate) },
        };
      }
      const q = showWork(`${P}원을 ${rate}% 할인한 값은 ${off}원이에요`);
      const chs = textChoices(r, `${off}원은 깎아 주는 돈이에요 — 파는 값은 ${P} − ${off} = ${sale}원`, [
        { text: '맞게 말했어요', tag: RIGHT_AS_WRONG },
        { text: `${rate}%를 더해야 해요`, tag: OFF },
        { text: `${rate}원을 빼야 해요`, tag: TAGS.pctAsWon },
      ]);
      return {
        ...misreadAsk(this.id, 'price', fill(q, c), chs, {
          solve: solve([step(0, `깎는 돈 ${off}원`), step(1, `파는 값 ${P} − ${off} = ${sale}원`)], {
            whyAny: '깎아 주는 돈을 파는 값으로 말했어요. 파는 값은 원래 값에서 뺀 거예요.',
            rule: '파는 값 = 원래 값 − 깎는 돈.',
          }),
        }),
        probe: { calc: `${P} × (100 − ${rate}) ÷ 100`, shown: String(off) },
      };
    },
  },

  {
    id: 'rat.prop', grade: 6, name: '비의 성질', needs: ['rat.percentuse'],
    idea: '비의 전항과 후항에 **0이 아닌 같은 수를 곱하거나 나누어도** 비율은 같아요 (2 : 3 = 8 : 12). **더하면** 달라져요.',
    slip: '전항에 곱한(나눈) 수를 후항에도 똑같이 곱해(나눠) 봐요.',
    calc(r, c) {
      const a = int(r, 1, 9); let b = int(r, 2, 9); if (a === b) b = a + 1;
      const k = int(r, 2, 6);
      const fams = [
        { ans: String(b * k), wr: [{ text: String(b + (a * k - a)), tag: TAGS.addSame }, { text: String(b), tag: TAGS.oneSide }],
          probe: { calc: `${b} × ${a * k} ÷ ${a}` }, steps: [`${a} → ${a * k}: ${k}배`, `후항도 ${k}배 → ${b} × ${k} = ${b * k}`], pools: {
            pokemon: [`${R(a, b)} = ${a * k} : □ — □에 알맞은 수는?`],
          } },
        { ans: String(b), wr: [{ text: b * k - (a * k - a) > 0 ? String(b * k - (a * k - a)) : '', tag: TAGS.addSame }, { text: String(b * k), tag: TAGS.oneSide }], // 뺀 값이 0 이하면 버린다 (음수 보기)
          probe: { calc: `${b * k} × ${a} ÷ ${a * k}` }, steps: [`${a * k} → ${a}: ${ro(k)} 나눔`, `후항도 ${ro(k)} 나눔 → ${b * k} ÷ ${k} = ${b}`], pools: {
            pokemon: [`${R(a * k, b * k)} = ${a} : □ — □에 알맞은 수는?`],
          } },
        { ans: R(a * k, b * k), wr: [{ text: R(a + k, b + k), tag: TAGS.addSame }, { text: R(a * k, b), tag: TAGS.oneSide }, { text: R(b, a), tag: TAGS.swap }],
          probe: { sameRatio: R(a, b) }, ratioText: true, steps: [`${R(a, b)}의 두 항에 ${jn(k, '을', '를')} 곱하면`, `${R(a * k, b * k)} — 비율이 같아요`], pools: {
            pokemon: [`${jn(R(a, b), '과', '와')} 비율이 같은 비는 어느 것일까요?`],
          } },
      ];
      const f = pickFamily(r, c, fams);
      const chs = f.ratioText ? textChoices(r, f.ans, f.wr) : choices(r, f.ans, f.wr);
      return {
        ...ask(this.id, 'calc', fill(worldPick(r, c, f.pools), c), chs, {
          solve: solve(f.steps.map((t, i) => step(i, t)), {
            why: {
              [TAGS.addSame]: '같은 수를 **더했어요**. 더하면 비율이 달라져요 — 곱하거나 나눠야 해요.',
              [TAGS.oneSide]: '한쪽에만 곱했어요(나눴어요). 전항과 후항에 **똑같이** 해야 해요.',
              [TAGS.swap]: '전항과 후항의 순서를 바꾸면 다른 비예요.',
            },
            rule: '두 항에 같은 수를 곱하거나 나눈다 — 더하지 않는다.',
          }),
        }),
        probe: f.probe,
      };
    },
    misread(r, c) {
      const a = int(r, 1, 6); let b = int(r, 2, 7); if (a === b) b = a + 1;
      const k = int(r, 2, 5); const add = a * k - a;
      const q = showWork(`${R(a, b)} = ${R(a * k, b + add)} — 두 항에 ${jn(add, '을', '를')} 더했어요`);
      const chs = textChoices(r, `더하면 비율이 달라져요 — 곱해야 해요: ${R(a * k, b * k)}`, [
        { text: '맞게 말했어요', tag: RIGHT_AS_WRONG },
        { text: '전항에만 더해야 해요', tag: TAGS.oneSide },
        { text: '비는 바꿀 수 없어요', tag: OFF },
      ]);
      return {
        ...misreadAsk(this.id, 'add', fill(q, c), chs, {
          solve: solve([step(0, `${a} → ${jn(a * k, '은', '는')} ${k}배`), step(1, `${b}도 ${k}배 → ${b * k}`)], {
            whyAny: `더하면 비율이 달라져요. ${jn(`${a}/${b}`, '과', '와')} ${jn(`${a * k}/${b + add}`, '은', '는')} 같지 않아요.`,
            rule: '두 항에 같은 수를 곱하거나 나눈다.',
          }),
        }),
        probe: { ratioEq: [R(a, b), R(a * k, b + add)] },
      };
    },
  },

  {
    id: 'rat.simplest', grade: 6, name: '간단한 자연수의 비로 나타내기', needs: ['rat.prop'],
    idea: '두 항을 **최대공약수로 나누면** 간단한 자연수의 비 (12 : 18 = 2 : 3). 소수는 10배, 분수는 분모의 공배수를 곱해 자연수로 먼저 만들어요.',
    slip: '두 항을 더 나눌 수 있는지 (공약수가 남았는지) 다시 봐요.',
    calc(r, c) {
      let p = int(r, 1, 9); let q = int(r, 2, 9);
      for (let i = 0; i < 20 && (gcd(p, q) !== 1 || p === q); i++) { p = int(r, 1, 9); q = int(r, 2, 9); }
      const g = pick(r, [4, 6, 8, 9, 10, 12]);        // 약수가 여럿이라 "덜 나눈" 오답이 있다
      const h = [2, 3].find((x) => g % x === 0);
      let s = pick(r, [2, 3, 4]);                      // 소수의 비: 두 항을 10배 하면 p×s : q×s
      // 두 항이 늘 소수 한 자리로 — 0.5 × 2 = 1처럼 자연수가 되면 틀 모양이 바뀌어 🔁 쌍둥이가 같은 틀을 못 찾는다
      if ((p * s) % 10 === 0 || (q * s) % 10 === 0) s = 3;
      const dx = decText(p * s, 1); const dy = decText(q * s, 1);
      const [d1, d2] = pick(r, [[2, 3], [3, 4], [2, 5], [4, 5], [3, 5], [2, 7], [3, 8], [5, 6]]);
      const n1 = int(r, 1, d1 - 1); const n2 = int(r, 1, d2 - 1);
      const L = (d1 * d2) / gcd(d1, d2);
      const fx = (n1 * L) / d1; const fy = (n2 * L) / d2; const fg = gcd(fx, fy);
      const fams = [
        { ans: R(p, q), wr: [{ text: R((p * g) / h, (q * g) / h), tag: TAGS.notLowest }, { text: R(q, p), tag: TAGS.swap }],
          probe: { sameRatio: R(p * g, q * g), simplest: true }, steps: [`${jn(p * g, '과', '와')} ${q * g}의 최대공약수는 ${g}`, `두 항을 ${ro(g)} 나누면 ${R(p, q)}`], pools: {
            pokemon: [`${jn(R(p * g, q * g), '을', '를')} 간단한 자연수의 비로 나타내면?`],
          } },
        { ans: R(p, q), wr: [{ text: R(p * s, dy), tag: TAGS.decOneSide }, { text: R(p * s, q * s), tag: TAGS.notLowest }],
          probe: { sameRatio: R(dx, dy), simplest: true }, steps: [`두 항에 10을 곱해요 → ${R(p * s, q * s)}`, `최대공약수 ${ro(s)} 나눠요 → ${R(p, q)}`], pools: {
            pokemon: [`${jn(R(dx, dy), '을', '를')} 간단한 자연수의 비로 나타내면?`],
          } },
        { ans: R(fx / fg, fy / fg), wr: [{ text: R(d1, d2), tag: TAGS.denomRatio }, { text: R(n1, n2), tag: TAGS.numerRatio }],
          probe: { sameRatio: `${n1}/${d1} : ${n2}/${d2}`, simplest: true }, steps: [`분모 ${d1}, ${d2}의 공배수 ${jn(L, '을', '를')} 두 항에 곱해요 → ${R(fx, fy)}`, fg > 1 ? `${ro(fg)} 나눠요 → ${R(fx / fg, fy / fg)}` : `더 나눌 수 없어요 → ${R(fx, fy)}`], pools: {
            pokemon: [`${n1}/${d1} : ${jn(`${n2}/${d2}`, '을', '를')} 간단한 자연수의 비로 나타내면?`],
          } },
      ];
      const f = pickFamily(r, c, fams);
      return {
        ...ask(this.id, 'calc', fill(worldPick(r, c, f.pools), c), textChoices(r, f.ans, f.wr), {
          solve: solve(f.steps.map((t, i) => step(i, t)), {
            why: {
              [TAGS.notLowest]: '아직 더 나눌 수 있어요. 두 항의 **최대공약수**로 나눠야 가장 간단해요.',
              [TAGS.swap]: '전항과 후항의 순서를 바꿨어요.',
              [TAGS.decOneSide]: '한 항만 자연수가 됐어요. 두 항에 **똑같이** 10을 곱해요.',
              [TAGS.denomRatio]: '분모끼리 비로 썼어요. 분수의 비는 분모의 공배수를 두 항에 곱해 자연수로 만들어요.',
              [TAGS.numerRatio]: '분자끼리 비로 썼어요. 분모가 다르면 분자만 비교할 수 없어요.',
            },
            rule: '자연수로 만들고, 최대공약수로 나눈다.',
          }),
        }),
        probe: f.probe,
      };
    },
    misread(r, c) {
      let p = int(r, 1, 7); let q = int(r, 2, 7);
      for (let i = 0; i < 20 && (gcd(p, q) !== 1 || p === q); i++) { p = int(r, 1, 7); q = int(r, 2, 7); }
      if (branchOf(r, c, ['lowest', 'denom']) === 'lowest') {
        const g = pick(r, [4, 6, 8, 9, 12]); const h = [2, 3].find((x) => g % x === 0);
        const q2 = showWork(`${R(p * g, q * g)} → 간단한 자연수의 비는 ${R((p * g) / h, (q * g) / h)}`);
        const chs = textChoices(r, `아직 더 나눌 수 있어요 — 최대공약수 ${ro(g)} 나누면 ${R(p, q)}`, [
          { text: '맞게 말했어요', tag: RIGHT_AS_WRONG },
          { text: '앞의 수만 나눠야 해요', tag: TAGS.oneSide },
          { text: '비는 나누면 안 돼요', tag: OFF },
        ]);
        return {
          ...misreadAsk(this.id, 'lowest', fill(q2, c), chs, {
            solve: solve([step(0, `최대공약수는 ${g}`), step(1, `${R(p * g, q * g)} → ${R(p, q)}`)], {
              whyAny: `${R((p * g) / h, (q * g) / h)}도 비율은 같지만, 더 나눌 수 있어서 "가장 간단한" 비가 아니에요.`,
              rule: '최대공약수로 끝까지 나눈다.',
            }),
          }),
          probe: { sameRatio: R(p * g, q * g), shownNotLowest: R((p * g) / h, (q * g) / h) },
        };
      }
      const [d1, d2] = pick(r, [[2, 3], [3, 4], [2, 5], [3, 5], [4, 5]]);
      const L = (d1 * d2) / gcd(d1, d2);
      const q2 = showWork(`1/${d1} : 1/${d2} = ${R(d1, d2)}`);
      const chs = textChoices(r, `분모끼리 비로 쓰면 안 돼요 — 두 항에 ${jn(L, '을', '를')} 곱하면 ${R(L / d1, L / d2)}`, [
        { text: '맞게 말했어요', tag: RIGHT_AS_WRONG },
        { text: '분자끼리 비로 써야 해요', tag: MIS_OK },
        { text: '분수는 비로 쓸 수 없어요', tag: OFF },
      ]);
      return {
        ...misreadAsk(this.id, 'denom', fill(q2, c), chs, {
          solve: solve([step(0, `분모의 공배수 ${L}`), step(1, `1/${d1} × ${L} : 1/${d2} × ${L} = ${R(L / d1, L / d2)}`)], {
            whyAny: `1/${d1}이 1/${d2}보다 커요. 그런데 ${jn(R(d1, d2), '은', '는')} 앞이 더 작아요 — 거꾸로 됐어요.`,
            rule: '분수의 비는 분모의 공배수를 곱해 자연수로.',
          }),
        }),
        probe: { ratioEq: [`1/${d1} : 1/${d2}`, R(d1, d2)] },
      };
    },
  },

  {
    id: 'rat.proportion', grade: 6, name: '비례식', needs: ['rat.simplest'],
    idea: '비율이 같은 두 비를 = 로 이은 식이 비례식이에요. **외항의 곱 = 내항의 곱** (3 : 4 = 9 : 12 → 3 × 12 = 4 × 9).',
    slip: '외항끼리, 내항끼리 곱해서 같게 놓아 봐요.',
    calc(r, c) {
      // p : q 를 s배, t배 — s가 t를 나누지 않게 (곱셈 한 번으로 안 끝나고 외항·내항을 쓰게)
      let p = int(r, 1, 5); let q = int(r, 2, 6);
      for (let i = 0; i < 20 && (gcd(p, q) !== 1 || p === q); i++) { p = int(r, 1, 5); q = int(r, 2, 6); }
      const s = int(r, 2, 4); let t = int(r, 3, 9); if (t % s === 0 || t === s) t += 1;
      const a = p * s; const b = q * s; const cc = p * t; const ans = q * t;
      const diff = cc + (b - a);
      const pair = (a * cc) % b === 0 ? String((a * cc) / b) : fr(a * cc, b);
      const food = wordFor(r, c, ['사탕', '나무열매', '쿠키']);
      const fams = [
        { ans: String(ans), wr: [diff > 0 ? { text: String(diff), tag: TAGS.diffSame } : null, { text: pair, tag: TAGS.wrongPair }],
          probe: { calc: `${b} × ${cc} ÷ ${a}` }, steps: [`외항의 곱 = 내항의 곱: ${a} × □ = ${b} × ${cc}`, `□ = ${b * cc} ÷ ${a} = ${ans}`], pools: {
            pokemon: [`${R(a, b)} = ${cc} : □ — □에 알맞은 수는?`],
          } },
        { ans: String(ans), wr: [diff > 0 ? { text: String(diff), tag: TAGS.diffSame } : null, { text: pair, tag: TAGS.wrongPair }],
          probe: { calc: `${b} × ${cc} ÷ ${a}` }, steps: [`${R(a, b)} = ${cc} : □`, `${a} × □ = ${b} × ${cc} → □ = ${ans}`], pools: {
            pokemon: [`{mon/이/가} ${food} ${a}개를 먹을 때 {mon2/은/는} ${b}개를 먹어요. {mon/이/가} ${cc}개를 먹으면 {mon2/은/는} 몇 개를 먹을까요?`],
          } },
      ];
      const f = pickFamily(r, c, fams);
      return {
        ...ask(this.id, 'calc', fill(worldPick(r, c, f.pools), c), choices(r, f.ans, f.wr), {
          solve: solve(f.steps.map((t2, i) => step(i, t2)), {
            why: {
              [TAGS.diffSame]: '두 비의 **차**를 같게 맞췄어요. 비례식은 차가 아니라 **비율**이 같아야 해요.',
              [TAGS.wrongPair]: '곱하는 짝을 바꿨어요. 바깥 두 수(외항)끼리, 안쪽 두 수(내항)끼리 곱해요.',
            },
            rule: '외항의 곱 = 내항의 곱.',
          }),
        }),
        probe: f.probe,
      };
    },
    misread(r, c) {
      let p = int(r, 1, 5); let q = int(r, 2, 6);
      for (let i = 0; i < 20 && (gcd(p, q) !== 1 || p === q); i++) { p = int(r, 1, 5); q = int(r, 2, 6); }
      const s = int(r, 2, 4); let t = int(r, 3, 9); if (t % s === 0 || t === s) t += 1;
      const a = p * s; const b = q * s; const cc = p * t; const ans = q * t;
      let shown = cc + (b - a);
      if (shown <= 0 || shown === ans) shown = ans + 1;
      const q2 = showWork(`${R(a, b)} = ${R(cc, shown)} — 두 수의 차가 같게 했어요`);
      const chs = textChoices(r, `비례식은 비율이 같아야 해요 — ${a} × □ = ${b} × ${cc} → □ = ${ans}`, [
        { text: '맞게 말했어요', tag: RIGHT_AS_WRONG },
        { text: '두 수의 합이 같아야 해요', tag: OFF },
        { text: '앞의 두 수를 곱해야 해요', tag: TAGS.wrongPair },
      ]);
      return {
        ...misreadAsk(this.id, 'diff', fill(q2, c), chs, {
          solve: solve([step(0, `${a} × □ = ${b} × ${cc}`), step(1, `□ = ${ans}`)], {
            whyAny: '차를 같게 하면 비율이 달라져요. 외항의 곱과 내항의 곱이 같아야 해요.',
            rule: '외항의 곱 = 내항의 곱.',
          }),
        }),
        probe: { calc: `${b} × ${cc} ÷ ${a}`, shown: String(shown) },
      };
    },
  },

  {
    id: 'rat.distribute', grade: 6, name: '비례배분', needs: ['rat.proportion'],
    idea: '전체를 3 : 4로 나누면 전체를 **3 + 4 = 7**로 보고 3/7, 4/7씩 가져요. 28개면 12개와 16개.',
    slip: '전체를 두 비의 합으로 나눈 뒤, 자기 몫의 수를 곱해요.',
    calc(r, c) {
      let p = int(r, 1, 6); let q = int(r, 2, 7);
      for (let i = 0; i < 20 && (gcd(p, q) !== 1 || p === q); i++) { p = int(r, 1, 6); q = int(r, 2, 7); }
      // 묻는 쪽의 "전체 × 내 수/남 수" 오답이 자연수가 되게 — 앞사람 몫이면 q가, 뒷사람 몫이면 p가 k를 나눈다
      // (둘 다 맞추려고 p·q를 곱하면 전체가 840개까지 커졌다)
      const k1 = q * int(r, 1, 3); const N1 = (p + q) * k1;
      const k2 = p * int(r, 1, 3); const N2 = (p + q) * k2;
      const [thing, u] = wordFor(r, c, [['사탕', '개'], ['나무열매', '개'], ['코인', '개'], ['스티커', '장']], (x) => x[0]);
      const fams = [
        { ans: String(p * k1), wr: [{ text: String((N1 * p) / q), tag: TAGS.noSum }, { text: N1 % p === 0 && p > 1 ? String(N1 / p) : '', tag: TAGS.divideByTerm }, N1 % 2 === 0 ? { text: String(N1 / 2), tag: TAGS.half } : null],
          probe: { calc: `${N1} × ${p} ÷ (${p} + ${q})` }, steps: [`전체를 ${p} + ${q} = ${ro(p + q)} 봐요`, `${N1} × ${p}/${p + q} = ${p * k1}`], pools: {
            // 없는 형제를 이야기에 지어내지 않는다 (아버님 2026-09-30) — 친구로. tests/mathrat.test.js가 막는다
            pokemon: [`{me/과/와} 친구가 ${thing} ${N1}${uj(u, '을', '를')} ${ro(R(p, q))} 나눠 가져요. {me/은/는} 몇 ${uj(u, '을', '를')} 가질까요?`],
            toystory: [`우디와 버즈가 스티커 ${N1}장을 ${ro(R(p, q))} 나눠 가져요. 우디는 몇 장을 가질까요?`],
          } },
        { ans: String(q * k2), wr: [{ text: String((N2 * q) / p), tag: TAGS.noSum }, { text: N2 % q === 0 ? String(N2 / q) : '', tag: TAGS.divideByTerm }, { text: String(p * k2), tag: TAGS.otherShare }],
          probe: { calc: `${N2} × ${q} ÷ (${p} + ${q})` }, steps: [`전체를 ${p} + ${q} = ${ro(p + q)} 봐요`, `${N2} × ${q}/${p + q} = ${q * k2}`], pools: {
            pokemon: [`{mon/과/와} {mon2/이/가} ${thing} ${N2}${uj(u, '을', '를')} ${ro(R(p, q))} 나눠 가져요. {mon2/은/는} 몇 ${uj(u, '을', '를')} 가질까요?`],
          } },
      ];
      const f = pickFamily(r, c, fams);
      return {
        ...ask(this.id, 'calc', fill(worldPick(r, c, f.pools), c), choices(r, f.ans, f.wr), {
          solve: solve(f.steps.map((t, i) => step(i, t)), {
            why: {
              [TAGS.noSum]: '다른 사람 몫의 수로 나눴어요. 전체를 두 수의 **합**으로 나눠야 해요.',
              [TAGS.divideByTerm]: '비의 수로 바로 나눴어요. 전체를 **합**으로 나눈 뒤 곱해요.',
              [TAGS.half]: '똑같이 반씩 나눴어요. 비가 다르면 몫도 달라요.',
              [TAGS.otherShare]: '다른 사람의 몫을 골랐어요. 누구 몫을 묻는지 다시 봐요.',
            },
            rule: '전체 × (내 몫의 수 / 두 수의 합).',
          }),
        }),
        probe: f.probe,
      };
    },
    misread(r, c) {
      // 앞 수는 2 이상 — 1이면 "56을 1로 나눠야 해요" 같은 말 안 되는 보기가 나온다
      let p = int(r, 2, 6); let q = int(r, 3, 7);
      for (let i = 0; i < 20 && (gcd(p, q) !== 1 || p === q); i++) { p = int(r, 2, 6); q = int(r, 3, 7); }
      const k = q * int(r, 1, 3); const N = (p + q) * k; const mine = p * k;
      const shown = (N * p) / q;
      const q2 = showWork(`${N}개를 ${ro(R(p, q))} 나누면 앞사람은 ${N} × ${p}/${q} = ${shown}개예요`);
      const chs = textChoices(r, `전체를 ${p} + ${q} = ${ro(p + q)} 나눠야 해요 — ${N} × ${p}/${p + q} = ${mine}개`, [
        { text: '맞게 말했어요', tag: RIGHT_AS_WRONG },
        { text: `${jn(N, '을', '를')} ${ro(p)} 나눠야 해요`, tag: TAGS.divideByTerm },
        { text: '반씩 나눠야 해요', tag: TAGS.half },
      ]);
      return {
        ...misreadAsk(this.id, 'nosum', fill(q2, c), chs, {
          solve: solve([step(0, `${p} + ${q} = ${p + q}`), step(1, `${N} × ${p}/${p + q} = ${mine}`)], {
            whyAny: `${shown}개면 한 사람 몫이 너무 커요. 전체를 두 수의 합으로 나눠요.`,
            rule: '전체 × (내 몫의 수 / 두 수의 합).',
          }),
        }),
        probe: { calc: `${N} × ${p} ÷ (${p} + ${q})`, shown: String(shown) },
      };
    },
  },
];

export function conceptById(id) {
  return RATIO.find((c) => c.id === id) || null;
}

// ───────────────────── 문항 만들기 (mathdec·mathmix와 같은 모양) ─────────────────────

/**
 * 개념 하나의 문항 한 개. `probe` = 테스트가 **생성기와 따로** 답을 다시 풀 재료 (화면은 쓰지 않는다)
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
const SLIP = '한 번 더 천천히 — 기준량이 무엇인지 먼저 찾고 계산해 봐요.';

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
  return diagnosticOf(RATIO, makeQuestion, seed, n, opts);
}
export function placeFrom(answers) {
  return placeFromOf(RATIO, answers);
}
export function ladder(doneIds) {
  return ladderOf(RATIO, doneIds);
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
/** 보기 글자 → {n, d} — checkHuman의 "정답과 같은 값" 검사용 (백분율은 /100) */
function fracValue(text) {
  const v = valueOf(text);
  if (v === null) return null;
  return { n: Math.round(v * 10000), d: 10000 };
}

/**
 * coach/math/ratio.json 형식 검사 — mathdec.checkContent와 같은 규칙
 * @returns {string[]}
 */
export function checkContent(content) {
  const bad = [];
  for (const c of RATIO) {
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
