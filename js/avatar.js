// 🧑 진우 캐릭터 1단계 (2026-10-17, 아버님 "진행해") — 큰 그림 5 "진우 캐릭터"의 첫걸음: 내 모습 만들기 · 옷장 · 방에 서기 · 🤝 파트너와 함께
// 이 파일 = 고를 것(모습·옷)의 목록. 규칙은 다음 단계에서 이 파일에 더한다 — 순수 함수만(node 시험에서 그대로 돈다). 그림은 avatarart.js(SVG 글자).
//
// 아버님 결정(기본안 "진행해"):
//  ① 그림은 코드로 그린 2등신 인형(SVG) — 그림 파일·저작권 없음 · 공식 트레이너 옷·로고는 따라 하지 않는다
//  ② 처음 만들기는 무료: 피부색 4 · 머리 모양 4 · 머리색 5 · 눈 3 · 기본 윗옷 3색 · 바지 3색 — 언제든 무료로 다시 바꾼다
//  ③ 👕 옷 가게: 윗옷 무늬 💰300~500 · 모자 💰400~600 · 신발·가방 💰400~800 · ✨ 특별한 옷 셋은 💰 + 🔷·🔶(집 기기처럼 공부로만)
//  ④ 가구처럼 두 번 눌러 사고 되팔지 않는다 · 산 옷은 몇 번이든 무료로 갈아입는다 · 🎁 처음 만들면 첫 운동화 하나
//  ⑤ 아이 화면에 모은 수·남은 수 셈은 없다
// 🧢 v293 (2026-10-18 아버님 "포켓몬 주인공처럼" → 지우(애니) 느낌 · 처음부터 무료 · 진우가 직접 입게):
//  트레이너 모자·조끼·손가락 장갑·배낭을 free로 · 장갑 칸(gloves) 새로 · OUTFITS "한 번에 입기"는 진우가 누를 때만(앱이 모습을 바꾸지 않는다)
//  모자 앞 무늬는 아버님 "만화에 있는 무늬 중 하나로 · 여러 무늬를 사게" → 무늬 그림은 공개 저장소에 두지 않고 비공개 저장소에서 받는다(hatmarks.js · avatarart 「지우 모자 무늬」)
import { houseOf, houseShape, takenCells } from './house.js'; // 🏠 서 있을 빈 칸 (순수 — house.js는 avatar.js를 import하지 않는다)

/** 피부색 */
export const SKINS = [
  { id: 's1', ko: '밝은 살구색', color: '#fde2cc' },
  { id: 's2', ko: '살구색', color: '#f4c9a0' },
  { id: 's3', ko: '밀색', color: '#dea576' },
  { id: 's4', ko: '갈색', color: '#ad7148' },
];
/** 머리 모양 */
export const HAIRS = [
  { id: 'short', ko: '짧은 머리' },
  { id: 'spiky', ko: '삐죽 머리' },
  { id: 'bowl', ko: '바가지 머리' },
  { id: 'side', ko: '옆가르마' },
];
/** 머리색 */
export const HAIR_COLORS = [
  { id: 'black', ko: '검은색', color: '#2b2522' },
  { id: 'brown', ko: '갈색', color: '#6b4428' },
  { id: 'chestnut', ko: '밤색', color: '#9c5530' },
  { id: 'gold', ko: '노란색', color: '#e8bd3f' },
  { id: 'blue', ko: '파란색', color: '#3d6fd6' },
];
/** 눈 */
export const EYES = [
  { id: 'dot', ko: '동그란 눈' },
  { id: 'smile', ko: '웃는 눈' },
  { id: 'shine', ko: '반짝이는 눈' },
];

/** 입는 곳 — 그리는 차례와는 다르다(그림은 avatarart.js) */
export const SLOTS = ['top', 'bottom', 'shoes', 'gloves', 'hat', 'bag', 'cape'];
/** 입는 곳 이름 */
export const SLOT_KO = { top: '윗옷', bottom: '바지', shoes: '신발', gloves: '장갑', hat: '모자', bag: '가방', cape: '망토' };
/** 비워 둘 수 있는 곳(안 입어도 된다) — 윗옷·바지·신발은 늘 하나 */
export const SLOT_EMPTY_OK = ['gloves', 'hat', 'bag', 'cape'];

/** 집 값과 같은 꼴의 스톤 — 🔷는 MATH_RATE(house.js 5)배: 🔷가 🔶보다 훨씬 쉽게 모인다(아버님 집 넓히기 결정과 같게) */
const st = (m, e) => ({ stone_math: m * 5, stone_english: e });

/**
 * 입을 것 — id는 'a_' · slot 입는 곳 · free 처음부터 있음(가방에 없어도) · gift 🎁 처음 만들면 받는 것(가게에서도 산다) ·
 * price 💰 · stones 스톤 · special ✨ · art 그림 칸(avatarart.js가 읽는다: color 바탕 · ink 무늬·띠 · pattern 무늬)
 */
export const WEAR = [
  // 처음부터 (무료)
  { id: 'a_top_red', slot: 'top', ko: '빨간 티셔츠', free: true, art: { color: '#e5484d' } },
  { id: 'a_top_blue', slot: 'top', ko: '파란 티셔츠', free: true, art: { color: '#3b82f6' } },
  { id: 'a_top_green', slot: 'top', ko: '초록 티셔츠', free: true, art: { color: '#22a06b' } },
  { id: 'a_bot_navy', slot: 'bottom', ko: '남색 바지', free: true, art: { color: '#2c3e66' } },
  { id: 'a_bot_jean', slot: 'bottom', ko: '청바지', free: true, art: { color: '#4f7cc2' } },
  { id: 'a_bot_beige', slot: 'bottom', ko: '베이지 바지', free: true, art: { color: '#c9b48a' } },
  { id: 'a_shoe_basic', slot: 'shoes', ko: '기본 신발', free: true, art: { color: '#8b909a' } },
  // 🧢 트레이너 차림 (v293 — 처음부터 무료 · 지우 느낌의 색과 모양 · mark 모자 앞 무늬 · trim 깃·소매 띠)
  { id: 'a_hat_trainer', slot: 'hat', ko: '관동 모자', free: true, art: { kind: 'ash', color: '#cc3a30', panel: '#f0f2ee', button: '#cc3a30', mark: 'kanto' } },
  { id: 'a_top_trainer', slot: 'top', ko: '트레이너 조끼', free: true, art: { color: '#26292f', ink: '#2f6fd6', trim: '#ffffff', pattern: 'vest' } },
  { id: 'a_glove_green', slot: 'gloves', ko: '손가락 장갑', free: true, art: { color: '#22a06b', ink: '#157a50' } },
  { id: 'a_bag_trainer', slot: 'bag', ko: '트레이너 배낭', free: true, art: { color: '#3f9a5b', ink: '#2c6e41' } },
  // 🎁 첫 선물 (가게에서도 산다)
  { id: 'a_shoe_run', slot: 'shoes', ko: '빨간 운동화', price: 400, gift: true, art: { color: '#ffffff', ink: '#e5484d' } },
  // 👕 옷 가게
  { id: 'a_top_stripe', slot: 'top', ko: '줄무늬 티셔츠', price: 300, art: { color: '#ffffff', ink: '#2c5fd6', pattern: 'stripe' } },
  { id: 'a_top_star', slot: 'top', ko: '별 티셔츠', price: 400, art: { color: '#24304f', ink: '#ffd23f', pattern: 'star' } },
  { id: 'a_top_dots', slot: 'top', ko: '물방울 티셔츠', price: 400, art: { color: '#ff8fb1', ink: '#ffffff', pattern: 'dots' } },
  { id: 'a_top_bolt', slot: 'top', ko: '번개 티셔츠', price: 500, art: { color: '#ffd23f', ink: '#24304f', pattern: 'bolt' } },
  { id: 'a_hat_beanie', slot: 'hat', ko: '털모자', price: 400, art: { color: '#22a06b', ink: '#ffffff' } },
  { id: 'a_hat_cap', slot: 'hat', ko: '야구모자', price: 500, art: { color: '#e5484d', ink: '#ffffff' } },
  { id: 'a_hat_straw', slot: 'hat', ko: '밀짚모자', price: 600, art: { color: '#e9c46a', ink: '#e5484d' } },
  { id: 'a_shoe_boots', slot: 'shoes', ko: '장화', price: 400, art: { color: '#ffd23f', ink: '#c99a00' } },
  { id: 'a_bag_back', slot: 'bag', ko: '배낭', price: 700, art: { color: '#f08c00', ink: '#b35f00' } },
  // 🧢 지우 모자 — 시리즈마다 하나 (v293 · 관동 모자는 처음부터) · 색은 애니 캡처·공식 아트에서 잰 값 · 무늬는 이름만(그림은 비공개 저장소)
  { id: 'a_hat_hoenn', slot: 'hat', ko: '호연 모자', price: 600, art: { kind: 'ash', color: '#cc4b40', panel: '#433f47', button: '#433f47', mark: 'hoenn' } },
  { id: 'a_hat_sinnoh', slot: 'hat', ko: '신오 모자', price: 600, art: { kind: 'ash', color: '#cc4b40', panel: '#433f49', panelShape: 'wide', button: '#433f49', mark: 'sinnoh' } },
  { id: 'a_hat_unova', slot: 'hat', ko: '하나 모자', price: 600, art: { kind: 'ash', color: '#cc4b40', panel: '#e4f4f0', button: '#cc4b40', mark: 'unova' } },
  { id: 'a_hat_kalos', slot: 'hat', ko: '칼로스 모자', price: 600, art: { kind: 'ash', color: '#dc543c', bill: '#e6eef2', button: '#dc543c', mark: 'kalos' } },
  { id: 'a_hat_alola', slot: 'hat', ko: '알로라 모자', price: 600, art: { kind: 'ash', color: '#d9504a', bill: '#f4f6f8', billEdge: '#3a7cc6', button: '#d9504a', mark: 'alola' } },
  { id: 'a_hat_world', slot: 'hat', ko: '월드 모자', price: 600, art: { kind: 'ash', color: '#e0504a', bill: '#eeeeee', button: '#e0504a', mark: 'world' } },
  // ✨ 특별한 옷 — 💰 + 🔷·🔶 (집 기기처럼 "제대로 배웠나"에서만 나오는 스톤)
  { id: 'a_cape', slot: 'cape', ko: '영웅 망토', price: 2000, stones: st(1, 1), special: true, art: { color: '#7c3aed', ink: '#facc15' } },
  { id: 'a_top_galaxy', slot: 'top', ko: '별빛 티셔츠', price: 2000, stones: st(2, 1), special: true, art: { color: '#1e1b4b', ink: '#fde68a', pattern: 'galaxy' } },
  { id: 'a_crown', slot: 'hat', ko: '왕관', price: 2500, stones: st(1, 2), special: true, art: { color: '#facc15', ink: '#ef4444' } },
  // 🎣 낚시 채비 가게에서만 파는 옷 (v368 · lake — 👕 옷 가게 목록엔 안 나옴 · 사면 옷장에서 입는다)
  { id: 'a_hat_fish', slot: 'hat', ko: '낚시 모자', price: 300, lake: true, art: { color: '#7d8a4e', ink: '#5b6638' } },
  { id: 'a_top_fishvest', slot: 'top', ko: '낚시 조끼', price: 300, lake: true, art: { color: '#e9e4d4', ink: '#6f7a45', trim: '#d8c48a', pattern: 'vest', pockets: '#55602f' } },
];

const by = (list) => Object.fromEntries(list.map((x) => [x.id, x]));
const SKIN_BY = by(SKINS);
const HAIR_BY = by(HAIRS);
const HAIR_COLOR_BY = by(HAIR_COLORS);
const EYES_BY = by(EYES);
const WEAR_BY = by(WEAR);
const own = (o, k) => Object.prototype.hasOwnProperty.call(o, k);

/** 입을 것 정의 (없으면 null) */
export function wearById(id) {
  return typeof id === 'string' && own(WEAR_BY, id) ? WEAR_BY[id] : null;
}
/** 처음 모습 — 만들기 화면이 여기서 시작한다 */
export const LOOK_BASE = Object.freeze({ skin: 's2', hair: 'short', hairColor: 'black', eyes: 'dot', top: 'a_top_blue', bottom: 'a_bot_navy', shoes: 'a_shoe_basic', gloves: '', hat: '', bag: '', cape: '' });

/**
 * 🧢 한 번에 입기 (v293) — 칸마다 입을 옷 · 배열이면 가진 것 중 앞의 것(빨간 운동화가 없으면 기본 신발) · ''는 벗기(망토).
 * 머리·피부·눈은 건드리지 않는다 — 진우가 만든 얼굴 그대로 옷만
 */
export const OUTFITS = [
  { id: 'trainer', ko: '트레이너 차림', emoji: '🧢', wear: { top: 'a_top_trainer', bottom: 'a_bot_jean', shoes: ['a_shoe_run', 'a_shoe_basic'], gloves: 'a_glove_green', hat: 'a_hat_trainer', bag: 'a_bag_trainer', cape: '' } },
];

/**
 * 그릴 모습 (순수 · 새 객체) — 모르는 값은 처음 모습으로, 입는 곳이 다른 옷은 빼고. 가졌는지는 보지 않는다(그림만 — 가졌는지는 규칙이 본다).
 * 그림 시안·방·옷장이 모두 이것으로 그린다
 */
export function lookOf(raw) {
  const r = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  const pick = (k, table) => (typeof r[k] === 'string' && own(table, r[k]) ? r[k] : LOOK_BASE[k]);
  const out = { skin: pick('skin', SKIN_BY), hair: pick('hair', HAIR_BY), hairColor: pick('hairColor', HAIR_COLOR_BY), eyes: pick('eyes', EYES_BY) };
  for (const slot of SLOTS) {
    const w = wearById(r[slot]);
    out[slot] = w && w.slot === slot ? w.id : SLOT_EMPTY_OK.includes(slot) && r[slot] === '' ? '' : LOOK_BASE[slot];
  }
  return out;
}
/** 피부·머리색 정의 (그림용) */
export function skinById(id) { return own(SKIN_BY, id) ? SKIN_BY[id] : SKIN_BY[LOOK_BASE.skin]; }
export function hairColorById(id) { return own(HAIR_COLOR_BY, id) ? HAIR_COLOR_BY[id] : HAIR_COLOR_BY[LOOK_BASE.hairColor]; }

// ───────────────────── 저장 · 고쳐 읽기 · 규칙 (순수 — db.mutateProfile 안에서 돈다, 부르는 곳은 xp.houseDo) ─────────────────────
// 저장 모양:
//  · 산 옷 = profile.items['a_…'] 1 — 가구처럼 코인과 같은 가방(백업 병합에서 같은 쪽 · "냈는데 없다·복제"가 없게).
//    ★ ITEMS 등록부(items.js)에는 넣지 않는다 — 🎁 상자·🏪 5일장 팔기·📦 구호품이 itemById로 거르므로 옷이 섞이지 않는다(시험이 확인)
//  · 모습 = profile.avatar { made, gifted, look, name, spot: { room, x, y }, at }
//    made 만들었나 · gifted 🎁 첫 운동화를 받았나(둘 다 병합에서 OR — 옛 백업이 "아직"으로 되돌려 선물을 또 받지 않게) ·
//    look·name·spot은 되돌릴 수 있는 상태라 **바꾼 시각 at이 나중인 쪽**을 따른다(메모 profile-merge-invariants) ·
//    at은 누를 때마다 앞으로만(같은 ms여도 +1) — 두 창이 같은 시각에 바꿔도 나중 것이 이긴다
//  · 읽을 때마다 avatarOf()가 고친다: 모르는 모습은 처음 것 · 안 가진 옷은 벗김(기본 옷) · 이름은 8자까지 ·
//    서 있는 칸이 방 밖이거나 가구에 덮였으면 가까운 빈 칸으로(가구가 캐릭터 칸을 막지 않는다 — 놓으면 캐릭터가 비켜 선다)

/** 이름표 글자 수 */
export const NAME_MAX = 8;
/** 🎁 처음 만들면 받는 옷 */
export const MAKE_GIFT = 'a_shoe_run';

const isObj = (o) => !!o && typeof o === 'object' && !Array.isArray(o);
const ownedOf = (profile, id) => {
  const n = Number(profile && isObj(profile.items) && profile.items[id]) || 0;
  return n > 0 ? Math.floor(n) : 0;
};
/** 입을 수 있나 — 처음부터 있는 옷이거나 가방에 있으면 */
export function canWear(profile, id) {
  const w = wearById(id);
  return !!w && (!!w.free || ownedOf(profile, id) > 0);
}
/** 🧢 한 번에 입기의 바꿀 칸 (순수 · v293) — 모르는 차림이면 null · 칸마다 입을 수 있는 첫 옷(아무것도 못 입으면 그 칸은 그대로) · ''는 벗기 */
export function outfitPatch(profile, id) {
  const o = OUTFITS.find((x) => x.id === id);
  if (!o) return null;
  const patch = {};
  for (const slot of SLOTS) {
    if (!own(o.wear, slot)) continue;
    const want = o.wear[slot];
    if (want === '') { patch[slot] = ''; continue; }
    const pick = (Array.isArray(want) ? want : [want]).find((w) => canWear(profile, w));
    if (pick) patch[slot] = pick;
  }
  return patch;
}
/** 지금 그 차림을 다 입고 있나 — 옷장이 단추를 숨긴다 */
export function wearingOutfit(profile, look, id) {
  const p = outfitPatch(profile, id);
  return !!p && Object.keys(p).every((k) => (look && look[k] ? look[k] : '') === p[k]);
}
/**
 * 🧢 한 번에 입기 (규칙 · 🔍 Codex 99차 #1) — 입힐 옷은 저장하는 순간의 프로필로 고른다(그린 때와 운동화가 달라도 차림 전체가 입혀지게).
 * why: 'unknown' 모르는 차림 · 그 밖은 avatarLookRule('made' 등)
 */
export function outfitRule(profile, id, now) {
  const patch = outfitPatch(profile, id);
  if (!patch) return { ok: false, why: 'unknown' };
  return avatarLookRule(profile, patch, now);
}
/** 이름표 고쳐 읽기 — 글자만 · 앞뒤 빈칸 없이 · NAME_MAX자까지 (그림 글자도 한 자) */
export function nameOf(raw) {
  if (typeof raw !== 'string') return '';
  // eslint-disable-next-line no-control-regex
  const s = raw.replace(/[\u0000-\u001f\u007f<>]/g, '').trim();
  return Array.from(s).slice(0, NAME_MAX).join('');
}
/** 바꾼 시각 — 안전한 양의 정수만 (깨진 1e300이 영영 이기지 않게) */
const atOf = (v) => (Number.isSafeInteger(v) && v > 0 ? v : 0);

/** 그 방에서 캐릭터가 설 수 있는 빈 바닥 칸인가 (가구 칸이 아니고 방 안) */
function freeCell(size, room, x, y) {
  if (!Number.isInteger(x) || !Number.isInteger(y) || x < 0 || y < 0 || x >= size.W || y >= size.H) return false;
  return !takenCells(room).has(`${x},${y}`);
}
/** (x, y)에서 가장 가까운 빈 칸 — 거리(가로 + 세로)가 같으면 위·왼쪽 먼저 · 없으면 null */
function nearestFree(size, room, x, y) {
  let best = null;
  for (let yy = 0; yy < size.H; yy++) {
    for (let xx = 0; xx < size.W; xx++) {
      if (!freeCell(size, room, xx, yy)) continue;
      const d = Math.abs(xx - x) + Math.abs(yy - y);
      if (!best || d < best.d) best = { x: xx, y: yy, d };
    }
  }
  return best ? { x: best.x, y: best.y } : null;
}

/**
 * 고쳐 읽은 캐릭터 (새 객체 — 입력은 안 바꾼다) — 화면·규칙이 모두 이것으로.
 * made가 아니면 look은 처음 모습(만들기 화면이 여기서 시작) · spot은 null
 */
export function avatarOf(profile) {
  const a = profile && isObj(profile.avatar) ? profile.avatar : {};
  const made = !!a.made;
  const look = lookOf(a.look);
  for (const slot of SLOTS) if (look[slot] && !canWear(profile, look[slot])) look[slot] = SLOT_EMPTY_OK.includes(slot) ? '' : LOOK_BASE[slot];
  const out = { made, gifted: !!a.gifted, look, name: nameOf(a.name), spot: null, at: atOf(a.at) };
  if (!made) return out;
  const h = houseOf(profile);
  const size = houseShape(profile).size;
  const s = isObj(a.spot) ? a.spot : {};
  const room = h.rooms.find((r) => r.id === s.room) || h.rooms[0];
  const mid = { x: Math.floor(size.W / 2), y: Math.floor(size.H / 2) };
  const want = room.id === s.room && Number.isInteger(s.x) && Number.isInteger(s.y) ? { x: s.x, y: s.y } : mid;
  // 서 있던 방에서 가장 가까운 빈 칸 → 그 방이 꽉 찼으면 다른 층 가운데에서 가까운 빈 칸 (1층이 꽉 차도 빈 2층에 선다 — Codex 90차 #1)
  for (const r of [room, ...h.rooms.filter((x) => x !== room)]) {
    const from = r === room ? want : mid;
    const at = freeCell(size, r, from.x, from.y) ? from : nearestFree(size, r, from.x, from.y);
    if (at) { out.spot = { room: r.id, x: at.x, y: at.y }; break; }
  }
  return out;
}

/** 🤝 파트너가 설 칸 (순수) — 캐릭터 오른쪽 칸, 막혔으면 왼쪽 · 둘 다 막혔으면 null (spot = avatarOf().spot) */
export function partnerSpot(profile, spot) {
  if (!spot) return null;
  const h = houseOf(profile);
  const room = h.rooms.find((r) => r.id === spot.room);
  if (!room) return null;
  const size = houseShape(profile).size;
  for (const dx of [1, -1]) if (freeCell(size, room, spot.x + dx, spot.y)) return { room: room.id, x: spot.x + dx, y: spot.y };
  return null;
}

/** 저장할 캐릭터 (avatarOf 결과에서 at만 앞으로) */
function save(profile, a, now) {
  const at = Math.max(atOf(now), atOf(profile.avatar && profile.avatar.at) + 1);
  profile.avatar = { made: a.made, gifted: a.gifted, look: { ...a.look }, name: a.name, spot: a.spot ? { ...a.spot } : null, at };
  return at;
}
/** 고른 모습 맞춰 보기 — 모르는 것·입는 곳이 다른 옷은 why 'unknown', 안 가진 옷은 why 'none'(id) */
function checkLook(profile, raw) {
  if (!isObj(raw)) return { ok: false, why: 'unknown' };
  const look = lookOf(raw);
  for (const k of ['skin', 'hair', 'hairColor', 'eyes']) if (raw[k] !== undefined && raw[k] !== look[k]) return { ok: false, why: 'unknown' };
  for (const slot of SLOTS) {
    if (raw[slot] === undefined) continue;
    if (raw[slot] !== look[slot]) return { ok: false, why: 'unknown' };
    if (look[slot] && !canWear(profile, look[slot])) return { ok: false, why: 'none', id: look[slot] };
  }
  return { ok: true, look };
}

/**
 * 🧑 처음 만들기 — 한 번만 (두 창·백업 병합에서도: made·gifted는 OR) · 고른 모습 + 이름표 · 🎁 첫 운동화를 받아 바로 신는다 ·
 * 방 가운데 가까운 빈 칸에 선다. why: 'already' · 'unknown' · 'none'(처음엔 무료 옷만 있다)
 */
export function avatarMakeRule(profile, look, name, now) {
  const cur = avatarOf(profile);
  if (cur.made) return { ok: false, why: 'already' };
  const c = checkLook(profile, look);
  if (!c.ok) return c;
  const chosen = { ...c.look };
  let gift = '';
  if (!cur.gifted) {
    profile.items[MAKE_GIFT] = ownedOf(profile, MAKE_GIFT) + 1;
    chosen.shoes = MAKE_GIFT;
    gift = MAKE_GIFT;
  }
  // 서는 칸은 읽기(avatarOf)가 정한다 — 방 가운데에서 가장 가까운 빈 칸 · 바꾼 시각은 옛 at 다음부터
  const prevAt = atOf(profile.avatar && profile.avatar.at);
  profile.avatar = { made: true, gifted: true, look: chosen, name: nameOf(name), spot: null, at: prevAt };
  save(profile, avatarOf(profile), now);
  return { ok: true, gift };
}

/** 👕 갈아입기·모습 바꾸기 (무료) — look은 바꿀 칸만 줘도 된다. why: 'made' 아직 안 만듦 · 'unknown' · 'none'(id) 안 가진 옷 */
export function avatarLookRule(profile, look, now) {
  const cur = avatarOf(profile);
  if (!cur.made) return { ok: false, why: 'made' };
  const c = checkLook(profile, { ...cur.look, ...(isObj(look) ? look : {}) });
  if (!c.ok) return c;
  save(profile, { ...cur, look: c.look }, now);
  return { ok: true };
}

/** 📛 이름표 바꾸기 — 비워 두면 화면은 "나" */
export function avatarNameRule(profile, name, now) {
  const cur = avatarOf(profile);
  if (!cur.made) return { ok: false, why: 'made' };
  save(profile, { ...cur, name: nameOf(name) }, now);
  return { ok: true, name: nameOf(name) };
}

/** 🚶 방에서 옮기기 — 빈 바닥 칸으로만. why: 'made' · 'room' 그 방이 없음 · 'spot' 방 밖·가구 칸 */
export function avatarMoveRule(profile, roomId, x, y, now) {
  const cur = avatarOf(profile);
  if (!cur.made) return { ok: false, why: 'made' };
  const h = houseOf(profile);
  const room = h.rooms.find((r) => r.id === roomId);
  if (!room) return { ok: false, why: 'room' };
  if (!freeCell(houseShape(profile).size, room, x, y)) return { ok: false, why: 'spot' };
  save(profile, { ...cur, spot: { room: roomId, x, y } }, now);
  return { ok: true };
}

/** 값 — { coins, items: { 스톤id: 개수 } } (houseCost와 같은 꼴) */
export function wearCost(id) {
  const w = wearById(id);
  return { coins: (w && !w.free && w.price) || 0, items: { ...((w && w.stones) || {}) } };
}
/**
 * 살 수 있나 (순수) — 👕 옷 가게 화면과 사기 규칙이 같은 판정을 쓴다.
 * why: 'unknown' 파는 옷이 아님(처음부터 있는 옷 포함) · 'made' 캐릭터를 먼저 만들어야 · 'owned' 이미 있음(옷은 하나씩) · 'short'
 */
export function wearBuyCheck(profile, id) {
  const w = wearById(id);
  if (!w || w.free) return { ok: false, why: 'unknown' };
  if (!avatarOf(profile).made) return { ok: false, why: 'made' };
  if (ownedOf(profile, id) > 0) return { ok: false, why: 'owned' };
  const cost = wearCost(id);
  const shortCoins = Math.max(0, cost.coins - (Number(profile && profile.coins) || 0));
  const shortStones = {};
  for (const sid of Object.keys(cost.items)) {
    const s = cost.items[sid] - ownedOf(profile, sid);
    if (s > 0) shortStones[sid] = s;
  }
  if (shortCoins > 0 || Object.keys(shortStones).length) return { ok: false, why: 'short', shortCoins, shortStones };
  return { ok: true };
}
/** 👕 옷 사기 — 💰 + 스톤(저장된 가방으로 판정) · 사면 바로 입는다(wear false면 안 입음) · 되팔지 않는다 */
export function wearBuyRule(profile, id, now, wear = true) {
  const c = wearBuyCheck(profile, id);
  if (!c.ok) return { ok: false, why: c.why };
  const cost = wearCost(id);
  profile.coins = (Number(profile.coins) || 0) - cost.coins;
  for (const sid of Object.keys(cost.items)) {
    const n = ownedOf(profile, sid) - cost.items[sid];
    if (n > 0) profile.items[sid] = n; else delete profile.items[sid];
  }
  profile.items[id] = 1;
  if (wear) {
    const cur = avatarOf(profile);
    save(profile, { ...cur, look: { ...cur.look, [wearById(id).slot]: id } }, now);
  }
  return { ok: true };
}

/** 저장된 캐릭터 복사 (프로필 복사·병합용 — 안쪽 객체까지 새로) · 객체가 아니면 null */
export function copyAvatar(a) {
  if (!isObj(a)) return null;
  return { ...a, ...(isObj(a.look) ? { look: { ...a.look } } : {}), ...(isObj(a.spot) ? { spot: { ...a.spot } } : {}) };
}
/**
 * 백업 병합 (순수) — made·gifted는 OR · look·name·spot은 바꾼 시각(at)이 나중인 쪽(같으면 cur 쪽) · 깨진 쪽은 없는 것으로
 * (산 옷은 가방과 같은 쪽 — 안 가진 옷을 입은 모습이 이겨도 읽을 때 avatarOf가 벗긴다)
 */
export function mergeAvatar(cur, rec) {
  const a = copyAvatar(cur);
  const b = copyAvatar(rec);
  if (!a && !b) return null;
  if (!a || !b) return a || b;
  const win = atOf(b.at) > atOf(a.at) ? b : a;
  return { ...win, made: !!(a.made || b.made), gifted: !!(a.gifted || b.gifted), at: Math.max(atOf(a.at), atOf(b.at)) };
}
