// 🔺 수학 — I 다각형의 둘레와 넓이 줄기 (초5 1학기 「다각형의 둘레와 넓이」):
// 개념 사다리 + 문제 생성기 + 내용 형식 검사. 순수 함수만 — 화면 없음 (node 테스트에서 그대로 돈다).
//
// 왜 이 줄기인가 (2026-09-30, 아버님 "「다각형의 둘레와 넓이」 줄기로 하자"): 줄기 일곱 개가 전부 수·식이었다 —
// 도형·측정 칸이 하나도 없었다. 글자 D는 문자와 식 몫, H까지 썼으므로 I.
//
// 오답은 아이가 실제로 하는 틀린 생각 흉내다:
//   · 둘레와 넓이를 바꿔 씀 · 둘레에서 가로·세로를 한 번씩만 더함 · 정다각형 변의 수를 잘못 셈
//   · 모눈에서 가장자리 칸만 셈 · 1 m² = 100 cm² (길이처럼 100배) · ★ **비스듬한 옆변을 높이로** 씀
//   · 삼각형·마름모·사다리꼴에서 ÷ 2를 빠뜨림 · 마름모를 한 변 × 한 변 · 사다리꼴을 윗변 × 아랫변
//   · ㄴ자 모양에서 빈 곳까지 셈 · 모양이 다르면(밑변·높이가 같아도) 넓이가 다르다고 봄
//
// 도형은 **문제 글 속 그림 지시문**([rect 8x5 m] [para 10 4 3] …, mathdraw.js) — 🔁 열쇠·❓ 복사문·테스트가 글에서 읽는다.
// 비스듬한 변은 3·4·5 / 6·8·10 / 5·12·13 / 9·12·15로만 — 그림에 적힌 옆변 길이가 실제 길이와 같다.
//
// ★ 답은 테스트가 그림 지시문에서 **꼭짓점을 따로 세워** 넓이(신발끈 공식)·둘레(변 길이 합)를 다시 구해 대조한다.

import { figureSvg } from './mathdraw.js';
import { rng, shuffle, fill, castOf, worldPick, ask, solve, int, pick, pickFamily, humanQuestion, checkHuman, diagnosticOf, placeFromOf, ladderOf, josa, numJosa } from './mathgen.js';
import { gradeLabel, valueOf as numValue } from './mathmix.js';

export { gradeLabel };

// ───────────────────── 글자 ─────────────────────

/** 보기 글자 → 값 (겹침 검사용). 문장 보기는 null */
export function valueOf(text) {
  const s = String(text == null ? '' : text).trim();
  if (/[가-힣㉮㉯]/.test(s.replace(/(개|칸|번째)$/, ''))) return null;
  return numValue(s.replace(/ ?(cm²|m²|km²|cm|m|km)$/, ''));
}
const sameValue = (a, b) => a !== null && b !== null && Math.abs(a - b) < 1e-9;

const BAT = new Set(['0', '1', '3', '6', '7', '8']);
const lastDigit = (t) => String(t).replace(/\D+$/, '').slice(-1);
/** 수 글자 + 조사 (이/가·을/를·은/는·이에요/예요…) */
function jn(t, withB, without) {
  const s = String(t);
  return s + (BAT.has(lastDigit(s)) ? withB : without);
}
/** 수 글자 + (으)로 — ㄹ받침(1·7·8) 뒤에는 '로' */
function ro(t) {
  const s = String(t);
  return s + numJosa(Number(lastDigit(s)), '으로', '로');
}
/** 낱말 + 조사 */
const jw = (w, a, b) => w + josa(w, a, b);

// ───────────────────── 보기 ─────────────────────

function nearOf(answer, k) {
  const v = Number(answer); const st = [1, -1, 2, -2, 4, -4, 10, -10][k % 8];
  return Number.isInteger(v) && v + st > 0 ? String(v + st) : '';
}
/** 수 보기 4개 — 정답 + 오개념 오답. 자연수만, 글자·값이 같으면 하나로 */
function choices(r, answer, wrongs) {
  const list = [{ text: String(answer), ok: true }];
  const vals = [valueOf(answer)];
  const seen = new Set([String(answer)]);
  const dup = (t) => { const v = valueOf(t); return seen.has(String(t)) || (v !== null && vals.some((x) => sameValue(x, v))); };
  const add = (t, tag) => { seen.add(String(t)); vals.push(valueOf(t)); list.push({ text: String(t), ok: false, tag }); };
  for (const w of wrongs) {
    if (!w || w.text === undefined || w.text === '' || !Number.isInteger(Number(w.text)) || Number(w.text) <= 0 || dup(w.text) || list.length >= 4) continue;
    add(w.text, w.tag);
  }
  for (let k = 0; list.length < 4 && k < 30; k++) {
    const alt = nearOf(answer, k);
    if (alt && !dup(alt)) add(alt, '계산 실수');
  }
  return shuffle(r, list);
}
/** 문장 보기 — 근처 수로 채우지 않는다 */
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
/** ② 갈래 — 요청(want)을 먼저 (Codex 12차 P1, 다른 줄기와 같은 규칙) */
function branchOf(r, c, names) {
  const want = c && c.want && c.want.startsWith('misread:') ? c.want.slice(8) : '';
  if (names.includes(want)) return want;
  const fresh = names.filter((n) => !(c && c.recent && c.recent.includes(`misread:${n}`)));
  return pick(r, fresh.length ? fresh : names);
}
/** 요청한 틀(want)에 든 도형 이름을 다시 고른다 — 무작위로 새로 뽑으면 🔁 쌍둥이가 다른 틀로 간다 */
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

/** 이 줄기의 오개념 이름표 (📊·🤔 노트에 그대로 뜬다) */
export const TAGS = {
  halfPerim: '가로와 세로를 한 번씩만 더함',     // 직사각형 둘레 = 가로 + 세로
  areaForPerim: '둘레를 물었는데 넓이를 구함',
  perimForArea: '넓이를 물었는데 둘레를 구함',
  sidesWrong: '변의 수를 잘못 셈',                // 정육각형 × 5
  addForMul: '곱하지 않고 더함',
  edgeOnly: '가장자리 칸만 셈',
  cutIgnored: '빈 곳까지 셈',
  cutAdd: '빈 곳을 더함',
  edgesMissed: '안쪽으로 꺾인 변을 빠뜨림',        // ㄴ자 둘레에서 떼어 낸 곳의 두 변
  lengthFactor: '넓이 단위를 길이 단위처럼 바꿈',   // 1 m² = 100 cm² · 1 km² = 1000 m²
  zeros: '0의 개수를 잘못 셈',
  noConvert: '단위를 바꾸지 않음',
  slantAsHeight: '비스듬한 옆변을 높이로 씀',
  halfWrong: '÷ 2를 괜히 붙임',                   // 평행사변형에 ÷ 2
  noHalf: '÷ 2를 빠뜨림',
  sideSquared: '한 변 × 한 변으로 셈',            // 마름모
  topTimesBottom: '윗변 × 아랫변으로 셈',         // 사다리꼴
  oneBase: '한 밑변만 씀',
  shapeBigger: '모양이 다르면 넓이도 다르다고 봄',  // 밑변·높이가 같은 평행사변형·삼각형
  cantCompare: '모양이 다르면 비교할 수 없다고 봄',
  wrongInverse: '거꾸로 할 때 다른 셈을 함',       // 넓이 48, 가로 8 → 48 − 8
  noInverse: '거꾸로 할 때 같은 셈을 함',          // 48 × 8
};

// ───────────────────── 도형 재료 ─────────────────────

/** 비스듬한 변 — [가로로 어긋난 만큼, 높이, 옆변] (세 변이 정수인 직각삼각형: 그림 속 옆변 길이가 참이 된다) */
const TRIPLES = [[3, 4, 5], [4, 3, 5], [6, 8, 10], [8, 6, 10], [5, 12, 13], [12, 5, 13], [9, 12, 15], [12, 9, 15]];
/** 정다각형 — 이름이 틀 글에 들어가므로 🔁 쌍둥이는 pickFor로 같은 이름을 다시 고른다 */
const POLY = [
  { n: 3, name: '정삼각형' }, { n: 4, name: '정사각형' }, { n: 5, name: '정오각형' },
  { n: 6, name: '정육각형' }, { n: 7, name: '정칠각형' }, { n: 8, name: '정팔각형' },
];
const polyFor = (r, c, list = POLY) => pickFor(r, c, list, (P, w) => w.includes(P.name));

/** 가로 ≠ 세로인 직사각형 */
function rectWH(r, wLo, wHi, hLo, hHi) {
  let W = int(r, wLo, wHi); let H = int(r, hLo, hHi);
  if (H === W) H = H > hLo ? H - 1 : H + 1;
  // 3 × 6·6 × 3은 넓이 18 = 둘레 18 — "둘레는 3 × 6" 같은 틀린 방법이 우연히 맞는 값이 된다
  if (W * H === 2 * (W + H)) W += 1;
  return [W, H];
}
/** 평행사변형 — 옆변이 정수(세 수), 밑변은 어긋남보다 크고 옆변과 다르다 (같으면 마름모) */
function paraPick(r) {
  const [s, h, sl] = pick(r, TRIPLES);
  let b = int(r, Math.max(s + 1, 6), 20);
  if (b === sl) b = b < 20 ? b + 1 : b - 1;
  // 10 × 3과 (10 + 5) × 2처럼 넓이 = 둘레면 "둘레를 구함" 보기가 우연히 맞는 값이 된다
  if (b * h === 2 * (b + sl)) b = b < 20 ? b + 1 : b - 1;
  return { b, h, s, sl };
}
/** 삼각형 — 꼭짓점이 밑변 위(0 < p < b), 왼쪽 옆변이 정수, 넓이가 자연수 (밑변 × 높이가 짝수) */
function triPick(r) {
  const [p, h, sl] = pick(r, TRIPLES);
  let b = int(r, p + 1, 20);
  if ((b * h) % 2) b = b < 20 ? b + 1 : b - 1;
  if (b <= p) b = p + 2; // p + 1이 20을 넘어 줄였을 때
  // 4 × 4 ÷ 2 = 4 + 4처럼 넓이 = 밑변 + 높이면 "더함" 보기가 우연히 맞는 값 (3·6, 6·3도)
  if ((b * h) / 2 === b + h) b += 2;
  return { b, h, p, sl };
}
/** 마름모 — 대각선 절반이 세 수의 두 변 → 한 변이 정수 */
function rhomPick(r) {
  const [a, b, c] = pick(r, TRIPLES);
  return { d1: 2 * a, d2: 2 * b, side: c };
}
/** 사다리꼴 — 옆변은 세 수(또는 직각사다리꼴 s = 0), 윗변이 아랫변 안에, 넓이가 자연수 */
function trapPick(r) {
  // 윗변 × 아랫변이 넓이와 우연히 같으면(5 × 20 = (5 + 20) × 8 ÷ 2) "윗변 × 아랫변" 보기가 맞는 값 → 다시 뽑는다
  for (let k = 0; k < 20; k++) { const z = trapOnce(r); if (z.a * z.b !== ((z.a + z.b) * z.h) / 2) return z; }
  return { a: 3, b: 10, h: 4, s: 3, sl: 5 };
}
function trapOnce(r) {
  let s; let h; let sl;
  if (r() < 0.3) { s = 0; h = int(r, 3, 12); sl = h; } else [s, h, sl] = pick(r, TRIPLES.filter((t) => t[0] <= 9));
  const a = int(r, 2, 10);
  let b = int(r, s + a + 1, Math.max(s + a + 1, 20));
  if (((a + b) * h) % 2) b = b + 1 <= 20 ? b + 1 : b - 1;
  if (b < s + a + 1) b = s + a + 2; // 짝 맞추다 너무 작아졌을 때 (a + b가 홀수면 h가 짝수라 괜찮다)
  return { a, b, h, s, sl };
}

// ───────────────────── 문항 마무리 ─────────────────────

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

// ───────────────────── 개념 사다리 (I. 다각형의 둘레와 넓이 줄기) ─────────────────────

export const AREA = [
  {
    id: 'are.perimeter', grade: 5, name: '다각형의 둘레', needs: [],
    idea: '**둘레**는 도형을 한 바퀴 도는 길이 — 모든 변의 길이를 더해요. 직사각형은 **(가로 + 세로) × 2**, 정다각형은 **한 변 × 변의 수**.',
    slip: '변이 몇 개인지 먼저 세고, 모든 변을 빠짐없이 더해 봐요.',
    calc(r, c) {
      const [W, H] = rectWH(r, 3, 15, 2, 12);
      const P = polyFor(r, c); const s = int(r, 2, 15);
      const fams = [
        { ans: String(2 * (W + H)), wr: [{ text: String(W + H), tag: TAGS.halfPerim }, { text: String(W * H), tag: TAGS.areaForPerim }],
          why: {
            [TAGS.halfPerim]: '가로와 세로를 한 번씩만 더했어요. 직사각형은 변이 4개 — 가로도 2개, 세로도 2개예요.',
            // "넓이"는 I2에서 처음 배운다 — 여기서는 그 말을 쓰지 않는다 (14차 교훈: 아직 안 배운 말)
            [TAGS.areaForPerim]: `${W} × ${jn(H, '은', '는')} 둘레가 아니에요. 둘레는 곱하지 않고 변의 길이를 모두 더해요.`,
          },
          steps: ['직사각형은 가로가 2개, 세로가 2개', `(${W} + ${H}) × 2 = ${W + H} × 2 = ${2 * (W + H)}`],
          rule: '직사각형의 둘레 = (가로 + 세로) × 2.',
          pools: { pokemon: [
            `{mon/이/가} 직사각형 모양 배틀 필드의 둘레를 따라 한 바퀴 달려요.\n\n[rect ${W}x${H} m]\n\n배틀 필드의 둘레는 몇 m일까요?`,
            `{mon/이/가} 직사각형 모양 텃밭에 울타리를 둘러요.\n\n[rect ${W}x${H} m]\n\n울타리는 모두 몇 m 필요할까요?`,
          ] } },
        { ans: String(P.n * s), wr: [{ text: String((P.n - 1) * s), tag: TAGS.sidesWrong }, { text: String((P.n + 1) * s), tag: TAGS.sidesWrong }, { text: String(P.n + s), tag: TAGS.addForMul }],
          why: {
            [TAGS.sidesWrong]: `${jw(P.name, '은', '는')} 변이 ${P.n}개예요 — 하나씩 세어 봐요.`,
            [TAGS.addForMul]: `한 변 ${s} cm가 ${P.n}개 — 더하기가 아니라 ${s} × ${jn(P.n, '이에요', '예요')}.`,
          },
          steps: [`${jw(P.name, '은', '는')} 변이 ${P.n}개이고 길이가 모두 같아요`, `${s} × ${P.n} = ${P.n * s}`],
          rule: '정다각형의 둘레 = 한 변 × 변의 수.',
          pools: { pokemon: [`${P.name} 모양 배지의 한 변은 ${s} cm예요.\n\n[reg ${P.n} ${s}]\n\n배지의 둘레는 몇 cm일까요?`] } },
      ];
      return finish(this.id, r, c, pickFamily(r, c, fams));
    },
    misread(r, c) {
      if (branchOf(r, c, ['half', 'reg']) === 'half') {
        const [W, H] = rectWH(r, 3, 15, 2, 12);
        return finishMis(this.id, 'half', r, c, {
          q: `직사각형 모양 텃밭이 있어요.\n\n[rect ${W}x${H} m]\n\n${showWork(`텃밭의 둘레는 ${W} + ${H} = ${W + H} m예요`)}`,
          ok: `변은 4개예요 — (${W} + ${H}) × 2 = ${2 * (W + H)} m`,
          wr: [
            { text: '맞게 말했어요', tag: RIGHT_AS_WRONG },
            { text: `둘레는 ${W} × ${H} = ${W * H} m예요`, tag: TAGS.areaForPerim },
            { text: '둘레는 가장 긴 변 하나의 길이예요', tag: OFF },
          ],
          steps: ['가로 2개, 세로 2개를 모두 더해요', `(${W} + ${H}) × 2 = ${2 * (W + H)} m`],
          whyAny: '가로와 세로를 한 번씩만 더했어요. 한 바퀴를 돌면 가로도 세로도 두 번씩 지나요.',
          rule: '직사각형의 둘레 = (가로 + 세로) × 2.',
          probe: { rect: [W, H], ask: 'perim', shown: W + H },
        });
      }
      const P = polyFor(r, c, POLY.filter((x) => x.n >= 5)); const s = int(r, 2, 15);
      return finishMis(this.id, 'reg', r, c, {
        q: `${P.name} 모양 배지가 있어요.\n\n[reg ${P.n} ${s}]\n\n${showWork(`배지의 둘레는 ${s} × ${P.n - 1} = ${s * (P.n - 1)} cm예요`)}`,
        ok: `변은 ${P.n}개예요 — ${s} × ${P.n} = ${s * P.n} cm`,
        wr: [
          { text: '맞게 말했어요', tag: RIGHT_AS_WRONG },
          { text: `${s} + ${P.n} = ${s + P.n} cm예요`, tag: TAGS.addForMul },
          { text: '정다각형은 둘레를 구할 수 없어요', tag: OFF },
        ],
        steps: [`${jw(P.name, '은', '는')} 변이 ${P.n}개`, `${s} × ${P.n} = ${s * P.n} cm`],
        whyAny: `변을 하나 덜 셌어요. ${jw(P.name, '은', '는')} 변이 ${P.n}개예요.`,
        rule: '정다각형의 둘레 = 한 변 × 변의 수.',
        probe: { reg: [P.n, s], ask: 'perim', shown: s * (P.n - 1) },
      });
    },
  },

  {
    id: 'are.unit', grade: 5, name: '넓이의 뜻과 1 cm²', needs: ['are.perimeter'],
    idea: '**넓이**는 평면을 덮은 크기예요. 한 변이 1 cm인 정사각형의 넓이가 **1 cm²** — 모눈 한 칸이 몇 개인지 세면 넓이예요. 가장자리만 세면 안 돼요.',
    slip: '색칠한 칸을 줄마다 세어서 모두 더해 봐요.',
    calc(r, c) {
      let W = int(r, 3, 8); const H = int(r, 3, 6); if (W * H === 2 * (W + H)) W += 1; // 6 × 3·4 × 4: 넓이 = 둘레
      const W2 = int(r, 4, 8); const H2 = int(r, 3, 6); const w = int(r, 1, W2 - 2); const h = int(r, 1, H2 - 2);
      const fams = [
        { ans: String(W * H), wr: [{ text: String(2 * (W + H) - 4), tag: TAGS.edgeOnly }, { text: String(2 * (W + H)), tag: TAGS.perimForArea }, { text: String(W + H), tag: TAGS.addForMul }],
          why: {
            [TAGS.edgeOnly]: '가장자리 칸만 셌어요. 안쪽 칸도 모두 덮여 있어요.',
            [TAGS.perimForArea]: `${2 * (W + H)} cm는 둘레예요. 넓이는 칸의 수예요.`,
            [TAGS.addForMul]: `가로 ${W}칸이 ${H}줄 — 더하기가 아니라 ${W} × ${jn(H, '이에요', '예요')}.`,
          },
          steps: [`가로 ${W}칸이 ${H}줄`, `${W} × ${H} = ${W * H}칸 → ${W * H} cm²`],
          rule: '넓이 = 1 cm² 칸이 몇 개인지.',
          pools: { pokemon: [`모눈 한 칸의 넓이는 1 cm²예요.\n\n[grid ${W}x${H}]\n\n색칠한 직사각형의 넓이는 몇 cm²일까요?`] } },
        { ans: String(W2 * H2 - w * h), wr: [{ text: String(W2 * H2), tag: TAGS.cutIgnored }, { text: String(2 * (W2 + H2)), tag: TAGS.perimForArea }],
          why: {
            [TAGS.cutIgnored]: `빈 곳 ${w} × ${h} = ${w * h}칸까지 셌어요. 색칠한 칸만 세요.`,
            [TAGS.perimForArea]: `${2 * (W2 + H2)} cm는 둘레예요. 넓이는 칸의 수예요.`,
          },
          steps: [`큰 직사각형 ${W2} × ${H2} = ${W2 * H2}칸`, `빈 곳 ${w} × ${h} = ${w * h}칸을 빼요: ${W2 * H2} − ${w * h} = ${W2 * H2 - w * h} → ${W2 * H2 - w * h} cm²`],
          rule: '넓이 = 색칠한 1 cm² 칸의 수 — 큰 직사각형에서 빈 곳을 빼도 돼요.',
          pools: { pokemon: [`모눈 한 칸의 넓이는 1 cm²예요.\n\n[grid ${W2}x${H2} -${w}x${h}]\n\n색칠한 모양의 넓이는 몇 cm²일까요?`] } },
      ];
      return finish(this.id, r, c, pickFamily(r, c, fams));
    },
    misread(r, c) {
      let W = int(r, 4, 8); const H = int(r, 3, 6); if (W * H === 2 * (W + H)) W += 1; // 6 × 3·4 × 4: "둘레를 재서" 보기가 우연히 맞는 값
      if (branchOf(r, c, ['edge', 'unit']) === 'edge') {
        const e = 2 * (W + H) - 4;
        return finishMis(this.id, 'edge', r, c, {
          q: `모눈 한 칸의 넓이는 1 cm²예요.\n\n[grid ${W}x${H}]\n\n${showWork(`가장자리 칸을 세면 ${e}칸이니까 넓이는 ${e} cm²예요`)}`,
          ok: `안쪽 칸까지 모두 세요 — ${W} × ${H} = ${W * H} cm²`,
          wr: [
            { text: '맞게 말했어요', tag: RIGHT_AS_WRONG },
            { text: `가로와 세로를 더해서 ${W} + ${H} = ${W + H} cm²예요`, tag: TAGS.addForMul },
            { text: '모눈 칸은 넓이와 상관없어요', tag: OFF },
          ],
          steps: [`가로 ${W}칸이 ${H}줄`, `${W} × ${H} = ${W * H} cm²`],
          whyAny: '가장자리만 셌어요. 넓이는 덮은 칸 전부예요.',
          rule: '넓이 = 1 cm² 칸이 몇 개인지.',
          probe: { grid: [W, H], ask: 'area', shown: e },
        });
      }
      return finishMis(this.id, 'unit', r, c, {
        q: `모눈 한 칸의 넓이는 1 cm²예요.\n\n[grid ${W}x${H}]\n\n${showWork(`한 칸이 1 cm니까 넓이는 ${W * H} cm예요`)}`,
        ok: `넓이의 단위는 cm² — ${W * H} cm²`,
        wr: [
          { text: '맞게 말했어요', tag: RIGHT_AS_WRONG },
          { text: `둘레를 재서 ${2 * (W + H)} cm²예요`, tag: TAGS.perimForArea },
          { text: '넓이에는 단위를 쓰지 않아요', tag: OFF },
        ],
        steps: [`${W} × ${H} = ${W * H}칸`, `한 칸이 1 cm² → ${W * H} cm²`],
        whyAny: 'cm는 길이의 단위예요. 넓이는 1 cm² 칸이 몇 개인지라서 cm²를 써요.',
        rule: '넓이의 단위는 cm² (길이는 cm).',
        probe: { grid: [W, H], ask: 'area', unit: true },
      });
    },
  },

  {
    id: 'are.rect', grade: 5, name: '직사각형·정사각형의 넓이', needs: ['are.unit'],
    idea: '직사각형의 넓이 = **가로 × 세로** (가로 한 줄의 칸 수 × 줄 수). 정사각형은 **한 변 × 한 변**. 둘레와 헷갈리지 않게 — 넓이는 **덮는 칸**이에요.',
    slip: '가로 한 줄에 몇 칸, 몇 줄인지 생각해 봐요.',
    calc(r, c) {
      const [W, H] = rectWH(r, 3, 15, 2, 12);
      const s = int(r, 3, 14);
      const [W3, H3] = rectWH(r, 3, 15, 2, 12); const A3 = W3 * H3;
      const fams = [
        { ans: String(W * H), wr: [{ text: String(2 * (W + H)), tag: TAGS.perimForArea }, { text: String(W + H), tag: TAGS.addForMul }],
          why: {
            [TAGS.perimForArea]: `(${W} + ${H}) × 2는 둘레예요. 넓이는 가로 × 세로예요.`,
            [TAGS.addForMul]: `가로 ${W}칸이 ${H}줄 — ${W} + ${jn(H, '이', '가')} 아니라 ${W} × ${jn(H, '이에요', '예요')}.`,
          },
          steps: [`가로 ${W}, 세로 ${H}`, `${W} × ${H} = ${W * H}`],
          rule: '직사각형의 넓이 = 가로 × 세로.',
          pools: { pokemon: [
            `{mon}의 체육관 바닥은 직사각형이에요.\n\n[rect ${W}x${H} m]\n\n바닥의 넓이는 몇 m²일까요?`,
            `직사각형 모양 배틀 필드예요.\n\n[rect ${W}x${H} m]\n\n배틀 필드의 넓이는 몇 m²일까요?`,
          ] } },
        { ans: String(s * s), wr: [{ text: String(4 * s), tag: TAGS.perimForArea }, { text: String(2 * s), tag: TAGS.addForMul }],
          why: {
            [TAGS.perimForArea]: `${s} × 4는 둘레예요. 넓이는 한 변 × 한 변이에요.`,
            [TAGS.addForMul]: `${s} + ${jn(s, '이', '가')} 아니라 ${s} × ${jn(s, '이에요', '예요')}.`,
          },
          steps: [`정사각형은 가로와 세로가 모두 ${s}`, `${s} × ${s} = ${s * s}`],
          rule: '정사각형의 넓이 = 한 변 × 한 변.',
          pools: { pokemon: [`한 변이 ${s} cm인 정사각형 모양 딱지예요.\n\n[rect ${s}x${s}]\n\n딱지의 넓이는 몇 cm²일까요?`] } },
        { ans: String(H3), wr: [{ text: String(A3 - W3), tag: TAGS.wrongInverse }, { text: String(A3 * W3), tag: TAGS.noInverse }],
          why: {
            [TAGS.wrongInverse]: `가로 × 세로 = ${jn(A3, '이라서', '라서')} 빼기가 아니라 나누기로 되돌려요.`,
            [TAGS.noInverse]: `${A3} × ${jn(W3, '은', '는')} 넓이를 또 곱한 거예요. 거꾸로는 나눠요.`,
          },
          steps: [`${W3} × 세로 = ${A3}`, `세로 = ${A3} ÷ ${W3} = ${H3}`],
          rule: '넓이를 알면 거꾸로: 세로 = 넓이 ÷ 가로.',
          pools: { pokemon: [`넓이가 ${A3} cm²이고 가로가 ${W3} cm인 직사각형이에요.\n\n[rect ${W3}x?${H3}]\n\n세로는 몇 cm일까요?`] } },
      ];
      return finish(this.id, r, c, pickFamily(r, c, fams));
    },
    misread(r, c) {
      if (branchOf(r, c, ['swap', 'square']) === 'swap') {
        const [W, H] = rectWH(r, 3, 15, 2, 12);
        return finishMis(this.id, 'swap', r, c, {
          q: `직사각형 모양 텃밭이 있어요.\n\n[rect ${W}x${H} m]\n\n${showWork(`텃밭의 넓이는 (${W} + ${H}) × 2 = ${2 * (W + H)} m²예요`)}`,
          ok: `그건 둘레예요 — 넓이는 ${W} × ${H} = ${W * H} m²`,
          wr: [
            { text: '맞게 말했어요', tag: RIGHT_AS_WRONG },
            { text: `넓이는 ${W} + ${H} = ${W + H} m²예요`, tag: TAGS.addForMul },
            { text: '넓이는 가로만 재면 돼요', tag: OFF },
          ],
          steps: [`넓이 = 가로 × 세로`, `${W} × ${H} = ${W * H} m²`],
          whyAny: '둘레를 구했어요. 넓이는 텃밭을 덮은 1 m² 칸의 수 — 가로 × 세로예요.',
          rule: '직사각형의 넓이 = 가로 × 세로 (둘레와 다르다).',
          probe: { rect: [W, H], ask: 'area', shown: 2 * (W + H) },
        });
      }
      let s = int(r, 3, 14); if (s === 4) s = 5; // 4 × 4 = 4 × 4 — 둘레와 넓이가 같아진다
      return finishMis(this.id, 'square', r, c, {
        q: `한 변이 ${s} cm인 정사각형이에요.\n\n[rect ${s}x${s}]\n\n${showWork(`넓이는 ${s} × 4 = ${4 * s} cm²예요`)}`,
        ok: `넓이는 한 변 × 한 변 — ${s} × ${s} = ${s * s} cm²`,
        wr: [
          { text: '맞게 말했어요', tag: RIGHT_AS_WRONG },
          { text: `${s} + ${s} = ${2 * s} cm²예요`, tag: TAGS.addForMul },
          { text: '정사각형은 넓이를 구할 수 없어요', tag: OFF },
        ],
        steps: ['정사각형의 넓이 = 한 변 × 한 변', `${s} × ${s} = ${s * s} cm²`],
        whyAny: `${s} × 4는 둘레(변 4개의 길이)예요.`,
        rule: '정사각형의 넓이 = 한 변 × 한 변.',
        probe: { rect: [s, s], ask: 'area', shown: 4 * s },
      });
    },
  },

  {
    id: 'are.units', grade: 5, name: '넓이의 단위 m²·km²', needs: ['are.rect'],
    idea: '1 m = 100 cm라서 1 m² = 100 cm × 100 cm = **10000 cm²**. 1 km = 1000 m라서 1 km² = **1000000 m²**. 넓이 단위는 길이 단위처럼 100배가 **아니에요** — 가로도 세로도 바뀌니까요.',
    slip: '1 m²가 가로 100 cm, 세로 100 cm인 정사각형이라는 걸 떠올려 봐요.',
    calc(r, c) {
      const N = int(r, 2, 9); const M = int(r, 2, 9); const K = int(r, 2, 9);
      const W = int(r, 2, 6); let H = int(r, 2, 5); if (H === W) H = H > 2 ? H - 1 : 3;
      const fams = [
        { ans: String(N * 10000), wr: [{ text: String(N * 100), tag: TAGS.lengthFactor }, { text: String(N * 1000), tag: TAGS.zeros }, { text: String(N * 100000), tag: TAGS.zeros }],
          why: {
            [TAGS.lengthFactor]: '1 m = 100 cm는 길이예요. 넓이는 가로도 세로도 100배 — 1 m² = 10000 cm².',
            [TAGS.zeros]: '0의 개수를 세어 봐요: 1 m² = 10000 cm² (0이 4개).',
          },
          steps: ['1 m² = 100 cm × 100 cm = 10000 cm²', `${N} × 10000 = ${N * 10000} cm²`],
          rule: '1 m² = 10000 cm².',
          pools: { pokemon: [
            `${N} m²는 몇 cm²일까요?`,
            `{mon}의 비밀 기지 바닥은 ${N} m²예요. 이 넓이는 몇 cm²일까요?`,
          ] } },
        { ans: String(M), wr: [{ text: String(M * 100), tag: TAGS.lengthFactor }, { text: String(M * 10), tag: TAGS.zeros }],
          why: {
            [TAGS.lengthFactor]: '100 cm = 1 m는 길이예요. 넓이는 10000 cm² = 1 m².',
            [TAGS.zeros]: '0의 개수를 세어 봐요: 10000 cm² = 1 m² (0이 4개).',
          },
          steps: ['10000 cm² = 1 m²', `${M * 10000} ÷ 10000 = ${M} m²`],
          rule: '10000 cm² = 1 m².',
          pools: { pokemon: [`${M * 10000} cm²는 몇 m²일까요?`] } },
        { ans: String(K * 1000000), wr: [{ text: String(K * 1000), tag: TAGS.lengthFactor }, { text: String(K * 10000), tag: TAGS.zeros }],
          why: {
            [TAGS.lengthFactor]: '1 km = 1000 m는 길이예요. 넓이는 가로도 세로도 1000배 — 1 km² = 1000000 m².',
            [TAGS.zeros]: '0의 개수를 세어 봐요: 1 km² = 1000000 m² (0이 6개).',
          },
          steps: ['1 km² = 1000 m × 1000 m = 1000000 m²', `${K} × 1000000 = ${K * 1000000} m²`],
          rule: '1 km² = 1000000 m².',
          pools: { pokemon: [`${K} km²는 몇 m²일까요?`] } },
        { ans: String(W * H * 10000), wr: [{ text: String(W * H * 100), tag: TAGS.lengthFactor }, { text: String(W * H), tag: TAGS.noConvert }],
          why: {
            [TAGS.lengthFactor]: `${W * H} m²를 cm²로 바꿀 때는 100배가 아니라 10000배예요.`,
            [TAGS.noConvert]: `${W} × ${H} = ${jn(W * H, '은', '는')} m² 단위예요. 물은 건 cm²예요.`,
          },
          steps: [`${W} × ${H} = ${W * H} m²`, `${W * H} m² = ${W * H} × 10000 = ${W * H * 10000} cm²`],
          rule: '넓이를 구한 다음 1 m² = 10000 cm²로 바꾼다.',
          pools: { pokemon: [`직사각형 모양 매트예요.\n\n[rect ${W}x${H} m]\n\n매트의 넓이는 몇 cm²일까요?`] } },
      ];
      return finish(this.id, r, c, pickFamily(r, c, fams));
    },
    misread(r, c) {
      const N = int(r, 2, 9);
      if (branchOf(r, c, ['hundred', 'km']) === 'hundred') {
        return finishMis(this.id, 'hundred', r, c, {
          q: `${N} m²를 cm²로 바꿨어요.\n\n${showWork(`1 m = 100 cm니까 ${N} m² = ${N * 100} cm²예요`)}`,
          ok: `1 m² = 100 cm × 100 cm = 10000 cm²예요 — ${N * 10000} cm²`,
          wr: [
            { text: '맞게 말했어요', tag: RIGHT_AS_WRONG },
            { text: `${N} m² = ${N * 1000} cm²예요`, tag: TAGS.zeros },
            { text: 'm²는 cm²로 바꿀 수 없어요', tag: OFF },
          ],
          steps: ['1 m² = 100 cm × 100 cm = 10000 cm²', `${N} × 10000 = ${N * 10000} cm²`],
          whyAny: '길이처럼 100배만 했어요. 넓이는 가로도 세로도 100배라서 10000배예요.',
          rule: '1 m² = 10000 cm².',
          probe: { conv: [N, 10000], shown: N * 100 },
        });
      }
      return finishMis(this.id, 'km', r, c, {
        q: `${N} km²를 m²로 바꿨어요.\n\n${showWork(`1 km = 1000 m니까 ${N} km² = ${N * 1000} m²예요`)}`,
        ok: `1 km² = 1000 m × 1000 m = 1000000 m²예요 — ${N * 1000000} m²`,
        wr: [
          { text: '맞게 말했어요', tag: RIGHT_AS_WRONG },
          { text: `${N} km² = ${N * 10000} m²예요`, tag: TAGS.zeros },
          { text: 'km²는 m²로 바꿀 수 없어요', tag: OFF },
        ],
        steps: ['1 km² = 1000 m × 1000 m = 1000000 m²', `${N} × 1000000 = ${N * 1000000} m²`],
        whyAny: '길이처럼 1000배만 했어요. 넓이는 가로도 세로도 1000배라서 1000000배예요.',
        rule: '1 km² = 1000000 m².',
        probe: { conv: [N, 1000000], shown: N * 1000 },
      });
    },
  },

  {
    id: 'are.para', grade: 5, name: '평행사변형의 넓이', needs: ['are.units'],
    idea: '평행사변형은 한쪽 삼각형을 잘라 반대편에 붙이면 직사각형이 돼요 → 넓이 = **밑변 × 높이**. 높이는 밑변과 **직각인 점선** — 비스듬한 옆변이 아니에요.',
    slip: '밑변과 직각으로 만나는 선(점선)이 높이예요.',
    calc(r, c) {
      const Q = paraPick(r);
      // 넓이 비교: 밑변·높이가 같고 기울기만 다른 둘
      // s1이 0이면 그냥 직사각형이 된다
      const b2 = int(r, 6, 14); const h2 = int(r, 3, 9); const s1 = int(r, 1, 3); let s2 = int(r, 4, b2 - 1); if (s2 === s1) s2 = s1 + 2;
      const fams = [
        { ans: String(Q.b * Q.h), wr: [{ text: String(Q.b * Q.sl), tag: TAGS.slantAsHeight }, { text: String(2 * (Q.b + Q.sl)), tag: TAGS.perimForArea }, (Q.b * Q.h) % 2 ? null : { text: String((Q.b * Q.h) / 2), tag: TAGS.halfWrong }],
          why: {
            [TAGS.slantAsHeight]: `${Q.sl} cm는 비스듬한 옆변이에요. 높이는 밑변과 직각인 점선 ${jn(Q.h, '이에요', '예요')}.`,
            [TAGS.perimForArea]: `(${Q.b} + ${Q.sl}) × 2는 둘레예요.`,
            [TAGS.halfWrong]: '평행사변형은 잘라 붙이면 직사각형 그대로라서 ÷ 2를 하지 않아요.', // 삼각형 넓이(I6)는 아직 안 배웠다
          },
          steps: [`높이는 밑변과 직각인 점선: ${Q.h}`, `밑변 × 높이 = ${Q.b} × ${Q.h} = ${Q.b * Q.h}`],
          rule: '평행사변형의 넓이 = 밑변 × 높이 (높이는 밑변과 직각).',
          pools: { pokemon: [
            `평행사변형 모양의 {mon} 배지예요.\n\n[para ${Q.b} ${Q.h} ${Q.s}]\n\n배지의 넓이는 몇 cm²일까요?`,
            `평행사변형 모양 스티커예요.\n\n[para ${Q.b} ${Q.h} ${Q.s}]\n\n스티커의 넓이는 몇 cm²일까요?`,
          ] } },
        { words: true, ans: '㉮와 ㉯의 넓이는 같아요', wr: [
            { text: '㉮의 넓이가 더 넓어요', tag: TAGS.shapeBigger },
            { text: '㉯의 넓이가 더 넓어요', tag: TAGS.shapeBigger },
            { text: '모양이 달라서 비교할 수 없어요', tag: TAGS.cantCompare }],
          why: {
            [TAGS.shapeBigger]: `둘 다 밑변 ${b2} cm, 높이 ${h2} cm — 넓이가 ${b2} × ${h2} = ${b2 * h2} cm²로 같아요.`,
            [TAGS.cantCompare]: '모양이 달라도 넓이는 수로 비교할 수 있어요 — 밑변 × 높이를 구해 봐요.',
          },
          steps: [`㉮: ${b2} × ${h2} = ${b2 * h2}`, `㉯: ${b2} × ${h2} = ${b2 * h2} → ㉮와 ㉯의 넓이는 같아요`],
          rule: '밑변과 높이가 같으면 모양이 달라도 평행사변형의 넓이는 같다.',
          pools: { pokemon: [`두 평행사변형 ㉮와 ㉯의 넓이를 비교하려고 해요.\n\n㉮ [para ${b2} ${h2} ${s1}]\n\n㉯ [para ${b2} ${h2} ${s2}]\n\n바르게 말한 것은 어느 것일까요?`] } },
      ];
      return finish(this.id, r, c, pickFamily(r, c, fams));
    },
    misread(r, c) {
      const Q = paraPick(r);
      return finishMis(this.id, 'slant', r, c, {
        q: `평행사변형이 있어요.\n\n[para ${Q.b} ${Q.h} ${Q.s}]\n\n${showWork(`밑변이 ${Q.b} cm, 옆변이 ${Q.sl} cm니까 넓이는 ${Q.b} × ${Q.sl} = ${Q.b * Q.sl} cm²예요`)}`,
        ok: `높이는 밑변과 직각인 점선이에요 — ${Q.b} × ${Q.h} = ${Q.b * Q.h} cm²`,
        wr: [
          { text: '맞게 말했어요', tag: RIGHT_AS_WRONG },
          { text: `(${Q.b} + ${Q.sl}) × 2 = ${2 * (Q.b + Q.sl)} cm²예요`, tag: TAGS.perimForArea },
          { text: '평행사변형은 넓이를 구할 수 없어요', tag: OFF },
        ],
        steps: [`높이는 점선 ${Q.h} cm`, `${Q.b} × ${Q.h} = ${Q.b * Q.h} cm²`],
        whyAny: '비스듬한 옆변을 높이로 썼어요. 잘라 붙인 직사각형의 세로는 점선(높이)이에요.',
        rule: '평행사변형의 넓이 = 밑변 × 높이 (높이는 밑변과 직각).',
        probe: { para: [Q.b, Q.h, Q.s], ask: 'area', shown: Q.b * Q.sl },
      });
    },
  },

  {
    id: 'are.tri', grade: 5, name: '삼각형의 넓이', needs: ['are.para'],
    idea: '똑같은 삼각형 두 개를 붙이면 평행사변형 → 삼각형 넓이 = **밑변 × 높이 ÷ 2**. 높이는 꼭짓점에서 밑변에 **직각으로** 내린 점선이에요.',
    slip: '같은 삼각형 두 개로 평행사변형을 만든다고 생각해 봐요.',
    calc(r, c) {
      const T = triPick(r);
      let b2 = int(r, 6, 16); const h2 = int(r, 3, 10); if ((b2 * h2) % 2) b2 += 1;
      const p1 = int(r, 1, Math.floor(b2 / 2)); let p2 = int(r, Math.ceil(b2 / 2) + 1, b2 - 1); if (p2 === p1) p2 = p1 + 1;
      const fams = [
        { ans: String((T.b * T.h) / 2), wr: [{ text: String(T.b * T.h), tag: TAGS.noHalf }, (T.b * T.sl) % 2 ? { text: String(T.b * T.sl), tag: TAGS.slantAsHeight } : { text: String((T.b * T.sl) / 2), tag: TAGS.slantAsHeight }],
          why: {
            [TAGS.noHalf]: `${T.b} × ${jn(T.h, '은', '는')} 삼각형 두 개(평행사변형)의 넓이예요. ÷ 2를 해야 해요.`,
            [TAGS.slantAsHeight]: `${T.sl} cm는 비스듬한 옆변이에요. 높이는 꼭짓점에서 직각으로 내린 점선 ${jn(T.h, '이에요', '예요')}.`,
          },
          steps: [`높이는 점선: ${T.h}`, `밑변 × 높이 ÷ 2 = ${T.b} × ${T.h} ÷ 2 = ${(T.b * T.h) / 2}`],
          rule: '삼각형의 넓이 = 밑변 × 높이 ÷ 2.',
          pools: { pokemon: [
            `삼각형 모양 깃발이에요.\n\n[tri ${T.b} ${T.h} ${T.p}]\n\n깃발의 넓이는 몇 cm²일까요?`,
            `{mon}의 삼각형 모양 표지판이에요.\n\n[tri ${T.b} ${T.h} ${T.p}]\n\n표지판의 넓이는 몇 cm²일까요?`,
          ] } },
        { words: true, ans: '㉮와 ㉯의 넓이는 같아요', wr: [
            { text: '㉮의 넓이가 더 넓어요', tag: TAGS.shapeBigger },
            { text: '㉯의 넓이가 더 넓어요', tag: TAGS.shapeBigger },
            { text: '모양이 달라서 비교할 수 없어요', tag: TAGS.cantCompare }],
          why: {
            [TAGS.shapeBigger]: `둘 다 밑변 ${b2} cm, 높이 ${h2} cm — 넓이가 ${b2} × ${h2} ÷ 2 = ${(b2 * h2) / 2} cm²로 같아요.`,
            [TAGS.cantCompare]: '모양이 달라도 넓이는 수로 비교할 수 있어요 — 밑변 × 높이 ÷ 2를 구해 봐요.',
          },
          steps: [`㉮: ${b2} × ${h2} ÷ 2 = ${(b2 * h2) / 2}`, `㉯: ${b2} × ${h2} ÷ 2 = ${(b2 * h2) / 2} → ㉮와 ㉯의 넓이는 같아요`],
          rule: '밑변과 높이가 같으면 모양이 달라도 삼각형의 넓이는 같다.',
          pools: { pokemon: [`두 삼각형 ㉮와 ㉯의 넓이를 비교하려고 해요.\n\n㉮ [tri ${b2} ${h2} ${p1}]\n\n㉯ [tri ${b2} ${h2} ${p2}]\n\n바르게 말한 것은 어느 것일까요?`] } },
      ];
      return finish(this.id, r, c, pickFamily(r, c, fams));
    },
    misread(r, c) {
      const T = triPick(r);
      return finishMis(this.id, 'half', r, c, {
        q: `삼각형이 있어요.\n\n[tri ${T.b} ${T.h} ${T.p}]\n\n${showWork(`밑변이 ${T.b} cm, 높이가 ${T.h} cm니까 넓이는 ${T.b} × ${T.h} = ${T.b * T.h} cm²예요`)}`,
        ok: `삼각형은 같은 평행사변형의 반이에요 — ${T.b} × ${T.h} ÷ 2 = ${(T.b * T.h) / 2} cm²`,
        wr: [
          { text: '맞게 말했어요', tag: RIGHT_AS_WRONG },
          { text: `${T.b} + ${T.h} = ${T.b + T.h} cm²예요`, tag: TAGS.addForMul },
          { text: '삼각형은 세 변을 모두 곱해요', tag: OFF },
        ],
        steps: ['같은 삼각형 두 개 = 평행사변형', `${T.b} × ${T.h} ÷ 2 = ${(T.b * T.h) / 2} cm²`],
        whyAny: '÷ 2를 빠뜨렸어요. 밑변 × 높이는 삼각형 두 개(평행사변형)의 넓이예요.',
        rule: '삼각형의 넓이 = 밑변 × 높이 ÷ 2.',
        probe: { tri: [T.b, T.h, T.p], ask: 'area', shown: T.b * T.h },
      });
    },
  },

  {
    id: 'are.rhom', grade: 5, name: '마름모의 넓이', needs: ['are.tri'],
    idea: '마름모를 꼭 맞게 둘러싼 직사각형은 가로·세로가 두 **대각선** → 마름모는 그 반: **대각선 × 대각선 ÷ 2**.',
    slip: '마름모를 둘러싼 직사각형을 그려 보고, 마름모가 그 몇 분의 몇인지 봐요.',
    calc(r, c) {
      const R = rhomPick(r);
      const e1 = 2 * int(r, 2, 10); let e2 = 2 * int(r, 2, 10); if (e2 === e1) e2 = e1 === 20 ? 16 : e1 + 2; // 같으면 정사각형
      const A2 = (e1 * e2) / 2;
      const fams = [
        { ans: String((R.d1 * R.d2) / 2), wr: [{ text: String(R.d1 * R.d2), tag: TAGS.noHalf }, { text: String(R.side * R.side), tag: TAGS.sideSquared }],
          why: {
            [TAGS.noHalf]: `${R.d1} × ${jn(R.d2, '은', '는')} 둘러싼 직사각형의 넓이예요. 마름모는 그 반이에요.`,
            [TAGS.sideSquared]: '마름모는 정사각형이 아니라서 한 변 × 한 변이 아니에요. 두 대각선을 써요.',
          },
          steps: [`둘러싼 직사각형: ${R.d1} × ${R.d2} = ${R.d1 * R.d2}`, `마름모는 그 반: ${R.d1} × ${R.d2} ÷ 2 = ${(R.d1 * R.d2) / 2}`],
          rule: '마름모의 넓이 = 대각선 × 대각선 ÷ 2.',
          pools: { pokemon: [`마름모 모양 연이에요.\n\n[rhom ${R.d1} ${R.d2}]\n\n연의 넓이는 몇 cm²일까요?`] } },
        { ans: String(e2), wr: [{ text: String(A2 / e1), tag: TAGS.noHalf }, { text: String(A2 - e1), tag: TAGS.wrongInverse }],
          why: {
            [TAGS.noHalf]: `${A2} ÷ ${jn(e1, '은', '는')} ÷ 2를 되돌리지 않은 거예요. 먼저 × 2를 해요.`,
            [TAGS.wrongInverse]: '곱하고 나눈 것을 되돌릴 때 빼면 안 돼요.',
          },
          steps: [`${e1} × □ ÷ 2 = ${A2} → ${e1} × □ = ${A2 * 2}`, `□ = ${A2 * 2} ÷ ${e1} = ${e2}`],
          rule: '넓이로 대각선을 거꾸로: 넓이 × 2 ÷ 다른 대각선.',
          pools: { pokemon: [`넓이가 ${A2} cm²인 마름모의 한 대각선이 ${e1} cm예요.\n\n[rhom ${e1} ?${e2}]\n\n다른 대각선은 몇 cm일까요?`] } },
      ];
      return finish(this.id, r, c, pickFamily(r, c, fams));
    },
    misread(r, c) {
      const R = rhomPick(r);
      return finishMis(this.id, 'half', r, c, {
        q: `마름모가 있어요.\n\n[rhom ${R.d1} ${R.d2}]\n\n${showWork(`대각선이 ${R.d1} cm, ${R.d2} cm니까 넓이는 ${R.d1} × ${R.d2} = ${R.d1 * R.d2} cm²예요`)}`,
        ok: `마름모는 둘러싼 직사각형의 반이에요 — ${R.d1} × ${R.d2} ÷ 2 = ${(R.d1 * R.d2) / 2} cm²`,
        wr: [
          { text: '맞게 말했어요', tag: RIGHT_AS_WRONG },
          { text: `한 변 × 한 변 = ${R.side} × ${R.side} = ${R.side * R.side} cm²예요`, tag: TAGS.sideSquared },
          { text: '마름모는 넓이를 구할 수 없어요', tag: OFF },
        ],
        steps: [`둘러싼 직사각형 ${R.d1} × ${R.d2} = ${R.d1 * R.d2}`, `그 반: ${(R.d1 * R.d2) / 2} cm²`],
        whyAny: '÷ 2를 빠뜨렸어요. 대각선 × 대각선은 마름모를 둘러싼 직사각형의 넓이예요.',
        rule: '마름모의 넓이 = 대각선 × 대각선 ÷ 2.',
        probe: { rhom: [R.d1, R.d2], ask: 'area', shown: R.d1 * R.d2 },
      });
    },
  },

  {
    id: 'are.trap', grade: 5, name: '사다리꼴의 넓이', needs: ['are.rhom'],
    idea: '똑같은 사다리꼴 두 개를 거꾸로 붙이면 평행사변형(밑변 = 윗변 + 아랫변) → 넓이 = **(윗변 + 아랫변) × 높이 ÷ 2**.',
    slip: '같은 사다리꼴 두 개를 뒤집어 붙인 평행사변형을 떠올려 봐요.',
    calc(r, c) {
      const Z = trapPick(r); const A = ((Z.a + Z.b) * Z.h) / 2;
      const fams = [
        { ans: String(A), wr: [{ text: String((Z.a + Z.b) * Z.h), tag: TAGS.noHalf }, { text: String(Z.a * Z.b), tag: TAGS.topTimesBottom }, (Z.b * Z.h) % 2 ? null : { text: String((Z.b * Z.h) / 2), tag: TAGS.oneBase }],
          why: {
            [TAGS.noHalf]: `(${Z.a} + ${Z.b}) × ${jn(Z.h, '은', '는')} 사다리꼴 두 개(평행사변형)의 넓이예요. ÷ 2를 해요.`,
            [TAGS.topTimesBottom]: '윗변과 아랫변은 곱하지 않고 더해요 — 붙인 평행사변형의 밑변이니까요.',
            [TAGS.oneBase]: `아랫변만 썼어요. 윗변 ${Z.a} m도 더해야 해요.`,
          },
          steps: [`윗변 + 아랫변 = ${Z.a} + ${Z.b} = ${Z.a + Z.b}`, `(${Z.a} + ${Z.b}) × ${Z.h} ÷ 2 = ${A}`],
          rule: '사다리꼴의 넓이 = (윗변 + 아랫변) × 높이 ÷ 2.',
          pools: { pokemon: [
            `사다리꼴 모양 화단이에요.\n\n[trap ${Z.a} ${Z.b} ${Z.h} ${Z.s} m]\n\n화단의 넓이는 몇 m²일까요?`,
            `{mon/이/가} 쉬는 사다리꼴 모양 잔디밭이에요.\n\n[trap ${Z.a} ${Z.b} ${Z.h} ${Z.s} m]\n\n잔디밭의 넓이는 몇 m²일까요?`,
          ] } },
      ];
      return finish(this.id, r, c, pickFamily(r, c, fams));
    },
    misread(r, c) {
      const Z = trapPick(r); const A = ((Z.a + Z.b) * Z.h) / 2;
      return finishMis(this.id, 'mult', r, c, {
        q: `사다리꼴 모양 화단이에요.\n\n[trap ${Z.a} ${Z.b} ${Z.h} ${Z.s} m]\n\n${showWork(`윗변 ${Z.a} m, 아랫변 ${Z.b} m, 높이 ${Z.h} m니까 넓이는 (${Z.a} + ${Z.b}) × ${Z.h} = ${(Z.a + Z.b) * Z.h} m²예요`)}`,
        ok: `같은 사다리꼴 두 개가 평행사변형이에요 — (${Z.a} + ${Z.b}) × ${Z.h} ÷ 2 = ${A} m²`,
        wr: [
          { text: '맞게 말했어요', tag: RIGHT_AS_WRONG },
          { text: `${Z.a} × ${Z.b} = ${Z.a * Z.b} m²예요`, tag: TAGS.topTimesBottom },
          { text: '사다리꼴은 넓이를 구할 수 없어요', tag: OFF },
        ],
        steps: ['사다리꼴 두 개 = 평행사변형', `(${Z.a} + ${Z.b}) × ${Z.h} ÷ 2 = ${A} m²`],
        whyAny: '÷ 2를 빠뜨렸어요. (윗변 + 아랫변) × 높이는 사다리꼴 두 개의 넓이예요.',
        rule: '사다리꼴의 넓이 = (윗변 + 아랫변) × 높이 ÷ 2.',
        probe: { trap: [Z.a, Z.b, Z.h, Z.s], ask: 'area', shown: (Z.a + Z.b) * Z.h },
      });
    },
  },

  {
    id: 'are.use', grade: 5, name: '둘레와 넓이 활용', needs: ['are.trap'],
    idea: '복잡한 모양은 **큰 직사각형에서 빈 곳을 빼거나** 나눠서 더해요. 넓이를 알면 **거꾸로** 높이를 구할 수 있어요 — 삼각형은 × 2를 먼저.',
    slip: '큰 직사각형을 먼저 그리고, 빈 곳이 어디인지 찾아봐요.',
    calc(r, c) {
      const W = int(r, 6, 14); const H = int(r, 5, 12); const w = int(r, 2, W - 3); const h = int(r, 2, H - 3);
      const pb = int(r, 4, 15); const ph = int(r, 3, 12); const pA = pb * ph;
      let tb = int(r, 4, 15); const th = int(r, 3, 12); if ((tb * th) % 2) tb += 1;
      if ((tb * th) / 2 - tb === th) tb += 2; // 넓이 − 밑변이 우연히 높이 (4·4, 6·3 …) — "빼기" 오답이 맞는 값이 된다
      const tA = (tb * th) / 2;
      const fams = [
        { ans: String(W * H - w * h), wr: [{ text: String(W * H), tag: TAGS.cutIgnored }, { text: String(W * H + w * h), tag: TAGS.cutAdd }, { text: String(2 * (W + H)), tag: TAGS.perimForArea }],
          why: {
            [TAGS.cutIgnored]: `빈 곳 ${w} × ${h} = ${w * h} m²까지 셌어요. 빼야 해요.`,
            [TAGS.cutAdd]: '빈 곳은 텃밭이 아니라서 더하지 않고 빼요.',
            [TAGS.perimForArea]: `${2 * (W + H)} m는 둘레예요.`,
          },
          steps: [`큰 직사각형 ${W} × ${H} = ${W * H}`, `빈 곳 ${w} × ${h} = ${jn(w * h, '을', '를')} 빼요: ${W * H} − ${w * h} = ${W * H - w * h}`],
          rule: '큰 직사각형 − 빈 곳.',
          pools: { pokemon: [`ㄴ자 모양 텃밭이에요.\n\n[lshape ${W} ${H} ${w} ${h} m]\n\n텃밭의 넓이는 몇 m²일까요?`] } },
        { ans: String(2 * (W + H)), wr: [{ text: String(2 * (W + H) - w - h), tag: TAGS.edgesMissed }, { text: String(W * H - w * h), tag: TAGS.areaForPerim }],
          why: {
            [TAGS.edgesMissed]: `떼어 낸 곳의 두 변(${w} m, ${h} m)을 빠뜨렸어요. 여섯 변을 모두 더해요.`,
            [TAGS.areaForPerim]: '그건 넓이예요. 울타리는 둘레예요.',
          },
          steps: [`여섯 변: ${W} + ${H - h} + ${w} + ${h} + ${W - w} + ${H}`, `= ${2 * (W + H)} (큰 직사각형의 둘레와 같아요)`],
          rule: 'ㄴ자 모양의 둘레 = 여섯 변을 모두 더한다 (큰 직사각형의 둘레와 같다).',
          pools: { pokemon: [`ㄴ자 모양 텃밭에 울타리를 둘러요.\n\n[lshape ${W} ${H} ${w} ${h} m]\n\n울타리는 모두 몇 m 필요할까요?`] } },
        { ans: String(ph), wr: [{ text: String(pA - pb), tag: TAGS.wrongInverse }, { text: String(pA * pb), tag: TAGS.noInverse }],
          why: {
            [TAGS.wrongInverse]: '밑변 × 높이 = 넓이라서 빼기가 아니라 나누기로 되돌려요.',
            [TAGS.noInverse]: `${pA} × ${jn(pb, '은', '는')} 넓이를 또 곱한 거예요. 나눠요.`,
          },
          steps: [`${pb} × 높이 = ${pA}`, `높이 = ${pA} ÷ ${pb} = ${ph}`],
          rule: '넓이를 알면 거꾸로: 높이 = 넓이 ÷ 밑변.',
          pools: { pokemon: [`넓이가 ${pA} cm²이고 밑변이 ${pb} cm인 평행사변형의 높이는 몇 cm일까요?`] } },
        { ans: String(th), wr: [(tA % tb) ? null : { text: String(tA / tb), tag: TAGS.noHalf }, { text: String(tA - tb), tag: TAGS.wrongInverse }],
          why: {
            [TAGS.noHalf]: '삼각형은 ÷ 2를 했으니까 거꾸로는 × 2를 먼저 해요.',
            [TAGS.wrongInverse]: '곱하고 나눈 것을 되돌릴 때 빼면 안 돼요.',
          },
          steps: [`${tb} × 높이 ÷ 2 = ${tA} → ${tb} × 높이 = ${tA * 2}`, `높이 = ${tA * 2} ÷ ${tb} = ${th}`],
          rule: '삼각형의 높이를 거꾸로: 넓이 × 2 ÷ 밑변.',
          pools: { pokemon: [`넓이가 ${tA} cm²이고 밑변이 ${tb} cm인 삼각형의 높이는 몇 cm일까요?`] } },
      ];
      return finish(this.id, r, c, pickFamily(r, c, fams));
    },
    misread(r, c) {
      if (branchOf(r, c, ['cut', 'inv']) === 'cut') {
        const W = int(r, 6, 14); const H = int(r, 5, 12); const w = int(r, 2, W - 3); const h = int(r, 2, H - 3);
        return finishMis(this.id, 'cut', r, c, {
          q: `ㄴ자 모양 텃밭이에요.\n\n[lshape ${W} ${H} ${w} ${h} m]\n\n${showWork(`넓이는 큰 직사각형 ${W} × ${H} = ${W * H} m²예요`)}`,
          ok: `빈 곳 ${w} × ${h} = ${w * h} m²를 빼요 — ${W * H - w * h} m²`,
          wr: [
            { text: '맞게 말했어요', tag: RIGHT_AS_WRONG },
            { text: `빈 곳을 더해서 ${W * H + w * h} m²예요`, tag: TAGS.cutAdd },
            { text: 'ㄴ자 모양은 넓이를 구할 수 없어요', tag: OFF },
          ],
          steps: [`큰 직사각형 ${W} × ${H} = ${W * H}`, `빈 곳 ${jn(w * h, '을', '를')} 빼요: ${W * H - w * h} m²`],
          whyAny: '떼어 낸 빈 곳까지 셌어요. 텃밭은 빈 곳을 뺀 나머지예요.',
          rule: '큰 직사각형 − 빈 곳.',
          probe: { lshape: [W, H, w, h], ask: 'area', shown: W * H },
        });
      }
      let b = int(r, 4, 15); const h = 2 * int(r, 2, 6); if ((b * h) / 2 - b === h) b += 1; // 8 − 4 = 4처럼 빼기 보기가 우연히 높이
      const A = (b * h) / 2;
      return finishMis(this.id, 'inv', r, c, {
        q: `넓이가 ${A} cm²이고 밑변이 ${b} cm인 삼각형의 높이를 구했어요.\n\n${showWork(`높이는 ${A} ÷ ${b} = ${A / b} cm예요`)}`,
        ok: `삼각형은 ÷ 2를 했으니 × 2를 먼저 — ${A} × 2 ÷ ${b} = ${h} cm`,
        wr: [
          { text: '맞게 말했어요', tag: RIGHT_AS_WRONG },
          { text: `${A} − ${b} = ${A - b} cm예요`, tag: TAGS.wrongInverse },
          { text: '넓이로는 높이를 구할 수 없어요', tag: OFF },
        ],
        steps: [`${b} × 높이 ÷ 2 = ${A}`, `높이 = ${A} × 2 ÷ ${b} = ${h} cm`],
        whyAny: '평행사변형처럼 나누기만 했어요. 삼각형은 ÷ 2가 있어서 × 2를 먼저 해요.',
        rule: '삼각형의 높이를 거꾸로: 넓이 × 2 ÷ 밑변.',
        probe: { triInv: [A, b], shown: A / b },
      });
    },
  },
];

export function conceptById(id) {
  return AREA.find((c) => c.id === id) || null;
}

// ───────────────────── 문항 만들기 (다른 줄기와 같은 모양) ─────────────────────

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
const SLIP = '한 번 더 천천히 — 둘레인지 넓이인지, 높이가 어디인지 먼저 봐요.';

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
  return diagnosticOf(AREA, makeQuestion, seed, n, opts);
}
export function placeFrom(answers) {
  return placeFromOf(AREA, answers);
}
export function ladder(doneIds) {
  return ladderOf(AREA, doneIds);
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
 * coach/math/area.json 형식 검사 — mathcor.checkContent와 같은 규칙
 * @returns {string[]}
 */
export function checkContent(content) {
  const bad = [];
  for (const c of AREA) {
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
