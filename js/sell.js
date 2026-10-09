// 🏪 5일장 · 💰 팔기 — 순수 규칙 (화면·저장소 없음. fusion.js·evolve.js·items.js만 import — 셋 다 아무것도 import하지 않는다 → db.js가 가져다 쓴다)
//
// 아버님 요청 (2026-10-05) "5일장에서 아이가 가진 아이템과 포켓몬도 팔 수 있게" → 기본값 9개 "이대로 진행":
//  · 장날에만 · 🏪 5일장 창의 세 번째 가판대
//  · 포켓몬은 2마리 이상 데리고 있는 종만 (마지막 한 마리는 남는다 — 교환 상인과 같은 규칙). 퓨전에 들어간 것은 못 판다(보유에서 이미 빠져 있다)
//  · 포켓몬 값은 등급으로만 (MON_PRICE) — 레벨·이로치·장식은 종마다 하나라 남는 쪽에 그대로 있다
//  · 아이템은 💰로 살 수 있는 것만, 산 값(코인)의 절반. 스톤이 든 물건도 코인 절반만 (🔷🔶 스톤은 배워야만 생긴다 — 돌려주지 않는다)
//    못 파는 것: 🔷🔶 스톤 · 🌟 황금 볼 · 🌕 · 🍄 (돈으로 못 사는 것) · 🎟️ 교환권 · 🌈 남은 횟수 · 끼고 있는 장식(가방에 없다)
//  · 장날마다 포켓몬은 SELL_MON_MAX마리까지 (한꺼번에 팔아 치우지 않게), 아이템은 한도 없음
//  · 판 코인은 coinsEarned(공부로 번 코인 통계)에 안 넣는다
//
// 저장 (집 규칙 — 메모리 profile-merge-invariants): 판 마릿수는 mons[id].sold 단조 카운터(haveOf에서 빼고 병합 max),
// 코인·가방(또는 보유)·기록 sales[장날][열쇠]를 한 트랜잭션에서. 기록은 합집합 — 열쇠가 "종류:id:그날 몇 번째"라 같은 판매는 같은 열쇠
import { marketOpen } from './fusion.js';
import { haveOf } from './evolve.js';
import { itemById } from './items.js';

/** 포켓몬 값 — 등급 번호(1 ⭐ · 2 ⭐⭐ · 3 ⭐⭐⭐ · 4 전설 · 5 🌌)로. ⭐ 하나가 퍼즐 두 개쯤 — 잡아서 파는 게 공부보다 나은 돈벌이가 되지 않게 */
export const MON_PRICE = [0, 10, 25, 60, 150, 150];
/** 장날마다 팔 수 있는 포켓몬 수 — 처음 5마리, 아버님 "10마리까지 허용"으로 늘림 (2026-10-05 v191) → "20마리까지 제한을 풀자" (2026-10-09 v219) */
export const SELL_MON_MAX = 20;

/** 등급 → 값 (모르는 등급은 ⭐⭐ 보통) */
export function monPrice(rarity) {
  const r = Number(rarity);
  return MON_PRICE[r] || MON_PRICE[2];
}

/** 아이템 하나를 팔면 받는 코인 (못 파는 것은 0) — 산 값(코인)의 절반, 내림 */
export function itemSellPrice(id) {
  const it = itemById(id);
  if (!it || it.unique || it.kind === 'stone' || it.kind === 'egg') return 0;
  const p = Number(it.price) || 0;
  return p > 0 ? Math.floor(p / 2) : 0;
}

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

/** 그 장날에 판 것 [{ key, kind, id, coins, at }] — 판 차례대로 */
export function salesOn(sales, dateKey) {
  const day = (sales || {})[dateKey] || {};
  return Object.keys(day).map((key) => ({ key, ...day[key] })).filter((s) => s && (s.kind === 'mon' || s.kind === 'item'))
    .sort((a, b) => (Number(a.at) || 0) - (Number(b.at) || 0) || a.key.localeCompare(b.key));
}

/** 그 장날에 판 포켓몬 수 */
export function monsSoldOn(sales, dateKey) {
  return salesOn(sales, dateKey).filter((s) => s.kind === 'mon').length;
}

/** 기록 열쇠 — "종류:id:그날 같은 것을 몇 번째로 팔았나". 같은 판매는 어느 창·백업에서나 같은 열쇠 (합집합이 두 번 세지 않는다) */
export function saleKey(day, kind, id) {
  let n = 1;
  while ((day || {})[`${kind}:${id}:${n}`]) n += 1;
  return `${kind}:${id}:${n}`;
}

/** 팔 수 있는 포켓몬 [{ id, have, rarity, price }] — 2마리 이상 데리고 있는 종, 등급 낮은 것부터 */
export function sellableMons(profile, ctx) {
  const caught = (profile && profile.caught) || {};
  const mons = (profile && profile.mons) || {};
  const out = [];
  for (const k of Object.keys(caught)) {
    const id = Number(k);
    if (!id || (ctx.known && !ctx.known(id))) continue;
    const have = haveOf(caught[k], mons[k]);
    if (have < 2) continue;
    const rarity = ctx.rarity(id);
    out.push({ id, have, rarity, price: monPrice(rarity) });
  }
  return out.sort((a, b) => a.rarity - b.rarity || a.id - b.id);
}

/** 팔 수 있는 아이템 [{ id, n, price }] — 가방에 있고 값이 있는 것, 비싼 것부터 */
export function sellableItems(bag) {
  const out = [];
  for (const [id, n] of Object.entries(bag || {})) {
    const cnt = Math.floor(Number(n) || 0);
    const price = itemSellPrice(id);
    if (cnt > 0 && price > 0) out.push({ id, n: cnt, price });
  }
  return out.sort((a, b) => b.price - a.price || a.id.localeCompare(b.id));
}

/** 두 번 누르는 사이 값이 바뀌었나 (Codex 32차 #5) — 보여 준 값(req.price)이 있으면 지금 값과 같아야 판다 */
function quoteOk(req, price) {
  return req.price === undefined || req.price === null || Number(req.price) === price;
}

/**
 * 💰 팔기 판정 — 저장된 프로필로 (db.sellRule이 트랜잭션 안에서 부른다)
 * @param {{day:string, kind:'mon'|'item', id:number|string}} req
 * @param {{rarity:Function, known?:Function}} ctx
 * @returns {{ok:boolean, why?:string, price?:number}} why: 'closed' | 'bad' | 'have' | 'limit' | 'none' | 'price'(보여 준 값과 다름 — price는 지금 값)
 */
export function sellCheck(profile, req, ctx) {
  const day = req && req.day;
  if (!marketOpen(day)) return { ok: false, why: 'closed' };
  if (req.kind === 'mon') {
    const id = Number(req.id);
    if (!id || (ctx.known && !ctx.known(id))) return { ok: false, why: 'bad' };
    if (haveOf((profile.caught || {})[id], (profile.mons || {})[id]) < 2) return { ok: false, why: 'have' };
    if (monsSoldOn(profile.sales, day) >= SELL_MON_MAX) return { ok: false, why: 'limit' };
    const price = monPrice(ctx.rarity(id));
    if (!quoteOk(req, price)) return { ok: false, why: 'price', price };
    return { ok: true, price };
  }
  if (req.kind === 'item') {
    const id = String(req.id || '');
    const price = itemSellPrice(id);
    if (!price) return { ok: false, why: 'bad' };
    if ((Number((profile.items || {})[id]) || 0) < 1) return { ok: false, why: 'none' };
    if (!quoteOk(req, price)) return { ok: false, why: 'price', price };
    return { ok: true, price };
  }
  return { ok: false, why: 'bad' };
}

/** 백업 병합 — 장날·열쇠마다 합집합 (같은 열쇠가 양쪽에 있으면 먼저 판 쪽). 한 번 팔았으면 계속 판 것 */
export function mergeSales(cur, rec) {
  const out = {};
  for (const src of [rec || {}, cur || {}]) {
    for (const day of Object.keys(src)) {
      if (!DAY_RE.test(day) || !src[day] || typeof src[day] !== 'object') continue;
      for (const key of Object.keys(src[day])) {
        const s = src[day][key];
        if (!s || typeof s !== 'object') continue;
        const have = out[day] && out[day][key];
        if (have && (Number(have.at) || 0) && (Number(have.at) || 0) <= (Number(s.at) || Infinity)) continue;
        (out[day] = out[day] || {})[key] = { ...s };
      }
    }
  }
  return out;
}

/**
 * 📊 부모 화면 — 최근 장날 maxDays번의 판 것 [{ day, total, mons, items, list: [{ name, coins }] }] (최근 장날부터)
 * @param {Object<string, Array>} byDay salesOn으로 편 { 장날: [...] }
 * @param {(id:number) => string} monName
 */
export function salesReport(byDay, monName, maxDays = 3) {
  return Object.keys(byDay || {}).filter((d) => DAY_RE.test(d) && (byDay[d] || []).length).sort().reverse().slice(0, maxDays)
    .map((day) => {
      const list = byDay[day].map((s) => {
        const it = s.kind === 'item' ? itemById(s.id) : null;
        const name = s.kind === 'mon' ? monName(Number(s.id)) : (it ? `${it.emoji} ${it.ko}` : String(s.id));
        return { name, coins: Number(s.coins) || 0 };
      });
      return {
        day,
        total: list.reduce((a, x) => a + x.coins, 0),
        mons: byDay[day].filter((s) => s.kind === 'mon').length,
        items: byDay[day].filter((s) => s.kind === 'item').length,
        list,
      };
    });
}

export function copySales(s) {
  const out = {};
  for (const day of Object.keys(s || {})) {
    out[day] = {};
    for (const k of Object.keys(s[day] || {})) out[day][k] = { ...s[day][k] };
  }
  return out;
}
