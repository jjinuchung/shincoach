// 🐾 v405 음악 포켓몬 안내 (2026-11-09 아버님 「가」) — node --test tests/music405.test.js
//   진우는 음악에서 포켓몬을 만나는 줄 모르고, 알아도 태블릿 화면 건반으로 얻는 줄 알 수 있다 →
//   홈 카드 줄 · 음악 화면 처음 한 번 안내 창(「알겠어요!」로 닫아야 본 것) · ♪ 칸 → 🐾을 누르면 다시 · 단추 「✋ 피아노로 다 쳤어요」 ·
//   📤 하루 줄 「🐾 음악 포켓몬 안내 창 N번 봄」 · 앱은 아직 피아노 소리를 못 듣는다(연결 전 — 「다 쳤어요」는 약속)
import { fakeIdb } from './fakeidb.js'; // ★ db.js·xp.js보다 먼저
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PIANO_DAILY, pianoDayLine, pianoMd, pianoOf } from '../js/piano.js';
import { SUBJECTS, cardSubject } from '../js/home.js';
import { ROSTER } from '../js/pokemon.js';
import { initProfile, getProfileSnapshot, houseDo } from '../js/xp.js';
import { getDaily } from '../js/db.js';
import { loadToday, clockDay } from '../js/timelimit.js';

void fakeIdb;
const src = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const MUSIC = ROSTER.filter((r) => r.subject === 'music').map((r) => r.id);

// ───────────────────── 순수·잇기 ─────────────────────

test('🏠 홈 음악 카드 — 「🐾 끝까지 치면 음악 포켓몬!」(v413 — 화면 건반으로도) · 다른 과목 카드 줄은 그대로', () => {
  const mu = SUBJECTS.find((s) => s.key === 'music');
  assert.equal(mu.desc, '🐾 끝까지 치면 음악 포켓몬!');
  assert.equal(cardSubject(mu, {}).desc, mu.desc, '카드에 그대로 간다');
  assert.deepEqual(SUBJECTS.filter((s) => s.key !== 'music').map((s) => s.desc), ['영상 보고 따라 말하기', '분수부터 차근차근', '글 읽고 작품 카드 모으기', '내 의견과 이유 말하기']);
});

test('📤 하루 줄 — 안내 창만 본 날도 한 줄 · 다른 것 뒤에 · music.md 읽는 법에 새 단추 이름 · 판 v405', () => {
  assert.ok(PIANO_DAILY.includes('pnIntro'));
  assert.equal(pianoDayLine({ pnIntro: 1 }), '🐾 음악 포켓몬 안내 창 1번 봄');
  assert.equal(pianoDayLine({ pnTapN: 1, pnTapOk: 1, pnCoins: 5, pnIntro: 2 }), '🎹 태블릿 치기 끝까지 1판(잘 친 판 1 · 💰5) · 🐾 음악 포켓몬 안내 창 2번 봄');
  assert.equal(pianoDayLine({ pnIntro: 0 }), '');
  const md = pianoMd({ notes: 1 }, '2026-11-09');
  assert.match(md, /「✋ 피아노로 다 쳤어요」\(v404까지 「다 쳤어요 ✋」\)를 누른 것 — 진짜로 쳤는지는 앱이 모른다\(피아노 연결 전\)/);
  assert.match(src('js/upload.js'), /🐾 안내 창 봄 = 「음악 포켓몬은 진짜 피아노로」 안내를 「알겠어요!」로 닫은 번\(v405\)/);
  assert.ok(Number((/CACHE_VERSION = 'v(\d+)'/.exec(src('sw.js')) || [])[1]) >= 405, 'sw v405 이상');
  assert.ok(Number((/APP_VERSION = 'v(\d+)'/.exec(src('js/version.js')) || [])[1]) >= 405, '앱 판 v405 이상');
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
let storeBroken = false;
globalThis.localStorage = {
  getItem: (k) => { if (storeBroken) throw new Error('막힘'); return store.has(k) ? store.get(k) : null; },
  setItem: (k, v) => { if (storeBroken) throw new Error('막힘'); store.set(k, String(v)); },
  removeItem: (k) => { store.delete(k); },
};
store.set('shincoach.pianoSongsAt', String(Date.now()));
const settle = (ms = 20) => new Promise((r) => setTimeout(r, ms));
async function waitFor(cond, what, ms = 4000) {
  const t0 = Date.now();
  while (!cond()) {
    if (Date.now() - t0 > ms) throw new Error(`기다림 넘침: ${what}`);
    await settle(10);
  }
}
const setPiano = (piano) => houseDo((p) => { p.piano = piano; return { ok: true }; });
const text = (id) => (byId(id) ? byId(id).textContent : '');
const introN = async () => Number(((await getDaily(clockDay())) || {}).pnIntro) || 0;
let P;
let PV;

before(async () => {
  console.warn = () => {};
  await initProfile();
  await loadToday();
  await setPiano({ notes: 5, days: {} }); // 다섯 칸이 찼고 아직 안 온 몫 하나 — 안내 창이 먼저, 온 창은 그 뒤
  PV = await import('../js/pianoview.js');
  PV.initMusic({ showView: () => {}, requirePin: (ok) => ok() }); // 👨‍👩‍👦 어른 확인(v417)은 바로 맞음으로 — 확인 창 자체는 pianoflow402
  await PV.enterMusic();
  P = globalThis.window.__piano;
});

test('화면 — 처음 들어오면 안내 창: 🎧 · 진짜 피아노 · 새 단추 이름 · ♪ 다섯 · (v413) 🎹 화면 건반도 「곡 전체」 → 건반 열 칸 · 💰도 · 보상·남은 수 문구 없음 · 음악 포켓몬 셋', async () => {
  const box = byId('pn-intro');
  assert.ok(box, '안내 창');
  assert.equal(box.parent, VIEW, '창은 음악 화면 안');
  const t = box.textContent;
  for (const w of ['🎵 음악 포켓몬을 만나요!', '🎧 진짜 피아노로', '「🎧 듣고 따라 치기」를 골라요', '앱이 치는 소리를 들으며 진짜 피아노로 끝까지 따라 쳐요', '「✋ 피아노로 다 쳤어요」를 누르고 아빠·엄마 확인을 받으면 ♪ 하나', '♪♪♪♪♪가 다 차면 🐾 음악 포켓몬이 와요!',
    '🎹 태블릿 화면 건반으로', '「🎹 태블릿으로 치기」에서 📖 진우 책 곡의 「곡 전체」를 골라요', '끝까지 잘 치면 건반 칸 하나 — 💰도 받아요', '곡은 섞어 쳐도 돼요 — 🎼 연습곡은 💰만 받아요', // v423
    '이 하루에 다 차면 🐾 음악 포켓몬이 와요! (하루 한 마리)']) assert.ok(t.includes(w), `글: ${w}`);
  assert.ok(!t.includes('는 💰를 받아요'), 'v405의 「화면 건반은 💰」 말은 없다 (v413)');
  const ten = all.filter((e) => { if (e.className !== 'pn-tkeys') return false; for (let x = e; x; x = x.parent) if (x === box) return true; return false; });
  assert.equal(ten.length, 1, '빈 건반 열 칸 그림 하나');
  assert.equal(ten[0].children.length, 10, '건반 열 — 수는 글로 안 쓴다');
  assert.doesNotMatch(t, /\d/, '글에 보상 수·남은 수 없음 (단계 앞 1.~4.는 <ol>이 그리는 차례 번호 — 셈 문구가 아니라 둔다 · Codex 210차 P3)');
  for (const id of [433, 358, 1024]) {
    assert.ok(MUSIC.includes(id), `${id}는 음악 포켓몬`);
    assert.ok(t.includes(ROSTER.find((r) => r.id === id).ko));
  }
  assert.equal(button('알겠어요!').parent.parent, box, '닫는 단추는 안내 창에');
});

test('화면 — 안내 창이 떠 있는 동안 온 포켓몬은 뒤에 선다 · 「알겠어요!」로 닫으면 온 창 · 본 것으로 적힘 · 📤 하루 칸', async () => {
  await waitFor(() => pianoOf(getProfileSnapshot().piano).mons === 1, '들어올 때 밀린 몫 받기 — 도감엔 이미 들어갔다');
  await settle(30);
  assert.equal(byId('pn-arrive'), null, '안내 창 위에 겹치지 않는다');
  assert.equal(await introN(), 0, '닫기 전엔 본 것이 아니다');
  button('알겠어요!').click();
  assert.equal(byId('pn-intro'), null);
  assert.ok(byId('pn-arrive'), '닫으면 기다리던 온 창');
  assert.match(text('pn-arrive'), /🎵 새 음악 포켓몬이 왔어요!/);
  assert.equal(store.get('shincoach.musicIntro'), '4', 'v423 판 안내를 본 것');
  await settle(30);
  assert.equal(await introN(), 1, '📤 「안내 창 1번 봄」');
  button('좋아요!').click();
  assert.equal(byId('pn-arrive'), null);
  await PV.enterMusic();
  await settle(40);
  assert.equal(byId('pn-intro'), null, '본 뒤엔 들어와도 안 뜬다');
});

test('화면 — 🎧 무대: 「✋ 피아노로 다 쳤어요」 · ♪ 칸 → 🐾 · 누르면 안내 창이 다시 · 🎹 태블릿으로 치기에선 건반 열 칸(v413)', async () => {
  P.openSong('ode');
  button('🎧 듣고 따라 치기').click();
  const slots = byId('pn-slots');
  assert.equal(slots.tagName, 'BUTTON', '♪ 칸은 누르는 단추');
  assert.equal(slots.hidden, false);
  assert.match(slots.innerHTML, /<span class="pn-slots">(<span class="">♪<\/span>){5}<\/span><span class="pn-slots-mon">→ 🐾<\/span>$/);
  assert.equal(slots.getAttribute('aria-label'), '음표 칸 — 음악 포켓몬 안내');
  // 연주 도중 ♪ 칸을 누르면 — 창이 악보를 가리니 멈추고 자리는 그대로 · 닫아도 저절로 가지 않는다 (Codex 210차 P2)
  byId('pn-go').click();
  P.advance(6);
  const at = P.S.t;
  assert.deepEqual([P.S.running, P.S.auto.size > 0], [true, true], '연주 중 · 앱이 치는 소리');
  slots.click();
  assert.ok(byId('pn-intro'));
  assert.deepEqual([P.S.running, P.S.t, P.S.auto.size, byId('pn-go').textContent], [false, at, 0, '▶ 시작'], '⏸처럼 멈춤 · 자리 그대로 · 소리 멈춤');
  button('알겠어요!').click();
  assert.equal(P.S.running, false, '▶로 이어 친다');
  byId('pn-go').click();
  assert.equal(P.S.running, true);
  P.advance(100);
  assert.equal(button('✋ 피아노로 다 쳤어요').hidden, false, '끝까지 연주하면 새 이름의 단추');
  assert.match(byId('pn-toast').innerHTML, /진짜 피아노로 끝까지 쳤으면 「✋ 피아노로 다 쳤어요」를 누르고 아빠·엄마 확인을 받아요\./); // v417
  assert.throws(() => button('✋ 다 쳤어요'), /단추 없음/, '옛 이름은 없다');
  slots.click();
  assert.ok(byId('pn-intro'), '♪ 칸을 누르면 안내 창');
  slots.click();
  assert.equal(all.filter((e) => e.id === 'pn-intro' && attached(e)).length, 1, '두 번 눌러도 창은 하나');
  button('알겠어요!').click();
  assert.equal(byId('pn-intro'), null);
  await settle(30);
  assert.equal(await introN(), 3, '다시 본 것도 셈');
  // 저장이 실패하면 — 알림도 새 단추 이름으로 · 다시 누를 수 있다
  fakeIdb.failNext('profile');
  byId('pn-done').click();
  await waitFor(() => !P.S.saving, '실패한 저장');
  assert.equal(fakeIdb.failsLeft(), 0, '실패는 이 저장이 먹었다');
  assert.match(byId('pn-toast').innerHTML, /「✋ 피아노로 다 쳤어요」를 한 번 더 눌러 주세요\./);
  assert.equal(byId('pn-done').hidden, false);
  byId('pn-done').click();
  await waitFor(() => !P.S.saving, '다 쳤어요 저장');
  assert.equal(pianoOf(getProfileSnapshot().piano).notes, 6, '새 이름 단추도 음표 칸');
  button('🎹 태블릿으로 치기').click();
  assert.equal(byId('pn-slots').hidden, false, '태블릿 치기엔 건반 열 칸 (v413)');
  assert.match(byId('pn-slots').innerHTML, /^<span class="pn-tkeys">(<span class=""><\/span>){10}<\/span><span class="pn-slots-mon">→ 🐾<\/span>$/);
  assert.equal(byId('pn-slots').getAttribute('aria-label'), '건반 칸 — 음악 포켓몬 안내');
});

test('화면 — 온 창이 떠 있으면 안내 창은 다음에 들어올 때 · 이 기기 저장이 막혀도 안 멈춤(그때는 들어올 때마다)', async () => {
  store.delete('shincoach.musicIntro');
  await setPiano({ notes: 10, mons: 1, days: {} });
  await PV.enterMusic(); // 안내 창이 먼저 뜬다 — 온 창은 뒤에
  assert.ok(byId('pn-intro'));
  await waitFor(() => pianoOf(getProfileSnapshot().piano).mons === 2, '밀린 몫 받기 — 온 창은 안내 뒤에 줄 선다'); // 전체 시험 때 저장이 늦다(v406 전체 시험)
  await settle(20);
  // 안내를 닫지 않은 채 다른 화면에 갔다 와도 창은 하나
  PV.leaveMusic();
  await PV.enterMusic();
  await settle(40);
  assert.equal(all.filter((e) => e.id === 'pn-intro' && attached(e)).length, 1);
  assert.equal(byId('pn-arrive'), null);
  button('알겠어요!').click();
  assert.ok(byId('pn-arrive'), '닫으면 온 창');
  // 온 창이 떠 있는 채로 들어오면 — 안내 창을 겹쳐 띄우지 않는다
  store.delete('shincoach.musicIntro');
  await PV.enterMusic();
  assert.equal(byId('pn-intro'), null, '온 창 위에 겹치지 않는다');
  button('좋아요!').click();
  assert.equal(byId('pn-intro'), null, '온 창을 닫아도 그 자리에서 뜨지 않는다');
  await PV.enterMusic();
  assert.ok(byId('pn-intro'), '다음에 들어올 때');
  // 저장이 막힌 기기 — 닫히기는 한다 · 본 것이 안 적혀서 다음에 또
  storeBroken = true;
  try {
    button('알겠어요!').click();
    assert.equal(byId('pn-intro'), null);
    await PV.enterMusic();
    assert.ok(byId('pn-intro'), '못 적었으니 또 뜬다');
    button('알겠어요!').click();
  } finally { storeBroken = false; }
});
