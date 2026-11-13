// 🎹 v408 자유롭게 치기 (2026-11-09 진우 바람 「곡을 정하지 않고 그냥 피아노도 태블릿으로」 → 아버님 「이대로」) — node --test tests/music408.test.js
//   곡 목록 맨 앞 칸 · 큰 건반 두 옥타브(◀ ▶ 한 옥타브씩 · 진짜 피아노 범위 안) · 위에 방금 친 계이름(숨기기 있음) ·
//   💰·음표 칸·음악 포켓몬 없음 · ⏳ 음악 시간에는 든다(들어갈 때 관문 · 다 쓰면 건반을 눌러도 잠금 화면) · 📤 하루 줄에 연 번·친 시간·건반 수
import { fakeIdb } from './fakeidb.js'; // ★ db.js·xp.js보다 먼저
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PIANO_DAILY, pianoDayLine, whiteIdx } from '../js/piano.js';
import { sceneOf } from '../js/blackbox.js';
import { applyDailyDelta, getDaily } from '../js/db.js';
import { initProfile, getProfileSnapshot } from '../js/xp.js';
import { loadToday, clockDay, isLocked } from '../js/timelimit.js';

void fakeIdb;
const src = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

// ───────────────────── 📤 ─────────────────────

test('📤 하루 줄 — 🎹 자유롭게 치기 연 번 · 친 시간 · 건반 수 · 자유롭게 치기만 한 날도 · 읽는 법 · 판 v408', () => {
  for (const k of ['pnFreeN', 'pnFreeKeys', 'pnFreeSec']) assert.ok(PIANO_DAILY.includes(k), k);
  assert.equal(pianoDayLine({ pnFreeN: 2, pnFreeKeys: 130, pnFreeSec: 400 }), '🎹 자유롭게 치기 2번 열고 7분 · 건반 130번');
  assert.equal(pianoDayLine({ pnFreeN: 1, pnFreeKeys: 0, pnFreeSec: 0 }), '🎹 자유롭게 치기 1번 열고 1분 안 · 건반 0번', '열기만 한 날도 한 줄');
  assert.equal(pianoDayLine({ pnFreeKeys: 3, pnFreeSec: 59 }), '🎹 자유롭게 치기 0번 열고 1분 안 · 건반 3번');
  assert.equal(pianoDayLine({ pnTapN: 1, pnTapOk: 1, pnCoins: 15, pnFreeN: 1, pnFreeKeys: 9, pnFreeSec: 90 }), '🎹 태블릿 치기 끝까지 1판(잘 친 판 1 · 💰15) · 🎹 자유롭게 치기 1번 열고 2분 · 건반 9번', '다른 것 뒤에');
  assert.equal(pianoDayLine({ pnFreeSec: 30 }), '', '셈이 시간뿐이면 (연 번·건반 없음) 줄 없음');
  assert.match(src('js/upload.js'), /🎹 자유롭게 치기 = 곡 없이 화면 건반을 마음대로 친 것\(v408 · 💰·음표 칸 없음\) — 연 번 · 친 시간\(건반 사이 쉰 틈은 10초까지만 넣음\) · 누른 건반 수/);
  assert.ok(Number((/CACHE_VERSION = 'v(\d+)'/.exec(src('sw.js')) || [])[1]) >= 408, 'sw v408 이상');
  assert.ok(Number((/APP_VERSION = 'v(\d+)'/.exec(src('js/version.js')) || [])[1]) >= 408, '앱 판 v408 이상');
  const css = src('css/style.css');
  for (const s of ['.pn-song.pn-free {', '.pn-oct .btn {']) assert.ok(css.includes(s), s);
});

// ───────────────────── 화면 — 가짜 화면으로 pianoview.js를 직접 ─────────────────────

const all = [];
let draws = 0;
let texts = [];
class El {
  constructor(tag) {
    this.tagName = String(tag).toUpperCase();
    this.children = []; this.parent = null; this.on = {}; this.attrs = {}; this.style = {};
    this.hidden = false; this.disabled = false; this._text = ''; this._html = ''; this.className = ''; this.id = ''; this.value = ''; this.src = '';
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
  fire(t, ev) { for (const f of this.on[t] || []) f(ev); }
  focus() {}
  setAttribute(k, v) { this.attrs[k] = String(v); }
  getAttribute(k) { return k in this.attrs ? this.attrs[k] : null; }
  getContext() {
    const o = {};
    // 글은 굵기와 함께 — 방금 친 계이름은 800 · 건반 계이름은 700 · 가운데는 600
    const fns = { setTransform: () => { draws += 1; }, fillText: (t) => { texts.push({ t: String(t), w: String(o.font || '').split(' ')[0] }); }, createLinearGradient: () => ({ addColorStop() {} }) };
    return new Proxy(o, { get: (x, k) => (k in x ? x[k] : fns[k] || (() => {})), set: (x, k, v) => { x[k] = v; return true; } });
  }
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
const canvas = () => { for (let i = all.length - 1; i >= 0; i -= 1) if (all[i].tagName === 'CANVAS' && attached(all[i])) return all[i]; return null; };
globalThis.document = { hidden: false, documentElement: ROOT, getElementById: byId, createElement: (t) => new El(t), addEventListener() {}, querySelectorAll: () => [] };
class Param { constructor(v = 1) { this.value = v; } setValueAtTime() {} exponentialRampToValueAtTime() {} setTargetAtTime() {} cancelScheduledValues() {} }
let notesOn = 0;
class FakeAC {
  constructor() { this.currentTime = 0; this.state = 'running'; this.destination = {}; }
  createGain() { return { gain: new Param(1), connect() {}, disconnect() {} }; }
  createDynamicsCompressor() { return { connect() {} }; }
  createOscillator() { return { type: '', frequency: new Param(440), connect() {}, start() { notesOn += 0.5; }, stop() {}, onended: null }; }
  resume() { this.state = 'running'; return Promise.resolve(); }
  suspend() { this.state = 'suspended'; return Promise.resolve(); }
}
const winOn = {};
globalThis.window = { addEventListener: (t, f) => { (winOn[t] ||= []).push(f); }, innerHeight: 800, devicePixelRatio: 1, AudioContext: FakeAC };
const rafs = new Map();
let rafId = 0;
globalThis.requestAnimationFrame = (f) => { rafId += 1; rafs.set(rafId, f); return rafId; };
globalThis.cancelAnimationFrame = (id) => { rafs.delete(id); };
let skew = 0;
const base = performance.now();
Object.defineProperty(performance, 'now', { value: () => base + skew, configurable: true, writable: true });
function frames(n, step = 16) {
  const drew = [];
  for (let i = 0; i < n; i += 1) {
    skew += step;
    const batch = [...rafs.values()];
    rafs.clear();
    const d0 = draws;
    for (const f of batch) f(performance.now());
    drew.push(draws > d0);
  }
  return drew;
}
globalThis.fetch = () => Promise.reject(new Error('시험에선 그림을 안 받는다'));
Object.defineProperty(globalThis, 'navigator', { value: { wakeLock: { request: () => Promise.reject(new Error('없음')) } }, configurable: true });
const store = new Map();
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => { store.set(k, String(v)); },
  removeItem: (k) => { store.delete(k); },
};
store.set('shincoach.pianoSongsAt', String(Date.now()));
store.set('shincoach.musicIntro', '4'); // 🐾 안내 창은 이미 본 것으로 — v423 판은 '4'
const settle = (ms = 20) => new Promise((r) => setTimeout(r, ms));
async function waitFor(cond, what, ms = 4000) {
  const t0 = Date.now();
  while (!(await cond())) {
    if (Date.now() - t0 > ms) throw new Error(`기다림 넘침: ${what}`);
    await settle(10);
  }
}
const daily = async () => (await getDaily(clockDay())) || {};
async function setMusicUsed(sec) {
  const cur = await daily();
  await applyDailyDelta(clockDay(), { musicTime: sec - (Number(cur.musicTime) || 0) });
  await loadToday();
}
let PV;
let P;

before(async () => {
  console.warn = () => {};
  await initProfile();
  await loadToday();
  PV = await import('../js/pianoview.js');
  PV.initMusic({ showView: () => {} });
  await PV.enterMusic();
  P = globalThis.window.__piano;
});

/** 화면 건반 — 왼쪽에서 k번째 흰 건반(0부터)의 아래쪽 */
const keyEv = (k, id = 1) => ({ offsetX: (k + 0.5) * (1000 / 15), offsetY: 690, pointerId: id, preventDefault() {} });
const tapKey = (k, id = 1) => { canvas().fire('pointerdown', keyEv(k, id)); canvas().fire('pointerup', keyEv(k, id)); };

test('🎹 곡 목록 맨 앞 칸 → 자유롭게 치기: 악보·▶ 없이 큰 건반 두 옥타브 · ◀ ▶ · 계이름 · 아이 화면에 숫자 없음 · 📤 연 번', async () => {
  await setMusicUsed(0);
  const grid = byId('pn-free').parent;
  assert.equal(grid.children[0].id, 'pn-free', '곡 목록 맨 앞');
  assert.equal(byId('pn-free').textContent, '🎹자유롭게 치기곡 없이 마음대로');
  const n0 = Number((await daily()).pnFreeN) || 0;
  byId('pn-free').click();
  assert.equal(P.S.screen, 'free');
  const wrap = canvas().parent.parent;
  assert.match(wrap.textContent, /🎹 자유롭게 치기/);
  for (const t of ['◀ 낮게', '높게 ▶', '보이기', '숨기기', '← 곡']) assert.ok(button(t), t);
  assert.equal(byId('pn-go'), null, '▶ 시작 없음');
  assert.equal(byId('pn-slots'), null, '♪ 칸 없음');
  assert.doesNotMatch(wrap.textContent, /\d|💰/, '셈·보상 문구 없음');
  assert.equal(canvas().getAttribute('aria-label'), '건반 — 마음대로 쳐요');
  assert.equal(canvas().style.touchAction, 'none', '건반을 빠르게 쳐도 화면이 안 움직이게');
  assert.deepEqual(P.S.win, { lo: whiteIdx(48), hi: whiteIdx(48) + 14 }, '처음엔 C3부터 두 옥타브 — 가운데 도가 한가운데');
  await waitFor(async () => (Number((await daily()).pnFreeN) || 0) === n0 + 1, '연 번');
});

test('🎹 건반 — 소리 · 방금 친 계이름(여덟까지 · 새것이 오른쪽) · 흰 건반마다 계이름 · 숨기기면 둘 다 없음 · 위쪽을 눌러도 ▶ 없음', () => {
  const s0 = notesOn;
  tapKey(0);
  tapKey(1);
  canvas().fire('pointerdown', { offsetX: 2 * (1000 / 15), offsetY: 300, pointerId: 3, preventDefault() {} }); // 레와 미 사이 위쪽 = 검은 건반 레♯
  canvas().fire('pointerup', { offsetX: 0, offsetY: 0, pointerId: 3 });
  assert.ok(notesOn > s0, '소리');
  assert.deepEqual(P.S.trail, ['도', '레', '레♯']);
  for (let k = 2; k <= 10; k += 1) tapKey(k); // 미 파 솔 라 시 도 레 미 파
  assert.deepEqual(P.S.trail, ['파', '솔', '라', '시', '도', '레', '미', '파'], '여덟까지 · 새것이 끝');
  texts = [];
  frames(20);
  const keyNames = new Set(texts.filter((x) => x.w === '700').map((x) => x.t));
  for (const t of ['도', '레', '미', '파', '솔', '라', '시']) assert.ok(keyNames.has(t), `흰 건반 계이름 ${t}`);
  assert.deepEqual([...new Set(texts.filter((x) => x.w === '800').map((x) => x.t))].sort(), ['도', '라', '레', '미', '솔', '시', '파'].sort(), '방금 친 계이름 줄');
  assert.ok(texts.some((x) => x.t === '가운데'));
  assert.ok(!texts.some((x) => /\d/.test(x.t)), '그림판에도 숫자 없음');
  button('숨기기').click();
  texts = [];
  frames(20);
  assert.deepEqual([...new Set(texts.map((x) => x.t))].sort(), ['가운데', '도'], '숨기면 도·가운데만 (방금 친 계이름도 없음)');
  button('보이기').click();
  assert.equal(JSON.parse(store.get('shincoach.pianoPrefs')).freeNames, true);
  canvas().click();
  assert.equal(P.S.running, false, '자유롭게 치기엔 ▶가 없다');
});

test('🎹 ◀ ▶ — 한 옥타브씩 · C1~C6에서 멈춤(끝 단추 잠김) · 기억함 · 그림판을 다시 잡아 바로 그림', () => {
  button('◀ 낮게').click();
  assert.equal(P.S.win.lo, whiteIdx(36));
  button('◀ 낮게').click();
  button('◀ 낮게').click();
  assert.deepEqual([P.S.freeOct, P.S.win.lo, button('◀ 낮게').disabled, button('높게 ▶').disabled], [1, whiteIdx(24), true, false]);
  for (let i = 0; i < 9; i += 1) button('높게 ▶').click();
  assert.deepEqual([P.S.freeOct, P.S.win.hi, button('높게 ▶').disabled], [6, whiteIdx(108), true], '오른쪽 끝 = 진짜 피아노 맨 위 도');
  assert.equal(JSON.parse(store.get('shincoach.pianoPrefs')).freeOct, 6);
  frames(1);
  let drew = false;
  for (let i = 0; i < 40 && !drew; i += 1) drew = frames(1)[0]; // 막 그린 뒤로 맞춘다 (그림이 안 나오면 멈추지 말고 떨어지게 40장까지)
  assert.ok(drew, '자유롭게 치기 화면을 그린다');
  button('◀ 낮게').click();
  assert.deepEqual(frames(1), [true], '옮긴 다음 화면');
  for (let i = 0; i < 2; i += 1) button('◀ 낮게').click();
  assert.equal(P.S.freeOct, 3);
});

test('🎹 📤 셈 — 건반 수 · 친 시간(쉰 틈은 10초까지만) · 떠날 때 저장 · 💰는 그대로', async () => {
  button('← 곡').click();
  await settle(30);
  const d0 = await daily();
  const c0 = getProfileSnapshot().coins;
  byId('pn-free').click();
  tapKey(0);
  skew += 2000;
  tapKey(1);
  skew += 30000; // 30초 쉼 — 10초만 넣는다
  tapKey(2);
  button('← 곡').click();
  await waitFor(async () => (Number((await daily()).pnFreeKeys) || 0) === (Number(d0.pnFreeKeys) || 0) + 3, '건반 수');
  const d1 = await daily();
  assert.equal((Number(d1.pnFreeSec) || 0) - (Number(d0.pnFreeSec) || 0), 12, '2초 + 10초');
  assert.equal(getProfileSnapshot().coins, c0, '💰 없음');
  assert.equal(P.S.screen, 'list');
  // 떠난 동안은 친 시간이 아니다 — 다시 들어와 첫 건반에 쉰 틈을 붙이지 않는다
  skew += 5000;
  byId('pn-free').click();
  tapKey(3);
  button('← 곡').click();
  await waitFor(async () => (Number((await daily()).pnFreeKeys) || 0) === (Number(d1.pnFreeKeys) || 0) + 1, '건반 하나 더');
  assert.equal(Number((await daily()).pnFreeSec) || 0, Number(d1.pnFreeSec) || 0, '떠나 있던 5초는 안 넣는다');
  const d2 = await daily();
  // 많이 치면 떠나기 전에도 모아 둔다 (50번마다)
  byId('pn-free').click();
  const k0 = Number(d2.pnFreeKeys) || 0;
  for (let i = 0; i < 50; i += 1) tapKey(i % 15);
  await waitFor(async () => (Number((await daily()).pnFreeKeys) || 0) === k0 + 50, '50번에 저장');
});

test('🎹 🎒·📊 갔다 오면 치던 자리 그대로(연 번은 안 셈) · 🛑 블랙박스 한 줄 · PC 자판', async () => {
  const n0 = Number((await daily()).pnFreeN) || 0;
  const trail = [...P.S.trail];
  PV.leaveMusic();
  await PV.enterMusic();
  assert.deepEqual([P.S.screen, P.S.trail], ['free', trail]);
  assert.ok(canvas() && canvas().width > 0);
  await settle(40);
  assert.equal(Number((await daily()).pnFreeN) || 0, n0, '다시 들어온 것은 연 번이 아님');
  assert.equal(sceneOf('music'), `🎹 자유롭게 치기 · 그림판 ${canvas().width}×${canvas().height}`);
  // 곡 무대에서 🎧 듣고 따라 치기를 골라 두었어도 자유롭게 치기 건반은 눌린다 (화면 건반 · PC 자판)
  P.S.mode = 'listen';
  for (const f of winOn.keydown || []) f({ key: 'a', target: {} });
  for (const f of winOn.keyup || []) f({ key: 'a', target: {} });
  assert.equal(P.S.trail[P.S.trail.length - 1], '도', 'A = 가운데 도');
  tapKey(1);
  assert.equal(P.S.trail[P.S.trail.length - 1], '레', '듣고 따라 치기를 골라 두었어도');
  P.S.mode = 'tap';
  // 위 ← 단추도 곡 목록으로 (홈으로 바로 나가지 않는다)
  byId('btn-music-back').click();
  assert.equal(P.S.screen, 'list');
  assert.equal(sceneOf('music'), '곡 고르기');
});

test('🎹 ⏳ 음악 시간을 다 쓰면 — 들어갈 수 없고 · 치던 중이면 건반을 눌러도 소리 대신 잠금', async () => {
  await setMusicUsed(0);
  byId('pn-free').click();
  assert.equal(P.S.screen, 'free');
  await setMusicUsed(2400);
  assert.equal(isLocked('music'), true);
  const s0 = notesOn;
  const t0 = P.S.trail.length;
  canvas().fire('pointerdown', keyEv(4, 8));
  assert.deepEqual([P.S.held.size, notesOn, P.S.trail.length], [0, s0, t0], '잠기면 소리·셈 없음');
  canvas().fire('pointerup', keyEv(4, 8));
  button('← 곡').click();
  byId('pn-free').click();
  assert.equal(P.S.screen, 'list', '잠긴 동안은 들어가지 못한다');
  await setMusicUsed(0);
});

// ───────────────────── Codex 213차 ─────────────────────

test('🎹 손가락 둘이 한 건반 — 하나를 떼도 소리 그대로 · 미끄러져 나간 손가락도 · PC 자판과 화면 건반도 (Codex 213차)', () => {
  byId('pn-free').click();
  assert.equal(P.S.screen, 'free');
  const cv = canvas();
  // 솔(흰 건반 넷째) 위에 손가락 둘
  cv.fire('pointerdown', keyEv(4, 11));
  cv.fire('pointerdown', keyEv(4, 12));
  cv.fire('pointerup', keyEv(4, 11));
  assert.ok(P.S.held.has(55), '남은 손가락의 소리 그대로');
  cv.fire('pointerup', keyEv(4, 12));
  assert.equal(P.S.held.size, 0, '둘 다 떼면 끔');
  // 라를 누르던 손가락이 시로 미끄러져 간다 — 시를 누르던 손가락이 먼저 떼도 시는 그대로 · 떠난 라는 끔
  cv.fire('pointerdown', keyEv(5, 13));
  cv.fire('pointerdown', keyEv(6, 14));
  cv.fire('pointermove', keyEv(6, 13));
  assert.deepEqual([P.S.held.has(57), P.S.held.has(59)], [false, true], '떠난 라는 끄고 시는 그대로');
  cv.fire('pointerup', keyEv(6, 14));
  assert.ok(P.S.held.has(59), '옮겨 온 손가락이 아직 시를 누른다');
  cv.fire('pointermove', keyEv(5, 13)); // 다시 라로 — 이제 시를 누르는 손이 없다
  assert.deepEqual([P.S.held.has(57), P.S.held.has(59)], [true, false]);
  cv.fire('pointerup', keyEv(5, 13));
  assert.equal(P.S.held.size, 0);
  // PC 자판 A(가운데 도)와 화면의 가운데 도 — 어느 쪽을 먼저 떼도 다른 쪽이 누르는 동안은 울림
  const kd = (key) => { for (const f of winOn.keydown || []) f({ key, target: {} }); };
  const ku = (key) => { for (const f of winOn.keyup || []) f({ key, target: {} }); };
  kd('a');
  cv.fire('pointerdown', keyEv(7, 15));
  ku('a');
  assert.ok(P.S.held.has(60), 'A를 떼도 손가락이 누르는 동안은');
  cv.fire('pointerup', keyEv(7, 15));
  assert.equal(P.S.held.size, 0);
  cv.fire('pointerdown', keyEv(7, 16));
  kd('a');
  cv.fire('pointerup', keyEv(7, 16));
  assert.ok(P.S.held.has(60), '손가락을 떼도 A를 누르는 동안은');
  ku('a');
  assert.equal(P.S.held.size, 0);
  // 자판을 누른 채 떠났다(떼는 소식을 못 받음) — 돌아와 같은 건반을 화면에서 치고 떼면 소리가 남지 않는다
  kd('a');
  button('← 곡').click();
  byId('pn-free').click();
  tapKey(7, 17);
  assert.equal(P.S.held.size, 0, '멈출 때 자판 누름도 비운다');
  // ⏳ 시계는 새로 누를 때만 손댐을 센다 — 자유롭게 치기는 건반 소리가 날 때마다 (손가락을 떼지 않고 미끄러지듯 쳐도 「쉬는 중」이 되지 않게)
  assert.match(/function noteFree\([^]*?\n\}/.exec(src('js/pianoview.js'))[0], /\n {2}noteActivity\(\);/);
});

const keysOf = (d) => Number((d || {}).pnFreeKeys) || 0;
const secOf = (d) => Number((d || {}).pnFreeSec) || 0;

test('🎹 📤 셈 — 저장이 안 되면 두었다가 다음 저장 때 함께(바로 되풀이하지 않음) (Codex 213차)', async () => {
  button('← 곡').click();
  await settle(40);
  const d0 = await daily();
  byId('pn-free').click();
  await waitFor(async () => (Number((await daily()).pnFreeN) || 0) === (Number(d0.pnFreeN) || 0) + 1, '연 번');
  tapKey(0);
  skew += 3000;
  tapKey(1);
  tapKey(2);
  fakeIdb.failNext('daily');
  button('← 곡').click();
  await waitFor(() => fakeIdb.failsLeft() === 0, '저장 실패 흉내');
  await settle(60);
  assert.equal(keysOf(await daily()), keysOf(d0), '못 넣었다');
  assert.equal(P.S.freeOwe.size, 1, '날짜째 두었다');
  await settle(60);
  assert.equal(keysOf(await daily()), keysOf(d0), '바로 되풀이하지 않는다');
  byId('pn-free').click(); // 다음 저장 — 들어가며 멈출 때
  tapKey(3);
  button('← 곡').click();
  await waitFor(async () => keysOf(await daily()) === keysOf(d0) + 4, '두었던 셋 + 새 하나');
  assert.equal(secOf(await daily()) - secOf(d0), 3, '두었던 3초도');
  assert.equal(P.S.freeOwe.size, 0);
  // 두 번 잇달아 못 넣으면(50번째 저장 · 떠날 때 저장) 같은 날 몫은 하나로 모은다
  const d1 = await daily();
  byId('pn-free').click();
  await waitFor(async () => (Number((await daily()).pnFreeN) || 0) === (Number(d1.pnFreeN) || 0) + 1, '연 번');
  fakeIdb.failNext('daily');
  fakeIdb.failNext('daily');
  for (let i = 0; i < 50; i += 1) tapKey(i % 15);
  tapKey(0);
  button('← 곡').click();
  await waitFor(() => fakeIdb.failsLeft() === 0, '저장 실패 흉내 둘');
  await settle(60);
  assert.equal(keysOf(await daily()), keysOf(d1), '둘 다 못 넣었다');
  assert.deepEqual([...P.S.freeOwe.values()].map((o) => o.keys), [51], '같은 날 몫은 하나로');
  byId('pn-free').click();
  button('← 곡').click();
  await waitFor(async () => keysOf(await daily()) === keysOf(d1) + 51, '모은 51번');
});

test('🎹 📤 셈 — 자정을 넘겨 치면 전날 몫은 전날 칸으로 · 넘긴 뒤 첫 건반엔 쉰 틈을 붙이지 않는다 (Codex 213차)', async () => {
  await settle(40);
  const today = clockDay();
  const a0 = await daily();
  byId('pn-free').click();
  tapKey(0);
  skew += 2000;
  tapKey(1); // 오늘 — 건반 둘 · 2초
  const RealDate = Date;
  globalThis.Date = class extends RealDate {
    constructor(...a) { if (a.length) super(...a); else super(RealDate.now() + 86400000); }
    static now() { return RealDate.now() + 86400000; }
  };
  try { await loadToday(); } finally { globalThis.Date = RealDate; }
  const tomorrow = clockDay();
  assert.notEqual(tomorrow, today);
  try {
    assert.equal(keysOf(await getDaily(tomorrow)), 0);
    skew += 4000;
    tapKey(2); // 자정 뒤 첫 건반 — 4초 틈은 안 넣는다
    skew += 1000;
    tapKey(3);
    button('← 곡').click();
    await waitFor(async () => keysOf(await getDaily(tomorrow)) === 2, '다음 날 칸 — 건반 둘');
    assert.equal(secOf(await getDaily(tomorrow)), 1, '다음 날 1초');
    await waitFor(async () => keysOf(await getDaily(today)) === keysOf(a0) + 2, '전날 칸 — 건반 둘');
    assert.equal(secOf(await getDaily(today)) - secOf(a0), 2, '전날 2초');
  } finally {
    await loadToday(); // 다시 오늘
  }
  assert.equal(clockDay(), today);
});
