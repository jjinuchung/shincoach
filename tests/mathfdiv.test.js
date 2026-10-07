// ➗ T 분수의 나눗셈 줄기 — 생성기 테스트.
// ★ 정답·오답은 이 파일이 **문제 글을 따로 읽어** 분수 셈으로 다시 푼다 (생성기의 계산을 쓰지 않는다).
//   이름표 판정은 생성기 이름표를 보지 않고 **그 틀린 셈이 실제로 한 일**로 다시 계산한다 (메모 stem-generator-pitfalls 38·40번).
// 함정(stem-generator-pitfalls)을 처음부터: 분수 바로 뒤 조사 · 단위 글자 뒤 조사 · 쌍둥이 틀 · 오답끼리 같은 값 · 우연히 맞는 값 ·
//   ② 보기 결론의 수 · 숫자판으로 모든 보기를 쳐 보기 · 아직 안 배운 말(뒤집) · 참말 금지 · 글 속 셈식(분수까지) · 그림 칸 수 = 지시문

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { FDIV, TAGS, makeQuestion, makeRound, ladder, placeFrom, diagnosticSet, lessonOf, checkContent, gradeLabel } from '../js/mathfdiv.js';
import { tplKey } from '../js/mathgen.js';
import { figureSvg, renderFigures, figText, richParts } from '../js/mathdraw.js';
import { padSpec, readTyped, matchTyped, partsOf } from '../js/mathpad.js';

const OPTS = { names: ['피카츄', '리자몽', '개굴닌자'], me: '진우', worlds: { pokemon: [], toystory: [], minions: [], moana: [] } };
const SEEDS = Number(process.env.RNG_SEEDS) || 300;
const IDS = FDIV.map((c) => c.id);

// ───────────────────── 이 파일의 분수 셈 ─────────────────────

const gcd = (a, b) => (b ? gcd(b, a % b) : Math.abs(a));
const Q = (n, d = 1) => { if (d < 0) { n = -n; d = -d; } const k = gcd(n, d) || 1; return { n: n / k, d: d / k }; };
const add = (x, y) => Q(x.n * y.d + y.n * x.d, x.d * y.d);
const sub = (x, y) => Q(x.n * y.d - y.n * x.d, x.d * y.d);
const mul = (x, y) => Q(x.n * y.n, x.d * y.d);
const div = (x, y) => Q(x.n * y.d, x.d * y.n);
const inv = (x) => Q(x.d, x.n);
const eq = (x, y) => !!(x && y && x.n * y.d === y.n * x.d);
const cmpQ = (x, y) => x.n * y.d - y.n * x.d;
const show = (x) => (x ? `${x.n}/${x.d}` : String(x));
/** 수 하나의 글자 → 값: "3" · "3/4" · "2 1/3" (못 읽으면 null) */
function val(t) {
  const s = String(t).trim(); let m;
  if ((m = /^(\d+) (\d+)\/(\d+)$/.exec(s))) return Q(+m[1] * +m[3] + +m[2], +m[3]);
  if ((m = /^(\d+)\/(\d+)$/.exec(s))) return Q(+m[1], +m[2]);
  if ((m = /^(\d+)$/.exec(s))) return Q(+m[1]);
  return null;
}
/** 수 글자의 꼴: int · frac · mixed */
const formOf = (t) => (/^\d+ \d+\/\d+$/.test(t) ? 'mixed' : /^\d+\/\d+$/.test(t) ? 'frac' : /^\d+$/.test(t) ? 'int' : null);

/** 식 계산기 — 자연수·분수(붙여 쓴 n/d)·대분수(w n/d)·+ − × ÷·괄호·"(…)/d". 못 읽으면 throw */
function evalExpr(src) {
  const s = String(src).trim(); let i = 0;
  const ws = () => { while (s[i] === ' ') i++; };
  const number = () => {
    let m = /^(\d+) (\d+)\/(\d+)(?![\d/])/.exec(s.slice(i));
    if (m) { i += m[0].length; return Q(+m[1] * +m[3] + +m[2], +m[3]); }
    m = /^(\d+)\/(\d+)(?![\d/])/.exec(s.slice(i));
    if (m) { i += m[0].length; return Q(+m[1], +m[2]); }
    m = /^\d+(?![\d/])/.exec(s.slice(i));
    if (m) { i += m[0].length; return Q(+m[0]); }
    throw new Error(`수를 못 읽음: ${s.slice(i)}`);
  };
  const atom = () => {
    ws();
    if (s[i] === '(') { i++; const v = expr(); ws(); if (s[i] !== ')') throw new Error('괄호'); i++; const m = /^\/(\d+)/.exec(s.slice(i)); if (m) { i += m[0].length; return div(v, Q(+m[1])); } return v; }
    return number();
  };
  const termP = () => { let v = atom(); for (;;) { ws(); if (s[i] === '×') { i++; v = mul(v, atom()); } else if (s[i] === '÷') { i++; v = div(v, atom()); } else return v; } };
  const expr = () => { let v = termP(); for (;;) { ws(); if (s[i] === '+') { i++; v = add(v, termP()); } else if (s[i] === '−') { i++; v = sub(v, termP()); } else return v; } };
  const v = expr(); ws();
  if (i !== s.length) throw new Error(`남은 글: ${s.slice(i)}`);
  return v;
}
/** 글 끝의 수 (결론) — "… 2 1/3" · "… 3이 몫이에요" · "… 1/3배" */
function lastNum(t) {
  const all = [...String(t).matchAll(/(\d+ \d+\/\d+|\d+\/\d+|\d+)/g)];
  return all.length ? val(all[all.length - 1][1]) : null;
}
const boldOf = (q) => (/\*\*(.+?)\*\*/.exec(q) || [])[1];
/** 굵은 식 "X ÷ Y" → [X, Y] (값과 글자) */
function opsOf(e) {
  const m = /^(.+?) ÷ (.+)$/.exec(e);
  if (!m) throw new Error(`나눗셈 식이 아님: ${e}`);
  return { X: val(m[1]), Y: val(m[2]), xs: m[1], ys: m[2] };
}

// ───────────────────── 문제 글 읽기 ─────────────────────

/** 문제 글 → { type, form('num'|'pick'), ans(값) | ok(고르기 판정), f(재료) } */
function solveText(q) {
  let m;
  const B = boldOf(q);
  if (/몫을 분수로 나타내면/.test(q)) { const o = opsOf(B); return { type: 'natFrac', form: 'num', ans: div(o.X, o.Y), f: o, need: 'frac' }; }
  if (/몫을 대분수로 나타내면/.test(q)) { const o = opsOf(B); return { type: 'natMixed', form: 'num', ans: div(o.X, o.Y), f: o, need: 'mixed' }; }
  if (/□ 안에 알맞은 수/.test(q)) {
    m = /^(\d+) ÷ (\d+) = \1 × □$/.exec(B); assert.ok(m, `□ 식 ${B}`);
    const X = Q(+m[1]); const Y = Q(+m[2]);
    return { type: 'box', form: 'num', ans: div(div(X, Y), X), f: { X, Y } };
  }
  if (/곱셈으로 나타낸 것은 어느 것/.test(q)) { const o = opsOf(B); return { type: 'asMul', form: 'pick', ok: (t) => eq(evalExpr(t), div(o.X, o.Y)), f: o }; }
  if ((m = /몫이 (\d+)보다 큰 것은 어느 것/.exec(q))) { const k = Q(+m[1]); return { type: 'bigger', form: 'pick', ok: (t) => cmpQ(evalExpr(t), k) > 0, f: { k } }; }
  if (/^다음을 계산하면 얼마일까요\?/.test(q)) { const o = opsOf(B); return { type: 'calc', form: 'num', ans: div(o.X, o.Y), f: o }; }
  const story = [
    [/케이크 (\d+)개를 (\d+)명이 똑같이/, (x) => [x[1], x[2]]],
    [/길이가 (\d+) m인 리본을 (\d+)명에게/, (x) => [x[1], x[2]]],
    [/주스가 (\S+) L 있어요\. 이 주스를 컵 (\d+)개에/, (x) => [x[1], x[2]]],
    [/길이가 (\S+) m인 끈을 (\d+)도막으로/, (x) => [x[1], x[2]]],
    [/밀가루가 (\d+ \d+\/\d+) kg 있어요\. 봉지 (\d+)개에/, (x) => [x[1], x[2]]],
    [/물이 (\S+) L 있어요\. 한 컵에 (\S+) L씩/, (x) => [x[1], x[2]]],
    [/끈이 (\S+) m 있어요\. 한 도막을 (\S+) m씩/, (x) => [x[1], x[2]]],
    [/물통의 (\S+)만큼 채우는 데 물이 (\d+) L 들었어요/, (x) => [x[2], x[1]]],
    [/길이가 (\d+) m인 끈을 (\S+) m씩/, (x) => [x[1], x[2]]],
    [/쌀이 (\d+ \d+\/\d+) kg 있어요\. 한 봉지에 (\S+) kg씩/, (x) => [x[1], x[2]]],
    [/철근 (\S+) m 무게를 재었더니 (\S+) kg 나갔어요/, (x) => [x[2], x[1]]],
    [/가로가 (\S+) m, 넓이가 (\S+) m²인/, (x) => [x[2], x[1]]],
  ];
  for (const [re, pickXY] of story) {
    if ((m = re.exec(q))) { const [xs, ys] = pickXY(m); const X = val(xs); const Y = val(ys); assert.ok(X && Y, `이야기 수 ${xs} ${ys}`); return { type: 'story', form: 'num', ans: div(X, Y), f: { X, Y, xs, ys } }; }
  }
  // 몇 배 — 이름으로 누구의 무게인지 찾는다
  if ((m = /^(.+?)[은는] 나무열매를 (\S+) kg 땄고, (.+?)[은는] (\S+) kg 땄어요\. (.+?)의 나무열매 무게는 (.+?)의 몇 배일까요\?$/.exec(q))) {
    const W = { [m[1]]: m[2], [m[3]]: m[4] };
    const xs = W[m[5]]; const ys = W[m[6]];
    assert.ok(xs && ys && m[5] !== m[6], `몇 배 이름 ${m[5]} ${m[6]}`);
    return { type: 'times', form: 'num', ans: div(val(xs), val(ys)), f: { X: val(xs), Y: val(ys), xs, ys } };
  }
  return { type: 'unknown' };
}

/** 고르기 문항의 맞는 보기 · 수 문항은 값이 같은 보기 */
function rightOnes(sv, chs) {
  if (sv.form === 'num') return chs.filter((x) => eq(val(x.text), sv.ans));
  return chs.filter((x) => sv.ok(x.text));
}

/** 대분수 글자 → 자연수·분수 부분 */
const mixedParts = (t) => { const m = /^(\d+) (\d+)\/(\d+)$/.exec(String(t).trim()); return m ? { w: +m[1], n: +m[2], d: +m[3] } : null; };
const numer = (t) => +/^(\d+)/.exec(String(t).trim().split(' ').pop())[1];
const denom = (t) => { const m = /\/(\d+)$/.exec(String(t).trim()); return m ? +m[1] : 1; };

/** 이름표 뜻 — 그 틀린 생각을 문제 글의 수로 다시 한 값 (값이 아닌 고르기는 식의 모양으로) */
function tagHolds(sv, tag, t) {
  const { X, Y, xs, ys } = sv.f;
  const v = val(t);
  const is = (w) => !!w && eq(v, w);
  if (sv.type === 'asMul') {
    const m = /^(.+) × (.+)$/.exec(t); if (!m) return false;
    const A = val(m[1]); const Bv = val(m[2]);
    switch (tag) {
      case TAGS.keepK: return eq(A, X) && eq(Bv, Y);
      case TAGS.flipFirst: return eq(A, inv(X)) && eq(Bv, Y);
      case TAGS.flipFirstToo: return eq(A, inv(X)) && eq(Bv, inv(Y));
      case TAGS.noFlip: return eq(A, X) && eq(Bv, Y);
      case TAGS.flipBoth: return eq(A, inv(X)) && eq(Bv, inv(Y));
      default: return false;
    }
  }
  if (sv.type === 'bigger') {
    const m = /^(\d+) ([÷×]) (\d+)\/(\d+)$/.exec(t); if (!m) return false;
    const F = Q(+m[3], +m[4]);
    if (tag === TAGS.fracBig) return m[2] === '÷' && cmpQ(F, Q(1)) > 0;
    if (tag === TAGS.mulBig) return m[2] === '×' && cmpQ(F, Q(1)) < 0;
    return false;
  }
  if (sv.type === 'box') return { [TAGS.keepK]: is(Y), [TAGS.flipWhich]: is(inv(X)) }[tag] === true;
  switch (tag) {
    case TAGS.flipNat: return is(div(Y, X));
    case TAGS.unitOnly: return is(inv(Y));
    case TAGS.dropRem: return is(Q(Math.floor(X.n / X.d / (Y.n / Y.d))));
    case TAGS.remDen: { const a = X.n; const b = Y.n; return X.d === 1 && Y.d === 1 && is(add(Q(Math.floor(a / b)), Q(a % b, a))); }
    case TAGS.mulNum: return is(mul(X, Y)) && Y.d === 1;
    case TAGS.dropDen: return Y.d === 1 && is(Q(numer(xs), Y.n)) && Number.isInteger(numer(xs) / Y.n);
    case TAGS.sameOnly: return is(X);
    case TAGS.dropWhole: { const mx = mixedParts(xs); const my = mixedParts(ys); if (mx) return is(div(Q(mx.n, mx.d), Y)); if (my) return is(div(X, Q(my.n, my.d))); return false; }
    case TAGS.badImproper: { const mx = mixedParts(xs); const my = mixedParts(ys); if (mx) return is(div(Q(mx.w + mx.n, mx.d), Y)); if (my) return is(div(X, Q(my.w + my.n, my.d))); return false; }
    case TAGS.keepDen: return denom(xs) === denom(ys) && is(div(div(X, Y), Q(denom(xs))));
    case TAGS.mulInstead: return is(mul(X, Y));
    case TAGS.flipAns: return is(div(Y, X));
    case TAGS.noLCD: return denom(xs) !== denom(ys) && is(Q(numer(xs), numer(ys)));
    case TAGS.oneOnly: return X.d === 1 && is(inv(Y)) && Y.n === 1;
    case TAGS.partOnly: return X.d === 1 && is(Q(X.n, Y.n));
    case TAGS.noFlip: return is(mul(X, Y));
    case TAGS.flipFirst: return is(mul(inv(X), Y));
    case TAGS.flipBoth: return is(mul(inv(X), inv(Y)));
    case TAGS.wholeKeep: { const mx = mixedParts(xs); return !!mx && is(add(Q(mx.w), div(Q(mx.n, mx.d), Y))); }
    case TAGS.wholeOnly: { const mx = mixedParts(xs); return !!mx && Y.d === 1 && is(add(div(Q(mx.w), Y), Q(mx.n, mx.d))); }
    case TAGS.timesFlip: return is(div(Y, X));
    default: return false;
  }
}

const allText = (q) => [q.q, ...q.choices.map((x) => x.text), ...(q.solve ? [...q.solve.steps, ...Object.values(q.solve.why), q.solve.whyAny, q.solve.rule] : [])].join('\n');
function* every(kinds = ['calc', 'misread'], n = SEEDS) {
  for (const c of FDIV) for (const k of kinds) for (let s = 1; s <= n; s++) yield { c, k, s, q: makeQuestion(c.id, k, s, OPTS) };
}

// ───────────────────── 사다리 ─────────────────────

test('사다리: 9칸, 모두 초6, needs가 바로 앞 칸 · 맨 뒤는 ⭐ · 교과서 차시 순서', () => {
  assert.deepEqual(IDS, ['fdv.natdiv', 'fdv.fracnat', 'fdv.mixnat', 'fdv.same', 'fdv.diff', 'fdv.natfrac', 'fdv.flip', 'fdv.mixed', 'fdv.apply']);
  FDIV.forEach((c, i) => {
    assert.equal(c.grade, 6, c.id);
    assert.deepEqual(c.needs, i ? [IDS[i - 1]] : [], c.id);
    assert.ok(c.idea && c.rule && c.slip, c.id);
  });
  assert.equal(gradeLabel(6), '초6');
  assert.match(FDIV[8].name, /^⭐/);
});

test('계산기 자체 점검 — 분수·대분수·괄호·(…)/d · 끝의 수', () => {
  assert.ok(eq(evalExpr('6 ÷ 2/3'), Q(9)));
  assert.ok(eq(evalExpr('2 1/4 ÷ 3/8'), Q(6)));
  assert.ok(eq(evalExpr('(1 × 5 + 1)/5'), Q(6, 5)));
  assert.ok(eq(evalExpr('2 + 2/5 ÷ 4/5'), Q(5, 2)));
  assert.ok(eq(evalExpr('(15 ÷ 3) × 7'), Q(35)));
  assert.ok(eq(lastNum('나머지 2도 나누는 수 9로 나눠요 — 3 2/9'), Q(29, 9)));
  assert.ok(eq(lastNum('분자끼리 나눈 3이 몫이에요'), Q(3)));
  assert.ok(eq(lastNum('… = 1/3배'), Q(1, 3)));
  assert.throws(() => evalExpr('3 … 2'));
});

// ───────────────────── 문제 ─────────────────────

test('★ 독립 검산: ① 정답이 문제 글을 따로 읽어 푼 답과 같다 · 딱 하나만 맞다 · 답은 0보다 크다 · 분수로/대분수로 묻는 답은 그 꼴', () => {
  const types = new Set();
  for (const { c, s, q } of every(['calc'])) {
    const sv = solveText(q.q);
    assert.notEqual(sv.type, 'unknown', `${c.id} #${s}: 못 읽는 문제\n${q.q}`);
    const ok = q.choices.find((x) => x.ok);
    const right = rightOnes(sv, q.choices);
    assert.equal(right.length, 1, `${c.id} #${s} (${sv.type}): 맞는 보기 ${right.map((x) => x.text).join(', ') || '없음'}\n${q.q}\n${q.choices.map((x) => x.text).join(' | ')}`);
    assert.equal(right[0], ok, `${c.id} #${s}: 정답 표시 "${ok.text}" ≠ 따로 푼 "${right[0].text}"\n${q.q}`);
    if (sv.form === 'num') {
      assert.ok(sv.ans.n > 0, `${c.id} #${s}: 답 ${show(sv.ans)}`);
      if (sv.need === 'frac') assert.equal(formOf(ok.text), 'frac', `${c.id} #${s}: 분수로 물었는데 정답 "${ok.text}"`);
      if (sv.need === 'mixed') assert.equal(formOf(ok.text), 'mixed', `${c.id} #${s}: 대분수로 물었는데 정답 "${ok.text}"`);
    }
    types.add(`${c.id}:${sv.type}`);
  }
  assert.ok(types.size >= 16, `문제 종류 ${types.size}: ${[...types]}`);
});

test('★ 드문 우연 — 고르기 문항은 씨앗 5,000개로 따로: 맞는 보기가 딱 하나', () => {
  let n = 0;
  for (const id of ['fdv.fracnat', 'fdv.flip', 'fdv.apply']) for (let s = 1; s <= Math.max(SEEDS, 5000); s++) {
    const q = makeQuestion(id, 'calc', s, OPTS);
    const sv = solveText(q.q);
    if (sv.form !== 'pick') continue;
    const right = rightOnes(sv, q.choices);
    assert.ok(right.length === 1 && right[0].ok, `${id} #${s} (${sv.type}): 맞는 보기 ${right.map((x) => x.text).join(', ')}\n${q.q}`);
    n++;
  }
  assert.ok(n > 3000, `본 고르기 문항 ${n}`);
});

test('★ 보기: 정답 하나, 글자 겹침 없음, 3개 이상, 빈 글자·undefined·NaN·남은 자리표시 없음 · ① 계산엔 그림 없음 · ② 그림은 나눗셈 막대만, 모두 그려진다', () => {
  let figs = 0;
  for (const { c, k, s, q } of every()) {
    const at = `${c.id} ${k} #${s}`;
    assert.ok(q.choices.length >= 3, `${at}: 보기 ${q.choices.length}`);
    assert.equal(q.choices.filter((x) => x.ok).length, 1, at);
    assert.equal(new Set(q.choices.map((x) => x.text)).size, q.choices.length, `${at}: 같은 글자 보기`);
    const all = allText(q);
    assert.ok(!/undefined|NaN|\{(me|mon)|null|Infinity|\/1(?!\d)|\/0(?!\d)/.test(all), `${at}: ${all}`);
    const ds = q.q.match(/\[[a-z]+ [^\]]+\]/g) || [];
    if (k === 'calc') assert.equal(ds.length, 0, `${at}: ① 계산에 그림 ${ds}`);
    for (const d of ds) {
      assert.match(d, /^\[fbar /, `${at}: 나눗셈 막대 말고 다른 그림 ${d}`);
      assert.ok(figureSvg(d.slice(1, -1)).startsWith('<svg'), `${at}: 못 그리는 ${d}`);
      figs++;
    }
  }
  assert.ok(figs > SEEDS / 2, `② 그림 ${figs}`);
});

test('★ 오개념 이름표: 그 오답이 정말 그 틀린 생각이다 — 문제 글의 수로 틀린 셈을 다시 한다 · 이름표 붙은 오답이 늘 둘 이상', () => {
  let n = 0;
  for (const { c, s, q } of every(['calc'])) {
    const sv = solveText(q.q);
    const tagged = q.choices.filter((x) => !x.ok && x.tag !== '계산 실수');
    assert.ok(tagged.length >= 2, `${c.id} #${s}: 이름표 붙은 오답 ${tagged.length}\n${q.q}`);
    for (const w of tagged) { assert.ok(tagHolds(sv, w.tag, w.text), `${c.id} #${s} (${sv.type}): "${w.text}"의 이름표 "${w.tag}"가 뜻과 다르다\n${q.q}`); n++; }
  }
  assert.ok(n > 18 * SEEDS, `본 이름표 ${n}`);
});

test('★ 오답끼리 같은 값·같은 글이 되지 않는다 — 보기에서 겹쳐 빠지기 전(probe.allWrong) · 빠진 오답도 이름표의 뜻 그대로 · 정답과 같은 값 없음', () => {
  for (const { c, s, q } of every(['calc'])) {
    const sv = solveText(q.q); const ok = q.choices.find((x) => x.ok).text;
    const W = q.probe.allWrong;
    assert.equal(new Set(W.map((w) => w.text)).size, W.length, `${c.id} #${s}: 오답 글이 겹친다 ${W.map((w) => w.text)}`);
    for (const w of W) {
      assert.ok(w.text !== ok, `${c.id} #${s}: 오답 "${w.text}" = 정답`);
      if (sv.form === 'num') assert.ok(!eq(val(w.text), sv.ans), `${c.id} #${s}: 오답 "${w.text}"이 맞는 값`);
      assert.ok(tagHolds(sv, w.tag, w.text), `${c.id} #${s}: 빠진 오답 "${w.text}"도 "${w.tag}"의 뜻\n${q.q}`);
    }
    if (sv.form === 'num') { const vals = W.map((w) => show(val(w.text))); assert.equal(new Set(vals).size, vals.length, `${c.id} #${s}: 오답 값이 겹친다 ${vals}`); }
  }
});

test('★ 오답 보기는 기약분수·대분수 꼴 (정답만 다른 꼴이면 힌트) · 수 보기 꼴: 진분수·대분수·자연수', () => {
  for (const { c, s, q } of every(['calc'])) {
    const sv = solveText(q.q);
    if (sv.form !== 'num') continue;
    for (const x of q.choices) {
      const f = formOf(x.text);
      assert.ok(f, `${c.id} #${s}: 수가 아닌 보기 "${x.text}"`);
      const v = val(x.text);
      if (f === 'frac') assert.ok(gcd(numer(x.text), denom(x.text)) === 1, `${c.id} #${s}: 약분 안 된 보기 "${x.text}"`);
      if (f === 'mixed') { const p = mixedParts(x.text); assert.ok(p.n < p.d && gcd(p.n, p.d) === 1, `${c.id} #${s}: 대분수 꼴 "${x.text}"`); }
      // "분수로" 묻는 문제만 가분수를 쓴다 — 그 밖의 가분수는 대분수로
      if (f === 'frac' && sv.need !== 'frac') assert.ok(v.n < v.d, `${c.id} #${s}: 가분수 보기 "${x.text}" (대분수로)`);
    }
  }
});

/** ② 문항 — 바른 값(문제 글에서 따로) · 보여 준 말의 결론 · 고치는 말의 결론 */
function misreadFacts(q) {
  const shown = boldOf(q.q) || '';
  let m; let right;
  if ((m = /나눗셈 (\d+) ÷ (\d+)의 몫/.exec(q.q))) right = Q(+m[1], +m[2]);
  else if ((m = /나눗셈 (\d+) ÷ (\d+\/\d+) — 몫을 어림/.exec(q.q))) right = div(Q(+m[1]), val(m[2]));
  else if (/몇 배일까요/.test(q.q)) {
    m = /^(.+?)[은는] 나무열매를 (\S+) kg, (.+?)[은는] (\S+) kg 땄어요\. (.+?)의 나무열매 무게는 (.+?)의 몇 배일까요\?/.exec(q.q);
    const W = { [m[1]]: m[2], [m[3]]: m[4] }; right = div(val(W[m[5]]), val(W[m[6]]));
  } else right = evalExpr(shown.split(' = ')[0]);
  return { shown, right };
}
test('★ ② 오개념 문항: 보여 준 말은 정말 틀렸다 · 고치는 말의 결론만 맞다 · 이름표 붙은 보기의 결론은 바른 값과 다르다 · 갈래 열쇠 둘씩 · 엉뚱한 지적은 거짓 단정', () => {
  const keys = {};
  for (const { c, s, q } of every(['misread'], Math.max(SEEDS, 600))) {
    (keys[c.id] = keys[c.id] || new Set()).add(q.key);
    const at = `${c.id} #${s} ${q.key}`;
    const { shown, right } = misreadFacts(q);
    assert.ok(right && right.n > 0, `${at}: 바른 값\n${q.q}`);
    if (/몫은 \d+보다 작아요$/.test(shown)) assert.ok(cmpQ(right, Q(+/(\d+)보다/.exec(shown)[1])) > 0, `${at}: 보여 준 말이 맞다`);
    else assert.ok(!eq(lastNum(shown), right), `${at}: 보여 준 말 "${shown}"의 결론이 맞는 값\n${q.q}`);
    const ok = q.choices.find((x) => x.ok);
    assert.ok(eq(lastNum(ok.text), right), `${at}: 고치는 말 "${ok.text}"의 결론 ≠ ${show(right)}`);
    for (const w of q.choices.filter((x) => !x.ok)) {
      if (w.tag === '엉뚱한 지적') { assert.match(w.text, /(없어요|아니에요)$/, `${at}: 엉뚱한 지적은 거짓 단정으로 "${w.text}"`); continue; }
      if (w.tag === '틀린 줄 모름') { assert.equal(w.text, '맞게 말했어요'); continue; }
      assert.ok(!eq(lastNum(w.text), right), `${at}: 오개념 보기 "${w.text}"의 결론이 맞는 값`);
    }
    assert.equal(q.choices.filter((x) => x.ok).length, 1);
    assert.ok(q.choices.some((x) => x.tag === '틀린 줄 모름'), `${at}: "맞게 말했어요" 보기`);
  }
  for (const id of IDS) assert.equal(keys[id].size, 2, `${id}: ② 갈래 ${[...keys[id]]}`);
});

// ───────────────────── 글 ─────────────────────

const FRAC_JOSA = /\/(?:\d+)(?:이에요|예요|이라서|라서|이니까|니까|이고|이면|이|가|은|는|을|를|와|과|도|으로|로|의|에)/;
const UNIT_JOSA = /(?<![가-힣a-z])(?:m²|m|L|kg)(?:이에요|예요|이고|이면|이|가|은|는|을|를|와|과|으로|로)(?![가-힣])/;

test('★ 조사: 수 뒤는 읽는 소리 · 분수 바로 뒤에는 조사 없음 · 단위 글자(m·L·kg) 바로 뒤에도 없음 · ASCII 빼기 없음', () => {
  const BAT = new Set(['0', '1', '3', '6', '7', '8']);
  const PAIRS = [['을', '를'], ['은', '는'], ['이', '가'], ['과', '와'], ['이에요', '예요'], ['이니까', '니까'], ['이라서', '라서']];
  let hitN = 0;
  for (const { c, k, s, q } of every()) {
    const all = allText(q).replace(/\*\*/g, '').replace(/\[fbar [^\]]+\]/g, '');
    for (const [wb, nb] of PAIRS) {
      for (const m of all.matchAll(new RegExp(`(?<![\\d/])(\\d+)(${wb}|${nb})(?=[\\s.,!?)—]|$)`, 'g'))) { assert.equal(m[2], BAT.has(m[1].slice(-1)) ? wb : nb, `${c.id} ${k} #${s}: "…${m[1]}${m[2]}"\n${all}`); hitN++; }
    }
    for (const m of all.matchAll(/(?<![\d/])(\d+)(으로|로)(?=[\s.,]|$)/g)) assert.equal(m[2], ['1', '7', '8'].includes(m[1].slice(-1)) ? '로' : BAT.has(m[1].slice(-1)) ? '으로' : '로', `${c.id} ${k} #${s}: "…${m[1]}${m[2]}"`);
    const fp = FRAC_JOSA.exec(all);
    assert.ok(!fp, `${c.id} ${k} #${s}: 분수 바로 뒤 조사 "${fp && fp[0]}"\n${all}`);
    const up = UNIT_JOSA.exec(all);
    assert.ok(!up, `${c.id} ${k} #${s}: 단위 글자 바로 뒤 조사 "${up && up[0]}"\n${all}`);
    assert.ok(!/-\d|\d-/.test(all), `${c.id} ${k} #${s}: ASCII 빼기`);
  }
  assert.ok(hitN > 2 * SEEDS, `실제로 본 곳 ${hitN}`);
  // 칸 설명·규칙·실수 안내도 (배움 원고가 없을 때 배움 장·검수 페이지에 그대로 뜬다) — 문자 분수(a/b)도 없이 (D·Q·R 줄기에만)
  for (const c of FDIV) {
    const t = [c.idea, c.rule, c.slip].join('\n').replace(/\*\*/g, '');
    const fp = FRAC_JOSA.exec(t); assert.ok(!fp, `${c.id} 설명: 분수 바로 뒤 조사 "${fp && fp[0]}"`);
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
    if (k === 'calc' && ok.length <= 16) assert.ok(sv.steps.join(' ').includes(ok), `${c.id} #${s}: 정답 "${ok}"이 풀이에 없다\n${sv.steps.join('\n')}`);
  }
});

/** 글 속 "식 = 식 = …" — 분수·대분수까지 계산기로 (나머지 "w … r"·② 보여 준 말·오답 보기는 빼고) */
function eqChains(text) {
  const out = [];
  const t = String(text).replace(/= \d+ … \d+/g, '…');
  for (const m of t.matchAll(/[\d(][\d /()+−×÷=]*[\d)]/g)) { // 띄어쓰기만 — 줄을 넘어 다음 줄의 수와 잇지 않게
    const parts = m[0].split(' = ').map((x) => x.trim());
    if (parts.length < 2) continue;
    const vals = parts.map((p) => { try { return evalExpr(p); } catch { return null; } });
    for (let i = 1; i < vals.length; i++) if (vals[i - 1] && vals[i]) out.push({ a: parts[i - 1], b: parts[i], ok: eq(vals[i - 1], vals[i]) });
  }
  return out;
}
test('★ 글 속 셈식은 맞다 (분수·대분수·괄호까지) — 문제·정답·풀이·왜 전부', () => {
  let n = 0;
  for (const { c, k, s, q } of every()) {
    const all = [q.q.replace(/\*\*.+?\*\*/g, ''), q.choices.find((x) => x.ok).text, ...q.solve.steps, ...Object.values(q.solve.why), q.solve.whyAny].join('\n');
    for (const e of eqChains(all)) { assert.ok(e.ok, `${c.id} ${k} #${s}: ${e.a} = ${e.b}`); n++; }
  }
  assert.ok(n > 10 * SEEDS, `셈식 ${n}`);
});

test('🔁 쌍둥이·🤔 노트: 요청한 틀·갈래로 온다 · 같은 셈 · 쌍둥이 글이 원래 글과 같은 일은 드물다', () => {
  const same2 = {}; const tot = {};
  for (const c of FDIV) {
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

/** 처음 배우는 말 — 그 앞 칸의 글·이름표에는 나오면 안 된다 */
const FIRST = [[/뒤집/, 'fdv.flip']];
test('★ 아직 안 배운 말을 앞 칸에 쓰지 않는다 — "뒤집"은 T7 (분수)÷(분수)를 곱셈으로부터', () => {
  const idx = (id) => IDS.indexOf(id);
  const banned = (id) => FIRST.filter(([, at]) => idx(at) > idx(id));
  for (const c of FDIV) for (const [re] of banned(c.id)) assert.ok(!re.test(`${c.name} ${c.idea} ${c.rule} ${c.slip}`), `${c.id}: 설명에 ${re}`);
  for (const { c, k, s, q } of every()) {
    const all = allText(q) + ' ' + q.choices.map((x) => x.tag || '').join(' ');
    for (const [re] of banned(c.id)) assert.ok(!re.test(all), `${c.id} ${k} #${s}: 아직 안 배운 ${re}\n${all}`);
  }
  for (const t of Object.values(TAGS)) assert.ok(!/뒤집/.test(t), `이름표에 "뒤집" — 앞 칸에서도 뜬다: ${t}`);
});

/** 참이라고 내미는 글에 틀린 말 — 오답 보기·② 보여 준 말은 빼고, 굵게(**)는 떼고 */
const BAD = [
  [/나누면 (?:늘|항상) (?:몫이 )?작아/, '1보다 작은 수로 나누면 몫이 커진다'],
  [/분수로 나누면 (?:늘|항상) (?:몫이 )?커/, '1보다 큰 분수로 나누면 작아진다'],
  [/곱하면 (?:늘|항상) 커/, '1보다 작은 수를 곱하면 작아진다'],
  [/분모끼리도 나눠/, '분모가 같으면 분자끼리만 — 분모끼리 나누면 1'],
];
test('★ 참말에 틀린 말이 없다 — 나누면 늘 작아진다 · 분수로 나누면 늘 커진다', () => {
  const truths = (q) => [q.choices.find((x) => x.ok).text, ...(q.solve ? [...q.solve.steps, ...Object.values(q.solve.why), q.solve.whyAny, q.solve.rule] : [])].join('\n').replace(/\*\*/g, '');
  for (const { c, k, s, q } of every()) {
    const t = truths(q);
    for (const [re, why] of BAD) assert.ok(!re.test(t), `${c.id} ${k} #${s}: ${why}\n${t}`);
  }
  for (const c of FDIV) for (const [re, why] of BAD) assert.ok(!re.test([c.idea, c.rule, c.slip].join('\n').replace(/\*\*/g, '')), `${c.id}: ${why}`);
});

test('🔢 숫자판: 수가 답인 ①만 숫자판 · 분수·대분수 답도 칠 수 있다 · 모든 수 보기를 쳐서 그 보기로 간다 · 꼴을 묻는 문제는 꼴까지', () => {
  const pv = readFileSync(new URL('../js/padview.js', import.meta.url), 'utf8');
  const MAX = +/const MAX = (\d+);/.exec(pv)[1];
  let n = 0;
  for (const { c, s, q } of every(['calc'], 200)) {
    const ok = q.choices.find((x) => x.ok).text;
    const sv = solveText(q.q);
    const spec = padSpec(q, 'fracdiv');
    assert.equal(!!spec, sv.form === 'num', `${c.id} #${s}: 정답 "${ok}" 숫자판 ${!!spec}`);
    if (!spec) continue;
    assert.equal(spec.need, sv.need || null, `${c.id} #${s}: 꼴 ${spec.need}`);
    for (const ch of q.choices) {
      assert.ok(String(ch.text).length <= MAX, `${c.id} #${s}: "${ch.text}"`);
      const t = partsOf(ch.text);
      assert.ok(t && spec.modes.includes(t.mode), `${c.id} #${s}: "${ch.text}"를 칸으로 못 나눔`);
      const hit = matchTyped(q, readTyped(t.mode, t.p, spec), spec);
      assert.equal(q.choices[hit.i], ch, `${c.id} #${s}: "${ch.text}"를 쳐도 그 보기로 안 간다`);
      n++;
    }
    // 약분 안 한 답도 맞음 (꼴을 묻지 않는 문제) — 2022 고려사항
    const v = val(ok);
    if (!spec.need && v.d > 1) {
      const raw = { mode: 'frac', p: { n: String(v.n * 2), d: String(v.d * 2) } };
      const hit = matchTyped(q, readTyped(raw.mode, raw.p, spec), spec);
      assert.ok(q.choices[hit.i] && q.choices[hit.i].ok, `${c.id} #${s}: 약분 안 한 ${v.n * 2}/${v.d * 2}이 틀림`);
    }
  }
  assert.ok(n > 1000, `쳐 본 보기 ${n}`);
});

// ───────────────────── 나눗셈 막대 그림 ─────────────────────

/** 그린 막대에서 칸을 다시 센다 */
function cellsOf(svg) {
  return [...svg.matchAll(/<rect class="fb-c"[^>]*?data-([a-z]+)="([^"]*)"(?: data-([a-z]+)="([^"]*)")?(?: data-([a-z]+)="([^"]*)")?(?: data-([a-z]+)="([^"]*)")?/g)].map((m) => {
    const o = {}; for (let k = 1; k < m.length; k += 2) if (m[k]) o[m[k]] = m[k + 1]; return o;
  });
}
test('🎨 나눗셈 막대: 칠한 칸·묶음·나머지·진한 칸·1만큼 = 지시문 · 폭 400 · 글로 바꾸기 · 못 그리는 지시문은 빈 그림', () => {
  // 덜어 내기 — 6/7 ÷ 2/7: 칸 7 · 칠한 칸 6 · 묶음 3 (나머지 없음) · 5/7 ÷ 2/7: 묶음 2 + 나머지 1 · 3 ÷ 1/4: 막대 3개, 묶음 12
  for (const [spec, cells, on, groups, rem] of [['take 6/7 2/7', 7, 6, 3, 0], ['take 5/7 2/7', 7, 5, 2, 1], ['take 3 1/4', 12, 12, 12, 0], ['take 8/9 3/9', 9, 8, 2, 2]]) {
    const svg = figureSvg(`fbar ${spec}`); const C = cellsOf(svg);
    assert.equal(C.length, cells, `${spec}: 칸`);
    assert.equal(C.filter((x) => x.on === '1').length, on, `${spec}: 칠한 칸`);
    assert.equal(new Set(C.filter((x) => /^\d+$/.test(x.g) && x.g !== '0').map((x) => x.g)).size, groups, `${spec}: 묶음`);
    assert.equal(C.filter((x) => x.g === 'r').length, rem, `${spec}: 나머지 칸`);
    // 묶음마다 칸 수가 나누는 수의 분자와 같다
    const b = +/ (\d+)\/\d+$/.exec(spec)[1];
    for (let g = 1; g <= groups; g++) assert.equal(C.filter((x) => x.g === String(g)).length, b, `${spec}: ${g}묶음 칸 수`);
    assert.ok(+/viewBox="0 0 (\d+)/.exec(svg)[1] <= 400);
  }
  // 이름표 자리 — 묶음 번호·"나머지"가 제 칸들 위(가로 범위 안)에 (갤러리 눈 확인: 나머지 1칸이면 글자가 옆 칸으로 밀렸다)
  for (const spec of ['take 11/12 2/12', 'take 5/7 2/7', 'take 8/9 3/9', 'take 6/7 2/7']) {
    const svg = figureSvg(`fbar ${spec}`);
    const rects = [...svg.matchAll(/<rect class="fb-c" x="([\d.]+)" y="([\d.]+)" width="([\d.]+)"[^>]*data-g="([^"]*)"/g)].map((m) => ({ x: +m[1], w: +m[3], g: m[4] }));
    const labs = [...svg.matchAll(/<text x="([\d.]+)"[^>]*class="fb-l">([^<]+)</g)].map((m) => ({ x: +m[1], t: m[2] }));
    const NUMS = '①②③④⑤⑥⑦⑧⑨⑩⑪⑫';
    for (const l of labs) {
      const g = l.t === '나머지' ? 'r' : String(NUMS.indexOf(l.t) + 1);
      const mine = rects.filter((rc) => rc.g === g);
      assert.ok(mine.length, `${spec}: ${l.t}의 칸`);
      assert.ok(l.x > Math.min(...mine.map((rc) => rc.x)) && l.x < Math.max(...mine.map((rc) => rc.x + rc.w)), `${spec}: "${l.t}" 자리 ${l.x}가 제 칸 밖`);
    }
  }
  // 똑같이 나누기 — 3/5 ÷ 2: 칸 5 × 2줄 · 칠한 기둥 3 · 진한 칸 3 (= 3/10)
  { const C = cellsOf(figureSvg('fbar share 3/5 2')); assert.equal(C.length, 10); assert.equal(C.filter((x) => x.on === '1').length, 6); assert.equal(C.filter((x) => x.pick === '1').length, 3); }
  // "진한 칸"(원고·풀이의 말) = 한 사람 몫만 진하다 — 칠한 칸은 모두 같은 색, 몫이 아닌 칠한 칸만 옅게 (3단계 헤드리스: 파랑·주황 두 색이면 파랑이 더 진해 보였다)
  for (const spec of ['share 3/5 2', 'share 2/3 3', 'share 4/7 2']) {
    const rects = [...figureSvg(`fbar ${spec}`).matchAll(/<rect class="fb-c"[^>]*?fill="([^"]+)"[^>]*?(?:fill-opacity="([\d.]+)" )?data-on="(\d)" data-pick="(\d)"/g)].map((m) => ({ fill: m[1], op: m[2] ? +m[2] : 1, on: m[3] === '1', pick: m[4] === '1' }));
    const on = rects.filter((x) => x.on);
    assert.equal(new Set(on.map((x) => x.fill)).size, 1, `${spec}: 칠한 칸이 두 색`);
    for (const x of on) assert.ok(x.pick ? x.op === 1 : x.op < 0.5, `${spec}: 진한 칸 ${x.pick} · 불투명도 ${x.op}`);
    assert.equal(rects.filter((x) => x.pick).length, +spec.split(' ')[1].split('/')[0], `${spec}: 진한 칸 수 = 분자`);
  }
  // 1만큼 — 2/3만큼이 6: 칸 3 · 칠한 칸 2 · 위에 "6" · 아래 "1만큼 = ?"
  { const svg = figureSvg('fbar unit 2/3 6'); const C = cellsOf(svg); assert.equal(C.length, 3); assert.equal(C.filter((x) => x.on === '1').length, 2); assert.match(svg, /class="fb-v"[^>]*>6</); assert.match(svg, /1만큼 = \?/); }
  // 생성 문항의 그림도 지시문대로 — 문제 글의 식과 같은 수
  let n = 0;
  for (const { c, s, q } of every(['misread'])) {
    const m = /\[fbar (take|share|unit) ([^\]]+)\]/.exec(q.q);
    if (!m) continue;
    const shown = boldOf(q.q); const lhs = shown.split(' = ')[0];
    const [x, y] = m[2].split(' ');
    if (m[1] === 'take') assert.equal(lhs, `${x} ÷ ${y}`, `${c.id} #${s}: 그림 ${m[0]} ≠ 식 ${lhs}`);
    if (m[1] === 'share') assert.equal(lhs, `${x} ÷ ${y}`, `${c.id} #${s}: 그림 ${m[0]} ≠ 식 ${lhs}`);
    if (m[1] === 'unit') assert.equal(lhs, `${y} ÷ ${x}`, `${c.id} #${s}: 그림 ${m[0]} ≠ 식 ${lhs}`);
    assert.match(figText(q.q), /\(막대: /);
    assert.ok(figText(q.q, true).includes('(막대 그림)'));
    assert.ok(!renderFigures(q.q).includes('[fbar'), `${c.id} #${s}: renderFigures가 막대를 못 바꿈`);
    n++;
  }
  assert.ok(n > SEEDS / 2, `본 막대 ${n}`);
  for (const bad of ['fbar take 6/7 2/5', 'fbar take 6/7 3', 'fbar share 3/5 1', 'fbar unit 4/3 6', 'fbar take 40/7 1/7', 'fbar spin 1/2 3']) assert.equal(figureSvg(bad), '', bad);
});

test('📏 진단·사다리·한 편·배움 예비·내용 검사 · 글 속 분수는 세로로·대분수는 대분수로 그려진다', () => {
  const d = diagnosticSet(7, 5, OPTS);
  assert.equal(d.length, 5);
  assert.deepEqual(d.map((q) => q.concept), ['fdv.natdiv', 'fdv.mixnat', 'fdv.diff', 'fdv.flip', 'fdv.apply']);
  assert.deepEqual(placeFrom(d.map((q, i) => ({ concept: q.concept, correct: i < 2 }))), { startId: 'fdv.diff', knownIds: ['fdv.natdiv', 'fdv.fracnat', 'fdv.mixnat', 'fdv.same'] });
  const L0 = ladder([]);
  assert.equal(L0[0].state, 'now');
  assert.ok(L0.slice(1).every((r) => r.state === 'locked'));
  for (const c of FDIV) {
    const round = makeRound(c.id, 11, OPTS);
    assert.ok(round.length >= 2 && round.every((q) => q.concept === c.id), c.id);
    const les = lessonOf(c.id, 3, OPTS);
    assert.ok(les.pages.length >= 1 && les.title === c.name);
  }
  assert.ok(checkContent({}).length >= 9, '빈 원고는 칸마다 걸린다');
  const p = richParts('2 1/4 ÷ 3/8 = 6');
  assert.equal(p.filter((x) => x.k === 'm').length, 1, '대분수');
  assert.equal(p.filter((x) => x.k === 'f').length, 1, '분수');
});

// ───────────────────── 2단계: 원고 (coach/math/fracdiv.json) ─────────────────────

const CONTENT = JSON.parse(readFileSync(new URL('../coach/math/fracdiv.json', import.meta.url), 'utf8'));
const CAST = { me: '진우', mon: '피카츄', mon2: '리자몽' };
const fillC = (t) => String(t).replace(/\{(me|mon|mon2)(?:\/([^/}]+)\/([^}]+))?\}/g, (_, k, a, b) => {
  const n = CAST[k]; if (a === undefined) return n;
  const code = n.slice(-1).charCodeAt(0) - 0xac00; return n + (code >= 0 && code % 28 !== 0 ? a : b);
});
/** 원고 한 칸의 글 전부 (배움·확인 질문·보기·까닭·규칙·아빠 카드) */
const contentText = (v) => fillC([...v.lesson.flatMap((p) => [p.say, ...(p.check ? [p.check.q, p.check.ok, ...p.check.no, p.check.why] : [])]), v.rule, v.dad.goal, ...v.dad.say, v.dad.do, v.dad.pass, ...v.dad.traps.flatMap((t) => [t.kid, t.dad])].join('\n'));
/** 참이라고 내미는 글 — 배움 글·확인의 정답·까닭·규칙·아빠 카드 (오답 보기·아이 말(함정 kid)은 빼고) */
const truthText = (v) => fillC([...v.lesson.flatMap((p) => [p.say, ...(p.check ? [p.check.ok, p.check.why] : [])]), v.rule, v.dad.goal, ...v.dad.say, v.dad.do, v.dad.pass, ...v.dad.traps.map((t) => t.dad)].join('\n'));
/** 글 블록마다 (줄 규칙·셈식용) */
const blocksOf = (v) => [...v.lesson.flatMap((p) => [p.say, ...(p.check ? [p.check.why] : [])]), v.rule, v.dad.goal, ...v.dad.say, v.dad.do, v.dad.pass, ...v.dad.traps.map((t) => t.dad)].map(fillC);

test('원고(fracdiv.json)가 형식 검사를 통과한다 — 9칸이 사다리 순서대로 · 배움 4~5장·장마다 확인 질문·아빠 카드(말 2개↑·함정 2개↑·통과 기준)', () => {
  assert.deepEqual(checkContent(CONTENT), []);
  assert.deepEqual(Object.keys(CONTENT).filter((k) => k !== '_'), IDS);
  for (const id of IDS) {
    const v = CONTENT[id];
    assert.ok(v.lesson.length >= 4 && v.lesson.length <= 5, `${id}: 배움 ${v.lesson.length}장`);
    assert.ok(v.lesson.every((p) => p.check), `${id}: 장마다 확인 질문`);
    assert.ok(v.dad.say.length >= 2 && v.dad.traps.length >= 2 && v.dad.pass, `${id}: 아빠 카드`);
  }
  const L = lessonOf('fdv.flip', 3, { ...OPTS, content: CONTENT });
  assert.equal(L.pages.length, CONTENT['fdv.flip'].lesson.length);
  assert.ok(L.pages.every((p) => p.check && p.check.ok));
});

test('★ 원고 확인 질문도 따로 풀어 대조 — 전부 읽히고, 맞는 보기는 정답 하나뿐, 오답 하나하나가 이름표 있는 틀린 셈이다', () => {
  const allTags = Object.values(TAGS);
  let n = 0;
  for (const id of IDS) {
    CONTENT[id].lesson.forEach((p, i) => {
      const at = `${id}[${i}]`;
      const q = fillC(p.check.q);
      const sv = solveText(q);
      assert.notEqual(sv.type, 'unknown', `${at}: 못 읽는 확인 질문\n${q}`);
      const chs = [{ text: p.check.ok, ok: true }, ...p.check.no.map((t) => ({ text: t, ok: false }))];
      const right = rightOnes(sv, chs);
      assert.ok(right.length === 1 && right[0].ok, `${at} (${sv.type}): 맞는 보기 ${right.map((x) => x.text).join(', ') || '없음'}\n${q}`);
      for (const w of p.check.no) {
        const tags = allTags.filter((tg) => tagHolds(sv, tg, w));
        assert.ok(tags.length, `${at} (${sv.type}): 오답 "${w}" — 어느 틀린 셈에서도 안 나온다\n${q}`);
        n++;
      }
    });
  }
  assert.ok(n >= 70, `본 오답 ${n}`);
});

test('★ 원고의 셈식 — "= …"로 내려 쓴 줄까지 이어서 전부 맞다 · 한 줄에 "="는 둘까지 (폰에서 식 한가운데가 끊기지 않게)', () => {
  let n = 0;
  for (const id of IDS) {
    for (const b of blocksOf(CONTENT[id])) {
      const t = b.replace(/\[[a-z]+ [^\]]+\]/g, '');
      for (const line of t.split('\n')) assert.ok((line.match(/ = /g) || []).length <= 2, `${id}: 한 줄에 = 셋 이상 "${line}"`);
      for (const e of eqChains(t.replace(/\n= /g, ' = '))) { assert.ok(e.ok, `${id}: ${e.a} = ${e.b}`); n++; }
    }
  }
  assert.ok(n >= 120, `본 셈식 ${n}`);
});

test('🎨 원고의 그림: 모두 그려진다 (나눗셈 막대·분수 막대만) · 막대가 있는 장은 글에 같은 식 · "N묶음"은 그림의 묶음 수', () => {
  let n = 0;
  for (const id of IDS) {
    CONTENT[id].lesson.forEach((p, i) => {
      for (const t of [p.say, p.check.q]) {
        for (const m of t.matchAll(/\[([a-z]+) ([^\]]+)\]/g)) {
          assert.ok(['fbar', 'bar'].includes(m[1]), `${id}[${i}]: 그림 ${m[0]}`);
          assert.ok(figureSvg(`${m[1]} ${m[2]}`).startsWith('<svg'), `${id}[${i}]: 못 그리는 ${m[0]}`);
          n++;
        }
      }
      const fb = /\[fbar (take|share|unit) (\S+) (\S+)\]/.exec(p.say);
      if (!fb) return;
      const [, mode, x, y] = fb;
      const want = mode === 'unit' ? `${y} ÷ ${x}` : `${x} ÷ ${y}`;
      assert.ok(p.say.replace(/\[[^\]]+\]/g, '').includes(want), `${id}[${i}]: 그림 ${fb[0]}인데 글에 "${want}"이 없다`);
      if (mode === 'take') {
        const svg = figureSvg(fb[0].slice(1, -1));
        const groups = new Set([...svg.matchAll(/data-g="(\d+)"/g)].map((g) => g[1]).filter((g) => g !== '0')).size;
        for (const g of p.say.matchAll(/(\d+)묶음/g)) assert.equal(+g[1], groups, `${id}[${i}]: 글 "${g[0]}" ≠ 그림 ${groups}묶음`);
      }
    });
  }
  assert.ok(n >= 10, `원고 그림 ${n}`);
});

test('★ 원고의 조사·아직 안 배운 말·틀린 말 (배움 글·확인 질문·아빠 카드 전부) — 수 뒤는 읽는 소리 · 분수와 단위 글자 바로 뒤 조사 없음 · "뒤집"은 T7부터', () => {
  const BAT = new Set(['0', '1', '3', '6', '7', '8']);
  const PAIRS = [['을', '를'], ['은', '는'], ['이', '가'], ['과', '와'], ['이에요', '예요'], ['이라서', '라서']];
  let hitN = 0;
  for (const id of IDS) {
    const all = contentText(CONTENT[id]).replace(/\*\*/g, '').replace(/\[[a-z]+ [^\]]+\]/g, '');
    for (const [wb, nb] of PAIRS) {
      for (const m of all.matchAll(new RegExp(`(?<![\\d/])(\\d+)(${wb}|${nb})(?=[\\s.,!?)—"]|$)`, 'g'))) { assert.equal(m[2], BAT.has(m[1].slice(-1)) ? wb : nb, `${id}: "…${m[1]}${m[2]}"`); hitN++; }
    }
    for (const m of all.matchAll(/(?<![\d/])(\d+)(으로|로)(?=[\s.,"]|$)/g)) { assert.equal(m[2], ['1', '7', '8'].includes(m[1].slice(-1)) ? '로' : BAT.has(m[1].slice(-1)) ? '으로' : '로', `${id}: "…${m[1]}${m[2]}"`); hitN++; }
    const fp = FRAC_JOSA.exec(all); assert.ok(!fp, `${id}: 분수 바로 뒤 조사 "${fp && fp[0]}"`);
    const up = UNIT_JOSA.exec(all); assert.ok(!up, `${id}: 단위 글자 바로 뒤 조사 "${up && up[0]}"`);
    assert.ok(!/-\d|\d-/.test(all), `${id}: ASCII 빼기`);
    if (IDS.indexOf(id) < IDS.indexOf('fdv.flip')) assert.ok(!/뒤집/.test(all), `${id}: 아직 안 배운 "뒤집"`);
    // 문자 분수(a/b)는 쓰지 않는다 — 초6에는 문자가 없고, 문자 분수 그리기는 D·Q·R 줄기에만 (tests/mathexpr.test.js가 다른 줄기를 막는다)
    assert.ok(!/[a-z]\/[a-z\d]|\d\/[a-z]/.test(all), `${id}: 문자 분수`);
    const truth = truthText(CONTENT[id]).replace(/\*\*/g, '');
    for (const [re, why] of BAD) assert.ok(!re.test(truth), `${id}: ${why}`);
  }
  assert.ok(hitN >= 40, `실제로 본 조사 ${hitN}`);
});

test('원고는 배포 파일 검사(check.mjs)에도 걸린다 — fracdiv.json → mathfdiv.js의 checkContent', () => {
  const src = readFileSync(new URL('../tools/check.mjs', import.meta.url), 'utf8');
  assert.ok(src.includes("'coach/math/fracdiv.json': '../js/mathfdiv.js'"));
});

// ───────────────────── 3단계: 화면 연결 ─────────────────────

test('화면 연결 (3단계): STEMS.fracdiv(T)는 이 생성기·원고를 쓰고 U 분수의 곱셈 바로 뒤 · 앱 셸이 둘 다 들고 간다 · 사다리 안내에 A 분수 줄기 · 나눗셈 막대를 📊·❓가 안다', async () => {
  const { STEMS, STEM_ORDER, stemOf } = await import('../js/mathprog.js');
  assert.equal(STEMS.fracdiv.code, 'T');
  assert.equal(STEM_ORDER[STEM_ORDER.indexOf('fracmul') + 1], 'fracdiv', 'U 분수의 곱셈 바로 뒤 (A → U → T, 2026-10-07 U가 끼어듦)');
  assert.equal(STEMS.fracdiv.list, FDIV);
  assert.equal(STEMS.fracdiv.gen.makeQuestion, makeQuestion);
  assert.equal(STEMS.fracdiv.gen.lessonOf, lessonOf, '📚 배움은 이 생성기의 lessonOf');
  assert.equal(STEMS.fracdiv.lesson, true);
  assert.equal(STEMS.fracdiv.file, './coach/math/fracdiv.json');
  assert.equal(STEMS.fracdiv.range, '초6');
  assert.ok(IDS.every((id) => stemOf(id) === STEMS.fracdiv), '모든 칸이 T 줄기로 찾아진다');
  assert.match(STEMS.fracdiv.pick, /A 분수 줄기\(분수 × 분수까지\)를 먼저/);
  // 사다리 안내·첫 안내에도 아직 안 배운 말("뒤집")이 없다
  assert.ok(!/뒤집/.test(`${STEMS.fracdiv.pick} ${STEMS.fracdiv.intro}`));
  const sw = readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
  for (const f of ['./js/mathfdiv.js', './coach/math/fracdiv.json']) assert.ok(sw.includes(`'${f}'`), `APP_SHELL에 ${f}`);
  // 📊 펼친 문제 글(figText)·❓ 복사문·📊 답장 안내 — 나눗셈 막대를 안다, 안내의 예는 그대로 그려진다
  assert.equal(figText('앞 [fbar take 6/7 2/7] 뒤', true), '앞 (막대 그림) 뒤');
  const ask = readFileSync(new URL('../js/mathask.js', import.meta.url), 'utf8');
  const stats = readFileSync(new URL('../js/stats.js', import.meta.url), 'utf8');
  assert.ok(ask.includes('[fbar take 6/7 2/7]') && stats.includes('[fbar take 6/7 2/7]'), '❓ 복사문·📊 답장 안내에 [fbar] 예');
  assert.ok(renderFigures('[fbar take 6/7 2/7]').startsWith('<svg'), '안내의 예도 그려진다');
  // T는 ± 키가 없다 — 분수의 나눗셈엔 음수가 없다
  for (const { c, s, q } of every(['calc'], 60)) {
    const spec = padSpec(q, 'fracdiv');
    if (spec) assert.equal(spec.signed, false, `${c.id} #${s}: ± 키`);
  }
});

// ── 🔍 Codex 35차 (2026-10-07) ──
test('🔍 Codex 35차 #9 — "자연수로 나누면 작아져요"는 2 이상인 자연수로만 (1로 나누면 그대로) — 오답 풀이·칸 설명·원고', () => {
  const loose = /(?<!2 이상인 |1보다 큰 )자연수로 나누면 (?:몫이 )?(?:처음보다 )?작아/;
  for (const { c, k, s, q } of every()) {
    const t = q.solve ? [...q.solve.steps, ...Object.values(q.solve.why), q.solve.whyAny, q.solve.rule].join('\n') : '';
    assert.ok(!loose.test(t), `${c.id} ${k} #${s}: 1로 나누면 그대로\n${t}`);
  }
  for (const c of FDIV) assert.ok(!loose.test([c.idea, c.rule, c.slip].join('\n')), c.id);
  for (const v of CONTENT.cells || Object.values(CONTENT)) if (v && v.lesson) assert.ok(!loose.test(contentText(v)), '원고');
});

test('🔍 Codex 35차 #10 — 물통 이야기는 "빈 물통을 가득 — 모두 몇 L" (더 부을 물로 읽히지 않게) · 원고 확인 질문도 같은 말', () => {
  let n = 0;
  for (const { q } of every(['calc', 'misread'])) {
    if (!/물통의/.test(q.q)) continue;
    n++;
    assert.match(q.q, /빈 물통을 가득 채우려면 물이 모두 몇 L 들까요\?/, q.q);
  }
  assert.ok(n > 0, '물통 이야기가 나온다');
  const raw = readFileSync(new URL('../coach/math/fracdiv.json', import.meta.url), 'utf8');
  assert.ok(!/(?<!빈 )물통을 가득 채우려면 물이 몇 L/.test(raw), '원고에 옛 말이 없다');
});
