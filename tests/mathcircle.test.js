// 🔵 N 원의 넓이 줄기 생성기 테스트: node --test tests/mathcircle.test.js
//
// ★ 핵심은 **독립 검산** — 생성기가 알려 주는 값(probe)을 믿지 않고 **문제 글을 이 파일이 직접 읽어** 다시 푼다.
//   소수 셈은 0.0001 단위 BigInt로 정확하게 (생성기의 0.01 단위 Number 셈을 쓰면 검산이 아니다).
//   모눈 칸은 이 파일이 꼭짓점 거리로 따로 센다. 정육각형 둘레는 "한 변 = 반지름"을 좌표로 확인한다.
// ★ 이름표는 값만이 아니라 **뜻**까지 — 오답 값이 그 이름표의 틀린 셈으로 정말 나오는지 문제마다 다시 계산한다.
// ★ 씨앗은 개념마다 수백 개 (RNG_SEEDS=20000으로 넓게).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  CIRCLE, TAGS, makeQuestion, makeRound, conceptById, ladder, placeFrom, diagnosticSet, lessonOf, checkContent, gradeLabel, valueOf,
} from '../js/mathcircle.js';
import { figureSvg, figText, renderFigures, parseCircle } from '../js/mathdraw.js';
import { tplKey } from '../js/mathgen.js';
import { padSpec } from '../js/mathpad.js';

const OPTS = { names: ['피카츄', '리자몽', '개굴닌자'], me: '진우', worlds: { pokemon: [], toystory: [], minions: [], moana: [] } };
const SEEDS = Number(process.env.RNG_SEEDS) || 500;
const IDS = CIRCLE.map((c) => c.id);

// ───────────────────── 독립 계산기 (0.0001 단위 BigInt) ─────────────────────

const S = 10000n;
const toU = (s) => { const [i, f = ''] = String(s).split('.'); assert.ok(f.length <= 4, `소수 넷째 자리 넘음: ${s}`); return BigInt(i) * S + BigInt((f + '0000').slice(0, 4)); };
const I = (n) => BigInt(n) * S;
const PI = toU('3.14');
function str(v) {
  const neg = v < 0n; if (neg) v = -v;
  const i = v / S; const f = v % S;
  return (neg ? '-' : '') + (f === 0n ? String(i) : `${i}.${String(f).padStart(4, '0').replace(/0+$/, '')}`);
}
const mul = (a, b) => { const p = a * b; assert.equal(p % S, 0n, `곱이 0.0001 단위를 넘음 ${str(a)} × ${str(b)}`); return p / S; };
const div = (a, b) => { const p = a * S; assert.equal(p % b, 0n, `나눗셈이 딱 안 떨어짐 ${str(a)} ÷ ${str(b)}`); return p / b; };
const sq = (a) => mul(a, a);
const areaR = (r) => mul(sq(r), PI);
const circD = (d) => mul(d, PI);
const half = (a) => div(a, I(2));

/** 모눈 칸 세기 — 반지름 r칸, 중심이 모눈점. 꼭 들어간 칸 = 네 꼭짓점이 모두 원 안(위 포함), 걸친 칸 = 칸에서 중심에 가장 가까운 점이 원 안쪽 */
function cellsOf(r) {
  let inside = 0; let touch = 0;
  for (let x = -r - 1; x <= r; x++) {
    for (let y = -r - 1; y <= r; y++) {
      const corners = [[x, y], [x + 1, y], [x, y + 1], [x + 1, y + 1]];
      if (corners.every(([a, b]) => a * a + b * b <= r * r)) inside++;
      const cx = Math.max(x, Math.min(0, x + 1)); const cy = Math.max(y, Math.min(0, y + 1));
      if (cx * cx + cy * cy < r * r) touch++;
    }
  }
  return { inside, touch };
}

const num = (re, q) => { const m = re.exec(q); return m ? m[1] : null; };
const lastLine = (q) => q.trim().split('\n').filter(Boolean).pop();

/**
 * ① 문제 글을 직접 읽어 { type, ans(글자), f(읽은 값) } — 못 읽으면 던진다
 */
function solveText(q) {
  const L = lastLine(q);
  const has = (re) => re.test(q);
  let m;
  const r = num(/반지름이 (\d+) (?:cm|m)/, q); const d = num(/(?<!반)지름이 (\d+) (?:cm|m)/, q);
  // ── N7 여러 가지 모양 (모양 말이 먼저) ──
  if (/반원의 둘레/.test(L)) { const D = I(d); return { type: 'halfPerim', ans: str(half(circD(D)) + D), f: { d: D } }; }
  if (/조각의 둘레/.test(L)) { const R = I(r); return { type: 'quarterPerim', ans: str(div(circD(R * 2n), I(4)) + R * 2n), f: { r: R } }; }
  if (/조각의 넓이/.test(L) && has(/4등분/)) { const R = I(r); return { type: 'quarterArea', ans: str(div(areaR(R), I(4))), f: { r: R } }; }
  if (has(/반원/) && /넓이는 몇/.test(L)) {
    const R = d ? half(I(d)) : I(r);
    return { type: 'halfArea', ans: str(half(areaR(R))), f: { r: R, d: d ? I(d) : null } };
  }
  if (/고리 모양의 넓이|도넛 윗면의 넓이/.test(L)) {
    const R = I(num(/(?:큰 원의 반지름은|바깥 반지름은) (\d+) cm/, q)); const s = I(num(/(?:작은 원의 반지름은|구멍의 반지름은) (\d+) cm/, q));
    return { type: 'ring', ans: str(areaR(R) - areaR(s)), f: { R, s } };
  }
  if (has(/정사각형 안에 꼭 맞는 원/) && /색칠한 부분의 넓이/.test(L)) {
    const D = I(num(/한 변이 (\d+) cm인 정사각형/, q));
    return { type: 'sqMinus', ans: str(sq(D) - areaR(half(D))), f: { d: D } };
  }
  // ── N4 어림 ──
  if (has(/\[circle grid/)) {
    const R = +num(/반지름이 (\d+) cm/, q);
    const { inside: a, touch: b } = cellsOf(R);
    // 글에 적힌 칸 수가 따로 센 칸 수와 같다
    assert.equal(+num(/꼭 들어간 칸은 (\d+)칸/, q), a, `꼭 들어간 칸 수: ${q}`);
    assert.equal(+num(/걸친 칸까지 (?:모두 )?세면 (\d+)칸/, q), b, `걸친 칸 수: ${q}`);
    if (/바르게 어림한 것/.test(L)) return { type: 'gridRange', ans: `${a} cm²보다 크고 ${b} cm²보다 작아요`, f: { a, b } };
    if (/한가운데로 어림/.test(L)) return { type: 'gridMid', ans: str(half(I(a + b))), f: { a, b } };
  }
  if (has(/\[circle box/)) {
    const D = I(d);
    // 원 안 정사각형: 꼭짓점 (±r, 0)·(0, ±r) — 한 변² = r² + r² → 넓이 2r² (= 지름 × 지름 ÷ 2)
    const R = half(D); const inner = sq(R) * 2n; const outer = sq(D);
    if (/원 밖 정사각형의 넓이/.test(L)) return { type: 'outer', ans: str(outer), f: { d: D } };
    if (/원 안 정사각형의 넓이/.test(L)) return { type: 'inner', ans: str(inner), f: { d: D } };
    if (/바르게 어림한 것/.test(L)) return { type: 'boxRange', ans: `${str(inner)} cm²보다 크고 ${str(outer)} cm²보다 작아요`, f: { d: D } };
  }
  // ── N5 잘라 붙이기 ──
  if (/모양의 가로는 몇/.test(L)) { const R = I(r); return { type: 'width', ans: str(half(circD(R * 2n))), f: { r: R } }; }
  if (/모양의 세로는 몇/.test(L)) { const R = I(r); return { type: 'height', ans: str(R), f: { r: R } }; }
  if (/넓이를 구하는 식/.test(L)) return { type: 'expr', ans: `${r} × ${r} × 3.14`, f: { r: +r } };
  // ── N2 원주와 원주율 ──
  if (/큰 원의 \(원주\) ÷ \(지름\)/.test(L)) {
    m = /작은 원은 지름이 (\d+) cm, 원주가 ([\d.]+) cm예요\. 큰 원은 지름이 (\d+) cm, 원주가 ([\d.]+) cm예요/.exec(q);
    const [d1, C1, d2, C2] = [I(m[1]), toU(m[2]), I(m[3]), toU(m[4])];
    assert.equal(div(C1, d1), PI, '작은 원의 원주율'); // 글의 수가 정말 원주율 3.14로 맞는지
    return { type: 'ratio2', ans: str(div(C2, d2)), f: { d1, C1, d2, C2 } };
  }
  if (/원주는 지름의 몇 배|\(원주\) ÷ \(지름\)은 얼마/.test(L)) {
    const C = toU(num(/재었더니 ([\d.]+) cm였어요/, q)); const D = I(num(/지름(?:은|이) (\d+) cm/, q));
    return { type: 'ratio', ans: str(div(C, D)), f: { C, d: D } };
  }
  if (/원주를 바르게 말한 것/.test(L)) {
    // 정육각형: 꼭짓점이 원 위 → 이웃한 두 꼭짓점과 중심이 정삼각형 → 한 변 = 반지름. 좌표로 한 변 길이를 잰다
    const D = +d; const R = D / 2; const side = Math.hypot(R - R * Math.cos(Math.PI / 3), R * Math.sin(Math.PI / 3));
    assert.ok(Math.abs(side - R) < 1e-9);
    return { type: 'range', ans: `${6 * R} cm보다 길고 ${4 * D} cm보다 짧아요`, f: { d: D } };
  }
  if ((m = /^지름이 (\d+) cm인 원의 원주는 ([\d.]+) cm예요\.\n\n지름이 (\d+) cm인 원의 원주는 몇 cm/.exec(q))) {
    const [d1, C1, d2] = [I(m[1]), toU(m[2]), I(m[3])];
    return { type: 'scale', ans: str(div(mul(C1, d2), d1)), f: { d1, C1, d2 } };
  }
  // ── N3 원주·지름 ──
  if (/굴러간 거리|복도의 길이/.test(L)) {
    const D = I(d); const n = BigInt(num(/(\d+)바퀴/, q));
    return { type: 'wheel', ans: str(circD(D) * n), f: { d: D, n } };
  }
  const C = num(/(?:원주가|재었더니) ([\d.]+) cm/, q);
  const A = num(/넓이가 ([\d.]+) cm²/, q);
  if (/(?<!반)지름은 몇/.test(L) && C) { const c = toU(C); return { type: 'C2d', ans: str(div(c, PI)), f: { C: c } }; }
  if (/반지름은 몇/.test(L) && C) { const c = toU(C); return { type: 'C2r', ans: str(half(div(c, PI))), f: { C: c } }; }
  if (/반지름은 몇/.test(L) && A) {
    const a = toU(A); const rr = div(a, PI); const R = Math.sqrt(Number(rr / S));
    assert.ok(Number.isInteger(R) && sq(I(R)) === rr, `반지름이 자연수가 아님: ${q}`);
    return { type: 'A2r', ans: String(R), f: { A: a } };
  }
  if (/원주는 몇|쿠키의 둘레는 몇|걸은 거리는 몇/.test(L)) {
    if (r) { const R = I(r); return { type: 'r2C', ans: str(circD(R * 2n)), f: { r: R } }; }
    const D = I(d); return { type: 'd2C', ans: str(circD(D)), f: { d: D } };
  }
  // ── N6 넓이 ──
  if (/넓이는 몇/.test(L) && /원주가/.test(q)) { const c = toU(C); const R = half(div(c, PI)); return { type: 'areaC', ans: str(areaR(R)), f: { C: c } }; }
  if (/넓이는 몇/.test(L) && r) { const R = I(r); return { type: 'areaR', ans: str(areaR(R)), f: { r: R } }; }
  if (/넓이는 몇/.test(L) && d) { const D = I(d); return { type: 'areaD', ans: str(areaR(half(D))), f: { d: D } }; }
  if (/몇 배일까요/.test(L)) {
    const rs = [...q.matchAll(/반지름이 (\d+) cm/g)].map((z) => +z[1]);
    assert.equal(rs.length, 2, q);
    const k = rs[1] / rs[0]; assert.ok(Number.isInteger(k), q);
    // 넓이를 따로 구해 나눈다 (× 3.14가 사라지는지)
    return { type: 'scaleArea', ans: str(div(areaR(I(rs[1])), areaR(I(rs[0])))), f: { k } };
  }
  // ── N1 반지름·지름 ──
  if (/가장 긴 선분/.test(L)) return { type: 'longest', ans: String(2 * r), f: { r: +r } };
  if (/양 끝 사이의 길이|쿠키 줄의 전체 길이/.test(L)) {
    const n = +num(/(\d+)개를 한 줄로/, q); return { type: 'row', ans: String(2 * r * n), f: { r: +r, n } };
  }
  if (/(?<!반)지름은 몇/.test(L)) {
    const R = +(num(/컴퍼스를 (\d+) cm만큼 벌려/, q) || r);
    return { type: 'r2d', ans: String(2 * R), f: { r: R } };
  }
  if (/반지름은 몇/.test(L) && d) return { type: 'd2r', ans: str(half(I(d))), f: { d: +d } };
  throw new Error(`못 읽는 문제: ${q}`);
}

/** 이름표 → 그 틀린 셈의 값 (문제 종류마다 — 같은 이름표도 문제에 따라 셈이 다르다) */
const TAGV = {
  r2d: { [TAGS.rForD]: (f) => str(half(I(f.r))), [TAGS.addTwo]: (f) => String(f.r + 2) },
  d2r: { [TAGS.rForD]: (f) => String(f.d * 2), [TAGS.subTwo]: (f) => String(f.d - 2) },
  longest: { [TAGS.longR]: (f) => String(f.r), [TAGS.addTwo]: (f) => String(f.r + 2) },
  row: { [TAGS.radiusWidth]: (f) => String(f.r * f.n), [TAGS.addForMul]: (f) => String(2 * f.r + f.n) },
  ratio: { [TAGS.byRadius]: (f) => str(div(f.C, half(f.d))), [TAGS.subForDiv]: (f) => str(f.C - f.d) },
  ratio2: { [TAGS.bigPi]: (f) => str(mul(PI, div(f.d2, f.d1))), [TAGS.subForDiv]: (f) => str(f.C2 - f.d2) },
  range: {
    [TAGS.rangeR]: (f) => `${3 * (f.d / 2)} cm보다 길고 ${4 * (f.d / 2)} cm보다 짧아요`,
    [TAGS.sideAsD]: (f) => `${4 * f.d} cm보다 길고 ${6 * f.d} cm보다 짧아요`,
    [TAGS.outerLonger]: (f) => `${4 * f.d} cm보다 길어요`,
  },
  scale: { [TAGS.addGrow]: (f) => str(f.C1 + f.d2 - f.d1), [TAGS.sameC]: (f) => str(f.C1) },
  d2C: { [TAGS.extraDouble]: (f) => str(circD(f.d) * 2n), [TAGS.halfD]: (f) => str(circD(half(f.d))), [TAGS.addPi]: (f) => str(f.d + PI) },
  r2C: { [TAGS.noDouble]: (f) => str(mul(f.r, PI)), [TAGS.rTwice]: (f) => str(areaR(f.r)) },
  C2d: { [TAGS.invMul]: (f) => str(mul(f.C, PI)), [TAGS.rForDinv]: (f) => str(half(div(f.C, PI))), [TAGS.subInv]: (f) => str(f.C - PI) },
  C2r: { [TAGS.dForR]: (f) => str(div(f.C, PI)), [TAGS.invMul]: (f) => str(mul(f.C, PI)) },
  wheel: { [TAGS.turnsMiss]: (f) => str(circD(f.d)), [TAGS.halfD]: (f) => str(circD(half(f.d)) * f.n), [TAGS.piMiss]: (f) => str(f.d * f.n) },
  gridRange: { [TAGS.innerOnly]: (f) => `${f.a} cm²예요`, [TAGS.touchAll]: (f) => `${f.b} cm²예요`, [TAGS.sumUp]: (f) => `${f.a + f.b} cm²보다 커요` },
  gridMid: { [TAGS.sumNoHalf]: (f) => String(f.a + f.b), [TAGS.innerOnly]: (f) => String(f.a), [TAGS.touchAll]: (f) => String(f.b) },
  outer: { [TAGS.rSquare]: (f) => str(sq(half(f.d))), [TAGS.perimForArea]: (f) => str(f.d * 4n) },
  inner: { [TAGS.noHalf]: (f) => str(sq(f.d)), [TAGS.rSquare]: (f) => str(sq(half(f.d))) },
  boxRange: {
    [TAGS.outerAsArea]: (f) => `${str(sq(f.d))} cm²예요`,
    [TAGS.innerSq]: (f) => `${str(half(sq(f.d)))} cm²예요`,
    [TAGS.rSquare]: (f) => `${str(sq(half(f.d)))} cm²보다 크고 ${str(half(sq(f.d)))} cm²보다 작아요`,
  },
  width: { [TAGS.widthFull]: (f) => str(circD(f.r * 2n)), [TAGS.widthR]: (f) => str(f.r), [TAGS.widthD]: (f) => str(f.r * 2n) },
  height: { [TAGS.heightD]: (f) => str(f.r * 2n), [TAGS.swapWH]: (f) => str(mul(f.r, PI)) },
  expr: { [TAGS.dSquared]: (f) => `${2 * f.r} × ${2 * f.r} × 3.14`, [TAGS.circForArea]: (f) => `${f.r} × 2 × 3.14`, [TAGS.rOnce]: (f) => `${f.r} × 3.14` },
  areaR: { [TAGS.dSquared]: (f) => str(areaR(f.r * 2n)), [TAGS.circForArea]: (f) => str(circD(f.r * 2n)), [TAGS.rOnce]: (f) => str(mul(f.r, PI)) },
  areaD: { [TAGS.dAsR]: (f) => str(areaR(f.d)), [TAGS.circForArea]: (f) => str(circD(f.d)), [TAGS.rOnce]: (f) => str(mul(half(f.d), PI)) },
  areaC: { [TAGS.cToD]: (f) => str(areaR(div(f.C, PI))), [TAGS.circAsArea]: (f) => str(f.C) },
  scaleArea: { [TAGS.scaleSame]: (f) => String(f.k), [TAGS.squareAsDouble]: (f) => String(f.k * 2), [TAGS.piTimes]: (f) => str(mul(I(f.k * f.k), PI)) },
  A2r: { [TAGS.rrOnly]: (f) => str(div(f.A, PI)), [TAGS.dForR]: (f) => String(2 * Math.sqrt(Number(div(f.A, PI) / S))) },
  halfArea: { [TAGS.noDivide]: (f) => str(areaR(f.r)), [TAGS.dAsR]: (f) => str(half(areaR(f.d))), [TAGS.rOnce]: (f) => str(half(mul(f.r, PI))) },
  quarterArea: { [TAGS.halfForQuarter]: (f) => str(half(areaR(f.r))), [TAGS.noDivide]: (f) => str(areaR(f.r)) },
  ring: { [TAGS.ringDiff]: (f) => str(areaR(f.R - f.s)), [TAGS.ringAdd]: (f) => str(areaR(f.R) + areaR(f.s)), [TAGS.bigOnly]: (f) => str(areaR(f.R)) },
  sqMinus: { [TAGS.circleOnly]: (f) => str(areaR(half(f.d))), [TAGS.subCirc]: (f) => str(sq(f.d) - circD(f.d)) },
  halfPerim: { [TAGS.noDiam]: (f) => str(half(circD(f.d))), [TAGS.arcFull]: (f) => str(circD(f.d) + f.d) },
  quarterPerim: { [TAGS.noRadii]: (f) => str(div(circD(f.r * 2n), I(4))), [TAGS.oneRadius]: (f) => str(div(circD(f.r * 2n), I(4)) + f.r) },
};

/** 문항 하나씩 — 개념·씨앗·얼굴 */
function* every(kinds = ['calc', 'misread'], n = SEEDS) {
  for (const c of CIRCLE) for (const k of kinds) for (let s = 1; s <= n; s++) yield { c, k, s, q: makeQuestion(c.id, k, s, OPTS) };
}
const allText = (q) => [q.q, ...q.choices.map((x) => x.text), ...(q.solve ? [...q.solve.steps, ...Object.values(q.solve.why), q.solve.whyAny, q.solve.rule] : [])].join('\n');

// ───────────────────── 테스트 ─────────────────────

test('독립 계산기 자체 점검 (소수 셈·모눈 칸 — 교과서 반지름 10 cm: 276칸 · 344칸)', () => {
  assert.equal(str(circD(I(12))), '37.68');
  assert.equal(str(areaR(I(5))), '78.5');
  assert.equal(str(mul(toU('37.68'), PI)), '118.3152');
  assert.equal(str(div(toU('28.26'), PI)), '9');
  assert.deepEqual(cellsOf(10), { inside: 276, touch: 344 }); // 6-2 교과서 110쪽의 모눈 어림 그림과 같은 수
  assert.deepEqual(cellsOf(3), { inside: 16, touch: 36 });
});

test('사다리: 7칸, 모두 초6, needs가 바로 앞 칸 · 학년 표시 · 맨 뒤는 ⭐', () => {
  assert.equal(CIRCLE.length, 7);
  assert.deepEqual(IDS, ['cir.parts', 'cir.ratio', 'cir.circum', 'cir.estimate', 'cir.formula', 'cir.area', 'cir.apply']);
  CIRCLE.forEach((c, i) => {
    assert.equal(c.grade, 6, c.id);
    assert.deepEqual(c.needs, i ? [IDS[i - 1]] : []);
    assert.ok(c.idea && c.rule && c.slip && c.name, c.id);
  });
  assert.equal(gradeLabel(6), '초6');
  assert.ok(conceptById('cir.apply').name.startsWith('⭐'));
});

test('★ 독립 검산: ① 정답이 문제 글을 따로 읽어 푼 답과 같다 · 딱 하나만 맞다 · 오답은 그 답이 아니다', () => {
  const types = new Set();
  for (const { c, s, q } of every(['calc'])) {
    const { type, ans } = solveText(q.q);
    types.add(type);
    const oks = q.choices.filter((x) => x.ok);
    assert.equal(oks.length, 1, `${c.id} #${s}`);
    assert.equal(oks[0].text, ans, `${c.id} #${s} (${type})\n${q.q}`);
    for (const w of q.choices.filter((x) => !x.ok)) {
      assert.notEqual(w.text, ans, `${c.id} #${s}: 오답이 정답과 같다`);
      if (valueOf(w.text) !== null && valueOf(ans) !== null) assert.notEqual(valueOf(w.text), valueOf(ans), `${c.id} #${s}: 값이 같은 오답`);
    }
  }
  // 문제 종류가 다 나온다 (가족이 통째로 빠지지 않게)
  assert.equal(types.size, Object.keys(TAGV).length, `나온 종류 ${[...types].sort()}`);
});

test('★ 보기: 정답 하나, 글자·값 겹침 없음, 빈 글자·undefined·NaN·남은 자리표시 없음 · 그림 지시문은 모두 그려진다', () => {
  for (const { c, k, s, q } of every()) {
    const texts = q.choices.map((x) => String(x.text));
    assert.equal(new Set(texts).size, texts.length, `${c.id} ${k} #${s}: 같은 보기 ${texts}`);
    const vals = texts.map(valueOf).filter((v) => v !== null);
    assert.equal(new Set(vals).size, vals.length, `${c.id} ${k} #${s}: 값이 같은 보기 ${texts}`);
    assert.ok(q.choices.length >= 3, `${c.id} ${k} #${s}: 보기가 ${q.choices.length}개`);
    const all = allText(q);
    assert.ok(!/undefined|NaN|null|\{(?!mon|me)/.test(all), `${c.id} ${k} #${s}: ${all}`);
    for (const f of q.q.match(/\[[a-z]+ [^\]]+\]/g) || []) assert.ok(figureSvg(f.slice(1, -1)), `${c.id} ${k} #${s}: 못 그리는 ${f}`);
  }
});

test('★ 오개념 이름표: 그 오답이 정말 그 실수다 — 문제 글을 읽어 틀린 셈을 다시 한다 · 이름표 붙은 오답이 늘 둘 이상 (틀린 방법이 우연히 맞는 값이면 빠진다)', () => {
  for (const { c, s, q } of every(['calc'])) {
    const { type, f } = solveText(q.q);
    const tagged = q.choices.filter((x) => !x.ok && x.tag && x.tag !== '계산 실수');
    assert.ok(tagged.length >= 2, `${c.id} #${s} (${type}): 이름표 붙은 오답 ${tagged.length}개\n${q.q}\n${q.choices.map((x) => x.text)}`);
    for (const w of tagged) {
      const fn = TAGV[type] && TAGV[type][w.tag];
      assert.ok(fn, `${c.id} #${s}: ${type}에 없는 이름표 "${w.tag}"`);
      assert.equal(w.text, fn(f), `${c.id} #${s} (${type}): "${w.tag}" 오답 값\n${q.q}`);
    }
  }
});

test('★ ② 오개념 문항: 보여 준 것은 정말 틀렸다 · 고치는 말만 맞다 · 갈래 열쇠', () => {
  const branches = {};
  for (const { c, s, q } of every(['misread'])) {
    assert.match(q.key, /^misread:[a-z]+$/, `${c.id} #${s}`);
    (branches[c.id] ||= new Set()).add(q.key);
    const t = q.q;
    const ok = q.choices.find((x) => x.ok).text;
    const bad = q.choices.filter((x) => !x.ok);
    const said = (/\*\*(.+?)\*\*/s.exec(t) || [])[1] || '';
    const at = (cond, msg) => assert.ok(cond, `${c.id} #${s} ${q.key} ${msg}\n${t}\n✔ ${ok}`);
    at(bad.some((x) => x.tag === '틀린 줄 모름'), '"맞게 말했어요" 보기');
    const endsNum = (txt) => (txt.match(/([\d.]+)(?: ?(?:cm²|cm|배))?$/) || [])[1];
    let right; let shown;
    const br = q.key.slice(8);
    let m;
    if (c.id === 'cir.parts' && br === 'half') { const R = +num(/반지름이 (\d+) cm인 원이/, t); right = String(2 * R); shown = endsNum(said.replace(/ cm예요$/, '')); }
    else if (c.id === 'cir.parts' && br === 'row') { m = /반지름이 (\d+) cm인 동전 (\d+)개/.exec(said); right = String(2 * m[1] * m[2]); shown = endsNum(said.replace(/ cm예요$/, '')); }
    else if (c.id === 'cir.ratio' && br === 'radius') {
      const C = toU(num(/원주가 ([\d.]+) cm/, t)); const R = I(num(/\[circle r=(\d+)\]/, t));
      right = str(div(C, R * 2n)); shown = str(div(C, R));
      at(said.includes(`= ${shown}이에요`), '보여 준 값이 반지름으로 나눈 값');
    } else if (c.id === 'cir.ratio' && br === 'big') { right = '3.14'; shown = (/= ([\d.]+)(?:이에요|예요)$/.exec(said) || [])[1]; at(ok.endsWith('약 3.14'), '고치는 말'); }
    else if (c.id === 'cir.circum' && br === 'radius') { const R = I(num(/반지름이 (\d+) cm/, t)); right = str(circD(R * 2n)); shown = str(mul(R, PI)); at(said.includes(shown), '보여 준 값'); }
    else if (c.id === 'cir.circum' && br === 'inverse') { const C = toU(num(/원주가 ([\d.]+) cm/, t)); right = str(div(C, PI)); shown = str(mul(C, PI)); at(said.includes(shown), '보여 준 값'); }
    else if (c.id === 'cir.estimate' && br === 'outer') { const D = I(num(/지름이 (\d+) cm/, t)); right = `${str(half(sq(D)))} cm²보다 크고 ${str(sq(D))} cm²보다 작아요`; shown = str(sq(D)); }
    else if (c.id === 'cir.estimate' && br === 'grid') {
      const { inside: a, touch: b } = cellsOf(+num(/반지름이 (\d+) cm/, t));
      assert.equal(+num(/세면 (\d+)칸/, t), b); right = `${a} cm²보다 크고 ${b} cm²보다 작아요`; shown = String(a);
      at(said.includes(`${a}칸`), '보여 준 칸 수');
    } else if (c.id === 'cir.formula' && br === 'width') { const R = I(num(/반지름이 (\d+) cm/, t)); right = str(mul(R, PI)); shown = str(circD(R * 2n)); }
    else if (c.id === 'cir.formula' && br === 'dsq') { const R = I(num(/반지름이 (\d+) cm/, t)); right = str(areaR(R)); shown = str(areaR(R * 2n)); }
    else if (c.id === 'cir.area' && br === 'diam') { const D = I(num(/지름이 (\d+) cm/, t)); right = str(areaR(half(D))); shown = str(areaR(D)); }
    else if (c.id === 'cir.area' && br === 'scale') {
      const rs = [...t.matchAll(/반지름이 (\d+) cm/g)].map((z) => +z[1]); const k = rs[1] / rs[0];
      right = `${k * k}배`; shown = `${k}배`; at(said.includes(`넓이도 작은 원의 ${k}배`), '보여 준 말');
      at(ok.endsWith(right), '고치는 말');
    } else if (c.id === 'cir.apply' && br === 'ring') {
      const R = I(num(/큰 원의 반지름은 (\d+) cm/, t)); const s2 = I(num(/작은 원의 반지름은 (\d+) cm/, t));
      right = str(areaR(R) - areaR(s2)); shown = str(areaR(R - s2));
    } else if (c.id === 'cir.apply' && br === 'halfperim') { const D = I(num(/지름이 (\d+) cm/, t)); right = str(half(circD(D)) + D); shown = str(half(circD(D))); }
    else at(false, '못 읽는 ②');
    at(shown !== undefined && shown !== right && !said.endsWith(` ${right} cm예요`) && !said.endsWith(` ${right} cm²예요`), `보여 준 것이 맞는 값 (${right})`);
    at(ok.includes(right), `고치는 말에 맞는 값 ${right}`);
    for (const b of bad) {
      if (b.tag === '틀린 줄 모름') continue;
      at(!b.text.includes(`= ${right} `) && !b.text.endsWith(`= ${right}`) && !b.text.includes(`— ${right}`) && !b.text.endsWith(` ${right} cm예요`) && !b.text.endsWith(` ${right} cm²예요`), `오답 보기가 맞는 값 ${right}: ${b.text}`);
    }
  }
  for (const id of IDS) assert.equal(branches[id].size, 2, `${id}: 갈래 둘`);
});

test('★ 조사: 수 뒤는 읽는 소리 (8을·5를·6으로·7로·36이니까·25니까) · cm·m·cm² 뒤', () => {
  const BAT = new Set(['0', '1', '3', '6', '7', '8']);
  const PAIRS = [['을', '를'], ['은', '는'], ['이', '가'], ['과', '와'], ['이에요', '예요'], ['이니까', '니까']];
  for (const { c, k, s, q } of every()) {
    const all = allText(q);
    for (const [wb, nb] of PAIRS) {
      for (const m of all.matchAll(new RegExp(`(\\d)(${wb}|${nb})(?=[\\s.,!?)—]|$)`, 'g'))) {
        assert.equal(m[2], BAT.has(m[1]) ? wb : nb, `${c.id} ${k} #${s}: "…${m[1]}${m[2]}"\n${all}`);
      }
    }
    for (const m of all.matchAll(/(\d)(으로|로)(?=[\s.,]|$)/g)) {
      const want = ['1', '7', '8'].includes(m[1]) ? '로' : BAT.has(m[1]) ? '으로' : '로';
      assert.equal(m[2], want, `${c.id} ${k} #${s}: "…${m[1]}${m[2]}"`);
    }
    // 센티미터·미터·제곱센티미터 — 받침 없음
    assert.ok(!/(cm|m|cm²|m²)(은|을|이 |과|이에요|으로)/.test(all), `${c.id} ${k} #${s}: 단위 뒤 조사\n${all}`);
  }
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
  assert.ok(n > 5000, `셈식 ${n}`);
});

test('🔁 쌍둥이·🤔 노트: 요청한 틀·갈래로 온다 · 쌍둥이 글이 원래 글과 같은 일은 드물다', () => {
  const same = {}; const tot = {};
  const P = { names: OPTS.names, me: OPTS.me };
  const strip = (t) => tplKey(t.replace(/(피카츄|리자몽|개굴닌자)(이|가|은|는|을|를|과|와|의)?/g, ''));
  for (const c of CIRCLE) {
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
  for (const key of Object.keys(tot)) assert.ok((same[key] || 0) / tot[key] <= 0.3, `쌍둥이 = 원래 글 ${same[key]}/${tot[key]}: ${key}`);
});

test('★ 아직 안 배운 말을 앞 칸에 쓰지 않는다 — 원주·원주율 N2 · 원의 넓이 N4 · 반지름 × 반지름 N5 · 반원·고리·4등분 N7', () => {
  const FIRST = { 원주: 'cir.ratio', 원주율: 'cir.ratio', '원의 넓이': 'cir.estimate', '반지름 × 반지름': 'cir.formula', 반원: 'cir.apply', 고리: 'cir.apply', '4등분': 'cir.apply' };
  const idx = (id) => IDS.indexOf(id);
  const banned = (id) => Object.entries(FIRST).filter(([, at]) => idx(at) > idx(id)).map(([w]) => w);
  for (const c of CIRCLE) {
    const own = `${c.name} ${c.idea} ${c.rule} ${c.slip}`;
    for (const w of banned(c.id)) assert.ok(!own.includes(w), `${c.id}: 설명에 "${w}"`);
  }
  for (const { c, k, s, q } of every()) {
    const all = allText(q) + ' ' + q.choices.map((x) => x.tag || '').join(' ');
    for (const w of banned(c.id)) assert.ok(!all.includes(w), `${c.id} ${k} #${s}: 아직 안 배운 "${w}"\n${all}`);
  }
});

test('★ 참말에 틀린 일반화가 없다 — 원주율은 "약" 3.14 · 원주는 지름의 3배가 아니다 · 잘라 붙인 모양은 직사각형에 "가까워진다"', () => {
  // 오답 보기·② 보여 준 말은 틀린 말이 맞으니 빼고, 참이라고 내미는 글(정답·풀이·규칙·idea)만 본다. 굵게(**)는 떼고
  const BAD = [
    [/원주율(은|이|=) ?3\.14(?![\d배])/, '원주율은 3.1415… — "약 3.14"로'],
    [/지름의 3배(?!보다)/, '원주는 지름의 약 3.14배 — 3배가 아니다'],
    [/직사각형이 (돼|되|됩)/, '잘게 자를수록 직사각형에 가까워질 뿐'],
    [/원주율은 3(?![.\d])/, '원주율 3은 어림한 값'],
  ];
  const truths = (q) => [q.choices.find((x) => x.ok).text, ...(q.solve ? [...q.solve.steps, ...Object.values(q.solve.why), q.solve.whyAny, q.solve.rule] : [])].join('\n').replace(/\*\*/g, '');
  for (const { c, k, s, q } of every(['calc', 'misread'], 300)) {
    const t = truths(q);
    for (const [re, why] of BAD) assert.ok(!re.test(t), `${c.id} ${k} #${s}: ${why}\n${t.match(new RegExp(`.*${re.source}.*`))?.[0]}`);
    if (k === 'calc') for (const [re, why] of BAD) assert.ok(!re.test(q.q.replace(/\*\*/g, '')), `${c.id} #${s}: 문제 글에 ${why}`);
  }
  for (const c of CIRCLE) for (const [re, why] of BAD) assert.ok(!re.test([c.idea, c.rule, c.slip].join('\n').replace(/\*\*/g, '')), `${c.id}: ${why}`);
});

test('★ 틀 글 속 수의 모양이 늘 같다 — 원주·넓이가 글에 나오면 늘 소수 (🔁 열쇠가 갈리지 않게)', () => {
  for (const { c, s, q } of every(['calc', 'misread'])) {
    // 원주와 원의 넓이(N6 거꾸로)만 — N4 정사각형 넓이(196 cm²)는 늘 자연수라 모양이 같다
    for (const m of q.q.matchAll(/(?:원주가|원주는|재었더니) (\d+(?:\.\d+)?) cm|넓이가 (\d+(?:\.\d+)?) cm²인 원/g)) { const v = m[1] || m[2]; assert.ok(v.includes('.'), `${c.id} #${s}: 자연수 ${v}\n${q.q}`); }
    // 원주율 표시는 질문 줄보다 앞 — 숫자판이 마지막 줄에서 단위를 읽는다
    if (q.q.includes('(원주율: 3.14)')) assert.ok(!lastLine(q.q).includes('원주율:'), `${c.id} #${s}: 원주율 표시가 마지막 줄`);
  }
});

test('★ 그림과 글이 같은 길이를 말한다 — 글의 반지름·지름·한 변 = 그림 지시문의 수 · 단위도 같다', () => {
  for (const { c, k, s, q } of every(['calc', 'misread'], 300)) {
    const d = /\[circle ([^\]]+)\]/.exec(q.q);
    if (!d) continue;
    const sp = parseCircle(d[1]);
    const text = q.q.replace(/\[circle [^\]]+\]/, '');
    const u = /\d (m)[인이 .]/.test(text) && !/\d cm/.test(text) ? 'm' : 'cm';
    assert.equal(sp.unit, u, `${c.id} ${k} #${s}: 단위 ${sp.unit} ≠ 글 ${u}\n${q.q}`);
    if (sp.kind === 'ring') {
      assert.equal(sp.R, +num(/(?:큰 원의 반지름은|바깥 반지름은) (\d+)/, text)); assert.equal(sp.r, +num(/(?:작은 원의 반지름은|구멍의 반지름은) (\d+)/, text));
      continue;
    }
    if (sp.kind === 'sq') { assert.equal(sp.d, +num(/한 변이 (\d+) cm/, text)); continue; }
    if (sp.kind === 'row') { assert.equal(sp.n, +num(/(\d+)개를 한 줄로/, text), q.q); }
    // 글이 말하는 길이만 견준다 (② "원주율은 56.52 ÷ 9"처럼 반지름을 그림으로만 주는 문항도 있다)
    const tr = num(/반지름이 (\d+) (?:cm|m)/, text) || num(/컴퍼스를 (\d+) cm/, text); const td = num(/(?<!반)지름이 (\d+) (?:cm|m)/, text);
    if (typeof sp.r === 'number' && tr !== null) assert.equal(sp.r, +tr, `${c.id} ${k} #${s}: 반지름\n${q.q}`);
    if (typeof sp.d === 'number' && td !== null) assert.equal(sp.d, +td, `${c.id} ${k} #${s}: 지름\n${q.q}`);
    if (typeof sp.r === 'number' && tr === null && td === null && sp.kind !== 'grid') assert.ok(k === 'misread' && /원주가/.test(text), `${c.id} ${k} #${s}: 반지름을 그림으로만\n${q.q}`);
    // 물을 길이는 그림에서도 ? — 정답을 그림에 적어 두지 않는다
    if (k === 'calc') {
      const ok = q.choices.find((x) => x.ok).text;
      const labels = [...figureSvg(d[1] ? `circle ${d[1]}` : '').matchAll(/class="cir-lab"[^>]*>([^<]+)</g)].map((z) => z[1]);
      // 글에 이미 있는 길이(잘라 붙인 모양의 세로 = 반지름)는 괜찮다 — 글에 없는 답이 그림에만 적혀 있으면 안 된다
      if (!text.includes(`${ok} cm`) && !text.includes(`${ok} m`)) assert.ok(!labels.some((t) => t === `${ok} cm` || t === `${ok} m`), `${c.id} #${s}: 정답 ${ok}이 그림 이름표에\n${q.q}`);
    }
  }
});

// ── 그림 ──

/** 그린 SVG의 이름표 상자 (가운데 정렬, 글꼴 크기는 그림에서 읽는다) */
function labelBoxes(svg) {
  return [...svg.matchAll(/<text class="cir-lab" x="([\d.]+)" y="([\d.]+)" font-size="(\d+)"[^>]*>([^<]+)<\/text>/g)].map((z) => {
    const fs = +z[3]; const t = z[4]; const w = ([...t].reduce((a, ch) => a + (/[ㄱ-ㅎ가-힣]/.test(ch) ? 15 : 8.2), 0) * fs) / 15;
    return { t, x0: +z[1] - w / 2, x1: +z[1] + w / 2, y0: +z[2] - fs * 0.78, y1: +z[2] + fs * 0.22 };
  });
}
const segOf = (svg, k) => { const m = new RegExp(`class="cir-seg" data-k="${k}" data-v="([^"]+)" x1="([\\d.]+)" y1="([\\d.]+)" x2="([\\d.]+)" y2="([\\d.]+)"`).exec(svg); return m ? { v: m[1], len: Math.hypot(m[4] - m[2], m[5] - m[3]) } : null; };
const circlesOf = (svg) => [...svg.matchAll(/<circle class="cir-c"(?: data-k="(\w)")? data-r="([^"]+)" cx="([\d.]+)" cy="([\d.]+)" r="([\d.]+)"/g)].map((z) => ({ k: z[1], v: z[2], cx: +z[3], cy: +z[4], r: +z[5] }));

test('🎨 [circle] 그림: 그린 SVG에서 반지름·지름·한 변·조각을 다시 잰다 · 이름표끼리 안 겹치고 그림 안에 · 폭 400 이하 · 글로 바꾸기', () => {
  let n = 0; const kinds = new Set();
  const seen = new Set();
  for (const { c, k, s, q } of every(['calc', 'misread'], 200)) {
    for (const d of q.q.match(/\[circle [^\]]+\]/g) || []) {
      if (seen.has(d)) continue; seen.add(d);
      const spec = d.slice(1, -1); const svg = figureSvg(spec); const sp = parseCircle(spec.slice(7));
      kinds.add(sp.kind);
      const [W, H] = /viewBox="0 0 (\d+(?:\.\d+)?) (\d+(?:\.\d+)?)"/.exec(svg).slice(1).map(Number);
      assert.ok(W <= 400 && H <= 400, `${d}: ${W}×${H}`);
      const cs = circlesOf(svg);
      const at = (cond, msg) => assert.ok(cond, `${c.id} ${k} #${s} ${d}: ${msg}`);
      if (['full', 'box', 'poly', 'sq', 'grid', 'slices'].includes(sp.kind)) at(cs.length === 1, '원 하나');
      const R = cs.length ? cs[0].r : 0;
      if (sp.kind === 'full') {
        const sr = segOf(svg, 'r'); const sd = segOf(svg, 'd');
        if ('r' in sp) at(sr && Math.abs(sr.len - R) < 0.2, '반지름 선 = 원의 반지름');
        if ('d' in sp) at(sd && Math.abs(sd.len - 2 * R) < 0.2, '지름 선 = 원의 지름');
      }
      if (sp.kind === 'ring') {
        const big = cs.find((z) => z.k === 'R'); const small = cs.find((z) => z.k === 'r');
        at(Math.abs(small.r / big.r - sp.r / sp.R) < 1e-3, '두 원의 반지름 비율이 실제와 같다');
        at(big.cx === small.cx && big.cy === small.cy, '중심이 같다');
        at(Math.abs(segOf(svg, 'R').len - big.r) < 0.2 && Math.abs(segOf(svg, 'r').len - small.r) < 0.2, '반지름 선');
      }
      if (sp.kind === 'sq' || sp.kind === 'box' || sp.kind === 'poly') {
        const rect = /<rect class="cir-(?:sq|out)"(?: data-d="\d+")? x="([\d.]+)" y="([\d.]+)" width="([\d.]+)" height="([\d.]+)"/.exec(svg);
        at(Math.abs(+rect[3] - 2 * R) < 0.2 && Math.abs(+rect[4] - 2 * R) < 0.2, '정사각형 한 변 = 지름');
        at(Math.abs(+rect[1] + +rect[3] / 2 - cs[0].cx) < 0.2 && Math.abs(+rect[2] + +rect[4] / 2 - cs[0].cy) < 0.2, '원이 정사각형 한가운데');
      }
      if (sp.kind === 'box' || sp.kind === 'poly') {
        const pts = /class="cir-in" data-n="(\d)" points="([^"]+)"/.exec(svg);
        const P = pts[2].split(' ').map((p) => p.split(',').map(Number));
        at(P.length === (sp.kind === 'box' ? 4 : 6), '꼭짓점 수');
        for (const [x, y] of P) at(Math.abs(Math.hypot(x - cs[0].cx, y - cs[0].cy) - R) < 0.2, '꼭짓점이 원 위');
        const sides = P.map((p, i) => Math.hypot(P[(i + 1) % P.length][0] - p[0], P[(i + 1) % P.length][1] - p[1]));
        at(Math.max(...sides) - Math.min(...sides) < 0.3, '정다각형 (변 길이가 같다)');
        if (sp.kind === 'poly') at(Math.abs(sides[0] - R) < 0.3, '정육각형 한 변 = 반지름');
      }
      if (sp.kind === 'grid') {
        const C = +/data-c="(\d+)"/.exec(svg)[1];
        at(Math.abs(R - sp.r * C) < 0.01, '원의 반지름 = r칸');
        const cells = [...svg.matchAll(/class="cir-cell (in|edge)" data-i="(-?\d+)" data-j="(-?\d+)" x="([\d.]+)" y="([\d.]+)"/g)];
        const mine = cellsOf(sp.r);
        at(cells.filter((z) => z[1] === 'in').length === mine.inside && cells.length === mine.touch, '칠한 칸 수 = 따로 센 칸 수');
        // 칸 자리 — 꼭 들어간 칸은 네 꼭짓점이 그린 원 안
        for (const z of cells.filter((y) => y[1] === 'in')) {
          const x0 = +z[4]; const y0 = +z[5];
          for (const [x, y] of [[x0, y0], [x0 + C, y0], [x0, y0 + C], [x0 + C, y0 + C]]) at(Math.hypot(x - cs[0].cx, y - cs[0].cy) <= R + 0.01, '꼭 들어간 칸이 원 밖으로');
        }
      }
      if (sp.kind === 'slices') {
        const pieces = [...svg.matchAll(/class="cir-piece" data-up="(\d)" d="M ([\d.]+) ([\d.]+) L [\d.]+ [\d.]+ A ([\d.]+) /g)];
        at(pieces.length === sp.n && [...svg.matchAll(/class="cir-slice"/g)].length === sp.n, `조각 ${sp.n}개`);
        at(pieces.every((z) => Math.abs(+z[4] - R) < 0.01), '조각의 반지름 = 원의 반지름');
        // 띠의 크기는 그린 조각에서 잰다 — 꼭짓점·끝점의 x, 호가 위로 볼록한 조각(꼭짓점이 아래)은 꼭짓점 − 반지름이 꼭대기
        const P = [...svg.matchAll(/class="cir-piece" data-up="(\d)" d="M ([\d.]+) ([\d.]+) L ([\d.]+) ([\d.]+) A [\d.]+ [\d.]+ 0 0 1 ([\d.]+) ([\d.]+) Z"/g)].map((z) => z.slice(1).map(Number));
        const xs = P.flatMap((p) => [p[1], p[3], p[5]]);
        const top = Math.min(...P.filter((p) => p[0] === 0).map((p) => p[2] - R)); const bot = Math.max(...P.filter((p) => p[0] === 1).map((p) => p[2] + R));
        const bw = Math.max(...xs) - Math.min(...xs);
        // 가로 ≈ 원주의 반 (조각이 클수록 반 조각만큼 길다) · 세로 ≈ 반지름 · 이웃 조각은 옆변을 나눠 쓴다(빈틈·겹침 없이)
        at(Math.abs(bw - Math.PI * R) < Math.PI * R * (sp.n === 8 ? 0.2 : 0.11), `띠의 가로 ${bw.toFixed(1)} ≈ 원주의 반 ${(Math.PI * R).toFixed(1)}`);
        at(Math.abs((bot - top) - R) < R * 0.1, '띠의 세로 ≈ 반지름');
        const sorted = [...P].sort((a, b) => a[1] - b[1]);
        for (let i = 1; i < sorted.length; i++) at(Math.abs(sorted[i][1] - sorted[i - 1][1] - (sorted[1][1] - sorted[0][1])) < 0.2, '조각 꼭짓점 간격이 고르다');
        const band = /class="cir-band" data-l="([\d.]+)" data-rt="([\d.]+)" data-t="([\d.]+)" data-b="([\d.]+)"/.exec(svg);
        at(Math.abs(+band[1] - Math.min(...xs)) < 0.2 && Math.abs(+band[2] - Math.max(...xs)) < 0.2, '이름표 자리(띠 끝)가 그린 띠와 같다');
      }
      if (sp.kind === 'row') {
        at(cs.length === sp.n && cs.every((z) => Math.abs(z.r - cs[0].r) < 0.01), `원 ${sp.n}개`);
        for (let i = 1; i < cs.length; i++) at(Math.abs(cs[i].cx - cs[i - 1].cx - 2 * cs[0].r) < 0.01, '맞닿게 (중심 사이 = 지름)');
      }
      // 이름표 — 서로 안 겹치고 그림 안에, 길이 이름표는 지시문의 수
      const boxes = labelBoxes(svg);
      for (let i = 0; i < boxes.length; i++) {
        const a = boxes[i];
        at(a.x0 >= 0 && a.y0 >= 0 && a.x1 <= W && a.y1 <= H, `이름표 "${a.t}"가 그림 밖`);
        for (let j = i + 1; j < boxes.length; j++) { const b = boxes[j]; at(!(a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1), `이름표 "${a.t}"·"${b.t}" 겹침`); }
      }
      for (const key of ['r', 'd', 'R']) if (typeof sp[key] === 'number' && sp.kind !== 'grid') at(boxes.some((b) => b.t === `${sp[key]} ${sp.unit}`), `이름표 ${sp[key]} ${sp.unit}`);
      // 글로 바꾸기
      const ft = figText(d);
      at(!/\[circle/.test(ft) && /원|반원|고리|모눈/.test(ft), `글로 "${ft}"`);
      n++;
    }
  }
  assert.ok(n > 200, `그린 그림 ${n} (같은 지시문은 한 번만)`);
  assert.deepEqual([...kinds].sort(), ['box', 'full', 'grid', 'half', 'poly', 'quarter', 'ring', 'row', 'slices', 'sq']);
  // 앱이 글 속 그림을 그리는 자리(renderFigures)도 [circle]을 안다 · 말이 안 되는 지시문은 빈 글자
  assert.ok(renderFigures('글 [circle r=5] 글').includes('cir-fig'));
  for (const bad of ['circle', 'circle r=5 d=12', 'circle r=? d=?', 'circle half r=5 d=10', 'circle ring R=5 r=6', 'circle ring R=12 r=2', 'circle grid r=9', 'circle grid r=4 m', 'circle slices r=5 n=10', 'circle row n=6 r=2', 'circle r=50', 'circle sq r=5', 'circle r=5 r=6', 'circle zz r=5']) assert.equal(figureSvg(bad), '', bad);
});

test('🔢 숫자판: 수가 답인 ①만 숫자판 · 단위는 질문 끝에서 (cm·m·cm²·m²·배) — 문장·식이 답이면 보기 고르기', () => {
  for (const { c, s, q } of every(['calc'], 200)) {
    const ok = q.choices.find((x) => x.ok).text;
    const spec = padSpec(q, 'circle');
    assert.equal(!!spec, valueOf(ok) !== null, `${c.id} #${s}: 정답 "${ok}" 숫자판 ${!!spec}`);
    if (!spec) continue;
    const want = (/몇 (cm²|m²|cm|m|배)/.exec(lastLine(q.q)) || [])[1] || '';
    assert.equal(spec.unit, want, `${c.id} #${s}: 숫자판 단위\n${q.q}`);
    assert.equal(spec.start, 'num', `${c.id} #${s}: 처음 칸은 수`);
  }
});

test('📏 진단·사다리·한 편·배움 예비·내용 검사', () => {
  const d = diagnosticSet(7, 5, OPTS);
  assert.equal(d.length, 5);
  assert.deepEqual(d.map((q) => q.concept), ['cir.parts', 'cir.circum', 'cir.estimate', 'cir.area', 'cir.apply']);
  assert.deepEqual(placeFrom(d.map((q, i) => ({ concept: q.concept, correct: i < 2 }))), { startId: 'cir.estimate', knownIds: ['cir.parts', 'cir.ratio', 'cir.circum'] });
  const L0 = ladder([]);
  assert.equal(L0[0].state, 'now');
  assert.ok(L0.slice(1).every((r) => r.state === 'locked'));
  for (const c of CIRCLE) {
    const round = makeRound(c.id, 11, OPTS);
    assert.ok(round.length >= 2 && round.every((q) => q.concept === c.id), c.id);
    const les = lessonOf(c.id, 3, OPTS);
    assert.ok(les.pages.length >= 1 && les.title === c.name);
  }
  assert.ok(checkContent({}).length >= 7, '빈 원고는 칸마다 걸린다');
});

// ───────────────────── 2단계: 원고 coach/math/circle.json ─────────────────────

const CONTENT = JSON.parse(readFileSync(new URL('../coach/math/circle.json', import.meta.url), 'utf8'));
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

test('원고(circle.json)가 형식 검사를 통과한다 — 7칸 모두 배움 3장↑·확인 2개↑·아빠 카드 (함정·통과 기준)', () => {
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

test('★ 원고 확인 질문도 따로 풀어 대조 — 전부 읽히고, 정답은 맞고, 오답은 정말 틀렸다', () => {
  const strip = (t) => String(t).replace(/ ?(cm²|m²|cm|m|배)$/, '');
  let solved = 0; let words = 0;
  for (const id of IDS) {
    for (const [i, p] of CONTENT[id].lesson.entries()) {
      if (!p.check) continue;
      const q = fillC(p.check.q); const ok = fillC(p.check.ok); const no = p.check.no.map(fillC);
      const where = `${id}[${i}]: ${q}`;
      // 말로 답하는 확인 질문 (원주율은 같다 · 잘라 붙여도 넓이는 같다)
      if (/두 원의 원주율을 바르게 말한 것/.test(q)) {
        assert.ok(/같아요/.test(ok) && /3\.14/.test(ok) && no.every((n) => !/같아요/.test(n)), where); words++; continue;
      }
      if (/붙인 모양의 넓이를 바르게 말한 것/.test(q)) {
        assert.equal(ok, '원의 넓이와 같아요', where); assert.ok(no.every((n) => /커요|작아요/.test(n)), where); words++; continue;
      }
      // 컴퍼스를 벌린 길이 = 반지름 (생성기에는 없는 확인 질문) — 오답은 지름(× 2)과 반(÷ 2)
      const cm = /컴퍼스를 (\d+) cm만큼 벌려서 원을 그렸어요\. 이 원의 반지름은 몇/.exec(q);
      if (cm) { assert.equal(strip(ok), cm[1], where); assert.deepEqual(no.map(strip).sort(), [String(2 * cm[1]), str(half(I(cm[1])))].sort(), where); words++; continue; }
      const { type, ans } = solveText(q);
      assert.equal(strip(ok), ans, `${where} (${type})`);
      for (const n of no) assert.notEqual(strip(n), ans, `${where}: 오답 "${n}"이 맞는 답`);
      // 오답 보기 하나하나가 이름표 있는 틀린 셈이다 (아무 수나 쓰지 않았다)
      const wrongs = Object.values(TAGV[type] || {}).map((fn) => fn(solveText(q).f));
      for (const n of no) assert.ok(wrongs.includes(strip(n)), `${where}: 오답 "${n}"은 어느 틀린 셈인가 (${wrongs.join(' · ')})`);
      solved++;
    }
  }
  assert.ok(solved >= 22 && words === 3, `따로 푼 확인 질문 ${solved} · 따로 읽은 것 ${words}`);
});

test('★ 원고의 그림: 모두 그려지고, 배움 글·확인 질문이 말하는 길이 = 그 장의 그림 (모눈 칸 수는 따로 센다)', () => {
  let n = 0;
  for (const id of IDS) {
    for (const [i, p] of CONTENT[id].lesson.entries()) {
      for (const [where, txt] of [['say', p.say], ['check', p.check ? p.check.q : '']]) {
        for (const d of txt.match(/\[[a-z]+ [^\]]+\]/g) || []) {
          assert.ok(figureSvg(d.slice(1, -1)), `${id}[${i}] ${where}: 못 그리는 ${d}`);
          n++;
          const sp = parseCircle(d.slice(8, -1));
          assert.ok(sp, `${id}[${i}]: [circle]만 쓴다 ${d}`);
          const text = fillC(txt.replace(/\[[a-z]+ [^\]]+\]/g, '')).replace(/\*\*/g, '');
          const at = (cond, msg) => assert.ok(cond, `${id}[${i}] ${where} ${d}: ${msg}\n${text}`);
          for (const k of ['r', 'd', 'R']) if (typeof sp[k] === 'number' && sp.kind !== 'grid') at(text.includes(`${sp[k]} ${sp.unit}`), `글에 "${sp[k]} ${sp.unit}"이 없다`);
          if (sp.kind === 'grid') { const c = cellsOf(sp.r); at(text.includes(`${sp.r} cm`) && text.includes(`${c.inside}칸`) && text.includes(`${c.touch}칸`), `모눈 칸 수 ${c.inside}·${c.touch}`); }
          if (sp.kind === 'row') at(text.includes(`${sp.n}개`), `${sp.n}개`);
          if (sp.kind === 'slices' && /n=/.test(d)) at(text.includes(`${sp.n}조각`), `${sp.n}조각`);
        }
      }
    }
  }
  assert.ok(n >= 20, `그림 ${n}`);
});

test('★ 원고의 조사·셈식·아직 안 배운 말·틀린 일반화 (배움 글·확인 질문·아빠 카드 전부)', () => {
  const BAT = new Set(['0', '1', '3', '6', '7', '8']);
  const PAIRS = [['을', '를'], ['은', '는'], ['이', '가'], ['과', '와'], ['이에요', '예요'], ['이니까', '니까'], ['이라서', '라서']];
  const FIRST = { 원주: 'cir.ratio', 원주율: 'cir.ratio', '원의 넓이': 'cir.estimate', '반지름 × 반지름': 'cir.formula', 반원: 'cir.apply', 고리: 'cir.apply', '4등분': 'cir.apply' };
  const BAD = [
    [/원주율(은|이|=) ?3\.14(?![\d배])/, '원주율은 3.1415… — "약 3.14"로'],
    [/지름의 3배(?!보다)/, '원주는 지름의 약 3.14배'],
    [/직사각형이 (돼|되|됩)/, '직사각형에 가까워질 뿐'],
    [/원주율은 3(?![.\d])/, '원주율 3은 어림한 값'],
  ];
  const ev = (expr) => Function(`return (${expr.replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-')})`)();
  let exprs = 0; let josaHits = 0;
  for (const id of IDS) {
    const all = contentText(CONTENT[id]);
    for (const [wb, nb] of PAIRS) {
      // 템플릿 글자 안이라 \\d로 — \d로 쓰면 "d"가 되어 숫자 뒤 조사를 하나도 안 본다 (일부러 "6를"로 틀려 보고 잡음)
      let hits = 0;
      for (const m of all.matchAll(new RegExp(`(\\d)(${wb}|${nb})(?=[\\s.,!?)—]|$)`, 'g'))) { assert.equal(m[2], BAT.has(m[1]) ? wb : nb, `${id}: "…${m[1]}${m[2]}"`); hits++; }
      josaHits += hits;
    }
    for (const m of all.matchAll(/(\d)(으로|로)(?=[\s.,]|$)/g)) assert.equal(m[2], ['1', '7', '8'].includes(m[1]) ? '로' : BAT.has(m[1]) ? '으로' : '로', `${id}: "…${m[1]}${m[2]}"`);
    assert.ok(!/(cm|m|cm²|m²)(은|을|이 |과|이에요|으로)/.test(all), `${id}: 단위 뒤 조사`);
    for (const m of all.matchAll(/(?<![\d.□])(\d+(?:\.\d+)?(?: [+−×÷] \d+(?:\.\d+)?)+) = (\d+(?:\.\d+)?)/g)) { assert.ok(Math.abs(ev(m[1]) - Number(m[2])) < 1e-6, `${id}: ${m[0]}`); exprs++; }
    const at = IDS.indexOf(id);
    for (const [w, first] of Object.entries(FIRST)) if (IDS.indexOf(first) > at) assert.ok(!all.includes(w), `${id}: 아직 안 배운 "${w}"\n${all.match(new RegExp(`.*${w}.*`))?.[0]}`);
    const truths = contentTruths(CONTENT[id]);
    for (const [re, why] of BAD) assert.ok(!re.test(truths), `${id}: ${why}\n${truths.match(new RegExp(`.*${re.source}.*`))?.[0]}`);
  }
  assert.ok(exprs >= 40, `원고 속 셈식 ${exprs}`);
  assert.ok(josaHits >= 15, `수 뒤 조사를 실제로 본 곳 ${josaHits} (검사가 빈 채로 통과하지 않게)`);
});

// ───────────────────── 3단계: 화면 연결 ─────────────────────

test('화면 연결 (3단계): STEMS.circle(N)은 이 생성기·원고를 쓰고, 앱 셸이 둘 다 들고 간다 · ❓ 복사문·📊 답장 안내에 [circle] 예 · 사다리 안내에 C 소수 줄기', async () => {
  const { STEMS, STEM_ORDER, stemOf } = await import('../js/mathprog.js');
  assert.equal(STEMS.circle.code, 'N');
  assert.equal(STEM_ORDER[STEM_ORDER.length - 1], 'circle');
  assert.equal(STEMS.circle.list, CIRCLE);
  assert.equal(STEMS.circle.gen.makeQuestion, makeQuestion);
  assert.ok(IDS.every((id) => stemOf(id) === STEMS.circle), '모든 칸이 N 줄기로 찾아진다');
  assert.match(STEMS.circle.pick, /C 소수 줄기/);
  const sw = readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
  for (const f of ['./js/mathcircle.js', './coach/math/circle.json']) assert.ok(sw.includes(`'${f}'`), `APP_SHELL에 ${f}`);
  const ask = readFileSync(new URL('../js/mathask.js', import.meta.url), 'utf8');
  const stats = readFileSync(new URL('../js/stats.js', import.meta.url), 'utf8');
  for (const src of [ask, stats]) for (const ex of src.match(/\[circle [^\]]+\]/g) || ['없음']) assert.ok(figureSvg(ex.slice(1, -1)), `예시가 그려지지 않음: ${ex}`);
  assert.ok(ask.includes('[circle r=5]') && stats.includes('[circle r=5]'), '❓ 복사문·📊 답장 안내에 [circle] 예');
});
