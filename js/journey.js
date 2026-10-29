// 🎒 포켓몬 대여행 (v341, 2026-10-26 — 진우 제안 → 아버님 기본안 2판 "이대로") — 순수 규칙 · 화면은 journeyview.js
// 일주일에 한 번(토요일에 열려 다음 금요일까지 한 번) 데리고 있는 포켓몬 6마리와 산 → 바다 → 🏥 → 하늘 → 우주 → 🚀 로켓단을 여행한다.
// 만남(야생·트레이너·로켓단)마다 6마리 중 하나를 내보내고 이미 배운 문제(수학·영어·국어·논술 — 배틀과 같은 꼴)를 푼다:
//   맞히면 상대 HP 1칸(타입이 유리하면 2칸) · 틀리면 ❤️ 1개 · 바다를 지나 🏥에서 ❤️ 2개(최대 5) · 만남마다 🔄 다른 문제 한 번
//   ❤️를 다 잃으면 🔷🔶🟩 스톤은 가진 것의 20%·💰 30%(버림) — 상한 스톤 과목마다 5 · 💰 200(v343) — 포켓몬은 안 잃는다 · 🏃 집으로는 잃는 것도 보상도 없이 그 주 끝
//   끝까지 가면 💰500 · 스톤 1개씩 · 함께 간 6마리 레벨 +1(못 올리면 그 포켓몬을 키우는 스톤 1개) · 이긴 야생 포켓몬 넷 중 하나를 데려온다
// 저장: profile.journey = { cur: 지금 여행 | null, done: { 그 주 토요일 'YYYY-MM-DD': { r: 'won'|'lost'|'home', at, q, pick?, lost?, lv?, sub? } } }
//   · 바꾸기는 모두 xp.houseDo(저장된 프로필로 한 트랜잭션 — 두 창·두 번 누름이 두 번 잃거나 두 번 받지 않게) · 답은 qn(몇 번째 문제)이 맞아야 받는다
//   · 병합: done은 합집합(한 번 끝난 주는 계속 끝남 — 옛 백업이 끝난 여행을 되살려 두 번 받거나 잃지 않게) · cur는 코인·가방과 같은 쪽(최근에 저장된 쪽)
//   · 문제는 기록하지 않는다(배틀과 같다) — 과목별 맞힌 수만 cur.q → done[주].q (📊·📤)
//   · 같은 문제로 이어 가기: 과목마다 문제 차례는 여행 id로 섞은 줄(orderOf)이고, 몇 번째인지는 저장된 맞힌 수 칸·🔄 수로 정한다(앱이 꺼져도 같은 자리)
// v362 (2026-10-29 진우 「대여행이 아니고 소여행 같다 · 5분이면 끝난다」 → 아버님 기본안 「이대로」) — 길을 세 배로:
//   구역 6곳(산·숲·바다·화산·하늘·우주) · 구역마다 야생·트레이너·👑 구역 대장 + 🚀 = 만남 19번 · 처음 ❤️ 6 · 👑 대장을 이기면 ❤️ +2(우주 대장 빼고 다섯 번 —
//   Codex 166차 판단 표 아버님 「추천대로」: ❤️ 5·🏥 두 번이면 정답률 85%에서 다 잃을 확률이 옛 여행 11% → 46% · 이렇게 하면 9%) ·
//   구역에 들어설 때 이벤트 하나(🎁 보물 상자 — 배운 문제, 틀려도 ❤️ 그대로 · 🧑‍🔬 박사 퀴즈 — 포켓몬 타입·그림자 · 🔀 갈림길 — 만날 야생 고르기) ·
//   보상·잃는 양은 그대로 · v341 꼴(만남 9번)로 가던 여행은 그 꼴 그대로 이어 간다(구역은 산·바다·하늘·우주 자리에 · 이벤트 없음)
// 이 파일은 evolve·items·montypes만 import한다(셋 다 아무것도 import하지 않는다) — 시험이 DOM·IndexedDB 없이 부른다
import { haveOf, lvOf, nextCost, stoneIdFor } from './evolve.js';
import { STONES } from './items.js';
import { MON_TYPES } from './montypes.js';

export const JOURNEY = {
  party: 6,
  hearts: 6, // v362 (v341은 5 — 그 꼴 여행은 OLD_HEARTS)
  heal: 2, // 🏥 포켓몬센터
  hp: { wild: 2, trainer: 3, boss: 4, rocket: 6 }, // 👑 구역 대장 · 🚀는 4 → 6 (v362)
  coins: 500, // 아버님 (100 + 400)
  chestCoins: 20, // 🎁 보물 상자 — ❤️가 가득일 때 맞히면 (v362)
  profCoins: 10, // 🧑‍🔬 박사 퀴즈를 맞히면 (v362)
  // ❤️를 다 잃었을 때 잃는 양의 상한 (v343, 2026-10-26 아버님 "상한을 두자 · 코인은 200") — 모은 게 많을수록 한 번에 크게 잃지 않게
  loseMax: { stone: 5, coins: 200 },
  doneKeep: 26, // 지난 여행 기록을 몇 주까지 (반년)
};

/** 구역 — 야생·트레이너·대장 포켓몬은 그 구역 타입에서 (산 = 바위·땅 · 숲 = 풀·벌레 · 바다 = 물 · 화산 = 불꽃·드래곤 · 하늘 = 비행 · 우주 = 에스퍼·페어리) */
export const ZONES = [
  { key: 'mount', ko: '산', emoji: '⛰️', types: ['rock', 'ground'] },
  { key: 'forest', ko: '숲', emoji: '🌲', types: ['grass', 'bug'] },
  { key: 'sea', ko: '바다', emoji: '🌊', types: ['water'] },
  { key: 'volcano', ko: '화산', emoji: '🌋', types: ['fire', 'dragon'] },
  { key: 'sky', ko: '하늘', emoji: '☁️', types: ['flying'] },
  { key: 'space', ko: '우주', emoji: '🪐', types: ['psychic', 'fairy'] },
];
/** 구역마다 만남 수(야생·트레이너 — 차례는 아무렇게나 · 👑 대장은 끝) · 만남 수(+ 🚀) · 이 만남(0부터)을 이기면 ❤️ +2(👑 대장 — 우주 대장은 🚀 바로 앞이라 뺌) · 로켓단 포켓몬(나옹) */
export const PER_ZONE = 3;
export const STOPS = ZONES.length * PER_ZONE + 1;
export const CENTERS = [0, 1, 2, 3, 4].map((z) => z * PER_ZONE + PER_ZONE - 1);
export const ROCKET_MON = 52;
/** v341 꼴(만남 9번 — 구역마다 둘 + 🚀 · 🏥는 넷째 만남 뒤) — 그 꼴로 가던 여행을 이어 가려고만 · 구역은 산·바다·하늘·우주 자리 */
export const OLD_STOPS = 9;
const OLD_CENTERS = [3];
const OLD_ZONE = [0, 2, 4, 5];
/** v341 꼴 여행은 그 꼴 그대로 — ❤️ 5 · 🚀 HP 4 (🔍 Codex 166차 #4) */
export const OLD_HEARTS = 5;
const OLD_ROCKET_HP = 4;
/** 구역에 들어설 때 이벤트 (v362) — 🎁 보물 상자 · 🧑‍🔬 박사 퀴즈 · 🔀 갈림길 */
export const EVENTS = ['chest', 'prof', 'fork'];
/** 과목 — 만남마다 이 차례로 돌아간다(문제가 없는 과목은 건너뜀) */
export const SUBJECTS = ['math', 'english', 'korean', 'nonsul'];
export const SUBJECT_KO = { math: '🔢 수학', english: '🔶 영어', korean: '📚 국어', nonsul: '🖊️ 논술' };
export const TYPE_KO = {
  normal: '노말', fire: '불꽃', water: '물', electric: '전기', grass: '풀', ice: '얼음', fighting: '격투', poison: '독', ground: '땅',
  flying: '비행', psychic: '에스퍼', bug: '벌레', rock: '바위', ghost: '고스트', dragon: '드래곤', dark: '악', steel: '강철', fairy: '페어리',
};

// 타입 상성 (6세대부터의 표) — 공격 타입 → s: 효과가 굉장함(×2) · h: 별로(×½) · z: 효과 없음(×0)
const CHART = {
  normal: { s: [], h: ['rock', 'steel'], z: ['ghost'] },
  fire: { s: ['grass', 'ice', 'bug', 'steel'], h: ['fire', 'water', 'rock', 'dragon'], z: [] },
  water: { s: ['fire', 'ground', 'rock'], h: ['water', 'grass', 'dragon'], z: [] },
  electric: { s: ['water', 'flying'], h: ['electric', 'grass', 'dragon'], z: ['ground'] },
  grass: { s: ['water', 'ground', 'rock'], h: ['fire', 'grass', 'poison', 'flying', 'bug', 'dragon', 'steel'], z: [] },
  ice: { s: ['grass', 'ground', 'flying', 'dragon'], h: ['fire', 'water', 'ice', 'steel'], z: [] },
  fighting: { s: ['normal', 'ice', 'rock', 'dark', 'steel'], h: ['poison', 'flying', 'psychic', 'bug', 'fairy'], z: ['ghost'] },
  poison: { s: ['grass', 'fairy'], h: ['poison', 'ground', 'rock', 'ghost'], z: ['steel'] },
  ground: { s: ['fire', 'electric', 'poison', 'rock', 'steel'], h: ['grass', 'bug'], z: ['flying'] },
  flying: { s: ['grass', 'fighting', 'bug'], h: ['electric', 'rock', 'steel'], z: [] },
  psychic: { s: ['fighting', 'poison'], h: ['psychic', 'steel'], z: ['dark'] },
  bug: { s: ['grass', 'psychic', 'dark'], h: ['fire', 'fighting', 'poison', 'flying', 'ghost', 'steel', 'fairy'], z: [] },
  rock: { s: ['fire', 'ice', 'flying', 'bug'], h: ['fighting', 'ground', 'steel'], z: [] },
  ghost: { s: ['psychic', 'ghost'], h: ['dark'], z: ['normal'] },
  dragon: { s: ['dragon'], h: ['steel'], z: ['fairy'] },
  dark: { s: ['psychic', 'ghost'], h: ['fighting', 'dark', 'fairy'], z: [] },
  steel: { s: ['ice', 'rock', 'fairy'], h: ['fire', 'water', 'electric', 'steel'], z: [] },
  fairy: { s: ['fighting', 'dragon', 'dark'], h: ['fire', 'poison', 'steel'], z: [] },
};
export const TYPES = Object.keys(CHART);

const isObj = (o) => !!o && typeof o === 'object' && !Array.isArray(o);
const own = (o, k) => !!o && Object.prototype.hasOwnProperty.call(o, k);
const cnt = (v) => (Number.isSafeInteger(Number(v)) && Number(v) > 0 ? Number(v) : 0);
const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
const ID_RE = /^[a-z0-9]{6,24}$/;
const RESULTS = ['won', 'lost', 'home'];
const STONE_IDS = STONES.map((s) => s.id);
const isMon = (v) => Number.isSafeInteger(v) && own(MON_TYPES, v);

/** 포켓몬 타입 (타입 표에 없으면 노말) */
export function typesOf(id) {
  const t = MON_TYPES[Number(id)];
  return Array.isArray(t) && t.length ? t : ['normal'];
}
/** 공격 타입 하나 → 상대 타입들에 몇 배 */
export function mult(atk, defTypes) {
  const c = CHART[atk];
  if (!c) return 1;
  let m = 1;
  for (const d of defTypes || []) {
    if (c.z.includes(d)) m *= 0;
    else if (c.s.includes(d)) m *= 2;
    else if (c.h.includes(d)) m *= 0.5;
  }
  return m;
}
/** 내 포켓몬 타입 가운데 하나라도 상대에게 효과가 굉장한가 (두 타입 상대는 곱 — 전기 → 물·땅은 0이라 아님) */
export function advantage(myId, foeId) {
  const def = typesOf(foeId);
  return typesOf(myId).some((t) => mult(t, def) > 1);
}
/** 이 포켓몬이 센 구역 (ZONES 차례) — 그 구역 타입 가운데 하나에 효과가 굉장하면 · 출발 준비의 「바다·하늘에서 세요」 */
export function strongZones(myId) {
  const mine = typesOf(myId);
  return ZONES.map((z, i) => (z.types.some((t) => mine.some((a) => mult(a, [t]) > 1)) ? i : -1)).filter((i) => i >= 0);
}
/** 그 만남이 어느 구역인가 (ZONES 자리) — len = 길의 만남 수(v341 꼴 9면 산·바다·하늘·우주 자리로) */
export function zoneOfStop(i, len = STOPS) {
  if (len === OLD_STOPS) return OLD_ZONE[i >= OLD_STOPS - 1 ? 3 : Math.floor(i / 2)];
  return i >= len - 1 ? ZONES.length - 1 : Math.floor(i / PER_ZONE);
}
/** 이 만남을 이기면 ❤️ +2 — 길의 만남 수로 (v341 꼴은 🏥 넷째 만남 뒤) */
export function centersOf(len = STOPS) {
  return len === OLD_STOPS ? OLD_CENTERS : CENTERS;
}
/** 그 만남 상대의 HP 칸 — v341 꼴 길의 🚀는 4 */
export function hpOf(route, i) {
  const s = route && route[i];
  if (!s) return 0;
  return s.kind === 'rocket' && route.length === OLD_STOPS ? OLD_ROCKET_HP : JOURNEY.hp[s.kind];
}
/** ❤️ 최대 — 길의 만남 수로 (v341 꼴은 5) */
export function heartsMax(len = STOPS) {
  return len === OLD_STOPS ? OLD_HEARTS : JOURNEY.hearts;
}
/** 구역의 첫 만남인가 (지도 띠 「○○에 왔다!」) */
export function zoneStart(i, len = STOPS) {
  return i === len - 1 || i === 0 || zoneOfStop(i, len) !== zoneOfStop(i - 1, len);
}
/** 지금 풀 이벤트의 구역 (없으면 -1) — 새 꼴 길에서 구역의 첫 만남 앞 · 아직 안 한 것 */
export function pendingEvent(c) {
  if (!c || c.phase !== 'go' || !Array.isArray(c.ev) || !c.ev.length || !Array.isArray(c.route)) return -1;
  if (c.at >= c.route.length - 1 || c.at % PER_ZONE !== 0) return -1;
  const z = c.at / PER_ZONE;
  return c.ev[z] && !c.ev[z].d ? z : -1;
}

/** ms → 'YYYY-MM-DD' (이 기기 시간대 · track.todayKey와 같다) */
export function dayKeyOf(ms) {
  const d = new Date(ms);
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
/** 그 날이 든 여행 주 — 그 날이나 그 앞의 가장 가까운 토요일 'YYYY-MM-DD' (토요일에 열려 다음 금요일까지) · 꼴이 틀리면 '' */
export function weekOf(dayKey) {
  if (!DAY_RE.test(String(dayKey))) return '';
  const [y, m, d] = String(dayKey).split('-').map(Number);
  const t = Date.UTC(y, m - 1, d);
  if (!Number.isFinite(t)) return '';
  const back = (new Date(t).getUTCDay() + 1) % 7; // 토 0 · 일 1 · … · 금 6
  const s = new Date(t - back * 86400000);
  const p = (n) => String(n).padStart(2, '0');
  return `${s.getUTCFullYear()}-${p(s.getUTCMonth() + 1)}-${p(s.getUTCDate())}`;
}

// ── 저장된 값 고쳐 읽기 ──

function qOf(raw) {
  const out = {};
  if (!isObj(raw)) return out;
  for (const s of SUBJECTS) {
    const v = raw[s];
    if (!Array.isArray(v) || v.length !== 2) continue;
    const n = Math.min(cnt(v[1]), 9999);
    const r = Math.min(cnt(v[0]), n);
    if (n) out[s] = [r, n];
  }
  return out;
}

/**
 * 길 — 새 꼴(만남 19): 구역마다 야생 하나·트레이너 하나(차례는 아무렇게나) 뒤 👑 대장, 모두 그 구역 타입 · v341 꼴(만남 9): 구역마다 야생·트레이너 ·
 * 마지막은 로켓단 나옹 · 같은 포켓몬 두 번 없음 · 틀리면 null
 */
export function routeOf(raw) {
  if (!Array.isArray(raw) || (raw.length !== STOPS && raw.length !== OLD_STOPS)) return null;
  const n = raw.length;
  const per = n === OLD_STOPS ? 2 : PER_ZONE;
  const out = [];
  for (let i = 0; i < n; i++) {
    const s = raw[i];
    if (!isObj(s)) return null;
    const mon = Number(s.mon);
    if (!isMon(mon)) return null;
    if (i === n - 1) {
      if (s.kind !== 'rocket' || mon !== ROCKET_MON) return null;
      out.push({ kind: 'rocket', mon });
      continue;
    }
    const boss = per === PER_ZONE && i % per === per - 1;
    if (boss ? s.kind !== 'boss' : s.kind !== 'wild' && s.kind !== 'trainer') return null;
    if (!typesOf(mon).some((t) => ZONES[zoneOfStop(i, n)].types.includes(t))) return null;
    const st = { kind: s.kind, mon };
    if (s.kind !== 'wild') st.who = typeof s.who === 'string' && s.who && s.who.length <= 8 ? s.who : '🧢';
    out.push(st);
  }
  for (let z = 0; z < (n - 1) / per; z++) if ([out[per * z].kind, out[per * z + 1].kind].sort().join() !== 'trainer,wild') return null;
  const mons = out.slice(0, n - 1).map((s) => s.mon);
  if (new Set(mons).size !== mons.length) return null;
  return out;
}

/**
 * 이벤트 (v362) — 새 꼴 길이면 구역마다 하나 { k, d(했나 0·1), 박사 퀴즈면 m(포켓몬)·f('type'|'shadow'), 갈림길이면 alt(다른 야생 — 그 구역 타입 · 길에 없는 포켓몬) } ·
 * v341 꼴 길이면 [] · 틀리면 null
 */
function evOf(raw, route) {
  if (!route || route.length !== STOPS) return [];
  if (!Array.isArray(raw) || raw.length !== ZONES.length) return null;
  const used = new Set(route.slice(0, STOPS - 1).map((s) => s.mon));
  const out = [];
  for (let z = 0; z < ZONES.length; z++) {
    const e = raw[z];
    if (!isObj(e) || !EVENTS.includes(e.k)) return null;
    const o = { k: e.k, d: e.d ? 1 : 0 };
    if (e.k === 'prof') {
      const m = Number(e.m);
      if (!isMon(m)) return null;
      o.m = m;
      o.f = e.f === 'shadow' ? 'shadow' : 'type';
    } else if (e.k === 'fork') {
      const a = Number(e.alt);
      if (!isMon(a) || used.has(a) || !typesOf(a).some((t) => ZONES[z].types.includes(t))) return null;
      used.add(a); // 두 갈림길이 같은 포켓몬을 다른 길로 두지 않게
      o.alt = a;
    }
    out.push(o);
  }
  return out;
}
/** [맞힌 수, 푼 수] 한 쌍 (없거나 깨졌으면 null) */
function pairOf(v) {
  if (!Array.isArray(v) || v.length !== 2) return null;
  const n = Math.min(cnt(v[1]), 9999);
  return n ? [Math.min(cnt(v[0]), n), n] : null;
}

function partyOf(raw) {
  if (!Array.isArray(raw) || !raw.length || raw.length > JOURNEY.party) return null;
  const ids = raw.map(Number);
  if (!ids.every(isMon) || new Set(ids).size !== ids.length) return null;
  return ids;
}

/** 지금 여행 고쳐 읽기 (새 객체) — 틀린 곳이 있으면 null */
function curOf(raw) {
  if (!isObj(raw) || !ID_RE.test(String(raw.id)) || !DAY_RE.test(String(raw.week))) return null;
  const party = partyOf(raw.party);
  const route = routeOf(raw.route);
  if (!party || !route) return null;
  const n = route.length;
  const ev = evOf(raw.ev, route);
  if (!ev) return null;
  const phase = raw.phase === 'pick' ? 'pick' : raw.phase === 'go' ? 'go' : null;
  if (!phase) return null;
  const at = Number(raw.at);
  if (!Number.isSafeInteger(at) || at < 0 || at > n || (phase === 'go' && at >= n) || (phase === 'pick' && at !== n)) return null;
  const hearts = Number(raw.hearts);
  if (!Number.isSafeInteger(hearts) || hearts < 1 || hearts > heartsMax(n)) return null;
  const hp = Number(raw.hp);
  const maxHp = phase === 'go' ? hpOf(route, at) : 0;
  if (!Number.isSafeInteger(hp) || hp < 0 || hp > maxHp || (phase === 'go' && hp < 1)) return null;
  const wilds = route.filter((s) => s.kind === 'wild').map((s) => s.mon);
  const won = Array.isArray(raw.won) ? raw.won.map(Number).filter((m) => wilds.includes(m)) : [];
  if (new Set(won).size !== won.length) return null;
  const swap = Number(raw.swap);
  return {
    id: String(raw.id), week: String(raw.week), party, route, at, hearts, hp,
    qn: Math.min(cnt(raw.qn), 99999), qv: Math.min(cnt(raw.qv), 999),
    swap: Number.isSafeInteger(swap) && swap >= 0 && swap < n ? swap : -1,
    won, phase, startAt: cnt(raw.startAt), q: qOf(raw.q),
    ev, pf: pairOf(raw.pf) || [0, 0], // 🧑‍🔬 박사 퀴즈 [맞힌 수, 푼 수] (v362)
  };
}

function lostOf(raw) {
  const out = { items: {}, coins: 0 };
  if (!isObj(raw)) return out;
  if (isObj(raw.items)) for (const id of STONE_IDS) { const n = cnt(raw.items[id]); if (n) out.items[id] = n; }
  out.coins = cnt(raw.coins);
  return out;
}

function doneEntryOf(raw) {
  if (!isObj(raw) || !RESULTS.includes(raw.r)) return null;
  const e = { r: raw.r, at: cnt(raw.at), q: qOf(raw.q) };
  const pf = pairOf(raw.pf);
  if (pf) e.pf = pf; // 🧑‍🔬 박사 퀴즈 (v362 — 📊·📤에만)
  if (raw.r === 'won') {
    const pick = Number(raw.pick);
    if (isMon(pick)) e.pick = pick;
    if (Array.isArray(raw.lv)) e.lv = raw.lv.filter((x) => Array.isArray(x) && x.length === 3 && isMon(Number(x[0]))).map((x) => [Number(x[0]), lvOf({ lv: x[1] }), lvOf({ lv: x[2] })]).slice(0, JOURNEY.party);
    if (Array.isArray(raw.sub)) e.sub = raw.sub.filter((x) => Array.isArray(x) && x.length === 2 && isMon(Number(x[0])) && STONE_IDS.includes(x[1])).map((x) => [Number(x[0]), x[1]]).slice(0, JOURNEY.party);
  }
  if (raw.r === 'lost') e.lost = lostOf(raw.lost);
  return e;
}

function doneOf(raw) {
  const out = {};
  if (!isObj(raw)) return out;
  const keys = Object.keys(raw).filter((k) => DAY_RE.test(k) && weekOf(k) === k).sort().slice(-JOURNEY.doneKeep);
  for (const k of keys) { const e = doneEntryOf(raw[k]); if (e) out[k] = e; }
  return out;
}

/** 저장된 대여행 기록 고쳐 읽기 (새 객체) → { cur, done } */
export function journeyOf(raw) {
  const r = isObj(raw) ? raw : {};
  return { cur: curOf(r.cur), done: doneOf(r.done) };
}
/** 복사 (프로필 복사용) — 객체가 아니면 null */
export function copyJourney(raw) {
  return isObj(raw) ? journeyOf(raw) : null;
}
/**
 * 백업 병합 (순수) — latest = 최근에 저장된 쪽(코인·가방을 가져오는 쪽) · 둘 다 없으면 null
 *   done: 합집합 — 같은 주가 두 쪽에 있으면 데려온 포켓몬(pick)이 적힌 쪽, 아니면 최근 쪽
 *   cur: 최근 쪽(없으면 다른 쪽) — 이미 끝난 주(고르기까지 끝난 주)면 비운다
 */
export function mergeJourney(latest, older) {
  if (!isObj(latest) && !isObj(older)) return null;
  const a = journeyOf(latest);
  const b = journeyOf(older);
  const done = { ...b.done };
  for (const k of Object.keys(a.done)) done[k] = !own(done, k) || own(a.done[k], 'pick') || !own(done[k], 'pick') ? a.done[k] : done[k];
  let cur = a.cur || b.cur;
  if (cur && own(done, cur.week) && (cur.phase === 'go' || own(done[cur.week], 'pick'))) cur = null;
  return journeyOf({ cur, done });
}

/**
 * 화면이 볼 지금 상태 (순수) — mode: 'pick'(데려올 포켓몬 고르기) · 'go'(이번 주 여행 중) · 'done'(이번 주는 다녀옴) · 'open'(떠날 수 있음)
 * 지난주에 끝내지 못한 여행은 「집으로」와 같다(잃는 것 없이 끝 — 다음 저장에서 done에 적힌다)
 */
export function stateOf(raw, dayKey) {
  const j = journeyOf(raw);
  const week = weekOf(dayKey);
  const c = j.cur;
  if (c && c.phase === 'pick') return { mode: 'pick', cur: c, week, done: j.done };
  if (c && c.week === week) return { mode: 'go', cur: c, week, done: j.done };
  if (own(j.done, week)) return { mode: 'done', entry: j.done[week], week, done: j.done };
  return { mode: 'open', week, done: j.done };
}

// ── 바꾸기 규칙 (xp.houseDo가 저장된 프로필 복사본 p로 한 트랜잭션에서 부른다) ──

function load(p) {
  return journeyOf(p.journey);
}
function save(p, j) {
  p.journey = journeyOf(j); // 고쳐 읽은 꼴로만 적는다
}
/** 끝난 주 한 줄 — 과목별 맞힌 수 · 🧑‍🔬 박사 퀴즈를 풀었으면 그 수도 (v362) */
function endOf(r, now, c, more = {}) {
  return { r, at: now, q: c.q, ...(c.pf && c.pf[1] ? { pf: c.pf } : {}), ...more };
}
/** 지난주에 끝내지 못한 여행을 「집으로」로 닫는다 (닫았으면 true) */
function closeStale(j, week, now) {
  if (!j.cur || j.cur.phase !== 'go' || j.cur.week === week) return false;
  if (!own(j.done, j.cur.week)) j.done[j.cur.week] = endOf('home', now, j.cur);
  j.cur = null;
  return true;
}

/** 지금 데리고 있는 포켓몬 id (저장된 프로필 기준 · 타입 표에 있는 것만) */
export function ownedIds(p) {
  const caught = (p && p.caught) || {};
  const mons = (p && p.mons) || {};
  return Object.keys(caught).map(Number).filter((id) => isMon(id) && haveOf(caught[id], mons[id]) >= 1).sort((a, b) => a - b);
}

/** 🎒 떠나기 — { id, party, route, ev } (새 꼴 길만 · ev = makeEvents) · why: 'pick'(데려올 포켓몬부터) · 'going'(이미 여행 중) · 'done'(이번 주는 다녀옴) · 'id' · 'route' · 'ev' · 'party' */
export function startRule(p, req, now) {
  const j = load(p);
  const week = weekOf(dayKeyOf(now));
  closeStale(j, week, now);
  if (j.cur) return { ok: false, why: j.cur.phase === 'pick' ? 'pick' : 'going' };
  if (own(j.done, week)) return { ok: false, why: 'done' };
  const r = req || {};
  if (!ID_RE.test(String(r.id))) return { ok: false, why: 'id' };
  const route = routeOf(r.route);
  if (!route || route.length !== STOPS) return { ok: false, why: 'route' }; // 새로 떠나는 여행은 새 꼴만 (v362)
  const ev = evOf(r.ev, route);
  if (!ev) return { ok: false, why: 'ev' };
  const owned = ownedIds(p);
  const need = Math.min(JOURNEY.party, owned.length);
  const party = partyOf(r.party);
  if (!need || !party || party.length !== need || !party.every((id) => owned.includes(id))) return { ok: false, why: 'party' };
  j.cur = { id: String(r.id), week, party, route, at: 0, hearts: JOURNEY.hearts, hp: hpOf(route, 0), qn: 0, qv: 0, swap: -1, won: [], phase: 'go', startAt: now, q: {}, ev: ev.map((e) => ({ ...e, d: 0 })), pf: [0, 0] };
  save(p, j);
  return { ok: true, cur: journeyOf(p.journey).cur };
}

/** 💰 끝까지 간 보상 — 코인 · 스톤 1개씩 · 함께 간 6마리 레벨 +1(데리고 있지 않거나 만렙·진화 레벨이면 그 포켓몬 스톤 1개) */
function rewardRule(p, c, subjectOf) {
  p.coins = cnt(p.coins) + JOURNEY.coins;
  p.coinsEarned = cnt(p.coinsEarned) + JOURNEY.coins; // 문제를 풀어 번 코인 (📊 공부로 번 💰)
  p.items = isObj(p.items) ? p.items : {};
  p.mons = isObj(p.mons) ? p.mons : {};
  for (const id of STONE_IDS) p.items[id] = cnt(p.items[id]) + 1;
  const lv = [];
  const sub = [];
  for (const id of c.party) {
    const m = p.mons[id] || {};
    const from = lvOf(m);
    const nc = haveOf((p.caught || {})[id], m) >= 1 ? nextCost(from, id) : null;
    if (nc) {
      p.mons[id] = { ...m, lv: nc.toLv };
      lv.push([id, from, nc.toLv]);
    } else {
      const sid = stoneIdFor(typeof subjectOf === 'function' ? subjectOf(id) : 'english');
      p.items[sid] = cnt(p.items[sid]) + 1;
      sub.push([id, sid]);
    }
  }
  return { coins: JOURNEY.coins, lv, sub };
}

/** 잃을 것 셈 (순수 · 바꾸지 않음) → { items: { 스톤 id: [가진 수, 남는 수] }, coins: [가진 수, 남는 수] } — 출발 준비 화면에 */
export function lossPreview(p) {
  const items = {};
  for (const id of STONE_IDS) { const n = cnt(p && p.items && p.items[id]); items[id] = [n, n - Math.min(JOURNEY.loseMax.stone, Math.floor(n / 5))]; }
  const c = Math.max(0, Math.floor(Number(p && p.coins) || 0));
  return { items, coins: [c, c - Math.min(JOURNEY.loseMax.coins, Math.floor((c * 3) / 10))] };
}

/** ❤️를 다 잃었다 — 스톤은 가진 수의 20%·코인 30%(버림 · 상한 JOURNEY.loseMax) → 잃은 것 { items, coins } */
function loseRule(p) {
  const pv = lossPreview(p);
  const items = {};
  p.items = isObj(p.items) ? p.items : {};
  for (const id of STONE_IDS) {
    const [n, left] = pv.items[id];
    if (n - left > 0) { p.items[id] = left; items[id] = n - left; }
  }
  const [c, cLeft] = pv.coins;
  p.coins = cLeft;
  return { items, coins: c - cLeft };
}

/**
 * ✏️ 답 하나 — { id, qn, mon(내보낸 포켓몬), subj, correct } · subjectOf: 포켓몬 → 과목(스톤 고르기 · pokemon.subjectOf)
 * → { ok, correct, adv, hit, beaten, healed, end: 'won'|'lost'|'expired'|null, hearts, hp, at, reward?, lost?, cur }
 * why: 'changed'(다른 창이 먼저 답했거나 여행이 바뀜) · 'event'(구역 이벤트가 먼저 — v362) · 'mon' · 'subj'
 */
export function answerRule(p, req, now, subjectOf) {
  const j = load(p);
  const r = req || {};
  const c = j.cur;
  if (!c || c.id !== r.id || c.phase !== 'go') return { ok: false, why: 'changed' };
  const week = weekOf(dayKeyOf(now));
  if (c.week !== week) { closeStale(j, week, now); save(p, j); return { ok: true, end: 'expired', cur: null }; }
  if (c.qn !== r.qn) return { ok: false, why: 'changed' };
  if (pendingEvent(c) >= 0) return { ok: false, why: 'event' }; // 🔀 갈림길이 만날 야생을 정한다 — 이벤트를 건너뛰고 싸우지 않게
  const mon = Number(r.mon);
  if (!c.party.includes(mon)) return { ok: false, why: 'mon' };
  if (!SUBJECTS.includes(r.subj)) return { ok: false, why: 'subj' };
  const correct = r.correct === true;
  const t = c.q[r.subj] || [0, 0];
  c.q[r.subj] = [t[0] + (correct ? 1 : 0), t[1] + 1];
  c.qn += 1;
  const foe = c.route[c.at];
  const out = { ok: true, correct, adv: false, hit: 0, beaten: false, healed: 0, end: null };
  if (correct) {
    out.adv = advantage(mon, foe.mon);
    out.hit = out.adv ? 2 : 1;
    c.hp = Math.max(0, c.hp - out.hit);
    if (!c.hp) {
      out.beaten = true;
      if (foe.kind === 'wild' && !c.won.includes(foe.mon)) c.won.push(foe.mon);
      if (centersOf(c.route.length).includes(c.at)) { const h = Math.min(heartsMax(c.route.length), c.hearts + JOURNEY.heal); out.healed = h - c.hearts; c.hearts = h; }
      c.at += 1;
      if (c.at >= c.route.length) {
        out.reward = rewardRule(p, c, subjectOf);
        j.done[c.week] = endOf('won', now, c, { lv: out.reward.lv, sub: out.reward.sub });
        c.phase = 'pick';
        out.end = 'won';
      } else c.hp = hpOf(c.route, c.at);
    }
  } else {
    c.hearts -= 1;
    if (c.hearts <= 0) {
      out.lost = loseRule(p);
      j.done[c.week] = endOf('lost', now, c, { lost: out.lost });
      j.cur = null;
      out.end = 'lost';
    }
  }
  out.hearts = Math.max(0, c.hearts);
  out.hp = c.hp;
  out.at = c.at;
  save(p, j);
  out.cur = journeyOf(p.journey).cur;
  return out;
}

/** 🔄 다른 문제 — 만남마다 한 번 · { id, qn } · why: 'changed' · 'used' */
export function swapRule(p, req) {
  const j = load(p);
  const r = req || {};
  const c = j.cur;
  if (!c || c.id !== r.id || c.phase !== 'go' || c.qn !== r.qn) return { ok: false, why: 'changed' };
  if (pendingEvent(c) >= 0) return { ok: false, why: 'event' };
  if (c.swap === c.at) return { ok: false, why: 'used' };
  c.swap = c.at;
  c.qv += 1;
  c.qn += 1; // 바꾼 문제는 새 번호 — 다른 창에 남은 옛 문제의 답이 받아지지 않게 (🔍 Codex 145차 #1)
  save(p, j);
  return { ok: true, cur: journeyOf(p.journey).cur };
}

/** 🏃 집으로 — 잃는 것도 보상도 없이 그 주 끝 · { id } */
export function homeRule(p, req, now) {
  const j = load(p);
  const c = j.cur;
  if (!c || c.id !== (req || {}).id || c.phase !== 'go') return { ok: false, why: 'changed' };
  if (!own(j.done, c.week)) j.done[c.week] = endOf('home', now, c);
  j.cur = null;
  save(p, j);
  return { ok: true };
}

/**
 * 🎁🧑‍🔬🔀 구역 이벤트 하나 (v362) — { id, qn, kind, 보물 상자면 subj·correct · 박사 퀴즈면 correct · 갈림길이면 pick(만날 야생) }
 *   🎁 맞히면 ❤️ +1(가득이면 💰 chestCoins) · 틀려도 잃는 것 없음 · 과목별 맞힌 수에 셈
 *   🧑‍🔬 맞히면 💰 profCoins · 틀려도 잃는 것 없음 · 박사 퀴즈 수(pf)에 셈(공부 과목엔 안 셈)
 *   🔀 두 야생 가운데 고른 쪽이 그 구역의 야생이 된다(다른 쪽은 alt로 남음)
 * → { ok, kind, correct, heart, coins, pick, hearts, cur } · why: 'changed'(다른 창이 먼저 · 이벤트 차례가 아님 · 종류가 다름) · 'subj' · 'mon'
 */
export function eventRule(p, req, now) {
  const j = load(p);
  const r = req || {};
  const c = j.cur;
  if (!c || c.id !== r.id || c.phase !== 'go') return { ok: false, why: 'changed' };
  const week = weekOf(dayKeyOf(now));
  if (c.week !== week) { closeStale(j, week, now); save(p, j); return { ok: true, end: 'expired', cur: null }; }
  if (c.qn !== r.qn) return { ok: false, why: 'changed' };
  const z = pendingEvent(c);
  if (z < 0 || c.ev[z].k !== r.kind) return { ok: false, why: 'changed' };
  const e = c.ev[z];
  const out = { ok: true, kind: e.k, correct: false, heart: 0, coins: 0, pick: 0 };
  if (e.k === 'chest' && r.skip === true) {
    // 문제를 만들지 못했다 — 셈도 보상도 없이 지나간다(상자 앞에서 막히지 않게)
  } else if (e.k === 'chest') {
    if (!SUBJECTS.includes(r.subj)) return { ok: false, why: 'subj' };
    out.correct = r.correct === true;
    const t = c.q[r.subj] || [0, 0];
    c.q[r.subj] = [t[0] + (out.correct ? 1 : 0), t[1] + 1];
    if (out.correct) { if (c.hearts < heartsMax(c.route.length)) { c.hearts += 1; out.heart = 1; } else out.coins = JOURNEY.chestCoins; }
  } else if (e.k === 'prof') {
    out.correct = r.correct === true;
    c.pf = [c.pf[0] + (out.correct ? 1 : 0), c.pf[1] + 1];
    if (out.correct) out.coins = JOURNEY.profCoins;
  } else {
    const wi = [PER_ZONE * z, PER_ZONE * z + 1].find((i) => c.route[i].kind === 'wild');
    const pick = Number(r.pick);
    if (pick !== c.route[wi].mon && pick !== e.alt) return { ok: false, why: 'mon' };
    if (pick === e.alt) { e.alt = c.route[wi].mon; c.route[wi] = { ...c.route[wi], mon: pick }; }
    out.pick = pick;
  }
  if (out.coins) { p.coins = cnt(p.coins) + out.coins; p.coinsEarned = cnt(p.coinsEarned) + out.coins; } // 문제를 풀어 번 코인
  e.d = 1;
  c.qn += 1; // 다른 창에 남은 같은 이벤트·옛 문제의 답이 받아지지 않게
  out.hearts = c.hearts;
  save(p, j);
  out.cur = journeyOf(p.journey).cur;
  return out;
}

/** 🎁 데려올 포켓몬 — 이긴 야생 포켓몬 가운데 하나 · { id, mon } → { ok, mon, first } */
export function pickRule(p, req, now) {
  const j = load(p);
  const r = req || {};
  const c = j.cur;
  const mon = Number(r.mon);
  if (!c || c.id !== r.id || c.phase !== 'pick') return { ok: false, why: 'changed' };
  if (!c.won.includes(mon)) return { ok: false, why: 'mon' };
  p.caught = isObj(p.caught) ? p.caught : {};
  const first = !(cnt(p.caught[mon]) > 0);
  p.caught[mon] = cnt(p.caught[mon]) + 1;
  j.done[c.week] = { ...(j.done[c.week] || { r: 'won', at: now, q: c.q }), pick: mon };
  j.cur = null;
  save(p, j);
  return { ok: true, mon, first };
}

// ── 길 만들기 · 문제 차례 (화면이 부른다 — 순수) ──

/** 무게대로 하나 고르기 (r = 0~1 난수 함수) */
function weighted(list, w, r) {
  const total = list.reduce((a, c) => a + w(c), 0);
  let x = r() * total;
  for (const c of list) { x -= w(c); if (x < 0) return c; }
  return list[list.length - 1];
}
/** 야생 무게 — 아직 못 잡은 포켓몬을 더 자주(데려올 수 있으니) · 흔함일수록 자주 */
const wildW = (c) => (c.caught ? 1 : 3) * ([0, 6, 4, 2, 1][Number(c.rarity)] || 2);
/** 구역 후보 — 그 구역 타입 · 표에 있는 포켓몬 · 이미 쓴 것 뺌 */
function zoneList(cands, z, used) {
  return (Array.isArray(cands && cands[z]) ? cands[z] : []).filter((c) => c && isMon(Number(c.id)) && !used.has(Number(c.id))
    && typesOf(c.id).some((t) => ZONES[z].types.includes(t)));
}

/**
 * 길 만들기 — cands: 구역마다 [{ id, caught, rarity }] (그 구역 타입 · 열린 것 · 전설·울트라비스트 뺌) · 모자라면 null
 * 구역마다 야생(wildW) · 트레이너(남은 것에서 고르게) — 둘의 차례는 아무렇게나 · 👑 대장(남은 것 가운데 귀할수록 자주) · 끝은 🚀
 */
export function makeRoute(cands, rng = Math.random, trainers = ['🧢']) {
  const r = () => Math.min(0.999999, Math.max(0, Number(rng()) || 0));
  const who = () => trainers[Math.floor(r() * trainers.length)] || '🧢';
  const used = new Set();
  const out = [];
  for (let z = 0; z < ZONES.length; z++) {
    const list = zoneList(cands, z, used);
    if (list.length < PER_ZONE) return null;
    const wild = weighted(list, wildW, r);
    const rest = list.filter((c) => c !== wild);
    const tr = rest[Math.floor(r() * rest.length)];
    const left = rest.filter((c) => c !== tr);
    const boss = weighted(left, (c) => [0, 1, 3, 6, 8][Number(c.rarity)] || 1, r);
    for (const c of [wild, tr, boss]) used.add(Number(c.id));
    const pair = [{ kind: 'wild', mon: Number(wild.id) }, { kind: 'trainer', mon: Number(tr.id), who: who() }];
    if (r() < 0.5) pair.reverse();
    out.push(...pair, { kind: 'boss', mon: Number(boss.id), who: who() });
  }
  out.push({ kind: 'rocket', mon: ROCKET_MON });
  return routeOf(out);
}

/**
 * 구역 이벤트 만들기 (v362) — 구역 여섯에 🎁 둘 · 🧑‍🔬 둘 · 🔀 둘을 아무렇게나 · 🔀는 길에 없는 다른 야생이 있어야(없으면 🎁) ·
 * 🧑‍🔬는 그 구역 포켓몬 하나(길에 없는 것 먼저) · 타입 맞히기 또는 그림자 맞히기
 */
export function makeEvents(route, cands, rng = Math.random) {
  const ok = routeOf(route);
  if (!ok || ok.length !== STOPS) return [];
  const r = () => Math.min(0.999999, Math.max(0, Number(rng()) || 0));
  const kinds = ['chest', 'chest', 'prof', 'prof', 'fork', 'fork'];
  for (let i = kinds.length - 1; i > 0; i--) { const k = Math.floor(r() * (i + 1)); [kinds[i], kinds[k]] = [kinds[k], kinds[i]]; }
  const used = new Set(ok.slice(0, STOPS - 1).map((s) => s.mon));
  return ZONES.map((zone, z) => {
    const list = zoneList(cands, z, used);
    if (kinds[z] === 'fork' && list.length) {
      const alt = Number(weighted(list, wildW, r).id);
      used.add(alt);
      return { k: 'fork', d: 0, alt };
    }
    if (kinds[z] === 'prof') {
      const pool = list.length ? list : (Array.isArray(cands && cands[z]) ? cands[z] : []).filter((c) => c && isMon(Number(c.id)));
      if (pool.length) return { k: 'prof', d: 0, m: Number(pool[Math.floor(r() * pool.length)].id), f: r() < 0.5 ? 'type' : 'shadow' };
    }
    return { k: 'chest', d: 0 };
  });
}

/**
 * 🧑‍🔬 박사 퀴즈 보기 넷 (v362 · 순수) — f 'type': 「무슨 타입일까?」 그 포켓몬 타입(두 타입이면 「물·악」) + 같은 꼴의 틀린 타입 셋(한 타입만 같은 것도 섞음 · 순서만 다른 것은 안 냄) ·
 * f 'shadow': 「그림자는 누구일까?」 이름 + pool의 다른 포켓몬 이름 셋(모자라면 null) · 섞은 차례 → [{ text, ok }]
 */
export function profChoices(m, f, pool, nameOf, rng = Math.random) {
  const r = () => Math.min(0.999999, Math.max(0, Number(rng()) || 0));
  const mix = (a) => { for (let i = a.length - 1; i > 0; i--) { const k = Math.floor(r() * (i + 1)); [a[i], a[k]] = [a[k], a[i]]; } return a; };
  const mon = Number(m);
  if (f === 'shadow') {
    const name = String(nameOf(mon) || '');
    if (!name) return null;
    const seen = new Set([name]);
    const others = [];
    for (const id of mix([...new Set((pool || []).map(Number))])) {
      const n = String(nameOf(id) || '');
      if (id === mon || !n || seen.has(n)) continue;
      seen.add(n);
      others.push(n);
      if (others.length === 3) break;
    }
    return others.length === 3 ? mix([{ text: name, ok: true }, ...others.map((t) => ({ text: t, ok: false }))]) : null;
  }
  const mine = typesOf(mon);
  const key = (ts) => [...ts].sort().join('+');
  const label = (ts) => ts.map((t) => TYPE_KO[t] || t).join('·');
  const seen = new Set([key(mine)]);
  const wrong = [];
  for (let k = 0; k < 200 && wrong.length < 3; k++) {
    const a = TYPES[Math.floor(r() * TYPES.length)];
    let ts = [a];
    if (mine.length === 2) {
      const b = TYPES[Math.floor(r() * TYPES.length)];
      ts = wrong.length === 0 ? (r() < 0.5 ? [mine[0], a] : [a, mine[1]]) : [a, b]; // 하나는 반만 맞는 보기
      if (ts[0] === ts[1]) continue;
    }
    if (seen.has(key(ts))) continue;
    seen.add(key(ts));
    wrong.push(ts);
  }
  if (wrong.length < 3) return null;
  return mix([{ text: label(mine), ok: true }, ...wrong.map((ts) => ({ text: label(ts), ok: false }))]);
}

/** 이 만남의 과목 — 문제가 있는 과목(avail) 가운데 SUBJECTS 차례로 돌아가며 · 하나도 없으면 null */
export function subjectFor(at, avail) {
  const list = SUBJECTS.filter((s) => (avail || []).includes(s));
  return list.length ? list[((Number(at) || 0) % list.length + list.length) % list.length] : null;
}

/** 글 → 32비트 씨앗 (FNV-1a) */
export function seedOf(text) {
  let h = 0x811c9dc5;
  for (const ch of String(text)) { h ^= ch.codePointAt(0); h = Math.imul(h, 0x01000193) >>> 0; }
  return h >>> 0;
}
/** 씨앗 → 0~1 난수 함수 (mulberry32) — 같은 씨앗이면 같은 줄 */
export function rngOf(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
/** 문제 차례 — 낼 수 있는 열쇠를 정렬한 뒤 여행 id·과목으로 섞은 줄 (같은 여행이면 늘 같은 줄) */
export function orderOf(keys, journeyId, subj) {
  const a = [...new Set((keys || []).map(String))].sort();
  const rnd = rngOf(seedOf(`${journeyId}:${subj}`));
  for (let i = a.length - 1; i > 0; i--) { const k = Math.floor(rnd() * (i + 1)); [a[i], a[k]] = [a[k], a[i]]; }
  return a;
}
/** 지금 낼 문제의 자리 — 그 과목에서 푼 수 + 🔄 수(+ 못 만든 수 tries) · 줄을 다 돌면 처음부터 */
export function slotOf(cur, subj, len, tries = 0) {
  if (!(len > 0)) return -1;
  const n = (cur && cur.q && cur.q[subj] ? cur.q[subj][1] : 0) + ((cur && cur.qv) || 0) + tries;
  return n % len;
}
/** 지금 문제의 난수 씨앗 — 여행 id · 몇 번째 문제 · 🔄 수 */
export function questionSeed(cur, tries = 0) {
  return seedOf(`${cur && cur.id}:${cur && cur.qn}:${cur && cur.qv}:${tries}`);
}

/** 대사 글꼴 크기 — 목표에 가장 가까우면서 한 칸(글꼴 12칸)이 기기 픽셀 정수 개로 떨어지는 CSS px (없으면 목표 그대로) */
export function crispPx(target = 24, dpr = 1) {
  const r = Number(dpr) > 0 ? Number(dpr) : 1;
  let best = 0;
  for (let px = target - 8; px <= target + 8; px++) {
    const d = (px * r) / 12;
    if (Math.abs(d - Math.round(d)) < 0.001 && (!best || Math.abs(px - target) < Math.abs(best - target))) best = px;
  }
  return best || target;
}

// ── 📊·📤 ──

/** 지난 여행 줄 (최근 것부터) → [{ week, r, q, pick, lost, lv, sub }] */
export function journeyRows(raw) {
  const d = journeyOf(raw).done;
  return Object.keys(d).sort().reverse().map((week) => ({ week, ...d[week] }));
}
const R_KO = { won: '🎉 끝까지 감', lost: '💔 ❤️를 다 씀', home: '🏃 집으로' };
/** 과목별 맞힌 수 한 줄 — '🔢 수학 5/6 · 🔶 영어 4/4' */
export function qLine(q) {
  const parts = SUBJECTS.filter((s) => q && q[s]).map((s) => `${SUBJECT_KO[s]} ${q[s][0]}/${q[s][1]}`);
  return parts.join(' · ') || '문제 없음';
}
/** 결과 한 줄 (📊·📤 같은 말) */
export function rowText(row, monKo = (id) => String(id)) {
  const bits = [R_KO[row.r] || row.r, qLine(row.q)];
  if (row.pf) bits.push(`🧑‍🔬 박사 퀴즈 ${row.pf[0]}/${row.pf[1]}`);
  if (row.r === 'won' && row.pick) bits.push(`데려옴 ${monKo(row.pick)}`);
  if (row.r === 'lost' && row.lost) {
    const st = STONES.filter((s) => row.lost.items[s.id]).map((s) => `${s.emoji}${row.lost.items[s.id]}`).join(' ');
    bits.push(`잃음 ${[st, row.lost.coins ? `💰${row.lost.coins}` : ''].filter(Boolean).join(' ') || '없음'}`);
  }
  return bits.join(' · ');
}
/** 📤 usage/journey.md — 여행마다 한 줄 + 지금 여행 · 한 번도 안 떠났으면 null(파일을 안 만든다) */
export function journeyMd(raw, today, monKo) {
  const j = journeyOf(raw);
  const rows = journeyRows(raw);
  if (!rows.length && !j.cur) return null;
  const lines = [`# 🎒 포켓몬 대여행 — ${today} 기준`, '',
    `- 토요일에 열려 다음 금요일까지 한 번 · 만남 ${STOPS}번(산·숲·바다·화산·하늘·우주 — 구역마다 야생·트레이너·👑 대장 · 🚀) · 구역마다 이벤트(🎁 보물 상자·🧑‍🔬 박사 퀴즈·🔀 갈림길 — 틀려도 ❤️ 그대로) · ❤️ ${JOURNEY.hearts}개 · 👑 대장을 이기면 ❤️ +${JOURNEY.heal}(다섯 번) · 문제는 이미 배운 것(배틀과 같은 꼴 · 공부 기록엔 안 남김) · v362부터(그 전 여행은 만남 9번)`,
    `- ❤️를 다 잃으면 스톤 20%(과목마다 최대 ${JOURNEY.loseMax.stone})·💰 30%(최대 ${JOURNEY.loseMax.coins}) · 「집으로」·지난주에 못 끝낸 여행은 잃는 것도 보상도 없음`, ''];
  if (j.cur) lines.push(`## 지금 여행 (${j.cur.week} 주)`, '', `- ${j.cur.phase === 'pick' ? '끝까지 감 — 데려올 포켓몬을 아직 안 고름' : `만남 ${j.cur.at + 1}/${j.cur.route.length} · ❤️ ${j.cur.hearts}`} · ${qLine(j.cur.q)}${j.cur.pf[1] ? ` · 🧑‍🔬 박사 퀴즈 ${j.cur.pf[0]}/${j.cur.pf[1]}` : ''}`, '');
  if (rows.length) {
    lines.push('## 지난 여행', '');
    for (const row of rows) lines.push(`- ${row.week} 주: ${rowText(row, monKo)}`);
  }
  return `${lines.join('\n').trim()}\n`;
}
