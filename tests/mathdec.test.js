// 🔢 C 소수 줄기 생성기 테스트: node --test tests/mathdec.test.js
//
// ★ 핵심은 **독립 검산**이다 — 정답·오개념 오답·보여 주는 틀린 계산을 이 파일의 **따로 만든** 계산기로
//   다시 풀어 대조한다. 생성기가 답을 셈한 코드로 검산하면 생성기의 셈 오류를 못 잡는다.
// ★ 씨앗은 개념마다 **수천 개** — 200개로 통과한 생성기를 Codex가 10,000개에서 깬 적이 있다 (메모: test-seed-breadth).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  DECIMAL, TAGS, makeQuestion, makeRound, conceptById, ladder, placeFrom, diagnosticSet, lessonOf,
  valueOf, D, decText, checkContent, gradeLabel,
} from '../js/mathdec.js';

const OPTS = { names: ['피카츄', '리자몽', '개굴닌자'], me: '진우', worlds: { pokemon: [], toystory: [], minions: [], moana: [] } };
// 평소 1,500 · 넓게 볼 때는 DEC_SEEDS=20000 node --test tests/mathdec.test.js
const SEEDS = Number(process.env.DEC_SEEDS) || 1500;

// ── 독립 계산기: 정확한 분수 산술 (소수·분수·사칙·괄호) ──
const g = (a, b) => (b ? g(b, a % b) : Math.abs(a));
const Q = (n, d = 1) => { const s = d < 0 ? -1 : 1; const k = g(Math.abs(n), Math.abs(d)) || 1; return { n: (s * n) / k, d: (s * d) / k }; };
const add = (a, b) => Q(a.n * b.d + b.n * a.d, a.d * b.d);
const sub = (a, b) => Q(a.n * b.d - b.n * a.d, a.d * b.d);
const mul = (a, b) => Q(a.n * b.n, a.d * b.d);
const div = (a, b) => Q(a.n * b.d, a.d * b.n);
const num = (q) => q.n / q.d;
const eq = (a, b) => Math.abs(a - b) < 1e-9;

function evalExpr(src) {
  const s = String(src).replace(/−/g, '-').replace(/\s+/g, '');
  let i = 0;
  const peek = () => s[i];
  function number() {
    const m = /^\d+(\.\d+)?/.exec(s.slice(i));
    if (!m) throw new Error(`숫자가 아님: ${s.slice(i)}`);
    i += m[0].length;
    let v;
    if (m[1]) { const k = m[0].split('.')[1].length; v = Q(Number(m[0].replace('.', '')), 10 ** k); } else v = Q(Number(m[0]));
    if (s[i] === '/' && /\d/.test(s[i + 1] || '')) { i++; const m2 = /^\d+/.exec(s.slice(i)); i += m2[0].length; v = Q(v.n, v.d * Number(m2[0])); }
    return v;
  }
  function primary() {
    if (peek() === '(') { i++; const v = expr(); if (peek() !== ')') throw new Error(`괄호: ${s}`); i++; return v; }
    return number();
  }
  function term() {
    let v = primary();
    while (peek() === '×' || peek() === '÷') { const op = s[i++]; const rhs = primary(); v = op === '×' ? mul(v, rhs) : div(v, rhs); }
    return v;
  }
  function expr() {
    let v = term();
    while (peek() === '+' || peek() === '-') { const op = s[i++]; const rhs = term(); v = op === '+' ? add(v, rhs) : sub(v, rhs); }
    return v;
  }
  const out = expr();
  if (i !== s.length) throw new Error(`다 못 읽음: ${s}`);
  return out;
}
const val = (t) => num(evalExpr(t));

// ── 독립 흉내: 아이가 하는 틀린 계산 (문자열로, 생성기와 다른 방법으로) ──
const fracLen = (t) => (String(t).split('.')[1] || '').length;
const digitsOnly = (t) => Number(String(t).replace('.', ''));
/** 끝자리 맞춤: 소수점을 떼고 오른쪽 끝을 맞춰 셈 → 긴 쪽 자리에 소수점 */
const simAlignEnd = (a, b, op) => (op === '+' ? digitsOnly(a) + digitsOnly(b) : digitsOnly(a) - digitsOnly(b)) / 10 ** Math.max(fracLen(a), fracLen(b));
/** 소수점에 맞춘 두 줄 (빈 자리는 0) */
function columns(a, b) {
  const P = Math.max(fracLen(a), fracLen(b));
  const pad = (t) => { const [w, f = ''] = String(t).split('.'); return w + f.padEnd(P, '0'); };
  const A = pad(a); const B = pad(b); const L = Math.max(A.length, B.length);
  return [A.padStart(L, '0'), B.padStart(L, '0'), P];
}
/** 받아올림 없이 — 맨 앞 칸만 합을 그대로, 나머지 칸은 일의 자리만 */
function simNoCarry(a, b) {
  const [A, B, P] = columns(a, b);
  const cols = [...A].map((ch, k) => Number(ch) + Number(B[k]));
  const s = cols.map((x, k) => (k === 0 ? String(x) : String(x % 10))).join('');
  return Number(s) / 10 ** P;
}
/** 칸마다 큰 숫자 − 작은 숫자 */
function simSwapSub(a, b) {
  const [A, B, P] = columns(a, b);
  return Number([...A].map((ch, k) => String(Math.abs(Number(ch) - Number(B[k])))).join('')) / 10 ** P;
}
/** 자릿값 — 소수점 아래 몇째 자리인지로 */
function placeValue(numTxt, digit) {
  const f = String(numTxt).split('.')[1] || '';
  const k = f.indexOf(String(digit));
  assert.ok(k >= 0 && f.indexOf(String(digit), k + 1) < 0, `${numTxt}에서 ${digit}가 하나여야 한다`);
  return Number(digit) / 10 ** (k + 1);
}
/** 한글 읽기 — 자연수 부분은 "천·백·십", 소수점 아래는 한 글자씩 */
const NM = '영일이삼사오육칠팔구';
function koRead(t) {
  const [w, f] = String(t).split('.');
  const n = Number(w);
  let head = '';
  if (n === 0) head = '영';
  else {
    const ds = String(n).split('').map(Number);
    const units = ['천', '백', '십', ''].slice(4 - ds.length);
    ds.forEach((d, k) => { if (!d) return; head += (d === 1 && units[k] ? '' : NM[d]) + units[k]; });
  }
  return f ? `${head} 점 ${[...f].map((c) => NM[Number(c)]).join('')}` : head;
}

// ── ⭐ 4학년 활용(dec.apply, v270) 문제 글 읽기 — 생성기의 식(probe)을 쓰지 않고 글의 수로 다시 푼다 ──
const NUM = '(\\d+(?:\\.\\d+)?)';
const RQ = (t) => evalExpr(t);
/** 세 숫자 카드로 만들 수 있는 소수 두 자리 수 전부 (자리 바꿈을 모두 늘어놓아 가장 큰·작은 수를 따로 찾는다) */
function cardNumbers(ds) {
  const out = [];
  for (const i of [0, 1, 2]) for (const j of [0, 1, 2]) for (const k of [0, 1, 2]) if (new Set([i, j, k]).size === 3) out.push(RQ(`${ds[i]}.${ds[j]}${ds[k]}`));
  return out;
}
/** 문제 글 → { kind, ans(분수 값), n(글의 수들) } · 못 읽으면 null */
function solveApply(q) {
  let m;
  if ((m = new RegExp(`^어떤 수에 ${NUM}[을를] 더해야 할 것을 잘못하여 ${NUM}[을를] 더했더니 ${NUM}[이가] 되었어요\\. 바르게 계산하면 얼마일까요\\?`).exec(q))) {
    const [a, b, W] = [m[1], m[2], m[3]].map(RQ); const x = sub(W, b); return { kind: 'placeAdd', ans: add(x, a), n: { a, b, W, x } };
  }
  if ((m = new RegExp(`^어떤 수에서 ${NUM}[을를] 빼야 할 것을 잘못하여 ${NUM}[을를] 뺐더니 ${NUM}[이가] 되었어요\\. 바르게 계산하면 얼마일까요\\?`).exec(q))) {
    const [a, b, W] = [m[1], m[2], m[3]].map(RQ); const x = add(W, b); return { kind: 'placeSub', ans: sub(x, a), n: { a, b, W, x } };
  }
  if ((m = new RegExp(`^빈 바구니의 무게는 (\\d+) g이에요\\. 사과를 담은 바구니의 무게가 ${NUM} kg일 때, 사과의 무게는 몇 kg일까요\\?`).exec(q))) {
    const G = RQ(m[1]); const K = RQ(m[2]); return { kind: 'kg', ans: sub(K, div(G, Q(1000))), n: { G, K } };
  }
  if ((m = new RegExp(`^리본 ${NUM} m에 (\\d+) cm를 겹치지 않게 더 이어 붙였어요\\. 이어 붙인 리본은 모두 몇 m일까요\\?`).exec(q))) {
    const L = RQ(m[1]); const cm = RQ(m[2]); return { kind: 'cm', ans: add(L, div(cm, Q(100))), n: { L, cm } };
  }
  if ((m = new RegExp(`^어떤 수의 10배가 ${NUM}일 때, 어떤 수보다 ${NUM} 큰 수는 얼마일까요\\?`).exec(q))) {
    const T10 = RQ(m[1]); const cc = RQ(m[2]); return { kind: 'ten', ans: add(div(T10, Q(10)), cc), n: { T10, cc } };
  }
  if ((m = new RegExp(`^어떤 수의 1/10이 ${NUM}일 때, 어떤 수에서 ${NUM}[을를] 뺀 수는 얼마일까요\\?`).exec(q))) {
    const s = RQ(m[1]); const cc = RQ(m[2]); return { kind: 'tenth', ans: sub(mul(s, Q(10)), cc), n: { s, cc } };
  }
  if ((m = /^수 카드 (\d), (\d), (\d)[을를] 한 번씩 모두 써서 소수 두 자리 수를 만들어요\. 만들 수 있는 가장 큰 수와 가장 작은 수의 (합|차)[은는] 얼마일까요\?/.exec(q))) {
    const all = cardNumbers([m[1], m[2], m[3]]);
    const big = all.reduce((x, y) => (num(y) > num(x) ? y : x)); const small = all.reduce((x, y) => (num(y) < num(x) ? y : x));
    const op = m[4] === '합' ? add : sub;
    return { kind: m[4] === '합' ? 'cardSum' : 'cardDiff', ans: op(big, small), n: { all, big, small, op } };
  }
  return null;
}
/** 활용 오답 이름표의 뜻 — 그 틀린 생각을 글의 수로 다시 한다 */
function applyTagHolds(sv, tag, text) {
  const v = valueOf(text); const is = (w) => v !== null && eq(v, num(w)); const { n } = sv;
  switch (sv.kind) {
    case 'placeAdd': return (tag === TAGS.stopMid && is(n.x)) || (tag === TAGS.fromWrong && is(add(n.W, n.a)));
    case 'placeSub': return (tag === TAGS.stopMid && is(n.x)) || (tag === TAGS.fromWrong && is(sub(n.W, n.a)));
    case 'kg': return (tag === TAGS.unitShift && (is(sub(n.K, div(n.G, Q(10000)))) || is(sub(n.K, div(n.G, Q(100)))))) || (tag === TAGS.addInstead && is(add(n.K, div(n.G, Q(1000)))));
    case 'cm': return (tag === TAGS.noUnit && is(add(n.L, n.cm))) || (tag === TAGS.unitShift && (is(add(n.L, div(n.cm, Q(10)))) || is(add(n.L, div(n.cm, Q(1000))))));
    case 'ten': return (tag === TAGS.tenAsIs && is(add(n.T10, n.cc))) || (tag === TAGS.moves && is(add(div(n.T10, Q(100)), n.cc)));
    case 'tenth': return (tag === TAGS.tenAsIs && is(sub(n.s, n.cc))) || (tag === TAGS.moves && is(sub(mul(n.s, Q(100)), n.cc)));
    case 'cardSum': case 'cardDiff': {
      const others = (best) => n.all.filter((y) => !eq(num(y), num(best)));
      if (tag === TAGS.bigWrong) return others(n.big).some((y) => is(n.op(y, n.small)));
      if (tag === TAGS.smallWrong) return others(n.small).some((y) => is(n.op(n.big, y)));
      return false;
    }
    default: return false;
  }
}

test('독립 계산기·흉내 자체 점검 (이게 틀리면 검산이 의미 없다)', () => {
  assert.equal(val('0.1 + 0.2'), 0.3);
  assert.equal(val('3.46 + 0.8'), 4.26);
  assert.equal(val('5 − 1.37'), 3.63);
  assert.equal(val('0.3 × 0.2'), 0.06);
  assert.equal(val('2.4 ÷ 0.08'), 30);
  assert.equal(val('0.36 × 10 ÷ 100'), 0.036);
  assert.equal(val('3/4'), 0.75);
  assert.ok(eq(simAlignEnd('3.46', '0.8', '+'), 3.54));
  assert.ok(eq(simAlignEnd('7.63', '2.4', '-'), 7.39));
  assert.ok(eq(simNoCarry('2.67', '1.58'), 3.15));
  assert.ok(eq(simNoCarry('7.5', '4.8'), 11.3));
  assert.ok(eq(simSwapSub('4.2', '1.35'), 3.15));
  assert.ok(eq(simSwapSub('5', '1.37'), 4.37));
  assert.equal(placeValue('3.457', 5), 0.05);
  assert.equal(koRead('3.07'), '삼 점 영칠');
  assert.equal(koRead('12.45'), '십이 점 사오');
  assert.equal(koRead('307'), '삼백칠');
  assert.equal(koRead('1045'), '천사십오');
});

test('소수 글자: 끝의 0을 지우고, 부동소수 찌꺼기가 없다', () => {
  assert.equal(decText(4260, 3), '4.26');
  assert.equal(decText(30, 1), '3');
  assert.equal(decText(6, 2), '0.06');
  assert.equal(decText(5, 0), '5');
  assert.equal(decText(-1, 1), '');
  assert.deepEqual(D('3.46'), { u: 346, p: 2 });
  assert.deepEqual(D('5'), { u: 5, p: 0 });
  assert.equal(D('abc'), null);
});

test('사다리: 11칸, id·이름·학년·needs가 이어진다 (5학년 첫 칸은 뺄셈 칸 — ⭐ 4학년 활용이 길을 막지 않는다, v270)', () => {
  assert.equal(DECIMAL.length, 11);
  const ids = DECIMAL.map((c) => c.id);
  assert.equal(new Set(ids).size, 11);
  for (const [k, c] of DECIMAL.entries()) {
    assert.ok(/^dec\./.test(c.id), c.id);
    assert.ok(c.name && c.idea, c.id);
    assert.ok([4, 5, 6].includes(c.grade), `${c.id} 학년`);
    assert.deepEqual(c.needs, k ? [c.id === 'dec.frac' ? 'dec.sub' : ids[k - 1]] : [], `${c.id}: 바로 앞 칸이 선행`);
  }
  assert.deepEqual(DECIMAL.map((c) => c.grade), [4, 4, 4, 4, 4, 4, 5, 5, 5, 6, 6]);
  assert.equal(ids[5], 'dec.apply');
  assert.match(DECIMAL[5].name, /^⭐ /);
  assert.equal(gradeLabel(4), '초4');
});

/** 이 문항의 정답이 맞는지 — probe 종류에 따라 독립 계산기로 */
function checkOk(c, s, q) {
  const ok = q.choices.find((x) => x.ok);
  const where = `${c.id} seed ${s}: "${q.q.replace(/\n/g, ' ')}"`;
  const p = q.probe || {};
  if (p.calc) {
    const want = val(p.calc);
    const got = valueOf(ok.text);
    assert.ok(got !== null && eq(got, want), `${where} — ${p.calc} = ${want} 인데 정답 보기는 ${ok.text}`);
    if (p.reduced) { const m = /^(\d+)\/(\d+)$/.exec(ok.text); assert.ok(m && g(Number(m[1]), Number(m[2])) === 1, `${where} — 기약분수가 아님 ${ok.text}`); }
  } else if (p.place) {
    assert.ok(eq(valueOf(ok.text), placeValue(p.place.num, p.place.digit)), `${where} — 자릿값이 ${ok.text} 가 아니다`);
  } else if (p.read) {
    assert.equal(ok.text, koRead(p.read), `${where} — 읽기`);
  } else if (p.max || p.min) {
    const vs = q.choices.map((x) => valueOf(x.text));
    const ext = p.max ? Math.max(...vs) : Math.min(...vs);
    assert.ok(eq(valueOf(ok.text), ext), `${where} — ${p.max ? '가장 큰' : '가장 작은'} 수가 아니다`);
    assert.equal(vs.filter((v) => eq(v, ext)).length, 1, `${where} — 답이 둘`);
  } else if (p.cmpBase) {
    const v = val(p.cmpBase.calc); const b = val(p.cmpBase.base);
    const want = v < b ? '처음 수보다 작아져요' : v > b ? '처음 수보다 커져요' : '처음 수와 같아요';
    assert.equal(ok.text, want, `${where} — ${p.cmpBase.calc} = ${v}`);
  } else if (p.apply) {
    // ⭐ 4학년 활용 — probe의 식이 아니라 **문제 글**을 따로 읽어 푼다 (solveApply)
    const sv = solveApply(q.q);
    assert.ok(sv, `${where} — 못 읽는 활용 문제`);
    assert.equal(sv.kind, p.apply, `${where} — 틀`);
    assert.ok(eq(valueOf(ok.text), num(sv.ans)), `${where} — 따로 푼 답 ${num(sv.ans)} 인데 정답 보기는 ${ok.text}`);
  } else {
    assert.fail(`${where} — 검산 재료(probe)가 없다`);
  }
}

test('★ 독립 검산: ① 문항의 정답이 따로 푼 값과 같다 (개념마다 1,500 씨앗)', () => {
  let n = 0;
  for (const c of DECIMAL) {
    for (let s = 1; s <= SEEDS; s++) {
      const q = makeQuestion(c.id, 'calc', s * 7919, OPTS);
      assert.ok(q, `${c.id} seed ${s}: 문항이 없다`);
      checkOk(c, s, q);
      n++;
    }
  }
  assert.equal(n, DECIMAL.length * SEEDS);
});

/** 보기 글자가 "수"인가 — 소수·분수·자연수만 */
const NUMERIC = /^(\d+(\.\d+)?|\d+\/\d+)$/;

test('★ 보기: 정답 하나, 글자·값 겹침 없음, 나오면 안 되는 글자 없음', () => {
  for (const c of DECIMAL) {
    for (let s = 1; s <= SEEDS; s++) {
      for (const kind of ['calc', 'misread']) {
        const q = makeQuestion(c.id, kind, s * 104729, OPTS);
        const where = `${c.id}/${kind} seed ${s}`;
        assert.equal(q.choices.filter((x) => x.ok).length, 1, `${where}: 정답이 하나`);
        assert.ok(q.choices.length >= 3, `${where}: 보기 3개 이상 (${q.choices.map((x) => x.text).join(' / ')})`);
        const texts = q.choices.map((x) => String(x.text).trim());
        assert.equal(new Set(texts).size, texts.length, `${where}: 글자가 같은 보기`);
        const nums = q.choices.filter((x) => NUMERIC.test(x.text));
        for (let a = 0; a < nums.length; a++) {
          for (let b = a + 1; b < nums.length; b++) {
            assert.ok(!eq(valueOf(nums[a].text), valueOf(nums[b].text)), `${where}: 값이 같은 보기 ${nums[a].text} / ${nums[b].text}`);
          }
        }
        for (const ch of q.choices) {
          const t = String(ch.text);
          assert.ok(t && !/undefined|NaN|null|Infinity|e[-+]\d/.test(t), `${where}: 이상한 보기 "${t}"`);
          assert.ok(!ch.ok || ch.tag === undefined, `${where}: 정답에 이름표`);
          assert.ok(ch.ok || ch.tag, `${where}: 오답 "${t}"에 이름표가 없다`);
          if (!NUMERIC.test(t)) continue;
          assert.ok(!/^0\d/.test(t), `${where}: 앞에 0이 붙은 수 "${t}"`);
          // 끝의 0 — "0을 붙임" 오답(2.350)만 일부러 남긴다
          if (/\.\d*0$/.test(t)) assert.equal(ch.tag, TAGS.padZero, `${where}: 끝에 0이 남은 수 "${t}"`);
          assert.ok(fracLen(t) <= 4, `${where}: 소수 자리가 너무 긺 "${t}"`);
        }
        const all = `${q.q} ${q.expr} ${JSON.stringify(q.solve)}`;
        assert.ok(!/undefined|NaN|null|\{(me|mon)/.test(all), `${where}: 글에 새는 것이 있다 — ${all.slice(0, 200)}`);
      }
    }
  }
});

test('★ 오개념 이름표: 그 오답이 정말 그 실수에서 나온 값이다', () => {
  const seen = {};
  const opOf = (e) => { const m = /^(\S+) ([+−×÷]) (\S+)$/.exec(String(e || '').trim()); return m ? { a: m[1], op: m[2], b: m[3] } : null; };
  for (const c of DECIMAL) {
    for (let s = 1; s <= SEEDS; s++) {
      const q = makeQuestion(c.id, 'calc', s * 31337, OPTS);
      const p = q.probe || {};
      const e = opOf(q.expr || p.calc);
      for (const ch of q.choices.filter((x) => !x.ok)) {
        const v = valueOf(ch.text);
        const where = `${c.id} seed ${s}: "${ch.tag}" 오답 ${ch.text} (식 ${q.expr || p.calc || ''})`;
        const hit = (want) => { seen[ch.tag] = (seen[ch.tag] || 0) + 1; assert.ok(eq(v, want), `${where} ≠ ${want}`); };
        switch (ch.tag) {
          case TAGS.alignEnd: hit(simAlignEnd(e.a, e.b, e.op === '+' ? '+' : '-')); break;
          case TAGS.noCarry: hit(simNoCarry(e.a, e.b)); break;
          case TAGS.swapSub: hit(simSwapSub(e.a, e.b)); break;
          case TAGS.placesNotAdded: hit(digitsOnly(e.a) * digitsOnly(e.b) / 10 ** Math.max(fracLen(e.a), fracLen(e.b))); break;
          case TAGS.dropPoint:
            if (e && e.op === '×') hit(digitsOnly(e.a) * digitsOnly(e.b));
            else if (e && e.op === '÷') hit(digitsOnly(String(val(p.calc))));
            break;
          case TAGS.quotZero: { const t = String(val(p.calc)); hit(Number(t.replace(/\.0/, '.'))); break; }
          case TAGS.stopEarly: { const k = fracLen(e.a); hit(Math.floor(val(p.calc) * 10 ** k + 1e-9) / 10 ** k); break; }
          case TAGS.divisorOnly: hit(val(e.a) / (val(e.b) * 10 ** fracLen(e.b))); break;
          case TAGS.dividendOnly: hit((val(e.a) * 10 ** fracLen(e.b)) / val(e.b)); break;
          case TAGS.moves:
            if (e && e.op === '÷' && fracLen(e.b)) hit((val(e.a) * 10 ** (fracLen(e.b) - 1)) / (val(e.b) * 10 ** fracLen(e.b)));
            else if (e) { const f = Number(e.b); hit(e.op === '×' ? val(e.a) * (f === 10 ? 100 : 10) : val(e.a) / (f === 10 ? 100 : 10)); }
            break;
          case TAGS.reverse: if (e) hit(e.op === '×' ? val(e.a) / Number(e.b) : val(e.a) * Number(e.b)); break;
          case TAGS.padZero: seen[ch.tag] = (seen[ch.tag] || 0) + 1; assert.equal(ch.text, `${e.a}${'0'.repeat(String(e.b).length - 1)}`, where); break;
          case TAGS.denomAfter: { const [n, d] = p.calc.split('/'); hit(Number(d) / 10 ** d.length); void n; break; }
          case TAGS.concat: { const [n, d] = p.calc.split('/'); hit(Number(n + d) / 10 ** (n + d).length); break; }
          case TAGS.longer: {
            // 소수점 아래를 자연수처럼 비교한 아이가 고르는 수 — 가장 큰 수 문제면 그 값이 가장 큰 것, 작은 수 문제면 가장 작은 것
            const key = (t) => Number(String(t).split('.')[1] || '0');
            const ks = q.choices.map((x) => key(x.text));
            seen[ch.tag] = (seen[ch.tag] || 0) + 1;
            assert.equal(key(ch.text), p.max ? Math.max(...ks) : Math.min(...ks), where);
            break;
          }
          case TAGS.mulBigger: case TAGS.divSmaller: seen[ch.tag] = (seen[ch.tag] || 0) + 1; break;
          default: break;
        }
      }
    }
  }
  // 모든 이름표가 실제로 검사됐는지 — 하나라도 0이면 그 오답이 아예 안 나오거나 이 테스트가 헛돈다
  for (const tag of [TAGS.alignEnd, TAGS.noCarry, TAGS.swapSub, TAGS.placesNotAdded, TAGS.dropPoint, TAGS.quotZero, TAGS.stopEarly,
    TAGS.divisorOnly, TAGS.dividendOnly, TAGS.moves, TAGS.reverse, TAGS.padZero, TAGS.denomAfter, TAGS.concat, TAGS.longer, TAGS.mulBigger, TAGS.divSmaller]) {
    assert.ok((seen[tag] || 0) >= 20, `"${tag}" 오답을 충분히 검사해야 한다 (${seen[tag] || 0}건)`);
  }
});

test('★ ② 오개념 문항: 보여 주는 계산은 정말 틀렸고, 이름 붙인 실수가 정말 그 값을 만든다', () => {
  const branches = {};
  for (const c of DECIMAL) {
    for (let s = 1; s <= SEEDS; s++) {
      const q = makeQuestion(c.id, 'misread', s * 7717, OPTS);
      const p = q.probe || {};
      const where = `${c.id} seed ${s}: ${q.q.replace(/\n/g, ' ')}`;
      assert.ok(/^misread:/.test(q.key || ''), `${where}: 갈래 열쇠`);
      branches[`${c.id} ${q.key}`] = (branches[`${c.id} ${q.key}`] || 0) + 1; // 갈래 이름은 개념마다 따로 (덧셈·뺄셈 둘 다 align)
      assert.ok(/\*\*.+\*\*/.test(q.q), `${where}: 틀린 계산이 굵게 보여야 한다`);
      if (p.calc) {
        const right = val(p.calc);
        assert.ok(!eq(valueOf(p.shown), right), `${where}: 보여 준 ${p.shown} 이 사실 정답(${right})이다`);
        assert.ok(q.q.includes(p.shown), `${where}: 보여 준 값이 문항에 없다`);
        const m = /^(\S+) ([+−×÷]) (\S+)$/.exec(p.calc);
        const sim = {
          alignEnd: () => simAlignEnd(m[1], m[3], m[2] === '+' ? '+' : '-'),
          noCarry: () => simNoCarry(m[1], m[3]),
          swapSub: () => simSwapSub(m[1], m[3]),
          placesNotAdded: () => digitsOnly(m[1]) * digitsOnly(m[3]) / 10 ** Math.max(fracLen(m[1]), fracLen(m[3])),
          dropPoint: () => digitsOnly(m[1]) * digitsOnly(m[3]),
          pointPos: () => right / 10,
          quotZero: () => Number(String(right).replace(/\.0/, '.')),
          stopEarly: () => Math.floor(right * 10 + 1e-9) / 10,
          divisorOnly: () => val(m[1]) / (val(m[3]) * 10 ** fracLen(m[3])),
          moves: () => right / 10,
        };
        if (p.bug) assert.ok(eq(valueOf(p.shown), sim[p.bug]()), `${where}: "${p.bug}"로 푼 값이 ${p.shown} 이 아니다 (${sim[p.bug]()})`);
      } else if (p.place) {
        assert.ok(!eq(valueOf(p.shown), placeValue(p.place.num, p.place.digit)), `${where}: 보여 준 자릿값이 사실 맞다`);
      } else if (p.read) {
        assert.notEqual(p.shown, koRead(p.read), `${where}: 보여 준 읽기가 사실 맞다`);
      } else if (p.claim) {
        const a = val(p.claim.a); const b = val(p.claim.b);
        assert.ok(p.claim.op === '>' ? !(a > b) : !(a < b), `${where}: 보여 준 비교가 사실 맞다`);
      } else {
        assert.fail(`${where}: 검산 재료(probe)가 없다`);
      }
    }
  }
  // 갈래가 한쪽으로 쏠리지 않았는지 — 한 갈래가 영영 안 나오면 그 오개념은 복습에 못 돌아온다
  for (const [k, n] of Object.entries(branches)) assert.ok(n >= 100, `${k} 갈래가 너무 드물다 (${n})`);
  assert.ok(Object.keys(branches).length >= 18, `갈래 수 ${Object.keys(branches).length}`);
});

test('★ 수 뒤의 조사가 받침에 맞다 (5는·3은·0.8을·3/4을)', () => {
  const BAT = new Set(['0', '1', '3', '6', '7', '8']);
  const PAIR = { 이: true, 가: false, 을: true, 를: false, 은: true, 는: false, 과: true, 와: false };
  let checked = 0;
  for (const c of DECIMAL) {
    for (let s = 1; s <= 300; s++) {
      for (const kind of ['calc', 'misread']) {
        const q = makeQuestion(c.id, kind, s * 3571, OPTS);
        const texts = [q.q, ...q.choices.map((x) => x.text), ...(q.solve ? [...q.solve.steps, q.solve.whyAny, ...Object.values(q.solve.why)] : [])];
        for (const t of texts) {
          for (const m of String(t).matchAll(/(\d+(?:\.\d+)?(?:\/\d+)?)(이|가|을|를|은|는|과|와)(?![가-힣])/g)) {
            const token = m[1];
            const last = token.includes('/') ? token.split('/')[0].slice(-1) : token.slice(-1);
            checked++;
            assert.equal(PAIR[m[2]], BAT.has(last), `${c.id}/${kind} seed ${s}: "${token}${m[2]}" (${t})`);
          }
        }
      }
    }
  }
  assert.ok(checked > 1000, `조사 검사 ${checked}건`);
});

test('★ 풀이 카드: 단계 2줄↑ · 기억할 것 · 오답마다 "왜 틀렸나" · 정답이 단계에 나온다 (분수 줄기와 같은 기준)', () => {
  for (const c of DECIMAL) {
    for (const kind of ['calc', 'misread']) {
      for (let s = 1; s <= 400; s++) {
        const q = makeQuestion(c.id, kind, s * 131, OPTS);
        const where = `${c.id}/${kind} seed ${s}`;
        assert.ok(q.solve, `${where}: 풀이 없음`);
        assert.ok(q.solve.steps.length >= 2, `${where}: 단계 ${q.solve.steps.length}`);
        assert.ok(q.solve.rule, `${where}: 기억할 것 없음`);
        for (const ch of q.choices) if (!ch.ok) {
          const why = q.solve.why[ch.tag] || q.solve.whyAny;
          assert.ok(why, `${where}: 오답 "${ch.text}"(${ch.tag})에 설명 없음`);
          assert.ok(!/\{(me|mon)|undefined|NaN/.test(why), `${where}: 설명이 덜 채워짐 — ${why}`);
        }
        for (const st of q.solve.steps) assert.ok(!/\{(me|mon)|undefined|NaN/.test(st), `${where}: 단계가 덜 채워짐 — ${st}`);
        if (kind !== 'calc') continue;
        const ok = q.choices.find((x) => x.ok).text;
        const v = valueOf(ok);
        const inText = q.solve.steps.some((st) => st.includes(ok));
        const inValue = NUMERIC.test(ok) && q.solve.steps.some((st) => (st.match(/\d+(?:\.\d+)?(?:\/\d+)?/g) || []).some((t) => eq(valueOf(t), v)));
        assert.ok(inText || inValue, `${where}: 풀이 단계에 정답 ${ok} 이 없다 — ${q.solve.steps.join(' / ')}`);
      }
    }
  }
});

test('📏 진단: 5문제, 사다리에서 고르게 · 시작점', () => {
  const d = diagnosticSet(12345, 5, OPTS);
  assert.equal(d.length, 5);
  assert.deepEqual(d.map((q) => q.concept), ['dec.place', 'dec.relation', 'dec.frac', 'dec.muldec', 'dec.divdec']);
  for (const q of d) assert.equal(q.kind, 'calc');
  const pl = placeFrom([{ concept: 'dec.place', correct: true }, { concept: 'dec.relation', correct: true }, { concept: 'dec.frac', correct: false }]);
  assert.equal(pl.startId, 'dec.frac');
  // ⭐ 4학년 활용은 진단에 없지만 5학년 칸 앞이라, 5학년 칸에서 틀리면 앞 칸처럼 "안다"로 친다 (V와 같은 방식 — Codex 78차 #2)
  assert.deepEqual(pl.knownIds, ['dec.place', 'dec.compare', 'dec.relation', 'dec.add', 'dec.sub', 'dec.apply']);
  const pl2 = placeFrom([{ concept: 'dec.place', correct: true }, { concept: 'dec.relation', correct: false }]);
  assert.ok(!pl2.knownIds.includes('dec.apply'), '4학년 칸에서 틀리면 ⭐는 아직');
  const lad = ladder(['dec.place', 'dec.compare']);
  assert.deepEqual(lad.slice(0, 4).map((x) => x.state), ['done', 'done', 'now', 'locked']);
});

test('한 편: 내용 파일이 없어도 ①② 두 문항 · 배움은 idea 한 장으로', () => {
  for (const c of DECIMAL) {
    const round = makeRound(c.id, 777, OPTS);
    assert.deepEqual(round.map((q) => q.kind), ['calc', 'misread'], c.id);
    const L = lessonOf(c.id, 1, OPTS);
    assert.equal(L.title, c.name);
    assert.equal(L.pages.length, 1);
  }
  assert.equal(conceptById('dec.nope'), null);
  assert.equal(makeQuestion('dec.nope', 'calc', 1, OPTS), null);
});

test('🔁 쌍둥이: 같은 틀(key)을 주면 같은 틀·다른 숫자로 온다', () => {
  let tried = 0;
  for (const c of DECIMAL) {
    for (let s = 1; s <= 40; s++) {
      const a = makeQuestion(c.id, 'calc', s * 97, OPTS);
      if (!a.key) continue;
      const b = makeQuestion(c.id, 'calc', s * 97 + 5, { ...OPTS, want: { k: 'calc', key: a.key } });
      tried++;
      assert.equal(b.key, a.key, `${c.id} seed ${s}: 쌍둥이 틀이 다르다`);
    }
  }
  assert.ok(tried > 200);
});

// ── 사람이 쓴 원고 (coach/math/decimal.json) ──
const CONTENT = JSON.parse(readFileSync('coach/math/decimal.json', 'utf8'));

test('원고(decimal.json)가 형식 검사를 통과한다 — 10칸 모두 배움 3장↑·확인 2개↑·아빠 카드', () => {
  assert.deepEqual(checkContent(CONTENT), []);
  for (const c of DECIMAL) {
    const L = lessonOf(c.id, 3, { ...OPTS, content: CONTENT });
    assert.ok(L.pages.length >= 3, c.id);
    assert.ok(!/\{(me|mon)/.test(JSON.stringify(L)), `${c.id}: 이름 자리표시가 남았다`);
  }
});

test('★ 원고 확인 질문도 값으로 검산 — 식이 든 질문은 따로 풀어 정답과 대조', () => {
  // "2.7 + 0.35 는?" · "4.7의 10배" · "6.4의 1/100" · "43/100을 소수로" · "0.001이 37개" — 사람이 쓴 답도 틀릴 수 있다
  const answerOf = (q) => {
    let m;
    if ((m = /(\d+(?:\.\d+)?) ([+−×÷]) (\d+(?:\.\d+)?) *(?:은|는)\?/.exec(q))) return val(`${m[1]} ${m[2]} ${m[3]}`);
    if ((m = /^(\d+(?:\.\d+)?)의 (\d+)배는/.exec(q))) return val(`${m[1]} × ${m[2]}`);
    if ((m = /^(\d+(?:\.\d+)?)의 1\/(\d+)은/.exec(q))) return val(`${m[1]} ÷ ${m[2]}`);
    if ((m = /^(\d+\/\d+)[을를] 소수로/.exec(q))) return val(m[1]);
    if ((m = /^(\d+(?:\.\d+)?)이 (\d+)개인 수/.exec(q))) return val(`${m[1]} × ${m[2]}`);
    if ((m = /^(\d+(?:\.\d+)?)[을를] 기약분수로/.exec(q))) return val(m[1]);
    return null;
  };
  let checked = 0;
  for (const c of DECIMAL) {
    for (const [i, p] of CONTENT[c.id].lesson.entries()) {
      if (!p.check) continue;
      const want = answerOf(p.check.q);
      if (want === null) continue;
      checked++;
      assert.ok(eq(valueOf(p.check.ok), want), `${c.id}[${i}] "${p.check.q}" 의 답은 ${want} 인데 원고 정답은 ${p.check.ok}`);
      for (const n of p.check.no) assert.ok(!eq(valueOf(n) ?? NaN, want), `${c.id}[${i}] 오답 ${n} 이 사실 정답`);
      if (/기약분수/.test(p.check.q)) { const m = /^(\d+)\/(\d+)$/.exec(p.check.ok); assert.ok(m && g(+m[1], +m[2]) === 1, `${c.id}[${i}] 기약분수가 아님`); }
    }
  }
  assert.ok(checked >= 18, `식이 든 확인 질문을 충분히 검산해야 한다 (${checked}개)`);
});

test('★ ② 갈래 요청: 🔁 쌍둥이·🤔 오답 노트가 요청한 갈래로 온다 (Codex 12차 P1 — 안 따르면 노트가 지워졌다)', () => {
  let tried = 0;
  for (const c of DECIMAL) {
    const keys = new Set();
    for (let s = 1; s <= 200; s++) keys.add(makeQuestion(c.id, 'misread', s * 37, OPTS).key);
    for (const key of keys) {
      for (let s = 1; s <= 200; s++) {
        const q = makeQuestion(c.id, 'misread', s * 911, { ...OPTS, want: { k: 'misread', key } });
        tried++;
        assert.equal(q.key, key, `${c.id} seed ${s}: ${key}를 요청했는데 ${q.key}`);
      }
    }
  }
  assert.ok(tried >= 3000, `검사 ${tried}건`);
});

test('★ 초4 칸은 소수 셋째 자리까지 — 문제 글·보기 어디에도 넷째 자리가 없다 (Codex 12차 #6: 0.1618)', () => {
  const G4 = DECIMAL.filter((c) => c.grade === 4);
  assert.equal(G4.length, 6);
  for (const c of G4) {
    for (const kind of ['calc', 'misread']) {
      for (let s = 1; s <= SEEDS; s++) {
        const q = makeQuestion(c.id, kind, s * 1777, OPTS);
        const texts = [q.q, q.expr, ...q.choices.map((x) => x.text)];
        for (const t of texts) {
          for (const m of String(t).matchAll(/\d+\.(\d+)/g)) {
            assert.ok(m[1].length <= 3, `${c.id}/${kind} seed ${s}: 넷째 자리 "${m[0]}" — ${String(t).replace(/\n/g, ' ')}`);
          }
        }
      }
    }
  }
});

test('받아올림은 "10 이상"에서 — "10이 넘으면"이라고 가르치지 않는다 (딱 10도 받아올린다, Codex 12차 #5)', () => {
  for (const f of ['js/mathdec.js', 'coach/math/decimal.json']) {
    assert.doesNotMatch(readFileSync(f, 'utf8'), /10이 넘으면|10이 넘은 자리/, f);
  }
});

test('📦 오프라인: 모든 줄기의 원고 파일이 sw.js APP_SHELL에 있다 (Codex 12차 #2 — decimal.json이 빠져 있었다)', async () => {
  const { STEMS } = await import('../js/mathprog.js');
  const sw = readFileSync('sw.js', 'utf8');
  for (const s of Object.values(STEMS)) assert.ok(sw.includes(`'${s.file}'`), `${s.key}: ${s.file}가 APP_SHELL에 없다`);
});

test('내용 검사(checkContent): 빈 파일은 11칸 모두 "내용 없음", 제대로 쓴 것은 통과, 값이 같은 보기는 잡는다', () => {
  assert.equal(checkContent({}).filter((x) => /내용 없음/.test(x)).length, 11);
  const good = {};
  for (const c of DECIMAL) {
    good[c.id] = {
      rule: '한 줄 규칙',
      lesson: [
        { say: '설명 {mon/이/가} 봐요' },
        { say: '확인', check: { q: '어느 쪽?', ok: '0.5', no: ['0.45', '0.05'], why: '앞자리부터' } },
        { say: '또 확인', check: { q: '몇 자리?', ok: '둘째 자리', no: ['첫째 자리'], why: '소수점 오른쪽 두 번째' } },
      ],
      dad: { goal: '목표', say: ['말할 거리'], do: '같이 할 것', traps: ['함정'], pass: '통과 기준' },
    };
  }
  assert.deepEqual(checkContent(good), []);
  const bad = JSON.parse(JSON.stringify(good));
  bad['dec.frac'].lesson[1].check.no = ['1/2', '0.45'];
  assert.ok(checkContent(bad).some((x) => /값이 같은 보기/.test(x)), '0.5와 1/2은 같은 값');
});

test('❓16·17 (2026-10-03·04 진우 "보기 추가") — 후보가 보기에만 있는 크기 비교는 숫자판이 아니라 보기로: "다음 중 … 어느 것일까요?" 말투', async () => {
  const { padSpec } = await import('../js/mathpad.js');
  let n = 0; let story = 0;
  for (let s = 1; s <= 400; s++) {
    const q = makeQuestion('dec.compare', 'calc', s, OPTS);
    const listed = q.choices.every((c) => q.q.includes(c.text)); // 후보가 문제 글에 다 있으면 숫자판이어도 풀 수 있다
    if (!listed) {
      n++;
      if (/쟀어요|기록/.test(q.q)) story++;
      assert.match(q.q, /다음 중 .*어느 것일까요\?/, `#${s}: ${q.q}`);
      assert.equal(padSpec(q, 'decimal'), null, `#${s}: 후보가 보기에만 있는데 숫자판 — ${q.q}`);
    }
  }
  assert.ok(n > 100 && story > 30, `후보가 보기에만 있는 문항 ${n} · 이야기 ${story}`);
});

// ───────────────────── ⭐ 4학년 활용 (dec.apply, v270) ─────────────────────

const DONE4 = ['dec.place', 'dec.compare', 'dec.relation', 'dec.add', 'dec.sub'];
test('⭐ 4학년 활용 자리: 뺄셈 칸 바로 뒤 · 초4 · 뺄셈 칸을 끝내면 ⭐가 "지금"이고 5학년 첫 칸도 열린다 · 진단 5문제에는 없다', () => {
  const ids = DECIMAL.map((c) => c.id);
  assert.equal(ids.indexOf('dec.apply'), ids.indexOf('dec.sub') + 1);
  assert.deepEqual(conceptById('dec.apply').needs, ['dec.sub']);
  assert.deepEqual(conceptById('dec.frac').needs, ['dec.sub'], '5학년 첫 칸은 ⭐ 없이도 열린다');
  const L = Object.fromEntries(ladder(DONE4).map((x) => [x.id, x.state]));
  assert.equal(L['dec.apply'], 'now');
  assert.equal(L['dec.frac'], 'open');
  assert.equal(Object.fromEntries(ladder(DONE4.slice(0, 4)).map((x) => [x.id, x.state]))['dec.apply'], 'locked');
  for (let s = 1; s <= 60; s++) assert.ok(!diagnosticSet(s, 5, OPTS).some((q) => q.concept === 'dec.apply'), `진단 #${s}`);
});

const APPLY_KINDS = ['placeAdd', 'placeSub', 'kg', 'cm', 'ten', 'tenth', 'cardSum', 'cardDiff'];
const APPLY_WANT = { placeAdd: /잘못 더한 수/, placeSub: /잘못 뺀 수/, kg: /g을 kg으로/, cm: /cm를 m로/, ten: /10배를 되돌려/, tenth: /1\/10을 되돌려/, cardSum: /만든 다음 더해요/, cardDiff: /만든 다음 빼요/ };
test('⭐ 4학년 활용 ①: 네 가족 여덟 틀이 다 나온다 · 오답 이름표는 그 틀린 셈(글의 수로 다시) · 오답끼리·정답과 다른 값, 0보다 큼 · 풀이 셈식이 맞다 · 도움말(whyAny)은 틀마다 · 💎 꼴 아님', () => {
  const seen = {}; const slip = conceptById('dec.apply').slip;
  for (let s = 1; s <= SEEDS; s++) {
    const q = makeQuestion('dec.apply', 'calc', s * 389, OPTS);
    const sv = solveApply(q.q);
    assert.ok(sv, `#${s}: 못 읽는 문제 ${q.q}`);
    seen[sv.kind] = (seen[sv.kind] || 0) + 1;
    const where = `#${s} ${sv.kind}: ${q.q}`;
    // 보기에 뜬 오답(계산 실수 빼고)과 화면에서 빠진 후보 모두 그 이름표의 뜻
    for (const ch of q.choices.filter((x) => !x.ok && x.tag !== '계산 실수')) assert.ok(applyTagHolds(sv, ch.tag, ch.text), `${where}\n"${ch.text}" ≠ ${ch.tag}`);
    const W = q.probe.allWrong;
    assert.ok(W.length >= 2, `${where}: 오답 후보 ${W.length}`);
    const vals = W.map((w) => valueOf(w.text));
    for (const [k, w] of W.entries()) {
      assert.ok(applyTagHolds(sv, w.tag, w.text), `${where}\n후보 "${w.text}" ≠ ${w.tag}`);
      assert.ok(vals[k] > 0 && !eq(vals[k], num(sv.ans)), `${where}: 후보 ${w.text}`);
      assert.ok(fracLen(w.text) <= 3, `${where}: 넷째 자리 ${w.text}`);
      for (let j = k + 1; j < W.length; j++) assert.ok(!eq(vals[k], vals[j]), `${where}: 후보끼리 같은 값 ${w.text}`);
    }
    // 풀이의 "A ± B = C"는 모두 맞다
    for (const st of q.solve.steps) for (const m of st.matchAll(/(\d+(?:\.\d+)?) ([+−]) (\d+(?:\.\d+)?) = (\d+(?:\.\d+)?)/g)) assert.ok(eq(val(`${m[1]} ${m[2]} ${m[3]}`), val(m[4])), `${where}: 풀이 ${m[0]}`);
    assert.notEqual(q.solve.whyAny, slip, where);
    assert.match(q.solve.whyAny, APPLY_WANT[sv.kind], where);
    assert.ok(!/모두 더하면|씩 겹치게/.test(q.q), `${where}: 💎 스페셜 꼴`);
    if (sv.kind === 'cardSum' || sv.kind === 'cardDiff') assert.ok(!/0/.test(/수 카드 ([\d, ]+)/.exec(q.q)[1]), `${where}: 0 카드`);
  }
  for (const k of APPLY_KINDS) assert.ok((seen[k] || 0) >= SEEDS / 20, `${k}: ${seen[k] || 0}`);
});

test('⭐ 4학년 활용 ②: 자릿값(어떤 수에서 멈춤)·단위(g을 0.0□□ kg으로) — 바른 값은 문제 글에서 · 보여 준 값은 틀림 · 고치는 말의 끝 수가 바른 값 · 이름표 보기도 그 틀린 셈 · 엉뚱한 지적은 틀린 말', () => {
  const keys = {};
  for (let s = 1; s <= SEEDS; s++) {
    const q = makeQuestion('dec.apply', 'misread', s * 263, OPTS);
    keys[q.key] = (keys[q.key] || 0) + 1;
    const sv = solveApply(q.q.split('\n\n')[0]);
    const where = `#${s} ${q.key}: ${q.q}`;
    assert.ok(sv, where);
    const right = num(sv.ans);
    const shownLine = /\*\*(.+?)\*\*/.exec(q.q)[1];
    const shownV = valueOf(shownLine.split(' = ').pop());
    assert.ok(!eq(shownV, right), `${where}: 보여 준 값이 맞는 값`);
    const lastOf = (t) => valueOf([...String(t).matchAll(/\d+(?:\.\d+)?/g)].pop()[0]);
    assert.ok(eq(lastOf(q.choices.find((x) => x.ok).text), right), `${where}: 고치는 말`);
    for (const ch of q.choices.filter((x) => !x.ok && x.tag !== '틀린 줄 모름' && x.tag !== '엉뚱한 지적')) assert.ok(applyTagHolds(sv, ch.tag, String(lastOf(ch.text))), `${where}: "${ch.text}"`);
    const off = q.choices.find((x) => x.tag === '엉뚱한 지적');
    if (q.key === 'misread:place') {
      assert.ok(eq(shownV, num(sv.n.x)), `${where}: 어떤 수에서 멈춘 풀이`);
      assert.equal(off.text, '잘못 더한 수와 그 결과를 알아도 어떤 수는 구할 수 없어요');
    } else {
      assert.ok(eq(shownV, num(sub(sv.n.K, div(sv.n.G, Q(10000))))), `${where}: g을 0.0□□ kg으로 바꾼 풀이`);
      assert.match(off.text, /^1 kg은 100 g이라서/, '1 kg = 1000 g — 틀린 말');
    }
  }
  assert.ok(keys['misread:place'] > SEEDS / 3 && keys['misread:unit'] > SEEDS / 3, JSON.stringify(keys));
});

test('⭐ 4학년 활용 원고: 확인 질문을 글로 따로 풀어 정답이 하나 · 오답은 이름표 있는 틀린 셈 · 까닭에 정답·오답이 다 나온다', () => {
  const v = CONTENT['dec.apply'];
  assert.ok(v && v.lesson.length >= 4 && v.lesson.every((p) => p.check), '배움 4장·장마다 확인');
  const kinds = new Set(); let eqs = 0;
  for (const [i, p] of v.lesson.entries()) {
    const sv = solveApply(p.check.q);
    assert.ok(sv, `[${i}] 못 읽는 확인 질문 ${p.check.q}`);
    kinds.add(sv.kind);
    assert.ok(eq(valueOf(p.check.ok), num(sv.ans)), `[${i}] 정답 ${p.check.ok} ≠ ${num(sv.ans)}`);
    for (const n of p.check.no) {
      assert.ok(!eq(valueOf(n), num(sv.ans)), `[${i}] 오답 ${n}이 사실 정답`);
      assert.ok(Object.values(TAGS).some((tg) => applyTagHolds(sv, tg, n)), `[${i}] 오답 ${n} — 어느 틀린 셈에서도 안 나온다`);
      assert.ok(p.check.why.includes(n), `[${i}] 까닭에 오답 ${n}`);
    }
    assert.ok(p.check.why.includes(p.check.ok), `[${i}] 까닭에 정답`);
    // 굵게(**)를 지우고 본다 — "2.22 + 0.36 = **2.58**"의 굵은 답도 검사에 들어오게 (🔍 Codex 79차 #1)
    for (const m of `${p.say}\n${p.check.why}`.replace(/\*\*/g, '').matchAll(/(\d+(?:\.\d+)?) ([+−]) (\d+(?:\.\d+)?) = (\d+(?:\.\d+)?)/g)) { assert.ok(eq(val(`${m[1]} ${m[2]} ${m[3]}`), val(m[4])), `[${i}] 셈식 ${m[0]}`); eqs++; }
  }
  assert.ok(kinds.size >= 4, `확인 질문 틀 ${[...kinds]}`);
  assert.ok(eqs >= 9, `원고에서 본 셈식 ${eqs} (굵은 답 포함 — 굵게를 안 지우면 6)`);
});
