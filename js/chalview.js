// 🎯 도전 문제의 **그림**과 **답 입력칸** (2026-09-28)
//
// 문제집을 그대로 옮기려면 두 가지가 필요하다:
//   ① 문제마다 다른 그림 — 수직선·화살표 흐름·계산 상자·가로세로 표·카드·대화
//   ② 문제집처럼 쓰는 답칸 — 숫자판·고르기·여러 개 고르기·순서 놓기 (찍어서 맞힐 수 없게)
//
// 규칙(mathchal.js)과 떨어져 있다 — 이 파일은 DOM만 만들고 채점은 하지 않는다.

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

/** 문제의 그림 하나 (없으면 null) */
export function figureEl(fig) {
  if (!fig || !fig.kind) return null;
  switch (fig.kind) {
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
  return { el: wrap, value: () => null, clear() {}, filled: () => false };
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
  const box = el('div', 'chal-choices');
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
