// 💊 회복 캡슐 — 규칙 (순수, 2026-10-10 아버님 설계안 "이대로 진행" — 큰 그림 2 "포켓몬이 사는 집"의 첫 단계)
// 저장은 db.applyHouseRule(= mutateProfile 한 트랜잭션), 부르는 곳은 xp.restStart·restCancel·restClaim.
//
// 아버님 말씀: 집에 회복 기계를 사서 놓고, 진우가 고른 포켓몬 **한 마리**를 넣어 **1시간** 쉬게 한다.
//   다 쉬면 ❤️ HP가 가득 · 경험치가 조금 오르고 · 아주 가끔 **5% 레벨 +1** · **0.5% 진화** — 그때 연출을 풍부하게.
// 기본값(설계안 승인):
//   · 💤 쉼 경험치 +10, 100이 모이면 **스톤 없이** 레벨 +1 — 진화 레벨에서 멈춘다(evolve.nextCost — 두 과목 요구가 그대로)
//   · 5% 레벨은 스톤 없이 · 더 못 오르면(진화 레벨·만렙) 대신 💰100 (💤는 그때 쓸 데가 없다)
//   · 0.5% 깜짝 진화는 **레벨이 모자라도** — 진우가 정한다(원작의 B 버튼처럼 "그대로 두기"도 · 이브이는 갈래 고르기).
//     진화 없는 종이면 레벨 행운으로
//   · 같은 종은 캡슐 한 대에만(❤️·레벨이 종 단위라 두 대면 행운이 두 번) · 일찍 꺼내면 보상 없음
//   · 쉬는 동안 다른 곳은 막지 않는다 — 다 쉬었을 때 그 포켓몬이 없으면 보상 없이 빈다
// 저장의 집 규칙(메모 profile-merge-invariants):
//   · 결과(luck)는 **넣을 때** 정해 둔다 — 두 창·저장 실패로 다시 뽑지 못하게
//   · 받은/꺼낸 휴식 id는 profile.restsDone(병합 합집합) — 옛 창·옛 백업의 집이 같은 휴식을 되살리지 못한다(house.houseOf가 지운다)
//   · 💤는 늘어나기만 하는 두 카운터 mons[id].rx(모은 💤 누적) · rxLv(💤로 오른 레벨 누적) — 병합은 max
//   · 시각은 규칙을 돌리는 때(트랜잭션 안의 now) — 창을 연 때가 아니라
//   · 받기·꺼내기는 진우가 **본 그 휴식**(id)에 묶는다 — 캡슐 번호만 보면 옛 창의 단추가 그 사이 새로 들어간 다른 포켓몬의
//     휴식을 받았다(Codex 47차 #2) → 다르면 'changed'
// ⏰ 1시간은 **태블릿 시계**로 잰다 — 시계를 앞으로 돌리면 일찍, 뒤로 돌리면 늦게 받는다(앱이 진짜 흐른 시간을 알 길이 없다.
//    시계 관리는 부모님 몫 — Codex 47차 A, 아버님께 알림)
import { HEAL, houseOf, restsOf } from './house.js';
import { haveOf, lvOf, nextCost, evoOf, evoTo, capReason } from './evolve.js';

/** 쉬는 시간 — 1시간 (아버님) */
export const REST_MS = 60 * 60 * 1000;
/** 한 번 쉬면 💤 */
export const REST_EXP = 10;
/** 💤가 이만큼이면 레벨 +1 */
export const EXP_LV = 100;
/** 행운 — 깜짝 진화 0.5% · 레벨 5% (아버님) */
export const LUCK = { evo: 0.005, lv: 0.05 };
/** 레벨이 더 못 오를 때 레벨 행운 대신 */
export const LUCK_COINS = 100;

/** 넣을 때 뽑는 행운 (r = 0 이상 1 미만) → 'evo' | 'lv' | '' */
export function rollLuck(r) {
  const x = typeof r === 'number' ? r : NaN;
  if (!(x >= 0 && x < 1)) return '';
  if (x < LUCK.evo) return 'evo';
  if (x < LUCK.evo + LUCK.lv) return 'lv';
  return '';
}

/** 남은 시간(ms, 0 이상) */
export function restLeft(rest, now) {
  return Math.max(0, Math.ceil(Number(rest && rest.at) + REST_MS - Number(now)) || 0);
}

/** 레벨 행운이 💰로 바뀐 까닭 → 말 (화면·연출 같은 말) — 'evolve' 진화 레벨에서 멈춤 · 'max' 만렙 */
export const CAP_KO = { evolve: '진화할 때가 되어서', max: '레벨이 가득해서' };

/** 💤 카운터 읽기 — 안전한 0 이상 정수만. 깨진 백업의 "1e309"(무한대)·아주 큰 수·음수·글자는 0
 *  (Codex 47차 #4: 무한대 💤로 한 번 쉬고 Lv5가 되고 막대가 NaN이었다) — 병합(db)도 이것으로 */
export function restCount(v) {
  const n = Math.floor(Number(v));
  return Number.isSafeInteger(n) && n > 0 ? n : 0;
}
/** 💤 두 카운터 { rx, rxLv } — 💤로 오른 레벨(rxLv)은 모은 💤로 오를 수 있는 수(rx / EXP_LV)를 넘지 않는다 */
export function rxOf(mon) {
  const rx = restCount(mon && mon.rx);
  return { rx, rxLv: Math.min(restCount(mon && mon.rxLv), Math.floor(rx / EXP_LV)) };
}

/** 💤 막대 — { have: 지금 막대(0~EXP_LV), need: EXP_LV, full } (rx·rxLv 누적에서) */
export function expOf(mon) {
  const { rx, rxLv } = rxOf(mon);
  const have = Math.max(0, Math.min(EXP_LV, rx - rxLv * EXP_LV));
  return { have, need: EXP_LV, full: have >= EXP_LV };
}

/** 집 전체에서 번호 u의 가구 → { room, it } (없으면 null) */
function findPlaced(h, u) {
  for (const room of h.rooms) {
    const it = room.items.find((i) => i.u === u);
    if (it) return { room, it };
  }
  return null;
}

/**
 * 🐾 캡슐에 넣기 — 놓인 캡슐 u에 데리고 있는 포켓몬 monId 한 마리. 행운(luck)은 부르는 쪽이 rollLuck으로 뽑아 온다.
 * why: 'gone' 그런 캡슐이 없음 · 'busy' 이미 다른 포켓몬이 쉼 · 'none' 데리고 있지 않음 · 'twice' 같은 종이 다른 캡슐에서 쉼
 * @returns {{ok:boolean, why?:string, rest?:{id:string, mon:number, at:number, luck:string}}}
 */
export function restStartRule(profile, u, monId, now, luck) {
  const h = houseOf(profile);
  const f = findPlaced(h, u);
  if (!f || f.it.id !== HEAL) return { ok: false, why: 'gone' };
  if (f.it.rest) return { ok: false, why: 'busy' };
  const mon = Number(monId);
  if (!Number.isSafeInteger(mon) || mon <= 0 || haveOf((profile.caught || {})[mon], (profile.mons || {})[mon]) < 1) return { ok: false, why: 'none' };
  const active = restsOf(h); // 놓인 캡슐 + 맡겨 둔 휴식(서랍의 캡슐)
  if (active.some((r) => r.mon === mon)) return { ok: false, why: 'twice' };
  const at = Math.floor(Number(now));
  // 기록 번호가 겹치면 덧번호 — 시계를 되돌려 같은 때 같은 캡슐에 다시 넣으면 받은/꺼낸 번호와 같아져
  // 넣자마자 houseOf가 지웠다("넣었는데 안 보임", Codex 47차 #3)
  const done = isObj(profile.restsDone) ? profile.restsDone : {};
  const used = new Set(active.map((r) => r.id));
  const base = `${at}:${f.it.u}:${mon}`;
  let id = base;
  for (let k = 2; used.has(id) || hasOwn(done, id); k++) id = `${base}~${k}`;
  const rest = { id, mon, at, luck: rollable(luck) };
  f.it.rest = rest;
  profile.house = h;
  return { ok: true, rest: { ...rest } };
}
const rollable = (l) => (l === 'evo' || l === 'lv' ? l : '');
const isObj = (o) => !!o && typeof o === 'object' && !Array.isArray(o);
const hasOwn = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
/** 진우가 본 휴식과 다른가 — want를 안 주면(옛 부름) 묻지 않는다 */
const changed = (rest, want) => want !== undefined && want !== null && rest.id !== want;

/** 받은/꺼낸 휴식을 적는다 (합집합 — 옛 집 기록이 되살리지 못하게) */
function markDone(profile, id, now) {
  const d = profile.restsDone && typeof profile.restsDone === 'object' && !Array.isArray(profile.restsDone) ? profile.restsDone : {};
  profile.restsDone = { ...d, [id]: Math.floor(Number(now)) || 1 };
}

/** ⏏️ 일찍 꺼내기 — 보상 없이 비운다 · why 'gone' 쉬는 포켓몬이 없음 · 'changed' 진우가 본 휴식(want)이 아님 ·
 *  'ready' 이미 다 쉼(꺼내기로 보상을 잃지 않게 — 받기로) */
export function restCancelRule(profile, u, now, want) {
  const h = houseOf(profile);
  const f = findPlaced(h, u);
  if (!f || !f.it.rest) return { ok: false, why: 'gone' };
  const rest = f.it.rest;
  if (changed(rest, want)) return { ok: false, why: 'changed' };
  if (restLeft(rest, now) === 0) return { ok: false, why: 'ready' };
  delete f.it.rest;
  profile.house = h;
  markDone(profile, rest.id, now);
  return { ok: true, rest: { ...rest } };
}

/**
 * ✨ 다 쉰 포켓몬 받기 — 한 트랜잭션에서: ❤️ 가득 · 💤 +REST_EXP(100마다 레벨 +1) · 행운(레벨 / 깜짝 진화) · 휴식은 restsDone으로.
 * 깜짝 진화면 진우가 정해야 한다: decide 없음 → { why: 'decide', choices } (아무것도 안 바꿈) · 0 → 그대로 두기 · 갈래 id → 진화
 * evolve = db.evolveRule (이 파일은 db를 모른다 — 순환 없게 부르는 쪽이 넘긴다)
 * want = 진우가 본 휴식 id — 다르면 'changed'(옛 창의 단추가 새 휴식을 받지 않게)
 * why: 'gone' 쉬는 포켓몬 없음 · 'changed' · 'early' 아직(left ms) · 'decide'(id = 물은 휴식) · 'to' 없는 갈래
 * @returns {{ok:boolean, why?:string, left?:number, id?:string, choices?:number[], mon?:number, gone?:boolean, luck?:string,
 *   hp?:{from:number,to:number}, exp?:{from:number,to:number,lvUp:number,end:number}, lv?:{from:number,to:number}, coins?:number,
 *   cap?:'evolve'|'max'|null, evo?:object|null, kept?:boolean}}
 *   exp.to = 막대가 차오르는 끝(가득이면 100) · exp.end = 받은 뒤 진짜 막대(레벨이 오르면 남은 💤 — 95 + 10이면 5, Codex 47차 #5)
 *   cap = 레벨 행운이 💰로 바뀐 까닭 · kept = 깜짝 진화였는데 진우가 "그대로 두기"를 골랐다
 */
export function restClaimRule(profile, u, now, decide, hpMax, evolve, want) {
  const h = houseOf(profile);
  const f = findPlaced(h, u);
  if (!f || !f.it.rest) return { ok: false, why: 'gone' };
  const rest = f.it.rest;
  if (changed(rest, want)) return { ok: false, why: 'changed' };
  const left = restLeft(rest, now);
  if (left > 0) return { ok: false, why: 'early', left };
  const mon = rest.mon;
  const m0 = (profile.mons || {})[mon] || {};
  const have = haveOf((profile.caught || {})[mon], m0);
  const branches = evoOf(mon).map((e) => e.to);
  const evoLuck = rest.luck === 'evo' && branches.length > 0 && have > 0;
  if (evoLuck) {
    if (decide === undefined || decide === null) return { ok: false, why: 'decide', id: rest.id, mon, choices: branches };
    if (Number(decide) !== 0 && !evoTo(mon, decide)) return { ok: false, why: 'to' };
  }
  // 여기부터 바꾼다 — 휴식은 끝났다(보상이 있든 없든)
  delete f.it.rest;
  profile.house = h;
  markDone(profile, rest.id, now);
  if (have < 1) return { ok: true, mon, gone: true };

  const max = Number(hpMax) || 100;
  const hpFrom = typeof m0.hp === 'number' ? Math.max(0, Math.min(max, m0.hp)) : max;
  const bar = expOf(m0).have;
  let { rx, rxLv } = rxOf(m0);
  rx = Math.min(Number.MAX_SAFE_INTEGER, rx + REST_EXP); // 끝에서 멈춘다 — 넘치면 다음 읽기에서 0이 됐다 (Codex 48차 PART 1 #4)
  const lvFrom = lvOf(m0);
  let lv = lvFrom;
  let lvUp = 0;
  // 💤로 레벨 — 진화 레벨·만렙이면 멈춘다(💤는 쌓여 막대가 가득)
  while (Math.floor(rx / EXP_LV) > rxLv && nextCost(lv, mon)) { lv++; rxLv++; lvUp++; }
  // 행운 — 레벨(진화 없는 종의 깜짝 진화도 레벨로) · 더 못 오르면 💰
  let coins = 0;
  if (rest.luck === 'lv' || (rest.luck === 'evo' && !branches.length)) {
    if (nextCost(lv, mon)) lv++;
    else coins = LUCK_COINS;
  }
  profile.mons = { ...(profile.mons || {}) };
  profile.mons[mon] = { ...m0, hp: max, rx, rxLv, lv };
  if (coins) {
    profile.coins = (Number(profile.coins) || 0) + coins;
    profile.coinsEarned = (Number(profile.coinsEarned) || 0) + coins;
  }
  let evo = null;
  if (evoLuck && Number(decide) !== 0) evo = evolve(profile, mon, Number(decide), max, now, { anyLevel: true });
  return {
    ok: true, mon, luck: rest.luck,
    hp: { from: hpFrom, to: max },
    exp: { from: bar, to: Math.min(EXP_LV, bar + REST_EXP), lvUp, end: expOf({ rx, rxLv }).have },
    lv: { from: lvFrom, to: lv },
    coins, cap: coins ? capReason(mon, lv) : null, evo,
    kept: evoLuck && Number(decide) === 0,
  };
}
