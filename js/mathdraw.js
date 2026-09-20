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

/**
 * 그림 지시문 → SVG. 사람이 쓴 글 안에 `[bar 7/8]` `[pizza 3/4]` `[bars 1/2 1/3]` `[bar 3/8+2/8]` 로 적는다.
 * 모르는 지시문은 빈 글자 (글이 깨지지 않게).
 */
export function figureSvg(spec) {
  const s = String(spec || '').trim();
  let m;
  if ((m = /^bar (\d+)\/(\d+)\+(\d+)\/\2$/.exec(s))) return barSvg(+m[2], +m[1], { n2: +m[3] });
  if ((m = /^bar (\d+)\/(\d+)$/.exec(s))) return barSvg(+m[2], +m[1]);
  if ((m = /^pizza (\d+)\/(\d+)$/.exec(s))) return pizzaSvg(+m[2], +m[1]);
  if ((m = /^bars ((?:\d+\/\d+\s*)+)$/.exec(s))) {
    const list = m[1].trim().split(/\s+/).map((t) => { const [n, d] = t.split('/').map(Number); return { n, d }; });
    return barsSvg(list);
  }
  return '';
}

/** 글 속 `[bar 7/8]` 지시문을 SVG로 바꾼다 (화면·검수 페이지가 같이 쓴다) */
export function renderFigures(text) {
  return String(text || '').replace(/\[(bar|pizza|bars) ([^\]]+)\]/g, (_, kind, arg) => figureSvg(`${kind} ${arg}`));
}
