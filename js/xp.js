// ⚡ 경험치·레벨·포켓몬 잡기 규칙 + 아이 프로필(IndexedDB 'profile' 스토어, 백업에 포함)
// 프로필에는 💰 코인·🎒 가방(items)·포켓몬별 꾸밈(mons: gear·dye)도 들어 있음 (규칙·카탈로그는 items.js)
// 위쪽은 순수 규칙(테스트 가능), 아래쪽은 프로필 저장/갱신
import { getProfile, applyProfileDelta } from './db.js';
import { itemById, HP } from './items.js';

// ── 경험치 ──
export const XP = {
  puzzle: [30, 20, 10], // 퍼즐 정답: 틀린 횟수 0/1/2번
  puzzleRevealed: 3,    // 3번 틀려 정답 공개
  done: 2,              // 문장 하나 완료 (하루에 문장당 한 번)
  speak: 3,             // 말하기 통과
  speakStar: 5,         // 말하기 ⭐(80%↑) 통과
  recatch: 10,          // 이미 잡은 포켓몬을 또 잡음 (보너스)
  goal: 30,             // 오늘의 목표(문장 수) 달성
  journey: 50,          // 🏁 콘텐츠 마지막 문장까지 도착 (콘텐츠당 한 번)
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

/** 레벨 L에 도달하는 데 필요한 누적 XP (Lv1 = 0) */
export function xpToReach(level) {
  let sum = 0;
  for (let l = 1; l < level; l++) sum += xpForLevel(l);
  return sum;
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
  3: [6, 9, 3, 130, 197, 700, 448, 658, 778, 59, 68, 134, 135, 136, 196, 248, 282, 445, 149], // 149 망나뇽은 전설이 아니라 600족(마기라스·한카리아스급) — 아이 지적으로 수정
  4: [150, 151, 384, 144, 145, 146, 249, 250, 251, 382, 383, 483, 484, 487, 493, 643, 644, 716, 888],
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

// coins: 지금 가진 코인 / coinsEarned: 지금까지 번 코인(통계) / items: { 아이템id: 개수 } / mons: { 포켓몬id: { gear, dye, hp } } / partner: 🤝 파트너 포켓몬 id
const EMPTY = () => ({ id: 'me', xp: 0, caught: {}, throws: 0, catches: 0, coins: 0, coinsEarned: 0, items: {}, mons: {}, partner: null, updatedAt: 0 });
let profile = EMPTY();
let loaded = false;
// 저장은 "증분"으로: 메모리에는 바로 반영하고, 아직 안 쓴 증분을 모아 한 트랜잭션에서 최신 저장값에 더함 (다른 창이 쓴 것도 보존)
// 수치(xp·coins…)와 개수(caught·items)는 더하고, mons는 포켓몬별로 덮어씀, partner는 정해지면 그 값으로
const emptyDelta = () => ({ xp: 0, throws: 0, catches: 0, coins: 0, coinsEarned: 0, caught: {}, items: {}, mons: {}, partner: undefined });
let pending = emptyDelta();
let flushChain = Promise.resolve();

function mergeDelta(into, d) {
  into.xp += d.xp || 0;
  into.throws += d.throws || 0;
  into.catches += d.catches || 0;
  into.coins += d.coins || 0;
  into.coinsEarned += d.coinsEarned || 0;
  for (const id of Object.keys(d.caught || {})) into.caught[id] = (into.caught[id] || 0) + d.caught[id];
  for (const id of Object.keys(d.items || {})) into.items[id] = (into.items[id] || 0) + d.items[id];
  for (const id of Object.keys(d.mons || {})) into.mons[id] = { ...(into.mons[id] || {}), ...d.mons[id] };
  if (d.partner !== undefined) into.partner = d.partner;
}

function isEmptyDelta(d) {
  return !d.xp && !d.throws && !d.catches && !d.coins && !d.coinsEarned && d.partner === undefined
    && !Object.keys(d.caught).length && !Object.keys(d.items).length && !Object.keys(d.mons).length;
}

function addDelta(d) {
  mergeDelta(pending, d);
  if (loaded) flushProfile();
}

function fromStored(p) {
  return { ...EMPTY(), ...p, caught: { ...(p.caught || {}) }, items: { ...(p.items || {}) }, mons: { ...(p.mons || {}) } };
}

/** 모아둔 증분을 저장소에 더해 쓰고, 메모리 프로필을 저장소의 최신값으로 맞춤. 실패하면 증분을 되돌려 다음에 재시도 */
export function flushProfile() {
  flushChain = flushChain.then(async () => {
    const d = pending;
    if (isEmptyDelta(d)) return;
    pending = emptyDelta();
    try {
      const next = await applyProfileDelta(d);
      profile = fromStored(next);
    } catch (e) {
      console.warn('프로필 저장 실패 (다음에 재시도):', e);
      const p = pending; pending = d; mergeDelta(pending, p);
    }
  });
  return flushChain;
}

export async function initProfile() {
  try {
    const p = await getProfile();
    if (p) profile = fromStored(p);
  } catch { /* 저장소 문제면 메모리로만 */ }
  loaded = true;
  ensurePartner();
  return profile;
}

/** 🤝 파트너가 없는데 잡은 포켓몬이 있으면(파트너 기능 이전에 잡은 아이) 가장 많이 잡은 포켓몬을 파트너로 */
function ensurePartner() {
  if (profile.partner) return;
  const ids = Object.keys(profile.caught).filter((k) => profile.caught[k] > 0);
  if (!ids.length) return;
  const best = ids.reduce((a, b) => (profile.caught[b] > profile.caught[a] ? b : a));
  profile.partner = Number(best);
  addDelta({ partner: profile.partner });
}

export function getProfileSnapshot() {
  return { ...profile, caught: { ...profile.caught }, items: { ...profile.items }, mons: { ...profile.mons } };
}

export function getLevelInfo() {
  return { ...levelFromXp(profile.xp), xp: profile.xp };
}

/** XP 획득 → { gained, leveledUp, from, to, info } */
export function gainXp(amount) {
  const from = levelFromXp(profile.xp).level;
  const n = Math.max(0, Math.floor(amount || 0));
  profile.xp += n;
  const info = getLevelInfo();
  addDelta({ xp: n });
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
  const delta = { throws: 1, catches: 0, xp: 0, caught: {} };
  let partnerSet = false;
  if (caught) {
    profile.catches++;
    delta.catches = 1;
    first = !profile.caught[id];
    profile.caught[id] = (profile.caught[id] || 0) + 1;
    delta.caught[id] = 1;
    if (!first) { bonusXp = XP.recatch; profile.xp += bonusXp; delta.xp = bonusXp; }
    if (!profile.partner) { profile.partner = id; delta.partner = id; partnerSet = true; } // 🤝 처음 잡은 포켓몬이 자동으로 파트너
  }
  addDelta(delta);
  return { caught, chance, count: profile.caught[id] || 0, first, bonusXp, partnerSet, info: getLevelInfo() };
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

// ── 💰 코인 · 🎒 가방 · 꾸미기 ──

export function coins() {
  return profile.coins || 0;
}

/** 코인 획득 → { gained, coins } */
export function gainCoins(amount) {
  const n = Math.max(0, Math.floor(amount || 0));
  profile.coins = (profile.coins || 0) + n;
  profile.coinsEarned = (profile.coinsEarned || 0) + n;
  if (n) addDelta({ coins: n, coinsEarned: n });
  return { gained: n, coins: profile.coins };
}

export function itemCount(id) {
  return profile.items[id] || 0;
}

/** 가방: { 아이템id: 개수 } (0개는 뺌) */
export function inventory() {
  const out = {};
  for (const id of Object.keys(profile.items)) if (profile.items[id] > 0) out[id] = profile.items[id];
  return out;
}

/** 아이템 얻기 (🎁 상자 등, 코인 안 씀) */
export function addItem(id, n = 1) {
  if (!itemById(id) || n <= 0) return false;
  profile.items[id] = (profile.items[id] || 0) + n;
  addDelta({ items: { [id]: n } });
  return true;
}

/** 가방에서 하나 소모 (⚔️ 배틀 물약처럼 포켓몬 HP와 무관하게 쓰는 경우). 없으면 false */
export function consumeItem(id) {
  if ((profile.items[id] || 0) < 1) return false;
  profile.items[id] -= 1;
  addDelta({ items: { [id]: -1 } });
  return true;
}

/** 🛒 구매: 코인이 모자라면 false. 코인 차감과 가방 추가를 한 증분으로 */
export function buyItem(id) {
  const it = itemById(id);
  if (!it || (profile.coins || 0) < it.price) return false;
  profile.coins -= it.price;
  profile.items[id] = (profile.items[id] || 0) + 1;
  addDelta({ coins: -it.price, items: { [id]: 1 } });
  return true;
}

/** 포켓몬의 꾸밈·상태 → { gear, dye, hp } (없으면 null 필드, hp는 기본 100) */
export function getLook(monId) {
  const m = profile.mons[monId] || {};
  return { gear: m.gear || null, dye: m.dye || null, hp: hpOf(monId) };
}

// ── ❤️ HP · 🤝 파트너 · 🧪 물약 ──

export function getPartner() {
  return profile.partner || null;
}

/** 파트너 지정 (잡은 포켓몬만) */
export function setPartner(monId) {
  if (!profile.caught[monId]) return false;
  profile.partner = monId;
  addDelta({ partner: monId });
  return true;
}

/** 포켓몬 HP (기록이 없으면 가득) */
export function hpOf(monId) {
  const m = profile.mons[monId];
  const hp = m && typeof m.hp === 'number' ? m.hp : HP.max;
  return Math.max(0, Math.min(HP.max, hp));
}

export function isTired(monId) {
  return hpOf(monId) === 0;
}

/** HP 더하기/빼기 (0~max로 잘라 저장) → { from, to } */
export function changeHp(monId, delta) {
  const from = hpOf(monId);
  const to = Math.max(0, Math.min(HP.max, from + Math.round(delta || 0)));
  if (to !== from) {
    profile.mons[monId] = { ...(profile.mons[monId] || {}), hp: to };
    addDelta({ mons: { [monId]: { hp: to } } });
  }
  return { from, to };
}

/** 🧪 물약 먹이기 (가방에서 하나 소모) → { ok, from, to } */
export function usePotion(monId, potionId) {
  const it = itemById(potionId);
  if (!it || it.kind !== 'potion' || (profile.items[potionId] || 0) < 1) return { ok: false, from: hpOf(monId), to: hpOf(monId) };
  profile.items[potionId] -= 1;
  const from = hpOf(monId);
  const to = Math.min(HP.max, from + it.heal);
  profile.mons[monId] = { ...(profile.mons[monId] || {}), hp: to };
  addDelta({ items: { [potionId]: -1 }, mons: { [monId]: { hp: to } } });
  return { ok: true, from, to };
}

/** 🎀 장식 장착(gearId) / 벗기(null). 이전 장식은 가방으로, 새 장식은 가방에서. 가방에 없으면 false */
export function equipGear(monId, gearId) {
  const cur = getLook(monId).gear;
  if (cur === (gearId || null)) return true;
  if (gearId) {
    const it = itemById(gearId);
    if (!it || it.kind !== 'gear' || (profile.items[gearId] || 0) < 1) return false;
  }
  const items = {};
  if (cur) { profile.items[cur] = (profile.items[cur] || 0) + 1; items[cur] = 1; }
  if (gearId) { profile.items[gearId] -= 1; items[gearId] = (items[gearId] || 0) - 1; }
  profile.mons[monId] = { ...(profile.mons[monId] || {}), gear: gearId || null };
  addDelta({ items, mons: { [monId]: { gear: gearId || null } } });
  return true;
}

/** 🎨 염색(dyeId, 염색약 한 개 소모) / 원래 색으로(null, 무료). 염색약이 없으면 false */
export function applyDye(monId, dyeId) {
  if (getLook(monId).dye === (dyeId || null)) return true;
  const items = {};
  if (dyeId) {
    const it = itemById(dyeId);
    if (!it || it.kind !== 'dye' || (profile.items[dyeId] || 0) < 1) return false;
    profile.items[dyeId] -= 1;
    items[dyeId] = -1;
  }
  profile.mons[monId] = { ...(profile.mons[monId] || {}), dye: dyeId || null };
  addDelta({ items, mons: { [monId]: { dye: dyeId || null } } });
  return true;
}

// ── ⚔️ 배틀 ──

/** 포켓몬의 누적 패배 수 (3번이면 떠남) */
export function lossesOf(monId) {
  const m = profile.mons[monId];
  return m && m.losses ? m.losses : 0;
}

/** 배틀 승리: 상대 포켓몬을 얻음 → { first } */
export function battleWin(opponentId) {
  const first = !profile.caught[opponentId];
  profile.caught[opponentId] = (profile.caught[opponentId] || 0) + 1;
  addDelta({ caught: { [opponentId]: 1 } });
  return { first };
}

/** 배틀 패배: 그 포켓몬의 패배 +1, 정해진 횟수(lossesToLose)면 한 마리 잃고 패배 수 초기화 → { losses, lost } */
export function battleLoss(monId, lossesToLose = 3) {
  const cur = lossesOf(monId) + 1;
  if (cur >= lossesToLose) {
    const n = Math.max(0, (profile.caught[monId] || 0) - 1);
    if (n > 0) profile.caught[monId] = n; else delete profile.caught[monId];
    profile.mons[monId] = { ...(profile.mons[monId] || {}), losses: 0 };
    addDelta({ caught: { [monId]: -1 }, mons: { [monId]: { losses: 0 } } });
    return { losses: 0, lost: true };
  }
  profile.mons[monId] = { ...(profile.mons[monId] || {}), losses: cur };
  addDelta({ mons: { [monId]: { losses: cur } } });
  return { losses: cur, lost: false };
}

/** 백업 가져오기 뒤 다시 읽기 */
export async function reloadProfile() {
  await flushProfile();
  loaded = false;
  profile = EMPTY();
  pending = emptyDelta();
  return initProfile();
}
