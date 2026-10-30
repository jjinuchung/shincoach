// 🎒 포켓몬 대여행 (v341 · 2026-10-26 진우 제안 → 아버님 기본안 2판 "이대로") — node --test tests/journey341.test.js
// (v362부터 길이 세 배 — 구역 6 · 👑 대장 · 이벤트 · 🏥 두 번: 이 파일은 v341 시험을 새 꼴에 맞춘 것 · 새로 생긴 것은 tests/journey362.test.js)
// 토요일에 열려 다음 금요일까지 한 번 · 데리고 있는 6마리 · 산 → 숲 → 바다 → 🏥 → 화산 → 하늘 → 🏥 → 우주 → 🚀 만남 19번 · 맞히면 1칸(타입 유리 2칸) · 틀리면 ❤️ −1 ·
// ❤️를 다 잃으면 스톤 20%·코인 30%(버림 · 포켓몬은 안 잃음) · 🏃 집으로 = 잃는 것·보상 없이 끝 · 끝까지 가면 💰500·스톤 1씩·6마리 Lv+1(못 올리면 스톤)·야생 하나
import { fakeIdb } from './fakeidb.js'; // ★ db.js·xp.js보다 먼저
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  JOURNEY, ZONES, STOPS, CENTERS, PER_ZONE, ROCKET_MON, eventRule, makeEvents, pendingEvent, SUBJECTS, TYPE_KO, TYPES, typesOf, mult, advantage, strongZones, zoneOfStop, dayKeyOf, weekOf,
  routeOf, journeyOf, copyJourney, mergeJourney, stateOf, ownedIds, startRule, answerRule, swapRule, homeRule, pickRule, lossPreview,
  makeRoute, subjectFor, seedOf, rngOf, orderOf, slotOf, questionSeed, crispPx, journeyRows, rowText, qLine, journeyMd,
} from '../js/journey.js';
import { MON_TYPES } from '../js/montypes.js';
import { ROSTER, subjectOf } from '../js/pokemon.js';
import { MOVES, SIGNATURE } from '../js/battle.js';
import { STONES } from '../js/items.js';
import { evoAt, lvOf } from '../js/evolve.js';
import { emptyProfile, cloneProfile, mergeStatRecord } from '../js/db.js';
import { initProfile, flushProfile, reloadProfile, journeyStart, journeyAnswer, journeyPick, journeyHome, journeySwap, journeyEvent, getProfileSnapshot } from '../js/xp.js';

const src = (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
function seeded(seed = 7) {
  let x = seed >>> 0;
  return () => { x = (x * 1664525 + 1013904223) >>> 0; return x / 2 ** 32; };
}
const SAT = new Date(2026, 9, 24, 10, 0, 0).getTime(); // 2026-10-24 토요일 오전 10시 (이 기기 시간대)
const DAY = 86_400_000;
const PARTY = [25, 7, 4, 1, 658, 72]; // 피카츄·꼬부기·파이리·이상해씨·개굴닌자·왕눈해
const OWNED = [...PARTY, 39];
const ST = Object.fromEntries(STONES.map((s) => [s.id, 0]));

/** 데리고 있는 포켓몬·가방·코인을 갖춘 프로필 */
function pf(over = {}) {
  const p = cloneProfile({ ...emptyProfile(), caught: Object.fromEntries(OWNED.map((id) => [id, 1])), items: { ...ST, stone_math: 12, stone_english: 8, stone_korean: 4 }, coins: 450, coinsEarned: 1000 });
  return Object.assign(p, over);
}
/** 구역마다 그 타입 후보 (명단 전체) */
function cands(caught = {}) {
  return ZONES.map((z) => ROSTER.filter((r) => r.id !== ROCKET_MON && typesOf(r.id).some((t) => z.types.includes(t))).map((r) => ({ id: r.id, caught: !!caught[r.id], rarity: 1 })));
}
function started(p = pf(), seed = 3, now = SAT) {
  const route = makeRoute(cands(), seeded(seed), ['🧢', '👧']);
  const r = startRule(p, { id: `trip${seed}abc`, party: PARTY, route, ev: makeEvents(route, cands(), seeded(seed + 100)) }, now);
  assert.equal(r.ok, true, `떠나기 ${r.why || ''}`);
  return { p, cur: r.cur };
}
/** 이벤트 차례면 셈 없이 넘긴다 (v362 — 보물 상자 skip · 박사 퀴즈 틀림 · 갈림길은 길에 있던 야생) */
function clearEv(p, now = SAT) {
  const c = journeyOf(p.journey).cur;
  const z = pendingEvent(c);
  if (z < 0) return null;
  const e = c.ev[z];
  const wild = c.route.slice(PER_ZONE * z, PER_ZONE * z + 2).find((x) => x.kind === 'wild').mon;
  const req = e.k === 'chest' ? { skip: true } : e.k === 'prof' ? { correct: false } : { pick: wild };
  const r = eventRule(p, { id: c.id, qn: c.qn, kind: e.k, ...req }, now);
  assert.equal(r.ok, true, `이벤트 ${r.why || ''}`);
  return r;
}
/** 틀린 답 하나 (이벤트는 먼저 넘김) */
function miss(p, subj = 'korean', now = SAT) {
  clearEv(p, now);
  const c = journeyOf(p.journey).cur;
  return answerRule(p, { id: c.id, qn: c.qn, mon: 25, subj, correct: false }, now, subjectOf);
}
/** 지금 만남을 맞혀서 이긴다 — 유리한 포켓몬이 있으면 그 포켓몬으로 */
function beat(p, now = SAT) {
  let out = null;
  for (let k = 0; k < 10; k++) {
    if (journeyOf(p.journey).cur && journeyOf(p.journey).cur.phase === 'go') clearEv(p, now);
    const c = journeyOf(p.journey).cur;
    if (!c || c.phase !== 'go') break;
    const at = c.at;
    out = answerRule(p, { id: c.id, qn: c.qn, mon: c.party[0], subj: 'math', correct: true }, now, subjectOf);
    assert.equal(out.ok, true);
    if (out.beaten || out.at !== at) break;
  }
  return out;
}

test('🧬 타입 표 — 명단 모든 포켓몬 · 18 타입 · 이름 · 실제 포켓몬 타입(PokeAPI)', () => {
  for (const r of ROSTER) {
    assert.ok(Array.isArray(MON_TYPES[r.id]) && MON_TYPES[r.id].length >= 1 && MON_TYPES[r.id].length <= 2, `${r.ko}(${r.id}) 타입 없음 — node tools/mon_types.mjs`);
    for (const t of MON_TYPES[r.id]) assert.ok(TYPES.includes(t), `${r.ko} 타입 ${t}`);
  }
  assert.equal(TYPES.length, 18);
  for (const t of TYPES) assert.ok(TYPE_KO[t], t);
  assert.deepEqual(typesOf(25), ['electric']);
  assert.deepEqual(typesOf(72), ['water', 'poison']);
  assert.deepEqual(typesOf(35), ['fairy'], '삐삐는 6세대부터 페어리');
  assert.deepEqual(typesOf(6), ['fire', 'flying']);
  assert.deepEqual(typesOf(658), ['water', 'dark']);
  assert.deepEqual(typesOf(999999), ['normal'], '표에 없으면 노말');
});

test('⚔️ 타입 상성 — 굉장함·별로·없음 · 두 타입은 곱 · 유리 판정', () => {
  assert.equal(mult('electric', ['water']), 2);
  assert.equal(mult('electric', ['ground']), 0);
  assert.equal(mult('electric', ['water', 'ground']), 0, '전기 → 물·땅은 0');
  assert.equal(mult('water', ['rock', 'ground']), 4);
  assert.equal(mult('grass', ['water', 'poison']), 1);
  assert.equal(mult('dragon', ['fairy']), 0);
  assert.equal(mult('ghost', ['normal']), 0);
  assert.equal(mult('normal', ['ghost']), 0);
  assert.equal(mult('fighting', ['normal']), 2);
  assert.equal(mult('fire', ['fire']), 0.5);
  assert.equal(mult('nope', ['water']), 1);
  assert.equal(advantage(25, 72), true, '피카츄 → 왕눈해');
  assert.equal(advantage(1, 72), false, '이상해씨(풀·독) → 왕눈해(물·독)는 같음');
  assert.equal(advantage(658, 74), true, '개굴닌자 → 꼬마돌(바위·땅)');
  assert.equal(advantage(4, 1), true, '파이리 → 이상해씨');
  assert.equal(advantage(1, 4), false);
  assert.deepEqual(strongZones(25), [2, 4], '피카츄는 바다·하늘');
  assert.deepEqual(strongZones(7), [0, 3], '꼬부기는 산·화산');
  assert.deepEqual(strongZones(4), [1], '파이리는 숲');
  assert.deepEqual(strongZones(133), [], '이브이는 어디서나 꾸준히');
  assert.deepEqual([...Array(STOPS).keys()].map((i) => zoneOfStop(i)), [0, 0, 0, 1, 1, 1, 2, 2, 2, 3, 3, 3, 4, 4, 4, 5, 5, 5, 5]);
});

test('📅 여행 주 — 토요일에 열려 다음 금요일까지 · 해가 바뀌어도 · 꼴이 틀리면 빈 글', () => {
  assert.equal(weekOf('2026-10-24'), '2026-10-24', '토요일');
  assert.equal(weekOf('2026-10-25'), '2026-10-24');
  assert.equal(weekOf('2026-10-30'), '2026-10-24', '금요일까지');
  assert.equal(weekOf('2026-10-31'), '2026-10-31', '다음 토요일에 새로');
  assert.equal(weekOf('2027-01-01'), '2026-12-26');
  assert.equal(weekOf('bad'), '');
  assert.equal(weekOf(undefined), '');
  assert.equal(dayKeyOf(SAT), '2026-10-24');
  for (let k = 0; k < 7; k++) assert.equal(weekOf(dayKeyOf(SAT + k * DAY)), '2026-10-24');
  assert.equal(weekOf(dayKeyOf(SAT + 7 * DAY)), '2026-10-31');
});

test('🗺️ 길 만들기 — 구역마다 야생·트레이너 하나(차례 아무렇게나) 뒤 👑 대장(그 구역 타입) · 끝은 로켓단 나옹 · 같은 포켓몬 없음 · 모자라면 null', () => {
  for (let s = 1; s <= 400; s++) {
    const r = makeRoute(cands(), seeded(s), ['🧢']);
    assert.ok(r, `씨앗 ${s}`);
    assert.equal(r.length, STOPS);
    assert.deepEqual(r[STOPS - 1], { kind: 'rocket', mon: ROCKET_MON });
    for (let z = 0; z < ZONES.length; z++) {
      assert.deepEqual([r[3 * z].kind, r[3 * z + 1].kind].sort(), ['trainer', 'wild']);
      assert.equal(r[3 * z + 2].kind, 'boss');
      for (const st of r.slice(3 * z, 3 * z + 3)) assert.ok(typesOf(st.mon).some((t) => ZONES[z].types.includes(t)), `${st.mon} 구역 ${z}`);
    }
    assert.equal(new Set(r.slice(0, STOPS - 1).map((x) => x.mon)).size, STOPS - 1);
  }
  const few = cands();
  few[4] = few[4].slice(0, 2);
  assert.equal(makeRoute(few, seeded(1)), null, '하늘 후보가 둘뿐(셋이 있어야)');
  // 야생은 아직 못 잡은 포켓몬을 더 자주
  const caught = Object.fromEntries(ROSTER.filter((_, i) => i % 2).map((r) => [r.id, 1]));
  let fresh = 0; let old = 0;
  for (let s = 1; s <= 600; s++) for (const st of makeRoute(cands(caught), seeded(s * 7)).filter((x) => x.kind === 'wild')) { if (caught[st.mon]) old++; else fresh++; }
  assert.ok(fresh > old * 2, `못 잡은 ${fresh} · 잡은 ${old}`);
  // 검사: 틀린 길
  const ok = makeRoute(cands(), seeded(5));
  assert.equal(routeOf(ok.map((x, i) => (i === STOPS - 1 ? { ...x, mon: 25 } : x))), null, '로켓단은 나옹');
  assert.equal(routeOf(ok.map((x, i) => (i === 0 ? { ...x, mon: 25 } : x))), null, '산에 전기 포켓몬');
  assert.equal(routeOf(ok.map((x, i) => (i < 2 ? { ...x, kind: 'wild' } : x))), null, '야생 둘');
  assert.equal(routeOf(ok.map((x, i) => (i === 2 ? { ...x, kind: 'trainer' } : x))), null, '대장 자리에 트레이너');
  assert.equal(routeOf(ok.map((x, i) => (i === 0 ? { ...x, kind: 'boss' } : x))), null, '대장이 앞에');
  assert.equal(routeOf(ok.slice(0, STOPS - 1)), null);
  assert.equal(routeOf([...ok.slice(0, 1), ok[0], ...ok.slice(2)]), null);
  assert.equal(routeOf('x'), null);
  // 같은 포켓몬이 두 구역에 (갸라도스 = 물·비행 → 바다·하늘 둘 다 맞음)
  assert.deepEqual(typesOf(130), ['water', 'flying']);
  const sea = ok[6].kind === 'wild' ? 6 : 7;
  const sky = ok[12].kind === 'wild' ? 12 : 13;
  assert.ok(routeOf(ok.map((x, i) => (i === sea ? { ...x, mon: 130 } : x))), '한 번은 괜찮다');
  assert.equal(routeOf(ok.map((x, i) => (i === sea || i === sky ? { ...x, mon: 130 } : x))), null, '두 번은 안 된다');
});

test('🎒 떠나기 — 데리고 있는 6마리(모자라면 있는 만큼) · 한 주에 한 번 · 고르기·여행 중이면 못 떠남 · 지난주 여행은 집으로 닫힘', () => {
  const route = makeRoute(cands(), seeded(9));
  const ev = makeEvents(route, cands(), seeded(90));
  const go = (p, party, now = SAT, id = 'abcdef12') => startRule(p, { id, party, route, ev }, now);
  assert.equal(go(pf(), PARTY.slice(0, 5)).why, 'party', '여섯 마리');
  assert.equal(go(pf(), [...PARTY.slice(0, 5), 999]).why, 'party', '없는 포켓몬');
  assert.equal(go(pf(), [...PARTY.slice(0, 5), 25]).why, 'party', '같은 포켓몬 둘');
  assert.equal(go(pf(), [...PARTY.slice(0, 5), 133]).why, 'party', '데리고 있지 않은 포켓몬');
  const evolved = pf();
  evolved.mons[39] = { evo: 1 };
  assert.equal(go(evolved, PARTY).ok, true, '모두 데리고 있으면');
  const two = pf({ caught: { 25: 1, 7: 1 } });
  assert.equal(go(two, [25, 7]).ok, true, '두 마리뿐이면 둘');
  assert.equal(go(pf(), PARTY, SAT, 'BAD').why, 'id');
  assert.equal(startRule(pf(), { id: 'abcdef12', party: PARTY, route: route.slice(1), ev }, SAT).why, 'route');
  assert.equal(startRule(pf(), { id: 'abcdef12', party: PARTY, route }, SAT).why, 'ev', '이벤트 없이는 못 떠남 (v362)');
  const p = pf();
  const r = go(p, PARTY);
  assert.equal(r.ok, true);
  assert.deepEqual([r.cur.at, r.cur.hearts, r.cur.hp, r.cur.phase, r.cur.week], [0, JOURNEY.hearts, JOURNEY.hp[route[0].kind], 'go', '2026-10-24']);
  assert.equal(go(p, PARTY, SAT + DAY).why, 'going');
  homeRule(p, { id: 'abcdef12' }, SAT + DAY);
  assert.equal(go(p, PARTY, SAT + 2 * DAY, 'abcdef99').why, 'done', '이번 주는 다녀옴');
  assert.equal(go(p, PARTY, SAT + 7 * DAY, 'abcdef99').ok, true, '다음 토요일엔 새로');
  // 지난주에 끝내지 못한 여행
  const q = pf();
  go(q, PARTY, SAT + 6 * DAY, 'oldtrip1');
  const n = go(q, PARTY, SAT + 7 * DAY, 'newtrip1');
  assert.equal(n.ok, true);
  assert.deepEqual(journeyOf(q.journey).done['2026-10-24'].r, 'home', '지난주 여행은 집으로');
  assert.deepEqual([q.coins, q.items.stone_math], [450, 12], '잃지 않는다');
});

test('✏️ 답 — 맞히면 1칸(유리 2칸) · 이기면 다음 만남 · 야생은 이긴 목록에 · 틀리면 ❤️ −1 · 몇 번째 문제가 다르면 changed · 과목별 맞힌 수', () => {
  const { p, cur } = started();
  assert.equal(answerRule(p, { id: cur.id, qn: 0, mon: PARTY[0], subj: 'math', correct: true }, SAT, subjectOf).why, 'event', '구역 이벤트가 먼저 (v362)');
  clearEv(p);
  const q0 = journeyOf(p.journey).cur.qn;
  const foe = journeyOf(p.journey).cur.route[0];
  const strong = PARTY.find((id) => advantage(id, foe.mon));
  const weak = PARTY.find((id) => !advantage(id, foe.mon));
  assert.equal(answerRule(p, { id: cur.id, qn: q0 + 1, mon: weak, subj: 'math', correct: true }, SAT, subjectOf).why, 'changed');
  assert.equal(answerRule(p, { id: 'zzzzzz99', qn: q0, mon: weak, subj: 'math', correct: true }, SAT, subjectOf).why, 'changed');
  assert.equal(answerRule(p, { id: cur.id, qn: q0, mon: 133, subj: 'math', correct: true }, SAT, subjectOf).why, 'mon');
  assert.equal(answerRule(p, { id: cur.id, qn: q0, mon: weak, subj: 'art', correct: true }, SAT, subjectOf).why, 'subj');
  const a = answerRule(p, { id: cur.id, qn: q0, mon: weak, subj: 'math', correct: true }, SAT, subjectOf);
  assert.deepEqual([a.ok, a.adv, a.hit, a.hp], [true, false, 1, JOURNEY.hp[foe.kind] - 1]);
  const w = answerRule(p, { id: cur.id, qn: q0 + 1, mon: weak, subj: 'english', correct: false }, SAT, subjectOf);
  assert.deepEqual([w.hearts, w.hp, w.end], [JOURNEY.hearts - 1, JOURNEY.hp[foe.kind] - 1, null]);
  assert.equal(answerRule(p, { id: cur.id, qn: q0 + 1, mon: weak, subj: 'math', correct: true }, SAT, subjectOf).why, 'changed', '두 번 누름');
  let beaten = false;
  if (strong) {
    const b = answerRule(p, { id: cur.id, qn: q0 + 2, mon: strong, subj: 'math', correct: true }, SAT, subjectOf);
    assert.deepEqual([b.adv, b.hit], [true, 2]);
    beaten = b.beaten;
  }
  if (!beaten) beat(p);
  const c = journeyOf(p.journey).cur;
  assert.equal(c.at, 1);
  assert.equal(c.won.includes(foe.mon), foe.kind === 'wild');
  assert.deepEqual(c.q.english, [0, 1]);
  assert.ok(c.q.math[0] >= 2);
  assert.equal(c.hp, JOURNEY.hp[c.route[1].kind], '새 상대는 HP 가득');
});

test('💖 👑 대장을 이기면 ❤️ +2(최대 6 — v362 Codex 166차 판단 표 「추천대로」) · 🔄 다른 문제는 만남마다 한 번', () => {
  const { p, cur } = started();
  // ❤️ 둘을 잃고
  for (let k = 0; k < 2; k++) miss(p, 'math');
  assert.equal(journeyOf(p.journey).cur.hearts, JOURNEY.hearts - 2);
  // 🔄
  const c0 = journeyOf(p.journey).cur;
  assert.equal(swapRule(p, { id: c0.id, qn: c0.qn + 1 }).why, 'changed');
  void PER_ZONE;
  const s = swapRule(p, { id: c0.id, qn: c0.qn });
  assert.deepEqual([s.ok, s.cur.qv, s.cur.swap, s.cur.qn], [true, 1, 0, c0.qn + 1], '바꾼 문제는 새 번호');
  assert.equal(swapRule(p, { id: c0.id, qn: s.cur.qn }).why, 'used', '한 만남에 한 번');
  // 🔍 Codex 145차 #1 — 다른 창에 남은 바꾸기 전 문제의 답은 안 받는다(❤️·가방 그대로)
  const before = JSON.stringify([p.coins, p.items]);
  assert.equal(answerRule(p, { id: c0.id, qn: c0.qn, mon: 25, subj: 'math', correct: false }, SAT, subjectOf).why, 'changed');
  assert.equal(journeyOf(p.journey).cur.hearts, JOURNEY.hearts - 2);
  assert.equal(JSON.stringify([p.coins, p.items]), before);
  for (let k = 0; k < CENTERS[0]; k++) beat(p);
  const c1 = journeyOf(p.journey).cur;
  assert.equal(c1.at, CENTERS[0]);
  assert.equal(swapRule(p, { id: c1.id, qn: c1.qn }).ok, true, '새 만남에선 다시');
  const last = beat(p);
  assert.equal(last.healed, 2);
  assert.equal(journeyOf(p.journey).cur.hearts, JOURNEY.hearts);
  // 가득일 때는 0
  const { p: q } = started(pf(), 11);
  for (let k = 0; k <= CENTERS[0]; k++) { const r = beat(q); if (k === CENTERS[0]) assert.equal(r.healed, 0); }
  void cur;
});

test('🎉 끝까지 — 💰500·공부로 번 💰 · 스톤 1개씩 · 6마리 Lv+1(진화 레벨·데리고 있지 않으면 그 포켓몬 스톤) · 이긴 야생 여섯 · 하나 데려오기', () => {
  const p = pf();
  p.mons[72] = { lv: evoAt(72) }; // 왕눈해는 진화 레벨에서 멈춤 → 🟩(논술 포켓몬)
  p.mons[658] = { lv: 40 };
  const { cur } = started(p);
  p.mons[4] = { ...(p.mons[4] || {}), evo: 1 }; // 여행 중에 파이리를 진화시켜 보냄 → 🔶
  let last = null;
  for (let k = 0; k < STOPS; k++) last = beat(p);
  assert.equal(last.end, 'won');
  assert.deepEqual([p.coins, p.coinsEarned], [450 + 500, 1000 + 500], '이벤트는 셈 없이 넘겼다(보물 상자 skip · 박사 퀴즈 틀림)');
  const lvOfId = (id) => lvOf(p.mons[id]);
  assert.deepEqual([lvOfId(25), lvOfId(7), lvOfId(1), lvOfId(658), lvOfId(72), lvOfId(4)], [2, 2, 2, 41, evoAt(72), 1]);
  assert.equal(p.items.stone_math, 13);
  assert.equal(p.items.stone_english, 8 + 1 + 1, '스톤 1 + 파이리 대신');
  assert.equal(p.items.stone_korean, 4 + 1 + 1, '스톤 1 + 왕눈해 대신(논술 포켓몬은 🟩)');
  const j = journeyOf(p.journey);
  assert.equal(j.cur.phase, 'pick');
  assert.equal(j.cur.won.length, ZONES.length);
  assert.equal(j.done['2026-10-24'].r, 'won');
  assert.deepEqual(j.done['2026-10-24'].sub.map((x) => x[0]).sort((a, b) => a - b), [4, 72]);
  assert.equal(j.done['2026-10-24'].lv.length, 4);
  assert.equal(answerRule(p, { id: cur.id, qn: j.cur.qn, mon: 25, subj: 'math', correct: true }, SAT, subjectOf).why, 'changed', '고르기 중엔 답 없음');
  assert.equal(startRule(p, { id: 'again123', party: PARTY, route: cur.route }, SAT + 8 * DAY).why, 'pick', '데려올 포켓몬부터');
  assert.equal(pickRule(p, { id: cur.id, mon: 25 }, SAT).why, 'mon', '이긴 야생만');
  const mon = j.cur.won[2];
  const before = p.caught[mon] || 0;
  const k = pickRule(p, { id: cur.id, mon }, SAT);
  assert.deepEqual([k.ok, k.first, p.caught[mon]], [true, before === 0, before + 1]);
  assert.equal(pickRule(p, { id: cur.id, mon }, SAT).why, 'changed', '한 번만');
  assert.equal(journeyOf(p.journey).cur, null);
  assert.equal(journeyOf(p.journey).done['2026-10-24'].pick, mon);
  assert.equal(stateOf(p.journey, '2026-10-26').mode, 'done');
});

test('💔 ❤️를 다 잃으면 — 스톤 20%·코인 30%(버림 · v343 상한 스톤 5·💰200) · 포켓몬은 그대로 · 그 주 끝 · 미리 보기와 같은 셈', () => {
  const p = pf({ coins: 999 });
  p.items.stone_math = 12; p.items.stone_english = 8; p.items.stone_korean = 4;
  const pv = lossPreview(p);
  assert.deepEqual(pv, { items: { stone_math: [12, 10], stone_english: [8, 7], stone_korean: [4, 4] }, coins: [999, 799] });
  const { cur } = started(p);
  const caught0 = { ...p.caught };
  const mons0 = JSON.stringify(p.mons);
  let r = null;
  for (let k = 0; k < JOURNEY.hearts; k++) r = miss(p);
  assert.equal(r.end, 'lost');
  assert.deepEqual(r.lost, { items: { stone_math: 2, stone_english: 1 }, coins: 200 });
  assert.deepEqual([p.items.stone_math, p.items.stone_english, p.items.stone_korean, p.coins], [10, 7, 4, 799]);
  assert.deepEqual(p.caught, caught0);
  assert.equal(JSON.stringify(p.mons), mons0);
  const j = journeyOf(p.journey);
  assert.equal(j.cur, null);
  assert.deepEqual(j.done['2026-10-24'].lost, { items: { stone_math: 2, stone_english: 1 }, coins: 200 });
  assert.deepEqual(j.done['2026-10-24'].q.korean, [0, JOURNEY.hearts]);
  assert.equal(answerRule(p, { id: cur.id, qn: 6, mon: 25, subj: 'math', correct: true }, SAT, subjectOf).why, 'changed');
  // 셈: 버림 · 정수 셈이라 소수 오차 없음
  // 상한 경계(v343): 💰 666 → 199 잃음 · 667부터 200 · 스톤 29 → 5 · 30 → 6이지만 5
  for (const [c, left] of [[0, 0], [3, 3], [7, 5], [10, 7], [20, 14], [100, 70], [396, 278], [666, 467], [667, 467], [670, 470], [1001, 801], [5000, 4800]]) assert.equal(lossPreview({ coins: c, items: {} }).coins[1], left, `코인 ${c}`);
  for (const [n, left] of [[0, 0], [4, 4], [5, 4], [9, 8], [10, 8], [15, 12], [25, 20], [29, 24], [30, 25], [37, 32], [211, 206]]) assert.equal(lossPreview({ coins: 0, items: { stone_math: n } }).items.stone_math[1], left, `스톤 ${n}`);
  assert.deepEqual(JOURNEY.loseMax, { stone: 5, coins: 200 }, '아버님이 정한 상한');
  // 많이 모은 프로필: 잃기 뒤에도 상한만큼만 줄고 미리 보기와 같다
  const rich = pf({ coins: 5000 });
  Object.assign(rich.items, { stone_math: 211, stone_english: 3, stone_korean: 37 });
  const rv = lossPreview(rich);
  started(rich);
  let rr = null;
  for (let k = 0; k < JOURNEY.hearts; k++) rr = miss(rich);
  assert.deepEqual(rr.lost, { items: { stone_math: 5, stone_korean: 5 }, coins: 200 });
  assert.deepEqual([rich.items.stone_math, rich.items.stone_english, rich.items.stone_korean, rich.coins], [rv.items.stone_math[1], 3, rv.items.stone_korean[1], rv.coins[1]]);
});

// 🔍 Codex 147차 시험 둘 — 출발 화면을 본 뒤 잔액이 바뀌면 · 진 뒤 옛 백업과 병합
test('🔍 Codex 147차: 출발 화면 뒤 잔액이 바뀌어도 마지막 오답 때 잔액으로 셈(상한·가진 것 안) · 진 기록은 옛 백업과 어느 쪽으로 합쳐도 그대로', () => {
  const p = pf({ coins: 666 });
  p.items.stone_math = 211;
  assert.deepEqual([lossPreview(p).coins, lossPreview(p).items.stone_math], [[666, 467], [211, 206]], '출발 화면');
  const { cur } = started(p);
  const wrong = (q) => miss(q);
  for (let k = 1; k < JOURNEY.hearts; k++) wrong(p);
  assert.equal(journeyOf(p.journey).cur.hearts, 1);
  // 여행 중에 코인을 많이 벌고(다른 과목) 수학스톤은 다른 창에서 거의 다 씀
  p.coins = 5000; p.items.stone_math = 3;
  const older = { ...cloneProfile(p), updatedAt: 1 }; // ❤️ 1 남은 옛 백업
  const r = wrong(p);
  assert.equal(r.end, 'lost');
  assert.deepEqual(r.lost, { items: { stone_english: 1 }, coins: 200 }, '💰은 상한 200 · 🔷 3개는 20%가 0이라 안 잃음 · 🔶 8 → 1');
  assert.deepEqual([p.coins, p.items.stone_math, p.items.stone_english, p.items.stone_korean], [4800, 3, 7, 4]);
  // 병합(db.mergeStatRecord) — 최근 쪽 잔액 · 여행은 닫힘 · 잃은 기록 그대로 · 같은 답을 다시 보내도 안 받음
  const recent = { ...cloneProfile(p), updatedAt: 9 };
  for (const m of [mergeStatRecord('profile', recent, older), mergeStatRecord('profile', older, recent)]) {
    assert.equal(m.coins, 4800, '코인은 최근 쪽');
    assert.equal(m.items.stone_english, 7);
    const j = journeyOf(m.journey);
    assert.equal(j.cur, null, '❤️ 1의 옛 여행이 되살아나지 않는다');
    assert.equal(j.done['2026-10-24'].r, 'lost');
    assert.deepEqual(j.done['2026-10-24'].lost, { items: { stone_english: 1 }, coins: 200 });
    assert.equal(answerRule(m, { id: cur.id, qn: JOURNEY.hearts, mon: 25, subj: 'korean', correct: false }, SAT, subjectOf).why, 'changed', '두 번 잃지 않는다');
    assert.equal(m.coins, 4800);
  }
});

test('🏃 집으로 — 잃는 것도 보상도 없이 그 주 끝 · ⏰ 다음 주가 된 뒤 답하면 집으로 닫힘(expired)', () => {
  const { p, cur } = started();
  beat(p);
  const before = { coins: p.coins, items: { ...p.items } };
  assert.equal(homeRule(p, { id: 'nottrip1' }, SAT).why, 'changed');
  assert.equal(homeRule(p, { id: cur.id }, SAT).ok, true);
  assert.deepEqual({ coins: p.coins, items: p.items }, before);
  assert.equal(journeyOf(p.journey).done['2026-10-24'].r, 'home');
  assert.equal(homeRule(p, { id: cur.id }, SAT).why, 'changed');
  const { p: q, cur: c2 } = started(pf(), 4);
  const e = answerRule(q, { id: c2.id, qn: 0, mon: 25, subj: 'math', correct: false }, SAT + 7 * DAY, subjectOf);
  assert.deepEqual([e.ok, e.end], [true, 'expired']);
  assert.equal(journeyOf(q.journey).done['2026-10-24'].r, 'home');
  assert.equal(q.coins, 450);
});

test('🧾 고쳐 읽기 — 깨진 값은 버림 · 토요일이 아닌 주 열쇠는 버림 · 26주까지 · 복사는 따로', () => {
  assert.deepEqual(journeyOf(null), { cur: null, done: {} });
  assert.deepEqual(journeyOf({ cur: 'x', done: [] }), { cur: null, done: {} });
  const { p } = started();
  const good = journeyOf(p.journey).cur;
  const w = good.route.find((s) => s.kind === 'wild').mon;
  for (const bad of [{ hearts: 0 }, { hearts: 9 }, { at: STOPS }, { hp: 0 }, { hp: 9 }, { ev: [] }, { ev: 'x' }, { ev: good.ev.slice(1) }, { phase: 'x' }, { id: 'X!' }, { week: 'no' }, { party: [] }, { route: [] }, { won: [w, w] }, { phase: 'pick' }]) {
    assert.equal(journeyOf({ cur: { ...good, ...bad } }).cur, null, JSON.stringify(bad));
  }
  assert.deepEqual(journeyOf({ cur: { ...good, won: [999] } }).cur.won, [], '이긴 야생은 길의 야생만');
  const done = {};
  for (let k = 0; k < 30; k++) done[dayKeyOf(SAT - k * 7 * DAY)] = { r: 'home', at: 1 };
  done['2026-10-25'] = { r: 'won', at: 1 };
  done['2026-10-17'] = { r: 'zzz', at: 1 };
  const j = journeyOf({ done });
  assert.equal(Object.keys(j.done).length, JOURNEY.doneKeep - 1, '토요일 30주 중 최근 26주 · 그 가운데 결과가 깨진 한 주는 버림');
  assert.equal(own(j.done, dayKeyOf(SAT - 29 * 7 * DAY)), false, '오래된 주');
  assert.equal(own(j.done, '2026-10-25'), false, '일요일 열쇠');
  assert.equal(own(j.done, '2026-10-17'), false, '모르는 결과');
  const lost = journeyOf({ done: { '2026-10-24': { r: 'lost', at: 1, lost: { items: { stone_math: 2, junk: 9 }, coins: -5 }, q: { math: [9, 3], art: [1, 1] } } } }).done['2026-10-24'];
  assert.deepEqual(lost, { r: 'lost', at: 1, q: { math: [3, 3] }, lost: { items: { stone_math: 2 }, coins: 0 } });
  const c = copyJourney(p.journey);
  c.cur.hearts = 1;
  assert.equal(journeyOf(p.journey).cur.hearts, JOURNEY.hearts, '복사는 따로');
  assert.equal(copyJourney('x'), null);
  // 프로필 복사도
  const cl = cloneProfile(p);
  cl.journey.cur.hearts = 2;
  assert.equal(p.journey.cur.hearts, JOURNEY.hearts);
});
const own = (o, k) => Object.prototype.hasOwnProperty.call(o, k);

test('🔀 병합 — 끝난 주는 합집합(데려온 쪽이 이김) · 지금 여행은 최근 쪽 · 끝난 주의 여행은 비움 · 프로필 병합도', () => {
  const { p, cur } = started();
  const older = JSON.parse(JSON.stringify(p.journey)); // 여행 중 백업
  for (let k = 0; k < STOPS; k++) beat(p);
  pickRule(p, { id: cur.id, mon: journeyOf(p.journey).cur.won[0] }, SAT);
  const m = mergeJourney(p.journey, older);
  assert.equal(m.cur, null, '옛 백업의 여행 중 상태가 되살아나지 않는다');
  assert.equal(m.done['2026-10-24'].pick, journeyOf(p.journey).done['2026-10-24'].pick);
  const m2 = mergeJourney(older, p.journey);
  assert.equal(m2.cur, null, '반대로 합쳐도');
  assert.equal(m2.done['2026-10-24'].r, 'won');
  assert.equal(mergeJourney(null, undefined), null);
  assert.deepEqual(mergeJourney(null, older).cur.id, cur.id, '없는 쪽은 다른 쪽 여행');
  // 최근 쪽은 아직 고르는 중(데려온 것 없음) · 옛 쪽은 이미 데려옴 → 데려온 기록이 이기고 고르기는 닫힌다(두 번 데려오지 않게)
  const { p: p2, cur: c2 } = started(pf(), 8);
  for (let k = 0; k < STOPS; k++) beat(p2);
  const picking = JSON.parse(JSON.stringify(p2.journey));
  pickRule(p2, { id: c2.id, mon: journeyOf(p2.journey).cur.won[1] }, SAT);
  const m3 = mergeJourney(picking, p2.journey);
  assert.equal(m3.done['2026-10-24'].pick, journeyOf(p2.journey).done['2026-10-24'].pick, '데려온 쪽이 이김');
  assert.equal(m3.cur, null, '고르기는 닫힘');
  const a = { done: { '2026-10-17': { r: 'home', at: 1 } } };
  const b = { done: { '2026-10-10': { r: 'lost', at: 2, lost: { items: {}, coins: 3 } } } };
  assert.deepEqual(Object.keys(mergeJourney(a, b).done).sort(), ['2026-10-10', '2026-10-17']);
  // db.mergeStatRecord (프로필)
  const recOld = { ...cloneProfile(pf()), journey: older, updatedAt: 1 };
  const recNew = { ...cloneProfile(p), updatedAt: 9 };
  const merged = mergeStatRecord('profile', recNew, recOld);
  assert.equal(journeyOf(merged.journey).cur, null);
  assert.equal(journeyOf(merged.journey).done['2026-10-24'].r, 'won');
  const merged2 = mergeStatRecord('profile', recOld, recNew);
  assert.equal(journeyOf(merged2.journey).done['2026-10-24'].r, 'won');
  assert.equal(merged2.coins, recNew.coins, '코인은 최근 쪽');
});

test('🎲 문제 차례 — 같은 여행이면 같은 줄 · 과목마다 푼 수 + 🔄 수로 자리 · 씨앗은 몇 번째 문제·🔄로 바뀜 · 과목은 만남마다 돌아감', () => {
  const keys = ['b', 'a', 'c', 'd', 'a'];
  const o1 = orderOf(keys, 'trip1', 'math');
  assert.deepEqual([...o1].sort(), ['a', 'b', 'c', 'd']);
  assert.deepEqual(orderOf(['d', 'c', 'b', 'a'], 'trip1', 'math'), o1, '들어온 차례와 상관없이');
  let differ = 0;
  for (let k = 0; k < 20; k++) if (orderOf(keys, `trip${k}`, 'math').join() !== o1.join()) differ++;
  assert.ok(differ >= 10, '여행마다 다른 줄');
  const cur = { id: 'trip1', qn: 4, qv: 1, q: { math: [2, 3] } };
  assert.equal(slotOf(cur, 'math', 4), (3 + 1) % 4);
  assert.equal(slotOf(cur, 'english', 4), 1);
  assert.equal(slotOf(cur, 'math', 4, 2), (3 + 1 + 2) % 4);
  assert.equal(slotOf(cur, 'math', 0), -1);
  assert.equal(questionSeed(cur), questionSeed({ ...cur }));
  assert.notEqual(questionSeed(cur), questionSeed({ ...cur, qn: 5 }));
  assert.notEqual(questionSeed(cur), questionSeed({ ...cur, qv: 2 }));
  assert.notEqual(questionSeed(cur, 0), questionSeed(cur, 1));
  assert.deepEqual([0, 1, 2, 3, 4, 5, 6, 7, 8].map((at) => subjectFor(at, SUBJECTS)), ['math', 'english', 'korean', 'nonsul', 'math', 'english', 'korean', 'nonsul', 'math']);
  assert.deepEqual([0, 1, 2, 3].map((at) => subjectFor(at, ['nonsul', 'math'])), ['math', 'nonsul', 'math', 'nonsul'], '없는 과목은 건너뜀');
  assert.equal(subjectFor(0, []), null);
  const r1 = rngOf(seedOf('x'));
  const r2 = rngOf(seedOf('x'));
  for (let k = 0; k < 5; k++) { const v = r1(); assert.equal(v, r2()); assert.ok(v >= 0 && v < 1); }
});

test('🔤 대사 글꼴 크기 — 한 칸이 기기 픽셀 정수 개(배율 1·1.5·2·3은 24px · 2.625는 32px · 맞는 게 없으면 24px)', () => {
  assert.equal(crispPx(24, 1), 24);
  assert.equal(crispPx(24, 1.5), 24);
  assert.equal(crispPx(24, 2), 24);
  assert.equal(crispPx(24, 3), 24);
  assert.equal(crispPx(24, 2.625), 32);
  assert.equal(crispPx(24, 1.75), 24);
  assert.equal(crispPx(24, 0), 24);
  assert.equal(crispPx(24, 'x'), 24);
});

test('📊📤 글 — 결과·과목별 맞힌 수·데려온 포켓몬·잃은 것 · 한 번도 안 떠났으면 파일 없음', () => {
  assert.equal(journeyMd(null, '2026-10-26'), null);
  const raw = { done: {
    '2026-10-17': { r: 'lost', at: 1, q: { math: [3, 5], korean: [1, 3] }, lost: { items: { stone_math: 2 }, coins: 135 } },
    '2026-10-24': { r: 'won', at: 2, q: { english: [6, 6] }, pick: 25 },
  } };
  const rows = journeyRows(raw);
  assert.deepEqual(rows.map((r) => r.week), ['2026-10-24', '2026-10-17']);
  const ko = (id) => (id === 25 ? '피카츄' : String(id));
  assert.equal(rowText(rows[0], ko), '🎉 끝까지 감 · 🔶 영어 6/6 · 데려옴 피카츄');
  assert.equal(rowText(rows[1], ko), '💔 ❤️를 다 씀 · 🔢 수학 3/5 · 📚 국어 1/3 · 잃음 🔷2 💰135');
  assert.equal(qLine({}), '문제 없음');
  const md = journeyMd(raw, '2026-10-26', ko);
  assert.match(md, /# 🎒 포켓몬 대여행/);
  assert.match(md, /- 2026-10-24 주: 🎉 끝까지 감/);
  assert.match(md, /❤️를 다 잃으면 스톤 20%\(과목마다 최대 5\)·💰 30%\(최대 200\)/, 'v343 상한을 아빠 기록에도');
  const { p } = started();
  assert.match(journeyMd(p.journey, '2026-10-26', ko), /## 지금 여행 \(2026-10-24 주\)\n\n- 만남 1\/19 · ❤️ 6/);
});

const stored = () => fakeIdb.get('profile', 'me');
/** 저장 경로로 지금 이벤트를 셈 없이 넘긴다 (v362) */
async function evStored(id) {
  const c = journeyOf(stored().journey).cur;
  const z = pendingEvent(c);
  if (z < 0) return { ok: true };
  const e = c.ev[z];
  const wild = c.route.slice(3 * z, 3 * z + 2).find((x) => x.kind === 'wild').mon;
  return journeyEvent({ id, qn: c.qn, kind: e.k, ...(e.k === 'chest' ? { skip: true } : e.k === 'prof' ? { correct: false } : { pick: wild }) });
}
test('★ 저장 경로 — 떠나기·답·데려오기가 저장된 프로필에 · 두 창이 같은 문제를 동시에 답해도 한 번 · 저장이 실패하면 없던 일', async () => {
  await initProfile();
  await flushProfile();
  const cur0 = stored() || emptyProfile();
  fakeIdb.put('profile', { ...pf(), updatedAt: (cur0.updatedAt || 0) + 1 });
  await reloadProfile();
  const route = makeRoute(cands(), seeded(21));
  const s = await journeyStart({ id: 'savetrip1', party: PARTY, route, ev: makeEvents(route, cands(), seeded(121)) });
  assert.equal(s.ok, true);
  assert.equal(journeyOf(stored().journey).cur.id, 'savetrip1');
  assert.equal((await evStored('savetrip1')).ok, true, '이벤트 먼저 (v362)');
  const rs = await Promise.all([
    journeyAnswer({ id: 'savetrip1', qn: 1, mon: 1, subj: 'math', correct: false }),
    journeyAnswer({ id: 'savetrip1', qn: 1, mon: 1, subj: 'math', correct: false }),
  ]);
  assert.deepEqual(rs.map((r) => r.ok).sort(), [false, true]);
  assert.equal(rs.find((r) => !r.ok).why, 'changed');
  assert.equal(journeyOf(stored().journey).cur.hearts, JOURNEY.hearts - 1, '❤️는 하나만');
  assert.equal(journeyOf(getProfileSnapshot().journey).cur.hearts, JOURNEY.hearts - 1, '창의 프로필도');
  const before = JSON.stringify(stored().journey);
  fakeIdb.failNext('profile');
  const f = await journeyAnswer({ id: 'savetrip1', qn: 2, mon: 1, subj: 'math', correct: false });
  assert.deepEqual(f, { ok: false, why: 'save' });
  assert.equal(JSON.stringify(stored().journey), before);
  assert.equal(journeyOf(getProfileSnapshot().journey).cur.hearts, JOURNEY.hearts - 1, '메모리로 성공한 척하지 않는다');
  const sw = await journeySwap({ id: 'savetrip1', qn: 2 });
  assert.equal(sw.ok, true);
  const h = await journeyHome({ id: 'savetrip1' });
  assert.equal(h.ok, true);
  assert.equal(journeyOf(stored().journey).done[weekOf(dayKeyOf(Date.now()))].r, 'home', '집으로 닫힘 (저장 경로는 지금 시각의 주)');
  assert.equal(journeyOf(stored().journey).cur, null);
  assert.equal((await journeyPick({ id: 'savetrip1', mon: 25 })).why, 'changed');
});

// 🔍 Codex 147차: ❤️ 1에서 마지막 오답 — 저장이 실패하면 없던 일 · 두 창이 동시에 보내도 상한만큼 한 번만
test('★ 🔍 Codex 147차 저장 경로 — ❤️ 1의 마지막 오답: 저장 실패면 잔액·❤️·기록 그대로 · 동시에 두 번 보내도 한 번만 잃음(💰200 · 스톤 5)', async () => {
  await initProfile();
  await flushProfile();
  const cur0 = stored() || emptyProfile();
  const rich = pf({ coins: 5000 });
  Object.assign(rich.items, { stone_math: 211, stone_english: 3, stone_korean: 37 });
  fakeIdb.put('profile', { ...rich, updatedAt: (cur0.updatedAt || 0) + 1 });
  await reloadProfile();
  const r22 = makeRoute(cands(), seeded(22));
  assert.equal((await journeyStart({ id: 'savetrip2', party: PARTY, route: r22, ev: makeEvents(r22, cands(), seeded(122)) })).ok, true);
  assert.equal((await evStored('savetrip2')).ok, true);
  const wrongReq = () => { const c = journeyOf(stored().journey).cur; return { id: 'savetrip2', qn: c.qn, mon: 1, subj: 'math', correct: false }; };
  for (let k = 1; k < JOURNEY.hearts; k++) assert.equal((await journeyAnswer(wrongReq())).ok, true);
  assert.equal(journeyOf(stored().journey).cur.hearts, 1);
  const week = journeyOf(stored().journey).cur.week;
  const before = JSON.stringify([stored().coins, stored().items, stored().journey]);
  fakeIdb.failNext('profile');
  assert.deepEqual(await journeyAnswer(wrongReq()), { ok: false, why: 'save' });
  assert.equal(JSON.stringify([stored().coins, stored().items, stored().journey]), before, '저장 실패 — 잔액·❤️·기록 그대로');
  assert.equal(getProfileSnapshot().coins, 5000, '창의 프로필도');
  const req = wrongReq();
  const rs = await Promise.all([journeyAnswer(req), journeyAnswer(req)]);
  assert.deepEqual(rs.map((r) => r.ok).sort(), [false, true]);
  assert.equal(rs.find((r) => r.ok).end, 'lost');
  assert.equal(rs.find((r) => !r.ok).why, 'changed');
  const s = stored();
  assert.deepEqual([s.coins, s.items.stone_math, s.items.stone_english, s.items.stone_korean], [4800, 206, 3, 32], '한 번만 · 상한만큼');
  assert.deepEqual(journeyOf(s.journey).done[week].lost, { items: { stone_math: 5, stone_korean: 5 }, coins: 200 });
  assert.equal(journeyOf(s.journey).cur, null);
});

test('🔤 대사창 글꼴에 든 글자 — 포켓몬 이름·기술·여행 글은 모두 자주 쓰는 한글 2,350자 안 (fonts/galmuri11.woff)', () => {
  const dec = new TextDecoder('euc-kr');
  const ks = new Set();
  for (let a = 0xB0; a <= 0xC8; a++) for (let b = 0xA1; b <= 0xFE; b++) ks.add(dec.decode(new Uint8Array([a, b])));
  assert.equal([...ks].filter((c) => /[가-힣]/.test(c)).length, 2350);
  const texts = [...ROSTER.map((r) => r.ko), ...Object.values(MOVES).map((m) => m.strong), ...Object.values(SIGNATURE).map((m) => m.strong), ...ZONES.map((z) => z.ko), ...Object.values(TYPE_KO), src('js/journeyview.js')];
  const miss = new Set();
  for (const t of texts) for (const ch of t) if (/[가-힣]/.test(ch) && !ks.has(ch)) miss.add(ch);
  assert.deepEqual([...miss], [], `글꼴에 없는 글자 — .context/v341/galmuri/make_font.py에 더해 다시 만들기`);
  const woff = fs.statSync(new URL('../fonts/galmuri11.woff', import.meta.url));
  assert.ok(woff.size > 40_000 && woff.size < 100_000, `${woff.size} B`);
  assert.match(src('fonts/OFL-galmuri.txt'), /SIL Open Font License, Version 1\.1/);
});

test('🔗 배선 — 홈 카드 자리 · 앱 셸 · 글꼴 · 다른 창이 겹치지 않음 · 사용 기록 · 📊·📤 · 수학 원천', () => {
  assert.match(src('index.html'), /id="home-journey"/);
  const sw = src('sw.js');
  for (const f of ['./js/journey.js', './js/journeyview.js', './js/montypes.js', './fonts/galmuri11.woff']) assert.ok(sw.includes(`'${f}'`), f);
  assert.match(src('css/style.css'), /@font-face \{ font-family: "Galmuri11"; src: url\("\.\.\/fonts\/galmuri11\.woff"\)/);
  for (const f of ['js/hatch.js', 'js/parcel.js', 'js/korbattleview.js']) assert.match(src(f), /'jr-trip'(, 'lk-lake'(, 'lk-dex'(, 'lk-gear')?)?)?\]/, `${f} 겹침 목록`); // 🎣 낚시터 창이 뒤에 붙음 (v366)
  assert.match(src('js/usage.js'), /\{ place: 'journey', ids: \['jr-trip'\] \}/);
  // 창 id는 페이지에 하나뿐 — 'journey'는 영어 플레이어의 여행 길 막대가 쓴다(겹치면 겹침 목록이 그 막대를 「떠 있는 창」으로 본다 · 진짜 화면 시험이 잡음)
  assert.match(src('js/journeyview.js'), /root\.id = 'jr-trip';/);
  // v343 상한은 아이 안내·📊 설명에도 같은 값으로 (🔍 Codex 147차 — 「스톤은 5개」가 합계처럼 읽혔다)
  assert.ok(src('js/journeyview.js').includes('스톤은 과목마다 최대 ${JOURNEY.loseMax.stone}개, 💰은 최대 ${JOURNEY.loseMax.coins}까지만 잃어요'), '출발 안내');
  assert.ok(src('js/stats.js').includes('스톤 20%(과목마다 최대 ${JOURNEY.loseMax.stone}개)·코인 30%(최대 ${JOURNEY.loseMax.coins})를 잃고'), '📊 설명');
  assert.doesNotMatch(src('index.html'), /id="jr-trip"/);
  assert.match(src('index.html'), /id="journey" class="journey"/);
  assert.match(src('js/db.js'), /'uJourney',/);
  assert.match(src('js/upload.js'), /path: 'usage\/journey\.md'/);
  assert.match(src('js/stats.js'), /card\('🎒 포켓몬 대여행'\)/);
  assert.match(src('js/home.js'), /import\('\.\/journeyview\.js'\)\.then\(\(m\) => m\.mountJourneyCard/);
  assert.match(src('js/math.js'), /export async function journeyMathSource\(\)/);
  assert.match(src('js/math.js'), /x\.state === 'done'/, '다 배운 개념만');
  assert.match(src('js/journeyview.js'), /Number\(r\.quizPass\) >= 1/, '영어는 뜻을 맞혀 본 단어만');
  assert.match(src('js/journeyview.js'), /if \(ch\.length !== 4\) return null;/, '영어도 4지선다만 (Codex 145차 #3)');
  assert.match(src('js/journeyview.js'), /yes\.disabled = false;/, '집으로 저장 실패 뒤 다시 누를 수 있다 (Codex 145차 #2)');
  assert.doesNotMatch(src('js/journeyview.js'), /e\.currentTarget\.disabled = false/);
  assert.match(src('js/journeyview.js'), /if \(profileLoading\(\)\) \{ b\.hidden = true; profileReady\(\)\.then\(\(\) => mountJourneyCard\(b\)\)/, '읽는 중이면 다 읽은 뒤 다시 그림');
  assert.match(src('js/journeyview.js'), /pool\.filter\(\(w\) => own\(st, w\.id\)\)/, '국어는 배운 낱말만');
  assert.match(src('js/journeyview.js'), /filter\(\(x\) => own\(played, x\.id\)\)/, '논술은 해 본 주제만');
  assert.equal(ownedIds(pf()).length, OWNED.length);
});
