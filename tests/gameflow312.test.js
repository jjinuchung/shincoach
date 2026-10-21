// 🎮 게임기 흐름 — 🤼 「누구랑?」에서 그만두면 판을 돌려주는 길을 **진짜로** 돌린다 (🔍 Codex 118차 #2 · v312) — node --test tests/gameflow312.test.js
// 가짜 저장소(fakeidb) + 가짜 화면으로 gameview.openGames → 카드 → 판 쓰기(claimDailyCount) → runTug → ✕ → giveBack(releaseDailyCount)
// minigame312의 출처 검사가 "그 줄이 있다"만 보던 것을 — 판 수가 실제로 몇 번 돌아오는지 · 💗·최고 기록·방 장면 기록(sum)이 어떻게 남는지로
import { fakeIdb } from './fakeidb.js'; // ★ db.js·xp.js보다 먼저
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { getDaily, emptyDaily } from '../js/db.js';
import { loadToday, clockDay } from '../js/timelimit.js';
import { initProfile, houseDo, gameBest } from '../js/xp.js';
import { LOOK_BASE } from '../js/avatar.js';
import { openGames, closeGames } from '../js/gameview.js';

// ───────────────────── 가짜 화면 (gameview·gametug가 쓰는 만큼) ─────────────────────

class FakeEl {
  constructor(tag) { this.tagName = String(tag).toUpperCase(); this.className = ''; this.children = []; this.listeners = {}; this.style = { setProperty(k, v) { this[k] = v; } }; this.attrs = {}; this.own = ''; this.html = ''; this.hidden = false; this.disabled = false; }
  get textContent() { return this.own + this.children.map((c) => c.textContent).join(''); }
  set textContent(v) { this.own = String(v); this.children = []; }
  get classList() {
    const list = () => this.className.split(/\s+/).filter(Boolean);
    const set = (a) => { this.className = a.join(' '); };
    return {
      add: (...c) => set([...new Set([...list(), ...c])]),
      remove: (...c) => set(list().filter((x) => !c.includes(x))),
      toggle: (c, on) => { const want = on === undefined ? !list().includes(c) : !!on; set(want ? [...new Set([...list(), c])] : list().filter((x) => x !== c)); return want; },
      contains: (c) => list().includes(c),
    };
  }
  set innerHTML(v) { this.html = String(v); this.children = []; this.own = ''; }
  get innerHTML() { return this.html; }
  get offsetWidth() { return 100; }
  get isConnected() { return true; }
  appendChild(c) { this.children.push(c); c.parent = this; return c; }
  append(...cs) { for (const c of cs) this.appendChild(c); }
  setAttribute(k, v) { this.attrs[k] = v; }
  addEventListener(type, f) { (this.listeners[type] ||= []).push(f); }
  fire(type, extra = {}) { for (const f of [...(this.listeners[type] || [])]) f({ preventDefault() {}, detail: 1, ...extra }); }
  getBoundingClientRect() { return { left: 0, top: 0, width: 100, height: 50 }; }
  remove() { if (this.parent) this.parent.children = this.parent.children.filter((x) => x !== this); }
  /** '.a' · '.a.b'만 (그 밖의 꼴은 못 찾은 것으로) */
  matches(sel) {
    if (!/^(\.[\w-]+)+$/.test(sel)) return false;
    const have = this.className.split(/\s+/);
    return sel.split('.').filter(Boolean).every((c) => have.includes(c));
  }
  querySelectorAll(sel) {
    const out = [];
    const walk = (e) => { for (const c of e.children) { if (c.matches(sel)) out.push(c); walk(c); } };
    walk(this);
    return out;
  }
  querySelector(sel) { return this.querySelectorAll(sel)[0] || null; }
}

// #game — gameview.ensureBox가 innerHTML로 만드는 모양을 미리 (가짜 화면은 HTML을 안 읽는다)
const box = new FakeEl('div');
box.className = 'gm';
const cardEl = box.appendChild(new FakeEl('div'));
cardEl.className = 'gm-card';
const head = cardEl.appendChild(new FakeEl('div'));
head.className = 'gm-head';
const xBtn = head.appendChild(new FakeEl('button'));
xBtn.className = 'btn btn-icon gm-x';
const gmBody = cardEl.appendChild(new FakeEl('div'));
gmBody.className = 'gm-body';
globalThis.document = {
  hidden: false, activeElement: null, listeners: {},
  createElement: (tag) => new FakeEl(tag),
  getElementById: (id) => (id === 'game' ? box : null),
  body: new FakeEl('body'),
  addEventListener(type, f) { (this.listeners[type] ||= []).push(f); },
  removeEventListener(type, f) { this.listeners[type] = (this.listeners[type] || []).filter((x) => x !== f); },
};
globalThis.fetch = async () => { throw new Error('offline (시험)'); }; // 나옹 그림을 받으러 나가지 않게 — 받기는 2.5초 안에 실패로

const MIN = 60;
const CTX = { roomId: 'r1', u: 41, hero: { html: '<img class="gd-pal-img">' } };
const tick = () => new Promise((r) => setTimeout(r, 5));
async function until(cond, ms = 4000, what = '') {
  const t0 = Date.now();
  while (!cond()) {
    if (Date.now() - t0 > ms) throw new Error(`기다리다 끝남: ${what}`);
    await tick();
  }
}
const card = (name) => gmBody.querySelectorAll('.gm-game').find((c) => c.querySelector('.gm-game-name').textContent === name);
const plays = () => fakeIdb.get('daily', clockDay()).gamePlays;
async function day({ used = 0 } = {}) {
  await loadToday();
  fakeIdb.put('daily', { ...emptyDaily(clockDay()), mathTime: 45 * MIN, enTime: 45 * MIN, gamePlays: used });
  await loadToday();
}
/** 줄다리기 카드 → 「누구랑?」까지 (판은 여기서 이미 쓴 것) */
async function toChooser() {
  card('아빠랑 줄다리기').fire('click');
  await until(() => gmBody.querySelector('.gu-pick'), 6000, '누구랑?');
}

before(async () => {
  await getDaily('2000-01-01'); // 저장소 열기
  await initProfile();
  const r = await houseDo((p) => {
    p.items = { ...(p.items || {}), f_game: 1 };
    p.house = { started: true, seq: 60, rooms: [{ id: 'r1', wall: '', floor: '', items: [{ u: 41, id: 'f_game', x: 3, y: 2 }] }] };
    p.avatar = { made: true, gifted: true, look: { ...LOOK_BASE }, name: '', spot: { room: 'r1', x: 6, y: 5 }, at: Date.now() };
    p.caught = { 658: 1 };
    p.partner = 658;
    p.homePlay = { days: {}, bond: {} };
    return { ok: true };
  });
  assert.ok(r.ok, '집·게임기·파트너 준비');
});

test('🎮 「누구랑?」에서 ✕ — 쓴 판이 정확히 한 번 돌아오고(1 → 2 → 1) 💗·최고 기록 없이 고르기 화면으로 · 방 장면 기록도 0판', async () => {
  await day({ used: 1 });
  const p = openGames(CTX);
  assert.ok(card('아빠랑 줄다리기') && !card('아빠랑 줄다리기').disabled);
  await toChooser();
  assert.equal(plays(), 2, '카드를 고르는 순간 판을 씀');
  xBtn.fire('click');
  await until(() => gmBody.querySelector('.gm-list'), 4000, '고르기 화면');
  for (let k = 0; k < 20; k++) await tick();
  assert.equal(plays(), 1, '한 번만 돌려줌 (두 번이면 0)');
  assert.equal(gameBest('tug'), 0, '최고 기록 저장 안 함');
  assert.ok(!gmBody.querySelector('.gm-end'), '끝 화면이 아니다');
  closeGames();
  const sum = await p;
  assert.deepEqual([sum.played, sum.score, sum.r], [0, 0, null], '방 장면에 넘길 판 없음');
});

test('🎮 판을 돌려주는 사이 닫았다 다시 열어도 — 돌려주기는 끝까지 · 새 화면은 고르기 그대로 · 앞 화면 기록과 안 섞임', async () => {
  await day();
  const p1 = openGames(CTX);
  await toChooser();
  assert.equal(plays(), 1);
  xBtn.fire('click'); // 그만둠 → unplayed (돌려주기는 비동기)
  closeGames(); // 그 사이 닫고
  const p2 = openGames(CTX); // 바로 다시 연다
  const s1 = await p1;
  assert.equal(s1.played, 0);
  await until(() => plays() === 0, 4000, '돌려주기');
  for (let k = 0; k < 20; k++) await tick();
  assert.ok(gmBody.querySelector('.gm-list') && !box.hidden, '새 화면은 고르기 그대로 (늦게 끝난 앞 흐름이 덮지 않음)');
  assert.ok(!gmBody.querySelector('.gu-pick'));
  closeGames();
  const s2 = await p2;
  assert.deepEqual([s2.played, s2.score], [0, 0]);
});

test('🎮 한 판 하고 「🎮 한 판 더」의 「누구랑?」에서 ✕ — 그 판만 돌려받고 앞 판의 ⭐·💗·최고 기록은 그대로', async () => {
  await day();
  const p = openGames(CTX);
  await toChooser();
  gmBody.querySelector('.gu-who.is-meowth').fire('click');
  await until(() => gmBody.querySelector('.gu.is-go'), 3000, '시작');
  const btn = gmBody.querySelector('.gu-btn.is-me');
  for (let k = 0; k < 3; k++) btn.fire('pointerdown');
  xBtn.fire('click'); // 판 도중 그만둠 — 한 판 정산
  await until(() => gmBody.querySelector('.gm-end'), 4000, '끝 화면');
  assert.equal(gmBody.querySelector('.gm-end').textContent, '끝! ⭐ 3');
  assert.match(gmBody.querySelector('.gm-line').textContent, /^🏆 진우 0 : 0 나옹 — 비겼어요!$/);
  assert.equal(gameBest('tug'), 3);
  assert.equal(plays(), 1);
  gmBody.querySelector('.gm-again').fire('click');
  await until(() => gmBody.querySelector('.gu-pick'), 6000, '한 판 더 — 누구랑?');
  assert.equal(plays(), 2);
  xBtn.fire('click');
  await until(() => gmBody.querySelector('.gm-list'), 4000, '고르기 화면');
  for (let k = 0; k < 20; k++) await tick();
  assert.equal(plays(), 1, '두 번째 판만 돌려받음');
  assert.equal(gameBest('tug'), 3, '앞 판의 최고 기록 그대로');
  closeGames();
  const sum = await p;
  assert.deepEqual([sum.played, sum.score], [1, 3], '방 장면엔 앞 판');
  assert.ok(sum.r && sum.r.ok && sum.r.heart, '앞 판의 💗 그대로');
});

test('🎮 상대를 고른 뒤 「준비!」 때 ✕ — 돌려주지 않고 한 판으로 정산(다른 게임의 「준비!」와 같게)', async () => {
  await day();
  const p = openGames(CTX);
  await toChooser();
  gmBody.querySelector('.gu-who.is-dad').fire('click');
  xBtn.fire('click'); // 「준비!」 0.8초 안
  await until(() => gmBody.querySelector('.gm-end'), 4000, '끝 화면');
  for (let k = 0; k < 20; k++) await tick();
  assert.equal(plays(), 1, '판을 쓴 것');
  assert.equal(gmBody.querySelector('.gm-end').textContent, '끝! ⭐ 0');
  closeGames();
  const sum = await p;
  assert.equal(sum.played, 1);
});
