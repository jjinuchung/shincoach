// 🧊 냉장고 음식 (v436 · 2026-11-21 진우 「냉장고 안을 채우고 싶다」 → 아버님 「추천대로」 · 시안 「이대로」)
// 순수 자료 — 화면 없음(node 시험이 그대로 돈다). 규칙(사기·넣기·꺼내기)은 house.js, 화면은 fridgeview.js·houseview.js(🥕 마트).
//
// 아버님 결정:
//  ① 냉장고를 누르고 [🧊 열기] → 화면 가득 앞모습(위 작은 문 ❄️ 냉동실 · 아래 큰 문 🥛 냉장실) → 문을 열면 안을 가까이
//  ② 🥕 마트는 🛒 가구 상점 탭 안 — 💰만 · 두 번 눌러 산다 · 산 음식은 🧺 내 음식(냉장고 안 바구니)으로
//  ③ 음식은 줄지 않는다 · 효과도 아직 없다(채우는 재미만) · 넣으면 파트너가 「맛있겠다!」(💗 없음)
//     — 🗑️ 버리기만 예외 (v443 · 11-26 점검): 🧺 내 음식에서 두 번 눌러 하나 · 💰는 안 돌아옴(house.foodDropRule) — 없으면 꽉 찬 실을 다른 음식으로 못 바꾼다
//  ④ 칸 = 냉장실 22 · 냉동실 18 — 그 실에 넣을 음식은 칸 수까지만 가질 수 있다(넣은 것 + 바구니) · 냉장고가 둘이어도 안은 하나
// 저장 모양:
//  · 가진 음식 = profile.items['food_…'] — 코인과 같은 가방(백업 병합에서 같은 쪽 · 낸 코인과 산 음식이 갈라지지 않게).
//    ★ ITEMS 등록부(items.js)에는 넣지 않는다 — 🎁 상자·🏪 5일장·📦 구호품이 itemById로 거르므로 음식이 섞이지 않는다(가구와 같은 길)
//  · 넣은 자리 = profile.house.fridge { 칸: 음식 id } — 집과 함께 같은 쪽으로 · houseOf가 읽을 때마다 fridgeCopy로 고친다
//    (모르는 칸 · 모르는 음식 · 실이 안 맞음 · 가진 수보다 많이 넣음 → 칸 차례에서 나중 것을 뺀다 — 빠진 음식은 바구니로)

/** 음식 서른 — id · 그림(Emoji 12 이하) · 이름 · 값(💰) · 넣는 실(cold 냉장실 · frozen 냉동실) */
export const FOODS = [
  ['apple', '🍎', '사과', 30, 'cold'], ['banana', '🍌', '바나나', 30, 'cold'], ['grape', '🍇', '포도', 30, 'cold'], ['strawberry', '🍓', '딸기', 30, 'cold'],
  ['orange', '🍊', '귤', 30, 'cold'], ['carrot', '🥕', '당근', 30, 'cold'], ['broccoli', '🥦', '브로콜리', 30, 'cold'], ['tomato', '🍅', '토마토', 30, 'cold'],
  ['cucumber', '🥒', '오이', 30, 'cold'], ['watermelon', '🍉', '수박', 200, 'cold'],
  ['milk', '🥛', '우유', 50, 'cold'], ['juice', '🧃', '주스', 50, 'cold'], ['egg', '🥚', '달걀', 50, 'cold'], ['cheese', '🧀', '치즈', 50, 'cold'],
  ['butter', '🧈', '버터', 50, 'cold'], ['pudding', '🍮', '푸딩', 50, 'cold'], ['onigiri', '🍙', '주먹밥', 50, 'cold'], ['sandwich', '🥪', '샌드위치', 50, 'cold'],
  ['chicken', '🍗', '닭다리', 100, 'cold'], ['steak', '🥩', '고기', 100, 'cold'], ['fish', '🐟', '생선', 100, 'cold'], ['cake', '🍰', '조각 케이크', 150, 'cold'],
  ['icecream', '🍨', '아이스크림', 150, 'frozen'], ['softcream', '🍦', '소프트아이스크림', 150, 'frozen'], ['bingsu', '🍧', '빙수', 150, 'frozen'], ['ice', '🧊', '얼음', 30, 'frozen'],
  ['dumpling', '🥟', '만두', 100, 'frozen'], ['pizza', '🍕', '냉동 피자', 100, 'frozen'], ['shrimp', '🦐', '새우', 100, 'frozen'], ['meat', '🍖', '뼈 고기', 100, 'frozen'],
].map(([id, emoji, ko, price, zone]) => ({ id: `food_${id}`, emoji, ko, price, zone }));

/** 실 이름 */
export const ZONE_KO = { cold: '냉장실', frozen: '냉동실' };

/**
 * 냉장고 안 칸 — 줄마다 [열쇠 머리, 칸 수(, 이름표)] · 칸 열쇠 = `${머리}:${차례}` (예: 'c:s1:0')
 * 냉장실: 선반 셋(4칸씩) · 채소·과일 칸(4) · 문 칸 셋(2칸씩) = 22 / 냉동실: 위 선반(4) · 서랍 둘(3칸씩) · 왼쪽·오른쪽 문 칸 둘씩(2칸씩) = 18
 */
export const FRIDGE = {
  cold: { shelves: [['c:s1', 4], ['c:s2', 4], ['c:s3', 4]], drawer: ['c:cr', 4, '채소·과일 칸'], pockets: [['c:p1', 2], ['c:p2', 2], ['c:p3', 2]] },
  frozen: { shelves: [['f:s1', 4]], drawers: [['f:d1', 3, '서랍'], ['f:d2', 3, '서랍']], left: [['f:l1', 2], ['f:l2', 2]], right: [['f:r1', 2], ['f:r2', 2]] },
};
const keysOf = (rows) => rows.flatMap(([k, n]) => Array.from({ length: n }, (_, i) => `${k}:${i}`));
/** 실마다 칸 열쇠 (그리는 차례 — 고쳐 읽기도 이 차례로) */
export const SLOT_KEYS = {
  cold: keysOf([...FRIDGE.cold.shelves, FRIDGE.cold.drawer, ...FRIDGE.cold.pockets]),
  frozen: keysOf([...FRIDGE.frozen.shelves, ...FRIDGE.frozen.drawers, ...FRIDGE.frozen.left, ...FRIDGE.frozen.right]),
};
/** 실마다 가질 수 있는 음식 수 = 칸 수 */
export const CAP = { cold: SLOT_KEYS.cold.length, frozen: SLOT_KEYS.frozen.length };

const FOOD_BY = {};
for (const f of FOODS) FOOD_BY[f.id] = f;
const SLOT_ZONE = {};
for (const z of Object.keys(SLOT_KEYS)) for (const k of SLOT_KEYS[z]) SLOT_ZONE[k] = z;
const own = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
const isObj = (o) => !!o && typeof o === 'object' && !Array.isArray(o);

/** 음식 정의 (없으면 null) */
export function foodById(id) {
  return typeof id === 'string' && own(FOOD_BY, id) ? FOOD_BY[id] : null;
}
/** 칸이 어느 실인가 (모르는 칸이면 null) */
export function slotZone(key) {
  return typeof key === 'string' && own(SLOT_ZONE, key) ? SLOT_ZONE[key] : null;
}
/** 가진 수 (가방) */
export function foodOwned(items, id) {
  const n = Number(isObj(items) && items[id]) || 0;
  return n > 0 ? Math.floor(n) : 0;
}

/**
 * 고쳐 읽은 냉장고 안 (순수 · 새 객체) — 칸 차례대로: 모르는 칸 · 모르는 음식 · 실이 안 맞음 · 가진 수보다 많이 넣음은 뺀다.
 * items = 가방(profile.items) · 비면 {}
 */
export function fridgeCopy(raw, items) {
  const out = {};
  if (!isObj(raw)) return out;
  const used = {};
  for (const z of Object.keys(SLOT_KEYS)) {
    for (const k of SLOT_KEYS[z]) {
      if (!own(raw, k)) continue;
      const f = foodById(raw[k]);
      if (!f || f.zone !== z) continue;
      if ((used[f.id] || 0) >= foodOwned(items, f.id)) continue;
      used[f.id] = (used[f.id] || 0) + 1;
      out[k] = f.id;
    }
  }
  return out;
}

/** 🧺 내 음식 (순수) — { 음식 id: 가진 수 − 넣은 수 } (0개는 뺀다) · fridge = fridgeCopy 결과 */
export function foodTray(items, fridge) {
  const placed = {};
  for (const id of Object.values(fridge || {})) placed[id] = (placed[id] || 0) + 1;
  const out = {};
  for (const f of FOODS) {
    const n = foodOwned(items, f.id) - (placed[f.id] || 0);
    if (n > 0) out[f.id] = n;
  }
  return out;
}

/** 그 실에 넣을 음식을 모두 몇 개 가졌나 (넣은 것 + 바구니) — 칸 수(CAP)까지만 산다 */
export function zoneOwned(items, zone) {
  let n = 0;
  for (const f of FOODS) if (f.zone === zone) n += foodOwned(items, f.id);
  return n;
}
