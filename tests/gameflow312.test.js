// 🎮 게임기 흐름 — 🤼 「누구랑?」에서 그만두면 판을 돌려주는 길을 **진짜로** 돌린다 (🔍 Codex 118차 #2 · v312) — node --test tests/gameflow312.test.js
// 가짜 저장소(fakeidb) + 가짜 화면으로 gameview.openGames → 카드 → 판 쓰기(claimDailyCount) → runTug → ✕ → giveBack(releaseDailyCount)
// minigame312의 출처 검사가 "그 줄이 있다"만 보던 것을 — 판 수가 실제로 몇 번 돌아오는지 · 💗·최고 기록·방 장면 기록(sum)이 어떻게 남는지로
import { fakeIdb } from './fakeidb.js'; // ★ db.js·xp.js보다 먼저
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { getDaily, emptyDaily } from '../js/db.js';
import { loadToday, clockDay } from '../js/timelimit.js';
import { initProfile, houseDo, gameBest, getProfileSnapshot } from '../js/xp.js';
import { LOOK_BASE } from '../js/avatar.js';
import { openGames, closeGames } from '../js/gameview.js';
import { gameMusicState } from '../js/gamebgm.js'; // 🎵 게임 음악 (v335)
import { loadCharacters, characterUrl } from '../js/pokemon.js';
import { START_LEN } from '../js/gamesimon.js'; // 🧠 첫 줄 길이 (v351 — 넷)

// ───────────────────── 가짜 화면 (gameview·gametug가 쓰는 만큼) ─────────────────────

class FakeEl {
  constructor(tag) { this.tagName = String(tag).toUpperCase(); this.className = ''; this.children = []; this.listeners = {}; this.style = { setProperty(k, v) { this[k] = v; } }; this.attrs = {}; this.dataset = {}; this.own = ''; this.html = ''; this.hidden = false; this.disabled = false; }
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

test('🎵 게임 음악(v335) — 판이 시작되면 그 게임으로(run.music) · 판 도중 상태는 play · 끝 화면엔 없음 · 「한 판 더」에 다시 · 판 도중 닫으면 없음', async () => {
  await day();
  const p = openGames(CTX);
  assert.equal(gameMusicState().game, '', '고르기 화면엔 음악 없음');
  await toChooser();
  assert.equal(gameMusicState().game, 'tug', '판이 시작되면 그 게임');
  gmBody.querySelector('.gu-who.is-meowth').fire('click');
  await until(() => gmBody.querySelector('.gu.is-go'), 3000, '시작');
  assert.equal(gameMusicState().game, 'tug');
  xBtn.fire('click'); // 판 도중 그만둠
  await until(() => gmBody.querySelector('.gm-end'), 4000, '끝 화면');
  assert.deepEqual([gameMusicState().game, gameMusicState().timer], ['', false], '끝 화면엔 음악 없음 · 타이머도 지움');
  gmBody.querySelector('.gm-again').fire('click');
  await until(() => gmBody.querySelector('.gu-pick'), 6000, '한 판 더 — 누구랑?');
  assert.equal(gameMusicState().game, 'tug', '한 판 더에 다시');
  closeGames(); // 판 도중 닫기
  await p;
  for (let k = 0; k < 20; k++) await tick();
  assert.deepEqual([gameMusicState().game, gameMusicState().timer], ['', false], '닫으면 없음');
});

// 🔍 Codex 148차 #4 (v344) — 새 게임을 게임기에서 진짜로: 그림을 못 받으면·준비 중 닫으면 판을 안 쓰고, 끝나면 최고 기록만(도감·코인·가방 그대로)
const wallet = () => { const p = getProfileSnapshot(); return JSON.stringify({ caught: p.caught, coins: p.coins, items: p.items, partner: p.partner }); };

test('🎯 v344 — 준비 중(그림 받는 중)에 닫으면 판을 안 씀 · 그림이 하나도 없으면 한 줄만 나오고 판을 안 씀', async () => {
  await day();
  const p1 = openGames(CTX);
  card('몬스터볼 던지기').fire('click');
  closeGames(); // 그림을 받으러 간 사이
  await p1;
  await new Promise((r) => setTimeout(r, 3000)); // 준비가 끝날 만큼(시험은 인터넷이 없어 그림 받기가 곧바로 실패한다 · 기다림 끝은 2.5초)
  assert.equal(plays(), 0, '준비 중 닫으면 판을 안 쓴다');
  const p2 = openGames(CTX);
  card('몬스터볼 던지기').fire('click');
  await until(() => gmBody.querySelector('.gm-msg'), 9000, '그림 없음 한 줄');
  assert.equal(gmBody.querySelector('.gm-msg').textContent, '포켓몬 그림이 아직 없어요 — 인터넷이 될 때 다시 해 봐요.');
  assert.equal(plays(), 0, '그림이 없으면 판을 안 쓴다');
  assert.equal(gameBest('throw'), 0);
  closeGames();
  await p2;
});

test('🎣 v344 — 한 판(진짜 시계): 던지기 → 쏙 → 챔 → 힘겨루기 → 낚았다 → ✕ → 끝 화면 · 최고 기록만 · 도감·코인·가방 그대로 · 판 한 번', async () => {
  await day();
  const before = wallet();
  const p = openGames(CTX);
  card('잉어킹 낚시').fire('click');
  await until(() => gmBody.querySelector('.gf.is-go'), 9000, '시작');
  assert.equal(plays(), 1);
  const root = gmBody.querySelector('.gf');
  const field = gmBody.querySelector('.gf-field');
  const bar = gmBody.querySelector('.gf-bar');
  const zone = gmBody.querySelector('.gf-zone');
  const up = () => { for (const f of [...(document.listeners.pointerup || [])]) f({ pointerId: 1 }); };
  field.fire('pointerdown', { pointerId: 1 });
  up();
  await until(() => root.classList.contains('is-bite'), 6000, '쏙');
  field.fire('pointerdown', { pointerId: 1 });
  let pressing = true;
  await until(() => {
    if (root.classList.contains('is-reel') && bar.style.bottom && zone.style.bottom) {
      const b = parseFloat(bar.style.bottom);
      const z = parseFloat(zone.style.bottom) + parseFloat(zone.style.height) / 2;
      if (b < z && !pressing) { field.fire('pointerdown', { pointerId: 1 }); pressing = true; }
      if (b >= z && pressing) { up(); pressing = false; }
    }
    return root.classList.contains('is-got') || root.classList.contains('is-idle');
  }, 15000, '낚았다');
  if (pressing) up();
  assert.ok(root.classList.contains('is-got'), '낚았다 (도망 아님)');
  xBtn.fire('click'); // 판 도중 그만둠 — 그때까지 점수로 정산
  await until(() => gmBody.querySelector('.gm-end'), 4000, '끝 화면');
  assert.match(gmBody.querySelector('.gm-end').textContent, /^끝! ⭐ [0-8]$/);
  assert.equal(gameBest('fish'), Number(gmBody.querySelector('.gm-end').textContent.replace('끝! ⭐ ', '')), '최고 기록 저장');
  assert.equal(plays(), 1, '판은 한 번');
  assert.equal(wallet(), before, '도감·코인·가방은 그대로 (낚아도 도감엔 안 들어간다)');
  closeGames();
  const sum = await p;
  assert.equal(sum.played, 1);
});

// v345 — 🔀 그림이 없으면 판을 안 씀 · 🔍 진우 방을 그림에만 쓰고 진짜 방(집)은 그대로
const houseNowJson = () => JSON.stringify(getProfileSnapshot().house);

test('🔀 v345 — 포켓몬 그림이 모자라면 한 줄만 나오고 판을 안 씀', async () => {
  await day();
  const p = openGames(CTX);
  card('타입 나누기').fire('click');
  await until(() => gmBody.querySelector('.gm-msg'), 9000, '그림 없음 한 줄');
  assert.equal(gmBody.querySelector('.gm-msg').textContent, '포켓몬 그림이 아직 없어요 — 인터넷이 될 때 다시 해 봐요.');
  assert.equal(plays(), 0);
  closeGames();
  await p;
});

test('🧠 v346 — 네 자리(불꽃·물·풀·전기) 포켓몬 그림이 없으면 대신할 포켓몬을 받아 보고, 못 받으면 한 줄만 · 판을 안 씀', async () => {
  await day();
  const asked = [];
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (url) => { asked.push(String(url)); throw new Error('offline (시험)'); };
  const p = openGames(CTX);
  try {
    card('포켓몬 따라 하기').fire('click');
    await until(() => gmBody.querySelector('.gm-msg'), 9000, '그림 없음 한 줄');
    assert.equal(gmBody.querySelector('.gm-msg').textContent, '포켓몬 그림이 아직 없어요 — 인터넷이 될 때 다시 해 봐요.');
    assert.equal(plays(), 0);
    const got = asked.map((u) => Number((/official-artwork\/(\d+)\.png$/.exec(u) || [])[1])).filter(Boolean);
    for (const id of [4, 7, 1, 25]) assert.ok(got.includes(id), `대신할 포켓몬 ${id}를 받으러 감`);
  } finally {
    globalThis.fetch = realFetch;
    closeGames();
  }
  await p;
});

test('🔍 v345 — 진우 1층 방(게임기만 있는 방)으로 한 판 · 하나 찾고 ✕ → 끝 화면 「끝! ⭐ 1」(시간 기록 없음) · 판 한 번 · 진짜 방·도감·코인은 그대로', async () => {
  await day();
  const houseBefore = houseNowJson();
  const before = wallet();
  const p = openGames(CTX);
  try { // 실패해도 게임기를 닫는다 — 열린 판의 힌트 시계가 시험 프로세스를 붙잡지 않게
  card('우리 집 다른 그림 찾기').fire('click');
  await until(() => gmBody.querySelector('.gq.is-go'), 9000, '시작');
  assert.equal(plays(), 1);
  const pics = gmBody.querySelectorAll('.gq-pic');
  assert.equal(pics.length, 2);
  // 왼쪽 그림에 진우 방의 🎮 게임기가 있다 (가구가 적어 나머지는 게임 그림에만 채움)
  assert.ok(pics[0].querySelectorAll('.gq-item').length >= 7);
  // 다른 곳 하나 찾기 — 두 그림의 가구를 견줘 다른 칸을 찾아 누른다
  const pos = (e) => `${e.style.left}|${e.style.top}|${e.textContent}|${e.querySelector('.house-emoji').innerHTML}`;
  const L = new Set(pics[0].querySelectorAll('.gq-item').map(pos));
  const odd = pics[1].querySelectorAll('.gq-item').find((e) => !L.has(pos(e)));
  assert.ok(odd, '오른쪽에만 있는 모습');
  const x = parseFloat(odd.style.left) + parseFloat(odd.style.width) / 2;
  const y = parseFloat(odd.style.top) + parseFloat(odd.style.height) / 2;
  pics[1].fire('pointerdown', { clientX: x, clientY: y / 2 }); // 가짜 화면 그림은 100 × 50
  assert.equal(gmBody.querySelector('.gd-score').textContent, '⭐ 1'); // 가짜 화면은 '.a .b'를 못 읽는다
  xBtn.fire('click');
  await until(() => gmBody.querySelector('.gm-end'), 4000, '끝 화면');
  assert.equal(gmBody.querySelector('.gm-end').textContent, '끝! ⭐ 1');
  assert.equal(plays(), 1);
  assert.equal(houseNowJson(), houseBefore, '진짜 방은 그대로');
  assert.equal(wallet(), before, '도감·코인·가방 그대로');
  } finally { closeGames(); }
  const sum = await p;
  assert.equal(sum.played, 1);
});

// 🔍 Codex 149차 #1 — 이 시험은 기기에 그림을 넣으니 맨 끝에 (앞 시험들은 그림이 없는 기기)
test('🔀 v345 — 그림이 열둘이어도 타입이 모두 달라 상자 넷을 못 만들면 — 기기에 없는 그림을 몇 장 더 받아 보고, 못 받으면 한 줄만 · 판을 안 씀', async () => {
  const ONE_EACH = [4, 7, 25, 35, 50, 52, 63, 66, 88, 114, 127, 147]; // 모두 다른 홑 타입
  for (const id of ONE_EACH) fakeIdb.put('characters', { id, ko: '', en: '', blob: new Blob(['x']), anchor: { x: 0.5, y: 0.2 }, savedAt: 0 });
  await loadCharacters(true);
  assert.deepEqual(ONE_EACH.filter((id) => characterUrl(id)), ONE_EACH, '기기에 그림 열둘');
  const asked = [];
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (url) => { asked.push(String(url)); throw new Error('offline (시험)'); };
  await day();
  const p = openGames(CTX);
  try {
    card('타입 나누기').fire('click');
    await until(() => gmBody.querySelector('.gm-msg'), 9000, '한 줄');
    assert.equal(gmBody.querySelector('.gm-msg').textContent, '포켓몬 그림이 아직 없어요 — 인터넷이 될 때 다시 해 봐요.');
    assert.equal(plays(), 0, '판을 안 쓴다');
    const got = asked.map((u) => Number((/official-artwork\/(\d+)\.png$/.exec(u) || [])[1])).filter(Boolean);
    assert.ok(got.length >= 1 && got.length <= 12, `그림을 더 받아 봄 ${got.length}장`);
    assert.ok(got.every((id) => !ONE_EACH.includes(id)), '받으러 간 것은 기기에 없는 그림');
  } finally {
    globalThis.fetch = realFetch;
    closeGames();
  }
  await p;
});

// 앞 시험이 기기에 넣은 그림 열둘(파이리·꼬부기·피카츄·덩쿠리 …)로 — 🧠 한 판을 진짜 시계로
test('🧠 v346 — 한 판(진짜 시계): 네 자리 포켓몬 → 반짝인 넷을 보고 그대로 톡(v351 — 셋이었다) → ⭐ 6 → ✕ → 「끝! ⭐ 6」·「🧠 가장 긴 줄 4마리」 · 배경 음악 없음 · 최고 기록만 · 도감·코인·가방 그대로 · 판 한 번', async () => {
  await day();
  const before = wallet();
  const p = openGames(CTX);
  try {
    card('포켓몬 따라 하기').fire('click');
    await until(() => gmBody.querySelector('.gc.is-go'), 9000, '시작');
    assert.equal(plays(), 1);
    assert.equal(gameMusicState().game, '', '배경 음악을 틀지 않는다 (quiet)');
    const root = gmBody.querySelector('.gc');
    const pads = gmBody.querySelectorAll('.gc-pad');
    assert.deepEqual(pads.map((b) => b.querySelector('.gc-name').textContent), ['파이리', '꼬부기', '덩쿠리', '피카츄'], '기기에 그림이 있는 그 타입 포켓몬');
    // 보여 주는 동안 화면이 0.2초 넘게 멈췄다 오면 게임이 그 줄을 처음부터 다시 보여 준다(simonLag — 🔍 Codex 150차 #1)
    // 시험을 한꺼번에 돌려 컴퓨터가 바쁘면 그럴 수 있다 → 본 반짝이 넷보다 많으면 「한 번 더 볼게요」를 봤어야 하고, 따라 할 것은 마지막에 본 넷
    // (v353 — 전체 시험에서 3 + 4 = 7로 세어 흔들렸다 · .context/v353/simon_stall.mjs가 0.4초 멈춤을 넣어 재현)
    const seq = [];
    let prev = -1;
    let again = false;
    await until(() => {
      const i = root.dataset.phase === 'show' ? pads.findIndex((b) => b.classList.contains('is-lit')) : -1;
      if (i >= 0 && i !== prev) seq.push(i);
      prev = i;
      if (gmBody.querySelector('.gc-say').textContent === '한 번 더 볼게요 — 잘 봐!') again = true;
      return root.dataset.phase === 'input';
    }, 20000, '따라 할 차례');
    assert.ok(seq.length === START_LEN || (again && seq.length > START_LEN), `본 반짝 ${seq}${again ? ' (한 번 더 보여 줌)' : ''}`);
    for (const i of seq.slice(-START_LEN)) pads[i].fire('pointerdown');
    assert.equal(gmBody.querySelector('.gd-score').textContent, '⭐ 6');
    xBtn.fire('click');
    await until(() => gmBody.querySelector('.gm-end'), 4000, '끝 화면');
    assert.equal(gmBody.querySelector('.gm-end').textContent, '끝! ⭐ 6');
    assert.equal(gmBody.querySelector('.gm-line').textContent, '🧠 가장 긴 줄 4마리');
    assert.equal(gameBest('simon'), 6);
    assert.equal(plays(), 1);
    assert.equal(wallet(), before, '도감·코인·가방 그대로');
  } finally { closeGames(); }
  const sum = await p;
  assert.equal(sum.played, 1);
});
