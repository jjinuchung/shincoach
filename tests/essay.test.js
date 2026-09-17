// ✍️ 에세이 규칙 테스트: node --test tests/essay.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { makeFrame, pickPrompts, correct, looksEnglish, tooShort, exportText, parseFixes, matchFixes, isMultiSentence, MIN_WORDS, MIN_BLANK_WORDS, MAX_BLANK_WORDS } from '../js/essay.js';

const words = JSON.parse(fs.readFileSync(new URL('../vocab/words.json', import.meta.url), 'utf8'));
const basic = JSON.parse(fs.readFileSync(new URL('../vocab/basic.json', import.meta.url), 'utf8'));
const KNOWN = new Set([...Object.keys(words), ...basic]);
const BASIC = new Set(basic);

const rec = (en, extra = {}) => ({ done: true, en, ko: '', box: 1, lastAt: 1, ...extra });

test('틀 만들기: 자연스러운 자리에서 끊고 뒷부분을 비운다', () => {
  const f = makeFrame("I can't believe I just caught a Gengar in the tall grass!");
  assert.ok(f, '만들어져야 한다');
  assert.equal(f.keep, "I can't believe I just", 'just 뒤에서 끊는다 (빈칸이 범위 가운데에 가장 가까운 자리)');
  assert.equal(f.rest, 'caught a Gengar in the tall grass!');
  assert.ok(f.blankWords >= MIN_BLANK_WORDS);
});

test('틀 만들기: 너무 짧거나 긴 문장은 쓰지 않는다', () => {
  assert.equal(makeFrame('Gengar!'), null);
  assert.equal(makeFrame('Use Fire Punch!'), null, `${MIN_WORDS}단어 미만`);
  assert.equal(makeFrame("I know, right? She's adorable."), null, '5단어 — 채울 게 2단어뿐이라 에세이가 안 된다');
  assert.equal(makeFrame('a '.repeat(25)), null, '너무 김');
});

test('틀 만들기: 고정 부분 끝의 쉼표는 떼어 낸다', () => {
  const f = makeFrame('The two of us will trail behind them and help everyone out.');
  assert.ok(f);
  assert.ok(!/[,.!?]$/.test(f.keep), `고정 부분이 부호로 끝나면 안 된다: "${f.keep}"`);
});

test('문장 고르기: 명령문보다 "내 이야기"로 바꾸기 쉬운 문장을 앞에 둔다', () => {
  const list = [
    rec('Dodge it with Quick Attack right now before it hits you!'),
    rec("I can't believe I just caught a Gengar in the tall grass!"),
  ];
  const picked = pickPrompts(list, 2);
  assert.equal(picked.length, 2);
  assert.match(picked[0].rec.en, /I can't believe/, '1인칭 문장이 먼저');
});

test('문장 고르기: 자막에 없는 옛 기록과 두 화자가 겹친 줄은 뺀다', () => {
  const list = [
    rec("I'm her deputy, I'm her deputy, and that is really that."), // 겹쳐 말한 줄
    rec('I think I know exactly what that means for us today.', { gone: true }),
    rec('We will go to the park after school with my friends.'),
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

test(`틀: 빈칸은 언제나 ${MIN_BLANK_WORDS}~${MAX_BLANK_WORDS}단어 (긴 문장이면 고정 부분을 길게 둔다)`, () => {
  const sentences = [
    'I want to play with my best friend at the playground today.',
    'I want to go to the park with all of my friends after school.',
    'We will go to the park after school and play soccer together.',
    "I can't believe I just caught a Gengar in the tall grass!",
    'The two of us will trail behind them and help everyone out.',
  ];
  for (const en of sentences) {
    const f = makeFrame(en);
    assert.ok(f, `틀이 만들어져야 한다: ${en}`);
    assert.ok(f.blankWords >= MIN_BLANK_WORDS && f.blankWords <= MAX_BLANK_WORDS,
      `빈칸 ${f.blankWords}단어 — ${MIN_BLANK_WORDS}~${MAX_BLANK_WORDS}여야 한다: "${f.keep} ___"`);
  }
});

// 아버님이 실제 결과를 보고 지적한 두 가지 (2026-09-17)
test('✍️ 짧은 문장은 안 낸다 — 채울 게 2단어뿐이면 에세이가 아니다', () => {
  for (const en of [
    "I know, right? She's adorable.",              // 5단어 → 진우가 2단어만 씀
    'My entire SD card flashed before my eyes.',   // 8단어
    'Use Fire Punch!',
  ]) {
    assert.equal(makeFrame(en), null, en);
  }
});

test('✍️ 감탄사 여러 개가 합쳐진 자막 큐는 안 낸다', () => {
  // 9단어라 길이로는 안 걸리지만 네 문장이라, 틀이 "It's really me! Yes!"가 되어 버린다
  assert.equal(isMultiSentence("It's really me! Yes! My goodness. You look great."), true);
  assert.equal(makeFrame("It's really me! Yes! My goodness. You look great and happy!"), null, '길어도 여러 문장이면 제외');
  assert.equal(isMultiSentence('I want to go to the park with my friends today.'), false, '한 문장은 통과');
  assert.equal(isMultiSentence('I wanna talk to you, device. Please, call me "Lily."'), true, '닫는 따옴표 뒤도 문장 끝');
  assert.equal(isMultiSentence("I can't believe it happened to me on my birthday!"), false, '문장 안의 아포스트로피는 무관');
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

test('👨‍👩‍👦 부모에게 넘기는 형식: [번호] 줄로 복사하고 그대로 되돌려 받는다', () => {
  const entries = [
    { id: 'a1', origin: 'I want to play with my friend today.', written: 'I want to play with my brother at a park' },
    { id: 'b2', origin: "I can't believe I just caught a Gengar!", written: "I can't believe I just got a new bycicle" },
  ];
  const { text, ids } = exportText(entries);
  assert.deepEqual(ids, ['a1', 'b2']);
  assert.match(text, /\[1\] 배운 문장: I want to play/);
  assert.match(text, /\[2\] 배운 문장: I can't believe/);

  // 메신저를 거치며 설명이 섞여도 번호 줄만 읽는다
  const reply = [
    '아빠가 고쳤어 ㅎㅎ',
    '[1] I want to play with my brother at the park.',
    '',
    '[2] I can\'t believe I just got a new bicycle!',
    '[5] 번호가 범위 밖이라 무시돼야 함',
  ].join('\n');
  const fixes = parseFixes(reply, ids);
  assert.equal(fixes.length, 2);
  assert.deepEqual(fixes[0], { id: 'a1', fixed: 'I want to play with my brother at the park.' });
  assert.deepEqual(fixes[1], { id: 'b2', fixed: "I can't believe I just got a new bicycle!" });
});

test('👨‍👩‍👦 되돌려 받기: 같은 번호가 두 번이면 처음 것만, 빈 줄·잡음은 무시', () => {
  const ids = ['x', 'y'];
  const fixes = parseFixes('[1] First one.\n[1] 두 번째로 온 같은 번호\n그냥 말\n[2]   \n[2] Second one.', ids);
  assert.equal(fixes.length, 2);
  assert.equal(fixes[0].fixed, 'First one.');
  assert.equal(fixes[1].fixed, 'Second one.');
});

test('👨‍👩‍👦 복사 목록이 비어 있으면 빈 결과', () => {
  const { text, ids } = exportText([]);
  assert.deepEqual(ids, []);
  assert.equal(parseFixes('[1] whatever', ids).length, 0, '붙일 곳이 없으면 무시');
  assert.match(text, /진우가 쓴 영어 문장/);
});

test('👨‍👩‍👦 배포로 온 교정문 짝맞추기: 다듬은 문장이 같으면 붙는다', () => {
  const entries = [
    { id: 'a', written: 'I want to play with my brother at a park', origin: 'I want to play with my friend today.' },
    { id: 'b', written: "I can't believe I just got a new bycicle", origin: "I can't believe I just caught a Gengar!" },
  ];
  const fixes = [
    { written: 'i want to play with my brother at a park.', fixed: 'I want to play with my brother at the park.' },
    { written: "I cant believe I just got a new bycicle", fixed: "I can't believe I just got a new bicycle!" },
  ];
  assert.deepEqual(matchFixes(entries, fixes), [
    { id: 'a', fixed: 'I want to play with my brother at the park.' },
    { id: 'b', fixed: "I can't believe I just got a new bicycle!" },
  ]);
});

test('👨‍👩‍👦 사진에서 조금 잘못 옮겨 적어도 앞 4단어로 찾는다', () => {
  const entries = [{ id: 'a', written: 'I played soccer with Minjun yesterday', origin: 'X' }];
  const fixes = [{ written: 'I played soccer with Minjoon yesterday at school', fixed: 'I played soccer with Minjun yesterday.' }];
  assert.deepEqual(matchFixes(entries, fixes), [{ id: 'a', fixed: 'I played soccer with Minjun yesterday.' }]);
});

test('👨‍👩‍👦 이미 고쳐 준 글·짝이 없는 글은 건드리지 않는다 (여러 번 배포해도 안전)', () => {
  const entries = [
    { id: 'done', written: 'I like my dog', origin: 'X', coachFix: '이미 고침' },
    { id: 'other', written: 'I go to school', origin: 'Y' },
  ];
  assert.deepEqual(matchFixes(entries, [{ written: 'I like my dog', fixed: '또 고침' }]), [], '이미 고친 글은 제외');
  assert.deepEqual(matchFixes(entries, [{ written: 'zzz nothing matches here', fixed: 'x' }]), [], '짝이 없으면 조용히 넘어감');
  assert.equal(matchFixes(entries, []).length, 0);
});

test('👨‍👩‍👦 written으로 못 찾으면 배운 문장(origin)으로 찾는다', () => {
  const entries = [{ id: 'a', written: 'totally different text', origin: 'I want to play with my friend today.' }];
  const fixes = [{ written: 'nope', origin: 'I want to play with my friend today.', fixed: 'I want to play with my cousin today.' }];
  assert.deepEqual(matchFixes(entries, fixes), [{ id: 'a', fixed: 'I want to play with my cousin today.' }]);
});
