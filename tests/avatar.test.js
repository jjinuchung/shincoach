// 🧑 진우 캐릭터 1단계 (2026-10-17, 아버님 "진행해") — 목록·그림·규칙·저장 시험: node --test tests/avatar.test.js
// 목록(무료·가게·특별·값) · 그림(avatarSvg) · 고쳐 읽기(avatarOf — 안 가진 옷·이름표·선 칸) · 규칙(만들기·🎁·갈아입기·이름표·옮기기·사기) ·
// 경제와 섞이지 않음(팔기·상자·구호품) · 백업 병합 · 진짜 저장 경로(fakeidb — 두 창·동시에 두 번·저장 실패)
import { fakeIdb } from './fakeidb.js'; // ★ db.js·xp.js보다 먼저
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  SKINS, HAIRS, HAIR_COLORS, EYES, WEAR, SLOTS, SLOT_EMPTY_OK, LOOK_BASE, NAME_MAX, MAKE_GIFT, wearById, lookOf, canWear, nameOf, avatarOf, partnerSpot,
  avatarMakeRule, avatarLookRule, avatarNameRule, avatarMoveRule, wearCost, wearBuyCheck, wearBuyRule, copyAvatar, mergeAvatar,
} from '../js/avatar.js';
import { avatarSvg, shade } from '../js/avatarart.js';
import { makeSerial, closetOf, shopOf, WEAR_VERB } from '../js/avatarview.js';
import { FURN, FIRST_ROOM, SECOND_ROOM, ROOM, ROOM_WIDE, MATH_RATE, isHouseItem } from '../js/house.js';
import { emptyProfile, cloneProfile, mergeStatRecord } from '../js/db.js';
import { ITEMS, itemById, lootBox, parcelOf } from '../js/items.js';
import { sellableItems, itemSellPrice } from '../js/sell.js';
import { initProfile, flushProfile, reloadProfile, houseDo, getProfileSnapshot } from '../js/xp.js';

const R = FIRST_ROOM;
const T = 1_700_000_000_000;
const houseWith = (items, extra = {}) => ({ started: true, seq: 9, rooms: [{ id: R, wall: '', floor: '', items }], ...extra });
/** 코인·가방·집을 가진 프로필 (복사본) */
const pf = (coins = 0, items = {}, house = houseWith([]), avatar) => cloneProfile({ ...emptyProfile(), coins, items: { ...items }, house, ...(avatar ? { avatar } : {}) });
/** 이미 만든 캐릭터 */
const made = (look = {}, extra = {}) => ({ made: true, gifted: true, look: { ...LOOK_BASE, ...look }, name: '', spot: { room: R, x: 1, y: 1 }, at: T, ...extra });
const FREE = WEAR.filter((w) => w.free);
const SHOP = WEAR.filter((w) => !w.free && !w.lake); // 🎣 낚시 채비 가게 옷(v368 lake)은 옷 가게 값 규칙 밖 — tests/river368에서
const SPECIAL = WEAR.filter((w) => w.special);

// ───────────────────── 목록 ─────────────────────

test('🧑 목록: 처음 만들기는 피부 4 · 머리 모양 4 · 머리색 5 · 눈 3 · 기본 윗옷 3 + 🧢 트레이너 조끼 · 바지 3(무료) · 트레이너 모자·장갑·배낭도 무료(v293) · 옷은 a_ · 겹치는 id 없음 · ITEMS 등록부 밖 · 집 물건과 안 겹침', () => {
  assert.deepEqual([SKINS.length, HAIRS.length, HAIR_COLORS.length, EYES.length], [4, 4, 5, 3]);
  assert.deepEqual(['top', 'bottom', 'shoes', 'gloves', 'hat', 'bag', 'cape'].map((s) => FREE.filter((w) => w.slot === s).length), [4, 3, 1, 1, 1, 1, 0]);
  const ids = WEAR.map((w) => w.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const w of WEAR) {
    assert.match(w.id, /^a_/);
    assert.ok(SLOTS.includes(w.slot), w.id);
    assert.equal(itemById(w.id), null, `${w.id}가 ITEMS 등록부에 있다 — 상자·팔기·구호품에 섞인다`);
    assert.equal(isHouseItem(w.id), false);
    assert.match(w.art.color, /^#[0-9a-f]{6}$/i, w.id);
    if (w.free) assert.ok(!w.price && !w.stones, `${w.id} 무료 옷에 값`);
  }
  for (const it of ITEMS) assert.equal(wearById(it.id), null);
  for (const f of FURN) assert.equal(wearById(f.id), null);
  for (const list of [SKINS, HAIR_COLORS]) for (const x of list) assert.match(x.color, /^#[0-9a-f]{6}$/i);
  // 처음 모습은 무료로만
  for (const slot of SLOTS) if (LOOK_BASE[slot]) assert.ok(wearById(LOOK_BASE[slot]).free, slot);
  assert.deepEqual(SLOTS.filter((s) => !LOOK_BASE[s]), SLOT_EMPTY_OK, '장갑·모자·가방·망토만 비운 채로 시작');
});

test('👕 값 (아버님 기본안): 윗옷 무늬 💰300~500 · 모자 💰400~600 · 신발·가방 💰400~800 · ✨ 특별 셋은 💰 + 🔷·🔶(🔷는 집처럼 MATH_RATE배) · 🎁 첫 운동화도 가게에 있다', () => {
  const range = (w) => (w.slot === 'top' ? [300, 500] : w.slot === 'hat' ? [400, 600] : [400, 800]);
  for (const w of SHOP.filter((x) => !x.special)) {
    const [lo, hi] = range(w);
    assert.ok(w.price >= lo && w.price <= hi, `${w.id} ${w.price}`);
    assert.ok(!w.stones, `${w.id}는 코인만`);
  }
  assert.equal(SPECIAL.length, 3);
  for (const w of SPECIAL) {
    assert.ok(w.price >= 2000, w.id);
    assert.ok(w.stones.stone_math > 0 && w.stones.stone_english > 0, `${w.id}는 두 과목 스톤`);
    assert.equal(w.stones.stone_math % MATH_RATE, 0, `${w.id} 🔷는 ${MATH_RATE}배`);
  }
  assert.deepEqual(WEAR.filter((w) => w.gift).map((w) => w.id), [MAKE_GIFT]);
  assert.ok(wearById(MAKE_GIFT).price > 0 && !wearById(MAKE_GIFT).free);
  assert.deepEqual(wearCost('a_cape'), { coins: 2000, items: { stone_math: 5, stone_english: 1 } });
  assert.deepEqual(wearCost('a_top_red'), { coins: 0, items: {} });
});

test('👕 옷은 되팔지 않는다 · 🎁 상자에서 안 나온다 · 📦 구호품으로 못 보낸다 — 가방에 같이 있어도', () => {
  const bag = { greatball: 2 };
  for (const w of WEAR) bag[w.id] = 1;
  const sell = sellableItems(bag).map((s) => s.id || s);
  for (const w of WEAR) {
    assert.ok(!sell.includes(w.id), `${w.id}를 팔 수 있다`);
    assert.ok(!(itemSellPrice(w.id) > 0), `${w.id} 판 값`);
    assert.equal(parcelOf({ id: 'p1', items: { [w.id]: 1 } }), null, `${w.id} 구호품`);
  }
  for (let i = 0; i < 1000; i++) assert.equal(wearById(lootBox(() => i / 1000)), null, '상자');
});

// ───────────────────── 그림 ─────────────────────

test('🎨 그림 (avatarSvg): 모습마다 그 칸이 그려진다 · 모르는 모습은 처음 모습 · 무늬 자르기 id는 uid마다 · 이름은 escape · 바깥 그림·주소 없음', () => {
  const base = avatarSvg({});
  assert.match(base, /^<svg viewBox="0 0 100 124" xmlns="http:\/\/www\.w3\.org\/2000\/svg" role="img" aria-hidden="true">/);
  assert.ok(base.endsWith('</svg>'));
  assert.equal(avatarSvg({ hair: 'zzz', top: 'a_hat_cap', skin: 9 }), base, '모르는 값·입는 곳이 다른 옷은 처음 모습으로');
  assert.equal(avatarSvg(null), base);
  // 칸마다 그림이 달라진다 (같은 그림이면 고르기가 아무 일도 안 한다)
  const seen = new Set([base]);
  for (const [k, list] of [['skin', SKINS], ['hair', HAIRS], ['hairColor', HAIR_COLORS], ['eyes', EYES]]) for (const x of list) if (x.id !== LOOK_BASE[k]) { const s = avatarSvg({ [k]: x.id }); assert.ok(!seen.has(s), `${k} ${x.id}`); seen.add(s); }
  for (const w of WEAR) if (w.id !== LOOK_BASE[w.slot]) { const s = avatarSvg({ [w.slot]: w.id }); assert.ok(!seen.has(s), w.id); seen.add(s); }
  // 무늬 자르기 id
  assert.match(avatarSvg({}, { uid: 'x 1"<' }), /id="av-clip-x1"/);
  assert.notEqual(avatarSvg({}, { uid: 1 }), avatarSvg({}, { uid: 2 }));
  // 이름(화면 읽기)·class는 escape
  const t = avatarSvg({}, { title: '<나>&"', cls: 'a"b' });
  assert.ok(t.includes('<title>&lt;나&gt;&amp;&quot;</title>') && t.includes('class="a&quot;b"') && !t.includes('aria-hidden'));
  // 바깥 그림·주소 없음(파일·저작권 없음) — xmlns 하나뿐
  for (const s of seen) assert.equal((s.match(/http/g) || []).length, 1);
  assert.ok(!avatarSvg({}, { shadow: false }).includes('opacity="0.13"') && base.includes('opacity="0.13"'), '발밑 그림자');
  assert.equal(shade('#ffffff', 0.5), '#808080');
  assert.equal(shade('red', 0.5), 'red');
});

// ───────────────────── 고쳐 읽기 ─────────────────────

test('🧑 고쳐 읽기 (avatarOf): 안 만들었으면 처음 모습·선 칸 없음 · 안 가진 옷은 벗김 · 이름표 8자·특수 글자 빼기 · 깨진 at은 0', () => {
  assert.deepEqual(avatarOf(pf()), { made: false, gifted: false, look: { ...LOOK_BASE }, name: '', spot: null, at: 0 });
  assert.deepEqual(avatarOf(pf(0, {}, houseWith([]), 'x')).look, { ...LOOK_BASE });
  const a = avatarOf(pf(0, { a_hat_cap: 1 }, houseWith([]), made({ hat: 'a_hat_cap', top: 'a_top_star', cape: 'a_cape', shoes: 'a_shoe_boots' })));
  assert.deepEqual([a.look.hat, a.look.top, a.look.cape, a.look.shoes], ['a_hat_cap', LOOK_BASE.top, '', LOOK_BASE.shoes], '가방에 없는 옷은 기본 옷으로·비울 수 있는 곳은 비움');
  assert.equal(nameOf('  개굴 짱짱맨입니다요  '), '개굴 짱짱맨입니');
  assert.equal([...nameOf('😀'.repeat(20))].length, NAME_MAX, '그림 글자도 한 자');
  assert.equal(nameOf('<b>a\u0007b</b>'), 'bab/b');
  assert.equal(nameOf(7), '');
  for (const at of [1e300, -5, 1.5, '9', NaN]) assert.equal(avatarOf(pf(0, {}, houseWith([]), made({}, { at }))).at, 0, String(at));
  assert.equal(canWear(pf(), 'a_top_red'), true);
  assert.equal(canWear(pf(), 'a_hat_cap'), false);
  assert.equal(canWear(pf(0, { a_hat_cap: 1 }), 'a_hat_cap'), true);
  assert.equal(canWear(pf(0, { f_bed: 1 }), 'f_bed'), false);
  // lookOf: 비울 수 있는 곳만 '' · 다른 곳은 처음 것
  assert.deepEqual(lookOf({ top: '', hat: '', bag: 'a_hat_cap' }), { ...LOOK_BASE });
});

test('🚶 선 칸: 방 가운데에서 가장 가까운 빈 칸 · 가구에 덮이면 비켜 섬 · 없는 방(2층이 사라짐)이면 1층 · 방이 꽉 차면 없음 · 🤝 파트너는 오른쪽, 막히면 왼쪽', () => {
  const bed = { u: 1, id: 'f_bed', x: 3, y: 3, f: 0 }; // (3,3)(4,3)
  const p = pf(0, { f_bed: 1 }, houseWith([bed]), made({}, { spot: null }));
  assert.deepEqual(avatarOf(p).spot, { room: R, x: 4, y: 2 }, '가운데(4,3)는 침대 — 거리 1 가운데 위쪽 먼저');
  const p2 = pf(0, { f_bed: 1 }, houseWith([bed]), made({}, { spot: { room: R, x: 3, y: 3 } }));
  assert.deepEqual(avatarOf(p2).spot, { room: R, x: 3, y: 2 }, '침대를 캐릭터 칸에 놓으면 가까운 빈 칸으로');
  assert.deepEqual(avatarOf(pf(0, {}, houseWith([]), made({}, { spot: { room: SECOND_ROOM, x: 1, y: 1 } }))).spot, { room: R, x: 4, y: 3 });
  assert.deepEqual(avatarOf(pf(0, {}, houseWith([]), made({}, { spot: { room: R, x: 99, y: 0 } }))).spot, { room: R, x: 7, y: 0 }, '방 밖이면 가장 가까운 칸');
  // 2층이 있는 집에서는 2층에 선다
  const two = { started: true, seq: 0, rooms: [{ id: R, wall: '', floor: '', items: [] }, { id: SECOND_ROOM, wall: '', floor: '', items: [] }] };
  assert.deepEqual(avatarOf(pf(0, { x_wide: 1, x_floor2: 1 }, two, made({}, { spot: { room: SECOND_ROOM, x: 9, y: 6 } }))).spot, { room: SECOND_ROOM, x: 9, y: 6 });
  // 꽉 찬 방 — 한 칸 가구를 모든 칸에 (가진 수만큼 읽히게 가방도)
  const all = [];
  let u = 0;
  for (let y = 0; y < ROOM.H; y++) for (let x = 0; x < ROOM.W; x++) all.push({ u: ++u, id: 'f_teddy', x, y, f: 0 });
  assert.equal(avatarOf(pf(0, { f_teddy: all.length }, houseWith(all, { seq: u }), made())).spot, null);
  // 🔍 Codex 90차 #1: 1층이 꽉 차도 빈 2층이 있으면 2층 가운데에 선다(사라져서 끌어 옮길 수도 없던 것)
  const full2 = { started: true, seq: u, rooms: [{ id: R, wall: '', floor: '', items: [] }, { id: SECOND_ROOM, wall: '', floor: '', items: [] }] };
  let v = 0;
  for (let y = 0; y < ROOM_WIDE.H; y++) for (let x = 0; x < ROOM_WIDE.W; x++) full2.rooms[0].items.push({ u: ++v, id: 'f_teddy', x, y, f: 0 });
  full2.seq = v;
  assert.deepEqual(avatarOf(pf(0, { f_teddy: v, x_wide: 1, x_floor2: 1 }, full2, made())).spot, { room: SECOND_ROOM, x: 5, y: 3 });
  // 파트너
  const q = pf(0, { f_bed: 1 }, houseWith([bed]), made({}, { spot: { room: R, x: 2, y: 3 } }));
  assert.deepEqual(partnerSpot(q, avatarOf(q).spot), { room: R, x: 1, y: 3 }, '오른쪽(3,3)은 침대 → 왼쪽');
  assert.deepEqual(partnerSpot(q, { room: R, x: 0, y: 0 }), { room: R, x: 1, y: 0 });
  assert.deepEqual(partnerSpot(q, { room: R, x: 3, y: 0 }), { room: R, x: 4, y: 0 }, '양쪽이 다 비었으면 오른쪽');
  assert.deepEqual(partnerSpot(q, { room: R, x: ROOM.W - 1, y: 0 }), { room: R, x: ROOM.W - 2, y: 0 }, '오른쪽 끝이면 왼쪽');
  assert.equal(partnerSpot(q, null), null);
  assert.equal(partnerSpot(q, { room: 'r9', x: 0, y: 0 }), null);
  assert.deepEqual([ROOM_WIDE.W, ROOM_WIDE.H], [10, 7]);
});

// ───────────────────── 규칙 ─────────────────────

test('🧑 처음 만들기: 한 번만 · 🎁 첫 운동화를 받아 바로 신음 · 고른 모습·이름표 · 처음엔 무료 옷만 · 선물은 gifted면 다시 안 줌', () => {
  const p = pf(100);
  const r = avatarMakeRule(p, { ...LOOK_BASE, hair: 'spiky', hairColor: 'blue', top: 'a_top_red' }, '  나야나  ', T);
  assert.deepEqual(r, { ok: true, gift: MAKE_GIFT });
  assert.equal(p.items[MAKE_GIFT], 1);
  assert.deepEqual(p.avatar, { made: true, gifted: true, look: { ...LOOK_BASE, hair: 'spiky', hairColor: 'blue', top: 'a_top_red', shoes: MAKE_GIFT }, name: '나야나', spot: { room: R, x: 4, y: 3 }, at: T });
  assert.equal(p.coins, 100, '만들기는 무료');
  assert.deepEqual(avatarMakeRule(p, LOOK_BASE, '', T + 5), { ok: false, why: 'already' });
  assert.equal(p.items[MAKE_GIFT], 1, '선물은 한 번');
  // 처음엔 가게 옷을 못 고른다 · 모르는 값은 unknown
  assert.deepEqual(avatarMakeRule(pf(), { ...LOOK_BASE, hat: 'a_hat_cap' }, '', T), { ok: false, why: 'none', id: 'a_hat_cap' });
  assert.deepEqual(avatarMakeRule(pf(), { ...LOOK_BASE, hair: 'mohawk' }, '', T), { ok: false, why: 'unknown' });
  assert.deepEqual(avatarMakeRule(pf(), { ...LOOK_BASE, top: '' }, '', T), { ok: false, why: 'unknown' }, '윗옷은 벗을 수 없다');
  assert.deepEqual(avatarMakeRule(pf(), 'x', '', T), { ok: false, why: 'unknown' });
  // 옛 백업으로 made만 false가 된 경우 — 선물은 이미 받았으니 다시 안 준다(가방의 운동화는 그대로)
  const q = pf(0, { [MAKE_GIFT]: 1 }, houseWith([]), { made: false, gifted: true, at: T + 50 });
  assert.deepEqual(avatarMakeRule(q, LOOK_BASE, '', T), { ok: true, gift: '' });
  assert.equal(q.items[MAKE_GIFT], 1);
  assert.equal(q.avatar.at, T + 51, '바꾼 시각은 앞으로만 (시계가 뒤로 가도)');
  assert.equal(q.avatar.look.shoes, LOOK_BASE.shoes);
});

test('👕 갈아입기·이름표·옮기기: 만든 뒤에만 · 바꿀 칸만 줘도 됨 · 안 가진 옷은 none · 바꾼 시각은 누를 때마다 앞으로(같은 ms여도)', () => {
  assert.deepEqual(avatarLookRule(pf(), { hair: 'bowl' }, T), { ok: false, why: 'made' });
  assert.deepEqual(avatarNameRule(pf(), 'a', T), { ok: false, why: 'made' });
  assert.deepEqual(avatarMoveRule(pf(), R, 0, 0, T), { ok: false, why: 'made' });
  const p = pf(0, { a_hat_cap: 1, f_bed: 1 }, houseWith([{ u: 1, id: 'f_bed', x: 3, y: 3, f: 0 }]), made({ eyes: 'smile' }));
  assert.deepEqual(avatarLookRule(p, { hat: 'a_hat_cap', hairColor: 'gold' }, T), { ok: true });
  assert.deepEqual([p.avatar.look.hat, p.avatar.look.hairColor, p.avatar.look.eyes], ['a_hat_cap', 'gold', 'smile']);
  assert.equal(p.avatar.at, T + 1, '같은 ms에 바꿔도 앞으로');
  assert.deepEqual(avatarLookRule(p, { cape: 'a_cape' }, T + 9), { ok: false, why: 'none', id: 'a_cape' });
  assert.deepEqual(avatarLookRule(p, { top: 'a_hat_cap' }, T + 9), { ok: false, why: 'unknown' });
  assert.deepEqual(avatarLookRule(p, { hat: '' }, T + 9), { ok: true }, '모자는 벗을 수 있다');
  assert.equal(p.avatar.look.hat, '');
  assert.deepEqual(avatarNameRule(p, ' 개굴 대장 ', T + 10), { ok: true, name: '개굴 대장' });
  assert.equal(p.avatar.name, '개굴 대장');
  assert.deepEqual(avatarMoveRule(p, R, 4, 3, T + 11), { ok: false, why: 'spot' }, '침대 칸');
  assert.deepEqual(avatarMoveRule(p, R, 8, 0, T + 11), { ok: false, why: 'spot' }, '방 밖');
  assert.deepEqual(avatarMoveRule(p, R, 1.5, 0, T + 11), { ok: false, why: 'spot' });
  assert.deepEqual(avatarMoveRule(p, SECOND_ROOM, 0, 0, T + 11), { ok: false, why: 'room' }, '2층이 없다');
  assert.deepEqual(avatarMoveRule(p, R, 0, 5, T + 11), { ok: true });
  assert.deepEqual(p.avatar.spot, { room: R, x: 0, y: 5 });
});

test('👕 옷 사기: 캐릭터를 먼저 · 처음부터 있는 옷·집 물건은 unknown · 하나씩(owned) · 💰·스톤이 모자라면 short(모자란 만큼) · 사면 바로 입음 · 스톤은 0이면 가방에서 지움', () => {
  assert.deepEqual(wearBuyCheck(pf(9999), 'a_hat_cap'), { ok: false, why: 'made' });
  const p = pf(2400, { stone_math: 5, stone_english: 1 }, houseWith([]), made());
  for (const id of ['a_top_red', 'f_bed', 'greatball', 'zzz']) assert.deepEqual(wearBuyCheck(p, id), { ok: false, why: 'unknown' }, id);
  assert.deepEqual(wearBuyCheck(p, 'a_crown'), { ok: false, why: 'short', shortCoins: 100, shortStones: { stone_english: 1 } });
  assert.deepEqual(wearBuyRule(p, 'a_cape', T), { ok: true });
  assert.deepEqual([p.coins, p.items.a_cape, 'stone_math' in p.items, 'stone_english' in p.items, p.avatar.look.cape], [400, 1, false, false, 'a_cape']);
  assert.deepEqual(wearBuyRule(p, 'a_cape', T), { ok: false, why: 'owned' });
  assert.deepEqual(wearBuyRule(p, 'a_top_stripe', T + 1, false), { ok: true });
  assert.deepEqual([p.coins, p.avatar.look.top], [100, LOOK_BASE.top], 'wear false면 안 입음');
  assert.deepEqual(wearBuyRule(p, 'a_hat_cap', T + 2), { ok: false, why: 'short' });
  assert.equal(p.coins, 100, '모자라면 코인 그대로');
});

// ───────────────────── 복사·병합 ─────────────────────

test('🧑 복사·병합: 복사본을 고쳐도 원본 그대로 · 만들었나·선물은 OR · 모습·이름·칸은 바꾼 시각이 나중인 쪽(같으면 기기 쪽) · 깨진 쪽은 없는 것으로 · 프로필 병합에 이어짐', () => {
  const orig = { ...emptyProfile(), avatar: made({ hair: 'bowl' }) };
  const c = cloneProfile(orig);
  c.avatar.look.hair = 'spiky';
  c.avatar.spot.x = 7;
  assert.deepEqual([orig.avatar.look.hair, orig.avatar.spot.x], ['bowl', 1]);
  assert.equal(copyAvatar('x'), null);
  assert.equal(mergeAvatar(null, [1]), null);
  const a = made({ hair: 'bowl' }, { at: 5, gifted: false });
  const b = { made: false, gifted: true, look: { hair: 'spiky' }, at: 9 };
  assert.deepEqual(mergeAvatar(a, b), { made: true, gifted: true, look: { hair: 'spiky' }, at: 9 });
  assert.equal(mergeAvatar(made({ hair: 'bowl' }, { at: 5 }), made({ hair: 'side' }, { at: 5 })).look.hair, 'bowl', '같은 시각이면 기기 쪽');
  assert.equal(mergeAvatar(made({}, { at: 5 }), made({ hair: 'side' }, { at: 1e300 })).look.hair, LOOK_BASE.hair, '깨진 큰 시각이 이기지 않는다');
  assert.deepEqual(mergeAvatar(undefined, made()), made());
  // 프로필 병합: 옷은 가방과 같은 쪽 · 모습은 시각 · 안 가진 옷을 입은 모습이 이기면 읽을 때 벗김
  const dev = { ...emptyProfile(), coins: 10, items: {}, avatar: made({ hat: '' }, { at: 100 }), updatedAt: 20 };
  const bak = { ...emptyProfile(), coins: 900, items: { a_hat_cap: 1 }, avatar: made({ hat: 'a_hat_cap' }, { at: 200, gifted: false }), updatedAt: 10 };
  const m = mergeStatRecord('profile', dev, bak);
  assert.deepEqual([m.coins, m.items.a_hat_cap, m.avatar.look.hat, m.avatar.gifted], [10, undefined, 'a_hat_cap', true]);
  assert.equal(avatarOf(m).look.hat, '', '가방에 없는 모자는 벗는다');
  const none = mergeStatRecord('profile', { ...emptyProfile(), updatedAt: 1 }, { ...emptyProfile(), updatedAt: 2 });
  assert.equal('avatar' in none, false);
  const one = mergeStatRecord('profile', { ...emptyProfile(), updatedAt: 1 }, { ...emptyProfile(), avatar: made(), updatedAt: 2 });
  assert.equal(one.avatar.made, true);
});

test('👕 옷장 (avatarview 순수 부분): 저장은 차례대로 — 앞 일이 끝난 뒤에 다음 일(앞 일이 실패해도) · 옷장 옷은 무료 + 산 것(비울 수 있는 곳은 "없음"부터) · 가게는 안 산 것만 · 옷마다 알맞은 말', async () => {
  // 🔍 Codex 90차 #2: 이름표를 고치고(저장 중) 바로 옷을 누르면 두 번째가 버려졌다 — 줄을 서서 둘 다
  const q = makeSerial();
  const log = [];
  let open;
  const first = q(() => new Promise((res) => { log.push('이름 시작'); open = () => { log.push('이름 끝'); res('a'); }; }));
  const second = q(() => { log.push('옷'); return 'b'; });
  await new Promise((r) => setTimeout(r, 5));
  assert.deepEqual(log, ['이름 시작'], '앞 일이 끝나기 전에는 시작하지 않는다');
  open();
  assert.deepEqual(await Promise.all([first, second]), ['a', 'b']);
  assert.deepEqual(log, ['이름 시작', '이름 끝', '옷']);
  const bad = q(() => { throw new Error('저장 실패'); });
  await assert.rejects(bad);
  assert.equal(await q(() => 'c'), 'c', '앞 일이 실패해도 다음 일은 한다');
  // 옷장·가게
  const p = pf(0, { a_hat_cap: 1, a_cape: 1 });
  assert.deepEqual(closetOf(p, 'hat'), ['', 'a_hat_trainer', 'a_hat_cap'], '🧢 트레이너 모자는 처음부터 (v293)');
  assert.deepEqual(closetOf(p, 'top'), WEAR.filter((w) => w.slot === 'top' && w.free).map((w) => w.id), '윗옷은 비울 수 없다');
  assert.deepEqual(closetOf(pf(), 'bag'), ['', 'a_bag_trainer']);
  assert.deepEqual(closetOf(pf(), 'gloves'), ['', 'a_glove_green']);
  const shop = shopOf(p);
  assert.ok(!shop.plain.includes('a_hat_cap') && !shop.special.includes('a_cape') && shop.special.includes('a_crown'));
  assert.ok(![...shop.plain, ...shop.special].some((id) => wearById(id).free), '처음부터 있는 옷은 가게에 없다');
  assert.deepEqual(SLOTS.map((s) => WEAR_VERB[s]), ['입었어요', '입었어요', '신었어요', '꼈어요', '썼어요', '멨어요', '둘렀어요']);
});

// ───────────────────── 진짜 저장 경로 (fakeidb) ─────────────────────

const stored = () => fakeIdb.get('profile', 'me');
async function seed(coins, items, extra = {}) {
  await flushProfile();
  const cur = stored() || emptyProfile();
  const next = { ...cur, coins, items: { ...items }, house: houseWith([]), ...extra, updatedAt: (cur.updatedAt || 0) + 1 };
  if (!('avatar' in extra)) delete next.avatar;
  fakeIdb.put('profile', next);
  await reloadProfile();
}
let inited = false;
async function setup() {
  if (!inited) { await initProfile(); inited = true; }
}

test('★ 🧑 저장 경로: 만들기·사기·갈아입기가 저장된 프로필에 · 두 창이 동시에 만들어도 🎁 한 번 · 동시에 두 번 사기는 하나 · 저장이 실패하면 없던 일', async () => {
  await setup();
  await seed(600, {});
  const rs = await Promise.all([houseDo((p) => avatarMakeRule(p, LOOK_BASE, '나', Date.now())), houseDo((p) => avatarMakeRule(p, LOOK_BASE, '나', Date.now()))]);
  assert.deepEqual(rs.map((r) => r.ok).sort(), [false, true]);
  assert.equal(rs.find((r) => !r.ok).why, 'already');
  assert.equal(stored().items[MAKE_GIFT], 1);
  assert.equal(stored().avatar.made, true);
  assert.equal(getProfileSnapshot().avatar.made, true, '창의 프로필도');
  const two = await Promise.all([houseDo((p) => wearBuyRule(p, 'a_hat_cap', Date.now())), houseDo((p) => wearBuyRule(p, 'a_hat_cap', Date.now()))]);
  assert.deepEqual(two.map((r) => r.ok).sort(), [false, true]);
  assert.deepEqual([stored().coins, stored().items.a_hat_cap, stored().avatar.look.hat], [100, 1, 'a_hat_cap']);
  const s0 = stored();
  fakeIdb.failNext('profile');
  assert.deepEqual(await houseDo((p) => avatarLookRule(p, { hat: '' }, Date.now())), { ok: false, why: 'save' });
  assert.deepEqual(stored().avatar, s0.avatar);
  assert.equal(getProfileSnapshot().avatar.look.hat, 'a_hat_cap', '메모리로 성공한 척하지 않는다');
});
