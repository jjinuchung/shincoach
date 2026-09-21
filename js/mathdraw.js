// 🔢 수학 그림 — 숫자에서 SVG 문자열을 만든다 (순수 함수) + 만지는 부품(맨 아래, 화면에서 부를 때만 DOM)
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
const lab = (v) => String(v).replace('-', '−'); // 눈금 라벨 — 글(−5)과 같은 진짜 마이너스로 (aria-label은 ASCII 그대로)

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
      g += `<text x="38" y="${y(v) + 4}" font-size="11" fill="currentColor" font-weight="${zero ? 700 : 400}">${lab(v)}</text>`;
    }
    for (const v of dots) g += `<circle cx="24" cy="${y(v).toFixed(1)}" r="6" fill="${FILL}" stroke="currentColor" stroke-width="1"/>`;
    return `<svg class="frac-fig line-fig" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="세로 수직선 ${lo}부터 ${hi}${dots.length ? ', 점 ' + dots.join(', ') : ''}">${g}</svg>`;
  }
  // marks: 이름표 붙은 색 점 — 풀이 카드의 "❌ 내 답 / ✔ 정답" (o.marks = [{ v, fill, label }])
  const marks = (o.marks || []).filter((k) => k && Number.isFinite(k.v) && k.v >= lo && k.v <= hi);
  const W = len + pad * 2; const H = marks.length ? 62 : 44; const yLine = marks.length ? 36 : 18;
  let g = `<line x1="${pad - 8}" y1="${yLine}" x2="${pad + len + 8}" y2="${yLine}" stroke="${LINE_STROKE}" stroke-width="1.5"/>`;
  g += `<path d="M ${pad + len + 8} ${yLine} l -6 -4 v 8 z" fill="currentColor"/>`; // 오른쪽 화살촉: 이쪽이 커진다
  for (let v = lo; v <= hi; v++) {
    const zero = v === 0;
    g += `<line x1="${pos(v)}" y1="${zero ? yLine - 8 : yLine - 5}" x2="${pos(v)}" y2="${zero ? yLine + 8 : yLine + 5}" stroke="${LINE_STROKE}" stroke-width="${zero ? 2.5 : 1.2}"/>`;
    g += `<text x="${pos(v)}" y="${yLine + 20}" font-size="11" text-anchor="middle" fill="currentColor" font-weight="${zero ? 700 : 400}">${lab(v)}</text>`;
  }
  for (const v of dots) g += `<circle cx="${pos(v).toFixed(1)}" cy="${yLine}" r="6" fill="${FILL}" stroke="currentColor" stroke-width="1"/>`;
  marks.forEach((k, i) => {
    // 같은 자리에 둘이 오면 이름표만 위아래로 비켜 준다
    const same = marks.some((m2, j) => j < i && m2.v === k.v);
    g += `<circle cx="${pos(k.v).toFixed(1)}" cy="${yLine}" r="${same ? 4 : 7}" fill="${k.fill || FILL}" stroke="currentColor" stroke-width="1"/>`;
    if (k.label) g += `<text x="${pos(k.v).toFixed(1)}" y="${yLine - 12 - (same ? 14 : 0)}" font-size="11" text-anchor="middle" fill="${k.fill || FILL}" font-weight="700">${k.label}</text>`;
  });
  return `<svg class="frac-fig line-fig" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="수직선 ${lo}부터 ${hi}${dots.length ? ', 점 ' + dots.join(', ') : ''}${marks.map((k) => `, ${k.label || ''} ${k.v}`).join('')}">${g}</svg>`;
}

/** 내 답·정답을 한 수직선에 — 풀이 카드용 (정수 답일 때). 두 값과 0을 품고 양쪽 한 칸 여유, 너무 넓으면 안 그린다(빈 글자) */
export function compareLineSvg(mine, ok) {
  if (!Number.isInteger(mine) || !Number.isInteger(ok)) return '';
  const lo = Math.min(0, mine, ok) - 1; const hi = Math.max(0, mine, ok) + 1;
  if (hi - lo > 16) return '';
  return lineSvg(lo, hi, { marks: [{ v: mine, fill: 'var(--no, #dc2626)', label: '내 답' }, { v: ok, fill: 'var(--ok, #16a34a)', label: '정답' }] });
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
    g += `<text x="${pos(v)}" y="${yLine + 20}" font-size="11" text-anchor="middle" fill="currentColor" font-weight="${zero ? 700 : 400}">${lab(v)}</text>`;
  }
  // 굽은 화살표: 출발 위에서 떠서 도착 위로 내려앉는다. 방향이 왼쪽이면 화살촉도 왼쪽
  const x0 = pos(start); const x1 = pos(end); const lift = Math.min(22, 8 + Math.abs(delta) * 2);
  const dir = delta > 0 ? 1 : -1;
  g += `<path d="M ${x0} ${yLine - 8} Q ${(x0 + x1) / 2} ${yLine - 8 - lift} ${x1} ${yLine - 8}" fill="none" stroke="${FILL2}" stroke-width="2.2"/>`;
  g += `<path d="M ${x1} ${yLine - 8} l ${-7 * dir} -5 l ${2 * dir} 5 l ${-2 * dir} 5 z" fill="${FILL2}"/>`;
  g += `<text x="${(x0 + x1) / 2}" y="${yLine - 12 - lift}" font-size="11" text-anchor="middle" fill="${FILL2}" font-weight="700">${delta > 0 ? '+' : '−'}${Math.abs(delta)}</text>`;
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

// ───────────────────── 만지는 부품 (2026-09-21) ─────────────────────
//
// 구체(만지기) → 그림 → 기호 — 앱에 그림과 기호만 있고 "만지기"가 없었다. 펜은 없지만 탭·드래그는 된다.
// 이 부품들은 DOM을 만들므로 **화면에서 부를 때만** document를 쓴다 (모듈을 불러오는 것만으로는 안 건드린다 → node 테스트 OK).
// 기하는 정적 그림(lineSvg·walkSvg)과 같은 자(lineGeom)를 쓴다 — 아이가 본 그림과 만지는 그림이 같은 눈금이어야 한다.

const SVG_NS = 'http://www.w3.org/2000/svg';

/** 수직선 자 — lo..hi를 그릴 때 값 ↔ x좌표 (순수 함수) */
export function lineGeom(lo, hi) {
  lo = Math.trunc(lo); hi = Math.trunc(hi);
  const pad = 18; const len = Math.max(1, hi - lo) * TICK_W; const W = len + pad * 2;
  return {
    lo, hi, pad, tick: TICK_W, W, len,
    pos: (v) => pad + (v - lo) * TICK_W,
    /** x좌표(viewBox 기준) → 가장 가까운 눈금 값 (범위 밖은 끝에 붙인다) */
    valueAt: (x) => Math.min(hi, Math.max(lo, Math.round((x - pad) / TICK_W) + lo)),
  };
}

/** 걷기 위젯의 범위 — 출발·도착·0을 품고 양쪽 두 칸 여유 (도착이 끝에 붙어 있으면 답이 보인다). 폰 폭 안에서 ±9 */
export function walkRange(start, end) {
  const lo = Math.max(-9, Math.min(0, start, end) - 2); const hi = Math.min(9, Math.max(0, start, end) + 2);
  return [Math.min(lo, hi - 4), Math.max(hi, lo + 4)];
}

function svgEl(tag, attrs = {}) {
  const e = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, String(v));
  return e;
}

/**
 * 🚶 끌어서 걷기 — 수직선 위의 말(토큰)을 손가락으로 끌거나 눈금을 탭하거나 ◀▶로 옮긴다.
 * 출발에서 지금 자리까지 굽은 화살표와 "+3"/"−5"가 따라다닌다 → 더하기·빼기가 "걷기"로 보인다.
 *   walkWidget({ start: 3, lo: -4, hi: 6, onChange(v) })
 *   .el (붙일 요소) · .get() 지금 자리 · .set(v) 옮기기 · .lock() 더 못 움직이게(확인 뒤)
 */
export function walkWidget({ start, lo, hi, onChange, label }) {
  start = Math.trunc(start);
  const g = lineGeom(lo, hi);
  const H = 70; const yLine = 44;
  const wrap = document.createElement('div');
  wrap.className = 'math-walk';
  const svg = svgEl('svg', { class: 'frac-fig line-fig walk-fig', viewBox: `0 0 ${g.W} ${H}`, width: g.W, height: H, role: 'img' });
  svg.appendChild(svgEl('line', { x1: g.pad - 8, y1: yLine, x2: g.pad + g.len + 8, y2: yLine, stroke: 'currentColor', 'stroke-width': 1.5 }));
  svg.appendChild(svgEl('path', { d: `M ${g.pad + g.len + 8} ${yLine} l -6 -4 v 8 z`, fill: 'currentColor' }));
  for (let v = g.lo; v <= g.hi; v++) {
    const zero = v === 0;
    svg.appendChild(svgEl('line', { x1: g.pos(v), y1: zero ? yLine - 8 : yLine - 5, x2: g.pos(v), y2: zero ? yLine + 8 : yLine + 5, stroke: 'currentColor', 'stroke-width': zero ? 2.5 : 1.2 }));
    const t = svgEl('text', { x: g.pos(v), y: yLine + 20, 'font-size': 11, 'text-anchor': 'middle', fill: 'currentColor', 'font-weight': zero ? 700 : 400 });
    t.textContent = String(v).replace('-', '−');
    svg.appendChild(t);
    // 눈금마다 넓은 투명 손잡이 — 손가락으로 탭하면 그 자리로
    const hit = svgEl('rect', { x: g.pos(v) - TICK_W / 2, y: yLine - 22, width: TICK_W, height: 44, fill: 'transparent', 'data-v': v });
    hit.style.cursor = 'pointer';
    svg.appendChild(hit);
  }
  const arrow = svgEl('path', { d: '', fill: 'none', stroke: FILL2, 'stroke-width': 2.2 });
  const head = svgEl('path', { d: '', fill: FILL2 });
  const delta = svgEl('text', { x: 0, y: 0, 'font-size': 12, 'text-anchor': 'middle', fill: FILL2, 'font-weight': 700 });
  const home = svgEl('circle', { cx: g.pos(start), cy: yLine, r: 6, fill: 'var(--frac-empty, #fff)', stroke: FILL, 'stroke-width': 2 });
  const token = svgEl('circle', { cx: g.pos(start), cy: yLine, r: 11, fill: FILL, stroke: 'currentColor', 'stroke-width': 1.5, class: 'walk-token' });
  token.style.cursor = 'grab';
  svg.appendChild(arrow); svg.appendChild(head); svg.appendChild(delta); svg.appendChild(home); svg.appendChild(token);
  wrap.appendChild(svg);

  const row = document.createElement('div');
  row.className = 'math-walk-row';
  const left = document.createElement('button'); left.type = 'button'; left.className = 'btn math-walk-btn'; left.textContent = '◀ 왼쪽으로 한 칸';
  const read = document.createElement('span'); read.className = 'math-walk-read';
  const right = document.createElement('button'); right.type = 'button'; right.className = 'btn math-walk-btn'; right.textContent = '오른쪽으로 한 칸 ▶';
  row.appendChild(left); row.appendChild(read); row.appendChild(right);
  wrap.appendChild(row);

  let pos = start; let locked = false;
  const fmt = (v) => String(v).replace('-', '−');
  function paint() {
    token.setAttribute('cx', g.pos(pos));
    const d = pos - start;
    if (!d) { arrow.setAttribute('d', ''); head.setAttribute('d', ''); delta.textContent = ''; }
    else {
      const x0 = g.pos(start); const x1 = g.pos(pos); const lift = Math.min(22, 8 + Math.abs(d) * 2); const dir = d > 0 ? 1 : -1;
      arrow.setAttribute('d', `M ${x0} ${yLine - 12} Q ${(x0 + x1) / 2} ${yLine - 12 - lift} ${x1} ${yLine - 12}`);
      head.setAttribute('d', `M ${x1} ${yLine - 12} l ${-7 * dir} -5 l ${2 * dir} 5 l ${-2 * dir} 5 z`);
      delta.setAttribute('x', (x0 + x1) / 2); delta.setAttribute('y', yLine - 16 - lift);
      delta.textContent = (d > 0 ? '+' : '−') + Math.abs(d);
    }
    read.textContent = `${label ? label + ' ' : ''}지금 자리: ${fmt(pos)}` + (d ? ` (${fmt(start)}에서 ${d > 0 ? '오른쪽' : '왼쪽'}으로 ${Math.abs(d)}칸)` : ` (출발)`);
    svg.setAttribute('aria-label', `수직선 ${fmt(g.lo)}부터 ${fmt(g.hi)}, 말은 ${fmt(pos)}에`);
    left.disabled = locked || pos <= g.lo; right.disabled = locked || pos >= g.hi;
  }
  function set(v, quiet) {
    v = Math.min(g.hi, Math.max(g.lo, Math.trunc(v)));
    if (v === pos) return;
    pos = v; paint();
    if (!quiet && onChange) onChange(pos);
  }
  left.addEventListener('click', () => { if (!locked) set(pos - 1); });
  right.addEventListener('click', () => { if (!locked) set(pos + 1); });
  // 탭: 눈금 손잡이(rect)의 data-v로. 드래그: 포인터 캡처는 svg에 (토큰을 옮겨도 캡처가 안 끊긴다 — 퍼즐 v24 교훈)
  const xOf = (ev) => { const r = svg.getBoundingClientRect(); return (ev.clientX - r.left) * (g.W / (r.width || g.W)); };
  let dragging = false;
  svg.addEventListener('pointerdown', (ev) => {
    if (locked) return;
    const v = ev.target && ev.target.getAttribute && ev.target.getAttribute('data-v');
    if (ev.target === token) { dragging = true; try { svg.setPointerCapture(ev.pointerId); } catch { /* 캡처가 안 되는 브라우저 — 탭·버튼은 된다 */ } token.style.cursor = 'grabbing'; ev.preventDefault(); }
    else if (v !== null && v !== undefined && v !== '') set(Number(v));
  });
  svg.addEventListener('pointermove', (ev) => { if (dragging && !locked) set(g.valueAt(xOf(ev))); });
  const stop = () => { if (dragging) { dragging = false; token.style.cursor = 'grab'; } };
  svg.addEventListener('pointerup', stop); svg.addEventListener('pointercancel', stop);
  paint();
  return { el: wrap, get: () => pos, set: (v) => set(v, true), lock: () => { locked = true; token.style.cursor = 'default'; paint(); }, start };
}

/**
 * 🟦 탭해서 칠하기 — d칸 막대, 칸을 탭하면 칠해지고 다시 탭하면 지워진다. "3/8을 칠해 봐요".
 *   shadeWidget({ d: 8, onChange(count) }) → .el · .count() · .set(k) 앞에서부터 k칸 · .lock()
 */
export function shadeWidget({ d, onChange }) {
  d = Math.max(1, Math.trunc(d));
  const w = 240; const h = 40; const cw = w / d;
  const wrap = document.createElement('div');
  wrap.className = 'math-shade';
  const svg = svgEl('svg', { class: 'frac-fig shade-fig', viewBox: `0 0 ${w + 4} ${h + 4}`, width: w + 4, height: h + 4, role: 'img' });
  const cells = [];
  const on = new Array(d).fill(false);
  for (let i = 0; i < d; i++) {
    const c = svgEl('rect', { x: 2 + i * cw, y: 2, width: cw, height: h, fill: EMPTY, stroke: 'currentColor', 'stroke-width': 1.2, 'data-i': i });
    c.style.cursor = 'pointer';
    svg.appendChild(c); cells.push(c);
  }
  wrap.appendChild(svg);
  const read = document.createElement('div'); read.className = 'math-shade-read'; wrap.appendChild(read);
  let locked = false;
  const count = () => on.filter(Boolean).length;
  function paint() {
    cells.forEach((c, i) => c.setAttribute('fill', on[i] ? FILL : EMPTY));
    read.textContent = `${d}칸 중 ${count()}칸 칠했어요`;
    svg.setAttribute('aria-label', `막대 ${d}칸 중 ${count()}칸 칠함`);
  }
  svg.addEventListener('pointerdown', (ev) => {
    if (locked) return;
    const i = ev.target && ev.target.getAttribute && ev.target.getAttribute('data-i');
    if (i === null || i === undefined || i === '') return;
    on[Number(i)] = !on[Number(i)]; paint();
    if (onChange) onChange(count());
  });
  paint();
  return { el: wrap, count, set: (k) => { for (let i = 0; i < d; i++) on[i] = i < k; paint(); }, lock: () => { locked = true; cells.forEach((c) => { c.style.cursor = 'default'; }); } };
}
