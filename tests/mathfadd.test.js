// ➕ V 분수의 덧셈·뺄셈 줄기 — 생성기 테스트.
// ★ 정답·오답은 이 파일이 **문제 글을 따로 읽어** 분수 계산기로 다시 푼다 (생성기의 계산을 쓰지 않는다).
//   이름표 판정은 생성기 이름표를 보지 않고 **그 틀린 셈이 실제로 한 일**로, 셈의 순서(어느 수가 빼지는 수인지)까지 보고 다시 계산한다
//   (메모 stem-generator-pitfalls 38·40번, U 2단계).
// 함정(stem-generator-pitfalls)을 처음부터: 분수 바로 뒤 조사 · 단위 글자 뒤 조사 · 쌍둥이 틀 · 오답끼리 같은 값 · 우연히 맞는 값 ·
//   ② 보기 결론의 수 · 숫자판으로 모든 보기(+ 화면에서 빠진 후보)를 쳐 보기 · 참말 금지 · 글 속 셈식(대분수까지) ·
//   그림 칸 수 = 지시문 = 문제 글의 식 · 아직 안 배운 말(통분·약분은 V6부터, 받아올림 V2·받아내림 V4부터)

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { FADD, TAGS, makeQuestion, makeRound, ladder, placeFrom, diagnosticSet, lessonOf, checkContent, gradeLabel } from '../js/mathfadd.js';
import { tplKey } from '../js/mathgen.js';
import { figureSvg, renderFigures, figText } from '../js/mathdraw.js';
import { padSpec, readTyped, matchTyped, partsOf } from '../js/mathpad.js';

const OPTS = { names: ['피카츄', '리자몽', '개굴닌자'], me: '진우', worlds: { pokemon: [], toystory: [], minions: [], moana: [] } };
const SEEDS = Number(process.env.RNG_SEEDS) || 300;
const IDS = FADD.map((c) => c.id);
const GRADE4 = IDS.slice(0, 5); // 분모를 그대로 둔 꼴(약분 전)로 답하는 칸

// ───────────────────── 이 파일의 분수 셈 ─────────────────────

const gcd = (a, b) => (b ? gcd(b, a % b) : Math.abs(a));
const lcm = (a, b) => (a / gcd(a, b)) * b;
const Q = (n, d = 1) => { if (d < 0) { n = -n; d = -d; } const k = gcd(n, d) || 1; return { n: n / k, d: d / k }; };
const add = (x, y) => Q(x.n * y.d + y.n * x.d, x.d * y.d);
const sub = (x, y) => Q(x.n * y.d - y.n * x.d, x.d * y.d);
const mul = (x, y) => Q(x.n * y.n, x.d * y.d);
const div = (x, y) => Q(x.n * y.d, x.d * y.n);
const eq = (x, y) => !!(x && y && x.n * y.d === y.n * x.d);
const cmpQ = (x, y) => x.n * y.d - y.n * x.d;
const show = (x) => (x ? `${x.n}/${x.d}` : String(x));
/** 수 하나의 글자 → 값: "3" · "3/4" · "2 1/3" · "2 5/4"(받아내린 꼴) (못 읽으면 null) */
function val(t) {
  const s = String(t).trim(); let m;
  if ((m = /^(\d+) (\d+)\/(\d+)$/.exec(s))) return Q(+m[1] * +m[3] + +m[2], +m[3]);
  if ((m = /^(\d+)\/(\d+)$/.exec(s))) return Q(+m[1], +m[2]);
  if ((m = /^(\d+)$/.exec(s))) return Q(+m[1]);
  return null;
}
/** 수 글자 → 조각: { w, n, d } (자연수는 n = 0, d = 1 · 분수는 w = 0) */
function partsOfNum(t) {
  const s = String(t).trim(); let m;
  if ((m = /^(\d+) (\d+)\/(\d+)$/.exec(s))) return { w: +m[1], n: +m[2], d: +m[3], kind: 'mixed' };
  if ((m = /^(\d+)\/(\d+)$/.exec(s))) return { w: 0, n: +m[1], d: +m[2], kind: 'frac' };
  if ((m = /^(\d+)$/.exec(s))) return { w: +m[1], n: 0, d: 1, kind: 'int' };
  return null;
}
const fracOf = (p) => Q(p.n, p.d);
/** 식 계산기 — 자연수·분수·대분수(분수 부분이 1 이상이어도)·+ − × ÷·괄호. 못 읽으면 throw */
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
/** 글 끝의 수 (결론) */
function lastNum(t) {
  const all = [...String(t).matchAll(/(\d+ \d+\/\d+|\d+\/\d+|\d+)/g)];
  return all.length ? val(all[all.length - 1][1]) : null;
}
const bolds = (q) => [...String(q).matchAll(/\*\*(.+?)\*\*/g)].map((m) => m[1]);

// ───────────────────── 문제 글 읽기 ─────────────────────

/** "A + B" · "A − B" → { op, ops } */
function splitOp(e) {
  if (e.includes(' + ')) return { op: '+', ops: e.split(' + ') };
  if (e.includes(' − ')) return { op: '−', ops: e.split(' − ') };
  return null;
}
/** 문제 글 → { type, ans(값), f: { op('+'|'−'|'water'), ops(글자들) } } */
function solveText(q) {
  let m;
  if (/^다음을 계산하면 얼마일까요\?/.test(q)) { const e = bolds(q)[0]; const so = splitOp(e); return { type: `calc${so.op}`, ans: evalExpr(e), f: so }; }
  if ((m = /^\*\*□ \+ (.+?) = (.+?)\*\* — □에 알맞은 수/.exec(q))) return { type: 'box', ans: sub(val(m[2]), val(m[1])), f: { op: '−', ops: [m[2], m[1]] } };
  if ((m = /물이 (.+?) L 있었어요\. (\S+) L만큼 더 붓고 (\S+) L만큼 썼다면/.exec(q))) { const [X, Y, Z] = [m[1], m[2], m[3]].map(val); return { type: 'water', ans: sub(add(X, Y), Z), f: { op: 'water', ops: [m[1], m[2], m[3]] } }; }
  const story = [
    [/물을 (\S+) L 마시고, 조금 뒤에 (\S+) L 더 마셨어요/, '+', 'water2'],
    [/오전에 (\S+)시간, 오후에 (\S+)시간 연습했어요/, '+', 'practice'],
    [/어제 (.+?) km, 오늘 (.+?) km (?:걸었|달렸)어요/, '+', 'walk'],
    [/우유를 (\S+) L 마시고 주스를 (\S+) L 마셨어요/, '+', 'drinks'],
    [/주스 (\S+) L 중 (\S+) L만큼 마셨어요\. 남은/, '−', 'juice'],
    [/리본 (.+?) m 중 (.+?) m만큼 잘라 썼어요/, '−', 'ribbon'],
    [/물 (\d+) L 중 (.+?) L만큼 썼어요/, '−', 'waterLeft'],
    [/철사 (.+?) m 중 (.+?) m만큼 썼어요/, '−', 'wire'],
    [/색 테이프 (\S+) m 중 (\S+) m만큼 썼어요/, '−', 'tape'],
    [/밀가루 (.+?) kg 중 (.+?) kg만큼 썼어요/, '−', 'flour'],
    [/초록 로봇은 (.+?) m, 파란 로봇은 (.+?) m 움직였어요\. 초록 로봇은 파란 로봇보다 몇 m 더/, '−', 'robot'],
  ];
  for (const [re, op, type] of story) {
    if ((m = re.exec(q))) {
      const ops = [m[1], m[2]]; const vals = ops.map(val);
      assert.ok(vals.every(Boolean), `이야기 수 ${ops}`);
      return { type, ans: op === '+' ? add(vals[0], vals[1]) : sub(vals[0], vals[1]), f: { op, ops } };
    }
  }
  return { type: 'unknown' };
}

/**
 * 이름표 뜻 — 그 틀린 생각을 문제 글의 수로 다시 한 값. f: { op, ops } (빼기는 ops[0]이 빼지는 수)
 * 판정표는 생성기 이름표를 베끼지 않는다 — 그 이름의 셈이 실제로 하는 일을 이 파일이 다시 쓴다.
 */
function tagHolds(f, tag, t) {
  const v = val(t); const is = (w) => !!w && !!v && eq(v, w);
  if (f.op === 'water') {
    const [X, Y, Z] = f.ops.map(val);
    if (tag === TAGS.allAdd) return is(add(add(X, Y), Z));
    if (tag === TAGS.dropLast) return is(add(X, Y));
    if (tag === TAGS.subAll) return is(sub(sub(X, Y), Z));
    return false;
  }
  const [P0, P1] = f.ops.map(partsOfNum); const [V0, V1] = f.ops.map(val);
  if (!P0 || !P1) return false;
  const plus = f.op === '+'; const minus = f.op === '−';
  const same = P0.d === P1.d || P0.kind === 'int' || P1.kind === 'int';
  const D = P0.kind === 'int' ? P1.d : P0.d; // 같은 분모일 때의 분모
  const L = lcm(P0.d, P1.d);
  const F0 = fracOf(P0); const F1 = fracOf(P1);
  const right = plus ? add(V0, V1) : sub(V0, V1);
  switch (tag) {
    // 같은 분모
    case TAGS.denToo: return plus && same && P0.kind !== 'int' && P1.kind !== 'int' && is(add(Q(P0.w + P1.w), Q(P0.n + P1.n, 2 * D)));
    case TAGS.addForSub: return minus && is(add(V0, V1));
    case TAGS.mulInstead: return P0.kind === 'frac' && P1.kind === 'frac' && P0.d === P1.d && is(Q(P0.n * P1.n, P0.d * P1.d));
    case TAGS.oneSide: return P0.kind === 'frac' && P1.kind === 'frac' && is(V0);
    // 대분수로 바꾸기 · 받아올림 (분수 부분끼리 더한 값이 1보다 클 때 1을 안 올림)
    case TAGS.dropOne: return plus && P0.w === 0 && P1.w === 0 && cmpQ(right, Q(1)) > 0 && is(sub(right, Q(1)));
    case TAGS.noCarry: return plus && (P0.w > 0 || P1.w > 0) && cmpQ(add(F0, F1), Q(1)) > 0 && is(sub(right, Q(1)));
    case TAGS.dropWhole: return plus && same && (P0.w > 0 || P1.w > 0) && is(add(F0, F1));
    case TAGS.badImproper: {
      const bad = (p) => (p.kind === 'mixed' ? Q(p.w + p.n, p.d) : val(p.kind === 'int' ? String(p.w) : `${p.n}/${p.d}`));
      return (P0.kind === 'mixed' || P1.kind === 'mixed') && is(plus ? add(bad(P0), bad(P1)) : sub(bad(P0), bad(P1)));
    }
    // 대분수 뺄셈 (빼지는 수 P0)
    case TAGS.wholeOnlySub: return minus && P1.w > 0 && is(add(Q(P0.w - P1.w), F0));
    case TAGS.fracOnlySub: return minus && same && P0.w > 0 && is(add(Q(P0.w), sub(F0, F1)));
    // (자연수)−(분수) · 받아내림
    case TAGS.keepFrac: return minus && P0.kind === 'int' && is(add(Q(P0.w - P1.w - 1), F1));
    case TAGS.numFromWhole: return minus && P0.kind === 'int' && P1.kind === 'frac' && is(Q(P0.w - P1.n, P1.d));
    case TAGS.noReduce: return minus && cmpQ(F0, F1) < 0 && is(add(right, Q(1))); // 받아내려야 하는 뺄셈에서 자연수를 1 안 줄임 = 바른 답 + 1
    case TAGS.swapSub: return minus && cmpQ(F0, F1) < 0 && is(add(Q(P0.w - P1.w), sub(F1, F0)));
    // 다른 분모 (A 줄기와 같은 말)
    case TAGS.denSum: return plus && P0.d !== P1.d && is(add(Q(P0.w + P1.w), Q(P0.n + P1.n, P0.d + P1.d)));
    case TAGS.noLcd: return plus && P0.d !== P1.d && is(add(Q(P0.w + P1.w), Q(P0.n + P1.n, L)));
    case TAGS.oneLcd: return P0.w === 0 && P1.w === 0 && P0.d !== P1.d && P0.d !== L && P1.d !== L && is(plus ? Q(P0.n * (L / P0.d) + P1.n, L) : Q(P0.n * (L / P0.d) - P1.n, L)); // 앞의 것만 통분
    case TAGS.denSub: return minus && P0.d > P1.d && P0.n > P1.n && P1.kind !== 'int' && is(add(Q(P0.w - P1.w), Q(P0.n - P1.n, P0.d - P1.d)));
    case TAGS.noLcdSub: return minus && P0.d !== P1.d && P0.n > P1.n && is(add(Q(P0.w - P1.w), Q(P0.n - P1.n, L)));
    default: return false;
  }
}

const allText = (q) => [q.q, ...q.choices.map((x) => x.text), ...(q.solve ? [...q.solve.steps, ...Object.values(q.solve.why), q.solve.whyAny, q.solve.rule] : [])].join('\n');
function* every(kinds = ['calc', 'misread'], n = SEEDS) {
  for (const c of FADD) for (const k of kinds) for (let s = 1; s <= n; s++) yield { c, k, s, q: makeQuestion(c.id, k, s, OPTS) };
}

// ───────────────────── 사다리 ─────────────────────

test('사다리: 9칸, V1~V5 초4 · V6~V9 초5, needs가 바로 앞 칸 · 맨 뒤는 ⭐ · 교과서 차시 순서', () => {
  assert.deepEqual(IDS, ['fadd.same', 'fadd.mixadd', 'fadd.sub', 'fadd.whole', 'fadd.borrow', 'fadd.diff', 'fadd.dmixadd', 'fadd.dmixsub', 'fadd.apply']);
  FADD.forEach((c, i) => {
    assert.equal(c.grade, i < 5 ? 4 : 5, c.id);
    assert.deepEqual(c.needs, i ? [IDS[i - 1]] : [], c.id);
    assert.ok(c.idea && c.rule && c.slip, c.id);
  });
  assert.equal(gradeLabel(4), '초4');
  assert.match(FADD[8].name, /^⭐/);
});

test('계산기 자체 점검 — 대분수·받아내린 꼴(2 5/4)·끝의 수 · 이름표 판정의 몇 예 (지도서 271·288쪽 오답)', () => {
  assert.ok(eq(evalExpr('2 5/4 − 1 3/4'), Q(3, 2)));
  assert.ok(eq(evalExpr('3 1/4 − 1 3/4'), Q(3, 2)));
  assert.ok(eq(evalExpr('1/6 + 2/9'), Q(7, 18)));
  assert.ok(eq(lastNum('받아올려서 4 1/4'), Q(17, 4)));
  const f = (e) => splitOp(e);
  assert.ok(tagHolds(f('3 3/5 + 1 5/9'), TAGS.noCarry, '4 7/45'), '271쪽 받아올림 빠뜨림 (바른 답 5 7/45)');
  assert.ok(tagHolds(f('5 5/12 − 3 7/8'), TAGS.noReduce, '2 13/24'), '288쪽 받아내리고 자연수를 안 줄임');
  assert.ok(tagHolds(f('3 1/4 − 1 3/4'), TAGS.swapSub, '2 2/4'));
  assert.ok(tagHolds(f('1/2 + 1/3'), TAGS.denSum, '2/5'));
  assert.ok(tagHolds(f('1/2 + 1/3'), TAGS.noLcd, '2/6'));
  assert.ok(tagHolds(f('3 − 1 1/5'), TAGS.keepFrac, '1 1/5'));
  assert.ok(tagHolds(f('3 − 1/5'), TAGS.numFromWhole, '2/5'));
  assert.ok(!tagHolds(f('3/4 + 1/2'), TAGS.swapSub, '1/4'), '거꾸로 뺌은 빼기에서만');
  assert.throws(() => evalExpr('3 … 2'));
});

// ───────────────────── 문제 ─────────────────────

test('★ 독립 검산: ① 정답이 문제 글을 따로 읽어 푼 답과 같다 · 딱 하나만 맞다 · 답은 0보다 크다', () => {
  const types = new Set();
  for (const { c, s, q } of every(['calc'])) {
    const sv = solveText(q.q);
    assert.notEqual(sv.type, 'unknown', `${c.id} #${s}: 못 읽는 문제\n${q.q}`);
    const ok = q.choices.find((x) => x.ok);
    const right = q.choices.filter((x) => eq(val(x.text), sv.ans));
    assert.equal(right.length, 1, `${c.id} #${s} (${sv.type}): 맞는 보기 ${right.map((x) => x.text).join(', ') || '없음'}\n${q.q}\n${q.choices.map((x) => x.text).join(' | ')}`);
    assert.equal(right[0], ok, `${c.id} #${s}: 정답 표시 "${ok.text}" ≠ 따로 푼 "${right[0].text}"\n${q.q}`);
    assert.ok(sv.ans.n > 0, `${c.id} #${s}: 답 ${show(sv.ans)}`);
    types.add(`${c.id}:${sv.type}`);
  }
  assert.ok(types.size >= 20, `문제 종류 ${types.size}: ${[...types]}`);
});

test('★ 보기: 정답 하나, 글자 겹침 없음, 3개 이상, 빈 글자·undefined·NaN·남은 자리표시 없음 · ① 계산엔 그림 없음 · ② 그림은 막대·뺄셈 막대만, 모두 그려진다', () => {
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
      assert.match(d, /^\[(bar|bars|fsub) /, `${at}: 다른 그림 ${d}`);
      assert.ok(figureSvg(d.slice(1, -1)).startsWith('<svg'), `${at}: 못 그리는 ${d}`);
      figs++;
    }
  }
  assert.ok(figs > SEEDS, `② 그림 ${figs}`);
});

test('★ 오개념 이름표: 그 오답이 정말 그 틀린 생각이다 — 문제 글의 수로 틀린 셈을 다시 한다 · 이름표 붙은 오답이 늘 둘 이상', () => {
  let n = 0;
  for (const { c, s, q } of every(['calc'])) {
    const sv = solveText(q.q);
    const tagged = q.choices.filter((x) => !x.ok && x.tag !== '계산 실수');
    assert.ok(tagged.length >= 2, `${c.id} #${s}: 이름표 붙은 오답 ${tagged.length}\n${q.q}`);
    for (const w of tagged) { assert.ok(tagHolds(sv.f, w.tag, w.text), `${c.id} #${s} (${sv.type}): "${w.text}"의 이름표 "${w.tag}"가 뜻과 다르다\n${q.q}`); n++; }
  }
  assert.ok(n > 18 * SEEDS, `본 이름표 ${n}`);
});

test('★ 오답끼리 같은 값·같은 글이 되지 않는다 — 보기에서 겹쳐 빠지기 전(probe.allWrong) · 빠진 오답도 이름표의 뜻 그대로 · 정답과 같은 값 없음', () => {
  for (const { c, s, q } of every(['calc'])) {
    const sv = solveText(q.q);
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

test('★ 수 보기 꼴: 4학년 칸(V1~V5)은 분모를 그대로 둔 꼴(약분 전) · 5학년 칸(V6~V9)은 기약분수·대분수 · 분수 부분은 진분수', () => {
  let g4 = 0; let g5 = 0;
  for (const { c, s, q } of every(['calc'])) {
    const sv = solveText(q.q);
    const P = sv.f.ops.map(partsOfNum); const dens = new Set(P.filter((p) => p.kind !== 'int').map((p) => p.d));
    for (const x of q.choices) {
      const p = partsOfNum(x.text);
      assert.ok(p, `${c.id} #${s}: 수가 아닌 보기 "${x.text}"`);
      if (p.kind === 'int') continue;
      assert.ok(p.n < p.d, `${c.id} #${s}: 분수 부분이 1 이상 "${x.text}"`);
      if (GRADE4.includes(c.id)) {
        // 분모를 그대로 둔다 — 문제의 분모 (분모끼리도 더함 2d · 곱셈으로 풂 d × d는 그 틀린 셈의 분모)
        const D = [...dens][0];
        const okDen = p.d === D || (x.tag === TAGS.denToo && p.d === 2 * D) || (x.tag === TAGS.mulInstead && p.d === D * D);
        assert.ok(dens.size === 1 && okDen, `${c.id} #${s}: 4학년 칸 보기 "${x.text}"의 분모 (문제 ${sv.f.ops})`);
        g4++;
      } else {
        assert.equal(gcd(p.n, p.d), 1, `${c.id} #${s}: 약분 안 된 보기 "${x.text}"`);
        g5++;
      }
    }
  }
  assert.ok(g4 > SEEDS && g5 > SEEDS, `본 보기 ${g4} · ${g5}`);
});

/** ② 문항 — 바른 값(문제 글에서 따로) · 보여 준 말 · 어림 문항의 기준 수 · 판정표용 식 */
function misreadFacts(q) {
  const B = bolds(q.q); const shown = B[B.length - 1] || '';
  let m;
  if ((m = /^덧셈 (.+?) — 결과를 어림해요/.exec(q.q))) return { shown, right: evalExpr(m[1]), base: val(/결과는 (\d+)보다 작아요/.exec(shown)[1]), f: splitOp(m[1]) };
  if ((m = /^\*\*□ \+ (.+?) = (.+?)\*\* — □를 구해요/.exec(q.q))) return { shown, right: sub(val(m[2]), val(m[1])), base: null, f: { op: '−', ops: [m[2], m[1]] } };
  if ((m = /초록 로봇은 (.+?) m, 파란 로봇은 (.+?) m 움직였어요/.exec(q.q))) return { shown, right: sub(val(m[1]), val(m[2])), base: null, f: { op: '−', ops: [m[1], m[2]] } };
  const left = shown.split(' = ')[0];
  return { shown, right: evalExpr(left), base: null, f: splitOp(left) };
}
test('★ ② 오개념 문항: 보여 준 말은 정말 틀렸다 · 고치는 말의 결론만 맞다 · 이름표 붙은 보기의 결론은 바른 값과 다르다 · 갈래 열쇠 둘씩 · 엉뚱한 지적은 거짓 단정', () => {
  const keys = {};
  for (const { c, s, q } of every(['misread'], Math.max(SEEDS, 600))) {
    (keys[c.id] = keys[c.id] || new Set()).add(q.key);
    const at = `${c.id} #${s} ${q.key}`;
    const { shown, right, base } = misreadFacts(q);
    assert.ok(right && right.n > 0, `${at}: 바른 값\n${q.q}`);
    if (base) assert.ok(cmpQ(right, base) > 0, `${at}: "작아요"가 맞는 말이다 — ${show(right)} vs ${show(base)}`);
    else assert.ok(!eq(lastNum(shown), right), `${at}: 보여 준 말 "${shown}"의 결론이 맞는 값\n${q.q}`);
    const ok = q.choices.find((x) => x.ok);
    assert.ok(eq(lastNum(ok.text), right), `${at}: 고치는 말 "${ok.text}"의 결론 ≠ ${show(right)}`);
    for (const w of q.choices.filter((x) => !x.ok)) {
      if (w.tag === '엉뚱한 지적') { assert.match(w.text, /(없어요|아니에요)$/, `${at}: 엉뚱한 지적은 거짓 단정으로 "${w.text}"`); continue; }
      if (w.tag === '틀린 줄 모름') { assert.equal(w.text, '맞게 말했어요'); continue; }
      assert.ok(!eq(lastNum(w.text), right), `${at}: 오개념 보기 "${w.text}"의 결론이 맞는 값`);
    }
    assert.ok(q.choices.some((x) => x.tag === '틀린 줄 모름'), `${at}: "맞게 말했어요" 보기`);
  }
  for (const id of IDS) assert.equal(keys[id].size, 2, `${id}: ② 갈래 ${[...keys[id]]}`);
});

test('★ ② 이름표 붙은 보기도 그 틀린 셈 — 보기 글의 결론을 문제의 수로 다시 계산 (② 판정표) · 보여 준 틀린 답도 판정표의 어느 틀린 셈', () => {
  let n = 0;
  const allTags = Object.values(TAGS);
  for (const { c, s, q } of every(['misread'], Math.max(SEEDS, 600))) {
    const { shown, f } = misreadFacts(q);
    for (const w of q.choices.filter((x) => !x.ok && !['엉뚱한 지적', '틀린 줄 모름'].includes(x.tag))) {
      const tail = /(\d+ \d+\/\d+|\d+\/\d+|\d+)$/.exec(w.text)[1];
      assert.ok(tagHolds(f, w.tag, tail), `${c.id} #${s}: ② 보기 "${w.text}"의 이름표 "${w.tag}"가 뜻과 다르다\n${q.q}`);
      n++;
    }
    // 보여 준 말의 틀린 답(어림 문항 빼고)도 근거 있는 틀린 셈이어야 한다 — 아무 수나 틀리게 쓰지 않는다
    if (!/결과를 어림해요/.test(q.q)) {
      const tail = /(\d+ \d+\/\d+|\d+\/\d+|\d+)$/.exec(shown)[1];
      assert.ok(allTags.some((tg) => tagHolds(f, tg, tail)), `${c.id} #${s}: 보여 준 답 "${tail}"이 어느 틀린 셈에서도 안 나온다\n${q.q}`);
    }
  }
  assert.ok(n >= 9 * 600, `본 ② 이름표 ${n}`);
});

// ───────────────────── 글 ─────────────────────

const FRAC_JOSA = /\/(?:\d+)(?:이에요|예요|이라서|라서|이니까|니까|이고|이면|이|가|은|는|을|를|와|과|도|으로|로|의|에)/;
const UNIT_JOSA = /(?<![가-힣a-z])(?:km|m|L|kg)(?:이에요|예요|이고|이면|이|가|은|는|을|를|와|과|으로|로)(?![가-힣])/;
const DIRECTIVES = /\[(?:bar|bars|fsub) [^\]]+\]/g;

test('★ 조사: 수 뒤는 읽는 소리 · 분수 바로 뒤에는 조사 없음 · 단위 글자(km·m·L·kg) 바로 뒤에도 없음 · ASCII 빼기 없음', () => {
  const BAT = new Set(['0', '1', '3', '6', '7', '8']);
  const PAIRS = [['을', '를'], ['은', '는'], ['이', '가'], ['과', '와'], ['이에요', '예요'], ['이니까', '니까'], ['이라서', '라서']];
  let hitN = 0;
  for (const { c, k, s, q } of every()) {
    const all = allText(q).replace(/\*\*/g, '').replace(DIRECTIVES, '');
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
  assert.ok(hitN > SEEDS, `실제로 본 곳 ${hitN}`);
  for (const c of FADD) {
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
    if (k === 'calc') assert.ok(sv.steps.join(' ').includes(ok), `${c.id} #${s}: 정답 "${ok}"이 풀이에 없다\n${sv.steps.join('\n')}`);
  }
});

/** 글 속 "식 = 식 = …" — 대분수(받아내린 꼴까지)를 계산기로 (② 보여 준 말·오답 보기는 빼고) */
function eqChains(text) {
  const out = [];
  // 연산 기호 바로 뒤에서는 식이 시작하지 않는다 — "□ + 2/5 = 7/10"을 "2/5 = 7/10"으로 읽지 않게
  for (const m of String(text).matchAll(/(?<![+−×÷] |[\d/])[\d(][\d /()+−×÷=]*[\d)]/g)) {
    const parts = m[0].split(' = ').map((x) => x.trim());
    if (parts.length < 2) continue;
    const vals = parts.map((p) => { try { return evalExpr(p); } catch { return null; } });
    for (let i = 1; i < vals.length; i++) if (vals[i - 1] && vals[i]) out.push({ a: parts[i - 1], b: parts[i], ok: eq(vals[i - 1], vals[i]) });
  }
  return out;
}
test('★ 글 속 셈식은 맞다 (대분수·받아내린 꼴까지) — 문제·정답·풀이·왜 전부 · 칸 설명도', () => {
  let n = 0;
  for (const { c, k, s, q } of every()) {
    const all = [q.q.replace(/\*\*.+?\*\*/g, ''), q.choices.find((x) => x.ok).text, ...q.solve.steps, ...Object.values(q.solve.why), q.solve.whyAny].join('\n');
    for (const e of eqChains(all)) { assert.ok(e.ok, `${c.id} ${k} #${s}: ${e.a} = ${e.b}`); n++; }
  }
  assert.ok(n > 10 * SEEDS, `셈식 ${n}`);
  let m = 0;
  for (const c of FADD) for (const e of eqChains(`${c.idea}\n${c.rule}`.replace(/\*\*/g, ''))) { assert.ok(e.ok, `${c.id} 설명: ${e.a} = ${e.b}`); m++; }
  assert.ok(m >= 15, `칸 설명 셈식 ${m}`);
});

test('🔁 쌍둥이·🤔 노트: 요청한 틀·갈래로 온다 · 같은 셈 · 쌍둥이 글이 원래 글과 같은 일은 드물다', () => {
  const same2 = {}; const tot = {};
  for (const c of FADD) {
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

/** 처음 배우는 말 — 그 앞 칸의 글·이름표에는 나오면 안 된다 (4학년 칸은 통분·약분 전) */
const FIRST = [[/통분/, 'fadd.diff'], [/약분/, 'fadd.diff'], [/최소공배수/, 'fadd.diff'], [/받아내/, 'fadd.whole'], [/받아올/, 'fadd.mixadd']];
test('★ 아직 안 배운 말을 앞 칸에 쓰지 않는다 — 통분·약분·최소공배수는 V6부터 · 받아올림 V2부터 · 받아내림 V4부터', () => {
  const idx = (id) => IDS.indexOf(id);
  const banned = (id) => FIRST.filter(([, at]) => idx(at) > idx(id));
  for (const c of FADD) for (const [re] of banned(c.id)) assert.ok(!re.test(`${c.name} ${c.idea} ${c.rule} ${c.slip}`), `${c.id}: 설명에 ${re}`);
  for (const { c, k, s, q } of every()) {
    const all = allText(q) + ' ' + q.choices.map((x) => x.tag || '').join(' ');
    for (const [re] of banned(c.id)) assert.ok(!re.test(all), `${c.id} ${k} #${s}: 아직 안 배운 ${re}\n${all}`);
  }
});

/** 참이라고 내미는 글에 틀린 말 — 오답 보기·② 보여 준 말은 빼고, 굵게(**)는 떼고 */
const BAD = [
  [/분모끼리(?:도)? 더해요|분모끼리(?:도)? 빼요/, '분모끼리 더하거나 빼지 않는다'],
  [/분모가 다르면 (?:더할|뺄) 수 없/, '통분하면 더하고 뺄 수 있다'],
  [/최소공배수로만|꼭 최소공배수/, '두 분모의 곱으로 통분해도 된다(2022 고려사항)'],
  [/받아내(?:리면|려도|린 다음에도) 자연수(?:는|가) 그대로/, '받아내리면 자연수는 1 작아진다'],
  [/거꾸로 빼도 돼/, '빼는 순서는 바꿀 수 없다'],
  [/(?:꼭|반드시) (?:약분|기약분수)/, '약분 안 한 답도 허용(2022 고려사항)'],
];
test('★ 참말에 틀린 말이 없다 — 분모끼리 더한다 · 분모가 다르면 못 더한다 · 최소공배수로만 · 받아내려도 자연수 그대로 · 꼭 약분', () => {
  const truths = (q) => [q.choices.find((x) => x.ok).text, ...(q.solve ? [...q.solve.steps, ...Object.values(q.solve.why), q.solve.whyAny, q.solve.rule] : [])].join('\n').replace(/\*\*/g, '');
  for (const { c, k, s, q } of every()) {
    const t = truths(q);
    for (const [re, why] of BAD) assert.ok(!re.test(t), `${c.id} ${k} #${s}: ${why}\n${t}`);
  }
  for (const c of FADD) for (const [re, why] of BAD) assert.ok(!re.test([c.idea, c.rule, c.slip].join('\n').replace(/\*\*/g, '')), `${c.id}: ${why}`);
});

test('🔢 숫자판: ① 모두 숫자판 · 분수·대분수 답도 칠 수 있다 · 모든 수 보기를 쳐서 그 보기로 간다 · 약분 안 한 답·약분한 답도 맞음 · ± 없음', () => {
  const pv = readFileSync(new URL('../js/padview.js', import.meta.url), 'utf8');
  const MAX = +/const MAX = (\d+);/.exec(pv)[1];
  let n = 0; let dropped = 0;
  for (const { c, s, q } of every(['calc'], 200)) {
    const spec = padSpec(q, 'fracadd');
    assert.ok(spec, `${c.id} #${s}: 숫자판이 없다\n${q.q}`);
    assert.equal(spec.need, null, `${c.id} #${s}: 꼴을 묻지 않는다 — ${spec.need}`);
    assert.equal(spec.signed, false, `${c.id} #${s}: ± 없음`);
    const typeAs = (text) => {
      let t = partsOf(text);
      if (t && t.mode === 'mixed' && !spec.modes.includes('mixed')) t = { mode: 'frac', p: { n: String(+t.p.w * +t.p.d + +t.p.n), d: t.p.d } };
      return t;
    };
    for (const ch of q.choices) {
      assert.ok(String(ch.text).length <= MAX, `${c.id} #${s}: "${ch.text}"`);
      const t = typeAs(ch.text);
      assert.ok(t && spec.modes.includes(t.mode), `${c.id} #${s}: "${ch.text}"를 칸으로 못 나눔`);
      const hit = matchTyped(q, readTyped(t.mode, t.p, spec), spec);
      assert.equal(q.choices[hit.i], ch, `${c.id} #${s}: "${ch.text}"를 쳐도 그 보기로 안 간다`);
      n++;
    }
    // 같은 값의 다른 꼴 — 약분 안 한 꼴(분자·분모 2배)·기약 꼴 모두 맞음
    const ok = val(q.choices.find((x) => x.ok).text);
    if (ok.d > 1) {
      for (const [nn, dd] of [[ok.n * 2, ok.d * 2], [ok.n, ok.d]]) {
        const hit = matchTyped(q, readTyped('frac', { n: String(nn), d: String(dd) }, spec), spec);
        assert.ok(q.choices[hit.i] && q.choices[hit.i].ok, `${c.id} #${s}: ${nn}/${dd}이 틀림`);
      }
    }
    // 화면에서 빠진 오개념 후보를 쳐도 그 이름표로 (Codex 36차 #3)
    for (const w of q.probe.allWrong) {
      if (q.choices.some((x) => x.text === w.text)) continue;
      const t = typeAs(w.text); const hit = matchTyped(q, readTyped(t.mode, t.p, spec), spec);
      if (q.choices[hit.i]) continue; // 같은 값의 다른 보기가 화면에 있다
      assert.equal(hit.known && hit.known.tag, w.tag, `${c.id} #${s}: 빠진 후보 "${w.text}"[${w.tag}]`);
      dropped++;
    }
  }
  assert.ok(n > 1000, `쳐 본 보기 ${n}`);
  assert.ok(dropped > 0, `빠진 후보 ${dropped}`);
});

// ───────────────────── 그림 ─────────────────────

const attrsOf = (svg, cls) => [...svg.matchAll(new RegExp(`<(?:rect|path|text) class="${cls}"([^>]*)>`, 'g'))].map((m) => {
  const o = {}; for (const a of m[1].matchAll(/([a-z-]+)="([^"]*)"/g)) o[a[1]] = a[2]; return o;
});
test('🎨 뺄셈 막대 [fsub]: 칠한 칸 = 빼지는 수 · 덜어 낸 칸 = 빼는 수(뒤에서부터, 옅게 + ✕) · 줄 이름 · 폭 400 · 글로 바꾸기 · 못 그리는 지시문은 빈 그림', () => {
  for (const [spec, d, ta, tb, rows] of [['3 1/4 | 1 3/4', 4, 13, 7, 4], ['3 | 1/5', 5, 15, 1, 3], ['1 | 2/3', 3, 3, 2, 1], ['5 5/12 | 3 7/12', 12, 65, 43, 6], ['2 3/8 | 2/8', 8, 19, 2, 3]]) {
    const svg = figureSvg(`fsub ${spec}`); const C = attrsOf(svg, 'fs-c');
    assert.equal(C.length, rows * d, `${spec}: 칸`);
    const on = C.filter((x) => x['data-on'] === '1'); const out = C.filter((x) => x['data-x'] === '1');
    assert.equal(on.length, ta, `${spec}: 칠한 칸`); assert.equal(out.length, tb, `${spec}: 덜어 낸 칸`);
    // 덜어 낸 칸은 칠한 칸의 맨 뒤 tb개
    const order = C.map((x) => +x['data-r'] * 1000 + Math.round(+x.x));
    const onOrder = on.map((x) => +x['data-r'] * 1000 + Math.round(+x.x)).sort((a, b) => a - b);
    const outOrder = out.map((x) => +x['data-r'] * 1000 + Math.round(+x.x)).sort((a, b) => a - b);
    assert.deepEqual(outOrder, onOrder.slice(ta - tb), `${spec}: 덜어 낸 칸이 뒤에서부터가 아니다`);
    assert.equal(order.length, C.length);
    for (const x of out) assert.ok(+x['fill-opacity'] < 0.5, `${spec}: 덜어 낸 칸은 옅게`);
    for (const x of on.filter((y) => y['data-x'] !== '1')) assert.ok(!x['fill-opacity'], `${spec}: 남은 칸은 진하게`);
    assert.equal(attrsOf(svg, 'fs-x').length, tb, `${spec}: ✕ 표시`);
    const labels = [...svg.matchAll(/class="fs-l"[^>]*>([^<]+)</g)].map((m) => m[1]);
    assert.deepEqual(labels, [...Array(Math.floor(ta / d)).fill('1'), ...(ta % d ? [`${ta % d}/${d}`] : [])], `${spec}: 줄 이름`);
    assert.ok(+/viewBox="0 0 (\d+)/.exec(svg)[1] <= 400);
  }
  for (const bad of ['fsub 1 | 3/2', 'fsub 2/5 | 3/5', 'fsub 1 1/4 | 1/3', 'fsub 3', 'fsub 9 | 1/2', 'fsub 1 1/4 | 1 1/4', 'fsub a | 1/2']) assert.equal(figureSvg(bad), '', bad);
  assert.match(figText('앞 [fsub 3 1/4 | 1 3/4] 뒤'), /^앞 \(막대: .+덜어 내면 6칸\) 뒤$/);
  assert.equal(figText('앞 [fsub 3 1/4 | 1 3/4] 뒤', true), '앞 (뺄셈 막대) 뒤');
  assert.ok(renderFigures('[fsub 3 1/4 | 1 3/4]').startsWith('<svg'));
});

test('🎨 ② 그림은 문제의 식 그대로 — [bar a/d+b/d]·[bars a/b c/d]는 더하는 두 수 · [fsub A | B]는 빼지는 수 | 빼는 수', () => {
  const seen = { bar: 0, bars: 0, fsub: 0 };
  for (const { c, s, q } of every(['misread'], Math.max(SEEDS, 600))) {
    const m = /\[(bar|bars|fsub) ([^\]]+)\]/.exec(q.q);
    if (!m) continue;
    const lhs = misreadFacts(q).shown.split(' = ')[0];
    const want = m[1] === 'bar' ? m[2].replace('+', ' + ') : m[1] === 'bars' ? m[2].split(' ').join(' + ') : m[2].replace(' | ', ' − ');
    assert.equal(lhs, want, `${c.id} #${s}: 그림 ${m[0]} ≠ 식 ${lhs}`);
    assert.ok(!renderFigures(q.q).includes(`[${m[1]} `), `${c.id} #${s}: renderFigures가 그림을 못 바꿈`);
    seen[m[1]]++;
  }
  assert.ok(seen.bar > 50 && seen.bars > 50 && seen.fsub > 100, `본 그림 ${JSON.stringify(seen)}`);
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
  for (const c of FADD) {
    const round = makeRound(c.id, 11, OPTS);
    assert.ok(round.length >= 2 && round.every((q) => q.concept === c.id), c.id);
    const les = lessonOf(c.id, 3, OPTS);
    assert.ok(les.pages.length >= 1 && les.title === c.name);
  }
  assert.ok(checkContent({}).length >= 9, '빈 원고는 칸마다 걸린다');
});

// 교과서는 받아올림 없는·있는 덧셈, 받아내림 없는·있는 뺄셈을 따로 가르친다 (5-1 지도서 248쪽 흐름도) — 문항 가족이 내기로 한 모양을 지키는지
//   (V1은 합이 1보다 작은·큰 진분수 덧셈 — 4-2 교과서 덧셈 (1))
test('받아올림·받아내림 모양: 문항이 적어 둔 모양(probe.carry·borrow)이 실제 수와 같다 · 칸마다 두 모양이 다 나온다', () => {
  const shapes = {};
  for (const { c, s, q } of every(['calc'])) {
    const pr = q.probe; if (!('carry' in pr) && !('borrow' in pr)) continue;
    const sv = solveText(q.q); const [P0, P1] = sv.f.ops.map(partsOfNum);
    const fsum = add(fracOf(P0), fracOf(P1));
    if ('carry' in pr) {
      assert.equal(sv.f.op, '+', `${c.id} #${s}`);
      assert.equal(pr.carry, cmpQ(fsum, Q(1)) > 0, `${c.id} #${s}: 받아올림 ${pr.carry}인데 분수 부분의 합 ${show(fsum)}\n${q.q}`);
    } else {
      assert.equal(sv.f.op, '−', `${c.id} #${s}`);
      assert.equal(pr.borrow, cmpQ(fracOf(P0), fracOf(P1)) < 0, `${c.id} #${s}: 받아내림 ${pr.borrow}인데 ${sv.f.ops}\n${q.q}`);
    }
    const key = `${c.id}:${'carry' in pr ? pr.carry : pr.borrow}`; shapes[key] = (shapes[key] || 0) + 1;
  }
  for (const id of ['fadd.same', 'fadd.mixadd', 'fadd.diff', 'fadd.dmixadd', 'fadd.dmixsub']) for (const v of [true, false]) assert.ok((shapes[`${id}:${v}`] || 0) >= SEEDS / 20, `${id} 모양 ${v}: ${shapes[`${id}:${v}`] || 0}`);
});

test('칸마다 수의 꼴 — V1·V3 진분수끼리 · V2·V5·V7·V8 대분수끼리 · V4 빼지는 수는 자연수 · V5·V8 받아내림 문항은 분수 부분이 모자란다 · V6 이후 분모가 다르다', () => {
  const kinds = (id, s) => { const sv = solveText(makeQuestion(id, 'calc', s, OPTS).q); return { sv, P: sv.f.ops.map(partsOfNum) }; };
  for (let s = 1; s <= SEEDS; s++) {
    { const { P } = kinds('fadd.same', s); assert.ok(P.every((p) => p.kind === 'frac') && P[0].d === P[1].d, `V1 #${s}`); }
    { const { P } = kinds('fadd.mixadd', s); assert.ok(P.every((p) => p.kind === 'mixed') && P[0].d === P[1].d, `V2 #${s}`); }
    { const { P } = kinds('fadd.whole', s); assert.ok(P[0].kind === 'int' && P[1].kind !== 'int', `V4 #${s}`); }
    { const { P, sv } = kinds('fadd.borrow', s); assert.ok(P.every((p) => p.kind === 'mixed') && P[0].n < P[1].n && sv.f.op === '−', `V5 #${s}: 받아내림`); }
    for (const id of ['fadd.diff', 'fadd.dmixadd', 'fadd.dmixsub']) { const { P } = kinds(id, s); assert.ok(P[0].d !== P[1].d, `${id} #${s}: 분모가 같다`); }
    { const { P } = kinds('fadd.dmixadd', s); assert.ok(P.every((p) => p.kind === 'mixed'), `V7 #${s}`); }
  }
});

// ───────────────────── 2단계: 원고 (coach/math/fracadd.json) ─────────────────────

const CONTENT = JSON.parse(readFileSync(new URL('../coach/math/fracadd.json', import.meta.url), 'utf8'));
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
/** 원고 확인 질문 하나씩 — { id, i, at, p, sv(따로 읽은 문제) } */
function* checksOf() {
  for (const id of IDS) for (const [i, p] of CONTENT[id].lesson.entries()) yield { id, i, at: `${id}[${i}]`, p, sv: solveText(fillC(p.check.q)) };
}

test('원고(fracadd.json)가 형식 검사를 통과한다 — 9칸이 사다리 순서대로 · 배움 4~5장·장마다 확인 질문·아빠 카드(말 2개↑·함정 2개↑·통과 기준)', () => {
  assert.deepEqual(checkContent(CONTENT), []);
  assert.deepEqual(Object.keys(CONTENT).filter((k) => k !== '_'), IDS);
  for (const id of IDS) {
    const v = CONTENT[id];
    assert.ok(v.lesson.length >= 4 && v.lesson.length <= 5, `${id}: 배움 ${v.lesson.length}장`);
    assert.ok(v.lesson.every((p) => p.check), `${id}: 장마다 확인 질문`);
    assert.ok(v.dad.say.length >= 2 && v.dad.traps.length >= 2 && v.dad.pass, `${id}: 아빠 카드`);
  }
  const L = lessonOf('fadd.borrow', 3, { ...OPTS, content: CONTENT });
  assert.equal(L.pages.length, CONTENT['fadd.borrow'].lesson.length);
  assert.ok(L.pages.every((p) => p.check && p.check.ok));
  assert.equal(L.rule, CONTENT['fadd.borrow'].rule);
});

/** 글에 그 수(또는 식)가 낱개로 있는가 — "1/6"이 "4 1/6"의 일부로 잡히지 않게 (U 2단계) */
const hasNum = (text, w) => new RegExp(`(?<![\\d/])(?<!\\d )${String(w).replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')}(?![\\d/])`).test(text);
test('★ 원고 확인 질문도 따로 풀어 대조 — 전부 읽히고, 맞는 보기는 정답 하나뿐(값으로), 오답 하나하나가 이름표 있는 틀린 셈(빼지는 수 순서까지) · 오답끼리 값이 다르다 · 까닭은 정답·오답을 낱개 수로 다 말한다', () => {
  const allTags = Object.values(TAGS);
  let n = 0; const types = new Set(); const used = new Set();
  for (const { id, at, p, sv } of checksOf()) {
    const q = fillC(p.check.q);
    assert.notEqual(sv.type, 'unknown', `${at}: 못 읽는 확인 질문\n${q}`);
    types.add(sv.type);
    assert.ok(sv.ans.n > 0, `${at}: 답 ${show(sv.ans)}`);
    const chs = [{ text: p.check.ok, ok: true }, ...p.check.no.map((t) => ({ text: t, ok: false }))];
    const right = chs.filter((x) => eq(val(x.text), sv.ans));
    assert.ok(right.length === 1 && right[0].ok, `${at} (${sv.type}): 맞는 보기 ${right.map((x) => x.text).join(', ') || '없음'} — 따로 푼 답 ${show(sv.ans)}\n${q}`);
    for (const w of p.check.no) {
      assert.ok(val(w) && val(w).n > 0, `${at}: 오답 "${w}"이 수가 아니거나 0 이하`);
      const tags = allTags.filter((tg) => tagHolds(sv.f, tg, w));
      assert.ok(tags.length, `${at} (${sv.type}): 오답 "${w}" — 어느 틀린 셈에서도 안 나온다\n${q}`);
      tags.forEach((tg) => used.add(tg));
      assert.ok(hasNum(p.check.why, w), `${at}: 까닭에 오답 "${w}" 이야기가 없다`);
      n++;
    }
    const vals = p.check.no.map((w) => show(val(w)));
    assert.equal(new Set(vals).size, vals.length, `${at}: 오답끼리 값이 같다 ${p.check.no}`);
    assert.ok(hasNum(p.check.why, p.check.ok), `${at}: 까닭에 정답 "${p.check.ok}"이 없다`);
  }
  assert.ok(n >= 70, `본 오답 ${n}`);
  assert.ok(types.size >= 12, `확인 질문 종류 ${types.size}: ${[...types]}`);
  assert.ok(used.size >= 18, `원고 오답이 쓴 틀린 셈 ${used.size}: ${[...used]}`);
});

// 칸마다 그 칸의 셈 — 4학년 칸에 분모가 다른 문제가 오면 통분을 배우기 전이다 (설계 ①·FIRST)
const SHAPE = {
  'fadd.same': (f, P) => f.op === '+' && P.every((p) => p.kind === 'frac'),
  'fadd.mixadd': (f, P) => f.op === '+' && P.every((p) => p.kind === 'mixed'),
  'fadd.sub': (f, P) => f.op === '−' && P.every((p) => p.kind !== 'int'),
  'fadd.whole': (f, P) => f.op === '−' && P[0].kind === 'int' && P[1].kind !== 'int',
  'fadd.borrow': (f, P) => f.op === '−' && P.every((p) => p.kind === 'mixed') && P[0].n < P[1].n,
  'fadd.diff': (f, P) => P.every((p) => p.kind === 'frac'),
  'fadd.dmixadd': (f, P) => f.op === '+' && P.every((p) => p.kind === 'mixed'),
  'fadd.dmixsub': (f, P) => f.op === '−' && P.every((p) => p.kind === 'mixed'),
};
test('★ 원고 보기 꼴 — 칸마다 그 칸의 셈 · 4학년 칸(V1~V5)은 분모가 같은 문제·분모를 그대로 둔 꼴 · V6~V8은 분모가 다른 문제 · 5학년 칸은 기약 · 분수 부분은 진분수', () => {
  let g4 = 0; let g5 = 0;
  for (const { id, at, p, sv } of checksOf()) {
    const P = sv.f.ops.map(partsOfNum);
    const dens = new Set(P.filter((x) => x.kind !== 'int').map((x) => x.d));
    if (SHAPE[id]) assert.ok(SHAPE[id](sv.f, P), `${at}: 이 칸의 셈이 아니다 (${sv.f.ops.join(` ${sv.f.op} `)})`);
    if (GRADE4.includes(id)) assert.equal(dens.size, 1, `${at}: 4학년 칸에 분모가 다른 문제 ${sv.f.ops}`);
    if (['fadd.diff', 'fadd.dmixadd', 'fadd.dmixsub'].includes(id)) assert.equal(dens.size, 2, `${at}: 분모가 같은 문제 ${sv.f.ops}`);
    for (const [k, t] of [p.check.ok, ...p.check.no].entries()) {
      const x = partsOfNum(t);
      assert.ok(x, `${at}: 수가 아닌 보기 "${t}"`);
      if (x.kind === 'int') continue;
      assert.ok(x.n < x.d, `${at}: 분수 부분이 1 이상 "${t}"`);
      if (GRADE4.includes(id)) {
        // 분모를 그대로 둔다 — 문제의 분모 (분모끼리도 더함 2d · 곱셈으로 풂 d × d는 그 틀린 셈의 분모)
        const D = [...dens][0];
        const okDen = x.d === D || (k > 0 && tagHolds(sv.f, TAGS.denToo, t) && x.d === 2 * D) || (k > 0 && tagHolds(sv.f, TAGS.mulInstead, t) && x.d === D * D);
        assert.ok(okDen, `${at}: 4학년 칸 보기 "${t}"의 분모 (문제 ${sv.f.ops})`);
        g4++;
      } else {
        assert.equal(gcd(x.n, x.d), 1, `${at}: 약분 안 된 보기 "${t}"`);
        g5++;
      }
    }
  }
  assert.ok(g4 >= 30 && g5 >= 30, `본 보기 ${g4} · ${g5}`);
});

test('★ 원고의 셈식 — "= …"로 내려 쓴 줄까지 이어서 전부 맞다 (대분수·받아내린 꼴까지) · 한 줄에 "="는 둘까지 (폰에서 식 한가운데가 끊기지 않게)', () => {
  let n = 0;
  for (const id of IDS) {
    for (const b of blocksOf(CONTENT[id])) {
      const t = b.replace(/\[[a-z]+ [^\]]+\]/g, '').replace(/\*\*/g, '');
      for (const line of t.split('\n')) assert.ok((line.match(/ = /g) || []).length <= 2, `${id}: 한 줄에 = 셋 이상 "${line}"`);
      for (const e of eqChains(t.replace(/\n= /g, ' = '))) { assert.ok(e.ok, `${id}: ${e.a} = ${e.b}`); n++; }
    }
  }
  assert.ok(n >= 150, `본 셈식 ${n}`);
});

// 🔍 Codex 36차 #2 (U) — 아빠 카드 활동의 대분수 양과 그 가분수 식이 어긋나도 식 하나하나는 참이라 셈식 검사가 못 잡는다
test('★ 원고 아빠 카드: 활동에 나온 대분수 양을 가분수로 쓴 식은 그 대분수와 같은 값 · 통과 기준의 식과 괄호 속 답이 맞다', () => {
  let pass = 0;
  for (const id of IDS) {
    const d = CONTENT[id].dad;
    for (const b of [d.goal, ...d.say, d.do, d.pass].map(fillC)) {
      const qty = [...b.matchAll(/(?<![\d/])(?<!= )(\d+) (\d+)\/(\d+)(?![\d/])/g)].map((m) => ({ t: m[0], w: +m[1], n: +m[2], d: +m[3] }));
      const imp = [...b.matchAll(/(?<![\d/])(?<!\d )(\d+)\/(\d+)(?![\d/])/g)].map((m) => ({ p: +m[1], d: +m[2] })).filter((x) => x.p > x.d);
      for (const m of qty) {
        const same = imp.filter((x) => x.d === m.d);
        if (same.length) assert.ok(same.some((x) => x.p === m.w * m.d + m.n), `${id} 아빠 카드: ${m.t}을 가분수로 쓴 식이 없다 (${same.map((x) => `${x.p}/${x.d}`).join(', ')})\n${b}`);
      }
    }
    // 통과 기준 "A + B, C − D — …(답1 · 답2)" · 이야기면 "…" 안의 문제를 따로 읽어 푼다
    const ps = fillC(d.pass);
    const ans = (/\(([^)]+)\)/.exec(ps) || [])[1];
    assert.ok(ans, `${id}: 통과 기준에 괄호 속 답이 없다 "${ps}"`);
    const want = ans.split(' · ').map((x) => val(x.replace(/ (?:km|m|L|kg)$/, '')));
    const story = /^"(.+?)"/.exec(ps);
    const got = story ? [solveText(story[1]).ans] : ps.split(' — ')[0].split(', ').map(evalExpr);
    assert.equal(got.length, want.length, `${id}: 통과 기준의 식 ${got.length}개 · 답 ${want.length}개 "${ps}"`);
    got.forEach((g, k) => assert.ok(eq(g, want[k]), `${id}: 통과 기준 ${k + 1}번 답 ${ans.split(' · ')[k]} ≠ ${show(g)}`));
    pass++;
  }
  assert.equal(pass, IDS.length);
});

test('🎨 원고의 그림: 모두 그려진다 (막대·뺄셈 막대만) · 그림이 있는 장은 글에 같은 식 — [fsub A | B]는 "A − B" · [bar a/d+b/d]는 "a/d + b/d" · [bars …]의 분수는 글에도', () => {
  let n = 0;
  for (const id of IDS) {
    CONTENT[id].lesson.forEach((p, i) => {
      const at = `${id}[${i}]`;
      const plain = p.say.replace(/\[[^\]]+\]/g, '');
      for (const t of [p.say, p.check.q]) {
        for (const m of t.matchAll(/\[([a-z]+) ([^\]]+)\]/g)) {
          assert.ok(['bar', 'bars', 'fsub'].includes(m[1]), `${at}: 그림 ${m[0]}`);
          assert.ok(figureSvg(`${m[1]} ${m[2]}`).startsWith('<svg'), `${at}: 못 그리는 ${m[0]}`);
          assert.equal(t, p.say, `${at}: 확인 질문에 그림 ${m[0]} (답을 흘린다)`);
          let want = [];
          if (m[1] === 'fsub') want = [m[2].split(' | ').join(' − ')];
          else if (m[1] === 'bar') { const b = /^(\d+)\/(\d+)\+(\d+)\/\2$/.exec(m[2]); want = b ? [`${b[1]}/${b[2]} + ${b[3]}/${b[2]}`] : [m[2]]; }
          else want = m[2].split(/\s+/);
          for (const w of want) assert.ok(hasNum(plain, w), `${at}: 그림 ${m[0]}인데 글에 "${w}"이 없다`);
          n++;
        }
      }
    });
  }
  assert.ok(n >= 6, `원고 그림 ${n}`);
});

test('★ 원고의 조사·아직 안 배운 말·틀린 말 (배움 글·확인 질문·아빠 카드 전부) — 수 뒤는 읽는 소리 · 분수와 단위 글자 바로 뒤 조사 없음 · 통분·약분은 V6부터, 받아올림 V2·받아내림 V4부터', () => {
  const BAT = new Set(['0', '1', '3', '6', '7', '8']);
  const PAIRS = [['을', '를'], ['은', '는'], ['이', '가'], ['과', '와'], ['이에요', '예요'], ['이니까', '니까'], ['이라서', '라서']];
  const idx = (id) => IDS.indexOf(id);
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
    for (const [re, at] of FIRST) if (idx(at) > idx(id)) assert.ok(!re.test(all), `${id}: 아직 안 배운 ${re}`);
    // 문자 분수(a/b)는 쓰지 않는다 — 초등에는 문자가 없고, 문자 분수 그리기는 D·Q·R 줄기에만 (tests/mathexpr.test.js가 다른 줄기를 막는다)
    assert.ok(!/[a-z]\/[a-z\d]|\d\/[a-z]/.test(all), `${id}: 문자 분수`);
    const truth = truthText(CONTENT[id]).replace(/\*\*/g, '');
    for (const [re, why] of BAD) assert.ok(!re.test(truth), `${id}: ${why}`);
  }
  assert.ok(hitN >= 40, `실제로 본 조사 ${hitN}`);
});

test('원고는 배포 파일 검사(check.mjs)에도 걸린다 — fracadd.json → mathfadd.js의 checkContent', () => {
  const src = readFileSync(new URL('../tools/check.mjs', import.meta.url), 'utf8');
  assert.ok(src.includes("'coach/math/fracadd.json': '../js/mathfadd.js'"));
});

// ───────────────────── 3단계: 화면 연결 ─────────────────────

test('화면 연결 (3단계): STEMS.fracadd(V)는 이 생성기·원고를 쓰고 A 분수 바로 뒤·U 분수의 곱셈 앞 · 앱 셸이 둘 다 들고 간다 · 사다리 안내에 A 분수 줄기(아직 안 배운 말 없이) · 뺄셈 막대를 📊·❓가 안다', async () => {
  const { STEMS, STEM_ORDER, stemOf } = await import('../js/mathprog.js');
  const V = STEMS.fracadd;
  assert.equal(V.code, 'V');
  assert.equal(V.label, '분수의 덧셈·뺄셈 줄기', '줄기 고르기·📊에 보이는 이름');
  const at = STEM_ORDER.indexOf('fraction');
  assert.deepEqual(STEM_ORDER.slice(at, at + 4), ['fraction', 'fracadd', 'fracmul', 'fracdiv'], 'A 분수 → V 덧셈·뺄셈 → U 곱셈 → T 나눗셈 (4-2·5-1 덧셈·뺄셈 → 5-2 곱셈 → 6학년 나눗셈)');
  assert.equal(V.list, FADD);
  assert.equal(V.gen.makeQuestion, makeQuestion);
  assert.equal(V.gen.lessonOf, lessonOf, '📚 배움은 이 생성기의 lessonOf');
  assert.equal(V.lesson, true);
  assert.equal(V.file, './coach/math/fracadd.json');
  assert.equal(V.range, '초4 → 초5');
  assert.ok(IDS.every((id) => stemOf(id) === V), '모든 칸이 V 줄기로 찾아진다');
  assert.match(V.pick, /분모가 다른 칸은 A 분수 줄기를 먼저/);
  // 사다리 안내·첫 안내는 V1(초4)부터 본다 — 아직 안 배운 말(통분·약분·최소공배수·받아올림·받아내림)·참말에 틀린 말이 없다
  const guide = `${V.pick} ${V.intro}`;
  for (const [re] of FIRST) assert.ok(!re.test(guide), `안내에 ${re}`);
  for (const [re, why] of BAD) assert.ok(!re.test(guide), `안내에 ${why}`);
  // 앱이 가져오는 원고(V.file)로 배움 장이 그대로 만들어진다
  const content = JSON.parse(readFileSync(new URL(V.file.replace('./', '../'), import.meta.url), 'utf8'));
  for (const id of IDS) assert.equal(V.gen.lessonOf(id, 5, { ...OPTS, content }).pages.length, content[id].lesson.length, `${id}: 원고 배움 장`);
  const sw = readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
  for (const f of ['./js/mathfadd.js', './coach/math/fracadd.json']) assert.ok(sw.includes(`'${f}'`), `APP_SHELL에 ${f}`);
  // 📊 펼친 문제 글(figText)·❓ 복사문·📊 답장 안내 — 뺄셈 막대를 안다, 안내의 예는 그대로 그려진다
  assert.equal(figText('앞 [fsub 3 1/4 | 1 3/4] 뒤', true), '앞 (뺄셈 막대) 뒤');
  const ask = readFileSync(new URL('../js/mathask.js', import.meta.url), 'utf8');
  const stats = readFileSync(new URL('../js/stats.js', import.meta.url), 'utf8');
  assert.ok(ask.includes('[fsub 3 1/4 | 1 3/4]') && stats.includes('[fsub 3 1/4 | 1 3/4]'), '❓ 복사문·📊 답장 안내에 [fsub] 예');
  assert.ok(renderFigures('[fsub 3 1/4 | 1 3/4]').startsWith('<svg'), '안내의 예도 그려진다');
});
