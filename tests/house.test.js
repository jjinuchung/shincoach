// 🏠 진우네 집 — 1단계 집 꾸미기 규칙·저장 테스트: node --test tests/house.test.js
// 등록부 · 고쳐 읽기(houseOf) · 규칙(사기·처음 선물·놓기·옮기기·뒤집기·서랍·벽지) · 경제와 섞이지 않음(팔기·상자·구호품) ·
// 백업 병합 · 진짜 저장 경로(fakeidb — 두 창·저장 실패·동시에 두 번 사기)
import { fakeIdb } from './fakeidb.js'; // ★ db.js·xp.js보다 먼저
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ROOM, FURN, PAINT, FURN_MAX, START_GIFT, FIRST_ROOM, furnById, paintById, isHouseItem, houseCost, emptyHouse, canPlace, houseOf, leftOf,
  houseStartRule, houseBuyRule, placeRule, moveRule, flipRule, storeRule, paintRule,
} from '../js/house.js';
import { emptyProfile, cloneProfile, mergeStatRecord } from '../js/db.js';
import { ITEMS, itemById, lootBox, parcelOf } from '../js/items.js';
import { sellableItems, itemSellPrice } from '../js/sell.js';
import { initProfile, flushProfile, reloadProfile, houseDo, houseNow, houseLeft, getProfileSnapshot } from '../js/xp.js';

const R = FIRST_ROOM;
/** 코인·가방을 가진 프로필 (복사본 — 규칙이 고쳐도 되는) */
const pf = (coins = 0, items = {}, house) => cloneProfile({ ...emptyProfile(), coins, items: { ...items }, ...(house ? { house } : {}) });
const houseWith = (items, extra = {}) => ({ started: true, seq: 0, rooms: [{ id: R, wall: '', floor: '', items }], ...extra });
/** 이사 선물을 받은 집의 프로필 — 선물을 받기 전에는 상점에서 못 산다 (Codex 45차 #5) */
const buyer = (coins = 0, items = {}) => pf(coins, items, houseWith([]));
const FLOOR1 = FURN.find((f) => f.at === 'floor' && f.w === 1).id; // 한 칸 바닥 가구
const FLOOR2 = FURN.find((f) => f.at === 'floor' && f.w === 2).id; // 두 칸 바닥 가구
const WALL1 = FURN.find((f) => f.at === 'wall').id;
const DEVICE = FURN.find((f) => f.group === 'device').id;
const WALLP = PAINT.find((p) => p.part === 'wall').id;
const FLOORP = PAINT.find((p) => p.part === 'floor').id;

// ───────────────────── 등록부 ─────────────────────

test('🏠 등록부: 가구는 f_ · 벽지 w_ · 바닥 fl_ · 겹치는 id 없음 · 기존 아이템 등록부(ITEMS) 밖 · 방에 들어가는 크기 · 처음 선물은 가구', () => {
  const ids = [...FURN, ...PAINT].map((x) => x.id);
  assert.equal(new Set(ids).size, ids.length, 'id가 겹친다');
  for (const f of FURN) {
    assert.match(f.id, /^f_[a-z]+$/, f.id);
    assert.ok(['floor', 'wall'].includes(f.at), f.id);
    assert.ok(Number.isInteger(f.w) && f.w >= 1 && f.w <= (f.at === 'wall' ? ROOM.WALL : ROOM.W), `${f.id} 크기`);
    assert.ok(f.emoji && f.ko, f.id);
  }
  for (const p of PAINT) {
    assert.match(p.id, p.part === 'wall' ? /^w_[a-z]+$/ : /^fl_[a-z]+$/, p.id);
    assert.match(p.color, /^#[0-9a-f]{6}$/, p.id);
  }
  for (const id of ids) {
    assert.equal(itemById(id), null, `${id}가 ITEMS 등록부에 있다 — 상자·팔기·구호품에 섞인다`);
    assert.ok(isHouseItem(id), id);
  }
  for (const it of ITEMS) assert.equal(isHouseItem(it.id), false, `${it.id}가 집 물건 이름과 겹친다`);
  assert.ok(furnById(START_GIFT), '처음 선물은 가구');
  assert.equal(furnById('greatball'), null);
  assert.equal(paintById('f_bed'), null);
});

test('🏠 그림은 태블릿이 그리는 이모지(Emoji 12 이하)만 — 13 이후 집 물건 이모지(🪴🪟🪞🛖🪜🪣🪤🪥🪠🪦🪧) 금지', () => {
  const newer = ['🪴', '🪟', '🪞', '🛖', '🪜', '🪣', '🪤', '🪥', '🪠', '🪦', '🪧', '🪨', '🪵', '🛻', '🪆', '🪅'];
  for (const f of FURN) for (const e of newer) assert.ok(!f.emoji.includes(e), `${f.id} ${f.emoji}`);
});

test('🏠 값: 쉽게 못 얻게 — 소품 < 가구 < 기기 · 기기는 🔷·🔶 둘 다 · 소품·가구·벽지는 코인만 · 값 = 등록부 그대로', () => {
  const max = (g) => Math.max(...FURN.filter((f) => f.group === g).map((f) => f.price));
  const min = (g) => Math.min(...FURN.filter((f) => f.group === g).map((f) => f.price));
  assert.ok(max('small') < min('furn') && max('furn') < min('device'), '소품 < 가구 < 기기');
  for (const f of FURN) {
    assert.ok(f.price > 0, f.id);
    if (f.group === 'device') assert.ok(f.stones.stone_math >= 1 && f.stones.stone_english >= 1, `${f.id}: 기기는 스톤 둘 다`);
    else assert.equal(f.stones, undefined, `${f.id}: 기기가 아니면 코인만`);
    assert.deepEqual(houseCost(f.id), { coins: f.price, items: { ...(f.stones || {}) } });
  }
  for (const p of PAINT) assert.deepEqual(houseCost(p.id), { coins: p.price, items: {} });
  assert.deepEqual(houseCost('없는것'), { coins: 0, items: {} });
});

// ───────────────────── 고쳐 읽기 ─────────────────────

test('🏠 houseOf: 집이 없으면 빈 방 하나 · 입력을 안 바꾼다', () => {
  assert.deepEqual(houseOf(pf()), emptyHouse());
  assert.deepEqual(houseOf(null), emptyHouse());
  assert.deepEqual(emptyHouse(), { started: false, seq: 0, rooms: [{ id: R, wall: '', floor: '', items: [] }] });
  const p = pf(0, { [FLOOR1]: 1 }, houseWith([{ u: 1, id: FLOOR1, x: 0, y: 0, f: 0 }, { u: 2, id: 'f_없음', x: 1, y: 0 }]));
  const before = JSON.stringify(p.house);
  houseOf(p);
  assert.equal(JSON.stringify(p.house), before);
});

test('🏠 houseOf가 고치는 것: 모르는 가구 · 방 밖(바닥 너머·벽 물건이 바닥에·소수 칸) · 겹침은 먼저 놓은 것이 남음 · 가진 수보다 많이 놓음은 나중 것부터 뺌 · 같은 번호 둘 · 안 가진 벽지·바닥 · 번호는 가장 큰 것 이상', () => {
  const items = [
    { u: 5, id: FLOOR1, x: 0, y: 0, f: 1 },
    { u: 3, id: FLOOR1, x: 0, y: 0 }, // 같은 칸 — u가 작은 3이 먼저 놓였다 → 3이 남고 5가 빠진다
    { u: 4, id: FLOOR2, x: ROOM.W - 1, y: 0 }, // 두 칸인데 오른쪽 끝 → 방 밖
    { u: 6, id: WALL1, x: 2, y: 1 }, // 벽 물건이 바닥 줄에
    { u: 7, id: WALL1, x: 2, y: 0 },
    { u: 8, id: FLOOR1, x: 1.5, y: 2 }, // 소수 칸
    { u: 9, id: 'f_없음', x: 3, y: 3 },
    { u: 10, id: FLOOR1, x: 3, y: 3 },
    { u: 11, id: FLOOR1, x: 4, y: 3 }, // FLOOR1은 둘만 가짐 → 3·10이 남고 11은 빠진다
    { u: 7, id: WALL1, x: 5, y: 0 }, // 같은 번호 7 — 뒤의 것은 빠진다
    { u: 0, id: FLOOR1, x: 6, y: 5 }, // 번호 없음
  ];
  const p = pf(0, { [FLOOR1]: 2, [FLOOR2]: 1, [WALL1]: 2, [FLOORP]: 1 }, houseWith(items, { seq: 2 }));
  p.house.rooms[0].wall = FLOORP; // 바닥을 벽에
  p.house.rooms[0].floor = WALLP; // 안 가진 벽지를 바닥에
  const h = houseOf(p);
  assert.deepEqual(h.rooms[0].items.map((i) => i.u), [3, 7, 10]);
  assert.deepEqual(h.rooms[0].items[0], { u: 3, id: FLOOR1, x: 0, y: 0, f: 0 });
  assert.deepEqual([h.rooms[0].wall, h.rooms[0].floor], ['', '']);
  assert.equal(h.seq, 10, '번호는 남은 것 중 가장 큰 것 이상');
  assert.equal(h.started, true);
  // 가진 벽지·바닥은 남는다
  const q = pf(0, { [WALLP]: 1, [FLOORP]: 1 }, houseWith([]));
  q.house.rooms[0].wall = WALLP; q.house.rooms[0].floor = FLOORP;
  assert.deepEqual([houseOf(q).rooms[0].wall, houseOf(q).rooms[0].floor], [WALLP, FLOORP]);
  const other = PAINT.find((x) => x.part === 'wall' && x.id !== WALLP).id;
  q.house.rooms[0].wall = other; // 맞는 칸이지만 안 가진 벽지
  assert.equal(houseOf(q).rooms[0].wall, '');
  // 방 목록이 깨졌으면 첫 방을 만든다 · 같은 이름 방은 하나
  const b = pf(0, {}, { started: false, seq: 0, rooms: [null, { id: 'r9', items: [] }, { id: 'r9', items: [] }] });
  assert.deepEqual(houseOf(b).rooms.map((r) => r.id), [R], '1단계는 방 하나뿐 — 다른 방은 버리고 그 가구는 서랍으로 (Codex 45차 #4)');
});

test('🏠 leftOf: 서랍 = 가진 수 − 놓은 수 (0은 뺀다) · 집 밖 물건(볼)은 안 센다', () => {
  const p = pf(0, { [FLOOR1]: 3, [FLOOR2]: 1, greatball: 5 }, houseWith([{ u: 1, id: FLOOR1, x: 0, y: 0 }, { u: 2, id: FLOOR2, x: 2, y: 0 }]));
  assert.deepEqual(leftOf(p), { [FLOOR1]: 2 });
});

test('🏠 canPlace: 방 안·안 겹침 · 벽 물건은 벽 줄(y 0)만 · 두 칸 가구는 오른쪽 칸까지 · 옮길 때 제 자리와는 겹쳐도 된다', () => {
  const room = { id: R, items: [{ u: 1, id: FLOOR2, x: 2, y: 1 }] };
  assert.equal(canPlace(room, FLOOR1, 0, 0), true);
  assert.equal(canPlace(room, FLOOR1, 3, 1), false, '두 칸 가구의 오른쪽 칸');
  assert.equal(canPlace(room, FLOOR1, 4, 1), true);
  assert.equal(canPlace(room, FLOOR2, 1, 1), false, '왼쪽으로 한 칸 걸침');
  assert.equal(canPlace(room, FLOOR2, 3, 1, 1), true, '제 자리와 한 칸 겹쳐 옮기기');
  assert.equal(canPlace(room, FLOOR2, ROOM.W - 2, ROOM.H - 1), true);
  assert.equal(canPlace(room, FLOOR2, ROOM.W - 1, 0), false, '오른쪽 끝을 넘음');
  assert.equal(canPlace(room, FLOOR1, 0, ROOM.H), false, '아래쪽 끝을 넘음');
  assert.equal(canPlace(room, FLOOR1, -1, 0), false);
  assert.equal(canPlace(room, WALL1, 2, 0), true, '벽은 바닥과 따로');
  assert.equal(canPlace(room, WALL1, 2, 1), false, '벽 물건은 벽 줄만');
  assert.equal(canPlace(room, WALL1, ROOM.WALL, 0), false);
  assert.equal(canPlace(room, 'f_없음', 0, 0), false);
  assert.equal(canPlace(null, FLOOR1, 0, 0), false);
});

// ───────────────────── 규칙 ─────────────────────

test('🏠 처음 집 선물: 🛏️ 한 번만 — 두 번째는 "already" · 가방에 하나 더 · 놓지는 않는다(서랍에서 끌어 놓게)', () => {
  const p = pf(0, { [START_GIFT]: 1 });
  assert.deepEqual(houseStartRule(p), { ok: true, gift: START_GIFT });
  assert.equal(p.items[START_GIFT], 2);
  assert.equal(p.house.started, true);
  assert.deepEqual(p.house.rooms[0].items, []);
  assert.deepEqual(houseStartRule(p), { ok: false, why: 'already' });
  assert.equal(p.items[START_GIFT], 2);
});

test('🏠 사기: 코인·스톤을 정확히 빼고 하나 더 · 모자라면 아무것도 안 바뀜(short) · 기기는 스톤 없으면 못 삼 · 벽지·바닥은 하나만(owned) · 가구는 FURN_MAX개까지(max) · 집 물건이 아니면 unknown', () => {
  const d = furnById(DEVICE);
  const p = buyer(d.price + 7, { stone_math: d.stones.stone_math + 1, stone_english: d.stones.stone_english });
  assert.deepEqual(houseBuyRule(p, DEVICE), { ok: true });
  assert.deepEqual([p.coins, p.items[DEVICE], p.items.stone_math, p.items.stone_english], [7, 1, 1, undefined], '쓴 스톤이 0개면 가방에서 지운다');
  const q = buyer(99999, {});
  const before = JSON.stringify(q);
  assert.deepEqual(houseBuyRule(q, DEVICE), { ok: false, why: 'short' }, '스톤 없이 기기');
  assert.equal(JSON.stringify(q), before);
  const exact = buyer(d.price, { ...d.stones });
  assert.deepEqual(houseBuyRule(exact, DEVICE), { ok: true }, '코인·스톤이 값과 딱 같으면 산다');
  assert.deepEqual([exact.coins, exact.items.stone_math, exact.items.stone_english, exact.items[DEVICE]], [0, undefined, undefined, 1]);
  const poor = buyer(furnById(FLOOR1).price - 1);
  assert.deepEqual(houseBuyRule(poor, FLOOR1), { ok: false, why: 'short' });
  assert.equal(poor.coins, furnById(FLOOR1).price - 1);
  const w = buyer(5000);
  assert.deepEqual(houseBuyRule(w, WALLP), { ok: true });
  assert.deepEqual(houseBuyRule(w, WALLP), { ok: false, why: 'owned' });
  assert.equal(w.coins, 5000 - paintById(WALLP).price);
  const m = buyer(999999, { [FLOOR1]: FURN_MAX - 1 });
  assert.deepEqual(houseBuyRule(m, FLOOR1), { ok: true });
  assert.deepEqual(houseBuyRule(m, FLOOR1), { ok: false, why: 'max' });
  assert.equal(m.items[FLOOR1], FURN_MAX);
  for (const id of ['greatball', 'stone_math', 'f_없음', '', undefined]) assert.deepEqual(houseBuyRule(buyer(999999), id), { ok: false, why: 'unknown' }, String(id));
});

test('🏠 놓기: 서랍에 있을 때만(none) · 놓으면 서랍에서 하나 줄고 번호가 붙음 · 겹치거나 방 밖이면 spot · 코인·가방은 그대로', () => {
  const p = pf(100, { [FLOOR1]: 2, [WALL1]: 1 });
  assert.deepEqual(placeRule(p, R, FLOOR2, 0, 0), { ok: false, why: 'none' });
  assert.deepEqual(placeRule(p, R, FLOOR1, 0, 0), { ok: true, u: 1 });
  assert.deepEqual(placeRule(p, R, FLOOR1, 0, 0), { ok: false, why: 'spot' });
  assert.deepEqual(placeRule(p, R, FLOOR1, ROOM.W, 0), { ok: false, why: 'spot' });
  assert.deepEqual(placeRule(p, R, FLOOR1, 1, 0), { ok: true, u: 2 });
  assert.deepEqual(placeRule(p, R, FLOOR1, 2, 0), { ok: false, why: 'none' }, '둘 다 놓았다');
  assert.deepEqual(placeRule(p, R, WALL1, 0, 1), { ok: false, why: 'spot' }, '벽 물건은 벽 줄');
  assert.deepEqual(placeRule(p, R, WALL1, 0, 0), { ok: true, u: 3 });
  assert.deepEqual(placeRule(p, 'r없음', FLOOR1, 3, 3), { ok: false, why: 'room' });
  assert.deepEqual(placeRule(p, R, 'greatball', 3, 3), { ok: false, why: 'unknown' });
  assert.deepEqual(leftOf(p), {});
  assert.deepEqual([p.coins, p.items[FLOOR1], p.items[WALL1]], [100, 2, 1], '놓기는 코인·가방을 안 바꾼다');
});

test('🏠 옮기기·뒤집기·서랍에 넣기 · 벽지·바닥: 그 번호의 가구만 · 다른 가구 자리는 spot · 없는 번호는 gone · 서랍에 넣으면 다시 놓을 수 있다 · 안 가진 벽지는 none · ""는 처음 것', () => {
  const p = pf(0, { [FLOOR1]: 1, [FLOOR2]: 1, [WALLP]: 1 });
  const a = placeRule(p, R, FLOOR2, 0, 0).u;
  const b = placeRule(p, R, FLOOR1, 4, 4).u;
  assert.deepEqual(moveRule(p, R, a, 1, 0), { ok: true }, '제 자리와 겹쳐 한 칸');
  assert.deepEqual(moveRule(p, R, a, 3, 4), { ok: false, why: 'spot' }, '두 칸 가구가 다른 가구에 걸침');
  assert.deepEqual(moveRule(p, R, 99, 0, 0), { ok: false, why: 'gone' });
  assert.deepEqual(moveRule(p, 'r없음', a, 0, 0), { ok: false, why: 'room' });
  assert.deepEqual(houseOf(p).rooms[0].items.find((i) => i.u === a), { u: a, id: FLOOR2, x: 1, y: 0, f: 0 });
  assert.deepEqual(flipRule(p, R, a), { ok: true });
  assert.equal(houseOf(p).rooms[0].items.find((i) => i.u === a).f, 1);
  assert.deepEqual(flipRule(p, R, a), { ok: true });
  assert.equal(houseOf(p).rooms[0].items.find((i) => i.u === a).f, 0);
  assert.deepEqual(flipRule(p, R, 99), { ok: false, why: 'gone' });
  assert.deepEqual(storeRule(p, R, b), { ok: true });
  assert.deepEqual(storeRule(p, R, b), { ok: false, why: 'gone' });
  assert.deepEqual(leftOf(p), { [FLOOR1]: 1 });
  assert.equal(placeRule(p, R, FLOOR1, 6, 5).ok, true, '서랍에서 다시 꺼내 놓기');
  assert.ok(houseOf(p).seq > b, '번호는 다시 쓰지 않는다');
  assert.deepEqual(paintRule(p, R, 'wall', WALLP), { ok: true });
  assert.deepEqual(paintRule(p, R, 'floor', FLOORP), { ok: false, why: 'none' });
  assert.deepEqual(paintRule(p, R, 'floor', WALLP), { ok: false, why: 'unknown' }, '벽지를 바닥에');
  assert.deepEqual(paintRule(p, R, 'roof', ''), { ok: false, why: 'unknown' });
  assert.equal(houseOf(p).rooms[0].wall, WALLP);
  assert.deepEqual(paintRule(p, R, 'wall', ''), { ok: true });
  assert.equal(houseOf(p).rooms[0].wall, '');
});

// ───────────────────── 경제와 섞이지 않음 ─────────────────────

test('🏠 가구는 되팔지 않는다(아버님 ④) · 🎁 상자에서 안 나온다 · 📦 구호품으로 못 보낸다 — 가방에 같이 있어도', () => {
  const bag = { greatball: 2 };
  for (const x of [...FURN, ...PAINT]) bag[x.id] = 1;
  const sell = sellableItems(bag).map((s) => s.id || s);
  for (const x of [...FURN, ...PAINT]) {
    assert.ok(!sell.includes(x.id), `${x.id}를 팔 수 있다`);
    assert.ok(!(itemSellPrice(x.id) > 0), `${x.id} 판 값`);
    assert.equal(parcelOf({ id: 'p1', items: { [x.id]: 1 } }), null, `${x.id} 구호품`);
  }
  for (let i = 0; i < 1000; i++) assert.equal(isHouseItem(lootBox(() => i / 1000)), false, '상자');
});

// ───────────────────── 백업 병합 ─────────────────────

test('🏠 병합: 놓은 자리는 가방과 같은 쪽(최근에 저장된 쪽) · 처음 선물 표시는 OR · 번호는 큰 쪽 · 한쪽에만 집이 있으면 그 집 · 둘 다 없으면 집 없음', () => {
  const old = { ...emptyProfile(), coins: 500, items: { [FLOOR1]: 1 }, house: houseWith([{ u: 1, id: FLOOR1, x: 0, y: 0 }], { seq: 9 }), updatedAt: 10 };
  const neu = { ...emptyProfile(), coins: 100, items: { [FLOOR1]: 1, [FLOOR2]: 1 }, house: { started: false, seq: 3, rooms: [{ id: R, wall: '', floor: '', items: [{ u: 2, id: FLOOR2, x: 4, y: 4 }] }] }, updatedAt: 20 };
  for (const [a, b] of [[old, neu], [neu, old]]) {
    const m = mergeStatRecord('profile', a, b);
    assert.equal(m.coins, 100);
    assert.deepEqual(m.items, neu.items);
    assert.deepEqual(m.house.rooms[0].items, [{ u: 2, id: FLOOR2, x: 4, y: 4 }], '최근 쪽 배치');
    assert.equal(m.house.started, true, '선물 받은 표시는 OR');
    assert.equal(m.house.seq, 9, '번호는 큰 쪽');
    assert.notEqual(m.house, neu.house, '복사본');
  }
  const onlyOld = mergeStatRecord('profile', old, { ...emptyProfile(), updatedAt: 30 });
  assert.deepEqual(onlyOld.house.rooms[0].items, old.house.rooms[0].items, '최근 쪽에 집이 없으면 다른 쪽 집');
  assert.deepEqual(houseOf(onlyOld).rooms[0].items, [], '…그 가구는 최근 쪽 가방에 없어 읽을 때 빠진다');
  const none = mergeStatRecord('profile', { ...emptyProfile(), updatedAt: 1 }, { ...emptyProfile(), updatedAt: 2 });
  assert.equal('house' in none, false);
});

// ───────────────────── 진짜 저장 경로 (fakeidb) ─────────────────────

const stored = () => fakeIdb.get('profile', 'me');
async function seed(coins, items, house) {
  await flushProfile();
  const cur = stored() || emptyProfile();
  const next = { ...cur, coins, items: { ...items }, updatedAt: (cur.updatedAt || 0) + 1 };
  if (house) next.house = house; else delete next.house;
  fakeIdb.put('profile', next);
  await reloadProfile();
}
let inited = false;
async function setup() {
  if (!inited) { await initProfile(); inited = true; }
}

test('★ 🏠 저장 경로: 사기·처음 선물·놓기가 저장된 프로필에 · 창의 집·서랍도 그 결과로', async () => {
  await setup();
  await seed(5000, {});
  assert.deepEqual((await houseDo(houseStartRule)), { ok: true, gift: START_GIFT });
  assert.equal(stored().items[START_GIFT], 1);
  assert.deepEqual(await houseDo(houseStartRule), { ok: false, why: 'already' });
  assert.deepEqual(await houseDo((p) => houseBuyRule(p, FLOOR1)), { ok: true });
  assert.equal(stored().coins, 5000 - furnById(FLOOR1).price);
  const r = await houseDo((p) => placeRule(p, R, START_GIFT, 0, 0));
  assert.deepEqual(r, { ok: true, u: 1 });
  assert.deepEqual(stored().house.rooms[0].items, [{ u: 1, id: START_GIFT, x: 0, y: 0, f: 0 }]);
  assert.deepEqual(houseNow().rooms[0].items.map((i) => i.id), [START_GIFT]);
  assert.deepEqual(houseLeft(), { [FLOOR1]: 1 });
  assert.equal(getProfileSnapshot().coins, stored().coins);
});

test('★ 🏠 두 창: 다른 창이 먼저 마지막 가구를 놓았으면 이 창의 놓기는 none — 저장된 쪽으로 판정 · 이 창의 집도 다른 창 것으로 맞춰진다', async () => {
  await setup();
  await seed(0, { [FLOOR1]: 1 }, houseWith([]));
  assert.deepEqual(houseLeft(), { [FLOOR1]: 1 }, '이 창은 아직 서랍에 있다고 안다');
  const other = stored();
  other.house = houseWith([{ u: 1, id: FLOOR1, x: 5, y: 5 }], { seq: 1 });
  other.updatedAt += 1;
  fakeIdb.put('profile', other); // 다른 창이 놓음
  assert.deepEqual(await houseDo((p) => placeRule(p, R, FLOOR1, 0, 0)), { ok: false, why: 'none' });
  assert.deepEqual(stored().house.rooms[0].items, [{ u: 1, id: FLOOR1, x: 5, y: 5 }], '두 번 놓이지 않았다');
  assert.deepEqual(houseNow().rooms[0].items.map((i) => [i.x, i.y]), [[5, 5]], '이 창도 다른 창의 배치로');
  assert.deepEqual(houseLeft(), {});
});

test('★ 🏠 동시에 두 번 사기 — 코인이 하나 값뿐이면 하나만 산다 · 저장이 실패하면 없던 일(save) — 코인·가구·집 모두 그대로', async () => {
  await setup();
  const price = furnById(FLOOR2).price;
  await seed(price + 10, {}, houseWith([]));
  const rs = await Promise.all([houseDo((p) => houseBuyRule(p, FLOOR2)), houseDo((p) => houseBuyRule(p, FLOOR2))]);
  assert.deepEqual(rs.map((r) => r.ok).sort(), [false, true]);
  assert.equal(rs.find((r) => !r.ok).why, 'short');
  assert.deepEqual([stored().coins, stored().items[FLOOR2]], [10, 1]);
  await seed(5000, { [FLOOR1]: 1 }, houseWith([]));
  const s0 = stored();
  fakeIdb.failNext('profile');
  assert.deepEqual(await houseDo((p) => houseBuyRule(p, FLOOR1)), { ok: false, why: 'save' });
  assert.equal(fakeIdb.failsLeft(), 0);
  fakeIdb.failNext('profile');
  assert.deepEqual(await houseDo((p) => placeRule(p, R, FLOOR1, 0, 0)), { ok: false, why: 'save' });
  const s1 = stored();
  assert.deepEqual([s1.coins, s1.items, s1.house], [s0.coins, s0.items, s0.house]);
  assert.deepEqual([getProfileSnapshot().coins, houseNow().rooms[0].items], [5000, []], '메모리로 성공한 척하지 않는다');
});

// ───────────────────── 2단계 방 화면 (houseview.js — DOM 없이 도는 계산 · 연결) ─────────────────────

test('🏠 화면 계산 dropSpot: 가구 가운데가 손가락 아래 · 두 칸 가구는 두 칸 사이를 누르면 그 두 칸 · 방 끝에서는 안으로 당김 · 벽 물건은 벽 줄(바로 아래 반 칸까지) · 바닥 가구를 벽 위에·방 밖·모르는 가구는 null', async () => {
  const { dropSpot, WALL_RATIO } = await import('../js/houseview.js');
  const rect = { left: 100, top: 50, width: 400 };
  const cell = 50; const wallH = cell * WALL_RATIO;
  const at = (cx, cy) => [rect.left + cx * cell, rect.top + wallH + cy * cell]; // 바닥 칸 단위 자리 → 화면
  assert.deepEqual(dropSpot(rect, FLOOR1, ...at(2.5, 3.5)), { x: 2, y: 3 });
  assert.deepEqual(dropSpot(rect, FLOOR2, ...at(4, 1.5)), { x: 3, y: 1 }, '두 칸 사이');
  assert.deepEqual(dropSpot(rect, FLOOR2, ...at(0.1, 0.5)), { x: 0, y: 0 }, '왼쪽 끝 → 안으로');
  assert.deepEqual(dropSpot(rect, FLOOR2, ...at(7.98, 5.5)), { x: ROOM.W - 2, y: ROOM.H - 1 }, '오른쪽 끝 → 안으로');
  assert.deepEqual(dropSpot(rect, WALL1, rect.left + 3.5 * cell, rect.top + wallH / 2), { x: 3, y: 0 });
  assert.deepEqual(dropSpot(rect, WALL1, rect.left + 3.5 * cell, rect.top + wallH + cell * 0.4), { x: 3, y: 0 }, '벽 바로 아래 반 칸');
  assert.equal(dropSpot(rect, WALL1, ...at(3.5, 3.5)), null, '벽 물건을 바닥 한가운데에');
  assert.equal(dropSpot(rect, FLOOR1, rect.left + 50, rect.top + 10), null, '바닥 가구를 벽 위에');
  assert.deepEqual(dropSpot(rect, FLOOR1, rect.left + 75, rect.top + wallH - cell * 0.3), { x: 1, y: 0 }, '벽과 바닥 사이 조금은 바닥 첫 줄');
  assert.equal(dropSpot(rect, FLOOR1, rect.left - 1, rect.top + 200), null, '방 왼쪽 밖');
  assert.equal(dropSpot(rect, FLOOR1, rect.left + 10, rect.top + wallH + cell * ROOM.H + 1), null, '방 아래 밖');
  assert.equal(dropSpot(rect, 'f_없음', ...at(1, 1)), null);
  assert.equal(dropSpot({ left: 0, top: 0, width: 0 }, FLOOR1, 0, 0), null);
});

test('🏠 화면 계산 boxOf ↔ dropSpot: 모든 가구를 방의 모든 자리에 그린 뒤 그 가운데를 누르면 그 자리로 돌아온다 (그린 자리와 놓는 자리가 어긋나지 않게)', async () => {
  const { dropSpot, boxOf, ROOM_ROWS } = await import('../js/houseview.js');
  const rect = { left: 7, top: 11, width: 333, height: 333 * ROOM_ROWS / ROOM.W };
  let n = 0;
  for (const f of FURN) {
    const ys = f.at === 'wall' ? [0] : [...Array(ROOM.H).keys()];
    const span = f.at === 'wall' ? ROOM.WALL : ROOM.W;
    for (const y of ys) for (let x = 0; x + f.w <= span; x++) {
      const b = boxOf(f.id, x, y);
      const cx = rect.left + ((b.left + b.width / 2) / 100) * rect.width;
      const cy = rect.top + ((b.top + b.height / 2) / 100) * rect.height;
      assert.deepEqual(dropSpot(rect, f.id, cx, cy), { x, y }, `${f.id} (${x}, ${y})`);
      assert.ok(b.top + b.height <= 100.0001 && b.left + b.width <= 100.0001, `${f.id} 그림이 방 밖`);
      assert.ok(Math.abs(b.width - (f.w / ROOM.W) * 100) < 1e-9 && Math.abs(b.left - (x / ROOM.W) * 100) < 1e-9, `${f.id}: 그림 폭·자리 = 차지하는 칸 (가운데를 눌러 돌아오는 것만으로는 두 칸 가구를 한 칸으로 그려도 지나간다)`);
      n++;
    }
  }
  assert.ok(n > 300, `본 자리 ${n}`);
  assert.equal(boxOf('f_없음', 0, 0), null);
});

test('🏠 화면 연결: 🏠 창 틀(index.html) · 앱 셸에 house.js·houseview.js · 화면은 저장을 houseDo로만(규칙을 직접 저장하지 않는다)', async () => {
  const { readFileSync } = await import('node:fs');
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  for (const id of ['house', 'house-close', 'house-coins', 'house-msg', 'house-body']) assert.ok(html.includes(`id="${id}"`), id);
  assert.match(html, /<div id="house" class="modal" hidden>/);
  const sw = readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
  for (const f of ['./js/house.js', './js/houseview.js']) assert.ok(sw.includes(`'${f}'`), f);
  const src = readFileSync(new URL('../js/houseview.js', import.meta.url), 'utf8');
  assert.ok(!/applyHouseRule|mutateProfile|from '\.\/db\.js'/.test(src), '화면이 저장소를 직접 만진다');
  assert.ok(!/profile\.items\s*\[|\.house\s*=/.test(src), '화면이 프로필을 직접 고친다');
  for (const r of ['placeRule', 'moveRule', 'flipRule', 'storeRule', 'paintRule']) assert.ok(src.includes(`run((p) => ${r}(p, FIRST_ROOM,`), `${r}는 run(→ houseDo)으로`);
  assert.ok(/async function run\(rule, okText\) \{[\s\S]{0,200}await houseDo\(rule\)/.test(src), 'run은 houseDo로 저장');
  const v = await import('../js/houseview.js');
  for (const k of ['initHouse', 'openHouse', 'closeHouse', 'isHouseOpen', 'dropSpot', 'boxOf']) assert.equal(typeof v[k], 'function', k);
});

// ───────────────────── 3단계 🛒 가구 상점 · 🏠 버튼 · 🎁 이사 선물 ─────────────────────

test('🏠 houseBuyCheck: 살 수 있나 — 모자란 코인·스톤을 정확히 · 가진 수 · 무작위 프로필 4,000개에서 판정·규칙이 테스트가 따로 셈한 답과 같다(선물 전·이미 있음·한도·모자람·모르는 물건)', async () => {
  const { houseBuyCheck } = await import('../js/house.js');
  const d = furnById(DEVICE);
  assert.deepEqual(houseBuyCheck(buyer(d.price - 30, { stone_math: 0, stone_english: d.stones.stone_english }), DEVICE),
    { ok: false, why: 'short', have: 0, shortCoins: 30, shortStones: { stone_math: d.stones.stone_math } });
  assert.deepEqual(houseBuyCheck(buyer(d.price, { ...d.stones, [DEVICE]: 1 }), DEVICE), { ok: true, have: 1 });
  assert.deepEqual(houseBuyCheck(buyer(0, { [WALLP]: 1 }), WALLP), { ok: false, why: 'owned', have: 1 });
  assert.deepEqual(houseBuyCheck(buyer(999999, { [FLOOR1]: FURN_MAX }), FLOOR1), { ok: false, why: 'max', have: FURN_MAX });
  assert.deepEqual(houseBuyCheck(buyer(999999), 'greatball'), { ok: false, why: 'unknown' });
  // 무작위 — 테스트가 등록부 값으로 **따로 셈한 답**과 판정(check)·규칙(rule)이 늘 같다
  //   (Codex 45차 F: 규칙이 판정 함수를 그대로 불러 둘끼리 견주는 것만으로는 독립 검사가 아니다)
  let seed = 7;
  const rnd = (n) => { seed = (seed * 1103515245 + 12345) % 2147483648; return Math.floor(seed / 65536) % n; }; // 윗자리 — 아랫자리는 고르지 않다
  const ids = [...FURN.map((f) => f.id), ...PAINT.map((x) => x.id), 'f_없음'];
  const seen = {};
  for (let i = 0; i < 4000; i++) {
    const id = ids[rnd(ids.length)];
    const started = rnd(5) > 0;
    const coins = rnd(4200);
    const items = { stone_math: rnd(4), stone_english: rnd(4), [id]: rnd(FURN_MAX + 2) };
    const p = started ? buyer(coins, items) : pf(coins, items);
    const def = FURN.find((f) => f.id === id) || PAINT.find((x) => x.id === id);
    const have = items[id];
    let want;
    if (!def) want = 'unknown';
    else if (!started) want = 'gift';
    else if (def.part && have > 0) want = 'owned';
    else if (!def.part && have >= FURN_MAX) want = 'max';
    else if (coins < def.price || Object.entries(def.stones || {}).some(([sid, n]) => items[sid] < n)) want = 'short';
    else want = 'ok';
    seen[want] = (seen[want] || 0) + 1;
    const c = houseBuyCheck(p, id);
    assert.equal(c.ok ? 'ok' : c.why, want, `${id} 코인 ${coins} ${JSON.stringify(items)} 선물 ${started}`);
    const q = cloneProfile(p);
    const r = houseBuyRule(q, id);
    assert.equal(r.ok ? 'ok' : r.why, want, `${id} 규칙`);
    if (!r.ok) { assert.equal(JSON.stringify(q), JSON.stringify(p), '못 사면 아무것도 안 바뀐다'); continue; }
    assert.equal(q.coins, coins - def.price, '코인');
    assert.equal(q.items[id], have + 1, '하나 더');
    for (const [sid, n] of Object.entries(def.stones || {})) assert.equal(q.items[sid] || 0, items[sid] - n, sid);
  }
  for (const k of ['ok', 'gift', 'owned', 'max', 'short', 'unknown']) assert.ok(seen[k] > 30, `${k} ${seen[k]}`);
});

test('🏠 연결 (3단계): 앱 홈 머리줄에 🏠 버튼(data-open="house") · 창에 탭 자리 · app.js가 initHouse를 부른다 · houseview가 🏠 버튼을 붙인다 · 상점은 두 번 눌러야 산다 · sw v224 이상', async () => {
  const { readFileSync } = await import('node:fs');
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const home = html.slice(html.indexOf('<section id="view-home"'), html.indexOf('</section>', html.indexOf('<section id="view-home"')));
  assert.match(home, /<button id="btn-house" class="btn btn-icon" data-open="house" aria-label="진우네 집">🏠<\/button>/);
  assert.ok(html.includes('<div id="house-tabs" class="house-tabs" role="tablist"></div>'));
  const app = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
  assert.ok(app.includes("import { initHouse } from './houseview.js';"));
  assert.match(app, /\n {2}initHouse\(\);/);
  const src = readFileSync(new URL('../js/houseview.js', import.meta.url), 'utf8');
  assert.ok(src.includes("for (const b of document.querySelectorAll('[data-open=\"house\"]')) b.addEventListener('click', () => openHouse());"));
  // 두 번 누르기: 처음 누르면 buyArm만 바꾸고 돌아간다 — 사는 것(houseBuyRule)은 그 뒤에만
  const tap = src.slice(src.indexOf('async function shopTap'), src.indexOf('\n}\n', src.indexOf('async function shopTap')));
  const armAt = tap.indexOf('if (ui.buyArm !== id) {');
  const buyAt = tap.indexOf('houseBuyRule(p, id)');
  assert.ok(armAt > 0 && buyAt > armAt && /if \(ui\.buyArm !== id\) \{[\s\S]*?return;\s*\}/.test(tap), '처음 누르면 사지 않고 돌아간다');
  assert.ok(src.includes('run(houseStartRule,'), '이사 선물은 houseDo로');
  const sw = readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
  assert.ok(+(/const CACHE_VERSION = 'v(\d+)';/.exec(sw) || [])[1] >= 224, 'sw 버전 v224 이상');
});

// ───────────────────── 🔍 Codex 45차 ─────────────────────

test('🔍 Codex 45차 #1: 끌기는 **손을 뗀 자리**에 놓는다 — 손 뗀 이벤트의 좌표로 다시 셈한 뒤에 놓을 칸을 정한다 (마지막으로 움직인 자리가 아니라)', async () => {
  const { readFileSync } = await import('node:fs');
  const src = readFileSync(new URL('../js/houseview.js', import.meta.url), 'utf8');
  const up = src.slice(src.indexOf('function onUp(e) {'), src.indexOf('\n}\n', src.indexOf('function onUp(e) {')));
  const setAt = up.indexOf('d.x = e.clientX;');
  const setYAt = up.indexOf('d.y = e.clientY;');
  const hintAt = up.indexOf('showHint(d);');
  assert.ok(setAt > 0 && setYAt > 0 && hintAt > Math.max(setAt, setYAt), '손 뗀 좌표 → showHint 순서');
});

test('🔍 Codex 45차 #2: 백업의 house가 객체가 아니면(글자·참·수·배열·null) 합치기가 멈추지 않는다 — 없는 것으로 보고 다른 쪽의 멀쩡한 집을 쓴다 · 코인·가방은 그대로 최근 쪽', () => {
  const good = { ...emptyProfile(), coins: 7, items: { [FLOOR1]: 1 }, house: houseWith([{ u: 1, id: FLOOR1, x: 0, y: 0 }], { seq: 3 }), updatedAt: 1 };
  for (const bad of ['bad', true, 42, [], [1, 2], null]) {
    const rec = { ...emptyProfile(), coins: 9, items: { [FLOOR1]: 1 }, updatedAt: 2, house: bad };
    let m;
    assert.doesNotThrow(() => { m = mergeStatRecord('profile', good, rec); }, JSON.stringify(bad));
    assert.equal(m.coins, 9, '코인은 최근 쪽');
    assert.deepEqual(m.house.rooms[0].items, [{ u: 1, id: FLOOR1, x: 0, y: 0 }], `${JSON.stringify(bad)}: 다른 쪽의 멀쩡한 집`);
    assert.equal(m.house.started, true);
    assert.doesNotThrow(() => mergeStatRecord('profile', rec, good), `${JSON.stringify(bad)} 반대 순서`);
    const none = mergeStatRecord('profile', { ...emptyProfile(), updatedAt: 1 }, rec);
    assert.equal('house' in none, false, `${JSON.stringify(bad)}: 둘 다 없으면 집 없음`);
    assert.deepEqual(houseOf({ ...emptyProfile(), house: bad }), emptyHouse());
  }
});

test('🔍 Codex 45차 #3: 놓는 번호(seq)가 안전한 정수가 아니거나 너무 크면 읽을 때 1부터 다시 매긴다 — 두 번 놓으면 둘 다 남고 번호가 다르다', () => {
  for (const seq of [Number.MAX_SAFE_INTEGER, 1e20, Infinity, -5, 'x', 2.5, NaN, 1e9 + 5]) {
    const p = pf(0, { f_teddy: 3 }, houseWith([{ u: 1e20, id: 'f_teddy', x: 5, y: 5 }], { seq }));
    const a = placeRule(p, R, 'f_teddy', 0, 0);
    const b = placeRule(p, R, 'f_teddy', 1, 0);
    assert.ok(a.ok && b.ok && a.u !== b.u, `${seq}: ${JSON.stringify([a, b])}`);
    const h = houseOf(p);
    assert.deepEqual(h.rooms[0].items.map((i) => i.id), ['f_teddy', 'f_teddy', 'f_teddy'], `${seq}: 셋 다 남는다`);
    assert.ok(h.rooms[0].items.every((i) => Number.isSafeInteger(i.u) && i.u > 0) && Number.isSafeInteger(h.seq), `${seq}: 번호`);
    assert.equal(new Set(h.rooms[0].items.map((i) => i.u)).size, 3);
    assert.ok(h.rooms[0].items.every((i) => i.u <= h.seq));
  }
  // 하나만 깨져도 — 번호(seq)만 깨짐(가구 번호는 멀쩡) · 가구 번호만 깨짐(seq는 멀쩡)
  for (const [seq, u] of [[Number.MAX_SAFE_INTEGER, 1], [1e20, 1], [-5, 1], [2.5, 1], [1e9 + 5, 1], [3, 1e20], [3, Number.MAX_SAFE_INTEGER]]) {
    const p = pf(0, { f_teddy: 3 }, houseWith([{ u, id: 'f_teddy', x: 5, y: 5 }], { seq }));
    const a = placeRule(p, R, 'f_teddy', 0, 0);
    const b = placeRule(p, R, 'f_teddy', 1, 0);
    const h = houseOf(p);
    assert.ok(a.ok && b.ok && a.u !== b.u && h.rooms[0].items.length === 3 && new Set(h.rooms[0].items.map((i) => i.u)).size === 3, `seq ${seq} · u ${u}: ${JSON.stringify(h.rooms[0].items.map((i) => i.u))}`);
    assert.ok(h.rooms[0].items.every((i) => Number.isSafeInteger(i.u) && i.u <= 1e9), `seq ${seq} · u ${u}: 번호가 끝 안`);
  }
  // 멀쩡한 번호는 그대로 (다시 매기지 않는다)
  const ok = pf(0, { f_teddy: 2 }, houseWith([{ u: 4, id: 'f_teddy', x: 0, y: 0 }, { u: 9, id: 'f_teddy', x: 1, y: 0 }], { seq: 12 }));
  assert.deepEqual([houseOf(ok).rooms[0].items.map((i) => i.u), houseOf(ok).seq], [[4, 9], 12]);
});

test('🔍 Codex 45차 #4: 1단계가 모르는 방(r2…)에 놓인 가구는 서랍으로 돌아온다 — 가진 가구는 모두 지금 화면에서 닿는다', () => {
  const p = pf(0, { f_bed: 1, [FLOOR1]: 1 }, { started: true, seq: 2, rooms: [{ id: 'r2', wall: '', floor: '', items: [{ u: 1, id: 'f_bed', x: 0, y: 0 }] }, { id: R, wall: '', floor: '', items: [{ u: 2, id: FLOOR1, x: 3, y: 3 }] }] });
  const h = houseOf(p);
  assert.deepEqual(h.rooms.map((r) => r.id), [R]);
  assert.deepEqual(h.rooms[0].items.map((i) => i.id), [FLOOR1]);
  assert.deepEqual(leftOf(p), { f_bed: 1 });
  assert.ok(placeRule(p, R, 'f_bed', 0, 0).ok, '서랍에서 다시 놓을 수 있다');
});

test('🔍 Codex 45차 #5: 이사 선물을 받기 전에는 상점에서 못 산다(gift) — 침대 넷을 사고 선물을 받아 5/4가 되지 않게 · 선물을 받으면 산다', async () => {
  const p = pf(99999, {});
  for (const id of [START_GIFT, FLOOR1, WALLP, DEVICE]) assert.deepEqual(houseBuyRule(p, id), { ok: false, why: 'gift' }, id);
  assert.equal(p.coins, 99999);
  assert.deepEqual(houseStartRule(p), { ok: true, gift: START_GIFT });
  for (let i = 0; i < FURN_MAX + 1; i++) houseBuyRule(p, START_GIFT);
  assert.equal(p.items[START_GIFT], FURN_MAX, '선물 + 산 것 = 한도까지');
  const { readFileSync } = await import('node:fs');
  const src = readFileSync(new URL('../js/houseview.js', import.meta.url), 'utf8');
  const shop = src.slice(src.indexOf('function shopBox() {'), src.indexOf('\n}\n', src.indexOf('function shopBox() {')));
  assert.ok(/if \(!houseNow\(\)\.started\) \{[\s\S]*?먼저 🎁 이사 선물을 받아요[\s\S]*?goTab\('room'\)/.test(shop), '상점 탭이 선물부터 받으라고 말하고 꾸미기로 보낸다');
  assert.ok(/gift: '먼저 🎁 이사 선물을 받아요/.test(src), '눌렀을 때의 말');
});

test('🔍 Codex 45차 #6·#7: 다시 그리면 진행 중인 끌기는 없던 일(두 번째 손가락으로 다른 것을 누를 때) · 가구를 다 놓았으면 "가구를 모두 방에 놓았어요"', async () => {
  const { readFileSync } = await import('node:fs');
  const src = readFileSync(new URL('../js/houseview.js', import.meta.url), 'utf8');
  const r = src.slice(src.indexOf('function render() {'), src.indexOf('\n}\n', src.indexOf('function render() {')));
  assert.ok(/function render\(\) \{\n {2}if \(!ui\.open\) return;\n {2}if \(ui\.drag\) cancelDrag\(\);/.test(r), 'render 맨 앞에서 끌기 정리');
  assert.ok(src.includes('const anyOwned = FURN.some((f) => itemCount(f.id) > 0);') && src.includes("anyOwned ? '가구를 모두 방에 놓았어요"), '가진 가구가 있는데 서랍이 비면 "모두 놓았어요"');
});

test('★ 🔍 Codex 45차 F: 저장소 경계에서 동시에 — applyHouseRule 두 번을 한꺼번에 부르면 코인이 하나 값뿐일 때 하나만 산다 (xp 줄 세우기 없이)', async () => {
  await setup();
  const { applyHouseRule } = await import('../js/db.js');
  const price = furnById(FLOOR1).price;
  await seed(price + 1, {}, houseWith([]));
  const rs = await Promise.all([applyHouseRule((p) => houseBuyRule(p, FLOOR1)), applyHouseRule((p) => houseBuyRule(p, FLOOR1))]);
  assert.deepEqual(rs.map((r) => r.ok).sort(), [false, true]);
  assert.deepEqual([stored().coins, stored().items[FLOOR1]], [1, 1]);
});
