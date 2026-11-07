// 🚚 v397 포켓몬 이사 대작전 — 규칙(moveday.js)을 끝까지 돌려 보고 저장 트랜잭션·병합·배선을 본다
import { fakeIdb } from './fakeidb.js'; // ★ db.js·xp.js보다 먼저
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  MOVE, STAGES, PER_STAGE, MOVE_STOPS, GUESTS, HOUSE_GIFT, moveBlocksTrip, healMoveHouse, stopAt, hpOfStop, helps, strongStages, moveOf, moveState, moveOnCard, pendingEvent,
  moveStartRule, moveAnswerRule, moveSwapRule, moveEventRule, moveGiftRule, movePickRule, moveFurnRule, moveEndRule, makeGuests, makeMoveEvents, moveHello, moveMd,
} from '../js/moveday.js';
import { JOURNEY, journeyOf, copyJourney, mergeJourney, stateOf, startRule, weekOf, questionFrom, journeyRows, rowText, makeRoute, makeEvents, ZONES } from '../js/journey.js';
import { houseShape, houseOf, placeRule, FIRST_ROOM, SECOND_ROOM, ROOM_WIDE, PAINT } from '../js/house.js';
import { paintMove, MOVE_SCENES } from '../js/movescene.js';
import { STONES } from '../js/items.js';
import { initProfile, flushProfile, getProfileSnapshot, moveStart, moveAnswer, moveGift, movePick, moveFurn, moveEnd, journeyStart, journeyRaw } from '../js/xp.js';
import { mergeStatRecord } from '../js/db.js';

const read = (f) => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const NOW = new Date(2026, 10, 14, 12).getTime(); // 11-14 토요일
const DAY = 86400000;
const PARTY = [66, 25, 7, 1, 4, 74]; // 격투 · 전기 · 물 · 풀·독 · 불꽃 · 바위·땅
const GUEST3 = [16, 19, 21];
const prof = (more = {}) => ({ coins: 100, coinsEarned: 0, items: {}, mons: {}, caught: Object.fromEntries(PARTY.map((id) => [id, 1])), ...more });
const evs = () => [{ k: 'chest' }, { k: 'prof', m: 25, f: 'type' }, { k: 'fork', alt: 23, g: 0 }, { k: 'chest' }, { k: 'prof', m: 7, f: 'shadow' }, { k: 'fork', alt: 27, g: 1 }];
const req = (more = {}) => ({ id: 'abc123def456', party: PARTY, guests: GUEST3, ev: evs(), ...more });
const started = (p = prof()) => { const r = moveStartRule(p, req(), NOW); assert.equal(r.ok, true, JSON.stringify(r)); return p; };
const cur = (p) => moveOf(journeyOf(p.journey).move);
const subjOf = () => 'english';
/** 이벤트 하나 넘기기 */
function passEvent(p) {
  const m = cur(p);
  const e = m.ev[pendingEvent(m)];
  const base = { id: m.id, qn: m.qn, kind: e.k };
  const r = moveEventRule(p, e.k === 'chest' ? { ...base, subj: 'math', correct: true } : e.k === 'prof' ? { ...base, correct: true } : { ...base, pick: m.guests[e.g] });
  assert.equal(r.ok, true, JSON.stringify(r));
  return r;
}
/** 끝까지 — 모두 맞힘 */
function finish(p) {
  for (let i = 0; i < 400 && cur(p).phase === 'go'; i++) {
    const m = cur(p);
    if (pendingEvent(m) >= 0) { passEvent(p); continue; }
    const r = moveAnswerRule(p, { id: m.id, qn: m.qn, mon: m.party[0], subj: 'math', correct: true }, NOW, subjOf);
    assert.equal(r.ok, true, JSON.stringify(r));
  }
  assert.equal(cur(p).phase, 'gift');
  return p;
}

// ───────────── 길 ─────────────

test('🚚 길 — 단계 여섯 × 셋 + 🚀 · 단계마다 셋째는 👑 큰일 · 집들이는 손님 셋 · 대여행과 같은 길이', () => {
  assert.equal(STAGES.length, 6);
  assert.equal(MOVE_STOPS, 19);
  assert.equal(MOVE_STOPS, ZONES.length * 3 + 1);
  assert.deepEqual(STAGES.map((s) => s.key), ['pack', 'bye', 'road', 'clean', 'unpack', 'party']);
  const m = { guests: GUEST3 };
  for (let i = 0; i < 15; i++) {
    const s = stopAt(m, i);
    assert.equal(s.stage, Math.floor(i / PER_STAGE));
    assert.equal(s.kind, i % 3 === 2 ? 'big' : 'job', `${i}`);
    assert.ok(s.job.ko && s.job.emoji);
    assert.equal(hpOfStop(s), i % 3 === 2 ? MOVE.hp.big : MOVE.hp.job);
  }
  for (let i = 15; i < 18; i++) assert.deepEqual(stopAt(m, i), { kind: 'guest', stage: 5, mon: GUEST3[i - 15] });
  assert.equal(stopAt(m, 18).kind, 'rocket');
  assert.equal(hpOfStop(stopAt(m, 18)), JOURNEY.hp.rocket);
  const seen = new Set(STAGES.flatMap((s) => s.types));
  assert.equal(seen.size, 12, '단계마다 다른 타입 둘');
});

test('🚚 잘 돕는 친구 — 그 단계 타입이면 · 🚀는 상대를 본다 · 출발 준비 글', () => {
  const box = { kind: 'job', stage: 0, job: STAGES[0].jobs[0] };
  assert.equal(helps(66, box), true, '격투');
  assert.equal(helps(25, box), false);
  assert.equal(helps(25, { kind: 'big', stage: 2 }), true, '전기는 이삿길');
  assert.equal(helps(66, { kind: 'rocket', stage: 5, mon: 52 }), true, '격투는 나옹에');
  assert.equal(helps(25, { kind: 'rocket', stage: 5, mon: 52 }), false);
  assert.deepEqual(strongStages(66), [0]);
  assert.ok(strongStages(74).includes(0), '바위');
});

// ───────────── 열림 ─────────────

test('🚚 11/14부터 대여행 자리에 — 그 전엔 평소 대여행 · 하던 주 여행·데려올 포켓몬이 먼저 · 끝나면 다시 평소 대여행', () => {
  const p = prof();
  assert.equal(moveState(p.journey, '2026-11-13').mode, 'wait');
  assert.equal(moveOnCard(moveState(p.journey, '2026-11-13')), false);
  assert.equal(moveState(p.journey, '2026-11-14').mode, 'open');
  assert.equal(moveOnCard(moveState(p.journey, '2026-11-14')), true);
  assert.equal(moveState(p.journey, '2026-12-20').mode, 'open', '늦게 열어도');
  const wk = { id: 'wk1234', week: '2026-11-14', party: PARTY, route: fixedRoute(), at: 0, hearts: 6, hp: 2, qn: 0, qv: 0, swap: -1, won: [], phase: 'go', startAt: NOW, q: {}, ev: fixedEvents(), pf: [0, 0] };
  assert.ok(journeyOf({ cur: wk }).cur, '시험 여행');
  assert.equal(moveState({ cur: wk }, '2026-11-14').mode, 'wait', '이번 주 여행 중');
  assert.equal(moveState({ cur: { ...wk, week: '2026-11-07' } }, '2026-11-14').mode, 'open', '지난주에 못 끝낸 여행은 막지 않는다');
  const done = { ...wk, week: '2026-11-07', phase: 'pick', at: 19, hp: 0, won: [fixedRoute().find((s) => s.kind === 'wild').mon] };
  assert.ok(journeyOf({ cur: done }).cur, '시험 고르기');
  assert.equal(moveState({ cur: done }, '2026-11-14').mode, 'wait', '데려올 포켓몬부터');
  assert.equal(moveState({ done: { '2026-11-14': { r: 'won', at: NOW, q: {} } } }, '2026-11-15').mode, 'open', '옛 판으로 이번 주 여행을 끝냈어도 열린다');
});
function fixedRoute() {
  const r = makeRoute(ZONES.map((z, i) => candsOf(i)), () => 0.3, ['🧢']);
  assert.ok(r);
  return r;
}
function fixedEvents() { return makeEvents(fixedRoute(), ZONES.map((z, i) => candsOf(i)), () => 0.3); }
function candsOf(i) {
  const lists = [[74, 75, 76, 27, 28, 95, 111, 112], [1, 2, 10, 11, 43, 44, 69, 70], [7, 8, 54, 55, 60, 61, 72, 73], [4, 5, 37, 38, 58, 59, 77, 78], [16, 17, 21, 22, 41, 42, 83, 84], [63, 64, 96, 97, 79, 80, 35, 36]];
  return lists[i].map((id) => ({ id, caught: false, rarity: 1 }));
}

test('🚚 떠나기 — 6마리 · 손님 셋 · 이벤트 여섯 · 틀리면 안 떠남 · 두 번 못 떠남 · 11/14 전엔 못 떠남', () => {
  assert.equal(moveStartRule(prof(), req(), NOW - DAY).why, 'wait');
  assert.equal(moveStartRule(prof(), req({ id: 'x' }), NOW).why, 'id');
  assert.equal(moveStartRule(prof(), req({ party: [66, 25] }), NOW).why, 'party');
  assert.equal(moveStartRule(prof(), req({ party: [66, 25, 7, 1, 4, 150] }), NOW).why, 'party', '안 데리고 있는 포켓몬');
  assert.equal(moveStartRule(prof(), req({ guests: [16, 16, 21] }), NOW).why, 'guests');
  assert.equal(moveStartRule(prof(), req({ guests: [16, 19] }), NOW).why, 'guests');
  assert.equal(moveStartRule(prof(), req({ ev: evs().slice(1) }), NOW).why, 'ev');
  assert.equal(moveStartRule(prof(), req({ ev: [{ k: 'fork', alt: 16, g: 0 }, ...evs().slice(1)] }), NOW).why, 'ev', '🔀 다른 손님이 이미 손님이면');
  const p = started();
  const m = cur(p);
  assert.deepEqual([m.at, m.hp, m.phase, m.qn], [0, MOVE.hp.job, 'go', 0]);
  assert.equal(moveStartRule(p, req(), NOW).why, 'going');
  const few = prof({ caught: { 66: 1, 25: 1 } });
  assert.equal(moveStartRule(few, req({ party: [66, 25] }), NOW).ok, true, '포켓몬이 적으면 있는 만큼');
});

// ───────────── 답 ─────────────

test('✏️ 맞히면 일이 줄고 타입이 맞으면 두 배 · 틀려도 잃는 것 없이 다음 문제로', () => {
  const p = started();
  passEvent(p);
  const coins = p.coins;
  let m = cur(p);
  const wrong = moveAnswerRule(p, { id: m.id, qn: m.qn, mon: 25, subj: 'math', correct: false }, NOW, subjOf);
  assert.deepEqual([wrong.ok, wrong.correct, wrong.hit, wrong.finished, wrong.end], [true, false, 0, false, null]);
  m = cur(p);
  assert.deepEqual([m.at, m.hp, p.coins], [0, MOVE.hp.job, coins], '그대로');
  assert.equal(m.qn, 2, '다음 문제');
  assert.deepEqual(m.q.math, [1, 2], '🎁 상자 하나 + 틀린 답 하나');
  const one = moveAnswerRule(p, { id: m.id, qn: m.qn, mon: 25, subj: 'math', correct: true }, NOW, subjOf);
  assert.deepEqual([one.hit, one.adv, one.finished], [1, false, false]);
  m = cur(p);
  assert.equal(m.hp, 1);
  const two = moveAnswerRule(p, { id: m.id, qn: m.qn, mon: 66, subj: 'korean', correct: true }, NOW, subjOf);
  assert.deepEqual([two.hit, two.adv, two.finished, two.at], [2, true, true, 1], '격투는 짐 싸기에서 두 배 · 남은 양보다 많아도 넘치지 않는다');
  assert.equal(cur(p).hp, MOVE.hp.job);
  assert.deepEqual(cur(p).q, { math: [2, 3], korean: [1, 1] });
});

test('🍙 새참은 단계가 끝나는 답에서만 — 단계 안의 일은 아니고 · 마지막 끝도 아니다', () => {
  const p = started();
  passEvent(p);
  const seen = [];
  for (let i = 0; i < 40 && cur(p).at < 3; i++) {
    const m = cur(p);
    const r = moveAnswerRule(p, { id: m.id, qn: m.qn, mon: 66, subj: 'math', correct: true }, NOW, subjOf);
    if (r.finished) seen.push(r.stageDone);
  }
  assert.deepEqual(seen, [false, false, true]);
});

test('✏️ 옛 문제·다른 이사·이벤트 앞·없는 포켓몬·없는 과목은 받지 않는다', () => {
  const p = started();
  const m0 = cur(p);
  assert.equal(moveAnswerRule(p, { id: m0.id, qn: m0.qn, mon: 66, subj: 'math', correct: true }, NOW, subjOf).why, 'event', '이벤트가 먼저');
  passEvent(p);
  const m = cur(p);
  assert.equal(moveAnswerRule(p, { id: m.id, qn: m.qn - 1, mon: 66, subj: 'math', correct: true }, NOW, subjOf).why, 'changed', '다른 창에 남은 옛 문제');
  assert.equal(moveAnswerRule(p, { id: 'zzzzzz', qn: m.qn, mon: 66, subj: 'math', correct: true }, NOW, subjOf).why, 'changed');
  assert.equal(moveAnswerRule(p, { id: m.id, qn: m.qn, mon: 150, subj: 'math', correct: true }, NOW, subjOf).why, 'mon');
  assert.equal(moveAnswerRule(p, { id: m.id, qn: m.qn, mon: 66, subj: 'art', correct: true }, NOW, subjOf).why, 'subj');
  assert.equal(cur(p).qn, m.qn, '받지 않으면 그대로');
});

test('🔄 다른 문제 — 일마다 한 번 · 다음 일에서 다시', () => {
  const p = started();
  passEvent(p);
  let m = cur(p);
  assert.equal(moveSwapRule(p, { id: m.id, qn: m.qn }).ok, true);
  m = cur(p);
  assert.deepEqual([m.qv, m.swap], [1, 0]);
  assert.equal(moveSwapRule(p, { id: m.id, qn: m.qn }).why, 'used');
  moveAnswerRule(p, { id: m.id, qn: m.qn, mon: 66, subj: 'math', correct: true }, NOW, subjOf);
  m = cur(p);
  assert.equal(m.at, 1);
  assert.equal(moveSwapRule(p, { id: m.id, qn: m.qn }).ok, true);
  const p2 = started();
  assert.equal(moveSwapRule(p2, { id: cur(p2).id, qn: cur(p2).qn }).why, 'event');
});

test('🎁🔬🔀 이벤트 — 상자·박사는 맞히면 💰 · 틀려도 잃지 않음 · 갈림길은 손님을 바꾼다 · 차례가 아니면 안 받음', () => {
  const p = started();
  let m = cur(p);
  assert.equal(pendingEvent(m), 0);
  assert.equal(moveEventRule(p, { id: m.id, qn: m.qn, kind: 'prof', correct: true }).why, 'changed', '종류가 다르면');
  assert.equal(moveEventRule(p, { id: m.id, qn: m.qn, kind: 'chest', subj: 'x', correct: true }).why, 'subj');
  const c0 = p.coins;
  const a = moveEventRule(p, { id: m.id, qn: m.qn, kind: 'chest', subj: 'math', correct: true });
  assert.deepEqual([a.coins, p.coins, p.coinsEarned], [JOURNEY.chestCoins, c0 + JOURNEY.chestCoins, JOURNEY.chestCoins]);
  m = cur(p);
  assert.equal(pendingEvent(m), -1, '한 번만');
  assert.deepEqual(m.q.math, [1, 1]);
  assert.equal(moveEventRule(p, { id: m.id, qn: m.qn, kind: 'chest', subj: 'math', correct: true }).why, 'changed');
  // 다음 단계까지 — 🔬 틀림
  for (let i = 0; i < 40 && cur(p).at < 3; i++) { const x = cur(p); moveAnswerRule(p, { id: x.id, qn: x.qn, mon: 66, subj: 'math', correct: true }, NOW, subjOf); }
  m = cur(p);
  assert.equal(pendingEvent(m), 1);
  const coins = p.coins;
  const b = moveEventRule(p, { id: m.id, qn: m.qn, kind: 'prof', correct: false });
  assert.deepEqual([b.correct, b.coins, p.coins], [false, 0, coins], '틀려도 그대로');
  assert.deepEqual(cur(p).pf, [0, 1]);
  for (let i = 0; i < 40 && cur(p).at < 6; i++) { const x = cur(p); moveAnswerRule(p, { id: x.id, qn: x.qn, mon: 25, subj: 'math', correct: true }, NOW, subjOf); }
  m = cur(p);
  assert.equal(pendingEvent(m), 2);
  assert.equal(moveEventRule(p, { id: m.id, qn: m.qn, kind: 'fork', pick: 150 }).why, 'mon');
  moveEventRule(p, { id: m.id, qn: m.qn, kind: 'fork', pick: 23 });
  assert.deepEqual(cur(p).guests, [23, 19, 21], '손님이 바뀐다');
  assert.equal(cur(p).ev[2].alt, 16, '다른 쪽은 남는다');
  const q = started();
  const n = cur(q);
  const sk = moveEventRule(q, { id: n.id, qn: n.qn, kind: 'chest', skip: true });
  assert.deepEqual([sk.ok, sk.coins], [true, 0]);
  assert.deepEqual(cur(q).q, {}, '문제를 못 만들면 셈 없이');
});

// ───────────── 끝 ─────────────

test('🏠 끝까지 가면 보상은 한 번 — 💰·스톤·Lv +1 · 넓히기 + 2층 무료 · 그 주 대여행 자리를 채운다', () => {
  const p = finish(started());
  const m = cur(p);
  const events = 2 * JOURNEY.chestCoins + 2 * JOURNEY.profCoins;
  assert.equal(p.coins, 100 + JOURNEY.coins + events);
  assert.equal(p.coinsEarned, JOURNEY.coins + events);
  for (const s of STONES) assert.ok(p.items[s.id] >= 1, s.id);
  assert.equal(m.lv.length + m.sub.length, PARTY.length, '6마리 모두');
  for (const id of HOUSE_GIFT) assert.equal(p.items[id], 1);
  const sh = houseShape(p);
  assert.deepEqual(sh.rooms, [FIRST_ROOM, SECOND_ROOM]);
  assert.deepEqual(sh.size, ROOM_WIDE);
  const week = weekOf('2026-11-14');
  const j = journeyOf(p.journey);
  assert.equal(j.done[week].r, 'won');
  assert.equal(j.done[week].mv, 1);
  assert.equal(stateOf(p.journey, '2026-11-14').mode, 'done', '그 주 여행은 다시 안 열린다');
  assert.equal(startRule(p, { id: 'aaa111', party: PARTY, route: fixedRoute(), ev: fixedEvents() }, NOW).why, 'done');
  assert.equal(stateOf(p.journey, '2026-11-21').mode, 'open', '다음 토요일부터 평소대로');
  assert.match(rowText(journeyRows(p.journey)[0]), /🚚 이사 대작전 끝/);
  // 다시 답해도 안 받는다
  const coins = p.coins;
  const r = moveAnswerRule(p, { id: m.id, qn: m.qn, mon: 66, subj: 'math', correct: true }, NOW, subjOf);
  assert.equal(r.why, 'changed');
  assert.equal(p.coins, coins);
});

test('🏠 이미 산 넓히기는 두 개가 되지 않는다 · 이사 여러 날 뒤 끝나면 끝난 주가 채워진다 · 이미 끝낸 주는 안 덮는다', () => {
  const p = finish(started(prof({ items: { x_wide: 1 } })));
  assert.equal(p.items.x_wide, 1);
  assert.equal(p.items.x_floor2, 1);
  const q = started();
  q.journey = { ...journeyOf(q.journey), done: { '2026-11-14': { r: 'home', at: 1, q: {} } } };
  finish(q);
  assert.equal(journeyOf(q.journey).done['2026-11-14'].r, 'home', '옛 기록 그대로');
  assert.equal(journeyOf(q.journey).done['2026-11-14'].mv, 1, '끝낸 흔적은 남긴다');
  const w = started();
  for (let i = 0; i < 400 && cur(w).phase === 'go'; i++) {
    const m = cur(w);
    if (pendingEvent(m) >= 0) { passEvent(w); continue; }
    moveAnswerRule(w, { id: m.id, qn: m.qn, mon: 66, subj: 'math', correct: true }, NOW + 8 * DAY, subjOf);
  }
  assert.ok(journeyOf(w.journey).done['2026-11-21'], '끝낸 주');
  assert.equal(cur(w).week, '2026-11-21');
});

test('🖌️ 벽지·바닥 — 고른 것을 가방에 넣고 모든 방에 · 그대로도 된다 · 차례가 아니면 안 받음', () => {
  const p = finish(started());
  const m = cur(p);
  assert.equal(moveGiftRule(p, { id: m.id, wall: 'fl_tile', floor: '' }).why, 'paint', '바닥을 벽에');
  assert.equal(moveGiftRule(p, { id: m.id, wall: 'nope', floor: '' }).why, 'paint');
  assert.equal(moveGiftRule(p, { id: 'zzzzzz', wall: '', floor: '' }).why, 'changed');
  const wall = PAINT.find((x) => x.part === 'wall').id;
  const floor = PAINT.find((x) => x.part === 'floor').id;
  assert.equal(moveGiftRule(p, { id: m.id, wall, floor }).ok, true);
  assert.deepEqual([p.items[wall], p.items[floor]], [1, 1]);
  const h = houseOf(p);
  assert.equal(h.rooms.length, 2);
  for (const r of h.rooms) assert.deepEqual([r.wall, r.floor], [wall, floor]);
  assert.equal(cur(p).phase, 'pick');
  assert.equal(moveGiftRule(p, { id: m.id, wall, floor }).why, 'changed', '한 번만');
  const q = finish(started());
  assert.equal(moveGiftRule(q, { id: cur(q).id, wall: '', floor: '' }).ok, true);
  assert.deepEqual(houseOf(q).rooms.map((r) => r.wall), ['', '']);
  assert.equal(moveGiftRule(started(), { id: 'abc123def456', wall: '', floor: '' }).why, 'changed', '끝나기 전엔');
});

test('🎉 손님 하나 — 손님만 · 처음이면 first · 끝난 주에 적힘 · 한 번만', () => {
  const p = finish(started());
  const m = cur(p);
  moveGiftRule(p, { id: m.id, wall: '', floor: '' });
  const g = cur(p).guests;
  assert.equal(movePickRule(p, { id: m.id, mon: 150 }).why, 'mon');
  const r = movePickRule(p, { id: m.id, mon: g[1] });
  assert.deepEqual([r.ok, r.mon, r.first], [true, g[1], true]);
  assert.equal(p.caught[g[1]], 1);
  assert.equal(journeyOf(p.journey).done['2026-11-14'].pick, g[1]);
  assert.equal(cur(p).phase, 'furn');
  assert.equal(movePickRule(p, { id: m.id, mon: g[0] }).why, 'changed');
  assert.equal(p.caught[g[0]] || 0, 0);
});

test('📦 2층까지 있던 집 — 두 층 가구가 모두 서랍으로', () => {
  const p = prof({ items: { x_wide: 1, x_floor2: 1, f_bed: 1, f_sofa: 1 } });
  p.house = { started: true, seq: 0, rooms: [{ id: FIRST_ROOM, wall: '', floor: '', items: [] }, { id: SECOND_ROOM, wall: '', floor: '', items: [] }] };
  assert.equal(placeRule(p, FIRST_ROOM, 'f_bed', 0, 0).ok, true);
  assert.equal(placeRule(p, SECOND_ROOM, 'f_sofa', 2, 2).ok, true);
  finish(started(p));
  const id = cur(p).id;
  moveGiftRule(p, { id, wall: '', floor: '' });
  movePickRule(p, { id, mon: cur(p).guests[0] });
  moveFurnRule(p, { id, how: 'fresh' });
  assert.deepEqual(houseOf(p).rooms.map((r) => r.items.length), [0, 0]);
  assert.deepEqual([p.items.f_bed, p.items.f_sofa, p.items.x_wide, p.items.x_floor2], [1, 1, 1, 1]);
});

test('📦 가구 — 새로 놓기는 서랍으로(가방은 그대로) · 쉬는 캡슐은 자리에 · 그대로 두기는 자리 그대로', () => {
  const setup = () => {
    const p = prof({ items: { f_bed: 1, f_sofa: 1, f_heal: 1 } });
    p.house = { started: true, seq: 0, rooms: [{ id: FIRST_ROOM, wall: '', floor: '', items: [] }] };
    assert.equal(placeRule(p, FIRST_ROOM, 'f_bed', 0, 0).ok, true);
    assert.equal(placeRule(p, FIRST_ROOM, 'f_sofa', 0, 2).ok, true);
    assert.equal(placeRule(p, FIRST_ROOM, 'f_heal', 0, 4).ok, true);
    const h = houseOf(p);
    h.rooms[0].items[2].rest = { id: 'rest1', mon: 25, at: NOW, luck: '' };
    p.house = h;
    finish(started(p));
    const m = cur(p);
    moveGiftRule(p, { id: m.id, wall: '', floor: '' });
    movePickRule(p, { id: m.id, mon: cur(p).guests[0] });
    return p;
  };
  const a = setup();
  assert.equal(moveFurnRule(a, { id: cur(a).id, how: 'nope' }).why, 'how');
  assert.equal(moveFurnRule(a, { id: cur(a).id, how: 'fresh' }).ok, true);
  assert.deepEqual(houseOf(a).rooms[0].items.map((i) => i.id), ['f_heal'], '쉬는 캡슐만 남는다');
  assert.deepEqual([a.items.f_bed, a.items.f_sofa, a.items.f_heal], [1, 1, 1], '가구는 하나도 안 줄어든다');
  assert.equal(cur(a).phase, 'last');
  const b = setup();
  assert.equal(moveFurnRule(b, { id: cur(b).id, how: 'keep' }).ok, true);
  assert.equal(houseOf(b).rooms[0].items.length, 3, '자리 그대로');
  assert.equal(houseOf(b).rooms[1].items.length, 0);
});

test('✍️ 끝 — 한 줄 쓰기는 안 써도 되고 끝을 지킨다 · 카드는 평소 대여행으로 · 📤에만 글', () => {
  const p = finish(started());
  const id = cur(p).id;
  moveGiftRule(p, { id, wall: '', floor: '' });
  movePickRule(p, { id, mon: cur(p).guests[0] });
  moveFurnRule(p, { id, how: 'keep' });
  assert.equal(moveState(p.journey, '2026-11-14').mode, 'last');
  assert.equal(moveOnCard(moveState(p.journey, '2026-11-14')), true, '끝낼 때까지 이사 카드');
  assert.equal(moveEndRule(p, { id, old: `  ${'가'.repeat(200)}  `, fav: '' }, NOW).ok, true);
  const m = cur(p);
  assert.equal(m.old.length, MOVE.noteMax);
  assert.equal(m.fav, '');
  assert.equal(moveState(p.journey, '2026-11-14').mode, 'end');
  assert.equal(moveOnCard(moveState(p.journey, '2026-11-21')), false);
  assert.equal(moveEndRule(p, { id, old: '다시', fav: '' }, NOW).why, 'changed');
  const md = moveMd(p.journey);
  assert.match(md, /## 🚚 이사 대작전/);
  assert.match(md, /옛집에서 제일 좋았던 것/);
  assert.doesNotMatch(md, /새 집에서 제일 좋은 곳/, '안 쓴 줄은 없다');
  assert.equal(moveMd({}), '');
  const go = started();
  assert.match(moveMd(go.journey), /지금 짐 싸기/);
  assert.doesNotMatch(moveMd(go.journey), /벽지/, '끝나기 전엔 고른 것 줄이 없다');
});

test('🐾 끝난 뒤 7일 손님 집들이 말 · 그 뒤엔 없음 · 끝나기 전엔 없음', () => {
  const p = finish(started());
  const id = cur(p).id;
  assert.equal(moveHello(p.journey, NOW), '');
  moveGiftRule(p, { id, wall: '', floor: '' });
  movePickRule(p, { id, mon: cur(p).guests[0] });
  moveFurnRule(p, { id, how: 'keep' });
  moveEndRule(p, { id, old: '', fav: '' }, NOW);
  assert.ok(moveHello(p.journey, NOW + DAY));
  assert.ok(moveHello(p.journey, NOW + 7 * DAY - 1));
  assert.equal(moveHello(p.journey, NOW + 7 * DAY), '');
  assert.equal(moveHello(p.journey, NOW - DAY), '', '시계가 뒤로');
});

// ───────────── 기록 ─────────────

test('💾 저장값 — 깨진 값은 null · 복사는 따로 · 평소 대여행 기록은 move 칸 없이 예전 꼴', () => {
  const p = started();
  const raw = journeyOf(p.journey).move;
  assert.ok(moveOf(raw));
  for (const bad of [null, 3, {}, { ...raw, id: 'x' }, { ...raw, phase: 'nope' }, { ...raw, party: [] }, { ...raw, guests: [16, 16, 16] }, { ...raw, at: 99 }, { ...raw, hp: 99 }, { ...raw, hp: 0 }, { ...raw, ev: [] }, { ...raw, phase: 'gift' }]) assert.equal(moveOf(bad), null, JSON.stringify(bad).slice(0, 60));
  assert.deepEqual(journeyOf({}), { cur: null, done: {} }, 'move 칸은 있을 때만');
  const c = copyJourney(p.journey);
  c.move.at = 5;
  assert.equal(journeyOf(p.journey).move.at, 0, '복사는 따로');
  const m = moveOf({ ...raw, old: 3, fav: { x: 1 }, furn: 'x', pick: 'abc' });
  assert.deepEqual([m.old, m.fav, m.furn, m.pick], ['', '', '', 0]);
});

test('💾 병합 — 더 나아간 쪽 · 옛 백업이 끝난 이사를 되돌려 보상을 또 받지 않는다 · 한쪽만 있어도', () => {
  const a = started();
  const b = finish(started());
  const ja = a.journey;
  const jb = b.journey;
  assert.equal(moveOf(mergeJourney(ja, jb).move).phase, 'gift', '최근이 옛것이어도');
  assert.equal(moveOf(mergeJourney(jb, ja).move).phase, 'gift');
  assert.equal(moveOf(mergeJourney(ja, {}).move).phase, 'go');
  assert.equal(moveOf(mergeJourney({}, ja).move).phase, 'go');
  assert.equal(mergeJourney({ done: {} }, {}).move, undefined);
  const far = started();
  passEvent(far);
  moveAnswerRule(far, { id: cur(far).id, qn: cur(far).qn, mon: 66, subj: 'math', correct: true }, NOW, subjOf);
  assert.equal(moveOf(mergeJourney(ja, far.journey).move).at, 1, '같은 단계면 더 간 쪽');
});

test('🏠 옛 백업이 가방을 되돌려도 다음 단계에서 집 선물을 다시 채운다', () => {
  const p = finish(started());
  const id = cur(p).id;
  delete p.items.x_wide;
  delete p.items.x_floor2;
  moveGiftRule(p, { id, wall: '', floor: '' });
  assert.deepEqual(HOUSE_GIFT.map((k) => p.items[k]), [1, 1]);
  delete p.items.x_floor2;
  movePickRule(p, { id, mon: cur(p).guests[0] });
  assert.equal(p.items.x_floor2, 1);
  delete p.items.x_floor2;
  moveFurnRule(p, { id, how: 'keep' });
  assert.equal(p.items.x_floor2, 1);
  delete p.items.x_floor2;
  moveEndRule(p, { id, old: '', fav: '' }, NOW);
  assert.equal(p.items.x_floor2, 1);
});

test('🚫 이사가 자리에 있으면 주 여행을 못 떠난다 — 오래 켜 둔 다른 창 · 다음 주가 되어도 · 끝나면 다시 (Codex 200차 #1)', () => {
  const p = prof();
  assert.equal(moveBlocksTrip(p, NOW - DAY), false, '열리기 전');
  assert.equal(moveBlocksTrip(p, NOW), true, '열렸고 아직 안 떠남');
  started(p);
  assert.equal(moveBlocksTrip(p, NOW), true, '이사 중');
  assert.equal(moveBlocksTrip(p, NOW + 14 * DAY), true, '주가 바뀌어도');
  finish(p);
  assert.equal(moveBlocksTrip(p, NOW), true, '끝 단계가 남았으면');
  const id = cur(p).id;
  moveGiftRule(p, { id, wall: '', floor: '' });
  movePickRule(p, { id, mon: cur(p).guests[0] });
  moveFurnRule(p, { id, how: 'keep' });
  moveEndRule(p, { id, old: '', fav: '' }, NOW);
  assert.equal(moveBlocksTrip(p, NOW + 7 * DAY), false, '끝나면 평소대로');
  assert.ok(read('js/journeyview.js').includes("if (r.why === 'move') { closeJourney(); return; }"), '창을 닫으면 카드가 바뀐다');
});

test('🛟 깨진 기록 — 멀쩡한 쪽을 못 밀어내고 · 끝낸 흔적이 있으면 다시 안 열린다 (Codex 200차 #3)', () => {
  const p = finish(started());
  const id = cur(p).id;
  moveGiftRule(p, { id, wall: '', floor: '' });
  movePickRule(p, { id, mon: cur(p).guests[0] });
  moveFurnRule(p, { id, how: 'keep' });
  moveEndRule(p, { id, old: '', fav: '' }, NOW);
  const good = journeyOf(p.journey);
  const broken = { ...good, move: { ...good.move, ev: undefined } };
  assert.equal(moveOf(mergeJourney(broken, good).move).phase, 'end', '최근이 깨졌어도');
  assert.equal(moveOf(mergeJourney(good, broken).move).phase, 'end');
  const lost = { ...p, journey: { done: good.done, move: { id: 'x' } } };
  assert.equal(moveState(lost.journey, '2026-11-21').mode, 'end', '끝낸 흔적');
  assert.equal(moveOnCard(moveState(lost.journey, '2026-11-21')), false);
  const coins = lost.coins;
  assert.equal(moveStartRule(lost, req({ id: 'again1234' }), NOW + 7 * DAY).why, 'going', '다시 못 떠난다');
  assert.equal(lost.coins, coins);
});

test('🏠 갈라진 백업 — 끝낸 기록과 가방이 갈려도 집 선물만 되찾는다 · 코인은 다시 안 준다 (Codex 200차 #2)', () => {
  const done = finish(started());
  const id = cur(done).id;
  moveGiftRule(done, { id, wall: '', floor: '' });
  movePickRule(done, { id, mon: cur(done).guests[0] });
  moveFurnRule(done, { id, how: 'keep' });
  moveEndRule(done, { id, old: '', fav: '' }, NOW);
  const newer = { id: 'me', updatedAt: 9e12, coins: 7, xp: 1, items: { potion: 1 }, caught: { 66: 1 }, mons: {} };
  const older = { ...done, id: 'me', updatedAt: 1, xp: 0 };
  const m = mergeStatRecord('profile', newer, older);
  assert.equal(moveOf(journeyOf(m.journey).move).phase, 'end');
  assert.deepEqual(HOUSE_GIFT.map((k) => m.items[k]), [1, 1], '집 선물');
  assert.equal(m.coins, 7, '코인은 최근 쪽 그대로');
  const q = { items: {}, journey: started().journey };
  healMoveHouse(q);
  assert.deepEqual(q.items, {}, '끝나기 전엔 안 준다');
});

// ───────────── 만들기 ─────────────

test('🎉 손님·이벤트 만들기 — 손님 셋은 서로 다름 · 후보가 모자라면 null · 🔀 후보가 없으면 🎁 · 만든 대로 떠날 수 있다', () => {
  const cands = [16, 17, 19, 20, 21, 22, 23, 24, 27, 28].map((id) => ({ id, caught: false, rarity: 1 }));
  for (let s = 1; s < 200; s++) {
    let x = s;
    const rng = () => { x = (x * 16807) % 2147483647; return x / 2147483647; };
    const g = makeGuests(cands, rng);
    assert.equal(new Set(g).size, GUESTS);
    const ev = makeMoveEvents(g, cands, rng);
    assert.equal(ev.length, 6);
    const p = prof();
    assert.equal(moveStartRule(p, req({ guests: g, ev }), NOW).ok, true, JSON.stringify(ev));
    const forks = ev.filter((e) => e.k === 'fork');
    assert.deepEqual(forks.map((e) => e.g), forks.map((_, i) => i), '🔀마다 다른 손님 자리');
    assert.equal(new Set(forks.map((e) => e.alt)).size, forks.length);
  }
  assert.equal(makeGuests(cands.slice(0, 2)), null);
  const three = cands.slice(0, 3);
  const g = makeGuests(three, () => 0.5);
  assert.deepEqual(makeMoveEvents(g, three, () => 0.5).filter((e) => e.k === 'fork'), [], '다른 손님이 없으면 🔀 없음');
});

test('❓ 문제 고르기 — 대여행과 같은 차례 · 그 과목에서 못 만들면 다른 과목 · 아무것도 없으면 null', () => {
  const src = {
    math: { keys: ['a', 'b'], make: (k) => ({ id: k, q: k, choices: [{ text: '1', ok: true }, { text: '2', ok: false }] }) },
    english: { keys: ['x'], make: () => null },
  };
  const c = { at: 1, id: 'abc123', q: {}, qv: 0, qn: 0 };
  assert.equal(questionFrom(src, c).subj, 'math', '영어를 못 만들면 수학');
  assert.equal(questionFrom({}, c), null);
  assert.equal(questionFrom(null, c), null);
  assert.equal(questionFrom({ math: { keys: ['a'], make: () => ({ choices: [{ ok: false }, { ok: false }] }) } }, c), null, '정답이 없는 문제는 안 낸다');
  assert.ok(read('js/journeyview.js').includes('return questionFrom(ui.src, c, shift);'), '대여행도 같은 함수');
});

// ───────────── 진짜 저장 ─────────────

before(async () => { console.warn = () => {}; await initProfile(); });

test('💾 진짜 트랜잭션 — 같은 문제에 두 번 눌러도 한 번만 받는다 · 저장이 안 되면 그대로', async (t) => {
  const real = Date.now;
  Date.now = () => NOW;
  t.after(() => { Date.now = real; });
  const stored = fakeIdb.get('profile', 'me') || { id: 'me', xp: 0, coins: 0, items: {}, caught: {}, mons: {} };
  fakeIdb.put('profile', { ...stored, caught: Object.fromEntries(PARTY.map((id) => [id, 1])), mons: {} });
  await initProfile();
  await flushProfile(); // 파트너를 정하는 저장이 실패를 쓰지 않게
  fakeIdb.failNext('profile');
  const no = await moveStart(req());
  assert.equal(no.ok, false, '저장 실패');
  assert.equal(moveState(journeyRaw(), '2026-11-14').mode, 'open');
  const r = await moveStart(req());
  assert.equal(r.ok, true, JSON.stringify(r));
  await flushProfile();
  const m = moveOf(journeyOf(fakeIdb.get('profile', 'me').journey).move);
  const ev = m.ev[0];
  assert.equal(ev.k, 'chest');
  const { moveEvent } = await import('../js/xp.js');
  assert.equal((await moveEvent({ id: m.id, qn: m.qn, kind: 'chest', subj: 'math', correct: true })).ok, true);
  const qn = moveOf(journeyOf(fakeIdb.get('profile', 'me').journey).move).qn;
  const [a, b] = await Promise.all([moveAnswer({ id: m.id, qn, mon: 25, subj: 'math', correct: true }), moveAnswer({ id: m.id, qn, mon: 25, subj: 'math', correct: true })]);
  assert.deepEqual([a.ok, b.ok, b.why], [true, false, 'changed']);
  assert.equal(moveOf(journeyOf(fakeIdb.get('profile', 'me').journey).move).hp, MOVE.hp.job - 1);
  assert.ok(getProfileSnapshot().journey.move, '메모리 프로필도');
});

test('💾 마지막 답 저장이 실패하면 아무것도 안 받고 · 다시 하면 한 번만 · 끝 단계도 두 번 눌러도 한 번', async (t) => {
  const real = Date.now;
  Date.now = () => NOW;
  t.after(() => { Date.now = real; });
  const stored = fakeIdb.get('profile', 'me');
  const near = { ...moveOf(journeyOf(stored.journey).move), at: MOVE_STOPS - 1, hp: 1, ev: evs().map((e) => ({ ...e, d: 1 })) };
  near.ev[2].alt = 23;
  fakeIdb.put('profile', { ...stored, coins: 1000, items: {}, journey: { ...journeyOf(stored.journey), move: near } });
  await initProfile();
  await flushProfile();
  const m = moveOf(journeyOf(journeyRaw()).move);
  assert.equal(m.at, MOVE_STOPS - 1);
  const ans = { id: m.id, qn: m.qn, mon: 66, subj: 'math', correct: true };
  fakeIdb.failNext('profile');
  const no = await moveAnswer(ans);
  assert.deepEqual([no.ok, no.why], [false, 'save']);
  assert.equal(fakeIdb.get('profile', 'me').coins, 1000, '실패하면 아무것도');
  assert.equal(moveState(journeyRaw(), '2026-11-14').mode, 'go');
  const [a, b] = await Promise.all([moveAnswer(ans), moveAnswer(ans)]);
  assert.deepEqual([a.ok, a.end, b.ok], [true, 'won', false]);
  assert.equal(fakeIdb.get('profile', 'me').coins, 1000 + JOURNEY.coins, '한 번만');
  const [g1, g2] = await Promise.all([moveGift({ id: m.id, wall: 'w_sky', floor: '' }), moveGift({ id: m.id, wall: 'w_pink', floor: '' })]);
  assert.deepEqual([g1.ok, g2.ok], [true, false]);
  assert.equal(fakeIdb.get('profile', 'me').items.w_pink, undefined);
  const mon = moveOf(journeyOf(journeyRaw()).move).guests[0];
  const before = fakeIdb.get('profile', 'me').caught[mon] || 0;
  const [p1, p2] = await Promise.all([movePick({ id: m.id, mon }), movePick({ id: m.id, mon })]);
  assert.deepEqual([p1.ok, p2.ok], [true, false]);
  assert.equal(fakeIdb.get('profile', 'me').caught[mon], before + 1);
  assert.equal((await moveFurn({ id: m.id, how: 'keep' })).ok, true);
  fakeIdb.failNext('profile');
  assert.equal((await moveEnd({ id: m.id, old: 'a', fav: '' })).ok, false);
  assert.equal((await moveEnd({ id: m.id, old: 'a', fav: '' })).ok, true);
  assert.equal(moveState(journeyRaw(), '2026-11-14').mode, 'end');
});

test('💾 이사 중에 주 여행 출발을 보내면 저장소가 막는다', async (t) => {
  const real = Date.now;
  Date.now = () => NOW;
  t.after(() => { Date.now = real; });
  const stored = fakeIdb.get('profile', 'me');
  fakeIdb.put('profile', { ...stored, journey: { ...journeyOf(stored.journey), done: {}, move: { ...moveOf(journeyOf(started().journey).move) } } });
  await initProfile();
  await flushProfile();
  const r = await journeyStart({ id: 'wk123456', party: PARTY, route: fixedRoute(), ev: fixedEvents() });
  assert.deepEqual([r.ok, r.why], [false, 'move']);
});

// ───────────── 그림 · 배선 ─────────────

test('🎨 장면 — 일곱 장을 오류 없이 · 칸 비율이 달라도 · 없는 이름도', () => {
  const calls = { n: 0 };
  const ctx = new Proxy({}, {
    get(o, k) { if (k in o) return o[k]; if (k === 'createLinearGradient') return () => ({ addColorStop() {} }); return () => { calls.n++; }; },
    set(o, k, v) { o[k] = v; return true; },
  });
  assert.deepEqual(MOVE_SCENES, ['pack', 'bye', 'road', 'clean', 'unpack', 'party', 'night']);
  for (const k of [...MOVE_SCENES, 'nope']) for (const [w, h] of [[640, 320], [300, 300], [1000, 200]]) for (const t of [0, 3.3, 9999]) paintMove(ctx, w, h, t, k);
  assert.ok(calls.n > 500);
  for (const s of STAGES) assert.ok(MOVE_SCENES.includes(s.key), s.key);
});

test('💾 깨진 보상 줄은 버린다 — 보상 화면이 멈추지 않게 · 글 칸이 다 있다', () => {
  const p = finish(started());
  const m = moveOf({ ...journeyOf(p.journey).move, lv: [null, 3, [66, 1, 2]], sub: 'x' });
  assert.deepEqual([m.lv, m.sub], [[[66, 1, 2]], []]);
  for (const s of STAGES) assert.ok(s.short && s.arrive && s.emoji, s.key);
  for (const s of STAGES.slice(0, 5)) assert.ok(s.fin, s.key);
  assert.ok(!/[!?]/.test(STAGES.map((s) => s.short).join('')), '이어 붙이는 짧은 이름');
});

test('📱 고르는 칸이 눌리지 않는다 — 대여행과 이사가 같이 쓰는 몸통', () => {
  assert.match(read('css/style.css'), /\.jr-body \{[^}]*grid-auto-rows: max-content;/);
});

test('🔗 배선 — 앱 셸 · 다른 창 목록 · 음악 · 사용 기록 · 📤 · 홈 카드 · 🐾 말', () => {
  const sw = read('sw.js');
  for (const f of ['./js/moveday.js', './js/moveview.js', './js/movescene.js']) assert.ok(sw.includes(`'${f}'`), f);
  for (const f of ['js/hatch.js', 'js/parcel.js', 'js/korbattleview.js']) assert.match(read(f), /'mv-trip', 'jr-trip', 'lk-lake', 'lk-dex', 'lk-gear', 'aq-tank'\]/, f);
  assert.match(read('js/usage.js'), /\{ place: 'journey', ids: \['mv-trip'\] \}/);
  assert.match(read('js/calm.js'), /const TRIP_IDS = \['jr-trip', 'mv-trip'\];/);
  assert.match(read('js/calm.js'), /st\.trip && TRIP_IDS\.includes\(id\)/);
  assert.match(read('js/moveview.js'), /root\.id = 'mv-trip';/);
  assert.match(read('js/journeyview.js'), /if \(moveOnCard\(moveState\(journeyRaw\(\), todayKey\(\)\)\)\) \{ import\('\.\/moveview\.js'\)\.then\(\(m\) => m\.mountMoveCard\(b\)\)/);
  assert.match(read('js/upload.js'), /mv\.moveMd\(p\.journey, ko\)/);
  assert.match(read('js/houseview.js'), /moveHello\(getProfileSnapshot\(\)\.journey, Date\.now\(\)\)/);
  assert.match(read('js/stats.js'), /moveMd\(jRaw, monKo\)/, '📊에도');
  assert.ok(MOVE.openDay === '2026-11-14', '토요일');
  assert.equal(new Date(2026, 10, 14).getDay(), 6);
  assert.equal(weekOf(MOVE.openDay), MOVE.openDay);
});

test('🙅 아이 화면 — 남은 수·셈·❤️ 잃기 글이 없다 · 실제 집과 견주는 말이 없다 · 그림 파일 없음', () => {
  const v = read('js/moveview.js');
  const d = read('js/moveday.js');
  const said = (s) => [...s.matchAll(/'([^'\n]*)'|`([^`\n]*)`/g)].map((m) => m[1] || m[2] || '').filter((x) => /[가-힣]/.test(x));
  for (const line of [...said(v), ...STAGES.map((s) => s.arrive), ...STAGES.flatMap((s) => (s.jobs || []).map((j) => j.ko))]) {
    assert.doesNotMatch(line, /남은|몇 개|\d+ *\/ *\d+|\d+번째|❤️를 잃/, line);
    assert.doesNotMatch(line, /좁|비좁|작은 집|실제/, line);
  }
  assert.doesNotMatch(d + v, /좁아|실제 집|실제 이사/);
  assert.doesNotMatch(v + read('js/movescene.js'), /\.png|\.jpg|\.gif/);
});
