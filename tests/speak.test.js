// 말하기 확인 판정 로직 테스트: node --test tests/speak.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { scoreTranscript, normalizeWords, wordResults } from '../js/speak.js';

test('normalizeWords: 구두점 제거·소문자', () => {
  assert.deepEqual(normalizeWords("Step aside. I know CPR!"), ['step', 'aside', 'i', 'know', 'cpr']);
});

test('scoreTranscript: 거의 정확하면 통과, 비율 높음', () => {
  const s = scoreTranscript('Step aside. I know CPR.', 'step aside i know cpr');
  assert.equal(s.matched, 5);
  assert.equal(s.total, 5);
  assert.equal(s.passed, true);
});

test('scoreTranscript: 아이 발음 오차 허용 (aside→a side, know→no)', () => {
  const s = scoreTranscript('Step aside. I know CPR.', 'step a side I no CPR');
  assert.ok(s.matched >= 3, `matched=${s.matched}`);
  assert.equal(s.passed, true);
});

test('scoreTranscript: 아무 말이나 하면 실패', () => {
  const s = scoreTranscript("But we didn't solve my murder.", 'banana apple pizza');
  assert.equal(s.matched, 0);
  assert.equal(s.passed, false);
});

test('scoreTranscript: 40% 이상 또는 2단어 이상 맞으면 통과', () => {
  const s1 = scoreTranscript("But we didn't solve my murder.", 'we solve'); // 2/6
  assert.equal(s1.passed, true);
  const s2 = scoreTranscript("But we didn't solve my murder.", 'we'); // 1/6
  assert.equal(s2.passed, false);
});

test('scoreTranscript: 짧은 문장(1~2단어)은 1단어만 맞아도 통과', () => {
  assert.equal(scoreTranscript('Star Command.', 'star').passed, true);
  assert.equal(scoreTranscript('Howdy!', 'hello').passed, false);
});

test('scoreTranscript: 변화형/긴 단어 편집거리 허용 (solving≈solve, murderer≈murder)', () => {
  const s = scoreTranscript("solve my murder", 'solved my murderer');
  assert.equal(s.matched, 3);
});

test('#10 긴 문장은 대명사 2개만 맞아서는 통과 못 함, 내용어가 있으면 통과', () => {
  const long = "But we didn't solve my murder because you were not here today.";
  assert.equal(scoreTranscript(long, 'I you').passed, false, '대명사 나열');
  assert.equal(scoreTranscript(long, 'we you').passed, false);
  assert.equal(scoreTranscript(long, 'we solve murder').passed, true, '내용어 포함 3단어');
  assert.equal(scoreTranscript('Step aside. I know CPR.', 'step I').passed, true, '6단어 이하: 내용어 1 + 2단어 일치');
});

// ── 🎯 단어별 결과 ──

test('wordResults: 원문 단어 그대로, 맞은 자리/틀린 자리 구분', () => {
  const r = wordResults('I was walking through the door.', 'i walking the door');
  assert.deepEqual(r.map((w) => w.text), ['I', 'was', 'walking', 'through', 'the', 'door.']);
  assert.deepEqual(r.map((w) => w.ok), [true, false, true, false, true, true]);
});

test('wordResults: 같은 단어가 두 번 나오면 자리를 구분한다', () => {
  // "the"를 한 번만 말했으면 둘 중 하나만 맞은 것으로
  const r = wordResults('The cat saw the dog.', 'the dog');
  assert.deepEqual(r.map((w) => w.ok), [true, false, false, false, true]);
  assert.equal(r.filter((w) => w.ok).length, 2);
});

test('wordResults: 자막에 보이는 모습 그대로 (대문자·구두점 유지)', () => {
  const r = wordResults("Don't go, Woody!", "don't go woody");
  assert.deepEqual(r.map((w) => w.text), ["Don't", 'go,', 'Woody!']);
  assert.ok(r.every((w) => w.ok));
});

test('wordResults: 한 토큰이 비교용으로 두 단어면 둘 다 맞아야 ok', () => {
  const both = wordResults('A well-known face.', 'a well known face');
  assert.equal(both[1].ok, true, 'well·known 둘 다 맞음');
  const half = wordResults('A well-known face.', 'a well face');
  assert.equal(half[1].ok, false, 'known을 못 말했으면 틀린 것');
});

test('wordResults: 못 말한 게 없으면 전부 ok, 아무 말도 안 했으면 전부 틀림', () => {
  assert.ok(wordResults('Let it go.', 'let it go').every((w) => w.ok));
  assert.ok(wordResults('Let it go.', '').every((w) => !w.ok));
});

test('scoreTranscript: hits 배열이 원문 단어 수와 같고 matched와 일치', () => {
  const s = scoreTranscript('I was walking through the door.', 'i walking the door');
  assert.equal(s.hits.length, s.total);
  assert.equal(s.hits.filter(Boolean).length, s.matched);
});
