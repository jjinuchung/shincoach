// 🔧 v394 (2026-11-04 전수 검사 판단 「추천대로」): 아이가 겪을 수 있는 버그 묶음 — 되도록 진짜 동작을 돌려 본다
//  · 받아쓰기 끝 소리 · 같은 낱말 두 번 · 에세이 화면 복귀 · a one-dollar · 분수 나눗셈 글 · 그래프 그린 것 · 🐾 받는 사이 나감 ·
//    없어진 노트 · 낚시 자정 · 변신 배틀당 한 번 · 변신 연타 · 상세창 닫기 · 국어 답장 시간 · 파일 백업 · 국어 셈 문구
import { fakeIdb } from './fakeidb.js'; // ★ db.js·xp.js보다 먼저
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { pickBlanks, makeDictation } from '../js/dictation.js';
import { correct, initEssay, openEssay } from '../js/essay.js';
import { makeQuestion } from '../js/mathgen.js';
import { purchaseRule, emptyProfile } from '../js/db.js';
import { initProfile, flushProfile, reloadProfile, addItem, itemCount, makeSoup, equipMega, getProfileSnapshot, gainCoins } from '../js/xp.js';
import { restoreBackup } from '../js/cloudbackup.js';
import { MUSHROOM, MEGASTONE, SOUP_MUSHROOMS } from '../js/items.js';

void fakeIdb;
const read = (f) => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const tick = async (n = 4) => { for (let i = 0; i < n; i++) await new Promise((r) => setImmediate(r)); };

function fakeEl(tag = 'div') {
  let text = '';
  const names = new Set();
  const e = {
    tagName: tag.toUpperCase(), hidden: false, disabled: false, className: '', value: '', placeholder: '', type: '', style: {}, dataset: {}, children: [], handlers: {}, attrs: {}, isConnected: true,
    classList: { add: (c) => names.add(c), remove: (c) => names.delete(c), contains: (c) => names.has(c), toggle: (c, on) => (on ? names.add(c) : names.delete(c)) },
    appendChild(c) { this.children.push(c); return c; },
    addEventListener(t, fn) { this.handlers[t] = fn; },
    click() { if (this.disabled) return false; if (this.handlers.click) this.handlers.click({ stopPropagation() {}, preventDefault() {} }); return true; },
    focus() {}, setAttribute(k, v) { this.attrs[k] = v; }, removeAttribute() {}, querySelector: () => null, querySelectorAll: () => [], replaceWith() {},
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
const listeners = {};
const realTimeout = globalThis.setTimeout;

before(async () => {
  globalThis.document = {
    hidden: false, getElementById: $, createElement: (t) => fakeEl(t), createElementNS: (n, t) => fakeEl(t), createTextNode: (t) => ({ textContent: t }),
    addEventListener(t, fn) { (listeners[t] ||= new Set()).add(fn); }, removeEventListener(t, fn) { if (listeners[t]) listeners[t].delete(fn); },
  };
  globalThis.window = { speechSynthesis: { speak(u) { if (u.onend) u.onend(); }, cancel() {} } };
  globalThis.SpeechSynthesisUtterance = function Utter(text) { this.text = text; };
  initEssay();
  await initProfile();
});

// ───────────── 🔁 영어 ─────────────

test('🔁 받아쓰기 칸: 같은 낱말이 두 번 든 문장은 그 낱말을 안 뚫는다 (빈칸의 답이 문장에 보임) · 크고 작은 글자·구두점이 달라도 · 다른 낱말이 있으면 그것을', () => {
  const words = ['This', 'place', 'is', 'a', 'safe', 'place.'];
  const known = new Set(['place', 'plane', 'plate', 'safe', 'save', 'sale', 'this']);
  assert.deepEqual(pickBlanks(words, { known, count: 6 }).filter((i) => i === 1 || i === 5), [], '두 자리 다 빠짐');
  assert.ok(pickBlanks(words, { known, count: 6 }).includes(4), '다른 낱말은 그대로');
  assert.deepEqual(pickBlanks(['Place', 'your', 'place.'], { count: 3 }), [1], '크고 작은 글자·구두점이 달라도 같은 낱말');
  for (let s = 0; s < 200; s++) {
    let x = s + 1;
    const rng = () => { x = (x * 16807) % 2147483647; return x / 2147483647; };
    const m = makeDictation({ en: 'This place is a safe place.' }, { box: 1, known, pool: [...known], missed: { place: 3 }, rng });
    assert.ok(!m || m.blanks.every((b) => b.answer !== 'place'), '못 말했던 낱말이어도');
  }
  assert.equal(makeDictation({ en: 'Dogs dogs dogs dogs.' }, { box: 1, known, pool: ['dogs', 'logs', 'dots'] }), null, '뚫을 낱말이 없으면 받아쓰기가 아니라 따라 말하기로');
});

test('🔁 받아쓰기가 끝나면 듣던 문장을 멈춘다 — 덤 문장·연습 판보다 먼저', () => {
  const s = read('js/player.js');
  const at = s.indexOf('onDictation: (item, passed) => {');
  assert.ok(at > 0);
  const body = s.slice(at, at + 260);
  assert.ok(body.indexOf('stopGrammarCue();') > 0 && body.indexOf('stopGrammarCue();') < body.indexOf('item.extra'), body);
  const stop = s.slice(s.indexOf('function stopGrammarCue()'), s.indexOf('function stopGrammarCue()') + 220);
  assert.ok(stop.includes('state.puzzleCue = null;') && stop.includes('video.pause();'));
});

test('✍️ a one-dollar: one·once는 자음 소리라 a를 안 바꾼다 · 모음 소리 교정은 그대로', () => {
  const fixed = (w, keep = 'I want to buy') => correct(keep, w).fixed;
  assert.ok(fixed('a one-dollar toy today.').includes('a one-dollar toy'), fixed('a one-dollar toy today.'));
  assert.ok(fixed('a one dollar toy today.').includes('a one dollar'));
  assert.ok(fixed('a once famous toy.').includes('a once famous'));
  assert.ok(fixed('a apple today.').includes('an apple'), '모음 소리는 그대로 고친다');
  assert.ok(fixed('a orange today.').includes('an orange'));
  assert.ok(fixed('a onion today.').includes('an onion'), 'one으로 시작하지 않는 낱말은 그대로');
  assert.ok(fixed('an dog today.').includes('a dog'));
});

test('✍️ 에세이: 통과 직후 화면이 꺼져도 돌아오면 다음 문장으로 — 꺼진 동안엔 안 넘어감', async () => {
  globalThis.setTimeout = (f, ms, ...a) => realTimeout(f, 0, ...a);
  try {
    const prompt = (id, w, f) => ({ id, date: '2026-11-04', written: w, coachFix: f, rec: {}, frame: { full: '', keep: '', fill: '' } });
    const start = (done) => {
      openEssay({
        mode: 'coach', prompts: [prompt('e1', 'i like cat', 'I like cats.'), prompt('e2', 'he go school', 'He goes to school.')],
        reward: { xp: 50, coin: 20 }, known: new Set(), sfx: {}, speak: async () => ({ passed: true }),
        onRead() {}, onPass: async () => null, onFinished: async () => null, onDone: done || (() => {}),
      });
      $('essay-start').click();
    };
    const shown = () => $('essay-fixed').textContent;
    start();
    assert.equal(shown(), 'I like cats.');
    $('essay-say').click();
    document.hidden = true; // 결과가 나온 뒤, 넘어가기 전에 앱을 내림
    await new Promise((r) => realTimeout(r, 40));
    await tick(8);
    assert.equal(shown(), 'I like cats.', '꺼진 동안엔 그대로');
    document.hidden = false;
    for (const fn of [...(listeners.visibilitychange || [])]) fn();
    await tick(4);
    assert.equal(shown(), 'He goes to school.', '돌아오면 다음 문장');
    assert.equal((listeners.visibilitychange || new Set()).size, 0, '기다리던 손을 치운다');
    // 꺼진 채 기다리다 아직 꺼져 있으면 그대로 기다림
    start();
    $('essay-say').click();
    document.hidden = true;
    await new Promise((r) => realTimeout(r, 40));
    await tick(8);
    for (const fn of [...(listeners.visibilitychange || [])]) fn();
    assert.equal(shown(), 'I like cats.', '아직 꺼져 있으면 넘어가지 않는다');
    assert.equal(listeners.visibilitychange.size, 1, '계속 기다린다');
    document.hidden = false;
    for (const fn of [...listeners.visibilitychange]) fn();
    await tick(4);
  } finally {
    document.hidden = false;
    globalThis.setTimeout = realTimeout;
  }
});

// ───────────── 🔢 수학 ─────────────

test('🔢 분수 나눗셈 글: 횟수·개수를 묻지 않는다 — 답이 분수여도 말이 되게 (씨앗 3000 · 세계 넷)', () => {
  const worlds = { toystory: ['우디'], minions: ['밥'], moana: ['모아나'] };
  const seen = new Set();
  for (let s = 1; s <= 3000; s++) {
    const q = makeQuestion('frac.div', 'calc', s, { worlds });
    const t = q.text || q.q || '';
    assert.ok(t, `씨앗 ${s}`);
    assert.ok(!/몇 번 해야|몇 병 필요|몇 통 필요/.test(t), t);
    if (/몇 시간이/.test(t)) seen.add('시간');
    if (/몇 병만큼/.test(t)) seen.add('병');
    if (/몇 통만큼/.test(t)) seen.add('통');
    assert.ok(!/undefined|\{mon/.test(t), t);
  }
  assert.deepEqual([...seen].sort(), ['병', '시간', '통']);
});

test('🐾 받는 사이 나가면 그 판은 버린다 — 다른 화면을 덮지 않는다 · 처음 받는 동안 사다리를 비운다 · 그만하기 · 다시 누름 · 받으면 판이 열린다', async () => {
  const mons = {};
  for (const id of [25, 133, 4, 5, 6, 7, 8, 9, 1, 39, 52, 54]) mons[id] = [10 + id, 60 + id];
  const json = { v: 1, src: 't', mons };
  const fetchOnce = () => {
    const gate = {};
    gate.wait = new Promise((r) => { gate.go = () => r({ ok: true, json: async () => json }); });
    globalThis.fetch = () => gate.wait;
    return gate;
  };
  const ctxOf = () => {
    const c = { cleared: 0, backs: 0, last: null, clearMain() { this.cleared += 1; this.last = fakeEl(); return this.last; }, back() { this.backs += 1; }, getState: () => ({}), setState() {}, updateChip() {} };
    return c;
  };
  // ① 나감 — 늦게 와도 그리지 않는다
  const A = await import('../js/mathpokeview.js?a');
  const g1 = fetchOnce();
  const c1 = ctxOf();
  const p1 = A.startPoke(c1);
  assert.equal(c1.cleared, 1, '받는 동안 사다리를 비운다');
  assert.match(c1.last.children[0].textContent, /받는 중/);
  A.endPoke();
  g1.go();
  await p1;
  await tick(6);
  assert.deepEqual([c1.cleared, A.pokeActive()], [1, false], '나간 뒤엔 그리지 않는다');
  // ①-2 나간 뒤에 받기가 실패해도 「못 받았어요」 화면이 다른 화면을 덮지 않는다
  const A2 = await import('../js/mathpokeview.js?a2');
  let fail;
  globalThis.fetch = () => new Promise((res, rej) => { fail = rej; });
  const c0 = ctxOf();
  const p0 = A2.startPoke(c0);
  A2.endPoke();
  fail(new Error('끊김'));
  await p0;
  await tick(6);
  assert.equal(c0.cleared, 1, '실패 화면을 안 그린다');
  // ② 그만하기 단추
  const B = await import('../js/mathpokeview.js?b');
  const g2 = fetchOnce();
  const c2 = ctxOf();
  const p2 = B.startPoke(c2);
  const quit = c2.last.children[0].children.length ? null : c2.last.children[0];
  void quit;
  const card = c2.last.children[0];
  const btn = card.children.find((x) => x.tagName === 'BUTTON');
  assert.ok(btn && /그만하기/.test(btn.textContent));
  btn.click();
  assert.equal(c2.backs, 1);
  g2.go();
  await p2;
  await tick(6);
  assert.equal(B.pokeActive(), false, '그만하기 뒤에도 안 열림');
  // ③ 끝까지 기다리면 판이 열린다 · 두 번 눌러도 한 판
  const C = await import('../js/mathpokeview.js?c');
  const g3 = fetchOnce();
  const c3 = ctxOf();
  const pa = C.startPoke(c3);
  const pb = C.startPoke(c3);
  g3.go();
  await Promise.all([pa, pb]);
  await tick(6);
  assert.equal(C.pokeActive(), true, '판이 열린다');
  assert.equal(c3.cleared, 3, '받는 화면 둘 + 판 하나');
  C.endPoke();
  // ④ 이미 받아 둔 뒤에는 받는 화면 없이
  const c4 = ctxOf();
  await C.startPoke(c4);
  assert.equal(c4.cleared, 1, '판만 그린다');
  C.endPoke();
  // ⑤ 장부를 읽는 사이에 나가도 — 어느 틈이든 판이 안 열린다
  for (let n = 0; n < 12; n++) {
    const c5 = ctxOf();
    const p = C.startPoke(c5);
    for (let i = 0; i < n; i++) await Promise.resolve();
    C.endPoke();
    await p;
    await tick(4);
    assert.equal(C.pokeActive(), false, `${n}번째 틈`);
  }
});

test('🔢 잇기: 그린 그래프는 문항에 남는다 · 없어진 노트는 지운 뒤에 사다리를 그린다', () => {
  const d = read('js/drawview.js');
  assert.ok(d.includes('let k = Number.isInteger(draw.pending) && draw.pending >= min && draw.pending <= G.cells ? draw.pending : null;'));
  assert.match(d, /function set\(kk\) \{\n {4}k = Math\.min\(G\.cells, Math\.max\(min, kk\)\);\n {4}draw\.pending = k;/);
  const m = read('js/math.js');
  assert.ok(m.includes('if (!qs.length) { saved.then(() => { if (!ui.round && mathVisible()) renderLadder(ui.state); }); return; }'));
  assert.ok(!m.includes('if (!qs.length) { renderLadder(ui.state); return; }'));
});

// ───────────── 🎣 ⚔️ ─────────────

test('🎣 창을 켜 둔 채 날이 바뀌면 새날 시간으로: 쓴 시간·보낸 초·🔒 몫을 지우고 낚시터가 새로 센다', () => {
  const v = read('js/fishview.js');
  const roll = v.slice(v.indexOf('function rollDay()'), v.indexOf('function saveTime('));
  for (const line of ['ui.day = d;', 'ui.used = 0;', 'ui.savedUsed = 0;', 'ui.host.bonusMin = 0;', 'ui.host.onNewDay && ui.host.onNewDay();']) assert.ok(roll.includes(line), line);
  assert.match(roll, /function leftSec\(\) \{\n {2}rollDay\(\);/);
  assert.match(v, /function saveTime\(force\) \{\n {2}if \(!ui\) return;\n {2}rollDay\(\);/, '시간을 적기 전에');
  assert.ok(v.includes("day: typeof h.dayNow === 'function' ? h.dayNow() : ''"));
  const l = read('js/lakeview.js');
  assert.ok(l.includes('dayNow: clockDay,') && l.includes('onNewDay: () => { sentSec = 0; },'));
});

test('⚔️ 변신은 배틀당 한 번 — 거다이맥스가 끝나도 단추가 다시 안 나오고 변신도 안 된다 · 새 배틀이면 다시', () => {
  const b = read('js/battle.js');
  assert.ok(b.includes('ui.formUsed = false;'), '배틀을 시작할 때만 지운다');
  assert.equal(b.match(/ui\.formUsed = false/g).length, 1);
  assert.ok(b.includes('if (ui.form || ui.formUsed) return;') && b.includes('ui.formUsed = true;'));
  assert.ok(b.includes('if (!ui.form && !ui.formUsed) {'));
  const rev = b.slice(b.indexOf('function revertForm()'), b.indexOf('function renderActions()'));
  assert.ok(rev.includes('ui.form = null;') && !rev.includes('formUsed'), '돌아와도 썼다는 표시는 남는다');
});

test('💠🍲 변신 아이템 (순수 · 저장): 겹친 요청은 재료를 한 번만 · 이미 있으면 거절 · 다른 포켓몬은 그대로', async () => {
  const p = { ...emptyProfile(), items: { [MUSHROOM.id]: 20 }, mons: {} };
  const cost = { items: { [MUSHROOM.id]: 10 } };
  const gain = (id) => ({ mons: { [id]: { gmax: true } }, monOnce: { id, key: 'gmax' } });
  assert.equal(purchaseRule(p, cost, gain(25)).ok, true);
  assert.deepEqual(purchaseRule(p, cost, gain(25)), { ok: false, why: 'owned' });
  assert.equal(p.items[MUSHROOM.id], 10, '두 번째는 재료를 안 쓴다');
  assert.equal(purchaseRule(p, cost, gain(133)).ok, true, '다른 포켓몬은 된다');
  // 진짜 저장 — 첫 저장이 끝나기 전에 또 누른 것처럼
  addItem(MUSHROOM.id, SOUP_MUSHROOMS * 2);
  await flushProfile();
  const before = itemCount(MUSHROOM.id);
  const r = await Promise.all([makeSoup(6), makeSoup(6)]);
  assert.deepEqual(r, [true, true], '둘 다 「됐어요」 — 재료 모자람으로 안 보인다');
  assert.equal(itemCount(MUSHROOM.id), before - SOUP_MUSHROOMS, '재료는 한 번만');
  assert.equal(getProfileSnapshot().mons[6].gmax, true);
  addItem(MEGASTONE.id, 2);
  await flushProfile();
  const stones = itemCount(MEGASTONE.id);
  assert.deepEqual(await Promise.all([equipMega(9, true), equipMega(9, true)]), [true, true]);
  assert.equal(itemCount(MEGASTONE.id), stones - 1, '스톤은 하나만');
});

test('💠 상세창 잇기: 저장 중 또 눌러도 한 번 · 그림을 받는 사이 창을 닫아도 쓰던 이름으로', () => {
  const s = read('js/shop.js');
  assert.match(s, /let busy = false;[^\n]*\n {2}btn\.addEventListener\('click', async \(e\) => \{\n {4}if \(busy\) return;\n {4}busy = true;\n {4}try \{ await onClick\(e\); \} finally \{ busy = false; \}/);
  for (const kind of ['메가진화할 수 있게', '거다이맥스할 수 있게']) {
    const at = s.indexOf(kind);
    const line = s.slice(s.lastIndexOf('\n', at), at);
    assert.ok(line.includes('${m.ko}') && !line.includes('mon.ko'), line);
  }
  assert.ok(!/await ensureForm\(mon\.id/.test(s));
  assert.match(s, /function change\(ok, msg, m = mon\) \{\n {2}if \(!m\) return;\n {2}if \(mon !== m\) \{ if \(ok\) notify\(m\.id\); return; \}/, '다른 화면은 안 건드린다');
  assert.ok(s.includes('setPartner(m.id).then((ok) => change(ok, `🤝 ${m.ko}${josaIga(m.ko)} 파트너가 됐어요!`, m));'));
  assert.equal(s.match(/받을게요\)'\), m\);/g).length, 2, '메가·스프도 시작한 포켓몬을 넘긴다');
});

// ───────────── 📚 🛟 ─────────────

test('📚 국어 답장 띠는 ⏳ 시간을 본다 (논술 띠와 같게) · 🛟 파일 가져오기는 자동 백업 되살리기와 같은 길', () => {
  const w = read('js/korwriteview.js');
  assert.ok(w.includes("import { guardStart } from './timeup.js';"));
  assert.ok(w.includes("b.addEventListener('click', () => guardStart('korean', () => renderReplyView(list[0].card, ctx)));"));
  const st = read('js/stats.js');
  const f = st.slice(st.indexOf('function doImport(file)'), st.indexOf('function doImport(file)') + 420);
  assert.ok(f.includes('const { n } = await restoreBackup(JSON.parse(fr.result));'), f);
  assert.ok(!f.includes('importStats'));
  assert.ok(f.includes('await reloadProfile();'));
});

test('🛟 일부만 든 파일: 💰·가방이 없는 프로필은 앞세우지 않는다 — 지금 코인·가방이 그대로 · 프로필 없는 파일도', async () => {
  gainCoins(321);
  addItem(MEGASTONE.id, 1);
  await flushProfile();
  await reloadProfile();
  const coins = getProfileSnapshot().coins;
  const stones = itemCount(MEGASTONE.id);
  assert.ok(coins > 0 && stones > 0);
  const r = await restoreBackup({ app: 'shincoach', profile: [{ id: 'me', xp: 999999, updatedAt: 1 }] });
  assert.equal(r.lead, false, '앞세우지 않는다');
  await reloadProfile();
  assert.deepEqual([getProfileSnapshot().coins, itemCount(MEGASTONE.id)], [coins, stones], '코인·가방 그대로');
  let xp = 999999; // 줄지 않는 수는 합칠 때 큰 값이 남는다 — 판마다 더 커야 「백업이 앞선」 경우가 된다
  for (const part of [{ items: {} }, { coins: 5 }, { coins: '5', items: {} }, { coins: 5, items: 3 }]) {
    xp += 1;
    const q = await restoreBackup({ app: 'shincoach', profile: [{ id: 'me', xp, updatedAt: 1, ...part }] });
    assert.equal(q.lead, false, JSON.stringify(part));
  }
  await reloadProfile();
  assert.deepEqual([getProfileSnapshot().coins, itemCount(MEGASTONE.id)], [coins, stones], '한 칸만 빠져도');
  await restoreBackup({ app: 'shincoach', daily: [] });
  await reloadProfile();
  assert.equal(getProfileSnapshot().coins, coins, '프로필 없는 파일도');
  // 온전한 백업은 앞선다 (새 기기) — 줄지 않는 수가 앞선 백업
  const whole = { id: 'me', xp: 9999999, coins: 777, items: { [MEGASTONE.id]: 9 }, mons: {}, caught: {}, updatedAt: 1 };
  assert.equal((await restoreBackup({ app: 'shincoach', profile: [whole] })).lead, true);
  await reloadProfile();
  assert.deepEqual([getProfileSnapshot().coins, itemCount(MEGASTONE.id)], [777, 9], '백업이 앞선다');
});

test('📚 국어 화면 셈 문구: 모은 수만 — 전체 수·문항 수·다시 풀 것·잠긴 수는 안 쓴다 (📤에는 그대로)', () => {
  const k = read('js/koreanview.js');
  assert.ok(k.includes('`모은 카드 ${got} · ★ ${stars}`'));
  const t = read('js/kortabs.js');
  assert.ok(t.includes("'🔤 오늘의 낱말 시작'") && t.includes("'🔤 새 낱말 더 배우기'"));
  assert.ok(t.includes('`⭐ ${s.mastered}`') && !t.includes('배우는 중 ${'));
  const p = read('js/korpuzzleview.js');
  assert.ok(p.includes('`⭐ ${s.solved}`') && !p.includes('다시 풀 것 ${'));
  assert.ok(!t.includes('${p.words}') && !t.includes('${p.starMax}') && !t.includes('준비된 단원'), '단원 지도도 분모 없이');
  assert.ok(p.includes("'🧩 오늘의 퍼즐 시작'") && p.includes("'🔁 다 푼 퍼즐 다시 해 보기'"), '퍼즐 단추도 문제 수 없이');
  for (const [name, src] of [['koreanview', k], ['kortabs', t], ['korpuzzleview', p]]) {
    // 판 안의 「문제 1 / 3」·끝난 뒤 「맞힌 낱말 3 / 4」는 고르는 화면이 아니라 그대로 · 고르는 화면의 분모만 본다
    const left = [...src.matchAll(/`[^`\n]*\$\{[^}]*\} \/ \$\{[^}]*\}[^`\n]*`/g)].map((x) => x[0]).filter((x) => !/^`(문제|퍼즐|한 번에 맞힌)/.test(x) && !x.includes('아쉬워요'));
    assert.deepEqual(left, [], `${name} 분모`);
    assert.ok(!/🔒 \$\{/.test(src), `${name} 잠긴 수`);
  }
});
