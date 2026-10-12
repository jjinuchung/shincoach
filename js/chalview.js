// 🎯 도전 문제의 **그림**과 **답 입력칸** (2026-09-28)
//
// 문제집을 그대로 옮기려면 두 가지가 필요하다:
//   ① 문제마다 다른 그림 — 수직선·화살표 흐름·계산 상자·가로세로 표·카드·대화
//   ② 문제집처럼 쓰는 답칸 — 숫자판·고르기·여러 개 고르기·순서 놓기 (찍어서 맞힐 수 없게)
//
// 규칙(mathchal.js)과 떨어져 있다 — 이 파일은 DOM만 만들고 채점은 하지 않는다.
//
// 5단원 꺾은선그래프(2026-10-01)에서 더한 것: 그래프 그림(`chart`·`charts` — 📊 K 줄기와 같은 [lgraph] 그림),
// 표(`table`), 그림 여럿(배열), 그리고 **점 여러 개 찍기 답칸**(`plot` — 07·12 "꺾은선그래프로 나타내 보세요").
import { figureSvg, parseChart, chartGeom, lgraphSvg } from './mathdraw.js';
import { diagKind } from './mathchal.js'; // ✍️ 대각선 그어 보기 판 (v246) — mathchal은 아무것도 import하지 않는다

const SVGNS = 'http://www.w3.org/2000/svg';

const el = (tag, cls, text) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined && text !== null) e.textContent = String(text);
  return e;
};

// ───────────────────── 그림 ─────────────────────

/** 0 ─┬─┬─┬─ 1/10 수직선. at번째 눈금에 ↑와 이름 */
function numlineEl(f) {
  const parts = Math.max(2, Math.floor(Number(f.parts) || 10));
  const at = Math.max(0, Math.min(parts, Math.floor(Number(f.at) || 0)));
  const W = 300; const H = 74; const x0 = 22; const x1 = W - 22;
  const step = (x1 - x0) / parts;
  const y = 26;
  let ticks = '';
  for (let i = 0; i <= parts; i++) {
    const x = x0 + step * i;
    const big = i === 0 || i === parts;
    ticks += `<line x1="${x.toFixed(1)}" y1="${y - (big ? 9 : 6)}" x2="${x.toFixed(1)}" y2="${y + (big ? 9 : 6)}" stroke="currentColor" stroke-width="${big ? 2 : 1.4}"/>`;
  }
  const ax = x0 + step * at;
  const svg = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="수직선">
    <line x1="${x0}" y1="${y}" x2="${x1}" y2="${y}" stroke="currentColor" stroke-width="1.6"/>
    ${ticks}
    <line x1="${ax.toFixed(1)}" y1="${y + 30}" x2="${ax.toFixed(1)}" y2="${y + 11}" stroke="var(--chal-mark, #d6336c)" stroke-width="2.4"/>
    <polygon points="${ax.toFixed(1)},${y + 8} ${(ax - 4.5).toFixed(1)},${y + 17} ${(ax + 4.5).toFixed(1)},${y + 17}" fill="var(--chal-mark, #d6336c)"/>
    <text x="${ax.toFixed(1)}" y="${y + 48}" text-anchor="middle" font-size="13" fill="currentColor">${esc(f.mark || '㉠')}</text>
    <text x="${x0}" y="${y + 24}" text-anchor="middle" font-size="12" fill="currentColor">${esc(f.left || '0')}</text>
    <text x="${x1}" y="${y + 24}" text-anchor="middle" font-size="12" fill="currentColor">${esc(f.right || '')}</text>
  </svg>`;
  const box = el('div', 'chal-fig chal-numline');
  box.innerHTML = svg;
  return box;
}

/** ㉠ ─(1/10)→ 8.07 ─(1/10)→ ㉡ */
function flowEl(f) {
  const box = el('div', 'chal-fig chal-flow');
  const boxes = f.boxes || [];
  const ops = f.ops || [];
  boxes.forEach((b, i) => {
    if (i > 0) {
      const a = el('div', 'chal-flow-arrow');
      a.appendChild(el('span', 'chal-flow-op', ops[i - 1] || ''));
      a.appendChild(el('span', 'chal-flow-line', '→'));
      box.appendChild(a);
    }
    box.appendChild(el('div', `chal-flow-box${/^[㉠-㉿]$/.test(b) ? ' is-blank' : ''}`, b));
  });
  return box;
}

/** 0.5 ↓ [+3.6] ↓ □ */
function machineEl(f) {
  const box = el('div', 'chal-fig chal-machine');
  box.appendChild(el('div', 'chal-machine-in', f.in));
  box.appendChild(el('div', 'chal-machine-arrow', '↓'));
  box.appendChild(el('div', 'chal-machine-op', f.op));
  box.appendChild(el('div', 'chal-machine-arrow', '↓'));
  box.appendChild(el('div', 'chal-machine-out is-blank', f.out || '□'));
  return box;
}

/** 가로 + / 세로 − 표 */
function gridEl(f) {
  const box = el('div', 'chal-fig chal-grid');
  const mk = (cls, t) => el('div', `chal-cell ${cls}`, t);
  box.appendChild(el('div', 'chal-grid-op chal-grid-plus', '＋ →'));
  box.appendChild(el('div', 'chal-grid-op chal-grid-minus', '− ↓'));
  const g = el('div', 'chal-grid-body');
  g.appendChild(mk('', f.a));
  g.appendChild(mk('', f.b));
  g.appendChild(mk('is-blank', '?'));
  g.appendChild(mk('', f.c));
  g.appendChild(mk('is-empty', ''));
  g.appendChild(mk('is-empty', ''));
  g.appendChild(mk('is-blank', '?'));
  box.appendChild(g);
  return box;
}

/** 카드 6 9 8 . */
function cardsEl(f) {
  const box = el('div', 'chal-fig chal-cards');
  for (const t of f.items || []) box.appendChild(el('div', 'chal-card', t));
  return box;
}

/** ㉠ … / ㉡ … 목록 */
function listEl(f) {
  const box = el('div', `chal-fig chal-list${f.inline ? ' is-inline' : ''}`);
  for (const r of f.rows || []) box.appendChild(el('div', 'chal-list-row', r));
  return box;
}

/** 사람 + 말풍선 */
function talkEl(f, withPick) {
  const box = el('div', 'chal-fig chal-talk');
  for (const [who, what] of f.rows || []) {
    const line = el('div', 'chal-talk-row');
    line.appendChild(el('span', 'chal-talk-who', who));
    line.appendChild(el('span', 'chal-talk-what', what));
    box.appendChild(line);
  }
  if (withPick && f.pick) {
    const p = el('div', 'chal-pick');
    p.appendChild(el('span', 'chal-pick-label', '보기'));
    for (const t of f.pick) p.appendChild(el('span', 'chal-pick-item', t));
    box.appendChild(p);
  }
  return box;
}

/** 9.35 > 9.□7 같은 한 줄 식 */
function exprEl(f) {
  return el('div', 'chal-fig chal-expr', f.text || '');
}

/** 7.5−1.86 ○ 8.24−2.8 */
function compareEl(f) {
  const box = el('div', 'chal-fig chal-compare');
  box.appendChild(el('div', 'chal-compare-side', f.left));
  box.appendChild(el('div', 'chal-compare-circle', '○'));
  box.appendChild(el('div', 'chal-compare-side', f.right));
  return box;
}

function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

/** 꺾은선그래프 하나 — 제목 + 그림 (📊 K 줄기와 같은 그림, 우리 코드가 만든 SVG만 innerHTML로) */
function chartBox(spec, title) {
  const box = el('div', 'chal-chart math-fig');
  if (title) box.appendChild(el('div', 'chal-chart-title', title));
  const g = el('div', 'chal-chart-svg');
  g.innerHTML = figureSvg(spec);
  box.appendChild(g);
  return box;
}
function chartEl(f) {
  const box = el('div', 'chal-fig chal-charts');
  box.appendChild(chartBox(f.spec, f.title));
  return box;
}
/** 그래프 두 개를 나란히 (해 뜨는 시각 · 해 지는 시각) */
function chartsEl(f) {
  const box = el('div', 'chal-fig chal-charts is-two');
  for (const c of f.list || []) box.appendChild(chartBox(c.spec, c.title));
  return box;
}
/** 표 — 첫 칸이 항목 이름 (요일 / 우유의 양) */
function tableEl(f) {
  const box = el('div', 'chal-fig chal-table-wrap');
  if (f.title) box.appendChild(el('div', 'chal-chart-title', f.title));
  const t = el('table', 'chal-table');
  for (const [ri, row] of (f.rows || []).entries()) {
    const tr = el('tr');
    row.forEach((c, ci) => tr.appendChild(el(ci === 0 || ri === 0 ? 'th' : 'td', '', c)));
    t.appendChild(tr);
  }
  box.appendChild(t);
  return box;
}

// ───────────────────── 다각형 (v246 6단원) ─────────────────────

const POLY_NAME = { 3: '삼각형', 4: '사각형', 5: '오각형', 6: '육각형', 7: '칠각형', 8: '팔각형', 9: '구각형', 10: '십각형' };

/** 그릴 대각선 쌍 — lines: 'all' 모두 · 꼭짓점 번호면 그 꼭짓점에서만 */
function linePairs(n, lines) {
  const out = [];
  for (let a = 0; a < n; a++) {
    for (let b = a + 1; b < n; b++) {
      if (diagKind(n, a, b) !== 'diag') continue;
      if (lines === 'all' || a === lines || b === lines) out.push([a, b]);
    }
  }
  return out;
}

/** 사각형 두 대각선이 수직이면 만나는 점의 직각 표시 (작은 네모) — 아니면 '' (테스트가 자리를 잰다) */
export function rightMarkSvg(P) {
  if (P.length !== 4) return '';
  const [A, B, C, D] = P;
  const u = [C[0] - A[0], C[1] - A[1]];
  const v = [D[0] - B[0], D[1] - B[1]];
  const lu = Math.hypot(...u);
  const lv = Math.hypot(...v);
  if (!lu || !lv || Math.abs(u[0] * v[0] + u[1] * v[1]) / (lu * lv) > 1e-6) return '';
  const den = u[0] * v[1] - u[1] * v[0];
  const t = ((B[0] - A[0]) * v[1] - (B[1] - A[1]) * v[0]) / den;
  const I = [A[0] + u[0] * t, A[1] + u[1] * t];
  const s = 7;
  const e1 = [(u[0] / lu) * s, (u[1] / lu) * s];
  const e2 = [(v[0] / lv) * s, (v[1] / lv) * s];
  const p = (q) => `${q[0].toFixed(1)},${q[1].toFixed(1)}`;
  return `<polyline points="${p([I[0] + e1[0], I[1] + e1[1]])} ${p([I[0] + e1[0] + e2[0], I[1] + e1[1] + e2[1]])} ${p([I[0] + e2[0], I[1] + e2[1]])}" fill="none" stroke="var(--chal-mark, #d6336c)" stroke-width="1.6"/>`;
}

/**
 * 다각형 그림 — f.shapes: [{ label?, pts:[[x,y]…], mark? 표시된 꼭짓점 번호 }] (도형끼리 같은 배율 — 문제집처럼 크기를 견줄 수 있게)
 *  · f.lines: 'all' 대각선 모두 · 꼭짓점 번호면 그 꼭짓점에서만 (답 그림) · f.right: 수직인 사각형 대각선에 직각 표시
 *  · f.board: ✍️ 대각선 그어 보기 — 꼭짓점 두 개를 누르면 선이 그어지고 수를 센다(이웃한 꼭짓점이면 "변이에요", 두 번이면 "이미") ·
 *    채점과 상관없는 도우미라 저장하지 않는다 (아이가 대각선을 두 번 세거나 변까지 세는 착각을 손으로 확인하게)
 */
function polysEl(f) {
  const shapes = (f.shapes || []).filter((s) => s && Array.isArray(s.pts) && s.pts.length >= 3);
  if (!shapes.length) return null;
  const one = shapes.length === 1;
  const H = one ? 170 : 92;
  const maxW = one ? 280 : 130;
  const PAD = 12;
  const box0 = shapes.map((s) => {
    const xs = s.pts.map((q) => Number(q[0]));
    const ys = s.pts.map((q) => Number(q[1]));
    return { minX: Math.min(...xs), minY: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs) || 1, h: Math.max(...ys) - Math.min(...ys) || 1 };
  });
  const k = Math.min(...box0.map((b) => Math.min(H / b.h, maxW / b.w)));
  const wrap = el('div', `chal-fig chal-polys${one ? ' is-one' : ''}`);
  const row = el('div', 'chal-polys-row');
  wrap.appendChild(row);
  // f.boardFrom: 표시된 꼭짓점(mark)에서 긋는 대각선만 받는다 (14번 — "한 꼭짓점에서"를 묻는데 전체 수를 세지 않게, Codex 58차)
  const board = f.board ? { pick: null, lines: shapes.map(() => new Map()), msg: null, svgs: [], from: f.boardFrom ? shapes.map((s) => (Number.isInteger(s.mark) ? s.mark : null)) : null } : null;
  const hello = board && board.from ? '✍️ 표시된 꼭짓점(●)과 다른 꼭짓점을 차례로 누르면 대각선을 그어요' : '✍️ 꼭짓점 두 개를 차례로 누르면 대각선을 그어요';

  shapes.forEach((s, si) => {
    const b = box0[si];
    const P = s.pts.map(([x, y]) => [PAD + (Number(x) - b.minX) * k, PAD + (Number(y) - b.minY) * k]);
    const n = P.length;
    const W = b.w * k + PAD * 2;
    const HH = b.h * k + PAD * 2;
    const pts = P.map((q) => `${q[0].toFixed(1)},${q[1].toFixed(1)}`).join(' ');
    let inner = `<polygon points="${pts}" fill="#fbf7ff" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>`;
    if (f.lines !== undefined && f.lines !== null) {
      for (const [a, c] of linePairs(n, f.lines)) inner += `<line x1="${P[a][0].toFixed(1)}" y1="${P[a][1].toFixed(1)}" x2="${P[c][0].toFixed(1)}" y2="${P[c][1].toFixed(1)}" stroke="var(--chal-mark, #d6336c)" stroke-width="1.8"/>`;
      if (f.right) inner += rightMarkSvg(P);
    }
    inner += '<g class="chal-poly-drawn"></g>';
    P.forEach((q, i) => {
      const big = s.mark === i;
      inner += `<circle cx="${q[0].toFixed(1)}" cy="${q[1].toFixed(1)}" r="${big ? 5.5 : 2.6}" fill="currentColor"/>`;
    });
    const name = POLY_NAME[n] || `${n}각형`;
    const label = `${s.label ? `${s.label}: ` : ''}${name}${Number.isInteger(s.mark) ? ' — 꼭짓점 하나에 점 표시' : ''}${f.lines === 'all' ? ' — 대각선을 모두 그음' : Number.isInteger(f.lines) ? ' — 표시된 꼭짓점에서 대각선을 그음' : ''}`;
    const cell = el('div', 'chal-poly');
    const svgBox = el('div', 'chal-poly-svg');
    svgBox.style.width = `${Math.round(W)}px`;
    // 판이면 안에 누를 꼭짓점이 있으니 group (img는 속을 한 장의 그림으로 읽어 버튼이 묻힌다, Codex 58차)
    svgBox.innerHTML = board
      ? `<svg viewBox="0 0 ${W.toFixed(1)} ${HH.toFixed(1)}" role="group" aria-label="${esc(`${label} — ✍️ 꼭짓점을 눌러 대각선을 그어 보는 판`)}">${inner}</svg>`
      : `<svg viewBox="0 0 ${W.toFixed(1)} ${HH.toFixed(1)}" role="img" aria-label="${esc(label)}">${inner}</svg>`;
    cell.appendChild(svgBox);
    if (s.label) cell.appendChild(el('div', 'chal-poly-label', s.label));
    row.appendChild(cell);
    if (board) {
      const svg = svgBox.querySelector('svg');
      board.svgs[si] = { svg, P, label: s.label || '' };
      P.forEach((q, i) => {
        const hit = document.createElementNS(SVGNS, 'circle');
        hit.setAttribute('cx', q[0].toFixed(1));
        hit.setAttribute('cy', q[1].toFixed(1));
        hit.setAttribute('r', '15');
        hit.setAttribute('class', 'chal-poly-hit');
        hit.setAttribute('tabindex', '0');
        hit.setAttribute('role', 'button');
        hit.setAttribute('aria-label', `${s.label ? `${s.label} ` : ''}꼭짓점 ${i + 1}${s.mark === i ? ' (표시된 꼭짓점)' : ''}`);
        hit.setAttribute('aria-pressed', 'false');
        hit.dataset.shape = String(si);
        hit.dataset.v = String(i);
        const go = () => tapVertex(board, shapes, si, i);
        hit.addEventListener('click', go);
        hit.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } });
        svg.appendChild(hit);
      });
    }
  });

  if (board) {
    const tools = el('div', 'chal-board');
    board.msg = el('p', 'chal-board-msg', hello);
    board.msg.setAttribute('role', 'status');
    board.msg.setAttribute('aria-live', 'polite');
    tools.appendChild(board.msg);
    const clear = el('button', 'btn btn-small chal-board-clear', '🧽 다 지우기');
    clear.type = 'button';
    clear.addEventListener('click', () => {
      board.lines.forEach((m) => m.clear());
      board.pick = null;
      board.svgs.forEach((x) => { x.svg.querySelector('.chal-poly-drawn').textContent = ''; });
      paintPick(board);
      board.msg.textContent = `✍️ 다 지웠어요 — ${hello.replace('✍️ ', '')}`;
    });
    tools.appendChild(clear);
    wrap.appendChild(tools);
  }
  return wrap;
}

/** 그어 보기 판 — 고른 꼭짓점 칠하기 */
function paintPick(board) {
  board.svgs.forEach((x, si) => {
    for (const h of x.svg.querySelectorAll('.chal-poly-hit')) {
      const on = !!board.pick && board.pick.si === si && board.pick.v === Number(h.dataset.v);
      h.classList.toggle('is-pick', on);
      h.setAttribute('aria-pressed', on ? 'true' : 'false');
    }
  });
}

/** 그어 보기 판 — 그은 대각선 수 한 줄 */
function boardCount(board, shapes) {
  if (board.from && shapes.length === 1) return `표시된 꼭짓점에서 그은 대각선 ${board.lines[0].size}개`;
  if (shapes.length === 1) return `그은 대각선 ${board.lines[0].size}개`;
  return shapes.map((s, i) => `${s.label || i + 1} ${board.lines[i].size}개`).join(' · ');
}

/** 그어 보기 판 — 꼭짓점을 눌렀다 (테스트가 가짜 판으로 누른다) */
export function tapVertex(board, shapes, si, v) {
  const n = shapes[si].pts.length;
  if (!board.pick || board.pick.si !== si) {
    board.pick = { si, v };
    paintPick(board);
    board.msg.textContent = `${shapes[si].label ? `${shapes[si].label}의 ` : ''}꼭짓점을 골랐어요 — 이을 꼭짓점을 눌러요`;
    return;
  }
  const a = board.pick.v;
  const kind = diagKind(n, a, v);
  if (kind === 'same') { board.pick = null; paintPick(board); board.msg.textContent = '고른 꼭짓점을 놓았어요'; return; }
  board.pick = null;
  paintPick(board);
  if (kind === 'side') { board.msg.textContent = '그건 이웃한 꼭짓점끼리라 변이에요 — 대각선은 이웃하지 않는 꼭짓점끼리 이어요'; return; }
  const from = board.from ? board.from[si] : null;
  if (Number.isInteger(from) && a !== from && v !== from) { board.msg.textContent = '이 문제는 표시된 꼭짓점(●)에서 긋는 대각선만 세요 — ● 꼭짓점을 먼저 눌러 봐요'; return; }
  const key = a < v ? `${a}-${v}` : `${v}-${a}`;
  const lines = board.lines[si];
  if (lines.has(key)) { board.msg.textContent = `이미 그은 대각선이에요 · ${boardCount(board, shapes)}`; return; }
  const { svg, P } = board.svgs[si];
  const ln = document.createElementNS(SVGNS, 'line');
  ln.setAttribute('x1', P[a][0].toFixed(1));
  ln.setAttribute('y1', P[a][1].toFixed(1));
  ln.setAttribute('x2', P[v][0].toFixed(1));
  ln.setAttribute('y2', P[v][1].toFixed(1));
  ln.setAttribute('class', 'chal-poly-line');
  svg.querySelector('.chal-poly-drawn').appendChild(ln);
  lines.set(key, ln);
  board.msg.textContent = `✍️ ${boardCount(board, shapes)}`;
}

/** 문제의 그림 하나 (없으면 null). 배열이면 차례로 (표 + 그래프) */
export function figureEl(fig) {
  if (Array.isArray(fig)) {
    const box = el('div', 'chal-figs');
    for (const f of fig) { const e = figureEl(f); if (e) box.appendChild(e); }
    return box.children.length ? box : null;
  }
  if (!fig || !fig.kind) return null;
  switch (fig.kind) {
    case 'chart': return chartEl(fig);
    case 'blankgraph': return blankGraphEl(fig);
    case 'charts': return chartsEl(fig);
    case 'table': return tableEl(fig);
    case 'numline': return numlineEl(fig);
    case 'flow': return flowEl(fig);
    case 'machine': return machineEl(fig);
    case 'grid': return gridEl(fig);
    case 'cards': return cardsEl(fig);
    case 'list': return listEl(fig);
    case 'talk': return talkEl(fig, false);
    case 'talkbox': return talkEl(fig, true);
    case 'expr': return exprEl(fig);
    case 'compare': return compareEl(fig);
    case 'polys': return polysEl(fig);
    default: return null;
  }
}

// ───────────────────── 답칸 ─────────────────────

const KEYS = ['7', '8', '9', '4', '5', '6', '1', '2', '3', '0', '.', '⌫'];

/**
 * 한 칸의 입력 위젯 → { el, value, clear, filled }
 * @param {{input:string, label?:string, unit?:string, choices?:string[]}} part
 * @param {() => void} onChange 값이 바뀔 때 (확인 버튼을 켜고 끄려고)
 */
export function inputEl(part, onChange = () => {}) {
  const kind = (part && part.input) || 'num';
  const wrap = el('div', `chal-in chal-in-${kind}`);
  if (part.label) wrap.appendChild(el('div', 'chal-in-label', part.label));

  if (kind === 'num') return numInput(part, wrap, onChange);
  if (kind === 'choice') return choiceInput(part, wrap, onChange);
  if (kind === 'many') return manyInput(part, wrap, onChange);
  if (kind === 'order') return orderInput(part, wrap, onChange);
  if (kind === 'plot') return plotInput(part, wrap, onChange);
  return { el: wrap, value: () => null, clear() {}, filled: () => false };
}

/**
 * ✍️ 점 여러 개 찍기 — 빈 꺾은선그래프에서 날마다 점을 찍는다 (5단원 07·12 "꺾은선그래프로 나타내 보세요").
 * part.chart: 정답이 든 그래프 지시문(`lgraph 0.1x5 L 월:0.6 …`) — 눈금은 같게, 값은 모두 숨겨 빈 그래프로 그린다.
 * 누른 곳의 가로 위치 → 어느 날, 세로 위치 → 가장 가까운 눈금선(📊 점 찍기 판과 같은 자 chartGeom). 찍은 점끼리는 선분으로 잇는다.
 * ▲▼는 마지막에 고른 날의 점을 한 칸씩. 값은 화면에 쓰지 않는다 — 눈금을 읽어 찍는 게 이 문제다.
 */
/**
 * 값 없는 빈 꺾은선그래프 — 07·12 점 찍기 판과 06·11 "눈금 한 칸은?"의 빈 그래프가 **같은 칸 수**가 되게 한 곳에서 만든다.
 * hide: 맨 아래(물결선 위 첫 눈금) 말고는 눈금에 수를 안 적는다 — 문제집 128쪽 12번 빈 그래프처럼
 */
function blankChart(chart, hide = false) {
  const kind = String(chart || '').split(' ')[0];
  const full = kind === 'lgraph' ? parseChart(kind, String(chart).slice(kind.length + 1)) : null;
  if (!full) return null;
  const vals = full.items.map((x) => x.v).filter((v) => v !== null);
  return { ...full, top: Math.max(...vals), items: full.items.map((x) => ({ label: x.label, v: null })), ...(hide ? { hide: true } : {}) };
}
/** 빈 그래프 SVG를 넣고 ? 다섯 개(값 자리)는 지운다 — 빈 그래프에서는 소음 */
function putBlank(g, blank) {
  g.innerHTML = lgraphSvg(blank);
  const svg = g.querySelector('svg');
  for (const t of [...svg.querySelectorAll('text')]) if (t.textContent === '?') t.remove();
  return svg;
}
/** 06·11 그림 — 표 옆에 07·12와 같은 빈 그래프 (문제집에선 같은 쪽에 있어서 그 칸 수가 눈금 한 칸을 정한다, Codex 20차 #2) */
function blankGraphEl(f) {
  const blank = blankChart(f.chart, true);
  if (!blank) return null;
  const box = el('div', 'chal-fig chal-charts');
  const fig = el('div', 'chal-chart math-fig');
  if (f.title) fig.appendChild(el('div', 'chal-chart-title', f.title));
  const g = el('div', 'chal-chart-svg');
  putBlank(g, blank);
  fig.appendChild(g);
  box.appendChild(fig);
  return box;
}

function plotInput(part, wrap, onChange) {
  const blank = blankChart(part.chart);
  if (!blank) return { el: wrap, value: () => null, clear() {}, filled: () => false };
  const G = chartGeom(blank);
  const n = blank.items.length;
  const cells = new Array(n).fill(null);
  let sel = 0;

  wrap.appendChild(el('div', 'chal-in-hint', '날마다 알맞은 자리를 눌러 점을 찍어요 — 찍은 점은 선으로 이어져요'));
  const fig = el('div', 'chal-chart math-fig chal-plot');
  if (part.title) fig.appendChild(el('div', 'chal-chart-title', part.title));
  const g = el('div', 'chal-chart-svg');
  fig.appendChild(g);
  wrap.appendChild(fig);
  const svg = putBlank(g, blank);
  svg.classList.add('is-drawable');
  const mk = (tag, a) => { const e = document.createElementNS(SVGNS, tag); for (const [k, v] of Object.entries(a)) e.setAttribute(k, String(v)); return e; };
  const colHi = mk('rect', { class: 'plot-col', x: 0, y: G.yOfCells(G.cells) - 6, width: G.colW, height: G.y0 + G.wave - G.yOfCells(G.cells) + 6, rx: 6 });
  svg.insertBefore(colHi, svg.firstChild);
  const layer = mk('g', { class: 'plot-layer' });
  svg.appendChild(layer);

  const say = el('div', 'chal-plot-say');
  wrap.appendChild(say);
  const nudge = el('div', 'chal-plot-nudge');
  const up = el('button', 'btn chal-plot-step', '▲ 한 칸 위로');
  const down = el('button', 'btn chal-plot-step', '▼ 한 칸 아래로');
  for (const [b, d] of [[up, 1], [down, -1]]) {
    b.type = 'button';
    b.addEventListener('click', () => { const k = cells[sel] === null ? 0 : cells[sel] + d; cells[sel] = Math.min(G.cells, Math.max(0, k)); paint(); });
    nudge.appendChild(b);
  }
  wrap.appendChild(nudge);

  const at = (e) => {
    const m = svg.getScreenCTM();
    if (!m) return null;
    const p = svg.createSVGPoint();
    p.x = e.clientX; p.y = e.clientY;
    const q = p.matrixTransform(m.inverse());
    let i = 0; for (let j = 1; j < n; j++) if (Math.abs(G.x(j) - q.x) < Math.abs(G.x(i) - q.x)) i = j;
    return { i, k: G.cellsOf(q.y) };
  };
  let drag = false;
  svg.addEventListener('pointerdown', (e) => {
    const h = at(e);
    if (!h) return;
    drag = true;
    try { svg.setPointerCapture(e.pointerId); } catch { /* 캡처를 못 해도 누른 자리는 정한다 */ }
    sel = h.i; cells[sel] = h.k; paint();
    e.preventDefault();
  });
  svg.addEventListener('pointermove', (e) => { if (!drag) return; const h = at(e); if (h) { cells[sel] = h.k; paint(); } }); // 끄는 동안은 처음 고른 날 그대로
  const stop = () => { drag = false; };
  svg.addEventListener('pointerup', stop);
  svg.addEventListener('pointercancel', stop);

  function paint() {
    layer.innerHTML = '';
    colHi.setAttribute('x', G.x(sel) - G.colW / 2);
    const pts = cells.map((k, i) => (k === null ? null : [G.x(i), G.yOfCells(k)]));
    for (let i = 0; i + 1 < n; i++) if (pts[i] && pts[i + 1]) layer.appendChild(mk('line', { class: 'plot-seg', x1: pts[i][0], y1: pts[i][1], x2: pts[i + 1][0], y2: pts[i + 1][1] }));
    pts.forEach((p, i) => { if (p) layer.appendChild(mk('circle', { class: `plot-dot${i === sel ? ' is-sel' : ''}`, cx: p[0], cy: p[1], r: 6.5 })); });
    const done = cells.filter((k) => k !== null).length;
    say.textContent = `${blank.items[sel].label} 고르는 중 · 점 ${done} / ${n}개 찍었어요`;
    up.disabled = cells[sel] !== null && cells[sel] >= G.cells;
    down.disabled = cells[sel] === null || cells[sel] <= 0;
    onChange();
  }
  paint();
  return {
    el: wrap,
    value: () => cells.map((k) => (k === null ? null : G.valueOfCells(k))),
    clear() { cells.fill(null); sel = 0; paint(); },
    filled: () => cells.every((k) => k !== null),
  };
}

function numInput(part, wrap, onChange) {
  let text = '';
  const row = el('div', 'chal-num-row');
  const show = el('div', 'chal-num-show');
  row.appendChild(show);
  if (part.unit) row.appendChild(el('span', 'chal-num-unit', part.unit));
  wrap.appendChild(row);

  const pad = el('div', 'chal-pad');
  const paint = () => {
    show.textContent = text || '';
    show.classList.toggle('is-empty', !text);
    onChange();
  };
  for (const k of KEYS) {
    const b = el('button', `btn chal-key${k === '⌫' ? ' chal-key-del' : ''}`, k);
    b.type = 'button';
    b.addEventListener('click', () => {
      if (k === '⌫') text = text.slice(0, -1);
      else if (k === '.') { if (!text.includes('.')) text += text ? '.' : '0.'; }
      else if (text.length < 9) text += k;
      paint();
    });
    pad.appendChild(b);
  }
  wrap.appendChild(pad);
  paint();
  return { el: wrap, value: () => text, clear() { text = ''; paint(); }, filled: () => text.length > 0 && text !== '0.' };
}

function choiceInput(part, wrap, onChange) {
  let picked = null;
  const box = el('div', `chal-choices${(part.choices || []).some((c) => String(c).length > 6) ? ' is-tall' : ''}`);
  const btns = [];
  for (const c of part.choices || []) {
    const b = el('button', 'btn chal-choice', c);
    b.type = 'button';
    b.addEventListener('click', () => {
      picked = c;
      for (const x of btns) x.classList.toggle('on', x === b);
      onChange();
    });
    btns.push(b);
    box.appendChild(b);
  }
  wrap.appendChild(box);
  return {
    el: wrap,
    value: () => picked,
    clear() { picked = null; for (const x of btns) x.classList.remove('on'); onChange(); },
    filled: () => picked !== null,
  };
}

function manyInput(part, wrap, onChange) {
  const chosen = new Set();
  wrap.appendChild(el('div', 'chal-in-hint', '맞는 것을 모두 눌러요'));
  const box = el('div', `chal-choices${(part.choices || []).some((c) => String(c).length > 6) ? ' is-tall' : ''}`); // 5단원 14번 같은 긴 문장은 한 줄에 하나씩
  for (const c of part.choices || []) {
    const b = el('button', 'btn chal-choice', c);
    b.type = 'button';
    b.addEventListener('click', () => {
      if (chosen.has(c)) chosen.delete(c); else chosen.add(c);
      b.classList.toggle('on', chosen.has(c));
      onChange();
    });
    box.appendChild(b);
  }
  wrap.appendChild(box);
  return {
    el: wrap,
    value: () => [...chosen],
    clear() { chosen.clear(); for (const b of box.querySelectorAll('button')) b.classList.remove('on'); onChange(); },
    filled: () => chosen.size > 0,
  };
}

function orderInput(part, wrap, onChange) {
  const order = [];
  wrap.appendChild(el('div', 'chal-in-hint', '차례대로 눌러요'));
  const picked = el('div', 'chal-order-picked');
  const box = el('div', 'chal-choices');
  const btns = new Map();

  const paint = () => {
    picked.textContent = order.length ? order.map((t, i) => `${i + 1}. ${t}`).join('   ') : '아직 안 골랐어요';
    picked.classList.toggle('is-empty', !order.length);
    for (const [c, b] of btns) b.classList.toggle('on', order.includes(c));
    onChange();
  };
  for (const c of part.choices || []) {
    const b = el('button', 'btn chal-choice', c);
    b.type = 'button';
    b.addEventListener('click', () => {
      const i = order.indexOf(c);
      if (i >= 0) order.splice(i, 1); else order.push(c);   // 다시 누르면 뺀다
      paint();
    });
    btns.set(c, b);
    box.appendChild(b);
  }
  const undo = el('button', 'btn chal-order-undo', '↩ 하나 지우기');
  undo.type = 'button';
  undo.addEventListener('click', () => { order.pop(); paint(); });

  wrap.appendChild(picked);
  wrap.appendChild(box);
  wrap.appendChild(undo);
  paint();
  return {
    el: wrap,
    value: () => [...order],
    clear() { order.length = 0; paint(); },
    filled: () => order.length === (part.choices || []).length,
  };
}
