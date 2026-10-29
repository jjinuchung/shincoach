// 🎒 포켓몬 대여행 늘리기 (v362 · 2026-10-29 진우 「대여행이 아니고 소여행 같다 · 5분이면 끝난다」 → 아버님 기본안 「이대로」) — node --test tests/journey362.test.js
// 구역 6곳(산·숲·바다·화산·하늘·우주) · 구역마다 야생·트레이너·👑 대장 · 🚀 HP 6 · 처음 ❤️ 6 · 👑 대장을 이기면 ❤️ +2(다섯 번 — Codex 166차 판단 표 「추천대로」) · 구역마다 이벤트(🎁 보물 상자 · 🧑‍🔬 박사 퀴즈 · 🔀 갈림길) ·
// 보상·잃는 양은 그대로 · v341 꼴(만남 9번)로 가던 여행은 그대로 이어 간다
import { fakeIdb } from './fakeidb.js'; // ★ db.js·xp.js보다 먼저
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  JOURNEY, ZONES, STOPS, PER_ZONE, CENTERS, OLD_STOPS, OLD_HEARTS, ROCKET_MON, EVENTS, hpOf, heartsMax, mergeJourney, TYPE_KO, typesOf, zoneOfStop, centersOf, zoneStart, pendingEvent,
  routeOf, journeyOf, copyJourney, startRule, answerRule, swapRule, eventRule, homeRule, makeRoute, makeEvents, profChoices, rowText, journeyRows, journeyMd,
} from '../js/journey.js';
import { ROSTER, subjectOf } from '../js/pokemon.js';
import { STONES } from '../js/items.js';
import { emptyProfile, cloneProfile, mergeStatRecord } from '../js/db.js';
import { initProfile, flushProfile, reloadProfile, journeyStart, journeyEvent, journeyAnswer, getProfileSnapshot } from '../js/xp.js';

const src = (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
function seeded(seed = 7) {
  let x = seed >>> 0;
  return () => { x = (x * 1664525 + 1013904223) >>> 0; return x / 2 ** 32; };
}
const SAT = new Date(2026, 9, 31, 10, 0, 0).getTime(); // 2026-10-31 토요일 (이 기기 시간대)
const DAY = 86_400_000;
const PARTY = [25, 7, 4, 1, 658, 72];
const ST = Object.fromEntries(STONES.map((s) => [s.id, 0]));
const ko = (id) => (ROSTER.find((r) => r.id === Number(id)) || {}).ko || '';
function pf(over = {}) {
  const p = cloneProfile({ ...emptyProfile(), caught: Object.fromEntries([...PARTY, 39].map((id) => [id, 1])), items: { ...ST, stone_math: 12 }, coins: 450, coinsEarned: 1000 });
  return Object.assign(p, over);
}
function cands(caught = {}) {
  return ZONES.map((z) => ROSTER.filter((r) => r.id !== ROCKET_MON && typesOf(r.id).some((t) => z.types.includes(t))).map((r) => ({ id: r.id, caught: !!caught[r.id], rarity: 1 + (r.id % 3) })));
}
function trip(seed = 3, p = pf(), now = SAT) {
  const route = makeRoute(cands(), seeded(seed), ['🧢', '👧']);
  const ev = makeEvents(route, cands(), seeded(seed + 50));
  const r = startRule(p, { id: `long${seed}abcd`, party: PARTY, route, ev }, now);
  assert.equal(r.ok, true, `떠나기 ${r.why || ''}`);
  return { p, cur: r.cur };
}
const curOf = (p) => journeyOf(p.journey).cur;
/** 지금 이벤트를 그 종류에 맞게 (기본: 셈 없이 넘김) */
function ev(p, over = {}, now = SAT) {
  const c = curOf(p);
  const z = pendingEvent(c);
  const e = c.ev[z];
  const wild = c.route.slice(PER_ZONE * z, PER_ZONE * z + 2).find((x) => x.kind === 'wild').mon;
  const base = e.k === 'chest' ? { skip: true } : e.k === 'prof' ? { correct: false } : { pick: wild };
  return eventRule(p, { id: c.id, qn: c.qn, kind: e.k, ...base, ...over }, now);
}
/** 지금 만남을 이긴다 (이벤트는 먼저 넘김) */
function beat(p, now = SAT) {
  let out = null;
  for (let k = 0; k < 12; k++) {
    let c = curOf(p);
    if (!c || c.phase !== 'go') break;
    if (pendingEvent(c) >= 0) ev(p, {}, now);
    c = curOf(p);
    const at = c.at;
    out = answerRule(p, { id: c.id, qn: c.qn, mon: 1, subj: 'math', correct: true }, now, subjectOf);
    assert.equal(out.ok, true, out.why);
    if (out.beaten || out.at !== at) break;
  }
  return out;
}
/** 이벤트 차례까지 이기며 간다 — 그 종류의 이벤트가 나올 때까지 */
function toEvent(p, kind) {
  for (let k = 0; k < STOPS; k++) {
    const c = curOf(p);
    const z = pendingEvent(c);
    if (z >= 0 && c.ev[z].k === kind) return z;
    if (z >= 0) ev(p);
    beat(p);
  }
  return -1;
}

test('🗺️ 길이 세 배 — 구역 6 · 만남 19 · 이겨야 할 HP 24 → 60 · 👑 대장(HP 4)을 이기면 ❤️ +2(우주 대장 빼고) · 🚀 6 · ❤️ 6', () => {
  assert.deepEqual(ZONES.map((z) => z.ko), ['산', '숲', '바다', '화산', '하늘', '우주']);
  assert.deepEqual(ZONES.map((z) => z.types), [['rock', 'ground'], ['grass', 'bug'], ['water'], ['fire', 'dragon'], ['flying'], ['psychic', 'fairy']]);
  assert.equal(STOPS, 19);
  assert.deepEqual(JOURNEY.hp, { wild: 2, trainer: 3, boss: 4, rocket: 6 });
  const route = makeRoute(cands(), seeded(1));
  assert.equal(route.reduce((a, s) => a + JOURNEY.hp[s.kind], 0), 60, 'v341은 24(야생 2·트레이너 3 넷씩 + 🚀 4)');
  assert.deepEqual(CENTERS, [2, 5, 8, 11, 14]);
  assert.ok(CENTERS.every((i) => route[i].kind === 'boss'), '모두 대장');
  assert.equal(route[17].kind, 'boss');
  assert.ok(!CENTERS.includes(17), '우주 대장은 🚀 바로 앞이라 회복 없음');
  assert.deepEqual([...Array(STOPS).keys()].filter((i) => zoneStart(i)), [0, 3, 6, 9, 12, 15, 18], '구역 첫 만남 · 🚀');
  // 보상·잃는 양은 그대로 (아버님 「이대로」 — 보상은 그대로)
  assert.equal(JOURNEY.coins, 500);
  assert.deepEqual(JOURNEY.loseMax, { stone: 5, coins: 200 });
  assert.equal(JOURNEY.hearts, 6, '❤️ 6 (v341은 5)');
  assert.equal(JOURNEY.heal, 2);
});

test('🎁🧑‍🔬🔀 이벤트 만들기 — 구역마다 하나 · 둘씩 · 갈림길의 다른 야생은 그 구역 타입이고 길에 없음 · 같은 씨앗이면 같음 · v341 꼴 길은 없음', () => {
  for (let s = 1; s <= 300; s++) {
    const route = makeRoute(cands(), seeded(s));
    const e = makeEvents(route, cands(), seeded(s * 3));
    assert.equal(e.length, ZONES.length);
    const count = Object.fromEntries(EVENTS.map((k) => [k, e.filter((x) => x.k === k).length]));
    assert.deepEqual(count, { chest: 2, prof: 2, fork: 2 }, `씨앗 ${s}`);
    const inRoute = new Set(route.map((x) => x.mon));
    const alts = e.filter((x) => x.k === 'fork').map((x) => x.alt);
    assert.equal(new Set(alts).size, alts.length);
    e.forEach((x, z) => {
      assert.equal(x.d, 0);
      if (x.k === 'fork') { assert.ok(!inRoute.has(x.alt)); assert.ok(typesOf(x.alt).some((t) => ZONES[z].types.includes(t)), `구역 ${z}`); }
      if (x.k === 'prof') { assert.ok(ko(x.m)); assert.ok(['type', 'shadow'].includes(x.f)); assert.ok(typesOf(x.m).some((t) => ZONES[z].types.includes(t))); }
    });
  }
  const route = makeRoute(cands(), seeded(4));
  assert.deepEqual(makeEvents(route, cands(), seeded(9)), makeEvents(route, cands(), seeded(9)));
  // 두 구역에 다 맞는 포켓몬(갸라도스 물·비행 — 바다·하늘)이 유일한 다른 야생이면 갈림길 하나만 그 포켓몬 · 다른 하나는 🎁 (같은 포켓몬을 두 길에 두지 않게)
  let both = 0; let one = 0;
  for (let s = 1; s <= 60 && both + one < 30; s++) {
    const rt = makeRoute(cands(), seeded(s));
    if (rt.some((x) => x.mon === 130)) continue;
    const tight = cands().map((l, z) => [...l.filter((c) => rt.slice(3 * z, 3 * z + 3).some((x) => x.mon === c.id)), ...(z === 2 || z === 4 ? [{ id: 130, caught: false, rarity: 1 }] : [])]);
    for (let k = 1; k <= 40; k++) {
      const e = makeEvents(rt, tight, seeded(k));
      const g = [e[2], e[4]].filter((x) => x.k === 'fork' && x.alt === 130).length;
      assert.ok(g <= 1, '갸라도스가 두 갈림길에');
      if (g) one++;
      if (e[2].k === 'fork' && e[4].k === 'chest' && e.filter((x) => x.k === 'fork').length === 1) both++;
    }
  }
  assert.ok(one > 0 && both > 0, `겨룬 경우가 있었다 (${one} · ${both})`);
  // 다른 야생이 없는 구역은 🔀 대신 🎁
  const tight = cands().map((l, z) => l.filter((c) => route.slice(3 * z, 3 * z + 3).some((s) => s.mon === c.id)));
  assert.ok(makeEvents(route, tight, seeded(2)).every((x) => x.k !== 'fork'));
  assert.deepEqual(makeEvents(route.slice(0, 9), cands()), [], '틀린 길');
});

test('🎁 보물 상자 — 맞히면 ❤️ +1(가득이면 💰20) · 틀려도 ❤️ 그대로 · 과목 맞힌 수에 셈 · 문제를 못 만들면 셈 없이 지나감', () => {
  const { p } = trip(5);
  const z = toEvent(p, 'chest');
  assert.ok(z >= 0);
  const c0 = curOf(p);
  assert.equal(c0.hearts, JOURNEY.hearts);
  // ❤️ 가득 → 💰20
  const a = ev(p, { skip: false, subj: 'english', correct: true });
  assert.deepEqual([a.ok, a.correct, a.heart, a.coins, a.hearts], [true, true, 0, JOURNEY.chestCoins, JOURNEY.hearts]);
  assert.deepEqual([p.coins, p.coinsEarned], [450 + 20, 1000 + 20], '공부로 번 💰에도');
  assert.deepEqual(curOf(p).q.english, [1, 1]);
  assert.equal(curOf(p).qn, c0.qn + 1, '새 번호');
  assert.equal(eventRule(p, { id: c0.id, qn: c0.qn, kind: 'chest', subj: 'math', correct: true }, SAT).why, 'changed', '두 번 받지 않는다');
  // ❤️가 줄었을 때 → +1 · 틀리면 그대로
  const { p: q } = trip(5);
  toEvent(q, 'chest');
  const c1 = curOf(q);
  q.journey.cur.hearts = 3; // 앞에서 둘을 잃었다
  const w = ev(q, { skip: false, subj: 'math', correct: false });
  assert.deepEqual([w.correct, w.heart, w.coins, w.hearts], [false, 0, 0, 3], '틀려도 ❤️ 그대로');
  const m0 = c1.q.math || [0, 0]; // 앞 만남에서 맞힌 수 그대로 · 푼 수만 +1
  assert.deepEqual(curOf(q).q.math, [m0[0], m0[1] + 1]);
  const { p: q2 } = trip(5);
  toEvent(q2, 'chest');
  q2.journey.cur.hearts = 3;
  const h = ev(q2, { skip: false, subj: 'math', correct: true });
  assert.deepEqual([h.heart, h.hearts, q2.coins], [1, 4, 450]);
  // 꼴 · 차례
  const { p: q3 } = trip(5);
  toEvent(q3, 'chest');
  const c3 = curOf(q3);
  assert.equal(eventRule(q3, { id: c3.id, qn: c3.qn, kind: 'chest', subj: 'art', correct: true }, SAT).why, 'subj');
  assert.equal(eventRule(q3, { id: c3.id, qn: c3.qn, kind: 'prof', correct: true }, SAT).why, 'changed', '종류가 다름');
  const sk = ev(q3, { skip: true });
  assert.deepEqual([sk.ok, sk.coins, sk.heart], [true, 0, 0]);
  assert.deepEqual(curOf(q3).q, c3.q, '셈 없이');
});

test('🧑‍🔬 박사 퀴즈 — 맞히면 💰10 · 틀려도 잃는 것 없음 · 박사 퀴즈 수(pf)에만 셈 · 📊·📤 줄에', () => {
  const { p, cur } = trip(7);
  const z = toEvent(p, 'prof');
  assert.ok(z >= 0);
  const q0 = JSON.stringify(curOf(p).q);
  const r = ev(p, { correct: true });
  assert.deepEqual([r.correct, r.coins], [true, JOURNEY.profCoins]);
  assert.equal(p.coins, 450 + 10);
  assert.deepEqual(curOf(p).pf, [1, 1]);
  assert.equal(JSON.stringify(curOf(p).q), q0, '공부 과목엔 안 셈');
  toEvent(p, 'prof');
  ev(p, { correct: false });
  assert.deepEqual(curOf(p).pf, [1, 2]);
  assert.equal(p.coins, 460, '틀려도 잃지 않는다');
  homeRule(p, { id: cur.id }, SAT);
  const row = journeyRows(p.journey)[0];
  assert.deepEqual(row.pf, [1, 2]);
  assert.match(rowText(row), /🏃 집으로 · .* · 🧑‍🔬 박사 퀴즈 1\/2/);
  assert.equal(journeyOf({ done: { '2026-10-31': { r: 'home', at: 1, pf: [5, 2] } } }).done['2026-10-31'].pf.join(), '2,2', '맞힌 수는 푼 수까지');
});

test('🔀 갈림길 — 고른 야생이 그 구역 야생이 된다(다른 쪽은 alt로) · 그 야생을 이기면 데려올 후보 · 둘 말고는 안 받음', () => {
  const { p } = trip(9);
  const z = toEvent(p, 'fork');
  assert.ok(z >= 0);
  const c = curOf(p);
  const wi = [3 * z, 3 * z + 1].find((i) => c.route[i].kind === 'wild');
  const was = c.route[wi].mon;
  const alt = c.ev[z].alt;
  assert.equal(eventRule(p, { id: c.id, qn: c.qn, kind: 'fork', pick: 25 }, SAT).why, 'mon');
  const r = ev(p, { pick: alt });
  assert.deepEqual([r.ok, r.pick], [true, alt]);
  const c2 = curOf(p);
  assert.equal(c2.route[wi].mon, alt);
  assert.equal(c2.ev[z].alt, was, '다른 쪽은 남는다');
  assert.ok(routeOf(c2.route), '바뀐 길도 바른 꼴');
  for (let k = 0; k < 3; k++) beat(p);
  assert.ok(curOf(p).won.includes(alt), '고른 야생을 이겼다');
  assert.ok(!curOf(p).won.includes(was));
  // 그대로 고르면 길이 안 바뀐다
  const { p: q } = trip(9);
  const z2 = toEvent(q, 'fork');
  const cq = curOf(q);
  const keep = cq.route.slice(3 * z2, 3 * z2 + 2).find((x) => x.kind === 'wild').mon;
  ev(q, { pick: keep });
  assert.deepEqual(curOf(q).route, cq.route);
});

test('⏸ 이벤트 차례 — 구역 첫 만남 앞에서만 · 하기 전엔 답·🔄 안 받음 · 한 번 하면 끝 · 다음 주가 되면 집으로', () => {
  const { p, cur } = trip(11);
  assert.equal(pendingEvent(curOf(p)), 0, '산에 들어설 때');
  assert.equal(answerRule(p, { id: cur.id, qn: 0, mon: 1, subj: 'math', correct: false }, SAT, subjectOf).why, 'event');
  assert.equal(swapRule(p, { id: cur.id, qn: 0 }).why, 'event');
  assert.equal(curOf(p).hearts, JOURNEY.hearts);
  ev(p);
  assert.equal(pendingEvent(curOf(p)), -1);
  beat(p);
  assert.equal(pendingEvent(curOf(p)), -1, '구역 안 둘째 만남 앞엔 없다');
  beat(p); beat(p);
  assert.equal(curOf(p).at, 3);
  assert.equal(pendingEvent(curOf(p)), 1, '숲에 들어설 때');
  // ⏰ 다음 주
  const c = curOf(p);
  const e = eventRule(p, { id: c.id, qn: c.qn, kind: c.ev[1].k, skip: true, correct: false, pick: 0 }, SAT + 7 * DAY);
  assert.deepEqual([e.ok, e.end], [true, 'expired']);
  assert.equal(journeyOf(p.journey).done['2026-10-31'].r, 'home');
  assert.equal(p.coins, 450);
});

test('💖 대장마다 ❤️ +2 · 👑 대장 · 끝까지 — 산·숲·바다·화산·하늘 대장 뒤(우주 대장은 없음) · 이긴 야생 여섯 · 보상 그대로(💰500)', () => {
  const { p } = trip(13);
  let healed = [];
  for (let k = 0; k < STOPS; k++) {
    const c = curOf(p);
    if (c.route[c.at].kind === 'boss') { p.journey.cur.hearts = 2; } // 대장 앞에서 ❤️를 잃었다 치고
    const r = beat(p);
    if (r.healed) healed.push([c.at, r.healed]);
    if (k === STOPS - 1) assert.equal(r.end, 'won');
  }
  assert.deepEqual(healed, [[2, 2], [5, 2], [8, 2], [11, 2], [14, 2]]);
  const j = journeyOf(p.journey);
  assert.equal(j.cur.won.length, 6);
  assert.equal(p.coins, 450 + 500, '이벤트는 셈 없이 넘김 · 보상 💰500 그대로');
  assert.equal(j.done['2026-10-31'].r, 'won');
});

test('🧳 v341 꼴(만남 9)로 가던 여행은 그대로 이어 간다 — 이벤트 없음 · 🏥는 넷째 만남 뒤 · 구역은 산·바다·하늘·우주 자리 · 새로 떠날 땐 새 꼴만', () => {
  // 옛 길: 산·바다·하늘·우주 구역마다 야생·트레이너 + 🚀
  const pickZ = (z, n) => ROSTER.filter((r) => r.id !== ROCKET_MON && typesOf(r.id).some((t) => ZONES[z].types.includes(t))).slice(n, n + 2);
  const old = [];
  [0, 2, 4, 5].forEach((z, k) => { const [a, b] = pickZ(z, k * 7); old.push({ kind: 'wild', mon: a.id }, { kind: 'trainer', mon: b.id, who: '🧢' }); });
  old.push({ kind: 'rocket', mon: ROCKET_MON });
  assert.ok(routeOf(old), '옛 길도 바른 꼴');
  assert.deepEqual([...Array(OLD_STOPS).keys()].map((i) => zoneOfStop(i, OLD_STOPS)), [0, 0, 2, 2, 4, 4, 5, 5, 5]);
  assert.deepEqual(centersOf(OLD_STOPS), [3]);
  const p = pf();
  p.journey = { cur: { id: 'oldtrip123', week: '2026-10-31', party: PARTY, route: old, at: 2, hearts: 3, hp: 2, qn: 7, qv: 0, swap: -1, won: [old[0].mon], phase: 'go', startAt: 1, q: { math: [6, 7] } }, done: {} };
  const c = curOf(p);
  assert.ok(c, '옛 여행을 버리지 않는다');
  assert.deepEqual([c.route.length, c.ev, c.pf, pendingEvent(c)], [9, [], [0, 0], -1]);
  const healed = [];
  let rocketHp = 0;
  for (let k = 2; k < OLD_STOPS; k++) {
    const at = curOf(p).at;
    if (at === 3) p.journey.cur.hearts = 4; // 🏥 앞 — 옛 꼴은 ❤️ 최대 5 (🔍 Codex 166차 #4)
    if (at === OLD_STOPS - 1) rocketHp = curOf(p).hp;
    const r = beat(p);
    if (r.healed) { healed.push([at, r.healed, r.hearts]); }
    if (r.end) assert.equal(r.end, 'won');
  }
  assert.deepEqual(healed, [[3, 1, 5]], '옛 꼴 🏥는 넷째 만남 뒤 · ❤️ 5까지만');
  assert.equal(rocketHp, 4, '옛 꼴 🚀 HP는 4 그대로');
  assert.deepEqual([hpOf(old, OLD_STOPS - 1), heartsMax(OLD_STOPS), heartsMax(STOPS), hpOf(makeRoute(cands(), seeded(2)), STOPS - 1)], [4, OLD_HEARTS, JOURNEY.hearts, 6]);
  // ❤️ 6은 새 꼴에서만 — 옛 꼴 여행에 ❤️ 6은 깨진 값
  const six = JSON.parse(JSON.stringify(p.journey));
  assert.equal(journeyOf({ cur: { ...six.cur, phase: 'go', at: 2, hp: 2, hearts: 6 } }).cur, null);
  assert.equal(curOf(p).phase, 'pick');
  assert.equal(p.coins, 950, '보상은 같다');
  assert.equal(startRule(pf(), { id: 'newtrip999', party: PARTY, route: old, ev: [] }, SAT + 7 * DAY).why, 'route', '새로 떠날 땐 새 꼴');
  assert.match(journeyMd(p.journey, '2026-11-01', ko), /만남 9\/9|데려올 포켓몬을 아직 안 고름/);
});

test('🧾 고쳐 읽기·복사·병합 — 이벤트·박사 퀴즈 수도 · 갈림길의 alt가 길에 있으면 버림 · 프로필 병합은 최근 쪽 여행', () => {
  const { p } = trip(15);
  ev(p);
  const good = curOf(p);
  assert.equal(good.ev[0].d, 1);
  const fz = good.ev.findIndex((e) => e.k === 'fork');
  const bad = JSON.parse(JSON.stringify(p.journey.cur));
  bad.ev[fz].alt = bad.route[3 * fz + 2].mon; // 같은 구역의 대장 — 타입은 맞지만 길에 있다
  assert.equal(journeyOf({ cur: bad }).cur, null, 'alt가 길에 있다');
  const bad2 = JSON.parse(JSON.stringify(p.journey.cur));
  bad2.ev[0].k = 'party';
  assert.equal(journeyOf({ cur: bad2 }).cur, null);
  const cp = copyJourney(p.journey);
  cp.cur.ev[1].d = 1;
  assert.equal(curOf(p).ev[1].d, 0, '복사는 따로');
  const older = { ...cloneProfile(pf()), journey: JSON.parse(JSON.stringify(p.journey)), updatedAt: 1 };
  beat(p); // 이벤트는 이미 했다 — 이겨 나간다
  const recent = { ...cloneProfile(p), updatedAt: 9 };
  for (const m of [mergeStatRecord('profile', recent, older), mergeStatRecord('profile', older, recent)]) {
    assert.equal(journeyOf(m.journey).cur.at, curOf(p).at, '최근 쪽 여행');
    assert.equal(journeyOf(m.journey).cur.ev[0].d, 1);
  }
});

test('🔀 옛 꼴·새 꼴 여행이 두 기기에서 섞여 합쳐져도 — 최근에 저장된 쪽 여행이 통째로 · 어느 쪽 차례로 합쳐도 (🔍 Codex 166차 #5)', () => {
  const { p: a } = trip(21);
  const pickZ = (z, n) => ROSTER.filter((r) => r.id !== ROCKET_MON && typesOf(r.id).some((t) => ZONES[z].types.includes(t))).slice(n, n + 2);
  const old = [];
  [0, 2, 4, 5].forEach((z, k) => { const [x, y] = pickZ(z, k * 7); old.push({ kind: 'wild', mon: x.id }, { kind: 'trainer', mon: y.id, who: '🧢' }); });
  old.push({ kind: 'rocket', mon: ROCKET_MON });
  const b = pf();
  b.journey = { cur: { id: 'oldtrip456', week: '2026-10-31', party: PARTY, route: old, at: 1, hearts: 4, hp: 3, qn: 3, qv: 0, swap: -1, won: [old[0].mon], phase: 'go', startAt: 1, q: {} }, done: {} };
  assert.ok(curOf(b));
  for (const [newer, older, want] of [[a, b, STOPS], [b, a, OLD_STOPS]]) {
    const n = { ...cloneProfile(newer), updatedAt: 9 };
    const o = { ...cloneProfile(older), updatedAt: 1 };
    for (const m of [mergeStatRecord('profile', n, o), mergeStatRecord('profile', o, n)]) {
      const c = journeyOf(m.journey).cur;
      assert.equal(c.route.length, want);
      assert.equal(c.id, curOf(newer).id);
      assert.deepEqual(c.ev, curOf(newer).ev);
      assert.equal(c.hearts, curOf(newer).hearts);
    }
  }
  assert.equal(mergeJourney(a.journey, b.journey).cur.route.length, STOPS);
  assert.equal(mergeJourney(b.journey, a.journey).cur.route.length, OLD_STOPS);
});

test('🧑‍🔬 박사 퀴즈 보기 — 타입: 정답 하나 · 같은 꼴(두 타입이면 두 타입) · 순서만 다른 보기 없음 · 반만 맞는 보기 하나 · 그림자: 이름 넷 서로 다름', () => {
  for (let s = 1; s <= 300; s++) {
    const id = ROSTER[(s * 37) % ROSTER.length].id;
    const ch = profChoices(id, 'type', [], ko, seeded(s));
    assert.equal(ch.length, 4);
    assert.equal(ch.filter((x) => x.ok).length, 1);
    const right = typesOf(id).map((t) => TYPE_KO[t]).join('·');
    assert.equal(ch.find((x) => x.ok).text, right);
    const keys = ch.map((x) => x.text.split('·').sort().join('+'));
    assert.equal(new Set(keys).size, 4, `순서만 다른 보기 없음 ${ch.map((x) => x.text)}`);
    assert.ok(ch.every((x) => x.text.split('·').length === typesOf(id).length), '같은 꼴');
    if (typesOf(id).length === 2) {
      const mine = typesOf(id).map((t) => TYPE_KO[t]);
      assert.ok(ch.some((x) => !x.ok && x.text.split('·').some((t) => mine.includes(t))), '반만 맞는 보기');
    }
  }
  const pool = cands()[1].map((c) => c.id);
  const sh = profChoices(1, 'shadow', pool, ko, seeded(3));
  assert.equal(sh.length, 4);
  assert.equal(new Set(sh.map((x) => x.text)).size, 4);
  assert.equal(sh.find((x) => x.ok).text, ko(1));
  assert.equal(profChoices(1, 'shadow', [1, 2, 3], ko, seeded(3)), null, '다른 포켓몬이 셋 안 되면');
  // 이름이 같은 포켓몬(모습만 다른 것 등)은 한 번만 · 정답과 같은 이름도 빼기
  const twin = (id) => ({ 1: '이상해씨', 2: '쌍둥이', 3: '쌍둥이', 4: '이상해씨', 5: '다섯', 6: '여섯' }[id] || '');
  for (let s = 1; s <= 50; s++) {
    const t = profChoices(1, 'shadow', [2, 3, 4, 5, 6], twin, seeded(s));
    assert.deepEqual(t.map((x) => x.text).sort(), ['다섯', '쌍둥이', '여섯', '이상해씨'], `씨앗 ${s}`);
  }
  assert.deepEqual(profChoices(658, 'type', [], ko, seeded(8)), profChoices(658, 'type', [], ko, seeded(8)), '같은 씨앗이면 같은 보기');
});

const stored = () => fakeIdb.get('profile', 'me');
test('★ 저장 경로 — 이벤트도 저장된 프로필에 한 트랜잭션 · 두 창이 같은 상자를 동시에 열어도 한 번 · 저장이 실패하면 없던 일', async () => {
  await initProfile();
  await flushProfile();
  const cur0 = stored() || emptyProfile();
  fakeIdb.put('profile', { ...pf(), updatedAt: (cur0.updatedAt || 0) + 1 });
  await reloadProfile();
  // 첫 이벤트가 🎁인 길을 고른다
  let route = null; let evs = null;
  for (let s = 1; s < 200 && !route; s++) { const r = makeRoute(cands(), seeded(s)); const e = makeEvents(r, cands(), seeded(s + 1)); if (e[0].k === 'chest') { route = r; evs = e; } }
  assert.equal((await journeyStart({ id: 'savelong1', party: PARTY, route, ev: evs })).ok, true);
  const before = JSON.stringify([stored().coins, stored().journey]);
  fakeIdb.failNext('profile');
  assert.deepEqual(await journeyEvent({ id: 'savelong1', qn: 0, kind: 'chest', subj: 'math', correct: true }), { ok: false, why: 'save' });
  assert.equal(JSON.stringify([stored().coins, stored().journey]), before);
  const rs = await Promise.all([
    journeyEvent({ id: 'savelong1', qn: 0, kind: 'chest', subj: 'math', correct: true }),
    journeyEvent({ id: 'savelong1', qn: 0, kind: 'chest', subj: 'math', correct: true }),
  ]);
  assert.deepEqual(rs.map((r) => r.ok).sort(), [false, true]);
  assert.equal(stored().coins - JSON.parse(before)[0], JOURNEY.chestCoins, '💰20은 한 번만');
  assert.equal(journeyOf(getProfileSnapshot().journey).cur.ev[0].d, 1, '창의 프로필도');
  assert.equal((await journeyAnswer({ id: 'savelong1', qn: 1, mon: 1, subj: 'math', correct: true })).ok, true, '이제 만남');
});

test('🔗 배선 — 화면 이벤트 셋 · ⛺ 쉬었다 가기 · 대장 대사 · 지도 두 줄 · 구역 색 여섯 · xp 저장 · 📊 길이 · 판 v362 이상', () => {
  const v = src('js/journeyview.js');
  for (const f of ['function renderChest(', 'function renderProf(', 'function renderFork(', 'function mapSlots(']) assert.ok(v.includes(f), f);
  assert.match(v, /'⛺ 쉬었다 가기', \(\) => closeJourney\(\)/, '쉬었다 가기 = 창만 닫음(여행은 그대로)');
  assert.match(v, /의 대장이 길을 막아섰다!/);
  assert.match(v, /makeEvents\(routeList, cands, Math\.random\)/);
  assert.equal(v.split("r.why === 'changed' || r.why === 'event'").length - 1, 2, '이벤트가 먼저면 지도로 — 답·🔄 둘 다');
  assert.match(v, /viewBox', '0 0 420 300'/);
  assert.match(v, /if \(img && f === 'shadow'\) img\.alt = '그림자';/, '그림자 그림의 대체 글에 이름을 넣지 않는다');
  // 🔍 Codex 166차: 그림이 안 열리면 타입 문제로 · 새 꼴 지도엔 🏥 점 없음 · 🚀가 지도 밖으로 안 나감 · 대장을 이기면 ❤️ 화면
  assert.match(v, /img\.addEventListener\('error', broken, \{ once: true \}\);/);
  assert.match(v, /const broken = \(\) => \{ if \(!answered && alive\(run\)\) renderProf\(z, true\); \};/);
  assert.match(v, /if \(img\.complete && !img\.naturalWidth\) setTimeout\(broken, 0\);/, '이미 실패한 그림');
  assert.match(v, /const all = \[\.\.\.moves\.children\];\n    answered = true;[^\n]*\n    const r = await sendEvent\(run, \{ kind: 'prof'/, '고른 뒤엔 그림이 늦게 깨져도 다시 그리지 않는다');
  assert.match(v, /if \(!r\) \{ answered = false; return; \}/, '저장이 안 되면 다시 고를 수 있게');
  assert.match(v, /if \(centers\.includes\(i\) && n === OLD_STOPS\) out\.push\(\{ t: 'center'/);
  assert.match(v, /const pad = 20;/);
  assert.match(v, /👑 대장을 이겼다! 힘이 솟는다!/);
  assert.match(v, /const max = hpOf\(c\.route, c\.at\);/, '옛 꼴 🚀 HP 4도 화면에');
  const css = src('css/style.css');
  for (let z = 0; z < 6; z++) assert.match(css, new RegExp(`\\.jr-z${z}, \\.jr-z${z}-fill \\{`));
  assert.match(css, /\.jr-mon\.is-shadow img \{ filter: brightness\(0\); \}/);
  assert.match(src('js/xp.js'), /export function journeyEvent\(req\) \{\n  return houseDo\(\(p\) => jrEventRule\(p, req, Date\.now\(\)\)\);/);
  assert.match(src('js/stats.js'), /만남 \$\{jCur\.at \+ 1\}\/\$\{jCur\.route\.length\}/);
  assert.ok(+(/const CACHE_VERSION = 'v(\d+)';/.exec(src('sw.js')) || [])[1] >= 362);
});
