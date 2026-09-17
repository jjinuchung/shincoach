// 🧩 문장 퍼즐 순수 로직 테스트: node --test tests/puzzle.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  splitWords, isPuzzleable, shuffle, scrambleOrder, pickPuzzle, checkOrder, PUZZLE_MIN_WORDS, PUZZLE_MAX_WORDS,
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

test('isPuzzleable: 5~8단어, 서로 다른 단어 2개 이상', () => {
  assert.equal(isPuzzleable({ en: 'Hi there' }), false, '2단어');
  assert.equal(isPuzzleable({ en: 'a b c d e' }), true, '5단어');
  assert.equal(isPuzzleable({ en: 'a b c d e f g h' }), true, '8단어');
  assert.equal(isPuzzleable({ en: 'a b c d e f g h i' }), false, '9단어');
  assert.equal(isPuzzleable({ en: 'no no no no no' }), false, '전부 같은 단어');
  assert.equal(isPuzzleable({ en: 'No, I said no way!' }), true, '구두점·대소문자가 달라도 정상 문장은 낸다');
  assert.equal(isPuzzleable(null), false);
  assert.equal(isPuzzleable({ en: '' }), false);
  assert.equal(PUZZLE_MIN_WORDS, 5);
  assert.equal(PUZZLE_MAX_WORDS, 8);
});

// 3~4단어짜리는 감탄·명령 조각이라 나열할 거리가 없다 (태블릿에서 실제로 나와서 뺐다)
test('🧩 짧은 문장은 퍼즐로 안 낸다 (4단어 이하)', () => {
  for (const en of [
    'Use Fire Punch!',
    "Gengar, let's go!",
    'Oh yeah, Gengar!',
    'Thank you, Gengar!',
    'All right, Ice Punch!',
    "What's this for?",
  ]) {
    assert.equal(isPuzzleable({ en }), false, en);
  }
  // 5단어부터는 그대로 나온다
  for (const en of [
    "I can't believe I did that.",
    'You have to help me now.',
    'Where do you think you are going?',
  ]) {
    assert.equal(isPuzzleable({ en }), true, en);
  }
});

test('🧩 pickPuzzle은 짧은 문장만 있는 구간에서는 아무것도 안 고른다', () => {
  const shortOnly = [{ en: 'Use Fire Punch!' }, { en: 'Oh yeah, Gengar!' }, { en: 'Go, Pikachu!' }];
  assert.equal(pickPuzzle(shortOnly), null, '짧은 것만 있으면 퍼즐을 건너뛴다');
  const mixed = [...shortOnly, { en: 'I really want to go home now.' }];
  assert.equal(pickPuzzle(mixed).en, 'I really want to go home now.', '긴 문장만 고른다');
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
    { en: 'Hi.' },                                    // 1단어
    { en: 'To infinity and beyond!' },                // 4단어 — 이제 후보 아님
    { en: 'Come on, Woody, we have to go!' },
    { en: 'one two three four five six seven eight nine' }, // 9단어
    { en: 'You are my favorite deputy in town.' },
  ];
  assert.equal(pickPuzzle(cues, () => 0), cues[2]);
  assert.equal(pickPuzzle(cues, () => 0.99), cues[4]);
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

// 2026-09-17 진우 신고: 퍼즐에서 조각이 아무 반응도 안 해 앱을 껐다 켜야 했다.
// 드래그 도중 화면이 꺼지거나 다른 앱으로 넘어가면 안드로이드는 pointerup을 안 준다 →
// ui.drag가 남아 그 뒤 모든 터치가 무시됐다. 드래그는 DOM이 있어야 돌아가므로 여기서는
// "빠져나갈 길이 코드에 있는지"를 지킨다 (동작 자체는 헤드리스 브라우저로 확인).
test('🧩 드래그가 끼어도 빠져나갈 길이 있어야 한다 (앱을 껐다 켜지 않아도 되게)', async () => {
  const src = await readFile(new URL('../js/puzzle.js', import.meta.url), 'utf8');

  const onDown = src.slice(src.indexOf('function onDown('), src.indexOf('function unbindDrag('));
  assert.ok(!/if \(ui\.locked \|\| ui\.drag\) return;/.test(onDown),
    '남아 있는 드래그 때문에 새 터치를 통째로 무시하면 안 된다 — 아이가 앱을 껐다 켜야 했던 원인');
  assert.ok(/if \(ui\.drag\) cancelDrag\(\);/.test(onDown),
    '다음 터치가 앞선 드래그를 되돌리고 정상 동작해야 한다');

  assert.ok(/function cancelDrag\(\)/.test(src), '드래그를 정리하는 공통 출구가 있어야 한다');
  const cancel = src.slice(src.indexOf('function cancelDrag()'), src.indexOf('function onMove('));
  for (const 정리 of ['ui.drag = null', 'unbindDrag()', 'd.raf', 'd.scrollRaf', 'endDrag(d)']) {
    assert.ok(cancel.includes(정리), `cancelDrag가 ${정리} 까지 정리해야 한다`);
  }

  assert.ok(/document\.hidden\) cancelDrag\(\)/.test(src), '화면이 꺼지면 드래그를 끝내야 한다');
  assert.ok(/addEventListener\('blur', cancelDrag\)/.test(src), '다른 앱으로 넘어가도 드래그를 끝내야 한다');
});
