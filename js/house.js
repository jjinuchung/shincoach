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
//  ⑦ 📐 평수 넓히기(바닥 8 × 6 → 10 × 7, 한 번) → 그 뒤에 🏗️ 2층 올리기(방 하나 더 · 한 가지 가구 6개까지) — 차례대로
// 저장 모양:
//  · 가진 가구·벽지·바닥 = profile.items['f_…'·'w_…'·'fl_…'] — 코인과 같은 가방이라 백업 병합에서 같은 쪽("최근 쪽")을 따른다
//    (코인은 냈는데 가구가 없다·가구가 복제됐다가 안 생긴다). ★ ITEMS 등록부(items.js)에는 넣지 않는다 —
//    🎁 레벨업 상자·🏪 5일장 팔기·📦 구호품·볼·물약 목록이 itemById·종류로 거르므로 가구가 섞이지 않는다 (tests/house.test.js가 확인)
//  · 놓은 자리 = profile.house { started, seq, rooms: [{ id, wall, floor, items: [{ u, id, x, y, f }] }] }
//    u = 놓을 때 붙는 번호(seq) · x, y = 바닥 칸(왼쪽 위 0, 0 — 벽 물건은 y 0) · f = 좌우 뒤집음 1
//    놓은 수 ≤ 가진 수 · 겹치지 않음 · 방 안 — houseOf()가 읽을 때마다 고쳐서 돌려준다(백업 병합·옛 기록으로 어긋나도)
//  · 넓히기 = profile.items['x_wide'·'x_floor2'] 1 — 가구처럼 코인과 같은 가방(같은 쪽). 방 크기·방 수·가구 한도는
//    houseShape()가 가방에서 셈한다(따로 저장하지 않는다) — 넓히기가 없는 쪽으로 합쳐지면 넓힌 칸·2층의 가구는 서랍으로

/** 방 크기 — 바닥 W × H칸, 벽 WALL칸 */
export const ROOM = { W: 8, H: 6, WALL: 8 };
/** 📐 평수를 넓힌 방 크기 (1층·2층 같음 — 집 한 채의 넓이) */
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
/** 놓는 번호의 끝 — 번호(seq·u)가 이보다 크거나 안전한 정수가 아니면 읽을 때 1부터 다시 매긴다
 *  (Codex 45차 #3: 깨진 백업의 아주 큰 번호로 두 번 놓으면 둘 다 "놓았어요"인데 번호가 겹쳐 하나가 사라졌다) */
export const SEQ_MAX = 1e9;
const isHouseObj = (h) => !!h && typeof h === 'object' && !Array.isArray(h);

/**
 * 가구 — id는 'f_'로 시작 · w = 차지하는 칸(가로) · at = 'floor' 바닥 | 'wall' 벽 · group = small 소품 | furn 가구 | device 기기
 * 그림은 이모지 하나(파일·저작권 없음, 오프라인). 태블릿 글꼴 때문에 Emoji 12 이하만 (🪑 12 · 🧸 11 · 나머지 1.0)
 */
export const FURN = [
  // 소품 — 하루 공부로 1~2개
  { id: 'f_teddy', emoji: '🧸', ko: '곰인형', w: 1, at: 'floor', price: 150, group: 'small' },
  { id: 'f_books', emoji: '📚', ko: '책 더미', w: 1, at: 'floor', price: 150, group: 'small' },
  { id: 'f_flower', emoji: '🌻', ko: '해바라기 화분', w: 1, at: 'floor', price: 150, group: 'small' },
  { id: 'f_frame', emoji: '🖼️', ko: '액자', w: 1, at: 'wall', price: 200, group: 'small' },
  { id: 'f_clock', emoji: '🕰️', ko: '시계', w: 1, at: 'wall', price: 200, group: 'small' },
  { id: 'f_lamp', emoji: '💡', ko: '전등', w: 1, at: 'wall', price: 200, group: 'small' },
  // 가구 — 2~3일
  { id: 'f_chair', emoji: '🪑', ko: '의자', w: 1, at: 'floor', price: 500, group: 'furn' },
  { id: 'f_drawer', emoji: '🗄️', ko: '서랍장', w: 1, at: 'floor', price: 700, group: 'furn' },
  { id: 'f_bed', emoji: '🛏️', ko: '침대', w: 2, at: 'floor', price: 1000, group: 'furn' },
  { id: 'f_sofa', emoji: '🛋️', ko: '소파', w: 2, at: 'floor', price: 1000, group: 'furn' },
  // 기기 — 1~2주 + 스톤 (코인만으로는 못 산다) · 🔷는 MATH_RATE배 (아버님 ⑥)
  { id: 'f_tv', emoji: '📺', ko: 'TV', w: 1, at: 'floor', price: 2500, stones: st(1, 1), group: 'device' },
  { id: 'f_game', emoji: '🎮', ko: '게임기', w: 1, at: 'floor', price: 3000, stones: st(2, 1), group: 'device' },
  { id: 'f_pc', emoji: '💻', ko: '컴퓨터', w: 1, at: 'floor', price: 3000, stones: st(1, 2), group: 'device' },
  { id: 'f_piano', emoji: '🎹', ko: '피아노', w: 2, at: 'floor', price: 3500, stones: st(2, 2), group: 'device' },
];

/**
 * 🏗️ 집 넓히기 — id는 'x_' · 한 번씩만 산다 · after = 먼저 있어야 하는 넓히기 (아버님 ⑤⑦)
 * 값은 기기보다 훨씬 크게: 코인은 2~3주·한 달쯤, 스톤은 두 과목이 같은 노력(st(n, n)) — 🔶가 모자라면 영어를, 🔷가 모자라면 수학을
 */
export const GROW = [
  { id: 'x_wide', emoji: '📐', ko: '평수 넓히기', price: 4000, stones: st(15, 15), what: `방 바닥이 가로 ${ROOM_WIDE.W} × 세로 ${ROOM_WIDE.H}칸으로 넓어져요` },
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

/**
 * 지금 집의 모양 (순수) — 가방의 넓히기에서 셈한다: 방 크기(size) · 있는 방(rooms) · 한 가지 가구 한도(max).
 * 화면·규칙·고쳐 읽기가 모두 이것 하나로 — 새 객체라 고쳐도 상수는 안 바뀐다
 */
export function houseShape(profile) {
  const wide = ownedOf(profile, 'x_wide') > 0;
  const two = ownedOf(profile, 'x_floor2') > 0;
  return { size: { ...(wide ? ROOM_WIDE : ROOM) }, rooms: two ? [FIRST_ROOM, SECOND_ROOM] : [FIRST_ROOM], max: two ? FURN_MAX_2F : FURN_MAX };
}

const emptyRoom = (id) => ({ id, wall: '', floor: '', items: [] });
/** 빈 집 — 방 하나 */
export function emptyHouse() {
  return { started: false, seq: 0, rooms: [emptyRoom(FIRST_ROOM)] };
}

/** 그 가구가 차지하는 칸 열쇠 — 바닥 "x,y" · 벽 "w:x" */
function cellsOf(def, x, y) {
  const out = [];
  for (let i = 0; i < def.w; i++) out.push(def.at === 'wall' ? `w:${x + i}` : `${x + i},${y}`);
  return out;
}
/** 방 안인가 — 바닥은 0 ≤ x, x + w ≤ W, 0 ≤ y < H · 벽은 y 0, x + w ≤ WALL (size = houseShape().size) */
function inRoom(size, def, x, y) {
  if (!Number.isInteger(x) || !Number.isInteger(y)) return false;
  if (def.at === 'wall') return y === 0 && x >= 0 && x + def.w <= size.WALL;
  return x >= 0 && y >= 0 && x + def.w <= size.W && y < size.H;
}
/** 방에서 차지한 칸 (skipU는 빼고 — 옮길 때 제자리와 겹쳐도 되게) */
function takenCells(room, skipU) {
  const set = new Set();
  for (const it of room.items) {
    if (it.u === skipU) continue;
    const d = furnById(it.id);
    if (d) for (const c of cellsOf(d, it.x, it.y)) set.add(c);
  }
  return set;
}
/** 그 자리에 놓을 수 있나 — 방 안이고 다른 가구와 겹치지 않으면 (화면이 끄는 동안 빨갛게 보일지 정할 때도 쓴다)
 *  size는 맨 앞 — 넓힌 집에서 크기를 빠뜨리면 조용히 8 × 6으로 재지 않고 바로 틀리게 */
export function canPlace(size, room, id, x, y, skipU) {
  const d = furnById(id);
  if (!d || !room || !size || !inRoom(size, d, x, y)) return false;
  const taken = takenCells(room, skipU);
  return cellsOf(d, x, y).every((c) => !taken.has(c));
}

/**
 * 고쳐 읽은 집 (새 객체 — 입력은 안 바꾼다). 백업 병합·옛 기록·다른 창으로 어긋난 것을 여기서 고친다:
 * 집이 객체가 아님(빈 집) · 지금 그리지 않는 방(그 가구는 서랍으로) · 모르는 가구·방 밖·겹침(먼저 놓은 것이 남음) ·
 * 가진 수보다 많이 놓음(나중에 놓은 것부터 뺌) · 같은 번호 · 안 가진 벽지·바닥(처음 것으로) · 깨진 번호(1부터 다시)
 */
export function houseOf(profile) {
  const src = profile && isHouseObj(profile.house) ? profile.house : null;
  const shape = houseShape(profile);
  const out = { ...emptyHouse(), rooms: shape.rooms.map(emptyRoom) };
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
    const room = emptyRoom(r.id);
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
  for (const { k, it } of all) {
    const room = out.rooms[k];
    if (uSeen.has(it.u)) continue;
    const d = furnById(it.id);
    if (!d) continue;
    if ((placed[it.id] || 0) >= ownedOf(profile, it.id)) continue;
    if (!canPlace(shape.size, room, it.id, it.x, it.y)) continue;
    uSeen.add(it.u);
    placed[it.id] = (placed[it.id] || 0) + 1;
    if (!(Number.isSafeInteger(it.u) && it.u <= SEQ_MAX)) renumber = true;
    else seq = Math.max(seq, it.u);
    room.items.push({ u: it.u, id: it.id, x: it.x, y: it.y, f: it.f ? 1 : 0 });
  }
  if (renumber) {
    // 놓은 차례(번호 순서)는 그대로 두고 1부터 — 늘 같은 결과라 다시 읽어도 번호가 같다
    const all = out.rooms.flatMap((r) => r.items).sort((a, b) => a.u - b.u);
    all.forEach((it, i) => { it.u = i + 1; });
    seq = all.length;
  }
  out.seq = seq;
  return out;
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
 * why 'order' = 먼저 있어야 하는 넓히기가 없다(need에 그 id) — 🏗️ 2층은 📐 평수를 넓힌 뒤에
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
  if (furn && have >= houseShape(profile).max) return { ok: false, why: 'max', have };
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
  room.items.push({ u: h.seq, id, x, y, f: 0 });
  profile.house = h;
  return { ok: true, u: h.seq };
}

/** 놓인 가구 옮기기 — why: 'room' · 'gone' 그 가구가 없음(다른 창에서 서랍에 넣음) · 'spot' */
export function moveRule(profile, roomId, u, x, y) {
  const h = houseOf(profile);
  const room = roomIn(h, roomId);
  if (!room) return { ok: false, why: 'room' };
  const it = room.items.find((i) => i.u === u);
  if (!it) return { ok: false, why: 'gone' };
  if (!canPlace(houseShape(profile).size, room, it.id, x, y, u)) return { ok: false, why: 'spot' };
  it.x = x;
  it.y = y;
  profile.house = h;
  return { ok: true };
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

/** 📦 서랍에 넣기 (가진 수는 그대로 — 다시 꺼내 놓을 수 있다) */
export function storeRule(profile, roomId, u) {
  const h = houseOf(profile);
  const room = roomIn(h, roomId);
  if (!room) return { ok: false, why: 'room' };
  const k = room.items.findIndex((i) => i.u === u);
  if (k < 0) return { ok: false, why: 'gone' };
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
