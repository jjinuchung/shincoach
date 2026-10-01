// ✍️ 점 찍기 판 — 📊 K 자료와 그래프 줄기의 그리기 문항(문항의 `draw` = {fig, mode, target}).
// K2 "포도 막대는 몇 칸만큼 그려야 할까요?" · K5 "3월의 점은 물결선 위 첫 눈금에서 몇 칸 위에 찍어야 할까요?"
//
// 왜 (2026-10-01, 아버님 "그래프 그리기는 니 추천대로"): 문제집 5단원 07·12번은 그래프를 **직접 그리는** 문제다.
// 보기 네 개 중 "3칸"을 고르는 것과, 눈금을 세어 막대를 3칸 올리는 것은 다른 일이다.
//
// 채점은 하지 않는다 — 숫자판(padview.js)과 같은 모양: "확인"을 누르면 onSubmit({text: 칸 수, val})를 부르고
// math.js가 matchTyped로 보기 번호를 찾아 원래 채점 길(answer)로 보낸다. 그린 칸 수가 오답 보기의 값과 같으면
// 그 오개념(값을 그대로 칸으로 · 물결선을 무시하고 0부터)이 그대로 쌓이고, 어느 보기와도 다르면 "짐작한 답"이다.
//
// ★ 눈금은 mathdraw.chartGeom 하나 — 아이가 본 그림과 만지는 그림이 같은 자여야 한다. 그림도 figureSvg 그대로 그리고
//   그 위에 층 하나만 얹는다(막대·점·이웃 점과 잇는 선). 손가락 아래 y → 가장 가까운 눈금선(cellsOf).
// ★ 끌고 있는 동안 SVG 요소를 DOM에서 옮기지 않는다(포인터 캡처가 풀린다 — v24 드래그 교훈). 속성만 바꾼다.
import { figureSvg, parseChart, chartGeom } from './mathdraw.js';
import { textVal } from './mathpad.js';

const NS = 'http://www.w3.org/2000/svg';

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}
function svgEl(tag, attrs) {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, String(v));
  return e;
}

/** draw → 그래프 자료·자 (못 그리면 null) */
function geomOf(draw) {
  const kind = String(draw && draw.fig || '').split(' ')[0];
  if (kind !== 'bgraph' && kind !== 'lgraph') return null;
  const sp = parseChart(kind, draw.fig.slice(kind.length + 1));
  const G = chartGeom(sp);
  return G && sp.items[draw.target] && sp.items[draw.target].v === null ? { kind, sp, G } : null;
}

/** 이 draw를 판으로 그릴 수 있나 — math.js가 문제 글에서 그래프를 뺄지 정할 때 (못 그리면 보기·숫자판 그대로) */
export const canDraw = (draw) => !!geomOf(draw);

/** 칸 수를 말로 — 막대 "3칸" · 점 "물결선 위 첫 눈금에서 4칸 위" / "0에서 4칸 위" */
function cellsSay(mode, G, k) {
  if (mode === 'bar') return `막대 ${k}칸`;
  return `${G.b ? '물결선 위 첫 눈금' : '0'}에서 ${k}칸 위`;
}

/**
 * 그래프 위에 그린 것 — 막대(bar) 또는 점(point)과 이웃 점을 잇는 선. k가 null이면 아무것도 안 그린다.
 * 같은 층을 판(drawBox)과 답한 뒤(drawAnswered)가 같이 쓴다.
 */
function layer(svg, g, mode, k, cls) {
  const { G, sp } = g;
  const grp = svgEl('g', { class: `draw-layer ${cls}` });
  const t = g.target;
  const x = G.x(t);
  const bw = Math.round(G.colW * 0.5);
  if (mode === 'bar') {
    const rect = svgEl('rect', { class: 'draw-bar', x: x - bw / 2, y: G.y0, width: bw, height: 0, rx: 2 });
    grp.appendChild(rect);
    grp.set = (kk) => { const y = G.yOfCells(kk || 0); rect.setAttribute('y', y); rect.setAttribute('height', G.y0 - y); rect.style.display = kk ? '' : 'none'; };
  } else {
    // 이웃한 점이 있으면 선으로 잇는다 — 꺾은선그래프는 이어야 완성이다
    const nb = [t - 1, t + 1].filter((i) => sp.items[i] && sp.items[i].v !== null).map((i) => [G.x(i), G.y(Math.round(sp.items[i].v * G.S))]);
    const segs = nb.map(([nx, ny]) => { const s = svgEl('line', { class: 'draw-seg', x1: nx, y1: ny, x2: x, y2: G.y0 }); grp.appendChild(s); return s; });
    const dot = svgEl('circle', { class: 'draw-dot', cx: x, cy: G.y0, r: 7 });
    grp.appendChild(dot);
    grp.set = (kk) => {
      const on = kk !== null && kk !== undefined;
      const y = G.yOfCells(on ? kk : 0);
      dot.setAttribute('cy', y);
      for (const s of segs) s.setAttribute('y2', y);
      for (const e of [dot, ...segs]) e.style.display = on ? '' : 'none';
    };
  }
  svg.appendChild(grp);
  grp.set(k);
  return grp;
}

/** figureSvg를 그린 상자 + 그 안의 svg (그림은 우리 코드가 만든 SVG 문자열뿐이다) */
function chartBox(draw) {
  const box = el('div', 'math-fig math-draw-fig');
  box.innerHTML = figureSvg(draw.fig);
  return { box, svg: box.querySelector('svg') };
}

/**
 * 점 찍기 판 한 벌.
 * @param {{fig:string, mode:'bar'|'point', target:number}} draw 문항의 draw
 * @param {{onSubmit:(typed:{text:string,val:object}) => void, onIdk:() => void}} hooks
 * @returns {HTMLElement | null} 그래프를 못 그리면 null (math.js가 보기로 되돌린다)
 */
export function drawBox(draw, { onSubmit, onIdk }) {
  const g = geomOf(draw);
  if (!g) return null;
  g.target = draw.target;
  const { G } = g;
  const mode = draw.mode === 'bar' ? 'bar' : 'point';
  const min = mode === 'bar' ? 1 : 0; // 막대는 1칸부터 (0칸 막대는 그린 게 아니다)
  let k = null;
  let done = false;

  const wrap = el('div', 'math-draw');
  wrap.appendChild(el('p', 'math-pad-lead', mode === 'bar' ? '✍️ 막대를 그려요 — ? 자리 위를 눌러 높이를 정해요' : '✍️ 점을 찍어요 — ? 자리 위를 눌러 점을 찍어요'));
  const { box, svg } = chartBox(draw);
  wrap.appendChild(box);
  // ? 글자 — 그리기 시작하면 숨긴다 (막대·점과 겹친다)
  const qMark = [...svg.querySelectorAll('text')].find((t) => t.textContent === '?' && Math.abs(Number(t.getAttribute('x')) - G.x(g.target)) < 0.5);
  // 누를 수 있는 기둥 — 손가락이 조금 빗나가도 되게 그 항목의 칸 너비 전체, 맨 위 눈금부터 가로축까지
  const hit = svgEl('rect', { class: 'draw-col', x: G.x(g.target) - G.colW / 2, y: G.yOfCells(G.cells) - 6, width: G.colW, height: G.y0 + G.wave - G.yOfCells(G.cells) + 6, rx: 6 });
  svg.insertBefore(hit, svg.firstChild);
  const lay = layer(svg, g, mode, null, 'is-live');
  svg.classList.add('is-drawable');

  const say = el('p', 'math-draw-say');
  wrap.appendChild(say);

  // ▲▼ 한 칸씩 — 손가락으로 맞추기 어려운 작은 화면용
  const nudge = el('div', 'math-draw-nudge');
  const up = el('button', 'btn math-draw-step', '▲ 한 칸 위로');
  const down = el('button', 'btn math-draw-step', '▼ 한 칸 아래로');
  for (const [b, d] of [[up, 1], [down, -1]]) {
    b.type = 'button';
    b.addEventListener('click', () => { if (done) return; set(k === null ? (d > 0 ? Math.max(min, 1) : min) : k + d); });
    nudge.appendChild(b);
  }
  wrap.appendChild(nudge);

  const row = el('div', 'math-pad-actions');
  const ok = el('button', 'btn btn-primary btn-big-wide math-pad-ok', '확인');
  ok.type = 'button';
  ok.addEventListener('click', () => {
    if (done || k === null) return;
    done = true;
    paint();
    const text = String(k);
    onSubmit({ text, val: textVal(text) });
  });
  const idk = el('button', 'btn math-pad-idk', '🤷 모르겠어요');
  idk.type = 'button';
  idk.addEventListener('click', () => { if (done) return; done = true; paint(); onIdk(); });
  row.appendChild(ok);
  row.appendChild(idk);
  wrap.appendChild(row);

  function set(kk) {
    k = Math.min(G.cells, Math.max(min, kk));
    paint();
  }
  /** 손가락 아래 y → 칸 (svg 좌표로 바꿔서) */
  function cellsAt(e) {
    const m = svg.getScreenCTM();
    if (!m) return null;
    const p = svg.createSVGPoint();
    p.x = e.clientX; p.y = e.clientY;
    return G.cellsOf(p.matrixTransform(m.inverse()).y);
  }
  let dragging = false;
  svg.addEventListener('pointerdown', (e) => {
    if (done) return;
    const c = cellsAt(e);
    if (c === null) return;
    dragging = true;
    try { svg.setPointerCapture(e.pointerId); } catch { /* 캡처를 못 해도 누른 자리는 정한다 */ }
    set(c);
    e.preventDefault();
  });
  svg.addEventListener('pointermove', (e) => { if (!dragging || done) return; const c = cellsAt(e); if (c !== null) set(c); });
  const stop = () => { dragging = false; };
  svg.addEventListener('pointerup', stop);
  svg.addEventListener('pointercancel', stop);

  function paint() {
    lay.set(k);
    if (qMark) qMark.style.display = k === null ? '' : 'none';
    say.textContent = k === null ? (mode === 'bar' ? '아직 안 그렸어요' : '아직 안 찍었어요') : cellsSay(mode, G, k);
    say.classList.toggle('is-empty', k === null);
    up.disabled = done || (k !== null && k >= G.cells);
    down.disabled = done || k === null || k <= min;
    ok.disabled = done || k === null;
    idk.disabled = done;
    wrap.classList.toggle('is-done', done);
    svg.classList.toggle('is-drawable', !done);
  }
  paint();
  return wrap;
}

/**
 * 답한 뒤(또는 🎒에서 돌아와 다시 그릴 때) — 그린 그래프를 그대로 두고 "✍️ 내가 그린 막대: 3칸 ✔".
 * 틀렸으면 맞는 자리를 점선으로 같이 그린다(풀이 카드를 읽을 때 그래프가 눈앞에 있어야 한다).
 * @param {string} text 그린 칸 수("3") 또는 "모르겠어요"
 * @param {number|null} okK 정답 칸 수
 */
export function drawAnswered(draw, text, ok, okK) {
  const g = geomOf(draw);
  const wrap = el('div', `math-draw is-answered ${ok ? 'ok' : 'no'}`);
  const k = /^\d+$/.test(String(text)) ? Number(text) : null;
  const mode = draw && draw.mode === 'bar' ? 'bar' : 'point';
  if (g) {
    g.target = draw.target;
    const { box, svg } = chartBox(draw);
    const qMark = [...svg.querySelectorAll('text')].find((t) => t.textContent === '?' && Math.abs(Number(t.getAttribute('x')) - g.G.x(g.target)) < 0.5);
    if (qMark && (k !== null || !ok)) qMark.style.display = 'none';
    // 맞는 자리(점선, 속은 비움)를 내 막대 **위에** — 아래에 두면 내 막대가 더 길 때 점선이 빨간 막대에 묻힌다
    if (k !== null) layer(svg, g, mode, k, ok ? 'is-ok' : 'is-no');
    if (!ok && okK !== null && okK !== undefined) layer(svg, g, mode, okK, 'is-right');
    wrap.appendChild(box);
  }
  const p = el('p', `math-pad-answered ${ok ? 'ok' : 'no'}`);
  p.appendChild(document.createTextNode(k === null ? `✍️ 내 답: ${text} ` : mode === 'bar' ? `✍️ 내가 그린 막대: ${k}칸 ` : `✍️ 내가 찍은 점: ${g ? cellsSay(mode, g.G, k) : `${k}칸 위`} `));
  p.appendChild(el('span', 'mark', ok ? '✔' : '✘'));
  wrap.appendChild(p);
  if (!ok && okK !== null && okK !== undefined && g) wrap.appendChild(el('p', 'math-draw-right', `점선이 맞는 자리 — ${cellsSay(mode, g.G, okK)}`));
  return wrap;
}
