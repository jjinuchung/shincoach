// 🎣 학습 낚시터 — 순수 규칙 (v366 · 2026-10-30 아버님 「진우가 낚시를 엄청 좋아해 — 학습을 도울 수 있게」 → 기본안 「물고기 16종으로 · 나머지 이대로」)
// 🎣 잉어킹 낚시(gamefish.js · 게임기 미니 게임)와는 따로인 새 놀이 — 하루 20분 저수지 나들이.
// 한 마리 = ① 찌 던지기 ② 기다리기(밑밥) ③ 입질·챔질 ④ 사투 ⑤ 뜰채 — 단계마다 네 과목(수학·영어·국어·논술) 「이미 배운 문제」 4지선다:
//   ① 맞히면 그날 열린 자리 중 가장 먼 곳(먼 곳일수록 큰 별 몫) · 틀리면 가까운 물가
//   ② 맞히면 큰 별 몫이 오름 · 물가 1문제, 수초 밭·깊은 곳 2문제 — 맞히든 틀리든 그 뒤엔 입질이 온다
//   ③ 찌가 쏙 들어가면 톡(늦으면 감점 없이 다시 입질) → 바늘 걸기 문제: 맞히면 깊이 걸림(장력이 덜 오름) · 틀리면 얕게(사투 문제 하나 더)
//   ④ 줄 장력·남은 거리(레퍼런스 ⑶) — 거리 표시점마다 문제 · 맞히면 몇 m 끌어옴 · 틀리면 조금 달아남 · **놓치지 않음**
//      장력이 꽉 차면 줄이 끊기는 대신 드랙이 풀려 멀어진다(아버님 기본안 「이대로」)
//   ⑤ 뜰채 3m → 0 — 맞힐 때마다 한 걸음 · 틀리면 그 자리(물러나지 않음)
// 문제에는 시간 제한이 없다 — 카드가 떠 있는 동안 물고기도 멈춘다(화면 쪽) · 같은 과목은 셋 넘게 내리 나오지 않는다
// 과목 비율: 그날 처음 들어올 때 지난 7일 기록(오늘 빼고)으로 한 번 — 덜 한 과목이 더 자주 · 한 과목 10%~50%
// 물고기 길이는 FishBase 최대·보통 길이(2026-10-30 확인)를 넘지 않게 · 무게는 길이로 어림(무게 = a × 길이³)
// v368 (2단계 ② 원고 「이대로」): 🏞️ 강 — 강 물고기 8종(home 'river') · 자리 셋(여울·바위 밑·깊은 소 — 열리는 수·별 몫은 저수지와 같다) ·
//   저수지의 강 물고기 넷(끄리·누치·쏘가리·강준치)은 강에서도 가끔(같은 별 안에서 몫 1 · 도감 칸은 저수지 쪽) · 저수지 도감 10종이면 열림 ·
//   📸 어름치(천연기념물)는 사진만 찍고 놓아줌(도감·💰는 다른 물고기와 같게) · 🎒 채비 가게(GEAR — 한 번 사면 계속 · 가방 items에 · 미끼만 같은 별 안에서 ×2 · 날씨와 곱해 최대 ×3) ·
//   고른 물가·미끼·낚싯대 색은 fishing.pick(바꾼 시각 at — 병합은 늦은 쪽)
// v369 (2단계 ③ 원고 「추천대로」): 🌊 바다 방파제 — 바다 물고기 9종(home 'sea' · 별마다 두 종 짝 — 미끼가 같은 별 안에서만 기울어서 감성돔 짝으로 농어) ·
//   자리 셋(방파제 안쪽·테트라포드·먼 바다) · 강 도감 6종이면 열림 · 🦐 크릴(감성돔·볼락 — 바다가 열린 뒤에 팖) · 루어는 바다에서 농어·조피볼락 ·
//   🏅 감성돔 40 cm 「4짜」 · 바다 날씨 줄(비·바람은 안전 한 줄) · 열릴 때 안전 한 줄(SEA_SAFE)
// ★ 이 파일은 아무것도 import하지 않는다 — 시험이 DOM·IndexedDB 없이 부른다 · 난수는 rng() 인자로

/** 하루 낚시 시간(분) · 손을 이만큼(ms) 안 대면 시간을 안 셈(⏳ 과목 시계와 같은 셈) */
export const FISH_DAY_MIN = 20;
export const FISH_IDLE_MS = 120000;
/** 별마다 사투 표시점 수 · 뜰채 걸음 수 (아버님 기본안 표 그대로) */
export const STARS = {
  1: { fight: 1, net: 1 },
  2: { fight: 2, net: 1 },
  3: { fight: 2, net: 2 },
  4: { fight: 3, net: 2 },
  5: { fight: 4, net: 3 },
};
/**
 * 저수지 물고기 16종 — key · 이름 · 별 · 길이 범위(cm, 전장) · 무게 계수 a(무게 g = a × cm³) · 같은 별 안에서 나오는 몫 · 외래종
 * 길이 끝은 FishBase 최대 길이 아래로(괄호 = 최대 · 보통): 참붕어(12.5·8) 납자루(13.1) 피라미(22.5·13) 블루길(41·19.1) 붕어(48·10) 떡붕어(35 SL)
 * 동자개(34.5) 끄리(44.4) 누치(67·33) 배스(97·40) 잉어(129·31) 강준치(102·47) 메기(130·37) 가물치(100) 쏘가리(37.4 · 소양호 조사 10.7~32.1) 뱀장어(150·40)
 */
const LAKE_LIST = [
  { key: 'chambung', ko: '참붕어', star: 1, min: 4, max: 11, a: 0.010, w: 3 },
  { key: 'napjaru', ko: '납자루', star: 1, min: 5, max: 12, a: 0.011, w: 2 },
  { key: 'pirami', ko: '피라미', star: 1, min: 8, max: 20, a: 0.009, w: 3 },
  { key: 'bluegill', ko: '블루길', star: 1, min: 8, max: 30, a: 0.025, w: 3, alien: true },
  { key: 'bungeo', ko: '붕어', star: 2, min: 10, max: 45, a: 0.0145, w: 5 },
  { key: 'ttokbung', ko: '떡붕어', star: 2, min: 15, max: 42, a: 0.017, w: 2, alien: true },
  { key: 'dongjagae', ko: '동자개', star: 2, min: 10, max: 30, a: 0.0073, w: 3 },
  { key: 'kkeuri', ko: '끄리', star: 3, min: 15, max: 40, a: 0.0082, w: 2 },
  { key: 'nuchi', ko: '누치', star: 3, min: 20, max: 60, a: 0.010, w: 2 },
  { key: 'bass', ko: '배스', star: 3, min: 20, max: 65, a: 0.014, w: 3, alien: true },
  { key: 'ingeo', ko: '잉어', star: 3, min: 30, max: 100, a: 0.017, w: 3 },
  { key: 'gangjun', ko: '강준치', star: 4, min: 30, max: 95, a: 0.0085, w: 2 },
  { key: 'megi', ko: '메기', star: 4, min: 30, max: 100, a: 0.009, w: 3 },
  { key: 'gamulchi', ko: '가물치', star: 4, min: 35, max: 90, a: 0.0095, w: 2 },
  { key: 'ssogari', ko: '쏘가리', star: 5, min: 15, max: 40, a: 0.012, w: 1 },
  { key: 'jangeo', ko: '뱀장어', star: 5, min: 40, max: 100, a: 0.0011, w: 1 },
];
/**
 * 🏞️ 강 물고기 8종 (v368 원고 — 공개 자료로 확인한 최대 길이 아래로) — 버들치(FishBase 17.2) · 참갈겨니(2005 신종 고유종) · 모래무지(150 mm SL) ·
 * 참마자(200~250 mm SL) · 꺽지(FishBase 18.0) · 동사리(FishBase 20.2) · 산천어(동해 북부 하천 상류 20~25 cm) · 어름치(천연기념물 제259호 · 📸 photo)
 */
const RIVER_LIST = [
  { key: 'beodeulchi', ko: '버들치', star: 1, min: 5, max: 15, a: 0.009, w: 3 },
  { key: 'chamgal', ko: '참갈겨니', star: 1, min: 6, max: 15, a: 0.009, w: 3 },
  { key: 'moraemuji', ko: '모래무지', star: 2, min: 7, max: 17, a: 0.008, w: 3 },
  { key: 'chammaja', ko: '참마자', star: 2, min: 10, max: 24, a: 0.008, w: 2 },
  { key: 'kkeokji', ko: '꺽지', star: 3, min: 7, max: 17, a: 0.016, w: 3 },
  { key: 'dongsari', ko: '동사리', star: 3, min: 7, max: 19, a: 0.011, w: 2 },
  { key: 'sancheoneo', ko: '산천어', star: 4, min: 15, max: 28, a: 0.010, w: 2 },
  { key: 'eoreumchi', ko: '어름치', star: 5, min: 15, max: 38, a: 0.009, w: 2, photo: true },
];
/**
 * 🌊 바다 물고기 9종 (v369 원고 「추천대로」 — 공개 자료로 확인한 최대 길이 아래로) — 문절망둑(FishBase 30) · 전갱이(50) · 고등어(64) · 노래미(30 SL) ·
 * 볼락(35.9) · 조피볼락(65) · 감성돔(50 SL · 40 cm 🏅 4짜) · 농어(102) · 참돔(100 SL)
 */
const SEA_LIST = [
  { key: 'munjeol', ko: '문절망둑', star: 1, min: 8, max: 25, a: 0.009, w: 3 },
  { key: 'jeongaeng', ko: '전갱이', star: 1, min: 10, max: 32, a: 0.011, w: 3 },
  { key: 'godeung', ko: '고등어', star: 2, min: 18, max: 45, a: 0.010, w: 3 },
  { key: 'noraemi', ko: '노래미', star: 2, min: 12, max: 28, a: 0.012, w: 2 },
  { key: 'bollak', ko: '볼락', star: 3, min: 10, max: 30, a: 0.017, w: 2 },
  { key: 'jopi', ko: '조피볼락', star: 3, min: 18, max: 55, a: 0.016, w: 2 },
  { key: 'gamseong', ko: '감성돔', star: 4, min: 20, max: 48, a: 0.020, w: 2 },
  { key: 'nongeo', ko: '농어', star: 4, min: 30, max: 85, a: 0.010, w: 2 },
  { key: 'chamdom', ko: '참돔', star: 5, min: 30, max: 90, a: 0.017, w: 1 },
];
/** 낚시터 세 곳 (v368 강 · v369 바다) — 저수지 · 강 · 바다 */
export const PLACES = ['lake', 'river', 'sea'];
export const PLACE_KO = { lake: '저수지', river: '강', sea: '바다' };
export const PLACE_EMOJI = { lake: '🏞️', river: '🏞️', sea: '🌊' };
/** 모든 물고기 (도감 차례 = 저수지 16 → 강 8 → 바다 9) · home = 사는 낚시터 */
export const SPECIES = [...LAKE_LIST.map((s) => ({ ...s, home: 'lake' })), ...RIVER_LIST.map((s) => ({ ...s, home: 'river' })), ...SEA_LIST.map((s) => ({ ...s, home: 'sea' }))];
export const SPECIES_KEYS = SPECIES.map((s) => s.key);
/** 강에서도 가끔 나오는 저수지 물고기 넷 — 같은 별 안에서 몫 VISIT_W (도감 칸은 저수지 쪽) */
export const RIVER_VISITORS = ['kkeuri', 'nuchi', 'ssogari', 'gangjun'];
export const VISIT_W = 1;
/** 강이 열리는 저수지 도감 종 수 */
export const RIVER_NEED = 10;
/** 바다가 열리는 강 도감 종 수 (v369 — 기본안 「이대로」) */
export const SEA_NEED = 6;
const BY_KEY = Object.fromEntries(SPECIES.map((s) => [s.key, s]));
export function speciesOf(key) {
  return Object.prototype.hasOwnProperty.call(BY_KEY, key) ? BY_KEY[key] : null;
}
/** 🏅 붕어·떡붕어 한 자(30.3cm) = 월척 · 40cm = 4짜 */
export const WOLCHEOK = 30.3;
export const SAJJA = 40;

/**
 * 그날 자리 셋 — 거리(m) · 열리는 그날 정답 수 · 별마다 몫 · 밑밥 문제 수
 * 처음엔 물가만 → 그날 맞힌 문제가 쌓이면 수초 밭 → 깊은 곳 (다음 날은 다시 물가부터)
 */
export const SPOTS = [
  { key: 'shore', ko: '물가', m: 8, need: 0, chum: 1, w: { 1: 10, 2: 5, 3: 1, 4: 0, 5: 0 } },
  { key: 'weed', ko: '수초 밭', m: 14, need: 6, chum: 2, w: { 1: 4, 2: 6, 3: 4, 4: 1, 5: 0 } },
  { key: 'deep', ko: '깊은 곳', m: 20, need: 16, chum: 2, w: { 1: 2, 2: 4, 3: 5, 4: 3, 5: 1 } },
];
/** 🏞️ 강의 자리 셋 (v368) — 거리·열리는 정답 수·별 몫·밑밥 문제 수는 저수지 자리와 같다 */
export const RIVER_SPOTS = [
  { key: 'riffle', ko: '여울', m: 8, need: 0, chum: 1, w: { ...SPOTS[0].w } },
  { key: 'rock', ko: '바위 밑', m: 14, need: 6, chum: 2, w: { ...SPOTS[1].w } },
  { key: 'pool', ko: '깊은 소', m: 20, need: 16, chum: 2, w: { ...SPOTS[2].w } },
];
/** 🌊 바다의 자리 셋 (v369) — 거리·열리는 정답 수·별 몫·밑밥 문제 수는 저수지 자리와 같다 */
export const SEA_SPOTS = [
  { key: 'harbor', ko: '방파제 안쪽', m: 8, need: 0, chum: 1, w: { ...SPOTS[0].w } },
  { key: 'tetra', ko: '테트라포드', m: 14, need: 6, chum: 2, w: { ...SPOTS[1].w } },
  { key: 'offshore', ko: '먼 바다', m: 20, need: 16, chum: 2, w: { ...SPOTS[2].w } },
];
/** 그 낚시터의 자리 셋 */
export function spotsOf(place) {
  return place === 'river' ? RIVER_SPOTS : place === 'sea' ? SEA_SPOTS : SPOTS;
}
/** 자리가 어느 낚시터 것인가 */
export function placeOfSpot(spot) {
  const k = spot && spot.key;
  return RIVER_SPOTS.some((s) => s.key === k) ? 'river' : SEA_SPOTS.some((s) => s.key === k) ? 'sea' : 'lake';
}
/** 그날 맞힌 수로 열린 자리 수 (1~3) */
export function openSpots(okToday) {
  const n = nz(okToday);
  return SPOTS.filter((s) => n >= s.need).length;
}
/** ① 던지기 문제 결과 → 자리 (맞히면 열린 곳 중 가장 먼 곳 · 틀리면 가까운 자리) · place = 낚시터(v368) */
export function castSpot(correct, okToday, place = 'lake') {
  const list = spotsOf(place);
  return correct ? list[openSpots(okToday) - 1] : list[0];
}
/** ② 밑밥 정답 c개일 때 별 몫의 배수 — ★1은 줄고 ★3 위로는 는다(c=2면 ★5 두 배) */
export function chumFactor(star, c) {
  return Math.max(0.3, 1 + (0.5 * nz(c) * (star - 2)) / 3);
}
/** 이 자리·밑밥에서 별마다 나올 몫 (합 1) */
export function starOdds(spot, chum) {
  const sp = [...SPOTS, ...RIVER_SPOTS, ...SEA_SPOTS].find((s) => s.key === (spot && spot.key)) || SPOTS[0];
  const raw = [1, 2, 3, 4, 5].map((s) => sp.w[s] * chumFactor(s, chum));
  const sum = raw.reduce((a, b) => a + b, 0) || 1;
  return Object.fromEntries(raw.map((v, i) => [i + 1, v / sum]));
}
/** 가중치로 하나 고르기 — items = [[값, 무게]] */
export function weighted(items, rng = Math.random) {
  const total = items.reduce((a, [, w]) => a + Math.max(0, w), 0);
  if (!(total > 0)) return items.length ? items[0][0] : null;
  let r = rng() * total;
  for (const [v, w] of items) { r -= Math.max(0, w); if (r < 0) return v; }
  return items[items.length - 1][0];
}
/** 길이 (cm, 소수 한 자리) — 보통은 작은 쪽으로 쏠리고, 연달아 맞힌 수(streak · 10까지)만큼 큰 쪽으로 */
export function lengthOf(sp, streak, rng = Math.random) {
  const k = 1 + 0.15 * Math.min(10, nz(streak));
  const q = Math.pow(rng(), 1.6 / k);
  return Math.round((sp.min + (sp.max - sp.min) * q) * 10) / 10;
}
/** 무게 (g, 정수) — 길이로 어림 */
export function weightOf(sp, cm) {
  return Math.max(1, Math.round(sp.a * Math.pow(Math.max(0, Number(cm) || 0), 3)));
}
/** 🏅 붙는 이름 — 붕어·떡붕어(월척·4짜) · 🌊 감성돔은 40 cm 「4짜」만 (v369) */
export function badgesOf(key, cm) {
  if (key === 'gamseong') return cm >= SAJJA ? ['sajja'] : [];
  if (key !== 'bungeo' && key !== 'ttokbung') return [];
  if (cm >= SAJJA) return ['sajja'];
  if (cm >= WOLCHEOK) return ['wolcheok'];
  return [];
}
export const BADGE_KO = { wolcheok: '🏅 월척', sajja: '🏅 4짜' };
/** 그 낚시터·별에서 나오는 물고기와 몫 [[종, 몫]] — 저수지는 저수지 물고기만 · 강은 강 물고기 + 저수지의 강 물고기 넷(몫 VISIT_W) · 바다는 바다 물고기만 */
export function poolAt(place, star) {
  const home = PLACES.includes(place) ? place : 'lake';
  const out = SPECIES.filter((x) => x.home === home && x.star === star).map((x) => [x, x.w]);
  if (home === 'river') for (const k of RIVER_VISITORS) { const v = BY_KEY[k]; if (v.star === star) out.push([v, VISIT_W]); }
  return out;
}
/**
 * ③ 입질 때 물고기 정하기 → { key, star, cm, g, badges, place } · tilt = { 종: 배 } 같은 별 안에서만 기울임(🌦️ 날씨 · 🎒 미끼 — mixTilt로 곱해 최대 ×3)
 * 별을 먼저 뽑으므로 별 몫·별 하나에 💰1·하루 40은 그대로 — 다만 흐린 날 깊은 곳에서 붕어가 늘면 🏅 월척 +5는 조금 잦아질 수 있다(Codex 171차 · 그대로 둠)
 * 낚시터는 자리로 안다(placeOfSpot — 강 자리면 강 물고기)
 */
export function rollFish(spot, chum, streak, rng = Math.random, tilt = null) {
  const place = placeOfSpot(spot);
  const odds = starOdds(spot, chum);
  const star = weighted([1, 2, 3, 4, 5].map((s) => [s, odds[s]]), rng);
  const tw = (x) => (tilt && Object.prototype.hasOwnProperty.call(tilt, x.key) && Number(tilt[x.key]) > 0 ? Number(tilt[x.key]) : 1);
  const sp = weighted(poolAt(place, star).map(([x, w]) => [x, w * tw(x)]), rng);
  const cm = lengthOf(sp, streak, rng);
  return { key: sp.key, star: sp.star, cm, g: weightOf(sp, cm), badges: badgesOf(sp.key, cm), place };
}
// 🟢 지가르데 셀 (v371 · 2026-10-30 아버님 「낚시하다가도 셀을 낚게 — 2% 정도」 → 기본안 「추천대로」) —
//   입질마다 CELL_ODDS로 물고기 대신 셀이 걸린다 · 사투·뜰채 문제는 ★3 물고기와 같다 · 📖 도감·💰·그날 낚은 마리에는 안 든다 ·
//   걸려도 되는지(오늘 낚시 셀을 아직 안 찾았나 · 큐브가 덜 찼나)는 화면이 zygarde.zygCanFish로 묻는다 — 이 파일은 지가르데 장부를 모른다
/** 입질마다 셀이 걸릴 확률 */
export const CELL_ODDS = 0.02;
const CELL_STAR = 3;
const CELL_CM = 40; // 걸린 셀을 그릴 크기 몫(물고기 길이처럼 — 그림만)
/** 이 입질이 셀인가 (순수 — 확률만 · odds는 시험용으로 바꿀 수 있다 · 0~1 밖은 끝으로) */
export function cellRoll(rng = Math.random, odds = CELL_ODDS) {
  const p = Number.isFinite(Number(odds)) ? Math.max(0, Math.min(1, Number(odds))) : CELL_ODDS;
  return Number(rng()) < p;
}
/** 셀이 걸린 「물고기」 — rollFish와 같은 꼴(사투·그림이 그대로 쓴다) · cell: true · 낚시터는 자리로 */
export function cellFish(spot) {
  return { key: 'zygcell', star: CELL_STAR, cm: CELL_CM, g: 0, badges: [], place: placeOfSpot(spot), cell: true };
}
/**
 * 셀을 큐브에 넣은 결과 → 'ok' · 'gone'(다른 창이 오늘 낚시 셀을 먼저 받았거나 큐브가 다 참 — 물속으로) ·
 * 'retry'(저장 실패·모르는 까닭 — 뜰채에 둔 채 🔁 · 모르는 까닭으로 셀을 놓아주지 않게, Codex 175차)
 */
export function cellFate(r) {
  if (r && r.ok === true) return 'ok';
  return r && (r.why === 'day' || r.why === 'full') ? 'gone' : 'retry';
}
/** 무게 글 — 1kg 아래는 g, 넘으면 kg 소수 둘 */
export function weightText(g) {
  const n = nz(g);
  return n < 1000 ? `${n}g` : `${(n / 1000).toFixed(2)}kg`;
}

// ───────────── 사투 (레퍼런스 ⑶ 장력·거리 — 끊김 대신 드랙) ─────────────

/** 사투 숫자 — 별마다 감는 빠르기(m/s) · 감을 때 장력 오름(/s) · 「!!」 사이(s) · 「!!」 길이(s) */
export const FIGHT = {
  netM: 3, // 이만큼 가까워지면 ⑤ 뜰채
  slack: 55, // 놓으면 장력이 내려가는 빠르기(/s)
  drift: 0.6, // 놓으면 멀어지는 빠르기(m/s) · 「!!」면 surgeDrift
  surgeDrift: 2.6,
  surgeK: 3, // 「!!」 때 감으면 장력이 이만큼 배로
  surgeReel: 0.3, // 「!!」 때 감으면 감는 빠르기가 이만큼 배로
  dragAt: 100, // 장력이 여기에 닿으면 드랙이 풀림
  dragTo: 68,
  dragBack: 2, // 드랙이 풀리면 멀어지는 거리(m)
  slipS: 1, // 드랙이 풀리면 이만큼(초) 안 감긴다 — 「!!」 때 손을 떼는 편이 빠르게
  tire: 0.12, // 드랙이 한 번 풀릴 때마다 「!!」 힘·끌려가는 거리·안 감기는 때가 이만큼씩 준다
  tireMin: 0.25, // …여기까지만
  maxOver: 6, // 처음 거리보다 이만큼 넘게는 안 멀어짐(놓치지 않음)
  deepK: 0.8, // 바늘이 깊이 걸리면 장력이 이만큼 배로 덜 오름
  pullK: 0.5, // 사투 정답이면 표시점 사이의 이만큼을 확 끌어옴(나머지 반은 손으로 감기)
  wrongBack: 1.5, // 사투 오답이면 멀어지는 거리(m)
  byStar: {
    1: { reel: 4.0, rise: 26, gap: [2.4, 4.2], len: [0.5, 0.9] },
    2: { reel: 3.6, rise: 30, gap: [2.0, 3.6], len: [0.6, 1.0] },
    3: { reel: 3.2, rise: 34, gap: [1.6, 3.0], len: [0.6, 1.1] },
    4: { reel: 2.8, rise: 38, gap: [1.3, 2.5], len: [0.7, 1.2] },
    5: { reel: 2.6, rise: 42, gap: [1.0, 2.2], len: [0.7, 1.3] },
  },
};
const span = ([a, b], rng) => a + (b - a) * rng();

/** 사투 시작 상태 — fish = rollFish 결과 · m = 자리 거리 · deep = 바늘이 깊이 걸렸나 */
export function fightStart(fish, m, deep, rng = Math.random) {
  const n = STARS[fish.star].fight + (deep ? 0 : 1);
  const start = Math.max(FIGHT.netM + 2, Number(m) || 8);
  const marks = [];
  for (let i = 1; i <= n; i++) marks.push(FIGHT.netM + (start - FIGHT.netM) * (1 - i / (n + 1)));
  const c = FIGHT.byStar[fish.star];
  return { star: fish.star, deep: !!deep, start, dist: start, ten: 10, marks, next: 0, surge: 0, nextSurge: span(c.gap, rng), t: 0, drags: 0, slip: 0 };
}
/**
 * 사투 한 걸음 (순수 · 상태를 바꿔 돌려준다) — dt초 · hold = 감기 단추를 누르고 있나
 * → { s, ev } · ev: null | 'mark'(표시점 → 문제) | 'drag'(드랙이 풀림) | 'net'(뜰채로)
 */
export function fightStep(s0, dt, hold, rng = Math.random) {
  const s = { ...s0, marks: s0.marks };
  const c = FIGHT.byStar[s.star];
  const d = Math.max(0, Math.min(0.1, Number(dt) || 0));
  s.t += d;
  // 「!!」 — 물고기가 확 당기는 때
  if (s.surge > 0) { s.surge -= d; if (s.surge <= 0) { s.surge = 0; s.nextSurge = span(c.gap, rng); } } else {
    s.nextSurge -= d;
    if (s.nextSurge <= 0) s.surge = span(c.len, rng);
  }
  const surging = s.surge > 0;
  // 드랙이 풀릴 때마다 물고기가 지친다 — 「!!」가 약해지고 끌려가는 거리도 준다(꾹 누르기만 해도 언젠가는 끝나게)
  const tired = Math.max(FIGHT.tireMin, 1 - FIGHT.tire * s.drags);
  const rise = c.rise * (s.deep ? FIGHT.deepK : 1) * (surging ? 1 + (FIGHT.surgeK - 1) * tired : 1);
  if (s.slip > 0) {
    // 드랙이 풀리는 동안은 눌러도 안 감긴다 — 물고기가 줄을 끌고 간다
    s.slip = Math.max(0, s.slip - d);
    s.dist += FIGHT.surgeDrift * tired * d;
    s.ten -= FIGHT.slack * d;
  } else if (hold) {
    s.dist -= c.reel * (surging ? FIGHT.surgeReel : 1) * d;
    s.ten += rise * d;
  } else {
    s.dist += (surging ? FIGHT.surgeDrift : FIGHT.drift) * d;
    s.ten -= FIGHT.slack * d;
  }
  s.ten = Math.max(0, s.ten);
  s.dist = Math.min(s.start + FIGHT.maxOver, s.dist);
  let ev = null;
  if (s.ten >= FIGHT.dragAt) {
    s.ten = FIGHT.dragTo;
    s.dist = Math.min(s.start + FIGHT.maxOver, s.dist + FIGHT.dragBack * tired);
    s.slip = FIGHT.slipS * tired;
    s.drags += 1;
    ev = 'drag';
  }
  // 표시점이 남았으면 그 아래로는 안 감김(문제부터) · 다 지났으면 뜰채 거리에서 끝
  if (s.next < s.marks.length) {
    if (s.dist <= s.marks[s.next]) { s.dist = s.marks[s.next]; ev = 'mark'; }
  } else if (s.dist <= FIGHT.netM) { s.dist = FIGHT.netM; ev = 'net'; }
  return { s, ev };
}
/** 사투 문제 결과 — 맞히면 다음 표시점 쪽으로 확(표시점 사이의 pullK) · 틀리면 조금 멀어짐 · 어느 쪽이든 그 표시점은 지남 */
export function fightAnswer(s0, correct) {
  const s = { ...s0 };
  const gap = (s.start - FIGHT.netM) / (s.marks.length + 1);
  s.next = Math.min(s.marks.length, s.next + 1);
  if (correct) { s.dist = Math.max(FIGHT.netM, s.dist - gap * FIGHT.pullK); s.ten = Math.max(0, s.ten - 20); } else s.dist = Math.min(s.start + FIGHT.maxOver, s.dist + FIGHT.wrongBack);
  return s;
}
/** ⑤ 뜰채 — 남은 걸음(처음 STARS[star].net) · 맞히면 하나 줄고 0이면 뜬다 */
export function netAnswer(left, correct) {
  const n = nz(left);
  return correct ? Math.max(0, n - 1) : n;
}

// ───────────── 과목 비율 ─────────────

/** 문제를 내는 과목 (대여행과 같은 차례) */
export const SUBJECTS = ['math', 'english', 'korean', 'nonsul'];
/** 「지난 7일 얼마나 했나」 0~1 의 기준 — 과목 화면 시간(초) · 논술은 한 날 수 */
export const DONE_GOAL = { sec: 140 * 60, nonsulDays: 4 };
/** 한 과목 몫의 바닥·천장 */
export const SHARE_MIN = 0.1;
export const SHARE_MAX = 0.5;
const DAY_MS = 86400000;
/** 'YYYY-MM-DD'를 날 번호(UTC 기준 정수)로 — 깨지면 NaN */
export function dayIndex(key) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(key || ''));
  return m ? Math.round(Date.UTC(+m[1], +m[2] - 1, +m[3]) / DAY_MS) : NaN;
}
/**
 * 지난 7일(오늘 빼고) 과목마다 0~1 (순수)
 * days = [{ date: 'YYYY-MM-DD', mathTime, enTime, korTime }] · nonsulDays = 논술 한 날 'YYYY-MM-DD' 목록 · today = 'YYYY-MM-DD'
 */
export function doneOf(days, nonsulDays, today) {
  const t = dayIndex(today);
  const inWeek = (key) => { const d = dayIndex(key); return Number.isFinite(d) && Number.isFinite(t) && d < t && d >= t - 7; };
  const sec = { math: 0, english: 0, korean: 0 };
  for (const r of Array.isArray(days) ? days : []) {
    if (!r || !inWeek(r.date)) continue;
    sec.math += nz(r.mathTime);
    sec.english += nz(r.enTime);
    sec.korean += nz(r.korTime);
  }
  const nd = new Set((Array.isArray(nonsulDays) ? nonsulDays : []).filter(inWeek)).size;
  const cap = (v) => Math.min(1, Math.max(0, v));
  return { math: cap(sec.math / DONE_GOAL.sec), english: cap(sec.english / DONE_GOAL.sec), korean: cap(sec.korean / DONE_GOAL.sec), nonsul: cap(nd / DONE_GOAL.nonsulDays) };
}
/**
 * 과목 몫 (순수 · 합 1) — 무게 = 1.2 − 했나 · 낼 문제가 있는 과목(avail)만 · 한 과목은 바닥~천장 안으로(물 채우듯 나눠 맞춤)
 * 과목이 적으면 천장을 올린다 — 남은 과목마다 25%를 비워 두고 나머지까지(넷·셋 50% · 둘 75% · 하나면 그 과목만 · 50/50으로 굳지 않게)
 */
export function subjectShares(done, avail = SUBJECTS) {
  const list = SUBJECTS.filter((s) => (avail || []).includes(s));
  if (!list.length) return {};
  const n = list.length;
  const lo = Math.min(SHARE_MIN, 1 / n);
  const hi = Math.max(SHARE_MAX, 1 - (n - 1) * 0.25);
  const w = Object.fromEntries(list.map((s) => [s, 1.2 - Math.min(1, Math.max(0, Number(done && done[s]) || 0))]));
  const out = {};
  let free = [...list];
  let left = 1;
  for (let round = 0; round < n + 1; round++) {
    const sum = free.reduce((a, s) => a + w[s], 0);
    let fixed = false;
    for (const s of free) {
      const v = (w[s] / sum) * left;
      if (v > hi || v < lo) { out[s] = v > hi ? hi : lo; fixed = true; }
    }
    if (!fixed) { for (const s of free) out[s] = (w[s] / sum) * left; break; }
    free = free.filter((s) => out[s] === undefined);
    left = 1 - list.filter((s) => out[s] !== undefined).reduce((a, s) => a + out[s], 0);
    if (!free.length) break;
  }
  // 반올림 찌꺼기 — 합을 1로
  const tot = list.reduce((a, s) => a + (out[s] || 0), 0) || 1;
  for (const s of list) out[s] = (out[s] || 0) / tot;
  return out;
}
/** 다음 문제 과목 — 몫으로 뽑되 같은 과목이 셋 내리 나왔으면 다른 과목(다른 과목이 있을 때) · recent = 최근 과목들(뒤가 최근) */
function banOf(list, recent) {
  const r = Array.isArray(recent) ? recent.slice(-3) : [];
  return r.length === 3 && r.every((x) => x === r[0]) && list.length > 1 ? r[0] : null;
}
export function pickSubject(shares, recent, rng = Math.random) {
  const list = SUBJECTS.filter((s) => shares && shares[s] > 0);
  if (!list.length) return null;
  const ban = banOf(list, recent);
  return weighted(list.filter((s) => s !== ban).map((s) => [s, shares[s]]), rng);
}
/**
 * 문제를 물어볼 과목 차례 (순수) — 고른 과목 먼저 · 그 과목이 문제를 못 만들면 몫이 큰 과목부터 ·
 * 셋 내리 나온 과목은 맨 끝(다른 과목이 다 못 만들 때만 — 문제 없이 넘어가는 것보다는 낫게)
 */
export function askOrder(shares, recent, first) {
  const list = SUBJECTS.filter((s) => shares && shares[s] > 0);
  const ban = banOf(list, recent);
  const rest = list.filter((s) => s !== first && s !== ban).sort((a, b) => shares[b] - shares[a]);
  return [...(first && list.includes(first) ? [first] : []), ...rest, ...(ban && ban !== first ? [ban] : [])];
}

// ───────────── 하루 20분 ─────────────

/** 이 걸음에 셀 시간(ms) — 화면이 보이고 마지막 손댐이 FISH_IDLE_MS 안일 때만 · 한 걸음은 1초까지(앱을 내렸다 오면 크게 안 뜀) */
export function activeStep(dtMs, sinceTouchMs, visible = true) {
  if (!visible) return 0;
  if (!(Number(sinceTouchMs) <= FISH_IDLE_MS)) return 0;
  return Math.max(0, Math.min(1000, Number(dtMs) || 0));
}
/** ⚙ 하루 낚시 분 — 고르는 보기 안에서만 · 비었거나 이상하면 20 */
export const FISH_MIN_CHOICES = [10, 15, 20, 30, 40, 60];
export function fishMinOf(v) {
  const n = Math.floor(Number(v));
  return FISH_MIN_CHOICES.includes(n) ? n : FISH_DAY_MIN;
}
/** 오늘 남은 낚시 초 — usedSec(오늘 쓴 초) · minutes(⚙ · 비면 20) · bonusMin(🔒 오늘만 더) */
export function dayLeftSec(usedSec, minutes = FISH_DAY_MIN, bonusMin = 0) {
  const m = Math.floor(Number(minutes));
  const total = ((Number.isFinite(m) && m > 0 ? Math.min(120, m) : FISH_DAY_MIN) + Math.min(60, nz(bonusMin))) * 60;
  return Math.max(0, total - nz(usedSec));
}

// ───────────── 낚시 도감 · 💰 (프로필 profile.fishing) ─────────────

/** 💰 — 별 하나에 1 · 도감에 새로 +5 · 🏅 월척·4짜 +5 · 하루 40까지 (아버님 기본안 「이대로」) */
export const FISH_COINS = { perStar: 1, newKind: 5, badge: 5, dayMax: 40 };
/** 지역 날 'YYYY-MM-DD' */
export function dayKeyOf(ms) {
  const d = new Date(Number(ms) || 0);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
const isDay = (v) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);
const isObj = (v) => !!v && typeof v === 'object' && !Array.isArray(v);
/** 날마다 받은 💰를 남겨 두는 날 수 — 기기 날짜를 잘못 맞췄다 되돌려도 그날 40 한도가 다시 열리지 않게(Codex 170차) · 늦은 날부터 */
export const PAID_DAYS = 14;
function paidOf(src) {
  const out = {};
  for (const k of Object.keys(src).filter(isDay).sort().slice(-PAID_DAYS)) {
    const c = Math.min(FISH_COINS.dayMax, nz(src[k]));
    if (c) out[k] = c;
  }
  return out;
}
/**
 * 고쳐 읽은 낚시 저장값 (새 객체) — { dex: { 종: { n 잡은 수, best 가장 긴 cm, d 처음 잡은 날 } }, paid: { 날: 그날 받은 💰 } }
 * 모르는 종·깨진 칸은 버린다 · best는 그 종의 길이 끝 안으로 · paid는 늦은 날 PAID_DAYS개 (시안 때의 day·coins 한 칸도 읽어 들임)
 */
export function lakeOf(raw) {
  const r = isObj(raw) ? raw : {};
  const dex = {};
  const src = isObj(r.dex) ? r.dex : {};
  for (const k of Object.keys(src)) {
    const sp = speciesOf(k);
    const e = src[k];
    if (!sp || !isObj(e)) continue;
    const n = nz(e.n);
    if (!n) continue;
    const best = Math.min(sp.max, Math.max(0, Math.round((Number(e.best) || 0) * 10) / 10));
    dex[k] = { n, best, d: isDay(e.d) ? e.d : '' };
  }
  const paid = isObj(r.paid) ? { ...r.paid } : {};
  if (isDay(r.day)) paid[r.day] = Math.max(nz(paid[r.day]), nz(r.coins));
  const pick = pickRawOf(r.pick);
  return { dex, paid: paidOf(paid), ...(pick ? { pick } : {}) };
}
export function copyLake(raw) {
  return lakeOf(raw);
}
/**
 * 병합 (순수) — 종마다 잡은 수·가장 긴 cm는 큰 쪽 · 처음 잡은 날은 이른 쪽(옛 백업이 도감 칸을 지우거나 「새로」를 또 받게 하지 않게) ·
 * 날마다 받은 💰는 날마다 큰 쪽(옛 백업이나 다른 날짜 기록이 섞여도 그날 💰 한도를 되살리지 않게) · 둘 다 없으면 null
 */
export function mergeLake(a, b) {
  if (!isObj(a) && !isObj(b)) return null;
  const x = lakeOf(a);
  const y = lakeOf(b);
  const dex = { ...x.dex };
  for (const k of Object.keys(y.dex)) {
    const p = dex[k];
    const q = y.dex[k];
    if (!p) { dex[k] = { ...q }; continue; }
    const days = [p.d, q.d].filter(Boolean).sort();
    dex[k] = { n: Math.max(p.n, q.n), best: Math.max(p.best, q.best), d: days[0] || '' };
  }
  const paid = { ...x.paid };
  for (const k of Object.keys(y.paid)) paid[k] = Math.max(nz(paid[k]), y.paid[k]);
  // 고른 물가·미끼·낚싯대 색은 나중에 바꾼 쪽 (같으면 앞쪽) — 산 채비는 가방(items)이라 💰와 같은 쪽을 따른다
  const pick = !x.pick ? y.pick : !y.pick ? x.pick : y.pick.at > x.pick.at ? y.pick : x.pick;
  return { dex, paid: paidOf(paid), ...(pick ? { pick: { ...pick } } : {}) };
}
/**
 * 🐟 한 마리 낚음 (프로필 규칙 — xp.houseDo 안에서 저장된 프로필로) — 도감 · 💰(하루 한도까지) · 날은 트랜잭션 안의 시각으로
 * fish = { key, cm } (별·🏅는 여기서 다시 셈) → { ok, first, best, coins } · 모르는 종·범위 밖 길이는 { ok:false, why:'bad' }
 */
export function catchRule(p, fish, now) {
  const sp = speciesOf(fish && fish.key);
  const cm = Math.round((Number(fish && fish.cm) || 0) * 10) / 10;
  if (!sp || !(cm >= sp.min && cm <= sp.max)) return { ok: false, why: 'bad' };
  const today = dayKeyOf(now);
  const lk = lakeOf(p.fishing);
  const wasOpen = riverOpen(lk);
  const wasSea = seaOpen(lk);
  const had = lk.dex[sp.key];
  const first = !had;
  const best = !!had && cm > had.best;
  lk.dex[sp.key] = { n: (had ? had.n : 0) + 1, best: Math.max(had ? had.best : 0, cm), d: had && had.d ? had.d : today };
  const opened = !wasOpen && riverOpen(lk); // 🏞️ 이 한 마리로 강이 열렸다 (v368 — 트랜잭션 안이라 두 창이 둘 다 「열렸어요」를 받지 않는다)
  const seaOpened = !wasSea && seaOpen(lk); // 🌊 이 한 마리로 바다가 열렸다 (v369 — 강 도감 6종째)
  const paid = nz(lk.paid[today]); // 그날 이미 받은 💰 — 다른 날로 갔다 와도 그대로
  const want = sp.star * FISH_COINS.perStar + (first ? FISH_COINS.newKind : 0) + (badgesOf(sp.key, cm).length ? FISH_COINS.badge : 0);
  const coins = Math.max(0, Math.min(want, FISH_COINS.dayMax - paid));
  if (coins) lk.paid = paidOf({ ...lk.paid, [today]: paid + coins });
  p.fishing = lk;
  if (coins) { p.coins = nz(p.coins) + coins; p.coinsEarned = nz(p.coinsEarned) + coins; } // 문제를 풀어 번 코인 (📊 공부로 번 💰)
  return { ok: true, first, best, coins, ...(opened ? { opened: true } : {}), ...(seaOpened ? { seaOpened: true } : {}), ...(sp.photo ? { photo: true } : {}) }; // 🏞️·🌊·📸는 그럴 때만 (v368 · v369)
}

// ───────────── 🏞️ 강 열림 · 🎒 채비 가게 · 고른 물가 (v368 · 원고 「이대로」) ─────────────

/** 강이 열렸나 — 저수지 도감 RIVER_NEED종 · 강 물고기를 한 번이라도 낚았으면 계속 열림(도감은 줄지 않는다) */
export function riverOpen(raw) {
  const lk = lakeOf(raw);
  const keys = Object.keys(lk.dex);
  return keys.some((k) => BY_KEY[k].home === 'river') || keys.filter((k) => BY_KEY[k].home === 'lake').length >= RIVER_NEED;
}
/** 바다가 열렸나 (v369) — 강 도감 SEA_NEED종 · 바다 물고기를 한 번이라도 낚았으면 계속 열림 */
export function seaOpen(raw) {
  const keys = Object.keys(lakeOf(raw).dex);
  return keys.some((k) => BY_KEY[k].home === 'sea') || keys.filter((k) => BY_KEY[k].home === 'river').length >= SEA_NEED;
}
/** 그 물가가 열렸나 — 저수지는 늘 */
export function placeOpen(raw, place) {
  return place === 'lake' || (place === 'river' && riverOpen(raw)) || (place === 'sea' && seaOpen(raw));
}
/** 🌊 바다가 열린 순간 결과 카드에 한 번 (v369 「추천대로」 — 안전 한 줄) */
export const SEA_SAFE = '🦺 진짜 바다 낚시는 어른과 함께, 구명조끼를 입고 해요.';
/**
 * 🎒 채비 (원고 표 그대로) — kind: bait 미끼(같은 별 안에서 tilt 종 ×2) · float 찌(꾸미기) · rod 낚싯대 색(꾸미기) · wear 옷(👕 옷장 — avatar.js WEAR의 lake 옷과 같은 값)
 * free = 처음부터 있음 · 산 것은 가방 profile.items[id] = 1 (💰·가방과 같은 쪽으로 병합 — 옷과 같다) · 써서 없어지는 것은 없다
 * 🪱는 옛 기기 글꼴에 없어 🐛로
 */
export const GEAR = [
  { id: 'worm', kind: 'bait', ko: '지렁이', emoji: '🐛', price: 0, free: true, say: '처음부터 있어요 · 아무 물고기나' },
  { id: 'g_corn', kind: 'bait', ko: '옥수수 미끼', emoji: '🌽', price: 200, tilt: ['bungeo', 'ttokbung', 'ingeo'], say: '붕어 · 떡붕어 · 잉어가 같은 별 안에서 두 배쯤' },
  { id: 'g_lure', kind: 'bait', ko: '루어(가짜 물고기)', emoji: '🐟', price: 300, tilt: ['bass', 'gamulchi', 'ssogari', 'kkeuri', 'gangjun', 'kkeokji', 'dongsari', 'nongeo', 'jopi'], say: '사냥하는 물고기 — 배스 · 가물치 · 쏘가리 · 끄리 · 강준치 · 꺽지 · 동사리 · 농어 · 조피볼락이 같은 별 안에서 두 배쯤' },
  { id: 'g_krill', kind: 'bait', ko: '크릴', emoji: '🦐', price: 300, tilt: ['gamseong', 'bollak'], sea: true, say: '바다에서 감성돔 · 볼락이 같은 별 안에서 두 배쯤' },
  { id: 'g_glow', kind: 'float', ko: '야광 찌', emoji: '✨', price: 150, say: '노을 · 흐린 날 · 비 오는 날에 찌가 빛나요' },
  { id: 'rod', kind: 'rod', ko: '나무 낚싯대', emoji: '🎣', price: 0, free: true, say: '처음부터 있어요', butt: '#3b2a1c', tip: '#5a3f28' },
  { id: 'g_rod_blue', kind: 'rod', ko: '파란 낚싯대', emoji: '🎣', price: 150, say: '꾸미기 · 가진 색 가운데 골라 써요', butt: '#1d3f7a', tip: '#3b7be0' },
  { id: 'g_rod_green', kind: 'rod', ko: '초록 낚싯대', emoji: '🎣', price: 150, say: '꾸미기 · 가진 색 가운데 골라 써요', butt: '#1d5a33', tip: '#3aa865' },
  { id: 'g_rod_gold', kind: 'rod', ko: '금색 낚싯대', emoji: '🎣', price: 150, say: '꾸미기 · 가진 색 가운데 골라 써요', butt: '#7a5a12', tip: '#e0b43a' },
  { id: 'a_hat_fish', kind: 'wear', ko: '낚시 모자', emoji: '🧢', price: 300, say: '옷장에 들어가요 · 사면 바로 써요' },
  { id: 'a_top_fishvest', kind: 'wear', ko: '낚시 조끼', emoji: '🦺', price: 300, say: '옷장에 들어가요 · 사면 바로 입어요' },
];
const GEAR_BY = Object.fromEntries(GEAR.map((g) => [g.id, g]));
export function gearOf(id) {
  return Object.prototype.hasOwnProperty.call(GEAR_BY, id) ? GEAR_BY[id] : null;
}
/**
 * 받침에 맞는 조사 (순수 · v369 — 🦐 「크릴을」) — 끝 괄호는 빼고 본다(「루어(가짜 물고기)」→ 루어) · 한글이 아니면 받침 없는 쪽 ·
 * rieulNone = ㄹ 받침을 받침 없는 쪽으로(「으로/로」 — 「…줄로」)
 */
export function josaOf(word, withB, withoutB, rieulNone = false) {
  const w = String(word || '').replace(/\s*\([^)]*\)\s*$/, '');
  const code = w.charCodeAt(w.length - 1) - 0xac00;
  if (!(code >= 0 && code <= 11171)) return withoutB;
  const jong = code % 28;
  return jong === 0 || (rieulNone && jong === 8) ? withoutB : withB;
}
/** 미끼·날씨 기울임을 곱해도 같은 별 안에서 이만큼까지 */
export const TILT_MAX = 3;
/** 미끼 기울임 { 종: 2 } — 지렁이·모르는 미끼면 null */
export function baitTilt(id) {
  const g = gearOf(id);
  return g && g.kind === 'bait' && Array.isArray(g.tilt) ? Object.fromEntries(g.tilt.map((k) => [k, 2])) : null;
}
/** 기울임 곱하기 (순수) — 종마다 곱해 TILT_MAX까지 · 둘 다 없으면 null */
export function mixTilt(...tilts) {
  const out = {};
  for (const t of tilts) {
    if (!isObj(t)) continue;
    for (const [k, v] of Object.entries(t)) if (Number(v) > 0) out[k] = Math.min(TILT_MAX, (out[k] || 1) * Number(v));
  }
  return Object.keys(out).length ? out : null;
}
/** 가방에 있나 (처음부터 있는 채비는 늘 있음) */
export function hasGear(p, id) {
  const g = gearOf(id);
  return !!g && (!!g.free || nz(p && p.items && p.items[id]) > 0);
}
/** 저장된 고른 값 고쳐 읽기 — { place, bait, rod, at } · 모르는 값은 기본으로 · 꼴이 틀리면 null */
function pickRawOf(v) {
  if (!isObj(v)) return null;
  const g = (id, kind, d) => { const x = gearOf(id); return x && x.kind === kind ? id : d; };
  return { place: PLACES.includes(v.place) ? v.place : 'lake', bait: g(v.bait, 'bait', 'worm'), rod: g(v.rod, 'rod', 'rod'), at: Math.max(0, Number(v.at) || 0) };
}
/**
 * 지금 쓰는 물가·미끼·낚싯대 (순수 · 프로필로) — 저장된 고른 값을 가진 것·열린 곳으로 다시 고친다(병합으로 안 가진 채비가 골라져 있어도) ·
 * → { place, bait, rod, glow } · glow = ✨ 야광 찌를 가졌나
 */
export function pickOf(p) {
  const pk = lakeOf(p && p.fishing).pick || pickRawOf({});
  return {
    place: placeOpen(p && p.fishing, pk.place) ? pk.place : 'lake',
    bait: hasGear(p, pk.bait) ? pk.bait : 'worm',
    rod: hasGear(p, pk.rod) ? pk.rod : 'rod',
    glow: hasGear(p, 'g_glow'),
  };
}
/**
 * 낚시터 화면의 고른 값 맞추기 (순수 · Codex 172차) — pick { bait, rod, glow } · owned { id: true } · pend = 가게에서 늦게 온 바꿈 { bait?, rod? } ·
 * ready(던지기 전)일 때만 pend를 얹고 안 가진 채비는 기본으로 — 던지는 중이면 고른 값을 그대로 두고 pend는 다음 ready까지 남긴다 → { pick, pend }
 */
export function syncPick(pick, owned, pend, ready) {
  const pk = isObj(pick) ? pick : {};
  const pd = isObj(pend) ? pend : {};
  if (!ready) return { pick: { bait: pk.bait, rod: pk.rod, glow: !!pk.glow }, pend: { ...pd } };
  const own = isObj(owned) ? owned : {};
  const ok = (id, kind) => { const g = gearOf(id); return g && g.kind === kind && (g.free || own[id]) ? id : null; };
  return {
    pick: { bait: ok(pd.bait, 'bait') || ok(pk.bait, 'bait') || 'worm', rod: ok(pd.rod, 'rod') || ok(pk.rod, 'rod') || 'rod', glow: !!own.g_glow },
    pend: {},
  };
}
/**
 * 🗺️ 물가 · 미끼 칩 · 낚싯대 색 바꾸기 (프로필 규칙 — houseDo 안에서) — want = { place?, bait?, rod? } 바꿀 칸만
 * why: 'locked' 아직 안 열린 강·바다 · 'none' 안 가진 채비 · 'bad' 모르는 값
 */
export function pickRule(p, want, now) {
  const w = isObj(want) ? want : {};
  const next = pickOf(p);
  if (w.place !== undefined) {
    if (!PLACES.includes(w.place)) return { ok: false, why: 'bad' };
    if (!placeOpen(p.fishing, w.place)) return { ok: false, why: 'locked' };
    next.place = w.place;
  }
  for (const [k, kind] of [['bait', 'bait'], ['rod', 'rod']]) {
    if (w[k] === undefined) continue;
    const g = gearOf(w[k]);
    if (!g || g.kind !== kind) return { ok: false, why: 'bad' };
    if (!hasGear(p, w[k])) return { ok: false, why: 'none' };
    next[k] = w[k];
  }
  const lk = lakeOf(p.fishing);
  lk.pick = { place: next.place, bait: next.bait, rod: next.rod, at: Math.max(Number(now) || 0, ((lk.pick && lk.pick.at) || 0) + 1) }; // 바꾼 시각은 늘 앞으로(병합 늦은 쪽)
  p.fishing = lk;
  return { ok: true, pick: pickOf(p) };
}
/**
 * 🎒 채비 사기 (프로필 규칙 — houseDo 안에서 저장된 프로필로) — 미끼·찌·낚싯대 색만(옷은 avatar.wearBuyRule — 옷장 규칙 그대로) ·
 * 산 미끼·낚싯대 색은 바로 쓴다 · why: 'unknown' 파는 채비가 아님 · 'owned' 이미 있음 · 'locked' 바다가 열려야 파는 채비(🦐 크릴 · v369) · 'short' 💰 모자람(shortCoins)
 */
export function gearBuyRule(p, id, now) {
  const g = gearOf(id);
  if (!g || g.free || g.kind === 'wear') return { ok: false, why: 'unknown' };
  if (hasGear(p, id)) return { ok: false, why: 'owned' };
  if (g.sea && !seaOpen(p.fishing)) return { ok: false, why: 'locked' }; // 🦐 크릴은 바다가 열린 뒤에 (v369)
  const have = Number(p.coins) || 0;
  if (have < g.price) return { ok: false, why: 'short', shortCoins: g.price - have };
  p.coins = have - g.price;
  if (!isObj(p.items)) p.items = {};
  p.items[id] = 1;
  if (g.kind === 'bait' || g.kind === 'rod') pickRule(p, { [g.kind]: id }, now);
  return { ok: true, pick: pickOf(p) };
}

// ───────────── 🌦️ 오늘 날씨 (v367 · 2단계 기본안 「이대로」) ─────────────

/** 날씨 넷 — 열흘마다 맑음 다섯 · 흐림 셋 · 비 하나 · 바람 하나(n) · line은 낚시터에 들어설 때 한 줄 */
export const WEATHER = [
  { key: 'sun', emoji: '☀️', ko: '맑은 날', n: 5, line: '☀️ 맑은 날이에요. 해 질 녘엔 노을이 져요.' },
  { key: 'cloud', emoji: '☁️', ko: '흐린 날', n: 3, line: '☁️ 흐린 날엔 깊은 곳에서 큰 물고기가 잘 나온대요.', river: '☁️ 흐린 날엔 깊은 소에서 큰 물고기가 잘 나온대요.', sea: '☁️ 흐린 날엔 먼 바다에서 큰 물고기가 잘 나온대요.' },
  { key: 'rain', emoji: '🌧️', ko: '비 오는 날', n: 1, line: '🌧️ 비 오는 날엔 메기와 뱀장어가 잘 나온대요.', river: '🌧️ 비 오는 날이에요. 빗방울 사이로 찌를 잘 봐요.', sea: '🌧️ 비 오는 날이에요. 진짜 방파제는 미끄러우니 천천히 걸어요.' },
  { key: 'wind', emoji: '🌬️', ko: '바람 부는 날', n: 1, line: '🌬️ 바람 부는 날이에요. 찌가 흔들려도 진짜 입질을 잘 봐요.', sea: '🌬️ 바람 부는 날엔 파도가 높아요. 진짜 바다에선 테트라포드에 올라가지 않아요.' },
];
/** 들어설 때 날씨 한 줄 — 강·바다면 그 물가 말(있을 때 · 메기·뱀장어는 강에 안 나오니 v368 · 바다는 비·바람에 안전 한 줄 v369) */
export function weatherLine(w, place) {
  if (!w) return '';
  return ((place === 'river' || place === 'sea') && w[place]) || w.line || '';
}
const WX_BY = Object.fromEntries(WEATHER.map((w) => [w.key, w]));
/**
 * 그날 날씨 (순수) — 날짜로만 정한다(인터넷·위치 안 씀 · 두 기기가 같은 날 같은 날씨) · 'YYYY-MM-DD' → WEATHER 한 줄
 * 열흘을 한 묶음으로 맑음 5·흐림 3·비 1·바람 1을 섞어 놓는다 — 열흘마다 몫이 정확히 맞게(묶음 안에선 비가 하루뿐 · 묶음 경계에선 이틀 이어질 수 있다) · 꼴이 틀리면 맑음
 */
export function weatherOf(dayKey) {
  if (!isDay(dayKey)) return WX_BY.sun;
  const [y, m, d] = dayKey.split('-').map(Number);
  const dn = Math.round(Date.UTC(y, m - 1, d) / 86400000);
  if (!Number.isFinite(dn)) return WX_BY.sun;
  const block = Math.floor(dn / 10);
  const slots = WEATHER.flatMap((w) => Array(w.n).fill(w.key));
  let a = (Math.imul(block, 0x9e3779b1) ^ 0x5eed) >>> 0;
  const r = () => { a = (a + 0x6d2b79f5) >>> 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  for (let i = slots.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [slots[i], slots[j]] = [slots[j], slots[i]]; }
  return WX_BY[slots[((dn % 10) + 10) % 10]];
}
/** 별마다 가장 큰 물고기(길이 끝이 가장 긴 종 · 같으면 앞) — ☁️ 흐린 날 깊은 곳에서 기우는 종 · 저수지 물고기 가운데 */
const bigOf = (home) => [1, 2, 3, 4, 5].map((s) => SPECIES.filter((x) => x.home === home && x.star === s).reduce((m, x) => (x.max > m.max ? x : m)).key);
export const BIG_KIND = bigOf('lake');
/** 🏞️ 강 물고기 가운데 별마다 가장 큰 물고기 — ☁️ 흐린 날 깊은 소에서 (v368) */
export const BIG_KIND_RIVER = bigOf('river');
/** 🌊 바다 물고기 가운데 별마다 가장 큰 물고기 — ☁️ 흐린 날 먼 바다에서 (v369) */
export const BIG_KIND_SEA = bigOf('sea');
/** 날씨가 기우는 종 (같은 별 안에서 ×2 · rollFish tilt — 별 몫은 그대로) — 🌧️ 메기·뱀장어(저수지) · ☁️ 깊은 곳·깊은 소·먼 바다에서만 별마다 가장 큰 물고기 · 맑음·바람은 없음 */
export function weatherTilt(wkey, spotKey) {
  if (wkey === 'rain') return { megi: 2, jangeo: 2 };
  if (wkey === 'cloud' && spotKey === 'deep') return Object.fromEntries(BIG_KIND.map((k) => [k, 2]));
  if (wkey === 'cloud' && spotKey === 'pool') return Object.fromEntries(BIG_KIND_RIVER.map((k) => [k, 2]));
  if (wkey === 'cloud' && spotKey === 'offshore') return Object.fromEntries(BIG_KIND_SEA.map((k) => [k, 2]));
  return null;
}
/** 🌬️ 바람 부는 날은 속임 입질(찌 떨림)이 한 번 더 */
export function nibbleExtra(wkey) {
  return wkey === 'wind' ? 1 : 0;
}

// ───────────── 📖 내 물고기 도감 (v367 · 원고 「이대로」) ─────────────

/** 도감 소개 한 줄 — 원고(2단계 기본안 10번)에서 공개 자료로 확인한 것 · 낚은 칸에만 보인다 */
export const INTRO = {
  chambung: '이름은 붕어지만 붕어와는 다른 물고기예요. 수컷이 돌 밑에 붙은 알을 지켜요.',
  napjaru: '민물조개 속에 알을 낳아요. 조개 안에서 알이 깨어나고, 어린 물고기로 자란 뒤 밖으로 나와요.', // 「3~4주」는 뺌 — 찾은 공공 자료가 칼납자루 것(Codex 171차)
  pirami: '맑은 냇물에 떼 지어 살아요. 알 낳을 때가 되면 수컷 지느러미가 붉은빛으로 물들어요.',
  bluegill: '북아메리카에서 들어온 물고기예요. 우리 물고기를 위협해서 「생태계교란 생물」로 정해졌어요.',
  bungeo: '우리나라 어디서나 사는 민물고기예요. 한 자(30.3 cm)가 넘으면 「월척」이라고 불러요.',
  ttokbung: '1972년에 일본에서 들여온 붕어예요. 붕어보다 몸이 높고 넓적해요.',
  dongjagae: '「빠가사리」라고도 불러요. 가슴지느러미 가시를 비벼서 소리를 내요.',
  kkeuri: 'W자처럼 굽은 입으로 작은 물고기를 잡아먹는 사냥꾼이에요.',
  nuchi: '입가에 수염이 한 쌍 있어요. 모래와 자갈이 깔린 큰 강 바닥 가까이에서 무리 지어 살아요.',
  bass: '정식 이름은 「큰입배스」예요. 입이 아주 커서 우리 물고기를 많이 잡아먹어요.',
  ingeo: '입가에 수염이 두 쌍 있어요. 수염이 없는 붕어와는 이걸로 가려요.',
  gangjun: '몸이 길고 은빛이에요. 입이 하늘 쪽을 향해 있어서 영어로는 「하늘을 보는 물고기(skygazer)」라고도 해요.',
  megi: '어른 메기는 수염이 두 쌍이에요(어릴 땐 세 쌍). 밤에 수염으로 먹이를 찾아요.',
  gamulchi: '물 밖 공기를 들이마셔 숨 쉴 수 있어요. 엄마 아빠가 함께 새끼를 지켜요.',
  ssogari: '표범 같은 무늬가 있고 맑은 강에 살아요. 「한강의 황쏘가리」는 천연기념물이에요.', // 지정 이름 그대로 (국가유산포털 · Codex 171차)
  jangeo: '먼 남쪽 바다(마리아나 제도 근처)에서 태어나 강으로 올라와 자라요. 다 크면 다시 바다로 가서 알을 낳아요.',
  // 🏞️ 강 (v368 원고 11번 — 「더 확인」 셋은 Codex 172차가 원문으로 확인 · 모래무지·산천어는 그때 더 정확히 고침)
  beodeulchi: '물이 차고 산소가 많은 산골짜기 냇물에 살아요.',
  chamgal: '우리나라에만 사는 물고기로, 2005년에 새 종으로 이름이 붙었어요. 물살이 빠른 곳을 좋아해요.',
  moraemuji: '먹이를 모래와 함께 입에 넣고, 모래는 아가미 덮개 밖으로 내보내요. 모래 속으로 쏙 파고들어 숨기도 해요.',
  chammaja: '누치와 같은 무리(누치속)예요. 맑게 흐르는 강의 모래·자갈 바닥 가까이에 살아요.',
  kkeokji: '우리나라에만 사는 물고기예요. 큰 돌 밑에 붙인 알을 수컷이 지켜요.',
  dongsari: '우리나라에만 사는 물고기예요. 바닥을 따라 헤엄치며 작은 물고기를 잡아먹어요.',
  sancheoneo: '차고 맑은 산골짜기 냇물에 살아요. 같은 종 가운데 바다에서 자라다가 알을 낳으러 강으로 돌아오는 무리는 「송어」라고 불러요.',
  eoreumchi: '우리나라에만 사는 천연기념물이에요. 여울 바닥에 자갈을 쌓아 알을 지키는 「산란탑」을 만들어요.',
  // 🌊 바다 (v369 원고 12번 「추천대로」 — FishBase·국립수산과학원·국립해양생물자원관 등 · Codex 173차: 표준어 「망둥이」로 · 볼락은 공공 자료에 맞게 「바위가 많은 바닷가」)
  munjeol: '바닷물과 민물이 만나는 강어귀나 바닷가의 펄·모래 바닥에 살아요. 흔히 「망둥이」라고 불러요.',
  jeongaeng: '우리나라 바다 어디에나 살아요. 옆줄을 따라 단단한 비늘(모비늘)이 한 줄로 늘어서 있어요.',
  godeung: '등은 푸르고 검은 물결무늬가 있어요. 떼를 지어 빠르게 헤엄쳐요.',
  noraemi: '바닷가 바위 사이 해초 숲에 살아요. 닮은 쥐노래미는 옆줄이 다섯 줄인데, 노래미는 한 줄이에요.',
  bollak: '눈이 아주 커요. 밤에 먹이를 찾고, 바위가 많은 바닷가에 살아요.',
  jopi: '흔히 「우럭」이라고 불러요. 알을 낳지 않고, 배 속에서 깨어난 새끼를 낳아요.',
  gamseong: '어릴 때는 수컷이다가 자라면서 암컷으로 바뀌는 것이 많아요. 50 cm까지 크는 데 10년쯤 걸려요.',
  nongeo: '바닷물과 민물을 오가요. 어린 농어는 강을 거슬러 오르기도 해요.',
  chamdom: '붉은 몸에 파란 점이 반짝여요. 26년을 산 기록도 있어요.',
};
/** 안 낚은 칸 힌트 — 별마다 (지금 자리 몫 SPOTS.w 그대로) · 남은 수는 쓰지 않는다 */
export const DEX_HINT = {
  1: '물가에서 자주 보여요.',
  2: '물가와 수초 밭에서 보여요.',
  3: '수초 밭이나 깊은 곳에서 만나요.',
  4: '깊은 곳에 살아요.',
  5: '깊은 곳에서 아주 가끔 나와요.',
};
/** 🏞️ 강 물고기 안 낚은 칸 힌트 (v368 — 강 자리 몫은 저수지와 같아서 자리 이름만 바꿈) */
export const DEX_HINT_RIVER = {
  1: '여울에서 자주 보여요.',
  2: '여울과 바위 밑에서 보여요.',
  3: '바위 밑이나 깊은 소에서 만나요.',
  4: '깊은 소에 살아요.',
  5: '깊은 소에서 아주 가끔 나와요.',
};
/** 🌊 바다 물고기 안 낚은 칸 힌트 (v369 — 바다 자리 몫도 저수지와 같아서 자리 이름만 바꿈) */
export const DEX_HINT_SEA = {
  1: '방파제 안쪽에서 자주 보여요.',
  2: '방파제 안쪽과 테트라포드에서 보여요.',
  3: '테트라포드나 먼 바다에서 만나요.',
  4: '먼 바다에 살아요.',
  5: '먼 바다에서 아주 가끔 나와요.',
};
/** 📸 사진만 찍고 놓아주는 물고기 카드 말 (v368 — 어름치) */
export const PHOTO_SAY = '우리나라에만 사는 천연기념물이라 놓아줘요.';
/**
 * 도감 칸 (순수 · 그리는 차례 = SPECIES 차례 — 저수지 16 → 강 8 → 바다 9) — 낚은 칸 { caught: true, n, best, d, intro } · 안 낚은 칸 { caught: false, hint }
 * home = 낚시터(화면이 나눠 그린다 · 강·바다는 열린 뒤에만) · photo = 📸 사진만 찍고 놓아주는 물고기
 */
export function dexRows(raw) {
  const lk = lakeOf(raw);
  return SPECIES.map((sp) => {
    const e = lk.dex[sp.key];
    const base = { key: sp.key, ko: sp.ko, star: sp.star, alien: !!sp.alien, home: sp.home, photo: !!sp.photo };
    const hint = (sp.home === 'river' ? DEX_HINT_RIVER : sp.home === 'sea' ? DEX_HINT_SEA : DEX_HINT)[sp.star] || '';
    return e ? { ...base, caught: true, n: e.n, best: e.best, d: e.d, intro: INTRO[sp.key] || '' } : { ...base, caught: false, hint };
  });
}

// ───────────── 하루 기록 칸 (db daily — 병합은 큰 쪽) ─────────────

/** 과목 → 그날 낸 문제·맞힌 문제 칸 */
export const FISH_DAY_Q = { math: ['fishMathQ', 'fishMathOk'], english: ['fishEnQ', 'fishEnOk'], korean: ['fishKorQ', 'fishKorOk'], nonsul: ['fishNsQ', 'fishNsOk'] };
/** 그날 맞힌 문제 (자리 열기용) */
export function okOfDay(daily) {
  return SUBJECTS.reduce((a, s) => a + nz(daily && daily[FISH_DAY_Q[s][1]]), 0);
}
/** 그날 🐟 물고기 수학 낸·맞힌 칸 (v367 — 수학 칸 안에 든 몫 · 따로 더하지 않는다) */
export const FISH_FM_Q = ['fishFmQ', 'fishFmOk'];
/** 그날 🏞️ 강에서 낚은 마리 칸 (v368 — fishCatch 안에 든 몫) */
export const FISH_RIVER = 'fishRiver';
/** 그날 🌊 바다에서 낚은 마리 칸 (v369 — fishCatch 안에 든 몫) */
export const FISH_SEA = 'fishSea';
/** 📤 사용 기록 한 줄 (순수 · 없으면 '') — 낚시 시간 · 잡은 마리(그 가운데 🏞️ 강 · 🌊 바다) · 과목마다 맞힌/낸(수학은 그 안의 🐟 물고기 수학도) · 🔒 더 준 분 */
export function lakeDayLine(d, fmtMin) {
  const f = typeof fmtMin === 'function' ? fmtMin : (s) => `${Math.round(nz(s) / 60)}분`;
  const asked = SUBJECTS.filter((s) => nz(d && d[FISH_DAY_Q[s][0]]) > 0);
  if (!nz(d && d.fishSec) && !nz(d && d.fishCatch) && !asked.length && !nz(d && d.fishBonus)) return '';
  const KO = { math: '수학', english: '영어', korean: '국어', nonsul: '논술' };
  const fm = (s) => (s === 'math' && nz(d[FISH_FM_Q[0]]) ? `(🐟 ${nz(d[FISH_FM_Q[1]])}/${nz(d[FISH_FM_Q[0]])})` : '');
  const q = asked.map((s) => `${KO[s]} ${nz(d[FISH_DAY_Q[s][1]])}/${nz(d[FISH_DAY_Q[s][0]])}${fm(s)}`).join(' · ');
  const away = [nz(d && d[FISH_RIVER]) ? `🏞️ 강 ${nz(d[FISH_RIVER])}` : '', nz(d && d[FISH_SEA]) ? `🌊 바다 ${nz(d[FISH_SEA])}` : ''].filter(Boolean);
  const rv = away.length ? `(${away.join(' · ')})` : '';
  return `🎣 낚시터 ${f(d.fishSec)} · 물고기 ${nz(d.fishCatch)}마리${rv}${q ? ` · 맞힘/낸 문제 ${q}` : ''}${nz(d.fishBonus) ? ` · 🔒 부모 +${nz(d.fishBonus)}분` : ''}`;
}

function nz(v) {
  const n = Math.floor(Number(v) || 0);
  return n > 0 ? n : 0;
}
