// ✍️ 에세이 규칙 테스트: node --test tests/essay.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { makeFrame, pickPrompts, correct, looksEnglish, tooShort, exportText, parseFixes, matchFixes, essayKey, isMultiSentence, MIN_WORDS, MIN_BLANK_WORDS, MAX_BLANK_WORDS } from '../js/essay.js';

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

// ── ★ 같은 배운 문장으로 다른 날 쓴 글은 id가 같다 (2026-10-06 — 밀린 에세이 18개 중 7개가 이 꼴이라 교정이 엉뚱한 날 글에 붙었다) ──

const SAME = 'muls4hp5-3rzcjd|20548'; // 진우의 [7]·[10]·[14]·[16] — 영상 id|배운 문장 시각
const dupEntries = () => [
  { id: SAME, date: '2026-10-03', origin: "I'll expand my rule from Juniper City to every city and town and village", written: "I'll expand my rule from Juniper City to space." },
  { id: SAME, date: '2026-10-04', origin: "I'll expand my rule from Juniper City to every city and town and village", written: "I'll expand my rule from Juniper City to every universe" },
  { id: SAME, date: '2026-10-05', origin: "I'll expand my rule from Juniper City to every city and town and village", written: "I'll expand my rule from Juniper City to whole universe." },
  { id: SAME, date: '2026-09-20', origin: "I'll expand my rule from Juniper City to every city and town and village", written: "I'll expand my rule from Juniper City to the sea.", coachFix: 'I will expand my rule from Juniper City to the sea.' },
];

test('✍️ 같은 id·다른 날 — 교정마다 제 날 글에 붙는다 (날짜 + id) · 이미 고쳐 준 날 글은 건드리지 않는다', () => {
  const fixes = [
    { date: '2026-10-05', written: "I'll expand my rule from Juniper City to whole universe.", fixed: 'C' },
    { date: '2026-10-03', written: "I'll expand my rule from Juniper City to space.", fixed: 'A' },
    { date: '2026-10-04', written: "I'll expand my rule from Juniper City to every universe", fixed: 'B' },
  ];
  assert.deepEqual(matchFixes(dupEntries(), fixes), [
    { id: SAME, date: '2026-10-05', fixed: 'C' },
    { id: SAME, date: '2026-10-03', fixed: 'A' },
    { id: SAME, date: '2026-10-04', fixed: 'B' },
  ]);
  assert.equal(essayKey('2026-10-03', SAME), `2026-10-03|${SAME}`);
});

test('✍️ 날짜를 적은 교정은 그날 글에만 — 앞 4단어·배운 문장이 같은 다른 날 글로 새지 않는다', () => {
  const fixes = [{ date: '2026-10-04', written: "I'll expand my rule from Juniper City to every universes!!", fixed: 'B' }];
  assert.deepEqual(matchFixes(dupEntries(), fixes), [{ id: SAME, date: '2026-10-04', fixed: 'B' }], '흐린 짝(앞 4단어)도 그날 안에서만');
  assert.deepEqual(matchFixes(dupEntries(), [{ date: '2026-10-09', written: 'nothing', origin: "I'll expand my rule from Juniper City to every city and town and village", fixed: 'X' }]), [], '그날 글이 없으면 안 붙는다');
});

test('✍️ 자기 글이 이미 고쳐진 옛 교정(fixes.json에 남은 것)은 같은 문장의 새 글로 옮겨 붙지 않는다', () => {
  // 9/20에 고쳐 준 교정이 fixes.json에 남아 있다 — 전엔 ②앞 4단어·③배운 문장으로 10/03 새 글에 붙었다
  const old = [{ written: "I'll expand my rule from Juniper City to the sea.", origin: "I'll expand my rule from Juniper City to every city and town and village", fixed: 'I will expand my rule from Juniper City to the sea.' }];
  assert.deepEqual(matchFixes(dupEntries(), old), []);
  // 같은 글을 또 쓴 경우(그 글은 아직 안 고침)는 똑같은 교정이 맞다 — 붙는다
  const twice = [...dupEntries(), { id: SAME, date: '2026-10-06', written: "I'll expand my rule from Juniper City to the sea.", origin: 'x' }];
  assert.deepEqual(matchFixes(twice, old), [{ id: SAME, date: '2026-10-06', fixed: 'I will expand my rule from Juniper City to the sea.' }]);
});

test('✍️ 흐린 짝은 똑같은 짝을 가로채지 않는다 — 단계마다 모든 교정을 먼저 훑는다', () => {
  const entries = [
    { id: 'a', date: 'd1', written: 'I went to the park today', origin: 'o1' },
    { id: 'b', date: 'd2', written: 'I went to the zoo today', origin: 'o2' },
  ];
  const fixes = [
    { written: 'I went to the beach', fixed: '흐린 짝 (앞 4단어만 같음)' },
    { written: 'I went to the park today', fixed: '똑같은 짝' },
  ];
  const out = matchFixes(entries, fixes);
  assert.deepEqual(out.find((o) => o.id === 'a'), { id: 'a', date: 'd1', fixed: '똑같은 짝' }, '똑같은 글이 먼저');
  assert.deepEqual(out.find((o) => o.id === 'b'), { id: 'b', date: 'd2', fixed: '흐린 짝 (앞 4단어만 같음)' });
});

test('✍️ 📊 붙여 넣기 — refs(날짜까지)로 되돌린다 · 같은 id라도 번호마다 따로', () => {
  const entries = dupEntries().filter((e) => !e.coachFix);
  const { refs, ids } = exportText(entries);
  assert.deepEqual(ids, [SAME, SAME, SAME]);
  assert.deepEqual(refs.map((r) => r.date), ['2026-10-03', '2026-10-04', '2026-10-05']);
  const fixes = parseFixes('[1] A.\n[2] B.\n[3] C.', refs);
  assert.deepEqual(fixes, [{ id: SAME, date: '2026-10-03', fixed: 'A.' }, { id: SAME, date: '2026-10-04', fixed: 'B.' }, { id: SAME, date: '2026-10-05', fixed: 'C.' }], '같은 id여도 셋 다');
});

test('✍️ 적용(db.applyEssayFixes) — 날짜가 있으면 그날 글에만, 없으면 아직 안 고친 글에만 (이미 고쳐 준 글을 덮어써 "안 읽음"으로 돌리지 않는다)', () => {
  const src = fs.readFileSync(new URL("../js/db.js", import.meta.url), "utf8");
  assert.match(src, /const dated = new Map\(fixes\.filter\(\(f\) => f && f\.date\)\.map\(\(f\) => \[`\$\{f\.date\}\|\$\{f\.id\}`, f\.fixed\]\)\);/);
  assert.match(src, /: !e\.coachFix && undated\.has\(e\.id\) \? undated\.get\(e\.id\) : null\);/);
  const st = fs.readFileSync(new URL("../js/stats.js", import.meta.url), "utf8");
  assert.match(st, /parseFixes\(area\.value, todo\.map\(\(e\) => \(\{ id: e\.id, date: e\.date \}\)\)\)/, '📊 붙여 넣기도 날짜까지');
  assert.match(st, /todoNo\.get\(essayKey\(d\.date, e\.id\)\)/, '📊 [번호]도 날짜까지');
});

// ── ★ 한 번 나온 문장은 다시 안 낸다 (2026-10-06, 진우 "에세이가 똑같은 문장만 매번 나온다" → 아버님 "💖 고른 문장도 한 번만, 다 보여 줬으면 다른 문장") ──

const SIX = [
  'I want to play soccer with my friends after school today.',
  'I can not believe we finally found the hidden treasure map.',
  'We have to find the key before the sun goes down tonight.',
  'I will open the door to the castle and see the dragon.',
  'She could be hiding in the forest behind the big tree.',
  'I used to feel scared of the dark until I got a lamp.',
];

test('✍️ 에세이 문장: 이미 나온 문장(essayAt · 쓴 적 있음)은 안 낸다 — 💖 내 문장도 한 번 · 안 나온 💖가 먼저', () => {
  const list = SIX.map((en, i) => rec(en, { start: i, fav: i === 0 || i === 3 }));
  // 처음: 💖 둘이 먼저
  const p1 = pickPrompts(list, 3);
  assert.deepEqual(p1.slice(0, 2).map((p) => p.rec.start).sort(), [0, 3], '💖 내 문장 먼저');
  // 💖 0번이 나왔다(essayAt) → 다음엔 💖 3번 + 다른 문장 — 0번은 안 나온다
  list[0].essayAt = 1000;
  const p2 = pickPrompts(list, 3);
  assert.equal(p2[0].rec.start, 3, '아직 안 나온 💖');
  assert.ok(!p2.some((p) => p.rec.start === 0), '나온 💖는 다시 안 나온다');
  // 쓴 적 있는 문장(opts.used — essayAt을 적기 전에 쓴 글)도 나온 것
  const used = (r) => r.start === 3;
  const p3 = pickPrompts(list, 3, { used });
  assert.ok(!p3.some((p) => p.rec.start === 0 || p.rec.start === 3), `나온 문장 없이 ${p3.map((p) => p.rec.start)}`);
  assert.equal(p3.length, 3);
});

test('✍️ 에세이 문장: 그 영상 문장을 다 썼으면 나온 지 가장 오래된 문장부터 다시 (빈 화면 대신) · 안 나온 문장이 늘 먼저', () => {
  const list = SIX.map((en, i) => rec(en, { start: i, essayAt: 1000 * (6 - i) })); // 5번이 가장 오래전에 나옴
  const p = pickPrompts(list, 3);
  assert.deepEqual(p.map((x) => x.rec.start), [5, 4, 3], '가장 오래된 것부터');
  list[2].essayAt = 0; delete list[2].essayAt; // 2번은 아직 안 나옴
  assert.equal(pickPrompts(list, 3)[0].rec.start, 2, '안 나온 문장이 먼저');
});

test('✍️ 화면 연결 — 문장이 뜰 때 적는다(연습·아빠 교정 회차는 안 적음) · 기록은 sentenceStats.essayAt(백업 병합 max) · 이미 쓴 글도 나온 것', () => {
  const e = fs.readFileSync(new URL('../js/essay.js', import.meta.url), 'utf8');
  assert.match(e, /if \(ui\.o\.mode !== 'coach' && !ui\.o\.practice && ui\.o\.onShown\) ui\.o\.onShown\(it\);/);
  const t = fs.readFileSync(new URL('../js/track.js', import.meta.url), 'utf8');
  assert.match(t, /export function essayShown\(cue\) \{[\s\S]*?r\.essayAt = Date\.now\(\);\s*t\.dirty\.add\(key\);/);
  const body = t.split('export function essayShown(cue) {')[1].split('\n}')[0];
  assert.ok(body.includes('r.essayAt = Date.now()') && !/lastAt/.test(body), 'lastAt은 안 바꾼다 (문장을 다시 들은 게 아니다)');
  const d = fs.readFileSync(new URL('../js/db.js', import.meta.url), 'utf8');
  assert.match(d, /'reviewedAt', 'essayAt'\]\) out\[k\] = maxOf\(cur\[k\], rec\[k\]\);/, '백업 병합 max — 옛 백업이 "안 나옴"으로 되돌리지 않게');
  const p = fs.readFileSync(new URL('../js/player.js', import.meta.url), 'utf8');
  assert.match(p, /onShown: \(it\) => \{ if \(it\.cue\) track\.essayShown\(it\.cue\); state\.essayUsed\.add\(essayIdOf\(it\.rec\)\); \},/);
  assert.match(p, /const used = \(r\) => state\.essayUsed\.has\(essayIdOf\(r\)\);\n\s*return pickEssayPrompts\(track\.statsList\(\), count, \{ cueOf: \(r\) => !!cueForStart\(r\.start\), used \}\)/);
  assert.match(p, /if \(e && typeof e\.id === 'string' && e\.id\.startsWith\(`\$\{item\.id\}\|`\)\) state\.essayUsed\.add\(e\.id\);/, '콘텐츠를 열 때 이미 쓴 글');
});
