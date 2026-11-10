// 🎤 v409 아빠 교정 — 🎤로 읽으면 💰를 받는다는 걸 진우가 알게 (11-10 아버님 「이대로」)
//  ① 🎤 단추에 「💰+5」(아빠 교정 회차만) ② 🎤를 해 보고 넘어가면 받은 ⚡💰 칩을 창 안에 잠깐 ③ 끝 화면에 그 회차에 받은 합 · 🎤를 안 했으면 아무것도 안 띄움
// node --test tests/coachsay409.test.js  (가짜 화면은 essay318.test.js와 같은 꼴)
import { fakeIdb } from './fakeidb.js'; // ★ db.js보다 먼저
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { initEssay, openEssay, closeEssay, gainText, GAIN_MS, REWARD } from '../js/essay.js';
import { getDaily } from '../js/db.js';

void fakeIdb;
const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const tick = async (n = 3) => { for (let k = 0; k < n; k++) await Promise.resolve(); };

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
const synth = { cur: null, speak(u) { this.cur = u; }, cancel() { const u = this.cur; this.cur = null; if (u && u.onend) u.onend(); } };
const finishTalk = () => { const u = synth.cur; synth.cur = null; if (u && u.onend) u.onend(); };

before(async () => {
  globalThis.document = { hidden: false, getElementById: $, createElement: (t) => fakeEl(t), createTextNode: (t) => ({ textContent: String(t), nodeType: 3 }) };
  globalThis.window = { speechSynthesis: synth };
  globalThis.SpeechSynthesisUtterance = function Utter(t) { this.text = t; };
  initEssay();
  await getDaily('2000-01-01');
});

const coachPrompt = (id, written, fix) => ({ id, date: '2026-11-09', written, coachFix: fix, rec: {}, frame: { full: '', keep: '', blankWords: 0 }, cue: null });
/** 아빠 교정 회차 — onRead는 player처럼 🎤를 했으면 준 것을, 아니면 null */
const coachOpen = (prompts, give = (it) => (it.said ? { xp: REWARD.xp, coin: REWARD.coin } : null), sfx = {}) => openEssay({
  mode: 'coach', prompts, reward: { xp: 50, coin: 20 }, known: new Set(), sfx,
  speak: async () => ({ passed: true }), onRead: give, onFinished: async () => null, onDone: () => {},
});
const doneChips = () => $('essay-done-reward').children.map((c) => c.textContent);

test('🎤 gainText — ⚡+10 💰+5 · 0인 쪽은 뺌 · 빈 것', () => {
  assert.equal(gainText({ xp: 10, coin: 5 }), '⚡+10 💰+5');
  assert.equal(gainText({ xp: 10, coin: 0 }), '⚡+10');
  assert.equal(gainText({ xp: 0, coin: 5 }), '💰+5');
  for (const v of [null, undefined, 1, {}, { xp: 0, coin: 0 }, { xp: -3, coin: 'x' }]) assert.equal(gainText(v), '', JSON.stringify(v));
  assert.equal(GAIN_MS, 2200);
  assert.ok(/\.essay-gain\.show \{ animation: essay-gain 2\.2s/.test(read('css/style.css')), '칩이 사라지는 움직임과 같은 시간');
});

test('🎤 ① 단추 글 — 아빠 교정은 「🎤 읽어보기 💰+5」 · 내 에세이는 그대로', async () => {
  coachOpen([coachPrompt('a1', 'i like cat', 'I like cats.')]);
  $('essay-start').click();
  assert.equal($('essay-say').textContent, `🎤 읽어보기 💰+${REWARD.coin}`);
  closeEssay();
  openEssay({
    prompts: [{ rec: { ko: '' }, frame: { full: 'I like apples because they are sweet and red', keep: 'I like', blankWords: 6 }, cue: null }],
    reward: { xp: 50, coin: 20 }, known: new Set(), sfx: {}, speak: async () => ({ passed: true }), onWritten: () => {}, onSaid: () => {}, onFinished: async () => null, onDone: () => {},
  });
  $('essay-start').click();
  $('essay-input').value = 'bananas because they are yellow and soft';
  $('essay-submit').click();
  assert.equal($('essay-say').textContent, '🎤 읽어보기', '내 에세이 단추는 그대로');
  closeEssay();
});

test('🎤 ② ③ 🎤 하고 넘어가면 창 안에 ⚡+10 💰+5 · 소리 · 끝 화면에 합 · 잠깐 뒤 사라짐', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  try {
    const played = [];
    coachOpen([coachPrompt('b1', 'i like cat', 'I like cats.')], undefined, { twinkle: () => played.push('twinkle'), levelUp: () => played.push('levelUp') });
    $('essay-start').click();
    assert.equal($('essay-gain').hidden, true, '처음엔 숨김');
    $('essay-say').click();
    await tick(6);
    $('essay-next').click();
    const g = $('essay-gain');
    assert.equal(g.hidden, false);
    assert.equal(g.textContent, '⚡+10 💰+5');
    assert.ok(g.className.split(' ').includes('show'));
    assert.ok(played.includes('twinkle'));
    await tick();
    assert.equal($('essay-done').hidden, false);
    assert.deepEqual(doneChips(), ['⚡+10 💰+5'], '끝 화면에 받은 합');
    t.mock.timers.tick(GAIN_MS - 1);
    assert.equal(g.hidden, false);
    t.mock.timers.tick(1);
    assert.equal(g.hidden, true, '잠깐 뒤 숨김');
  } finally {
    t.mock.timers.reset();
    closeEssay();
  }
});

test('🎤 🎤 없이 넘기면 칩도 끝 화면 합도 없다(못 받았다는 말 없이) · 둘 중 하나만 했으면 그만큼', async () => {
  const played = [];
  coachOpen([coachPrompt('c1', 'i run', 'I run.')], undefined, { twinkle: () => played.push('twinkle') });
  $('essay-start').click();
  finishTalk();
  await tick();
  $('essay-next').click();
  await tick();
  assert.equal($('essay-gain').hidden, true);
  assert.deepEqual(played, []);
  assert.deepEqual(doneChips(), []);
  assert.ok(!/못|없어요|아쉬/.test($('essay-done-msg').textContent), '재촉·아쉬움 말 없음');
  closeEssay();
  // 두 문장 — 첫째는 🎤, 둘째는 그냥
  coachOpen([coachPrompt('d1', 'i run', 'I run.'), coachPrompt('d2', 'he go', 'He goes.')]);
  $('essay-start').click();
  $('essay-say').click();
  await tick(6);
  $('essay-next').click();
  assert.equal($('essay-gain').textContent, '⚡+10 💰+5');
  finishTalk();
  await tick();
  $('essay-next').click();
  await tick();
  assert.deepEqual(doneChips(), ['⚡+10 💰+5']);
  closeEssay();
  // 두 문장 다 🎤 → 합
  coachOpen([coachPrompt('e1', 'i run', 'I run.'), coachPrompt('e2', 'he go', 'He goes.')]);
  $('essay-start').click();
  for (let k = 0; k < 2; k++) { $('essay-say').click(); await tick(6); $('essay-next').click(); }
  await tick();
  assert.deepEqual(doneChips(), ['⚡+20 💰+10']);
  closeEssay();
});

test('🎤 준 것만 보인다 — 💰가 0이면 ⚡만 · 다시 열면 합을 이어 세지 않음 · 닫으면 칩 숨김', async () => {
  coachOpen([coachPrompt('f1', 'i run', 'I run.')], (it) => (it.said ? { xp: 10, coin: 0 } : null));
  $('essay-start').click();
  $('essay-say').click();
  await tick(6);
  $('essay-next').click();
  assert.equal($('essay-gain').textContent, '⚡+10');
  closeEssay();
  assert.equal($('essay-gain').hidden, true, '닫으면 숨김');
  coachOpen([coachPrompt('f2', 'i run', 'I run.')]);
  assert.equal($('essay-gain').hidden, true, '새 회차 시작엔 숨김');
  $('essay-start').click();
  finishTalk();
  await tick();
  $('essay-next').click();
  await tick();
  assert.deepEqual(doneChips(), [], '앞 회차 합이 넘어오지 않는다');
  closeEssay();
  // 닫지 않고 새 회차가 열려도 앞 칩은 숨긴다
  coachOpen([coachPrompt('f3', 'i run', 'I run.'), coachPrompt('f4', 'he go', 'He goes.')]);
  $('essay-start').click();
  $('essay-say').click();
  await tick(6);
  $('essay-next').click();
  assert.equal($('essay-gain').hidden, false);
  coachOpen([coachPrompt('f5', 'i run', 'I run.')]);
  assert.equal($('essay-gain').hidden, true, '새 회차를 열면 숨김');
  closeEssay();
});

test('🎤 연결 — player onRead가 준 것을 돌려준다 · 화면 칸 · 숨김 규칙 · 판 v409 이상', () => {
  const pl = read('js/player.js');
  assert.ok(pl.includes("if (!it.said) return null;\n      awardXp(ESSAY_REWARD.xp);\n      return { xp: ESSAY_REWARD.xp, coin: awardCoins(ESSAY_REWARD.coin) };"));
  const html = read('index.html');
  // 늘 있는 칸(aria-live) 안에 칩 — 숨긴 칩 자체엔 role을 두지 않는다 (🔍 Codex 214차 ③)
  assert.ok(html.includes('<div class="essay-gain-wrap" aria-live="polite"><div id="essay-gain" class="review-chip gold essay-gain" hidden></div></div>'));
  const card = html.indexOf('<div class="review-card essay-card">');
  assert.ok(card > 0 && html.indexOf('essay-gain-wrap') > card && html.indexOf('essay-gain-wrap') < html.indexOf('id="essay-title"'), '카드 맨 앞 — 스크롤 맨 위에 붙는 자리 · 회차 내내 같은 자리');
  const css = read('css/style.css');
  assert.ok(css.includes('.essay-gain[hidden] { display: none; }'), 'review-chip의 inline-block이 hidden을 덮지 않게');
  assert.ok(css.includes('.essay-gain-wrap { position: sticky; top: 0; height: 0; z-index: 2; }'), '카드를 스크롤해도 보이는 위쪽 · 배치는 밀지 않음 (🔍 Codex 214차 ②)');
  assert.ok(/\.essay-gain \{ position: absolute; top: 2px;/.test(css));
  assert.ok(/prefers-reduced-motion: reduce\) \{ \.essay-gain\.show \{ animation: none; \} \}/.test(css));
  assert.ok(Number((/APP_VERSION = 'v(\d+)'/.exec(read('js/version.js')) || [])[1]) >= 409);
});

test('🔢 v410 교정 회차 시작·끝 문구에 수가 없다 — 한 문장이든 두 문장이든 (아버님 「숫자를 빼」)', async () => {
  for (const n of [1, 2]) {
    coachOpen([coachPrompt('n1', 'i run', 'I run.'), coachPrompt('n2', 'he go', 'He goes.')].slice(0, n));
    assert.equal($('essay-msg').textContent, '아빠가 고쳐준 문장을 읽어 봐요');
    $('essay-start').click();
    for (let k = 0; k < n; k++) { $('essay-say').click(); await tick(6); $('essay-next').click(); }
    await tick();
    assert.equal($('essay-done-msg').textContent, '아빠가 고쳐준 문장을 다 읽었어요 👏');
    assert.ok(!/\d/.test($('essay-msg').textContent + $('essay-done-msg').textContent), '문구에 숫자 없음(보상 칩의 ⚡💰 양은 따로)');
    closeEssay();
  }
  assert.ok(Number((/CACHE_VERSION = 'v(\d+)'/.exec(read('sw.js')) || [])[1]) >= 410);
});
