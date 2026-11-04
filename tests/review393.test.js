// 🔁 v393 (2026-11-04 전수 검사): 복습 회차를 진짜 openReview로 끝까지 — 받아쓰기 뒤 단어 문제의 보기가 눌려야 한다
//  · 옛 시험은 openReview를 대역으로 바꿔 화면 상태가 이어지는 것을 못 봤다 → 여기서는 진짜 review.js에 가짜 화면만 붙인다
//  · 🤔 오답 노트 단추: 다른 줄기의 옛 노트가 앞자리를 차지해도 이 줄기 노트가 나온다
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { initReview, openReview, abortReview, isReviewOpen } from '../js/review.js';
import { dueNotes, stemNotes, NOTES_ROUND, STEMS, stemOf } from '../js/mathprog.js';
import { readFileSync } from 'node:fs';

const read = (f) => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');

function fakeEl(tag = 'div') {
  let text = '';
  const names = new Set();
  const e = {
    tagName: tag.toUpperCase(), hidden: false, disabled: false, className: '', type: '', style: {}, dataset: {}, children: [], handlers: {},
    classList: { add: (c) => names.add(c), remove: (c) => names.delete(c), contains: (c) => names.has(c), toggle: (c, on) => (on ? names.add(c) : names.delete(c)) },
    appendChild(c) { this.children.push(c); return c; },
    addEventListener(t, fn) { this.handlers[t] = fn; },
    click() { if (this.disabled) return false; if (this.handlers.click) this.handlers.click({ stopPropagation() {}, preventDefault() {} }); return true; },
    setAttribute() {}, removeAttribute() {}, focus() {},
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
const realTimeout = globalThis.setTimeout;

before(() => {
  globalThis.document = { hidden: false, getElementById: $, createElement: (t) => fakeEl(t), createTextNode: (t) => ({ textContent: t }), addEventListener() {}, removeEventListener() {} };
  globalThis.setTimeout = (f, ms, ...a) => realTimeout(f, 0, ...a); // 연출 기다림은 건너뛴다
  initReview();
});
after(() => { globalThis.setTimeout = realTimeout; });

/** 조건이 될 때까지 (화면이 멈추면 실패로) */
async function until(ok, what) {
  for (let i = 0; i < 400; i++) {
    if (ok()) return;
    await new Promise((r) => realTimeout(r, 0));
  }
  assert.fail(`멈춤 — ${what}`);
}
const choice = (t) => $('review-choices').children.find((b) => b.textContent === t);
const live = (t) => { const b = choice(t); return !!b && !b.disabled; };

const cue = (en, start) => ({ en, ko: '뜻', start, end: start + 1 });
const dict = (answers, start = 1) => ({
  type: 'dictation', rec: { box: 1 }, cue: cue('We have many rules for this place.', start),
  words: ['We', 'have', 'many', 'rules', 'for', 'this', 'place.'],
  blanks: answers.map((a, k) => ({ index: k + 1, answer: a, display: a, choices: [a, `${a}x`, `${a}y`] })),
});
const word = () => ({ type: 'word', rec: { word: 'dog' }, word: 'dog', meaning: '개', choices: ['개', '고양이', '강', '사과'] });
const sentence = (start = 9) => ({ type: 'sentence', rec: { box: 0 }, cue: cue('Keep it safe for me.', start) });

/** 회차 열기 — 기록을 모아 돌려준다 */
function open(items) {
  const log = { dict: [], word: [], sent: [], fin: 0, done: null };
  openReview({
    items, reward: { golden: 0, hp: 0, xp: 1, coin: 1 }, waiting: 0,
    speak: async () => ({ passed: true, method: 'speech', score: 1 }),
    onPlay() {},
    onSentence(c, p) { log.sent.push(p); return { box: 1 }; },
    onDictation(it, p) { log.dict.push(p); return { box: 2 }; },
    onWord(it, p) { log.word.push(p); return { box: 1 }; },
    onFinished: async () => { log.fin += 1; return { xp: 1, coin: 1 }; },
    onDone(s) { log.done = s; },
  });
  $('review-start').click();
  return log;
}
/** 받아쓰기 칸을 차례로 채운다 — wrong이면 그 칸은 틀린 보기로 */
async function fill(item, wrong = []) {
  for (const [k, b] of item.blanks.entries()) {
    await until(() => live(b.answer), `빈칸 ${k + 1}`);
    choice(wrong.includes(k) ? `${b.answer}x` : b.answer).click();
  }
}
const atWord = () => until(() => $('review-en').textContent === 'dog' && live('개'), '단어 문제가 안 뜸');
const finished = (log) => until(() => !$('review-done').hidden && log.fin === 1, '끝 화면이 안 뜸');

test('🔁 받아쓰기 → 단어: 보기가 눌리고 회차가 끝까지 간다 (옛 버그 — 보기를 눌러도 반응 없이 멈췄다)', async () => {
  const d = dict(['rules']);
  const log = open([d, word()]);
  await fill(d);
  await atWord();
  assert.equal($('review-choices').dataset.done, '', '받아쓰기가 남긴 연타 표시가 지워져 있다');
  choice('개').click();
  await finished(log);
  assert.deepEqual([log.dict, log.word], [[true], [true]]);
  assert.ok(choice('개').classList.contains('right'));
  abortReview();
});

test('🔁 받아쓰기 → 문장 → 단어 (앱이 만드는 차례): 사이에 문장이 있어도 · 칸이 둘이어도 · 틀린 칸이 있어도', async () => {
  const d = dict(['have', 'rules']);
  const log = open([d, sentence(), word()]);
  await fill(d, [1]);
  await until(() => log.sent.length === 1, '문장 문항');
  await atWord();
  choice('고양이').click();
  await finished(log);
  assert.deepEqual([log.dict, log.sent, log.word], [[false], [true], [false]]);
  assert.ok(choice('고양이').classList.contains('wrong') && choice('개').classList.contains('right'), '틀린 보기와 정답 표시');
  abortReview();
});

test('🔁 문장 → 받아쓰기 → 단어 · 받아쓰기 없는 회차 · 단어로 시작하는 회차도 끝까지', async () => {
  const d = dict(['rules']);
  const a = open([sentence(), d, word()]);
  await until(() => a.sent.length === 1, '문장 문항');
  await fill(d);
  await atWord();
  choice('개').click();
  await finished(a);
  abortReview();
  const b = open([sentence(), word()]);
  await atWord();
  choice('개').click();
  await finished(b);
  abortReview();
  const d2 = dict(['rules']);
  const c = open([word(), d2]);
  await atWord();
  choice('개').click();
  await fill(d2);
  await finished(c);
  assert.deepEqual([c.word, c.dict], [[true], [true]]);
  abortReview();
});

test('🔁 연타 방지는 그대로: 단어 보기를 두 번 눌러도 한 번 · 받아쓰기 칸도 한 번 · 받아쓰기 도중 나갔다 새 회차를 열어도 눌림', async () => {
  const d = dict(['rules']);
  const log = open([d, word()]);
  await until(() => live('rules'), '빈칸');
  const blank = choice('rules');
  blank.handlers.click();
  blank.handlers.click();
  await atWord();
  assert.deepEqual(log.dict, [true], '칸 한 번');
  const w = choice('개');
  w.handlers.click();
  w.handlers.click();
  await finished(log);
  assert.deepEqual(log.word, [true], '단어 한 번');
  abortReview();
  // 받아쓰기 칸을 누른 채 나가면 표시가 남는다 — 새 회차는 처음부터
  const d2 = dict(['rules']);
  open([d2, word()]);
  await until(() => live('rules'), '빈칸');
  choice('rules').click();
  abortReview();
  assert.equal(isReviewOpen(), false);
  const log2 = open([word(), sentence()]);
  await atWord();
  choice('개').click();
  await finished(log2);
  abortReview();
});

test('🔁 앱 코드 잇기: 단어 문제를 그릴 때 연타 표시를 지운다 · 단어는 회차 끝에 붙는다', () => {
  const s = read('js/review.js').replace(/\r\n/g, '\n');
  assert.match(s, /function askWord\(\) \{[\s\S]*?box\.innerHTML = '';\n {2}box\.dataset\.done = '';/);
  assert.ok(read('js/player.js').includes('return [...withDictation(all), ...wordItems];'), '받아쓰기 뒤에 단어');
});

// ───────────── 🤔 오답 노트 단추 ─────────────
const TODAY = '2026-11-04';
const ids = (k, n) => STEMS[k].list.slice(0, n).map((c) => c.id);
const noted = (id, t, d = '2026-11-03') => [id, { done: true, notes: [{ key: `k${t}`, k: 'calc', d, t }] }];

test('🤔 그 줄기 노트: 다른 줄기의 옛 노트 넷이 앞서도 이 줄기 것이 나온다 · 한 번에 넷까지 · 오래된 것부터 · 오늘 틀린 것은 빼고 · 없는 줄기는 빈 목록', () => {
  const keys = Object.keys(STEMS);
  const [A, B] = keys;
  const a = ids(A, 5);
  const b = ids(B, 5);
  assert.ok(a.length >= 4 && b.length >= 1, '두 줄기');
  const m = { concepts: Object.fromEntries([...a.slice(0, 4).map((id, i) => noted(id, i + 1)), noted(b[0], 9)]) };
  assert.equal(dueNotes(m, TODAY).filter((x) => stemOf(x.id).key === B).length, 0, '자른 뒤 고르면 사라지던 경우');
  assert.deepEqual(stemNotes(m, TODAY, B).map((x) => x.id), [b[0]], '이 줄기 노트가 나온다');
  assert.equal(stemNotes(m, TODAY, A).length, 4);
  const many = { concepts: Object.fromEntries(a.map((id, i) => noted(id, 9 - i))) };
  const got = stemNotes(many, TODAY, A);
  assert.equal(got.length, Math.min(NOTES_ROUND, a.length), `한 번에 ${NOTES_ROUND}개까지`);
  assert.deepEqual(got.map((x) => x.note.t), [...got.map((x) => x.note.t)].sort((p, q) => p - q), '오래된 것부터');
  const fresh = { concepts: Object.fromEntries([noted(b[0], 1, TODAY)]) };
  assert.deepEqual(stemNotes(fresh, TODAY, B), [], '오늘 틀린 것은 내일부터');
  assert.deepEqual(stemNotes(m, TODAY, 'nope'), []);
  assert.deepEqual(stemNotes(null, TODAY, B), []);
  assert.ok(read('js/math.js').includes('const notesDue = stemNotes(state, today, ui.stem);'), '사다리 단추가 이것을 쓴다');
});
