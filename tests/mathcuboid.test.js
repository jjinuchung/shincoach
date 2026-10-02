// 🧊 O 직육면체 → 부피·겉넓이 줄기 생성기 테스트: node --test tests/mathcuboid.test.js
//
// ★ 핵심은 **독립 검산** — 생성기가 알려 주는 값(probe)을 믿지 않고 **문제 글과 그림 지시문을 이 파일이 직접 읽어** 다시 푼다.
//   · 직육면체는 이 파일이 따로 세운 꼭짓점 표(교과서 이름: 윗면 ㄱㄴㄷㄹ · 아랫면 ㅁㅂㅅㅇ · 앞면 ㄹㄷㅅㅇ)로 모서리·면·보이는 것을 센다
//   · 전개도는 이 파일이 **정육면체를 굴려** 따로 접는다(그리는 쪽은 칸마다 세 축을 옮기는 다른 방법) — 마주 보는 면·만나는 점·겹치는 선분·칸 크기
//   · 겉넓이는 면 여섯 개를, 보이는 쌓기나무는 쌓기나무 하나하나를 센다 (공식을 쓰지 않으니 공식 실수도 잡힌다)
// ★ 이름표는 값만이 아니라 **뜻**까지 — 오답이 그 이름표의 틀린 생각으로 정말 나오는지 문제마다 다시 계산한다.
// ★ 씨앗은 개념마다 수백 개 (RNG_SEEDS=20000으로 넓게).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  CUBOID, TAGS, makeQuestion, makeRound, conceptById, ladder, placeFrom, diagnosticSet, lessonOf, checkContent, gradeLabel, valueOf, _kit,
} from '../js/mathcuboid.js';
import { figureSvg, figText, renderFigures, parseNet } from '../js/mathdraw.js';
import { tplKey } from '../js/mathgen.js';
import { padSpec, readTyped, matchTyped } from '../js/mathpad.js';

const OPTS = { names: ['피카츄', '리자몽', '개굴닌자'], me: '진우', worlds: { pokemon: [], toystory: [], minions: [], moana: [] } };
const SEEDS = Number(process.env.RNG_SEEDS) || 300;
const IDS = CUBOID.map((c) => c.id);

// ───────────────────── 독립 계산기 (0.0001 단위 BigInt — m³의 소수) ─────────────────────

const S = 10000n;
const toU = (s) => { const [i, f = ''] = String(s).split('.'); assert.ok(f.length <= 4, `소수 넷째 자리 넘음: ${s}`); return BigInt(i) * S + BigInt((f + '0000').slice(0, 4)); };
const I = (n) => BigInt(n) * S;
function str(v) {
  const neg = v < 0n; if (neg) v = -v;
  const i = v / S; const f = v % S;
  return (neg ? '-' : '') + (f === 0n ? String(i) : `${i}.${String(f).padStart(4, '0').replace(/0+$/, '')}`);
}
const mul = (a, b) => { const p = a * b; assert.equal(p % S, 0n, `곱이 0.0001 단위를 넘음 ${str(a)} × ${str(b)}`); return p / S; };
const div = (a, b) => { const p = a * S; assert.equal(p % b, 0n, `나눗셈이 딱 안 떨어짐 ${str(a)} ÷ ${str(b)}`); return p / b; };
/** 자연수 n ÷ d → 글자 (소수 넷째 자리까지 딱 떨어져야) */
const q4 = (n, d = 1) => str(div(I(n), I(d)));

// ───────────────────── 테스트가 따로 세운 직육면체 ─────────────────────

/** 꼭짓점 → (가로, 세로(안쪽), 높이) — 교과서 이름 붙이기 (이것은 약속이다: 그린 그림이 이 약속대로인지 아래에서 잰다) */
const VT = { 'ㄱ': [0, 1, 1], 'ㄴ': [1, 1, 1], 'ㄷ': [1, 0, 1], 'ㄹ': [0, 0, 1], 'ㅁ': [0, 1, 0], 'ㅂ': [1, 1, 0], 'ㅅ': [1, 0, 0], 'ㅇ': [0, 0, 0] };
const VN = Object.keys(VT);
const diffAxes = (a, b) => [0, 1, 2].filter((i) => VT[a][i] !== VT[b][i]);
const T_EDGES = []; // 한 좌표만 다른 두 꼭짓점
for (let i = 0; i < 8; i++) for (let j = i + 1; j < 8; j++) if (diffAxes(VN[i], VN[j]).length === 1) T_EDGES.push(VN[i] + VN[j]);
const T_FACES = []; // 한 좌표가 같은 꼭짓점 넷
for (const ax of [0, 1, 2]) for (const v of [0, 1]) T_FACES.push({ ax, v, set: VN.filter((n) => VT[n][ax] === v) });
// 보는 쪽은 앞(세로 0) · 위(높이 1) · 오른쪽(가로 1) — 가장 먼 꼭짓점(가로 0 · 세로 1 · 높이 0) 하나가 가려진다
const HIDDEN = VN.find((n) => VT[n].join() === '0,1,0');
const visibleE = T_EDGES.filter((e) => !e.includes(HIDDEN));
const visibleF = T_FACES.filter((f) => !f.set.includes(HIDDEN));
const edgeAxis = (e) => diffAxes(e[0], e[1])[0];
const sameSet = (a, b) => a.length === b.length && [...a].every((x) => b.includes(x));
const faceByName = (name) => T_FACES.find((f) => sameSet([...name], f.set));
const oppFace = (f) => T_FACES.find((g) => g.ax === f.ax && g.v !== f.v);
const adjFaces = (f) => T_FACES.filter((g) => g.ax !== f.ax);
const faceAxes = (f) => [0, 1, 2].filter((i) => i !== f.ax);
/** 이름이 면 이름으로 바르게 적혔나 — 네 글자가 한 면이고, 이웃한 글자끼리 모서리 */
const goodFaceName = (name) => !!faceByName(name) && [...name].every((ch, i) => T_EDGES.some((e) => sameSet(e, ch + name[(i + 1) % 4])));
/** 색칠할 수 있는 보이는 면 — shade=0 윗면 · 1 앞면 · 2 오른쪽 옆면 */
const T_SHADE = [T_FACES.find((f) => f.ax === 2 && f.v === 1), T_FACES.find((f) => f.ax === 1 && f.v === 0), T_FACES.find((f) => f.ax === 0 && f.v === 1)];
/** 겉넓이 — 면 여섯 개를 하나씩 */
const surfOf = (d) => T_FACES.reduce((a, f) => a + faceAxes(f).reduce((p, i) => p * d[i], 1), 0);
const areaOf = (f, d) => faceAxes(f).reduce((p, i) => p * d[i], 1);
/** 쌓기나무 — 보이는 것(앞·위·오른쪽에 닿은 것)을 하나씩 */
function visibleCubes([a, b, h]) {
  let n = 0;
  for (let i = 0; i < a; i++) for (let j = 0; j < b; j++) for (let k = 0; k < h; k++) if (j === 0 || k === h - 1 || i === a - 1) n++;
  return n;
}

// ───────────────────── 테스트가 따로 접는 전개도 (정육면체 굴리기) ─────────────────────

const T_FACE = ['㉮', '㉯', '㉰', '㉱', '㉲', '㉳'];
const T_PT = ['ㄱ', 'ㄴ', 'ㄷ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅅ', 'ㅇ', 'ㅈ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];
const mm = (A, B) => A.map((row) => B[0].map((_, j) => row.reduce((s, a, k) => s + a * B[k][j], 0)));
// 굴리기 — 표 위의 좌표 (X 오른쪽, Y 그림의 아래쪽, Z 위). 오른쪽으로 구르면 오른쪽을 보던 면이 바닥이 된다: (X, Y, Z) → (Z, Y, −X)
const ROLL = {
  right: [[0, 0, 1], [0, 1, 0], [-1, 0, 0]],
  left: [[0, 0, -1], [0, 1, 0], [1, 0, 0]],
  down: [[1, 0, 0], [0, 0, 1], [0, -1, 0]],
  up: [[1, 0, 0], [0, 0, -1], [0, 1, 0]],
};
/** `[net …]` 지시문을 따로 읽어 굴려 접는다 */
function foldNet(arg) {
  const t = arg.trim().split(/\s+/);
  const unit = /^(cm|m)$/.test(t[t.length - 1]) ? t.pop() : 'cm';
  const dims = t.length >= 4 && /^\d+$/.test(t[0]) && /^\d+$/.test(t[1]) && /^\d+$/.test(t[2]) ? t.splice(0, 3).map(Number) : null;
  const shape = t.shift();
  const opt = Object.fromEntries(t.map((x) => (x.includes('=') ? x.split('=') : [x, true])));
  const cells = [];
  shape.split('/').forEach((row, r) => [...row].forEach((ch, c) => { if (ch !== '.') cells.push({ d: +ch, r, c }); }));
  const at = (r, c) => cells.find((x) => x.r === r && x.c === c);
  let pairs = 0;
  for (const x of cells) { if (at(x.r, x.c + 1)) pairs++; if (at(x.r + 1, x.c)) pairs++; }
  const root = opt.r ? cells.find((x) => x.d === +opt.r) : cells[0];
  // 처음 칸 = 앞면이 바닥에: 몸의 가로 → 오른쪽, 세로(안쪽) → 위, 높이 → 그림의 위쪽(−Y)
  root.R = [[1, 0, 0], [0, 0, -1], [0, 1, 0]];
  const order = [root];
  for (let i = 0; i < order.length; i++) {
    const x = order[i];
    for (const [dr, dc, mv] of [[0, 1, 'right'], [0, -1, 'left'], [1, 0, 'down'], [-1, 0, 'up']]) {
      const y = at(x.r + dr, x.c + dc);
      if (!y || y.R) continue;
      y.R = mm(ROLL[mv], x.R); y.parent = x; y.mv = mv; order.push(y);
    }
  }
  assert.equal(order.length, 6, `떨어진 칸: ${arg}`);
  const vec = (R, X, Y, Z) => [0, 1, 2].map((j) => X * R[0][j] + Y * R[1][j] + Z * R[2][j]);
  for (const x of cells) {
    x.n = vec(x.R, 0, 0, -1).join(); // 바닥에 닿은 면의 바깥 방향(몸 좌표)
    x.corner = { tl: vec(x.R, -1, -1, -1).join(), tr: vec(x.R, 1, -1, -1).join(), br: vec(x.R, 1, 1, -1).join(), bl: vec(x.R, -1, 1, -1).join() };
    const ax = (row) => [0, 1, 2].find((j) => x.R[row][j] !== 0);
    x.w = dims ? dims[ax(0)] : 1; x.h = dims ? dims[ax(1)] : 1;
  }
  const valid = pairs === 5 && new Set(cells.map((x) => x.n)).size === 6;
  if (dims) {
    root.x = 0; root.y = 0;
    for (const x of order.slice(1)) {
      const p = x.parent;
      if (x.mv === 'right') { x.x = p.x + p.w; x.y = p.y; } else if (x.mv === 'left') { x.x = p.x - x.w; x.y = p.y; } else if (x.mv === 'up') { x.x = p.x; x.y = p.y - x.h; } else { x.x = p.x; x.y = p.y + p.h; }
      assert.ok(x.mv === 'right' || x.mv === 'left' ? x.h === p.h : x.w === p.w, `붙인 변의 길이가 다르다: ${arg}`);
    }
    const mx = Math.min(...cells.map((x) => x.x)); const my = Math.min(...cells.map((x) => x.y));
    for (const x of cells) { x.x -= mx; x.y -= my; }
  } else for (const x of cells) { x.x = x.c; x.y = x.r; }
  // 둘레 — 옆 칸이 없는 변 (붙은 칸은 변 전체로 붙는다)
  const K = (x, y) => `${x},${y}`;
  const sides = [];
  for (const x of cells) {
    const tl = [x.x, x.y]; const tr = [x.x + x.w, x.y]; const br = [x.x + x.w, x.y + x.h]; const bl = [x.x, x.y + x.h];
    if (!at(x.r - 1, x.c)) sides.push([tl, tr, x.corner.tl, x.corner.tr]);
    if (!at(x.r, x.c + 1)) sides.push([tr, br, x.corner.tr, x.corner.br]);
    if (!at(x.r + 1, x.c)) sides.push([br, bl, x.corner.br, x.corner.bl]);
    if (!at(x.r, x.c - 1)) sides.push([bl, tl, x.corner.bl, x.corner.tl]);
  }
  const ptV = new Map(); const nb = new Map();
  for (const [p, q, vp, vq] of sides) {
    for (const [a, b, va] of [[p, q, vp], [q, p, vq]]) {
      const k = K(...a);
      if (valid) { if (ptV.has(k)) assert.equal(ptV.get(k), va, `한 점이 두 꼭짓점으로 접힘: ${arg}`); ptV.set(k, va); }
      if (!nb.has(k)) nb.set(k, []);
      nb.get(k).push(b);
    }
  }
  for (const l of nb.values()) assert.equal(l.length, 2, `둘레가 한 줄로 안 이어진다: ${arg}`);
  const pts0 = [...nb.keys()].map((k) => k.split(',').map(Number)).sort((a, b) => a[1] - b[1] || a[0] - b[0]);
  const start = pts0[0];
  const pts = [start];
  let prev = start; let cur = nb.get(K(...start)).find((q) => q[1] === start[1] && q[0] > start[0]);
  while (K(...cur) !== K(...start)) { pts.push(cur); const nx = nb.get(K(...cur)).find((q) => K(...q) !== K(...prev)); prev = cur; cur = nx; }
  const n = pts.length;
  const s = opt.s ? +opt.s : 0;
  const name = (i) => T_PT[(i - s + n) % n];
  const idx = (nm) => (T_PT.indexOf(nm) + s) % n;
  const vOf = (i) => ptV.get(K(...pts[i]));
  const segE = (i) => [vOf(i), vOf((i + 1) % n)].sort().join('|');
  const segLen = (i) => Math.hypot(pts[(i + 1) % n][0] - pts[i][0], pts[(i + 1) % n][1] - pts[i][1]);
  const cellOf = (d) => cells.find((x) => x.d === d);
  const opp = (d) => cells.find((x) => x.n === cellOf(d).n.split(',').map((v) => String(-v)).join()).d;
  const gridNb = (d) => { const x = cellOf(d); return cells.filter((y) => Math.abs(y.r - x.r) + Math.abs(y.c - x.c) === 1).map((y) => y.d); };
  return { arg, dims, unit, shape, opt, cells, valid, pts, n, s, name, idx, vOf, segE, segLen, cellOf, opp, gridNb };
}

// ───────────────────── 글 읽기 ─────────────────────

const num = (re, q) => { const m = re.exec(q); return m ? m[1] : null; };
const lastLine = (q) => q.trim().split('\n').filter(Boolean).pop();
const figsOf = (q) => [...q.matchAll(/\[(cuboid|net) ([^\]]+)\]/g)].map((m) => ({ kind: m[1], arg: m[2] }));
/** `[cuboid …]` 지시문을 따로 읽기 — 길이(cm로), 보이는 이름표 */
function cubOf(arg) {
  const t = arg.trim().split(/\s+/);
  const unit = /^(cm|m)$/.test(t[t.length - 1]) ? t.pop() : 'cm';
  const len = t.slice(0, 3).map((tok) => { const m = /^([?_]?)(\d+(?:\.\d+)?)(cm|m)?$/.exec(tok); return { raw: m[2], show: m[1], unit: m[3] || unit }; });
  const opts = t.slice(3);
  const shade = opts.find((o) => o.startsWith('shade='));
  const miss = opts.find((o) => o.startsWith('miss='));
  return {
    len, unit,
    cm: len.map((l) => Number(l.raw) * (l.unit === 'm' ? 100 : 1)),
    names: opts.includes('names'), cubes: opts.includes('cubes'),
    shade: shade ? +shade.slice(6) : -1, miss: miss ? miss.slice(5).split(',').map(Number) : [],
  };
}
const canon = (t) => {
  const s = String(t).trim(); let m;
  if ((m = /^면 ([ㄱ-ㅎ]{4})$/.exec(s))) return `면 ${[...m[1]].sort().join('')}`;
  if (/^점 [ㄱ-ㅎ](, 점 [ㄱ-ㅎ])*$/.test(s)) return `점 ${s.match(/[ㄱ-ㅎ]/g).sort().join(',')}`;
  if ((m = /^선분 ([ㄱ-ㅎ])([ㄱ-ㅎ])$/.exec(s))) return `선분 ${[m[1], m[2]].sort().join('')}`;
  return s;
};
const ptsOf = (t) => (String(t).match(/[ㄱ-ㅎ]/g) || []);
/** 그림에 적힌(이름표로 보이는) 모서리 — 가로 ㅇㅅ · 세로 ㅅㅂ · 높이 ㄹㅇ */
const LABEL_EDGE = ['ㅅㅇ', 'ㅂㅅ', 'ㄹㅇ'];

/**
 * ① 문제 글을 직접 읽어 { type, ans(글자), f(읽은 값) } — 못 읽으면 던진다
 */
function solveText(q) {
  const L = lastLine(q);
  const fg = figsOf(q);
  const cubs = fg.filter((x) => x.kind === 'cuboid').map((x) => cubOf(x.arg));
  const nets = fg.filter((x) => x.kind === 'net').map((x) => foldNet(x.arg));
  const tm = /가로 (\d+) cm, 세로 (\d+) cm, 높이 (\d+) cm/.exec(q);
  const cubeM = /한 모서리가 (\d+) cm인 정육면체/.exec(q);
  /** 길이 셋 — 글, 정육면체 한 모서리, 그림 이름표 순 */
  const dimsOf = () => {
    if (tm) return tm.slice(1).map(Number);
    if (cubeM) return [+cubeM[1], +cubeM[1], +cubeM[1]];
    if (nets.length && nets[0].dims) return nets[0].dims;
    assert.ok(cubs.length && cubs[0].len.every((l) => l.show === ''), `길이를 못 읽음: ${q}`);
    return cubs[0].cm;
  };
  let m;
  // ── O9 활용 ──
  if (/블록은 모두 몇 개/.test(L)) {
    m = /가로 (\d+) cm, 세로 (\d+) cm, 높이 (\d+) cm예요\. .*한 모서리가 (\d+) cm/.exec(q);
    const [a, b, h, k] = m.slice(1).map(Number);
    assert.ok(a % k === 0 && b % k === 0 && h % k === 0, `블록이 꼭 맞지 않음: ${q}`);
    return { type: 'blocks', ans: String((a / k) * (b / k) * (h / k)), f: { a, b, h, k } };
  }
  if (/두 조각의 겉넓이의 합은 처음 두부의 겉넓이보다 몇 cm² 늘었/.test(L)) {
    const d = dimsOf(); assert.equal(d[0] % 2, 0, '가로가 짝수');
    return { type: 'tofuSurf', ans: String(2 * surfOf([d[0] / 2, d[1], d[2]]) - surfOf(d)), f: { d } };
  }
  if (/두 조각의 부피의 합은 몇 cm³/.test(L)) { const d = dimsOf(); return { type: 'tofuVol', ans: String(2 * (d[0] / 2) * d[1] * d[2]), f: { d } }; }
  if ((m = /겉넓이가 (\d+) cm²인 정육면체/.exec(q)) && /부피는 몇 cm³/.test(L)) {
    const Sv = +m[1]; const s = Math.sqrt(Sv / 6); assert.ok(Number.isInteger(s), `한 모서리가 자연수가 아님: ${q}`);
    return { type: 'cubeVol', ans: String(s ** 3), f: { S: Sv, s } };
  }
  if (/높이는 몇 cm/.test(L)) {
    if ((m = /부피가 (\d+) cm³인 직육면체의 가로는 (\d+) cm, 세로는 (\d+) cm/.exec(q))) {
      const [V, a, b] = m.slice(1).map(Number); assert.equal(V % (a * b), 0); return { type: 'height', ans: String(V / (a * b)), f: { V, a, b } };
    }
    m = /밑면의 넓이가 (\d+) cm², 부피가 (\d+) cm³/.exec(q);
    const [Sb, V] = m.slice(1).map(Number); assert.equal(V % Sb, 0); return { type: 'heightS', ans: String(V / Sb), f: { S: Sb, V } };
  }
  // ── O8 1 m³ ──
  if ((m = /(\d+(?:\.\d+)?) m³는 몇 cm³/.exec(L))) return { type: 'm3cm3', ans: str(toU(m[1]) * 1000000n), f: { X: toU(m[1]) } };
  if ((m = /^(\d+) cm³는 몇 m³/.exec(L))) return { type: 'cm3m3', ans: str(div(I(m[1]), I(1000000))), f: { N: +m[1] } };
  if ((m = /한 모서리가 (\d+) m인 정육면체/.exec(q))) { const k = BigInt(m[1]); return { type: 'cubeM', ans: String((100n * k) ** 3n), f: { k: +m[1] } }; }
  const mixT = /가로 (\d+) m, 세로 (\d+) cm, 높이 (\d+) cm/.exec(q);
  const mixF = cubs.length && cubs[0].len.some((l) => l.unit === 'm') && cubs[0].len.some((l) => l.unit === 'cm') ? cubs[0] : null;
  if (mixT || mixF) {
    const raw = mixT ? mixT.slice(1).map(Number) : mixF.len.map((l) => Number(l.raw));
    const units = mixT ? ['m', 'cm', 'cm'] : mixF.len.map((l) => l.unit);
    const cm = raw.map((v, i) => BigInt(v) * (units[i] === 'm' ? 100n : 1n));
    const vol = cm[0] * cm[1] * cm[2];
    const f = { raw, units, vol };
    if (/몇 m³/.test(L)) return { type: 'mixM3', ans: str(div(vol * S, I(1000000))), f };
    return { type: 'mixCm3', ans: String(vol), f };
  }
  // ── O4 전개도 ──
  if ((m = /면 ㉮와 (마주 보는|평행한) 면은 어느 것/.exec(L))) { const N = nets[0]; return { type: 'opp', ans: `면 ${T_FACE[N.opp(1) - 1]}`, f: { N } }; }
  if (/점 ㄱ과 만나는 점을 모두/.test(L)) {
    const N = nets[0]; const i0 = N.idx('ㄱ');
    const ps = [...Array(N.n).keys()].filter((j) => j !== i0 && N.vOf(j) === N.vOf(i0));
    assert.ok(ps.length >= 1, `만나는 점이 없다: ${q}`);
    return { type: 'meet', ans: ps.map((j) => `점 ${N.name(j)}`).join(', '), f: { N, i0, ps } };
  }
  // 생성기는 늘 선분 ㄱㄴ · 원고 O4 3장 확인은 같은 이름 그대로 선분 ㅅㅇ (Codex 24차 #4: 배움 글과 같은 전개도·같은 이름)
  if ((m = /선분 ([ㄱ-ㅎ])([ㄱ-ㅎ])[과와] 겹치는 선분/.exec(L))) {
    const N = nets[0]; const i0 = N.idx(m[1]);
    assert.equal(N.name((i0 + 1) % N.n), m[2], `선분 ${m[1]}${m[2]}은 둘레의 한 선분 (시계 방향 이름 순서)`);
    const j = [...Array(N.n).keys()].find((x) => x !== i0 && N.segE(x) === N.segE(i0));
    return { type: 'seg', ans: `선분 ${N.name(j)}${N.name((j + 1) % N.n)}`, f: { N, i0, j } };
  }
  if (/정육면체가 될까요/.test(L)) { const N = nets[0]; return { type: 'isnet', ans: N.valid ? '네, 정육면체가 돼요' : '아니요, 두 면이 겹쳐요', f: { N } }; }
  if (/\?로 표시한 선분의 길이는 몇 cm/.test(L)) { const N = nets[0]; return { type: 'netLen', ans: String(N.segLen(+N.opt.q)), f: { N, d: N.dims } }; }
  // ── O6·O7 부피 비교 ──
  if (/부피가 더 큰 것은 어느 것/.test(L)) {
    let g;
    if (cubs.length === 2) g = cubs.map((x) => x.cm);
    else g = ['㉮', '㉯'].map((nm) => { const z = new RegExp(`${nm} 가로 (\\d+) cm · 세로 (\\d+) cm · 높이 (\\d+) cm`).exec(q); return z.slice(1).map(Number); });
    const v = g.map((d) => d[0] * d[1] * d[2]);
    assert.notEqual(v[0], v[1], '부피가 같으면 안 된다');
    return { type: cubs.length === 2 ? 'compare6' : 'compare7', ans: v[0] > v[1] ? '㉮' : '㉯', f: { g, v } };
  }
  // ── O5 겉넓이 ──
  if (/옆면 4개의 넓이의 합/.test(L)) {
    const d = dimsOf(); const bottom = T_FACES.find((f) => f.ax === 2 && f.v === 0);
    return { type: 'side', ans: String(adjFaces(bottom).reduce((a, f) => a + areaOf(f, d), 0)), f: { d } };
  }
  if (/겉넓이는 몇 cm²/.test(L)) { const d = dimsOf(); return { type: 'surf', ans: String(surfOf(d)), f: { d } }; }
  // ── O6·O7 부피 ──
  if ((m = /한 층에 가로 (\d+)개, 세로 (\d+)개씩 놓고 (\d+)층/.exec(q))) { const d = m.slice(1).map(Number); return { type: 'layers', ans: String(d[0] * d[1] * d[2]), f: { d } }; }
  if (cubs.length && cubs[0].cubes && /부피는 몇 cm³/.test(L)) { const d = cubs[0].cm; return { type: 'cubes', ans: String(d[0] * d[1] * d[2]), f: { d } }; }
  if ((m = /밑면의 넓이가 (\d+) cm², 높이가 (\d+) cm/.exec(q))) { const [Sb, h] = m.slice(1).map(Number); return { type: 'baseVol', ans: String(Sb * h), f: { S: Sb, h } }; }
  if (/부피는 몇 cm³/.test(L)) { const d = dimsOf(); return { type: 'vol', ans: String(d[0] * d[1] * d[2]), f: { d } }; }
  // ── O3 성질 ──
  const shadeF = cubs.length && cubs[0].shade >= 0 ? T_SHADE[cubs[0].shade] : null;
  const namedF = (m = /면 ([ㄱ-ㅎ]{4})[과와] 평행한/.exec(q)) ? faceByName(m[1]) : null;
  if (/평행한 면의 넓이는 몇 cm²/.test(L)) { const d = dimsOf(); return { type: 'parArea', ans: String(areaOf(oppFace(namedF), d)), f: { d, face: namedF } }; }
  if (/(평행한 면은|다른 밑면은) 어느 것/.test(L)) { const face = shadeF || namedF; return { type: 'parallel', ans: `면 ${oppFace(face).set.join('')}`, f: { face } }; }
  if (/(수직인 면은|옆면은) 모두 몇 개/.test(L)) return { type: 'perpCount', ans: String(adjFaces(shadeF).length), f: { face: shadeF } };
  // ── O2 겨냥도 ──
  if (/실선과 점선을 각각 몇 개/.test(L)) {
    const miss = cubs[0].miss.map((i) => {
      // 지시문의 모서리 번호 → 그린 그림의 모서리 이름 (그림에서 data-e를 읽는다 — 번호 약속을 테스트가 따로 갖지 않는다)
      const e = /data-i="(\d+)" data-e="([^"]+)"/g; const all = [...figureSvg(`cuboid ${cubs[0].len.map((l) => `_${l.raw}`).join(' ')}`).matchAll(e)];
      return all.find((z) => +z[1] === i)[2];
    });
    const hid = miss.filter((e) => e.includes(HIDDEN)).length; const vis = miss.length - hid;
    return { type: 'complete', ans: `실선 ${vis}개, 점선 ${hid}개`, f: { vis, hid } };
  }
  if ((m = /겨냥도에서 (보이지 않는 모서리는|보이는 꼭짓점은|보이는 모서리는|보이는 면은) 몇 개/.exec(L))) {
    const k = { '보이지 않는 모서리는': 'hidEdge', '보이는 꼭짓점은': 'visVertex', '보이는 모서리는': 'visEdge', '보이는 면은': 'visFace' }[m[1]];
    const v = { hidEdge: 12 - visibleE.length, visVertex: VN.length - 1, visEdge: visibleE.length, visFace: visibleF.length }[k];
    return { type: k, ans: String(v), f: {} };
  }
  if (/모든 모서리 길이의 합은 몇 cm/.test(L)) {
    const d = dimsOf();
    return { type: 'edgeSum', ans: String(T_EDGES.reduce((a, e) => a + d[edgeAxis(e)], 0)), f: { d, cube: d[0] === d[1] && d[1] === d[2] } };
  }
  if ((m = /모든 모서리 길이의 합이 (\d+) cm인 정육면체/.exec(q))) return { type: 'edgeInv', ans: q4(+m[1], T_EDGES.length), f: { L: +m[1] } };
  if ((m = /길이가 (\d+) cm인 모서리는 모두 몇 개/.exec(L))) {
    const d = dimsOf(); const Lv = +m[1];
    const cnt = T_EDGES.filter((e) => d[edgeAxis(e)] === Lv).length;
    return { type: d[0] === d[1] && d[1] === d[2] ? 'cubeSameLen' : 'sameLen', ans: String(cnt), f: { d, len: Lv } };
  }
  // ── O1 직육면체·정육면체 ──
  if (/이 도형을 바르게 말한 것은/.test(L)) {
    const d = dimsOf(); const cube = d[0] === d[1] && d[1] === d[2];
    return { type: cube ? 'cubeSay' : 'cuboidSay', ans: cube ? '직육면체라고도 할 수 있어요' : '직육면체예요 — 면 6개가 모두 직사각형이에요', f: { d } };
  }
  if (/(직육면체|정육면체)의 모서리는 모두 몇 개/.test(L)) return { type: 'edges', ans: String(T_EDGES.length), f: {} };
  if (/(직육면체|정육면체)의 꼭짓점은 모두 몇 개/.test(L)) return { type: 'vertices', ans: String(VN.length), f: {} };
  if (/(직육면체|정육면체)의 면은 모두 몇 개/.test(L)) return { type: 'faces', ans: String(T_FACES.length), f: {} };
  throw new Error(`못 읽는 문제: ${q}`);
}

/** 이름표 → 그 틀린 생각의 값(글자) 또는 뜻 검사(f, 글자) → 참/거짓 (문제 종류마다) */
const fnT = (fn) => ({ is: fn });
const TAGV = {
  edges: { [TAGS.visibleOnly]: () => String(visibleE.length), [TAGS.asVertex]: () => '8', [TAGS.asFace]: () => '6' },
  vertices: { [TAGS.visibleOnly]: () => '7', [TAGS.asEdge]: () => '12', [TAGS.asFace]: () => '6' },
  faces: { [TAGS.visibleOnly]: () => String(visibleF.length), [TAGS.asVertex]: () => '8', [TAGS.asEdge]: () => '12' },
  cubeSameLen: { [TAGS.sameFour]: () => '4', [TAGS.visibleOnly]: () => String(visibleE.length), [TAGS.labelOnly]: () => '3' },
  sameLen: {
    [TAGS.visibleOnly]: (f) => String(visibleE.filter((e) => f.d[edgeAxis(e)] === f.len).length),
    [TAGS.labelOnly]: (f) => String(LABEL_EDGE.filter((e) => f.d[edgeAxis(e)] === f.len).length),
    [TAGS.allSame]: () => '12',
  },
  cubeSay: { [TAGS.notSubset]: () => '정육면체라서 직육면체는 아니에요', [TAGS.asVertex]: () => '모서리가 8개예요', [TAGS.visibleOnly]: () => '면이 3개예요' },
  cuboidSay: { [TAGS.sixFaces]: () => '정육면체예요 — 면이 6개예요', [TAGS.sameLenNeed]: () => '직육면체가 아니에요 — 모서리의 길이가 서로 달라요', [TAGS.asEdge]: () => '꼭짓점이 12개예요' },
  hidEdge: { [TAGS.hidVsVis]: () => String(visibleE.length), [TAGS.hidVertex]: () => '1' },
  visVertex: { [TAGS.hidVsVis]: () => '1', [TAGS.countAll]: () => '8', [TAGS.visEdgeCount]: () => String(visibleE.length) },
  visEdge: { [TAGS.hidVsVis]: () => String(12 - visibleE.length), [TAGS.countAll]: () => '12', [TAGS.visVertexCount]: () => '7' },
  visFace: { [TAGS.countAll]: () => '6', [TAGS.visEdgeCount]: () => String(visibleE.length), [TAGS.visVertexCount]: () => '7' },
  complete: {
    [TAGS.swapLine]: (f) => `실선 ${f.hid}개, 점선 ${f.vis}개`,
    [TAGS.allSolid]: (f) => `실선 ${f.vis + f.hid}개, 점선 0개`,
    [TAGS.allDash]: (f) => `실선 0개, 점선 ${f.vis + f.hid}개`,
  },
  edgeSum: {
    [TAGS.threeOnly]: (f) => String(LABEL_EDGE.reduce((a, e) => a + f.d[edgeAxis(e)], 0)),
    [TAGS.visSum]: (f) => String(visibleE.reduce((a, e) => a + f.d[edgeAxis(e)], 0)),
    [TAGS.timesTwo]: (f) => String(2 * (f.d[0] + f.d[1] + f.d[2])),
    [TAGS.faceTimes]: (f) => (f.cube ? String(6 * f.d[0]) : 'x'),
  },
  edgeInv: { [TAGS.div4]: (f) => q4(f.L, 4), [TAGS.div6]: (f) => q4(f.L, 6), [TAGS.div8]: (f) => q4(f.L, 8) },
  parallel: {
    [TAGS.nextFace]: fnT((f, t) => { const g = faceByName(t.slice(2)); return !!g && g.ax !== f.face.ax && goodFaceName(t.slice(2)); }),
    [TAGS.notFace]: fnT((f, t) => /^면 [ㄱ-ㅎ]{4}$/.test(t) && new Set(t.slice(2)).size === 4 && !faceByName(t.slice(2))),
  },
  perpCount: { [TAGS.withOpp]: (f) => String(adjFaces(f.face).length + 1), [TAGS.visPerp]: (f) => String(adjFaces(f.face).filter((g) => visibleF.includes(g)).length) },
  parArea: {
    [TAGS.nextFace]: fnT((f, t) => adjFaces(f.face).some((g) => String(areaOf(g, f.d)) === t)),
    [TAGS.addForMul]: (f) => String(faceAxes(f.face).reduce((a, i) => a + f.d[i], 0)),
  },
  opp: {
    [TAGS.netNext]: fnT((f, t) => f.N.gridNb(1).some((d) => `면 ${T_FACE[d - 1]}` === t)),
    [TAGS.netFar]: fnT((f, t) => {
      const N = f.N; const dist = { 1: 0 }; const qq = [1];
      while (qq.length) { const x = qq.shift(); for (const y of N.gridNb(x)) if (!(y in dist)) { dist[y] = dist[x] + 1; qq.push(y); } }
      const non = [2, 3, 4, 5, 6].filter((d) => d !== N.opp(1));
      const max = Math.max(...non.map((d) => dist[d]));
      return non.some((d) => dist[d] === max && `면 ${T_FACE[d - 1]}` === t);
    }),
    [TAGS.netEnds]: fnT((f, t) => {
      const c = f.N.cellOf(1);
      return [[0, 1], [0, -1], [1, 0], [-1, 0]].some(([dr, dc]) => {
        const run = [1, 2, 3].map((k) => f.N.cells.find((x) => x.r === c.r + k * dr && x.c === c.c + k * dc));
        return run.every(Boolean) && `면 ${T_FACE[run[2].d - 1]}` === t;
      });
    }),
    [TAGS.netMeet]: fnT((f, t) => [2, 3, 4, 5, 6].some((d) => d !== f.N.opp(1) && `면 ${T_FACE[d - 1]}` === t)),
  },
  meet: {
    [TAGS.ptOne]: fnT((f, t) => { const got = ptsOf(t); return got.length >= 1 && got.length < f.ps.length && got.every((nm) => f.ps.some((j) => f.N.name(j) === nm)); }),
    [TAGS.ptShift]: fnT((f, t) => {
      const N = f.N; const got = ptsOf(t).map((nm) => N.idx(nm));
      const bad = got.filter((j) => !f.ps.includes(j));
      return bad.length === 1 && bad[0] !== f.i0 && f.ps.some((p) => (p + 1) % N.n === bad[0] || (p - 1 + N.n) % N.n === bad[0]);
    }),
    [TAGS.ptNext]: fnT((f, t) => { const got = ptsOf(t).map((nm) => f.N.idx(nm)); return got.length === 1 && (got[0] === (f.i0 + 1) % f.N.n || got[0] === (f.i0 - 1 + f.N.n) % f.N.n); }),
  },
  seg: {
    [TAGS.segShift]: fnT((f, t) => {
      const N = f.N; const ij = ptsOf(t).map((nm) => N.idx(nm)).sort((a, b) => a - b);
      const segI = (ij[1] - ij[0] === 1) ? ij[0] : (ij[0] === 0 && ij[1] === N.n - 1 ? N.n - 1 : -1);
      return segI >= 0 && segI !== f.j && segI !== f.i0 && (segI === (f.j + 1) % N.n || segI === (f.j - 1 + N.n) % N.n);
    }),
    [TAGS.segOpp]: fnT((f, t) => {
      // 선분 ㄱㄴ을 변으로 가진 칸의 맞은편 변 — 그 칸의 나머지 두 귀퉁이
      const N = f.N; const p = N.pts[f.i0]; const q = N.pts[(f.i0 + 1) % N.n];
      const cell = N.cells.find((x) => [p, q].every(([px, py]) => px >= x.x && px <= x.x + x.w && py >= x.y && py <= x.y + x.h));
      const rest = [[cell.x, cell.y], [cell.x + cell.w, cell.y], [cell.x + cell.w, cell.y + cell.h], [cell.x, cell.y + cell.h]].filter(([x, y]) => !((x === p[0] && y === p[1]) || (x === q[0] && y === q[1])));
      const want = rest.map(([x, y]) => N.name(N.pts.findIndex((z) => z[0] === x && z[1] === y))).sort();
      return sameSet(ptsOf(t), want);
    }),
  },
  isnet: {
    [TAGS.foldWrong]: fnT((f, t) => f.N.valid && ['아니요, 두 면이 겹쳐요', '아니요, 면 하나가 비어요'].includes(t)),
    [TAGS.crossOnly]: fnT((f, t) => f.N.valid && t === '아니요, 십자 모양이 아니라서 안 돼요'),
    [TAGS.sixOnly]: fnT((f, t) => !f.N.valid && t === '네, 정사각형이 6개라서 돼요'),
    [TAGS.connOnly]: fnT((f, t) => !f.N.valid && t === '네, 모두 이어져 있어서 돼요'),
  },
  netLen: { [TAGS.wrongDim]: fnT((f, t) => f.d.map(String).includes(t)) },
  surf: {
    [TAGS.noDouble]: (f) => String(surfOf(f.d) / 2),
    [TAGS.mulAll]: (f) => String(f.d[0] * f.d[1] * f.d[2]),
    [TAGS.sideOnly]: (f) => String(adjFaces(T_FACES.find((g) => g.ax === 2)).reduce((a, g) => a + areaOf(g, f.d), 0)),
    [TAGS.fourFaces]: (f) => String(adjFaces(T_FACES.find((g) => g.ax === 2)).reduce((a, g) => a + areaOf(g, f.d), 0)),
    [TAGS.edgeTimes6]: (f) => (f.d[0] === f.d[1] && f.d[1] === f.d[2] ? String(6 * f.d[0]) : 'x'),
  },
  side: {
    [TAGS.halfPerim]: (f) => String((f.d[0] + f.d[1]) * f.d[2]),
    [TAGS.withBase]: (f) => String(surfOf(f.d)),
    [TAGS.mulAll]: (f) => String(f.d[0] * f.d[1] * f.d[2]),
  },
  cubes: { [TAGS.visCubes]: (f) => String(visibleCubes(f.d)), [TAGS.oneLayer]: (f) => String(f.d[0] * f.d[1]), [TAGS.addDims]: (f) => String(f.d[0] + f.d[1] + f.d[2]) },
  layers: { [TAGS.oneLayer]: (f) => String(f.d[0] * f.d[1]), [TAGS.addLayers]: (f) => String(f.d[0] * f.d[1] + f.d[2]), [TAGS.addDims]: (f) => String(f.d[0] + f.d[1] + f.d[2]) },
  compare6: {
    [TAGS.tallWins]: fnT((f, t) => { const i = t === '㉮' ? 0 : t === '㉯' ? 1 : -1; return i >= 0 && f.v[i] < f.v[1 - i] && f.g[i][2] > f.g[1 - i][2]; }),
    [TAGS.sameVol]: () => '두 부피가 같아요',
  },
  compare7: {
    [TAGS.sumWins]: fnT((f, t) => { const i = t === '㉮' ? 0 : t === '㉯' ? 1 : -1; const sum = (d) => d[0] + d[1] + d[2]; return i >= 0 && f.v[i] < f.v[1 - i] && sum(f.g[i]) > sum(f.g[1 - i]); }),
    [TAGS.sameGuess]: () => '두 부피가 같아요',
  },
  vol: {
    [TAGS.addDims]: (f) => String(f.d[0] + f.d[1] + f.d[2]),
    [TAGS.surfAsVol]: (f) => String(surfOf(f.d)),
    [TAGS.baseOnly]: (f) => String(f.d[0] * f.d[1]),
    [TAGS.times3]: (f) => String(3 * f.d[0]),
    [TAGS.squareOnly]: (f) => String(f.d[0] * f.d[0]),
  },
  baseVol: { [TAGS.addForMul]: (f) => String(f.S + f.h), [TAGS.baseOnly]: (f) => String(f.S) },
  m3cm3: { [TAGS.lenUnit]: (f) => str(f.X * 100n), [TAGS.areaUnit]: (f) => str(f.X * 10000n), [TAGS.thousand]: (f) => str(f.X * 1000n) },
  cm3m3: { [TAGS.lenUnit]: (f) => q4(f.N, 100), [TAGS.areaUnit]: (f) => q4(f.N, 10000), [TAGS.thousand]: (f) => q4(f.N, 1000) },
  mixM3: {
    [TAGS.noConvert]: (f) => String(f.raw[0] * f.raw[1] * f.raw[2]),
    [TAGS.wrongUnit]: (f) => String(f.vol),
    // 한 길이만: cm인 첫 길이만 m로 (세로)
    [TAGS.oneConvert]: (f) => str(div(I(f.raw[0] * f.raw[1] * f.raw[2]), I(100))),
  },
  mixCm3: { [TAGS.noConvert]: (f) => String(f.raw[0] * f.raw[1] * f.raw[2]), [TAGS.tenTimes]: (f) => String(f.raw[0] * 10 * f.raw[1] * f.raw[2]), [TAGS.wrongUnit]: (f) => str(div(f.vol * S, I(1000000))) },
  cubeM: { [TAGS.lenUnit]: (f) => String(f.k ** 3 * 100), [TAGS.areaUnit]: (f) => String(f.k ** 3 * 10000), [TAGS.wrongUnit]: (f) => String(f.k ** 3) },
  height: { [TAGS.divOne]: (f) => q4(f.V, f.a), [TAGS.subForDiv]: (f) => String(f.V - f.a - f.b), [TAGS.invMul]: (f) => String(f.V * f.a * f.b) },
  heightS: { [TAGS.subForDiv]: (f) => String(f.V - f.S), [TAGS.invMul]: (f) => String(f.V * f.S) },
  cubeVol: { [TAGS.faceStop]: (f) => String(f.s * f.s), [TAGS.edgeStop]: (f) => String(f.s), [TAGS.surfAsVol]: (f) => String(f.S) },
  tofuSurf: { [TAGS.oneCut]: (f) => String(f.d[1] * f.d[2]), [TAGS.doubleSurf]: (f) => String(surfOf(f.d)) },
  tofuVol: { [TAGS.doubleVol]: (f) => String(2 * f.d[0] * f.d[1] * f.d[2]), [TAGS.halfVol]: (f) => q4(f.d[0] * f.d[1] * f.d[2], 2) },
  blocks: { [TAGS.divOnce]: (f) => q4(f.a * f.b * f.h, f.k), [TAGS.addDims]: (f) => q4(f.a + f.b + f.h, f.k), [TAGS.volOnly]: (f) => String(f.a * f.b * f.h) },
};
/** 그 오답이 그 이름표의 뜻대로인가 */
function tagHolds(type, tag, f, text) {
  const fn = TAGV[type] && TAGV[type][tag];
  if (!fn) return false;
  return typeof fn === 'function' ? canon(fn(f)) === canon(text) : fn.is(f, text);
}

/** 문항 하나씩 — 개념·씨앗·얼굴 */
function* every(kinds = ['calc', 'misread'], n = SEEDS) {
  for (const c of CUBOID) for (const k of kinds) for (let s = 1; s <= n; s++) yield { c, k, s, q: makeQuestion(c.id, k, s, OPTS) };
}
const allText = (q) => [q.q, ...q.choices.map((x) => x.text), ...(q.solve ? [...q.solve.steps, ...Object.values(q.solve.why), q.solve.whyAny, q.solve.rule] : [])].join('\n');

// ───────────────────── 테스트 ─────────────────────

test('독립 모형 자체 점검 — 모서리 12 · 면 6 · 보이는 모서리 9 · 보이는 면 3 · 전개도 11가지는 접히고 겹치는 모양은 안 접힌다', () => {
  assert.equal(T_EDGES.length, 12);
  assert.equal(T_FACES.length, 6);
  assert.equal(HIDDEN, 'ㅁ');
  assert.equal(visibleE.length, 9);
  assert.equal(visibleF.length, 3);
  assert.equal(surfOf([5, 3, 4]), 94);
  assert.equal(visibleCubes([4, 3, 2]), 4 * 3 + 3 * 2 + 4 * 2 - 4 - 3 - 2 + 1);
  for (const f of ['ㄱㄴㄷㄹ', 'ㅁㅂㅅㅇ', 'ㄹㄷㅅㅇ', 'ㄱㄴㅂㅁ', 'ㄱㄹㅇㅁ', 'ㄴㄷㅅㅂ']) assert.ok(goodFaceName(f), f);
  assert.ok(!goodFaceName('ㄱㄴㅅㅇ') && !goodFaceName('ㄱㄷㄴㄹ'));
  // 생성기가 내보낸 전개도 목록(재료)만 쓴다 — 접기는 이 파일이 따로
  const lab = (p) => { let k = 0; return p.replace(/X/g, () => String(++k)); };
  for (const p of _kit.CUBE_NETS) { const N = foldNet(lab(p)); assert.ok(N.valid, `전개도인데 안 접힘: ${p}`); assert.equal(N.n, 14, p); }
  assert.equal(new Set(_kit.CUBE_NETS).size, 11);
  for (const p of _kit.NOT_NETS) assert.ok(!foldNet(lab(p)).valid, `겹치는 모양인데 접힘: ${p}`);
  // 십자 전개도: 가운데 줄 ㉯㉰㉱㉲, 위 ㉮ · 아래 ㉳ — ㉮와 ㉳, ㉯와 ㉱, ㉰와 ㉲가 마주 본다
  const X = foldNet('.1../2345/.6..');
  assert.deepEqual([X.opp(1), X.opp(2), X.opp(3)], [6, 4, 5]);
});

test('사다리: 9칸, O1~O4 초5 · O5~O9 초6, needs가 바로 앞 칸 · 맨 뒤는 ⭐', () => {
  assert.equal(CUBOID.length, 9);
  assert.deepEqual(IDS, ['cub.parts', 'cub.sketch', 'cub.faces', 'cub.net', 'cub.surface', 'cub.unit', 'cub.volume', 'cub.m3', 'cub.apply']);
  CUBOID.forEach((c, i) => {
    assert.equal(c.grade, i < 4 ? 5 : 6, c.id);
    assert.deepEqual(c.needs, i ? [IDS[i - 1]] : []);
    assert.ok(c.idea && c.rule && c.slip && c.name, c.id);
  });
  assert.equal(gradeLabel(5), '초5');
  assert.ok(conceptById('cub.apply').name.startsWith('⭐'));
});

test('★ 독립 검산: ① 정답이 문제 글·그림을 따로 읽어 푼 답과 같다 · 딱 하나만 맞다 · 오답은 그 답이 아니다', () => {
  const types = new Set();
  for (const { c, s, q } of every(['calc'])) {
    const { type, ans } = solveText(q.q);
    types.add(type);
    const oks = q.choices.filter((x) => x.ok);
    assert.equal(oks.length, 1, `${c.id} #${s}`);
    assert.equal(canon(oks[0].text), canon(ans), `${c.id} #${s} (${type})\n${q.q}`);
    for (const w of q.choices.filter((x) => !x.ok)) {
      assert.notEqual(canon(w.text), canon(ans), `${c.id} #${s}: 오답이 정답과 같다`);
      if (valueOf(w.text) !== null && valueOf(ans) !== null) assert.notEqual(valueOf(w.text), valueOf(ans), `${c.id} #${s}: 값이 같은 오답`);
    }
  }
  assert.deepEqual([...types].sort(), Object.keys(TAGV).sort(), '문제 종류가 다 나온다 (가족이 통째로 빠지지 않게)');
});

test('★ 보기: 정답 하나, 글자·값 겹침 없음, 3개 이상, 빈 글자·undefined·NaN·남은 자리표시 없음 · 그림 지시문은 모두 그려진다', () => {
  for (const { c, k, s, q } of every()) {
    const texts = q.choices.map((x) => String(x.text));
    assert.equal(new Set(texts.map(canon)).size, texts.length, `${c.id} ${k} #${s}: 같은 보기 ${texts}`);
    const vals = texts.map(valueOf).filter((v) => v !== null);
    assert.equal(new Set(vals).size, vals.length, `${c.id} ${k} #${s}: 값이 같은 보기 ${texts}`);
    assert.ok(q.choices.length >= 3, `${c.id} ${k} #${s}: 보기가 ${q.choices.length}개`);
    const all = allText(q);
    assert.ok(!/undefined|NaN|null|\{(?!mon|me)/.test(all), `${c.id} ${k} #${s}: ${all}`);
    for (const f of q.q.match(/\[[a-z]+ [^\]]+\]/g) || []) assert.ok(figureSvg(f.slice(1, -1)), `${c.id} ${k} #${s}: 못 그리는 ${f}`);
  }
});

test('★ 오개념 이름표: 그 오답이 정말 그 실수다 — 문제 글을 읽어 틀린 생각을 다시 한다 · 이름표 붙은 오답이 늘 둘 이상', () => {
  for (const { c, s, q } of every(['calc'])) {
    const { type, f } = solveText(q.q);
    const tagged = q.choices.filter((x) => !x.ok && x.tag && x.tag !== '계산 실수');
    assert.ok(tagged.length >= 2, `${c.id} #${s} (${type}): 이름표 붙은 오답 ${tagged.length}개\n${q.q}\n${q.choices.map((x) => x.text)}`);
    for (const w of tagged) assert.ok(tagHolds(type, w.tag, f, w.text), `${c.id} #${s} (${type}): "${w.tag}" 오답 "${w.text}"이 그 뜻이 아니다\n${q.q}`);
  }
});

test('★ 오답끼리 같은 값이 되지 않는다 — 보기에서 겹쳐 빠지기 전(probe.allWrong) · 빠진 오답도 이름표의 뜻 그대로 (Codex 23차 #3과 같은 검사)', () => {
  let n = 0;
  for (const { c, s, q } of every(['calc'])) {
    const all = (q.probe && q.probe.allWrong) || [];
    assert.ok(all.length >= 2, `${c.id} #${s}: allWrong 없음`);
    const { type, f, ans } = solveText(q.q);
    const seen = new Map();
    for (const w of all) {
      assert.ok(tagHolds(type, w.tag, f, w.text), `${c.id} #${s} (${type}): "${w.tag}" → "${w.text}"`);
      const key = canon(w.text);
      assert.ok(!seen.has(key), `${c.id} #${s} (${type}): "${seen.get(key)}"와 "${w.tag}"가 같은 값 ${w.text}\n${q.q}`);
      assert.notEqual(key, canon(ans), `${c.id} #${s}: 틀린 방법이 정답과 같은 값 (${w.tag})`);
      seen.set(key, w.tag);
    }
    n++;
  }
  assert.ok(n >= 9 * SEEDS);
});

/** ② 보여 준 말에서 무엇을 구했는지 (보여 준 말이 그 대상으로 틀려야 "맞게 말했어요"가 정말 틀린 보기다) */
const SAID_WHAT = /(모서리는|모서리도|정육면체는|평행한 면은|수직인 면은|마주 보는 면은|겉넓이는|겉넓이의 합은|부피는|높이는|합은|m³는)/;
test('★ ② 오개념 문항: 보여 준 말은 정말 틀렸다 · 고치는 말만 맞다 · 갈래 열쇠 둘 (씨앗 5,000개↑ — 가로 6·세로 12·높이 4처럼 드문 수를 2만 씨앗에서만 잡았다)', () => {
  const branches = {};
  for (const { c, s, q } of every(['misread'], Math.max(SEEDS, 5000))) {
    assert.match(q.key, /^misread:[a-zA-Z0-9]+$/, `${c.id} #${s}`);
    (branches[c.id] ||= new Set()).add(q.key);
    const t = q.q; const br = q.key.slice(8);
    const ok = q.choices.find((x) => x.ok).text;
    const bad = q.choices.filter((x) => !x.ok);
    const said = (/\*\*(.+?)\*\*/s.exec(t) || [])[1] || '';
    const at = (cond, msg) => assert.ok(cond, `${c.id} #${s} ${q.key} ${msg}\n${t}\n✔ ${ok}`);
    at(bad.some((x) => x.tag === '틀린 줄 모름'), '"맞게 말했어요" 보기');
    at(SAID_WHAT.test(said), '보여 준 말이 무엇을 구한 말인지 없다');
    const cub = figsOf(t).filter((x) => x.kind === 'cuboid').map((x) => cubOf(x.arg))[0];
    const net = figsOf(t).filter((x) => x.kind === 'net').map((x) => foldNet(x.arg))[0];
    const endNum = (z) => (/([\d.]+) ?(?:cm³|m³|cm²|cm|개)?예요$/.exec(z) || [])[1];
    let right;
    if (c.id === 'cub.parts' && br === 'visible') { right = '12'; at(endNum(said) !== right, '보여 준 수'); at(ok.includes(`${right}개`), '고치는 말'); }
    else if (c.id === 'cub.parts' && br === 'cube') { at(/직육면체가 아니에요/.test(said), '보여 준 말'); at(/직육면체라고 할 수 있어요/.test(ok), '고치는 말'); }
    else if (c.id === 'cub.sketch' && br === 'hidden') { right = String(12 - visibleE.length); at(/모서리도 1개/.test(said), '보여 준 수'); at(ok.includes(`${right}개`), '고치는 말'); }
    else if (c.id === 'cub.sketch' && br === 'sum') { right = String(T_EDGES.reduce((a, e) => a + cub.cm[edgeAxis(e)], 0)); at(endNum(said) !== right, '보여 준 수'); at(ok.includes(right), '고치는 말'); }
    else if (c.id === 'cub.faces' && br === 'next') {
      const sh = T_SHADE[cub.shade]; const shown = faceByName(/면 ([ㄱ-ㅎ]{4})이에요/.exec(said)[1]);
      at(shown.ax !== sh.ax, '보여 준 면이 색칠한 면과 만난다'); at(sameSet([.../마주 보는 면 ([ㄱ-ㅎ]{4})$/.exec(ok)[1]], oppFace(sh).set), '고치는 말의 면');
    } else if (c.id === 'cub.faces' && br === 'perp') { at(/5개/.test(said), '보여 준 수'); at(ok.endsWith(`${adjFaces(T_SHADE[cub.shade]).length}개`), '고치는 말'); }
    else if (c.id === 'cub.net') {
      const shown = T_FACE.indexOf(/면 (㉮|㉯|㉰|㉱|㉲|㉳)(?:이에요|예요)$/.exec(said)[1]) + 1;
      at(shown !== net.opp(1), '보여 준 면이 정말 마주 보는 면이 아니다');
      if (br === 'next') at(net.gridNb(1).includes(shown), '보여 준 면이 ㉮와 붙어 있다');
      at(ok.endsWith(`면 ${T_FACE[net.opp(1) - 1]}`), '고치는 말');
    } else if (c.id === 'cub.surface' && br === 'three') { right = String(surfOf(cub.cm)); at(endNum(said) !== right, '보여 준 수'); at(ok.includes(right), '고치는 말'); }
    else if (c.id === 'cub.surface' && br === 'cube4') { right = String(surfOf(cub.cm)); at(endNum(said) !== right, '보여 준 수'); at(ok.includes(right), '고치는 말'); }
    else if (c.id === 'cub.unit') { right = String(cub.cm[0] * cub.cm[1] * cub.cm[2]); at(endNum(said) !== right, '보여 준 수'); at(ok.endsWith(`${right} cm³`), '고치는 말'); if (br === 'visible') at(said.includes(`${visibleCubes(cub.cm)}개`), '보이는 쌓기나무 수'); }
    else if (c.id === 'cub.volume') { right = String(cub.cm[0] * cub.cm[1] * cub.cm[2]); at(endNum(said) !== right, '보여 준 수'); at(ok.endsWith(`${right} cm³`), '고치는 말'); }
    else if (c.id === 'cub.m3' && br === 'hundred') { const X = BigInt(num(/부피는 (\d+) m³예요/, t)); right = String(X * 1000000n); at(endNum(said) !== right, '보여 준 수'); at(ok.endsWith(`${right} cm³`), '고치는 말'); }
    else if (c.id === 'cub.m3' && br === 'mix') { const v = cub.len.map((l) => BigInt(l.raw) * (l.unit === 'm' ? 100n : 1n)); right = str(div(v[0] * v[1] * v[2] * S, I(1000000))); at(endNum(said) !== right, '보여 준 수'); at(ok.endsWith(`${right} m³`), '고치는 말'); }
    else if (c.id === 'cub.apply' && br === 'invMul') { const [V, a, b] = /부피가 (\d+) cm³, 가로 (\d+) cm, 세로 (\d+) cm/.exec(t).slice(1).map(Number); right = String(V / (a * b)); at(endNum(said) !== right, '보여 준 수'); at(ok.endsWith(`${right} cm`), '고치는 말'); }
    else if (c.id === 'cub.apply' && br === 'tofu') { const d = /가로 (\d+) cm, 세로 (\d+) cm, 높이 (\d+) cm/.exec(t).slice(1).map(Number); right = String(2 * surfOf([d[0] / 2, d[1], d[2]])); at(endNum(said) !== right, '보여 준 수'); at(ok.endsWith(`${right} cm²`), '고치는 말'); }
    else at(false, '못 읽는 ②');
    if (right) for (const b of bad) if (b.tag !== '틀린 줄 모름') at(endNum(b.text) !== right, `오답 보기가 맞는 값 ${right}: ${b.text}`);
  }
  for (const id of IDS) assert.equal(branches[id].size, 2, `${id}: 갈래 둘`);
});

test('★ 조사: 수 뒤는 읽는 소리 · 자모(ㄱ~ㅎ) 뒤는 받침 쪽 · ㉮~㉳ 뒤는 받침 없는 쪽 · cm·m·cm²·cm³·m³ 뒤', () => {
  const BAT = new Set(['0', '1', '3', '6', '7', '8']);
  const PAIRS = [['을', '를'], ['은', '는'], ['이', '가'], ['과', '와'], ['이에요', '예요'], ['이니까', '니까']];
  let hitN = 0; let hitJ = 0; let hitC = 0;
  for (const { c, k, s, q } of every()) {
    const all = allText(q).replace(/\[[a-z]+ [^\]]+\]/g, '');
    for (const [wb, nb] of PAIRS) {
      // 템플릿 글자 안이라 \\d · \\s — 한 번만 쓰면 "d"가 되어 아무것도 안 본다 (N 2단계에서 겪음)
      for (const m of all.matchAll(new RegExp(`(\\d)(${wb}|${nb})(?=[\\s.,!?)—]|$)`, 'g'))) { assert.equal(m[2], BAT.has(m[1]) ? wb : nb, `${c.id} ${k} #${s}: "…${m[1]}${m[2]}"\n${all}`); hitN++; }
      for (const m of all.matchAll(new RegExp(`([ㄱ-ㅎ])(${wb}|${nb})(?=[\\s.,!?)—]|$)`, 'g'))) { assert.equal(m[2], wb, `${c.id} ${k} #${s}: "…${m[1]}${m[2]}"`); hitJ++; }
      for (const m of all.matchAll(new RegExp(`([㉮-㉳])(${wb}|${nb})(?=[\\s.,!?)—]|$)`, 'g'))) { assert.equal(m[2], nb, `${c.id} ${k} #${s}: "…${m[1]}${m[2]}"`); hitC++; }
    }
    assert.ok(!/(cm|m|cm²|m²|cm³|m³)(은|을|이 |과|이에요|으로)/.test(all), `${c.id} ${k} #${s}: 단위 뒤 조사\n${all}`);
  }
  // 기준은 씨앗 수에 비례 (씨앗 80개로 일부러 틀리게 해 볼 때 기준 탓에 늘 실패하면 무엇이 잡았는지 모른다)
  assert.ok(hitN > 3 * SEEDS && hitJ > 3 * SEEDS && hitC > 3 * SEEDS, `실제로 본 곳: 수 ${hitN} · 자모 ${hitJ} · ㉮ ${hitC} (검사가 빈 채 통과하지 않게)`);
});

test('★ 풀이 카드: 단계 2줄↑ · 기억할 것 · 오답마다 왜 · 정답이 단계에 나온다', () => {
  for (const { c, k, s, q } of every()) {
    const sv = q.solve;
    assert.ok(sv && sv.steps.length >= 2 && sv.rule, `${c.id} ${k} #${s}`);
    for (const w of q.choices.filter((x) => !x.ok)) assert.ok(sv.why[w.tag] || sv.whyAny, `${c.id} ${k} #${s}: "${w.tag}" 설명 없음`);
    if (k === 'calc') {
      const ok = q.choices.find((x) => x.ok).text;
      assert.ok(sv.steps.join(' ').includes(ok), `${c.id} #${s}: 정답 "${ok}"이 풀이에 없다\n${sv.steps.join('\n')}`);
    }
  }
});

test('★ 글 속 셈식은 맞다 (곱셈·나눗셈 먼저) — 문제·보기·풀이 전부', () => {
  const ev = (expr) => Function(`return (${expr.replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-')})`)();
  let n = 0;
  for (const { c, k, s, q } of every()) {
    const all = allText(q);
    for (const m of all.matchAll(/(?<![\d.□])(\d+(?:\.\d+)?(?: [+−×÷] \d+(?:\.\d+)?)+) = (\d+(?:\.\d+)?)/g)) {
      assert.ok(Math.abs(ev(m[1]) - Number(m[2])) < 1e-6, `${c.id} ${k} #${s}: ${m[0]}`);
      n++;
    }
  }
  assert.ok(n > 20 * SEEDS, `셈식 ${n}`);
});

test('🔁 쌍둥이·🤔 노트: 요청한 틀·갈래로 온다 · 같은 셈 · 쌍둥이 글이 원래 글과 같은 일은 드물다', () => {
  const same = {}; const tot = {};
  const P = { names: OPTS.names, me: OPTS.me };
  const strip = (t) => tplKey(t.replace(/(피카츄|리자몽|개굴닌자)(이|가|은|는|을|를|과|와|의)?/g, ''));
  for (const c of CUBOID) {
    for (let s = 1; s <= Math.min(SEEDS, 300); s++) {
      const q = makeQuestion(c.id, 'calc', s, P);
      assert.ok(q.key, `${c.id} #${s}: 열쇠 없음`);
      const tw = makeQuestion(c.id, 'calc', s + 99991, { ...P, want: { k: 'calc', key: q.key } });
      assert.equal(tw.key, q.key, `${c.id} #${s}: 쌍둥이가 다른 틀\n${q.q}\n---\n${tw.q}`);
      assert.equal(strip(tw.q), strip(q.q), `${c.id} #${s}: 틀 글이 다르다`);
      assert.equal(solveText(tw.q).type, solveText(q.q).type, `${c.id} #${s}: 쌍둥이가 다른 셈`);
      tot[q.key] = (tot[q.key] || 0) + 1;
      if (tw.q === q.q) same[q.key] = (same[q.key] || 0) + 1;
      const m = makeQuestion(c.id, 'misread', s, OPTS);
      const mt = makeQuestion(c.id, 'misread', s + 99991, { ...OPTS, want: { k: 'misread', key: m.key } });
      assert.equal(mt.key, m.key, `${c.id} #${s}: ② 갈래`);
    }
  }
  // 비율은 표본이 20개 이상인 틀만 (씨앗을 적게 돌리면 6개 중 2개 같은 우연이 걸린다)
  for (const key of Object.keys(tot)) if (tot[key] >= 20) assert.ok((same[key] || 0) / tot[key] <= 0.3, `쌍둥이 = 원래 글 ${same[key]}/${tot[key]}: ${key}`);
});

/** 처음 배우는 칸 — 그 앞 칸의 글·이름표에는 나오면 안 된다 */
const FIRST = [
  [/겨냥도/, 'cub.sketch'], [/평행/, 'cub.faces'], [/수직/, 'cub.faces'], [/밑면/, 'cub.faces'], [/옆면/, 'cub.faces'],
  [/전개도/, 'cub.net'], [/겉넓이/, 'cub.surface'], [/부피/, 'cub.unit'], [/쌓기나무/, 'cub.unit'], [/cm³/, 'cub.unit'], [/(?<!c)m³/, 'cub.m3'],
];
test('★ 아직 안 배운 말을 앞 칸에 쓰지 않는다 — 겨냥도 O2 · 평행·수직·밑면·옆면 O3 · 전개도 O4 · 겉넓이 O5 · 부피·쌓기나무·cm³ O6 · m³ O8', () => {
  const idx = (id) => IDS.indexOf(id);
  const banned = (id) => FIRST.filter(([, at]) => idx(at) > idx(id));
  for (const c of CUBOID) {
    const own = `${c.name} ${c.idea} ${c.rule} ${c.slip}`;
    for (const [re] of banned(c.id)) assert.ok(!re.test(own), `${c.id}: 설명에 ${re}`);
  }
  for (const { c, k, s, q } of every()) {
    const all = allText(q).replace(/\[[a-z]+ [^\]]+\]/g, '') + ' ' + q.choices.map((x) => x.tag || '').join(' ');
    for (const [re] of banned(c.id)) assert.ok(!re.test(all), `${c.id} ${k} #${s}: 아직 안 배운 ${re}\n${all}`);
  }
});

/** 참이라고 내미는 글에 틀린 일반화 — 오답 보기·② 보여 준 말은 틀린 말이 맞으니 빼고, 굵게(**)는 떼고 */
const BAD = [
  [/정육면체는 직육면체가 아니/, '정육면체는 직육면체라고 할 수 있다'],
  [/직육면체는 (모두 )?정육면체/, '직육면체가 모두 정육면체는 아니다'],
  [/직육면체는 정육면체가 아니/, '정육면체도 직육면체 — "이 직육면체는"으로'],
  [/1 m³ ?= ?(100|1000|10000) cm³/, '1 m³ = 1000000 cm³'],
  // "십자 모양만 있는 게 아니에요"는 참말 — 하나뿐이라고 단정하는 말만
  [/전개도는 (모두 )?(한 가지(뿐)?(이에요|예요)|십자 모양(뿐|이에요))/, '정육면체의 전개도는 11가지'],
  [/겉넓이(는|=) ?(가로 × 세로 × 높이|세 길이)/, '겉넓이는 여섯 면의 넓이의 합'],
  [/잘라도 겉넓이(는|가)? ?(그대로|같)/, '자르면 겉넓이는 늘어난다'],
  // "마주 보는 면은 만나지 않아요"는 참말 — 만난다·수직이라고 단정하는 말만
  [/마주 보는 (두 )?면(은|이|끼리)? ?(서로 )?(수직이|만나요|만나는)/, '마주 보는 면은 평행'],
];
test('★ 참말에 틀린 일반화가 없다 — 정육면체 ⊂ 직육면체 · 1 m³ = 1000000 cm³ · 전개도 11가지 · 잘라도 부피만 그대로', () => {
  const truths = (q) => [q.choices.find((x) => x.ok).text, ...(q.solve ? [...q.solve.steps, ...Object.values(q.solve.why), q.solve.whyAny, q.solve.rule] : [])].join('\n').replace(/\*\*/g, '');
  for (const { c, k, s, q } of every(['calc', 'misread'], 200)) {
    const t = truths(q);
    for (const [re, why] of BAD) assert.ok(!re.test(t), `${c.id} ${k} #${s}: ${why}\n${t.match(new RegExp(`.*${re.source}.*`))?.[0]}`);
    if (k === 'calc') for (const [re, why] of BAD) assert.ok(!re.test(q.q.replace(/\*\*/g, '')), `${c.id} #${s}: 문제 글에 ${why}`);
  }
  for (const c of CUBOID) for (const [re, why] of BAD) assert.ok(!re.test([c.idea, c.rule, c.slip].join('\n').replace(/\*\*/g, '')), `${c.id}: ${why}`);
});

test('★ 그림과 글이 같은 길이를 말한다 · 정답은 그림 이름표에 없다', () => {
  for (const { c, k, s, q } of every(['calc', 'misread'], 200)) {
    const tm = /가로 (\d+) (cm|m), 세로 (\d+) cm, 높이 (\d+) cm/.exec(q.q);
    for (const f of figsOf(q.q).filter((x) => x.kind === 'cuboid')) {
      const cb = cubOf(f.arg);
      if (tm && figsOf(q.q).length === 1) assert.deepEqual(cb.len.map((l) => l.raw), [tm[1], tm[3], tm[4]], `${c.id} ${k} #${s}: 글과 그림의 길이\n${q.q}`);
      const cm = /한 모서리가 (\d+) cm인 정육면체/.exec(q.q);
      if (cm) assert.ok(cb.len.every((l) => l.raw === cm[1]), `${c.id} ${k} #${s}: 한 모서리`);
    }
    // 길이를 묻는 문제만 (개수·넓이·부피는 그림의 길이 이름표와 견줄 수 없다). ?로 표시한 선분은 다른 선분의 길이를 옮겨 오는 문제라 뺀다
    if (k === 'calc' && /몇 (cm|m)일까요/.test(lastLine(q.q)) && !/\?로 표시한 선분/.test(q.q)) {
      const ok = q.choices.find((x) => x.ok).text;
      if (valueOf(ok) === null) continue;
      const svg = (q.q.match(/\[[a-z]+ [^\]]+\]/g) || []).map((f) => figureSvg(f.slice(1, -1))).join('');
      const labels = [...svg.matchAll(/class="(?:cub|net)-lab[^"]*"[^>]*>([^<]+)</g)].map((z) => z[1]);
      // 글에 이미 있는 길이는 괜찮다 — 글에 없는 답이 그림에만 적혀 있으면 안 된다
      if (!new RegExp(`(^|\\D)${ok.replace('.', '\\.')} ?(cm|m)`).test(q.q.replace(/\[[a-z]+ [^\]]+\]/g, ''))) {
        assert.ok(!labels.some((t) => t === `${ok} cm` || t === `${ok} m`), `${c.id} #${s}: 정답 ${ok}이 그림 이름표에\n${q.q}`);
      }
    }
  }
});

// ── 그림 ──

/** 그린 SVG의 글자 상자 (가운데 정렬, 글꼴 크기는 그림에서 읽는다) */
function labelBoxes(svg) {
  return [...svg.matchAll(/<text class="([^"]+)" x="(-?[\d.]+)" y="(-?[\d.]+)" font-size="(\d+)"[^>]*>([^<]+)<\/text>/g)].map((z) => {
    const fs = +z[4]; const t = z[5]; const w = ([...t].reduce((a, ch) => a + (/[ㄱ-ㅎ가-힣㉮-㉳]/.test(ch) ? 15 : 8.2), 0) * fs) / 15;
    return { cls: z[1], t, cx: +z[2], cy: +z[3] - fs * 0.28, x0: +z[2] - w / 2, x1: +z[2] + w / 2, y0: +z[3] - fs * 0.78, y1: +z[3] + fs * 0.22, raw: z[0] };
  });
}
const linesOf = (svg, cls) => [...svg.matchAll(new RegExp(`<line class="${cls}"([^>]*)/>`, 'g'))].map((z) => {
  const a = (k) => (new RegExp(`${k}="([^"]*)"`).exec(z[1]) || [])[1];
  return { attr: a, x1: +a('x1'), y1: +a('y1'), x2: +a('x2'), y2: +a('y2'), dashed: !!a('stroke-dasharray') };
});
/** 선분이 상자를 지나가나 (상자는 1px 줄여서) */
function crosses(l, b) {
  const x0 = b.x0 + 1; const x1 = b.x1 - 1; const y0 = b.y0 + 1; const y1 = b.y1 - 1;
  const inside = (x, y) => x > x0 && x < x1 && y > y0 && y < y1;
  if (inside(l.x1, l.y1) || inside(l.x2, l.y2)) return true;
  const seg = (ax, ay, bx, by, cx, cy, dx, dy) => {
    const d = (bx - ax) * (dy - cy) - (by - ay) * (dx - cx);
    if (Math.abs(d) < 1e-9) return false;
    const t = ((cx - ax) * (dy - cy) - (cy - ay) * (dx - cx)) / d; const u = ((cx - ax) * (by - ay) - (cy - ay) * (bx - ax)) / d;
    return t >= 0 && t <= 1 && u >= 0 && u <= 1;
  };
  return [[x0, y0, x1, y0], [x1, y0, x1, y1], [x1, y1, x0, y1], [x0, y1, x0, y0]].some(([a, b2, c2, d]) => seg(l.x1, l.y1, l.x2, l.y2, a, b2, c2, d));
}
function checkLabels(svg, at, lines) {
  const [W, H] = /viewBox="0 0 (\d+(?:\.\d+)?) (\d+(?:\.\d+)?)"/.exec(svg).slice(1).map(Number);
  at(W <= 420 && H <= 400, `그림 크기 ${W}×${H}`);
  const boxes = labelBoxes(svg);
  for (let i = 0; i < boxes.length; i++) {
    const a = boxes[i];
    at(a.x0 >= 0 && a.y0 >= 0 && a.x1 <= W && a.y1 <= H, `이름표 "${a.t}"가 그림 밖`);
    for (let j = i + 1; j < boxes.length; j++) { const b = boxes[j]; at(!(a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1), `이름표 "${a.t}"·"${b.t}" 겹침`); }
    for (const l of lines) at(!crosses(l, a), `이름표 "${a.t}"를 선이 지나간다`);
  }
  return boxes;
}

test('🎨 [cuboid] 겨냥도: 그린 SVG가 평행 투영 — 평행한 모서리는 평행, 길이 비율이 실제와 같다 · 점선 = 숨은 꼭짓점의 세 모서리 · 이름표', () => {
  let n = 0; const seen = new Set(); const kinds = new Set();
  let ref = null; // 안쪽 모서리의 줄임 비율 — 그림마다 같아야 한다
  for (const { c, k, s, q } of every(['calc', 'misread'], 150)) {
    for (const d of q.q.match(/\[cuboid [^\]]+\]/g) || []) {
      if (seen.has(d)) continue; seen.add(d);
      const arg = d.slice(8, -1); const cb = cubOf(arg); const svg = figureSvg(`cuboid ${arg}`);
      const at = (cond, msg) => assert.ok(cond, `${c.id} ${k} #${s} ${d}: ${msg}`);
      for (const o of ['names', 'cubes', 'shade', 'miss']) if (arg.includes(o)) kinds.add(o);
      // 꼭짓점 자리 — 약속한 (가로, 세로, 높이)로 다시 계산되나
      const P = Object.fromEntries([...svg.matchAll(/class="cub-v" data-v="([^"]+)" cx="([\d.]+)" cy="([\d.]+)"/g)].map((z) => [z[1], [+z[2], +z[3]]]));
      at(Object.keys(P).length === 8, '꼭짓점 8');
      const [A, B, C] = cb.cm;
      const ex = [(P['ㅅ'][0] - P['ㅇ'][0]) / A, (P['ㅅ'][1] - P['ㅇ'][1]) / A];
      const ez = [(P['ㄹ'][0] - P['ㅇ'][0]) / C, (P['ㄹ'][1] - P['ㅇ'][1]) / C];
      const ey = [(P['ㅁ'][0] - P['ㅇ'][0]) / B, (P['ㅁ'][1] - P['ㅇ'][1]) / B];
      at(Math.abs(ex[1]) < 0.05 && ex[0] > 0, '가로는 오른쪽으로 수평');
      at(Math.abs(ez[0]) < 0.05 && Math.abs(-ez[1] - ex[0]) < 0.05, '높이는 위로 수직, 가로와 같은 축척');
      at(Math.abs(ey[0] + ey[1]) < 0.05 && ey[0] > 0, '안쪽은 오른쪽 위 45°');
      const kk = Math.hypot(...ey) / ex[0];
      if (ref === null) ref = kk;
      at(Math.abs(kk - ref) < 0.01 && kk > 0.3 && kk < 0.8, `안쪽 줄임 비율 ${kk.toFixed(3)}`);
      for (const v of VN) {
        const [x, y, z] = VT[v];
        const want = [P['ㅇ'][0] + x * A * ex[0] + y * B * ey[0], P['ㅇ'][1] - z * C * ex[0] + y * B * ey[1]];
        at(Math.hypot(want[0] - P[v][0], want[1] - P[v][1]) < 0.3, `꼭짓점 ${v} 자리`);
      }
      // 모서리 — 약속한 열두 모서리(빠진 것 빼고), 양 끝이 그 꼭짓점, 점선은 숨은 꼭짓점의 세 모서리
      const E = linesOf(svg, 'cub-e');
      // 쌓기나무는 꽉 찬 덩어리 — 숨은 모서리 셋을 그리지 않는다 (교과서처럼 · 점선이 칸 줄 옆에 겹쳐 두 줄로 보였다, O 3단계 헤드리스)
      const hidN = cb.cubes ? T_EDGES.length - visibleE.length : 0;
      at(E.length === 12 - cb.miss.length - hidN, `모서리 ${E.length}`);
      if (cb.cubes) at(E.every((l) => !l.dashed && !l.attr('data-e').includes(HIDDEN)), '쌓기나무 그림에 숨은 모서리 점선');
      for (const l of E) {
        const e = l.attr('data-e');
        at(T_EDGES.some((t) => sameSet(t, e)), `없는 모서리 ${e}`);
        const ends = [[l.x1, l.y1], [l.x2, l.y2]];
        at([...e].every((v) => ends.some(([x, y]) => Math.hypot(x - P[v][0], y - P[v][1]) < 0.2)), `모서리 ${e}의 양 끝`);
        at(l.dashed === e.includes(HIDDEN) && (l.attr('data-hid') === '1') === e.includes(HIDDEN), `모서리 ${e} 점선`);
      }
      if (!cb.miss.length && !cb.cubes) at(E.filter((l) => l.dashed).length === 12 - visibleE.length, '점선 3개');
      // 색칠한 면 · 쌓기나무 줄
      if (cb.shade >= 0) { const sh = /class="cub-f shade" data-f="([^"]+)"/.exec(svg); at(sh && sameSet([...sh[1]], T_SHADE[cb.shade].set), '색칠한 면'); }
      if (cb.cubes) at(linesOf(svg, 'cub-grid').length === 2 * (A - 1) + 2 * (B - 1) + 2 * (C - 1), '쌓기나무 줄 수');
      // 이름표 — 길이는 그 모서리 옆, 이름은 그 꼭짓점 옆, 서로·선과 안 겹침
      const boxes = checkLabels(svg, at, E);
      const lens = boxes.filter((b) => b.cls.includes('cub-len'));
      at(lens.length === cb.len.filter((l) => l.show !== '_').length, '길이 이름표 수');
      for (const b of lens) {
        const kk2 = /data-k="([abc])"/.exec(b.raw)[1]; const i = 'abc'.indexOf(kk2); const l = cb.len[i];
        at(b.t === (l.show === '?' ? `? ${l.unit}` : `${l.raw} ${l.unit}`), `${kk2} 이름표 "${b.t}"`);
        const near = E.map((e) => ({ e: e.attr('data-e'), dd: Math.hypot((e.x1 + e.x2) / 2 - b.cx, (e.y1 + e.y2) / 2 - b.cy) })).sort((x, y) => x.dd - y.dd)[0];
        at(sameSet(near.e, LABEL_EDGE[i]) || cb.miss.length, `${kk2} 이름표가 ${LABEL_EDGE[i]} 옆이 아니라 ${near.e} 옆`);
      }
      if (cb.names) {
        const names = boxes.filter((b) => b.cls.includes('cub-name'));
        at(names.length === 8, '이름 8개');
        for (const b of names) {
          const near = VN.map((v) => ({ v, dd: Math.hypot(P[v][0] - b.cx, P[v][1] - b.cy) })).sort((x, y) => x.dd - y.dd)[0];
          at(near.v === b.t && near.dd < 30, `이름 ${b.t}이 그 꼭짓점 옆이 아니다 (${near.v})`);
        }
      }
      at(/^\((직육면체|정육면체) 그림/.test(figText(d)), `글로 "${figText(d)}"`);
      if (cb.cubes) at(figText(d).includes(`가로 ${A}개 · 세로 ${B}개 · ${C}층`), `쌓기나무 개수가 글에 (📊 아빠 화면) "${figText(d)}"`);
      at(figText(d, true) === '(그림)', '한 줄 요약은 (그림) — 아이에게 보이는 자리라 개수·길이를 흘리지 않는다');
      n++;
    }
  }
  assert.ok(n > 300, `그린 그림 ${n}`);
  assert.deepEqual([...kinds].sort(), ['cubes', 'miss', 'names', 'shade']);
  assert.ok(renderFigures('글 [cuboid 5 3 4] 글').includes('cub-fig'));
  for (const bad of ['cuboid', 'cuboid 5 3', 'cuboid 5 3 0', 'cuboid 30 1 1', 'cuboid 5 3 4 shade=3', 'cuboid 5 3 4 miss=12', 'cuboid 5 3 4 miss=1,1', 'cuboid 9 3 4 cubes', 'cuboid 5 3 4 names names', 'cuboid 5 3 4 zz', 'cuboid 5m 3 4 cubes']) assert.equal(figureSvg(bad), '', bad);
});

test('🎨 [net] 전개도: 그린 칸·선분·이름이 따로 굴려 접은 것과 같다 · 접는 선은 점선 · 이름표 겹침 없음', () => {
  let n = 0; const seen = new Set(); let lab = 0; let names = 0;
  for (const { c, k, s, q } of every(['calc', 'misread'], 150)) {
    for (const d of q.q.match(/\[net [^\]]+\]/g) || []) {
      if (seen.has(d)) continue; seen.add(d);
      const arg = d.slice(5, -1); const N = foldNet(arg); const svg = figureSvg(`net ${arg}`);
      const at = (cond, msg) => assert.ok(cond, `${c.id} ${k} #${s} ${d}: ${msg}`);
      const u = +/data-u="([\d.]+)"/.exec(svg)[1]; const pad = +/data-pad="(\d+)"/.exec(svg)[1];
      const toM = (v) => (v - pad) / u;
      // 칸 — 자리와 크기
      for (const z of svg.matchAll(/class="net-c" data-d="(\d)" x="([\d.]+)" y="([\d.]+)" width="([\d.]+)" height="([\d.]+)"/g)) {
        const cell = N.cellOf(+z[1]);
        at(Math.abs(toM(+z[2]) - cell.x) < 0.01 && Math.abs(toM(+z[3]) - cell.y) < 0.01, `칸 ${z[1]} 자리`);
        at(Math.abs(+z[4] / u - cell.w) < 0.01 && Math.abs(+z[5] / u - cell.h) < 0.01, `칸 ${z[1]} 크기 ${(+z[4] / u).toFixed(2)}×${(+z[5] / u).toFixed(2)} ≠ ${cell.w}×${cell.h}`);
      }
      // 둘레 선분 — 14개, 자리와 이름
      const segs = linesOf(svg, 'net-seg');
      at(segs.length === N.n && N.n === (N.valid ? 14 : N.n), `둘레 선분 ${segs.length}`);
      for (const l of segs) {
        const i = +l.attr('data-i'); const p = N.pts[i]; const qq = N.pts[(i + 1) % N.n];
        at(Math.abs(toM(l.x1) - p[0]) < 0.01 && Math.abs(toM(l.y1) - p[1]) < 0.01 && Math.abs(toM(l.x2) - qq[0]) < 0.01 && Math.abs(toM(l.y2) - qq[1]) < 0.01, `선분 ${i} 자리`);
        if (N.opt.names) at(l.attr('data-a') === N.name(i) && l.attr('data-b') === N.name((i + 1) % N.n), `선분 ${i} 이름`);
        at(!l.dashed, '둘레는 실선');
      }
      // 접는 선 — 붙은 칸마다 하나, 점선
      const folds = linesOf(svg, 'net-fold');
      let pairs = 0; for (const x of N.cells) for (const y of N.cells) if (y.r === x.r && y.c === x.c + 1 || y.c === x.c && y.r === x.r + 1) pairs++;
      at(folds.length === pairs && folds.every((l) => l.dashed), `접는 선 ${folds.length}`);
      // 이름표
      const boxes = checkLabels(svg, at, [...segs, ...folds]);
      for (const b of boxes.filter((x) => x.cls.includes('net-name'))) {
        const i = +/data-i="(\d+)"/.exec(b.raw)[1]; const p = N.pts[i];
        at(b.t === N.name(i) && Math.hypot(pad + p[0] * u - b.cx, pad + p[1] * u - b.cy) < 26, `점 이름 ${b.t}`);
        names++;
      }
      for (const b of boxes.filter((x) => x.cls.includes('net-face'))) {
        const dd = T_FACE.indexOf(b.t) + 1; const cell = N.cellOf(dd);
        at(Math.abs(toM(b.cx) - (cell.x + cell.w / 2)) < 0.2 && Math.abs(toM(b.cy) - (cell.y + cell.h / 2)) < 0.3, `면 이름 ${b.t} 자리`);
      }
      for (const b of boxes.filter((x) => x.cls.includes('net-len'))) {
        const i = +/data-i="(\d+)"/.exec(b.raw)[1];
        at(b.t === (String(i) === N.opt.q ? `? ${N.unit}` : `${N.segLen(i)} ${N.unit}`), `선분 ${i} 길이 이름표 "${b.t}"`);
        lab++;
      }
      if (N.opt.lab) {
        const L = N.opt.lab.split(',').map(Number);
        at(N.dims.every((v) => L.some((i) => N.segLen(i) === v)), '가로·세로·높이 길이가 하나씩 적혀 있다');
      }
      at(/(전개도|정사각형 6개를 이어 붙인 모양)/.test(figText(d)), `글로 "${figText(d)}"`);
      n++;
    }
  }
  assert.ok(n > 200 && lab > 100 && names > 500, `그린 전개도 ${n} · 길이 이름표 ${lab} · 점 이름 ${names}`);
  assert.ok(renderFigures('글 [net .1../2345/.6..] 글').includes('net-fig'));
  for (const bad of ['net', 'net .1../2345/.5..', 'net .1../2345', 'net 5 3 4 X..X/1234', 'net 5 3 4 1..2/3456 r=3', 'net .1../2345/.6.. lab=1', 'net .1../2345/.6.. s=14', 'net .1../2345/.6.. names names', 'net .1../2345/.6.. zz', 'net 5 3 4 .1../2345/.6.. r=3 lab=1,1']) assert.equal(figureSvg(bad), '', bad);
});

test('★ 전개도 11가지 × 점 이름 시작 14자리 전부 — 그리는 쪽 접기(세 축 옮기기)가 따로 굴려 접은 것과 만나는 점·겹치는 선분이 같다 (Codex 24차 제안: 씨앗 없이 다 덮는다)', () => {
  const digits = (pat) => { let k = 0; return pat.replace(/X/g, () => String(++k)); };
  let n = 0;
  for (const pat of _kit.CUBE_NETS) {
    const shape = digits(pat);
    for (let s = 0; s < 14; s++) {
      const arg = `${shape} names s=${s}`;
      const L = parseNet(arg).L; const N = foldNet(arg);
      assert.equal(L.pts.length, N.n, `${arg}: 둘레 점 수`);
      // 이름으로 견준다 (자리 번호 매기는 법이 달라도 되게) — 이름 → 같은 꼭짓점에 오는 이름들
      const meet = (vOf, name) => T_PT.slice(0, N.n).filter((b) => vOf(b) === vOf(name)).join('');
      const drawV = (nm) => L.pts[(T_PT.indexOf(nm) + s) % N.n].v;
      const rollV = (nm) => N.vOf(N.idx(nm));
      for (const nm of T_PT.slice(0, N.n)) assert.equal(meet(drawV, nm), meet(rollV, nm), `${arg}: 점 ${nm}과 만나는 점`);
      // 선분 — 이름 둘 → 겹치는 선분의 이름 둘
      const segName = (i) => [T_PT[(i - s + N.n) % N.n], T_PT[(i + 1 - s + N.n) % N.n]].join('');
      for (let i = 0; i < N.n; i++) {
        const dj = L.segs.findIndex((g, k) => k !== i && g.e === L.segs[i].e);
        const rj = [...Array(N.n).keys()].find((k) => k !== i && N.segE(k) === N.segE(i));
        assert.equal(segName(dj), segName(rj), `${arg}: 선분 ${segName(i)}과 겹치는 선분`);
      }
      n++;
    }
  }
  assert.equal(n, 11 * 14);
});

test('★ 겹치는 선분 풀이: 두 선분이 함께 쓰는 끝점은 "만난다"고 하지 않는다 · 풀이가 말하는 짝은 정말 접으면 만난다 (Codex 24차 #2: 씨앗 5 "점 ㄱ과 점 ㄱ")', () => {
  let shared = 0; let apart = 0;
  for (let s = 0; s < Math.max(SEEDS, 2000); s++) {
    const q = makeQuestion('cub.net', 'calc', s, OPTS);
    if (!/선분 ㄱㄴ과 겹치는 선분/.test(q.q)) continue;
    const N = foldNet(/\[net ([^\]]+)\]/.exec(q.q)[1]);
    const last = q.solve.steps[q.solve.steps.length - 1];
    assert.ok(!/점 ([ㄱ-ㅎ])[과와] 점 \1(?![ㄱ-ㅎ])/.test(last), `#${s}: 같은 점끼리 만난다고 함 — ${last}`);
    const sh = /점 ([ㄱ-ㅎ])은 두 선분이 함께 쓰는 점이에요\. 접으면 점 ([ㄱ-ㅎ])과 점 ([ㄱ-ㅎ])[이가] 만나요/.exec(last);
    const pairs = sh ? [[sh[2], sh[3]]] : [...last.matchAll(/점 ([ㄱ-ㅎ])[과와] 점 ([ㄱ-ㅎ])/g)].map((m) => [m[1], m[2]]);
    assert.ok(pairs.length >= 1, `#${s}: 짝을 못 읽음 — ${last}`);
    for (const [a, b] of pairs) assert.equal(N.vOf(N.idx(a)), N.vOf(N.idx(b)), `#${s}: 점 ${a}과 점 ${b}은 접어도 안 만난다 — ${last}`);
    if (sh) {
      // 함께 쓰는 점은 ㄱ이나 ㄴ이고, 정답 선분의 끝점이기도 하다
      assert.ok(['ㄱ', 'ㄴ'].includes(sh[1]), `#${s}: ${last}`);
      assert.ok(q.choices.find((x) => x.ok).text.includes(sh[1]), `#${s}: 정답 선분이 점 ${sh[1]}을 안 쓴다`);
      shared++;
    } else apart++;
  }
  assert.ok(shared >= 5 && apart >= 5, `함께 쓰는 점 ${shared} · 떨어진 짝 ${apart} (검사가 빈 채 통과하지 않게)`);
});

test('★ 전개도를 글로: 길이 이름표와 ?가 어느 면의 어느 변인지 — 📊 아빠 화면이 이 글만 본다 (Codex 24차 #3: q=2·q=3이 같은 글이었다)', () => {
  const a = figText('[net 7 3 4 .5../6134/...2 r=1 lab=6,7,11 q=2]'); const b = figText('[net 7 3 4 .5../6134/...2 r=1 lab=6,7,11 q=3]');
  assert.notEqual(a, b);
  let n = 0;
  for (const { c, s, q } of every(['calc'], 300)) {
    for (const m of q.q.matchAll(/\[net ([^\]]+)\]/g)) {
      const N = foldNet(m[1]); if (!N.dims) continue;
      const t = figText(m[0]);
      // 테스트가 따로 놓은 칸으로 그 선분의 자리를 다시 찾는다
      const sideOf = (i) => {
        const p = N.pts[i]; const r = N.pts[(i + 1) % N.n];
        for (const x of N.cells) {
          const inX = (v) => v >= x.x && v <= x.x + x.w; const inY = (v) => v >= x.y && v <= x.y + x.h;
          if (p[1] === r[1] && inX(p[0]) && inX(r[0])) { if (p[1] === x.y) return `면 ${T_FACE[x.d - 1]}의 위쪽 변`; if (p[1] === x.y + x.h) return `면 ${T_FACE[x.d - 1]}의 아래쪽 변`; }
          if (p[0] === r[0] && inY(p[1]) && inY(r[1])) { if (p[0] === x.x) return `면 ${T_FACE[x.d - 1]}의 왼쪽 변`; if (p[0] === x.x + x.w) return `면 ${T_FACE[x.d - 1]}의 오른쪽 변`; }
        }
        return null;
      };
      for (const i of (N.opt.lab ? N.opt.lab.split(',').map(Number) : [])) assert.ok(t.includes(`${sideOf(i)} ${N.segLen(i)} ${N.unit}`), `${c.id} #${s}: 길이 이름표 ${i} — ${t}`);
      if (N.opt.q !== undefined) assert.ok(t.includes(`? 표시 ${sideOf(+N.opt.q)}`), `${c.id} #${s}: ? 자리 — ${t}`);
      n++;
    }
  }
  assert.ok(n >= 50, `직육면체 전개도 글 ${n}`);
});

test('🎨 쌓기나무 둘을 견주는 그림은 같은 축척 — 한 글 안에서 쌓기나무 한 칸의 크기가 같다 (with=, 생성기·원고)', () => {
  const unitOf = (d) => {
    const svg = figureSvg(d.slice(1, -1));
    const P = Object.fromEntries([...svg.matchAll(/class="cub-v" data-v="([^"]+)" cx="([\d.]+)" cy="([\d.]+)"/g)].map((z) => [z[1], [+z[2], +z[3]]]));
    return (P['ㅅ'][0] - P['ㅇ'][0]) / cubOf(d.slice(8, -1)).cm[0];
  };
  const texts = [...every(['calc'])].map((x) => x.q.q);
  for (const id of IDS) for (const p of CONTENT[id].lesson) texts.push(p.say, ...(p.check ? [p.check.q] : []));
  let pairs = 0;
  for (const t of texts) {
    const ds = t.match(/\[cuboid [^\]]*cubes[^\]]*\]/g) || [];
    if (ds.length < 2) continue;
    const u = ds.map(unitOf);
    // SVG 좌표는 소수 첫째 자리로 반올림돼 적힌다 — 한 칸 크기 오차 0.1/개수까지
    assert.ok(u.every((x) => Math.abs(x - u[0]) < 0.06), `쌓기나무 크기가 다르다 ${u.map((x) => x.toFixed(2)).join(' · ')}\n${t}`);
    assert.ok(ds.every((d) => /with=/.test(d)), `견주는 그림에 with= 가 없다\n${t}`);
    // 바깥 폭도 같아야 한다 — 폭이 다르면 좁은 화면에서 CSS max-width가 넓은 그림만 줄인다 (Codex 24차 #1: cub.unit 씨앗 28, 414px·292px → 17% 차이)
    const ws = ds.map((d) => +/viewBox="0 0 (\d+)/.exec(figureSvg(d.slice(1, -1)))[1]);
    assert.ok(ws.every((w) => w === ws[0]), `견주는 그림의 폭이 다르다 ${ws.join(' · ')}\n${t}`);
    pairs++;
  }
  assert.ok(pairs >= 10, `견주는 그림 ${pairs} (검사가 빈 채 통과하지 않게)`);
  // with= 는 축척만 바꾼다 — 쌓기나무가 아닌 그림·말이 안 되는 개수는 안 받는다
  for (const bad of ['cuboid 5 3 4 with=2,2,2', 'cuboid _2 _2 _5 cubes with=9,1,1', 'cuboid _2 _2 _5 cubes with=4,3', 'cuboid _2 _2 _5 cubes with=4,3,2 with=4,3,2']) assert.equal(figureSvg(bad), '', bad);
});

test('🔢 숫자판: 수가 답인 ①만 숫자판 · 단위는 질문 끝에서 (cm³·m³·cm²·cm·개·배) · 모든 수 보기를 칠 수 있다', () => {
  const pv = readFileSync(new URL('../js/padview.js', import.meta.url), 'utf8');
  const MAX = +/const MAX = (\d+);/.exec(pv)[1];
  const units = new Set();
  for (const { c, s, q } of every(['calc'], 200)) {
    const ok = q.choices.find((x) => x.ok).text;
    const spec = padSpec(q, 'cuboid');
    assert.equal(!!spec, valueOf(ok) !== null, `${c.id} #${s}: 정답 "${ok}" 숫자판 ${!!spec}`);
    if (!spec) continue;
    const want = (/몇 (cm³|m³|cm²|m²|cm|m|개|배)/.exec(lastLine(q.q)) || [])[1] || '';
    assert.equal(spec.unit, want, `${c.id} #${s}: 숫자판 단위\n${q.q}`);
    units.add(spec.unit);
    assert.equal(spec.start, 'num', `${c.id} #${s}: 처음 칸은 수`);
    for (const ch of q.choices) {
      if (valueOf(ch.text) === null) continue;
      assert.ok(String(ch.text).length <= MAX, `${c.id} #${s}: "${ch.text}"는 ${String(ch.text).length}글자 > ${MAX}`);
      const hit = matchTyped(q, readTyped('num', { x: String(ch.text) }, spec), spec);
      assert.equal(q.choices[hit.i], ch, `${c.id} #${s}: "${ch.text}"를 쳐도 그 보기로 안 간다`);
    }
  }
  assert.deepEqual([...units].sort(), ['cm', 'cm²', 'cm³', 'm³', '개'].sort());
});

test('📏 진단·사다리·한 편·배움 예비·내용 검사', () => {
  const d = diagnosticSet(7, 5, OPTS);
  assert.equal(d.length, 5);
  assert.deepEqual(d.map((q) => q.concept), ['cub.parts', 'cub.faces', 'cub.surface', 'cub.volume', 'cub.apply']);
  assert.deepEqual(placeFrom(d.map((q, i) => ({ concept: q.concept, correct: i < 2 }))), { startId: 'cub.surface', knownIds: ['cub.parts', 'cub.sketch', 'cub.faces', 'cub.net'] });
  const L0 = ladder([]);
  assert.equal(L0[0].state, 'now');
  assert.ok(L0.slice(1).every((r) => r.state === 'locked'));
  for (const c of CUBOID) {
    const round = makeRound(c.id, 11, OPTS);
    assert.ok(round.length >= 2 && round.every((q) => q.concept === c.id), c.id);
    const les = lessonOf(c.id, 3, OPTS);
    assert.ok(les.pages.length >= 1 && les.title === c.name);
  }
  assert.ok(checkContent({}).length >= 9, '빈 원고는 칸마다 걸린다');
});

test('★ 틀린 방법이 우연히 맞는 수는 안 나온다 — 정육면체 한 모서리 4·6(겉넓이) · 3·6(부피) · 6(겉넓이 → 부피) · 쌓기나무 한 층 2 × 2', () => {
  for (let s = 1; s <= 3000; s++) {
    const q5 = makeQuestion('cub.surface', 'calc', s, OPTS);
    const m5 = /한 모서리가 (\d+) cm인 정육면체/.exec(q5.q);
    if (m5) assert.ok(![4, 6].includes(+m5[1]), `겉넓이 #${s}: 한 모서리 ${m5[1]}`);
    const q7 = makeQuestion('cub.volume', 'calc', s, OPTS);
    const m7 = /한 모서리가 (\d+) cm인 정육면체/.exec(q7.q);
    if (m7) assert.ok(![3, 6].includes(+m7[1]), `부피 #${s}: 한 모서리 ${m7[1]}`);
    const q9 = makeQuestion('cub.apply', 'calc', s, OPTS);
    const m9 = /겉넓이가 (\d+) cm²인 정육면체/.exec(q9.q);
    if (m9) assert.notEqual(+m9[1], 216, `활용 #${s}`);
    const q6 = makeQuestion('cub.unit', 'calc', s, OPTS);
    const m6 = /한 층에 가로 (\d+)개, 세로 (\d+)개/.exec(q6.q);
    if (m6) assert.ok(!(m6[1] === '2' && m6[2] === '2'), `쌓기나무 #${s}`);
  }
});

// ───────────────────── 2단계: 원고 coach/math/cuboid.json ─────────────────────

const CONTENT = JSON.parse(readFileSync(new URL('../coach/math/cuboid.json', import.meta.url), 'utf8'));
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
/** 참이라고 내미는 글만 — 확인 질문의 오답·아이가 하는 틀린 말(함정 kid)은 뺀다 */
function contentTruths(v) {
  const parts = [];
  for (const p of v.lesson) { parts.push(p.say); if (p.check) parts.push(p.check.q, p.check.ok, p.check.why); }
  parts.push(v.rule, v.dad.goal, ...v.dad.say, v.dad.do, v.dad.pass, ...v.dad.traps.map((t) => t.dad));
  return parts.map(fillC).join('\n').replace(/\*\*/g, '');
}
const stripU = (t) => String(t).replace(/ ?(cm³|m³|cm²|cm|m|개)$/, '');

test('원고(cuboid.json)가 형식 검사를 통과한다 — 9칸 모두 배움 3~5장·확인 질문 3개↑·아빠 카드(함정·통과 기준)', () => {
  assert.deepEqual(checkContent(CONTENT), []);
  for (const id of IDS) {
    const v = CONTENT[id];
    assert.ok(v.lesson.length >= 3 && v.lesson.length <= 5, `${id}: ${v.lesson.length}장`);
    assert.ok(v.lesson.filter((p) => p.check).length >= 3, `${id}: 확인 질문 ${v.lesson.filter((p) => p.check).length}개`);
    assert.ok(v.dad.traps.length >= 2 && v.dad.say.length >= 2, id);
    const les = lessonOf(id, 1, { ...OPTS, content: CONTENT });
    assert.equal(les.pages.length, v.lesson.length);
    assert.ok(!/\{(me|mon)/.test(les.pages.map((p) => p.say).join('')), `${id}: 자리표시가 남음`);
  }
});

test('★ 원고 확인 질문도 따로 풀어 대조 — 전부 읽히고, 정답은 맞고, 오답 하나하나가 이름표 있는 틀린 생각이다', () => {
  let solved = 0;
  for (const id of IDS) {
    for (const [i, p] of CONTENT[id].lesson.entries()) {
      if (!p.check) continue;
      const q = fillC(p.check.q); const ok = fillC(p.check.ok); const no = p.check.no.map(fillC);
      const where = `${id}[${i}]: ${q}`;
      const { type, ans, f } = solveText(q);
      // 수 답은 단위를 떼고("12개" → 12), 문장 답("실선 2개, 점선 1개")은 그대로
      const same = (t) => canon(t) === canon(ans) || canon(stripU(t)) === canon(ans);
      assert.ok(same(ok), `${where} (${type}): 정답 "${ok}" ≠ 따로 푼 답 "${ans}"`);
      for (const n of no) {
        assert.ok(!same(n), `${where}: 오답 "${n}"이 맞는 답`);
        // 오답이 어느 틀린 생각인지 — 그 문제 종류의 이름표 하나의 뜻에 맞아야 한다 (아무 수나 쓰지 않았다)
        const tags = Object.keys(TAGV[type] || {});
        assert.ok(tags.some((tag) => tagHolds(type, tag, f, stripU(n)) || tagHolds(type, tag, f, n)), `${where}: 오답 "${n}"은 어느 틀린 생각인가 (${type})`);
      }
      solved++;
    }
  }
  assert.equal(solved, IDS.reduce((a, id) => a + CONTENT[id].lesson.filter((p) => p.check).length, 0));
  assert.ok(solved >= 30, `따로 푼 확인 질문 ${solved}`);
});

const FACE_WORD = { '윗면': [2, 1], '아랫면': [2, 0], '앞면': [1, 0], '뒷면': [1, 1], '왼쪽 면': [0, 0], '오른쪽 면': [0, 1] };
test('★ 원고의 그림: 모두 그려지고, 배움 글·확인 질문이 말하는 것 = 그 장의 그림 (면 이름·빠진 모서리·쌓기나무 수·만나는 점·겹치는 선분·마주 보는 면)', () => {
  let n = 0; let claims = 0;
  for (const id of IDS) {
    for (const [i, p] of CONTENT[id].lesson.entries()) {
      for (const [where, raw] of [['say', p.say], ['check', p.check ? p.check.q : '']]) {
        const figs = raw.match(/\[[a-z]+ [^\]]+\]/g) || [];
        const text = fillC(raw.replace(/\[[a-z]+ [^\]]+\]/g, '')).replace(/\*\*/g, '');
        const at = (cond, msg) => assert.ok(cond, `${id}[${i}] ${where}: ${msg}\n${text}`);
        for (const d of figs) {
          assert.ok(figureSvg(d.slice(1, -1)), `${id}[${i}] ${where}: 못 그리는 ${d}`);
          assert.ok(/^\[(cuboid|net) /.test(d), `${id}[${i}]: [cuboid]·[net]만 쓴다 ${d}`);
          n++;
        }
        // 이름표로 보이는 길이는 글에도 있다 (그림에만 있는 수가 없게)
        for (const d of figs.filter((x) => x.startsWith('[cuboid'))) {
          const cb = cubOf(d.slice(8, -1));
          // (배움 글만 — 확인 질문은 생성기 문제처럼 그림이 길이를 알려 준다)
          if (where === 'say') for (const l of cb.len) if (l.show === '') at(text.includes(`${l.raw} ${l.unit}`), `글에 "${l.raw} ${l.unit}"이 없다 (${d})`);
          // 빠진 모서리 — "실선 x개와 점선 y개가 빠졌"
          const mm = /실선 (\d+)개와 점선 (\d+)개가 빠졌/.exec(text);
          if (mm && cb.miss.length) {
            const svg = figureSvg(d.slice(1, -1));
            const drawn = [...svg.matchAll(/class="cub-e" data-i="\d+" data-e="([^"]+)"/g)].map((z) => z[1]);
            const gone = T_EDGES.filter((e) => !drawn.some((x) => sameSet(x, e)));
            at(+mm[1] === gone.filter((e) => !e.includes(HIDDEN)).length && +mm[2] === gone.filter((e) => e.includes(HIDDEN)).length, `빠진 실선·점선 수 ${mm[0]}`);
            claims++;
          }
          // 쌓기나무 — 보이는 개수·한 층·층 수
          if (cb.cubes) {
            const vis = /보이는 쌓기나무는 (\d+)개/.exec(text);
            if (vis) { at(+vis[1] === visibleCubes(cb.cm), `보이는 쌓기나무 ${vis[1]} ≠ ${visibleCubes(cb.cm)}`); claims++; }
            const lay = /한 층에 가로 (\d+)개 × 세로 (\d+)개 = (\d+)개, (\d+)층/.exec(text);
            if (lay) { at(+lay[1] === cb.cm[0] && +lay[2] === cb.cm[1] && +lay[4] === cb.cm[2], `쌓기나무 가로·세로·층 ${lay[0]}`); claims++; }
          }
          // 색칠한 면 · "윗면 ㄱㄴㄷㄹ"처럼 부른 면 — 이 파일의 꼭짓점 표로
          for (const z of text.matchAll(/(윗면|아랫면|앞면|뒷면|왼쪽 면|오른쪽 면) ([ㄱ-ㅎ]{4})/g)) {
            const [ax, v] = FACE_WORD[z[1]]; const face = T_FACES.find((g) => g.ax === ax && g.v === v);
            at(sameSet([...z[2]], face.set) && goodFaceName(z[2]), `${z[1]} ${z[2]}`);
            claims++;
          }
          for (const z of text.matchAll(/색칠한 (윗면|앞면|오른쪽 면) ([ㄱ-ㅎ]{4})/g)) { at(cb.shade >= 0 && sameSet([...z[2]], T_SHADE[cb.shade].set), `색칠한 면 ${z[2]}`); claims++; }
          for (const z of text.matchAll(/면 ([ㄱ-ㅎ]{4})[과와] 평행한 면은 (?:아랫면 |마주 보는 면 )?([ㄱ-ㅎ]{4})/g)) { at(sameSet([...z[2]], oppFace(faceByName(z[1])).set), `평행한 면 ${z[0]}`); claims++; }
        }
        // 전개도 — 따로 굴려 접어 글의 말을 확인
        for (const d of figs.filter((x) => x.startsWith('[net'))) {
          const N = foldNet(d.slice(5, -1));
          if (N.opt.lab && where === 'say') for (const k of N.opt.lab.split(',').map(Number)) at(text.includes(`${N.segLen(k)} ${N.unit}`), `글에 "${N.segLen(k)} ${N.unit}"이 없다 (${d})`);
          const fd = (ch) => T_FACE.indexOf(ch) + 1;
          for (const z of text.matchAll(/([㉮-㉳])와 ([㉮-㉳])가 마주 봐요/g)) { at(N.opp(fd(z[1])) === fd(z[2]), `마주 보는 면 ${z[0]}`); claims++; }
          for (const z of text.matchAll(/([㉮-㉳])와 ([㉮-㉳])는 접으면 만나요/g)) { at(z[1] !== z[2] && N.opp(fd(z[1])) !== fd(z[2]), `만나는 면 ${z[0]}`); claims++; }
          for (const z of text.matchAll(/((?:점 [ㄱ-ㅎ], )+점 [ㄱ-ㅎ])[이가] 접으면 한 꼭짓점에서 만나요/g)) {
            const vs = ptsOf(z[1]).map((nm) => N.vOf(N.idx(nm)));
            at(new Set(vs).size === 1 && vs.length === [...Array(N.n).keys()].filter((j) => N.vOf(j) === vs[0]).length, `만나는 점 ${z[0]}`);
            claims++;
          }
          // 두 점 짝 — "점 ㄴ과 점 ㄹ이 만나요" · "점 ㄱ은 점 ㅁ과, 점 ㄴ은 점 ㄹ과 만나니까" (Codex 24차 #4: 끝점을 하나씩 따라가는 글 — 처음엔 이 꼴을 못 읽어 틀린 짝이 지나갔다)
          for (const z of text.matchAll(/점 ([ㄱ-ㅎ])[과와] 점 ([ㄱ-ㅎ])[이가] 만나/g)) { at(z[1] !== z[2] && N.vOf(N.idx(z[1])) === N.vOf(N.idx(z[2])), `만나는 두 점 ${z[0]}`); claims++; }
          for (const z of text.matchAll(/점 ([ㄱ-ㅎ])[은는] 점 ([ㄱ-ㅎ])[과와][,\s]/g)) { at(z[1] !== z[2] && N.vOf(N.idx(z[1])) === N.vOf(N.idx(z[2])), `만나는 두 점 ${z[0]}`); claims++; }
          for (const z of text.matchAll(/선분 ([ㄱ-ㅎ]{2})[과와] 선분 ([ㄱ-ㅎ]{2})[이가] 겹쳐요/g)) {
            const segI = (nm) => [...Array(N.n).keys()].find((j) => sameSet([N.name(j), N.name((j + 1) % N.n)], [...nm]));
            at(N.segE(segI(z[1])) === N.segE(segI(z[2])), `겹치는 선분 ${z[0]}`);
            claims++;
          }
          if (/겹쳐서 둘 다 (\d+) cm/.test(text)) { const L4 = +/겹쳐서 둘 다 (\d+) cm/.exec(text)[1]; at(N.dims.includes(L4), `겹친 선분 길이 ${L4}`); claims++; }
          if (/위로 붙은 두 면이 같은 자리/.test(text)) { at(!N.valid, '겹친다고 말한 모양이 접힌다'); claims++; }
        }
      }
    }
  }
  assert.ok(n >= 35, `그림 ${n}`);
  assert.ok(claims >= 20, `글이 말한 것을 그림과 대조한 곳 ${claims} (검사가 빈 채 통과하지 않게)`);
});

test('★ 원고의 조사·셈식·아직 안 배운 말·틀린 일반화 (배움 글·확인 질문·아빠 카드 전부)', () => {
  const BAT = new Set(['0', '1', '3', '6', '7', '8']);
  const PAIRS = [['을', '를'], ['은', '는'], ['이', '가'], ['과', '와'], ['이에요', '예요'], ['이니까', '니까'], ['이라서', '라서']];
  const ev = (expr) => Function(`return (${expr.replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-')})`)();
  let exprs = 0; let hitN = 0; let hitJ = 0; let hitC = 0;
  for (const id of IDS) {
    const all = contentText(CONTENT[id]).replace(/\[[a-z]+ [^\]]+\]/g, '');
    for (const [wb, nb] of PAIRS) {
      // 템플릿 글자 안이라 \\d · \\s (N 2단계에서 \d 한 번만 써서 검사가 빈 채 통과한 적 있다)
      for (const m of all.matchAll(new RegExp(`(\\d)(${wb}|${nb})(?=[\\s.,!?)—]|$)`, 'g'))) { assert.equal(m[2], BAT.has(m[1]) ? wb : nb, `${id}: "…${m[1]}${m[2]}"`); hitN++; }
      for (const m of all.matchAll(new RegExp(`([ㄱ-ㅎ])(${wb}|${nb})(?=[\\s.,!?)—]|$)`, 'g'))) { assert.equal(m[2], wb, `${id}: "…${m[1]}${m[2]}"`); hitJ++; }
      for (const m of all.matchAll(new RegExp(`([㉮-㉳])(${wb}|${nb})(?=[\\s.,!?)—]|$)`, 'g'))) { assert.equal(m[2], nb, `${id}: "…${m[1]}${m[2]}"`); hitC++; }
    }
    for (const m of all.matchAll(/(\d)(으로|로)(?=[\s.,]|$)/g)) assert.equal(m[2], ['1', '7', '8'].includes(m[1]) ? '로' : BAT.has(m[1]) ? '으로' : '로', `${id}: "…${m[1]}${m[2]}"`);
    assert.ok(!/(cm|m|cm²|m²|cm³|m³)(은|을|이 |과|이에요|으로)/.test(all), `${id}: 단위 뒤 조사`);
    for (const m of all.matchAll(/(?<![\d.□])(\d+(?:\.\d+)?(?: [+−×÷] \d+(?:\.\d+)?)+) = (\d+(?:\.\d+)?)/g)) { assert.ok(Math.abs(ev(m[1]) - Number(m[2])) < 1e-6, `${id}: ${m[0]}`); exprs++; }
    const at = IDS.indexOf(id);
    for (const [re, first] of FIRST) if (IDS.indexOf(first) > at) assert.ok(!re.test(all), `${id}: 아직 안 배운 ${re}\n${all.match(new RegExp(`.*${re.source}.*`))?.[0]}`);
    const truths = contentTruths(CONTENT[id]);
    for (const [re, why] of BAD) assert.ok(!re.test(truths), `${id}: ${why}\n${truths.match(new RegExp(`.*${re.source}.*`))?.[0]}`);
  }
  assert.ok(exprs >= 60, `원고 속 셈식 ${exprs}`);
  assert.ok(hitN >= 15 && hitJ >= 15 && hitC >= 5, `조사를 실제로 본 곳: 수 ${hitN} · 자모 ${hitJ} · ㉮ ${hitC} (검사가 빈 채 통과하지 않게)`);
});

// ───────────────────── 3단계: 화면 연결 ─────────────────────

test('화면 연결 (3단계): STEMS.cuboid(O)는 이 생성기·원고를 쓰고, 앱 셸이 둘 다 들고 간다 · ❓ 복사문·📊 답장 안내에 [cuboid] 예 · 사다리 안내에 I 둘레와 넓이 줄기', async () => {
  const { STEMS, STEM_ORDER, stemOf } = await import('../js/mathprog.js');
  assert.equal(STEMS.cuboid.code, 'O');
  assert.equal(STEM_ORDER[STEM_ORDER.indexOf('circle') + 1], 'cuboid', 'N 원의 넓이 바로 뒤');
  assert.equal(STEMS.cuboid.list, CUBOID);
  assert.equal(STEMS.cuboid.gen.makeQuestion, makeQuestion);
  assert.equal(STEMS.cuboid.gen.lessonOf, lessonOf, '📚 배움은 이 생성기의 lessonOf');
  assert.ok(IDS.every((id) => stemOf(id) === STEMS.cuboid), '모든 칸이 O 줄기로 찾아진다');
  assert.match(STEMS.cuboid.pick, /I 둘레와 넓이 줄기/);
  const sw = readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
  for (const f of ['./js/mathcuboid.js', './coach/math/cuboid.json']) assert.ok(sw.includes(`'${f}'`), `APP_SHELL에 ${f}`);
  const ask = readFileSync(new URL('../js/mathask.js', import.meta.url), 'utf8');
  const stats = readFileSync(new URL('../js/stats.js', import.meta.url), 'utf8');
  for (const src of [ask, stats]) for (const ex of src.match(/\[cuboid [^\]]+\]/g) || ['없음']) assert.ok(figureSvg(ex.slice(1, -1)), `예시가 그려지지 않음: ${ex}`);
  assert.ok(ask.includes('[cuboid 5 3 4]') && stats.includes('[cuboid 5 3 4]'), '❓ 복사문·📊 답장 안내에 [cuboid] 예');
});
