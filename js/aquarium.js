// 🐠 진우 아쿠아리움 — 순수 규칙 (v399 · 2026-11-07 아버님 요청 → 기본안 · 1안+2안 새 시안 「이대로」)
// 낚시터 안 놀이 — 낚은 물고기로 수조를 채우고 💰로 단계를 올리고 장식을 산다 · 문제 없음 · 시계 없음 · 벌칙 없음(물고기가 아프거나 죽지 않는다)
// 저장은 둘로 나뉜다 (프로필 병합 규칙 그대로):
//   가방 profile.items — 단계 aq_t2~aq_t8 · 산 장식 aq_… 개수 → 💰와 같은 쪽으로 병합되어 돈과 물건이 어긋나지 않는다(옷·채비와 같다)
//   놓은 자리 profile.aquarium { fish: [종…], deco: [칸마다 장식 id 또는 ''], at } → 바꾼 시각이 늦은 쪽 · 안 가진 것은 읽을 때 aquaOf가 뺀다
// 물고기는 📖 낚시 도감에서 고른다 — 같은 종은 낚은 수만큼 · 넣어도 도감은 줄지 않는다 · 📸 어름치는 천연기념물이라 수조 대신 벽 액자로
// ★ fishing.js 말고는 아무것도 import하지 않는다 — 시험이 DOM·IndexedDB 없이 부른다

import { dexRows, lakeOf, speciesOf } from './fishing.js';

/** 여덟 단계 (기본안 표 그대로) — size 장면 폭에 대한 수조 폭 · fish 넣을 수 있는 마리 · deco 놓을 수 있는 장식 칸 · price 💰 */
export const TANKS = [
  { n: 1, key: 'ruin', ko: '폐가 아쿠아리움', short: '폐가', size: 0.52, fish: 5, deco: 3, price: 0, mat: '녹슨 철 · 금 간 유리 · 나무 상자 받침' },
  { n: 2, key: 'plain', ko: '일반 아쿠아리움', short: '일반', size: 0.58, fish: 8, deco: 5, price: 500, mat: '검은 틀 · 맑은 유리 · 나무 장 받침' },
  { n: 3, key: 'iron', ko: '철 아쿠아리움', short: '철', size: 0.64, fish: 12, deco: 7, price: 1000, mat: '리벳을 박은 철판 · 배관 · 철 받침' },
  { n: 4, key: 'emerald', ko: '에메랄드 아쿠아리움', short: '에메랄드', size: 0.7, fish: 16, deco: 9, price: 2000, mat: '깎은 초록 보석 틀 · 보석 받침' },
  { n: 5, key: 'gold', ko: '금 아쿠아리움', short: '금', size: 0.76, fish: 20, deco: 11, price: 3500, mat: '금 틀 · 왕관 장식 · 사자 발 받침' },
  { n: 6, key: 'diamond', ko: '다이아몬드 아쿠아리움', short: '다이아몬드', size: 0.82, fish: 24, deco: 13, price: 5000, mat: '빛나는 다이아몬드 조각 틀' },
  { n: 7, key: 'ultra', ko: '초특급 아쿠아리움', short: '초특급', size: 0.89, fish: 28, deco: 15, price: 7500, mat: '철 · 에메랄드 · 금 · 다이아몬드를 한데 맞춘 틀' },
  { n: 8, key: 'space', ko: '우주 아쿠아리움', short: '우주', size: 0.96, fish: 32, deco: 18, price: 10000, mat: '초특급과 같은 틀 · 뒤로 우주가 보임' },
];
export const TOP_TIER = TANKS.length;
/** 🐠 단계를 올렸다는 표시 — 가방 칸 이름 */
export const tierItem = (n) => `aq_t${n}`;
/** 꾸미기 가게 — art는 aquaart.js의 그림 · group 묶음 · max 가질 수 있는 개수(수초·작은 것은 여럿 · 큰 구조물은 하나) */
export const DECO_GROUPS = [['plant', '🌿 수초와 산호'], ['small', '🐚 돌과 작은 것'], ['big', '⚓ 큰 구조물'], ['space', '🌙 우주']];
export const DECO = [
  { id: 'aq_weed', art: 'weed', ko: '해초', price: 50, group: 'plant', max: 6 },
  { id: 'aq_kelp', art: 'kelp', ko: '다시마', price: 80, group: 'plant', max: 6 },
  { id: 'aq_coral', art: 'coral', ko: '붉은 산호', price: 120, group: 'plant', max: 6 },
  { id: 'aq_coralpink', art: 'coralpink', ko: '분홍 산호', price: 120, group: 'plant', max: 6 },
  { id: 'aq_coralblue', art: 'coralblue', ko: '파란 산호', price: 150, group: 'plant', max: 6 },
  { id: 'aq_anemone', art: 'anemone', ko: '말미잘', price: 150, group: 'plant', max: 6 },
  { id: 'aq_stone', art: 'stone', ko: '둥근 돌', price: 60, group: 'small', max: 6 },
  { id: 'aq_star', art: 'star', ko: '불가사리', price: 80, group: 'small', max: 6 },
  { id: 'aq_clam', art: 'clam', ko: '조개', price: 100, group: 'small', max: 6 },
  { id: 'aq_jar', art: 'jar', ko: '항아리', price: 150, group: 'small', max: 6 },
  { id: 'aq_anchor', art: 'anchor', ko: '닻', price: 200, group: 'small', max: 3 },
  { id: 'aq_arch', art: 'arch', ko: '바위 아치', price: 200, group: 'small', max: 3 },
  { id: 'aq_chest', art: 'chest', ko: '보물 상자', price: 500, group: 'big', max: 1 },
  { id: 'aq_diver', art: 'diver', ko: '잠수부 인형', price: 600, group: 'big', max: 1 },
  { id: 'aq_tower', art: 'tower', ko: '등대', price: 800, group: 'big', max: 1 },
  { id: 'aq_pillar', art: 'pillar', ko: '유적 기둥', price: 800, group: 'big', max: 1 },
  { id: 'aq_wreck', art: 'wreck', ko: '침몰선', price: 1500, group: 'big', max: 1 },
  { id: 'aq_castle', art: 'castle', ko: '바닷속 성', price: 2000, group: 'big', max: 1 },
  { id: 'aq_moon', art: 'moon', ko: '달 바위', price: 500, group: 'space', max: 3 },
  { id: 'aq_rocket', art: 'rocket', ko: '작은 로켓', price: 2000, group: 'space', max: 1 },
];
const DECO_BY = Object.fromEntries(DECO.map((d) => [d.id, d]));
export function decoOf(id) {
  return Object.prototype.hasOwnProperty.call(DECO_BY, id) ? DECO_BY[id] : null;
}
/** 저장값에서 받아 줄 칸 수 — 깨진 큰 값이 저장소를 키우지 않게 */
const RAW_MAX = 64;
const isObj = (v) => !!v && typeof v === 'object' && !Array.isArray(v);
const nz = (v) => { const n = Math.floor(Number(v)); return Number.isFinite(n) && n > 0 ? n : 0; };
const rawOf = (v) => {
  const r = isObj(v) ? v : {};
  const list = (a) => (Array.isArray(a) ? a.slice(0, RAW_MAX).map((x) => (typeof x === 'string' ? x : '')) : []);
  return { fish: list(r.fish), deco: list(r.deco), at: Math.max(0, Number(r.at) || 0) };
};
/** 복사 (프로필을 옮길 때) */
export function copyAqua(raw) {
  return rawOf(raw);
}
/** 병합 (순수) — 놓은 자리는 바꾼 시각이 늦은 쪽(같으면 앞쪽) · 가진 것과 어긋나면 읽을 때 aquaOf가 고친다 · 둘 다 없으면 null */
export function mergeAqua(a, b) {
  if (!isObj(a) && !isObj(b)) return null;
  if (!isObj(a)) return rawOf(b);
  if (!isObj(b)) return rawOf(a);
  const x = rawOf(a);
  const y = rawOf(b);
  return y.at > x.at ? y : x;
}
/** 지금 단계 — 가방의 표시가 2단계부터 끊기지 않고 이어진 데까지 (옛 백업이 중간을 지워도 건너뛰지 않게) */
export function tierOf(p) {
  const items = isObj(p && p.items) ? p.items : {};
  let n = 1;
  while (n < TOP_TIER && nz(items[tierItem(n + 1)]) > 0) n += 1;
  return n;
}
/** 가진 장식 수 */
export function decoCount(p, id) {
  return decoOf(id) ? nz(isObj(p && p.items) ? p.items[id] : 0) : 0;
}
/**
 * 고쳐 읽은 수조 — { tier, tank, fish: [종…], deco: [칸마다 id 또는 ''], at } ·
 * 도감에 없는 종 · 낚은 수보다 많은 마리 · 📸 사진 종 · 칸을 넘친 것 · 안 가진 장식은 빠진다(저장값은 그대로 — 다시 낚거나 사면 되돌아오게 하려면 쓰기 전까지 남겨 둔다)
 */
export function aquaOf(p) {
  const tier = tierOf(p);
  const tank = TANKS[tier - 1];
  const r = rawOf(p && p.aquarium);
  const { dex } = lakeOf(p && p.fishing);
  const used = {};
  const fish = [];
  for (const k of r.fish) {
    const sp = speciesOf(k);
    if (!sp || sp.photo || !dex[k] || fish.length >= tank.fish) continue;
    if ((used[k] || 0) >= dex[k].n) continue;
    used[k] = (used[k] || 0) + 1;
    fish.push(k);
  }
  const put = {};
  const deco = [];
  for (let i = 0; i < tank.deco; i++) {
    const id = r.deco[i] || '';
    if (id && (put[id] || 0) < decoCount(p, id)) { put[id] = (put[id] || 0) + 1; deco.push(id); } else deco.push('');
  }
  return { tier, tank, fish, deco, at: r.at };
}
const keep = (p, a, now) => {
  p.aquarium = { fish: a.fish, deco: a.deco, at: Math.max(Number(now) || 0, a.at + 1) }; // 바꾼 시각은 늘 앞으로(병합 늦은 쪽)
  return aquaOf(p);
};
/**
 * ⬆️ 다음 단계로 (프로필 규칙 — houseDo 안에서) → { ok, tier } · want = 화면이 보여 준 단계 ·
 * why: 'top' 맨 위 · 'short' 💰 모자람 · 'changed' 다른 창이 먼저 올림(보여 주지 않은 값으로 사지 않게 — Codex 201차)
 */
export function aquaTierRule(p, want) {
  const tier = tierOf(p);
  if (want !== undefined && want !== tier + 1) return { ok: false, why: 'changed' };
  if (tier >= TOP_TIER) return { ok: false, why: 'top' };
  const next = TANKS[tier];
  const have = nz(p.coins);
  if (have < next.price) return { ok: false, why: 'short' };
  p.coins = have - next.price;
  if (!isObj(p.items)) p.items = {};
  p.items[tierItem(next.n)] = 1;
  return { ok: true, tier: next.n };
}
/** 🛒 장식 사기 → { ok, have } · why: 'unknown' · 'max' 더 가질 수 없음 · 'short' */
export function aquaBuyRule(p, id) {
  const d = decoOf(id);
  if (!d) return { ok: false, why: 'unknown' };
  const n = decoCount(p, id);
  if (n >= d.max) return { ok: false, why: 'max' };
  const have = nz(p.coins);
  if (have < d.price) return { ok: false, why: 'short' };
  p.coins = have - d.price;
  if (!isObj(p.items)) p.items = {};
  p.items[id] = n + 1;
  return { ok: true, have: n + 1 };
}
/** 🐟 물고기 넣기 → { ok, aqua } · why: 'bad' 모르는 종 · 'photo' 사진만 · 'none' 낚은 수만큼 다 넣음 · 'full' 자리 없음 */
export function aquaPutRule(p, key, now) {
  const sp = speciesOf(key);
  if (!sp) return { ok: false, why: 'bad' };
  if (sp.photo) return { ok: false, why: 'photo' };
  const a = aquaOf(p);
  const e = lakeOf(p.fishing).dex[key];
  if (!e || a.fish.filter((k) => k === key).length >= e.n) return { ok: false, why: 'none' };
  if (a.fish.length >= a.tank.fish) return { ok: false, why: 'full' };
  a.fish = [...a.fish, key];
  return { ok: true, aqua: keep(p, a, now) };
}
/** 🐟 물고기 빼기 (같은 종 가운데 나중에 넣은 한 마리) → { ok, aqua } · why: 'none' 수조에 없음 */
export function aquaTakeRule(p, key, now) {
  const a = aquaOf(p);
  const i = a.fish.lastIndexOf(key);
  if (i < 0) return { ok: false, why: 'none' };
  a.fish = a.fish.filter((_, k) => k !== i);
  return { ok: true, aqua: keep(p, a, now) };
}
/** 🐚 장식 칸에 놓기 · 빼기(id '') → { ok, aqua } · why: 'bad' 없는 칸·모르는 장식 · 'used' 가진 것을 다 놓음 */
export function aquaSlotRule(p, slot, id, now) {
  const a = aquaOf(p);
  if (!Number.isInteger(slot) || slot < 0 || slot >= a.deco.length) return { ok: false, why: 'bad' };
  if (id && !decoOf(id)) return { ok: false, why: 'bad' };
  if (id && a.deco.filter((x, i) => x === id && i !== slot).length >= decoCount(p, id)) return { ok: false, why: 'used' };
  a.deco = a.deco.map((x, i) => (i === slot ? id || '' : x));
  return { ok: true, aqua: keep(p, a, now) };
}
/** 🐟 고르는 칸 (순수) — 낚은 종만 도감 차례로 · put 수조에 넣은 수 · 📸 어름치는 photo */
export function aquaFishRows(p) {
  const a = aquaOf(p);
  return dexRows(p && p.fishing).filter((r) => r.caught).map((r) => ({ ...r, put: a.fish.filter((k) => k === r.key).length }));
}
/** 📸 벽에 걸 사진이 있나 — 어름치를 찍었으면 */
export function aquaPhoto(p) {
  const { dex } = lakeOf(p && p.fishing);
  return Object.keys(dex).some((k) => { const sp = speciesOf(k); return !!sp && !!sp.photo; });
}
/** 📤 보상 기록 한 줄 */
export function aquaLine(p) {
  const a = aquaOf(p);
  return `🐠 아쿠아리움 ${a.tier}단계 ${a.tank.short} · 물고기 ${a.fish.length} · 장식 ${a.deco.filter(Boolean).length}`;
}
