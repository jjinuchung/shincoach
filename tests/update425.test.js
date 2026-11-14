// 🆕 새 버전 받기 (v425 — 아버님 「추천대로」 · Codex 228차 「추천대로」 일곱): node --test tests/update425.test.js
// 받는 중 % (홈 띠·딱지·⚙ 줄) → 다 받으면 큰 창 [지금 바꾸기][나중에] → 나중에면 딱지 「🆕 새 버전 대기 중」 → 지금 바꾸기 = 저장 두 번 → 다 됐을 때만 넘겨받기 → 다시 켬
// 새 판은 다 받아도 기다린다(sw.js install에 skipWaiting 없음 · 「지금 바꾸기」 메시지로만) · 켜 둔 채로 30분마다·돌아올 때 확인 · 서비스워커는 제 캐시에서만
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { updReduce, updPct, updLine, UPD0, CHECK_EVERY, CHECK_GAP, RELOAD_WAIT, SETTLE_MS } from '../js/update.js';
import { APP_VERSION, cachedVersion, SHELL_DONE } from '../js/version.js';

const src = (f) => fs.readFileSync(new URL(`../${f}`, import.meta.url), 'utf8').replace(/\r\n/g, '\n');

test('상태 바꾸기(순수) — 받는 중 → % → 다 받음 · 받는 중이 아닐 때 온 % 알림은 무시(다 받은 뒤·실패한 뒤) · 받다 끊기면 처음으로 · 나중에는 다 받은 뒤에만 · 다른 창이 바꿈은 남는다', () => {
  assert.equal(updReduce({ ...UPD0 }, { type: 'progress', done: 3, total: 9 }).phase, 'none', '받는 중이 아니면 % 알림으로 「받는 중」이 되지 않는다 (Codex 228차 P2-4)');
  let s = { ...UPD0 };
  s = updReduce(s, { type: 'getting' });
  assert.deepEqual([s.phase, s.done, s.total], ['getting', 0, 0]);
  assert.equal(updPct(s), 0, '전체를 모르면 0');
  s = updReduce(s, { type: 'progress', done: 84, total: 167 });
  assert.deepEqual([s.phase, s.done, s.total, updPct(s)], ['getting', 84, 167, 50]);
  s = updReduce(s, { type: 'progress', done: 999, total: 167 });
  assert.deepEqual([s.done, updPct(s)], [167, 100], '받은 수는 전체를 넘지 않는다');
  s = updReduce(s, { type: 'progress', done: -3, total: 'x' });
  assert.deepEqual([s.done, s.total, updPct(s)], [0, 0, 0], '이상한 값은 0');
  s = updReduce(s, { type: 'progress', done: 10, total: 20 });
  assert.equal(updReduce(s, { type: 'later' }), s, '받는 중엔 「나중에」가 없다');
  s = updReduce(s, { type: 'ready' });
  assert.deepEqual([s.phase, s.done, s.total, updPct(s), s.later, s.reloadOnly], ['ready', 20, 20, 100, false, false]);
  assert.equal(updReduce(s, { type: 'progress', done: 1, total: 20 }), s, '다 받은 뒤 늦게 온 % 알림');
  assert.equal(updReduce(s, { type: 'getting' }), s, '다 받은 뒤엔 다시 받는 중으로 안 간다');
  assert.equal(updReduce(s, { type: 'failed' }), s, '다 받은 뒤의 실패 알림은 무시');
  s = updReduce(s, { type: 'later' });
  assert.equal(s.later, true);
  s = updReduce(s, { type: 'ready', reloadOnly: true });
  assert.deepEqual([s.later, s.reloadOnly], [true, true], '다른 창이 바꿨어도 「나중에」는 남는다');
  assert.equal(updReduce(s, { type: 'ready' }).reloadOnly, true, '한 번 다른 창이 바꿨으면 계속');
  const g = updReduce(updReduce({ ...UPD0 }, { type: 'getting' }), { type: 'progress', done: 5, total: 9 });
  const f = updReduce(g, { type: 'failed' });
  assert.deepEqual(f, { ...UPD0 }, '받다 끊기면 처음으로(다음 확인 때 다시)');
  assert.equal(updReduce(f, { type: 'progress', done: 6, total: 9 }).phase, 'none', '실패한 뒤 늦게 온 % 알림은 무시');
  assert.equal(updReduce({ ...UPD0 }, { type: 'failed' }).phase, 'none');
  assert.equal(updReduce({ ...UPD0 }, { type: 'zzz' }).phase, 'none');
  assert.equal(updPct(null), 0);
  assert.equal(updPct({ done: 30, total: 20 }), 100, '비율은 100을 안 넘는다');
});

test('⚙ 한 줄(순수) — 최신 · 받는 중 % · 준비됨', () => {
  assert.equal(updLine({ ...UPD0 }, 'v425'), '앱 판 v425 · 최신이에요');
  assert.equal(updLine({ ...UPD0, phase: 'getting', done: 50, total: 200 }, 'v425'), '앱 판 v425 · ⬇️ 새 버전 받는 중 25%');
  assert.equal(updLine({ ...UPD0, phase: 'ready' }, 'v425'), '앱 판 v425 · ✅ 새 버전 준비됐어요 — 「지금 바꾸기」를 누르면 바뀌어요');
  assert.equal(updLine({ ...UPD0 }), `앱 판 ${APP_VERSION} · 최신이에요`, '기본은 지금 판');
  assert.deepEqual([CHECK_EVERY, CHECK_GAP, RELOAD_WAIT, SETTLE_MS], [30 * 60 * 1000, 5 * 60 * 1000, 5000, 400]);
});

// ───────── 가짜 화면 · 가짜 서비스워커 ─────────
function fakeEl(tag = 'div') {
  const e = {
    tag, className: '', textContent: '', style: {}, children: [], hidden: false, disabled: false, open: false, type: '', shows: 0, _l: {},
    classList: { _s: new Set(), toggle(c, on) { if (on === undefined ? !this._s.has(c) : on) this._s.add(c); else this._s.delete(c); }, contains(c) { return this._s.has(c); } },
    addEventListener(t, f) { (this._l[t] = this._l[t] || []).push(f); },
    fire(t, ev = {}) { for (const f of this._l[t] || []) f(ev); },
    click() { this.fire('click', {}); },
    append(...cs) { this.children.push(...cs); },
    set innerHTML(v) { this.children = []; },
    get innerHTML() { return ''; },
    showModal() { if (this.open) throw new Error('이미 열림'); this.open = true; this.shows += 1; },
    close() { this.open = false; },
    setAttribute(k) { if (k === 'open') this.open = true; },
  };
  return e;
}
const textOf = (e) => (e ? [e.textContent, ...e.children.map(textOf)].join('') : '');
const tick = () => new Promise((r) => setImmediate(r));
/** 조건이 맞을 때까지 (저장 두 번 사이 SETTLE_MS를 진짜로 기다린다) */
async function waitFor(cond, ms = 3000) {
  const end = Date.now() + ms;
  while (!cond()) { if (Date.now() > end) throw new Error('기다리다 시간 넘음'); await new Promise((r) => setTimeout(r, 20)); }
}

let scene = 0;
/** 장면 하나 — 새 모듈(주소 꼬리로 따로)·새 가짜 화면 · controller: 지금 이 창을 맡은 판이 있나 · flushes: 저장 결과 차례(없으면 늘 성공) · hold: 첫 저장을 붙잡아 둠 */
async function stage({ controller = true, waiting = null, installing = null, updateFails = false, search = '', flushes = [], hold = false } = {}) {
  const ids = ['upd-home', 'upd-chip', 'upd-dlg', 'upd-dlg-msg', 'upd-now', 'upd-later', 'set-upd-now', 'set-upd-check', 'view-home'];
  const els = Object.fromEntries(ids.map((id) => [id, fakeEl(id === 'upd-dlg' ? 'dialog' : 'div')]));
  els['upd-now'].className = 'btn btn-primary upd-now-btn';
  const made = [];
  const docL = {};
  globalThis.document = {
    hidden: false,
    getElementById: (id) => els[id] || null,
    createElement: (tag) => { const e = fakeEl(tag); made.push(e); return e; },
    querySelectorAll: (sel) => (sel === '.upd-now-btn' ? [els['upd-now'], ...made].filter((e) => String(e.className).split(' ').includes('upd-now-btn')) : []),
    addEventListener: (t, f) => { (docL[t] = docL[t] || []).push(f); },
  };
  const reloads = { n: 0 };
  globalThis.location = { protocol: 'https:', search, reload: () => { reloads.n += 1; } };
  const regL = {};
  const reg = {
    waiting, installing, updates: 0,
    addEventListener: (t, f) => { (regL[t] = regL[t] || []).push(f); },
    update: async () => { reg.updates += 1; if (updateFails) throw new Error('끊김'); },
    fire: (t) => { for (const f of regL[t] || []) f({}); },
  };
  const swL = {};
  const sw = {
    controller: controller ? {} : null,
    registered: 0,
    register: async () => { sw.registered += 1; return reg; },
    addEventListener: (t, f) => { (swL[t] = swL[t] || []).push(f); },
    fire: (t, ev = {}) => { for (const f of swL[t] || []) f(ev); },
  };
  Object.defineProperty(globalThis, 'navigator', { value: { serviceWorker: sw }, configurable: true, writable: true });
  const timers = [];
  const intervals = [];
  const realST = globalThis.setTimeout;
  const realSI = globalThis.setInterval;
  globalThis.setTimeout = (fn, ms, ...a) => (ms === RELOAD_WAIT ? (timers.push(fn), 0) : realST(fn, ms, ...a));
  globalThis.setInterval = (fn, ms, ...a) => (ms === CHECK_EVERY ? (intervals.push(fn), 0) : realSI(fn, ms, ...a));
  const fl = { n: 0, release: null, at: [] };
  const flush = async () => {
    fl.n += 1;
    fl.at.push(Date.now());
    if (hold && fl.n === 1) await new Promise((r) => { fl.release = r; });
    await tick();
    return flushes.length ? flushes.shift() : undefined;
  };
  const m = await import(`../js/update.js?scene=${(scene += 1)}`);
  await m.initUpdate({ flush });
  return { m, els, reg, sw, reloads, timers, intervals, fl, docL, restore: () => { globalThis.setTimeout = realST; globalThis.setInterval = realSI; } };
}
const worker = () => {
  const w = { state: 'installing', msgs: [], _l: {}, addEventListener(t, f) { (this._l[t] = this._l[t] || []).push(f); }, postMessage(x) { this.msgs.push(x); } };
  w.to = (st) => { w.state = st; for (const f of w._l.statechange || []) f({}); };
  return w;
};
const prog = (w, done, total) => ({ source: w, data: { type: 'sw-progress', done, total } });

test('★ 화면 — 받는 중 홈 띠·딱지 % · 지금 받는 판의 알림만 · 다 받으면 큰 창 · 나중에 → 딱지 「🆕 새 버전 대기 중」(홈에서도 · 누르면 창) · 지금 바꾸기 = 저장 두 번 → 넘겨받으라는 메시지 → 넘겨받으면 한 번만 다시 켬', async () => {
  const t = await stage();
  try {
    const { m, els, reg, sw } = t;
    assert.equal(els['upd-home'].hidden, true, '새 판 없으면 홈 띠 없음');
    assert.equal(els['upd-chip'].hidden, true);
    assert.equal(els['set-upd-now'].textContent, `앱 판 ${APP_VERSION} · 최신이에요`);

    const w = worker();
    reg.installing = w;
    reg.fire('updatefound');
    assert.equal(els['upd-home'].hidden, false);
    assert.match(textOf(els['upd-home']), /^⬇️ 새 버전 받는 중0%$/);
    sw.fire('message', prog(w, 84, 167));
    assert.match(textOf(els['upd-home']), /⬇️ 새 버전 받는 중50%/);
    assert.equal(els['upd-home'].children[1].children[0].style.width, '50%', '막대');
    assert.equal(els['upd-chip'].hidden, false, '딱지는 홈에서도 (홈 위에 여는 🏠 집·🎮 게임이 홈 띠를 가려도 · Codex 228차 P2-5)');
    assert.equal(els['upd-chip'].textContent, '⬇️ 새 버전 50%');
    assert.match(els['set-upd-now'].textContent, /받는 중 50%/);
    sw.fire('message', prog(worker(), 1, 4));
    sw.fire('message', { data: { type: 'sw-progress', done: 1, total: 4 } });
    assert.equal(els['upd-chip'].textContent, '⬇️ 새 버전 50%', '다른 판·보낸 이 없는 알림은 무시 (Codex 228차 P2-4)');
    sw.fire('message', { source: w, data: { type: 'other', done: 1, total: 4 } });
    assert.equal(els['upd-chip'].textContent, '⬇️ 새 버전 50%', '다른 알림은 무시');
    els['view-home'].hidden = true;
    m.updView();
    assert.equal(els['upd-chip'].hidden, false, '다른 화면에서도 딱지');
    els['upd-chip'].click();
    assert.equal(els['upd-dlg'].open, false, '받는 중 딱지는 눌러도 창이 없다');

    reg.waiting = w;
    w.to('installed');
    assert.equal(els['upd-dlg'].open, true, '다 받으면 어느 화면이든 큰 창');
    assert.match(els['upd-dlg-msg'].textContent, /^지금 바꾸면 앱이 잠깐 다시 켜져요/);
    assert.equal(els['upd-chip'].hidden, true, '창이 떠 있는 동안 딱지는 아직');
    assert.equal(els['upd-home'].classList.contains('ready'), true);
    assert.match(textOf(els['upd-home']), /✅ 새 버전 준비됐어요지금 바꾸기/);
    sw.fire('message', prog(w, 3, 167));
    assert.match(textOf(els['upd-home']), /✅ 새 버전 준비됐어요/, '다 받은 뒤 늦은 알림은 무시');

    els['upd-later'].click();
    assert.equal(els['upd-dlg'].open, false);
    assert.equal(els['upd-chip'].hidden, false);
    assert.equal(els['upd-chip'].textContent, '🆕 새 버전 대기 중');
    assert.equal(els['upd-chip'].classList.contains('ready'), true);
    w.to('installed');
    assert.equal(els['upd-dlg'].open, false, '「나중에」 뒤엔 저절로 다시 안 뜬다');
    els['view-home'].hidden = false;
    m.updView();
    assert.equal(els['upd-chip'].hidden, false, '홈에서도 대기 딱지');
    els['upd-chip'].click();
    assert.equal(els['upd-dlg'].open, true, '딱지를 누르면 창이 다시');
    assert.equal(els['upd-dlg'].shows, 2);
    let prevented = false;
    els['upd-dlg'].fire('cancel', { preventDefault: () => { prevented = true; } });
    assert.deepEqual([prevented, els['upd-dlg'].open, els['upd-chip'].hidden], [true, false, false], '뒤로 가기·Esc도 「나중에」');
    els['upd-chip'].click();

    els['upd-now'].click();
    assert.equal(els['upd-now'].textContent, '저장하는 중…');
    assert.equal(els['upd-now'].disabled, true);
    assert.deepEqual(w.msgs, [], '저장이 끝나기 전엔 안 넘긴다');
    els['upd-now'].click();
    await waitFor(() => w.msgs.length > 0);
    assert.equal(t.fl.n, 2, '저장 두 번(그 사이 잠깐 — 이미 저장 중이던 것까지 · Codex 228차 P2-2) · 두 번 눌러도 한 차례');
    assert.ok(t.fl.at[1] - t.fl.at[0] >= SETTLE_MS - 30, `두 저장 사이 ${t.fl.at[1] - t.fl.at[0]}ms`);
    assert.deepEqual(w.msgs, [{ type: 'skip-waiting' }], '기다리던 새 판에 넘겨받으라고');
    assert.equal(t.reloads.n, 0, '넘겨받기 전엔 아직');
    assert.equal(t.timers.length, 1, '예비 다시 켜기는 메시지보다 먼저 걸어 둔다');
    sw.fire('controllerchange');
    assert.equal(t.reloads.n, 1, '넘겨받으면 다시 켬');
    for (const f of t.timers) f();
    assert.equal(t.reloads.n, 1, '늦게 오는 예비 다시 켜기는 한 번만');
  } finally { t.restore(); }
});

test('★ 🔍 Codex 228차 P1·P2-1 — 저장하는 사이 다른 창이 먼저 바꿔도 저장이 끝난 뒤에만 다시 켬 · 저장이 안 됐으면 멈추고 「저장이 안 됐어요」(다시 누르면 다시) · 메시지를 보내다 오류여도 멈추지 않음', async () => {
  // P1 — 첫 저장을 붙잡아 둔 채 넘겨받힘 → 다시 켜지 않음 → 저장이 끝나면 다시 켬(메시지 없이)
  let t = await stage({ waiting: worker(), hold: true });
  try {
    t.els['upd-now'].click();
    await tick();
    t.sw.fire('controllerchange');
    assert.equal(t.reloads.n, 0, '저장이 끝나기 전엔 다시 켜지 않는다');
    await new Promise((r) => setTimeout(r, SETTLE_MS + 200));
    assert.deepEqual([t.fl.n, t.reloads.n], [1, 0], '첫 저장이 끝나야 다음 저장 — 붙잡혀 있는 동안엔 그대로');
    t.fl.release();
    await waitFor(() => t.reloads.n === 1);
    assert.equal(t.fl.n, 2);
    assert.deepEqual(t.reg.waiting.msgs, [], '이미 넘겨받혔으니 메시지는 없다');
  } finally { t.restore(); }

  // P2-1 — 저장 실패(두 번째 저장이 false) → 멈춤 · 창에 「저장이 안 됐어요」 · 단추 다시 · 다시 누르면 성공 → 넘김
  t = await stage({ waiting: worker(), flushes: [true, false, true, true] });
  try {
    t.els['upd-later'].click();
    t.els['upd-dlg'].close();
    const home = () => t.els['upd-home'].children.find((c) => String(c.className).includes('upd-now-btn'));
    home().click();
    await waitFor(() => t.fl.n === 2 && t.els['upd-dlg'].open);
    assert.equal(t.reloads.n, 0);
    assert.deepEqual(t.reg.waiting.msgs, [], '저장이 안 됐으면 넘기지 않는다');
    assert.match(t.els['upd-dlg-msg'].textContent, /^저장이 안 됐어요 — 잠시 뒤 「지금 바꾸기」를 다시 눌러 주세요/);
    assert.equal(t.els['upd-now'].disabled, false, '단추가 다시 눌린다');
    assert.equal(t.els['upd-now'].textContent, '지금 바꾸기');
    t.els['upd-now'].click();
    await waitFor(() => t.reg.waiting.msgs.length === 1);
    assert.equal(t.fl.n, 4);
    t.sw.fire('controllerchange');
    assert.equal(t.reloads.n, 1);
  } finally { t.restore(); }

  // 저장 중 오류(던짐)도 실패로 · 실패한 사이 넘겨받혔으면 다음 성공 때 바로 다시 켬
  t = await stage({ waiting: worker() });
  try {
    let n = 0;
    await t.m.initUpdate({ flush: async () => { n += 1; if (n === 2) throw new Error('저장소 오류'); } }); // 같은 모듈에 저장만 바꿔 끼운다(단추가 두 번 걸려도 한 차례만 돈다)
    t.els['upd-now'].click();
    await waitFor(() => n === 2);
    await tick(); await tick();
    assert.equal(t.reloads.n, 0);
    assert.match(t.els['upd-dlg-msg'].textContent, /^저장이 안 됐어요/);
    t.sw.fire('controllerchange');
    assert.equal(t.reloads.n, 0, '저장이 안 된 채로는 다시 켜지 않는다');
    t.els['upd-now'].click();
    await waitFor(() => t.reloads.n === 1);
    assert.deepEqual(t.reg.waiting.msgs, [], '넘겨받힌 뒤라 메시지 없이 다시 켬');
  } finally { t.restore(); }

  // 메시지를 보내다 오류 → 바로 다시 켬(단추가 멈춰 있지 않게)
  t = await stage();
  try {
    const w = worker();
    w.postMessage = () => { throw new Error('보낼 수 없음'); };
    t.reg.waiting = w;
    t.reg.installing = null;
    t.els['upd-now'].click();
    await waitFor(() => t.reloads.n === 1);
    assert.equal(t.timers.length, 1);
  } finally { t.restore(); }
});

test('★ 다른 창이 먼저 바꿈 · 처음 설치 · 받다 끊김(늦은 알림 무시) · 켤 때 이미 다 받아 둠 · ?nosw', async () => {
  // 다른 창이 「지금 바꾸기」 → 이 창(옛 코드)은 넘겨받힘 → 「다시 켜기만」 창 · 지금 바꾸기 = 저장 뒤 바로 다시 켬(메시지 없음)
  let t = await stage();
  try {
    t.sw.fire('controllerchange');
    assert.equal(t.els['upd-dlg'].open, true);
    assert.match(t.els['upd-dlg-msg'].textContent, /^다른 창에서 새 버전으로 바꿨어요/);
    t.els['upd-now'].click();
    await waitFor(() => t.reloads.n === 1);
    assert.equal(t.fl.n, 2, '그래도 저장은 먼저');
    assert.equal(t.timers.length, 0, '넘겨받을 판이 없으니 기다리지 않는다');
  } finally { t.restore(); }

  // 다른 창이 바꾼 뒤 더 새 판이 또 기다리고 있어도 — 이 창은 바로 다시 켜기만
  t = await stage();
  try {
    const newer = worker();
    t.sw.fire('controllerchange');
    t.reg.waiting = newer;
    t.els['upd-now'].click();
    await waitFor(() => t.reloads.n === 1);
    assert.deepEqual(newer.msgs, [], '다른 창이 바꾼 경우엔 넘겨받으라는 말을 안 한다');
  } finally { t.restore(); }

  // 처음 설치(이 창을 맡은 판이 없음) — 안내 없음 · 넘겨받아도 창 없음
  t = await stage({ controller: false });
  try {
    const w = worker();
    t.reg.installing = w;
    t.reg.fire('updatefound');
    t.sw.fire('message', prog(w, 3, 9));
    assert.equal(t.els['upd-home'].hidden, true, '처음 받을 땐 띠 없음');
    w.to('installed');
    t.sw.fire('controllerchange');
    assert.equal(t.els['upd-dlg'].open, false);
  } finally { t.restore(); }

  // 받다 끊김 — 띠·딱지가 사라지고, 그 판의 늦은 % 알림이 와도 다시 안 뜸 · 다음 확인 때 새로 받으면 다시
  t = await stage();
  try {
    const w = worker();
    t.reg.installing = w;
    t.reg.fire('updatefound');
    t.sw.fire('message', prog(w, 3, 9));
    w.to('redundant');
    assert.equal(t.els['upd-home'].hidden, true);
    assert.equal(t.els['upd-chip'].hidden, true);
    t.sw.fire('message', prog(w, 4, 9));
    assert.equal(t.els['upd-home'].hidden, true, '실패한 판의 늦은 알림 (Codex 228차 P2-4)');
    assert.equal(t.els['set-upd-now'].textContent, `앱 판 ${APP_VERSION} · 최신이에요`);
    const w2 = worker();
    t.reg.installing = w2;
    t.reg.fire('updatefound');
    t.sw.fire('message', prog(w2, 9, 9));
    assert.match(textOf(t.els['upd-home']), /받는 중100%/, '새로 받는 판은 다시');
  } finally { t.restore(); }

  // 켤 때 이미 다 받아 둔 새 판이 기다리고 있으면 바로 큰 창
  t = await stage({ waiting: worker() });
  try {
    assert.equal(t.els['upd-dlg'].open, true);
    assert.match(textOf(t.els['upd-home']), /✅ 새 버전 준비됐어요/);
  } finally { t.restore(); }

  // 켤 때 받는 중이면 띠 · 그 판의 알림은 받는다
  const w0 = worker();
  t = await stage({ installing: w0 });
  try {
    assert.equal(t.els['upd-home'].hidden, false);
    t.sw.fire('message', prog(w0, 1, 2));
    assert.match(textOf(t.els['upd-home']), /⬇️ 새 버전 받는 중50%/);
    assert.equal(t.sw.registered, 1);
  } finally { t.restore(); }

  // 개발용 ?nosw — 등록하지 않는다(헤드리스 시험은 늘 최신 파일) · ⚙ 줄은 그대로
  t = await stage({ search: '?nosw=1' });
  try {
    assert.equal(t.sw.registered, 0);
    assert.equal(t.intervals.length, 0);
    assert.equal(t.els['set-upd-now'].textContent, `앱 판 ${APP_VERSION} · 최신이에요`);
  } finally { t.restore(); }
});

test('★ 확인 — 30분마다 · 돌아올 때는 5분 지났을 때만 · ⚙ 「🔄 새 버전 확인」(결과 줄 · 인터넷이 안 되면 그렇다고 · 다 받았으면 창)', async () => {
  let t = await stage();
  try {
    assert.equal(t.intervals.length, 1, '30분마다');
    t.intervals[0]();
    await tick();
    assert.equal(t.reg.updates, 1);
    const vis = t.docL.visibilitychange[0];
    vis();
    await tick();
    assert.equal(t.reg.updates, 1, '방금 확인했으면 돌아와도 안 함');
    const now = Date.now;
    try {
      Date.now = () => now() + CHECK_GAP + 1000;
      globalThis.document.hidden = true;
      vis();
      await tick();
      assert.equal(t.reg.updates, 1, '숨을 때는 안 함');
      globalThis.document.hidden = false;
      vis();
      await tick();
      assert.equal(t.reg.updates, 2, '5분 지나 돌아오면 확인');
    } finally { Date.now = now; }

    t.els['set-upd-check'].click();
    assert.match(t.els['set-upd-now'].textContent, /확인하는 중…$/);
    await tick(); await tick();
    assert.equal(t.els['set-upd-now'].textContent, `앱 판 ${APP_VERSION} · 최신이에요`);
    t.reg.update = async () => { t.reg.updates += 1; t.reg.installing = worker(); };
    t.els['set-upd-check'].click();
    await tick(); await tick();
    assert.match(t.els['set-upd-now'].textContent, /받는 중 0%/);
    assert.equal(t.els['upd-home'].hidden, false);
    t.reg.waiting = t.reg.installing;
    t.reg.installing = null;
    t.reg.waiting.to('installed');
    assert.equal(t.els['upd-dlg'].open, true);
    t.els['upd-later'].click();
    t.els['set-upd-check'].click();
    assert.equal(t.els['upd-dlg'].open, true, '다 받은 뒤엔 ⚙ 단추가 창을 연다');
  } finally { t.restore(); }

  t = await stage({ updateFails: true });
  try {
    t.els['set-upd-check'].click();
    await tick(); await tick();
    assert.equal(t.els['set-upd-now'].textContent, `앱 판 ${APP_VERSION} · 인터넷이 안 돼서 확인하지 못했어요`);
  } finally { t.restore(); }

  t = await stage();
  try {
    t.reg.update = async () => { t.reg.waiting = worker(); };
    t.intervals[0]();
    await tick(); await tick();
    assert.equal(t.els['upd-dlg'].open, true);
  } finally { t.restore(); }
});

// ───────── sw.js — 받는 중 알림 · 기다림 · 실패하면 멈추고 반쯤 받은 판을 지움 · 다 받음 표시 · 제 캐시에서만 ─────────
function loadSw({ fail = '', other = {} } = {}) {
  const code = src('sw.js');
  const handlers = {};
  const msgs = [];
  const stores = new Map();
  const deleted = [];
  const net = [];
  const out = { handlers, msgs, stores, deleted, net, skipped: 0 };
  const storeOf = (n) => {
    if (!stores.has(n)) stores.set(n, new Map());
    const s = stores.get(n);
    return { put: async (k, res) => { s.set(typeof k === 'string' ? k : k.key, res); }, match: async (k) => s.get(typeof k === 'string' ? k : k.key) };
  };
  for (const [n, entries] of Object.entries(other)) { const s = storeOf(n); for (const [k, v] of Object.entries(entries)) s.put(k, v); }
  const ctx = {
    caches: {
      open: async (n) => storeOf(n),
      delete: async (n) => { deleted.push(n); stores.delete(n); return true; },
      keys: async () => [...stores.keys()],
      match: async () => { throw new Error('모든 캐시를 뒤지면 안 된다'); },
    },
    fetch: async (req) => { net.push(req.url); return { ok: req.url !== fail, status: req.url === fail ? 404 : 200, url: req.url, opts: req.opts, clone() { return this; } }; },
    Request: class { constructor(u, o) { this.url = u; this.opts = o; } },
    Response: class { constructor(b) { this.body = b; this.ok = true; } },
    console, URL, Promise, Date, Array, Error,
    location: { origin: 'https://example.test' },
  };
  ctx.self = {
    addEventListener: (t, f) => { handlers[t] = f; },
    skipWaiting: () => { out.skipped += 1; return Promise.resolve(); },
    clients: { matchAll: async (o) => { out.matchOpts = o; return [{ postMessage: (x) => msgs.push(x) }, { postMessage: () => {} }]; }, claim: async () => {} },
  };
  vm.createContext(ctx);
  vm.runInContext(code, ctx);
  return out;
}
const shellCount = () => src('sw.js').match(/const APP_SHELL = \[([\s\S]*?)\];/)[1].split('\n').filter((l) => /^\s*'\.\//.test(l)).length;
const NAME = `shincoach-${APP_VERSION}`;

test('★ sw.js 설치 — 파일마다 받아 넣으며 열린 창들에 %(마지막은 전부) · 다 받음 표시 · 받아도 넘겨받지 않음 · 「지금 바꾸기」 메시지로만 · 하나라도 못 받으면 나머지도 멈추고 이 판 캐시를 지우고 실패', async () => {
  const s = loadSw();
  const ev = { waitUntil(p) { this.p = p; } };
  s.handlers.install(ev);
  await ev.p;
  await tick(); await tick();
  const total = shellCount();
  assert.ok(total > 150, `${total}`);
  const st = s.stores.get(NAME);
  assert.equal(st.size, total + 1, '파일을 다 넣고 다 받음 표시 하나');
  assert.ok(st.has('./js/update.js'), 'update.js도 앱 셸에');
  assert.equal(st.get(SHELL_DONE).body, APP_VERSION, '다 받음 표시 (version.js와 같은 이름 · Codex 228차 P3)');
  assert.ok([...st.entries()].filter(([k]) => k !== SHELL_DONE).every(([, r]) => r.opts && r.opts.cache === 'reload'), 'HTTP 캐시를 거치지 않고');
  const last = s.msgs[s.msgs.length - 1];
  assert.equal(last.type, 'sw-progress');
  assert.deepEqual([last.done, last.total, last.ver], [total, total, APP_VERSION]);
  assert.ok(s.msgs.length >= 1 && s.msgs.every((x) => x.done <= x.total));
  assert.deepEqual({ ...s.matchOpts }, { type: 'window', includeUncontrolled: true }, '아직 이 판이 맡지 않은 창에도'); // vm 쪽 객체라 펼쳐서
  assert.equal(s.skipped, 0, '다 받아도 기다린다');
  s.handlers.message({ data: { type: 'nope' } });
  s.handlers.message({});
  assert.equal(s.skipped, 0);
  s.handlers.message({ data: { type: 'skip-waiting' } });
  assert.equal(s.skipped, 1, '「지금 바꾸기」 메시지로만 넘겨받는다');

  // 맨 앞 파일을 못 받음 — 다른 다섯 줄도 그 자리에서 멈춘다(더 받지도·넣지도·알리지도 않음 · Codex 228차 P2-4)
  const f = loadSw({ fail: './' });
  const ev2 = { waitUntil(p) { this.p = p; } };
  f.handlers.install(ev2);
  await assert.rejects(ev2.p, /\.\/ 404/);
  await tick(); await tick();
  assert.deepEqual(f.deleted, [NAME], '반쯤 받은 판을 남기지 않는다');
  assert.equal(f.stores.has(NAME), false);
  assert.equal(f.msgs.length, 0, '실패한 뒤 % 알림 없음');
  assert.ok(f.net.length <= 6, `더 받지 않는다 ${f.net.length}`);
  assert.equal(f.skipped, 0);
  const f2 = loadSw({ fail: './js/update.js' });
  const ev3 = { waitUntil(p) { this.p = p; } };
  f2.handlers.install(ev3);
  await assert.rejects(ev3.p, /update\.js 404/);
  assert.deepEqual(f2.deleted, [NAME]);
  assert.equal(f2.stores.has(NAME), false, '다 받음 표시도 없다');
});

test('★ sw.js 가져오기 — 이 판 캐시에서만(다른 판 캐시는 안 뒤짐 · Codex 228차 P2-3) · 없으면 네트워크에서 받아 이 판 캐시에 · 페이지 이동은 이 판의 index.html', async () => {
  const s = loadSw({ other: { 'shincoach-v999': { './js/a.js': { from: 'v999' }, './index.html': { from: 'v999 index' } } } });
  const fetchEv = (url, mode = 'cors') => {
    const ev = { request: { method: 'GET', url, mode, key: url.replace('https://example.test/', './') }, respondWith(p) { this.p = p; }, waitUntil(p) { this.w = p; } };
    s.handlers.fetch(ev);
    return ev;
  };
  let ev = fetchEv('https://example.test/js/a.js');
  let res = await ev.p;
  assert.equal(res.url, 'https://example.test/js/a.js', '다른 판 캐시의 것이 아니라 네트워크');
  await ev.w;
  assert.ok(s.stores.get(NAME).has('./js/a.js'), '받은 것은 이 판 캐시에');
  ev = fetchEv('https://example.test/js/a.js');
  res = await ev.p;
  assert.equal(s.net.filter((u) => u.endsWith('/js/a.js')).length, 1, '두 번째는 이 판 캐시에서');
  ev = fetchEv('https://example.test/index.html', 'navigate');
  res = await ev.p;
  assert.notEqual(res.from, 'v999 index', '페이지 이동도 다른 판의 index.html은 안 씀');
  await (async () => { const st = await s.stores.get(NAME); st.set('./index.html', { from: 'mine' }); })();
  ev = fetchEv('https://example.test/index.html', 'navigate');
  assert.equal((await ev.p).from, 'mine');
  ev = { request: { method: 'POST', url: 'https://example.test/x' }, respondWith() { throw new Error('POST는 관여 안 함'); } };
  s.handlers.fetch(ev);
});

test('📤 받아 둔 판(version.js cachedVersion) — 다 받음 표시가 있는 캐시만 · 받는 중인 판·표시 없는 옛 캐시·다른 앱 캐시는 안 셈 (Codex 228차 P3)', async () => {
  const mk = (entries) => ({ match: async (k) => (entries.includes(k) ? { ok: true } : undefined) });
  const all = { 'shincoach-v424': mk(['./index.html']), 'shincoach-v425': mk(['./index.html', SHELL_DONE]), 'shincoach-v426': mk(['./index.html']), 'other-v999': mk([SHELL_DONE]) };
  const had = globalThis.caches;
  try {
    globalThis.caches = { keys: async () => Object.keys(all), open: async (n) => all[n] };
    assert.equal(await cachedVersion(), 'v425', 'v426은 받는 중(표시 없음)');
    all['shincoach-v426'] = mk([SHELL_DONE]);
    assert.equal(await cachedVersion(), 'v426');
    globalThis.caches = { keys: async () => ['shincoach-v424'], open: async () => mk([]) };
    assert.equal(await cachedVersion(), '');
    globalThis.caches = { keys: async () => { throw new Error('x'); } };
    assert.equal(await cachedVersion(), '');
  } finally { globalThis.caches = had; }
  assert.match(src('sw.js'), new RegExp(`const SHELL_DONE = '${SHELL_DONE.replace(/[.]/g, '\\.')}';`), 'sw.js와 같은 이름');
});

test('배선 — app.js는 update.js로 등록(저장 셋 + 저장이 다 됐는지) · 화면 바뀔 때 딱지 · 옛 새로고침 알림 없음 · index.html 자리 · ⚙ 줄·단추 · 딱지 오른쪽 아래 · 판 v425', () => {
  const app = src('js/app.js');
  assert.match(app, /import \{ initUpdate, updView \} from '\.\/update\.js';/);
  assert.match(app, /import \{ todayKey, byeSummary, flush as flushTrack, lastFlushError \} from '\.\/track\.js';/);
  assert.match(app, /import \{ initTimeLimit, setSubject, flushTime, isLocked, timeSaveFailed \} from '\.\/timelimit\.js';/);
  assert.match(app, /      try \{ await flushTrack\(\); \} catch [^\n]*\n      try \{ await flushTime\(\); \} catch [^\n]*\n      const xp = await import\('\.\/xp\.js'\)\.catch\(\(\) => null\);\n      try \{ if \(xp\) await xp\.flushProfile\(\); \} catch [^\n]*\n      return !lastFlushError && !timeSaveFailed\(\) && !!xp && !xp\.profileUnsaved\(\);/);
  assert.match(app, /  refreshChips\(\);\n  updView\(\);/);
  assert.doesNotMatch(app, /update-toast|update-reload|serviceWorker\.register/, '등록은 update.js 한 곳');
  assert.match(src('js/timelimit.js'), /    clock\.saving\.delete\(job\);\n    clock\.failed = false;[\s\S]*?    clock\.saving\.delete\(job\);\n    clock\.failed = true;/);
  assert.match(src('js/timelimit.js'), /export function timeSaveFailed\(\) \{\n  return clock\.failed === true;\n\}/);
  assert.match(src('js/xp.js'), /export function profileUnsaved\(\) \{\n  return !isEmptyDelta\(pending\);\n\}/);
  const html = src('index.html');
  assert.doesNotMatch(html, /update-toast/);
  assert.match(html, /<main class="home-main">\n[^\n]*\n      <div id="upd-home" class="upd-home" hidden><\/div>/, '홈 맨 위 띠');
  assert.match(html, /<button type="button" id="upd-chip" class="upd-chip" hidden><\/button>/);
  assert.match(html, /<dialog id="upd-dlg" class="dialog upd-dlg"[^>]*>\n    <h2 id="upd-dlg-h">🆕 새 버전이 왔어요!<\/h2>/);
  assert.match(html, /<button type="button" id="upd-later" class="btn">나중에<\/button>\n      <button type="button" id="upd-now" class="btn btn-primary upd-now-btn">지금 바꾸기<\/button>/);
  assert.match(html, /<p id="set-upd-now" class="set-upd-now"><\/p>\n        <button type="button" id="set-upd-check" class="btn">🔄 새 버전 확인<\/button>/);
  const css = src('css/style.css');
  assert.match(css, /\.upd-chip \{ position: fixed; right: 8px; bottom: calc\(8px \+ var\(--safe-bottom\)\); z-index: 96;/, '오른쪽 아래(왼쪽 아래는 홈의 🐾 친구)');
  assert.match(css, /\.upd-home\[hidden\] \{ display: none; \}/);
  assert.match(css, /\.upd-chip\[hidden\] \{ display: none; \}/);
  const sw = src('sw.js');
  assert.doesNotMatch(sw.slice(sw.indexOf("self.addEventListener('install'"), sw.indexOf("self.addEventListener('message'")), /skipWaiting\(\)/, '설치에서 넘겨받지 않는다');
  assert.match(sw, /if \(event\.data && event\.data\.type === 'skip-waiting'\) self\.skipWaiting\(\);/);
  assert.match(sw, /\.then\(\(\) => self\.clients\.claim\(\)\)/, '넘겨받으면 열린 창을 맡는다(그 창이 다시 켜짐)');
  assert.ok(Number(APP_VERSION.slice(1)) >= 425, APP_VERSION);
  assert.match(sw, /CACHE_VERSION = 'v4(2[5-9]|[3-9]\d)'/);
});
