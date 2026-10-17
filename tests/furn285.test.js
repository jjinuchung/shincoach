// 🍽️ ③ 가구 더하기 (2026-10-18, 아버님 "이대로 해") — 새 가구 일곱 · 코드로 그린 그림 · 🐾 파트너 쿠션 · 🍚 식탁 밥 먹기 · 💗 테두리 단계
// node --test tests/furn285.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FURN, FIRST_ROOM, SECOND_ROOM, CUSHION, furnById, houseCost, isHouseItem } from '../js/house.js';
import { FURN_ART, furnArtSvg } from '../js/furnart.js';
import { BOND_TIERS, bondTier, palHome, playRule, playSpot, PLAYS } from '../js/homeplay.js';
import { partnerSpot, LOOK_BASE } from '../js/avatar.js';
import { SCENE_OF, playLines, stageHtml, mealSvg } from '../js/playart.js';
import { emptyProfile, cloneProfile } from '../js/db.js';
import { itemById } from '../js/items.js';

const R = FIRST_ROOM;
const T = 1_700_000_000_000;
const NEW = ['f_plant', 'f_window', 'f_cushion', 'f_toybox', 'f_shelf', 'f_table', 'f_fridge'];
const made = (spot = { room: R, x: 6, y: 5 }) => ({ made: true, gifted: true, look: { ...LOOK_BASE }, name: '', spot, at: T });
const OWN = { f_table: 1, f_cushion: 2, f_fridge: 1, f_shelf: 1, f_toybox: 1, f_plant: 1, f_window: 1, f_teddy: 1 };
const pf = (rooms, extra = {}) => cloneProfile({
  ...emptyProfile(), coins: 100, items: { ...OWN, x_wide: 1, x_floor2: 1 }, caught: { 658: 1 }, partner: 658,
  house: { started: true, seq: 30, rooms }, avatar: made(), ...extra,
});
const room = (id, items) => ({ id, wall: '', floor: '', items });

// ───────────────────── 등록부 · 그림 ─────────────────────

test('🍽️ 새 가구 일곱 (아버님 기본안 값) — 소품 < 가구 < 기기 그대로 · 🧊 냉장고만 🔷·🔶 · 집 물건 · ITEMS 등록부 밖', () => {
  const want = {
    f_plant: ['small', 200, 'floor', 1], f_window: ['small', 300, 'wall', 1], f_cushion: ['small', 300, 'floor', 1],
    f_toybox: ['furn', 600, 'floor', 1], f_shelf: ['furn', 800, 'floor', 1], f_table: ['furn', 900, 'floor', 2], f_fridge: ['device', 2500, 'floor', 1],
  };
  for (const id of NEW) {
    const f = furnById(id);
    assert.ok(f, id);
    assert.deepEqual([f.group, f.price, f.at, f.w], want[id], id);
    assert.ok(isHouseItem(id), id);
    assert.equal(itemById(id), null, `${id}가 ITEMS 등록부에 — 상자·5일장·구호품에 섞인다`);
  }
  assert.deepEqual(houseCost('f_fridge'), { coins: 2500, items: { stone_math: 5, stone_english: 1 } }, 'TV와 같은 값');
  assert.equal(CUSHION, 'f_cushion');
  const ids = FURN.map((f) => f.id);
  assert.equal(new Set(ids).size, ids.length, '겹치는 id 없음');
});

test('🖍️ 코드로 그린 그림 — 등록부의 art는 모두 있다 · 모양마다 크기 class · 그림 조각은 도형만(글자·스크립트 없음) · 모르는 이름은 빈 글', () => {
  for (const f of FURN.filter((x) => x.art)) {
    assert.ok(Object.prototype.hasOwnProperty.call(FURN_ART, f.art), `${f.id} ${f.art}`);
    const svg = furnArtSvg(f.art);
    assert.ok(svg.startsWith('<svg class="house-art is-') && svg.endsWith('</svg>'), f.id);
    assert.ok(!/script|on\w+=|href/i.test(svg), f.id);
  }
  for (const id of NEW) assert.ok(furnById(id).art, `${id}는 그린 그림 (🪴🪟는 Emoji 13 — 태블릿에 없다)`);
  const SHAPES = ['wide', 'tall', 'box', 'flat', 'wall'];
  for (const [name, a] of Object.entries(FURN_ART)) {
    assert.ok(SHAPES.includes(a.shape), name);
    assert.match(a.vb, /^0 0 \d+ \d+$/, name);
    for (const [tag, attrs] of a.parts) {
      assert.ok(['rect', 'circle', 'ellipse', 'path', 'line', 'polygon'].includes(tag), `${name} ${tag}`);
      for (const k of Object.keys(attrs)) assert.ok(!/^on/i.test(k) && k !== 'href', `${name} ${k}`);
    }
  }
  assert.equal(FURN_ART.desk.shape, 'wide', 'v252 책상은 그대로');
  assert.equal(furnArtSvg('없는것'), '');
  assert.equal(furnArtSvg('toString'), '', '객체 속 이름에 속지 않는다');
  assert.equal(furnById('f_window').at, 'wall');
  assert.equal(FURN_ART.window.shape, 'wall');
});

// ───────────────────── 🐾 파트너 쿠션 ─────────────────────

test('🐾 파트너 쿠션 — 캐릭터가 선 방에 쿠션이 있으면 그 위(먼저 놓은 쿠션) · 다른 방의 쿠션은 안 봄 · 없으면 캐릭터 옆 · 캐릭터 칸이 없으면 null', () => {
  const spot = { room: R, x: 2, y: 2 };
  const one = pf([room(R, [{ u: 1, id: CUSHION, x: 6, y: 4 }])]);
  assert.deepEqual(palHome(one, spot), { room: R, x: 6, y: 4, cushion: true });
  const two = pf([room(R, [{ u: 3, id: CUSHION, x: 1, y: 5 }, { u: 2, id: CUSHION, x: 6, y: 4 }])]);
  assert.deepEqual(palHome(two, spot), { room: R, x: 6, y: 4, cushion: true }, '먼저 놓은 쿠션 = 번호가 작은 것(물건 차례와 상관없이)');
  const two2 = pf([room(R, [{ u: 2, id: CUSHION, x: 6, y: 4 }, { u: 3, id: CUSHION, x: 1, y: 5 }])]);
  assert.deepEqual(palHome(two2, spot), palHome(two, spot), '차례를 바꿔도 같다');
  const other = pf([room(R, []), room(SECOND_ROOM, [{ u: 1, id: CUSHION, x: 0, y: 0 }])]);
  assert.deepEqual(palHome(other, spot), partnerSpot(other, spot), '2층 쿠션은 1층 캐릭터와 상관없음');
  assert.deepEqual(palHome(pf([room(R, [])]), spot), { room: R, x: 3, y: 2 });
  assert.equal(palHome(one, null), null);
  // 놀러 갈 때는 쿠션에서 일어나 캐릭터 옆으로 (playSpot의 pal은 쿠션이 아니다)
  const play = pf([room(R, [{ u: 1, id: CUSHION, x: 6, y: 4 }, { u: 2, id: 'f_table', x: 2, y: 1 }])]);
  const s = playSpot(play, R, 2);
  assert.deepEqual(s, { me: { room: R, x: 1, y: 1 }, pal: { room: R, x: 0, y: 1 } }, '2칸 식탁 왼쪽 · 파트너는 그 왼쪽');
});

// ───────────────────── 💗 테두리 단계 ─────────────────────

test('💗 테두리 단계 — 10 · 25 · 50부터 (꾸밈만) · 깨진 값은 0단계 · 장면 그림에는 1~3만 class로', () => {
  assert.deepEqual(BOND_TIERS, [10, 25, 50]);
  assert.deepEqual([0, 9, 10, 24, 25, 49, 50, 1e6].map(bondTier), [0, 0, 1, 1, 2, 2, 3, 3]);
  assert.deepEqual([NaN, -5, '30', 12.5, null, Infinity].map(bondTier), [0, 0, 0, 0, 0, 0]);
  const mon = { ko: '개굴닌자', url: 'https://x/a.png' };
  const h2 = stageHtml('tv', { look: LOOK_BASE, mon, tier: 2 });
  assert.ok(h2.includes('class="pshow-pal is-bond2"'));
  for (const t of [0, 4, '2', '"><b>', undefined]) assert.ok(stageHtml('tv', { look: LOOK_BASE, mon, tier: t }).includes('class="pshow-pal"'), String(t));
});

// ───────────────────── 🍚 식탁 · 밥 먹기 ─────────────────────

test('🍚 식탁 [밥 먹기] — 놀기와 같은 규칙(하루 한 번 💗 · 경제 그대로) · 장면 meal · 말에 셈 없음 · 냉장고는 놀 수 없음', () => {
  assert.equal(PLAYS.f_table.btn, '🍚 밥 먹기');
  assert.equal(SCENE_OF.f_table, 'meal');
  const p = pf([room(R, [{ u: 1, id: 'f_table', x: 2, y: 1 }, { u: 2, id: 'f_fridge', x: 6, y: 1 }])]);
  const coins = p.coins;
  assert.deepEqual(playRule(p, R, 1, T), { ok: true, kind: 'f_table', heart: true, mon: 658, bond: 1 });
  assert.equal(playRule(p, R, 1, T).heart, false, '같은 날 두 번째는 장면만');
  assert.deepEqual(playRule(p, R, 2, T), { ok: false, why: 'play' }, '🧊 냉장고는 놓기만');
  assert.equal(p.coins, coins);
  const L = playLines('meal', { mon: '개굴닌자', heart: true }, 0);
  assert.deepEqual(L.start, ['🍚 개굴닌자와 같이 밥 먹어요', '😋 냠냠 — 맛있다!']);
  assert.equal(L.end, '💗 개굴닌자와 더 친해졌어요');
  assert.equal(playLines('meal', { mon: '피카츄', heart: false }).end, '🍚 피카츄와 밥을 먹었어요');
  assert.deepEqual(playLines('meal', { mon: '' }).start, ['🍚 밥 먹어요', '😋 냠냠 — 맛있다!']);
  const h = stageHtml('meal', { look: LOOK_BASE, mon: { ko: '개굴닌자', url: '' } });
  assert.ok(h.includes('pshow-stage is-meal') && h.includes('pv-meal'));
  assert.equal((mealSvg().match(/class="pv-food"/g) || []).length, 3, '내 밥 · 달걀 · 파트너 먹이');
  assert.equal((mealSvg().match(/class="pv-steam"/g) || []).length, 3);
});
