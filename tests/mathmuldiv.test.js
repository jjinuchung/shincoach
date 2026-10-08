// ✖️➗ AA 곱셈과 나눗셈 줄기 — 생성기 테스트.
// ★ 정답·오답은 이 파일이 **문제 글을 따로 읽어** 자연수 셈(곱·몫과 나머지)으로 다시 푼다 (생성기의 계산을 쓰지 않는다).
//   이름표 판정은 생성기 이름표를 보지 않고 **그 틀린 셈이 실제로 한 일**로 다시 계산한다 (메모 stem-generator-pitfalls).
//   한 오답 값은 한 틀린 생각에만 맞아야 한다 — 두 판정에 다 맞으면 그 오답은 진단이 안 된다.
// 함정을 처음부터: 조사 · 쌍둥이 틀 · 오답끼리 같은 값 · 우연히 맞는 값 · ② 보기 결론의 수 · 숫자판으로 모든 보기(+ 빠진 후보·"9 … 0")를 쳐 보기 ·
//   참말 금지 · 글 속 셈식("몫 … 나머지"까지) · 세로셈 그림의 칸 = 지시문 = 문제 글

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { MULDIV, TAGS, makeQuestion, makeRound, ladder, placeFrom, diagnosticSet, lessonOf, checkContent, gradeLabel } from '../js/mathmuldiv.js';
import { tplKey } from '../js/mathgen.js';
import { figureSvg, renderFigures, figText } from '../js/mathdraw.js';
import { padSpec, readTyped, matchTyped, partsOf, textVal } from '../js/mathpad.js';

const OPTS = { names: ['피카츄', '리자몽', '개굴닌자'], me: '진우', worlds: { pokemon: [], toystory: [], minions: [], moana: [] } };
const SEEDS = Number(process.env.RNG_SEEDS) || 300;
const IDS = MULDIV.map((c) => c.id);
const SLIP = '계산 실수';

// ───────────────────── 이 파일의 셈 ─────────────────────

/** 답 글 → { q, r } — "4 … 5" · "9"(나머지 0) · 못 읽으면 null */
function pr(t) {
  const m = /^(\d+)(?: … (\d+))?$/.exec(String(t).trim());
  return m ? { q: +m[1], r: m[2] === undefined ? 0 : +m[2] } : null;
}
const P = (q, r = 0) => ({ q, r });
const eqP = (x, y) => !!(x && y && x.q === y.q && x.r === y.r);
const show = (x) => (x ? (x.r ? `${x.q} … ${x.r}` : String(x.q)) : String(x));
const dm = (a, b) => P(Math.floor(a / b), a % b);
const lead = (n) => +String(n)[0];
/** 받아올림을 버린 곱 (한 자리 수를 곱함) — 맨 앞자리 곱은 그대로, 다른 자리 곱은 일의 자리만 */
function ncm(a, d) {
  const ds = String(a).split('').map(Number);
  return +ds.map((x, i) => (i === 0 ? String(x * d) : String((x * d) % 10))).join('');
}
/** 글 끝(또는 마지막)의 답 꼴 — "… = 4 … 5" → {4, 5} · "남는 것은 나머지 5" → {5, 0} */
function lastP(t) {
  const all = [...String(t).matchAll(/(\d+)(?: … (\d+))?/g)];
  if (!all.length) return null;
  const m = all[all.length - 1];
  return P(+m[1], m[2] === undefined ? 0 : +m[2]);
}
const bolds = (q) => [...String(q).matchAll(/\*\*(.+?)\*\*/g)].map((m) => m[1]);
/** 유리수 셈 — 글 속 셈식 검사용 (나눗셈이 나누어떨어지지 않아도 정확하게) */
const gcd = (a, b) => (b ? gcd(b, a % b) : Math.abs(a));
const Q = (n, d = 1) => { if (d < 0) { n = -n; d = -d; } const k = gcd(n, d) || 1; return { n: n / k, d: d / k }; };
const qa = (x, y) => Q(x.n * y.d + y.n * x.d, x.d * y.d);
const qs = (x, y) => Q(x.n * y.d - y.n * x.d, x.d * y.d);
const qm = (x, y) => Q(x.n * y.n, x.d * y.d);
const qd = (x, y) => Q(x.n * y.d, x.d * y.n);
const qeq = (x, y) => !!(x && y && x.n * y.d === y.n * x.d);
/** 식 계산기 — 자연수·+ − × ÷·괄호. 못 읽으면 throw */
function evalExpr(src) {
  const s = String(src).trim(); let i = 0;
  const ws = () => { while (s[i] === ' ') i++; };
  const number = () => { const m = /^\d+(?![\d.])/.exec(s.slice(i)); if (!m) throw new Error(`수를 못 읽음: ${s.slice(i)}`); i += m[0].length; return Q(+m[0]); };
  const atom = () => { ws(); if (s[i] === '(') { i++; const v = expr(); ws(); if (s[i] !== ')') throw new Error('괄호'); i++; return v; } return number(); };
  const termP = () => { let v = atom(); for (;;) { ws(); if (s[i] === '×') { i++; v = qm(v, atom()); } else if (s[i] === '÷') { i++; v = qd(v, atom()); } else return v; } };
  const expr = () => { let v = termP(); for (;;) { ws(); if (s[i] === '+') { i++; v = qa(v, termP()); } else if (s[i] === '−') { i++; v = qs(v, termP()); } else return v; } };
  const v = expr(); ws();
  if (i !== s.length) throw new Error(`남은 글: ${s.slice(i)}`);
  return v;
}

// ───────────────────── 문제 글 읽기 ─────────────────────

/** 문제 글 → { type, form('num'|'rem'|'pick'), ans({q, r}) | ok(고르기 판정), f(판정표 재료) } */
function solveText(q) {
  let m;
  if ((m = /^다음을 계산하면 얼마일까요\?\n\n\*\*(\d+) ([×÷]) (\d+)\*\*$/.exec(q))) {
    const a = +m[1]; const b = +m[3];
    if (m[2] === '×') return { type: b % 10 ? 'mul2' : 'mul10', form: 'num', ans: P(a * b), f: { op: 'mul', a, b } };
    return { type: 'div', form: 'rem', ans: dm(a, b), f: { op: 'div', a, b } };
  }
  const muls = [
    [/^한 상자에 기념품이 (\d+)개씩 들어 있어요\. (\d+)상자에 들어 있는 기념품은 모두 몇 개일까요\?$/, 'gift'],
    [/^.+?(?:은|는) 줄넘기를 하루에 (\d+)번씩 했어요\. (\d+)일 동안 한 줄넘기는 모두 몇 번일까요\?$/, 'rope'],
    [/^방석 한 개를 만드는 데 양말목이 (\d+)개 필요해요\. 방석 (\d+)개를 만들려면 양말목은 모두 몇 개 필요할까요\?$/, 'sock'],
    [/^.+?(?:은|는) 하루에 나무열매를 (\d+) g씩 먹어요\. (\d+)일 동안 먹은 나무열매는 모두 몇 g일까요\?$/, 'berry'],
    [/^장난감 공장에서 장난감을 하루에 (\d+)개씩 만들어요\. (\d+)일 동안 만드는 장난감은 모두 몇 개일까요\?$/, 'toy'],
  ];
  for (const [re, type] of muls) if ((m = re.exec(q))) return { type, form: 'num', ans: P(+m[1] * +m[2]), f: { op: 'mul', a: +m[1], b: +m[2] } };
  const divs = [
    [/^사탕 (\d+)개를 한 명에게 (\d+)개씩 나누어 주려고 해요\. 몇 명에게 나누어 줄 수 있고, 몇 개가 남을까요\?$/, 'candy'],
    [/^사과 (\d+)개를 한 상자에 (\d+)개씩 담으려고 해요\. 몇 상자가 되고, 몇 개가 남을까요\?$/, 'apple'],
    [/^색종이 (\d+)장을 한 명에게 (\d+)장씩 나누어 주면 몇 명에게 나누어 줄 수 있을까요\?$/, 'paperEach'],
    [/^색종이 (\d+)장을 (\d+)명에게 똑같이 나누어 주려고 해요\. 한 명에게 몇 장씩 주고, 몇 장이 남을까요\?$/, 'paperShare'],
    [/^몬스터볼 (\d+)개를 한 상자에 (\d+)개씩 담으면 몇 상자가 될까요\?$/, 'ball'],
    [/^구슬 (\d+)개를 (\d+)개씩 묶으면 몇 묶음이 될까요\?$/, 'bundle'],
    [/^색종이 (\d+)장을 (\d+)명에게 똑같이 나누어 주면 한 명에게 몇 장씩 줄 수 있을까요\?$/, 'paperEq'],
    [/^구슬 (\d+)개를 한 봉지에 (\d+)개씩 담으려고 해요\. 몇 봉지가 되고, (?:몇 개가 남을까요|남는 구슬은 몇 개일까요)\?$/, 'marble'],
  ];
  for (const [re, type] of divs) {
    if ((m = re.exec(q))) {
      const a = +m[1]; const b = +m[2];
      // 몇 명·몇 상자(나머지를 묻지 않는 말)는 나누어떨어지는 수만
      if (/몇 명에게 나누어 줄 수 있을까요|몇 상자가 될까요|몇 묶음이 될까요|몇 장씩 줄 수 있을까요/.test(q)) assert.equal(a % b, 0, `나머지를 묻지 않는데 나누어떨어지지 않는다: ${q}`);
      return { type, form: 'rem', ans: dm(a, b), f: { op: 'div', a, b } };
    }
  }
  if ((m = /^색종이 (\d+)장을 (\d+)명에게 똑같이 나누어 주려고 해요\. 한 명에게 될 수 있는 대로 많이 주면 남는 색종이는 몇 장일까요\?$/.exec(q))) {
    const a = +m[1]; const b = +m[2];
    return { type: 'remMean', form: 'num', ans: P(a % b), f: { op: 'remOnly', a, b } };
  }
  if ((m = /^사탕이 (\d+)개 있었는데 그중 (\d+)개를 먹었어요\. 남은 사탕을 (\d+)명에게 똑같이 나누어 주면 한 명에게 몇 개씩 줄 수 있을까요\?$/.exec(q))) {
    const a = +m[1]; const s = +m[2]; const b = +m[3];
    assert.equal((a - s) % b, 0, `한 명에게 몇 개씩 — 나누어떨어져야: ${q}`);
    return { type: 'twoStep', form: 'num', ans: P((a - s) / b), f: { op: 'two', a, s, b } };
  }
  if ((m = /^(\d+)[을를] (\d+)쯤, (\d+)[을를] (\d+)쯤으로 생각하여 (\d+) × (\d+)의 곱을 어림하려고 해요\. (\d+) × (\d+)[은는] 얼마일까요\?$/.exec(q))) {
    const [a, A, b, B, a2, b2, A2, B2] = m.slice(1).map(Number);
    assert.ok(a === a2 && b === b2 && A === A2 && B === B2, `어림 글의 수가 어긋남: ${q}`);
    assert.equal(A, Math.round(a / 100) * 100, `${a}를 가장 가까운 몇백으로: ${q}`);
    assert.equal(B, Math.round(b / 10) * 10, `${b}를 가장 가까운 몇십으로: ${q}`);
    return { type: 'estNear', form: 'num', ans: P(A * B), f: { op: 'mul', a: A, b: B, est: true } };
  }
  if ((m = /^(\d+) × (\d+)[을를] 앞자리 수만 생각하여 (\d+) × (\d+)(?:으로|로) 어림하려고 해요\. (\d+) × (\d+)[은는] 얼마일까요\?$/.exec(q))) {
    const [a, b, A, B, A2, B2] = m.slice(1).map(Number);
    assert.ok(A === A2 && B === B2, q);
    assert.equal(A, Math.floor(a / 100) * 100, `앞자리 수: ${q}`); assert.equal(B, Math.floor(b / 10) * 10, `앞자리 수: ${q}`);
    return { type: 'estFront', form: 'num', ans: P(A * B), f: { op: 'mul', a: A, b: B, est: true } };
  }
  if ((m = /^(\d+) ÷ (\d+)의 몫을 어림하려고 해요\. (\d+)[을를] (\d+)쯤, (\d+)[을를] (\d+)쯤으로 생각하면 (\d+) ÷ (\d+)[은는] 얼마일까요\?$/.exec(q))) {
    const [a, b, a2, A, b2, B, A2, B2] = m.slice(1).map(Number);
    assert.ok(a === a2 && b === b2 && A === A2 && B === B2, q);
    assert.equal(A, Math.round(a / 10) * 10, q); assert.equal(B, Math.round(b / 10) * 10, q);
    assert.equal(A % B, 0, `어림한 나눗셈은 나누어떨어진다: ${q}`);
    return { type: 'estDiv', form: 'num', ans: P(A / B), f: { op: 'div', a: A, b: B, est: true } };
  }
  if (/^계산하지 않고 어림해요\. 몫이 두 자리 수인 나눗셈은 어느 것일까요\?$/.test(q)) {
    return { type: 'digits', form: 'pick', ok: (t) => { const x = /^(\d+) ÷ (\d+)$/.exec(t); return !!x && Math.floor(+x[1] / +x[2]) >= 10 && Math.floor(+x[1] / +x[2]) <= 99; }, f: { op: 'digits' } };
  }
  return { type: 'unknown' };
}

/**
 * 이름표 뜻 — 그 틀린 생각을 문제 글의 수로 다시 한 값. 판정표는 생성기 이름표를 베끼지 않는다 — 그 이름의 셈이 실제로 하는 일을 이 파일이 다시 쓴다.
 * f: { op: 'mul'|'div'|'remOnly'|'two'|'digits', a, b, s }
 */
function tagHolds(f, tag, t) {
  if (f.op === 'digits') {
    const x = /^(\d+) ÷ (\d+)$/.exec(t);
    return tag === TAGS.frontOnly && !!x && lead(+x[1]) >= lead(+x[2]) && Math.floor(+x[1] / 10) < +x[2];
  }
  const v = pr(t); if (!v) return false;
  const is = (w) => eqP(v, w);
  const { a, b } = f;
  if (f.op === 'mul') {
    const u = b % 10; const t10 = b - u; const ans = a * b;
    switch (tag) {
      case TAGS.zeroDrop: return b >= 10 && !u && is(P(a * (b / 10)));
      case TAGS.zeroExtra: return is(P(ans * 10));
      case TAGS.noCarry: {
        const nc = b < 10 ? ncm(a, b) : !u ? ncm(a, b / 10) * 10 : ncm(a, u) + ncm(a, t10 / 10) * 10;
        return nc !== ans && is(P(nc));
      }
      case TAGS.partShift: return b >= 10 && !!u && (is(P(a * u + a * (t10 / 10))) || is(P(a * u + a * t10 * 10)));
      case TAGS.partDrop: return b >= 10 && !!u && (is(P(a * u)) || is(P(a * t10)));
      case TAGS.divForMul: return is(dm(a, b));
      default: return false;
    }
  }
  if (f.op === 'div') {
    const { q, r } = dm(a, b);
    switch (tag) {
      case TAGS.overEst: return is(P(q + 1, b * (q + 1) - a));
      case TAGS.remBig: return r > 0 && q >= 2 && is(P(q - 1, r + b));
      case TAGS.remEq: return r === 0 && q >= 2 && is(P(q - 1, b));
      case TAGS.quotTens: return r === 0 && b % 10 === 0 && q <= 9 && is(P(q * 10));
      case TAGS.dropOnes: { const tq = Math.floor(q / 10); return q >= 10 && is(P(tq, a - b * tq * 10)); }
      case TAGS.mulForDiv: return is(P(a * b));
      default: return false;
    }
  }
  if (f.op === 'remOnly') {
    const { q, r } = dm(a, b);
    if (tag === TAGS.quotForRem) return is(P(q));
    if (tag === TAGS.remBig) return r > 0 && is(P(r + b));
    return false;
  }
  if (f.op === 'two') {
    // 묻는 것은 한 명에게 주는 수 — 틀린 셈을 한 아이도 그 몫을 답한다("11 … 17"이 아니라 11, 🔍 Codex 42차 #2)
    if (tag === TAGS.oneStep) return is(P(Math.floor(a / b)));
    if (tag === TAGS.subAsAdd) return is(P(Math.floor((a + f.s) / b)));
    return false;
  }
  return false;
}
/** 그 값에 맞는 이름표들 (판정표 전부에서) */
const tagsOf = (f, t) => Object.values(TAGS).filter((tg) => tagHolds(f, tg, t));

const allText = (q) => [q.q, ...q.choices.map((x) => x.text), ...(q.solve ? [...q.solve.steps, ...Object.values(q.solve.why), q.solve.whyAny, q.solve.rule] : [])].join('\n');
function* every(kinds = ['calc', 'misread'], n = SEEDS) {
  for (const c of MULDIV) for (const k of kinds) for (let s = 1; s <= n; s++) yield { c, k, s, q: makeQuestion(c.id, k, s, OPTS) };
}

// ───────────────────── 사다리 ─────────────────────

test('사다리: 8칸, 모두 초4, needs가 바로 앞 칸 · 맨 뒤는 ⭐ · 교과서 차시 순서', () => {
  assert.deepEqual(IDS, ['md.mul10s', 'md.mul2d', 'md.div2d', 'md.div10s', 'md.div3d1', 'md.div3d2', 'md.est', 'md.apply']);
  MULDIV.forEach((c, i) => {
    assert.equal(c.grade, 4, c.id);
    assert.deepEqual(c.needs, i ? [IDS[i - 1]] : [], c.id);
    assert.ok(c.idea && c.rule && c.slip, c.id);
  });
  assert.equal(gradeLabel(4), '초4');
  assert.match(MULDIV[7].name, /^⭐/);
});

test('풀이기·판정표 자체 점검 — 지도서·교과서의 오답 예를 읽는다', () => {
  const mul = (a, b) => ({ op: 'mul', a, b }); const div = (a, b) => ({ op: 'div', a, b });
  assert.deepEqual(solveText('다음을 계산하면 얼마일까요?\n\n**726 × 53**').ans, P(38478));
  assert.deepEqual(solveText('다음을 계산하면 얼마일까요?\n\n**527 ÷ 16**').ans, P(32, 15));
  assert.ok(tagHolds(mul(230, 50), TAGS.zeroDrop, '1150'), '지도서 167쪽 230 × 50 = 1150');
  assert.ok(tagHolds(mul(726, 53), TAGS.partShift, '5808'), '교과서 63쪽 유나 726 × 53 = 2178 + 3630');
  assert.ok(tagHolds(mul(216, 40), TAGS.zeroDrop, '864'), '지도서 157쪽 216 × 40을 일의 자리부터');
  assert.ok(tagHolds(div(689, 78), TAGS.remBig, '7 … 143'), '익힘 689 ÷ 78 = 7 … 143');
  assert.ok(tagHolds(div(165, 41), TAGS.remBig, '3 … 42'), '단원 평가 165 ÷ 41 = 3 … 42');
  assert.ok(tagHolds(div(162, 18), TAGS.remEq, '8 … 18'), '162 ÷ 18 = 8 … 18');
  assert.ok(tagHolds(div(180, 30), TAGS.quotTens, '60'), '지도서 181쪽 180 ÷ 30 = 60');
  assert.ok(tagHolds(div(873, 43), TAGS.dropOnes, '2 … 13'), '873 ÷ 43 = 2 … 13');
  assert.ok(tagHolds(div(53, 12), TAGS.overEst, '5 … 7'), '53 ÷ 12 — 12 × 5 = 60을 그대로');
  assert.ok(tagHolds({ op: 'digits' }, TAGS.frontOnly, '638 ÷ 64'));
  assert.ok(!tagHolds({ op: 'digits' }, TAGS.frontOnly, '658 ÷ 64'), '65 ≥ 64 — 몫이 정말 두 자리');
  assert.ok(!tagHolds(div(53, 12), TAGS.remEq, '3 … 12'), '나누어떨어지지 않으면 remEq가 아니다');
  assert.deepEqual(lastP('… — 53 ÷ 12 = 4 … 5'), P(4, 5));
  assert.deepEqual(lastP('남는 것은 나머지 5'), P(5));
  assert.equal(ncm(157, 3), 351);
});

// ───────────────────── 문제 ─────────────────────

test('★ 독립 검산: ① 정답이 문제 글을 따로 읽어 푼 답과 같다 · 딱 하나만 맞다 · 몫은 1 이상', () => {
  const types = new Set();
  for (const { c, s, q } of every(['calc'])) {
    const sv = solveText(q.q);
    assert.notEqual(sv.type, 'unknown', `${c.id} #${s}: 못 읽는 문제\n${q.q}`);
    const ok = q.choices.find((x) => x.ok);
    const right = sv.form === 'pick' ? q.choices.filter((x) => sv.ok(x.text)) : q.choices.filter((x) => eqP(pr(x.text), sv.ans));
    assert.equal(right.length, 1, `${c.id} #${s} (${sv.type}): 맞는 보기 ${right.map((x) => x.text).join(', ') || '없음'}\n${q.q}\n${q.choices.map((x) => x.text).join(' | ')}`);
    assert.equal(right[0], ok, `${c.id} #${s}: 정답 표시 "${ok.text}" ≠ 따로 푼 "${right[0].text}"\n${q.q}`);
    if (sv.form !== 'pick') assert.ok(sv.ans.q >= 1, `${c.id} #${s}: 답 ${show(sv.ans)}`);
    types.add(`${c.id}:${sv.type}`);
  }
  assert.ok(types.size >= 26, `문제 종류 ${types.size}: ${[...types]}`);
});

test('칸마다 수의 꼴 — AA1 (세 자리)×(몇십) · AA2 (세 자리)×(두 자리) · AA3 (두 자리)÷(두 자리) · AA4 (세 자리)÷(몇십) · AA5 몫 한 자리 · AA6 몫 두 자리 · 곱 다섯 자리까지 · 나누어지는 수 세 자리까지', () => {
  const seen = {};
  const mark = (k) => { seen[k] = (seen[k] || 0) + 1; };
  for (const { c, s, q } of every(['calc'])) {
    const sv = solveText(q.q); const at = `${c.id} #${s}: ${q.q}`;
    if (sv.form === 'pick') { assert.equal(c.id, 'md.est', at); mark('digits'); continue; }
    const { a, b } = sv.f;
    if (sv.f.op === 'mul' && !sv.f.est) assert.ok(a * b <= 99999, `곱이 다섯 자리를 넘음 ${at}`);
    if (sv.f.op === 'div') assert.ok(a <= 999, `나누어지는 수가 세 자리를 넘음 ${at}`);
    switch (c.id) {
      case 'md.mul10s': assert.ok(a >= 100 && a <= 999 && b % 10 === 0 && b >= 20 && b <= 90, at); mark(a * (b / 10) % 10 === 0 ? 'end0' : 'mul10'); break;
      case 'md.mul2d': assert.ok(a >= 100 && a <= 999 && b >= 11 && b <= 99 && b % 10 !== 0, at); mark(a * b > 9999 ? 'five' : 'four'); break;
      case 'md.div2d': assert.ok(a >= 10 && a <= 99 && b >= 10 && b <= 99 && Math.floor(a / b) <= 9, at); mark(a % b ? 'rem' : b % 10 ? 'exact' : 'tens'); break;
      case 'md.div10s': assert.ok(a >= 100 && b % 10 === 0 && Math.floor(a / b) >= 2 && Math.floor(a / b) <= 9, at); mark(a % b ? 'rem10' : 'exact10'); break;
      case 'md.div3d1': assert.ok(a >= 100 && b % 10 !== 0 && b >= 11 && Math.floor(a / b) >= 2 && Math.floor(a / b) <= 9, at); mark(a % b ? 'rem1' : 'exact1'); break;
      case 'md.div3d2': assert.ok(a >= 100 && b % 10 !== 0 && Math.floor(a / b) >= 10 && Math.floor(a / b) <= 99, at); mark(Math.floor(a / b) % 10 === 0 ? 'zero' : a % b ? 'rem2' : 'exact2'); break;
      case 'md.est': assert.ok(sv.f.est, at); mark(sv.type); break;
      case 'md.apply': mark(sv.type); break;
      default: assert.fail(c.id);
    }
  }
  for (const k of ['end0', 'mul10', 'five', 'four', 'rem', 'exact', 'tens', 'rem10', 'exact10', 'rem1', 'exact1', 'zero', 'rem2', 'exact2', 'estNear', 'estFront', 'estDiv', 'digits', 'toy', 'marble', 'remMean', 'twoStep']) assert.ok(seen[k] > SEEDS / 30, `${k}: ${seen[k]}`);
});

test('★ 보기: 정답 하나, 글자 겹침 없음, 3개 이상, 빈 글자·undefined·NaN·남은 자리표시 없음 · ① 계산엔 그림 없음 · ② 그림은 세로셈만, 모두 그려진다', () => {
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
      assert.match(d, /^\[v(mul|div) /, `${at}: 다른 그림 ${d}`);
      assert.ok(figureSvg(d.slice(1, -1)).startsWith('<svg'), `${at}: 못 그리는 ${d}`);
      figs++;
    }
  }
  assert.ok(figs > SEEDS, `② 그림 ${figs}`);
});

test('★ 보기 꼴: 수는 앞에 0 없는 자연수 · "몫 … 나머지"는 몫·나머지 1 이상 · 수 보기 값은 서로 다르다', () => {
  let n = 0;
  for (const { c, s, q } of every(['calc'])) {
    if (solveText(q.q).form === 'pick') continue;
    for (const x of q.choices) { assert.match(x.text, /^[1-9]\d*(?: … [1-9]\d*)?$/, `${c.id} #${s}: 보기 꼴 "${x.text}"`); n++; }
    const vals = q.choices.map((x) => show(pr(x.text)));
    assert.equal(new Set(vals).size, vals.length, `${c.id} #${s}: 값이 같은 보기 ${vals}`);
  }
  assert.ok(n > 20 * SEEDS, `본 보기 ${n}`);
});

test('★ 오개념 이름표: 그 오답이 정말 그 틀린 생각이다 — 문제 글의 수로 틀린 셈을 다시 한다 · 이름표 붙은 오답이 늘 둘 이상 · 이름표가 다 쓰인다', () => {
  let n = 0; const used = new Set();
  for (const { c, s, q } of every(['calc'])) {
    const sv = solveText(q.q);
    const tagged = q.choices.filter((x) => !x.ok && x.tag !== SLIP);
    assert.ok(tagged.length >= 2, `${c.id} #${s}: 이름표 붙은 오답 ${tagged.length}\n${q.q}\n${q.choices.map((x) => `${x.text}[${x.tag}]`).join(' | ')}`);
    for (const w of tagged) { assert.ok(tagHolds(sv.f, w.tag, w.text), `${c.id} #${s} (${sv.type}): "${w.text}"의 이름표 "${w.tag}"가 뜻과 다르다\n${q.q}`); n++; used.add(w.tag); }
  }
  assert.ok(n > 16 * SEEDS, `본 이름표 ${n}`);
  assert.equal(used.size, Object.keys(TAGS).length, `안 쓰인 이름표: ${Object.values(TAGS).filter((t) => !used.has(t))}`);
});

test('★ 한 오답 값이 두 틀린 생각에 다 맞는 일이 없다 — 보기에서 겹쳐 빠지기 전(probe.allWrong)까지 · 빠진 오답도 이름표의 뜻 그대로 · 정답과 같은 값·몫 0 없음', () => {
  for (const { c, s, q } of every(['calc'])) {
    const sv = solveText(q.q);
    if (sv.form === 'pick') continue;
    const W = q.probe.allWrong;
    assert.equal(new Set(W.map((w) => w.text)).size, W.length, `${c.id} #${s}: 오답 글이 겹친다 ${W.map((w) => w.text)}`);
    for (const w of W) {
      const v = pr(w.text);
      assert.ok(v && v.q >= 1 && !eqP(v, sv.ans), `${c.id} #${s}: 오답 "${w.text}"`);
      assert.deepEqual(tagsOf(sv.f, w.text), [w.tag], `${c.id} #${s}: 오답 "${w.text}"[${w.tag}]에 맞는 이름표 ${tagsOf(sv.f, w.text)}\n${q.q}`);
    }
    const vals = W.map((w) => show(pr(w.text)));
    assert.equal(new Set(vals).size, vals.length, `${c.id} #${s}: 오답 값이 겹친다 ${vals}`);
  }
});

test('★ 채우는 근처 수("계산 실수")는 오개념 모양이 아니다 — 곱은 10·100·1000 차이 · 나눗셈은 몫 그대로·나머지는 1 이상 나누는 수 미만 · 어느 이름표에도 안 맞는다', () => {
  let n = 0;
  for (const { c, s, q } of every(['calc'])) {
    const sv = solveText(q.q);
    if (sv.form === 'pick') continue;
    for (const w of q.choices.filter((x) => x.tag === SLIP)) {
      const v = pr(w.text); const at = `${c.id} #${s}: 근처 수 "${w.text}" (정답 ${show(sv.ans)})\n${q.q}`;
      assert.deepEqual(tagsOf(sv.f, w.text), [], at);
      if (sv.f.op === 'mul') assert.ok(v.r === 0 && [10, 100, 1000].includes(Math.abs(v.q - sv.ans.q)), at);
      else if (sv.f.op === 'div') assert.ok(v.q === sv.ans.q && v.r >= 1 && v.r < sv.f.b && v.r !== sv.ans.r, at);
      else if (sv.f.op === 'remOnly') assert.ok(v.r === 0 && v.q >= 1 && v.q < sv.f.b && Math.abs(v.q - sv.ans.q) <= 2, at);
      else if (sv.f.op === 'two') assert.ok(v.r === 0 && Math.abs(v.q - sv.ans.q) === 1, at);
      n++;
    }
  }
  assert.ok(n > SEEDS, `본 근처 수 ${n}`);
});

// 틀린 셈이 우연히 바른 값을 내는 수 — 받아올림이 없는 곱(받아올림을 빠뜨려도 같은 값)은 그 오답을 빼야 한다. 씨앗을 넓혀 찾아본다
test('★ 받아올림이 없는 곱에서는 "받아올림을 빠뜨림" 오답이 없다 — 씨앗을 넓혀 그런 문항을 찾아 본다 · (몇백)×(몇십) 어림에도', () => {
  let found = 0;
  for (let s = 1; s <= 6000; s++) {
    for (const id of ['md.mul2d', 'md.apply']) {
      const q = makeQuestion(id, 'calc', s, OPTS); const sv = solveText(q.q);
      if (sv.f.op !== 'mul') continue;
      const { a, b } = sv.f; const u = b % 10;
      if (ncm(a, u) + ncm(a, (b - u) / 10) * 10 !== a * b) continue;
      found++;
      assert.ok(!q.probe.allWrong.some((w) => w.tag === TAGS.noCarry), `${id} #${s} ${a} × ${b}: 받아올림이 없는데 "${TAGS.noCarry}"`);
    }
  }
  assert.ok(found >= 1, `받아올림 없는 곱 ${found}`);
});

// 242 × 19 — 242 × 9 + 242 × 1 = 2420 = 242 × 10: "부분곱 자리"와 "부분곱 하나 빠뜨림"이 같은 값. 그 값은 오답에서 빠져야 한다 (씨앗 300개에 드물어 넓혀 찾는다)
test('★ 두 틀린 생각이 같은 값을 내는 곱(× 19 꼴)에서는 그 값을 오답에 넣지 않는다 — 씨앗을 넓혀 찾아 본다', () => {
  let found = 0;
  for (let s = 1; s <= 8000 && found < 5; s++) {
    for (const id of ['md.mul2d', 'md.apply']) {
      const q = makeQuestion(id, 'calc', s, OPTS); const sv = solveText(q.q);
      if (sv.f.op !== 'mul' || sv.f.b % 10 !== 9 || Math.floor(sv.f.b / 10) !== 1) continue;
      found++;
      const amb = String(sv.f.a * 10);
      assert.ok(!q.probe.allWrong.some((w) => w.text === amb), `${id} #${s} ${sv.f.a} × ${sv.f.b}: 두 생각이 같은 값 ${amb}이 오답에`);
    }
  }
  assert.ok(found >= 3, `× 19 꼴 ${found}`);
});

test('★ AA5 ② "나누는 수를 몇십쯤으로 생각해 어림한 몫이 커요"는 참이다 — 그 몇십으로 나눈 몫이 정말 바른 몫보다 1 크다 (교과서 239 ÷ 32: 30으로 8)', () => {
  let n = 0;
  for (let s = 1; s <= Math.max(SEEDS, 600); s++) {
    const q = makeQuestion('md.div3d1', 'misread', s, OPTS);
    const m = /(\d+)[을를] (\d+)쯤으로 생각해 어림한 몫이 커요/.exec(q.solve.whyAny);
    if (!m) continue;
    const F2 = misreadFacts(q); const b = +m[1]; const B = +m[2];
    assert.equal(b, F2.f.b, q.q); assert.equal(B % 10, 0); assert.ok(Math.abs(B - b) < 5, `${b} → ${B}`);
    assert.equal(Math.floor(F2.f.a / B), F2.right.q + 1, `#${s}: ${F2.f.a} ÷ ${B}의 몫이 ${F2.right.q + 1}이 아니다`);
    n++;
  }
  assert.ok(n > 100, `본 문항 ${n}`);
});

// 몫 9인 나눗셈에서 "어림한 몫이 큰데 그대로 둠"은 몫 10 — 몫이 한 자리인 세로셈 한 칸에 10을 어림해 쓰는 아이는 없다 (변이 검사가 찾음)
test('★ 몫이 한 자리인 나눗셈(AA3·AA4·AA5·어림)의 오답 몫도 한 자리 — "어림한 몫이 큰데 그대로 둠"이 10이 되지 않는다 · ② 보여 준 답·보기도', () => {
  let n = 0;
  for (const { c, k, s, q } of every(['calc', 'misread'])) {
    if (!['md.div2d', 'md.div10s', 'md.div3d1', 'md.est'].includes(c.id)) continue;
    if (k === 'calc') {
      const sv = solveText(q.q);
      if (sv.form === 'pick' || sv.f.op !== 'div') continue;
      assert.ok(sv.ans.q <= 8, `${c.id} #${s}: 몫 ${sv.ans.q} — 몫 9는 뽑지 않는다\n${q.q}`);
      for (const w of q.probe.allWrong.filter((x) => x.tag === TAGS.overEst)) { assert.ok(pr(w.text).q <= 9, `${c.id} #${s}: "${w.text}"`); n++; }
    } else {
      const F2 = misreadFacts(q);
      if (F2.shown && F2.f.op === 'div' && F2.kind !== 'rem') assert.ok(F2.shown.q <= 9 || F2.kind === 'div' && F2.shown.q === F2.right.q * 10, `${c.id} ② #${s}: 보여 준 ${show(F2.shown)}`);
      for (const w of q.choices.filter((x) => x.tag === TAGS.overEst)) { assert.ok(lastP(w.text).q <= 9, `${c.id} ② #${s}: "${w.text}"`); n++; }
    }
  }
  assert.ok(n > 4 * SEEDS, `본 오답 ${n}`);
});

/** ② 문항 — 보여 준 말·바른 값·판정표 재료를 문제 글(굵은 줄·그림)에서 따로 */
function misreadFacts(q) {
  const B = bolds(q.q); const line = B[B.length - 1] || '';
  let m;
  if ((m = /\[vmul (\d+) (\d+) (?:(\d+)\+(\d+))?=(\d+)\]/.exec(q.q))) {
    const a = +m[1]; const b = +m[2];
    return { kind: 'vmul', shown: P(+m[5]), right: P(a * b), f: { op: 'mul', a, b }, rows: m[3] ? [+m[3], +m[4]] : [] };
  }
  if ((m = /\[vdiv (\d+) (\d+) (\d+)(_?) (\d+)\]/.exec(q.q))) {
    const a = +m[1]; const b = +m[2];
    return { kind: 'vdiv', shown: P(+m[3], +m[5]), right: dm(a, b), f: { op: 'div', a, b }, blank: !!m[4] };
  }
  if ((m = /^(\d+) × (\d+) = (\d+)$/.exec(line))) {
    const a = +m[1]; const b = +m[2];
    const story = /^구슬 (\d+)개를 한 봉지에 (\d+)개씩 담으면/.exec(q.q);
    if (story) { assert.ok(+story[1] === a && +story[2] === b, q.q); return { kind: 'op', shown: P(+m[3]), right: dm(a, b), f: { op: 'div', a, b } }; }
    return { kind: 'mul', shown: P(+m[3]), right: P(a * b), f: { op: 'mul', a, b } };
  }
  if ((m = /^(\d+) ÷ (\d+) = (\d+)(?: … (\d+))?$/.exec(line))) {
    const a = +m[1]; const b = +m[2];
    return { kind: 'div', shown: P(+m[3], m[4] ? +m[4] : 0), right: dm(a, b), f: { op: 'div', a, b } };
  }
  if ((m = /^(\d+) ÷ (\d+)의 몫은 두 자리 수예요$/.exec(line))) {
    const a = +m[1]; const b = +m[2];
    return { kind: 'digits', claim: `${a} ÷ ${b}`, right: dm(a, b), f: { op: 'div', a, b } };
  }
  if ((m = /^남는 색종이는 (\d+)장이에요$/.exec(line))) {
    // ①과 같은 말 — "될 수 있는 대로 많이"가 없으면 "43장씩 주면 27장 남는다"도 참이 된다 (🔍 Codex 42차 #1)
    const st = /^색종이 (\d+)장을 (\d+)명에게 똑같이 나누어 주려고 해요\. 한 명에게 될 수 있는 대로 많이 주면 남는 색종이는 몇 장일까요\?/.exec(q.q);
    assert.ok(st, `남는 색종이 ②의 문제 글이 ①과 다르다\n${q.q}`);
    const a = +st[1]; const b = +st[2];
    return { kind: 'rem', shown: P(+m[1]), right: P(a % b), f: { op: 'div', a, b }, g: { op: 'remOnly', a, b } };
  }
  return { kind: 'unknown' };
}

test('★ ② 오개념 문항: 보여 준 말은 정말 틀렸다 · 그 틀린 답은 판정표의 어느 틀린 셈 · 고치는 말의 결론만 맞다 · 이름표 붙은 보기의 결론은 그 틀린 생각 · 갈래 열쇠 둘씩 · 엉뚱한 지적은 거짓 단정', () => {
  const keys = {}; let tagged = 0;
  for (const { c, s, q } of every(['misread'], Math.max(SEEDS, 600))) {
    (keys[c.id] = keys[c.id] || new Set()).add(q.key);
    const at = `${c.id} #${s} ${q.key}`;
    const F = misreadFacts(q);
    assert.notEqual(F.kind, 'unknown', `${at}: 못 읽는 ②\n${q.q}`);
    if (F.kind === 'digits') {
      assert.ok(F.right.q < 10, `${at}: "두 자리 수예요"가 맞는 말이다`);
      assert.ok(tagHolds({ op: 'digits' }, TAGS.frontOnly, F.claim), `${at}: 보여 준 말이 "맨 앞 숫자만 비교"가 아니다`);
    } else if (F.kind === 'rem') {
      assert.ok(!eqP(F.shown, F.right), `${at}: 보여 준 말이 맞다`);
      assert.ok(tagHolds(F.g, TAGS.quotForRem, show(F.shown)), `${at}: 보여 준 말이 "나머지 대신 몫"이 아니다`);
    } else {
      assert.ok(!eqP(F.shown, F.right), `${at}: 보여 준 답 ${show(F.shown)}이 맞는 값\n${q.q}`);
      assert.ok(tagsOf(F.f, show(F.shown)).length === 1, `${at}: 보여 준 답 ${show(F.shown)}에 맞는 틀린 셈 ${tagsOf(F.f, show(F.shown))}\n${q.q}`);
    }
    const ok = q.choices.find((x) => x.ok);
    assert.ok(eqP(lastP(ok.text), F.right), `${at}: 고치는 말 "${ok.text}"의 결론 ≠ ${show(F.right)}`);
    for (const w of q.choices.filter((x) => !x.ok)) {
      if (w.tag === '엉뚱한 지적') { assert.match(w.text, /(없어요|아니에요)$/, `${at}: 엉뚱한 지적은 거짓 단정으로 "${w.text}"`); continue; }
      if (w.tag === '틀린 줄 모름') { assert.match(w.text, /^맞게 (계산했어요|말했어요)$/); continue; }
      const end = lastP(w.text);
      assert.ok(!eqP(end, F.right), `${at}: 오개념 보기 "${w.text}"의 결론이 맞는 값`);
      assert.ok(tagHolds(F.g || F.f, w.tag, show(end)), `${at}: ② 보기 "${w.text}"의 이름표 "${w.tag}"가 뜻과 다르다\n${q.q}`);
      tagged++;
    }
    assert.ok(q.choices.some((x) => x.tag === '틀린 줄 모름'), `${at}: "맞게 …" 보기`);
  }
  for (const id of IDS) assert.equal(keys[id].size, 2, `${id}: ② 갈래 ${[...keys[id]]}`);
  assert.ok(tagged >= 8 * 600, `본 ② 이름표 ${tagged}`);
});

// 🔍 Codex 42차 #1 — 위 테스트는 보기의 끝 수만 본다. "한 명에게 43장씩 주면 남는 것은 27"(973 − 22 × 43 = 27)은 끝 수가 틀린 답이어도 말 전체는 참이었다
test('★ ② 보기는 말 전체로 — 오개념 보기 속 나눗셈 식은 바른 식이 아니다 · 고치는 말의 나눗셈 식은 바르다 · "…씩 주면 남는 것은 …" 같은 조건문 보기 없음', () => {
  let n = 0;
  for (const { c, s, q } of every(['misread'], Math.max(SEEDS, 600))) {
    const at = `${c.id} #${s} ${q.key}`;
    for (const x of q.choices) {
      for (const m of x.text.matchAll(/(\d+) ÷ (\d+) = (\d+)(?: … (\d+))?/g)) {
        const right = eqP(P(+m[3], m[4] === undefined ? 0 : +m[4]), dm(+m[1], +m[2]));
        assert.equal(right, !!x.ok, `${at}: ${x.ok ? '고치는 말' : '오개념 보기'} "${x.text}"의 식 ${m[0]}이 ${right ? '바른' : '틀린'} 식\n${q.q}`);
        n++;
      }
      assert.ok(!/씩 주면 남는/.test(x.text), `${at}: 조건문 보기 "${x.text}" — 그 조건에서는 참일 수 있다`);
    }
  }
  assert.ok(n > 600, `본 나눗셈 식 ${n}`);
});

// 🔍 Codex 42차 #2 — 보기를 그대로 쳐 보는 것만으로는 모른다. "한 명에게 몇 개씩"을 묻는데 오답 보기가 "11 … 17"이면,
//   먹은 것을 빼지 않은 아이가 치는 11은 어느 보기와도 달라 짐작한 답(reason none)으로 셌다 — 이야기가 묻는 수로 쳐 본다
test('★ 이야기가 묻는 것으로 쳐 보기 — 두 단계(한 명에게 몇 개씩)에서 빼지 않은 몫·더한 몫, 나머지만 묻는 문제에서 몫을 숫자판에 치면 그 오개념 · 답이 수인 문제의 숫자판은 수 칸부터', () => {
  let n = 0; const seen = new Set();
  for (const { c, s, q } of every(['calc'])) {
    const sv = solveText(q.q);
    if (sv.form === 'pick') continue;
    const at = `${c.id} #${s} (${sv.type}): ${q.q}\n${q.choices.map((x) => x.text).join(' | ')}`;
    const spec = padSpec(q, 'muldiv');
    // 나눗셈 계산(어림한 350 ÷ 50 포함)은 1단계 규칙 그대로 — 보기에 많은 꼴, 같으면 몫 … 나머지 칸부터. 곱셈·두 단계·나머지만 묻는 문제는 수 칸부터
    if (sv.form === 'num' && sv.f.op !== 'div') assert.equal(spec.start, 'num', `${at}: 답이 수인데 숫자판이 ${spec.start} 칸부터`);
    const want = [];
    if (sv.f.op === 'two') { const { a, s: e, b } = sv.f; want.push([Math.floor(a / b), TAGS.oneStep], [Math.floor((a + e) / b), TAGS.subAsAdd]); }
    if (sv.f.op === 'remOnly') want.push([Math.floor(sv.f.a / sv.f.b), TAGS.quotForRem]);
    for (const [v, tag] of want) {
      const got = matchTyped(q, readTyped('num', { x: String(v) }, spec), spec);
      const gotTag = got.i >= 0 ? q.choices[got.i].tag : got.known && got.known.tag;
      assert.equal(gotTag, tag, `${at}: ${v}을(를) 치면 ${JSON.stringify(got)}`);
      seen.add(sv.type); n++;
    }
  }
  assert.ok(seen.has('twoStep') && seen.has('remMean') && n > SEEDS / 4, `본 ${n} ${[...seen]}`);
});

test('🎨 ② 세로셈 그림은 그 틀린 셈 그대로 — 곱셈 부분곱 줄 = 문제의 수로 한 부분곱(덜 옮김) · 한 줄은 몇을 곱한 값 · 나눗셈 몫 칸·맨 아래 = 보여 준 답 · 몫의 일의 자리를 비운 그림은 0을 빠뜨린 문항에서만', () => {
  const seen = { rows: 0, one: 0, blank: 0, vdiv: 0 };
  for (const { c, s, q } of every(['misread'], Math.max(SEEDS, 600))) {
    const F = misreadFacts(q); const at = `${c.id} #${s}: ${q.q}`;
    if (F.kind === 'vmul') {
      const { a, b } = F.f; const u = b % 10;
      if (F.rows.length) { assert.deepEqual(F.rows, [a * u, a * ((b - u) / 10)], at); seen.rows++; } else { assert.equal(F.shown.q, a * (b / 10), at); seen.one++; }
      const svg = figureSvg(/\[(vmul [^\]]+)\]/.exec(q.q)[1]);
      assert.match(svg, new RegExp(`data-k="s" data-v="${F.shown.q}"`), at);
    }
    if (F.kind === 'vdiv') {
      const svg = figureSvg(/\[(vdiv [^\]]+)\]/.exec(q.q)[1]);
      assert.match(svg, new RegExp(`data-q="${F.shown.q}${F.blank ? '_' : ''}" data-r="${F.shown.r}"`), at);
      const R = vdivCheck(svg, F.f.a, F.f.b, `${F.shown.q}${F.blank ? '_' : ''}`, at);
      assert.equal(+R[R.length - 1].v, F.shown.r, `${at}: 맨 아래 = 보여 준 나머지`);
      if (F.blank) { assert.equal(c.id, 'md.div3d2', at); assert.equal(F.right.q % 10, 0, at); seen.blank++; }
      seen.vdiv++;
    }
  }
  assert.ok(seen.rows > 50 && seen.one > 50 && seen.blank > 50 && seen.vdiv > 150, JSON.stringify(seen));
});

// 틀 열쇠(tplKey)는 숫자만 #로 바꾼다 — 같은 틀 글을 두 가족이 쓰면 🔁 쌍둥이는 열쇠로 첫 가족만 찾는다(나누어떨어지는 문제의 쌍둥이가 늘 나머지 있는 꼴)
test('🔁 틀마다 열쇠는 하나 — 칸마다 열쇠는 4개 이하 · 한 열쇠의 문제는 굵은 글씨를 빼면 같은 틀 글 · 계산 열쇠의 쌍둥이에 나머지 있는 꼴·없는 꼴이 다 나온다(가족 안에서 고름)', () => {
  const norm = (t) => tplKey(String(t).replace(/\*\*[^*]+\*\*/g, '**#**'));
  for (const c of MULDIV) {
    const byKey = {};
    for (let s = 1; s <= SEEDS; s++) { const q = makeQuestion(c.id, 'calc', s, OPTS); (byKey[q.key] = byKey[q.key] || new Set()).add(norm(q.q)); }
    const keys = Object.keys(byKey);
    assert.ok(keys.length <= 4, `${c.id}: 열쇠 ${keys.length}개 — ${keys.slice(0, 3).join(' / ')}`);
    for (const [k, texts] of Object.entries(byKey)) if (!/\{/.test(k)) assert.equal(texts.size, 1, `${c.id}: 열쇠 "${k}"에 틀 글 ${texts.size}가지`); // {mon} 틀은 이름이 바뀐다
  }
  for (const id of ['md.div2d', 'md.div10s', 'md.div3d1', 'md.div3d2']) {
    let key = '';
    for (let s = 1; !key && s < 100; s++) { const q = makeQuestion(id, 'calc', s, OPTS); if (/^다음을 계산하면/.test(q.q)) key = q.key; }
    const forms = new Set();
    for (let s = 1; s <= 200; s++) forms.add(!!solveText(makeQuestion(id, 'calc', s, { ...OPTS, want: { k: 'calc', key } }).q).ans.r);
    assert.equal(forms.size, 2, `${id}: 계산 열쇠의 쌍둥이 꼴 ${[...forms]}`);
  }
});

// ───────────────────── 글 ─────────────────────

const UNIT_JOSA = /(?<![가-힣a-z])(?:g|kg|m|cm|L)(?:이에요|예요|이고|이면|이|가|은|는|을|를|와|과|으로|로)(?![가-힣])/;
const DIRECTIVES = /\[v(?:mul|div) [^\]]+\]/g;

test('★ 조사: 수 뒤는 읽는 소리 · 단위 글자(g) 바로 뒤에는 없음 · ASCII 빼기 없음 · "몫 … 나머지"는 띄어 쓴 줄임표', () => {
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
    assert.ok(!/\d…|…\d|\.\.\./.test(all), `${c.id} ${k} #${s}: 줄임표는 " … "로`);
  }
  assert.ok(hitN > SEEDS, `실제로 본 곳 ${hitN}`);
  for (const c of MULDIV) {
    const t = [c.idea, c.rule, c.slip].join('\n').replace(/\*\*/g, '');
    const up = UNIT_JOSA.exec(t); assert.ok(!up, `${c.id} 설명: 단위 글자 바로 뒤 조사 "${up && up[0]}"`);
    assert.ok(!/\d…|…\d/.test(t), `${c.id} 설명: 줄임표`);
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

/** 글 속 셈식 — "A ÷ B = q … r"은 몫과 나머지로, 나머지는 "식 = 식 = …"을 계산기로 */
function eqChains(text) {
  const out = [];
  let t = String(text);
  for (const m of t.matchAll(/(\d+) ÷ (\d+) = (\d+) … (\d+)/g)) out.push({ a: `${m[1]} ÷ ${m[2]}`, b: `${m[3]} … ${m[4]}`, ok: eqP(dm(+m[1], +m[2]), P(+m[3], +m[4])) });
  t = t.replace(/(\d+) ÷ (\d+) = (\d+) … (\d+)/g, '#');
  // 연산 기호 바로 뒤에서는 식이 시작하지 않는다 · 앞이 숫자면 식의 가운데 — 떼어 읽지 않는다
  for (const m of t.matchAll(/(?<![+−×÷] |\d)[\d(](?:[\d /()+−×÷=])*[\d)]/g)) {
    const parts = m[0].split(' = ').map((x) => x.trim());
    if (parts.length < 2) continue;
    const vals = parts.map((p) => { try { return evalExpr(p); } catch { return null; } });
    for (let i = 1; i < vals.length; i++) if (vals[i - 1] && vals[i]) out.push({ a: parts[i - 1], b: parts[i], ok: qeq(vals[i - 1], vals[i]) });
  }
  return out;
}
test('★ 글 속 셈식은 맞다 ("몫 … 나머지"까지) — 문제·정답·풀이·왜 전부 · 칸 설명도', () => {
  let n = 0; let rem = 0;
  for (const { c, k, s, q } of every()) {
    const all = [q.q.replace(/\*\*.+?\*\*/g, ''), q.choices.find((x) => x.ok).text, ...q.solve.steps, ...Object.values(q.solve.why), q.solve.whyAny].join('\n');
    for (const e of eqChains(all)) { assert.ok(e.ok, `${c.id} ${k} #${s}: ${e.a} = ${e.b}\n${all}`); n++; if (/…/.test(e.b)) rem++; }
  }
  assert.ok(n > 20 * SEEDS && rem > 5 * SEEDS, `셈식 ${n} · 몫 … 나머지 ${rem}`);
  let m = 0;
  for (const c of MULDIV) for (const e of eqChains(`${c.idea}\n${c.rule}\n${c.slip}`.replace(/\*\*/g, ''))) { assert.ok(e.ok, `${c.id} 설명: ${e.a} = ${e.b}`); m++; }
  assert.ok(m >= 30, `칸 설명 셈식 ${m}`);
  assert.ok(!eqChains('53 ÷ 12 = 5 … 7')[0].ok && !eqChains('12 × 4 = 46')[0].ok, '검사기 자체 — 틀린 식을 잡는다');
});

test('★ 풀이 줄·고치는 말의 비교 말은 수와 맞다 — "…는 a보다 작고" · "…은 a보다 커요" · "…은 b보다 작아요" · "나누어떨어져요"는 나머지 0에서만 · ② 어림 "곱은 A × B = N보다 작아요"', () => {
  let n = 0; let est = 0;
  for (const { c, k, s, q } of every()) {
    const okT = q.choices.find((x) => x.ok).text;
    if (k === 'misread' && q.key === 'misread:est') {
      const m = /곱은 (\d+) × (\d+) = (\d+)보다 작아요/.exec(okT); const F2 = misreadFacts(q);
      assert.ok(m && +m[1] * +m[2] === +m[3] && F2.right.q < +m[3] && +m[1] >= F2.f.a && +m[2] >= F2.f.b, `${c.id} ② #${s}: "${okT}"`);
      assert.ok(F2.shown.q > +m[3], `${c.id} ② #${s}: 보여 준 ${F2.shown.q}가 어림한 값보다 크지 않다`); est++;
    }
    for (const line of [okT, ...q.solve.steps, ...Object.values(q.solve.why), q.solve.whyAny]) {
      for (const m of line.matchAll(/(?<![×÷+−] |\d)(\d+)(?:은|는|이|가) (\d+)보다 (작|커|크거나 같|크)/g)) { // 식의 끝 수("× 20은")는 빼고
        const x = +m[1]; const y = +m[2];
        assert.ok(m[3] === '작' ? x < y : m[3] === '크거나 같' ? x >= y : x > y, `${c.id} ${k} #${s}: "${m[0]}"\n${line}`); n++;
      }
      for (const m of line.matchAll(/(\d+)(?:은|는|이|가) 나누는 수 (\d+)(?:와|과) 같아요/g)) { assert.equal(+m[1], +m[2], `${c.id} ${k} #${s}: "${m[0]}"`); n++; }
      if (/나누어떨어져요/.test(line)) assert.match(line, /= 0 — 나누어떨어져요/, `${c.id} ${k} #${s}: ${line}`);
    }
  }
  assert.ok(n > 10 * SEEDS && est > SEEDS / 4, `본 비교 말 ${n} · ② 어림 ${est}`);
});

test('🔁 쌍둥이·🤔 노트: 요청한 틀·갈래로 온다 · 같은 셈 · 굵은 글씨(바뀌는 수)를 빼면 틀 글이 같다', () => {
  const norm = (t) => tplKey(String(t).replace(/\*\*[^*]+\*\*/g, '**#**'));
  for (const c of MULDIV) {
    for (let s = 1; s <= Math.min(Math.max(SEEDS, 150), 300); s++) {
      const q = makeQuestion(c.id, 'calc', s, OPTS);
      assert.ok(q.key, `${c.id} #${s}: 열쇠 없음`);
      const tw = makeQuestion(c.id, 'calc', s + 99991, { ...OPTS, want: { k: 'calc', key: q.key } });
      assert.equal(tw.key, q.key, `${c.id} #${s}: 쌍둥이가 다른 틀\n${q.q}\n---\n${tw.q}`);
      const a = solveText(q.q); const b = solveText(tw.q);
      assert.equal(b.type, a.type, `${c.id} #${s}: 쌍둥이가 다른 셈`);
      if (!/\{/.test(q.key)) assert.equal(norm(tw.q), norm(q.q), `${c.id} #${s}: 틀 글이 다르다`);
      const m = makeQuestion(c.id, 'misread', s, OPTS);
      const mt = makeQuestion(c.id, 'misread', s + 99991, { ...OPTS, want: { k: 'misread', key: m.key } });
      assert.equal(mt.key, m.key, `${c.id} #${s}: ② 갈래`);
    }
  }
});

/** 참이라고 내미는 글에 틀린 말 — 오답 보기·② 보여 준 말은 빼고, 굵게(**)는 떼고 */
const BAD = [
  [/나머지(?:는|가) 나누는 수(?:보다 작거나 같|와 같거나 작)아/, '나머지는 나누는 수보다 작아야 한다(같아도 안 된다)'],
  [/몫(?:은|이) (?:늘|항상) (?:두|세) 자리/, '몫의 자리 수는 앞의 두 자리 수와 나누는 수를 비교해 정한다'],
  [/어림한 (?:값|몫)(?:이|은) (?:곧 )?(?:정답|답이에요|몫이에요)/, '어림한 값은 답이 하나가 아니다 — 어림으로 확인할 뿐'],
  [/몫의 (?:일의 자리|빈 자리)(?:는|를) (?:비워(?:요| 둬요)|안 써요|쓰지 않아요)/, '나눌 수 없는 자리에는 몫에 0을 쓴다'],
  [/하나 더 필요|한 (?:상자|봉지)가 더 필요/, '올림 해석은 이 단원에서 다루지 않는다'],
  [/반올림/, '"반올림"은 5~6학년 말 — "…쯤으로 생각하면"'],
  [/0을 (?:두|세|네) 개 더 붙여(?:요|야)/, '몇십을 곱하면 10배 — 0을 하나 쓴다'],
];
test('★ 참말에 틀린 말이 없다 — 나머지 ≤ 나누는 수 · 몫은 늘 두 자리 · 어림한 값이 답 · 몫의 빈 자리 · 올림 해석 · 반올림', () => {
  const truths = (q) => [q.choices.find((x) => x.ok).text, ...(q.solve ? [...q.solve.steps, ...Object.values(q.solve.why), q.solve.whyAny, q.solve.rule] : [])].join('\n').replace(/\*\*/g, '');
  for (const { c, k, s, q } of every()) {
    const t = truths(q);
    for (const [re, why] of BAD) assert.ok(!re.test(t), `${c.id} ${k} #${s}: ${why}\n${t}`);
  }
  for (const c of MULDIV) for (const [re, why] of BAD) assert.ok(!re.test([c.idea, c.rule, c.slip].join('\n').replace(/\*\*/g, '')), `${c.id}: ${why}`);
  // 정규식 자체 — 틀린 말은 잡고 바른 말은 지나간다
  assert.ok(BAD[0][0].test('나머지는 나누는 수보다 작거나 같아야 해요') && !BAD[0][0].test('나머지가 나누는 수보다 크거나 같으면 몫을 1 크게 해요'));
  assert.ok(BAD[3][0].test('몫의 일의 자리는 비워요') && !BAD[3][0].test('몫의 일의 자리를 비우지 않아요'));
});

test('🔢 숫자판: 수·"몫 … 나머지"가 답인 ①은 모두 숫자판 · 모든 보기를 쳐서 그 보기로 간다 · 나머지 0을 붙여 쳐도 맞음 · 몫만 치면 "나머지도 써요" · 빠진 오답 후보는 그 이름표 · 고르기는 보기 그대로 · ± 없음', () => {
  const pv = readFileSync(new URL('../js/padview.js', import.meta.url), 'utf8');
  const MAX = +/const MAX = (\d+);/.exec(pv)[1];
  let n = 0; let dropped = 0; let picks = 0; let zero = 0; let only = 0; let remModes = 0;
  for (const { c, s, q } of every(['calc'], 200)) {
    const spec = padSpec(q, 'muldiv'); const sv = solveText(q.q);
    if (sv.form === 'pick') { assert.equal(spec, null, `${c.id} #${s}: 고르는 문제에 숫자판`); picks++; continue; }
    assert.ok(spec, `${c.id} #${s}: 숫자판이 없다\n${q.q}`);
    assert.equal(spec.need, null, `${c.id} #${s}: 꼴을 묻지 않는다 — ${spec.need}`);
    assert.equal(spec.signed, false, `${c.id} #${s}: ± 없음`);
    const hasRem = q.choices.some((x) => /…/.test(x.text));
    assert.deepEqual(spec.modes, hasRem ? ['num', 'rem'] : ['num', 'frac'], `${c.id} #${s}: 칸 ${spec.modes}`);
    if (hasRem) remModes++;
    // 처음 칸은 보기 전체에서 많은 꼴(같으면 몫 … 나머지) — 정답이 어느 꼴인지와 상관없게
    if (hasRem) { const nR = q.choices.filter((x) => /…/.test(x.text)).length; assert.equal(spec.start, q.choices.length - nR > nR ? 'num' : 'rem', `${c.id} #${s}: 처음 칸 ${spec.start}`); }
    for (const ch of q.choices) {
      for (const part of ch.text.split(' … ')) assert.ok(part.length <= MAX, `${c.id} #${s}: "${ch.text}"`);
      const t = partsOf(ch.text);
      assert.ok(t && spec.modes.includes(t.mode), `${c.id} #${s}: "${ch.text}"를 칸으로 못 나눔`);
      const hit = matchTyped(q, readTyped(t.mode, t.p, spec), spec);
      assert.equal(q.choices[hit.i], ch, `${c.id} #${s}: "${ch.text}"를 쳐도 그 보기로 안 간다`);
      n++;
    }
    const ok = q.choices.find((x) => x.ok); const okP = pr(ok.text);
    if (hasRem && !okP.r) {
      const hit0 = matchTyped(q, readTyped('rem', { q: String(okP.q), r: '0' }, spec), spec);
      assert.ok(q.choices[hit0.i] && q.choices[hit0.i].ok && /나머지가 0이면/.test(hit0.note), `${c.id} #${s}: "${okP.q} … 0"이 틀림`);
      zero++;
    }
    if (okP.r && !q.choices.some((x) => x.text === String(okP.q))) {
      const h = matchTyped(q, readTyped('num', { x: String(okP.q) }, spec), spec);
      assert.ok(h.i === -1 && h.reason === 'form' && /나머지도 써요/.test(h.note), `${c.id} #${s}: 몫만 친 답 ${JSON.stringify(h)}`);
      only++;
    }
    for (const w of q.probe.allWrong) {
      if (q.choices.some((x) => x.text === w.text)) continue;
      const t = partsOf(w.text); const hit = matchTyped(q, readTyped(t.mode, t.p, spec), spec);
      if (q.choices[hit.i]) continue;
      assert.equal(hit.known && hit.known.tag, w.tag, `${c.id} #${s}: 빠진 후보 "${w.text}"[${w.tag}]`);
      dropped++;
    }
  }
  assert.ok(n > 1000 && dropped > 0 && picks > 0 && zero > 50 && only > 100 && remModes > 400, `쳐 본 보기 ${n} · 빠진 후보 ${dropped} · 고르기 ${picks} · "… 0" ${zero} · 몫만 ${only} · 몫 … 나머지 칸 ${remModes}`);
  assert.deepEqual(textVal('4 … 5'), { form: 'rem', q: 4, r: 5 });
});

// ───────────────────── 그림 ─────────────────────

/** 세로셈 그림의 줄 → { k, v, ps(자리 번호들), xs } */
function rowsOf(svg, cls) {
  return [...svg.matchAll(new RegExp(`<g class="${cls}" data-k="([a-z0-9]+)" data-v="([^"]*)">(.*?)</g>`, 'g'))].map((m) => ({
    k: m[1], v: m[2], ps: [...m[3].matchAll(/data-p="(-?\d+)"/g)].map((x) => +x[1]), xs: [...m[3].matchAll(/ x="([\d.]+)"/g)].map((x) => +x[1]),
    ys: [...m[3].matchAll(/ y="([\d.]+)"/g)].map((x) => +x[1]), ds: [...m[3].matchAll(/>(\d)</g)].map((x) => x[1]).join(''),
  }));
}
/**
 * [vdiv] 그림 하나를 이 파일이 따로 다시 셈해 맞춰 본다 — Qs = 몫 칸 글("32" · 아이가 쓴 "8" · 일의 자리를 비운 "2_")
 * 줄의 값(data-v)·자리(data-p)만이 아니라 **보이는 숫자**·x(나누어지는 수의 같은 자리 칸)·y(위에서 아래로, 한 줄은 한 높이)까지
 * (🔍 Codex 42차 #3 — data-v·data-p만 보면 빼는 수 48을 49로 그려도, 몫 숫자를 한 칸 옮겨 그려도 지나갔다)
 */
function vdivCheck(svg, a, b, Qs, at) {
  const R = rowsOf(svg, 'vd-row');
  const A = String(a); let cur = +A.slice(0, A.length - Qs.length + 1); const want = [];
  for (let j = 0; j < Qs.length; j++) {
    const p = Qs.length - 1 - j; const d = Qs[j] === '_' ? 0 : +Qs[j];
    if (d) { want.push(['prod', b * d, p]); cur -= b * d; }
    if (j < Qs.length - 1) { cur = cur * 10 + +A[A.length - p]; want.push(['next', cur, p - 1]); } else if (d) want.push(['rest', cur, p]);
  }
  assert.deepEqual(R.map((x) => x.k).slice(0, 2), ['q', 'a'], `${at}: 몫·나누어지는 수 줄`);
  const got = R.slice(2).map((x) => [x.k, +x.v, x.ps[x.ps.length - 1]]);
  assert.deepEqual(got, want, `${at}: 줄`);
  const Qr = R[0]; const qp = [...Qs].map((ch, i) => (ch === '_' ? null : Qs.length - 1 - i)).filter((p) => p !== null);
  assert.deepEqual([Qr.ds, Qr.ps], [Qs.replace(/_/g, ''), qp], `${at}: 몫 칸의 숫자·자리`);
  const Ar = R[1]; assert.equal(Ar.ds, A, `${at}: 나누어지는 수의 숫자`);
  const colX = {}; Ar.ps.forEach((p, i) => { colX[p] = Ar.xs[i]; });
  let lastY = -1;
  for (const r of R) {
    if (r.k !== 'q') {
      assert.equal(r.ds, String(+r.v), `${at}: 줄 ${r.k}의 보이는 숫자 ${r.ds} ≠ ${r.v}`);
      const low = r.ps[r.ps.length - 1]; assert.deepEqual(r.ps, r.ps.map((_, i) => low + r.ps.length - 1 - i), `${at}: 줄 ${r.k}의 자리가 이어지지 않음`);
    }
    r.ps.forEach((p, i) => assert.ok(colX[p] !== undefined && Math.abs(r.xs[i] - colX[p]) < 0.01, `${at}: 줄 ${r.k}의 ${p}자리 숫자 x ${r.xs[i]} ≠ 나누어지는 수의 그 자리 ${colX[p]}`));
    assert.ok(r.ys.every((y) => y === r.ys[0]) && r.ys[0] > lastY, `${at}: 줄 ${r.k}의 높이 ${r.ys} (앞 줄 ${lastY})`);
    lastY = r.ys[0];
  }
  return R;
}
test('🎨 곱셈 세로셈 [vmul]: 부분곱 = 일의 자리 곱·몇십 곱(0까지) · 합 · 숫자는 일의 자리끼리 오른쪽 맞춤 · 몇십·한 자리는 한 줄 · 아이가 쓴 줄 그대로 · 폭 400 · 글로 바꾸기 · 못 그리는 지시문은 빈 그림', () => {
  for (const [a, b] of [[123, 24], [726, 53], [857, 74], [641, 81], [99, 11]]) {
    const svg = figureSvg(`vmul ${a} ${b}`); const R = rowsOf(svg, 'vm-row'); const u = b % 10;
    assert.deepEqual(R.map((x) => x.k), ['a', 'b', 'p1', 'p2', 's'], `${a} × ${b}`);
    assert.deepEqual(R.map((x) => +x.v), [a, b, a * u, a * (b - u), a * b], `${a} × ${b}: 줄의 수`);
    for (const r of R) {
      assert.equal(r.ds, r.v, `${a} × ${b}: 줄 ${r.k}의 숫자`);
      assert.deepEqual(r.ps, [...r.v].map((_, i) => r.v.length - 1 - i), `${a} × ${b}: 줄 ${r.k}의 자리`);
    }
    const onesX = R.map((r) => r.xs[r.xs.length - 1]);
    assert.ok(onesX.every((x) => Math.abs(x - onesX[0]) < 0.01), `${a} × ${b}: 일의 자리 x ${onesX}`);
    assert.ok(+/viewBox="0 0 (\d+)/.exec(svg)[1] <= 400);
  }
  for (const [a, b] of [[143, 20], [230, 50], [143, 2]]) assert.deepEqual(rowsOf(figureSvg(`vmul ${a} ${b}`), 'vm-row').map((x) => [x.k, +x.v]), [['a', a], ['b', b], ['s', a * b]], `${a} × ${b}: 한 줄`);
  assert.deepEqual(rowsOf(figureSvg('vmul 726 53 2178+3630=5808'), 'vm-row').map((x) => +x.v), [726, 53, 2178, 3630, 5808]);
  assert.deepEqual(rowsOf(figureSvg('vmul 216 40 =864'), 'vm-row').map((x) => +x.v), [216, 40, 864]);
  for (const bad of ['vmul 726 53 2178+3630=5809', 'vmul 7 53', 'vmul 1234 5', 'vmul 726 123', 'vmul 726 1', 'vmul 072 5', 'vmul 726 53 0178+3630=3808', 'vmul 726 x', 'vmul']) assert.equal(figureSvg(bad), '', bad);
  assert.equal(figText('앞 [vmul 726 53] 뒤'), '앞 (곱셈 세로셈 726 × 53: 2178, 36300 → 38478) 뒤');
  assert.equal(figText('[vmul 216 40 =864]'), '(곱셈 세로셈 216 × 40: 864)');
  assert.equal(figText('앞 [vmul 726 53] 뒤', true), '앞 (곱셈 세로셈) 뒤');
  assert.ok(renderFigures('[vmul 123 24]').startsWith('<svg'));
});

test('🎨 나눗셈 세로셈 [vdiv]: 몫의 끝 글자는 일의 자리 위 · 빼는 수 = 나누는 수 × 그 자리 몫, 그 자리에 맞춰 · 내린 수 = 뺀 나머지와 다음 자리 숫자 · 몫 0인 자리는 빼는 줄 없이 · 맨 아래 = 나머지 · 아이가 쓴 몫 그대로 · 셈이 안 되는 몫은 빈 그림', () => {
  for (let a = 10; a <= 999; a += 7) {
    for (const b of [11, 12, 16, 23, 30, 43, 78, 90]) {
      const q = Math.floor(a / b); if (q < 1 || q > 99) continue;
      const svg = figureSvg(`vdiv ${a} ${b}`); const at = `${a} ÷ ${b}`;
      assert.match(svg, new RegExp(`data-q="${q}" data-r="${a % b}"`), at);
      // 다시 셈 — 이 파일이 나눗셈을 높은 자리부터 따로 해 본다(보이는 숫자·자리·높이까지)
      const R = vdivCheck(svg, a, b, String(q), at);
      const bottom = R[R.length - 1]; assert.equal(+bottom.v, a % b, `${at}: 맨 아래 = 나머지`);
    }
  }
  // 아이가 쓴 틀린 세로셈도 같은 검사 — 맨 아래는 아이가 쓴 나머지
  for (const [sp, a, b, Qs, r] of [['vdiv 873 43 2_ 13', 873, 43, '2_', 13], ['vdiv 162 18 8 18', 162, 18, '8', 18], ['vdiv 689 78 7 143', 689, 78, '7', 143]]) {
    const svg = figureSvg(sp); assert.match(svg, new RegExp(`data-q="${Qs}" data-r="${r}"`), sp);
    const R = vdivCheck(svg, a, b, Qs, sp); assert.equal(+R[R.length - 1].v, r, `${sp}: 맨 아래`);
  }
  const blank = rowsOf(figureSvg('vdiv 873 43 2_ 13'), 'vd-row').find((x) => x.k === 'q');
  assert.deepEqual([blank.ds, blank.ps], ['2', [1]], '비운 일의 자리 — 2는 십의 자리 위');
  for (const bad of ['vdiv 53 12 5 7', 'vdiv 180 30 6_ 0', 'vdiv 162 18 8 17', 'vdiv 873 43 _2 13', 'vdiv 5 2', 'vdiv 1000 12', 'vdiv 527 1', 'vdiv 527 160', 'vdiv 999 2', 'vdiv 527 16 032 15', 'vdiv 527 16 3', 'vdiv']) assert.equal(figureSvg(bad), '', bad);
  assert.equal(figText('[vdiv 873 43 2_ 13]'), '(나눗셈 세로셈 873 ÷ 43: 몫 칸 2(빈칸) · 빼는 수 86 · 맨 아래 13)');
  assert.equal(figText('[vdiv 527 16]', true), '(나눗셈 세로셈)');
  assert.ok(+/viewBox="0 0 (\d+)/.exec(figureSvg('vdiv 527 16'))[1] <= 400);
});

// ───────────────────── 진단·사다리 ─────────────────────

test('📏 진단·사다리·한 편·배움 예비·내용 검사', () => {
  const d = diagnosticSet(7, 5, OPTS);
  assert.equal(d.length, 5);
  assert.ok(d.every((q) => IDS.includes(q.concept)));
  const pl = placeFrom(d.map((q, i) => ({ concept: q.concept, correct: i < 2 })));
  assert.ok(IDS.includes(pl.startId) && pl.knownIds.every((id) => IDS.indexOf(id) < IDS.indexOf(pl.startId)));
  const L0 = ladder([]);
  assert.equal(L0[0].state, 'now');
  assert.ok(L0.slice(1).every((r) => r.state === 'locked'));
  for (const c of MULDIV) {
    const round = makeRound(c.id, 11, OPTS);
    assert.ok(round.length >= 2 && round.every((q) => q.concept === c.id), c.id);
    const les = lessonOf(c.id, 3, OPTS);
    assert.ok(les.pages.length >= 1 && les.title === c.name);
  }
  assert.ok(checkContent({}).length >= 8, '빈 원고는 칸마다 걸린다');
});

// ───────────────────── 2단계: 원고 (coach/math/muldiv.json) ─────────────────────
// 원고의 확인 질문도 문제 글·세로셈 그림에서 따로 읽어 다시 풀고, 오답마다 이름표 있는 틀린 생각인지(한 오답 = 한 생각)를 판정표로 본다.

const CONTENT = JSON.parse(readFileSync(new URL('../coach/math/muldiv.json', import.meta.url), 'utf8'));
const CAST = { me: '진우', mon: '피카츄', mon2: '리자몽' };
const fillC = (t) => String(t).replace(/\{(me|mon|mon2)(?:\/([^/}]+)\/([^}]+))?\}/g, (_, k, a, b) => {
  const n = CAST[k]; if (a === undefined) return n;
  const code = n.slice(-1).charCodeAt(0) - 0xac00; return n + (code >= 0 && code % 28 !== 0 ? a : b);
});
/** 원고 한 칸의 글 전부 (배움·확인 질문·보기·까닭·규칙·아빠 카드) */
const contentText = (v) => fillC([...v.lesson.flatMap((p) => [p.say, p.check.q, p.check.ok, ...p.check.no, p.check.why]), v.rule, v.dad.goal, ...v.dad.say, v.dad.do, v.dad.pass, ...v.dad.traps.flatMap((t) => [t.kid, t.dad])].join('\n'));
/** 참이라고 내미는 글 — 오답 보기·아이 말(함정 kid)은 빼고 */
const truthText = (v) => fillC([...v.lesson.flatMap((p) => [p.say, p.check.ok, p.check.why]), v.rule, v.dad.goal, ...v.dad.say, v.dad.do, v.dad.pass, ...v.dad.traps.map((t) => t.dad)].join('\n'));
/** 셈식을 보는 글 블록 — 아이 말·오답 보기는 빼고 */
const blocksOf = (v) => [...v.lesson.flatMap((p) => [p.say, p.check.why]), v.rule, v.dad.goal, ...v.dad.say, v.dad.do, v.dad.pass, ...v.dad.traps.map((t) => t.dad)].map(fillC);
const FIGS = /\[[a-z]+ [^\]]+\]/g;
const FIX = '잘못 계산한 곳을 찾아 바르게 계산하면 얼마일까요?';

/** 원고에만 있는 문제 틀 (생성기 틀은 solveText가 읽는다) — 세로셈을 고치는 문제는 그림이 정말 틀린 셈인지도 본다 */
function solveContent(q) {
  const sv = solveText(q);
  if (sv.type !== 'unknown') return sv;
  let m;
  if (/^몫이 두 자리 수인 나눗셈은 어느 것일까요\?$/.test(q)) return { ...solveText('계산하지 않고 어림해요. 몫이 두 자리 수인 나눗셈은 어느 것일까요?') };
  if ((m = /^\[(vmul (\d+) (\d+) [^\]]+)\]\n\n(.+)$/.exec(q)) && m[4] === FIX) {
    const a = +m[2]; const b = +m[3]; const sp = /(?:(\d+)\+(\d+))?=(\d+)$/.exec(m[1]);
    assert.ok(figureSvg(m[1]).startsWith('<svg'), `${q}: 못 그리는 그림`);
    assert.notEqual(+sp[3], a * b, `${q}: 그림의 곱이 맞는 값`);
    assert.equal(tagsOf({ op: 'mul', a, b }, sp[3]).length, 1, `${q}: 그림의 곱 ${sp[3]}이 한 틀린 셈이 아니다`);
    return { type: 'fixMul', form: 'num', ans: P(a * b), f: { op: 'mul', a, b }, shown: sp[3] };
  }
  if ((m = /^\[(vdiv (\d+) (\d+) (\d+)(_?) (\d+))\]\n\n(.+)$/.exec(q)) && m[7] === FIX) {
    const a = +m[2]; const b = +m[3]; const shown = P(+m[4], +m[6]);
    assert.ok(figureSvg(m[1]).startsWith('<svg'), `${q}: 못 그리는 그림`);
    assert.ok(!eqP(shown, dm(a, b)), `${q}: 그림의 몫·나머지가 맞는 값`);
    assert.equal(tagsOf({ op: 'div', a, b }, show(shown)).length, 1, `${q}: 그림의 ${show(shown)}이 한 틀린 셈이 아니다`);
    return { type: 'fixDiv', form: 'rem', ans: dm(a, b), f: { op: 'div', a, b }, shown: String(m[6]) };
  }
  if ((m = /^(\d+) ÷ (\d+)의 몫을 (\d+)(?:으로|로) 하면 나머지가 (\d+)(?:이에요|예요)\. 바르게 계산하면 몫과 나머지는 얼마일까요\?$/.exec(q))) {
    const [a, b, k, rr] = m.slice(1).map(Number);
    assert.equal(a - b * k, rr, `${q}: 몫 ${k}일 때 나머지가 ${a - b * k}`);
    return { type: 'remFix', form: 'rem', ans: dm(a, b), f: { op: 'div', a, b } };
  }
  if ((m = /^어떤 나눗셈을 하고 확인했더니 (\d+) × (\d+) = (\d+), (\d+) \+ (\d+) = (\d+)(?:이었어요|였어요)\. (\d+) ÷ (\d+)의 몫과 나머지는 얼마일까요\?$/.exec(q))) {
    const [b, k, p1, p2, rr, a, a2, b2] = m.slice(1).map(Number);
    assert.ok(b * k === p1 && p1 === p2 && p2 + rr === a && a === a2 && b === b2 && rr < b, `${q}: 확인 식이 그 나눗셈과 맞지 않다`);
    return { type: 'checkEq', form: 'rem', ans: dm(a, b), f: { op: 'div', a, b } };
  }
  if ((m = /^해리는 (\d+) × (\d+)[을를] (\d+)(?:이라고|라고) 계산했어요\. 바르게 계산하면 얼마일까요\?$/.exec(q))) {
    const a = +m[1]; const b = +m[2];
    assert.notEqual(+m[3], a * b, q);
    return { type: 'harry', form: 'num', ans: P(a * b), f: { op: 'mul', a, b } };
  }
  if ((m = /^연필이 한 상자에 (\d+)자루씩 들어 있어요\. (\d+)상자에 들어 있는 연필은 모두 몇 자루일까요\?$/.exec(q))) return { type: 'pencil', form: 'num', ans: P(+m[1] * +m[2]), f: { op: 'mul', a: +m[1], b: +m[2] } };
  return sv;
}
/** 원고 확인 질문 하나씩 — { id, i, at, p, chs(보기), sv(따로 읽은 문제) } */
function* checksOf() {
  for (const id of IDS) {
    for (const [i, p] of CONTENT[id].lesson.entries()) {
      const chs = [{ text: fillC(p.check.ok), ok: true }, ...p.check.no.map((t) => ({ text: fillC(t), ok: false }))];
      yield { id, i, at: `${id}[${i}]`, p, chs, sv: solveContent(fillC(p.check.q)) };
    }
  }
}
const reEsc = (s) => String(s).replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
/** 까닭에 그 보기 이야기가 있나 — 수는 낱개로("45"가 "145" 속에서 잡히지 않게), 몫 … 나머지·식은 그대로 */
function mentions(why, text) {
  if (/^\d+$/.test(text)) return new RegExp(`(?<![\\d])${text}(?![\\d])`).test(why);
  return why.includes(text);
}

test('원고(muldiv.json)가 형식 검사를 통과한다 — 8칸이 사다리 순서대로 · 배움 4~5장·장마다 확인 질문(오답 둘)·아빠 카드(말 2개↑·함정 2개↑·통과 기준)', () => {
  assert.deepEqual(checkContent(CONTENT), []);
  assert.deepEqual(Object.keys(CONTENT).filter((k) => k !== '_'), IDS);
  for (const id of IDS) {
    const v = CONTENT[id];
    assert.ok(v.lesson.length >= 4 && v.lesson.length <= 5, `${id}: 배움 ${v.lesson.length}장`);
    assert.ok(v.lesson.every((p) => p.check && p.check.no.length === 2), `${id}: 장마다 확인 질문(오답 둘)`);
    assert.ok(v.dad.say.length >= 2 && v.dad.traps.length >= 2 && /통과/.test(v.dad.pass), `${id}: 아빠 카드`);
    assert.ok(!/\{/.test([v.dad.goal, ...v.dad.say, v.dad.do, v.dad.pass, ...v.dad.traps.flatMap((t) => [t.kid, t.dad])].join(' ')), `${id}: 아빠 카드에 자리표시`);
  }
  const L = lessonOf('md.div2d', 3, { ...OPTS, content: CONTENT });
  assert.equal(L.pages.length, CONTENT['md.div2d'].lesson.length);
  assert.ok(L.pages.every((p) => p.check && p.check.ok));
  assert.equal(L.rule, CONTENT['md.div2d'].rule);
  // 형식 검사 자체 — 값이 같은 보기("9"와 "9 … 0")를 잡는다
  const bad = JSON.parse(JSON.stringify(CONTENT)); bad['md.div2d'].lesson[0].check.no[0] = '3 … 0';
  assert.ok(checkContent(bad).some((x) => /값이 같은 보기/.test(x)), '3과 3 … 0은 같은 값');
});

test('★ 원고 확인 질문도 따로 풀어 대조 — 전부 읽히고, 맞는 보기는 정답 하나뿐 · 오답 하나하나가 **한** 틀린 생각에만 맞다 · 까닭은 정답·오답을 다 말한다 · 이름표 16개 다 쓰임', () => {
  let n = 0; const types = new Set(); const used = new Set();
  for (const { at, p, chs, sv } of checksOf()) {
    const q = fillC(p.check.q); const why = fillC(p.check.why);
    assert.notEqual(sv.type, 'unknown', `${at}: 못 읽는 확인 질문\n${q}`);
    types.add(sv.type);
    const right = sv.form === 'pick' ? chs.filter((x) => sv.ok(x.text)) : chs.filter((x) => eqP(pr(x.text), sv.ans));
    assert.ok(right.length === 1 && right[0].ok, `${at} (${sv.type}): 맞는 보기 ${right.map((x) => x.text).join(', ') || '없음'} — 따로 푼 답 ${sv.ans ? show(sv.ans) : ''}\n${q}`);
    if (sv.form !== 'pick') { const vals = chs.map((x) => show(pr(x.text))); assert.equal(new Set(vals).size, vals.length, `${at}: 값이 같은 보기 ${vals}`); }
    for (const x of chs.filter((c) => !c.ok)) {
      const tags = tagsOf(sv.f, x.text);
      assert.equal(tags.length, 1, `${at} (${sv.type}): 오답 "${x.text}"에 맞는 틀린 생각 ${tags.length}개 ${tags.join(' · ')}\n${q}`);
      used.add(tags[0]);
      assert.ok(mentions(why, x.text), `${at}: 까닭에 오답 "${x.text}" 이야기가 없다\n${why}`);
      n++;
    }
    assert.ok(mentions(why, p.check.ok), `${at}: 까닭에 정답 "${p.check.ok}"이 없다\n${why}`);
    if (sv.shown) assert.ok(mentions(why, sv.shown), `${at}: 까닭이 그림의 틀린 수 ${sv.shown}를 말하지 않는다\n${why}`);
  }
  assert.ok(n >= 66, `본 오답 ${n}`);
  assert.ok(types.size >= 16, `확인 질문 종류 ${types.size}: ${[...types]}`);
  assert.deepEqual(Object.values(TAGS).filter((t) => !used.has(t)), [], '원고 오답이 안 쓴 틀린 생각');
});

// 칸마다 그 칸의 문제
const CELL = {
  'md.mul10s': ['mul10', 'fixMul', 'gift'], 'md.mul2d': ['mul2', 'fixMul', 'harry'], 'md.div2d': ['div', 'remFix', 'checkEq'],
  'md.div10s': ['div', 'fixDiv', 'apple'], 'md.div3d1': ['div', 'fixDiv', 'paperShare'], 'md.div3d2': ['digits', 'div', 'fixDiv', 'marble'],
  'md.est': ['estNear', 'mul10', 'estDiv', 'digits'], 'md.apply': ['pencil', 'remMean', 'twoStep', 'marble'],
};
test('★ 원고 확인 질문은 칸마다 그 칸의 문제·그 칸의 수 · 보기 꼴이 문제와 맞다 (수는 "6420" · 나머지가 있으면 "4 … 5" · 고르기는 "384 ÷ 21")', () => {
  let n = 0;
  for (const { id, at, chs, sv } of checksOf()) {
    assert.ok(CELL[id].includes(sv.type), `${at}: 이 칸의 문제가 아니다 (${sv.type})`);
    for (const x of chs) assert.match(x.text, sv.form === 'pick' ? /^\d{3} ÷ \d{2}$/ : /^[1-9]\d*(?: … [1-9]\d*)?$/, `${at} (${sv.type}): 보기 꼴 "${x.text}"`);
    const { a, b } = sv.f; const q = sv.ans ? sv.ans.q : 0;
    if (id === 'md.mul10s') assert.ok(a >= 100 && a <= 999 && b % 10 === 0 && b < 100, at);
    if (id === 'md.mul2d') assert.ok(a >= 100 && a <= 999 && b >= 11 && b <= 99 && b % 10 !== 0, at);
    if (id === 'md.div2d') assert.ok(a <= 99 && b >= 10 && b <= 99 && q <= 9, at);
    if (id === 'md.div10s') assert.ok(a >= 100 && b % 10 === 0 && q <= 9, at);
    if (id === 'md.div3d1') assert.ok(a >= 100 && b % 10 !== 0 && q >= 2 && q <= 9, at);
    if (id === 'md.div3d2' && sv.form !== 'pick') assert.ok(a >= 100 && q >= 10 && q <= 99, at);
    n++;
  }
  assert.equal(n, IDS.reduce((s, id) => s + CONTENT[id].lesson.length, 0));
});

test('★ 원고의 셈식 — 전부 맞다("몫 … 나머지"·확인 식까지) · 한 줄에 "="는 둘까지 · 배움 글·까닭의 셈식 줄은 폰 폭(약 22글자)에 한 줄', () => {
  const em = (line) => [...line].reduce((a, ch) => a + (/[가-힣ㄱ-ㅎ]/.test(ch) ? 1 : 0.6), 0);
  let n = 0; let lines = 0; let rem = 0;
  for (const id of IDS) {
    const kidText = new Set(CONTENT[id].lesson.flatMap((p) => [p.say, p.check.why]).map(fillC));
    for (const b of blocksOf(CONTENT[id])) {
      const t = b.replace(FIGS, '').replace(/\*\*/g, '');
      for (const line of t.split('\n')) {
        assert.ok((line.match(/ = /g) || []).length <= 2, `${id}: 한 줄에 = 셋 이상 "${line}"`);
        if (/ = /.test(line) && kidText.has(b)) { assert.ok(em(line) <= 22, `${id}: 셈식 줄이 폰에서 두 줄로 끊긴다 (${em(line).toFixed(1)}글자) "${line}"`); lines++; }
      }
      for (const e of eqChains(t)) { assert.ok(e.ok, `${id}: ${e.a} = ${e.b}`); n++; if (/…/.test(e.b)) rem++; }
    }
  }
  assert.ok(n >= 150 && lines >= 100 && rem >= 15, `본 셈식 ${n} · 줄 ${lines} · 몫 … 나머지 ${rem}`);
});

/** 아빠 카드 통과 기준의 문제 — 생성기·원고 틀이거나, 말로 묻는 꼴 */
function solvePass(q) {
  const sv = solveContent(q);
  if (sv.type !== 'unknown') return sv.ans;
  let m;
  if ((m = /^(\d+) ([×÷]) (\d+)[은는] 얼마일까요\?$/.exec(q))) return m[2] === '×' ? P(+m[1] * +m[3]) : dm(+m[1], +m[3]);
  if ((m = /^(\d+) ÷ (\d+)의 몫과 나머지는 얼마일까요\?$/.exec(q))) return dm(+m[1], +m[2]);
  if ((m = /^(\d+) ÷ (\d+)의 몫을 (\d+) ÷ (\d+)(?:으로|로) 어림하면 얼마일까요\?$/.exec(q))) {
    const [a, b, A, B] = m.slice(1).map(Number);
    assert.ok(A === Math.round(a / 10) * 10 && B === Math.round(b / 10) * 10 && A % B === 0, q);
    return P(A / B);
  }
  if ((m = /^구슬 (\d+)개를 한 봉지에 (\d+)개씩 담으면 몇 봉지가 되고 몇 개가 남을까요\?$/.exec(q))) return dm(+m[1], +m[2]);
  if ((m = /^사탕 (\d+)개 중 (\d+)개를 먹고 남은 사탕을 (\d+)명에게 똑같이 나누면 한 명에게 몇 개씩 줄 수 있을까요\?$/.exec(q))) {
    const [a, s, b] = m.slice(1).map(Number); assert.equal((a - s) % b, 0, q); return P((a - s) / b);
  }
  return null;
}
test('★ 원고 아빠 카드: 통과 기준의 문제를 따로 풀어 괄호 속 답과 대조', () => {
  let n = 0;
  for (const id of IDS) {
    const ps = fillC(CONTENT[id].dad.pass);
    const qs = [...ps.matchAll(/"([^"]+)"/g)].map((m) => m[1]);
    const ans = ((/\(([^)]+)\)/.exec(ps.replace(/"[^"]+"/g, '')) || [])[1] || '').split(' · ');
    assert.ok(qs.length >= 2, `${id}: 통과 기준의 문제 ${qs.length}개 "${ps}"`);
    assert.equal(ans.length, qs.length, `${id}: 문제 ${qs.length}개 · 답 ${ans.length}개`);
    qs.forEach((q, k) => {
      const a = solvePass(q);
      assert.ok(a && a.q >= 1, `${id}: 못 읽는 통과 기준 문제 "${q}"`);
      assert.ok(eqP(pr(ans[k]), a), `${id}: "${q}"의 답 ${ans[k]} ≠ ${show(a)}`);
      n++;
    });
  }
  assert.ok(n >= 16, `본 통과 기준 문제 ${n}`);
});

test('🎨 원고의 그림: 세로셈만 · 모두 그려진다 · 배움 글의 그림은 그 글에 같은 셈("143 × …"·"162 ÷ 18") · 아이가 쓴 나머지·합은 글이 말한다 · 고치는 문제의 그림은 까닭에 그 셈', () => {
  let n = 0;
  for (const id of IDS) for (const [i, pg] of CONTENT[id].lesson.entries()) {
    for (const [src, txt] of [[pg.say, pg.say], [pg.check.q, pg.check.why]]) {
      for (const m of fillC(src).matchAll(/\[(v(mul|div) (\d+) (\d+)([^\]]*))\]/g)) {
        const at = `${id} ${i + 1}장: [${m[1]}]`;
        assert.ok(figureSvg(m[1]).startsWith('<svg'), `${at}: 못 그림`);
        const plain = fillC(txt).replace(FIGS, '');
        assert.ok(plain.includes(`${m[3]} ${m[2] === 'mul' ? '×' : '÷'}`), `${at}: 글에 ${m[3]} ${m[2] === 'mul' ? '×' : '÷'} … 이 없다`);
        if (m[2] === 'div' && m[5].trim()) { const R = m[5].trim().split(' ')[1]; assert.ok(new RegExp(`(?<!\\d)${R}(?!\\d)`).test(plain), `${at}: 글이 맨 아래 수 ${R}를 말하지 않는다`); }
        if (m[2] === 'mul' && /=/.test(m[5])) { const S = /=(\d+)/.exec(m[5])[1]; assert.ok(new RegExp(`(?<!\\d)${S}(?!\\d)`).test(plain), `${at}: 글이 그림의 곱 ${S}를 말하지 않는다`); }
        n++;
      }
    }
    assert.ok(!/\[(?!v(?:mul|div) )[a-z]+ /.test(pg.say + pg.check.q), `${id} ${i + 1}장: 세로셈 말고 다른 그림`);
  }
  assert.ok(n >= 16, `본 그림 ${n}`);
});

test('★ 원고의 조사·틀린 말 (배움 글·확인 질문·아빠 카드 전부) — 수 뒤는 읽는 소리 · 단위 글자 뒤 조사 없음 · " … " 줄임표 · "검산·반올림"은 안 쓴다 · 참말 금지', () => {
  const BAT = new Set(['0', '1', '3', '6', '7', '8']);
  const PAIRS = [['을', '를'], ['은', '는'], ['이', '가'], ['과', '와'], ['이에요', '예요'], ['이었어요', '였어요'], ['이라고', '라고']];
  const END = '(?=[\\s.,!?)—"·]|$)';
  let hitN = 0;
  for (const id of IDS) {
    const all = contentText(CONTENT[id]).replace(/\*\*/g, '').replace(FIGS, '');
    for (const [wb, nb] of PAIRS) for (const m of all.matchAll(new RegExp(`(?<![\\d/])(\\d+)(${wb}|${nb})${END}`, 'g'))) { assert.equal(m[2], BAT.has(m[1].slice(-1)) ? wb : nb, `${id}: "…${m[1]}${m[2]}"`); hitN++; }
    for (const m of all.matchAll(/(?<![\d/])(\d+)(으로|로)(?=[\s.,"]|$)/g)) assert.equal(m[2], ['1', '7', '8'].includes(m[1].slice(-1)) ? '로' : BAT.has(m[1].slice(-1)) ? '으로' : '로', `${id}: "…${m[1]}${m[2]}"`);
    assert.ok(!/-\d|\d-/.test(all), `${id}: ASCII 빼기`);
    assert.ok(!/\d…|…\d|\.\.\./.test(all), `${id}: 줄임표는 " … "로`);
    const up = UNIT_JOSA.exec(all); assert.ok(!up, `${id}: 단위 글자 바로 뒤 조사 "${up && up[0]}"`);
    assert.ok(!/검산|반올림/.test(all), `${id}: 교과서 본문에 없는 말 — ${(all.match(/검산|반올림/) || [])[0]}`);
    const truth = truthText(CONTENT[id]).replace(/\*\*/g, '').replace(FIGS, '');
    for (const [re, why] of BAD) assert.ok(!re.test(truth), `${id}: ${why} — ${(truth.match(re) || [])[0]}`);
  }
  assert.ok(hitN >= 150, `실제로 본 조사 ${hitN}`);
});

// 원고 변이 검사가 찾음 — "450은 461보다 크고"처럼 수의 크기 말을 틀리게 바꿔도 지나갔다
test('★ 원고의 비교 말은 수와 맞다 — "38은 21보다 커요" · "31이 34보다 작고" · "나누는 수 33과 같아요" (배움 글·정답·까닭·아빠 카드)', () => {
  let n = 0;
  for (const id of IDS) {
    const truth = truthText(CONTENT[id]).replace(/\*\*/g, '').replace(FIGS, '');
    // 식의 끝 수("143 × 20은")는 그 수가 아니라 식이 주어 — 연산 기호 바로 뒤의 수는 빼고 본다
    for (const m of truth.matchAll(/(?<![×÷+−] |\d)(\d+)(?:은|는|이|가) (\d+)보다 (작|커|크거나 같|크)/g)) {
      const x = +m[1]; const y = +m[2];
      assert.ok(m[3] === '작' ? x < y : m[3] === '크거나 같' ? x >= y : x > y, `${id}: "${m[0]}"`); n++;
    }
    for (const m of truth.matchAll(/(\d+)(?:은|는|이|가) 나누는 수 (\d+)(?:와|과) 같아요/g)) { assert.equal(+m[1], +m[2], `${id}: "${m[0]}"`); n++; }
  }
  assert.ok(n >= 50, `본 비교 말 ${n}`);
});

test('원고는 배포 파일 검사(check.mjs)에도 걸린다 — muldiv.json → mathmuldiv.js의 checkContent', () => {
  const src = readFileSync(new URL('../tools/check.mjs', import.meta.url), 'utf8');
  assert.ok(src.includes("'coach/math/muldiv.json': '../js/mathmuldiv.js'"));
});

// ───────────────────── 3단계: 화면 연결 ─────────────────────

test('화면 연결 (3단계): STEMS.muldiv(AA)는 이 생성기·원고를 쓰고 Y 큰 수 다음·B 혼합계산 바로 앞 · 앱 셸이 둘 다 들고 간다 · 사다리 안내에 틀린 말 없음 · 숫자판은 ± 없이 [몫 … 나머지] · 세로셈을 📊·❓가 안다', async () => {
  const { STEMS, STEM_ORDER, stemOf } = await import('../js/mathprog.js');
  const S = STEMS.muldiv;
  assert.equal(S.key, 'muldiv');
  assert.equal(S.code, 'AA');
  assert.equal(S.label, '곱셈과 나눗셈 줄기', '줄기 고르기·📊에 보이는 이름');
  const at = STEM_ORDER.indexOf('muldiv');
  assert.deepEqual(STEM_ORDER.slice(at - 1, at + 2), ['bignum', 'muldiv', 'mixed'], 'Y 큰 수 다음·B 혼합계산 바로 앞 (4-1 곱셈과 나눗셈 — 큰 수의 자릿값 위에, 혼합계산 전에)');
  assert.equal(S.list, MULDIV);
  assert.equal(S.gen.makeQuestion, makeQuestion);
  assert.equal(S.gen.lessonOf, lessonOf, '📚 배움은 이 생성기의 lessonOf');
  assert.equal(S.lesson, true);
  assert.equal(S.file, './coach/math/muldiv.json');
  assert.equal(S.range, '초4');
  assert.ok(IDS.every((id) => stemOf(id) === S), '모든 칸이 AA 줄기로 찾아진다');
  assert.match(S.pick, /10배/);
  const guide = `${S.pick} ${S.intro}`;
  for (const [re, why] of BAD) assert.ok(!re.test(guide), `안내에 ${why}`);
  assert.ok(!/검산|반올림/.test(guide), '안내에 교과서 본문에 없는 말');
  // 앱이 가져오는 원고(S.file)로 배움 장이 그대로 만들어진다
  const content = JSON.parse(readFileSync(new URL(S.file.replace('./', '../'), import.meta.url), 'utf8'));
  for (const id of IDS) assert.equal(S.gen.lessonOf(id, 5, { ...OPTS, content }).pages.length, content[id].lesson.length, `${id}: 원고 배움 장`);
  const sw = readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
  for (const f of ['./js/mathmuldiv.js', './coach/math/muldiv.json']) assert.ok(sw.includes(`'${f}'`), `APP_SHELL에 ${f}`);
  // 숫자판은 이 줄기 열쇠로 — ± 없음 · 나머지가 있는 보기가 있으면 [수] [몫 … 나머지]
  let rem = 0;
  for (let s = 1; s <= 60; s++) {
    const q = makeQuestion('md.div3d1', 'calc', s, OPTS); const spec = padSpec(q, S.key);
    assert.ok(spec && spec.signed === false, `#${s}: 숫자판 ± 없음`);
    if (q.choices.some((x) => /…/.test(x.text))) { assert.deepEqual(spec.modes, ['num', 'rem'], `#${s}`); rem++; }
  }
  assert.ok(rem > 40, `몫 … 나머지 칸이 뜬 AA5 문항 ${rem}`);
  // 📊 펼친 문제 글(figText)·❓ 복사문·📊 답장 안내 — 세로셈을 안다, 안내의 예는 그대로 그려진다
  assert.equal(figText('앞 [vmul 123 24] 뒤', true), '앞 (곱셈 세로셈) 뒤');
  assert.equal(figText('앞 [vdiv 527 16] 뒤', true), '앞 (나눗셈 세로셈) 뒤');
  const ask = readFileSync(new URL('../js/mathask.js', import.meta.url), 'utf8');
  const stats = readFileSync(new URL('../js/stats.js', import.meta.url), 'utf8');
  for (const ex of ['[vmul 123 24]', '[vdiv 527 16]']) {
    assert.ok(ask.includes(ex) && stats.includes(ex), `❓ 복사문·📊 답장 안내에 ${ex} 예`);
    assert.ok(renderFigures(ex).startsWith('<svg'), `안내의 예 ${ex}도 그려진다`);
  }
});

// 🔍 Codex 42차 #4 — 검수 페이지가 "[4수01-05] 나누는 수가 두 자리 수인 나눗셈"이라 썼다. 2022 [4수01-05]는 나눗셈의 의미·곱셈과 나눗셈의 관계,
//   두 자리 수로 나누는 나눗셈은 [4수01-07] — 번호 바로 뒤에 쓴 말이 그 번호의 뜻인지 본다
test('검수 페이지의 성취기준 번호 = 그 뜻 (2022 [4수01-04] 곱셈 · [4수01-05] 나눗셈의 의미 · [4수01-07] 나누는 수가 두 자리 수인 나눗셈 · [4수01-08] 어림셈)', () => {
  const MEAN = { '4수01-04': /곱셈/, '4수01-05': /나눗셈의 의미/, '4수01-07': /나누는 수가 두 자리 수인 나눗셈/, '4수01-08': /어림/ };
  const src = readFileSync(new URL('../tools/mathmuldiv.mjs', import.meta.url), 'utf8');
  const seen = new Set();
  for (const m of src.matchAll(/\[(4수\d\d-\d\d)\]([^[<]*)/g)) {
    const said = m[2].split(' · ')[0];
    if (!said.trim()) continue; // "[4수01-07]·[4수01-08]"처럼 번호만 이어 쓴 곳
    assert.ok(MEAN[m[1]], `모르는 번호 [${m[1]}]`);
    assert.match(said, MEAN[m[1]], `[${m[1]}] 뒤의 말 "${said.trim()}"`);
    seen.add(m[1]);
  }
  assert.deepEqual([...seen].sort(), Object.keys(MEAN), `뜻을 적은 번호 ${[...seen]}`);
});
