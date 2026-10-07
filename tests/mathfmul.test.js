// ✖️ U 분수의 곱셈 줄기 — 생성기 테스트.
// ★ 정답·오답은 이 파일이 **문제 글을 따로 읽어** 분수 셈으로 다시 푼다 (생성기의 계산을 쓰지 않는다).
//   이름표 판정은 생성기 이름표를 보지 않고 **그 틀린 셈이 실제로 한 일**로 다시 계산한다 (메모 stem-generator-pitfalls 38·40번).
// 함정(stem-generator-pitfalls)을 처음부터: 분수 바로 뒤 조사 · 단위 글자 뒤 조사 · 쌍둥이 틀 · 오답끼리 같은 값 · 우연히 맞는 값 ·
//   ② 보기 결론의 수 · 숫자판으로 모든 보기를 쳐 보기 · 참말 금지(곱하면 늘 커진다 · 분수를 곱하면 늘 작아진다) · 글 속 셈식(분수까지) ·
//   그림 칸 수 = 지시문 · "진한 칸"만 진하다

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { FMUL, TAGS, makeQuestion, makeRound, ladder, placeFrom, diagnosticSet, lessonOf, checkContent, gradeLabel } from '../js/mathfmul.js';
import { tplKey } from '../js/mathgen.js';
import { figureSvg, renderFigures, figText, richParts } from '../js/mathdraw.js';
import { padSpec, readTyped, matchTyped, partsOf } from '../js/mathpad.js';

const OPTS = { names: ['피카츄', '리자몽', '개굴닌자'], me: '진우', worlds: { pokemon: [], toystory: [], minions: [], moana: [] } };
const SEEDS = Number(process.env.RNG_SEEDS) || 300;
const IDS = FMUL.map((c) => c.id);

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
/** 수 글자 → 조각: { w, n, d } (자연수는 d = 1, 분수는 w = 0) */
function partsOfNum(t) {
  const s = String(t).trim(); let m;
  if ((m = /^(\d+) (\d+)\/(\d+)$/.exec(s))) return { w: +m[1], n: +m[2], d: +m[3], kind: 'mixed' };
  if ((m = /^(\d+)\/(\d+)$/.exec(s))) return { w: 0, n: +m[1], d: +m[2], kind: 'frac' };
  if ((m = /^(\d+)$/.exec(s))) return { w: +m[1], n: 0, d: 1, kind: 'int' };
  return null;
}

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
/** 글 끝의 수 (결론) — "… 2 1/3" · "… 8" · "… 1/6" */
function lastNum(t) {
  const all = [...String(t).matchAll(/(\d+ \d+\/\d+|\d+\/\d+|\d+)/g)];
  return all.length ? val(all[all.length - 1][1]) : null;
}
const boldOf = (q) => (/\*\*(.+?)\*\*/.exec(q) || [])[1];

// ───────────────────── 문제 글 읽기 ─────────────────────

/** 문제 글 → { type, form('num'|'pick'|'min'), ans(값) | ok(고르기 판정), f: { ops(글자들) } } */
function solveText(q) {
  let m;
  const B = boldOf(q);
  if ((m = /곱이 (\d+)보다 작은 것은 어느 것/.exec(q))) { const k = Q(+m[1]); return { type: 'smaller', form: 'pick', ok: (t) => cmpQ(evalExpr(t), k) < 0, f: { k } }; }
  if (/다음 중 가장 작은 것은 어느 것/.test(q)) return { type: 'smallest', form: 'min', f: {} };
  if (/^다음을 계산하면 얼마일까요\?/.test(q)) { const ops = B.split(' × '); return { type: `calc${ops.length}`, form: 'num', ans: evalExpr(B), f: { ops } }; }
  const story = [
    [/하루에 나무열매를 (\S+) kg씩 먹어요\. (\d+)일 동안/, 'perDay'],
    [/한 병에 (\S+) L씩 들어 있는 주스가 (\d+)병/, 'bottles'],
    [/한 봉지에 (.+?) kg씩 담긴 밀가루가 (\d+)봉지/, 'bags'],
    [/나무열매 (\d+)개 중 (\S+)만큼을 먹었어요/, 'ofCount'],
    [/길이가 (\d+) m인 리본 중 (\S+)만큼을 잘라/, 'ofRibbon'],
    [/한 시간에 (.+?) km씩 걸어요\. (\d+)시간 동안/, 'walk'],
    [/피자 한 판 중 (\S+)만큼을 가졌어요\. 그중 (\S+)만큼을 먹었다면/, 'pizza'],
    [/가로가 (\S+) m, 세로가 (\S+) m인 직사각형이 있어요/, 'rect'],
    [/1 m의 무게가 (.+?) kg인 철근이 있어요\. 이 철근 (.+?) m의 무게/, 'steel'],
    [/우유 (\S+) L 중 (\S+)만큼을 컵에 따랐어요\. 컵에 있는 우유 중 (\S+)만큼을 마셨다면/, 'milk'],
    [/주스 (\S+) L 중 (\S+)만큼을 마셨어요\. 마신 주스는/, 'juice'],
    [/가로가 (.+?) m, 세로가 (.+?) m인 직사각형 모양의 땅/, 'land'],
  ];
  for (const [re, type] of story) {
    if ((m = re.exec(q))) {
      const ops = m.slice(1);
      const vals = ops.map(val);
      assert.ok(vals.every(Boolean), `이야기 수 ${ops}`);
      return { type, form: 'num', ans: vals.reduce(mul), f: { ops } };
    }
  }
  return { type: 'unknown' };
}

/** 고르기 문항의 맞는 보기 · 수 문항은 값이 같은 보기 · 가장 작은 것은 값이 가장 작은 보기 */
function rightOnes(sv, chs) {
  if (sv.form === 'num') return chs.filter((x) => eq(val(x.text), sv.ans));
  if (sv.form === 'min') { const v = chs.map((x) => evalExpr(x.text)); const lo = v.reduce((a, b) => (cmpQ(b, a) < 0 ? b : a)); return chs.filter((x, i) => eq(v[i], lo)); }
  return chs.filter((x) => sv.ok(x.text));
}

/** 이름표 뜻 — 그 틀린 생각을 문제 글의 수로 다시 한 값 */
function tagHolds(sv, tag, t) {
  if (sv.type === 'smallest') return tag === TAGS.mulBig && /^1\/\d+$/.test(t); // 곱하기 전의 수(단위분수 하나)를 가장 작다고 고름 = 곱하면 커진다고 봄
  if (sv.type === 'smaller') { const m = /^(\d+) × (.+)$/.exec(t); return tag === TAGS.fracSmall && !!m && cmpQ(val(m[2]), Q(1)) > 0; }
  const ops = sv.f.ops; const P = ops.map(partsOfNum); const Vs = ops.map(val);
  const v = val(t); const is = (w) => !!w && eq(v, w);
  // 분수 하나 × 자연수 하나 (어느 쪽이 앞이든)
  const fi = P.findIndex((p) => p.kind === 'frac'); const ni = P.findIndex((p) => p.kind === 'int'); const mi = P.findIndex((p) => p.kind === 'mixed');
  const K = ni >= 0 ? P[ni].w : 0;
  const F = fi >= 0 ? P[fi] : null; const M = mi >= 0 ? P[mi] : null;
  switch (tag) {
    case TAGS.mulDenToo: return P.length === 2 && !!F && K > 0 && t === `${F.n * K}/${F.d * K}`;
    case TAGS.mulDenOnly: return P.length === 2 && fi === 0 && K > 0 && is(Q(F.n, F.d * K)); // (분수)×(자연수)
    case TAGS.addInstead: return P.length === 2 && is(add(Vs[0], Vs[1]));
    case TAGS.addDen: return P.length === 2 && fi === 0 && K > 0 && is(Q(F.n * K, F.d + K)); // (분수)×(자연수)
    case TAGS.wholeOnly: return P.length === 2 && !!M && K > 0 && is(add(Q(M.w * K), Q(M.n, M.d)));
    case TAGS.fracOnly: return P.length === 2 && !!M && K > 0 && is(add(Q(M.w), Q(M.n * K, M.d)));
    case TAGS.badImproper: {
      const bad = (p) => (p.kind === 'mixed' ? Q(p.w + p.n, p.d) : val(`${p.kind === 'int' ? p.w : `${p.n}/${p.d}`}`));
      return P.length === 2 && P.some((p) => p.kind === 'mixed') && is(mul(bad(P[0]), bad(P[1])));
    }
    case TAGS.partOnly: return P.length === 2 && ni === 0 && !!F && is(Q(K, F.d)); // (자연수)×(분수) — 몇 묶음 중 한 묶음
    case TAGS.flipFrac: return P.length === 2 && ni === 0 && !!F && is(Q(K * F.d, F.n)); // (자연수)×(분수)
    case TAGS.denSum: return P.every((p) => p.kind === 'frac') && is(Q(P.reduce((a, p) => a * p.n, 1), P.reduce((a, p) => a + p.d, 0)));
    case TAGS.numSum: return P.length === 2 && P.every((p) => p.kind === 'frac') && is(Q(P[0].n + P[1].n, P[0].d * P[1].d));
    case TAGS.allSum: return P.every((p) => p.kind === 'frac') && is(Q(P.reduce((a, p) => a + p.n, 0), P.reduce((a, p) => a + p.d, 0)));
    case TAGS.lcdOnce: { if (P.length !== 2) return false; const [x, y] = P; const L = lcm(x.d, y.d); return is(Q(x.n * (L / x.d) * y.n * (L / y.d), L)); }
    case TAGS.keepDen: return P.length === 2 && P[0].d === P[1].d && P.every((p) => p.kind === 'frac') && is(Q(P[0].n * P[1].n, P[0].d));
    case TAGS.splitMul: return P.length === 2 && P.every((p) => p.kind === 'mixed') && is(add(Q(P[0].w * P[1].w), Q(P[0].n * P[1].n, P[0].d * P[1].d)));
    case TAGS.earlyCancel: {
      if (P.length !== 2 || !P.every((p) => p.kind === 'mixed')) return false;
      const [x, y] = P; const g1 = gcd(x.d, y.n); const g2 = gcd(x.n, y.d);
      if (g1 === 1 && g2 === 1) return false;
      const X = Q(x.w * (x.d / g1) + x.n / g2, x.d / g1); const Y = Q(y.w * (y.d / g2) + y.n / g1, y.d / g2);
      return is(mul(X, Y));
    }
    case TAGS.dropThird: return P.length === 3 && is(mul(Vs[0], Vs[1]));
    case TAGS.leftOver: return P.length === 2 && is(mul(Vs[0], sub(Q(1), Vs[1])));
    default: return false;
  }
}

const allText = (q) => [q.q, ...q.choices.map((x) => x.text), ...(q.solve ? [...q.solve.steps, ...Object.values(q.solve.why), q.solve.whyAny, q.solve.rule] : [])].join('\n');
function* every(kinds = ['calc', 'misread'], n = SEEDS) {
  for (const c of FMUL) for (const k of kinds) for (let s = 1; s <= n; s++) yield { c, k, s, q: makeQuestion(c.id, k, s, OPTS) };
}

// ───────────────────── 사다리 ─────────────────────

test('사다리: 9칸, 모두 초5, needs가 바로 앞 칸 · 맨 뒤는 ⭐ · 교과서 차시 순서', () => {
  assert.deepEqual(IDS, ['fmul.fracnat', 'fmul.mixnat', 'fmul.natfrac', 'fmul.natmix', 'fmul.unit', 'fmul.frac', 'fmul.mixed', 'fmul.three', 'fmul.apply']);
  FMUL.forEach((c, i) => {
    assert.equal(c.grade, 5, c.id);
    assert.deepEqual(c.needs, i ? [IDS[i - 1]] : [], c.id);
    assert.ok(c.idea && c.rule && c.slip, c.id);
  });
  assert.equal(gradeLabel(5), '초5');
  assert.match(FMUL[8].name, /^⭐/);
});

test('계산기 자체 점검 — 분수·대분수·괄호·(…)/d · 끝의 수 · 이름표 판정의 몇 예', () => {
  assert.ok(eq(evalExpr('2/5 × 3'), Q(6, 5)));
  assert.ok(eq(evalExpr('2 1/3 × 2'), Q(14, 3)));
  assert.ok(eq(evalExpr('1 1/2 × 2 1/3'), Q(7, 2)));
  assert.ok(eq(evalExpr('1/2 × 2/3 × 3/4'), Q(1, 4)));
  assert.ok(eq(evalExpr('(1 × 5 + 1)/5'), Q(6, 5)));
  assert.ok(eq(lastNum('분모는 그대로 — 2/5 × 3 = 1 1/5'), Q(6, 5)));
  const calc = (e) => solveText(`다음을 계산하면 얼마일까요?\n\n**${e}**`);
  assert.ok(tagHolds(calc('2/5 × 3'), TAGS.mulDenToo, '6/15'));
  assert.ok(!tagHolds(calc('2/5 × 3'), TAGS.mulDenToo, '2/5'), '분모에도 곱함은 약분하지 않은 꼴');
  assert.ok(tagHolds(calc('12 × 2/3'), TAGS.partOnly, '4'));
  assert.ok(tagHolds(calc('2 1/3 × 2'), TAGS.wholeOnly, '4 1/3'));
  assert.ok(tagHolds(calc('1 1/2 × 2 1/3'), TAGS.splitMul, '2 1/6'));
  assert.ok(tagHolds(calc('1 1/4 × 2 2/3'), TAGS.earlyCancel, '3 1/2'), '4와 2를 먼저 약분: 1 1/2 × 2 1/3 = 3 1/2');
  assert.ok(tagHolds(calc('2/3 × 4/5'), TAGS.lcdOnce, '8'));
  assert.throws(() => evalExpr('3 … 2'));
});

// ───────────────────── 문제 ─────────────────────

test('★ 독립 검산: ① 정답이 문제 글을 따로 읽어 푼 답과 같다 · 딱 하나만 맞다 · 답은 0보다 크다', () => {
  const types = new Set();
  for (const { c, s, q } of every(['calc'])) {
    const sv = solveText(q.q);
    assert.notEqual(sv.type, 'unknown', `${c.id} #${s}: 못 읽는 문제\n${q.q}`);
    const ok = q.choices.find((x) => x.ok);
    const right = rightOnes(sv, q.choices);
    assert.equal(right.length, 1, `${c.id} #${s} (${sv.type}): 맞는 보기 ${right.map((x) => x.text).join(', ') || '없음'}\n${q.q}\n${q.choices.map((x) => x.text).join(' | ')}`);
    assert.equal(right[0], ok, `${c.id} #${s}: 정답 표시 "${ok.text}" ≠ 따로 푼 "${right[0].text}"\n${q.q}`);
    if (sv.form === 'num') assert.ok(sv.ans.n > 0, `${c.id} #${s}: 답 ${show(sv.ans)}`);
    types.add(`${c.id}:${sv.type}`);
  }
  assert.ok(types.size >= 22, `문제 종류 ${types.size}: ${[...types]}`);
});

test('★ 드문 우연 — 고르기 문항은 씨앗 5,000개로 따로: 맞는 보기가 딱 하나', () => {
  let n = 0;
  for (const id of ['fmul.unit', 'fmul.apply']) for (let s = 1; s <= Math.max(SEEDS, 5000); s++) {
    const q = makeQuestion(id, 'calc', s, OPTS);
    const sv = solveText(q.q);
    if (sv.form === 'num') continue;
    const right = rightOnes(sv, q.choices);
    assert.ok(right.length === 1 && right[0].ok, `${id} #${s} (${sv.type}): 맞는 보기 ${right.map((x) => x.text).join(', ')}\n${q.q}`);
    n++;
  }
  assert.ok(n > 2000, `본 고르기 문항 ${n}`);
});

test('★ 보기: 정답 하나, 글자 겹침 없음, 3개 이상, 빈 글자·undefined·NaN·남은 자리표시 없음 · ① 계산엔 그림 없음 · ② 그림은 곱셈 그림만, 모두 그려진다', () => {
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
      assert.match(d, /^\[fmul /, `${at}: 곱셈 그림 말고 다른 그림 ${d}`);
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

test('★ 수 보기 꼴: 진분수·대분수·자연수, 기약 — "분모에도 곱함"만 약분하지 않은 꼴(약분하면 원래 수라 그대로 보여 준다, A와 같음)', () => {
  let raw = 0;
  for (const { c, s, q } of every(['calc'])) {
    const sv = solveText(q.q);
    if (sv.form !== 'num') continue;
    for (const x of q.choices) {
      const f = formOf(x.text);
      assert.ok(f, `${c.id} #${s}: 수가 아닌 보기 "${x.text}"`);
      if (x.tag === TAGS.mulDenToo) { assert.equal(f, 'frac'); assert.ok(gcd(...x.text.split('/').map(Number)) > 1, `${c.id} #${s}: "분모에도 곱함"은 약분하지 않은 꼴 "${x.text}"`); raw++; continue; }
      const p = partsOfNum(x.text);
      if (f === 'frac') { assert.ok(gcd(p.n, p.d) === 1, `${c.id} #${s}: 약분 안 된 보기 "${x.text}"`); assert.ok(p.n < p.d, `${c.id} #${s}: 가분수 보기 "${x.text}" (대분수로)`); }
      if (f === 'mixed') assert.ok(p.n < p.d && gcd(p.n, p.d) === 1, `${c.id} #${s}: 대분수 꼴 "${x.text}"`);
    }
  }
  assert.ok(raw > SEEDS, `"분모에도 곱함" 보기 ${raw}`);
});

/** ② 문항 — 바른 값(문제 글에서 따로) · 보여 준 말 · 어림 문항의 기준 수 */
function misreadFacts(q) {
  const shown = boldOf(q.q) || '';
  let m; let right; let base = null;
  if ((m = /곱셈 (.+?) — 곱을 어림/.exec(q.q))) { right = evalExpr(m[1]); base = val(/곱은 (\S+)보다 커요/.exec(shown)[1]); }
  else if ((m = /주스 (\S+) L 중 (\S+)만큼을 마셨어요\. 마신 주스는/.exec(q.q))) right = mul(val(m[1]), val(m[2]));
  else right = evalExpr(shown.split(' = ')[0]);
  return { shown, right, base };
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
      if (w.tag === '틀린 줄 모름') { assert.equal(w.text, '맞게 말했어요'); continue; }
      assert.ok(!eq(lastNum(w.text), right), `${at}: 오개념 보기 "${w.text}"의 결론이 맞는 값`);
    }
    assert.equal(q.choices.filter((x) => x.ok).length, 1);
    assert.ok(q.choices.some((x) => x.tag === '틀린 줄 모름'), `${at}: "맞게 말했어요" 보기`);
  }
  for (const id of IDS) assert.equal(keys[id].size, 2, `${id}: ② 갈래 ${[...keys[id]]}`);
});

test('★ ② 이름표 붙은 보기도 그 틀린 셈 — 보기 글의 결론을 문제의 수로 다시 계산 (② 판정표)', () => {
  let n = 0;
  for (const { c, s, q } of every(['misread'], Math.max(SEEDS, 600))) {
    const { shown } = misreadFacts(q);
    // 바른 식의 재료 — 보여 준 말 왼쪽 식, 어림 문항은 문제 글의 식, 주스 이야기는 두 수
    let m; let ops;
    if ((m = /곱셈 (.+?) — 곱을 어림/.exec(q.q))) ops = m[1].split(' × ');
    else if ((m = /주스 (\S+) L 중 (\S+)만큼을 마셨어요/.exec(q.q))) ops = [m[1], m[2]];
    else ops = shown.split(' = ')[0].split(' × ');
    const sv = { type: 'mis', f: { ops } };
    for (const w of q.choices.filter((x) => !x.ok && !['엉뚱한 지적', '틀린 줄 모름'].includes(x.tag))) {
      const tail = /(\d+ \d+\/\d+|\d+\/\d+|\d+)$/.exec(w.text)[1];
      assert.ok(tagHolds(sv, w.tag, tail), `${c.id} #${s}: ② 보기 "${w.text}"의 이름표 "${w.tag}"가 뜻과 다르다\n${q.q}`);
      n++;
    }
  }
  assert.ok(n >= 9 * 600, `본 ② 이름표 ${n}`);
});

// ───────────────────── 글 ─────────────────────

const FRAC_JOSA = /\/(?:\d+)(?:이에요|예요|이라서|라서|이니까|니까|이고|이면|이|가|은|는|을|를|와|과|도|으로|로|의|에)/;
const UNIT_JOSA = /(?<![가-힣a-z])(?:m²|m|L|kg)(?:이에요|예요|이고|이면|이|가|은|는|을|를|와|과|으로|로)(?![가-힣])/;

test('★ 조사: 수 뒤는 읽는 소리 · 분수 바로 뒤에는 조사 없음 · 단위 글자(m·L·kg) 바로 뒤에도 없음 · ASCII 빼기 없음', () => {
  const BAT = new Set(['0', '1', '3', '6', '7', '8']);
  const PAIRS = [['을', '를'], ['은', '는'], ['이', '가'], ['과', '와'], ['이에요', '예요'], ['이니까', '니까'], ['이라서', '라서']];
  let hitN = 0;
  for (const { c, k, s, q } of every()) {
    const all = allText(q).replace(/\*\*/g, '').replace(/\[fmul [^\]]+\]/g, '');
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
  for (const c of FMUL) {
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

/** 글 속 "식 = 식 = …" — 분수·대분수까지 계산기로 (② 보여 준 말·오답 보기는 빼고) */
function eqChains(text) {
  const out = [];
  for (const m of String(text).matchAll(/[\d(][\d /()+−×÷=]*[\d)]/g)) { // 띄어쓰기만 — 줄을 넘어 다음 줄의 수와 잇지 않게
    const parts = m[0].split(' = ').map((x) => x.trim());
    if (parts.length < 2) continue;
    const vals = parts.map((p) => { try { return evalExpr(p); } catch { return null; } });
    for (let i = 1; i < vals.length; i++) if (vals[i - 1] && vals[i]) out.push({ a: parts[i - 1], b: parts[i], ok: eq(vals[i - 1], vals[i]) });
  }
  return out;
}
test('★ 글 속 셈식은 맞다 (분수·대분수·괄호까지) — 문제·정답·풀이·왜 전부 · 칸 설명도', () => {
  let n = 0;
  for (const { c, k, s, q } of every()) {
    const all = [q.q.replace(/\*\*.+?\*\*/g, ''), q.choices.find((x) => x.ok).text, ...q.solve.steps, ...Object.values(q.solve.why), q.solve.whyAny].join('\n');
    for (const e of eqChains(all)) { assert.ok(e.ok, `${c.id} ${k} #${s}: ${e.a} = ${e.b}`); n++; }
  }
  assert.ok(n > 10 * SEEDS, `셈식 ${n}`);
  for (const c of FMUL) for (const e of eqChains(`${c.idea}\n${c.rule}`.replace(/\*\*/g, ''))) assert.ok(e.ok, `${c.id} 설명: ${e.a} = ${e.b}`);
});

test('🔁 쌍둥이·🤔 노트: 요청한 틀·갈래로 온다 · 같은 셈 · 쌍둥이 글이 원래 글과 같은 일은 드물다', () => {
  const same2 = {}; const tot = {};
  for (const c of FMUL) {
    for (let s = 1; s <= Math.min(Math.max(SEEDS, 150), 300); s++) { // 씨앗을 줄여도(변이 검사 40) 틀마다 몇 번은 보게
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
const FIRST = [[/세 분수/, 'fmul.three']];
test('★ 아직 안 배운 말을 앞 칸에 쓰지 않는다 — "세 분수"는 U8부터', () => {
  const idx = (id) => IDS.indexOf(id);
  const banned = (id) => FIRST.filter(([, at]) => idx(at) > idx(id));
  for (const c of FMUL) for (const [re] of banned(c.id)) assert.ok(!re.test(`${c.name} ${c.idea} ${c.rule} ${c.slip}`), `${c.id}: 설명에 ${re}`);
  for (const { c, k, s, q } of every()) {
    const all = allText(q) + ' ' + q.choices.map((x) => x.tag || '').join(' ');
    for (const [re] of banned(c.id)) assert.ok(!re.test(all), `${c.id} ${k} #${s}: 아직 안 배운 ${re}\n${all}`);
  }
});

/** 참이라고 내미는 글에 틀린 말 — 오답 보기·② 보여 준 말은 빼고, 굵게(**)는 떼고 */
const BAD = [
  [/곱하면 (?:늘|항상) 커/, '1보다 작은 수를 곱하면 작아진다'],
  [/분수를 곱하면 (?:늘|항상) (?:곱이 )?작아/, '1보다 큰 분수(가분수·대분수)를 곱하면 커진다'],
  [/(?<!2 이상인 |1보다 큰 )자연수를 곱하면 (?:늘 |항상 )?(?:곱이 )?(?:처음 수보다 )?커/, '1을 곱하면 그대로'],
  [/곱셈도 통분|통분해서 곱해/, '곱셈은 통분하지 않는다'],
  [/(?<!1보다 작은 )분수를 곱하면 (?:곱이 )?(?:처음 수보다 )?작아/, '1보다 작은 분수일 때만 작아진다'],
];
test('★ 참말에 틀린 말이 없다 — 곱하면 늘 커진다 · 분수를 곱하면 늘 작아진다 · 곱셈도 통분', () => {
  const truths = (q) => [q.choices.find((x) => x.ok).text, ...(q.solve ? [...q.solve.steps, ...Object.values(q.solve.why), q.solve.whyAny, q.solve.rule] : [])].join('\n').replace(/\*\*/g, '');
  for (const { c, k, s, q } of every()) {
    const t = truths(q);
    for (const [re, why] of BAD) assert.ok(!re.test(t), `${c.id} ${k} #${s}: ${why}\n${t}`);
  }
  for (const c of FMUL) for (const [re, why] of BAD) assert.ok(!re.test([c.idea, c.rule, c.slip].join('\n').replace(/\*\*/g, '')), `${c.id}: ${why}`);
});

test('🔢 숫자판: 수가 답인 ①만 숫자판 · 분수·대분수 답도 칠 수 있다 · 모든 수 보기를 쳐서 그 보기로 간다 · 약분 안 한 답도 맞음', () => {
  const pv = readFileSync(new URL('../js/padview.js', import.meta.url), 'utf8');
  const MAX = +/const MAX = (\d+);/.exec(pv)[1];
  let n = 0;
  for (const { c, s, q } of every(['calc'], 200)) {
    const ok = q.choices.find((x) => x.ok).text;
    const sv = solveText(q.q);
    const spec = padSpec(q, 'fracmul');
    assert.equal(!!spec, sv.form === 'num', `${c.id} #${s}: 정답 "${ok}" 숫자판 ${!!spec}`);
    if (!spec) continue;
    assert.equal(spec.need, null, `${c.id} #${s}: 꼴을 묻지 않는다 (문제 글에 "분수로"가 없다) — ${spec.need}`);
    assert.equal(spec.signed, false, `${c.id} #${s}: ± 없음`);
    for (const ch of q.choices) {
      assert.ok(String(ch.text).length <= MAX, `${c.id} #${s}: "${ch.text}"`);
      const t = partsOf(ch.text);
      assert.ok(t && spec.modes.includes(t.mode), `${c.id} #${s}: "${ch.text}"를 칸으로 못 나눔`);
      const hit = matchTyped(q, readTyped(t.mode, t.p, spec), spec);
      assert.equal(q.choices[hit.i], ch, `${c.id} #${s}: "${ch.text}"를 쳐도 그 보기로 안 간다`);
      n++;
    }
    // 약분 안 한 답도 맞음 — 2022 고려사항
    const v = val(ok);
    if (v.d > 1) {
      const hit = matchTyped(q, readTyped('frac', { n: String(v.n * 2), d: String(v.d * 2) }, spec), spec);
      assert.ok(q.choices[hit.i] && q.choices[hit.i].ok, `${c.id} #${s}: 약분 안 한 ${v.n * 2}/${v.d * 2}이 틀림`);
    }
  }
  assert.ok(n > 1000, `쳐 본 보기 ${n}`);
});

// 🔍 Codex 36차 #3 — 보기는 4개라 오개념 오답 후보(probe.allWrong)가 화면에서 빠질 수 있다. 빠진 후보의 값을 숫자판에 치면
//   "짐작한 답"(이름표 없음)이 되어 📊 오개념 집계에서 사라졌다 (6/7 × 4에 24/11 "분모에 더함")
test('🔢 숫자판: 화면에서 빠진 오답 후보를 쳐도 그 오개념 이름표로 간다 (짐작이 아니다) · 그 이름표의 "왜"가 있다 · 꼴을 바꿔 쳐도', () => {
  let dropped = 0;
  for (const { c, s, q } of every(['calc'], 200)) {
    const spec = padSpec(q, 'fracmul');
    if (!spec) continue;
    for (const w of q.probe.allWrong) {
      let t = partsOf(w.text);
      // 대분수 칸이 없는 문항(답이 진분수)이면 아이는 가분수로 친다
      if (t && t.mode === 'mixed' && !spec.modes.includes('mixed')) t = { mode: 'frac', p: { n: String(+t.p.w * +t.p.d + +t.p.n), d: t.p.d } };
      assert.ok(t && spec.modes.includes(t.mode), `${c.id} #${s}: 후보 "${w.text}"를 칸으로 못 나눔`);
      const hit = matchTyped(q, readTyped(t.mode, t.p, spec), spec);
      const shown = q.choices[hit.i];
      if (shown) { assert.ok(!shown.ok && shown.tag, `${c.id} #${s}: "${w.text}"가 ${shown.ok ? '정답' : '이름표 없는 보기'}로 간다`); continue; }
      dropped++;
      assert.equal(hit.reason, 'known', `${c.id} #${s}: 빠진 후보 "${w.text}"[${w.tag}]가 짐작으로 간다`);
      assert.equal(hit.known.tag, w.tag, `${c.id} #${s}: "${w.text}" 이름표`);
      assert.ok(q.solve.why[w.tag], `${c.id} #${s}: "${w.tag}"의 왜가 없다`);
      // 약분 안 한 꼴·가분수로 쳐도 같은 오개념
      const v = val(w.text);
      const hit2 = matchTyped(q, readTyped('frac', { n: String(v.n * 2), d: String(v.d * 2) }, spec), spec);
      assert.equal(hit2.known && hit2.known.tag, w.tag, `${c.id} #${s}: ${v.n * 2}/${v.d * 2}`);
    }
  }
  assert.ok(dropped > 100, `빠진 후보 ${dropped}`);
  // Codex 재현: 6/7 × 4에 24/11
  const q = makeQuestion('fmul.fracnat', 'calc', 1, OPTS);
  const spec = padSpec(q, 'fracmul');
  const hit = matchTyped(q, readTyped('frac', { n: '24', d: '11' }, spec), spec);
  assert.ok(/6\/7 × 4/.test(q.q) && hit.known && hit.known.tag === TAGS.addDen, `${q.q} → ${JSON.stringify(hit)}`);
});

test('🔢 숫자판 화면 연결: 빠진 후보로 간 답은 이름표 있는 보기로 덧붙여 채점 (짐작 기록 g 없음) · ❓ 복사문 보기 목록에서는 뺀다', () => {
  const src = readFileSync(new URL('../js/math.js', import.meta.url), 'utf8');
  const hooks = src.slice(src.indexOf('function typedHooks('), src.indexOf('function answer('));
  assert.match(hooks, /res\.known/, 'typedHooks가 matchTyped의 known을 본다');
  assert.match(hooks, /tag: res\.known\.tag/, '덧붙인 보기에 그 이름표');
  assert.match(hooks, /guess: res\.i < 0 && !miss && !res\.known/, '짐작으로 세지 않는다');
  const ask = readFileSync(new URL('../js/mathask.js', import.meta.url), 'utf8');
  assert.match(ask, /!c\.typedTag/, '❓ 복사문 보기 목록에서 뺀다');
});

// ───────────────────── 곱셈 그림 ─────────────────────

const attrsOf = (svg, cls) => [...svg.matchAll(new RegExp(`<(?:rect|circle) class="${cls}"([^>]*)>`, 'g'))].map((m) => {
  const o = {}; for (const a of m[1].matchAll(/([a-z-]+)="([^"]*)"/g)) o[a[1]] = a[2]; return o;
});
test('🎨 곱셈 그림: 칸·묶음·점·진한 칸 = 지시문 · 이름표 자리 · 폭 400 · 글로 바꾸기 · 못 그리는 지시문은 빈 그림', () => {
  // 같은 막대 여러 번 — 2/5 × 3: 막대 3개 × 5칸 · 칠한 칸 6
  for (const [spec, k, d, on] of [['rep 2/5 3', 3, 5, 6], ['rep 3/4 2', 2, 4, 6], ['rep 1/3 5', 5, 3, 5]]) {
    const svg = figureSvg(`fmul ${spec}`); const C = attrsOf(svg, 'fm-c');
    assert.equal(C.length, k * d, `${spec}: 칸`);
    assert.equal(C.filter((x) => x['data-on'] === '1').length, on, `${spec}: 칠한 칸`);
    assert.equal(new Set(C.map((x) => x['data-r'])).size, k, `${spec}: 막대 수`);
    assert.ok(+/viewBox="0 0 (\d+)/.exec(svg)[1] <= 400);
  }
  // 몇 묶음 중 몇 묶음 — 12 × 2/3: 묶음 3 · 칠한 묶음 2 · 점 12 · 칠한 점 8
  for (const [spec, groups, onG, dots, onD] of [['part 12 2/3', 3, 2, 12, 8], ['part 20 3/5', 5, 3, 20, 12], ['part 6 1/2', 2, 1, 6, 3]]) {
    const svg = figureSvg(`fmul ${spec}`); const G = attrsOf(svg, 'fm-g'); const D = attrsOf(svg, 'fm-d');
    assert.equal(G.length, groups, `${spec}: 묶음`); assert.equal(G.filter((x) => x['data-on'] === '1').length, onG, `${spec}: 칠한 묶음`);
    assert.equal(D.length, dots, `${spec}: 점`); assert.equal(D.filter((x) => x['data-on'] === '1').length, onD, `${spec}: 칠한 점`);
    for (let gi = 0; gi < groups; gi++) assert.equal(D.filter((x) => x['data-g'] === String(gi)).length, dots / groups, `${spec}: ${gi}묶음 점 수`);
    // 점은 제 묶음 상자 안에
    const boxes = [...svg.matchAll(/<rect class="fm-g" x="([\d.]+)" y="([\d.]+)" width="([\d.]+)" height="([\d.]+)"[^>]*data-g="(\d+)"/g)].map((m) => ({ x: +m[1], y: +m[2], w: +m[3], h: +m[4], g: m[5] }));
    for (const m of svg.matchAll(/<circle class="fm-d" cx="([\d.]+)" cy="([\d.]+)" r="([\d.]+)"[^>]*data-g="(\d+)"/g)) {
      const b = boxes.find((x) => x.g === m[4]);
      assert.ok(+m[1] - +m[3] >= b.x && +m[1] + +m[3] <= b.x + b.w && +m[2] - +m[3] >= b.y && +m[2] + +m[3] <= b.y + b.h, `${spec}: 점이 제 묶음 밖`);
    }
  }
  // 넓이 모델 — 2/3 × 3/4: 칸 3 × 4 · 진한 칸(두 번) 6 · 한 번만 칠한 칸은 같은 색을 옅게 · 이름표 "2/3"(위)·"3/4"(왼쪽)
  for (const [spec, a, b, c, d] of [['area 2/3 3/4', 2, 3, 3, 4], ['area 1/2 1/3', 1, 2, 1, 3], ['area 3/5 2/7', 3, 5, 2, 7]]) {
    const svg = figureSvg(`fmul ${spec}`); const C = attrsOf(svg, 'fm-c');
    assert.equal(C.length, b * d, `${spec}: 칸`);
    const on = C.filter((x) => x['data-on'] === '1');
    assert.equal(on.length, a * c, `${spec}: 진한 칸`);
    for (const x of on) assert.ok(+x['data-x'] < a && +x['data-y'] < c, `${spec}: 진한 칸 자리`);
    const shaded = C.filter((x) => +x['data-x'] < a || +x['data-y'] < c);
    assert.equal(new Set(shaded.map((x) => x.fill)).size, 1, `${spec}: 칠한 칸이 두 색`);
    for (const x of shaded) assert.ok(x['data-on'] === '1' ? !x['fill-opacity'] : +x['fill-opacity'] < 0.5, `${spec}: 진한 칸만 진하다`);
    assert.match(svg, new RegExp(`class="fm-a">${a}/${b}<`)); assert.match(svg, new RegExp(`class="fm-b">${c}/${d}<`));
  }
  // 생성 문항의 그림도 지시문대로 — 문제 글의 식과 같은 수
  let n = 0;
  for (const { c, s, q } of every(['misread'])) {
    const m = /\[fmul (rep|part|area) ([^\]]+)\]/.exec(q.q);
    if (!m) continue;
    const lhs = boldOf(q.q).split(' = ')[0];
    const [x, y] = m[2].split(' ');
    assert.equal(lhs, `${x} × ${y}`, `${c.id} #${s}: 그림 ${m[0]} ≠ 식 ${lhs}`);
    assert.match(figText(q.q), /\((?:막대|그림|넓이 그림): /);
    assert.ok(figText(q.q, true).includes('(곱셈 그림)'));
    assert.ok(!renderFigures(q.q).includes('[fmul'), `${c.id} #${s}: renderFigures가 그림을 못 바꿈`);
    n++;
  }
  assert.ok(n > SEEDS, `본 곱셈 그림 ${n}`);
  for (const bad of ['fmul rep 2/5 1', 'fmul rep 6/5 3', 'fmul part 5 2/3', 'fmul part 12 4/3', 'fmul area 4/3 1/2', 'fmul area 1/9 1/2', 'fmul spin 1/2 3', 'fmul rep 2/5']) assert.equal(figureSvg(bad), '', bad);
});

test('📏 진단·사다리·한 편·배움 예비·내용 검사 · 글 속 분수는 세로로·대분수는 대분수로 그려진다', () => {
  const d = diagnosticSet(7, 5, OPTS);
  assert.equal(d.length, 5);
  assert.deepEqual(d.map((q) => q.concept), ['fmul.fracnat', 'fmul.natfrac', 'fmul.unit', 'fmul.mixed', 'fmul.apply']);
  assert.deepEqual(placeFrom(d.map((q, i) => ({ concept: q.concept, correct: i < 2 }))), { startId: 'fmul.unit', knownIds: ['fmul.fracnat', 'fmul.mixnat', 'fmul.natfrac', 'fmul.natmix'] });
  const L0 = ladder([]);
  assert.equal(L0[0].state, 'now');
  assert.ok(L0.slice(1).every((r) => r.state === 'locked'));
  for (const c of FMUL) {
    const round = makeRound(c.id, 11, OPTS);
    assert.ok(round.length >= 2 && round.every((q) => q.concept === c.id), c.id);
    const les = lessonOf(c.id, 3, OPTS);
    assert.ok(les.pages.length >= 1 && les.title === c.name);
  }
  assert.ok(checkContent({}).length >= 9, '빈 원고는 칸마다 걸린다');
  const p = richParts('1 1/2 × 2 1/3 = 3 1/2');
  assert.equal(p.filter((x) => x.k === 'm').length, 3, '대분수');
});

test('칸마다 수의 꼴 — U6은 단위분수끼리가 아니다(U5 몫) · U7 대분수의 자연수 부분은 1~2 · U1 ② 보여 준 틀린 답은 자연수로 떨어지지 않는다', () => {
  let n6 = 0; let n7 = 0; let n1 = 0;
  for (let s = 1; s <= SEEDS; s++) {
    const q6 = makeQuestion('fmul.frac', 'calc', s, OPTS); const sv6 = solveText(q6.q);
    if (sv6.form === 'num') { const P = sv6.f.ops.map(partsOfNum); assert.ok(P.some((p) => p.n > 1), `U6 #${s}: 단위분수끼리 ${sv6.f.ops}`); n6++; }
    const q7 = makeQuestion('fmul.mixed', 'calc', s, OPTS); const P7 = solveText(q7.q).f.ops.map(partsOfNum);
    assert.ok(P7.every((p) => p.kind === 'mixed' && p.w >= 1 && p.w <= 2), `U7 #${s}: ${q7.q}`); n7++;
    const q1 = makeQuestion('fmul.fracnat', 'misread', s, { ...OPTS, want: { k: 'misread', key: 'misread:add' } });
    assert.equal(q1.key, 'misread:add');
    assert.ok(lastNum(boldOf(q1.q)).d > 1, `U1 ② #${s}: 보여 준 답이 자연수 ${boldOf(q1.q)}`); n1++;
  }
  assert.ok(n6 > SEEDS / 2 && n7 === SEEDS && n1 === SEEDS);
});

// ───────────────────── 2단계: 원고 (coach/math/fracmul.json) ─────────────────────

const CONTENT = JSON.parse(readFileSync(new URL('../coach/math/fracmul.json', import.meta.url), 'utf8'));
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

test('원고(fracmul.json)가 형식 검사를 통과한다 — 9칸이 사다리 순서대로 · 배움 4~5장·장마다 확인 질문·아빠 카드(말 2개↑·함정 2개↑·통과 기준)', () => {
  assert.deepEqual(checkContent(CONTENT), []);
  assert.deepEqual(Object.keys(CONTENT).filter((k) => k !== '_'), IDS);
  for (const id of IDS) {
    const v = CONTENT[id];
    assert.ok(v.lesson.length >= 4 && v.lesson.length <= 5, `${id}: 배움 ${v.lesson.length}장`);
    assert.ok(v.lesson.every((p) => p.check), `${id}: 장마다 확인 질문`);
    assert.ok(v.dad.say.length >= 2 && v.dad.traps.length >= 2 && v.dad.pass, `${id}: 아빠 카드`);
  }
  const L = lessonOf('fmul.mixed', 3, { ...OPTS, content: CONTENT });
  assert.equal(L.pages.length, CONTENT['fmul.mixed'].lesson.length);
  assert.ok(L.pages.every((p) => p.check && p.check.ok));
});

/** 글에 그 수(또는 식)가 낱개로 있는가 — "1/6"이 "4 1/6"의 일부로 잡히지 않게 */
const hasNum = (text, w) => new RegExp(`(?<![\\d/])(?<!\\d )${String(w).replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')}(?![\\d/])`).test(text);
test('★ 원고 확인 질문도 따로 풀어 대조 — 전부 읽히고, 맞는 보기는 정답 하나뿐, 오답 하나하나가 이름표 있는 틀린 셈 · 까닭은 정답·오답을 다 말한다', () => {
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
        assert.ok(hasNum(p.check.why, w), `${at}: 까닭에 오답 "${w}" 이야기가 없다`);
        n++;
      }
      assert.ok(hasNum(p.check.why, p.check.ok), `${at}: 까닭에 정답 "${p.check.ok}"이 없다`);
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

// 🔍 Codex 36차 #2 — U2 아빠 카드가 "1 1/3컵씩 3번"을 붓고 확인 식은 7/3 × 3(= 2 1/3컵씩)이었다. 식 하나하나는 참이라 셈식 검사가 못 잡았다
test('★ 아빠 카드: 활동에 나온 대분수 양을 가분수로 쓴 식은 그 대분수와 같은 값 (같은 분모의 가분수가 식에 있으면 그중 하나는 그 양)', () => {
  let n = 0;
  for (const id of IDS) {
    const d = CONTENT[id].dad;
    for (const b of [d.goal, ...d.say, d.do, d.pass].map(fillC)) {
      // 결과(= 뒤)가 아닌 대분수 — 활동에서 다루는 양
      const qty = [...b.matchAll(/(?<![\d/])(?<!= )(\d+) (\d+)\/(\d+)(?![\d/])/g)].map((m) => ({ t: m[0], w: +m[1], n: +m[2], d: +m[3] }));
      const imp = [...b.matchAll(/(?<![\d/])(?<!\d )(\d+)\/(\d+)(?![\d/])/g)].map((m) => ({ p: +m[1], d: +m[2] })).filter((x) => x.p > x.d);
      for (const m of qty) {
        const same = imp.filter((x) => x.d === m.d);
        if (!same.length) continue;
        n++;
        assert.ok(same.some((x) => x.p === m.w * m.d + m.n), `${id} 아빠 카드: ${m.t}을 가분수로 쓴 식이 없다 (${same.map((x) => `${x.p}/${x.d}`).join(', ')})\n${b}`);
      }
    }
  }
  assert.ok(n >= 2, `본 대분수 양 ${n}`);
});

test('🎨 원고의 그림: 모두 그려진다 (곱셈 그림·분수 막대만) · 그림이 있는 장은 글에 같은 식 · "진한 칸 N"은 그림의 진한 칸 수', () => {
  let n = 0; let dark = 0;
  for (const id of IDS) {
    CONTENT[id].lesson.forEach((p, i) => {
      for (const t of [p.say, p.check.q]) {
        for (const m of t.matchAll(/\[([a-z]+) ([^\]]+)\]/g)) {
          assert.ok(['fmul', 'bar'].includes(m[1]), `${id}[${i}]: 그림 ${m[0]}`);
          assert.ok(figureSvg(`${m[1]} ${m[2]}`).startsWith('<svg'), `${id}[${i}]: 못 그리는 ${m[0]}`);
          n++;
        }
      }
      const fm = /\[fmul (rep|part|area) (\S+) (\S+)\]/.exec(p.say);
      if (!fm) return;
      const [, mode, x, y] = fm;
      const want = `${x} × ${y}`;
      assert.ok(p.say.replace(/\[[^\]]+\]/g, '').includes(want), `${id}[${i}]: 그림 ${fm[0]}인데 글에 "${want}"이 없다`);
      if (mode === 'area') {
        const on = (figureSvg(fm[0].slice(1, -1)).match(/class="fm-c"[^>]*data-on="1"/g) || []).length;
        for (const d of p.say.matchAll(/진한 칸[이은]? (?:[\d × ]+= )?(\d+)칸/g)) { assert.equal(+d[1], on, `${id}[${i}]: 글 "${d[0]}" ≠ 그림 진한 칸 ${on}`); dark++; }
      }
    });
  }
  assert.ok(n >= 4, `원고 그림 ${n}`);
  assert.ok(dark >= 2, `"진한 칸" 대조 ${dark}`);
});

test('★ 원고의 조사·아직 안 배운 말·틀린 말 (배움 글·확인 질문·아빠 카드 전부) — 수 뒤는 읽는 소리 · 분수와 단위 글자 바로 뒤 조사 없음 · "세 분수"는 U8부터', () => {
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
    if (IDS.indexOf(id) < IDS.indexOf('fmul.three')) assert.ok(!/세 분수/.test(all), `${id}: 아직 안 배운 "세 분수"`);
    // 문자 분수(a/b)는 쓰지 않는다 — 초5에는 문자가 없고, 문자 분수 그리기는 D·Q·R 줄기에만 (tests/mathexpr.test.js가 다른 줄기를 막는다)
    assert.ok(!/[a-z]\/[a-z\d]|\d\/[a-z]/.test(all), `${id}: 문자 분수`);
    const truth = truthText(CONTENT[id]).replace(/\*\*/g, '');
    for (const [re, why] of BAD) assert.ok(!re.test(truth), `${id}: ${why}`);
  }
  assert.ok(hitN >= 40, `실제로 본 조사 ${hitN}`);
});

test('원고는 배포 파일 검사(check.mjs)에도 걸린다 — fracmul.json → mathfmul.js의 checkContent', () => {
  const src = readFileSync(new URL('../tools/check.mjs', import.meta.url), 'utf8');
  assert.ok(src.includes("'coach/math/fracmul.json': '../js/mathfmul.js'"));
});

// ───────────────────── 3단계: 화면 연결 ─────────────────────

test('화면 연결 (3단계): STEMS.fracmul(U)은 이 생성기·원고를 쓰고 A 분수 바로 뒤·T 분수의 나눗셈 앞 · 앱 셸이 둘 다 들고 간다 · 사다리 안내에 A 분수 줄기 · 곱셈 그림을 📊·❓가 안다', async () => {
  const { STEMS, STEM_ORDER, stemOf } = await import('../js/mathprog.js');
  assert.equal(STEMS.fracmul.code, 'U');
  assert.equal(STEMS.fracmul.label, '분수의 곱셈 줄기', '줄기 고르기·📊에 보이는 이름');
  const at = STEM_ORDER.indexOf('fraction');
  assert.deepEqual(STEM_ORDER.slice(at, at + 3), ['fraction', 'fracmul', 'fracdiv'], 'A 분수 → U 곱셈 → T 나눗셈 (5-2 분수의 곱셈 다음에 6학년 분수의 나눗셈)');
  assert.equal(STEMS.fracmul.list, FMUL);
  assert.equal(STEMS.fracmul.gen.makeQuestion, makeQuestion);
  assert.equal(STEMS.fracmul.gen.lessonOf, lessonOf, '📚 배움은 이 생성기의 lessonOf');
  assert.equal(STEMS.fracmul.lesson, true);
  assert.equal(STEMS.fracmul.file, './coach/math/fracmul.json');
  assert.equal(STEMS.fracmul.range, '초5');
  assert.ok(IDS.every((id) => stemOf(id) === STEMS.fracmul), '모든 칸이 U 줄기로 찾아진다');
  assert.match(STEMS.fracmul.pick, /A 분수 줄기\(약분·통분까지\)를 먼저/);
  // 사다리 안내·첫 안내에도 아직 안 배운 말("세 분수")·참말에 틀린 말(곱하면 늘 커진다 …)이 없다
  const guide = `${STEMS.fracmul.pick} ${STEMS.fracmul.intro}`;
  for (const [re] of FIRST) assert.ok(!re.test(guide), `안내에 ${re}`);
  for (const [re, why] of BAD) assert.ok(!re.test(guide), `안내에 ${why}`);
  const sw = readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
  for (const f of ['./js/mathfmul.js', './coach/math/fracmul.json']) assert.ok(sw.includes(`'${f}'`), `APP_SHELL에 ${f}`);
  // 📊 펼친 문제 글(figText)·❓ 복사문·📊 답장 안내 — 곱셈 그림을 안다, 안내의 예는 그대로 그려진다
  assert.equal(figText('앞 [fmul rep 2/5 3] 뒤', true), '앞 (곱셈 그림) 뒤');
  const ask = readFileSync(new URL('../js/mathask.js', import.meta.url), 'utf8');
  const stats = readFileSync(new URL('../js/stats.js', import.meta.url), 'utf8');
  assert.ok(ask.includes('[fmul rep 2/5 3]') && stats.includes('[fmul rep 2/5 3]'), '❓ 복사문·📊 답장 안내에 [fmul] 예');
  assert.ok(renderFigures('[fmul rep 2/5 3]').startsWith('<svg'), '안내의 예도 그려진다');
});
