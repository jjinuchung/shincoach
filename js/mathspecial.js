// 💎 스페셜 문제 — "한 번 더 돌아서 생각하는" 문제 (2026-09-26, 아버님 요청)
//
// 왜: 지금 앱 문제는 ① 계산 ② 오개념 ③ 왜 ⭐ 특별인데, 아버님이 문제집(만점왕 수학 플러스 4-2)을 보여 주며
//     "너무 단순한 문제만 있는 것 같다"고 하셨다. 문제집 문제들은 **답까지 두세 걸음**이 있다:
//     거꾸로 생각하기, 카드 골라 가장 큰 식 만들기, 바르게 계산한 것 찾기, 조건에 맞는 수 모두 …
//     그 여덟 가지 얼굴을 여기서 만든다.
//
// 보상은 🏅 **체육관 배지 8개**(아버님 결정) — 유형이 여덟 가지라 원작 관동 8배지와 딱 맞는다.
// 유형 하나를 여러 번 통과하면 그 배지를 얻고, 여덟 개를 다 모으면 큰 것이 열린다.
//
// 규칙:
//   - 답은 **보기 4개 중 하나**. 대신 오답은 찍기 어렵게 "한 걸음 덜 간 값"으로 만든다
//     (그래서 틀린 답이 곧 "어디서 멈췄는지"를 알려 준다 — 기존 ② 오개념과 같은 철학)
//   - 보기끼리 **값이 겹치면 안 된다**(6/36과 1/6 사고) — 값으로 비교해 거른다
//   - 문항 모양은 mathgen과 같다: { concept, kind, q, expr, hint, figure, choices, solve, key }
//     그래야 화면(math.js)이 그대로 그린다
//   - 씨앗(seed)으로 결정적 → 테스트에서 수천 개를 돌려 검산할 수 있다
import { castOf, fill, fracText, gcd, int, josa, mixedText, pick, rng, shuffle, valueOf } from './mathgen.js';

/** 💎 여덟 가지 얼굴 = 🏅 배지 여덟 개 */
export const KINDS = [
  { id: 'reverse', badge: '🏅', ko: '거꾸로 생각하기', gym: '회색 배지', hint: '잘못 계산한 값에서 거꾸로 되짚어 보세요' },
  { id: 'cards', badge: '🏅', ko: '카드 골라 만들기', gym: '파랑 배지', hint: '어떤 카드를 골라야 가장 클까요(작을까요)?' },
  { id: 'findok', badge: '🏅', ko: '바르게 계산한 것 찾기', gym: '주황 배지', hint: '하나씩 직접 계산해서 맞는지 보세요' },
  { id: 'howmany', badge: '🏅', ko: '조건에 맞는 수 모두', gym: '무지개 배지', hint: '1부터 하나씩 넣어 보면 어디까지 되는지 보여요' },
  { id: 'numline', badge: '🏅', ko: '수직선 읽기', gym: '늪 배지', hint: '전체에서 한쪽을 빼면 나머지예요' },
  { id: 'overlap', badge: '🏅', ko: '겹쳐 잇기', gym: '영혼 배지', hint: '겹친 자리는 몇 군데인가요?' },
  { id: 'sumdiff', badge: '🏅', ko: '합과 차로 두 수', gym: '금빛 배지', hint: '큰 수는 (합＋차)의 반이에요' },
  { id: 'pattern', badge: '🏅', ko: '규칙 찾기', gym: '지구 배지', hint: '옆으로 갈 때마다 얼마씩 커지나요?' },
];

export const KIND_IDS = KINDS.map((k) => k.id);
export const kindOf = (id) => KINDS.find((k) => k.id === id) || null;

/** 🏅 배지 하나를 얻으려면 그 얼굴을 몇 번 통과해야 하나 */
export const BADGE_NEED = 3;

// ── 분수 다루기 (분모를 고정한 채 분자만 센다 — 같은 분모끼리의 덧뺄이 4학년 범위다) ──

/** 분자 총합 n(분모 d)을 대분수 글로. 예: (42, 10) → "4 2/10" */
export function say(n, d) {
  const w = Math.floor(n / d);
  const rest = n - w * d;
  if (w === 0) return fracText(rest, d);
  if (rest === 0) return String(w);
  return mixedText(w, rest, d);
}

/**
 * 글을 **기약분수 열쇠**로 (보기끼리 값이 겹치는지 볼 때).
 * ★ mathgen의 valueOf는 숫자가 아니라 `{n, d}` 객체를 준다 — 숫자처럼 쓰면 중복 검사가 조용히 통과하고
 *   곱셈에서는 NaN이 된다(둘 다 실제로 겪었다). 여기서 한 번에 열쇠로 바꿔 쓴다.
 */
function key(text) {
  const v = valueOf(text);
  if (!v || !v.d) return String(text);
  const g = gcd(v.n, v.d) || 1;
  return `${v.n / g}/${v.d / g}`;
}
/** 글을 숫자로 (식을 되짚어 계산할 때) */
function num(text) {
  const v = valueOf(text);
  return v && v.d ? v.n / v.d : NaN;
}

/**
 * 보기 만들기 — 정답 하나 + 오답들. **값이 겹치는 것은 버린다**(6/36과 1/6은 같은 값이다).
 * @param {number} okN 정답 분자
 * @param {Array<{n:number, tag:string}>} wrongs 오답 후보 (앞에서부터 쓴다)
 */
export function choicesOf(r, okN, wrongs, d) {
  const out = [{ text: say(okN, d), ok: true }];
  const seen = new Set([key(say(okN, d))]);
  for (const w of wrongs) {
    if (out.length >= 4) break;
    if (!Number.isFinite(w.n) || w.n <= 0) continue;   // 음수·0은 4학년 범위 밖이라 보기로 쓰지 않는다
    const text = say(w.n, d);
    const k = key(text);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push({ text, ok: false, tag: w.tag });
  }
  // 그래도 4개가 안 차면(오답이 다 겹쳤다) 값을 살짝 흔들어 채운다 — 이름표는 달지 않는다
  let bump = 1;
  while (out.length < 4 && bump < 40) {
    const cand = okN + (bump % 2 ? bump : -bump);
    const text = say(cand, d);
    if (cand > 0 && !seen.has(key(text))) { seen.add(key(text)); out.push({ text, ok: false, tag: '계산 실수' }); }
    bump++;
  }
  return shuffle(r, out);
}

// ── 여덟 가지 얼굴 ──

/**
 * 🔄 거꾸로 생각하기 — "빼야 할 것을 잘못하여 더했더니 ○가 되었습니다. 바르게 계산한 값은?"
 * 두 걸음이다: ① 어떤 수 = 잘못된 값 − 빼야 할 수 ② 바른 값 = 어떤 수 − 빼야 할 수
 * 그래서 한 걸음만 간 값(어떤 수)이 가장 흔한 오답이다.
 */
function reverse(r, cast) {
  const d = pick(r, [5, 6, 7, 8, 9, 10, 12]);
  const b = int(r, d + 1, d * 2 - 1);        // 빼는 수 (1보다 큰 대분수)
  const x = int(r, b * 2 + 1, b * 2 + d * 3); // 어떤 수 (바른 답이 0보다 크게)
  const wrong = x + b;                        // 잘못해서 더한 값
  const ok = x - b;                           // 바르게 뺀 값
  const who = cast.mon || '진우';
  return {
    kind: 'reverse',
    q: `어떤 수에서 ${say(b, d)}${josa(say(b, d), '을', '를')} 빼야 할 것을 ${who}${josa(who, '이', '가')} 잘못하여 더했더니 ${say(wrong, d)}이(가) 되었어요. 바르게 계산한 값은 얼마일까요?`,
    expr: `□ + ${say(b, d)} = ${say(wrong, d)}`,
    hint: '먼저 "어떤 수"를 찾고, 거기서 다시 빼세요 (두 걸음이에요)',
    choices: choicesOf(r, ok, [
      { n: x, tag: '어떤 수에서 멈춤' },
      { n: wrong, tag: '잘못 계산한 값 그대로' },
      { n: wrong + b, tag: '더하기를 한 번 더 함' },
      { n: ok + 1, tag: '계산 실수' },
    ], d),
    solve: {
      steps: [
        `① 더했더니 ${say(wrong, d)}이 됐으니, 어떤 수 = ${say(wrong, d)} − ${say(b, d)} = ${say(x, d)}`,
        `② 바르게 하면 빼야 해요 → ${say(x, d)} − ${say(b, d)} = ${say(ok, d)}`,
        `③ 답: ${say(ok, d)}`,
      ],
      why: {
        '어떤 수에서 멈춤': `${say(x, d)}는 "어떤 수"예요. 문제는 거기서 **한 번 더 빼라**고 했어요.`,
        '잘못 계산한 값 그대로': `${say(wrong, d)}은 잘못 더한 값이에요. 바르게 계산한 값을 물었어요.`,
        '더하기를 한 번 더 함': '빼야 하는데 또 더했어요. 방향이 반대예요.',
      },
    },
    key: 'reverse',
  };
}

/**
 * 🎴 카드 골라 만들기 — 다섯 장 중 세 장을 골라 합이 가장 큰(작은) 덧셈식.
 * "고르는 것"이 먼저고 계산은 나중이다. 아무거나 더하면 틀린다.
 */
function cards(r, cast) {
  const d = pick(r, [8, 9, 10, 12, 15]);
  const set = new Set();
  while (set.size < 5) set.add(int(r, 1, d - 1)); // 진분수 다섯 장
  const list = [...set];
  const big = r() < 0.5;
  const sorted = [...list].sort((a, b) => b - a);
  const okN = (big ? sorted.slice(0, 3) : sorted.slice(-3)).reduce((a, b) => a + b, 0);
  const otherN = (big ? sorted.slice(-3) : sorted.slice(0, 3)).reduce((a, b) => a + b, 0);
  const two = (big ? sorted.slice(0, 2) : sorted.slice(-2)).reduce((a, b) => a + b, 0);
  const all = list.reduce((a, b) => a + b, 0);
  return {
    kind: 'cards',
    q: `분수 카드 ${list.map((n) => fracText(n, d)).join('   ')} 중에서 **3장**을 골라 합이 가장 ${big ? '큰' : '작은'} 덧셈식을 만들면 그 합은 얼마일까요?`,
    expr: list.map((n) => fracText(n, d)).join('  ·  '),
    hint: big ? '가장 큰 세 장을 고르면 돼요' : '가장 작은 세 장을 고르면 돼요',
    choices: choicesOf(r, okN, [
      { n: otherN, tag: big ? '가장 작은 세 장을 고름' : '가장 큰 세 장을 고름' },
      { n: two, tag: '두 장만 더함' },
      { n: all, tag: '다섯 장을 모두 더함' },
      { n: okN + 1, tag: '계산 실수' },
    ], d),
    solve: {
      steps: [
        `① 카드를 큰 순서로: ${sorted.map((n) => fracText(n, d)).join(' > ')}`,
        `② 합이 가장 ${big ? '크려면 큰' : '작으려면 작은'} 것 세 장 → ${(big ? sorted.slice(0, 3) : sorted.slice(-3)).map((n) => fracText(n, d)).join(' + ')}`,
        `③ 답: ${say(okN, d)}`,
      ],
      why: {
        '두 장만 더함': '세 장을 고르라고 했어요. 한 장이 빠졌어요.',
        '다섯 장을 모두 더함': '다섯 장 중 **세 장만** 골라요.',
        '가장 작은 세 장을 고름': '합이 가장 **크게** 하려면 큰 카드를 골라야 해요.',
        '가장 큰 세 장을 고름': '합이 가장 **작게** 하려면 작은 카드를 골라야 해요.',
      },
    },
    key: `cards:${big ? 'big' : 'small'}`,
  };
}

/**
 * 🔍 바르게 계산한 것 찾기 — 식 네 개 중 맞는 것의 기호를 고른다.
 * 하나씩 직접 계산해 봐야 한다. 틀린 식은 흔한 실수로 만든다(받아내림을 잊음 등).
 */
function findok(r, cast) {
  const marks = ['㉠', '㉡', '㉢', '㉣'];
  const d = pick(r, [5, 6, 7, 8, 10, 12]);
  const rows = [];
  const okIdx = [];
  for (let i = 0; i < 4; i++) {
    const a = int(r, d + 2, d * 5);
    const b = int(r, d + 1, a - 1);
    const real = a - b;
    const want = r() < 0.45; // 이 줄을 맞는 식으로 낼까
    let shown = real;
    if (!want) {
      // 틀린 값: 자연수끼리·분수끼리 따로 빼면서 **받아내림을 잊은** 값 (가장 흔한 실수)
      const wa = Math.floor(a / d) - Math.floor(b / d);
      const wb = Math.abs((a % d) - (b % d));
      shown = wa * d + wb;
      // ★ 받아내림이 없는 뺄셈이면 그 "틀린 값"이 **정답과 같아진다** → 맞는 식이 돼 버린다.
      //   (Codex 리뷰가 ② 오개념에서 잡았던 것과 같은 함정 — 주장이 거짓인지 값으로 확인해야 한다)
      if (shown === real || shown <= 0) shown = real + int(r, 1, d - 1);
    }
    // 맞는지는 **플래그가 아니라 실제 값**으로 정한다
    if (shown === real) okIdx.push(i);
    rows.push(`${marks[i]} ${say(a, d)} − ${say(b, d)} = ${say(shown, d)}`);
  }
  // 네 줄이 전부 맞으면 문제가 안 된다 — 마지막 줄을 확실히 틀리게 바꾼다
  if (okIdx.length === 4) {
    const m3 = rows[3].match(/^㉣ (.+) − (.+) = (.+)$/);
    if (m3) {
      const a = Math.round(num(m3[1]) * d);
      const b = Math.round(num(m3[2]) * d);
      rows[3] = `㉣ ${say(a, d)} − ${say(b, d)} = ${say(a - b + int(r, 1, d - 1), d)}`;
      okIdx.pop();
    }
  }
  if (!okIdx.length) { // 맞는 게 하나도 없으면 문제가 안 된다 — 첫 줄을 바른 식으로 고친다
    const m = rows[0].match(/^㉠ (.+) − (.+) = /);
    if (m) {
      const a = Math.round(num(m[1]) * d);
      const b = Math.round(num(m[2]) * d);
      rows[0] = `㉠ ${say(a, d)} − ${say(b, d)} = ${say(a - b, d)}`;
      okIdx.push(0);
    }
  }
  const answer = okIdx.map((i) => marks[i]).join(', ');
  const wrongSets = [
    { text: marks.filter((_, i) => !okIdx.includes(i)).join(', ') || marks[3], tag: '틀린 것을 고름' },
    { text: marks[okIdx[0]], tag: '하나만 보고 멈춤' },
    { text: marks.join(', '), tag: '전부 맞다고 봄' },
  ];
  const out = [{ text: answer, ok: true }];
  const seen = new Set([answer]);
  for (const w of wrongSets) { if (out.length < 4 && !seen.has(w.text)) { seen.add(w.text); out.push({ text: w.text, ok: false, tag: w.tag }); } }
  while (out.length < 4) { const t = marks[out.length] + ', ' + marks[0]; if (!seen.has(t)) { seen.add(t); out.push({ text: t, ok: false, tag: '계산 실수' }); } else break; }
  return {
    kind: 'findok',
    q: '바르게 계산한 식을 **모두** 찾아 기호를 고르세요.',
    expr: rows.join('\n'),
    hint: '하나씩 직접 계산해서 맞는지 확인해 보세요',
    choices: shuffle(r, out),
    solve: {
      steps: [...rows.map((row, i) => `${row} → ${okIdx.includes(i) ? '맞아요' : '틀렸어요'}`), `답: ${answer}`],
      why: {
        '하나만 보고 멈춤': '"모두" 찾으라고 했어요. 맞는 식이 더 있는지 끝까지 보세요.',
        '전부 맞다고 봄': '틀린 식도 섞여 있어요. 하나씩 계산해 봐야 해요.',
        '틀린 것을 고름': '문제는 **바르게** 계산한 식을 물었어요.',
      },
    },
    key: 'findok',
  };
}

/**
 * 🔢 조건에 맞는 수 모두 — "□에 들어갈 수 있는 자연수를 모두 더하면?"
 * 개수를 세는 게 아니라 **합**을 묻는다(문제집도 그렇다). 하나씩 넣어 봐야 한다.
 */
function howmany(r, cast) {
  const d = pick(r, [7, 8, 9, 10, 12]);
  const a = int(r, 1, d - 2);
  const limit = int(r, d + 2, d * 2 - 1); // 오른쪽 값 (1보다 큰 대분수)
  const maxBox = limit - a - 1;           // a/d + □/d < limit/d → □ < limit − a
  if (maxBox < 1) return null;
  const list = [];
  for (let i = 1; i <= maxBox; i++) list.push(i);
  const okN = list.reduce((x, y) => x + y, 0);
  const count = list.length;
  return {
    kind: 'howmany',
    q: `□ 안에 들어갈 수 있는 자연수를 **모두 더하면** 얼마일까요?`,
    expr: `${fracText(a, d)} + □/${d} < ${say(limit, d)}`,
    hint: '□에 1, 2, 3 … 을 넣어 보며 어디까지 되는지 찾으세요',
    choices: shuffle(r, dedupeNums([
      { text: String(okN), ok: true },
      { text: String(count), ok: false, tag: '개수를 셈' },
      { text: String(maxBox), ok: false, tag: '가장 큰 수만 씀' },
      { text: String(okN + maxBox + 1), ok: false, tag: '같아지는 수까지 넣음' },
      { text: String(okN - maxBox), ok: false, tag: '가장 큰 수를 빠뜨림' },
    ])),
    solve: {
      steps: [
        `① ${fracText(a, d)} + □/${d} < ${say(limit, d)} 이니 □는 ${limit} − ${a} = ${limit - a} 보다 작아야 해요`,
        `② □에 들어갈 수 있는 자연수: ${list.join(', ')} (${count}개)`,
        `③ 모두 더하면 ${list.join(' + ')} = ${okN}`,
      ],
      why: {
        '개수를 셈': `개수는 ${count}개지만, 문제는 **모두 더한 값**을 물었어요.`,
        '가장 큰 수만 씀': '가장 큰 수 하나가 아니라 전부 더해야 해요.',
        '같아지는 수까지 넣음': '부등호가 < 예요 — **같으면 안 돼요**.',
        '가장 큰 수를 빠뜨림': '마지막 수까지 넣어야 해요.',
      },
    },
    key: 'howmany',
  };
}

/** 숫자 글 보기에서 값이 겹치는 것 버리기 */
function dedupeNums(list) {
  const seen = new Set();
  const out = [];
  for (const c of list) {
    if (out.length >= 4) break;
    if (seen.has(c.text)) continue;
    seen.add(c.text);
    out.push(c);
  }
  return out;
}

/**
 * 📏 수직선 읽기 — 전체 길이와 한쪽이 주어지고 나머지를 구한다.
 * 그림(figure)은 화면에서 `[line]`으로 그리고, 여기서는 글로도 알 수 있게 쓴다.
 */
function numline(r, cast) {
  const d = pick(r, [5, 6, 7, 8, 10]);
  const total = int(r, d * 3, d * 6);
  const right = int(r, d + 1, total - d - 1);
  const ok = total - right;
  return {
    kind: 'numline',
    q: `수직선에서 전체 길이는 ${say(total, d)}이고, 오른쪽 부분은 ${say(right, d)}이에요. 왼쪽 부분(□)은 얼마일까요?`,
    expr: `□ + ${say(right, d)} = ${say(total, d)}`,
    figure: '',
    hint: '전체에서 한쪽을 빼면 나머지예요',
    choices: choicesOf(r, ok, [
      { n: total + right, tag: '더해 버림' },
      { n: right, tag: '주어진 쪽을 그대로 씀' },
      { n: total, tag: '전체를 그대로 씀' },
      { n: ok + d, tag: '자연수 부분을 잘못 뺌' },
    ], d),
    solve: {
      steps: [
        `① 전체 = 왼쪽 + 오른쪽`,
        `② 왼쪽 = ${say(total, d)} − ${say(right, d)}`,
        `③ 답: ${say(ok, d)}`,
      ],
      why: {
        '더해 버림': '전체에서 한쪽을 **빼야** 나머지가 나와요.',
        '주어진 쪽을 그대로 씀': '그건 오른쪽 길이예요. 왼쪽을 물었어요.',
        '전체를 그대로 씀': '전체가 아니라 왼쪽 부분만 물었어요.',
      },
    },
    key: 'numline',
  };
}

/**
 * 🧩 겹쳐 잇기 — 테이프 몇 장을 얼마씩 겹쳐 이으면 전체 길이는?
 * ★ 겹친 자리는 장수보다 **하나 적다**. 그걸 놓치는 게 가장 흔한 실수다.
 */
function overlap(r, cast) {
  const d = pick(r, [8, 10, 12]);
  const sheets = int(r, 3, 4);
  const one = int(r, d - 3, d * 2);        // 한 장 길이
  const lap = int(r, 1, Math.max(1, Math.floor(one / 3))); // 겹치는 길이
  const ok = one * sheets - lap * (sheets - 1);
  const thing = pick(r, ['색 테이프', '리본', '종이띠']);
  return {
    kind: 'overlap',
    q: `길이가 ${say(one, d)} m인 ${thing} ${sheets}장을 ${fracText(lap, d)} m씩 겹치게 이어 붙였어요. 이어 붙인 ${thing} 전체의 길이는 몇 m일까요?`,
    expr: `${say(one, d)} × ${sheets}장, 겹치는 곳 ${fracText(lap, d)}`,
    hint: `${sheets}장을 이으면 겹친 자리는 몇 군데일까요?`,
    choices: choicesOf(r, ok, [
      { n: one * sheets, tag: '겹친 것을 안 뺌' },
      { n: one * sheets - lap, tag: '겹친 자리를 한 군데로 봄' },
      { n: one * sheets - lap * sheets, tag: '겹친 자리를 장수만큼 뺌' },
      { n: ok + lap, tag: '계산 실수' },
    ], d),
    solve: {
      steps: [
        `① 그냥 이으면 ${say(one, d)} × ${sheets} = ${say(one * sheets, d)}`,
        `② ${sheets}장을 이으면 겹친 자리는 ${sheets - 1}군데 → ${fracText(lap, d)} × ${sheets - 1} = ${say(lap * (sheets - 1), d)}`,
        `③ ${say(one * sheets, d)} − ${say(lap * (sheets - 1), d)} = ${say(ok, d)}`,
      ],
      why: {
        '겹친 것을 안 뺌': '겹친 만큼은 두 번 세어진 거예요. 빼 줘야 해요.',
        '겹친 자리를 한 군데로 봄': `${sheets}장을 이으면 겹친 자리는 ${sheets - 1}군데예요.`,
        '겹친 자리를 장수만큼 뺌': `겹친 자리는 장수보다 **하나 적어요** (${sheets - 1}군데).`,
      },
    },
    key: 'overlap',
  };
}

/**
 * 🎁 합과 차로 두 수 — "합이 ○, 차가 △인 두 진분수 중 **큰 수**는?"
 * 큰 수 = (합 + 차) ÷ 2. 문제집은 두 수를 다 묻지만, 보기로 내려면 하나만 묻는 편이 깔끔하다.
 */
function sumdiff(r, cast) {
  const d = pick(r, [10, 12, 14, 15, 16]);
  let big = int(r, 3, d - 2);
  let small = int(r, 1, big - 1);
  if (big + small >= d) { big = Math.max(2, Math.floor((d - 1) / 2) + 1); small = Math.max(1, big - 2); }
  const sum = big + small;
  const diff = big - small;
  if (diff <= 0 || sum >= d) return null;
  return {
    kind: 'sumdiff',
    q: `분모가 ${d}인 진분수가 2개 있어요. 두 수의 합은 ${fracText(sum, d)}, 차는 ${fracText(diff, d)}예요. 두 수 중 **더 큰 수**는 얼마일까요?`,
    expr: `□ + △ = ${fracText(sum, d)}    □ − △ = ${fracText(diff, d)}`,
    hint: '합과 차를 더하면 큰 수의 두 배가 돼요',
    choices: choicesOf(r, big, [
      { n: small, tag: '작은 수를 고름' },
      { n: sum, tag: '합을 그대로 씀' },
      { n: diff, tag: '차를 그대로 씀' },
      { n: big + 1, tag: '계산 실수' },
    ], d),
    solve: {
      steps: [
        `① 합 + 차 = ${fracText(sum, d)} + ${fracText(diff, d)} = ${fracText(sum + diff, d)} — 이건 **큰 수의 두 배**예요`,
        `② 큰 수 = ${fracText(sum + diff, d)} ÷ 2 = ${fracText(big, d)}`,
        `③ (작은 수는 ${fracText(small, d)} — 더하면 ${fracText(sum, d)}, 빼면 ${fracText(diff, d)}로 맞아요)`,
      ],
      why: {
        '작은 수를 고름': '문제는 **더 큰 수**를 물었어요.',
        '합을 그대로 씀': '합은 두 수를 더한 것이에요. 한 수를 물었어요.',
        '차를 그대로 씀': '차는 두 수의 차이예요. 한 수를 물었어요.',
      },
    },
    key: 'sumdiff',
  };
}

/**
 * 📐 규칙 찾기 — 같은 크기씩 커지는 수의 줄에서 빈칸.
 * 몇씩 커지는지 먼저 알아내야 한다(옆 두 칸의 차).
 */
function pattern(r, cast) {
  const d = pick(r, [5, 6, 7, 8, 10]);
  const step = int(r, Math.max(2, Math.floor(d / 2)), d * 2 - 1); // 한 걸음 (분수를 넘나들게)
  const start = int(r, d, d * 2);
  const list = [];
  for (let i = 0; i < 7; i++) list.push(start + step * i);
  const hole = int(r, 2, 5); // 빈칸 자리 (양 끝은 피한다)
  const ok = list[hole];
  const shown = list.map((n, i) => (i === hole ? '⊙' : say(n, d)));
  return {
    kind: 'pattern',
    q: '수를 규칙에 따라 늘어놓았어요. ⊙에 알맞은 수는 얼마일까요?',
    expr: shown.join('  ,  '),
    hint: '옆으로 갈 때마다 얼마씩 커지는지 먼저 찾으세요',
    choices: choicesOf(r, ok, [
      { n: list[hole - 1] + step + step, tag: '한 칸 더 간 값' },
      { n: list[hole - 1], tag: '앞 칸을 그대로 씀' },
      { n: list[hole - 1] + Math.max(1, Math.floor(step / 2)), tag: '커지는 크기를 잘못 봄' },
      { n: ok + d, tag: '자연수 부분만 더함' },
    ], d),
    solve: {
      steps: [
        `① 옆 칸과의 차: ${say(list[1], d)} − ${say(list[0], d)} = ${say(step, d)}씩 커져요`,
        `② ⊙ 앞 칸이 ${say(list[hole - 1], d)}이니 ⊙ = ${say(list[hole - 1], d)} + ${say(step, d)}`,
        `③ 답: ${say(ok, d)}`,
      ],
      why: {
        '한 칸 더 간 값': '⊙은 앞 칸에서 **한 걸음만** 간 자리예요.',
        '앞 칸을 그대로 씀': '한 걸음 더 가야 해요.',
        '커지는 크기를 잘못 봄': '옆 두 칸의 차를 다시 재어 보세요.',
      },
    },
    key: 'pattern',
  };
}

const MAKERS = { reverse, cards, findok, howmany, numline, overlap, sumdiff, pattern };

/**
 * 💎 스페셜 문항 하나 만들기.
 * @param {string} kindId KINDS의 id
 * @param {number} seed 씨앗 (같은 씨앗이면 같은 문제 — 테스트로 검산할 수 있다)
 * @param {object} [opts] { cast } — 출연진(잡은 포켓몬)
 * @returns {object|null} mathgen과 같은 모양의 문항
 */
export function makeSpecial(kindId, seed, opts) {
  const make = MAKERS[kindId];
  if (!make) return null;
  const r = rng(seed);
  const cast = castOf(r, opts || {});
  for (let tries = 0; tries < 8; tries++) { // 조건이 안 맞으면(빈칸이 없는 등) 씨앗을 조금 옮겨 다시
    const q = make(rng(seed + tries * 7919), { ...cast, mon: cast.mon || pick(r, ['진우', '피카츄', '꼬부기']) });
    if (q && q.choices && q.choices.length === 4 && q.choices.some((c) => c.ok)) {
      return { concept: 'special', kind: 'special-' + kindId, expr: '', hint: '', figure: '', ...q };
    }
  }
  return null;
}

/**
 * 💎 오늘의 스페셜 한 세트 — 얼굴을 골라 n문항. 같은 얼굴이 연달아 나오지 않게 섞는다.
 * @param {number} seed
 * @param {number} n 문항 수 (기본 3)
 * @param {object} [opts] { cast, prefer } prefer = 아직 배지를 못 받은 얼굴들 (그쪽을 먼저 낸다)
 */
export function makeSpecialRound(seed, n = 3, opts = {}) {
  const r = rng(seed);
  const prefer = (opts.prefer || []).filter((id) => MAKERS[id]);
  const rest = KIND_IDS.filter((id) => !prefer.includes(id));
  const order = [...shuffle(r, prefer.slice()), ...shuffle(r, rest)];
  const out = [];
  for (const id of order) {
    if (out.length >= n) break;
    const q = makeSpecial(id, seed + out.length * 104729 + 13, opts);
    if (q) out.push(q);
  }
  return out;
}
