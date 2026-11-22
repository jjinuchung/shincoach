// 🏠 진우네 집 — 1단계 집 꾸미기의 규칙 (2026-10-10, 진우 요청 → 아버님 설계안 "이대로 진행하자")
// 순수 함수만 — 화면 없음 (node 테스트에서 그대로 돈다). 저장은 db.applyHouseRule(= mutateProfile 한 트랜잭션), 부르는 곳은 xp.houseDo.
//
// 큰 그림: 1 집 꾸미기(이번) → 2 포켓몬이 사는 집(쉼·❤️ 회복) → 3 집 넓히기(방·2층) → 4 일상(TV·게임·밥·잠) → 5 진우 캐릭터
// 아버님 결정:
//  ① 방은 위에서 비스듬히 본 모눈 — 바닥 가로 8 × 세로 6칸 + 벽 한 줄 8칸(액자·시계·전등은 벽에만)
//  ② 처음 집 = 빈 방 + 🛏️ 침대 하나 선물 (house.started — 한 번만)
//  ③ 너무 쉽게 얻지 않게: 소품은 하루 공부로 1~2개, 가구는 2~3일, 기기는 1~2주 + 🔷·🔶 스톤("제대로 배웠나"에서만 나온다)
//  ④ 가구는 되팔지 않는다 — 되팔기가 생기면 두 창으로 코인을 복제하는 길이 생기기 쉽다 (메모 profile-merge-invariants 6)
// 🏗️ 집 넓히기 (2026-10-10 아버님 결정 — 큰 그림 3을 앞당김):
//  ⑤ 넓히기도 그냥 주지 않는다 — 공부로 번 💰 + 🔷 수학스톤 + 🔶 영어스톤 셋 다 있어야 산다(스톤은 못 산다 → 한 과목만으로는 못 넓힌다)
//  ⑥ 🔷는 개념 편을 통과할 때마다 나와 🔶(하루 몫이 정해짐)보다 훨씬 쉽게 모인다 → 집 값의 🔷는 MATH_RATE배 (st())
//  ⑦ 📐 방 넓히기(바닥 8 × 6 → 10 × 7, 한 번) → 그 뒤에 🏗️ 2층 올리기(방 하나 더 · 한 가지 가구 6개까지) — 차례대로
//    (처음 이름 "평수 넓히기"는 열 살에게 어려운 말이라 "방 넓히기"로 — 아버님, Codex 46차 D)
// 저장 모양:
//  · 가진 가구·벽지·바닥 = profile.items['f_…'·'w_…'·'fl_…'] — 코인과 같은 가방이라 백업 병합에서 같은 쪽("최근 쪽")을 따른다
//    (코인은 냈는데 가구가 없다·가구가 복제됐다가 안 생긴다). ★ ITEMS 등록부(items.js)에는 넣지 않는다 —
//    🎁 레벨업 상자·🏪 5일장 팔기·📦 구호품·볼·물약 목록이 itemById·종류로 거르므로 가구가 섞이지 않는다 (tests/house.test.js가 확인)
//  · 놓은 자리 = profile.house { started, seq, rooms: [{ id, wall, floor, items: [{ u, id, x, y, f }] }] }
//    u = 놓을 때 붙는 번호(seq) · x, y = 바닥 칸(왼쪽 위 0, 0 — 벽 물건은 y 0) · f = 좌우 뒤집음 1
//    놓은 수 ≤ 가진 수 · 겹치지 않음 · 방 안 — houseOf()가 읽을 때마다 고쳐서 돌려준다(백업 병합·옛 기록으로 어긋나도)
//  · 넓히기 = profile.items['x_wide'·'x_floor2'] 1 — 가구처럼 코인과 같은 가방(같은 쪽). 방 크기·방 수·가구 한도는
//    houseShape()가 가방에서 셈한다(따로 저장하지 않는다) — 넓히기가 없는 쪽으로 합쳐지면 넓힌 칸·2층의 가구는 서랍으로
// 💊 회복 캡슐 (2026-10-10 아버님 설계안 "이대로 진행" — 큰 그림 2 "포켓몬이 사는 집"의 첫 단계, 규칙은 rest.js):
//  · 캡슐(f_heal)은 기기 — 2대까지(HEAL_MAX, 2층이 있어도). 쉬는 중이면 놓인 캡슐에 rest = { id, mon, at, luck }
//    (가구와 함께 옮겨 다니고, 집과 같은 쪽으로 합쳐진다) · 받은/꺼낸 휴식 id는 profile.restsDone(합집합) — houseOf가 지운다
//  · 맡겨 둔 휴식 house.parked = [rest…] — 방이 줄어든 백업과 합쳐져 쉬던 캡슐이 서랍으로 가도 휴식은 버리지 않는다(Codex 47차 #1).
//    빈 캡슐이 놓여 있으면 거기로 옮겨 이어 쉬고, 없으면 서랍의 캡슐을 다시 놓을 때 이어진다(houseOf·placeRule)
// 🪜 계단 (v435 · 2026-11-21 진우 「1층에서 2층으로 올라가는 계단 · 캐릭터가 올라가는 모션」 → 아버님 시안 「이대로」):
//  · 🏗️ 2층이 있으면 공짜로 생긴다 — 1층 맨 뒤 줄(y 0) 바닥 두 칸 + 그 위 벽 두 칸 · 2층 같은 자리 바닥 두 칸은 계단 구멍
//    (가구·캐릭터·파트너·손님이 그 칸에 못 선다 — houseOf가 방마다 room.stair를 붙이고 takenCells가 막는다)
//  · 저장 = house.stair (계단 왼쪽 칸 x · 숫자 하나) — 집과 함께 같은 쪽으로 합쳐진다. 없거나 깨졌으면 읽을 때
//    가구가 가장 적게 걸리는 자리를 고른다(autoStairX · 걸린 가구는 서랍으로) → 처음 열 때 stairStartRule이 저장하고 알려 준다
//  · 캐릭터가 층을 옮기는 길은 계단뿐(avatar.avatarFloorRule) — 위 [1층]·[2층] 탭은 그 층을 보기만 한다
// 🧊 냉장고 채우기 · 🥕 집 안 마트 (v436 · 같은 시안 「이대로」 — 자료와 고쳐 읽기는 food.js):
//  · 음식은 가방(profile.items['food_…']) · 넣은 자리는 house.fridge { 칸: 음식 } — houseOf가 fridgeCopy로 고쳐 함께 싣는다(집 규칙이 저장해도 안 사라지게)
//  · 🥕 사기는 🧊 냉장고를 가져야(서랍에 있어도) · 실마다 칸 수까지 · 넣기·꺼내기는 놓인 냉장고가 있어야(어느 층이든 · 안은 하나)

import { foodById, slotZone, fridgeCopy, foodTray, zoneOwned, CAP as FOOD_CAP } from './food.js'; // 🧊 음식 자료 (순수 — food.js는 아무것도 import하지 않는다)

/** 방 크기 — 바닥 W × H칸, 벽 WALL칸 */
export const ROOM = { W: 8, H: 6, WALL: 8 };
/** 📐 방을 넓힌 크기 (1층·2층 같음 — 집 한 채의 넓이) */
export const ROOM_WIDE = { W: 10, H: 7, WALL: 10 };
/** 한 가지 가구를 가질 수 있는 수 — 방이 하나일 때. 🏗️ 2층을 올리면 FURN_MAX_2F */
export const FURN_MAX = 4;
export const FURN_MAX_2F = 6;
/** 처음 집에 선물로 오는 가구 */
export const START_GIFT = 'f_bed';
/** 1층 방 이름 · 2층 방 이름 */
export const FIRST_ROOM = 'r1';
export const SECOND_ROOM = 'r2';
/** 있을 수 있는 방 (차례) — 지금 있는 방은 houseShape().rooms. 그 밖의 방(또는 2층이 없는데 r2)에 놓인 가구는
 *  읽을 때 서랍으로 돌아온다(화면에서 닿지 않는 가구가 없게, Codex 45차 #4) */
export const ROOMS = [FIRST_ROOM, SECOND_ROOM];
/** 🔷 수학스톤 하나가 🔶 영어스톤 몇 분의 일인가 — 집 값의 🔷 = 🔶 노력 × MATH_RATE (아버님 ⑥) */
export const MATH_RATE = 5;
/** 스톤 값 — m·e는 "같은 노력" 단위 (🔷 m × MATH_RATE개 · 🔶 e개) */
const st = (m, e) => ({ stone_math: m * MATH_RATE, stone_english: e });
/** 💊 회복 캡슐 id · 가질 수 있는 수 (2층이 있어도 — 한 대마다 행운이 있으니 많으면 너무 쉽다) */
export const HEAL = 'f_heal';
export const HEAL_MAX = 2;
/** 🐾 파트너 쿠션 — 캐릭터가 선 방에 있으면 🤝 파트너가 그 위에 앉는다 */
export const CUSHION = 'f_cushion';
/** 놓는 번호의 끝 — 번호(seq·u)가 이보다 크거나 안전한 정수가 아니면 읽을 때 1부터 다시 매긴다
 *  (Codex 45차 #3: 깨진 백업의 아주 큰 번호로 두 번 놓으면 둘 다 "놓았어요"인데 번호가 겹쳐 하나가 사라졌다) */
export const SEQ_MAX = 1e9;
const isHouseObj = (h) => !!h && typeof h === 'object' && !Array.isArray(h);
/** 🪜 계단 너비(칸) — 1층은 바닥·벽 STAIR_W칸씩, 2층은 바닥 STAIR_W칸(구멍) */
export const STAIR_W = 2;
/** 🧊 냉장고 가구 id — 놓인 냉장고를 누르면 [🧊 열기] (v436) */
export const FRIDGE_ID = 'f_fridge';

/**
 * 가구 — id는 'f_'로 시작 · w = 차지하는 칸(가로) · at = 'floor' 바닥 | 'wall' 벽 · group = small 소품 | furn 가구 | device 기기
 * 그림은 이모지 하나(파일·저작권 없음, 오프라인). 태블릿 글꼴 때문에 Emoji 12 이하만 (🪑 12 · 🧸 11 · 나머지 1.0)
 * 이모지가 없는 가구는 art(houseview가 코드로 그린다 — 책상)를 두고, emoji는 알림 글에만 쓴다
 */
export const FURN = [
  // 소품 — 하루 공부로 1~2개
  { id: 'f_teddy', emoji: '🧸', ko: '곰인형', w: 1, at: 'floor', price: 150, group: 'small' },
  { id: 'f_books', emoji: '📚', ko: '책 더미', w: 1, at: 'floor', price: 150, group: 'small' },
  { id: 'f_flower', emoji: '🌻', ko: '해바라기 화분', w: 1, at: 'floor', price: 150, group: 'small' },
  { id: 'f_frame', emoji: '🖼️', ko: '액자', w: 1, at: 'wall', price: 200, group: 'small' },
  { id: 'f_clock', emoji: '🕰️', ko: '시계', w: 1, at: 'wall', price: 200, group: 'small' },
  { id: 'f_lamp', emoji: '💡', ko: '전등', w: 1, at: 'wall', price: 200, group: 'small' },
  // ③ 가구 더하기 (2026-10-18, 아버님 "이대로 해") — 🪴🪟는 Emoji 13이라 태블릿에 없다 → 코드로 그린 그림(art · furnart.js), emoji는 알림 글에만
  { id: 'f_plant', emoji: '🌿', art: 'plant', ko: '큰 화분', w: 1, at: 'floor', price: 200, group: 'small' },
  { id: 'f_window', emoji: '🌤️', art: 'window', ko: '창문', w: 1, at: 'wall', price: 300, group: 'small' },
  // 🐾 방에 놓으면 🤝 파트너가 그 위에 앉는다 (homeplay.palHome)
  { id: 'f_cushion', emoji: '🐾', art: 'cushion', ko: '파트너 쿠션', w: 1, at: 'floor', price: 300, group: 'small' },
  // 가구 — 2~3일
  { id: 'f_chair', emoji: '🪑', ko: '의자', w: 1, at: 'floor', price: 500, group: 'furn' },
  { id: 'f_drawer', emoji: '🗄️', ko: '서랍장', w: 1, at: 'floor', price: 700, group: 'furn' },
  { id: 'f_bed', emoji: '🛏️', ko: '침대', w: 2, at: 'floor', price: 1000, group: 'furn' },
  { id: 'f_sofa', emoji: '🛋️', ko: '소파', w: 2, at: 'floor', price: 1000, group: 'furn' },
  // ✏️ 책상 (2026-10-13 아버님 v252) — 책상 이모지가 없어 방·서랍·가게에는 코드로 그린 그림(art), 알림 글에는 ✏️
  { id: 'f_desk', emoji: '✏️', art: 'desk', ko: '책상', w: 2, at: 'floor', price: 800, group: 'furn' },
  { id: 'f_toybox', emoji: '🧩', art: 'toybox', ko: '장난감 상자', w: 1, at: 'floor', price: 600, group: 'furn' },
  { id: 'f_shelf', emoji: '📖', art: 'shelf', ko: '책장', w: 1, at: 'floor', price: 800, group: 'furn' },
  // 🍽️ 놓으면 [🍚 밥 먹기] — 🎮 일상 행동 (homeplay.PLAYS)
  { id: 'f_table', emoji: '🍽️', art: 'table', ko: '식탁', w: 2, at: 'floor', price: 900, group: 'furn' },
  // 기기 — 1~2주 + 스톤 (코인만으로는 못 산다) · 🔷는 MATH_RATE배 (아버님 ⑥)
  { id: 'f_tv', emoji: '📺', ko: 'TV', w: 1, at: 'floor', price: 2500, stones: st(1, 1), group: 'device' },
  { id: 'f_game', emoji: '🎮', ko: '게임기', w: 1, at: 'floor', price: 3000, stones: st(2, 1), group: 'device' },
  { id: 'f_pc', emoji: '💻', ko: '컴퓨터', w: 1, at: 'floor', price: 3000, stones: st(1, 2), group: 'device' },
  { id: 'f_piano', emoji: '🎹', ko: '피아노', w: 2, at: 'floor', price: 3500, stones: st(2, 2), group: 'device' },
  { id: 'f_fridge', emoji: '🧊', art: 'fridge', ko: '냉장고', w: 1, at: 'floor', price: 2500, stones: st(1, 1), group: 'device' },
  // 💊 포켓몬이 들어가 1시간 쉬는 기계 — max = 이 가구만의 한도 (furnMax)
  { id: HEAL, emoji: '💊', ko: '회복 캡슐', w: 2, at: 'floor', price: 3000, stones: st(2, 2), group: 'device', max: HEAL_MAX },
];

/**
 * 🏗️ 집 넓히기 — id는 'x_' · 한 번씩만 산다 · after = 먼저 있어야 하는 넓히기 (아버님 ⑤⑦)
 * 값은 기기보다 훨씬 크게: 코인은 2~3주·한 달쯤, 스톤은 두 과목이 같은 노력(st(n, n)) — 🔶가 모자라면 영어를, 🔷가 모자라면 수학을
 */
export const GROW = [
  { id: 'x_wide', emoji: '📐', ko: '방 넓히기', price: 4000, stones: st(15, 15), what: `방 바닥이 가로 ${ROOM_WIDE.W} × 세로 ${ROOM_WIDE.H}칸으로 넓어져요` },
  { id: 'x_floor2', emoji: '🏗️', ko: '2층 올리기', price: 8000, stones: st(30, 30), after: 'x_wide', what: `2층 방이 하나 더 생기고, 한 가지 가구를 ${FURN_MAX_2F}개까지 가질 수 있어요` },
];

/** 벽지·바닥 — 한 번 사면 계속 쓴다(하나씩만) · 'w_' 벽지 · 'fl_' 바닥 · 처음 것(PAINT_BASE)은 공짜 */
export const PAINT = [
  { id: 'w_sky', part: 'wall', ko: '하늘색 벽지', color: '#cfe8ff', price: 400 },
  { id: 'w_pink', part: 'wall', ko: '분홍 벽지', color: '#ffd9e6', price: 400 },
  { id: 'w_mint', part: 'wall', ko: '연두 벽지', color: '#d8f5d0', price: 400 },
  { id: 'w_yellow', part: 'wall', ko: '노란 벽지', color: '#fff1b8', price: 400 },
  { id: 'fl_tile', part: 'floor', ko: '타일 바닥', color: '#e3e8ef', price: 400 },
  { id: 'fl_carpet', part: 'floor', ko: '빨간 카펫', color: '#e7a3a3', price: 400 },
  { id: 'fl_grass', part: 'floor', ko: '잔디 바닥', color: '#a9d99b', price: 400 },
];
export const PAINT_BASE = { wall: { ko: '크림색 벽지', color: '#fbf3e4' }, floor: { ko: '나무 바닥', color: '#e2c79f' } };

const FURN_BY = {};
for (const f of FURN) FURN_BY[f.id] = f;
const PAINT_BY = {};
for (const p of PAINT) PAINT_BY[p.id] = p;
const GROW_BY = {};
for (const g of GROW) GROW_BY[g.id] = g;
const own = (o, k) => Object.prototype.hasOwnProperty.call(o, k);

/** 가구 정의 (없으면 null) */
export function furnById(id) {
  return own(FURN_BY, id) ? FURN_BY[id] : null;
}
/** 벽지·바닥 정의 (없으면 null) */
export function paintById(id) {
  return own(PAINT_BY, id) ? PAINT_BY[id] : null;
}
/** 넓히기 정의 (없으면 null) */
export function growById(id) {
  return own(GROW_BY, id) ? GROW_BY[id] : null;
}
/** 집에서 쓰는 물건인가 (가구·벽지·바닥·넓히기) */
export function isHouseItem(id) {
  return !!(furnById(id) || paintById(id) || growById(id));
}
/** 값 — { coins, items: { 스톤id: 개수 } } (purchaseRule과 같은 꼴) */
export function houseCost(id) {
  const d = furnById(id) || paintById(id) || growById(id);
  return { coins: (d && d.price) || 0, items: { ...((d && d.stones) || {}) } };
}

/** 가진 수 */
function ownedOf(profile, id) {
  const n = Number(profile && profile.items && profile.items[id]) || 0;
  return n > 0 ? Math.floor(n) : 0;
}

/** 한 가지 가구를 가질 수 있는 수 — 집 모양의 한도(4·2층 6), 가구가 따로 정했으면 그것과 작은 쪽(💊 캡슐 2) */
export function furnMax(profile, id) {
  const m = houseShape(profile).max;
  const d = furnById(id);
  return d && d.max ? Math.min(m, d.max) : m;
}

/** 휴식 기록의 모양이 바른가 — { id: 글자(1~80자), mon: 양의 정수, at: 양의 안전한 정수(ms), luck: '' | 'lv' | 'evo' } (모르는 칸은 버린 새 객체, 아니면 null)
 *  at은 안전한 정수만 — 깨진 백업의 1e300이면 "1e300 ms 남음"으로 영영 못 받았다 (Codex 47차 #4) */
const LUCKS = ['', 'lv', 'evo'];
function restCopy(r) {
  if (!r || typeof r !== 'object' || Array.isArray(r)) return null;
  if (typeof r.id !== 'string' || !r.id || r.id.length > 80) return null;
  if (!Number.isSafeInteger(r.mon) || r.mon <= 0) return null;
  if (!Number.isSafeInteger(r.at) || r.at <= 0) return null;
  const luck = r.luck === undefined ? '' : r.luck;
  if (!LUCKS.includes(luck)) return null;
  return { id: r.id, mon: r.mon, at: r.at, luck };
}

/**
 * 지금 집의 모양 (순수) — 가방의 넓히기에서 셈한다: 방 크기(size) · 있는 방(rooms) · 한 가지 가구 한도(max).
 * 화면·규칙·고쳐 읽기가 모두 이것 하나로 — 새 객체라 고쳐도 상수는 안 바뀐다
 */
export function houseShape(profile) {
  const wide = ownedOf(profile, 'x_wide') > 0;
  // 🏗️ 2층은 📐 방 넓히기가 있을 때만 켠다 — 가방에 2층만 있는 백업(손으로 만든 것)이면 차례를 건너뛴 8 × 6 방 둘이었다 (Codex 46차 #2).
  //    가방의 2층은 그대로 두므로 방 넓히기를 사면 바로 켜진다(2층 값을 또 내지 않는다)
  const two = wide && ownedOf(profile, 'x_floor2') > 0;
  return { size: { ...(wide ? ROOM_WIDE : ROOM) }, rooms: two ? [FIRST_ROOM, SECOND_ROOM] : [FIRST_ROOM], max: two ? FURN_MAX_2F : FURN_MAX };
}

const emptyRoom = (id) => ({ id, wall: '', floor: '', items: [] });
/** 빈 집 — 방 하나 */
export function emptyHouse() {
  return { started: false, seq: 0, rooms: [emptyRoom(FIRST_ROOM)] };
}

/** 그 가구가 차지하는 칸 열쇠 — 바닥 "x,y" · 벽 "w:x" */
/**
 * 🔄 세로로 돌릴 수 있는 가구인가 — 바닥에 놓는 두 칸 가구(소파·침대·책상·식탁·피아노·회복 캡슐) (v334 · 2026-10-25 진우 "소파를 세로로도 놓고 싶다")
 * 놓인 가구의 r = 1이면 세로(1칸 × w칸 — 위에서 아래로) · 없거나 0이면 가로(예전 그대로)
 */
export function canTurn(def) {
  return !!def && def.at === 'floor' && def.w > 1;
}
/** 세로로 놓였나 (깨진 값·돌릴 수 없는 가구는 가로) */
export function turnOf(def, r) {
  return r === 1 && canTurn(def) ? 1 : 0;
}
function cellsOf(def, x, y, r = 0) {
  const out = [];
  const down = turnOf(def, r) === 1;
  for (let i = 0; i < def.w; i++) out.push(def.at === 'wall' ? `w:${x + i}` : down ? `${x},${y + i}` : `${x + i},${y}`);
  return out;
}
/** 방 안인가 — 바닥은 0 ≤ x, x + w ≤ W, 0 ≤ y < H (세로면 x < W, y + w ≤ H) · 벽은 y 0, x + w ≤ WALL (size = houseShape().size) */
function inRoom(size, def, x, y, r = 0) {
  if (!Number.isInteger(x) || !Number.isInteger(y)) return false;
  if (def.at === 'wall') return y === 0 && x >= 0 && x + def.w <= size.WALL;
  if (turnOf(def, r) === 1) return x >= 0 && y >= 0 && x < size.W && y + def.w <= size.H;
  return x >= 0 && y >= 0 && x + def.w <= size.W && y < size.H;
}
/** 가구가 차지한 칸만 (계단 칸은 빼고 — 계단을 옮길 자리를 볼 때) */
function itemCells(room, skipU) {
  const set = new Set();
  for (const it of room.items) {
    if (it.u === skipU) continue;
    const d = furnById(it.id);
    if (d) for (const c of cellsOf(d, it.x, it.y, it.r)) set.add(c);
  }
  return set;
}
/** 🪜 계단이 막는 칸 — 1층(FIRST_ROOM)은 맨 뒤 줄 바닥 + 그 위 벽 · 2층은 맨 뒤 줄 바닥(구멍) · x = 왼쪽 칸 */
export function stairCells(roomId, x) {
  const out = [];
  for (let i = 0; i < STAIR_W; i++) {
    out.push(`${x + i},0`);
    if (roomId === FIRST_ROOM) out.push(`w:${x + i}`);
  }
  return out;
}
/** 방에서 차지한 칸 (skipU는 빼고 — 옮길 때 제자리와 겹쳐도 되게) · 🧑 캐릭터가 설 빈 칸을 찾을 때도(avatar.js) · 🔄 세로 가구는 세로 칸 ·
 *  🪜 계단 칸도(houseOf가 붙인 room.stair — 가구·캐릭터·파트너·손님이 계단 위에 서지 않게) */
export function takenCells(room, skipU) {
  const set = itemCells(room, skipU);
  if (Number.isInteger(room.stair)) for (const c of stairCells(room.id, room.stair)) set.add(c);
  return set;
}
/** 🪜 저장된 계단 자리가 바른가 — 방 안의 정수 x면 그 x, 아니면 null */
function stairXOf(raw, size) {
  return Number.isInteger(raw) && raw >= 0 && raw + STAIR_W <= size.W ? raw : null;
}
/** 🪜 그 자리(x)에 계단을 놓을 수 있나 (순수) — 방마다 계단 칸에 가구가 없어야 (h = houseOf 결과 · 지금 계단 칸은 셈에서 뺀다) */
export function canStair(size, h, x) {
  if (!size || !h || stairXOf(x, size) === null) return false;
  return h.rooms.every((r) => {
    const t = itemCells(r);
    return stairCells(r.id, x).every((c) => !t.has(c));
  });
}
/** 🪜 저장된 계단이 없을 때 고르는 자리 (순수) — 계단 칸에 걸리는 가구가 가장 적은 x(쉬는 💊 캡슐은 많이 센다) · 같으면 오른쪽 */
function autoStairX(h, size) {
  let best = null;
  for (let x = size.W - STAIR_W; x >= 0; x--) {
    let cost = 0;
    for (const r of h.rooms) {
      const keys = new Set(stairCells(r.id, x));
      for (const it of r.items) {
        const d = furnById(it.id);
        if (d && cellsOf(d, it.x, it.y, it.r).some((c) => keys.has(c))) cost += it.rest ? 100 : 1;
      }
    }
    if (!best || cost < best.cost) best = { x, cost };
  }
  return best ? best.x : null;
}
/** 🪜 계단 앞 칸 — 그 층에 내려서서 처음 밟는 칸. 1층은 계단 발치(왼쪽 칸 앞), 2층은 구멍의 높은 쪽(오른쪽 칸 앞) */
export function stairExit(roomId, x) {
  return roomId === FIRST_ROOM ? { x, y: 1 } : { x: x + STAIR_W - 1, y: 1 };
}
/** 그 자리에 놓을 수 있나 — 방 안이고 다른 가구와 겹치지 않으면 (화면이 끄는 동안 빨갛게 보일지 정할 때도 쓴다)
 *  size는 맨 앞 — 넓힌 집에서 크기를 빠뜨리면 조용히 8 × 6으로 재지 않고 바로 틀리게 */
export function canPlace(size, room, id, x, y, skipU, r = 0) {
  const d = furnById(id);
  if (!d || !room || !size || !inRoom(size, d, x, y, r)) return false;
  const taken = takenCells(room, skipU);
  return cellsOf(d, x, y, r).every((c) => !taken.has(c));
}

/**
 * 고쳐 읽은 집 (새 객체 — 입력은 안 바꾼다). 백업 병합·옛 기록·다른 창으로 어긋난 것을 여기서 고친다:
 * 집이 객체가 아님(빈 집) · 지금 그리지 않는 방(그 가구는 서랍으로) · 모르는 가구·방 밖·겹침(먼저 놓은 것이 남음) ·
 * 가진 수보다 많이 놓음(나중에 놓은 것부터 뺌) · 같은 번호 · 안 가진 벽지·바닥(처음 것으로) · 깨진 번호(1부터 다시)
 */
export function houseOf(profile) {
  const src = profile && isHouseObj(profile.house) ? profile.house : null;
  const shape = houseShape(profile);
  if (shape.rooms.length < 2) return buildHouse(profile, shape, src, null);
  // 🪜 2층이 있으면 계단 — 저장된 자리, 없거나 깨졌으면 가구가 가장 적게 걸리는 자리(계단 없이 한 번 지어 보고 고른다)
  const saved = src ? stairXOf(src.stair, shape.size) : null;
  if (saved !== null) return buildHouse(profile, shape, src, saved);
  return buildHouse(profile, shape, src, autoStairX(buildHouse(profile, shape, src, null), shape.size));
}

/** 🪜 저장된 계단 자리가 있나 (순수) — 없으면 화면이 처음 열 때 stairStartRule로 저장하고 「계단이 생겼어요」를 알린다 */
export function stairSaved(profile) {
  const shape = houseShape(profile);
  return shape.rooms.length > 1 && !!profile && isHouseObj(profile.house) && stairXOf(profile.house.stair, shape.size) !== null;
}

/** houseOf의 몸통 — stairX가 숫자면 그 자리에 계단(방마다 room.stair · 집에 stair)을 먼저 두고 가구를 고쳐 읽는다(계단 칸의 가구는 서랍으로) */
function buildHouse(profile, shape, src, stairX) {
  const out = { ...emptyHouse(), rooms: shape.rooms.map(emptyRoom) };
  const withStair = (room) => { if (stairX !== null) room.stair = stairX; return room; };
  if (stairX !== null) { out.rooms.forEach(withStair); out.stair = stairX; }
  if (!src) return out;
  out.started = !!src.started;
  const seqRaw = src.seq === undefined || src.seq === null ? 0 : Number(src.seq);
  let renumber = !(Number.isSafeInteger(seqRaw) && seqRaw >= 0 && seqRaw <= SEQ_MAX);
  let seq = renumber ? 0 : seqRaw;
  const rooms = Array.isArray(src.rooms) ? src.rooms : [];
  const seen = new Set();
  const fixed = [];
  for (const r of rooms) {
    if (!r || typeof r.id !== 'string' || !shape.rooms.includes(r.id) || seen.has(r.id)) continue;
    seen.add(r.id);
    fixed.push(r);
  }
  for (const id of shape.rooms) if (!seen.has(id)) fixed.push(emptyRoom(id));
  fixed.sort((a, b) => shape.rooms.indexOf(a.id) - shape.rooms.indexOf(b.id));
  out.rooms = fixed.map((r) => {
    const room = withStair(emptyRoom(r.id));
    const paint = (part) => {
      const id = r[part];
      const d = typeof id === 'string' ? paintById(id) : null;
      return d && d.part === part && ownedOf(profile, id) > 0 ? id : '';
    };
    room.wall = paint('wall');
    room.floor = paint('floor');
    return room;
  });
  // 가구는 **집 전체에서 놓은 차례(번호)대로** — 가진 수보다 많이 놓였으면 어느 방이든 나중에 놓은 것이 빠진다(방 차례가 아니라)
  // 번호는 양수면 받는다(아주 큰 수도 차례를 정하는 데는 쓴다) — 안전한 정수가 아니면 아래에서 다시 매긴다
  const all = [];
  fixed.forEach((r, k) => {
    for (const it of Array.isArray(r.items) ? r.items : []) if (it && typeof it.u === 'number' && it.u > 0) all.push({ k, it });
  });
  all.sort((a, b) => a.it.u - b.it.u);
  const placed = {}; // 집 전체에서 놓은 수 (방이 늘어도 가진 수는 하나)
  const uSeen = new Set();
  // 💊 받은/꺼낸 휴식은 되살리지 않는다(옛 창·옛 백업의 집) · 같은 종은 캡슐 한 대에만(먼저 놓은 캡슐)
  const done = isHouseObj(profile.restsDone) ? profile.restsDone : {};
  const resting = new Set();
  for (const { k, it } of all) {
    const room = out.rooms[k];
    if (uSeen.has(it.u)) continue;
    const d = furnById(it.id);
    if (!d) continue;
    if ((placed[it.id] || 0) >= ownedOf(profile, it.id)) continue;
    const r = turnOf(d, it.r); // 🔄 세로 (v334) — 깨진 값·돌릴 수 없는 가구는 가로
    if (!canPlace(shape.size, room, it.id, it.x, it.y, undefined, r)) continue;
    uSeen.add(it.u);
    placed[it.id] = (placed[it.id] || 0) + 1;
    if (!(Number.isSafeInteger(it.u) && it.u <= SEQ_MAX)) renumber = true;
    else seq = Math.max(seq, it.u);
    const fixedItem = { u: it.u, id: it.id, x: it.x, y: it.y, f: it.f ? 1 : 0, ...(r ? { r: 1 } : {}) };
    const rest = it.id === HEAL ? restCopy(it.rest) : null;
    if (rest && !own(done, rest.id) && !resting.has(rest.mon)) {
      resting.add(rest.mon);
      fixedItem.rest = rest;
    }
    room.items.push(fixedItem);
  }
  if (renumber) {
    // 놓은 차례(번호 순서)는 그대로 두고 1부터 — 늘 같은 결과라 다시 읽어도 번호가 같다
    const all = out.rooms.flatMap((r) => r.items).sort((a, b) => a.u - b.u);
    all.forEach((it, i) => { it.u = i + 1; });
    seq = all.length;
  }
  out.seq = seq;
  // 💊 자리를 잃은 캡슐의 휴식은 버리지 않는다 (Codex 47차 #1: 2층이 없는 백업과 합쳐지면 2층 캡슐이 서랍으로 가며 쉬던 휴식이
  //    사라졌고, 그 뒤 집을 한 번 고치면 2층을 되찾아도 영영 없었다). 전에 맡긴 것(parked) 먼저, 그다음 이번에 자리를 잃은 캡슐(놓은 차례).
  //    빈 캡슐이 놓여 있으면 거기서 이어 쉬고 · 없으면 서랍의 캡슐 수만큼 맡겨 둔다(다시 놓으면 placeRule이 잇는다) · 그 밖은 버린다
  const lostCaps = [];
  for (const r of rooms) for (const it of (r && Array.isArray(r.items) ? r.items : [])) if (it && it.id === HEAL && it.rest) lostCaps.push(it);
  lostCaps.sort((a, b) => (Number(a.u) || 0) - (Number(b.u) || 0));
  const caps = out.rooms.flatMap((r) => r.items).filter((i) => i.id === HEAL).sort((a, b) => a.u - b.u);
  const restIds = new Set(caps.filter((i) => i.rest).map((i) => i.rest.id));
  const drawerCaps = ownedOf(profile, HEAL) - caps.length;
  const parked = [];
  for (const raw of [...(Array.isArray(src.parked) ? src.parked : []), ...lostCaps.map((i) => i.rest)]) {
    const rest = restCopy(raw);
    if (!rest || own(done, rest.id) || restIds.has(rest.id) || resting.has(rest.mon)) continue;
    const empty = caps.find((i) => !i.rest);
    if (empty) empty.rest = rest;
    else if (parked.length < drawerCaps) parked.push(rest);
    else continue;
    restIds.add(rest.id);
    resting.add(rest.mon);
  }
  if (parked.length) out.parked = parked;
  // 🧊 냉장고 안 (v436) — 고쳐서 함께 싣는다: 안 실으면 다른 집 규칙(놓기·옮기기…)이 profile.house = h로 저장할 때 사라진다 · 비었으면 칸 없음
  const fridge = fridgeCopy(src.fridge, profile && profile.items);
  if (Object.keys(fridge).length) out.fridge = fridge;
  return out;
}

/** 💊 집에서 쉬는 휴식 전부 — 놓인 캡슐의 것 + 맡겨 둔 것 (h = houseOf 결과) · 같은 종 두 번(twice)·기록 번호 겹침을 볼 때 */
export function restsOf(h) {
  const out = [];
  for (const r of h.rooms) for (const it of r.items) if (it.rest) out.push(it.rest);
  return out.concat(h.parked || []);
}

/** 서랍에 남은 가구 — { 가구id: 가진 수 − 놓은 수 } (0개는 뺀다) */
export function leftOf(profile) {
  const h = houseOf(profile);
  const placed = {};
  for (const r of h.rooms) for (const it of r.items) placed[it.id] = (placed[it.id] || 0) + 1;
  const out = {};
  for (const f of FURN) {
    const n = ownedOf(profile, f.id) - (placed[f.id] || 0);
    if (n > 0) out[f.id] = n;
  }
  return out;
}

// ───────────────────── 규칙 (profile 복사본을 고친다 — db.mutateProfile 안에서 돈다) ─────────────────────

const roomIn = (h, roomId) => h.rooms.find((r) => r.id === roomId) || null;

/** 🛏️ 처음 집 선물 — 한 번만 (두 창·백업 병합에서도: started는 병합에서 OR) */
export function houseStartRule(profile) {
  const h = houseOf(profile);
  if (h.started) return { ok: false, why: 'already' };
  h.started = true;
  profile.items[START_GIFT] = ownedOf(profile, START_GIFT) + 1;
  profile.house = h;
  return { ok: true, gift: START_GIFT };
}

/**
 * 살 수 있나 (순수) — 🛒 가구 상점 화면이 단추·모자란 것을 보여 줄 때, houseBuyRule이 같은 판정을 쓴다(화면과 저장이 갈라지지 않게).
 * why 'order' = 먼저 있어야 하는 넓히기가 없다(need에 그 id) — 🏗️ 2층은 📐 방을 넓힌 뒤에
 * @returns {{ok:boolean, why?:'unknown'|'gift'|'owned'|'max'|'order'|'short', have?:number, need?:string, shortCoins?:number, shortStones?:Object<string,number>}}
 */
export function houseBuyCheck(profile, id) {
  const furn = furnById(id);
  const paint = paintById(id);
  const grow = growById(id);
  if (!furn && !paint && !grow) return { ok: false, why: 'unknown' };
  const have = ownedOf(profile, id);
  // 🎁 이사 선물(🛏️)을 받기 전에는 못 산다 — 침대 넷을 사고 선물을 받으면 한도를 넘었다 (Codex 45차 #5)
  if (!houseOf(profile).started) return { ok: false, why: 'gift', have };
  if ((paint || grow) && have > 0) return { ok: false, why: 'owned', have };
  if (furn && have >= furnMax(profile, id)) return { ok: false, why: 'max', have };
  if (grow && grow.after && ownedOf(profile, grow.after) < 1) return { ok: false, why: 'order', have, need: grow.after };
  const cost = houseCost(id);
  const shortCoins = Math.max(0, cost.coins - (Number(profile && profile.coins) || 0));
  const shortStones = {};
  for (const sid of Object.keys(cost.items)) {
    const s = cost.items[sid] - ownedOf(profile, sid);
    if (s > 0) shortStones[sid] = s;
  }
  if (shortCoins > 0 || Object.keys(shortStones).length) return { ok: false, why: 'short', have, shortCoins, shortStones };
  return { ok: true, have };
}

/**
 * 가구·벽지·바닥·넓히기 사기 — 💰 + 스톤 (저장된 가방으로 판정).
 * why: 'unknown' 파는 물건이 아님 · 'gift' 이사 선물 전 · 'owned' 벽지·바닥·넓히기는 이미 있음 ·
 *      'max' 가구는 houseShape().max개까지 · 'order' 넓히기 차례 · 'short' 코인·스톤이 모자람
 */
export function houseBuyRule(profile, id) {
  const c = houseBuyCheck(profile, id);
  if (!c.ok) return { ok: false, why: c.why };
  const have = ownedOf(profile, id);
  const cost = houseCost(id);
  profile.coins = (Number(profile.coins) || 0) - cost.coins;
  for (const sid of Object.keys(cost.items)) {
    const n = ownedOf(profile, sid) - cost.items[sid];
    if (n > 0) profile.items[sid] = n; else delete profile.items[sid];
  }
  profile.items[id] = have + 1; // (stonesSpent는 📊 "레벨업에 쓴 스톤"만 센다 — 다른 스톤 상점 물건처럼 여기선 안 올린다)
  return { ok: true };
}

/** 서랍에서 꺼내 놓기 — why: 'room' · 'unknown' · 'none' 서랍에 없음 · 'spot' 방 밖이거나 겹침 */
export function placeRule(profile, roomId, id, x, y) {
  const h = houseOf(profile);
  const room = roomIn(h, roomId);
  if (!room) return { ok: false, why: 'room' };
  if (!furnById(id)) return { ok: false, why: 'unknown' };
  if (!(leftOf({ ...profile, house: h })[id] > 0)) return { ok: false, why: 'none' };
  if (!canPlace(houseShape(profile).size, room, id, x, y)) return { ok: false, why: 'spot' };
  h.seq += 1;
  const item = { u: h.seq, id, x, y, f: 0 };
  // 💊 맡겨 둔 휴식이 있으면 다시 놓은 캡슐에서 이어 쉰다 (Codex 47차 #1) — rest를 돌려줘 화면이 "이어서 쉬어요"라고 말한다
  if (id === HEAL && h.parked && h.parked.length) {
    item.rest = h.parked.shift();
    if (!h.parked.length) delete h.parked;
  }
  room.items.push(item);
  profile.house = h;
  return { ok: true, u: h.seq, ...(item.rest ? { rest: { ...item.rest } } : {}) };
}

/** 놓인 가구 옮기기 — why: 'room' · 'gone' 그 가구가 없음(다른 창에서 서랍에 넣음) · 'spot' */
export function moveRule(profile, roomId, u, x, y) {
  const h = houseOf(profile);
  const room = roomIn(h, roomId);
  if (!room) return { ok: false, why: 'room' };
  const it = room.items.find((i) => i.u === u);
  if (!it) return { ok: false, why: 'gone' };
  if (!canPlace(houseShape(profile).size, room, it.id, x, y, u, it.r)) return { ok: false, why: 'spot' };
  it.x = x;
  it.y = y;
  profile.house = h;
  return { ok: true };
}

/**
 * 🔄 가로 ↔ 세로 돌리기 (v334) — 왼쪽 위 칸을 그대로 두고 돌린다 · 거기서 안 되면 세로는 한 칸 위로, 가로는 한 칸 왼쪽으로 한 번 더 본다
 * (방 맨 아래 줄·맨 오른쪽 칸의 가구도 돌릴 수 있게) · why: 'room' · 'gone' · 'turn' 돌릴 수 없는 가구 · 'turnSpot' 돌릴 자리가 없음
 */
export function turnRule(profile, roomId, u) {
  const h = houseOf(profile);
  const room = roomIn(h, roomId);
  if (!room) return { ok: false, why: 'room' };
  const it = room.items.find((i) => i.u === u);
  if (!it) return { ok: false, why: 'gone' };
  const d = furnById(it.id);
  if (!canTurn(d)) return { ok: false, why: 'turn' };
  const r = it.r === 1 ? 0 : 1;
  const size = houseShape(profile).size;
  const spots = [{ x: it.x, y: it.y }, r ? { x: it.x, y: it.y - 1 } : { x: it.x - 1, y: it.y }];
  const at = spots.find((p) => canPlace(size, room, it.id, p.x, p.y, u, r));
  if (!at) return { ok: false, why: 'turnSpot' };
  it.x = at.x;
  it.y = at.y;
  if (r) it.r = 1; else delete it.r;
  profile.house = h;
  return { ok: true, r };
}

/** ↔️ 좌우 뒤집기 */
export function flipRule(profile, roomId, u) {
  const h = houseOf(profile);
  const room = roomIn(h, roomId);
  const it = room && room.items.find((i) => i.u === u);
  if (!it) return { ok: false, why: room ? 'gone' : 'room' };
  it.f = it.f ? 0 : 1;
  profile.house = h;
  return { ok: true };
}

/** 📦 서랍에 넣기 (가진 수는 그대로 — 다시 꺼내 놓을 수 있다) · why 'resting' 쉬는 중인 💊 캡슐 */
export function storeRule(profile, roomId, u) {
  const h = houseOf(profile);
  const room = roomIn(h, roomId);
  if (!room) return { ok: false, why: 'room' };
  const k = room.items.findIndex((i) => i.u === u);
  if (k < 0) return { ok: false, why: 'gone' };
  if (room.items[k].rest) return { ok: false, why: 'resting' }; // 💊 쉬는 캡슐은 서랍에 못 넣는다(먼저 꺼내기)
  room.items.splice(k, 1);
  profile.house = h;
  return { ok: true };
}

/** 벽지·바닥 바꾸기 — id ''는 처음 것(공짜) · why: 'room' · 'unknown' · 'none' 안 가짐 */
export function paintRule(profile, roomId, part, id) {
  const h = houseOf(profile);
  const room = roomIn(h, roomId);
  if (!room) return { ok: false, why: 'room' };
  if (part !== 'wall' && part !== 'floor') return { ok: false, why: 'unknown' };
  if (id) {
    const d = paintById(id);
    if (!d || d.part !== part) return { ok: false, why: 'unknown' };
    if (ownedOf(profile, id) < 1) return { ok: false, why: 'none' };
  }
  room[part] = id || '';
  profile.house = h;
  return { ok: true };
}

/** 🪜 계단 옮기기 (v435) — 두 층 모두 그 자리(1층 바닥 두 칸·벽 두 칸 · 2층 바닥 두 칸)에 가구가 없어야 · 캐릭터·파트너는 읽을 때 비켜 선다
 *  why: 'room' 계단이 없음(2층 전) · 'spot' 방 밖이거나 가구가 있음 */
export function stairMoveRule(profile, x) {
  const h = houseOf(profile);
  if (!Number.isInteger(h.stair)) return { ok: false, why: 'room' };
  if (!canStair(houseShape(profile).size, h, x)) return { ok: false, why: 'spot' };
  h.stair = x;
  for (const r of h.rooms) r.stair = x;
  profile.house = h;
  return { ok: true };
}

/**
 * 🪜 처음 계단 (v435) — 저장된 자리가 없으면 읽을 때 고른 자리를 저장한다(한 번 — 화면이 「🪜 계단이 생겼어요」).
 * moved = 계단 때문에 서랍으로 간 가구 id(계단 없이 지은 집에서 놓인 차례) — 가구마다 「계단 없이 놓인 수 − 계단과 놓인 수」만큼.
 * (자리로 견주면 틀렸다: 가진 수보다 많이 놓인 집에서 계단 자리의 의자가 빠지면 넘쳐 빠지던 다른 자리 의자가 들어와, 방에 있는 의자를 「서랍에 넣었어요」라고 했다)
 * why: 'room' 2층 전 · 'already' 이미 저장됨
 */
export function stairStartRule(profile) {
  const shape = houseShape(profile);
  if (shape.rooms.length < 2) return { ok: false, why: 'room' };
  if (stairSaved(profile)) return { ok: false, why: 'already' };
  const src = profile && isHouseObj(profile.house) ? profile.house : null;
  const h = houseOf(profile);
  const before = buildHouse(profile, shape, src, null);
  const count = (hh) => { const c = {}; for (const r of hh.rooms) for (const i of r.items) c[i.id] = (c[i.id] || 0) + 1; return c; };
  const left = count(before);
  const now = count(h);
  for (const id of Object.keys(left)) left[id] -= now[id] || 0;
  const moved = [];
  for (const r of before.rooms) for (const i of r.items) if (left[i.id] > 0) { left[i.id] -= 1; moved.push(i.id); }
  profile.house = h;
  return { ok: true, x: h.stair, moved };
}

// ───────────────────── 🧊 냉장고 채우기 · 🥕 집 안 마트 (v436) ─────────────────────

/** 🧊 놓인 냉장고가 있나 (어느 층이든 — 안은 하나라 어느 냉장고를 열어도 같다) · h = houseOf 결과 */
export function fridgePlaced(h) {
  return !!h && h.rooms.some((r) => r.items.some((i) => i.id === FRIDGE_ID));
}

/**
 * 🥕 살 수 있나 (순수) — 마트 화면과 사기 규칙이 같은 판정을 쓴다.
 * why: 'unknown' 파는 음식이 아님 · 'gift' 이사 선물 전 · 'nofridge' 🧊 냉장고가 없음(서랍에 있으면 됨 — 넣을 곳이 없는데 코인만 쓰지 않게) ·
 *      'full' 그 실에 넣을 음식이 칸 수만큼(zone · placed = 그 실에 넣은 수 — 다 넣었으면 「꽉 찼어요」, 아니면 「바구니부터 넣어요」) ·
 *      'short' 코인이 모자람(shortCoins)
 */
export function foodBuyCheck(profile, id) {
  const f = foodById(id);
  if (!f) return { ok: false, why: 'unknown' };
  const h = houseOf(profile);
  if (!h.started) return { ok: false, why: 'gift' };
  if (ownedOf(profile, FRIDGE_ID) < 1) return { ok: false, why: 'nofridge' };
  if (zoneOwned(profile && profile.items, f.zone) >= FOOD_CAP[f.zone]) {
    const placed = Object.keys(h.fridge || {}).filter((k) => slotZone(k) === f.zone).length;
    return { ok: false, why: 'full', zone: f.zone, placed };
  }
  const shortCoins = Math.max(0, f.price - (Number(profile && profile.coins) || 0));
  if (shortCoins > 0) return { ok: false, why: 'short', shortCoins };
  return { ok: true };
}

/**
 * 🥕 음식 사기 — 💰만 (저장된 가방으로 판정) · 산 음식은 🧺 내 음식(바구니)으로 · 되팔지 않는다 · 안 되면 판정 그대로(zone·placed·shortCoins — 화면이 말로)
 * 사기 전에 저장된 냉장고 안을 지금 가방으로 고쳐 둔다 — 가방이 줄어든 백업과 합쳐져 숨어 있던 옛 자리가
 * 가진 수가 늘면 되살아나, 산 음식이 바구니가 아니라 아이가 넣지 않은 칸에 나타났다 (리뷰 워크플로)
 */
export function foodBuyRule(profile, id) {
  const c = foodBuyCheck(profile, id);
  if (!c.ok) return c;
  if (isHouseObj(profile.house) && profile.house.fridge !== undefined) {
    const fr = fridgeCopy(profile.house.fridge, profile.items);
    if (Object.keys(fr).length) profile.house.fridge = fr; else delete profile.house.fridge;
  }
  profile.coins = (Number(profile.coins) || 0) - foodById(id).price;
  profile.items[id] = ownedOf(profile, id) + 1;
  return { ok: true };
}

/**
 * 🧊 냉장고 칸에 넣기 — why: 'nofridge' 놓인 냉장고가 없음 · 'unknown' 모르는 칸·음식 · 'zone' 실이 안 맞음(아이스크림은 냉동실) ·
 * 'taken' 그 칸에 벌써 있음(다른 화면에서 넣음) · 'none' 바구니에 없음
 */
export function fridgePutRule(profile, slot, id) {
  const h = houseOf(profile);
  if (!fridgePlaced(h)) return { ok: false, why: 'nofridge' };
  const z = slotZone(slot);
  const f = foodById(id);
  if (!z || !f) return { ok: false, why: 'unknown' };
  if (f.zone !== z) return { ok: false, why: 'zone' };
  const fr = h.fridge || {};
  if (Object.prototype.hasOwnProperty.call(fr, slot)) return { ok: false, why: 'taken' };
  if (!(foodTray(profile.items, fr)[id] > 0)) return { ok: false, why: 'none' };
  h.fridge = { ...fr, [slot]: id };
  profile.house = h;
  return { ok: true };
}

/** 🧊 냉장고 칸에서 꺼내기(바구니로) — why: 'nofridge' · 'empty' 그 칸이 비었음(다른 화면에서 꺼냄) · id = 꺼낸 음식 */
export function fridgeTakeRule(profile, slot) {
  const h = houseOf(profile);
  if (!fridgePlaced(h)) return { ok: false, why: 'nofridge' };
  const fr = h.fridge || {};
  if (!Object.prototype.hasOwnProperty.call(fr, slot)) return { ok: false, why: 'empty' };
  const id = fr[slot];
  const next = { ...fr };
  delete next[slot];
  if (Object.keys(next).length) h.fridge = next; else delete h.fridge;
  profile.house = h;
  return { ok: true, id };
}
