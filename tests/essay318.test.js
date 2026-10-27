// v318 (2026-10-22 아버님 "이대로 진행") — node --test tests/essay318.test.js
//  ✍️ 에세이 고친 글을 듣고 따라 읽게: ① 첫 읽어 주기가 끝나야 「다음 문장 →」 ② 아빠 교정 ⚡💰는 🎤를 해 봤을 때만 · 🎤 통과 🔶(문장마다 한 번·하루 2개)
//  ③ 바뀐 낱말에 색 ④ 내 에세이도 🎤 했나 기록 → 📤 usage/feedback.md
import { fakeIdb } from './fakeidb.js'; // ★ db.js보다 먼저
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { diffMarks, SAY_STONE, initEssay, openEssay, closeEssay, readSeconds } from '../js/essay.js';
import { getDaily, applyDailyDelta, emptyDaily, mergeDailyDelta, mergeEssayEntry, mergeEssayCopies, markEssaySaid, essaySayStoneRule, applyEssaySayStone } from '../js/db.js';
import { selfItems, feedbackMd } from '../js/feedback.js';

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const tick = async (n = 3) => { for (let k = 0; k < n; k++) await Promise.resolve(); };

// ───────────────────── 가짜 화면 · 가짜 음성 ─────────────────────

function fakeEl(tag = 'div') {
  let text = '';
  const e = {
    tagName: tag.toUpperCase(), hidden: false, disabled: false, className: '', value: '', placeholder: '', style: {}, children: [], attrs: {}, handlers: {},
    appendChild(c) { this.children.push(c); return c; },
    addEventListener(t, fn) { this.handlers[t] = fn; },
    // 진짜 단추처럼: 누를 수 없으면 눌러도 아무 일 없음
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
  // silent = 끊어도 끝 소식이 안 오는 기기 (안드로이드 일부)
  silent: false,
  cancel() { const u = this.cur; this.cur = null; if (u && u.onend && !this.silent) u.onend(); },
};
/** 지금 읽는 말을 끝까지 */
const finishTalk = () => { const u = synth.cur; synth.cur = null; if (u && u.onend) u.onend(); };

before(async () => {
  globalThis.document = { hidden: false, getElementById: $, createElement: (t) => fakeEl(t), createTextNode: (t) => ({ textContent: String(t), nodeType: 3 }) };
  globalThis.window = { speechSynthesis: synth };
  globalThis.SpeechSynthesisUtterance = function Utter(text) { this.text = text; };
  initEssay();
  await getDaily('2000-01-01'); // 가짜 저장소 열기
});

const coachPrompt = (id, written, fix) => ({ id, date: '2026-10-20', written, coachFix: fix, rec: {}, frame: { full: '', keep: '', blankWords: 0 }, cue: null });

// ───────────────────── ③ 바뀐 곳 ─────────────────────

test('🖍️ 바뀐 낱말 — 대문자·복수·빠진 낱말은 칠하고, 끝 문장부호 하나는 안 칠한다 · 차례를 지킨 공통 부분은 그대로', () => {
  const chg = (a, b) => diffMarks(a, b).filter((x) => x.chg).map((x) => x.w);
  assert.deepEqual(diffMarks('i like cat', 'I like cats.'), [{ w: 'I', chg: true }, { w: 'like', chg: false }, { w: 'cats.', chg: true }]);
  assert.deepEqual(chg('I like dog', 'I like dog.'), [], '마침표만 붙으면 칠할 것 없음');
  assert.deepEqual(chg('he go school', 'He goes to school.'), ['He', 'goes', 'to']);
  assert.deepEqual(chg("I don't know", "I don't know."), []);
  const moved = diffMarks('yesterday I go park', 'I went to the park yesterday.');
  assert.ok(!moved.find((x) => x.w === 'I').chg && !moved.find((x) => x.w === 'park').chg, '공통 부분은 그대로');
  assert.ok(moved.find((x) => x.w === 'went').chg);
  assert.deepEqual(chg('', 'Hello there.'), [], '내 글이 없으면 칠하지 않는다');
  // 🔍 Codex 124차 #5 — 악센트는 낱말의 일부 · 앞뒤 따옴표는 문장부호
  assert.deepEqual(chg('I like caf', 'I like café.'), ['café.'], '악센트 글자를 떼어 내지 않는다');
  assert.deepEqual(chg('Pokemon is fun', 'Pokémon is fun.'), ['Pokémon']);
  assert.deepEqual(chg("I said 'hello'", 'I said hello.'), [], '따옴표만 바뀌면 안 칠한다');
  assert.deepEqual(chg('I have 3 dog', 'I have 3 dogs.'), ['dogs.'], '숫자는 그대로');
  assert.deepEqual(diffMarks('a b', ''), []);
});

// ───────────────────── ① 듣고 나서 넘어가기 · ② 🎤 ─────────────────────

test('👨‍👩‍👦 아빠 교정 — 바뀐 곳 색 · 첫 읽어 주기가 끝나야 「다음 문장 →」 · 🎤를 누르면 바로 · 통과 🔶는 문장마다 한 번 · 넘어갈 때 🎤 했나', async () => {
  const reads = [];
  const passes = [];
  let speakRes = { passed: true };
  openEssay({
    mode: 'coach',
    prompts: [coachPrompt('e1', 'i like cat', 'I like cats.'), coachPrompt('e2', 'he go school', 'He goes to school.')],
    reward: { xp: 50, coin: 20 }, known: new Set(), sfx: {},
    speak: async () => speakRes,
    onRead: (it) => reads.push([it.id, it.said]),
    onPass: async (it) => { passes.push(it.id); return '🔶 영어스톤 +1'; },
    onFinished: async () => null, onDone: () => {},
  });
  const chips = $('essay-reward').children.map((c) => c.textContent);
  assert.ok(chips.some((t) => t.startsWith('🎤 읽어 보면 문장마다 ⚡+')), '🎤를 해 봐야 ⚡💰라고 보인다');
  assert.ok(chips.includes('🎤 따라 읽어 통과하면 🔶'));
  assert.ok(chips.every((t) => !/하루|남은|\d+\s*\/\s*\d+/.test(t)), '아이 화면에 셈·상한 문구 없음');
  assert.ok($('essay-note').textContent.includes('바뀐 곳은 색'));
  $('essay-start').click();
  // 바뀐 곳 색 — 글자는 그대로
  const fx = $('essay-fixed');
  assert.equal(fx.textContent, 'I like cats.');
  assert.deepEqual(fx.children.filter((c) => c.tagName === 'MARK').map((c) => [c.textContent, c.className]), [['I', 'essay-chg'], ['cats.', 'essay-chg']]);
  // 듣는 중엔 못 넘긴다
  const next = $('essay-next');
  assert.deepEqual([next.disabled, next.textContent], [true, '🔊 듣는 중…']);
  assert.equal(synth.spoken.at(-1), 'I like cats.');
  assert.equal(next.click(), false, '눌러도 안 넘어간다');
  assert.deepEqual(reads, []);
  // 🎤 — 누르면 다 듣기를 기다리지 않는다 · 통과 → 🔶 한 번 · 받은 것은 이름으로
  $('essay-say').click();
  assert.equal(next.disabled, false, '🎤를 누르면 바로 넘어갈 수 있다');
  await tick(6);
  assert.deepEqual(passes, ['e1']);
  assert.ok($('essay-speak-msg').textContent.includes('잘 읽었어요') && $('essay-speak-msg').textContent.includes('🔶 영어스톤 +1'));
  $('essay-say').click(); // 같은 문장을 또 통과
  await tick(6);
  assert.deepEqual(passes, ['e1'], '같은 문장은 한 번');
  next.click();
  assert.deepEqual(reads, [['e1', 'pass']]);
  // 둘째 문장 — 다시 듣는 중 · 끝까지 들으면 넘어갈 수 있다 · 🎤 없이 넘기면 said 없음(player가 skip · ⚡💰 없음)
  assert.equal(fx.textContent, 'He goes to school.');
  assert.deepEqual([next.disabled, next.textContent], [true, '🔊 듣는 중…']);
  finishTalk();
  await tick();
  assert.deepEqual([next.disabled, next.textContent], [false, '다 썼어요!']);
  next.click();
  assert.deepEqual(reads, [['e1', 'pass'], ['e2', undefined]]);
  await tick();
  assert.equal($('essay-done').hidden, false);
  // 🎤가 통과 못 했으면 try · 🔶 없음
  speakRes = { passed: false };
  passes.length = 0;
  reads.length = 0;
  openEssay({
    mode: 'coach', prompts: [coachPrompt('e3', 'me happy', 'I am happy.')], reward: { xp: 50, coin: 20 }, known: new Set(), sfx: {},
    speak: async () => speakRes, onRead: (it) => reads.push([it.id, it.said]), onPass: async (it) => { passes.push(it.id); return 'x'; },
    onFinished: async () => null, onDone: () => {},
  });
  $('essay-start').click();
  $('essay-say').click();
  await tick(6);
  next.click();
  assert.deepEqual([reads, passes], [[['e3', 'try']], []]);
  closeEssay();
});

const coachOpen = (prompt, extra = {}) => openEssay({
  mode: 'coach', prompts: [prompt], reward: { xp: 1, coin: 1 }, known: new Set(), sfx: {},
  speak: async () => ({ passed: true }), onRead: () => {}, onFinished: async () => null, onDone: () => {}, ...extra,
});

test('🔊 듣는 중에 「들어보기」를 다시 누르면 그 다시 읽기가 끝나야 열린다 · 열린 뒤 다시 듣기는 잠그지 않는다 (Codex 124차 #4)', async () => {
  coachOpen(coachPrompt('r1', 'i go home', 'I go home.'));
  $('essay-start').click();
  assert.equal($('essay-next').disabled, true);
  $('essay-read').click(); // 앞 읽기를 끊고(끝 소식이 온다) 처음부터 다시
  await tick();
  assert.equal($('essay-next').disabled, true, '앞 읽기가 끊기며 열리지 않는다');
  finishTalk();
  await tick();
  assert.equal($('essay-next').disabled, false);
  $('essay-read').click();
  assert.equal($('essay-next').disabled, false, '다 들은 뒤 다시 듣기는 잠그지 않는다');
  finishTalk();
  closeEssay();
});

test('🔶 저장이 안 되면(null·오류) 같은 문장을 다시 통과할 때 다시 받는다 · 받은 뒤에는 다시 안 묻는다 (Codex 124차 #2)', async () => {
  let calls = 0;
  coachOpen(coachPrompt('f1', 'i go home', 'I go home.'), {
    onPass: async () => { calls++; if (calls === 1) return null; if (calls === 2) throw new Error('save'); return '🔶 영어스톤 +1'; },
  });
  $('essay-start').click();
  for (const want of [1, 2, 3, 3]) {
    $('essay-say').click();
    await tick(8);
    assert.equal(calls, want);
  }
  assert.ok($('essay-speak-msg').textContent.includes('잘 읽었어요'));
  closeEssay();
});

test('🔊 읽어 주기 오류 · 시작 예외 · 끝 소식 없음 — 모두 결국 「다음 문장 →」을 연다', async (t) => {
  const p = coachPrompt('t1', 'i go home', 'I go home.');
  coachOpen(p);
  $('essay-start').click();
  const u = synth.cur;
  synth.cur = null;
  u.onerror();
  await tick();
  assert.equal($('essay-next').disabled, false, '오류');
  closeEssay();
  const sp = synth.speak;
  synth.speak = () => { throw new Error('busy'); };
  coachOpen(p);
  $('essay-start').click();
  await tick();
  assert.equal($('essay-next').disabled, false, '시작 예외');
  synth.speak = sp;
  closeEssay();
  t.mock.timers.enable({ apis: ['setTimeout'] });
  try {
    coachOpen(p);
    $('essay-start').click();
    synth.cur = null; // 끝 소식이 영영 안 온다
    assert.equal($('essay-next').disabled, true);
    t.mock.timers.tick(readSeconds('I go home.') * 1000 + 2900);
    await tick();
    assert.equal($('essay-next').disabled, true, '글 길이 + 3초 전에는 그대로');
    t.mock.timers.tick(200);
    await tick();
    assert.equal($('essay-next').disabled, false, '글 길이 + 3초 뒤 스스로 연다');
  } finally {
    t.mock.timers.reset();
    closeEssay();
  }
});

test('✍️ 내 에세이 — 쓰고 나면 고친 문장을 끝까지 들어야 넘어감 · 넘어갈 때 🎤 했나(onSaid) · 연습은 기록 없음', async () => {
  const said = [];
  let passes = 0;
  const open = (practice) => openEssay({
    prompts: [{ rec: { ko: '' }, frame: { full: 'I like apples because they are sweet and red', keep: 'I like', blankWords: 6 }, cue: null }],
    practice, reward: { xp: 50, coin: 20 }, known: new Set(), sfx: {},
    speak: async () => ({ passed: true }), onWritten: () => {}, onSaid: (it) => said.push(it.said), onPass: async () => { passes++; return ''; },
    onFinished: async () => null, onDone: () => {},
  });
  open(false);
  $('essay-start').click();
  $('essay-input').value = 'bananas because they are yellow and soft';
  $('essay-submit').click();
  const next = $('essay-next');
  assert.equal($('essay-result').hidden, false);
  assert.deepEqual([next.disabled, next.textContent], [true, '🔊 듣는 중…']);
  finishTalk();
  await tick();
  assert.equal(next.disabled, false);
  next.click();
  assert.deepEqual(said, [undefined], '🎤 없이 넘김');
  open(false);
  $('essay-start').click();
  $('essay-input').value = 'bananas because they are yellow and soft';
  $('essay-submit').click();
  $('essay-say').click();
  await tick(6);
  next.click();
  assert.deepEqual([said, passes], [[undefined, 'pass'], 1]);
  open(true);
  $('essay-start').click();
  $('essay-input').value = 'bananas because they are yellow and soft';
  $('essay-submit').click();
  $('essay-say').click(); // 연습에서 🎤 통과
  await tick(6);
  next.click();
  assert.deepEqual([said, passes], [[undefined, 'pass'], 1], '연습은 안 적고 🔶도 없다');
  closeEssay();
});

test('🔇 소리를 낼 수 없는 기기 — 기다리지 않고 바로 넘어갈 수 있다 · 끝 소식이 늦게 와도 다른 문장의 단추를 열지 않는다', async () => {
  const saved = globalThis.window;
  globalThis.window = {};
  openEssay({ mode: 'coach', prompts: [coachPrompt('e9', 'i run', 'I run.')], reward: { xp: 1, coin: 1 }, known: new Set(), sfx: {}, speak: async () => ({}), onRead: () => {}, onFinished: async () => null, onDone: () => {} });
  $('essay-start').click();
  assert.equal($('essay-next').disabled, false);
  closeEssay();
  // 다 바뀌었으면 칠하지 않는다 (다 칠하면 아무것도 안 알려 준다) · 하나도 안 바뀌어도
  for (const [w, f] of [['abc def', 'Xyz qrs.'], ['I run fast.', 'I run fast.']]) {
    openEssay({ mode: 'coach', prompts: [coachPrompt('z', w, f)], reward: { xp: 1, coin: 1 }, known: new Set(), sfx: {}, speak: async () => ({}), onRead: () => {}, onFinished: async () => null, onDone: () => {} });
    $('essay-start').click();
    assert.deepEqual([$('essay-fixed').children.length, $('essay-fixed').textContent], [0, f]);
    closeEssay();
  }
  globalThis.window = saved;
  // 첫 문장 읽기 중 🎤 → 넘김 → 둘째 문장 듣는 중에 첫 읽기의 늦은 끝 소식이 와도 둘째 단추는 그대로 잠김
  openEssay({ mode: 'coach', prompts: [coachPrompt('a', 'x y', 'X y.'), coachPrompt('b', 'p q', 'P q.')], reward: { xp: 1, coin: 1 }, known: new Set(), sfx: {}, speak: async () => ({ method: 'cancelled' }), onRead: () => {}, onFinished: async () => null, onDone: () => {} });
  $('essay-start').click();
  const first = synth.cur;
  synth.silent = true; // 끊어도 첫 읽기의 끝 소식이 안 온다 — 그 읽기는 아직 기다리는 중
  $('essay-say').click(); // 읽기를 끊고(cancel) 🎤 — 취소되면 결과 화면으로
  await tick(6);
  synth.silent = false;
  $('essay-next').click();
  assert.equal($('essay-next').disabled, true, '둘째 문장 듣는 중');
  first.onend(); // 늦게 온 첫 읽기 끝 소식
  await tick();
  assert.equal($('essay-next').disabled, true, '앞 문장의 끝 소식으로 열리지 않는다');
  finishTalk();
  await tick();
  assert.equal($('essay-next').disabled, false);
  closeEssay();
});

// ───────────────────── 🔶 · 기록 ─────────────────────

test('🔶 에세이 🎤 영어스톤 — 문장마다 한 번 · 하루 SAY_STONE.maxPerDay개 · 가방과 오늘 기록을 한 트랜잭션에서', async () => {
  assert.equal(SAY_STONE.maxPerDay, 2);
  const p = { items: {} };
  const r = essaySayStoneRule(p, null, '2026-10-22', 'self|2026-10-22|a', 2);
  assert.equal(r.ok, true);
  assert.deepEqual([r.daily.essaySayStones, r.daily.essaySayKeys], [1, ['self|2026-10-22|a']]);
  assert.ok(Object.values(p.items).length === 1, '가방에 🔶');
  assert.equal(essaySayStoneRule({ items: {} }, r.daily, '2026-10-22', 'self|2026-10-22|a', 2).ok, false, '같은 문장');
  assert.equal(essaySayStoneRule({ items: {} }, { ...r.daily, essaySayStones: 2 }, '2026-10-22', 'x', 2).ok, false, '하루 상한');
  assert.equal(essaySayStoneRule({ items: {} }, null, '2026-10-22', '', 2).ok, false, '열쇠 없음');
  const day = '2030-05-05';
  const a = await applyEssaySayStone(day, 'coach|d|1', 2);
  const b = await applyEssaySayStone(day, 'coach|d|1', 2);
  const c = await applyEssaySayStone(day, 'self|d|2', 2);
  const d = await applyEssaySayStone(day, 'self|d|3', 2);
  assert.deepEqual([a.ok, b.ok, c.ok, d.ok], [true, false, true, false]);
  const saved = await getDaily(day);
  assert.deepEqual([saved.essaySayStones, saved.essaySayKeys], [2, ['coach|d|1', 'self|d|2']]);
  const prof = await fakeIdb.get('profile', 'me');
  assert.equal(Number(prof.items.stone_english) || 0, 2, '가방 🔶 두 개');
  // 저장 실패면 둘 다 안 바뀐다
  fakeIdb.failNext('profile');
  const e = await applyEssaySayStone('2030-05-06', 'self|x|9', 2).catch(() => ({ ok: false }));
  assert.equal(e.ok, false);
  assert.equal(((await getDaily('2030-05-06')) || {}).essaySayStones || 0, 0);
  assert.equal(emptyDaily('2030-01-01').essaySayStones, 0);
  // 날을 넘어도 같은 글은 한 번 — 받은 표시는 그 글(쓴 날 기록)에 (Codex 124차 #1)
  await applyDailyDelta('2030-07-01', { essays: [{ id: 'c1', written: 'i go', coachFix: 'I go.' }] });
  const x1 = await applyEssaySayStone('2030-07-02', 'coach|2030-07-01|c1', 2, { date: '2030-07-01', id: 'c1' });
  const x2 = await applyEssaySayStone('2030-07-03', 'coach|2030-07-01|c1', 2, { date: '2030-07-01', id: 'c1' });
  assert.deepEqual([x1.ok, x2.ok], [true, false], '다음 날 같은 교정에서 또 받지 않는다');
  assert.equal((await getDaily('2030-07-01')).essays[0].sayPaid, true);
  assert.equal(((await getDaily('2030-07-03')) || {}).essaySayStones || 0, 0);
  // 오늘 쓴 글은 오늘 기록 안에
  await applyDailyDelta('2030-07-04', { essays: [{ id: 's1', written: 'x', fixed: 'X.' }] });
  assert.equal((await applyEssaySayStone('2030-07-04', 'self|2030-07-04|s1', 2, { date: '2030-07-04', id: 's1' })).ok, true);
  const d4 = await getDaily('2030-07-04');
  assert.deepEqual([d4.essays[0].sayPaid, d4.essaySayStones], [true, 1]);
  // 글을 못 찾아도 받을 몫은 잃지 않는다(오늘 목록으로만) · 받은 표시가 있는 글은 없음
  assert.equal((await applyEssaySayStone('2030-07-05', 'self|2030-07-05|zz', 2, { date: '2030-07-05', id: 'zz' })).ok, true);
  assert.equal(essaySayStoneRule({ items: {} }, null, 'd', 'k', 2, { sayPaid: true }).ok, false);
  assert.deepEqual(mergeDailyDelta({ date: 'x', essaySayKeys: ['a'] }, 'x', { essaySayKeys: ['a', 'b'] }).essaySayKeys, ['a', 'b']);
});

test('📬 내 에세이 🎤 기록 — 더 해 본 쪽만 · 모르는 값·없는 글은 안 적음 · 글을 다시 쓰면 지움', async () => {
  const day = '2030-06-01';
  await applyDailyDelta(day, { essays: [{ id: 'w1', written: 'I like bananas', fixed: 'I like bananas.' }] });
  assert.equal(await markEssaySaid('w1', day, 'try'), true);
  await markEssaySaid('w1', day, 'skip');
  assert.equal((await getDaily(day)).essays[0].sayHow, 'try', '덜 해 본 쪽으로 내려가지 않는다');
  await markEssaySaid('w1', day, 'pass');
  assert.equal((await getDaily(day)).essays[0].sayHow, 'pass');
  assert.equal(await markEssaySaid('nope', day, 'pass'), false);
  assert.equal(await markEssaySaid('w1', day, 'weird'), false);
  assert.equal(await markEssaySaid('w1', '', 'pass'), false);
  // 같은 글을 다시 저장해도(화면 사본이 sayHow를 모름) 남는다 · 글이 바뀌면 지운다
  await applyDailyDelta(day, { essays: [{ id: 'w1', written: 'I like bananas', fixed: 'I like bananas.' }] });
  assert.equal((await getDaily(day)).essays[0].sayHow, 'pass');
  assert.equal(mergeEssayEntry({ written: 'a', sayHow: 'pass' }, { written: 'b' }).sayHow, undefined);
  assert.equal(mergeEssayEntry({ written: 'a', sayHow: 'pass' }, { written: 'a' }).sayHow, 'pass');
  assert.equal(mergeEssayEntry({ written: 'a', sayPaid: true }, { written: 'b' }).sayPaid, true, '🔶 받은 표시는 글을 다시 써도 남는다(같은 문장으로 또 받지 않게)');
  // 백업 되돌리기 — 같은 글이면 🎤는 더 해 본 쪽 · 받은 표시는 하나라도 (Codex 124차 #3)
  const A = { written: 'x' };
  const B = { written: 'x', sayHow: 'pass', sayPaid: true };
  assert.deepEqual([mergeEssayCopies(A, B).sayHow, mergeEssayCopies(A, B).sayPaid, mergeEssayCopies(B, A).sayHow, mergeEssayCopies(B, A).sayPaid], ['pass', true, 'pass', true]);
  const C = { written: 'x', coachFix: 'X.', fixedAt: 5 };
  const D = { written: 'x', sayHow: 'try' };
  assert.deepEqual([mergeEssayCopies(D, C).coachFix, mergeEssayCopies(D, C).sayHow], ['X.', 'try'], '아빠 교정 쪽을 골라도 🎤 기록은 남는다');
  assert.equal(mergeEssayCopies({ written: 'x', sayHow: 'skip' }, { written: 'x', sayHow: 'pass' }).sayHow, 'pass');
  assert.equal(mergeEssayCopies({ written: 'x', sayHow: 'pass' }, { written: 'x', sayHow: 'skip' }).sayHow, 'pass');
  assert.equal(mergeEssayCopies(A, { written: 'x' }), A, '🎤 기록이 없으면 그대로');
  const E = { written: 'a', sayHow: 'pass' };
  assert.equal(mergeEssayCopies(E, { written: 'b', sayHow: 'skip' }), E, '글이 다르면 지금 기기 것 그대로');
});

test('📤 usage/feedback.md — 내 에세이 날마다 한 줄(통과·해 봄·넘김·기록 없음) · 14일 밖은 뺌 · 영어 교정 절 설명', () => {
  const now = new Date('2026-10-22T20:00:00').getTime();
  const days = [
    { date: '2026-10-21', essays: [{ written: 'a', sayHow: 'pass' }, { written: 'b', sayHow: 'try' }, { written: 'c', sayHow: 'skip' }, { written: 'd' }, { written: '' }] },
    { date: '2026-09-30', essays: [{ written: 'old', sayHow: 'pass' }] },
    { date: '2026-10-22', essays: [] },
    { date: '2026-10-20', essays: [{ written: 'e', sayHow: 'weird' }] },
  ];
  assert.deepEqual(selfItems(days, now).map((x) => x.text), [
    '- 10-20: 글 1 · 🎤 통과 0 · 해 봄 0 · 🎤 없이 넘김 0 · 기록 없음 1',
    '- 10-21: 글 4 · 🎤 통과 1 · 해 봄 1 · 🎤 없이 넘김 1 · 기록 없음 1',
  ]);
  const md = feedbackMd({ days, writes: {}, asks: [], today: '2026-10-22', now });
  assert.ok(md.includes('## ✍️ 내 에세이 — 쓰고 나서 고친 문장을 🎤로 읽었나 (v318부터'));
  assert.ok(md.includes('- 10-21: 글 4 · 🎤 통과 1'));
  assert.ok(md.includes('v318부터 ⚡💰는 🎤를 해 봤을 때만'));
  assert.ok(feedbackMd({ days: [], writes: {}, asks: [], today: '2026-10-22', now }).includes('## ✍️ 내 에세이'), '없어도 절은 있다');
});

test('🔗 잇기 — 고친 글은 textContent로만(HTML로 넣지 않음) · 바뀐 곳 색은 밑줄도 · sw v318 이상', () => {
  const es = read('js/essay.js');
  const fn = es.slice(es.indexOf('function fixedLine('), es.indexOf('function startSpeaking('));
  assert.ok(!fn.includes('innerHTML'), '아이·아빠 글을 HTML로 넣지 않는다');
  const show = es.slice(es.indexOf('function showResult('), es.indexOf('function setNext('));
  assert.ok(show.includes("fixedLine($('essay-fixed'), it.result.raw, it.result.fixed);"));
  const css = read('css/style.css');
  assert.ok(/\.essay-chg \{[^}]*background: #fde68a;[^}]*text-decoration: underline;/.test(css), '색을 못 가려도 보이게 밑줄');
  assert.ok(Number((/const CACHE_VERSION = 'v(\d+)';/.exec(read('sw.js')) || [])[1]) >= 318);
  const pl = read('js/player.js');
  assert.ok(pl.includes("if (!it.said) return;\n      awardXp(ESSAY_REWARD.xp);"), '아빠 교정 ⚡💰는 🎤를 해 봤을 때만');
});

test('🟢 v352 지난 회차에 안 누른 지가르데 셀·찾은 줄은 끝 화면을 띄울 때 걷는다 — 연습·아빠 교정 끝에 다시 보이지 않게 (Codex 157차)', async () => {
  const done = $('essay-done');
  const zygs = () => done.children.filter((c) => /\bzyg-/.test(c.className)).map((c) => c.className);
  const part = (cls) => { const e = fakeEl('button'); e.className = cls; e.remove = () => { done.children = done.children.filter((c) => c !== e); }; return e; };
  const keep = part('essay-keep');
  done.appendChild(keep);
  let shown = 0;
  const finish = async (practice) => {
    openEssay({
      prompts: [{ rec: { ko: '' }, frame: { full: 'I like apples because they are sweet and red', keep: 'I like', blankWords: 6 }, cue: null }],
      practice, reward: { xp: 50, coin: 20 }, known: new Set(), sfx: {},
      speak: async () => ({}), onWritten: () => {}, onSaid: () => {}, onFinished: async () => null, onDone: () => {},
      // player.js가 붙이는 것처럼: 안 누른 셀 + 지난번에 찾은 줄
      onDoneShown: (host) => { shown++; host.appendChild(part('zyg-cell zyg-tl')); host.appendChild(part('zyg-found')); },
    });
    $('essay-start').click();
    $('essay-input').value = 'bananas because they are yellow and soft';
    $('essay-submit').click();
    finishTalk();
    await tick();
    $('essay-next').click();
    await tick(6);
  };
  await finish(false);
  assert.equal(shown, 1);
  assert.deepEqual(zygs(), ['zyg-cell zyg-tl', 'zyg-found']);
  closeEssay();
  await finish(true); // 연습 — 셀을 붙이지 않는다
  assert.equal(shown, 1);
  assert.deepEqual(zygs(), [], '지난 셀·찾은 줄이 남지 않는다');
  assert.ok(done.children.includes(keep), '다른 것은 그대로');
  closeEssay();
});
