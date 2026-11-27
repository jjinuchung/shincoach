// 🗑️ v443 음식 버리기 — 화면을 실제로 눌러 본다 (리뷰 워크플로: 소스 글자 시험은 「한 번 누르면 묻기만」이 사라져도 통과했다) — node --test tests/fridgedrop443.test.js
//   버리기는 💰가 돌아오지 않는 하나뿐인 길이라, 확인 장치(두 번 누르기) · 연타 잠금 · 저장 실패 말 · 「한 번 더!」가 풀리는 길을 진짜 fridgeview.js로 돌린다
//   가짜 화면은 fridgeview.js가 쓰는 만큼만(.a.b[data-k="v"] 선택자 · innerHTML · click · focus)
import { fakeIdb } from './fakeidb.js'; // ★ db.js·xp.js보다 먼저
import { test } from 'node:test';
import assert from 'node:assert/strict';

// ───────────────────── 가짜 화면 ─────────────────────
const doc = { activeElement: null, listeners: {}, body: null };
function parseSel(sel) {
  const m = /^((?:\.[\w-]+)+)(?:\[data-([\w-]+)="([^"]*)"\])?$/.exec(sel.trim());
  if (!m) throw new Error(`가짜 화면이 모르는 선택자: ${sel}`);
  return { classes: m[1].split('.').filter(Boolean), dk: m[2] || '', dv: m[3] };
}
class El {
  constructor(tag) {
    this.tagName = String(tag).toUpperCase(); this.children = []; this.parent = null; this.attrs = {}; this.dataset = {};
    this.own = ''; this.listeners = {}; this.hidden = false; this.className = ''; this.id = ''; this.style = {};
  }
  get classList() {
    const set = () => new Set(this.className.split(/\s+/).filter(Boolean));
    const put = (s) => { this.className = [...s].join(' '); };
    return {
      add: (c) => { const s = set(); s.add(c); put(s); },
      remove: (c) => { const s = set(); s.delete(c); put(s); },
      toggle: (c, on) => { const s = set(); if (on === undefined ? !s.has(c) : !!on) s.add(c); else s.delete(c); put(s); },
      contains: (c) => set().has(c),
    };
  }
  appendChild(c) { if (c.parent) c.parent.children = c.parent.children.filter((x) => x !== c); c.parent = this; this.children.push(c); return c; }
  set textContent(v) { for (const c of this.children) c.parent = null; this.children = []; this.own = String(v); }
  get textContent() { return this.own + this.children.map((c) => c.textContent).join(''); }
  set innerHTML(html) { this.textContent = ''; parseInto(this, String(html)); }
  setAttribute(k, v) {
    this.attrs[k] = String(v);
    if (k.startsWith('data-')) this.dataset[k.slice(5)] = String(v);
    if (k === 'class') this.className = String(v);
    if (k === 'hidden') this.hidden = true;
    if (k === 'id') this.id = String(v);
  }
  getAttribute(k) { return k in this.attrs ? this.attrs[k] : null; }
  addEventListener(type, fn) { (this.listeners[type] = this.listeners[type] || []).push(fn); }
  click() { for (const fn of this.listeners.click || []) fn({ target: this, preventDefault() {} }); }
  focus() { doc.activeElement = this; for (const fn of doc.listeners.focusin || []) fn({ target: this }); }
  contains(n) { for (let x = n; x; x = x.parent) if (x === this) return true; return false; }
  get isConnected() { return doc.body.contains(this); }
  matches(sel) {
    const { classes, dk, dv } = parseSel(sel);
    const mine = new Set(this.className.split(/\s+/).filter(Boolean));
    if (!classes.every((c) => mine.has(c))) return false;
    return !dk || this.dataset[dk.replace(/-(\w)/g, (_, ch) => ch.toUpperCase())] === dv;
  }
  querySelectorAll(sel) {
    const out = [];
    const walk = (n) => { for (const c of n.children) { if (c.matches(sel)) out.push(c); walk(c); } };
    walk(this);
    return out;
  }
  querySelector(sel) { return this.querySelectorAll(sel)[0] || null; }
}
function parseInto(root, html) {
  const re = /<\/([a-z0-9]+)>|<([a-z0-9]+)([^>]*)>|([^<]+)/gi;
  const stack = [root];
  let m;
  while ((m = re.exec(html))) {
    if (m[1]) { stack.pop(); continue; }
    if (m[2]) {
      const e = new El(m[2]);
      const ar = /([\w-]+)(?:="([^"]*)")?/g;
      let a;
      while ((a = ar.exec(m[3]))) e.setAttribute(a[1], a[2] === undefined ? '' : a[2]);
      stack[stack.length - 1].appendChild(e);
      stack.push(e);
      continue;
    }
    stack[stack.length - 1].own += m[4];
  }
}
doc.body = new El('body');
globalThis.document = {
  get activeElement() { return doc.activeElement; },
  body: doc.body,
  getElementById: () => null,
  createElement: (t) => new El(t),
  addEventListener: (type, fn) => { (doc.listeners[type] = doc.listeners[type] || []).push(fn); },
  querySelector: (s) => doc.body.querySelector(s),
};
globalThis.window = { matchMedia: () => ({ matches: true }), addEventListener: () => {}, dispatchEvent: () => {} }; // 움직임 줄이기 = 문 여는 기다림 없음

const xp = await import('../js/xp.js');
const house = await import('../js/house.js');
const { foodById } = await import('../js/food.js');
const fv = await import('../js/fridgeview.js');
const { initProfile, houseDo, getProfileSnapshot } = xp;

const A = 'food_apple';
const M = 'food_milk';
const settle = async () => { for (let i = 0; i < 12; i++) await new Promise((r) => setTimeout(r, 2)); };
const q = (sel) => doc.body.querySelector(sel);
const owned = (id) => getProfileSnapshot().items[id] || 0;
const msg = () => q('.fz-msg').textContent;
const dropB = () => q('.fz-drop');
const drops = () => doc.body.querySelectorAll('.fz-drop').length;
const item = (id) => q(`.fz-tray-item[data-id="${id}"]`);
const armed = () => !!dropB() && dropB().className.includes('is-arm');

test('🗑️ 실제로 눌러 본다 — 한 번 누르면 묻기만 · 둘째 누름에 1개(💰 그대로) · 같은 틱 연타는 1개 · 다른 음식을 고르면 풀림 · 저장 실패는 그대로 두고 말해 줌 · 다 버리면 단추가 사라짐', async () => {
  await initProfile();
  await houseDo(house.houseStartRule);
  await houseDo((p) => { p.coins = 1e5; p.items.stone_math = 1e3; p.items.stone_english = 1e3; return { ok: true }; });
  assert.deepEqual(await houseDo((p) => house.houseBuyRule(p, house.FRIDGE_ID)), { ok: true });
  assert.equal((await houseDo((p) => house.placeRule(p, 'r1', house.FRIDGE_ID, 4, 4))).ok, true);
  for (let i = 0; i < 4; i++) assert.deepEqual(await houseDo((p) => house.foodBuyRule(p, A)), { ok: true });
  for (let i = 0; i < 2; i++) assert.deepEqual(await houseDo((p) => house.foodBuyRule(p, M)), { ok: true });
  const coins = getProfileSnapshot().coins;

  fv.openFridge({});
  q('.fz-door[data-z="cold"]').click();
  await settle();
  assert.ok(item(A) && item(M), '🧺에 사과·우유');
  assert.equal(drops(), 0, '고르기 전에는 버리기 단추가 없다');

  // ① 고르면 그 음식 옆에 단추 하나 · 한 번 누르면 묻기만(아무것도 안 버림) · 초점은 그 단추에
  item(A).click();
  assert.equal(drops(), 1);
  assert.equal(dropB().textContent, '🗑️ 버리기');
  dropB().click();
  await settle();
  assert.deepEqual([owned(A), armed(), dropB().textContent], [4, true, '한 번 더!']);
  assert.equal(msg(), fv.dropAskLine(foodById(A)));
  assert.equal(doc.activeElement, dropB(), '다시 그린 뒤 초점이 「한 번 더!」에');

  // ② 둘째 누름에 1개 — 코인은 그대로 · 「한 번 더!」는 풀리고 음식은 고른 채(남았으니까)
  dropB().click();
  await settle();
  assert.deepEqual([owned(A), getProfileSnapshot().coins, armed(), drops()], [3, coins, false, 1]);
  assert.equal(msg(), fv.dropDoneLine(foodById(A)));

  // ③ 같은 틱에 세 번 — 묻기 1 + 버리기 1, 셋째는 저장 중이라 무시(둘이 버려지지 않는다)
  dropB().click(); dropB().click(); dropB().click();
  await settle();
  assert.deepEqual([owned(A), armed()], [2, false]);

  // ④ 「한 번 더!」인 채 다른 음식을 고르면 풀린다 — 단추는 새로 고른 음식 것(묻기부터 다시)
  dropB().click();
  assert.equal(armed(), true);
  item(M).click();
  assert.deepEqual([drops(), armed(), owned(A), owned(M)], [1, false, 2, 2]);
  dropB().click();
  assert.equal(msg(), fv.dropAskLine(foodById(M)), '우유를 묻는다 — 사과가 아니라');

  // ⑤ 저장이 안 되면 그대로 두고 말해 준다(「버렸어요」가 아니다)
  fakeIdb.failNext('profile');
  dropB().click();
  await settle();
  assert.deepEqual([owned(M), fakeIdb.failsLeft()], [2, 0]);
  assert.equal(msg(), fv.FRIDGE_WHY.save);
  assert.notEqual(msg(), fv.dropDoneLine(foodById(M)));

  // ⑥ 다른 창이 먼저 버렸으면(저장된 것에 없음) 아무것도 안 줄고 까닭을 말한다
  dropB().click();
  const stored = fakeIdb.get('profile', 'me');
  const other = { ...stored, items: { ...stored.items }, updatedAt: stored.updatedAt + 5 };
  delete other.items[M];
  fakeIdb.put('profile', other);
  dropB().click();
  await settle();
  assert.equal(msg(), fv.FRIDGE_WHY.none);
  assert.equal(item(M), null, '다시 읽은 바구니에 우유가 없다');

  // ⑦ 바구니의 마지막 하나까지 버리면 그 음식과 단추가 함께 사라진다(고른 것도 풀림)
  item(A).click();
  for (let i = 0; i < 2; i++) { dropB().click(); dropB().click(); await settle(); }
  assert.deepEqual([owned(A), item(A), drops()], [0, null, 0]);
  assert.equal(getProfileSnapshot().coins, coins, '끝까지 코인은 그대로');
  fv.closeFridge();
});
