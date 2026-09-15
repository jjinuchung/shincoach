// ✍️ 받아쓰기 규칙 테스트: node --test tests/dictation.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  bare, blankCount, pickBlanks, makeDistractors, makeDictation, checkBlank,
  DICT_MIN_WORDS, DICT_MAX_WORDS, DICT_CHOICES,
} from '../js/dictation.js';

const words = JSON.parse(fs.readFileSync(new URL('../vocab/words.json', import.meta.url), 'utf8'));
const basic = JSON.parse(fs.readFileSync(new URL('../vocab/basic.json', import.meta.url), 'utf8'));
const POOL = [...Object.keys(words), ...basic];
const KNOWN = new Set(POOL);

/** 테스트용 고정 난수 (같은 결과가 나오게) */
function seeded(seed = 1) {
  let s = seed;
  return () => ((s = (s * 16807) % 2147483647) / 2147483647);
}

test('bare: 구두점·대문자를 벗겨 비교용으로', () => {
  assert.equal(bare('Woody!'), 'woody');
  assert.equal(bare('door.'), 'door');
  assert.equal(bare("Don't"), "don't");
  assert.equal(bare('...'), '');
});

test('blankCount: 익숙해진 문장(box 2+)일수록 빈칸이 늘어난다', () => {
  assert.equal(blankCount(0), 1);
  assert.equal(blankCount(1), 1);
  assert.equal(blankCount(2), 2);
  assert.equal(blankCount(4), 2);
  assert.equal(blankCount(undefined), 1);
});

test('pickBlanks: 못 말했던 단어 → 사전 단어 → 내용어 순, 기능어는 마지막', () => {
  const w = ['I', 'was', 'walking', 'through', 'the', 'door.'];
  // 아무 정보도 없으면 기능어(was, the)는 뒤로
  const plain = pickBlanks(w, { known: KNOWN, count: 3 });
  assert.ok(!plain.includes(1), 'was는 앞쪽에 오면 안 됨');
  assert.ok(!plain.includes(4), 'the도 마찬가지');

  // 못 말한 단어가 있으면 그게 1순위
  const withMiss = pickBlanks(w, { known: KNOWN, missed: { door: 2 }, count: 1 });
  assert.deepEqual(withMiss, [5], '놓친 door를 먼저 뚫는다');
});

test('pickBlanks: 우선순위 순서로 돌려준다 (자리 순이 아니라)', () => {
  const w = ['The', 'brave', 'dog', 'ran.'];
  const got = pickBlanks(w, { known: KNOWN, missed: { ran: 5 }, count: 2 });
  assert.equal(got[0], 3, '놓친 ran이 첫 번째');
});

test('pickBlanks: 한 글자 단어는 뚫지 않는다 (소리가 너무 짧다)', () => {
  const w = ['I', 'a', 'brave', 'dog.'];
  const got = pickBlanks(w, { known: KNOWN, count: 4 });
  assert.ok(!got.includes(0) && !got.includes(1));
});

test('makeDistractors: 비슷하게 들리는 단어로 (무작위가 아니라)', () => {
  const d = makeDistractors('walking', POOL, 3, seeded(3));
  assert.equal(d.length, 3);
  for (const w of d) {
    assert.notEqual(w, 'walking');
    assert.ok(Math.abs(w.length - 'walking'.length) <= 2, `${w}: 길이가 비슷해야 함`);
  }
  // 실제로 헷갈릴 만한 단어가 나오는지 (사전에 있는 -king/-ing 계열)
  const all = makeDistractors('walking', POOL, 10, seeded(1));
  assert.ok(all.some((w) => w.endsWith('king') || w.endsWith('ing')), `비슷한 소리가 있어야: ${all}`);
});

test('makeDistractors: 후보가 없으면 빈 배열 (문항을 버리게)', () => {
  assert.deepEqual(makeDistractors('zzzqqq', POOL, 3, seeded(1)), []);
  assert.deepEqual(makeDistractors('', POOL, 3, seeded(1)), []);
  assert.deepEqual(makeDistractors('door', [], 3, seeded(1)), []);
});

test('makeDictation: 빈칸·보기·원문 토큰이 맞는다', () => {
  const r = makeDictation({ en: 'I was walking through the door.' }, { box: 0, known: KNOWN, pool: POOL, rng: seeded(7) });
  assert.ok(r);
  assert.deepEqual(r.words, ['I', 'was', 'walking', 'through', 'the', 'door.']);
  assert.equal(r.blanks.length, 1, 'box 0이면 한 칸');
  const b = r.blanks[0];
  assert.ok(b.index >= 0 && b.index < r.words.length);
  assert.equal(b.answer, bare(r.words[b.index]), '정답은 그 자리의 단어');
  assert.equal(b.choices.length, DICT_CHOICES);
  assert.ok(b.choices.includes(b.answer), '보기에 정답이 있어야 함');
  assert.equal(new Set(b.choices).size, DICT_CHOICES, '보기가 겹치면 안 됨');
});

test('makeDictation: box 2면 두 칸, 놓친 단어가 들어간다', () => {
  const r = makeDictation({ en: 'I was walking through the door.' }, {
    box: 2, known: KNOWN, pool: POOL, missed: { walking: 3 }, rng: seeded(11),
  });
  assert.equal(r.blanks.length, 2);
  assert.ok(r.blanks.some((b) => b.answer === 'walking'), '놓친 단어가 빈칸에');
  assert.deepEqual(r.blanks.map((b) => b.index), [...r.blanks.map((b) => b.index)].sort((a, b) => a - b), '자리 순서대로');
});

test('makeDictation: 너무 짧거나 긴 문장은 만들지 않는다', () => {
  assert.equal(makeDictation({ en: 'Go now.' }, { known: KNOWN, pool: POOL }), null);
  const long = new Array(DICT_MAX_WORDS + 2).fill('word').join(' ');
  assert.equal(makeDictation({ en: long }, { known: KNOWN, pool: POOL }), null);
  assert.equal(makeDictation(null, {}), null);
  assert.equal(makeDictation({ en: '' }, {}), null);
});

test('makeDictation: 사전이 없으면(오답을 못 만들면) null — 억지 문항을 내지 않는다', () => {
  assert.equal(makeDictation({ en: 'I was walking through the door.' }, { pool: [], known: KNOWN }), null);
});

test('makeDictation: 최소 길이 문장도 낼 수 있다', () => {
  const r = makeDictation({ en: 'He was very brave.' }, { known: KNOWN, pool: POOL, rng: seeded(5) });
  assert.ok(r, `${DICT_MIN_WORDS}단어는 가능해야 함`);
  assert.equal(r.words.length, 4);
});

test('checkBlank: 대소문자·구두점 무시하고 비교', () => {
  const b = { answer: 'door', choices: [] };
  assert.equal(checkBlank(b, 'door'), true);
  assert.equal(checkBlank(b, 'Door.'), true);
  assert.equal(checkBlank(b, 'floor'), false);
  assert.equal(checkBlank(null, 'door'), false);
});

test('실제 사전으로: 오답이 눈으로 바로 걸러지지 않는다', () => {
  // 정답과 오답의 길이 차이가 크면 듣지 않고도 고를 수 있다
  for (const en of ['He was very brave that day.', 'I can see the little house.', 'She walked into the room.']) {
    const r = makeDictation({ en }, { known: KNOWN, pool: POOL, rng: seeded(13) });
    if (!r) continue;
    for (const b of r.blanks) {
      const lens = b.choices.map((c) => c.length);
      assert.ok(Math.max(...lens) - Math.min(...lens) <= 4, `${en} / ${b.choices}: 길이 차이가 너무 큼`);
    }
  }
});
