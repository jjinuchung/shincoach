// 🧩 문장 퍼즐 순수 로직 테스트: node --test tests/puzzle.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  splitWords, isPuzzleable, shuffle, scrambleOrder, pickPuzzle, checkOrder, PUZZLE_MAX_WORDS,
} from '../js/puzzle.js';

/** 고정된 수열을 돌려주는 rng (테스트 재현용) */
function seq(...vals) {
  let i = 0;
  return () => vals[i++ % vals.length];
}

test('splitWords: 공백으로 나누고 구두점·대문자는 단어에 붙은 채 둠', () => {
  assert.deepEqual(splitWords('Hello, world!'), ['Hello,', 'world!']);
  assert.deepEqual(splitWords("I'm  fine,\nthanks."), ["I'm", 'fine,', 'thanks.']);
});

test('splitWords: 구두점만 있는 조각은 앞 단어에 붙이고 맨 앞이면 버림', () => {
  assert.deepEqual(splitWords('Hello .'), ['Hello.']);
  assert.deepEqual(splitWords('- Hi there'), ['Hi', 'there']);
  assert.deepEqual(splitWords('...'), []);
  assert.deepEqual(splitWords(''), []);
});

test('isPuzzleable: 3~8단어, 서로 다른 단어 2개 이상', () => {
  assert.equal(isPuzzleable({ en: 'Hi there' }), false, '2단어');
  assert.equal(isPuzzleable({ en: 'Hi there Bob' }), true);
  assert.equal(isPuzzleable({ en: 'a b c d e f g h' }), true, '8단어');
  assert.equal(isPuzzleable({ en: 'a b c d e f g h i' }), false, '9단어');
  assert.equal(isPuzzleable({ en: 'no no no' }), false, '전부 같은 단어');
  assert.equal(isPuzzleable({ en: 'No, no no!' }), true, '구두점이 다르면 다른 단어');
  assert.equal(isPuzzleable(null), false);
  assert.equal(isPuzzleable({ en: '' }), false);
  assert.equal(PUZZLE_MAX_WORDS, 8);
});

test('shuffle: 원본을 바꾸지 않고 같은 원소로 이루어진 순열', () => {
  const src = [1, 2, 3, 4, 5];
  const out = shuffle(src, seq(0.1, 0.7, 0.3, 0.9));
  assert.deepEqual(src, [1, 2, 3, 4, 5]);
  assert.deepEqual(out.slice().sort(), [1, 2, 3, 4, 5]);
});

test('scrambleOrder: 보이는 순서가 원래와 달라지는 순열 인덱스', () => {
  const words = ['I', 'am', 'a', 'happy', 'toy.'];
  for (let n = 0; n < 50; n++) {
    const idx = scrambleOrder(words);
    assert.deepEqual(idx.slice().sort((a, b) => a - b), [0, 1, 2, 3, 4], '순열');
    assert.ok(idx.some((j, i) => words[j] !== words[i]), '원래 순서와 달라야 함');
  }
});

test('scrambleOrder: rng가 항상 같은 순서를 만들면 이웃을 바꿔서라도 다르게', () => {
  // rng=1-ε 이면 Fisher-Yates가 자기 자리를 고르므로 20번 다 원래 순서 → 이웃 교환 폴백
  const words = ['a', 'a', 'b'];
  const idx = scrambleOrder(words, () => 0.999999);
  assert.deepEqual(idx, [0, 2, 1]);
  assert.deepEqual(scrambleOrder(['x', 'x', 'x']), [0, 1, 2], '전부 같으면 그대로');
});

test('pickPuzzle: 낼 수 있는 문장만 고르고, 없으면 null', () => {
  const cues = [
    { en: 'Hi.' }, // 1단어
    { en: 'Come on, Woody!' },
    { en: 'one two three four five six seven eight nine' }, // 9단어
    { en: 'To infinity and beyond!' },
  ];
  assert.equal(pickPuzzle(cues, () => 0), cues[1]);
  assert.equal(pickPuzzle(cues, () => 0.99), cues[3]);
  assert.equal(pickPuzzle([{ en: 'Hi.' }]), null);
  assert.equal(pickPuzzle([]), null);
  assert.equal(pickPuzzle(null), null);
});

test('checkOrder: 자리별 비교, 같은 단어가 여러 번 나와도 됨', () => {
  const answer = ['No,', 'no', 'no!'];
  assert.deepEqual(checkOrder(['No,', 'no', 'no!'], answer), { correct: true, wrong: [false, false, false] });
  assert.deepEqual(checkOrder(['no', 'No,', 'no!'], answer), { correct: false, wrong: [true, true, false] });
  assert.equal(checkOrder(['No,', 'no'], answer).correct, false, '덜 놓음');
});
