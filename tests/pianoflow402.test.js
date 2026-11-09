// 🎹 v402 음악 화면 흐름 (Codex 204차 고친 것) — pianoview.js를 가짜 화면으로 직접 돌린다
//   🔁 계속·⟲ 처음부터도 ⏳ 관문 · 앱이 친 음은 멈춤·떠남·숨김·판 새로 때 끈다 · 🎒·📊 갔다 오면 판 그대로 ·
//   「🔁 다시 받기」는 💰만(끝낸 판 하루 칸은 한 번) · 늦게 끝난 화면 꺼짐 막기 요청은 바로 놓는다 · 음표 알림 말에 칸 수 없음
import { fakeIdb } from './fakeidb.js'; // ★ db.js·xp.js보다 먼저
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { applyDailyDelta, getDaily } from '../js/db.js';
import { initProfile, flushProfile, getProfileSnapshot } from '../js/xp.js';
import { loadToday, clockDay, isLocked } from '../js/timelimit.js';

// ───────────────────── 가짜 화면 ─────────────────────

const all = [];
class El {
  constructor(tag) {
    this.tagName = String(tag).toUpperCase();
    this.children = []; this.parent = null; this.on = {}; this.attrs = {}; this.style = {};
    this.hidden = false; this._text = ''; this._html = ''; this.className = ''; this.id = ''; this.value = '';
    all.push(this);
  }
  get textContent() { return this._text + this.children.map((c) => c.textContent).join(''); }
  set textContent(v) { for (const c of this.children) c.parent = null; this.children = []; this._text = String(v); }
  get innerHTML() { return this._html; }
  set innerHTML(v) { this.textContent = ''; this._html = String(v); }
  appendChild(c) { c.parent = this; this.children.push(c); return c; }
  addEventListener(t, f) { (this.on[t] ||= []).push(f); }
  fire(t, e = {}) { for (const f of this.on[t] || []) f(e); }
  click() { this.fire('click', { offsetX: 10, offsetY: 10 }); }
  setAttribute(k, v) { this.attrs[k] = String(v); }
  getAttribute(k) { return k in this.attrs ? this.attrs[k] : null; }
  getContext() { return CTX; }
  getBoundingClientRect() { return { top: 80, left: 0, width: 1000, height: 600 }; }
  get clientWidth() { return 1000; }
  setPointerCapture() {}
}
const CTX = new Proxy({}, {
  get: (o, k) => (k in o ? o[k] : k === 'createLinearGradient' ? () => ({ addColorStop() {} }) : () => {}),
  set: (o, k, v) => { o[k] = v; return true; },
});
const ROOT = new El('html');
for (const id of ['music-main', 'btn-music-back']) { const e = new El('div'); e.id = id; ROOT.appendChild(e); }
const attached = (e) => { for (let x = e; x; x = x.parent) if (x === ROOT) return true; return false; };
function byId(id) {
  for (let i = all.length - 1; i >= 0; i -= 1) if (all[i].id === id && attached(all[i])) return all[i];
  return null;
}
function button(text) {
  for (let i = all.length - 1; i >= 0; i -= 1) {
    const e = all[i];
    if (e.tagName === 'BUTTON' && e.textContent.trim() === text && attached(e)) return e;
  }
  throw new Error(`단추 없음: ${text}`);
}
const docOn = {};
globalThis.document = {
  hidden: false,
  documentElement: ROOT,
  getElementById: byId,
  createElement: (t) => new El(t),
  addEventListener: (t, f) => { (docOn[t] ||= []).push(f); },
  querySelectorAll: () => [],
};

// 소리 — 실제로 울리지 않고 노드만
class Param {
  constructor(v = 1) { this.value = v; }
  setValueAtTime() {} exponentialRampToValueAtTime() {} setTargetAtTime() {} cancelScheduledValues() {}
}
class FakeAC {
  constructor() { this.currentTime = 0; this.state = 'running'; this.destination = {}; FakeAC.last = this; }
  createGain() { return { gain: new Param(1), connect() {}, disconnect() { this.cut = (this.cut || 0) + 1; } }; }
  createDynamicsCompressor() { return { connect() {} }; }
  createOscillator() { return { type: '', frequency: new Param(440), connect() {}, start() {}, stop(t) { this.stopAt = t; }, onended: null }; }
  resume() { return Promise.resolve(); }
}
globalThis.window = { addEventListener() {}, innerHeight: 800, devicePixelRatio: 1, AudioContext: FakeAC };
globalThis.requestAnimationFrame = () => 1;
globalThis.cancelAnimationFrame = () => {};

// 화면 꺼짐 막기 — 요청이 언제 끝날지 시험이 정한다 · 놓으면 'release' 알림은 조금 뒤에(진짜 브라우저처럼)
const wakeReqs = [];
function sentinel() {
  return {
    released: false, on: {},
    addEventListener(t, f) { this.on[t] = f; },
    release() { this.released = true; setTimeout(() => { if (this.on.release) this.on.release(); }, 5); return Promise.resolve(); },
  };
}
Object.defineProperty(globalThis, 'navigator', {
  value: { wakeLock: { request: () => new Promise((ok) => { const s = sentinel(); wakeReqs.push({ s, done: () => ok(s) }); }) } },
  configurable: true,
});

const store = new Map();
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => { store.set(k, String(v)); },
  removeItem: (k) => { store.delete(k); },
};
store.set('shincoach.pianoSongsAt', String(Date.now())); // 곡 받기는 10분 안 — 묻지 않는다

const settle = (ms = 30) => new Promise((r) => setTimeout(r, ms));
/** 저장은 프로필 저장 줄 뒤에 서므로 걸리는 때가 들쭉날쭉하다 — 될 때까지 기다린다 */
async function waitFor(cond, what, ms = 4000) {
  const t0 = Date.now();
  while (!cond()) {
    if (Date.now() - t0 > ms) throw new Error(`기다림 넘침: ${what}`);
    await settle(10);
  }
}
let PV;
let P;

/** 무대를 새로 — 곡·방법·손·어디를·되풀이를 단추로 고른다 */
function stage({ mode = 'listen', hand = '오른손', line = '1줄', loop = '한 번' } = {}) {
  P.openSong('ode');
  button(mode === 'tap' ? '🎹 태블릿으로 치기' : '🎧 듣고 따라 치기').click();
  button(hand).click();
  button(line).click();
  button(loop).click();
}
const go = () => byId('pn-go').click();
/** 🎹 기다리는 걸음마다 맞는 건반을 눌러 판 끝까지 */
function playTap(stopAt = Infinity) {
  for (let g = 0; g < 5000 && P.S.running && P.S.si < stopAt; g += 1) {
    const st = P.S.steps[P.S.si];
    if (P.S.waiting && st) for (const m of st.need) P.press(m);
    P.advance(0.25);
  }
}
async function setMusicUsed(sec) {
  const cur = (await getDaily(clockDay())) || {};
  await applyDailyDelta(clockDay(), { musicTime: sec - (Number(cur.musicTime) || 0) });
  await loadToday();
}

before(async () => {
  console.warn = () => {};
  await initProfile();
  await loadToday();
  PV = await import('../js/pianoview.js');
  PV.initMusic({ showView: () => {} });
  await PV.enterMusic();
  P = globalThis.window.__piano;
});

test('🔁 계속 — 다음 판도 새로 시작이라 ⏳ 관문 · 잠겼으면 그 경계에서 멈춘다(지금 판은 끝낸 것으로)', async () => {
  await setMusicUsed(0);
  stage({ loop: '🔁 계속' });
  go();
  assert.equal(P.S.running, true);
  P.advance(100);
  assert.deepEqual([P.S.running, P.S.passDone, P.S.t], [true, true, -4], '안 잠겼으면 다음 판을 이어서');
  await setMusicUsed(2400);
  assert.equal(isLocked('music'), true);
  P.advance(100);
  assert.deepEqual([P.S.running, P.S.passDone, P.S.auto.size], [false, true, 0], '잠기면 판 경계에서 멈춤 · 끝낸 판의 「다 쳤어요」는 그대로');
  assert.equal(byId('pn-done').hidden, false);
  go();
  assert.equal(P.S.running, false, '잠긴 동안 ▶ 시작도 안 됨');
  await setMusicUsed(0);
});

test('⟲ 처음부터 — 연주 중이면 새 판이라 ⏳ 관문 · 멈춰 있으면 자리만', async () => {
  await setMusicUsed(0);
  stage();
  go();
  P.advance(6);
  button('⟲ 처음부터').click();
  assert.deepEqual([P.S.running, P.S.t], [true, -4], '안 잠겼으면 처음부터 이어서');
  P.advance(6);
  await setMusicUsed(2400);
  button('⟲ 처음부터').click();
  assert.deepEqual([P.S.running, P.S.t, P.S.auto.size], [false, -4, 0], '잠겼으면 처음 자리에서 멈춤');
  await setMusicUsed(0);
});

test('🎧 앱이 친 음 — ⏸ 멈춤 · 다른 화면 · 화면 숨김 · 처음부터 · 판 새로 때 모두 끈다', async () => {
  await setMusicUsed(0);
  stage({ hand: '양손' });
  // 울리는 음을 들고 오디오 시각을 멀리 옮긴다 — 끄면 두 소리 모두 「지금 + 0.5초」로 다시 예약된다 (원래 예약은 친 때 + 음 길이, Codex 205차 P3)
  let now = 0;
  const held = () => { assert.ok(P.S.auto.size > 0, '울리는 중'); now += 100; FakeAC.last.currentTime = now; return [...P.S.auto]; };
  const sound = () => { button('⟲ 처음부터').click(); go(); P.advance(4.5); P.advance(1); return held(); };
  const off = (vs, what) => { for (const v of vs) assert.deepEqual([v.o1.stopAt, v.o2.stopAt], [now + 0.5, now + 0.5], `${what} — 소리를 줄여 끈다`); };
  let vs = sound();
  go();
  assert.deepEqual([P.S.running, P.S.auto.size], [false, 0], '⏸ 멈춤');
  off(vs, '⏸ 멈춤');
  vs = sound();
  PV.leaveMusic();
  assert.equal(P.S.auto.size, 0, '다른 화면');
  off(vs, '다른 화면');
  await PV.enterMusic();
  vs = sound();
  globalThis.document.hidden = true;
  for (const f of docOn.visibilitychange || []) f();
  globalThis.document.hidden = false;
  assert.deepEqual([P.S.running, P.S.auto.size], [false, 0], '화면 숨김');
  off(vs, '화면 숨김');
  vs = sound();
  button('⟲ 처음부터').click();
  assert.deepEqual([P.S.running, P.S.auto.size], [true, 0], '처음부터 — 옛 음은 끄고 이어서');
  off(vs, '처음부터');
  P.advance(5.5);
  vs = held();
  button('왼손').click();
  assert.equal(P.S.auto.size, 0, '손을 바꿔 판 새로');
  off(vs, '판 새로');
  // 다 울린 음은 스스로 빠지고 연결도 끊는다
  go(); P.advance(5.5);
  const v = [...P.S.auto][0];
  v.o1.onended();
  assert.ok(!P.S.auto.has(v));
  assert.equal(v.g.cut, 1, '다 울린 음은 연결을 끊는다');
  go();
});

test('🎒·📊 갔다 오면 — 하던 판·「다 쳤어요」·다시 받기 그대로 · 곡 목록에 가면 새 판', async () => {
  await setMusicUsed(0);
  stage();
  go();
  P.advance(100);
  assert.deepEqual([P.S.running, P.S.passDone], [false, true]);
  PV.leaveMusic();
  await PV.enterMusic();
  assert.equal(P.S.passDone, true, '「다 쳤어요」를 아직 안 눌렀으면 그대로');
  assert.equal(byId('pn-done').hidden, false);
  // 「다 쳤어요」를 눌렀는데 저장이 실패한 채 떠났다 — 돌아오면 다시 누를 수 있다
  fakeIdb.failNext('profile');
  byId('pn-done').click();
  PV.leaveMusic();
  await waitFor(() => !P.S.saving, '다 쳤어요 저장');
  await PV.enterMusic();
  assert.deepEqual([P.S.passDone, byId('pn-done').hidden], [true, false]);
  // 🎹 치던 판 한가운데서 떠났다 돌아온다
  stage({ mode: 'tap' });
  go();
  playTap(3);
  const mid = { t: P.S.t, si: P.S.si, ok: P.S.ok, steps: P.S.steps.length };
  assert.ok(mid.si === 3 && mid.ok >= 3);
  PV.leaveMusic();
  await PV.enterMusic();
  assert.deepEqual({ t: P.S.t, si: P.S.si, ok: P.S.ok, steps: P.S.steps.length }, mid, '판 그대로');
  assert.equal(P.S.running, false, '멈춘 채로');
  go();
  playTap();
  assert.equal(P.S.si, 0, '이어서 끝까지 쳤다(끝나면 처음 자리로)');
  await waitFor(() => byId('pn-toast').innerHTML.includes('끝까지 쳤어요!'), '💰 저장');
  // ← 곡 → 같은 곡이라도 새 판
  stage({ mode: 'tap' });
  go(); playTap(2);
  P.renderList();
  P.openSong('ode');
  assert.deepEqual([P.S.si, P.S.ok], [0, 0]);
});

test('🔁 다시 받기 — 💰만 다시 · 끝낸 판의 하루 칸은 한 번', async () => {
  await setMusicUsed(0);
  await flushProfile();
  const day = clockDay();
  const d0 = (await getDaily(day)) || {};
  const n0 = Number(d0.pnTapN) || 0;
  const ok0 = Number(d0.pnTapOk) || 0;
  const c0 = getProfileSnapshot().coins;
  stage({ mode: 'tap', line: '2줄' });
  go();
  fakeIdb.failNext('profile');
  playTap();
  await waitFor(() => !byId('pn-retry').hidden, '저장이 안 돼 다시 받기');
  assert.equal(fakeIdb.failsLeft(), 0);
  assert.equal(getProfileSnapshot().coins, c0);
  button('🔁 다시 받기').click();
  await waitFor(() => getProfileSnapshot().coins > c0, '다시 받은 💰');
  await settle(60);
  const d1 = await getDaily(day);
  assert.equal(getProfileSnapshot().coins - c0, 5, '한 줄 💰5 (오늘 둘째 판 — 하루 다섯 번 안)');
  assert.deepEqual([d1.pnTapN - n0, d1.pnTapOk - ok0], [1, 1], '한 판은 한 판');
  assert.equal(byId('pn-retry').hidden, true);
});

test('📵 화면 꺼짐 막기 — 늦게 끝난 요청은 떠났으면 바로 놓는다 · 옛 것의 늦은 알림이 새 것을 지우지 않는다', async () => {
  await setMusicUsed(0);
  stage();
  wakeReqs.length = 0;
  go();
  assert.equal(wakeReqs.length, 1);
  PV.leaveMusic();
  wakeReqs[0].done();
  await settle();
  assert.equal(wakeReqs[0].s.released, true, '떠난 뒤 끝난 요청은 바로 놓음');
  await PV.enterMusic();
  wakeReqs.length = 0;
  go(); wakeReqs[0].done(); await settle();
  const a = wakeReqs[0].s;
  assert.equal(a.released, false, '연주 중엔 잡고 있다');
  go(); // ⏸ — a를 놓는다 (알림은 조금 뒤)
  go(); // ▶ — 새 요청 b
  wakeReqs[1].done();
  await settle();
  const b = wakeReqs[1].s;
  assert.deepEqual([a.released, b.released], [true, false]);
  go(); // ⏸ — a의 늦은 알림이 b를 지웠다면 b를 못 놓는다
  assert.equal(b.released, true);
  // ▶⏸▶ 빠르게 — 먼저 끝난 옛 요청은 놓고 마지막 것만
  wakeReqs.length = 0;
  go(); go(); go();
  wakeReqs[0].done(); wakeReqs[1].done();
  await settle();
  assert.deepEqual([wakeReqs[0].s.released, wakeReqs[1].s.released], [true, false]);
  go();
  assert.equal(wakeReqs[1].s.released, true);
});

test('🎵 음표 알림 말 — ♪ 그림만 · 칸 수를 말로 쓰지 않는다', async () => {
  await setMusicUsed(0);
  stage();
  go();
  P.advance(100);
  byId('pn-done').click();
  await waitFor(() => !P.S.saving, '다 쳤어요 저장');
  const html = byId('pn-toast').innerHTML;
  assert.match(html, /음표를 채웠어요|음표가 가득 찼어요|오늘 음표 칸은 다 채웠어요/);
  assert.doesNotMatch(html, /다섯 칸|한 칸|\d\s*칸/);
  assert.match(html, /♪/);
});
