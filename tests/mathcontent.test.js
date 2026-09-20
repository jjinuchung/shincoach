// 🔢 사람이 쓴 수학 내용(coach/math/fraction.json) 검사: node --test tests/mathcontent.test.js
// 손으로 쓴 문제는 계산이 틀리기 쉽다 — 식(expr)을 기계로 풀어 정답과 대조한다.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  FRACTION, makeQuestion, makeRound, conceptStory, checkContent, fill, gcd, lcm, reduce,
} from '../js/mathgen.js';

const content = JSON.parse(readFileSync(new URL('../coach/math/fraction.json', import.meta.url), 'utf8'));

/** "a/b" · "3" · "2 3/8" → {n, d} */
function parseFrac(s) {
  s = String(s).trim();
  let m = /^(\d+) (\d+)\/(\d+)$/.exec(s);
  if (m) { const w = +m[1], n = +m[2], d = +m[3]; return { n: w * d + n, d }; }
  m = /^(\d+)\/(\d+)$/.exec(s);
  if (m) return { n: +m[1], d: +m[2] };
  m = /^(\d+)$/.exec(s);
  if (m) return { n: +m[1], d: 1 };
  return null;
}
const same = (a, b) => a && b && a.n * b.d === b.n * a.d;

/** 생성기가 쓰는 식 모양을 그대로 푼다. 못 푸는 모양이면 null (그 문항은 사람이 본다) */
function evalExpr(expr) {
  let m;
  if ((m = /^(\d+)조각 중 (\d+)$/.exec(expr))) return { n: +m[2], d: +m[1] };
  if ((m = /^(\S+) ([+−×÷]) (\S+)$/.exec(expr))) {
    const a = parseFrac(m[1]); const b = parseFrac(m[3]);
    if (!a || !b) return null;
    switch (m[2]) {
      case '+': return { n: a.n * b.d + b.n * a.d, d: a.d * b.d };
      case '−': return { n: a.n * b.d - b.n * a.d, d: a.d * b.d };
      case '×': return { n: a.n * b.n, d: a.d * b.d };
      case '÷': return { n: a.n * b.d, d: a.d * b.n };
      default: return null;
    }
  }
  if ((m = /^(\S+) → 약분$/.exec(expr))) return parseFrac(m[1]);
  if ((m = /^(\S+) → 대분수$/.exec(expr))) return parseFrac(m[1]);
  if ((m = /^(\d+ \d+\/\d+) → 가분수$/.exec(expr))) return parseFrac(m[1]);
  // "가장 작은"이 문구에 있어야 최소공배수만 정답이 된다 (24도 공통 분모다 — Codex 리뷰 #3)
  if ((m = /^1\/(\d+) 과 1\/(\d+) → 가장 작은 공통 분모는\?$/.exec(expr))) return { n: lcm(+m[1], +m[2]), d: 1 };
  return null;
}

test('내용 파일이 형식에 맞다 (checkContent가 빈 목록)', () => {
  assert.deepEqual(checkContent(content), []);
  assert.ok(checkContent(null).length, '없는 내용은 잡는다');
  assert.ok(checkContent({ 'frac.nope': {} }).some((s) => /없는 개념/.test(s)));
  assert.ok(checkContent({ 'frac.add': { special: [{ q: 'x', ok: '1', no: [{ text: '1', tag: 't' }, { text: '2', tag: 't' }, { text: '3', tag: 't' }] }] } }).some((s) => /정답이 있음/.test(s)));
  assert.ok(checkContent({ 'frac.add': { story: { title: 't', text: '{mon/이}' } } }).some((s) => /자리표시/.test(s)));
});

test('개념 10개 전부에 📖 이야기 · 왜 그런가 5개 · ⭐ 특별 문제 3개 이상', () => {
  for (const c of FRACTION) {
    const v = content[c.id];
    assert.ok(v, `${c.id} 내용 있음`);
    assert.ok(v.story && v.story.text.length > 80, `${c.id} 이야기가 충분히 길다`);
    assert.ok(v.why.length >= 5, `${c.id} 왜 그런가 ${v.why.length}개`);
    assert.ok(v.special.length >= 3, `${c.id} 특별 문제 ${v.special.length}개`);
  }
});

test('★ 특별 문제의 정답이 식과 맞는다 (손으로 쓴 계산 검산)', () => {
  let checked = 0;
  for (const [id, v] of Object.entries(content)) {
    if (id === '_') continue;
    for (const s of v.special) {
      const want = evalExpr(s.expr);
      assert.ok(want, `${id}: 식을 못 풀었다 — ${s.expr}`);
      const got = parseFrac(s.ok);
      assert.ok(got, `${id}: 정답 모양이 이상하다 — ${s.ok}`);
      assert.ok(same(want, got), `${id}: ${s.expr} = ${s.ok} 가 틀렸다 (기계 답 ${want.n}/${want.d})`);
      // 정답 표기: 약분·대분수 개념이 아니면 기약분수로 적는다 (오답들과 모양이 맞아야 정답이 튀지 않는다)
      if (!['frac.mean', 'frac.same', 'frac.mixed'].includes(id)) {
        const r = reduce(got.n, got.d);
        assert.equal(gcd(got.n, got.d), 1, `${id}: 정답 ${s.ok}은 약분해서 ${r.n}/${r.d}로 적어야 한다`);
      }
      // 오답 셋 중 정답과 같은 값이 숨어 있으면 안 된다 (2/4 와 1/2 처럼)
      for (const w of s.no) {
        assert.ok(!/\/0|^0\//.test(w.text), `${id}: 말이 안 되는 분수 ${w.text}`);
        const wf = parseFrac(w.text);
        if (wf) assert.ok(!same(wf, got), `${id}: 오답 ${w.text}이 정답 ${s.ok}과 같은 값`);
      }
      checked++;
    }
  }
  assert.ok(checked >= 30, `검산한 특별 문제 ${checked}개`);
});

test('내용을 넘기면 why는 파일 것, special이 한 편에 더해지고, 이야기에 출연진이 끼워진다', () => {
  const opts = { content, names: ['리자몽', '뮤츠'] };
  const round = makeRound('frac.add', 21, opts);
  assert.deepEqual(round.map((q) => q.kind), ['calc', 'misread', 'why', 'special']);
  const sp = round[3];
  assert.equal(sp.choices.length, 4);
  assert.equal(sp.choices.filter((x) => x.ok).length, 1);
  assert.ok(sp.expr, '특별 문제도 식을 같이 준다');
  assert.ok(!/\{(me|mon|mon2)/.test(sp.q), '자리표시가 남지 않는다');

  // 파일의 why는 5개, 코드의 예비는 2개 — 30번 뽑으면 코드에 없는 문항이 나온다
  const builtin = new Set(FRACTION.find((c) => c.id === 'frac.add').why.map((w) => w.q));
  let fromFile = false;
  for (let s = 1; s <= 30; s++) if (!builtin.has(makeQuestion('frac.add', 'why', s, opts).q)) fromFile = true;
  assert.ok(fromFile, '파일의 왜 그런가 문항이 쓰인다');

  const story = conceptStory('frac.same', 3, opts);
  assert.equal(story.title, '로켓단의 습격');
  assert.ok(story.text.includes('리자몽') || story.text.includes('뮤츠'), '이야기에 도감 포켓몬이 나온다');
  assert.ok(!/\{(me|mon|mon2)/.test(story.text));

  // 내용이 없으면 special은 null, 이야기는 코드의 한 줄로
  assert.equal(makeQuestion('frac.add', 'special', 1), null);
  assert.deepEqual(makeRound('frac.add', 1).map((q) => q.kind), ['calc', 'misread', 'why']);
  assert.equal(conceptStory('frac.add', 1).title, '분모가 다른 분수의 덧셈·뺄셈');
});

test('이야기·문항의 조사가 출연진에 맞는다 (리자몽이 / 피카츄가 / 진우야)', () => {
  const a = fill('{mon/이/가} {me/아/야}', { me: '진우', mon: '리자몽' });
  assert.equal(a, '리자몽이 진우야');
  const b = fill('{mon/이/가}', { me: '진우', mon: '피카츄' });
  assert.equal(b, '피카츄가');
});
