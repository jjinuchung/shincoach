// 🏪 5일장 2단계 · 🤝 교환 상인 — 순수 규칙 (화면·저장소 없음. fusion.js·evolve.js만 import — 둘 다 아무것도 import하지 않는다 → db.js가 가져다 쓴다)
//
// 진우 요청 (2026-10-04) → 아버님 "진행하자" (2026-10-05, 기본값 7개 그대로):
//  · 장날마다 상인 3명 — 자리마다 다루는 등급이 정해져 있다 (⭐ 흔함 · ⭐⭐ 보통 · ⭐⭐⭐ 희귀). 이름은 날짜로 일곱 중 셋
//  · 상인이 주는 것(get) = 그 등급에서 진우 도감에 아직 없는 종 · 진우 레벨로 열린 것 · 원작 전설·환상·🌌 울트라비스트는 안 준다
//  · 진우가 주는 것(give) = 진우가 고른다 — 같은 등급, 2마리 이상 데리고 있는 종 (마지막 한 마리는 안 가져간다)
//  · 🔢 수학 포켓몬은 수학 포켓몬끼리 — 수학에서만 만나는 얼굴이 영어 중복으로 새지 않게
//  · 공짜 · 상인마다 장날에 한 번 · 되돌리기 없음 (원작 교환처럼)
//
// 저장 (집 규칙 — 메모리 profile-merge-invariants): 보낸 수는 mons[give].traded 단조 카운터(haveOf에서 빼고 병합 max),
// 받은 종은 caught +1, 기록 trades[장날][자리]는 합집합. 판정은 db.tradeRule 한 트랜잭션에서 저장된 프로필로 다시 한다
import { marketOpen } from './fusion.js';
import { haveOf } from './evolve.js';

/** 상인 일곱 — 게임 트레이너 직업 이름 (실제 사람·가족 이름은 쓰지 않는다) */
export const TRADERS = [
  { id: 'youngster', emoji: '🧢', name: '반바지꼬마' }, // 게임 표기대로 붙여 쓴다 (Codex 31차 #7)
  { id: 'hiker', emoji: '⛰️', name: '등산가' },
  { id: 'fisher', emoji: '🎣', name: '낚시꾼' },
  { id: 'scientist', emoji: '🔬', name: '과학자' },
  { id: 'aroma', emoji: '🌸', name: '아로마 아가씨' },
  { id: 'bugkid', emoji: '🐛', name: '곤충채집소년' }, // 포켓몬코리아 공식 표기
  { id: 'gentleman', emoji: '🎩', name: '신사' },
];

/** 상인 자리 → 다루는 등급 (⭐ 흔함 · ⭐⭐ 보통 · ⭐⭐⭐ 희귀). ⭐⭐⭐⭐ 전설·🌌 울트라비스트는 다루지 않는다 */
export const TRADE_TIERS = [1, 2, 3];

/** 하루에 상인 몇 명 */
export const TRADER_COUNT = TRADE_TIERS.length;

/** 문자열 → 32비트 수 (FNV-1a). 같은 날이면 언제 열어도, 어느 창에서 열어도 같은 순서 */
export function hash32(s) {
  let h = 0x811c9dc5;
  const t = String(s);
  for (let i = 0; i < t.length; i++) {
    h ^= t.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

/** 그 장날의 상인 셋 (자리 순서) */
export function tradersFor(dateKey) {
  return TRADERS
    .map((t) => ({ t, k: hash32(`${dateKey}|who|${t.id}`) }))
    .sort((x, y) => x.k - y.k || (x.t.id < y.t.id ? -1 : 1))
    .slice(0, TRADER_COUNT)
    .map((x) => x.t);
}

/** 상인 자리가 맞는 번호인가 (0·1·2) */
export function slotOk(slot) {
  return Number.isInteger(slot) && slot >= 0 && slot < TRADER_COUNT;
}

/**
 * ctx — 명단의 정적인 사실은 밖에서 받는다 (이 모듈은 명단·등급표를 import하지 않는다 — 순환 없음):
 *   rarity(id) → 1~5 · subject(id) → 'math' | 'english' · allowed(id) → 명단에 있고 원작 전설·환상·🌌가 아닌가 ·
 *   unlocked(id) → 진우 레벨로 열렸나
 */

/** 진우가 이 등급 상인에게 줄 수 있나 — 2마리 이상 데리고 있고(마지막 한 마리는 안 준다), 같은 등급, 전설·🌌 아님 */
export function canGive(profile, id, tier, ctx) {
  const i = Number(id);
  return !!i && haveOf((profile.caught || {})[i], (profile.mons || {})[i]) >= 2 && ctx.rarity(i) === tier && ctx.allowed(i);
}

/** 상인이 이것을 줄 수 있나 — 진우 도감에 아직 없고, 같은 등급, 전설·🌌 아님, 진우 레벨로 열렸다 */
export function canGet(profile, id, tier, ctx) {
  const i = Number(id);
  return !!i && !((Number((profile.caught || {})[i]) || 0) > 0) && ctx.rarity(i) === tier && ctx.allowed(i) && ctx.unlocked(i);
}

/** 진우가 줄 수 있는 것 [id] — 같은 등급·같은 과목 (id 순) */
export function givesFor(profile, ids, tier, subject, ctx) {
  return (ids || []).filter((id) => canGive(profile, id, tier, ctx) && ctx.subject(id) === subject).sort((a, b) => a - b);
}

/**
 * 그 장날·자리 상인이 가져온 것 — { slot, tier, who, get, subject, gives, why }.
 * 후보를 (장날, 자리, 종)으로 섞은 순서에서 진우가 바꿀 수 있는 과목의 첫 종을 고른다 (없으면 그냥 첫 종 — 보여 주되 못 바꾼다).
 * 같은 날 다시 열어도 같다. 그 종을 그 사이 잡았으면 다음 종으로 넘어간다.
 * 못 가져왔으면 get = null과 까닭 why (Codex 31차 #6 — 까닭마다 아이에게 하는 말이 다르다):
 *   'all' 그 등급을 다 모았다 · 'level' 남은 것은 레벨이 더 올라야 열린다 · 'art' 남은 것의 그림이 이 기기에 없다
 * @param {object} profile
 * @param {string} dateKey
 * @param {number} slot
 * @param {number[]} ids 명단 id
 * @param {object} ctx rarity·subject·allowed·unlocked (+ art: 그림이 있는 id Set — 넘겼으면 **비어 있어도** 거른다)
 */
export function offerFor(profile, dateKey, slot, ids, ctx) {
  const tier = TRADE_TIERS[slot];
  const who = tradersFor(dateKey)[slot];
  // 그림 목록을 넘겼으면 비어 있어도 거른다 — 그림이 하나도 없는 기기에서 "?" 포켓몬을 가져와 바꿔 주었다 (Codex 31차 #2)
  const art = ctx.art instanceof Set ? ctx.art : null;
  const caught = profile.caught || {};
  const base = (ids || []).map(Number).filter((id) => id && !((Number(caught[id]) || 0) > 0) && ctx.rarity(id) === tier && ctx.allowed(id));
  const open = base.filter((id) => ctx.unlocked(id));
  const pool = open
    .filter((id) => !art || art.has(id))
    .map((id) => ({ id, k: hash32(`${dateKey}|${slot}|${id}`) }))
    .sort((x, y) => x.k - y.k || x.id - y.id)
    .map((x) => x.id);
  if (!pool.length) return { slot, tier, who, get: null, subject: null, gives: [], why: !base.length ? 'all' : !open.length ? 'level' : 'art' };
  const giveBy = new Map();
  const gives = (s) => { if (!giveBy.has(s)) giveBy.set(s, givesFor(profile, ids, tier, s, ctx)); return giveBy.get(s); };
  const get = pool.find((id) => gives(ctx.subject(id)).length > 0) ?? pool[0];
  const subject = ctx.subject(get);
  return { slot, tier, who, get, subject, gives: gives(subject) };
}

/**
 * "한 번 더" 누른 것이 **같은 거래**인가 — 장날·자리·줄 것·받을 것이 모두 같고 아직 ms 안 (Codex 31차 #4).
 * 받을 것을 빼고 보면, 그 사이 다른 창에서 상인 포켓몬을 잡아 상인이 다른 포켓몬을 가져왔을 때 한 번만 눌러도 바뀌었다
 */
export function sameDeal(arm, deal, now, ms = 5000) {
  return !!arm && !!deal && arm.day === deal.day && arm.slot === deal.slot && arm.give === deal.give && arm.get === deal.get && now - arm.at < ms;
}

/**
 * 🤝 교환 판정 — 저장된 프로필로 (db.tradeRule이 트랜잭션 안에서 부른다)
 * @param {{day:string, slot:number, give:number, get:number}} req
 * @returns {{ok:boolean, why?:string}} why: 'closed' | 'slot' | 'done' | 'same' | 'got' | 'offer' | 'have' | 'subject'
 */
export function tradeCheck(profile, req, ctx) {
  const day = req && req.day;
  if (!marketOpen(day)) return { ok: false, why: 'closed' };
  const slot = Number(req.slot);
  if (!slotOk(slot)) return { ok: false, why: 'slot' };
  if (((profile.trades || {})[day] || {})[slot]) return { ok: false, why: 'done' };
  const give = Number(req.give), get = Number(req.get);
  if (!give || !get || give === get) return { ok: false, why: 'same' };
  const tier = TRADE_TIERS[slot];
  if ((Number((profile.caught || {})[get]) || 0) > 0) return { ok: false, why: 'got' };
  if (!canGet(profile, get, tier, ctx)) return { ok: false, why: 'offer' };
  if (haveOf((profile.caught || {})[give], (profile.mons || {})[give]) < 2) return { ok: false, why: 'have' };
  if (!canGive(profile, give, tier, ctx)) return { ok: false, why: 'offer' };
  if (ctx.subject(give) !== ctx.subject(get)) return { ok: false, why: 'subject' };
  return { ok: true };
}

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

/** 백업 병합 — 장날·자리마다 합집합 (같은 자리가 양쪽에 있으면 먼저 바꾼 쪽). 한 번 바꿨으면 계속 바꾼 것 */
export function mergeTrades(cur, rec) {
  const out = {};
  for (const src of [rec || {}, cur || {}]) {
    for (const day of Object.keys(src)) {
      if (!DAY_RE.test(day) || !src[day] || typeof src[day] !== 'object') continue;
      for (const k of Object.keys(src[day])) {
        const slot = Number(k);
        const t = src[day][k];
        if (!slotOk(slot) || !t || typeof t !== 'object') continue;
        const have = out[day] && out[day][slot];
        if (have && (Number(have.at) || 0) && (Number(have.at) || 0) <= (Number(t.at) || Infinity)) continue;
        (out[day] = out[day] || {})[slot] = { ...t };
      }
    }
  }
  return out;
}

export function copyTrades(t) {
  const out = {};
  for (const day of Object.keys(t || {})) {
    out[day] = {};
    for (const k of Object.keys(t[day] || {})) out[day][k] = { ...t[day][k] };
  }
  return out;
}

/** 그 장날의 교환 기록 { 자리: { who, give, get, at } } */
export function tradesOn(trades, dateKey) {
  return (trades || {})[dateKey] || {};
}
