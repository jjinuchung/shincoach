// 🔢 수학 — C 소수 줄기 (초4 「소수의 덧셈과 뺄셈」 → 초5 분수와 소수·소수의 곱셈 → 초6 소수의 나눗셈):
// 개념 사다리 + 문제 생성기 + 내용 형식 검사. 순수 함수만 — 화면 없음 (node 테스트에서 그대로 돈다).
//
// 왜 이 줄기인가 (2026-09-30, 아버님 결정): 어머님이 내시는 문제집(만점왕 4-2)의 지금 단원이 소수이고
// 🎯 도전 문제 3단원이 바로 그 20문제다. 도전 문제는 "그 문제 한 번"이라, 틀린 유형을 숫자를 바꿔
// 되풀이하고 며칠 뒤 다시 묻는 일은 줄기가 해야 한다. 그리고 B8(소수·분수 혼합)·E8(음의 소수)이
// 소수 셈을 **안다고 치는데** 가르치는 줄기가 없었다.
//
// 이 단원의 오답은 거의 전부 **소수점을 어디에 두느냐**의 오해다. 그래서 오답에 그 오해의 이름을 붙인다:
//   · 끝자리를 맞춤        — 3.46 + 0.8 = 3.54   (소수점 대신 오른쪽 끝을 맞춤 — 가장 흔함)
//   · 자릿수가 많으면 크다  — 0.45 > 0.5          (소수점 아래를 자연수처럼 비교)
//   · 소수점 자리 수를 더하지 않음 — 0.3 × 0.2 = 0.6
//   · 몫의 0을 빠뜨림      — 6.24 ÷ 6 = 1.4
// 이 이름이 ①의 오답이자 📊의 오개념 이름표가 된다.
//
// ★ 값은 **정수 단위로** 셈한다 ({u, p} = u / 10^p). 0.1 + 0.2 = 0.30000000000000004 같은 부동소수 찌꺼기가
//   보기에 한 번이라도 나가면 아이는 그 문제를 못 푼다.
// ★ 답은 테스트가 **따로 만든 계산기**로 다시 푼다(probe). 생성기가 답을 셈한 코드로 검산하면 의미가 없다
//   (음수 줄기 Codex 리뷰의 교훈).

import { figureSvg } from './mathdraw.js';
import { rng, shuffle, fill, castOf, worldPick, ask, solve, int, pick, pickFamily, humanQuestion, checkHuman, diagnosticOf, placeFromOf, ladderOf } from './mathgen.js';
import { valueOf, gradeLabel, reduce, fracText } from './mathmix.js';

// 화면은 G().valueOf를 부른다 — 숫자를 돌려주므로 🎯 감 잡기(1/2보다 큰가?)는 이 줄기에 붙지 않는다 (B 줄기와 같다)
export { valueOf, gradeLabel };

// ───────────────────── 소수 — 정수 단위로 정확하게 ─────────────────────

const P10 = [1, 10, 100, 1000, 10000, 100000, 1000000];

/** 소수 글자 → {u, p} (값 = u / 10^p). "3.46" → {u:346, p:2}, "5" → {u:5, p:0}. 못 읽으면 null */
export function D(text) {
  const m = /^(\d+)(?:\.(\d+))?$/.exec(String(text == null ? '' : text).trim());
  if (!m) return null;
  const f = m[2] || '';
  return { u: Number(m[1] + f), p: f.length };
}

/** {u, p} → 글자. 끝의 0은 지운다 (4.260 → 4.26, 3.0 → 3). 음수·정수 아닌 값은 '' (보기에서 버려진다) */
export function decText(u, p) {
  if (!Number.isInteger(u) || !Number.isInteger(p) || u < 0 || p < 0) return '';
  while (p > 0 && u % 10 === 0) { u /= 10; p -= 1; }
  if (!p) return String(u);
  const s = String(u).padStart(p + 1, '0');
  return `${s.slice(0, s.length - p)}.${s.slice(s.length - p)}`;
}
const T = (x) => decText(x.u, x.p);
/** P자리로 맞춘 정수 (0.8을 두 자리로 → 80) */
const at = (x, P) => x.u * P10[P - x.p];

/**
 * 무작위 소수 — 정수 부분 lo~hi, 소수 p자리. **마지막 자리는 0이 아니게** —
 * 3.40이 나오면 글자로는 3.4라 "두 자리 소수"를 물을 수 없다
 */
function randD(r, lo, hi, p) {
  const w = int(r, lo, hi);
  if (!p) return { u: w, p: 0 };
  let f = int(r, 0, P10[p] - 1);
  if (f % 10 === 0) f += int(r, 1, 9);
  return { u: w * P10[p] + f, p };
}

// ── 오개념 흉내 (아이가 실제로 하는 계산을 그대로) ──

/**
 * 두 수를 소수점에 맞춘 같은 길이의 숫자 줄 — **일의 자리 칸을 늘 포함**한다.
 * 0.95는 "95"가 아니라 "095"다: 빠뜨리면 받아올림 없는 0.95 + 0.38 이 (0.23이 아니라) 1.23 이 된다
 * (씨앗 20,000개에서 잡힘 — 1,500개로는 안 나왔다)
 */
function aligned(a, b) {
  const P = Math.max(a.p, b.p);
  const A = String(at(a, P)); const B = String(at(b, P));
  const L = Math.max(A.length, B.length, P + 1);
  return [A.padStart(L, '0'), B.padStart(L, '0'), P];
}
/** 끝자리를 맞춤 — 소수점을 무시하고 오른쪽 끝을 맞춰 셈한 뒤, 자리가 긴 쪽에 맞춰 소수점을 찍는다 (3.46 + 0.8 → 346 + 8 → 3.54) */
function alignEnd(a, b, sign) {
  const v = a.u + sign * b.u;
  return v > 0 ? decText(v, Math.max(a.p, b.p)) : '';
}
/** 받아올림을 안 함 — 자리마다 합의 일의 자리만 쓴다 (맨 앞자리만 그대로: 2.67 + 1.58 → 3.15) */
function noCarry(a, b) {
  const [A, B, P] = aligned(a, b);
  let s = '';
  for (let i = 0; i < A.length; i++) {
    const t = Number(A[i]) + Number(B[i]);
    s += i === 0 ? String(t) : String(t % 10);
  }
  return decText(Number(s), P);
}
/** 큰 수에서 작은 수를 뺌 — 받아내림 대신 자리마다 큰 숫자에서 작은 숫자를 (4.2 − 1.35 → 3.15) */
function swapSub(a, b) {
  const [A, B, P] = aligned(a, b);
  let s = '';
  for (let i = 0; i < A.length; i++) s += String(Math.abs(Number(A[i]) - Number(B[i])));
  return decText(Number(s), P);
}

// ── 읽기 (3.07 → 삼 점 영칠) ──

const DIG = ['영', '일', '이', '삼', '사', '오', '육', '칠', '팔', '구'];
/** 자연수 읽기 (0~9999) — 12 → 십이, 107 → 백칠 */
function sino(n) {
  if (!n) return '영';
  let out = '';
  let rest = n;
  for (const [v, name] of [[1000, '천'], [100, '백'], [10, '십']]) {
    const d = Math.floor(rest / v);
    if (d) out += (d === 1 ? '' : DIG[d]) + name;
    rest %= v;
  }
  return out + (rest ? DIG[rest] : '');
}
/** 소수 읽기 — 소수점 아래는 **숫자를 하나씩** 읽는다 */
function readDec(x) {
  const [w, f] = T(x).split('.');
  return f ? `${sino(Number(w))} 점 ${[...f].map((ch) => DIG[Number(ch)]).join('')}` : sino(Number(w));
}

// ── 조사 — 수 뒤에서는 마지막 숫자를 읽은 소리로 (0 영·1 일·3 삼·6 육·7 칠·8 팔은 받침. 10·20…도 십이라 받침) ──

const BAT = new Set(['0', '1', '3', '6', '7', '8']);
/** 수 글자 + 조사. 분수 "3/4"는 "사분의 삼"이라 분자 끝을 본다 */
function jn(t, withB, without) {
  const s = String(t);
  const last = s.includes('/') ? s.split('/')[0].slice(-1) : s.slice(-1);
  return s + (BAT.has(last) ? withB : without);
}
const ieyo = (t) => jn(t, '이에요', '예요');

// ───────────────────── 보기 ─────────────────────

const sameValue = (a, b) => a !== null && b !== null && Math.abs(a - b) < 1e-9;

/** 정답 근처의 "계산 실수" — 정답과 같은 자리의 1·2·10칸 옆 (보기가 모자랄 때만) */
function nearDec(answer, k) {
  const x = D(answer);
  if (!x) return '';
  const steps = [1, -1, 2, -2, 10, -10, 11, -11, 3, -3];
  const u = x.u + steps[k % steps.length];
  return u > 0 ? decText(u, x.p) : '';
}
/** 분수 답 근처 — 기약분수로 (정답만 약분돼 있으면 "혼자 다른 모양"이 정답 힌트가 된다) */
function nearFrac(answer, k) {
  const m = /^(\d+)\/(\d+)$/.exec(String(answer));
  if (!m) return nearDec(answer, k);
  const n = Number(m[1]); const d = Number(m[2]);
  const tries = [[n + 1, d], [n, d + 1], [n + 2, d], [n, d * 2], [n * 2, d + 1], [n + 3, d]];
  const [a, b] = tries[k % tries.length];
  return a > 0 && b > 1 ? fracText(a, b) : '';
}

/**
 * 수 보기 4개 — 정답 + 오개념 오답. **값이 같은 보기는 넣지 않는다**
 * ("0.5"와 "1/2"는 같은 수다. 글자만 보면 정답이 둘인 문항이 나간다)
 */
function numChoices(r, answer, wrongs, near = nearDec) {
  const list = [{ text: String(answer), ok: true }];
  const seen = new Set([String(answer)]);
  const vals = [valueOf(answer)];
  const dup = (t) => { const v = valueOf(t); return seen.has(String(t)) || v === null || vals.some((x) => sameValue(x, v)); };
  const add = (t, tag) => { seen.add(String(t)); vals.push(valueOf(t)); list.push({ text: String(t), ok: false, tag }); };
  for (const w of wrongs) {
    if (!w || w.text === undefined || w.text === '' || dup(w.text) || list.length >= 4) continue;
    add(w.text, w.tag);
  }
  for (let k = 0; list.length < 4 && k < 30; k++) {
    const alt = near(answer, k);
    if (alt && !dup(alt)) add(alt, '계산 실수');
  }
  return shuffle(r, list);
}

/** 말 보기 (읽기·② 오개념 짚기·"커질까 작아질까") — 글자로만 겹침을 본다 */
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

/** ② 오개념 문항 — 갈래마다 key('misread:갈래'). 갈래가 하나면 쌍둥이가 다른 유형으로 돌아온다 */
function misreadAsk(id, branch, q, chs, o) {
  return { ...ask(id, 'misread', q, chs, o), key: `misread:${branch}` };
}
/** "{mon}이 이렇게 계산했어요. **식 = 값** 어디가 틀렸을까요?" */
const showWork = (line, verb = '계산했어요') => `{mon/이/가} 이렇게 ${verb}.\n\n**${line}**\n\n어디가 틀렸을까요?`;

const step = (no, text) => `${['①', '②', '③', '④'][no] || '·'} ${text}`;

// ② 오개념 문항의 오답 이름표 (아이 화면에는 안 보이는 것도 있다 — mathprog META_TAGS)
const RIGHT_AS_WRONG = '틀린 줄 모름';
const OFF = '엉뚱한 지적';
const MIS_OK = '오개념을 옳다고 함';

/** 이 줄기의 오개념 이름표 (📊·🤔 노트에 그대로 뜬다) */
export const TAGS = {
  shift: '자릿값을 한 칸 잘못 셈',
  noPlace: '자릿값을 모름',
  readInt: '소수 부분을 자연수처럼 읽음',
  dropZero: '0을 빠뜨림',
  noPoint: '소수점을 무시함',
  longer: '자릿수가 많으면 크다',
  backCmp: '뒷자리부터 비교',
  reverse: '소수점을 반대로 옮김',
  padZero: '0을 붙임',
  moves: '옮긴 칸 수가 틀림',
  stopMid: '처음 수를 답함',
  fromWrong: '잘못 구한 수에서 다시 셈',
  alignEnd: '끝자리를 맞춤',
  noCarry: '받아올림을 안 함',
  swapSub: '큰 수에서 작은 수를 뺌',
  denomAfter: '분모를 소수점 뒤에 씀',
  concat: '분자·분모를 이어 씀',
  tenth: '분모를 10으로 봄',
  dropPoint: '소수점을 빼먹음',
  pointPos: '소수점 위치를 잘못 찍음',
  placesNotAdded: '소수점 자리 수를 더하지 않음',
  mulBigger: '곱하면 항상 커진다',
  quotZero: '몫의 0을 빠뜨림',
  stopEarly: '나머지를 버림',
  divisorOnly: '나누는 수만 옮김',
  dividendOnly: '나누어지는 수만 옮김',
  divSmaller: '나누면 항상 작아진다',
};

const PLACE = ['', '첫째', '둘째', '셋째'];

// ───────────────────── 개념 사다리 (C. 소수 줄기) ─────────────────────

export const DECIMAL = [
  {
    id: 'dec.place', grade: 4, name: '소수 두 자리·세 자리와 자릿값', needs: [],
    idea: '0.1을 똑같이 10으로 나누면 **0.01**, 또 10으로 나누면 **0.001**. 소수점에서 오른쪽으로 한 칸 갈 때마다 1/10씩 작아져요.',
    slip: '숫자가 소수점에서 몇째 자리에 있는지 다시 세어 봐요.',
    calc(r, c) {
      // ① 0.01·0.001이 몇 개
      const p = pick(r, [2, 3]);
      let N = p === 2 ? int(r, 12, 98) : int(r, 102, 998);
      if (N % 10 === 0) N += 1;
      const unit = decText(1, p);
      // ② 1·0.1·0.01이 몇 개 (자리를 바꿔 놓는 실수가 보이게 b ≠ cc)
      const w = int(r, 1, 9); const b = int(r, 1, 9);
      let cc = int(r, 1, 9); if (cc === b) cc = (cc % 9) + 1;
      const comp = { u: w * 100 + b * 10 + cc, p: 2 };
      // ③ 숫자 하나가 나타내는 수 — 숫자가 겹치지 않게 (같은 숫자가 둘이면 "5가 나타내는 수"가 둘이다)
      const w3 = int(r, 1, 9);
      const digs = shuffle(r, [1, 2, 3, 4, 5, 6, 7, 8, 9].filter((d) => d !== w3)).slice(0, 3);
      const num = { u: w3 * 1000 + digs[0] * 100 + digs[1] * 10 + digs[2], p: 3 };
      const k = int(r, 1, 3); const dg = digs[k - 1];
      // ④ 읽기 — 소수점 아래에 0이 끼면 "영"을 빠뜨리기 쉽다
      const rp = pick(r, [2, 3]);
      const rw = int(r, 1, rp === 3 ? 9 : 19); // 소수점을 뺀 수(noPoint 오답)가 9999를 넘지 않게 — 읽기 도우미는 천의 자리까지
      let rf = int(r, 1, P10[rp] - 1); if (rf % 10 === 0) rf += 1;
      if (r() < 0.4) rf = int(r, 1, 9); // 3.07 · 5.004 처럼 가운데가 0
      const rx = { u: rw * P10[rp] + rf, p: rp };
      const rfTxt = T(rx).split('.')[1];
      const readRight = readDec(rx);
      const readWrong = [
        rfTxt[0] === '0'
          ? { text: `${sino(rw)} 점 ${[...rfTxt.replace(/^0+/, '')].map((d) => DIG[Number(d)]).join('')}`, tag: TAGS.dropZero }
          : { text: `${sino(rw)} 점 ${sino(Number(rfTxt))}`, tag: TAGS.readInt },
        { text: sino(rx.u), tag: TAGS.noPoint },
        { text: `${sino(rw)} ${[...rfTxt].map((d) => DIG[Number(d)]).join('')}`, tag: TAGS.noPoint },
      ];

      const fams = [
        { ans: T({ u: N, p }), wr: [{ text: decText(N, p - 1), tag: TAGS.shift }, { text: decText(N, p + 1), tag: TAGS.shift }],
          probe: { calc: `${unit} × ${N}` },
          steps: [`${unit}이 10개면 ${decText(10, p)}, 100개면 ${decText(100, p)}`, `${unit}이 ${N}개면 ${T({ u: N, p })}`], pools: {
            pokemon: [
              `${unit}이 ${N}개인 수는 얼마일까요?`,
              `{mon/이/가} 한 알에 ${unit} kg인 나무열매를 ${N}개 모았어요. 모두 몇 kg일까요?`,
            ],
            toystory: [`보니가 ${unit} m짜리 리본 조각 ${N}개를 이었어요. 모두 몇 m일까요?`],
            minions: [`밥이 ${unit} L짜리 바나나 주스를 ${N}번 모았어요. 모두 몇 L일까요?`],
          } },
        { ans: T(comp), wr: [{ text: decText(w * 100 + cc * 10 + b, 2), tag: TAGS.shift }, { text: decText(w * 1000 + b * 100 + cc, 3), tag: TAGS.shift }],
          probe: { calc: `1 × ${w} + 0.1 × ${b} + 0.01 × ${cc}` },
          steps: [`1이 ${w}개 → ${w}, 0.1이 ${b}개 → 0.${b}, 0.01이 ${cc}개 → 0.0${cc}`, `모두 더하면 ${T(comp)}`], pools: {
            pokemon: [
              `1이 ${w}개, 0.1이 ${b}개, 0.01이 ${cc}개인 수는 얼마일까요?`,
              `{mon/이/가} 1 kg짜리 ${w}개, 0.1 kg짜리 ${b}개, 0.01 kg짜리 ${cc}개를 들었어요. 모두 몇 kg일까요?`,
            ],
            minions: [`케빈이 1 m 막대 ${w}개, 0.1 m 막대 ${b}개, 0.01 m 막대 ${cc}개를 이었어요. 모두 몇 m일까요?`],
          } },
        { ans: decText(dg, k),
          wr: [k > 1 ? { text: decText(dg, k - 1), tag: TAGS.shift } : null, k < 3 ? { text: decText(dg, k + 1), tag: TAGS.shift } : null, { text: String(dg), tag: TAGS.noPlace }],
          probe: { place: { num: T(num), digit: String(dg) } },
          steps: [`${jn(dg, '은', '는')} 소수 ${PLACE[k]} 자리 숫자`, `소수 ${PLACE[k]} 자리는 ${decText(1, k)}의 자리 → ${decText(dg, k)}`], pools: {
            pokemon: [
              `${T(num)}에서 숫자 ${jn(dg, '이', '가')} 나타내는 수는 얼마일까요?`,
              `{mon}의 달리기 기록은 ${T(num)}초예요. 숫자 ${jn(dg, '이', '가')} 나타내는 수는 얼마일까요?`,
            ],
            moana: [`모아나의 배가 하루에 ${T(num)} km를 갔어요. 숫자 ${jn(dg, '이', '가')} 나타내는 수는 얼마일까요?`],
          } },
        { ans: readRight, words: true, wr: readWrong,
          probe: { read: T(rx) },
          steps: ['소수점 앞은 자연수처럼, 소수점은 "점"', '소수점 뒤는 숫자를 하나씩 — 0은 "영"', `${T(rx)} → ${readRight}`], pools: {
            pokemon: [`${jn(T(rx), '을', '를')} 바르게 읽은 것은 어느 것일까요?`],
            toystory: [`버즈의 기록판에 ${jn(T(rx), '이', '가')} 적혀 있어요. 바르게 읽은 것은?`],
          } },
      ];
      const f = pickFamily(r, c, fams);
      const story = worldPick(r, c, f.pools);
      const chs = f.words ? textChoices(r, f.ans, f.wr) : numChoices(r, f.ans, f.wr);
      return {
        ...ask(this.id, 'calc', fill(story, c), chs, {
          solve: solve([...f.steps.map((t, i) => step(i, t))], {
            why: {
              [TAGS.shift]: '한 자리 옆으로 셌어요. 소수점 바로 뒤가 0.1, 그다음이 0.01, 그다음이 0.001이에요.',
              [TAGS.noPlace]: '숫자만 보면 안 돼요 — 그 숫자가 **어느 자리에** 있는지가 크기를 정해요.',
              [TAGS.readInt]: '소수점 뒤는 "사십오"처럼 묶어 읽지 않고 "사오"처럼 하나씩 읽어요.',
              [TAGS.dropZero]: '소수점 뒤의 0도 자리를 지키는 숫자라 "영"이라고 꼭 읽어요.',
              [TAGS.noPoint]: '소수점은 "점"이라고 읽어요. 빼면 완전히 다른 수가 돼요.',
            },
            rule: '소수점 오른쪽으로 0.1 → 0.01 → 0.001, 읽을 때는 숫자를 하나씩.',
          }),
        }),
        probe: f.probe,
      };
    },
    misread(r, c) {
      const w = int(r, 1, 9);
      const digs = shuffle(r, [1, 2, 3, 4, 5, 6, 7, 8, 9].filter((d) => d !== w)).slice(0, 3);
      const num = T({ u: w * 1000 + digs[0] * 100 + digs[1] * 10 + digs[2], p: 3 });
      if (r() < 0.6) {
        // 갈래 ① 자릿값 — 한 칸 큰 쪽으로 셈
        const k = int(r, 2, 3); const dg = digs[k - 1];
        const shown = decText(dg, k - 1); const right = decText(dg, k);
        const q = showWork(`${num}에서 숫자 ${jn(dg, '은', '는')} ${ieyo(shown)}`, '말했어요');
        const chs = textChoices(r, `${jn(dg, '은', '는')} 소수 ${PLACE[k]} 자리 숫자라서 ${ieyo(right)}`, [
          { text: '맞게 말했어요', tag: RIGHT_AS_WRONG },
          { text: `${jn(dg, '은', '는')} ${jn(dg, '을', '를')} 나타내요`, tag: TAGS.noPlace },
          { text: '소수점 왼쪽부터 세어야 해요', tag: OFF },
        ]);
        return {
          ...misreadAsk(this.id, 'shift', fill(q, c), chs, {
            solve: solve([step(0, `${num} → 소수 첫째 자리 ${digs[0]}, 둘째 자리 ${digs[1]}, 셋째 자리 ${digs[2]}`), step(1, `${jn(dg, '은', '는')} ${ieyo(right)}`)], {
              whyAny: `한 자리 옆으로 셌어요. 소수 ${PLACE[k]} 자리는 ${decText(1, k)}의 자리예요.`,
              rule: '소수점 오른쪽으로 0.1 → 0.01 → 0.001.',
            }),
          }),
          probe: { place: { num, digit: String(dg) }, shown },
        };
      }
      // 갈래 ② 읽기 — 소수점 아래 0을 빠뜨림
      const rp = pick(r, [2, 3]);
      const x = { u: w * P10[rp] + int(r, 1, 9), p: rp }; // 3.07 · 5.004
      const fTxt = T(x).split('.')[1];
      const said = `${sino(w)} 점 ${DIG[Number(fTxt.slice(-1))]}`;
      const q = showWork(`${T(x)} → "${said}"`, '읽었어요');
      const chs = textChoices(r, '소수점 뒤의 0을 "영"이라고 읽지 않았어요', [
        { text: '맞게 읽었어요', tag: RIGHT_AS_WRONG },
        { text: '소수점 뒤는 자연수처럼 묶어 읽어야 해요', tag: TAGS.readInt },
        { text: '소수점은 읽지 않아요', tag: TAGS.noPoint },
      ]);
      return {
        ...misreadAsk(this.id, 'zero', fill(q, c), chs, {
          solve: solve([step(0, '소수점 뒤는 숫자를 하나씩'), step(1, `${T(x)} → "${readDec(x)}"`)], {
            whyAny: `0도 자리를 지키는 숫자예요. 빠뜨리면 ${jn(T(x), '이', '가')} 아니라 ${jn(`${w}.${fTxt.slice(-1)}`, '을', '를')} 읽은 게 돼요.`,
            rule: '소수점 뒤의 0은 "영"이라고 꼭 읽어요.',
          }),
        }),
        probe: { read: T(x), shown: said },
      };
    },
  },

  {
    id: 'dec.compare', grade: 4, name: '소수의 크기 비교', needs: ['dec.place'],
    idea: '소수는 **자연수 부분 → 소수 첫째 자리 → 둘째 자리** 순서로 비교해요. 자릿수가 많다고 큰 게 아니에요 (0.5 > 0.45).',
    slip: '자연수 부분부터, 그다음 소수 첫째 자리부터 하나씩 다시 비교해 봐요.',
    calc(r, c) {
      const W = int(r, 0, 9);
      const t = int(r, 2, 8);
      const x = int(r, 1, 9); const y = int(r, 0, x - 1); const z = int(r, 1, 9);
      // 가장 큰 수: 정답은 짧은 W.t, "자릿수가 많으면 크다"로 고르면 세 자리짜리
      const bigA = { u: W * 10 + t, p: 1 };                          // 3.6  ← 정답
      const bigB = { u: W * 100 + (t - 1) * 10 + x, p: 2 };          // 3.58
      const bigC = { u: W * 1000 + (t - 1) * 100 + y * 10 + z, p: 3 }; // 3.547 ← 긴 것
      const bigD = { u: W * 10 + (t - 1), p: 1 };                    // 3.5
      // 가장 작은 수: 정답은 긴 것, "짧으면 작다"로 고르면 W.t
      const smM = { u: W * 1000 + (t - 1) * 100 + y * 10 + z, p: 3 }; // ← 정답
      const smB = { u: W * 100 + (t - 1) * 10 + x, p: 2 };
      const smA = { u: W * 10 + t, p: 1 };                            // ← 짧은 것
      const smD = { u: W * 10 + Math.min(9, t + 1), p: 1 };
      const unitPools = (big) => ({
        pokemon: [
          big ? '다음 중 가장 큰 수는 어느 것일까요?' : '다음 중 가장 작은 수는 어느 것일까요?',
          big ? '{me/이/가} 포켓몬 넷의 몸무게를 쟀어요(kg). 가장 무거운 것은?' : '{me/이/가} 포켓몬 넷의 키를 쟀어요(m). 가장 작은 것은?',
        ],
        toystory: [big ? '장난감 넷이 멀리뛰기를 했어요(m). 가장 멀리 뛴 기록은?' : '장난감 넷이 달리기를 했어요(초). 가장 빠른(짧은) 기록은?'],
        minions: [big ? '미니언 넷이 바나나를 쟀어요(kg). 가장 무거운 것은?' : '미니언 넷이 바나나를 쟀어요(kg). 가장 가벼운 것은?'],
      });
      const fams = [
        { ans: T(bigA), wr: [{ text: T(bigC), tag: TAGS.longer }, { text: T(bigB), tag: '계산 실수' }, { text: T(bigD), tag: '계산 실수' }],
          probe: { max: true }, big: true, pools: unitPools(true) },
        { ans: T(smM), wr: [{ text: T(smA), tag: TAGS.longer }, { text: T(smB), tag: '계산 실수' }, { text: T(smD), tag: '계산 실수' }],
          probe: { min: true }, big: false, pools: unitPools(false) },
      ];
      const f = pickFamily(r, c, fams);
      const story = worldPick(r, c, f.pools);
      return {
        ...ask(this.id, 'calc', fill(story, c), numChoices(r, f.ans, f.wr), {
          solve: solve([step(0, '자연수 부분이 같으면 소수 첫째 자리부터'), step(1, '첫째 자리가 같으면 둘째 자리, 그다음 셋째 자리'), step(2, `${f.big ? '가장 큰' : '가장 작은'} 수는 ${f.ans}`)], {
            why: { [TAGS.longer]: '소수점 뒤의 숫자를 자연수처럼 읽고 비교했어요. 자릿수가 많다고 큰 게 아니라 **앞자리부터** 비교해요.' },
            rule: '소수는 앞자리부터 — 자릿수가 많다고 크지 않다.',
          }),
        }),
        probe: f.probe,
      };
    },
    misread(r, c) {
      const W = int(r, 0, 9); const t = int(r, 2, 9); const x = int(r, 1, 9);
      const a = T({ u: W * 100 + (t - 1) * 10 + x, p: 2 }); // 0.45
      const b = T({ u: W * 10 + t, p: 1 });                 // 0.5
      const q = `{mon/이/가} 이렇게 말했어요.\n\n**${a} > ${b}**\n\n"${jn(`${t - 1}${x}`, '이', '가')} ${t}보다 크니까요." 어디가 틀렸을까요?`;
      const chs = textChoices(r, `소수 첫째 자리부터 비교해야 해요 — ${t - 1} < ${t}`, [
        { text: '맞게 비교했어요', tag: RIGHT_AS_WRONG },
        { text: '소수 둘째 자리부터 비교해야 해요', tag: TAGS.backCmp },
        { text: '자연수 부분이 달라서 비교할 수 없어요', tag: OFF },
      ]);
      return {
        ...misreadAsk(this.id, 'longer', fill(q, c), chs, {
          solve: solve([step(0, `자연수 부분은 둘 다 ${W}`), step(1, `소수 첫째 자리: ${t - 1} < ${t}`), step(2, `그래서 ${a} < ${b}`)], {
            whyAny: '소수점 뒤를 자연수처럼 읽고 비교했어요. 소수는 앞자리부터 비교해요.',
            rule: '소수는 앞자리부터 — 자릿수가 많다고 크지 않다.',
          }),
        }),
        probe: { claim: { a, op: '>', b } },
      };
    },
  },

  {
    id: 'dec.relation', grade: 4, name: '소수 사이의 관계 (10배·1/10)', needs: ['dec.compare'],
    idea: '10배 하면 소수점이 **오른쪽으로 한 칸**, 1/10 하면 **왼쪽으로 한 칸** 옮겨요. 0을 붙이는 게 아니에요.',
    slip: '10(1/10)은 한 칸, 100(1/100)은 두 칸이에요. 소수점을 옮긴 칸 수를 다시 세어 봐요.',
    calc(r, c) {
      const x = randD(r, 1, 9, pick(r, [1, 2]));
      const fac = pick(r, [10, 100]); const lg = fac === 10 ? 1 : 2;
      // 늘 소수로 — 자연수(23)와 소수(2.3)가 섞이면 이야기 틀 이름(tplKey)이 갈려 🔁 쌍둥이가 같은 틀을 못 찾는다
      const y = randD(r, 1, 30, pick(r, [1, 2]));
      const part = pick(r, [10, 100]); const lp = part === 10 ? 1 : 2;
      const s = randD(r, 0, 9, 2);
      const fams = [
        { ans: decText(x.u * fac, x.p),
          wr: [{ text: decText(x.u, x.p + lg), tag: TAGS.reverse }, { text: `${T(x)}${'0'.repeat(lg)}`, tag: TAGS.padZero }, { text: decText(x.u * (fac === 10 ? 100 : 10), x.p), tag: TAGS.moves }],
          probe: { calc: `${T(x)} × ${fac}` },
          steps: [`${fac}배 → 소수점을 오른쪽으로 ${lg}칸`, `${T(x)} → ${decText(x.u * fac, x.p)}`], pools: {
            pokemon: [
              `${T(x)}의 ${fac}배는 얼마일까요?`,
              `{mon/이/가} 하루에 나무열매 주스를 ${T(x)} L씩 마셔요. ${fac}일 동안 마시면 모두 몇 L일까요?`,
            ],
            toystory: [`렉스가 한 걸음에 ${T(x)} m씩 가요. ${fac}걸음이면 몇 m일까요?`],
          } },
        { ans: decText(y.u, y.p + lp),
          wr: [{ text: decText(y.u * part, y.p), tag: TAGS.reverse }, { text: decText(y.u, y.p + (lp === 1 ? 2 : 1)), tag: TAGS.moves }],
          probe: { calc: `${T(y)} ÷ ${part}` },
          steps: [`1/${part} → 소수점을 왼쪽으로 ${lp}칸`, `${T(y)} → ${decText(y.u, y.p + lp)}`], pools: {
            pokemon: [
              `${T(y)}의 1/${jn(part, '은', '는')} 얼마일까요?`,
              `{mon/이/가} 모은 코인 무게가 ${T(y)} kg이에요. 그 1/${jn(part, '은', '는')} 몇 kg일까요?`,
            ],
            minions: [`스튜어트가 ${T(y)} m짜리 끈을 ${part}도막으로 똑같이 잘랐어요. 한 도막은 몇 m일까요?`],
          } },
        { ans: decText(s.u, s.p + 1),
          wr: [{ text: decText(s.u, s.p - 1), tag: TAGS.stopMid }, { text: decText(s.u, s.p + 2), tag: TAGS.fromWrong }],
          probe: { calc: `${T(s)} × 10 ÷ 100` },
          steps: [`1/10을 구해서 ${jn(T(s), '이', '가')} 됐으니 어떤 수는 ${T(s)}의 10배 = ${decText(s.u, s.p - 1)}`, `어떤 수의 1/100 = ${decText(s.u, s.p + 1)}`], pools: {
            pokemon: [`어떤 수의 1/100을 구해야 하는데, 잘못하여 1/10을 구했더니 ${jn(T(s), '이', '가')} 되었어요. 바르게 구하면 얼마일까요?`],
          } },
      ];
      const f = pickFamily(r, c, fams);
      const story = worldPick(r, c, f.pools);
      return {
        ...ask(this.id, 'calc', fill(story, c), numChoices(r, f.ans, f.wr), {
          solve: solve(f.steps.map((t, i) => step(i, t)), {
            why: {
              [TAGS.reverse]: '소수점을 반대쪽으로 옮겼어요. 10배·100배는 오른쪽, 1/10·1/100은 왼쪽이에요.',
              [TAGS.padZero]: '자연수는 뒤에 0을 붙이지만, 소수는 0을 붙여도 크기가 그대로예요. 소수점을 옮겨요.',
              [TAGS.moves]: '10(1/10)은 한 칸, 100(1/100)은 두 칸이에요.',
              [TAGS.stopMid]: '그건 "어떤 수"예요. 한 번 더 — 그 수의 1/100을 구해야 해요.',
              [TAGS.fromWrong]: '잘못 구한 수에서 바로 1/100을 하면 안 돼요. 먼저 어떤 수를 되찾아요.',
            },
            rule: '10배는 오른쪽 한 칸, 1/10은 왼쪽 한 칸.',
          }),
        }),
        probe: f.probe,
      };
    },
    misread(r, c) {
      const x = randD(r, 1, 9, pick(r, [1, 2]));
      if (r() < 0.5) {
        const shown = `${T(x)}0`; const right = decText(x.u * 10, x.p);
        const q = showWork(`${T(x)}의 10배 = ${shown}`, '구했어요');
        const chs = textChoices(r, `0을 붙이면 크기가 그대로예요 — 소수점을 오른쪽으로 옮겨 ${ieyo(right)}`, [
          { text: '맞게 구했어요', tag: RIGHT_AS_WRONG },
          { text: '10배 하면 소수점을 왼쪽으로 옮겨요', tag: TAGS.reverse },
          { text: '10배는 0을 두 개 붙여야 해요', tag: OFF },
        ]);
        return {
          ...misreadAsk(this.id, 'pad', fill(q, c), chs, {
            solve: solve([step(0, '10배 → 소수점을 오른쪽으로 한 칸'), step(1, `${T(x)} → ${right}`)], {
              whyAny: `자연수처럼 0을 붙였어요. ${jn(T(x), '과', '와')} ${shown}은 같은 수예요.`,
              rule: '소수의 10배는 소수점을 오른쪽으로 한 칸.',
            }),
          }),
          probe: { calc: `${T(x)} × 10`, shown },
        };
      }
      const shown = decText(x.u * 10, x.p); const right = decText(x.u, x.p + 1);
      const q = showWork(`${T(x)}의 1/10 = ${shown}`, '구했어요');
      const chs = textChoices(r, `1/10이면 소수점을 왼쪽으로 옮겨요 — ${ieyo(right)}`, [
        { text: '맞게 구했어요', tag: RIGHT_AS_WRONG },
        { text: '소수점을 두 칸 옮겨야 해요', tag: TAGS.moves },
        { text: '1/10은 0을 하나 지우면 돼요', tag: OFF },
      ]);
      return {
        ...misreadAsk(this.id, 'reverse', fill(q, c), chs, {
          solve: solve([step(0, '1/10 → 소수점을 왼쪽으로 한 칸'), step(1, `${T(x)} → ${right}`)], {
            whyAny: '소수점을 반대쪽으로 옮겼어요. 1/10은 작아지니까 왼쪽이에요.',
            rule: '1/10은 왼쪽 한 칸, 10배는 오른쪽 한 칸.',
          }),
        }),
        probe: { calc: `${T(x)} ÷ 10`, shown },
      };
    },
  },

  {
    id: 'dec.add', grade: 4, name: '소수의 덧셈', needs: ['dec.relation'],
    idea: '소수의 덧셈은 **소수점끼리 맞춰** 세로로 써요. 자리가 모자라면 뒤에 0이 있다고 생각해요 (0.8 = 0.80).',
    calc(r, c) {
      // 같은 자리 — 받아올림이 있게 (없으면 "받아올림을 안 함" 오답이 정답과 같아진다)
      let a = randD(r, 0, 20, 2); let b = randD(r, 0, 9, 2);
      for (let i = 0; i < 30 && noCarry(a, b) === T({ u: a.u + b.u, p: 2 }); i++) { a = randD(r, 0, 20, 2); b = randD(r, 0, 9, 2); }
      // 다른 자리 — 끝자리 맞춤이 보이는 자리
      const a2 = randD(r, 0, 20, 2); const b2 = randD(r, 0, 9, 1);
      const [p2a, p2b] = r() < 0.5 ? [a2, b2] : [b2, a2];
      // 자연수 + 소수 — "3 + 0.45 = 0.48"
      const n3 = { u: int(r, 2, 15), p: 0 }; const d3 = randD(r, 0, 0, pick(r, [1, 2]));
      const add = (x, y) => { const P = Math.max(x.p, y.p); return { u: at(x, P) + at(y, P), p: P }; };
      const mk = (x, y, extra) => ({
        expr: `${T(x)} + ${T(y)}`, ans: T(add(x, y)),
        wr: [x.p !== y.p ? { text: alignEnd(x, y, 1), tag: TAGS.alignEnd } : null, { text: noCarry(x, y), tag: TAGS.noCarry }],
        ...extra,
      });
      const fams = [
        mk(a, b, { pools: {
          pokemon: [
            `${T(a)} + ${T(b)} 를 계산하면?`,
            `{mon/이/가} 나무열매 주스를 어제 ${T(a)} L, 오늘 ${T(b)} L 마셨어요. 모두 몇 L일까요?`,
          ],
          toystory: [`우디가 ${T(a)} m를 달리고 ${T(b)} m를 더 달렸어요. 모두 몇 m일까요?`],
          minions: [`밥이 바나나를 ${T(a)} kg, ${T(b)} kg 모았어요. 모두 몇 kg일까요?`],
        } }),
        mk(p2a, p2b, { pools: {
          pokemon: [
            `${T(p2a)} + ${T(p2b)} 를 계산하면?`,
            `{me/이/가} ${T(p2a)} km를 걷고 ${T(p2b)} km를 더 걸었어요. 모두 몇 km일까요?`,
          ],
          toystory: [`보니가 ${T(p2a)} kg짜리 가방에 ${T(p2b)} kg짜리 장난감을 넣었어요. 모두 몇 kg일까요?`],
          moana: [`마우이가 ${T(p2a)} km를 헤엄치고 ${T(p2b)} km를 더 갔어요. 모두 몇 km일까요?`],
        } }),
        mk(n3, d3, { pools: {
          pokemon: [
            `${T(n3)} + ${T(d3)} 를 계산하면?`,
            `{mon/이/가} ${T(n3)} kg에서 ${T(d3)} kg만큼 더 무거워졌어요. 지금 몇 kg일까요?`,
          ],
        } }),
      ];
      const f = pickFamily(r, c, fams);
      const story = worldPick(r, c, f.pools);
      return {
        ...ask(this.id, 'calc', fill(story, c), numChoices(r, f.ans, f.wr), {
          expr: f.expr,
          solve: solve([step(0, '소수점끼리 맞춰 세로로 써요 (빈 자리는 0)'), step(1, '끝자리부터 더하고, 10이 넘으면 받아올림'), step(2, `답은 ${f.ans}`)], {
            why: {
              [TAGS.alignEnd]: '오른쪽 끝을 맞췄어요. 소수는 **소수점끼리** 맞춰야 같은 자리끼리 더해져요.',
              [TAGS.noCarry]: '10이 넘은 자리에서 받아올림을 안 했어요. 소수도 자연수처럼 받아올려요.',
            },
            rule: '소수점끼리 맞추고, 빈 자리는 0으로.',
          }),
        }),
        probe: { calc: f.expr },
      };
    },
    misread(r, c) {
      if (r() < 0.55) {
        const a = randD(r, 1, 9, 2); const b = randD(r, 0, 0, 1);
        const shown = alignEnd(a, b, 1);
        const q = showWork(`${T(a)} + ${T(b)} = ${shown}`);
        const chs = textChoices(r, '끝자리를 맞췄어요 — 소수점끼리 맞춰야 해요', [
          { text: '맞게 계산했어요', tag: RIGHT_AS_WRONG },
          { text: '받아올림을 빠뜨렸어요', tag: OFF },
          { text: '소수점을 빼먹었어요', tag: OFF },
        ]);
        const right = T({ u: a.u + b.u * 10, p: 2 });
        return {
          ...misreadAsk(this.id, 'align', fill(q, c), chs, {
            solve: solve([step(0, `${T(b)} = ${T(b)}0 으로 생각해요`), step(1, `${T(a)} + ${T(b)}0 = ${right}`)], {
              whyAny: `${T(b)}의 ${jn(T(b).slice(-1), '은', '는')} 소수 첫째 자리인데 둘째 자리에 더했어요.`,
              rule: '소수점끼리 맞추고, 빈 자리는 0으로.',
            }),
          }),
          probe: { calc: `${T(a)} + ${T(b)}`, shown, bug: 'alignEnd' },
        };
      }
      let a = randD(r, 1, 9, 2); let b = randD(r, 1, 9, 2);
      for (let i = 0; i < 30 && noCarry(a, b) === T({ u: a.u + b.u, p: 2 }); i++) { a = randD(r, 1, 9, 2); b = randD(r, 1, 9, 2); }
      const shown = noCarry(a, b);
      const q = showWork(`${T(a)} + ${T(b)} = ${shown}`);
      const chs = textChoices(r, '받아올림을 안 했어요', [
        { text: '맞게 계산했어요', tag: RIGHT_AS_WRONG },
        { text: '끝자리를 맞췄어요', tag: OFF },
        { text: '소수점을 잘못 찍었어요', tag: OFF },
      ]);
      return {
        ...misreadAsk(this.id, 'carry', fill(q, c), chs, {
          solve: solve([step(0, '끝자리부터 더하고 10이 넘으면 앞자리로 1'), step(1, `${T(a)} + ${T(b)} = ${T({ u: a.u + b.u, p: 2 })}`)], {
            whyAny: '10이 넘은 자리에서 받아올린 1을 앞자리에 더하지 않았어요.',
            rule: '소수도 10이 넘으면 받아올림.',
          }),
        }),
        probe: { calc: `${T(a)} + ${T(b)}`, shown, bug: 'noCarry' },
      };
    },
  },

  {
    id: 'dec.sub', grade: 4, name: '소수의 뺄셈', needs: ['dec.add'],
    idea: '뺄셈도 **소수점끼리 맞춰서**. 빼는 쪽 숫자가 더 크면 앞자리에서 받아내려요 (4.2 = 4.20).',
    calc(r, c) {
      const sub = (x, y) => { const P = Math.max(x.p, y.p); return { u: at(x, P) - at(y, P), p: P }; };
      const hasBorrow = (x, y) => swapSub(x, y) !== T(sub(x, y));
      // ① 같은 자리, 받아내림 있음
      let a = randD(r, 3, 20, 2); let b = randD(r, 0, 2, 2);
      for (let i = 0; i < 30 && !hasBorrow(a, b); i++) { a = randD(r, 3, 20, 2); b = randD(r, 0, 2, 2); }
      // ② 한 자리 − 두 자리 (4.2 − 1.35)
      let a2 = randD(r, 2, 9, 1); let b2 = randD(r, 0, 1, 2);
      for (let i = 0; i < 30 && !hasBorrow(a2, b2); i++) { a2 = randD(r, 2, 9, 1); b2 = randD(r, 0, 1, 2); }
      // ③ 자연수 − 소수 (5 − 1.37)
      const a3 = { u: int(r, 2, 15), p: 0 }; const b3 = randD(r, 0, 1, 2);
      // ④ 두 자리 − 한 자리 (7.63 − 2.4) — 끝자리 맞춤이 보이는 자리
      const a4 = randD(r, 3, 20, 2); const b4 = randD(r, 0, 2, 1);
      const mk = (x, y, pools) => ({
        expr: `${T(x)} − ${T(y)}`, ans: T(sub(x, y)),
        wr: [{ text: swapSub(x, y), tag: TAGS.swapSub }, x.p > y.p ? { text: alignEnd(x, y, -1), tag: TAGS.alignEnd } : null],
        pools,
      });
      const fams = [
        mk(a, b, {
          pokemon: [`${T(a)} − ${T(b)} 를 계산하면?`, `{mon/이/가} 나무열매 주스 ${T(a)} L 중 ${T(b)} L를 마셨어요. 남은 건 몇 L일까요?`],
          toystory: [`제시가 ${T(a)} m 중 ${T(b)} m를 달렸어요. 남은 건 몇 m일까요?`],
        }),
        mk(a2, b2, {
          pokemon: [`${T(a2)} − ${T(b2)} 를 계산하면?`, `{me/이/가} ${T(a2)} kg짜리 가방에서 ${T(b2)} kg을 꺼냈어요. 몇 kg이 남았을까요?`],
          minions: [`케빈의 바나나 ${T(a2)} kg 중 ${T(b2)} kg을 밥이 먹었어요. 남은 건 몇 kg일까요?`],
        }),
        mk(a3, b3, {
          pokemon: [`${T(a3)} − ${T(b3)} 를 계산하면?`, `{mon/이/가} ${T(a3)} km 중 ${T(b3)} km를 날았어요. 남은 건 몇 km일까요?`],
          moana: [`모아나가 ${T(a3)} km 중 ${T(b3)} km를 노 저어 갔어요. 남은 건 몇 km일까요?`],
        }),
        mk(a4, b4, {
          pokemon: [`${T(a4)} − ${T(b4)} 를 계산하면?`, `{mon/이/가} ${T(a4)} m 높이에서 ${T(b4)} m 내려왔어요. 지금 몇 m일까요?`],
        }),
      ];
      const f = pickFamily(r, c, fams);
      const story = worldPick(r, c, f.pools);
      return {
        ...ask(this.id, 'calc', fill(story, c), numChoices(r, f.ans, f.wr), {
          expr: f.expr,
          solve: solve([step(0, '소수점끼리 맞추고 빈 자리는 0'), step(1, '빼는 숫자가 더 크면 앞자리에서 받아내림'), step(2, `답은 ${f.ans}`)], {
            why: {
              [TAGS.swapSub]: '자리마다 큰 숫자에서 작은 숫자를 뺐어요. 위 숫자가 작으면 **받아내림**을 해야 해요.',
              [TAGS.alignEnd]: '오른쪽 끝을 맞췄어요. 소수는 소수점끼리 맞춰요.',
            },
            rule: '소수점끼리 맞추고, 모자라면 받아내림.',
          }),
        }),
        probe: { calc: f.expr },
      };
    },
    misread(r, c) {
      const sub = (x, y) => { const P = Math.max(x.p, y.p); return { u: at(x, P) - at(y, P), p: P }; };
      if (r() < 0.6) {
        let a = randD(r, 2, 9, 1); let b = randD(r, 0, 1, 2);
        for (let i = 0; i < 30 && swapSub(a, b) === T(sub(a, b)); i++) { a = randD(r, 2, 9, 1); b = randD(r, 0, 1, 2); }
        const shown = swapSub(a, b);
        const q = showWork(`${T(a)} − ${T(b)} = ${shown}`);
        const chs = textChoices(r, '자리마다 큰 숫자에서 작은 숫자를 뺐어요 — 받아내림을 해야 해요', [
          { text: '맞게 계산했어요', tag: RIGHT_AS_WRONG },
          { text: '끝자리를 맞췄어요', tag: OFF },
          { text: '빼기를 더하기로 했어요', tag: OFF },
        ]);
        return {
          ...misreadAsk(this.id, 'swap', fill(q, c), chs, {
            solve: solve([step(0, `${T(a)} = ${T(a)}0 으로 생각해요`), step(1, `0에서 ${jn(T(b).slice(-1), '을', '를')} 못 빼면 앞자리에서 10을 받아내림`), step(2, `답은 ${T(sub(a, b))}`)], {
              whyAny: '위 숫자가 작을 때 아래에서 위를 거꾸로 뺐어요. 앞자리에서 받아내려야 해요.',
              rule: '소수점끼리 맞추고, 모자라면 받아내림.',
            }),
          }),
          probe: { calc: `${T(a)} − ${T(b)}`, shown, bug: 'swapSub' },
        };
      }
      const a = randD(r, 3, 20, 2); const b = randD(r, 0, 2, 1);
      const shown = alignEnd(a, b, -1);
      const q = showWork(`${T(a)} − ${T(b)} = ${shown}`);
      const chs = textChoices(r, '끝자리를 맞췄어요 — 소수점끼리 맞춰야 해요', [
        { text: '맞게 계산했어요', tag: RIGHT_AS_WRONG },
        { text: '받아내림을 빠뜨렸어요', tag: OFF },
        { text: '소수점을 빼먹었어요', tag: OFF },
      ]);
      return {
        ...misreadAsk(this.id, 'align', fill(q, c), chs, {
          solve: solve([step(0, `${T(b)} = ${T(b)}0 으로 생각해요`), step(1, `${T(a)} − ${T(b)}0 = ${T(sub(a, b))}`)], {
            whyAny: `${T(b)}의 ${jn(T(b).slice(-1), '은', '는')} 소수 첫째 자리인데 둘째 자리에서 뺐어요.`,
            rule: '소수점끼리 맞추고, 빈 자리는 0으로.',
          }),
        }),
        probe: { calc: `${T(a)} − ${T(b)}`, shown, bug: 'alignEnd' },
      };
    },
  },

  {
    id: 'dec.frac', grade: 5, name: '분수와 소수 — 바꾸기·크기 비교', needs: ['dec.sub'],
    idea: '분모를 **10·100·1000**으로 만들면 소수로 바꿀 수 있어요 (3/4 = 75/100 = 0.75). 반대로 0.6 = 6/10 = 3/5.',
    slip: '분모를 10·100·1000으로 만드는 곱셈을 다시 확인해 봐요. 분자에도 같은 수를 곱해요.',
    calc(r, c) {
      const DENS = { 2: 1, 4: 2, 5: 1, 8: 3, 20: 2, 25: 2, 50: 2 };
      const d = pick(r, Object.keys(DENS).map(Number));
      let n = int(r, 1, d - 1);
      for (let i = 0; i < 20 && reduce(n, d).d !== d; i++) n = int(r, 1, d - 1); // 기약분수로
      const p = DENS[d];
      const dec = decText(n * (P10[p] / d), p);
      // 소수 → 기약분수
      const fp = pick(r, [1, 2]);
      let fu = int(r, 1, P10[fp] - 1); if (fu % 10 === 0) fu += 1;
      const fx = { u: fu, p: fp };
      const fr = (nn, dd) => { const q = reduce(nn, dd); return fracText(q.n, q.d); };
      const fams = [
        { ans: dec,
          wr: [{ text: decText(d, String(d).length), tag: TAGS.denomAfter }, { text: decText(Number(`${n}${d}`), `${n}${d}`.length), tag: TAGS.concat }],
          probe: { calc: `${n}/${d}` },
          steps: [`분모 ${jn(d, '을', '를')} ${P10[p]}(으)로 → ${n}/${d} = ${n * (P10[p] / d)}/${P10[p]}`, `${n * (P10[p] / d)}/${P10[p]} = ${dec}`], pools: {
            pokemon: [
              `${jn(`${n}/${d}`, '을', '를')} 소수로 나타내면 얼마일까요?`,
              `{mon/이/가} 피자 ${n}/${d}판을 먹었어요. 소수로 나타내면 몇 판일까요?`,
            ],
            toystory: [`보니가 케이크 ${n}/${d}조각을 먹었어요. 소수로 나타내면?`],
          }, near: nearDec },
        { ans: fr(fu, P10[fp]),
          wr: [{ text: fr(fu, P10[fp + 1]), tag: TAGS.shift }, fp === 2 ? { text: fr(fu, 10), tag: TAGS.tenth } : null],
          probe: { calc: T(fx), reduced: true },
          steps: [`${T(fx)} = ${fu}/${P10[fp]}`, `약분하면 ${fr(fu, P10[fp])}`], pools: {
            pokemon: [
              `${jn(T(fx), '을', '를')} 기약분수로 나타내면 얼마일까요?`,
              `{mon/이/가} 주스 ${T(fx)} L를 마셨어요. 기약분수로 나타내면 몇 L일까요?`,
            ],
            minions: [`밥의 바나나가 ${T(fx)} kg이에요. 기약분수로 나타내면 몇 kg일까요?`],
          }, near: nearFrac },
      ];
      const f = pickFamily(r, c, fams);
      const story = worldPick(r, c, f.pools);
      return {
        ...ask(this.id, 'calc', fill(story, c), numChoices(r, f.ans, f.wr, f.near), {
          solve: solve(f.steps.map((t, i) => step(i, t)), {
            why: {
              [TAGS.denomAfter]: '분모를 소수점 뒤에 썼어요. 분수를 소수로 바꾸려면 **분모를 10·100·1000으로** 만들어요.',
              [TAGS.concat]: `분자와 분모를 이어 썼어요. ${jn(`${n}/${d}`, '은', '는')} 두 수를 붙인 게 아니라 "${d}조각 중 ${n}조각"이라는 뜻이에요.`,
              [TAGS.shift]: '자리를 한 칸 잘못 셌어요. 소수 두 자리면 분모 100, 한 자리면 10이에요.',
              [TAGS.tenth]: '소수 두 자리를 분모 10으로 봤어요. 0.01의 자리까지 있으면 분모는 100이에요.',
            },
            rule: '분모를 10·100·1000으로 — 소수 자리 수 = 0의 개수.',
          }),
        }),
        probe: f.probe,
      };
    },
    misread(r, c) {
      const pairs = [[1, 2], [1, 4], [3, 4], [1, 5], [2, 5], [3, 5], [4, 5], [1, 8], [3, 8]];
      const [n, d] = pick(r, pairs);
      const P = { 2: 1, 4: 2, 5: 1, 8: 3 }[d];
      const right = decText(n * (P10[P] / d), P);
      const denomBranch = r() < 0.5 && decText(d, 1) !== right;
      const shown = denomBranch ? decText(d, 1) : decText(Number(`${n}${d}`), 2);
      const q = showWork(`${n}/${d} = ${shown}`, '바꿨어요');
      const ok = denomBranch ? `분모를 소수점 뒤에 썼어요 — ${n}/${d} = ${right}` : `분자와 분모를 이어 썼어요 — ${n}/${d} = ${right}`;
      const chs = textChoices(r, ok, [
        { text: '맞게 바꿨어요', tag: RIGHT_AS_WRONG },
        { text: '분자를 소수점 뒤에 써야 해요', tag: MIS_OK },
        { text: '분수는 소수로 바꿀 수 없어요', tag: OFF },
      ]);
      return {
        ...misreadAsk(this.id, denomBranch ? 'denom' : 'concat', fill(q, c), chs, {
          solve: solve([step(0, `분모 ${jn(d, '을', '를')} ${P10[P]}(으)로 → ${n * (P10[P] / d)}/${P10[P]}`), step(1, `= ${right}`)], {
            whyAny: `분수를 소수로 바꿀 때는 분모를 10·100·1000으로 만들어요. ${jn(`${n}/${d}`, '은', '는')} ${ieyo(right)}`,
            rule: '분모를 10·100·1000으로 만들어 소수로.',
          }),
        }),
        probe: { calc: `${n}/${d}`, shown },
      };
    },
  },

  {
    id: 'dec.mulnat', grade: 5, name: '소수 × 자연수', needs: ['dec.frac'],
    idea: '0.7 × 6은 **0.7을 6번 더한 것**. 7 × 6 = 42를 하고, 소수 한 자리였으니 **4.2**.',
    calc(r, c) {
      const a = randD(r, 0, 9, pick(r, [1, 2]));
      const n = r() < 0.75 ? int(r, 2, 9) : int(r, 11, 19);
      const ans = decText(a.u * n, a.p);
      const wr = [{ text: String(a.u * n), tag: TAGS.dropPoint }, { text: decText(a.u * n, a.p + 1), tag: TAGS.pointPos }];
      const fams = [
        { expr: `${T(a)} × ${n}`, pools: {
          pokemon: [
            `${T(a)} × ${n} 를 계산하면?`,
            `{mon/이/가} 나무열매 주스를 하루에 ${T(a)} L씩 ${n}일 동안 마셨어요. 모두 몇 L일까요?`,
          ],
          toystory: [`버즈가 한 번에 ${T(a)} m씩 ${n}번 날았어요. 모두 몇 m일까요?`],
          minions: [`한 개에 ${T(a)} kg인 바나나 상자가 ${n}개예요. 모두 몇 kg일까요?`],
        } },
        { expr: `${n} × ${T(a)}`, pools: {
          pokemon: [
            `${n} × ${T(a)} 를 계산하면?`,
            `{me/이/가} ${n}일 동안 매일 ${T(a)} km씩 걸었어요. 모두 몇 km일까요?`,
          ],
          moana: [`모아나가 ${n}일 동안 하루에 ${T(a)} km씩 배를 탔어요. 모두 몇 km일까요?`],
        } },
      ];
      const f = pickFamily(r, c, fams);
      const story = worldPick(r, c, f.pools);
      return {
        ...ask(this.id, 'calc', fill(story, c), numChoices(r, ans, wr), {
          expr: f.expr,
          solve: solve([step(0, `소수점을 떼고 ${a.u} × ${n} = ${a.u * n}`), step(1, `${jn(T(a), '은', '는')} 소수 ${PLACE[a.p]} 자리 → 곱도 소수 ${PLACE[a.p]} 자리`), step(2, `답은 ${ans}`)], {
            why: {
              [TAGS.dropPoint]: '소수점을 빼먹었어요. 자연수처럼 곱한 뒤 **소수점을 다시 찍어야** 해요.',
              [TAGS.pointPos]: '소수점을 한 칸 더 옮겼어요. 곱해지는 소수의 자리 수만큼만 옮겨요.',
            },
            rule: '자연수처럼 곱하고, 소수의 자리 수만큼 소수점.',
          }),
        }),
        probe: { calc: f.expr },
      };
    },
    misread(r, c) {
      const a = randD(r, 0, 9, pick(r, [1, 2]));
      const n = int(r, 2, 9);
      const right = decText(a.u * n, a.p);
      const drop = r() < 0.5;
      const shown = drop ? String(a.u * n) : decText(a.u * n, a.p + 1);
      const q = showWork(`${T(a)} × ${n} = ${shown}`);
      const chs = textChoices(r, drop ? `소수점을 빼먹었어요 — 답은 ${right}` : `소수점을 한 칸 더 옮겼어요 — 답은 ${right}`, [
        { text: '맞게 계산했어요', tag: RIGHT_AS_WRONG },
        { text: '곱하면 소수점이 없어져요', tag: MIS_OK },
        { text: '받아올림을 빠뜨렸어요', tag: OFF },
      ]);
      return {
        ...misreadAsk(this.id, drop ? 'drop' : 'pos', fill(q, c), chs, {
          solve: solve([step(0, `${a.u} × ${n} = ${a.u * n}`), step(1, `소수 ${PLACE[a.p]} 자리 → ${right}`)], {
            whyAny: `${jn(T(a), '이', '가')} ${n}개 있는 거라 ${right} 정도가 돼야 해요. 자리 수를 세서 소수점을 찍어요.`,
            rule: '자연수처럼 곱하고, 소수의 자리 수만큼 소수점.',
          }),
        }),
        probe: { calc: `${T(a)} × ${n}`, shown, bug: drop ? 'dropPoint' : 'pointPos' },
      };
    },
  },

  {
    id: 'dec.muldec', grade: 5, name: '소수 × 소수', needs: ['dec.mulnat'],
    idea: '0.3 × 0.2: 3 × 2 = 6을 하고, **소수 한 자리 + 소수 한 자리 = 소수 두 자리** → 0.06. 1보다 작은 수를 곱하면 오히려 작아져요.',
    calc(r, c) {
      const a = randD(r, 0, 9, pick(r, [1, 2]));
      const b = randD(r, 0, pick(r, [0, 0, 1, 2]), 1);
      const ans = decText(a.u * b.u, a.p + b.p);
      const wr = [{ text: decText(a.u * b.u, Math.max(a.p, b.p)), tag: TAGS.placesNotAdded }, { text: String(a.u * b.u), tag: TAGS.dropPoint }];
      // "곱하면 커진다" — 1보다 작은 수를 곱하면 작아진다. 이 오개념 하나만 겨눈다 (1보다 큰 수를 섞으면 "작아져요" 오답의 이름이 없다)
      const N = int(r, 2, 9);
      const m = randD(r, 0, 0, 1);
      const fams = [
        { expr: `${T(a)} × ${T(b)}`, ans, wr, probe: { calc: `${T(a)} × ${T(b)}` }, pools: {
          pokemon: [
            `${T(a)} × ${T(b)} 를 계산하면?`,
            `{mon/이/가} 가로 ${T(a)} m, 세로 ${T(b)} m인 텃밭을 만들었어요. 넓이는 몇 m²일까요?`,
          ],
          toystory: [`1 m에 ${T(a)} kg인 줄을 ${T(b)} m만큼 잘랐어요. 잘라 낸 줄은 몇 kg일까요?`],
        } },
        { words: true, ans: '처음 수보다 작아져요',
          wr: [{ text: '처음 수보다 커져요', tag: TAGS.mulBigger }, { text: '처음 수와 같아요', tag: '계산 실수' }],
          probe: { cmpBase: { calc: `${N} × ${T(m)}`, base: String(N) } }, pools: {
            pokemon: [`${N} × ${jn(T(m), '을', '를')} 계산하면, 처음 수 ${N}보다 어떻게 될까요? (계산하지 말고 생각해 봐요)`],
          } },
      ];
      const f = pickFamily(r, c, fams);
      const story = worldPick(r, c, f.pools);
      const chs = f.words ? textChoices(r, f.ans, f.wr) : numChoices(r, f.ans, f.wr);
      return {
        ...ask(this.id, 'calc', fill(story, c), chs, {
          expr: f.words ? '' : f.expr,
          solve: f.words
            ? solve([step(0, `${jn(T(m), '은', '는')} 1보다 작아요`), step(1, `${N}의 ${T(m)}배 → ${f.ans}`)], {
              why: {
                [TAGS.mulBigger]: '곱하면 늘 커지는 건 자연수끼리일 때예요. **1보다 작은 수**를 곱하면 오히려 작아져요.',
                '계산 실수': `처음 수와 같아지는 건 1을 곱할 때뿐이에요. ${jn(T(m), '은', '는')} 1보다 작아요.`,
              },
              rule: '1보다 작은 수를 곱하면 작아진다.',
            })
            : solve([step(0, `소수점을 떼고 ${a.u} × ${b.u} = ${a.u * b.u}`), step(1, `소수 ${a.p}자리 + ${b.p}자리 = ${a.p + b.p}자리`), step(2, `답은 ${ans}`)], {
              why: {
                [TAGS.placesNotAdded]: `소수점 자리 수를 **더해야** 해요. ${a.p}자리 × ${b.p}자리면 ${a.p + b.p}자리예요.`,
                [TAGS.dropPoint]: '소수점을 빼먹었어요. 곱한 뒤 두 수의 자리 수를 더한 만큼 소수점을 찍어요.',
              },
              rule: '곱의 소수 자리 수 = 두 수의 소수 자리 수의 합.',
            }),
        }),
        probe: f.probe,
      };
    },
    misread(r, c) {
      const a = randD(r, 0, 3, 1); const b = randD(r, 0, 0, 1);
      const shown = decText(a.u * b.u, 1);
      const right = decText(a.u * b.u, 2);
      const q = showWork(`${T(a)} × ${T(b)} = ${shown}`);
      const chs = textChoices(r, `소수 한 자리 × 소수 한 자리는 소수 두 자리예요 — 답은 ${right}`, [
        { text: '맞게 계산했어요', tag: RIGHT_AS_WRONG },
        { text: '곱하면 항상 커져야 해요', tag: MIS_OK },
        { text: '소수점을 빼먹었어요', tag: OFF },
      ]);
      return {
        ...misreadAsk(this.id, 'places', fill(q, c), chs, {
          solve: solve([step(0, `${a.u} × ${b.u} = ${a.u * b.u}`), step(1, `1자리 + 1자리 = 2자리 → ${right}`)], {
            whyAny: `소수점 자리 수를 더하지 않았어요. ${jn(T(b), '은', '는')} 1보다 작으니 답은 ${T(a)}보다 작아야 해요.`,
            rule: '곱의 소수 자리 수 = 두 수의 소수 자리 수의 합.',
          }),
        }),
        probe: { calc: `${T(a)} × ${T(b)}`, shown, bug: 'placesNotAdded' },
      };
    },
  },

  {
    id: 'dec.divnat', grade: 6, name: '소수 ÷ 자연수', needs: ['dec.muldec'],
    idea: '자연수처럼 나누고, 몫의 소수점은 **나누어지는 수의 소수점 바로 위에**. 나눌 수 없는 자리에는 몫에 **0**을 써요.',
    calc(r, c) {
      // ① 기본 (8.4 ÷ 4) — 나누어지는 수가 자연수(2.5 × 2 = 5)가 되지 않게: 모양이 바뀌면 쌍둥이 틀이 갈린다
      let q1 = randD(r, 1, 9, 1); let n1 = int(r, 2, 9);
      for (let i = 0; i < 30 && (q1.u * n1) % 10 === 0; i++) { q1 = randD(r, 1, 9, 1); n1 = int(r, 2, 9); }
      // ② 몫에 0 (6.24 ÷ 6 = 1.04 · 0.36 ÷ 4 = 0.09)
      const W = int(r, 0, 9); const x = int(r, 1, 9);
      const q2 = { u: W * 100 + x, p: 2 }; const n2 = int(r, 2, 9);
      // ③ 0을 내려 더 나눔 (3.2 ÷ 5 = 0.64) — 나누어지는 수는 **소수 한 자리**여야 한다.
      //    두 자리(×)면 0을 내릴 일이 없고, 자연수(9.25 × 4 = 37)면 "나머지를 버림" 값이 9로 바뀐다 (테스트가 잡음)
      const oneTenth = (q, n) => (q.u * n) % 10 === 0 && (q.u * n) % 100 !== 0 && q.u >= 10;
      let q3 = randD(r, 0, 9, 2); let n3 = pick(r, [2, 4, 5, 6, 8]);
      for (let i = 0; i < 80 && !oneTenth(q3, n3); i++) { q3 = randD(r, 0, 9, 2); n3 = pick(r, [2, 4, 5, 6, 8]); }
      // ④ 자연수 ÷ 자연수를 소수로 (7 ÷ 4 = 1.75)
      const n4 = pick(r, [2, 4, 5, 8]);
      let a4 = int(r, 3, 40); for (let i = 0; i < 20 && a4 % n4 === 0; i++) a4 = int(r, 3, 40);
      const p4 = { 2: 1, 4: 2, 5: 1, 8: 3 }[n4];
      const ans4 = decText(a4 * (P10[p4] / n4), p4);
      const fams = [
        { expr: `${decText(q1.u * n1, 1)} ÷ ${n1}`, ans: T(q1),
          wr: [{ text: String(q1.u), tag: TAGS.dropPoint }, { text: decText(q1.u, 2), tag: TAGS.pointPos }], pools: {
            pokemon: [`${decText(q1.u * n1, 1)} ÷ ${n1} 를 계산하면?`, `{mon/이/가} 주스 ${decText(q1.u * n1, 1)} L를 ${n1}명에게 똑같이 나눴어요. 한 명에게 몇 L일까요?`],
            toystory: [`우디가 ${decText(q1.u * n1, 1)} m 끈을 ${n1}도막으로 똑같이 잘랐어요. 한 도막은 몇 m일까요?`],
          } },
        { expr: `${decText(q2.u * n2, 2)} ÷ ${n2}`, ans: T(q2),
          wr: [{ text: decText(W * 10 + x, 1), tag: TAGS.quotZero }, { text: decText(q2.u, 1), tag: TAGS.pointPos }], pools: {
            pokemon: [`${decText(q2.u * n2, 2)} ÷ ${n2} 를 계산하면?`, `{me/이/가} 나무열매 ${decText(q2.u * n2, 2)} kg을 ${n2}봉지에 똑같이 담았어요. 한 봉지는 몇 kg일까요?`],
            minions: [`바나나 ${decText(q2.u * n2, 2)} kg을 미니언 ${n2}명이 똑같이 나눴어요. 한 명이 몇 kg일까요?`],
          } },
        { expr: `${decText(q3.u * n3, 2)} ÷ ${n3}`, ans: T(q3),
          wr: [{ text: decText(Math.floor(q3.u / 10), 1), tag: TAGS.stopEarly }, { text: decText(q3.u, 1), tag: TAGS.pointPos }], pools: {
            pokemon: [`${decText(q3.u * n3, 2)} ÷ ${n3} 를 계산하면?`, `{mon/이/가} ${decText(q3.u * n3, 2)} km를 ${n3}번에 똑같이 나눠 날았어요. 한 번에 몇 km일까요?`],
          } },
        { expr: `${a4} ÷ ${n4}`, ans: ans4,
          wr: [{ text: String(Math.floor(a4 / n4)), tag: TAGS.stopEarly }, { text: decText(a4 * (P10[p4] / n4), p4 + 1), tag: TAGS.pointPos }], pools: {
            pokemon: [`${a4} ÷ ${n4}의 몫을 소수로 나타내면?`, `{mon/이/가} 물 ${a4} L를 ${n4}통에 똑같이 나눠 담았어요. 한 통에 몇 L일까요?`],
            moana: [`탈라 할머니가 코코넛 주스 ${a4} L를 ${n4}명에게 똑같이 나눴어요. 한 명에게 몇 L일까요?`],
          } },
      ];
      const f = pickFamily(r, c, fams);
      const story = worldPick(r, c, f.pools);
      return {
        ...ask(this.id, 'calc', fill(story, c), numChoices(r, f.ans, f.wr), {
          expr: f.expr,
          solve: solve([step(0, '자연수처럼 나누고, 몫의 소수점은 나누어지는 수의 소수점 위에'), step(1, '나눌 수 없는 자리는 몫에 0, 남으면 0을 내려 더 나눠요'), step(2, `답은 ${f.ans}`)], {
            why: {
              [TAGS.quotZero]: '나눌 수 없는 자리에서 몫에 0을 쓰지 않았어요. 그 0이 없으면 자리가 한 칸씩 밀려요.',
              [TAGS.stopEarly]: '나머지가 있는데 멈췄어요. 소수는 뒤에 0을 내려서 끝까지 나눌 수 있어요.',
              [TAGS.dropPoint]: '몫에 소수점을 안 찍었어요. 나누어지는 수의 소수점 바로 위에 찍어요.',
              [TAGS.pointPos]: '몫의 소수점 자리가 틀렸어요. 나누어지는 수의 소수점 **바로 위**예요.',
            },
            rule: '몫의 소수점은 바로 위에, 못 나누는 자리엔 0.',
          }),
        }),
        probe: { calc: f.expr },
      };
    },
    misread(r, c) {
      if (r() < 0.55) {
        const W = int(r, 1, 9); const x = int(r, 1, 9); const n = int(r, 2, 9);
        const q = { u: W * 100 + x, p: 2 };
        const a = decText(q.u * n, 2);
        const shown = decText(W * 10 + x, 1);
        const chs = textChoices(r, `나눌 수 없는 자리에 몫 0을 안 썼어요 — 답은 ${T(q)}`, [
          { text: '맞게 계산했어요', tag: RIGHT_AS_WRONG },
          { text: '소수점을 빼먹었어요', tag: OFF },
          { text: '나누어지는 수를 잘못 옮겨 썼어요', tag: OFF },
        ]);
        return {
          ...misreadAsk(this.id, 'zero', fill(showWork(`${a} ÷ ${n} = ${shown}`), c), chs, {
            solve: solve([step(0, `소수 첫째 자리에서 ${n}(으)로 못 나누면 몫에 0`), step(1, `답은 ${T(q)}`)], {
              whyAny: `몫에 0을 빠뜨려 자리가 한 칸 밀렸어요. 확인: ${shown} × ${jn(String(n), '은', '는')} ${a}보다 훨씬 커요.`,
              rule: '못 나누는 자리엔 몫에 0.',
            }),
          }),
          probe: { calc: `${a} ÷ ${n}`, shown, bug: 'quotZero' },
        };
      }
      const oneTenth = (x, k) => (x.u * k) % 10 === 0 && (x.u * k) % 100 !== 0 && x.u >= 10;
      let q = randD(r, 0, 9, 2); let n = pick(r, [2, 4, 5, 6, 8]);
      for (let i = 0; i < 80 && !oneTenth(q, n); i++) { q = randD(r, 0, 9, 2); n = pick(r, [2, 4, 5, 6, 8]); }
      const a = decText(q.u * n, 2);
      const shown = decText(Math.floor(q.u / 10), 1);
      const chs = textChoices(r, `나머지가 있는데 멈췄어요 — 0을 내려 더 나누면 ${ieyo(T(q))}`, [
        { text: '맞게 계산했어요', tag: RIGHT_AS_WRONG },
        { text: '소수는 끝까지 나눌 수 없어요', tag: MIS_OK },
        { text: '소수점을 잘못 찍었어요', tag: OFF },
      ]);
      return {
        ...misreadAsk(this.id, 'stop', fill(showWork(`${a} ÷ ${n} = ${shown}`), c), chs, {
          solve: solve([step(0, `${a} = ${a}0 으로 생각하고 0을 내려요`), step(1, `끝까지 나누면 ${T(q)}`)], {
            whyAny: '소수는 뒤에 0이 있다고 생각하고 계속 나눌 수 있어요. 나머지를 버리면 안 돼요.',
            rule: '나머지가 있으면 0을 내려 끝까지.',
          }),
        }),
        probe: { calc: `${a} ÷ ${n}`, shown, bug: 'stopEarly' },
      };
    },
  },

  {
    id: 'dec.divdec', grade: 6, name: '소수 ÷ 소수', needs: ['dec.divnat'],
    idea: '나누는 수를 자연수로 만들 만큼 **두 수의 소수점을 똑같이** 옮겨요 (1.8 ÷ 0.3 = 18 ÷ 3). 1보다 작은 수로 나누면 몫이 **커져요**.',
    calc(r, c) {
      // ① 같은 자리 (1.8 ÷ 0.3) — 나누어지는 수도 소수 한 자리로 (0.5 × 4 = 2처럼 자연수가 되면 쌍둥이 틀이 갈린다)
      let b1 = randD(r, 0, 2, 1); let q1 = int(r, 2, 12);
      for (let i = 0; i < 40 && (b1.u * q1) % 10 === 0; i++) { b1 = randD(r, 0, 2, 1); q1 = int(r, 2, 12); }
      const a1 = decText(b1.u * q1, 1);
      // ② 자리가 다름 (2.4 ÷ 0.08) — 나누어지는 수가 **소수 한 자리** (자연수가 되면 "옮긴 칸 수" 오답의 모양이 달라진다)
      const oneTenth = (x, k) => (x.u * k) % 10 === 0 && (x.u * k) % 100 !== 0;
      let b2 = randD(r, 0, 0, 2); let q2 = int(r, 2, 60);
      for (let i = 0; i < 80 && !oneTenth(b2, q2); i++) { b2 = randD(r, 0, 0, 2); q2 = int(r, 2, 60); }
      const a2 = decText(b2.u * q2, 2);
      // ③ 자연수 ÷ 소수 (6 ÷ 0.4 = 15)
      const b3 = pick(r, [2, 4, 5, 6, 8]); let q3 = int(r, 2, 40);
      for (let i = 0; i < 40 && (b3 * q3) % 10 !== 0; i++) q3 = int(r, 2, 40);
      const a3 = String((b3 * q3) / 10);
      // "나누면 작아진다"
      const N = int(r, 2, 9); const m = randD(r, 0, 0, 1);
      const fams = [
        { expr: `${a1} ÷ ${T(b1)}`, ans: String(q1),
          wr: [{ text: decText(q1, 1), tag: TAGS.divisorOnly }, { text: String(q1 * 10), tag: TAGS.dividendOnly }], pools: {
            pokemon: [`${a1} ÷ ${T(b1)} 를 계산하면?`, `{mon/이/가} 주스 ${a1} L를 ${T(b1)} L씩 컵에 나눠 담았어요. 몇 컵이 될까요?`],
            toystory: [`포키가 ${a1} m 끈을 ${T(b1)} m씩 잘랐어요. 몇 도막이 될까요?`],
          } },
        { expr: `${a2} ÷ ${T(b2)}`, ans: String(q2),
          wr: [{ text: decText(q2, 1), tag: TAGS.moves }, { text: decText(q2, 2), tag: TAGS.divisorOnly }], pools: {
            pokemon: [`${a2} ÷ ${T(b2)} 를 계산하면?`, `{me/이/가} ${a2} kg을 한 봉지에 ${T(b2)} kg씩 나눠 담았어요. 몇 봉지가 될까요?`],
          } },
        { expr: `${a3} ÷ 0.${b3}`, ans: String(q3),
          wr: [{ text: decText(q3, 1), tag: TAGS.divisorOnly }], pools: {
            pokemon: [`${a3} ÷ 0.${b3} 를 계산하면?`, `{mon/이/가} 나무열매 ${a3} kg을 0.${b3} kg씩 나눴어요. 몇 묶음일까요?`],
            minions: [`바나나 ${a3} kg을 0.${b3} kg씩 나눴어요. 몇 묶음일까요?`],
          } },
        { words: true, ans: '처음 수보다 커져요',
          wr: [{ text: '처음 수보다 작아져요', tag: TAGS.divSmaller }, { text: '처음 수와 같아요', tag: '계산 실수' }],
          probe: { cmpBase: { calc: `${N} ÷ ${T(m)}`, base: String(N) } }, pools: {
            pokemon: [`${N} ÷ ${jn(T(m), '을', '를')} 계산하면, 몫은 처음 수 ${N}보다 어떻게 될까요? (계산하지 말고 생각해 봐요)`],
          } },
      ];
      const f = pickFamily(r, c, fams);
      const story = worldPick(r, c, f.pools);
      const chs = f.words ? textChoices(r, f.ans, f.wr) : numChoices(r, f.ans, f.wr);
      return {
        ...ask(this.id, 'calc', fill(story, c), chs, {
          expr: f.words ? '' : f.expr,
          solve: f.words
            ? solve([step(0, `${N} 안에 ${jn(T(m), '이', '가')} 몇 번 들어갈까?`), step(1, `${jn(T(m), '은', '는')} 1보다 작으니 ${N}번보다 많이 들어가요 → ${f.ans}`)], {
              why: {
                [TAGS.divSmaller]: '나누면 늘 작아지는 건 1보다 큰 수로 나눌 때예요. **1보다 작은 수**로 나누면 몫이 커져요.',
                '계산 실수': `몫이 처음 수와 같아지는 건 1로 나눌 때뿐이에요. ${jn(T(m), '은', '는')} 1보다 작아요.`,
              },
              rule: '1보다 작은 수로 나누면 커진다.',
            })
            : solve([step(0, '나누는 수가 자연수가 되게 두 수의 소수점을 똑같이 옮겨요'), step(1, '자연수 나눗셈으로'), step(2, `답은 ${f.ans}`)], {
              why: {
                [TAGS.divisorOnly]: '나누는 수만 옮겼어요. 나누어지는 수도 **똑같은 칸 수만큼** 옮겨야 몫이 그대로예요.',
                [TAGS.dividendOnly]: '나누어지는 수만 옮겼어요. 두 수를 함께 옮겨요.',
                [TAGS.moves]: '두 수를 옮긴 칸 수가 달라요. 나누는 수를 옮긴 만큼 나누어지는 수도 옮겨요 (빈 자리는 0).',
              },
              rule: '두 수의 소수점을 같은 칸 수만큼.',
            }),
        }),
        probe: f.probe || { calc: f.expr },
      };
    },
    misread(r, c) {
      if (r() < 0.55) {
        const b = randD(r, 0, 0, 1); const q = int(r, 2, 12); // 0.x만 — 풀이가 "1보다 작으니 몫이 커야"라고 말한다
        const a = decText(b.u * q, 1);
        const shown = decText(q, 1);
        const chs = textChoices(r, `나누는 수만 10배 했어요 — 나누어지는 수도 10배 하면 ${ieyo(String(q))}`, [
          { text: '맞게 계산했어요', tag: RIGHT_AS_WRONG },
          { text: '나누면 항상 작아져야 해요', tag: MIS_OK },
          { text: '소수점을 두 칸 옮겨야 해요', tag: OFF },
        ]);
        return {
          ...misreadAsk(this.id, 'one', fill(showWork(`${a} ÷ ${T(b)} = ${shown}`), c), chs, {
            solve: solve([step(0, `두 수를 10배 → ${decText(b.u * q, 0)} ÷ ${b.u}`), step(1, `= ${q}`)], {
              whyAny: `${jn(T(b), '은', '는')} 1보다 작으니 몫은 ${a}보다 커야 해요. 두 수의 소수점을 똑같이 옮겨요.`,
              rule: '두 수의 소수점을 같은 칸 수만큼.',
            }),
          }),
          probe: { calc: `${a} ÷ ${T(b)}`, shown, bug: 'divisorOnly' },
        };
      }
      const oneTenth = (x, k) => (x.u * k) % 10 === 0 && (x.u * k) % 100 !== 0;
      let b = randD(r, 0, 0, 2); let q = int(r, 2, 60);
      for (let i = 0; i < 80 && !oneTenth(b, q); i++) { b = randD(r, 0, 0, 2); q = int(r, 2, 60); }
      const a = decText(b.u * q, 2);
      const shown = decText(q, 1);
      const chs = textChoices(r, `두 수를 옮긴 칸 수가 달라요 — 똑같이 두 칸 옮기면 ${ieyo(String(q))}`, [
        { text: '맞게 계산했어요', tag: RIGHT_AS_WRONG },
        { text: '나누는 수는 옮기면 안 돼요', tag: MIS_OK },
        { text: '나눗셈을 곱셈으로 했어요', tag: OFF },
      ]);
      return {
        ...misreadAsk(this.id, 'moves', fill(showWork(`${a} ÷ ${T(b)} = ${shown}`), c), chs, {
          solve: solve([step(0, `나누는 수 ${jn(T(b), '을', '를')} 자연수로 → 두 칸`), step(1, `나누어지는 수도 두 칸 → ${decText(b.u * q, 0)} ÷ ${b.u} = ${q}`)], {
            whyAny: '나누는 수를 두 칸 옮겼으면 나누어지는 수도 두 칸이에요 (빈 자리는 0).',
            rule: '두 수의 소수점을 같은 칸 수만큼.',
          }),
        }),
        probe: { calc: `${a} ÷ ${T(b)}`, shown, bug: 'moves' },
      };
    },
  },
];

export function conceptById(id) {
  return DECIMAL.find((c) => c.id === id) || null;
}

// ───────────────────── 문항 만들기 (mathmix·mathneg와 같은 모양) ─────────────────────

/**
 * 개념 하나의 문항 한 개. 화면은 줄기 객체만 바꿔 끼운다.
 * `probe` = 테스트가 **생성기와 따로** 답을 다시 풀 재료 (화면은 쓰지 않는다)
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
  // "계산 실수" 오답(보기를 채운 근처 값)을 고른 아이에게도 한 마디 — 이름표별 설명이 없는 오답은 이것을 본다
  if (q && q.solve && !q.solve.whyAny) q.solve.whyAny = c.slip || SLIP;
  return q ? { ...q, key: q.key || cast.key || '' } : q;
}
const SLIP = '한 자리에서 계산이 어긋났어요. 소수점을 맞추고 풀이 단계를 따라 한 자리씩 다시 해 봐요.';

/** 개념 한 편 = ①② (+ 사람이 쓴 ③·⭐가 있으면 더) */
export function makeRound(conceptId, seed, opts) {
  const out = ['calc', 'misread', 'why'].map((k, i) => makeQuestion(conceptId, k, seed + i * 7919, opts));
  const sp = makeQuestion(conceptId, 'special', seed + 3 * 7919, opts);
  if (sp) out.push(sp);
  return out.filter(Boolean);
}

/** 📚 배움 — 사람이 쓴 단계식 배움에 출연진을 끼워 돌려준다 */
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

/** 📏 진단 5문제 — 사다리에서 고르게 */
export function diagnosticSet(seed, n = 5, opts) {
  return diagnosticOf(DECIMAL, makeQuestion, seed, n, opts);
}
export function placeFrom(answers) {
  return placeFromOf(DECIMAL, answers);
}
export function ladder(doneIds) {
  return ladderOf(DECIMAL, doneIds);
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

/**
 * coach/math/decimal.json 형식 검사 — 배포로 실려 가므로 check.mjs가 부른다.
 * @returns {string[]} 문제 목록 (비어 있으면 통과)
 */
export function checkContent(content) {
  const bad = [];
  for (const c of DECIMAL) {
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
      // 정답과 **값**이 같은 오답은 정답이 둘인 문항이 된다 ("0.5"와 "1/2")
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
    // ③ why · ⭐ special 은 분수·음수 줄기와 같은 형식 — checkHuman은 bad에 직접 넣고, 값은 {n, d}로 비교한다
    if (v.why || v.special) checkHuman(c.id, v, bad, fracValue);
  }
  return bad;
}

/** 보기 글자 → {n, d} ("0.75" → 75/100, "3/4", "2") — checkHuman의 "정답과 같은 값" 검사용 */
function fracValue(text) {
  const s = String(text == null ? '' : text).trim();
  const m = /^(\d+)\/(\d+)$/.exec(s);
  if (m) return { n: Number(m[1]), d: Number(m[2]) };
  const x = D(s);
  return x ? { n: x.u, d: P10[x.p] } : null;
}
