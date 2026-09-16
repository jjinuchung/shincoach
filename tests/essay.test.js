// ✍️ 에세이 규칙 테스트: node --test tests/essay.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { makeFrame, pickPrompts, correct, looksEnglish, tooShort, MIN_WORDS, MIN_BLANK_WORDS, MAX_BLANK_WORDS } from '../js/essay.js';

const words = JSON.parse(fs.readFileSync(new URL('../vocab/words.json', import.meta.url), 'utf8'));
const basic = JSON.parse(fs.readFileSync(new URL('../vocab/basic.json', import.meta.url), 'utf8'));
const KNOWN = new Set([...Object.keys(words), ...basic]);
const BASIC = new Set(basic);

const rec = (en, extra = {}) => ({ done: true, en, ko: '', box: 1, lastAt: 1, ...extra });

test('틀 만들기: 자연스러운 자리에서 끊고 뒷부분을 비운다', () => {
  const f = makeFrame("I can't believe I just caught a Gengar!");
  assert.ok(f, '만들어져야 한다');
  assert.equal(f.keep, "I can't believe I just", 'just 뒤에서 끊는다');
  assert.equal(f.rest, 'caught a Gengar!');
  assert.ok(f.blankWords >= 2);
});

test('틀 만들기: 너무 짧거나 긴 문장은 쓰지 않는다', () => {
  assert.equal(makeFrame('Gengar!'), null);
  assert.equal(makeFrame('Use Fire Punch!'), null, `${MIN_WORDS}단어 미만`);
  assert.equal(makeFrame('a '.repeat(20)), null, '너무 김');
});

test('틀 만들기: 고정 부분 끝의 쉼표는 떼어 낸다', () => {
  const f = makeFrame('The two of us will trail behind and help them out.');
  assert.ok(f);
  assert.ok(!/[,.!?]$/.test(f.keep), `고정 부분이 부호로 끝나면 안 된다: "${f.keep}"`);
});

test('문장 고르기: 명령문보다 "내 이야기"로 바꾸기 쉬운 문장을 앞에 둔다', () => {
  const list = [
    rec('Dodge it with Quick Attack right now!'),
    rec("I can't believe I just caught a Gengar!"),
  ];
  const picked = pickPrompts(list, 2);
  assert.equal(picked.length, 2);
  assert.match(picked[0].rec.en, /I can't believe/, '1인칭 문장이 먼저');
});

test('문장 고르기: 자막에 없는 옛 기록과 두 화자가 겹친 줄은 뺀다', () => {
  const list = [
    rec("I'm her deputy. I'm her deputy. Yes!"),        // 겹쳐 말한 줄
    rec('I think I know what that means today.', { gone: true }),
    rec('We will go to the park after school.'),
  ];
  const picked = pickPrompts(list, 5, { cueOf: (r) => !r.gone });
  assert.equal(picked.length, 1);
  assert.match(picked[0].rec.en, /the park/);
});

test('교정: 대문자 I · 마침표', () => {
  const r = correct('I think', 'i can do it', { known: KNOWN });
  assert.equal(r.fixed, 'I think I can do it.');
  assert.ok(r.notes.some((n) => n.why.includes('대문자')));
  assert.ok(r.notes.some((n) => n.why.includes('마침표')));
});

test('교정: 축약형 cant → can\'t', () => {
  const r = correct('I think', 'i cant do it', { known: KNOWN });
  assert.match(r.fixed, /can't/);
  assert.ok(r.notes.some((n) => n.from === 'cant' && n.to === "can't"));
});

test('교정: a / an', () => {
  const a = correct('I want', 'a apple', { known: KNOWN });
  assert.match(a.fixed, /an apple/);
  const b = correct('I want', 'an bike', { known: KNOWN });
  assert.match(b.fixed, /a bike/);
});

test('교정: 철자는 명백한 오타 목록·글자 자리바꿈일 때만 고친다', () => {
  assert.match(correct('I go to', 'scool', { known: KNOWN }).fixed, /school/, '흔한 오타 목록');
  assert.match(correct('I play with my', 'freind', { known: KNOWN }).fixed, /friend/, '붙은 두 글자 자리바꿈');
  assert.match(correct('I play with', 'Jinwoo', { known: KNOWN }).fixed, /Jinwoo/, '이름은 건드리지 않는다');
  assert.match(correct('I saw a', 'zqxwv', { known: KNOWN }).fixed, /zqxwv/, '모르는 말은 그대로 둔다');
});

test('교정: 바르게 쓴 말은 절대 바꾸지 않는다 (Codex 리뷰 반례 전부)', () => {
  const same = (keep, written, expect) => assert.equal(correct(keep, written, { known: KNOWN }).fixed, expect);
  // 사전에 goat은 없고 goal은 있다 — 비슷한 단어로 고치면 염소가 골이 된다
  same('I like', 'a pet goat', 'I like a pet goat.');
  // 복수형·과거형을 떼면 아이에게 틀린 영어를 가르치게 된다
  same('I like', 'two ducks', 'I like two ducks.');
  same('I like', 'baking cakes', 'I like baking cakes.');
  same('I want to play', 'soccer today', 'I want to play soccer today.');
  // lets 는 그 자체로 올바른 동사다 (엄마가 놀게 해 준다)
  same('My mom', 'lets me play', 'My mom lets me play.');
  // a useful 은 맞다 (u는 소리가 갈려서 관사를 건드리지 않는다)
  same('I want', 'a useful toy', 'I want a useful toy.');
  // 강조로 두 번 쓴 말은 아이가 일부러 쓴 것
  same('I feel', 'very very happy', 'I feel very happy.'.replace('very happy', 'very very happy'));
});

test('교정: 같은 말을 두 번 쓴 것은 the·a 같은 말만 지운다', () => {
  const r = correct('I saw', 'the the big dog', { known: KNOWN });
  assert.match(r.fixed, /I saw the big dog\./);
  assert.ok(r.notes.some((n) => n.why.includes('두 번')));
  // 뜻이 있는 말이 겹친 것은 아이 의도일 수 있으므로 그대로 둔다
  assert.equal(correct('I saw', 'a big big dog', { known: KNOWN }).fixed, 'I saw a big big dog.');
});

test('교정: 틀(고정 부분)은 건드리지 않는다', () => {
  const r = correct("I can't believe I just", 'won.', { known: KNOWN });
  assert.ok(r.fixed.startsWith("I can't believe I just"), '앞부분 그대로');
});

test('교정: 고칠 게 없으면 설명도 없다', () => {
  const r = correct('I want to', 'play with my friend.', { known: KNOWN });
  assert.equal(r.fixed, 'I want to play with my friend.');
  assert.equal(r.notes.length, 0);
});

test('한글로 쓰면 영어로 쓰자고 알려준다', () => {
  assert.equal(looksEnglish('나는 학교에 갔다'), false);
  assert.equal(looksEnglish('I went to school'), true);
  assert.equal(looksEnglish('   '), false);
});

test('틀: 빈칸은 언제나 2~5단어 (긴 문장이면 고정 부분을 길게 둔다)', () => {
  const sentences = [
    'I want to play with my friend today.',
    'I want to go to the park with all of my friends after school.',
    'We will go to the park after school.',
    "I can't believe I just caught a Gengar!",
    'The two of us will trail behind and help them out.',
  ];
  for (const en of sentences) {
    const f = makeFrame(en);
    assert.ok(f, `틀이 만들어져야 한다: ${en}`);
    assert.ok(f.blankWords >= MIN_BLANK_WORDS && f.blankWords <= MAX_BLANK_WORDS,
      `빈칸 ${f.blankWords}단어 — 2~5여야 한다: "${f.keep} ___"`);
  }
});

test('보상만 노린 한 글자 답은 막는다', () => {
  assert.equal(tooShort('a'), true);
  assert.equal(tooShort('  '), true);
  assert.equal(tooShort('won'), false);
  assert.equal(tooShort('my dog'), false);
});

test('교정: 3인칭 s는 자동으로 붙이지 않는다 (문맥 없이는 판단할 수 없음)', () => {
  // 붙이는 규칙을 두면 아래 두 문장이 **맞는 문장인데 틀린 문장으로** 바뀐다 (Codex #6에서 재현)
  assert.equal(correct('I watched', 'it go away', { known: KNOWN }).fixed, 'I watched it go away.');
  assert.equal(correct('I think', 'he read it yesterday', { known: KNOWN }).fixed, 'I think he read it yesterday.');
  // 진짜 3인칭 오류(he go)는 못 고치지만, 맞는 문장을 망치지 않는 쪽을 택한 것
});
