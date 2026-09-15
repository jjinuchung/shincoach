// 단어장 테스트: node --test tests/vocab.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stemWord, stripContraction, tokenize, createVocab, findTokenRange, charRangeToTokens } from '../js/vocab.js';

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

test('findTokenRange: 문장 속 단어의 공백 토큰 자리 (기본형 ↔ 변화형)', () => {
  const known = new Set(['walk', 'door', 'look', 'up', 'run']);
  const t = 'I was walking through the door.';
  assert.deepEqual(findTokenRange(t, 'walk', known), [2, 2], 'walking → walk 자리');
  assert.deepEqual(findTokenRange(t, 'door', known), [5, 5], '구두점이 붙어도 찾음');
  assert.equal(findTokenRange(t, 'zzz', known), null, '없는 단어');
  assert.equal(findTokenRange(t, '', known), null);
});

test('[Codex #2] 표현은 실제 매치 구간 — 첫/끝 단어를 따로 찾으면 문장 전체가 잡힌다', () => {
  const v = createVocab({
    basic: ['get', 'up', 'and', 'stand', 'a', 'i'],
    words: { pick: '고르다', card: '카드' },
    phrases: { 'get up': '일어나', 'pick * up': '집어 들다', 'i mean': '내 말은', 'a lot': '많이' },
  });
  assert.deepEqual(v.findRange('Get up and stand up.', 'get up', 'phrase'), [0, 1], '문장 전체가 아니라 앞의 get up');
  assert.deepEqual(v.findRange('Pick a card, then pick it up and stand up.', 'pick … up', 'phrase'), [4, 6], '실제로 매치된 pick it up');
  assert.equal(v.findRange('Just look at me.', 'get up', 'phrase'), null, '없으면 버튼을 만들지 않는다');
});

test('[Codex #4] 한 글자로 시작하는 표현도 자리를 찾는다 (i mean, a lot)', () => {
  const v = createVocab({
    basic: ['i', 'a', 'mean', 'lot'],
    words: {},
    phrases: { 'i mean': '내 말은', 'a lot': '많이' },
  });
  assert.deepEqual(v.findRange('I mean a lot.', 'i mean', 'phrase'), [0, 1]);
  assert.deepEqual(v.findRange('I mean a lot.', 'a lot', 'phrase'), [2, 3]);
});

test('charRangeToTokens: 문자 구간 → 공백 토큰 자리', () => {
  const t = 'Get up and stand up.';
  assert.deepEqual(charRangeToTokens(t, 0, 6), [0, 1], '"Get up"');
  assert.deepEqual(charRangeToTokens(t, 11, 20), [3, 4], '"stand up."');
  assert.equal(charRangeToTokens(t, 100, 110), null, '범위 밖');
});

test('findTokenRange: 같은 단어가 여러 번 나오면 첫 자리 (패널이 중복 단어를 합치므로)', () => {
  const known = new Set(['up']);
  assert.deepEqual(findTokenRange('Get up and stand up.', 'up', known), [1, 1]);
});

test('findTokenRange 자리는 wordTimings 자리와 같은 규칙(공백 토큰)', () => {
  const en = 'I was walking through the door.';
  const tokens = en.split(/\s+/);
  const r = findTokenRange(en, 'walk', new Set(['walk']));
  assert.equal(tokens[r[0]], 'walking', '그 자리의 원문 토큰이 맞아야 그 소리가 재생됨');
});
