// 🔢 H 규칙과 대응 줄기 생성기 테스트: node --test tests/mathcor.test.js
//
// ★ 핵심은 **독립 검산** — 생성기가 알려 주는 값(probe)을 믿지 않고 **문제 글·표·그림 지시문을 이 파일이 직접 읽어**
//   규칙을 따로 찾고(차이·배·두 번 셈) 다시 푼다. 표 읽기·식 셈도 이 파일에서 새로 짠다 (mathdraw.parseTable을 쓰면 검산이 아니다).
// ★ 이름표는 값만이 아니라 **방향**까지 (앞으로/거꾸로, 어느 양이 큰가) — Codex 13차·14차가 잡은 모양.
// ★ 씨앗은 개념마다 수천 개 (COR_SEEDS=20000으로 넓게).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  CORRESPOND, TAGS, makeQuestion, makeRound, conceptById, ladder, placeFrom, diagnosticSet, lessonOf, checkContent, gradeLabel, valueOf,
} from '../js/mathcor.js';
import { figureSvg, stepsSvg, tableSvg, renderFigures } from '../js/mathdraw.js';

const OPTS = { names: ['피카츄', '리자몽', '개굴닌자'], me: '진우', worlds: { pokemon: [], toystory: [], minions: [], moana: [] } };
const SEEDS = Number(process.env.COR_SEEDS) || 1500;

// ── 글 읽기 ──
const nums = (t) => (String(t).match(/\d+/g) || []).map(Number);
const lastNum = (t) => { const n = nums(t); return n.length ? n[n.length - 1] : null; };
const plain = (q) => String(q).replace(/\*\*/g, '');

/** 수 배열 "5, 9, 13, 17, …" · "2, 4, 8, 16, □" · "96, 88, □, 72, 64" → [수 또는 null] (표가 없는 글에서만 부른다) */
function readSeq(q) {
  const m = /((?:\d+|□)(?:, (?:\d+|□)){3,})/.exec(plain(q));
  return m ? m[1].split(', ').map((t) => (t === '□' ? null : Number(t))) : null;
}
/** 알려진 칸으로 규칙 찾기 — 늘 같은 차이 또는 늘 같은 배 */
function fitSeq(seq) {
  const known = seq.map((v, i) => [i, v]).filter(([, v]) => v !== null);
  const [[i0, v0], [i1, v1]] = known;
  const d = (v1 - v0) / (i1 - i0);
  if (Number.isInteger(d) && known.every(([i, v]) => v === v0 + (i - i0) * d)) return { kind: 'add', d, f: (i) => v0 + (i - i0) * d };
  const k = Math.round(Math.pow(v1 / v0, 1 / (i1 - i0)));
  if (known.every(([i, v]) => v === v0 * Math.pow(k, i - i0))) return { kind: 'mul', k, f: (i) => v0 * Math.pow(k, i - i0) };
  return null;
}
/** [steps 3 5 7] → 블록 수 (늘 같은 차이인지까지) */
function readSteps(q) {
  const m = /\[steps ([\d ]+)\]/.exec(q);
  if (!m) return null;
  const cs = m[1].trim().split(/\s+/).map(Number);
  const d = cs[1] - cs[0];
  assert.ok(d > 0 && cs.every((v, i) => v === cs[0] + i * d), `도형 배열이 늘 같은 수만큼 늘지 않는다: ${m[0]}`);
  return { cs, s: cs[0], d };
}
/** [table 라벨:1, 2, 3 / 라벨:4, 8, ?] → 두 줄 (이 파일이 따로 읽는다) */
function readTable(q) {
  const m = /\[table ([^\]]+)\]/.exec(q);
  if (!m) return null;
  const rows = m[1].split(/\s+\/\s+/).map((part) => {
    const r = /^(.+?):(.+)$/.exec(part.trim());
    return { label: r[1].trim(), vals: r[2].split(',').map((v) => (v.trim() === '?' ? null : Number(v.trim()))) };
  });
  assert.equal(rows.length, 2, `표는 두 줄: ${m[0]}`);
  assert.equal(rows[0].vals.length, rows[1].vals.length, `표 칸 수: ${m[0]}`);
  return { x: rows[0], y: rows[1], pairs: rows[0].vals.map((v, i) => [v, rows[1].vals[i]]) };
}
/** 짝들에 맞는 규칙 — 더하기/빼기 · 곱하기 · 나누기 · 두 번 셈 (y = a·x + b) */
function fitPairs(pairs) {
  const P = pairs.filter(([x, y]) => x !== null && y !== null);
  const all = (f) => P.every(([x, y]) => f(x) === y);
  const [x0, y0] = P[0]; const [x1, y1] = P[1];
  if (all((x) => x + (y0 - x0))) { const c = y0 - x0; return { kind: 'add', c, f: (x) => x + c, inv: (y) => y - c }; }
  if (Number.isInteger(y0 / x0) && all((x) => x * (y0 / x0))) { const k = y0 / x0; return { kind: 'mul', k, f: (x) => x * k, inv: (y) => y / k }; }
  const a = (y1 - y0) / (x1 - x0); const b = y0 - a * x0;
  if (Number.isInteger(a) && all((x) => a * x + b)) return { kind: 'two', a, b, f: (x) => a * x + b, inv: (y) => (y - b) / a };
  return null;
}
/** "△ = □ × 4 + 1" → { lhs, rhs, f } — 왼쪽부터 셈 (이 줄기의 식은 × ÷ 다음에 + − 뿐) */
function parseEq(t) {
  const m = /^([□△]) = ([□△])((?: [×÷+−] \d+)*)$/.exec(String(t).trim());
  if (!m || m[1] === m[2]) return null;
  const ops = [...m[3].matchAll(/([×÷+−]) (\d+)/g)].map((x) => [x[1], Number(x[2])]);
  for (let i = 1; i < ops.length; i++) assert.ok(!('×÷'.includes(ops[i][0]) && '+−'.includes(ops[i - 1][0])), `셈 순서가 왼쪽부터가 아니다: ${t}`);
  const f = (x) => ops.reduce((v, [o, n]) => (o === '×' ? v * n : o === '÷' ? v / n : o === '+' ? v + n : v - n), x);
  return { lhs: m[1], rhs: m[2], ops, f };
}
const fits = (eq, pairs) => !!eq && pairs.every(([x, y]) => (eq.lhs === '△' ? eq.f(x) === y : eq.f(y) === x));
/** □와 △를 맞바꾼 식 */
const swapSym = (t) => String(t).replace(/[□△]/g, (s) => (s === '□' ? '△' : '□'));

/** 수 배열 규칙 말하기 "5부터 시작해서 3씩 커져요" 참거짓 */
function seqTruth(t, seq) {
  const m = /^(\d+)부터 시작해서 (\d+)씩 (커져요|작아져요|곱해요)$/.exec(t);
  if (!m) return null;
  const [a, d] = [+m[1], +m[2]];
  const gen = (i) => (m[3] === '커져요' ? a + i * d : m[3] === '작아져요' ? a - i * d : a * Math.pow(d, i));
  return seq.every((v, i) => v === gen(i));
}
/** 두 양 관계 문장 "의자 수는 탁자 수의 4배예요" 참거짓 — X 수 = x, Y 수 = k·x */
function relTruth(t, X, Y, k) {
  const val = (name, x) => (name === `${X} 수` ? x : name === `${Y} 수` ? k * x : NaN);
  const xs = [1, 2, 3, 4, 5, 6];
  let m;
  if ((m = /^(.+?)는 (.+?)의 (\d+)배예요$/.exec(t))) return xs.every((x) => val(m[1], x) === +m[3] * val(m[2], x));
  if ((m = /^(.+?)는 (.+?)보다 (\d+) (많아요|적어요)$/.exec(t))) return xs.every((x) => val(m[1], x) === val(m[2], x) + (m[4] === '많아요' ? +m[3] : -m[3]));
  if ((m = /^(.+?)[이가] 늘어도 (.+?)는 그대로예요$/.exec(t))) return k === 0;
  return null;
}

// ── 4학년 「규칙 찾기」 새 칸(v289) 읽기 — 계산식 줄 · 등호 식 · 차이가 커지는 배열 (생성기와 따로 짠다) ──
const NEW4 = ['cor.calcseq', 'cor.equal', 'cor.apply4'];
const ORDW = ['첫째', '둘째', '셋째', '넷째', '다섯째', '여섯째', '일곱째', '여덟째', '아홉째', '열째'];
const ordNum = (w) => { const n = ORDW.indexOf(w) + 1; assert.ok(n > 0, `차례 말을 못 읽었다: ${w}`); return n; };
/** 차례 말 하나 (옛 칸의 "10번째"는 안 잡는다) */
const ORD_RE = `(${ORDW.join('|')})`;
const OPS = { '+': (a, b) => a + b, '−': (a, b) => a - b, '×': (a, b) => a * b, '÷': (a, b) => a / b };
/** 계산식 줄 "**201 + 11 = 212**" — 줄 전체가 식 하나인 줄만 (□가 든 다섯째 식은 안 읽힌다) */
function readRows(q) {
  const rows = [...String(q).matchAll(/^\*\*(\d+) ([+−×÷]) (\d+) = (\d+)\*\*$/gm)].map((m) => ({ x: +m[1], op: m[2], y: +m[3], z: +m[4] }));
  return rows.length >= 4 ? rows : null;
}
/** 줄마다 같은 수만큼 변하는 칸 → n째 값 */
function colAt(rows, key, n) {
  const v = rows.map((r) => r[key]); const d = v[1] - v[0];
  assert.ok(v.every((x, i) => x === v[0] + i * d), `계산식 배열의 ${key} 칸이 늘 같은 수만큼 변하지 않는다: ${v}`);
  return v[0] + (n - 1) * d;
}
/** n째 계산식 — 칸마다 따로 늘리고, 셈이 맞는지 이 파일이 다시 계산한다 */
function rowAt(rows, n) {
  const { op } = rows[0];
  assert.ok(rows.every((r) => r.op === op && OPS[op](r.x, r.y) === r.z), `보여 준 계산식이 틀렸다: ${JSON.stringify(rows)}`);
  const R = { x: colAt(rows, 'x', n), op, y: colAt(rows, 'y', n), z: colAt(rows, 'z', n) };
  assert.equal(OPS[op](R.x, R.y), R.z, `${n}째 계산식의 셈이 규칙과 안 맞는다: ${JSON.stringify(R)}`);
  return R;
}
/** "a + b = c − d" · "a + b = c" · "a + b" → { a, op, b, c, op2, d } (못 읽으면 null) */
function parseCalc(t) {
  const m = /^(\d+) ([+−×÷]) (\d+)(?: = (\d+)(?: ([+−×÷]) (\d+))?)?$/.exec(String(t).trim());
  if (!m) return null;
  return { a: +m[1], op: m[2], b: +m[3], c: m[4] === undefined ? null : +m[4], op2: m[5] || null, d: m[6] === undefined ? null : +m[6] };
}
const sideVal = (p) => (p.op2 ? OPS[p.op2](p.c, p.d) : p.c);
/** 차이가 늘 같은 수만큼 커지는 배열 → i(0부터)째 값 */
function growAt(seq, i) {
  const d1 = seq.slice(1).map((v, k) => v - seq[k]); const e = d1[1] - d1[0];
  assert.ok(e !== 0 && d1.every((v, k) => v === d1[0] + k * e), `차이가 늘 같은 수만큼 커지지 않는다: ${seq}`);
  let v = seq[0]; for (let k = 0; k < i; k++) v += d1[0] + k * e;
  return v;
}
/** 새 칸 문제 글 → 정답 (못 읽는 꼴이면 null — 옛 칸 해석기로 넘어간다) */
function solveNew(q) {
  let m;
  if ((m = new RegExp(String.raw`\*\*([\d, ]+), …\*\*\n\n이 규칙대로라면 ` + ORD_RE + ' 수는 얼마').exec(q))) { // ⭐ 차이가 커지는 배열
    const seq = m[1].split(', ').map(Number); const n = ordNum(m[2]);
    return { v: growAt(seq, n - 1), ctx: { kind: 'grow', seq, n } };
  }
  const rows = readRows(q);
  if (rows) {
    if ((m = new RegExp(ORD_RE + '에 알맞은 덧셈식은 어느 것').exec(q))) {
      const n = ordNum(m[1]); const R = rowAt(rows, n);
      return { sent: (t) => { const p = parseCalc(t); if (!p || p.c === null || p.op2) return null; return p.a === R.x && p.op === R.op && p.b === R.y && p.c === R.z; }, ctx: { kind: 'nextRow', rows, n, R } };
    }
    if ((m = new RegExp(ORD_RE + ' 계산식의 계산 결과는 얼마').exec(q))) { const n = ordNum(m[1]); return { v: rowAt(rows, n).z, ctx: { kind: 'rowRes', rows, n } }; }
    if ((m = /다섯째 (?:뺄셈식|덧셈식) \*\*(\d+) ([+−]) (\d+) = □\*\*에서 □/.exec(q))) {
      const R = rowAt(rows, 5);
      assert.deepEqual([+m[1], m[2], +m[3]], [R.x, R.op, R.y], `다섯째 식이 규칙과 다르다: ${q}`);
      return { v: OPS[m[2]](+m[1], +m[3]), ctx: { kind: 'keep', rows, t: rows[1].x - rows[0].x } };
    }
    if ((m = /계산 결과가 (\d+)인 덧셈식은 (어느 것|몇째)/.exec(q))) {
      const S = +m[1]; let n = 1; while (colAt(rows, 'z', n) < S && n < 30) n++;
      assert.equal(colAt(rows, 'z', n), S, `결과가 ${S}인 줄이 없다: ${q}`);
      const R = rowAt(rows, n);
      if (m[2] === '몇째') return { v: n, ctx: { kind: 'orderAdd', rows, n, R } };
      return { sent: (t) => { const p = parseCalc(t); if (!p || p.c !== null) return null; return p.a === R.x && p.op === '+' && p.b === R.y; }, ctx: { kind: 'findRow', rows, n, R, S } };
    }
    if ((m = /몇째 계산식이 \*\*(\d+) ([+−×÷]) (\d+) = (\d+)\*\*일까요/.exec(q))) {
      const X = +m[1]; let n = 1; while (colAt(rows, 'x', n) < X && n < 30) n++;
      const R = rowAt(rows, n);
      assert.deepEqual([R.x, R.op, R.y, R.z], [X, m[2], +m[3], +m[4]], `그 계산식이 규칙에 없다: ${q}`);
      return { v: n, ctx: { kind: 'orderRow', rows, n, X } };
    }
    return null;
  }
  // 등호 — □가 든 식
  if ((m = /^\*\*(\d+) ([+−]) (\d+) = (□|\d+) ([+−]) (□|\d+)\*\*\n\n□에 알맞은 수/.exec(q))) {
    const L = OPS[m[2]](+m[1], +m[3]); const op2 = m[5]; const boxL = m[4] === '□';
    assert.ok(boxL !== (m[6] === '□'), `□는 한 자리만: ${q}`);
    const v = boxL ? (op2 === '+' ? L - +m[6] : L + +m[6]) : (op2 === '+' ? L - +m[4] : +m[4] - L);   // □ ± d = L · c ± □ = L
    return { v, ctx: { kind: 'box', a: +m[1], op: m[2], b: +m[3], op2, other: boxL ? +m[6] : +m[4], pos: boxL ? 'L' : 'R' } };
  }
  if ((m = /^\*\*(\d+) \+ (\d+) \+ (\d+) = □ \+ (\d+)\*\*/.exec(q))) { const [a, b, c, T] = m.slice(1).map(Number); return { v: a + b + c - T, ctx: { kind: 'grpAdd', a, b, c, T } }; }
  if ((m = /^\*\*(\d+) − □ = (\d+) − (\d+) − (\d+)\*\*/.exec(q))) {
    const [a, a2, b, c] = m.slice(1).map(Number); assert.equal(a, a2, q);
    return { v: a - (a2 - b - c), ctx: { kind: 'grpSub', a, b, c } };
  }
  if ((m = /^(\d+) ([+−]) (\d+)[과와] 크기가 같은 것을 등호로 바르게 나타낸 식은/.exec(q))) {
    const a = +m[1]; const op = m[2]; const b = +m[3]; const L = OPS[op](a, b);
    return { sent: (t) => { const p = parseCalc(t); if (!p || p.c === null || !p.op2 || p.a !== a || p.op !== op || p.b !== b) return null; return sideVal(p) === L; }, ctx: { kind: 'judge', a, op, b, L } };
  }
  if ((m = /스티커를 (\d+)장과 (\d+)장 모았고, .+? (\d+)장과 (\d+)장 모았어요\. 둘이 모은 스티커 수는 같아요/.exec(q))) { // 이름에 띄어쓰기("탈라 할머니")
    const [a, b, c, d] = m.slice(1).map(Number); assert.equal(a + b, c + d, q);
    const pair = (x, y, p, r) => (x === p && y === r) || (x === r && y === p);
    return { sent: (t) => {
      if (/^\d+ \+ \d+ \+ \d+ \+ \d+$/.test(t)) return false;                                     // 등호가 없는 식 — 같다는 것을 못 나타낸다
      const p = parseCalc(t); if (!p || p.c === null || !p.op2 || p.op !== '+' || p.op2 !== '+') return null;
      const sides = (pair(p.a, p.b, a, b) && pair(p.c, p.d, c, d)) || (pair(p.a, p.b, c, d) && pair(p.c, p.d, a, b));
      return sides && p.a + p.b === p.c + p.d;
    }, ctx: { kind: 'story', a, b, c, d } };
  }
  return null;
}

/**
 * 문제 글 → 정답 (생성기와 따로)
 * { v } 수 · { eqs: 짝, lhs } 표에 맞는 식이 딱 하나 · { sent: 참거짓 } 참인 문장이 딱 하나 — ctx: 이름표 확인용 재료
 */
function solveText(q0) {
  const q = plain(q0);
  const nw = solveNew(String(q0));
  if (nw) return nw;
  let m;
  // 식이 주어진 문항 (앞으로·거꾸로)
  if ((m = /^([△□] = [△□](?: [×÷+−] \d+)+)에서 ([□△])가 (\d+)일 때 ([□△])는 얼마/.exec(q))) {
    const eq = parseEq(m[1]); const given = m[2]; const val = +m[3];
    assert.notEqual(given, m[4], q);
    if (given === eq.rhs) return { v: eq.f(val), ctx: { kind: 'fwd', eq, val } };
    const hits = []; for (let x = 0; x <= 3000; x++) if (eq.f(x) === val) hits.push(x);
    assert.equal(hits.length, 1, `거꾸로 답이 하나가 아니다: ${q}`);
    return { v: hits[0], ctx: { kind: 'inv', eq, val } };
  }
  // 표
  const T = readTable(q);
  if (T) {
    const R = fitPairs(T.pairs);
    assert.ok(R, `표의 규칙을 못 찾았다: ${q}`);
    if (/식으로 나타내면|구하는 식은/.test(q)) return { eqs: T.pairs, lhs: /□를 구하는 식/.test(q) ? '□' : null, ctx: { kind: 'eq', T, R } };
    if (/표의 \?에 알맞은 수/.test(q)) {
      const i = T.pairs.findIndex(([x, y]) => x === null || y === null);
      const [x, y] = T.pairs[i];
      return { v: y === null ? R.f(x) : R.inv(y), ctx: { kind: 'fill', T, R, x } };
    }
    if ((m = /표를 보고, (.+?)[이가] (\d+)(?:개|대|마리)?일 때 (.+?)[은는] (?:몇|얼마)/.exec(q))) {
      const noun = (l) => l.replace(/\(.+\)$/, '');
      const N = +m[2];
      if (noun(T.x.label) === m[1]) { assert.equal(noun(T.y.label), m[3], q); return { v: R.f(N), ctx: { kind: 'tfwd', T, R, N } }; }
      assert.equal(noun(T.y.label), m[1], `표에 없는 양을 물었다: ${q}`); assert.equal(noun(T.x.label), m[3], q);
      const v = R.inv(N); assert.ok(Number.isInteger(v), q);
      return { v, ctx: { kind: 'tinv', T, R, M: N } };
    }
    return null;
  }
  // 도형 배열
  const S = readSteps(q);
  if (S) {
    const { s, d, cs } = S;
    if ((m = /(\d+)번째 모양에는 블록이 몇 개/.exec(q))) return { v: s + (+m[1] - 1) * d, ctx: { kind: 'snth', s, d, n: +m[1], cnt: cs.length } };
    if (/몇 개씩 늘어날까요/.test(q)) return { v: d, ctx: { kind: 'sstep', s, d } };
    if ((m = /블록이 (\d+)개인 모양은 몇 번째/.exec(q))) {
      const k = (+m[1] - s) / d; assert.ok(Number.isInteger(k) && k >= 0, `그런 모양이 없다: ${q}`);
      return { v: k + 1, ctx: { kind: 'sinv', s, d, M: +m[1], m: k + 1 } };
    }
    return null;
  }
  // 수 배열
  const seq = readSeq(q);
  if (seq) {
    if (/이 수 배열의 규칙을 바르게 말한 것은/.test(q)) return { sent: (t) => seqTruth(t, seq), ctx: { kind: 'say', seq } };
    const R = fitSeq(seq);
    assert.ok(R, `수 배열 규칙을 못 찾았다: ${q}`);
    if ((m = /(\d+)번째 (?:수는|날에는)/.exec(q))) return { v: R.f(+m[1] - 1), ctx: { kind: 'nth', a: R.f(0), d: R.d, n: +m[1] } };
    if (/□에 알맞은 수/.test(q)) { const i = seq.indexOf(null); return { v: R.f(i), ctx: { kind: R.kind === 'mul' ? 'geo' : 'gap', seq, i, d: R.d } }; }
    return null;
  }
  // 곱하는 대응 이야기 (탁자·상자·세발자전거·문어)
  if ((m = /(\S+) 1(?:개|대|마리)에 (\S+?)[이가] (\d+)개씩/.exec(q))) {
    const [X, Y, k] = [m[1], m[2], +m[3]];
    let n;
    if ((n = /(\S+?)[이가] (\d+)(?:개|대|마리)면 (\S+?)[은는] 모두 몇/.exec(q))) { assert.equal(n[1], X, q); assert.equal(n[3], Y, q); return { v: k * +n[2], ctx: { kind: 'frame', k, N: +n[2] } }; }
    if (/사이의 대응 관계를 바르게 말한 것은/.test(q)) return { sent: (t) => relTruth(t, X, Y, k), ctx: { kind: 'rel' } };
    if ((n = /(\S+) 수를 □, (\S+) 수를 △라고 할 때/.exec(q))) {
      assert.deepEqual([n[1], n[2]], [X, Y], q);
      return { eqs: [1, 2, 3, 4, 5, 6].map((x) => [x, k * x]), lhs: null, ctx: { kind: 'eq', R: { kind: 'mul', k } } };
    }
    return null;
  }
  // 함께 오르는 레벨
  if ((m = /지금 (.+?)의 레벨은 (\d+), (.+?)의 레벨은 (\d+)인데, (.+?)의 레벨이 (\d+)[이가] 되면 (.+?)의 레벨은 얼마/.exec(q))) {
    assert.equal(m[5], m[1], q); assert.equal(m[7], m[3], q);
    const [p, qq, N] = [+m[2], +m[4], +m[6]];
    return { v: N + (qq - p), ctx: { kind: 'level', p, q: qq, N } };
  }
  // 시차
  if ((m = /서울이 오후 (\d+)시일 때 (\S+?)[은는] 오후 (\d+)시예요\. 서울이 오후 (\d+)시일 때 (\S+?)[은는] 오후 몇 시/.exec(q))) {
    assert.equal(m[5], m[2], q);
    const g = +m[1] - +m[3]; const H = +m[4];
    assert.ok(H - g >= 1 && H + g <= 12, `시각이 오후 1~12시 밖: ${q}`);
    return { v: H - g, ctx: { kind: 'time', g, H } };
  }
  // 통나무
  if ((m = /도막 (\d+)개를 만들려고 해요\. 몇 번 잘라야/.exec(q))) return { v: +m[1] - 1, ctx: { kind: 'log', n: +m[1] } };
  if (/도막 수를 □, 자른 횟수를 △라고/.test(q)) return { eqs: [2, 3, 4, 5, 6, 7, 8].map((n) => [n, n - 1]), lhs: null, ctx: { kind: 'eq', R: { kind: 'add', c: -1 } } };
  // 코인으로 사기
  if ((m = /한 개에 코인 (\d+)개예요\. 코인 (\d+)개를 모두 쓰면/.exec(q))) {
    const v = +m[2] / +m[1]; assert.ok(Number.isInteger(v), q);
    return { v, ctx: { kind: 'coins', p: +m[1], M: +m[2] } };
  }
  return null;
}

test('독립 글 읽기·그림 자체 점검', () => {
  assert.deepEqual(readSeq('**2, 4, 8, 16, □**'), [2, 4, 8, 16, null]);
  assert.equal(fitSeq([2, 4, 8, 16, null]).f(4), 32);
  assert.equal(fitSeq([96, 88, null, 72, 64]).f(2), 80);
  assert.equal(solveText('규칙에 따라 수를 늘어놓았어요.\n\n**5, 9, 13, 17, …**\n\n이 규칙대로라면 10번째 수는 얼마일까요?').v, 41);
  assert.equal(solveText('피카츄가 블록으로 규칙에 따라 모양을 만들었어요.\n\n[steps 1 3 5 7]\n\n10번째 모양에는 블록이 몇 개일까요?').v, 19);
  assert.equal(solveText('[steps 3 5 7]\n\n블록이 21개인 모양은 몇 번째일까요?').v, 10);
  const T = solveText('상자 수와 몬스터볼 수 사이의 대응 관계를 표로 나타냈어요.\n\n[table 상자 수(개):1, 2, 3, 4 / 몬스터볼 수(개):6, 12, 18, 24]\n\n표를 보고, 몬스터볼 수가 60개일 때 상자 수는 몇 개일까요?');
  assert.equal(T.v, 10);
  assert.equal(solveText('△ = □ × 2 + 1에서 △가 21일 때 □는 얼마일까요?').v, 10);
  assert.equal(solveText('△ = □ ÷ 4에서 △가 13일 때 □는 얼마일까요?').v, 52);
  assert.ok(fits(parseEq('△ = □ × 2 + 1'), [[1, 3], [2, 5]]) && !fits(parseEq('△ = □ + 2'), [[1, 3], [2, 5]]));
  assert.ok(fits(parseEq('□ = △ ÷ 4'), [[1, 4], [2, 8]]));
  assert.equal(relTruth('의자 수는 탁자 수의 4배예요', '탁자', '의자', 4), true);
  assert.equal(relTruth('탁자 수는 의자 수의 4배예요', '탁자', '의자', 4), false);
  assert.equal(relTruth('의자 수는 탁자 수보다 4 많아요', '탁자', '의자', 4), false);
  assert.equal(seqTruth('4부터 시작해서 3씩 커져요', [4, 7, 10, 13, 16]), true);
  assert.equal(solveText('서울이 오후 5시일 때 방콕은 오후 3시예요. 서울이 오후 9시일 때 방콕은 오후 몇 시일까요?').v, 7);
  assert.equal(solveText('리자몽과 피카츄는 늘 함께 배틀해서 레벨이 똑같이 올라요. 지금 리자몽의 레벨은 4, 피카츄의 레벨은 7인데, 리자몽의 레벨이 12가 되면 피카츄의 레벨은 얼마일까요?').v, 15);
});

test('그림: [steps]는 블록 수만큼 칸을 그리고, [table]은 칸마다 글자 — 못 그리는 지시문은 빈 글자', () => {
  const rects = (svg) => (svg.match(/<rect /g) || []).length;
  for (const cs of [[1, 3, 5, 7], [3, 5, 7], [2, 4, 6, 8], [7, 10, 13], [5, 9, 13, 17], [1, 6, 11, 16]]) {
    const svg = stepsSvg(cs);
    assert.ok(svg, `그려야 한다: ${cs}`);
    assert.equal(rects(svg), cs.reduce((a, b) => a + b, 0), `블록 수만큼 칸: ${cs}`);
    assert.equal(figureSvg(`steps ${cs.join(' ')}`), svg);
  }
  assert.equal(stepsSvg([3, 5, 8]), '', '늘 같은 수만큼 늘지 않으면 안 그린다');
  assert.equal(stepsSvg([5]), '');
  const t = tableSvg([{ label: '□', vals: [1, 2, 3, 4] }, { label: '△', vals: [4, 8, 12, '?'] }]);
  assert.equal((t.match(/<text /g) || []).length, 10);
  assert.match(t, />\?</);
  assert.equal(figureSvg('table 탁자 수(개):1, 2, 3 / 의자 수(개):4, 8, ?'), tableSvg([{ label: '탁자 수(개)', vals: [1, 2, 3] }, { label: '의자 수(개)', vals: [4, 8, '?'] }]));
  assert.equal(figureSvg('table □:1, 2, 3 / △:4, 8'), '', '칸 수가 다르면 안 그린다');
  assert.equal(figureSvg('table 아무 말'), '');
  assert.match(renderFigures('앞 [table □:1, 2 / △:3, 4] 뒤'), /^앞 <svg[\s\S]*<\/svg> 뒤$/);
  assert.match(renderFigures('[steps 1 3 5]'), /^<svg/);
  // 글자에 <가 들어가도 SVG가 깨지지 않는다
  assert.doesNotMatch(tableSvg([{ label: '<b>', vals: [1, 2] }, { label: 'x', vals: [3, 4] }]), /<b>/);
});

test('사다리: 11칸, 초4 다섯(4-1 「규칙 찾기」 새 칸 셋 v289) + 초5 여섯 · needs가 바로 앞 칸 — 5학년 첫 칸만 그대로 도형 배열(새 칸이 길을 막지 않게)', () => {
  assert.equal(CORRESPOND.length, 11);
  const ids = CORRESPOND.map((c) => c.id);
  assert.equal(new Set(ids).size, 11);
  assert.deepEqual(ids.slice(0, 5), ['cor.numseq', 'cor.shapeseq', 'cor.calcseq', 'cor.equal', 'cor.apply4']);
  for (const [k, c] of CORRESPOND.entries()) {
    assert.ok(/^cor\./.test(c.id) && c.name && c.idea && c.slip, c.id);
    assert.equal(c.grade, k < 5 ? 4 : 5, c.id);
    assert.deepEqual(c.needs, c.id === 'cor.pair' ? ['cor.shapeseq'] : k ? [ids[k - 1]] : [], c.id);
  }
  assert.match(conceptById('cor.apply4').name, /^⭐ /);
  assert.equal(gradeLabel(4), '초4');
  assert.equal(valueOf('△ = □ × 4'), null);
  assert.equal(valueOf('5부터 시작해서 3씩 커져요'), null);
  assert.equal(valueOf('12'), 12);
});

test('★ 독립 검산: ① 정답이 문제 글을 따로 읽어 푼 답과 같다 · 딱 하나만 맞다', () => {
  for (const c of CORRESPOND) {
    for (let s = 1; s <= SEEDS; s++) {
      const q = makeQuestion(c.id, 'calc', s * 7919, OPTS);
      const where = `${c.id} seed ${s}: "${q.q.replace(/\n/g, ' ')}"`;
      const w = solveText(q.q);
      assert.ok(w, `${where} — 글을 못 읽었다 (해석기에 말투를 더할 것)`);
      const ok = q.choices.find((x) => x.ok).text;
      if (w.v !== undefined) {
        assert.equal(Number(ok), w.v, `${where} — 정답`);
        for (const ch of q.choices.filter((x) => !x.ok)) assert.notEqual(Number(ch.text), w.v, `${where} — 오답 ${ch.text}이 사실 정답`);
      } else if (w.eqs) {
        const good = q.choices.filter((x) => fits(parseEq(x.text), w.eqs));
        assert.ok(q.choices.every((x) => parseEq(x.text)), `${where} — 못 읽는 식 보기 (${q.choices.map((x) => x.text).join(' / ')})`);
        assert.equal(good.length, 1, `${where} — 표에 맞는 식이 ${good.length}개 (${q.choices.map((x) => x.text).join(' / ')})`);
        assert.ok(good[0].ok, `${where} — 맞는 식이 정답 표시가 아니다`);
        if (w.lhs) assert.ok(ok.startsWith(`${w.lhs} =`), `${where} — ${w.lhs}를 구하는 식이어야`);
      } else if (w.sent) {
        const truths = q.choices.map((x) => w.sent(x.text));
        assert.ok(truths.every((t) => t !== null), `${where} — 못 읽는 문장 보기 (${q.choices.map((x) => x.text).join(' / ')})`);
        assert.equal(truths.filter(Boolean).length, 1, `${where} — 참인 문장이 ${truths.filter(Boolean).length}개`);
        assert.ok(q.choices[truths.indexOf(true)].ok, where);
      } else assert.fail(`${where} — 답을 정하지 못했다`);
    }
  }
});

test('★ 보기: 정답 하나, 글자 겹침 없음, 나오면 안 되는 글자 없음, 수가 너무 크지 않음, 그림 지시문은 그려진다', () => {
  for (const c of CORRESPOND) {
    for (let s = 1; s <= SEEDS; s++) {
      for (const kind of ['calc', 'misread']) {
        const q = makeQuestion(c.id, kind, s * 104729, OPTS);
        const where = `${c.id}/${kind} seed ${s}`;
        assert.equal(q.choices.filter((x) => x.ok).length, 1, `${where}: 정답 하나`);
        assert.ok(q.choices.length >= 3, `${where}: 보기 3개↑ (${q.choices.map((x) => x.text).join(' / ')})`);
        const texts = q.choices.map((x) => String(x.text).trim());
        assert.equal(new Set(texts).size, texts.length, `${where}: 글자가 같은 보기`);
        const singles = q.choices.filter((x) => /^\d+$/.test(x.text)).map((x) => Number(x.text));
        assert.equal(new Set(singles).size, singles.length, `${where}: 값이 같은 수 보기`);
        for (const ch of q.choices) {
          const t = String(ch.text);
          assert.ok(t && !/undefined|NaN|null|Infinity/.test(t), `${where}: 이상한 보기 "${t}"`);
          assert.ok(ch.ok || ch.tag, `${where}: 오답 "${t}"에 이름표가 없다`);
          if (/^\d+$/.test(t)) assert.ok(Number(t) > 0 && !/^0/.test(t), `${where}: 모양이 이상한 수 "${t}"`);
        }
        const all = `${q.q} ${q.expr} ${JSON.stringify(q.solve)} ${JSON.stringify(q.choices)}`;
        assert.ok(!/undefined|NaN|null|\{(me|mon)/.test(all), `${where}: 글에 새는 것 — ${all.slice(0, 160)}`);
        // ① 문제 글은 200까지 — ②는 "64 × 7 = 448"처럼 틀린 셈을 보여 주는 게 문제라 500까지
        // 계산식 배열(H3·⭐)은 교과서처럼 네 자리 수까지(101 × 99 = 9999) — 보기는 자리 수를 잘못 센 다섯 자리까지
        const big = c.id === 'cor.calcseq' || c.id === 'cor.apply4';
        for (const n of nums(q.q)) assert.ok(n <= (big ? 9999 : kind === 'calc' ? 200 : 500), `${where}: 너무 큰 수 ${n} — ${q.q}`);
        for (const ch of q.choices) for (const n of nums(ch.text)) assert.ok(n <= (big ? 99999 : 5000), `${where}: 보기에 너무 큰 수 ${n}`);
        // 등호 칸은 두 자리 수 (성취기준 적용 시 고려 사항 — 동치 관계는 두 자리 수의 범위) · 오답 값(모든 수를 더함)만 세 자리가 될 수 있다
        if (c.id === 'cor.equal' && kind === 'calc') for (const n of nums(q.q)) assert.ok(n >= 10 && n <= 99, `${where}: 등호 칸에 두 자리가 아닌 수 ${n} — ${q.q}`);
        // 글 속 그림 지시문은 모두 그려진다 (못 그리면 화면에서 조용히 사라진다)
        for (const f of q.q.match(/\[[a-z]+ [^\]]+\]/g) || []) assert.ok(figureSvg(f.slice(1, -1)), `${where}: 못 그리는 그림 ${f}`);
      }
    }
  }
});

const NEW_KINDS = new Set(['grow', 'nextRow', 'rowRes', 'keep', 'findRow', 'orderAdd', 'orderRow', 'box', 'grpAdd', 'grpSub', 'judge', 'story']);
/** v289 새 칸 오답 이름표 → 그 실수가 맞나 (true/false) · 새 칸에 나오면 안 되는 이름표면 undefined */
function newTagOk(tag, ch, x, w) {
  const t = String(ch.text); const v = Number(t); const p = parseCalc(t);
  const rep = (s) => /^(\d)\1*$/.test(s);
  switch (tag) {
    case TAGS.ruleIgnored:                                                    // 셈은 맞고 결과도 같은데 규칙의 줄이 아니다
      if (x.kind === 'nextRow') return !!p && p.c !== null && !p.op2 && OPS[p.op](p.a, p.b) === p.c && p.c === x.R.z && (p.a !== x.R.x || p.b !== x.R.y);
      if (x.kind === 'findRow') return !!p && p.c === null && p.a + p.b === x.S && (p.a !== x.R.x || p.b !== x.R.y);
      return false;
    case TAGS.oneSide: {                                                      // 한 수만 이번 줄 · 다른 수는 앞 줄 그대로
      if (x.kind === 'nextRow') { const P = rowAt(x.rows, x.n - 1); return !!p && !p.op2 && p.a === x.R.x && p.b === P.y && p.c === p.a + p.b; }
      if (x.kind === 'findRow') { const P = rowAt(x.rows, x.n - 1); return !!p && p.a === x.R.x && p.b === P.y; }
      if (x.kind === 'judge') return !!p && p.op2 === x.op && sideVal(p) !== x.L && ((p.c !== x.a && p.d === x.b) || (p.c === x.a && p.d !== x.b));
      return false;
    }
    case TAGS.offByOne:
      if (x.kind === 'nextRow') { const N = rowAt(x.rows, x.n + 1); return !!p && p.a === N.x && p.b === N.y && p.c === N.z; }
      if (x.kind === 'findRow') { const P = rowAt(x.rows, x.n - 1); return !!p && p.a === P.x && p.b === P.y; }
      if (x.kind === 'rowRes') return v === rowAt(x.rows, x.n + 1).z;
      if (x.kind === 'orderRow' || x.kind === 'orderAdd') return Math.abs(v - x.n) === 1;
      return false;
    case TAGS.nextOnly:                                                       // 물은 줄 바로 앞 줄(·여섯째 수)
      if (x.kind === 'nextRow') { const P = rowAt(x.rows, x.n - 1); return !!p && p.a === P.x && p.b === P.y && p.c === P.z; }
      if (x.kind === 'rowRes') return v === rowAt(x.rows, x.n - 1).z;
      if (x.kind === 'grow') return v === growAt(x.seq, x.n - 2);
      return false;
    case TAGS.digitCount: { const ans = String(w.v); return x.kind === 'rowRes' && rep(ans) && rep(t) && t[0] === ans[0] && Math.abs(t.length - ans.length) === 1; }
    case TAGS.keepGrows: return x.kind === 'keep' && x.t > 0 && (v === w.v + x.t || v === w.v + 4 * x.t);
    case TAGS.resultAsBox:                                                    // 등호 바로 뒤(□ 자리)에 계산 결과
      if (x.kind === 'box') return v === OPS[x.op](x.a, x.b);
      if (x.kind === 'grpAdd') return v === x.a + x.b + x.c;
      if (x.kind === 'grpSub') return v === x.a - x.b - x.c;
      if (x.kind === 'judge') return !!p && p.c === x.L && p.op2 === '+' && sideVal(p) !== x.L;
      if (x.kind === 'story') return !!p && p.c === x.a + x.b && p.op2 === '+' && sideVal(p) !== x.a + x.b;
      return false;
    case TAGS.sumAll:
      if (x.kind === 'box') return v === x.a + x.b + x.other;
      if (x.kind === 'grpAdd') return v === x.a + x.b + x.c + x.T;
      if (x.kind === 'story') return /^\d+ \+ \d+ \+ \d+ \+ \d+$/.test(t) && nums(t).sort((m, n) => m - n).join() === [x.a, x.b, x.c, x.d].sort((m, n) => m - n).join();
      return false;
    case TAGS.sameWay:                                                        // 덧셈인데 □(오른쪽 두 수)를 같은 쪽으로
      if (x.kind === 'box') { const orig = x.pos === 'L' ? x.a : x.b; return x.op === '+' && w.v !== orig && v === 2 * orig - w.v; }
      if (x.kind === 'judge') return x.op === '+' && !!p && p.op2 === '+' && p.c - x.a === p.d - x.b && p.c > x.a;
      return false;
    case TAGS.addLogicSub:                                                    // 뺄셈인데 덧셈처럼 반대쪽으로
      if (x.kind === 'box') return x.op === '−' && w.v !== x.a && v === 2 * x.a - w.v;
      if (x.kind === 'judge') return x.op === '−' && !!p && p.op2 === '−' && p.c - x.a === x.b - p.d && p.c > x.a;
      return false;
    case TAGS.copyOne:
      if (x.kind === 'box') return x.op === '−' && v === x.a;
      if (x.kind === 'grpSub') return v === x.b || v === x.c;
      return false;
    case TAGS.pairMix: {                                                      // 네 수는 맞는데 짝을 섞음 (그래서 틀린 식)
      if (x.kind !== 'story' || !p || !p.op2) return false;
      const four = [p.a, p.b, p.c, p.d].sort((m, n) => m - n).join(); const given = [x.a, x.b, x.c, x.d].sort((m, n) => m - n).join();
      const same = (u, y, a, b) => (u === a && y === b) || (u === b && y === a);
      return four === given && !same(p.a, p.b, x.a, x.b) && !same(p.a, p.b, x.c, x.d) && p.a + p.b !== p.c + p.d;
    }
    case TAGS.lastDiff: return x.kind === 'grow' && x.n === 7 && v === x.seq[4] + 2 * (x.seq[4] - x.seq[3]);
    case TAGS.digitAsOrder:                                                   // 한 칸 밀린 값(n ± 1)과도 달라야 이름표가 하나로 정해진다
      if (x.kind === 'orderRow') return v === Number(String(x.X)[0]) && Math.abs(v - x.n) > 1;
      if (x.kind === 'orderAdd') return v === Math.floor(x.R.x / 100) && Math.abs(v - x.n) > 1;
      return false;
    default: return undefined;
  }
}

test('★ 오개념 이름표: 그 오답이 정말 그 실수다 — 값과 방향까지', () => {
  const seen = {};
  for (const c of CORRESPOND) {
    for (let s = 1; s <= SEEDS; s++) {
      const q = makeQuestion(c.id, 'calc', s * 31337, OPTS);
      const w = solveText(q.q); const x = w.ctx;
      for (const ch of q.choices.filter((y) => !y.ok)) {
        if (ch.tag === '계산 실수') continue;
        const where = `${c.id} seed ${s}: "${ch.tag}" 오답 ${ch.text} — ${q.q.replace(/\n/g, ' ')}`;
        const v = Number(ch.text);
        const hit = (cond) => { seen[ch.tag] = (seen[ch.tag] || 0) + 1; assert.ok(cond, where); };
        // 4학년 「규칙 찾기」 새 칸(v289) — 지도서 오류 표의 실수 그대로인지
        if (NEW_KINDS.has(x.kind)) {
          const good = newTagOk(ch.tag, ch, x, w);
          assert.notEqual(good, undefined, `${where}: 새 칸에 검사 없는 이름표`);
          hit(good);
          continue;
        }
        // 식 보기 — 표·이야기의 참 규칙 R과 견준다
        if (x.kind === 'eq') {
          const eq = parseEq(ch.text); const R = x.R; const P = w.eqs;
          const step = x.T ? P[1][1] - P[0][1] : null; const fp = x.T ? P[0][1] - P[0][0] : null;
          switch (ch.tag) {
            case TAGS.stepAsRule: hit(ch.text === `△ = □ + ${step}` || ch.text === `□ = △ − ${step}`); break;
            case TAGS.firstPairOnly: hit(ch.text === `△ = □ + ${fp}`); break;
            case TAGS.swapDir: hit(!fits(eq, P) && fits(parseEq(swapSym(ch.text)), P)); break;       // □·△를 맞바꾸면 맞는 식
            case TAGS.noInverse: hit(w.lhs === '□' && !fits(eq, P) && fits(parseEq(swapSym(ch.text)), P)); break;
            case TAGS.mulForAdd: hit(R.kind === 'add' && P[0][0] === 1 && ch.text === `△ = □ × ${P[0][1]}`); break;
            case TAGS.addForMul: hit(R.kind === 'mul' && ch.text === `△ = □ + ${R.k}`); break;
            case TAGS.dropAdd: hit(R.kind === 'two' && ch.text === `△ = □ × ${R.a}`); break;
            case TAGS.firstAsMul: hit(R.kind === 'two' && P[0][0] === 1 && ch.text === `△ = □ × ${P[0][1]}`); break;
            case TAGS.sameCount: hit(ch.text === '△ = □'); break;
            default: assert.fail(`${where}: 식 보기에 검사 없는 이름표`);
          }
          continue;
        }
        if (w.sent) {
          const t = ch.text;
          switch (ch.tag) {
            case TAGS.mulForAdd: hit(/씩 곱해요$/.test(t) && nums(t)[1] === x.seq[1] - x.seq[0]); break;          // 늘어나는 수는 맞는데 곱함
            case TAGS.countAsStep: hit(/씩 커져요$/.test(t) && nums(t)[1] === x.seq[1]); break;                    // 둘째 수를 늘어나는 수로
            case TAGS.wrongDir: hit(/씩 작아져요$/.test(t) && x.seq[1] > x.seq[0]); break;
            case TAGS.addForMul: hit(/보다 \d+ 많아요$/.test(t) && w.sent(t) === false); break;
            case TAGS.swapDir: hit(/배예요$/.test(t) && w.sent(t) === false && w.sent(t.replace(/^(.+?)는 (.+?)의/, '$2는 $1의')) === true); break;
            case TAGS.noFollow: hit(/그대로예요$/.test(t)); break;
            default: assert.fail(`${where}: 문장 보기에 검사 없는 이름표`);
          }
          continue;
        }
        switch (ch.tag) {
          case TAGS.addForMul:
            if (x.kind === 'geo') hit(v === x.seq[3] + (x.seq[1] - x.seq[0]));
            else if (x.kind === 'frame') hit(v === x.N + x.k);
            else if (x.kind === 'fill') hit(x.R.kind === 'mul' && v === x.x + x.R.k);
            else if (x.kind === 'fwd') hit(x.eq.ops[0][0] === '×' && v === x.val + x.eq.ops[0][1]);
            else hit(false);
            break;
          case TAGS.growDiff: hit(x.kind === 'geo' && v === x.seq[3] + (x.seq[3] - x.seq[2])); break;
          case TAGS.mulForAdd: hit(x.kind === 'tfwd' && x.R.kind === 'add' && x.T.pairs[0][0] === 1 && v === x.N * x.T.pairs[0][1]); break;
          case TAGS.offByOne:
            if (x.kind === 'nth') hit(v === x.a + x.n * x.d);
            else if (x.kind === 'snth') hit(v === x.s + x.n * x.d);
            else if (x.kind === 'sinv') hit(Math.abs(v - x.m) === 1);
            else hit(false);
            break;
          case TAGS.stepTimesPos:
            if (x.kind === 'nth') hit(v === x.n * x.d);
            else if (x.kind === 'snth') hit(v === x.n * x.d);
            else if (x.kind === 'sinv') hit(v === x.M / x.d);
            else hit(false);
            break;
          case TAGS.nextOnly:
            if (x.kind === 'nth') hit(v === x.a + 4 * x.d);
            else if (x.kind === 'snth') hit(v === x.s + x.cnt * x.d);
            else if (x.kind === 'tfwd') { const xs = x.T.pairs.map((p) => p[0]); hit(v === x.R.f(xs[xs.length - 1] + 1)); } else hit(false);
            break;
          case TAGS.wrongDir: hit(x.kind === 'gap' && v === x.seq[x.i - 1] - x.d); break;                 // 작아지는 배열을 거꾸로 (d < 0)
          case TAGS.countAsStep: hit(x.kind === 'sstep' && (v === x.s || v === x.s + x.d) && v !== x.d); break;
          case TAGS.stepAsRule: {
            if (x.kind === 'snth') { hit(v === x.n + x.d); break; }                                      // 두 번 셈 도형: □ + 늘어나는 수
            const P = x.T.pairs; const st = P[1][1] - P[0][1];
            hit(x.kind === 'tfwd' ? v === x.N + st : x.kind === 'tinv' && v === x.M - st);
            break;
          }
          case TAGS.firstPairOnly: { const fp = x.T.pairs[0][1] - x.T.pairs[0][0]; hit(x.kind === 'tfwd' ? v === x.N + fp : x.kind === 'tinv' && v === x.M - fp); break; }
          case TAGS.swapDir:
            if (x.kind === 'fwd') { const hits = []; for (let y = 0; y <= 3000; y++) if (x.eq.f(y) === x.val) hits.push(y); hit(hits.length === 1 && v === hits[0]); } // 준 □를 △로 봄
            else if (x.kind === 'time') hit(v === x.H + x.g);
            else if (x.kind === 'log') hit(v === x.n + 1);
            else if (x.kind === 'level') hit(v === x.N - (x.q - x.p));
            else hit(false);
            break;
          case TAGS.noInverse:
            if (x.kind === 'tinv') hit(v === x.R.f(x.M));
            else if (x.kind === 'inv') hit(v === x.eq.f(x.val));                                           // △에 식을 또 씀
            else if (x.kind === 'coins') hit(v === x.M * x.p);
            else hit(false);
            break;
          case TAGS.wrongInverse:
            if (x.kind === 'coins') hit(v === x.M - x.p);
            else if (x.kind === 'inv') {
              const [[o1, n1], second] = x.eq.ops;
              if (second) hit(o1 === '×' && second[0] === '+' && v === (x.val + second[1]) / n1);            // 두 번 셈: 더한 것을 되돌릴 때 더함
              else hit(o1 === '×' ? v === x.val - n1 : o1 === '÷' ? v === x.val + n1 : false);              // ×↔− · ÷↔+
            } else hit(false);
            break;
          case TAGS.halfInverse: hit(x.kind === 'inv' && x.eq.ops.length === 2 && v === x.val - x.eq.ops[1][1]); break;
          case TAGS.propForAdd: hit(x.kind === 'level' && v === (x.q * x.N) / x.p); break;
          case TAGS.sameCount: hit((x.kind === 'time' && v === x.H) || (x.kind === 'log' && v === x.n)); break;
          case TAGS.dropAdd: hit(x.kind === 'snth' && v === x.d * x.n && x.s !== x.d); break;
          case TAGS.firstAsMul: hit(x.kind === 'snth' && v === x.s * x.n); break;
          default: assert.fail(`${where}: 검사 없는 이름표`);
        }
      }
    }
  }
  for (const tag of Object.values(TAGS)) assert.ok((seen[tag] || 0) >= 20, `"${tag}" 오답을 충분히 검사해야 한다 (${seen[tag] || 0}건)`);
});

test('★ ② 오개념 문항: 보여 준 것은 정말 틀렸다 · 고친 답은 맞다 · 진단 보기가 우연히 맞지 않다 · 갈래 열쇠', () => {
  const branches = {};
  for (const c of CORRESPOND) {
    for (let s = 1; s <= SEEDS; s++) {
      const q = makeQuestion(c.id, 'misread', s * 7717, OPTS);
      const where = `${c.id} seed ${s}: ${q.q.replace(/\n/g, ' ')}`;
      assert.ok(/^misread:/.test(q.key || ''), where);
      branches[`${c.id} ${q.key}`] = (branches[`${c.id} ${q.key}`] || 0) + 1;
      assert.ok(/\*\*.+\*\*/.test(q.q), where);
      if (NEW4.includes(c.id)) { newMisCheck(c.id, q, where); continue; }
      const shown = /\*\*(.+)\*\*/.exec(q.q)[1];
      const ok = q.choices.find((x) => x.ok).text;
      const wrongs = q.choices.filter((x) => !x.ok && x.tag !== '틀린 줄 모름');
      const T = readTable(q.q); const S = readSteps(q.q);
      /** 보여 준 말·오답이 말하는 수(= 뒤·"는 N이에요") ≠ 바른 답, 고친 답은 바른 답으로 끝난다 */
      const byValue = (right, shownVal) => {
        assert.ok(nums(shown).includes(shownVal) && shownVal !== right, `${where}: 보여 준 ${shownVal}이 사실 맞다`);
        assert.equal(lastNum(ok), right, `${where}: 고친 답에 ${right}이 없다 — ${ok}`);
        for (const ch of wrongs) if (lastNum(ch.text) !== null) assert.notEqual(lastNum(ch.text), right, `${where}: 오답 "${ch.text}"이 사실 바른 답`);
      };
      if (c.id === 'cor.numseq') {                                                                     // 수 배열 — 알려 준 네 수로 규칙
        const seq = readSeq(q.q); const R = fitSeq(seq.filter((v) => v !== null));
        const n = /(\d+)번째 수는/.exec(shown);
        byValue(n ? R.f(+n[1] - 1) : R.f(4), n ? lastNum(shown) : nums(shown)[0]);
      } else if (S && /번째/.test(shown)) {
        const n = +[...shown.matchAll(/(\d+)번째/g)].pop()[1];                                      // "1번째 모양이 8개니까 15번째는" — 마지막 것
        byValue(S.s + (n - 1) * S.d, lastNum(shown));
      } else if (S) {                                                                                // 늘어나는 수
        assert.notEqual(nums(shown)[0], S.d, `${where}: 보여 준 늘어나는 수가 사실 맞다`);
        assert.equal(lastNum(ok), S.d, where);
        for (const ch of wrongs) if (/개씩 늘어나요$/.test(ch.text)) assert.notEqual(nums(ch.text)[0], S.d, where);
      } else if (T && /[□△] = /.test(shown)) {                                                       // 식을 보여 준 문항
        const said = /([□△] = [□△](?: [×÷+−] \d+)*)(?:이에요|예요)?(?: —|$)/.exec(shown) || /[이]?니까 ([□△] = [□△](?: [×÷+−] \d+)*)/.exec(shown);
        const shownEq = shown.includes('니까 □ =') ? /니까 (□ = △ [×÷+−] \d+)/.exec(shown)[1] : said[1];
        assert.ok(!fits(parseEq(shownEq), T.pairs), `${where}: 보여 준 식 ${shownEq}이 사실 표에 맞다`);
        const okEq = /([□△] = [□△](?: [×÷+−] \d+)+)$/.exec(ok)[1];
        assert.ok(fits(parseEq(okEq), T.pairs), `${where}: 고친 식 ${okEq}이 표에 안 맞다`);
        for (const ch of wrongs) { const e = /^([□△] = [□△](?: [×÷+−] \d+)+)(?:이에요|예요)$/.exec(ch.text); if (e) assert.ok(!fits(parseEq(e[1]), T.pairs), `${where}: 오답 식 ${e[1]}이 사실 맞다`); }
      } else if (T) {                                                                                 // 표 + 멀리 떨어진 칸
        const R = fitPairs(T.pairs); const N = +/(\d+)(?:개|대|마리)면/.exec(shown)[1];
        byValue(R.f(N), lastNum(shown));
      } else if (/^[△□] = [□△] /.test(q.q)) {                                                        // 식이 주어짐
        const m = /^([△□] = [□△](?: [×÷+−] \d+)+)에서 ([□△])가 (\d+)일 때/.exec(q.q);
        const eq = parseEq(m[1]); const val = +m[3];
        let right; if (m[2] === eq.rhs) right = eq.f(val); else for (let y = 0; y <= 3000; y++) if (eq.f(y) === val) right = y;
        byValue(right, lastNum(shown));
        if (wrongs.some((w) => w.text === '□는 △보다 커야 해요')) assert.ok(right < val, where);   // 엉뚱한 지적이 정말 틀린 말
        if (wrongs.some((w) => w.text === '△는 □보다 작아요')) assert.ok(right > val, where);
      } else if (/레벨이 똑같이 올라요/.test(q.q)) {
        const m = /지금 (.+?)의 레벨은 (\d+), (.+?)의 레벨은 (\d+)/.exec(q.q); const N = +/레벨이 (\d+)[이가] 되면/.exec(shown)[1];
        byValue(N + (+m[4] - +m[2]), nums(shown)[1]);
      } else if (/도막/.test(q.q)) {
        const n = +/도막 (\d+)개를/.exec(q.q)[1];
        byValue(n - 1, lastNum(shown));
      } else if (/1(?:개|대|마리)에 /.test(q.q)) {
        const m = /1(?:개|대|마리)에 \S+?[이가] (\d+)개씩/.exec(q.q); const N = +/(\d+)(?:개|대|마리)면/.exec(shown)[1];
        byValue(+m[1] * N, lastNum(shown));
      } else assert.fail(`${where}: 이 ② 모양을 모른다`);
    }
  }
  for (const [k, n] of Object.entries(branches)) assert.ok(n >= 100, `${k} 갈래가 드물다 (${n})`);
  const want = ['cor.numseq misread:mul', 'cor.numseq misread:nth', 'cor.shapeseq misread:nth', 'cor.shapeseq misread:step', 'cor.pair misread:add', 'cor.table misread:step',
    'cor.symbol misread:swap', 'cor.symbol misread:step', 'cor.value misread:inv', 'cor.value misread:fwd', 'cor.life misread:prop', 'cor.life misread:fence', 'cor.twostep misread:drop', 'cor.twostep misread:first',
    'cor.calcseq misread:keep', 'cor.calcseq misread:one', 'cor.equal misread:result', 'cor.equal misread:sub', 'cor.equal misread:chain', 'cor.apply4 misread:grow', 'cor.apply4 misread:order'];
  assert.deepEqual(Object.keys(branches).sort(), [...want].sort());
});

/** v289 새 칸 ② — 보여 준 말은 정말 틀렸고, 고친 답은 문제 글을 따로 읽어 푼 값이다 */
function newMisCheck(id, q, where) {
  const bolds = [...q.q.matchAll(/\*\*(.+?)\*\*/g)].map((m) => m[1]);
  const shown = bolds[bolds.length - 1];                                        // 계산식 줄도 굵어서 — 말한 것은 마지막 굵은 글
  const ok = q.choices.find((x) => x.ok).text;
  const wrongs = q.choices.filter((x) => !x.ok && x.tag !== '틀린 줄 모름');
  const key = q.key.slice('misread:'.length);
  let m;
  if (id === 'cor.calcseq' && key === 'keep') {
    const rows = readRows(q.q); const D = rowAt(rows, 5).z;
    assert.ok(rows.every((r) => r.z === D), `${where}: 차가 그대로인 배열이어야`);
    assert.notEqual(nums(shown)[0], D, `${where}: 보여 준 결과가 사실 맞다`);
    assert.equal(lastNum(ok), D, where);
  } else if (id === 'cor.calcseq' && key === 'one') {
    const rows = readRows(q.q); const R = rowAt(rows, 5);
    const sp = parseCalc(/덧셈식은 (.+?)(?:이에요|예요) —/.exec(shown)[1]);
    assert.ok(sp && sp.a + sp.b === sp.c, `${where}: 보여 준 식의 셈은 맞아야 한다(틀린 것은 규칙)`);
    assert.ok(!(sp.a === R.x && sp.b === R.y), `${where}: 보여 준 식이 사실 다섯째`);
    const fixed = parseCalc(/— (.+)$/.exec(ok)[1]);
    assert.deepEqual([fixed.a, fixed.b, fixed.c], [R.x, R.y, R.z], where);
    for (const w of wrongs) if ((m = /결과가 (\d+)인 식이면/.exec(w.text))) assert.equal(+m[1], R.z, `${where}: 결과만 맞으면 된다는 오답의 결과가 다섯째와 달라 말이 안 된다`);
  } else if (id === 'cor.equal' && (key === 'result' || key === 'sub')) {
    m = /^(\d+) ([+−]) (\d+) = □ ([+−]) (\d+)에서 □는 (\d+)/.exec(shown);
    const right = m[4] === '+' ? OPS[m[2]](+m[1], +m[3]) - +m[5] : OPS[m[2]](+m[1], +m[3]) + +m[5];
    assert.notEqual(+m[6], right, `${where}: 보여 준 □가 사실 맞다`);
    assert.equal(lastNum(ok), right, where);
    for (const w of wrongs) if (/□는 (\d+)/.test(w.text)) assert.notEqual(+/□는 (\d+)/.exec(w.text)[1], right, `${where}: 오답 "${w.text}"이 사실 맞다`);
  } else if (id === 'cor.equal' && key === 'chain') {
    m = /^(\d+) \+ (\d+) = (\d+) \+ (\d+) = (\d+)$/.exec(shown);
    const [a, b, S, x, T] = m.slice(1).map(Number);
    assert.ok(S === a + b && T === S + x && a + b !== S + x, `${where}: 계산은 맞는데 등호로 이어 틀린 식이어야`);
    assert.ok(ok.endsWith(`${a} + ${b} = ${S}, ${S} + ${x} = ${T}`), `${where}: 고친 답은 식을 나눠 쓴다`);
    const off = wrongs.find((w) => /계산 결과는/.test(w.text));
    assert.notEqual(lastNum(off.text), a + b + x, `${where}: 엉뚱한 지적이 사실 맞는 말`);
  } else if (id === 'cor.apply4' && key === 'grow') {
    const seq = /늘어놓았어요: ([\d, ]+), …/.exec(q.q)[1].split(', ').map(Number); const right = growAt(seq, 6);
    assert.equal(nums(shown)[0], seq[4] + 2 * (seq[4] - seq[3]), `${where}: 보여 준 값은 마지막 차이를 두 번 더한 것`);
    assert.notEqual(nums(shown)[0], right, where);
    assert.equal(lastNum(ok), right, where);
  } else if (id === 'cor.apply4' && key === 'order') {
    const rows = readRows(q.q); m = new RegExp(String.raw`^(\d+) ÷ (\d+) = (\d+)은 ` + ORD_RE + ' 계산식이에요').exec(shown);
    let n = 1; while (colAt(rows, 'x', n) < +m[1] && n < 30) n++;
    assert.equal(rowAt(rows, n).x, +m[1], where);
    assert.notEqual(ordNum(m[4]), n, `${where}: 보여 준 차례가 사실 맞다`);
    assert.ok(ok.endsWith(ORDW[n - 1]), `${where}: 고친 답 ${ok}`);
  } else assert.fail(`${where}: 이 ② 모양을 모른다 (${key})`);
}

test('★ 조사: 수 뒤(12는·36은·8과·3으로·7로·6이에요·9예요) · □·△ 뒤(가·를·는·와·라고)', () => {
  const BAT = new Set(['0', '1', '3', '6', '7', '8']);
  const PAIR = { 이: true, 가: false, 을: true, 를: false, 은: true, 는: false, 과: true, 와: false };
  const LONG = { 이에요: true, 예요: false, 이라서: true, 라서: false, 이니까: true, 니까: false, 이라면: true, 라면: false };
  let checked = 0;
  for (const c of CORRESPOND) {
    for (let s = 1; s <= 300; s++) {
      for (const kind of ['calc', 'misread']) {
        const q = makeQuestion(c.id, kind, s * 3571, OPTS);
        const texts = [q.q, ...q.choices.map((x) => x.text), ...q.solve.steps, q.solve.whyAny, ...Object.values(q.solve.why)];
        for (const t0 of texts) {
          const t = String(t0).replace(/\[[a-z]+ [^\]]+\]/g, ''); // 그림 지시문 속 수는 글이 아니다
          for (const m of t.matchAll(/(\d+)(으로|로|이|가|을|를|은|는|과|와)(?![가-힣])/g)) {
            const last = m[1].slice(-1); checked++;
            if (m[2] === '으로' || m[2] === '로') assert.equal(m[2], ['0', '3', '6'].includes(last) ? '으로' : '로', `${c.id}/${kind} seed ${s}: "${m[0]}" (${t})`);
            else assert.equal(PAIR[m[2]], BAT.has(last), `${c.id}/${kind} seed ${s}: "${m[0]}" (${t})`);
          }
          for (const m of t.matchAll(/(\d+)(이에요|예요|이라서|라서|이니까|니까|이라면|라면)/g)) {
            checked++;
            assert.equal(LONG[m[2]], BAT.has(m[1].slice(-1)), `${c.id}/${kind} seed ${s}: "${m[0]}" (${t})`);
          }
          // □(네모)·△(세모)는 받침이 없다
          assert.doesNotMatch(t, /[□△](이|을|은|과|이라고|으로)(?![가-힣])/, `${c.id}/${kind} seed ${s}: 기호 뒤 조사 (${t})`);
        }
      }
    }
  }
  assert.ok(checked > 1000, `조사 검사 ${checked}건`);
});

test('★ 풀이 카드: 단계 2줄↑ · 기억할 것 · 오답마다 왜 · 정답이 단계에 나온다', () => {
  for (const c of CORRESPOND) {
    for (const kind of ['calc', 'misread']) {
      for (let s = 1; s <= 400; s++) {
        const q = makeQuestion(c.id, kind, s * 131, OPTS);
        const where = `${c.id}/${kind} seed ${s}`;
        assert.ok(q.solve && q.solve.steps.length >= 2 && q.solve.rule, where);
        for (const ch of q.choices) if (!ch.ok) assert.ok(q.solve.why[ch.tag] || q.solve.whyAny, `${where}: 오답 "${ch.tag}" 설명 없음`);
        if (kind !== 'calc') continue;
        const ok = q.choices.find((x) => x.ok).text;
        assert.ok(q.solve.steps.some((st) => st.includes(ok) || (/^\d+$/.test(ok) && nums(st).includes(Number(ok)))), `${where}: 풀이에 정답 ${ok} 없음 — ${q.solve.steps.join(' / ')}`);
      }
    }
  }
});

test('🔁 쌍둥이·🤔 노트: 요청한 틀·갈래로 온다 (표 칸 수·몇 번째·물건·도시가 수에 따라 갈리지 않는다)', () => {
  let tried = 0;
  for (const c of CORRESPOND) {
    for (const kind of ['calc', 'misread']) {
      const keys = new Set();
      for (let s = 1; s <= 300; s++) keys.add(makeQuestion(c.id, kind, s * 37, OPTS).key);
      for (const key of keys) {
        for (let s = 1; s <= 60; s++) {
          const q = makeQuestion(c.id, kind, s * 911, { ...OPTS, want: { k: kind, key } });
          tried++;
          assert.equal(q.key, key, `${c.id}/${kind} seed ${s}: ${key}를 요청했는데 ${q.key}`);
        }
      }
    }
  }
  assert.ok(tried > 2000, `검사 ${tried}건`);
});

test('📏 진단·사다리·한 편·배움 예비·내용 검사', () => {
  const d = diagnosticSet(9, 5, OPTS);
  assert.deepEqual(d.map((q) => q.concept), ['cor.numseq', 'cor.pair', 'cor.symbol', 'cor.value', 'cor.twostep']);
  // v289 새 칸 셋은 진단에서 뺀다 — 씨앗이 달라도 진단 칸은 그 전 다섯 그대로
  for (let s = 1; s <= 50; s++) assert.deepEqual(diagnosticSet(s, 5, OPTS).map((q) => q.concept), ['cor.numseq', 'cor.pair', 'cor.symbol', 'cor.value', 'cor.twostep']);
  const pl = placeFrom([{ concept: 'cor.numseq', correct: true }, { concept: 'cor.pair', correct: false }]);
  assert.equal(pl.startId, 'cor.pair');
  // 5학년 칸에서 틀리면 그 앞 4학년 칸(새 칸 셋 포함)은 안다로 친다 — ⭐ 칸을 끼운 다른 줄기(V·C·K)와 같은 규칙
  assert.deepEqual(pl.knownIds, ['cor.numseq', 'cor.shapeseq', 'cor.calcseq', 'cor.equal', 'cor.apply4']);
  assert.deepEqual(ladder(['cor.numseq']).slice(0, 3).map((x) => x.state), ['done', 'now', 'locked']);
  // 옛 8칸을 다 끝낸 아이(진우) — 새 칸 첫째가 바로 ▶ 지금, 나머지 둘은 차례로 잠김 · 5학년 칸은 그대로 끝남
  const old8 = CORRESPOND.filter((c) => !NEW4.includes(c.id)).map((c) => c.id);
  assert.deepEqual(ladder(old8).map((x) => x.state), ['done', 'done', 'now', 'locked', 'locked', 'done', 'done', 'done', 'done', 'done', 'done']);
  for (const c of CORRESPOND) {
    assert.deepEqual(makeRound(c.id, 5, OPTS).map((q) => q.kind), ['calc', 'misread']);
    assert.equal(lessonOf(c.id, 1, OPTS).pages.length, 1);
  }
  assert.equal(conceptById('cor.nope'), null);
  assert.equal(makeQuestion('cor.nope', 'calc', 1, OPTS), null);
  assert.equal(checkContent({}).filter((x) => /내용 없음/.test(x)).length, 11);
});

test('문제 이야기에 가족을 지어내지 않는다 (진우에게는 동생이 없다)', () => {
  for (const c of CORRESPOND) {
    for (let s = 1; s <= 300; s++) {
      for (const kind of ['calc', 'misread']) {
        const q = makeQuestion(c.id, kind, s * 57, OPTS);
        assert.doesNotMatch(`${q.q} ${JSON.stringify(q.choices)} ${JSON.stringify(q.solve)}`, /동생|형이|누나|언니|엄마|아빠|할아버지/, `${c.id}/${kind} seed ${s}`);
      }
    }
  }
});

// ── 글 속 셈식 검산 — "5 + 3 × 9 = 5 + 27 = 32"처럼 이어진 식을 모두 다시 계산한다 (사람이 쓴 원고와 생성기 글 모두) ──
/** 곱셈·나눗셈 먼저 */
function evalArith(t) {
  const tok = t.trim().split(' ');
  const vals = [Number(tok[0])]; const ops = [];
  for (let i = 1; i < tok.length; i += 2) {
    const o = tok[i]; const n = Number(tok[i + 1]);
    if (o === '×') vals.push(vals.pop() * n); else if (o === '÷') vals.push(vals.pop() / n); else { ops.push(o); vals.push(n); }
  }
  return ops.reduce((acc, o, i) => (o === '+' ? acc + vals[i + 1] : acc - vals[i + 1]), vals[0]);
}
function badArith(text) {
  const bad = [];
  const s = plain(text);
  // □·△ 뒤에 붙은 수("□ × 6 = 72")에서 시작하지 않게 — 앞이 수·연산 기호면 건너뛴다
  // 뒤에 "+ □"가 이어지면 아직 다 쓰지 않은 식이다 (v289 등호 칸 "34 + 59 = 31 + □") — 수 중간에서 끊어 읽지도 않게.
  // 문장 끝 마침표("= 206.")는 소수점이 아니다 — 마침표 뒤에 숫자가 올 때만 소수 (변이 검사가 잡음)
  for (const m of s.matchAll(/(?<![\d.])(?<![+−×÷] )\d+(?: [+−×÷] \d+)*(?: = \d+(?: [+−×÷] \d+)*)+(?!\d)(?!\.\d)(?! [+−×÷] □)/g)) {
    const parts = m[0].split(' = ').map(evalArith);
    if (parts.some((v) => v !== parts[0])) bad.push(m[0]);
  }
  return bad;
}

test('★ 글 속 셈식이 모두 맞다 — 생성기 문제·보기·풀이', () => {
  assert.deepEqual(badArith('5 + 3 × 9 = 5 + 27 = 32'), []);
  assert.deepEqual(badArith('2 × 3 = 6, 6 × 3 = 19'), ['6 × 3 = 19']);
  assert.deepEqual(badArith('□ × 6 = 72 → □ = 72 ÷ 6 = 12'), []);
  assert.deepEqual(badArith('**34 + 59 = 31 + □**'), [], '뒤에 □가 이어지는 식은 아직 다 쓴 식이 아니다');
  assert.deepEqual(badArith('34 + 59 = 31 + 63'), ['34 + 59 = 31 + 63'], '□가 아니면 그대로 검산한다');
  assert.deepEqual(badArith('36 + 25 = 61 + 3 = 64'), ['36 + 25 = 61 + 3 = 64']);
  assert.deepEqual(badArith('다섯째는 150 + 55 = 206. 다음'), ['150 + 55 = 206'], '문장 끝 마침표 앞의 식도 검산한다');
  let checked = 0; let wrongShown = 0;
  for (const c of CORRESPOND) {
    for (let s = 1; s <= 500; s++) {
      for (const kind of ['calc', 'misread']) {
        const q = makeQuestion(c.id, kind, s * 2027, OPTS);
        // 일부러 틀린 식을 보여 주는 자리는 셈 검사 대신 "정말 틀렸나"를 본다:
        //  · v289 등호 칸 "옳은 식 고르기"·"등호로 나타내기"의 오답 보기 (정답 하나만 참 — 독립 검산이 따로 본다)
        //  · ② "등호로 계산을 이어 씀"의 굵은 식 (36 + 25 = 61 + 3 = 64)
        let qText = q.q; let choices = q.choices;
        const w = kind === 'calc' ? solveText(q.q) : null;
        if (w && w.ctx && (w.ctx.kind === 'judge' || w.ctx.kind === 'story')) {
          for (const ch of q.choices.filter((x) => !x.ok && / = /.test(x.text))) { assert.equal(badArith(ch.text).length, 1, `${c.id} seed ${s}: 틀린 식이어야 — ${ch.text}`); wrongShown++; }
          choices = q.choices.filter((x) => x.ok);
        }
        if (q.key === 'misread:chain') {
          const chain = /\*\*(.+)\*\*/.exec(q.q)[1];
          assert.equal(badArith(chain).length, 1, `${c.id} seed ${s}: 이어 쓴 식은 틀린 식이어야 — ${chain}`); wrongShown++;
          qText = q.q.replace(chain, '');
        }
        for (const t of [qText, ...choices.map((x) => x.text), ...q.solve.steps, q.solve.whyAny, ...Object.values(q.solve.why)]) {
          checked++;
          assert.deepEqual(badArith(t), [], `${c.id}/${kind} seed ${s}: ${t}`);
        }
      }
    }
  }
  assert.ok(checked > 10000, `${checked}건`);
  assert.ok(wrongShown > 200, `일부러 틀린 식 검사 ${wrongShown}건`);
});

// ── 사람이 쓴 원고 (coach/math/correspond.json) ──
const CONTENT = JSON.parse(readFileSync('coach/math/correspond.json', 'utf8'));
const strings = (v, out = []) => { if (typeof v === 'string') out.push(v); else if (v && typeof v === 'object') Object.values(v).forEach((x) => strings(x, out)); return out; };

test('원고(correspond.json)가 형식 검사를 통과한다 — 8칸 모두 배움 3장↑·확인 2개↑·아빠 카드', () => {
  assert.deepEqual(checkContent(CONTENT), []);
  for (const c of CORRESPOND) {
    const L = lessonOf(c.id, 3, { ...OPTS, content: CONTENT });
    assert.ok(L.pages.length >= 3, c.id);
    assert.ok(!/\{(me|mon)/.test(JSON.stringify(L)), `${c.id}: 이름 자리표시가 남았다`);
  }
  // 그림 지시문이 확인 질문에 있으면 그려진다 (3단계에서 확인 질문 글도 그림을 그린다)
  for (const t of strings(CONTENT)) for (const f of t.match(/\[[a-z]+ [^\]]+\]/g) || []) assert.ok(figureSvg(f.slice(1, -1)), `못 그리는 그림 ${f}`);
});

/** 확인 보기 값 — 단위(개·번째·번·시)를 떼고 수 하나 */
const checkVal = (t) => { const s = String(t).trim().replace(/(개|번째|번|시|마리)$/, ''); return /^\d+$/.test(s) ? Number(s) : null; };

test('★ 원고 확인 질문도 따로 풀어 대조 — 전부 읽히고, 정답은 맞고, 오답은 정말 틀렸다', () => {
  let total = 0; const unread = [];
  for (const c of CORRESPOND) {
    const L = lessonOf(c.id, 3, { ...OPTS, content: CONTENT });
    for (const [i, p] of L.pages.entries()) {
      if (!p.check) continue;
      total++;
      const where = `${c.id}[${i}] "${p.check.q.replace(/\n/g, ' ')}"`;
      const w = solveText(p.check.q);
      if (!w) { unread.push(where); continue; }
      const all = [p.check.ok, ...p.check.no];
      if (w.v !== undefined) {
        assert.equal(checkVal(p.check.ok), w.v, `${where} — 따로 푼 답 ${w.v} ≠ 원고 정답 ${p.check.ok}`);
        for (const n of p.check.no) { assert.notEqual(checkVal(n), null, `${where} — 오답 ${n}을 못 읽는다`); assert.notEqual(checkVal(n), w.v, `${where} — 오답 ${n}이 사실 정답`); }
      } else if (w.eqs) {
        const good = all.filter((t) => fits(parseEq(t), w.eqs));
        assert.ok(all.every((t) => parseEq(t)), `${where} — 못 읽는 식`);
        assert.deepEqual(good, [p.check.ok], `${where} — 표에 맞는 식: ${good.join(' / ')}`);
        if (w.lhs) assert.ok(p.check.ok.startsWith(`${w.lhs} =`), where);
      } else if (w.sent) {
        const truths = all.map(w.sent);
        assert.ok(truths.every((t) => t !== null), `${where} — 못 읽는 문장`);
        assert.deepEqual(truths, [true, ...p.check.no.map(() => false)], `${where} — 참인 문장이 정답 하나뿐이어야`);
      } else assert.fail(where);
    }
  }
  assert.deepEqual(unread, [], '해석기가 못 읽은 확인 질문 — solveText에 말투를 더할 것');
  assert.ok(total >= 28, `확인 질문 ${total}개`);
});

test('★ 원고의 셈식·수 뒤 조사·기호 뒤 조사 (배움 글·확인 질문·아빠 카드 전부)', () => {
  const BAT = new Set(['0', '1', '3', '6', '7', '8']);
  const PAIR = { 이: true, 가: false, 을: true, 를: false, 은: true, 는: false, 과: true, 와: false };
  const LONG = { 이에요: true, 예요: false, 이라서: true, 라서: false, 이면: true, 면: false };
  let checked = 0;
  for (const t0 of strings(CONTENT)) {
    assert.deepEqual(badArith(t0), [], `틀린 셈식 — ${t0}`);
    const t = t0.replace(/\[[a-z]+ [^\]]+\]/g, '');
    for (const m of t.matchAll(/(\d+)(으로|로|이|가|을|를|은|는|과|와)(?![가-힣])/g)) {
      checked++;
      const last = m[1].slice(-1);
      if (m[2] === '으로' || m[2] === '로') assert.equal(m[2], ['0', '3', '6'].includes(last) ? '으로' : '로', `"${m[0]}" — ${t}`);
      else assert.equal(PAIR[m[2]], BAT.has(last), `"${m[0]}" — ${t}`);
    }
    for (const m of t.matchAll(/(\d+)(이에요|예요|이라서|라서|이면|면)(?![가-힣])/g)) { checked++; assert.equal(LONG[m[2]], BAT.has(m[1].slice(-1)), `"${m[0]}" — ${t}`); }
    assert.doesNotMatch(t, /[□△](이|을|은|과|이라고|으로)(?![가-힣])/, `기호 뒤 조사 — ${t}`);
  }
  assert.ok(checked > 40, `조사 검사 ${checked}건`);
});

test('아직 안 배운 말을 앞 칸에서 쓰지 않는다 — △ 기호와 □·△ 식은 H5(대응 관계를 식으로)부터 (원고·생성기 모두)', () => {
  // H1은 □를 빈칸으로만 쓴다 ("□에 알맞은 수") — 식 모양(□ =, × □)이나 △는 아직 없다
  const EARLY = /△|□ =|= □|□ [×÷+−]|[×÷+−] □/;
  for (const id of ['cor.numseq', 'cor.shapeseq', 'cor.pair', 'cor.table']) {
    for (const t of strings(CONTENT[id])) assert.doesNotMatch(t, EARLY, `${id} 원고: ${t}`);
    for (let s = 1; s <= 300; s++) {
      for (const kind of ['calc', 'misread']) {
        const q = makeQuestion(id, kind, s * 881, OPTS);
        const kid = [q.q, ...q.choices.map((x) => x.text), ...q.solve.steps, q.solve.whyAny, q.solve.rule, ...Object.values(q.solve.why)].join(' / ');
        assert.doesNotMatch(kid, EARLY, `${id}/${kind} seed ${s}: ${kid.slice(0, 160)}`);
      }
    }
  }
});

test('v289 새 4학년 칸은 △와 □·△ 식을 쓰지 않는다 — □는 교과서처럼 빈칸으로만 (원고·생성기 모두)', () => {
  for (const id of NEW4) {
    for (const t of strings(CONTENT[id] || {})) assert.doesNotMatch(t, /△/, `${id} 원고: ${t}`);
    for (let s = 1; s <= 300; s++) {
      for (const kind of ['calc', 'misread']) {
        const q = makeQuestion(id, kind, s * 883, OPTS);
        const kid = [q.q, ...q.choices.map((x) => x.text), ...q.solve.steps, q.solve.whyAny, q.solve.rule, ...Object.values(q.solve.why)].join(' / ');
        // "□ = 식"(□를 구하는 식) 꼴은 5학년부터 — "79 − □ = 79 − 50 − 8"처럼 셈 기호 뒤 빈칸은 교과서 그대로
        assert.doesNotMatch(kid, /△|(?<![+−×÷] )□ =/, `${id}/${kind} seed ${s}: ${kid.slice(0, 160)}`);
      }
    }
  }
});

test('v289 등호 칸 — 뺄셈 □는 빼는 수와 같은 쪽 · 덧셈 □는 반대쪽 (문제 글을 따로 읽어 바뀐 방향을 본다)', () => {
  let n = 0;
  for (let s = 1; s <= 2000; s++) {
    const q = makeQuestion('cor.equal', 'calc', s * 409, OPTS);
    const w = solveText(q.q); const x = w.ctx;
    if (x.kind !== 'box') continue;
    n++;
    if (x.op === '+') {                                                        // a + b = □ + d → □ − a 와 d − b 는 부호가 반대
      const moved = x.pos === 'L' ? x.other - x.b : x.other - x.a; const boxMove = w.v - (x.pos === 'L' ? x.a : x.b);
      assert.ok(moved !== 0 && boxMove === -moved, `seed ${s}: ${q.q}`);
    } else {                                                                   // a − b = □ − d → □ − a 와 d − b 는 같다
      assert.ok(x.other !== x.b && w.v - x.a === x.other - x.b, `seed ${s}: ${q.q}`);
    }
  }
  assert.ok(n > 500, `${n}건`);
});

test('화면 연결: 한 줄 요약은 표·도형 배열을 글로 · 문제 글 그림은 qtNode로 네 자리 · 📊 ❓는 figText', async () => {
  const { figText } = await import('../js/mathdraw.js');
  assert.equal(figText('표를 봐요.\n\n[table 상자 수(개):1, 2, 3 / 몬스터볼 수(개):6, 12, ?]\n\n몇 개?'), '표를 봐요.\n\n(표: 상자 수(개) 1, 2, 3 ↔ 몬스터볼 수(개) 6, 12, ?)\n\n몇 개?');
  assert.equal(figText('[steps 3 5 7]'), '(블록 모양: 3개, 5개, 7개)');
  assert.equal(figText('[bar 3/4]'), '[bar 3/4]', '다른 그림 지시문은 건드리지 않는다');
  const src = readFileSync('js/math.js', 'utf8');
  // 문항·쌍둥이·배틀·배움 확인 질문·📬 답장 — 문제 글을 richNode로 바로 그리는 자리가 남지 않았다
  // (문항·쌍둥이는 📊 K 그리기 문항이면 그래프를 뺀 글 — qtNode(qTextOf(q, draw)), 2026-10-01)
  assert.equal((src.match(/qtNode\((?:q\.q|check\.q|ask\.q|qTextOf\(q, draw\))\)/g) || []).length, 5);
  assert.doesNotMatch(src, /richNode\((?:q\.q|check\.q|ask\.q)\)/);
  assert.match(src, /const oneLine = \(t\) => figText\(t, true\)\.replace\(\/\\\*\\\*\/g, ''\)/, '한 줄 요약은 ** 를 뺀다 (잘리면 반쪽 ** 가 보인다)');
  assert.equal(figText('[table □:1, 2 / △:3, 4] 식은?', true), '(표) 식은?', '한 줄 요약은 표를 짧게 — ❓ 버튼 26자를 표가 다 먹지 않게');
  assert.equal(figText('[steps 3 5 7]', true), '(블록 그림)');
  // v256: 📊 ❓ 펼친 문제 줄은 askCardLines가 만든다 — 표를 글로(figText) · 숫자 뒤 조사(fixNumJosa) · ** 는 빼고
  assert.ok(readFileSync('js/stats.js', 'utf8').includes("q: `문제: ${fx(figText(x.q)).replace(/\\*\\*/g, '')}"), '📊 ❓ 펼친 문제는 표를 글로, ** 는 빼고');
  assert.match(readFileSync('css/style.css', 'utf8'), /\.math-fig\.qfig \{ display: block;/);
});

test('🔁 쌍둥이는 같은 틀이되 글이 달라야 한다 — 원래 문제와 글자까지 같은 쌍둥이는 틀마다 30% 이하 (수가 k 하나뿐인 틀·수가 없는 틀 막기)', () => {
  for (const c of CORRESPOND) {
    for (const kind of ['calc', 'misread']) {
      const byKey = {};
      for (let s = 1; s <= 400; s++) {
        const q = makeQuestion(c.id, kind, s * 131, OPTS);
        const t = makeQuestion(c.id, kind, s * 131 + 7, { ...OPTS, want: { k: kind, key: q.key } });
        const b = (byKey[q.key] = byKey[q.key] || { n: 0, same: 0 });
        b.n++; if (t.q === q.q) b.same++;
      }
      for (const [key, b] of Object.entries(byKey)) if (b.n >= 20) assert.ok(b.same / b.n <= 0.3, `${c.id}/${kind} "${key.slice(0, 60)}": 쌍둥이 ${b.same}/${b.n}가 원래 문제와 같은 글`);
    }
  }
});

test('🔍 Codex 15차: 이름표의 뜻 · 조건이 빠진 규칙 · 주황 블록의 뜻 · 넘겨 말하는 문장', () => {
  const src = readFileSync('js/mathcor.js', 'utf8').replace(/\/\/.*$/gm, ''); // 왜 바꿨는지 적어 둔 옛 문장은 주석에 남는다
  const content = readFileSync('coach/math/correspond.json', 'utf8');
  // #1 "d × n" 오답은 처음 수만 빠뜨린 것(d × (n − 1))이 아니라 "늘어나는 수에 순서를 바로 곱함"
  assert.equal(TAGS.stepTimesPos, '늘어나는 수에 순서를 바로 곱함');
  let seen = 0;
  for (const id of ['cor.numseq', 'cor.shapeseq']) {
    for (let s = 1; s <= 600; s++) {
      const q = makeQuestion(id, 'calc', s * 97, OPTS);
      const ch = q.choices.find((c) => c.tag === TAGS.stepTimesPos);
      const m = /(\d+)번째 (?:수는|날에는|모양에는)/.exec(q.q);
      if (!ch || !m) continue;
      seen++;
      const n = +m[1]; const d = (readSteps(q.q) || { d: fitSeq(readSeq(q.q).filter((v) => v !== null)).d }).d;
      assert.equal(Number(ch.text), d * n, `${id} seed ${s}`);
      assert.notEqual(Number(ch.text), d * (n - 1), `${id} seed ${s}: 처음 수만 뺀 값과 같다`);
      assert.match(q.solve.why[ch.tag], /바로 곱했어요/, `${id} seed ${s}: ${q.solve.why[ch.tag]}`);
    }
  }
  assert.ok(seen > 100, `${seen}건`);
  assert.doesNotMatch(src + content, /처음 수는 빼고|처음 \$\{s\}개는 빼고|처음 수 4를 빠뜨린|1번째의 3개를 빠뜨린|빠졌어요\.`/);
  // #2 "함께 늘어나는 두 양은 차이가 그대로" — 탁자 1→2, 의자 4→8도 함께 는다. "같은 수만큼"이 조건
  assert.doesNotMatch(src, /함께 늘어나는 두 양은/);
  for (const kind of ['calc', 'misread']) {
    for (let s = 1; s <= 200; s++) {
      const q = makeQuestion('cor.life', kind, s * 53, OPTS);
      if (/차이/.test(q.solve.rule) && /그대로/.test(q.solve.rule)) assert.match(q.solve.rule, /같은 수만큼/, q.solve.rule);
    }
  }
  assert.match(CONTENT['cor.life'].lesson[2].say, /^\*\*똑같이\*\* 오르는 레벨은/);
  // #3 주황은 "처음에 남는 수(1번째 − 늘어나는 수)"일 때만 — 1번째가 늘어나는 수보다 적으면 주황이 없다
  const orange = (cs) => (stepsSvg(cs).match(/fill="var\(--frac-fill2/g) || []).length;
  assert.equal(orange([3, 5, 7, 9]), 4);     // 모양마다 1개
  assert.equal(orange([7, 10, 13]), 12);     // 모양마다 4개
  assert.equal(orange([2, 5, 8, 11]), 0, '1번째(2)가 늘어나는 수(3)보다 적으면 주황 없이 짧은 파란 기둥');
  assert.equal(orange([4, 8, 12, 16]), 0);
  for (const t of strings(CONTENT)) if (/주황/.test(t)) for (const m of t.matchAll(/\[steps ([\d ]+)\]/g)) { const cs = m[1].trim().split(/\s+/).map(Number); assert.ok(cs[0] > cs[1] - cs[0], `주황을 말하는 장의 그림에 주황이 없다: ${m[0]}`); }
  for (let s = 1; s <= 300; s++) for (const kind of ['calc', 'misread']) { const S = readSteps(makeQuestion('cor.twostep', kind, s * 61, OPTS).q); if (S) assert.ok(S.s > S.d, `두 번 셈 도형은 처음에 남는 수가 있어야: ${S.cs}`); }
  assert.match(CONTENT['cor.twostep'].lesson[1].say, /처음에 남는 수 = 1번째 블록 수 − 늘어나는 수/);
  assert.match(CONTENT['cor.twostep'].lesson[2].say, /적으면\*\*\(2, 5, 8 …\) 처음에 남는 수가 없어요/);
  // #4 "차이가 커지면 더하는 규칙이 아니다"는 1, 3, 6, 10(더하는 수가 커짐)에서 거짓 — "같은 수를 (계속) 더하는"
  assert.doesNotMatch(src + content, /(?<!같은 수를 (?:계속 )?)더하는 규칙(?:이|은) 아니/);
});
