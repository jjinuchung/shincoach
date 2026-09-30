// 🔢 G 약수와 배수 줄기 생성기 테스트: node --test tests/mathfac.test.js
//
// ★ 핵심은 **독립 검산** — 생성기가 알려 주는 값(probe)을 믿지 않고 **문제 글을 이 파일이 직접 읽어** 다시 푼다.
//   약수·최대공약수·최소공배수 계산기도 이 파일에서 새로 짠다 (생성기의 gcd/lcm을 쓰면 검산이 아니다).
// ★ 이름표는 값만이 아니라 **방향**까지 — Codex 13차(비와 비율)가 "뺌"에 "더함", 비교량 자리에 "기준량"을 잡았다.
// ★ 씨앗은 개념마다 수천 개 (FAC_SEEDS=20000으로 넓게).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  FACTOR, TAGS, makeQuestion, makeRound, conceptById, ladder, placeFrom, diagnosticSet, lessonOf, checkContent, gradeLabel,
} from '../js/mathfac.js';

const OPTS = { names: ['피카츄', '리자몽', '개굴닌자'], me: '진우', worlds: { pokemon: [], toystory: [], minions: [], moana: [] } };
const SEEDS = Number(process.env.FAC_SEEDS) || 1500;

// ── 독립 계산기 ──
const G = (a, b) => (b ? G(b, a % b) : a);
const LCM = (a, b) => (a / G(a, b)) * b;
const DIVS = (n) => { const o = []; for (let d = 1; d <= n; d++) if (n % d === 0) o.push(d); return o; };
const SP = (n) => { let p = 2; while (n % p) p++; return p; }; // 1 다음으로 작은 약수
const nums = (t) => (String(t).match(/\d+/g) || []).map(Number);
const listOf = (t) => (/^\d+(, \d+)+$/.test(String(t).trim()) ? nums(t) : null);
const same = (x, y) => JSON.stringify(x) === JSON.stringify(y);

/** 약수·배수 문장이 참인가 — "3과 4는 12의 약수예요" · "12는 3의 배수예요" · "12와 3은 약수와 배수의 관계가 아니에요" */
function relTruth(t) {
  const s = String(t).trim();
  let m;
  if ((m = /^(\d+)[과와] (\d+)[은는] (\d+)의 (약수|배수)예요$/.exec(s))) {
    const [x, y, z] = [m[1], m[2], m[3]].map(Number);
    return m[4] === '약수' ? z % x === 0 && z % y === 0 : x % z === 0 && y % z === 0;
  }
  if ((m = /^(\d+)[은는] (\d+)의 (약수|배수)예요$/.exec(s))) {
    const [x, z] = [m[1], m[2]].map(Number);
    return m[3] === '약수' ? z % x === 0 : x % z === 0;
  }
  if ((m = /^(\d+)[과와] (\d+)[은는] 약수와 배수의 관계가 아니에요$/.exec(s))) {
    const [x, y] = [m[1], m[2]].map(Number);
    return !(x % y === 0 || y % x === 0);
  }
  if ((m = /^(\d+)[과와] (\d+)$/.exec(s))) { const [x, y] = [m[1], m[2]].map(Number); return y % x === 0 || x % y === 0; }
  return null;
}
const flipRel = (t) => String(t).replace(/(약수|배수)예요$/, (_, w) => (w === '약수' ? '배수예요' : '약수예요'));

/** 나눗셈 사다리를 글에서 읽는다 — 매 줄이 정말 나누어떨어지는지, 마지막 두 수가 더 나눌 수 없는지까지 */
function readLadder(q) {
  const head = /^(\d+)[과와] (\d+)[을를] 공약수로 계속 나눴어요/.exec(q);
  if (!head) return null;
  let [x, y] = [Number(head[1]), Number(head[2])];
  const left = [];
  for (const m of q.matchAll(/· (\d+)(?:으로|로) 나누면 → (\d+), (\d+)/g)) {
    const d = Number(m[1]);
    assert.ok(x % d === 0 && y % d === 0, `사다리: ${x}, ${y}는 ${d}로 나누어떨어지지 않는다 — ${q}`);
    assert.deepEqual([x / d, y / d], [Number(m[2]), Number(m[3])], `사다리 몫이 틀렸다 — ${q}`);
    [x, y] = [x / d, y / d]; left.push(d);
  }
  assert.equal(G(x, y), 1, `사다리가 끝나지 않았다 (${x}, ${y}) — ${q}`);
  return { a: Number(head[1]), b: Number(head[2]), left, m: x, n: y };
}
/** 곱셈식을 글에서 읽는다 — 곱이 정말 그 수인지까지 */
function readFactors(q) {
  const ls = [...q.matchAll(/^(\d+) = (\d+(?: × \d+)+)$/gm)];
  if (ls.length !== 2) return null;
  for (const m of ls) assert.equal(nums(m[2]).reduce((p, v) => p * v, 1), Number(m[1]), `곱셈식이 틀렸다: ${m[0]}`);
  return { a: Number(ls[0][1]), b: Number(ls[1][1]), fa: nums(ls[0][2]), fb: nums(ls[1][2]) };
}

/**
 * 문제 글 → 정답 (생성기와 따로)
 * { list: [...] } · { v: 수 } · { one: (수) => 참 } 보기 중 딱 하나만 참 · { rel: true } 문장 참거짓 · ctx: 이름표 확인용 재료
 */
function solveText(q0) {
  const q = String(q0).replace(/\*\*/g, '');
  let m;
  // 사다리·곱셈식은 먼저 (둘 다 "최대공약수/최소공배수는 얼마"로 끝난다)
  const lad = readLadder(q);
  if (lad) {
    const { a, b } = lad; const ctx = { a, b, lad };
    if (/최대공약수는 얼마일까요\?$/.test(q)) return { v: G(a, b), ctx };
    if (/최소공배수는 얼마일까요\?$/.test(q)) return { v: LCM(a, b), ctx };
    return { ctx }; // ② 문항 — 보여 준 말은 따로 본다
  }
  const fac = readFactors(q);
  if (fac) {
    const { a, b } = fac; const ctx = { a, b, fac };
    if (/의 최대공약수를 구하면/.test(q)) return { v: G(a, b), ctx };
    if (/의 최소공배수를 구하면/.test(q)) return { v: LCM(a, b), ctx };
    return null;
  }
  // 약수
  if ((m = /^(\d+)의 약수를 모두 구하면/.exec(q)) || (m = /몬스터볼 (\d+)개를 상자에 남김없이 똑같이 나눠 담으려고 해요\. 상자 수가 될 수 있는 수를 모두/.exec(q))) return { list: DIVS(+m[1]), ctx: { N: +m[1] } };
  if ((m = /^(\d+)의 약수는 모두 몇 개/.exec(q))) return { v: DIVS(+m[1]).length, ctx: { N: +m[1] } };
  if ((m = /^다음 중 (\d+)의 약수가 아닌 수는/.exec(q))) return { one: (x) => +m[1] % x !== 0, ctx: { N: +m[1] } };
  // 배수
  if ((m = /^(\d+)의 배수를 작은 수부터 (\d+)개 쓰면/.exec(q))) return { list: Array.from({ length: +m[2] }, (_, i) => +m[1] * (i + 1)), ctx: { k: +m[1] } };
  if ((m = /^(\d+)의 배수 중에서 (\d+)번째로 작은 수/.exec(q))) return { v: +m[1] * +m[2], ctx: { k: +m[1], m: +m[2] } };
  if ((m = /^다음 중 (\d+)의 배수는 어느/.exec(q)) || (m = /하루에 몬스터볼을 (\d+)개씩 모아요\. 며칠 동안 모은 몬스터볼 수가 될 수 있는 것은/.exec(q))) return { one: (x) => x % +m[1] === 0, ctx: { k: +m[1] } };
  // 약수와 배수의 관계
  if ((m = /^곱셈식 (\d+) × (\d+) = (\d+)[을를] 보고 바르게 말한 것은/.exec(q)) || (m = /^(\d+) × (\d+) = (\d+)에서 \d+[과와] \d+의 관계를 바르게/.exec(q))) {
    assert.equal(+m[1] * +m[2], +m[3], `곱셈식이 틀렸다: ${q}`);
    return { rel: true, ctx: { a: +m[1], b: +m[2], N: +m[3] } };
  }
  if (/^두 수가 약수와 배수의 관계인 것은/.test(q)) return { rel: true, ctx: {} };
  // 공약수·최대공약수
  if ((m = /^(\d+)[과와] (\d+)의 공약수를 모두 구하면/.exec(q))) return { list: DIVS(G(+m[1], +m[2])), ctx: { a: +m[1], b: +m[2] } };
  if ((m = /^(\d+)[과와] (\d+)의 최대공약수가 (\d+)일 때, 두 수의 공약수를 모두/.exec(q))) {
    assert.equal(G(+m[1], +m[2]), +m[3], `문제가 알려 준 최대공약수가 틀렸다: ${q}`);
    return { list: DIVS(+m[3]), ctx: { a: +m[1], b: +m[2] } };
  }
  if ((m = /^(\d+)[과와] (\d+)의 최대공약수(?:는 얼마|를 구하면)/.exec(q))) return { v: G(+m[1], +m[2]), ctx: { a: +m[1], b: +m[2] } };
  // 공배수·최소공배수
  if ((m = /^(\d+)[과와] (\d+)의 공배수를 작은 수부터 (\d+)개/.exec(q))) { const L = LCM(+m[1], +m[2]); return { list: Array.from({ length: +m[3] }, (_, i) => L * (i + 1)), ctx: { a: +m[1], b: +m[2] } }; }
  if ((m = /^(\d+)[과와] (\d+)의 최소공배수가 (\d+)일 때, 두 수의 공배수가 아닌 것은/.exec(q))) {
    assert.equal(LCM(+m[1], +m[2]), +m[3], `문제가 알려 준 최소공배수가 틀렸다: ${q}`);
    return { one: (x) => x % +m[1] !== 0 || x % +m[2] !== 0, ctx: { a: +m[1], b: +m[2] } };
  }
  if ((m = /^(\d+)[과와] (\d+)의 최소공배수(?:는 얼마|를 구하면)/.exec(q))) return { v: LCM(+m[1], +m[2]), ctx: { a: +m[1], b: +m[2] } };
  // 활용 — 말을 읽어 무엇을 구할지 정한다
  if ((m = /나무열매 (\d+)개와 포션 (\d+)개를 친구들에게 남김없이 똑같이 나눠 주려고 해요\. 최대 몇 명/.exec(q))) return { v: G(+m[1], +m[2]), ctx: { a: +m[1], b: +m[2] } };
  if ((m = /나무열매 (\d+)개와 포션 (\d+)개를 최대한 많은 친구에게 남김없이 똑같이 나눠 주려고 해요\. 한 명이 받는 포션/.exec(q))) return { v: +m[2] / G(+m[1], +m[2]), ctx: { a: +m[1], b: +m[2] } };
  if ((m = /(\d+)일마다, .+? (\d+)일마다 체육관에 와요\. 오늘 둘이 함께 왔다면, 다음에 함께 오는 날은/.exec(q))) return { v: LCM(+m[1], +m[2]), ctx: { a: +m[1], b: +m[2] } };
  if ((m = /가로 (\d+)cm, 세로 (\d+)cm인 종이를 남는 부분 없이 똑같은 정사각형으로 자르려고 해요\. 가장 큰 정사각형의 한 변/.exec(q))) return { v: G(+m[1], +m[2]), ctx: { a: +m[1], b: +m[2] } };
  return null;
}

test('독립 계산기·글 읽기 자체 점검', () => {
  assert.equal(G(24, 36), 12); assert.equal(LCM(4, 6), 12); assert.deepEqual(DIVS(12), [1, 2, 3, 4, 6, 12]); assert.equal(SP(9), 3);
  assert.equal(relTruth('3과 4는 12의 약수예요'), true); assert.equal(relTruth('12는 3의 약수예요'), false);
  assert.equal(relTruth('12와 5는 약수와 배수의 관계가 아니에요'), true); assert.equal(relTruth('4와 20'), true); assert.equal(relTruth('6과 20'), false);
  assert.equal(flipRel('12는 3의 약수예요'), '12는 3의 배수예요');
  const lad = readLadder('24와 36을 공약수로 계속 나눴어요.\n\n· 2로 나누면 → 12, 18\n· 6으로 나누면 → 2, 3 (더 나눌 수 없어요)');
  assert.deepEqual([lad.left, lad.m, lad.n], [[2, 6], 2, 3]);
  assert.equal(solveText('나무열매 12개와 포션 18개를 친구들에게 남김없이 똑같이 나눠 주려고 해요. 최대 몇 명에게 나눠 줄 수 있을까요?').v, 6);
  assert.equal(solveText('피카츄는 4일마다, 리자몽은 6일마다 체육관에 와요. 오늘 둘이 함께 왔다면, 다음에 함께 오는 날은 며칠 뒤일까요?').v, 12);
});

test('사다리: 8칸, 모두 초5, needs가 바로 앞 칸', () => {
  assert.equal(FACTOR.length, 8);
  const ids = FACTOR.map((c) => c.id);
  assert.equal(new Set(ids).size, 8);
  for (const [k, c] of FACTOR.entries()) {
    assert.ok(/^fac\./.test(c.id) && c.name && c.idea && c.slip, c.id);
    assert.equal(c.grade, 5);
    assert.deepEqual(c.needs, k ? [ids[k - 1]] : []);
  }
  assert.equal(gradeLabel(5), '초5');
});

test('★ 독립 검산: ① 정답이 문제 글을 따로 읽어 푼 답과 같다 · 딱 하나만 맞다', () => {
  for (const c of FACTOR) {
    for (let s = 1; s <= SEEDS; s++) {
      const q = makeQuestion(c.id, 'calc', s * 7919, OPTS);
      const where = `${c.id} seed ${s}: "${q.q.replace(/\n/g, ' ')}"`;
      const w = solveText(q.q);
      assert.ok(w, `${where} — 글을 못 읽었다 (해석기에 말투를 더할 것)`);
      const ok = q.choices.find((x) => x.ok).text;
      if (w.list) {
        assert.equal(ok, w.list.join(', '), `${where} — 정답 목록`);
        for (const ch of q.choices.filter((x) => !x.ok)) { const l = listOf(ch.text); assert.ok(!l || !same([...l].sort((x, y) => x - y), w.list), `${where} — 오답 ${ch.text}이 사실 정답`); }
      } else if (w.v !== undefined) {
        assert.equal(Number(ok), w.v, `${where} — 정답`);
        for (const ch of q.choices.filter((x) => !x.ok)) assert.notEqual(Number(ch.text), w.v, `${where} — 오답 ${ch.text}이 사실 정답`);
      } else if (w.one) {
        const hits = q.choices.filter((x) => w.one(Number(x.text)));
        assert.equal(hits.length, 1, `${where} — 조건에 맞는 보기가 ${hits.length}개 (${q.choices.map((x) => x.text).join(' / ')})`);
        assert.ok(hits[0].ok, `${where} — 맞는 보기가 정답 표시가 아니다`);
      } else if (w.rel) {
        const truths = q.choices.map((x) => relTruth(x.text));
        assert.ok(truths.every((t) => t !== null), `${where} — 못 읽는 문장 보기`);
        assert.equal(truths.filter(Boolean).length, 1, `${where} — 참인 문장이 ${truths.filter(Boolean).length}개`);
        assert.ok(q.choices[truths.indexOf(true)].ok, where);
      } else assert.fail(`${where} — 답을 정하지 못했다`);
    }
  }
});

test('★ 보기: 정답 하나, 글자 겹침 없음, 나오면 안 되는 글자 없음, 수가 너무 크지 않음', () => {
  for (const c of FACTOR) {
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
          const l = listOf(t);
          if (l) { assert.ok(l.length <= 13, `${where}: 너무 긴 목록 "${t}"`); assert.ok(same(l, [...l].sort((x, y) => x - y)), `${where}: 목록이 작은 수부터가 아니다 "${t}"`); }
          if (/^\d+$/.test(t)) assert.ok(Number(t) > 0 && !/^0/.test(t), `${where}: 모양이 이상한 수 "${t}"`);
        }
        const all = `${q.q} ${q.expr} ${JSON.stringify(q.solve)}`;
        assert.ok(!/undefined|NaN|null|\{(me|mon)/.test(all), `${where}: 글에 새는 것 — ${all.slice(0, 160)}`);
        // ① 문제 글은 200까지 — ②는 "16 × 20 = 320"처럼 틀린 곱을 보여 주는 게 문제라 500까지
        for (const n of nums(q.q)) assert.ok(n <= (kind === 'calc' ? 200 : 500), `${where}: 초5에게 너무 큰 수 ${n} — ${q.q}`);
        for (const ch of q.choices) for (const n of nums(ch.text)) assert.ok(n <= 3000, `${where}: 보기에 너무 큰 수 ${n}`);
      }
    }
  }
});

test('★ 오개념 이름표: 그 오답이 정말 그 실수다 — 값과 방향까지', () => {
  const seen = {};
  for (const c of FACTOR) {
    for (let s = 1; s <= SEEDS; s++) {
      const q = makeQuestion(c.id, 'calc', s * 31337, OPTS);
      const w = solveText(q.q); const x = w.ctx || {};
      const okText = q.choices.find((y) => y.ok).text;
      for (const ch of q.choices.filter((y) => !y.ok)) {
        const where = `${c.id} seed ${s}: "${ch.tag}" 오답 ${ch.text} — ${q.q.replace(/\n/g, ' ')}`;
        const v = Number(ch.text); const l = listOf(ch.text);
        const hit = (cond) => { seen[ch.tag] = (seen[ch.tag] || 0) + 1; assert.ok(cond, where); };
        const g = x.a ? G(x.a, x.b) : 0; const L = x.a ? LCM(x.a, x.b) : 0;
        switch (ch.tag) {
          case TAGS.missEnds:
            if (x.N && w.list) hit(same(l, w.list.slice(1, -1)));             // 약수에서 1과 자기 자신
            else if (x.N && w.v !== undefined) hit(v === w.v - 2);
            else if (x.N) hit(v === x.N);                                        // "약수가 아닌 것"에 자기 자신을 고름
            else hit(same(l, w.list.slice(1)));                                  // 공약수에서 1
            break;
          case TAGS.missPair:
            if (x.N) { const miss = w.list.filter((d) => !l.includes(d)); hit(l.every((d) => w.list.includes(d)) && miss.length === 2 && miss[0] * miss[1] === x.N && !miss.includes(1)); } else hit(same(l, [1, g]) && DIVS(g).length > 2);
            break;
          case TAGS.halfPairs: hit(v === w.v / 2); break;
          case TAGS.multAsDiv: { const base = x.N || g; hit(l && l[0] === base && l.every((y, i) => y === base * (i + 1))); break; }
          case TAGS.skipSelf: hit(same(l, [2, 3, 4, 5].map((i) => x.k * i))); break;
          case TAGS.divAsMult: hit(l ? same(l, DIVS(x.k)) : (x.k % v === 0 && v < x.k)); break;
          case TAGS.sameEnd: hit(l ? same(l, [0, 10, 20, 30].map((d) => x.k + d)) && l.some((y) => y % x.k) : (v === x.k + 10 && v % x.k !== 0)); break;
          case TAGS.addForMult: hit(v === x.k + x.m); break;
          case TAGS.swapRel: hit(relTruth(ch.text) === false && relTruth(flipRel(ch.text)) === true); break; // 약수↔배수를 바꾸면 참이 된다
          case TAGS.noRel: hit(relTruth(ch.text) === false && relTruth(flipRel(ch.text)) !== true); break;
          case TAGS.commonAsRel: { const [p1, p2] = nums(ch.text); hit(G(p1, p2) > 1 && p2 % p1 !== 0 && p1 % p2 !== 0); break; }
          case TAGS.allDiv: hit(same(l, [...new Set([...DIVS(x.a), ...DIVS(x.b)])].sort((y, z) => y - z))); break;
          case TAGS.oneSideDiv: hit(same(l, DIVS(x.a)) || same(l, DIVS(x.b))); break;
          case TAGS.smallCommon: hit(v === SP(g) && v < g); break;
          case TAGS.notGreatest: hit(g % v === 0 && v > 1 && v < g); break;
          case TAGS.lcmForGcd: hit(v === L); break;
          case TAGS.bottomProd: hit(v === x.lad.m * x.lad.n); break;
          case TAGS.stopEarly: hit(v === x.lad.left[0] && v < g); break;
          case TAGS.addLeft: hit(v === x.lad.left[0] + x.lad.left[1]); break;
          case TAGS.leftOnly: hit(v === x.lad.left[0] * x.lad.left[1] && v === g); break;
          case TAGS.prodAsLcm: hit(l ? same(l, [1, 2, 3].map((i) => x.a * x.b * i)) : v === x.a * x.b); break;
          case TAGS.oneSideMult: hit(same(l, [1, 2, 3].map((i) => x.a * i)) || same(l, [1, 2, 3].map((i) => x.b * i))); break;
          case TAGS.gcdForLcm: hit(v === g); break;
          case TAGS.notLeast: hit(v % L === 0 && v > L); break;
          case TAGS.cdAsCm: hit(same(l, DIVS(g))); break;
          case TAGS.cmNotMultL: hit(v % L === 0); break;                             // 진짜 공배수를 "아니다"로 고름
          case TAGS.useSwap: hit(/체육관/.test(q.q) ? v === g : v === L); break;       // 만나는 날엔 최대공약수, 나눠 주기·자르기엔 최소공배수
          case TAGS.addBoth: hit(v === x.a + x.b); break;
          case TAGS.askedWrong: hit(v === g || v === x.a / g); break;                 // 사람 수나 다른 물건 수
          default: break;
        }
      }
      void okText;
    }
  }
  const misreadOnly = new Set([TAGS.missSquare]);
  for (const tag of Object.values(TAGS)) if (!misreadOnly.has(tag)) assert.ok((seen[tag] || 0) >= 20, `"${tag}" 오답을 충분히 검사해야 한다 (${seen[tag] || 0}건)`);
});

test('★ ② 오개념 문항: 보여 준 것은 정말 틀렸다 · 진단 보기가 우연히 맞지 않다 · 갈래 열쇠', () => {
  const branches = {}; const tags = new Set();
  for (const c of FACTOR) {
    for (let s = 1; s <= SEEDS; s++) {
      const q = makeQuestion(c.id, 'misread', s * 7717, OPTS);
      const p = q.probe || {};
      const where = `${c.id} seed ${s}: ${q.q.replace(/\n/g, ' ')}`;
      assert.ok(/^misread:/.test(q.key || ''), where);
      branches[`${c.id} ${q.key}`] = (branches[`${c.id} ${q.key}`] || 0) + 1;
      assert.ok(/\*\*.+\*\*/.test(q.q), where);
      const shownLine = /\*\*(.+)\*\*/.exec(q.q)[1];
      const ok = q.choices.find((x) => x.ok).text;
      for (const ch of q.choices) if (!ch.ok) tags.add(ch.tag);
      if (p.divisors) {
        const want = DIVS(p.divisors).join(', ');
        assert.ok(shownLine.includes(p.shown) && p.shown !== want, `${where}: 보여 준 약수가 사실 맞다`);
        assert.ok(ok.endsWith(want), `${where}: 고친 답에 바른 약수가 없다`);
      } else if (p.multiples) {
        const [k, n] = p.multiples; const sh = nums(p.shown);
        assert.ok(shownLine.includes(p.shown), where);
        assert.ok(!same(sh, Array.from({ length: sh.length }, (_, i) => k * (i + 1))), `${where}: 보여 준 배수가 사실 맞다`);
        assert.ok(ok.includes(Array.from({ length: n }, (_, i) => k * (i + 1)).join(', ')), `${where}: 고친 답에 바른 배수가 없다`);
        for (const ch of q.choices.filter((x) => !x.ok)) { const r = /^(\d+)의 배수는 1과 (\d+)(?:이에요|예요)$/.exec(ch.text); if (r) assert.ok(+r[2] === k, where); }
      } else if (p.rel) {
        const [a, , N] = p.rel;
        assert.equal(relTruth(`${N}은 ${a}의 약수예요`), false, `${where}: 보여 준 말이 사실 맞다`);
        assert.equal(relTruth(ok.split(' — ')[0]), true, `${where}: 고친 말이 참이 아니다`);
        for (const ch of q.choices.filter((x) => !x.ok)) { const t = relTruth(ch.text); assert.ok(t !== true, `${where}: 오답 "${ch.text}"이 참`); }
      } else if (p.gcd || p.lcm) {
        const [a, b] = p.gcd || p.lcm;
        const right = p.gcd ? G(a, b) : LCM(a, b);
        assert.ok(q.q.includes(String(a)) && q.q.includes(String(b)), where);
        assert.notEqual(Number(p.shown), right, `${where}: 보여 준 ${p.shown}이 사실 정답`);
        assert.ok(nums(shownLine).includes(Number(p.shown)), `${where}: 보여 준 값이 글에 없다`);
        assert.ok(nums(ok).includes(right), `${where}: 고친 답에 ${right}이 없다 — ${ok}`);
        // 진단 보기가 이 예에서만 우연히 맞는 말이 되지 않게 (Codex 13차 #1·#2와 같은 모양)
        for (const ch of q.choices.filter((x) => !x.ok)) {
          const said = /(?:더한|곱한) (\d+)/.exec(ch.text) || /(?:최대공약수|최소공배수)는 (\d+)(?:이에요|예요)$/.exec(ch.text);
          if (said) assert.notEqual(Number(said[1]), right, `${where}: 오답 "${ch.text}"이 사실 정답을 말한다`);
          const lad = readLadder(q.q);
          if (lad && ch.text === '왼쪽 수를 더해야 해요') assert.notEqual(lad.left[0] + lad.left[1], right, `${where}: "왼쪽 수를 더해야"가 우연히 맞다`);
          if (lad && ch.text === '아래 수만 곱해야 해요') assert.notEqual(lad.m * lad.n, right, where);
          if (lad && ch.text === '왼쪽 수만 곱해야 해요') assert.notEqual(lad.left[0] * lad.left[1], right, where);
        }
      } else assert.fail(`${where}: probe 없음`);
    }
  }
  for (const [k, n] of Object.entries(branches)) assert.ok(n >= 100, `${k} 갈래가 드물다 (${n})`);
  assert.ok(tags.has(TAGS.missSquare), '② 제곱수 갈래의 이름표');
});

test('★ 수 뒤의 조사 (12는·36은·8과·24와·3으로·7로·6이에요·9예요)', () => {
  const BAT = new Set(['0', '1', '3', '6', '7', '8']);
  const PAIR = { 이: true, 가: false, 을: true, 를: false, 은: true, 는: false, 과: true, 와: false };
  const LONG = { 이에요: true, 예요: false, 이라서: true, 라서: false, 이니까: true, 니까: false };
  let checked = 0;
  for (const c of FACTOR) {
    for (let s = 1; s <= 300; s++) {
      for (const kind of ['calc', 'misread']) {
        const q = makeQuestion(c.id, kind, s * 3571, OPTS);
        const texts = [q.q, ...q.choices.map((x) => x.text), ...q.solve.steps, q.solve.whyAny, ...Object.values(q.solve.why)];
        for (const t of texts) {
          for (const m of String(t).matchAll(/(\d+)(으로|로|이|가|을|를|은|는|과|와)(?![가-힣])/g)) {
            const last = m[1].slice(-1); checked++;
            if (m[2] === '으로' || m[2] === '로') assert.equal(m[2], ['0', '3', '6'].includes(last) ? '으로' : '로', `${c.id}/${kind} seed ${s}: "${m[0]}" (${t})`);
            else assert.equal(PAIR[m[2]], BAT.has(last), `${c.id}/${kind} seed ${s}: "${m[0]}" (${t})`);
          }
          for (const m of String(t).matchAll(/(\d+)(이에요|예요|이라서|라서|이니까|니까)/g)) {
            checked++;
            assert.equal(LONG[m[2]], BAT.has(m[1].slice(-1)), `${c.id}/${kind} seed ${s}: "${m[0]}" (${t})`);
          }
        }
      }
    }
  }
  assert.ok(checked > 1000, `조사 검사 ${checked}건`);
});

test('★ 풀이 카드: 단계 2줄↑ · 기억할 것 · 오답마다 왜 · 정답이 단계에 나온다', () => {
  for (const c of FACTOR) {
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

test('🔁 쌍둥이·🤔 노트: 요청한 틀·갈래로 온다 (사다리·곱셈식 모양이 수에 따라 갈리지 않는다)', () => {
  let tried = 0;
  for (const c of FACTOR) {
    for (const kind of ['calc', 'misread']) {
      const keys = new Set();
      for (let s = 1; s <= 200; s++) keys.add(makeQuestion(c.id, kind, s * 37, OPTS).key);
      for (const key of keys) {
        for (let s = 1; s <= 60; s++) {
          const q = makeQuestion(c.id, kind, s * 911, { ...OPTS, want: { k: kind, key } });
          tried++;
          assert.equal(q.key, key, `${c.id}/${kind} seed ${s}: ${key}를 요청했는데 ${q.key}`);
        }
      }
    }
  }
  assert.ok(tried > 1500, `검사 ${tried}건`);
});

test('📏 진단·사다리·한 편·배움 예비·내용 검사', () => {
  const d = diagnosticSet(9, 5, OPTS);
  assert.deepEqual(d.map((q) => q.concept), ['fac.divisor', 'fac.relation', 'fac.gcd', 'fac.cm', 'fac.use']);
  const pl = placeFrom([{ concept: 'fac.divisor', correct: true }, { concept: 'fac.relation', correct: false }]);
  assert.equal(pl.startId, 'fac.relation');
  assert.deepEqual(pl.knownIds, ['fac.divisor', 'fac.multiple']);
  assert.deepEqual(ladder(['fac.divisor']).slice(0, 3).map((x) => x.state), ['done', 'now', 'locked']);
  for (const c of FACTOR) {
    assert.deepEqual(makeRound(c.id, 5, OPTS).map((q) => q.kind), ['calc', 'misread']);
    assert.equal(lessonOf(c.id, 1, OPTS).pages.length, 1);
  }
  assert.equal(conceptById('fac.nope'), null);
  assert.equal(makeQuestion('fac.nope', 'calc', 1, OPTS), null);
  assert.equal(checkContent({}).filter((x) => /내용 없음/.test(x)).length, 8);
});

test('🔍 Codex 14차: 보기 문장의 뜻 · 문제 글의 조건 · 아직 안 배운 말 · 넘겨 말하는 규칙', () => {
  for (let s = 1; s <= SEEDS; s++) {
    // #1 배수 ② "12의 배수는 1, 2, 3, 4, 6, 12" — "1은 빼야 해요"는 맞는 지적이었다 → 남은 오답 말은 정말 틀렸다
    const m = makeQuestion('fac.multiple', 'misread', s * 409, { ...OPTS, want: { k: 'misread', key: 'misread:divisor' } });
    assert.ok(!m.choices.some((c) => c.text === '1은 빼야 해요'), `seed ${s}: 맞는 지적이 오답으로 남았다`);
    for (const c of m.choices) {
      const r = /^1만 빼면 모두 (\d+)의 배수예요$/.exec(c.text);
      if (r) { const rest = nums(m.probe.shown).filter((x) => x !== 1); assert.ok(!c.ok && rest.some((x) => x % +r[1] !== 0), `seed ${s}: "${c.text}"이 사실 맞다`); }
    }
    // #2 함께 오는 날 ②에 기준 날("오늘 함께"), 나눠 주기 ②에 "남김없이"
    const meet = makeQuestion('fac.use', 'misread', s * 409, { ...OPTS, want: { k: 'misread', key: 'misread:meet' } });
    assert.match(meet.q, /오늘 함께/, `seed ${s}: 기준 날이 없다 — ${meet.q}`);
    const share = makeQuestion('fac.use', 'misread', s * 409, { ...OPTS, want: { k: 'misread', key: 'misread:share' } });
    assert.match(share.q, /남김없이/, `seed ${s}: ${share.q}`);
    // #8 G4·G5(공약수·최대공약수 구하기)는 G6보다 앞 — 아이가 보는 글에 "공배수"가 없다 (📊 이름표는 부모용이라 뺀다)
    for (const id of ['fac.common', 'fac.gcd']) {
      for (const kind of ['calc', 'misread']) {
        const q = makeQuestion(id, kind, s * 409, OPTS);
        const kidText = [q.q, ...q.choices.map((c) => c.text), ...q.solve.steps, q.solve.whyAny, q.solve.rule, ...Object.values(q.solve.why)].join(' ');
        assert.doesNotMatch(kidText, /공배수/, `${id}/${kind} seed ${s}: 아직 안 배운 말 — ${kidText.slice(0, 200)}`);
      }
    }
    // #5 곱셈식 문항의 규칙은 "더 쪼갤 수 없을 때까지" (24 = 4 × 6, 36 = 6 × 6에서 멈추면 6이 나온다)
    for (const id of ['fac.gcd', 'fac.lcm']) {
      const q = makeQuestion(id, 'calc', s * 409, OPTS);
      if (/^\d+ = \d+ × \d+ × \d+$/m.test(q.q)) assert.match(q.solve.rule, /더 쪼갤 수 없을 때까지/, `${id} seed ${s}: ${q.solve.rule}`);
    }
  }
  // #3·#4·#7 넘겨 말하는 문장 — 가장 작은 공약수는 언제나 1, "공약수가 있으면"은 1 때문에 늘 참, 12로 한 번에 나누면 한 번으로 끝난다
  // 주석은 뺀다 — 왜 바꿨는지 적어 둔 옛 문장이 주석에 남아 있다
  const src = readFileSync('js/mathfac.js', 'utf8').replace(/\/\/.*$/gm, '') + readFileSync('coach/math/factor.json', 'utf8');
  assert.doesNotMatch(src, /가장 작은 공약수|\(공약수가 있으면\)|한 번 나누고 멈추면 안/);
  const cm = makeQuestion('fac.cm', 'misread', 1, { ...OPTS, want: { k: 'misread', key: 'misread:prod' } });
  assert.match(cm.solve.rule, /1보다 큰 공약수/);
  // #6 최대공약수 칸 배움: 사다리가 먼저, 곱셈식은 마지막 장 "다른 방법" (2022 교육과정은 곱셈식을 초등 평가에서 뺀다)
  const gcdPages = JSON.parse(readFileSync('coach/math/factor.json', 'utf8'))['fac.gcd'].lesson;
  assert.match(gcdPages[0].say, /공약수로 계속/);
  assert.match(gcdPages[gcdPages.length - 1].say, /다른 방법[\s\S]*더 쪼갤 수 없을 때까지/);
  // #9 📊 ❓ 펼친 문제 글도 줄바꿈을 살린다
  assert.match(readFileSync('js/stats.js', 'utf8'), /el\('p', 'q', `문제: /);
  assert.match(readFileSync('css/style.css', 'utf8'), /\.stats-ask-item \.q \{ white-space: pre-line; \}/);
});

// ── 사람이 쓴 원고 (coach/math/factor.json) ──
const CONTENT = JSON.parse(readFileSync('coach/math/factor.json', 'utf8'));

test('원고(factor.json)가 형식 검사를 통과한다 — 8칸 모두 배움 3장↑·확인 2개↑·아빠 카드', () => {
  assert.deepEqual(checkContent(CONTENT), []);
  for (const c of FACTOR) {
    const L = lessonOf(c.id, 3, { ...OPTS, content: CONTENT });
    assert.ok(L.pages.length >= 3, c.id);
    assert.ok(!/\{(me|mon)/.test(JSON.stringify(L)), `${c.id}: 이름 자리표시가 남았다`);
  }
});

/**
 * 원고 확인 질문을 문제 글에서 **직접 읽어** 다시 푼다 — 사람이 쓴 답도 틀릴 수 있다.
 * { v } 수 · { list } 목록 · { one } 조건에 맞는 보기가 딱 하나 · { rel } 참인 문장이 딱 하나 · { yes, v } 네/아니요와 그 이유 속 수
 */
function answerOfCheck(q0) {
  const q = String(q0).replace(/\*\*/g, '');
  let m;
  // 곱셈식 두 줄을 한 문장에 ("12 = 2 × 2 × 3, 30 = 2 × 3 × 5일 때")
  if ((m = /^(\d+) = (\d+(?: × \d+)+), (\d+) = (\d+(?: × \d+)+)일 때, \d+[과와] \d+의 (최대공약수|최소공배수)는/.exec(q))) {
    const [a, b] = [+m[1], +m[3]];
    assert.equal(nums(m[2]).reduce((p, v) => p * v, 1), a, q); assert.equal(nums(m[4]).reduce((p, v) => p * v, 1), b, q);
    return { v: m[5] === '최대공약수' ? G(a, b) : LCM(a, b) };
  }
  // 사다리를 한 문장에 ("30과 45를 3으로 나누면 10, 15, 다시 5로 나누면 2, 3이 돼요")
  if ((m = /^(\d+)[과와] (\d+)[을를] (\d+)(?:으로|로) 나누면 (\d+), (\d+), 다시 (\d+)(?:으로|로) 나누면 (\d+), (\d+)[이가] 돼요\. (최대공약수|최소공배수)는/.exec(q))) {
    const [a, b, d1, x1, y1, d2, x2, y2] = m.slice(1, 9).map(Number);
    assert.deepEqual([a / d1, b / d1, x1 / d2, y1 / d2], [x1, y1, x2, y2], `사다리가 틀렸다: ${q}`);
    assert.equal(G(x2, y2), 1, `사다리가 끝나지 않았다: ${q}`);
    return { v: m[9] === '최대공약수' ? G(a, b) : LCM(a, b) };
  }
  if ((m = /^(\d+)[과와] (\d+)[을를] (\d+)(?:으로|로) 나누면 (\d+)[과와] (\d+)[이가] 돼요\. 최대공약수는 (\d+)일까요/.exec(q))) {
    const g = G(+m[1], +m[2]); return { yes: g === +m[6], v: g };
  }
  if ((m = /^최대공약수가 (\d+)이고, 사다리의 아래 수가 (\d+)[과와] (\d+)일 때 최소공배수는/.exec(q))) {
    assert.equal(G(+m[2], +m[3]), 1, `아래 수가 더 나뉜다: ${q}`);
    return { v: +m[1] * +m[2] * +m[3] };
  }
  if ((m = /^(\d+)의 약수가 아닌 수는/.exec(q)) || (m = /몬스터볼 (\d+)개를 상자에 남김없이 똑같이 나눠 담을 때, 상자 수가 될 수 없는 것은/.exec(q))) return { one: (x) => +m[1] % x !== 0 };
  if ((m = /^(\d+)의 약수를 모두 구하면/.exec(q))) return { list: DIVS(+m[1]) };
  if ((m = /^(\d+)의 약수는 모두 몇 개/.exec(q))) return { v: DIVS(+m[1]).length };
  if ((m = /^(\d+)의 배수를 작은 수부터 (\d+)개/.exec(q))) return { list: Array.from({ length: +m[2] }, (_, i) => +m[1] * (i + 1)) };
  if ((m = /^다음 중 (\d+)의 배수는/.exec(q)) || (m = /하루에 나무열매를 (\d+)개씩 모아요\. 모은 나무열매 수가 될 수 있는 것은/.exec(q))) return { one: (x) => x % +m[1] === 0 };
  if ((m = /^(\d+)의 배수 중에서 (\d+)번째로 작은 수/.exec(q))) return { v: +m[1] * +m[2] };
  if ((m = /^곱셈식 (\d+) × (\d+) = (\d+)[을를] 보고 바르게/.exec(q))) { assert.equal(+m[1] * +m[2], +m[3], q); return { rel: true }; }
  if (/^두 수가 약수와 배수의 관계인 것은/.test(q)) return { rel: true };
  if ((m = /^(\d+)[과와] (\d+)[은는] 약수와 배수의 관계일까요/.exec(q))) return { yes: +m[2] % +m[1] === 0 || +m[1] % +m[2] === 0 };
  if ((m = /^(\d+)[과와] (\d+)의 공약수를 모두/.exec(q))) return { list: DIVS(G(+m[1], +m[2])) };
  if ((m = /^두 수의 최대공약수가 (\d+)일 때, 두 수의 공약수를 모두/.exec(q))) return { list: DIVS(+m[1]) };
  if ((m = /^(\d+)[과와] (\d+)의 최대공약수는 얼마/.exec(q))) return { v: G(+m[1], +m[2]) };
  if ((m = /^(\d+)[과와] (\d+)의 공배수를 작은 수부터 (\d+)개/.exec(q))) { const L = LCM(+m[1], +m[2]); return { list: Array.from({ length: +m[3] }, (_, i) => L * (i + 1)) }; }
  if ((m = /^(\d+)[과와] (\d+)의 최소공배수는 얼마/.exec(q))) return { v: LCM(+m[1], +m[2]) };
  if ((m = /^두 수의 최소공배수가 (\d+)일 때, 두 수의 공배수가 아닌 것은/.exec(q))) return { one: (x) => x % +m[1] !== 0 };
  if ((m = /(\d+)개와 \S+ (\d+)개를 남김없이 똑같이 나눠 줄 때, 최대 몇 명/.exec(q))) return { v: G(+m[1], +m[2]) };
  if ((m = /(\d+)분마다, .+? (\d+)분마다 출발해요\..*다음에 함께 출발하는 것은 몇 분 뒤/.exec(q))) return { v: LCM(+m[1], +m[2]) };
  if ((m = /가로 (\d+)cm, 세로 (\d+)cm 종이를 남는 부분 없이 가장 큰 정사각형으로 자르면/.exec(q))) return { v: G(+m[1], +m[2]) };
  if ((m = /(\d+)개와 딱지 (\d+)장을 최대한 많은 친구에게 남김없이 똑같이 나눠 줄 때, 한 명이 받는 딱지는/.exec(q))) return { v: +m[2] / G(+m[1], +m[2]) };
  return null;
}
/** 확인 보기 값 — 단위(개·장·명·cm)를 떼고 수 하나 */
const checkVal = (t) => { const s = String(t).trim().replace(/(개|장|명|cm)$/, ''); return /^\d+$/.test(s) ? Number(s) : null; };

test('★ 원고 확인 질문도 따로 풀어 대조 — 전부 읽히고, 정답은 맞고, 오답은 정말 틀렸다', () => {
  let total = 0; const unread = [];
  for (const c of FACTOR) {
    const L = lessonOf(c.id, 3, { ...OPTS, content: CONTENT });
    for (const [i, p] of L.pages.entries()) {
      if (!p.check) continue;
      total++;
      const where = `${c.id}[${i}] "${p.check.q}"`;
      const want = answerOfCheck(p.check.q);
      if (!want) { unread.push(where); continue; }
      const all = [p.check.ok, ...p.check.no];
      if (want.v !== undefined && want.yes === undefined) {
        assert.equal(checkVal(p.check.ok), want.v, `${where} — 따로 푼 답 ${want.v} ≠ 원고 정답 ${p.check.ok}`);
        for (const n of p.check.no) assert.notEqual(checkVal(n), want.v, `${where} — 오답 ${n}이 사실 정답`);
      } else if (want.list) {
        assert.equal(p.check.ok, want.list.join(', '), `${where} — 목록`);
        for (const n of p.check.no) assert.notEqual(n, want.list.join(', '), where);
      } else if (want.one) {
        const hits = all.filter((t) => want.one(checkVal(t)));
        assert.deepEqual(hits, [p.check.ok], `${where} — 조건에 맞는 보기: ${hits.join(' / ')}`);
      } else if (want.rel) {
        const truths = all.map(relTruth);
        assert.ok(truths.every((t) => t !== null), `${where} — 못 읽는 문장`);
        assert.deepEqual(truths.map(Boolean), [true, ...p.check.no.map(() => false)], `${where} — 참인 문장이 정답 하나뿐이어야`);
      } else if (want.yes !== undefined) {
        assert.ok(p.check.ok.startsWith(want.yes ? '네' : '아니요'), `${where} — ${want.yes ? '네' : '아니요'}여야`);
        if (want.v !== undefined) assert.ok(nums(p.check.ok).includes(want.v), `${where} — 이유에 ${want.v}이 없다`);
        // 판정(네/아니요)이 맞는 오답은 두지 않는다 — 이유를 안 읽고 골라도 반은 맞은 셈이 된다 (13차 "우연히 맞는 진단"과 같은 모양)
        for (const n of p.check.no) assert.ok(!n.startsWith(want.yes ? '네' : '아니요'), `${where} — 오답 "${n}"의 판정이 맞다`);
      }
    }
  }
  assert.deepEqual(unread, [], '해석기가 못 읽은 확인 질문 — answerOfCheck에 말투를 더할 것');
  assert.ok(total >= 24, `확인 질문 ${total}개`);
});

test('★ 원고의 수 뒤 조사 (배움 글·확인 질문·아빠 카드 전부)', () => {
  const BAT = new Set(['0', '1', '3', '6', '7', '8']);
  const PAIR = { 이: true, 가: false, 을: true, 를: false, 은: true, 는: false, 과: true, 와: false };
  const LONG = { 이에요: true, 예요: false, 이라서: true, 라서: false };
  const texts = [];
  const walk = (v) => { if (typeof v === 'string') texts.push(v); else if (v && typeof v === 'object') Object.values(v).forEach(walk); };
  walk(CONTENT);
  let checked = 0;
  for (const t of texts) {
    for (const m of t.matchAll(/(\d+)(으로|로|이|가|을|를|은|는|과|와)(?![가-힣])/g)) {
      checked++;
      const last = m[1].slice(-1);
      if (m[2] === '으로' || m[2] === '로') assert.equal(m[2], ['0', '3', '6'].includes(last) ? '으로' : '로', `"${m[0]}" — ${t}`);
      else assert.equal(PAIR[m[2]], BAT.has(last), `"${m[0]}" — ${t}`);
    }
    for (const m of t.matchAll(/(\d+)(이에요|예요|이라서|라서)/g)) { checked++; assert.equal(LONG[m[2]], BAT.has(m[1].slice(-1)), `"${m[0]}" — ${t}`); }
  }
  assert.ok(checked > 60, `조사 검사 ${checked}건`);
});
