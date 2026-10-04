// 🟰 Q 일차방정식 줄기 생성기 테스트: node --test tests/mathequ.test.js
//
// ★ 핵심은 **독립 검산** — 생성기가 알려 주는 값(probe)을 믿지 않고 **문제 글을 이 파일이 직접 읽어** 다시 푼다.
//   · 방정식은 이 파일의 계산기(evalExpr)로 x에 0·1·2를 넣어 직선으로 해를 구한다 (일차가 아니면 NaN)
//   · 저울은 그림 지시문을 따로 읽어 x에 1부터 넣어 보며 수평이 되는 값을 찾는다
//   · 활용 문제는 문장의 수를 읽어 **하나씩 넣어 보며** 답을 찾는다(나이·만나기·성냥개비는 셈을 따로)
// ★ 이름표는 값만이 아니라 **뜻**까지 — 오답이 그 이름표의 틀린 생각으로 정말 나오는지 문제마다 다시 계산한다.
// ★ 씨앗은 개념마다 수백 개 (RNG_SEEDS=20000으로 넓게).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { EQU, TAGS, makeQuestion, makeRound, ladder, placeFrom, diagnosticSet, lessonOf, checkContent, gradeLabel } from '../js/mathequ.js';
import { valueOf } from '../js/mathexpr.js';
import { tplKey } from '../js/mathgen.js';
import { figureSvg, renderFigures, figText, richParts, parseScale } from '../js/mathdraw.js';
import { padSpec, readTyped, matchTyped, partsOf } from '../js/mathpad.js';

const OPTS = { names: ['피카츄', '리자몽', '개굴닌자'], me: '진우', worlds: { pokemon: [], toystory: [], minions: [], moana: [] } };
const SEEDS = Number(process.env.RNG_SEEDS) || 300;
const IDS = EQU.map((c) => c.id);

// ───────────────────── 이 파일의 계산기 (tests/mathexpr.test.js와 같은 규칙) ─────────────────────

function tokens(s) {
  const out = []; const t = String(s).replace(/−/g, '-'); let i = 0;
  while (i < t.length) {
    const ch = t[i]; let m;
    if (/\s/.test(ch)) { i++; continue; }
    if ((m = /^\d+(\.\d+)?/.exec(t.slice(i)))) { out.push({ k: 'n', v: +m[0] }); i += m[0].length; continue; }
    if (/[a-z]/.test(ch)) { out.push({ k: 'v', v: ch }); i++; continue; }
    if ('+-×÷/()²'.includes(ch)) { out.push({ k: ch }); i++; continue; }
    throw new Error(`모르는 글자 "${ch}" — ${s}`);
  }
  return out;
}
function evalExpr(s, env = {}) {
  const T = tokens(s); let p = 0;
  const peek = () => T[p];
  const eat = (k) => { const t = T[p]; if (!t || (k && t.k !== k)) throw new Error(`식 읽기 실패: ${s}`); p++; return t; };
  const base = () => {
    const t = eat();
    if (t.k === 'n') return t.v;
    if (t.k === 'v') { if (!(t.v in env)) throw new Error(`값 없는 문자 ${t.v}: ${s}`); return env[t.v]; }
    if (t.k === '(') { const v = expr(); eat(')'); return v; }
    throw new Error(`식 읽기 실패: ${s}`);
  };
  const power = () => { let v = base(); while (peek() && peek().k === '²') { eat(); v *= v; } return v; };
  const unary = () => { if (peek() && peek().k === '-') { eat(); return -unary(); } return power(); };
  const term = () => {
    let v = unary();
    for (;;) {
      const t = peek(); if (!t) break;
      if (t.k === '×' || t.k === '÷' || t.k === '/') { eat(); const w = unary(); v = t.k === '×' ? v * w : v / w; } else if (t.k === 'n' || t.k === 'v' || t.k === '(') v *= unary();
      else break;
    }
    return v;
  };
  function expr() { let v = term(); while (peek() && (peek().k === '+' || peek().k === '-')) { const op = eat().k; const w = term(); v = op === '+' ? v + w : v - w; } return v; }
  const v = expr();
  if (p !== T.length) throw new Error(`식이 남음: ${s}`);
  return v;
}
const numOf = (t) => evalExpr(String(t).trim(), {});
const near = (a, b) => Math.abs(a - b) < 1e-9;
const lastLine = (q) => q.trim().split('\n').filter(Boolean).pop();
const boldOf = (q) => (/\*\*(.+?)\*\*/.exec(q) || [])[1];
const sidesOf = (eq) => { const parts = String(eq).split(' = '); if (parts.length !== 2) throw new Error(`등식이 아님: ${eq}`); return parts; };
const fOf = (eq) => { const [L, R] = sidesOf(eq); return (x) => evalExpr(L, { x }) - evalExpr(R, { x }); };
/** 일차방정식의 해 — x에 0·1·2를 넣어 직선인지 보고 0이 되는 x (일차가 아니거나 x가 없어지면 NaN) */
function rootOf(eq) {
  const f = fOf(eq); const f0 = f(0); const f1 = f(1); const f2 = f(2);
  if (!near(f2 - 2 * f1 + f0, 0) || Math.abs(f1 - f0) < 1e-12) return NaN;
  return Math.round((-f0 / (f1 - f0)) * 1e9) / 1e9;
}
const isIdentity = (eq) => { const f = fOf(eq); return [-2.3, 0.7, 4.1].every((x) => near(f(x), 0)); };
const trueAt = (eq, x) => near(fOf(eq)(x), 0);
/** 이항해서 정리하면 일차인가 — 겉에 x²이 있어도 양변에서 없어지면 일차 (x에 0~3을 넣어 본다). Codex 27차: 예전엔 ²가 보이면 무조건 아니라고 봐서, Q5가 가르치는 "x² + 2x = x² + 6"을 이 판정이 틀리게 볼 뻔했다 */
const isLinearEq = (t) => / = /.test(t) && (() => { try { const f = fOf(t); return near(f(2) - 2 * f(1) + f(0), 0) && near(f(3) - 3 * f(1) + 2 * f(0), 0) && !near(f(1), f(0)); } catch { return false; } })();

/** 저울 지시문을 따로 읽는다 — "2x + 3" · "x + 8" · "11" */
function scaleOf(q) {
  const m = /\[scale (.+?) \| (.+?)(?: take=(\d+))?\]/.exec(q);
  if (!m) return null;
  const side = (t) => { const mx = /^(\d*)x/.exec(t); const mn = /(?:^|\+ )(\d+)$/.exec(t); return { x: mx ? (mx[1] ? +mx[1] : 1) : 0, n: mn ? +mn[1] : 0 }; };
  return { L: side(m[1]), R: side(m[2]), take: m[3] ? +m[3] : 0 };
}
/** □가 든 등식이 항등식이 되는 □ — x = 2.7에서 □에 0·1을 넣어 직선으로 */
function boxValue(eq) {
  const at = (v) => eq.replace('□', `(${v})`);
  const g = (v) => fOf(at(v))(2.7);
  const v = Math.round((-g(0) / (g(1) - g(0))) * 1e9) / 1e9;
  return isIdentity(at(v)) ? v : NaN;
}
const find = (lo, hi, ok) => { for (let x = lo; x <= hi; x++) if (ok(x)) return x; return NaN; };

// ───────────────────── 문제 글 읽기 ─────────────────────

/** 문제 글만 보고 풀기 → { type, ans(수 · 고르기는 null), f, form: 'num'|'pick' } */
function solveText(q) {
  const L = lastLine(q); let m;
  const N = (type, ans, f = {}) => ({ type, ans, f, form: 'num' });
  const P = (type, f = {}) => ({ type, ans: null, f, form: 'pick' });
  if (/^다음 중 등식은/.test(q)) return P('iseq');
  if ((m = /^다음 중 해가 x = (\d+)인 방정식은/.exec(q))) return P('hassol', { s: +m[1] });
  if ((m = /x의 값이 1, 2, 3, 4, 5일 때, 방정식 (.+)의 해는/.exec(q))) { const eq = m[1]; return N('find', find(1, 5, (x) => trueAt(eq, x)), { eq }); }
  if (/^다음 중 x에 대한 항등식은/.test(q)) return P('ident');
  if ((m = /^등식 (.+)[이가] x에 대한 항등식이 되려면 □/.exec(q))) return N('box', boxValue(m[1]), { eq: m[1] });
  if (/^a = b일 때, 다음 중 항상 옳은 것은/.test(q)) return P('prop');
  const sc = scaleOf(q);
  if (sc && (m = /양쪽에서 1 추를 (\d+)개씩 덜어 내면, 오른쪽에 남는 1 추는 몇 개/.exec(L))) return N('take', sc.R.n - +m[1], { sc, take: +m[1] });
  if (sc && /x 상자 하나의 무게는 1 추 몇 개와 같을까요\?/.test(L)) return N('scale', find(1, 40, (x) => sc.L.x * x + sc.L.n === sc.R.x * x + sc.R.n), { sc });
  if ((m = /^방정식 (\d+)x = (\d+)의 양변을 같은 수로 나누어 x = (\d+)[을를] 얻었어요/.exec(q))) return N('divby', +m[2] / +m[3], { a: +m[1], k: +m[2], s: +m[3] });
  if (/^다음 방정식의 해는 얼마일까요\?/.test(q)) { const eq = boldOf(q); return N('eq', rootOf(eq), { eq }); }
  if ((m = /^방정식 (.+)에서 (\d+)[을를] 이항하면/.exec(q))) return P('move', { eq: m[1], b: +m[2] });
  if (/^다음 중 일차방정식은/.test(q)) return P('linear');
  // Q9 — 문장의 수를 읽어 하나씩 넣어 본다
  if ((m = /어떤 수의 (\d+)배에서 (\d+)[을를] 뺐더니 (\d+)[이가] 되었어요/.exec(q))) { const [a, b, k] = m.slice(1).map(Number); return N('num', find(-200, 200, (x) => a * x - b === k), { a, b, k }); }
  if ((m = /어떤 수에 (\d+)[을를] 더한 다음 (\d+)배 했더니 (\d+)[이가] 되었어요/.exec(q))) { const [b, a, k] = m.slice(1).map(Number); return N('num2', find(-200, 200, (x) => a * (x + b) === k), { a, b, k }); }
  if ((m = /연속하는 세 자연수를 모두 더했더니 (\d+)[이가] 되었어요/.exec(q)) && /가장 작은 수는 얼마/.test(L)) { const S = +m[1]; return N('consec', find(1, 200, (x) => x + (x + 1) + (x + 2) === S), { S, x: find(1, 200, (x) => x + (x + 1) + (x + 2) === S) }); }
  if ((m = /지금 .+? (\d+)살이고 아빠는 (\d+)살이에요/.exec(q))) { const [a, b] = [+m[1], +m[2]]; const k = +/나이의 (\d+)배가 되는 것은 몇 년 후/.exec(q)[1]; return N('age', find(0, 60, (y) => b + y === k * (a + y)), { a, b, k }); }
  if ((m = /카드 (\d+)장을 친구들에게 (\d+)장씩 나누어 주었더니 (\d+)장이 남았어요/.exec(q))) { const [Nn, p, rem] = m.slice(1).map(Number); return N('card', find(1, 100, (x) => p * x + rem === Nn), { N: Nn, p, rem }); }
  if ((m = /한 시간에 (\d+) km씩 걸어서 먼저 출발했어요. (\d+)시간 뒤에 .+?한 시간에 (\d+) km씩 따라갔어요/.exec(q))) {
    const [v1, t, v2] = m.slice(1).map(Number);
    // 한 시간씩 걸어 보며 거리가 같아지는 때 (나중에 출발한 쪽의 시간)
    return N('meet', find(1, 100, (x) => v2 * x === v1 * (x + t)), { v1, t, v2 });
  }
  if ((m = /성냥개비가 모두 (\d+)개 들었어요/.exec(q))) {
    const Nn = +m[1];
    const sticks = (k) => (k + 1) + 2 * k; // 세로 k + 1개, 가로 위아래 k개씩
    assert.ok(sticks(1) === 4 && sticks(2) - sticks(1) === 3, '이야기의 막대 수가 모양과 다르다');
    return N('match', find(1, 100, (k) => sticks(k) === Nn), { N: Nn });
  }
  throw new Error(`못 읽는 문제:\n${q}`);
}

// ───────────────────── 정답·이름표의 뜻 ─────────────────────

/** 고르기 문항의 맞는 보기 · 수 문항은 값이 같은 보기 */
function rightOnes(sv, chs) {
  if (sv.form === 'num') return chs.filter((x) => near(numOf(x.text), sv.ans));
  const isEq = (t) => / = /.test(t) && !/</.test(t);
  switch (sv.type) {
    case 'iseq': return chs.filter((x) => isEq(x.text));
    case 'hassol': return chs.filter((x) => isEq(x.text) && trueAt(x.text, sv.f.s));
    case 'ident': return chs.filter((x) => isEq(x.text) && isIdentity(x.text));
    case 'prop': return chs.filter((x) => { const [L, R] = sidesOf(x.text); return [2.3, -1.7, 5].every((t) => { const l = evalExpr(L, { a: t }); const r = evalExpr(R, { b: t }); return Number.isFinite(l) && Number.isFinite(r) && near(l, r); }); });
    case 'move': return chs.filter((x) => /^\d*x = [^x]+$/.test(x.text) && near(rootOf(x.text), rootOf(sv.f.eq)));
    case 'linear': return chs.filter((x) => isLinearEq(x.text));
    default: throw new Error(`모르는 고르기 ${sv.type}`);
  }
}

/** 방정식 꼴마다 수를 읽어 틀린 생각을 다시 한다 (Q4~Q8의 "다음 방정식의 해는") */
function eqWrong(eq) {
  let m;
  if ((m = /^x \+ (\d+) = (\d+)$/.exec(eq))) { const [b, k] = m.slice(1).map(Number); return { [TAGS.addInstead]: k + b, [TAGS.dropConst]: k }; }
  // ↓ 원고 확인 질문에만 있는 꼴 (x − b = k · 괄호 양변 · 괄호 = 수)
  if ((m = /^x − (\d+) = (\d+)$/.exec(eq))) { const [b, k] = m.slice(1).map(Number); return { [TAGS.subInstead]: k - b, [TAGS.oneSide]: k }; }
  if ((m = /^(\d+)\(x − (\d+)\) = (\d+)\(x \+ (\d+)\)$/.exec(eq))) { const [k, mm, c, n] = m.slice(1).map(Number); return { [TAGS.distribFirst]: (n + mm) / (k - c), [TAGS.noDivide]: c * n + k * mm }; }
  if ((m = /^(\d+)\(x \+ (\d+)\) = (\d+)$/.exec(eq))) { const [k, mm, c] = m.slice(1).map(Number); return { [TAGS.distribFirst]: (c - mm) / k, [TAGS.dropConst]: c / k }; }
  if ((m = /^(\d+)x = (−?\d+)$/.exec(eq))) { const a = +m[1]; const k = numOf(m[2]); return { [TAGS.subForDiv]: k - a, [TAGS.flipDiv]: a / k }; }
  if ((m = /^(\d+)x − (\d+) = (\d+)$/.exec(eq))) { const [a, b, k] = m.slice(1).map(Number); return { [TAGS.noDivide]: k + b, [TAGS.subInstead]: (k - b) / a }; }
  if ((m = /^(\d+) − (\d+)x = (\d+)$/.exec(eq))) { const [b, a, k] = m.slice(1).map(Number); return { [TAGS.noDivide]: k - b, [TAGS.divSign]: (k - b) / a }; }
  if ((m = /^(\d+)x − (\d+) = (\d+)x \+ (\d+)$/.exec(eq))) { const [a, b, c, d] = m.slice(1).map(Number); return { [TAGS.constSign]: (d - b) / (a - c), [TAGS.noDivide]: d + b }; }
  if ((m = /^(\d+)x \+ (\d+) = (\d+) − (\d+)x$/.exec(eq))) { const [a, b, k, d] = m.slice(1).map(Number); return { [TAGS.xSign]: (k - b) / (a - d), [TAGS.noDivide]: k - b }; }
  if ((m = /^(\d+)\(x − (\d+)\) = (\d+)x \+ (\d+)$/.exec(eq))) { const [k, mm, c, d] = m.slice(1).map(Number); return { [TAGS.distribFirst]: (d + mm) / (k - c), [TAGS.noDivide]: d + k * mm }; }
  if ((m = /^(\d+)x − \((\d+)x − (\d+)\) = (\d+)$/.exec(eq))) { const [a, p, q, k] = m.slice(1).map(Number); return { [TAGS.minusFirst]: (k + q) / (a - p), [TAGS.minusDrop]: (k + q) / (a + p) }; }
  if ((m = /^−(\d+)\(x \+ (\d+)\) = (\d+)$/.exec(eq))) { const [k, mm, c] = m.slice(1).map(Number); return { [TAGS.signKeep]: (k * mm - c) / k, [TAGS.noDivide]: c + k * mm }; }
  if ((m = /^0\.(\d)x \+ 0\.(\d) = ([\d.]+)$/.exec(eq))) { const [A, B] = [+m[1], +m[2]]; const C = +m[3]; return { [TAGS.mulOnlyX]: (C - B / 10) / A, [TAGS.mulOnlyLeft]: (C - B) / A }; }
  if ((m = /^x\/(\d+) \+ (\d+) = x\/(\d+) \+ (\d+)$/.exec(eq))) {
    const [p, b, q, d] = m.slice(1).map(Number); const gcd = (u, v) => (v ? gcd(v, u % v) : u); const L = p * q / gcd(p, q);
    return { [TAGS.noLCDconst]: (d - b) / (L / p - L / q), [TAGS.moveSign]: -rootOf(eq) };
  }
  throw new Error(`모르는 방정식 꼴: ${eq}`);
}
/** 이름표 뜻 — (type, tag, f, 오답 글) → 그 틀린 생각에서 나온 오답인가 */
function tagHolds(type, tag, f, t) {
  const v = () => numOf(t);
  const is = (want) => near(v(), want);
  switch (type) {
    case 'iseq': return { [TAGS.exprAsEq]: !/[=<]/.test(t) && /x/.test(t), [TAGS.ineqAsEq]: /</.test(t), [TAGS.calcAsEq]: !/[=<x]/.test(t) }[tag] === true;
    case 'hassol': { const [L, R] = sidesOf(t); return { [TAGS.concat]: near(evalExpr(L.replace(/(\d+)x/, (_, a) => `${a}${f.s}`)), numOf(R)), [TAGS.addForMul]: near(evalExpr(L.replace(/(\d+)x/, (_, a) => `(${a} + ${f.s})`)), numOf(R)) }[tag] === true; }
    case 'find': { const [Ls, R] = sidesOf(f.eq); return { [TAGS.rhsAsSol]: is(numOf(R)), [TAGS.addForMul]: near(evalExpr(Ls.replace(/(\d+)x/, (_, a) => `(${a} + ${v()})`)), numOf(R)) }[tag] === true; }
    case 'ident': { let m; return { [TAGS.constAsLike]: !!(m = /^(\d+)x \+ (\d+) = (\d+)x$/.exec(t)) && +m[3] === +m[1] + +m[2], [TAGS.distribFirst]: /^(\d+)\(x \+ (\d+)\) = \1x \+ \2$/.test(t), [TAGS.eqAsIdent]: /^\d+x = \d+$/.test(t) }[tag] === true; }
    case 'box': {
      let m;
      if ((m = /^(\d+)\(x \+ (\d+)\) = \1x \+ □$/.exec(f.eq))) return { [TAGS.distribFirst]: is(+m[2]), [TAGS.addForMul]: is(+m[1] + +m[2]) }[tag] === true;
      if ((m = /^(\d+)x \+ (\d+)x − (\d+) = □x − \3$/.exec(f.eq))) return { [TAGS.mulForAdd]: is(+m[1] * +m[2]), [TAGS.firstOnly]: is(+m[1]) }[tag] === true;
      return false;
    }
    case 'prop': { let m; return { [TAGS.oneSide]: /^a [+−×÷] \d+ = b$/.test(t), [TAGS.diffOps]: !!(m = /^a ([+−×÷]) (\d+) = b ([+−×÷]) \2$/.exec(t)) && m[1] !== m[3], [TAGS.divZero]: /÷ 0/.test(t) }[tag] === true; }
    case 'take': return { [TAGS.oneSide]: is(f.sc.R.n), [TAGS.addInstead]: is(f.sc.R.n + f.take) }[tag] === true;
    case 'scale': {
      const { L, R } = f.sc; const dx = L.x - R.x; const dn = R.n - L.n;
      return { [TAGS.noDivide]: dx > 1 && is(dn), [TAGS.addInstead]: is((R.n + L.n) / dx), [TAGS.dropConst]: dx === 1 && L.n > 0 && is(R.n), [TAGS.xOneSide]: R.x > 0 && is(dn / L.x) }[tag] === true;
    }
    case 'divby': return { [TAGS.rhsAsDiv]: is(f.k), [TAGS.solAsDiv]: is(f.s) }[tag] === true;
    case 'eq': { const w = eqWrong(f.eq)[tag]; return w !== undefined && is(w); }
    case 'move': { const [Lh, R] = sidesOf(f.eq); const a = +/^(\d+)x/.exec(Lh)[1]; const k = numOf(R); const b = f.b; return { [TAGS.moveSign]: near(rootOf(t), (k + b) / a), [TAGS.swapSides]: near(rootOf(t), (b - k) / a), [TAGS.coefMove]: /^x = /.test(t) && near(rootOf(t), k - b - a) }[tag] === true; }
    case 'linear': return { [TAGS.xCancel]: / = /.test(t) && /x/.test(t) && !/²/.test(t) && (() => { const g = fOf(t); return near(g(0), g(1)); })(), [TAGS.squareLin]: /²/.test(t), [TAGS.exprAsEq]: !/=/.test(t) }[tag] === true;
    case 'num': return { [TAGS.noDivide]: is(f.k + f.b), [TAGS.subInstead]: near(f.a * v() + f.b, f.k) }[tag] === true;
    case 'num2': return { [TAGS.dropConst]: near(f.a * v(), f.k), [TAGS.distribFirst]: near(f.a * v() + f.b, f.k) }[tag] === true;
    case 'consec': { const x = f.x; return { [TAGS.askedOther]: is(x + 1) || is(x + 2), [TAGS.noDivide]: is(f.S - 3) }[tag] === true; }
    case 'age': return { [TAGS.oneAges]: near(f.b, f.k * (f.a + v())) || near(f.b + v(), f.k * f.a), [TAGS.noDivide]: is(f.b - f.k * f.a) }[tag] === true;
    // 남은 것을 빼지 않고 더함: px = N + rem (Codex 27차 — 예전 판정표가 생성기의 거꾸로 된 이름표 "더해야 할 것을 뺌"을 베껴 못 잡았다)
    case 'card': return { [TAGS.addInstead]: near(f.p * v() - f.rem, f.N), [TAGS.noDivide]: is(f.N - f.rem) }[tag] === true;
    case 'meet': { const x = find(1, 100, (y) => f.v2 * y === f.v1 * (y + f.t)); return { [TAGS.askedOther]: is(x + f.t), [TAGS.noDivide]: is(f.v1 * f.t) }[tag] === true; }
    case 'match': return { [TAGS.allFour]: near(4 * v(), f.N), [TAGS.noDivide]: is(f.N - 1) }[tag] === true;
    default: return false;
  }
}

const allText = (q) => [q.q, ...q.choices.map((x) => x.text), ...(q.solve ? [...q.solve.steps, ...Object.values(q.solve.why), q.solve.whyAny, q.solve.rule] : [])].join('\n');
function* every(kinds = ['calc', 'misread'], n = SEEDS) {
  for (const c of EQU) for (const k of kinds) for (let s = 1; s <= n; s++) yield { c, k, s, q: makeQuestion(c.id, k, s, OPTS) };
}

// ───────────────────── 사다리 ─────────────────────

test('사다리: 9칸, 모두 중1, needs가 바로 앞 칸 · 맨 뒤는 ⭐', () => {
  assert.deepEqual(IDS, ['equ.eq', 'equ.ident', 'equ.prop', 'equ.solve', 'equ.move', 'equ.both', 'equ.paren', 'equ.frac', 'equ.apply']);
  EQU.forEach((c, i) => {
    assert.equal(c.grade, 7, c.id);
    assert.deepEqual(c.needs, i ? [IDS[i - 1]] : [], c.id);
    assert.ok(c.idea && c.rule && c.slip, c.id);
  });
  assert.equal(gradeLabel(7), '중1');
  assert.match(EQU[8].name, /^⭐/);
});

test('계산기 자체 점검 — 해·항등식·□·저울', () => {
  assert.equal(rootOf('3x − 2 = x + 8'), 5);
  assert.equal(rootOf('x/2 + 1 = x/3 + 2'), 6);
  assert.ok(near(rootOf('0.3x + 0.2 = 1.1'), 3));
  assert.ok(Number.isNaN(rootOf('2x + 1 = 2x − 3')) && Number.isNaN(rootOf('x² + 1 = 5')));
  assert.ok(isIdentity('2(x + 3) = 2x + 6') && !isIdentity('2(x + 3) = 2x + 3'));
  assert.equal(boxValue('3(x + 4) = 3x + □'), 12);
  assert.equal(boxValue('2x + 5x − 1 = □x − 1'), 7);
  assert.deepEqual(scaleOf('[scale 2x + 3 | x + 8 take=3]'), { L: { x: 2, n: 3 }, R: { x: 1, n: 8 }, take: 3 });
  assert.deepEqual(scaleOf('[scale x + 6 | 15]'), { L: { x: 1, n: 6 }, R: { x: 0, n: 15 }, take: 0 });
});

// ───────────────────── 문제 ─────────────────────

test('★ 독립 검산: ① 정답이 문제 글을 따로 읽어 푼 답과 같다 · 딱 하나만 맞다 · 해는 정수(방정식 −10~10, 분수 계수 24까지)', () => {
  const types = new Set();
  for (const { c, s, q } of every(['calc'])) {
    const sv = solveText(q.q);
    const ok = q.choices.find((x) => x.ok);
    const right = rightOnes(sv, q.choices);
    assert.equal(right.length, 1, `${c.id} #${s} (${sv.type}): 맞는 보기 ${right.map((x) => x.text).join(', ') || '없음'}\n${q.q}\n${q.choices.map((x) => x.text).join(' | ')}`);
    assert.equal(right[0], ok, `${c.id} #${s}: 정답 표시 "${ok.text}" ≠ 따로 푼 "${right[0].text}"\n${q.q}`);
    if (sv.form === 'num') {
      assert.ok(Number.isInteger(sv.ans), `${c.id} #${s}: 답이 정수가 아니다 ${sv.ans}\n${q.q}`);
      if (sv.type === 'eq') assert.ok(Math.abs(sv.ans) <= (/x\//.test(sv.f.eq) ? 24 : 10) && sv.ans !== 0, `${c.id} #${s}: 해 ${sv.ans}`);
    }
    types.add(sv.type);
  }
  assert.ok(types.size >= 19, `문제 종류 ${types.size}: ${[...types]}`);
});

test('★ 드문 우연 — 고르기 문항은 씨앗 5,000개로 따로: 맞는 보기가 딱 하나 (2만 씨앗이 잡음: 2x + 5 = 9의 "x = 9 − 5 − 2"가 우연히 해 2)', () => {
  let n = 0;
  for (const c of EQU) for (let s = 1; s <= Math.max(SEEDS, 5000); s++) {
    const q = makeQuestion(c.id, 'calc', s, OPTS);
    const sv = solveText(q.q);
    if (sv.form !== 'pick') continue;
    const right = rightOnes(sv, q.choices);
    assert.ok(right.length === 1 && right[0].ok, `${c.id} #${s} (${sv.type}): 맞는 보기 ${right.map((x) => x.text).join(', ')}\n${q.q}`);
    n++;
  }
  assert.ok(n > 10000, `본 고르기 문항 ${n}`);
});

test('★ 보기: 정답 하나, 글자 겹침 없음, 3개 이상, 빈 글자·undefined·NaN·남은 자리표시 없음 · 그림 지시문은 저울만, 모두 그려진다', () => {
  for (const { c, k, s, q } of every()) {
    const at = `${c.id} ${k} #${s}`;
    assert.ok(q.choices.length >= 3, `${at}: 보기 ${q.choices.length}`);
    assert.equal(q.choices.filter((x) => x.ok).length, 1, at);
    assert.equal(new Set(q.choices.map((x) => x.text)).size, q.choices.length, `${at}: 같은 글자 보기`);
    const all = allText(q);
    assert.ok(!/undefined|NaN|\{(me|mon)|null|Infinity/.test(all), `${at}: ${all}`);
    for (const d of q.q.match(/\[[a-z]+ [^\]]+\]/g) || []) {
      assert.match(d, /^\[scale /, `${at}: 저울 말고 다른 그림 ${d}`);
      assert.ok(figureSvg(d.slice(1, -1)).startsWith('<svg'), `${at}: 못 그리는 ${d}`);
    }
  }
});

test('★ 오개념 이름표: 그 오답이 정말 그 틀린 생각이다 — 문제 글을 읽어 틀린 생각을 다시 한다 · 이름표 붙은 오답이 늘 둘 이상', () => {
  let n = 0;
  for (const { c, s, q } of every(['calc'])) {
    const sv = solveText(q.q);
    const tagged = q.choices.filter((x) => !x.ok && x.tag !== '계산 실수');
    assert.ok(tagged.length >= 2, `${c.id} #${s}: 이름표 붙은 오답 ${tagged.length}\n${q.q}`);
    for (const w of tagged) { assert.ok(tagHolds(sv.type, w.tag, sv.f, w.text), `${c.id} #${s} (${sv.type}): "${w.text}"의 이름표 "${w.tag}"가 뜻과 다르다\n${q.q}`); n++; }
  }
  assert.ok(n > 18 * SEEDS, `본 이름표 ${n}`);
});

test('★ 오답끼리 같은 값·같은 글이 되지 않는다 — 보기에서 겹쳐 빠지기 전(probe.allWrong) · 빠진 오답도 이름표의 뜻 그대로', () => {
  for (const { c, s, q } of every(['calc'])) {
    const sv = solveText(q.q); const ok = q.choices.find((x) => x.ok).text;
    const W = q.probe.allWrong;
    assert.equal(new Set(W.map((w) => w.text)).size, W.length, `${c.id} #${s}: 오답 글이 겹친다 ${W.map((w) => w.text)}`);
    for (const w of W) {
      assert.ok(w.text !== ok, `${c.id} #${s}: 오답 "${w.text}" = 정답`);
      if (sv.form === 'num') assert.ok(!near(numOf(w.text), sv.ans), `${c.id} #${s}: 오답 "${w.text}"이 맞는 값`);
      assert.ok(tagHolds(sv.type, w.tag, sv.f, w.text), `${c.id} #${s}: 빠진 오답 "${w.text}"도 "${w.tag}"의 뜻\n${q.q}`);
    }
    if (sv.form === 'num') { const vals = W.map((w) => numOf(w.text)); assert.equal(new Set(vals).size, vals.length, `${c.id} #${s}: 오답 값이 겹친다 ${vals}`); }
  }
});

/** ② 갈래마다 — 보여 준 말이 정말 틀렸고, 고치는 말이 맞는다 (이 파일이 따로 계산) */
function checkMisread(q) {
  const shown = (/\*\*(.+?)\*\*/.exec(q.q) || [])[1] || '';
  const ok = q.choices.find((x) => x.ok).text;
  const after = (t) => t.split(' — ').pop();
  let m;
  switch (`${q.concept} ${q.key}`) {
    case 'equ.eq misread:eq': m = /^(.+)도 등식이에요$/.exec(shown); assert.ok(!/=/.test(m[1])); assert.match(ok, /등호\(=\)가 없어서/); break;
    case 'equ.eq misread:sol': {
      m = /방정식 (.+)에 x = (\d+)[을를] 넣어/.exec(q.q); const eq = m[1]; const s = +m[2];
      assert.ok(trueAt(eq, s), '해가 맞다'); assert.match(shown, /해가 아니에요$/); assert.match(ok, new RegExp(`x = ${s}[은는] 해예요$`)); break;
    }
    case 'equ.ident misread:eq': { m = /^등식 (.+)[을를] 보고/.exec(q.q); const eq = m[1]; assert.ok(!isIdentity(eq)); const s = +/x = (\d+)일 때만 참/.exec(ok)[1]; assert.ok(trueAt(eq, s)); break; }
    case 'equ.ident misread:dist': { m = /^(.+)[은는] 항등식이에요$/.exec(shown); assert.ok(!isIdentity(m[1])); const fixed = /^(.+?)(?:이라서|라서) /.exec(ok)[1]; assert.ok(isIdentity(fixed), ok); break; }
    case 'equ.prop misread:one': case 'equ.solve misread:sub': {
      m = /방정식 (.+)[을를] 풀어요/.exec(q.q); const s = rootOf(m[1]);
      assert.notEqual(numOf(/x = (.+?)(이에요|예요)?$/.exec(shown)[1].split(' = ').pop()), s);
      assert.equal(numOf(after(ok).split(' = ').pop()), s, ok); break;
    }
    case 'equ.prop misread:zero': assert.match(shown, /÷ 0/); assert.match(ok, /0으로는 나눌 수 없어요/); break;
    case 'equ.solve misread:div': case 'equ.move misread:coef': {
      m = /방정식 (.+)[을를] 풀어요/.exec(q.q); const s = rootOf(m[1]);
      const claim = shown.replace(/이에요$|예요$/, '').split(' = ').pop(); assert.notEqual(numOf(claim), s);
      assert.equal(numOf(after(ok).split(' = ').pop()), s, ok); break;
    }
    case 'equ.move misread:sign': case 'equ.both misread:xsign': case 'equ.both misread:const': case 'equ.paren misread:first': case 'equ.paren misread:minus': case 'equ.frac misread:const': case 'equ.frac misread:dec': {
      m = /방정식 (.+?)(?:에서 |[을를] 정리|의 괄호|의 양변)/.exec(q.q); const s = rootOf(m[1]);
      assert.ok(!near(rootOf(shown), s), `보여 준 식 ${shown}의 해가 같다`);
      assert.ok(near(rootOf(after(ok)), s), `고친 식 ${after(ok)}의 해가 다르다`); break;
    }
    case 'equ.apply misread:other': { const S = +/더했더니 (\d+)[이가] 되었어요/.exec(q.q)[1]; const x = find(1, 200, (n) => 3 * n + 3 === S); assert.notEqual(+/가장 작은 수는 (\d+)(이에요|예요)$/.exec(shown)[1], x); assert.equal(numOf(after(ok).split(' = ').pop()), x); break; }
    case 'equ.apply misread:age': { m = /(\d+)살, 아빠는 (\d+)살이에요\. 아빠 나이가 .+?(\d+)배/.exec(q.q); const [a, b, k] = m.slice(1).map(Number); const y = find(0, 60, (z) => b + z === k * (a + z)); assert.notEqual(+/(\d+)년 후예요$/.exec(shown)[1], y); assert.equal(+/x = (\d+)$/.exec(ok)[1], y); break; }
    default: throw new Error(`모르는 ② 갈래 ${q.concept} ${q.key}`);
  }
}

test('★ ② 오개념 문항: 보여 준 말은 정말 틀렸다 · 고치는 말만 맞다 · 갈래 열쇠 둘씩 · 오개념 보기의 값은 바른 답과 다르다', () => {
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

const FRAC_JOSA = /\/(?:\d+|[a-z]+|\([^()]*\))(?:이에요|예요|이라서|라서|이니까|니까|이|가|은|는|을|를|와|과|도|으로|로|의|에)/;

test('★ 조사: 수 뒤는 읽는 소리 · 문자 뒤는 받침 없는 쪽 · ² 뒤는 받침 쪽 · 등식·방정식·해 … 뒤 · 분수 바로 뒤에는 조사 없음', () => {
  const BAT = new Set(['0', '1', '3', '6', '7', '8']);
  const PAIRS = [['을', '를'], ['은', '는'], ['이', '가'], ['과', '와'], ['이에요', '예요'], ['이니까', '니까'], ['이라서', '라서']];
  const jong = (ch) => { const code = ch.charCodeAt(0) - 0xac00; return code >= 0 && code < 11172 ? code % 28 : -1; };
  let hitN = 0; let hitL = 0; let hitW = 0;
  for (const { c, k, s, q } of every()) {
    const all = allText(q).replace(/\*\*/g, '');
    for (const [wb, nb] of PAIRS) {
      for (const m of all.matchAll(new RegExp(`(\\d)(${wb}|${nb})(?=[\\s.,!?)—]|$)`, 'g'))) { assert.equal(m[2], BAT.has(m[1]) ? wb : nb, `${c.id} ${k} #${s}: "…${m[1]}${m[2]}"\n${all}`); hitN++; }
      for (const m of all.matchAll(new RegExp(`([a-z])(${wb}|${nb})(?=[\\s.,!?)—]|$)`, 'g'))) { assert.equal(m[2], nb, `${c.id} ${k} #${s}: "…${m[1]}${m[2]}"`); hitL++; }
      for (const m of all.matchAll(new RegExp(`(²)(${wb}|${nb})(?=[\\s.,!?)—]|$)`, 'g'))) { assert.equal(m[2], wb, `${c.id} ${k} #${s}: "…${m[1]}${m[2]}"`); hitL++; }
      for (const m of all.matchAll(new RegExp(`(등식|방정식|항등식|좌변|우변|양변|미지수|상수항|계수|괄호|부호|분모|(?<![가-힣])해|(?<![가-힣])식|(?<![가-힣])항)(${wb}|${nb})(?=[\\s.,!?)—]|$)`, 'g'))) {
        assert.equal(m[2], jong(m[1].slice(-1)) > 0 ? wb : nb, `${c.id} ${k} #${s}: "…${m[1]}${m[2]}"`); hitW++;
      }
    }
    for (const m of all.matchAll(/(\d)(으로|로)(?=[\s.,]|$)/g)) assert.equal(m[2], ['1', '7', '8'].includes(m[1]) ? '로' : BAT.has(m[1]) ? '으로' : '로', `${c.id} ${k} #${s}: "…${m[1]}${m[2]}"`);
    const fp = FRAC_JOSA.exec(all);
    assert.ok(!fp, `${c.id} ${k} #${s}: 분수 바로 뒤 조사 "${fp && fp[0]}"`);
    assert.ok(!/(?<![\d./])1x|−1x|-\d/.test(all), `${c.id} ${k} #${s}: "1x" 또는 ASCII 빼기\n${all}`);
  }
  assert.ok(hitN > SEEDS && hitL > SEEDS && hitW > SEEDS, `실제로 본 곳: 수 ${hitN} · 문자 ${hitL} · 낱말 ${hitW} (검사가 빈 채 통과하지 않게)`);
});

test('★ 풀이 카드: 단계 · 기억할 것 · 오답마다 왜 · 정답이 단계에 나온다', () => {
  for (const { c, k, s, q } of every()) {
    const sv = q.solve;
    assert.ok(sv && sv.steps.length >= 1 && sv.rule, `${c.id} ${k} #${s}`);
    for (const w of q.choices.filter((x) => !x.ok)) assert.ok(sv.why[w.tag] || sv.whyAny, `${c.id} ${k} #${s}: "${w.tag}" 설명 없음`);
    const ok = q.choices.find((x) => x.ok).text;
    if (k === 'calc' && ok.length <= 16) assert.ok(sv.steps.join(' ').includes(ok), `${c.id} #${s}: 정답 "${ok}"이 풀이에 없다\n${sv.steps.join('\n')}`);
  }
});

test('★ 글 속 셈식은 맞다 (곱셈·나눗셈 먼저) — 문제·보기·풀이 전부 (수만 있는 식)', () => {
  const ev = (expr) => Function(`return (${expr.replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-')})`)();
  let n = 0;
  for (const { c, k, s, q } of every()) {
    // ② "보여 준 말"과 오답 보기(틀린 셈을 흉내 낼 수 있다)는 빼고
    const all = [q.q.replace(/\*\*.+?\*\*/g, ''), q.choices.find((x) => x.ok).text, ...q.solve.steps, ...Object.values(q.solve.why), q.solve.whyAny].join('\n');
    for (const m of all.matchAll(/(?<![\d.□a-z(−])(\d+(?:\.\d+)?(?: [+−×÷] \d+(?:\.\d+)?)+) = (\d+(?:\.\d+)?)(?![\d.a-z²/(])/g)) {
      assert.ok(Math.abs(ev(m[1]) - Number(m[2])) < 1e-6, `${c.id} ${k} #${s}: ${m[0]}`);
      n++;
    }
  }
  assert.ok(n > 3 * SEEDS, `셈식 ${n}`);
});

test('🔁 쌍둥이·🤔 노트: 요청한 틀·갈래로 온다 · 같은 셈 · 쌍둥이 글이 원래 글과 같은 일은 드물다', () => {
  const same2 = {}; const tot = {};
  for (const c of EQU) {
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
const FIRST = [[/항등식/, 'equ.ident'], [/등식의 성질/, 'equ.prop'], [/이항/, 'equ.move'], [/일차방정식/, 'equ.move']];
test('★ 아직 안 배운 말을 앞 칸에 쓰지 않는다 — 항등식 Q2 · 등식의 성질 Q3 · 이항·일차방정식 Q5', () => {
  const idx = (id) => IDS.indexOf(id);
  const banned = (id) => FIRST.filter(([, at]) => idx(at) > idx(id));
  for (const c of EQU) for (const [re] of banned(c.id)) assert.ok(!re.test(`${c.name} ${c.idea} ${c.rule} ${c.slip}`), `${c.id}: 설명에 ${re}`);
  for (const { c, k, s, q } of every()) {
    const all = allText(q) + ' ' + q.choices.map((x) => x.tag || '').join(' ');
    for (const [re] of banned(c.id)) assert.ok(!re.test(all), `${c.id} ${k} #${s}: 아직 안 배운 ${re}\n${all}`);
  }
});

/** 참이라고 내미는 글에 틀린 말 — 오답 보기·② 보여 준 말은 빼고, 굵게(**)는 떼고 */
const BAD = [
  [/이항(?:해도|하면) 부호가 (?:그대로|바뀌지 않)/, '이항하면 부호가 바뀐다'],
  [/0으로 나누어도/, '0으로는 나눌 수 없다'],
  [/x가 있는 등식은 (?:모두 )?항등식/, '방정식은 항등식이 아니다'],
  [/(?<!이항하지 않고 )곱해진 수(?:를|도) 이항/, '곱해진 수는 이항하지 않고 양변을 나눈다'],
  [/한쪽 변에만 (?:더해도|빼도|곱해도)/, '양변에 똑같이'],
  [/양변이 달라져요/, '한쪽만 계산해도 우연히 같을 수 있다 — "같다고 할 수 없어요" (Codex 27차)'],
  [/빼기 먼저, 나누기 나중|순서는 빼기 먼저/, '나누기 먼저도 맞고, 빼진 수는 더한다 — "수만 있는 항을 먼저 없애고 나누면 편해요" (Codex 27차)'],
];
test('★ 참말에 틀린 말이 없다 — 이항·0으로 나누기·항등식·한쪽 변', () => {
  const truths = (q) => [q.choices.find((x) => x.ok).text, ...(q.solve ? [...q.solve.steps, ...Object.values(q.solve.why), q.solve.whyAny, q.solve.rule] : [])].join('\n').replace(/\*\*/g, '');
  for (const { c, k, s, q } of every()) {
    const t = truths(q);
    for (const [re, why] of BAD) assert.ok(!re.test(t), `${c.id} ${k} #${s}: ${why}\n${t}`);
  }
  for (const c of EQU) for (const [re, why] of BAD) assert.ok(!re.test([c.idea, c.rule, c.slip].join('\n').replace(/\*\*/g, '')), `${c.id}: ${why}`);
});

test('🔢 숫자판: 수가 답인 ①만 숫자판 · 음수·분수·소수 답도 칠 수 있다 · 모든 수 보기를 쳐서 그 보기로 간다', () => {
  const pv = readFileSync(new URL('../js/padview.js', import.meta.url), 'utf8');
  const MAX = +/const MAX = (\d+);/.exec(pv)[1];
  let n = 0;
  for (const { c, s, q } of every(['calc'], 200)) {
    const ok = q.choices.find((x) => x.ok).text;
    const spec = padSpec(q, 'equation');
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
  assert.ok(n > 200, `쳐 본 보기 ${n}`);
});

// ───────────────────── 저울 그림 ─────────────────────

test('🎨 저울 그림: 접시마다 x 상자·1 추 개수 = 지시문 · 덜어 낸 추 = take · 수평(해를 넣으면 양쪽 무게가 같다) · 폭 400 · 글로 바꾸기', () => {
  let n = 0;
  for (const { c, s, q } of every(['calc'])) {
    const sc = scaleOf(q.q);
    if (!sc) continue;
    const svg = figureSvg(/\[(scale [^\]]+)\]/.exec(q.q)[1]);
    const pans = [...svg.matchAll(/<g class="sc-pan" data-side="([LR])"[^>]*>([\s\S]*?)<\/g>(?=<g class="sc-pan"|<\/svg>)/g)];
    assert.equal(pans.length, 2, `${c.id} #${s}: 접시 ${pans.length}`);
    for (const [, side, body] of pans) {
      const want = sc[side];
      assert.equal((body.match(/class="sc-x"/g) || []).length, want.x, `${c.id} #${s}: ${side} x 상자`);
      assert.equal((body.match(/class="sc-1/g) || []).length, want.n, `${c.id} #${s}: ${side} 1 추`);
      assert.equal((body.match(/sc-take/g) || []).length, sc.take, `${c.id} #${s}: ${side} 덜어 낸 추`);
    }
    // 수평 — 문제가 말하는 수(해)로 양쪽 무게가 같다
    const x = find(1, 40, (v) => sc.L.x * v + sc.L.n === sc.R.x * v + sc.R.n);
    assert.ok(Number.isInteger(x), `${c.id} #${s}: 수평이 되는 x가 없다 ${JSON.stringify(sc)}`);
    assert.ok(+/viewBox="0 0 (\d+)/.exec(svg)[1] <= 400, `${c.id} #${s}: 폭`);
    assert.match(figText(q.q), /\(저울: 왼쪽 .+ · 오른쪽 .+\)/);
    assert.ok(figText(q.q, true).includes('(저울)'));
    assert.ok(!renderFigures(q.q).includes('[scale'), `${c.id} #${s}: renderFigures가 저울을 못 바꿈`);
    n++;
  }
  assert.ok(n > SEEDS, `본 저울 ${n}`);
  // 덜어 내기(take)는 생성 문항에 없고 원고 배움 장(등식의 성질)에서 쓴다 — 여기서 따로 센다 (변이 검사가 잡은 구멍)
  for (const spec of ['scale 2x + 3 | 11 take=3', 'scale x + 5 | 9 take=5', 'scale 3x + 2 | x + 8 take=2']) {
    const want = +/take=(\d+)/.exec(spec)[1];
    const pans = [...figureSvg(spec).matchAll(/<g class="sc-pan" data-side="([LR])"[^>]*>([\s\S]*?)<\/g>(?=<g class="sc-pan"|<\/svg>)/g)];
    assert.equal(pans.length, 2, spec);
    for (const [, side, body] of pans) assert.equal((body.match(/sc-take/g) || []).length, want, `${spec}: ${side} 접시에서 덜어 낸 추`);
  }
  assert.equal(figureSvg('scale 6x + 1 | 9'), '', 'x 상자는 5개까지');
  assert.equal(figureSvg('scale 2x + 3 | 2 take=3'), '', '덜어 낼 추가 모자라면 안 그린다');
});

test('📏 진단·사다리·한 편·배움 예비·내용 검사', () => {
  const d = diagnosticSet(7, 5, OPTS);
  assert.equal(d.length, 5);
  assert.deepEqual(d.map((q) => q.concept), ['equ.eq', 'equ.prop', 'equ.move', 'equ.paren', 'equ.apply']);
  assert.deepEqual(placeFrom(d.map((q, i) => ({ concept: q.concept, correct: i < 2 }))), { startId: 'equ.move', knownIds: ['equ.eq', 'equ.ident', 'equ.prop', 'equ.solve'] });
  const L0 = ladder([]);
  assert.equal(L0[0].state, 'now');
  assert.ok(L0.slice(1).every((r) => r.state === 'locked'));
  for (const c of EQU) {
    const round = makeRound(c.id, 11, OPTS);
    assert.ok(round.length >= 2 && round.every((q) => q.concept === c.id), c.id);
    const les = lessonOf(c.id, 3, OPTS);
    assert.ok(les.pages.length >= 1 && les.title === c.name);
  }
  assert.ok(checkContent({}).length >= 9, '빈 원고는 칸마다 걸린다');
  // 글 속 식은 세로 분수·기울인 문자로 그려진다 (분수 계수 방정식)
  assert.ok(richParts('x/2 + 1 = x/3 + 2').filter((p) => p.k === 'f').length === 2);
});

// ───────────────────── 2단계: 원고 (coach/math/equation.json) ─────────────────────

const CONTENT = JSON.parse(readFileSync(new URL('../coach/math/equation.json', import.meta.url), 'utf8'));
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
/** 참이라고 내미는 글 — 덩이마다 (확인 질문은 문제 글·정답·풀이를 한 덩이로). 오답 보기·아이가 하는 틀린 말(함정 kid)은 뺀다 */
function truthBlocks(v) {
  const out = [];
  for (const p of v.lesson) { out.push(p.say); if (p.check) out.push([p.check.q, p.check.ok, p.check.why].join('\n')); }
  out.push(v.rule, v.dad.goal, ...v.dad.say, v.dad.do, v.dad.pass, ...v.dad.traps.map((t) => t.dad));
  return out.map((t) => fillC(t).replace(/\*\*/g, ''));
}

/** 이항해서 정리하면 일차인가 — 겉에 x²이 있어도 양변에서 없어지면 일차 (계산기로 x에 0~3을 넣어 본다) */
const linFn = isLinearEq; // 생성기 판정과 같은 것 (Codex 27차)

/** 원고 확인 질문 읽기 — 원고에만 있는 꼴 + 생성기 문제 꼴(solveText) */
function solveCheck(q) {
  let m;
  const P = (type, f) => ({ type, ans: null, f, form: 'pick' });
  if ((m = /^등식 (.+)의 좌변에 x = (−?\d+)[을를] 넣으면 얼마일까요\?$/.exec(q))) { const [L, R] = sidesOf(m[1]); const s = numOf(m[2]); return { type: 'lhs', ans: evalExpr(L, { x: s }), f: { L, R, s }, form: 'num' }; }
  if ((m = /^다음 중 x = (\d+)일 때 참이 되는 등식은 어느 것일까요\?$/.exec(q))) return P('hassol', { s: +m[1] });
  if ((m = /^등식 (.+)[은는] x = (−?\d+)일 때 참이에요\.\n\n이 등식은 항등식일까요\?$/.exec(q))) { assert.ok(trueAt(m[1], numOf(m[2])), `문제 글이 말한 참이 거짓: ${q}`); return P('idq', { eq: m[1] }); }
  if ((m = /^방정식 (.+)[을를] x = (−?\d+)(?:으로|로) 바꾸려면 어떻게 해야 할까요\?$/.exec(q))) return P('how', { eq: m[1], s: numOf(m[2]) });
  if ((m = /^방정식 (.+)에서 −(\d+)[을를] 이항하면 어느 것일까요\?$/.exec(q))) return P('moveS', { eq: m[1] });
  if (/^다음 중 이항해서 정리하면 일차방정식이 되는 것은 어느 것일까요\?$/.test(q)) return P('linear2', {});
  if ((m = /^방정식 (.+)의 양변에 10을 곱하면 어느 것일까요\?$/.exec(q))) return P('times10', { eq: m[1] });
  return solveText(q);
}
/** "양변에 7을 더해요" 같은 보기 → 양변에 하는 계산 (한쪽 변에만 하는 말이면 null) */
function howOp(t) {
  let m;
  if ((m = /^양변에 (\d+)[을를] 더해요$/.exec(t))) return (v) => v + +m[1];
  if ((m = /^양변에서 (\d+)[을를] 빼요$/.exec(t))) return (v) => v - +m[1];
  if ((m = /^양변에 (\d+)[을를] 곱해요$/.exec(t))) return (v) => v * +m[1];
  if ((m = /^양변을 (\d+)(?:으로|로) 나눠요$/.exec(t))) return (v) => v / +m[1];
  return null;
}
/** 원고 확인 질문의 맞는 보기 */
function rightOnesC(sv, chs) {
  switch (sv.type) {
    case 'idq': {
      const id = isIdentity(sv.f.eq);
      return chs.filter((x) => { if (id) return /^네/.test(x.text); const m = /^아니요, x = (−?\d+)일 때는 거짓이라서 방정식이에요$/.exec(x.text); return !!m && !trueAt(sv.f.eq, numOf(m[1])); });
    }
    case 'how': {
      const [L, R] = sidesOf(sv.f.eq);
      // 그 계산을 하면 좌변은 x만 남고(어떤 x에서도) 우변은 문제가 말한 수가 된다
      return chs.filter((x) => { const op = howOp(x.text); return !!op && [0, 1, 2.5, -3].every((v) => near(op(evalExpr(L, { x: v })), v)) && near(op(numOf(R)), sv.f.s); });
    }
    case 'moveS': return chs.filter((x) => /^\d*x = [^x]+$/.test(x.text) && near(rootOf(x.text), rootOf(sv.f.eq)));
    case 'linear2': return chs.filter((x) => / = /.test(x.text) && linFn(x.text));
    case 'times10': return chs.filter((x) => / = /.test(x.text) && !/\./.test(x.text) && near(rootOf(x.text), rootOf(sv.f.eq)));
    default: return rightOnes(sv, chs);
  }
}
/** 이름표 뜻 — 원고에만 있는 꼴 + 생성기 꼴(tagHolds) */
function tagHoldsC(type, tag, f, t) {
  let m;
  switch (type) {
    case 'lhs': return { [TAGS.concat]: near(numOf(t), evalExpr(f.L.replace(/(\d+)x/, (_, a) => `${a}${f.s}`))), [TAGS.addForMul]: near(numOf(t), evalExpr(f.L.replace(/(\d+)x/, (_, a) => `(${a} + ${f.s})`))) }[tag] === true;
    case 'idq': {
      if (isIdentity(f.eq) || !/^네/.test(t)) return false;
      if ((m = /^네, (\d+)x \+ (\d+)[을를] 간단히 하면 (\d+)x예요$/.exec(t))) return tag === TAGS.constAsLike && +m[3] === +m[1] + +m[2] && f.eq.startsWith(`${m[1]}x + ${m[2]} = `);
      return tag === TAGS.eqAsIdent && /참이 되는 값이 있으니까/.test(t);
    }
    case 'how': {
      if (/^(좌변|우변)에만 /.test(t)) return tag === TAGS.oneSide;
      const [L] = sidesOf(f.eq);
      if ((m = /^x − (\d+)$/.exec(L))) return tag === TAGS.subInstead && t === `양변에서 ${m[1]}${/[0136-8]$/.test(m[1]) ? '을' : '를'} 빼요`;
      if ((m = /^x \+ (\d+)$/.exec(L))) return tag === TAGS.addInstead && t === `양변에 ${m[1]}${/[0136-8]$/.test(m[1]) ? '을' : '를'} 더해요`;
      if ((m = /^(\d+)x$/.exec(L))) return (tag === TAGS.subForDiv && /^양변에서 (\d+)[을를] 빼요$/.exec(t)?.[1] === m[1]) || (tag === TAGS.mulForDiv && /^양변에 (\d+)[을를] 곱해요$/.exec(t)?.[1] === m[1]);
      return false;
    }
    case 'moveS': {
      m = /^(\d+)x − (\d+) = (\d+)$/.exec(f.eq); const [a, b, k] = m.slice(1).map(Number);
      return { [TAGS.moveSign]: /^\d+x = [^x]+$/.test(t) && near(rootOf(t), (k - b) / a), [TAGS.coefMove]: /^x = [^x]+$/.test(t) && near(rootOf(t), k + b - a) }[tag] === true;
    }
    case 'linear2': return { [TAGS.squareLin]: /²/.test(t) && !linFn(t), [TAGS.xCancel]: / = /.test(t) && /x/.test(t) && !/²/.test(t) && (() => { const g = fOf(t); return near(g(0), g(1)); })(), [TAGS.exprAsEq]: !/=/.test(t) }[tag] === true;
    case 'times10': {
      m = /^0\.(\d)x \+ 0\.(\d) = (\d+\.\d)$/.exec(f.eq); const [A, B, Cs] = [m[1], m[2], m[3]];
      return { [TAGS.mulOnlyX]: t === `${A}x + 0.${B} = ${Cs}`, [TAGS.mulOnlyLeft]: t === `${A}x + ${B} = ${Cs}` }[tag] === true;
    }
    default: try { return !!tagHolds(type, tag, f, t); } catch { return false; }
  }
}

test('원고(equation.json)가 형식 검사를 통과한다 — 9칸이 사다리 순서대로 · 배움 4~5장·확인 질문 4개↑·아빠 카드(말 2개↑·함정 2개↑·통과 기준)', () => {
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
      const sv = solveCheck(q);
      const chs = [{ text: ok, ok: true }, ...no.map((n) => ({ text: n, ok: false }))];
      const right = rightOnesC(sv, chs);
      assert.equal(right.length, 1, `${where} (${sv.type}): 맞는 보기 ${right.map((x) => x.text).join(', ') || '없음'}`);
      assert.ok(right[0].ok, `${where}: 정답 "${ok}" ≠ 따로 푼 "${right[0].text}"`);
      if (sv.form === 'num') assert.ok(Number.isInteger(sv.ans), `${where}: 답 ${sv.ans}`);
      // 오답이 어느 틀린 생각인지 — 그 문제 꼴의 이름표 하나의 뜻에 맞아야 한다 (아무 수나 쓰지 않았다)
      for (const n of no) {
        assert.ok(Object.values(TAGS).some((tag) => tagHoldsC(sv.type, tag, sv.f, n)), `${where}: 오답 "${n}"은 어느 틀린 생각인가 (${sv.type})`);
        wrongs++;
      }
      // 수 답 오답끼리 값이 겹치지 않는다
      if (sv.form === 'num') assert.equal(new Set(no.map((n) => numOf(n))).size, no.length, `${where}: 오답 값이 겹친다`);
      types.add(sv.type);
      solved++;
    }
  }
  assert.equal(solved, IDS.reduce((a, id) => a + CONTENT[id].lesson.filter((p) => p.check).length, 0));
  assert.ok(solved >= 40 && wrongs >= 2 * solved, `따로 푼 확인 질문 ${solved} · 오답 ${wrongs}`);
  assert.ok(types.size >= 18, `확인 질문이 다룬 문제 종류 ${types.size}: ${[...types]} — 같은 모양만 묻지 않게`);
});

// 배움 글 속 방정식 — 글자 한 덩이(띄어 쓴 연산 기호로 이어짐)
const TOKQ = '(?:[0-9x()/−²]|\\.(?=\\d))+'; // 소수점은 뒤에 숫자가 올 때만 — 문장 끝 "x = 10."의 마침표는 식이 아니다
const RUNQ = `${TOKQ}(?: [+−×÷] ${TOKQ})*`;
const EQQ = `${RUNQ} = ${RUNQ}`;
/** 풀이 줄 화살표 — 한 줄로 " → " 또는 배움 글처럼 한 단계 한 줄 "\n→ " (3단계 헤드리스: 폰에서 식 한가운데가 끊겼다) */
const ARW = '(?: |\\n)→ ';
const ARW_SPLIT = /[ \n]→ /;
/** 방정식의 해 모양 — 해 하나(수 글자) · 'all'(항등식) · 'none'(해 없음) · null(일차가 아님) */
function solSig(eq) {
  const f = fOf(eq); const [f0, f1, f2, f3] = [f(0), f(1), f(2), f(3)];
  if (!near(f2 - 2 * f1 + f0, 0) || !near(f3 - 3 * f1 + 2 * f0, 0)) return null;
  if (near(f1, f0)) return near(f0, 0) ? 'all' : 'none';
  return String(Math.round((-f0 / (f1 - f0)) * 1e9) / 1e9);
}
/**
 * 글 한 덩이가 참이라고 내미는 방정식 이야기:
 * ① "식 → 식 → x = 수"로 이어진 방정식은 해가 같다 (등식의 성질·이항으로 바꾼 식)
 * ② "…의 해는 x = 4" · "…의 해가 x = 3" · "…의 해는 5"
 * ③ "…는 (x에 대한) 항등식이에요 / 항등식이 아니에요 / 항등식이 아니라"
 */
/** "(3x + 1 = 31 → x = 10)"처럼 글 속 괄호에 든 식 — 짝이 안 맞는 바깥 괄호를 뗀다 (tests/mathexpr.test.js와 같다) */
function trimParen(s) {
  const cnt = (x, ch) => x.split(ch).length - 1;
  let t = s;
  while (t.startsWith('(') && cnt(t, '(') > cnt(t, ')')) t = t.slice(1);
  while (t.endsWith(')') && cnt(t, ')') > cnt(t, '(')) t = t.slice(0, -1);
  return t;
}
function eqClaims(block) {
  const out = [];
  for (const m of block.matchAll(new RegExp(`${EQQ}(?:${ARW}${EQQ})+`, 'g'))) {
    const sigs = m[0].split(ARW_SPLIT).map((e) => { try { return solSig(trimParen(e)); } catch (err) { return `읽기 실패(${err.message})`; } });
    out.push(['chain', sigs[0] !== null && sigs.every((s) => s === sigs[0]), `${m[0]}  [${sigs.join(' | ')}]`]);
  }
  for (const m of block.matchAll(new RegExp(`(${EQQ})의 해(?:는|가) (?:x = )?(−?\\d+)`, 'g'))) out.push(['sol', solSig(m[1]) === String(numOf(m[2])), m[0]]);
  for (const m of block.matchAll(new RegExp(`(${EQQ})[은는] (?:x에 대한 )?항등식이(에요| 아니에요| 아니라)`, 'g'))) out.push(['ident', isIdentity(m[1]) === (m[2] === '에요'), m[0]]);
  return out;
}

test('★ 원고의 방정식: "→"로 이어진 방정식은 해가 모두 같다 · 글이 말하는 해·항등식 = 계산기 (배움 글·확인 풀이·아빠 카드)', () => {
  const n = { chain: 0, sol: 0, ident: 0 };
  for (const id of IDS) {
    for (const block of truthBlocks(CONTENT[id])) {
      for (const [kind, ok, what] of eqClaims(block)) { assert.ok(ok, `${id}: "${what}" (${kind})\n${block}`); n[kind]++; }
    }
  }
  assert.ok(n.chain >= 45 && n.sol >= 5 && n.ident >= 4, `대조한 풀이 줄 ${n.chain} · 해 ${n.sol} · 항등식 ${n.ident} (검사가 빈 채 통과하지 않게)`);
  // 배움 글에서 문단 하나가 통째로 풀이 줄이면 한 단계 한 줄 — 한 줄로 이으면 폰(390px)에서 "… → x =" / "3"처럼 식 한가운데가 끊긴다 (3단계 헤드리스)
  let stacked = 0;
  for (const id of IDS) for (const [i, p] of CONTENT[id].lesson.entries()) for (const para of p.say.replace(/\*\*/g, '').split('\n\n')) {
    assert.ok(!new RegExp(`^${EQQ}(?: → ${EQQ})+$`).test(para), `${id}[${i}]: 풀이 문단을 한 줄로 이었다 — 한 단계 한 줄로\n${para}`);
    if (new RegExp(`^${EQQ}(?:\\n→ ${EQQ})+$`).test(para)) stacked++;
  }
  assert.ok(stacked >= 30, `한 단계 한 줄 풀이 문단 ${stacked}`);
});

test('🎨 원고의 저울: 그려지고 수평 · 한 장의 저울은 모두 같은 x에서 수평(덜어 내도 그대로) · 글이 말하는 접시 = 그림 · 저울은 Q3·Q4·Q6에만', () => {
  let scales = 0; let said = 0;
  const balance = (sc) => find(1, 40, (v) => sc.L.x * v + sc.L.n === sc.R.x * v + sc.R.n);
  for (const id of IDS) {
    for (const [i, p] of CONTENT[id].lesson.entries()) {
      const where = `${id}[${i}]`;
      const texts = [p.say, ...(p.check ? [p.check.q] : [])];
      if (!['equ.prop', 'equ.solve', 'equ.both'].includes(id)) { assert.ok(!texts.some((t) => /\[scale /.test(t)), `${where}: 저울은 Q3·Q4·Q6에서만`); continue; }
      for (const t of texts) for (const m of t.matchAll(/\[(scale [^\]]+)\]/g)) assert.ok(figureSvg(m[1]).startsWith('<svg'), `${where}: 못 그리는 [${m[1]}]`);
      const say = [...p.say.matchAll(/\[scale [^\]]+\]/g)].map((m) => scaleOf(m[0]));
      const xs = say.map(balance);
      for (const [k, x] of xs.entries()) assert.ok(Number.isInteger(x), `${where}: 저울 ${k + 1}이 수평이 아니다 ${JSON.stringify(say[k])}`);
      assert.ok(new Set(xs).size <= 1, `${where}: 한 장의 저울이 다른 x에서 수평 ${xs}`);
      scales += say.length;
      // "왼쪽 접시에는 x 상자 3개와 1 추 2개" — 그 장 저울 하나의 그 접시와 같다
      for (const m of p.say.matchAll(/(왼쪽|오른쪽) 접시에는 (x 상자 (\d+)개)?(?:와 )?(1 추 (\d+)개)?/g)) {
        const want = { x: m[2] ? +m[3] : 0, n: m[4] ? +m[5] : 0 };
        const side = m[1] === '왼쪽' ? 'L' : 'R';
        assert.ok(say.some((sc) => sc[side].x === want.x && sc[side].n === want.n), `${where}: 글 "${m[0]}" ≠ 그림`);
        said++;
      }
      // "x 상자 3개가 1 추 15개와 같아요" · "x 한 개는 1 추 5개" — 그 장 저울의 x와 같다 (확인 질문은 그 질문의 저울과)
      // (변이 검사가 잡은 구멍: [scale 3x | 15]를 [scale 3x | 12]로 바꿔도 접시 글만 봐서 지나갔다)
      const sayX = (t, x, w) => {
        for (const m of t.matchAll(/x 상자 (\d+)개(?:가 1 추 (\d+)개와|와 1 추 (\d+)개가) 같/g)) { assert.equal(+(m[2] || m[3]) / +m[1], x, `${w}: 글 "${m[0]}" ≠ 저울의 x ${x}`); said++; }
        for (const m of t.matchAll(/x (?:상자 하나의 무게는|한 개는) 1 추 (\d+)개/g)) { assert.equal(+m[1], x, `${w}: 글 "${m[0]}" ≠ 저울의 x ${x}`); said++; }
      };
      if (say.length) {
        sayX(p.say, xs[0], where);
        // 저울 장의 첫 풀이 줄은 그 저울을 식으로 쓴 것 — 해가 저울의 x
        const first = new RegExp(`${EQQ}(?:${ARW}${EQQ})+`).exec(p.say.replace(/\*\*/g, ''));
        if (first) { assert.equal(solSig(trimParen(first[0].split(ARW_SPLIT)[0])), String(xs[0]), `${where}: 첫 풀이 줄 "${first[0]}" ≠ 저울의 x ${xs[0]}`); said++; }
      }
      if (p.check) { const sc = scaleOf(p.check.q); if (sc) sayX(`${p.check.q}\n${p.check.why}`, balance(sc), `${where}✓`); }
    }
  }
  assert.ok(scales >= 10 && said >= 16, `배움 장 저울 ${scales} · 글·풀이 줄과 대조한 곳 ${said}`);
});

/** 원고에서 참이라고 내밀면 안 되는 말 (생성기 BAD + 원고 말투) */
const BAD_C = [
  ...BAD,
  [/(?<!0이 아닌 )같은 수로 나(?:누어|눠)도/, '나누는 수는 늘 "0이 아닌 같은 수"'],
  [/x가 있는 등식은 (?:모두 )?방정식/, '항등식도 x가 있는 등식이다'],
  [/등호가 있으면 (?:모두 )?방정식/, '등호가 있으면 등식 — 방정식은 그중 일부'],
];

test('★ 원고의 조사·셈식·아직 안 배운 말·틀린 말 (배움 글·확인 질문·아빠 카드 전부) · 분수 바로 뒤 조사 없음 · "1x"·ASCII 빼기 없음', () => {
  const BAT = new Set(['0', '1', '3', '6', '7', '8']);
  const PAIRS = [['을', '를'], ['은', '는'], ['이', '가'], ['과', '와'], ['이에요', '예요'], ['이니까', '니까'], ['이라서', '라서']];
  const jong = (ch) => { const code = ch.charCodeAt(0) - 0xac00; return code >= 0 && code < 11172 ? code % 28 : -1; };
  const ev = (expr) => Function(`return (${expr.replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-')})`)();
  let exprs = 0; let hitN = 0; let hitL = 0; let hitW = 0;
  for (const id of IDS) {
    const all = contentText(CONTENT[id]).replace(/\*\*/g, '');
    for (const [wb, nb] of PAIRS) {
      // 템플릿 글자 안이라 \\d · \\s (N 2단계에서 \d 한 번만 써서 검사가 빈 채 통과한 적 있다)
      for (const m of all.matchAll(new RegExp(`(\\d)(${wb}|${nb})(?=[\\s.,!?)—"]|$)`, 'g'))) { assert.equal(m[2], BAT.has(m[1]) ? wb : nb, `${id}: "…${m[1]}${m[2]}"`); hitN++; }
      for (const m of all.matchAll(new RegExp(`([a-z])(${wb}|${nb})(?=[\\s.,!?)—"]|$)`, 'g'))) { assert.equal(m[2], nb, `${id}: "…${m[1]}${m[2]}"`); hitL++; }
      for (const m of all.matchAll(new RegExp(`(²)(${wb}|${nb})(?=[\\s.,!?)—"]|$)`, 'g'))) { assert.equal(m[2], wb, `${id}: "…${m[1]}${m[2]}"`); hitL++; }
      for (const m of all.matchAll(new RegExp(`(등식|방정식|항등식|좌변|우변|양변|미지수|상수항|계수|괄호|부호|분모|등호|(?<![가-힣])해|(?<![가-힣])식|(?<![가-힣])항)(${wb}|${nb})(?=[\\s.,!?)—"]|$)`, 'g'))) {
        assert.equal(m[2], jong(m[1].slice(-1)) > 0 ? wb : nb, `${id}: "…${m[1]}${m[2]}"`); hitW++;
      }
    }
    for (const m of all.matchAll(/(\d)(으로|로)(?=[\s.,"]|$)/g)) assert.equal(m[2], ['1', '7', '8'].includes(m[1]) ? '로' : BAT.has(m[1]) ? '으로' : '로', `${id}: "…${m[1]}${m[2]}"`);
    assert.ok(!/(cm|km)(은|을|이 |과|이에요|으로)/.test(all), `${id}: 단위 뒤 조사`);
    const fp = FRAC_JOSA.exec(all);
    assert.ok(!fp, `${id}: 분수 바로 뒤 조사 "${fp && fp[0]}"\n${fp && all.slice(Math.max(0, fp.index - 30), fp.index + 20)}`);
    assert.ok(!/(?<![\d./])1x|−1x|-\d/.test(all), `${id}: "1x" 또는 ASCII 빼기\n${all.match(/.*((?<![\d./])1x|−1x|-\d).*/)?.[0]}`);
    // 수만 있는 셈식 — 분모(/ 뒤의 수)와 음수(− 뒤)·문자 붙은 수는 셈식의 시작이 아니다
    for (const m of all.matchAll(/(?<![\d.□a-z(−/])(\d+(?:\.\d+)?(?: [+−×÷] \d+(?:\.\d+)?)+) = (\d+(?:\.\d+)?)(?![\d.a-z²/(])/g)) {
      // "3 + 4 = 8도 등식이에요 — 거짓인 등식" (Q1, Codex 27차): 거짓인 등식의 예로 내민 셈식은 정말 거짓이어야 한다
      const shownFalse = all.slice(m.index + m[0].length).startsWith('도 등식');
      assert.ok((Math.abs(ev(m[1]) - Number(m[2])) < 1e-6) !== shownFalse, `${id}: ${m[0]}${shownFalse ? ' (거짓인 등식의 예인데 참)' : ''}`);
      exprs++;
    }
    const at = IDS.indexOf(id);
    for (const [re, first] of FIRST) if (IDS.indexOf(first) > at) assert.ok(!re.test(all), `${id}: 아직 안 배운 ${re}\n${all.match(new RegExp(`.*(${re.source}).*`))?.[0]}`);
    const truths = truthBlocks(CONTENT[id]).join('\n');
    for (const [re, why] of BAD_C) assert.ok(!re.test(truths), `${id}: ${why}\n${truths.match(new RegExp(`.*${re.source}.*`))?.[0]}`);
  }
  assert.ok(exprs >= 40, `원고 속 셈식 ${exprs}`);
  assert.ok(hitN >= 80 && hitL >= 40 && hitW >= 40, `조사를 실제로 본 곳: 수 ${hitN} · 문자 ${hitL} · 낱말 ${hitW} (검사가 빈 채 통과하지 않게)`);
});

// ───────────────────── 3단계: 화면 연결 ─────────────────────

test('화면 연결 (3단계): STEMS.equation(Q)은 이 생성기·원고를 쓰고 P 입체도형 바로 뒤 · 앱 셸이 둘 다 들고 간다 · 사다리 안내에 D·H 줄기 · 숫자판은 ± 늘 켬 · 저울을 화면·📊·❓가 안다', async () => {
  const { STEMS, STEM_ORDER, stemOf } = await import('../js/mathprog.js');
  assert.equal(STEMS.equation.code, 'Q');
  assert.equal(STEM_ORDER[STEM_ORDER.indexOf('solid') + 1], 'equation', 'P 입체도형 바로 뒤');
  assert.equal(STEMS.equation.list, EQU);
  assert.equal(STEMS.equation.gen.makeQuestion, makeQuestion);
  assert.equal(STEMS.equation.gen.lessonOf, lessonOf, '📚 배움은 이 생성기의 lessonOf');
  assert.equal(STEMS.equation.range, '중1');
  assert.ok(IDS.every((id) => stemOf(id) === STEMS.equation), '모든 칸이 Q 줄기로 찾아진다');
  assert.match(STEMS.equation.pick, /D 문자와 식 줄기.*H 규칙과 대응/);
  const sw = readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
  for (const f of ['./js/mathequ.js', './coach/math/equation.json']) assert.ok(sw.includes(`'${f}'`), `APP_SHELL에 ${f}`);
  // 화면은 개념의 줄기 키로 숫자판을 연다 — 그 키가 'equation'이면 해가 양수인 문항도 ± 키가 있다 (해가 음수인 문항이 섞여 있어 칸을 바꿔 가며 헷갈리지 않게)
  const app = readFileSync(new URL('../js/math.js', import.meta.url), 'utf8');
  assert.match(app, /padSpec\(q, \(stemOf\(q\.concept\) \|\| S\(\)\)\.key\)/);
  let n = 0;
  for (const c of EQU) for (let s = 1; s <= 60; s++) {
    const q = makeQuestion(c.id, 'calc', s, OPTS);
    const spec = padSpec(q, stemOf(q.concept).key);
    if (!spec) continue;
    assert.equal(spec.signed, true, `${c.id} #${s}: ± 키 없음`);
    n++;
  }
  assert.ok(n > 200, `숫자판 문항 ${n}`);
  // 저울의 보이는 크기는 그린 크기의 1.25배 (헤드리스 800px: 400이면 추 숫자가 본문 글자보다 작았다) — 폰에서는 max-width:100%로 줄어든다
  const big = figureSvg('scale 2x + 3 | 11');
  const vb = /viewBox="0 0 (\d+) (\d+)"/.exec(big); const wh = /width="(\d+)" height="(\d+)"/.exec(big);
  assert.ok(vb && wh && +wh[1] === Math.round(+vb[1] * 1.25) && +wh[2] === Math.round(+vb[2] * 1.25), `저울 보이는 크기 ${wh && wh.slice(1)} · 그린 크기 ${vb && vb.slice(1)}`);
  // 화면이 글 속 그림을 바꾸는 자리(renderFigures) · 📊 펼친 문제 글(figText) — 저울을 안다 (L 때 range가 빠져 글자로 찍힐 뻔했다)
  for (const d of ['[scale 2x + 3 | 11]', '[scale x + 5 | 12 take=5]', '[scale 3x + 2 | x + 8]', '[scale 3x | 15]']) {
    assert.ok(renderFigures(`앞 ${d} 뒤`).includes('<svg') && !renderFigures(`앞 ${d} 뒤`).includes(d), `renderFigures가 ${d}를 못 그림`);
    const t = figText(`앞 ${d} 뒤`);
    assert.ok(!t.includes('[') && /저울: 왼쪽 .+ · 오른쪽 /.test(t), `figText가 ${d}를 글로 못 바꿈: ${t}`);
    assert.equal(figText(d, true), '(저울)', `한 줄 요약에서 ${d}는 (저울)`);
  }
  const ask = readFileSync(new URL('../js/mathask.js', import.meta.url), 'utf8');
  const stats = readFileSync(new URL('../js/stats.js', import.meta.url), 'utf8');
  for (const src of [ask, stats]) for (const ex of src.match(/\[scale [^\]]+\]/g) || ['없음']) assert.ok(figureSvg(ex.slice(1, -1)), `예시가 그려지지 않음: ${ex}`);
  assert.ok(ask.includes('[scale 2x + 3 | 11]') && stats.includes('[scale 2x + 3 | 11]'), '❓ 복사문·📊 답장 안내에 [scale] 예');
});

// ───────────────────── Codex 27차 ─────────────────────

test('★ Codex 27차 #1·#9 — 카드 나누기: 남은 것을 더한 오답은 "빼야 할 것을 더함"(예전엔 거꾸로 "더해야 할 것을 뺌") · 만나기는 "같은 곳에서 출발해"', () => {
  const q = makeQuestion('equ.apply', 'calc', 5, OPTS);
  assert.match(q.q, /카드 38장을 친구들에게 4장씩 나누어 주었더니 2장이 남았어요/);
  const w = q.choices.find((c) => c.text === '10');
  assert.ok(w && w.tag === TAGS.addInstead, `오답 10의 이름표 ${w && w.tag}`);
  let cards = 0; let meets = 0;
  for (let s = 1; s <= Math.max(SEEDS, 2000); s++) {
    const x = makeQuestion('equ.apply', 'calc', s, OPTS);
    if (x.probe.ask === 'card') {
      const [N, p, rem] = /카드 (\d+)장을 친구들에게 (\d+)장씩 나누어 주었더니 (\d+)장이 남았어요/.exec(x.q).slice(1).map(Number);
      const added = x.probe.allWrong.find((v) => near(numOf(v.text), (N + rem) / p));
      assert.ok(added && added.tag === TAGS.addInstead, `#${s}: (N + 남은 것) ÷ p 오답의 이름표 ${added && added.tag}`);
      cards++;
    }
    if (x.probe.ask === 'meet') { assert.match(x.q, /뒤에 .+?같은 곳에서 출발해 같은 길을/, `#${s}: 출발점`); meets++; }
  }
  assert.ok(cards > 50 && meets > 50, `카드 ${cards} · 만나기 ${meets}`);
});

test('★ Codex 27차 #2·#7 — 참·거짓은 원래 우변과 비교해서("좌변 … = A, 우변 B — 같아서 참/달라서 거짓"), 셈식 바로 뒤에 "— 거짓"을 붙이지 않는다 · Q1은 거짓인 등식도 등식이라고 가르친다', () => {
  let n = 0;
  const look = (all, where) => {
    assert.ok(!/= −?\d+ — 거짓/.test(all), `${where}: 맞는 셈식 바로 뒤에 "— 거짓"\n${all.match(/.*= −?\d+ — 거짓.*/)?.[0]}`);
    for (const m of all.matchAll(/좌변 [^,\n]+ = (−?\d+), 우변 (−?\d+) — (같아서 참|달라서 거짓)/g)) { assert.equal(numOf(m[1]) === numOf(m[2]), m[3] === '같아서 참', `${where}: ${m[0]}`); n++; }
  };
  for (const { c, k, s, q } of every()) look(allText(q), `${c.id} ${k} #${s}`);
  for (const id of IDS) look(contentText(CONTENT[id]), id);
  assert.ok(n > 100, `원래 우변과 비교한 말 ${n}`);
  assert.match(CONTENT['equ.eq'].lesson[0].say, /3 \+ 4 = 8도 등식이에요 — 양변의 값이 달라서 \*\*거짓인 등식\*\*/, 'Q1 1장: 거짓인 등식도 등식');
});

test('★ Codex 27차 #3 — "a = b일 때 항상 옳은 것": 정답만 늘 참이고 오답은 늘 참이 아니다(a = b = 0이면 우연히 참일 수는 있다) · 풀이는 "같다고 할 수 없어요"', () => {
  let n = 0;
  const holds = (t, v) => { const [L, R] = sidesOf(t); const l = evalExpr(L, { a: v }); const r = evalExpr(R, { b: v }); return Number.isFinite(l) && Number.isFinite(r) && near(l, r); };
  for (let s = 1; s <= SEEDS; s++) {
    const q = makeQuestion('equ.prop', 'calc', s, OPTS);
    if (!/^a = b일 때/.test(q.q)) continue;
    assert.match(q.q, /^a = b일 때, 다음 중 항상 옳은 것은/);
    for (const ch of q.choices) {
      const always = [0, 2.3, -1.7, 5, -7 / 6].every((v) => holds(ch.text, v));
      assert.equal(always, !!ch.ok, `#${s}: "${ch.text}" 늘 참 ${always}`);
    }
    assert.ok(!/양변이 달라져요/.test(allText(q)), `#${s}: "양변이 달라져요" 단정`);
    n++;
  }
  for (const id of ['equ.prop']) for (const p of CONTENT[id].lesson) if (p.check && /^a = b일 때/.test(p.check.q)) assert.match(p.check.q, /항상 옳은 것은/, '원고 확인 질문도 "항상"');
  assert.ok(n > 50, `a = b 문항 ${n}`);
});

test('★ Codex 27차 #6·#11 — 손으로 쓴 저울 지시문은 띄어쓰기가 달라도 그린다 · 못 그리는 지시문은 배움 글에서 빈 그림 대신 글자 그대로 · 📊·❓ 글은 "x 상자·1 추"', () => {
  for (const d of ['2x+3 | 11', '2x +3 | 11', '2x  +  3 | 11', '2x + 3|11']) {
    assert.deepEqual(parseScale(d), { L: { x: 2, n: 3 }, R: { x: 0, n: 11 }, take: 0 }, d);
    assert.ok(renderFigures(`[scale ${d}]`).includes('<svg'), `[scale ${d}]`);
  }
  assert.equal(parseScale('2x − 3 | 11'), null, '빼기는 저울로 못 그린다');
  assert.equal(figText('[scale 2x + 3 | 11 take=3]'), '(저울: 왼쪽 x 상자 2개와 1 추 3개 · 오른쪽 1 추 11개 · 양쪽에서 1 추를 3개씩 덜어 냄)');
  // 배움 글(storyBody)도 문제 글(qtNode)처럼 — renderFigures가 그림을 못 만들면 글자로 남긴다
  const app = readFileSync(new URL('../js/math.js', import.meta.url), 'utf8');
  const body = /function storyBody\(text\) \{[\s\S]*?\r?\n\}\r?\n/.exec(app)[0]; // 작업 트리는 CRLF일 수 있다
  assert.match(body, /const svg = .*renderFigures\(seg\)/);
  assert.match(body, /if \(svg && svg !== seg\) p\.appendChild\(svgBox\(svg, 'math-fig inline'\)\);\s*else \{/);
});
