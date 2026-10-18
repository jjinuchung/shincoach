// 🎤 v292 감탄사(소리 낱말) — 2026-10-18 아버님 "진행하자"
// 영어 영상의 "우어~" "와" "크아" 같은 감탄사는 인식기가 글자로 못 바꿔 진우가 따라 해도 "다시 한번!"만 나왔다.
//   ① 감탄사만 있는 줄 → 미니언즈어 줄처럼 확인 없이 따라 해 보는 줄 (vocab.isSpeakable) · 🔁 복습에도 안 넣는다 (review.isDue·track.done)
//   ② 섞인 줄 → 소리 낱말은 채점에서 뺀다 (speak.scoreTranscript·wordResults)
//   ③ hey·yeah·wow·oops·ouch·yay·no 같은 진짜 낱말은 그대로 확인 (아버님이 고른 경계)
// node --test tests/sound292.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { isSoundWord, isSoundToken, soundOnly } from '../js/sounds.js';
import { isSpeakable, createVocab } from '../js/vocab.js';
import { scoreTranscript, wordResults } from '../js/speak.js';
import { isDue, reviewSummary, pickReviews, dueByItem, pickFavExtra } from '../js/review.js';

const rd = (f) => JSON.parse(readFileSync(new URL(`../vocab/${f}`, import.meta.url), 'utf8'));
const VOCAB = createVocab({ basic: rd('basic.json'), words: rd('words.json'), phrases: {} });
const T = '2026-10-18';

test('🎤 소리 낱말 — 흔한 감탄사 · 늘인 꼴 · 웃음은 소리 · 진짜 낱말은 아니다', () => {
  for (const w of ['whoa', 'Woah', 'huh', 'hmm', 'uh', 'um', 'ah', 'oh', 'ooh', 'ow', 'aw', 'eh', 'shh', 'phew', 'whee', 'ugh', 'argh', 'grr', 'yeehaw', 'woohoo', 'aha']) {
    assert.equal(isSoundWord(w), true, w);
  }
  for (const w of ['Whoaaa', 'Ahhhh', 'Hmmmm', 'Ooooh', 'Ohhhh', 'Uhhhh', 'Owww', 'Aaaah', 'Mmmmm']) assert.equal(isSoundWord(w), true, `늘인 꼴 ${w}`);
  for (const w of ['haha', 'hahaha', 'hehe', 'hohoho', 'ahaha', 'mwahaha', 'bwahaha']) assert.equal(isSoundWord(w), true, `웃음 ${w}`);
  // 진짜 낱말 — 인식도 잘 되고 배울 말 (아버님 경계) · 줄여 보면 진짜 낱말과 겹치는 꼴
  for (const w of ['hey', 'yeah', 'wow', 'oops', 'ouch', 'yay', 'no', 'yes', 'ok', 'okay', 'hi', 'ho', 'a', 'i', 'of', 'off', 'too', 'all', 'see', 'so', 'go', 'look', 'wait']) {
    assert.equal(isSoundWord(w), false, `진짜 낱말 ${w}`);
  }
  for (const w of ['Nooo', 'Yesss', 'Sooo', 'Wooow', 'Heyyy', 'Offff', 'Brrr']) assert.equal(isSoundWord(w), false, `늘였어도 진짜 낱말 ${w}`);
  assert.equal(isSoundWord(''), false);
  assert.equal(isSoundWord(null), false);
});

test('🎤 자막 조각 — 붙임표로 이은 것은 조각마다 · 문장부호는 떼고 본다', () => {
  for (const t of ['Uh-oh!', 'Ha-ha-ha.', 'Whoa,', '"Huh?"', 'Ooh…', '-Ow!', 'Whoo-hoo!']) assert.equal(isSoundToken(t), true, t);
  for (const t of ['well-known', 'oh-so', 'Hey!', '...', '♪', '']) assert.equal(isSoundToken(t), false, t);
});

test('🎤 감탄사만 있는 줄 (단어장 없이) — 이름도 낱말로 센다 · 문장부호·음악 표시만은 아니다', () => {
  for (const s of ['Huh?', 'Whoa, whoa, whoa!', 'Uh-oh.', '♪ Oh ♪', 'Hmm. Huh?', 'Ow! Ow! Ow! Ow! Ow!', 'Ah, ha-ha-ha. Ha, ha-ha-ha.', 'Um… uh…']) {
    assert.equal(soundOnly(s), true, s);
  }
  for (const s of ['Oh, Gengar!', 'Uh… No?', 'Uh, Sheriff?', 'Oh, I...', 'Whoa! Look at that!', 'Hey!', 'Oh, no!', '♪ ♪', '', '...']) {
    assert.equal(soundOnly(s), false, s);
  }
});

test('🎤 ① 따라 말하기를 확인하는 줄인가 (진짜 단어장) — 감탄사만·이름 외침은 아니다 · 감탄사 뒤 대문자 낱말은 이름이 아니다', () => {
  for (const s of ['Huh?', 'Whoa!', 'Hmm.', 'Oh.', 'Ow!', 'Uh...', 'Yeehaw!', 'Whoa, whoa, whoa.', 'Oh, Gengar!', 'Huh? Gengar?', 'Oh, SpongeBob.', 'Oh, bello!']) {
    assert.equal(isSpeakable(s, VOCAB), false, s);
  }
  for (const s of ['Uh, Sheriff?', 'Uh… No?', 'Uh… Okay.', 'Huh. Uh, boss?', 'Uh, I, um okay.', 'Whoa, look at that!', 'Wha... Wait. Wha...', 'Oh, no!', 'Hey!', 'Yeah.', 'Wow!', 'Oops.', 'Ouch!']) {
    assert.equal(isSpeakable(s, VOCAB), true, s);
  }
  // 옛 판정 그대로 (player.logic 🗣 시험과 같은 줄)
  assert.equal(isSpeakable('James and Henry!', VOCAB), true, '이름이 섞여도 영어');
  assert.equal(isSpeakable('Bello! Poopaye!', VOCAB), false, '미니언즈어');
  assert.equal(isSpeakable('Gengar!', VOCAB), false, '이름 외침');
});

test('🎤 ② 채점 — 섞인 줄의 소리 낱말은 빼고 센다 · 감탄사만이면 total 0', () => {
  const a = scoreTranscript('Whoa, whoa, whoa! Wait!', 'wait');
  assert.deepEqual([a.total, a.matched, a.passed], [1, 1, true], 'wait만 말해도 통과 (전엔 1/4로 실패)');
  const b = scoreTranscript('Oh my gosh, look at that!', 'my gosh look at that');
  assert.deepEqual([b.total, b.matched, b.ratio], [5, 5, 1], 'oh는 원문에서 뺀다 → ⭐도 그대로');
  assert.equal(scoreTranscript('Huh?', 'huh').total, 0);
  assert.equal(scoreTranscript('Hmm, I don\'t know.', 'i don\'t know').ratio, 1);
  // 진짜 낱말은 그대로 센다
  assert.equal(scoreTranscript('Hey, wow!', '').total, 2, 'hey·wow는 채점');
  assert.equal(scoreTranscript('Uh-oh, I am late.', 'banana').passed, false, '아무 말이나 하면 여전히 실패');
});

test('🎤 ② 단어별 결과 — 소리 낱말은 skip·sound(흐리게), 놓친 낱말 기록에 안 남는다 · 나머지 자리는 그대로', () => {
  const r = wordResults('Whoa! Look at that, huh?', 'look at that');
  assert.deepEqual(r.map((w) => [w.text, w.ok, !!w.skip, !!w.sound]), [
    ['Whoa!', true, true, true], ['Look', true, false, false], ['at', true, false, false], ['that,', true, false, false], ['huh?', true, true, true],
  ]);
  assert.deepEqual(r.flatMap((w) => w.missed), [], '감탄사는 "자주 놓치는 단어"에 안 들어간다');
  const m = wordResults('Uh, where are you going?', 'where you');
  assert.deepEqual(m.map((w) => w.ok), [true, true, false, true, false]);
  assert.deepEqual(m.flatMap((w) => w.missed), ['are', 'going']);
  // 구두점만인 조각은 전처럼 skip이지만 sound는 아니다
  const p = wordResults('Go — now!', 'go now');
  assert.deepEqual(p.map((w) => [w.text, !!w.skip, !!w.sound]), [['Go', false, false], ['—', true, false], ['now!', false, false]]);
});

test('🎤 🔁 복습 — 감탄사만 있는 문장 기록은 차례·요약·덤·영상별 밀린 수 모두에서 빠진다 · 수학 개념 기록(en 없음)은 그대로', () => {
  const rec = (start, en, patch = {}) => ({ key: `v|${start}`, itemId: 'v', start, en, done: true, box: 1, dueAt: '2026-10-10', ...patch });
  const quiet = rec(1, 'Huh?');
  const quiet2 = rec(2, 'Whoa, whoa, whoa!');
  const real = rec(3, 'Whoa! Look at that!');
  const name = rec(4, 'Oh, Gengar!'); // 단어장 없이는 이름을 못 가린다 → 복습에는 남고, 복습 화면에서 확인 없이 넘어간다(player)
  const all = [quiet, quiet2, real, name];
  assert.equal(isDue(quiet, T), false);
  assert.equal(isDue(quiet2, T), false);
  assert.equal(isDue(real, T), true);
  assert.equal(isDue(name, T), true);
  assert.equal(isDue({ box: 1, dueAt: '2026-10-10' }, T), true, '수학 개념 기록 (en 없음)');
  assert.deepEqual(pickReviews(all, T).map((r) => r.start), [3, 4]);
  assert.deepEqual(dueByItem(all, T), [{ itemId: 'v', due: 2, oldest: '2026-10-10' }], '홈·목록의 밀린 수 = 실제 회차');
  assert.deepEqual(reviewSummary([...all, rec(5, 'Ooh.', { dueAt: '2026-10-30' }), rec(6, 'Wait!', { dueAt: '2026-10-30' })], T), { dueCount: 2, waiting: 1, graduated: 0 });
  const favs = [rec(7, 'Huh?', { fav: true, dueAt: '2026-10-30' }), rec(8, 'I like it.', { fav: true, dueAt: '2026-10-30' })];
  assert.equal(pickFavExtra(favs, T).start, 8, '💖 덤에도 감탄사 줄은 안 나온다');
});
