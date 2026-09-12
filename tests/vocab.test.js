// 단어장 테스트: node --test tests/vocab.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stemWord, stripContraction, tokenize, createVocab } from '../js/vocab.js';

const read = (f) => JSON.parse(readFileSync(new URL('../vocab/' + f, import.meta.url), 'utf8'));
const vocab = createVocab({ basic: read('basic.json'), words: read('words.json'), phrases: read('phrases.json') });

test('stripContraction', () => {
  assert.equal(stripContraction("didn't"), 'did');
  assert.equal(stripContraction("can't"), 'can');
  assert.equal(stripContraction("won't"), 'will');
  assert.equal(stripContraction("toy's"), 'toy');
  assert.equal(stripContraction("we'll"), 'we');
  assert.equal(stripContraction('solve'), 'solve');
});

test('stemWord: 변화형 → 기본형 (사전에 있는 것만)', () => {
  const known = vocab.known;
  assert.equal(stemWord('solved', known), 'solve');
  assert.equal(stemWord('solving', known), 'solve');
  assert.equal(stemWord('batteries', known), 'battery');
  assert.equal(stemWord('hopping', known), 'hop');
  assert.equal(stemWord('married', known), 'married'); // 사전에 married 자체가 있음
  assert.equal(stemWord('puppies', known), 'puppy');
  assert.equal(stemWord('younger', known), 'young');
  assert.equal(stemWord('quickest', known), 'quick');
  assert.equal(stemWord('xyzzy', known), 'xyzzy'); // 모르는 단어는 그대로
});

test('tokenize: 구두점·따옴표 제거, 순서 유지', () => {
  assert.deepEqual(tokenize('"But we didn\'t solve my murder."'), ['but', 'we', "didn't", 'solve', 'my', 'murder']);
  assert.deepEqual(tokenize("Kids' toys, ok?"), ["kids'", 'toys', 'ok']); // 끝 아포스트로피는 stemWord에서 처리
  assert.equal(stemWord("kids'", vocab.known), 'kids');
});

test('lookup: 기초 단어 제외, 사전 단어에 뜻', () => {
  const r = vocab.lookup("But we didn't solve my murder.");
  assert.deepEqual(r.map((x) => x.term), ['solve', 'murder']);
  assert.equal(r[0].meaning, '해결하다, 풀다');
  assert.equal(r[1].meaning, '살인(하다)');
});

test('lookup: 표현이 먼저, 표현에 포함된 단어는 중복 안 함', () => {
  const r = vocab.lookup('Step aside. I know CPR.');
  assert.equal(r[0].kind, 'phrase');
  assert.equal(r[0].term, 'step aside');
  assert.ok(!r.some((x) => x.term === 'step' || x.term === 'aside'), '표현에 들어간 단어는 따로 안 나옴');
});

test('lookup: 와일드카드 표현 (figure * out)', () => {
  const r = vocab.lookup("Let's figure it out together.");
  assert.ok(r.some((x) => x.kind === 'phrase' && x.term === 'figure … out'));
});

test('lookup: 별칭(=) 따라가기, 사투리 표기', () => {
  const r = vocab.lookup("What are you doin', darlin'?");
  assert.ok(r.some((x) => x.term === "darlin'" && x.meaning.includes('얘야')));
  assert.ok(!r.some((x) => x.term === "doin'"), "doin' → do 는 기초 단어라 표시 안 함");
});

test('lookup: 아무것도 없으면 빈 배열', () => {
  assert.deepEqual(vocab.lookup('I am here.'), []);
});
