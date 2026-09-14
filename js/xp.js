// ⚡ 경험치·레벨·포켓몬 잡기 규칙 + 아이 프로필(IndexedDB 'profile' 스토어, 백업에 포함)
// 위쪽은 순수 규칙(테스트 가능), 아래쪽은 프로필 저장/갱신
import { getProfile, putProfile } from './db.js';

// ── 경험치 ──
export const XP = {
  puzzle: [30, 20, 10], // 퍼즐 정답: 틀린 횟수 0/1/2번
  puzzleRevealed: 3,    // 3번 틀려 정답 공개
  done: 2,              // 문장 하나 완료 (하루에 문장당 한 번)
  speak: 3,             // 말하기 통과
  speakStar: 5,         // 말하기 ⭐(80%↑) 통과
  recatch: 10,          // 이미 잡은 포켓몬을 또 잡음 (보너스)
  goal: 30,             // 오늘의 목표(문장 수) 달성
};

// ── 연속 학습일(스트릭) ──
export const STREAK_MIN_DONE = 5; // 하루에 문장 5개 이상 완료해야 "학습한 날"

/** 날짜 문자열 YYYY-MM-DD → 하루 전 */
function prevDay(key) {
  const [y, m, d] = key.split('-').map(Number);
  const dt = new Date(y, m - 1, d - 1);
  const p = (n) => String(n).padStart(2, '0');
  return `${dt.getFullYear()}-${p(dt.getMonth() + 1)}-${p(dt.getDate())}`;
}

/** 어제까지의 연속 학습일 수 (오늘은 제외 — 오늘 채웠는지는 호출하는 쪽이 더함) */
export function streakBefore(dailyList, today, minDone = STREAK_MIN_DONE) {
  const ok = new Set((dailyList || []).filter((d) => d && d.date !== today && (d.doneKeys || []).length >= minDone).map((d) => d.date));
  let n = 0;
  let day = prevDay(today);
  while (ok.has(day)) { n++; day = prevDay(day); }
  return n;
}

/** 오늘까지 n일 연속일 때 보너스 XP: 10, 15, 20 … 최대 40 */
export function streakBonus(streak) {
  return Math.min(40, 10 + 5 * (Math.max(1, streak) - 1));
}

/** level → level+1 에 필요한 XP: Lv1→2 100, 레벨마다 +40 */
export function xpForLevel(level) {
  return 100 + 40 * (Math.max(1, level) - 1);
}

/** 누적 XP → { level, into(이번 레벨에서 쌓은 XP), need(레벨업까지 필요 총량) } */
export function levelFromXp(totalXp) {
  let level = 1;
  let rest = Math.max(0, Math.floor(totalXp || 0));
  while (rest >= xpForLevel(level)) { rest -= xpForLevel(level); level++; }
  return { level, into: rest, need: xpForLevel(level) };
}

/** 퍼즐 결과 → XP */
export function puzzleXp(result) {
  if (!result || !result.solved) return XP.puzzleRevealed;
  return XP.puzzle[Math.min(result.wrong || 0, XP.puzzle.length - 1)];
}

// ── 희귀도 ──
export const RARITY = [
  null,
  { stars: '⭐', label: '흔함', base: 0.45 },
  { stars: '⭐⭐', label: '보통', base: 0.30 },
  { stars: '⭐⭐⭐', label: '희귀', base: 0.15 },
  { stars: '⭐⭐⭐⭐', label: '전설', base: 0.03 },
];
// 명단(pokemon.js ROSTER) 확장 시 여기도 추가. 등급 없으면 보통(2)
export const RARITY_IDS = {
  1: [1, 4, 7, 152, 155, 158, 393, 39, 52, 54, 58, 104, 129],
  2: [25, 133, 175, 143, 131, 94, 26, 95, 113],
  3: [6, 9, 3, 130, 197, 700, 448, 658, 778, 59, 68, 134, 135, 136, 196, 248, 282, 445],
  4: [149, 150, 151, 384, 144, 145, 146, 249, 250, 251, 382, 383, 483, 484, 487, 493, 643, 644, 716, 888],
};
const rarityById = {};
for (const r of Object.keys(RARITY_IDS)) for (const id of RARITY_IDS[r]) rarityById[id] = Number(r);

/** 포켓몬 id → 희귀도 1~4 (명단에 없으면 2) */
export function rarityOf(id) {
  return rarityById[id] || 2;
}

/** 잡힐 확률 = 기본 확률 × (1 + 레벨×5%), 최대 90% */
export function catchChance(rarity, level) {
  const base = (RARITY[rarity] || RARITY[2]).base;
  return Math.min(0.9, base * (1 + 0.05 * Math.max(1, level)));
}

export function rollCatch(chance, rng = Math.random) {
  return rng() < chance;
}

// ── 프로필 (아이 한 명) ──

const EMPTY = () => ({ id: 'me', xp: 0, caught: {}, throws: 0, catches: 0, updatedAt: 0 });
let profile = EMPTY();
let loaded = false;

export async function initProfile() {
  try {
    const p = await getProfile();
    if (p) profile = { ...EMPTY(), ...p, caught: { ...(p.caught || {}) } };
  } catch { /* 저장소 문제면 메모리로만 */ }
  loaded = true;
  return profile;
}

export function getProfileSnapshot() {
  return { ...profile, caught: { ...profile.caught } };
}

export function getLevelInfo() {
  return { ...levelFromXp(profile.xp), xp: profile.xp };
}

function save() {
  profile.updatedAt = Date.now();
  putProfile({ ...profile, caught: { ...profile.caught } }).catch((e) => console.warn('프로필 저장 실패:', e));
}

/** XP 획득 → { gained, leveledUp, from, to, info } */
export function gainXp(amount) {
  const from = levelFromXp(profile.xp).level;
  profile.xp += Math.max(0, Math.floor(amount || 0));
  const info = getLevelInfo();
  if (loaded) save();
  return { gained: amount, leveledUp: info.level > from, from, to: info.level, info };
}

/** 몬스터볼 던지기 (기록됨) → { caught, chance, count(잡은 뒤 마릿수), first(처음 잡음), bonusXp } */
export function catchAttempt(id, rng = Math.random) {
  const level = levelFromXp(profile.xp).level;
  const chance = catchChance(rarityOf(id), level);
  const caught = rollCatch(chance, rng);
  profile.throws++;
  let first = false;
  let bonusXp = 0;
  if (caught) {
    profile.catches++;
    first = !profile.caught[id];
    profile.caught[id] = (profile.caught[id] || 0) + 1;
    if (!first) { bonusXp = XP.recatch; profile.xp += bonusXp; }
  }
  if (loaded) save();
  return { caught, chance, count: profile.caught[id] || 0, first, bonusXp, info: getLevelInfo() };
}

/** ⚙ 잡기 연습용: 기록하지 않고 판정만 (확률은 실제와 같음) */
export function previewAttempt(id, rng = Math.random) {
  const level = levelFromXp(profile.xp).level;
  const chance = catchChance(rarityOf(id), level);
  return { caught: rollCatch(chance, rng), chance, count: profile.caught[id] || 0, first: false, bonusXp: 0, info: null };
}

export function caughtCount(id) {
  return profile.caught[id] || 0;
}

/** 서로 다른 포켓몬 몇 마리 잡았는지 */
export function caughtKinds() {
  return Object.keys(profile.caught).filter((k) => profile.caught[k] > 0).length;
}

/** 백업 가져오기 뒤 다시 읽기 */
export async function reloadProfile() {
  loaded = false;
  profile = EMPTY();
  return initProfile();
}
