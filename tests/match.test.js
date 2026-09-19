// 🔤 단어 이어 주기 규칙 테스트: node --test tests/match.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PAIRS, NEED_NEW, shortMeaning, matchable, shuffle, pickMatchRound, rewardStep } from '../js/match.js';
import { matchXp, XP } from '../js/xp.js';
import { matchCoins, COIN } from '../js/items.js';

/** 단어장 기록 만들기 */
const view = (word, meaning, extra = {}) => ({ word, meaning, views: 3, ...extra });
/** 번호 → 영어 낱말 (실제 단어장엔 숫자가 없다 — matchable이 낱말만 받는다) */
const name = (prefix, i) => `${prefix}${String.fromCharCode(97 + Math.floor(i / 26))}${String.fromCharCode(97 + (i % 26))}`;
/** n개짜리 단어장 (뜻도 다 다르게) */
const views = (n, extra = {}) =>
  Array.from({ length: n }, (_, i) => view(name('word', i), `뜻${i}`, extra));

test('🔤 뜻은 첫 조각만 쓴다 (보기가 길면 다섯 개를 한 화면에 못 놓는다)', () => {
  assert.equal(shortMeaning('관객, 청중'), '관객');
  assert.equal(shortMeaning('깨어 있는; 깨다'), '깨어 있는');
  assert.equal(shortMeaning('~위에(독일어, auf Wiedersehen 안녕히)'), '~위에');
  assert.equal(shortMeaning(''), '');
  assert.equal(shortMeaning(null), '');
});

test('🔤 낼 수 있는 단어 고르기', () => {
  assert.equal(matchable(view('ocean', '바다')), true);
  assert.equal(matchable(view('awoke', '=awake')), false, '별칭은 뜻이 아니다');
  assert.equal(matchable(view('bello', '안녕!(미니언 말)'), new Set(['bello'])), false, '외국어로 적어 둔 낱말');
  assert.equal(matchable(view('in a nutshell', '요약하면')), false, '표현은 칸에 안 들어간다');
  assert.equal(matchable(view('x', '')), false);
  assert.equal(matchable(view('supercalifragilistic', '아주아주 길고 긴 설명이 붙은 뜻')), false, '뜻이 길면 못 쓴다');
  assert.equal(matchable(null), false);
});

test('🔤 새 단어가 20개는 모여야 한 판 (아버님 요청)', () => {
  assert.equal(NEED_NEW, 20);
  assert.equal(PAIRS, 5);
  assert.equal(pickMatchRound(views(19)), null, '19개로는 안 열린다');
  const round = pickMatchRound(views(20));
  assert.ok(round, '20개면 열린다');
  assert.equal(round.items.length, PAIRS, '내는 건 다섯 쌍');
  assert.equal(round.consumed.length, NEED_NEW, '묶음 20개를 다 썼다고 표시한다');
});

test('🔤 한 번 쓴 단어는 다시 안 나온다 — 그래서 다음 판은 새 단어 20개를 기다린다', () => {
  const used = views(20, { matchedAt: Date.now() });
  assert.equal(pickMatchRound(used), null, '이미 쓴 단어뿐이면 안 열린다');
  // 새 단어 19개를 더 봐도 아직, 20개째에 열린다
  const plus19 = [...used, ...Array.from({ length: 19 }, (_, i) => view(name('new', i), `새뜻${i}`))];
  assert.equal(pickMatchRound(plus19), null);
  const plus20 = [...plus19, view(name('new', 19), '새뜻19')];
  const round = pickMatchRound(plus20);
  assert.ok(round);
  for (const it of round.items) assert.ok(it.word.startsWith('new'), '새 단어에서만 낸다');
});

test('🔤 뜻이 겹치는 단어는 한 판에 같이 안 낸다 (정답이 둘이 되어 버린다)', () => {
  // 20개 중 절반이 같은 뜻 "바다" — 그래도 보기는 서로 다른 다섯 개여야 한다
  const list = [
    ...Array.from({ length: 10 }, (_, i) => view(name('sea', i), '바다')),
    ...Array.from({ length: 10 }, (_, i) => view(name('x', i), `다른뜻${i}`)),
  ];
  const round = pickMatchRound(list);
  assert.ok(round);
  const meanings = round.items.map((it) => it.meaning);
  assert.equal(new Set(meanings).size, meanings.length, `겹친 보기: ${meanings.join(',')}`);
});

test('🔤 외국어로 적어 둔 낱말은 묶음에도 안 들어간다', () => {
  const foreign = new Set(['bello', 'poopaye']);
  const list = [
    view('bello', '안녕!'), view('poopaye', '안녕히!'),
    ...Array.from({ length: 19 }, (_, i) => view(name('w', i), `뜻${i}`)),
  ];
  assert.equal(pickMatchRound(list, { foreign }), null, '쓸 수 있는 단어는 19개뿐');
  const ok = pickMatchRound([...list, view('brave', '용감한')], { foreign });
  assert.ok(ok);
  assert.ok(!ok.consumed.includes('bello'));
});

test('🔤 많이 본 단어부터 묶는다', () => {
  const list = Array.from({ length: 30 }, (_, i) => view(name('w', i), `뜻${i}`, { views: i }));
  const round = pickMatchRound(list);
  // views가 큰 20개(w10~w29)만 묶음에 들어간다
  const seen = new Set(round.consumed);
  for (let i = 0; i < 10; i++) {
    assert.ok(!seen.has(name('w', i)), `적게 본 ${name('w', i)}가 묶였다`);
  }
});

test('🔤 판마다 자리가 달라야 위치를 외우지 못한다', () => {
  const a = shuffle([1, 2, 3, 4, 5], () => 0);    // 항상 첫 자리로
  assert.deepEqual(a.slice().sort(), [1, 2, 3, 4, 5], '원소는 그대로');
  assert.equal(shuffle([]).length, 0);
  const src = [1, 2, 3];
  shuffle(src);
  assert.deepEqual(src, [1, 2, 3], '원본은 안 건드린다');
});

test('🔤 보상: 한 번에 다 맞추면 가장 많이, 많이 틀리면 적게 (🧩 퍼즐과 같은 계단)', () => {
  assert.equal(rewardStep(0), 0);
  assert.equal(rewardStep(1), 1);
  assert.equal(rewardStep(2), 1);
  assert.equal(rewardStep(3), 2);
  assert.equal(rewardStep(9), 2);

  assert.equal(matchXp(0), XP.match[0]);
  assert.equal(matchXp(2), XP.match[1]);
  assert.equal(matchXp(5), XP.match[2]);
  assert.ok(XP.match[0] > XP.match[1] && XP.match[1] > XP.match[2], '틀릴수록 적게');

  assert.equal(matchCoins(0), COIN.match[0]);
  assert.equal(matchCoins(3), COIN.match[2]);
  assert.ok(COIN.match[0] > COIN.match[2]);
});

test('🔤 이상한 값이 와도 보상 계산이 깨지지 않는다', () => {
  assert.equal(matchXp(-1), XP.match[0]);
  assert.equal(matchXp(null), XP.match[0]);
  assert.equal(matchCoins(undefined), COIN.match[0]);
  assert.equal(pickMatchRound(null), null);
  assert.equal(pickMatchRound([]), null);
});
