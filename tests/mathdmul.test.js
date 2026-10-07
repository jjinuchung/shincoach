// ✖️ W 소수의 곱셈 줄기 — 생성기 테스트.
// ★ 정답·오답은 이 파일이 **문제 글을 따로 읽어** 정확한 분수 셈(소수 = 분모가 10의 거듭제곱인 분수)으로 다시 푼다 (생성기의 계산을 쓰지 않는다).
//   이름표 판정은 생성기 이름표를 보지 않고 **그 틀린 셈이 실제로 한 일**로 다시 계산한다 (메모 stem-generator-pitfalls 38·40번, U·V 2단계).
// 함정(stem-generator-pitfalls)을 처음부터: 단위 글자 뒤 조사 · 쌍둥이 틀 · 오답끼리 같은 값 · 우연히 맞는 값 · ② 보기 결론의 수 ·
//   숫자판으로 모든 보기(+ 화면에서 빠진 후보·끝자리 0)를 쳐 보기 · 참말 금지 · 글 속 셈식(소수까지) · 그림 칸 수 = 지시문 = 문제 글의 식

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DMUL, TAGS, makeQuestion, makeRound, ladder, placeFrom, diagnosticSet, lessonOf, checkContent, gradeLabel } from '../js/mathdmul.js';
import { tplKey } from '../js/mathgen.js';
import { figureSvg, renderFigures, figText } from '../js/mathdraw.js';
import { padSpec, readTyped, matchTyped, partsOf } from '../js/mathpad.js';

const OPTS = { names: ['피카츄', '리자몽', '개굴닌자'], me: '진우', worlds: { pokemon: [], toystory: [], minions: [], moana: [] } };
const SEEDS = Number(process.env.RNG_SEEDS) || 300;
const IDS = DMUL.map((c) => c.id);

// ───────────────────── 이 파일의 수 셈 (분수로 정확하게) ─────────────────────

const gcd = (a, b) => (b ? gcd(b, a % b) : Math.abs(a));
const Q = (n, d = 1) => { if (d < 0) { n = -n; d = -d; } const k = gcd(n, d) || 1; return { n: n / k, d: d / k }; };
const add = (x, y) => Q(x.n * y.d + y.n * x.d, x.d * y.d);
const sub = (x, y) => Q(x.n * y.d - y.n * x.d, x.d * y.d);
const mul = (x, y) => Q(x.n * y.n, x.d * y.d);
const div = (x, y) => Q(x.n * y.d, x.d * y.n);
const eq = (x, y) => !!(x && y && x.n * y.d === y.n * x.d);
const cmpQ = (x, y) => x.n * y.d - y.n * x.d;
const show = (x) => (x ? `${x.n}/${x.d}` : String(x));
const P10 = (k) => 10 ** k;
/** 수 하나의 글자 → 값: "3" · "2.45" · "3/4" (못 읽으면 null) */
function val(t) {
  const s = String(t).trim(); let m;
  if ((m = /^(\d+)\.(\d+)$/.exec(s))) return Q(+(m[1] + m[2]), P10(m[2].length));
  if ((m = /^(\d+)\/(\d+)$/.exec(s))) return Q(+m[1], +m[2]);
  if ((m = /^(\d+)$/.exec(s))) return Q(+m[1]);
  return null;
}
/** 소수 글자 → { u(점을 뗀 숫자), p(소수 자리 수), w(자연수 부분), f(소수 부분의 숫자) } — 자연수는 p = 0 */
function dec(t) {
  const m = /^(\d+)(?:\.(\d+))?$/.exec(String(t).trim());
  if (!m) return null;
  const fs = m[2] || '';
  return { u: +(m[1] + fs), p: fs.length, w: +m[1], f: fs ? +fs : 0, text: String(t).trim() };
}
/** 식 계산기 — 자연수·소수·분수·+ − × ÷·괄호. 못 읽으면 throw */
function evalExpr(src) {
  const s = String(src).trim(); let i = 0;
  const ws = () => { while (s[i] === ' ') i++; };
  const number = () => {
    let m = /^(\d+)\.(\d+)(?![\d/.])/.exec(s.slice(i));
    if (m) { i += m[0].length; return Q(+(m[1] + m[2]), P10(m[2].length)); }
    m = /^(\d+)\/(\d+)(?![\d/.])/.exec(s.slice(i));
    if (m) { i += m[0].length; return Q(+m[1], +m[2]); }
    m = /^\d+(?![\d/.])/.exec(s.slice(i));
    if (m) { i += m[0].length; return Q(+m[0]); }
    throw new Error(`수를 못 읽음: ${s.slice(i)}`);
  };
  const atom = () => { ws(); if (s[i] === '(') { i++; const v = expr(); ws(); if (s[i] !== ')') throw new Error('괄호'); i++; return v; } return number(); };
  const termP = () => { let v = atom(); for (;;) { ws(); if (s[i] === '×') { i++; v = mul(v, atom()); } else if (s[i] === '÷') { i++; v = div(v, atom()); } else return v; } };
  const expr = () => { let v = termP(); for (;;) { ws(); if (s[i] === '+') { i++; v = add(v, termP()); } else if (s[i] === '−') { i++; v = sub(v, termP()); } else return v; } };
  const v = expr(); ws();
  if (i !== s.length) throw new Error(`남은 글: ${s.slice(i)}`);
  return v;
}
/** 글 끝의 수 (결론) */
function lastNum(t) {
  const all = [...String(t).matchAll(/(\d+\.\d+|\d+\/\d+|\d+)/g)];
  return all.length ? val(all[all.length - 1][1]) : null;
}
const bolds = (q) => [...String(q).matchAll(/\*\*(.+?)\*\*/g)].map((m) => m[1]);

// ───────────────────── 문제 글 읽기 ─────────────────────

/** 문제 글 → { type, form('num'|'pick'), ans | ok(고르기 판정), f: { ops(두 수의 글자) } } */
function solveText(q) {
  let m;
  if ((m = /곱이 (\d+)보다 큰 것은 어느 것/.exec(q))) { const k = Q(+m[1]); return { type: 'bigger', form: 'pick', ok: (t) => cmpQ(evalExpr(t), k) > 0, f: { N: +m[1] } }; }
  if ((m = /^(\d+) × (\d+) = (\d+) — 이 곱셈을 이용하여/.exec(q))) {
    assert.equal(+m[1] * +m[2], +m[3], `주어진 곱셈이 틀림: ${m[0]}`);
    const e = bolds(q)[0]; const ops = e.split(' × ');
    assert.equal(dec(ops[0]).u, +m[1], `${q}: 앞 수의 숫자`); assert.equal(dec(ops[1]).u, +m[2], `${q}: 뒤 수의 숫자`);
    return { type: 'sum', form: 'num', ans: evalExpr(e), f: { ops } };
  }
  if (/^다음을 계산하면 얼마일까요\?/.test(q)) { const e = bolds(q)[0]; const ops = e.split(' × '); return { type: 'calc', form: 'num', ans: evalExpr(e), f: { ops } }; }
  const story = [
    [/하루에 나무열매 주스를 (\S+) L씩 마셔요\. (\d+)일 동안/, 'juice'],
    [/한 상자의 무게가 (\S+) kg인 몬스터볼 상자가 (\d+)개/, 'box'],
    [/날마다 (\S+) km씩 달려요\. (\d+)일 동안/, 'run'],
    [/한 컵에 (\S+) L씩 담긴 물이 (\d+)컵/, 'cup'],
    [/(\d+) m 리본의 (\S+)배만큼을 썼어요/, 'ribbonOf'],
    [/한 바퀴가 (\d+) km인 산책길을 (\S+)바퀴 걸었어요/, 'laps'],
    [/무게가 (\d+) kg인 나무열매 바구니의 (\S+)배만큼을 먹었어요/, 'basket'],
    [/가로가 (\S+) m, 세로가 (\S+) m인 직사각형 모양 꽃밭/, 'flower'],
    [/1 m의 무게가 (\S+) kg인 철사가 있어요\. 이 철사 (\S+) m의 무게/, 'wire'],
    [/1 kg에 (\d+)원인 고구마를 (\S+) kg 샀어요\. 고구마값은/, 'price'],
    [/가로가 (\S+) m, 세로가 (\S+) m인 직사각형 모양의 텃밭/, 'field'],
    [/가진 리본은 (\S+) m짜리예요\. .+? 가진 리본은 그 (\S+)배라면/, 'times'],
  ];
  for (const [re, type] of story) {
    if ((m = re.exec(q))) {
      const ops = [m[1], m[2]]; const vals = ops.map(val);
      assert.ok(vals.every(Boolean), `이야기 수 ${ops}`);
      return { type, form: 'num', ans: mul(vals[0], vals[1]), f: { ops } };
    }
  }
  return { type: 'unknown' };
}

/** 자연수 부분과 소수 부분을 따로 곱해 이어 쓴 글 → 값 ("8" 과 "12" → 8.12) */
const joined = (w, f) => val(`${w}.${f}`);
/** 받아올림을 버린 자연수 곱셈 — 아랫자리 곱의 일의 자리만 쓰고, 맨 앞자리 곱은 그대로 */
function noCarryMul(u, n) {
  const ds = String(u).split('').map(Number);
  return +ds.map((d, i) => (i === 0 ? String(d * n) : String((d * n) % 10))).join('');
}
/**
 * 이름표 뜻 — 그 틀린 생각을 문제 글의 수로 다시 한 값. f: { ops: [A, B] } (곱셈의 두 수, 순서대로)
 * 판정표는 생성기 이름표를 베끼지 않는다 — 그 이름의 셈이 실제로 하는 일을 이 파일이 다시 쓴다.
 */
function tagHolds(f, tag, t) {
  if (f.N !== undefined) return tag === TAGS.mulBigger && (() => { const m = /^(\d+) × (.+)$/.exec(t); return !!m && +m[1] === f.N && cmpQ(val(m[2]), Q(1)) < 0; })();
  const v = val(t); const is = (w) => !!w && !!v && eq(v, w);
  const [A, B] = f.ops.map(dec); if (!A || !B) return false;
  const VA = val(A.text); const VB = val(B.text);
  const U = A.u * B.u; const P = A.p + B.p;
  const nat = A.p === 0 ? A : B.p === 0 ? B : null; const x = nat === A ? B : A; // (자연수) × (소수)이면 nat·x
  const pow10 = B.p === 0 && /^10+$/.test(B.text) ? B.text.length - 1 : 0; // × 10 · 100 · 1000
  const powTenth = /^0\.0*1$/.test(B.text) ? B.p : 0; // × 0.1 · 0.01 · 0.001
  switch (tag) {
    case TAGS.dropPoint: return P > 0 && /^\d+$/.test(t) && +t === U && !pow10 && !powTenth;
    case TAGS.pointPos: return P > 0 && !pow10 && !powTenth && [P - 1, P + 1].some((p) => p >= 0 && is(Q(U, P10(p))));
    case TAGS.placesNotAdded: return A.p > 0 && B.p > 0 && !powTenth && is(Q(U, P10(Math.max(A.p, B.p))));
    case TAGS.tenth: return !!nat && x.p === 2 && is(Q(nat.u * x.u, 10));
    case TAGS.addInstead: return is(add(VA, VB));
    case TAGS.splitMul: {
      // 소수 부분의 곱이 자리를 안 넘으면(2.1 × 4 = 8.4) 따로 곱해도 바른 답이다 — 그때는 틀린 셈이 아니다
      if (nat && x.w >= 1 && x.p > 0) return x.f * nat.u >= P10(x.p) && is(joined(x.w * nat.u, x.f * nat.u));
      if (A.p === 1 && B.p === 1) return !eq(joined(A.w * B.w, A.f * B.f), mul(VA, VB)) && is(joined(A.w * B.w, A.f * B.f));
      return false;
    }
    case TAGS.noCarry: return !!nat && nat.u >= 2 && nat.u <= 9 && x.p > 0 && noCarryMul(x.u, nat.u) !== x.u * nat.u && is(Q(noCarryMul(x.u, nat.u), P10(x.p)));
    case TAGS.reverse: return pow10 ? is(div(VA, VB)) : powTenth ? is(mul(VA, Q(P10(powTenth)))) : false;
    case TAGS.moves: return pow10 ? [pow10 - 1, pow10 + 1].some((k) => k >= 1 && is(mul(VA, Q(P10(k))))) : powTenth ? [powTenth - 1, powTenth + 1].some((k) => k >= 1 && is(mul(VA, Q(1, P10(k))))) : false;
    case TAGS.padZero: return !!pow10 && t.length > A.text.length && t.startsWith(A.text) && /^0+$/.test(t.slice(A.text.length)) && A.p > 0;
    default: return false;
  }
}

const allText = (q) => [q.q, ...q.choices.map((x) => x.text), ...(q.solve ? [...q.solve.steps, ...Object.values(q.solve.why), q.solve.whyAny, q.solve.rule] : [])].join('\n');
function* every(kinds = ['calc', 'misread'], n = SEEDS) {
  for (const c of DMUL) for (const k of kinds) for (let s = 1; s <= n; s++) yield { c, k, s, q: makeQuestion(c.id, k, s, OPTS) };
}

// ───────────────────── 사다리 ─────────────────────

test('사다리: 8칸, 모두 초5, needs가 바로 앞 칸 · 맨 뒤는 ⭐ · 교과서 차시 순서', () => {
  assert.deepEqual(IDS, ['dmul.d1nat', 'dmul.d2nat', 'dmul.natd1', 'dmul.natd2', 'dmul.d1d1', 'dmul.d2d1', 'dmul.point', 'dmul.apply']);
  DMUL.forEach((c, i) => {
    assert.equal(c.grade, 5, c.id);
    assert.deepEqual(c.needs, i ? [IDS[i - 1]] : [], c.id);
    assert.ok(c.idea && c.rule && c.slip, c.id);
  });
  assert.equal(gradeLabel(5), '초5');
  assert.match(DMUL[7].name, /^⭐/);
});

test('계산기 자체 점검 — 소수·분수·끝의 수 · 이름표 판정의 몇 예 (지도서 익힘 53·57쪽 오답)', () => {
  assert.ok(eq(evalExpr('0.7 × 3'), Q(21, 10)));
  assert.ok(eq(evalExpr('7/10 × 3'), Q(21, 10)));
  assert.ok(eq(evalExpr('0.06 × 0.08'), Q(48, 10000)));
  assert.ok(eq(lastNum('곱은 2.1'), Q(21, 10)));
  const f = (a, b) => ({ ops: [a, b] });
  assert.ok(tagHolds(f('6.39', '7'), TAGS.pointPos, '447.3'), '익힘 53쪽 6.39 × 7 = 447.3 (바른 답 44.73)');
  assert.ok(tagHolds(f('13', '0.38'), TAGS.tenth, '49.4'), '익힘 57쪽 13 × 0.38 = 49.4 (바른 답 4.94)');
  assert.ok(tagHolds(f('2.3', '4'), TAGS.splitMul, '8.12'));
  assert.ok(tagHolds(f('1.9', '2.8'), TAGS.splitMul, '2.72'));
  assert.ok(tagHolds(f('2.3', '4'), TAGS.noCarry, '8.2'));
  assert.ok(tagHolds(f('0.4', '0.8'), TAGS.placesNotAdded, '3.2'));
  assert.ok(tagHolds(f('0.7', '3'), TAGS.dropPoint, '21'));
  assert.ok(tagHolds(f('2.45', '10'), TAGS.reverse, '0.245'));
  assert.ok(tagHolds(f('2.45', '10'), TAGS.padZero, '2.450'));
  assert.ok(tagHolds(f('2450', '0.01'), TAGS.moves, '2.45'));
  assert.ok(!tagHolds(f('2.1', '4'), TAGS.splitMul, '8.4'), '소수 부분의 곱이 자리를 안 넘으면 바른 답과 같다 — 이름표가 아니다');
  assert.ok(!tagHolds(f('2.45', '10'), TAGS.pointPos, '0.245'), '× 10은 "소수점을 반대로 옮김"으로만');
  assert.throws(() => evalExpr('3 … 2'));
});

// ───────────────────── 문제 ─────────────────────

test('★ 독립 검산: ① 정답이 문제 글을 따로 읽어 푼 답과 같다 · 딱 하나만 맞다 · 답은 0보다 크다', () => {
  const types = new Set();
  for (const { c, s, q } of every(['calc'])) {
    const sv = solveText(q.q);
    assert.notEqual(sv.type, 'unknown', `${c.id} #${s}: 못 읽는 문제\n${q.q}`);
    const ok = q.choices.find((x) => x.ok);
    const right = sv.form === 'pick' ? q.choices.filter((x) => sv.ok(x.text)) : q.choices.filter((x) => eq(val(x.text), sv.ans));
    assert.equal(right.length, 1, `${c.id} #${s} (${sv.type}): 맞는 보기 ${right.map((x) => x.text).join(', ') || '없음'}\n${q.q}\n${q.choices.map((x) => x.text).join(' | ')}`);
    assert.equal(right[0], ok, `${c.id} #${s}: 정답 표시 "${ok.text}" ≠ 따로 푼 "${right[0].text}"\n${q.q}`);
    if (sv.form === 'num') assert.ok(sv.ans.n > 0, `${c.id} #${s}: 답 ${show(sv.ans)}`);
    types.add(`${c.id}:${sv.type}`);
  }
  assert.ok(types.size >= 18, `문제 종류 ${types.size}: ${[...types]}`);
});

test('★ 보기: 정답 하나, 글자 겹침 없음, 3개 이상, 빈 글자·undefined·NaN·남은 자리표시 없음 · ① 계산엔 그림 없음 · ② 그림은 소수 곱셈 그림만, 모두 그려진다', () => {
  let figs = 0;
  for (const { c, k, s, q } of every()) {
    const at = `${c.id} ${k} #${s}`;
    assert.ok(q.choices.length >= 3, `${at}: 보기 ${q.choices.length}`);
    assert.equal(q.choices.filter((x) => x.ok).length, 1, at);
    assert.equal(new Set(q.choices.map((x) => x.text)).size, q.choices.length, `${at}: 같은 글자 보기`);
    const all = allText(q);
    assert.ok(!/undefined|NaN|\{(me|mon)|null|Infinity/.test(all), `${at}: ${all}`);
    const ds = q.q.match(/\[[a-z]+ [^\]]+\]/g) || [];
    if (k === 'calc') assert.equal(ds.length, 0, `${at}: ① 계산에 그림 ${ds}`);
    for (const d of ds) {
      assert.match(d, /^\[dmul /, `${at}: 다른 그림 ${d}`);
      assert.ok(figureSvg(d.slice(1, -1)).startsWith('<svg'), `${at}: 못 그리는 ${d}`);
      figs++;
    }
  }
  assert.ok(figs > SEEDS / 2, `② 그림 ${figs}`);
});

test('★ 오개념 이름표: 그 오답이 정말 그 틀린 생각이다 — 문제 글의 수로 틀린 셈을 다시 한다 · 이름표 붙은 오답이 늘 둘 이상', () => {
  let n = 0; const used = new Set();
  for (const { c, s, q } of every(['calc'])) {
    const sv = solveText(q.q);
    const tagged = q.choices.filter((x) => !x.ok && x.tag !== '계산 실수');
    assert.ok(tagged.length >= 2, `${c.id} #${s}: 이름표 붙은 오답 ${tagged.length}\n${q.q}`);
    for (const w of tagged) { assert.ok(tagHolds(sv.f, w.tag, w.text), `${c.id} #${s} (${sv.type}): "${w.text}"의 이름표 "${w.tag}"가 뜻과 다르다\n${q.q}`); n++; used.add(w.tag); }
  }
  assert.ok(n > 16 * SEEDS, `본 이름표 ${n}`);
  assert.equal(used.size, Object.keys(TAGS).length, `안 쓰인 이름표: ${Object.values(TAGS).filter((t) => !used.has(t))}`);
});

test('★ 오답끼리 같은 값·같은 글이 되지 않는다 — 보기에서 겹쳐 빠지기 전(probe.allWrong) · 빠진 오답도 이름표의 뜻 그대로 · 정답과 같은 값 없음', () => {
  for (const { c, s, q } of every(['calc'])) {
    const sv = solveText(q.q);
    if (sv.form === 'pick') continue;
    const W = q.probe.allWrong;
    assert.equal(new Set(W.map((w) => w.text)).size, W.length, `${c.id} #${s}: 오답 글이 겹친다 ${W.map((w) => w.text)}`);
    for (const w of W) {
      assert.ok(!eq(val(w.text), sv.ans), `${c.id} #${s}: 오답 "${w.text}"이 맞는 값`);
      assert.ok(val(w.text).n > 0, `${c.id} #${s}: 오답 "${w.text}"이 0 이하`);
      assert.ok(tagHolds(sv.f, w.tag, w.text), `${c.id} #${s}: 빠진 오답 "${w.text}"도 "${w.tag}"의 뜻\n${q.q}`);
    }
    const vals = W.map((w) => show(val(w.text)));
    assert.equal(new Set(vals).size, vals.length, `${c.id} #${s}: 오답 값이 겹친다 ${vals}`);
  }
});

// 1.5 × 3 = 4.5 = 1.5 + 3 · 1.2 × 6 = 7.2 = 1.2 + 6 — 틀린 셈이 우연히 바른 값을 내는 수. 그 오답은 빼야 한다 (씨앗 300개 안에는 안 나와 변이 검사가 넓은 씨앗에서만 잡았다)
test('★ 틀린 셈이 우연히 바른 값을 내는 수(1.5 × 3 · 1.2 × 6)에서도 그 오답은 빠진다 — 씨앗을 넓혀 그런 문항을 찾아 본다', () => {
  let found = 0;
  for (let s = 1; s <= 6000 && found < 3; s++) {
    const q = makeQuestion('dmul.d1nat', 'calc', s, OPTS);
    const sv = solveText(q.q);
    const [A, B] = sv.f.ops.map(val);
    if (!eq(add(A, B), mul(A, B))) continue;
    found++;
    for (const w of q.probe.allWrong) assert.ok(!eq(val(w.text), sv.ans), `#${s} ${sv.f.ops.join(' × ')}: 오답 "${w.text}"[${w.tag}]이 바른 값`);
    assert.equal(q.choices.filter((x) => eq(val(x.text), sv.ans)).length, 1, `#${s}: 바른 값 보기가 둘`);
  }
  assert.ok(found >= 1, `우연히 같은 수가 나온 문항 ${found}`);
});

test('★ 수 보기 꼴: 끝자리 0을 지운 소수·자연수 ("0을 붙임" 오답만 0을 붙인 그대로) · 0으로 시작하는 자연수 없음', () => {
  let n = 0;
  for (const { c, s, q } of every(['calc'])) {
    if (solveText(q.q).form === 'pick') continue;
    for (const x of q.choices) {
      if (x.tag === TAGS.padZero) { assert.match(x.text, /^\d+\.\d*0$/, `${c.id} #${s}: "0을 붙임" 오답 "${x.text}"`); continue; }
      assert.match(x.text, /^(0|[1-9]\d*)(\.\d*[1-9])?$/, `${c.id} #${s}: 보기 꼴 "${x.text}"`);
      n++;
    }
  }
  assert.ok(n > 20 * SEEDS, `본 보기 ${n}`);
});

/** ② 문항 — 바른 값(문제 글에서 따로) · 보여 준 말 · 판정표용 식 */
function misreadFacts(q) {
  const B = bolds(q.q); const shown = B[B.length - 1] || '';
  let m;
  if ((m = /^(\d+) × (\S+)(?:은|는) (\d+)보다 커요$/.exec(shown))) return { shown, right: mul(Q(+m[1]), val(m[2])), base: Q(+m[3]), f: { ops: [m[1], m[2]] } };
  const left = shown.split(' = ')[0];
  return { shown, right: evalExpr(left), base: null, f: { ops: left.split(' × ') } };
}
test('★ ② 오개념 문항: 보여 준 말은 정말 틀렸다 · 고치는 말의 결론만 맞다 · 이름표 붙은 보기의 결론은 바른 값과 다르다 · 갈래 열쇠 둘씩 · 엉뚱한 지적은 거짓 단정', () => {
  const keys = {};
  for (const { c, s, q } of every(['misread'], Math.max(SEEDS, 600))) {
    (keys[c.id] = keys[c.id] || new Set()).add(q.key);
    const at = `${c.id} #${s} ${q.key}`;
    const { shown, right, base } = misreadFacts(q);
    assert.ok(right && right.n > 0, `${at}: 바른 값\n${q.q}`);
    if (base) assert.ok(cmpQ(right, base) < 0, `${at}: "커요"가 맞는 말이다 — ${show(right)} vs ${show(base)}`);
    else assert.ok(!eq(lastNum(shown), right), `${at}: 보여 준 말 "${shown}"의 결론이 맞는 값\n${q.q}`);
    const ok = q.choices.find((x) => x.ok);
    assert.ok(eq(lastNum(ok.text), right), `${at}: 고치는 말 "${ok.text}"의 결론 ≠ ${show(right)}`);
    for (const w of q.choices.filter((x) => !x.ok)) {
      if (w.tag === '엉뚱한 지적') { assert.match(w.text, /(없어요|아니에요)$/, `${at}: 엉뚱한 지적은 거짓 단정으로 "${w.text}"`); continue; }
      if (w.tag === '틀린 줄 모름') { assert.match(w.text, /^맞게 (계산했어요|말했어요)$/); continue; }
      assert.ok(!eq(lastNum(w.text), right), `${at}: 오개념 보기 "${w.text}"의 결론이 맞는 값`);
    }
    assert.ok(q.choices.some((x) => x.tag === '틀린 줄 모름'), `${at}: "맞게 계산했어요" 보기`);
  }
  for (const id of IDS) assert.equal(keys[id].size, 2, `${id}: ② 갈래 ${[...keys[id]]}`);
});

test('★ ② 이름표 붙은 보기도 그 틀린 셈 — 보기 글의 결론을 문제의 수로 다시 계산 (② 판정표) · 보여 준 틀린 답도 판정표의 어느 틀린 셈', () => {
  let n = 0;
  const allTags = Object.values(TAGS);
  for (const { c, s, q } of every(['misread'], Math.max(SEEDS, 600))) {
    const { shown, f, base } = misreadFacts(q);
    for (const w of q.choices.filter((x) => !x.ok && !['엉뚱한 지적', '틀린 줄 모름'].includes(x.tag))) {
      const tail = /(\d+\.\d+|\d+)$/.exec(w.text)[1];
      assert.ok(tagHolds(f, w.tag, tail), `${c.id} #${s}: ② 보기 "${w.text}"의 이름표 "${w.tag}"가 뜻과 다르다\n${q.q}`);
      n++;
    }
    if (!base) {
      const tail = /(\d+\.\d+|\d+)$/.exec(shown)[1];
      assert.ok(allTags.some((tg) => tagHolds(f, tg, tail)), `${c.id} #${s}: 보여 준 답 "${tail}"이 어느 틀린 셈에서도 안 나온다\n${q.q}`);
    }
  }
  assert.ok(n >= 8 * 600, `본 ② 이름표 ${n}`);
});

// ───────────────────── 글 ─────────────────────

const UNIT_JOSA = /(?<![가-힣a-z])(?:km|m|L|kg)(?:이에요|예요|이고|이면|이|가|은|는|을|를|와|과|으로|로)(?![가-힣])/;
const DIRECTIVES = /\[dmul [^\]]+\]/g;

test('★ 조사: 수 뒤는 읽는 소리(소수는 끝자리) · 단위 글자(km·m·L·kg) 바로 뒤에는 없음 · ASCII 빼기 없음', () => {
  const BAT = new Set(['0', '1', '3', '6', '7', '8']);
  const PAIRS = [['을', '를'], ['은', '는'], ['이', '가'], ['과', '와'], ['이에요', '예요'], ['이니까', '니까'], ['이라서', '라서']];
  let hitN = 0;
  for (const { c, k, s, q } of every()) {
    const all = allText(q).replace(/\*\*/g, '').replace(DIRECTIVES, '');
    for (const [wb, nb] of PAIRS) {
      for (const m of all.matchAll(new RegExp(`(?<![\\d/])(\\d+)(${wb}|${nb})(?=[\\s.,!?)—]|$)`, 'g'))) { assert.equal(m[2], BAT.has(m[1].slice(-1)) ? wb : nb, `${c.id} ${k} #${s}: "…${m[1]}${m[2]}"\n${all}`); hitN++; }
    }
    for (const m of all.matchAll(/(?<![\d/])(\d+)(으로|로)(?=[\s.,]|$)/g)) assert.equal(m[2], ['1', '7', '8'].includes(m[1].slice(-1)) ? '로' : BAT.has(m[1].slice(-1)) ? '으로' : '로', `${c.id} ${k} #${s}: "…${m[1]}${m[2]}"`);
    const up = UNIT_JOSA.exec(all);
    assert.ok(!up, `${c.id} ${k} #${s}: 단위 글자 바로 뒤 조사 "${up && up[0]}"\n${all}`);
    assert.ok(!/-\d|\d-/.test(all), `${c.id} ${k} #${s}: ASCII 빼기`);
  }
  assert.ok(hitN > SEEDS, `실제로 본 곳 ${hitN}`);
  for (const c of DMUL) {
    const t = [c.idea, c.rule, c.slip].join('\n').replace(/\*\*/g, '');
    const up = UNIT_JOSA.exec(t); assert.ok(!up, `${c.id} 설명: 단위 글자 바로 뒤 조사 "${up && up[0]}"`);
    assert.ok(!/[a-z]\/[a-z\d]|\d\/[a-z]/.test(t), `${c.id} 설명: 문자 분수`);
  }
});

test('★ 풀이 카드: 단계 · 기억할 것 · 오답마다 왜 · 정답이 단계에 나온다', () => {
  for (const { c, k, s, q } of every()) {
    const sv = q.solve;
    assert.ok(sv && sv.steps.length >= 2 && sv.rule, `${c.id} ${k} #${s}`);
    for (const w of q.choices.filter((x) => !x.ok)) assert.ok(sv.why[w.tag] || sv.whyAny, `${c.id} ${k} #${s}: "${w.tag}" 설명 없음`);
    const ok = q.choices.find((x) => x.ok).text;
    if (k === 'calc' && /^\d/.test(ok)) assert.ok(sv.steps.join(' ').includes(ok), `${c.id} #${s}: 정답 "${ok}"이 풀이에 없다\n${sv.steps.join('\n')}`);
  }
});

/** 글 속 "식 = 식 = …" — 소수·분수까지 계산기로 (② 보여 준 말·오답 보기는 빼고) */
function eqChains(text) {
  const out = [];
  // 연산 기호 바로 뒤에서는 식이 시작하지 않는다 · 소수점(.)도 식의 일부 — "2 × 0.9 = 1.8"을 "9 = 1"로 읽지 않게
  //   단 "."는 뒤에 숫자가 올 때만 — 문장 끝 마침표까지 이어 붙으면 "0.32. 0.1 × 0.1"을 못 읽고 그 비교를 건너뛴다 (변이 검사가 잡음)
  for (const m of String(text).matchAll(/(?<![+−×÷] |[\d/.])[\d(](?:[\d /()+−×÷=]|\.(?=\d))*[\d)]/g)) {
    const parts = m[0].split(' = ').map((x) => x.trim());
    if (parts.length < 2) continue;
    const vals = parts.map((p) => { try { return evalExpr(p); } catch { return null; } });
    for (let i = 1; i < vals.length; i++) if (vals[i - 1] && vals[i]) out.push({ a: parts[i - 1], b: parts[i], ok: eq(vals[i - 1], vals[i]) });
  }
  return out;
}
test('★ 글 속 셈식은 맞다 (소수·분수까지) — 문제·정답·풀이·왜 전부 · 칸 설명도', () => {
  let n = 0;
  for (const { c, k, s, q } of every()) {
    const all = [q.q.replace(/\*\*.+?\*\*/g, ''), q.choices.find((x) => x.ok).text, ...q.solve.steps, ...Object.values(q.solve.why), q.solve.whyAny].join('\n');
    for (const e of eqChains(all)) { assert.ok(e.ok, `${c.id} ${k} #${s}: ${e.a} = ${e.b}`); n++; }
  }
  assert.ok(n > 10 * SEEDS, `셈식 ${n}`);
  let m = 0;
  for (const c of DMUL) for (const e of eqChains(`${c.idea}\n${c.rule}`.replace(/\*\*/g, ''))) { assert.ok(e.ok, `${c.id} 설명: ${e.a} = ${e.b}`); m++; }
  assert.ok(m >= 20, `칸 설명 셈식 ${m}`);
});

test('🔁 쌍둥이·🤔 노트: 요청한 틀·갈래로 온다 · 같은 셈 · 쌍둥이 글이 원래 글과 같은 일은 드물다', () => {
  const same2 = {}; const tot = {};
  for (const c of DMUL) {
    for (let s = 1; s <= Math.min(Math.max(SEEDS, 150), 300); s++) {
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

/** 참이라고 내미는 글에 틀린 말 — 오답 보기·② 보여 준 말은 빼고, 굵게(**)는 떼고 */
const BAD = [
  [/곱하면 (?:늘|항상) 커져/, '1보다 작은 수를 곱하면 작아진다'],
  [/소수를 곱하면 (?:늘|항상) 작아져/, '1보다 큰 소수를 곱하면 커진다'],
  [/소수점(?:을|끼리)? (?:맞춰|맞추어) (?:곱|계산)/, '곱셈은 소수점을 맞추지 않는다(덧셈의 규칙)'],
  [/자리 수를 곱해/, '소수 자리 수는 더한다'],
  [/0을 붙이면 (?:돼|된다)/, '10을 곱할 때 0을 붙이는 것은 자연수에서만'],
  // Codex 38차 #2 — 0 × 0.6 = 0은 그대로다: 일반 규칙엔 "0보다 큰 수에"(또는 그 문제의 수 "6에")를 같은 줄 앞에
  // "0보다 큰 수에"는 같은 줄 앞 어디든("…에 1보다 큰 수를 곱하면 커지고, 1보다 작은 수를 곱하면") · 그 문제의 수(6에)는 바로 앞에만
  // (X 원고 변이 검사가 "7.2를 72로 … 1보다 작은 수로 나누면"을 — 수가 같은 줄 앞 어디든 있으면 지나가는 구멍을 — 잡아 W도 같이 좁힘)
  [/(?<!0보다 큰 수에 [^\n]*|\d에 )1보다 (?:작은|큰) 수를 곱하면/,'0에 곱하면 그대로 — "0보다 큰 수에 1보다 작은 수를 곱하면"'],
  [/(?<!0보다 크고 )1보다 작은 두 수(?:를 곱하면 곱은|의 곱은) 두 수보다/, '0이 끼면 두 수보다 작지 않다 — "0보다 크고 1보다 작은 두 수"'],
  // Codex 38차 #3 — 0.2 × 0.5 = 0.1: 끝자리 0을 지우면 "소수 두 자리 수"가 아니다 → "소수점을 두 자리에 찍어요"
  [/수끼리 곱하면 소수 (?:한|두|세) 자리 수(?:예요|가 돼)|분모가 10+인 분수는 소수 (?:한|두|세) 자리 수/, '끝자리 0을 지우면 자리 수가 줄어든다 — "소수점을 두 자리에 찍어요"'],
  // Codex 38차 #4 — 4500의 0은 지우면 안 된다: 지워도 되는 것은 "소수 부분의" 끝자리 0
  [/(?<!소수 부분의 )끝자리(?:에)? 0(?:이 생기면|은 지워)/, '자연수의 0은 지우면 안 된다 — "소수 부분의 끝자리 0"'],
  // Codex 38차 #5 — 따로 곱해 더하는 것(1 × 5 + 0.27 × 5)은 맞는 방법이다: 잘못은 두 곱을 이어 쓰는 것
  [/자연수 부분과 소수 부분을 따로 곱하(?:면 안|지 않|지 말)/, '따로 곱해 더하는 것은 맞다 — 잘못은 이어 쓰는 것'],
];
test('★ 참말에 틀린 말이 없다 — 곱하면 늘 커진다 · 소수를 곱하면 늘 작아진다 · 소수점을 맞춰 곱한다 · 자리 수를 곱한다', () => {
  const truths = (q) => [q.choices.find((x) => x.ok).text, ...(q.solve ? [...q.solve.steps, ...Object.values(q.solve.why), q.solve.whyAny, q.solve.rule] : [])].join('\n').replace(/\*\*/g, '');
  for (const { c, k, s, q } of every()) {
    const t = truths(q);
    for (const [re, why] of BAD) assert.ok(!re.test(t), `${c.id} ${k} #${s}: ${why}\n${t}`);
  }
  for (const c of DMUL) for (const [re, why] of BAD) assert.ok(!re.test([c.idea, c.rule, c.slip].join('\n').replace(/\*\*/g, '')), `${c.id}: ${why}`);
});

test('🔢 숫자판: 수가 답인 ①은 모두 숫자판 · 모든 수 보기를 쳐서 그 보기로 간다 · 끝자리 0을 붙여 쳐도 맞음 · 빠진 오답 후보는 그 이름표 · 고르기는 보기 그대로 · ± 없음', () => {
  const pv = readFileSync(new URL('../js/padview.js', import.meta.url), 'utf8');
  const MAX = +/const MAX = (\d+);/.exec(pv)[1];
  let n = 0; let dropped = 0; let picks = 0;
  for (const { c, s, q } of every(['calc'], 200)) {
    const spec = padSpec(q, 'decmul');
    if (solveText(q.q).form === 'pick') { assert.equal(spec, null, `${c.id} #${s}: 고르는 문제에 숫자판`); picks++; continue; }
    assert.ok(spec, `${c.id} #${s}: 숫자판이 없다\n${q.q}`);
    assert.equal(spec.need, null, `${c.id} #${s}: 꼴을 묻지 않는다 — ${spec.need}`);
    assert.equal(spec.signed, false, `${c.id} #${s}: ± 없음`);
    for (const ch of q.choices) {
      assert.ok(String(ch.text).length <= MAX, `${c.id} #${s}: "${ch.text}"`);
      const t = partsOf(ch.text);
      assert.ok(t && spec.modes.includes(t.mode), `${c.id} #${s}: "${ch.text}"를 칸으로 못 나눔`);
      const hit = matchTyped(q, readTyped(t.mode, t.p, spec), spec);
      assert.equal(q.choices[hit.i], ch, `${c.id} #${s}: "${ch.text}"를 쳐도 그 보기로 안 간다`);
      n++;
    }
    // 끝자리 0을 지우지 않은 답 — 지도서 채점 기준 "생략하지 않은 경우도 정답"
    const ok = q.choices.find((x) => x.ok);
    const padded = ok.text.includes('.') ? `${ok.text}0` : `${ok.text}.0`;
    const hit0 = matchTyped(q, readTyped('num', { sign: '', x: padded }, spec), spec);
    assert.ok(q.choices[hit0.i] && q.choices[hit0.i].ok, `${c.id} #${s}: ${padded}이 틀림`);
    // 화면에서 빠진 오개념 후보를 쳐도 그 이름표로 (Codex 36차 #3)
    for (const w of q.probe.allWrong) {
      if (q.choices.some((x) => x.text === w.text)) continue;
      const t = partsOf(w.text); const hit = matchTyped(q, readTyped(t.mode, t.p, spec), spec);
      if (q.choices[hit.i]) continue; // 같은 값의 다른 보기가 화면에 있다
      assert.equal(hit.known && hit.known.tag, w.tag, `${c.id} #${s}: 빠진 후보 "${w.text}"[${w.tag}]`);
      dropped++;
    }
  }
  assert.ok(n > 1000, `쳐 본 보기 ${n}`);
  assert.ok(dropped > 0 && picks > 0, `빠진 후보 ${dropped} · 고르기 ${picks}`);
});

// ───────────────────── 그림 ─────────────────────

const attrsOf = (svg, cls) => [...svg.matchAll(new RegExp(`<(?:rect|path|text|line) class="${cls}"([^>]*)>`, 'g'))].map((m) => {
  const o = {}; for (const a of m[1].matchAll(/([a-z-]+)="([^"]*)"/g)) o[a[1]] = a[2]; return o;
});
test('🎨 소수 곱셈 그림 [dmul]: 0.1 막대 칸 = 지시문 · 띠 모델 묶음·칠한 칸 · 넓이 모델 진한 칸 = 두 수의 곱 · 폭 400 · 글로 바꾸기 · 못 그리는 지시문은 빈 그림', () => {
  for (const [a, k] of [[7, 3], [3, 5], [9, 2], [1, 4]]) {
    const svg = figureSvg(`dmul rep 0.${a} ${k}`); const C = attrsOf(svg, 'dm-c');
    assert.equal(C.length, 10 * k, `rep 0.${a} ${k}: 칸`);
    assert.equal(C.filter((x) => x['data-on'] === '1').length, a * k, `rep 0.${a} ${k}: 칠한 칸`);
    for (let r = 0; r < k; r++) assert.equal(C.filter((x) => x['data-r'] === String(r) && x['data-on'] === '1').length, a, `막대 ${r}`);
    assert.deepEqual([...svg.matchAll(/class="dm-l"[^>]*>([^<]+)</g)].map((m) => m[1]), Array(k).fill(`0.${a}`));
  }
  for (const [N, a] of [[2, 9], [3, 4], [1, 7], [4, 5]]) {
    const svg = figureSvg(`dmul band ${N} 0.${a}`); const C = attrsOf(svg, 'dm-c');
    assert.equal(C.length, 10 * N, `band ${N} 0.${a}: 칸 (한 칸 0.1)`);
    const on = C.filter((x) => x['data-on'] === '1');
    assert.equal(on.length, a * N, `band ${N} 0.${a}: 칠한 칸 = ${N} × 0.${a}의 0.1 개수`);
    assert.equal(new Set(C.map((x) => x['data-g'])).size, 10, '10묶음');
    assert.equal(new Set(on.map((x) => x['data-g'])).size, a, `${a}묶음을 칠함`);
    assert.deepEqual([...svg.matchAll(/class="dm-t"[^>]*>([^<]+)</g)].map((m) => m[1]), Array.from({ length: N + 1 }, (_, i) => String(i)), '눈금 0 … N');
    assert.match(svg, new RegExp(`class="dm-a"[^>]*>0\\.${a}배<`));
  }
  for (const [a, b] of [[4, 8], [3, 3], [9, 1], [5, 6]]) {
    const svg = figureSvg(`dmul area 0.${a} 0.${b}`); const C = attrsOf(svg, 'dm-c');
    assert.equal(C.length, 100, '1 m²를 100칸으로 (한 칸 0.01)');
    const dark = C.filter((x) => x['data-on'] === '1');
    assert.equal(dark.length, a * b, `area 0.${a} 0.${b}: 진한 칸`);
    for (const x of dark) assert.ok(+x['data-x'] < a && +x['data-y'] < b && !x['fill-opacity'], '진한 칸은 가로 a칸·세로 b칸이 겹친 곳, 진하게');
    const light = C.filter((x) => x['data-on'] === '0' && x['fill-opacity']);
    assert.equal(light.length, 10 * a + 10 * b - 2 * a * b, '한 번만 칠한 칸은 옅게');
  }
  for (const s of ['dmul rep 0.7 3', 'dmul band 2 0.9', 'dmul area 0.4 0.8']) assert.ok(+/viewBox="0 0 (\d+)/.exec(figureSvg(s))[1] <= 400, s);
  for (const bad of ['dmul rep 1.2 3', 'dmul rep 0.25 3', 'dmul rep 0.7 1', 'dmul rep 0.7 6', 'dmul band 5 0.9', 'dmul band 2 1.5', 'dmul area 0.40 0.8', 'dmul area 0 0.5', 'dmul area 0.4', 'dmul x 0.4 0.8']) assert.equal(figureSvg(bad), '', bad);
  assert.match(figText('앞 [dmul area 0.4 0.8] 뒤'), /^앞 \(넓이 그림: .+두 번 칠한 칸 32개\) 뒤$/);
  assert.match(figText('[dmul rep 0.7 3]'), /0\.1이 21개/);
  assert.match(figText('[dmul band 2 0.9]'), /18칸/);
  assert.equal(figText('앞 [dmul band 2 0.9] 뒤', true), '앞 (소수 곱셈 그림) 뒤');
  assert.ok(renderFigures('[dmul area 0.4 0.8]').startsWith('<svg'));
});

test('🎨 ② 그림은 문제의 식 그대로 — [dmul band N 0.a]는 "N × 0.a" · [dmul area 0.a 0.b]는 "0.a × 0.b"', () => {
  const seen = { band: 0, area: 0 };
  for (const { c, s, q } of every(['misread'], Math.max(SEEDS, 600))) {
    const m = /\[dmul (band|area) (\S+) (\S+)\]/.exec(q.q);
    if (!m) continue;
    const lhs = misreadFacts(q).shown.split(' = ')[0];
    assert.equal(lhs, `${m[2]} × ${m[3]}`, `${c.id} #${s}: 그림 ${m[0]} ≠ 식 ${lhs}`);
    assert.ok(!renderFigures(q.q).includes('[dmul '), `${c.id} #${s}: renderFigures가 그림을 못 바꿈`);
    seen[m[1]]++;
  }
  assert.ok(seen.band > 50 && seen.area > 50, `본 그림 ${JSON.stringify(seen)}`);
});

// ───────────────────── 사다리·진단·칸마다 수의 꼴 ─────────────────────

test('📏 진단·사다리·한 편·배움 예비·내용 검사', () => {
  const d = diagnosticSet(7, 5, OPTS);
  assert.equal(d.length, 5);
  assert.ok(d.every((q) => IDS.includes(q.concept)));
  assert.deepEqual(d.map((q) => IDS.indexOf(q.concept)), [...d.map((q) => IDS.indexOf(q.concept))].sort((a, b) => a - b), '사다리 순서대로');
  const pl = placeFrom(d.map((q, i) => ({ concept: q.concept, correct: i < 2 })));
  assert.ok(IDS.includes(pl.startId) && pl.knownIds.every((id) => IDS.indexOf(id) < IDS.indexOf(pl.startId)));
  const L0 = ladder([]);
  assert.equal(L0[0].state, 'now');
  assert.ok(L0.slice(1).every((r) => r.state === 'locked'));
  for (const c of DMUL) {
    const round = makeRound(c.id, 11, OPTS);
    assert.ok(round.length >= 2 && round.every((q) => q.concept === c.id), c.id);
    const les = lessonOf(c.id, 3, OPTS);
    assert.ok(les.pages.length >= 1 && les.title === c.name);
  }
  assert.ok(checkContent({}).length >= 8, '빈 원고는 칸마다 걸린다');
});

test('칸마다 수의 꼴 — W1 소수 한 자리 × 자연수 · W2 두 자리 × 자연수 · W3 자연수 × 한 자리 · W4 자연수 × 두 자리 · W5 한 자리 × 한 자리 · W6 두 자리와 한 자리 · W7 10배·1/10배·자리 수의 합', () => {
  const shapes = {};
  for (let s = 1; s <= SEEDS; s++) {
    const P = (id) => { const sv = solveText(makeQuestion(id, 'calc', s, OPTS).q); return { sv, D: sv.f.ops ? sv.f.ops.map(dec) : null }; };
    { const { D } = P('dmul.d1nat'); assert.ok(D[0].p === 1 && D[1].p === 0 && D[1].u >= 2 && D[1].u <= 9, `W1 #${s}`); shapes[`W1:${D[0].w >= 1}`] = 1; }
    { const { D } = P('dmul.d2nat'); assert.ok(D[0].p === 2 && D[1].p === 0, `W2 #${s}`); shapes[`W2:${D[0].w >= 1}`] = 1; }
    { const { D } = P('dmul.natd1'); assert.ok(D[0].p === 0 && D[1].p === 1, `W3 #${s}`); shapes[`W3:${D[1].w >= 1}`] = 1; }
    { const { D } = P('dmul.natd2'); assert.ok(D[0].p === 0 && D[1].p === 2, `W4 #${s}`); shapes[`W4:${D[0].u > 9}`] = 1; }
    { const { D } = P('dmul.d1d1'); assert.ok(D[0].p === 1 && D[1].p === 1, `W5 #${s}`); shapes[`W5:${D[0].w >= 1}${D[1].w >= 1}`] = 1; }
    { const { D } = P('dmul.d2d1'); assert.deepEqual(D.map((x) => x.p).sort(), [1, 2], `W6 #${s}`); shapes[`W6:${D[0].p}`] = 1; }
    { const { sv, D } = P('dmul.point'); shapes[`W7:${sv.type === 'sum' ? 'sum' : /^10+$/.test(D[1].text) ? 'up' : /^0\.0*1$/.test(D[1].text) ? 'down' : 'other'}`] = 1; }
  }
  for (const k of ['W1:true', 'W1:false', 'W2:true', 'W2:false', 'W3:true', 'W3:false', 'W4:true', 'W4:false', 'W5:falsefalse', 'W5:truefalse', 'W5:truetrue', 'W6:1', 'W6:2', 'W7:up', 'W7:down', 'W7:sum']) assert.ok(shapes[k], `나와야 하는 꼴 ${k}`);
  assert.ok(!shapes['W7:other'], 'W7은 10배·1/10배·자리 수의 합만');
});

// ───────────────────── 2단계: 원고 (coach/math/decmul.json) ─────────────────────

const CONTENT = JSON.parse(readFileSync(new URL('../coach/math/decmul.json', import.meta.url), 'utf8'));
const CAST = { me: '진우', mon: '피카츄', mon2: '리자몽' };
const fillC = (t) => String(t).replace(/\{(me|mon|mon2)(?:\/([^/}]+)\/([^}]+))?\}/g, (_, k, a, b) => {
  const n = CAST[k]; if (a === undefined) return n;
  const code = n.slice(-1).charCodeAt(0) - 0xac00; return n + (code >= 0 && code % 28 !== 0 ? a : b);
});
/** 원고 한 칸의 글 전부 (배움·확인 질문·보기·까닭·규칙·아빠 카드) */
const contentText = (v) => fillC([...v.lesson.flatMap((p) => [p.say, ...(p.check ? [p.check.q, p.check.ok, ...p.check.no, p.check.why] : [])]), v.rule, v.dad.goal, ...v.dad.say, v.dad.do, v.dad.pass, ...v.dad.traps.flatMap((t) => [t.kid, t.dad])].join('\n'));
/** 참이라고 내미는 글 — 배움 글·확인의 정답·까닭·규칙·아빠 카드 (오답 보기·아이 말(함정 kid)은 빼고) */
const truthText = (v) => fillC([...v.lesson.flatMap((p) => [p.say, ...(p.check ? [p.check.ok, p.check.why] : [])]), v.rule, v.dad.goal, ...v.dad.say, v.dad.do, v.dad.pass, ...v.dad.traps.map((t) => t.dad)].join('\n'));
/** 글 블록마다 (줄 규칙·셈식용) — 아이 말·오답 보기는 틀린 셈이라 빼고 */
const blocksOf = (v) => [...v.lesson.flatMap((p) => [p.say, ...(p.check ? [p.check.why] : [])]), v.rule, v.dad.goal, ...v.dad.say, v.dad.do, v.dad.pass, ...v.dad.traps.map((t) => t.dad)].map(fillC);
/** 원고에만 있는 이야기 틀 (생성기 틀은 solveText가 읽는다) */
const CONTENT_STORY = [
  [/하루에 우유를 (\S+) L씩 마셔요\. (\d+)일 동안/, 'milk'],
];
function solveContent(q) {
  const sv = solveText(q);
  if (sv.type !== 'unknown') return sv;
  for (const [re, type] of CONTENT_STORY) {
    const m = re.exec(q);
    if (m) return { type, form: 'num', ans: mul(val(m[1]), val(m[2])), f: { ops: [m[1], m[2]] } };
  }
  return sv;
}
/** 원고 확인 질문 하나씩 — { id, i, at, p, sv(따로 읽은 문제) } */
function* checksOf() {
  for (const id of IDS) for (const [i, p] of CONTENT[id].lesson.entries()) yield { id, i, at: `${id}[${i}]`, p, sv: solveContent(fillC(p.check.q)) };
}
const reEsc = (s) => String(s).replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
/** 글에 그 수(또는 식)가 낱개로 있는가 — "24"가 "0.24"·"240" 속에서, "2.1"이 "2.10" 속에서 잡히지 않게 (U 2단계 + 소수점) */
const hasNum = (text, w) => new RegExp(`(?<![\\d/.])(?<!\\d )${reEsc(w)}(?![\\d/]|\\.\\d)`).test(text);

test('원고(decmul.json)가 형식 검사를 통과한다 — 8칸이 사다리 순서대로 · 배움 4~5장·장마다 확인 질문·아빠 카드(말 2개↑·함정 2개↑·통과 기준)', () => {
  assert.deepEqual(checkContent(CONTENT), []);
  assert.deepEqual(Object.keys(CONTENT).filter((k) => k !== '_'), IDS);
  for (const id of IDS) {
    const v = CONTENT[id];
    assert.ok(v.lesson.length >= 4 && v.lesson.length <= 5, `${id}: 배움 ${v.lesson.length}장`);
    assert.ok(v.lesson.every((p) => p.check && p.check.no.length === 2), `${id}: 장마다 확인 질문(오답 둘)`);
    assert.ok(v.dad.say.length >= 2 && v.dad.traps.length >= 2 && v.dad.pass, `${id}: 아빠 카드`);
    assert.ok(!/\{/.test([v.dad.goal, ...v.dad.say, v.dad.do, v.dad.pass, ...v.dad.traps.flatMap((t) => [t.kid, t.dad])].join(' ')), `${id}: 아빠 카드에 자리표시`);
  }
  const L = lessonOf('dmul.d2d1', 3, { ...OPTS, content: CONTENT });
  assert.equal(L.pages.length, CONTENT['dmul.d2d1'].lesson.length);
  assert.ok(L.pages.every((p) => p.check && p.check.ok));
  assert.equal(L.rule, CONTENT['dmul.d2d1'].rule);
});

test('★ 원고 확인 질문도 따로 풀어 대조 — 전부 읽히고, 맞는 보기는 정답 하나뿐(값으로 · 고르기는 그 판정으로), 오답 하나하나가 이름표 있는 틀린 셈(어느 수가 앞인지까지) · 오답끼리 값이 다르다 · 까닭은 정답·오답을 낱개 수로 다 말한다', () => {
  const allTags = Object.values(TAGS);
  let n = 0; const types = new Set(); const used = new Set();
  for (const { at, p, sv } of checksOf()) {
    const q = fillC(p.check.q); const why = fillC(p.check.why);
    assert.notEqual(sv.type, 'unknown', `${at}: 못 읽는 확인 질문\n${q}`);
    types.add(sv.type);
    const chs = [{ text: p.check.ok, ok: true }, ...p.check.no.map((t) => ({ text: t, ok: false }))];
    const right = sv.form === 'pick' ? chs.filter((x) => sv.ok(x.text)) : chs.filter((x) => eq(val(x.text), sv.ans));
    assert.ok(right.length === 1 && right[0].ok, `${at} (${sv.type}): 맞는 보기 ${right.map((x) => x.text).join(', ') || '없음'} — 따로 푼 답 ${sv.ans ? show(sv.ans) : '(고르기)'}\n${q}`);
    if (sv.form === 'num') assert.ok(sv.ans.n > 0, `${at}: 답 ${show(sv.ans)}`);
    for (const w of p.check.no) {
      if (sv.form === 'num') assert.ok(val(w) && val(w).n > 0, `${at}: 오답 "${w}"이 수가 아니거나 0 이하`);
      const tags = allTags.filter((tg) => tagHolds(sv.f, tg, w));
      assert.ok(tags.length, `${at} (${sv.type}): 오답 "${w}" — 어느 틀린 셈에서도 안 나온다\n${q}`);
      tags.forEach((tg) => used.add(tg));
      assert.ok(hasNum(why, w), `${at}: 까닭에 오답 "${w}" 이야기가 없다`);
      n++;
    }
    const vals = p.check.no.map((w) => (sv.form === 'pick' ? w : show(val(w))));
    assert.equal(new Set(vals).size, vals.length, `${at}: 오답끼리 값이 같다 ${p.check.no}`);
    assert.ok(hasNum(why, p.check.ok), `${at}: 까닭에 정답 "${p.check.ok}"이 없다`);
  }
  assert.ok(n >= 60, `본 오답 ${n}`);
  assert.ok(types.size >= 12, `확인 질문 종류 ${types.size}: ${[...types]}`);
  assert.equal(used.size, allTags.length, `원고 오답이 안 쓴 틀린 셈: ${allTags.filter((t) => !used.has(t))}`);
});

// 칸마다 그 칸의 셈 — 소수 자리 수와 어느 수가 앞인지 (설계 ④ 한 자리/두 자리로 나눔)
const SHAPE = {
  'dmul.d1nat': ([A, B]) => A.p === 1 && B.p === 0,
  'dmul.d2nat': ([A, B]) => A.p === 2 && B.p === 0,
  'dmul.natd1': ([A, B]) => A.p === 0 && B.p === 1,
  'dmul.natd2': ([A, B]) => A.p === 0 && B.p === 2,
  'dmul.d1d1': ([A, B]) => A.p === 1 && B.p === 1,
  'dmul.d2d1': ([A, B]) => [A.p, B.p].sort().join() === '1,2',
  'dmul.point': ([, B], sv) => sv.type === 'sum' || /^10+$/.test(B.text) || /^0\.0*1$/.test(B.text),
};
test('★ 원고 보기 꼴 — 칸마다 그 칸의 셈(소수 자리 수·어느 수가 앞인지) · 고르기는 W3·W8에서만 · 보기는 끝자리 0을 지운 꼴("0을 붙임" 오답만 그대로)', () => {
  let n = 0; let picks = 0;
  for (const { id, at, p, sv } of checksOf()) {
    if (sv.form === 'pick') {
      assert.ok(['dmul.natd1', 'dmul.apply'].includes(id), `${at}: 고르는 확인 질문`);
      for (const t of [p.check.ok, ...p.check.no]) { const m = /^(\d+) × (\d+\.\d+)$/.exec(t); assert.ok(m && +m[1] === sv.f.N, `${at}: 고르기 보기 "${t}"`); }
      picks++;
      continue;
    }
    const D2 = sv.f.ops.map(dec);
    if (SHAPE[id]) assert.ok(SHAPE[id](D2, sv), `${at}: 이 칸의 셈이 아니다 (${sv.f.ops.join(' × ')})`);
    for (const [k, t] of [p.check.ok, ...p.check.no].entries()) {
      if (k > 0 && tagHolds(sv.f, TAGS.padZero, t)) { assert.match(t, /^\d+\.\d*0$/, `${at}: "0을 붙임" 오답 "${t}"`); continue; }
      assert.match(t, /^(0|[1-9]\d*)(\.\d*[1-9])?$/, `${at}: 보기 꼴 "${t}"`);
      n++;
    }
  }
  assert.ok(n >= 80 && picks >= 2, `본 보기 ${n} · 고르기 ${picks}`);
});

test('★ 원고의 셈식 — "= …"로 내려 쓴 줄까지 이어서 전부 맞다 (소수·분수까지) · 한 줄에 "="는 둘까지 (폰에서 식 한가운데가 끊기지 않게)', () => {
  let n = 0;
  for (const id of IDS) {
    for (const b of blocksOf(CONTENT[id])) {
      const t = b.replace(DIRECTIVES, '').replace(/\*\*/g, '');
      for (const line of t.split('\n')) assert.ok((line.match(/ = /g) || []).length <= 2, `${id}: 한 줄에 = 셋 이상 "${line}"`);
      for (const e of eqChains(t.replace(/\n= /g, ' = '))) { assert.ok(e.ok, `${id}: ${e.a} = ${e.b}`); n++; }
    }
  }
  assert.ok(n >= 150, `본 셈식 ${n}`);
});

test('★ 원고 아빠 카드: 통과 기준의 식과 괄호 속 답이 맞다 (이야기면 그 문제를 따로 읽어 푼다)', () => {
  let pass = 0;
  for (const id of IDS) {
    const ps = fillC(CONTENT[id].dad.pass);
    const ans = (/\(([^)]+)\)/.exec(ps) || [])[1];
    assert.ok(ans, `${id}: 통과 기준에 괄호 속 답이 없다 "${ps}"`);
    const want = ans.split(' · ').map((x) => val(x.replace(/ ?(?:km|m²|m|L|kg|원)$/, '')));
    const story = /^"(.+?)"/.exec(ps);
    const got = story ? [solveContent(story[1]).ans] : ps.split(' — ')[0].split(', ').map(evalExpr);
    assert.equal(got.length, want.length, `${id}: 통과 기준의 식 ${got.length}개 · 답 ${want.length}개 "${ps}"`);
    got.forEach((g, k) => assert.ok(g && want[k] && eq(g, want[k]), `${id}: 통과 기준 ${k + 1}번 답 ${ans.split(' · ')[k]} ≠ ${show(g)}`));
    pass++;
  }
  assert.equal(pass, IDS.length);
});

test('🎨 원고의 그림: 모두 그려진다 (소수 곱셈 그림만) · 확인 질문엔 그림 없음 · 그림이 있는 장은 글에 같은 식 — [dmul rep 0.7 3]은 "0.7 × 3" · band N 0.a는 "N × 0.a" · area 0.a 0.b는 "0.a × 0.b" · 그림이 센 칸 수도 글에', () => {
  let n = 0;
  for (const id of IDS) {
    CONTENT[id].lesson.forEach((p, i) => {
      const at = `${id}[${i}]`;
      assert.ok(!/\[[a-z]+ [^\]]+\]/.test(p.check.q), `${at}: 확인 질문에 그림 (답을 흘린다)`);
      const plain = p.say.replace(/\[[^\]]+\]/g, '').replace(/\*\*/g, '');
      for (const m of p.say.matchAll(/\[([a-z]+) ([^\]]+)\]/g)) {
        assert.equal(m[1], 'dmul', `${at}: 그림 ${m[0]}`);
        const sp = figureSvg(`dmul ${m[2]}`);
        assert.ok(sp.startsWith('<svg'), `${at}: 못 그리는 ${m[0]}`);
        const [, x, y] = m[2].split(' ');
        assert.ok(hasNum(plain, `${x} × ${y}`), `${at}: 그림 ${m[0]}인데 글에 "${x} × ${y}"이 없다`);
        const cells = attrsOf(sp, 'dm-c').filter((c) => c['data-on'] === '1').length;
        assert.ok(hasNum(plain, String(cells)), `${at}: 그림 ${m[0]}이 칠한 칸 ${cells}개가 글에 없다`);
        n++;
      }
    });
  }
  assert.ok(n >= 3, `원고 그림 ${n}`);
});

const FRAC_JOSA = /\/(?:\d+)(?:이에요|예요|이라서|라서|이니까|니까|이고|이면|이|가|은|는|을|를|와|과|도|으로|로|의|에)/;
// 아직 안 배운 말 — "자리 수를 더"는 W5(소수 × 소수)부터, "소수 세 자리"는 W6부터
const FIRST = [[/자리 수를 더/, 'dmul.d1d1'], [/소수 세 자리/, 'dmul.d2d1']];
test('★ 원고의 조사·아직 안 배운 말·틀린 말 (배움 글·확인 질문·아빠 카드 전부) — 수 뒤는 읽는 소리(소수는 끝자리) · 단위 글자·분수 바로 뒤 조사 없음 · "자리 수를 더"는 W5부터, "소수 세 자리"는 W6부터 (생성기 글도)', () => {
  const BAT = new Set(['0', '1', '3', '6', '7', '8']);
  const PAIRS = [['을', '를'], ['은', '는'], ['이', '가'], ['과', '와'], ['이에요', '예요'], ['이니까', '니까'], ['이라서', '라서']];
  const idx = (id) => IDS.indexOf(id);
  let hitN = 0;
  for (const id of IDS) {
    const all = contentText(CONTENT[id]).replace(/\*\*/g, '').replace(DIRECTIVES, '');
    for (const [wb, nb] of PAIRS) {
      for (const m of all.matchAll(new RegExp(`(?<![\\d/])(\\d+)(${wb}|${nb})(?=[\\s.,!?)—"]|$)`, 'g'))) { assert.equal(m[2], BAT.has(m[1].slice(-1)) ? wb : nb, `${id}: "…${m[1]}${m[2]}"`); hitN++; }
    }
    for (const m of all.matchAll(/(?<![\d/])(\d+)(으로|로)(?=[\s.,"]|$)/g)) { assert.equal(m[2], ['1', '7', '8'].includes(m[1].slice(-1)) ? '로' : BAT.has(m[1].slice(-1)) ? '으로' : '로', `${id}: "…${m[1]}${m[2]}"`); hitN++; }
    const fp = FRAC_JOSA.exec(all); assert.ok(!fp, `${id}: 분수 바로 뒤 조사 "${fp && fp[0]}"`);
    const up = UNIT_JOSA.exec(all); assert.ok(!up, `${id}: 단위 글자 바로 뒤 조사 "${up && up[0]}"`);
    assert.ok(!/-\d|\d-/.test(all), `${id}: ASCII 빼기`);
    assert.ok(!/[a-z]\/[a-z\d]|\d\/[a-z]/.test(all), `${id}: 문자 분수`);
    for (const [re, at] of FIRST) if (idx(at) > idx(id)) assert.ok(!re.test(all), `${id}: 아직 안 배운 ${re}`);
    const truth = truthText(CONTENT[id]).replace(/\*\*/g, '');
    for (const [re, why] of BAD) assert.ok(!re.test(truth), `${id}: ${why}`);
  }
  assert.ok(hitN >= 80, `실제로 본 조사 ${hitN}`);
  // 생성기 글에도 같은 차례 (칸 설명 + 문항)
  for (const c of DMUL) for (const [re, at] of FIRST) if (idx(at) > idx(c.id)) assert.ok(!re.test([c.name, c.idea, c.rule, c.slip].join(' ')), `${c.id} 설명: 아직 안 배운 ${re}`);
  for (const { c, k, s, q } of every(['calc', 'misread'], 100)) for (const [re, at] of FIRST) if (idx(at) > idx(c.id)) assert.ok(!re.test(allText(q)), `${c.id} ${k} #${s}: 아직 안 배운 ${re}`);
});

test('원고는 배포 파일 검사(check.mjs)에도 걸린다 — decmul.json → mathdmul.js의 checkContent', () => {
  const src = readFileSync(new URL('../tools/check.mjs', import.meta.url), 'utf8');
  assert.ok(src.includes("'coach/math/decmul.json': '../js/mathdmul.js'"));
});

// Codex 38차 #3 — 0.2 × 0.5 = 0.1(W5 씨앗 3)에서 풀이가 "소수 두 자리 — 0.1", 힌트가 "곱을 소수 한 자리로 쓰지 않았는지 봐요"로 정답의 꼴을 나무랐다
test('★ 끝자리 0을 지운 답의 풀이: 소수점을 먼저 찍은 꼴(0.10)을 보이고 지운다 · 힌트가 정답의 꼴을 나무라지 않는다 (W5 씨앗 3: 0.2 × 0.5 = 0.1)', () => {
  const q3 = makeQuestion('dmul.d1d1', 'calc', 3, OPTS);
  assert.equal(solveText(q3.q).f.ops.join(' × '), '0.2 × 0.5', '씨앗 3의 문제');
  assert.equal(q3.choices.find((c) => c.ok).text, '0.1');
  assert.ok(q3.solve.steps.some((s) => /0\.10 = 0\.1(?!\d)/.test(s)), q3.solve.steps.join(' | '));
  assert.ok(!/소수 한 자리로 (?:쓰지|썼)/.test(q3.solve.whyAny), q3.solve.whyAny);
  // 자리 수를 말하는 풀이(W5·W6·W8 넓이·몇 배)는 끝자리 0이 지워지면 찍은 꼴 = 지운 꼴을 단계에 보인다
  const placedOf = (u, p) => { const t = String(u).padStart(p + 1, '0'); return `${t.slice(0, -p)}.${t.slice(-p)}`; };
  let n = 0;
  for (const id of ['dmul.d1d1', 'dmul.d2d1', 'dmul.apply']) {
    for (let s = 1; s <= SEEDS; s++) {
      const q = makeQuestion(id, 'calc', s, OPTS);
      const sv = solveText(q.q);
      if (sv.form !== 'num' || sv.type === 'price') continue;
      const [A, B] = sv.f.ops.map(dec);
      if (!A.p || !B.p) continue;
      const P = A.p + B.p; const U = A.u * B.u; const ok = q.choices.find((c) => c.ok).text;
      if (U % 10 !== 0) continue; // 끝자리 0이 안 생기는 곱
      assert.ok(q.solve.steps.some((st) => st.includes(`${placedOf(U, P)} = ${ok}`)), `${id} #${s}: ${sv.f.ops.join(' × ')} — 찍은 꼴 ${placedOf(U, P)}이 풀이에 없다\n${q.solve.steps.join(' | ')}`);
      n++;
    }
  }
  assert.ok(n >= SEEDS / 10, `끝자리 0이 지워지는 문항 ${n}`);
});

// 헤드리스가 잡음(3단계): "2 m 리본의 0.3배"(2 × 0.3) 풀이 카드가 "0.3 × 2는 0.3을 2번 더한 거예요"로 순서를 뒤집어 말했다 — W1과 W3가 같은 설명 함수를 썼다
test('★ 풀이 글(왜 틀렸나)은 문제의 곱셈 순서 그대로 — W1·W2 (소수) × (자연수)는 소수가 앞, W3·W4 (자연수) × (소수)는 자연수가 앞', () => {
  let n = 0;
  for (const id of ['dmul.d1nat', 'dmul.d2nat', 'dmul.natd1', 'dmul.natd2']) {
    for (let s = 1; s <= SEEDS; s++) {
      const q = makeQuestion(id, 'calc', s, OPTS);
      const [A, B] = solveText(q.q).f.ops.map(dec);
      const decFirst = A.p > 0; const x = decFirst ? A : B; const N = decFirst ? B : A;
      // 뒤집은 순서의 식 — 소수 그대로·숫자만 둘 다 (숫자만 쓴 식이 바른 순서와 같은 글이면 뺀다: 0.3 × 3의 "3 × 3")
      const rev = (decFirst ? [`${N.text} × ${x.text}`, `${N.text} × ${x.u}`] : [`${x.text} × ${N.text}`, `${x.u} × ${N.text}`]).filter((r) => r !== (decFirst ? `${x.u} × ${N.text}` : `${N.text} × ${x.u}`));
      for (const w of Object.values(q.solve.why)) {
        for (const r of rev) assert.ok(!new RegExp(`(?<![\\d.])${reEsc(r)}(?![\\d.])`).test(w), `${id} #${s}: 풀이 글이 곱셈 순서를 뒤집음 "${r}"\n${q.q}\n${w}`);
        n++;
      }
    }
  }
  assert.ok(n > 4 * SEEDS, `본 풀이 글 ${n}`);
});

// ───────────────────── 3단계: 화면 연결 ─────────────────────

test('화면 연결 (3단계): STEMS.decmul(W)은 이 생성기·원고를 쓰고 C 소수 바로 뒤 · 앱 셸이 둘 다 들고 간다 · 사다리 안내에 C 소수 줄기(아직 안 배운 말 없이) · 숫자판 ± 없음 · 소수 곱셈 그림을 📊·❓가 안다', async () => {
  const { STEMS, STEM_ORDER, stemOf } = await import('../js/mathprog.js');
  const W = STEMS.decmul;
  assert.equal(W.code, 'W');
  assert.equal(W.label, '소수의 곱셈 줄기', '줄기 고르기·📊에 보이는 이름');
  const at = STEM_ORDER.indexOf('decimal');
  assert.deepEqual(STEM_ORDER.slice(at, at + 2), ['decimal', 'decmul'], 'C 소수 → W 소수의 곱셈 (C의 자릿값·10배와 1/10 다음에 5-2 소수의 곱셈)');
  assert.equal(W.list, DMUL);
  assert.equal(W.gen.makeQuestion, makeQuestion);
  assert.equal(W.gen.lessonOf, lessonOf, '📚 배움은 이 생성기의 lessonOf');
  assert.equal(W.lesson, true);
  assert.equal(W.file, './coach/math/decmul.json');
  assert.equal(W.range, '초5');
  assert.ok(IDS.every((id) => stemOf(id) === W), '모든 칸이 W 줄기로 찾아진다');
  assert.match(W.pick, /C 소수 줄기\(자릿값·10배와 1\/10\)를 먼저/);
  // 사다리 안내·첫 안내는 W1부터 본다 — 아직 안 배운 말("자리 수를 더"·"소수 세 자리")·참말에 틀린 말이 없다
  const guide = `${W.pick} ${W.intro}`;
  for (const [re] of FIRST) assert.ok(!re.test(guide), `안내에 ${re}`);
  for (const [re, why] of BAD) assert.ok(!re.test(guide), `안내에 ${why}`);
  // 앱이 가져오는 원고(W.file)로 배움 장이 그대로 만들어진다
  const content = JSON.parse(readFileSync(new URL(W.file.replace('./', '../'), import.meta.url), 'utf8'));
  for (const id of IDS) assert.equal(W.gen.lessonOf(id, 5, { ...OPTS, content }).pages.length, content[id].lesson.length, `${id}: 원고 배움 장`);
  const sw = readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
  for (const f of ['./js/mathdmul.js', './coach/math/decmul.json']) assert.ok(sw.includes(`'${f}'`), `APP_SHELL에 ${f}`);
  // 숫자판은 이 줄기 열쇠로 — 소수 곱은 늘 양수라 ± 없음
  assert.equal(padSpec(makeQuestion('dmul.d1nat', 'calc', 1, OPTS), W.key).signed, false);
  // 📊 펼친 문제 글(figText)·❓ 복사문·📊 답장 안내 — 소수 곱셈 그림을 안다, 안내의 예는 그대로 그려진다
  assert.equal(figText('앞 [dmul area 0.4 0.8] 뒤', true), '앞 (소수 곱셈 그림) 뒤');
  const ask = readFileSync(new URL('../js/mathask.js', import.meta.url), 'utf8');
  const stats = readFileSync(new URL('../js/stats.js', import.meta.url), 'utf8');
  assert.ok(ask.includes('[dmul area 0.4 0.8]') && stats.includes('[dmul area 0.4 0.8]'), '❓ 복사문·📊 답장 안내에 [dmul] 예');
  assert.ok(renderFigures('[dmul area 0.4 0.8]').startsWith('<svg'), '안내의 예도 그려진다');
});
