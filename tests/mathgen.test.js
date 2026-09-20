// 🔢 수학 분수 줄기 — 생성기·사다리·진단: node --test tests/mathgen.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  rng, shuffle, gcd, lcm, reduce, fracText, mixedText, josa, numJosa, fill, DEFAULT_CAST,
  FRACTION, conceptById, makeQuestion, makeRound, diagnosticSet, placeFrom, ladder,
} from '../js/mathgen.js';

test('rng: 같은 씨앗이면 같은 수열 (문제를 재현할 수 있어야 복습에서 같은 문제를 다시 낸다)', () => {
  const a = rng(42); const b = rng(42);
  const xs = [a(), a(), a()]; const ys = [b(), b(), b()];
  assert.deepEqual(xs, ys);
  assert.ok(xs.every((x) => x >= 0 && x < 1));
  assert.notDeepEqual(xs, [rng(43)(), rng(43)(), rng(43)()], '씨앗이 다르면 다른 수열');
  assert.equal(shuffle(rng(1), [1, 2, 3, 4]).length, 4);
  assert.deepEqual([...shuffle(rng(1), [1, 2, 3, 4])].sort(), [1, 2, 3, 4], '섞어도 원소는 그대로');
});

test('분수 도우미: gcd·lcm·약분·글자', () => {
  assert.equal(gcd(12, 18), 6);
  assert.equal(gcd(7, 5), 1);
  assert.equal(lcm(4, 6), 12);
  assert.deepEqual(reduce(6, 9), { n: 2, d: 3 });
  assert.deepEqual(reduce(5, 1), { n: 5, d: 1 });
  assert.equal(fracText(3, 1), '3', '분모가 1이면 자연수');
  assert.equal(fracText(2, 3), '2/3');
  assert.equal(mixedText(2, 1, 3), '2 1/3');
  assert.equal(mixedText(0, 1, 3), '1/3');
  assert.equal(mixedText(2, 0, 3), '2');
});

test('사다리: 선행 개념은 항상 앞에 있고, 존재하는 id만 가리킨다', () => {
  const ids = FRACTION.map((c) => c.id);
  assert.equal(new Set(ids).size, ids.length, 'id 중복 없음');
  FRACTION.forEach((c, i) => {
    for (const need of c.needs) {
      const at = ids.indexOf(need);
      assert.ok(at >= 0, `${c.id}의 선행 ${need}가 존재`);
      assert.ok(at < i, `${c.id}의 선행 ${need}는 앞에 있다`);
    }
    assert.ok(c.why.length >= 2, `${c.id}에 "왜 그런가" 문항이 둘 이상`);
    assert.ok([4, 5, 6].includes(c.grade));
  });
  assert.equal(conceptById('frac.add').name, '분모가 다른 분수의 덧셈·뺄셈');
  assert.equal(conceptById('nope'), null);
});

test('모든 개념·유형 × 씨앗 300개: 보기 넷, 정답 하나, 중복 없음, 말이 안 되는 분수 없음', () => {
  let n = 0;
  for (const c of FRACTION) {
    for (const kind of ['calc', 'misread', 'why']) {
      for (let seed = 1; seed <= 300; seed++) {
        const q = makeQuestion(c.id, kind, seed);
        n++;
        assert.equal(q.concept, c.id);
        assert.equal(q.kind, kind);
        assert.ok(q.q.length > 5, '문제 글이 있다');
        assert.equal(q.choices.length, 4, `${c.id}/${kind}/${seed}: 보기 넷`);
        assert.equal(q.choices.filter((x) => x.ok).length, 1, `${c.id}/${kind}/${seed}: 정답 하나`);
        assert.equal(new Set(q.choices.map((x) => x.text)).size, 4, `${c.id}/${kind}/${seed}: 보기 중복 없음`);
        for (const ch of q.choices) {
          assert.ok(ch.text, '빈 보기 없음');
          assert.ok(!/^0\//.test(ch.text) && !/\/0$/.test(ch.text), `${c.id}/${kind}/${seed}: 0/n·n/0 없음 (${ch.text})`);
          if (!ch.ok) assert.ok(ch.tag, '오답에는 오개념 이름이 붙는다');
        }
      }
    }
  }
  assert.equal(n, FRACTION.length * 3 * 300);
});

test('같은 씨앗이면 같은 문제, 다른 씨앗이면 (대체로) 다른 문제', () => {
  assert.deepEqual(makeQuestion('frac.add', 'calc', 5), makeQuestion('frac.add', 'calc', 5));
  const qs = new Set();
  for (let s = 1; s <= 40; s++) qs.add(makeQuestion('frac.add', 'calc', s).q);
  assert.ok(qs.size >= 15, `40개 씨앗에서 문제가 ${qs.size}가지 — 너무 같은 문제만 나오면 외운다`);
});

test('★ 오답은 오개념이다 — 1/2 + 1/3의 오답에 2/5(분모끼리 더함)가 반드시 있다', () => {
  // 어떤 씨앗이든 분모끼리 더한 오답이 들어간다 (정답과 겹치는 특수한 경우만 제외)
  let seen = 0;
  for (let s = 1; s <= 200; s++) {
    const q = makeQuestion('frac.add', 'calc', s);
    if (q.choices.some((c) => c.tag === '분모끼리 더함')) seen++;
  }
  assert.ok(seen >= 190, `200개 중 ${seen}개에 "분모끼리 더함" 오답`);

  // 분수 × 자연수는 "분모에도 곱함"이 핵심 오개념
  const m = makeQuestion('frac.mulnat', 'calc', 3);
  assert.ok(m.choices.some((c) => c.tag === '분모에도 곱함'));
  // 분수 ÷ 분수는 "뒤집지 않고 곱함"·"앞 분수를 뒤집음"
  let flip = 0;
  for (let s = 1; s <= 100; s++) {
    const tags = makeQuestion('frac.div', 'calc', s).choices.map((c) => c.tag);
    if (tags.includes('뒤집지 않고 곱함') && tags.includes('앞 분수를 뒤집음')) flip++;
  }
  assert.ok(flip >= 90, `100개 중 ${flip}개에 뒤집기 오개념 둘 다`);
});

test('분수 ÷ 분수: 같은 수끼리 나누는 시시한 문제(답 1)는 안 낸다', () => {
  for (let s = 1; s <= 300; s++) {
    const q = makeQuestion('frac.div', 'calc', s);
    const ok = q.choices.find((c) => c.ok).text;
    assert.notEqual(ok, '1', `${s}: ${q.q}`);
  }
});

test('개념 한 편 = calc·misread·why 세 문항', () => {
  const round = makeRound('frac.common', 11);
  assert.deepEqual(round.map((q) => q.kind), ['calc', 'misread', 'why']);
  assert.ok(round.every((q) => q.concept === 'frac.common'));
  assert.equal(makeQuestion('nope', 'calc', 1), null);
});

test('📏 진단: 사다리에서 고르게 뽑은 5문제, 첫 개념과 끝 개념이 들어간다', () => {
  const qs = diagnosticSet(9);
  assert.equal(qs.length, 5);
  assert.equal(qs[0].concept, FRACTION[0].id);
  assert.equal(qs[4].concept, FRACTION[FRACTION.length - 1].id);
  assert.ok(qs.every((q) => q.kind === 'calc'), '설명 없이 바로 푸는 것이라 계산만');
  const ids = qs.map((q) => q.concept);
  assert.equal(new Set(ids).size, 5, '같은 개념을 두 번 내지 않는다');
});

test('📏 시작점: 틀린 가장 앞 개념부터, 다 맞으면 마지막 개념', () => {
  const qs = diagnosticSet(9);
  const all = placeFrom(qs.map((q) => ({ concept: q.concept, correct: true })));
  assert.equal(all.startId, FRACTION[FRACTION.length - 1].id);
  assert.equal(all.knownIds.length, FRACTION.length - 1);

  const third = placeFrom(qs.map((q, i) => ({ concept: q.concept, correct: i !== 2 })));
  assert.equal(third.startId, qs[2].concept, '세 번째를 틀리면 거기서 시작');
  assert.ok(!third.knownIds.includes(qs[2].concept), '틀린 개념은 아는 것이 아니다');
  assert.ok(third.knownIds.includes(qs[1].concept), '그 앞은 아는 것으로');

  const first = placeFrom(qs.map((q, i) => ({ concept: q.concept, correct: i !== 0 })));
  assert.equal(first.startId, FRACTION[0].id);
  assert.deepEqual(first.knownIds, []);

  // 뒤에서 맞아도 앞에서 틀렸으면 앞이 구멍이다 (뒤는 우연히 맞았을 수 있다)
  const hole = placeFrom(qs.map((q, i) => ({ concept: q.concept, correct: i !== 1 })));
  assert.equal(hole.startId, qs[1].concept);
  assert.deepEqual(placeFrom([]).knownIds.length, FRACTION.length - 1, '답이 없으면 다 맞은 것과 같다 (진단을 건너뜀)');
});

test('사다리 상태: 👑 done / ▶ now 하나 / 🔒 locked (앞을 마쳐야 열린다)', () => {
  const empty = ladder([]);
  assert.equal(empty[0].state, 'now', '아무것도 안 했으면 첫 개념이 지금');
  assert.equal(empty.filter((s) => s.state === 'now').length, 1);
  assert.ok(empty.slice(1).every((s) => s.state === 'locked'));

  const two = ladder(['frac.mean', 'frac.same']);
  assert.equal(two[0].state, 'done');
  assert.equal(two[1].state, 'done');
  assert.equal(two[2].state, 'now');
  assert.equal(two[3].state, 'locked');

  const all = ladder(FRACTION.map((c) => c.id));
  assert.ok(all.every((s) => s.state === 'done'));
});

test('조사: 이름 뒤(받침)와 숫자 뒤(읽는 소리)', () => {
  assert.equal(josa('피카츄', '이', '가'), '가');
  assert.equal(josa('리자몽', '이', '가'), '이');
  assert.equal(josa('진우', '아', '야'), '야');
  assert.equal(josa('Pikachu', '이', '가'), '가', '한글이 아니면 받침 없는 쪽');
  // 숫자: 3(삼)·6(육)·10(십)은 받침, 2(이)·4(사)·5(오)·9(구)는 없음, 1(일)·7(칠)·8(팔)은 ㄹ받침
  assert.equal(numJosa(3, '으로', '로'), '으로');
  assert.equal(numJosa(6, '으로', '로'), '으로');
  assert.equal(numJosa(10, '으로', '로'), '으로');
  assert.equal(numJosa(8, '으로', '로'), '로', '팔→로');
  assert.equal(numJosa(7, '으로', '로'), '로', '칠→로');
  assert.equal(numJosa(4, '으로', '로'), '로', '사→로');
  assert.equal(numJosa(2, '을', '를'), '를');
  assert.equal(numJosa(3, '을', '를'), '을');
  assert.equal(numJosa(8, '을', '를'), '을', '팔→을 (으로만 ㄹ 예외)');
  assert.equal(numJosa(5, '과', '와'), '와');
  assert.equal(numJosa(6, '과', '와'), '과');
});

test('fill: 이름 자리에 출연진을 끼우고 조사를 맞춘다', () => {
  const c = { me: '진우', mon: '피카츄', mon2: '리자몽' };
  assert.equal(fill('{mon/이/가} {me/과/와} {mon2/을/를}', c), '피카츄가 진우와 리자몽을');
  assert.equal(fill('{me/아/야}, {mon}의 HP', c), '진우야, 피카츄의 HP');
  assert.equal(fill('이름 없음', c), '이름 없음');
  assert.equal(fill('{mon}', { me: '진우' }), '', '없는 출연진은 빈 글자 (터지지 않는다)');
});

test('★ 문제 속 세계는 포켓몬, 사람은 진우 — 계산·오개념 문항 전부에 이름이 들어간다', () => {
  const names = ['피카츄', '리자몽', '개굴닌자'];
  for (const c of FRACTION) {
    for (const kind of ['calc', 'misread']) {
      for (let seed = 1; seed <= 60; seed++) {
        const q = makeQuestion(c.id, kind, seed, { names });
        const hasName = names.some((n) => q.q.includes(n)) || q.q.includes('진우');
        assert.ok(hasName, `${c.id}/${kind}/${seed}: 이름이 없다 — ${q.q}`);
        assert.ok(!/\{(me|mon|mon2)/.test(q.q), '이름 자리가 안 채워진 채 남지 않는다');
        for (const d of DEFAULT_CAST) {
          if (!names.includes(d)) assert.ok(!q.q.includes(d), `도감 이름을 줬는데 기본 출연진 ${d}이 나왔다`);
        }
      }
    }
  }
});

test('출연진 옵션: 이름을 안 주면 기본 출연진, 아이 이름은 바꿀 수 있다', () => {
  let usedDefault = false;
  for (let s = 1; s <= 30; s++) {
    const q = makeQuestion('frac.add', 'calc', s);
    if (DEFAULT_CAST.some((n) => q.q.includes(n))) usedDefault = true;
  }
  assert.ok(usedDefault, '이름을 안 주면 기본 출연진이 나온다');
  let seenMe = false;
  for (let s = 1; s <= 30; s++) {
    if (makeQuestion('frac.add', 'calc', s, { me: '민수' }).q.includes('민수')) seenMe = true;
  }
  assert.ok(seenMe, '아이 이름을 바꾸면 그 이름이 나온다');
  assert.ok(makeQuestion('frac.same', 'misread', 3).q.includes('진우야'), '오개념 문항은 진우에게 묻는다');
});

test('계산 문항에는 식(expr)이 따로 있어 화면이 크게 보여 줄 수 있다 (분수의 뜻은 이야기만)', () => {
  for (const c of FRACTION) {
    const q = makeQuestion(c.id, 'calc', 5);
    if (c.id === 'frac.mean') assert.equal(q.expr, '');
    else assert.ok(q.expr, `${c.id}: expr 있음`);
    assert.equal(makeQuestion(c.id, 'misread', 5).expr, '', '오개념 문항은 식 없음');
  }
});

test('약분 개념이 아닌 곳의 주어진 분수는 기약분수다 (3/6 × 4 같은 수는 산만하다)', () => {
  const rx = /(\d+)\/(\d+)/g;
  for (const id of ['frac.add', 'frac.mulnat', 'frac.mul', 'frac.divnat', 'frac.div']) {
    for (let s = 1; s <= 100; s++) {
      const q = makeQuestion(id, 'calc', s);
      for (const m of q.expr.matchAll(rx)) {
        assert.equal(gcd(Number(m[1]), Number(m[2])), 1, `${id}/${s}: ${q.expr} 에 약분 안 된 수`);
      }
    }
  }
});
