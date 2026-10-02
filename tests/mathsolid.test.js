// 🔷 P 입체도형 줄기 생성기 테스트: node --test tests/mathsolid.test.js
//
// ★ 핵심은 **독립 검산** — 생성기가 알려 주는 값(probe)을 믿지 않고 **문제 글과 그림 지시문을 이 파일이 직접 읽어** 다시 푼다.
//   · 면·꼭짓점·모서리는 교과서 규칙(각기둥 □+2·□×2·□×3 / 각뿔 □+1·□+1·□×2)을 이 파일이 따로 쓰고, 그림 문제는 **그린 SVG에서 선과 점을 센다**
//   · 각기둥·각뿔 그림은 이 파일이 몸을 따로 세워(돌림각·크기만 그림에서 읽고) 보이는 면을 다시 계산해 점선과 대조한다
//   · 직각삼각형 밑면 전개도의 ?는 "접으면 맞닿는 옆면"을 이 파일이 따로 찾고, 그린 선분의 길이도 잰다
//   · 원주율 곱은 0.01 단위 정수로 다시 셈한다
// ★ 이름표는 값만이 아니라 **뜻**까지 — 오답이 그 이름표의 틀린 생각으로 정말 나오는지 문제마다 다시 계산한다.
// ★ 씨앗은 개념마다 수백 개 (RNG_SEEDS=20000으로 넓게).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  SOLID, TAGS, makeQuestion, makeRound, conceptById, ladder, placeFrom, diagnosticSet, lessonOf, checkContent, gradeLabel, valueOf, _kit,
} from '../js/mathsolid.js';
import { figureSvg, figText, renderFigures } from '../js/mathdraw.js';
import { tplKey } from '../js/mathgen.js';
import { padSpec, readTyped, matchTyped } from '../js/mathpad.js';

const OPTS = { names: ['피카츄', '리자몽', '개굴닌자'], me: '진우', worlds: { pokemon: [], toystory: [], minions: [], moana: [] } };
const SEEDS = Number(process.env.RNG_SEEDS) || 300;
/** 그림 검사 씨앗 — 그림은 무거워 따로 (FIG_SEEDS=3000으로 넓게, O 때 RNG_SEEDS가 그림 검사를 안 넓혀 알아챘다) */
const FIG_SEEDS = Number(process.env.FIG_SEEDS) || 150;
const IDS = SOLID.map((c) => c.id);

// ───────────────────── 테스트가 따로 쓴 이름·규칙 ─────────────────────

const DIG = ['', '일', '이', '삼', '사', '오', '육', '칠', '팔', '구'];
/** 한자어 수 (생성기와 다른 방법 — 자리마다 글자를 붙인다) */
function korean(n) {
  const ten = Math.floor(n / 10); const one = n % 10;
  let s = '';
  if (ten === 1) s += '십'; else if (ten > 1) s += DIG[ten] + '십';
  return s + DIG[one];
}
const NAME = { prism: (n) => `${korean(n)}각기둥`, pyramid: (n) => `${korean(n)}각뿔` };
const POLY = (n) => `${korean(n)}각형`;
/** 교과서 규칙 — 한 밑면의 변의 수 n */
const RULE = {
  prism: { face: (n) => n + 2, vertex: (n) => 2 * n, edge: (n) => 3 * n, bases: 2, side: '직사각형' },
  pyramid: { face: (n) => n + 1, vertex: (n) => n + 1, edge: (n) => 2 * n, bases: 1, side: '삼각형' },
};
const KIND_KO = { 각기둥: 'prism', 각뿔: 'pyramid' };
const OTHER = { prism: 'pyramid', pyramid: 'prism' };
/** 위·앞에서 본 모양 */
const VIEWS = { 원기둥: { 위: '원', 앞: '직사각형' }, 원뿔: { 위: '원', 앞: '삼각형' }, 구: { 위: '원', 앞: '원' } };
/** 0.01 단위 정수 → 글자 */
const cents = (v) => { const t = String(v).padStart(3, '0'); return `${t.slice(0, -2)}.${t.slice(-2)}`.replace(/\.?0+$/, ''); };
const toCents = (s) => { const [i, f = ''] = String(s).split('.'); return +i * 100 + +(f + '00').slice(0, 2); };

// ───────────────────── 글 읽기 ─────────────────────

const lastLine = (q) => q.trim().split('\n').filter(Boolean).pop();
const figsOf = (q) => [...q.matchAll(/\[(prism|pyramid|cyl|cone|sphere|spin|pnet|cnet|cuboid) ([^\]]+)\]/g)].map((m) => ({ kind: m[1], arg: m[2], raw: m[0] }));
/** 지시문 인자 → { 이름: 값 } (값 없는 낱말은 true, 맨 앞 낱말은 _0, _1 …) */
function kv(arg) {
  const out = {}; let pos = 0;
  for (const tok of arg.trim().split(/\s+/)) {
    const m = /^([a-z]+)=(.+)$/.exec(tok);
    if (m) out[m[1]] = /^\d+$/.test(m[2]) ? +m[2] : m[2];
    else if (/^(lie|same|diff|para|names|plain|cubes)$/.test(tok)) out[tok] = true;
    else out[`_${pos++}`] = /^\d+$/.test(tok) ? +tok : tok;
  }
  return out;
}

/**
 * 문제 글만 보고 풀기 → { type, ans, f } — f는 이름표 뜻 검사에 쓰는 사실들
 */
function solveText(q) {
  const L = lastLine(q); const figs = figsOf(q); const F0 = figs[0]; const A = F0 ? kv(F0.arg) : {};
  let m;
  // ── P9 ──
  if ((m = /옆면의 가로가 (\d+(?:\.\d+)?) cm인 원기둥/.exec(q)) && /반지름은 몇 cm/.test(L)) {
    const W = toCents(m[1]); assert.equal(W % 314, 0, `둘레 ${m[1]}가 3.14의 배수가 아니다`);
    const d = W / 314; assert.equal(d % 2, 0);
    return { type: 'invR', ans: String(d / 2), f: { W, d } };
  }
  if ((m = /높이가 (\d+) cm인 각기둥/.exec(q)) && /합이 (\d+) cm일 때/.test(q)) {
    const h = +m[1]; const S = +/합이 (\d+) cm일 때/.exec(q)[1]; const n = A.n;
    const a = (S - n * h) / (2 * n); assert.ok(Number.isInteger(a) && a > 0, `밑면의 한 변 ${a}`);
    return { type: 'sumInv', ans: String(a), f: { n, h, S } };
  }
  if ((m = /면이 (\d+)개, 꼭짓점이 (\d+)개, 모서리가 (\d+)개인 입체도형/.exec(q))) {
    // 범위가 글에 있어야 "면 = 꼭짓점 → 각뿔"이 참이다 (Codex 25차 #1)
    assert.match(q, /각기둥이나 각뿔이에요/, `${q}: 각기둥이나 각뿔이라는 범위가 없다`);
    const [Fc, V, E] = [+m[1], +m[2], +m[3]];
    let kind; let n;
    if (Fc === V) { kind = 'pyramid'; n = Fc - 1; } else { kind = 'prism'; n = E / 3; }
    for (const w of ['face', 'vertex', 'edge']) assert.equal(RULE[kind][w](n), { face: Fc, vertex: V, edge: E }[w], `${q}: 수가 안 맞는 입체도형`);
    return { type: 'cond', ans: NAME[kind](n), f: { kind, n, Fc, V, E } };
  }
  if ((m = /위에서 본 모양은 (\S+), 앞에서 본 모양은 (\S+)인 입체도형/.exec(q))) {
    const hits = Object.keys(VIEWS).filter((k) => VIEWS[k]['위'] === m[1] && VIEWS[k]['앞'] === m[2]);
    assert.equal(hits.length, 1, `본 모양 ${m[1]}·${m[2]}에 맞는 것 ${hits}`);
    return { type: 'viewCond', ans: hits[0], f: { top: m[1], front: m[2] } };
  }
  if (/같은 점을 바르게/.test(L)) return { type: 'same', ans: '둘 다 서로 평행하고 합동인 두 밑면이 있어요', f: {} };
  if (/다른 점을 바르게/.test(L)) return { type: 'cylVsPrism', ans: '원기둥은 옆면이 굽은 면이고 꼭짓점이 없어요', f: {} };
  // ── P4 거꾸로 (수 → 이름) ──
  if ((m = /^(모서리|면|꼭짓점)(?:이|가) (\d+)개인 (각기둥|각뿔)이 있어요/.exec(q)) && /이름은/.test(L)) {
    const what = { 모서리: 'edge', 면: 'face', 꼭짓점: 'vertex' }[m[1]]; const v = +m[2]; const kind = KIND_KO[m[3]];
    const n = [...Array(40).keys()].find((k) => k >= 3 && RULE[kind][what](k) === v);
    assert.ok(n, `${q}: 그런 ${m[3]}이 없다`);
    return { type: 'invName', ans: NAME[kind](n), f: { kind, what, v, n } };
  }
  // ── 밑면의 변의 수가 글에 (P2·P4) ──
  if ((m = /밑면의 변이 (\d+)개인 (각기둥|각뿔)/.exec(q))) {
    const n = +m[1]; const kind = KIND_KO[m[2]];
    if (/이름은/.test(L)) return { type: 'name', ans: NAME[kind](n), f: { kind, n } };
    const w = /(면|꼭짓점|모서리)(은|는) 모두 몇 개/.exec(L);
    if (w) { const what = { 면: 'face', 꼭짓점: 'vertex', 모서리: 'edge' }[w[1]]; return { type: 'count', ans: String(RULE[kind][what](n)), f: { kind, n, what } }; }
  }
  // ── 전개도 (P5) ──
  if (F0 && F0.kind === 'pnet') {
    const n = A.rt ? 3 : A.n; const s = A.rt ? 3 : (A.s || A.n);
    const up = A.up === undefined ? [] : String(A.up).split(',').map(Number); const dn = A.dn === undefined ? [] : String(A.dn).split(',').map(Number);
    const valid = s === n && up.length === 1 && dn.length === 1;
    if (/각기둥이 될까요/.test(L)) {
      const ans = valid ? '네, 각기둥이 돼요' : s !== n ? '아니요, 옆면의 수가 밑면의 변의 수와 달라요' : '아니요, 두 밑면이 같은 쪽에 있어서 겹쳐요';
      return { type: 'isnet', ans, f: { valid, n, s, up, dn } };
    }
    assert.ok(valid, `전개도라고 했는데 접히지 않는 그림: ${F0.raw}`);
    if (/이름은/.test(L)) return { type: 'netName', ans: NAME.prism(n), f: { n } };
    if (/옆면은 몇 개/.test(L)) return { type: 'netSides', ans: String(s), f: { n } };
    if (/\?로 표시한 선분의 길이/.test(L)) {
      if (A.rt) {
        const w = String(A.rt).split(',').map(Number); const at = A.q.startsWith('up') ? up[0] : dn[0];
        // 붙은 변의 왼쪽 끝에서 나온 변은 접으면 왼쪽 옆면의 가로와, 오른쪽 끝에서 나온 변은 오른쪽 옆면의 가로와 맞닿는다 (옆면 줄은 고리로 이어진다)
        const nb = A.q.endsWith('0') ? (at + 2) % 3 : (at + 1) % 3;
        return { type: 'rtLen', ans: String(w[nb]), f: { w, h: A.h, nb } };
      }
      return { type: 'netLen', ans: String(A.q === 'base' ? A.a : A.h), f: { a: A.a, h: A.h, n, q: A.q } };
    }
  }
  // ── 원기둥 전개도 (P8) ──
  if (F0 && F0.kind === 'cnet') {
    const r = A.r !== undefined ? A.r : A.d / 2;
    if (/원기둥이 될까요/.test(L)) {
      const bad = A.same ? 'same' : A.diff ? 'diff' : A.para ? 'para' : '';
      assert.ok(!/평행사변형/.test(q.replace(/\[[^\]]+\]/g, '')), `글이 답(평행사변형)을 흘린다\n${q}`);
      const ans = { '': '네, 원기둥이 돼요', same: '아니요, 두 밑면이 같은 쪽에 있어서 겹쳐요', diff: '아니요, 두 밑면의 크기가 달라요', para: '아니요, 옆면이 직사각형이 아니에요' }[bad];
      return { type: 'cnetOk', ans, f: { bad } };
    }
    if (/옆면의 가로\(\?\)는 몇 cm/.test(L)) { assert.ok(q.includes('(원주율: 3.14)')); return { type: 'cnetW', ans: cents(2 * r * 314), f: { r, h: A.h } }; }
    if (/원기둥의 높이는 몇 cm/.test(L)) return { type: 'cnetH', ans: String(A.h), f: { r, h: A.h, W: toCents(A.w) } };
  }
  // ── 돌리기 (P6·P7) ──
  if (F0 && F0.kind === 'spin') {
    const sh = A._0;
    if (sh === 'half') {
      const D = A._1;
      if (/반지름은 몇 cm/.test(L)) return { type: 'halfR', ans: String(D / 2), f: { D } };
      if (/지름은 몇 cm/.test(L)) return { type: 'halfD', ans: String(D), f: { D } };
    }
    const a = A._1; const b = A._2; const c = A.c;
    if (/입체도형은 무엇/.test(L)) return { type: 'spinKind', ans: sh === 'rect' ? '원기둥' : '원뿔', f: { sh } };
    if (/밑면의 지름은 몇 cm/.test(L)) return { type: 'spinD', ans: String(2 * a), f: { a, b, c } };
    if (/높이는 몇 cm/.test(L)) return { type: 'spinH', ans: String(b), f: { a, b, c } };
  }
  // ── 본 모양 (P7) ──
  if ((m = /이 입체도형을 (위|앞)에서 본 모양/.exec(L))) {
    const solid = F0.kind === 'cyl' ? '원기둥' : F0.kind === 'cone' ? '원뿔' : '구';
    return { type: 'view', ans: VIEWS[solid][m[1]], f: { solid, dir: m[1] } };
  }
  if (/어느 방향에서 보아도 모양이 같은/.test(L)) return { type: 'viewSame', ans: Object.keys(VIEWS).find((k) => VIEWS[k]['위'] === VIEWS[k]['앞']), f: {} };
  // ── 원기둥·원뿔·구 (P6·P7) ──
  if (F0 && F0.kind === 'cyl') {
    if (/높이는 몇 cm/.test(L)) return { type: 'height', ans: String(A.h), f: { solid: 'cyl', r: A.r, h: A.h } };
    if (/지름은 몇 cm/.test(L)) return { type: 'cylD', ans: String(2 * A.r), f: { r: A.r, h: A.h } };
  }
  if (F0 && F0.kind === 'cone') {
    const r = A.r; const l = A.l; const h = A.h !== undefined ? A.h : Math.sqrt(l * l - r * r);
    if (A.h !== undefined && l !== undefined) assert.equal(l * l, r * r + h * h, `원뿔 ${F0.raw}: 모선² ≠ 반지름² + 높이²`);
    if (/높이는 몇 cm/.test(L)) return { type: 'height', ans: String(h), f: { solid: 'cone', r, h, l } };
    if (/모선의 길이는 몇 cm/.test(L)) return { type: 'coneL', ans: String(l), f: { r, h, l } };
    if (/모선을 바르게/.test(L)) return { type: 'slants', ans: '셀 수 없이 많고, 길이가 모두 같아요', f: {} };
  }
  if (F0 && F0.kind === 'sphere') {
    const R = A.r !== undefined ? A.r : A.d / 2;
    if (/반지름을 바르게/.test(L)) return { type: 'radii', ans: '셀 수 없이 많고, 길이가 모두 같아요', f: {} };
    if (/반지름은 몇 cm/.test(L)) return { type: 'sphR', ans: String(R), f: { R } };
    if (/지름은 몇 cm/.test(L)) return { type: 'sphD', ans: String(2 * R), f: { R } };
  }
  // ── 직육면체 → 사각기둥 (P2) ──
  if (F0 && F0.kind === 'cuboid' && /각기둥의 이름으로/.test(L)) return { type: 'cuboidName', ans: NAME.prism(4), f: {} };
  // ── 각기둥·각뿔 그림 (P1~P3) ──
  if (F0 && (F0.kind === 'prism' || F0.kind === 'pyramid')) {
    const kind = F0.kind; const n = A.n; const R = RULE[kind]; const svg = figureSvg(`${kind} ${F0.arg}`);
    const G = solidCounts(svg);
    if (/바르게 말한 것/.test(L)) return { type: 'kind', ans: kind === 'prism' ? '각기둥이에요 — 서로 평행하고 합동인 두 밑면이 있어요' : '각뿔이에요 — 밑면이 1개이고 옆면이 모두 삼각형이에요', f: { kind, n } };
    if (/밑면은 몇 개/.test(L)) return { type: 'bases', ans: String(R.bases), f: { kind, n } };
    if (/옆면은 어떤 모양/.test(L)) return { type: 'sideShape', ans: R.side, f: { kind, n } };
    if (/옆면은 몇 개/.test(L)) return { type: 'sides', ans: String(n), f: { kind, n } };
    if (/색칠한 면은 무엇/.test(L)) return { type: 'shaded', ans: A.shade === 'b' ? '밑면' : '옆면', f: { shade: A.shade } };
    if (/어떻게 만날까요/.test(L)) return { type: 'perp', ans: '수직으로 만나요', f: {} };
    if (/이름은/.test(L)) return { type: 'name', ans: NAME[kind](n), f: { kind, n } };
    if (/밑면은 어떤 도형/.test(L)) return { type: 'baseShape', ans: POLY(n), f: { kind, n } };
    if ((m = /(모서리|꼭짓점)(은|는) 모두 몇 개/.exec(L))) {
      const what = m[1] === '모서리' ? 'edge' : 'vertex';
      // 그린 SVG에서 센 수 = 규칙
      assert.equal(what === 'edge' ? G.edges : G.vertices, R[what](n), `${F0.raw}: 그린 ${m[1]} 수`);
      return { type: 'count', ans: String(R[what](n)), f: { kind, n, what, vis: what === 'edge' ? G.visEdges : G.visVertices } };
    }
    if (/각뿔의 꼭짓점은 몇 개/.test(L)) return { type: 'apex', ans: '1', f: { n } };
    if (/높이는 몇 cm/.test(L)) return { type: 'height', ans: String(A.h), f: { solid: kind, a: A.a, h: A.h, e: A.e } };
    if (/모든 모서리 길이의 합은 몇 cm/.test(L)) {
      // 각뿔은 밑면이 정다각형이라는 것만으로 옆 모서리가 모두 같지 않다 — 전제를 글에 (Codex 25차 #4)
      if (kind === 'pyramid') assert.match(q, /옆 모서리의 길이가 모두 같은/, `${q}: 옆 모서리가 모두 같다는 말이 없다`);
      const ans = kind === 'prism' ? 2 * n * A.a + n * A.h : n * A.a + n * A.e;
      return { type: 'edgeSum', ans: String(ans), f: { kind, n, a: A.a, h: A.h, e: A.e } };
    }
  }
  throw new Error(`못 읽는 문제:\n${q}`);
}

/** 그린 각기둥·각뿔 SVG에서 센 수 — 모서리(선)·꼭짓점(선 끝)·보이는 것(실선 · 실선이 하나라도 닿는 점) */
function solidCounts(svg) {
  const E = [...svg.matchAll(/<line class="sol-e"[^>]*data-hid="([01])" x1="([-\d.]+)" y1="([-\d.]+)" x2="([-\d.]+)" y2="([-\d.]+)"/g)].map((z) => ({ hid: z[1] === '1', a: `${z[2]},${z[3]}`, b: `${z[4]},${z[5]}` }));
  const pts = new Map();
  for (const e of E) for (const p of [e.a, e.b]) { if (!pts.has(p)) pts.set(p, []); pts.get(p).push(e); }
  return { edges: E.length, vertices: pts.size, visEdges: E.filter((e) => !e.hid).length, visVertices: [...pts.values()].filter((es) => es.some((e) => !e.hid)).length };
}

/** 이름표의 뜻 — 오답 값이 그 이름표의 틀린 생각으로 정말 나오는가 */
const NAMEOF = (kind, v) => (Number.isInteger(v) && v >= 3 ? NAME[kind](v) : null);
const T = (fn) => ({ is: fn });
const TAGV = {
  count: {
    [TAGS.visibleOnly]: (f) => String(f.vis),
    [TAGS.asVertex]: (f) => String(RULE[f.kind].vertex(f.n)), [TAGS.asEdge]: (f) => String(RULE[f.kind].edge(f.n)), [TAGS.asFace]: (f) => String(RULE[f.kind].face(f.n)),
    [TAGS.baseEdgeOnly]: (f) => String(f.n), [TAGS.oneBaseV]: (f) => String(f.n), [TAGS.noApex]: (f) => String(f.n), [TAGS.sameN]: (f) => String(f.n), [TAGS.sideOnlyF]: (f) => String(f.n),
    [TAGS.pyrRule]: (f) => String(RULE.pyramid[f.what](f.n)), [TAGS.prismRule]: (f) => String(RULE.prism[f.what](f.n)),
    [TAGS.swap23]: (f) => String(f.what === 'vertex' ? 3 * f.n : 2 * f.n),
  },
  bases: { [TAGS.bottomOnly]: () => '1', [TAGS.twoBasePyr]: () => '2', [TAGS.sideAsBase]: (f) => String(f.n) },
  sides: { [TAGS.allFaces]: (f) => String(RULE[f.kind].face(f.n)), [TAGS.baseCount]: (f) => String(RULE[f.kind].bases) },
  netSides: { [TAGS.allFaces]: (f) => String(f.n + 2), [TAGS.baseCount]: () => '2' },
  sideShape: { [TAGS.sideShapeSwap]: (f) => RULE[OTHER[f.kind]].side, [TAGS.baseShape]: (f) => POLY(f.n) },
  baseShape: { [TAGS.sideAsBase]: (f) => RULE[f.kind].side, [TAGS.byFace]: (f) => POLY(RULE[f.kind].face(f.n)) },
  name: {
    [TAGS.byVertex]: (f) => NAMEOF(f.kind, RULE[f.kind].vertex(f.n)), [TAGS.byFace]: (f) => NAMEOF(f.kind, RULE[f.kind].face(f.n)), [TAGS.byEdge]: (f) => NAMEOF(f.kind, RULE[f.kind].edge(f.n)),
    [TAGS.kindSwap]: (f) => NAME[OTHER[f.kind]](f.n),
  },
  netName: { [TAGS.byFace]: (f) => NAME.prism(f.n + 2), [TAGS.byVertex]: (f) => NAME.prism(2 * f.n), [TAGS.kindSwap]: (f) => NAME.pyramid(f.n) },
  cuboidName: { [TAGS.cuboidNot]: () => '각기둥이 아니에요', [TAGS.byFace]: () => NAME.prism(6), [TAGS.byVertex]: () => NAME.prism(8) },
  invName: {
    [TAGS.condCount]: (f) => NAMEOF(f.kind, f.v), [TAGS.kindSwap]: (f) => NAME[OTHER[f.kind]](f.n),
    // 다른 쪽 규칙을 거꾸로 쓴 이름 (□ × 2 ↔ □ × 3, □ + 1 ↔ □ + 2)
    [TAGS.pyrRule]: (f) => NAMEOF('prism', [...Array(40).keys()].find((k) => k >= 3 && RULE.pyramid[f.what](k) === f.v)),
    [TAGS.prismRule]: (f) => NAMEOF('pyramid', [...Array(40).keys()].find((k) => k >= 3 && RULE.prism[f.what](k) === f.v)),
  },
  cond: {
    [TAGS.condCount]: (f) => NAMEOF(f.kind, f.Fc), [TAGS.kindSwap]: (f) => NAME[OTHER[f.kind]](f.n),
    [TAGS.byEdge]: (f) => NAMEOF(f.kind, f.E), [TAGS.byVertex]: (f) => NAMEOF(f.kind, f.V),
  },
  height: {
    [TAGS.heightBase]: (f) => String(f.a), [TAGS.heightSide]: (f) => String(f.e),
    [TAGS.diaAsH]: (f) => String(2 * f.r), [TAGS.radAsH]: (f) => String(f.r), [TAGS.slantAsH]: (f) => String(f.l),
  },
  apex: { [TAGS.apexAll]: (f) => String(f.n + 1), [TAGS.apexBase]: (f) => String(f.n) },
  edgeSum: {
    [TAGS.sumOneBase]: (f) => String(f.n * f.a + f.n * f.h), [TAGS.sumNoSide]: (f) => String((f.kind === 'prism' ? 2 : 1) * f.n * f.a),
    [TAGS.twoOnly]: (f) => String(f.a + (f.kind === 'prism' ? f.h : f.e)), [TAGS.sumNoBase]: (f) => String(f.n * f.e),
  },
  isnet: {
    [TAGS.validNo]: T((f, t) => f.valid && t.startsWith('아니요')),
    [TAGS.sameSideOk]: T((f, t) => !f.valid && f.s === f.n && t.startsWith('네')),
    [TAGS.sideCountOk]: T((f, t) => !f.valid && f.s !== f.n && t.startsWith('네')),
    [TAGS.wrongReason]: T((f, t) => !f.valid && t.startsWith('아니요')),
  },
  netLen: { [TAGS.lenSwap]: (f) => String(f.q === 'base' ? f.h : f.a), [TAGS.perimAsSide]: (f) => String(f.n * f.a), [TAGS.stripLen]: (f) => String(f.n * f.a) },
  rtLen: { [TAGS.rtWrongSide]: T((f, t) => f.w.includes(+t) && +t !== f.w[f.nb]), [TAGS.lenSwap]: (f) => String(f.h) },
  cylD: { [TAGS.rAsD]: (f) => String(f.r), [TAGS.hAsD]: (f) => String(f.h) },
  coneL: { [TAGS.hAsSlant]: (f) => String(f.h), [TAGS.rAsSlant]: (f) => String(f.r) },
  slants: { [TAGS.oneSlant]: () => '1개뿐이에요', [TAGS.twoSlant]: () => '그림에 그린 2개뿐이에요' },
  spinD: { [TAGS.rAsD]: (f) => String(f.a), [TAGS.spinSide]: (f) => String(f.b), [TAGS.slantAsD]: (f) => String(f.c) },
  spinH: { [TAGS.slantAsH]: (f) => String(f.c), [TAGS.spinSide]: (f) => String(f.a) },
  spinKind: { [TAGS.roundSwap]: (f) => (f.sh === 'rect' ? '원뿔' : '원기둥'), [TAGS.roundPoly]: T((f, t) => /각(기둥|뿔)$/.test(t)) },
  cylVsPrism: { [TAGS.cylVertex]: T((f, t) => /원기둥에도 꼭짓점/.test(t)), [TAGS.oneBaseCyl]: T((f, t) => /원기둥은 밑면이 1개/.test(t)) },
  same: { [TAGS.cylVertex]: T((f, t) => /둘 다 꼭짓점/.test(t)), [TAGS.roundFlat]: T((f, t) => /둘 다 옆면이 평평/.test(t)) },
  sphD: { [TAGS.rAsD]: (f) => String(f.R), [TAGS.doubleD]: (f) => String(4 * f.R) },
  sphR: { [TAGS.dAsR]: (f) => String(2 * f.R), [TAGS.doubleD]: (f) => String(4 * f.R) },
  halfR: { [TAGS.halfDAsR]: (f) => String(f.D), [TAGS.doubleD]: (f) => String(2 * f.D) },
  halfD: { [TAGS.rForD]: (f) => String(f.D / 2), [TAGS.doubleD]: (f) => String(2 * f.D) },
  radii: { [TAGS.oneRadius]: () => '1개뿐이에요', [TAGS.radiusDiff]: () => '셀 수 없이 많고, 길이가 모두 달라요' },
  view: {
    [TAGS.viewTop]: (f) => VIEWS[f.solid]['위'], [TAGS.viewFront]: (f) => VIEWS[f.solid]['앞'],
    [TAGS.viewSwap]: T((f, t) => t === VIEWS[f.solid === '원기둥' ? '원뿔' : '원기둥'][f.dir] && t !== VIEWS[f.solid][f.dir]),
    [TAGS.otherFront]: T((f, t) => f.dir === '위' && t === VIEWS[f.solid === '원기둥' ? '원뿔' : '원기둥']['앞']),
    [TAGS.sphereView]: T((f, t) => f.solid === '구' && t !== '원'),
  },
  viewSame: { [TAGS.viewOne]: T((f, t) => VIEWS[t] && VIEWS[t]['위'] === '원' && VIEWS[t]['앞'] !== '원') },
  viewCond: { [TAGS.viewOne]: T((f, t) => VIEWS[t] && VIEWS[t]['위'] === f.top && VIEWS[t]['앞'] !== f.front) },
  cnetW: { [TAGS.wHalf]: (f) => cents(f.r * 314), [TAGS.wAsD]: (f) => String(2 * f.r), [TAGS.hAsW]: (f) => String(f.h) },
  cnetH: { [TAGS.wSwapH]: (f) => cents(f.W), [TAGS.diaAsH]: (f) => String(2 * f.r) },
  cnetOk: {
    [TAGS.validNo]: T((f, t) => !f.bad && t.startsWith('아니요')),
    [TAGS.sameSideOkC]: T((f, t) => f.bad === 'same' && t.startsWith('네')), [TAGS.diffOk]: T((f, t) => f.bad === 'diff' && t.startsWith('네')), [TAGS.paraOk]: T((f, t) => f.bad === 'para' && t.startsWith('네')),
    [TAGS.wrongReason]: T((f, t) => !!f.bad && t.startsWith('아니요')),
  },
  invR: {
    [TAGS.stopAtD]: (f) => String(f.d),
    // 거꾸로 곱한 값 — 둘레 × 3.14 (0.0001 단위)
    [TAGS.invMul]: (f) => { const v = String(f.W * 314).padStart(5, '0'); return `${v.slice(0, -4)}.${v.slice(-4)}`.replace(/\.?0+$/, ''); },
    [TAGS.noPiInv]: (f) => cents(f.W / 2),
  },
  sumInv: { [TAGS.sumOneBase]: (f) => String((f.S - f.n * f.h) / f.n), [TAGS.noSubH]: (f) => String(f.S / (2 * f.n)), [TAGS.equalSplit]: (f) => String(f.S / (3 * f.n)) },
  kind: {
    [TAGS.kindSwap]: T((f, t) => t.startsWith(f.kind === 'prism' ? '각뿔이에요' : '각기둥이에요')),
    [TAGS.oneBasePrism]: T((f, t) => /각기둥이에요 — 밑면이 1개/.test(t)), [TAGS.twoBasePyr]: T((f, t) => /각뿔이에요 — 밑면이 2개/.test(t)),
    [TAGS.sideShapeSwap]: T((f, t) => /각뿔이에요 — 옆면이 모두 직사각형/.test(t)),
  },
  shaded: { [TAGS.bottomOnly]: T((f, t) => f.shade === 'b' && t === '옆면'), [TAGS.sideAsBase]: T((f, t) => f.shade === 's' && t === '밑면'), [TAGS.notFace]: () => '모서리' },
  perp: { [TAGS.parSwap]: T((f, t) => /평행|만나지 않/.test(t)) },
};
function tagHolds(type, tag, f, text) {
  const fn = TAGV[type] && TAGV[type][tag];
  if (!fn) return false;
  return typeof fn === 'function' ? fn(f) === text : fn.is(f, text);
}

const allText = (q) => [q.q, ...q.choices.map((x) => x.text), ...(q.solve ? [...q.solve.steps, ...Object.values(q.solve.why), q.solve.whyAny, q.solve.rule] : [])].join('\n');

/** 문항 하나씩 — 개념·씨앗·얼굴 */
function* every(kinds = ['calc', 'misread'], n = SEEDS) {
  for (const c of SOLID) for (const k of kinds) for (let s = 1; s <= n; s++) yield { c, k, s, q: makeQuestion(c.id, k, s, OPTS) };
}

// ───────────────────── 사다리 ─────────────────────

test('사다리: 9칸, 모두 초6, needs가 바로 앞 칸 · 맨 뒤는 ⭐', () => {
  assert.equal(SOLID.length, 9);
  assert.deepEqual(IDS, ['sol.parts', 'sol.name', 'sol.elem', 'sol.rule', 'sol.pnet', 'sol.round', 'sol.sphere', 'sol.cnet', 'sol.apply']);
  SOLID.forEach((c, i) => {
    assert.equal(c.grade, 6, c.id);
    assert.deepEqual(c.needs, i ? [IDS[i - 1]] : [], c.id);
    assert.ok(c.idea && c.rule && c.slip, c.id);
    assert.equal(conceptById(c.id), c);
  });
  assert.ok(SOLID[8].name.startsWith('⭐'));
  assert.equal(gradeLabel(6), '초6');
});

// ───────────────────── 독립 검산 ─────────────────────

test('★ 독립 검산: ① 정답이 문제 글·그림을 따로 읽어 푼 답과 같다 · 딱 하나만 맞다 · 오답은 그 답이 아니다', () => {
  const types = new Set();
  for (const { c, s, q } of every(['calc'])) {
    const sv = solveText(q.q);
    types.add(sv.type);
    const ok = q.choices.filter((x) => x.ok);
    assert.equal(ok.length, 1, `${c.id} #${s}`);
    assert.equal(ok[0].text, sv.ans, `${c.id} #${s}: 정답 "${ok[0].text}" ≠ 따로 푼 답 "${sv.ans}"\n${q.q}`);
    for (const w of q.choices.filter((x) => !x.ok)) {
      assert.notEqual(w.text, sv.ans, `${c.id} #${s}: 오답이 정답`);
      if (valueOf(sv.ans) !== null && valueOf(w.text) !== null) assert.notEqual(valueOf(w.text), valueOf(sv.ans), `${c.id} #${s}: 오답 값이 정답 값`);
    }
  }
  assert.ok(types.size >= 35, `문제 종류 ${types.size}`);
});

test('★ 보기: 정답 하나, 글자·값 겹침 없음, 3개 이상, 빈 글자·undefined·NaN·남은 자리표시 없음 · 그림 지시문은 모두 그려진다', () => {
  for (const { c, k, s, q } of every()) {
    assert.ok(q.choices.length >= 3, `${c.id} ${k} #${s}: 보기 ${q.choices.length}`);
    const texts = q.choices.map((x) => x.text);
    assert.equal(new Set(texts).size, texts.length, `${c.id} ${k} #${s}: 같은 보기`);
    const vals = texts.map(valueOf).filter((v) => v !== null);
    assert.equal(new Set(vals).size, vals.length, `${c.id} ${k} #${s}: 값이 같은 보기`);
    const all = allText(q);
    assert.ok(!/undefined|NaN|null|\{(?!mon|me)[^}]*\}/.test(all), `${c.id} ${k} #${s}: ${all}`);
    for (const f of q.q.match(/\[[a-z]+ [^\]]+\]/g) || []) assert.ok(figureSvg(f.slice(1, -1)), `${c.id} ${k} #${s}: 안 그려지는 ${f}`);
  }
});

test('★ 오개념 이름표: 그 오답이 정말 그 틀린 생각이다 — 문제 글을 읽어 틀린 생각을 다시 한다 · 이름표 붙은 오답이 늘 둘 이상', () => {
  for (const { c, s, q } of every(['calc'])) {
    const sv = solveText(q.q);
    const tagged = q.choices.filter((x) => !x.ok && x.tag && x.tag !== '계산 실수');
    assert.ok(tagged.length >= (sv.type === 'height' && sv.f.solid === 'prism' ? 1 : 2), `${c.id} #${s}: 이름표 붙은 오답 ${tagged.length}\n${q.q}`);
    for (const w of tagged) assert.ok(tagHolds(sv.type, w.tag, sv.f, w.text), `${c.id} #${s} [${sv.type}]: "${w.text}"는 "${w.tag}"가 아니다\n${q.q}`);
  }
});

test('★ 오답끼리 같은 값이 되지 않는다 — 보기에서 겹쳐 빠지기 전(probe.allWrong) · 빠진 오답도 이름표의 뜻 그대로', () => {
  let seen = 0;
  for (const { c, s, q } of every(['calc'])) {
    const all = q.probe && q.probe.allWrong;
    assert.ok(all, `${c.id} #${s}: allWrong 없음`);
    const sv = solveText(q.q);
    const texts = all.map((w) => w.text);
    assert.equal(new Set(texts).size, texts.length, `${c.id} #${s}: 오답끼리 같다 ${texts.join(' · ')}`);
    for (const w of all) {
      assert.notEqual(w.text, sv.ans, `${c.id} #${s}: 오답 "${w.text}"이 정답`);
      assert.ok(tagHolds(sv.type, w.tag, sv.f, w.text), `${c.id} #${s} [${sv.type}]: 빠진 오답 "${w.text}"도 "${w.tag}"여야`);
      seen++;
    }
  }
  assert.ok(seen > 15 * SEEDS, `본 오답 ${seen}`);
});

// ───────────────────── ② ─────────────────────

/** ② 보여 준 말 → 그 말이 정말 틀렸는가, 고치는 말이 맞는가 (갈래마다 따로 계산) */
function checkMisread(q) {
  const shown = (/\*\*(.+?)\*\*/.exec(q.q) || [])[1] || '';
  const ok = q.choices.find((x) => x.ok).text;
  const F0 = figsOf(q.q)[0]; const A = F0 ? kv(F0.arg) : {};
  let m;
  switch (q.key) {
    case 'misread:bottom': assert.match(shown, /옆면이에요/); assert.ok(A.lie && A.shade === 'b'); assert.match(ok, /색칠한 면은 밑면이에요/); break;
    case 'misread:pyrbase': assert.match(shown, /밑면이 2개/); assert.equal(F0.kind, 'pyramid'); assert.match(ok, /밑면은 1개/); break;
    case 'misread:vertex': m = /꼭짓점이 (\d+)개라서 (\S+)이에요/.exec(shown); assert.equal(+m[1], 2 * A.n); assert.notEqual(m[2], NAME.prism(A.n)); assert.ok(ok.endsWith(`${NAME.prism(A.n)}이에요`), ok); break;
    case 'misread:cuboid': assert.match(shown, /각기둥이 아니에요/); assert.match(ok, /사각기둥이라고 할 수 있어요/); break;
    case 'misread:height': m = /(\d+) cm예요/.exec(shown); assert.equal(+m[1], A.e); assert.notEqual(A.e, A.h); assert.ok(ok.includes(`${A.h} cm`), ok); break;
    case 'misread:apex': m = /(\d+)개예요/.exec(shown); assert.equal(+m[1], A.n + 1); assert.match(ok, /1개예요/); break;
    case 'misread:pyr': {
      const n = +/밑면의 변이 (\d+)개인 각뿔/.exec(q.q)[1]; m = /= (\d+)개/.exec(shown);
      assert.notEqual(+m[1], RULE.pyramid.edge(n)); assert.ok(ok.includes(`${RULE.pyramid.edge(n)}개`), ok); break;
    }
    case 'misread:prism': {
      const n = +/밑면의 변이 (\d+)개인 각기둥/.exec(q.q)[1]; m = /= (\d+)개/.exec(shown);
      assert.notEqual(+m[1], RULE.prism.vertex(n)); assert.ok(ok.includes(`${RULE.prism.vertex(n)}개`), ok); break;
    }
    case 'misread:same': assert.equal(String(A.up).split(',').length, 2); assert.equal(A.dn, undefined); assert.match(shown, /각기둥이 돼요/); assert.match(ok, /안 돼요/); break;
    case 'misread:count': assert.equal(A.s, A.n + 1); assert.match(shown, /각기둥이 돼요/); assert.match(ok, /안 돼요/); break;
    case 'misread:slant': m = /(\d+) cm예요/.exec(shown); assert.equal(+m[1], A.l); assert.ok(ok.includes(`${A.h} cm`), ok); assert.equal(A.l * A.l, A.r * A.r + A.h * A.h); break;
    case 'misread:spin': m = /지름은 (\d+) cm예요/.exec(shown); assert.equal(+m[1], A._1); assert.ok(ok.includes(`지름은 ${2 * A._1} cm`), ok); break;
    case 'misread:half': m = /반지름도 (\d+) cm/.exec(shown); assert.equal(+m[1], A._1); assert.ok(ok.includes(`반지름은 ${A._1 / 2} cm`), ok); break;
    case 'misread:view': assert.match(shown, /다른 모양/); assert.match(ok, /어느 방향에서 보아도 원/); break;
    case 'misread:dia': { m = /지름과 같은 (\d+) cm/.exec(shown); const r = A.r; assert.equal(+m[1], 2 * r); assert.ok(ok.includes(`${cents(2 * r * 314)} cm`), ok); break; }
    case 'misread:inv': {
      const W = toCents(/옆면의 가로가 (\d+(?:\.\d+)?) cm/.exec(q.q)[1]); const d = W / 314;
      assert.match(shown, /× 3\.14/); assert.ok(ok.includes(`반지름은 ${d / 2} cm`), ok); break;
    }
    case 'misread:cond': {
      const E = +/모서리가 (\d+)개인 각뿔/.exec(q.q)[1]; m = /(\S+)이에요$/.exec(shown);
      assert.notEqual(m[1], NAME.pyramid(E / 2)); assert.ok(ok.endsWith(`${NAME.pyramid(E / 2)}이에요`), ok); break;
    }
    default: {
      // 원기둥 전개도 ② "반지름 × 3.14" — 갈래 이름이 half(구의 half와 같은 이름)라 글로 가른다
      if (q.concept === 'sol.cnet' && q.key === 'misread:half') break;
      throw new Error(`모르는 ② 갈래 ${q.key}`);
    }
  }
}

test('★ ② 오개념 문항: 보여 준 말은 정말 틀렸다 · 고치는 말만 맞다 · 갈래 열쇠 둘씩', () => {
  const keys = {};
  for (const { c, s, q } of every(['misread'])) {
    (keys[c.id] = keys[c.id] || new Set()).add(q.key);
    assert.ok(q.choices.some((x) => !x.ok && x.tag === '틀린 줄 모름' && x.text === '맞게 말했어요'), `${c.id} #${s}`);
    assert.equal(q.choices.filter((x) => x.ok).length, 1);
    if (c.id === 'sol.cnet' && q.key === 'misread:half') {
      const r = kv(figsOf(q.q)[0].arg).r; const shown = /\*\*(.+?)\*\*/.exec(q.q)[1];
      assert.ok(shown.includes(`${r} × 3.14 = ${cents(r * 314)}`), shown);
      assert.ok(q.choices.find((x) => x.ok).text.includes(`${2 * r} × 3.14 = ${cents(2 * r * 314)}`));
    } else checkMisread(q);
  }
  for (const id of IDS) assert.equal(keys[id].size, 2, `${id}: ② 갈래 ${[...keys[id]]}`);
});

// ───────────────────── 글 ─────────────────────

test('★ 조사: 수 뒤는 읽는 소리 · 각기둥·각뿔·○각형·면·원·구 뒤 · cm 뒤', () => {
  const BAT = new Set(['0', '1', '3', '6', '7', '8']);
  const PAIRS = [['을', '를'], ['은', '는'], ['이', '가'], ['과', '와'], ['이에요', '예요'], ['이니까', '니까'], ['이라서', '라서']];
  const jong = (ch) => { const code = ch.charCodeAt(0) - 0xac00; return code >= 0 && code < 11172 ? code % 28 : -1; };
  let hitN = 0; let hitW = 0;
  for (const { c, k, s, q } of every()) {
    const all = allText(q).replace(/\[[a-z]+ [^\]]+\]/g, '');
    for (const [wb, nb] of PAIRS) {
      for (const m of all.matchAll(new RegExp(`(\\d)(${wb}|${nb})(?=[\\s.,!?)—]|$)`, 'g'))) { assert.equal(m[2], BAT.has(m[1]) ? wb : nb, `${c.id} ${k} #${s}: "…${m[1]}${m[2]}"\n${all}`); hitN++; }
      for (const m of all.matchAll(new RegExp(`(각기둥|각뿔|각형|원기둥|원뿔|밑면|옆면|모선|꼭짓점|모서리|높이|반지름|지름|직사각형|삼각형|입체도형|(?<![가-힣])구|(?<![가-힣])원|(?<![가-힣])면)(${wb}|${nb})(?=[\\s.,!?)—]|$)`, 'g'))) {
        const j = jong(m[1].slice(-1)); assert.equal(m[2], j > 0 ? wb : nb, `${c.id} ${k} #${s}: "…${m[1]}${m[2]}"`); hitW++;
      }
    }
    assert.ok(!/(cm)(은|을|이 |과|이에요|으로)/.test(all), `${c.id} ${k} #${s}: 단위 뒤 조사\n${all}`);
  }
  assert.ok(hitN > 2 * SEEDS && hitW > 5 * SEEDS, `실제로 본 곳: 수 ${hitN} · 이름 ${hitW} (검사가 빈 채 통과하지 않게)`);
});

test('★ 풀이 카드: 단계 2줄↑(한 줄이면 답이 그 줄에) · 기억할 것 · 오답마다 왜 · 정답이 단계에 나온다', () => {
  for (const { c, k, s, q } of every()) {
    const sv = q.solve;
    assert.ok(sv && sv.steps.length >= 1 && sv.rule, `${c.id} ${k} #${s}`);
    for (const w of q.choices.filter((x) => !x.ok)) assert.ok(sv.why[w.tag] || sv.whyAny, `${c.id} ${k} #${s}: "${w.tag}" 설명 없음`);
    // 수와 짧은 이름(원뿔·사각기둥·직사각형…)은 풀이에 그대로 나온다 — 문장 정답("네, 각기둥이 돼요")은 풀이가 까닭을 말한다
    const ok = q.choices.find((x) => x.ok).text;
    if (k === 'calc' && (valueOf(ok) !== null || ok.length <= 6)) assert.ok(sv.steps.join(' ').includes(ok), `${c.id} #${s}: 정답 "${ok}"이 풀이에 없다\n${sv.steps.join('\n')}`);
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
  assert.ok(n > 5 * SEEDS, `셈식 ${n}`);
});

test('🔁 쌍둥이·🤔 노트: 요청한 틀·갈래로 온다 · 같은 셈 · 쌍둥이 글이 원래 글과 같은 일은 드물다', () => {
  const same = {}; const tot = {};
  const P = { names: OPTS.names, me: OPTS.me };
  const strip = (t) => tplKey(t.replace(/(피카츄|리자몽|개굴닌자)(이|가|은|는|을|를|과|와|의)?/g, ''));
  for (const c of SOLID) {
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
  // 수가 하나뿐인 틀(본 모양·같은 점)은 늘 같은 글 — 비율은 수를 뽑는 틀만, 표본 20개 이상
  for (const key of Object.keys(tot)) if (tot[key] >= 20 && /\d/.test(key)) assert.ok((same[key] || 0) / tot[key] <= 0.35, `쌍둥이 = 원래 글 ${same[key]}/${tot[key]}: ${key}`);
});

/** 처음 배우는 칸 — 그 앞 칸의 글·이름표에는 나오면 안 된다 */
const FIRST = [
  [/각뿔의 꼭짓점/, 'sol.elem'], [/높이/, 'sol.elem'], [/전개도/, 'sol.pnet'],
  [/원기둥|원뿔|모선|돌려|돌리면|돌렸|돌린|돌리는/, 'sol.round'], [/(?<![가-힣])구(?=(가|는|를|의|와|예요|이에요)?(?![가-힣]))|반원/, 'sol.sphere'], [/원주율|3\.14/, 'sol.cnet'],
];
test('★ 아직 안 배운 말을 앞 칸에 쓰지 않는다 — 각뿔의 꼭짓점·높이 P3 · 전개도 P5 · 원기둥·원뿔·모선·돌리기 P6 · 구·반원 P7 · 원주율 P8', () => {
  const idx = (id) => IDS.indexOf(id);
  const banned = (id) => FIRST.filter(([, at]) => idx(at) > idx(id));
  for (const c of SOLID) {
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
  [/직육면체는 (사?각기둥이 아니|각뿔)/, '직육면체는 사각기둥이라고 할 수 있다'],
  [/각뿔(도|의)? ?밑면(이|은)? ?2개/, '각뿔의 밑면은 1개'],
  [/각기둥(도|의)? ?밑면(이|은)? ?1개/, '각기둥의 밑면은 2개'],
  [/각뿔의 옆면(은|이)? ?(모두 )?직사각형/, '각뿔의 옆면은 삼각형'],
  [/원기둥(에도|은|에는) 꼭짓점이 있/, '원기둥에는 꼭짓점이 없다'],
  [/모선(은|이) (1|한|2|두)개/, '모선은 셀 수 없이 많다'],
  [/구(는|도) .*(직사각형|삼각형|반원)(이에요|예요|으로 보여)/, '구는 어느 쪽에서 보아도 원'],
  [/높이(는|가)? ?모선/, '높이와 모선은 다르다'],
  [/옆면의 가로(는|가)? ?(밑면의 )?지름과 같/, '옆면의 가로 = 밑면의 둘레'],
  [/원주율은 3\.14/, '원주율은 3.14가 아니다 — 3.14로 셈만 한다'],
  // Codex 25차 #1~#3
  [/(?<!중에서는 )면과 꼭짓점의 수가 같으면 각뿔/, '면 = 꼭짓점 → 각뿔은 "각기둥과 각뿔 중에서는"일 때만 (각기둥 위에 각뿔을 얹은 모양도 같다)'],
  [/짝수 개.{0,10}3의 배수/, '꼭짓점 짝수·모서리 3의 배수 → 각기둥은 틀림 (삼각뿔: 4·6)'],
  [/다각형인 면은 .{0,12}1개뿐/, '삼각형도 다각형 — 각뿔의 다각형인 면은 1개가 아니다'],
  [/정다각형이 아니면 옆면의 가로가 (서로 )?달라/, '정다각형이 아니어도 변이 모두 같을 수 있다 (마름모)'],
];
test('★ 참말에 틀린 일반화가 없다 — 직육면체 = 사각기둥 · 각뿔 밑면 1개 · 원기둥에 꼭짓점 없음 · 모선 셀 수 없이 많음 · 구는 늘 원', () => {
  const truths = (q) => [q.choices.find((x) => x.ok).text, ...(q.solve ? [...q.solve.steps, ...Object.values(q.solve.why), q.solve.whyAny, q.solve.rule] : [])].join('\n').replace(/\*\*/g, '');
  for (const { c, k, s, q } of every(['calc', 'misread'], FIG_SEEDS)) {
    const t = truths(q);
    for (const [re, why] of BAD) assert.ok(!re.test(t), `${c.id} ${k} #${s}: ${why}\n${t.match(new RegExp(`.*${re.source}.*`))?.[0]}`);
    if (k === 'calc') for (const [re, why] of BAD) assert.ok(!re.test(q.q.replace(/\*\*/g, '')), `${c.id} #${s}: 문제 글에 ${why}`);
  }
  for (const c of SOLID) for (const [re, why] of BAD) assert.ok(!re.test([c.idea, c.rule, c.slip].join('\n').replace(/\*\*/g, '')), `${c.id}: ${why}`);
});

test('★ ① 문제 글에는 이름 낱말(오각기둥·칠각뿔…)이 없다 — 이름이 바뀌면 🔁 열쇠(tplKey)가 갈린다', () => {
  for (const { c, s, q } of every(['calc'], 200)) {
    const t = q.q.replace(/\[[a-z]+ [^\]]+\]/g, '');
    assert.ok(!/(?<![가-힣])[일이삼사오육칠팔구십]+각(기둥|뿔)/.test(t) && !/(?<![가-힣])(오|육|칠|팔|구|십[일이삼사오육칠팔구]?)각형/.test(t), `${c.id} #${s}: 문제 글에 이름\n${q.q}`);
  }
});

// ───────────────────── 그림 ─────────────────────

/** 그린 SVG의 글자 상자 (가운데 정렬, 글꼴 크기는 그림에서) */
function labelBoxes(svg) {
  return [...svg.matchAll(/<text class="([^"]+)" x="(-?[\d.]+)" y="(-?[\d.]+)" font-size="(\d+)"[^>]*>([^<]+)<\/text>/g)].map((z) => {
    const fs = +z[4]; const t = z[5]; const w = ([...t].reduce((a, ch) => a + (/[ㄱ-ㅎ가-힣㉮-㉳]/.test(ch) ? 15 : 8.2), 0) * fs) / 15;
    return { cls: z[1], t, cx: +z[2], cy: +z[3] - fs * 0.28, x0: +z[2] - w / 2, x1: +z[2] + w / 2, y0: +z[3] - fs * 0.78, y1: +z[3] + fs * 0.22, raw: z[0] };
  });
}
const attr = (s, k) => { const m = new RegExp(` ${k}="([^"]*)"`).exec(s); return m ? m[1] : null; };
/** 모든 선 — 실선/점선 */
const linesOf = (svg) => [...svg.matchAll(/<line class="([^"]+)"([^>]*)\/>/g)].map((z) => ({ cls: z[1], x1: +attr(z[2], 'x1'), y1: +attr(z[2], 'y1'), x2: +attr(z[2], 'x2'), y2: +attr(z[2], 'y2'), dashed: !!attr(z[2], 'stroke-dasharray'), raw: z[0] }));
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
/** 그림 틀 안 · 이름표끼리 안 겹침 · 실선이 이름표를 안 지남 · 둥근 선(타원·원)이 이름표를 안 지남 */
function checkLabels(svg, at) {
  const vb = /viewBox="(-?\d+) (-?\d+) (\d+) (\d+)"/.exec(svg).slice(1).map(Number);
  const [X0, Y0, W, H] = vb;
  at(W <= 420 && H <= 420, `그림 크기 ${W}×${H}`);
  const boxes = labelBoxes(svg);
  const solid = linesOf(svg).filter((l) => !l.dashed);
  const ells = [...svg.matchAll(/<(?:ellipse|path) class="sol-ell" data-part="(top|front)" data-cx="([-\d.]+)" data-cy="([-\d.]+)" data-rx="([-\d.]+)" data-ry="([-\d.]+)"/g)].map((z) => ({ part: z[1], cx: +z[2], cy: +z[3], rx: +z[4], ry: +z[5] }));
  const circles = [...svg.matchAll(/<circle class="(?:sol-ball|cnet-c)"[^>]*cx="([-\d.]+)" cy="([-\d.]+)" r="([-\d.]+)"/g)].map((z) => ({ cx: +z[1], cy: +z[2], rx: +z[3], ry: +z[3] }));
  const ringPts = (e, front) => [...Array(97).keys()].map((i) => (2 * Math.PI * i) / 96).filter((t) => !front || Math.sin(t) >= -0.02).map((t) => [e.cx + e.rx * Math.cos(t), e.cy + e.ry * Math.sin(t)]);
  for (let i = 0; i < boxes.length; i++) {
    const a = boxes[i];
    at(a.x0 >= X0 && a.y0 >= Y0 && a.x1 <= X0 + W && a.y1 <= Y0 + H, `이름표 "${a.t}"가 그림 밖`);
    for (let j = i + 1; j < boxes.length; j++) { const b = boxes[j]; at(!(a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1), `이름표 "${a.t}"·"${b.t}" 겹침`); }
    for (const l of solid) at(!crosses(l, a), `이름표 "${a.t}"를 실선이 지나간다`);
    for (const e of [...ells, ...circles]) at(!ringPts(e, e.part === 'front').some(([x, y]) => x > a.x0 + 1 && x < a.x1 - 1 && y > a.y0 + 1 && y < a.y1 - 1), `이름표 "${a.t}"를 둥근 선이 지나간다`);
  }
  return boxes;
}

/** 각기둥·각뿔을 이 파일이 따로 세운다 (돌림각·밑면의 반지름·높이만 그림에서) — 약속: 화면 X = x + 0.3y, Y = −z − 0.42y, 보는 쪽 (0.3, −1, 0.42) */
function rebuild(kind, n, phi, rb, hh, lie) {
  const V = [];
  if (lie) {
    const apo = rb * Math.cos(Math.PI / n); const cb = Math.cos(phi); const sb = Math.sin(phi);
    for (const x of [0, hh]) for (let i = 0; i < n; i++) { const t = -Math.PI / 2 - Math.PI / n + (2 * Math.PI * i) / n; const y = rb * Math.cos(t); V.push([x * cb - y * sb, x * sb + y * cb, rb * Math.sin(t) + apo]); }
  } else {
    for (let i = 0; i < n; i++) V.push([rb * Math.cos(phi + (2 * Math.PI * i) / n), rb * Math.sin(phi + (2 * Math.PI * i) / n), 0]);
    if (kind === 'prism') for (let i = 0; i < n; i++) V.push([V[i][0], V[i][1], hh]); else V.push([0, 0, hh]);
  }
  const faces = [];
  const ring = [...Array(n).keys()];
  if (kind === 'prism') { faces.push(ring, ring.map((i) => n + i)); for (let i = 0; i < n; i++) faces.push([i, (i + 1) % n, n + ((i + 1) % n), n + i]); } else { faces.push(ring); for (let i = 0; i < n; i++) faces.push([i, (i + 1) % n, n]); }
  const C = V.reduce((s, p) => s.map((v, k) => v + p[k] / V.length), [0, 0, 0]);
  const VIEW = [0.3, -1, 0.42];
  const vis = faces.map((f) => {
    // 세 점으로 법선 → 몸의 가운데에서 바깥쪽으로
    const [a, b, c] = f.map((i) => V[i]);
    const u = b.map((v, k) => v - a[k]); const w = c.map((v, k) => v - a[k]);
    let nrm = [u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]];
    const fc = f.reduce((s, i) => s.map((v, k) => v + V[i][k] / f.length), [0, 0, 0]);
    if (nrm.reduce((s, v, k) => s + v * (fc[k] - C[k]), 0) < 0) nrm = nrm.map((v) => -v);
    return nrm.reduce((s, v, k) => s + v * VIEW[k], 0) > 0;
  });
  const edges = new Map();
  faces.forEach((f, fi) => f.forEach((a, k) => { const b = f[(k + 1) % f.length]; const key = a < b ? `${a}-${b}` : `${b}-${a}`; (edges.get(key) || edges.set(key, []).get(key)).push(fi); }));
  return { V, faces, vis, edges, proj: (p) => [p[0] + 0.3 * p[1], -p[2] - 0.42 * p[1]] };
}

test('🎨 각기둥·각뿔 그림: 따로 세운 몸과 꼭짓점 자리가 같다 · 점선 = 두 면이 다 안 보이는 모서리 · 선 수·점 수 = 규칙 · 이름표', () => {
  let n0 = 0; const seen = new Set();
  const check = (spec, at) => {
    const A = kv(spec.slice(spec.indexOf(' ') + 1)); const kind = spec.split(' ')[0];
    const svg = figureSvg(spec); at(svg, '안 그려짐');
    const phi = +attr(svg, 'data-phi'); const sc = +attr(svg, 'data-sc'); const rb = +attr(svg, 'data-rb'); const hh = +attr(svg, 'data-hh'); const lie = attr(svg, 'data-lie') === '1';
    const n = A.n; const B = rebuild(kind, n, phi, rb, hh, lie);
    // 길이가 적혀 있으면 그 길이대로 세웠나 — 밑면의 한 변 = 2 × 반지름 × sin(180°/n)
    if (typeof A.a === 'number') at(Math.abs(2 * rb * Math.sin(Math.PI / n) - A.a) < 1e-4, `밑면의 한 변 ${A.a}`);
    if (typeof A.h === 'number') at(Math.abs(hh - A.h) < 1e-4, `높이 ${A.h}`);
    if (typeof A.e === 'number') at(Math.abs(Math.hypot(rb, hh) - A.e) < 1e-4, `옆 모서리 ${A.e}`);
    const P = Object.fromEntries([...svg.matchAll(/class="sol-v" data-i="(\d+)" cx="([-\d.]+)" cy="([-\d.]+)"/g)].map((z) => [+z[1], [+z[2], +z[3]]]));
    at(Object.keys(P).length === B.V.length, `꼭짓점 ${Object.keys(P).length}`);
    B.V.forEach((p, i) => { const [x, y] = B.proj(p); at(Math.hypot(x * sc - P[i][0], y * sc - P[i][1]) < 0.2, `꼭짓점 ${i} 자리`); });
    const E = [...svg.matchAll(/<line class="sol-e" data-a="(\d+)" data-b="(\d+)" data-hid="([01])"[^>]*?(stroke-dasharray)?[^>]*\/>/g)].map((z) => ({ a: +z[1], b: +z[2], hid: z[3] === '1', dash: /stroke-dasharray/.test(z[0]) }));
    at(E.length === B.edges.size, `모서리 ${E.length} ≠ ${B.edges.size}`);
    at(E.length === RULE[kind].edge(n), `모서리 ${E.length}는 규칙 ${RULE[kind].edge(n)}과 다르다`);
    at(B.V.length === RULE[kind].vertex(n), '꼭짓점 수 = 규칙');
    for (const e of E) {
      const fs = B.edges.get(`${e.a}-${e.b}`); at(fs, `없는 모서리 ${e.a}-${e.b}`);
      const want = fs.every((fi) => !B.vis[fi]);
      at(e.hid === want && e.dash === want, `모서리 ${e.a}-${e.b} 점선 ${e.dash} ≠ ${want}`);
    }
    // 색칠: 밑면(b)이면 다각형 n각, 옆면(s)이면 사각형(각기둥)·삼각형(각뿔)
    const sh = [...svg.matchAll(/<polygon class="sol-f shade"[^>]*points="([^"]+)"/g)].map((z) => z[1].trim().split(/\s+/).length);
    if (A.shade === 'b') at(sh.length >= 1 && sh.every((k) => k === n), `색칠한 밑면 ${sh}`);
    if (A.shade === 's') at(sh.length === 1 && sh[0] === (kind === 'prism' ? 4 : 3), `색칠한 옆면 ${sh}`);
    // 이름표: 적힌 값 그대로, 자리 — a는 밑면 모서리 옆, h(각기둥)는 옆 모서리 옆, e는 옆 모서리 옆, h(각뿔)는 높이 점선 옆
    const boxes = checkLabels(svg, at);
    const segs = E.map((e) => ({ ...e, p: P[e.a], q: P[e.b] }));
    const dist = (b, p, q) => { const vx = q[0] - p[0]; const vy = q[1] - p[1]; const t = Math.max(0, Math.min(1, ((b.cx - p[0]) * vx + (b.cy - p[1]) * vy) / (vx * vx + vy * vy))); return Math.hypot(p[0] + vx * t - b.cx, p[1] + vy * t - b.cy); };
    for (const b of boxes) {
      const k = attr(b.raw, 'data-k'); const v = A[k]; at(b.t === (v === '?' ? '? cm' : `${v} cm`), `${k} 이름표 "${b.t}"`);
      if (k === 'h' && kind === 'pyramid') {
        const hl = linesOf(svg).find((l) => l.cls === 'sol-height');
        const dh = hl ? dist(b, [hl.x1, hl.y1], [hl.x2, hl.y2]) : Infinity;
        at(dh < 40, '높이 이름표가 점선에서 멀다');
        // 어느 모서리(숨은 점선 포함)보다 높이 점선에 가깝다 — 숨은 옆 모서리 위에 얹히면 "옆 모서리 = 높이"로 읽힌다 (Codex 25차 #5: [pyramid n=4 a=16 h=14 e=18]의 14 cm가 숨은 모서리에서 0.7 px)
        const closer = segs.filter((sg) => dist(b, sg.p, sg.q) <= dh + 0.5);
        at(!closer.length, `높이 이름표가 높이 점선(${dh.toFixed(1)})보다 모서리 ${closer.map((sg) => `${sg.a}-${sg.b}${sg.hid ? '(점선)' : ''} ${dist(b, sg.p, sg.q).toFixed(1)}`).join(', ')}에 가깝다`);
        continue;
      }
      const near = segs.filter((sg) => !sg.hid).sort((x, y) => dist(b, x.p, x.q) - dist(b, y.p, y.q))[0];
      const isBase = (sg) => (kind === 'prism' ? (sg.a < n) === (sg.b < n) : sg.b < n);
      if (k === 'a') at(isBase(near), `a 이름표 옆이 밑면 모서리가 아니다 (${near.a}-${near.b})`);
      if (k === 'h' || k === 'e') at(!isBase(near), `${k} 이름표 옆이 옆 모서리가 아니다 (${near.a}-${near.b})`);
    }
    at(/^\(정[삼사오육칠팔]각형을 밑면으로 하는 각(기둥|뿔) 그림/.test(figText(`[${spec}]`)), `글로 "${figText(`[${spec}]`)}"`);
    at(figText(`[${spec}]`, true) === '(그림)', '한 줄 요약은 (그림)');
    n0++;
  };
  // 생성기가 내는 그림 전부 + 칸마다 손으로 넣은 모양
  for (const { c, k, s, q } of every(['calc', 'misread'], FIG_SEEDS)) {
    for (const f of figsOf(q.q).filter((x) => x.kind === 'prism' || x.kind === 'pyramid')) {
      const spec = `${f.kind} ${f.arg}`; if (seen.has(spec)) continue; seen.add(spec);
      check(spec, (cond, msg) => assert.ok(cond, `${c.id} ${k} #${s} [${spec}]: ${msg}`));
    }
  }
  for (const kind of ['prism', 'pyramid']) for (let n = 3; n <= 8; n++) for (const extra of kind === 'prism' ? ['', ' shade=b', ' shade=s'] : ['', ' shade=s']) {
    const spec = `${kind} n=${n}${extra}`; if (seen.has(spec)) continue; seen.add(spec);
    check(spec, (cond, msg) => assert.ok(cond, `[${spec}]: ${msg}`));
  }
  for (let n = 3; n <= 6; n++) for (const extra of ['', ' shade=b', ' shade=s']) check(`prism n=${n} lie${extra}`, (cond, msg) => assert.ok(cond, `[prism n=${n} lie${extra}]: ${msg}`));
  assert.ok(n0 > 60, `그린 그림 ${n0}`);
  for (const bad of ['prism', 'prism n=2', 'prism n=9', 'prism n=5 n=5', 'prism n=7 lie', 'prism n=5 lie a=3', 'pyramid n=4 lie', 'pyramid n=4 a=8 h=7 e=10', 'prism n=5 shade=x', 'pyramid n=5 shade=b', 'cone r=3 h=4 l=6', 'cyl r=3 d=6', 'prism n=8 a=20 h=1']) assert.equal(figureSvg(bad), '', bad);
  assert.ok(renderFigures('글 [prism n=5] 글').includes('sol-fig'));
});

test('🎨 원기둥·원뿔·구 그림: 높이 ÷ 반지름이 실제와 같다 · 밑면은 타원(세로 0.42배) · 원뿔의 옆선은 밑면 타원에 닿는다 · 뒤쪽 호는 점선 · 이름표', () => {
  let n0 = 0; const seen = new Set();
  const check = (spec, at) => {
    const kind = spec.split(' ')[0]; const A = kv(spec.slice(spec.indexOf(' ') + 1));
    const svg = figureSvg(spec); at(svg, '안 그려짐');
    const R = +attr(svg, 'data-R');
    const ells = [...svg.matchAll(/class="sol-ell" data-part="(\w+)" data-cx="([-\d.]+)" data-cy="([-\d.]+)" data-rx="([-\d.]+)" data-ry="([-\d.]+)"/g)].map((z) => ({ part: z[1], cx: +z[2], cy: +z[3], rx: +z[4], ry: +z[5] }));
    for (const e of ells) at(Math.abs(e.rx - R) < 0.1 && Math.abs(e.ry - 0.42 * R) < 0.1, `타원 ${e.rx}×${e.ry}`);
    const back = [...svg.matchAll(/<path class="sol-ell" data-part="back"[^>]*\/>/g)];
    at(back.length === 1 && back.every((z) => /stroke-dasharray/.test(z[0])), '뒤쪽 호는 점선 하나');
    const r = A.r !== undefined ? A.r : A.d !== undefined ? A.d / 2 : null;
    if (kind === 'cyl' || kind === 'cone') {
      const top = kind === 'cyl' ? ells.find((e) => e.part === 'top') : null;
      const bottomCy = ells.find((e) => e.part === 'front').cy;
      const Hp = kind === 'cyl' ? bottomCy - top.cy : bottomCy - +/class="sol-gen"[^>]*x1="([-\d.]+)" y1="([-\d.]+)"/.exec(svg)[2];
      const h = A.h !== undefined && A.h !== '?' ? A.h : kind === 'cone' && typeof A.l === 'number' && typeof r === 'number' ? Math.sqrt(A.l * A.l - r * r) : null;
      if (typeof r === 'number' && typeof h === 'number') at(Math.abs(Hp / R - h / r) < 0.01, `높이/반지름 ${Hp / R} ≠ ${h / r}`);
      if (kind === 'cone') {
        // 옆선이 밑면 타원에 접한다 — 꼭짓점에서 그은 선이 접점에서 타원의 접선 방향
        for (const z of svg.matchAll(/<line class="sol-gen"[^>]*x1="([-\d.]+)" y1="([-\d.]+)" x2="([-\d.]+)" y2="([-\d.]+)"/g)) {
          const [ax, ay, tx, ty] = [+z[1], +z[2], +z[3], +z[4]]; const e = ells[0];
          const on = ((tx - e.cx) / e.rx) ** 2 + ((ty - e.cy) / e.ry) ** 2; at(Math.abs(on - 1) < 0.01, '옆선 끝이 타원 위가 아니다');
          const nx = (tx - e.cx) / (e.rx * e.rx); const ny = (ty - e.cy) / (e.ry * e.ry);
          const dot = (nx * (ax - tx) + ny * (ay - ty)) / (Math.hypot(nx, ny) * Math.hypot(ax - tx, ay - ty));
          at(Math.abs(dot) < 0.02, `옆선이 타원에 접하지 않는다 (${dot.toFixed(3)})`);
        }
        if ('h' in A) at(/class="sol-height"[^>]*stroke-dasharray/.test(svg), '원뿔의 높이는 점선');
      }
    }
    const boxes = checkLabels(svg, at);
    for (const b of boxes) { const k = attr(b.raw, 'data-k'); const v = A[k]; at(b.t === (v === '?' ? '? cm' : `${v} cm`), `${k} 이름표 "${b.t}"`); }
    at(figText(`[${spec}]`, true) === '(그림)', '한 줄 요약은 (그림)');
    n0++;
  };
  for (const { c, k, s, q } of every(['calc', 'misread'], FIG_SEEDS)) {
    for (const f of figsOf(q.q).filter((x) => ['cyl', 'cone', 'sphere'].includes(x.kind))) {
      const spec = `${f.kind} ${f.arg}`; if (seen.has(spec)) continue; seen.add(spec);
      check(spec, (cond, msg) => assert.ok(cond, `${c.id} ${k} #${s} [${spec}]: ${msg}`));
    }
  }
  for (const spec of ['cyl r=3 h=7', 'cyl d=10 h=4', 'cyl r=5 h=?', 'cone d=6 h=4', 'cone r=? h=8 l=10', 'sphere d=12', 'sphere r=?']) if (!seen.has(spec)) check(spec, (cond, msg) => assert.ok(cond, `[${spec}]: ${msg}`));
  assert.ok(n0 > 40, `그린 그림 ${n0}`);
});

test('🎨 돌리기 그림: 직사각형·직각삼각형·반원의 길이 비율 · 축은 왼쪽 세로 쇄선 · 이름표', () => {
  let n0 = 0; const seen = new Set();
  for (const { c, k, s, q } of every(['calc', 'misread'], FIG_SEEDS)) {
    for (const f of figsOf(q.q).filter((x) => x.kind === 'spin')) {
      const spec = `spin ${f.arg}`; if (seen.has(spec)) continue; seen.add(spec);
      const at = (cond, msg) => assert.ok(cond, `${c.id} ${k} #${s} [${spec}]: ${msg}`);
      const A = kv(f.arg); const svg = figureSvg(spec); at(svg, '안 그려짐');
      const axis = linesOf(svg).find((l) => l.cls === 'spin-axis'); at(axis && axis.x1 === 0 && axis.x2 === 0 && axis.dashed, '축');
      if (A._0 === 'half') {
        const m = /class="spin-shape" data-shape="half" data-d="(\d+)" d="M 0 (-?[\d.]+) A ([\d.]+)/.exec(svg); at(m && +m[1] === A._1 && Math.abs(-m[2] - +m[3]) < 0.1, '반원 — 지름이 축 위');
      } else {
        const pts = /class="spin-shape"[^>]*points="([^"]+)"/.exec(svg)[1].trim().split(/\s+/).map((p) => p.split(',').map(Number));
        const xs = pts.map((p) => p[0]); const ys = pts.map((p) => p[1]);
        const wpx = Math.max(...xs) - Math.min(...xs); const hpx = Math.max(...ys) - Math.min(...ys);
        at(Math.min(...xs) === 0, '도형이 축에 붙어 있다');
        at(Math.abs(wpx / hpx - A._1 / A._2) < 0.01, `가로 ÷ 세로 ${wpx / hpx} ≠ ${A._1 / A._2}`);
        at(pts.length === (A._0 === 'rect' ? 4 : 3), '꼭짓점 수');
      }
      const boxes = checkLabels(svg, at);
      at(boxes.length >= 1, '이름표');
      n0++;
    }
  }
  assert.ok(n0 > 30, `그린 그림 ${n0}`);
  for (const bad of ['spin rect 2 9', 'spin tri 3 4 c=6', 'spin half', 'spin circle 4', 'spin rect 4']) assert.equal(figureSvg(bad), '', bad);
});

test('🎨 각기둥 전개도: 옆면 수·가로·세로 · 밑면은 그 옆면 변에 붙은 정다각형(변 길이 모두 같음) · 직각삼각형 밑면은 접으면 맞닿는 옆면의 가로와 같은 변 · ?는 그 선분 옆 · 같은 쪽 밑면끼리 안 겹침', () => {
  let n0 = 0; const seen = new Set();
  const check = (arg, at) => {
    const A = kv(arg); const svg = figureSvg(`pnet ${arg}`); at(svg, '안 그려짐');
    const s = +attr(svg, 'data-s');
    const rects = [...svg.matchAll(/<rect class="pnet-r" data-i="(\d+)" x="([-\d.]+)" y="([-\d.]+)" width="([\d.]+)" height="([\d.]+)"/g)].map((z) => ({ i: +z[1], x: +z[2], y: +z[3], w: +z[4], h: +z[5] }));
    const n = A.rt ? 3 : A.n; const S = A.rt ? 3 : (A.s || A.n);
    at(rects.length === S, `옆면 ${rects.length}`);
    const widths = A.rt ? String(A.rt).split(',').map(Number) : Array(S).fill(typeof A.a === 'number' ? A.a : null);
    rects.forEach((r, i) => { if (widths[i] !== null) at(Math.abs(r.w / s - widths[i]) < 0.02, `옆면 ${i} 가로 ${r.w / s}`); if (typeof A.h === 'number') at(Math.abs(r.h / s - A.h) < 0.02, `옆면 세로 ${r.h / s}`); });
    const bases = [...svg.matchAll(/<polygon class="pnet-b" data-side="(up|dn)" data-i="(\d+)" points="([^"]+)"/g)].map((z) => ({ side: z[1], i: +z[2], pts: z[3].trim().split(/\s+/).map((p) => p.split(',').map(Number)) }));
    const up = A.up === undefined ? [] : String(A.up).split(',').map(Number); const dn = A.dn === undefined ? [] : String(A.dn).split(',').map(Number);
    at(bases.length === up.length + dn.length, '밑면 수');
    for (const b of bases) {
      const r = rects[b.i]; const y = b.side === 'up' ? r.y : r.y + r.h;
      const has = (x) => b.pts.some((p) => Math.abs(p[0] - x) < 0.2 && Math.abs(p[1] - y) < 0.2);
      at(has(r.x) && has(r.x + r.w), `밑면이 옆면 ${b.i}의 ${b.side} 변에 붙지 않았다`);
      at(b.pts.every((p) => (b.side === 'up' ? p[1] <= y + 0.2 : p[1] >= y - 0.2)), '밑면이 바깥쪽으로');
      at(b.pts.length === n, `밑면 ${b.pts.length}각형`);
      const sides = b.pts.map((p, k) => Math.hypot(b.pts[(k + 1) % n][0] - p[0], b.pts[(k + 1) % n][1] - p[1]) / s);
      if (A.rt) {
        // 붙은 변의 왼쪽 끝에서 나온 변 = 왼쪽(고리로) 옆면의 가로, 오른쪽 끝에서 나온 변 = 오른쪽 옆면의 가로 — 접으면 맞닿는다
        const left = b.pts.find((p) => !(Math.abs(p[1] - y) < 0.2)); const L = Math.hypot(left[0] - r.x, left[1] - y) / s; const Rr = Math.hypot(left[0] - (r.x + r.w), left[1] - y) / s;
        at(Math.abs(L - widths[(b.i + 2) % 3]) < 0.02 && Math.abs(Rr - widths[(b.i + 1) % 3]) < 0.02, `직각삼각형 변 ${L.toFixed(2)}·${Rr.toFixed(2)} ≠ 맞닿는 옆면 ${widths[(b.i + 2) % 3]}·${widths[(b.i + 1) % 3]}`);
      } else at(sides.every((v) => Math.abs(v - sides[0]) < 0.3 / s), `정다각형이 아니다 ${sides.map((v) => v.toFixed(3))}`); // 좌표는 소수 첫째 자리로 적힌다 — 0.3픽셀까지
    }
    // 같은 쪽 밑면끼리 안 겹침
    for (const side of ['up', 'dn']) {
      const bs = bases.filter((b) => b.side === side).map((b) => [Math.min(...b.pts.map((p) => p[0])), Math.max(...b.pts.map((p) => p[0]))]).sort((p, q) => p[0] - q[0]);
      for (let k = 1; k < bs.length; k++) at(bs[k][0] > bs[k - 1][1], '같은 쪽 밑면이 겹친다');
    }
    at(attr(svg, 'data-valid') === (S === n && up.length === 1 && dn.length === 1 ? '1' : '0'), 'valid');
    const boxes = checkLabels(svg, at);
    const q = boxes.find((b) => b.t === '? cm');
    if (A.q) {
      at(q, '? 이름표 없음');
      // ?는 그 선분 옆 — 가장 가까운 실선의 data-k
      const lines = [...svg.matchAll(/<line class="(pnet-cut|pnet-fold)"([^>]*)\/>/g)].map((z) => ({ k: attr(z[2], 'data-k'), i: attr(z[2], 'data-i'), x1: +attr(z[2], 'x1'), y1: +attr(z[2], 'y1'), x2: +attr(z[2], 'x2'), y2: +attr(z[2], 'y2') }));
      const d = (l) => { const vx = l.x2 - l.x1; const vy = l.y2 - l.y1; const t = Math.max(0, Math.min(1, ((q.cx - l.x1) * vx + (q.cy - l.y1) * vy) / (vx * vx + vy * vy))); return Math.hypot(l.x1 + vx * t - q.cx, l.y1 + vy * t - q.cy); };
      const near = lines.sort((x, y) => d(x) - d(y))[0];
      const want = { base: (k) => /^up\d/.test(k), end: (k, i) => k === 'end' && i === 'L', w: (k) => k === 'top' || k === 'bottom', up0: (k) => /^up\d/.test(k), up1: (k) => /^up\d/.test(k), dn0: (k) => /^dn\d/.test(k), dn1: (k) => /^dn\d/.test(k) }[A.q];
      at(want(near.k, near.i), `? 옆 선분이 ${near.k}/${near.i}`);
      const len = Math.hypot(near.x2 - near.x1, near.y2 - near.y1) / s;
      if (A.rt) { const at0 = A.q.startsWith('up') ? up[0] : dn[0]; const wv = A.q.endsWith('0') ? widths[(at0 + 2) % 3] : widths[(at0 + 1) % 3]; at(Math.abs(len - wv) < 0.02, `? 선분 길이 ${len} ≠ ${wv}`); }
      if (A.q === 'base' && typeof A.a === 'number') at(Math.abs(len - A.a) < 0.02, `? 선분 길이 ${len}`);
      if (A.q === 'end' && typeof A.h === 'number') at(Math.abs(len - A.h) < 0.02, `? 선분 길이 ${len}`);
    }
    at(figText(`[pnet ${arg}]`, true) === '(그림)', '한 줄 요약');
    n0++;
  };
  for (const { c, k, s, q } of every(['calc', 'misread'], FIG_SEEDS)) {
    for (const f of figsOf(q.q).filter((x) => x.kind === 'pnet')) {
      if (seen.has(f.arg)) continue; seen.add(f.arg);
      check(f.arg, (cond, msg) => assert.ok(cond, `${c.id} ${k} #${s} [pnet ${f.arg}]: ${msg}`));
    }
  }
  assert.ok(n0 > 150, `그린 그림 ${n0}`);
  for (const bad of ['pnet n=5', 'pnet n=5 up=5', 'pnet n=5 s=7 up=0 dn=1', 'pnet n=6 up=0,1', 'pnet rt=3,4,8 up=0 dn=1', 'pnet n=5 up=0 dn=1 q=up0', 'pnet rt=3,4,5 up=0 dn=1 q=base', 'pnet n=4 up=1 dn=1 q=base,']) assert.equal(figureSvg(bad), '', bad);
});

test('🎨 원기둥 전개도: 옆면 가로 = 2 × 3.14… × 반지름(같은 비율) · 원은 위·아래(same은 둘 다 위, diff는 아래가 작음, para는 평행사변형) · 적힌 가로 = 지름 × 3.14 · 이름표', () => {
  let n0 = 0; const seen = new Set();
  for (const { c, k, s, q } of every(['calc', 'misread'], FIG_SEEDS)) {
    for (const f of figsOf(q.q).filter((x) => x.kind === 'cnet')) {
      if (seen.has(f.arg)) continue; seen.add(f.arg);
      const at = (cond, msg) => assert.ok(cond, `${c.id} ${k} #${s} [cnet ${f.arg}]: ${msg}`);
      const A = kv(f.arg); const svg = figureSvg(`cnet ${f.arg}`); at(svg, '안 그려짐');
      const quad = /class="cnet-side" points="([^"]+)"/.exec(svg)[1].trim().split(/\s+/).map((p) => p.split(',').map(Number));
      const W = quad[1][0] - quad[0][0]; const H = quad[3][1] - quad[0][1];
      const cs = [...svg.matchAll(/class="cnet-c" data-r="[^"]*" cx="([-\d.]+)" cy="([-\d.]+)" r="([\d.]+)"/g)].map((z) => ({ cx: +z[1], cy: +z[2], r: +z[3] }));
      at(cs.length === 2, '원 2개');
      at(Math.abs(W / (2 * Math.PI * cs[0].r) - 1) < 0.005, `옆면 가로 ÷ 위 원의 둘레 ${W / (2 * Math.PI * cs[0].r)}`);
      const r = A.r !== undefined ? A.r : A.d / 2;
      if (typeof r === 'number' && typeof A.h === 'number') at(Math.abs((H / cs[0].r) - A.h / r) < 0.01, '세로 ÷ 반지름');
      if (A.w && A.w !== '?') at(toCents(A.w) === 2 * r * 314, `적힌 가로 ${A.w} ≠ 지름 × 3.14`);
      const isPara = Math.abs(quad[3][0] - quad[0][0]) > 0.5;
      at(isPara === !!A.para, '평행사변형');
      const above = cs.filter((x) => x.cy < 0).length;
      at(A.same ? above === 2 : above === 1, '원의 자리');
      at(A.diff ? cs[1].r < cs[0].r - 1 : Math.abs(cs[1].r - cs[0].r) < 0.1, '원의 크기');
      // 원은 옆면에 붙어 있다 (위: 아랫점이 윗변에, 아래: 윗점이 아랫변에)
      for (const x of cs) at(Math.abs(x.cy < 0 ? x.cy + x.r : x.cy - x.r - H) < 0.2, '원이 옆면에서 떨어졌다');
      const boxes = checkLabels(svg, at);
      for (const b of boxes) { const kk = attr(b.raw, 'data-k'); const v = A[kk]; at(b.t === (v === '?' ? '? cm' : `${v} cm`), `${kk} 이름표 "${b.t}"`); }
      n0++;
    }
  }
  assert.ok(n0 > 40, `그린 그림 ${n0}`);
  for (const bad of ['cnet', 'cnet r=3 h=5 w=18.85', 'cnet r=3 d=6 h=5', 'cnet r=3 h=5 same diff', 'cnet r=20 h=5', 'cnet r=3 h=30']) assert.equal(figureSvg(bad), '', bad);
});

// ───────────────────── 숫자판·진단 ─────────────────────

test('🔢 숫자판: 수가 답인 ①만 숫자판 · 단위는 질문 끝에서 (cm·개) · 모든 수 보기를 칠 수 있다', () => {
  const pv = readFileSync(new URL('../js/padview.js', import.meta.url), 'utf8');
  const MAX = +/const MAX = (\d+);/.exec(pv)[1];
  const units = new Set();
  for (const { c, s, q } of every(['calc'], 200)) {
    const ok = q.choices.find((x) => x.ok).text;
    const spec = padSpec(q, 'solid');
    assert.equal(!!spec, valueOf(ok) !== null, `${c.id} #${s}: 정답 "${ok}" 숫자판 ${!!spec}`);
    if (!spec) continue;
    const want = (/몇 (cm|개)/.exec(lastLine(q.q)) || [])[1] || '';
    assert.equal(spec.unit, want, `${c.id} #${s}: 숫자판 단위\n${q.q}`);
    units.add(spec.unit);
    for (const ch of q.choices) {
      if (valueOf(ch.text) === null) continue;
      assert.ok(String(ch.text).length <= MAX, `${c.id} #${s}: "${ch.text}"는 ${String(ch.text).length}글자 > ${MAX}`);
      const hit = matchTyped(q, readTyped('num', { x: String(ch.text) }, spec), spec);
      assert.equal(q.choices[hit.i], ch, `${c.id} #${s}: "${ch.text}"를 쳐도 그 보기로 안 간다`);
    }
  }
  assert.deepEqual([...units].sort(), ['cm', '개'].sort());
});

test('📏 진단·사다리·한 편·배움 예비·내용 검사', () => {
  const d = diagnosticSet(7, 5, OPTS);
  assert.equal(d.length, 5);
  assert.deepEqual(d.map((q) => q.concept), ['sol.parts', 'sol.elem', 'sol.pnet', 'sol.sphere', 'sol.apply']);
  assert.deepEqual(placeFrom(d.map((q, i) => ({ concept: q.concept, correct: i < 2 }))), { startId: 'sol.pnet', knownIds: ['sol.parts', 'sol.name', 'sol.elem', 'sol.rule'] });
  const L0 = ladder([]);
  assert.equal(L0[0].state, 'now');
  assert.ok(L0.slice(1).every((r) => r.state === 'locked'));
  for (const c of SOLID) {
    const round = makeRound(c.id, 11, OPTS);
    assert.ok(round.length >= 2 && round.every((q) => q.concept === c.id), c.id);
    const les = lessonOf(c.id, 3, OPTS);
    assert.ok(les.pages.length >= 1 && les.title === c.name);
  }
  assert.ok(checkContent({}).length >= 9, '빈 원고는 칸마다 걸린다');
});

test('★ 그림이 거짓말하지 않는 수 — 각뿔 (밑면의 한 변, 높이, 옆 모서리)·원뿔 (반지름, 높이, 모선)은 피타고라스로 맞는 자연수', () => {
  for (const { c, k, s, q } of every(['calc', 'misread'], 300)) {
    for (const f of figsOf(q.q)) {
      const A = kv(f.arg);
      if (f.kind === 'pyramid' && [A.a, A.h, A.e].every((v) => typeof v === 'number')) {
        const rb = A.a / (2 * Math.sin(Math.PI / A.n)); assert.ok(Math.abs(A.e * A.e - (A.h * A.h + rb * rb)) < 1e-6, `${c.id} ${k} #${s}: ${f.raw}`);
      }
      if (f.kind === 'cone' && [A.r, A.h, A.l].every((v) => typeof v === 'number')) assert.equal(A.l * A.l, A.r * A.r + A.h * A.h, `${c.id} ${k} #${s}: ${f.raw}`);
      if (f.kind === 'spin' && A.c !== undefined) assert.equal(A.c * A.c, A._1 * A._1 + A._2 * A._2, `${c.id} ${k} #${s}: ${f.raw}`);
    }
  }
});

// ───────────────────── 2단계: 원고 (coach/math/solid.json) ─────────────────────

const CONTENT = JSON.parse(readFileSync(new URL('../coach/math/solid.json', import.meta.url), 'utf8'));
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
const stripU = (t) => String(t).replace(/ ?(cm|개)$/, '');

test('원고(solid.json)가 형식 검사를 통과한다 — 9칸 모두 배움 3~5장·확인 질문 3개↑·아빠 카드(함정·통과 기준)', () => {
  assert.deepEqual(checkContent(CONTENT), []);
  for (const id of IDS) {
    const v = CONTENT[id];
    assert.ok(v.lesson.length >= 3 && v.lesson.length <= 5, `${id}: ${v.lesson.length}장`);
    assert.ok(v.lesson.filter((p) => p.check).length >= 3, `${id}: 확인 질문 ${v.lesson.filter((p) => p.check).length}개`);
    assert.ok(v.dad.traps.length >= 2 && v.dad.say.length >= 2, id);
    const les = lessonOf(id, 1, { ...OPTS, content: CONTENT });
    assert.equal(les.pages.length, v.lesson.length);
    assert.ok(!/\{(me|mon)/.test(les.pages.map((p) => p.say + (p.check ? p.check.q + p.check.why : '')).join('')), `${id}: 자리표시가 남음`);
  }
});

test('★ 원고 확인 질문도 따로 풀어 대조 — 전부 읽히고, 정답은 맞고, 오답 하나하나가 이름표 있는 틀린 생각이다 · 수 보기는 질문 끝 단위', () => {
  let solved = 0; const types = new Set();
  for (const id of IDS) {
    for (const [i, p] of CONTENT[id].lesson.entries()) {
      if (!p.check) continue;
      const q = fillC(p.check.q); const ok = fillC(p.check.ok); const no = p.check.no.map(fillC);
      const where = `${id}[${i}]: ${q}`;
      const { type, ans, f } = solveText(q);
      // 수 답은 단위를 떼고("12개" → 12, "31.4 cm" → 31.4), 문장·이름 답은 그대로
      const same = (t) => t === ans || stripU(t) === ans;
      assert.ok(same(ok), `${where} (${type}): 정답 "${ok}" ≠ 따로 푼 답 "${ans}"`);
      for (const n of no) {
        assert.ok(!same(n), `${where}: 오답 "${n}"이 맞는 답`);
        // 오답이 어느 틀린 생각인지 — 그 문제 종류의 이름표 하나의 뜻에 맞아야 한다 (아무 수나 쓰지 않았다)
        const tags = Object.keys(TAGV[type] || {});
        assert.ok(tags.some((tag) => tagHolds(type, tag, f, stripU(n)) || tagHolds(type, tag, f, n)), `${where}: 오답 "${n}"은 어느 틀린 생각인가 (${type})`);
      }
      // "몇 cm" 질문의 보기는 모두 "수 cm", "몇 개" 질문은 "수개"
      const unit = (/몇 (cm|개)/.exec(lastLine(q)) || [])[1];
      if (unit) for (const t of [ok, ...no]) assert.match(t, unit === 'cm' ? /^\d+(\.\d+)? cm$/ : /^\d+개$/, `${where}: 보기 "${t}"`);
      types.add(type);
      solved++;
    }
  }
  assert.equal(solved, IDS.reduce((a, id) => a + CONTENT[id].lesson.filter((p) => p.check).length, 0));
  assert.ok(solved >= 36, `따로 푼 확인 질문 ${solved}`);
  assert.ok(types.size >= 25, `확인 질문이 다룬 문제 종류 ${types.size} — 같은 모양만 묻지 않게`);
});

/** 글을 그림 지시문으로 나눈다 — 그림마다 뒤따르는 글(첫 그림은 앞 글까지)이 그 그림을 말한다 */
function figParts(raw) {
  const parts = fillC(raw).replace(/\*\*/g, '').split(/(\[[a-z]+ [^\]]+\])/g);
  const figs = [];
  for (let k = 1; k < parts.length; k += 2) {
    const m = /^\[([a-z]+) (.+)\]$/.exec(parts[k]);
    figs.push({ kind: m[1], arg: m[2], A: kv(m[2]), raw: parts[k], text: parts[k + 1] || '' });
  }
  if (figs.length) figs[0].text = `${parts[0]}\n${figs[0].text}`;
  return { figs, text: parts.filter((_, k) => k % 2 === 0).join('\n') };
}
const WHAT = { 면: 'face', 꼭짓점: 'vertex', 모서리: 'edge' };
/** 그림 하나에 대해 글이 말하는 것 — [그림과 맞나, 글] 목록. 값은 이 파일이 그림 지시문·그린 SVG에서 따로 구한다 */
function figClaims(f, t) {
  const out = []; const A = f.A;
  const each = (re, fn) => { for (const m of t.matchAll(re)) out.push([fn(m), m[0]]); };
  if (f.kind === 'prism' || f.kind === 'pyramid') {
    const kind = f.kind; const n = A.n; const R = RULE[kind];
    const G = solidCounts(figureSvg(`${kind} ${f.arg}`));
    each(/(꼭짓점|모서리)[은는] [^.\n]*?= (\d+)개/g, (m) => +m[2] === R[WHAT[m[1]]](n));
    each(/점선은 (\d+)개/g, (m) => +m[1] === G.edges - G.visEdges);
    each(/옆면이 (\d+)개/g, (m) => +m[1] === n);
    each(/밑면이 ([가-힣]+각형)이라서 ([가-힣]+각(?:기둥|뿔))/g, (m) => m[1] === POLY(n) && m[2] === NAME[kind](n));
    each(/([일이삼사오육칠팔구십]+각(?:기둥|뿔))의 (?:모서리|꼭짓점)/g, (m) => m[1] === NAME[kind](n));
    each(/색칠한 ([가-힣]+?)(?:과|와) /g, (m) => (A.shade === 'b' ? ['윗면', '밑면', POLY(n)] : ['옆면', '직사각형']).includes(m[1]));
    each(/높이(?:는|가)? (\d+) cm/g, (m) => +m[1] === A.h);
    each(/옆 모서리 (\d+) cm/g, (m) => +m[1] === (kind === 'prism' ? A.h : A.e));
    each(/밑면의 (?:한 변|모서리) (\d+) cm/g, (m) => +m[1] === A.a);
    each(/모서리 길이의 합은 [^.\n]*?= (\d+) cm/g, (m) => +m[1] === (kind === 'prism' ? 2 * n * A.a + n * A.h : n * A.a + n * A.e));
    if (A.a === '?') {
      const S = +(/합이 (\d+) cm/.exec(t) || [])[1];
      each(/한 변은 [^.\n]*?= (\d+) cm/g, (m) => +m[1] === (S - n * A.h) / (2 * n));
    }
  }
  if (['cyl', 'cone', 'sphere'].includes(f.kind)) {
    const r = A.r !== undefined ? A.r : A.d / 2;
    const h = A.h !== undefined ? A.h : f.kind === 'cone' && A.l !== undefined ? Math.sqrt(A.l * A.l - r * r) : undefined;
    const l = A.l !== undefined ? A.l : f.kind === 'cone' ? Math.hypot(r, h) : undefined;
    each(/반지름(?:은|이)? (\d+) cm/g, (m) => +m[1] === r);
    each(/높이(?:는|가)? (\d+) cm/g, (m) => +m[1] === h);
    each(/모선(?:은 모두|은|이)? (\d+) cm/g, (m) => +m[1] === l);
    each(/지름은 [^.\n]*?= (\d+) cm/g, (m) => +m[1] === 2 * r);
  }
  if (f.kind === 'spin') {
    const sh = A._0;
    each(/돌리면 (원기둥|원뿔|구)/g, (m) => m[1] === { rect: '원기둥', tri: '원뿔', half: '구' }[sh]);
    if (sh === 'half') {
      each(/반원의 지름 (\d+) cm/g, (m) => +m[1] === A._1);
      each(/반지름은 [^.\n]*?= (\d+) cm/g, (m) => +m[1] === A._1 / 2);
    } else {
      each(/(\d+) cm가 밑면의 반지름/g, (m) => +m[1] === A._1);
      each(/축에 붙은 변 (\d+) cm가 높이/g, (m) => +m[1] === A._2);
      each(/빗변 (\d+) cm가 모선/g, (m) => +m[1] === A.c);
    }
  }
  if (f.kind === 'pnet') {
    const n = A.rt ? 3 : A.n; const s = A.rt ? 3 : (A.s || A.n);
    const up = A.up === undefined ? [] : String(A.up).split(',').map(Number); const dn = A.dn === undefined ? [] : String(A.dn).split(',').map(Number);
    const valid = s === n && up.length === 1 && dn.length === 1;
    each(/직사각형이? (\d+)개/g, (m) => +m[1] === s);
    each(/정다각형 (\d+)개/g, (m) => +m[1] === up.length + dn.length);
    each(/밑면 ([가-힣]+각형) (\d+)개/g, (m) => m[1] === POLY(n) && +m[2] === up.length + dn.length);
    each(/밑면은 ([가-힣]+각형)/g, (m) => m[1] === POLY(n));
    each(/이 ([가-힣]+각기둥)의 전개도/g, (m) => m[1] === NAME.prism(n));
    each(/전개도가 아니에요/g, () => !valid);
    each(/위와 아래에 하나씩 붙어/g, () => up.length === 1 && dn.length === 1);
    each(/두 밑면이 모두 위/g, () => up.length === 2 && dn.length === 0);
    each(/밑면의 한 변 = (\d+) cm/g, (m) => +m[1] === A.a);
    each(/높이 = (\d+) cm/g, (m) => +m[1] === A.h);
    if (A.rt) {
      const w = String(A.rt).split(',').map(Number);
      each(/(?:세 변|가로도) (\d+) cm, (\d+) cm, (\d+) cm/g, (m) => [1, 2, 3].every((j) => +m[j] === w[j - 1]));
      // 위쪽 삼각형의 두 변이 접으면 맞닿는 옆 직사각형 (옆면 줄은 고리 — 붙은 칸의 왼쪽·오른쪽 칸), 빗변은 가장 긴 변 (Codex 25차 제안)
      each(/위쪽 삼각형의 왼쪽 변 (\d+) cm는 접으면 왼쪽 직사각형의 가로 (\d+) cm와, 빗변 (\d+) cm는 오른쪽 직사각형의 가로 (\d+) cm와 맞닿아요/g, (m) => {
        const i = up[0]; const L = w[(i + 2) % 3]; const Rw = w[(i + 1) % 3];
        return +m[1] === L && +m[2] === L && +m[3] === Rw && +m[4] === Rw && Rw === Math.max(...w);
      });
      each(/높이 (\d+) cm/g, (m) => +m[1] === A.h);
    }
  }
  if (f.kind === 'cnet') {
    const r = A.r !== undefined ? A.r : A.d / 2;
    each(/반지름(?:은|이)? (\d+) cm/g, (m) => +m[1] === r);
    each(/(?<!반)지름 (\d+) cm/g, (m) => +m[1] === 2 * r);
    each(/높이 (\d+) cm/g, (m) => +m[1] === A.h);
    each(/세로는? (\d+) cm/g, (m) => +m[1] === A.h);
    each(/(\d+) × 3\.14 = (\d+(?:\.\d+)?)/g, (m) => +m[1] === 2 * r && toCents(m[2]) === 2 * r * 314);
    each(/가로 (\d+(?:\.\d+)?) cm는 밑면의 둘레/g, (m) => toCents(m[1]) === 2 * r * 314);
    each(/아래 원이 위 원보다 작아요/g, () => !!A.diff);
    each(/전개도가 아니에요/g, () => !!(A.same || A.diff || A.para));
    each(/위와 아래에 하나씩 붙어/g, () => !A.same);
  }
  return out;
}
/** 그림 없이 글로만 말하는 것 — 규칙 표·이름·거꾸로·본 모양 */
function textClaims(t) {
  const out = [];
  const each = (re, fn) => { for (const m of t.matchAll(re)) out.push([fn(m), m[0]]); };
  each(/([일이삼사오육칠팔구십]+)각(기둥|뿔)\(□ = (\d+)\): 면 (\d+)개, 꼭짓점 (\d+)개, 모서리 (\d+)개/g, (m) => {
    const R = RULE[m[2] === '기둥' ? 'prism' : 'pyramid']; const n = +m[3];
    return korean(n) === m[1] && +m[4] === R.face(n) && +m[5] === R.vertex(n) && +m[6] === R.edge(n);
  });
  each(/밑면의 변이 (\d+)개 → 밑면은 ([가-힣]+각형) → ([가-힣]+각기둥)·([가-힣]+각뿔)/g, (m) => m[2] === POLY(+m[1]) && m[3] === NAME.prism(+m[1]) && m[4] === NAME.pyramid(+m[1]));
  each(/밑면의 변이 (\d+)개인 (각기둥|각뿔): (면|꼭짓점|모서리) [^=\n]*= (\d+)개/g, (m) => +m[4] === RULE[KIND_KO[m[2]]][WHAT[m[3]]](+m[1]));
  each(/(모서리|면|꼭짓점)[이가] (\d+)개인 (각기둥|각뿔): [^\n]*→ ([가-힣]+각(?:기둥|뿔))/g, (m) => {
    const kind = KIND_KO[m[3]]; const n = [...Array(40).keys()].find((k) => k >= 3 && RULE[kind][WHAT[m[1]]](k) === +m[2]);
    return !!n && m[4] === NAME[kind](n);
  });
  each(/면이 (\d+)개, 꼭짓점이 (\d+)개, 모서리가 (\d+)개 → [^\n]*→ ([가-힣]+각(?:기둥|뿔))/g, (m) => {
    const [F, V, E] = [+m[1], +m[2], +m[3]]; const kind = F === V ? 'pyramid' : 'prism'; const n = kind === 'pyramid' ? F - 1 : E / 3;
    return ['face', 'vertex', 'edge'].every((w, j) => RULE[kind][w](n) === [F, V, E][j]) && m[4] === NAME[kind](n);
  });
  each(/(원기둥|원뿔|구): 위에서 보면 ([가-힣]+), 앞에서 보면 ([가-힣]+)/g, (m) => VIEWS[m[1]]['위'] === m[2] && VIEWS[m[1]]['앞'] === m[3]);
  each(/· 위 ([가-힣]+), 앞 ([가-힣]+) → (원기둥|원뿔|구)/g, (m) => VIEWS[m[3]]['위'] === m[1] && VIEWS[m[3]]['앞'] === m[2]);
  each(/옆면의 가로가 (\d+(?:\.\d+)?) cm일 때[^\n]*반지름은 [^=\n]*= (\d+) cm/g, (m) => toCents(m[1]) === 2 * +m[2] * 314);
  return out;
}
const lenLabels = (svg) => [...svg.matchAll(/<text[^>]*>(\d+(?:\.\d+)?) (cm|m)<\/text>/g)].map((z) => `${z[1]} ${z[2]}`);

test('★ 원고의 그림: 모두 그려지고, 배움 글·확인 질문이 말하는 것 = 그 그림 (면·꼭짓점·모서리 수·점선·이름·길이·돌린 모양·전개도가 되나·옆면의 가로) · 그림에 적힌 길이는 배움 글에도', () => {
  let n = 0; let claims = 0; let labels = 0;
  for (const id of IDS) {
    for (const [i, p] of CONTENT[id].lesson.entries()) {
      for (const [where, raw] of [['say', p.say], ['check', p.check ? p.check.q : '']]) {
        const { figs, text } = figParts(raw);
        const at = (cond, msg) => assert.ok(cond, `${id}[${i}] ${where}: ${msg}\n${text}`);
        for (const f of figs) {
          const svg = figureSvg(`${f.kind} ${f.arg}`);
          at(svg, `못 그리는 ${f.raw}`);
          at(/^(prism|pyramid|cyl|cone|sphere|spin|pnet|cnet|cuboid)$/.test(f.kind), `P 줄기 그림만 쓴다 ${f.raw}`);
          n++;
          // 그림에 적힌 길이는 배움 글에도 (확인 질문은 생성기 문제처럼 그림이 길이를 알려 준다)
          if (where === 'say') for (const L of lenLabels(svg)) { at(text.includes(L), `글에 "${L}"이 없다 (${f.raw})`); labels++; }
          for (const [ok, what] of figClaims(f, f.text)) { at(ok, `"${what}" ≠ 그림 ${f.raw}`); claims++; }
        }
        for (const [ok, what] of textClaims(text)) { at(ok, `"${what}"이 규칙과 다르다`); claims++; }
      }
    }
  }
  assert.ok(n >= 55, `그림 ${n}`);
  assert.ok(labels >= 30, `글과 대조한 그림 길이 ${labels}`);
  assert.ok(claims >= 80, `글이 말한 것을 그림·규칙과 대조한 곳 ${claims} (검사가 빈 채 통과하지 않게)`);
});

test('★ 원고의 조사·셈식·아직 안 배운 말·틀린 일반화 (배움 글·확인 질문·아빠 카드 전부)', () => {
  const BAT = new Set(['0', '1', '3', '6', '7', '8']);
  const PAIRS = [['을', '를'], ['은', '는'], ['이', '가'], ['과', '와'], ['이에요', '예요'], ['이니까', '니까'], ['이라서', '라서']];
  const jong = (ch) => { const code = ch.charCodeAt(0) - 0xac00; return code >= 0 && code < 11172 ? code % 28 : -1; };
  const ev = (expr) => Function(`return (${expr.replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-')})`)();
  let exprs = 0; let hitN = 0; let hitW = 0;
  for (const id of IDS) {
    const all = contentText(CONTENT[id]).replace(/\[[a-z]+ [^\]]+\]/g, '').replace(/\*\*/g, '');
    for (const [wb, nb] of PAIRS) {
      // 템플릿 글자 안이라 \\d · \\s (N 2단계에서 \d 한 번만 써서 검사가 빈 채 통과한 적 있다)
      for (const m of all.matchAll(new RegExp(`(\\d)(${wb}|${nb})(?=[\\s.,!?)—]|$)`, 'g'))) { assert.equal(m[2], BAT.has(m[1]) ? wb : nb, `${id}: "…${m[1]}${m[2]}"`); hitN++; }
      for (const m of all.matchAll(new RegExp(`(각기둥|각뿔|각형|원기둥|원뿔|밑면|옆면|모선|꼭짓점|모서리|높이|반지름|지름|직사각형|삼각형|입체도형|(?<![가-힣])구|(?<![가-힣])원|(?<![가-힣])면)(${wb}|${nb})(?=[\\s.,!?)—]|$)`, 'g'))) {
        assert.equal(m[2], jong(m[1].slice(-1)) > 0 ? wb : nb, `${id}: "…${m[1]}${m[2]}"`); hitW++;
      }
    }
    for (const m of all.matchAll(/(\d)(으로|로)(?=[\s.,]|$)/g)) assert.equal(m[2], ['1', '7', '8'].includes(m[1]) ? '로' : BAT.has(m[1]) ? '으로' : '로', `${id}: "…${m[1]}${m[2]}"`);
    assert.ok(!/cm(은|을|이 |과|이에요|으로)/.test(all), `${id}: 단위 뒤 조사\n${all.match(/.*cm(은|을|이 |과|이에요|으로).*/)?.[0]}`);
    for (const m of all.matchAll(/(?<![\d.□])(\d+(?:\.\d+)?(?: [+−×÷] \d+(?:\.\d+)?)+) = (\d+(?:\.\d+)?)/g)) { assert.ok(Math.abs(ev(m[1]) - Number(m[2])) < 1e-6, `${id}: ${m[0]}`); exprs++; }
    const at = IDS.indexOf(id);
    for (const [re, first] of FIRST) if (IDS.indexOf(first) > at) assert.ok(!re.test(all), `${id}: 아직 안 배운 ${re}\n${all.match(new RegExp(`.*(${re.source}).*`))?.[0]}`);
    const truths = contentTruths(CONTENT[id]);
    for (const [re, why] of BAD) assert.ok(!re.test(truths), `${id}: ${why}\n${truths.match(new RegExp(`.*${re.source}.*`))?.[0]}`);
  }
  assert.ok(exprs >= 35, `원고 속 셈식 ${exprs}`);
  assert.ok(hitN >= 8 && hitW >= 300, `조사를 실제로 본 곳: 수 ${hitN} · 이름 ${hitW} (검사가 빈 채 통과하지 않게)`);
});

// ───────────────────── 3단계: 화면 연결 ─────────────────────

test('화면 연결 (3단계): STEMS.solid(P)는 이 생성기·원고를 쓰고, 앱 셸이 둘 다 들고 간다 · 그림 이름을 모든 그리는 자리가 안다 · ❓ 복사문·📊 답장 안내에 [prism]·[cyl] 예 · 사다리 안내에 O·N 줄기', async () => {
  const { STEMS, STEM_ORDER, stemOf } = await import('../js/mathprog.js');
  assert.equal(STEMS.solid.code, 'P');
  assert.equal(STEM_ORDER[STEM_ORDER.indexOf('cuboid') + 1], 'solid', 'O 직육면체 바로 뒤');
  assert.equal(STEMS.solid.list, SOLID);
  assert.equal(STEMS.solid.gen.makeQuestion, makeQuestion);
  assert.equal(STEMS.solid.gen.lessonOf, lessonOf, '📚 배움은 이 생성기의 lessonOf');
  assert.ok(IDS.every((id) => stemOf(id) === STEMS.solid), '모든 칸이 P 줄기로 찾아진다');
  assert.match(STEMS.solid.pick, /O 직육면체 → N 원의 넓이 줄기/);
  const sw = readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
  for (const f of ['./js/mathsolid.js', './coach/math/solid.json']) assert.ok(sw.includes(`'${f}'`), `APP_SHELL에 ${f}`);
  // 화면이 글 속 그림을 바꾸는 자리(renderFigures) · 📊 펼친 문제 글(figText) — P 그림 여덟 가지를 모두 안다 (L 때 range가 빠져 글자로 찍힐 뻔했다)
  for (const d of ['[prism n=5 a=4 h=7]', '[pyramid n=4 a=8 h=7 e=9]', '[cyl r=3 h=7]', '[cone r=6 h=8 l=10]', '[sphere r=5]', '[spin tri 4 3 c=5]', '[pnet n=5 a=3 h=4 up=1 dn=3]', '[cnet r=3 h=5 w=18.84]']) {
    assert.ok(renderFigures(`앞 ${d} 뒤`).includes('<svg') && !renderFigures(`앞 ${d} 뒤`).includes(d), `renderFigures가 ${d}를 못 그림`);
    const t = figText(`앞 ${d} 뒤`);
    assert.ok(!t.includes('[') && t.length > 8, `figText가 ${d}를 글로 못 바꿈: ${t}`);
    assert.equal(figText(d, true), '(그림)', `한 줄 요약에서 ${d}는 (그림)`);
  }
  const ask = readFileSync(new URL('../js/mathask.js', import.meta.url), 'utf8');
  const stats = readFileSync(new URL('../js/stats.js', import.meta.url), 'utf8');
  for (const src of [ask, stats]) for (const ex of src.match(/\[(prism|cyl) [^\]]+\]/g) || ['없음']) assert.ok(figureSvg(ex.slice(1, -1)), `예시가 그려지지 않음: ${ex}`);
  assert.ok(ask.includes('[prism n=5]') && stats.includes('[prism n=5]') && ask.includes('[cyl r=3 h=7]') && stats.includes('[cyl r=3 h=7]'), '❓ 복사문·📊 답장 안내에 [prism]·[cyl] 예');
});

// ───────────────────── Codex 25차 ─────────────────────

test('★ 각뿔 높이 이름표 전수 — 길이 세트(PYR_SETS) × 지시문 꼴 다섯 · 원고 그림: 이름표는 어느 모서리(숨은 점선 포함)보다 높이 점선에 가깝다 (Codex 25차 #5, 씨앗 없이)', () => {
  const segD = (x, y, [p, q]) => { const vx = q[0] - p[0]; const vy = q[1] - p[1]; const t = Math.max(0, Math.min(1, ((x - p[0]) * vx + (y - p[1]) * vy) / (vx * vx + vy * vy || 1))); return Math.hypot(p[0] + vx * t - x, p[1] + vy * t - y); };
  const dirs = new Set();
  for (const [n, L] of Object.entries(_kit.PYR_SETS)) for (const [a, h, e] of L) for (const d of [`pyramid n=${n} a=${a} h=${h} e=${e}`, `pyramid n=${n} h=${h} e=${e}`, `pyramid n=${n} a=${a} h=${h}`, `pyramid n=${n} a=? h=${h} e=${e}`, `pyramid n=${n} a=${a} h=? e=${e}`]) dirs.add(d);
  for (const m of JSON.stringify(CONTENT).matchAll(/\[(pyramid [^\]]*h=[^\]]*)\]/g)) dirs.add(m[1]);
  let n = 0;
  for (const d of dirs) {
    const svg = figureSvg(d);
    assert.ok(svg, `못 그림 ${d}`);
    const lab = /<text[^>]*x="([-\d.]+)" y="([-\d.]+)"[^>]*data-k="h"/.exec(svg); const hl = linesOf(svg).find((l) => l.cls === 'sol-height');
    assert.ok(lab && hl, `${d}: 높이 이름표·점선`);
    const cx = +lab[1]; const cy = +lab[2] - 4.2;
    const dh = segD(cx, cy, [[hl.x1, hl.y1], [hl.x2, hl.y2]]);
    const E = linesOf(svg).filter((l) => l.cls === 'sol-e');
    const closer = E.filter((l) => segD(cx, cy, [[l.x1, l.y1], [l.x2, l.y2]]) <= dh + 0.5);
    assert.ok(!closer.length, `${d}: 높이 이름표가 높이 점선(${dh.toFixed(1)})보다 ${closer.map((l) => `${l.dashed ? '점선' : '실선'} 모서리 ${segD(cx, cy, [[l.x1, l.y1], [l.x2, l.y2]]).toFixed(1)}`).join(', ')}에 가깝다`);
    n++;
  }
  assert.ok(n >= 55, `각뿔 높이 그림 ${n}`);
});

test('★ 이름표의 뜻 (Codex 25차 #6) — 돌린 삼각형 지름 문항의 빗변 오답 = "모선이 될 빗변을 지름으로 봄" · 반원 → 구의 지름 문항의 반 = "지름을 묻는데 반지름을 답함" · P9 ② "수를 그대로 씀" 보기는 정말 그대로 쓴 수', () => {
  let a = 0; let b = 0; let c = 0;
  for (let s = 1; s <= 400; s++) {
    for (const q of [makeQuestion('sol.round', 'calc', s, OPTS), makeQuestion('sol.sphere', 'calc', s, OPTS)]) {
      const { type, f } = solveText(q.q);
      for (const w of q.choices.filter((x) => !x.ok && x.tag !== '계산 실수')) {
        if (type === 'spinD' && +w.text === f.c) { assert.equal(w.tag, TAGS.slantAsD, `round #${s}: 빗변 ${w.text}`); a++; }
        if (type === 'spinD') assert.notEqual(w.tag, TAGS.rAsSlant, `round #${s}: 지름 문항에 "반지름을 모선으로 봄"`);
        if (type === 'halfD' && +w.text === f.D / 2) { assert.equal(w.tag, TAGS.rForD, `sphere #${s}: 반 ${w.text}`); b++; }
        if (type === 'halfD') assert.notEqual(w.tag, TAGS.dAsR, `sphere #${s}: 지름 문항에 "지름을 반지름으로 봄"`);
      }
    }
    const m = makeQuestion('sol.apply', 'misread', s, { ...OPTS, want: { k: 'misread', key: 'misread:cond' } });
    if (m.key !== 'misread:cond') continue;
    const E = +/모서리가 (\d+)개인 각뿔/.exec(m.q)[1];
    const w = m.choices.find((x) => x.tag === TAGS.condCount);
    assert.ok(w && w.text.includes(NAME.pyramid(E)) && !/[+−×÷]/.test(w.text), `apply ② #${s}: "수를 그대로 씀" 보기 "${w && w.text}"`);
    c++;
  }
  assert.ok(a >= 20 && b >= 20 && c >= 100, `본 곳 ${a} · ${b} · ${c}`);
});
