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
//
// 🪞 M 합동과 대칭 — 모눈 판(draw.mode 'grid', 2026-10-02 M 3단계): "선대칭(점대칭)도형이 되도록 완성하려고 해요. 점 ㄴ의 대응점은?"
// 반쪽 도형만 그린 모눈에 아이가 점을 찍는다. 찍은 자리가 후보 점(㉠ 정답 · 밀기 · 두 배 · 뒤집기)과 같으면 그 보기를 고른 것 —
// 오개념 이름표가 그대로 쌓이고, 어느 후보와도 다르면 "짐작한 답"이다. 답이 ㉠~㉣라 숫자판(padSpec)은 없다.
// ★ 판의 범위 = 반쪽 + 완성한 쪽 + 후보 점 모두 — 후보 점을 숨겨도 그림 크기가 답 자리를 흘리지 않게 (mathdraw.symGeom의 box)
//
// 📈 R 좌표평면과 그래프 — 좌표평면 판(draw.mode 'plane', 2026-10-05 R 3단계): "좌표가 (2, −3)인 점은 어디일까요?"
// 빈 좌표평면(후보 ㉠~㉣ 없이)에 아이가 점을 찍는다. 찍은 자리가 후보(정답 · x와 y 바꿈 · x 부호 반대 · y 부호 반대)와 같으면
// 그 보기를 고른 것 — 오개념 이름표가 그대로 쌓이고, 어느 후보와도 다르면 "짐작한 답"(찍은 좌표 "(1, −3)")이다.
// 판의 범위는 문항의 fig(늘 −5~5) 그대로라 후보를 숨겨도 답 자리를 흘리지 않는다. 자는 mathdraw.planeGeom 하나(그림과 같은 자).
// ★ 찍는 동안에는 좌표를 말하지 않는다("원점에서 오른쪽으로 2칸, 아래로 3칸") — 좌표를 보여 주면 글자만 맞춰 찍게 된다. 답한 뒤에 좌표까지.
//
// 🧊 S 공간과 입체 — 칸 칠하기 판(draw.mode 'cells', 2026-10-06 S 3단계): "쌓은 모양을 앞에서 보면 어떤 모양일까요? 칸을 칠해 보세요."
// 교과서 S2 차시는 위·앞·옆에서 본 모양을 모눈에 **그린다** — 후보 넷 중 고르는 것과 다른 일이다. 쌓은 모양 그림은 문제 글에 두고
// 후보 ㉠~㉣ 그림([views …])만 빼서 빈 칸을 준다. 앞·옆(kind 'side')은 누른 칸까지 그 기둥을 아래부터 칠하고(같은 칸을 다시 누르면 한 층 내림),
// 위(kind 'top')는 누를 때마다 칠하고 지운다(아래쪽이 앞). 칠한 모양이 후보와 같으면 그 보기(오개념 이름표가 그대로 쌓인다),
// 어느 후보와도 다르면 "짐작한 답"("왼쪽부터 2, 3, 1층" · "뒤 줄부터 ■■□ / □■■")이다. 칠하는 동안의 말 = 풀이 카드의 말.
// ★ 판의 크기는 후보 모두가 들어가는 크기로 정해져 있다(앞·옆은 3층까지, 생성기가 draw.rows로 4층까지) — 판 크기가 답 모양을 흘리지 않게.
// (2026-10-06 v195) S1 어느 쪽에서 본 모양 고르기 · S5 수를 쓴 그림에서 앞·옆 모양 고르기에도 같은 판.
//
// 🔄 AB 평면도형의 이동 — 모눈점 찍기 판·모눈 칸 칠하기 판(2026-10-10 AB 3단계): 교과서 4-1 4단원은 점을 옮겨 **찍고**, 밀고·뒤집고·돌린 도형을 모눈에 **그린다**.
// · 점 찍기(draw.mode 'mpoint'): 출발점 ㄱ만 있는 모눈에 점을 찍는다. 찍은 자리가 후보 점(정답 · 출발점도 셈 · 반대쪽 · 가로세로 바꿈 · 한 방향만)이면
//   그 보기 — 오개념 이름표가 그대로 쌓이고, 아니면 "점 ㄱ에서 오른쪽으로 3칸, 위쪽으로 2칸"(짐작한 답).
//   ★ 찍는 동안에는 몇 칸인지 말하지 않는다 — 이 칸에서 배우는 것이 바로 칸 세기다(좌표평면 판은 좌표를 숨기고 칸을 말하지만 여기서는 칸이 답이다). 답한 뒤에 말한다.
// · 칸 칠하기(draw.mode 'mcells'): kind 'place'(밀기·거꾸로 밀기)는 처음(나중) 도형이 있는 그 모눈에 자리까지 칠하고, kind 'shape'(뒤집기·돌리기·무늬)는
//   빈 5 × 5 모눈에 모양만 칠한다(지도서: 뒤집기·돌리기는 모눈째 옮겨 그리기를 강요하지 않는다). 누르면 칠하고 다시 누르면 지운다.
//   칠한 칸이 후보와 같으면(place는 자리까지, shape는 모양만) 그 보기, 아니면 "오른쪽으로 5칸 옮김"·"칠한 모양 ■■□ / □■■"(짐작한 답, 📊 기록 24자 안).
// ★ 자는 mathdraw.moveGeom 하나 — 본 모눈과 누르는 모눈이 같다. shape 판은 늘 5 × 5(모양 바탕은 가로·세로 4칸 이하)라 판 크기가 답을 흘리지 않는다.
import { figureSvg, parseChart, chartGeom, parseSym, symSvg, symGeom, parsePlane, planeSvg, planeGeom, parseViews, parseMove, moveSvg, moveGeom, mvCells, parseShapes } from './mathdraw.js';
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
export const canDraw = (draw) => (draw && draw.mode === 'grid' ? !!gridOf(draw) : draw && draw.mode === 'plane' ? !!planeOf(draw) : draw && draw.mode === 'cells' ? !!paintOf(draw)
  : draw && draw.mode === 'mpoint' ? !!mpointOf(draw) : draw && draw.mode === 'mcells' ? !!mcellsOf(draw) : !!geomOf(draw));

// ───────────────────── 🪞 모눈 판 ─────────────────────

/** draw → 반쪽 그림(sp)·자(G)·묻는 꼭짓점 (못 그리면 null) */
export function gridOf(draw) {
  if (!draw || draw.mode !== 'grid' || !Array.isArray(draw.target) || !Array.isArray(draw.cands) || draw.cands.length < 2) return null;
  const sp = parseSym(String(draw.fig || '').replace(/^sym /, ''));
  if (!sp || sp.cands.length || !(sp.axis || sp.center)) return null;
  const [tx, ty] = draw.target;
  if (!draw.cands.some((c) => c.x === tx && c.y === ty)) return null;
  const img = (p) => (sp.axis
    ? (sp.axis.x !== undefined ? { x: 2 * sp.axis.x - p.x, y: p.y } : { x: p.x, y: 2 * sp.axis.y - p.y })
    : { x: 2 * sp.center[0] - p.x, y: 2 * sp.center[1] - p.y });
  const half = sp.polys.flat();
  const pts = [...half, ...half.map(img), ...draw.cands];
  const cl = (v) => Math.min(14, Math.max(0, v));
  sp.box = [cl(Math.min(...pts.map((p) => p.x))), cl(Math.min(...pts.map((p) => p.y))), cl(Math.max(...pts.map((p) => p.x))), cl(Math.max(...pts.map((p) => p.y)))];
  const from = Array.isArray(draw.from) ? { x: draw.from[0], y: draw.from[1] } : null;
  const fromName = from ? (half.find((p) => p.x === from.x && p.y === from.y) || {}).name || '' : '';
  return { sp, G: symGeom(sp), from, fromName, target: { x: tx, y: ty } };
}

/** 찍은 자리를 말로 — 풀이 카드와 같은 말("대칭축 오른쪽으로 3칸" · "대칭의 중심에서 왼쪽으로 1칸, 아래로 3칸") */
export function gridSay(g, p) {
  const { sp, from, fromName } = g;
  const TO = { 오른쪽: '오른쪽으로', 왼쪽: '왼쪽으로', 위: '위로', 아래: '아래로' };
  const way = (d, plus, minus) => `${TO[d > 0 ? plus : minus]} ${Math.abs(d)}칸`;
  if (sp.center) {
    const dx = p.x - sp.center[0]; const dy = p.y - sp.center[1];
    const parts = [dx ? way(dx, '오른쪽', '왼쪽') : '', dy ? way(dy, '위', '아래') : ''].filter(Boolean);
    return parts.length ? `대칭의 중심에서 ${parts.join(', ')}` : '대칭의 중심에 찍었어요';
  }
  const v = sp.axis.x !== undefined;
  const d = v ? p.x - sp.axis.x : p.y - sp.axis.y;
  const side = d === 0 ? '대칭축에 찍었어요' : `대칭축 ${v ? way(d, '오른쪽', '왼쪽') : way(d, '위', '아래')}`;
  // 대칭축과 나란한 쪽 — 묻는 점과 높이(가로 대칭축이면 옆 자리)가 다르면 같이 말한다 (위아래까지 뒤집은 자리를 스스로 보게)
  if (!from) return side;
  const e = v ? p.y - from.y : p.x - from.x;
  if (!e) return side;
  const who = fromName ? `점 ${fromName}` : '처음 점';
  return `${side} · ${who}보다 ${Math.abs(e)}칸 ${v ? (e > 0 ? '위' : '아래') : (e > 0 ? '오른쪽' : '왼쪽')}`;
}

/** 찍은 점 + 묻는 꼭짓점에서 이어지는 점선 — 선대칭이면 대칭축과 수직인지, 점대칭이면 중심을 지나는지 눈으로 보인다 */
function gridLayer(svg, g, p, cls) {
  const { G, from } = g;
  const grp = svgEl('g', { class: `draw-layer ${cls}` });
  const seg = from ? svgEl('line', { class: 'draw-seg', x1: G.X(from.x), y1: G.Y(from.y), x2: G.X(from.x), y2: G.Y(from.y) }) : null;
  if (seg) grp.appendChild(seg);
  const dot = svgEl('circle', { class: 'draw-dot', cx: G.X(0), cy: G.Y(0), r: 8 });
  grp.appendChild(dot);
  grp.set = (q) => {
    for (const e of [dot, seg].filter(Boolean)) e.style.display = q ? '' : 'none';
    if (!q) return;
    dot.setAttribute('cx', G.X(q.x)); dot.setAttribute('cy', G.Y(q.y));
    if (seg) { seg.setAttribute('x2', G.X(q.x)); seg.setAttribute('y2', G.Y(q.y)); }
  };
  svg.appendChild(grp);
  grp.set(p);
  return grp;
}

/** 판은 그린 크기의 1.35배로 보인다 — 그대로면 태블릿에서 한 칸이 27px쯤이라 손가락으로 모눈점을 맞히기 어렵다 (헤드리스, 2026-10-02). 좁은 화면은 CSS max-width가 줄인다 */
const BOARD_SCALE = 1.35;
const enlarge = (svg, G) => { if (svg) svg.style.width = `${Math.round(G.W * BOARD_SCALE)}px`; };

/** 모눈 판 한 벌 — drawBox가 mode 'grid'일 때 부른다. 확인 → onSubmit({text: 후보 이름(㉡) 또는 "(8, 4)", at}) */
function gridBox(draw, hooks) {
  const g = gridOf(draw);
  if (!g) return null;
  const { G, sp } = g;
  return pointBoard(draw, hooks, {
    cls: '', lead: '✍️ 대응점을 찍어요 — 모눈의 선이 만나는 곳을 눌러요', html: symSvg(sp), G, fit: (svg) => enlarge(svg, G),
    layer: (svg, p, cls) => gridLayer(svg, g, p, cls), say: (p) => gridSay(g, p),
    // ◀▲▼▶를 처음 누르면 묻는 꼭짓점에서 출발한다
    start: () => g.from || { x: Math.round((G.x0 + G.x1) / 2), y: Math.round((G.y0 + G.y1) / 2) },
    clamp: (q) => ({ x: Math.min(Math.min(G.x1, 14), Math.max(Math.max(G.x0, 0), q.x)), y: Math.min(Math.min(G.y1, 14), Math.max(Math.max(G.y0, 0), q.y)) }),
    step: [1, 1],
    textOf: (p) => { const c = draw.cands.find((z) => z.x === p.x && z.y === p.y); return c ? c.k : `(${p.x}, ${p.y})`; },
  });
}

/**
 * 점 하나를 찍는 판 — 🪞 모눈 판과 📈 좌표평면 판이 같이 쓴다 (누르기·끌기 → 가장 가까운 격자점 · ◀▲▼▶ · 확인 · 모르겠어요 · 찍어 둔 점 기억).
 * cfg: cls 판 이름 · lead 안내 · html 그림 SVG(우리 코드가 만든 문자열) · G 자(gridAt) · fit(svg) 보이는 크기 · layer(svg, p, cls) 찍은 점 층 ·
 *      say(p) 찍은 자리 말 · start() 화살표를 처음 누를 때 출발점 · clamp(q) 판 안으로 · step [가로, 세로] 한 칸 · textOf(p) 확인할 때 보낼 글자
 */
function pointBoard(draw, { onSubmit, onIdk }, cfg) {
  const { G } = cfg;
  // 확인 전에 찍어 둔 점 — 🎒·📊에 다녀와 판을 다시 그려도 그대로 (문항의 draw에 둔다, Codex 22차 #5)
  let p = draw.pending ? { x: draw.pending.x, y: draw.pending.y } : null;
  let done = false;

  const wrap = el('div', `math-draw is-grid${cfg.cls ? ` ${cfg.cls}` : ''}`);
  wrap.appendChild(el('p', 'math-pad-lead', cfg.lead));
  const box = el('div', 'math-fig math-draw-fig');
  box.innerHTML = cfg.html;
  const svg = box.querySelector('svg');
  if (cfg.fit) cfg.fit(svg);
  wrap.appendChild(box);
  const lay = cfg.layer(svg, null, 'is-live');
  svg.classList.add('is-drawable');

  const say = el('p', 'math-draw-say');
  wrap.appendChild(say);

  // ◀ ▲ ▼ ▶ 한 칸씩
  const nudge = el('div', 'math-draw-nudge is-grid');
  const steps = [['◀', '왼쪽으로 한 칸', -1, 0], ['▲', '위로 한 칸', 0, 1], ['▼', '아래로 한 칸', 0, -1], ['▶', '오른쪽으로 한 칸', 1, 0]].map(([t, aria, dx, dy]) => {
    const b = el('button', 'btn math-draw-step', t);
    b.type = 'button';
    b.setAttribute('aria-label', aria);
    b.addEventListener('click', () => { if (done) return; const s = p || cfg.start(); set({ x: s.x + dx * cfg.step[0], y: s.y + dy * cfg.step[1] }); });
    nudge.appendChild(b);
    return b;
  });
  wrap.appendChild(nudge);

  const row = el('div', 'math-pad-actions');
  const ok = el('button', 'btn btn-primary btn-big-wide math-pad-ok', '확인');
  ok.type = 'button';
  ok.addEventListener('click', () => {
    if (done || !p) return;
    done = true;
    paint();
    onSubmit({ text: cfg.textOf(p), val: null, at: [p.x, p.y] });
  });
  const idk = el('button', 'btn math-pad-idk', '🤷 모르겠어요');
  idk.type = 'button';
  idk.addEventListener('click', () => { if (done) return; done = true; paint(); onIdk(); });
  row.appendChild(ok);
  row.appendChild(idk);
  wrap.appendChild(row);

  function set(q) {
    p = cfg.clamp(q);
    draw.pending = { x: p.x, y: p.y };
    paint();
  }
  function gridAtEvent(e) {
    const m = svg.getScreenCTM();
    if (!m) return null;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX; pt.y = e.clientY;
    const u = pt.matrixTransform(m.inverse());
    return G.gridAt(u.x, u.y);
  }
  let dragging = false;
  svg.addEventListener('pointerdown', (e) => {
    if (done) return;
    const q = gridAtEvent(e);
    if (!q) return;
    dragging = true;
    try { svg.setPointerCapture(e.pointerId); } catch { /* 캡처를 못 해도 누른 자리는 정한다 */ }
    set(q);
    e.preventDefault();
  });
  svg.addEventListener('pointermove', (e) => { if (!dragging || done) return; const q = gridAtEvent(e); if (q) set(q); });
  const stop = () => { dragging = false; };
  svg.addEventListener('pointerup', stop);
  svg.addEventListener('pointercancel', stop);

  function paint() {
    lay.set(p);
    say.textContent = p ? cfg.say(p) : '아직 안 찍었어요';
    say.classList.toggle('is-empty', !p);
    for (const b of steps) b.disabled = done;
    ok.disabled = done || !p;
    idk.disabled = done;
    wrap.classList.toggle('is-done', done);
    svg.classList.toggle('is-drawable', !done);
  }
  paint();
  return wrap;
}

/**
 * 답한 뒤 모눈 판 — 후보 점 ㉠~㉣가 있는 원래 그림(풀이 카드가 이 이름으로 말한다) 위에 내가 찍은 점,
 * 틀렸으면 맞는 자리(점선)까지. text는 후보 이름(㉡)·"(8, 4)"·"모르겠어요"
 */
function gridAnswered(draw, text, ok) {
  const g = gridOf(draw);
  const wrap = el('div', `math-draw is-answered is-grid ${ok ? 'ok' : 'no'}`);
  const cand = (draw && draw.cands || []).find((c) => c.k === text);
  const m = /^\((\d+), (\d+)\)$/.exec(String(text));
  const at = cand ? { x: cand.x, y: cand.y } : m ? { x: +m[1], y: +m[2] } : null;
  const right = g ? draw.cands.find((c) => c.x === g.target.x && c.y === g.target.y) : null;
  if (g) {
    const box = el('div', 'math-fig math-draw-fig');
    box.innerHTML = symSvg({ ...g.sp, cands: draw.cands.map((c) => ({ k: c.k, x: c.x, y: c.y })) });
    const svg = box.querySelector('svg');
    enlarge(svg, g.G);
    if (at) gridLayer(svg, g, at, ok ? 'is-ok' : 'is-no');
    if (!ok) gridLayer(svg, g, g.target, 'is-right');
    wrap.appendChild(box);
  }
  const p = el('p', `math-pad-answered ${ok ? 'ok' : 'no'}`);
  p.appendChild(document.createTextNode(at && g ? `✍️ 내가 찍은 점: ${cand ? `${cand.k} 자리 — ` : ''}${gridSay(g, at)} ` : `✍️ 내 답: ${text} `));
  p.appendChild(el('span', 'mark', ok ? '✔' : '✘'));
  wrap.appendChild(p);
  if (!ok && g && right) wrap.appendChild(el('p', 'math-draw-right', `점선이 맞는 자리 — ${right.k} (${gridSay(g, g.target)})`));
  return wrap;
}

// ───────────────────── 📈 좌표평면 판 ─────────────────────

const plNum = (v) => (v < 0 ? `−${Math.abs(v)}` : String(v));
/** 좌표 글자 "(2, −3)" — 생성기(mathcoord)와 같은 모양 (U+2212 빼기) */
export const planeCo = (p) => `(${plNum(p.x)}, ${plNum(p.y)})`;
/** "(2, −3)" → {x, y} (아니면 null) */
const planeAt = (t) => { const m = /^\(([−-]?\d+), ([−-]?\d+)\)$/.exec(String(t)); return m ? { x: Number(m[1].replace('−', '-')), y: Number(m[2].replace('−', '-')) } : null; };

/** draw → 좌표평면(sp, 후보 없이)·자(G)·묻는 점 (못 그리면 null) */
export function planeOf(draw) {
  if (!draw || draw.mode !== 'plane' || !Array.isArray(draw.target) || !Array.isArray(draw.cands) || draw.cands.length < 2) return null;
  const sp = parsePlane(String(draw.fig || '').replace(/^plane /, ''));
  if (!sp || sp.cands.length) return null; // 판에 후보가 보이면 답을 흘린다
  const [tx, ty] = draw.target;
  const inBoard = (c) => Number.isInteger(c.x) && Number.isInteger(c.y) && c.x >= sp.x0 && c.x <= sp.x1 && c.y >= sp.y0 && c.y <= sp.y1 && c.x % sp.xs === 0 && c.y % sp.ys === 0;
  if (!draw.cands.every(inBoard) || !draw.cands.some((c) => c.x === tx && c.y === ty)) return null;
  return { sp, G: planeGeom(sp), target: { x: tx, y: ty } };
}

/** 찍은 자리를 말로 — 풀이 카드와 같은 말("원점에서 오른쪽으로 2칸, 아래로 3칸"). 좌표는 말하지 않는다 */
export function planeSay(g, p) {
  const parts = [p.x ? `${p.x > 0 ? '오른쪽' : '왼쪽'}으로 ${Math.abs(p.x) / g.sp.xs}칸` : '', p.y ? `${p.y > 0 ? '위' : '아래'}로 ${Math.abs(p.y) / g.sp.ys}칸` : ''].filter(Boolean);
  return parts.length ? `원점에서 ${parts.join(', ')}` : '원점에 찍었어요';
}

/** 찍은 점 + 원점에서 가로 먼저(x좌표만큼)·세로로(y좌표만큼) 가는 점선 — 풀이 카드의 "가로 먼저, 세로로"가 눈에 보인다 */
function planeLayer(svg, g, p, cls) {
  const { G } = g;
  const grp = svgEl('g', { class: `draw-layer ${cls}` });
  const o = { x: G.X(0), y: G.Y(0) };
  const run = svgEl('line', { class: 'draw-seg', x1: o.x, y1: o.y, x2: o.x, y2: o.y });
  const rise = svgEl('line', { class: 'draw-seg', x1: o.x, y1: o.y, x2: o.x, y2: o.y });
  const dot = svgEl('circle', { class: 'draw-dot', cx: o.x, cy: o.y, r: 8 });
  for (const e of [run, rise, dot]) grp.appendChild(e);
  grp.set = (q) => {
    for (const e of [run, rise, dot]) e.style.display = q ? '' : 'none';
    if (!q) return;
    const x = G.X(q.x); const y = G.Y(q.y);
    run.setAttribute('x2', x);
    rise.setAttribute('x1', x); rise.setAttribute('x2', x); rise.setAttribute('y2', y);
    dot.setAttribute('cx', x); dot.setAttribute('cy', y);
  };
  svg.appendChild(grp);
  grp.set(p);
  return grp;
}

/** 좌표평면 판 한 벌 — drawBox가 mode 'plane'일 때 부른다. 확인 → onSubmit({text: 후보 이름(㉡) 또는 "(1, −3)", at}) */
function planeBox(draw, hooks) {
  const g = planeOf(draw);
  if (!g) return null;
  const { G, sp } = g;
  return pointBoard(draw, hooks, {
    cls: 'is-plane', lead: '✍️ 점을 찍어요 — 모눈의 선이 만나는 곳을 눌러요', html: planeSvg(sp), G, // 보이는 크기는 그림 그대로(1.2배) — 판 폭 460px 안에 한 칸 38px쯤
    layer: (svg, p, cls) => planeLayer(svg, g, p, cls), say: (p) => planeSay(g, p),
    start: () => ({ x: 0, y: 0 }), // ◀▲▼▶를 처음 누르면 원점에서 출발한다
    clamp: (q) => ({ x: Math.min(sp.x1, Math.max(sp.x0, q.x)), y: Math.min(sp.y1, Math.max(sp.y0, q.y)) }),
    step: [sp.xs, sp.ys],
    textOf: (p) => { const c = draw.cands.find((z) => z.x === p.x && z.y === p.y); return c ? c.k : planeCo(p); },
  });
}

/**
 * 답한 뒤 좌표평면 — 후보 ㉠~㉣가 있는 원래 그림(풀이 카드가 이 이름으로 말한다) 위에 내가 찍은 점과 원점에서 간 길,
 * 틀렸으면 맞는 자리(점선)까지. 이제는 좌표도 함께 — 내가 찍은 (−3, 2)와 묻는 (2, −3)을 나란히 본다. text는 ㉡·"(1, −3)"·"모르겠어요"
 */
function planeAnswered(draw, text, ok) {
  const g = planeOf(draw);
  const wrap = el('div', `math-draw is-answered is-grid is-plane ${ok ? 'ok' : 'no'}`);
  const cand = (draw && draw.cands || []).find((c) => c.k === text);
  const at = cand ? { x: cand.x, y: cand.y } : planeAt(text);
  const right = g ? draw.cands.find((c) => c.x === g.target.x && c.y === g.target.y) : null;
  if (g) {
    const box = el('div', 'math-fig math-draw-fig');
    box.innerHTML = planeSvg({ ...g.sp, cands: draw.cands.map((c) => ({ k: c.k, x: c.x, y: c.y })) });
    const svg = box.querySelector('svg');
    // 맞는 자리(점선, 속은 비움)를 내 점 **위에** — 같은 길(x좌표가 같으면 가로 점선)이 겹쳐도 둘 다 보인다
    if (at) planeLayer(svg, g, at, ok ? 'is-ok' : 'is-no');
    if (!ok) planeLayer(svg, g, g.target, 'is-right');
    wrap.appendChild(box);
  }
  const p = el('p', `math-pad-answered ${ok ? 'ok' : 'no'}`);
  p.appendChild(document.createTextNode(at && g ? `✍️ 내가 찍은 점: ${cand ? `${cand.k} ` : ''}${planeCo(at)} — ${planeSay(g, at)} ` : `✍️ 내 답: ${text} `));
  p.appendChild(el('span', 'mark', ok ? '✔' : '✘'));
  wrap.appendChild(p);
  if (!ok && g && right) wrap.appendChild(el('p', 'math-draw-right', `점선이 맞는 자리 — ${right.k} ${planeCo(g.target)} (${planeSay(g, g.target)})`));
  return wrap;
}

// ───────────────────── 🧊 칸 칠하기 판 ─────────────────────

const PC = 40; // 판 한 칸 (보이는 크기는 BOARD_SCALE배 — 태블릿에서 한 칸 54px쯤)
const PPAD = 18;
/** 후보 값 "2,3,1"(앞·옆 — 왼쪽부터 기둥 높이) · "110/011"(위 — 뒤 줄부터) → 판 상태 */
const paintParse = (kind, v) => (kind === 'side' ? String(v).split(',').map(Number) : String(v).split('/').map((r) => [...r].map(Number)));
const paintVal = (kind, s) => (kind === 'side' ? s.join(',') : s.map((r) => r.join('')).join('/'));

/** draw → { kind, cols, rows, target, cands } (못 그리면 null) — 문제 글의 후보 그림([views])과 draw.cands가 이름·값까지 같아야 한다 */
export function paintOf(draw) {
  if (!draw || draw.mode !== 'cells' || !['side', 'top'].includes(draw.kind) || !Array.isArray(draw.cands) || draw.cands.length < 2) return null;
  const sp = parseViews(String(draw.fig || '').replace(/^views /, ''));
  if (!sp || sp.items.length !== draw.cands.length) return null;
  const valOf = (it) => (it.kind === 'side' ? it.h.join(',') : it.cells.map((r) => r.join('')).join('/'));
  if (!sp.items.every((it, n) => it.kind === draw.kind && it.k === draw.cands[n].k && valOf(it) === draw.cands[n].v)) return null;
  if (!draw.cands.some((c) => c.v === draw.target)) return null;
  const vals = draw.cands.map((c) => paintParse(draw.kind, c.v));
  let cols; let rows;
  if (draw.kind === 'side') {
    cols = vals[0].length;
    if (vals.some((h) => h.length !== cols)) return null;
    // 3층까지는 늘 — 판 높이가 답의 가장 높은 층을 흘리지 않게. 생성기가 판 높이(rows)를 정하면 그만큼은 늘 (S5: 줄의 수를 더한 후보가 4층까지라 늘 4층)
    if (draw.rows !== undefined && !(Number.isInteger(draw.rows) && draw.rows >= 3 && draw.rows <= 4)) return null;
    rows = Math.max(draw.rows || 3, ...vals.flat());
  } else {
    rows = vals[0].length; cols = vals[0][0].length;
    if (vals.some((t) => t.length !== rows || t.some((r) => r.length !== cols))) return null;
  }
  return cols <= 4 && rows <= 4 ? { kind: draw.kind, cols, rows, target: draw.target, cands: draw.cands } : null;
}

/** 칠한 모양을 말로 — 풀이 카드와 같은 말 ("왼쪽부터 2, 3, 1층" · "뒤 줄부터 ■■□ / □■■") */
export function paintSay(g, v) {
  const s = paintParse(g.kind, v);
  return g.kind === 'side' ? `왼쪽부터 ${s.join(', ')}층` : `뒤 줄부터 ${s.map((r) => r.map((x) => (x ? '■' : '□')).join('')).join(' / ')}`;
}
/** 짐작한 답 글자 → 값 (paintSay의 거꾸로, 못 읽으면 null) */
export function paintFromText(g, text) {
  const t = String(text);
  if (g.kind === 'side') { const m = /^왼쪽부터 (\d+(?:, \d+)*)층$/.exec(t); return m && m[1].split(', ').length === g.cols ? m[1].replace(/ /g, '') : null; }
  const m = /^뒤 줄부터 ([■□]+(?: \/ [■□]+)*)$/.exec(t);
  return m ? m[1].split(' / ').map((r) => [...r].map((x) => (x === '■' ? 1 : 0)).join('')).join('/') : null;
}
/** 확인할 때 보낼 글자 — 후보와 같으면 그 이름(㉡), 아니면 칠한 모양의 말 */
export function paintText(g, v) {
  const c = g.cands.find((z) => z.v === v);
  return c ? c.k : paintSay(g, v);
}

/** 판 그림 — 칸마다 rect.draw-cell(칠하면 .is-on). 앞·옆은 바닥선, 위는 아래에 "앞". svg.set(값)으로 칠한다 */
function paintSvgEl(g, v, cls, scale) {
  const W = PPAD * 2 + g.cols * PC; const H = PPAD + g.rows * PC + (g.kind === 'top' ? 32 : 18);
  const svg = svgEl('svg', { class: `frac-fig paint-fig ${cls}`, viewBox: `0 0 ${W} ${H}`, width: Math.round(W * scale), height: Math.round(H * scale), role: 'img', 'aria-label': g.kind === 'side' ? '앞이나 옆에서 본 모양을 칠하는 칸' : '위에서 본 모양을 칠하는 칸' });
  const cells = [];
  for (let r = 0; r < g.rows; r++) {
    for (let i = 0; i < g.cols; i++) {
      const rect = svgEl('rect', { class: 'draw-cell', x: PPAD + i * PC, y: PPAD + r * PC, width: PC, height: PC, 'data-i': i, 'data-r': r });
      svg.appendChild(rect);
      cells.push(rect);
    }
  }
  if (g.kind === 'side') svg.appendChild(svgEl('line', { class: 'paint-base', x1: PPAD - 8, y1: PPAD + g.rows * PC, x2: W - PPAD + 8, y2: PPAD + g.rows * PC }));
  else { const t = svgEl('text', { x: W / 2, y: PPAD + g.rows * PC + 24, 'font-size': 16, 'font-weight': 700, 'text-anchor': 'middle', fill: 'currentColor' }); t.textContent = '앞'; svg.appendChild(t); }
  svg.set = (val) => {
    const s = paintParse(g.kind, val);
    for (const rect of cells) {
      const i = Number(rect.getAttribute('data-i')); const r = Number(rect.getAttribute('data-r'));
      rect.classList.toggle('is-on', g.kind === 'side' ? g.rows - r <= s[i] : s[r][i] === 1);
    }
  };
  svg.set(v);
  return svg;
}

/** 칸 칠하기 판 한 벌 — drawBox가 mode 'cells'일 때 부른다. 확인 → onSubmit({text: 후보 이름(㉡) 또는 "왼쪽부터 2, 3, 1층"}) */
function paintBox(draw, { onSubmit, onIdk }) {
  const g = paintOf(draw);
  if (!g) return null;
  const empty = () => paintVal(g.kind, g.kind === 'side' ? Array(g.cols).fill(0) : Array.from({ length: g.rows }, () => Array(g.cols).fill(0)));
  // 확인 전에 칠해 둔 모양 — 🎒·📊에 다녀와 판을 다시 그려도 그대로 (점 찍기 판의 pending과 같은 자리)
  const okPending = (v) => typeof v === 'string' && (g.kind === 'side' ? new RegExp(`^\\d(,\\d){${g.cols - 1}}$`).test(v) && v.split(',').every((h) => +h <= g.rows) : new RegExp(`^[01]{${g.cols}}(/[01]{${g.cols}}){${g.rows - 1}}$`).test(v));
  let v = okPending(draw.pending) ? draw.pending : empty();
  let done = false;

  const wrap = el('div', 'math-draw is-paint');
  wrap.appendChild(el('p', 'math-pad-lead', g.kind === 'side' ? '✍️ 기둥마다 높이만큼 칠해요 — 누른 칸까지 아래부터 칠해져요' : '✍️ 쌓기나무가 놓인 자리를 칠해요 — 누르면 칠하고, 다시 누르면 지워요 (아래쪽이 앞)'));
  const box = el('div', 'math-fig math-draw-fig');
  const svg = paintSvgEl(g, v, 'is-live', BOARD_SCALE);
  box.appendChild(svg);
  wrap.appendChild(box);
  const say = el('p', 'math-draw-say');
  wrap.appendChild(say);

  const tools = el('div', 'math-draw-nudge is-grid');
  const clear = el('button', 'btn math-draw-step', '↺ 다 지우기');
  clear.type = 'button';
  clear.addEventListener('click', () => { if (done) return; set(empty()); });
  tools.appendChild(clear);
  wrap.appendChild(tools);

  const row = el('div', 'math-pad-actions');
  const ok = el('button', 'btn btn-primary btn-big-wide math-pad-ok', '확인');
  ok.type = 'button';
  ok.addEventListener('click', () => {
    if (done || !ready()) return;
    done = true;
    paint();
    onSubmit({ text: paintText(g, v), val: null });
  });
  const idk = el('button', 'btn math-pad-idk', '🤷 모르겠어요');
  idk.type = 'button';
  idk.addEventListener('click', () => { if (done) return; done = true; paint(); onIdk(); });
  row.appendChild(ok);
  row.appendChild(idk);
  wrap.appendChild(row);

  /** 앞·옆은 기둥마다 1층 이상, 위는 한 칸 이상 칠해야 확인 */
  function ready() { const s = paintParse(g.kind, v); return g.kind === 'side' ? s.every((h) => h >= 1) : s.flat().some(Boolean); }
  function set(nv) { v = nv; draw.pending = v; paint(); }
  svg.addEventListener('pointerdown', (e) => {
    if (done) return;
    const m = svg.getScreenCTM();
    if (!m) return;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX; pt.y = e.clientY;
    const u = pt.matrixTransform(m.inverse());
    const i = Math.floor((u.x - PPAD) / PC); const r = Math.floor((u.y - PPAD) / PC);
    if (i < 0 || i >= g.cols || r < 0 || r >= g.rows) return;
    e.preventDefault();
    set(paintTap(g, v, i, r));
  });

  function paint() {
    svg.set(v);
    const s = paintParse(g.kind, v);
    const any = g.kind === 'side' ? s.some((h) => h > 0) : s.flat().some(Boolean);
    say.textContent = !any ? '아직 안 칠했어요' : g.kind === 'side' && !ready() ? `${paintSay(g, v)} — 빈 기둥이 있어요` : paintSay(g, v);
    say.classList.toggle('is-empty', !any);
    clear.disabled = done || !any;
    ok.disabled = done || !ready();
    idk.disabled = done;
    wrap.classList.toggle('is-done', done);
    svg.classList.toggle('is-drawable', !done);
  }
  paint();
  return wrap;
}
/**
 * 칸 하나를 누르면 — 앞·옆: 그 기둥을 누른 칸 높이까지(이미 그 높이면 한 층 내림) · 위: 그 칸을 칠하거나 지움.
 * i 왼쪽부터 칸 번호, r 위에서부터 줄 번호(판 그림 그대로). 순수 함수 — 테스트가 직접 누른다
 */
export function paintTap(g, v, i, r) {
  const s = paintParse(g.kind, v);
  if (g.kind === 'side') { const k = g.rows - r; s[i] = s[i] === k ? k - 1 : k; } else s[r][i] = s[r][i] ? 0 : 1;
  return paintVal(g.kind, s);
}

/**
 * 답한 뒤 칸 칠하기 판 — 후보 ㉠~㉣ 그림(풀이 카드가 이 이름으로 말한다) + 내가 칠한 모양 + 틀렸으면 맞는 모양.
 * text는 후보 이름(㉡)·"왼쪽부터 2, 3, 1층"·"모르겠어요"
 */
function paintAnswered(draw, text, ok) {
  const g = paintOf(draw);
  const wrap = el('div', `math-draw is-answered is-paint ${ok ? 'ok' : 'no'}`);
  const cand = (draw && draw.cands || []).find((c) => c.k === text);
  const mine = g ? (cand ? cand.v : paintFromText(g, text)) : null;
  const right = g ? draw.cands.find((c) => c.v === g.target) : null;
  if (g) {
    const fig = el('div', 'math-fig math-draw-fig');
    fig.innerHTML = figureSvg(draw.fig);
    wrap.appendChild(fig);
    const pair = el('div', 'math-paint-pair');
    const one = (val, cls, cap) => { const f = el('figure', 'math-draw-fig'); f.appendChild(paintSvgEl(g, val, cls, 1)); f.appendChild(el('figcaption', '', cap)); pair.appendChild(f); };
    if (mine) one(mine, ok ? 'is-ok' : 'is-no', '내가 칠한 모양');
    if (!ok) one(g.target, 'is-right', `맞는 모양 ${right ? right.k : ''}`.trim());
    wrap.appendChild(pair);
  }
  const p = el('p', `math-pad-answered ${ok ? 'ok' : 'no'}`);
  p.appendChild(document.createTextNode(mine && g ? `✍️ 내가 칠한 모양: ${cand ? `${cand.k}과 같아요 — ` : ''}${paintSay(g, mine)} ` : `✍️ 내 답: ${text} `));
  p.appendChild(el('span', 'mark', ok ? '✔' : '✘'));
  wrap.appendChild(p);
  if (!ok && g && right) wrap.appendChild(el('p', 'math-draw-right', `맞는 모양 — ${right.k} (${paintSay(g, g.target)})`));
  return wrap;
}

// ───────────────────── 🔄 모눈점 찍기 판 ─────────────────────

/** "오른쪽으로 3칸, 위쪽으로 2칸" — 가로 먼저 (생성기·풀이 카드와 같은 말) · 같은 자리면 빈 글자 */
const mvWay = (dx, dy) => [dx ? `${dx > 0 ? '오른쪽' : '왼쪽'}으로 ${Math.abs(dx)}칸` : '', dy ? `${dy > 0 ? '아래쪽' : '위쪽'}으로 ${Math.abs(dy)}칸` : ''].filter(Boolean).join(', ');
/** "오른쪽으로 3칸, 위쪽으로 2칸" → [dx, dy] (못 읽으면 null) */
const mvWayOf = (t) => { const m = /^(?:(오른쪽|왼쪽)으로 (\d+)칸)?(?:, )?(?:(위쪽|아래쪽)으로 (\d+)칸)?$/.exec(String(t)); return m && (m[1] || m[3]) ? [m[1] ? (m[1] === '오른쪽' ? 1 : -1) * m[2] : 0, m[3] ? (m[3] === '아래쪽' ? 1 : -1) * m[4] : 0] : null; };

/** draw → 출발점만 그린 모눈(sp)·자(G)·출발점·묻는 점·후보 (못 그리면 null) */
export function mpointOf(draw) {
  if (!draw || draw.mode !== 'mpoint' || !Array.isArray(draw.target) || !Array.isArray(draw.from) || !Array.isArray(draw.cands) || draw.cands.length < 2) return null;
  const sp = parseMove(String(draw.fig || '').replace(/^move /, ''));
  if (!sp || sp.shapes.length || sp.pts.length !== 1 || sp.pts[0].k !== 'ㄱ') return null; // 판에 후보 점이 보이면 답을 흘린다
  const from = { x: sp.pts[0].x, y: sp.pts[0].y };
  if (draw.from[0] !== from.x || draw.from[1] !== from.y) return null;
  const inGrid = (c) => /^[㉠-㉣]$/.test(c.k) && Number.isInteger(c.x) && Number.isInteger(c.y) && c.x >= 0 && c.y >= 0 && c.x <= sp.W && c.y <= sp.H;
  if (!draw.cands.every(inGrid) || new Set(draw.cands.map((c) => c.k)).size !== draw.cands.length || new Set(draw.cands.map((c) => `${c.x},${c.y}`)).size !== draw.cands.length) return null;
  const [tx, ty] = draw.target;
  if (!draw.cands.some((c) => c.x === tx && c.y === ty)) return null;
  const G = moveGeom(sp);
  return { sp, G: { ...G, gridAt: G.ptAt }, from, target: { x: tx, y: ty }, cands: draw.cands };
}
/** 찍은 자리를 말로 — "점 ㄱ에서 오른쪽으로 3칸, 위쪽으로 2칸" (답한 뒤 화면·짐작한 답 글자) */
export const mpointSay = (g, p) => { const w = mvWay(p.x - g.from.x, p.y - g.from.y); return w ? `점 ㄱ에서 ${w}` : '점 ㄱ 자리'; };
/** 확인할 때 보낼 글자 — 후보 점이면 그 이름(㉡), 아니면 찍은 자리의 말 */
export const mpointText = (g, p) => { const c = g.cands.find((z) => z.x === p.x && z.y === p.y); return c ? c.k : mpointSay(g, p); };
/** 보낸 글자 → 찍은 자리 (mpointText의 거꾸로, 못 읽으면 null) */
export function mpointFromText(g, text) {
  const t = String(text);
  const c = g.cands.find((z) => z.k === t);
  if (c) return { x: c.x, y: c.y };
  if (t === '점 ㄱ 자리') return { ...g.from };
  const w = t.startsWith('점 ㄱ에서 ') ? mvWayOf(t.slice(6)) : null;
  return w ? { x: g.from.x + w[0], y: g.from.y + w[1] } : null;
}
/** 찍은 점 + 출발점에서 가로 먼저·세로로 가는 점선 — "한 방향씩 차례로"가 눈에 보인다 (칸 수는 쓰지 않는다) */
function mpointLayer(svg, g, p, cls) {
  const { G, from } = g;
  const grp = svgEl('g', { class: `draw-layer ${cls}` });
  const o = { x: G.X(from.x), y: G.Y(from.y) };
  const run = svgEl('line', { class: 'draw-seg', x1: o.x, y1: o.y, x2: o.x, y2: o.y });
  const rise = svgEl('line', { class: 'draw-seg', x1: o.x, y1: o.y, x2: o.x, y2: o.y });
  const dot = svgEl('circle', { class: 'draw-dot', cx: o.x, cy: o.y, r: 8 });
  for (const e of [run, rise, dot]) grp.appendChild(e);
  grp.set = (q) => {
    for (const e of [run, rise, dot]) e.style.display = q ? '' : 'none';
    if (!q) return;
    const x = G.X(q.x); const y = G.Y(q.y);
    run.setAttribute('x2', x);
    rise.setAttribute('x1', x); rise.setAttribute('x2', x); rise.setAttribute('y2', y);
    dot.setAttribute('cx', x); dot.setAttribute('cy', y);
  };
  svg.appendChild(grp);
  grp.set(p);
  return grp;
}
/** 모눈점 찍기 판 한 벌 — drawBox가 mode 'mpoint'일 때 부른다. 확인 → onSubmit({text: 후보 이름(㉡) 또는 "점 ㄱ에서 …", at}) */
function mpointBox(draw, hooks) {
  const g = mpointOf(draw);
  if (!g) return null;
  const { G, sp } = g;
  return pointBoard(draw, hooks, {
    cls: 'is-mpoint', lead: '✍️ 점을 찍어요 — 모눈의 선이 만나는 곳을 눌러요', html: moveSvg(sp), G, fit: (svg) => enlarge(svg, G),
    layer: (svg, p, cls) => mpointLayer(svg, g, p, cls),
    say: () => '점을 찍었어요 — 맞으면 확인을 눌러요', // 칸 수는 답한 뒤에 (위 머리말)
    start: () => g.from, // ◀▲▼▶를 처음 누르면 점 ㄱ에서 출발한다
    clamp: (q) => ({ x: Math.min(sp.W, Math.max(0, q.x)), y: Math.min(sp.H, Math.max(0, q.y)) }),
    step: [1, -1], // 모눈은 아래로 갈수록 y가 크다 — ▲는 한 칸 위
    textOf: (p) => mpointText(g, p),
  });
}
/** 답한 뒤 모눈점 판 — 후보 점 ㉠~㉣가 있는 원래 그림(풀이 카드가 이 이름으로 말한다) 위에 내가 찍은 점, 틀렸으면 맞는 자리(점선)까지 */
function mpointAnswered(draw, text, ok) {
  const g = mpointOf(draw);
  const wrap = el('div', `math-draw is-answered is-grid is-mpoint ${ok ? 'ok' : 'no'}`);
  const at = g ? mpointFromText(g, text) : null;
  const cand = g ? g.cands.find((c) => c.k === text) : null;
  const right = g ? g.cands.find((c) => c.x === g.target.x && c.y === g.target.y) : null;
  if (g) {
    const box = el('div', 'math-fig math-draw-fig');
    box.innerHTML = moveSvg({ ...g.sp, pts: [...g.sp.pts, ...g.cands.map((c) => ({ k: c.k, x: c.x, y: c.y }))] });
    const svg = box.querySelector('svg');
    enlarge(svg, g.G);
    if (at) mpointLayer(svg, g, at, ok ? 'is-ok' : 'is-no');
    if (!ok) mpointLayer(svg, g, g.target, 'is-right');
    wrap.appendChild(box);
  }
  const p = el('p', `math-pad-answered ${ok ? 'ok' : 'no'}`);
  p.appendChild(document.createTextNode(at && g ? `✍️ 내가 찍은 점: ${cand ? `${cand.k} 자리 — ` : ''}${mpointSay(g, at)} ` : `✍️ 내 답: ${text} `));
  p.appendChild(el('span', 'mark', ok ? '✔' : '✘'));
  wrap.appendChild(p);
  if (!ok && g && right) wrap.appendChild(el('p', 'math-draw-right', `점선이 맞는 자리 — ${right.k} (${mpointSay(g, g.target)})`));
  return wrap;
}

// ───────────────────── 🔄 모눈 칸 칠하기 판 ─────────────────────

const MV_SHAPE_BOARD = 5; // 모양만 칠하는 판 — 늘 5 × 5
/** 칸 좌표 목록 ↔ 판 값 "x,y x,y …"(위 줄부터, 왼쪽부터) */
const mvKey = (cs) => [...cs].sort((a, b) => a[1] - b[1] || a[0] - b[0]).map((c) => c.join(',')).join(' ');
const mvCellsOfVal = (v) => (v ? String(v).split(' ').map((s) => s.split(',').map(Number)) : []);
const mvNormCells = (cs) => { const x0 = Math.min(...cs.map((c) => c[0])); const y0 = Math.min(...cs.map((c) => c[1])); return cs.map(([x, y]) => [x - x0, y - y0]); };
const mvShapeKey = (cs) => mvKey(mvNormCells(cs));
/** 칸 모양 글("011/110" · "3.011110") → 칸 좌표 (왼쪽 위 x0, y0부터) */
const mvGridCells = (g, x0 = 0, y0 = 0) => { const out = []; g.forEach((row, j) => row.forEach((on, i) => { if (on) out.push([x0 + i, y0 + j]); })); return out; };
/** 칸 좌표 → "■■□ / □■■" (왼쪽 위로 붙여) */
const mvRowsOf = (cs) => {
  const n = mvNormCells(cs); const W = Math.max(...n.map((c) => c[0])) + 1; const H = Math.max(...n.map((c) => c[1])) + 1;
  return Array.from({ length: H }, (_, y) => Array.from({ length: W }, (_, x) => (n.some((c) => c[0] === x && c[1] === y) ? '■' : '□')).join('')).join(' / ');
};

/** draw → { kind, sp(판 모눈), G, W, H, base(처음·나중 도형 — place만), cands [{k, v, cells}], target } (못 그리면 null) */
export function mcellsOf(draw) {
  if (!draw || draw.mode !== 'mcells' || !['place', 'shape'].includes(draw.kind) || !Array.isArray(draw.cands) || draw.cands.length < 2) return null;
  if (!draw.cands.every((c) => c && /^[㉠-㉣]$/.test(c.k)) || new Set(draw.cands.map((c) => c.k)).size !== draw.cands.length) return null;
  let sp; let base = null; let cands;
  if (draw.kind === 'place') {
    sp = parseMove(String(draw.fig || '').replace(/^move /, ''));
    if (!sp || sp.shapes.length !== 1 || sp.pts.length || sp.cands.length) return null; // 판에 후보 도형이 보이면 답을 흘린다
    const b = sp.shapes[0];
    base = { k: b.k, cells: mvGridCells(b.g, b.x, b.y) };
    cands = draw.cands.map((c) => { const m = /^(\d+),(\d+)=([0-9./]+)$/.exec(String(c.v)); const gg = m && mvCells(m[3]); return gg ? { k: c.k, v: c.v, cells: mvGridCells(gg, +m[1], +m[2]) } : null; });
    if (cands.some((c) => !c || c.cells.some(([x, y]) => x >= sp.W || y >= sp.H))) return null;
    if (new Set(cands.map((c) => mvKey(c.cells))).size !== cands.length) return null;
  } else {
    const fs = parseShapes(String(draw.fig || '').replace(/^shapes /, ''));
    if (!fs || fs.items.length !== draw.cands.length) return null;
    cands = draw.cands.map((c, n) => { const it = fs.items[n]; const gg = mvCells(c.v); return gg && it.g && it.k === c.k && mvKey(mvGridCells(it.g)) === mvKey(mvGridCells(gg)) ? { k: c.k, v: c.v, cells: mvGridCells(gg) } : null; });
    if (cands.some((c) => !c || c.cells.some(([x, y]) => x >= MV_SHAPE_BOARD - 1 || y >= MV_SHAPE_BOARD - 1))) return null; // 4칸 이하 — 판에 한 칸 여유
    if (new Set(cands.map((c) => mvShapeKey(c.cells))).size !== cands.length) return null;
    sp = { W: MV_SHAPE_BOARD, H: MV_SHAPE_BOARD, cm: false, shapes: [], pts: [], cands: [] };
  }
  const target = cands.find((c) => c.v === draw.target);
  return target ? { kind: draw.kind, sp, G: moveGeom(sp), W: sp.W, H: sp.H, base, cands, target } : null;
}
/** 칸 하나를 누르면 칠하고, 다시 누르면 지운다 — i 왼쪽부터, j 위에서부터 (판 밖이면 그대로). 순수 함수 — 테스트가 직접 누른다 */
export function mcellsTap(g, v, i, j) {
  if (!(i >= 0 && j >= 0 && i < g.W && j < g.H)) return v;
  const cs = mvCellsOfVal(v);
  const k = cs.findIndex(([x, y]) => x === i && y === j);
  if (k >= 0) cs.splice(k, 1); else cs.push([i, j]);
  return mvKey(cs);
}
/** 확인할 때 보낼 글자 — 후보와 같으면(자리까지 · 모양만) 그 이름(㉡), 아니면 칠한 것의 말 (빈 판이면 '') */
export function mcellsText(g, v) {
  const cs = mvCellsOfVal(v);
  if (!cs.length) return '';
  const hit = g.cands.find((c) => (g.kind === 'place' ? mvKey(c.cells) === mvKey(cs) : mvShapeKey(c.cells) === mvShapeKey(cs)));
  if (hit) return hit.k;
  if (g.kind === 'shape') return `칠한 모양 ${mvRowsOf(cs)}`;
  // 자리 판: 처음(나중) 도형을 모양 그대로 옮긴 꼴이면 몇 칸 옮겼는지, 모양이 다르면 그 모양
  if (mvShapeKey(cs) !== mvShapeKey(g.base.cells)) return `바뀐 모양 ${mvRowsOf(cs)}`;
  const tl = (c) => [Math.min(...c.map((x) => x[0])), Math.min(...c.map((x) => x[1]))];
  const [bx, by] = tl(g.base.cells); const [x, y] = tl(cs);
  const w = mvWay(x - bx, y - by);
  return w ? `${w} 옮김` : `${g.base.k} 도형 자리 그대로`;
}
/** 보낸 글자 → 칠한 칸 (mcellsText의 거꾸로 — 모양만 아는 글자는 왼쪽 위에 붙여서, 못 읽으면 null) */
export function mcellsFromText(g, text) {
  const t = String(text);
  const c = g.cands.find((z) => z.k === t);
  if (c) return c.cells;
  if (g.kind === 'place') {
    if (t === `${g.base.k} 도형 자리 그대로`) return g.base.cells;
    const w = t.endsWith(' 옮김') ? mvWayOf(t.slice(0, -3)) : null;
    if (w) return g.base.cells.map(([x, y]) => [x + w[0], y + w[1]]);
  }
  const m = /^(?:칠한|바뀐) 모양 ([■□]+(?: \/ [■□]+)*)$/.exec(t);
  if (!m) return null;
  const out = [];
  m[1].split(' / ').forEach((row, y) => [...row].forEach((ch, x) => { if (ch === '■') out.push([x, y]); }));
  return out.length ? out : null;
}
/** 칠한 칸 층 — rect.draw-cell.is-on (g.G의 자로) */
function mcellsLayer(svg, g, cells, cls) {
  const grp = svgEl('g', { class: `draw-layer ${cls}` });
  grp.set = (cs) => {
    while (grp.firstChild) grp.removeChild(grp.firstChild);
    for (const [x, y] of cs) grp.appendChild(svgEl('rect', { class: 'draw-cell is-on', 'data-i': x, 'data-j': y, x: g.G.X(x), y: g.G.Y(y), width: g.G.C, height: g.G.C }));
  };
  svg.appendChild(grp);
  grp.set(cells);
  return grp;
}
/** 모눈 칸 칠하기 판 한 벌 — drawBox가 mode 'mcells'일 때 부른다. 확인 → onSubmit({text: 후보 이름(㉡) 또는 "오른쪽으로 5칸 옮김"·"칠한 모양 …"}) */
function mcellsBox(draw, { onSubmit, onIdk }) {
  const g = mcellsOf(draw);
  if (!g) return null;
  // 확인 전에 칠해 둔 칸 — 🎒·📊에 다녀와 판을 다시 그려도 그대로 (다른 판의 pending과 같은 자리)
  const okPending = (v) => typeof v === 'string' && (v === '' || v.split(' ').every((s) => { const m = /^(\d+),(\d+)$/.exec(s); return m && +m[1] < g.W && +m[2] < g.H; }));
  let v = okPending(draw.pending) ? draw.pending : '';
  let done = false;

  const wrap = el('div', 'math-draw is-paint is-move');
  wrap.appendChild(el('p', 'math-pad-lead', g.kind === 'place' ? '✍️ 도형을 모눈에 칠해요 — 칸을 누르면 칠하고, 다시 누르면 지워요' : '✍️ 모양을 칠해요 — 칸을 누르면 칠하고, 다시 누르면 지워요 (판의 어느 자리든 괜찮아요)'));
  const box = el('div', 'math-fig math-draw-fig');
  box.innerHTML = moveSvg(g.sp);
  const svg = box.querySelector('svg');
  enlarge(svg, g.G);
  const lay = mcellsLayer(svg, g, mvCellsOfVal(v), 'is-live');
  wrap.appendChild(box);
  const say = el('p', 'math-draw-say');
  wrap.appendChild(say);

  const tools = el('div', 'math-draw-nudge is-grid');
  const clear = el('button', 'btn math-draw-step', '↺ 다 지우기');
  clear.type = 'button';
  clear.addEventListener('click', () => { if (done) return; set(''); });
  tools.appendChild(clear);
  wrap.appendChild(tools);

  const row = el('div', 'math-pad-actions');
  const ok = el('button', 'btn btn-primary btn-big-wide math-pad-ok', '확인');
  ok.type = 'button';
  ok.addEventListener('click', () => {
    if (done || !v) return;
    done = true;
    paint();
    onSubmit({ text: mcellsText(g, v), val: null });
  });
  const idk = el('button', 'btn math-pad-idk', '🤷 모르겠어요');
  idk.type = 'button';
  idk.addEventListener('click', () => { if (done) return; done = true; paint(); onIdk(); });
  row.appendChild(ok);
  row.appendChild(idk);
  wrap.appendChild(row);

  function set(nv) { v = nv; draw.pending = v; paint(); }
  svg.addEventListener('pointerdown', (e) => {
    if (done) return;
    const m = svg.getScreenCTM();
    if (!m) return;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX; pt.y = e.clientY;
    const u = pt.matrixTransform(m.inverse());
    const c = g.G.cellAt(u.x, u.y);
    if (!c) return;
    e.preventDefault();
    set(mcellsTap(g, v, c.i, c.j));
  });

  function paint() {
    const n = mvCellsOfVal(v).length;
    lay.set(mvCellsOfVal(v));
    say.textContent = n ? `칠한 칸 ${n}개` : '아직 안 칠했어요';
    say.classList.toggle('is-empty', !n);
    clear.disabled = done || !n;
    ok.disabled = done || !n;
    idk.disabled = done;
    wrap.classList.toggle('is-done', done);
    svg.classList.toggle('is-drawable', !done);
  }
  paint();
  return wrap;
}
/** 모양 하나만 작은 모눈에 — 답한 뒤 "내가 칠한 모양 · 맞는 모양" */
function mvShapeFig(cells, cls) {
  const n = mvNormCells(cells);
  const sp = { W: Math.max(2, Math.max(...n.map((c) => c[0])) + 1), H: Math.max(2, Math.max(...n.map((c) => c[1])) + 1), cm: false, shapes: [], pts: [], cands: [] };
  const box = el('div');
  box.innerHTML = moveSvg(sp);
  const svg = box.querySelector('svg');
  mcellsLayer(svg, { G: moveGeom(sp) }, n, cls);
  return svg;
}
/**
 * 답한 뒤 칸 칠하기 판 — 후보 ㉠~㉣ 그림(풀이 카드가 이 이름으로 말한다. 판에서는 못 봤다) + 내가 칠한 것 + 틀렸으면 맞는 것.
 * place는 한 모눈에(처음·나중 도형 · 내 칸 · 맞는 칸 점선), shape는 모양 둘을 나란히. text는 ㉡·"오른쪽으로 5칸 옮김"·"칠한 모양 …"·"모르겠어요"
 */
function mcellsAnswered(draw, text, ok) {
  const g = mcellsOf(draw);
  const wrap = el('div', `math-draw is-answered is-paint is-move ${ok ? 'ok' : 'no'}`);
  const cand = g ? g.cands.find((c) => c.k === text) : null;
  // 칠한 칸은 판에 남은 값이 보낸 글자와 같으면 그 자리 그대로(모양이 바뀐 도형도 칠한 자리에), 아니면 글자에서
  const pend = g && typeof draw.pending === 'string' && draw.pending && mcellsText(g, draw.pending) === text ? mvCellsOfVal(draw.pending) : null;
  const mine = !g ? null : cand ? cand.cells : pend || mcellsFromText(g, text);
  const noun = g && g.kind === 'place' ? '도형' : '모양';
  if (g) {
    const fig = el('div', 'math-fig math-draw-fig');
    const b0 = g.sp.shapes[0];
    fig.innerHTML = figureSvg(g.kind === 'place' ? `move ${g.W}x${g.H} ${b0.k}@${b0.x},${b0.y}=${b0.v} ${g.cands.map((c) => `${c.k}@${c.v}`).join(' ')}` : draw.fig);
    wrap.appendChild(fig);
    if (g.kind === 'place') {
      const b = el('div', 'math-fig math-draw-fig');
      b.innerHTML = moveSvg(g.sp);
      const svg = b.querySelector('svg');
      const placed = cand || pend || !/^바뀐 모양 /.test(text); // 글자로만 아는 "바뀐 모양"은 자리를 몰라 모눈에 안 얹는다
      if (mine && placed) mcellsLayer(svg, g, mine, ok ? 'is-ok' : 'is-no');
      if (!ok) mcellsLayer(svg, g, g.target.cells, 'is-right');
      wrap.appendChild(b);
    } else {
      const pair = el('div', 'math-paint-pair');
      const one = (cells, cls, cap) => { const f = el('figure', 'math-draw-fig'); f.appendChild(mvShapeFig(cells, cls)); f.appendChild(el('figcaption', '', cap)); pair.appendChild(f); };
      if (mine) one(mine, ok ? 'is-ok' : 'is-no', '내가 칠한 모양');
      if (!ok) one(g.target.cells, 'is-right', `맞는 모양 ${g.target.k}`);
      wrap.appendChild(pair);
    }
  }
  const p = el('p', `math-pad-answered ${ok ? 'ok' : 'no'}`);
  p.appendChild(document.createTextNode(mine && g ? `✍️ 내가 칠한 ${noun}: ${cand ? `${cand.k}과 같아요` : text} ` : `✍️ 내 답: ${text} `));
  p.appendChild(el('span', 'mark', ok ? '✔' : '✘'));
  wrap.appendChild(p);
  if (!ok && g) wrap.appendChild(el('p', 'math-draw-right', g.kind === 'place' ? `점선이 맞는 자리 — ${g.target.k}` : `맞는 모양 — ${g.target.k}`));
  return wrap;
}

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
  if (draw && draw.mode === 'grid') return gridBox(draw, { onSubmit, onIdk });
  if (draw && draw.mode === 'plane') return planeBox(draw, { onSubmit, onIdk });
  if (draw && draw.mode === 'cells') return paintBox(draw, { onSubmit, onIdk });
  if (draw && draw.mode === 'mpoint') return mpointBox(draw, { onSubmit, onIdk });
  if (draw && draw.mode === 'mcells') return mcellsBox(draw, { onSubmit, onIdk });
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
  if (draw && draw.mode === 'grid') return gridAnswered(draw, text, ok);
  if (draw && draw.mode === 'plane') return planeAnswered(draw, text, ok);
  if (draw && draw.mode === 'cells') return paintAnswered(draw, text, ok);
  if (draw && draw.mode === 'mpoint') return mpointAnswered(draw, text, ok);
  if (draw && draw.mode === 'mcells') return mcellsAnswered(draw, text, ok);
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
