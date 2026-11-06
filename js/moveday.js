// 🚚 포켓몬 이사 대작전 (v397, 2026-11-06 아버님 기본안 「이대로」) — 순수 규칙 · 화면은 moveview.js · 그림은 movescene.js
// 대여행 자리에서 딱 한 번 하는 특별편: 6마리와 짐 싸기 → 옛집 인사 → 이삿길 → 새 집 청소 → 짐 풀기 → 집들이 → 🚀
//   일마다 이미 배운 문제(대여행과 같은 원천)를 푼다 · 맞히면 일이 줄고(타입이 맞으면 두 배) · 틀려도 잃는 것 없이 다른 문제로(❤️ 없음)
//   끝까지 가면 대여행 보상(💰 · 스톤 · Lv +1)에 더해 📐 방 넓히기 + 🏗️ 2층을 그대로 준다 · 벽지·바닥 고르기 · 손님 하나 데려오기 · 가구 · 새 집 첫 밤 · 한 줄 쓰기
// 저장: profile.journey.move — 대여행 기록 안에 두어 프로필 복사·병합이 함께 간다(journey.js는 내용을 모르고 그대로 옮긴다 · 고쳐 읽기는 여기 moveOf)
//   · 바꾸기는 모두 xp.houseDo(저장된 프로필로 한 트랜잭션) · 답은 qn이 맞아야 받는다(두 창·두 번 누름이 두 번 받지 않게)
//   · 끝까지 간 답이 phase를 go → gift로 넘기는 한 번만 보상 · 집 선물은 몇 번 불러도 같다(옛 백업이 가방을 되돌려도 다음 단계에서 다시 채운다)
//   · 끝나면 그 주 대여행 자리(journey.done)를 채운다 — 그 주에 여행이 또 열리지 않게
import { JOURNEY, ROCKET_MON, EVENTS, SUBJECTS, isMon, advantage, typesOf, journeyOf, stateOf, ownedIds, weekOf, dayKeyOf, rewardRule, qOf, pairOf, weighted, wildW, qLine } from './journey.js';
import { PAINT, houseOf, paintRule, storeRule } from './house.js';

const isObj = (v) => !!v && typeof v === 'object' && !Array.isArray(v);
const own = (o, k) => !!o && Object.prototype.hasOwnProperty.call(o, k);
const cnt = (v) => { const n = Math.floor(Number(v)); return Number.isSafeInteger(n) && n > 0 ? n : 0; };
const ID_RE = /^[a-z0-9]{6,24}$/;

export const MOVE = {
  openDay: '2026-11-14', // 이날(토요일)부터 대여행 자리에 나온다 · 끝낼 때까지 토요일 여행 대신
  party: JOURNEY.party,
  hp: { job: 2, big: 4, guest: 2, rocket: JOURNEY.hp.rocket }, // 일의 양 — 👑 큰일은 대장 자리, 🚀는 대여행과 같게
  noteMax: 80, // 한 줄 쓰기 글자 끝
  helloDays: 7, // 끝난 뒤 며칠 🐾 손님이 집들이 말을 하나
};
/** 넓히기·2층 — 집 규칙(houseShape)이 가방의 이 둘로 집 모양을 정한다 */
export const HOUSE_GIFT = ['x_wide', 'x_floor2'];

/** 단계 — types는 그 단계 일을 잘 돕는 타입(맞으면 일이 두 배) · jobs는 차례대로(셋째가 👑 큰일) · 집들이는 손님이 대신 */
export const STAGES = [
  { key: 'pack', ko: '짐 싸기', short: '짐 싸기', fin: '짐을 다 쌌다!', emoji: '📦', types: ['fighting', 'rock'], arrive: '이사 준비 시작!', jobs: [{ id: 'books', ko: '책 상자', emoji: '📚' }, { id: 'toys', ko: '장난감 상자', emoji: '🧸' }, { id: 'closet', ko: '큰 장롱', emoji: '🚪', big: true }] },
  { key: 'bye', ko: '고마웠어, 옛집!', short: '옛집 인사', fin: '옛집에 인사를 마쳤다!', emoji: '👋', types: ['grass', 'bug'], arrive: '신나는 일이 많았어. 새 집에서 또 놀자!', jobs: [{ id: 'pots', ko: '화분 챙기기', emoji: '🪴' }, { id: 'yard', ko: '마당 쓸기', emoji: '🧹' }, { id: 'photo', ko: '다 함께 사진 찍기', emoji: '📸', big: true }] },
  { key: 'road', ko: '이삿길', short: '이삿길', fin: '새 집에 도착했다!', emoji: '🚚', types: ['electric', 'steel'], arrive: '금방 도착이야! 어? 상자가 떨어졌어!', jobs: [{ id: 'engine', ko: '트럭 시동 걸기', emoji: '🔑' }, { id: 'boxes', ko: '떨어진 상자 줍기', emoji: '📦' }, { id: 'hill', ko: '오르막 밀어 올리기', emoji: '⛰️', big: true }] },
  { key: 'clean', ko: '새 집 청소', short: '새 집 청소', fin: '집이 반짝반짝해졌다!', emoji: '🧹', types: ['water', 'ice'], arrive: '와, 넓다! 2층도 있어!', jobs: [{ id: 'window', ko: '창문 닦기', emoji: '🪟' }, { id: 'floor', ko: '바닥 닦기', emoji: '🫧' }, { id: 'stairs', ko: '계단 끝까지 닦기', emoji: '🪜', big: true }] },
  { key: 'unpack', ko: '짐 풀기', short: '짐 풀기', fin: '짐을 다 풀었다!', emoji: '🛋️', types: ['psychic', 'fairy'], arrive: '이건 어디에 둘까?', jobs: [{ id: 'open', ko: '상자 열기', emoji: '📦' }, { id: 'lamp', ko: '전등 달기', emoji: '💡' }, { id: 'piano', ko: '피아노 2층으로 올리기', emoji: '🎹', big: true }] },
  { key: 'party', ko: '집들이', short: '집들이', fin: '', emoji: '🎉', types: ['fire', 'normal'], arrive: '동네 친구들이 구경하러 왔어!', jobs: null },
];
export const PER_STAGE = 3;
export const GUESTS = PER_STAGE;
const LAST_STAGE = STAGES.length - 1;
export const MOVE_STOPS = STAGES.length * PER_STAGE + 1;
const PHASES = ['go', 'gift', 'pick', 'furn', 'last', 'end'];
const FURN_WAYS = ['fresh', 'keep'];

/** 그 자리의 일 (순수) — { kind: 'job'|'big'|'guest'|'rocket', stage, job?, mon? } */
export function stopAt(m, i) {
  if (i >= MOVE_STOPS - 1) return { kind: 'rocket', stage: LAST_STAGE, mon: ROCKET_MON };
  const stage = Math.floor(i / PER_STAGE);
  const k = i % PER_STAGE;
  if (stage === LAST_STAGE) return { kind: 'guest', stage, mon: m.guests[k] };
  const job = STAGES[stage].jobs[k];
  return { kind: job.big ? 'big' : 'job', stage, job };
}
export const hpOfStop = (s) => MOVE.hp[s.kind];
/** 이 포켓몬이 이 일을 잘 돕나 — 그 단계 타입이면 · 🚀는 대여행처럼 상대를 본다 */
export function helps(mon, s) {
  if (s.kind === 'rocket') return advantage(mon, ROCKET_MON);
  return typesOf(mon).some((t) => STAGES[s.stage].types.includes(t));
}
/** 이 포켓몬이 잘 돕는 단계 (STAGES 차례) — 출발 준비의 「짐 싸기·청소에서 힘을 내요」 */
export const strongStages = (mon) => STAGES.map((st, i) => (typesOf(mon).some((t) => st.types.includes(t)) ? i : -1)).filter((i) => i >= 0);

function evOf(raw, guests) {
  if (!Array.isArray(raw) || raw.length !== STAGES.length) return null;
  const out = [];
  const seen = new Set(guests);
  for (const e of raw) {
    if (!isObj(e) || !EVENTS.includes(e.k)) return null;
    const o = { k: e.k, d: e.d ? 1 : 0 };
    if (e.k === 'prof') {
      const m = Number(e.m);
      if (!isMon(m)) return null;
      o.m = m;
      o.f = e.f === 'shadow' ? 'shadow' : 'type';
    } else if (e.k === 'fork') {
      const a = Number(e.alt);
      const g = Number(e.g);
      if (!isMon(a) || seen.has(a) || !Number.isSafeInteger(g) || g < 0 || g >= GUESTS) return null;
      seen.add(a);
      o.alt = a;
      o.g = g;
    }
    out.push(o);
  }
  return out;
}
const monsOf = (raw, max) => {
  if (!Array.isArray(raw) || !raw.length || raw.length > max) return null;
  const ids = raw.map(Number);
  return ids.every(isMon) && new Set(ids).size === ids.length ? ids : null;
};
const noteOf = (v) => (typeof v === 'string' ? v.trim().slice(0, MOVE.noteMax) : '');
const rowsOf = (v) => (Array.isArray(v) ? v.filter(Array.isArray).slice(0, MOVE.party) : []);

/** 저장된 이사 고쳐 읽기 (새 객체) — 틀린 곳이 있으면 null */
export function moveOf(raw) {
  if (!isObj(raw) || !ID_RE.test(String(raw.id)) || !PHASES.includes(raw.phase)) return null;
  const party = monsOf(raw.party, MOVE.party);
  const guests = monsOf(raw.guests, GUESTS);
  if (!party || !guests || guests.length !== GUESTS) return null;
  const ev = evOf(raw.ev, guests);
  if (!ev) return null;
  const at = Number(raw.at);
  const going = raw.phase === 'go';
  if (!Number.isSafeInteger(at) || at < 0 || at > MOVE_STOPS || (going ? at >= MOVE_STOPS : at !== MOVE_STOPS)) return null;
  const hp = Number(raw.hp);
  if (!Number.isSafeInteger(hp) || hp < 0 || hp > (going ? hpOfStop(stopAt({ guests }, at)) : 0) || (going && hp < 1)) return null;
  const swap = Number(raw.swap);
  const out = {
    id: String(raw.id), party, guests, ev, at, hp, phase: raw.phase,
    qn: Math.min(cnt(raw.qn), 99999), qv: Math.min(cnt(raw.qv), 999),
    swap: Number.isSafeInteger(swap) && swap >= 0 && swap < MOVE_STOPS ? swap : -1,
    q: qOf(raw.q), pf: pairOf(raw.pf) || [0, 0], startAt: cnt(raw.startAt), endAt: cnt(raw.endAt),
    lv: rowsOf(raw.lv), sub: rowsOf(raw.sub),
    week: typeof raw.week === 'string' ? raw.week.slice(0, 10) : '',
    wall: typeof raw.wall === 'string' ? raw.wall : '', floor: typeof raw.floor === 'string' ? raw.floor : '',
    pick: isMon(Number(raw.pick)) ? Number(raw.pick) : 0, furn: FURN_WAYS.includes(raw.furn) ? raw.furn : '',
    old: noteOf(raw.old), fav: noteOf(raw.fav),
  };
  return out;
}

/**
 * 화면이 볼 지금 상태 (순수) — mode: 'wait'(아직 · 대여행 자리 그대로) · 'open'(떠날 수 있음) · 'go'·'gift'·'pick'·'furn'·'last'(이사 중) · 'end'(끝)
 * 주 여행을 하던 중이거나 데려올 포켓몬을 안 골랐으면 그것부터(그 여행은 그대로 끝낸다)
 */
export function moveState(raw, today) {
  const j = journeyOf(raw);
  const m = moveOf(j.move);
  if (m) return { mode: m.phase, m };
  if (Object.values(j.done).some((e) => e.mv)) return { mode: 'end' }; // 이사 기록이 깨졌어도 끝낸 흔적이 있으면 다시 안 열린다 — 보상을 또 받지 않게 (Codex 200차 #3)
  if (!(String(today) >= MOVE.openDay)) return { mode: 'wait' };
  const w = stateOf(raw, today).mode;
  return { mode: w === 'pick' || w === 'go' ? 'wait' : 'open' };
}
/** 대여행 자리에 이사 카드를 낼까 */
export const moveOnCard = (st) => st.mode !== 'wait' && st.mode !== 'end';

/** 지금 풀 이벤트의 단계 (없으면 -1) — 단계의 첫 일 앞 · 아직 안 한 것 */
export function pendingEvent(m) {
  if (!m || m.phase !== 'go' || m.at >= MOVE_STOPS - 1 || m.at % PER_STAGE !== 0) return -1;
  const z = m.at / PER_STAGE;
  return m.ev[z] && !m.ev[z].d ? z : -1;
}

function load(p) {
  const j = journeyOf(p.journey);
  return { j, m: moveOf(j.move) };
}
function save(p, j, m) {
  p.journey = journeyOf({ ...j, move: m });
}
/** 📐·🏗️ 집 선물 — 이미 있으면 그대로 (샀든 받았든 값을 또 내거나 두 개가 되지 않는다) */
function grantHouse(p) {
  p.items = isObj(p.items) ? p.items : {};
  for (const id of HOUSE_GIFT) if (!(cnt(p.items[id]) > 0)) p.items[id] = 1;
}

/** 주 여행을 시작하면 안 되나 — 이사가 그 자리에 있을 때 (오래 켜 둔 다른 창의 출발 단추가 이사를 건너뛰지 않게 · Codex 200차 #1) */
export const moveBlocksTrip = (p, now) => moveOnCard(moveState(p && p.journey, dayKeyOf(now)));

/** 🏠 합친 기록이 이사를 끝낸 쪽인데 가방이 다른 쪽이면 집 선물만 되찾는다 (db 병합 안에서 · 코인·스톤은 다시 안 준다 · Codex 200차 #2) */
export function healMoveHouse(p) {
  const m = moveOf(journeyOf(p.journey).move);
  if (m && m.phase !== 'go') grantHouse(p);
}

/** 🚚 떠나기 — { id, party, guests, ev } · why: 'going' · 'wait'(아직 안 열림) · 'journey'(주 여행부터) · 'id' · 'guests' · 'ev' · 'party' */
export function moveStartRule(p, req, now) {
  const { j, m } = load(p);
  if (m) return { ok: false, why: 'going' };
  const st = moveState(p.journey, dayKeyOf(now));
  if (st.mode === 'end') return { ok: false, why: 'going' };
  if (st.mode === 'wait') return { ok: false, why: String(dayKeyOf(now)) >= MOVE.openDay ? 'journey' : 'wait' };
  const r = req || {};
  if (!ID_RE.test(String(r.id))) return { ok: false, why: 'id' };
  const guests = monsOf(r.guests, GUESTS);
  if (!guests || guests.length !== GUESTS) return { ok: false, why: 'guests' };
  const ev = evOf(r.ev, guests);
  if (!ev) return { ok: false, why: 'ev' };
  const owned = ownedIds(p);
  const need = Math.min(MOVE.party, owned.length);
  const party = monsOf(r.party, MOVE.party);
  if (!need || !party || party.length !== need || !party.every((id) => owned.includes(id))) return { ok: false, why: 'party' };
  const mv = { id: String(r.id), party, guests, ev: ev.map((e) => ({ ...e, d: 0 })), at: 0, hp: hpOfStop(stopAt({ guests }, 0)), phase: 'go', qn: 0, qv: 0, swap: -1, q: {}, pf: [0, 0], startAt: now };
  save(p, j, mv);
  return { ok: true, cur: load(p).m };
}

/**
 * ✏️ 답 하나 — { id, qn, mon(일할 포켓몬), subj, correct } · subjectOf: 포켓몬 → 과목(대여행 보상과 같다)
 * → { ok, correct, adv, hit, finished(이 일이 끝남), stageDone, end: 'won'|null, hp, at, cur } · 틀려도 잃는 것 없이 다음 문제로
 * why: 'changed'(다른 창이 먼저 답했거나 이사가 바뀜) · 'event'(단계 이벤트가 먼저) · 'mon' · 'subj'
 */
export function moveAnswerRule(p, req, now, subjectOf) {
  const { j, m } = load(p);
  const r = req || {};
  if (!m || m.id !== r.id || m.phase !== 'go' || m.qn !== r.qn) return { ok: false, why: 'changed' };
  if (pendingEvent(m) >= 0) return { ok: false, why: 'event' };
  const mon = Number(r.mon);
  if (!m.party.includes(mon)) return { ok: false, why: 'mon' };
  if (!SUBJECTS.includes(r.subj)) return { ok: false, why: 'subj' };
  const correct = r.correct === true;
  const t = m.q[r.subj] || [0, 0];
  m.q[r.subj] = [t[0] + (correct ? 1 : 0), t[1] + 1];
  m.qn += 1;
  const stop = stopAt(m, m.at);
  const out = { ok: true, correct, adv: false, hit: 0, finished: false, stageDone: false, end: null };
  if (correct) {
    out.adv = helps(mon, stop);
    out.hit = out.adv ? 2 : 1;
    m.hp = Math.max(0, m.hp - out.hit);
    if (!m.hp) {
      out.finished = true;
      m.at += 1;
      if (m.at >= MOVE_STOPS) {
        const rw = rewardRule(p, m, subjectOf);
        grantHouse(p);
        const week = weekOf(dayKeyOf(now));
        j.done[week] = own(j.done, week) ? { ...j.done[week], mv: 1 } : { r: 'won', at: now, q: m.q, ...(m.pf[1] ? { pf: m.pf } : {}), lv: rw.lv, sub: rw.sub, mv: 1 }; // 이미 끝낸 주면 그 줄에 표시만
        Object.assign(m, { phase: 'gift', lv: rw.lv, sub: rw.sub, week, hp: 0 });
        out.end = 'won';
      } else {
        const next = stopAt(m, m.at);
        out.stageDone = next.stage !== stop.stage;
        m.hp = hpOfStop(next);
      }
    }
  }
  out.hp = m.hp;
  out.at = m.at;
  save(p, j, m);
  out.cur = load(p).m;
  return out;
}

/** 🔄 다른 문제 — 일마다 한 번 · { id, qn } · why: 'changed' · 'event' · 'used' */
export function moveSwapRule(p, req) {
  const { j, m } = load(p);
  const r = req || {};
  if (!m || m.id !== r.id || m.phase !== 'go' || m.qn !== r.qn) return { ok: false, why: 'changed' };
  if (pendingEvent(m) >= 0) return { ok: false, why: 'event' };
  if (m.swap === m.at) return { ok: false, why: 'used' };
  m.swap = m.at;
  m.qv += 1;
  m.qn += 1;
  save(p, j, m);
  return { ok: true, cur: load(p).m };
}

/**
 * 🎁🔬🔀 단계 이벤트 하나 — { id, qn, kind, 상자면 subj·correct(또는 skip) · 박사 퀴즈면 correct · 갈림길이면 pick(부를 손님) }
 * 🎁 맞히면 💰 chestCoins · 🔬 맞히면 💰 profCoins · 🔀 고른 쪽이 집들이 손님이 된다 · 틀려도 잃는 것 없음
 */
export function moveEventRule(p, req) {
  const { j, m } = load(p);
  const r = req || {};
  if (!m || m.id !== r.id || m.phase !== 'go' || m.qn !== r.qn) return { ok: false, why: 'changed' };
  const z = pendingEvent(m);
  if (z < 0 || m.ev[z].k !== r.kind) return { ok: false, why: 'changed' };
  const e = m.ev[z];
  const out = { ok: true, kind: e.k, correct: false, coins: 0, pick: 0 };
  if (e.k === 'chest' && r.skip === true) {
    // 문제를 만들지 못했다 — 셈도 보상도 없이 지나간다
  } else if (e.k === 'chest') {
    if (!SUBJECTS.includes(r.subj)) return { ok: false, why: 'subj' };
    out.correct = r.correct === true;
    const t = m.q[r.subj] || [0, 0];
    m.q[r.subj] = [t[0] + (out.correct ? 1 : 0), t[1] + 1];
    if (out.correct) out.coins = JOURNEY.chestCoins;
  } else if (e.k === 'prof') {
    out.correct = r.correct === true;
    m.pf = [m.pf[0] + (out.correct ? 1 : 0), m.pf[1] + 1];
    if (out.correct) out.coins = JOURNEY.profCoins;
  } else {
    const pick = Number(r.pick);
    if (pick !== m.guests[e.g] && pick !== e.alt) return { ok: false, why: 'mon' };
    if (pick === e.alt) { e.alt = m.guests[e.g]; m.guests[e.g] = pick; }
    out.pick = pick;
  }
  if (out.coins) { p.coins = cnt(p.coins) + out.coins; p.coinsEarned = cnt(p.coinsEarned) + out.coins; }
  e.d = 1;
  m.qn += 1;
  save(p, j, m);
  out.cur = load(p).m;
  return out;
}

/** 🖌️ 벽지·바닥 고르기 — { id, wall, floor } ('' = 지금 그대로) · 고른 것을 가방에 넣고 모든 방에 바른다 */
export function moveGiftRule(p, req) {
  const { j, m } = load(p);
  const r = req || {};
  if (!m || m.id !== r.id || m.phase !== 'gift') return { ok: false, why: 'changed' };
  const pick = (part, id) => (id === '' || PAINT.some((x) => x.id === id && x.part === part) ? id : null);
  const wall = pick('wall', r.wall);
  const floor = pick('floor', r.floor);
  if (wall === null || floor === null) return { ok: false, why: 'paint' };
  grantHouse(p);
  for (const id of [wall, floor]) if (id && !(cnt(p.items[id]) > 0)) p.items[id] = 1;
  for (const room of houseOf(p).rooms) {
    if (wall) paintRule(p, room.id, 'wall', wall);
    if (floor) paintRule(p, room.id, 'floor', floor);
  }
  Object.assign(m, { wall, floor, phase: 'pick' });
  save(p, j, m);
  return { ok: true, cur: load(p).m };
}

/** 🎉 데려올 손님 — { id, mon } → { ok, mon, first } */
export function movePickRule(p, req) {
  const { j, m } = load(p);
  const r = req || {};
  const mon = Number(r.mon);
  if (!m || m.id !== r.id || m.phase !== 'pick') return { ok: false, why: 'changed' };
  if (!m.guests.includes(mon)) return { ok: false, why: 'mon' };
  grantHouse(p);
  p.caught = isObj(p.caught) ? p.caught : {};
  const first = !(cnt(p.caught[mon]) > 0);
  p.caught[mon] = cnt(p.caught[mon]) + 1;
  if (own(j.done, m.week) && j.done[m.week].mv) j.done[m.week] = { ...j.done[m.week], pick: mon };
  Object.assign(m, { pick: mon, phase: 'furn' });
  save(p, j, m);
  return { ok: true, mon, first, cur: load(p).m };
}

/** 📦 가구 — { id, how: 'fresh'(서랍으로 — 새로 놓기) | 'keep'(자리 그대로) } · 💊 쉬는 캡슐은 그 자리에 둔다 */
export function moveFurnRule(p, req) {
  const { j, m } = load(p);
  const r = req || {};
  if (!m || m.id !== r.id || m.phase !== 'furn') return { ok: false, why: 'changed' };
  if (!FURN_WAYS.includes(r.how)) return { ok: false, why: 'how' };
  grantHouse(p);
  if (r.how === 'fresh') for (const room of houseOf(p).rooms) for (const it of room.items) storeRule(p, room.id, it.u);
  Object.assign(m, { furn: r.how, phase: 'last' });
  save(p, j, m);
  return { ok: true, cur: load(p).m };
}

/** ✍️ 끝 — { id, old, fav } (둘 다 안 써도 된다) */
export function moveEndRule(p, req, now) {
  const { j, m } = load(p);
  const r = req || {};
  if (!m || m.id !== r.id || m.phase !== 'last') return { ok: false, why: 'changed' };
  grantHouse(p);
  Object.assign(m, { old: noteOf(r.old), fav: noteOf(r.fav), phase: 'end', endAt: now });
  save(p, j, m);
  return { ok: true };
}

// ── 만들기 (화면이 부른다 — 순수) ──

const unit = (rng) => () => Math.min(0.999999, Math.max(0, Number(rng()) || 0));

/** 집들이 손님 셋 — cands: [{ id, caught, rarity }] · 못 잡은 포켓몬을 더 자주 · 모자라면 null */
export function makeGuests(cands, rng = Math.random) {
  const r = unit(rng);
  let list = (Array.isArray(cands) ? cands : []).filter((c) => c && isMon(Number(c.id)));
  const out = [];
  for (let i = 0; i < GUESTS; i++) {
    if (!list.length) return null;
    const c = weighted(list, wildW, r);
    out.push(Number(c.id));
    list = list.filter((x) => x !== c);
  }
  return out;
}
/** 단계 이벤트 — 단계 여섯에 🎁 둘 · 🔬 둘 · 🔀 둘을 아무렇게나 · 🔀는 부를 손님을 둘 가운데 고른다(후보가 모자라면 🎁) */
export function makeMoveEvents(guests, cands, rng = Math.random) {
  const r = unit(rng);
  const kinds = ['chest', 'chest', 'prof', 'prof', 'fork', 'fork'];
  for (let i = kinds.length - 1; i > 0; i--) { const k = Math.floor(r() * (i + 1)); [kinds[i], kinds[k]] = [kinds[k], kinds[i]]; }
  const pool = (Array.isArray(cands) ? cands : []).filter((c) => c && isMon(Number(c.id)));
  const used = new Set(guests);
  let g = 0;
  return kinds.map((k) => {
    if (k === 'fork') {
      const left = pool.filter((c) => !used.has(Number(c.id)));
      if (left.length) {
        const alt = Number(weighted(left, wildW, r).id);
        used.add(alt);
        return { k, d: 0, alt, g: g++ };
      }
    }
    if (k === 'prof' && pool.length) return { k, d: 0, m: Number(pool[Math.floor(r() * pool.length)].id), f: r() < 0.5 ? 'type' : 'shadow' };
    return { k: 'chest', d: 0 };
  });
}

// ── 📤 · 🐾 ──

/** 끝난 뒤 며칠 🐾 손님이 하는 말 (없으면 '') */
export function moveHello(raw, now) {
  const m = moveOf(journeyOf(raw).move);
  if (!m || m.phase !== 'end' || !m.endAt) return '';
  const left = m.endAt + MOVE.helloDays * 86400000 - Number(now);
  return left > 0 && Number(now) >= m.endAt ? '🎉 집들이 축하해요! 새 집이 참 좋아요' : '';
}
/** 📤 usage/journey.md 뒤에 붙는 줄 — 떠난 적 없으면 '' · 한 줄 쓰기는 비공개 저장소에만 간다 */
export function moveMd(raw, monKo = (id) => String(id)) {
  const m = moveOf(journeyOf(raw).move);
  if (!m) return '';
  const st = stopAt(m, Math.min(m.at, MOVE_STOPS - 1));
  const lines = ['## 🚚 이사 대작전', '', `- ${m.phase === 'go' ? `지금 ${STAGES[st.stage].ko} · 자리 ${m.at + 1}/${MOVE_STOPS}` : m.phase === 'end' ? '끝' : `끝까지 감 — 남은 단계 ${m.phase}`} · ${qLine(m.q)}${m.pf[1] ? ` · 🔬 박사 퀴즈 ${m.pf[0]}/${m.pf[1]}` : ''}`];
  if (m.phase !== 'go') lines.push(`- 벽지 ${m.wall || '그대로'} · 바닥 ${m.floor || '그대로'} · 손님 ${m.pick ? monKo(m.pick) : '아직'} · 가구 ${m.furn === 'fresh' ? '새로 놓기' : m.furn === 'keep' ? '자리 그대로' : '아직'}`);
  if (m.old) lines.push(`- 옛집에서 제일 좋았던 것: ${m.old}`);
  if (m.fav) lines.push(`- 새 집에서 제일 좋은 곳: ${m.fav}`);
  return `${lines.join('\n')}\n`;
}
