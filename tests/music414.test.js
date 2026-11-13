// 🎹 v414 (2026-11-11 아버님 「추천대로」) — node --test tests/music414.test.js
//   「멈췄을 때 건반 소리가 안 났다 · 누른 모양은 보였다」 → 앱은 누름을 받아 그렸다 · 무엇이 멈췄나 가르는 📤 기록만 (아이 화면·보상 그대로)
//   🔇 연주 중 소리 엔진 시계가 0.5초 넘게 안 감(소리 장치가 꺼져 있었나도) · 🐢 화면 한 장이 0.2~1초 · ✋ 건반을 누른 손가락을 가로챔
import { fakeIdb } from './fakeidb.js'; // ★ db.js·xp.js보다 먼저
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { MUTE, SLOW, STALL, PIANO_DAILY, tapRule, pianoOf, copyPiano, mergePiano, pianoDayLine, pianoMd } from '../js/piano.js';
import { getDaily } from '../js/db.js';
import { initProfile, getProfileSnapshot } from '../js/xp.js';
import { loadToday, clockDay } from '../js/timelimit.js';

void fakeIdb;
const src = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const REQ = { song: 'ode', line: -1, hand: 'R', lv: 1, sp: 1 };
const NOW = new Date('2026-11-11T18:00:00').getTime();
const POOL = [{ id: 433, r: 1 }, { id: 358, r: 2 }, { id: 1024, r: 4 }];
const rng0 = () => 0;

// ───────────────────── 📤 (순수) ─────────────────────

test('📤 하루 줄 — 🔇 소리 멎음 · 🐢 느린 장면 · ✋ 누름 끊김 (그것만 있던 날도) · 번 수가 없으면 없음 · 옛 줄 그대로', () => {
  for (const k of ['pnMuteN', 'pnMuteLong', 'pnMuteOff', 'pnSlowN', 'pnSlowMs', 'pnCancelN']) assert.ok(PIANO_DAILY.includes(k), k);
  assert.deepEqual(MUTE, { ms: 500, long: 2500 });
  assert.deepEqual(SLOW, { ms: 200 });
  assert.ok(SLOW.ms < STALL.ms, '느린 장면은 멈칫 아래');
  assert.equal(pianoDayLine({ pnMuteN: 3, pnMuteLong: 1, pnMuteOff: 2 }), '🔇 연주 중 소리 멎음 3번(2.5초 넘게 1번 · 소리 장치 꺼짐 2번)');
  assert.equal(pianoDayLine({ pnSlowN: 4, pnSlowMs: 1234 }), '🐢 연주 중 느린 장면 4번(모두 1.2초)');
  assert.equal(pianoDayLine({ pnCancelN: 2 }), '✋ 건반 누름 끊김 2번');
  assert.equal(pianoDayLine({ pnMuteLong: 1, pnMuteOff: 1, pnSlowMs: 500 }), '', '번 수가 없으면 없음');
  assert.equal(pianoDayLine({ pnTapN: 1, pnTapOk: 1, pnCoins: 5, pnStallN: 1, pnMuteN: 1, pnSlowN: 2, pnSlowMs: 600, pnCancelN: 1 }),
    '🎹 태블릿 치기 끝까지 1판(잘 친 판 1 · 💰5) · ⚠️ 연주 중 화면 멈칫 1번(2.5초 넘게 0번) · 🔇 연주 중 소리 멎음 1번(2.5초 넘게 0번 · 소리 장치 꺼짐 0번) · 🐢 연주 중 느린 장면 2번(모두 0.6초) · ✋ 건반 누름 끊김 1번');
  assert.equal(pianoDayLine({ pnTapN: 1, pnTapOk: 1, pnCoins: 5 }), '🎹 태블릿 치기 끝까지 1판(잘 친 판 1 · 💰5)', '옛 날 줄 그대로');
  assert.match(src('js/upload.js'), /🔇 연주 중 소리 멎음\(v414\) = 화면은 도는데 소리 엔진 시계가 0\.5초 넘게 안 간 번\(소리 장치 꺼짐 = 그동안 소리 장치가 멈춤 상태였음 · 까닭은 모름\) · 🐢 느린 장면 = 연주 중 화면 한 장이 0\.2~1초 걸린 번과 모두 시간\(1초 넘으면 ⚠️ 멈칫\) · ✋ 건반 누름 끊김 = 건반을 누른 손가락을 태블릿·브라우저가 가로챈 번/);
});

test('🔇 기록 줄 — 그 판의 가장 긴 소리 멎음(0.5초 넘은 것만 · 상한) · 🎧 줄엔 없음 · 복사·병합 · music.md 읽는 법·줄 끝', () => {
  const p = {};
  tapRule(p, { ...REQ, ok: 9, bad: 1, g: 85, st: 3210, mu: 1840 }, NOW, POOL, rng0);
  tapRule(p, { ...REQ, ok: 9, bad: 1, mu: 499 }, NOW, POOL, rng0);
  tapRule(p, { ...REQ, ok: 9, bad: 1, mu: 9e9 }, NOW, POOL, rng0);
  tapRule(p, { ...REQ, ok: 9, bad: 1, mu: 'x' }, NOW, POOL, rng0);
  tapRule(p, { ...REQ, ok: 9, bad: 1 }, NOW, POOL, rng0);
  const rows = pianoOf(p.piano).log.filter((r) => r.m === 't');
  assert.deepEqual(rows.map((r) => r.mu), [1840, undefined, 600000, undefined, undefined]);
  assert.deepEqual(rows.map((r) => 'mu' in r), [true, false, true, false, false], '없으면 칸도 없다(옛 줄 꼴)');
  assert.equal(pianoOf({ log: [{ at: NOW, m: 'l', s: 'ode', mu: 5000 }] }).log[0].mu, undefined, '🎧 줄엔 없다');
  assert.equal(copyPiano(p.piano).log[0].mu, 1840);
  assert.equal(mergePiano({ log: [{ at: NOW, m: 't', s: 'ode', ok: 1, mu: 1840 }] }, { log: [{ at: NOW + 1, m: 't', s: 'ode', ok: 1 }] }).log[0].mu, 1840);
  const md = pianoMd(p.piano, '2026-11-11');
  assert.match(md, /- 소리 멎음\(v414\) = 그 판 동안 화면은 도는데 소리 엔진 시계가 0\.5초 넘게 안 간 가장 긴 시간\(앱이 소리를 끈 것이 아님 — 태블릿·브라우저 쪽\)/);
  assert.match(md, / · 박자 85점 🎉 · 멈칫 3\.2초 · 소리 멎음 1\.8초\n/);
  assert.match(md, / · 소리 멎음 600\.0초\n/);
});

test('🔌 잇기 — sw·앱 판 v414 · 아이 화면에 새 글 없음', () => {
  assert.ok(Number((/CACHE_VERSION = 'v(\d+)'/.exec(src('sw.js')) || [])[1]) >= 414, 'sw v414 이상');
  assert.ok(Number((/APP_VERSION = 'v(\d+)'/.exec(src('js/version.js')) || [])[1]) >= 414, '앱 판 v414 이상');
  const v = src('js/pianoview.js');
  for (const s of ['소리 멎음', '느린 장면', '누름 끊김']) assert.ok(!new RegExp(`(toast|textContent|fillText)\\([^)]*${s}`).test(v), `${s}은 📤에만`);
});

// ───────────────────── 화면 — 가짜 화면으로 pianoview.js를 직접 ─────────────────────

const all = [];
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
    const fns = { createLinearGradient: () => ({ addColorStop() {} }) };
    return new Proxy({}, { get: (x, k) => (k in x ? x[k] : fns[k] || (() => {})), set: (x, k, v) => { x[k] = v; return true; } });
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
// 소리 장치 — 시계(currentTime)를 시험이 움직인다 · 하나뿐(앱이 처음 소리를 낼 때 만든다)
class Param { constructor(v = 1) { this.value = v; } setValueAtTime() {} exponentialRampToValueAtTime() {} linearRampToValueAtTime() {} setTargetAtTime() {} cancelScheduledValues() {} }
let ac = null;
class FakeAC {
  constructor() { this.currentTime = 0; this.state = 'running'; this.destination = {}; this.sampleRate = 8000; ac = this; }
  createGain() { return { gain: new Param(1), connect() {}, disconnect() {} }; }
  createDynamicsCompressor() { return { connect() {} }; }
  createOscillator() { return { type: '', frequency: new Param(440), connect() {}, start() {}, stop() {}, onended: null }; }
  createBiquadFilter() { return { type: '', frequency: new Param(1000), Q: new Param(1), connect() {} }; }
  createBuffer(c, n) { const d = new Float32Array(n); return { getChannelData: () => d }; }
  createBufferSource() { return { buffer: null, connect() {}, start() {}, stop() {}, onended: null }; }
  resume() { this.state = 'running'; return Promise.resolve(); }
  suspend() { this.state = 'suspended'; return Promise.resolve(); }
}
globalThis.window = { addEventListener() {}, innerHeight: 800, devicePixelRatio: 1, AudioContext: FakeAC };
const rafs = new Map();
let rafId = 0;
globalThis.requestAnimationFrame = (f) => { rafId += 1; rafs.set(rafId, f); return rafId; };
globalThis.cancelAnimationFrame = (id) => { rafs.delete(id); };
let skew = 0;
const base = performance.now();
Object.defineProperty(performance, 'now', { value: () => base + skew, configurable: true, writable: true });
/** 화면 n장 — 한 장마다 벽시계 step(ms) · 소리 시계는 sound(ms)만큼 (주지 않으면 같이 간다) */
function frames(n, step = 16, sound = step) {
  for (let i = 0; i < n; i += 1) {
    skew += step;
    if (ac) ac.currentTime += sound / 1000;
    const batch = [...rafs.values()];
    rafs.clear();
    for (const f of batch) f(performance.now());
  }
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
store.set('shincoach.musicIntro', '4');
const settle = (ms = 20) => new Promise((r) => setTimeout(r, ms));
async function waitFor(cond, what, ms = 4000) {
  const t0 = Date.now();
  while (!(await cond())) {
    if (Date.now() - t0 > ms) throw new Error(`기다림 넘침: ${what}`);
    await settle(10);
  }
}
const daily = async () => (await getDaily(clockDay())) || {};
const num = (v) => Number(v) || 0;
const tapRows = () => pianoOf(getProfileSnapshot().piano).log.filter((r) => r.m === 't');
let P;

before(async () => {
  console.warn = () => {};
  await initProfile();
  await loadToday();
  const PV = await import('../js/pianoview.js');
  PV.initMusic({ showView: () => {} });
  await PV.enterMusic();
  P = globalThis.window.__piano;
});

/** 무대 — 🎹 태블릿으로 치기 · 오른손 · 곡 전체 · 되풀이 */
function stage(loop = '한 번') {
  P.openSong('ode');
  button('🎹 태블릿으로 치기').click();
  button('오른손').click();
  button('곡 전체').click();
  button(loop).click();
}
/** 기다리는 걸음마다 맞는 건반 — 판 끝까지 (🔁 계속이면 다음 판 처음에서 멈춤) */
function playToEnd() {
  for (let g = 0; g < 5000 && P.S.running; g += 1) {
    const st = P.S.steps[P.S.si];
    if (P.S.waiting && st) for (const m of st.need) P.press(m);
    P.advance(0.25);
    if (P.S.t < -3.9 && P.S.si === 0 && g > 10) break;
  }
}
const keyY = () => P.G.keysTop + P.G.keysH * 0.9;
const whiteX = (k) => (k + 0.5) * P.G.kw;
const pdown = (id, y = keyY()) => ({ pointerId: id, offsetX: whiteX(3), offsetY: y, preventDefault() {} });

test('🔇 소리 멎음 — 연주 중 소리 시계가 0.5초 넘게 안 가면 하루 칸 · 2.5초 넘으면 따로 · 꺼져 있었으면 따로 · 그 판의 가장 긴 것은 🎹 치기 줄에', async () => {
  stage();
  const d0 = await daily();
  byId('pn-go').click();
  assert.ok(ac, '▶에 소리 장치를 깨운다');
  assert.equal(P.S.running, true);
  frames(60, 16, 0); // 새로 켠 소리 장치 — 시계가 처음 가기 전은 안 셈
  frames(3);
  assert.equal(P.S.passMute, 0, '켜지는 동안은 셈이 아니다');
  frames(25, 16, 0); // 0.4초 — 0.5초 아래
  frames(2);
  frames(50, 16, 0); // 0.8초
  frames(2);
  assert.equal(Math.round(P.S.passMute), 800, '벽시계 − 소리 시계');
  ac.state = 'suspended';
  frames(190, 16, 0); // 3.04초 — 소리 장치가 꺼져 있었다
  ac.state = 'running';
  frames(2);
  await waitFor(async () => num((await daily()).pnMuteN) - num(d0.pnMuteN) === 2, '소리 멎음 두 번');
  let d1 = await daily();
  assert.equal(num(d1.pnMuteLong) - num(d0.pnMuteLong), 1, '2.5초 넘은 것');
  assert.equal(num(d1.pnMuteOff) - num(d0.pnMuteOff), 1, '소리 장치가 꺼져 있던 것');
  assert.equal(Math.round(P.S.passMute), 3040);
  // 화면이 멈칫한 동안 소리는 돌았다 — ⚠️ 멈칫만 · 🔇 아님
  frames(1, 1500);
  frames(2);
  await waitFor(async () => num((await daily()).pnStallN) - num(d0.pnStallN) === 1, '화면 멈칫');
  // 꺼졌던 뒤 다음 끊김 — 켜진 채 시계만 안 간 것은 꺼짐이 아니다(꺼짐 표시가 다음 번까지 남지 않는다)
  frames(35, 16, 0); // 0.56초
  frames(2);
  await waitFor(async () => num((await daily()).pnMuteN) - num(d0.pnMuteN) === 3, '세째 끊김');
  assert.equal(num((await daily()).pnMuteOff) - num(d0.pnMuteOff), 1, '꺼짐은 그대로 한 번');
  // 멈춰 있을 때는 안 셈
  byId('pn-go').click();
  assert.equal(P.S.running, false);
  frames(100, 16, 0);
  frames(2);
  // 소리가 끊긴 채 ⏸ — 거기까지를 한 번으로
  byId('pn-go').click();
  frames(3);
  frames(40, 16, 0); // 0.64초
  byId('pn-go').click();
  await waitFor(async () => num((await daily()).pnMuteN) - num(d0.pnMuteN) === 4, '⏸ 때 끊긴 것');
  d1 = await daily();
  assert.equal(num(d1.pnMuteLong) - num(d0.pnMuteLong), 1);
  assert.equal(num(d1.pnMuteOff) - num(d0.pnMuteOff), 1, '켜진 채 시계만 안 간 것은 꺼짐이 아니다');
  // 판 끝 — 그 판의 가장 긴 것이 기록 줄에 · 다음 판은 0부터
  const at = tapRows().length;
  byId('pn-go').click();
  playToEnd();
  await waitFor(() => tapRows().length === at + 1, '판 끝 저장');
  assert.equal(tapRows().at(-1).mu, 3040);
  assert.equal(tapRows().at(-1).st, 1500);
  assert.equal(P.S.passMute, 0, '다음 판은 0부터');
});

test('🔇 판 끝까지 이어진 소리 멎음도 그 판 몫 · 끊김이 없던 판은 기록 줄에 칸이 없다', async () => {
  stage();
  const d0 = await daily();
  byId('pn-go').click();
  frames(3);
  frames(45, 16, 0); // 0.72초 끊긴 채로 판이 끝난다
  const at = tapRows().length;
  playToEnd();
  await waitFor(() => tapRows().length === at + 1, '판 끝 저장');
  assert.equal(tapRows().at(-1).mu, 720);
  await waitFor(async () => num((await daily()).pnMuteN) - num(d0.pnMuteN) === 1, '하루 칸');
  byId('pn-go').click();
  frames(5);
  playToEnd();
  await waitFor(() => tapRows().length === at + 2, '다음 판 저장');
  assert.equal('mu' in tapRows().at(-1), false);
});

test('🐢 느린 장면 — 화면 한 장이 0.2~1초면 셈(1초 넘으면 ⚠️ 멈칫만) · 화면마다 쓰지 않고 멈출 때 한 번에 · 멈춰 있을 때는 안 셈', async () => {
  stage();
  const d0 = await daily();
  byId('pn-go').click();
  frames(3);
  frames(3, 300);
  frames(1, 199);
  frames(1, 1200);
  frames(2);
  assert.equal(P.S.diag.slowN, 3);
  await settle(40);
  assert.equal(num((await daily()).pnSlowN), num(d0.pnSlowN), '연주 중엔 아직 안 씀');
  byId('pn-go').click();
  await waitFor(async () => num((await daily()).pnSlowN) - num(d0.pnSlowN) === 3, '멈출 때 한 번에');
  const d1 = await daily();
  assert.equal(num(d1.pnSlowMs) - num(d0.pnSlowMs), 900);
  assert.equal(num(d1.pnStallN) - num(d0.pnStallN), 1, '1.2초는 멈칫');
  assert.equal(num(d1.pnMuteN), num(d0.pnMuteN), '소리는 같이 갔다');
  frames(3, 400);
  assert.equal(P.S.diag.slowN, 0, '멈춰 있을 때');
  // 판 끝에도 한 번에
  byId('pn-go').click();
  frames(2, 250);
  playToEnd();
  await waitFor(async () => num((await daily()).pnSlowN) - num(d0.pnSlowN) === 5, '판 끝에');
});

test('🐢 🔁 계속 — 판이 이어져도 판 끝마다 하루 칸에 (멈출 때를 기다리지 않는다)', async () => {
  stage('🔁 계속');
  const d0 = await daily();
  byId('pn-go').click();
  frames(2, 250);
  playToEnd();
  assert.equal(P.S.running, true, '다음 판이 이어진다');
  await waitFor(async () => num((await daily()).pnSlowN) - num(d0.pnSlowN) === 2, '판 끝에');
  byId('pn-go').click();
});

test('✋ 누름 끊김 — 건반을 누른 손가락을 가로채면(pointercancel) 셈 · 뗀 손가락·누른 적 없는 손가락·건반 밖은 안 셈 · 떠날 때 한 번에', async () => {
  stage();
  const d0 = await daily();
  const cv = canvas();
  cv.fire('pointerdown', pdown(1));
  assert.equal(P.S.held.size, 1);
  cv.fire('pointercancel', pdown(1));
  assert.equal(P.S.held.size, 0, '가로챈 손가락의 소리는 꺼짐');
  cv.fire('pointerdown', pdown(2));
  cv.fire('pointerup', pdown(2));
  cv.fire('pointercancel', pdown(3));
  cv.fire('pointerdown', pdown(4, 5));
  cv.fire('pointercancel', pdown(4, 5));
  assert.equal(P.S.diag.cancel, 1);
  // 건반에서 시작해 위로 미끄러져 나간 손가락도 — 가로챈 것은 같다 (Codex 218차 P3 · 그대로) · 같은 손가락을 두 번 가로채도 한 번
  cv.fire('pointerdown', pdown(5));
  cv.fire('pointermove', pdown(5, 5));
  assert.equal(P.S.held.size, 0, '건반을 벗어나면 소리는 이미 꺼짐');
  cv.fire('pointercancel', pdown(5, 5));
  cv.fire('pointercancel', pdown(5, 5));
  assert.equal(P.S.diag.cancel, 2);
  await settle(40);
  assert.equal(num((await daily()).pnCancelN), num(d0.pnCancelN), '아직 안 씀');
  byId('btn-music-back').click();
  await waitFor(async () => num((await daily()).pnCancelN) - num(d0.pnCancelN) === 2, '떠날 때 한 번에');
  assert.equal(P.S.diag.cancel, 0);
});

test('🔇 🔁 계속 — 판이 바뀌는 사이 이어진 소리 멎음도 한 번으로 · 앞 판 줄엔 그 판까지 · 다음 판 줄엔 끝까지 잰 것 (Codex 218차 P2)', async () => {
  stage('🔁 계속');
  const d0 = await daily();
  byId('pn-go').click();
  frames(3);
  frames(19, 16, 0); // 판 끝 앞 0.304초
  const at = tapRows().length;
  playToEnd();
  assert.equal(P.S.running, true, '다음 판이 이어진다');
  await waitFor(() => tapRows().length === at + 1, '앞 판 저장');
  assert.equal('mu' in tapRows().at(-1), false, '앞 판에선 0.5초 아래');
  frames(190, 16, 0); // 다음 판에서 3.04초 더
  frames(2);
  await waitFor(async () => num((await daily()).pnMuteN) - num(d0.pnMuteN) === 1, '이어진 끊김 한 번');
  let d1 = await daily();
  assert.equal(num(d1.pnMuteLong) - num(d0.pnMuteLong), 1, '두 토막이 아니라 3.3초 한 번');
  assert.equal(Math.round(P.S.passMute), 3344);
  // 판 끝 앞 0.704초 → 앞 판 줄엔 그 판에서 가장 긴 것 · 끊김은 다음 판까지 이어서
  frames(44, 16, 0);
  playToEnd();
  await waitFor(() => tapRows().length === at + 2, '둘째 판 저장');
  assert.equal(tapRows().at(-1).mu, 3344, '그 판에서 가장 긴 것');
  assert.equal(P.S.passMute, 0, '다음 판 몫은 끊김이 끝날 때 끝까지 잰 것으로');
  frames(63, 16, 0);
  frames(2);
  await waitFor(async () => num((await daily()).pnMuteN) - num(d0.pnMuteN) === 2, '둘째 끊김');
  d1 = await daily();
  assert.equal(num(d1.pnMuteLong) - num(d0.pnMuteLong), 1, '1.7초는 긴 것이 아니다');
  assert.equal(Math.round(P.S.passMute), 1712, '다음 판 줄엔 끝까지 잰 것');
  // 판 끝에 아직 끊긴 것이 그 판에서 가장 길면 — 그 판 줄에
  frames(3);
  frames(150, 16, 0); // 2.4초
  playToEnd();
  await waitFor(() => tapRows().length === at + 3, '셋째 판 저장');
  assert.equal(tapRows().at(-1).mu, 2400);
  byId('pn-go').click(); // ⏸ — 끊김은 여기서 한 번
  await waitFor(async () => num((await daily()).pnMuteN) - num(d0.pnMuteN) === 3, '셋째 끊김');
});

test('🔇🐢✋ 저장이 실패하면 날짜째 두었다가 다음 저장 때 함께 — 한 번씩만 (Codex 218차 P3)', async () => {
  stage();
  const d0 = await daily();
  byId('pn-go').click();
  frames(3);
  frames(2, 300); // 🐢 둘
  fakeIdb.failNext('daily');
  byId('pn-go').click(); // ⏸ — 이 저장이 실패
  await waitFor(() => fakeIdb.failsLeft() === 0, '저장 실패 흉내');
  await waitFor(() => P.S.diagOwe.size === 1, '날짜째 두었다');
  assert.equal(num((await daily()).pnSlowN), num(d0.pnSlowN), '아직 안 들어감');
  byId('pn-go').click();
  frames(3);
  frames(1, 300); // 🐢 하나 더 — 밀린 몫과 같은 칸에 더해진다
  frames(40, 16, 0);
  frames(2); // 🔇 한 번 — 끝날 때 바로 쓰며 밀린 🐢도 함께
  await waitFor(async () => num((await daily()).pnSlowN) - num(d0.pnSlowN) === 3, '밀린 몫');
  const d1 = await daily();
  assert.equal(num(d1.pnSlowMs) - num(d0.pnSlowMs), 900);
  assert.equal(num(d1.pnMuteN) - num(d0.pnMuteN), 1);
  assert.equal(P.S.diagOwe.size, 0);
  byId('pn-go').click();
  await settle(40);
  const d2 = await daily();
  assert.deepEqual([num(d2.pnSlowN) - num(d0.pnSlowN), num(d2.pnMuteN) - num(d0.pnMuteN)], [3, 1], '두 번 쓰지 않는다');
});
