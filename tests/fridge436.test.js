// 🧊 냉장고 채우기 · 🥕 집 안 마트 (v436 · 2026-11-21 진우 「냉장고 안을 채우고 싶다」 → 아버님 시안 「이대로」) — node --test tests/fridge436.test.js
// 음식 서른(냉장 22 · 냉동 8) · 칸 냉장실 22 · 냉동실 18 · 💰만 두 번 눌러 사기 · 실마다 칸 수까지 · 줄지 않음 · 효과 없음 · 「맛있겠다!」
import { fakeIdb } from './fakeidb.js'; // ★ db.js·xp.js보다 먼저
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { FOODS, FRIDGE, SLOT_KEYS, CAP, ZONE_KO, foodById, slotZone, fridgeCopy, foodTray, zoneOwned, foodOwned } from '../js/food.js';
import { FRIDGE_ID, houseOf, houseStartRule, houseBuyRule, foodBuyCheck, foodBuyRule, fridgePutRule, fridgeTakeRule, fridgePlaced, placeRule, moveRule, storeRule, leftOf, isHouseItem } from '../js/house.js';
import { itemById, ITEMS } from '../js/items.js';
import { emptyProfile, cloneProfile, mergeStatRecord, copyHouse } from '../js/db.js';
import { newerEmoji } from './emojiver.js';
import { initProfile, flushProfile, reloadProfile, houseDo, houseNow, getProfileSnapshot } from '../js/xp.js';

void fakeIdb;
const src = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const R1 = 'r1';
const fridgeAt = (x = 0, y = 0) => ({ u: 1, id: FRIDGE_ID, x, y, f: 0 });
/** 냉장고가 놓인 집 — 가방(음식 포함) · 냉장고 안(fridge) · 코인 */
const home = ({ items = {}, fridge, coins = 0, placed = true, started = true } = {}) => cloneProfile({
  ...emptyProfile(),
  coins,
  items: { [FRIDGE_ID]: 1, ...items },
  house: { started, seq: 5, rooms: [{ id: R1, wall: '', floor: '', items: placed ? [fridgeAt()] : [] }], ...(fridge ? { fridge } : {}) },
});
const A = 'food_apple';
const ICE = 'food_icecream';

test('🧊 음식 서른 — food_ id · 그림은 Emoji 12 이하 · 이름 · 값 30·50·100·150·200 · 냉장 22 · 냉동 8 · 겹침 없음 · ITEMS 등록부 밖(🎁 상자·🏪 5일장에 안 섞임) · 집 물건 아님', () => {
  assert.equal(FOODS.length, 30);
  assert.equal(FOODS.filter((f) => f.zone === 'cold').length, 22);
  assert.equal(FOODS.filter((f) => f.zone === 'frozen').length, 8);
  assert.equal(new Set(FOODS.map((f) => f.id)).size, 30);
  for (const f of FOODS) {
    assert.match(f.id, /^food_[a-z]+$/, f.id);
    assert.ok(f.ko && f.emoji, f.id);
    assert.ok([30, 50, 100, 150, 200].includes(f.price), `${f.id} 값`);
    for (const ch of f.emoji) assert.ok(!newerEmoji(ch.codePointAt(0)), `${f.id} ${f.emoji}`);
    assert.equal(foodById(f.id), f);
    assert.equal(itemById(f.id), null, `${f.id}는 ITEMS 밖`);
    assert.equal(isHouseItem(f.id), false);
  }
  assert.ok(!ITEMS.some((i) => i.id.startsWith('food_')));
  assert.equal(foodById('apple'), null);
  assert.equal(foodById('toString'), null, '물려받은 이름은 음식이 아니다');
  assert.equal(foodById(null), null);
  // 실이 맞는 음식 — 아이스크림·얼음·만두는 냉동실, 우유·과일·채소는 냉장실
  for (const id of ['food_icecream', 'food_ice', 'food_dumpling']) assert.equal(foodById(id).zone, 'frozen', id);
  for (const id of ['food_milk', 'food_apple', 'food_carrot']) assert.equal(foodById(id).zone, 'cold', id);
});

test('🧊 칸 — 냉장실 22(선반 4×3 · 채소·과일 칸 4 · 문 칸 2×3) · 냉동실 18(선반 4 · 서랍 3×2 · 양쪽 문 칸 2×2씩) · 열쇠 겹침 없음 · 실 알아보기', () => {
  assert.deepEqual(CAP, { cold: 22, frozen: 18 });
  assert.equal(SLOT_KEYS.cold.length, 22);
  assert.equal(SLOT_KEYS.frozen.length, 18);
  const all = [...SLOT_KEYS.cold, ...SLOT_KEYS.frozen];
  assert.equal(new Set(all).size, 40);
  assert.deepEqual(SLOT_KEYS.cold.slice(0, 5), ['c:s1:0', 'c:s1:1', 'c:s1:2', 'c:s1:3', 'c:s2:0']);
  assert.equal(FRIDGE.cold.drawer[2], '채소·과일 칸');
  for (const k of SLOT_KEYS.cold) assert.equal(slotZone(k), 'cold', k);
  for (const k of SLOT_KEYS.frozen) assert.equal(slotZone(k), 'frozen', k);
  for (const k of ['c:s1:4', 'c:s9:0', 'x', '', null, 'hasOwnProperty']) assert.equal(slotZone(k), null, String(k));
  assert.deepEqual(ZONE_KO, { cold: '냉장실', frozen: '냉동실' });
});

test('🧊 고쳐 읽기(fridgeCopy) — 모르는 칸·음식 · 실이 안 맞음 · 가진 수보다 많음은 뺀다(칸 차례로 나중 것) · 바구니 = 가진 수 − 넣은 수 · 실마다 가진 수', () => {
  const items = { [A]: 2, [ICE]: 1, food_milk: 1 };
  const raw = { 'c:s3:0': A, 'c:s1:0': A, 'c:s2:0': A, 'f:s1:0': A, 'c:s1:1': ICE, 'f:d1:0': ICE, 'c:p1:0': 'food_nope', 'q:1': A, 'c:p2:0': 'food_milk', __proto__x: A };
  assert.deepEqual(fridgeCopy(raw, items), { 'c:s1:0': A, 'c:s2:0': A, 'f:d1:0': ICE, 'c:p2:0': 'food_milk' }, '세 번째 사과(c:s3:0)는 가진 수 넘침 · 냉동실 사과·냉장실 아이스크림은 실이 안 맞음');
  for (const bad of [null, [], 'x', 3]) assert.deepEqual(fridgeCopy(bad, items), {});
  assert.deepEqual(fridgeCopy(raw, {}), {}, '안 가지면 하나도 없음');
  const fr = fridgeCopy(raw, items);
  assert.deepEqual(foodTray(items, fr), {}, '모두 넣었다');
  assert.deepEqual(foodTray({ ...items, [A]: 5 }, fr), { [A]: 3 });
  assert.equal(zoneOwned({ ...items, food_cake: 3 }, 'cold'), 2 + 1 + 3);
  assert.equal(zoneOwned(items, 'frozen'), 1);
  assert.equal(foodOwned({ [A]: 2.7 }, A), 2);
  assert.equal(foodOwned({ [A]: -1 }, A), 0);
  assert.equal(foodOwned(null, A), 0);
});

test('🥕 사기(foodBuyCheck·foodBuyRule) — 💰만 · 이사 선물 전 gift · 냉장고가 없으면 nofridge(서랍에 있으면 됨) · 실마다 칸 수까지(넣은 것 + 바구니) · 코인 모자람 · 산 음식은 바구니로', () => {
  assert.deepEqual(foodBuyCheck(home({ coins: 999 }), 'food_nope'), { ok: false, why: 'unknown' });
  assert.deepEqual(foodBuyCheck(home({ coins: 999, started: false }), A), { ok: false, why: 'gift' });
  const none = home({ coins: 999 });
  delete none.items[FRIDGE_ID];
  none.house.rooms[0].items = [];
  assert.deepEqual(foodBuyCheck(none, A), { ok: false, why: 'nofridge' });
  assert.deepEqual(foodBuyCheck(home({ coins: 999, placed: false }), A), { ok: true }, '냉장고가 서랍에 있어도 산다');
  assert.deepEqual(foodBuyCheck(home({ coins: 29 }), A), { ok: false, why: 'short', shortCoins: 1 });
  const p = home({ coins: 1000 });
  assert.deepEqual(foodBuyRule(p, 'food_watermelon'), { ok: true });
  assert.deepEqual([p.coins, p.items.food_watermelon], [800, 1]);
  assert.deepEqual(foodTray(p.items, houseOf(p).fridge), { food_watermelon: 1 });
  // 냉장실은 22개까지 — 넣은 것과 바구니를 함께 센다 · 냉동실은 따로
  const full = home({ coins: 9999, items: { [A]: 20, food_milk: 2 }, fridge: { 'c:s1:0': A } });
  assert.deepEqual(foodBuyCheck(full, 'food_banana'), { ok: false, why: 'full', zone: 'cold', placed: 1 }, '넣은 수도 — 화면이 「바구니부터 넣어요」');
  assert.deepEqual(foodBuyRule(full, 'food_banana'), { ok: false, why: 'full', zone: 'cold', placed: 1 }, '안 되면 판정 그대로(화면이 다시 판정하지 않게 — Codex 240차)');
  assert.equal(full.coins, 9999, '못 사면 코인 그대로');
  assert.deepEqual(foodBuyCheck(full, ICE), { ok: true }, '냉동실은 따로');
  const fz = home({ coins: 9999, items: { [ICE]: 18 } });
  assert.deepEqual(foodBuyCheck(fz, 'food_ice'), { ok: false, why: 'full', zone: 'frozen', placed: 0 });
  assert.deepEqual(foodBuyRule(home({ coins: 5 }), A), { ok: false, why: 'short', shortCoins: 25 });
});

test('🔍 리뷰 워크플로: 가방이 줄어든 백업과 합쳐져 숨어 있던 옛 자리 — 사면 되살아나 산 음식이 바구니가 아니라 아이가 넣지 않은 칸에 나타났다 → 살 때 저장된 안을 지금 가방으로 고쳐 둔다', () => {
  // 집은 옛 쪽(사과 세 칸) · 가방은 최근 쪽(사과 하나) — 읽으면 c:s1:0 하나만 보인다(숨은 c:s1:1·2)
  const p = home({ coins: 999, items: { [A]: 1 }, fridge: { 'c:s1:0': A, 'c:s1:1': A, 'c:s1:2': A } });
  assert.deepEqual(houseOf(p).fridge, { 'c:s1:0': A });
  assert.deepEqual(foodBuyRule(p, A), { ok: true });
  assert.deepEqual(houseOf(p).fridge, { 'c:s1:0': A }, '숨은 자리는 되살아나지 않는다');
  assert.deepEqual(foodTray(p.items, houseOf(p).fridge), { [A]: 1 }, '산 사과는 바구니로');
  assert.deepEqual(p.house.fridge, { 'c:s1:0': A }, '저장된 안도 고쳐 둠');
  // 다 꺼낸 뒤 빈 칸만 남은 옛 기록이면 칸 자체를 지운다 · 집이 없으면 그대로
  const q = home({ coins: 999, items: {}, fridge: { 'c:s1:0': A } });
  assert.deepEqual(foodBuyRule(q, A), { ok: true });
  assert.equal('fridge' in q.house, false);
  assert.deepEqual(foodTray(q.items, houseOf(q).fridge), { [A]: 1 });
});

test('🔍 Codex 240차 #2 · 리뷰 워크플로: 바구니가 빈 말 — 칸을 다 채웠으면 「꽉 찼어요」(살 수 없는 마트로 보내지 않음) · 다 넣었으면 「다 넣었어요」 · 하나도 없으면 마트 · 마트 「꽉 찼어요」도 넣은 수로 가른다', async () => {
  const { trayEmptyLine } = await import('../js/fridgeview.js');
  assert.equal(trayEmptyLine('cold', 22), '냉장실이 꽉 찼어요! 넣어 둔 음식을 누르면 🧺 내 음식으로 꺼낼 수 있어요.');
  assert.equal(trayEmptyLine('frozen', 18), '냉동실이 꽉 찼어요! 넣어 둔 음식을 누르면 🧺 내 음식으로 꺼낼 수 있어요.');
  assert.equal(trayEmptyLine('cold', 3), '가진 음식은 다 넣었어요 — 더 넣고 싶으면 🛒 가구 상점의 🥕 마트에서 사 와요.');
  assert.equal(trayEmptyLine('frozen', 0), '냉동실에 넣을 음식이 없어요 — 🛒 가구 상점의 🥕 마트에서 사 와요.');
  const { martWhy } = await import('../js/houseview.js');
  const apple = foodById(A);
  assert.equal(martWhy({ why: 'full', zone: 'cold', placed: 22 }, apple), '냉장실이 꽉 찼어요 — 🧊 냉장고에서 음식을 꺼내 🧺 내 음식에서 🗑️ 버리면 다른 음식을 살 수 있어요');
  assert.equal(martWhy({ why: 'full', zone: 'frozen', placed: 4 }, apple), '냉동실에 넣을 음식을 칸만큼 가졌어요 — 🧊 냉장고를 열어 🧺 내 음식을 넣거나 🗑️ 버려요');
  assert.equal(martWhy({ why: 'full' }, apple), '냉장고에 넣을 음식을 칸만큼 가졌어요 — 🧊 냉장고를 열어 🧺 내 음식을 넣거나 🗑️ 버려요', '깨진 판정에도 멎지 않음');
  assert.equal(martWhy({ why: 'short' }, apple), '🍎 사과 — 코인 0개가 모자라요. 배우고 다시 와요!', 'shortCoins가 없어도 멎지 않음');
});

test('🧊 넣기·꺼내기(fridgePutRule·fridgeTakeRule) — 놓인 냉장고가 있어야 · 실이 맞아야 · 빈 칸에만 · 바구니에 있어야 · 꺼내면 바구니로 · 다 꺼내면 칸 없음', () => {
  const p = home({ items: { [A]: 1, [ICE]: 1 } });
  assert.deepEqual(fridgePutRule(p, 'f:s1:0', A), { ok: false, why: 'zone' });
  assert.deepEqual(fridgePutRule(p, 'c:s1:0', ICE), { ok: false, why: 'zone' });
  assert.deepEqual(fridgePutRule(p, 'c:s9:0', A), { ok: false, why: 'unknown' });
  assert.deepEqual(fridgePutRule(p, 'c:s1:0', 'food_nope'), { ok: false, why: 'unknown' });
  assert.deepEqual(fridgePutRule(p, 'c:s1:0', 'food_milk'), { ok: false, why: 'none' }, '안 가진 음식');
  assert.deepEqual(fridgePutRule(p, 'c:s1:0', A), { ok: true });
  assert.deepEqual(houseOf(p).fridge, { 'c:s1:0': A });
  assert.deepEqual(fridgePutRule(p, 'c:s1:1', A), { ok: false, why: 'none' }, '하나뿐인 사과는 이미 넣음');
  assert.deepEqual(fridgePutRule(p, 'c:s1:0', A), { ok: false, why: 'taken' });
  assert.deepEqual(fridgePutRule(p, 'f:r2:1', ICE), { ok: true });
  assert.deepEqual(foodTray(p.items, houseOf(p).fridge), {});
  assert.deepEqual(fridgeTakeRule(p, 'c:s1:1'), { ok: false, why: 'empty' });
  assert.deepEqual(fridgeTakeRule(p, 'c:s1:0'), { ok: true, id: A });
  assert.deepEqual(foodTray(p.items, houseOf(p).fridge), { [A]: 1 });
  assert.deepEqual(fridgeTakeRule(p, 'f:r2:1'), { ok: true, id: ICE });
  assert.equal(houseOf(p).fridge, undefined, '다 꺼내면 칸 없음');
  assert.equal('fridge' in p.house, false);
  assert.deepEqual([p.items[A], p.items[ICE]], [1, 1], '음식은 줄지 않는다');
  // 놓인 냉장고가 없으면(서랍) 넣기·꺼내기 못 함 — 넣어 둔 음식은 그대로 남는다
  const q = home({ items: { [A]: 1 }, fridge: { 'c:s1:0': A } });
  assert.deepEqual(storeRule(q, R1, 1), { ok: true });
  assert.equal(fridgePlaced(houseOf(q)), false);
  assert.deepEqual(houseOf(q).fridge, { 'c:s1:0': A }, '서랍에 넣어도 안은 그대로');
  assert.deepEqual(fridgePutRule(q, 'c:s1:1', A), { ok: false, why: 'nofridge' });
  assert.deepEqual(fridgeTakeRule(q, 'c:s1:0'), { ok: false, why: 'nofridge' });
  assert.deepEqual(placeRule(q, R1, FRIDGE_ID, 3, 3).ok, true);
  assert.deepEqual(fridgeTakeRule(q, 'c:s1:0'), { ok: true, id: A }, '다시 놓으면 같은 안');
});

test('🧊 다른 집 규칙이 저장해도 안이 남는다 — 가구 놓기·옮기기·서랍 · 냉장고가 둘이어도 안은 하나 · 2층에 놓아도', () => {
  const p = home({ items: { [A]: 2, f_chair: 1, x_wide: 1, x_floor2: 1, [FRIDGE_ID]: 2 }, fridge: { 'c:s1:0': A, 'c:s2:3': A } });
  const want = { 'c:s1:0': A, 'c:s2:3': A };
  assert.equal(placeRule(p, R1, 'f_chair', 2, 2).ok, true);
  assert.deepEqual(p.house.fridge, want);
  assert.deepEqual(moveRule(p, R1, 1, 3, 3), { ok: true });
  assert.deepEqual(p.house.fridge, want);
  assert.equal(placeRule(p, 'r2', FRIDGE_ID, 0, 2).ok, true, '두 번째 냉장고는 2층');
  assert.deepEqual(houseOf(p).fridge, want, '안은 하나');
  assert.deepEqual(storeRule(p, R1, 1), { ok: true });
  assert.equal(fridgePlaced(houseOf(p)), true, '2층 냉장고로도 연다');
  assert.deepEqual(fridgeTakeRule(p, 'c:s2:3'), { ok: true, id: A });
});

test('🧊 저장 모양 — 복사(copyHouse·cloneProfile)는 새 객체 · 병합은 집과 가방이 같은 쪽(최근) · 가방이 줄어든 쪽이면 넘친 음식은 바구니 셈에서 빠진다', () => {
  const p = home({ items: { [A]: 2 }, fridge: { 'c:s1:0': A } });
  const c = cloneProfile(p);
  c.house.fridge['c:s1:1'] = A;
  assert.deepEqual(p.house.fridge, { 'c:s1:0': A }, '복사본을 고쳐도 원본은 그대로');
  assert.notEqual(copyHouse(p.house).fridge, p.house.fridge);
  const newer = { ...home({ items: { [A]: 1 }, fridge: { 'c:s3:0': A } }), updatedAt: 20 };
  const older = { ...home({ items: { [A]: 5 }, fridge: { 'c:s1:0': A, 'c:s1:1': A } }), updatedAt: 10 };
  const m = mergeStatRecord('profile', older, newer);
  assert.deepEqual(m.house.fridge, { 'c:s3:0': A });
  assert.equal(m.items[A], 1);
  assert.deepEqual(houseOf(m).fridge, { 'c:s3:0': A });
  // 집은 옛 쪽인데 가방이 줄었다면 — 읽을 때 가진 수만큼만
  const odd = { ...older, items: { ...older.items, [A]: 1 } };
  assert.deepEqual(houseOf(odd).fridge, { 'c:s1:0': A });
  assert.deepEqual(leftOf(odd), {}, '가구 서랍은 그대로(음식은 가구가 아니다)');
});

test('🧊 화면 잇기 — 냉장고 도구 [🧊 열기] · 집을 닫으면 냉장고도 · 상점 [🪑 가구][🥕 마트] · 마트 두 번 눌러 사기 · 냉장고 화면(앞모습 → 문 → 안 · 바구니 · 칸 · 「맛있겠다!」 · Esc) · css · sw · 판', async () => {
  const hv = src('js/houseview.js');
  const fn = (s, head) => s.slice(s.indexOf(head), s.indexOf('\n}\n', s.indexOf(head)));
  assert.match(fn(hv, 'function toolsEl('), /if \(it\.id === FRIDGE_ID\) \{[^\n]*\n {4}const open = el\('button', 'btn btn-primary house-tool', '🧊 열기'\);/);
  assert.match(fn(hv, 'function toolsEl('), /openFridge\(\{ onClose:/);
  assert.match(fn(hv, 'export function closeHouse('), /closeFridge\(\);/);
  const shop = fn(hv, 'function shopBox(');
  assert.match(shop, /\[\['furn', '🪑 가구'\], \['mart', '🥕 마트'\]\]/);
  assert.match(shop, /if \(ui\.shopSub === 'mart'\) \{ wrap\.appendChild\(martBox\(pf\)\); return wrap; \}/);
  assert.match(fn(hv, 'export function openHouse('), /ui\.shopSub = 'furn';/);
  const tap = fn(hv, 'async function martTap(');
  assert.match(tap, /if \(ui\.buyArm !== id\) \{ ui\.buyArm = id;/, '처음엔 값 · 한 번 더 누르면 산다');
  assert.match(tap, /try \{ r = await houseDo\(\(p\) => foodBuyRule\(p, id\)\); \}/);
  const { martWhy, MART_HINT } = await import('../js/houseview.js');
  const apple = foodById(A);
  assert.equal(martWhy({ why: 'full', zone: 'cold', placed: 22 }, apple), '냉장실이 꽉 찼어요 — 🧊 냉장고에서 음식을 꺼내 🧺 내 음식에서 🗑️ 버리면 다른 음식을 살 수 있어요');
  assert.equal(martWhy({ why: 'full', zone: 'frozen', placed: 18 }, apple), '냉동실이 꽉 찼어요 — 🧊 냉장고에서 음식을 꺼내 🧺 내 음식에서 🗑️ 버리면 다른 음식을 살 수 있어요');
  assert.equal(martWhy({ why: 'short', shortCoins: 1200 }, apple), '🍎 사과 — 코인 1,200개가 모자라요. 배우고 다시 와요!');
  assert.match(tap, /else ui\.msg = r \? martWhy\(r, f\) : WHY\.save;/, '안 되면 저장된 판정 그대로');
  assert.match(tap, /fridgePlaced\(houseNow\(\)\) \? '🧊 냉장고를 열어 넣어 봐요' : '🗄️ 서랍의 🧊 냉장고를 방에 놓으면 열 수 있어요'/, '냉장고가 서랍에만 있으면');
  assert.match(martWhy({ why: 'nofridge' }, apple), /^🧊 냉장고가 있어야 음식을 살 수 있어요/);
  assert.match(martWhy({ why: 'gift' }, apple), /이사 선물/);
  assert.match(MART_HINT, /두 번 누르면 사요/);
  const fv = src('js/fridgeview.js');
  assert.match(fv, /<span class="fz-lbl">❄️ 냉동실<\/span>/);
  assert.match(fv, /<span class="fz-lbl">🥛 냉장실<\/span>/);
  assert.ok(fv.indexOf('fz-part is-frozen') < fv.indexOf('fz-part is-cold'), '위 작은 문이 냉동실(방 그림과 같은 꼴)');
  assert.match(fv, /try \{ r = await houseDo\(had \? \(p\) => fridgeTakeRule\(p, k\) : \(p\) => fridgePutRule\(p, k, id\)\); \}/, '넣기·꺼내기는 저장된 프로필로');
  assert.match(fv, /if \(!ui\.open \|\| ui\.seq !== seq \|\| ui\.view !== 'inside'\) return;/, '닫거나 앞으로 간 뒤 늦게 온 결과는 버린다');
  // ⌨️ Esc는 창 전체에서 · 초점은 덮개 안 · 문을 열면 [← 냉장고 앞으로] · 앞으로 가면 방금 나온 실의 문 · 닫으면 층 탭 (Codex 240차 #1)
  assert.match(fv, /window\.addEventListener\('keydown', \(e\) => \{ if \(ui\.open && e\.key === 'Escape'\) \{ e\.preventDefault\(\); closeFridge\(\); \} \}\);/);
  assert.match(fv, /document\.addEventListener\('focusin', \(e\) => \{ if \(ui\.open && ui\.box && !ui\.box\.contains\(e\.target\)\) focusOn\('\.fz-x'\); \}\);/);
  assert.match(fn(fv, 'async function openDoor('), /drawInside\([^\n]*\n {2}focusOn\('\.fz-back'\);/);
  assert.match(fv, /drawFront\(\);\n {4}focusOn\(`\.fz-door\[data-z="\$\{z\}"\]`\);/);
  assert.match(fn(hv, 'function toolsEl('), /openFridge\(\{ onClose: \(\) => \{ const n = document\.querySelector\('#house-tabs \.house-tab\.is-on'\);/);
  assert.match(fv, /finally \{ if \(ui\.seq === seq\) ui\.busy = false; \}/, '옛 저장이 새 잠금을 풀지 않게');
  assert.match(fv, /export const YUM = '맛있겠다!';/);
  assert.match(fv, /onProfileReload\(/, '다른 창에서 바꾸면 다시 그린다');
  assert.match(fv, /if \(!fridgePlaced\(houseOf\(getProfileSnapshot\(\)\)\)\) \{ closeFridge\(\); return; \}/, '그새 냉장고가 서랍으로 갔으면 닫는다');
  assert.ok(!/ui\.sel = ''; if \(ui\.view === 'inside'\) drawInside/.test(fv), '다시 읽어도 고른 음식은 바구니에 남았으면 그대로');
  const { FRIDGE_WHY } = await import('../js/fridgeview.js');
  for (const why of ['nofridge', 'zone', 'taken', 'none', 'empty', 'save']) assert.ok(FRIDGE_WHY[why], why);
  const css = src('css/style.css');
  assert.match(css, /\.fz \{ position: fixed;[^}]*z-index: 66;/, '🏠 집 창(.modal 64) 위');
  assert.match(css, /\.fz-door\.is-open \{ transform: rotateY\(-105deg\); \}/);
  assert.match(css, /\.fz-slot \{[^}]*font-size: clamp\([^}]*font-size: min\(6\.6cqw, 9cqh\);/, 'cq를 못 쓰는 기기는 vw 글자 크기');
  assert.match(css, /\.fz-inside\.is-frozen ~ \.fz-peek \{ top: 2px; bottom: auto; \}/, '냉동실은 파트너가 왼쪽 아래 문 칸 음식을 가리지 않게');
  assert.match(css, /\.house-stair\.is-lifted, \.house-stair\.is-lifted \+ \.house-stair-front \{ opacity: 0\.35; \}/);
  const sw = src('sw.js');
  const ver = Number((/const CACHE_VERSION = 'v(\d+)';/.exec(sw) || [])[1]);
  assert.ok(ver >= 436);
  for (const f of ['./js/food.js', './js/fridgeview.js']) assert.ok(sw.includes(`'${f}'`), f);
  assert.match(src('js/version.js'), new RegExp(`APP_VERSION = 'v${ver}'`));
});

// ───────────────────── 진짜 저장 경로 (fakeidb) ─────────────────────

test('★ 🧊 저장 경로 — 냉장고 사서 놓기 → 🥕 사과 사기(코인 줄고 가방에) → 넣기 → 두 창이 같은 칸에 넣어도 하나 → 꺼내기 → 다시 읽어도 그대로', async () => {
  await initProfile();
  await houseDo(houseStartRule);
  await houseDo((p) => { p.coins = 1e5; p.items.stone_math = 1e3; p.items.stone_english = 1e3; return { ok: true }; });
  assert.deepEqual(await houseDo((p) => foodBuyRule(p, A)), { ok: false, why: 'nofridge' });
  assert.deepEqual(await houseDo((p) => houseBuyRule(p, FRIDGE_ID)), { ok: true });
  const coins0 = getProfileSnapshot().coins;
  assert.deepEqual(await houseDo((p) => foodBuyRule(p, A)), { ok: true });
  assert.deepEqual(await houseDo((p) => foodBuyRule(p, A)), { ok: true });
  assert.equal(getProfileSnapshot().coins, coins0 - 60);
  assert.equal(getProfileSnapshot().items[A], 2);
  assert.deepEqual(await houseDo((p) => fridgePutRule(p, 'c:s1:0', A)), { ok: false, why: 'nofridge' }, '아직 서랍에');
  const put = await houseDo((p) => placeRule(p, R1, FRIDGE_ID, 4, 4));
  assert.equal(put.ok, true);
  const [a, b] = await Promise.all([houseDo((p) => fridgePutRule(p, 'c:s1:0', A)), houseDo((p) => fridgePutRule(p, 'c:s1:0', A))]);
  assert.deepEqual([a.ok, b.ok, b.why], [true, false, 'taken'], '두 창이 같은 칸에');
  assert.deepEqual(await houseDo((p) => fridgePutRule(p, 'c:cr:3', A)), { ok: true });
  await flushProfile();
  await reloadProfile();
  assert.deepEqual(houseNow().fridge, { 'c:s1:0': A, 'c:cr:3': A });
  assert.deepEqual(await houseDo((p) => fridgeTakeRule(p, 'c:s1:0')), { ok: true, id: A });
  assert.deepEqual(houseNow().fridge, { 'c:cr:3': A });
  assert.equal(getProfileSnapshot().items[A], 2, '음식은 줄지 않는다');
});
