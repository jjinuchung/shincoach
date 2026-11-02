// 🐾 손님 포켓몬 (v385 — 2026-11-02 아버님 집 다음 셋 기본안 「추천대로」 ②) — 그날 공부를 하고 오면 진우의 포켓몬 하나가 집에 놀러 와 있다
// 순수 함수만 — 화면 없음(node 시험에서 그대로 돈다). 저장은 xp.houseDo(저장된 프로필로 한 트랜잭션), 화면은 houseview.js, 장면은 playshow·playart
//
// 기본안(「추천대로」):
//   · 언제 — 그날 공부를 과목 합쳐 15분 한 뒤(🎮 미니 게임 판과 같은 셈 — minigame.studySec) 하루 한 번 · 아이 화면엔 시간 말 없음
//   · 알림 — 손님이 기다리면 홈 화면 🏠 단추에 🔔(숫자 없음) · 집에 들어가면 「띵동! ○○가 놀러 왔어요」 — 그때 도착을 적는다(arriveRule)
//   · 누가 — 진우가 가진 포켓몬(파트너 · 💊 캡슐에서 쉬는 것 빼고) · 오래 안 온 것부터(한 번도 안 온 것이 먼저) · 못 잡은 포켓몬은 오지 않는다(잡기 균형 그대로)
//   · 같이 놀기 — 손님의 첫 타입이 좋아하는 가구(LIKES)가 손님 방에 있으면 그 장면을 셋이 함께 · 없으면 🤝 인사하기 장면
//   · 받는 것 — 손님에게 💗 +1(그날 한 번 · homePlay.bond 그대로 — 진화해도 이어짐) · 장면 끝 [📸 같이 사진 찍기] · 💰·🔷·🔶·경험치·물건 없음
//     (손님과 놀기는 파트너 💗·가구 하루 셋 규칙을 건드리지 않는다 — 손님 💗만)
//   · 떠남 — 그날 밤까지 머물고 다음 날엔 조용히 간다(날이 바뀌면 그리지 않는다)
// 저장: profile.homeGuest = { day: 온 날 번호, mon: 손님 id, at: 온 때(ms), heart: 손님 💗를 준 날 번호, last: { 포켓몬 id: 마지막으로 온 날 } }
//  · 병합: last는 칸마다 큰 쪽 · heart는 큰 쪽(어느 기기에서든 그날 준 💗는 한 번) · 손님은 늦은 날 쪽 — 같은 날이면 먼저 온 쪽(at 작은 쪽, 같으면 id 작은 쪽)
//  · 날은 트랜잭션 안의 시각(korean.dayNum) · 시계를 되돌려도 또 오거나 💗를 또 받지 않게 「지난 날보다 뒤」만
import { MON_TYPES } from './montypes.js';
import { haveOf } from './evolve.js';
import { houseOf, houseShape, takenCells, furnById, restsOf, FIRST_ROOM } from './house.js';
import { avatarOf } from './avatar.js';
import { playOf, bondOf, partnerOf, palHome, playSpot, BOND_MAX } from './homeplay.js';
import { dayNum } from './korean.js';

/** 손님이 오려면 그날 공부한 초 (기본안 ⑥ — 15분 · 🎮 미니 게임 판과 같은 셈) */
export const GUEST_STUDY_SEC = 900;
/** 첫 타입 → 좋아하는 가구 (기본안 ⑨ 표 — 진우가 고치면 이 표만 바꾼다) · 앞에 있는 것부터 찾는다 */
export const LIKES = {
  water: ['f_plant', 'f_flower'], grass: ['f_flower', 'f_plant'], bug: ['f_flower', 'f_plant'],
  flying: ['f_window'], ice: ['f_window'],
  electric: ['f_tv', 'f_game', 'f_pc'], steel: ['f_pc', 'f_tv', 'f_game'],
  normal: ['f_sofa', 'f_teddy'], fairy: ['f_teddy', 'f_sofa'],
  psychic: ['f_shelf', 'f_books'], ghost: ['f_books', 'f_shelf'], dark: ['f_books', 'f_shelf'],
  fighting: ['f_toybox'], rock: ['f_toybox'], ground: ['f_toybox'],
  fire: ['f_table'], dragon: ['f_table'],
  poison: ['f_bed'],
};
/** 🤝 인사하기 — 좋아하는 가구가 없을 때 하는 장면 (가구 없이) */
export const HELLO = 'hello';
/** 손님이 조르는 말 (장면 이름 → 도구 줄 단추) — 셈·사라는 말 없음 */
export const GUEST_ASK = {
  tv: '📺 같이 TV 보자!', game: '🎮 같이 게임하자!', pc: '💻 같이 컴퓨터 하자!', meal: '🍚 같이 밥 먹자!', nap: '😴 같이 낮잠 자자!',
  sofa: '🛋️ 같이 쉬자!', teddy: '🧸 인형 놀이 하자!', book: '📖 그림책 읽어 줘!', plant: '💧 물 주기 하자!', flower: '💧 물 주기 하자!',
  window: '🔭 창밖 보자!', toy: '🧩 장난감 꺼내자!', [HELLO]: '🤝 인사하기',
};
/** 마지막으로 온 날 칸 수의 끝 · 날 번호의 끝(서기 9999년쯤 — 깨진 큰 날이 영영 「뒤」가 되지 않게) · 포켓몬 id의 끝 */
const LAST_KEYS_MAX = 3000;
const DAY_MAX = 3e6;
const MON_MAX = 100000;
const TIME_MAX = 8.64e15;

const isObj = (o) => !!o && typeof o === 'object' && !Array.isArray(o);
const own = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
const dayOk = (v) => (Number.isSafeInteger(v) && v > 0 && v <= DAY_MAX ? v : 0);
const monOk = (v) => (Number.isSafeInteger(v) && v > 0 && v < MON_MAX ? v : 0);
const timeOk = (v) => (Number.isSafeInteger(v) && v > 0 && v <= TIME_MAX ? v : 0);

/** 첫 타입 (montypes 표 — 없으면 노말) */
export function firstType(monId) {
  const t = MON_TYPES[Number(monId)];
  return Array.isArray(t) && typeof t[0] === 'string' && own(LIKES, t[0]) ? t[0] : 'normal';
}
/** 좋아하는 가구 id들 (첫 타입으로) */
export function likesOf(monId) {
  return LIKES[firstType(monId)].slice();
}

/** 저장된 손님 기록 고쳐 읽기 (새 객체) — 깨진 칸은 뺀다 · 손님(day·mon)은 둘 다 맞을 때만 */
export function guestOf(raw) {
  const out = { day: 0, mon: 0, at: 0, heart: 0, last: {} };
  if (!isObj(raw)) return out;
  const day = dayOk(raw.day);
  const mon = monOk(raw.mon);
  if (day && mon) { out.day = day; out.mon = mon; out.at = timeOk(raw.at); }
  out.heart = dayOk(raw.heart);
  if (isObj(raw.last)) {
    const ks = Object.keys(raw.last).filter((k) => /^\d{1,5}$/.test(k) && monOk(Number(k)) && dayOk(raw.last[k]));
    ks.sort((a, b) => raw.last[b] - raw.last[a] || Number(a) - Number(b)); // 넘치면 최근에 온 것부터 남긴다
    for (const k of ks.slice(0, LAST_KEYS_MAX)) out.last[k] = raw.last[k];
  }
  return out;
}
/** 복사 (프로필 복사용) — 객체가 아니면 null */
export function copyGuest(raw) {
  return isObj(raw) ? guestOf(raw) : null;
}
/** 백업·두 창 병합 (순수) — last·heart는 큰 쪽 · 손님은 늦은 날 쪽(같은 날이면 먼저 온 쪽 — 어느 차례로 합쳐도 같게) · 둘 다 없으면 null */
export function mergeGuest(a, b) {
  if (!isObj(a) && !isObj(b)) return null;
  const x = guestOf(a);
  const y = guestOf(b);
  const last = { ...x.last };
  for (const k of Object.keys(y.last)) last[k] = Math.max(last[k] || 0, y.last[k]);
  const first = (p, q) => {
    if (p.day !== q.day) return p.day > q.day ? p : q;
    if (!p.mon || !q.mon) return p.mon ? p : q;
    if (p.at !== q.at) return (p.at || TIME_MAX) < (q.at || TIME_MAX) ? p : q;
    return p.mon <= q.mon ? p : q;
  };
  const g = first(x, y);
  return guestOf({ day: g.day, mon: g.mon, at: g.at, heart: Math.max(x.heart, y.heart), last });
}

/** 가진 포켓몬인가 (잡은 수 − 진화·데려감·보냄… > 0) */
function hasMon(profile, id) {
  return haveOf((profile.caught || {})[id], (profile.mons || {})[id]) > 0;
}
/** 💊 캡슐에서 쉬는 포켓몬 (서랍에 맡겨 둔 휴식까지) — 쉬는 동안은 손님으로 오지 않는다 (Codex 188차 ③ — 캡슐 안과 방에 같은 포켓몬이 둘) */
function restingOf(profile) {
  return new Set(restsOf(houseOf(profile)).map((r) => Number(r && r.mon)).filter((id) => id > 0));
}
/** 손님이 될 수 있는 포켓몬 — 가진 것 · 파트너 빼고 · 캡슐에서 쉬는 것 빼고 · id 차례 */
export function candidatesOf(profile) {
  const pal = partnerOf(profile);
  const rest = restingOf(profile);
  const ids = new Set([...Object.keys((profile && profile.caught) || {}), ...Object.keys((profile && profile.mons) || {})].map(Number));
  return [...ids].filter((id) => monOk(id) && id !== pal && !rest.has(id) && hasMon(profile, id)).sort((a, b) => a - b);
}
/** 그날의 주사위 (순수 · 날마다 같은 수 — 두 창이 같은 날 같은 손님을 고르게) */
function dayRoll(day) {
  let h = (Math.imul(day, 2654435761) ^ (day >>> 7)) >>> 0;
  h = Math.imul(h ^ (h >>> 15), 2246822507) >>> 0;
  return (h ^ (h >>> 13)) >>> 0;
}
/** 오늘 올 손님 고르기 (순수) — 오래 안 온 것부터(한 번도 안 온 것 = 0) · 가장 오래된 무리 안에서는 그날의 주사위로 · 없으면 0 */
export function pickGuest(profile, day) {
  const g = guestOf(profile && profile.homeGuest);
  const cand = candidatesOf(profile);
  if (!cand.length) return 0;
  const lastOf = (id) => g.last[String(id)] || 0;
  const low = Math.min(...cand.map(lastOf));
  const group = cand.filter((id) => lastOf(id) === low);
  return group[dayRoll(day) % group.length];
}

/** 오늘 와 있는 손님 (순수) — 그날 온 손님이고 아직 가진 포켓몬이고 파트너가 아니고 캡슐에서 쉬지 않으면 { mon, heart: 오늘 💗를 받았나 } · 아니면 null */
export function guestNow(profile, now) {
  const day = dayNum(now);
  const g = guestOf(profile && profile.homeGuest);
  if (!day || g.day !== day || !g.mon) return null;
  if (g.mon === partnerOf(profile) || !hasMon(profile, g.mon)) return null;
  if (restingOf(profile).has(g.mon)) return null; // 손님이 온 뒤 캡슐에 넣었으면 그날은 안 보인다
  return { mon: g.mon, heart: g.heart >= day };
}
/** 🔔 손님이 문 앞에서 기다리나 (순수 — 🏠 단추) — 캐릭터를 만들었고 · 그날 공부 15분 · 오늘 아직 안 들어왔고 · 올 포켓몬이 있을 때 */
export function guestWaiting(profile, now, studySec) {
  const day = dayNum(now);
  if (!day || day > DAY_MAX || !(Number(studySec) >= GUEST_STUDY_SEC)) return false;
  if (!avatarOf(profile).made) return false;
  if (guestOf(profile && profile.homeGuest).day >= day) return false;
  return candidatesOf(profile).length > 0;
}

/**
 * 🚪 손님 도착 (규칙 · profile을 고친다) — 집을 열 때 · sec = 그날 공부한 초(화면이 센 것)
 * 오늘 이미 왔으면 그대로(fresh 없음) · 시계가 뒤로 갔으면(적힌 날이 오늘보다 뒤) 오지 않는다
 * @returns {{ok:true, mon:number, fresh:boolean}|{ok:false, why:'save'|'made'|'study'|'none'|'later'}}
 */
export function arriveRule(profile, now, sec) {
  const day = dayNum(now);
  if (!day || day > DAY_MAX) return { ok: false, why: 'save' };
  if (!avatarOf(profile).made) return { ok: false, why: 'made' };
  const g = guestOf(profile.homeGuest);
  if (g.day === day) return { ok: true, mon: g.mon, fresh: false };
  if (g.day > day) return { ok: false, why: 'later' };
  if (!(Number(sec) >= GUEST_STUDY_SEC)) return { ok: false, why: 'study' };
  const mon = pickGuest(profile, day);
  if (!mon) return { ok: false, why: 'none' };
  g.day = day; g.mon = mon; g.at = timeOk(now) || 0; g.last[String(mon)] = day;
  profile.homeGuest = guestOf(g);
  return { ok: true, mon, fresh: true };
}

/** 손님 방의 좋아하는 가구 (순수) — 방 차례 · 놓은 번호 차례로 처음 것 → { room, it } | null */
export function likedItemOf(profile, monId) {
  const likes = likesOf(monId);
  for (const id of likes) {
    for (const rm of houseOf(profile).rooms) {
      const it = rm.items.filter((i) => i.id === id).sort((a, b) => a.u - b.u)[0];
      if (it) return { room: rm.id, it };
    }
  }
  return null;
}

/**
 * 🐾 손님이 앉는 칸 (순수) — 좋아하는 가구 옆 빈 칸(그 가구로 놀 때 캐릭터·파트너가 갈 칸과 지금 선 칸은 피함) ·
 * 그 가구가 없으면 캐릭터가 선 방의 문 쪽(왼쪽 아래)에서 가까운 빈 칸 → { room, x, y, u: 그 가구 번호|0 } | null
 */
export function guestSpot(profile, monId) {
  const me = avatarOf(profile);
  const size = houseShape(profile).size;
  const liked = likedItemOf(profile, monId);
  const roomId = liked ? liked.room : (me.spot && me.spot.room) || FIRST_ROOM;
  const room = houseOf(profile).rooms.find((r) => r.id === roomId);
  if (!room) return null;
  const taken = takenCells(room);
  const avoid = new Set();
  const mark = (s) => { if (s && s.room === room.id) avoid.add(`${s.x},${s.y}`); };
  if (me.made && me.spot) { mark(me.spot); mark(partnerOf(profile) ? palHome(profile, me.spot) : null); }
  const cells = [];
  for (let y = 0; y < size.H; y++) for (let x = 0; x < size.W; x++) if (!taken.has(`${x},${y}`) && !avoid.has(`${x},${y}`)) cells.push({ x, y });
  if (!cells.length) return null;
  if (liked) {
    const ps = playSpot(profile, room.id, liked.it.u);
    if (ps) { mark(ps.me); mark(ps.pal); }
    const d = furnById(liked.it.id);
    const it = liked.it;
    const w = d ? d.w : 1;
    const ax = d && d.at === 'wall' ? [] : [{ x: it.x + w, y: it.y }, { x: it.x - 1, y: it.y }, { x: it.x + w, y: it.y + 1 }, { x: it.x - 1, y: it.y + 1 }];
    const near = [...ax, ...cells.map((c) => ({ ...c, k: Math.abs(c.x - it.x) + Math.abs(c.y - (d && d.at === 'wall' ? 0 : it.y)) })).sort((a, b) => a.k - b.k || b.x - a.x || a.y - b.y)];
    const ok = near.find((c) => c.x >= 0 && c.y >= 0 && c.x < size.W && c.y < size.H && !taken.has(`${c.x},${c.y}`) && !avoid.has(`${c.x},${c.y}`));
    if (ok) return { room: room.id, x: ok.x, y: ok.y, u: it.u };
  }
  // 문 쪽 = 왼쪽 아래 칸에서 가까운 빈 칸
  const door = cells.map((c) => ({ ...c, k: c.x + (size.H - 1 - c.y) })).sort((a, b) => a.k - b.k || b.y - a.y)[0];
  return { room: room.id, x: door.x, y: door.y, u: 0 };
}

/**
 * ▶️ 손님과 놀기 (규칙 · profile을 고친다) — u = 좋아하는 가구 번호(그 방에 놓여 있어야) · 0이면 🤝 인사하기
 * 손님에게 오늘 아직 💗를 안 줬으면 +1(그날 한 번 · 진화 전 모습의 💗도 이어서) — 파트너 💗·가구 하루 셋은 건드리지 않는다
 * why: 'made' 캐릭터를 먼저 · 'nobody' 오늘 와 있는 손님이 없음(날이 바뀜·다른 창에서 파트너로 정함) · 'gone' 그 가구가 그 방에 없음 · 'play' 손님이 좋아하지 않는 가구
 * → { ok, kind: 가구 id | 'hello', guest, heart, bond }  (bond = 놀고 난 뒤 손님의 💗)
 */
export function guestPlayRule(profile, roomId, u, now) {
  if (!avatarOf(profile).made) return { ok: false, why: 'made' };
  const day = dayNum(now);
  const here = guestNow(profile, now);
  if (!here || !day || day > DAY_MAX) return { ok: false, why: 'nobody' };
  let kind = HELLO;
  if (u) {
    const room = houseOf(profile).rooms.find((r) => r.id === roomId);
    const it = room && room.items.find((i) => i.u === u);
    if (!it) return { ok: false, why: 'gone' };
    if (!likesOf(here.mon).includes(it.id)) return { ok: false, why: 'play' };
    kind = it.id;
  }
  const hp = playOf(profile.homePlay);
  const before = bondOf(hp, here.mon);
  const g = guestOf(profile.homeGuest);
  if (g.heart >= day) return { ok: true, kind, guest: here.mon, heart: false, bond: before };
  hp.bond[String(here.mon)] = Math.min(BOND_MAX, before + 1);
  profile.homePlay = hp;
  g.heart = day;
  profile.homeGuest = guestOf(g);
  return { ok: true, kind, guest: here.mon, heart: true, bond: hp.bond[String(here.mon)] };
}

/** 🛋️ 좋아하는 가구 이름 (화면 말 「다음에 ○○가 있으면 같이 놀자!」 — 사라고 조르지 않게 한 줄) */
export function likedName(monId) {
  const d = furnById(likesOf(monId)[0]);
  return d ? d.ko : '';
}
