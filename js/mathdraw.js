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

// ───────────────────── 🔢 L 수의 범위: ●/○ 수직선 (2026-10-01) ─────────────────────
// `[range 10..20 13● 17○]` — 13 이상 17 미만 (사이를 칠함) · `[range 120..150x5 130●>]` — 130 이상 (오른쪽으로 끝까지)
// · `[range 10..20 <17○]` — 17 미만. ● = 그 수가 들어감(이상·이하), ○ = 안 들어감(초과·미만). 눈금은 step마다 하나, 4~14칸.

/** `[range …]` 인자 → { lo, hi, step, marks: [{v, closed, dir}] } (말이 안 되면 null) */
export function parseRange(arg) {
  const m = /^(\d+)\.\.(\d+)(?:x(\d+))? ((?:<?\d+[●○]>?\s*){1,2})$/.exec(String(arg || '').trim());
  if (!m) return null;
  const lo = +m[1]; const hi = +m[2]; const step = m[3] ? +m[3] : 1;
  const n = (hi - lo) / step;
  if (!(hi > lo) || !Number.isInteger(n) || n < 4 || n > 14) return null;
  const marks = m[4].trim().split(/\s+/).map((t) => { const q = /^(<?)(\d+)([●○])(>?)$/.exec(t); return q ? { v: +q[2], closed: q[3] === '●', dir: q[1] ? '<' : q[4] ? '>' : '' } : null; });
  if (marks.some((k) => !k || k.v <= lo || k.v >= hi || (k.v - lo) % step)) return null;
  if (marks.length === 1 && !marks[0].dir) return null;                                   // 점 하나면 어느 쪽인지 있어야
  if (marks.length === 2 && (marks[0].dir || marks[1].dir || marks[0].v >= marks[1].v)) return null; // 둘이면 작은 수부터, 방향 없이
  return { lo, hi, step, marks };
}
/** ●/○ 수직선 SVG — 칠한 범위는 두 점 사이, 또는 점에서 한쪽 끝(화살표)까지 */
export function rangeSvg(spec) {
  const { lo, hi, step, marks } = spec;
  const n = (hi - lo) / step;
  const TW = Math.min(30, Math.floor(340 / n)); const pad = 24;
  const len = n * TW; const W = len + pad * 2; const H = 58; const y = 26;
  const pos = (v) => pad + ((v - lo) / step) * TW;
  let g = `<line x1="${pad - 12}" y1="${y}" x2="${pad + len + 12}" y2="${y}" stroke="${LINE_STROKE}" stroke-width="1.5"/>`;
  g += `<path d="M ${pad + len + 12} ${y} l -6 -4 v 8 z" fill="currentColor"/>`;
  for (let k = 0; k <= n; k++) {
    const v = lo + k * step;
    g += `<line x1="${pos(v)}" y1="${y - 5}" x2="${pos(v)}" y2="${y + 5}" stroke="${LINE_STROKE}" stroke-width="1.2"/>`;
    g += `<text class="range-tick" x="${pos(v)}" y="${y + 22}" font-size="12" text-anchor="middle" fill="currentColor">${v}</text>`;
  }
  // 칠한 범위 — 점 둘이면 그 사이, 하나면 그 점에서 끝까지(화살표 쪽 끝을 넘겨 "계속"으로)
  const [a, b] = marks;
  const x1 = b ? pos(a.v) : a.dir === '<' ? pad - 12 : pos(a.v);
  const x2 = b ? pos(b.v) : a.dir === '<' ? pos(a.v) : pad + len + 12;
  g += `<line class="range-span" x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="${FILL}" stroke-width="6" stroke-linecap="round" opacity="0.85"/>`;
  if (!b) g += a.dir === '<' ? `<path d="M ${pad - 16} ${y} l 8 -6 v 12 z" fill="${FILL}"/>` : `<path d="M ${pad + len + 16} ${y} l -8 -6 v 12 z" fill="${FILL}"/>`;
  for (const k of marks) {
    g += `<circle class="range-dot ${k.closed ? 'closed' : 'open'}" data-v="${k.v}" cx="${pos(k.v)}" cy="${y}" r="7" fill="${k.closed ? FILL : '#fff'}" stroke="${FILL}" stroke-width="2.5"/>`;
  }
  // 보이는 크기는 1.3배 — 그린 크기(200~390px)면 태블릿에서 눈금 글자 12px·점 지름 14px로 작다 (헤드리스 800px).
  // 📊 K처럼 CSS로 400px에 맞추면 칸이 적은 수직선(5칸 198px)만 두 배가 되어 그림마다 글자 크기가 달라진다. 폭이 좁으면 max-width로 줄어든다
  return `<svg class="frac-fig range-fig" viewBox="0 0 ${W} ${H}" width="${Math.round(W * 1.3)}" height="${Math.round(H * 1.3)}" role="img" aria-label="${rangeText(spec)}">${g}</svg>`;
}
/** ●/○ 수직선을 글로 — 이상·초과 같은 말은 쓰지 않는다(그걸 읽는 게 문제다) */
export function rangeText(spec) {
  const pts = spec.marks.map((k) => `${k.v}에 ${k.closed ? '●' : '○'}`).join(', ');
  const span = spec.marks.length === 2 ? '사이를 칠함' : spec.marks[0].dir === '<' ? '왼쪽으로 칠함' : '오른쪽으로 칠함';
  return `수직선 ${spec.lo}~${spec.hi}: ${pts} — ${span}`;
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

// ───────────────────── 🔢 규칙과 대응 줄기: 대응표 · 도형 배열 ─────────────────────
// 대응표는 **문제 글 안에** 지시문으로 적는다 — 🔁 쌍둥이 열쇠(tplKey)·❓ 아빠에게 묻기 복사문·테스트가 모두 글에서 표를 읽는다.

const esc = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
/** 글자 폭 어림 — 한글·□△는 넓게 */
const textW = (t, size) => [...String(t)].reduce((w, ch) => w + (/[ㄱ-힝□△○☆]/.test(ch) ? size * 1.05 : size * 0.62), 0);

/**
 * 대응표 — 두 줄(이상). 첫 칸은 이름, 나머지는 값. '?'는 물어보는 칸(색칠).
 * @param {Array<{label:string, vals:Array<number|string>}>} rows
 */
export function tableSvg(rows) {
  const list = (rows || []).filter((r) => r && r.label && Array.isArray(r.vals) && r.vals.length);
  if (list.length < 2) return '';
  const n = list[0].vals.length;
  if (list.some((r) => r.vals.length !== n) || n < 2 || n > 7) return '';
  // 태블릿에서 아이가 읽는 크기 — 문제 글(1.1rem)보다 작지 않게 (헤드리스에서 □·△가 작아 보여 키움)
  const LF = 15; const VF = 17; const rowH = 38;
  const labelW = Math.round(Math.min(180, Math.max(48, ...list.map((r) => textW(r.label, LF) + 18))));
  const cellW = Math.round(Math.max(46, ...list.flatMap((r) => r.vals.map((v) => textW(v, VF) + 20))));
  const W = labelW + n * cellW; const H = list.length * rowH;
  let g = '';
  list.forEach((r, i) => {
    const y = i * rowH;
    g += `<rect x="0" y="${y}" width="${labelW}" height="${rowH}" fill="${EMPTY}" stroke="currentColor" stroke-opacity="0.55" stroke-width="1"/>`;
    g += `<text x="${labelW / 2}" y="${y + rowH / 2 + 4}" font-size="${LF}" text-anchor="middle" fill="currentColor" font-weight="700">${esc(r.label)}</text>`;
    r.vals.forEach((v, j) => {
      const x = labelW + j * cellW; const ask = v === '?';
      g += `<rect x="${x}" y="${y}" width="${cellW}" height="${rowH}" fill="${ask ? FILL2 : 'none'}" fill-opacity="${ask ? 0.35 : 1}" stroke="currentColor" stroke-opacity="0.55" stroke-width="1"/>`;
      g += `<text x="${x + cellW / 2}" y="${y + rowH / 2 + 5}" font-size="${VF}" text-anchor="middle" fill="currentColor" font-weight="${ask ? 700 : 400}">${esc(v)}</text>`;
    });
  });
  const label = list.map((r) => `${r.label} ${r.vals.join(', ')}`).join(' / ');
  // 바깥 테두리 선의 반이 그림 밖으로 나가 잘리지 않게 사방 1px 여백
  return `<svg class="frac-fig table-fig" viewBox="-1 -1 ${W + 2} ${H + 2}" width="${W + 2}" height="${H + 2}" role="img" aria-label="표: ${esc(label)}"><g shape-rendering="crispEdges">${g}</g></svg>`;
}

/**
 * 도형 배열 — 1번째, 2번째… 모양의 블록 수 (늘어나는 수가 늘 같아야 한다).
 * 늘어나는 수 d만큼의 기둥이 모양마다 하나씩 늘고, 처음에 남는 칸(첫째 − d)은 다른 색 기둥으로 —
 * "처음에 남는 수 + 늘어나는 수 × 몇 번째"가 눈에 보인다 (3, 5, 7 → 1 + 2 × □).
 * 첫째가 d보다 작으면(2, 5, 8) 첫 모양은 **짧은 파란 기둥**으로 두고 d개 기둥을 (몇 번째 − 1)개 붙인다.
 * ★ 주황은 언제나 "처음에 남는 수(더하는 수)"만 뜻한다 — 전에는 이 경우 첫 모양 전체를 주황으로 칠해서
 *   H8에서 배운 "늘어나는 수 × 순서 + 주황"을 H2 그림에 쓰면 한 모양씩 어긋났다 (Codex 15차 #3)
 * @param {number[]} counts 2~5개
 */
export function stepsSvg(counts) {
  const cs = (counts || []).map(Number);
  if (cs.length < 2 || cs.length > 5 || cs.some((v) => !Number.isInteger(v) || v < 1 || v > 60)) return '';
  const d = cs[1] - cs[0];
  if (d < 1 || cs.some((v, i) => v !== cs[0] + i * d)) return '';
  const extra = cs[0] - d; // 처음에 남는 칸
  const base = extra >= 0 ? extra : cs[0];
  if (d > 10 || base > 10) return '';
  const T = 14; const colGap = 2; const figGap = 26; const pad = 6;
  const maxH = Math.max(d, base) * T;
  const top = pad; const bottom = top + maxH;
  let x = pad; let g = '';
  const column = (cx, k, fill) => {
    for (let i = 0; i < k; i++) g += `<rect x="${cx}" y="${bottom - (i + 1) * T}" width="${T}" height="${T}" fill="${fill}" stroke="currentColor" stroke-opacity="0.55" stroke-width="1"/>`;
  };
  cs.forEach((_, i) => {
    const k = i + 1; const x0 = x;
    if (base > 0) { column(x, base, extra >= 0 ? FILL2 : FILL); x += T + colGap; }
    const cols = extra >= 0 ? k : k - 1;
    for (let j = 0; j < cols; j++) { column(x, d, FILL); x += T + colGap; }
    const w = x - colGap - x0;
    g += `<text x="${(x0 + w / 2).toFixed(1)}" y="${bottom + 16}" font-size="12" text-anchor="middle" fill="currentColor">${k}번째</text>`;
    x += figGap - colGap;
  });
  const W = Math.round(x - figGap + colGap + pad); const H = bottom + 22;
  return `<svg class="frac-fig steps-fig" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="도형 배열: ${cs.map((v, i) => `${i + 1}번째 ${v}개`).join(', ')}"><g shape-rendering="crispEdges">${g}</g></svg>`;
}

/** `table 탁자 수(개):1,2,3 / 의자 수(개):4,8,?` → 줄 목록 (못 읽으면 null) */
export function parseTable(arg) {
  const rows = String(arg || '').split(/\s+\/\s+/).map((part) => {
    const m = /^(.+?):\s*((?:\d+|\?)(?:\s*,\s*(?:\d+|\?))+)$/.exec(part.trim());
    return m ? { label: m[1].trim(), vals: m[2].split(/\s*,\s*/).map((v) => (v === '?' ? '?' : Number(v))) } : null;
  });
  return rows.length >= 2 && rows.every(Boolean) ? rows : null;
}

// ───────────────────── 🔺 다각형의 둘레와 넓이 줄기: 도형 ─────────────────────
// 문제 글 속 지시문으로 적는다 (대응표와 같은 이유 — 🔁 열쇠·❓ 복사문·테스트가 글에서 도형을 읽는다).
// ★ 실제 비율로 그린다. 비스듬한 변의 길이는 정수일 때만 적는다 — 생성기는 3·4·5 같은 세 수로만 고르므로
//   "옆변 5 cm · 높이 4 cm"가 그림에서도 참이다 (그림이 거짓말하면 "옆변을 높이로" 오개념을 오히려 가르친다).

const len = (a, b) => Math.hypot(b[0] - a[0], b[1] - a[1]);
const intLen = (a, b) => { const d = len(a, b); return Math.abs(d - Math.round(d)) < 1e-9 ? Math.round(d) : null; };

/**
 * 도형 한 개 — 꼭짓점(단위 좌표, y는 위로) · 변 이름표 · 점선(높이·대각선, 주황) · 직각 표시 · 같은 변 눈금
 * @param {{pts:number[][], labels?:Array<{i:number, text:string}>, dashes?:Array<{a:number[], b:number[], text?:string, side?:'l'|'r'|'t'|'tr', at?:number, alts?:Array<{side:string, at?:number}>}>,
 *          marks?:number[][], ticks?:boolean, aria:string}} o
 */
/** 도형 단위 1이 몇 px인지 — 가장 긴 쪽이 250px, 한 칸은 30px까지 (lshapeSvg가 이름표 자리를 정할 때도 쓴다) */
const shapeScale = (span) => Math.min(30, 250 / Math.max(span, 1));
/** 이름표 글자 폭 어림 (15px 글꼴: 숫자·영문 ≈ 8px, 한글·ㄱ·㉮ ≈ 15px) */
const labelW = (t) => [...String(t)].reduce((a, ch) => a + (/[ㄱ-ㅎ가-힣㉠-㉯°]/.test(ch) ? (ch === '°' ? 6 : 15) : 8.2), 0);
/** 선분이 상자 안을 지나는가 (리앙-바스키) — 점선 이름표 자리 고르기 */
function segHitsBox([a, b], B) {
  let t0 = 0; let t1 = 1; const dx = b[0] - a[0]; const dy = b[1] - a[1];
  for (const [p, q] of [[-dx, a[0] - B.x0], [dx, B.x1 - a[0]], [-dy, a[1] - B.y0], [dy, B.y1 - a[1]]]) {
    if (p === 0) { if (q < 0) return false; continue; }
    const r = q / p;
    if (p < 0) { if (r > t1) return false; if (r > t0) t0 = r; } else { if (r < t0) return false; if (r < t1) t1 = r; }
  }
  return true;
}
function polySvg(o) {
  const all = [...o.pts, ...(o.dashes || []).flatMap((d) => [d.a, d.b])];
  const xs = all.map((p) => p[0]); const ys = all.map((p) => p[1]);
  const minX = Math.min(...xs); const maxX = Math.max(...xs); const minY = Math.min(...ys); const maxY = Math.max(...ys);
  const span = Math.max(maxX - minX, maxY - minY, 1);
  // 태블릿(800px)에서 210px·13px 이름표는 본문 글자보다 작았다 (I 줄기 헤드리스) — 폰에서는 max-width: 100%로 줄어든다
  const k = shapeScale(span); const pad = 52;
  const X = (x) => pad + (x - minX) * k; const Y = (y) => pad + (maxY - y) * k;
  const W = Math.round((maxX - minX) * k + pad * 2); const H = Math.round((maxY - minY) * k + pad * 2);
  let sa = 0;
  o.pts.forEach((p, i) => { const q = o.pts[(i + 1) % o.pts.length]; sa += p[0] * q[1] - q[0] * p[1]; });
  const ccw = sa > 0;
  const f = (v) => v.toFixed(1);
  let g = '';
  // 📐 모눈 — 꼭짓점이 모눈점인 도형(J 줄기): 평행·수직·같은 길이를 칸으로 셀 수 있게 도형 둘레 한 칸까지
  if (o.grid) {
    const gx = o.pts.map((p) => p[0]); const gy = o.pts.map((p) => p[1]);
    const x0 = Math.floor(Math.min(...gx)) - 1; const x1 = Math.ceil(Math.max(...gx)) + 1;
    const y0 = Math.floor(Math.min(...gy)) - 1; const y1 = Math.ceil(Math.max(...gy)) + 1;
    for (let x = x0; x <= x1; x++) g += `<line x1="${f(X(x))}" y1="${f(Y(y0))}" x2="${f(X(x))}" y2="${f(Y(y1))}" stroke="currentColor" stroke-opacity="0.16" stroke-width="1"/>`;
    for (let y = y0; y <= y1; y++) g += `<line x1="${f(X(x0))}" y1="${f(Y(y))}" x2="${f(X(x1))}" y2="${f(Y(y))}" stroke="currentColor" stroke-opacity="0.16" stroke-width="1"/>`;
  }
  g += `<polygon points="${o.pts.map((p) => `${f(X(p[0]))},${f(Y(p[1]))}`).join(' ')}" fill="${FILL}" fill-opacity="0.16" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>`;
  const text = (x, y, t, anchor = 'middle', color = 'currentColor') => `<text x="${f(x)}" y="${f(y)}" font-size="15" text-anchor="${anchor}" fill="${color}" font-weight="600">${esc(t)}</text>`;
  // 이름표 글자 상자 어림 (15px 글꼴: 기준선 위 11px · 아래 3px), grow만큼 넓혀 여유를 둔다
  const boxAt = ([x, y, anchor], t, grow = 0) => {
    const w = labelW(t); const x0 = anchor === 'middle' ? x - w / 2 : anchor === 'end' ? x - w : x;
    return { x0: x0 - grow, x1: x0 + w + grow, y0: y - 11 - grow, y1: y + 3 + grow };
  };
  const P = (p) => [X(p[0]), Y(p[1])];
  const outline = o.pts.map((p, i) => [P(p), P(o.pts[(i + 1) % o.pts.length])]);
  const dashSegs = (o.dashes || []).map((d) => [P(d.a), P(d.b)]);
  const overlap = (a, b) => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;
  const busy = (o.marks || []).map((m) => { const [x, y] = P(m); return { x0: x - 1, x1: x + 10, y0: y - 10, y1: y + 1 }; }); // 직각 표시

  // 변 이름표 — 변의 바깥쪽 (먼저 자리를 정해 두고, 점선 이름표가 이것을 피한다)
  const n = o.pts.length;
  const sides = o.pts.map((a, i) => {
    const b = o.pts[(i + 1) % n];
    const dx = b[0] - a[0]; const dy = b[1] - a[1]; const L2 = Math.hypot(dx, dy) || 1;
    const nx = (ccw ? dy : -dy) / L2; const ny = (ccw ? -dx : dx) / L2; // 바깥쪽 (단위 좌표, y는 위로)
    const lb = (o.labels || []).find((l) => l.i === i);
    // 가파른 변 옆 이름표는 글자 폭의 반만큼 더 떨어뜨린다 — 20px 고정이면 "13 cm"가 변에 닿았다 (가로 변은 그대로 20)
    const t = lb && lb.at !== undefined ? lb.at : 0.5;
    const off = lb && lb.off ? lb.off : Math.max(20, 8 + (Math.abs(nx) * labelW(lb ? lb.text : '')) / 2 + Math.abs(ny) * 8);
    const mx = X(a[0] + dx * t); const my = Y(a[1] + dy * t);
    const at = lb ? [mx + nx * off, my - ny * off + 4, 'middle'] : null;
    if (at) busy.push(boxAt(at, lb.text));
    return { lb, nx, ny, mx, my, at, dx, dy, L2 };
  });

  // 📐 꼭짓점 이름(ㄱ ㄴ ㄷ …)은 도형 바깥, 각 표시(호·직각 네모)와 각도는 도형 안쪽 — J 줄기
  const unit = (x, y) => { const d = Math.hypot(x, y) || 1; return [x / d, y / d]; };
  const toUnit = (px, py) => [minX + (px - pad) / k, maxY - (py - pad) / k];
  const insidePoly = ([x, y]) => { let c = false; for (let i = 0, j = n - 1; i < n; j = i++) { const [xi, yi] = o.pts[i]; const [xj, yj] = o.pts[j]; if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c; } return c; };
  const corner = (i) => {
    const [cx, cy] = P(o.pts[i]); const [px, py] = P(o.pts[(i + n - 1) % n]); const [qx, qy] = P(o.pts[(i + 1) % n]);
    const u = unit(px - cx, py - cy); const v = unit(qx - cx, qy - cy);
    let b = unit(u[0] + v[0], u[1] + v[1]);
    if (!insidePoly(toUnit(cx + b[0] * 4, cy + b[1] * 4))) b = [-b[0], -b[1]]; // 오목한 꼭짓점이면 반대가 안쪽
    const th = Math.acos(Math.max(-1, Math.min(1, u[0] * v[0] + u[1] * v[1])));
    return { cx, cy, u, v, b, th };
  };
  let extra = '';
  for (const nm of o.names || []) {
    // ㄱ·ㄴ 같은 자모는 같은 크기에서 숫자보다 작아 보인다 → 18px
    const { cx, cy, b } = corner(nm.i);
    const at = [cx - b[0] * 19, cy - b[1] * 19 + 6, 'middle'];
    busy.push(boxAt(at, nm.text, 1));
    extra += `<text x="${f(at[0])}" y="${f(at[1])}" font-size="18" text-anchor="middle" fill="currentColor" font-weight="700">${esc(nm.text)}</text>`;
  }
  for (const an of o.angles || []) {
    const { cx, cy, u, v, b, th } = corner(an.i);
    if (an.right) extra += `<path d="M ${f(cx + u[0] * 11)} ${f(cy + u[1] * 11)} L ${f(cx + (u[0] + v[0]) * 11)} ${f(cy + (u[1] + v[1]) * 11)} L ${f(cx + v[0] * 11)} ${f(cy + v[1] * 11)}" fill="none" stroke="${FILL2}" stroke-width="1.4"/>`;
    else extra += `<path d="M ${f(cx + u[0] * 16)} ${f(cy + u[1] * 16)} A 16 16 0 0 ${u[0] * v[1] - u[1] * v[0] > 0 ? 1 : 0} ${f(cx + v[0] * 16)} ${f(cy + v[1] * 16)}" fill="none" stroke="${FILL2}" stroke-width="1.4"/>`;
    if (!an.text) continue;
    // 좁은 각·넓은 글자일수록 안쪽으로 더 — 글자 반폭 + 여유가 두 변 사이에 들어가게 ("100°"가 변에 닿았다)
    const d = Math.min(80, Math.max(30, (labelW(an.text) / 2 + 9) / Math.sin(th / 2)));
    const at = [cx + b[0] * d, cy + b[1] * d + 5, 'middle'];
    busy.push(boxAt(at, an.text));
    extra += text(at[0], at[1], an.text, 'middle', FILL2);
  }

  // 점선 이름표(높이·대각선) — 후보 자리(side·at, 그다음 alts)를 차례로 보고, 도형 변·다른 점선·직각 표시·다른 이름표·그림 밖에
  // 가장 적게 걸리는 첫 자리 (Codex 16차 #4: 마름모 80개 중 50개에서 대각선 이름표가 변을 가로질렀다)
  const dashAt = (d, side, at) => {
    const t = at === undefined ? 0.5 : at;
    const mx = X(d.a[0] + (d.b[0] - d.a[0]) * t); const my = Y(d.a[1] + (d.b[1] - d.a[1]) * t);
    if (side === 'l') return [mx - 6, my + 4, 'end'];
    if (side === 't') return [mx, my - 7, 'middle'];
    if (side === 'tr') return [mx + 6, my - 7, 'start'];
    return [mx + 6, my + 4, 'start'];
  };
  const dashText = (o.dashes || []).map((d, di) => {
    if (!d.text) return '';
    let best = null;
    for (const c of [{ side: d.side, at: d.at }, ...(d.alts || [])]) {
      const at = dashAt(d, c.side, c.at);
      // 실제로 걸리는 것(여유 0)이 먼저, 2px 여유가 없는 것은 그다음 — 딱 맞게 들어가는 자리를 버리고 더 나쁜 자리로 가지 않게
      const hits = (B) => [...outline, ...dashSegs.filter((_, j) => j !== di)].filter((s) => segHitsBox(s, B)).length
        + busy.filter((q) => overlap(q, B)).length + (B.x0 < 0 || B.y0 < 0 || B.x1 > W || B.y1 > H ? 1 : 0);
      const cost = hits(boxAt(at, d.text, -1)) * 10 + hits(boxAt(at, d.text, 2));
      if (!best || cost < best.cost) best = { at, cost };
      if (!cost) break;
    }
    busy.push(boxAt(best.at, d.text));
    return text(best.at[0], best.at[1], d.text, best.at[2], FILL2);
  });

  (o.dashes || []).forEach((d, di) => {
    g += `<line x1="${f(X(d.a[0]))}" y1="${f(Y(d.a[1]))}" x2="${f(X(d.b[0]))}" y2="${f(Y(d.b[1]))}" stroke="${FILL2}" stroke-width="1.8" stroke-dasharray="5 4"/>`;
    g += dashText[di];
  });
  for (const m of o.marks || []) {
    const x = X(m[0]); const y = Y(m[1]);
    g += `<path d="M ${f(x)} ${f(y - 9)} h 9 v 9" fill="none" stroke="${FILL2}" stroke-width="1.4"/>`;
  }
  sides.forEach((s, i) => {
    // 같은 변 눈금 — ticks면 모든 변에 하나씩, tickSides면 고른 변에 n개씩 (📐 이등변삼각형의 같은 두 변)
    const tk = o.ticks ? 1 : ((o.tickSides || []).find((t) => t.i === i) || { n: 0 }).n;
    for (let j = 0; j < tk; j++) {
      const sh = (j - (tk - 1) / 2) * 5; const tx = s.mx + (s.dx / s.L2) * sh; const ty = s.my - (s.dy / s.L2) * sh; // 변을 따라 5px 간격
      g += `<line x1="${f(tx - s.nx * 5)}" y1="${f(ty + s.ny * 5)}" x2="${f(tx + s.nx * 5)}" y2="${f(ty - s.ny * 5)}" stroke="currentColor" stroke-width="1.4"/>`;
    }
    if (s.lb) g += text(s.at[0], s.at[1], s.lb.text);
  });
  g += extra;
  return `<svg class="frac-fig shape-fig" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${esc(o.aria)}"><g>${g}</g></svg>`;
}
const ul = (v, u) => `${v} ${u}`; // 길이 이름표 "8 cm"
/** 높이 점선(위 → 아래) 이름표 후보 — 오른쪽 가운데가 안 되면 왼쪽, 그다음은 아래쪽(밑변 쪽이 넓은 도형이 많다) */
const HEIGHT_ALTS = [{ side: 'l', at: 0.5 }, { side: 'r', at: 0.7 }, { side: 'l', at: 0.7 }, { side: 'r', at: 0.85 }, { side: 'l', at: 0.85 }, { side: 'r', at: 0.3 }, { side: 'l', at: 0.3 }];

/** 직사각형 — 가로 w · 세로 h (hideH면 세로 이름표를 "?"로: 넓이로 세로를 거꾸로 구하는 문항) */
export function rectSvg(w, h, u = 'cm', hideH = false) {
  const pts = [[0, 0], [w, 0], [w, h], [0, h]];
  return polySvg({ pts, labels: [{ i: 0, text: ul(w, u) }, { i: 1, text: ul(hideH ? '?' : h, u) }], marks: [[0, 0]], aria: `직사각형 가로 ${w} ${u}, 세로 ${hideH ? '?' : h} ${u}` });
}
/** 정다각형 — 변 n개, 한 변 s. 아래 변이 바닥에 놓이고 모든 변에 같은 길이 눈금 */
export function regSvg(n, s, u = 'cm') {
  const R = s / (2 * Math.sin(Math.PI / n));
  const pts = Array.from({ length: n }, (_, i) => { const t = -Math.PI / 2 - Math.PI / n + (2 * Math.PI * i) / n; return [R * Math.cos(t), R * Math.sin(t)]; });
  return polySvg({ pts, labels: [{ i: 0, text: ul(s, u) }], ticks: true, aria: `정다각형 변 ${n}개, 한 변 ${s} ${u}` });
}
/** 평행사변형 — 밑변 b · 높이 h · 윗변이 오른쪽으로 s만큼 밀림. 옆변 길이는 정수일 때만 적는다 */
export function paraSvg(b, h, s, u = 'cm') {
  const pts = [[0, 0], [b, 0], [b + s, h], [s, h]];
  const sl = intLen(pts[3], pts[0]);
  const labels = [{ i: 0, text: ul(b, u) }];
  if (s > 0 && sl !== null) labels.push({ i: 3, text: ul(sl, u) });
  const dashes = s > 0 ? [{ a: [s, h], b: [s, 0], text: ul(h, u), side: 'r', alts: HEIGHT_ALTS }] : [];
  if (!s) labels.push({ i: 3, text: ul(h, u) });
  return polySvg({ pts, labels, dashes, marks: [[s, 0]], aria: `평행사변형 밑변 ${b} ${u}, 높이 ${h} ${u}${s > 0 && sl !== null ? `, 옆변 ${sl} ${u}` : ''}` });
}
/** 삼각형 — 밑변 b · 높이 h · 꼭짓점이 왼쪽 끝에서 p만큼 오른쪽 (0 < p < b면 높이가 삼각형 안). 왼쪽 옆변은 정수일 때만 적는다 */
export function triSvg(b, h, p, u = 'cm') {
  const pts = [[0, 0], [b, 0], [p, h]];
  const sl = intLen(pts[2], pts[0]);
  const labels = [{ i: 0, text: ul(b, u) }];
  if (p > 0 && sl !== null) labels.push({ i: 2, text: ul(sl, u) });
  // 높이 이름표는 점선 오른쪽 가운데부터 — 꼭짓점이 오른쪽 끝 가까이면(6 12 5) 오른쪽 변이 "12 cm"를 가로질러 왼쪽·아래 후보로 간다
  const dashes = p > 0 ? [{ a: [p, h], b: [p, 0], text: ul(h, u), side: 'r', alts: HEIGHT_ALTS }] : [];
  if (!p) labels.push({ i: 2, text: ul(h, u) });
  return polySvg({ pts, labels, dashes, marks: [[p, 0]], aria: `삼각형 밑변 ${b} ${u}, 높이 ${h} ${u}${p > 0 && sl !== null ? `, 옆변 ${sl} ${u}` : ''}` });
}
/** 마름모 — 대각선 d1(가로) · d2(세로), 한 변은 정수일 때만 적는다 (hide2면 세로 대각선을 "?") */
export function rhomSvg(d1, d2, u = 'cm', hide2 = false) {
  const pts = [[0, d2 / 2], [d1 / 2, 0], [d1, d2 / 2], [d1 / 2, d2]];
  const sl = intLen(pts[0], pts[1]);
  const labels = sl !== null && !hide2 ? [{ i: 0, text: ul(sl, u) }] : [];
  // 가로 대각선: 가운데 오른쪽 위부터 → 조금 더 오른쪽 → 오른쪽 꼭짓점 바깥
  // 세로 대각선: 위쪽 → 아래쪽(가운데 아래는 넓다) → 위 꼭짓점 바깥 위 (납작하거나 좁은 마름모)
  const dashes = [
    { a: [0, d2 / 2], b: [d1, d2 / 2], text: ul(d1, u), side: 'tr', at: 0.5, alts: [{ side: 'tr', at: 0.6 }, { side: 'tr', at: 0.7 }, { side: 'r', at: 1 }] },
    { a: [d1 / 2, 0], b: [d1 / 2, d2], text: ul(hide2 ? '?' : d2, u), side: 'r', at: 0.8, alts: [{ side: 'r', at: 0.3 }, { side: 'r', at: 0.22 }, { side: 'r', at: 0.7 }, { side: 't', at: 1 }] },
  ];
  return polySvg({ pts, labels, dashes, marks: [[d1 / 2, d2 / 2]], aria: `마름모 대각선 ${d1} ${u}, ${hide2 ? '?' : d2} ${u}${sl !== null && !hide2 ? `, 한 변 ${sl} ${u}` : ''}` });
}
/** 사다리꼴 — 윗변 a · 아랫변 b · 높이 h · 윗변 왼쪽 끝이 s만큼 오른쪽 (s = 0이면 직각사다리꼴) */
export function trapSvg(a, b, h, s, u = 'cm') {
  const pts = [[0, 0], [b, 0], [s + a, h], [s, h]];
  const sl = intLen(pts[3], pts[0]);
  const labels = [{ i: 0, text: ul(b, u) }, { i: 2, text: ul(a, u) }];
  if (s > 0 && sl !== null) labels.push({ i: 3, text: ul(sl, u) });
  if (!s) labels.push({ i: 3, text: ul(h, u) });
  const dashes = s > 0 ? [{ a: [s, h], b: [s, 0], text: ul(h, u), side: 'r', alts: HEIGHT_ALTS }] : [];
  return polySvg({ pts, labels, dashes, marks: [[s, 0]], aria: `사다리꼴 윗변 ${a} ${u}, 아랫변 ${b} ${u}, 높이 ${h} ${u}${s > 0 && sl !== null ? `, 옆변 ${sl} ${u}` : ''}` });
}
/** ㄴ자 모양 — W × H 직사각형에서 오른쪽 위 w × h를 떼어 냄. 여섯 변 모두 이름표 */
export function lshapeSvg(W, H, w, h, u = 'cm') {
  const pts = [[0, 0], [W, 0], [W, H - h], [W - w, H - h], [W - w, H], [0, H]];
  // 안쪽 모서리의 두 변(떼어 낸 w·h)은 이름표를 모서리에서 멀리 — 가운데 두면 두 이름표가 붙는다
  // 떼어 낸 곳이 작으면(한쪽이 70px 미만) 그 안에 두 이름표가 들어가지 않아 겹쳤다(2 × 2) → 둘 다 도형 안쪽으로
  const k = shapeScale(Math.max(W, H));
  const small = Math.min(w, h) * k < 70;
  const inner = (i, v) => (i === 2 ? (small ? { at: 0.5, off: -18 } : { at: 0.25, off: 14 }) : small ? { at: 0.5, off: -(10 + labelW(ul(v, u)) / 2) } : { at: 0.75, off: 16 });
  const labels = [W, H - h, w, h, W - w, H].map((v, i) => ({ i, text: ul(v, u), ...(i === 2 || i === 3 ? inner(i, v) : {}) }));
  return polySvg({ pts, labels, aria: `ㄴ자 모양 가로 ${W} ${u}, 세로 ${H} ${u}, 떼어 낸 부분 ${w} ${u} × ${h} ${u}` });
}
/** 모눈 — 한 칸 1 cm². W × H 직사각형(오른쪽 위 w × h를 떼어 낼 수 있음)을 칠하고 둘레 한 칸 여유까지 옅은 모눈 */
export function gridSvg(W, H, w = 0, h = 0) {
  const C = 26; const pad = 8; // 태블릿에서 칸을 세기 쉽게 (22 → 26)
  const cols = W + 2; const rows = H + 2;
  const Wp = cols * C + pad * 2; const Hp = rows * C + pad * 2;
  let g = '';
  for (let r = 0; r <= rows; r++) g += `<line x1="${pad}" y1="${pad + r * C}" x2="${pad + cols * C}" y2="${pad + r * C}" stroke="currentColor" stroke-opacity="0.18" stroke-width="1"/>`;
  for (let c = 0; c <= cols; c++) g += `<line x1="${pad + c * C}" y1="${pad}" x2="${pad + c * C}" y2="${pad + rows * C}" stroke="currentColor" stroke-opacity="0.18" stroke-width="1"/>`;
  let cells = 0;
  for (let r = 0; r < H; r++) {
    for (let c = 0; c < W; c++) {
      if (c >= W - w && r < h) continue; // 오른쪽 위를 떼어 냄 (r = 0이 맨 위 줄)
      cells++;
      g += `<rect x="${pad + (c + 1) * C}" y="${pad + (r + 1) * C}" width="${C}" height="${C}" fill="${FILL}" fill-opacity="0.35" stroke="currentColor" stroke-opacity="0.5" stroke-width="1"/>`;
    }
  }
  return `<svg class="frac-fig grid-fig" viewBox="0 0 ${Wp} ${Hp}" width="${Wp}" height="${Hp}" role="img" aria-label="모눈 ${cells}칸"><g shape-rendering="crispEdges">${g}</g></svg>`;
}

// ───────────────────── 📐 삼각형·사각형 줄기(J): 모눈 위 도형·직선, 세 변·세 각 삼각형, 네 각 사각형 ─────────────────────
// 모눈 위 도형은 꼭짓점이 모눈점이다 — 평행·수직·같은 길이를 아이가 칸을 세어 확인할 수 있고, 그림이 거짓말하지 않는다.
// 각도로 주는 삼각형·사각형은 그 각 그대로 그린다 (테스트가 그림의 꼭짓점에서 각을 다시 잰다).

/** 꼭짓점 이름 */
export const VNAMES = ['ㄱ', 'ㄴ', 'ㄷ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅅ', 'ㅇ'];

/** 모눈 위 다각형 — verts: [{name, x, y}] (이름은 없어도 된다) */
export function gpolySvg(verts) {
  const names = verts.map((v, i) => (v.name ? { i, text: v.name } : null)).filter(Boolean);
  return polySvg({ pts: verts.map((v) => [v.x, v.y]), grid: true, names, aria: `모눈 위 도형 ${verts.map((v) => `${v.name || ''}(${v.x}, ${v.y})`).join(' ')}` });
}

/**
 * 모눈 위 직선·선분 — items: [{label, x1, y1, x2, y2, len}] (모눈 한 칸 = 1 cm)
 * 이름표는 선의 끝 바깥쪽에, len이면 선분 가운데 옆에 "㉠ 4 cm"처럼 이름과 길이를 함께 (길이는 정수일 때만)
 */
export function linesSvg(W, H, items) {
  const C = Math.min(30, 300 / Math.max(W, H, 1)); const pad = 36;
  const X = (x) => pad + x * C; const Y = (y) => pad + (H - y) * C;
  const Wp = Math.round(W * C + pad * 2); const Hp = Math.round(H * C + pad * 2);
  const f = (v) => v.toFixed(1);
  let g = '';
  for (let x = 0; x <= W; x++) g += `<line x1="${f(X(x))}" y1="${f(Y(0))}" x2="${f(X(x))}" y2="${f(Y(H))}" stroke="currentColor" stroke-opacity="0.16" stroke-width="1"/>`;
  for (let y = 0; y <= H; y++) g += `<line x1="${f(X(0))}" y1="${f(Y(y))}" x2="${f(X(W))}" y2="${f(Y(y))}" stroke="currentColor" stroke-opacity="0.16" stroke-width="1"/>`;
  let labels = '';
  // 이름표는 후보 자리 중 그림 안에 들고 앞서 놓은 이름표와 안 겹치는 첫 자리 — 두 직선이 같은 점에서 끝나면 이름표가 겹쳤다
  // 직선 이름(㉮)은 꼭짓점 이름(ㄱ·ㄴ)과 같은 18px — 15px 동그라미 글자는 태블릿에서 속 글자가 너무 작았다 (J 헤드리스)
  const NAME_FS = 18;
  const placed = [];
  // 다른 직선도 피한다 — 한 직선의 끝이 다른 직선 위에 있으면 이름표가 그 직선에 얹혀 어느 선의 이름인지 헷갈렸다 (직선 그림의 1.4%)
  const segs = items.map((it) => [[X(it.x1), Y(it.y1)], [X(it.x2), Y(it.y2)]]);
  const boxOf = (x, y, s, fs = 15) => { const w = (labelW(s) * fs) / 15; return { x0: x - w / 2, x1: x + w / 2, y0: y - (fs * 16) / 15, y1: y + 3 }; };
  const inside = (B) => B.x0 >= 0 && B.y0 >= 0 && B.x1 <= Wp && B.y1 <= Hp && !placed.some((q) => B.x0 < q.x1 && q.x0 < B.x1 && B.y0 < q.y1 && q.y0 < B.y1);
  // 남의 선과는 여유 m px — 닿지만 않고 바짝 붙어도(끝이 남의 선 위, 두 선분이 엇갈리는 자리 옆) 어느 선 이름인지 헷갈린다. 제 선은 닿지만 않게
  const free = (B, m, own) => inside(B) && !segs.some((sg, i) => segHitsBox(sg, i === own ? B : { x0: B.x0 - m, x1: B.x1 + m, y0: B.y0 - m, y1: B.y1 + m }));
  const t = (x, y, s, color = 'currentColor', fs = 15) => `<text x="${f(x)}" y="${f(y)}" font-size="${fs}" text-anchor="middle" fill="${color}" font-weight="${fs === 15 ? 600 : 700}">${esc(s)}</text>`;
  // 점과 선분 사이 거리
  const pd = ([px, py], [[ax, ay], [bx, by]]) => {
    const vx = bx - ax; const vy = by - ay; const u = Math.max(0, Math.min(1, ((px - ax) * vx + (py - ay) * vy) / (vx * vx + vy * vy || 1)));
    return Math.hypot(px - ax - u * vx, py - ay - u * vy);
  };
  const put = (cands, s, color, fs, own) => {
    // 이름표 가운데에서 제 선이 남의 어느 선보다 6px 이상 가까운 자리 — 여유만 두면 두 선에서 같은 거리(두 선이 만나는 끝 옆)에 앉았다
    const mine = ([x, y]) => { const p = [x, y - fs * 0.265]; const d = pd(p, segs[own]); return segs.every((sg, i) => i === own || pd(p, sg) >= d + 6); }; // 글자 상자(기준선 위 0.73 · 아래 0.2)의 가운데
    // 남의 선과 여유 14px(제 선까지의 거리보다 멀게) → 5px → 닿지만 않게, 각각 "제 선이 더 가까운" 자리부터
    const ok = (m, near) => cands.find((c) => free(boxOf(c[0], c[1], s, fs), m, own) && (!near || mine(c)));
    const at = ok(14, true) || ok(5, true) || ok(0, true) || ok(14) || ok(5) || ok(0) || cands.find(([x, y]) => inside(boxOf(x, y, s, fs))) || cands[0];
    placed.push(boxOf(at[0], at[1], s, fs)); labels += t(at[0], at[1], s, color, fs);
  };
  items.forEach((it, own) => {
    g += `<line x1="${f(X(it.x1))}" y1="${f(Y(it.y1))}" x2="${f(X(it.x2))}" y2="${f(Y(it.y2))}" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>`;
    if (!it.label) return;
    const dx = X(it.x2) - X(it.x1); const dy = Y(it.y2) - Y(it.y1); const L = Math.hypot(dx, dy) || 1;
    if (it.len) {
      // 선분: 가운데 옆에 "㉠ 4 cm" — 왼쪽(위)이 좁으면 오른쪽(아래), 그다음 조금 위·아래로
      const d = Math.hypot(it.x2 - it.x1, it.y2 - it.y1); const r = Math.round(d);
      const s = Math.abs(d - r) < 1e-9 ? `${it.label} ${r} cm` : it.label;
      let nx = dy / L; let ny = -dx / L; if (nx > 0) { nx = -nx; ny = -ny; }
      const off = 10 + labelW(s) / 2 * Math.abs(nx) + 8 * Math.abs(ny);
      const cands = [];
      for (const tt of [0.5, 0.3, 0.7]) for (const sg of [1, -1]) cands.push([X(it.x1) + (X(it.x2) - X(it.x1)) * tt + sg * nx * off, Y(it.y1) + (Y(it.y2) - Y(it.y1)) * tt + sg * ny * off + 5]);
      put(cands, s, FILL2, 15, own);
    } else {
      // 직선: 끝 바깥쪽에 이름 — (x2, y2) 쪽이 막혔으면 (x1, y1) 쪽, 둘 다 막히면(끝이 남의 선 위) 끝에서 옆으로 조금 비킨 자리,
      // 그래도 막히면(양 끝이 모두 남의 선 위 — 끝 근처는 어디든 두 선이 만나는 자리) 선 안쪽의 옆자리
      const hw = (labelW(it.label) * NAME_FS) / 30;
      const off = 10 + hw * Math.abs(dx / L) + 10 * Math.abs(dy / L);
      const ends = [[X(it.x2) + (dx / L) * off, Y(it.y2) + (dy / L) * off + 6], [X(it.x1) - (dx / L) * off, Y(it.y1) - (dy / L) * off + 6]];
      const side = ends.flatMap(([x, y]) => [1, -1].map((sg) => [x + sg * (-dy / L) * 16, y + sg * (dx / L) * 16]));
      const po = 12 + hw * Math.abs(dy / L) + 10 * Math.abs(dx / L);
      const along = [0.85, 0.15, 0.7, 0.3].flatMap((tt) => [1, -1].map((sg) => [X(it.x1) + dx * tt + sg * (-dy / L) * po, Y(it.y1) + dy * tt + sg * (dx / L) * po + 6]));
      put([...ends, ...side, ...along], it.label, 'currentColor', NAME_FS, own);
    }
  });
  return `<svg class="frac-fig shape-fig lines-fig" viewBox="0 0 ${Wp} ${Hp}" width="${Wp}" height="${Hp}" role="img" aria-label="모눈 위 직선 ${items.map((i) => i.label).filter(Boolean).join(' ')}"><g>${g}${labels}</g></svg>`;
}

/** 세 변으로 그린 삼각형 ㄱㄴㄷ — 변 ㄱㄴ = a(밑변), ㄴㄷ = b, ㄷㄱ = c. ask: 숨길 변 번호(0·1·2, "? cm"). 같은 변에는 눈금 */
export function trisSvg(a, b, c, ask = -1) {
  const x = (a * a + c * c - b * b) / (2 * a); const y = Math.sqrt(Math.max(0, c * c - x * x));
  const pts = [[0, 0], [a, 0], [x, y]];
  const len = [a, b, c];
  const labels = len.map((v, i) => ({ i, text: ul(i === ask ? '?' : v, 'cm') }));
  const tickSides = len.map((v, i) => ({ i, n: len.filter((w) => w === v).length > 1 ? 1 : 0 })).filter((t) => t.n);
  return polySvg({ pts, labels, tickSides, names: VNAMES.slice(0, 3).map((t, i) => ({ i, text: t })), aria: `삼각형 세 변 ${len.map((v, i) => (i === ask ? '?' : v)).join(', ')} cm` });
}

/** 세 각으로 그린 삼각형 ㄱ(왼쪽 아래)·ㄴ(오른쪽 아래)·ㄷ — ang: [{v, mode:'val'|'ask'|'hide'}], iso면 변 ㄴㄷ·ㄷㄱ에 같은 변 눈금 */
export function triaSvg(ang, iso = false) {
  const [A, B, C] = ang.map((t) => (t.v * Math.PI) / 180);
  const side = (10 * Math.sin(B)) / Math.sin(C); // 변 ㄱㄷ (사인 법칙)
  const pts = [[0, 0], [10, 0], [side * Math.cos(A), side * Math.sin(A)]];
  return polySvg({
    pts, names: VNAMES.slice(0, 3).map((t, i) => ({ i, text: t })),
    angles: angleMarks(ang), tickSides: iso ? [{ i: 1, n: 1 }, { i: 2, n: 1 }] : [],
    aria: `삼각형 세 각 ${ang.map((t, i) => `${VNAMES[i]} ${t.mode === 'val' ? `${t.v}도` : t.mode === 'ask' ? '?' : '표시 없음'}`).join(', ')}`,
  });
}
function angleMarks(ang) {
  return ang.map((t, i) => (t.mode === 'hide' ? null : { i, text: t.mode === 'ask' ? '?' : `${t.v}°`, right: t.v === 90 && t.mode === 'val' })).filter(Boolean);
}

/**
 * 네 각으로 그린 사각형 ㄱ(왼쪽 아래)·ㄴ(오른쪽 아래)·ㄷ(오른쪽 위)·ㄹ(왼쪽 위) — 변 ㄱㄴ = 10, 변 ㄹㄱ 길이 p를 몇 가지 대 보며
 * 나머지 두 변이 알맞은 길이로 닫히는 모양을 찾는다. 평행사변형 각(ㄱ + ㄴ = 180°, ㄷ = ㄱ)이면 저절로 평행사변형, rh면 네 변을 같게(마름모).
 * 못 닫으면 null
 */
function quadPts(A, B, C, D, rh) {
  const rad = (d) => (d * Math.PI) / 180;
  const d2 = [Math.cos(rad(180 - B)), Math.sin(rad(180 - B))]; const d3 = [Math.cos(rad(360 - B - C)), Math.sin(rad(360 - B - C))];
  for (const p of rh ? [10] : [8, 7, 9, 6, 10, 5, 11, 12, 4, 13, 14, 3.5, 15]) {
    const D4 = [p * Math.cos(rad(A)), p * Math.sin(rad(A))]; // 꼭짓점 ㄹ
    // ㄴ + L2·d2 + L3·d3 = ㄹ  →  L2·d2 + L3·d3 = ㄹ − ㄴ
    const rx = D4[0] - 10; const ry = D4[1];
    const det = d2[0] * d3[1] - d3[0] * d2[1];
    if (Math.abs(det) < 1e-9) continue;
    const L2 = (rx * d3[1] - d3[0] * ry) / det; const L3 = (d2[0] * ry - rx * d2[1]) / det;
    if (L2 < 3 || L3 < 3 || L2 > 28 || L3 > 28) continue;
    if (rh && (Math.abs(L2 - 10) > 1e-6 || Math.abs(L3 - 10) > 1e-6)) return null;
    return [[0, 0], [10, 0], [10 + L2 * d2[0], L2 * d2[1]], D4];
  }
  return null;
}
export function quadSvg(ang, rh = false) {
  const pts = quadPts(...ang.map((t) => t.v), rh);
  if (!pts) return '';
  return polySvg({
    pts, names: VNAMES.slice(0, 4).map((t, i) => ({ i, text: t })), angles: angleMarks(ang),
    aria: `사각형 네 각 ${ang.map((t, i) => `${VNAMES[i]} ${t.mode === 'val' ? `${t.v}도` : t.mode === 'ask' ? '?' : '표시 없음'}`).join(', ')}`,
  });
}
/** "65" 보임 · "?65" 묻는 각(? 로 보임) · "_65" 표시 없음 → {v, mode} */
function angTokens(list, total) {
  const out = list.map((s) => { const m = /^([?_]?)(\d{1,3})$/.exec(s); return m ? { v: +m[2], mode: m[1] === '?' ? 'ask' : m[1] === '_' ? 'hide' : 'val' } : null; });
  if (out.some((t) => !t || t.v < 1 || t.v > 179) || out.reduce((a, t) => a + t.v, 0) !== total) return null;
  return out;
}

// ───────────────────── 📊 K 자료와 그래프 줄기: 막대·꺾은선·띠·원그래프 (2026-10-01) ─────────────────────
// 문제 글 속 지시문으로 적는다 (🔁 열쇠·❓ 복사문·테스트가 글에서 그래프를 읽는다):
//   [bgraph 2x5 명 사과:12 배:20 포도:? 귤:8]  막대그래프 — 눈금 한 칸 2, 이름 붙은 눈금은 5칸마다(0·10·20), 단위 명, ?는 안 그린 막대
//   [lgraph 5 kg ~25 1월:30 2월:35 3월:?]      꺾은선그래프 — ~25: 0부터 25까지를 물결선으로 줄임, ?는 안 찍은 점
//   [band 봄:30 여름:25 가을:35 겨울:?]          띠그래프 (백분율, 합 100 — ?는 나머지)
//   [pie 봄:30 여름:25 가을:35 겨울:10]          원그래프
// ★ 눈금 계산은 chartGeom 하나 — 점 찍기 위젯(화면)도 같은 자를 쓴다 (아이가 본 그림과 만지는 그림이 같은 눈금이어야 한다).
// ★ 값은 **눈금선 위에만** — 테스트가 SVG에서 막대 높이·점 위치를 재서 값으로 되돌린다(그림이 거짓말하면 읽기를 가르칠 수 없다).
// ★ 소수 눈금(0.1 L)은 정수로 바꿔 셈한다 (떠돌이 소수 오차 없이). 띠·원그래프는 칸마다 10% 이상(이름표가 칸 안에 들어간다).

const CHART_FILLS = ['var(--chart-1, #6366f1)', 'var(--chart-2, #f59e0b)', 'var(--chart-3, #10b981)', 'var(--chart-4, #ec4899)', 'var(--chart-5, #0ea5e9)', 'var(--chart-6, #a855f7)'];
/** 수 → 글 (소수 dec자리까지, 끝 0은 뗀다: 1.0 → 1) */
const fmtNum = (v, dec) => String(Number(Number(v).toFixed(dec)));
/** 수 + 단위 — 영문 단위(kg·L·cm)는 띄우고 한글 단위(명·개)는 붙인다 */
const withUnit = (v, u) => `${v}${/^[A-Za-z]/.test(u) ? ' ' : ''}${u}`;

/** "2x5" · "0.1x5" · "5" → {step, lab, dec} (lab = 이름 붙은 눈금 사이 칸 수) */
function parseStep(t) {
  const m = /^(\d+(?:\.\d+)?)(?:x(\d+))?$/.exec(t || '');
  if (!m) return null;
  const step = Number(m[1]); const lab = m[2] ? Number(m[2]) : 1;
  if (!(step > 0) || lab < 1 || lab > 10) return null;
  return { step, lab, dec: (m[1].split('.')[1] || '').length };
}

/**
 * 그래프 지시문 → 자료 (못 읽거나 말이 안 되면 null). 화면의 점 찍기 위젯도 이것으로 읽는다.
 * @param {'bgraph'|'lgraph'} kind
 * @returns {null | {kind, step, lab, dec, unit, base, items:Array<{label:string, v:number|null}>}}
 */
export function parseChart(kind, arg) {
  const t = String(arg || '').trim().split(/\s+/);
  const st = parseStep(t[0]);
  const unit = t[1];
  if (!st || !unit || /[:~]/.test(unit) || /^\d/.test(unit)) return null;
  // 🎯 도전 문제 5단원(2026-10-01)에서 더한 것 셋 — K 생성기는 쓰지 않는다:
  //   · 시각 눈금 `5일:6:59` · `~6:45` — 값은 분으로 바꿔 셈하고 이름은 6:59로 (해 뜨는 시각 그래프)
  //   · `!` — 맨 아래(물결선 위 첫 눈금) 말고는 눈금에 수를 안 적는다 (눈금 한 칸을 스스로 알아내는 문제)
  //   · 단위 속 `_`는 빈칸 (`만_명` → "만 명")
  const clock = /^(\d{1,2}):(\d{2})$/;
  const valOf = (s) => { const c = clock.exec(s); return c ? { v: Number(c[1]) * 60 + Number(c[2]), dec: 0, time: true } : { v: Number(s), dec: (s.split('.')[1] || '').length, time: false }; };
  let i = 2; let base = 0; let baseDec = 0; let baseTime = null; let hide = false;
  if (kind === 'lgraph' && /^~(\d+(\.\d+)?|\d{1,2}:\d{2})$/.test(t[2] || '')) { const b = valOf(t[2].slice(1)); base = b.v; baseDec = b.dec; baseTime = b.time; i = 3; }
  if (t[i] === '!') { hide = true; i += 1; }
  const items = t.slice(i).map((x) => { const m = /^([^:\s]+):(\d+(?:\.\d+)?|\d{1,2}:\d{2}|\?)$/.exec(x); if (!m) return null; if (m[2] === '?') return { label: m[1], v: null, dec: 0, time: null }; return { label: m[1], ...valOf(m[2]) }; });
  if (items.length < 2 || items.length > 7 || items.some((x) => !x) || !items.some((x) => x.v !== null)) return null;
  // 시각과 수를 섞지 않는다 — 물결선 첫 눈금까지 같은 꼴
  const kinds = new Set([...items.filter((x) => x.v !== null).map((x) => x.time), ...(baseTime === null ? [] : [baseTime])]);
  if (kinds.size > 1) return null;
  const time = kinds.has(true);
  const dec = Math.max(st.dec, baseDec, ...items.map((x) => x.dec));
  if (dec > 2 || (time && st.dec)) return null;
  const S = 10 ** dec; const sc = (v) => Math.round(v * S);
  const ss = sc(st.step); const sb = sc(base);
  for (const x of items) if (x.v !== null && (sc(x.v) < sb || (sc(x.v) - sb) % ss !== 0)) return null; // 눈금선 위에만
  // (물결선 위 첫 눈금이 눈금 한 칸의 배수일 필요는 없다 — 문제집 12번이 350만부터 한 칸 20만. 값은 위에서 첫 눈금부터 칸으로 떨어지는지 봤다)
  return { kind, step: st.step, lab: st.lab, dec, unit: unit.replace(/_/g, ' '), base, items: items.map(({ label, v }) => ({ label, v })), ...(time ? { time: true } : {}), ...(hide ? { hide: true } : {}) };
}
/** 분 → "6:59" (시각 눈금) */
const clockText = (min) => `${Math.floor(min / 60)}:${String(min % 60).padStart(2, '0')}`;
/** 그래프의 값 하나를 글로 — 시각 눈금이면 6:59, 아니면 수 */
const chartVal = (spec, v) => (v === null ? '?' : spec.time ? clockText(v) : fmtNum(v, spec.dec));
/** 눈금 한 칸을 글로 — 시각 눈금이면 "1분" */
const chartStep = (spec) => (spec.time ? `${spec.step}분` : withUnit(fmtNum(spec.step, spec.dec), spec.unit));

/**
 * 📏 그래프의 자 — 막대·꺾은선 그림과 점 찍기 위젯이 같이 쓴다 (순수 함수).
 * 칸 수는 가장 큰 값보다 한 칸 이상 위까지, 꼭대기 눈금에 이름이 붙게(lab의 배수). 16칸을 넘으면 null.
 * 값은 S배 한 정수(소수 오차 없이) — y(sv)·cellsOf(y)·valueOfCells(k)
 */
export function chartGeom(spec) {
  if (!spec) return null;
  const S = 10 ** spec.dec; const st = Math.round(spec.step * S); const b = Math.round((spec.base || 0) * S);
  // top: 값을 다 숨긴 빈 그래프(🎯 점 찍기 문제)도 같은 높이로 그리려고 — 이 값까지는 들어가게
  const known = [...spec.items.filter((x) => x.v !== null).map((x) => x.v), ...(spec.top !== undefined ? [spec.top] : [])].map((v) => Math.round(v * S));
  if (!known.length) return null;
  const maxC = Math.ceil((Math.max(...known) - b) / st);
  let cells = Math.max(4, maxC + 1);
  cells = Math.ceil(cells / spec.lab) * spec.lab;
  // K 생성기는 16칸 이하로 낸다(테스트). 🎯 도전 문제 5단원 01~05(0~320개, 한 칸 20)는 문제집 그대로 17칸이 필요해 20까지
  if (cells > 20) return null;
  const n = spec.items.length;
  const ch = Math.max(13, Math.min(26, Math.floor(220 / cells)));
  const fmt = (k) => (spec.time ? clockText((b + k * st) / S) : fmtNum((b + k * st) / S, spec.dec));
  const ylabs = []; for (let k = 0; k <= cells; k += spec.lab) if (!spec.hide || k === 0) ylabs.push(k);
  const left = Math.ceil(Math.max(...ylabs.map((k) => textW(fmt(k), 13)), textW(`(${spec.unit})`, 13) - 6) + 16);
  const colW = Math.max(56, Math.ceil(Math.max(...spec.items.map((x) => textW(x.label, 14))) + 18));
  const top = 34; const wave = b > 0 ? 24 : 0;
  const y0 = top + cells * ch;
  return {
    S, st, b, cells, ch, lab: spec.lab, left, top, colW, wave, y0, n, fmt, ylabs,
    W: left + n * colW + 12,
    H: y0 + wave + 36,
    x: (i) => left + colW * (i + 0.5),
    /** S배 한 값 → y */
    y: (sv) => y0 - ((sv - b) / st) * ch,
    yOfCells: (k) => y0 - k * ch,
    /** y → 가장 가까운 눈금 칸 (0~cells) */
    cellsOf: (y) => Math.min(cells, Math.max(0, Math.round((y0 - y) / ch))),
    valueOfCells: (k) => Number(fmtNum((b + k * st) / S, spec.dec)),
  };
}

/** 그래프 틀 — 눈금선·눈금 이름·세로축·물결선·단위·가로 이름 */
function chartFrame(G, spec) {
  let g = '';
  for (let k = 0; k <= G.cells; k++) {
    const y = G.yOfCells(k); const named = k % G.lab === 0;
    g += `<line x1="${G.left}" y1="${y}" x2="${G.W - 10}" y2="${y}" stroke="currentColor" stroke-opacity="${named ? 0.5 : 0.2}" stroke-width="1"/>`;
    if (named && (!spec.hide || k === 0)) g += `<text x="${G.left - 7}" y="${y + 4.5}" font-size="13" text-anchor="end" fill="currentColor">${G.fmt(k)}</text>`;
  }
  g += `<text x="${G.left - 4}" y="${G.top - 14}" font-size="13" text-anchor="end" fill="currentColor">(${esc(spec.unit)})</text>`;
  g += `<line x1="${G.left}" y1="${G.top - 8}" x2="${G.left}" y2="${G.y0 + G.wave}" stroke="currentColor" stroke-width="1.5"/>`;
  if (G.wave) {
    // 물결선(≈) — 0부터 첫 눈금까지 줄였다는 표시. 축을 끊고 물결 두 줄, 맨 아래에 0
    const ya = G.y0 + 7; const x0 = G.left - 9;
    g += `<rect x="${G.left - 3}" y="${ya - 3}" width="6" height="12" fill="var(--card, #fff)"/>`;
    for (const dy of [0, 6]) g += `<path d="M ${x0} ${ya + dy} q 4.5 -5 9 0 t 9 0" fill="none" stroke="currentColor" stroke-width="1.4"/>`;
    g += `<text x="${G.left - 7}" y="${G.y0 + G.wave + 4.5}" font-size="13" text-anchor="end" fill="currentColor">0</text>`;
  }
  g += `<line x1="${G.left}" y1="${G.y0 + G.wave}" x2="${G.W - 10}" y2="${G.y0 + G.wave}" stroke="currentColor" stroke-width="1.5"/>`;
  spec.items.forEach((x, i) => { g += `<text x="${G.x(i)}" y="${G.y0 + G.wave + 22}" font-size="14" text-anchor="middle" fill="currentColor">${esc(x.label)}</text>`; });
  return g;
}

const chartAria = (name, spec) => `${name}: 눈금 한 칸 ${chartStep(spec)}${spec.base ? `, ${chartVal(spec, spec.base)}부터(물결선)` : ''}, ${spec.items.map((x) => `${x.label} ${chartVal(spec, x.v)}`).join(', ')}`;

/** 막대그래프 — `[bgraph 2x5 명 사과:12 배:20]` */
export function bgraphSvg(spec) {
  const G = chartGeom(spec);
  if (!G) return '';
  let g = chartFrame(G, spec);
  const bw = Math.round(G.colW * 0.5);
  spec.items.forEach((x, i) => {
    if (x.v === null) { g += `<text x="${G.x(i)}" y="${G.y0 - 8}" font-size="17" font-weight="700" text-anchor="middle" fill="${FILL2}">?</text>`; return; }
    const y = G.y(Math.round(x.v * G.S));
    g += `<rect class="bar" data-i="${i}" x="${G.x(i) - bw / 2}" y="${y}" width="${bw}" height="${G.y0 - y}" fill="${FILL}" fill-opacity="0.75" stroke="currentColor" stroke-opacity="0.6" stroke-width="1"/>`;
  });
  return `<svg class="frac-fig chart-fig" viewBox="0 0 ${G.W} ${G.H}" width="${G.W}" height="${G.H}" role="img" aria-label="${esc(chartAria('막대그래프', spec))}">${g}</svg>`;
}

/** 꺾은선그래프 — `[lgraph 5 kg ~25 1월:30 2월:35]` (이웃한 두 점이 다 있을 때만 잇는다) */
export function lgraphSvg(spec) {
  const G = chartGeom(spec);
  if (!G) return '';
  let g = chartFrame(G, spec);
  const pts = spec.items.map((x, i) => (x.v === null ? null : [G.x(i), G.y(Math.round(x.v * G.S))]));
  for (let i = 0; i + 1 < pts.length; i++) if (pts[i] && pts[i + 1]) g += `<line class="seg" x1="${pts[i][0]}" y1="${pts[i][1]}" x2="${pts[i + 1][0]}" y2="${pts[i + 1][1]}" stroke="${FILL}" stroke-width="2.5"/>`;
  pts.forEach((p, i) => {
    if (p) g += `<circle class="pt" data-i="${i}" cx="${p[0]}" cy="${p[1]}" r="4.5" fill="${FILL}" stroke="currentColor" stroke-width="1"/>`;
    else g += `<text x="${G.x(i)}" y="${G.y0 - 8}" font-size="17" font-weight="700" text-anchor="middle" fill="${FILL2}">?</text>`;
  });
  return `<svg class="frac-fig chart-fig" viewBox="0 0 ${G.W} ${G.H}" width="${G.W}" height="${G.H}" role="img" aria-label="${esc(chartAria('꺾은선그래프', spec))}">${g}</svg>`;
}

/** 띠·원그래프 지시문 → [{label, v}] — 합 100(?는 나머지, 하나까지), 칸마다 10% 이상. 아니면 null */
export function parsePct(arg) {
  const items = String(arg || '').trim().split(/\s+/).map((x) => { const m = /^([^:\s]+):(\d+|\?)$/.exec(x); return m ? { label: m[1], v: m[2] === '?' ? null : Number(m[2]), ask: m[2] === '?' } : null; });
  if (items.length < 2 || items.length > 6 || items.some((x) => !x)) return null;
  const asks = items.filter((x) => x.ask).length;
  const sum = items.reduce((a, x) => a + (x.v || 0), 0);
  if (asks > 1 || (asks === 0 && sum !== 100) || (asks === 1 && sum >= 100)) return null;
  for (const x of items) if (x.ask) x.v = 100 - sum;
  if (items.some((x) => x.v < 10)) return null;
  return items;
}

/** 띠그래프 — 전체 400px = 100%, 10%마다 눈금 */
export function bandSvg(items) {
  if (!items) return '';
  const pad = 14; const W = 400; const top = 6; const h = 44;
  let g = ''; let x = pad;
  items.forEach((it, i) => {
    const w = (it.v / 100) * W;
    g += `<rect class="seg" data-i="${i}" x="${x.toFixed(1)}" y="${top}" width="${w.toFixed(1)}" height="${h}" fill="${CHART_FILLS[i % CHART_FILLS.length]}" fill-opacity="0.35" stroke="currentColor" stroke-opacity="0.7" stroke-width="1"/>`;
    g += `<text x="${(x + w / 2).toFixed(1)}" y="${top + 19}" font-size="13" text-anchor="middle" fill="currentColor" font-weight="700">${esc(it.label)}</text>`;
    g += `<text x="${(x + w / 2).toFixed(1)}" y="${top + 36}" font-size="13" text-anchor="middle" fill="currentColor">${it.ask ? '?' : it.v}%</text>`;
    x += w;
  });
  const yr = top + h + 6;
  g += `<line x1="${pad}" y1="${yr}" x2="${pad + W}" y2="${yr}" stroke="currentColor" stroke-width="1"/>`;
  for (let p = 0; p <= 100; p += 10) {
    const tx = pad + (p / 100) * W;
    g += `<line x1="${tx}" y1="${yr}" x2="${tx}" y2="${yr + 5}" stroke="currentColor" stroke-width="1"/>`;
    g += `<text x="${tx}" y="${yr + 18}" font-size="11" text-anchor="middle" fill="currentColor">${p}</text>`;
  }
  const H = yr + 24; const Wt = W + pad * 2;
  return `<svg class="frac-fig chart-fig" viewBox="0 0 ${Wt} ${H}" width="${Wt}" height="${H}" role="img" aria-label="${esc(`띠그래프: ${items.map((x) => `${x.label} ${x.ask ? '?' : x.v}%`).join(', ')}`)}">${g}</svg>`;
}

/** 원그래프 — 12시 방향에서 시계 방향으로, 둘레에 10%마다 눈금 */
export function pieSvg(items) {
  if (!items) return '';
  // 이름 두 줄이 조각 경계선에 안 걸리게 — 반지름 100, 이름 자리는 0.62R부터 바깥쪽으로 시험해 고른다
  // (좁은 10% 조각은 바깥이 넓다. 테스트가 경계선이 이름을 지나가는지 잰다)
  const R = 100; const C = R + 14; const size = C * 2;
  let g = ''; let acc = 0;
  const at = (p, r) => { const a = (p / 100) * Math.PI * 2 - Math.PI / 2; return [C + r * Math.cos(a), C + r * Math.sin(a)]; };
  items.forEach((it, i) => {
    const [x0, y0] = at(acc, R); const [x1, y1] = at(acc + it.v, R);
    const big = it.v > 50 ? 1 : 0;
    g += `<path class="seg" data-i="${i}" d="M ${C} ${C} L ${x0.toFixed(2)} ${y0.toFixed(2)} A ${R} ${R} 0 ${big} 1 ${x1.toFixed(2)} ${y1.toFixed(2)} Z" fill="${CHART_FILLS[i % CHART_FILLS.length]}" fill-opacity="0.35" stroke="currentColor" stroke-opacity="0.7" stroke-width="1"/>`;
    const bw = Math.max(textW(it.label, 13), textW(`${it.ask ? '?' : it.v}%`, 13)) + 2;
    const boxAt = ([cx, cy]) => ({ x0: cx - bw / 2, x1: cx + bw / 2, y0: cy - 2 - 13 * 0.8, y1: cy + 14 + 13 * 0.2 });
    const rays = [[[C, C], [x0, y0]], [[C, C], [x1, y1]]];
    const fits = (B) => !rays.some((s) => segHitsBox(s, B)) && [[B.x0, B.y0], [B.x1, B.y0], [B.x0, B.y1], [B.x1, B.y1]].every(([x, y]) => Math.hypot(x - C, y - C) < R - 2);
    const cands = [0.62, 0.68, 0.74, 0.8, 0.56].map((k) => at(acc + it.v / 2, R * k));
    const [lx, ly] = cands.find((p) => fits(boxAt(p))) || cands[0];
    g += `<text x="${lx.toFixed(1)}" y="${(ly - 2).toFixed(1)}" font-size="13" text-anchor="middle" fill="currentColor" font-weight="700">${esc(it.label)}</text>`;
    g += `<text x="${lx.toFixed(1)}" y="${(ly + 14).toFixed(1)}" font-size="13" text-anchor="middle" fill="currentColor">${it.ask ? '?' : it.v}%</text>`;
    acc += it.v;
  });
  for (let p = 0; p < 100; p += 10) { const [ax, ay] = at(p, R); const [bx, by] = at(p, R + 6); g += `<line x1="${ax.toFixed(1)}" y1="${ay.toFixed(1)}" x2="${bx.toFixed(1)}" y2="${by.toFixed(1)}" stroke="currentColor" stroke-width="1"/>`; }
  return `<svg class="frac-fig chart-fig" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" role="img" aria-label="${esc(`원그래프: ${items.map((x) => `${x.label} ${x.ask ? '?' : x.v}%`).join(', ')}`)}">${g}</svg>`;
}

/** 📊 그래프 지시문 → 글 (그림을 못 그리는 자리: ❓ 복사문·📊·🤔 노트 제목) */
function chartText(kind, arg) {
  if (kind === 'band' || kind === 'pie') {
    const it = parsePct(arg);
    return it ? `${kind === 'band' ? '띠그래프' : '원그래프'}: ${it.map((x) => `${x.label} ${x.ask ? '?' : x.v}%`).join(' · ')}` : null;
  }
  const sp = parseChart(kind, arg);
  if (!sp || !chartGeom(sp)) return null;
  return `${kind === 'bgraph' ? '막대그래프' : '꺾은선그래프'}: 눈금 한 칸 ${chartStep(sp)}${sp.base ? ` · ${chartVal(sp, sp.base)}부터(물결선)` : ''} · ${sp.items.map((x) => `${x.label} ${chartVal(sp, x.v)}`).join(' · ')}`;
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
// ───────────────────── 🪞 M 합동과 대칭: 모눈 위 도형·대칭축·대칭의 중심·후보 점 (2026-10-02) ─────────────────────
// `[sym x=6 ㄱ:6,5 ㄴ:3,4 ㄷ:3,1 ㄹ:6,0]` — 선대칭(대칭축 x = 6, 점선) · `[sym c=5,3 …]` 점대칭(대칭의 중심 ●)
// `[sym len ㄱ:0,0 ㄴ:4,0 ㄷ:4,3 | ㄹ:9,3 ㅁ:9,0 ㅂ:6,0]` — 도형 둘(| 뒤가 둘째, 합동) · len = 첫 도형의 변 길이(정수일 때만)
// `[sym open x=6 6,5 3,4 3,1 6,0 ㉠@9,4 ㉡@0,4 …]` — open = 첫 목록을 열린 선(반쪽 도형)으로 · ㉠@x,y = 후보 점(★@x,y = 아이가 찍은 점)
// 꼭짓점은 모눈점(0~14, 정수)이라 대칭·합동을 칸으로 셀 수 있다. 대칭의 중심은 반 칸(.5)도 된다.
// ★ 테스트가 그린 SVG에서 꼭짓점·축·중심·후보 점을 다시 읽어 대칭·합동을 따로 잰다 (data-x·data-y)

/** `[sym …]` 인자 → { axis: {x}|{y}|null, center: [x,y]|null, len, open, polys: [[{name,x,y}]], cands: [{k,x,y}] } (말이 안 되면 null) */
export function parseSym(arg) {
  const out = { axis: null, center: null, len: false, open: false, polys: [[]], cands: [] };
  for (const t of String(arg || '').trim().split(/\s+/)) {
    let q;
    if (t === 'len') out.len = true;
    else if (t === 'open') out.open = true;
    else if (t === '|') { if (out.polys.length > 1) return null; out.polys.push([]); }
    else if ((q = /^(x|y)=(\d+)$/.exec(t))) out.axis = { [q[1]]: +q[2] };
    else if ((q = /^c=(\d+(?:\.5)?),(\d+(?:\.5)?)$/.exec(t))) out.center = [+q[1], +q[2]];
    else if ((q = /^([㉠-㉣★])@(\d+),(\d+)$/.exec(t))) out.cands.push({ k: q[1], x: +q[2], y: +q[3] });
    else if ((q = /^(?:([ㄱ-ㅎ]):)?(\d+),(\d+)$/.exec(t))) out.polys[out.polys.length - 1].push({ name: q[1] || '', x: +q[2], y: +q[3] });
    else return null;
  }
  const pts = [...out.polys.flat(), ...out.cands];
  if (pts.some((p) => p.x > 14 || p.y > 14)) return null;
  if (out.polys[0].length < (out.open ? 2 : 3) || (out.polys[1] && out.polys[1].length < 3)) return null;
  if (out.cands.length > 4 || (out.axis && out.center)) return null;
  const names = out.polys.flat().map((p) => p.name).filter(Boolean);
  if (new Set(names).size !== names.length) return null; // 같은 이름 두 번이면 어느 점인지 모른다
  return out;
}

/**
 * 🪞 모눈 자 — 그림(symSvg)과 ✍️ 모눈 판(drawview)이 같은 자를 써야 누른 자리가 본 자리다.
 * 그림 범위는 점·대칭축·중심 둘레 한 칸. `sp.box = [x0, y0, x1, y1]`이면 그 칸들도 들어가게 넓힌다(판에서 후보 점을 숨겨도 범위는 같게).
 */
export function symGeom(sp) {
  const all = [...sp.polys.flat(), ...sp.cands, ...(sp.center ? [{ x: sp.center[0], y: sp.center[1] }] : [])];
  if (sp.box) all.push({ x: sp.box[0], y: sp.box[1] }, { x: sp.box[2], y: sp.box[3] });
  let x0 = Math.min(...all.map((p) => p.x)) - 1; let x1 = Math.max(...all.map((p) => p.x)) + 1;
  let y0 = Math.min(...all.map((p) => p.y)) - 1; let y1 = Math.max(...all.map((p) => p.y)) + 1;
  if (sp.axis && sp.axis.x !== undefined) { x0 = Math.min(x0, sp.axis.x - 1); x1 = Math.max(x1, sp.axis.x + 1); }
  if (sp.axis && sp.axis.y !== undefined) { y0 = Math.min(y0, sp.axis.y - 1); y1 = Math.max(y1, sp.axis.y + 1); }
  x0 = Math.max(x0, -1); y0 = Math.max(y0, -1);
  const C = Math.min(34, Math.floor(330 / Math.max(x1 - x0, y1 - y0, 1))); const pad = 28;
  const X = (x) => pad + (x - x0) * C; const Y = (y) => pad + (y1 - y) * C;
  const W = Math.round((x1 - x0) * C + pad * 2); const H = Math.round((y1 - y0) * C + pad * 2);
  /** 그림 좌표(px) → 가장 가까운 모눈점 (그림 안, 0 이상) */
  const gridAt = (px, py) => ({
    x: Math.min(x1, Math.max(Math.max(x0, 0), Math.round((px - pad) / C + x0))),
    y: Math.min(y1, Math.max(Math.max(y0, 0), Math.round(y1 - (py - pad) / C))),
  });
  return { x0, x1, y0, y1, C, pad, X, Y, W, H, gridAt };
}

/** 🪞 그리기 — 모눈·도형(둘째는 다른 색)·대칭축(점선)·대칭의 중심·꼭짓점 이름·후보 점·변 길이 */
export function symSvg(sp) {
  const { x0, x1, y0, y1, X, Y, W, H } = symGeom(sp);
  const f = (v) => v.toFixed(1);
  let g = '';
  for (let x = x0; x <= x1; x++) g += `<line x1="${f(X(x))}" y1="${f(Y(y0))}" x2="${f(X(x))}" y2="${f(Y(y1))}" stroke="currentColor" stroke-opacity="0.16" stroke-width="1"/>`;
  for (let y = y0; y <= y1; y++) g += `<line x1="${f(X(x0))}" y1="${f(Y(y))}" x2="${f(X(x1))}" y2="${f(Y(y))}" stroke="currentColor" stroke-opacity="0.16" stroke-width="1"/>`;
  const segs = []; // 이름표가 피할 선분 (px)
  const P = (p) => [X(p.x), Y(p.y)];
  sp.polys.forEach((poly, pi) => {
    const pts = poly.map((p) => `${f(X(p.x))},${f(Y(p.y))}`).join(' ');
    const open = pi === 0 && sp.open;
    if (open) g += `<polyline class="sym-poly" data-poly="${pi}" data-open="1" points="${pts}" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round"/>`;
    else g += `<polygon class="sym-poly" data-poly="${pi}" points="${pts}" fill="${pi ? FILL2 : FILL}" fill-opacity="0.18" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>`;
    poly.forEach((p, i) => { if (open && i === poly.length - 1) return; segs.push([P(p), P(poly[(i + 1) % poly.length])]); });
  });
  if (sp.axis) {
    const a = sp.axis.x !== undefined
      ? [[X(sp.axis.x), Y(y1) - 6], [X(sp.axis.x), Y(y0) + 6]]
      : [[X(x0) - 6, Y(sp.axis.y)], [X(x1) + 6, Y(sp.axis.y)]];
    g += `<line class="sym-axis" ${sp.axis.x !== undefined ? `data-x="${sp.axis.x}"` : `data-y="${sp.axis.y}"`} x1="${f(a[0][0])}" y1="${f(a[0][1])}" x2="${f(a[1][0])}" y2="${f(a[1][1])}" stroke="${FILL2}" stroke-width="2.4" stroke-dasharray="7 5"/>`;
    segs.push(a);
  }
  const dots = []; // 이름표가 덮으면 안 되는 점 (px)
  for (const p of sp.polys.flat()) { dots.push(P(p)); g += `<circle cx="${f(X(p.x))}" cy="${f(Y(p.y))}" r="3" fill="currentColor"/>`; }
  if (sp.center) {
    const [cx, cy] = [X(sp.center[0]), Y(sp.center[1])];
    dots.push([cx, cy]);
    g += `<circle class="sym-center" data-x="${sp.center[0]}" data-y="${sp.center[1]}" cx="${f(cx)}" cy="${f(cy)}" r="5.5" fill="${FILL2}" stroke="currentColor" stroke-width="1.2"/>`;
  }
  for (const c of sp.cands) {
    dots.push(P(c));
    g += `<circle class="sym-cand" data-k="${c.k}" data-x="${c.x}" data-y="${c.y}" cx="${f(X(c.x))}" cy="${f(Y(c.y))}" r="6.5" fill="#fff" stroke="${c.k === '★' ? FILL2 : FILL}" stroke-width="2.6"/>`;
  }

  // 이름표 자리 — 원하는 쪽부터 여덟 방향·두 거리로 시험해 그림 안·남의 이름표·선·점과 안 겹치는 첫 자리
  const placed = [];
  const boxOf = (x, y, t, fs) => { const w = (labelW(t) * fs) / 15; return { x0: x - w / 2, x1: x + w / 2, y0: y - fs * 0.78, y1: y + fs * 0.22 }; };
  const clear = (B) => B.x0 >= 1 && B.y0 >= 1 && B.x1 <= W - 1 && B.y1 <= H - 1
    && !placed.some((q) => B.x0 < q.x1 && q.x0 < B.x1 && B.y0 < q.y1 && q.y0 < B.y1)
    && !segs.some((sg) => segHitsBox(sg, B))
    && !dots.some(([dx, dy]) => dx > B.x0 - 5 && dx < B.x1 + 5 && dy > B.y0 - 5 && dy < B.y1 + 5);
  let labels = '';
  const put = ([ax, ay], t, fs, pref, cls = '') => {
    const dirs = [pref, ...[[1, 0], [-1, 0], [0, -1], [0, 1], [1, -1], [-1, -1], [1, 1], [-1, 1]].map(([u, v]) => [u / Math.hypot(u, v), v / Math.hypot(u, v)])];
    let at = null;
    for (const d of [16, 22, 30]) {
      for (const [u, v] of dirs) {
        const x = ax + u * (d + (labelW(t) * fs) / 30 * Math.abs(u)); const y = ay + v * d + fs * 0.3;
        if (clear(boxOf(x, y, t, fs))) { at = [x, y]; break; }
      }
      if (at) break;
    }
    if (!at) at = [ax + pref[0] * 18, ay + pref[1] * 18 + fs * 0.3];
    placed.push(boxOf(at[0], at[1], t, fs));
    labels += `<text${cls ? ` class="${cls}"` : ''} x="${f(at[0])}" y="${f(at[1])}" font-size="${fs}" text-anchor="middle" fill="currentColor" font-weight="700">${esc(t)}</text>`;
  };
  const unitV = (x, y) => { const d = Math.hypot(x, y) || 1; return [x / d, y / d]; };
  sp.polys.forEach((poly) => {
    const cx = poly.reduce((a, p) => a + X(p.x), 0) / poly.length; const cy = poly.reduce((a, p) => a + Y(p.y), 0) / poly.length;
    for (const p of poly) if (p.name) put(P(p), p.name, 18, unitV(X(p.x) - cx, Y(p.y) - cy), 'sym-name');
  });
  for (const c of sp.cands) put(P(c), c.k, 17, [1, -1].map((v) => v / Math.SQRT2), 'sym-cand-name');
  if (sp.len) {
    const poly = sp.polys[0]; const n = poly.length;
    const cx = poly.reduce((a, p) => a + X(p.x), 0) / n; const cy = poly.reduce((a, p) => a + Y(p.y), 0) / n;
    poly.forEach((p, i) => {
      if (sp.open && i === n - 1) return;
      const q = poly[(i + 1) % n]; const d = Math.hypot(q.x - p.x, q.y - p.y);
      if (Math.abs(d - Math.round(d)) > 1e-9) return; // 비스듬한 변은 길이가 정수일 때만
      const mx = (X(p.x) + X(q.x)) / 2; const my = (Y(p.y) + Y(q.y)) / 2;
      put([mx, my], `${Math.round(d)} cm`, 15, unitV(mx - cx, my - cy), 'sym-len');
    });
  }
  return `<svg class="frac-fig shape-fig sym-fig" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${esc(symText(sp))}"><g>${g}${labels}</g></svg>`;
}

/** 🪞 글로 — ❓ 복사문·노트 제목처럼 그림을 못 그리는 자리 */
export function symText(sp) {
  const pt = (p) => `${p.name || ''}(${p.x}, ${p.y})`;
  const parts = [];
  sp.polys.forEach((poly, i) => parts.push(`${i ? '둘째 도형' : sp.open ? '반쪽 선' : '도형'} ${poly.map(pt).join(' · ')}`));
  if (sp.axis) parts.push(sp.axis.x !== undefined ? `세로 대칭축 x = ${sp.axis.x}` : `가로 대칭축 y = ${sp.axis.y}`);
  if (sp.center) parts.push(`대칭의 중심 (${sp.center[0]}, ${sp.center[1]})`);
  if (sp.cands.length) parts.push(`점 ${sp.cands.map((c) => `${c.k}(${c.x}, ${c.y})`).join(' · ')}`);
  return `모눈 그림 — ${parts.join(' | ')}`;
}

// ───────────────────── 🔵 N 원의 넓이: 원·반원·고리·잘라 붙이기 (2026-10-02) ─────────────────────
// `[circle r=5]` 원(중심 · 반지름) · `[circle d=10]` 지름 · `[circle r=5 d=?]` 둘 다 (물을 길이는 ?)
// `[circle half d=10]` 반원 · `[circle quarter r=6]` 원의 4분의 1 · `[circle ring R=8 r=5]` 고리(중심이 같은 큰 원 − 작은 원)
// `[circle sq d=10]` 정사각형 안에 꼭 맞는 원(모서리 색칠) · `[circle box d=10]` 원 안 정사각형 · 원 밖 정사각형
// `[circle poly d=10]` 원 안 정육각형 · 원 밖 정사각형 · `[circle grid r=4]` 모눈(한 칸 1 cm²) 위 원 — 원 안 칸 · 걸친 칸
// `[circle slices r=5]` 원을 16조각(n=8·32도)으로 잘라 엇갈려 붙인 모양 · `[circle row n=3 r=2]` 원 n개를 한 줄로 맞닿게
// 끝에 단위(cm·m). 길이는 1~40 자연수. 그림은 **실제 비율** — 고리의 두 반지름, 정사각형 한 변 = 지름이 그림에서도 참이다.
// ★ 테스트가 그린 SVG에서 반지름·변·조각을 다시 잰다 (class·data-*). 모눈 칸은 테스트가 따로 센다.

const CIRCLE_KINDS = ['half', 'quarter', 'ring', 'sq', 'box', 'poly', 'grid', 'slices', 'row'];

/** `[circle …]` 인자 → { kind, unit, r?, d?, R?, n? } (말이 안 되면 null) */
export function parseCircle(arg) {
  const t = String(arg || '').trim().split(/\s+/).filter(Boolean);
  const sp = { kind: 'full', unit: 'cm' };
  if (t.length && /^(cm|m)$/.test(t[t.length - 1])) sp.unit = t.pop();
  if (t.length && CIRCLE_KINDS.includes(t[0])) sp.kind = t.shift();
  for (const tok of t) {
    const q = /^(r|d|R|n)=(\d+|\?)$/.exec(tok);
    if (!q || q[1] in sp) return null;
    sp[q[1]] = q[2] === '?' ? '?' : +q[2];
  }
  const len = (v) => Number.isInteger(v) && v >= 1 && v <= 40;
  const lenQ = (v) => v === '?' || len(v);
  const keys = ['r', 'd', 'R', 'n'].filter((k) => k in sp).join('');
  switch (sp.kind) {
    case 'full':
      if (!['r', 'd', 'rd'].includes(keys)) return null;
      if (!keys.split('').every((k) => lenQ(sp[k]))) return null;
      if (keys === 'rd' && (sp.r === '?' && sp.d === '?')) return null;
      if (keys === 'rd' && sp.r !== '?' && sp.d !== '?' && sp.d !== 2 * sp.r) return null; // 지름 = 반지름 × 2 (그림이 거짓말하지 않게)
      return sp;
    case 'half': return (keys === 'r' || keys === 'd') && lenQ(sp[keys]) ? sp : null;
    case 'quarter': return keys === 'r' && len(sp.r) ? sp : null;
    case 'ring': return keys === 'rR' && len(sp.r) && len(sp.R) && sp.r < sp.R && sp.r * 4 >= sp.R ? sp : null;
    case 'sq': case 'box': case 'poly': return keys === 'd' && len(sp.d) ? sp : null;
    case 'grid': return keys === 'r' && Number.isInteger(sp.r) && sp.r >= 2 && sp.r <= 7 && sp.unit === 'cm' ? sp : null;
    case 'slices':
      if (keys === 'r' && len(sp.r)) { sp.n = 16; return sp; }
      return keys === 'rn' && len(sp.r) && [8, 16, 32].includes(sp.n) ? sp : null;
    case 'row': return keys === 'rn' && len(sp.r) && Number.isInteger(sp.n) && sp.n >= 2 && sp.n <= 5 ? sp : null;
    default: return null;
  }
}

/** 모눈 위 원(중심이 모눈점, 반지름 r칸) — 원 안에 꼭 들어간 칸 · 원에 조금이라도 걸친 칸(꼭 들어간 칸 포함) */
export function circleCells(r) {
  const cells = [];
  for (let i = -r; i < r; i++) {
    for (let j = -r; j < r; j++) {
      const far = Math.max(i * i, (i + 1) * (i + 1)) + Math.max(j * j, (j + 1) * (j + 1));
      const nx = i <= 0 && i + 1 >= 0 ? 0 : Math.min(i * i, (i + 1) * (i + 1));
      const ny = j <= 0 && j + 1 >= 0 ? 0 : Math.min(j * j, (j + 1) * (j + 1));
      if (far <= r * r) cells.push({ i, j, k: 'in' });
      else if (nx + ny < r * r) cells.push({ i, j, k: 'edge' });
    }
  }
  const inside = cells.filter((c) => c.k === 'in').length;
  return { cells, inside, touch: cells.length };
}

const cf = (v) => v.toFixed(1);
// 이름표 글자에 바탕색 테두리 — 고리의 "8 cm"는 어디에 두어도 작은 원의 선이 지나간다 (선 위에서도 읽히게)
const cLab = (x, y, t) => `<text class="cir-lab" x="${cf(x)}" y="${cf(y)}" font-size="15" text-anchor="middle" fill="currentColor" font-weight="600" stroke="var(--card, #fff)" stroke-width="4" stroke-linejoin="round" paint-order="stroke">${esc(t)}</text>`;
const cLen = (v, u) => `${v} ${u}`;
const cDot = (x, y) => `<circle class="cir-o" cx="${cf(x)}" cy="${cf(y)}" r="3.5" fill="currentColor"/>`;
const cSeg = (k, v, x1, y1, x2, y2, extra = '') => `<line class="cir-seg" data-k="${k}" data-v="${v}" x1="${cf(x1)}" y1="${cf(y1)}" x2="${cf(x2)}" y2="${cf(y2)}" stroke="currentColor" stroke-width="2.2"${extra}/>`;
/** 원 한 바퀴 경로 (고리·모서리 색칠의 evenodd 구멍용) */
const ringPath = (cx, cy, r) => `M ${cf(cx - r)} ${cf(cy)} a ${cf(r)} ${cf(r)} 0 1 0 ${cf(2 * r)} 0 a ${cf(r)} ${cf(r)} 0 1 0 ${cf(-2 * r)} 0 Z`;

/** 🔵 그리기 — 종류마다 자리를 정해 둔다 (이름표 몇 개뿐이라 자리를 고정하고, 겹침은 테스트가 잰다) */
export function circleSvg(sp) {
  const u = sp.unit;
  let W; let H; let g = '';
  const k = sp.kind;
  if (k === 'full') {
    const R = 110; const pad = 34; const cx = pad + R; const cy = pad + R; W = 2 * R + 2 * pad; H = W;
    const rv = 'r' in sp ? sp.r : sp.d === '?' ? '?' : sp.d / 2;
    g += `<circle class="cir-c" data-r="${rv}" cx="${cf(cx)}" cy="${cf(cy)}" r="${R}" fill="${FILL}" fill-opacity="0.14" stroke="currentColor" stroke-width="2"/>`;
    const both = 'r' in sp && 'd' in sp;
    if ('d' in sp) {
      g += cSeg('d', sp.d, cx - R, cy, cx + R, cy);
      g += cLab(both ? cx - R / 2 : cx + R / 2, cy - 9, cLen(sp.d, u));
    }
    if ('r' in sp) {
      if (both) {
        // 지름이 가로로 있으니 반지름은 위 오른쪽(60°) — 이름표는 선의 오른쪽 아래로 비켜서
        const ex = cx + R * Math.cos(Math.PI / 3); const ey = cy - R * Math.sin(Math.PI / 3);
        g += cSeg('r', sp.r, cx, cy, ex, ey);
        g += cLab((cx + ex) / 2 + 24 * Math.sin(Math.PI / 3), (cy + ey) / 2 + 24 * Math.cos(Math.PI / 3) + 5, cLen(sp.r, u));
      } else {
        g += cSeg('r', sp.r, cx, cy, cx + R, cy);
        g += cLab(cx + R / 2, cy - 9, cLen(sp.r, u));
      }
    }
    g += cDot(cx, cy);
  } else if (k === 'half') {
    const R = 120; const pad = 30; const cx = pad + R; const cy = pad + R; W = 2 * R + 2 * pad; H = R + pad + 40;
    const rv = 'r' in sp ? sp.r : sp.d === '?' ? '?' : sp.d / 2;
    g += `<path class="cir-half" data-r="${rv}" d="M ${cf(cx - R)} ${cf(cy)} A ${R} ${R} 0 0 1 ${cf(cx + R)} ${cf(cy)} Z" fill="${FILL}" fill-opacity="0.14" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>`;
    if ('d' in sp) {
      g += cSeg('d', sp.d, cx - R, cy, cx + R, cy);
      g += cLab(cx, cy + 24, cLen(sp.d, u));
    } else {
      g += cSeg('r', sp.r, cx, cy, cx, cy - R);
      g += cLab(cx + 28, cy - R / 2 + 5, cLen(sp.r, u));
      g += cDot(cx, cy);
    }
  } else if (k === 'quarter') {
    const R = 190; const pad = 30; const ox = pad; const oy = pad + R; W = R + 2 * pad; H = R + pad + 40;
    g += `<path class="cir-quarter" data-r="${sp.r}" d="M ${cf(ox)} ${cf(oy)} L ${cf(ox + R)} ${cf(oy)} A ${R} ${R} 0 0 0 ${cf(ox)} ${cf(oy - R)} Z" fill="${FILL}" fill-opacity="0.14" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>`;
    g += cSeg('r', sp.r, ox, oy, ox + R, oy);
    g += `<path d="M ${cf(ox + 12)} ${cf(oy)} L ${cf(ox + 12)} ${cf(oy - 12)} L ${cf(ox)} ${cf(oy - 12)}" fill="none" stroke="${FILL2}" stroke-width="1.6"/>`;
    g += cLab(ox + R / 2, oy + 24, cLen(sp.r, u));
  } else if (k === 'ring') {
    const Rp = 115; const rp = (Rp * sp.r) / sp.R; const pad = 34; const cx = pad + Rp; const cy = pad + Rp; W = 2 * Rp + 2 * pad; H = W;
    g += `<path class="cir-ring" d="${ringPath(cx, cy, Rp)} ${ringPath(cx, cy, rp)}" fill="${FILL2}" fill-opacity="0.32" fill-rule="evenodd"/>`;
    g += `<circle class="cir-c" data-k="R" data-r="${sp.R}" cx="${cf(cx)}" cy="${cf(cy)}" r="${cf(Rp)}" fill="none" stroke="currentColor" stroke-width="2"/>`;
    g += `<circle class="cir-c" data-k="r" data-r="${sp.r}" cx="${cf(cx)}" cy="${cf(cy)}" r="${cf(rp)}" fill="none" stroke="currentColor" stroke-width="2"/>`;
    // 큰 원의 반지름은 오른쪽으로, 작은 원의 반지름은 위로 — 이름표는 각자 선의 한가운데 (고리 폭으로 읽히지 않게)
    g += cSeg('R', sp.R, cx, cy, cx + Rp, cy);
    g += cLab(cx + Rp / 2, cy + 22, cLen(sp.R, u));
    g += cSeg('r', sp.r, cx, cy, cx, cy - rp);
    g += cLab(cx - 26, cy - rp / 2 + 5, cLen(sp.r, u));
    g += cDot(cx, cy);
  } else if (k === 'sq') {
    const R = 110; const pad = 30; const cx = pad + R; const cy = pad + R; W = 2 * R + 2 * pad; H = 2 * R + pad + 40;
    const sq = `M ${cf(cx - R)} ${cf(cy - R)} h ${2 * R} v ${2 * R} h ${-2 * R} Z`;
    g += `<path class="cir-corner" d="${sq} ${ringPath(cx, cy, R)}" fill="${FILL2}" fill-opacity="0.38" fill-rule="evenodd"/>`;
    g += `<rect class="cir-sq" data-d="${sp.d}" x="${cf(cx - R)}" y="${cf(cy - R)}" width="${2 * R}" height="${2 * R}" fill="none" stroke="currentColor" stroke-width="2"/>`;
    g += `<circle class="cir-c" data-r="${sp.d / 2}" cx="${cf(cx)}" cy="${cf(cy)}" r="${R}" fill="none" stroke="currentColor" stroke-width="2"/>`;
    g += cLab(cx, cy + R + 24, cLen(sp.d, u));
  } else if (k === 'box' || k === 'poly') {
    const R = 110; const pad = 30; const cx = pad + R; const cy = pad + R; W = 2 * R + 2 * pad; H = W;
    g += `<rect class="cir-out" x="${cf(cx - R)}" y="${cf(cy - R)}" width="${2 * R}" height="${2 * R}" fill="none" stroke="${FILL}" stroke-width="2.2"/>`;
    g += `<circle class="cir-c" data-r="${sp.d / 2}" cx="${cf(cx)}" cy="${cf(cy)}" r="${R}" fill="${FILL}" fill-opacity="0.1" stroke="currentColor" stroke-width="2"/>`;
    const n = k === 'box' ? 4 : 6;
    const pts = Array.from({ length: n }, (_, i) => [cx + R * Math.cos((2 * Math.PI * i) / n), cy - R * Math.sin((2 * Math.PI * i) / n)]);
    g += `<polygon class="cir-in" data-n="${n}" points="${pts.map(([x, y]) => `${cf(x)},${cf(y)}`).join(' ')}" fill="${FILL2}" fill-opacity="0.16" stroke="${FILL2}" stroke-width="2.2" stroke-linejoin="round"/>`;
    g += cSeg('d', sp.d, cx - R, cy, cx + R, cy);
    g += cLab(cx - R / 2, cy - 9, cLen(sp.d, u));
    g += cDot(cx, cy);
  } else if (k === 'grid') {
    // 태블릿 헤드리스: 한 칸 26px이면 반지름 3 cm 그림이 228px로 작았다 → 반지름이 작으면 칸을 키운다 (전체 폭 360 이하)
    const r = sp.r; const N = 2 * r + 2; const C = Math.min(34, Math.floor(340 / N)); const pad = 10;
    const cx = pad + C * (r + 1); const cy = cx; W = N * C + 2 * pad; H = W;
    const { cells, inside, touch } = circleCells(r);
    for (const c of cells) {
      g += `<rect class="cir-cell ${c.k}" data-i="${c.i}" data-j="${c.j}" x="${cf(cx + c.i * C)}" y="${cf(cy - (c.j + 1) * C)}" width="${C}" height="${C}" fill="${c.k === 'in' ? FILL2 : FILL}" fill-opacity="${c.k === 'in' ? 0.45 : 0.18}"/>`;
    }
    for (let i = 0; i <= N; i++) {
      g += `<line x1="${pad + i * C}" y1="${pad}" x2="${pad + i * C}" y2="${pad + N * C}" stroke="currentColor" stroke-opacity="0.22" stroke-width="1"/>`;
      g += `<line x1="${pad}" y1="${pad + i * C}" x2="${pad + N * C}" y2="${pad + i * C}" stroke="currentColor" stroke-opacity="0.22" stroke-width="1"/>`;
    }
    g = `<g class="cir-grid" data-r="${r}" data-c="${C}" data-in="${inside}" data-touch="${touch}">${g}</g>`;
    g += `<circle class="cir-c" data-r="${r}" cx="${cf(cx)}" cy="${cf(cy)}" r="${r * C}" fill="none" stroke="currentColor" stroke-width="2.4"/>`;
    g += cDot(cx, cy);
  } else if (k === 'slices') {
    // 위: 원(윗반 보라 · 아랫반 주황, 조각은 진하기를 번갈아) — 아래: 조각을 엇갈려 붙인 띠 (가로 ≈ 원주의 반 · 세로 = 반지름)
    const n = sp.n; const R = 80; const th = (2 * Math.PI) / n; const s = R * Math.sin(th / 2); const h = R * Math.cos(th / 2);
    const bandW = (n + 1) * s; const padL = 50; const padR = 20; const top = 20;
    W = Math.round(padL + Math.max(bandW, 2 * R) + padR);
    const ccx = padL + Math.max(bandW, 2 * R) / 2; const ccy = top + R;
    for (let i = 0; i < n; i++) {
      const a0 = i * th; const a1 = (i + 1) * th; const upper = i < n / 2;
      const p0 = [ccx + R * Math.cos(a0), ccy - R * Math.sin(a0)]; const p1 = [ccx + R * Math.cos(a1), ccy - R * Math.sin(a1)];
      g += `<path class="cir-slice" d="M ${cf(ccx)} ${cf(ccy)} L ${cf(p0[0])} ${cf(p0[1])} A ${R} ${R} 0 0 0 ${cf(p1[0])} ${cf(p1[1])} Z" fill="${upper ? FILL : FILL2}" fill-opacity="${i % 2 ? 0.2 : 0.38}"/>`;
    }
    g += `<circle class="cir-c" data-r="${sp.r}" cx="${cf(ccx)}" cy="${cf(ccy)}" r="${R}" fill="none" stroke="currentColor" stroke-width="2"/>`;
    g += cSeg('r', sp.r, ccx, ccy, ccx + R, ccy);
    g += cLab(ccx + R / 2, ccy - 9, cLen(sp.r, u));
    g += cDot(ccx, ccy);
    // 화살표
    const ay0 = ccy + R + 8; const ay1 = ay0 + 26;
    g += `<path d="M ${cf(ccx)} ${cf(ay0)} V ${cf(ay1)} M ${cf(ccx - 7)} ${cf(ay1 - 8)} L ${cf(ccx)} ${cf(ay1)} L ${cf(ccx + 7)} ${cf(ay1 - 8)}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`;
    // 띠: 윗반 조각은 꼭짓점이 아래(호가 위), 아랫반 조각은 꼭짓점이 위 — 이웃 조각과 옆변을 나눠 쓴다
    const x0 = padL + (Math.max(bandW, 2 * R) - bandW) / 2 + s; const yb = ay1 + 8 + R;
    for (let i = 0; i < n / 2; i++) {
      const ax = x0 + 2 * s * i;
      g += `<path class="cir-piece" data-up="0" d="M ${cf(ax)} ${cf(yb)} L ${cf(ax - s)} ${cf(yb - h)} A ${R} ${R} 0 0 1 ${cf(ax + s)} ${cf(yb - h)} Z" fill="${FILL}" fill-opacity="${i % 2 ? 0.2 : 0.38}" stroke="currentColor" stroke-opacity="0.35" stroke-width="1"/>`;
      const bx = ax + s; const by = yb - h;
      g += `<path class="cir-piece" data-up="1" d="M ${cf(bx)} ${cf(by)} L ${cf(bx + s)} ${cf(by + h)} A ${R} ${R} 0 0 1 ${cf(bx - s)} ${cf(by + h)} Z" fill="${FILL2}" fill-opacity="${i % 2 ? 0.38 : 0.2}" stroke="currentColor" stroke-opacity="0.35" stroke-width="1"/>`;
    }
    const bl = x0 - s; const br = x0 + n * s; const bt = yb - R; const bB = yb - h + R;
    g += `<g class="cir-band" data-l="${cf(bl)}" data-rt="${cf(br)}" data-t="${cf(bt)}" data-b="${cf(bB)}"></g>`;
    g += cLab((bl + br) / 2, bB + 22, '가로');
    g += cLab(bl - 22, (bt + bB) / 2 + 5, '세로');
    H = Math.round(bB + 36);
  } else if (k === 'row') {
    // 태블릿 헤드리스: 150px 안에 넣었더니 원이 작고(반지름 37px) 반지름 글자가 첫 원 테두리에 걸쳤다 → 폭 400까지 쓰고,
    // 반지름 선은 첫 원의 중심에서 위로 세워 글자를 원 바로 위에 둔다
    const n = sp.n; const rp = Math.min(56, Math.floor(170 / n)); const pad = 30; const cy = pad + 10 + rp; W = 2 * rp * n + 2 * pad; H = cy + rp + 56;
    for (let i = 0; i < n; i++) {
      g += `<circle class="cir-c" data-r="${sp.r}" cx="${cf(pad + rp + 2 * rp * i)}" cy="${cf(cy)}" r="${rp}" fill="${FILL}" fill-opacity="0.14" stroke="currentColor" stroke-width="2"/>`;
      g += cDot(pad + rp + 2 * rp * i, cy);
    }
    g += cSeg('r', sp.r, pad + rp, cy, pad + rp, cy - rp);
    g += cLab(pad + rp, cy - rp - 8, cLen(sp.r, u));
    const by = cy + rp + 14;
    g += `<path class="cir-total" d="M ${pad} ${cf(by - 6)} V ${cf(by)} H ${pad + 2 * rp * n} V ${cf(by - 6)}" fill="none" stroke="${FILL2}" stroke-width="2"/>`;
    g += cLab(W / 2, by + 22, cLen('?', u));
  }
  return `<svg class="frac-fig shape-fig cir-fig" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${esc(circleText(sp))}"><g>${g}</g></svg>`;
}

/** 🔵 글로 — ❓ 복사문·노트 제목처럼 그림을 못 그리는 자리 */
export function circleText(sp) {
  const u = sp.unit; const L = (v) => (v === '?' ? '?' : `${v} ${u}`);
  switch (sp.kind) {
    case 'full': return `원 — ${['r' in sp ? `반지름 ${L(sp.r)}` : '', 'd' in sp ? `지름 ${L(sp.d)}` : ''].filter(Boolean).join(' · ')}`;
    case 'half': return `반원 — ${'d' in sp ? `지름 ${L(sp.d)}` : `반지름 ${L(sp.r)}`}`;
    case 'quarter': return `원의 4분의 1 — 반지름 ${L(sp.r)}`;
    case 'ring': return `고리 모양 — 중심이 같은 두 원, 큰 원의 반지름 ${L(sp.R)} · 작은 원의 반지름 ${L(sp.r)}`;
    case 'sq': return `한 변이 ${L(sp.d)}인 정사각형 안에 꼭 맞게 그린 원 — 원 밖 네 모서리 색칠`;
    case 'box': return `지름 ${L(sp.d)}인 원 — 원 안에 꼭짓점이 닿는 정사각형과 원을 둘러싼 정사각형`;
    case 'poly': return `지름 ${L(sp.d)}인 원 — 원 안에 꼭짓점이 닿는 정육각형과 원을 둘러싼 정사각형`;
    case 'grid': { const c = circleCells(sp.r); return `모눈(한 칸 1 cm²) 위 반지름 ${sp.r} cm인 원 — 원 안에 꼭 들어간 칸 ${c.inside}칸 · 원에 걸친 칸까지 ${c.touch}칸`; }
    case 'slices': return `반지름 ${L(sp.r)}인 원을 ${sp.n}조각으로 잘라 엇갈려 붙인 모양 (가로·세로)`;
    case 'row': return `반지름 ${L(sp.r)}인 원 ${sp.n}개를 한 줄로 맞닿게 놓은 모양 — 전체 길이 ?`;
    default: return '원';
  }
}

// ───────────────────── 🧊 O 직육면체: 겨냥도 · 전개도 (2026-10-02) ─────────────────────
// `[cuboid 5 3 4]` 직육면체 겨냥도 — 가로(앞 아래 모서리) · 세로(오른쪽 뒤로 비스듬히 들어가는 모서리) · 높이(앞 왼쪽 모서리)
//   길이 앞 `?`면 이름표 "? cm", `_`면 이름표 없음 · 길이 뒤 단위는 그 모서리만(`3m 200cm 150cm` — 그리는 비율은 cm로 맞춘다)
//   `names` 꼭짓점 ㄱ~ㅇ(윗면 ㄱㄴㄷㄹ · 아랫면 ㅁㅂㅅㅇ · 앞면 ㄹㄷㅅㅇ, ㅁ이 보이지 않는 꼭짓점) · `cubes` 1 cm 쌓기나무 줄
//   `shade=0|1|2` 윗면·앞면·오른쪽 옆면 색칠 · `miss=1,8` 그리지 않는 모서리(번호는 CUB_EDGES 순서) · 끝에 단위(cm·m)
// `[net .1../2345/.6..]` 정육면체 전개도 — 칸 숫자 1~6이 면 ㉮~㉳ (숫자를 섞으면 면 이름이 다른 칸에)
// `[net 5 3 4 .1../2345/.6.. r=2]` 직육면체 전개도 — 가로 세로 높이, r = 앞면(가로 × 높이)으로 놓는 칸
//   `names` 둘레의 점 ㄱ~ㅎ(맨 위 왼쪽 점에서 시계 방향, `s=N`이면 N번째 점이 ㄱ) · `plain` 면 이름 없음
//   `lab=0,4,7` 그 선분(둘레 순서)에 길이 · `q=9` 그 선분에 ? · `shade=2` 그 칸 색칠
// ★ 테스트가 그린 SVG에서 다시 잰다 — 겨냥도는 평행한 모서리가 정말 평행하고 길이 비율이 맞는지, 점선이 숨은 꼭짓점의 세 모서리인지,
//   전개도는 테스트가 **따로 굴려 접어** 마주 보는 면·만나는 점·겹치는 선분·칸 크기를 구한다.

/** 꼭짓점 → (가로, 세로(안쪽), 높이) 0/1 — ㅁ(뒤 왼쪽 아래)이 보이지 않는 꼭짓점 */
export const CUB_V = { 'ㄱ': [0, 1, 1], 'ㄴ': [1, 1, 1], 'ㄷ': [1, 0, 1], 'ㄹ': [0, 0, 1], 'ㅁ': [0, 1, 0], 'ㅂ': [1, 1, 0], 'ㅅ': [1, 0, 0], 'ㅇ': [0, 0, 0] };
export const CUB_EDGES = ['ㄱㄴ', 'ㄴㄷ', 'ㄷㄹ', 'ㄹㄱ', 'ㅁㅂ', 'ㅂㅅ', 'ㅅㅇ', 'ㅇㅁ', 'ㄱㅁ', 'ㄴㅂ', 'ㄷㅅ', 'ㄹㅇ'];
export const CUB_FACES = { top: 'ㄱㄴㄷㄹ', bottom: 'ㅁㅂㅅㅇ', front: 'ㄹㄷㅅㅇ', back: 'ㄱㄴㅂㅁ', left: 'ㄱㄹㅇㅁ', right: 'ㄴㄷㅅㅂ' };
/** 색칠할 수 있는 면 (보이는 세 면) — shade=0·1·2 */
export const CUB_SHADE = ['top', 'front', 'right'];
const CUB_DX = 0.5 * Math.SQRT1_2; const CUB_DY = 0.5 * Math.SQRT1_2; // 안쪽 모서리: 45°, 실제 길이의 반
const lenStr = (v) => String(Math.round(v * 100) / 100);
/** 이름표 폭 어림 — 한글·자모·㉮는 15, 그 밖 8.2 (글꼴 15 기준) */
const labW = (t) => [...String(t)].reduce((a, ch) => a + (/[ㄱ-ㅎ가-힣㉮-㉳]/.test(ch) ? 15 : 8.2), 0);
const kLab = (cls, x, y, t, extra = '') => `<text class="${cls}" x="${cf(x)}" y="${cf(y)}" font-size="15" text-anchor="middle" fill="currentColor" font-weight="600" stroke="var(--card, #fff)" stroke-width="4" stroke-linejoin="round" paint-order="stroke"${extra}>${esc(t)}</text>`;
/** 꼭짓점·점 이름(ㄱ~ㅎ)·면 이름(㉮~㉳) — 자모와 동그라미 글자는 같은 크기에서 숫자보다 작아 보여 18px 굵게 (I 줄기 polySvg와 같은 까닭, O 3단계 헤드리스) */
const JAMO_FS = 18;
const jLab = (cls, x, y, t, extra = '') => `<text class="${cls}" x="${cf(x)}" y="${cf(y)}" font-size="${JAMO_FS}" text-anchor="middle" fill="currentColor" font-weight="700" stroke="var(--card, #fff)" stroke-width="4" stroke-linejoin="round" paint-order="stroke"${extra}>${esc(t)}</text>`;

/** 글자 상자를 선분이 지나가나 (상자는 1px 줄여서 — 스치는 것은 괜찮다) */
function boxHitsSeg(b, p, q) {
  const x0 = b.x0 + 1; const x1 = b.x1 - 1; const y0 = b.y0 + 1; const y1 = b.y1 - 1;
  const inside = ([x, y]) => x > x0 && x < x1 && y > y0 && y < y1;
  if (inside(p) || inside(q)) return true;
  const cross = (a, b2, c, d) => {
    const den = (b2[0] - a[0]) * (d[1] - c[1]) - (b2[1] - a[1]) * (d[0] - c[0]);
    if (Math.abs(den) < 1e-9) return false;
    const t = ((c[0] - a[0]) * (d[1] - c[1]) - (c[1] - a[1]) * (d[0] - c[0])) / den;
    const u = ((c[0] - a[0]) * (b2[1] - a[1]) - (c[1] - a[1]) * (b2[0] - a[0])) / den;
    return t >= 0 && t <= 1 && u >= 0 && u <= 1;
  };
  const C = [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
  return C.some((c, i) => cross(p, q, c, C[(i + 1) % 4]));
}

/** `[cuboid …]` 인자 → { len:[{v, show, unit}], cm:[가로, 세로, 높이](cm), unit, names, cubes, shade, miss, with } (말이 안 되면 null)
 *  with=가로,세로,높이 — 쌓기나무 그림 둘을 견줄 때 상대 그림의 개수. 둘 중 작은 축척으로 그려 쌓기나무 크기가 같다 (O 3단계 헤드리스: ㉯의 쌓기나무가 1.6배 컸다) */
export function parseCuboid(arg) {
  const t = String(arg || '').trim().split(/\s+/).filter(Boolean);
  const sp = { unit: 'cm', len: [], names: false, cubes: false, shade: -1, miss: [], with: null };
  if (t.length && /^(cm|m)$/.test(t[t.length - 1])) sp.unit = t.pop();
  if (t.length < 3) return null;
  for (const tok of t.slice(0, 3)) {
    const m = /^([?_]?)(\d+(?:\.\d+)?)(cm|m)?$/.exec(tok);
    if (!m || !(+m[2] > 0) || +m[2] > 1000) return null;
    sp.len.push({ v: +m[2], show: m[1] === '?' ? '?' : m[1] === '_' ? '' : 'v', unit: m[3] || '' });
  }
  const seen = new Set();
  for (const tok of t.slice(3)) {
    const key = tok.split('=')[0];
    if (seen.has(key)) return null;
    seen.add(key);
    let m;
    if (tok === 'names') sp.names = true;
    else if (tok === 'cubes') sp.cubes = true;
    else if ((m = /^shade=([0-2])$/.exec(tok))) sp.shade = +m[1];
    else if ((m = /^miss=(\d+(?:,\d+)*)$/.exec(tok))) {
      sp.miss = m[1].split(',').map(Number);
      if (sp.miss.some((i) => i > 11) || new Set(sp.miss).size !== sp.miss.length) return null;
    } else if ((m = /^with=([1-8]),([1-8]),([1-8])$/.exec(tok))) sp.with = [+m[1], +m[2], +m[3]];
    else return null;
  }
  sp.cm = sp.len.map((l) => l.v * ((l.unit || sp.unit) === 'm' ? 100 : 1));
  if (Math.max(...sp.cm) / Math.min(...sp.cm) > 6) return null; // 너무 납작하면 겨냥도가 안 읽힌다
  if (sp.cubes && (sp.unit !== 'cm' || sp.len.some((l) => l.unit || !Number.isInteger(l.v) || l.v > 8))) return null;
  if (sp.with && !sp.cubes) return null;
  return sp;
}

/** 🧊 겨냥도 그리기 — 앞면은 그대로, 안쪽은 45°로 반만큼. 보이는 세 면은 연하게 칠하고 ㅁ에서 만나는 세 모서리는 점선 */
export function cuboidSvg(sp) {
  const [A, B, C] = sp.cm;
  const fit = ([a, b, c]) => Math.min(270 / (a + b * CUB_DX), 190 / (c + b * CUB_DY));
  const s = Math.min(fit(sp.cm), sp.with ? fit(sp.with) : Infinity);
  const padL = 70; const padT = 30; const padR = 74; const padB = 42;
  // with=면 바깥 폭도 두 그림 중 넓은 쪽에 맞춘다 — 폭이 다르면 좁은 화면에서 CSS(max-width 100%)가 넓은 그림만 줄여 축척이 다시 갈린다 (Codex 24차 #1). 남는 자리는 오른쪽 빈칸
  const wOf = ([a, b]) => Math.round(padL + s * (a + b * CUB_DX) + padR);
  const W = Math.max(wOf(sp.cm), sp.with ? wOf(sp.with) : 0); const H = Math.round(padT + s * (C + B * CUB_DY) + padB);
  const ox = padL; const oy = padT + s * (C + B * CUB_DY); // ㅇ(앞 왼쪽 아래)의 자리
  const P = (x, y, z) => [ox + s * (x + y * CUB_DX), oy - s * (z + y * CUB_DY)];
  const V = {};
  for (const [n, [x, y, z]] of Object.entries(CUB_V)) V[n] = P(x * A, y * B, z * C);
  const pts = (names) => [...names].map((n) => `${cf(V[n][0])},${cf(V[n][1])}`).join(' ');
  const mid = (a, b) => [(V[a][0] + V[b][0]) / 2, (V[a][1] + V[b][1]) / 2];
  let g = '';
  CUB_SHADE.forEach((f, i) => {
    const sh = sp.shade === i;
    g += `<polygon class="cub-f${sh ? ' shade' : ''}" data-f="${CUB_FACES[f]}" points="${pts(CUB_FACES[f])}" fill="${sh ? FILL2 : FILL}" fill-opacity="${sh ? 0.42 : f === 'front' ? 0.1 : 0.17}"/>`;
  });
  if (sp.cubes) {
    const L = (f, a, b) => `<line class="cub-grid" data-f="${f}" x1="${cf(a[0])}" y1="${cf(a[1])}" x2="${cf(b[0])}" y2="${cf(b[1])}" stroke="currentColor" stroke-opacity="0.45" stroke-width="1"/>`;
    for (let i = 1; i < A; i++) { g += L('front', P(i, 0, 0), P(i, 0, C)); g += L('top', P(i, 0, C), P(i, B, C)); }
    for (let k = 1; k < C; k++) { g += L('front', P(0, 0, k), P(A, 0, k)); g += L('right', P(A, 0, k), P(A, B, k)); }
    for (let j = 1; j < B; j++) { g += L('top', P(0, j, C), P(A, j, C)); g += L('right', P(A, j, 0), P(A, j, C)); }
  }
  CUB_EDGES.forEach((e, i) => {
    if (sp.miss.includes(i)) return;
    const hid = e.includes('ㅁ');
    // 쌓기나무는 꽉 찬 덩어리 — 교과서처럼 숨은 모서리 점선을 그리지 않는다 (점선이 칸 줄과 3~5px 옆에 겹쳐 두 줄로 보였다)
    if (hid && sp.cubes) return;
    const a = V[e[0]]; const b = V[e[1]];
    g += `<line class="cub-e" data-i="${i}" data-e="${e}" data-hid="${hid ? 1 : 0}" x1="${cf(a[0])}" y1="${cf(a[1])}" x2="${cf(b[0])}" y2="${cf(b[1])}" stroke="currentColor" stroke-width="${hid ? 1.6 : 2.2}"${hid ? ' stroke-dasharray="6 4"' : ''} stroke-linecap="round"/>`;
  });
  for (const n of Object.keys(CUB_V)) g += `<circle class="cub-v" data-v="${n}" cx="${cf(V[n][0])}" cy="${cf(V[n][1])}" r="0"/>`;
  // 길이 — 가로는 앞 아래 모서리 밑, 높이는 앞 왼쪽 모서리 왼쪽, 세로는 오른쪽 아래 비스듬한 모서리의 오른쪽 아래
  const unitOf = (l) => l.unit || sp.unit;
  const lenText = (l) => (l.show === '?' ? `? ${unitOf(l)}` : `${lenStr(l.v)} ${unitOf(l)}`);
  const [la, lb, lc] = sp.len;
  if (la.show) { const m = mid('ㅇ', 'ㅅ'); g += kLab('cub-lab cub-len', m[0], m[1] + 26, lenText(la), ' data-k="a"'); }
  if (lc.show) { const m = mid('ㄹ', 'ㅇ'); const t = lenText(lc); g += kLab('cub-lab cub-len', m[0] - labW(t) / 2 - 12, m[1] + 5, t, ' data-k="c"'); }
  if (lb.show) {
    const m = mid('ㅅ', 'ㅂ'); const t = lenText(lb); const d = Math.SQRT1_2 * (labW(t) / 2 + 9) + 8;
    g += kLab('cub-lab cub-len', m[0] + Math.SQRT1_2 * d, m[1] + Math.SQRT1_2 * d + 5, t, ' data-k="b"');
  }
  if (sp.names) {
    // 꼭짓점 이름 — 후보 자리를 차례로 시험해 모서리 선을 지나지 않고 다른 글자와 안 겹치는 첫 자리에.
    // 먼저 시험하는 쪽: 바깥 테두리의 여섯 꼭짓점은 그림 한가운데에서 바깥쪽, ㄷ은 앞면 안쪽, ㅁ은 점선 세 개 사이 빈 쪽(왼쪽 위).
    // (헤드리스·테스트: 깊은 상자에서 앞면 안쪽 ㄷ 자리를 점선 ㄱㅁ이 지나갔다)
    const segs = CUB_EDGES.filter((e, i) => !sp.miss.includes(i) && !(sp.cubes && e.includes('ㅁ'))).map((e) => [V[e[0]], V[e[1]]]);
    const taken = labelBoxesOf(g);
    const sil = ['ㄱ', 'ㄴ', 'ㅂ', 'ㅅ', 'ㅇ', 'ㄹ'];
    const cx = sil.reduce((a, n) => a + V[n][0], 0) / 6; const cy = sil.reduce((a, n) => a + V[n][1], 0) / 6;
    const base = (n) => (n === 'ㄷ' ? Math.atan2(0.8, -0.6) : n === 'ㅁ' ? Math.atan2(-0.5, -0.86) : Math.atan2(V[n][1] - cy, V[n][0] - cx));
    for (const n of [...sil, 'ㄷ', 'ㅁ']) {
      const w = (labW(n) * JAMO_FS) / 15; const dy = JAMO_FS * 0.28; let best = null; // dy: 글자 가운데 → 바탕선
      for (const k of [0, 1, -1, 2, -2, 3, -3, 4, -4, 5, -5, 6, -6, 7, -7, 8]) {
        for (const rr of [17, 20, 23]) {
          const a = base(n) + (k * Math.PI) / 8; const x = V[n][0] + Math.cos(a) * rr; const yc = V[n][1] + Math.sin(a) * rr;
          const b = { x0: x - w / 2, x1: x + w / 2, y0: yc + dy - JAMO_FS * 0.78, y1: yc + dy + JAMO_FS * 0.22 };
          if (b.x0 < 0 || b.y0 < 0 || b.x1 > W || b.y1 > H) continue;
          // 1px 넓혀서 — SVG에 반올림해 적은 좌표로 다시 재면 경계에 딱 걸리는 자리가 있다 (18px로 키운 뒤 깊은 상자 ㄷ)
          if (segs.some(([p, q]) => boxHitsSeg({ x0: b.x0 - 1, x1: b.x1 + 1, y0: b.y0 - 1, y1: b.y1 + 1 }, p, q))) continue;
          if (taken.some((z) => b.x0 < z.x1 && z.x0 < b.x1 && b.y0 < z.y1 && z.y0 < b.y1)) continue;
          // 남의 꼭짓점에 더 가까우면 그 꼭짓점 이름으로 읽힌다 (깊은 상자 3·9·4에서 ㅁ이 ㄷ 옆에)
          if (Object.keys(V).some((m) => m !== n && Math.hypot(V[m][0] - x, V[m][1] - yc) <= rr + 2)) continue;
          best = { x, y: yc + dy, b };
          break;
        }
        if (best) break;
      }
      if (!best) { const a = base(n); best = { x: V[n][0] + Math.cos(a) * 17, y: V[n][1] + Math.sin(a) * 17 + dy }; }
      if (best.b) taken.push(best.b);
      g += jLab('cub-lab cub-name', best.x, best.y, n, ` data-v="${n}"`);
    }
  }
  return `<svg class="frac-fig shape-fig cub-fig" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${esc(cuboidText(sp))}"><g>${g}</g></svg>`;
}

/** 🧊 겨냥도를 글로 — ❓ 복사문·노트 제목처럼 그림을 못 그리는 자리 */
export function cuboidText(sp) {
  const unitOf = (l) => l.unit || sp.unit;
  const L = (l) => (l.show === '?' ? `? ${unitOf(l)}` : `${lenStr(l.v)} ${unitOf(l)}`);
  const cube = sp.cm[0] === sp.cm[1] && sp.cm[1] === sp.cm[2];
  const shown = sp.len.map((l, i) => (l.show ? `${['가로', '세로', '높이'][i]} ${L(l)}` : '')).filter(Boolean);
  const parts = [`${cube ? '정육면체' : '직육면체'} 그림`];
  if (shown.length) parts.push(shown.join(' · '));
  if (sp.names) parts.push('꼭짓점 ㄱ~ㅇ (윗면 ㄱㄴㄷㄹ · 아랫면 ㅁㅂㅅㅇ · 앞면 ㄹㄷㅅㅇ · ㅁ은 보이지 않는 꼭짓점)');
  // 개수까지 — 📊 아빠 화면 펼친 문제가 이 글만 보여 준다 (O 3단계 헤드리스: 개수가 없어 무슨 그림인지 몰랐다). 아이에게 보이는 한 줄은 "(그림)"이라 답이 새지 않는다
  if (sp.cubes) parts.push(`한 모서리가 1 cm인 쌓기나무로 쌓은 모양 (가로 ${sp.cm[0]}개 · 세로 ${sp.cm[1]}개 · ${sp.cm[2]}층)`);
  if (sp.shade >= 0) parts.push(`${['윗면', '앞면', '오른쪽 옆면'][sp.shade]} 색칠`);
  if (sp.miss.length) parts.push(`그리지 않은 모서리 ${sp.miss.length}개 (${sp.miss.map((i) => CUB_EDGES[i]).join('·')})`);
  return `${parts.join(' — ')}${sp.cubes ? '' : ' (보이지 않는 모서리는 점선)'}`;
}

export const NET_FACE = ['㉮', '㉯', '㉰', '㉱', '㉲', '㉳'];
export const NET_PT = ['ㄱ', 'ㄴ', 'ㄷ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅅ', 'ㅇ', 'ㅈ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];
const vNeg = (v) => v.map((x) => -x);
const vKey = (v) => v.join(',');
/** 접기 — 칸마다 세 축 [h 그림의 오른쪽, v 그림의 위쪽, n 접은 면의 바깥 법선]. 오른쪽 칸은 (h, v, n) → (−n, v, h) */
const NET_MOVE = {
  right: ([h, v, n]) => [vNeg(n), v, h],
  left: ([h, v, n]) => [n, v, vNeg(h)],
  up: ([h, v, n]) => [h, vNeg(n), v],
  down: ([h, v, n]) => [h, n, vNeg(v)],
};

/** `[net …]` 인자 → { dims, rows, cells, names, plain, s, root, lab, q, shade, unit, L(접은 결과) } (말이 안 되면 null) */
export function parseNet(arg) {
  const t = String(arg || '').trim().split(/\s+/).filter(Boolean);
  const sp = { unit: 'cm', dims: null, rows: [], cells: [], names: false, plain: false, s: 0, root: 0, lab: [], q: -1, shade: 0 };
  if (t.length && /^(cm|m)$/.test(t[t.length - 1])) sp.unit = t.pop();
  if (t.length >= 4 && t.slice(0, 3).every((x) => /^\d+$/.test(x))) {
    sp.dims = t.splice(0, 3).map(Number);
    if (sp.dims.some((v) => v < 1 || v > 40)) return null;
  }
  const shape = t.shift();
  if (!shape || !/^[.1-6]+(\/[.1-6]+)+$/.test(shape)) return null;
  sp.rows = shape.split('/');
  sp.rows.forEach((row, r) => [...row].forEach((ch, c) => { if (ch !== '.') sp.cells.push({ d: +ch, r, c }); }));
  if (sp.cells.length !== 6 || new Set(sp.cells.map((x) => x.d)).size !== 6) return null;
  const seen = new Set();
  for (const tok of t) {
    const key = tok.split('=')[0];
    if (seen.has(key)) return null;
    seen.add(key);
    let m;
    if (tok === 'names') sp.names = true;
    else if (tok === 'plain') sp.plain = true;
    else if ((m = /^s=(\d+)$/.exec(tok))) sp.s = +m[1];
    else if ((m = /^r=([1-6])$/.exec(tok))) sp.root = +m[1];
    else if ((m = /^lab=(\d+(?:,\d+)*)$/.exec(tok))) sp.lab = m[1].split(',').map(Number);
    else if ((m = /^q=(\d+)$/.exec(tok))) sp.q = +m[1];
    else if ((m = /^shade=([1-6])$/.exec(tok))) sp.shade = +m[1];
    else return null;
  }
  const L = netLayout(sp);
  if (!L) return null;
  if (sp.dims && !L.valid) return null; // 직육면체 전개도는 접히는 것만
  if ((sp.lab.length || sp.q >= 0) && !sp.dims) return null; // 길이 이름표는 직육면체 전개도에만
  const n = L.pts.length;
  if (sp.s >= n || sp.lab.some((i) => i >= n) || sp.q >= n || sp.lab.includes(sp.q) || new Set(sp.lab).size !== sp.lab.length) return null;
  sp.L = L;
  return sp;
}

/**
 * 전개도 칸 → 접은 면(세 축)·크기·자리 · 둘레의 점(맨 위 왼쪽에서 시계 방향)과 선분 · 점이 접혀 가는 꼭짓점.
 * valid: 접으면 정육면체(직육면체)가 되는가 — 칸이 나무 모양(2×2 덩어리 없음)이고 여섯 법선이 모두 다를 때.
 * 직육면체는 칸 크기가 달라서, 붙어 있는 칸끼리 변 전체가 맞닿게 놓고 겹치거나 이음이 아닌 데서 닿으면 null.
 */
export function netLayout(sp) {
  const cells = sp.cells.map((c) => ({ ...c }));
  const at = new Map(cells.map((c) => [`${c.r},${c.c}`, c]));
  const links = [];
  for (const c of cells) {
    const rt = at.get(`${c.r},${c.c + 1}`); const dn = at.get(`${c.r + 1},${c.c}`);
    if (rt) links.push({ a: c, b: rt, dir: 'h' });
    if (dn) links.push({ a: c, b: dn, dir: 'v' });
  }
  const root = (sp.root && cells.find((c) => c.d === sp.root)) || cells[0];
  root.f = [[1, 0, 0], [0, 0, 1], [0, -1, 0]]; // 앞면: 오른쪽 = 가로, 위쪽 = 높이, 바깥 = 앞
  const order = [root]; const seen = new Set([root]);
  for (let i = 0; i < order.length; i++) {
    const c = order[i];
    for (const [dr, dc, mv] of [[0, 1, 'right'], [0, -1, 'left'], [-1, 0, 'up'], [1, 0, 'down']]) {
      const nb = at.get(`${c.r + dr},${c.c + dc}`);
      if (!nb || seen.has(nb)) continue;
      nb.f = NET_MOVE[mv](c.f); nb.parent = c; nb.mv = mv; seen.add(nb); order.push(nb);
    }
  }
  if (order.length !== 6) return null; // 떨어진 칸
  const valid = links.length === 5 && new Set(cells.map((c) => vKey(c.f[2]))).size === 6;
  const dims = sp.dims || [1, 1, 1];
  const axisLen = (v) => dims[v.findIndex((x) => x !== 0)];
  for (const c of cells) { c.w = axisLen(c.f[0]); c.h = axisLen(c.f[1]); }
  if (sp.dims) {
    root.x = 0; root.y = 0;
    for (const c of order.slice(1)) {
      const p = c.parent;
      if (c.mv === 'right') { c.x = p.x + p.w; c.y = p.y; } else if (c.mv === 'left') { c.x = p.x - c.w; c.y = p.y; } else if (c.mv === 'up') { c.x = p.x; c.y = p.y - c.h; } else { c.x = p.x; c.y = p.y + p.h; }
    }
    const mx = Math.min(...cells.map((c) => c.x)); const my = Math.min(...cells.map((c) => c.y));
    for (const c of cells) { c.x -= mx; c.y -= my; }
  } else for (const c of cells) { c.x = c.c; c.y = c.r; }
  const E = 1e-9;
  for (let i = 0; i < 6; i++) {
    for (let j = i + 1; j < 6; j++) {
      const a = cells[i]; const b = cells[j];
      const ox = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x); const oy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
      if (ox > E && oy > E) return null; // 겹침
      const linked = links.some((l) => (l.a === a && l.b === b) || (l.a === b && l.b === a));
      if (!linked && ((Math.abs(ox) < E && oy > E) || (Math.abs(oy) < E && ox > E))) return null; // 이음이 아닌 데서 변이 닿음
    }
  }
  // 둘레 — 칸의 변을 다른 칸의 귀퉁이에서 나눠, 한 번만 나오는 조각이 둘레
  const pkey = (x, y) => `${Math.round(x * 1e6)},${Math.round(y * 1e6)}`;
  const ptMap = new Map();
  const corners = (c) => [[c.x, c.y, -1, 1], [c.x + c.w, c.y, 1, 1], [c.x + c.w, c.y + c.h, 1, -1], [c.x, c.y + c.h, -1, -1]]; // (x, y, h 쪽, v 쪽)
  for (const c of cells) for (const [x, y] of corners(c)) { const k = pkey(x, y); if (!ptMap.has(k)) ptMap.set(k, { x, y, k, v: null }); }
  const all = [...ptMap.values()];
  const pieces = new Map();
  for (const c of cells) {
    const cs = corners(c);
    for (let i = 0; i < 4; i++) {
      const [x1, y1] = cs[i]; const [x2, y2] = cs[(i + 1) % 4];
      const on = all.filter((p) => (Math.abs(x1 - x2) < E
        ? Math.abs(p.x - x1) < E && p.y > Math.min(y1, y2) - E && p.y < Math.max(y1, y2) + E
        : Math.abs(p.y - y1) < E && p.x > Math.min(x1, x2) - E && p.x < Math.max(x1, x2) + E));
      on.sort((p, q) => (p.x - q.x) || (p.y - q.y));
      for (let k = 0; k + 1 < on.length; k++) {
        const key = [on[k].k, on[k + 1].k].sort().join('|');
        const pc = pieces.get(key) || { a: on[k], b: on[k + 1], n: 0 };
        pc.n += 1; pieces.set(key, pc);
      }
    }
  }
  const nbr = new Map();
  for (const p of [...pieces.values()].filter((z) => z.n === 1)) {
    for (const [u, w] of [[p.a, p.b], [p.b, p.a]]) { if (!nbr.has(u.k)) nbr.set(u.k, []); nbr.get(u.k).push(w); }
  }
  if ([...nbr.values()].some((l) => l.length !== 2)) return null;
  const start = [...nbr.keys()].map((k) => ptMap.get(k)).sort((p, q) => (p.y - q.y) || (p.x - q.x))[0];
  const pts = [start];
  let prev = start; let cur = nbr.get(start.k).find((q) => Math.abs(q.y - start.y) < E && q.x > start.x);
  if (!cur) return null;
  while (cur !== start) {
    pts.push(cur);
    const nx = nbr.get(cur.k).find((q) => q !== prev);
    prev = cur; cur = nx;
    if (pts.length > 40) return null;
  }
  if (pts.length !== nbr.size) return null;
  // 점 → 접은 꼭짓점 (부호 셋 "x,y,z") — 접히는 전개도만
  if (valid) {
    for (const c of cells) {
      const [h, v, n] = c.f;
      for (const [x, y, sh, sv] of corners(c)) {
        const id = vKey(n.map((nz, i) => nz + sh * h[i] + sv * v[i]));
        const p = ptMap.get(pkey(x, y));
        if (p.v && p.v !== id) return null;
        p.v = id;
      }
    }
  }
  const segs = pts.map((p, i) => {
    const q = pts[(i + 1) % pts.length];
    return { i, a: i, b: (i + 1) % pts.length, len: Math.hypot(q.x - p.x, q.y - p.y), e: valid ? [p.v, q.v].sort().join('|') : null };
  });
  return { cells, links, pts, segs, valid };
}

/** 🧊 전개도 그리기 — 칸은 연하게, 접히는 선은 점선, 둘레는 실선 */
export function netSvg(sp) {
  const { cells, links, pts, segs } = sp.L;
  const totW = Math.max(...cells.map((c) => c.x + c.w)); const totH = Math.max(...cells.map((c) => c.y + c.h));
  const lens = sp.lab.length > 0 || sp.q >= 0;
  const pad = lens ? 48 : sp.names ? 32 : 14;
  const u = Math.min(sp.dims ? 300 / totW : 64, sp.dims ? 250 / totH : 64, 330 / totW, 290 / totH);
  const X = (x) => pad + x * u; const Y = (y) => pad + y * u;
  const W = Math.round(2 * pad + totW * u); const H = Math.round(2 * pad + totH * u);
  const n = pts.length;
  const nameOf = (i) => NET_PT[(i - sp.s + n) % n] || '';
  // 둘레 선분의 바깥쪽 — 시계 방향으로 돌면 안쪽이 오른쪽 (화면은 아래가 +y)
  const outw = (i) => { const p = pts[i]; const q = pts[(i + 1) % n]; const L = Math.hypot(q.x - p.x, q.y - p.y); return [(q.y - p.y) / L, -(q.x - p.x) / L]; };
  let g = '';
  for (const c of cells) {
    const sh = sp.shade === c.d;
    g += `<rect class="net-c" data-d="${c.d}" x="${cf(X(c.x))}" y="${cf(Y(c.y))}" width="${cf(c.w * u)}" height="${cf(c.h * u)}" fill="${sh ? FILL2 : FILL}" fill-opacity="${sh ? 0.4 : 0.12}"/>`;
  }
  for (const l of links) {
    const b = l.b;
    const [x1, y1, x2, y2] = l.dir === 'h' ? [b.x, b.y, b.x, b.y + b.h] : [b.x, b.y, b.x + b.w, b.y];
    g += `<line class="net-fold" data-a="${l.a.d}" data-b="${b.d}" x1="${cf(X(x1))}" y1="${cf(Y(y1))}" x2="${cf(X(x2))}" y2="${cf(Y(y2))}" stroke="currentColor" stroke-width="1.4" stroke-dasharray="5 4" stroke-opacity="0.8"/>`;
  }
  for (const sg of segs) {
    const p = pts[sg.a]; const q = pts[sg.b];
    g += `<line class="net-seg" data-i="${sg.i}" data-a="${nameOf(sg.a)}" data-b="${nameOf(sg.b)}" x1="${cf(X(p.x))}" y1="${cf(Y(p.y))}" x2="${cf(X(q.x))}" y2="${cf(Y(q.y))}" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>`;
  }
  if (!sp.plain) for (const c of cells) g += jLab('net-lab net-face', X(c.x + c.w / 2), Y(c.y + c.h / 2) + JAMO_FS * 0.28, NET_FACE[c.d - 1], ` data-d="${c.d}"`);
  if (sp.names) {
    pts.forEach((p, i) => {
      const o1 = outw((i - 1 + n) % n); const o2 = outw(i);
      let dx = o1[0] + o2[0]; let dy = o1[1] + o2[1]; const L = Math.hypot(dx, dy) || 1; dx /= L; dy /= L;
      g += jLab('net-lab net-name', X(p.x) + dx * 16, Y(p.y) + dy * 16 + JAMO_FS * 0.28, nameOf(i), ` data-i="${i}"`);
    });
  }
  for (const i of [...sp.lab, ...(sp.q >= 0 ? [sp.q] : [])]) {
    const sg = segs[i]; const p = pts[sg.a]; const q = pts[sg.b]; const [ox, oy] = outw(i);
    const t = i === sp.q ? `? ${sp.unit}` : `${lenStr(sg.len)} ${sp.unit}`;
    const off = Math.abs(ox) * (labW(t) / 2 + 8) + Math.abs(oy) * 14;
    g += kLab('net-lab net-len', X((p.x + q.x) / 2) + ox * off, Y((p.y + q.y) / 2) + oy * off + 5, t, ` data-i="${i}"`);
  }
  return `<svg class="frac-fig shape-fig net-fig" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${esc(netText(sp))}" data-u="${u.toFixed(4)}" data-pad="${pad}"><g>${g}</g></svg>`;
}

/** 🧊 전개도를 글로 — 줄마다 칸 */
export function netText(sp) {
  const rows = sp.rows.map((row) => [...row].map((ch) => (ch === '.' ? '·' : sp.plain ? '■' : NET_FACE[+ch - 1])).join(' ')).join(' / ');
  const what = sp.dims ? `가로 ${sp.dims[0]} ${sp.unit} · 세로 ${sp.dims[1]} ${sp.unit} · 높이 ${sp.dims[2]} ${sp.unit}인 직육면체의 전개도`
    : sp.plain ? '정사각형 6개를 이어 붙인 모양' : '정육면체의 전개도';
  const parts = [`${what} — 줄마다 칸 [ ${rows} ]`];
  if (sp.names) parts.push(`둘레의 점 ㄱ~ㅎ (맨 위 왼쪽 점${sp.s ? `에서 시계 방향으로 ${sp.s}칸 간 점` : ''}이 ㄱ, 시계 방향)`);
  // 길이·?가 어느 면의 어느 변인지까지 — 📊 아빠 화면 펼친 문제가 이 글만 보여 준다. 자리 없이 "? 표시 선분 하나"라 q=2(3 cm)·q=3(7 cm)이 같은 글이었다 (Codex 24차 #3)
  const where = (i) => {
    const g = sp.L.segs[i]; const p = sp.L.pts[g.a]; const q = sp.L.pts[g.b];
    const on = (v, a, b) => v >= Math.min(a, b) - 1e-9 && v <= Math.max(a, b) + 1e-9;
    for (const c of sp.L.cells) {
      const side = p.y === q.y && on(p.x, c.x, c.x + c.w) && on(q.x, c.x, c.x + c.w) ? (p.y === c.y ? '위쪽' : p.y === c.y + c.h ? '아래쪽' : '')
        : p.x === q.x && on(p.y, c.y, c.y + c.h) && on(q.y, c.y, c.y + c.h) ? (p.x === c.x ? '왼쪽' : p.x === c.x + c.w ? '오른쪽' : '') : '';
      if (side) return sp.plain ? `${c.r + 1}째 줄 칸의 ${side} 변` : `면 ${NET_FACE[c.d - 1]}의 ${side} 변`;
    }
    return '';
  };
  if (sp.lab.length) parts.push(`길이 이름표 ${sp.lab.map((i) => `${where(i)} ${lenStr(sp.L.segs[i].len)} ${sp.unit}`.trim()).join(' · ')}`);
  if (sp.q >= 0) parts.push(`? 표시 ${where(sp.q) || '선분 하나'}`);
  return parts.join(' · ');
}

// ───────────────────── 🔷 P 입체도형: 각기둥·각뿔·원기둥·원뿔·구 · 돌리기 · 각기둥 전개도 · 원기둥 전개도 (2026-10-02) ─────────────────────
// 각기둥·각뿔은 몸 좌표(x 가로, y 안쪽, z 위)를 화면 X = x + SX·y, Y = −z − SY·y로 옮긴다 — 앞·오른쪽·위에서 내려다본 평행 투영.
//   보는 쪽 V = (SX, −1, SY): 바깥 법선 n이 n·V > 0인 면이 보이고, 두 면이 모두 안 보이는 모서리만 점선이다 (O 겨냥도와 같은 약속).
//   정다각형 밑면은 옆면이 선 하나로 눕지 않게 — 모든 면의 |n̂·V̂| 중 가장 작은 값이 가장 큰 돌림각을 고른다.
// 원기둥·원뿔·구는 SX = 0으로 그린다 — 밑면 원이 반듯한 타원(rx = R, ry = SY·R).
// 길이는 실제 비율대로 — 밑면의 한 변·높이·옆 모서리(모선)가 함께 적히면 서로 맞아야 그려진다 (그림이 거짓말하지 않게).
// 이름표는 후보 자리를 차례로 시험해 선·곡선·다른 이름표와 안 겹치는 첫 자리에 (O 겨냥도와 같은 방법).

const SOL_SX = 0.3; const SOL_SY = 0.42;
/** 보는 쪽 (테스트가 보이는 면을 따로 다시 계산한다) */
export const SOL_VIEW = [SOL_SX, -1, SOL_SY];
export const POLY_KO = { 3: '삼각형', 4: '사각형', 5: '오각형', 6: '육각형', 7: '칠각형', 8: '팔각형' };
const sLen = (v) => v === '?' || (Number.isInteger(v) && v >= 1 && v <= 40);
const isNum = (v) => typeof v === 'number' && Number.isFinite(v);
const sub3 = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot3 = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const solLenText = (v, u) => (v === '?' ? `? ${u}` : `${v} ${u}`);
const solLab = (cls, x, y, t, extra = '') => kLab(cls, x, y, t, extra);

/** 글자 상자 (kLab 15px — 바탕선 y) */
const solBox = (t, x, y) => { const w = labW(t); return { x0: x - w / 2, x1: x + w / 2, y0: y - 11.7, y1: y + 3.3 }; };
const boxHit = (a, b) => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;
const grow1 = (b) => ({ x0: b.x0 - 1, x1: b.x1 + 1, y0: b.y0 - 1, y1: b.y1 + 1 });
/** 곡선(타원 둘레)의 점 — 상자 안에 들어오면 곡선이 글자를 지나간다 */
function ellPts(cx, cy, rx, ry, a0 = 0, a1 = 2 * Math.PI, n = 96) {
  const out = [];
  for (let i = 0; i <= n; i++) { const t = a0 + ((a1 - a0) * i) / n; out.push([cx + rx * Math.cos(t), cy + ry * Math.sin(t)]); }
  return out;
}
const ptsInBox = (pts, b) => pts.some(([x, y]) => x > b.x0 - 1 && x < b.x1 + 1 && y > b.y0 - 1 && y < b.y1 + 1);

/**
 * 이름표 자리 찾기 — (mx, my)에서 (ox, oy) 쪽으로 차츰 멀리, 옆으로 조금씩 비키며 선분·곡선 점·다른 이름표와 안 겹치는 첫 자리
 * @returns {{x:number, y:number, box:object}}
 */
const segDist = (x, y, [p, q]) => { const vx = q[0] - p[0]; const vy = q[1] - p[1]; const t = Math.max(0, Math.min(1, ((x - p[0]) * vx + (y - p[1]) * vy) / (vx * vx + vy * vy || 1))); return Math.hypot(p[0] + vx * t - x, p[1] + vy * t - y); };
function solPlace(t, mx, my, ox, oy, segs, curves, taken, dists = [8, 12, 16, 22, 30, 40, 52], own = null) {
  const L = Math.hypot(ox, oy) || 1; ox /= L; oy /= L;
  const w = labW(t); const half = Math.abs(ox) * (w / 2) + Math.abs(oy) * 7.5;
  for (const d of dists) {
    for (const sh of [0, 8, -8, 16, -16, 26, -26]) {
      const cx = mx + ox * (d + half) - oy * sh; const cy = my + oy * (d + half) + ox * sh;
      const y = cy + 4.2; const b = solBox(t, cx, y);
      if (segs.some(([p, q]) => boxHitsSeg(grow1(b), p, q))) continue;
      if (own && segs.some((sg) => sg !== own && segDist(cx, cy, sg) <= segDist(cx, cy, own) + 0.5)) continue;
      if (curves.some((pts) => ptsInBox(pts, b))) continue;
      if (taken.some((z) => boxHit(z, b))) continue;
      taken.push(b);
      return { x: cx, y, box: b };
    }
  }
  const cx = mx + ox * (dists[dists.length - 1] + half); const y = my + oy * (dists[dists.length - 1] + half) + 4.2;
  const b = solBox(t, cx, y); taken.push(b);
  return { x: cx, y, box: b };
}

/** `[prism …]`·`[pyramid …]`·`[cyl …]`·`[cone …]`·`[sphere …]` 인자 → sp (말이 안 되면 null)
 *  prism: n=3..8 · a=밑면의 한 변 · h=높이 · shade=b(밑면)|s(앞 옆면) · lie(옆으로 눕힘, n 3~6, 길이 없음)
 *  pyramid: n · a · h(점선 높이) · e(옆 모서리) · shade · cyl: r|d · h · cone: r|d · h · l(모선) · sphere: r|d
 *  값은 1~40 자연수나 ?(그림에 "? cm"). 끝에 단위 cm|m */
export function parseSolid(kind, arg) {
  const KEYS = { prism: ['n', 'a', 'h', 'shade', 'lie'], pyramid: ['n', 'a', 'h', 'e', 'shade'], cyl: ['r', 'd', 'h'], cone: ['r', 'd', 'h', 'l'], sphere: ['r', 'd'] }[kind];
  if (!KEYS) return null;
  const t = String(arg || '').trim().split(/\s+/).filter(Boolean);
  const sp = { kind, unit: 'cm', n: 0, shade: '', lie: false };
  if (t.length && /^(cm|m)$/.test(t[t.length - 1])) sp.unit = t.pop();
  const seen = new Set();
  for (const tok of t) {
    const q = /^([a-z]+)(?:=([bs?]|\d+))?$/.exec(tok);
    if (!q || seen.has(q[1]) || !KEYS.includes(q[1])) return null;
    seen.add(q[1]);
    const k = q[1]; const raw = q[2];
    if (k === 'lie') { if (raw !== undefined) return null; sp.lie = true; continue; }
    if (k === 'shade') { if (raw !== 'b' && raw !== 's') return null; sp.shade = raw; continue; }
    if (raw === undefined || raw === 'b' || raw === 's') return null;
    const v = raw === '?' ? '?' : +raw;
    if (k === 'n') { if (!Number.isInteger(v) || v < 3 || v > 8) return null; sp.n = v; continue; }
    if (!sLen(v)) return null;
    sp[k] = v;
  }
  if ('r' in sp && 'd' in sp) return null;
  const D = {};
  if (kind === 'prism' || kind === 'pyramid') {
    if (!sp.n) return null;
    if (sp.lie && (kind !== 'prism' || sp.n > 6 || 'a' in sp || 'h' in sp)) return null;
    if (kind === 'pyramid' && sp.shade === 'b') return null; // 각뿔의 밑면은 위에서 안 보여 색칠이 안 보인다
    const sn = Math.sin(Math.PI / sp.n);
    let a = isNum(sp.a) ? sp.a : null; let h = isNum(sp.h) ? sp.h : null;
    if (kind === 'pyramid' && isNum(sp.e)) {
      const e = sp.e;
      if (a !== null && h !== null) { const Rb = a / (2 * sn); if (Math.abs(e * e - (h * h + Rb * Rb)) > 1e-6 * e * e) return null; }
      else if (h !== null) { if (e <= h) return null; a = 2 * sn * Math.sqrt(e * e - h * h); }
      else { if (a === null) a = e * 0.6; const Rb = a / (2 * sn); if (e <= Rb) return null; h = Math.sqrt(e * e - Rb * Rb); }
    }
    if (a === null) a = h !== null ? h * 0.6 : 3;
    if (h === null) h = (a / (2 * sn)) * (kind === 'prism' ? 2.2 : 2.4);
    D.a = a; D.Rb = a / (2 * sn); D.H = h;
    const ratio = D.H / (2 * D.Rb);
    if (ratio < 0.3 || ratio > 3.2) return null;
    D.e = Math.sqrt(D.H * D.H + D.Rb * D.Rb);
  } else if (kind === 'cyl' || kind === 'cone') {
    let r = isNum(sp.r) ? sp.r : isNum(sp.d) ? sp.d / 2 : null; let h = isNum(sp.h) ? sp.h : null;
    if (kind === 'cone' && isNum(sp.l)) {
      const l = sp.l;
      if (r !== null && h !== null) { if (l * l !== r * r + h * h) return null; }
      else if (r !== null) { if (l <= r) return null; h = Math.sqrt(l * l - r * r); }
      else if (h !== null) { if (l <= h) return null; r = Math.sqrt(l * l - h * h); }
      else { r = l * 0.6; h = l * 0.8; }
    }
    if (r === null) r = h !== null ? h * 0.5 : 3;
    if (h === null) h = r * (kind === 'cyl' ? 2 : 2.2);
    const ratio = h / r;
    if (ratio < (kind === 'cyl' ? 0.4 : 0.6) || ratio > 3.6) return null;
    D.r = r; D.H = h; D.l = Math.sqrt(r * r + h * h);
  } else {
    D.r = isNum(sp.r) ? sp.r : isNum(sp.d) ? sp.d / 2 : 3;
  }
  sp.draw = D;
  return sp;
}

/** 각기둥·각뿔의 꼭짓점·면 — 몸 좌표. 면마다 바깥 법선 nrm, 종류 base|side */
export function solidMesh(sp) {
  const { n } = sp; const D = sp.draw;
  const build = (phi0) => {
    const V = []; const F = [];
    if (sp.kind === 'prism' && sp.lie) {
      // 옆으로 눕힘: 밑면은 x = 0, x = L, 한 옆면이 바닥에 평평하게 — 그다음 z축으로 phi0(음수)만큼 돌려 오른쪽 밑면이 앞을 보게
      // (돌리지 않으면 밑면이 옆에서 보여 얇은 조각으로 그려졌다 — P 1단계 갤러리)
      const apo = D.Rb * Math.cos(Math.PI / n); const cb = Math.cos(phi0); const sb = Math.sin(phi0);
      for (const x of [0, D.H]) for (let i = 0; i < n; i++) { const a = -Math.PI / 2 - Math.PI / n + (2 * Math.PI * i) / n; const y = D.Rb * Math.cos(a); V.push([x * cb - y * sb, x * sb + y * cb, D.Rb * Math.sin(a) + apo]); }
    } else {
      for (let i = 0; i < n; i++) { const a = phi0 + (2 * Math.PI * i) / n; V.push([D.Rb * Math.cos(a), D.Rb * Math.sin(a), 0]); }
      if (sp.kind === 'prism') for (let i = 0; i < n; i++) V.push([V[i][0], V[i][1], D.H]);
      else V.push([0, 0, D.H]);
    }
    const ring = [...Array(n).keys()];
    if (sp.kind === 'prism') {
      F.push({ kind: 'base', idx: ring.slice().reverse() }, { kind: 'base', idx: ring.map((i) => n + i) });
      for (let i = 0; i < n; i++) F.push({ kind: 'side', i, idx: [i, (i + 1) % n, n + ((i + 1) % n), n + i] });
    } else {
      F.push({ kind: 'base', idx: ring.slice().reverse() });
      for (let i = 0; i < n; i++) F.push({ kind: 'side', i, idx: [i, (i + 1) % n, n] });
    }
    const C = V.reduce((s, p) => [s[0] + p[0] / V.length, s[1] + p[1] / V.length, s[2] + p[2] / V.length], [0, 0, 0]);
    for (const f of F) {
      let nx = 0; let ny = 0; let nz = 0;
      f.idx.forEach((ia, k) => { const p = V[ia]; const q = V[f.idx[(k + 1) % f.idx.length]]; nx += (p[1] - q[1]) * (p[2] + q[2]); ny += (p[2] - q[2]) * (p[0] + q[0]); nz += (p[0] - q[0]) * (p[1] + q[1]); });
      let nrm = [nx, ny, nz]; const L = Math.hypot(nx, ny, nz); nrm = nrm.map((v) => v / L);
      const fc = f.idx.reduce((s, i) => [s[0] + V[i][0] / f.idx.length, s[1] + V[i][1] / f.idx.length, s[2] + V[i][2] / f.idx.length], [0, 0, 0]);
      if (dot3(nrm, sub3(fc, C)) < 0) nrm = nrm.map((v) => -v);
      f.nrm = nrm;
    }
    return { V, F };
  };
  const VL = Math.hypot(...SOL_VIEW);
  const margin = (m) => Math.min(...m.F.map((f) => Math.abs(dot3(f.nrm, SOL_VIEW)) / VL));
  // 각뿔에 높이 점선을 그리면 — 밑면 꼭짓점이 꼭대기 바로 아래(화면 x ≈ 0)에 오지 않게: 옆 모서리가 높이 점선과 한 줄로 겹쳤다 (P 1단계 갤러리)
  const clear = (m) => sp.kind !== 'pyramid' || !('h' in sp) || m.V.slice(0, n).every((p) => Math.abs(projS(p)[0]) >= 0.22 * D.Rb);
  const cands = sp.kind === 'prism' && sp.lie ? [...Array(13).keys()].map((j) => -0.25 - 0.05 * j) : [...Array(24).keys()].map((j) => (j * (2 * Math.PI / n)) / 24);
  let best = null; let bm = -1;
  for (const pass of [true, false]) {
    for (const ph of cands) { const m = build(ph); if (pass && !clear(m)) continue; const v = margin(m); if (v > bm + 1e-9) { best = m; bm = v; best.phi = ph; } }
    if (best) break;
  }
  for (const f of best.F) f.vis = dot3(f.nrm, SOL_VIEW) > 0;
  const E = new Map();
  best.F.forEach((f, fi) => f.idx.forEach((a, k) => { const b = f.idx[(k + 1) % f.idx.length]; const key = a < b ? `${a}-${b}` : `${b}-${a}`; if (!E.has(key)) E.set(key, { a: Math.min(a, b), b: Math.max(a, b), faces: [] }); E.get(key).faces.push(fi); }));
  best.E = [...E.values()].map((e) => ({ ...e, hid: e.faces.every((fi) => !best.F[fi].vis) }));
  return best;
}

const projS = (p) => [p[0] + SOL_SX * p[1], -p[2] - SOL_SY * p[1]];

/** 다 그린 조각을 그림 틀에 맞춰 옮긴다 — 점·이름표 상자의 범위 + 여백 */
function solFrame(cls, elems, pts, boxes, aria, data = '') {
  const xs = [...pts.map((p) => p[0]), ...boxes.flatMap((b) => [b.x0, b.x1])];
  const ys = [...pts.map((p) => p[1]), ...boxes.flatMap((b) => [b.y0, b.y1])];
  const pad = 14;
  const x0 = Math.floor(Math.min(...xs) - pad); const y0 = Math.floor(Math.min(...ys) - pad);
  const W = Math.ceil(Math.max(...xs) + pad - x0); const H = Math.ceil(Math.max(...ys) + pad - y0);
  // 좌표는 그대로 두고 viewBox 시작점을 옮긴다 — 테스트가 선·이름표·틀을 같은 좌표로 잰다
  return `<svg class="frac-fig shape-fig ${cls}" viewBox="${x0} ${y0} ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${esc(aria)}"${data}><g>${elems}</g></svg>`;
}

/** 🔷 각기둥·각뿔 그리기 */
function polySolidSvg(sp) {
  const M = solidMesh(sp); const D = sp.draw;
  const P0 = M.V.map(projS);
  const xs = P0.map((p) => p[0]); const ys = P0.map((p) => p[1]);
  const s = Math.min(270 / (Math.max(...xs) - Math.min(...xs)), 220 / (Math.max(...ys) - Math.min(...ys)));
  const P = P0.map(([x, y]) => [x * s, y * s]);
  let g = '';
  // 보이는 면만 칠한다 (앞에서 보이는 면 위에 겹쳐 칠하지 않게) · 색칠: 밑면(b) 또는 가장 앞쪽 옆면(s)
  const front = M.F.filter((f) => f.kind === 'side').reduce((a, f) => (dot3(f.nrm, SOL_VIEW) > dot3(a.nrm, SOL_VIEW) ? f : a));
  M.F.forEach((f, fi) => {
    if (!f.vis) return;
    const sh = (sp.shade === 'b' && f.kind === 'base') || (sp.shade === 's' && f === front);
    g += `<polygon class="sol-f${sh ? ' shade' : ''}" data-f="${fi}" data-kind="${f.kind}" points="${f.idx.map((i) => `${cf(P[i][0])},${cf(P[i][1])}`).join(' ')}" fill="${sh ? FILL2 : FILL}" fill-opacity="${sh ? 0.42 : 0.14}"/>`;
  });
  for (const e of M.E) {
    const a = P[e.a]; const b = P[e.b];
    g += `<line class="sol-e" data-a="${e.a}" data-b="${e.b}" data-hid="${e.hid ? 1 : 0}" x1="${cf(a[0])}" y1="${cf(a[1])}" x2="${cf(b[0])}" y2="${cf(b[1])}" stroke="currentColor" stroke-width="${e.hid ? 1.6 : 2.2}"${e.hid ? ' stroke-dasharray="6 4"' : ''} stroke-linecap="round"/>`;
  }
  P.forEach((p, i) => { g += `<circle class="sol-v" data-i="${i}" cx="${cf(p[0])}" cy="${cf(p[1])}" r="0"/>`; });
  const segs = M.E.map((e) => [P[e.a], P[e.b]]);
  const taken = [];
  const cen = P.reduce((acc, p) => [acc[0] + p[0] / P.length, acc[1] + p[1] / P.length], [0, 0]);
  const outN = (a, b) => { const ex = b[0] - a[0]; const ey = b[1] - a[1]; let nx = -ey; let ny = ex; const mx = (a[0] + b[0]) / 2; const my = (a[1] + b[1]) / 2; if (nx * (mx - cen[0]) + ny * (my - cen[1]) < 0) { nx = -nx; ny = -ny; } return [nx, ny]; };
  const labs = [];
  const n = sp.n;
  // 높이 점선 (각뿔) — 꼭짓점에서 밑면의 가운데로
  if (sp.kind === 'pyramid' && 'h' in sp) {
    const top = P[n]; const c0 = projS([0, 0, 0]).map((v) => v * s);
    g += `<line class="sol-height" x1="${cf(top[0])}" y1="${cf(top[1])}" x2="${cf(c0[0])}" y2="${cf(c0[1])}" stroke="${FILL2}" stroke-width="2" stroke-dasharray="5 4"/>`;
    g += `<circle class="sol-o" cx="${cf(c0[0])}" cy="${cf(c0[1])}" r="3" fill="currentColor"/>`;
    segs.push([top, c0]);
  }
  if ('a' in sp) {
    // 밑면의 한 변 — 보이는 밑면 모서리 중 화면에서 가장 아래
    const cand = M.E.filter((e) => !e.hid && M.F[e.faces[0]].kind !== M.F[e.faces[1]].kind && e.faces.some((fi) => M.F[fi].kind === 'base'));
    const e = cand.reduce((x, y) => ((P[y.a][1] + P[y.b][1]) > (P[x.a][1] + P[x.b][1]) ? y : x));
    const [nx, ny] = outN(P[e.a], P[e.b]);
    labs.push({ k: 'a', e, t: solLenText(sp.a, sp.unit), mx: (P[e.a][0] + P[e.b][0]) / 2, my: (P[e.a][1] + P[e.b][1]) / 2, nx, ny });
  }
  if (sp.kind === 'prism' && 'h' in sp) {
    const cand = M.E.filter((e) => !e.hid && e.b === e.a + n);
    const e = cand.reduce((x, y) => ((P[y.a][0] + P[y.b][0]) > (P[x.a][0] + P[x.b][0]) ? y : x));
    labs.push({ k: 'h', e, t: solLenText(sp.h, sp.unit), mx: (P[e.a][0] + P[e.b][0]) / 2, my: (P[e.a][1] + P[e.b][1]) / 2, nx: 1, ny: 0 });
  }
  if (sp.kind === 'pyramid' && 'e' in sp) {
    const cand = M.E.filter((e) => !e.hid && e.b === n);
    const e = cand.reduce((x, y) => ((P[y.a][0] + P[y.b][0]) < (P[x.a][0] + P[x.b][0]) ? y : x));
    const [nx, ny] = outN(P[e.a], P[e.b]);
    labs.push({ k: 'e', e, t: solLenText(sp.e, sp.unit), mx: (P[e.a][0] + P[e.b][0]) / 2, my: (P[e.a][1] + P[e.b][1]) / 2, nx, ny });
  }
  for (const L of labs) {
    const at = solPlace(L.t, L.mx, L.my, L.nx, L.ny, segs, [], taken);
    g += solLab(`sol-lab sol-len`, at.x, at.y, L.t, ` data-k="${L.k}" data-e="${L.e.a}-${L.e.b}"`);
  }
  if (sp.kind === 'pyramid' && 'h' in sp) {
    // 높이 이름표 — 점선 오른쪽, 옆 모서리와 안 겹치는 높이에서
    const top = P[n]; const c0 = projS([0, 0, 0]).map((v) => v * s);
    const t = solLenText(sp.h, sp.unit);
    // 높이 이름표는 점선 바로 옆에 — 멀리 밀면 옆 모서리 길이로 읽혔다(P 1단계 갤러리).
    // 먼저 숨은 모서리(점선)까지 피하고 높이 점선이 가장 가까운 자리를 찾는다 — 숨은 옆 모서리 위에 얹히면 "옆 모서리 = 높이"로 읽혔다(Codex 25차 #5, [pyramid n=4 a=8 h=7 e=9]의 7 cm).
    // 그런 자리가 없을 때만 보이는 모서리만 피한다 (숨은 모서리는 바탕색 테두리로 읽히니)
    const visSegs = M.E.filter((e) => !e.hid).map((e) => [P[e.a], P[e.b]]);
    const allSegs = M.E.map((e) => [P[e.a], P[e.b]]);
    let at = null;
    for (const strict of [true, false]) {
      for (const side of [1, -1, 0]) {
        // 엄격하게 찾을 때는 밑면 쪽(0.88·0.92)도 — 숨은 뒤 옆 모서리가 점선 위쪽 바로 옆을 지나는 납작한 사각뿔(16·14·18)
        for (const f of strict ? [0.55, 0.65, 0.45, 0.75, 0.35, 0.82, 0.88, 0.92] : [0.55, 0.65, 0.45, 0.75, 0.35, 0.82]) {
          const mx = top[0] + (c0[0] - top[0]) * f; const my = top[1] + (c0[1] - top[1]) * f;
          const cx = mx + side * (6 + labW(t) / 2);
          const b = solBox(t, cx, my + 4.2);
          // side 0 = 점선 위에 바로 얹는다 (가늘고 높은 각뿔은 옆에 자리가 없다)
          if ((strict ? allSegs : visSegs).some(([p, q]) => boxHitsSeg(grow1(b), p, q)) || (side && boxHitsSeg(grow1(b), top, c0)) || taken.some((z) => boxHit(z, b))) continue;
          if (strict && allSegs.some((sg) => segDist(cx, my, sg) <= segDist(cx, my, [top, c0]) + 0.5)) continue;
          at = { x: cx, y: my + 4.2, box: b }; break;
        }
        if (at) break;
      }
      if (at) break;
    }
    if (!at) at = solPlace(t, (top[0] + c0[0]) / 2, (top[1] + c0[1]) / 2, 1, 0, visSegs, [], [...taken], [6, 10, 14]);
    taken.push(at.box);
    g += solLab('sol-lab sol-len', at.x, at.y, t, ' data-k="h"');
  }
  // data-phi·data-sc: 테스트가 몸을 따로 다시 세워 보이는 면·점선을 다시 계산한다
  return solFrame(`sol-fig sol-${sp.kind}`, g, P, taken, solidText(sp), ` data-n="${n}" data-phi="${M.phi.toFixed(6)}" data-sc="${s.toFixed(6)}" data-rb="${D.Rb.toFixed(6)}" data-hh="${D.H.toFixed(6)}"${sp.lie ? ' data-lie="1"' : ''}`);
}

/** 🔷 원기둥·원뿔·구 그리기 (화면 좌표로 바로 — 밑면 원은 rx = R, ry = SY·R인 타원) */
function roundSolidSvg(sp) {
  const D = sp.draw; const u = sp.unit;
  const R = sp.kind === 'sphere' ? 100 : 90; const ry = SOL_SY * R;
  let g = ''; const pts = []; const segs = []; const curves = []; const taken = [];
  const ell = (cls, cx, cy, part, a0, a1, dashed, extra = '') => {
    // a0 → a1 각도(화면 기준, y 아래가 +)로 호를 그린다
    const p0 = [cx + R * Math.cos(a0), cy + ry * Math.sin(a0)]; const p1 = [cx + R * Math.cos(a1), cy + ry * Math.sin(a1)];
    const large = Math.abs(a1 - a0) > Math.PI ? 1 : 0; const sweep = a1 > a0 ? 1 : 0;
    curves.push(ellPts(cx, cy, R, ry, a0, a1, 64));
    return `<path class="${cls}" data-part="${part}" data-cx="${cf(cx)}" data-cy="${cf(cy)}" data-rx="${cf(R)}" data-ry="${cf(ry)}" d="M ${cf(p0[0])} ${cf(p0[1])} A ${cf(R)} ${cf(ry)} 0 ${large} ${sweep} ${cf(p1[0])} ${cf(p1[1])}" fill="none" stroke="currentColor" stroke-width="${dashed ? 1.6 : 2.2}"${dashed ? ' stroke-dasharray="6 4"' : ''}${extra}/>`;
  };
  const line = (cls, a, b, dashed, extra = '', color = 'currentColor') => {
    segs.push([a, b]);
    return `<line class="${cls}" x1="${cf(a[0])}" y1="${cf(a[1])}" x2="${cf(b[0])}" y2="${cf(b[1])}" stroke="${color}" stroke-width="${dashed ? 1.8 : 2.2}"${dashed ? ' stroke-dasharray="5 4"' : ''} stroke-linecap="round"${extra}/>`;
  };
  const dot = (p) => `<circle class="sol-o" cx="${cf(p[0])}" cy="${cf(p[1])}" r="3" fill="currentColor"/>`;
  const rKey = 'r' in sp ? 'r' : 'd' in sp ? 'd' : '';
  const rText = rKey ? solLenText(sp[rKey], u) : '';
  if (sp.kind === 'cyl') {
    const Hp = R * (D.H / D.r);
    pts.push([-R, -Hp - ry], [R, ry]);
    g += `<path class="sol-side" d="M ${-R} ${cf(-Hp)} L ${-R} 0 A ${R} ${cf(ry)} 0 0 0 ${R} 0 L ${R} ${cf(-Hp)} A ${R} ${cf(ry)} 0 0 1 ${-R} ${cf(-Hp)} Z" fill="${FILL}" fill-opacity="0.12"/>`;
    g += `<ellipse class="sol-ell" data-part="top" data-cx="0" data-cy="${cf(-Hp)}" data-rx="${R}" data-ry="${cf(ry)}" cx="0" cy="${cf(-Hp)}" rx="${R}" ry="${cf(ry)}" fill="${FILL}" fill-opacity="0.18" stroke="currentColor" stroke-width="2.2"/>`;
    curves.push(ellPts(0, -Hp, R, ry));
    g += ell('sol-ell', 0, 0, 'front', Math.PI, 0, false);
    g += ell('sol-ell', 0, 0, 'back', 0, -Math.PI, true);
    g += line('sol-gen', [-R, -Hp], [-R, 0], false) + line('sol-gen', [R, -Hp], [R, 0], false);
    if (rKey) {
      const c = [0, -Hp]; const a = rKey === 'd' ? [-R, -Hp] : c; const b = [R, -Hp];
      g += line(`sol-${rKey}`, a, b, false, ` data-v="${sp[rKey]}"`);
      g += dot(c);
      let at = null;
      for (const f of rKey === 'd' ? [0.5, 0.42, 0.58] : [0.5, 0.4, 0.6]) {
        const mx = a[0] + (b[0] - a[0]) * f;
        for (const dy of [8, 11, 14]) {
          const bx = solBox(rText, mx, -Hp - dy);
          if (segs.some(([p, q]) => boxHitsSeg(grow1(bx), p, q)) || curves.some((cv) => ptsInBox(cv, bx))) continue;
          at = { x: mx, y: -Hp - dy, box: bx }; break;
        }
        if (at) break;
      }
      if (!at) at = solPlace(rText, R, -Hp, 1, 0, segs, curves, []);
      taken.push(at.box);
      g += solLab('sol-lab sol-len', at.x, at.y, rText, ` data-k="${rKey}"`);
    }
    if ('h' in sp) {
      const t = solLenText(sp.h, u); const at = solPlace(t, R, -Hp / 2, 1, 0, segs, curves, taken);
      g += solLab('sol-lab sol-len', at.x, at.y, t, ' data-k="h"');
    }
  } else if (sp.kind === 'cone') {
    const Hp = R * (D.H / D.r);
    const yt = -(ry * ry) / Hp; const xt = R * Math.sqrt(1 - (ry * ry) / (Hp * Hp));
    const tL = Math.atan2(yt / ry, -xt / R); const tR = Math.atan2(yt / ry, xt / R); // 왼쪽·오른쪽 접점의 각 (둘 다 위쪽, 음수)
    const apex = [0, -Hp];
    pts.push([-R, -Hp], [R, ry]);
    g += `<path class="sol-side" d="M ${cf(apex[0])} ${cf(apex[1])} L ${cf(-xt)} ${cf(yt)} A ${R} ${cf(ry)} 0 1 0 ${cf(xt)} ${cf(yt)} Z" fill="${FILL}" fill-opacity="0.14"/>`;
    // 앞쪽 호(보임): 오른쪽 접점(tR) → 아래 → 왼쪽 접점(tL + 2π), 200°쯤이라 큰 호 · 뒤쪽 호(점선): 오른쪽 접점 → 위 → 왼쪽 접점, 작은 호
    const ellAttr = `data-cx="0" data-cy="0" data-rx="${R}" data-ry="${cf(ry)}"`;
    g += `<path class="sol-ell" data-part="front" ${ellAttr} d="M ${cf(xt)} ${cf(yt)} A ${R} ${cf(ry)} 0 1 1 ${cf(-xt)} ${cf(yt)}" fill="none" stroke="currentColor" stroke-width="2.2"/>`;
    g += `<path class="sol-ell" data-part="back" ${ellAttr} d="M ${cf(xt)} ${cf(yt)} A ${R} ${cf(ry)} 0 0 0 ${cf(-xt)} ${cf(yt)}" fill="none" stroke="currentColor" stroke-width="1.6" stroke-dasharray="6 4"/>`;
    curves.push(ellPts(0, 0, R, ry, tR, tL + 2 * Math.PI, 96), ellPts(0, 0, R, ry, tL, tR, 64));
    g += line('sol-gen', apex, [-xt, yt], false, ' data-side="L"') + line('sol-gen', apex, [xt, yt], false, ' data-side="R"');
    const c = [0, 0];
    if ('h' in sp) g += line('sol-height', apex, c, true, '', FILL2);
    if (rKey) g += line(`sol-${rKey}`, rKey === 'd' ? [-R, 0] : c, [R, 0], true, ` data-v="${sp[rKey]}"`);
    if ('h' in sp || rKey) g += dot(c);
    if ('l' in sp) {
      const t = solLenText(sp.l, u); const mx = -xt / 2; const my = (apex[1] + yt) / 2;
      const ex = -xt - apex[0]; const ey = yt - apex[1]; let nx = ey; let ny = -ex; if (nx > 0) { nx = -nx; ny = -ny; }
      const at = solPlace(t, mx, my, nx, ny, segs, curves, taken);
      g += solLab('sol-lab sol-len', at.x, at.y, t, ' data-k="l"');
    }
    if ('h' in sp) {
      const t = solLenText(sp.h, u); let at = null;
      for (const f of [0.6, 0.7, 0.5, 0.78, 0.42]) {
        const my = apex[1] * (1 - f);
        const bx = solBox(t, 7 + labW(t) / 2, my + 4.2);
        if (segs.some(([p, q]) => boxHitsSeg(grow1(bx), p, q)) || curves.some((cv) => ptsInBox(cv, bx)) || taken.some((z) => boxHit(z, bx))) continue;
        at = { x: 7 + labW(t) / 2, y: my + 4.2, box: bx }; break;
      }
      if (!at) at = solPlace(t, xt, -Hp / 2, 1, 0, segs, curves, []);
      taken.push(at.box);
      g += solLab('sol-lab sol-len', at.x, at.y, t, ' data-k="h"');
    }
    if (rKey) {
      let at = null;
      for (const f of [0.5, 0.4, 0.6]) {
        const mx = rKey === 'd' ? (-R + 2 * R * f) : R * f;
        for (const dy of [16, 19, 22]) {
          const bx = solBox(rText, mx, dy);
          if (segs.some(([p, q]) => boxHitsSeg(grow1(bx), p, q)) || curves.some((cv) => ptsInBox(cv, bx)) || taken.some((z) => boxHit(z, bx))) continue;
          at = { x: mx, y: dy, box: bx }; break;
        }
        if (at) break;
      }
      if (!at) at = solPlace(rText, R * 0.5, ry, 0, 1, segs, curves, []);
      taken.push(at.box);
      g += solLab('sol-lab sol-len', at.x, at.y, rText, ` data-k="${rKey}"`);
    }
  } else {
    pts.push([-R, -R], [R, R]);
    g += `<circle class="sol-ball" cx="0" cy="0" r="${R}" fill="${FILL}" fill-opacity="0.14" stroke="currentColor" stroke-width="2.2"/>`;
    curves.push(ellPts(0, 0, R, R));
    g += ell('sol-ell', 0, 0, 'front', Math.PI, 0, false).replace('stroke-width="2.2"', 'stroke-width="1.4"');
    g += ell('sol-ell', 0, 0, 'back', 0, -Math.PI, true);
    const c = [0, 0];
    if (rKey) {
      const a = rKey === 'd' ? [-R, 0] : c;
      g += line(`sol-${rKey}`, a, [R, 0], false, ` data-v="${sp[rKey]}"`);
      let at = null;
      for (const f of [0.5, 0.4, 0.6]) {
        const mx = a[0] + (R - a[0]) * f;
        for (const dy of [8, 11, 14]) {
          const bx = solBox(rText, mx, -dy);
          if (segs.some(([p, q]) => boxHitsSeg(grow1(bx), p, q)) || curves.some((cv) => ptsInBox(cv, bx))) continue;
          at = { x: mx, y: -dy, box: bx }; break;
        }
        if (at) break;
      }
      if (!at) at = solPlace(rText, R, 0, 1, 0, segs, curves, []);
      taken.push(at.box);
      g += solLab('sol-lab sol-len', at.x, at.y, rText, ` data-k="${rKey}"`);
    }
    g += dot(c);
  }
  return solFrame(`sol-fig sol-${sp.kind}`, g, pts, taken, solidText(sp), ` data-R="${R}"`);
}

export function solidSvg(sp) {
  return sp.kind === 'prism' || sp.kind === 'pyramid' ? polySolidSvg(sp) : roundSolidSvg(sp);
}

/** 🔷 입체도형을 글로 — 📊 아빠 화면 펼친 문제 · aria */
export function solidText(sp) {
  const u = sp.unit; const L = (k, name) => (k in sp ? `${name} ${solLenText(sp[k], u)}` : '');
  const join = (...xs) => xs.filter(Boolean).join(' · ');
  if (sp.kind === 'prism' || sp.kind === 'pyramid') {
    const what = `정${POLY_KO[sp.n]}을 밑면으로 하는 ${sp.kind === 'prism' ? '각기둥' : '각뿔'} 그림${sp.lie ? '(옆으로 눕혀 놓음)' : ''}`;
    const lens = join(L('a', '밑면의 한 변'), L('h', '높이'), L('e', '옆 모서리'));
    const sh = sp.shade === 'b' ? (sp.kind === 'prism' ? '밑면 색칠' : '밑면 색칠') : sp.shade === 's' ? '앞쪽 옆면 하나 색칠' : '';
    return `${[what, lens, sh].filter(Boolean).join(' — ')} (보이지 않는 모서리는 점선)`;
  }
  const rr = L('r', '밑면의 반지름') || L('d', '밑면의 지름');
  if (sp.kind === 'cyl') return [`원기둥 그림`, join(rr, L('h', '높이'))].filter(Boolean).join(' — ');
  if (sp.kind === 'cone') return [`원뿔 그림`, join(rr, L('h', '높이(점선)'), L('l', '모선'))].filter(Boolean).join(' — ');
  return [`구 그림`, join(L('r', '반지름'), L('d', '지름'))].filter(Boolean).join(' — ');
}

/** `[spin rect a b]` 직사각형 · `[spin tri a b (c=빗변)]` 직각삼각형 · `[spin half d]` 반원 — 왼쪽 세로 선이 돌리는 축 (a 가로, b 축 쪽 길이) */
export function parseSpin(arg) {
  const t = String(arg || '').trim().split(/\s+/).filter(Boolean);
  const sp = { unit: 'cm' };
  if (t.length && /^(cm|m)$/.test(t[t.length - 1])) sp.unit = t.pop();
  const shape = t.shift();
  const nums = []; let c = null;
  for (const tok of t) {
    let m;
    if ((m = /^c=(\d+)$/.exec(tok))) { if (c !== null) return null; c = +m[1]; continue; }
    if (!/^\d+$/.test(tok)) return null;
    nums.push(+tok);
  }
  const ok = (v) => Number.isInteger(v) && v >= 1 && v <= 30;
  if (shape === 'rect' || shape === 'tri') {
    if (nums.length !== 2 || !nums.every(ok)) return null;
    [sp.a, sp.b] = nums;
    if (Math.max(sp.a, sp.b) > 4 * Math.min(sp.a, sp.b)) return null;
    if (c !== null) { if (shape !== 'tri' || c * c !== sp.a * sp.a + sp.b * sp.b) return null; sp.c = c; }
  } else if (shape === 'half') {
    if (nums.length !== 1 || !ok(nums[0]) || c !== null) return null;
    sp.d = nums[0];
  } else return null;
  sp.shape = shape;
  return sp;
}

export function spinSvg(sp) {
  const u = sp.unit; let g = ''; const pts = []; const segs = []; const taken = []; const curves = [];
  let top; let bottom;
  if (sp.shape === 'half') {
    const R = 100;
    pts.push([0, -R], [R, R]);
    g += `<path class="spin-shape" data-shape="half" data-d="${sp.d}" d="M 0 ${-R} A ${R} ${R} 0 0 1 0 ${R} Z" fill="${FILL}" fill-opacity="0.18" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/>`;
    curves.push(ellPts(0, 0, R, R, -Math.PI / 2, Math.PI / 2, 64));
    segs.push([[0, -R], [0, R]]);
    top = -R; bottom = R;
    const t = `${sp.d} ${u}`; const at = solPlace(t, 0, 0, -1, 0, segs, curves, taken, [12, 18, 24]);
    g += solLab('sol-lab spin-len', at.x, at.y, t, ' data-k="d"');
  } else {
    const s = 190 / Math.max(sp.a, sp.b); const A = sp.a * s; const B = sp.b * s;
    pts.push([0, -B], [A, 0]);
    const poly = sp.shape === 'rect' ? [[0, 0], [A, 0], [A, -B], [0, -B]] : [[0, 0], [A, 0], [0, -B]];
    g += `<polygon class="spin-shape" data-shape="${sp.shape}" data-a="${sp.a}" data-b="${sp.b}" points="${poly.map(([x, y]) => `${cf(x)},${cf(y)}`).join(' ')}" fill="${FILL}" fill-opacity="0.18" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/>`;
    poly.forEach((p, i) => segs.push([p, poly[(i + 1) % poly.length]]));
    if (sp.shape === 'tri') g += `<path d="M 0 -11 L 11 -11 L 11 0" fill="none" stroke="${FILL2}" stroke-width="1.6"/>`;
    top = -B; bottom = 0;
    const ta = `${sp.a} ${u}`; const atA = solPlace(ta, A / 2, 0, 0, 1, segs, [], taken, [6, 10, 14]);
    g += solLab('sol-lab spin-len', atA.x, atA.y, ta, ' data-k="a"');
    const tb = `${sp.b} ${u}`;
    const atB = sp.shape === 'rect' ? solPlace(tb, A, -B / 2, 1, 0, segs, [], taken, [6, 10, 14]) : solPlace(tb, 0, -B / 2, -1, 0, segs, [], taken, [12, 18, 24]);
    g += solLab('sol-lab spin-len', atB.x, atB.y, tb, ' data-k="b"');
    if (sp.c) {
      const tc = `${sp.c} ${u}`; const at = solPlace(tc, A / 2, -B / 2, B, A, segs, [], taken);
      g += solLab('sol-lab spin-len', at.x, at.y, tc, ' data-k="c"');
    }
  }
  // 돌리는 축 (한 점 쇄선) + 위쪽에 도는 화살표
  const y0 = top - 34; const y1 = bottom + 26;
  g += `<line class="spin-axis" x1="0" y1="${cf(y0)}" x2="0" y2="${cf(y1)}" stroke="${FILL2}" stroke-width="2" stroke-dasharray="12 4 2 4"/>`;
  const ay = top - 18;
  g += `<path class="spin-arrow" d="M -26 ${cf(ay)} A 26 8 0 1 0 26 ${cf(ay)}" fill="none" stroke="${FILL2}" stroke-width="1.8"/>`;
  g += `<path d="M 26 ${cf(ay)} l -7 -5 l 1 8 z" fill="${FILL2}"/>`;
  pts.push([-30, y0], [30, y1]);
  return solFrame('sol-fig spin-fig', g, pts, taken, spinText(sp), ` data-shape="${sp.shape}"`);
}

export function spinText(sp) {
  const u = sp.unit;
  if (sp.shape === 'rect') return `직사각형(돌리는 축에 붙은 변 ${sp.b} ${u} · 다른 변 ${sp.a} ${u})과 그 변을 따라 그은 돌리는 축`;
  if (sp.shape === 'tri') return `직각삼각형(축에 붙은 변 ${sp.b} ${u} · 밑변 ${sp.a} ${u}${sp.c ? ` · 빗변 ${sp.c} ${u}` : ''})과 직각을 낀 변을 따라 그은 돌리는 축`;
  return `반원(지름 ${sp.d} ${u})과 지름을 따라 그은 돌리는 축`;
}

/** `[pnet n=5 a=3 h=6 up=1 dn=3 (s=옆면 수) (q=base|end|w)]` 정다각형 밑면 · `[pnet rt=3,4,5 h=6 up=1 dn=0 (q=up0|up1|dn0|dn1)]` 직각삼각형 밑면
 *  옆면 직사각형이 한 줄(왼쪽부터 0번), 밑면은 up 번 옆면 위·dn 번 옆면 아래. up·dn은 여러 개(쉼표)나 없음도 — 전개도가 아닌 그림
 *  valid = 옆면 수 = 밑면의 변의 수 · 위·아래에 밑면 하나씩 */
export function parsePnet(arg) {
  const t = String(arg || '').trim().split(/\s+/).filter(Boolean);
  const sp = { unit: 'cm', up: [], dn: [], q: '' };
  if (t.length && /^(cm|m)$/.test(t[t.length - 1])) sp.unit = t.pop();
  const seen = new Set();
  for (const tok of t) {
    const m = /^([a-z]+)=(.+)$/.exec(tok);
    if (!m || seen.has(m[1])) return null;
    seen.add(m[1]);
    const [, k, v] = m;
    if (k === 'n' || k === 's') { if (!/^[3-9]$/.test(v)) return null; sp[k] = +v; }
    else if (k === 'a' || k === 'h') { if (v === '?') sp[k] = '?'; else if (/^\d+$/.test(v) && sLen(+v)) sp[k] = +v; else return null; }
    else if (k === 'rt') { if (!/^\d+,\d+,\d+$/.test(v)) return null; sp.rt = v.split(',').map(Number); }
    else if (k === 'up' || k === 'dn') { if (!/^\d(,\d)*$/.test(v)) return null; sp[k] = v.split(',').map(Number); }
    else if (k === 'q') { if (!/^(base|end|w|up0|up1|dn0|dn1)$/.test(v)) return null; sp.q = v; }
    else return null;
  }
  if (sp.rt) {
    if ('n' in sp || 's' in sp || 'a' in sp) return null;
    const [x, y, z] = sp.rt;
    if (!(x + y > z && y + z > x && x + z > y) || sp.rt.some((v) => v < 1 || v > 20)) return null;
    sp.n = 3; sp.s = 3; sp.widths = sp.rt.slice();
    if (/^(base|w)$/.test(sp.q)) return null;
  } else {
    if (!sp.n || sp.n > 8) return null;
    if (!('s' in sp)) sp.s = sp.n;
    if (sp.s < 3 || Math.abs(sp.s - sp.n) > 1) return null;
    const a = isNum(sp.a) ? sp.a : 3;
    sp.widths = Array(sp.s).fill(a);
    if (/^(up|dn)/.test(sp.q)) return null;
  }
  if (new Set(sp.up).size !== sp.up.length || new Set(sp.dn).size !== sp.dn.length) return null;
  if ([...sp.up, ...sp.dn].some((i) => i >= sp.s)) return null;
  if (!sp.up.length && !sp.dn.length) return null;
  const hd = isNum(sp.h) ? sp.h : Math.max(...sp.widths) * 1.5;
  sp.hd = hd;
  if (hd < 0.6 * Math.min(...sp.widths) || hd > 4 * Math.max(...sp.widths)) return null;
  sp.L = pnetLayout(sp);
  if (!sp.L) return null;
  if (sp.q === 'base' && !sp.up.length) return null;
  if (/^up/.test(sp.q) && sp.up.length !== 1) return null;
  if (/^dn/.test(sp.q) && sp.dn.length !== 1) return null;
  sp.valid = sp.s === sp.n && sp.up.length === 1 && sp.dn.length === 1;
  return sp;
}

/** 전개도 자리 — 몸 단위(cm). 옆면 i: x0..x1, y 0..h (아래가 +). 밑면 다각형은 붙은 변 바깥쪽으로 */
function pnetLayout(sp) {
  const xs = [0]; sp.widths.forEach((w) => xs.push(xs[xs.length - 1] + w));
  const rects = sp.widths.map((w, i) => ({ i, x0: xs[i], x1: xs[i + 1], y0: 0, y1: sp.hd }));
  const bases = [];
  const make = (i, side) => {
    const r = rects[i]; const y = side === 'up' ? 0 : sp.hd; const sgn = side === 'up' ? -1 : 1;
    let P;
    if (sp.rt) {
      const b = sp.widths[i]; const Lw = sp.widths[(i - 1 + sp.s) % sp.s]; const Rw = sp.widths[(i + 1) % sp.s];
      const px = (Lw * Lw - Rw * Rw + b * b) / (2 * b); const py2 = Lw * Lw - px * px;
      if (py2 <= 0) return null;
      P = [[r.x0, y], [r.x1, y], [r.x0 + px, y + sgn * Math.sqrt(py2)]];
    } else {
      const n = sp.n; const a = r.x1 - r.x0; const Rb = a / (2 * Math.sin(Math.PI / n)); const apo = a / (2 * Math.tan(Math.PI / n));
      const cx = (r.x0 + r.x1) / 2; const cy = y + sgn * apo;
      const a0 = Math.atan2(y - cy, r.x0 - cx);
      const step = (side === 'up' ? -1 : 1) * (2 * Math.PI / n);
      P = [...Array(n).keys()].map((k) => [cx + Rb * Math.cos(a0 + step * k), cy + Rb * Math.sin(a0 + step * k)]);
      // 첫 두 점이 붙은 변 (x0 → x1) 이 되게 방향 확인
      if (Math.hypot(P[1][0] - r.x1, P[1][1] - y) > 1e-6) P = [P[0], ...P.slice(1).reverse()];
    }
    return { i, side, pts: P };
  };
  for (const i of sp.up) { const b = make(i, 'up'); if (!b) return null; bases.push(b); }
  for (const i of sp.dn) { const b = make(i, 'dn'); if (!b) return null; bases.push(b); }
  // 같은 쪽 밑면끼리 겹치면 못 그린다 (그림이 거짓말하지 않게)
  for (const side of ['up', 'dn']) {
    const bs = bases.filter((b) => b.side === side).map((b) => [Math.min(...b.pts.map((p) => p[0])), Math.max(...b.pts.map((p) => p[0]))]).sort((p, q) => p[0] - q[0]);
    for (let k = 1; k < bs.length; k++) if (bs[k][0] < bs[k - 1][1] + 0.2) return null;
  }
  return { rects, bases, xs };
}

export function pnetSvg(sp) {
  const L = sp.L; const u = sp.unit;
  const allPts = [...L.rects.flatMap((r) => [[r.x0, r.y0], [r.x1, r.y1]]), ...L.bases.flatMap((b) => b.pts)];
  const bw = Math.max(...allPts.map((p) => p[0])) - Math.min(...allPts.map((p) => p[0]));
  const bh = Math.max(...allPts.map((p) => p[1])) - Math.min(...allPts.map((p) => p[1]));
  const s = Math.min(300 / bw, 280 / bh, 40);
  const S = ([x, y]) => [x * s, y * s];
  let g = ''; const segs = []; const taken = []; const pts = allPts.map(S);
  for (const r of L.rects) g += `<rect class="pnet-r" data-i="${r.i}" x="${cf(r.x0 * s)}" y="0" width="${cf((r.x1 - r.x0) * s)}" height="${cf(sp.hd * s)}" fill="${FILL}" fill-opacity="0.12"/>`;
  for (const b of L.bases) g += `<polygon class="pnet-b" data-side="${b.side}" data-i="${b.i}" points="${b.pts.map((p) => S(p).map(cf).join(',')).join(' ')}" fill="${FILL2}" fill-opacity="0.22"/>`;
  const seg = (cls, a, b, fold, extra = '') => {
    const A = S(a); const B = S(b); segs.push([A, B]);
    return `<line class="${cls}" x1="${cf(A[0])}" y1="${cf(A[1])}" x2="${cf(B[0])}" y2="${cf(B[1])}" stroke="currentColor" stroke-width="${fold ? 1.4 : 2.2}"${fold ? ' stroke-dasharray="5 4" stroke-opacity="0.8"' : ''} stroke-linecap="round"${extra}/>`;
  };
  // 옆면: 사이 변은 접는 선, 위·아래 변은 밑면이 붙으면 접는 선
  L.rects.forEach((r) => {
    const upB = sp.up.includes(r.i); const dnB = sp.dn.includes(r.i);
    g += seg(upB ? 'pnet-fold' : 'pnet-cut', [r.x0, 0], [r.x1, 0], upB, ` data-k="top" data-i="${r.i}"`);
    g += seg(dnB ? 'pnet-fold' : 'pnet-cut', [r.x0, sp.hd], [r.x1, sp.hd], dnB, ` data-k="bottom" data-i="${r.i}"`);
    if (r.i > 0) g += seg('pnet-fold', [r.x0, 0], [r.x0, sp.hd], true, ` data-k="mid" data-i="${r.i}"`);
  });
  g += seg('pnet-cut', [0, 0], [0, sp.hd], false, ' data-k="end" data-i="L"');
  const xe = L.xs[L.xs.length - 1];
  g += seg('pnet-cut', [xe, 0], [xe, sp.hd], false, ' data-k="end" data-i="R"');
  for (const b of L.bases) for (let k = 1; k < b.pts.length; k++) g += seg('pnet-cut', b.pts[k], b.pts[(k + 1) % b.pts.length], false, ` data-k="${b.side}${k}" data-i="${b.i}"`);
  // 이름표
  const cen = [xe * s / 2, sp.hd * s / 2];
  const put = (t, a, b, k, out) => {
    const A = S(a); const B = S(b); const mx = (A[0] + B[0]) / 2; const my = (A[1] + B[1]) / 2;
    let ox; let oy;
    if (out) [ox, oy] = out; else { const ex = B[0] - A[0]; const ey = B[1] - A[1]; ox = -ey; oy = ex; if (ox * (mx - cen[0]) + oy * (my - cen[1]) < 0) { ox = -ox; oy = -oy; } }
    const own = segs.find(([p, q]) => (Math.hypot(p[0] - A[0], p[1] - A[1]) < 0.01 && Math.hypot(q[0] - B[0], q[1] - B[1]) < 0.01) || (Math.hypot(p[0] - B[0], p[1] - B[1]) < 0.01 && Math.hypot(q[0] - A[0], q[1] - A[1]) < 0.01));
    const at = solPlace(t, mx, my, ox, oy, segs, [], taken, [4, 8, 12, 18, 26, 36], own);
    g += solLab('sol-lab pnet-len', at.x, at.y, t, ` data-k="${k}"`);
  };
  // 밑면의 한 변(a) — 밑면이 안 붙은 옆면 위(없으면 아래) 변
  const freeTop = L.rects.filter((r) => !sp.up.includes(r.i)); const freeBot = L.rects.filter((r) => !sp.dn.includes(r.i));
  if ('a' in sp && !sp.rt) {
    // 밑면 다각형이 가로로 덮지 않는 빈 변부터 (정팔각형처럼 넓은 밑면은 옆 옆면 위까지 덮어 이름표를 선이 지나갔다)
    const span = (side) => L.bases.filter((b) => b.side === side).map((b) => [Math.min(...b.pts.map((z) => z[0])), Math.max(...b.pts.map((z) => z[0]))]);
    const clear = (r, side) => span(side).every(([x0, x1]) => r.x1 <= x0 + 1e-9 || r.x0 >= x1 - 1e-9);
    const cand = [...freeTop.map((r) => [r, 'up']), ...freeBot.map((r) => [r, 'dn'])];
    const [r, side] = cand.find(([rr, sd]) => clear(rr, sd)) || cand[0];
    const y = side === 'up' ? 0 : sp.hd;
    put(solLenText(sp.a, u), [r.x0, y], [r.x1, y], 'a', [0, side === 'up' ? -1 : 1]);
  }
  if (sp.rt) {
    // 직각삼각형 밑면: 옆면마다 가로 길이 (밑면이 안 붙은 쪽에)
    L.rects.forEach((r) => {
      const y = !sp.dn.includes(r.i) ? sp.hd : !sp.up.includes(r.i) ? 0 : null;
      if (y !== null) put(`${sp.widths[r.i]} ${u}`, [r.x0, y], [r.x1, y], `w${r.i}`, [0, y ? 1 : -1]);
    });
  }
  if ('h' in sp) put(solLenText(sp.h, u), [xe, 0], [xe, sp.hd], 'h', [1, 0]);
  if (sp.q) {
    const qt = `? ${u}`;
    // 밑면 다각형의 변 — 이름표는 그 다각형의 가운데에서 먼 쪽으로 (옆면 줄 가운데를 기준으로 밀면 좁은 삼각형 안쪽으로 들어가 빗변 옆에 놓였다)
    const awayFrom = (b, p, q) => { const cx = b.pts.reduce((a, z) => a + z[0], 0) / b.pts.length; const cy = b.pts.reduce((a, z) => a + z[1], 0) / b.pts.length; let nx = -(q[1] - p[1]); let ny = q[0] - p[0]; if (nx * ((p[0] + q[0]) / 2 - cx) + ny * ((p[1] + q[1]) / 2 - cy) < 0) { nx = -nx; ny = -ny; } return [nx, ny]; };
    if (sp.q === 'end') put(qt, [0, 0], [0, sp.hd], 'q', [-1, 0]);
    else if (sp.q === 'w') {
      const r = freeBot.length ? freeBot[freeBot.length - 1] : freeTop[freeTop.length - 1]; const y = freeBot.length ? sp.hd : 0;
      put(qt, [r.x0, y], [r.x1, y], 'q', [0, freeBot.length ? 1 : -1]);
    } else if (sp.q === 'base') {
      const b = L.bases.find((x) => x.side === 'up');
      let best = 1;
      for (let k = 1; k < b.pts.length; k++) { const m = (b.pts[k][1] + b.pts[(k + 1) % b.pts.length][1]) / 2; const mb = (b.pts[best][1] + b.pts[(best + 1) % b.pts.length][1]) / 2; if (m < mb - 1e-9) best = k; }
      put(qt, b.pts[best], b.pts[(best + 1) % b.pts.length], 'q', awayFrom(b, b.pts[best], b.pts[(best + 1) % b.pts.length]));
    } else {
      const b = L.bases.find((x) => x.side === sp.q.slice(0, 2));
      // up0/dn0 = 붙은 변의 왼쪽 끝에서 나온 변 (꼭짓점 2 → 0), up1/dn1 = 오른쪽 끝에서 나온 변 (1 → 2)
      const [p, q] = sp.q.endsWith('0') ? [b.pts[2], b.pts[0]] : [b.pts[1], b.pts[2]];
      put(qt, p, q, 'q', awayFrom(b, p, q));
    }
  }
  return solFrame('pnet-fig', g, pts, taken, pnetText(sp), ` data-s="${s.toFixed(6)}" data-valid="${sp.valid ? 1 : 0}"`);
}

export function pnetText(sp) {
  const u = sp.unit;
  const baseName = sp.rt ? `직각삼각형(세 변 ${sp.rt.join(' cm · ')} cm)` : `정${POLY_KO[sp.n]}`;
  const where = [...sp.up.map((i) => `${i + 1}번째 직사각형 위`), ...sp.dn.map((i) => `${i + 1}번째 직사각형 아래`)].join('·');
  const parts = [`${baseName} ${sp.up.length + sp.dn.length}개와 직사각형 ${sp.s}개를 이은 그림 — 직사각형이 한 줄(왼쪽부터), ${baseName.replace(/\(.*\)/, '')}은 ${where}`];
  const lens = [];
  if ('a' in sp && !sp.rt) lens.push(`밑면의 한 변 ${solLenText(sp.a, u)}`);
  if (sp.rt) lens.push(`직사각형 가로 왼쪽부터 ${sp.widths.join(' · ')} ${u}`);
  if ('h' in sp) lens.push(`직사각형 세로(오른쪽 끝) ${solLenText(sp.h, u)}`);
  if (sp.q) lens.push(`? 표시 ${{ base: '위쪽 다각형의 맨 위 변', end: '직사각형 줄의 왼쪽 끝 변', w: '직사각형 하나의 가로', up0: '위쪽 삼각형의 왼쪽 변', up1: '위쪽 삼각형의 오른쪽 변', dn0: '아래쪽 삼각형의 왼쪽 변', dn1: '아래쪽 삼각형의 오른쪽 변' }[sp.q]}`);
  return [parts[0], lens.join(' · ')].filter(Boolean).join(' · ');
}

/** `[cnet r=3 h=5 (w=?|18.84) (same|diff|para)]` 원기둥 전개도 — 옆면 직사각형 가로 = 2 × 반지름 × 원주율로 그린다(같은 비율).
 *  same: 원 둘이 모두 위 · diff: 아래 원이 작음 · para: 옆면이 평행사변형 — 셋 다 전개도가 아닌 그림 */
export function parseCnet(arg) {
  const t = String(arg || '').trim().split(/\s+/).filter(Boolean);
  const sp = { unit: 'cm', bad: '' };
  if (t.length && /^(cm|m)$/.test(t[t.length - 1])) sp.unit = t.pop();
  const seen = new Set();
  for (const tok of t) {
    let m;
    if (/^(same|diff|para)$/.test(tok)) { if (sp.bad) return null; sp.bad = tok; continue; }
    if (!(m = /^([a-z]+)=(.+)$/.exec(tok)) || seen.has(m[1])) return null;
    seen.add(m[1]);
    const [, k, v] = m;
    if (k === 'r' || k === 'd' || k === 'h') { if (v === '?') sp[k] = '?'; else if (/^\d+$/.test(v) && +v >= 1 && +v <= 40) sp[k] = +v; else return null; }
    else if (k === 'w') { if (v === '?') sp.w = '?'; else if (/^\d+(\.\d{1,2})?$/.test(v)) sp.w = v; else return null; }
    else return null;
  }
  if ('r' in sp && 'd' in sp) return null;
  const rN = isNum(sp.r) ? sp.r : isNum(sp.d) ? sp.d / 2 : isNum(+sp.w) && sp.w !== '?' ? +sp.w / (2 * 3.14) : 3;
  const hN = isNum(sp.h) ? sp.h : rN * 2;
  if (rN > 12 || hN / rN < 0.5 || hN / rN > 5) return null;
  // 적힌 가로가 있으면 지름 × 3.14와 맞아야 한다 (반지름이 적혀 있을 때)
  if (sp.w && sp.w !== '?' && (isNum(sp.r) || isNum(sp.d))) { const want = Math.round(2 * rN * 314) / 100; if (Math.abs(+sp.w - want) > 1e-9) return null; }
  sp.rd = rN; sp.hd = hN;
  sp.valid = !sp.bad;
  return sp;
}

export function cnetSvg(sp) {
  const u = sp.unit; const Wc = 2 * Math.PI * sp.rd;
  const s = Math.min(320 / Wc, 170 / sp.hd, 56 / sp.rd);
  const W = Wc * s; const Hh = sp.hd * s; const R = sp.rd * s; const R2 = sp.bad === 'diff' ? R * 0.6 : R;
  const sk = sp.bad === 'para' ? Hh * 0.35 : 0;
  let g = ''; const segs = []; const curves = []; const taken = [];
  const quad = [[0, 0], [W, 0], [W + sk, Hh], [sk, Hh]];
  g += `<polygon class="cnet-side" points="${quad.map((p) => p.map(cf).join(',')).join(' ')}" fill="${FILL}" fill-opacity="0.12" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/>`;
  quad.forEach((p, i) => segs.push([p, quad[(i + 1) % 4]]));
  const circles = sp.bad === 'same' ? [[0.25 * W, -R, R], [0.75 * W, -R, R]] : [[0.3 * W, -R, R], [0.7 * W + sk, Hh + R2, R2]];
  for (const [cx, cy, rr] of circles) {
    g += `<circle class="cnet-c" data-r="${cf(rr / s)}" cx="${cf(cx)}" cy="${cf(cy)}" r="${cf(rr)}" fill="${FILL2}" fill-opacity="0.22" stroke="currentColor" stroke-width="2.2"/>`;
    curves.push(ellPts(cx, cy, rr, rr));
  }
  const pts = [[0, -2 * R], [W + sk, Hh + 2 * R2], ...quad];
  const [c0x, c0y] = circles[0];
  const rKey = 'r' in sp ? 'r' : 'd' in sp ? 'd' : '';
  if (rKey) {
    const a = rKey === 'd' ? [c0x - R, c0y] : [c0x, c0y]; const b = [c0x + R, c0y];
    segs.push([a, b]);
    g += `<line class="cnet-${rKey}" x1="${cf(a[0])}" y1="${cf(a[1])}" x2="${cf(b[0])}" y2="${cf(b[1])}" stroke="currentColor" stroke-width="2"/>`;
    g += `<circle class="sol-o" cx="${cf(c0x)}" cy="${cf(c0y)}" r="3" fill="currentColor"/>`;
    const t = solLenText(sp[rKey], u); const at = solPlace(t, c0x + R, c0y, 1, 0, segs, curves, taken, [4, 8, 12]);
    g += solLab('sol-lab cnet-len', at.x, at.y, t, ` data-k="${rKey}"`);
  }
  if ('h' in sp) {
    const t = solLenText(sp.h, u); const at = solPlace(t, W + sk / 2, Hh / 2, 1, 0, segs, curves, taken, [4, 8, 12]);
    g += solLab('sol-lab cnet-len', at.x, at.y, t, ' data-k="h"');
  }
  if (sp.w) {
    const t = sp.w === '?' ? `? ${u}` : `${sp.w} ${u}`;
    const at = sp.bad === 'same' ? solPlace(t, W / 2 + sk, Hh, 0, 1, segs, curves, taken, [4, 8, 12]) : solPlace(t, 0.78 * W, 0, 0, -1, segs, curves, taken, [4, 8, 12, 18]);
    g += solLab('sol-lab cnet-len', at.x, at.y, t, ' data-k="w"');
  }
  return solFrame('cnet-fig', g, pts, taken, cnetText(sp), ` data-s="${s.toFixed(6)}" data-valid="${sp.valid ? 1 : 0}"`);
}

export function cnetText(sp) {
  const u = sp.unit;
  const side = sp.bad === 'para' ? '평행사변형' : '직사각형';
  const where = sp.bad === 'same' ? '원 2개가 모두 위' : sp.bad === 'diff' ? '위에 원 하나·아래에 더 작은 원 하나' : '위·아래에 원 하나씩';
  const lens = [];
  if ('r' in sp) lens.push(`위쪽 원의 반지름 ${solLenText(sp.r, u)}`);
  if ('d' in sp) lens.push(`위쪽 원의 지름 ${solLenText(sp.d, u)}`);
  if (sp.w) lens.push(`${side}의 가로 ${sp.w === '?' ? `? ${u}` : `${sp.w} ${u}`}`);
  if ('h' in sp) lens.push(`${side}의 세로 ${solLenText(sp.h, u)}`);
  return [`원 2개와 ${side} 하나를 이은 그림 — ${where}`, lens.join(' · ')].filter(Boolean).join(' · ');
}

/** 그린 SVG의 글자 상자 (가운데 정렬 · 글꼴 크기는 그림에서) — 생성기가 이름표가 겹치지 않는 자리를 다시 고를 때 */
export function labelBoxesOf(svg) {
  return [...String(svg).matchAll(/<text class="[^"]*" x="(-?[\d.]+)" y="(-?[\d.]+)" font-size="(\d+)"[^>]*>([^<]+)<\/text>/g)].map((z) => {
    const fs = +z[3]; const w = (labW(z[4]) * fs) / 15;
    return { t: z[4], x0: +z[1] - w / 2, x1: +z[1] + w / 2, y0: +z[2] - fs * 0.78, y1: +z[2] + fs * 0.22 };
  });
}

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
  if ((m = /^range (.+)$/.exec(s))) { const sp = parseRange(m[1]); return sp ? rangeSvg(sp) : ''; } // 🔢 L 수의 범위
  if ((m = /^sym (.+)$/.exec(s))) { const sp = parseSym(m[1]); return sp ? symSvg(sp) : ''; } // 🪞 M 합동과 대칭
  if ((m = /^circle (.+)$/.exec(s))) { const sp = parseCircle(m[1]); return sp ? circleSvg(sp) : ''; } // 🔵 N 원의 넓이
  if ((m = /^cuboid (.+)$/.exec(s))) { const sp = parseCuboid(m[1]); return sp ? cuboidSvg(sp) : ''; } // 🧊 O 직육면체 겨냥도
  if ((m = /^net (.+)$/.exec(s))) { const sp = parseNet(m[1]); return sp ? netSvg(sp) : ''; } // 🧊 O 전개도
  if ((m = /^(prism|pyramid|cyl|cone|sphere) (.+)$/.exec(s))) { const sp = parseSolid(m[1], m[2]); return sp ? solidSvg(sp) : ''; } // 🔷 P 입체도형
  if ((m = /^spin (.+)$/.exec(s))) { const sp = parseSpin(m[1]); return sp ? spinSvg(sp) : ''; } // 🔷 P 돌리기
  if ((m = /^pnet (.+)$/.exec(s))) { const sp = parsePnet(m[1]); return sp ? pnetSvg(sp) : ''; } // 🔷 P 각기둥 전개도
  if ((m = /^cnet (.+)$/.exec(s))) { const sp = parseCnet(m[1]); return sp ? cnetSvg(sp) : ''; } // 🔷 P 원기둥 전개도
  if ((m = /^scale (.+)$/.exec(s))) { const sp = parseScale(m[1]); return sp ? scaleSvg(sp) : ''; } // 🟰 Q 저울
  if ((m = /^fbar (.+)$/.exec(s))) { const sp = parseFbar(m[1]); return sp ? fbarSvg(sp) : ''; } // ➗ T 나눗셈 막대
  if ((m = /^fmul (.+)$/.exec(s))) { const sp = parseFmul(m[1]); return sp ? fmulSvg(sp) : ''; } // ✖️ U 곱셈 그림
  if ((m = /^fsub (.+)$/.exec(s))) { const sp = parseFsub(m[1]); return sp ? fsubSvg(sp) : ''; } // ➕ V 뺄셈 막대
  if ((m = /^dmul (.+)$/.exec(s))) { const sp = parseDmul(m[1]); return sp ? dmulSvg(sp) : ''; } // ✖️ W 소수 곱셈 그림
  if ((m = /^ddiv (.+)$/.exec(s))) { const sp = parseDdiv(m[1]); return sp ? ddivSvg(sp) : ''; } // ➗ X 나눗셈 그림
  if ((m = /^place (.+)$/.exec(s))) { const sp = parsePlace(m[1]); return sp ? placeSvg(sp) : ''; } // 🔢 Y 자릿값 표
  if ((m = /^plane (.+)$/.exec(s))) { const sp = parsePlane(m[1]); return sp ? planeSvg(sp) : ''; } // 📈 R 좌표평면
  if ((m = /^stack (.+)$/.exec(s))) { const sp = parseStackFig(m[1]); return sp ? stackSvg(sp) : ''; } // 🧊 S 쌓은 모양
  if ((m = /^stacks (.+)$/.exec(s))) { const sp = parseStacks(m[1]); return sp ? stacksSvg(sp) : ''; } // 🧊 S 쌓은 모양 후보
  if ((m = /^views (.+)$/.exec(s))) { const sp = parseViews(m[1]); return sp ? viewsSvg(sp) : ''; } // 🧊 S 위·앞·옆에서 본 모양
  if ((m = /^top (.+)$/.exec(s))) { const g = parseStack(m[1]); return g ? topSvg(g) : ''; } // 🧊 S 위에서 본 모양에 수
  if ((m = /^layers (.+)$/.exec(s))) { const g = parseStack(m[1]); return g ? layersSvg(g) : ''; } // 🧊 S 층별로 나타낸 모양
  if ((m = /^steps ((?:\d+\s*){2,5})$/.exec(s))) return stepsSvg(m[1].trim().split(/\s+/).map(Number));
  if ((m = /^table (.+)$/.exec(s))) { const rows = parseTable(m[1]); return rows ? tableSvg(rows) : ''; }
  // 🔺 도형 — 끝에 단위(cm·m)를 붙일 수 있다. 수는 1~40, 모양이 말이 안 되면(밑변보다 큰 밀림 등) 빈 글자
  const U = '(?: (cm|m))?$';
  const ok = (...v) => v.every((x) => Number.isInteger(x) && x >= 0 && x <= 40);
  if ((m = new RegExp(`^rect (\\d+)x(\\??)(\\d+)${U}`).exec(s)) && ok(+m[1], +m[3]) && +m[1] && +m[3]) return rectSvg(+m[1], +m[3], m[4] || 'cm', m[2] === '?');
  if ((m = new RegExp(`^reg ([3-8]) (\\d+)${U}`).exec(s)) && ok(+m[2]) && +m[2]) return regSvg(+m[1], +m[2], m[3] || 'cm');
  if ((m = new RegExp(`^para (\\d+) (\\d+) (\\d+)${U}`).exec(s)) && ok(+m[1], +m[2], +m[3]) && +m[1] && +m[2]) return paraSvg(+m[1], +m[2], +m[3], m[4] || 'cm');
  if ((m = new RegExp(`^tri (\\d+) (\\d+) (\\d+)${U}`).exec(s)) && ok(+m[1], +m[2], +m[3]) && +m[1] && +m[2] && +m[3] < +m[1]) return triSvg(+m[1], +m[2], +m[3], m[4] || 'cm');
  if ((m = new RegExp(`^rhom (\\d+) (\\??)(\\d+)${U}`).exec(s)) && ok(+m[1], +m[3]) && +m[1] && +m[3]) return rhomSvg(+m[1], +m[3], m[4] || 'cm', m[2] === '?');
  if ((m = new RegExp(`^trap (\\d+) (\\d+) (\\d+) (\\d+)${U}`).exec(s)) && ok(+m[1], +m[2], +m[3], +m[4]) && +m[1] && +m[3] && +m[4] + +m[1] <= +m[2]) return trapSvg(+m[1], +m[2], +m[3], +m[4], m[5] || 'cm');
  if ((m = new RegExp(`^lshape (\\d+) (\\d+) (\\d+) (\\d+)${U}`).exec(s)) && ok(+m[1], +m[2], +m[3], +m[4]) && +m[3] > 0 && +m[4] > 0 && +m[3] < +m[1] && +m[4] < +m[2]) return lshapeSvg(+m[1], +m[2], +m[3], +m[4], m[5] || 'cm');
  if ((m = /^grid (\d+)x(\d+)(?: -(\d+)x(\d+))?$/.exec(s)) && +m[1] >= 1 && +m[1] <= 12 && +m[2] >= 1 && +m[2] <= 10) {
    const w = m[3] ? +m[3] : 0; const h = m[4] ? +m[4] : 0;
    if (w >= +m[1] || h >= +m[2]) return '';
    return gridSvg(+m[1], +m[2], w, h);
  }
  // 📐 J 줄기 — 모눈 위 도형 `[gpoly ㄱ:0,0 ㄴ:6,0 ㄷ:7,3 ㄹ:1,3]`(좌표 0~12, 꼭짓점 3~8개)
  if ((m = /^gpoly ((?:(?:[ㄱ-ㅎ]:)?\d+,\d+\s*){3,8})$/.exec(s))) {
    const verts = m[1].trim().split(/\s+/).map((t) => { const q = /^(?:([ㄱ-ㅎ]):)?(\d+),(\d+)$/.exec(t); return { name: q[1] || '', x: +q[2], y: +q[3] }; });
    if (verts.some((v) => v.x > 12 || v.y > 12)) return '';
    return gpolySvg(verts);
  }
  // 모눈 위 직선 `[lines 10 7 ㉮:0,1,10,1 ㉯:3,0,3,7 ㉠:2,1,2,5=]` (= 이면 길이도)
  if ((m = /^lines (\d+) (\d+) (.+)$/.exec(s)) && +m[1] >= 2 && +m[1] <= 12 && +m[2] >= 2 && +m[2] <= 12) {
    const W = +m[1]; const H = +m[2];
    const items = m[3].trim().split(/\s+/).map((t) => { const q = /^(?:([^:\s]+):)?(\d+),(\d+),(\d+),(\d+)(=?)$/.exec(t); return q ? { label: q[1] || '', x1: +q[2], y1: +q[3], x2: +q[4], y2: +q[5], len: q[6] === '=' } : null; });
    if (items.some((it) => !it || it.x1 > W || it.x2 > W || it.y1 > H || it.y2 > H || (it.x1 === it.x2 && it.y1 === it.y2))) return '';
    return linesSvg(W, H, items);
  }
  // 세 변 삼각형 `[tris 5 5 6]` · `[tris 7 ?7 4]`(? 변은 숨김) — 삼각형이 되는 길이만(1~30)
  if ((m = /^tris (\??)(\d+) (\??)(\d+) (\??)(\d+)$/.exec(s))) {
    const [a, b, c] = [+m[2], +m[4], +m[6]];
    const asks = [m[1], m[3], m[5]].map((q, i) => (q ? i : -1)).filter((i) => i >= 0);
    if (asks.length > 1 || [a, b, c].some((v) => v < 1 || v > 30) || a + b <= c || b + c <= a || c + a <= b) return '';
    return trisSvg(a, b, c, asks.length ? asks[0] : -1);
  }
  // 세 각 삼각형 `[tria 50 60 ?70]` · 사각형 `[quad 65 _115 ?65 _115]` (각의 합 180° · 360°, `iso` 같은 변 눈금 · `rh` 마름모)
  if ((m = /^tria (\S+) (\S+) (\S+)( iso)?$/.exec(s))) {
    const ang = angTokens([m[1], m[2], m[3]], 180);
    if (!ang || (m[4] && ang[0].v !== ang[1].v)) return '';
    return triaSvg(ang, !!m[4]);
  }
  if ((m = /^quad (\S+) (\S+) (\S+) (\S+)( rh)?$/.exec(s))) {
    const ang = angTokens([m[1], m[2], m[3], m[4]], 360);
    return ang ? quadSvg(ang, !!m[5]) : '';
  }
  // 📊 K 줄기 — 막대·꺾은선·띠·원그래프
  if ((m = /^(bgraph|lgraph) (.+)$/.exec(s))) {
    const sp = parseChart(m[1], m[2]);
    return sp ? (m[1] === 'bgraph' ? bgraphSvg(sp) : lgraphSvg(sp)) : '';
  }
  if ((m = /^(band|pie) (.+)$/.exec(s))) {
    const it = parsePct(m[2]);
    return it ? (m[1] === 'band' ? bandSvg(it) : pieSvg(it)) : '';
  }
  return '';
}

/**
 * 글 속 대응표·도형 배열 지시문을 **글로** 풀어 쓴다 — 그림을 못 그리는 자리(🤔 노트 제목·❓ 버튼 한 줄·📊 ❓ 펼친 문제)용.
 *   [table 상자 수(개):1, 2, 3 / 몬스터볼 수(개):6, 12, ?] → (표: 상자 수(개) 1, 2, 3 ↔ 몬스터볼 수(개) 6, 12, ?)
 *   [steps 3 5 7] → (블록 모양: 3개, 5개, 7개)
 * short: 한 줄 요약(❓ 버튼 26자·🤔 노트 제목)용 — 표 내용이 글자 수를 다 먹어 문제가 안 보인다 → (표)·(블록 그림)
 */
export function figText(text, short = false) {
  return String(text || '')
    .replace(/\[table ([^\]]+)\]/g, (all, arg) => { const rows = parseTable(arg); return !rows ? all : short ? '(표)' : `(표: ${rows.map((r) => `${r.label} ${r.vals.join(', ')}`).join(' ↔ ')})`; })
    .replace(/\[steps ([\d ]+)\]/g, (_, arg) => (short ? '(블록 그림)' : `(블록 모양: ${arg.trim().split(/\s+/).map((v) => `${v}개`).join(', ')})`))
    .replace(/\[range ([^\]]+)\]/g, (all, arg) => { const sp = parseRange(arg); return !sp ? all : short ? '(수직선)' : `(${rangeText(sp)})`; })
    .replace(/\[sym ([^\]]+)\]/g, (all, arg) => { const sp = parseSym(arg); return !sp ? all : short ? '(그림)' : `(${symText(sp)})`; })
    .replace(/\[circle ([^\]]+)\]/g, (all, arg) => { const sp = parseCircle(arg); return !sp ? all : short ? '(그림)' : `(${circleText(sp)})`; })
    .replace(/\[cuboid ([^\]]+)\]/g, (all, arg) => { const sp = parseCuboid(arg); return !sp ? all : short ? '(그림)' : `(${cuboidText(sp)})`; })
    .replace(/\[net ([^\]]+)\]/g, (all, arg) => { const sp = parseNet(arg); return !sp ? all : short ? '(그림)' : `(${netText(sp)})`; })
    .replace(/\[(prism|pyramid|cyl|cone|sphere) ([^\]]+)\]/g, (all, kind, arg) => { const sp = parseSolid(kind, arg); return !sp ? all : short ? '(그림)' : `(${solidText(sp)})`; })
    .replace(/\[spin ([^\]]+)\]/g, (all, arg) => { const sp = parseSpin(arg); return !sp ? all : short ? '(그림)' : `(${spinText(sp)})`; })
    .replace(/\[pnet ([^\]]+)\]/g, (all, arg) => { const sp = parsePnet(arg); return !sp ? all : short ? '(그림)' : `(${pnetText(sp)})`; })
    .replace(/\[cnet ([^\]]+)\]/g, (all, arg) => { const sp = parseCnet(arg); return !sp ? all : short ? '(그림)' : `(${cnetText(sp)})`; })
    .replace(/\[scale ([^\]]+)\]/g, (all, arg) => { const sp = parseScale(arg); return !sp ? all : short ? '(저울)' : `(${scaleText(sp)})`; })
    .replace(/\[fbar ([^\]]+)\]/g, (all, arg) => { const sp = parseFbar(arg); return !sp ? all : short ? '(막대 그림)' : `(${fbarText(sp)})`; })
    .replace(/\[fmul ([^\]]+)\]/g, (all, arg) => { const sp = parseFmul(arg); return !sp ? all : short ? '(곱셈 그림)' : `(${fmulText(sp)})`; })
    .replace(/\[fsub ([^\]]+)\]/g, (all, arg) => { const sp = parseFsub(arg); return !sp ? all : short ? '(뺄셈 막대)' : `(${fsubText(sp)})`; })
    .replace(/\[dmul ([^\]]+)\]/g, (all, arg) => { const sp = parseDmul(arg); return !sp ? all : short ? '(소수 곱셈 그림)' : `(${dmulText(sp)})`; })
    .replace(/\[ddiv ([^\]]+)\]/g, (all, arg) => { const sp = parseDdiv(arg); return !sp ? all : short ? '(나눗셈 그림)' : `(${ddivText(sp)})`; })
    .replace(/\[place ([^\]]+)\]/g, (all, arg) => { const sp = parsePlace(arg); return !sp ? all : short ? '(자릿값 표)' : `(${placeText(sp)})`; })
    .replace(/\[plane ([^\]]+)\]/g, (all, arg) => { const sp = parsePlane(arg); return !sp ? all : short ? '(좌표평면)' : `(${planeText(sp)})`; })
    .replace(/\[(stack|stacks|views|top|layers) ([^\]]+)\]/g, (all, kind, arg) => { const tx = spaceText(kind, arg); return !tx ? all : short ? '(쌓기나무)' : `(${tx})`; })
    .replace(/\[(rect|reg|para|tri|rhom|trap|lshape|grid|gpoly|lines|tris|tria|quad) ([^\]]+)\]/g, (all, kind, arg) => { const t = shapeText(kind, arg); return !t ? all : short ? '(그림)' : `(${t})`; })
    .replace(/\[(bgraph|lgraph|band|pie) ([^\]]+)\]/g, (all, kind, arg) => { const t = chartText(kind, arg); return !t ? all : short ? '(그래프)' : `(${t})`; });
}
/** 📐 각 지시문 글: "?65" → "?", "_65" → 빠짐 */
const angText = (list) => list.map((s, i) => (s.startsWith('_') ? '' : `${VNAMES[i]} ${s.startsWith('?') ? '?' : `${s}°`}`)).filter(Boolean).join(' · ');
/** 🔺 도형 지시문 → 글 (그림에 보이는 이름표만 — 숨긴 "?"는 그대로 ?) */
function shapeText(kind, arg) {
  if (!figureSvg(`${kind} ${arg}`)) return null;
  const um = / (cm|m)$/.exec(arg); const u = um ? um[1] : 'cm';
  const v = arg.replace(/ (cm|m)$/, '');
  const n = (v.match(/\d+/g) || []).map(Number);
  const side = (dx, dy) => { const d = Math.hypot(dx, dy); return Math.abs(d - Math.round(d)) < 1e-9 ? ` · 옆변 ${Math.round(d)} ${u}` : ''; };
  switch (kind) {
    case 'rect': return `직사각형 가로 ${n[0]} ${u} · 세로 ${/\?/.test(v) ? '?' : n[1]} ${u}`;
    case 'reg': return `변이 ${n[0]}개인 정다각형 · 한 변 ${n[1]} ${u}`;
    case 'para': return `평행사변형 밑변 ${n[0]} ${u} · 높이 ${n[1]} ${u}${n[2] ? side(n[2], n[1]) : ''}`;
    case 'tri': return `삼각형 밑변 ${n[0]} ${u} · 높이 ${n[1]} ${u}${n[2] ? side(n[2], n[1]) : ''}`;
    // 그림에 보이는 한 변(정수일 때만)도 — 빠지면 아빠가 "한 변 × 한 변" 오답이 어디서 왔는지 모른다 (Codex 16차 #5)
    case 'rhom': return `마름모 대각선 ${n[0]} ${u} · ${/\?/.test(v) ? '?' : n[1]} ${u}${/\?/.test(v) ? '' : side(n[0] / 2, n[1] / 2).replace('옆변', '한 변')}`;
    case 'trap': return `사다리꼴 윗변 ${n[0]} ${u} · 아랫변 ${n[1]} ${u} · 높이 ${n[2]} ${u}${n[3] ? side(n[3], n[2]) : ''}`;
    case 'lshape': return `ㄴ자 모양 가로 ${n[0]} ${u} · 세로 ${n[1]} ${u} · 오른쪽 위를 ${n[2]} ${u} × ${n[3]} ${u} 떼어 냄`;
    case 'grid': return `모눈 가로 ${n[0]}칸 · 세로 ${n[1]}칸${n[2] ? ` · 오른쪽 위 ${n[2]} × ${n[3]}칸 뺌` : ''}`;
    case 'gpoly': return `모눈 위 도형 — 꼭짓점 ${arg.trim().split(/\s+/).map((t) => { const q = /^(?:([ㄱ-ㅎ]):)?(\d+),(\d+)$/.exec(t); return `${q[1] || ''}(${q[2]}, ${q[3]})`; }).join(' · ')}`;
    case 'lines': return `모눈 위 선 — ${arg.trim().split(/\s+/).slice(2).map((t) => { const q = /^(?:([^:\s]+):)?(\d+),(\d+),(\d+),(\d+)(=?)$/.exec(t); const d = Math.hypot(q[4] - q[2], q[5] - q[3]); const L = q[6] && Math.abs(d - Math.round(d)) < 1e-9 ? ` ${Math.round(d)} cm` : ''; return `${q[1] || '선'} (${q[2]}, ${q[3]})–(${q[4]}, ${q[5]})${L}`; }).join(' · ')}`;
    // 어느 두 변이 같은지(그림의 눈금)도 — 빠지면 "? 변"이 어느 변과 같은지 몰라 답이 둘이 된다 (Codex 17차 #4)
    case 'tris': {
      const t = arg.trim().split(/\s+/); const v = t.map((x) => x.replace('?', '')); const nm = ['ㄱㄴ', 'ㄴㄷ', 'ㄷㄱ'];
      const pair = [[0, 1], [1, 2], [0, 2]].find(([i, j]) => v[i] === v[j]);
      const eq = v[0] === v[1] && v[1] === v[2] ? ' · 세 변의 길이가 모두 같음' : pair ? ` · 변 ${nm[pair[0]]}과 변 ${nm[pair[1]]}의 길이가 같음` : '';
      return `삼각형 ㄱㄴㄷ — ${t.map((x, i) => `변 ${nm[i]} ${x.startsWith('?') ? '?' : x} cm`).join(' · ')}${eq}`;
    }
    case 'tria': return `삼각형 세 각 ${angText(arg.replace(/ iso$/, '').trim().split(/\s+/))}${/ iso$/.test(arg) ? ' · 변 ㄴㄷ과 변 ㄷㄱ의 길이가 같음' : ''}`;
    case 'quad': return `사각형 네 각 ${angText(arg.replace(/ rh$/, '').trim().split(/\s+/))}`;
    default: return null;
  }
}

/** 글 속 `[bar 7/8]` `[walk 2 -3]` 지시문을 SVG로 바꾼다 (화면·검수 페이지가 같이 쓴다) */
export function renderFigures(text) {
  return String(text || '').replace(/\[(bar|pizza|bars|line|vline|walk|steps|table|rect|reg|para|tri|rhom|trap|lshape|grid|gpoly|lines|tris|tria|quad|bgraph|lgraph|band|pie|range|sym|circle|cuboid|net|prism|pyramid|cyl|cone|sphere|spin|pnet|cnet|scale|fbar|fmul|fsub|dmul|ddiv|place|plane|stack|stacks|views|top|layers) ([^\]]+)\]/g, (_, kind, arg) => figureSvg(`${kind} ${arg}`));
}

// ───────────────────── 🟰 Q 일차방정식 — 저울 (2026-10-03) ─────────────────────
//
// `[scale 2x + 3 | 11]` — 왼쪽 접시에 x 상자 2개와 1 추 3개, 오른쪽 접시에 1 추 11개. 저울은 늘 수평(= 등식).
// `[scale 2x + 3 | 11 take=3]` — 양쪽에서 1 추를 3개씩 덜어 낸 모습(흐리게 + ✕) — 등식의 성질.
// x 상자 0~5개, 1 추 0~15개, 접시마다 하나 이상. 개수는 그림에서 세게 — 글자로 적지 않는다.
// 테스트가 그린 그림에서 다시 셀 수 있게 접시마다 data-x·data-n·data-take, 물건마다 sc-x · sc-1 (· sc-take).

/** 저울 한쪽 "2x + 3" · "x + 8" · "3x" · "11" → { x, n } (못 읽으면 null) */
function parseScaleSide(t) {
  const s = t.trim(); let m;
  if ((m = /^(\d+)$/.exec(s))) return { x: 0, n: +m[1] };
  if ((m = /^(\d*)x$/.exec(s))) return { x: m[1] ? +m[1] : 1, n: 0 };
  // "2x+3"·"2x +3"처럼 손으로 쓴 지시문도 (Codex 27차 — 📊 답장·❓에 아빠가 직접 쓴다)
  if ((m = /^(\d*)x\s*\+\s*(\d+)$/.exec(s))) return { x: m[1] ? +m[1] : 1, n: +m[2] };
  return null;
}
/** `2x + 3 | 11 take=3` → { L, R, take } (못 읽거나 그릴 수 없으면 null) */
export function parseScale(arg) {
  const m = /^(.+?)\s*\|\s*(.+?)(?:\s+take=(\d+))?$/.exec(String(arg || '').trim());
  if (!m) return null;
  const L = parseScaleSide(m[1]); const R = parseScaleSide(m[2]); const take = m[3] ? +m[3] : 0;
  if (!L || !R) return null;
  const okPan = (p) => p.x >= 0 && p.x <= 5 && p.n >= 0 && p.n <= 15 && p.x + p.n >= 1;
  if (!okPan(L) || !okPan(R) || take > Math.min(L.n, R.n)) return null;
  return { L, R, take };
}
const scaleSide = (p) => [p.x ? `x 상자 ${p.x}개` : '', p.n ? `1 추 ${p.n}개` : ''].filter(Boolean).join('와 ');
/** 📊·❓ 글용 (소리 내어 읽어도 그림이 떠오르게 "상자·추" — Codex 27차) */
export function scaleText(sp) {
  return `저울: 왼쪽 ${scaleSide(sp.L)} · 오른쪽 ${scaleSide(sp.R)}${sp.take ? ` · 양쪽에서 1 추를 ${sp.take}개씩 덜어 냄` : ''}`;
}
/** 저울 그림 — 막대는 수평, 접시마다 물건을 아래 줄부터 다섯 개씩 */
export function scaleSvg(sp) {
  const S = 28; const per = 5; const PW = 156; const W = 400; const cx = [102, 298];
  const rowsOf = (p) => Math.max(1, Math.ceil((p.x + p.n) / per));
  const rows = Math.max(rowsOf(sp.L), rowsOf(sp.R));
  const beamY = 22; const plateY = beamY + 30 + rows * S; const baseY = plateY + 34; const H = baseY + 12;
  let g = '';
  g += `<path d="M200 ${beamY} L180 ${baseY} L220 ${baseY} Z" fill="${EMPTY}" stroke="currentColor" stroke-width="1.5"/>`;
  g += `<rect x="160" y="${baseY}" width="80" height="8" rx="2" fill="currentColor" fill-opacity="0.35"/>`;
  g += `<line x1="${cx[0]}" y1="${beamY}" x2="${cx[1]}" y2="${beamY}" stroke="currentColor" stroke-width="4" stroke-linecap="round"/>`;
  g += `<circle cx="200" cy="${beamY}" r="5" fill="currentColor"/>`;
  [sp.L, sp.R].forEach((p, k) => {
    const c = cx[k]; const x0 = c - PW / 2;
    let pan = `<line x1="${c}" y1="${beamY}" x2="${x0 + 8}" y2="${plateY}" stroke="currentColor" stroke-opacity="0.4" stroke-width="1.2"/>`;
    pan += `<line x1="${c}" y1="${beamY}" x2="${x0 + PW - 8}" y2="${plateY}" stroke="currentColor" stroke-opacity="0.4" stroke-width="1.2"/>`;
    pan += `<path d="M${x0} ${plateY} L${x0 + PW} ${plateY} L${x0 + PW - 14} ${plateY + 10} L${x0 + 14} ${plateY + 10} Z" fill="currentColor" fill-opacity="0.22" stroke="currentColor" stroke-width="1.2"/>`;
    const items = [...Array(p.x).fill('x'), ...Array(p.n).fill('1')];
    items.forEach((it, i) => {
      const row = Math.floor(i / per); const col = i % per;
      const inRow = Math.min(per, items.length - row * per);
      const ix = c - (inRow * S) / 2 + col * S + S / 2; const iy = plateY - row * S - S / 2 - 1;
      if (it === 'x') {
        pan += `<rect class="sc-x" x="${ix - 12}" y="${iy - 12}" width="24" height="24" rx="3" fill="${FILL}" stroke="currentColor" stroke-width="1"/>`;
        pan += `<text x="${ix}" y="${iy + 6}" font-size="18" font-style="italic" font-family="Times New Roman, Noto Serif, serif" text-anchor="middle" fill="#fff">x</text>`;
      } else {
        const taken = i >= items.length - sp.take; // 맨 위(마지막)부터 덜어 낸다
        pan += `<g class="sc-1${taken ? ' sc-take' : ''}"${taken ? ' opacity="0.35"' : ''}><circle cx="${ix}" cy="${iy}" r="11" fill="${FILL2}" stroke="currentColor" stroke-width="1"/>`;
        pan += `<text x="${ix}" y="${iy + 5}" font-size="14" font-weight="700" text-anchor="middle" fill="currentColor">1</text></g>`;
        if (taken) pan += `<path d="M${ix - 9} ${iy - 9} L${ix + 9} ${iy + 9} M${ix + 9} ${iy - 9} L${ix - 9} ${iy + 9}" stroke="currentColor" stroke-width="2"/>`;
      }
    });
    g += `<g class="sc-pan" data-side="${k ? 'R' : 'L'}" data-x="${p.x}" data-n="${p.n}" data-take="${sp.take}">${pan}</g>`;
  });
  // 보이는 크기는 1.25배 — 그린 크기(400px)면 태블릿에서 추 지름 22px·숫자 14px로 본문 글자보다 작다 (헤드리스 800px, 3단계). 폰에서는 max-width:100%로 줄어든다
  return `<svg class="frac-fig scale-fig" viewBox="0 0 ${W} ${H}" width="${Math.round(W * 1.25)}" height="${Math.round(H * 1.25)}" role="img" aria-label="${scaleText(sp)}">${g}</svg>`;
}

// ───────────────────── ➗ T 분수의 나눗셈 — 나눗셈 막대 (2026-10-06) ─────────────────────
//
// 교과서가 분수의 나눗셈을 설명하는 막대 그림 세 가지 (배움 장·② 문항에서만 — ① 계산 문제에 그리면 답을 흘린다):
//   `[fbar take 6/7 2/7]` — 덜어 내기: 1을 7칸으로 나눈 막대에 6칸을 칠하고 2칸씩 묶는다(①②③). 남는 칸은 "나머지".
//                           나누어지는 수는 자연수도 된다 `[fbar take 3 1/4]`(막대 3개) — 두 수의 분모가 같아야 한다.
//   `[fbar share 3/5 2]`  — 똑같이 나누기: 5칸 중 3칸을 칠하고 칸마다 2줄로 나눠 한 줄씩(진한 색) — 3/10.
//   `[fbar unit 2/3 6]`   — 1만큼: 3칸 중 2칸 위에 "6", 막대 전체(1) 아래에 "1만큼 = ?".
// 테스트가 그린 그림에서 다시 셀 수 있게 칸마다 class="fb-c"와 data-g(묶음 번호 · r 나머지 · 0 빈 칸) · data-on · data-pick.

/** "6/7" → {n:6, d:7} · "3" → {n:3, d:1} (못 읽으면 null) */
function fbarNum(t) {
  const m = /^(\d+)(?:\/(\d+))?$/.exec(String(t || '').trim());
  if (!m) return null;
  const n = +m[1]; const d = m[2] ? +m[2] : 1;
  return d > 0 ? { n, d } : null;
}
/** `take 6/7 2/7` · `share 3/5 2` · `unit 2/3 6` → 그림 자료 (못 읽거나 그릴 수 없으면 null) */
export function parseFbar(arg) {
  const p = String(arg || '').trim().split(/\s+/);
  if (p.length !== 3) return null;
  const [mode, x, y] = p;
  if (mode === 'take') {
    const A = fbarNum(x); const B = fbarNum(y);
    if (!A || !B || B.d === 1 || B.n < 1) return null;
    const d = B.d;
    if (A.d !== 1 && A.d !== d) return null; // 분모가 같아야 묶을 수 있다 (자연수는 그 분모로 센다)
    const a = A.d === 1 ? A.n * d : A.n; const b = B.n;
    const bars = Math.max(1, Math.ceil(a / d));
    if (a < 1 || d > 12 || bars > 4) return null;
    return { mode, a, b, d, bars, groups: Math.floor(a / b), rem: a % b, A: x, B: y };
  }
  if (mode === 'share') {
    const A = fbarNum(x); const k = /^\d+$/.test(y) ? +y : 0;
    if (!A || A.d === 1 || A.n < 1 || A.n > A.d || A.d > 10 || k < 2 || k > 6) return null;
    return { mode, n: A.n, d: A.d, k, A: x };
  }
  if (mode === 'unit') {
    const P = fbarNum(x); const V = fbarNum(y);
    if (!P || !V || P.d === 1 || P.n < 1 || P.n > P.d || P.d > 10) return null;
    return { mode, p: P.n, q: P.d, v: y, P: x };
  }
  return null;
}
/** 📊·❓ 글용 */
export function fbarText(sp) {
  if (sp.mode === 'take') return `막대: 1을 ${sp.d}칸으로 나눈 막대${sp.bars > 1 ? ` ${sp.bars}개` : ''}에 ${sp.a}칸을 칠하고 ${sp.b}칸씩 묶음 — ${sp.groups}묶음${sp.rem ? `, 나머지 ${sp.rem}칸` : ''}`;
  if (sp.mode === 'share') return `막대: ${sp.d}칸 중 ${sp.n}칸을 칠하고 칸마다 ${sp.k}줄로 나눠 한 줄씩 — 작은 칸 ${sp.n}개`;
  return `막대: ${sp.q}칸 중 ${sp.p}칸이 ${sp.v}만큼 — 막대 전체(1만큼)는 ?`;
}
const NUM_CIRCLE = ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨', '⑩', '⑪', '⑫'];
/** 나눗셈 막대 그림 */
export function fbarSvg(sp) {
  const W = 400; const X0 = 30; const BW = 340; let g = ''; let H;
  const lab = (x, y, t, o = '') => `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" font-size="15" font-weight="700" text-anchor="middle" fill="currentColor"${o}>${t}</text>`;
  const cell = (x, y, w, h, fill, attrs) => `<rect class="fb-c" x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" fill="${fill}" stroke="currentColor" stroke-opacity="0.6" stroke-width="1" ${attrs}/>`;
  if (sp.mode === 'take') {
    const cw = BW / sp.d; const BH = 30; const gap = 34; const top = 10;
    for (let i = 0; i < sp.bars * sp.d; i++) {
      const row = Math.floor(i / sp.d); const col = i % sp.d;
      const x = X0 + col * cw; const y = top + row * (BH + gap);
      const on = i < sp.a; const gi = on ? Math.floor(i / sp.b) + 1 : 0;
      const isRem = on && gi > sp.groups;
      const fill = !on ? EMPTY : isRem ? 'var(--frac-rem, rgba(127,127,127,0.35))' : gi % 2 ? FILL : FILL2;
      g += cell(x, y, cw, BH, fill, `data-g="${!on ? 0 : isRem ? 'r' : gi}" data-on="${on ? 1 : 0}"`);
      // 묶음 번호는 그 묶음의 첫 칸 아래 · 나머지는 첫 칸 아래 "나머지"
      if (on && i % sp.b === 0) g += lab(x + Math.min(cw * (isRem ? sp.rem : sp.b), (sp.d - col) * cw) / 2, y + BH + 18, isRem ? '나머지' : NUM_CIRCLE[gi - 1] || String(gi), ` class="fb-l"`); // 나머지는 남은 칸 가운데에
    }
    for (let r = 0; r < sp.bars; r++) g += `<text x="${X0 - 8}" y="${(top + r * (BH + gap) + BH / 2 + 5).toFixed(1)}" font-size="13" text-anchor="end" fill="currentColor" fill-opacity="0.7">1</text>`;
    H = top + sp.bars * (BH + gap);
  } else if (sp.mode === 'share') {
    const cw = BW / sp.d; const rh = Math.max(14, 72 / sp.k); const top = 10;
    for (let c = 0; c < sp.d; c++) {
      for (let r = 0; r < sp.k; r++) {
        // 한 사람 몫(맨 아래 줄)만 진하게, 나머지 칠한 칸은 같은 색을 옅게 — 원고·풀이가 "진한 칸"이라 부른다.
        // 두 색(파랑·주황)으로 칠하면 어느 쪽이 "진한" 칸인지 갈리고, 색 이름은 세계(--frac-fill)마다 바뀐다 (3단계 헤드리스)
        const on = c < sp.n; const pick = on && r === sp.k - 1;
        g += cell(X0 + c * cw, top + r * rh, cw, rh, on ? FILL : EMPTY, `${on && !pick ? 'fill-opacity="0.3" ' : ''}data-on="${on ? 1 : 0}" data-pick="${pick ? 1 : 0}" data-c="${c}" data-r="${r}"`);
      }
    }
    g += `<rect x="${X0}" y="${top}" width="${BW}" height="${(rh * sp.k).toFixed(1)}" fill="none" stroke="currentColor" stroke-width="2"/>`;
    for (let c = 1; c < sp.d; c++) g += `<line x1="${(X0 + c * cw).toFixed(1)}" y1="${top}" x2="${(X0 + c * cw).toFixed(1)}" y2="${(top + rh * sp.k).toFixed(1)}" stroke="currentColor" stroke-width="1.6"/>`;
    H = top + rh * sp.k + 12;
  } else {
    const cw = BW / sp.q; const BH = 34; const top = 34;
    for (let i = 0; i < sp.q; i++) g += cell(X0 + i * cw, top, cw, BH, i < sp.p ? FILL : EMPTY, `data-on="${i < sp.p ? 1 : 0}"`);
    const brace = (x1, x2, y, up) => { const d = up ? -8 : 8; return `<path d="M${x1.toFixed(1)} ${y} L${x1.toFixed(1)} ${y + d} L${x2.toFixed(1)} ${y + d} L${x2.toFixed(1)} ${y}" fill="none" stroke="currentColor" stroke-width="1.6"/>`; };
    g += brace(X0, X0 + sp.p * cw, top - 4, true) + lab(X0 + (sp.p * cw) / 2, top - 16, sp.v, ' class="fb-v"');
    g += brace(X0, X0 + BW, top + BH + 4, false) + lab(X0 + BW / 2, top + BH + 30, '1만큼 = ?', ' class="fb-one"');
    H = top + BH + 40;
  }
  const meta = sp.mode === 'take' ? `data-a="${sp.a}" data-b="${sp.b}" data-d="${sp.d}"` : sp.mode === 'share' ? `data-n="${sp.n}" data-d="${sp.d}" data-k="${sp.k}"` : `data-p="${sp.p}" data-q="${sp.q}"`;
  // 보이는 크기는 1.25배 (저울과 같다 — 태블릿에서 칸·글자가 본문 글자보다 작지 않게)
  return `<svg class="frac-fig fbar-fig" data-mode="${sp.mode}" ${meta} viewBox="0 0 ${W} ${Math.round(H)}" width="${Math.round(W * 1.25)}" height="${Math.round(H * 1.25)}" role="img" aria-label="${fbarText(sp)}">${g}</svg>`;
}

// ───────────────────── ✖️ U 분수의 곱셈 — 곱셈 그림 (2026-10-07) ─────────────────────
//
// 교과서(미래엔 5-2 「분수의 곱셈」)가 곱셈을 설명하는 그림 세 가지 (배움 장·② 문항에서만 — ① 계산 문제에 그리면 답을 흘린다):
//   `[fmul rep 2/5 3]`   — 같은 막대 여러 번: 1을 5칸으로 나눈 막대 3개에 2칸씩 칠한다 → 1/5짜리 6칸 (2/5 × 3).
//   `[fmul part 12 2/3]` — 몇 묶음 중 몇 묶음: 12개를 똑같이 3묶음으로 나누고 2묶음을 칠한다 → 8개 (12 × 2/3, "12의 2/3").
//   `[fmul area 2/3 3/4]` — 넓이 모델: 1 × 1 정사각형을 가로 3칸·세로 4칸으로 나눠 가로 2칸·세로 3칸을 칠한다 →
//                          두 번 칠한 칸(진하게) 6개 / 전체 12칸 (2/3 × 3/4). 한 번만 칠한 칸은 같은 색을 옅게 — 원고가 "진한 칸"이라 부른다.
// 테스트가 그린 그림에서 다시 셀 수 있게 칸마다 class="fm-c"(rep·area)·묶음 class="fm-g"와 점 class="fm-d"(part), data-on.

/** `rep 2/5 3` · `part 12 2/3` · `area 2/3 3/4` → 그림 자료 (못 읽거나 그릴 수 없으면 null) */
export function parseFmul(arg) {
  const p = String(arg || '').trim().split(/\s+/);
  if (p.length !== 3) return null;
  const [mode, x, y] = p;
  const fr = (t) => { const m = /^(\d+)\/(\d+)$/.exec(t); return m ? { n: +m[1], d: +m[2] } : null; };
  if (mode === 'rep') {
    const A = fr(x); const k = /^\d+$/.test(y) ? +y : 0;
    if (!A || A.n < 1 || A.n > A.d || A.d < 2 || A.d > 10 || k < 2 || k > 5) return null;
    return { mode, n: A.n, d: A.d, k, A: x };
  }
  if (mode === 'part') {
    const N = /^\d+$/.test(x) ? +x : 0; const F = fr(y);
    if (!F || N < 2 || N > 30 || F.d < 2 || F.d > 6 || F.n < 1 || F.n > F.d || N % F.d !== 0) return null;
    return { mode, N, p: F.n, d: F.d, F: y };
  }
  if (mode === 'area') {
    const A = fr(x); const B = fr(y);
    if (!A || !B || A.n < 1 || B.n < 1 || A.n > A.d || B.n > B.d || A.d < 2 || B.d < 2 || A.d > 8 || B.d > 8) return null;
    return { mode, a: A.n, b: A.d, c: B.n, d: B.d, A: x, B: y };
  }
  return null;
}
/** 📊·❓ 글용 */
export function fmulText(sp) {
  if (sp.mode === 'rep') return `막대: 1을 ${sp.d}칸으로 나눈 막대 ${sp.k}개에 ${sp.n}칸씩 칠함 — 칠한 칸 ${sp.n * sp.k}개`;
  if (sp.mode === 'part') return `그림: ${sp.N}개를 똑같이 ${sp.d}묶음으로 나누고 ${sp.p}묶음을 칠함 — ${(sp.N / sp.d) * sp.p}개`;
  return `넓이 그림: 가로 ${sp.b}칸 중 ${sp.a}칸, 세로 ${sp.d}칸 중 ${sp.c}칸을 칠함 — 두 번 칠한 칸 ${sp.a * sp.c}개, 전체 ${sp.b * sp.d}칸`;
}
/** 곱셈 그림 */
export function fmulSvg(sp) {
  const W = 400; let g = ''; let H;
  const lab = (x, y, t, o = '') => `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" font-size="15" font-weight="700" text-anchor="middle" fill="currentColor"${o}>${t}</text>`;
  const cell = (x, y, w, h, fill, attrs) => `<rect class="fm-c" x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" fill="${fill}" stroke="currentColor" stroke-opacity="0.6" stroke-width="1" ${attrs}/>`;
  if (sp.mode === 'rep') {
    const X0 = 60; const BW = 320; const cw = BW / sp.d; const BH = 28; const gap = 14; const top = 8;
    for (let r = 0; r < sp.k; r++) {
      const y = top + r * (BH + gap);
      for (let i = 0; i < sp.d; i++) g += cell(X0 + i * cw, y, cw, BH, i < sp.n ? FILL : EMPTY, `data-r="${r}" data-on="${i < sp.n ? 1 : 0}"`);
      g += lab(X0 - 26, y + BH / 2 + 5, sp.A, ' class="fm-l"');
    }
    H = top + sp.k * (BH + gap);
  } else if (sp.mode === 'part') {
    const per = sp.N / sp.d; const cols = per === 4 ? 2 : Math.min(per, 3); const rows = Math.ceil(per / cols);
    const gw = Math.min(110, (W - 20 - (sp.d - 1) * 10) / sp.d); const R = Math.min(10, (gw - 10) / (cols * 2.4));
    const gh = rows * R * 2.6 + 14; const X0 = (W - (sp.d * gw + (sp.d - 1) * 10)) / 2; const top = 8;
    for (let k = 0; k < sp.d; k++) {
      const on = k < sp.p; const gx = X0 + k * (gw + 10);
      g += `<rect class="fm-g" x="${gx.toFixed(1)}" y="${top}" width="${gw.toFixed(1)}" height="${gh.toFixed(1)}" rx="8" fill="${on ? FILL : 'none'}" fill-opacity="${on ? 0.22 : 0}" stroke="currentColor" stroke-width="${on ? 2 : 1.4}" data-g="${k}" data-on="${on ? 1 : 0}"/>`;
      for (let i = 0; i < per; i++) {
        const cx = gx + gw / 2 + ((i % cols) - (cols - 1) / 2) * R * 2.4; const cy = top + 7 + R * 1.3 + Math.floor(i / cols) * R * 2.6;
        g += `<circle class="fm-d" cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${R.toFixed(1)}" fill="${on ? FILL : EMPTY}" stroke="currentColor" stroke-opacity="0.6" stroke-width="1" data-g="${k}" data-on="${on ? 1 : 0}"/>`;
      }
    }
    H = top + gh + 10;
  } else {
    const S = 220; const X0 = 120; const top = 34; const cw = S / sp.b; const ch = S / sp.d;
    for (let y = 0; y < sp.d; y++) {
      for (let x = 0; x < sp.b; x++) {
        const inA = x < sp.a; const inB = y < sp.c; const on = inA && inB;
        // 두 번 칠한 칸만 진하게, 한 번 칠한 칸은 같은 색을 옅게 (T 나눗셈 막대와 같은 약속 — 두 색이면 "진한 칸"이 어느 쪽인지 갈린다)
        g += cell(X0 + x * cw, top + y * ch, cw, ch, inA || inB ? FILL : EMPTY, `${(inA || inB) && !on ? 'fill-opacity="0.28" ' : ''}data-x="${x}" data-y="${y}" data-on="${on ? 1 : 0}"`);
      }
    }
    g += `<rect x="${X0}" y="${top}" width="${S}" height="${S}" fill="none" stroke="currentColor" stroke-width="2"/>`;
    const brace = (x1, y1, x2, y2, side) => {
      if (side === 'top') return `<path d="M${x1.toFixed(1)} ${y1} L${x1.toFixed(1)} ${y1 - 8} L${x2.toFixed(1)} ${y1 - 8} L${x2.toFixed(1)} ${y1}" fill="none" stroke="currentColor" stroke-width="1.6"/>`;
      return `<path d="M${x1} ${y1.toFixed(1)} L${x1 - 8} ${y1.toFixed(1)} L${x1 - 8} ${y2.toFixed(1)} L${x1} ${y2.toFixed(1)}" fill="none" stroke="currentColor" stroke-width="1.6"/>`;
    };
    g += brace(X0, top - 4, X0 + sp.a * cw, 0, 'top') + lab(X0 + (sp.a * cw) / 2, top - 16, sp.A, ' class="fm-a"');
    g += brace(X0 - 4, top, 0, top + sp.c * ch, 'left') + lab(X0 - 40, top + (sp.c * ch) / 2 + 5, sp.B, ' class="fm-b"');
    H = top + S + 10;
  }
  const meta = sp.mode === 'rep' ? `data-n="${sp.n}" data-d="${sp.d}" data-k="${sp.k}"` : sp.mode === 'part' ? `data-big="${sp.N}" data-p="${sp.p}" data-d="${sp.d}"` : `data-a="${sp.a}" data-b="${sp.b}" data-c="${sp.c}" data-d="${sp.d}"`;
  // 보이는 크기는 1.25배 (나눗셈 막대·저울과 같다 — 태블릿에서 본문 글자보다 작지 않게)
  return `<svg class="frac-fig fmul-fig" data-mode="${sp.mode}" ${meta} viewBox="0 0 ${W} ${Math.round(H)}" width="${Math.round(W * 1.25)}" height="${Math.round(H * 1.25)}" role="img" aria-label="${fmulText(sp)}">${g}</svg>`;
}

// ───────────────────── ➕ V 분수의 덧셈·뺄셈 — 뺄셈 막대 (2026-10-07) ─────────────────────
//
// `[fsub 3 1/4 | 1 3/4]` — 덜어 내기: 1을 4칸으로 나눈 막대를 한 줄에 하나씩(빼지는 수만큼) 칠하고, 빼는 만큼을 **뒤에서부터** 덜어 낸다(옅게 + ✕).
//   3 1/4 = 1/4짜리 13칸, 1 3/4 = 7칸 → 남은 6칸 = 1 2/4. 받아내림은 "꽉 찬 줄 하나를 헐어서 덜어 내는" 모습으로 보인다.
//   빼지는 수가 자연수면(`[fsub 3 | 1/5]`) 분모는 빼는 수에서. 두 수는 분모가 같아야 한다(4학년 칸 · 통분한 뒤).
//   덧셈은 기존 막대(`[bar 2/5+4/5]` — 가분수면 여러 줄로 이어 칠함)를 쓴다.
// 테스트가 다시 셀 수 있게 칸마다 class="fs-c", data-r(줄)·data-on(칠함)·data-x(덜어 냄), 줄 이름 class="fs-l"("1" · 남은 줄은 "1/4").

/** `3 1/4 | 1 3/4` · `3 | 1/5` → 그림 자료 (못 읽거나 그릴 수 없으면 null) */
export function parseFsub(arg) {
  const parts = String(arg || '').split('|').map((t) => t.trim());
  if (parts.length !== 2) return null;
  const num = (t) => {
    let m;
    if ((m = /^(\d+) (\d+)\/(\d+)$/.exec(t))) return { w: +m[1], n: +m[2], d: +m[3] };
    if ((m = /^(\d+)\/(\d+)$/.exec(t))) return { w: 0, n: +m[1], d: +m[2] };
    if ((m = /^(\d+)$/.exec(t))) return { w: +m[1], n: 0, d: 0 };
    return null;
  };
  const A = num(parts[0]); const B = num(parts[1]);
  if (!A || !B) return null;
  const d = B.d || A.d;
  if (!d || d < 2 || d > 12 || (A.d && A.d !== d) || (B.d && B.d !== d) || A.n >= d || B.n >= d || (A.d && A.n < 1) || (B.d && B.n < 1)) return null;
  const ta = A.w * d + A.n; const tb = B.w * d + B.n;
  const rows = Math.ceil(ta / d);
  if (tb < 1 || tb >= ta || rows > 6) return null;
  return { A: parts[0], B: parts[1], d, ta, tb, rows };
}
/** 📊·❓ 글용 */
export function fsubText(sp) {
  return `막대: 1을 ${sp.d}칸으로 나눈 막대 ${sp.rows}줄에 ${sp.ta}칸 칠함 — 뒤에서 ${sp.tb}칸을 덜어 내면 ${sp.ta - sp.tb}칸`;
}
/** 뺄셈 막대 */
export function fsubSvg(sp) {
  const W = 400; const X0 = 56; const BW = 324; const cw = BW / sp.d; const BH = 28; const gap = 12; const top = 8;
  const full = Math.floor(sp.ta / sp.d);
  let g = '';
  for (let r = 0; r < sp.rows; r++) {
    const y = top + r * (BH + gap);
    for (let i = 0; i < sp.d; i++) {
      const k = r * sp.d + i; const on = k < sp.ta; const out = on && k >= sp.ta - sp.tb;
      const x = X0 + i * cw;
      // 덜어 낸 칸은 같은 색을 옅게 + ✕ (색 이름 대신 "덜어 낸 칸"으로 부른다 — T·U 그림과 같은 약속)
      g += `<rect class="fs-c" x="${x.toFixed(1)}" y="${y}" width="${cw.toFixed(1)}" height="${BH}" fill="${on ? FILL : EMPTY}" ${out ? 'fill-opacity="0.25" ' : ''}stroke="currentColor" stroke-opacity="0.6" stroke-width="1" data-r="${r}" data-on="${on ? 1 : 0}" data-x="${out ? 1 : 0}"/>`;
      if (out) g += `<path class="fs-x" d="M${(x + 6).toFixed(1)} ${y + 6} L${(x + cw - 6).toFixed(1)} ${y + BH - 6} M${(x + 6).toFixed(1)} ${y + BH - 6} L${(x + cw - 6).toFixed(1)} ${y + 6}" stroke="currentColor" stroke-width="1.6" stroke-opacity="0.8"/>`;
    }
    const name = r < full ? '1' : `${sp.ta % sp.d}/${sp.d}`;
    g += `<text class="fs-l" x="${X0 - 28}" y="${y + BH / 2 + 5}" font-size="15" font-weight="700" text-anchor="middle" fill="currentColor">${name}</text>`;
  }
  const H = top + sp.rows * (BH + gap);
  return `<svg class="frac-fig fsub-fig" data-d="${sp.d}" data-ta="${sp.ta}" data-tb="${sp.tb}" viewBox="0 0 ${W} ${H}" width="${Math.round(W * 1.25)}" height="${Math.round(H * 1.25)}" role="img" aria-label="${fsubText(sp)}">${g}</svg>`;
}

// ───────────────────── ✖️ W 소수의 곱셈 — 소수 곱셈 그림 (2026-10-07) ─────────────────────
//
// 교과서(미래엔 5-2 「소수의 곱셈」 — 지도서 241쪽 "수 모형, 띠 모델, 넓이 모델")의 그림 세 가지 (배움 장·② 문항에서만 — ① 계산에 그리면 답을 흘린다):
//   `[dmul rep 0.7 3]`    — 0.1 막대: 1을 10칸(한 칸 0.1)으로 나눈 막대 3개에 7칸씩 칠한다 → 0.1이 21개 (0.7 × 3 = 2.1).
//   `[dmul band 2 0.9]`   — 띠 모델: 2만큼의 띠(한 칸 0.1, 20칸)를 똑같이 10묶음으로 나눠 9묶음을 칠한다 → 18칸 = 1.8 (2 × 0.9, "2의 0.9배").
//   `[dmul area 0.4 0.8]` — 넓이 모델: 1 m² 정사각형을 가로 10칸·세로 10칸(한 칸 0.01)으로 나눠 가로 4칸·세로 8칸을 칠한다 →
//                          두 번 칠한 칸(진하게) 32개 = 0.32. 한 번만 칠한 칸은 같은 색을 옅게 (U 넓이 그림과 같은 약속 — "진한 칸").
// 소수는 1보다 작은 소수 한 자리만(그림이 1을 넘지 않게) — 1보다 큰 소수·두 자리 소수는 그림 없이 글로.
// 테스트가 다시 셀 수 있게 칸마다 class="dm-c", data-on(칠함 · area는 두 번 칠함) · data-r(rep 막대 번호) · data-g(band 묶음 번호).

/** `rep 0.7 3` · `band 2 0.9` · `area 0.4 0.8` → 그림 자료 (못 읽거나 그릴 수 없으면 null) */
export function parseDmul(arg) {
  const p = String(arg || '').trim().split(/\s+/);
  if (p.length !== 3) return null;
  const [mode, x, y] = p;
  const tenth = (t) => { const m = /^0\.([1-9])$/.exec(t); return m ? +m[1] : 0; };
  if (mode === 'rep') {
    const a = tenth(x); const k = /^\d+$/.test(y) ? +y : 0;
    if (!a || k < 2 || k > 5) return null;
    return { mode, a, k, A: x };
  }
  if (mode === 'band') {
    const N = /^\d+$/.test(x) ? +x : 0; const a = tenth(y);
    if (!a || N < 1 || N > 4) return null;
    return { mode, N, a, B: y };
  }
  if (mode === 'area') {
    const a = tenth(x); const b = tenth(y);
    if (!a || !b) return null;
    return { mode, a, b, A: x, B: y };
  }
  return null;
}
/** 📊·❓ 글용 */
export function dmulText(sp) {
  if (sp.mode === 'rep') return `막대: 1을 10칸(한 칸 0.1)으로 나눈 막대 ${sp.k}개에 ${sp.a}칸씩 칠함 — 0.1이 ${sp.a * sp.k}개`;
  if (sp.mode === 'band') return `띠: ${sp.N}만큼의 띠(한 칸 0.1, ${sp.N * 10}칸)를 똑같이 10묶음으로 나눠 ${sp.a}묶음을 칠함 — ${sp.a * sp.N}칸`;
  return `넓이 그림: 1을 가로 10칸·세로 10칸(한 칸 0.01)으로 나눠 가로 ${sp.a}칸, 세로 ${sp.b}칸을 칠함 — 두 번 칠한 칸 ${sp.a * sp.b}개`;
}
/** 소수 곱셈 그림 */
export function dmulSvg(sp) {
  const W = 400; let g = ''; let H;
  const lab = (x, y, t, o = '') => `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" font-size="15" font-weight="700" text-anchor="middle" fill="currentColor"${o}>${t}</text>`;
  const cell = (x, y, w, h, fill, attrs) => `<rect class="dm-c" x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" fill="${fill}" stroke="currentColor" stroke-opacity="0.6" stroke-width="1" ${attrs}/>`;
  if (sp.mode === 'rep') {
    const X0 = 60; const BW = 320; const cw = BW / 10; const BH = 28; const gap = 14; const top = 8;
    for (let r = 0; r < sp.k; r++) {
      const y = top + r * (BH + gap);
      for (let i = 0; i < 10; i++) g += cell(X0 + i * cw, y, cw, BH, i < sp.a ? FILL : EMPTY, `data-r="${r}" data-on="${i < sp.a ? 1 : 0}"`);
      g += lab(X0 - 26, y + BH / 2 + 5, sp.A, ' class="dm-l"');
    }
    H = top + sp.k * (BH + gap);
  } else if (sp.mode === 'band') {
    const n = sp.N * 10; const X0 = 30; const BW = 340; const cw = BW / n; const BH = 34; const top = 34;
    for (let i = 0; i < n; i++) {
      const on = i < sp.a * sp.N;
      g += cell(X0 + i * cw, top, cw, BH, on ? FILL : EMPTY, `data-g="${Math.floor(i / sp.N)}" data-on="${on ? 1 : 0}"`);
    }
    // 10묶음의 경계는 굵게 (묶음 하나 = ${sp.N}칸) · 아래에 0, 1, 2 … 눈금 (10칸마다)
    for (let k = 0; k <= 10; k++) g += `<line class="dm-b" x1="${(X0 + k * sp.N * cw).toFixed(1)}" y1="${top - 4}" x2="${(X0 + k * sp.N * cw).toFixed(1)}" y2="${top + BH + 4}" stroke="currentColor" stroke-width="2.2"/>`;
    for (let k = 0; k <= sp.N; k++) g += lab(X0 + k * 10 * cw, top + BH + 22, String(k), ' class="dm-t"');
    const xe = X0 + sp.a * sp.N * cw;
    g += `<path d="M${X0} ${top - 6} L${X0} ${top - 14} L${xe.toFixed(1)} ${top - 14} L${xe.toFixed(1)} ${top - 6}" fill="none" stroke="currentColor" stroke-width="1.6"/>`;
    g += lab((X0 + xe) / 2, top - 20, `${sp.B}배`, ' class="dm-a"');
    H = top + BH + 30;
  } else {
    const S = 220; const X0 = 120; const top = 34; const c = S / 10;
    for (let y = 0; y < 10; y++) {
      for (let x = 0; x < 10; x++) {
        const inA = x < sp.a; const inB = y < sp.b; const on = inA && inB;
        g += cell(X0 + x * c, top + y * c, c, c, inA || inB ? FILL : EMPTY, `${(inA || inB) && !on ? 'fill-opacity="0.28" ' : ''}data-x="${x}" data-y="${y}" data-on="${on ? 1 : 0}"`);
      }
    }
    g += `<rect x="${X0}" y="${top}" width="${S}" height="${S}" fill="none" stroke="currentColor" stroke-width="2"/>`;
    g += `<path d="M${X0} ${top - 4} L${X0} ${top - 12} L${(X0 + sp.a * c).toFixed(1)} ${top - 12} L${(X0 + sp.a * c).toFixed(1)} ${top - 4}" fill="none" stroke="currentColor" stroke-width="1.6"/>`;
    g += lab(X0 + (sp.a * c) / 2, top - 16, sp.A, ' class="dm-a"');
    g += `<path d="M${X0 - 4} ${top} L${X0 - 12} ${top} L${X0 - 12} ${(top + sp.b * c).toFixed(1)} L${X0 - 4} ${(top + sp.b * c).toFixed(1)}" fill="none" stroke="currentColor" stroke-width="1.6"/>`;
    g += lab(X0 - 40, top + (sp.b * c) / 2 + 5, sp.B, ' class="dm-b"');
    H = top + S + 10;
  }
  const meta = sp.mode === 'rep' ? `data-a="${sp.a}" data-k="${sp.k}"` : sp.mode === 'band' ? `data-big="${sp.N}" data-a="${sp.a}"` : `data-a="${sp.a}" data-b="${sp.b}"`;
  // 보이는 크기는 1.25배 (곱셈 그림·뺄셈 막대와 같다)
  return `<svg class="frac-fig dmul-fig" data-mode="${sp.mode}" ${meta} viewBox="0 0 ${W} ${Math.round(H)}" width="${Math.round(W * 1.25)}" height="${Math.round(H * 1.25)}" role="img" aria-label="${dmulText(sp)}">${g}</svg>`;
}

// ───────────────────── ➗ X 소수의 나눗셈 — 나눗셈 그림 (2026-10-07) ─────────────────────
//
// 교과서(미래엔 6-1·6-2 「소수의 나눗셈」 — 6-2 지도서 191쪽 "그림에 0.3씩 선 긋기", 6-1 수 모형으로 똑같이 나누기)의 그림 두 가지 (배움 장·② 문항에서만):
//   `[ddiv fit 1.2 0.3]` — 띠: 길이 1.2인 띠에 0.3씩 선을 그어 도막을 센다(포함제) → 4도막. 다 못 채운 끝은 옅게 = 나누어 주고 남는 양.
//   `[ddiv share 2.4 2]` — 똑같이 나누기: 0.1 칸 24개를 2묶음으로 → 한 묶음에 12칸 = 1.2 (등분제). 묶음마다 한 줄.
// "나머지"라는 말은 쓰지 않는다 (6-2 지도서 181쪽 — "나누어 주고 남는 양").
// 테스트가 다시 셀 수 있게 도막마다 class="dd-p"(data-i) · 남는 끝 class="dd-r" · 칸마다 class="dd-c"(data-g 묶음 번호).

/** `fit 1.2 0.3` · `share 2.4 2` → 그림 자료 (못 읽거나 그릴 수 없으면 null) */
export function parseDdiv(arg) {
  const p = String(arg || '').trim().split(/\s+/);
  if (p.length !== 3) return null;
  const dec = (t) => { const m = /^(\d+)(?:\.(\d{1,2}))?$/.exec(t); return m ? { u: Number(m[1] + (m[2] || '')), p: (m[2] || '').length } : null; };
  if (p[0] === 'fit') {
    const a = dec(p[1]); const b = dec(p[2]);
    if (!a || !b || !a.u || !b.u) return null;
    const P = Math.max(a.p, b.p); const A = a.u * 10 ** (P - a.p); const B = b.u * 10 ** (P - b.p); // 같은 단위의 정수
    const k = Math.floor(A / B); const rem = A - k * B;
    if (k < 1 || k > 12) return null;
    return { mode: 'fit', A: p[1], B: p[2], a: A, b: B, k, rem, P };
  }
  if (p[0] === 'share') {
    const a = dec(p[1]); const n = /^\d+$/.test(p[2]) ? +p[2] : 0;
    if (!a || a.p > 1 || n < 2 || n > 5) return null;
    const t = a.u * 10 ** (1 - a.p); // 0.1 칸 수
    if (t > 40 || t % n || t / n < 1 || t / n > 15) return null;
    return { mode: 'share', A: p[1], n, t, q: t / n };
  }
  return null;
}
/** 0.1·0.01 단위 정수 → 글자 (끝자리 0은 지운다) */
const ddivNum = (u, P) => { let x = u; let q = P; while (q > 0 && x % 10 === 0) { x /= 10; q -= 1; } if (!q) return String(x); const s = String(x).padStart(q + 1, '0'); return `${s.slice(0, -q)}.${s.slice(-q)}`; };
/** 📊·❓ 글용 */
export function ddivText(sp) {
  if (sp.mode === 'fit') return `띠: 길이 ${sp.A}에서 ${sp.B}씩 ${sp.k}도막${sp.rem ? ` — 남는 길이 ${ddivNum(sp.rem, sp.P)}` : ''}`;
  return `똑같이 나누기: 0.1 칸 ${sp.t}개를 ${sp.n}묶음으로 — 한 묶음에 ${sp.q}칸`;
}
/** 나눗셈 그림 */
export function ddivSvg(sp) {
  const W = 400; let g = ''; let H;
  const lab = (x, y, t, o = '') => `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" font-size="14" font-weight="700" text-anchor="middle" fill="currentColor"${o}>${t}</text>`;
  if (sp.mode === 'fit') {
    const X0 = 20; const L = 360; const s = L / sp.a; const top = 34; const BH = 34;
    for (let i = 0; i < sp.k; i++) {
      g += `<rect class="dd-p" x="${(X0 + i * sp.b * s).toFixed(1)}" y="${top}" width="${(sp.b * s).toFixed(1)}" height="${BH}" fill="${FILL}"${i % 2 ? ' fill-opacity="0.55"' : ''} stroke="currentColor" stroke-width="1.6" data-i="${i}"/>`;
    }
    if (sp.rem) g += `<rect class="dd-r" x="${(X0 + sp.k * sp.b * s).toFixed(1)}" y="${top}" width="${(sp.rem * s).toFixed(1)}" height="${BH}" fill="${EMPTY}" stroke="currentColor" stroke-width="1.6" stroke-dasharray="4 3" data-rem="${ddivNum(sp.rem, sp.P)}"/>`;
    g += `<rect x="${X0}" y="${top}" width="${L}" height="${BH}" fill="none" stroke="currentColor" stroke-width="2"/>`;
    // 눈금 — 0, B, 2B, … (도막이 많으면 0·B·끝 도막만) · 남는 끝이 있으면 전체 길이도
    // 남는 끝이 좁으면(6.4 ÷ 2.1의 0.1) 그 앞 눈금(6.3)을 빼야 끝 글자(6.4)와 안 겹친다 (갤러리 눈 확인이 잡음)
    const marks = sp.k <= 6 ? Array.from({ length: sp.k + 1 }, (_, i) => i) : [0, 1, sp.k];
    for (const i of marks) {
      const x = X0 + i * sp.b * s;
      if (sp.rem && i === sp.k && X0 + L - x < 36) continue;
      g += lab(x, top + BH + 20, ddivNum(i * sp.b, sp.P), ' class="dd-t"');
    }
    if (sp.rem) {
      g += lab(X0 + L, top + BH + 20, sp.A, ' class="dd-t"');
      g += `<text class="dd-rl" x="${X0 + L}" y="${top - 19}" font-size="13" font-weight="700" text-anchor="end" fill="currentColor">남는 길이 ${ddivNum(sp.rem, sp.P)}</text>`;
    }
    // 첫 도막 위에 한 도막의 길이
    const xb = X0 + sp.b * s;
    g += `<path d="M${X0} ${top - 6} L${X0} ${top - 14} L${xb.toFixed(1)} ${top - 14} L${xb.toFixed(1)} ${top - 6}" fill="none" stroke="currentColor" stroke-width="1.6"/>`;
    g += lab((X0 + xb) / 2, top - 19, sp.B, ' class="dd-b"');
    H = top + BH + 30;
  } else {
    const X0 = 70; const cw = Math.min(22, 300 / sp.q); const BH = 26; const gap = 10; const top = 6;
    for (let r = 0; r < sp.n; r++) {
      const y = top + r * (BH + gap);
      for (let i = 0; i < sp.q; i++) g += `<rect class="dd-c" x="${(X0 + i * cw).toFixed(1)}" y="${y}" width="${cw.toFixed(1)}" height="${BH}" fill="${FILL}"${r % 2 ? ' fill-opacity="0.55"' : ''} stroke="currentColor" stroke-opacity="0.6" stroke-width="1" data-g="${r}"/>`;
      g += lab(X0 - 34, y + BH / 2 + 5, `${r + 1}묶음`, ' class="dd-l"');
    }
    H = top + sp.n * (BH + gap);
    // 한 칸의 크기를 화면 글자로 — 칸 수만 세면 0.1 칸 3개를 "3"으로 읽어 틀린 셈(1.2 ÷ 4 = 3)을 편드는 그림이 된다 (Codex 39차 #4)
    g += `<text class="dd-u" x="${X0}" y="${H + 10}" font-size="13" font-weight="700" fill="currentColor">한 칸 = 0.1</text>`;
    H += 20;
  }
  const meta = sp.mode === 'fit' ? `data-k="${sp.k}"` : `data-n="${sp.n}" data-q="${sp.q}"`;
  return `<svg class="frac-fig ddiv-fig" data-mode="${sp.mode}" ${meta} viewBox="0 0 ${W} ${Math.round(H)}" width="${Math.round(W * 1.25)}" height="${Math.round(H * 1.25)}" role="img" aria-label="${ddivText(sp)}">${g}</svg>`;
}

// ───────────────────── 🔢 Y 큰 수 — 자릿값 표 (2026-10-08) ─────────────────────
//
// `[place 352900000000]` — 일의 자리부터 네 자리씩 묶은 자릿값 표. 맨 위 줄은 묶음 이름(조·억·만·일), 가운데 줄은 천·백·십·일, 맨 아래 줄은 숫자.
//   수는 숫자만 1~16자리(맨 앞이 0이 아니게). 수가 채우지 않는 맨 앞 묶음의 윗자리 칸은 비운다. 묶음 사이는 굵은 선.
//   교과서처럼 쉼표 없이 쓰고, 네 자리씩 끊어 읽는 법을 보이려는 그림 — 배움 장·② 일부에만 (① 계산에는 답을 흘려서 안 쓴다)
const PLACE_GROUP = ['일', '만', '억', '조'];
const PLACE_SUB = ['천', '백', '십', '일'];
export function parsePlace(arg) {
  const s = String(arg || '').trim();
  if (!/^[1-9]\d{0,15}$/.test(s)) return null;
  const G = Math.ceil(s.length / 4);
  return { n: s, G, cells: s.padStart(G * 4, ' ').split('') };
}
/** 📊·❓ 글용 — "자릿값 표: 3529억 | 0000만 | 0000" */
export function placeText(sp) {
  const parts = [];
  for (let i = 0; i < sp.G; i++) {
    const grp = sp.cells.slice(i * 4, i * 4 + 4).join('').trim();
    const name = PLACE_GROUP[sp.G - 1 - i];
    parts.push(name === '일' ? grp : `${grp}${name}`);
  }
  return `자릿값 표: ${parts.join(' | ')}`;
}
/** 자릿값 표 */
export function placeSvg(sp) {
  // 묶음이 셋 이상(12·16칸)이면 폭을 거의 다 쓰고 글자를 키운다 — 16칸에 글자 12였을 때 폰(318px로 줄어듦)에서 9.5px였다 (Codex 40차 #6)
  const W = 400; const cols = sp.G * 4; const wide = sp.G >= 3; const cw = Math.min(26, (wide ? 392 : 360) / cols); const X0 = (W - cols * cw) / 2;
  const rh = wide ? 27 : 24; const top = 4; let g = '';
  const fs = wide ? 15 : cw < 24 ? 12 : 13;
  const dy = wide ? 5.5 : 5; const dys = wide ? 5 : 4;
  const txt = (x, y, t, cls, o = '') => `<text class="${cls}" x="${x.toFixed(1)}" y="${y.toFixed(1)}" font-size="${fs}" font-weight="700" text-anchor="middle" fill="currentColor"${o}>${t}</text>`;
  for (let i = 0; i < sp.G; i++) {
    const x = X0 + i * 4 * cw; const name = PLACE_GROUP[sp.G - 1 - i];
    g += `<rect class="pl-g" x="${x.toFixed(1)}" y="${top}" width="${(4 * cw).toFixed(1)}" height="${rh}" fill="${EMPTY}" stroke="currentColor" stroke-width="1.6" data-name="${name}"/>`;
    g += txt(x + 2 * cw, top + rh / 2 + dy, name, 'pl-gl');
  }
  for (let c = 0; c < cols; c++) {
    const x = X0 + c * cw; const place = cols - 1 - c; const d = sp.cells[c].trim();
    g += `<rect x="${x.toFixed(1)}" y="${top + rh}" width="${cw.toFixed(1)}" height="${rh}" fill="none" stroke="currentColor" stroke-opacity="0.6" stroke-width="1"/>`;
    g += txt(x + cw / 2, top + rh * 1.5 + dys, PLACE_SUB[c % 4], 'pl-s', ' fill-opacity="0.7"');
    g += `<rect class="pl-d" x="${x.toFixed(1)}" y="${top + 2 * rh}" width="${cw.toFixed(1)}" height="${rh}" fill="${d ? FILL : 'none'}" fill-opacity="${d ? '0.18' : '0'}" stroke="currentColor" stroke-opacity="0.6" stroke-width="1" data-place="${place}" data-v="${d}"/>`;
    if (d) g += txt(x + cw / 2, top + rh * 2.5 + dy, d, 'pl-dt');
  }
  for (let i = 1; i < sp.G; i++) { const x = X0 + i * 4 * cw; g += `<line x1="${x.toFixed(1)}" y1="${top}" x2="${x.toFixed(1)}" y2="${top + 3 * rh}" stroke="currentColor" stroke-width="2.6"/>`; }
  g += `<rect x="${X0.toFixed(1)}" y="${top}" width="${(cols * cw).toFixed(1)}" height="${3 * rh}" fill="none" stroke="currentColor" stroke-width="2"/>`;
  const H = top + 3 * rh + 4;
  return `<svg class="frac-fig place-fig" data-n="${sp.n}" viewBox="0 0 ${W} ${H}" width="${Math.round(W * 1.25)}" height="${Math.round(H * 1.25)}" role="img" aria-label="${placeText(sp)}">${g}</svg>`;
}

// ───────────────────── 📈 R 좌표평면과 그래프 — 좌표평면 (2026-10-05) ─────────────────────
//
// `[plane A(2,−3) B(−1,4)]` — 좌표평면(모눈·x축·y축·원점 O·눈금 수). 기본 범위 x·y −5~5.
//   점: 이름 A~D·P·Q `A(2,−3)` · 고르기 후보 ㉠~㉣ `㉠(2,−3)`(흰 동그라미) · 이름 없는 점 `(2,−3)`
//   `x=−6..6 y=−4..4` 범위(원점이 보이게 0을 품는다) · `xs=5 ys=2` 한 칸의 크기(눈금 수 = 칸 수 × 크기, 좌표는 그 배수)
//   `lin=2` `lin=−1/2` 정비례 y = ax 직선 · `inv=6` `inv=−8` 반비례 y = a/x 곡선 · `poly=ABC` 이름 붙은 점을 이은 도형
//   `path=0:0,10:3,20:3` 꺾은선(그래프 해석 — 가로가 늘어나는 순서) · `xl=시간(분) yl=거리(km)` 축 이름(띄어쓰기는 _)
// 선·곡선에는 식을 적지 않는다("그래프가 나타내는 식은?"의 답이 그림에 보이면 안 된다). 점 이름표에도 좌표를 적지 않는다.
// ★ 테스트가 그린 SVG에서 다시 잰다 — 점 pl-pt(data-name·data-x·data-y)·후보 pl-cand(data-k)·눈금 수 pl-tick(data-axis·data-v)·
//   직선 pl-lin·곡선 pl-inv·꺾은선 pl-path·도형 pl-poly. 눈금 수 두 개로 자를 세워 점이 정말 그 좌표에 있는지 본다.
// ★ 글자(지시문)는 U+2212 빼기로 쓴다 — 문제 글에 ASCII 빼기가 섞이지 않게. 읽을 때 '-'로 바꾼다.

const PL_PT = /^([A-DPQ]|[㉠-㉣])?\((-?\d+),(-?\d+)\)$/;
const PL_CAND = /^[㉠-㉣]$/;

/** `A(2,−3) x=−6..6 lin=2 …` → 좌표평면 자료 (못 읽거나 그릴 수 없으면 null) */
export function parsePlane(arg) {
  const s = String(arg || '').replace(/−/g, '-').trim();
  if (!s) return null;
  const sp = { x0: -5, x1: 5, y0: -5, y1: 5, xs: 1, ys: 1, pts: [], cands: [], lin: [], inv: [], poly: '', path: null, xl: '', yl: '' };
  for (const t of s.split(/\s+/)) {
    let m;
    if ((m = PL_PT.exec(t))) { const p = { name: m[1] || '', x: +m[2], y: +m[3] }; (PL_CAND.test(p.name) ? sp.cands : sp.pts).push(PL_CAND.test(p.name) ? { k: p.name, x: p.x, y: p.y } : p); continue; }
    if ((m = /^([xy])=(-?\d+)\.\.(-?\d+)$/.exec(t))) { sp[`${m[1]}0`] = +m[2]; sp[`${m[1]}1`] = +m[3]; continue; }
    if ((m = /^([xy])s=(\d+)$/.exec(t))) { sp[`${m[1]}s`] = +m[2]; continue; }
    if ((m = /^lin=(-?\d+)(?:\/(\d+))?$/.exec(t))) { sp.lin.push({ n: +m[1], d: m[2] ? +m[2] : 1 }); continue; }
    if ((m = /^inv=(-?\d+)$/.exec(t))) { sp.inv.push(+m[1]); continue; }
    if ((m = /^poly=([A-DPQ]{3,4})$/.exec(t))) { sp.poly = m[1]; continue; }
    if ((m = /^path=((?:-?\d+:-?\d+)(?:,-?\d+:-?\d+)+)$/.exec(t))) { sp.path = m[1].split(',').map((q) => q.split(':').map(Number)); continue; }
    if ((m = /^([xy])l=(\S{1,12})$/.exec(t))) { sp[`${m[1]}l`] = m[2].replace(/_/g, ' '); continue; }
    if (t === 'smooth') { sp.smooth = true; continue; }
    return null; // 모르는 토큰 — 글자 그대로 남는 것보다 빈 그림이 낫다 (renderFigures가 지시문을 그대로 둔다)
  }
  const { x0, x1, y0, y1, xs, ys } = sp;
  const okAxis = (a0, a1, st) => st >= 1 && a0 <= 0 && a1 >= 0 && a1 > a0 && a0 % st === 0 && a1 % st === 0 && (a1 - a0) / st <= 16;
  if (!okAxis(x0, x1, xs) || !okAxis(y0, y1, ys)) return null;
  const inBox = (p) => p.x >= x0 && p.x <= x1 && p.y >= y0 && p.y <= y1 && p.x % xs === 0 && p.y % ys === 0;
  if (![...sp.pts, ...sp.cands].every(inBox)) return null;
  const names = sp.pts.filter((p) => p.name).map((p) => p.name);
  if (new Set(names).size !== names.length || new Set(sp.cands.map((c) => c.k)).size !== sp.cands.length) return null;
  if (sp.lin.some((l) => !l.n || l.d < 1) || sp.inv.some((a) => !a)) return null;
  if (sp.poly && ![...sp.poly].every((ch) => names.includes(ch))) return null;
  if (sp.path && (!sp.path.every(([x, y]) => inBox({ x, y })) || sp.path.some(([x], i) => i && x <= sp.path[i - 1][0]))) return null;
  if (sp.smooth && !sp.path) return null;
  return sp;
}

/**
 * `smooth` 꺾은선 → 부드러운 선의 점들 (Codex 33차 #4, 관람차): 이웃한 두 점 사이를 코사인 곡선 y0 + (y1 − y0)(1 − cos πt)/2로 —
 * 두 점에서 기울기가 0이라 바닥·꼭대기를 번갈아 지나면 사인 곡선(관람차 높이)이 되고, 지시문의 점은 모두 그대로 지난다.
 */
export function planeWave(path, steps = 16) {
  const out = [path[0].slice()];
  for (let i = 1; i < path.length; i++) {
    const [x0, y0] = path[i - 1]; const [x1, y1] = path[i];
    for (let k = 1; k <= steps; k++) { const t = k / steps; out.push([x0 + (x1 - x0) * t, y0 + ((y1 - y0) * (1 - Math.cos(Math.PI * t))) / 2]); }
  }
  return out;
}

const plNum = (v) => (v < 0 ? `−${Math.abs(v)}` : String(v));
const plAx = (l) => (l.d === 1 ? (l.n === 1 ? 'x' : l.n === -1 ? '−x' : `${plNum(l.n)}x`) : `${l.n < 0 ? '−' : ''}${Math.abs(l.n) === 1 ? '' : Math.abs(l.n)}x/${l.d}`);

/** 📊·❓ 글용 — 그림에 보이는 것 그대로 (점 좌표는 아빠가 읽는 글이라 적는다) */
export function planeText(sp) {
  const parts = [];
  if (sp.xl || sp.yl) parts.push(`가로 ${sp.xl || 'x'} · 세로 ${sp.yl || 'y'}`);
  for (const p of sp.pts) parts.push(`${p.name ? `점 ${p.name}` : '점 '}(${plNum(p.x)}, ${plNum(p.y)})`);
  for (const c of sp.cands) parts.push(`${c.k}(${plNum(c.x)}, ${plNum(c.y)})`);
  for (const l of sp.lin) parts.push(`직선 y = ${plAx(l)}`);
  for (const a of sp.inv) parts.push(`곡선 y = ${plNum(a)}/x`);
  if (sp.poly) parts.push(`도형 ${sp.poly}`);
  if (sp.path) parts.push(`${sp.smooth ? '부드러운 선' : '꺾은선'} ${sp.path.map(([x, y]) => `(${plNum(x)}, ${plNum(y)})`).join(' → ')}`);
  return `좌표평면: ${parts.join(' · ') || '빈 좌표평면'}`;
}

/** 좌표평면의 자 — 그림(planeSvg)과 ✍️ 점 찍기 판(3단계)이 같이 쓴다 (아이가 본 그림과 만지는 그림이 같은 자) */
export function planeGeom(sp) {
  const cx = (sp.x1 - sp.x0) / sp.xs; const cy = (sp.y1 - sp.y0) / sp.ys;
  const C = Math.min(32, Math.floor(320 / Math.max(cx, cy, 1)));
  const every = (n) => (n > 10 ? 2 : 1); // 눈금 수는 칸이 많으면 두 칸마다
  const yLab = []; for (let k = 0; k <= cy; k += every(cy)) { const v = sp.y0 + k * sp.ys; if (v) yLab.push(plNum(v)); }
  const labW = Math.max(12, ...yLab.map((t) => t.length * 7.4));
  const padL = sp.x0 === 0 ? 12 + labW + 6 : 16;
  const padT = 28; const padR = 30; const padB = (sp.y0 === 0 ? 26 : 12) + (sp.xl && sp.y0 === 0 ? 18 : 0);
  const X = (v) => padL + ((v - sp.x0) / sp.xs) * C;
  const Y = (v) => padT + ((sp.y1 - v) / sp.ys) * C;
  const W = Math.round(padL + cx * C + padR); const H = Math.round(padT + cy * C + padB);
  /** 그림 좌표(px) → 가장 가까운 격자점 (그림 안) */
  const gridAt = (px, py) => ({
    x: Math.min(sp.x1, Math.max(sp.x0, Math.round((px - padL) / C) * sp.xs + sp.x0)),
    y: Math.min(sp.y1, Math.max(sp.y0, sp.y1 - Math.round((py - padT) / C) * sp.ys)),
  });
  return { C, cx, cy, X, Y, W, H, padL, padT, every, gridAt };
}

/** 좌표평면 그림 */
export function planeSvg(sp) {
  const G = planeGeom(sp); const { X, Y, W, H, C } = G;
  const f = (v) => v.toFixed(1);
  const ox = X(0); const oy = Y(0);
  let g = '';
  // 모눈
  for (let k = 0; k <= G.cx; k++) { const x = X(sp.x0 + k * sp.xs); g += `<line x1="${f(x)}" y1="${f(Y(sp.y1))}" x2="${f(x)}" y2="${f(Y(sp.y0))}" stroke="currentColor" stroke-opacity="0.14" stroke-width="1"/>`; }
  for (let k = 0; k <= G.cy; k++) { const y = Y(sp.y0 + k * sp.ys); g += `<line x1="${f(X(sp.x0))}" y1="${f(y)}" x2="${f(X(sp.x1))}" y2="${f(y)}" stroke="currentColor" stroke-opacity="0.14" stroke-width="1"/>`; }
  const segs = []; // 이름표가 걸치면 안 되는 선
  // 좌표축 (화살표·x·y·O)
  const ax = [[X(sp.x0) - (sp.x0 ? 6 : 0), oy], [X(sp.x1) + 14, oy]]; const ay = [[ox, Y(sp.y0) + (sp.y0 ? 6 : 0)], [ox, Y(sp.y1) - 14]];
  g += `<line class="pl-axis" data-axis="x" x1="${f(ax[0][0])}" y1="${f(oy)}" x2="${f(ax[1][0])}" y2="${f(oy)}" stroke="currentColor" stroke-width="1.6"/>`;
  g += `<path d="M${f(ax[1][0] + 1)} ${f(oy)} l-8 -4.5 l0 9 Z" fill="currentColor"/>`;
  g += `<line class="pl-axis" data-axis="y" x1="${f(ox)}" y1="${f(ay[0][1])}" x2="${f(ox)}" y2="${f(ay[1][1])}" stroke="currentColor" stroke-width="1.6"/>`;
  g += `<path d="M${f(ox)} ${f(ay[1][1] - 1)} l-4.5 8 l9 0 Z" fill="currentColor"/>`;
  segs.push(ax, ay);
  const SERIF = 'font-family="Times New Roman, Noto Serif, serif" font-style="italic"';
  g += `<text x="${f(ax[1][0] + 5)}" y="${f(oy + 5)}" font-size="17" ${SERIF} fill="currentColor">x</text>`;
  g += `<text x="${f(ox + 9)}" y="${f(ay[1][1] + 6)}" font-size="17" ${SERIF} fill="currentColor">y</text>`;
  const placed = [];
  const boxOf = (x, y, t, fs, anchor = 'middle') => { const w = (labelW(t) * fs) / 15; const x0 = anchor === 'end' ? x - w : anchor === 'start' ? x : x - w / 2; return { x0, x1: x0 + w, y0: y - fs * 0.78, y1: y + fs * 0.22 }; };
  // 축 글자 x·y도 자리를 차지한다 — y축 맨 위의 점 P(0, 10) 이름표가 "y"와 겹쳤다 (Codex 33차 #5)
  placed.push(boxOf(ax[1][0] + 5, oy + 5, 'x', 17, 'start'), boxOf(ox + 9, ay[1][1] + 6, 'y', 17, 'start'));
  // 눈금 수 — 0은 O가 대신한다
  let ticks = '';
  for (let k = 0; k <= G.cx; k += G.every(G.cx)) {
    const v = sp.x0 + k * sp.xs; if (!v) continue;
    const t = plNum(v); const x = X(v); const y = oy + 15;
    ticks += `<text class="pl-tick" data-axis="x" data-v="${v}" x="${f(x)}" y="${f(y)}" font-size="12" text-anchor="middle" fill="currentColor" fill-opacity="0.85" stroke="var(--card, #fff)" stroke-width="3.5" stroke-linejoin="round" paint-order="stroke">${t}</text>`;
    placed.push(boxOf(x, y, t, 12));
  }
  for (let k = 0; k <= G.cy; k += G.every(G.cy)) {
    const v = sp.y0 + k * sp.ys; if (!v) continue;
    const t = plNum(v); const x = ox - 5; const y = Y(v) + 4;
    ticks += `<text class="pl-tick" data-axis="y" data-v="${v}" x="${f(x)}" y="${f(y)}" font-size="12" text-anchor="end" fill="currentColor" fill-opacity="0.85" stroke="var(--card, #fff)" stroke-width="3.5" stroke-linejoin="round" paint-order="stroke">${t}</text>`;
    placed.push(boxOf(x, y, t, 12, 'end'));
  }
  if (sp.xl) { const x = X(sp.x1); const y = sp.y0 === 0 ? oy + 33 : oy - 8; g += `<text class="pl-xl" x="${f(x)}" y="${f(y)}" font-size="13" font-weight="700" text-anchor="end" fill="currentColor">${esc(sp.xl)}</text>`; placed.push(boxOf(x, y, sp.xl, 13, 'end')); }
  if (sp.yl) { const x = ox + 24; const y = ay[1][1] + 6; g += `<text class="pl-yl" x="${f(x)}" y="${f(y)}" font-size="13" font-weight="700" text-anchor="start" fill="currentColor">${esc(sp.yl)}</text>`; placed.push(boxOf(x, y, sp.yl, 13, 'start')); }
  // 도형 · 직선 · 곡선 · 꺾은선
  const byName = Object.fromEntries(sp.pts.filter((p) => p.name).map((p) => [p.name, p]));
  if (sp.poly) {
    const vs = [...sp.poly].map((ch) => byName[ch]);
    g += `<polygon class="pl-poly" points="${vs.map((p) => `${f(X(p.x))},${f(Y(p.y))}`).join(' ')}" fill="${FILL}" fill-opacity="0.16" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>`;
    vs.forEach((p, i) => { const q = vs[(i + 1) % vs.length]; segs.push([[X(p.x), Y(p.y)], [X(q.x), Y(q.y)]]); });
  }
  for (const l of sp.lin) {
    const a = l.n / l.d;
    // x 범위를 y 범위로 자른다
    const lo = Math.max(sp.x0, Math.min(sp.y0 / a, sp.y1 / a)); const hi = Math.min(sp.x1, Math.max(sp.y0 / a, sp.y1 / a));
    const p = [[X(lo), Y(a * lo)], [X(hi), Y(a * hi)]];
    g += `<line class="pl-lin" data-a="${l.n}/${l.d}" x1="${f(p[0][0])}" y1="${f(p[0][1])}" x2="${f(p[1][0])}" y2="${f(p[1][1])}" stroke="${FILL2}" stroke-width="2.6" stroke-linecap="round"/>`;
    segs.push(p);
  }
  for (const a of sp.inv) {
    for (const side of [1, -1]) { // x > 0 쪽, x < 0 쪽
      const ySign = Math.sign(a) * side; const bound = ySign > 0 ? sp.y1 : -sp.y0; const xEnd = side > 0 ? sp.x1 : -sp.x0;
      if (bound <= 0 || xEnd <= 0) continue;
      const xs0 = Math.abs(a) / bound; if (xs0 >= xEnd) continue;
      const pts = [];
      for (let k = 0; k <= 48; k++) { const ax2 = xs0 * Math.pow(xEnd / xs0, k / 48); const x = side * ax2; pts.push([X(x), Y(a / x)]); }
      g += `<polyline class="pl-inv" data-a="${a}" points="${pts.map(([px, py]) => `${f(px)},${f(py)}`).join(' ')}" fill="none" stroke="${FILL2}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>`;
      for (let i = 1; i < pts.length; i++) segs.push([pts[i - 1], pts[i]]);
    }
  }
  if (sp.path) {
    const pts = sp.path.map(([x, y]) => [X(x), Y(y)]);
    // smooth(관람차)는 같은 점들을 지나는 부드러운 선 pl-wave — 꼭짓점에서 꺾이면 꼭대기에서 갑자기 방향을 바꾸는 것처럼 보인다 (Codex 33차 #4)
    const line = sp.smooth ? planeWave(sp.path).map(([x, y]) => [X(x), Y(y)]) : pts;
    g += `<polyline class="${sp.smooth ? 'pl-wave' : 'pl-path'}" points="${line.map(([px, py]) => `${f(px)},${f(py)}`).join(' ')}" fill="none" stroke="${FILL}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`;
    for (const [px, py] of pts) g += `<circle class="pl-vtx" cx="${f(px)}" cy="${f(py)}" r="3" fill="${FILL}"/>`;
    for (let i = 1; i < line.length; i++) segs.push([line[i - 1], line[i]]);
  }
  // 눈금 수는 도형·직선·곡선·꺾은선 **위에** — 바탕색 테두리가 지나가는 선을 가린다 (먼저 그리면 선이 "−1"·"2"를 가로질렀다, 갤러리 눈 확인)
  g += ticks;
  // 원점 O — 왼쪽 아래가 보통이지만 원점을 지나는 직선·도형 변이 지나가면 오른쪽 아래·왼쪽 위로 (q1 그래프는 늘 왼쪽 아래 — 그림 밖 여백)
  {
    const spots = [[-1, 1], [1, 1], [-1, -1]].map(([u, v]) => ({ x0: u < 0 ? ox - 15 : ox + 4, x1: u < 0 ? ox - 4 : ox + 15, y0: v > 0 ? oy + 4 : oy - 17, y1: v > 0 ? oy + 17 : oy - 4, u, v }));
    const free = (B) => !segs.slice(2).some((sg) => segHitsBox(sg, B)) && !placed.some((q) => B.x0 < q.x1 && q.x0 < B.x1 && B.y0 < q.y1 && q.y0 < B.y1);
    const o = spots.find(free) || spots[0];
    g += `<text class="pl-origin" x="${f((o.x0 + o.x1) / 2)}" y="${f(o.y1 - 2)}" font-size="13" text-anchor="middle" fill="currentColor" font-style="italic"${' stroke="var(--card, #fff)" stroke-width="3.5" stroke-linejoin="round" paint-order="stroke"'}>O</text>`;
    placed.push(o);
  }
  // 점 · 후보
  const dots = [];
  for (const p of sp.pts) { dots.push([X(p.x), Y(p.y)]); g += `<circle class="pl-pt" data-name="${p.name}" data-x="${p.x}" data-y="${p.y}" cx="${f(X(p.x))}" cy="${f(Y(p.y))}" r="4.5" fill="currentColor"/>`; }
  for (const c of sp.cands) { dots.push([X(c.x), Y(c.y)]); g += `<circle class="pl-cand" data-k="${c.k}" data-x="${c.x}" data-y="${c.y}" cx="${f(X(c.x))}" cy="${f(Y(c.y))}" r="6.5" fill="#fff" stroke="${FILL}" stroke-width="2.6"/>`; }
  // 이름표 — 원점에서 먼 쪽부터 여덟 방향·세 거리로 시험해 그림 안·눈금 수·남의 이름표·선·점과 안 겹치는 첫 자리
  const clear = (B, self) => B.x0 >= 1 && B.y0 >= 1 && B.x1 <= W - 1 && B.y1 <= H - 1
    && !placed.some((q) => B.x0 < q.x1 && q.x0 < B.x1 && B.y0 < q.y1 && q.y0 < B.y1)
    && !segs.some((sg) => segHitsBox(sg, B))
    && !dots.some(([dx, dy]) => (dx !== self[0] || dy !== self[1]) && dx > B.x0 - 5 && dx < B.x1 + 5 && dy > B.y0 - 5 && dy < B.y1 + 5)
    && !(self[0] > B.x0 - 4 && self[0] < B.x1 + 4 && self[1] > B.y0 - 4 && self[1] < B.y1 + 4)
    // 제 점이 가장 가까워야 — 이웃 후보에 더 가까우면 그 점의 이름으로 읽힌다 (메모 37번)
    && (() => { const mx = (B.x0 + B.x1) / 2; const my = (B.y0 + B.y1) / 2; const own = Math.hypot(self[0] - mx, self[1] - my); return dots.every(([dx, dy]) => (dx === self[0] && dy === self[1]) || Math.hypot(dx - mx, dy - my) > own + 3); })();
  let labels = '';
  const put = (x, y, t, fs, cls) => {
    const out = [Math.sign(x - ox) || 1, Math.sign(y - oy) || -1];
    const dirs = [out, [out[0], -out[1]], [-out[0], out[1]], [-out[0], -out[1]], [1, 0], [-1, 0], [0, -1], [0, 1]];
    let at = null;
    for (const d of [13, 18, 24]) {
      for (const [u, v] of dirs) {
        const lx = x + u * (d + (labelW(t) * fs) / 32 * Math.abs(u)); const ly = y + v * d + fs * 0.32;
        if (clear(boxOf(lx, ly, t, fs), [x, y])) { at = [lx, ly]; break; }
      }
      if (at) break;
    }
    if (!at) at = [x + out[0] * 14, y + out[1] * 14 + fs * 0.32];
    placed.push(boxOf(at[0], at[1], t, fs));
    labels += `<text class="${cls}" x="${f(at[0])}" y="${f(at[1])}" font-size="${fs}" text-anchor="middle" fill="currentColor" font-weight="700">${esc(t)}</text>`;
  };
  for (const p of sp.pts) if (p.name) put(X(p.x), Y(p.y), p.name, 17, 'pl-name');
  for (const c of sp.cands) put(X(c.x), Y(c.y), c.k, 17, 'pl-cand-name');
  // 보이는 크기는 1.2배 — 눈금 수 12px가 태블릿에서 본문보다 작다 (Q 저울과 같은 까닭). 폰에서는 max-width:100%로 줄어든다
  return `<svg class="frac-fig plane-fig" viewBox="0 0 ${W} ${H}" width="${Math.round(W * 1.2)}" height="${Math.round(H * 1.2)}" data-c="${C}" role="img" aria-label="${esc(planeText(sp))}">${g}${labels}</svg>`;
}

// ───────────────────── 🧊 S 공간과 입체 — 쌓기나무 (2026-10-06) ─────────────────────
//
// 모든 그림은 높이 표 하나에서 — `2 1 0 / 1 3 1`은 위에서 본 모양에 수를 쓴 것과 같다 (첫 줄이 뒤, 마지막 줄이 앞, 칸은 왼쪽부터).
//   `[stack 2 1 0 / 1 3 1]` 쌓은 모양 — O 직육면체 겨냥도처럼 앞면은 반듯하게, 안쪽은 오른쪽 위 45°로 반만큼. 앞쪽에 "앞" 화살표 (`free`면 화살표 없음)
//   `[stacks ㉠=2,1/0,1 ㉡=… free]` 쌓은 모양 후보 — 칸은 쉼표, 줄은 /, 크기를 같게 맞춰 두 줄로
//   `[views ㉠=2,3,1 ㉡=11/01 …]` 본 모양 — 쉼표 목록은 앞·옆에서 본 모양(왼쪽부터 기둥 높이), 0·1 줄과 /는 위에서 본 모양. 이름은 ㉠~㉣ 또는 위·앞·옆
//   `[top 2 1 0 / 1 3 1]` 위에서 본 모양에 수를 쓴 그림 · `[layers 2 1 0 / 1 3 1]` 층별로 나타낸 모양(1층·2층·3층)
// 쌓기나무는 꽉 찬 덩어리 — 맞닿은 면은 그리지 않고, 뒤에서 앞으로·아래에서 위로·왼쪽에서 오른쪽으로 칠해 앞의 것이 뒤를 가린다.
// ★ 테스트는 그린 SVG의 면(sk-f: data-c="i,j,k" data-f)을 그 순서대로 다시 칠해 보이는 쌓기나무·보이는 윗면을 따로 센다.

// 안쪽 한 칸 = 오른쪽으로 0.6, 위로 0.42 — O 직육면체 겨냥도(45°, 반만큼)보다 깊게: 그만큼이면 뒤 줄 윗면이 가는 띠로만 보여 셀 수 없었다 (갤러리 눈 확인)
const SK_DX = 0.6; const SK_DY = 0.42;
const SK_MAX = 4;

/** "2 1 0 / 1 3 1" 또는 "2,1,0/1,3,1" → g[j][i] (j = 0이 앞 줄, i = 0이 왼쪽). 말이 안 되면 null */
export function parseStack(arg) {
  const rows = String(arg || '').trim().split('/').map((r) => r.trim().split(/[\s,]+/).filter(Boolean));
  if (!rows.length || rows.some((r) => !r.length || r.some((t) => !/^\d$/.test(t)))) return null;
  const W = rows[0].length;
  if (rows.some((r) => r.length !== W) || W > SK_MAX || rows.length > SK_MAX) return null;
  const g = rows.reverse().map((r) => r.map(Number));
  if (g.flat().some((v) => v > SK_MAX) || !g.flat().some((v) => v > 0)) return null;
  return g;
}
/** 높이 표 → 지시문 글 "2 1 0 / 1 3 1" (첫 줄이 뒤) */
export const stackText = (g) => [...g].reverse().map((r) => r.join(' ')).join(' / ');
/** 높이 표 → 후보 글 "2,1,0/1,3,1" */
export const stackTok = (g) => [...g].reverse().map((r) => r.join(',')).join('/');

const skHas = (g, i, j, k) => j >= 0 && j < g.length && i >= 0 && i < g[0].length && k >= 0 && g[j][i] > k;
/** 칠하는 순서: 뒤 줄부터(j 큰 것), 아래층부터, 왼쪽부터 */
function skCubes(g) {
  const out = [];
  for (let j = g.length - 1; j >= 0; j--) for (let k = 0; k < SK_MAX; k++) for (let i = 0; i < g[0].length; i++) if (g[j][i] > k) out.push([i, j, k]);
  return out;
}
/** 쌓기나무 하나의 보이는 쪽 세 면(앞·위·오른쪽) — 다른 쌓기나무와 맞닿은 면은 뺀다. 꼭짓점은 [x, y, z] */
function skFaces(g, [i, j, k]) {
  const f = [];
  if (!skHas(g, i, j - 1, k)) f.push(['front', [[i, j, k], [i + 1, j, k], [i + 1, j, k + 1], [i, j, k + 1]]]);
  if (!skHas(g, i, j, k + 1)) f.push(['top', [[i, j, k + 1], [i + 1, j, k + 1], [i + 1, j + 1, k + 1], [i, j + 1, k + 1]]]);
  if (!skHas(g, i + 1, j, k)) f.push(['right', [[i + 1, j, k], [i + 1, j + 1, k], [i + 1, j + 1, k + 1], [i + 1, j, k + 1]]]);
  return f;
}
/** [x, y, z] → 단위 화면 좌표 (아래로 갈수록 y가 크다) */
const skP = ([x, y, z]) => [x + y * SK_DX, -(z + y * SK_DY)];
/** 점이 볼록 사각형 안(경계 제외)에 있나 */
function skInQuad(p, q) {
  let sgn = 0;
  for (let a = 0; a < 4; a++) {
    const [x1, y1] = q[a]; const [x2, y2] = q[(a + 1) % 4];
    const c = (x2 - x1) * (p[1] - y1) - (y2 - y1) * (p[0] - x1);
    if (Math.abs(c) < 1e-9) return false;
    const s = Math.sign(c);
    if (!sgn) sgn = s; else if (s !== sgn) return false;
  }
  return true;
}

/**
 * 쌓기나무마다 보이는 정도 — 그리는 순서대로 칠했을 때 각 면에서 가려지지 않은 몫(면마다 6 × 6 점).
 * 생성기가 "기둥마다 맨 위가 보이는 그림"·"보이지 않는 쌓기나무가 있는 그림"을 고를 때 쓴다.
 * @returns {{cubes: Array<{i:number,j:number,k:number,vis:{front:number,top:number,right:number},any:boolean}>, topVis: Array<Array<number|null>>}}
 */
const SK_VIS = new Map(); // 같은 높이 표는 한 번만 — 생성기가 모양을 고르며 수십 번 묻는다
export function stackVis(g) {
  const key = stackText(g);
  if (SK_VIS.has(key)) return SK_VIS.get(key);
  const out = skVis(g);
  if (SK_VIS.size > 20000) SK_VIS.clear();
  SK_VIS.set(key, out);
  return out;
}
function skVis(g) {
  const cubes = skCubes(g);
  const faces = [];
  cubes.forEach((c, ci) => { for (const [f, pts] of skFaces(g, c)) faces.push({ ci, f, q: pts.map(skP) }); });
  const res = cubes.map(([i, j, k]) => ({ i, j, k, vis: { front: 0, top: 0, right: 0 }, any: false }));
  const N = 6;
  faces.forEach((F, fi) => {
    let seen = 0;
    const [p0, p1, p2, p3] = F.q;
    for (let a = 0; a < N; a++) for (let b = 0; b < N; b++) {
      const u = (a + 0.5) / N; const v = (b + 0.5) / N;
      const pt = [0, 1].map((d) => (1 - u) * (1 - v) * p0[d] + u * (1 - v) * p1[d] + u * v * p2[d] + (1 - u) * v * p3[d]);
      let hid = false;
      for (let gi = fi + 1; gi < faces.length && !hid; gi++) if (faces[gi].ci !== F.ci && skInQuad(pt, faces[gi].q)) hid = true;
      if (!hid) seen++;
    }
    res[F.ci].vis[F.f] = seen / (N * N);
  });
  for (const c of res) c.any = c.vis.front + c.vis.top + c.vis.right > 0.04;
  const topVis = g.map((row, j) => row.map((h, i) => (h ? res.find((x) => x.i === i && x.j === j && x.k === h - 1).vis.top : null)));
  return { cubes: res, topVis };
}

/** 화살표 한 개 (머리는 끝에) */
function skArrow(cls, a, b, label, lx, ly) {
  const dx = b[0] - a[0]; const dy = b[1] - a[1]; const L = Math.hypot(dx, dy) || 1;
  const ux = dx / L; const uy = dy / L; const nx = -uy; const ny = ux;
  const h1 = [b[0] - ux * 10 + nx * 5.5, b[1] - uy * 10 + ny * 5.5]; const h2 = [b[0] - ux * 10 - nx * 5.5, b[1] - uy * 10 - ny * 5.5];
  return `<g class="${cls}"><line x1="${cf(a[0])}" y1="${cf(a[1])}" x2="${cf(b[0] - ux * 8)}" y2="${cf(b[1] - uy * 8)}" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>`
    + `<polygon points="${cf(b[0])},${cf(b[1])} ${cf(h1[0])},${cf(h1[1])} ${cf(h2[0])},${cf(h2[1])}" fill="currentColor"/>`
    + `<text x="${cf(lx)}" y="${cf(ly)}" font-size="16" font-weight="700" text-anchor="middle" fill="currentColor">${esc(label)}</text></g>`;
}

/** 쌓은 모양 한 덩이 — 앞 왼쪽 아래 모서리를 (bx, by)에, 한 칸 s로. 쌓기나무마다 면 두 겹(바탕색 + 옅은 색·테두리) */
function skBlock(g, s, bx, by) {
  const P = (pt) => { const [u, v] = skP(pt); return [bx + s * u, by + s * v]; };
  let out = '';
  for (const c of skCubes(g)) {
    for (const [f, pts] of skFaces(g, c)) {
      const q = pts.map(P).map(([x, y]) => `${cf(x)},${cf(y)}`).join(' ');
      out += `<polygon class="sk-f" data-c="${c.join(',')}" data-f="${f}" points="${q}" fill="var(--card, #fff)"/>`;
      out += `<polygon points="${q}" fill="${FILL}" fill-opacity="${f === 'top' ? 0.12 : f === 'front' ? 0.28 : 0.46}" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>`;
    }
  }
  return { svg: out, P };
}
const skSize = (g) => ({ W: g[0].length, D: g.length, Hm: Math.max(...g.flat()) });

/** `[stack …]` 인자 → { g, free } */
export function parseStackFig(arg) {
  const toks = String(arg || '').trim().split(/\s+/);
  const free = toks.includes('free');
  const g = parseStack(toks.filter((t) => t !== 'free').join(' '));
  return g ? { g, free } : null;
}

/** 쌓은 모양 그림 — 보이는 크기는 그린 크기의 1.2배(태블릿에서 칸이 본문 글자보다 커야 셀 수 있다) */
export function stackSvg(sp) {
  const { g } = sp;
  const { W, D, Hm } = skSize(g);
  const s = Math.min(46, 260 / (W + D * SK_DX), 200 / (Hm + D * SK_DY));
  const padL = 58; const padT = 22; const padR = 30; const padB = sp.free ? 18 : 62;
  const bx = padL; const by = padT + s * (Hm + D * SK_DY);
  const B = skBlock(g, s, bx, by);
  const Wd = Math.round(padL + s * (W + D * SK_DX) + padR); const Ht = Math.round(by + padB);
  let arrow = '';
  if (!sp.free) {
    // "앞" — 앞 줄 아래 가운데를 왼쪽 아래에서 오른쪽 위(안쪽 방향)로 가리킨다
    const tip = B.P([W / 2, 0, 0]);
    arrow = skArrow('sk-front', [tip[0] - 34, tip[1] + 36], [tip[0] - 5, tip[1] + 7], '앞', tip[0] - 42, tip[1] + 56);
  }
  return `<svg class="frac-fig stack-fig" viewBox="0 0 ${Wd} ${Ht}" width="${Math.round(Wd * 1.2)}" height="${Math.round(Ht * 1.2)}" role="img" aria-label="${esc(stackDesc(g))}">${B.svg}${arrow}</svg>`;
}
const stackDesc = (g) => `쌓기나무로 쌓은 모양 (위에서 본 모양에 수를 쓰면 ${stackText(g)})`;

/** `[stacks ㉠=2,1/0,1 …]` → { items: [{k, g}], free } */
export function parseStacks(arg) {
  const toks = String(arg || '').trim().split(/\s+/);
  const free = toks.includes('free');
  const items = [];
  for (const t of toks.filter((x) => x !== 'free')) {
    const m = /^([㉠-㉣])=(.+)$/.exec(t);
    if (!m) return null;
    const g = parseStack(m[2]);
    if (!g || items.some((x) => x.k === m[1])) return null;
    items.push({ k: m[1], g });
  }
  return items.length >= 2 && items.length <= 4 ? { items, free } : null;
}
/** 쌓은 모양 후보 — 같은 크기의 칸으로 두 줄 (한 줄에 둘) */
export function stacksSvg(sp) {
  const dims = sp.items.map((x) => skSize(x.g));
  const Wm = Math.max(...dims.map((d) => d.W + d.D * SK_DX)); const Hmm = Math.max(...dims.map((d) => d.Hm + d.D * SK_DY));
  const s = Math.min(34, 150 / Wm, 130 / Hmm);
  const cellW = s * Wm + 70; const cellH = s * Hmm + (sp.free ? 44 : 78);
  const cols = 2; const rows = Math.ceil(sp.items.length / cols);
  let out = '';
  sp.items.forEach((it, n) => {
    const cx = (n % cols) * cellW; const cy = Math.floor(n / cols) * cellH;
    const d = skSize(it.g);
    const bx = cx + 40; const by = cy + 30 + s * (d.Hm + d.D * SK_DY);
    const B = skBlock(it.g, s, bx, by);
    out += `<g class="sk-cand" data-k="${it.k}" data-g="${stackTok(it.g)}">${B.svg}`;
    if (!sp.free) { const tip = B.P([d.W / 2, 0, 0]); out += skArrow('sk-front', [tip[0] - 24, tip[1] + 26], [tip[0] - 4, tip[1] + 6], '앞', tip[0] - 30, tip[1] + 42); }
    out += `<text class="sk-k" x="${cf(cx + 14)}" y="${cf(cy + 24)}" font-size="18" font-weight="700" fill="currentColor">${it.k}</text></g>`;
  });
  const Wd = Math.round(cols * cellW); const Ht = Math.round(rows * cellH);
  return `<svg class="frac-fig stack-fig" viewBox="0 0 ${Wd} ${Ht}" width="${Math.round(Wd * 1.15)}" height="${Math.round(Ht * 1.15)}" role="img" aria-label="${esc(stacksText(sp))}">${out}</svg>`;
}
const stacksText = (sp) => `쌓은 모양 ${sp.items.map((x) => `${x.k} ${stackText(x.g)}`).join(' · ')}`;

const SK_VIEW_NAMES = ['㉠', '㉡', '㉢', '㉣', '위', '앞', '옆'];
/**
 * `[views ㉠=2,3,1 ㉡=11/01 …]` → items [{k, kind:'side', h:[2,3,1]} | {k, kind:'top', cells:[[0/1]] (첫 줄이 뒤)}]
 * 쉼표가 있으면(또는 수 하나면) 앞·옆에서 본 모양, 0·1로만 된 줄이면 위에서 본 모양
 */
export function parseViews(arg) {
  const items = [];
  for (const t of String(arg || '').trim().split(/\s+/)) {
    const m = /^(.)=(.+)$/u.exec(t);
    if (!m || !SK_VIEW_NAMES.includes(m[1]) || items.some((x) => x.k === m[1])) return null;
    const v = m[2];
    if (/^[1-4](,[1-4]){0,3}$/.test(v) && (v.includes(',') || v.length === 1)) { items.push({ k: m[1], kind: 'side', h: v.split(',').map(Number) }); continue; }
    if (/^[01]{1,4}(\/[01]{1,4}){0,3}$/.test(v)) {
      const cells = v.split('/').map((r) => [...r].map(Number));
      if (cells.some((r) => r.length !== cells[0].length) || !cells.flat().some(Boolean)) return null;
      items.push({ k: m[1], kind: 'top', cells });
      continue;
    }
    return null;
  }
  return items.length ? { items } : null;
}
const SKC = 24; // 본 모양 한 칸
/** 칸 하나 */
const skCell = (x, y, cls = 'sk-sq') => `<rect class="${cls}" x="${cf(x)}" y="${cf(y)}" width="${SKC}" height="${SKC}" fill="${FILL}" fill-opacity="0.3" stroke="currentColor" stroke-width="1.5"/>`;
/** 본 모양 후보 — 한 줄에 넷까지(넓으면 두 줄). 앞·옆 모양은 바닥선 위에 기둥을, 위 모양은 점선 칸 위에 칠한 칸을 */
export function viewsSvg(sp) {
  const dims = sp.items.map((it) => (it.kind === 'side' ? { w: it.h.length, h: Math.max(...it.h) } : { w: it.cells[0].length, h: it.cells.length }));
  const bw = Math.max(...dims.map((d) => d.w)) * SKC + 44; const bh = Math.max(...dims.map((d) => d.h)) * SKC + 46;
  const cols = sp.items.length * bw > 400 ? 2 : sp.items.length;
  let out = '';
  sp.items.forEach((it, n) => {
    const x0 = (n % cols) * bw + 30; const y0 = Math.floor(n / cols) * bh + 30;
    const d = dims[n];
    out += `<g class="sk-view" data-k="${it.k}" data-kind="${it.kind}" data-v="${it.kind === 'side' ? it.h.join(',') : it.cells.map((r) => r.join('')).join('/')}">`;
    out += `<text class="sk-k" x="${cf(x0 - 18)}" y="${cf(y0 - 6)}" font-size="${it.k.length === 1 && /[㉠-㉣]/.test(it.k) ? 18 : 15}" font-weight="700" fill="currentColor">${it.k}</text>`;
    const top = y0 + (bh - 46 - d.h * SKC);
    if (it.kind === 'side') {
      it.h.forEach((h, i) => { for (let k = 0; k < h; k++) out += skCell(x0 + i * SKC, top + (d.h - 1 - k) * SKC); });
      out += `<line x1="${cf(x0 - 6)}" y1="${cf(top + d.h * SKC)}" x2="${cf(x0 + d.w * SKC + 6)}" y2="${cf(top + d.h * SKC)}" stroke="currentColor" stroke-width="2.2"/>`;
    } else {
      it.cells.forEach((row, r) => row.forEach((v, c) => {
        out += v ? skCell(x0 + c * SKC, top + r * SKC) : `<rect x="${cf(x0 + c * SKC)}" y="${cf(top + r * SKC)}" width="${SKC}" height="${SKC}" fill="none" stroke="currentColor" stroke-opacity="0.3" stroke-dasharray="3 3"/>`;
      }));
    }
    out += '</g>';
  });
  const rows = Math.ceil(sp.items.length / cols);
  const Wd = Math.round(cols * bw + 16); const Ht = Math.round(rows * bh + 10);
  return `<svg class="frac-fig views-fig" viewBox="0 0 ${Wd} ${Ht}" width="${Math.round(Wd * 1.15)}" height="${Math.round(Ht * 1.15)}" role="img" aria-label="${esc(viewsText(sp))}">${out}</svg>`;
}
const viewsText = (sp) => sp.items.map((it) => (it.kind === 'side' ? `${it.k} 기둥 높이 ${it.h.join(', ')}` : `${it.k} 위에서 본 칸 ${it.cells.map((r) => r.join('')).join('/')}`)).join(' · ');

/** 위에서 본 모양에 수를 쓴 그림 — 앞은 아래쪽 */
export function topSvg(g) {
  const { W, D } = skSize(g);
  const c = 40; const x0 = 24; const y0 = 16;
  let out = '';
  for (let r = 0; r < D; r++) for (let i = 0; i < W; i++) {
    const h = g[D - 1 - r][i];
    const x = x0 + i * c; const y = y0 + r * c;
    if (!h) { out += `<rect x="${x}" y="${y}" width="${c}" height="${c}" fill="none" stroke="currentColor" stroke-opacity="0.3" stroke-dasharray="3 3"/>`; continue; }
    out += `<rect class="sk-top" data-i="${i}" data-j="${D - 1 - r}" data-h="${h}" x="${x}" y="${y}" width="${c}" height="${c}" fill="${FILL}" fill-opacity="0.18" stroke="currentColor" stroke-width="1.6"/>`;
    out += `<text x="${x + c / 2}" y="${y + c / 2 + 7}" font-size="20" font-weight="700" text-anchor="middle" fill="currentColor">${h}</text>`;
  }
  const Wd = x0 * 2 + W * c; const Ht = y0 + D * c + 30;
  out += `<text x="${Wd / 2}" y="${y0 + D * c + 22}" font-size="15" font-weight="700" text-anchor="middle" fill="currentColor">앞</text>`;
  return `<svg class="frac-fig top-fig" viewBox="0 0 ${Wd} ${Ht}" width="${Math.round(Wd * 1.1)}" height="${Math.round(Ht * 1.1)}" role="img" aria-label="${esc(`위에서 본 모양에 수를 쓴 그림 ${stackText(g)}`)}">${out}</svg>`;
}

/** 층별로 나타낸 모양 — 1층부터 맨 위층까지 나란히, 칸 자리는 모두 같은 틀 위에 (앞은 아래쪽) */
export function layersSvg(g) {
  const { W, D, Hm } = skSize(g);
  const c = 26; const gap = 34; const bw = W * c + gap;
  let out = '';
  for (let k = 1; k <= Hm; k++) {
    const x0 = 16 + (k - 1) * bw; const y0 = 30;
    out += `<g class="sk-layer" data-k="${k}"><text x="${x0 + (W * c) / 2}" y="20" font-size="15" font-weight="700" text-anchor="middle" fill="currentColor">${k}층</text>`;
    for (let r = 0; r < D; r++) for (let i = 0; i < W; i++) {
      const on = g[D - 1 - r][i] >= k;
      out += on ? `<rect class="sk-sq" data-i="${i}" data-j="${D - 1 - r}" x="${x0 + i * c}" y="${y0 + r * c}" width="${c}" height="${c}" fill="${FILL}" fill-opacity="0.3" stroke="currentColor" stroke-width="1.5"/>`
        : `<rect x="${x0 + i * c}" y="${y0 + r * c}" width="${c}" height="${c}" fill="none" stroke="currentColor" stroke-opacity="0.3" stroke-dasharray="3 3"/>`;
    }
    out += `<text x="${x0 + (W * c) / 2}" y="${y0 + D * c + 18}" font-size="13" text-anchor="middle" fill="currentColor" fill-opacity="0.8">앞</text></g>`;
  }
  const Wd = Math.round(16 * 2 + Hm * bw - gap); const Ht = 30 + D * c + 26;
  return `<svg class="frac-fig layers-fig" viewBox="0 0 ${Wd} ${Ht}" width="${Math.round(Wd * 1.15)}" height="${Math.round(Ht * 1.15)}" role="img" aria-label="${esc(layersText(g))}">${out}</svg>`;
}
const layersText = (g) => {
  const { D, Hm } = skSize(g);
  const parts = [];
  for (let k = 1; k <= Hm; k++) { const rows = []; for (let j = D - 1; j >= 0; j--) rows.push(g[j].map((h) => (h >= k ? 1 : 0)).join('')); parts.push(`${k}층 ${rows.join('/')}`); }
  return `층별로 나타낸 모양: ${parts.join(' · ')}`;
};

/** 📊·❓ 글용 — 그림 종류별 */
export function spaceText(kind, arg) {
  if (kind === 'stack') { const sp = parseStackFig(arg); return sp ? stackDesc(sp.g) : ''; }
  if (kind === 'stacks') { const sp = parseStacks(arg); return sp ? stacksText(sp) : ''; }
  if (kind === 'views') { const sp = parseViews(arg); return sp ? `본 모양: ${viewsText(sp)}` : ''; }
  if (kind === 'top') { const g = parseStack(arg); return g ? `위에서 본 모양에 수를 쓴 그림 ${stackText(g)}` : ''; }
  if (kind === 'layers') { const g = parseStack(arg); return g ? layersText(g) : ''; }
  return '';
}

// ───────────────────── 글 속 식 — 분수·대분수·문자 (2026-10-03, D 문자와 식 3단계) ─────────────────────
//
// 화면(math.js richNode)과 검수 페이지(tools/mathexpr.mjs)가 같이 쓴다 — 아이가 보는 것과 아빠가 검수하는 것이 같은 모양이어야 한다.
// 수 분수 3/4·대분수 2 3/8은 예전 그대로, D 줄기의 문자 분수 x/3 · (x + 2)/3 · ac/b · a/(bc)도 세로로 (분수 막대가 괄호 노릇 → 바깥 괄호는 뗀다).
// 문자는 변수로 쓰는 a·b·c·x·y만 기울인다 — cm·km·kg처럼 다른 글자가 섞인 낱말은 그대로 (단위가 기울면 안 된다).

// 괄호째 분자·분모는 문자가 든 식만 — F 비례배분 풀이의 "45 × 5/(4 + 5)"는 예전처럼 한 줄로 둔다 (다른 줄기 화면은 바꾸지 않는다)
const MATH_PAREN = /^\((?=[^)]*[abcxy])[0-9abcxy²³ +−×÷()]+\)$/;
/** 보통 글 → 글·문자(기울임) 조각 */
function varSplit(s) {
  return String(s).split(/([A-Za-z]+)/).filter(Boolean).map((p) => ({ k: /^[abcxy]+$/.test(p) ? 'v' : 't', s: p }));
}
/** i의 괄호와 짝인 괄호 자리 (step −1: 닫는 괄호에서 거꾸로) */
function pairOf(t, i, step) {
  for (let d = 0, j = i; j >= 0 && j < t.length; j += step) {
    if (t[j] === '(') d += step > 0 ? 1 : -1;
    if (t[j] === ')') d += step > 0 ? -1 : 1;
    if (d === 0) return j;
  }
  return -1;
}
/** t[i]의 "/"가 분수면 { start, end, part } */
function fracAt(t, i) {
  let s = i; let num;
  if (t[i - 1] === ')') {
    s = pairOf(t, i - 1, -1);
    if (s < 0 || !MATH_PAREN.test(t.slice(s, i))) return null;
    num = t.slice(s + 1, i - 1);
  } else {
    while (s > 0 && /[0-9abcxy²³]/.test(t[s - 1])) s--;
    num = t.slice(s, i);
    if (!num || /[A-Za-z]/.test(t[s - 1] || '')) return null;
  }
  let e = i + 1; let den;
  if (t[e] === '(') {
    e = pairOf(t, e, 1) + 1;
    if (e <= 0 || !MATH_PAREN.test(t.slice(i + 1, e))) return null;
    den = t.slice(i + 2, e - 1);
  } else if (/\d/.test(t[e] || '')) {
    while (e < t.length && /\d/.test(t[e])) e++;
    den = t.slice(i + 1, e);
  } else {
    while (e < t.length && /[abcxy]/.test(t[e])) e++;
    den = t.slice(i + 1, e);
    if (/[A-Za-z]/.test(t[e] || '')) return null;
  }
  if (!den || t[s - 1] === '/' || t[e] === '/') return null;
  // 대분수 "2 3/8" — 분자·분모가 수일 때만 (예전 richNode와 같은 규칙)
  if (/^\d+$/.test(num) && /^\d+$/.test(den)) {
    const m = /(?<![\d/])(\d+) $/.exec(t.slice(0, s));
    if (m) return { start: s - m[0].length, end: e, part: { k: 'm', w: m[1], n: num, d: den } };
  }
  return { start: s, end: e, part: { k: 'f', n: varSplit(num), d: varSplit(den) } };
}
/**
 * 글 → 조각 [{k:'t', s} 글 | {k:'v', s} 문자 | {k:'f', n:[조각], d:[조각]} 분수 | {k:'m', w, n, d} 대분수].
 * **굵게**는 부르는 쪽이 먼저 나눈다.
 */
export function richParts(text) {
  const t = String(text || ''); const out = []; let last = 0;
  for (let i = 0; i < t.length; i++) {
    if (t[i] !== '/') continue;
    const f = fracAt(t, i);
    if (!f || f.start < last) continue;
    out.push(...varSplit(t.slice(last, f.start)), f.part);
    last = f.end; i = f.end - 1;
  }
  out.push(...varSplit(t.slice(last)));
  return out;
}

/**
 * 한 줄 요약 자르기 (🤔 오답 노트 60자 · ❓ 버튼 26자) — 괄호·분수 중간에서 자르지 않는다.
 * "a ÷ b × c는 a/(b…"처럼 잘리면 richParts가 분수를 못 알아봐 / 가 글자로 남는다 (Codex 26차 #5).
 * 띄어 쓴 자리 중 괄호가 다 닫히고 앞뒤가 /가 아닌 곳까지 물러나고, 너무 짧아지면(반 아래) 그냥 자른다
 */
export function cutLine(s, n) {
  const t = String(s || '');
  if (t.length <= n) return t;
  for (let p = n; p > n / 2; p--) {
    if (t[p] !== ' ') continue;
    const head = t.slice(0, p);
    const open = (head.match(/\(/g) || []).length - (head.match(/\)/g) || []).length;
    if (open === 0 && !head.endsWith('/') && t[p + 1] !== '/') return `${head.trimEnd()}…`;
  }
  return `${t.slice(0, n)}…`;
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
