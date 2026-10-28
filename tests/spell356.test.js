// v356 🔤 진우 철자 노트 (2026-10-28 아버님 「추천대로」) — 에세이 아빠 교정의 철자 칸 spell: [{ from, to }] → 🎬 영상 사이 하루 한 번 「🔤 철자 쪽지」(낱말 셋)
//  규칙(spell.js — 낱말 모으기·고르기·졸업·💰) · 저장(xp.spellFinish — 한 트랜잭션) · 받기(spellnote.syncSpellRows) · 창(spellnote.js — 작은 가짜 DOM) · 📤 english/spell.md · 병합
//  ★ 시험 낱말은 지어낸 것만 — 진우가 실제로 틀린 낱말은 비공개 저장소에만 둔다 (영상 흐름에 걸리는 것은 tests/player.logic.test.js 「🔤」)
import { fakeIdb } from './fakeidb.js'; // ★ db.js·xp.js보다 먼저
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  SPELL, dayOfKey, normWord, blankOf, blankParts, spellSeenOf, mergeSpellSeen, spellRows, spellRowsOf, spellActive, pickSpell, spellReady, spellSlot, grammarCount,
  spellJudge, spellMarks, spellFinishRule, spellFinishText, spellMd,
} from '../js/spell.js';
import { emptyProfile, cloneProfile, mergeStatRecord } from '../js/db.js';
import { initProfile, flushProfile, reloadProfile, spellFinish, spellMap } from '../js/xp.js';
import { dayNum } from '../js/korean.js';
import { gatherFiles } from '../js/upload.js';

const LS = new Map();
globalThis.localStorage = { getItem: (k) => (LS.has(k) ? LS.get(k) : null), setItem: (k, v) => { LS.set(k, String(v)); }, removeItem: (k) => { LS.delete(k); } };
const read = (f) => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');
const NOW = new Date(2026, 9, 28, 15).getTime();
const TODAY = dayNum(NOW);
const DAY = 86400000;
const tick = () => new Promise((r) => setTimeout(r, 0));
const settle = async () => { for (let i = 0; i < 20; i++) await tick(); };
/** 지어낸 교정 줄 */
const FIX = [
  { date: '2026-10-20', written: 'I saw a zebbra.', fixed: 'I saw a zebra.', spell: [{ from: 'zebbra', to: 'zebra' }] },
  { date: '2026-10-22', written: 'The zebrra and the rabit ran.', fixed: 'The Zebra and the rabbit ran.', spell: [{ from: 'zebrra', to: 'zebra' }, { from: 'rabit', to: 'rabbit' }] },
  { date: '2026-10-25', written: 'My pencel is yelow.', fixed: 'My pencil is yellow.', spell: [{ from: 'pencel', to: 'pencil' }, { from: 'yelow', to: 'yellow' }] },
  { written: 'I go there yesterday.', fixed: 'I went there yesterday.' }, // 철자 칸 없음(문법 고침) — 안 센다
  { date: '2026-10-26', written: 'cat', fixed: 'I like my cat.', spell: [{ from: 'dgo', to: 'dog' }, { from: 'cat', to: 'cat' }, { from: 'Ca7', to: 'cat' }, 'x', { from: 'abc' }] }, // 깨진 칸 — 고친 글에 없는 낱말 · 같은 낱말 · 꼴 깨짐
];
const ROWS = spellRows(FIX);

test('🔤 값: 쪽지 낱말 셋 · 다른 날 두 번 연속이면 졸업 · 쪽지 💰10(📝 쪽지와 같게)', () => {
  assert.deepEqual(SPELL, { n: 3, done: 2, coins: 10 });
  assert.equal(dayOfKey('2026-10-28'), TODAY);
  assert.deepEqual([dayOfKey(''), dayOfKey('2026/10/28'), dayOfKey(undefined)], [0, 0, 0]);
});

test('🔤 낱말 모으기(spellRows): 철자 칸만 · 틀린 수·마지막으로 틀린 날·최근 문장·내 철자(최근 것부터) · 고친 글에 없는 낱말·같은 낱말·깨진 칸은 뺀다', () => {
  assert.deepEqual(ROWS.map((r) => r.w), ['pencil', 'rabbit', 'yellow', 'zebra'], '낱말 차례 · 깨진 칸(dog·cat)은 없음');
  const z = ROWS.find((r) => r.w === 'zebra');
  assert.deepEqual(z, { w: 'zebra', from: ['zebrra', 'zebbra'], n: 2, day: dayOfKey('2026-10-22'), s: 'The Zebra and the rabbit ran.' });
  assert.equal(ROWS.find((r) => r.w === 'pencil').s, 'My pencil is yellow.');
  assert.deepEqual(spellRows(null), []);
  const long = spellRows([{ date: '2026-10-01', fixed: `${'word '.repeat(60)}zebra.`, spell: [{ from: 'zebbra', to: 'zebra' }] }]);
  assert.deepEqual([long.length, long[0].s], [1, ''], '너무 긴 글이면 낱말은 남기고 문장 없이(글자 칸만)');
  const longer = spellRows([{ date: '2026-10-01', fixed: `${'word '.repeat(170)}zebra.`, spell: [{ from: 'zebbra', to: 'zebra' }] }]);
  assert.deepEqual([longer.length, longer[0] && longer[0].s], [1, ''], '낱말이 800자 뒤에 있어도 남는다 (🔍 Codex 161차 #4)');
  assert.deepEqual(spellRows([{ fixed: 'I SAW A ZEBRA', spell: [{ from: 'ZEBBRA', to: 'Zebra' }] }])[0].from, ['zebbra'], '대문자는 소문자로');
  // 받아 둔 낱말 고쳐 읽기
  assert.deepEqual(spellRowsOf(JSON.parse(JSON.stringify(ROWS))), ROWS);
  assert.deepEqual(spellRowsOf([{ w: 'Zebra', from: [] }, { w: 'zebra', from: ['x1', 'zebbra'], n: -3, day: 'a', s: 'no word here' }, null, { w: 'zebra', from: [] }]), [{ w: 'zebra', from: ['zebbra'], n: 1, day: 0, s: '' }], '깨진 줄 · 겹친 낱말 · 문장에 없으면 문장 없이');
});

test('🔤 빈칸 자리(blankOf)·견주기(normWord·spellJudge)·바뀐 글자(spellMarks)', () => {
  assert.deepEqual(blankOf('The Zebra ran.', 'zebra'), { before: 'The ', word: 'Zebra', after: ' ran.' });
  assert.equal(blankOf('I can catch it.', 'cat'), null, '다른 낱말 속은 안 찾는다');
  assert.deepEqual(blankOf("Don't go, don't!", "don't"), { before: '', word: "Don't", after: " go, don't!" });
  assert.deepEqual(blankOf('It’s here.', "it's"), { before: '', word: 'It’s', after: ' here.' });
  assert.deepEqual(blankParts('A zebra saw another Zebra.', 'zebra'), [{ text: 'A ' }, { blank: 'zebra' }, { text: ' saw another ' }, { blank: 'Zebra' }, { text: '.' }], '두 번이면 둘 다 빈칸 (🔍 Codex 161차 #2)');
  assert.equal(blankParts('I can catch it.', 'cat'), null);
  assert.equal(normWord('  Zebra! '), 'zebra');
  assert.equal(normWord('Don’t'), "don't");
  assert.deepEqual([spellJudge('', 'zebra').kind, spellJudge('  ', 'zebra').kind], ['empty', 'empty']);
  assert.equal(spellJudge('Zebra.', 'zebra').ok, true, '대소문자·끝 문장부호는 봐준다');
  assert.equal(spellJudge('zebbra', 'zebra').ok, false);
  assert.equal(spellJudge('ze bra', 'zebra').ok, false, '사이 빈칸은 틀림');
  const m = spellMarks('rabit', 'rabbit');
  assert.deepEqual(m.to.map((x) => (x.chg ? x.ch.toUpperCase() : x.ch)).join(''), 'rabBit', '빠진 글자 하나만 칠한다');
  assert.ok(m.from.every((x) => !x.chg));
  assert.deepEqual(spellMarks('yelow', 'yellow').to.filter((x) => x.chg).length, 1);
});

test('🔤 고르기(pickSpell): 노트에 남은 낱말 · 오늘 푼 것은 내일 · 안 푼 것 → 오래 안 푼 것 → 자주 틀린 것 · 셋까지 · 졸업은 빠지고 틀린 수가 늘면 다시', () => {
  assert.deepEqual(pickSpell(ROWS, {}, NOW).map((r) => r.w), ['zebra', 'pencil', 'rabbit'], '안 푼 것끼리는 자주 틀린 것(zebra 2번) 먼저, 그다음 낱말 차례');
  const st = {
    zebra: { box: 1, due: TODAY + 1, at: NOW - 1000, miss: 0, d0: TODAY }, // 오늘 풂 — 내일
    pencil: { box: 1, due: TODAY - 2, at: NOW - 3 * DAY, miss: 0, d0: TODAY - 3 },
    rabbit: { box: SPELL.done, due: TODAY - 1, at: NOW - 2 * DAY, miss: 0, d0: TODAY - 5 }, // 졸업
  };
  const seen = { rabbit: 1, zebra: 2, pencil: 1 }; // 마지막으로 풀 때 본 틀린 수 — rabbit은 그 뒤로 안 늘었다
  assert.deepEqual(pickSpell(ROWS, st, NOW, seen).map((r) => r.w), ['yellow', 'pencil'], '안 푼 yellow → 사흘 전 pencil · 졸업 rabbit·오늘 푼 zebra 빠짐');
  const old = { zebra: { box: 1, due: TODAY - 2, at: NOW - 3 * DAY, miss: 0, d0: TODAY - 3 } };
  assert.deepEqual(pickSpell(ROWS, old, NOW).map((r) => r.w), ['pencil', 'rabbit', 'yellow'], '자주 틀린 zebra라도 사흘 전에 풀었으면 안 푼 낱말 뒤로(돌아가며)');
  assert.equal(spellActive(ROWS.find((r) => r.w === 'rabbit'), st.rabbit, seen.rabbit), false);
  // 졸업 뒤 에세이에서 또 틀림 — 날짜가 졸업 전이어도(교정은 쓴 날 날짜로 늦게 붙는다) 틀린 수가 늘었으면 다시 (🔍 Codex 161차 #3)
  const again = ROWS.map((r) => (r.w === 'rabbit' ? { ...r, n: 2, day: TODAY - 9 } : r));
  assert.ok(pickSpell(again, st, NOW, seen).some((r) => r.w === 'rabbit'), '다시 노트에');
  assert.equal(pickSpell(ROWS, {}, NOW, {}, 2).length, 2);
  assert.equal(spellReady(ROWS, {}, {}, NOW), true);
  assert.equal(spellReady(ROWS, {}, { [TODAY]: 1 }, NOW), false, '오늘 쪽지를 끝냈으면');
  assert.equal(spellReady([], {}, {}, NOW), false, '낱말이 없으면');
  assert.equal(spellReady(ROWS.filter((r) => r.w === 'rabbit'), st, {}, NOW, seen), false, '졸업한 낱말뿐이면');
  assert.deepEqual(spellSeenOf({ zebra: 2, 'Bad Key': 3, rabbit: -1, pencil: '2' }), { zebra: 2, pencil: 2 });
  assert.deepEqual(mergeSpellSeen({ zebra: 2, rabbit: 1 }, { zebra: 1, pencil: 3 }), { zebra: 2, rabbit: 1, pencil: 3 });
});

test('🔤 자리: 그날 첫 쪽지 자리(8문장)부터 · 오늘 철자 쪽지를 끝냈으면 📝 문법 쪽지가 한 자리(15문장) 뒤로', () => {
  assert.deepEqual([spellSlot(7, true, 8), spellSlot(8, true, 8), spellSlot(30, true, 8), spellSlot(8, false, 8)], [false, true, true, false]);
  assert.deepEqual([grammarCount(8, false, 15), grammarCount(8, true, 15), grammarCount(23, true, 15), grammarCount(3, true, 15)], [8, 0, 8, 0]);
});

test('🔤 끝내기 규칙: 그날 처음 쪽지만 💰10 · 다른 날 두 번 연속 처음에 맞히면 졸업 · 같은 날 또 맞혀도 한 번 · 틀리면 처음부터 · 졸업 뒤 틀린 수가 늘면 처음부터', () => {
  const p = cloneProfile(emptyProfile());
  const a = spellFinishRule(p, [{ w: 'zebra', ok: true }, { w: 'rabbit', ok: false }, { w: 'zebra', ok: false }, { w: 'BAD WORD', ok: true }], NOW, ROWS);
  assert.deepEqual([a.ok, a.first, a.coins, a.grads], [true, true, SPELL.coins, []]);
  assert.deepEqual([p.coins, p.coinsEarned], [SPELL.coins, SPELL.coins]);
  assert.deepEqual([p.spell.zebra.box, p.spell.zebra.due, p.spell.rabbit.box, p.spell.rabbit.miss], [1, TODAY + 1, 0, 1], '같은 낱말 두 번이면 처음 것만');
  assert.deepEqual(p.spellSeen, { zebra: 2, rabbit: 1 }, '푼 낱말은 지금 틀린 수를 적는다');
  assert.equal(p.spellDay[TODAY], 1);
  const b = spellFinishRule(p, [{ w: 'zebra', ok: true }], NOW + 1000, ROWS);
  assert.deepEqual([b.first, b.coins, p.spell.zebra.box, p.coins], [false, 0, 1, SPELL.coins], '같은 날 또 맞혀도 칸은 한 번 · 💰도 한 번');
  const c = spellFinishRule(p, [{ w: 'zebra', ok: true }], NOW + DAY, ROWS);
  assert.deepEqual([c.first, c.coins, c.grads, p.spell.zebra.box], [true, SPELL.coins, ['zebra'], SPELL.done], '다음 날 또 맞히면 졸업');
  assert.equal(spellActive(ROWS.find((r) => r.w === 'zebra'), p.spell.zebra, p.spellSeen.zebra), false);
  // 졸업한 바로 그날 에세이에서 또 틀림(틀린 수 3) — 날짜는 같아도 다시 노트에, 처음부터 (🔍 Codex 161차 #3)
  const more = ROWS.map((r) => (r.w === 'zebra' ? { ...r, n: 3, day: TODAY + 1 } : r));
  assert.equal(spellActive(more.find((r) => r.w === 'zebra'), p.spell.zebra, p.spellSeen.zebra), true);
  const d = spellFinishRule(p, [{ w: 'zebra', ok: true }], NOW + 3 * DAY, more);
  assert.deepEqual([d.grads, p.spell.zebra.box, p.spellSeen.zebra], [[], 1, 3], '처음부터 다시 세기 · 본 틀린 수 3');
  spellFinishRule(p, [{ w: 'pencil', ok: true }], NOW + 4 * DAY, ROWS);
  spellFinishRule(p, [{ w: 'pencil', ok: false }], NOW + 5 * DAY, ROWS);
  assert.equal(p.spell.pencil.box, 0, '틀리면 처음부터');
  assert.deepEqual(spellFinishRule(p, [], NOW, ROWS), { ok: false, why: 'empty' });
  assert.deepEqual(spellFinishRule(p, [{ w: 'x y', ok: true }], NOW, ROWS), { ok: false, why: 'empty' });
});

test('🔤 시계가 꼬여도 (🔍 Codex 161차 #1): 앞날에 푼 기록이 남은 채 오늘 두 번 맞혀도 하루 만에 졸업하지 않는다 · 다음에 낼 날은 앞날 그대로', () => {
  const p = cloneProfile(emptyProfile());
  p.spell = { zebra: { box: 1, due: TODAY + 6, at: NOW + 5 * DAY, miss: 0, d0: TODAY } }; // 시계를 앞으로 돌렸던 날에 한 번 맞힘
  const a = spellFinishRule(p, [{ w: 'zebra', ok: true }], NOW, ROWS);
  const b = spellFinishRule(p, [{ w: 'zebra', ok: true }], NOW + 1000, ROWS);
  assert.deepEqual([a.grads, b.grads, p.spell.zebra.box, p.spell.zebra.due], [[], [], 1, TODAY + 6]);
  assert.equal(pickSpell(ROWS, p.spell, NOW).map((r) => r.w).includes('zebra'), false, '그날까지는 안 낸다');
});

test('🔤 끝 말(아이 화면 — 셈 없이) · 📤 english/spell.md(아빠만)', () => {
  assert.deepEqual(spellFinishText({ ok: true, first: true, coins: 10, grads: [] }), { title: '🔤 철자 쪽지 끝!', lines: ['💰 +10'] });
  assert.deepEqual(spellFinishText({ ok: true, first: false, coins: 0, grads: ['zebra', 'rabbit'] }).lines, ['오늘의 💰는 이미 받았어요 — 한 것은 기록에 들어갔어요', '⭐ zebra · rabbit — 이제 안 틀려요! 노트에서 졸업']);
  assert.equal(spellFinishText({ ok: false }).title, '저장이 안 됐어요');
  const md = spellMd(ROWS, { zebra: { box: 2, due: TODAY, at: NOW - DAY, miss: 1, d0: TODAY - 3 }, rabbit: { box: 1, due: TODAY, at: NOW - DAY, miss: 0, d0: TODAY - 1 } }, { [TODAY - 1]: 1 }, NOW, '2026-10-28', { zebra: 2, rabbit: 1 });
  assert.ok(md.startsWith('🔤 철자 노트 (2026-10-28) — 노트 낱말 3 · 졸업 1 · 최근 7일 쪽지 1일'), md);
  assert.ok(md.includes('- rabbit ← rabit · 에세이에서 틀린 수 1 · 연속 1/2 · 틀림 0') && md.includes('- yellow ← yelow · 에세이에서 틀린 수 1 · 아직 안 풂') && md.includes('## 졸업\n- zebra ← zebrra, zebbra'));
});

test('🔤 병합: 낱말마다 나중에 푼 쪽 · 쪽지 💰 받은 날은 큰 쪽(옛 백업이 그날 💰를 또 주지 않게)', () => {
  const a = { ...cloneProfile(emptyProfile()), id: 'me', updatedAt: 5, spell: { zebra: { box: 2, due: TODAY + 1, at: NOW, miss: 0, d0: TODAY - 1 } }, spellDay: { [TODAY]: 1 } };
  const b = { ...cloneProfile(emptyProfile()), id: 'me', updatedAt: 6, spell: { zebra: { box: 1, due: TODAY, at: NOW - DAY, miss: 0, d0: TODAY - 1 }, rabbit: { box: 0, due: TODAY + 1, at: NOW, miss: 1, d0: TODAY } }, spellDay: {} };
  const m = mergeStatRecord('profile', a, b);
  assert.deepEqual([m.spell.zebra.box, m.spell.rabbit.miss, m.spellDay[TODAY]], [2, 1, 1]);
  assert.equal(spellFinishRule(m, [{ w: 'rabbit', ok: true }], NOW + 1000, ROWS).coins, 0, '합친 뒤에도 그날 💰는 한 번');
  assert.deepEqual([emptyProfile().spell, emptyProfile().spellDay, emptyProfile().spellSeen], [{}, {}, {}]);
  const c = { ...a, spellSeen: { zebra: 2 } };
  const d = { ...b, spellSeen: { zebra: 1, rabbit: 1 } };
  assert.deepEqual(mergeStatRecord('profile', c, d).spellSeen, { zebra: 2, rabbit: 1 }, '본 틀린 수는 큰 쪽(옛 백업이 졸업한 낱말을 되살리지 않게)');
});

// ───────── ★ 저장 경로 (가짜 IndexedDB) ─────────
let initDone = false;
const stored = () => fakeIdb.get('profile', 'me');
async function seed(p) {
  if (!initDone) { await initProfile(); initDone = true; }
  await flushProfile();
  const cur = stored() || emptyProfile();
  fakeIdb.put('profile', { ...cur, ...p, id: 'me', updatedAt: (cur.updatedAt || 0) + 1 });
  await reloadProfile();
}

test('★ 🔤 저장 경로: 저장이 안 되면 없던 일 · 두 창이 같이 끝내도 💰10 한 번 · 메모리 프로필에도 바로', async () => {
  await seed({ coins: 0, coinsEarned: 0, spell: {}, spellDay: {} });
  fakeIdb.failNext('profile');
  assert.equal((await spellFinish([{ w: 'zebra', ok: true }], ROWS)).ok, false);
  assert.deepEqual([stored().coins, Object.keys(stored().spell || {}).length], [0, 0], '저장 실패 = 없던 일');
  const [x, y] = await Promise.all([spellFinish([{ w: 'zebra', ok: true }], ROWS), spellFinish([{ w: 'rabbit', ok: false }], ROWS)]);
  assert.ok(x.ok && y.ok);
  assert.deepEqual([x.coins + y.coins, stored().coins], [SPELL.coins, SPELL.coins], '💰10은 한 번');
  assert.deepEqual(Object.keys(spellMap()).sort(), ['rabbit', 'zebra']);
});

// ───────── 받기 · 창 (작은 가짜 DOM) ─────────
class El {
  constructor(tag) { this.tagName = tag.toUpperCase(); this.children = []; this.className = ''; this._text = ''; this.attrs = {}; this.listeners = {}; this.hidden = false; this.disabled = false; this.value = ''; }
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
globalThis.document = { getElementById: (id) => roots[id] || null, createElement: (t) => new El(t), createTextNode: (t) => ({ textContent: String(t), children: [] }) };
const all = (el, out = []) => { for (const c of el.children || []) { if (c instanceof El) { out.push(c); all(c, out); } } return out; };
const main = () => roots['spell-note-main'];
const text = () => main().textContent;
const press = (label) => { const b = all(main()).find((x) => x.tagName === 'BUTTON' && !x.disabled && x.textContent.includes(label)); assert.ok(b, `단추 「${label}」 — 화면: ${text().slice(0, 160)}`); b.fire('click'); };
const type = (v) => { const i = all(main()).find((x) => x.tagName === 'INPUT'); assert.ok(i, `칸 — 화면: ${text().slice(0, 160)}`); i.value = v; i.fire('input'); all(main()).find((x) => x.tagName === 'FORM').fire('submit'); };
function freshRoots() {
  roots['spell-note'] = new El('div');
  roots['spell-note'].hidden = true;
  roots['spell-note-main'] = new El('div');
}

test('🔤 받기(syncSpellRows): 비공개 교정에서 낱말을 받아 이 기기에 · 10분 안엔 다시 안 받음 · 빈 목록(열쇠·파일·인터넷 없음)이면 받아 둔 것 그대로 · 시간 넘으면 그대로', async () => {
  const { syncSpellRows, spellRowsNow, SYNC_MS } = await import('../js/spellnote.js');
  LS.clear();
  let t = NOW;
  const deps = (list, extra = {}) => ({ now: () => t, readList: async () => list, ...extra });
  assert.equal(await syncSpellRows(false, deps(FIX)), 4);
  assert.deepEqual(spellRowsNow(), ROWS);
  t += SYNC_MS - 1;
  assert.equal(await syncSpellRows(false, deps(FIX.slice(0, 1))), 4, '10분 안엔 안 받음(새 목록이 와도 그대로)');
  t += 2;
  assert.equal(await syncSpellRows(false, deps([])), 4, '빈 목록이면 받아 둔 것 그대로');
  assert.equal(await syncSpellRows(true, deps(FIX.slice(0, 1))), 1, 'force — 새 목록으로');
  assert.equal(await syncSpellRows(true, deps(FIX, { readList: () => new Promise(() => {}), listMs: 5 })), 1, '시간 넘으면 그대로');
  LS.set('shincoach.spellRows', '{깨짐');
  assert.deepEqual(spellRowsNow(), [], '깨진 저장은 빈 노트');
});

test('🔤 창: 문장 빈칸 → 쳐 넣기 → 맞으면 다음 · 틀리면 내가 쓴 것 ↔ 바른 철자 + 따라 쓰기(두 번 틀려도 넘어감) · 끝 → 저장(💰10) → [계속하기 ▶] → onDone · 접으면 아무것도 안 남음', async () => {
  const sn = await import('../js/spellnote.js');
  freshRoots();
  await seed({ coins: 0, coinsEarned: 0, spell: {}, spellDay: {} });
  const words = pickSpell(ROWS, {}, Date.now());
  let done = 0;
  let coinCalls = 0;
  assert.equal(sn.openSpellNote([], ROWS, {}), false, '낼 낱말이 없으면 안 연다');
  assert.equal(sn.openSpellNote(words, ROWS, { onDone: () => { done++; }, onCoins: () => { coinCalls++; } }), true);
  assert.equal(roots['spell-note'].hidden, false);
  assert.ok(text().includes('🔤 내 철자 쪽지') && text().includes('The ') && text().includes(' and the rabbit ran.') && !text().includes('Zebra'), `빈칸 문장 — ${text().slice(0, 120)}`);
  type('zebra');
  assert.ok(text().includes('✓ 맞아요! zebra'));
  press('다음 →');
  assert.ok(text().includes('My ') && text().includes(' is yellow.'), 'pencil 문장');
  type('pensil');
  assert.ok(text().includes('내가 쓴 것') && text().includes('pensil') && text().includes('바른 철자'), '나란히');
  type('pencel');
  assert.ok(text().includes('한 번 더'), '따라 쓰기 틀림');
  type('pencel');
  press('다음 →'); // 두 번 틀려도 넘어간다
  type('rabit');
  type('rabbit');
  assert.ok(text().includes('잘 따라 썼어요'));
  press('다 했어요 →');
  await settle();
  assert.ok(text().includes('🔤 철자 쪽지 끝!') && text().includes('💰 +10'), text().slice(0, 120));
  assert.equal(coinCalls, 1, '칩 바꾸기');
  assert.deepEqual([stored().coins, stored().spell.zebra.box, stored().spell.pencil.box, stored().spell.rabbit.miss], [10, 1, 0, 1], '처음 답으로 진도');
  press('계속하기 ▶');
  assert.deepEqual([done, roots['spell-note'].hidden, sn.isSpellNoteOpen()], [1, true, false]);
  // 답이 문장에 두 번 — 첫 답 전에 어디에도 안 보인다 (🔍 Codex 161차 #2)
  sn.openSpellNote([{ w: 'zebra', from: ['zebbra'], n: 1, day: 0, s: 'A zebra saw another zebra.' }], ROWS, {});
  assert.ok(text().includes('A ') && text().includes(' saw another ') && !/zebra/i.test(text().replace('🔤 내 철자 쪽지', '')), text().slice(0, 140));
  sn.closeSpellNote();
  // 접기 — 저장·onDone 없음
  sn.openSpellNote(words, ROWS, { onDone: () => { done++; } });
  type('zebbra');
  sn.closeSpellNote();
  await settle();
  assert.deepEqual([done, roots['spell-note'].hidden, stored().spell.zebra.miss], [1, true, 0]);
});

test('🔤 배선: player.js 자리·열기·닫기·받기 · 📤 english/spell.md · sw 새 파일·v356 · index.html 창 · 아이 화면 셈 없음 · 기기 자동 고침 끔', async () => {
  const p = read('js/player.js');
  const body = (head) => { const i = p.indexOf(head); assert.ok(i >= 0, head); return p.slice(i, p.indexOf('\n}\n', i)); };
  const mg = body('function maybeGrammar(todayDone) {');
  assert.ok(mg.includes('const spell = spellSlot(todayDone, spellReady(spellRowsNow(), spellMap(), days, now, spellSeenMap()), GRAMMAR_NOTE.first);'), '졸업은 본 틀린 수로 (Codex 161차 #3)');
  assert.ok(mg.includes('noteDue(grammarCount(todayDone, !!wordsToday(days, now), GRAMMAR_NOTE.every), track.todayGrammarNotes())'), '오늘 철자 쪽지를 했으면 문법은 한 자리 뒤');
  assert.ok(body('function startGrammar(continueFn) {').startsWith('function startGrammar(continueFn) {\n  if (state.spellPending) { startSpell(continueFn); return; }'));
  const ss = body('function startSpell(continueFn) {');
  assert.ok(ss.includes('setGrammarOpen(true);') && ss.includes("onCoins: () => { updateLevelChip(); pulseChip('coin-chip'); },") && ss.includes('if (!opened) { setGrammarOpen(false); go(); }'));
  assert.ok(p.includes('closeSpellNote(); // 🔤 철자 쪽지도 (v356)'), '영상을 닫으면 접는다');
  assert.ok(/if \(!state\.parentMode && settings\.grammarNote !== false\) syncSpellRows\(\)\.catch/.test(p), '영상을 열 때 낱말 받기(아빠 보기·⚙ 끔이면 안 받음)');
  const files = await gatherFiles({ getMath: async () => null, listDaily: async () => [], mathReportText: () => '', asksText: () => '', collectTodo: () => [], getSpell: async () => '🔤 철자 노트\n', today: '2026-10-28' });
  assert.ok(files.some((f) => f.path === 'english/spell.md' && f.text === '🔤 철자 노트\n'));
  assert.ok(read('js/upload.js').includes('getSpell: spellNow,'));
  const sw = read('sw.js');
  assert.ok(sw.includes("'./js/spell.js',") && sw.includes("'./js/spellnote.js',") && Number((/const CACHE_VERSION = 'v(\d+)';/.exec(sw) || [])[1]) >= 356);
  assert.ok(read('index.html').includes('<div id="spell-note" class="gnote" role="dialog" aria-modal="true" aria-label="철자 쪽지" hidden>'));
  const v = read('js/spellnote.js');
  assert.ok(!/\.innerHTML\s*=\s*[^'"]|insertAdjacentHTML/.test(v.replace(/innerHTML = ''/g, '')), '아이 글은 textContent로');
  assert.ok(v.includes("input.setAttribute('spellcheck', 'false');") && v.includes("input.setAttribute('autocorrect', 'off');"), '기기 자동 고침이 철자를 대신 고치지 않게');
  const kid = v + read('js/spell.js').slice(read('js/spell.js').indexOf('export function spellFinishText'), read('js/spell.js').indexOf('export function spellMd'));
  assert.ok(!/남은|남았|번째|몇 개|\$\{[^}]*\}\s*\/\s*\$\{/.test(kid), '셈 문구 없음');
  assert.ok(!/zebbra|ckicken|sity/.test(read('js/spell.js') + v), '진우 기록 낱말이 코드에 없다');
});
