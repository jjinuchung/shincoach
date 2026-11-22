// 🪜 계단 (v435 · 2026-11-21 진우 「1층에서 2층으로 올라가는 계단 · 캐릭터가 올라가는 모션」 → 아버님 시안 「이대로」) — node --test tests/stair435.test.js
// 2층이 있으면 공짜로 생김 · 1층 맨 뒤 줄 두 칸 + 그 위 벽 · 2층 같은 자리 구멍 · 끌어 옮기기(두 층 모두 비어야) · 캐릭터가 층을 옮기는 길은 계단뿐
import { fakeIdb } from './fakeidb.js'; // ★ db.js·xp.js보다 먼저
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ROOM_WIDE, FIRST_ROOM, SECOND_ROOM, HEAL, FURN_MAX_2F, STAIR_W, houseOf, leftOf, takenCells, canPlace, placeRule, moveRule, canStair, stairCells, stairExit, stairMoveRule, stairStartRule, stairSaved, houseStartRule, houseBuyRule } from '../js/house.js';
import { avatarOf, avatarFloorRule, avatarMoveRule, partnerSpot } from '../js/avatar.js';
import { palHome, playSpot } from '../js/homeplay.js';
import { emptyProfile, cloneProfile, mergeStatRecord } from '../js/db.js';
import { geoOf, cellFoot, stairBox, holeBox, stairPt, holePt, climbPts, gridPath, stairBackSvg, stairFrontSvg, holeBackSvg, holeFrontSvg } from '../js/stairart.js';
import { initProfile, flushProfile, reloadProfile, houseDo, houseNow, getProfileSnapshot } from '../js/xp.js';

void fakeIdb;
const src = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const R1 = FIRST_ROOM;
const R2 = SECOND_ROOM;
const { W, H } = ROOM_WIDE;
const TWO = { x_wide: 1, x_floor2: 1 };
const LOOK = { skin: 's1', hair: 'short', hairColor: 'black', eyes: 'dot' };
const made = (spot) => ({ made: true, gifted: true, look: { ...LOOK }, name: '진우', spot: spot || null, at: 5 });
/** 2층 집 — r1·r2 가구 · 가방 · 저장된 계단(없으면 undefined) · 캐릭터 */
const home = ({ r1 = [], r2 = [], items = {}, stair, avatar, partner } = {}) => cloneProfile({
  ...emptyProfile(),
  coins: 0,
  items: { ...TWO, ...items },
  ...(partner ? { partner, caught: { [partner]: 1 } } : {}),
  house: { started: true, seq: 50, rooms: [{ id: R1, wall: '', floor: '', items: r1 }, { id: R2, wall: '', floor: '', items: r2 }], ...(stair === undefined ? {} : { stair }) },
  ...(avatar ? { avatar } : {}),
});
const it = (u, id, x, y, extra = {}) => ({ u, id, x, y, f: 0, ...extra });
const ids = (h, rid) => h.rooms.find((r) => r.id === rid).items.map((i) => i.u);

test('🪜 2층이 있어야 계단 — 방 하나(넓혀도)면 stair 없음 · 2층이 있으면 빈 집은 맨 오른쪽(x = W − 2) · 방마다 room.stair · 계단 칸(1층 바닥·벽, 2층 바닥)', () => {
  const one = cloneProfile({ ...emptyProfile(), items: { x_wide: 1 }, house: { started: true, seq: 0, rooms: [{ id: R1, items: [] }] } });
  const h1 = houseOf(one);
  assert.equal(h1.stair, undefined);
  assert.equal(h1.rooms[0].stair, undefined);
  assert.equal(stairSaved(one), false);
  const h = houseOf(home());
  assert.equal(h.stair, W - STAIR_W);
  assert.deepEqual(h.rooms.map((r) => [r.id, r.stair]), [[R1, W - 2], [R2, W - 2]]);
  assert.deepEqual(stairCells(R1, 3), ['3,0', 'w:3', '4,0', 'w:4']);
  assert.deepEqual(stairCells(R2, 3), ['3,0', '4,0'], '2층은 바닥(구멍)만 — 2층 벽은 그대로');
  const t1 = takenCells(h.rooms[0]);
  const t2 = takenCells(h.rooms[1]);
  for (const c of ['8,0', '9,0', 'w:8', 'w:9']) assert.ok(t1.has(c), c);
  for (const c of ['8,0', '9,0']) assert.ok(t2.has(c), c);
  assert.ok(!t2.has('w:8') && !t2.has('w:9'));
  assert.ok(!t1.has('8,1') && !t1.has('7,0'), '계단 앞 칸·옆 칸은 비어 있다');
  // 집 객체가 없어도(만든 백업) 2층이면 계단
  const bare = cloneProfile({ ...emptyProfile(), items: { ...TWO } });
  assert.equal(houseOf(bare).stair, W - 2);
  assert.deepEqual(houseOf(bare).rooms.map((r) => r.stair), [W - 2, W - 2], '방마다도 — 캐릭터가 계단 칸에 서지 않게');
  assert.ok(takenCells(houseOf(bare).rooms[1]).has(`${W - 2},0`));
});

test('🪜 자리 고르기 — 저장이 없으면 가구가 안 걸리는 자리(오른쪽부터) · 벽 물건도 셈 · 다 걸리면 가장 적게(같으면 오른쪽) · 쉬는 캡슐은 피한다 · 걸린 가구는 서랍으로(사라지지 않음)', () => {
  assert.equal(houseOf(home({ r1: [it(1, 'f_sofa', 8, 0)], items: { f_sofa: 1 } })).stair, 6, '1층 소파(8~9,0) → 6');
  assert.equal(houseOf(home({ r2: [it(1, 'f_chair', 7, 0)], items: { f_chair: 1 } })).stair, 8, '2층 의자(7,0)는 x 8을 안 막는다');
  assert.equal(houseOf(home({ r2: [it(1, 'f_chair', 8, 0)], items: { f_chair: 1 } })).stair, 6, '2층 의자(8,0) → 7도 걸림 → 6');
  assert.equal(houseOf(home({ r1: [it(1, 'f_clock', 9, 0)], items: { f_clock: 1 } })).stair, 7, '1층 벽 시계(w:9) → 8은 걸림 · 7은 w:7·w:8이라 된다');
  assert.equal(houseOf(home({ r1: [it(1, 'f_clock', 8, 0)], items: { f_clock: 1 } })).stair, 6, '벽 시계(w:8) → 8·7 걸림 → 6');
  const full = [];
  for (let x = 0; x < W; x++) full.push(it(x + 1, x % 2 ? 'f_chair' : 'f_drawer', x, 0));
  const p = home({ r1: full, items: { f_chair: 5, f_drawer: 5 } });
  const h = houseOf(p);
  assert.equal(h.stair, W - 2, '다 걸리면(어디나 둘) 오른쪽');
  assert.deepEqual(ids(h, R1), [1, 2, 3, 4, 5, 6, 7, 8], '계단 자리(8·9)의 가구는 빠진다');
  assert.deepEqual(leftOf(p), { f_chair: 1, f_drawer: 1 }, '빠진 가구는 서랍에');
  // 쉬는 캡슐은 피한다 — 캡슐(8~9,0)이 쉬는 중이면 다른 곳의 가구를 빼는 쪽
  const rest = { id: 'r1', mon: 7, at: 1_760_000_000_000, luck: '' };
  const q = home({ r1: [...full.slice(0, 8), it(20, HEAL, 8, 0, { rest })], items: { f_chair: 4, f_drawer: 4, [HEAL]: 1 }, partner: 7 });
  const hq = houseOf(q);
  assert.notEqual(hq.stair, 8);
  assert.ok(hq.rooms[0].items.some((i) => i.id === HEAL && i.rest && i.rest.id === 'r1'), '쉬는 캡슐은 그대로');
});

test('🪜 저장된 자리 — 그대로 쓴다(가구가 있으면 그 가구가 서랍으로 — 계단이 먼저) · 깨진 값은 저장이 없는 것으로 · 다시 읽어도 같다 · stairSaved', () => {
  const p = home({ stair: 2, r1: [it(1, 'f_chair', 3, 0)], items: { f_chair: 1 } });
  const h = houseOf(p);
  assert.equal(h.stair, 2);
  assert.deepEqual(ids(h, R1), [], '저장된 계단 칸의 의자는 서랍으로');
  assert.deepEqual(leftOf(p), { f_chair: 1 });
  assert.equal(stairSaved(p), true);
  for (const bad of [W - 1, -1, '3', 1.5, null, 1e9, NaN]) {
    const q = home({ stair: bad });
    assert.equal(houseOf(q).stair, W - 2, String(bad));
    assert.equal(stairSaved(q), false, String(bad));
  }
  assert.equal(stairSaved(null), false);
  // 다시 읽기 — 고쳐 읽은 집을 저장해도 같은 집
  const once = houseOf(home({ r1: [it(1, 'f_sofa', 8, 0)], r2: [it(2, 'f_bed', 0, 3)], items: { f_sofa: 1, f_bed: 1 } }));
  const again = houseOf(home({ r1: once.rooms[0].items, r2: once.rooms[1].items, items: { f_sofa: 1, f_bed: 1 }, stair: once.stair }));
  assert.deepEqual(again, once);
  // 2층이 없는 쪽(가방)으로 합쳐지면 계단도 없다 — 저장된 stair는 읽지 않는다
  const lost = home({ stair: 2 });
  delete lost.items.x_floor2;
  assert.equal(houseOf(lost).stair, undefined);
  assert.equal(stairSaved(lost), false);
});

test('🪜 가구는 계단 칸에 못 놓는다 — 1층 바닥 두 칸·그 위 벽 두 칸 · 2층 바닥 두 칸(구멍) · 2층 벽은 걸 수 있다 · 옮기기도', () => {
  const p = home({ stair: 4, items: { f_chair: 6, f_frame: 2, f_sofa: 1 } });
  assert.deepEqual(placeRule(p, R1, 'f_chair', 4, 0), { ok: false, why: 'spot' });
  assert.deepEqual(placeRule(p, R1, 'f_chair', 5, 0), { ok: false, why: 'spot' });
  assert.deepEqual(placeRule(p, R1, 'f_sofa', 3, 0), { ok: false, why: 'spot' }, '두 칸 가구가 한 칸만 걸려도');
  assert.deepEqual(placeRule(p, R1, 'f_frame', 5, 0), { ok: false, why: 'spot' }, '1층 계단 위 벽');
  assert.deepEqual(placeRule(p, R2, 'f_chair', 4, 0), { ok: false, why: 'spot' }, '2층 구멍');
  assert.equal(placeRule(p, R2, 'f_frame', 4, 0).ok, true, '2층 벽은 그대로');
  assert.equal(placeRule(p, R1, 'f_chair', 4, 1).ok, true, '계단 앞 칸은 놓을 수 있다');
  const u = placeRule(p, R1, 'f_chair', 0, 3).u;
  assert.deepEqual(moveRule(p, R1, u, 5, 0), { ok: false, why: 'spot' });
  const size = { ...ROOM_WIDE };
  const h = houseOf(p);
  assert.equal(canPlace(size, h.rooms[0], 'f_chair', 4, 0), false);
  assert.equal(canPlace(size, h.rooms[0], 'f_chair', 6, 0), true);
});

test('🪜 계단 옮기기(stairMoveRule) — 두 층 함께 · 두 층 모두 비어야(1층 벽 물건·2층 가구도 막음) · 방 밖 spot · 2층 전 room · 제자리 ok · 캐릭터는 비켜 선다', () => {
  const p = home({ stair: 8, r1: [it(1, 'f_frame', 3, 0)], r2: [it(2, 'f_chair', 5, 0)], items: { f_frame: 1, f_chair: 1 }, avatar: made({ room: R1, x: 1, y: 0 }) });
  assert.deepEqual(stairMoveRule(p, 0), { ok: true });
  assert.equal(houseOf(p).stair, 0);
  assert.deepEqual(houseOf(p).rooms.map((r) => r.stair), [0, 0]);
  assert.equal(p.house.stair, 0, '저장은 숫자 하나');
  assert.notDeepEqual(avatarOf(p).spot, { room: R1, x: 1, y: 0 }, '계단 칸에 서 있던 캐릭터는 가까운 빈 칸으로');
  assert.ok(!takenCells(houseOf(p).rooms[0]).has(`${avatarOf(p).spot.x},${avatarOf(p).spot.y}`));
  assert.deepEqual(stairMoveRule(p, 2), { ok: false, why: 'spot' }, '1층 벽 액자(w:3)');
  assert.deepEqual(stairMoveRule(p, 4), { ok: false, why: 'spot' }, '2층 의자(5,0)');
  assert.deepEqual(stairMoveRule(p, 5), { ok: false, why: 'spot' }, '2층 의자(5,0)');
  assert.deepEqual(stairMoveRule(p, W - 1), { ok: false, why: 'spot' }, '방 밖');
  assert.deepEqual(stairMoveRule(p, -1), { ok: false, why: 'spot' });
  assert.deepEqual(stairMoveRule(p, '6'), { ok: false, why: 'spot' });
  assert.deepEqual(stairMoveRule(p, 0), { ok: true }, '제자리');
  assert.deepEqual(stairMoveRule(p, 6), { ok: true });
  assert.equal(canStair({ ...ROOM_WIDE }, houseOf(p), 6), true, '지금 자리(계단 칸)는 셈에서 뺀다');
  const one = cloneProfile({ ...emptyProfile(), items: { x_wide: 1 }, house: { started: true, seq: 0, rooms: [{ id: R1, items: [] }] } });
  assert.deepEqual(stairMoveRule(one, 2), { ok: false, why: 'room' });
});

test('🪜 처음 계단(stairStartRule) — 저장 · 그 자리에 있어 서랍으로 간 가구 이름 · 두 번째는 already · 2층 전은 room · 화면 말(stairHello)', async () => {
  const full = [];
  for (let x = 0; x < W; x++) full.push(it(x + 1, x % 2 ? 'f_chair' : 'f_drawer', x, 0));
  const p = home({ r1: full, items: { f_chair: 5, f_drawer: 5 } });
  assert.deepEqual(stairStartRule(p), { ok: true, x: 8, moved: ['f_drawer', 'f_chair'] });
  assert.equal(p.house.stair, 8);
  assert.equal(stairSaved(p), true);
  assert.deepEqual(stairStartRule(p), { ok: false, why: 'already' });
  const empty = home();
  assert.deepEqual(stairStartRule(empty), { ok: true, x: 8, moved: [] });
  // 가진 수보다 많이 놓인 집(백업 병합 등) — 계단 자리의 의자(u1)가 빠지면 넘쳐 빠지던 의자(u30)가 다른 자리에 들어온다 → 의자는 서랍으로 안 갔다 (리뷰 워크플로 재현)
  const row = [];
  for (let x = 0; x < 8; x++) row.push(it(x + 2, x % 2 ? 'f_teddy' : 'f_drawer', x, 0));
  const over = home({ r1: [it(1, 'f_chair', 8, 0), ...row, it(10, 'f_game', 9, 0), it(30, 'f_chair', 3, 3)], items: { f_chair: 1, f_drawer: 4, f_teddy: 4, f_game: 1 } });
  assert.deepEqual(stairStartRule(over), { ok: true, x: 8, moved: ['f_game'] });
  assert.deepEqual(leftOf(over), { f_game: 1 }, '서랍에는 게임기만');
  assert.ok(houseOf(over).rooms[0].items.some((i) => i.id === 'f_chair' && i.x === 3 && i.y === 3), '의자는 (3,3)에 그대로');
  const one = cloneProfile({ ...emptyProfile(), items: { x_wide: 1 }, house: { started: true, seq: 0, rooms: [{ id: R1, items: [] }] } });
  assert.deepEqual(stairStartRule(one), { ok: false, why: 'room' });
  const { stairHello } = await import('../js/houseview.js');
  assert.equal(stairHello([]), '✨ 2층으로 가는 계단이 생겼어요! 계단을 누르면 올라가요');
  assert.equal(stairHello(['f_drawer', 'f_chair']), '✨ 2층으로 가는 계단이 생겼어요! 계단을 누르면 올라가요 — 그 자리에 있던 🗄️ 서랍장·🪑 의자는 🗄️ 서랍에 넣었어요');
  assert.equal(stairHello(['f_tv']), '✨ 2층으로 가는 계단이 생겼어요! 계단을 누르면 올라가요 — 그 자리에 있던 📺 TV는 🗄️ 서랍에 넣었어요');
  assert.equal(stairHello(['f_bed', 'f_bed']), '✨ 2층으로 가는 계단이 생겼어요! 계단을 누르면 올라가요 — 그 자리에 있던 🛏️ 침대는 🗄️ 서랍에 넣었어요', '같은 가구는 한 번');
  assert.equal(stairHello(['f_sofa']).endsWith('🛋️ 소파는 🗄️ 서랍에 넣었어요'), true);
  assert.equal(stairHello(['f_desk']).endsWith('✏️ 책상은 🗄️ 서랍에 넣었어요'), true, '받침이 있으면 「은」');
});

test('🪜 다른 층으로(avatarFloorRule) — 2층은 구멍의 높은 쪽 앞(x + 1, 1) · 1층은 계단 발치 앞(x, 1) · 막혔으면 가까운 빈 칸 · made·room·here·full · 파트너는 새 칸 옆', () => {
  const p = home({ stair: 4, avatar: made({ room: R1, x: 0, y: 4 }), partner: 7 });
  assert.deepEqual(stairExit(R2, 4), { x: 5, y: 1 });
  assert.deepEqual(stairExit(R1, 4), { x: 4, y: 1 });
  assert.deepEqual(avatarFloorRule(p, R1, 100), { ok: false, why: 'here' });
  assert.deepEqual(avatarFloorRule(p, R2, 100), { ok: true, spot: { room: R2, x: 5, y: 1 } });
  assert.deepEqual(avatarOf(p).spot, { room: R2, x: 5, y: 1 });
  assert.equal(p.avatar.at, 100, '바꾼 시각(병합에서 나중 쪽이 이긴다)');
  assert.deepEqual(palHome(p, avatarOf(p).spot), { room: R2, x: 6, y: 1 }, '파트너는 오른쪽 옆');
  assert.deepEqual(avatarFloorRule(p, R2, 101), { ok: false, why: 'here' });
  assert.deepEqual(avatarFloorRule(p, R1, 102), { ok: true, spot: { room: R1, x: 4, y: 1 } });
  // 계단 앞 칸이 막혔으면 가장 가까운 빈 칸
  const q = home({ stair: 4, r2: [it(1, 'f_chair', 5, 1)], items: { f_chair: 1 }, avatar: made({ room: R1, x: 0, y: 4 }) });
  const r = avatarFloorRule(q, R2, 100);
  assert.equal(r.ok, true);
  assert.equal(Math.abs(r.spot.x - 5) + Math.abs(r.spot.y - 1), 1, '한 칸 옆');
  assert.ok(!takenCells(houseOf(q).rooms[1]).has(`${r.spot.x},${r.spot.y}`), '구멍·의자 칸이 아니다');
  // 못 하는 때
  assert.deepEqual(avatarFloorRule(home({ stair: 4 }), R2, 1), { ok: false, why: 'made' });
  const one = cloneProfile({ ...emptyProfile(), items: { x_wide: 1 }, avatar: made({ room: R1, x: 0, y: 4 }), house: { started: true, seq: 0, rooms: [{ id: R1, items: [] }] } });
  assert.deepEqual(avatarFloorRule(one, R2, 1), { ok: false, why: 'room' });
  assert.deepEqual(avatarFloorRule(p, 'r9', 1), { ok: false, why: 'room' });
  // 2층이 꽉 찼으면 full — 의자·서랍장 여섯씩만 가질 수 있어 벽 쪽 없이 바닥만 채우려면 많은 종류가 든다: 작은 가구 열한 가지 × 6
  const smalls = ['f_teddy', 'f_books', 'f_flower', 'f_plant', 'f_cushion', 'f_chair', 'f_drawer', 'f_toybox', 'f_shelf', 'f_tv', 'f_game', 'f_pc'];
  const cells = [];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (!(y === 0 && (x === 4 || x === 5))) cells.push([x, y]);
  const items = {};
  const r2 = cells.map(([x, y], i) => { const id = smalls[Math.floor(i / FURN_MAX_2F)]; items[id] = (items[id] || 0) + 1; return it(i + 1, id, x, y); });
  assert.equal(r2.length, W * H - 2);
  assert.ok(Object.values(items).every((n) => n <= FURN_MAX_2F));
  const fullUp = home({ stair: 4, r2, items, avatar: made({ room: R1, x: 0, y: 4 }) });
  assert.deepEqual(avatarFloorRule(fullUp, R2, 1), { ok: false, why: 'full' });
  assert.equal(avatarOf(fullUp).spot.room, R1, '그대로 1층');
});

test('🪜 캐릭터·파트너·손님·놀이 자리는 계단 칸을 피한다 — 계단 칸에 서 있던 기록은 가까운 빈 칸 · 계단 칸으로 끌어 옮기기는 spot · 파트너 옆 칸도', () => {
  const p = home({ stair: 4, avatar: made({ room: R1, x: 4, y: 0 }) });
  const s = avatarOf(p).spot;
  assert.equal(s.room, R1);
  assert.ok(!stairCells(R1, 4).includes(`${s.x},${s.y}`), JSON.stringify(s));
  assert.deepEqual(avatarMoveRule(p, R1, 5, 0, 10), { ok: false, why: 'spot' });
  assert.deepEqual(avatarMoveRule(p, R2, 4, 0, 10), { ok: false, why: 'spot' }, '2층 구멍');
  assert.deepEqual(avatarMoveRule(p, R1, 3, 0, 10), { ok: true });
  assert.deepEqual(partnerSpot(p, { room: R1, x: 3, y: 0 }), { room: R1, x: 2, y: 0 }, '오른쪽(4,0)은 계단 → 왼쪽');
  // 🍽️ 놀이 자리 — 계단 옆 식탁에서도 계단 칸에 서지 않는다
  const t = home({ stair: 4, r1: [it(1, 'f_table', 2, 0)], items: { f_table: 1 }, avatar: made({ room: R1, x: 0, y: 4 }) });
  const sp = playSpot(t, R1, 1);
  if (sp) for (const c of [sp.me, sp.pal].filter(Boolean)) assert.ok(!stairCells(R1, 4).includes(`${c.x},${c.y}`), JSON.stringify(c));
});

test('🪜 저장 모양 — house.stair는 숫자 하나 · 복사(cloneProfile)·병합(mergeStatRecord)에서 집과 함께 같은 쪽 · 계단 없는 쪽이면 다시 고른다', () => {
  const p = home({ stair: 3 });
  const c = cloneProfile(p);
  assert.equal(c.house.stair, 3);
  c.house.stair = 5;
  assert.equal(p.house.stair, 3, '복사본을 고쳐도 원본은 그대로');
  const newer = { ...home({ stair: 1 }), updatedAt: 20 };
  const older = { ...home({ stair: 6 }), updatedAt: 10 };
  assert.equal(mergeStatRecord('profile', older, newer).house.stair, 1, '최근 쪽 집');
  assert.equal(mergeStatRecord('profile', newer, older).house.stair, 1);
  const noStair = { ...home(), updatedAt: 30 };
  const m = mergeStatRecord('profile', older, noStair);
  assert.equal(m.house.stair, undefined);
  assert.equal(houseOf(m).stair, W - 2, '저장이 없으면 다시 고른다');
});

test('🪜 걸어갈 칸 길(gridPath) — 곧게 가는 동안은 한 번에(꺾이는 칸·끝 칸만) · 가구를 돌아간다 · 끝 칸이 막혀도 간다 · 길이 없으면 곧장 · 같은 칸이면 없음', () => {
  const size = { W: 10, H: 7 };
  assert.deepEqual(gridPath(size, new Set(), { x: 0, y: 3 }, { x: 0, y: 3 }), []);
  assert.deepEqual(gridPath(size, new Set(), { x: 0, y: 3 }, { x: 5, y: 3 }), [{ x: 5, y: 3 }]);
  const corner = gridPath(size, new Set(), { x: 0, y: 3 }, { x: 4, y: 1 });
  assert.equal(corner.length, 2, JSON.stringify(corner));
  assert.deepEqual(corner[corner.length - 1], { x: 4, y: 1 });
  // 벽처럼 막은 세로줄(x 2, y 0~5)을 아래로 돌아간다
  const wall = new Set([0, 1, 2, 3, 4, 5].map((y) => `2,${y}`));
  const around = gridPath(size, wall, { x: 0, y: 0 }, { x: 4, y: 0 });
  assert.ok(around.some((c) => c.y === 6), JSON.stringify(around));
  let at = { x: 0, y: 0 };
  for (const c of around) { // 꺾이는 칸 사이는 곧은 줄 · 막힌 칸을 지나지 않는다
    assert.ok(c.x === at.x || c.y === at.y);
    const [dx, dy] = [Math.sign(c.x - at.x), Math.sign(c.y - at.y)];
    for (let q = { ...at }; q.x !== c.x || q.y !== c.y;) { q = { x: q.x + dx, y: q.y + dy }; assert.ok(!wall.has(`${q.x},${q.y}`), `${q.x},${q.y}`); }
    at = c;
  }
  assert.deepEqual(gridPath(size, new Set(['4,1']), { x: 4, y: 4 }, { x: 4, y: 1 }), [{ x: 4, y: 1 }], '끝 칸이 막혀도 그 앞까지');
  const boxed = new Set(['1,0', '0,1', '1,1']);
  assert.deepEqual(gridPath(size, boxed, { x: 0, y: 0 }, { x: 5, y: 5 }), [{ x: 5, y: 5 }], '갇혔으면 곧장');
});

test('🪜 그림 자리 — 칸 셈판(geoOf)은 houseview.rowsOf와 같다 · 발 자리 = 방 캐릭터 상자의 아래 끝 · 계단 상자(벽 + 한 줄)·구멍 상자(한 줄) · 오르는 길은 아래에서 위로 · 천장 턱·구멍 앞 끝', async () => {
  const { rowsOf, WALL_RATIO, meBoxOf } = await import('../js/houseview.js');
  const size = { ...ROOM_WIDE };
  const g = geoOf(size, WALL_RATIO);
  assert.equal(g.rows, rowsOf(size));
  for (const [x, y] of [[0, 0], [3, 2], [W - 1, H - 1]]) {
    const b = meBoxOf(size, x, y);
    const f = cellFoot(g, x, y);
    assert.ok(Math.abs(f.fx - (b.left + b.width / 2)) < 1e-9);
    assert.ok(Math.abs(f.fy - (b.top + b.height)) < 1e-9);
  }
  const sb = stairBox(g, 4);
  assert.deepEqual([sb.left, sb.top, sb.width], [40, 0, 20]);
  assert.ok(Math.abs(sb.height - ((WALL_RATIO + 1) / g.rows) * 100) < 1e-9);
  const hb = holeBox(g, 4);
  assert.ok(Math.abs(hb.top - (WALL_RATIO / g.rows) * 100) < 1e-9 && Math.abs(hb.height - (1 / g.rows) * 100) < 1e-9);
  assert.deepEqual(stairPt(g, 4, 0, 230), { fx: 40, fy: sb.height }, '그림 아래 끝 = 상자 아래 끝');
  assert.deepEqual(holePt(g, 4, 200, 0), { fx: 60, fy: hb.top });
  const c = climbPts(g, 4);
  assert.equal(c.steps.length, 7);
  for (let i = 1; i < 7; i++) assert.ok(c.steps[i].fy < c.steps[i - 1].fy && c.steps[i].fx > c.steps[i - 1].fx, '한 단씩 오른쪽 위로');
  assert.ok(c.steps.every((p) => p.fx > sb.left && p.fx < sb.left + sb.width && p.fy <= sb.height), '단은 계단 상자 안');
  assert.ok(c.top.me.fy < c.lip && c.lip < c.steps[5].fy, '천장 턱은 여섯째 단 위 — 맨 윗단부터 몸이 천장 너머로 사라진다(시안 그대로)');
  assert.ok(c.holeIn.me.fy < c.holeEdge && c.holeSink.me.fy > c.holeEdge && c.holeBelow.me.fy > c.holeEdge, '구멍 앞 끝 아래로 숨는다');
  assert.ok(c.holeIn.me.fx > hb.left + hb.width / 2, '구멍의 높은 쪽(오른쪽)으로 오르내린다');
  assert.ok(c.top.pal.fx < c.top.me.fx && c.holeIn.pal.fx < c.holeIn.me.fx, '파트너는 한 걸음 뒤(왼쪽)');
});

test('🪜 그림 — 앞뒤 둘씩 · 칸에 맞춰 늘림(preserveAspectRatio none) · 그라데이션 id는 uid로 갈림 · 앞 그림엔 id 없음 · 나무 일곱 단 · 구멍 다섯 단', () => {
  for (const s of [stairBackSvg('a'), stairFrontSvg(), holeBackSvg('a'), holeFrontSvg()]) {
    assert.match(s, /^<svg viewBox="0 0 200 (230|100)" preserveAspectRatio="none"/);
    assert.match(s, /aria-hidden="true"/);
    assert.ok(s.endsWith('</svg>'));
    assert.ok(!/NaN|undefined/.test(s), s.slice(0, 60));
  }
  assert.notEqual(stairBackSvg('r1'), stairBackSvg('ghost'));
  assert.match(stairBackSvg('r1'), /id="stair-hg-r1"/);
  assert.match(stairBackSvg('r1'), /url\(#stair-hg-r1\)/);
  assert.match(holeBackSvg('r2'), /id="stair-hb-r2"/);
  assert.match(stairBackSvg('<x>'), /id="stair-hg-x"/, 'id에 쓸 수 없는 글자는 뺀다');
  assert.ok(!/ id="/.test(stairFrontSvg()) && !/ id="/.test(holeFrontSvg()));
  assert.equal((stairBackSvg('a').match(/fill="#c98d55"/g) || []).length, 7);
  assert.equal((holeBackSvg('a').match(/fill="#f0c58e"/g) || []).length, 5);
});

test('🪜 끌어 옮길 자리(stairDrop) — 계단 가운데가 손가락 아래 · 가장자리는 방 안으로 · 맨 뒤 줄만(y 0) · 방 밖·크기 없음은 null', async () => {
  const { stairDrop, rowsOf } = await import('../js/houseview.js');
  const size = { ...ROOM_WIDE };
  const cell = 40;
  const rect = { left: 100, top: 50, width: W * cell, height: rowsOf(size) * cell };
  assert.deepEqual(stairDrop(size, rect, 100 + 5 * cell, 60), { x: 4, y: 0 }, '손가락이 5번 칸 왼쪽 끝 → 4~5');
  assert.deepEqual(stairDrop(size, rect, 100 + 5 * cell, 50 + rect.height - 1), { x: 4, y: 0 }, '아래에서 끌어도 맨 뒤 줄');
  assert.deepEqual(stairDrop(size, rect, 101, 60), { x: 0, y: 0 });
  assert.deepEqual(stairDrop(size, rect, 100 + W * cell, 60), { x: W - 2, y: 0 });
  assert.equal(stairDrop(size, rect, 99, 60), null);
  assert.equal(stairDrop(size, rect, 200, 49), null);
  assert.equal(stairDrop(size, rect, 200, 50 + rect.height + 1), null);
  assert.equal(stairDrop(null, rect, 200, 60), null);
  assert.equal(stairDrop(size, { ...rect, width: 0 }, 200, 60), null);
});

test('🪜 화면 차례 — 계단은 가구보다 먼저(맨 뒤 줄) · 오르내리기는 먼저 저장(avatarFloorRule) 뒤 연출 · 오르내리는 동안 탭·방 누르기 막음 · 움직임 줄이기면 바로 · 닫으면 끝 · 끌기·누르기 · 처음 계단 · 판 v435 · sw 목록', () => {
  const hv = src('js/houseview.js');
  const fn = (head) => hv.slice(hv.indexOf(head), hv.indexOf('\n}\n', hv.indexOf(head)));
  const room = fn('function roomBox(');
  assert.ok(room.indexOf('stairEls(rm)') > 0 && room.indexOf('stairEls(rm)') < room.indexOf('itemEl(it)'), '계단 → 가구');
  assert.match(room, /if \(ui\.climb\) return;/);
  assert.match(room, /e\.target\.closest\('\.house-stair'\)/);
  const climb = fn('async function climbAt(');
  const save = climb.indexOf('avatarFloorRule(p, to, Date.now())');
  assert.ok(save > 0 && save < climb.indexOf('stairLeave(') && climb.indexOf('stairLeave(') < climb.indexOf('stairArrive(o)'), '저장 → 떠나기 → 오기');
  assert.match(climb, /if \(ui\.busy \|\| stale\(\)\) return;/);
  assert.match(climb, /const live = \(\) => ui\.open && ui\.playRun === run;/);
  assert.match(climb, /prefers-reduced-motion: reduce/);
  assert.match(climb, /for \(const a of actors\) dropActor\(a\);/, '어떻게 끝나도 배우를 걷고 진짜 그림을 다시 보인다');
  assert.match(climb, /if \(moved\) \{ ui\.floor = to;/, '저장됐으면 그 층을 그린다(연출이 중간에 끊겨도)');
  assert.match(fn('function goTab('), /if \(ui\.climb\) return;/);
  assert.match(fn('function closeHouse('), /ui\.playRun \+= 1;/);
  assert.match(fn('function tap('), /if \(d\.kind === 'stair'\) \{ stairTap\(\); return; \}/);
  assert.match(fn('function onUp('), /stairMoveRule\(p, d\.spot\.x\)/);
  assert.match(fn('function showHint('), /canStair\(sz\(\), houseNow\(\), d\.spot\.x\)/);
  assert.match(fn('export function openHouse('), /stairStart\(\);/);
  assert.match(fn('async function stairStart('), /stairSaved\(getProfileSnapshot\(\)\)/);
  assert.match(fn('function walk('), /node\.classList\.add\('is-walk'\)/, '놀러 걸어갈 때도 통통');
  const css = src('css/style.css');
  assert.match(css, /\.house-stair-front\.is-up \{ z-index: 11 !important; \}/);
  assert.match(css, /@keyframes house-waddle \{/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\) \{\n {2}\.is-walk > \.house-me-art, \.is-walk > \.house-pal-img \{ animation: none !important; \}/);
  const sw = src('sw.js');
  const ver = Number((/const CACHE_VERSION = 'v(\d+)';/.exec(sw) || [])[1]);
  assert.ok(ver >= 435);
  assert.match(sw, /'\.\/js\/stairart\.js'/);
  assert.match(sw, /'\.\/js\/stairview\.js'/);
  assert.match(src('js/version.js'), new RegExp(`APP_VERSION = 'v${ver}'`));
  const sv = src('js/stairview.js');
  assert.ok(!/\.style\.(left|top) = /.test(sv.replace(/Object\.assign\(node\.style, \{ left: '0', top: '0'/, '')), '움직임은 transform만');
  assert.match(fn('function stairToolsEl('), /house-tools is-stair\$\{up \? ' is-below' : ''\}/, '1층은 계단 아래 · 2층은 구멍 위(막 올라온 얼굴을 가리지 않게)');
});

test('🔍 Codex 238차 · 리뷰 워크플로 — 오르는 중 닫기·다시 읽기 · 처음 계단은 run 없이 · 캐릭터 층으로 열기 · 좁은 화면 단추 · 키보드 초점 · 끌 때 난간도 흐리게 · 배우 처음 앞뒤 · 걸음 사이 멈춤', () => {
  const hv = src('js/houseview.js');
  const fn = (head) => hv.slice(hv.indexOf(head), hv.indexOf('\n}\n', hv.indexOf(head)));
  // #2 닫으면 잠금을 풀고, 옛 오르기의 마무리는 새 화면을 건드리지 않는다
  assert.match(fn('export function closeHouse('), /ui\.playRun \+= 1;[^\n]*\n {2}if \(ui\.climb\) \{ ui\.busy = false; ui\.climb = 0; \}/);
  const climb = fn('async function climbAt(');
  assert.match(climb, /ui\.busy = true; ui\.climb = run;/);
  assert.match(climb, /if \(ui\.climb === run\) \{ ui\.busy = false; ui\.climb = 0; \}\n {4}if \(ui\.playRun === run\) \{\n {6}if \(moved\) \{ ui\.floor = to;/);
  assert.match(climb, /moved = true;\n {4}ui\.msg = '';/, '옛 「👆 …누르면」 안내를 지운다(움직임 줄이기)');
  assert.equal((climb.match(/, live \}/g) || []).length, 2, '떠나기·오기 모두 live를 받는다');
  assert.match(climb, /ui\.climbDraw = true;\n {4}try \{ render\(\); \} finally \{ ui\.climbDraw = false; \}/);
  assert.match(fn('function render('), /if \(ui\.climb && !ui\.climbDraw\) return;/, '오르는 중엔 다른 그리기(모자 무늬 받기 등)가 배우를 떼지 않는다');
  // #1 오르는 중에 다시 읽으면 그 오르기를 그만두고 캐릭터가 저장된 층을 그린다 · 못 한 처음 계단도 다시
  const re = fn('function onReloaded(');
  assert.match(re, /if \(ui\.climb\) \{\n {4}ui\.playRun \+= 1; ui\.busy = false; ui\.climb = 0;\n {4}const sp = avatarOf\(getProfileSnapshot\(\)\)\.spot;\n {4}if \(sp\) ui\.floor = sp\.room;/);
  assert.ok(re.indexOf('if (ui.climb)') < re.indexOf('ui.floor = roomId();'));
  assert.match(re, /if \(ui\.tab === 'room'\) stairStart\(\);/);
  // 처음 계단 — run()을 안 쓴다(엉뚱한 why 말 · 손님 띵동 삼킴) · 저장 실패면 다시 해 본다 · 그새 온 띵동 뒤에 잇는다
  const ss = fn('async function stairStart(');
  assert.ok(!/\brun\(/.test(ss));
  assert.match(ss, /try \{ r = await houseDo\(stairStartRule\); \} catch \{ r = null; \}/);
  assert.match(ss, /if \(!r \|\| r\.why === 'save'\) ui\.stairAsked = false;/);
  assert.match(ss, /ui\.msg = ui\.msg && ui\.msg\.startsWith\('🚪'\) \? `\$\{ui\.msg\} · \$\{hi\}` : hi;/);
  const gd = fn('async function guestDoor(');
  assert.match(gd, /const stairHi = ui\.msg && ui\.msg\.startsWith\('✨ 2층으로 가는 계단'\) \? `\$\{ui\.msg\} · ` : '';/);
  assert.equal((gd.match(/stairHi/g) || []).length, 3, '바쁠 때·들어올 때 둘 다 계단 말을 앞에 둔다');
  // 집은 캐릭터가 있는 층으로 연다
  assert.match(fn('export function openHouse('), /if \(!profileLoading\(\)\) \{ const sp = avatarOf\(getProfileSnapshot\(\)\)\.spot; if \(sp\) ui\.floor = sp\.room; \}/);
  // 390폭 — 2층 구멍 위 단추를 방 안으로
  assert.match(fn('function sizeRoom('), /if \(t\.classList\.contains\('is-stair'\) && !t\.classList\.contains\('is-below'\)\) t\.style\.top = `\$\{Math\.max\(\(Number\(t\.dataset\.top\) \/ 100\) \* r\.clientHeight, t\.offsetHeight \* 1\.1 \+ 2\)\}px`;/);
  assert.match(fn('function stairToolsEl('), /t\.dataset\.top = String\(up \? b\.top \+ b\.height : b\.top\);/);
  // ⌨️ Enter·Space 뒤 초점
  assert.match(fn('function stairEls('), /document\.querySelector\(ui\.stairSel \? '#house \.house-tools\.is-stair button' : '#house \.house-stair'\)/);
  // 제자리면 흔들지 않는다
  const wk = fn('async function walk(');
  assert.match(wk, /if \(step\) node\.classList\.add\('is-walk'\);/);
  assert.match(wk, /for \(const \[n, , step\] of moved\) if \(step\) n\.classList\.add\('is-walk'\);/);
  // css · 배우
  assert.match(src('css/style.css'), /\.house-stair\.is-lifted, \.house-stair\.is-lifted \+ \.house-stair-front \{ opacity: 0\.35; \}/);
  const sv = src('js/stairview.js');
  assert.match(sv, /layer\.style\.zIndex = \(real && real\.style\.zIndex\) \|\| '10';/);
  assert.equal((sv.match(/if \(!on\(\)\) return;/g) || []).length, 4, '걸음 사이마다 멈출 수 있다(칸마다 · 계단 앞 · 오르는 단마다 · 내리는 단마다)');
});

test('🪜 아이 화면 글은 태블릿이 그리는 이모지(Emoji 12 이하)만 — 🪜(Emoji 13)는 설명 글에만 · 집 화면·계단 파일의 글자 전부', () => {
  const newer = ['🪜', '🪴', '🪟', '🛖', '🪣', '🪤', '🪥', '🪠', '🪦', '🪧', '🪨', '🪵', '🛻', '🪆', '🪅', '🫖', '🧋'];
  for (const f of ['js/houseview.js', 'js/stairview.js', 'js/stairart.js']) {
    // 설명 글(/* */ · 줄 앞이나 빈칸 뒤 //)을 빼고 글자(' ' · ` `)만 — 'http://…'의 //는 글자 안이라 남는다
    const code = src(f).replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|\s)\/\/.*$/gm, '$1');
    const strs = code.match(/'(?:[^'\\\n]|\\.)*'|`(?:[^`\\]|\\.)*`/g) || [];
    for (const s of strs) for (const e of newer) assert.ok(!s.includes(e), `${f}: ${e} in ${s.slice(0, 60)}`);
  }
  const hv = src('js/houseview.js');
  assert.ok(hv.includes("const head = '✨ 2층으로 가는 계단이 생겼어요! 계단을 누르면 올라가요';"));
  assert.ok(hv.includes("say(up ? '⬆️ 2층으로 올라가요…' : '⬇️ 1층으로 내려가요…');"));
});

// ───────────────────── 진짜 저장 경로 (fakeidb) ─────────────────────

test('★ 🪜 저장 경로 — 2층을 사면 계단(읽을 때) · 처음 계단 저장 · 다른 층으로 · 두 번 눌러도 한 번 · 다시 읽어도 그 층', async () => {
  await initProfile();
  await houseDo(houseStartRule);
  await houseDo((p) => { p.coins = 1e6; p.items.stone_math = 1e4; p.items.stone_english = 1e4; p.items.f_teddy = 1; return { ok: true }; });
  assert.deepEqual(await houseDo((p) => houseBuyRule(p, 'x_wide')), { ok: true });
  assert.equal(houseNow().stair, undefined, '2층 전엔 계단 없음');
  assert.deepEqual(await houseDo((p) => houseBuyRule(p, 'x_floor2')), { ok: true });
  assert.equal(houseNow().stair, W - 2, '2층을 사면 바로(읽을 때) 계단');
  assert.equal(stairSaved(getProfileSnapshot()), false);
  assert.deepEqual(await houseDo(stairStartRule), { ok: true, x: W - 2, moved: [] });
  assert.equal(stairSaved(getProfileSnapshot()), true);
  await houseDo((p) => { p.avatar = made({ room: R1, x: 0, y: 4 }); return { ok: true }; });
  const [a, b] = await Promise.all([houseDo((p) => avatarFloorRule(p, R2, Date.now())), houseDo((p) => avatarFloorRule(p, R2, Date.now()))]);
  assert.deepEqual([a.ok, b.ok, b.why], [true, false, 'here'], '두 번 눌러도 한 번');
  assert.deepEqual(a.spot, { room: R2, x: W - 1, y: 1 });
  await flushProfile();
  await reloadProfile();
  assert.deepEqual(avatarOf(getProfileSnapshot()).spot, { room: R2, x: W - 1, y: 1 });
  assert.deepEqual(await houseDo((p) => stairMoveRule(p, 0)), { ok: true });
  assert.equal(houseNow().stair, 0);
  assert.equal(houseNow().rooms[1].stair, 0);
});
