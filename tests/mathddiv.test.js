// ➗ X 소수의 나눗셈 줄기 — 생성기 테스트.
// ★ 정답·오답은 이 파일이 **문제 글을 따로 읽어** 정확한 분수 셈(소수 = 분모가 10의 거듭제곱인 분수)으로 다시 푼다 (생성기의 계산을 쓰지 않는다).
//   이름표 판정은 생성기 이름표를 보지 않고 **그 틀린 셈이 실제로 한 일**로 다시 계산한다 (메모 stem-generator-pitfalls 38·40번, U·V·W 2단계).
// 함정(stem-generator-pitfalls)을 처음부터: 단위 글자 뒤 조사 · 쌍둥이 틀 · 오답끼리 같은 값 · 우연히 맞는 값 · ② 보기 결론의 수 ·
//   숫자판으로 모든 보기(+ 화면에서 빠진 후보·끝자리 0)를 쳐 보기 · 참말 금지(조건 없는 일반 규칙 — Codex 38차) · 글 속 셈식 · 그림 = 지시문 = 문제 글의 식
//   · 6-2 칸 글엔 "나머지"를 쓰지 않는다(지도서 181쪽) · 반올림·남는 양은 그 칸부터

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DDIV, TAGS, makeQuestion, makeRound, ladder, placeFrom, diagnosticSet, lessonOf, checkContent, gradeLabel } from '../js/mathddiv.js';
import { tplKey } from '../js/mathgen.js';
import { figureSvg, renderFigures, figText } from '../js/mathdraw.js';
import { padSpec, readTyped, matchTyped, partsOf } from '../js/mathpad.js';

const OPTS = { names: ['피카츄', '리자몽', '개굴닌자'], me: '진우', worlds: { pokemon: [], toystory: [], minions: [], moana: [] } };
const SEEDS = Number(process.env.RNG_SEEDS) || 300;
const IDS = DDIV.map((c) => c.id);
const G62 = IDS.slice(5); // 6-2 칸 (나누는 수가 소수 · 반올림 · 남는 양) — "나머지"라는 말을 쓰지 않는다

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
const floorQ = (x) => Math.floor(x.n / x.d);
/** 수 하나의 글자 → 값: "3" · "2.45" · "3/4" (못 읽으면 null) */
function val(t) {
  const s = String(t).trim(); let m;
  if ((m = /^(\d+)\.(\d+)$/.exec(s))) return Q(+(m[1] + m[2]), P10(m[2].length));
  if ((m = /^(\d+)\/(\d+)$/.exec(s))) return Q(+m[1], +m[2]);
  if ((m = /^(\d+)$/.exec(s))) return Q(+m[1]);
  return null;
}
/** 소수 글자 → { u(점을 뗀 숫자), p(소수 자리 수), text } — 자연수는 p = 0 */
function dec(t) {
  const m = /^(\d+)(?:\.(\d+))?$/.exec(String(t).trim());
  if (!m) return null;
  const fs = m[2] || '';
  return { u: +(m[1] + fs), p: fs.length, text: String(t).trim() };
}
/** 끝나는 소수면 그 글자, 아니면 null */
function decStr(x, maxP = 8) {
  for (let p = 0; p <= maxP; p++) {
    if ((x.n * P10(p)) % x.d === 0) { const u = (x.n * P10(p)) / x.d; if (!p) return String(u); const s = String(u).padStart(p + 1, '0'); return `${s.slice(0, -p)}.${s.slice(-p)}`; }
  }
  return null;
}
/** 반올림·버림 (k자리까지) */
const roundK = (x, k) => Q(Math.floor((2 * x.n * P10(k) + x.d) / (2 * x.d)), P10(k));
const truncK = (x, k) => Q(Math.floor((x.n * P10(k)) / x.d), P10(k));
const digitK = (x, k) => Math.floor((x.n * P10(k + 1)) / x.d) % 10; // 소수 (k+1)째 자리
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

const PLACE = { '일의 자리': 0, '소수 첫째 자리': 1, '소수 둘째 자리': 2 };
/** 문제 글 → { type, form('num'|'pick'), ans | ok(고르기 판정), f: { ops(나누어지는 수, 나누는 수 — 글자), kind, round } } */
function solveText(q) {
  let m;
  if ((m = /몫이 (\d+)보다 큰 것은 어느 것/.exec(q))) { const k = Q(+m[1]); return { type: 'bigger', form: 'pick', ok: (t) => cmpQ(evalExpr(t), k) > 0, f: { N: +m[1] } }; }
  if ((m = /몫을 반올림하여 (일의 자리|소수 첫째 자리|소수 둘째 자리)까지 나타내면/.exec(q))) {
    const e = bolds(q)[0]; const X = evalExpr(e); const k = PLACE[m[1]];
    return { type: `round${k}`, form: 'num', ans: roundK(X, k), f: { ops: e.split(' ÷ '), round: { X, k } } };
  }
  if (/^다음 나눗셈의 몫을 소수로 나타내면 얼마일까요\?/.test(q)) { const e = bolds(q)[0]; return { type: 'natnat', form: 'num', ans: evalExpr(e), f: { ops: e.split(' ÷ ') } }; }
  if (/^다음을 계산하면 얼마일까요\?/.test(q)) { const e = bolds(q)[0]; return { type: 'calc', form: 'num', ans: evalExpr(e), f: { ops: e.split(' ÷ ') } }; }
  const story = [
    [/무게가 (\S+) kg인 밀가루를 (\d+)봉지에 똑같이 나누어 담았어요/, 'flour'],
    [/길이가 (\S+) m인 끈을 (\d+)도막으로 똑같이 잘랐어요/, 'rope'],
    [/길이가 (\S+) m인 돗자리를 (\d+)명이 똑같이 나누어 쓰려고/, 'mat'],
    [/길이가 (\S+) km인 길을 (\d+)구간으로 똑같이 나누었어요/, 'road'],
    [/길이가 (\S+) m인 리본을 (\d+)명이 똑같이 나누어 가졌어요/, 'ribbon'],
    [/(\S+) L인 주스를 (\d+)컵에 똑같이 나누어 담았어요/, 'juice'],
    [/무게가 (\S+) kg인 호두를 (\S+) kg씩 묶으려고 해요\. 몇 묶음/, 'walnut'],
    [/넓이가 (\S+) m²인 직사각형의 세로가 (\S+) m일 때, 가로는/, 'rect'],
    [/파란 리본의 길이는 (\S+) m, 빨간 리본의 길이는 (\S+) m — 파란 리본의 길이는 빨간 리본의 몇 배/, 'times'],
  ];
  for (const [re, type] of story) {
    if ((m = re.exec(q))) return { type, form: 'num', ans: div(val(m[1]), val(m[2])), f: { ops: [m[1], m[2]] } };
  }
  if ((m = /철근 (\S+) m의 무게가 (\S+) kg일 때, 이 철근 1 m의 무게는/.exec(q))) return { type: 'unit', form: 'num', ans: div(val(m[2]), val(m[1])), f: { ops: [m[2], m[1]] } };
  if ((m = /무게가 (\S+) kg인 알밤을 한 사람에게 (\S+) kg씩 나누어 주려고 해요\. 몇 명에게/.exec(q))) {
    const A = val(m[1]); const B = val(m[2]);
    return { type: 'count', form: 'num', ans: Q(floorQ(div(A, B))), f: { ops: [m[1], m[2]], kind: 'count' } };
  }
  if ((m = /무게가 (\S+) kg인 알밤을 한 사람에게 (\S+) kg씩 나누어 주면, 나누어 주고 남는 알밤은/.exec(q))) {
    const A = val(m[1]); const B = val(m[2]);
    return { type: 'remain', form: 'num', ans: sub(A, mul(B, Q(floorQ(div(A, B))))), f: { ops: [m[1], m[2]], kind: 'remain' } };
  }
  return { type: 'unknown' };
}

/**
 * 이름표 뜻 — 그 틀린 생각을 문제 글의 수로 다시 한 값. f: { ops: [나누어지는 수, 나누는 수], kind, round }
 * 판정표는 생성기 이름표를 베끼지 않는다 — 그 이름의 셈이 실제로 하는 일을 이 파일이 다시 쓴다.
 */
function tagHolds(f, tag, t) {
  if (f.N !== undefined) return tag === TAGS.divSmaller && (() => { const m = /^(\d+) ÷ (.+)$/.exec(t); return !!m && +m[1] === f.N && cmpQ(val(m[2]), Q(1)) > 0; })();
  const v = val(t); const is = (w) => !!w && !!v && eq(v, w);
  if (f.round) {
    const { X, k } = f.round; const R = roundK(X, k); const dn = truncK(X, k); const nd = digitK(X, k);
    switch (tag) {
      case TAGS.roundDown: return nd >= 6 && !eq(dn, R) && is(dn);
      case TAGS.fiveDown: return nd === 5 && !eq(dn, R) && is(dn);
      case TAGS.lowPlace: return is(roundK(X, k + 1));
      case TAGS.highPlace: return k >= 1 && is(roundK(X, k - 1));
      default: return false;
    }
  }
  const [A, B] = f.ops.map(dec); if (!A || !B) return false;
  const VA = val(A.text); const VB = val(B.text); const QQ = div(VA, VB);
  const qs = decStr(QQ); const qd = qs ? dec(qs) : null; // 몫의 소수 글자 (끝나는 몫만)
  if (f.kind === 'count') {
    switch (tag) {
      case TAGS.useUp: return !eq(QQ, Q(floorQ(QQ))) && is(Q(floorQ(QQ) + 1));
      case TAGS.dropPoint: return A.p > 0 && B.p === 0 && /^\d+$/.test(t) && is(Q(Math.floor(A.u / B.u)));
      default: return false;
    }
  }
  if (f.kind === 'remain') {
    const k = floorQ(QQ); const rem = sub(VA, mul(VB, Q(k)));
    switch (tag) {
      case TAGS.remScaled: return A.p === B.p && A.p > 0 && is(mul(rem, Q(P10(A.p))));
      case TAGS.remFrac: return is(sub(QQ, Q(k))) && !eq(sub(QQ, Q(k)), rem);
      default: return false;
    }
  }
  const natDivisor = B.p === 0;
  switch (tag) {
    // 몫에 소수점을 안 찍음 — 몫의 숫자를 자연수로 (몫이 소수일 때)
    case TAGS.dropPoint: return !!qd && qd.p > 0 && /^\d+$/.test(t) && +t === qd.u;
    // 몫의 소수점을 한 자리 잘못 — 나누는 수가 자연수인 나눗셈에서 (소수 ÷ 소수는 "옮김" 이름표로)
    case TAGS.pointPos: return natDivisor && (is(mul(QQ, Q(10))) || is(mul(QQ, Q(1, 10))));
    // 몫의 0을 빠뜨림 — 몫 w.0d…에서 소수 첫째 자리의 0을 뺀 수
    case TAGS.quotZero: return !!qs && /^\d+\.0\d+$/.test(qs) && is(val(qs.replace('.0', '.')));
    // 나머지를 버림 — 나누어지는 수의 자리까지만 나누고 멈춤 (나누는 수가 자연수, 몫이 그 자리에서 안 끝날 때)
    case TAGS.stopEarly: return natDivisor && !!qd && qd.p > A.p && is(Q(Math.floor((A.u) / B.u), P10(A.p)));
    // 분자·분모를 이어 씀 — (자연수) ÷ (자연수)를 a/n으로 보고 0.an
    case TAGS.concat: return A.p === 0 && natDivisor && A.u < B.u && is(val(`0.${A.u}${B.u}`));
    case TAGS.swapDiv: return is(div(VB, VA));
    // 나누는 수만 옮김 — 나누는 수를 자연수로 만들고 나누어지는 수는 그대로
    case TAGS.divisorOnly: return B.p > 0 && is(mul(QQ, Q(1, P10(B.p))));
    // 나누어지는 수만 옮김 — 나누는 수는 그대로 두고 나누어지는 수만 (나누는 수만큼 · 또는 자연수가 될 만큼)
    case TAGS.dividendOnly: return B.p > 0 && [B.p, A.p].some((k) => k > 0 && is(mul(QQ, Q(P10(k)))));
    // 옮긴 칸 수가 틀림 — 나누는 수는 맞게(B.p자리), 나누어지는 수는 한 자리 더·덜
    case TAGS.moves: return B.p > 0 && [B.p - 1, B.p + 1].some((m) => m >= 0 && is(m >= B.p ? mul(QQ, Q(P10(m - B.p))) : mul(QQ, Q(1, P10(B.p - m)))));
    default: return false;
  }
}

const allText = (q) => [q.q, ...q.choices.map((x) => x.text), ...(q.solve ? [...q.solve.steps, ...Object.values(q.solve.why), q.solve.whyAny, q.solve.rule] : [])].join('\n');
function* every(kinds = ['calc', 'misread'], n = SEEDS) {
  for (const c of DDIV) for (const k of kinds) for (let s = 1; s <= n; s++) yield { c, k, s, q: makeQuestion(c.id, k, s, OPTS) };
}

// ───────────────────── 사다리 ─────────────────────

test('사다리: 10칸, 모두 초6, needs가 바로 앞 칸 · 맨 뒤는 ⭐ · 교과서 차시 순서', () => {
  assert.deepEqual(IDS, ['ddiv.dnat', 'ddiv.small', 'ddiv.down', 'ddiv.zeroq', 'ddiv.natnat', 'ddiv.same', 'ddiv.diff', 'ddiv.natdec', 'ddiv.round', 'ddiv.apply']);
  DDIV.forEach((c, i) => {
    assert.equal(c.grade, 6, c.id);
    assert.deepEqual(c.needs, i ? [IDS[i - 1]] : [], c.id);
    assert.ok(c.idea && c.rule && c.slip, c.id);
  });
  assert.equal(gradeLabel(6), '초6');
  assert.match(DDIV[9].name, /^⭐/);
});

test('계산기 자체 점검 — 반올림·버림·끝나는 소수 · 이름표 판정의 몇 예 (지도서 6-1 186·198·199쪽, 6-2 200쪽 오답)', () => {
  assert.ok(eq(evalExpr('4.8 ÷ 1.2'), Q(4)));
  assert.ok(eq(roundK(evalExpr('2.5 ÷ 0.7'), 1), Q(36, 10)) && eq(roundK(evalExpr('2.5 ÷ 0.7'), 2), Q(357, 100)) && eq(truncK(evalExpr('2.5 ÷ 0.7'), 1), Q(35, 10)));
  assert.equal(digitK(evalExpr('2.5 ÷ 0.7'), 1), 7);
  assert.equal(decStr(Q(405, 100)), '4.05');
  assert.equal(decStr(Q(1, 3)), null);
  const f = (a, b) => ({ ops: [a, b] });
  assert.ok(tagHolds(f('4.8', '6'), TAGS.dropPoint, '8'), '6-1 186쪽 6)4.8의 몫을 8 (바른 답 0.8)');
  assert.ok(tagHolds(f('20.1', '5'), TAGS.quotZero, '4.2'), '6-1 199쪽 20.1 ÷ 5 = 4.2 (바른 답 4.02)');
  assert.ok(tagHolds(f('16.24', '8'), TAGS.pointPos, '20.3'), '6-1 198쪽 16.24 ÷ 8 = 20.3 (바른 답 2.03)');
  assert.ok(tagHolds(f('3.68', '0.4'), TAGS.divisorOnly, '0.92'), '6-2 200쪽 3.68 ÷ 0.4 = 0.92 (바른 답 9.2)');
  assert.ok(tagHolds(f('20.72', '3.7'), TAGS.moves, '56'), '6-2 200쪽 20.72 ÷ 3.7 = 2072 ÷ 37 (바른 답 5.6)');
  assert.ok(tagHolds(f('4.3', '2'), TAGS.stopEarly, '2.1'));
  assert.ok(tagHolds(f('3', '4'), TAGS.concat, '0.34'));
  assert.ok(tagHolds({ ops: ['6.4', '2.1'], kind: 'remain' }, TAGS.remScaled, '1'), '6-2 남는 알밤 0.1 kg — 64 ÷ 21의 1');
  assert.ok(tagHolds({ ops: ['6.6', '1.5'], kind: 'remain' }, TAGS.remFrac, '0.4'), '6.6 ÷ 1.5 = 4.4 — 몫의 소수 부분 0.4 (남는 양은 0.6)');
  assert.ok(tagHolds({ ops: ['9.5', '2'], kind: 'count' }, TAGS.useUp, '5'));
  const rd = { ops: ['2.5', '0.7'], round: { X: evalExpr('2.5 ÷ 0.7'), k: 1 } };
  assert.ok(tagHolds(rd, TAGS.roundDown, '3.5') && tagHolds(rd, TAGS.lowPlace, '3.57') && tagHolds(rd, TAGS.highPlace, '4'));
  assert.ok(!tagHolds(f('4.8', '1.2'), TAGS.pointPos, '40'), '소수 ÷ 소수는 "소수점 위치"가 아니라 옮김 이름표로');
  assert.ok(!tagHolds({ ops: ['6.6', '1.5'], kind: 'remain' }, TAGS.remFrac, '0.6'), '남는 양 그 자체는 몫의 소수 부분이 아니다');
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
  assert.ok(types.size >= 24, `문제 종류 ${types.size}: ${[...types]}`);
});

test('★ 보기: 정답 하나, 글자 겹침 없음, 3개 이상, 빈 글자·undefined·NaN·남은 자리표시 없음 · ① 계산엔 그림 없음 · ② 그림은 나눗셈 그림만, 모두 그려진다', () => {
  let figs = 0;
  for (const { c, k, s, q } of every()) {
    const at = `${c.id} ${k} #${s}`;
    assert.ok(q.choices.length >= 3, `${at}: 보기 ${q.choices.length}`);
    assert.equal(q.choices.filter((x) => x.ok).length, 1, at);
    assert.equal(new Set(q.choices.map((x) => x.text)).size, q.choices.length, `${at}: 같은 글자 보기`);
    const all = allText(q);
    assert.ok(!/undefined|NaN|\{(me|mon)|null|Infinity|object Object/.test(all), `${at}: ${all}`);
    const ds = q.q.match(/\[[a-z]+ [^\]]+\]/g) || [];
    if (k === 'calc') assert.equal(ds.length, 0, `${at}: ① 계산에 그림 ${ds}`);
    for (const d of ds) {
      assert.match(d, /^\[ddiv /, `${at}: 다른 그림 ${d}`);
      assert.ok(figureSvg(d.slice(1, -1)).startsWith('<svg'), `${at}: 못 그리는 ${d}`);
      figs++;
    }
  }
  assert.ok(figs > SEEDS / 3, `② 그림 ${figs}`);
});

test('★ 오개념 이름표: 그 오답이 정말 그 틀린 생각이다 — 문제 글의 수로 틀린 셈을 다시 한다 · 이름표 붙은 오답이 늘 둘 이상', () => {
  let n = 0; const used = new Set();
  for (const { c, s, q } of every(['calc'])) {
    const sv = solveText(q.q);
    const tagged = q.choices.filter((x) => !x.ok && x.tag !== '계산 실수');
    assert.ok(tagged.length >= 2, `${c.id} #${s}: 이름표 붙은 오답 ${tagged.length}\n${q.q}\n${q.choices.map((x) => `${x.text}[${x.tag || ''}]`).join(' | ')}`);
    for (const w of tagged) { assert.ok(tagHolds(sv.f, w.tag, w.text), `${c.id} #${s} (${sv.type}): "${w.text}"의 이름표 "${w.tag}"가 뜻과 다르다\n${q.q}`); n++; used.add(w.tag); }
  }
  assert.ok(n > 18 * SEEDS, `본 이름표 ${n}`);
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

test('★ 수 보기 꼴: 소수 부분의 끝자리 0을 지운 소수·자연수 · 0으로 시작하는 자연수 없음 · 고르기 보기는 "N ÷ 소수"', () => {
  let n = 0;
  for (const { c, s, q } of every(['calc'])) {
    if (solveText(q.q).form === 'pick') { for (const x of q.choices) assert.match(x.text, /^\d+ ÷ \d+\.\d+$/, `${c.id} #${s}`); continue; }
    for (const x of q.choices) { assert.match(x.text, /^(0|[1-9]\d*)(\.\d*[1-9])?$/, `${c.id} #${s}: 보기 꼴 "${x.text}"`); n++; }
  }
  assert.ok(n > 25 * SEEDS, `본 보기 ${n}`);
});

/** ② 문항 — 바른 값(문제 글에서 따로) · 보여 준 말 · 판정표용 f */
function misreadFacts(q) {
  const B = bolds(q.q); const shown = B[B.length - 1] || '';
  let m;
  if ((m = /^(\S+) ÷ (\S+)의 몫은 (\S+)보다 작아요$/.exec(shown))) return { shown, right: div(val(m[1]), val(m[2])), base: val(m[3]), bigger: true, f: { ops: [m[1], m[2]] } };
  if ((m = /소수 (첫째|둘째) 자리까지 나타내요/.exec(q.q))) {
    const k = m[1] === '첫째' ? 1 : 2; const e = shown.split(' → ')[0]; const X = evalExpr(e);
    return { shown, right: roundK(X, k), f: { ops: e.split(' ÷ '), round: { X, k } } };
  }
  if ((m = /(\S+) kg인 알밤을 한 사람에게 (\S+) kg씩 나누어 주었어요/.exec(q.q))) {
    const A = val(m[1]); const Bv = val(m[2]);
    return { shown, right: sub(A, mul(Bv, Q(floorQ(div(A, Bv))))), f: { ops: [m[1], m[2]], kind: 'remain' } };
  }
  const left = shown.split(' = ')[0];
  return { shown, right: evalExpr(left), f: { ops: left.split(' ÷ ') } };
}
test('★ ② 오개념 문항: 보여 준 말은 정말 틀렸다 · 고치는 말의 결론만 맞다 · 이름표 붙은 보기의 결론은 바른 값과 다르다 · 갈래 열쇠 둘씩 · 엉뚱한 지적은 거짓 단정', () => {
  const keys = {};
  for (const { c, s, q } of every(['misread'], Math.max(SEEDS, 600))) {
    (keys[c.id] = keys[c.id] || new Set()).add(q.key);
    const at = `${c.id} #${s} ${q.key}`;
    const { shown, right, base, bigger } = misreadFacts(q);
    assert.ok(right && right.n > 0, `${at}: 바른 값\n${q.q}`);
    if (bigger) assert.ok(cmpQ(right, base) > 0, `${at}: "작아요"가 맞는 말이다 — ${show(right)} vs ${show(base)}`);
    else assert.ok(!eq(lastNum(shown), right), `${at}: 보여 준 말 "${shown}"의 결론이 맞는 값\n${q.q}`);
    const ok = q.choices.find((x) => x.ok);
    assert.ok(eq(lastNum(ok.text), right), `${at}: 고치는 말 "${ok.text}"의 결론 ≠ ${show(right)}`);
    for (const w of q.choices.filter((x) => !x.ok)) {
      if (w.tag === '엉뚱한 지적') { assert.match(w.text, /(없어요|안 돼요|나눠요|건너뛰어요)$/, `${at}: 엉뚱한 지적 "${w.text}"`); continue; }
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
    const { shown, f, bigger } = misreadFacts(q);
    for (const w of q.choices.filter((x) => !x.ok && !['엉뚱한 지적', '틀린 줄 모름'].includes(x.tag))) {
      const tail = /(\d+\.\d+|\d+)$/.exec(w.text)[1];
      assert.ok(tagHolds(f, w.tag, tail), `${c.id} #${s}: ② 보기 "${w.text}"의 이름표 "${w.tag}"가 뜻과 다르다\n${q.q}`);
      n++;
    }
    if (!bigger) {
      const tail = /(\d+\.\d+|\d+)(?: kg)?$/.exec(shown)[1];
      assert.ok(allTags.some((tg) => tagHolds(f, tg, tail)), `${c.id} #${s}: 보여 준 답 "${tail}"이 어느 틀린 셈에서도 안 나온다\n${q.q}`);
    }
  }
  assert.ok(n >= 10 * 600, `본 ② 이름표 ${n}`);
});

// ───────────────────── 글 ─────────────────────

const UNIT_JOSA = /(?<![가-힣a-z])(?:km|m|L|kg)(?:이에요|예요|이고|이면|이|가|은|는|을|를|와|과|으로|로)(?![가-힣])/;
const FRAC_JOSA = /\/(?:\d+)(?:이에요|예요|이라서|라서|이니까|니까|이고|이면|이|가|은|는|을|를|와|과|도|으로|로|의|에)/;
const DIRECTIVES = /\[ddiv [^\]]+\]/g;

test('★ 조사: 수 뒤는 읽는 소리(소수는 끝자리) · 단위 글자(km·m·L·kg)·분수 바로 뒤에는 없음 · ASCII 빼기 없음 · 칸 설명도', () => {
  const BAT = new Set(['0', '1', '3', '6', '7', '8']);
  const PAIRS = [['을', '를'], ['은', '는'], ['이', '가'], ['과', '와'], ['이에요', '예요'], ['이니까', '니까'], ['이라서', '라서']];
  let hitN = 0;
  const look = (all, at) => {
    for (const [wb, nb] of PAIRS) {
      for (const m of all.matchAll(new RegExp(`(?<![\\d/])(\\d+)(${wb}|${nb})(?=[\\s.,!?)—:]|$)`, 'g'))) { assert.equal(m[2], BAT.has(m[1].slice(-1)) ? wb : nb, `${at}: "…${m[1]}${m[2]}"\n${all}`); hitN++; }
    }
    for (const m of all.matchAll(/(?<![\d/])(\d+)(으로|로)(?=[\s.,]|$)/g)) assert.equal(m[2], ['1', '7', '8'].includes(m[1].slice(-1)) ? '로' : BAT.has(m[1].slice(-1)) ? '으로' : '로', `${at}: "…${m[1]}${m[2]}"`);
    const up = UNIT_JOSA.exec(all); assert.ok(!up, `${at}: 단위 글자 바로 뒤 조사 "${up && up[0]}"\n${all}`);
    const fp = FRAC_JOSA.exec(all); assert.ok(!fp, `${at}: 분수 바로 뒤 조사 "${fp && fp[0]}"\n${all}`);
    assert.ok(!/-\d|\d-/.test(all), `${at}: ASCII 빼기`);
    assert.ok(!/[a-z]\/[a-z\d]|\d\/[a-z]/.test(all), `${at}: 문자 분수`);
  };
  for (const { c, k, s, q } of every()) look(allText(q).replace(/\*\*/g, '').replace(DIRECTIVES, ''), `${c.id} ${k} #${s}`);
  for (const c of DDIV) look([c.name, c.idea, c.rule, c.slip].join('\n').replace(/\*\*/g, ''), `${c.id} 설명`);
  assert.ok(hitN > SEEDS, `실제로 본 곳 ${hitN}`);
});

test('★ 풀이 카드: 단계 · 기억할 것 · 오답마다 왜 · 정답이 단계에 나온다', () => {
  for (const { c, k, s, q } of every()) {
    const sv = q.solve;
    assert.ok(sv && sv.steps.length >= 2 && sv.rule, `${c.id} ${k} #${s}`);
    for (const w of q.choices.filter((x) => !x.ok)) assert.ok(sv.why[w.tag] || sv.whyAny, `${c.id} ${k} #${s}: "${w.tag}" 설명 없음`);
    const ok = q.choices.find((x) => x.ok).text;
    if (k === 'calc' && /^\d/.test(ok)) assert.ok(new RegExp(`(?<![\\d.])${ok.replace('.', '\\.')}(?![\\d]|\\.\\d)`).test(sv.steps.join(' ')), `${c.id} #${s}: 정답 "${ok}"이 풀이에 없다\n${sv.steps.join('\n')}`);
  }
});

/** 글 속 "식 = 식 = …" — 소수·분수까지 계산기로 (② 보여 준 말·오답 보기는 빼고) */
function eqChains(text) {
  const out = [];
  for (const m of String(text).matchAll(/(?<![+−×÷] |[\d/.])[\d(](?:[\d /()+−×÷=]|\.(?=\d))*[\d)]/g)) {
    const parts = m[0].split(' = ').map((x) => x.trim());
    if (parts.length < 2) continue;
    const vals = parts.map((p) => { try { return evalExpr(p); } catch { return null; } });
    for (let i = 1; i < vals.length; i++) if (vals[i - 1] && vals[i]) out.push({ a: parts[i - 1], b: parts[i], ok: eq(vals[i - 1], vals[i]) });
  }
  return out;
}
test('★ 글 속 셈식은 맞다 (소수·분수까지) — 문제·정답·풀이·왜 전부 · 칸 설명도 · 반올림 풀이는 "="가 아니라 "→"', () => {
  let n = 0;
  for (const { c, k, s, q } of every()) {
    const all = [q.q.replace(/\*\*.+?\*\*/g, ''), q.choices.find((x) => x.ok).text, ...q.solve.steps, ...Object.values(q.solve.why), q.solve.whyAny].join('\n');
    for (const e of eqChains(all)) { assert.ok(e.ok, `${c.id} ${k} #${s}: ${e.a} = ${e.b}`); n++; }
  }
  assert.ok(n > 12 * SEEDS, `셈식 ${n}`);
  let m = 0;
  for (const c of DDIV) for (const e of eqChains(`${c.idea}\n${c.rule}`.replace(/\*\*/g, ''))) { assert.ok(e.ok, `${c.id} 설명: ${e.a} = ${e.b}`); m++; }
  assert.ok(m >= 20, `칸 설명 셈식 ${m}`);
});

test('🔁 쌍둥이·🤔 노트: 요청한 틀·갈래로 온다 · 같은 셈 · 쌍둥이 글이 원래 글과 같은 일은 드물다', () => {
  const same2 = {}; const tot = {};
  for (const c of DDIV) {
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
  [/나누면 (?:늘|항상) 작아져/, '0보다 큰 수를 1보다 작은 수로 나누면 커진다'],
  // Codex 38차 #2와 같은 뿌리 — 0 ÷ 0.5 = 0은 그대로: 일반 규칙엔 "0보다 큰 수를"(또는 그 문제의 수)을 바로 앞에
  // "0보다 큰 수를"은 같은 문장 앞 어디든(두 마디를 한 조건으로 — 소수점 말고 . ? ! 에서 끊는다) · 그 문제의 수(8을)는 바로 앞에만, 0은 조건이 아니다
  //   (처음엔 수도 "같은 줄 앞 어디든"이라 "7.2를 72로 … 1보다 작은 수로 나누면"이 지나갔고 — 원고 변이 검사가 잡음 — "0을 …"·앞 문장의 조건도 봐줬다 — Codex 39차 #6)
  [/(?<!0보다 큰 수를 (?:[^\n.?!]|\.(?=\d))*|\d*[1-9]\d*[를을] |\d*[1-9]\d*에 )1보다 (?:작은|큰) 수로 나누면/, '0을 나누면 그대로 — "0보다 큰 수를 1보다 작은 수로 나누면"'],
  [/소수점을 (?:맞춰|맞추어) 나누/, '나눗셈은 소수점을 맞추지 않는다(덧셈의 규칙)'],
  [/나누는 수(?:의 소수점)?만 옮겨(?:요|도 돼)/, '두 수를 똑같이 옮긴다'],
  [/남는 양은 몫의 소수 부분이에요|몫의 소수 부분이 남는 양/, '남는 양은 몫의 소수 부분이 아니다(지도서 6-2 212쪽)'],
  [/(?<!소수 부분의 )끝자리(?:에)? 0(?:이 생기면|은 지워)/, '자연수의 0은 지우면 안 된다 — "소수 부분의 끝자리 0"'],
];
test('★ 참말에 틀린 말이 없다 — 나누면 늘 작아진다 · 조건 없는 "1보다 작은 수로 나누면" · 소수점을 맞춰 나눈다 · 나누는 수만 옮긴다 · 남는 양 = 몫의 소수 부분', () => {
  const truths = (q) => [q.choices.find((x) => x.ok).text, ...(q.solve ? [...q.solve.steps, ...Object.values(q.solve.why), q.solve.whyAny, q.solve.rule] : [])].join('\n').replace(/\*\*/g, '');
  for (const { c, k, s, q } of every()) {
    const t = truths(q);
    for (const [re, why] of BAD) assert.ok(!re.test(t), `${c.id} ${k} #${s}: ${why}\n${t}`);
  }
  for (const c of DDIV) for (const [re, why] of BAD) assert.ok(!re.test([c.idea, c.rule, c.slip].join('\n').replace(/\*\*/g, '')), `${c.id}: ${why}`);
});

// 아직 안 배운 말 — "반올림"은 X9부터, "남는 양"은 X10부터 · 6-2 칸(X6~X10) 글엔 "나머지"를 쓰지 않는다 (지도서 6-2 181쪽, 이름표 "나머지를 버림"은 6-1 칸에서만)
const FIRST = [[/반올림/, 'ddiv.round'], [/남는 (?:양|알밤|길이)|남은 양/, 'ddiv.apply']];
test('★ 아직 안 배운 말을 앞 칸에 쓰지 않는다 — 반올림 X9부터 · 남는 양 X10부터 · 6-2 칸 글엔 "나머지"가 없다 (이름표 포함)', () => {
  const idx = (id) => IDS.indexOf(id);
  for (const c of DDIV) for (const [re, at] of FIRST) if (idx(at) > idx(c.id)) assert.ok(!re.test(`${c.name} ${c.idea} ${c.rule} ${c.slip}`), `${c.id}: 설명에 ${re}`);
  for (const { c, k, s, q } of every()) {
    const all = allText(q) + ' ' + q.choices.map((x) => x.tag || '').join(' ');
    for (const [re, at] of FIRST) if (idx(at) > idx(c.id)) assert.ok(!re.test(all), `${c.id} ${k} #${s}: 아직 안 배운 ${re}\n${all}`);
    if (G62.includes(c.id)) assert.ok(!/나머지/.test(all), `${c.id} ${k} #${s}: 6-2 칸에 "나머지"\n${all}`);
  }
  for (const id of G62) assert.ok(!/나머지/.test(Object.values(DDIV.find((c) => c.id === id)).filter((v) => typeof v === 'string').join(' ')), `${id} 설명에 "나머지"`);
});

test('🔢 숫자판: 수가 답인 ①은 모두 숫자판 · 모든 수 보기를 쳐서 그 보기로 간다 · 끝자리 0을 붙여 쳐도 맞음 · 빠진 오답 후보는 그 이름표 · 고르기는 보기 그대로 · ± 없음', () => {
  const pv = readFileSync(new URL('../js/padview.js', import.meta.url), 'utf8');
  const MAX = +/const MAX = (\d+);/.exec(pv)[1];
  let n = 0; let dropped = 0; let picks = 0;
  for (const { c, s, q } of every(['calc'], 200)) {
    const spec = padSpec(q, 'decdiv');
    if (solveText(q.q).form === 'pick') { assert.equal(spec, null, `${c.id} #${s}: 고르는 문제에 숫자판`); picks++; continue; }
    assert.ok(spec, `${c.id} #${s}: 숫자판이 없다\n${q.q}`);
    const sv0 = solveText(q.q);
    assert.equal(spec.need, sv0.type === 'natnat' ? 'num' : null, `${c.id} #${s}: 꼴 — ${spec.need}`);
    assert.equal(spec.signed, false, `${c.id} #${s}: ± 없음`);
    for (const ch of q.choices) {
      assert.ok(String(ch.text).length <= MAX, `${c.id} #${s}: "${ch.text}"`);
      const t = partsOf(ch.text);
      assert.ok(t && spec.modes.includes(t.mode), `${c.id} #${s}: "${ch.text}"를 칸으로 못 나눔`);
      const hit = matchTyped(q, readTyped(t.mode, t.p, spec), spec);
      assert.equal(q.choices[hit.i], ch, `${c.id} #${s}: "${ch.text}"를 쳐도 그 보기로 안 간다`);
      n++;
    }
    const ok = q.choices.find((x) => x.ok);
    const padded = ok.text.includes('.') ? `${ok.text}0` : `${ok.text}.0`;
    const hit0 = matchTyped(q, readTyped('num', { sign: '', x: padded }, spec), spec);
    assert.ok(q.choices[hit0.i] && q.choices[hit0.i].ok, `${c.id} #${s}: ${padded}이 틀림`);
    for (const w of q.probe.allWrong) {
      if (q.choices.some((x) => x.text === w.text)) continue;
      const t = partsOf(w.text); const hit = matchTyped(q, readTyped(t.mode, t.p, spec), spec);
      if (q.choices[hit.i]) continue;
      assert.equal(hit.known && hit.known.tag, w.tag, `${c.id} #${s}: 빠진 후보 "${w.text}"[${w.tag}]`);
      dropped++;
    }
  }
  assert.ok(n > 1000, `쳐 본 보기 ${n}`);
  // X는 문제마다 오개념 후보가 3개 이하라 보기 4칸에 다 들어간다 — 빠진 후보 길(known)은 W·V에서 시험한다
  assert.ok(picks > 0, `고르기 ${picks}`);
  for (const { c, s, q } of every(['calc'], 200)) if (q.probe.allWrong.length) assert.ok(q.probe.allWrong.length <= 3 && q.probe.allWrong.every((w) => q.choices.some((x) => x.text === w.text)), `${c.id} #${s}: 화면에서 빠진 후보 ${q.probe.allWrong.map((w) => w.text)} — 빠지면 숫자판 known 길도 시험할 것`);
  assert.equal(dropped, 0);
});

// ───────────────────── 그림 ─────────────────────

const attrsOf = (svg, cls) => [...svg.matchAll(new RegExp(`<(?:rect|path|text|line) class="${cls}"([^>]*)>`, 'g'))].map((m) => {
  const o = {}; for (const a of m[1].matchAll(/([a-z-]+)="([^"]*)"/g)) o[a[1]] = a[2]; return o;
});
test('🎨 나눗셈 그림 [ddiv]: 띠 도막 수 = 나누어지는 수 ÷ 나누는 수의 자연수 부분 · 남는 끝 길이 비례 · 똑같이 나누기 묶음·칸 수 · 폭 400 · 글로 바꾸기 · 못 그리는 지시문은 빈 그림', () => {
  for (const [A, B] of [['1.2', '0.3'], ['6.4', '2.1'], ['9.6', '1.5'], ['2', '0.5'], ['0.36', '0.12'], ['4.8', '0.4']]) {
    const svg = figureSvg(`ddiv fit ${A} ${B}`); const X = div(val(A), val(B)); const k = floorQ(X);
    const P = attrsOf(svg, 'dd-p'); const Rm = attrsOf(svg, 'dd-r');
    assert.equal(P.length, k, `fit ${A} ${B}: 도막`);
    const rem = sub(val(A), mul(val(B), Q(k)));
    assert.equal(Rm.length, rem.n ? 1 : 0, `fit ${A} ${B}: 남는 끝`);
    const w1 = +P[0].width; const wsum = P.reduce((a, p) => a + +p.width, 0) + (Rm[0] ? +Rm[0].width : 0);
    assert.ok(Math.abs(wsum - 360) < 0.6, `fit ${A} ${B}: 전체 폭 ${wsum}`);
    if (rem.n) { assert.ok(eq(val(Rm[0]['data-rem']), rem), `남는 길이 ${Rm[0]['data-rem']}`); assert.ok(Math.abs(+Rm[0].width / w1 - (rem.n / rem.d) / (val(B).n / val(B).d)) < 0.02, '남는 끝 길이 비례'); }
    assert.match(svg, new RegExp(`class="dd-b"[^>]*>${B.replace('.', '\\.')}<`), '한 도막 길이');
    // 눈금 글자끼리 겹치지 않는다 (6.4 ÷ 2.1 — 6.3과 6.4가 붙어 "6634"로 보였다) · 남는 끝이 있으면 그 길이를 적는다
    const xs = attrsOf(svg, 'dd-t').map((t) => +t.x).sort((a, b) => a - b);
    for (let i = 1; i < xs.length; i++) assert.ok(xs[i] - xs[i - 1] >= 30, `fit ${A} ${B}: 눈금 글자 간격 ${xs[i] - xs[i - 1]}`);
    if (rem.n) assert.match(svg, new RegExp(`class="dd-rl"[^>]*>남는 길이 ${decStr(rem).replace('.', '\\.')}<`), '남는 길이 글자');
  }
  for (const [A, n] of [['2.4', 2], ['3.6', 3], ['1.5', 5], ['0.8', 4]]) {
    const svg = figureSvg(`ddiv share ${A} ${n}`); const C = attrsOf(svg, 'dd-c'); const t = val(A).n * 10 / val(A).d;
    assert.equal(C.length, t, `share ${A} ${n}: 0.1 칸 전부`);
    assert.equal(new Set(C.map((x) => x['data-g'])).size, n, `${n}묶음`);
    for (let g = 0; g < n; g++) assert.equal(C.filter((x) => x['data-g'] === String(g)).length, t / n, `묶음 ${g}`);
  }
  for (const s of ['ddiv fit 1.2 0.3', 'ddiv share 2.4 2']) assert.ok(+/viewBox="0 0 (\d+)/.exec(figureSvg(s))[1] <= 400, s);
  for (const bad of ['ddiv fit 0.3 1.2', 'ddiv fit 9.5 0.19', 'ddiv fit 1.2', 'ddiv share 1.2 5', 'ddiv share 4.5 3', 'ddiv share 2.45 5', 'ddiv share 2.4 6', 'ddiv x 1 2']) assert.equal(figureSvg(bad), '', bad);
  assert.match(figText('앞 [ddiv fit 6.4 2.1] 뒤'), /^앞 \(띠: 길이 6\.4에서 2\.1씩 3도막 — 남는 길이 0\.1\) 뒤$/);
  assert.match(figText('[ddiv share 2.4 2]'), /0\.1 칸 24개를 2묶음으로 — 한 묶음에 12칸/);
  assert.equal(figText('앞 [ddiv fit 1.2 0.3] 뒤', true), '앞 (나눗셈 그림) 뒤');
  assert.ok(renderFigures('[ddiv share 2.4 2]').startsWith('<svg'));
  assert.ok(!/나머지/.test(figureSvg('ddiv fit 6.4 2.1') + figText('[ddiv fit 6.4 2.1]')), '그림 글에도 "나머지"를 쓰지 않는다');
});

test('🎨 ② 그림은 문제의 식 그대로 — [ddiv share A n]은 "A ÷ n" · [ddiv fit A B]는 "A ÷ B"', () => {
  const seen = { share: 0, fit: 0 };
  for (const { c, s, q } of every(['misread'], Math.max(SEEDS, 600))) {
    const m = /\[ddiv (share|fit) (\S+) (\S+)\]/.exec(q.q);
    if (!m) continue;
    const lhs = misreadFacts(q).shown.split(' = ')[0];
    assert.equal(lhs, `${m[2]} ÷ ${m[3]}`, `${c.id} #${s}: 그림 ${m[0]} ≠ 식 ${lhs}`);
    assert.ok(!renderFigures(q.q).includes('[ddiv '), `${c.id} #${s}: renderFigures가 그림을 못 바꿈`);
    seen[m[1]]++;
  }
  assert.ok(seen.share > 50 && seen.fit > 50, `본 그림 ${JSON.stringify(seen)}`);
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
  for (const c of DDIV) {
    const round = makeRound(c.id, 11, OPTS);
    assert.ok(round.length >= 2 && round.every((q) => q.concept === c.id), c.id);
    const les = lessonOf(c.id, 3, OPTS);
    assert.ok(les.pages.length >= 1 && les.title === c.name);
  }
  assert.ok(checkContent({}).length >= 10, '빈 원고는 칸마다 걸린다');
});

test('칸마다 수의 꼴 — X1 (소수)÷(자연수) 몫 ≥ 1 · X2 몫 < 1 · X3 0을 한 번 내림 · X4 몫의 소수 첫째 자리 0 · X5 (자연수)÷(자연수) · X6 자릿수가 같은 · X7 다른 · X8 (자연수)÷(소수) · X9 반올림할 몫 · X10 남는 양', () => {
  const shapes = {};
  const mark = (k) => { shapes[k] = (shapes[k] || 0) + 1; };
  for (let s = 1; s <= SEEDS; s++) {
    const P = (id) => { const sv = solveText(makeQuestion(id, 'calc', s, OPTS).q); return { sv, D: sv.f.ops ? sv.f.ops.map(dec) : null }; };
    { const { sv, D } = P('ddiv.dnat'); const qd = dec(decStr(sv.ans)); assert.ok(D[0].p >= 1 && D[1].p === 0 && floorQ(sv.ans) >= 1 && qd.p === D[0].p, `X1 #${s} ${sv.f.ops}`); mark(`X1:${D[0].p}`); }
    // 틀이 정한 모양 — "각 자리에서 나누어떨어지는"(9.36 ÷ 3)인지 아닌지(11.2 ÷ 4)를 숫자로 대조 (변이 검사가 찾은 구멍)
    { const q = makeQuestion('ddiv.dnat', 'calc', s, OPTS); const [A, n] = solveText(q.q).f.ops.map(dec); const allDiv = String(A.u).split('').every((d) => +d % n.u === 0); assert.equal(allDiv, q.probe.shape === 'even', `X1 #${s}: ${A.text} ÷ ${n.text} — 각 자리에서 나누어떨어짐 ${allDiv} · 틀 ${q.probe.shape}`); mark(`X1shape:${q.probe.shape}`); }
    { const { sv, D } = P('ddiv.small'); assert.ok(D[0].p >= 1 && D[1].p === 0 && cmpQ(sv.ans, Q(1)) < 0 && cmpQ(sv.ans, Q(1, 10)) >= 0, `X2 #${s} ${sv.f.ops}`); mark(`X2:${D[1].u > 9}`); }
    { const { sv, D } = P('ddiv.down'); const qd = dec(decStr(sv.ans)); assert.ok(D[1].p === 0 && qd.p === D[0].p + 1 && !/\.0/.test(qd.text), `X3 #${s} ${sv.f.ops} = ${qd.text}`); mark(`X3:${floorQ(sv.ans) >= 1}`); }
    { const { sv, D } = P('ddiv.zeroq'); const qs = decStr(sv.ans); assert.ok(D[1].p === 0 && /^\d+\.0\d$/.test(qs), `X4 #${s} ${sv.f.ops} = ${qs}`); mark(`X4:${D[0].p}${floorQ(sv.ans) >= 1}`); }
    { const { sv, D } = P('ddiv.natnat'); const qs = decStr(sv.ans); assert.ok(D[0].p === 0 && D[1].p === 0 && /\./.test(qs), `X5 #${s} ${sv.f.ops}`); mark(`X5:${D[0].u < D[1].u}`); }
    { const { sv, D } = P('ddiv.same'); assert.ok(D[0].p === D[1].p && D[0].p >= 1, `X6 #${s} ${sv.f.ops}`); mark(`X6:${D[0].p}${/\./.test(decStr(sv.ans))}`); }
    { const { sv, D } = P('ddiv.diff'); assert.ok(D[0].p !== D[1].p && D[0].p >= 1 && D[1].p >= 1, `X7 #${s} ${sv.f.ops}`); mark(`X7:${D[0].p}${D[1].p}`); }
    { const { sv, D } = P('ddiv.natdec'); if (sv.form === 'pick') mark('X8:pick'); else { assert.ok(D[0].p === 0 && D[1].p >= 1, `X8 #${s} ${sv.f.ops}`); mark(`X8:${D[1].p}${/\./.test(decStr(sv.ans))}`); } }
    {
      const { sv } = P('ddiv.round'); const { X, k } = sv.f.round;
      assert.ok(!decStr(X, k), `X9 #${s}: 몫이 ${k}자리 안에서 끝난다`);
      if (k > 0) assert.ok(((sv.ans.n * P10(k)) / sv.ans.d) % 10 !== 0, `X9 #${s}: 반올림한 수의 끝자리 0 (${show(sv.ans)})`);
      mark(`X9:${k}`);
    }
    { const { sv } = P('ddiv.apply'); mark(`X10:${sv.type}`); }
  }
  for (const k of ['X1shape:even', 'X1shape:uneven', 'X1:1', 'X1:2','X2:true', 'X2:false', 'X3:true', 'X3:false', 'X4:1true', 'X4:2true', 'X4:2false', 'X5:true', 'X5:false', 'X6:1false', 'X6:1true', 'X6:2false', 'X7:21', 'X7:12', 'X8:1false', 'X8:2false', 'X8:1true', 'X8:pick', 'X9:0', 'X9:1', 'X9:2', 'X10:count', 'X10:remain', 'X10:times', 'X10:unit']) assert.ok(shapes[k], `나와야 하는 꼴 ${k}`);
});

// 드문 수는 넓혀서 찾는다 — "반올림한 수의 끝자리가 0"(3.96 → 4.0)·"몫이 1보다 작아 오답이 0" 같은 수는 씨앗 300개에 거의 안 나와,
// 그 조건을 지운 변이가 씨앗 120·300개에서 지나가고 3,000개에서야 잡혔다 (W의 "우연히 같은 수" 테스트와 같은 뜻)
test('★ 반올림 문항(X9)만 씨앗 5,000개 — 몫은 1 이상이고 그 자리에서 안 끝나며, 반올림한 수·버린 수의 끝자리가 0이 아니고, 이름표 붙은 오답이 둘 이상', () => {
  const ks = new Set();
  for (let s = 1; s <= 5000; s++) {
    const q = makeQuestion('ddiv.round', 'calc', s, OPTS); const sv = solveText(q.q); const { X, k } = sv.f.round;
    const at = `X9 #${s} ${sv.f.ops.join(' ÷ ')} (${k}자리)`;
    assert.ok(floorQ(X) >= 1 && !decStr(X, k), `${at}: 몫 ${show(X)}`);
    const R = roundK(X, k); const dn = truncK(X, k);
    if (k > 0) {
      assert.ok(((R.n * P10(k)) / R.d) % 10 !== 0, `${at}: 반올림한 수의 끝자리 0 (${show(R)})`);
      if (!eq(dn, R)) assert.ok(((dn.n * P10(k)) / dn.d) % 10 !== 0, `${at}: 버린 수의 끝자리 0 (${show(dn)})`);
    }
    assert.ok(q.choices.filter((x) => !x.ok && x.tag !== '계산 실수').length >= 2, `${at}: 이름표 붙은 오답이 하나뿐`);
    ks.add(k);
  }
  assert.equal(ks.size, 3);
});

// ───────────────────── 2단계: 원고 (coach/math/decdiv.json) ─────────────────────

const CONTENT = JSON.parse(readFileSync(new URL('../coach/math/decdiv.json', import.meta.url), 'utf8'));
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
/** 원고에만 있는 문제 틀 (생성기 틀은 solveText가 읽는다) — "936 ÷ 3 = 312 — 이 나눗셈을 이용하여" */
function solveContent(q) {
  const sv = solveText(q);
  if (sv.type !== 'unknown') return sv;
  const m = /^(\d+) ÷ (\d+) = (\d+) — 이 나눗셈을 이용하여 다음을 계산하면 얼마일까요\?/.exec(q);
  if (m) {
    assert.ok(eq(Q(+m[1], +m[2]), Q(+m[3])), `주어진 나눗셈이 틀림: ${m[0]}`);
    const e = bolds(q)[0]; const ops = e.split(' ÷ ');
    assert.equal(dec(ops[0]).u, +m[1], `${q}: 나누어지는 수의 숫자`); assert.equal(dec(ops[1]).u, +m[2], `${q}: 나누는 수의 숫자`);
    return { type: 'use', form: 'num', ans: evalExpr(e), f: { ops } };
  }
  return sv;
}
/** 원고 확인 질문 하나씩 — { id, i, at, p, sv(따로 읽은 문제) } */
function* checksOf() {
  for (const id of IDS) for (const [i, p] of CONTENT[id].lesson.entries()) yield { id, i, at: `${id}[${i}]`, p, sv: solveContent(fillC(p.check.q)) };
}
const reEsc = (s) => String(s).replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
/** 글에 그 수(또는 식)가 낱개로 있는가 — "24"가 "0.24"·"240" 속에서, "2.1"이 "2.10" 속에서 잡히지 않게 (W 2단계) */
const hasNum = (text, w) => new RegExp(`(?<![\\d/.])(?<!\\d )${reEsc(w)}(?![\\d/]|\\.\\d)`).test(text);

test('원고(decdiv.json)가 형식 검사를 통과한다 — 10칸이 사다리 순서대로 · 배움 4~5장·장마다 확인 질문·아빠 카드(말 2개↑·함정 2개↑·통과 기준)', () => {
  assert.deepEqual(checkContent(CONTENT), []);
  assert.deepEqual(Object.keys(CONTENT).filter((k) => k !== '_'), IDS);
  for (const id of IDS) {
    const v = CONTENT[id];
    assert.ok(v.lesson.length >= 4 && v.lesson.length <= 5, `${id}: 배움 ${v.lesson.length}장`);
    assert.ok(v.lesson.every((p) => p.check && p.check.no.length === 2), `${id}: 장마다 확인 질문(오답 둘)`);
    assert.ok(v.dad.say.length >= 2 && v.dad.traps.length >= 2 && v.dad.pass, `${id}: 아빠 카드`);
    assert.ok(!/\{/.test([v.dad.goal, ...v.dad.say, v.dad.do, v.dad.pass, ...v.dad.traps.flatMap((t) => [t.kid, t.dad])].join(' ')), `${id}: 아빠 카드에 자리표시`);
  }
  const L = lessonOf('ddiv.diff', 3, { ...OPTS, content: CONTENT });
  assert.equal(L.pages.length, CONTENT['ddiv.diff'].lesson.length);
  assert.ok(L.pages.every((p) => p.check && p.check.ok));
  assert.equal(L.rule, CONTENT['ddiv.diff'].rule);
});

test('★ 원고 확인 질문도 따로 풀어 대조 — 전부 읽히고, 맞는 보기는 정답 하나뿐(값으로 · 고르기는 그 판정으로), 오답 하나하나가 이름표 있는 틀린 셈 · 오답끼리 값이 다르다 · 까닭은 정답·오답을 낱개 수로 다 말한다 · 이름표 17개 다 쓰임', () => {
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
  assert.ok(n >= 80, `본 오답 ${n}`);
  assert.ok(types.size >= 15, `확인 질문 종류 ${types.size}: ${[...types]}`);
  assert.equal(used.size, allTags.length, `원고 오답이 안 쓴 틀린 셈: ${allTags.filter((t) => !used.has(t))}`);
});

// 칸마다 그 칸의 셈 — 나누는 수가 자연수인지 소수인지 · 소수 자리 수 · 몫의 꼴 (설계 칸 그대로)
const SHAPE = {
  'ddiv.dnat': ([A, B], X) => B.p === 0 && A.p >= 1 && floorQ(X) >= 1 && dec(decStr(X)).p === A.p,
  'ddiv.small': ([A, B], X) => B.p === 0 && A.p >= 1 && cmpQ(X, Q(1)) < 0,
  'ddiv.down': ([A, B], X) => B.p === 0 && A.p >= 1 && dec(decStr(X)).p > A.p && !/\.0/.test(decStr(X)),
  'ddiv.zeroq': ([, B], X) => B.p === 0 && /^\d+\.0\d+$/.test(decStr(X)),
  'ddiv.natnat': ([A, B], X) => A.p === 0 && B.p === 0 && /\./.test(decStr(X)),
  'ddiv.same': ([A, B]) => A.p === B.p && A.p >= 1,
  'ddiv.diff': ([A, B]) => A.p !== B.p && A.p >= 1 && B.p >= 1,
  'ddiv.natdec': ([A, B]) => A.p === 0 && B.p >= 1,
  'ddiv.round': (_, X, sv) => /^round\d$/.test(sv.type) && !!sv.f.round,
  'ddiv.apply': (_, X, sv) => ['count', 'remain', 'times', 'unit'].includes(sv.type),
};
test('★ 원고 보기 꼴 — 칸마다 그 칸의 셈(나누는 수가 자연수/소수·소수 자리 수·몫의 꼴) · 반올림은 X9만, 나누어 주기는 X10만 · 고르기는 X8에서만 · 보기는 끝자리 0을 지운 꼴', () => {
  let n = 0; let picks = 0;
  for (const { id, at, p, sv } of checksOf()) {
    if (sv.form === 'pick') {
      assert.equal(id, 'ddiv.natdec', `${at}: 고르는 확인 질문`);
      for (const t of [p.check.ok, ...p.check.no]) { const m = /^(\d+) ÷ (\d+\.\d+)$/.exec(t); assert.ok(m && +m[1] === sv.f.N, `${at}: 고르기 보기 "${t}"`); }
      picks++;
      continue;
    }
    const D2 = sv.f.ops.map(dec); const X = div(val(sv.f.ops[0]), val(sv.f.ops[1]));
    assert.ok(SHAPE[id](D2, X, sv), `${at}: 이 칸의 셈이 아니다 (${sv.type} ${sv.f.ops.join(' ÷ ')})`);
    if (sv.f.round) assert.equal(id, 'ddiv.round', `${at}: 반올림은 X9에서만`);
    if (['count', 'remain'].includes(sv.type)) assert.equal(id, 'ddiv.apply', `${at}: 나누어 주기는 X10에서만`);
    for (const t of [p.check.ok, ...p.check.no]) { assert.match(t, /^(0|[1-9]\d*)(\.\d*[1-9])?$/, `${at}: 보기 꼴 "${t}"`); n++; }
  }
  assert.ok(n >= 110 && picks >= 1, `본 보기 ${n} · 고르기 ${picks}`);
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
  assert.ok(n >= 180, `본 셈식 ${n}`);
});

test('★ 원고 아빠 카드: 통과 기준의 식과 괄호 속 답이 맞다 (반올림은 그 자리까지 · 이야기면 그 문제를 따로 읽어 푼다 — 남는 양 문제는 사람 수와 남는 양 둘)', () => {
  let pass = 0;
  for (const id of IDS) {
    const ps = fillC(CONTENT[id].dad.pass);
    const ans = (/\(([^)]+)\)/.exec(ps) || [])[1];
    assert.ok(ans, `${id}: 통과 기준에 괄호 속 답이 없다 "${ps}"`);
    const want = ans.split(' · ').map((x) => val(x.replace(/ ?(?:명|km|m²|m|L|kg|원|배)$/, '')));
    let got; let m;
    const story = /^"(.+?)"/.exec(ps);
    if (story) {
      const sv = solveContent(story[1]);
      got = sv.type === 'remain' ? [Q(floorQ(div(val(sv.f.ops[0]), val(sv.f.ops[1])))), sv.ans] : [sv.ans];
    } else if ((m = /^(\S+ ÷ \S+)의 몫을 반올림하여 (.+?) 나타내고\(/.exec(ps))) {
      const X = evalExpr(m[1]);
      got = m[2].split(', ').map((pl) => { const k = PLACE[pl.replace(/까지$/, '')]; assert.ok(k !== undefined, `${id}: 자리 "${pl}"`); return roundK(X, k); });
    } else got = ps.split(' — ')[0].split(', ').map(evalExpr);
    assert.equal(got.length, want.length, `${id}: 통과 기준의 식 ${got.length}개 · 답 ${want.length}개 "${ps}"`);
    got.forEach((g, k) => assert.ok(g && want[k] && eq(g, want[k]), `${id}: 통과 기준 ${k + 1}번 답 ${ans.split(' · ')[k]} ≠ ${show(g)}`));
    pass++;
  }
  assert.equal(pass, IDS.length);
});

test('🎨 원고의 그림: 모두 그려진다 (나눗셈 그림만) · 확인 질문엔 그림 없음 · 그림이 있는 장은 글에 같은 식과 센 수 — [ddiv share A n]은 "A ÷ n"·전체 칸·한 묶음 칸 · [ddiv fit A B]는 "A ÷ B"·도막 수·남는 길이 · 남는 끝이 있는 띠는 X10에서만', () => {
  let n = 0;
  for (const id of IDS) {
    CONTENT[id].lesson.forEach((p, i) => {
      const at = `${id}[${i}]`;
      assert.ok(!/\[[a-z]+ [^\]]+\]/.test(p.check.q), `${at}: 확인 질문에 그림 (답을 흘린다)`);
      const plain = p.say.replace(/\[[^\]]+\]/g, '').replace(/\*\*/g, '');
      for (const m of p.say.matchAll(/\[([a-z]+) ([^\]]+)\]/g)) {
        assert.equal(m[1], 'ddiv', `${at}: 그림 ${m[0]}`);
        const svg = figureSvg(`ddiv ${m[2]}`);
        assert.ok(svg.startsWith('<svg'), `${at}: 못 그리는 ${m[0]}`);
        const [mode, x, y] = m[2].split(' ');
        assert.ok(hasNum(plain, `${x} ÷ ${y}`), `${at}: 그림 ${m[0]}인데 글에 "${x} ÷ ${y}"이 없다`);
        if (mode === 'share') {
          const t = (val(x).n * 10) / val(x).d; const per = t / +y;
          assert.equal(attrsOf(svg, 'dd-c').length, t, `${at}: 0.1 칸 ${t}개`);
          assert.ok(hasNum(plain, String(t)) && hasNum(plain, String(per)), `${at}: 그림 ${m[0]}의 칸 수 ${t}·한 묶음 ${per}가 글에 없다`);
        } else {
          const X = div(val(x), val(y)); const k = floorQ(X); const rem = sub(val(x), mul(val(y), Q(k)));
          assert.equal(attrsOf(svg, 'dd-p').length, k, `${at}: 도막 ${k}개`);
          assert.ok(hasNum(plain, String(k)), `${at}: 그림 ${m[0]}의 도막 ${k}개가 글에 없다`);
          if (rem.n) {
            assert.equal(id, 'ddiv.apply', `${at}: 남는 끝이 있는 띠(남는 길이)는 X10에서만`);
            assert.ok(hasNum(plain, decStr(rem)), `${at}: 그림 ${m[0]}의 남는 길이 ${decStr(rem)}가 글에 없다`);
          }
        }
        n++;
      }
    });
  }
  assert.ok(n >= 5, `원고 그림 ${n}`);
});

test('★ 원고의 조사·아직 안 배운 말·틀린 말 (배움 글·확인 질문·아빠 카드 전부) — 수 뒤는 읽는 소리(소수는 끝자리) · 단위 글자·분수 바로 뒤 조사 없음 · 반올림 X9부터 · 남는 양 X10부터(그림 글까지) · "나머지"는 원고에 없다', () => {
  const BAT = new Set(['0', '1', '3', '6', '7', '8']);
  const PAIRS = [['을', '를'], ['은', '는'], ['이', '가'], ['과', '와'], ['이에요', '예요'], ['이니까', '니까'], ['이라서', '라서']];
  const idx = (id) => IDS.indexOf(id);
  let hitN = 0;
  for (const id of IDS) {
    const raw = contentText(CONTENT[id]).replace(/\*\*/g, '');
    const all = raw.replace(DIRECTIVES, '');
    for (const [wb, nb] of PAIRS) {
      for (const m of all.matchAll(new RegExp(`(?<![\\d/])(\\d+)(${wb}|${nb})(?=[\\s.,!?)—"]|$)`, 'g'))) { assert.equal(m[2], BAT.has(m[1].slice(-1)) ? wb : nb, `${id}: "…${m[1]}${m[2]}"`); hitN++; }
    }
    for (const m of all.matchAll(/(?<![\d/])(\d+)(으로|로)(?=[\s.,"]|$)/g)) { assert.equal(m[2], ['1', '7', '8'].includes(m[1].slice(-1)) ? '로' : BAT.has(m[1].slice(-1)) ? '으로' : '로', `${id}: "…${m[1]}${m[2]}"`); hitN++; }
    const fp = FRAC_JOSA.exec(all); assert.ok(!fp, `${id}: 분수 바로 뒤 조사 "${fp && fp[0]}"`);
    const up = UNIT_JOSA.exec(all); assert.ok(!up, `${id}: 단위 글자 바로 뒤 조사 "${up && up[0]}"`);
    assert.ok(!/-\d|\d-/.test(all), `${id}: ASCII 빼기`);
    assert.ok(!/[a-z]\/[a-z\d]|\d\/[a-z]/.test(all), `${id}: 문자 분수`);
    // 그림은 글로 바꿔서 본다 — 남는 끝이 있는 띠는 "남는 길이 …"를 적는다
    const withFig = figText(raw);
    for (const [re, at] of FIRST) if (idx(at) > idx(id)) assert.ok(!re.test(withFig), `${id}: 아직 안 배운 ${re}`);
    assert.ok(!/나머지/.test(withFig), `${id}: "나머지" (6-2 지도서 — "나누어 주고 남는 양")`);
    const truth = truthText(CONTENT[id]).replace(/\*\*/g, '');
    for (const [re, why] of BAD) assert.ok(!re.test(truth), `${id}: ${why}`);
  }
  assert.ok(hitN >= 80, `실제로 본 조사 ${hitN}`);
});

test('원고는 배포 파일 검사(check.mjs)에도 걸린다 — decdiv.json → mathddiv.js의 checkContent', () => {
  const src = readFileSync(new URL('../tools/check.mjs', import.meta.url), 'utf8');
  assert.ok(src.includes("'coach/math/decdiv.json': '../js/mathddiv.js'"));
});

// ───────────────────── 3단계: 화면 연결 ─────────────────────

test('화면 연결 (3단계): STEMS.decdiv(X)는 이 생성기·원고를 쓰고 W 소수의 곱셈 바로 뒤 · 앱 셸이 둘 다 들고 간다 · 사다리 안내에 W 줄기(아직 안 배운 말·"나머지" 없이) · 숫자판 ± 없음 · 나눗셈 그림을 📊·❓가 안다', async () => {
  const { STEMS, STEM_ORDER, stemOf } = await import('../js/mathprog.js');
  const X = STEMS.decdiv;
  assert.equal(X.code, 'X');
  assert.equal(X.label, '소수의 나눗셈 줄기', '줄기 고르기·📊에 보이는 이름');
  const at = STEM_ORDER.indexOf('decdiv');
  assert.deepEqual(STEM_ORDER.slice(at - 2, at + 1), ['decimal', 'decmul', 'decdiv'], 'C 소수 → W 소수의 곱셈 → X 소수의 나눗셈 (나누는 수를 자연수로 만들기는 10배·100배를 바탕으로)');
  assert.equal(X.list, DDIV);
  assert.equal(X.gen.makeQuestion, makeQuestion);
  assert.equal(X.gen.lessonOf, lessonOf, '📚 배움은 이 생성기의 lessonOf');
  assert.equal(X.lesson, true);
  assert.equal(X.file, './coach/math/decdiv.json');
  assert.equal(X.range, '초6');
  assert.ok(IDS.every((id) => stemOf(id) === X), '모든 칸이 X 줄기로 찾아진다');
  assert.match(X.pick, /W 소수의 곱셈 줄기를 먼저/);
  // 사다리 안내·첫 안내는 X1부터 본다 — 아직 안 배운 말(반올림·남는 양)·"나머지"·참말에 틀린 말이 없다
  const guide = `${X.pick} ${X.intro}`;
  for (const [re] of FIRST) assert.ok(!re.test(guide), `안내에 ${re}`);
  for (const [re, why] of BAD) assert.ok(!re.test(guide), `안내에 ${why}`);
  assert.ok(!/나머지/.test(guide), '안내에 "나머지"');
  // 앱이 가져오는 원고(X.file)로 배움 장이 그대로 만들어진다
  const content = JSON.parse(readFileSync(new URL(X.file.replace('./', '../'), import.meta.url), 'utf8'));
  for (const id of IDS) assert.equal(X.gen.lessonOf(id, 5, { ...OPTS, content }).pages.length, content[id].lesson.length, `${id}: 원고 배움 장`);
  const sw = readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
  for (const f of ['./js/mathddiv.js', './coach/math/decdiv.json']) assert.ok(sw.includes(`'${f}'`), `APP_SHELL에 ${f}`);
  // 숫자판은 이 줄기 열쇠로 — 소수의 몫은 늘 양수라 ± 없음
  assert.equal(padSpec(makeQuestion('ddiv.dnat', 'calc', 1, OPTS), X.key).signed, false);
  // 📊 펼친 문제 글(figText)·❓ 복사문·📊 답장 안내 — 나눗셈 그림을 안다, 안내의 예는 그대로 그려진다
  assert.equal(figText('앞 [ddiv fit 6.4 2.1] 뒤', true), '앞 (나눗셈 그림) 뒤');
  const ask = readFileSync(new URL('../js/mathask.js', import.meta.url), 'utf8');
  const stats = readFileSync(new URL('../js/stats.js', import.meta.url), 'utf8');
  assert.ok(ask.includes('[ddiv fit 6.4 2.1]') && stats.includes('[ddiv fit 6.4 2.1]'), '❓ 복사문·📊 답장 안내에 [ddiv] 예');
  assert.ok(renderFigures('[ddiv fit 6.4 2.1]').startsWith('<svg'), '안내의 예도 그려진다');
});

// ───────────────────── 🔍 Codex 39차 ─────────────────────

// #2 — "몇 배"·"1 m의 무게"는 몫이 소수로 끝나는 문제인데, 칸 규칙("자연수만 몫을 구하고 … 남는 양")과 힌트(사람 수·남는 양)를 그대로 물려받았다
test('★ X10 풀이 카드의 규칙·힌트는 그 문제에 맞다 — 몇 배·1 m의 무게엔 "자연수만"·사람·남는 양 말이 없고, 사람 수·남는 양 문제엔 있다 (Codex 39차 #2)', () => {
  const seen = {};
  for (let s = 1; s <= SEEDS; s++) {
    const q = makeQuestion('ddiv.apply', 'calc', s, OPTS); const { type } = solveText(q.q);
    const say = `${q.solve.rule}\n${q.solve.whyAny}`;
    if (type === 'times' || type === 'unit') assert.ok(!/자연수|사람|남는|나누어 줄/.test(say), `X10 #${s} (${type}): 규칙·힌트가 나누어 주기 말\n${say}`);
    else assert.ok(/자연수/.test(q.solve.rule) && /남는|사람/.test(say), `X10 #${s} (${type}): ${say}`);
    seen[type] = (seen[type] || 0) + 1;
  }
  for (const t of ['count', 'remain', 'times', 'unit']) assert.ok(seen[t] > 0, `가족 ${t}`);
});

// #3 — 오답 값이 "몫에 소수점을 빼먹은 수"와 같으면(4.5 ÷ 2.5 → 18), 보기에 남은 이름표("나누어지는 수만 옮김")만으로는 어느 생각인지 모른다
//   → 이름표 글자는 그대로(📊 집계) 두고, 풀이 글이 두 생각을 다 말하고 바른 셈을 보인다
test('★ 같은 값이 두 틀린 생각에서 나오면 풀이 글이 둘 다 말한다 — 몫의 숫자(소수점을 뺀 수)와 같은 오답의 "왜"에 "소수점을 빼먹"과 바른 몫 (Codex 39차 #3)', () => {
  let n = 0;
  for (const { c, s, q } of every(['calc'])) {
    const ok = q.choices.find((x) => x.ok).text;
    if (!/\./.test(ok)) continue;
    const digits = String(+ok.replace('.', ''));
    for (const w of q.choices.filter((x) => !x.ok && x.text === digits && ![TAGS.dropPoint, TAGS.remScaled, '계산 실수'].includes(x.tag))) {
      const why = q.solve.why[w.tag] || '';
      assert.ok(/소수점을 빼먹/.test(why) && hasNum(why, ok), `${c.id} #${s}: "${w.text}"[${w.tag}] — 몫에 소수점을 빼먹어도 같은 수인데 풀이가 한 생각만 말한다\n${q.q}\n${why}`);
      n++;
    }
  }
  assert.ok(n > SEEDS, `본 겹친 오답 ${n}`);
});

// #4 — 똑같이 나누기 그림에 "한 칸 = 0.1"이 화면 글자로 없었다(aria-label·figText에만) — 틀린 셈 1.2 ÷ 4 = 3 옆에서 칸 3개만 세면 그림이 틀린 답을 편든다
test('🎨 똑같이 나누기 그림은 화면에 "한 칸 = 0.1"을 적는다 (aria-label 말고 보이는 글자로) (Codex 39차 #4)', () => {
  for (const d of ['ddiv share 1.2 4', 'ddiv share 2.4 2', 'ddiv share 3.5 5']) {
    const svg = figureSvg(d);
    const shown = [...svg.matchAll(/<text[^>]*>([^<]*)<\/text>/g)].map((m) => m[1]);
    assert.ok(shown.includes('한 칸 = 0.1'), `${d}: 보이는 글자 ${shown.join(' | ')}`);
    assert.ok(!/나머지|남는/.test(shown.join(' ')), d);
  }
});

// #5 — X6 "소수 두 자리 ÷ 소수 두 자리"는 나누는 수가 3.99까지라 45.36 ÷ 3.24 → 4536 ÷ 324처럼 무거운 나눗셈이 됐다 (교과서 1.44 ÷ 0.06 · 0.35 ÷ 0.14)
test('X6 소수 두 자리끼리의 나눗셈은 나누는 수가 1보다 작다 — 옮긴 나누는 수가 두 자리 이하 (Codex 39차 #5)', () => {
  let n = 0;
  for (let s = 1; s <= SEEDS; s++) {
    const sv = solveText(makeQuestion('ddiv.same', 'calc', s, OPTS).q);
    if (!sv.f.ops) continue;
    const [A, B] = sv.f.ops.map(dec);
    if (A.p === 2 && B.p === 2) { assert.ok(B.u < 100, `X6 #${s}: ${sv.f.ops.join(' ÷ ')} — 나누는 수 ${B.text}`); n++; }
  }
  assert.ok(n > SEEDS / 10, `두 자리끼리 ${n}`);
});

// #6 — 참말 금지 정규식이 0을 "그 문제의 수"로 봐주고("0을 1보다 작은 수로 나누면 커져요"), 앞 문장의 "0보다 큰 수를"이 다음 문장까지 봐줬다
test('★ 참말 금지 정규식 자체 — 0은 조건이 아니다 · "0보다 큰 수를"은 같은 문장 안에서만 · 그 문제의 수는 바로 앞에만 (Codex 39차 #6)', () => {
  const re = BAD.find(([r]) => r.source.includes('1보다 (?:작은|큰) 수로 나누면'))[0];
  for (const t of ['0을 1보다 작은 수로 나누면 커져요.', '0보다 큰 수를 3으로 나눠요. 1보다 작은 수로 나누면 커져요.', '7.2를 72로 옮기면 72 ÷ 24 — 3. 1보다 작은 수로 나누면 커져요.', '1보다 작은 수로 나누면 몫이 커져요.']) assert.ok(re.test(t), `걸러야 함: ${t}`);
  for (const t of ['0보다 큰 수를 1보다 작은 수로 나누면 몫은 처음 수보다 커요.', '8을 1보다 큰 수로 나누면 8보다 작아져요.', '7.2를 1보다 작은 수로 나누면 7.2보다 커요.', '0.6을 1보다 작은 수로 나누면 0.6보다 커요.', '0보다 큰 수를 1보다 큰 수로 나누면 작아지고, 1보다 작은 수로 나누면 커져요.']) assert.ok(!re.test(t), `참말: ${t}`);
});
