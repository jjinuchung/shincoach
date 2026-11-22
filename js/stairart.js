// 🪜 계단 그림·자리 (v435 · 2026-11-21 진우 「1층에서 2층으로 올라가는 계단 · 캐릭터가 올라가는 모션」 → 아버님 시안 「이대로」)
// 순수 — 화면 없음(node 시험이 그대로 돈다). 그림·움직임 좌표는 시안(.context/v435/sian/page.js)에서 옮겼다.
// 그림 좌표는 한 칸 = 100: 1층 계단 = 가로 200 × 세로 230(바닥 두 칸 × 벽 1.3칸 + 맨 뒤 줄 1칸) · 2층 구멍 = 200 × 100(두 칸 × 한 줄).
// 방 자리는 모두 방에 대한 % — g = geoOf(size, WALL_RATIO) (W 가로 칸 · rows 방 높이 칸 · wallR 벽 높이 칸)

/** 칸 → 방 % 셈판 (houseview.rowsOf와 같은 셈: 방 높이 = 벽 + 바닥 H칸) */
export function geoOf(size, wallR) {
  return { W: size.W, rows: wallR + size.H, wallR };
}

/** 바닥 칸 (x, y)에 선 캐릭터의 발 자리 — 그 칸 아래 끝 가운데 (방 %) · 방의 .house-me 상자(meBoxOf)의 아래 끝과 같다 */
export function cellFoot(g, x, y) {
  return { fx: ((x + 0.5) / g.W) * 100, fy: ((g.wallR + y + 1) / g.rows) * 100 };
}

/** 1층 계단 상자 (방 %) — 벽 위 끝부터 맨 뒤 줄 바닥 아래 끝까지 · 두 칸 */
export function stairBox(g, x) {
  return { left: (x / g.W) * 100, top: 0, width: (2 / g.W) * 100, height: ((g.wallR + 1) / g.rows) * 100 };
}
/** 2층 계단 구멍 상자 (방 %) — 맨 뒤 줄 바닥 두 칸 */
export function holeBox(g, x) {
  return { left: (x / g.W) * 100, top: (g.wallR / g.rows) * 100, width: (2 / g.W) * 100, height: (1 / g.rows) * 100 };
}
/** 1층 계단 그림 좌표(200 × 230) → 방 % */
export function stairPt(g, x, ex, ey) {
  return { fx: ((x + ex / 100) / g.W) * 100, fy: (((ey / 230) * (g.wallR + 1)) / g.rows) * 100 };
}
/** 2층 구멍 그림 좌표(200 × 100) → 방 % */
export function holePt(g, x, ex, ey) {
  return { fx: ((x + ex / 100) / g.W) * 100, fy: ((g.wallR + ey / 100) / g.rows) * 100 };
}

/**
 * 오르내리는 길 (방 %) — 계단 왼쪽 칸이 x일 때.
 * steps = 아래 단부터 위 단까지 발 자리 일곱 · top = 천장 구멍 너머(올라가 사라지는 자리) · lip = 천장 턱 아래 끝(이 위로 간 몸은 가린다) ·
 * holeIn = 구멍 맨 윗단(바닥 높이) · holeSink = 구멍 아래(내려가 사라지는 자리) · holeBelow = 구멍 아래(올라오기 전 숨은 자리) ·
 * holeEdge = 구멍 앞 끝(이 아래로 간 몸은 가린다)
 * pal = 파트너는 한 걸음 뒤(왼쪽)로 따라간다
 */
export function climbPts(g, x) {
  return {
    steps: Array.from({ length: 7 }, (_, i) => stairPt(g, x, 21 + 26 * i, 194 - 28 * i)),
    top: { me: stairPt(g, x, 196, -30), pal: stairPt(g, x, 190, -30) },
    lip: stairPt(g, x, 0, 28).fy,
    holeIn: { me: holePt(g, x, 166, 74), pal: holePt(g, x, 150, 78) },
    holeSink: { me: holePt(g, x, 150, 236), pal: holePt(g, x, 136, 236) },
    holeBelow: { me: holePt(g, x, 166, 232), pal: holePt(g, x, 150, 232) },
    holeEdge: holePt(g, x, 0, 94).fy,
  };
}

/**
 * 걸어갈 칸 길 (순수) — from에서 to까지 막힌 칸(taken: "x,y")을 돌아가는 가장 짧은 길 · 꺾이는 칸과 끝 칸만(곧게 가는 동안은 한 번에).
 * to는 막혀 있어도 간다(계단 앞 칸에 의자가 있어도 그 앞까지는 걷는다) · 길이 없으면 [to](곧장) · 같은 칸이면 []
 */
export function gridPath(size, taken, from, to) {
  const key = (c) => `${c.x},${c.y}`;
  const goal = key(to);
  if (key(from) === goal) return [];
  const prev = new Map([[key(from), null]]);
  const queue = [{ x: from.x, y: from.y }];
  for (let i = 0; i < queue.length && !prev.has(goal); i++) {
    const c = queue[i];
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const n = { x: c.x + dx, y: c.y + dy };
      const k = key(n);
      if (n.x < 0 || n.y < 0 || n.x >= size.W || n.y >= size.H || prev.has(k)) continue;
      if (k !== goal && taken.has(k)) continue;
      prev.set(k, c);
      queue.push(n);
    }
  }
  if (!prev.has(goal)) return [{ x: to.x, y: to.y }];
  const cells = [];
  for (let c = { x: to.x, y: to.y }; c && key(c) !== key(from); c = prev.get(key(c))) cells.unshift({ x: c.x, y: c.y });
  return cells.filter((c, i) => {
    if (i === cells.length - 1) return true;
    const a = i ? cells[i - 1] : from;
    const b = cells[i + 1];
    return c.x - a.x !== b.x - c.x || c.y - a.y !== b.y - c.y;
  });
}

// ── 그림 (SVG 글 — houseview가 방에 넣는다 · uid = 그라데이션 id가 겹치지 않게) ──
const svgOpen = (w, h) => `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">`;
const clean = (uid) => String(uid === undefined ? 's' : uid).replace(/[^\w-]/g, '');

/** 1층 계단 뒤(나무 단 일곱 · 천장 구멍 — 위로 2층 하늘색 벽이 살짝) */
export function stairBackSvg(uid) {
  const id = `stair-hg-${clean(uid)}`;
  let s = `${svgOpen(200, 230)}<defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2b1f15"/><stop offset="1" stop-color="#5b4330"/></linearGradient></defs>`;
  s += `<rect x="34" y="0" width="166" height="28" fill="url(#${id})"/><rect x="34" y="0" width="166" height="7" fill="#cfe8ff" opacity="0.85"/>`;
  s += '<polygon points="8,222 196,26 196,222" fill="#000" opacity="0.06"/>';
  for (let i = 0; i < 7; i++) {
    const x0 = 8 + i * 26;
    const y0 = 222 - (i + 1) * 28;
    s += `<rect x="${x0}" y="${y0}" width="${196 - x0}" height="28" fill="#c98d55" stroke="#7a4c22" stroke-width="1.6"/>`;
    s += `<rect x="${x0 + 0.8}" y="${y0 + 0.8}" width="24.4" height="6" fill="#e6b47a"/>`;
  }
  return `${s}<line x1="8" y1="222" x2="196" y2="222" stroke="#7a4c22" stroke-width="2"/></svg>`;
}
const railY = (x) => 176 - (x - 14) * 1.077;
/** 1층 계단 앞(천장 턱 · 난간) — 오르내리는 동안 캐릭터 앞에 온다 */
export function stairFrontSvg() {
  let s = `${svgOpen(200, 230)}<rect x="30" y="18" width="170" height="10" rx="2" fill="#b0824f" stroke="#7a4c22" stroke-width="1.4"/>`;
  for (let i = 0; i < 7; i++) {
    const px = 8 + i * 26 + 5;
    const y0 = 222 - (i + 1) * 28;
    s += `<line x1="${px}" y1="${y0}" x2="${px}" y2="${railY(px).toFixed(1)}" stroke="#7a4c22" stroke-width="3.2" stroke-linecap="round"/>`;
  }
  return `${s}<line x1="9" y1="${railY(9).toFixed(1)}" x2="194" y2="${railY(194).toFixed(1)}" stroke="#8a5a2b" stroke-width="6.5" stroke-linecap="round"/><line x1="9" y1="${(railY(9) - 1.6).toFixed(1)}" x2="194" y2="${(railY(194) - 1.6).toFixed(1)}" stroke="#b98250" stroke-width="2" stroke-linecap="round"/></svg>`;
}
/** 2층 계단 구멍 — 오른쪽 맨 윗단이 바닥 높이, 왼쪽으로 갈수록 한 단씩 낮고 어두워진다(아래층으로 내려가는 계단) */
export function holeBackSvg(uid) {
  const id = `stair-hb-${clean(uid)}`;
  let s = `${svgOpen(200, 100)}<defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#140d08"/><stop offset="1" stop-color="#2e2015"/></linearGradient></defs>`;
  s += '<rect x="6" y="8" width="188" height="88" rx="3" fill="#b0824f" stroke="#7a4c22" stroke-width="1.6"/>';
  s += `<rect x="12" y="13" width="176" height="78" rx="2" fill="url(#${id})"/>`;
  const tone = ['#d29a5f', '#b07a45', '#8c5f33', '#6c4826', '#4f341c'];
  for (let i = 0; i < 5; i++) {
    const x1 = 188 - (i + 1) * 35;
    const y0 = 13 + i * 13;
    s += `<rect x="${x1}" y="${y0}" width="35" height="${91 - y0}" fill="${tone[i]}"/><rect x="${x1}" y="${y0}" width="35" height="5" fill="#f0c58e" opacity="${(0.7 - i * 0.12).toFixed(2)}"/>`;
    s += `<line x1="${x1}" y1="${y0}" x2="${x1}" y2="91" stroke="#2b1d12" stroke-width="1.2" opacity="0.6"/>`;
  }
  return `${s}<rect x="12" y="13" width="176" height="10" fill="#000" opacity="0.28"/></svg>`;
}
/** 2층 구멍 앞 난간 — 왼쪽과 앞쪽(오른쪽 맨 윗단은 비워 둔다 — 거기로 오르내린다) */
export function holeFrontSvg() {
  let s = svgOpen(200, 100);
  for (const x of [8, 34, 60, 86, 112, 138]) s += `<line x1="${x}" y1="96" x2="${x}" y2="50" stroke="#7a4c22" stroke-width="3.6" stroke-linecap="round"/>`;
  for (const y of [10, 30]) s += `<line x1="8" y1="${y + 40}" x2="8" y2="${y}" stroke="#7a4c22" stroke-width="3.6" stroke-linecap="round"/>`;
  return `${s}<line x1="6" y1="50" x2="142" y2="50" stroke="#8a5a2b" stroke-width="7" stroke-linecap="round"/><line x1="6" y1="48.5" x2="142" y2="48.5" stroke="#c48d58" stroke-width="2" stroke-linecap="round"/><line x1="8" y1="6" x2="8" y2="50" stroke="#8a5a2b" stroke-width="7" stroke-linecap="round"/><circle cx="142" cy="50" r="5.5" fill="#8a5a2b"/></svg>`;
}
