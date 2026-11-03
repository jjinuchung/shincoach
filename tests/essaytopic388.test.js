// v388 (2026-11-03 아버님 기본안 「추천대로」 · 원고 30 「이대로」) — node --test tests/essaytopic388.test.js
//  ✍️ 영어 에세이 💡 오늘의 글감: 시작 화면에 그날 글감 셋(무리마다 하나) + 「✏️ 내 마음대로」 → 쓰기 칸 위에 물음 한 줄 + 영어 낱말 다섯(뜻 · 누르면 🔊)
//  · 고르지 않으면 지금 그대로 · 글감 낱말을 쓰면 칭찬 한 줄만(보상 그대로) · 기록 topic·tw → 📊 에세이 카드 · 📤 essay/todo · english/날짜.md
import { fakeIdb } from './fakeidb.js'; // ★ db.js보다 먼저
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { TOPICS, TOPIC_GROUPS, topicById, topicLabel, dayIndex, dayTopics, topicHits, praiseLine, topicDayText, topicWeekLine } from '../js/essaytopic.js';
import { initEssay, openEssay, closeEssay, abortEssay, makeFrame, REWARD, FINISH_REWARD } from '../js/essay.js';
import { getDaily, applyDailyDelta, emptyDaily, mergeDailyDelta, mergeEssayEntry, mergeEssayCopies } from '../js/db.js';
import { essayFiles, englishFiles } from '../js/upload.js';

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const tick = async (n = 3) => { for (let k = 0; k < n; k++) await Promise.resolve(); };

// ───────────────────── 가짜 화면 · 가짜 음성 (essay318과 같은 꼴) ─────────────────────

function fakeEl(tag = 'div') {
  let text = '';
  const e = {
    tagName: tag.toUpperCase(), hidden: false, disabled: false, className: '', value: '', placeholder: '', style: {}, children: [], attrs: {}, handlers: {},
    appendChild(c) { this.children.push(c); return c; },
    addEventListener(t, fn) { this.handlers[t] = fn; },
    click() { if (this.disabled) return false; if (this.handlers.click) this.handlers.click({ stopPropagation() {}, preventDefault() {} }); return true; },
    focus() {}, setAttribute(k, v) { this.attrs[k] = v; },
  };
  Object.defineProperty(e, 'textContent', {
    get() { return this.children.length ? this.children.map((c) => c.textContent).join('') : text; },
    set(v) { this.children = []; text = String(v); },
  });
  Object.defineProperty(e, 'innerHTML', { get() { return ''; }, set() { this.children = []; text = ''; } });
  return e;
}
const els = {};
const $ = (id) => (els[id] ||= fakeEl());
const synth = {
  cur: null, spoken: [],
  speak(u) { this.cur = u; this.spoken.push(u.text); },
  cancel() { const u = this.cur; this.cur = null; if (u && u.onend) u.onend(); },
};

before(async () => {
  globalThis.document = { hidden: false, getElementById: $, createElement: (t) => fakeEl(t), createTextNode: (t) => ({ textContent: String(t), nodeType: 3 }) };
  globalThis.window = { speechSynthesis: synth };
  globalThis.SpeechSynthesisUtterance = function Utter(text) { this.text = text; };
  initEssay();
  await getDaily('2000-01-01'); // 가짜 저장소 열기
});

const FULL = "I can't believe I just found the key to the old castle.";
const prompt = () => ({ rec: { en: FULL, ko: '' }, frame: makeFrame(FULL), cue: null });
const fish = topicById('A1');
const kidsOf = (box) => box.children.flatMap((c) => [c, ...kidsOf(c)]);
const buttonsOf = (box) => kidsOf(box).filter((c) => c.tagName === 'BUTTON');

// ───────────────────── 원고 ─────────────────────

test('📜 원고 30 — 무리 셋 × 열 · 글감마다 물음 한 줄 + 낱말 다섯 · 낱말 150 모두 다름(소문자 영어 · 뜻은 한글) · step은 10과 서로소', () => {
  assert.equal(TOPICS.length, 30);
  assert.deepEqual(TOPIC_GROUPS.map((g) => g.id), ['A', 'B', 'C']);
  const gcd = (a, b) => (b ? gcd(b, a % b) : a);
  for (const g of TOPIC_GROUPS) {
    const list = TOPICS.filter((t) => t.id.replace(/\d+$/, '') === g.id);
    assert.deepEqual(list.map((t) => t.id), Array.from({ length: 10 }, (_, i) => `${g.id}${i + 1}`), `${g.id} 무리 열`);
    assert.equal(gcd(g.step, list.length), 1, `${g.id} step이 무리 수와 서로소`);
  }
  const words = new Set();
  for (const t of TOPICS) {
    assert.ok(t.icon && t.name && t.q && !/[a-z]/i.test(t.q), `${t.id} 꼴`);
    assert.equal(t.words.length, 5, `${t.id} 낱말 다섯`);
    for (const [en, ko] of t.words) {
      assert.match(en, /^[a-z]+$/, `${t.id} ${en}`);
      assert.ok(ko && !/[a-z]/i.test(ko), `${t.id} ${en} 뜻`);
      assert.ok(!words.has(en), `겹친 낱말 ${en}`);
      words.add(en);
    }
  }
  assert.equal(words.size, 150);
  // 포켓몬 이름은 낱말에 안 넣음 · 없는 식구를 지어내지 않음(아빠·엄마만)
  for (const no of ['pikachu', 'greninja', 'pokemon', 'brother', 'sister', 'grandpa', 'grandma', 'baby']) assert.ok(!words.has(no), no);
  assert.ok(!TOPICS.some((t) => /동생|형|누나|언니|오빠|할머니|할아버지/.test(t.q + t.name)), '가족은 아빠·엄마만');
  assert.equal(topicById('A1').name, '낚시');
  assert.equal(topicById('Z9'), null);
  assert.equal(topicLabel(fish), '🎣 낚시');
  assert.equal(topicLabel(null), '');
});

test('📅 하루 셋 — 무리마다 하나(무리 차례) · 같은 날은 늘 같은 셋 · 무리마다 열흘 동안 모두 다름(7일 안에 다시 안 나옴) · 날짜를 못 읽으면 없음', () => {
  assert.deepEqual(dayTopics('2026-11-03').map((t) => t.id), ['A1', 'B2', 'C3']);
  assert.deepEqual(dayTopics('2026-11-04').map((t) => t.id), ['A2', 'B5', 'C10']);
  assert.deepEqual(dayTopics('2026-11-03'), dayTopics('2026-11-03'));
  const start = dayIndex('2026-01-01');
  const dateOf = (k) => new Date((start + k) * 86400000).toISOString().slice(0, 10);
  const seen = { A: [], B: [], C: [] };
  for (let k = 0; k < 800; k++) {
    const three = dayTopics(dateOf(k));
    assert.deepEqual(three.map((t) => t.id.replace(/\d+$/, '')), ['A', 'B', 'C'], dateOf(k));
    three.forEach((t) => seen[t.id[0]].push(t.id));
  }
  for (const g of ['A', 'B', 'C']) {
    for (let k = 0; k + 10 <= seen[g].length; k++) assert.equal(new Set(seen[g].slice(k, k + 10)).size, 10, `${g} 열흘 ${k}`);
  }
  assert.deepEqual(dayTopics(''), []);
  assert.deepEqual(dayTopics('2026-13'), []);
  assert.deepEqual(dayTopics('1969-12-31').map((t) => t.id), ['A10', 'B9', 'C6'], '1970년 앞(음수 날)도 셋');
  assert.equal(dayIndex('1970-01-02'), 1);
  // 해가 바뀌어도(12-31 → 01-01) 이어서 돈다
  const a = dayTopics('2026-12-31').map((t) => t.id);
  const b = dayTopics('2027-01-01').map((t) => t.id);
  assert.ok(a.every((id, i) => id !== b[i]), '이튿날은 다른 셋');
});

test('🔤 글감 낱말 찾기 — 꼴이 바뀌어도(-s·-es·-ies·-ed·-ing·겹자음·끝 e) 같은 낱말 · 비슷하기만 한 낱말은 아님 · 원고 차례 · 한 번씩', () => {
  assert.deepEqual(topicHits(fish, 'caught a HUGE octopus on the boats near rivers'), ['caught', 'huge', 'boat', 'octopus', 'river']);
  assert.deepEqual(topicHits(fish, 'river river river'), ['river'], '한 번씩');
  assert.deepEqual(topicHits(fish, 'river and a huge boat'), ['huge', 'boat', 'river'], '원고 차례');
  const t = (id, text) => topicHits(topicById(id), text);
  assert.deepEqual(t('A5', 'we kicked it and kept running, then scored'), ['kick', 'score', 'run']);
  assert.deepEqual(t('A6', 'we shared dinner'), ['dinner', 'share']);
  assert.deepEqual(t('A6', 'sharing is good'), ['share']);
  assert.deepEqual(t('B7', 'I help my dad\'s car'), ['dad', 'helped'], '원고 꼴이 과거여도 바탕 꼴로');
  assert.deepEqual(t('B9', 'I hurried'), ['hurry']);
  assert.deepEqual(t('C1', 'flies'), ['fly']);
  assert.deepEqual(t('C9', 'swimming'), ['swim']);
  assert.deepEqual(t('C10', 'I pressed it'), ['press']);
  assert.deepEqual(t('A4', 'one piece'), ['pieces']);
  assert.deepEqual(t('A7', 'two heroes watching'), ['hero', 'watched'], '-oes · -ing');
  assert.deepEqual(topicHits(fish, "the octopus's arm"), ['octopus'], "-'s를 떼고 본다(octopuss가 아니다)");
  assert.deepEqual(t('A8', 'I petted it'), ['pet']);
  assert.deepEqual(t('A8', 'I cut it'), [], 'cut은 cute가 아니다');
  assert.deepEqual(t('C7', 'my pants'), [], 'pants는 ant가 아니다');
  assert.deepEqual(t('A3', 'twin towers'), [], '낱말 가운데 든 것은 아니다');
  // 🔍 Codex 191차 #1 — 꼴을 떼다가 다른 낱말을 글감 낱말로 세지 않는다 (칭찬 줄·📊 숫자가 틀어진다)
  assert.deepEqual(t('C3', 'I was staring and stared at the sky'), [], 'staring·stared는 stare — star가 아니다(한 음절 star는 -ing·-ed 앞에서 r을 겹친다)');
  assert.deepEqual(t('C3', 'a star'), ['stars']);
  assert.deepEqual(t('C3', 'I starred in it'), ['stars'], '겹친 꼴은 star');
  assert.deepEqual(t('C6', 'I pasted it'), [], 'pasted는 paste — past는 동사가 아니다');
  assert.deepEqual(t('C6', 'in the past'), ['past']);
  assert.deepEqual(t('B10', 'I was drawing'), ['draw'], 'w는 안 겹친다 — draw 그대로');
  assert.deepEqual(t('C1', 'flying'), ['fly']);
  assert.deepEqual(t('B5', 'riding a bike'), ['ride'], '안 겹친 한 음절 꼴은 끝 e를 뗀 것');
  assert.deepEqual(t('C2', 'I named it'), ['name']);
  assert.deepEqual(t('A3', 'winning'), ['win']);
  assert.deepEqual(t('C6', 'we traveled far'), ['travel'], '두 음절 낱말은 안 겹쳐도 그대로');
  assert.deepEqual(topicHits(null, 'river'), []);
  assert.deepEqual(topicHits(fish, ''), []);
  assert.equal(praiseLine(['caught', 'boat']), '💡 글감 낱말을 썼어요: caught · boat');
  assert.equal(praiseLine([]), '');
  assert.equal(praiseLine(null), '');
});

test('📊 글감 줄 — 하루 한 줄(📤 english) · 최근 7일 한 줄(📊 에세이 카드) · 쓴 글이 없으면 빈 줄', () => {
  const e = (id, topic, tw) => ({ id, written: 'x', ...(topic ? { topic, tw } : {}) });
  const days = [
    { date: '2026-11-03', essays: [e('a', 'A1', ['boat']), e('b', 'A1', []), e('c', '', null)] },
    { date: '2026-11-02', essays: [e('d', 'C3', ['moon']), e('f', 'C3', ['stars'])] },
    { date: '2026-11-01', essays: [e('g')] },
    { date: '2026-10-27', essays: [e('h', 'A1', ['boat'])] }, // 7일 밖
    { date: '2026-10-31', essays: [] },
  ];
  assert.equal(topicDayText(days[0]), ' · ✍️ 에세이 3 · 💡 🎣 낚시(글감 낱말 쓴 글 1) · 글감 안 고름 1');
  assert.equal(topicDayText(days[2]), ' · ✍️ 에세이 1 · 💡 글감 안 고름 1');
  assert.equal(topicDayText(days[4]), '');
  assert.equal(topicDayText({ essays: [{ id: 'z', written: '' }] }), '', '안 쓴 글은 안 셈');
  assert.equal(topicWeekLine(days, '2026-11-03'),
    '💡 글감(최근 7일): 에세이 쓴 날 3일 중 글감 고른 날 2일 · 글감 낱말을 쓴 글 3/4 · 고른 글감 🎣 낚시 2 · 🚀 우주 여행 2');
  assert.equal(topicWeekLine([days[2]], '2026-11-03'), '💡 글감(최근 7일): 에세이 쓴 날 1일 중 글감 고른 날 0일 · 글감 낱말을 쓴 글 0/0');
  // 많이 고른 글감부터 · 오늘 뒤 날짜(시계가 앞섰던 기록)는 안 셈
  const more = [...days, { date: '2026-10-30', essays: [e('i', 'B2', []), e('j', 'B2', []), e('k', 'B2', ['rain'])] }, { date: '2026-11-05', essays: [e('l', 'C9', ['lion'])] }];
  assert.equal(topicWeekLine(more, '2026-11-03'),
    '💡 글감(최근 7일): 에세이 쓴 날 4일 중 글감 고른 날 3일 · 글감 낱말을 쓴 글 4/7 · 고른 글감 🌧️ 오늘 날씨 3 · 🎣 낚시 2 · 🚀 우주 여행 2');
  assert.equal(topicWeekLine([], '2026-11-03'), '');
  assert.equal(topicWeekLine(days, ''), '');
});

// ───────────────────── 화면 ─────────────────────

test('💡 시작 화면 — 글감 셋 + 「✏️ 내 마음대로」 · 안 누르면 어느 단추도 안 켜짐 · 누른 것만 켜짐 · 시작한 뒤엔 못 바꿈 · 쓰기 칸 위 카드(물음 · 낱말 다섯 — 누르면 🔊만) · 쓴 글감 낱말은 기록과 칭찬 한 줄로', async () => {
  const wrote = [];
  openEssay({
    prompts: [prompt(), prompt()], topics: dayTopics('2026-11-03'), reward: FINISH_REWARD, known: new Set(), sfx: {},
    speak: async () => ({ passed: true }), onWritten: (it) => wrote.push({ topic: it.topic, hits: it.topicHits }), onSaid: () => {}, onPass: async () => '',
    onFinished: async () => null, onDone: () => {},
  });
  const box = $('essay-topics');
  assert.equal(box.hidden, false);
  const btns = buttonsOf(box);
  assert.deepEqual(btns.map((b) => b.textContent), ['🎣 낚시', '🌧️ 오늘 날씨', '🚀 우주 여행', '✏️ 내 마음대로']);
  assert.ok(btns.every((b) => !/\bon\b/.test(b.className) && b.attrs['aria-pressed'] === 'false'), '처음엔 아무것도 안 켜짐');
  assert.ok(!/\d/.test(box.textContent), '시작 화면 글감 칸에 셈 없음');
  btns[2].click();
  btns[0].click();
  assert.deepEqual(btns.map((b) => /\bon\b/.test(b.className)), [true, false, false, false], '마지막에 누른 것만');
  assert.equal(btns[0].attrs['aria-pressed'], 'true');
  $('essay-start').click();
  btns[1].click(); // 시작한 뒤엔 못 바꿈
  assert.deepEqual(btns.map((b) => /\bon\b/.test(b.className)), [true, false, false, false]);
  const idea = $('essay-idea');
  assert.equal(idea.hidden, false);
  assert.match(idea.textContent, /^💡 🎣 낚시: 낚시에서 있었던 일이나, 낚고 싶은 물고기/);
  const words = buttonsOf(idea);
  assert.deepEqual(words.map((w) => w.children[0].textContent), ['caught', 'huge', 'boat', 'octopus', 'river']);
  assert.equal(words[0].children[1].textContent, '잡았다');
  assert.equal(typeof words[0].handlers.mousedown, 'function', '눌러도 쓰던 칸에서 손을 떼지 않게');
  $('essay-input').value = '';
  words[3].click();
  assert.equal(synth.spoken.at(-1), 'octopus', '🔊 읽어 주기');
  assert.equal($('essay-input').value, '', '칸에 넣지 않음');
  $('essay-input').value = 'caught a huge octopus on the boats';
  $('essay-submit').click();
  assert.deepEqual(wrote, [{ topic: 'A1', hits: ['caught', 'huge', 'boat', 'octopus'] }]);
  assert.equal($('essay-praise').hidden, false);
  assert.equal($('essay-praise').textContent, '💡 글감 낱말을 썼어요: caught · huge · boat · octopus');
  synth.cancel();
  await tick();
  $('essay-next').click();
  assert.equal($('essay-idea').hidden, false, '두 번째 문장도 같은 글감');
  assert.equal($('essay-praise').hidden, false, '(결과 화면 칸은 새로 쓰기 전까지 그대로 숨은 화면 안)');
  $('essay-input').value = 'went to school and played tag';
  $('essay-submit').click();
  assert.deepEqual(wrote[1], { topic: 'A1', hits: [] });
  assert.equal($('essay-praise').hidden, true, '글감 낱말이 없으면 칭찬 줄 없음');
  closeEssay();
});

test('✏️ 고르지 않음 · 내 마음대로 · 글감이 없는 회차 · 아빠 교정 — 지금과 똑같이(카드·칭찬 없음 · topic 빈 값)', async () => {
  const wrote = [];
  const open = (o = {}) => openEssay({
    prompts: [prompt()], reward: FINISH_REWARD, known: new Set(), sfx: {},
    speak: async () => ({ passed: true }), onWritten: (it) => wrote.push([it.topic, it.topicHits]), onSaid: () => {}, onPass: async () => '',
    onFinished: async () => null, onDone: () => {}, ...o,
  });
  open({ topics: dayTopics('2026-11-03') });
  $('essay-start').click();
  assert.equal($('essay-idea').hidden, true, '안 고르면 카드 없음');
  $('essay-input').value = 'caught a huge octopus';
  $('essay-submit').click();
  assert.equal($('essay-praise').hidden, true);
  open({ topics: dayTopics('2026-11-03') });
  buttonsOf($('essay-topics'))[3].click(); // ✏️ 내 마음대로
  assert.match(buttonsOf($('essay-topics'))[3].className, /\bfree\b.*\bon\b/);
  $('essay-start').click();
  assert.equal($('essay-idea').hidden, true);
  $('essay-input').value = 'caught a huge octopus';
  $('essay-submit').click();
  open({}); // 글감을 안 넘긴 회차(날짜를 모를 때)
  assert.equal($('essay-topics').hidden, true);
  $('essay-start').click();
  $('essay-input').value = 'caught a huge octopus';
  $('essay-submit').click();
  assert.deepEqual(wrote, [['', []], ['', []], ['', []]]);
  openEssay({
    mode: 'coach', topics: dayTopics('2026-11-03'),
    prompts: [{ id: 'e1', date: '2026-11-03', written: 'i run', coachFix: 'I run.', rec: {}, frame: { full: '', keep: '', blankWords: 0 }, cue: null }],
    reward: { xp: 1, coin: 1 }, known: new Set(), sfx: {}, speak: async () => ({}), onRead: () => {}, onFinished: async () => null, onDone: () => {},
  });
  assert.equal($('essay-topics').hidden, true, '아빠 교정 회차엔 글감 없음');
  $('essay-start').click();
  assert.equal($('essay-praise').hidden, true);
  closeEssay();
});

test('🔇 소리를 낼 수 없는 기기 — 낱말은 단추가 아닌 글자로만(누를 것이 없다)', () => {
  const saved = globalThis.window;
  globalThis.window = {};
  try {
    openEssay({ prompts: [prompt()], topics: dayTopics('2026-11-03'), reward: FINISH_REWARD, known: new Set(), sfx: {}, speak: async () => ({}), onWritten: () => {}, onFinished: async () => null, onDone: () => {} });
    buttonsOf($('essay-topics'))[0].click();
    $('essay-start').click();
    const idea = $('essay-idea');
    assert.equal(buttonsOf(idea).length, 0);
    assert.equal(kidsOf(idea).filter((c) => c.className === 'essay-word').length, 5);
  } finally {
    globalThis.window = saved;
    closeEssay();
  }
});

test('🔁 이어 열기 — 일반 → 중간에 닫힘 → 다시 · 「나중에 할래」 뒤 다시 · 아빠 교정 → 연습 → 일반 · Enter로 내기 — 앞 회차의 글감이 다음 회차로 새지 않는다 (🔍 Codex 191차 #4)', async () => {
  const wrote = [];
  const done = [];
  const base = {
    prompts: [prompt(), prompt()], reward: FINISH_REWARD, known: new Set(), sfx: {}, speak: async () => ({ passed: true }),
    onWritten: (it) => wrote.push([it.topic, it.topicHits]), onSaid: () => {}, onPass: async () => '', onFinished: async () => null, onDone: (s) => done.push(s),
  };
  const topics = dayTopics('2026-11-03');
  const lit = () => buttonsOf($('essay-topics')).map((b) => /\bon\b/.test(b.className));
  const enter = (text) => { $('essay-input').value = text; $('essay-input').handlers.keydown({ key: 'Enter', preventDefault() {} }); };
  const settle = async () => { synth.cancel(); await tick(); };

  // ① 일반 — 🚀 고르고 Enter로 내기
  openEssay({ ...base, topics });
  buttonsOf($('essay-topics'))[2].click();
  $('essay-start').click();
  enter('I saw a planet and the moon');
  assert.deepEqual(wrote.at(-1), ['C3', ['planet', 'moon']], 'Enter로 내도 글감·낱말이 남는다');
  await settle();
  // ② 중간에 닫힘(콘텐츠 닫기) → 다시 열면 아무것도 안 켜짐 · 안 고르면 카드 없음
  abortEssay();
  assert.equal(done.at(-1).started, true);
  openEssay({ ...base, topics });
  assert.deepEqual(lit(), [false, false, false, false], '닫혔다 다시 열면 처음처럼');
  $('essay-start').click();
  assert.equal($('essay-idea').hidden, true, '앞 회차의 카드가 남지 않음');
  enter('I saw a planet');
  assert.deepEqual(wrote.at(-1), ['', []]);
  await settle();
  // ③ 고른 뒤 「나중에 할래」 → 같은 날 다시 열면 처음처럼
  openEssay({ ...base, topics });
  buttonsOf($('essay-topics'))[0].click();
  $('essay-later').click();
  assert.equal(done.at(-1).started, false);
  openEssay({ ...base, topics });
  assert.deepEqual(lit(), [false, false, false, false]);
  // ④ 고른 채로 아빠 교정 회차가 열림 → 글감 칸·칭찬 없음 (글감 낱말이 든 글이어도)
  buttonsOf($('essay-topics'))[0].click();
  openEssay({
    mode: 'coach', topics,
    prompts: [{ id: 'e1', date: '2026-11-03', written: 'i caught a huge fish', coachFix: 'I caught a huge fish.', rec: {}, frame: { full: '', keep: '', blankWords: 0 }, cue: null }],
    reward: { xp: 1, coin: 1 }, known: new Set(), sfx: {}, speak: async () => ({}), onRead: () => {}, onFinished: async () => null, onDone: () => {},
  });
  assert.equal($('essay-topics').hidden, true);
  $('essay-start').click();
  assert.equal($('essay-praise').hidden, true);
  await settle();
  // ⑤ 연습 — 고를 수 있고 카드도 보이지만 기록은 없다
  const before = wrote.length;
  openEssay({ ...base, practice: true, topics });
  assert.deepEqual(lit(), [false, false, false, false], '아빠 교정 앞에서 고른 것이 남지 않음');
  buttonsOf($('essay-topics'))[1].click();
  $('essay-start').click();
  assert.match($('essay-idea').textContent, /^💡 🌧️ 오늘 날씨/);
  enter('it was a cold rain day');
  assert.equal(wrote.length, before, '연습은 기록하지 않음');
  await settle();
  // ⑥ 다시 일반 — 처음처럼
  openEssay({ ...base, topics });
  assert.deepEqual(lit(), [false, false, false, false]);
  $('essay-start').click();
  assert.equal($('essay-idea').hidden, true, '연습의 카드가 남지 않음');
  enter('it was a cold rain day');
  assert.deepEqual(wrote.at(-1), ['', []], '연습에서 고른 글감이 남지 않음');
  closeEssay();
});

// ───────────────────── 기록 · 보고 ─────────────────────

test('💾 기록 — 글마다 topic·tw · 글을 글감 없이 다시 쓰면 앞 글감을 지움 · 같은 글은 그대로 · 진짜 저장 경로(하루 기록)에 남음', async () => {
  const old = { id: 'v|1', written: 'caught a fish', topic: 'A1', tw: ['caught'], coachFix: 'I caught a fish.' };
  assert.deepEqual(mergeEssayEntry(old, { id: 'v|1', written: 'went home' }), { id: 'v|1', written: 'went home' }, '다시 쓴 글엔 앞 글감·교정이 없다');
  assert.deepEqual(mergeEssayEntry(old, { id: 'v|1', written: 'saw the moon', topic: 'C3', tw: ['moon'] }), { id: 'v|1', written: 'saw the moon', topic: 'C3', tw: ['moon'] });
  assert.equal(mergeEssayEntry(old, { id: 'v|1', written: 'caught a fish' }).topic, 'A1', '같은 글이면 그대로');
  // ☁️ 백업 되살리기 — 같은 글의 두 사본은 아빠 교정 쪽을 고르지만 글감은 있는 쪽 것을 한 쌍으로 (🔍 Codex 191차 #2: 잃었다)
  const mine = { id: 'v|1', written: 'caught a fish', topic: 'A1', tw: ['caught'] };
  const fixedCopy = { id: 'v|1', written: 'caught a fish', coachFix: 'I caught a fish.', fixedAt: 5 };
  for (const [a, b] of [[mine, fixedCopy], [fixedCopy, mine]]) {
    const m = mergeEssayCopies(a, b);
    assert.deepEqual([m.coachFix, m.topic, m.tw], ['I caught a fish.', 'A1', ['caught']], '어느 쪽이 지금 기기든');
  }
  assert.ok(!('topic' in fixedCopy), '받은 사본은 그대로');
  assert.ok(!('topic' in mergeEssayCopies(fixedCopy, { ...fixedCopy })), '둘 다 글감이 없으면 칸을 안 만든다');
  assert.ok(!('topic' in mergeEssayCopies({ ...fixedCopy, written: 'went home' }, mine)), '글이 다르면 지금 기기의 것 그대로');
  assert.deepEqual(mergeEssayCopies(mine, { ...mine, coachFix: 'I caught a fish.', fixedAt: 9, tw: ['fish'] }).tw, ['fish'], '고른 사본(아빠 교정 쪽)에 글감이 있으면 그 쌍 그대로');
  const day = '2026-11-03';
  const merged = mergeDailyDelta(emptyDaily(day), day, { essays: [{ id: 'v|2', written: 'a huge boat', topic: 'A1', tw: ['huge', 'boat'] }] });
  assert.deepEqual(merged.essays.map((e) => [e.topic, e.tw]), [['A1', ['huge', 'boat']]]);
  await applyDailyDelta(day, { essays: [{ id: 'v|3', written: 'a huge river', topic: 'A1', tw: ['huge', 'river'] }] });
  const got = await getDaily(day);
  const e = got.essays.find((x) => x.id === 'v|3');
  assert.deepEqual([e.topic, e.tw], ['A1', ['huge', 'river']]);
});

test('📤 교정 목록(essay/todo) — 글감 고른 글만 💡 줄·topic·tw · [번호] 줄 꼴은 그대로 · 영어 기록 하루 줄 끝에 ✍️·💡', () => {
  const todo = [
    { id: 'v|1', date: '2026-11-03', origin: FULL, written: 'caught a huge fish', fixed: 'caught a huge fish', notes: [], topic: 'A1', tw: ['caught', 'huge'] },
    { id: 'v|2', date: '2026-11-03', origin: FULL, written: 'went home', fixed: 'went home', notes: [] },
    { id: 'v|3', date: '2026-11-03', origin: FULL, written: 'saw it', fixed: 'saw it', notes: [], topic: 'Q7', tw: ['x'] }, // 모르는 번호는 없는 셈
  ];
  const [md, js] = essayFiles(todo, '2026-11-03');
  assert.ok(md.text.includes(`[1] 2026-11-03 배운 문장: ${FULL}\n    진우: caught a huge fish\n    💡 글감: 🎣 낚시 (A1) · 쓴 글감 낱말: caught, huge\n`));
  assert.ok(md.text.includes('[2] 2026-11-03 배운 문장: '));
  assert.equal((md.text.match(/💡 글감/g) || []).length, 1);
  const j = JSON.parse(js.text);
  assert.deepEqual([j[0].topic, j[0].tw], ['A1', ['caught', 'huge']]);
  assert.ok(!('topic' in j[1]) && !('topic' in j[2]), '고르지 않은 글은 칸이 없다');
  const T = '2026-11-03';
  const [f] = englishFiles([{ date: T, doneKeys: ['a'], essays: [todo[0], todo[1]] }], [], T);
  assert.ok(f.text.includes(' · 🎤 연속 보너스 0번 · ✍️ 에세이 2 · 💡 🎣 낚시(글감 낱말 쓴 글 1) · 글감 안 고름 1\n'));
  assert.ok(!f.text.includes(String.fromCharCode(0xC9C4, 0xC6B0)), '영어 기록엔 아이 이름 없이');
  // 에세이만 쓴 날(자정을 넘겨 쓴 글)도 「영어 기록 없음」이 아니라 줄로 (걷기에서 찾음)
  const g = englishFiles([{ date: T, essays: [todo[0]] }, { date: '2026-11-02', essays: [{ id: 'q', written: '' }] }], [], T)[0].text;
  assert.ok(g.includes('- 11-03: 한 문장 0 · ') && g.includes(' · ✍️ 에세이 1 · 💡 🎣 낚시(글감 낱말 쓴 글 1)\n'));
  assert.ok(g.includes('- 11-02: (영어 기록 없음)\n'), '안 쓴 글만 있으면 기록 없음 그대로');
});

test('🔗 잇기 — 플레이어가 그날 글감을 넘기고 쓴 글에 topic·tw · 📊 카드·글 상자 · 화면 칸·CSS · sw·앱 판 v388 이상', () => {
  const p = read('js/player.js');
  assert.match(p, /topics: dayTopics\(track\.dailyDate\(\)\)/);
  assert.match(p, /\.\.\.\(it\.topic \? \{ topic: it\.topic, tw: it\.topicHits \|\| \[\] \} : \{\}\)/);
  const s = read('js/stats.js');
  assert.match(s, /const topicLine = topicWeekLine\(daily, today\);/);
  assert.match(s, /💡 글감 \$\{topicLabel\(tp\)\}/);
  const h = read('index.html');
  for (const id of ['essay-topics', 'essay-idea', 'essay-praise']) assert.match(h, new RegExp(`id="${id}" class="${id}" hidden`), id);
  assert.ok(h.indexOf('id="essay-topics"') < h.indexOf('id="essay-reward"'), '글감은 보상 칩 위');
  assert.ok(h.indexOf('id="essay-idea"') < h.indexOf('id="essay-keep"'), '카드는 쓰기 칸 위');
  const css = read('css/style.css');
  for (const c of ['.essay-topic.on {', '.essay-idea {', '.essay-word {', '.essay-praise {', '.essay-topics[hidden]']) assert.ok(css.includes(c), c);
  assert.match(css, /button\.essay-word \{[^}]*min-height: 44px;/, '누르는 낱말도 44px (🔍 Codex 191차 #3)');
  const sw = read('sw.js');
  assert.match(sw, /'\.\/js\/essaytopic\.js'/);
  const ver = Number(/CACHE_VERSION = 'v(\d+)'/.exec(sw)[1]);
  assert.ok(ver >= 388);
  assert.equal(read('js/version.js').match(/APP_VERSION = 'v(\d+)'/)[1], String(ver));
  // 보상은 그대로 — 에세이 보상 숫자는 v388이 손대지 않았다
  assert.deepEqual([REWARD, FINISH_REWARD], [{ xp: 10, coin: 5 }, { xp: 50, coin: 20 }]);
  assert.ok(!/\bcoins?\b|\bxp\b|award|gain/i.test(read('js/essaytopic.js').replace(/\/\/.*$/gm, '')), '글감 모듈은 보상을 모른다');
  assert.ok(!/^import /m.test(read('js/essaytopic.js')), '글감 모듈은 아무것도 import하지 않는다(순수)');
  assert.ok(fakeIdb, '가짜 저장소');
});
