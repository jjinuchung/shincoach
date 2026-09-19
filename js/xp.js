// ⚡ 경험치·레벨·포켓몬 잡기 규칙 + 아이 프로필(IndexedDB 'profile' 스토어, 백업에 포함)
// 프로필에는 💰 코인·🎒 가방(items)·포켓몬별 꾸밈(mons: gear·dye)도 들어 있음 (규칙·카탈로그는 items.js)
// 위쪽은 순수 규칙(테스트 가능), 아래쪽은 프로필 저장/갱신
import {
  getProfile, applyProfileDelta, applyHpChange, applyBattleLoss, applyPurchase, claimUnlockBase,
  hpChangeRule, battleLossRule, purchaseRule, normalizeUnlockBase,
} from './db.js';
import { itemById, HP, GOLDEN, POKEBALL, KEYSTONE, MEGASTONE, MUSHROOM, SOUP_MUSHROOMS } from './items.js';
import { anchorFor } from './pokemon.js';
import { findLocked } from './unlock.js';

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
// 등급은 "잡기 어려움" — 아래로 갈수록 적어야 한다 (흔함 36 > 보통 32 > 희귀 24 > 전설 8).
// 전설을 26마리나 두면 전설이 흔해져서 특별하지 않다 (아버님 지적) → 상징적인 8마리만 남기고
// 준전설은 희귀로, 나머지는 보통으로 내렸다. 명단에서 빼지는 않았으므로 잡은 포켓몬은 그대로 있다.
export const RARITY_IDS = {
  1: [1, 4, 7, 152, 155, 158, 393, 39, 52, 54, 58, 104, 129,
      172, 194, 280, 179, 37, 35, 63, 92, 66, 116, 187, 220, 19,
      // 1세대 인기 최종진화·이브이 6형제 — 아이가 자주 보는 얼굴이라 쉽게 만나게
      134, 135, 136, 196, 197, 700, 59, 68, 65, 142],
  2: [25, 133, 175, 143, 131, 94, 26, 95, 113,
      2, 5, 8, 447, 12, 147, 246, 123, 125, 137, 148, 91,
      212, 257, 260,
      // 전설에서 내려온 것 (준전설보다 한 단계 아래)
      888, 380, 381, 386, 645, 646, 800, 890],
  3: [6, 9, 3, 130, 448, 658, 778, 248, 282, 445, 149, 373, 376, 887, // 149 망나뇽은 전설이 아니라 600족(마기라스·한카리아스급) — 아이 지적으로 수정
      // 전설조(3신조·기타 전설) — 전설만큼은 아니어도 귀하게
      144, 145, 146, 251, 483, 484, 487, 643, 644, 716],
  4: [150, 151, 384, 249, 250, 382, 383, 493], // 가장 상징적인 8마리만 전설
};
const rarityById = {};
for (const r of Object.keys(RARITY_IDS)) for (const id of RARITY_IDS[r]) rarityById[id] = Number(r);

/** 포켓몬 id → 희귀도 1~4 (명단에 없으면 2) */
export function rarityOf(id) {
  const fixed = profile.mons && profile.mons[id] && profile.mons[id].rarity;
  return isRarity(fixed) ? fixed : (rarityById[id] || 2);
}

function isRarity(r) {
  return Number.isInteger(r) && r >= 1 && r <= 4;
}

// ── ⭐ 등급 옮기기: 아이가 신청하고 부모가 📊에서 승인한다 ──
// 등급은 곧 잡기 확률이라(흔함 45% … 전설 3%) 아이 마음대로 내리면 잡기의 긴장감이 사라진다.
// 그래서 아이는 "이건 다른 등급 같아요"를 남기고, 부모가 보고 결정한다.

/** 아이가 등급 신청 (같은 등급이면 신청을 지운다) */
export function askRarity(id, rarity) {
  if (!isRarity(rarity)) return null;
  const m = profile.mons[id] || (profile.mons[id] = {});
  if (rarity === rarityOf(id)) delete m.rarityAsk;
  else m.rarityAsk = rarity;
  addDelta({ mons: { [id]: { rarityAsk: m.rarityAsk || null } } });
  return m.rarityAsk || null;
}

/** 이 포켓몬에 대해 아이가 신청해 둔 등급 (없으면 null) */
export function rarityAskOf(id) {
  const m = profile.mons && profile.mons[id];
  return m && isRarity(m.rarityAsk) ? m.rarityAsk : null;
}

/** 지금 신청 중인 것 [{ id, from, to }] (부모 화면용) */
export function listRarityAsks() {
  const out = [];
  for (const [id, m] of Object.entries(profile.mons || {})) {
    if (m && isRarity(m.rarityAsk)) out.push({ id: Number(id), from: rarityOf(Number(id)), to: m.rarityAsk });
  }
  return out.sort((a, b) => a.id - b.id);
}

/** 부모가 결정: ok면 그 등급으로 옮기고, 아니면 신청만 지운다 */
export function decideRarity(id, ok) {
  const m = profile.mons[id];
  if (!m || !isRarity(m.rarityAsk)) return null;
  const to = m.rarityAsk;
  delete m.rarityAsk;
  if (ok) m.rarity = to;
  addDelta({ mons: { [id]: { rarityAsk: null, rarity: ok ? to : (m.rarity || null) } } });
  return ok ? to : null;
}

// ── ⭐ 메가진화 · 거다이맥스 ──
// 메가진화: 🔑 키스톤(트레이너, 하나면 충분) + 💠 메가스톤(포켓몬에게 끼움, 빼면 가방으로 돌아옴)
// 거다이맥스: 🍄 다이버섯 10개로 만든 🍲 다이스프를 먹인 포켓몬만 (한 번 먹으면 계속)

/** 🔑 키스톤을 가지고 있는지 (메가진화의 전제) */
export function hasKeystone() {
  return itemCount(KEYSTONE.id) > 0;
}

/** 💠 이 포켓몬이 메가스톤을 끼고 있는지 */
export function hasMegaStone(id) {
  const m = profile.mons[id];
  return !!(m && m.mega);
}

/** 🍲 이 포켓몬이 다이스프를 먹었는지 (거다이맥스 가능) */
export function hasGmax(id) {
  const m = profile.mons[id];
  return !!(m && m.gmax);
}

/** 💠 메가스톤 끼우기 / 빼기 (가방에서 빠지고, 빼면 돌아온다 — 장식과 같은 규칙) */
export async function equipMega(id, on) {
  const m = profile.mons[id] || (profile.mons[id] = {});
  if (on) {
    if (m.mega) return true;
    if (itemCount(MEGASTONE.id) <= 0) return false; // 빠른 거르기
    // 💠 메가스톤 하나로 두 창에서 둘 다 끼우지 않게 트랜잭션 안에서 판정
    const cost = { items: { [MEGASTONE.id]: 1 } };
    const gain = { mons: { [id]: { mega: true } } };
    const r = await runProfileOp(() => applyPurchase(cost, gain), (pf) => purchaseRule(pf, cost, gain));
    return r.ok;
  }
  if (!m.mega) return true;
  delete m.mega;
  profile.items[MEGASTONE.id] = (profile.items[MEGASTONE.id] || 0) + 1;
  addDelta({ items: { [MEGASTONE.id]: 1 }, mons: { [id]: { mega: false } } });
  return true;
}

/** 🍄 다이버섯 얻기 (하루 상한은 부르는 쪽에서 — track이 날짜를 안다) */
export function gainMushroom(n = 1) {
  if (n <= 0) return itemCount(MUSHROOM.id);
  addDelta({ items: { [MUSHROOM.id]: n } });
  profile.items[MUSHROOM.id] = (profile.items[MUSHROOM.id] || 0) + n;
  return itemCount(MUSHROOM.id);
}

/** 🍲 다이스프 만들어 먹이기 — 버섯 10개 소모, 그 포켓몬은 계속 거다이맥스할 수 있다 */
export async function makeSoup(id) {
  if (itemCount(MUSHROOM.id) < SOUP_MUSHROOMS) return false; // 빠른 거르기
  const m = profile.mons[id] || (profile.mons[id] = {});
  if (m.gmax) return false;
  // 🍄 열 개를 두 창에서 나눠 쓰지 못하게 트랜잭션 안에서 판정
  const cost = { items: { [MUSHROOM.id]: SOUP_MUSHROOMS } };
  const gain = { mons: { [id]: { gmax: true } } };
  const r = await runProfileOp(() => applyPurchase(cost, gain), (pf) => purchaseRule(pf, cost, gain));
  return r.ok;
}

/** ⚙ 등급 초기화: 옮긴 것과 신청을 모두 없앰 (원래 등급으로) */
export function resetRarity() {
  let n = 0;
  for (const [id, m] of Object.entries(profile.mons || {})) {
    if (!m || (!isRarity(m.rarity) && !isRarity(m.rarityAsk))) continue;
    delete m.rarity;
    delete m.rarityAsk;
    addDelta({ mons: { [id]: { rarity: null, rarityAsk: null } } });
    n++;
  }
  return n;
}

/**
 * 잡힐 확률 = 기본 확률 × 볼 배율 × (1 + 레벨×5%), 최대 90%
 * (🌟 황금 볼은 배율 2배 + 상한도 95% — 희귀·전설에서 티가 나야 "황금"이다)
 */
export function catchChance(rarity, level, mult = 1, cap = 0) {
  const base = (RARITY[rarity] || RARITY[2]).base;
  const limit = cap || (mult > 1 ? 0.95 : 0.9);
  return Math.min(limit, base * mult * (1 + 0.05 * Math.max(1, level)));
}

/** 이 볼로 던졌을 때 잡힐 확률 (마스터볼은 반드시 잡는다) */
export function ballChance(ballId, rarity, level) {
  const b = itemById(ballId) || POKEBALL;
  if (b.sure) return 1;
  return catchChance(rarity, level, b.mult || 1, b.cap || 0);
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

/**
 * 프로필 연산 하나(❤️ HP·⚔️ 패배·💰 구매)를 **저장소에서 판정해** 실행한다.
 * 두 창이 서로를 덮어쓰지 않으려면 판정이 트랜잭션 안에 있어야 한다.
 * 모아둔 증분을 먼저 쓰고(순서 보존) 연산을 실행한 뒤, 메모리 프로필을 결과로 맞춘다.
 *
 * 저장이 안 되면(오프라인·저장소 오류) **같은 순수 규칙을 메모리 프로필에** 돌려 이어간다.
 * 폴백을 손으로 따로 짜면 저장될 때와 규칙이 갈라진다 (실제로 usePotion이 그래서 어긋나 있었다).
 * @param {() => Promise<object>} op       저장소 연산 (db.apply*)
 * @param {((p:object) => object)|null} fallback 같은 일을 하는 순수 규칙. 메모리에 이미 반영했으면 null
 */
function runProfileOp(op, fallback) {
  const p = flushProfile().then(async () => {
    try {
      const r = await op();
      if (r && r.profile) profile = fromStored(r.profile);
      return r;
    } catch (e) {
      console.warn('프로필 저장 실패 (메모리로만 이어감):', e);
      return fallback ? fallback(profile) : { ok: true };
    }
  });
  flushChain = p.then(() => {}, () => {}); // 뒤이은 저장이 이 연산 뒤에 오도록
  return p;
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
export function catchAttempt(id, rng = Math.random, opts = {}) {
  const level = levelFromXp(profile.xp).level;
  // 🔴 어떤 볼로 던지는가 — 몬스터볼은 언제나 쓸 수 있고, 나머지는 가방에 있을 때만 쓰고 바로 소모한다
  const wanted = opts.ball || (opts.golden ? GOLDEN.id : POKEBALL.id);
  const ballItem = itemById(wanted) || POKEBALL;
  const used = ballItem.free || consumeItem(ballItem.id) ? ballItem : POKEBALL; // 가방에 없으면 그냥 몬스터볼
  const chance = ballChance(used.id, rarityOf(id), level);
  const caught = rollCatch(chance, rng);
  const golden = used.id === GOLDEN.id;
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
  return { caught, chance, count: profile.caught[id] || 0, first, bonusXp, partnerSet, golden, ball: used.id, info: getLevelInfo() };
}

/** ⚙ 잡기 연습용: 기록하지 않고 판정만 (확률은 실제와 같음) */
export function previewAttempt(id, rng = Math.random, opts = {}) {
  const level = levelFromXp(profile.xp).level;
  const ball = opts.ball || (opts.golden ? GOLDEN.id : POKEBALL.id);
  const chance = ballChance(ball, rarityOf(id), level);
  return { caught: rollCatch(chance, rng), chance, count: profile.caught[id] || 0, first: false, bonusXp: 0, golden: ball === GOLDEN.id, ball, info: null };
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
/** 🎟️ 직전 교환권을 산 시점의 학습 누적치 (없으면 null — 아직 기준선을 안 잡음) */
export function unlockBase() {
  return profile.unlockBase || null;
}

/**
 * 🎟️ 기준선이 없을 때 한 번만 박는다 (있으면 아무 일도 안 함).
 * 교환권 기능 전부터 쓰던 아이용 — 자세한 이유는 db.claimUnlockBase 주석.
 */
export function ensureUnlockBase(base) {
  if (profile.unlockBase) return Promise.resolve(false);
  return runProfileOp(() => claimUnlockBase(base), (pf) => {
    if (!pf.unlockBase) pf.unlockBase = normalizeUnlockBase(base);
    return { ok: true };
  }).then((r) => !!(r && r.ok));
}

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
export async function buyItem(id) {
  const it = itemById(id);
  if (!it || it.price <= 0) return false; // 🌟 황금 볼은 파는 물건이 아님 (복습으로만)
  if ((profile.coins || 0) < it.price) return false; // 빠른 거르기 (진짜 판정은 트랜잭션 안에서)
  const cost = { coins: it.price };
  const gain = { items: { [id]: 1 } };
  const r = await runProfileOp(() => applyPurchase(cost, gain), (pf) => purchaseRule(pf, cost, gain));
  return r.ok;
}

/**
 * 🎟️ 다음 영상 교환권 사기.
 * 가격은 카탈로그에서 가져오고(호출부가 못 정함), 이미 가진 것은 거절하고,
 * 학습 조건은 verify()로 **여기서 다시** 확인한다. 교환권은 가방에 들어가고
 * 아빠가 파일을 넣어 줄 때까지 남아 있다.
 * @param {() => Promise<boolean>} verify 지금도 조건을 채우는지 (저장소에서 새로 계산)
 */
export async function buyTicket(contentId, verify, base) {
  const c = findLocked(contentId);
  if (!c) return false;
  const price = c.price;                                     // 가격은 카탈로그가 정한다 (호출부가 못 정함)
  if (itemCount(`ticket_${contentId}`) > 0) return false;     // 이미 가진 교환권은 또 안 산다
  if ((profile.coins || 0) < price) return false;            // 빠른 거르기
  // 학습 조건은 **구매 경로 안에서** 다시 확인한다 — 화면의 버튼을 억지로 켜도 통과 못 한다
  if (verify && !(await verify())) return false;
  const cost = { coins: price };
  // 🎟️ 지금 누적치를 기준선으로 함께 넘긴다 → 다음 영상 조건은 0부터 다시 센다.
  // 코인을 못 치르면 purchaseRule이 기준선도 안 건드린다 (한 트랜잭션이라 갈라지지 않는다)
  const gain = { items: { [`ticket_${contentId}`]: 1 }, unlockBase: base || null };
  const r = await runProfileOp(() => applyPurchase(cost, gain), (pf) => purchaseRule(pf, cost, gain));
  return r.ok;
}

/** 포켓몬의 꾸밈·상태 → { gear, dye, hp } (없으면 null 필드, hp는 기본 100) */
export function getLook(monId) {
  const m = profile.mons[monId] || {};
  // anchor = 그림에서 자동으로 찾은 머리 위치 / gearPos = 아이가 직접 끌어다 놓은 자리(있으면 우선)
  return { gear: m.gear || null, dye: m.dye || null, hp: hpOf(monId), anchor: anchorFor(monId), gearPos: m.gearPos || null };
}

/**
 * 🎀 장식 위치를 아이가 정한 자리로 저장 (그림 크기에 대한 0~1 비율, 이모지 중심 기준).
 * 자동 추정은 머리 꼭대기만 알 뿐이라 포켓몬에 따라 손·등에 얹히기도 한다 — 그럴 때 직접 옮긴다.
 * pos가 null이면 자동 위치로 되돌림.
 */
export function setGearPos(monId, pos) {
  const m = profile.mons[monId] || (profile.mons[monId] = {});
  if (pos && Number.isFinite(pos.x) && Number.isFinite(pos.y)) {
    m.gearPos = { x: +pos.x.toFixed(3), y: +pos.y.toFixed(3) };
  } else {
    delete m.gearPos;
  }
  addDelta({ mons: { [monId]: { gearPos: m.gearPos || null } } });
  return m.gearPos || null;
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

/**
 * HP 더하기/빼기 (0~max로 잘라 저장) → { from, to }
 * 화면에는 바로 보여 주고(메모리), 저장은 **바뀐 만큼**을 트랜잭션 안에서 더한다
 * — 절대값으로 쓰면 두 창이 각각 −20·−10 한 것이 −10만 남는다.
 */
export function changeHp(monId, delta) {
  const r = hpChangeRule(profile, monId, delta, HP.max); // 메모리에 먼저 (화면에 바로 보여 준다)
  if (r.to !== r.from) runProfileOp(() => applyHpChange(monId, r.to - r.from, HP.max), null);
  return { from: r.from, to: r.to };
}

/** 🧪 물약 먹이기 (가방에서 하나 소모 — 소모와 회복이 한 트랜잭션) → { ok, from, to } */
export function usePotion(monId, potionId) {
  const it = itemById(potionId);
  if (!it || it.kind !== 'potion') return { ok: false, from: hpOf(monId), to: hpOf(monId) };
  const r = hpChangeRule(profile, monId, it.heal, HP.max, potionId); // 소모·회복을 한 규칙으로 (메모리)
  if (r.ok) runProfileOp(() => applyHpChange(monId, it.heal, HP.max, potionId), null);
  return r;
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

/**
 * 배틀 패배: 그 포켓몬의 패배 +1, 정해진 횟수(lossesToLose)면 한 마리 잃고 패배 수 초기화.
 * **누적과 판정을 트랜잭션 안에서** 한다 — 밖에서 세면 두 창이 각각 "3이니 잃음"으로 판정해
 * 두 마리를 잃거나, 반대로 패배 2가 1로 줄어든다.
 * @returns {Promise<{losses:number, lost:boolean}>}
 */
export async function battleLoss(monId, lossesToLose = 3) {
  const r = await runProfileOp(
    () => applyBattleLoss(monId, lossesToLose),
    (pf) => battleLossRule(pf, monId, lossesToLose),
  );
  return { losses: r.losses, lost: r.lost };
}

/** 백업 가져오기 뒤 다시 읽기 */
export async function reloadProfile() {
  await flushProfile();
  loaded = false;
  profile = EMPTY();
  pending = emptyDelta();
  return initProfile();
}
