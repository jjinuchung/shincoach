// 🎹 v407 음악 — 💰 하루 다섯 번 · 태블릿 부담 줄이기 · 🛑 블랙박스에 🎹 음악 (2026-11-09 아버님) — node --test tests/music407.test.js
//   「같은 음악이면 2번만 주고 있는거야? 이건 5번까지 줘도 될거 같은데」 → 하루 세 번 → 다섯 번(곡 상관없이)
//   「음악 과목을 태블릿으로 연주할 때 갑자기 꺼지는 일」 = 앱이 닫히고 태블릿 첫 화면(Chrome이 통째로 꺼짐) →
//   멈춰 있으면 1초에 네 번만 그림 · 배경 물감은 크기마다 한 번 · 옛 그림판 픽셀은 바로 비움 · 떠나거나 내리면 소리 장치를 재움 ·
//   🛑 블랙박스가 음악 화면 이름과 「지금 무엇을 하나」(곡·치기/듣기·연주 중·그림판 크기) · 기기 RAM을 적는다
import { fakeIdb } from './fakeidb.js'; // ★ db.js·xp.js보다 먼저
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { TAP_DAY, tapRule, todayOf, pianoOf, pianoMd, dayKeyOf } from '../js/piano.js';
import { crashOf, crashLine, setScene, sceneOf, BEAT_PREFIX } from '../js/blackbox.js';
import { allSongs } from '../js/pianosongs.js';
import { initProfile } from '../js/xp.js';
import { loadToday } from '../js/timelimit.js';

void fakeIdb;
const src = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

// ───────────────────── 💰 하루 다섯 번 ─────────────────────

const REQ = { song: 'ode', line: -1, hand: 'R', lv: 1, sp: 1 };
const NOW = new Date('2026-11-09T17:00:00').getTime();

test('💰 태블릿 치기 — 하루 다섯 번(곡 상관없이) · 오늘 이미 세 번 받았으면 두 번 더 · 여섯째는 기록만 · 📤 읽는 법도', () => {
  assert.equal(TAP_DAY, 5);
  // v406 때 오늘 세 번 받은 기록 — 같은 곡 둘 · 다른 곡 하나
  const p = { coins: 0, coinsEarned: 0, piano: { days: { [dayKeyOf(NOW)]: { paid: 3, coins: 45, notes: 0 } } } };
  const got = [];
  for (const song of ['ode', 'ode', 'mary']) got.push(tapRule(p, { ...REQ, song, ok: 9, bad: 1 }, NOW));
  assert.deepEqual(got.map((r) => [r.coins, r.why || '']), [[15, ''], [15, ''], [0, 'cap']], '같은 곡이어도 다섯 번까지');
  assert.deepEqual(todayOf(p, NOW), { paid: 5, coins: 75, notes: 0 });
  assert.equal(p.coins, 30);
  // 한도를 바꾼 뒤 옛 판 창이 받은 횟수를 깎아 저장하면 한도가 다시 열린다 — 읽을 때 한도로 자르지 않는다 (Codex 212차 P2)
  assert.equal(pianoOf({ days: { [dayKeyOf(NOW)]: { paid: 9, coins: 1, notes: 0 } } }).days[dayKeyOf(NOW)].paid, 9, '한도보다 많아도 그대로');
  assert.equal(pianoOf({ days: { [dayKeyOf(NOW)]: { paid: 1e9, coins: 1, notes: 0 } } }).days[dayKeyOf(NOW)].paid, 99, '깨진 큰 값만 막는다');
  const later = { piano: { days: { [dayKeyOf(NOW)]: { paid: 7, coins: 105, notes: 0 } } } };
  assert.equal(tapRule(later, { ...REQ, ok: 9, bad: 1 }, NOW).why, 'cap', '한도를 내려도 이미 넘은 날은 막힌다');
  assert.equal(todayOf(later, NOW).paid, 7, '막힌 판이 횟수를 깎지 않는다');
  assert.match(pianoMd({ notes: 1 }, '2026-11-09'), /맞게 누른 비율 70% 넘고 하루 5번 안이면\(곡 상관없이 · v406까지 3번\) 💰\(한 줄 5 · 곡 전체 15\)/);
  assert.match(src('js/upload.js'), /💰 하루 다섯 번 · 곡 상관없이 · v406까지 세 번\)/);
  assert.ok(Number((/CACHE_VERSION = 'v(\d+)'/.exec(src('sw.js')) || [])[1]) >= 407, 'sw v407 이상');
  assert.ok(Number((/APP_VERSION = 'v(\d+)'/.exec(src('js/version.js')) || [])[1]) >= 407, '앱 판 v407 이상');
});

// ───────────────────── 🛑 블랙박스 ─────────────────────

test('🛑 꺼진 기록 한 줄 — 🎹 음악 · 🐾 창 · 「지금 무엇을 하나」 · 기기 RAM · 옛 기록은 그대로', () => {
  const at = new Date('2026-11-09T17:05:00').getTime();
  const ev = crashOf({ t0: at - 180000, at, vis: 1, view: 'music', over: ['pn-arrive', 'pn-intro'], scene: '「산책」 🎹 치기 · 연주 중 · 그림판 2000×1200', heap: 30, heapMax: 700, nodes: 4000, ver: 'v407', dm: 4 });
  assert.deepEqual([ev.scene, ev.dm], ['「산책」 🎹 치기 · 연주 중 · 그림판 2000×1200', 4]);
  assert.equal(crashLine(ev), '- 11-09 17:05 · 보던 중 꺼짐 · 🎹 음악 · 🐾 음악 포켓몬 옴 · 🐾 음악 안내 · 「산책」 🎹 치기 · 연주 중 · 그림판 2000×1200 · 연 지 3분 · 메모리 30/700 MB · 요소 4,000 · 기기 RAM 약 4 GB · v407');
  assert.equal(crashOf({ at, vis: 1, view: 'music', scene: 'x'.repeat(300) }).scene.length, 80, '긴 글은 자른다');
  assert.deepEqual([crashOf({ at, vis: 1, view: 'music', dm: -2 }).dm, crashOf({ at, vis: 1, view: 'music', dm: 'x' }).dm], [0, 0]);
  const old = crashLine(crashOf({ t0: at, at, vis: 1, view: 'home', ver: 'v402' }));
  assert.equal(old, '- 11-09 17:05 · 보던 중 꺼짐 · 🏠 홈 · 연 지 0분 · v402', '장면·RAM이 없는 옛 박동은 전과 같은 줄');
  // 이 기기에 적어 둔 옛 기록(scene·dm 칸 없음)도 던지지 않는다
  assert.doesNotThrow(() => crashLine({ at, kind: 'fg', view: 'music', scene: 7, dm: 'x' }));
});

test('🛑 setScene · sceneOf — 화면마다 한 줄 · 함수가 아니면 안 건다 · 던지면 빈 줄 · 80자', () => {
  assert.equal(sceneOf('nowhere'), '');
  setScene('t407', 'not a function');
  assert.equal(sceneOf('t407'), '');
  setScene('t407', () => { throw new Error('boom'); });
  assert.equal(sceneOf('t407'), '');
  setScene('t407', () => 'y'.repeat(200));
  assert.equal(sceneOf('t407').length, 80);
  setScene('t407', () => null);
  assert.equal(sceneOf('t407'), '');
  setScene('t407', () => '좋은 줄');
  setScene('t407', 'not a function');
  setScene('t407', null);
  assert.equal(sceneOf('t407'), '좋은 줄', '함수가 아닌 것은 건 함수를 지우지 않는다');
});

/** 가짜 브라우저 — blackbox.js 박동을 vm에서 (blackbox292와 같은 틀을 줄여서) */
function boxWith(extra = {}, onHome = false) {
  const code = src('js/blackbox.js').replace(/^export /gm, '');
  const store = new Map();
  const els = { 'view-home': { hidden: !onHome }, 'view-music': { hidden: onHome } };
  // 🐾 창은 음악 화면 안 — 자기는 안 숨었어도 음악 화면이 숨으면 안 보인다
  els['pn-arrive'] = { hidden: false, closest: (sel) => (sel === '[hidden]' && els['view-music'].hidden ? els['view-music'] : null) };
  const ctx = vm.createContext({
    console, JSON, Math, Number, String, Array, Object, Map, Set, Promise, RegExp, Date,
    localStorage: { get length() { return store.size; }, key: (i) => [...store.keys()][i], getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => { store.set(k, String(v)); }, removeItem: (k) => { store.delete(k); } },
    document: {
      hidden: false, wasDiscarded: false,
      getElementById: (id) => els[id] || null,
      querySelectorAll: (sel) => (sel === '[id^="view-"]' ? Object.entries(els).filter(([k]) => k.startsWith('view-')).map(([id, e]) => ({ id, hidden: e.hidden })) : []),
      getElementsByTagName: () => ({ length: 900 }),
      addEventListener() {},
    },
    window: { addEventListener() {} },
    performance: { memory: { usedJSHeapSize: 30 * 1048576, jsHeapSizeLimit: 700 * 1048576 } },
    caches: { keys: async () => [] },
    setTimeout: () => 0, setInterval: () => 0,
    ...extra,
  });
  vm.runInContext(code, ctx);
  return { run: (c) => vm.runInContext(c, ctx), beat: () => JSON.parse([...store.entries()].find(([k]) => k.startsWith(BEAT_PREFIX))[1]) };
}

test('🛑 박동 — 음악 화면이면 건 한 줄을 적는다 · 기기 RAM(navigator.deviceMemory) · 없거나 던져도 박동은 그대로', () => {
  const a = boxWith({ navigator: { deviceMemory: 4 } });
  a.run('setScene("music", () => "「산책」 🎹 치기 · 연주 중"); initBlackbox()');
  const b = a.beat();
  assert.deepEqual([b.view, b.over, b.scene, b.dm, b.nodes], ['music', ['pn-arrive'], '「산책」 🎹 치기 · 연주 중', 4, 900]);
  const c = boxWith();
  c.run('setScene("music", () => { throw new Error("x"); }); initBlackbox()');
  const d = c.beat();
  assert.deepEqual([d.view, 'scene' in d, 'dm' in d], ['music', false, false], 'navigator가 없어도 · 장면이 던져도');
  const e = boxWith({ navigator: {} });
  e.run('setScene("home", () => "다른 화면 줄"); initBlackbox()');
  assert.equal('scene' in e.beat(), false, '보이는 화면의 줄만');
  // 🐾 창을 띄운 채 홈으로 — 숨은 음악 화면 안의 창은 적지 않는다 (Codex 212차 P3)
  const h = boxWith({}, true);
  h.run('initBlackbox()');
  assert.deepEqual([h.beat().view, h.beat().over], ['home', []]);
});

// ───────────────────── 화면 — 가짜 화면으로 pianoview.js를 직접 ─────────────────────

const all = [];
let draws = 0;
let grads = 0;
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
  fire(t, ev) { for (const f of this.on[t] || []) f(ev); }
  focus() {}
  setAttribute(k, v) { this.attrs[k] = String(v); }
  getAttribute(k) { return k in this.attrs ? this.attrs[k] : null; }
  getContext() {
    const fns = { setTransform: () => { draws += 1; }, createLinearGradient: () => { grads += 1; return { addColorStop() {} }; } };
    return new Proxy({}, { get: (o, k) => (k in o ? o[k] : fns[k] || (() => {})), set: (o, k, v) => { o[k] = v; return true; } });
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
const docOn = {};
globalThis.document = { hidden: false, documentElement: ROOT, getElementById: byId, createElement: (t) => new El(t), addEventListener: (t, f) => { (docOn[t] ||= []).push(f); }, querySelectorAll: () => [] };
class Param { constructor(v = 1) { this.value = v; } setValueAtTime() {} exponentialRampToValueAtTime() {} setTargetAtTime() {} cancelScheduledValues() {} }
class FakeAC {
  constructor() { this.currentTime = 0; this.state = 'running'; this.destination = {}; this.slept = 0; this.woke = 0; FakeAC.last = this; }
  createGain() { return { gain: new Param(1), connect() {}, disconnect() {} }; }
  createDynamicsCompressor() { return { connect() {} }; }
  createOscillator() { return { type: '', frequency: new Param(440), connect() {}, start() {}, stop() {}, onended: null }; }
  resume() { this.woke += 1; this.state = 'running'; return Promise.resolve(); }
  suspend() {
    this.slept += 1;
    // FakeAC.slow — 재우기가 늦게 끝나는 기기 (시험이 finish()로 끝낸다)
    if (FakeAC.slow) return new Promise((ok) => { this.finish = () => { this.state = 'suspended'; ok(); }; });
    this.state = 'suspended';
    return Promise.resolve();
  }
}
globalThis.window = { addEventListener() {}, innerHeight: 800, devicePixelRatio: 1, AudioContext: FakeAC };
// 화면 그리기 차례 — 시험이 손으로 돌린다 (지운 차례는 빠진다)
const rafs = new Map();
let rafId = 0;
globalThis.requestAnimationFrame = (f) => { rafId += 1; rafs.set(rafId, f); return rafId; };
globalThis.cancelAnimationFrame = (id) => { rafs.delete(id); };
// 시계 — 앱이 performance.now()로 잰 건반 빛과 같은 시계로 화면을 넘긴다 · 손으로만 간다(전체 시험 때 바빠도 어긋나지 않게)
let skew = 0;
const base = performance.now();
Object.defineProperty(performance, 'now', { value: () => base + skew, configurable: true, writable: true });
/** 화면 n장 (16ms씩) → 장마다 그렸나 */
function frames(n, step = 16) {
  const drew = [];
  for (let i = 0; i < n; i += 1) {
    skew += step;
    const now = performance.now();
    const batch = [...rafs.values()];
    rafs.clear();
    const d0 = draws;
    for (const f of batch) f(now);
    drew.push(draws > d0);
  }
  return drew;
}
const count = (a) => a.filter(Boolean).length;
globalThis.fetch = () => Promise.reject(new Error('시험에선 그림을 안 받는다'));
Object.defineProperty(globalThis, 'navigator', { value: { wakeLock: { request: () => Promise.reject(new Error('없음')) } }, configurable: true });
const store = new Map();
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => { store.set(k, String(v)); },
  removeItem: (k) => { store.delete(k); },
};
store.set('shincoach.pianoSongsAt', String(Date.now()));
store.set('shincoach.musicIntro', '1');
const settle = (ms = 20) => new Promise((r) => setTimeout(r, ms));
let PV;
let P;
const SONG = allSongs().find((s) => s.id === 'ode');

before(async () => {
  console.warn = () => {};
  await initProfile();
  await loadToday();
  PV = await import('../js/pianoview.js');
  PV.initMusic({ showView: () => {} });
  await PV.enterMusic();
  P = globalThis.window.__piano;
});

/** 화면 건반 하나를 누름 · 뗌 (아래쪽 흰 건반 자리) */
const keyEv = (id) => ({ offsetX: 300, offsetY: 680, pointerId: id, preventDefault() {} });

test('🪶 멈춰 있으면 1초에 네 번만 그린다 · 크기를 다시 잡으면 바로 · 배경 물감은 크기마다 한 번', () => {
  assert.equal(PV.IDLE_MS, 250);
  P.openSong('ode');
  frames(2);
  const g0 = grads;
  const idle = frames(62);
  assert.ok(count(idle) >= 3 && count(idle) <= 5, `멈춰 있는 1초에 ${count(idle)}번 (전엔 62번)`);
  assert.equal(grads, g0, '배경 물감은 그릴 때마다 새로 안 만든다');
  // 도움 단계를 바꾸면 크기를 다시 잡아 그림판이 비워진다 — 다음 화면에 바로 (막 그린 뒤 16ms라 쉴 차례였다)
  let drew = false;
  for (let i = 0; i < 40 && !drew; i += 1) drew = frames(1)[0]; // 그림이 안 나오면 멈추지 말고 떨어지게 40장까지
  assert.ok(drew);
  button('2 계이름').click();
  assert.deepEqual(frames(1), [true], '크기를 다시 잡은 다음 화면');
  assert.equal(grads, g0 + 1, '새 크기의 배경 물감 한 번');
  const after = frames(10);
  assert.equal(count(after), 0, '그 뒤 160ms는 다시 쉰다');
  // 멈춘 채 「⟲ 처음부터」 — 바로 그린다 (Codex 212차)
  button('⟲ 처음부터').click();
  assert.deepEqual(frames(1), [true], '처음으로 돌린 다음 화면');
});

test('🪶 건반을 누르는 동안 · 빛이 사그라질 때까지는 화면마다 · 끝나면 한 번 더 그리고 쉰다 · 연주 중엔 화면마다', () => {
  button('1 막대').click();
  frames(20);
  const cv = canvas();
  // 오래 누르기 — 빛(260ms)이 끝난 뒤에도 누르고 있는 동안은
  cv.fire('pointerdown', keyEv(1));
  assert.equal(P.S.held.size, 1, '누름');
  assert.deepEqual(frames(30), Array(30).fill(true), '누르고 있는 동안 (480ms)');
  cv.fire('pointerup', keyEv(1));
  assert.equal(P.S.held.size, 0);
  const up = frames(14);
  assert.deepEqual([up[0], count(up)], [true, 1], '떼면 한 번 그리고 쉰다');
  // 톡 — 빛이 사그라질 때까지 빠짐없이
  cv.fire('pointerdown', keyEv(2));
  cv.fire('pointerup', keyEv(2));
  const fade = frames(30);
  const stop = fade.indexOf(false); // 여기까지는 빠짐없이 그렸다
  assert.ok(stop * 16 >= 260 && stop * 16 <= 300, `빛이 끝난 다음 한 번까지 빠짐없이 — 누른 뒤 ${stop * 16}ms`);
  assert.equal(count(fade.slice(stop, stop + 13)), 0, '끝난 뒤엔 쉰다 (사그라진 빛이 남지 않게 마지막 한 번은 그렸다)');
  // 멈춘 뒤에도 앱이 친 음의 빛 · 맞힌 음표의 반짝임이 남아 있으면 그것이 사그라질 때까지
  frames(20);
  P.S.sounding.set(60, { hand: 'R', until: performance.now() + 200 });
  const so = frames(20);
  assert.equal(so.indexOf(false) * 16 >= 200 && so.indexOf(false) * 16 <= 240, true, `앱이 친 음의 빛 — ${so.indexOf(false) * 16}ms`);
  frames(20);
  P.S.perf.heads[0].okAt = performance.now();
  const ok = frames(50);
  assert.equal(ok.indexOf(false) * 16 >= 600 && ok.indexOf(false) * 16 <= 640, true, `맞힌 음표의 반짝임 — ${ok.indexOf(false) * 16}ms`);
  delete P.S.perf.heads[0].okAt;
  P.S.sounding.clear();
  P.S.running = true;
  assert.deepEqual(frames(12), Array(12).fill(true), '연주 중엔 화면마다');
  P.S.running = false;
});

test('🪶 그림판 비우기 — 곡 목록으로 · 다른 곡 · 음악을 떠나면 옛 그림판 크기 0 · 돌아오면 새로 짓는다', async () => {
  const c1 = canvas();
  assert.ok(c1.width > 0 && c1.height > 0);
  button('← 곡').click();
  assert.deepEqual([c1.width, c1.height], [0, 0], '곡 목록으로 가면 비움');
  assert.equal(canvas(), null);
  P.openSong('ode');
  const c2 = canvas();
  assert.ok(c2 !== c1 && c2.width > 0);
  P.openSong(allSongs().find((s) => s.id !== 'ode').id);
  assert.deepEqual([c2.width, c2.height], [0, 0], '다른 곡을 열면 옛 그림판을 비움');
  P.openSong('ode');
  const c3 = canvas();
  PV.leaveMusic();
  assert.deepEqual([c3.width, c3.height], [0, 0], '음악을 떠나면 비움');
  assert.equal(rafs.size, 0, '그리기도 멈춤');
  await PV.enterMusic();
  const c4 = canvas();
  assert.ok(c4 !== c3 && c4.width > 0, '돌아오면 하던 무대를 새 그림판으로');
  assert.deepEqual(frames(1), [true]);
});

test('🔇 소리 장치 — 음악을 떠나면 잠시 뒤 재운다 · 금방 돌아오면 안 재운다 · 앱을 내려도 · 다시 누르면 깨운다', async () => {
  await settle(760); // 앞 시험에서 떠날 때 걸어 둔 재우기 차례를 흘려보낸다 (그땐 돌아와 있어 안 재운다)
  const cv = canvas();
  cv.fire('pointerdown', keyEv(2));
  cv.fire('pointerup', keyEv(2));
  const ac = FakeAC.last;
  assert.ok(ac, '건반을 누르면 소리 장치');
  const s0 = ac.slept;
  PV.leaveMusic();
  assert.equal(ac.slept, s0, '바로는 안 재운다 — 끄던 음이 사그라진 뒤에');
  await settle(300);
  assert.equal(ac.slept, s0, '0.7초는 기다린다');
  await settle(460);
  assert.deepEqual([ac.slept, ac.state], [s0 + 1, 'suspended'], '떠난 뒤 재움');
  await PV.enterMusic();
  canvas().fire('pointerdown', keyEv(3));
  canvas().fire('pointerup', keyEv(3));
  assert.equal(ac.state, 'running', '누르면 깨운다');
  PV.leaveMusic();
  await PV.enterMusic();
  await settle(760);
  assert.equal(ac.slept, s0 + 1, '금방 돌아왔으면 안 재운다');
  // 건반을 누른 채 앱을 내림 — 뗀 소식이 안 와도 누른 건반·손가락을 정리한다 (Codex 212차 P3)
  canvas().fire('pointerdown', keyEv(9));
  assert.equal(P.S.held.size, 1);
  document.hidden = true;
  for (const f of docOn.visibilitychange || []) { try { f(); } catch { /* 다른 모듈 것 */ } }
  assert.deepEqual([P.S.held.size, P.S.ptr.size], [0, 0], '내리면 누름 정리');
  await settle(760);
  assert.equal(ac.slept, s0 + 2, '앱을 내리면 재운다');
  document.hidden = false;
  frames(30);
  const back = count(frames(32));
  assert.ok(back <= 3, `돌아와서 멈춰 있으면 다시 쉰다 — 512ms에 ${back}번 (누름이 남았으면 32번)`);
});

test('🔇 재우기가 늦게 끝나도 — 그사이 돌아와 건반을 눌렀으면 다시 깨운다 · 안 돌아왔으면 그대로 잔다 (Codex 212차 P2)', async () => {
  await settle(760);
  const ac = FakeAC.last;
  canvas().fire('pointerdown', keyEv(4));
  canvas().fire('pointerup', keyEv(4));
  assert.equal(ac.state, 'running');
  FakeAC.slow = true;
  const w0 = ac.woke;
  PV.leaveMusic();
  await settle(760);
  assert.equal(typeof ac.finish, 'function', '재우기를 걸었다');
  assert.equal(ac.state, 'running', '아직 안 끝남');
  await PV.enterMusic();
  canvas().fire('pointerdown', keyEv(5));
  canvas().fire('pointerup', keyEv(5));
  assert.equal(ac.woke, w0, '깨어 있는 줄 알아 깨우지 않는다 — 여기서 늦게 잠들면 소리가 멎는다');
  ac.finish();
  await settle(10);
  assert.deepEqual([ac.state, ac.woke], ['running', w0 + 1], '돌아와 있으니 다시 깨운다');
  PV.leaveMusic();
  await settle(760);
  ac.finish();
  await settle(10);
  assert.equal(ac.state, 'suspended', '안 돌아왔으면 잔다');
  FakeAC.slow = false;
  await PV.enterMusic();
});

test('🛑 음악 화면의 한 줄 — 곡 고르기 · 「곡」 🎹 치기/🎧 따라 치기 · 멈춤/연주 중 · 그림판 크기', () => {
  const c = canvas();
  assert.equal(sceneOf('music'), `「${SONG.ko}」 🎹 치기 · 멈춤 · 그림판 ${c.width}×${c.height}`);
  P.S.running = true;
  assert.match(sceneOf('music'), /🎹 치기 · 연주 중 · 그림판 \d+×\d+$/);
  P.S.running = false;
  button('🎧 듣고 따라 치기').click();
  assert.match(sceneOf('music'), /^「.+」 🎧 따라 치기 · 멈춤 · 그림판 \d+×\d+$/);
  button('🎹 태블릿으로 치기').click();
  button('← 곡').click();
  assert.equal(sceneOf('music'), '곡 고르기');
});
