// 말하기 확인 판정 로직 테스트: node --test tests/speak.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { scoreTranscript, normalizeWords } from '../js/speak.js';

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
