// 🐾 v404 음악 포켓몬 50 (2026-11-09 아버님 「이대로」 — 기본안 EGq5MVTaHoizdPmxVTPzqb)
//   🎧 「다 쳤어요 ✋」 ♪ 다섯 칸마다 한 마리가 온다(잡기 없음) · 아직 안 만난 것 가운데 흔함 4 · 보통 3 · 희귀 2 · 전설 1의 무게 ·
//   다 만났으면 만난 아이가 또 · v402부터 찬 칸 몫은 음악 화면에 들어올 때 · 진화는 🔶 영어스톤 · 음악에서만(잡기·배틀 상대·5일장·대여행·기술 배우기·🎁에 안 나옴)
import { fakeIdb } from './fakeidb.js'; // ★ db.js·xp.js보다 먼저
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  MON_WEIGHT, MONS_AT_ONCE, NOTES_PER_MON, LISTEN_DAY, pickMusicMon, listenRule, monsDueRule, pianoOf, copyPiano, mergePiano, slotsOf,
  pianoDayLine, pianoMd, dayKeyOf,
} from '../js/piano.js';
import { ROSTER, LEGENDARY, FORMS, subjectOf, forSubject, forPuzzle, isMusicMon, isUnlocked } from '../js/pokemon.js';
import { RARITY_IDS, tradeCtx, initProfile, flushProfile, getProfileSnapshot, houseDo, pianoListen, pianoMonsDue } from '../js/xp.js';
import { MON_TYPES } from '../js/montypes.js';
import { pickOpponent, typeOf, MOVES } from '../js/battle.js';
import { EVO, stoneIdFor, STONE_ID } from '../js/evolve.js';
import { giftPoolOf } from '../js/grammar.js';
import { getDaily } from '../js/db.js';
import { loadToday, clockDay } from '../js/timelimit.js';

void fakeIdb;
const src = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const MUSIC = ROSTER.filter((r) => r.subject === 'music').map((r) => r.id);
const rankOf = (id) => Number(Object.entries(RARITY_IDS).find(([, v]) => v.includes(id))[0]);
const POOL = MUSIC.map((id) => ({ id, r: rankOf(id) }));
const SMALL = [{ id: 433, r: 1 }, { id: 358, r: 2 }, { id: 920, r: 3 }, { id: 891, r: 4 }];
const REQ = { song: 'ode', line: -1, hand: 'R', lv: 1, sp: 0.75 };
const T0 = new Date(2026, 10, 9, 18, 0).getTime();
const DAY = 86400000;

// ───────────────────── 명단 ─────────────────────

test('🎹 명단: 음악 50 — 흔함 20 · 보통 15 · 희귀 10 · 전설 5 · 다른 과목과 안 겹치는 가족 · 타입표 · Lv1 · 전설 목록 · 변신 다섯', () => {
  assert.equal(MUSIC.length, 50);
  assert.deepEqual([1, 2, 3, 4].map((r) => POOL.filter((m) => m.r === r).length), [20, 15, 10, 5]);
  for (const id of MUSIC) {
    assert.equal(subjectOf(id), 'music', `과목 ${id}`);
    assert.equal(isMusicMon(id), true);
    assert.ok(Array.isArray(MON_TYPES[id]), `타입표 ${id}`);
    assert.ok(MOVES[typeOf(id)], `기술 타입 ${id}`);
    assert.equal(isUnlocked(id, 1), true, `Lv1 ${id}`);
    assert.equal(stoneIdFor(subjectOf(id)), STONE_ID.english, `🔶 영어스톤 ${id} (기본안 ③)`);
  }
  assert.equal(isMusicMon(25), false);
  assert.equal(isMusicMon('433'), true, '글자 id도');
  for (const id of [891, 892, 898, 1017, 1024]) assert.ok(LEGENDARY.includes(id), `원작 전설 ${id} — 🥚 알 목표에서 빠진다`);
  // 진화는 음악 가족 안에서만 16쌍
  const links = Object.entries(EVO).flatMap(([f, list]) => list.map((e) => [Number(f), e.to]));
  const mus = links.filter(([f, t]) => isMusicMon(f) || isMusicMon(t));
  assert.equal(mus.length, 16);
  for (const [f, t] of mus) assert.ok(isMusicMon(f) && isMusicMon(t), `${f}→${t}는 음악 가족 안`);
  assert.equal(EVO[891][0].orig, '악의 족자나 물의 족자를 보고', '치고마 원작 조건 — PokeAPI 아이템 한국어명');
  // 변신 — PokeAPI 실측(.context/v404/forms50.mjs)
  assert.deepEqual([FORMS[358], FORMS[531], FORMS[844], FORMS[870], FORMS[892]], [{ mega: 10306 }, { mega: 10069 }, { gmax: 10218 }, { mega: 10303 }, { gmax: 10226 }]);
});

test('🎹 게이트: 다른 과목 잡기 후보·퍼즐·⚔️ 배틀 상대·🤝 5일장·📝 🎁·🎒 대여행·기술 배우기에서 빠진다 · 🎒 도감에 🎹', () => {
  const all = ROSTER.map((r) => ({ id: r.id }));
  for (const s of ['english', 'math', 'korean', 'nonsul', 'letter']) assert.ok(!forSubject(all, s).some((c) => isMusicMon(c.id)), `잡기 후보 ${s}`);
  assert.equal(forSubject(all, 'music').length, 50);
  assert.ok(!forPuzzle(all, () => false).some((c) => isMusicMon(c.id)), '못 만난 음악 포켓몬은 퍼즐에 안 놀러 온다');
  assert.ok(forPuzzle(all, (id) => id === 433).some((c) => c.id === 433), '만나면 놀러 온다');
  assert.equal(pickOpponent(MUSIC.map((id) => ({ id })), {}, () => 0.5), null, '음악 포켓몬만 남으면 상대가 없다');
  for (let i = 0; i < 200; i += 1) {
    const o = pickOpponent([...MUSIC, 25, 133].map((id) => ({ id })), {}, () => i / 200);
    assert.ok(o && !isMusicMon(o.id), `배틀 상대 ${o && o.id}`);
  }
  const ctx = tradeCtx({ xp: 0, caught: {} });
  for (const id of MUSIC) assert.equal(ctx.allowed(id), false, `교환 ${id}`);
  assert.ok(!giftPoolOf(ROSTER, subjectOf, LEGENDARY, () => true).some(isMusicMon), '📝 🎁 깜짝 포켓몬은 영어 포켓몬만');
  for (const f of ['js/journeyview.js', 'js/moveview.js']) assert.match(src(f), /const ok = \(id\) => [^\n]*!isMusicMon\(id\)/, `${f} 후보`);
  assert.match(src('js/pokedex.js'), /subjectOf\(m\.id\) === 'music'\) cell\.appendChild\(el\('div', 'subj', '🎹'\)\)/);
  assert.match(src('js/pokedex.js'), /🎹 음악에서 만나요 \$\{got\(mu\)\}\/\$\{mu\.length\}/);
  assert.match(src('js/shop.js'), /music: ' · 🎹 음악 ♪ 칸에서 와요'/);
});

// ───────────────────── 고르기 (순수) ─────────────────────

test('🐾 고르기 — 안 만난 것 가운데 무게 흔함 4 · 보통 3 · 희귀 2 · 전설 1 · 다 만났으면 모두 가운데 · 깨진 후보는 뺀다', () => {
  assert.deepEqual(MON_WEIGHT, { 1: 4, 2: 3, 3: 2, 4: 1 });
  const at = (x) => pickMusicMon(SMALL, {}, () => x);
  assert.deepEqual([0, 0.399, 0.4, 0.699, 0.7, 0.899, 0.9, 0.99999].map(at), [433, 433, 358, 358, 920, 920, 891, 891], '무게 4·3·2·1 = 0.4 · 0.3 · 0.2 · 0.1');
  assert.deepEqual([at(-1), at(7), at(NaN)], [433, 891, 433], 'rng가 범위 밖이어도');
  assert.equal(pickMusicMon(SMALL, { 433: 1, 358: 2, 920: 1 }, () => 0), 891, '안 만난 것이 하나면 그것');
  assert.equal(pickMusicMon(SMALL, { 433: 1, 358: 1, 920: 1, 891: 1 }, () => 0.95), 891, '다 만났으면 모두 가운데 무게대로');
  for (const bad of [null, [], [null, { id: 'x', r: 1 }, { id: 5, r: 9 }, { id: -3, r: 1 }], [{ id: 'x', r: 1 }, { id: -3, r: 1 }, { id: 2.5, r: 2 }]]) assert.equal(pickMusicMon(bad, {}, () => 0.5), 0, JSON.stringify(bad));
  // 진짜 명단으로 — 첫 마리가 전설일 몫은 5/150 = 30분의 1 (기본안)
  const N = 1500;
  let legend = 0;
  for (let i = 0; i < N; i += 1) if (rankOf(pickMusicMon(POOL, {}, () => (i + 0.5) / N)) === 4) legend += 1;
  assert.equal(legend, N / 30);
});

// ───────────────────── 오는 규칙 (순수) ─────────────────────

test('🐾 「다 쳤어요」 다섯째 칸 — 한 마리가 와서 도감에 · 받은 수 +1 · 연습 기록에 온 줄 · 칸은 다시 0부터 · 여섯째는 그냥 칸', () => {
  const p = { caught: { 25: 1 }, piano: { notes: 4, days: {} } };
  const r = listenRule(p, REQ, T0, SMALL, () => 0);
  assert.equal(r.ok, true);
  assert.deepEqual([r.counted, r.notes, r.mons, r.got], [true, 5, 1, [433]]);
  assert.deepEqual(p.caught, { 25: 1, 433: 1 }, '다른 칸은 그대로');
  assert.equal(p.piano.mons, 1);
  assert.deepEqual(p.piano.log.filter((x) => x.m === 'p').map((x) => [x.at, x.s]), [[T0, '433']]);
  assert.deepEqual(slotsOf(5, 1), { filled: 0, sets: 1 }, '온 뒤엔 다시 0부터');
  assert.deepEqual(slotsOf(5, 0), { filled: 5, sets: 1 }, '아직 안 왔으면 가득');
  assert.deepEqual(slotsOf(5), { filled: 5, sets: 1 }, 'mons 없이 부르면 v402 그대로');
  const r2 = listenRule(p, REQ, T0 + 1000, SMALL, () => 0);
  assert.deepEqual([r2.notes, r2.mons, r2.got], [6, 1, []]);
  assert.equal(slotsOf(r2.notes, r2.mons).filled, 1);
  assert.equal(listenRule(p, REQ, T0 + 2000, SMALL, () => 0).got.length, 0);
  const capped = listenRule(p, REQ, T0 + 3000, SMALL, () => 0);
  assert.deepEqual([capped.counted, capped.why, capped.notes], [false, 'cap', 7], `오늘 ${LISTEN_DAY}칸 뒤엔 칸이 안 찬다`);
});

test('🐾 몫 — 후보가 없으면 몫은 남고 · 들어올 때 받는다 · 한 번에 다섯까지 · 다 만났으면 또 · 시계가 뒤로면 안 셈 · 깨진 기록', () => {
  const p = { caught: {}, piano: { notes: 4, days: {} } };
  const r = listenRule(p, REQ, T0, [], () => 0);
  assert.deepEqual([r.notes, r.mons, r.got], [5, 0, []], '후보가 없으면 아무것도 안 준다');
  const due = monsDueRule(p, T0 + 1, SMALL, () => 0.5);
  assert.deepEqual([due.ok, due.got, due.mons], [true, [358], 1]);
  assert.deepEqual(monsDueRule(p, T0 + 2, SMALL, () => 0.5).got, [], '두 번 받지 않는다');
  // v402·v403 때 찬 칸 40 = 묶음 8 → 다섯, 그다음 셋
  const old = { caught: {}, piano: { notes: 40, days: {} } };
  assert.equal(MONS_AT_ONCE, 5);
  assert.equal(monsDueRule(old, T0, POOL, () => 0.3).got.length, 5);
  assert.equal(monsDueRule(old, T0, POOL, () => 0.3).got.length, 3);
  const before = JSON.stringify(old);
  assert.deepEqual(monsDueRule(old, T0, POOL, () => 0.3).got, []);
  assert.equal(JSON.stringify(old), before, '받을 몫이 없으면 프로필을 안 건드린다');
  assert.equal(Object.keys(old.caught).length, 8, '안 만난 것부터 — 여덟 마리가 모두 다르다');
  const raw = { notes: 3, days: {}, extra: 1 };
  const quiet = { caught: {}, piano: raw };
  monsDueRule(quiet, T0, POOL, () => 0.3);
  assert.equal(quiet.piano, raw, '몫이 없으면 저장된 기록을 고쳐 쓰지 않는다(들어올 때마다 쓰지 않게)');
  // 다 만났으면 만난 아이가 또
  const full = { caught: Object.fromEntries(SMALL.map((m) => [m.id, 1])), piano: { notes: 9, mons: 1, days: {} } };
  const again = listenRule(full, REQ, T0, SMALL, () => 0);
  assert.deepEqual([again.got, again.firsts], [[433], [false]]);
  assert.equal(full.caught[433], 2, '그 포켓몬 수가 하나 는다');
  // 마지막 새 아이와 또 온 아이가 한꺼번에 — 처음 만났는지는 올 때마다 (Codex 209차 P3)
  const last = { caught: { 433: 1, 358: 1, 920: 1 }, piano: { notes: 10, days: {} } };
  const two = monsDueRule(last, T0, SMALL, () => 0.95);
  assert.deepEqual([two.got, two.firsts], [[891, 891], [true, false]], '같은 아이가 두 번 와도 첫째만 처음');
  assert.deepEqual(listenRule({ caught: {}, piano: { notes: 4, days: {} } }, REQ, T0, SMALL, () => 0).firsts, [true]);
  // 시계가 뒤로 — 칸도 포켓몬도 없음
  const back = { caught: {}, piano: { notes: 4, days: { [dayKeyOf(T0 + 5 * DAY)]: { paid: 0, coins: 0, notes: 1 } } } };
  const b = listenRule(back, REQ, T0, SMALL, () => 0);
  assert.deepEqual([b.ok, b.why, Object.keys(back.caught).length], [false, 'clock', 0]);
  // 깨진 요청
  assert.equal(listenRule({ caught: {} }, { ...REQ, hand: 'X' }, T0, SMALL, () => 0).ok, false);
});

test('🐾 저장·병합 — 받은 수는 줄지 않는 쪽 · 묶음 수보다 클 수 없다 · 옛 기록(받은 수 없음)은 0 · 온 줄도 고쳐 읽는다', () => {
  assert.equal(pianoOf({ notes: 12 }).mons, 0, 'v402·v403 기록');
  assert.equal(pianoOf({ notes: 12, mons: 9 }).mons, 2, '묶음 수(2)보다 클 수 없다');
  assert.equal(pianoOf({ notes: 12, mons: -1 }).mons, 0);
  assert.equal(copyPiano({ notes: 10, mons: 2 }).mons, 2);
  assert.equal(mergePiano({ notes: 10, mons: 2 }, { notes: 15, mons: 1 }).mons, 2, '옛 백업이 받은 수를 줄이면 같은 몫이 또 온다');
  assert.equal(mergePiano({ notes: 10, mons: 2 }, { notes: 15, mons: 3 }).mons, 3);
  const log = pianoOf({ notes: 5, mons: 1, log: [{ at: T0, m: 'p', s: '433' }, { at: T0, m: 'p', s: 'x' }, { at: T0, m: 'q', s: '1' }] }).log;
  assert.deepEqual(log.map((x) => [x.m, x.s]), [['p', '433']], '번호가 아닌 온 줄 · 모르는 줄은 뺀다');
});

test('🐾 📤 — 하루 한 줄에 온 수 · music.md에 온 포켓몬 이름과 아직 안 온 몫', () => {
  assert.match(pianoDayLine({ pnListenN: 1, pnNotes: 1, pnMons: 1 }), /🐾 음악 포켓몬 1마리 옴/);
  assert.equal(pianoDayLine({ pnMons: 2 }), '🐾 음악 포켓몬 2마리 옴', '연습 없이 밀린 포켓몬만 받은 날도 (Codex 209차 P3)');
  assert.equal(pianoDayLine({}), '');
  assert.doesNotMatch(pianoDayLine({ pnListenN: 1, pnNotes: 1 }), /음악 포켓몬/);
  const md = pianoMd({ notes: 10, mons: 1, log: [{ at: T0, m: 'p', s: '433' }] }, '2026-11-09', (s) => s, null, (id) => (id === 433 ? '랑딸랑' : '?'));
  assert.match(md, /🐾 음악 포켓몬이 옴 — 랑딸랑/);
  assert.match(md, /온 음악 포켓몬 1 · 아직 안 온 몫 1 — 음악 화면에 들어오면 옴/);
  assert.match(pianoMd({ notes: 5, mons: 1 }, '2026-11-09'), /온 음악 포켓몬 1\)/, '다 왔으면 몫 말이 없다');
});

// ───────────────────── 화면 — 가짜 화면으로 pianoview.js를 직접 ─────────────────────

const all = [];
class El {
  constructor(tag) {
    this.tagName = String(tag).toUpperCase();
    this.children = []; this.parent = null; this.on = {}; this.attrs = {}; this.style = {};
    this.hidden = false; this._text = ''; this._html = ''; this.className = ''; this.id = ''; this.value = ''; this.src = '';
    all.push(this);
  }
  get textContent() { return this._text + this.children.map((c) => c.textContent).join(''); }
  set textContent(v) { for (const c of this.children) c.parent = null; this.children = []; this._text = String(v); }
  get innerHTML() { return this._html; }
  set innerHTML(v) { this.textContent = ''; this._html = String(v); }
  appendChild(c) { c.parent = this; this.children.push(c); return c; }
  remove() { if (this.parent) { this.parent.children = this.parent.children.filter((c) => c !== this); this.parent = null; } }
  addEventListener(t, f) { (this.on[t] ||= []).push(f); }
  click() { for (const f of this.on.click || []) f({ offsetX: 10, offsetY: 10 }); }
  focus() {}
  setAttribute(k, v) { this.attrs[k] = String(v); }
  getAttribute(k) { return k in this.attrs ? this.attrs[k] : null; }
  getContext() { return new Proxy({}, { get: (o, k) => (k in o ? o[k] : k === 'createLinearGradient' ? () => ({ addColorStop() {} }) : () => {}), set: (o, k, v) => { o[k] = v; return true; } }); }
  getBoundingClientRect() { return { top: 80, left: 0, width: 1000, height: 600 }; }
  get clientWidth() { return 1000; }
  setPointerCapture() {}
}
const ROOT = new El('html');
const VIEW = new El('section');
VIEW.id = 'view-music';
ROOT.appendChild(VIEW);
for (const id of ['music-main', 'btn-music-back']) { const e = new El('div'); e.id = id; VIEW.appendChild(e); }
const attached = (e) => { for (let x = e; x; x = x.parent) if (x === ROOT) return true; return false; };
const byId = (id) => { for (let i = all.length - 1; i >= 0; i -= 1) if (all[i].id === id && attached(all[i])) return all[i]; return null; };
function button(text) {
  for (let i = all.length - 1; i >= 0; i -= 1) if (all[i].tagName === 'BUTTON' && all[i].textContent.trim() === text && attached(all[i])) return all[i];
  throw new Error(`단추 없음: ${text}`);
}
globalThis.document = { hidden: false, documentElement: ROOT, getElementById: byId, createElement: (t) => new El(t), addEventListener() {}, querySelectorAll: () => [] };
class Param { constructor(v = 1) { this.value = v; } setValueAtTime() {} exponentialRampToValueAtTime() {} setTargetAtTime() {} cancelScheduledValues() {} }
class FakeAC {
  constructor() { this.currentTime = 0; this.state = 'running'; this.destination = {}; }
  createGain() { return { gain: new Param(1), connect() {}, disconnect() {} }; }
  createDynamicsCompressor() { return { connect() {} }; }
  createOscillator() { return { type: '', frequency: new Param(440), connect() {}, start() {}, stop() {}, onended: null }; }
  resume() { return Promise.resolve(); }
}
globalThis.window = { addEventListener() {}, innerHeight: 800, devicePixelRatio: 1, AudioContext: FakeAC };
globalThis.requestAnimationFrame = () => 1;
globalThis.cancelAnimationFrame = () => {};
globalThis.fetch = () => Promise.reject(new Error('시험에선 그림을 안 받는다'));
Object.defineProperty(globalThis, 'navigator', { value: { wakeLock: { request: () => Promise.reject(new Error('없음')) } }, configurable: true });
const store = new Map();
globalThis.localStorage = { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => { store.set(k, String(v)); }, removeItem: (k) => { store.delete(k); } };
store.set('shincoach.pianoSongsAt', String(Date.now()));
const settle = (ms = 20) => new Promise((r) => setTimeout(r, ms));
async function waitFor(cond, what, ms = 4000) {
  const t0 = Date.now();
  while (!cond()) {
    if (Date.now() - t0 > ms) throw new Error(`기다림 넘침: ${what}`);
    await settle(10);
  }
}
/** 저장된 음악 기록을 바로 바꾼다 (시험용 — 같은 트랜잭션 길) */
const setPiano = (piano) => houseDo((p) => { p.piano = piano; return { ok: true }; });
const arriveText = () => (byId('pn-arrive') ? byId('pn-arrive').textContent : '');
let P;
let PV;

before(async () => {
  console.warn = () => {};
  await initProfile();
  await loadToday();
  await setPiano({ notes: 5, days: {} }); // v402·v403 때 다섯 칸이 찼고 아직 안 온 몫 하나
  PV = await import('../js/pianoview.js');
  PV.initMusic({ showView: () => {} });
  await PV.enterMusic();
  P = globalThis.window.__piano;
});

test('화면 — 들어오면 밀린 몫이 「새 음악 포켓몬이 왔어요!」로 · 도감에 들어감 · 「좋아요!」로 닫힘 · 하루 칸 pnMons', async () => {
  await waitFor(() => byId('pn-arrive'), '들어올 때 온 창');
  const caught = getProfileSnapshot().caught;
  const got = MUSIC.filter((id) => caught[id] > 0);
  assert.equal(got.length, 1, '한 마리');
  const name = ROSTER.find((r) => r.id === got[0]).ko;
  assert.match(arriveText(), /🎵 새 음악 포켓몬이 왔어요!/);
  assert.ok(arriveText().includes(name), `이름 ${name}`);
  assert.match(arriveText(), /도감에 들어갔어요/);
  assert.doesNotMatch(arriveText(), /\d+\s*\/\s*50|남은|마리 남/, '아이 화면엔 몇 마리 남았는지 없음');
  assert.equal(byId('pn-arrive').parent, VIEW, '창은 음악 화면 안(곡 목록·무대를 다시 그려도 안 지워진다)');
  button('좋아요!').click();
  assert.equal(byId('pn-arrive'), null);
  await settle(30);
  assert.equal(Number(((await getDaily(clockDay())) || {}).pnMons), 1, '📤 하루 칸');
  // 다시 들어와도 또 오지 않는다
  await PV.enterMusic();
  await settle(60);
  assert.equal(byId('pn-arrive'), null);
});

test('화면 — 듣고 따라 치기 다섯째 「다 쳤어요」 → 그 자리에서 온 창 · ♪ 칸은 0부터 · 둘이 밀렸으면 차례로', async () => {
  await setPiano({ notes: 9, mons: 1, days: {} });
  P.openSong('ode');
  button('🎧 듣고 따라 치기').click();
  button('1줄').click();
  byId('pn-go').click();
  P.advance(100);
  byId('pn-done').click();
  await waitFor(() => byId('pn-arrive'), '다섯째 칸 창');
  assert.match(arriveText(), /음악 포켓몬이/);
  assert.equal(P.S.saving, false);
  assert.equal((byId('pn-slots').innerHTML.match(/class="on"/g) || []).length, 0, '온 뒤 ♪ 칸은 비었다');
  button('좋아요!').click();
  assert.equal(byId('pn-arrive'), null);
  // 둘이 밀렸을 때 — 하나 닫으면 다음
  await setPiano({ notes: 20, mons: 2, days: {} });
  await PV.enterMusic();
  await waitFor(() => byId('pn-arrive'), '첫째');
  const first = arriveText();
  button('좋아요!').click();
  assert.ok(byId('pn-arrive'), '둘째가 이어서');
  assert.notEqual(arriveText(), first);
  button('좋아요!').click();
  assert.equal(byId('pn-arrive'), null);
  await flushProfile();
  assert.equal(pianoOf(getProfileSnapshot().piano).mons, 4);
  // 창이 떠 있는 동안 또 오면 — 떠 있는 창을 건너뛰지 않고 뒤에 선다
  await setPiano({ notes: 25, mons: 4, days: {} });
  await PV.enterMusic();
  await waitFor(() => byId('pn-arrive'), '하나 뜬 창');
  const shown = arriveText();
  await setPiano({ notes: 30, mons: 5, days: {} });
  await PV.enterMusic();
  await settle(80);
  assert.equal(arriveText(), shown, '먼저 뜬 창 그대로');
  button('좋아요!').click();
  assert.ok(byId('pn-arrive'), '그다음 것이 이어서');
  button('좋아요!').click();
  assert.equal(byId('pn-arrive'), null);
  // 저장하는 사이 줄을 바꿔도 — 새 화면의 ♪ 칸이 저장된 기록대로(포켓몬이 왔으면 0) (Codex 209차 P3)
  await setPiano({ notes: 29, mons: 5, days: {} });
  button('1줄').click();
  byId('pn-go').click();
  P.advance(100);
  byId('pn-done').click();
  button('2줄').click(); // 저장이 끝나기 전에 — 판이 바뀐다
  assert.equal((byId('pn-slots').innerHTML.match(/class="on"/g) || []).length, 4, '저장 전엔 넷');
  await waitFor(() => !P.S.saving && byId('pn-arrive'), '바꾼 줄에서 온 창');
  assert.equal((byId('pn-slots').innerHTML.match(/class="on"/g) || []).length, 0, '저장된 뒤엔 0');
  button('좋아요!').click();
  // 50마리를 다 만난 뒤 — 만난 아이가 「또 놀러 왔어요」 (기본안 ④)
  await houseDo((p) => { for (const id of MUSIC) p.caught[id] = Math.max(1, Number(p.caught[id]) || 0); p.piano = { notes: 40, mons: 7, days: {} }; return { ok: true }; });
  await PV.enterMusic();
  await waitFor(() => byId('pn-arrive'), '또 온 창');
  assert.match(arriveText(), /🎵 음악 포켓몬이 또 놀러 왔어요!/);
  assert.match(arriveText(), /도감에 한 마리 더/);
  button('좋아요!').click();
  // 마지막 새 아이(랑딸랑)와 또 온 아이가 한꺼번에 — 첫 창은 「새」, 둘째는 「또」 (rng 0 → 둘 다 랑딸랑 · Codex 209차 P3)
  await houseDo((p) => { p.caught[433] = 0; p.piano = { notes: 50, mons: 8, days: {} }; return { ok: true }; });
  const realRandom = Math.random;
  Math.random = () => 0;
  try {
    await PV.enterMusic();
    await waitFor(() => byId('pn-arrive'), '마지막 새 아이 창');
  } finally { Math.random = realRandom; }
  assert.match(arriveText(), /🎵 새 음악 포켓몬이 왔어요!랑딸랑/);
  button('좋아요!').click();
  assert.match(arriveText(), /🎵 음악 포켓몬이 또 놀러 왔어요!랑딸랑/);
  button('좋아요!').click();
  assert.equal(byId('pn-arrive'), null);
});

test('xp — pianoListen·pianoMonsDue는 저장된 프로필로 한 트랜잭션에서 · 후보는 음악 50만', async () => {
  await setPiano({ notes: 4, days: {} });
  const r = await pianoListen({ ...REQ, line: 0 });
  assert.equal(r.ok, true);
  assert.equal(r.got.length, 1);
  assert.ok(isMusicMon(r.got[0]), `음악 포켓몬 ${r.got[0]}`);
  assert.ok(getProfileSnapshot().caught[r.got[0]] >= 1, '메모리 프로필에도');
  await setPiano({ notes: 15, mons: 1, days: {} });
  const d = await pianoMonsDue();
  assert.equal(d.got.length, 2);
  assert.ok(d.got.every(isMusicMon));
  assert.equal((await pianoMonsDue()).got.length, 0);
  assert.ok(NOTES_PER_MON === 5);
  // 등급 무게가 xp까지 이어지나 — 아무도 안 만났을 때 rng 0.97 = 무게 150 가운데 145.5 → 첫 전설(명단 차례 891)
  //   (등급이 모두 같으면 200 가운데 194 → 49째 · 등급을 안 넘기면 여기서 갈린다)
  await houseDo((p) => { for (const id of MUSIC) delete p.caught[id]; p.piano = { notes: 4, days: {} }; return { ok: true }; });
  const realRandom = Math.random;
  Math.random = () => 0.97;
  try {
    const w = await pianoListen({ ...REQ, line: 0 });
    assert.deepEqual(w.got, [891]);
  } finally { Math.random = realRandom; }
});
