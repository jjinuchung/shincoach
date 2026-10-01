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
  return String(text || '').replace(/\[(bar|pizza|bars|line|vline|walk|steps|table|rect|reg|para|tri|rhom|trap|lshape|grid|gpoly|lines|tris|tria|quad|bgraph|lgraph|band|pie) ([^\]]+)\]/g, (_, kind, arg) => figureSvg(`${kind} ${arg}`));
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
