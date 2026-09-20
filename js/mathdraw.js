// 🔢 분수 그림 — 숫자에서 SVG 문자열을 만든다 (순수 함수, DOM 없음)
//
// "8칸 중 7칸"을 글로만 읽는 것과 칠해진 막대를 보는 것은 다르다 (아버님 요청).
// 늘 그리지는 않는다 — **그림이 개념을 말해 주는 자리**에만: 분수의 뜻, 같은 분모, 가분수, 통분(같은 양을 다르게 나눔).
// 곱셈·나눗셈은 그림이 오히려 답을 흘리거나 헷갈리게 해서 안 그린다.
//
// 색은 CSS 변수로 두어 앱과 검수 페이지, 밝은/어두운 테마에서 같은 코드가 쓰인다.
//   --frac-fill (칠한 칸) · --frac-fill2 (두 번째 색) · 테두리는 currentColor

const FILL = 'var(--frac-fill, #6366f1)';
const FILL2 = 'var(--frac-fill2, #f59e0b)';
const EMPTY = 'var(--frac-empty, rgba(127,127,127,0.12))';

/**
 * 막대 — d칸 중 n칸 칠함. n이 d보다 크면(가분수) 막대를 여러 줄로 이어 그린다.
 * @param {number} d 칸 수(분모)  @param {number} n 칠할 칸(분자)
 * @param {{n2?:number, w?:number, h?:number}} [o] n2: 두 번째 색으로 이어 칠할 칸(덧셈 그림)
 */
export function barSvg(d, n, o = {}) {
  d = Math.max(1, Math.trunc(d)); n = Math.max(0, Math.trunc(n));
  const n2 = Math.max(0, Math.trunc(o.n2 || 0));
  const total = n + n2;
  const rows = Math.max(1, Math.ceil(Math.max(total, 1) / d));
  const w = o.w || 160; const cellH = o.h || 18; const gap = 4;
  const cellW = w / d;
  const H = rows * cellH + (rows - 1) * gap;
  let cells = '';
  for (let r = 0; r < rows; r++) {
    for (let i = 0; i < d; i++) {
      const k = r * d + i;
      const fill = k < n ? FILL : k < total ? FILL2 : EMPTY;
      cells += `<rect x="${(i * cellW).toFixed(1)}" y="${r * (cellH + gap)}" width="${cellW.toFixed(1)}" height="${cellH}" fill="${fill}" stroke="currentColor" stroke-opacity="0.55" stroke-width="1"/>`;
    }
  }
  const label = n2 ? `${n}+${n2}/${d}` : `${n}/${d}`;
  return `<svg class="frac-fig" viewBox="0 0 ${w} ${H}" width="${w}" height="${H}" role="img" aria-label="막대 ${d}칸 중 ${label}"><g shape-rendering="crispEdges">${cells}</g></svg>`;
}

/**
 * 피자(원) — d조각 중 n조각 칠함. 조각이 8개를 넘으면 막대가 더 읽기 쉬워 막대로 대신한다.
 */
export function pizzaSvg(d, n, o = {}) {
  d = Math.max(1, Math.trunc(d)); n = Math.max(0, Math.min(d, Math.trunc(n)));
  if (d > 12) return barSvg(d, n, o);
  const R = (o.r || 34); const C = R + 2; const size = C * 2;
  let paths = '';
  for (let i = 0; i < d; i++) {
    const a0 = (i / d) * Math.PI * 2 - Math.PI / 2;
    const a1 = ((i + 1) / d) * Math.PI * 2 - Math.PI / 2;
    const x0 = C + R * Math.cos(a0), y0 = C + R * Math.sin(a0);
    const x1 = C + R * Math.cos(a1), y1 = C + R * Math.sin(a1);
    const big = 1 / d > 0.5 ? 1 : 0;
    const dPath = d === 1
      ? `M ${C} ${C - R} A ${R} ${R} 0 1 1 ${C - 0.01} ${C - R} Z`
      : `M ${C} ${C} L ${x0.toFixed(2)} ${y0.toFixed(2)} A ${R} ${R} 0 ${big} 1 ${x1.toFixed(2)} ${y1.toFixed(2)} Z`;
    paths += `<path d="${dPath}" fill="${i < n ? FILL : EMPTY}" stroke="currentColor" stroke-opacity="0.55" stroke-width="1"/>`;
  }
  return `<svg class="frac-fig" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" role="img" aria-label="피자 ${d}조각 중 ${n}조각">${paths}</svg>`;
}

/**
 * 나란한 막대 — 같은 길이의 막대를 서로 다르게 나눠 칠한다 (통분·약분: "다르게 나눠도 같은 양").
 * @param {Array<{n:number, d:number}>} list 위에서 아래로
 */
export function barsSvg(list, o = {}) {
  const w = o.w || 160; const cellH = o.h || 16; const gap = 6;
  const rows = (list || []).filter((f) => f && f.d > 0);
  if (!rows.length) return '';
  const H = rows.length * cellH + (rows.length - 1) * gap;
  let g = '';
  rows.forEach((f, r) => {
    const cellW = w / f.d;
    for (let i = 0; i < f.d; i++) {
      g += `<rect x="${(i * cellW).toFixed(1)}" y="${r * (cellH + gap)}" width="${cellW.toFixed(1)}" height="${cellH}" fill="${i < f.n ? (r % 2 ? FILL2 : FILL) : EMPTY}" stroke="currentColor" stroke-opacity="0.55" stroke-width="1"/>`;
    }
  });
  const label = rows.map((f) => `${f.n}/${f.d}`).join(' 과 ');
  return `<svg class="frac-fig" viewBox="0 0 ${w} ${H}" width="${w}" height="${H}" role="img" aria-label="막대 비교 ${label}"><g shape-rendering="crispEdges">${g}</g></svg>`;
}

// ───────────────────── 🔢 음수 줄기: 수직선 ─────────────────────
// 음수는 "0보다 왼쪽(아래)"을 눈으로 봐야 잡힌다. 가로 수직선이 기본, 세로(vline)는 온도계·땅 아래 같은 위아래 모델용.
// 점(dots)은 정수가 아니어도 된다 (−1.5, −0.5) — 유리수 개념에서 쓴다.

const TICK_W = 26; // 눈금 한 칸 너비(px) — 폰 폭에서 −6..6까지 넉넉히 들어간다
const LINE_STROKE = 'currentColor';

/**
 * 수직선 — lo..hi 눈금, dots에 점. 0 눈금은 굵게 해 "가운데"가 보이게 한다.
 * @param {number} lo  @param {number} hi  @param {{dots?:number[], vertical?:boolean}} [o]
 */
export function lineSvg(lo, hi, o = {}) {
  lo = Math.trunc(lo); hi = Math.trunc(hi);
  if (hi <= lo) return '';
  const n = hi - lo;
  const dots = (o.dots || []).filter((v) => Number.isFinite(v) && v >= lo && v <= hi);
  const pad = 18;
  const len = n * TICK_W;
  const pos = (v) => pad + (v - lo) * TICK_W;
  if (o.vertical) {
    // 세로: 위가 큰 수 (온도계·층수). 라벨은 오른쪽에
    const W = 70; const H = len + pad * 2;
    const y = (v) => pad + (hi - v) * TICK_W;
    let g = `<line x1="24" y1="${pad}" x2="24" y2="${pad + len}" stroke="${LINE_STROKE}" stroke-width="1.5"/>`;
    for (let v = lo; v <= hi; v++) {
      const zero = v === 0;
      g += `<line x1="${zero ? 16 : 19}" y1="${y(v)}" x2="${zero ? 32 : 29}" y2="${y(v)}" stroke="${LINE_STROKE}" stroke-width="${zero ? 2.5 : 1.2}"/>`;
      g += `<text x="38" y="${y(v) + 4}" font-size="11" fill="currentColor" font-weight="${zero ? 700 : 400}">${v}</text>`;
    }
    for (const v of dots) g += `<circle cx="24" cy="${y(v).toFixed(1)}" r="6" fill="${FILL}" stroke="currentColor" stroke-width="1"/>`;
    return `<svg class="frac-fig line-fig" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="세로 수직선 ${lo}부터 ${hi}${dots.length ? ', 점 ' + dots.join(', ') : ''}">${g}</svg>`;
  }
  const W = len + pad * 2; const H = 44; const yLine = 18;
  let g = `<line x1="${pad - 8}" y1="${yLine}" x2="${pad + len + 8}" y2="${yLine}" stroke="${LINE_STROKE}" stroke-width="1.5"/>`;
  g += `<path d="M ${pad + len + 8} ${yLine} l -6 -4 v 8 z" fill="currentColor"/>`; // 오른쪽 화살촉: 이쪽이 커진다
  for (let v = lo; v <= hi; v++) {
    const zero = v === 0;
    g += `<line x1="${pos(v)}" y1="${zero ? yLine - 8 : yLine - 5}" x2="${pos(v)}" y2="${zero ? yLine + 8 : yLine + 5}" stroke="${LINE_STROKE}" stroke-width="${zero ? 2.5 : 1.2}"/>`;
    g += `<text x="${pos(v)}" y="${yLine + 20}" font-size="11" text-anchor="middle" fill="currentColor" font-weight="${zero ? 700 : 400}">${v}</text>`;
  }
  for (const v of dots) g += `<circle cx="${pos(v).toFixed(1)}" cy="${yLine}" r="6" fill="${FILL}" stroke="currentColor" stroke-width="1"/>`;
  return `<svg class="frac-fig line-fig" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="수직선 ${lo}부터 ${hi}${dots.length ? ', 점 ' + dots.join(', ') : ''}">${g}</svg>`;
}

/**
 * 걷기 — start에서 delta만큼 걸어 도착. 덧셈을 "수직선에서 걷기"로 보여 준다 (음수 덧셈·뺄셈의 핵심 그림).
 * 범위는 0·출발·도착을 모두 품고 양쪽 한 칸 여유. 출발은 속 빈 점, 도착은 칠한 점, 사이는 굽은 화살표.
 */
export function walkSvg(start, delta) {
  start = Math.trunc(start); delta = Math.trunc(delta);
  if (!delta) return lineSvg(start - 3, start + 3, { dots: [start] });
  const end = start + delta;
  const lo = Math.min(0, start, end) - 1; const hi = Math.max(0, start, end) + 1;
  const n = hi - lo; const pad = 18; const len = n * TICK_W;
  const pos = (v) => pad + (v - lo) * TICK_W;
  const W = len + pad * 2; const H = 62; const yLine = 36;
  let g = `<line x1="${pad - 8}" y1="${yLine}" x2="${pad + len + 8}" y2="${yLine}" stroke="${LINE_STROKE}" stroke-width="1.5"/>`;
  g += `<path d="M ${pad + len + 8} ${yLine} l -6 -4 v 8 z" fill="currentColor"/>`;
  for (let v = lo; v <= hi; v++) {
    const zero = v === 0;
    g += `<line x1="${pos(v)}" y1="${zero ? yLine - 8 : yLine - 5}" x2="${pos(v)}" y2="${zero ? yLine + 8 : yLine + 5}" stroke="${LINE_STROKE}" stroke-width="${zero ? 2.5 : 1.2}"/>`;
    g += `<text x="${pos(v)}" y="${yLine + 20}" font-size="11" text-anchor="middle" fill="currentColor" font-weight="${zero ? 700 : 400}">${v}</text>`;
  }
  // 굽은 화살표: 출발 위에서 떠서 도착 위로 내려앉는다. 방향이 왼쪽이면 화살촉도 왼쪽
  const x0 = pos(start); const x1 = pos(end); const lift = Math.min(22, 8 + Math.abs(delta) * 2);
  const dir = delta > 0 ? 1 : -1;
  g += `<path d="M ${x0} ${yLine - 8} Q ${(x0 + x1) / 2} ${yLine - 8 - lift} ${x1} ${yLine - 8}" fill="none" stroke="${FILL2}" stroke-width="2.2"/>`;
  g += `<path d="M ${x1} ${yLine - 8} l ${-7 * dir} -5 l ${2 * dir} 5 l ${-2 * dir} 5 z" fill="${FILL2}"/>`;
  g += `<text x="${(x0 + x1) / 2}" y="${yLine - 12 - lift}" font-size="11" text-anchor="middle" fill="${FILL2}" font-weight="700">${delta > 0 ? '+' : ''}${delta}</text>`;
  g += `<circle cx="${x0}" cy="${yLine}" r="6" fill="var(--frac-empty, #fff)" stroke="${FILL}" stroke-width="2"/>`;
  g += `<circle cx="${x1}" cy="${yLine}" r="6" fill="${FILL}" stroke="currentColor" stroke-width="1"/>`;
  return `<svg class="frac-fig line-fig" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${start}에서 ${delta > 0 ? '오른쪽' : '왼쪽'}으로 ${Math.abs(delta)}칸 걸어 ${end}">${g}</svg>`;
}

/** 지시문 안의 수 목록 "-3,2,-1.5" → 숫자 배열 (−(U+2212)도 받아 준다 — 글에는 진짜 마이너스를 쓰니까) */
function nums(s) {
  return String(s || '').replace(/−/g, '-').split(/[,\s]+/).filter(Boolean).map(Number).filter((v) => Number.isFinite(v));
}

/**
 * 그림 지시문 → SVG. 사람이 쓴 글 안에 적는다:
 *   분수: `[bar 7/8]` `[pizza 3/4]` `[bars 1/2 1/3]` `[bar 3/8+2/8]`
 *   음수: `[line -5..5]` `[line -6..6 @-5,-3]`(점) `[vline -6..6 @-5]`(세로) `[walk 2 -3]`(2에서 왼쪽 3칸)
 * 모르는 지시문은 빈 글자 (글이 깨지지 않게).
 */
export function figureSvg(spec) {
  const s = String(spec || '').trim().replace(/−/g, '-');
  let m;
  if ((m = /^bar (\d+)\/(\d+)\+(\d+)\/\2$/.exec(s))) return barSvg(+m[2], +m[1], { n2: +m[3] });
  if ((m = /^bar (\d+)\/(\d+)$/.exec(s))) return barSvg(+m[2], +m[1]);
  if ((m = /^pizza (\d+)\/(\d+)$/.exec(s))) return pizzaSvg(+m[2], +m[1]);
  if ((m = /^bars ((?:\d+\/\d+\s*)+)$/.exec(s))) {
    const list = m[1].trim().split(/\s+/).map((t) => { const [n, d] = t.split('/').map(Number); return { n, d }; });
    return barsSvg(list);
  }
  if ((m = /^(line|vline) (-?\d+)\.\.(-?\d+)(?: @([-\d.,\s]+))?$/.exec(s))) return lineSvg(+m[2], +m[3], { dots: nums(m[4]), vertical: m[1] === 'vline' });
  if ((m = /^walk (-?\d+) ([-+]?\d+)$/.exec(s))) return walkSvg(+m[1], +m[2]);
  return '';
}

/** 글 속 `[bar 7/8]` `[walk 2 -3]` 지시문을 SVG로 바꾼다 (화면·검수 페이지가 같이 쓴다) */
export function renderFigures(text) {
  return String(text || '').replace(/\[(bar|pizza|bars|line|vline|walk) ([^\]]+)\]/g, (_, kind, arg) => figureSvg(`${kind} ${arg}`));
}
