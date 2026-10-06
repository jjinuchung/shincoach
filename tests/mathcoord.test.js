// 📈 R 좌표평면과 그래프 줄기 생성기 테스트: node --test tests/mathcoord.test.js
//
// ★ 핵심은 **독립 검산** — 생성기가 알려 주는 값(probe)을 믿지 않고 **문제 글과 그림 지시문을 이 파일이 직접 읽어** 다시 푼다.
//   · 좌표·사분면은 부호를 이 파일이 다시 따지고, 삼각형 넓이는 꼭짓점으로 신발끈 공식(÷ 2 공식을 안 쓴다)
//   · 그래프 해석은 지시문의 꺾은선을 이 파일이 따라가며 값·평평한 구간·되풀이를 찾는다
//   · 식 보기("y = 6x" · "y = 48/x" · "x + y = 5")는 이 파일의 계산기로 x에 여러 값을 넣어 정비례(y ÷ x 일정)·반비례(x × y 일정)를 따진다
// ★ 이름표는 값만이 아니라 **뜻**까지 — 그 틀린 생각을 문제의 수로 다시 해서 오답과 대조한다 (생성기 이름표를 베끼지 않는다 — 메모 38·40번)
// ★ 그림은 그린 SVG에서 잰다 — 눈금 수 두 개로 자를 세워 점·직선·곡선·꺾은선이 정말 그 자리에 있는지
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { COORD, TAGS, makeQuestion, makeRound, ladder, placeFrom, diagnosticSet, lessonOf, checkContent, gradeLabel } from '../js/mathcoord.js';
import { tplKey } from '../js/mathgen.js';
import { figureSvg, renderFigures, figText } from '../js/mathdraw.js';
import { padSpec, readTyped, matchTyped, partsOf } from '../js/mathpad.js';
import { valueOf } from '../js/mathexpr.js';

const OPTS = { names: ['피카츄', '리자몽', '개굴닌자'], me: '진우', worlds: { pokemon: [], toystory: [], minions: [], moana: [] } };
const SEEDS = Number(process.env.RNG_SEEDS) || 300;
// 그림 검사는 따로 넓힌다 — RNG_SEEDS를 따라가면 2만에서 너무 느리고, 200에 묶어 두면 2만이 그림을 안 넓힌다 (메모 37번)
const FIG_SEEDS = Number(process.env.FIG_SEEDS) || 200;
const IDS = COORD.map((c) => c.id);

// ───────────────────── 이 파일의 읽기 도구 ─────────────────────

const N = (t) => Number(String(t).replace(/−/g, '-'));
const near = (a, b) => Math.abs(a - b) < 1e-9;
/** 보기 글자 → 값 ("−3" · "−5/4" · "2.4") */
function val(t) {
  const s = String(t).trim().replace(/−/g, '-'); let m;
  if ((m = /^(-?)(\d+)\/(\d+)$/.exec(s))) return (m[1] ? -1 : 1) * (+m[2] / +m[3]);
  return /^-?\d+(\.\d+)?$/.test(s) ? Number(s) : NaN;
}
/** "(2, −3)" → [2, −3] */
function coOf(t) { const m = /^\((−?\d+), (−?\d+)\)$/.exec(String(t).trim()); return m ? [N(m[1]), N(m[2])] : null; }
const sameCo = (p, x, y) => !!p && p[0] === x && p[1] === y;
/** 사분면 (축 위는 0) */
const quad = (x, y) => (!x || !y ? 0 : x > 0 ? (y > 0 ? 1 : 4) : (y > 0 ? 2 : 3));
const qOfName = (t) => { if (t === '어느 사분면에도 속하지 않아요') return 0; const m = /^제([1-4])사분면$/.exec(t); return m ? +m[1] : NaN; };
const CLOCKWISE = { 0: 0, 1: 1, 2: 4, 3: 3, 4: 2 };

/** [plane …] 지시문을 이 파일이 따로 읽는다 (mathdraw.parsePlane을 쓰지 않는다) */
function planeOf(q) {
  const m = /\[plane ([^\]]+)\]/.exec(q);
  if (!m) return null;
  const P = { pts: {}, cands: {}, lin: null, inv: null, path: null, xs: 1, ys: 1, x: [-5, 5], y: [-5, 5], poly: '' };
  for (const t of m[1].trim().split(/\s+/)) {
    let k;
    if ((k = /^([A-Z㉠-㉣]?)\((−?\d+),(−?\d+)\)$/.exec(t))) { const p = [N(k[2]), N(k[3])]; if (/[㉠-㉣]/.test(k[1])) P.cands[k[1]] = p; else P.pts[k[1]] = p; }
    else if ((k = /^([xy])=(−?\d+)\.\.(−?\d+)$/.exec(t))) P[k[1]] = [N(k[2]), N(k[3])];
    else if ((k = /^([xy])s=(\d+)$/.exec(t))) P[`${k[1]}s`] = +k[2];
    else if ((k = /^lin=(−?\d+)(?:\/(\d+))?$/.exec(t))) P.lin = N(k[1]) / (k[2] ? +k[2] : 1);
    else if ((k = /^inv=(−?\d+)$/.exec(t))) P.inv = N(k[1]);
    else if ((k = /^path=(.+)$/.exec(t))) P.path = k[1].split(',').map((s) => s.split(':').map(N));
    else if ((k = /^poly=([A-Z]+)$/.exec(t))) P.poly = k[1];
    else if (/^[xy]l=/.test(t)) { /* 축 이름 */ }
    else if (t === 'smooth') P.smooth = true; // 관람차 — 같은 점을 지나는 부드러운 선
    else throw new Error(`모르는 지시문 토큰 ${t}`);
  }
  return P;
}
/** 꺾은선 위에서 x일 때 y (선분 사이는 곧게) */
function yAt(path, x) {
  for (let i = 1; i < path.length; i++) {
    const [x0, y0] = path[i - 1]; const [x1, y1] = path[i];
    if (x >= x0 && x <= x1) return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0);
  }
  return NaN;
}
/** 식 보기 → 함수 ("y = 6x" · "y = −x/3" · "y = 48/x" · "y = 48 − x" · "x + y = 5") */
function formula(t) {
  const s = String(t).replace(/−/g, '-').trim(); let m;
  if ((m = /^x \+ y = (-?\d+)$/.exec(s))) { const c = +m[1]; return (x) => c - x; }
  if (!(m = /^y = (.+)$/.exec(s))) return null;
  const js = m[1].replace(/(\d)x/g, '$1*x').replace(/(\d+)\/x/g, '($1/x)').replace(/x\/(\d+)/g, '(x/$1)');
  if (!/^[\d x+\-*/().]+$/.test(js)) return null;
  return Function('x', `return ${js};`);
}
const XS = [1, 2, 3, -2, 5, -7];
const isProp = (f) => { const a = f(1); return !!f && near(f(0), 0) && !near(a, 0) && XS.every((x) => near(f(x) / x, a)); };
const isInv = (f) => { const a = f(1); return !!f && !near(a, 0) && XS.every((x) => near(f(x) * x, a)); };

/** 그래프 설명 — 정비례 y = ax (이 파일이 따로 따진다) */
function linStmt(a, s) {
  if (s === '오른쪽 아래로 향하는 직선이에요') return a < 0;
  if (s === 'x의 값이 커지면 y의 값도 커져요') return a > 0;
  if (s === '제1사분면과 제3사분면을 지나요') return a > 0;
  if (s === '원점을 지나지 않아요') return false;
  const m = /^x = 1일 때 y = (−?\d+)(?:이에요|예요)$/.exec(s);
  if (m) return N(m[1]) === a;
  throw new Error(`모르는 설명 ${s}`);
}
/** 그래프 설명 — 반비례 y = a/x */
function invStmt(a, s) {
  if (s === '제2사분면과 제4사분면을 지나는 곡선이에요') return a < 0;
  if (s === '제1사분면과 제3사분면을 지나는 곡선이에요') return a > 0;
  if (s === '원점을 지나는 곡선이에요' || s === 'x축과 만나는 곡선이에요' || s === 'y축과 만나는 곡선이에요') return false;
  throw new Error(`모르는 설명 ${s}`);
}

/**
 * 문제 글을 따로 읽어 풀기 → { type, form: 'num' | 'pick', ans?, right?(보기 글), f }
 * 모르는 글이면 던진다 (생성기에 새 틀이 생기면 여기도 늘려야 한다)
 */
function solveText(q) {
  const L = q.trim().split('\n').filter(Boolean).pop();
  const P = planeOf(q);
  let m;
  const NUM = (type, ans, f) => ({ type, form: 'num', ans, f });
  const PICK = (type, right, f) => ({ type, form: 'pick', right, f });
  // R1
  if ((m = /\[line (−?\d+)\.\.(−?\d+) @(−?\d+)\]/.exec(q)) && /수직선 위에 찍은 점의 좌표는 얼마일까요\?/.test(q)) return NUM('nline', N(m[3]), { v: N(m[3]), lo: N(m[1]) });
  if (/^좌표평면 위의 점 P의 좌표는 어느 것일까요\?$/.test(q.split('\n')[0])) { const [a, b] = P.pts.P; return PICK('read', (t) => sameCo(coOf(t), a, b), { a, b }); }
  if ((m = /^좌표평면 위의 점 A의 ([xy])좌표는 얼마일까요\?/.exec(q))) { const [a, b] = P.pts.A; const [v, o] = m[1] === 'x' ? [a, b] : [b, a]; return NUM('one', v, { v, o }); }
  // R2
  if ((m = /^좌표가 \((−?\d+), (−?\d+)\)인 점은 어느 것일까요\?/.exec(q))) { const a = N(m[1]); const b = N(m[2]); return PICK('pick', (t) => sameCo(P.cands[t], a, b), { a, b, cands: P.cands }); }
  if ((m = /^([xy])축 위에 있고 \1좌표가 (−?\d+)인 점의 좌표는 어느 것일까요\?$/.exec(L))) { const v = N(m[2]); const [x, y] = m[1] === 'x' ? [v, 0] : [0, v]; return PICK('axis', (t) => sameCo(coOf(t), x, y), { axis: m[1], v, x, y }); }
  if ((m = /^세 점 A\((−?\d+), (−?\d+)\), B\((−?\d+), (−?\d+)\), C\((−?\d+), (−?\d+)\) — 이 세 점을 꼭짓점으로 하는 삼각형 ABC의 넓이는 얼마일까요\?/.exec(q))) {
    const [ax, ay, bx, by, cx, cy] = m.slice(1).map(N);
    const shoe = Math.abs(ax * (by - cy) + bx * (cy - ay) + cx * (ay - by)) / 2;
    assert.deepEqual([P.pts.A, P.pts.B, P.pts.C], [[ax, ay], [bx, by], [cx, cy]], '그림의 꼭짓점 = 글의 꼭짓점');
    return NUM('area', shoe, { ax, ay, bx, by, cx, cy });
  }
  // R3
  if ((m = /^좌표가 \((−?\d+), (−?\d+)\)인 점은 어느 사분면 위에 있을까요\?$/.exec(L))) { const x = N(m[1]); const y = N(m[2]); return PICK('which', (t) => qOfName(t) === quad(x, y), { x, y }); }
  if ((m = /^점 \(a, b\)가 제([1-4])사분면 위에 있을 때, 점 \((−?\d*[ab]), (−?\d*[ab])\)는 어느 사분면 위에 있을까요\?$/.exec(L))) {
    const g = +m[1]; const [sa, sb] = { 1: [1, 1], 2: [-1, 1], 3: [-1, -1], 4: [1, -1] }[g];
    const env = { a: 2 * sa, b: 3 * sb };
    const ev = (t) => { const k = /^(−?)(\d*)([ab])$/.exec(t); return (k[1] ? -1 : 1) * (k[2] ? +k[2] : 1) * env[k[3]]; };
    const ans = quad(ev(m[2]), ev(m[3]));
    return PICK('sign', (t) => qOfName(t) === ans, { g, ans });
  }
  // R4
  if ((m = /물을 넣기 시작한 지 (\d+)분 뒤 물의 높이는 몇 cm일까요\?$/.exec(L))) { const x = +m[1]; return NUM('tankval', yAt(P.path, x), { x, ys: P.ys }); }
  if (/가는 도중에 몇 분 동안 쉬었을까요\?$/.test(L)) {
    const flats = []; for (let i = 1; i < P.path.length; i++) if (P.path[i][1] === P.path[i - 1][1]) flats.push([P.path[i - 1][0], P.path[i][0], P.path[i][1]]);
    assert.equal(flats.length, 1, '쉰 구간은 하나');
    const [x0, x1, y] = flats[0];
    return NUM('rest', x1 - x0, { end: x1, y });
  }
  if ((m = /^(\d+)분부터 (\d+)분까지 물의 높이는 어떻게 되었을까요\?$/.exec(L))) {
    const a = +m[1]; const b = +m[2];
    // 그 구간 안에서 한 방향인지 (중간 꺾임이 없는지)
    const inner = P.path.filter(([x]) => x > a && x < b);
    assert.equal(inner.length, 0, '묻는 구간 안에 꺾임이 없다');
    const ya = yAt(P.path, a); const yb = yAt(P.path, b);
    const kind = ya < yb ? 'up' : ya === yb ? 'flat' : 'down';
    const ans = { up: '높아졌어요', flat: '그대로였어요', down: '낮아졌어요' }[kind];
    return PICK('seg', (t) => t === ans, { kind });
  }
  if (/가장 낮은 곳에서 출발해 다시 가장 낮은 곳으로 돌아오는 데 몇 분이 걸릴까요\?$/.test(L)) {
    const lo = Math.min(...P.path.map((p) => p[1])); assert.equal(P.path[0][1], lo, '가장 낮은 곳에서 출발');
    const back = P.path.find(([x, y]) => x > 0 && y === lo);
    const hi = Math.max(...P.path.map((p) => p[1])); const top = P.path.find(([, y]) => y === hi);
    return NUM('period', back[0], { topX: top[0], hi });
  }
  // R5
  if (/^y가 x에 정비례할 때, x와 y 사이의 관계를 식으로 나타내면 어느 것일까요\?/.test(q) || /^y가 x에 반비례할 때, x와 y 사이의 관계를 식으로 나타내면 어느 것일까요\?/.test(q)) {
    const tm = /\[table x:([\d, ]+) \/ y:([\d, ]+)\]/.exec(q);
    const xs = tm[1].split(', ').map(Number); const ys = tm[2].split(', ').map(Number);
    const inv = /반비례/.test(q.split('\n')[0]);
    if (inv) assert.ok(xs.every((x, i) => x * ys[i] === xs[0] * ys[0]), '표가 반비례');
    else assert.ok(xs.every((x, i) => ys[i] / x === ys[0] / xs[0]), '표가 정비례');
    const fits = (t) => { const f = formula(t); return !!f && xs.every((x, i) => near(f(x), ys[i])) && (inv ? isInv(f) : isProp(f)); };
    return PICK(inv ? 'itable' : 'ptable', fits, { xs, ys });
  }
  if ((m = /^y가 x에 (정|반)비례하고, x = (−?\d+)일 때 y = (−?\d+)인 관계예요\. x = (−?\d+)일 때 y의 값은 얼마일까요\?$/.exec(L))) {
    const p = N(m[2]); const qv = N(m[3]); const s = N(m[4]);
    return m[1] === '정' ? NUM('ppair', (qv / p) * s, { p, q: qv, s }) : NUM('ipair', (p * qv) / s, { p, q: qv, s });
  }
  if ((m = /^다음 중 y가 x에 (정|반)비례하는 것은 어느 것일까요\?$/.exec(L))) { const inv = m[1] === '반'; return PICK(inv ? 'iwhich' : 'pwhich', (t) => { const f = formula(t); return !!f && (inv ? isInv(f) : isProp(f)); }, {}); }
  // R6
  if (/^다음 그래프가 나타내는 식은 어느 것일까요\?/.test(q)) { const [px, py] = P.pts.P; return PICK('g2f', (t) => { const f = formula(t); return !!f && isProp(f) && near(f(px), py); }, { a: py / px }); }
  if ((m = /^y = ax의 그래프가 점 P를 지나요\. 점 P의 좌표가 \((−?\d+), (−?\d+)\)일 때, a의 값은 얼마일까요\?$/.exec(L))) { const p = N(m[1]); const qv = N(m[2]); return NUM('p2a', qv / p, { p, q: qv }); }
  if ((m = /^y = (−?\d+)x의 그래프 위에 점 A가 있어요\. 점 A의 x좌표가 (−?\d+)일 때, y좌표는 얼마일까요\?$/.exec(L))) { const a = N(m[1]); const s = N(m[2]); return NUM('yon', a * s, { a, s }); }
  if ((m = /^y = (−?\d*)x의 그래프에 대한 설명으로 옳은 것은 어느 것일까요\?$/.exec(L))) { const a = N(m[1] === '−' ? '-1' : m[1] || '1'); return PICK('lprop', (t) => linStmt(a, t), { a }); }
  if (/^다음 중 그래프가 y축에 가장 가까운 것은 어느 것일까요\?$/.test(L)) return { type: 'close', form: 'close', f: {} };
  // R7
  if ((m = /^y가 x에 반비례하고, x = (\d+)일 때 y = (\d+)인 관계예요\. 이 관계를 식 y = a\/x 꼴로 나타낼 때, a의 값은 얼마일까요\?$/.exec(L))) { const p = +m[1]; const qv = +m[2]; return NUM('ia', p * qv, { p, q: qv }); }
  // R8
  if (/^다음은 y = a\/x의 그래프예요\. 점 P가 그래프 위에 있을 때, a의 값은 얼마일까요\?/.test(q)) { const [px, py] = P.pts.P; return NUM('g2a', px * py, { px, py }); }
  if ((m = /^y = (−?\d+)\/x의 그래프 위에 점 A가 있어요\. 점 A의 y좌표가 (−?\d+)일 때, x좌표는 얼마일까요\?$/.exec(L))) { const a = N(m[1]); const qv = N(m[2]); return NUM('xon', a / qv, { a, q: qv }); }
  if ((m = /^y = (−?\d+)\/x의 그래프에 대한 설명으로 옳은 것은 어느 것일까요\?$/.exec(L))) { const a = N(m[1]); return PICK('iprop', (t) => invStmt(a, t), { a }); }
  // R9
  if ((m = /1분에 (\d+) m씩 일정하게 걸어요\. x분 동안 걸은 거리를 y m라고 할 때, (\d+) m를 걷는 데 몇 분이 걸릴까요\?$/.exec(q))) { const v = +m[1]; const D = +m[2]; return NUM('walk', D / v, { v, D }); }
  if ((m = /톱니가 (\d+)개인 A가 1분에 (\d+)바퀴 돌 때, 톱니가 (\d+)개인 B는 1분에 몇 바퀴 돌까요\?$/.exec(q))) { const [a, t, b] = m.slice(1).map(Number); return NUM('gear', (a * t) / b, { a, t, b }); }
  if ((m = /^물 (\d+) L를 채우는데, 1분에 x L씩 넣으면 y분이 걸려요\. 1분에 (\d+) L씩 넣으면 몇 분이 걸릴까요\?$/.exec(L))) { const V = +m[1]; const x = +m[2]; return NUM('atank', V / x, { V, x }); }
  if ((m = /무게가 (\d+) g인 추를 매달았더니 (\d+) cm 늘어났어요\. 무게가 (\d+) g인 추를 매달면 몇 cm 늘어날까요\?$/.exec(q))) { const [g1, c1, g2] = m.slice(1).map(Number); return NUM('spring', (c1 * g2) / g1, { g1, c1, g2 }); }
  if ((m = /^넓이가 (\d+) cm²인 직사각형의 가로를 x cm, 세로를 y cm라고 해요\. 가로가 (\d+) cm일 때 세로는 몇 cm일까요\?$/.exec(L))) { const S = +m[1]; const w = +m[2]; return NUM('rect', S / w, { S, w }); }
  throw new Error(`모르는 문제 글: ${q}`);
}

/** 맞는 보기 — 이 파일이 따로 푼 답으로 */
function rightOnes(sv, chs) {
  if (sv.form === 'num') return chs.filter((x) => near(val(x.text), sv.ans));
  if (sv.form === 'close') { const abs = chs.map((x) => Math.abs(formula(x.text)(1))); const mx = Math.max(...abs); return chs.filter((x, i) => abs[i] === mx); }
  return chs.filter((x) => sv.right(x.text));
}

/** 이름표의 뜻 — 그 틀린 생각을 문제의 수로 다시 해서 오답과 대조 (생성기를 베끼지 않는다) */
function tagHolds(sv, tag, text, chs) {
  const f = sv.f; const v = val(text); const c = coOf(text);
  switch (`${sv.type} ${tag}`) {
    case `nline ${TAGS.signFlip}`: return v === -f.v;
    case `nline ${TAGS.fromEdge}`: return v === f.v - f.lo;
    case `read ${TAGS.swapXY}`: return sameCo(c, f.b, f.a);
    case `read ${TAGS.signX}`: return sameCo(c, -f.a, f.b);
    case `read ${TAGS.signY}`: return sameCo(c, f.a, -f.b);
    case `one ${TAGS.coordOther}`: return v === f.o;
    case `one ${TAGS.signFlip}`: return v === -f.v;
    case `pick ${TAGS.swapXY}`: return sameCo(f.cands[text], f.b, f.a);
    case `pick ${TAGS.signX}`: return sameCo(f.cands[text], -f.a, f.b);
    case `pick ${TAGS.signY}`: return sameCo(f.cands[text], f.a, -f.b);
    case `axis ${TAGS.swapXY}`: return sameCo(c, f.y, f.x);
    case `axis ${TAGS.sameBoth}`: return sameCo(c, f.v, f.v);
    case `area ${TAGS.noHalf}`: return v === Math.abs(f.cx - f.bx) * Math.abs(f.ay - f.by);
    case `area ${TAGS.distSign}`: return f.bx < 0 && f.cx > 0 && v === ((Math.abs(f.cx) - Math.abs(f.bx)) * Math.abs(f.ay - f.by)) / 2;
    case `which ${TAGS.quadOrder}`: return qOfName(text) === CLOCKWISE[quad(f.x, f.y)];
    case `which ${TAGS.dropSign}`: return qOfName(text) === 1;
    case `which ${TAGS.signX}`: return qOfName(text) === quad(-f.x, f.y);
    case `which ${TAGS.signY}`: return qOfName(text) === quad(f.x, -f.y);
    case `which ${TAGS.zeroPos}`: return qOfName(text) === quad(f.x || 1, f.y || 1);
    case `which ${TAGS.zeroNeg}`: return qOfName(text) === quad(f.x || -1, f.y || -1);
    case `sign ${TAGS.sameQuad}`: return qOfName(text) === f.g;
    case `sign ${TAGS.quadOrder}`: return qOfName(text) === CLOCKWISE[f.ans];
    case `sign ${TAGS.signWrong}`: { const w = qOfName(text); return w !== f.ans && w !== f.g && w !== CLOCKWISE[f.ans]; }
    case `tankval ${TAGS.cellCount}`: return v === sv.ans / f.ys;
    case `tankval ${TAGS.xForY}`: return v === f.x;
    case `rest ${TAGS.endAsLen}`: return v === f.end;
    case `rest ${TAGS.yForX}`: return v === f.y;
    case `seg ${TAGS.flatAsMove}`: return f.kind === 'flat' && text !== '그대로였어요';
    case `seg ${TAGS.moveAsFlat}`: return f.kind !== 'flat' && text === '그대로였어요';
    case `seg ${TAGS.upAsDown}`: return f.kind === 'up' && text === '낮아졌어요';
    case `seg ${TAGS.downAsUp}`: return f.kind === 'down' && text === '높아졌어요';
    case `period ${TAGS.halfPeriod}`: return v === f.topX;
    case `period ${TAGS.yForX}`: return v === f.hi;
    case `ptable ${TAGS.stepAsAdd}`: { const g = formula(text); const d = f.ys[1] - f.ys[0]; return !!g && [0, 1, 4, 9].every((x) => near(g(x), x + d)); }
    case `ptable ${TAGS.flipRatio}`: { const g = formula(text); const a = f.ys[0] / f.xs[0]; return !!g && [1, 4, 9].every((x) => near(g(x), x / a)); }
    case `ppair ${TAGS.signDrop}`: return near(v, -sv.ans);
    case `ppair ${TAGS.diffSame}`: return near(v, f.s + f.q - f.p);
    case `pwhich ${TAGS.growAsProp}`: { const g = formula(text); return !!g && !near(g(0), 0) && [1, 2, 5].every((x) => near(g(x) - x, g(0))); }
    case `pwhich ${TAGS.constAdd}`: { const g = formula(text); return !!g && !near(g(0), 0) && !near(g(1) - g(0), 1) && near(g(2) - g(1), g(1) - g(0)); }
    case `pwhich ${TAGS.sumAsProp}`: return /^x \+ y = \d+$/.test(text);
    case `g2f ${TAGS.aSign}`: { const g = formula(text); return !!g && near(g(1), -f.a); }
    case `g2f ${TAGS.flipRatio}`: { const g = formula(text); return !!g && near(g(1), 1 / f.a); }
    case `p2a ${TAGS.flipRatio}`: return near(v, f.p / f.q);
    case `p2a ${TAGS.aSign}`: return near(v, -f.q / f.p);
    case `yon ${TAGS.mulSign}`: return near(v, -f.a * f.s);
    case `yon ${TAGS.addForMul}`: return near(v, f.a + f.s);
    case `yon ${TAGS.divForMul}`: return near(v, f.s / f.a);
    case `lprop ${TAGS.aSign}`: case `lprop ${TAGS.signDrop}`: case `lprop ${TAGS.dirWrong}`: case `lprop ${TAGS.signFlip}`: return linStmt(-f.a, text) && !linStmt(f.a, text);
    case `lprop ${TAGS.notOrigin}`: return text === '원점을 지나지 않아요';
    case `close ${TAGS.signBig}`: { const as = chs.map((x) => formula(x.text)(1)); return near(formula(text)(1), Math.max(...as)); }
    case `close ${TAGS.smallClose}`: { const as = chs.map((x) => Math.abs(formula(x.text)(1))); return near(Math.abs(formula(text)(1)), Math.min(...as)); }
    case `itable ${TAGS.flipInv}`: { const g = formula(text); const a = f.xs[0] * f.ys[0]; return !!g && [1, 4, 9].every((x) => near(g(x), x / a)); }
    case `itable ${TAGS.shrinkAsSub}`: { const g = formula(text); const a = f.xs[0] * f.ys[0]; return !!g && [1, 4, 9].every((x) => near(g(x), a - x)); }
    case `ipair ${TAGS.propInstead}`: return near(v, (f.q * f.s) / f.p);
    case `ipair ${TAGS.sumSame}`: return near(v, f.p + f.q - f.s);
    case `ipair ${TAGS.signDrop}`: return near(v, -sv.ans);
    case `iwhich ${TAGS.shrinkAsInv}`: { const g = formula(text); return !!g && [1, 2, 5].every((x) => near(g(x) + x, g(0))) && !isInv(g); }
    case `iwhich ${TAGS.fracAsInv}`: { const g = formula(text); return !!g && isProp(g) && g(1) > 0 && g(1) < 1; }
    case `iwhich ${TAGS.negAsInv}`: { const g = formula(text); return !!g && isProp(g) && g(1) < 0 && Number.isInteger(g(1)); }
    case `ia ${TAGS.propInstead}`: return near(v, f.q / f.p);
    case `ia ${TAGS.addForMul}`: return near(v, f.p + f.q);
    case `g2a ${TAGS.propInstead}`: return near(v, f.py / f.px);
    case `g2a ${TAGS.signDrop}`: return near(v, -f.px * f.py);
    case `g2a ${TAGS.addForMul}`: return near(v, f.px + f.py);
    case `xon ${TAGS.mulForDiv}`: return near(v, f.a * f.q);
    case `xon ${TAGS.flipInv}`: return near(v, f.q / f.a);
    case `iprop ${TAGS.aSign}`: return invStmt(-f.a, text) && !invStmt(f.a, text);
    case `iprop ${TAGS.originInv}`: return text === '원점을 지나는 곡선이에요';
    case `iprop ${TAGS.axisMeet}`: return /^[xy]축과 만나는 곡선이에요$/.test(text);
    case `walk ${TAGS.mulForDiv}`: return v === f.D * f.v;
    case `walk ${TAGS.subForDiv}`: return v === f.D - f.v;
    case `gear ${TAGS.propInstead}`: return near(v, (f.b * f.t) / f.a);
    case `gear ${TAGS.sameTurns}`: return v === f.t;
    case `atank ${TAGS.mulForDiv}`: return v === f.V * f.x;
    case `atank ${TAGS.subForDiv}`: return v === f.V - f.x;
    case `spring ${TAGS.addDiff}`: return v === f.c1 + f.g2 - f.g1;
    case `spring ${TAGS.invInstead}`: return near(v, (f.c1 * f.g1) / f.g2); // 정비례 상황을 반비례로 (Codex 33차 #2 — 예전엔 "정비례처럼"이라 거꾸로 보고)
    case `rect ${TAGS.subForDiv}`: return v === f.S - f.w;
    case `rect ${TAGS.mulForDiv}`: return v === f.S * f.w;
    default: throw new Error(`판정표에 없는 이름표: ${sv.type} "${tag}"`);
  }
}

const allText = (q) => [q.q, ...q.choices.map((x) => x.text), ...(q.solve ? [...q.solve.steps, ...Object.values(q.solve.why), q.solve.whyAny, q.solve.rule] : [])].join('\n');
function* every(kinds = ['calc', 'misread'], n = SEEDS) {
  for (const c of COORD) for (const k of kinds) for (let s = 1; s <= n; s++) yield { c, k, s, q: makeQuestion(c.id, k, s, OPTS) };
}

// ───────────────────── 사다리 ─────────────────────

test('사다리: 9칸, 모두 중1, needs가 바로 앞 칸 · 맨 뒤는 ⭐', () => {
  assert.deepEqual(IDS, ['crd.read', 'crd.plot', 'crd.quad', 'crd.graph', 'crd.prop', 'crd.pgraph', 'crd.inv', 'crd.igraph', 'crd.apply']);
  COORD.forEach((c, i) => {
    assert.equal(c.grade, 7, c.id);
    assert.deepEqual(c.needs, i ? [IDS[i - 1]] : [], c.id);
    assert.ok(c.idea && c.rule && c.slip, c.id);
  });
  assert.equal(gradeLabel(7), '중1');
  assert.match(COORD[8].name, /^⭐/);
});

test('이 파일의 읽기 도구 자체 점검 — 식·정비례·반비례·꺾은선·사분면', () => {
  assert.ok(isProp(formula('y = 6x')) && isProp(formula('y = −x/3')) && isProp(formula('y = x/4')));
  assert.ok(!isProp(formula('y = x + 6')) && !isProp(formula('y = 3x + 2')) && !isProp(formula('x + y = 7')) && !isProp(formula('y = 12/x')));
  assert.ok(isInv(formula('y = 48/x')) && isInv(formula('y = −12/x')));
  assert.ok(!isInv(formula('y = 48 − x')) && !isInv(formula('y = x/48')) && !isInv(formula('y = −3x')));
  assert.equal(formula('y = −2x')(3), -6);
  assert.equal(yAt([[0, 0], [2, 10], [5, 10], [10, 0]], 7), 6);
  assert.deepEqual([quad(2, 3), quad(-2, 3), quad(-2, -3), quad(2, -3), quad(0, 3), quad(2, 0)], [1, 2, 3, 4, 0, 0]);
  assert.equal(val('−5/4'), -1.25);
  assert.deepEqual(coOf('(−2, 3)'), [-2, 3]);
  assert.equal(planeOf('[plane x=−6..6 y=−6..6 inv=−8 P(−2,4)]').inv, -8);
});

// ───────────────────── 문제 ─────────────────────

test('★ 독립 검산: ① 정답이 문제 글·그림 지시문을 따로 읽어 푼 답과 같다 · 딱 하나만 맞다 · 수 답은 정수이거나 기약분수', () => {
  const types = new Set();
  for (const { c, s, q } of every(['calc'])) {
    const sv = solveText(q.q);
    const ok = q.choices.find((x) => x.ok);
    const right = rightOnes(sv, q.choices);
    assert.equal(right.length, 1, `${c.id} #${s} (${sv.type}): 맞는 보기 ${right.map((x) => x.text).join(', ') || '없음'}\n${q.q}\n${q.choices.map((x) => x.text).join(' | ')}`);
    assert.equal(right[0], ok, `${c.id} #${s}: 정답 표시 "${ok.text}" ≠ 따로 푼 "${right[0].text}"\n${q.q}`);
    if (sv.form === 'num') assert.ok(Number.isInteger(sv.ans), `${c.id} #${s}: 답이 정수가 아니다 ${sv.ans}\n${q.q}`);
    types.add(sv.type);
  }
  assert.ok(types.size >= 32, `문제 종류 ${types.size}: ${[...types]}`);
});

test('★ 드문 우연 — 고르기 문항은 씨앗 5,000개로 따로: 맞는 보기가 딱 하나', () => {
  let n = 0;
  for (const c of COORD) for (let s = 1; s <= Math.max(SEEDS, 5000); s++) {
    const q = makeQuestion(c.id, 'calc', s, OPTS);
    const sv = solveText(q.q);
    if (sv.form === 'num') continue;
    const right = rightOnes(sv, q.choices);
    assert.ok(right.length === 1 && right[0].ok, `${c.id} #${s} (${sv.type}): 맞는 보기 ${right.map((x) => x.text).join(', ')}\n${q.q}`);
    n++;
  }
  assert.ok(n > 15000, `본 고르기 문항 ${n}`);
});

test('★ 보기: 정답 하나, 글자 겹침 없음, 3개 이상, 빈 글자·undefined·NaN·남은 자리표시 없음 · 그림 지시문은 plane·line·table만, 모두 그려진다', () => {
  for (const { c, k, s, q } of every()) {
    const at = `${c.id} ${k} #${s}`;
    assert.ok(q.choices.length >= 3, `${at}: 보기 ${q.choices.length}`);
    assert.equal(q.choices.filter((x) => x.ok).length, 1, at);
    assert.equal(new Set(q.choices.map((x) => x.text)).size, q.choices.length, `${at}: 같은 글자 보기`);
    const all = allText(q);
    assert.ok(!/undefined|NaN|\{(me|mon)|null|Infinity/.test(all), `${at}: ${all}`);
    for (const d of q.q.match(/\[[a-z]+ [^\]]+\]/g) || []) {
      assert.match(d, /^\[(plane|line|table) /, `${at}: 다른 그림 ${d}`);
      const svg = figureSvg(d.slice(1, -1));
      assert.ok(svg.startsWith('<svg'), `${at}: 못 그리는 ${d}`);
      assert.ok(+/viewBox="-?\d+ -?\d+ (\d+)/.exec(svg)[1] <= 400, `${at}: 그림 폭 ${d}`);
    }
  }
});

test('★ 오개념 이름표: 그 오답이 정말 그 틀린 생각이다 — 문제의 수로 틀린 생각을 다시 한다 · 이름표 붙은 오답이 늘 둘 이상', () => {
  let n = 0;
  for (const { c, s, q } of every(['calc'])) {
    const sv = solveText(q.q);
    const tagged = q.choices.filter((x) => !x.ok && x.tag !== '계산 실수');
    assert.ok(tagged.length >= 2, `${c.id} #${s}: 이름표 붙은 오답 ${tagged.length}\n${q.q}`);
    for (const w of tagged) { assert.ok(tagHolds(sv, w.tag, w.text, q.choices), `${c.id} #${s} (${sv.type}): "${w.text}"의 이름표 "${w.tag}"가 뜻과 다르다\n${q.q}`); n++; }
  }
  assert.ok(n > 18 * SEEDS, `본 이름표 ${n}`);
});

test('★ 오답끼리 같은 값·같은 글이 되지 않는다 — 보기에서 겹쳐 빠지기 전(probe.allWrong) · 빠진 오답도 이름표의 뜻 그대로', () => {
  for (const { c, s, q } of every(['calc'])) {
    const sv = solveText(q.q); const ok = q.choices.find((x) => x.ok).text;
    const W = q.probe.allWrong;
    assert.equal(new Set(W.map((w) => w.text)).size, W.length, `${c.id} #${s}: 오답 글이 겹친다 ${W.map((w) => w.text)}`);
    const allChs = [{ text: ok }, ...W];
    for (const w of W) {
      assert.ok(w.text !== ok, `${c.id} #${s}: 오답 "${w.text}" = 정답`);
      if (sv.form === 'num') assert.ok(!near(val(w.text), sv.ans), `${c.id} #${s}: 오답 "${w.text}"이 맞는 값`);
      assert.ok(tagHolds(sv, w.tag, w.text, allChs), `${c.id} #${s}: 빠진 오답 "${w.text}"도 "${w.tag}"의 뜻\n${q.q}`);
    }
    if (sv.form === 'num') { const vals = W.map((w) => val(w.text)); assert.equal(new Set(vals).size, vals.length, `${c.id} #${s}: 오답 값이 겹친다 ${vals}`); }
    assert.equal(W.length, q.choices.filter((x) => !x.ok && x.tag !== '계산 실수').length, `${c.id} #${s}: 이름표 오답이 보기에서 빠졌다 ${W.map((w) => w.text)}`);
  }
});

/** ② 갈래마다 — 보여 준 말이 정말 틀렸고, 고치는 말이 맞는다 (이 파일이 따로 따진다) */
function checkMisread(q) {
  const shown = (/\*\*(.+?)\*\*/.exec(q.q) || [])[1] || '';
  const ok = q.choices.find((x) => x.ok).text;
  const P = planeOf(q.q);
  let m;
  switch (`${q.concept} ${q.key}`) {
    case 'crd.read misread:swap': {
      const [a, b] = P.pts.P; const said = coOf(/: (\(.+\))$/.exec(shown)[1]);
      assert.ok(!sameCo(said, a, b), '보여 준 좌표가 맞다'); assert.ok(sameCo(coOf(/: (\(.+\))$/.exec(ok)[1]), a, b), ok); break;
    }
    case 'crd.read misread:order': {
      m = /두 점 A\((\d+), (\d+)\), B\((\d+), (\d+)\)/.exec(q.q); const [a, b, c, d] = m.slice(1).map(Number);
      assert.ok(a === d && b === c && a !== b, '두 점은 순서만 바뀐 다른 점'); assert.equal(shown, '두 점은 같은 점이에요');
      assert.match(ok, new RegExp(`점 A의 x좌표는 ${a}, 점 B의 x좌표는 ${c}$`)); break;
    }
    case 'crd.plot misread:axis': { const [x] = coOf(/점 P의 좌표: (\(.+?\))/.exec(q.q)[1]); assert.equal(x, 0); assert.equal(shown, '점 P는 x축 위에 있어요'); assert.match(ok, /y축 위에 있어요$/); break; }
    case 'crd.plot misread:move': {
      const [a, b] = coOf(/점 P의 좌표: (\(.+?\))/.exec(q.q)[1]); assert.ok(b < 0 && a > 0);
      m = /원점에서 오른쪽으로 (\d+)칸, 위로 (\d+)칸/.exec(shown); assert.ok(+m[1] === a && +m[2] === -b, '보여 준 말은 아래를 위로');
      assert.match(ok, new RegExp(`오른쪽으로 ${a}칸, 아래로 ${-b}칸$`)); break;
    }
    case 'crd.quad misread:axis': { const [x, y] = coOf(/점의 좌표: (\(.+?\))/.exec(q.q)[1]); assert.equal(quad(x, y), 0); assert.match(shown, /제1사분면/); assert.match(ok, /어느 사분면에도 속하지 않아요$/); break; }
    case 'crd.quad misread:order': { const [x, y] = coOf(/점의 좌표: (\(.+?\))/.exec(q.q)[1]); const g = quad(x, y); assert.ok(qOfName(/(제\d사분면)/.exec(shown)[1]) !== g); assert.equal(qOfName(/(제\d사분면) 위의 점이에요$/.exec(ok)[1]), g); break; }
    case 'crd.graph misread:flat': {
      m = /(\d+)분부터 (\d+)분까지 그래프가 가로로 평평/.exec(shown); const a = +m[1]; const b = +m[2];
      assert.equal(yAt(P.path, a), yAt(P.path, b), '그 구간이 정말 평평'); assert.match(shown, /계속 달렸어요$/); assert.match(ok, /쉬고 있었어요$/); break;
    }
    case 'crd.graph misread:shape': { m = /처음 (\d+)분 동안/.exec(shown); assert.ok(yAt(P.path, +m[1]) > yAt(P.path, 0), '처음 구간은 멀어짐'); assert.match(ok, /멀어졌다는 뜻이에요$/); break; }
    case 'crd.prop misread:grow': { const f = formula(/^식: (y = .+)$/m.exec(q.q)[1]); assert.ok(!isProp(f)); m = /y는 (\d+)에서 (\d+) — 2배가 아니라서 정비례가 아니에요$/.exec(ok); assert.ok(+m[1] === f(1) && +m[2] === f(2)); break; }
    case 'crd.prop misread:neg': { const f = formula(/^식: (y = .+)$/m.exec(q.q)[1]); assert.ok(isProp(f) && f(1) < 0); assert.match(shown, /정비례가 아니에요$/); m = /y도 (−\d+)에서 (−\d+)(?:으로|로) 2배$/.exec(ok); assert.ok(N(m[1]) === f(1) && N(m[2]) === f(2)); break; }
    case 'crd.pgraph misread:origin': { const f = formula(/^식: (y = .+)$/m.exec(q.q)[1]); assert.ok(isProp(f)); m = /x = 0일 때 y = (\d+)인 점/.exec(shown); assert.ok(!near(f(0), +m[1])); assert.match(ok, /원점을 지나요$/); break; }
    case 'crd.pgraph misread:dir': { const f = formula(/^식: (y = .+)$/m.exec(q.q)[1]); assert.ok(f(1) < 0); assert.match(shown, /오른쪽 위로/); assert.match(ok, /오른쪽 아래로 향하는 직선이에요$/); break; }
    case 'crd.inv misread:shrink': { const f = formula(/^식: (y = .+)$/m.exec(q.q)[1]); assert.ok(!isInv(f)); m = /y는 (\d+)에서 (\d+) — 2분의 1배가 아니라서 반비례가 아니에요$/.exec(ok); assert.ok(+m[1] === f(1) && +m[2] === f(2) && f(2) !== f(1) / 2); break; }
    case 'crd.inv misread:times': { const f = formula(/^식: (y = .+)$/m.exec(q.q)[1]); assert.ok(isInv(f)); m = /x = 2일 때 y = (\d+), x = 4일 때 y = (\d+) — y는 2분의 1배가 돼요$/.exec(ok); assert.ok(+m[1] === f(2) && +m[2] === f(4)); break; }
    case 'crd.igraph misread:origin': { const f = formula(/^식: (y = .+)$/m.exec(q.q)[1]); assert.ok(isInv(f)); assert.match(shown, /원점을 지나요$/); assert.match(ok, /원점을 지나지 않아요$/); break; }
    case 'crd.igraph misread:quad': { const f = formula(/^식: (y = .+)$/m.exec(q.q)[1]); assert.ok(isInv(f) && f(1) < 0); assert.match(shown, /제1사분면과 제3사분면/); assert.match(ok, /제2사분면과 제4사분면에 있어요$/); break; }
    case 'crd.apply misread:walk': { assert.match(shown, /2분의 1배/); assert.match(ok, /거리도 2배가 돼요$/); break; }
    case 'crd.apply misread:gear': { m = /톱니가 (\d+)개인 A와 톱니가 (\d+)개인 B/.exec(q.q); assert.ok(+m[2] > +m[1], 'B의 톱니가 더 많다'); assert.match(shown, /B가 A보다 더 많이 돌아요/); assert.match(ok, /B가 덜 돌아요$/); break; }
    default: throw new Error(`모르는 ② 갈래 ${q.concept} ${q.key}`);
  }
}

test('★ ② 오개념 문항: 보여 준 말은 정말 틀렸다 · 고치는 말만 맞다 · 갈래 열쇠 둘씩 · 엉뚱한 지적은 거짓 단정', () => {
  const keys = {};
  for (const { c, s, q } of every(['misread'], Math.max(SEEDS, 600))) {
    (keys[c.id] = keys[c.id] || new Set()).add(q.key);
    try { checkMisread(q); } catch (e) { throw new Error(`${c.id} #${s} ${q.key}: ${e.message}\n${q.q}\n${q.choices.map((x) => x.text).join(' | ')}`); }
    assert.equal(q.choices.filter((x) => x.ok).length, 1);
    assert.ok(q.choices.some((x) => x.tag === '틀린 줄 모름'), `${c.id} #${s}: "맞게 말했어요" 보기`);
    for (const w of q.choices.filter((x) => x.tag === '엉뚱한 지적')) assert.match(w.text, /(수 없어요|없어요|아니에요)$/, `${c.id} #${s}: 엉뚱한 지적은 거짓 단정으로 "${w.text}"`);
  }
  for (const id of IDS) assert.equal(keys[id].size, 2, `${id}: ② 갈래 ${[...keys[id]]}`);
});

// ───────────────────── 글 ─────────────────────

test('★ 조사: 수 뒤는 읽는 소리 · 문자 뒤는 받침 없는 쪽 · 좌표 ")" 바로 뒤·분수 바로 뒤에는 조사 없음 · 낱말 뒤 받침', () => {
  const BAT = new Set(['0', '1', '3', '6', '7', '8']);
  const PAIRS = [['을', '를'], ['은', '는'], ['이', '가'], ['과', '와'], ['이에요', '예요'], ['이니까', '니까'], ['이라서', '라서']];
  const jong = (ch) => { const code = ch.charCodeAt(0) - 0xac00; return code >= 0 && code < 11172 ? code % 28 : -1; };
  let hitN = 0; let hitL = 0; let hitW = 0;
  for (const { c, k, s, q } of every()) {
    const all = allText(q).replace(/\*\*/g, '').replace(/\[[a-z]+ [^\]]+\]/g, '');
    for (const [wb, nb] of PAIRS) {
      for (const m of all.matchAll(new RegExp(`(\\d)(${wb}|${nb})(?=[\\s.,!?)—]|$)`, 'g'))) { assert.equal(m[2], BAT.has(m[1]) ? wb : nb, `${c.id} ${k} #${s}: "…${m[1]}${m[2]}"\n${all}`); hitN++; }
      for (const m of all.matchAll(new RegExp(`([a-z])(${wb}|${nb})(?=[\\s.,!?)—]|$)`, 'g'))) { assert.equal(m[2], nb, `${c.id} ${k} #${s}: "…${m[1]}${m[2]}"`); hitL++; }
      for (const m of all.matchAll(new RegExp(`(좌표|사분면|그래프|직선|곡선|원점|정비례|반비례|순서쌍|(?<![가-힣])식|(?<![가-힣])점)(${wb}|${nb})(?=[\\s.,!?)—]|$)`, 'g'))) {
        assert.equal(m[2], jong(m[1].slice(-1)) > 0 ? wb : nb, `${c.id} ${k} #${s}: "…${m[1]}${m[2]}"`); hitW++;
      }
    }
    for (const m of all.matchAll(/(\d)(으로|로)(?=[\s.,]|$)/g)) assert.equal(m[2], ['1', '7', '8'].includes(m[1]) ? '로' : BAT.has(m[1]) ? '으로' : '로', `${c.id} ${k} #${s}: "…${m[1]}${m[2]}"`);
    const cp = /\(−?\d+, −?\d+\)(을|를|이|가|은|는|과|와|으로|로|이에요|예요|이니까|니까)/.exec(all);
    assert.ok(!cp, `${c.id} ${k} #${s}: 좌표 바로 뒤 조사 "${cp && cp[0]}"`);
    const fp = /\/(?:\d+|[a-z]+)(?:이에요|예요|이라서|라서|이니까|니까|이|가|은|는|을|를|와|과|으로|로)(?![가-힣])/.exec(all);
    assert.ok(!fp, `${c.id} ${k} #${s}: 분수 바로 뒤 조사 "${fp && fp[0]}"`);
    assert.ok(!/(?<![\d./])1x|−1x|-\d/.test(all), `${c.id} ${k} #${s}: "1x" 또는 ASCII 빼기\n${all}`);
  }
  assert.ok(hitN > SEEDS && hitL > SEEDS && hitW > SEEDS, `실제로 본 곳: 수 ${hitN} · 문자 ${hitL} · 낱말 ${hitW} (검사가 빈 채 통과하지 않게)`);
});

test('★ 풀이 카드: 단계 · 기억할 것 · 오답마다 왜 · 정답이 단계에 나온다', () => {
  for (const { c, k, s, q } of every()) {
    const sv = q.solve;
    assert.ok(sv && sv.steps.length >= 2 && sv.rule, `${c.id} ${k} #${s}`);
    for (const w of q.choices.filter((x) => !x.ok)) assert.ok(sv.why[w.tag] || sv.whyAny, `${c.id} ${k} #${s}: "${w.tag}" 설명 없음`);
    const ok = q.choices.find((x) => x.ok).text;
    if (k === 'calc' && ok.length <= 16) assert.ok(sv.steps.join(' ').includes(ok), `${c.id} #${s}: 정답 "${ok}"이 풀이에 없다\n${sv.steps.join('\n')}`);
  }
});

test('★ 글 속 셈식은 맞다 (곱셈·나눗셈 먼저, 왼쪽부터) — 문제·정답·풀이 전부 (수만 있는 식)', () => {
  const ev = (expr) => Function(`return (${expr.replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-')})`)();
  let n = 0;
  for (const { c, k, s, q } of every()) {
    const all = [q.q.replace(/\*\*.+?\*\*/g, '').replace(/\[[a-z]+ [^\]]+\]/g, ''), q.choices.find((x) => x.ok).text, ...q.solve.steps, ...Object.values(q.solve.why), q.solve.whyAny].join('\n');
    for (const m of all.matchAll(/(?<![\d.□a-z(−])(\(?−?\d+(?:\.\d+)?\)?(?: [+−×÷] \(?−?\d+(?:\.\d+)?\)?)+) = (−?\d+(?:\.\d+)?)(?![\d.a-z²/(])/g)) {
      assert.ok(Math.abs(ev(m[1]) - N(m[2])) < 1e-6, `${c.id} ${k} #${s}: ${m[0]}`);
      n++;
    }
  }
  assert.ok(n > 3 * SEEDS, `셈식 ${n}`);
});

test('🔁 쌍둥이·🤔 노트: 요청한 틀·갈래로 온다 · 같은 셈 · 쌍둥이 글이 원래 글과 같은 일은 드물다', () => {
  const same2 = {}; const tot = {};
  for (const c of COORD) {
    for (let s = 1; s <= Math.min(SEEDS, 300); s++) {
      const q = makeQuestion(c.id, 'calc', s, OPTS);
      assert.ok(q.key, `${c.id} #${s}: 열쇠 없음`);
      const tw = makeQuestion(c.id, 'calc', s + 99991, { ...OPTS, want: { k: 'calc', key: q.key } });
      assert.equal(tw.key, q.key, `${c.id} #${s}: 쌍둥이가 다른 틀\n${q.q}\n---\n${tw.q}`);
      assert.equal(solveText(tw.q).type, solveText(q.q).type, `${c.id} #${s}: 쌍둥이가 다른 셈`);
      if (!/\{/.test(q.key)) assert.equal(tplKey(tw.q), tplKey(q.q), `${c.id} #${s}: 틀 글이 다르다`);
      tot[q.key] = (tot[q.key] || 0) + 1;
      if (tw.q === q.q) same2[q.key] = (same2[q.key] || 0) + 1;
      const m = makeQuestion(c.id, 'misread', s, OPTS);
      const mt = makeQuestion(c.id, 'misread', s + 99991, { ...OPTS, want: { k: 'misread', key: m.key } });
      assert.equal(mt.key, m.key, `${c.id} #${s}: ② 갈래`);
    }
  }
  for (const key of Object.keys(tot)) if (tot[key] >= 20 && /#/.test(key)) assert.ok((same2[key] || 0) / tot[key] <= 0.35, `쌍둥이 = 원래 글 ${same2[key]}/${tot[key]}: ${key}`);
});

/** 처음 배우는 칸 — 그 앞 칸의 글·이름표에는 나오면 안 된다 */
const FIRST = [[/사분면/, 'crd.quad'], [/변수/, 'crd.graph'], [/정비례/, 'crd.prop'], [/반비례/, 'crd.inv']];
test('★ 아직 안 배운 말을 앞 칸에 쓰지 않는다 — 사분면 R3 · 변수 R4 · 정비례 R5 · 반비례 R7', () => {
  const idx = (id) => IDS.indexOf(id);
  const banned = (id) => FIRST.filter(([, at]) => idx(at) > idx(id));
  for (const c of COORD) for (const [re] of banned(c.id)) assert.ok(!re.test(`${c.name} ${c.idea} ${c.rule} ${c.slip}`), `${c.id}: 설명에 ${re}`);
  for (const { c, k, s, q } of every()) {
    const all = allText(q) + ' ' + q.choices.map((x) => x.tag || '').join(' ');
    for (const [re] of banned(c.id)) assert.ok(!re.test(all), `${c.id} ${k} #${s}: 아직 안 배운 ${re}\n${all}`);
  }
});

/** 참이라고 내미는 글에 틀린 말 — 오답 보기·② 보여 준 말은 빼고, 굵게(**)는 떼고 */
const BAD = [
  [/시계 방향으로/, '사분면은 시계 반대 방향'],
  [/0은 (?:양수|음수)(?:예요|이에요|라서|이라서)/, '0은 양수도 음수도 아니다'],
  [/좌표축 위의 점은 제\d사분면/, '좌표축 위의 점은 어느 사분면에도 속하지 않는다'],
  [/a가 음수(?:이면|라서|여서) 정비례가 아니/, 'a가 음수여도 정비례'],
  [/x가 커질 때 y도 커지(?:면|니까) 정비례(?:예요|이에요|가 맞)/, '함께 커진다고 정비례는 아니다'],
  [/x가 커질 때 y가 작아지(?:면|니까) 반비례(?:예요|이에요|가 맞)/, '작아진다고 반비례는 아니다'],
  [/반비례[^.]*원점을 지나요/, '반비례 그래프는 원점을 지나지 않는다'],
];
test('★ 참말에 틀린 말이 없다 — 사분면 순서·0·축 위의 점·정비례·반비례', () => {
  const truths = (q) => [q.choices.find((x) => x.ok).text, ...(q.solve ? [...q.solve.steps, ...Object.values(q.solve.why), q.solve.whyAny, q.solve.rule] : [])].join('\n').replace(/\*\*/g, '');
  for (const { c, k, s, q } of every()) {
    const t = truths(q);
    for (const [re, why] of BAD) assert.ok(!re.test(t), `${c.id} ${k} #${s}: ${why}\n${t}`);
  }
  for (const c of COORD) for (const [re, why] of BAD) assert.ok(!re.test([c.idea, c.rule, c.slip].join('\n').replace(/\*\*/g, '')), `${c.id}: ${why}`);
});

test('🔢 숫자판: 수가 답인 ①만 숫자판 · 음수·분수 답도 칠 수 있다 · 모든 수 보기를 쳐서 그 보기로 간다', () => {
  const pv = readFileSync(new URL('../js/padview.js', import.meta.url), 'utf8');
  const MAX = +/const MAX = (\d+);/.exec(pv)[1];
  let n = 0;
  for (const { c, s, q } of every(['calc'], 200)) {
    const ok = q.choices.find((x) => x.ok).text;
    const spec = padSpec(q, 'coord');
    assert.equal(!!spec, valueOf(ok) !== null, `${c.id} #${s}: 정답 "${ok}" 숫자판 ${!!spec}`);
    if (!spec) continue;
    for (const ch of q.choices) {
      assert.ok(String(ch.text).length <= MAX, `${c.id} #${s}: "${ch.text}"`);
      const t = partsOf(ch.text);
      assert.ok(t, `${c.id} #${s}: "${ch.text}"를 칸으로 못 나눔`);
      const hit = matchTyped(q, readTyped(t.mode, t.p, { ...spec, signed: true }), { ...spec, signed: true });
      assert.equal(q.choices[hit.i], ch, `${c.id} #${s}: "${ch.text}"를 쳐도 그 보기로 안 간다`);
      n++;
    }
  }
  assert.ok(n > 1000, `쳐 본 보기 ${n}`);
});

// ───────────────────── 좌표평면 그림 ─────────────────────

/** 그린 SVG에서 자 세우기 — 눈금 수 두 개(축마다)로 값 ↔ px (그림 코드의 자를 쓰지 않는다) */
function rulerOf(svg) {
  const tick = (axis) => [...svg.matchAll(new RegExp(`<text class="pl-tick" data-axis="${axis}" data-v="(-?\\d+)" x="([\\d.]+)" y="([\\d.]+)"`, 'g'))].map((m) => ({ v: +m[1], x: +m[2], y: +m[3] }));
  const tx = tick('x'); const ty = tick('y');
  assert.ok(tx.length >= 2 && ty.length >= 2, '눈금 수가 축마다 둘 이상');
  const [a, b] = [tx[0], tx[tx.length - 1]]; const [c, d] = [ty[0], ty[ty.length - 1]];
  const kx = (b.x - a.x) / (b.v - a.v); const ky = (d.y - c.y) / (d.v - c.v); // ky < 0 (위로 갈수록 px가 작다)
  return { X: (v) => a.x + (v - a.v) * kx, Y: (v) => c.y - 4 + (v - c.v) * ky, vx: (px) => a.v + (px - a.x) / kx, vy: (py) => c.v + (py - (c.y - 4)) / ky };
}
const close = (a, b, e = 0.6) => Math.abs(a - b) <= e;

test('🎨 좌표평면 그림: 점·후보는 그 좌표에 · 정비례 직선은 y = ax 위 · 반비례 곡선은 x × y = a · 꺾은선은 지시문대로 · 폭 400 · 글로 바꾸기', () => {
  let seen = { pt: 0, lin: 0, inv: 0, path: 0 };
  for (const { c, k, s, q } of every(['calc', 'misread'], FIG_SEEDS)) {
    const P = planeOf(q.q); if (!P) continue;
    const at = `${c.id} ${k} #${s}`;
    const spec = /\[(plane [^\]]+)\]/.exec(q.q)[1];
    const svg = figureSvg(spec);
    assert.ok(+/viewBox="0 0 (\d+)/.exec(svg)[1] <= 400, `${at}: 폭`);
    const R = rulerOf(svg);
    for (const m of svg.matchAll(/<circle class="pl-(pt|cand)" data-(?:name|k)="([^"]*)" data-x="(-?\d+)" data-y="(-?\d+)" cx="([\d.]+)" cy="([\d.]+)"/g)) {
      const [, kind, name, dx, dy, cx, cy] = m;
      const want = kind === 'pt' ? P.pts[name] : P.cands[name];
      assert.deepEqual(want, [+dx, +dy], `${at}: 점 ${name}의 좌표가 지시문과 다르다`);
      assert.ok(close(R.vx(+cx), +dx, 0.02) && close(R.vy(+cy), +dy, 0.02), `${at}: 점 ${name}이 눈금으로 재면 (${R.vx(+cx).toFixed(2)}, ${R.vy(+cy).toFixed(2)})`);
      seen.pt++;
    }
    for (const m of svg.matchAll(/<line class="pl-lin" data-a="(-?\d+)\/(\d+)" x1="([\d.-]+)" y1="([\d.-]+)" x2="([\d.-]+)" y2="([\d.-]+)"/g)) {
      const a = +m[1] / +m[2]; assert.ok(near(a, P.lin), `${at}: 직선 기울기`);
      for (const [px, py] of [[+m[3], +m[4]], [+m[5], +m[6]]]) assert.ok(close(R.vy(py), a * R.vx(px), 0.05), `${at}: 직선 끝이 y = ax 위가 아니다`);
      seen.lin++;
    }
    for (const m of svg.matchAll(/<polyline class="pl-inv" data-a="(-?\d+)" points="([^"]+)"/g)) {
      const a = +m[1]; assert.equal(a, P.inv, `${at}: 곡선의 a`);
      for (const pr of m[2].split(' ')) { const [px, py] = pr.split(',').map(Number); assert.ok(close(R.vx(px) * R.vy(py), a, Math.abs(a) * 0.03 + 0.05), `${at}: 곡선 위의 점이 x × y = ${a}가 아니다`); }
      seen.inv++;
    }
    if (P.pts.P && P.lin !== null) assert.ok(near(P.pts.P[1], P.lin * P.pts.P[0]), `${at}: 점 P가 직선 y = ${P.lin}x 위가 아니다`);
    if (P.pts.P && P.inv !== null) assert.equal(P.pts.P[0] * P.pts.P[1], P.inv, `${at}: 점 P가 곡선 y = ${P.inv}/x 위가 아니다`);
    const pm = /<polyline class="pl-path" points="([^"]+)"/.exec(svg);
    const wm = /<polyline class="pl-wave" points="([^"]+)"/.exec(svg);
    const toVal = (s) => s.split(' ').map((pr) => pr.split(',').map(Number)).map(([px, py]) => [R.vx(px), R.vy(py)]);
    if (P.path && !P.smooth) {
      assert.ok(pm && !wm, `${at}: 꺾은선 없음`);
      const got = toVal(pm[1]).map(([x, y]) => [Math.round(x * 100) / 100, Math.round(y * 100) / 100]);
      assert.deepEqual(got, P.path, `${at}: 꺾은선이 지시문과 다르다`); seen.path++;
    }
    if (P.smooth) {
      // 🎡 부드러운 선 (Codex 33차 #4): 관람차만 · 꼭짓점 점은 지시문 그대로 · 선 위의 모든 점이 이웃한 두 점 사이의 코사인 곡선 위 (꼭대기·바닥에서 기울기 0)
      assert.ok(/관람차/.test(q.q) && wm && !pm, `${at}: smooth는 관람차의 부드러운 선만`);
      const vt = [...svg.matchAll(/<circle class="pl-vtx" cx="([\d.]+)" cy="([\d.]+)"/g)].map((m) => [Math.round(R.vx(+m[1]) * 100) / 100, Math.round(R.vy(+m[2]) * 100) / 100]);
      assert.deepEqual(vt, P.path, `${at}: 꼭짓점이 지시문과 다르다`);
      const W = toVal(wm[1]);
      assert.ok(W.length >= P.path.length * 8, `${at}: 부드러운 선의 점 ${W.length}`);
      for (const [x, y] of W) {
        const i = Math.max(1, P.path.findIndex(([px]) => px >= x - 1e-6));
        const [[x0, y0], [x1, y1]] = [P.path[i - 1], P.path[i]];
        const t = (x - x0) / (x1 - x0);
        assert.ok(close(y, y0 + ((y1 - y0) * (1 - Math.cos(Math.PI * t))) / 2, 0.15), `${at}: (${x.toFixed(2)}, ${y.toFixed(2)})가 코사인 곡선 위가 아니다`);
      }
      for (const [px, py] of P.path) assert.ok(W.some(([x, y]) => close(x, px, 0.02) && close(y, py, 0.15)), `${at}: 부드러운 선이 (${px}, ${py})를 안 지난다`);
      seen.wave = (seen.wave || 0) + 1;
    }
    assert.match(figText(q.q), /\(좌표평면: /);
    assert.ok(figText(q.q, true).includes('(좌표평면)'));
    assert.ok(!renderFigures(q.q).includes('[plane'), `${at}: renderFigures가 좌표평면을 못 바꿈`);
  }
  assert.ok(seen.pt > 500 && seen.lin > 20 && seen.inv > 20 && seen.path > 20 && seen.wave > 5, `본 것 ${JSON.stringify(seen)}`);
});

test('🎨 이름표: 점 이름은 자기 점이 가장 가깝다 · 이름표·눈금 수끼리 겹치지 않는다 · 이름표가 선을 지나지 않는다', () => {
  const boxOf = (x, y, t, fs, anchor) => {
    const w = [...t].reduce((a, ch) => a + (/[ㄱ-ㅎ가-힣㉠-㉯]/.test(ch) ? 15 : 8.2), 0) * fs / 15;
    const x0 = anchor === 'end' ? x - w : anchor === 'start' ? x : x - w / 2;
    return { x0, x1: x0 + w, y0: y - fs * 0.78, y1: y + fs * 0.22 };
  };
  const hit = (A, B) => A.x0 < B.x1 && B.x0 < A.x1 && A.y0 < B.y1 && B.y0 < A.y1;
  let n = 0;
  for (const { c, k, s, q } of every(['calc', 'misread'], FIG_SEEDS)) {
    if (!/\[plane /.test(q.q)) continue;
    const at = `${c.id} ${k} #${s}`;
    const svg = figureSvg(/\[(plane [^\]]+)\]/.exec(q.q)[1]);
    const texts = [...svg.matchAll(/<text class="(pl-[a-z-]+)"(?: data-axis="[xy]" data-v="-?\d+")? x="([\d.-]+)" y="([\d.-]+)" font-size="(\d+)"[^>]*text-anchor="(\w+)"[^>]*>([^<]+)<\/text>/g)]
      .map((m) => ({ cls: m[1], box: boxOf(+m[2], +m[3], m[6], +m[4], m[5]), cx: +m[2], cy: +m[3], t: m[6] }));
    const names = texts.filter((t) => t.cls === 'pl-name' || t.cls === 'pl-cand-name');
    const dots = [...svg.matchAll(/<circle class="pl-(?:pt|cand)" data-(?:name|k)="([^"]*)"[^>]* cx="([\d.]+)" cy="([\d.]+)"/g)].map((m) => ({ name: m[1], x: +m[2], y: +m[3] }));
    const segs = [];
    for (const m of svg.matchAll(/<line class="pl-(?:axis|lin)"[^>]*? x1="([\d.-]+)" y1="([\d.-]+)" x2="([\d.-]+)" y2="([\d.-]+)"/g)) segs.push([[+m[1], +m[2]], [+m[3], +m[4]]]);
    for (const m of svg.matchAll(/<(?:polyline|polygon) class="pl-(?:inv|path|poly)"[^>]*? points="([^"]+)"/g)) {
      const pts = m[1].split(' ').map((pr) => pr.split(',').map(Number));
      for (let i = 1; i < pts.length; i++) segs.push([pts[i - 1], pts[i]]);
      if (/pl-poly/.test(m[0])) segs.push([pts[pts.length - 1], pts[0]]);
    }
    const crosses = (B) => segs.some(([[x1, y1], [x2, y2]]) => {
      const n = Math.ceil(Math.hypot(x2 - x1, y2 - y1));
      for (let i = 0; i <= n; i++) { const x = x1 + ((x2 - x1) * i) / (n || 1); const y = y1 + ((y2 - y1) * i) / (n || 1); if (x > B.x0 + 1 && x < B.x1 - 1 && y > B.y0 + 1 && y < B.y1 - 1) return true; }
      return false;
    });
    assert.ok(segs.length >= 2, `${at}: 선을 못 읽었다`);
    for (const nm of names) {
      assert.ok(!crosses(nm.box), `${at}: 이름표 ${nm.t}이 선 위에 얹혔다`);
      const own = dots.find((d) => d.name === nm.t);
      assert.ok(own, `${at}: 이름표 ${nm.t}의 점이 없다`);
      const mid = [(nm.box.x0 + nm.box.x1) / 2, (nm.box.y0 + nm.box.y1) / 2];
      const dist = (d) => Math.hypot(d.x - mid[0], d.y - mid[1]);
      for (const d of dots) if (d !== own) assert.ok(dist(own) < dist(d), `${at}: 이름표 ${nm.t}이 점 ${d.name || '?'}에 더 가깝다`);
      assert.ok(dist(own) < 40, `${at}: 이름표 ${nm.t}이 제 점에서 멀다 ${dist(own).toFixed(1)}`);
      for (const o of texts) if (o !== nm) assert.ok(!hit(nm.box, o.box), `${at}: 이름표 ${nm.t}이 "${o.t}"와 겹친다`);
      n++;
    }
  }
  assert.ok(n > 400, `본 이름표 ${n}`);
});

test('✍️ 점 찍기 판 문항(R2): draw.fig는 후보를 뺀 같은 좌표평면 · target은 정답 후보 · 후보 넷이 그림의 후보와 같다', () => {
  let n = 0;
  for (const { c, s, q } of every(['calc'])) {
    if (!q.draw) continue;
    const at = `${c.id} #${s}`;
    assert.equal(c.id, 'crd.plot', `${at}: 점 고르기는 R2에서만`);
    assert.equal(q.draw.mode, 'plane');
    const P = planeOf(q.q); const sv = solveText(q.q);
    assert.ok(!/[㉠-㉣]/.test(q.draw.fig), `${at}: draw.fig에 후보가 남았다`);
    assert.ok(figureSvg(q.draw.fig).startsWith('<svg'), `${at}: 판을 못 그린다`);
    assert.deepEqual(q.draw.target, [sv.f.a, sv.f.b], `${at}: target`);
    assert.deepEqual(Object.fromEntries(q.draw.cands.map((z) => [z.k, [z.x, z.y]])), P.cands, `${at}: 후보`);
    const okK = q.choices.find((x) => x.ok).text;
    assert.deepEqual(P.cands[okK], q.draw.target, `${at}: 정답 보기 = target`);
    n++;
  }
  assert.ok(n > SEEDS / 5, `본 찍기 문항 ${n}`);
});

test('📏 진단·사다리·한 편·배움 예비·내용 검사', () => {
  const d = diagnosticSet(7, 5, OPTS);
  assert.equal(d.length, 5);
  assert.deepEqual(d.map((q) => q.concept), ['crd.read', 'crd.quad', 'crd.prop', 'crd.inv', 'crd.apply']);
  assert.deepEqual(placeFrom(d.map((q, i) => ({ concept: q.concept, correct: i < 2 }))), { startId: 'crd.prop', knownIds: ['crd.read', 'crd.plot', 'crd.quad', 'crd.graph'] });
  const L0 = ladder([]);
  assert.equal(L0[0].state, 'now');
  assert.ok(L0.slice(1).every((r) => r.state === 'locked'));
  for (const c of COORD) {
    const round = makeRound(c.id, 11, OPTS);
    assert.ok(round.length >= 2 && round.every((q) => q.concept === c.id), c.id);
    const les = lessonOf(c.id, 3, OPTS);
    assert.ok(les.pages.length >= 1 && les.title === c.name);
  }
  assert.ok(checkContent({}).length >= 9, '빈 원고는 칸마다 걸린다');
});

test('🎨 눈금 수는 도형·직선·곡선·꺾은선 위에 그린다 — 바탕색 테두리가 지나가는 선을 가린다 (갤러리 눈 확인: 삼각형 변이 "−1"·"2"·"−3"을, y = 3x가 "−2"를 가로질렀다)', () => {
  const figs = [
    'plane x=-5..5 y=-5..5 A(-1,3) B(-1,-3) C(5,-3) poly=ABC',
    'plane x=-6..6 y=-6..6 lin=3 P(1,3)',
    'plane x=-6..6 y=-6..6 lin=-4 P(1,-4)',
    'plane x=-6..6 y=-6..6 inv=-12 P(3,-4)',
    'plane x=0..50 y=0..10 xs=5 xl=시간(분) yl=거리(km) path=0:0,20:5,30:5,50:8',
  ];
  for (const f of figs) {
    const svg = figureSvg(f);
    assert.ok(svg.startsWith('<svg'), f);
    const lastShape = Math.max(...['pl-poly', 'pl-lin', 'pl-inv', 'pl-path', 'pl-wave'].map((c) => svg.lastIndexOf(`class="${c}"`)));
    const firstTick = svg.indexOf('class="pl-tick"');
    assert.ok(lastShape > 0, `${f}: 선이 있다`);
    assert.ok(firstTick > lastShape, `${f}: 눈금 수가 선보다 뒤(위)에`);
    assert.match(svg, /class="pl-tick"[^>]*stroke="var\(--card, #fff\)"[^>]*paint-order="stroke"/, '눈금 수에 바탕색 테두리');
  }
  // 생성기가 만든 그림 전부 — 선이 있으면 눈금 수가 뒤에
  let seen = 0;
  for (const c of COORD) {
    for (let s = 1; s <= 40; s += 1) {
      for (const k of ['calc', 'misread']) {
        const q = makeQuestion(c.id, k, s, OPTS);
        const d = q && /\[(plane [^\]]+)\]/.exec(q.q);
        if (!d) continue;
        const svg = figureSvg(d[1]);
        const lastShape = Math.max(...['pl-poly', 'pl-lin', 'pl-inv', 'pl-path', 'pl-wave'].map((cl) => svg.lastIndexOf(`class="${cl}"`)));
        if (lastShape < 0) continue;
        seen += 1;
        assert.ok(svg.indexOf('class="pl-tick"') > lastShape, `${c.id} ${k} #${s}: ${d[1]}`);
      }
    }
  }
  assert.ok(seen > 50, `선이 있는 그림을 실제로 봤다 (${seen})`);
});

// ───────────────────── 2단계: 원고 (coach/math/coord.json) ─────────────────────

const CONTENT = JSON.parse(readFileSync(new URL('../coach/math/coord.json', import.meta.url), 'utf8'));
const CAST = { me: '진우', mon: '피카츄', mon2: '리자몽' };
const fillC = (t) => String(t).replace(/\{(me|mon|mon2)(?:\/([^/}]+)\/([^}]+))?\}/g, (_, k, a, b) => {
  const name = CAST[k];
  if (!a) return name;
  const code = name.charCodeAt(name.length - 1) - 0xac00;
  return name + (code >= 0 && code % 28 ? a : b);
});
/** 원고의 모든 글 (배움·확인·규칙·아빠 카드) — 칸마다 */
function contentText(v) {
  const parts = [];
  for (const p of v.lesson) { parts.push(p.say); if (p.check) parts.push(p.check.q, p.check.ok, ...p.check.no, p.check.why); }
  parts.push(v.rule, v.dad.goal, ...v.dad.say, v.dad.do, v.dad.pass, ...v.dad.traps.flatMap((t) => [t.kid, t.dad]));
  return parts.map(fillC).join('\n');
}
/** 참이라고 내미는 글 — 덩이마다 (확인 질문은 문제 글·정답·풀이). 오답 보기·아이가 하는 틀린 말(함정 kid)은 뺀다 */
function truthBlocks(v) {
  const out = [];
  for (const p of v.lesson) { out.push(p.say); if (p.check) out.push([p.check.q, p.check.ok, p.check.why].join('\n')); }
  out.push(v.rule, v.dad.goal, ...v.dad.say, v.dad.do, v.dad.pass, ...v.dad.traps.map((t) => t.dad));
  return out.map((t) => fillC(t).replace(/\*\*/g, ''));
}

test('원고(coord.json)가 형식 검사를 통과한다 — 9칸이 사다리 순서대로 · 배움 4~5장·확인 질문 4개↑·아빠 카드(말 2개↑·함정 2개↑·통과 기준)', () => {
  assert.deepEqual(checkContent(CONTENT), []);
  assert.deepEqual(Object.keys(CONTENT).filter((k) => k !== '_'), IDS, '원고 칸 = 사다리 칸 (순서까지)');
  for (const id of IDS) {
    const v = CONTENT[id];
    assert.ok(v.lesson.length >= 4 && v.lesson.length <= 5, `${id}: ${v.lesson.length}장`);
    assert.ok(v.lesson.filter((p) => p.check).length >= 4, `${id}: 확인 질문 ${v.lesson.filter((p) => p.check).length}개`);
    assert.ok(v.dad.traps.length >= 2 && v.dad.say.length >= 2, id);
    const les = lessonOf(id, 1, { ...OPTS, content: CONTENT });
    assert.equal(les.pages.length, v.lesson.length);
    assert.ok(!/\{(me|mon)/.test(les.pages.map((p) => p.say + (p.check ? p.check.q + p.check.why : '')).join('')), `${id}: 자리표시가 남음`);
  }
});

test('★ 원고 확인 질문도 따로 풀어 대조 — 전부 읽히고, 맞는 보기는 정답 하나뿐, 오답 하나하나가 이름표 있는 틀린 생각이다', () => {
  let solved = 0; let wrongs = 0; const types = new Set();
  for (const id of IDS) {
    for (const [i, p] of CONTENT[id].lesson.entries()) {
      if (!p.check) continue;
      const q = fillC(p.check.q); const ok = fillC(p.check.ok); const no = p.check.no.map(fillC);
      const where = `${id}[${i}]: ${q}`;
      const sv = solveText(q);
      const chs = [{ text: ok, ok: true }, ...no.map((n) => ({ text: n, ok: false }))];
      const right = rightOnes(sv, chs);
      assert.equal(right.length, 1, `${where} (${sv.type}): 맞는 보기 ${right.map((x) => x.text).join(', ') || '없음'}`);
      assert.ok(right[0].ok, `${where}: 정답 "${ok}" ≠ 따로 푼 "${right[0].text}"`);
      if (sv.form === 'num') assert.ok(Number.isInteger(sv.ans), `${where}: 답 ${sv.ans}`);
      for (const n of no) {
        const holds = Object.values(TAGS).some((tag) => { try { return !!tagHolds(sv, tag, n, chs); } catch { return false; } });
        assert.ok(holds, `${where}: 오답 "${n}"은 어느 틀린 생각인가 (${sv.type})`);
        wrongs++;
      }
      if (sv.form === 'num') assert.equal(new Set(no.map((n) => val(n))).size, no.length, `${where}: 오답 값이 겹친다`);
      types.add(sv.type);
      solved++;
    }
  }
  assert.equal(solved, IDS.reduce((a, id) => a + CONTENT[id].lesson.filter((p) => p.check).length, 0));
  assert.ok(solved >= 40 && wrongs >= 2 * solved, `따로 푼 확인 질문 ${solved} · 오답 ${wrongs}`);
  assert.ok(types.size >= 25, `확인 질문이 다룬 문제 종류 ${types.size}: ${[...types]} — 같은 모양만 묻지 않게`);
});

/** [plane …] 지시문 전부 — 직선·곡선이 여럿일 수 있다 (planeOf는 하나만 둔다) */
function planeAll(dir) {
  const P = { pts: {}, cands: {}, lins: [], invs: [], path: null, xs: 1, ys: 1, x: [-5, 5], y: [-5, 5] };
  for (const t of dir.trim().split(/\s+/).slice(1)) {
    let k;
    if ((k = /^([A-Z㉠-㉣]?)\((−?\d+),(−?\d+)\)$/.exec(t))) { const p = [N(k[2]), N(k[3])]; if (/[㉠-㉣]/.test(k[1])) P.cands[k[1]] = p; else P.pts[k[1]] = p; }
    else if ((k = /^([xy])=(−?\d+)\.\.(−?\d+)$/.exec(t))) P[k[1]] = [N(k[2]), N(k[3])];
    else if ((k = /^([xy])s=(\d+)$/.exec(t))) P[`${k[1]}s`] = +k[2];
    else if ((k = /^lin=(−?\d+)(?:\/(\d+))?$/.exec(t))) P.lins.push(N(k[1]) / (k[2] ? +k[2] : 1));
    else if ((k = /^inv=(−?\d+)$/.exec(t))) P.invs.push(N(k[1]));
    else if ((k = /^path=(.+)$/.exec(t))) P.path = k[1].split(',').map((x) => x.split(':').map(N));
    else if (t === 'smooth') P.smooth = true;
    else if (!/^(poly=[A-Z]+|[xy]l=.+)$/.test(t)) throw new Error(`모르는 지시문 토큰 ${t}`);
  }
  return P;
}
/** 직선 y = ax의 식 글 ("4x" · "x/2" · "−2x") */
const linTxt = (a) => { const s = a < 0 ? '−' : ''; const k = Math.abs(a); if (Number.isInteger(k)) return `${s}${k === 1 ? '' : k}x`; const d = Math.round(1 / k); return `${s}x/${d}`; };

test('🎨 원고의 그림: 모두 그려진다 · 그림 속 점은 직선·곡선 위 · 배움 글이 말하는 좌표·사분면·길이·넓이·물 높이·쉰 시간·한 바퀴·직선 식 = 그 장의 그림', () => {
  const n = { fig: 0, co: 0, quad: 0, len: 0, area: 0, tank: 0, seg: 0, rest: 0, period: 0, lin: 0, a: 0, nline: 0, cell: 0 };
  for (const id of IDS) {
    for (const [i, p] of CONTENT[id].lesson.entries()) {
      const where = `${id}[${i}]`;
      const texts = [p.say, ...(p.check ? [p.check.q] : [])].map(fillC);
      for (const t of texts) for (const m of t.matchAll(/\[([a-z]+ [^\]]+)\]/g)) { assert.ok(figureSvg(m[1]).startsWith('<svg'), `${where}: 못 그림 ${m[0]}`); n.fig++; }
      const say = fillC(p.say).replace(/\*\*/g, '');
      const dirs = [...say.matchAll(/\[(plane [^\]]+)\]/g)].map((m) => planeAll(m[1]));
      for (const F of dirs) {
        for (const [nm, [x, y]] of Object.entries(F.pts)) {
          assert.ok(x >= F.x[0] && x <= F.x[1] && y >= F.y[0] && y <= F.y[1], `${where}: 점 ${nm}이 그림 밖`);
          for (const a of F.lins) assert.ok(near(a * x, y), `${where}: 점 ${nm}(${x}, ${y})이 y = ${a}x 위에 없다`);
          for (const a of F.invs) assert.ok(near(x * y, a), `${where}: 점 ${nm}(${x}, ${y})이 y = ${a}/x 위에 없다`);
        }
        for (const a of F.lins) { assert.ok(say.includes(`y = ${linTxt(a)}`), `${where}: 그림의 직선 y = ${linTxt(a)}를 글이 말하지 않는다`); n.lin++; }
      }
      const F = dirs[0];
      const ptOf = (nm) => { const hit = dirs.find((d) => d.pts[nm]); return hit && hit.pts[nm]; };
      if (dirs.length) {
        for (const m of say.matchAll(/점 ([A-Z])의 좌표(?:는|:) \((−?\d+), (−?\d+)\)/g)) { const q = ptOf(m[1]); assert.ok(q && q[0] === N(m[2]) && q[1] === N(m[3]), `${where}: "${m[0]}" ≠ 그림 ${q}`); n.co++; }
        for (const m of say.matchAll(/(?<![가-힣a-z])([A-Z])\((−?\d+), (−?\d+)\)/g)) { const q = ptOf(m[1]); if (!q) continue; assert.ok(q[0] === N(m[2]) && q[1] === N(m[3]), `${where}: "${m[0]}" ≠ 그림 ${q}`); n.co++; }
        for (const m of say.matchAll(/점 ([A-Z])는 제([1-4])사분면/g)) { const q = ptOf(m[1]); assert.equal(quad(q[0], q[1]), +m[2], `${where}: "${m[0]}"`); n.quad++; }
        for (const m of say.matchAll(/변 ([A-Z])([A-Z])의 길이는 [^=]+= (\d+)/g)) { const a = ptOf(m[1]); const b = ptOf(m[2]); assert.equal(Math.hypot(a[0] - b[0], a[1] - b[1]), +m[3], `${where}: "${m[0]}"`); n.len++; }
        for (const m of say.matchAll(/삼각형 ABC의 넓이는 [^=]+= (\d+)/g)) {
          const [A, B, C] = ['A', 'B', 'C'].map(ptOf);
          assert.equal(Math.abs(A[0] * (B[1] - C[1]) + B[0] * (C[1] - A[1]) + C[0] * (A[1] - B[1])) / 2, +m[1], `${where}: "${m[0]}"`); n.area++;
        }
        if (F.path) {
          for (const m of say.matchAll(/(\d+)분 뒤 물의 높이는 (\d+) cm/g)) { assert.equal(yAt(F.path, +m[1]), +m[2], `${where}: "${m[0]}"`); n.tank++; }
          // "높아지고"·"낮아져요"처럼 줄임꼴도 — "낮아지"만 찾으면 "낮아져요"를 못 읽는다 (원고 변이가 잡음)
          for (const m of say.matchAll(/(\d+)분부터 (\d+)분까지는? (?:물의 높이가 )?(높아[지져]|그대로|낮아[지져])/g)) {
            const d = yAt(F.path, +m[2]) - yAt(F.path, +m[1]);
            assert.equal(m[3].slice(0, 2), d > 0 ? '높아' : d === 0 ? '그대' : '낮아', `${where}: "${m[0]}"`);
            assert.ok(!F.path.some(([x]) => x > +m[1] && x < +m[2]), `${where}: "${m[0]}" 구간 안에 꺾임`); n.seg++;
          }
          for (const m of say.matchAll(/(\d+)분 동안 쉬었어요/g)) { const fl = []; for (let k = 1; k < F.path.length; k++) if (F.path[k][1] === F.path[k - 1][1]) fl.push(F.path[k][0] - F.path[k - 1][0]); assert.deepEqual(fl, [+m[1]], `${where}: "${m[0]}"`); n.rest++; }
          for (const m of say.matchAll(/한 바퀴에 (\d+)분이 걸려요/g)) { const lo = F.path[0][1]; const back = F.path.find(([x, y]) => x > 0 && y === lo); assert.equal(back[0], +m[1], `${where}: "${m[0]}"`); n.period++; }
          for (const m of say.matchAll(/세로 한 칸은 (\d+) cm/g)) { assert.equal(F.ys, +m[1], `${where}: "${m[0]}"`); n.cell++; }
        }
        const curves = dirs.flatMap((d) => [...d.lins, ...d.invs]);
        if (curves.length === 1) for (const m of say.matchAll(/(?<![a-z(])a = (−?\d+)(?![\d/])/g)) { assert.equal(N(m[1]), curves[0], `${where}: "${m[0]}"`); n.a++; }
      }
      for (const m of say.matchAll(/\[line (−?\d+)\.\.(−?\d+) @(−?\d+)\][^]*?이 점의 좌표는 (−?\d+)/g)) { assert.equal(N(m[4]), N(m[3]), `${where}: 수직선 "${m[0]}"`); n.nline++; }
    }
  }
  for (const [k, v] of Object.entries(n)) assert.ok(v >= 1, `원고 그림 대조 ${k} ${v}번 — 검사가 빈 채 통과하지 않게 (${JSON.stringify(n)})`);
  assert.ok(n.fig >= 40 && n.co >= 15, JSON.stringify(n));
});

test('★ 원고의 조사·셈식·아직 안 배운 말·틀린 말 (배움 글·확인 질문·아빠 카드 전부) · 좌표 ")"·분수 바로 뒤 조사 없음 · "1x"·ASCII 빼기 없음', () => {
  const BAT = new Set(['0', '1', '3', '6', '7', '8']);
  const PAIRS = [['을', '를'], ['은', '는'], ['이', '가'], ['과', '와'], ['이에요', '예요'], ['이니까', '니까'], ['이라서', '라서']];
  const jong = (ch) => { const code = ch.charCodeAt(0) - 0xac00; return code >= 0 && code < 11172 ? code % 28 : -1; };
  const ev = (expr) => Function(`return (${expr.replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-')})`)();
  let hitN = 0; let hitL = 0; let hitW = 0; let calcs = 0;
  const idx = (id) => IDS.indexOf(id);
  for (const id of IDS) {
    const v = CONTENT[id];
    const all = contentText(v).replace(/\*\*/g, '').replace(/\[[a-z]+ [^\]]+\]/g, '');
    for (const [wb, nb] of PAIRS) {
      for (const m of all.matchAll(new RegExp(`(\\d)(${wb}|${nb})(?=[\\s.,!?)—]|$)`, 'g'))) { assert.equal(m[2], BAT.has(m[1]) ? wb : nb, `${id}: "…${m[1]}${m[2]}"`); hitN++; }
      for (const m of all.matchAll(new RegExp(`([a-z])(${wb}|${nb})(?=[\\s.,!?)—]|$)`, 'g'))) { assert.equal(m[2], nb, `${id}: "…${m[1]}${m[2]}"`); hitL++; }
      for (const m of all.matchAll(new RegExp(`(좌표|사분면|그래프|직선|곡선|원점|정비례|반비례|순서쌍|(?<![가-힣])식|(?<![가-힣])점)(${wb}|${nb})(?=[\\s.,!?)—]|$)`, 'g'))) {
        assert.equal(m[2], jong(m[1].slice(-1)) > 0 ? wb : nb, `${id}: "…${m[1]}${m[2]}"`); hitW++;
      }
    }
    for (const m of all.matchAll(/(\d)(으로|로)(?=[\s.,]|$)/g)) assert.equal(m[2], ['1', '7', '8'].includes(m[1]) ? '로' : BAT.has(m[1]) ? '으로' : '로', `${id}: "…${m[1]}${m[2]}"`);
    const cp = /\(−?\d+, −?\d+\)(을|를|이|가|은|는|과|와|으로|로|이에요|예요|이니까|니까)/.exec(all);
    assert.ok(!cp, `${id}: 좌표 바로 뒤 조사 "${cp && cp[0]}"`);
    const fp = /\/(?:\d+|[a-z]+)(?:이에요|예요|이라서|라서|이니까|니까|이|가|은|는|을|를|와|과|으로|로)(?![가-힣])/.exec(all);
    assert.ok(!fp, `${id}: 분수 바로 뒤 조사 "${fp && fp[0]}"`);
    assert.ok(!/(?<![\d./])1x|−1x|-\d/.test(all), `${id}: "1x" 또는 ASCII 빼기`);
    // 글 속 셈식 (수만 있는 식) — 곱셈·나눗셈 먼저
    for (const m of all.matchAll(/(?<![\d.□a-z(−])(\(?−?\d+(?:\.\d+)?\)?(?: [+−×÷] \(?−?\d+(?:\.\d+)?\)?)+) = (−?\d+(?:\.\d+)?)(?![\d.a-z²/(])/g)) {
      assert.ok(Math.abs(ev(m[1]) - N(m[2])) < 1e-6, `${id}: ${m[0]}`); calcs++;
    }
    // 아직 안 배운 말 — 그 칸보다 뒤에서 처음 배우는 말은 이 칸 어디에도 없다
    for (const [re, at] of FIRST) if (idx(at) > idx(id)) assert.ok(!re.test(all), `${id}: 아직 안 배운 ${re}`);
    // 참이라고 내미는 글에 틀린 말
    for (const block of truthBlocks(v)) for (const [re, why] of BAD) assert.ok(!re.test(block), `${id}: ${why}\n${block}`);
  }
  assert.ok(hitN >= 40 && hitL >= 20 && hitW >= 10 && calcs >= 40, `실제로 본 곳: 수 ${hitN} · 문자 ${hitL} · 낱말 ${hitW} · 셈식 ${calcs}`);
});

test('원고는 배포 파일 검사(check.mjs)에도 걸린다 — coord.json → mathcoord.js의 checkContent', () => {
  const ck = readFileSync(new URL('../tools/check.mjs', import.meta.url), 'utf8');
  assert.match(ck, /'coach\/math\/coord\.json': '\.\.\/js\/mathcoord\.js'/);
});

// ───────────────────── 3단계: 화면 연결 ─────────────────────

test('화면 연결 (3단계): STEMS.coord(R)은 이 생성기·원고를 쓰고 Q 일차방정식 바로 뒤 · 앱 셸이 둘 다 들고 간다 · 사다리 안내에 E·H 줄기 · 숫자판은 ± 늘 켬 · 좌표평면을 📊·❓가 안다', async () => {
  const { STEMS, STEM_ORDER, stemOf } = await import('../js/mathprog.js');
  assert.equal(STEMS.coord.code, 'R');
  assert.equal(STEM_ORDER[STEM_ORDER.indexOf('equation') + 1], 'coord', 'Q 일차방정식 바로 뒤');
  assert.equal(STEMS.coord.list, COORD);
  assert.equal(STEMS.coord.gen.makeQuestion, makeQuestion);
  assert.equal(STEMS.coord.gen.lessonOf, lessonOf, '📚 배움은 이 생성기의 lessonOf');
  assert.equal(STEMS.coord.file, './coach/math/coord.json');
  assert.equal(STEMS.coord.range, '중1');
  assert.ok(IDS.every((id) => stemOf(id) === STEMS.coord), '모든 칸이 R 줄기로 찾아진다');
  assert.match(STEMS.coord.pick, /E 음수 줄기.*H 규칙과 대응/);
  const sw = readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
  for (const f of ['./js/mathcoord.js', './coach/math/coord.json', './js/drawview.js']) assert.ok(sw.includes(`'${f}'`), `APP_SHELL에 ${f}`);
  // 화면은 개념의 줄기 키로 숫자판을 연다 — 그 키가 'coord'면 답이 양수인 문항도 ± 키가 있다 (음수 답이 섞여 있어 칸을 바꿔 가며 헷갈리지 않게)
  const app = readFileSync(new URL('../js/math.js', import.meta.url), 'utf8');
  assert.match(app, /padSpec\(q, \(stemOf\(q\.concept\) \|\| S\(\)\)\.key\)/);
  let n = 0;
  for (const c of COORD) for (let s = 1; s <= 60; s++) {
    const q = makeQuestion(c.id, 'calc', s, OPTS);
    const spec = padSpec(q, stemOf(q.concept).key);
    if (!spec) continue;
    assert.equal(spec.signed, true, `${c.id} #${s}: ± 키 없음`);
    n++;
  }
  assert.ok(n > 150, `숫자판 문항 ${n}`);
  // 📊 펼친 문제 글(figText)·❓ 복사문·📊 답장 안내 — 좌표평면을 안다, 안내의 예는 그대로 그려진다
  assert.equal(figText('앞 [plane A(2,−3) lin=2] 뒤', true), '앞 (좌표평면) 뒤');
  const ask = readFileSync(new URL('../js/mathask.js', import.meta.url), 'utf8');
  const stats = readFileSync(new URL('../js/stats.js', import.meta.url), 'utf8');
  assert.ok(ask.includes('[plane A(2,-3) lin=2]') && stats.includes('[plane A(2,-3) lin=2]'), '❓ 복사문·📊 답장 안내에 [plane] 예');
  assert.ok(renderFigures('[plane A(2,-3) lin=2]').startsWith('<svg'), '안내의 예(ASCII 빼기)도 그려진다');
});

test('✍️ 좌표평면 판 (3단계): 판에는 후보가 없고 범위는 답한 뒤 그림과 같다 · 누른 자리 → 가장 가까운 격자점 · 찍은 자리 말 = 풀이 카드 말 · 화면 배선', async () => {
  const { canDraw, planeOf: boardOf, planeSay, planeCo } = await import('../js/drawview.js');
  const { planeSvg } = await import('../js/mathdraw.js');
  const vb = (svg) => /viewBox="([^"]+)"/.exec(svg)[1];
  const TO = { 오른쪽: [1, 0], 왼쪽: [-1, 0], 위: [0, 1], 아래: [0, -1] };
  /** "원점에서 오른쪽으로 2칸, 아래로 3칸" → [2, −3] (따로 읽기) */
  const readWay = (t) => (t === '원점에 찍었어요' ? [0, 0] : [...t.matchAll(/(오른쪽|왼쪽|위|아래)(?:으로|로) (\d+)칸/g)].reduce((a, z) => [a[0] + TO[z[1]][0] * z[2], a[1] + TO[z[1]][1] * z[2]], [0, 0]));
  let n = 0;
  for (const { c, s, q } of every(['calc'])) {
    if (!q.draw) continue;
    const where = `${c.id} #${s}`;
    assert.ok(canDraw(q.draw), where);
    const g = boardOf(q.draw);
    // 묻는 점 = 문제 글의 "좌표가 (2, −3)인 점" (따로 읽기)
    const asked = coOf(/좌표가 (\([^)]+\))인 점/.exec(q.q)[1]);
    assert.deepEqual([g.target.x, g.target.y], asked, `${where}: 판의 묻는 점`);
    assert.equal(planeCo(g.target), /좌표가 (\([^)]+\))인 점/.exec(q.q)[1], `${where}: 좌표 글자 모양이 문제 글과 같다`);
    // 판 그림: 후보 ㉠~㉣가 없다(답을 흘리지 않는다) · 답한 뒤 그림(후보 있음)과 같은 자 — 찍은 점이 같은 자리에 다시 그려진다
    const board = planeSvg(g.sp); const after = planeSvg({ ...g.sp, cands: q.draw.cands });
    assert.ok(!/pl-cand/.test(board) && !/[㉠-㉣]/.test(board), `${where}: 판에 후보`);
    assert.equal(vb(board), vb(after), `${where}: 판과 답한 뒤 그림의 범위가 다르다`);
    assert.deepEqual([g.sp.x0, g.sp.x1, g.sp.y0, g.sp.y1], [-5, 5, -5, 5], `${where}: 판 범위는 늘 −5~5 (후보 자리에 따라 달라지면 답을 흘린다)`);
    // 누른 자리(px) → 격자점: 그 점 위든, 반 칸 안쪽으로 빗나가든 같은 점 · 원점도
    for (const p of [...q.draw.cands, { x: 0, y: 0 }]) {
      for (const [ox, oy] of [[0, 0], [0.4, 0.4], [-0.4, 0.3], [0.3, -0.45]]) {
        const at = g.G.gridAt(g.G.X(p.x) + ox * g.G.C, g.G.Y(p.y) + oy * g.G.C);
        assert.deepEqual([at.x, at.y], [p.x, p.y], `${where}: (${p.x}, ${p.y}) 빗나감 ${ox},${oy}`);
      }
    }
    // 판 밖을 눌러도 판 끝 격자점
    const far = g.G.gridAt(-999, 9999);
    assert.deepEqual([far.x, far.y], [-5, -5], `${where}: 판 밖`);
    // 찍은 자리의 말: 정답 자리 = 풀이 카드의 두 단계("원점에서 오른쪽으로 2칸" + "아래로 3칸") · 말을 따로 읽으면 그 좌표 · 후보마다 말이 다르다
    const say = planeSay(g, g.target);
    const st = q.solve.steps.map((x) => (typeof x === 'string' ? x : x.text || x.t).replace(/^[①-⑨] /, '')); // 화면이 붙이는 단계 번호는 빼고
    assert.equal(say, `${st[0]}, ${st[1].replace(/ → [㉠-㉣]$/, '')}`, `${where}: ${say} · ${st.join(' / ')}`);
    for (const z of q.draw.cands) assert.deepEqual(readWay(planeSay(g, z)), [z.x, z.y], `${where}: ${z.k} ${planeSay(g, z)}`);
    assert.equal(new Set(q.draw.cands.map((z) => planeSay(g, z))).size, q.draw.cands.length, `${where}: 후보끼리 말이 같다`);
    assert.ok(!/\(|\d+, /.test(say), `${where}: 찍는 동안의 말에 좌표가 보인다`);
    // 찍은 자리 → 보기 글자: 후보는 모두 보기에(오답 후보는 이름표 있는 오답) · 후보가 아닌 자리 "(1, −3)"은 어느 보기와도 안 겹친다
    for (const z of q.draw.cands) {
      const ch = q.choices.find((x) => x.text === z.k);
      assert.ok(ch, `${where}: 후보 ${z.k}가 보기에 없다`);
      assert.ok(ch.ok === (z.x === g.target.x && z.y === g.target.y), `${where}: ${z.k} 정답 표시`);
      if (!ch.ok) assert.ok(ch.tag, `${where}: 오답 후보 ${z.k}에 이름표가 없다`);
    }
    for (let x = -5; x <= 5; x++) for (let y = -5; y <= 5; y++) assert.ok(!q.choices.some((ch) => ch.text === planeCo({ x, y })), where);
    n++;
  }
  assert.ok(n > SEEDS / 5, `좌표평면 판 문항 ${n}`);
  assert.equal(planeSay({ sp: { xs: 1, ys: 1 } }, { x: 0, y: -4 }), '원점에서 아래로 4칸', '축 위의 점은 한 방향만');
  assert.equal(planeSay({ sp: { xs: 1, ys: 1 } }, { x: 0, y: 0 }), '원점에 찍었어요');
  assert.equal(planeCo({ x: -3, y: 0 }), '(−3, 0)', 'U+2212 빼기');
  // 말이 안 되는 draw는 판을 안 연다 (보기로 되돌아간다)
  const good = makeQuestion('crd.plot', 'calc', 1, OPTS);
  let k = 1; let base = good;
  while (!base.draw) base = makeQuestion('crd.plot', 'calc', ++k, OPTS);
  const D = base.draw;
  assert.ok(canDraw(D));
  for (const bad of [
    { ...D, fig: `${D.fig} ㉠(1,1)` }, // 판에 후보가 보인다
    { ...D, target: [9, 9] }, // 묻는 점이 후보에 없다
    { ...D, cands: D.cands.map((z) => (z.x === D.target[0] && z.y === D.target[1] ? z : { ...z, x: 7 })) }, // 오답 후보가 판 밖 (정답 후보는 그대로 — 빼면 "정답 후보 없음"에 먼저 걸린다)
    { ...D, cands: D.cands.slice(0, 1) }, // 후보 하나
    { ...D, fig: 'plane x=−5..5 y=−5..5 zz=1' }, // 못 읽는 그림
  ]) assert.equal(canDraw(bad), false, JSON.stringify(bad));
  // 화면 배선 — 문항·🔁 쌍둥이 둘 다 판을 연다(숫자판 없이도), 찍은 글자로 보기를 찾는다, 문제 글에서는 후보 있는 좌표평면을 빼고 "어디일까요?"
  const src = readFileSync(new URL('../js/math.js', import.meta.url), 'utf8');
  assert.match(src, /if \(q\.draw && \(q\.draw\.mode === 'grid' \|\| q\.draw\.mode === 'plane' \|\| q\.draw\.mode === 'cells'\)\) return done !== 'choice' && \(done === 'typed' \|\| padOn\(\)\) && ui\.round && ui\.round\.mode !== 'special' && canDraw\(q\.draw\)/);
  assert.match(src, /if \(draw\.mode === 'plane'\) return String\(q\.q\)\.replace\(\/\\\[plane \[\^\\\]\]\+\\\]\/g, \(d\) => \(d\.startsWith\(`\[\$\{draw\.fig\} `\) \? '' : d\)\)\.replace\('어느 것일까요\?', '어디일까요\?'\)/);
  assert.match(src, /const res = spec \? matchTyped\(q, typed, spec\) : \{ i: q\.choices\.findIndex\(\(c\) => c\.text === typed\.text\) \};/);
  // 문제 글: 좌표평면 지시문은 하나뿐이고 판의 그림으로 시작한다(빼고 나면 그림이 안 남는다) · "어느 것일까요?"가 한 번
  assert.equal((base.q.match(/\[plane /g) || []).length, 1);
  assert.ok(base.q.includes(`[${D.fig} `), '지시문이 판의 그림 + 후보');
  assert.equal(base.q.split('어느 것일까요?').length, 2);
  // 점 고르기는 숫자판이 아니다 — 답이 ㉠~㉣라 판이 숫자판 자리에 선다
  assert.equal(padSpec(base, 'coord'), null);
  const dv = readFileSync(new URL('../js/drawview.js', import.meta.url), 'utf8');
  assert.match(dv, /if \(draw && draw\.mode === 'plane'\) return planeBox\(draw, \{ onSubmit, onIdk \}\);/);
  assert.match(dv, /if \(draw && draw\.mode === 'plane'\) return planeAnswered\(draw, text, ok\);/);
});

test('❓ 아빠에게 묻기: 좌표평면 판에 찍은 답도 "모눈에 직접 찍음"으로 — 보기 ㉠~㉣는 아이가 못 본 후보라고 알린다', async () => {
  const { askContext } = await import('../js/mathask.js');
  let s = 1; let q = makeQuestion('crd.plot', 'calc', s, OPTS);
  while (!q.draw) q = makeQuestion('crd.plot', 'calc', ++s, OPTS);
  assert.equal(q.draw.mode, 'plane');
  assert.equal(askContext(q, { chosen: '(1, −3)', p: 1, g: '(1, −3)', w: 'u' }).grid, 1);
  assert.equal(askContext(q, { chosen: q.choices[0].text }).grid, undefined, '보기를 누른 답(판 꺼짐)은 그대로');
});

// ───────────────────── 🔍 Codex 33차 (2026-10-06) ─────────────────────

test('🔍 Codex 33차 #1·#3·덧: 거리 그래프로 "쉬었다"는 곧게 뻗은 길에서만 · y ÷ x가 늘 같다는 일반 규칙은 "x가 0이 아닐 때" · 점으로 a를 구하는 규칙은 "원점이 아닌 점" · R8 아빠 카드의 교점은 모눈 위', () => {
  // 아이가 보는 참말 — 생성기 문항(문제·정답·풀이·규칙)·칸 설명(idea·rule·slip) + 원고(배움·확인·규칙·아빠 카드)
  const blocks = [];
  for (const c of COORD) {
    blocks.push(c.idea || '', c.rule || '', c.slip || '');
    for (const k of ['calc', 'misread']) for (let s = 1; s <= 150; s++) {
      const q = makeQuestion(c.id, k, s, OPTS);
      const ok = q.choices.find((x) => x.ok);
      blocks.push([q.q, ok ? ok.text : '', ...(q.solve ? [...q.solve.steps.map((x) => (typeof x === 'string' ? x : x.text || x.t)), q.solve.rule || ''] : [])].join('\n'));
    }
  }
  for (const id of IDS) blocks.push(...truthBlocks(CONTENT[id]));
  let rest = 0; let ratio = 0; let pointA = 0; let wheel = 0;
  for (const b of blocks.map((x) => String(x).replace(/\*\*/g, ''))) {
    // #1 집에서 떨어진 거리가 그대로라서 쉬었다 — 집 둘레를 빙 돌아도 거리는 그대로다. 곧게 뻗은 길이라는 조건이 같은 덩이에 있어야 한다
    if (/(쉬었|쉰 |쉬고)/.test(b) && /거리/.test(b)) { assert.match(b, /곧게 뻗은 길/, `곧은 길 조건 없이 "쉬었다":\n${b}`); rest++; }
    // #4 관람차 그래프는 부드러운 선 — 생성기·원고 모두
    if (/관람차/.test(b)) for (const m of b.matchAll(/\[plane [^\]]+\]/g)) { assert.match(m[0], / smooth\]$/, `관람차 그래프가 꺾은선: ${m[0]}`); wheel++; }
    for (const s of b.split(/[.\n]/)) {
      // #3 "y ÷ x가 늘(항상) 같다"는 일반 규칙 — 수가 정해진 문장("늘 −2")·칸마다 구하는 표(x가 1, 2, 3 …)는 빼고
      if (/y ÷ x/.test(s) && /(늘|항상)/.test(s) && !/(늘|항상) −?\d/.test(s) && !/칸마다/.test(s)) { assert.match(s, /x가 0이 아닐 때/, `0 ÷ 0을 막는 조건 없이: "${s.trim()}"`); ratio++; }
      // #3 그래프 위의 점으로 a = y ÷ x를 구한다는 규칙 — 원점 (0, 0)은 0 ÷ 0 (반비례 a = x × y는 그래프가 원점을 안 지나 괜찮다)
      // (Codex 34차: 칸 설명의 "(p, q)를 알면 a = q ÷ p"가 글자만 달라 지나갔다 — q ÷ p도 본다)
      if (/점[^.]*a = (?:y ÷ x|q ÷ p)(?! = )/.test(s) && !/\(−?\d+, −?\d+\)/.test(s)) { assert.match(s, /원점이 아닌/, `원점 조건 없이: "${s.trim()}"`); pointA++; }
    }
  }
  assert.ok(rest >= 50 && ratio >= 4 && pointA >= 3 && wheel >= 20, `실제로 본 곳: 쉬었다 ${rest} · y ÷ x 규칙 ${ratio} · 점으로 a ${pointA} · 관람차 ${wheel}`);
  assert.match(CONTENT['crd.pgraph'].lesson[2].say, /^그래프 위의 원점이 아닌 한 점을 알면 a를 구할 수 있어요/, 'R6 배움 3장 첫 줄');
  // 덧: R8 아빠 카드 — 직선 y = kx와 곡선 y = a/x가 만나는 점을 모눈에서 찾게 하면 x² = a ÷ k가 제곱수여야 한다 (y = 2x와 y = 12/x는 x = √6)
  const doText = CONTENT['crd.igraph'].dad.do;
  const k = +/y = (\d+)x/.exec(doText)[1]; const a = +/y = (\d+)\/x/.exec(doText)[1];
  const x = Math.sqrt(a / k);
  assert.ok(Number.isInteger(x) && Number.isInteger(k * x), `y = ${k}x와 y = ${a}/x가 만나는 점 x = ${x}`);
});

test('🔍 Codex 33차 #2: 용수철(정비례)에서 반비례처럼 나눈 오답은 "반비례처럼 계산함" — "정비례처럼"이라 아빠께 거꾸로 보고되던 것', () => {
  let n = 0;
  for (let s = 1; s <= 400; s++) {
    const q = makeQuestion('crd.apply', 'calc', s, OPTS);
    if (!/용수철/.test(q.q)) continue;
    const [g1, c1, g2] = [...q.q.matchAll(/(\d+) (?:g|cm)/g)].map((m) => +m[1]);
    const inv = q.choices.find((x) => near(val(x.text), (c1 * g1) / g2) && !x.ok);
    if (inv) { assert.equal(inv.tag, TAGS.invInstead, `#${s}: ${q.q}`); n++; }
    assert.ok(!q.choices.some((x) => x.tag === TAGS.propInstead), `#${s}: 정비례 상황에 "정비례처럼 계산함"`);
  }
  assert.ok(n >= 10, `본 용수철 문항 ${n}`);
  assert.equal(TAGS.invInstead, '반비례처럼 계산함');
});

test('🔍 Codex 33차 #5: 점 이름표는 축 글자 x·y와 겹치지 않는다 — 축 끝에 있는 점(P(0, 10)이 "y"와 겹쳤다)', () => {
  /** 글자 상자 (이 파일의 어림: 17px 글자 한 자 폭 11, 위로 13·아래로 4) */
  const box = (x, y, anchor) => { const w = 11; const x0 = anchor === 'start' ? x : x - w / 2; return { x0, x1: x0 + w, y0: y - 13, y1: y + 4 }; };
  const hit = (a, b) => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;
  let n = 0;
  for (const d of ['plane x=0..10 y=0..10 P(0,10)', 'plane x=0..10 y=0..10 P(10,0)', 'plane P(0,5) Q(5,0)', 'plane x=−6..6 y=−6..6 A(0,6) B(6,0)', 'plane x=0..50 y=0..10 xs=5 P(0,10) Q(50,0)']) {
    const s = figureSvg(d);
    const axes = [...s.matchAll(/<text x="([\d.]+)" y="([\d.]+)" font-size="17"[^>]*>([xy])<\/text>/g)].map((m) => box(+m[1], +m[2], 'start'));
    const names = [...s.matchAll(/<text class="pl-name" x="([\d.]+)" y="([\d.]+)"[^>]*>([A-Z])<\/text>/g)].map((m) => ({ t: m[3], b: box(+m[1], +m[2], 'middle') }));
    assert.equal(axes.length, 2, `${d}: 축 글자`);
    assert.ok(names.length >= 1, `${d}: 이름표`);
    for (const nm of names) for (const a of axes) { assert.ok(!hit(nm.b, a), `${d}: 이름표 ${nm.t}이 축 글자와 겹친다`); n++; }
  }
  assert.ok(n >= 12, `본 짝 ${n}`);
});
