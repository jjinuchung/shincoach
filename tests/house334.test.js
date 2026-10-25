// 🔄 가구 90도 돌리기 (v334 · 2026-10-25 진우 "소파를 세로로도 놓고 싶다" → 아버님 기본안 "이대로") — node --test tests/house334.test.js
// 두 칸 바닥 가구 여섯(소파·침대·책상·식탁·피아노·회복 캡슐)을 가로 ↔ 세로 · 세로면 1칸 × 2칸 · 세로 그림은 코드로 새로 그림
import { fakeIdb } from './fakeidb.js'; // ★ db.js·xp.js보다 먼저
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { FURN, ROOM, ROOM_WIDE, FIRST_ROOM, SECOND_ROOM, HEAL, furnById, canTurn, turnOf, turnRule, moveRule, placeRule, houseOf, leftOf, restsOf, takenCells, canPlace } from '../js/house.js';
import { FURN_ART_TURN } from '../js/furnart.js';
import { emptyProfile, cloneProfile, mergeStatRecord } from '../js/db.js';
import { playSpot } from '../js/homeplay.js';
import { restStartRule } from '../js/rest.js';
import { initProfile, flushProfile, reloadProfile, houseDo, houseNow } from '../js/xp.js';

void fakeIdb;
const src = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const R = FIRST_ROOM;
const prof = (items, owned) => cloneProfile({ ...emptyProfile(), items: { ...owned }, house: { started: true, seq: 9, rooms: [{ id: R, wall: '', floor: '', items }] } });
const roomOf = (p) => houseOf(p).rooms.find((r) => r.id === R);
const itemOf = (p, u) => roomOf(p).items.find((i) => i.u === u);
const TURN_IDS = ['f_bed', 'f_sofa', 'f_desk', 'f_table', 'f_piano', 'f_heal'];

test('🔄 돌릴 수 있는 가구 = 바닥 두 칸 여섯 · 세로 그림도 그 여섯 (64×100 · turn) · 깨진 r은 가로', () => {
  assert.deepEqual(FURN.filter(canTurn).map((d) => d.id).sort(), [...TURN_IDS].sort());
  assert.deepEqual(Object.keys(FURN_ART_TURN).sort(), [...TURN_IDS].sort());
  for (const [id, a] of Object.entries(FURN_ART_TURN)) {
    assert.equal(a.vb, '0 0 64 100', id);
    assert.equal(a.shape, 'turn', id);
    assert.ok(a.parts.length >= 5 && a.parts.every(([t, o]) => /^(rect|circle|ellipse|line|path)$/.test(t) && o && typeof o === 'object'), id);
  }
  assert.equal(canTurn(furnById('f_chair')), false, '한 칸');
  assert.equal(canTurn(furnById('f_frame')), false, '벽');
  assert.equal(canTurn({ id: 'f_x', at: 'wall', w: 2 }), false, '두 칸 벽 가구가 생겨도 벽은 안 돌린다');
  assert.equal(canTurn(null), false);
  const sofa = furnById('f_sofa');
  assert.deepEqual([1, 0, '1', true, 2, undefined].map((r) => turnOf(sofa, r)), [1, 0, 0, 0, 0, 0]);
  assert.equal(turnOf(furnById('f_chair'), 1), 0);
});

test('🔄 돌리기 — 왼쪽 위 칸은 그대로 세로로(1칸 × 2칸) · 돌린 칸이 비고 아래 칸이 찬다 · 다시 누르면 가로 · 뒤집기(f)는 그대로', () => {
  const p = prof([{ u: 1, id: 'f_sofa', x: 2, y: 1, f: 1 }], { f_sofa: 1 });
  const a = turnRule(p, R, 1);
  assert.deepEqual(a, { ok: true, r: 1 });
  assert.deepEqual(itemOf(p, 1), { u: 1, id: 'f_sofa', x: 2, y: 1, f: 1, r: 1 });
  const taken = takenCells(roomOf(p));
  assert.ok(taken.has('2,1') && taken.has('2,2') && !taken.has('3,1'), '세로 두 칸');
  assert.deepEqual(turnRule(p, R, 1), { ok: true, r: 0 });
  assert.deepEqual(itemOf(p, 1), { u: 1, id: 'f_sofa', x: 2, y: 1, f: 1 }, '가로로 돌아오면 r을 지운다(옛 기록과 같은 꼴)');
  assert.ok(!('r' in p.house.rooms[0].items.find((i) => i.u === 1)), '저장된 기록에도 r이 없다(r: 0을 남기지 않음)');
});

test('🔄 가장자리 — 맨 아래 줄 가구는 한 칸 위로 세로 · 맨 오른쪽 세로 가구는 한 칸 왼쪽으로 가로 · 둘레가 막혔으면 turnSpot(아무것도 안 바뀜) · 못 돌리는 가구 turn · 없는 가구 gone', () => {
  const bottom = prof([{ u: 1, id: 'f_bed', x: 0, y: ROOM.H - 1, f: 0 }], { f_bed: 1 });
  assert.deepEqual(turnRule(bottom, R, 1), { ok: true, r: 1 });
  assert.deepEqual([itemOf(bottom, 1).x, itemOf(bottom, 1).y], [0, ROOM.H - 2]);
  const right = prof([{ u: 1, id: 'f_desk', x: ROOM.W - 1, y: 2, f: 0, r: 1 }], { f_desk: 1 });
  assert.deepEqual(turnRule(right, R, 1), { ok: true, r: 0 });
  assert.deepEqual([itemOf(right, 1).x, itemOf(right, 1).y], [ROOM.W - 2, 2]);
  // 막힘: 소파 (2,0) 아래 (2,1)에 의자 · 세로가 안 되고 한 칸 위도 방 밖
  const blocked = prof([{ u: 1, id: 'f_sofa', x: 2, y: 0, f: 0 }, { u: 2, id: 'f_chair', x: 2, y: 1, f: 0 }], { f_sofa: 1, f_chair: 1 });
  const before = JSON.stringify(houseOf(blocked));
  assert.deepEqual(turnRule(blocked, R, 1), { ok: false, why: 'turnSpot' });
  assert.equal(JSON.stringify(houseOf(blocked)), before);
  assert.deepEqual(turnRule(prof([{ u: 1, id: 'f_chair', x: 0, y: 0, f: 0 }], { f_chair: 1 }), R, 1), { ok: false, why: 'turn' });
  assert.deepEqual(turnRule(prof([], {}), R, 7), { ok: false, why: 'gone' });
  assert.deepEqual(turnRule(prof([], {}), 'nope', 7), { ok: false, why: 'room' });
});

test('🔄 세로 가구 옮기기 — 세로 그대로 · 아래로 두 칸이 들어가야 · 다른 가구와 겹침은 세로 칸으로 · 서랍에서 새로 놓으면 가로', () => {
  const p = prof([{ u: 1, id: 'f_piano', x: 0, y: 0, f: 0, r: 1 }, { u: 2, id: 'f_chair', x: 5, y: 3, f: 0 }], { f_piano: 1, f_chair: 1, f_table: 1 });
  assert.equal(moveRule(p, R, 1, ROOM.W - 1, ROOM.H - 2).ok, true);
  assert.equal(itemOf(p, 1).r, 1);
  assert.deepEqual(moveRule(p, R, 1, ROOM.W - 1, ROOM.H - 1), { ok: false, why: 'spot' }, '아래 칸이 방 밖');
  assert.deepEqual(moveRule(p, R, 1, 5, 2), { ok: false, why: 'spot' }, '아래 칸 (5,3)에 의자');
  assert.equal(moveRule(p, R, 1, 6, 2).ok, true, '의자 옆 줄은 됨');
  // 가로 두 칸이면 안 되는 자리(오른쪽 끝)도 세로면 된다
  const size = { ...ROOM };
  assert.equal(canPlace(size, roomOf(p), 'f_table', ROOM.W - 1, 0), false, '가로는 방 밖');
  assert.equal(canPlace(size, roomOf(p), 'f_table', ROOM.W - 1, 0, undefined, 1), true, '세로는 들어감');
  const r = placeRule(p, R, 'f_table', 0, 0);
  assert.ok(r.ok);
  assert.equal(itemOf(p, r.u).r, undefined, '새로 놓으면 가로');
});

test('🔄 고쳐 읽기(백업·옛 기록) — r은 1일 때만 · 한 칸 가구의 r은 버림 · 세로 칸이 방 밖·겹치면 그 가구는 서랍으로 · 옛 기록(r 없음)은 가로 그대로', () => {
  const p = prof([
    { u: 1, id: 'f_sofa', x: 0, y: 0, f: 0, r: 1 },
    { u: 2, id: 'f_chair', x: 3, y: 0, f: 0, r: 1 },
    { u: 3, id: 'f_bed', x: 5, y: 0, f: 0, r: '1' },
    { u: 4, id: 'f_desk', x: 7, y: ROOM.H - 1, f: 0, r: 1 },
    { u: 5, id: 'f_table', x: 0, y: 1, f: 0 },
  ], { f_sofa: 1, f_chair: 1, f_bed: 1, f_desk: 1, f_table: 1 });
  const items = roomOf(p).items;
  assert.deepEqual(items.find((i) => i.u === 1), { u: 1, id: 'f_sofa', x: 0, y: 0, f: 0, r: 1 });
  assert.deepEqual(items.find((i) => i.u === 2), { u: 2, id: 'f_chair', x: 3, y: 0, f: 0 }, '한 칸 가구의 r은 버림');
  assert.deepEqual(items.find((i) => i.u === 3), { u: 3, id: 'f_bed', x: 5, y: 0, f: 0 }, '깨진 r → 가로');
  assert.equal(items.find((i) => i.u === 4), undefined, '세로 칸이 방 밖 → 서랍으로');
  assert.equal(items.find((i) => i.u === 5), undefined, '세로 소파의 아래 칸 (0,1)과 겹침 → 나중에 놓은 것이 서랍으로');
});

test('🔄 세로 식탁에서 🍚 밥 먹기 — 캐릭터는 세로 가구의 옆(위 칸부터)에 선다 · 캐릭터가 설 빈 칸도 세로 칸을 비킨다', () => {
  const p = prof([{ u: 1, id: 'f_table', x: 3, y: 1, f: 0, r: 1 }], { f_table: 1 });
  p.avatar = { made: true, look: {}, spot: { room: R, x: 0, y: 5 } };
  const sp = playSpot(p, R, 1);
  assert.ok(sp && sp.me);
  assert.deepEqual([sp.me.x, sp.me.y], [2, 1], '왼쪽 옆 위 칸');
  const blockedLeft = prof([{ u: 1, id: 'f_table', x: 3, y: 1, f: 0, r: 1 }, { u: 2, id: 'f_chair', x: 2, y: 1, f: 0 }], { f_table: 1, f_chair: 1 });
  blockedLeft.avatar = { made: true, look: {}, spot: { room: R, x: 0, y: 5 } };
  const sp2 = playSpot(blockedLeft, R, 1);
  assert.deepEqual([sp2.me.x, sp2.me.y], [4, 1], '왼쪽이 막히면 오른쪽 옆');
  const taken = takenCells(roomOf(p));
  assert.ok(taken.has('3,2') && !taken.has('4,1'), '세로 칸');
});

test('🔄 화면 — 자리(boxOf)·끌어 놓을 칸(dropSpot)이 세로를 안다 · 🔄 단추는 돌릴 수 있는 가구만(가로로/세로로) · 세로 그림 · 끌 때 세로 그대로 · 막히면 알려 줌 · css', async () => {
  const { boxOf, dropSpot, rowsOf, WALL_RATIO } = await import('../js/houseview.js');
  const size = { ...ROOM };
  const rows = rowsOf(size);
  const h = boxOf(size, 'f_sofa', 2, 1);
  const v = boxOf(size, 'f_sofa', 2, 1, 1);
  assert.deepEqual([h.width, h.height].map((n) => +n.toFixed(4)), [+((2 / size.W) * 100).toFixed(4), +((1 / rows) * 100).toFixed(4)]);
  assert.deepEqual([v.width, v.height].map((n) => +n.toFixed(4)), [+((1 / size.W) * 100).toFixed(4), +((2 / rows) * 100).toFixed(4)]);
  assert.deepEqual([v.left, v.top], [h.left, h.top], '왼쪽 위는 같은 자리');
  assert.deepEqual(boxOf(size, 'f_chair', 2, 1, 1), boxOf(size, 'f_chair', 2, 1), '한 칸 가구는 r을 모른다');
  // 손가락 → 칸: 세로면 손가락이 가구 가운데 (칸 40px)
  const cell = 40;
  const rect = { left: 0, top: 0, width: size.W * cell, height: rows * cell };
  const wallH = cell * WALL_RATIO;
  assert.deepEqual(dropSpot(size, rect, 'f_sofa', 3.5 * cell, wallH + 3 * cell, 1), { x: 3, y: 2 }, '손가락 아래가 두 칸의 가운데');
  assert.deepEqual(dropSpot(size, rect, 'f_sofa', 3.5 * cell, wallH + size.H * cell - 2, 1), { x: 3, y: size.H - 2 }, '맨 아래면 위로 당김');
  assert.deepEqual(dropSpot(size, rect, 'f_sofa', size.W * cell - 1, wallH + cell, 1).x, size.W - 1, '세로는 맨 오른쪽 칸도');
  assert.equal(dropSpot(size, rect, 'f_sofa', 3 * cell, 2, 1), null, '벽 위는 안 됨');
  const hv = src('js/houseview.js');
  const tools = hv.slice(hv.indexOf('function toolsEl('), hv.indexOf('\n}\n', hv.indexOf('function toolsEl(')));
  assert.match(tools, /if \(canTurn\(d\)\) \{/);
  assert.match(tools, /it\.r \? '🔄 가로로' : '🔄 세로로'/);
  assert.match(tools, /run\(\(p\) => turnRule\(p, rid, it\.u\), \(r\) => `\$\{d\.emoji\} \$\{d\.ko\}\$\{eul\(d\.ko\)\} \$\{r\.r \? '세로' : '가로'\}로 놓았어요`\)/);
  const item = hv.slice(hv.indexOf('function itemEl('), hv.indexOf('\n}\n', hv.indexOf('function itemEl(')));
  assert.match(item, /const turn = turnOf\(d, it\.r\);/);
  assert.match(item, /e\.appendChild\(artEl\(d, 'span', 'house-emoji', turn\)\);/);
  assert.match(item, /zIndex: String\(d\.at === 'wall' \? 5 : 10 \+ it\.y \+ \(turn \? d\.w - 1 : 0\)\)/, '앞뒤 겹침은 아래 끝 줄로');
  assert.match(hv, /d\.r = it \? turnOf\(f, it\.r\) : 0;/);
  assert.match(hv, /d\.spot = dropSpot\(sz\(\), box\.getBoundingClientRect\(\), d\.id, d\.x, d\.y, d\.r\);/);
  assert.match(hv, /canPlace\(houseShapeNow\(\)\.size, room\(\), d\.id, d\.spot\.x, d\.spot\.y, d\.kind === 'move' \? d\.u : undefined, d\.r\)/);
  assert.match(hv, /turnSpot: '여기서는 못 돌려요 — 둘레를 비우거나 빈 곳으로 옮긴 뒤 돌려요'/);
  const css = src('css/style.css');
  assert.match(css, /\.house-art\.is-turn \{ width: 0\.9em; height: 1\.4em; \}/);
  assert.match(css, /\.house-item\.is-turn \.house-emoji \{ font-size: calc\(var\(--cell\) \* 1\.38\); \}/);
  const sw = src('sw.js');
  const ver = Number((/const CACHE_VERSION = 'v(\d+)';/.exec(sw) || [])[1]);
  assert.ok(ver >= 334);
  assert.match(src('js/version.js'), new RegExp(`APP_VERSION = 'v${ver}'`));
});

// ───────────────────── 🔍 Codex 138차 ─────────────────────

const R2 = SECOND_ROOM;
const SQUIRTLE = 7;
const T0 = 1_760_000_000_000;
const oneRoom = (items, seq = 9) => ({ started: true, seq, rooms: [{ id: R, wall: '', floor: '', items }] });
const itemIn = (p, roomId, u) => houseOf(p).rooms.find((r) => r.id === roomId).items.find((i) => i.u === u);

test('🔍 Codex 138차 #1: 쉬는 포켓몬이 있는 세로 캡슐도 읽어 주는 이름에 「(세로)」 — 빈 캡슐과 같은 이름(itemName) 뒤에 쉬는 문구 · 쉬는 문구가 이름을 다시 덮지 않는다', async () => {
  const { itemName } = await import('../js/houseview.js');
  const heal = furnById(HEAL);
  assert.equal(itemName(heal, 1), `${heal.ko} (세로)`);
  assert.equal(itemName(heal), heal.ko);
  assert.equal(itemName(heal, '1'), heal.ko, '깨진 r은 가로');
  assert.equal(itemName(furnById('f_chair'), 1), furnById('f_chair').ko, '한 칸 가구는 (세로) 없음');
  const hv = src('js/houseview.js');
  const fn = (head) => hv.slice(hv.indexOf(head), hv.indexOf('\n}\n', hv.indexOf(head)));
  assert.match(fn('function itemEl('), /e\.setAttribute\('aria-label', itemName\(d, it\.r\)\);/);
  const rest = fn('function restDecor(');
  assert.match(rest, /e\.setAttribute\('aria-label', `\$\{itemName\(furnById\(it\.id\), it\.r\)\} — \$\{monKo\(it\.rest\.mon\)\} \$\{left \? '쉬는 중' : '다 쉼'\}`\);/);
  assert.equal((rest.match(/aria-label/g) || []).length, 1);
});

test('🔍 Codex 138차 보탬 ①: 넓힌 방(10×7) 2층 — 맨 오른쪽 세로 가구는 한 칸 왼쪽으로 가로 · 넓힌 맨 아래 줄은 한 칸 위로 세로 · 세로는 넓힌 아래 끝(H − 2)까지 · 끌어 놓을 칸도 넓힌 크기로', async () => {
  const { W, H } = ROOM_WIDE;
  const p = cloneProfile({ ...emptyProfile(), items: { x_wide: 1, x_floor2: 1, f_sofa: 1, f_bed: 1 }, house: { started: true, seq: 9, rooms: [
    { id: R, wall: '', floor: '', items: [] },
    { id: R2, wall: '', floor: '', items: [{ u: 1, id: 'f_sofa', x: W - 1, y: 2, f: 0, r: 1 }, { u: 2, id: 'f_bed', x: 0, y: H - 1, f: 0 }] },
  ] } });
  assert.deepEqual(itemIn(p, R2, 1), { u: 1, id: 'f_sofa', x: W - 1, y: 2, f: 0, r: 1 }, '2층 맨 오른쪽 세로 (기본 방이면 방 밖인 칸)');
  assert.deepEqual(turnRule(p, R2, 1), { ok: true, r: 0 });
  assert.deepEqual(itemIn(p, R2, 1), { u: 1, id: 'f_sofa', x: W - 2, y: 2, f: 0 }, '한 칸 왼쪽으로 가로');
  assert.deepEqual(turnRule(p, R2, 2), { ok: true, r: 1 });
  assert.deepEqual(itemIn(p, R2, 2), { u: 2, id: 'f_bed', x: 0, y: H - 2, f: 0, r: 1 }, '넓힌 맨 아래 줄 → 한 칸 위로 세로');
  assert.deepEqual(moveRule(p, R2, 2, W - 1, H - 2), { ok: true }, '세로는 넓힌 오른쪽 아래 끝까지');
  assert.deepEqual(itemIn(p, R2, 2), { u: 2, id: 'f_bed', x: W - 1, y: H - 2, f: 0, r: 1 });
  assert.deepEqual(moveRule(p, R2, 2, W - 1, H - 1), { ok: false, why: 'spot' }, '아래 칸이 방 밖');
  assert.deepEqual(houseOf(p).rooms[0].items, [], '1층은 그대로');
  const { dropSpot, rowsOf, WALL_RATIO } = await import('../js/houseview.js');
  const size = { ...ROOM_WIDE };
  const cell = 40;
  const rect = { left: 0, top: 0, width: W * cell, height: rowsOf(size) * cell };
  const bottom = cell * WALL_RATIO + H * cell - 2; // 손가락이 바닥 맨 아래
  assert.deepEqual(dropSpot(size, rect, 'f_bed', W * cell - 1, bottom, 1), { x: W - 1, y: H - 2 }, '세로 — 맨 오른쪽 칸 · 위로 당김');
  assert.deepEqual(dropSpot(size, rect, 'f_bed', W * cell - 1, bottom), { x: W - 2, y: H - 1 }, '가로 — 왼쪽으로 당김 · 맨 아래 줄');
});

test('🔍 Codex 138차 보탬 ②: 쉬는 캡슐을 돌려도 휴식·번호·서랍 그대로 · 넓힌 방 아래 끝의 세로 캡슐이 넓히기 없는 쪽과 합쳐져 자리를 잃으면 휴식은 맡겨 두고(parked) 다시 놓은 캡슐에서 이어 쉰다', () => {
  const p = cloneProfile({ ...emptyProfile(), items: { [HEAL]: 2 }, caught: { [SQUIRTLE]: 1 }, house: oneRoom([{ u: 3, id: HEAL, x: 2, y: 1, f: 0 }]) });
  const rest = restStartRule(p, 3, SQUIRTLE, T0, 'lv').rest;
  assert.ok(rest);
  const drawer = leftOf(p);
  assert.deepEqual(turnRule(p, R, 3), { ok: true, r: 1 });
  assert.deepEqual(itemOf(p, 3), { u: 3, id: HEAL, x: 2, y: 1, f: 0, r: 1, rest }, '휴식·번호 그대로 세로');
  assert.equal(houseOf(p).seq, 9, '돌리기는 번호를 새로 매기지 않는다');
  assert.deepEqual(leftOf(p), drawer, '서랍 그대로');
  assert.equal(houseOf(p).parked, undefined);
  assert.deepEqual(turnRule(p, R, 3), { ok: true, r: 0 });
  assert.deepEqual(itemOf(p, 3).rest, rest, '다시 가로로 돌려도');
  // 넓힌 방(10×7)에서 아래 칸이 y 6인 세로 캡슐 — 넓히기 없는 쪽(가방)과 합쳐지면 아래 칸이 방 밖 (가로였다면 8 × 6 방에도 든다)
  const mk = (r) => cloneProfile({ ...emptyProfile(), items: { [HEAL]: 1, x_wide: 1 }, caught: { [SQUIRTLE]: 1 }, house: oneRoom([{ u: 4, id: HEAL, x: 2, y: ROOM.H - 1, f: 0, ...(r ? { r: 1 } : {}), rest }], 4) });
  const v = mk(1);
  assert.deepEqual(itemOf(v, 4), { u: 4, id: HEAL, x: 2, y: ROOM.H - 1, f: 0, r: 1, rest }, '넓힌 방에서는 세로로 쉬는 중');
  delete v.items.x_wide;
  const h = houseOf(v);
  assert.deepEqual(h.rooms[0].items, [], '세로 칸이 방 밖 → 캡슐은 서랍으로');
  assert.deepEqual(h.parked, [rest], '휴식은 맡겨 둔다');
  assert.deepEqual(restsOf(h), [rest]);
  assert.deepEqual(leftOf(v), { [HEAL]: 1 });
  const flat = mk(0);
  delete flat.items.x_wide;
  assert.deepEqual(itemOf(flat, 4), { u: 4, id: HEAL, x: 2, y: ROOM.H - 1, f: 0, rest }, '(가로였다면 그 자리에서 그대로 쉰다)');
  const put = placeRule(v, R, HEAL, 0, 0);
  assert.deepEqual([put.ok, put.rest], [true, rest], '다시 놓은 캡슐에서 이어 쉰다(넣은 때·행운 그대로)');
  assert.deepEqual(itemOf(v, put.u), { u: put.u, id: HEAL, x: 0, y: 0, f: 0, rest }, '새로 놓으면 가로');
  assert.equal(houseOf(v).parked, undefined, '맡긴 것이 캡슐로 돌아갔다');
});

test('🔍 Codex 138차 보탬 ③: 백업 병합 — 세로로 놓은 최근 집 × r 없는 옛 백업을 어느 차례로 줘도 최근 쪽 방향 그대로(복사본) · 옛 백업 쪽이 최근이면 가로(r을 지어내지 않는다)', () => {
  const vert = { ...emptyProfile(), items: { f_sofa: 1 }, house: oneRoom([{ u: 1, id: 'f_sofa', x: ROOM.W - 1, y: 2, f: 0, r: 1 }], 1), updatedAt: 20 };
  const old = { ...emptyProfile(), items: { f_sofa: 1 }, house: oneRoom([{ u: 1, id: 'f_sofa', x: 2, y: 2, f: 0 }], 1), updatedAt: 10 };
  for (const [a, b] of [[vert, old], [old, vert]]) {
    const m = mergeStatRecord('profile', a, b);
    assert.deepEqual(m.house.rooms[0].items, [{ u: 1, id: 'f_sofa', x: ROOM.W - 1, y: 2, f: 0, r: 1 }], '최근 쪽(세로)');
    assert.deepEqual(roomOf(m).items, [{ u: 1, id: 'f_sofa', x: ROOM.W - 1, y: 2, f: 0, r: 1 }], '고쳐 읽어도 세로 — 가로라면 방 밖인 맨 오른쪽 칸');
    assert.notEqual(m.house.rooms[0].items[0], vert.house.rooms[0].items[0], '복사본');
  }
  const newer = { ...old, updatedAt: 30 };
  for (const [a, b] of [[vert, newer], [newer, vert]]) {
    const m = mergeStatRecord('profile', a, b);
    assert.deepEqual(roomOf(m).items, [{ u: 1, id: 'f_sofa', x: 2, y: 2, f: 0 }], '옛 백업 쪽이 최근 — 가로');
    assert.ok(!('r' in m.house.rooms[0].items[0]));
  }
});

// 진짜 저장 경로 (fakeidb) — house.test.js와 같은 틀
const stored = () => fakeIdb.get('profile', 'me');
let inited = false;
async function seed(items, house) {
  if (!inited) { await initProfile(); inited = true; }
  await flushProfile();
  const cur = stored() || emptyProfile();
  fakeIdb.put('profile', { ...cur, items: { ...items }, house, updatedAt: (cur.updatedAt || 0) + 1 });
  await reloadProfile();
}
/** 다른 창이 저장함 — 이 창은 아직 모른다 */
function otherWindow(fix) {
  const o = stored();
  fix(o.house);
  o.updatedAt += 1;
  fakeIdb.put('profile', o);
}

test('★ 🔍 Codex 138차 보탬 ④: 저장 경로 — 돌리기 → 다른 창이 세로 그대로 맨 오른쪽으로 옮김 → 옛 자리를 아는 이 창에서 다시 돌리기는 저장된 자리에서(한 칸 왼쪽으로 가로) · 다른 창이 둘레를 막았으면 turnSpot(저장 그대로) · 이 창도 저장된 쪽으로', async () => {
  await seed({ f_sofa: 1, f_chair: 2 }, oneRoom([{ u: 1, id: 'f_sofa', x: 2, y: 1, f: 0 }], 1));
  assert.deepEqual(await houseDo((p) => turnRule(p, R, 1)), { ok: true, r: 1 });
  assert.deepEqual(stored().house.rooms[0].items, [{ u: 1, id: 'f_sofa', x: 2, y: 1, f: 0, r: 1 }]);
  assert.deepEqual(houseNow().rooms[0].items, [{ u: 1, id: 'f_sofa', x: 2, y: 1, f: 0, r: 1 }]);
  otherWindow((h) => { Object.assign(h.rooms[0].items[0], { x: ROOM.W - 1, y: 3 }); });
  assert.deepEqual([houseNow().rooms[0].items[0].x, houseNow().rooms[0].items[0].y], [2, 1], '이 창은 아직 옛 자리로 안다');
  assert.deepEqual(await houseDo((p) => turnRule(p, R, 1)), { ok: true, r: 0 });
  const after = [{ u: 1, id: 'f_sofa', x: ROOM.W - 2, y: 3, f: 0 }];
  assert.deepEqual(stored().house.rooms[0].items, after, '저장된 자리(맨 오른쪽 세로)에서 한 칸 왼쪽으로 가로');
  assert.deepEqual(houseNow().rooms[0].items, after, '이 창도 저장된 쪽으로');
  const sofa = takenCells(houseNow().rooms[0]);
  assert.deepEqual([...sofa].sort(), [`${ROOM.W - 2},3`, `${ROOM.W - 1},3`]);
  // 다른 창이 소파 위아래 칸에 의자 둘 — 세로(그 자리 · 한 칸 위) 둘 다 막힘
  otherWindow((h) => {
    h.rooms[0].items.push({ u: 2, id: 'f_chair', x: ROOM.W - 2, y: 4, f: 0 }, { u: 3, id: 'f_chair', x: ROOM.W - 2, y: 2, f: 0 });
    h.seq = 3;
  });
  const before = stored().house;
  assert.deepEqual(await houseDo((p) => turnRule(p, R, 1)), { ok: false, why: 'turnSpot' });
  assert.deepEqual(stored().house, before, '저장 그대로');
  assert.deepEqual(houseNow().rooms[0].items.map((i) => i.u), [1, 2, 3], '이 창도 다른 창의 의자를 본다');
});
