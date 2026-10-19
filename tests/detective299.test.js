// 🕵️ 나옹의 숙제 봐 주기 (v299, 2026-10-19 아버님 "추천대로" · 원고 30문제 "이대로")
// 원고(짜임 · 정답은 시험이 문제의 수로 따로 푼다 · 줄 안의 식 · 계산 줄 따라가기 · 숫자 뒤 조사) · 검사가 잡는 것 · 줄 종류·보기 차례 ·
// 판 고르기 · 처음 답(answerRule) · 판 끝 보상(finishRule) · 병합·복사 · 📤 요약 · 화면 연결
// node --test tests/detective299.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import {
  ROUND_N, SEEN_DAYS, REWARD, FOLLOW_SAY, stemOfCell, kindsOf, lineWhy, optionOrder, checkDetective, validItems, pickRound,
  detectOf, answerRule, finishRule, mergeDetect, detectTodayLine, detectReport, answerQueue,
} from '../js/detective.js';
import { fixNumJosa } from '../js/mathgen.js';
import { mathReportText, nameOf } from '../js/mathprog.js';
import { emptyMath, cloneMath, mergeMath } from '../js/db.js';

const read = (f) => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');
const DATA = JSON.parse(read('coach/math/detective.json'));
const ITEMS = DATA.items;
const CELLS = {};
for (const f of readdirSync(new URL('../coach/math/', import.meta.url)).filter((x) => x.endsWith('.json') && x !== 'detective.json')) {
  const d = JSON.parse(read(`coach/math/${f}`));
  for (const [k, v] of Object.entries(d)) if (v && v.dad) CELLS[k] = { rule: v.rule, traps: v.dad.traps };
}
const T = '2026-10-19';
const T2 = '2026-10-20';
const copy = (o) => JSON.parse(JSON.stringify(o));

// ── 시험이 따로 쓰는 계산기 (유리수 · + − × ÷ / 괄호 ( ) { } · 대분수 "1 3/8" · ° 무시) — 규칙 파일·원고의 풀이를 쓰지 않는다
const abs = (x) => (x < 0n ? -x : x);
function gcdB(a, b) { a = abs(a); b = abs(b); while (b) [a, b] = [b, a % b]; return a; }
function Q(n, d = 1n) { if (d === 0n) throw new Error('0으로 나눔'); if (d < 0n) { n = -n; d = -d; } const g = gcdB(n, d) || 1n; return { n: n / g, d: d / g }; }
const add = (a, b) => Q(a.n * b.d + b.n * a.d, a.d * b.d);
const sub = (a, b) => Q(a.n * b.d - b.n * a.d, a.d * b.d);
const mul = (a, b) => Q(a.n * b.n, a.d * b.d);
const div = (a, b) => Q(a.n * b.d, a.d * b.n);
const eq = (a, b) => !!a && !!b && a.n === b.n && a.d === b.d;
const cmp = (a, b) => { const x = a.n * b.d - b.n * a.d; return x < 0n ? -1 : x > 0n ? 1 : 0; };
const show = (a) => (a ? (a.d === 1n ? `${a.n}` : `${a.n}/${a.d}`) : String(a));
function numQ(s) { const [i, f = ''] = String(s).split('.'); return Q(BigInt(i + f), 10n ** BigInt(f.length)); }
function parse(src) {
  let s = String(src).replace(/[−–]/g, '-').replace(/×/g, '*').replace(/÷/g, ':').replace(/[{[]/g, '(').replace(/[}\]]/g, ')').replace(/°/g, '');
  s = s.replace(/(\d+)\s+(\d+)\/(\d+)/g, '($1+$2/$3)');
  const tok = s.match(/\d+(?:\.\d+)?|[-+*:/()]|\S/g) || [];
  let i = 0;
  const factor = () => {
    const t = tok[i++];
    if (t === '(') { const v = expr(); if (tok[i++] !== ')') throw new Error('괄호'); return v; }
    if (t === '-') return sub(Q(0n), factor());
    if (t && /^\d/.test(t)) return numQ(t);
    throw new Error(`모르는 글자 ${t}`);
  };
  const term = () => { let v = factor(); while (['*', ':', '/'].includes(tok[i])) { const o = tok[i++]; const r = factor(); v = o === '*' ? mul(v, r) : div(v, r); } return v; };
  function expr() { let v = term(); while (['+', '-'].includes(tok[i])) { const o = tok[i++]; const r = term(); v = o === '+' ? add(v, r) : sub(v, r); } return v; }
  const v = expr();
  if (i !== tok.length) throw new Error('남는 글자');
  return v;
}
const RUN = /[0-9({[][0-9 .()[\]{}+\-−×÷/°=<>→]*/g;
const REL = /(=|<|>|→)/;
function runsOf(line) {
  return [...String(line).matchAll(RUN)].map((m) => {
    const raw = m[0].trim();
    const parts = raw.split(REL).map((x) => x.trim());
    const sides = parts.filter((_, k) => k % 2 === 0);
    let vals = null;
    try { vals = sides.map(parse); } catch { vals = null; }
    return { raw, ops: parts.filter((_, k) => k % 2 === 1), vals };
  });
}
function valueOf(line) {
  const rs = runsOf(line).filter((r) => r.vals);
  if (!rs.length) return null;
  const r = rs[rs.length - 1];
  return r.vals[r.vals.length - 1];
}
function falseRels(line) {
  const bad = [];
  for (const r of runsOf(line)) {
    if (!r.ops.length) continue;
    if (!r.vals) { bad.push(`못 읽은 식 「${r.raw}」`); continue; }
    r.ops.forEach((o, k) => { const c = cmp(r.vals[k], r.vals[k + 1]); if (!(o === '<' ? c < 0 : o === '>' ? c > 0 : c === 0)) bad.push(`거짓 「${r.raw}」`); });
  }
  return bad;
}
// 한글 수 (사백팔십만 오천 → 4805000)
const KD = { 일: 1n, 이: 2n, 삼: 3n, 사: 4n, 오: 5n, 육: 6n, 칠: 7n, 팔: 8n, 구: 9n };
const KS = { 십: 10n, 백: 100n, 천: 1000n };
const KB = { 만: 10n ** 4n, 억: 10n ** 8n, 조: 10n ** 12n };
function kor(words) {
  let total = 0n; let sec = 0n; let n = 0n; let any = false;
  for (const ch of String(words)) {
    if (KD[ch] !== undefined) { n = KD[ch]; any = true; } else if (KS[ch]) { sec += (n || 1n) * KS[ch]; n = 0n; any = true; } else if (KB[ch]) { total += (sec + n || 1n) * KB[ch]; sec = 0n; n = 0n; any = true; }
  }
  return any ? total + sec + n : null;
}
const korOf = (line) => { const m = String(line).match(/[일이삼사오육칠팔구십백천만억조][일이삼사오육칠팔구십백천만억조 ]*/g); return m ? kor(m[m.length - 1]) : null; };
const gcdN = (a, b) => (b ? gcdN(b, a % b) : a);
/** 문제의 수로 정답을 다시 푼다 — 개념의 공식으로(원고의 풀이 줄을 쓰지 않는다) */
const SOLVE = {
  expr: (a) => parse(a.e),
  add: (a) => add(parse(a.a), parse(a.b)),
  sub: (a) => sub(parse(a.a), parse(a.b)),
  times: (a) => mul(parse(a.x), parse(a.k)),
  div: (a) => div(parse(a.x), parse(a.k)),
  max: (a) => (cmp(parse(a.a), parse(a.b)) >= 0 ? parse(a.a) : parse(a.b)),
  diff: (a) => Q(BigInt(Math.abs(a.a - a.b))),
  angTri: (a) => Q(BigInt(180 - a.a - a.b)),
  perim: (a) => Q(BigInt(a.s * a.n)),
  rectSide: (a) => Q(BigInt(a.area), BigInt(a.w)),
  para: (a) => Q(BigInt(a.b * a.h)),
  tri: (a) => Q(BigInt(a.b * a.h), 2n),
  gcd: (a) => Q(BigInt(gcdN(a.a, a.b))),
  lcm: (a) => Q(BigInt((a.a * a.b) / gcdN(a.a, a.b))),
  share: (a) => Q(BigInt(gcdN(a.a, a.b))),
  leftShare: (a) => Q(BigInt(a.total - a.each * a.bags), BigInt(a.people)),
  kor: (a) => Q(kor(a.words)),
};
const angKind = (d) => (d < 90 ? '예각' : d === 90 ? '직각' : d < 180 ? '둔각' : '?');

test('🕵️ 원고 30문제 — 줄기별 수(기본안) · 검사 통과 · 칸·흔한 실수·칸 규칙이 칸 원고에 · 가족을 지어내지 않음 · 숫자 뒤 조사는 읽는 소리 그대로 · 틀린 줄 자리가 한쪽으로 몰리지 않음', () => {
  assert.equal(ITEMS.length, 30);
  assert.deepEqual(ITEMS.map((it) => it.id), Array.from({ length: 30 }, (_, i) => `D${i + 1}`));
  const per = {};
  for (const it of ITEMS) per[stemOfCell(it.cell)] = (per[stemOfCell(it.cell)] || 0) + 1;
  assert.deepEqual(per, { mix: 6, dec: 6, big: 4, ang: 4, are: 4, fac: 4, fadd: 2 });
  assert.equal(new Set(ITEMS.map((it) => it.cell)).size, 30, '칸이 겹치지 않는다');
  assert.deepEqual(checkDetective(DATA, CELLS), []);
  assert.equal(validItems(DATA, CELLS).length, 30);
  for (const it of ITEMS) {
    assert.ok(CELLS[it.cell].traps[it.trap], `${it.id} 흔한 실수`);
    const kid = JSON.stringify({ ...it, ans: null }).replace(/(각|변|모|도)형/g, '');
    assert.ok(!/동생|형이|형과|누나|언니|오빠|엄마|아빠/.test(kid), `${it.id} 가족을 지어내지 않는다`);
    for (const s of [it.q, ...it.lines, ...it.fixed, ...it.opts, ...it.no, ...it.okWhy.filter(Boolean), ...Object.values(it.follow || {}), it.say]) assert.equal(fixNumJosa(s), s, `${it.id} 숫자 뒤 조사: ${s}`);
  }
  const at = [0, 0, 0, 0];
  for (const it of ITEMS) at[it.wrong]++;
  assert.ok(Math.max(...at) <= 15 && at.filter(Boolean).length >= 3, `틀린 줄 자리 ${at}`);
});

test('🕵️ 정답은 시험이 문제의 수로 따로 푼다 — 고친 풀이의 끝 = 정답 · 나옹의 끝 ≠ 정답 · 줄 안의 식은 참(나옹의 처음 틀린 줄만 빼고) · 계산 줄은 틀린 값을 따라감 · 약수·읽기·뛰어 세기·예각과 둔각·사다리', () => {
  for (const it of ITEMS) {
    const L = it.lines; const F = it.fixed; const w = it.wrong;
    const kinds = kindsOf(it);
    L.forEach((s, i) => { if (i !== w) assert.deepEqual(falseRels(s), [], `${it.id} 나옹 ${i + 1}째 줄`); });
    F.forEach((s, i) => assert.deepEqual(falseRels(s), [], `${it.id} 고친 ${i + 1}째 줄`));
    for (const s of [...L, ...F]) for (const m of s.matchAll(/(\d+)[과와] (\d+)[을를] (\d+)(?:으)?로 나누면 (\d+), (\d+)/g)) {
      const [, A, B, k, x, y] = m.map(Number);
      assert.ok(A / k === x && B / k === y, `${it.id} 사다리 「${m[0]}」`);
    }
    const f = it.ans.f;
    if (SOLVE[f]) {
      const E = SOLVE[f](it.ans);
      assert.ok(eq(valueOf(F[F.length - 1]), E), `${it.id} 고친 끝 ${show(valueOf(F[F.length - 1]))} = 정답 ${show(E)}`);
      const vn = valueOf(L[L.length - 1]);
      assert.ok(vn && !eq(vn, E), `${it.id} 나옹의 끝은 정답이 아니다`);
      if (it.chain) {
        const vw = valueOf(L[w]);
        assert.ok(vw && !eq(vw, E), `${it.id} 틀린 줄 값`);
        L.forEach((s, i) => {
          const v = valueOf(s);
          if (!v) return;
          if (kinds[i] === 'ok') assert.ok(eq(v, E), `${it.id} ${i + 1}째 줄은 답과 같은 값`);
          if (kinds[i] === 'follow') assert.ok(eq(v, vw), `${it.id} ${i + 1}째 줄은 틀린 값을 따라간다`);
        });
        F.forEach((s, i) => { const v = valueOf(s); if (v) assert.ok(eq(v, E), `${it.id} 고친 ${i + 1}째 줄`); });
        it.opts.forEach((o, k) => { const v = valueOf(o); if (k && v) assert.ok(!eq(v, E), `${it.id} 틀린 보기 ${k}는 답과 다른 값`); });
      }
      if (typeof it.ans.a === 'number' && typeof it.ans.b === 'number') {
        const G = Q(BigInt(gcdN(it.ans.a, it.ans.b))); const M = Q(BigInt((it.ans.a * it.ans.b) / gcdN(it.ans.a, it.ans.b)));
        const named = (s, who) => { const v = valueOf(s); if (/최대공약수:/.test(s) && v) assert.ok(eq(v, G), `${who} 최대공약수`); if (/최소공배수:/.test(s) && v) assert.ok(eq(v, M), `${who} 최소공배수`); };
        L.forEach((s, i) => { if (i !== w) named(s, `${it.id} 나옹 ${i + 1}째`); });
        F.forEach((s, i) => named(s, `${it.id} 고친 ${i + 1}째`));
      }
    } else if (f === 'divisors') {
      const want = []; for (let k = 1; k <= it.ans.n; k++) if (it.ans.n % k === 0) want.push(k);
      const nums = (s) => runsOf(s.replace(/^[^:]*:/, '')).filter((r) => r.vals && !r.ops.length).map((r) => Number(show(r.vals[0])));
      assert.deepEqual(nums(F[F.length - 1]), want, it.id);
      assert.notDeepEqual(nums(L[L.length - 1]), want, it.id);
    } else if (f === 'read') {
      assert.equal(korOf(F[F.length - 1]), BigInt(it.ans.n), `${it.id} 고친 읽기`);
      assert.notEqual(korOf(L[L.length - 1]), BigInt(it.ans.n), `${it.id} 나옹의 읽기`);
      for (const s of [...L, ...F, ...it.opts]) if (/\|/.test(s)) assert.equal(s.replace(/[^0-9]/g, ''), String(it.ans.n), `${it.id} 끊은 수 ${s}`);
      assert.match(F[w], /\| \d{4}$/, '만 아래 네 자리');
      assert.doesNotMatch(L[w], /\| \d{4}$/);
    } else if (f === 'skip') {
      const v = (s) => Number(show(valueOf(s)));
      F.forEach((s, i) => assert.equal(v(s), it.ans.start + i * it.ans.step, `${it.id} 고친 ${i + 1}째 수`));
      assert.notEqual(v(L[w]), it.ans.start + w * it.ans.step);
      const gap = v(L[w]) - v(L[w - 1]);
      kinds.forEach((k, i) => { if (k === 'follow') assert.equal(v(L[i]) - v(L[i - 1]), gap, `${it.id} 틀린 걸음을 따라감`); });
    } else if (f === 'kind') {
      const judge = (s) => { const m = s.match(/(\d+)°는.*→ (예각|직각|둔각)$/); assert.ok(m, s); return angKind(Number(m[1])) === m[2]; };
      L.forEach((s, i) => assert.equal(judge(s), i !== w, `${it.id} 나옹 ${i + 1}째 판정`));
      F.forEach((s) => assert.equal(judge(s), true));
      it.opts.forEach((o, k) => { if (k) assert.equal(judge(o), false, `${it.id} 틀린 보기 ${k}`); });
    } else assert.fail(`${it.id} 풀이 방법 ${f}`);
  }
});

test('🕵️ 원고 검사가 잡는 것 — 틀린 줄 앞이 다름 · 첫 보기가 고친 줄이 아님 · 보기 겹침 · 나옹의 틀린 줄이 보기에 · 맞는 까닭 없음 · 없는 흔한 실수·칸 · 줄 수 · 따라간 줄이 고친 줄과 같음 · follow 자리 · no 꼴 · 앱은 깨진 문제만 뺀다', () => {
  const base = copy(ITEMS.find((x) => x.id === 'D2'));
  const bad = (fn) => { const it = copy(base); fn(it); return checkDetective({ items: [it] }, CELLS); };
  assert.deepEqual(bad(() => {}), []);
  const cases = [
    [(it) => { it.fixed[0] = '= 48 ÷ 2 × 4'; }, '고친 풀이와 다름'],
    [(it) => { it.opts = [it.opts[1], it.opts[0], it.opts[2]]; }, '첫 보기가 고친 줄이 아님'],
    [(it) => { it.opts[2] = it.opts[1]; }, '보기가 겹침'],
    [(it) => { it.opts[2] = it.lines[it.wrong]; }, '나옹의 틀린 줄'],
    [(it) => { it.okWhy[0] = null; }, '맞는 까닭'],
    [(it) => { it.trap = 9; }, '흔한 실수 9번'],
    [(it) => { it.cell = 'mix.nope'; }, '칸 mix.nope'],
    [(it) => { it.lines.push('= 6'); it.fixed.push('= 24'); it.okWhy.push(null); it.lines.push('= 6'); it.fixed.push('= 24'); it.okWhy.push(null); }, '3~4줄'],
    [(it) => { it.fixed[2] = it.lines[2]; }, '따라간 줄인데'],
    [(it) => { it.follow = { 0: '말' }; }, 'follow 0'],
    [(it) => { it.no = ['x', 'y', 'z']; }, 'no는'],
    [(it) => { it.wrong = 7; }, '틀린 줄 번호'],
    [(it) => { it.id = 'X1'; }, 'id는 D'],
  ];
  for (const [fn, want] of cases) assert.ok(bad(fn).some((m) => m.includes(want)), `${want} — ${bad(fn).join(' / ')}`);
  const broken = copy(base); broken.opts[2] = broken.opts[1];
  assert.deepEqual(validItems({ items: [copy(ITEMS[0]), broken] }, CELLS).map((x) => x.id), ['D1'], '깨진 문제만 뺀다');
  assert.deepEqual(checkDetective(null, CELLS), ['items가 배열이 아님']);
});

test('🕵️ 줄 종류·누르면 나오는 말·보기 차례 — 틀린 줄 앞은 맞는 줄 · after는 맞는 줄 · 뒤는 따라간 줄 · 원고 말이 없으면 기본 말 · 보기 차례는 셋의 순열이고 같은 씨앗이면 같고 씨앗마다 정답 자리가 바뀐다', () => {
  const d17 = ITEMS.find((x) => x.id === 'D17');
  assert.deepEqual(kindsOf(d17), ['ok', 'wrong', 'ok']);
  const d1 = ITEMS.find((x) => x.id === 'D1');
  assert.deepEqual(kindsOf(d1), ['ok', 'ok', 'wrong', 'follow']);
  assert.equal(lineWhy(d1, 0), d1.okWhy[0]);
  assert.equal(lineWhy(d1, 3), d1.follow[3]);
  assert.equal(lineWhy(d1, 2), null);
  assert.equal(lineWhy({ ...d1, follow: {} }, 3), FOLLOW_SAY);
  for (const it of ITEMS) assert.equal(kindsOf(it).filter((k) => k === 'wrong').length, 1);
  const where = [0, 0, 0];
  for (let s = 1; s <= 600; s++) {
    const p = optionOrder('D5', s);
    assert.deepEqual([...p].sort(), [0, 1, 2]);
    where[p.indexOf(0)]++;
  }
  assert.ok(where.every((n) => n > 100), `정답 자리 ${where}`);
  assert.deepEqual(optionOrder('D9', 42), optionOrder('D9', 42));
});

test('🕵️ 판 고르기 — 🐣 이상인 칸만 · 줄기가 겹치지 않게 셋 · 🤔 칸 먼저 · 최근 7일에 본 문제는 뒤로(모자라면 오래전에 본 것부터 채움) · 아는 줄기가 셋보다 적으면 셋이 안 됨(단추를 안 그린다) · 같은 씨앗이면 같은 판', () => {
  const all = new Set(ITEMS.map((it) => it.cell));
  const r = pickRound(ITEMS, { known: all, today: T, seed: 7 });
  assert.equal(r.length, ROUND_N);
  assert.equal(new Set(r.map((it) => stemOfCell(it.cell))).size, ROUND_N, '줄기가 겹치지 않는다');
  assert.deepEqual(pickRound(ITEMS, { known: all, today: T, seed: 7 }).map((x) => x.id), r.map((x) => x.id));
  const seenIds = new Set();
  for (let s = 1; s <= 200; s++) for (const it of pickRound(ITEMS, { known: all, today: T, seed: s })) seenIds.add(it.id);
  assert.ok(seenIds.size >= 20, `씨앗마다 다른 판 — ${seenIds.size}`);
  // 🐣 이상인 칸만
  const known = new Set(['mix.order', 'dec.add', 'ang.tri', 'big.five']);
  for (let s = 1; s <= 50; s++) assert.ok(pickRound(ITEMS, { known, today: T, seed: s }).every((it) => known.has(it.cell)));
  assert.equal(pickRound(ITEMS, { known: new Set(['mix.order', 'mix.paren', 'dec.add']), today: T, seed: 1 }).length, 2, '아는 줄기가 둘이면 둘');
  // 🤔 칸 먼저
  for (let s = 1; s <= 30; s++) assert.ok(pickRound(ITEMS, { known: all, noted: new Set(['fac.lcm']), today: T, seed: s }).some((it) => it.id === 'D27'));
  // 🤔 칸이라도 오늘 이미 본 문제는 뒤로 — 같은 줄기의 안 본 문제가 대신 (변이 검사: 최근 7일 규칙을 없애도 안 본 것이 앞이라 못 잡았다)
  for (let s = 1; s <= 30; s++) {
    const p = pickRound(ITEMS, { known: all, noted: new Set(['fac.lcm']), seen: { D27: T }, today: T, seed: s });
    assert.ok(!p.some((it) => it.id === 'D27'), `오늘 본 D27은 뒤로 (씨앗 ${s})`);
  }
  assert.ok(pickRound(ITEMS, { known: all, noted: new Set(['fac.lcm']), seen: { D27: '2026-10-01' }, today: T, seed: 1 }).some((it) => it.id === 'D27'), '7일이 지나면 🤔 칸이 다시 먼저');
  // 최근 7일에 본 문제는 뒤로 — 안 본 것이 있으면 그것부터
  const seen = {};
  for (const it of ITEMS) if (stemOfCell(it.cell) !== 'are') seen[it.id] = T;
  for (let s = 1; s <= 30; s++) {
    const p = pickRound(ITEMS, { known: all, seen, today: T, seed: s });
    assert.ok(p.some((it) => stemOfCell(it.cell) === 'are'), '안 본 줄기가 먼저');
    assert.equal(p.length, ROUND_N, '모자라면 본 것으로 채운다');
  }
  const old = { D21: '2026-10-01' };
  const seenAll = Object.fromEntries(ITEMS.map((it) => [it.id, T]));
  Object.assign(seenAll, old);
  assert.ok(pickRound(ITEMS, { known: all, seen: seenAll, today: T, seed: 3 }).some((it) => it.id === 'D21'), '오래전에 본 것이 다시 앞으로');
  assert.equal(SEEN_DAYS, 7);
});

test('🕵️ 처음 답(answerRule) — 그날 문제·걸음마다 처음 답만 적고 센다 · 다시 눌러도 안 바뀐다 · 바르게 고치면(solve) 고친 숙제 하나 — 틀린 보기를 먼저 골랐어도 · 처음에 놓친 칸은 문제마다 하루 한 번 · 본 날 · 다음 날은 새로 · 엉뚱한 값은 무시', () => {
  const m = {};
  assert.equal(answerRule(m, { id: 'D1', cell: 'mix.addsub', step: 'line', ok: false }, T).firstOfDay, true);
  assert.equal(answerRule(m, { id: 'D1', cell: 'mix.addsub', step: 'line', ok: true }, T).firstOfDay, false, '두 번째 누름은 안 센다');
  // 화면 차례 그대로 — 처음 고른 보기가 틀림(fix 0) → 바른 보기를 골라 다 고침(solve) · 화면은 바른 보기를 고를 때 fix를 다시 적지 않는다 (Codex 105차 #6)
  answerRule(m, { id: 'D1', cell: 'mix.addsub', step: 'fix', ok: false }, T);
  answerRule(m, { id: 'D1', cell: 'mix.addsub', step: 'solve', ok: true }, T);
  assert.equal(answerRule(m, { id: 'D1', cell: 'mix.addsub', step: 'solve', ok: true }, T).firstOfDay, false, '같은 날 두 번 고쳐도 한 번');
  let s = detectOf(m.detect);
  assert.deepEqual(s.first, { d: T, r: { D1: { l: 0, f: 0, s: 1 } } });
  assert.deepEqual([s.lineOk, s.lineN, s.fixOk, s.fixN, s.done], [0, 1, 0, 1, 1]);
  assert.deepEqual(s.miss, { 'mix.addsub': 1 }, '놓친 칸은 문제마다 하루 한 번');
  assert.equal(s.seen.D1, T);
  answerRule(m, { id: 'D7', cell: 'dec.add', step: 'line', ok: true }, T);
  answerRule(m, { id: 'D7', cell: 'dec.add', step: 'fix', ok: true }, T);
  assert.equal(detectOf(m.detect).done, 1, 'fix만으로는 고친 숙제를 세지 않는다');
  answerRule(m, { id: 'D7', cell: 'dec.add', step: 'solve', ok: true }, T);
  s = detectOf(m.detect);
  assert.deepEqual(s.first.r.D7, { l: 1, f: 1, s: 1 });
  assert.deepEqual([s.lineOk, s.lineN, s.fixOk, s.fixN, s.done], [1, 2, 1, 2, 2]);
  // 다음 날 — 처음 답은 새로 · 센 수는 이어서
  answerRule(m, { id: 'D1', cell: 'mix.addsub', step: 'line', ok: true }, T2);
  s = detectOf(m.detect);
  assert.deepEqual(s.first, { d: T2, r: { D1: { l: 1 } } });
  assert.equal(s.lineN, 3);
  assert.equal(s.seen.D1, T2);
  // 엉뚱한 값
  const m2 = {};
  for (const a of [{ id: 'nope', cell: 'x', step: 'line', ok: true }, { id: 'D1', cell: 'mix.addsub', step: 'jump', ok: true }]) assert.equal(answerRule(m2, a, T).firstOfDay, false);
  assert.equal(answerRule(m2, { id: 'D1', cell: 'mix.addsub', step: 'line', ok: true }, 'today').firstOfDay, false);
  assert.deepEqual(detectOf(m2.detect).first, { d: '', r: {} });
});

test('🕵️ 판 끝(finishRule) — 그날 처음 끝낸 판만 💰10 + 🎯 1번 · 🔷는 판의 셋을 모두 한 번에 고치고 그날 처음 답에 틀린 것이 없을 때만(틀린 뒤 그만두고 새 판을 열어도 못 뽑는다) · 둘째 판은 보상 없음', () => {
  const ids = ['D1', 'D7', 'D13'];
  const cellOf = (id) => ITEMS.find((x) => x.id === id).cell;
  const allRight = (m, list, day = T) => { for (const id of list) for (const step of ['line', 'fix', 'solve']) answerRule(m, { id, cell: cellOf(id), step, ok: true }, day); };
  const m = {};
  allRight(m, ids);
  assert.deepEqual(finishRule(m, T, ids, true), { first: true, coin: REWARD.coin, throws: REWARD.throws, stone: REWARD.stone });
  assert.equal(detectOf(m.detect).day[T], 2);
  assert.deepEqual(finishRule(m, T, ids, true), { first: false, coin: 0, throws: 0, stone: 0 }, '둘째 판');
  assert.equal(detectOf(m.detect).sets, 2);
  // 판 안에 하나라도 처음에 틀리면 🔷 없음 (perfect를 잘못 넘겨도 그날 처음 답이 막는다)
  const m2 = {};
  allRight(m2, ['D1', 'D7']);
  answerRule(m2, { id: 'D13', cell: cellOf('D13'), step: 'line', ok: true }, T);
  answerRule(m2, { id: 'D13', cell: cellOf('D13'), step: 'fix', ok: false }, T);
  answerRule(m2, { id: 'D13', cell: cellOf('D13'), step: 'solve', ok: true }, T);
  assert.deepEqual(finishRule(m2, T, ids, true), { first: true, coin: REWARD.coin, throws: REWARD.throws, stone: 0 });
  assert.equal(detectOf(m2.detect).day[T], 1);
  // 그만두고 새 판 — 앞 판에서 틀린 처음 답이 남아 🔷를 못 뽑는다
  const m3 = {};
  answerRule(m3, { id: 'D20', cell: cellOf('D20'), step: 'line', ok: false }, T);
  allRight(m3, ids);
  assert.equal(finishRule(m3, T, ids, true).stone, 0);
  // 🔍 Codex 105차 #1 — 앞 판에서 D1을 한 번에 맞히고 그만둠 → 새 판에서 D1을 이번엔 틀림(그날 처음 답은 그대로 1) → 이번 판이 한 번에가 아니면 🔷 없음
  const m5 = {};
  allRight(m5, ['D1']);
  allRight(m5, ['D7', 'D13']);
  assert.equal(finishRule(m5, T, ids, false).stone, 0, '이번 판에서 틀렸으면 🔷 없음');
  assert.equal(detectOf(m5.detect).day[T], 1, '💰·🎯는 그대로');
  // 문제 수가 셋이 아니면 🔷 없음 · 다음 날은 다시 받는다 · perfect를 안 넘기면 🔷 없음
  const m4 = {};
  allRight(m4, ['D1', 'D7']);
  assert.equal(finishRule(m4, T, ['D1', 'D7'], true).stone, 0);
  allRight(m4, ids, T2);
  assert.deepEqual(finishRule(m4, T2, ids, true), { first: true, coin: REWARD.coin, throws: REWARD.throws, stone: REWARD.stone });
  const m6 = {};
  allRight(m6, ids);
  assert.equal(finishRule(m6, T, ids).stone, 0, 'perfect 기본값은 false');
});

test('🔍 Codex 105차 — 처음 답 줄(answerQueue): 저장에 성공한 답만 뺀다 · 실패하면 남겨 두고 다음에 다시 · 저장하는 사이 들어온 답도 이어서 · 판 끝은 남은 답을 먼저 적고 🔷 판정(저장 실패 뒤 나갔다가 새 판을 해도 틀린 답이 남는다) · 누른 날로 적고 늦은 전날 답은 오늘을 건드리지 않는다', async () => {
  const defer = () => { let res; let rej; const p = new Promise((a, b) => { res = a; rej = b; }); return { p, res, rej }; };
  // 기본 — 저장되면 빠지고 onSaved
  const seen = [];
  const q1 = answerQueue(async (b) => b.map((a) => a.id), (v) => seen.push(v));
  assert.equal(await q1.push({ id: 'D1' }), true);
  assert.equal(q1.size, 0);
  assert.deepEqual(seen, [['D1']]);
  // 실패하면 남는다 → 다시 저장
  let fail = true;
  const q2 = answerQueue(async (b) => { if (fail) throw new Error('저장 실패'); return b.length; });
  assert.equal(await q2.push({ id: 'D2' }), false);
  assert.equal(q2.size, 1);
  assert.equal(q2.failed, true);
  fail = false;
  assert.equal(await q2.flush(), true);
  assert.equal(q2.size, 0);
  assert.equal(q2.failed, false);
  // 저장하는 사이 들어온 답 — 같은 흐름에서 이어 저장 · 성공한 것만 뺀다
  const gates = [defer(), defer()];
  const batches = [];
  let n = 0;
  const q3 = answerQueue(async (b) => { batches.push(b.map((a) => a.id)); await gates[n++].p; return true; });
  const a1 = { id: 'D3' }; const a2 = { id: 'D4' };
  const run = q3.push(a1);
  assert.equal(q3.busy, true);
  q3.push(a2);
  gates[0].res();
  await new Promise((r) => setTimeout(r, 0));
  gates[1].res();
  assert.equal(await run, true);
  assert.deepEqual(batches, [['D3'], ['D4']]);
  assert.equal(q3.size, 0);
  // snapshot · drop — 판 끝 트랜잭션이 남은 답을 가져가 성공하면 그것만 지운다
  const q4 = answerQueue(async () => { throw new Error('x'); });
  const b1 = { id: 'D5' }; const b2 = { id: 'D6' };
  await q4.push(b1); await q4.push(b2);
  const snap = q4.snapshot();
  assert.deepEqual(snap.map((a) => a.id), ['D5', 'D6']);
  q4.drop([b1]);
  assert.deepEqual(q4.snapshot().map((a) => a.id), ['D6']);
  // 🔍 #2 — 처음 답(틀림)을 누르고 나갔는데 저장이 실패 → 새 판에서 셋 다 한 번에 → 판 끝이 남은 답을 먼저 적어 🔷가 막힌다
  const m = {};
  const ids = ['D1', 'D7', 'D13'];
  const cellOf = (id) => ITEMS.find((x) => x.id === id).cell;
  const q5 = answerQueue(async () => { throw new Error('저장 실패'); });
  await q5.push({ id: 'D20', cell: cellOf('D20'), step: 'line', ok: false, d: T });
  assert.equal(q5.size, 1, '실패한 처음 답은 줄에 남는다');
  for (const id of ids) for (const step of ['line', 'fix', 'solve']) answerRule(m, { id, cell: cellOf(id), step, ok: true, d: T }, T);
  const batch = q5.snapshot();
  for (const a of batch) answerRule(m, a, T);
  assert.equal(finishRule(m, T, ids, true).stone, 0, '남은 틀린 답이 🔷를 막는다');
  assert.equal(detectOf(m.detect).first.r.D20.l, 0);
  q5.drop(batch);
  assert.equal(q5.size, 0);
  // 🔍 #7 — 누른 날로 적는다(저장이 자정을 넘겨도) · 늦게 도착한 전날 답은 오늘 기록을 건드리지 않는다
  const md = {};
  answerRule(md, { id: 'D1', cell: 'mix.addsub', step: 'line', ok: false, d: T }, T2);
  assert.equal(detectOf(md.detect).first.d, T, '누른 날(T)');
  answerRule(md, { id: 'D7', cell: 'dec.add', step: 'line', ok: true, d: T2 }, T2);
  assert.deepEqual(detectOf(md.detect).first, { d: T2, r: { D7: { l: 1 } } });
  assert.equal(answerRule(md, { id: 'D13', cell: 'big.five', step: 'line', ok: false, d: T }, T2).firstOfDay, false, '늦은 전날 답');
  assert.deepEqual(detectOf(md.detect).first, { d: T2, r: { D7: { l: 1 } } }, '오늘 기록은 그대로');
  assert.equal(detectOf(md.detect).seen.D1, T);
  answerRule(md, { id: 'D1', cell: 'mix.addsub', step: 'line', ok: true, d: T2 }, T2);
  answerRule(md, { id: 'D1', cell: 'mix.addsub', step: 'line', ok: true, d: T }, T2);
  assert.equal(detectOf(md.detect).seen.D1, T2, '본 날은 늦은 답이 되돌리지 않는다');
});

test('🔍 Codex 105차 — 고친 원고: D9 틀린 보기는 정말 10을 더한 값 · D25 보기는 약수 목록에 두 번 · D19 풀이는 받아내린 뒤 4 · D12 세로셈과 0.01이 32개', () => {
  const it = (id) => ITEMS.find((x) => x.id === id);
  assert.equal(it('D9').opts[2], '= 11.68');
  assert.ok(eq(valueOf(it('D9').opts[2]), add(parse('1.68'), parse('10'))) && /10을 더했어요/.test(it('D9').no[2]), 'D9 「10을 더했어요」 = 1.68 + 10');
  assert.equal(it('D25').opts[1], '8 × 8 — 약수에 8을 두 번 적어요');
  assert.match(it('D19').no[1], /십의 자리는 4예요\. 4에서 6을/);
  assert.doesNotMatch(it('D19').no[1], /5에서 6을/);
  assert.equal(it('D12').lines[1], '세로셈: 8 ÷ 8 = 1, 그다음 32 ÷ 8 = 4');
  assert.match(it('D12').okWhy[1], /0\.01이 32개/);
  assert.match(it('D12').no[2], /0\.01이 32개라 ÷ 8 하면 0\.01이 4개/);
});

test('🕵️ 기록 고쳐 읽기·합치기 — 받은 날은 날마다 큰 쪽 · 센 수·놓친 수는 큰 쪽 · 본 날은 나중 · 같은 날 처음 답은 틀린 쪽 · 다른 날이면 나중 날 · 깨진 값은 처음 값 · db.mergeMath·cloneMath', () => {
  const a = { day: { [T]: 1 }, first: { d: T, r: { D1: { l: 1, f: 1 }, D2: { l: 1, s: 1 } } }, seen: { D1: T, D2: '2026-10-10' }, sets: 3, done: 5, lineOk: 4, lineN: 6, fixOk: 2, fixN: 6, miss: { 'mix.order': 2 } };
  const b = { day: { [T]: 2, '2026-10-18': 1 }, first: { d: T, r: { D1: { l: 0 }, D3: { f: 1, s: 1 } } }, seen: { D2: T, D3: T }, sets: 2, done: 7, lineOk: 3, lineN: 8, fixOk: 5, fixN: 5, miss: { 'mix.order': 1, 'dec.add': 3 } };
  const m = mergeDetect(a, b);
  assert.deepEqual(m.day, { [T]: 2, '2026-10-18': 1 });
  assert.deepEqual(m.first, { d: T, r: { D1: { l: 0, f: 1 }, D2: { l: 1, s: 1 }, D3: { f: 1, s: 1 } } }, '고친 표시(s)는 한쪽에만 있어도 남는다');
  assert.deepEqual(m.seen, { D1: T, D2: T, D3: T });
  assert.deepEqual([m.sets, m.done, m.lineOk, m.lineN, m.fixOk, m.fixN], [3, 7, 4, 8, 5, 6]);
  assert.deepEqual(m.miss, { 'mix.order': 2, 'dec.add': 3 });
  assert.deepEqual(mergeDetect(a, b), mergeDetect(b, a), '차례와 상관없이 같다');
  const later = mergeDetect(a, { first: { d: T2, r: { D9: { l: 1 } } } });
  assert.deepEqual(later.first, { d: T2, r: { D9: { l: 1 } } });
  assert.deepEqual(detectOf({ day: { nope: 3, [T]: 9 }, first: { d: 'x', r: { D1: { l: 1 } } }, seen: { D1: 'soon', bad: T }, sets: -2, miss: { '<x>': 4 } }),
    { day: { [T]: 2 }, first: { d: '', r: {} }, seen: {}, sets: 0, done: 0, lineOk: 0, lineN: 0, fixOk: 0, fixN: 0, miss: {} });
  // db — 복사는 안쪽까지 새 객체 · 병합은 mergeDetect
  const rec = { ...emptyMath(), detect: copy(a) };
  const c = cloneMath(rec);
  c.detect.first.r.D1.l = 0;
  c.detect.seen.D9 = T;
  assert.equal(rec.detect.first.r.D1.l, 1);
  assert.equal(rec.detect.seen.D9, undefined);
  assert.deepEqual(mergeMath({ ...emptyMath(), detect: a }, { ...emptyMath(), detect: b }).detect, m);
  assert.equal(cloneMath(emptyMath()).detect, undefined, '없으면 만들지 않는다');
});

test('🕵️ 📤 수학 요약 줄 — 끝낸 판 · 고친 숙제 · 처음 답 · 최근 7일 한 날 · 처음에 놓친 칸(많은 차례로 다섯, 칸 이름으로) · 오늘 보상 줄', () => {
  const raw = { day: { [T]: 1, '2026-10-15': 2, '2026-10-01': 1 }, sets: 4, done: 12, lineOk: 9, lineN: 12, fixOk: 10, fixN: 12, miss: { 'dec.add': 3, 'mix.order': 1, 'fac.lcm': 2 } };
  const line = detectReport(raw, T, nameOf);
  assert.ok(line.startsWith('🕵️ 나옹의 숙제 — 끝낸 판 4 · 고친 숙제 12 · 처음에 틀린 줄을 찾음 9/12 · 처음에 바르게 고침 10/12 · 최근 7일 한 날 2'), line);
  assert.ok(line.includes(`처음에 놓친 칸: ${nameOf('dec.add')}×3, ${nameOf('fac.lcm')}×2, ${nameOf('mix.order')}×1`), line);
  assert.equal(detectReport(undefined, T), '🕵️ 나옹의 숙제 — 끝낸 판 0 · 고친 숙제 0 · 처음에 틀린 줄을 찾음 0/0 · 처음에 바르게 고침 0/0 · 최근 7일 한 날 0');
  assert.ok(mathReportText({ ...emptyMath(), detect: raw }, T).includes('🕵️ 나옹의 숙제 — 끝낸 판 4'));
  assert.match(detectTodayLine(0), /💰10 · 🎯 포켓몬 잡기 1번/);
  assert.match(detectTodayLine(1), /오늘의 숙제 끝 ✅/);
  assert.match(detectTodayLine(2), /🔷까지/);
});

test('🕵️ 화면 연결 — 사다리 머리 🧩 아래·줄기 고르기에 단추 · ⏳ guardStart · 처음 답은 그 순간 updateMath(answerRule) · 판 끝은 commitChalRound(finishRule + 🎯 addPending) · 🎒에서 돌아오면 이어서 · 사다리·홈으로 나가면 판을 버림(못 적은 처음 답은 뒤에서) · sw v299·셸·check.mjs·css', () => {
  const math = read('js/math.js');
  assert.ok(math.includes("import { detectButton, detectActive, resumeDetect, endDetect } from './detectiveview.js';"));
  assert.ok(math.includes('  head.appendChild(detectButton(detectCtx())); // 🕵️ 나옹의 숙제 봐 주기 — 🧩 아래 (v299)'));
  assert.ok(math.indexOf('head.appendChild(detectButton(detectCtx()))') > math.indexOf('head.appendChild(puzzleButton(puzzleCtx()))'), '🧩 아래');
  assert.ok(math.includes('  card.appendChild(detectButton(detectCtx())); // 🕵️ 나옹의 숙제도 줄기와 상관없이 (v299)'));
  assert.ok(math.includes('  if (detectActive()) { ui.run++; resumeDetect(detectCtx()); return; }'));
  assert.ok(math.includes('  endDetect(); // 🕵️ 나옹의 숙제 판도 (v299'));
  assert.ok(math.includes('ui.daily = null; endDetect(); endChal(); endPuzzle(); ui.run++; showView(\'home\'); });'), '← 홈도 판을 버린다');
  assert.ok(math.includes('rich: richNode,') && math.includes('cells: detectCells'), '글은 richNode · 칸 원고');
  const v = read('js/detectiveview.js');
  assert.ok(v.includes("b.addEventListener('click', () => guardStart('math', () => startDetect(ctx)));"));
  assert.ok(v.includes('  (batch) => updateMath((mm) => { for (const a of batch) answerRule(mm, a, todayKey()); }),'), '처음 답 줄은 판과 따로 하나 (Codex 105차 #2)');
  assert.ok(v.includes('  Q.push({ ...ans, d: todayKey() }).then((ok) => {'), '누른 날을 붙인다 (Codex 105차 #7)');
  assert.ok(v.includes("if (ds.firstLine === null) { ds.firstLine = ok; enqueue(ctx, { id: it.id, cell: it.cell, step: 'line', ok }); }"), '처음 누른 줄은 그 순간 저장');
  assert.ok(v.includes("if (ds.firstFix === null) { ds.firstFix = ok; enqueue(ctx, { id: it.id, cell: it.cell, step: 'fix', ok }); }"), '처음 고른 보기도');
  assert.ok(v.includes("    enqueue(ctx, { id: it.id, cell: it.cell, step: 'solve', ok: true });"), '바르게 고친 것 (Codex 105차 #6)');
  assert.ok(v.includes('  const perfect = ds.results.length === ds.items.length && ds.results.every((r) => r && r.line && r.fix);'), '이번 판 셋 다 한 번에 (Codex 105차 #1)');
  assert.ok(v.includes('      for (const a of batch) answerRule(s, a, today);\n      const r = finishRule(s, today, ids, perfect);\n      if (r.throws) addPending(s, r.throws);\n      return { result: r, reward: { xp: 0, coin: r.coin, items: {}, stone: r.stone, throws: r.throws } };'), '판 끝은 못 적은 처음 답부터');
  assert.ok(v.includes('  if (saved && saved.ok) Q.drop(batch);'), '판 끝이 성공한 것만 줄에서 뺀다');
  assert.ok(v.includes('  if (Q.size) Q.flush().catch(() => {});'), '나갈 때 못 적은 처음 답(실패하면 줄에 남는다)');
  assert.ok(!/flushLater|queue\.splice|ds\.queue/.test(v), '옛 판 안 대기열은 없다');
  assert.ok(v.includes('if (planRound(ctx, 0).length < ROUND_N) return;'), '셋이 안 되면 단추를 안 그린다');
  assert.ok(v.includes("if (!ds || ds.phase !== 'done' || Q.busy || ds.saveErr || Q.size) return;"), '저장이 끝나야 다음 숙제');
  assert.equal(/from '\.\/math\.js'/.test(v), false, 'math.js를 import하지 않는다');
  assert.equal(/^import /m.test(read('js/detective.js')), false, '규칙 파일은 import 없음');
  // 헤드리스 390 — 단추 아래 안내 글이 공책(.dtv-note)으로 그려졌다 · 찾는 단계에서 첫 줄에 초점 테두리가 생기면 고른 줄처럼 보였다
  assert.ok(v.includes("'math-note dtv-slot-note'") && !v.includes("'math-note dtv-note'"));
  assert.ok(v.includes(": ds.phase === 'fix' ? card.querySelector('.dtv-opt:not(:disabled)') : null;"));
  const sw = read('sw.js');
  assert.ok(Number((/const CACHE_VERSION = 'v(\d+)';/.exec(sw) || [])[1]) >= 299, 'sw v299 이상');
  for (const f of ["'./js/detective.js',", "'./js/detectiveview.js',", "'./coach/math/detective.json',"]) assert.ok(sw.includes(f), f);
  assert.ok(read('tools/check.mjs').includes("for (const msg of checkDetective(data, cells)) { bad++; console.error(`내용 오류: coach/math/detective.json: ${msg}`); }"));
  const css = read('css/style.css');
  for (const c of ['.dtv-btn {', '.dtv-note {', '.dtv-ln {', '.dtv-ln.is-wrong .dtv-t, .dtv-ln.is-follow .dtv-t {', '.dtv-fix {', '.dtv-opt {', '.dtv-done {']) assert.ok(css.includes(`\n${c}`), c);
  assert.equal(/\.dtv[^{\n]*\{[^}\n]*font: [^;]*inherit/.test(css), false, 'font 줄임말에 inherit를 쓰지 않는다');
});
