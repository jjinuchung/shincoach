// 📝 문법 쪽지 창 v349 (2026-10-27 — 아버님 "과목을 새롭게 만들자는 게 아니었다 — 기존 영어 과목 중간중간에" → 기본안 "모두 추천대로")
//  js/grammarnote.js를 작은 가짜 DOM으로 돌린다: 쪽지 고르기(prepareNote — 새 단원·다시 볼 단원은 개념 먼저 · ⭐뿐이면 연습 · 낼 단원이 없으면 null) ·
//  세 문제 · 틀린 수(⚡💰 계단으로 넘김) · ⚡💰는 쪽지마다 한 번([다시 저장하기]로 또 안 줌) · 저장 · [계속하기 ▶] → onDone · 접으면 아무것도 안 남음
//  (영상 흐름에 걸리는 것은 tests/player.logic.test.js 「📝」 · 규칙은 tests/grammar348.test.js)
import { fakeIdb } from './fakeidb.js'; // ★ db.js·xp.js보다 먼저
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { emptyProfile } from '../js/db.js';
import { initProfile, flushProfile, reloadProfile } from '../js/xp.js';
import { SOLVED, STAR_COINS, allUnits } from '../js/grammar.js';
import { dayNum } from '../js/korean.js';

const RAW = JSON.parse(readFileSync(new URL('../coach/english/grammar.json', import.meta.url), 'utf8'));
const UNITS = allUnits(RAW);
const tick = () => new Promise((r) => setTimeout(r, 0));
const settle = async () => { for (let i = 0; i < 20; i++) await tick(); };

// ── 작은 가짜 DOM (grammarnote.js가 쓰는 만큼만) ──
class El {
  constructor(tag) { this.tagName = tag.toUpperCase(); this.children = []; this.className = ''; this._text = ''; this.attrs = {}; this.listeners = {}; this.hidden = false; this.disabled = false; this.value = ''; this.type = ''; this.scrollTop = 0; this.placeholder = ''; }
  set textContent(v) { this._text = String(v); this.children = []; }
  get textContent() { return this._text + this.children.map((c) => c.textContent).join(''); }
  set innerHTML(v) { if (!v) { this.children = []; this._text = ''; } }
  get innerHTML() { return ''; }
  appendChild(c) { this.children.push(c); return c; }
  setAttribute(k, v) { this.attrs[k] = String(v); }
  addEventListener(t, fn) { (this.listeners[t] ||= []).push(fn); }
  fire(t) { for (const fn of this.listeners[t] || []) fn({ preventDefault() {} }); }
  focus() {}
}
const roots = {};
globalThis.document = {
  getElementById: (id) => roots[id] || null,
  createElement: (t) => new El(t),
  createTextNode: (t) => ({ textContent: String(t), children: [] }),
};
globalThis.fetch = async (url) => (String(url).includes('grammar.json') ? { ok: true, json: async () => JSON.parse(JSON.stringify(RAW)) } : { ok: false, status: 404 });
const all = (el, out = []) => { for (const c of el.children || []) { if (c instanceof El) { out.push(c); all(c, out); } } return out; };
const has = (el, cls) => el.className.split(' ').includes(cls);
const main = () => roots['grammar-note-main'];
const text = () => main().textContent;
const buttons = () => all(main()).filter((e) => e.tagName === 'BUTTON');
const press = (label) => { const b = buttons().find((x) => !x.disabled && x.textContent.includes(label)); assert.ok(b, `단추 「${label}」 — 화면: ${text().slice(0, 120)}`); b.fire('click'); return b; };
const opts = () => buttons().filter((b) => has(b, 'gr-opt'));
const optText = (b) => b.children[1].textContent;

let initDone = false;
const stored = () => fakeIdb.get('profile', 'me');
async function seed(p) {
  if (!initDone) { await initProfile(); initDone = true; }
  await flushProfile();
  const cur = stored() || emptyProfile();
  fakeIdb.put('profile', { ...cur, ...p, id: 'me', updatedAt: (cur.updatedAt || 0) + 1 });
  await reloadProfile();
}
function freshRoots() {
  roots['grammar-note'] = new El('div');
  roots['grammar-note'].hidden = true;
  roots['grammar-note-main'] = new El('div');
}

/** 지금 문제를 푼다 — wrong번 틀린 뒤 맞힘 (고르기: 틀린 보기 · 쳐 넣기: 엉뚱한 말 · 순서: 거꾸로) */
function solve(note, k, wrong) {
  const d = note.deal[k];
  const q = note.u.qs[d.i];
  if (d.kind === 'pick') {
    const bad = q.opts.filter((o) => !o.ok).map((o) => o.t);
    for (let w = 0; w < wrong; w++) opts().find((b) => optText(b) === bad[w]).fire('click');
    opts().find((b) => optText(b) === q.opts.find((o) => o.ok).t).fire('click');
  } else if (d.kind === 'type') {
    const submit = (v) => { const f = all(main()).find((e) => e.tagName === 'FORM'); all(f).find((e) => e.tagName === 'INPUT').value = v; f.fire('submit'); };
    for (let w = 0; w < wrong; w++) submit('zzqq');
    submit(q.ans[0]);
  } else {
    const place = (order) => { for (const t of order) { const b = all(main()).filter((e) => has(e, 'gr-tile') && !has(e, 'is-placed')).find((x) => x.textContent === t); b.fire('click'); } press('확인'); };
    for (let w = 0; w < wrong; w++) { place(q.tiles.slice().reverse()); press('모두 빼기'); }
    place(q.tiles);
  }
  assert.ok(text().includes('✓ 맞아요!'), `${note.id} ${k + 1}번 맞음`);
}

const NOW = Date.now();
const D0 = dayNum(NOW);

test('📝 prepareNote: 새 단원은 개념 먼저 · 다시 볼 단원(다음 날)도 개념 먼저 · ⭐뿐이면 오래 안 본 단원으로 연습(개념 접음) · 낼 단원이 없으면 null', async () => {
  const m = await import('../js/grammarnote.js');
  assert.equal(await m.loadGrammar(), true);
  await seed({ grammar: {}, grammarKnown: {}, grammarSeen: {} });
  const a = m.prepareNote(NOW);
  assert.deepEqual([a.id, a.concept, a.from, a.deal.length, a.rolls.length], ['G1', true, 0, 3, 2]);
  await seed({ grammar: { G1: { box: 0, due: D0, at: 123, miss: 1, d0: D0 - 1 } } });
  const b = m.prepareNote(NOW);
  assert.deepEqual([b.id, b.concept, b.from], ['G1', true, 123], '다시 볼 단원 — 개념 먼저 · from은 그 단원의 at');
  const stars = Object.fromEntries(UNITS.map((u, i) => [u.id, { box: SOLVED, due: 0, at: 1000 + (u.id === 'G5' ? 0 : i + 10), miss: 0, d0: D0 }]));
  await seed({ grammar: stars });
  const c = m.prepareNote(NOW);
  assert.deepEqual([c.id, c.concept], ['G5', false], '⭐뿐이면 오래 안 본 단원으로 연습 — 개념은 접어 둔다');
  const again = Object.fromEntries(UNITS.map((u) => [u.id, { box: 0, due: D0 + 1, at: 5, miss: 1, d0: D0 }]));
  await seed({ grammar: again });
  assert.equal(m.prepareNote(NOW), null, '오늘 틀린 단원뿐이면 낼 것이 없다 (내일 다시)');
  await seed({ grammar: {}, grammarKnown: { G1: D0, G2: D0 } });
  assert.equal(m.prepareNote(NOW).id, 'G3', 'v348 진단 ✅는 건너뛴다');
});

test('📝 쪽지 한 장: 개념 → 세 문제(점 셋) → 틀린 수를 계단으로 넘김(한 번) → 저장(⭐ 아님·내일 다시·본 문제 셋) → [계속하기 ▶] → onDone · 창 닫힘', async () => {
  const m = await import('../js/grammarnote.js');
  await m.loadGrammar();
  await seed({ coins: 0, coinsEarned: 0, grammar: {}, grammarKnown: {}, grammarSeen: {}, grammarMiss: {}, grammarDay: {}, grammarGift: { n: 0, day: 0, id: 0 }, caught: {} });
  freshRoots();
  const note = m.prepareNote(NOW);
  note.rolls = [0.5, 0.5];
  const rewards = [];
  let done = 0;
  assert.equal(m.openGrammarNote(note, { onReward: async (w) => { rewards.push(w); return { xp: 20, coin: 3 }; }, onDone: () => { done++; } }), true);
  assert.equal(roots['grammar-note'].hidden, false);
  assert.ok(m.isGrammarNoteOpen());
  assert.ok(text().includes(`📝 문법 쪽지 · ${note.u.title}`) && text().includes(`📘 ${note.u.short}`), '개념 한 장 먼저');
  press('문제 풀기');
  const dots = () => all(main()).filter((e) => e.tagName === 'OL' && has(e, 'gr-dots'))[0].children.map((li) => li.className || '·').join(' ');
  assert.equal(dots(), 'is-now · ·');
  solve(note, 0, 1);
  press('다음');
  assert.equal(dots(), 'is-done is-now ·');
  solve(note, 1, 0);
  press('다음');
  solve(note, 2, 1);
  press('다 했어요');
  await settle();
  assert.deepEqual(rewards, [2], '틀린 수 2 — 계단으로 한 번');
  assert.ok(text().includes('📝 문법 쪽지 끝!') && text().includes('⚡+20 💰+3'), text());
  assert.ok(text().includes(`다음에 이 단원을 처음부터 다 맞히면 ⭐와 💰${STAR_COINS}!`));
  const s = stored();
  assert.deepEqual([s.grammar.G1.box, s.grammar.G1.due, s.coins], [0, D0 + 1, 0], '틀렸으니 ⭐ 아님 · 내일 다시 · ⭐ 💰 없음 (⚡💰 계단은 player.js 몫)');
  assert.equal(s.grammarSeen.G1.toString(2).split('').filter((x) => x === '1').length, 3, '본 문제 셋');
  assert.equal(s.grammarDay[D0], 1, '푼 날');
  press('계속하기');
  assert.deepEqual([done, roots['grammar-note'].hidden, m.isGrammarNoteOpen()], [1, true, false]);
});

test('📝 한 번도 안 틀리면 ⭐와 💰10 · 계단에 0을 넘김 · 하루 몫이 없으면(null) ⚡💰 줄 없이', async () => {
  const m = await import('../js/grammarnote.js');
  await seed({ coins: 0, coinsEarned: 0, grammar: {}, grammarKnown: {}, grammarSeen: {}, grammarMiss: {}, grammarDay: {}, grammarGift: { n: 0, day: 0, id: 0 }, caught: {} });
  freshRoots();
  const note = m.prepareNote(NOW);
  note.rolls = [0.5, 0.5];
  const rewards = [];
  m.openGrammarNote(note, { onReward: async (w) => { rewards.push(w); return null; } });
  press('문제 풀기');
  for (let k = 0; k < 3; k++) { solve(note, k, 0); press(k < 2 ? '다음' : '다 했어요'); }
  await settle();
  assert.deepEqual(rewards, [0]);
  assert.ok(text().includes(`⭐ 처음부터 다 맞혔어요! · 💰 +${STAR_COINS} 더`), text());
  assert.ok(!text().includes('⚡+'), '하루 몫이 없으면 ⚡💰 줄 없음');
  assert.deepEqual([stored().grammar.G1.box, stored().coins], [SOLVED, STAR_COINS]);
});

test('📝 저장이 안 되면 [다시 저장하기] — ⚡💰는 또 안 준다 · 다시 저장하면 들어간다 · 접으면(closeGrammarNote) onDone·보상 없음', async () => {
  const m = await import('../js/grammarnote.js');
  await seed({ coins: 0, coinsEarned: 0, grammar: {}, grammarKnown: {}, grammarSeen: {}, grammarMiss: {}, grammarDay: {}, grammarGift: { n: 0, day: 0, id: 0 }, caught: {} });
  freshRoots();
  let paid = 0;
  let done = 0;
  const n2 = m.prepareNote(NOW);
  n2.rolls = [0.5, 0.5];
  m.openGrammarNote(n2, { onReward: async () => { paid++; return { xp: 30, coin: 5 }; }, onDone: () => { done++; } });
  press('문제 풀기');
  for (let k = 0; k < 2; k++) { solve(n2, k, 0); press('다음'); }
  solve(n2, 2, 0);
  fakeIdb.failNext('profile');
  press('다 했어요');
  await settle();
  assert.ok(text().includes('저장이 안 됐어요') && text().includes('⚡+30 💰+5'), `저장 실패에도 받은 ⚡💰는 보인다: ${text().slice(0, 120)}`);
  assert.equal(stored().grammar.G1, undefined, '저장 실패 = 없던 일');
  press('다시 저장하기');
  await settle();
  assert.equal(paid, 1, '⚡💰는 쪽지마다 한 번');
  assert.equal(stored().grammar.G1.box, SOLVED, '다시 저장하면 들어간다');
  assert.ok(text().includes('📝 문법 쪽지 끝!'));
  // 푸는 중에 접으면 — onDone도 보상도 없다
  freshRoots();
  let paid2 = 0;
  let done2 = 0;
  m.openGrammarNote(m.prepareNote(NOW), { onReward: async () => { paid2++; return null; }, onDone: () => { done2++; } });
  m.closeGrammarNote();
  await settle();
  assert.deepEqual([paid2, done2, roots['grammar-note'].hidden, m.isGrammarNoteOpen()], [0, 0, true, false]);
  assert.equal(done, 0, '앞 쪽지는 [계속하기]를 안 눌렀다');
});

test('📝 연습 쪽지: 개념은 접어 두고 「📘 개념 다시 보기」로 펼친다 · 다음 문제로 가면 다시 접힘 · 제목은 연습 쪽지', async () => {
  const m = await import('../js/grammarnote.js');
  const stars = Object.fromEntries(UNITS.map((u, i) => [u.id, { box: SOLVED, due: 0, at: 1000 + i, miss: 0, d0: D0 }]));
  await seed({ grammar: stars, grammarSeen: {} });
  freshRoots();
  const note = m.prepareNote(NOW);
  note.rolls = [0.5, 0.5];
  m.openGrammarNote(note, { onReward: async () => null });
  assert.ok(!text().includes('문제 풀기') && !text().includes(`📘 ${note.u.short}`), '바로 문제');
  press('개념 다시 보기');
  assert.ok(text().includes(`📘 ${note.u.short}`), '펼침');
  solve(note, 0, 0);
  press('다음');
  assert.ok(!text().includes(`📘 ${note.u.short}`) && text().includes('개념 다시 보기'), '다음 문제에선 다시 접힘');
  solve(note, 1, 0);
  press('다음');
  solve(note, 2, 0);
  press('다 했어요');
  await settle();
  assert.ok(text().includes('📝 연습 쪽지 끝!'), text());
  m.closeGrammarNote();
});
