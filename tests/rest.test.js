// 💊 회복 캡슐 — 1단계 규칙·저장 (2026-10-10 아버님 설계안 "이대로 진행")
// 캡슐 한 대에 한 마리 · 1시간 · 다 쉬면 ❤️ 가득 + 💤 +10(100이면 레벨 +1) · 5% 레벨 · 0.5% 깜짝 진화 · 결과는 넣을 때 · 받은 휴식은 합집합
import { fakeIdb } from './fakeidb.js'; // ★ db.js·xp.js보다 먼저
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FURN, FIRST_ROOM, SECOND_ROOM, FURN_MAX, FURN_MAX_2F, MATH_RATE, HEAL, HEAL_MAX, furnById, furnMax, houseOf, houseBuyCheck, houseBuyRule, placeRule, moveRule, flipRule, storeRule, restsOf } from '../js/house.js';
import { REST_MS, REST_EXP, EXP_LV, LUCK, LUCK_COINS, CAP_KO, rollLuck, restLeft, expOf, restCount, rxOf, restStartRule, restCancelRule, restClaimRule } from '../js/rest.js';
import { lvOf, haveOf, evoOf, levelCapOf } from '../js/evolve.js';
import { emptyProfile, cloneProfile, mergeStatRecord, evolveRule, applyHouseRule } from '../js/db.js';
import { initProfile, flushProfile, reloadProfile, houseNow, restStart, restCancel, restClaim, getProfileSnapshot } from '../js/xp.js';

const R = FIRST_ROOM;
const SQUIRTLE = 7; // 꼬부기 → 어니부기(Lv5)
const WARTORTLE = 8;
const EEVEE = 133; // 갈래 여덟
const DITTO = 132; // 진화 없음
const T0 = 1_760_000_000_000;
const DONE = T0 + REST_MS;
const pf = (o = {}) => cloneProfile({ ...emptyProfile(), ...o });
/** 캡슐 하나(u 1)를 놓은 집 + 꼬부기 둘 */
function withCapsule(extra = {}) {
  const p = pf({
    coins: extra.coins || 0,
    items: { [HEAL]: 1, ...(extra.items || {}) },
    caught: { [SQUIRTLE]: 2, ...(extra.caught || {}) },
    mons: { ...(extra.mons || {}) },
    house: { started: true, seq: 1, rooms: [{ id: R, wall: '', floor: '', items: [{ u: 1, id: HEAL, x: 0, y: 0, f: 0 }] }] },
  });
  return p;
}
const capsule = (p, u = 1) => houseOf(p).rooms.flatMap((r) => r.items).find((i) => i.u === u);
const claim = (p, u, now, decide) => restClaimRule(p, u, now, decide, 100, evolveRule);

test('💊 캡슐 등록: 기기 · 두 칸 바닥 · 💰3,000 🔷10 🔶2(🔷는 MATH_RATE배) · 2대까지(2층이 있어도) · 이모지 💊', () => {
  const d = furnById(HEAL);
  assert.equal(HEAL, 'f_heal');
  assert.deepEqual([d.emoji, d.ko, d.w, d.at, d.group, d.price], ['💊', '회복 캡슐', 2, 'floor', 'device', 3000]);
  assert.deepEqual(d.stones, { stone_math: 2 * MATH_RATE, stone_english: 2 });
  assert.equal(HEAL_MAX, 2);
  assert.ok(FURN.includes(d));
  const rich = { coins: 999999, items: { stone_math: 999, stone_english: 999 }, house: { started: true, rooms: [] } };
  assert.equal(furnMax(pf(rich), HEAL), 2);
  assert.equal(furnMax(pf({ ...rich, items: { ...rich.items, x_wide: 1, x_floor2: 1 } }), HEAL), 2, '2층이 있어도 2대');
  assert.equal(furnMax(pf(rich), 'f_teddy'), FURN_MAX, '다른 가구는 그대로');
  assert.equal(furnMax(pf({ ...rich, items: { ...rich.items, x_wide: 1, x_floor2: 1 } }), 'f_teddy'), FURN_MAX_2F);
  const p = pf(rich);
  assert.deepEqual(houseBuyRule(p, HEAL), { ok: true });
  assert.deepEqual(houseBuyRule(p, HEAL), { ok: true });
  assert.deepEqual(houseBuyCheck(p, HEAL), { ok: false, why: 'max', have: 2 });
  assert.deepEqual([p.coins, p.items.stone_math, p.items.stone_english], [999999 - 6000, 999 - 20, 999 - 4]);
});

test('💊 rollLuck: 0.5% 깜짝 진화 · 5% 레벨 · 나머지 없음 — 경계와 비율(고른 점 20만 개) · 이상한 수는 없음', () => {
  assert.deepEqual([0, 0.00499, LUCK.evo, 0.0549, LUCK.evo + LUCK.lv, 0.5, 0.99999].map(rollLuck), ['evo', 'evo', 'lv', 'lv', '', '', '']);
  for (const bad of [-0.1, 1, 2, NaN, undefined, null, 'x', Infinity]) assert.equal(rollLuck(bad), '', String(bad));
  assert.deepEqual([LUCK.evo, LUCK.lv], [0.005, 0.05], '아버님 0.5% · 5%');
  assert.deepEqual([REST_MS, REST_EXP, EXP_LV, LUCK_COINS], [60 * 60 * 1000, 10, 100, 100], '아버님 1시간 · 💤 +10 · 100이면 레벨 · 대신 💰100');
  const N = 200000;
  const n = { evo: 0, lv: 0, '': 0 };
  for (let i = 0; i < N; i++) n[rollLuck((i + 0.5) / N)]++;
  assert.deepEqual(n, { evo: N * 0.005, lv: N * 0.05, '': N * 0.945 });
});

test('💊 넣기: 놓인 캡슐에 데리고 있는 포켓몬 한 마리 · 이미 쉬는 캡슐은 busy · 같은 종은 한 대에만(twice) · 없는 포켓몬 none · 캡슐이 아니면 gone · 결과는 넣을 때 정해 둔다', () => {
  const p = withCapsule({ items: { [HEAL]: 2 }, caught: { 25: 1 } });
  p.house.rooms[0].items.push({ u: 2, id: HEAL, x: 3, y: 0, f: 0 }, { u: 3, id: 'f_teddy', x: 6, y: 0, f: 0 });
  p.items.f_teddy = 1;
  p.house.seq = 3;
  assert.deepEqual(restStartRule(p, 9, SQUIRTLE, T0, ''), { ok: false, why: 'gone' }, '없는 번호');
  assert.deepEqual(restStartRule(p, 3, SQUIRTLE, T0, ''), { ok: false, why: 'gone' }, '캡슐이 아닌 가구');
  assert.deepEqual(restStartRule(p, 1, 151, T0, ''), { ok: false, why: 'none' }, '안 잡은 포켓몬');
  assert.deepEqual(restStartRule(p, 1, 0, T0, ''), { ok: false, why: 'none' });
  const r = restStartRule(p, 1, SQUIRTLE, T0, 'lv');
  assert.deepEqual(r, { ok: true, rest: { id: `${T0}:1:${SQUIRTLE}`, mon: SQUIRTLE, at: T0, luck: 'lv' } });
  assert.deepEqual(capsule(p).rest, r.rest, '집에 저장됨');
  assert.deepEqual(restStartRule(p, 1, 25, T0, ''), { ok: false, why: 'busy' }, '한 대에 한 마리');
  assert.deepEqual(restStartRule(p, 2, SQUIRTLE, T0, ''), { ok: false, why: 'twice' }, '같은 종은 한 대에만');
  assert.deepEqual(restStartRule(p, 2, 25, T0 + 5, 'nonsense'), { ok: true, rest: { id: `${T0 + 5}:2:25`, mon: 25, at: T0 + 5, luck: '' } }, '모르는 행운은 없음');
  // 잡은 수가 있어도 다 내보냈으면(진화·판매…) 못 넣는다
  const gone = withCapsule({ mons: { [SQUIRTLE]: { evo: 2 } } });
  assert.deepEqual(restStartRule(gone, 1, SQUIRTLE, T0, ''), { ok: false, why: 'none' });
});

test('💊 houseOf가 휴식을 고쳐 읽는다: 캡슐에만 · 모양이 바른 것만 · 받은/꺼낸 휴식(restsDone)은 지움 · 같은 종이 두 대면 먼저 놓은 캡슐만 · 옮기기·뒤집기에는 따라가고 서랍에는 못 넣음(resting)', () => {
  const ok = { id: `${T0}:1:${SQUIRTLE}`, mon: SQUIRTLE, at: T0, luck: '' };
  const mk = (rest, more = {}) => {
    const p = withCapsule(more);
    p.house.rooms[0].items[0].rest = rest;
    return p;
  };
  assert.deepEqual(capsule(mk(ok)).rest, ok);
  for (const bad of [null, 'x', [], { ...ok, id: 5 }, { ...ok, id: '' }, { ...ok, mon: 0 }, { ...ok, mon: 1.5 }, { ...ok, mon: '7' }, { ...ok, at: NaN }, { ...ok, at: -1 }, { ...ok, at: Infinity }, { ...ok, luck: 'big' }, { ...ok, id: 'x'.repeat(200) }]) {
    assert.equal(capsule(mk(bad)).rest, undefined, JSON.stringify(bad));
  }
  assert.deepEqual(capsule(mk({ ...ok, extra: 1 })).rest, ok, '모르는 칸은 버린다');
  assert.equal(capsule(mk(ok, {})).rest.luck, '');
  const done = mk(ok);
  done.restsDone = { [ok.id]: T0 + 1 };
  assert.equal(capsule(done).rest, undefined, '받은 휴식은 되살아나지 않는다');
  const brokenDone = mk(ok);
  brokenDone.restsDone = 'bad';
  assert.deepEqual(capsule(brokenDone).rest, ok, '깨진 restsDone은 없는 것');
  // 캡슐이 아닌 가구에 붙은 휴식은 버린다
  const teddy = withCapsule({ items: { f_teddy: 1 } });
  teddy.house.rooms[0].items.push({ u: 2, id: 'f_teddy', x: 5, y: 0, f: 0, rest: { ...ok, id: 'b' } });
  assert.equal(houseOf(teddy).rooms[0].items.find((i) => i.u === 2).rest, undefined);
  // 같은 종이 두 대에(합쳐진 백업) — 먼저 놓은 캡슐(작은 번호)만
  const twin = withCapsule({ items: { [HEAL]: 2 } });
  twin.house.rooms[0].items.push({ u: 2, id: HEAL, x: 3, y: 0, f: 0, rest: { ...ok, id: 'b' } });
  twin.house.rooms[0].items[0].rest = { ...ok, id: 'a' };
  const items = houseOf(twin).rooms[0].items;
  assert.deepEqual(items.map((i) => (i.rest ? i.rest.id : '-')), ['a', '-']);
  // 옮기기·뒤집기 뒤에도 그대로 · 서랍에는 못 넣음 · 쉬지 않는 캡슐은 넣을 수 있다
  const p = mk(ok);
  assert.deepEqual(moveRule(p, R, 1, 4, 3), { ok: true });
  assert.deepEqual(flipRule(p, R, 1), { ok: true });
  assert.deepEqual(capsule(p).rest, ok);
  assert.deepEqual(storeRule(p, R, 1), { ok: false, why: 'resting' });
  assert.deepEqual(restCancelRule(p, 1, T0 + 10), { ok: true, rest: ok });
  assert.deepEqual(storeRule(p, R, 1), { ok: true });
});

test('💊 일찍 꺼내기: 보상 없이 비우고 꺼낸 휴식도 restsDone에 — 옛 집 기록이 되살리지 못한다 · 빈 캡슐은 gone', () => {
  const p = withCapsule({ mons: { [SQUIRTLE]: { hp: 30 } } });
  restStartRule(p, 1, SQUIRTLE, T0, 'evo');
  const oldHouse = JSON.parse(JSON.stringify(p.house));
  const before = JSON.stringify({ mons: p.mons, coins: p.coins, caught: p.caught });
  const r = restCancelRule(p, 1, T0 + 60_000);
  assert.equal(r.ok, true);
  assert.equal(capsule(p).rest, undefined);
  assert.deepEqual(p.restsDone, { [r.rest.id]: T0 + 60_000 });
  assert.equal(JSON.stringify({ mons: p.mons, coins: p.coins, caught: p.caught }), before, '보상 없음(HP도 그대로)');
  assert.deepEqual(restCancelRule(p, 1, T0), { ok: false, why: 'gone' });
  // 다 쉰 뒤의 꺼내기는 안 된다(ready) — 누르는 사이 1시간이 지나도 보상을 잃지 않게(받기로)
  const late = withCapsule();
  restStartRule(late, 1, SQUIRTLE, T0, '');
  const keep = JSON.stringify(late);
  assert.deepEqual(restCancelRule(late, 1, DONE), { ok: false, why: 'ready' });
  assert.equal(JSON.stringify(late), keep);
  assert.equal(restCancelRule(late, 1, DONE - 1).ok, true, '1초 전이면 꺼낼 수 있다');
  p.house = oldHouse; // 옛 창·옛 백업의 집
  assert.equal(capsule(p).rest, undefined);
  assert.deepEqual(claim(p, 1, DONE), { ok: false, why: 'gone' });
});

test('💊 다 쉬기 전엔 못 받음(early, 남은 시간) · 딱 1시간이면 받는다: ❤️ 가득 · 💤 +10 · 받은 휴식은 restsDone · 캡슐이 빈다 · 두 번째는 gone · 아무 값도 안 냄', () => {
  const p = withCapsule({ coins: 0, mons: { [SQUIRTLE]: { hp: 20, lv: 2 } } });
  restStartRule(p, 1, SQUIRTLE, T0, '');
  const before = JSON.stringify(p);
  assert.deepEqual(claim(p, 1, DONE - 1), { ok: false, why: 'early', left: 1 });
  assert.equal(JSON.stringify(p), before, '이른 받기는 아무것도 안 바꾼다');
  assert.equal(restLeft(capsule(p).rest, T0 + 1000), REST_MS - 1000);
  assert.equal(restLeft(capsule(p).rest, DONE + 5), 0);
  const r = claim(p, 1, DONE);
  assert.equal(r.ok, true);
  assert.deepEqual([r.mon, r.hp, r.exp, r.lv, r.luck], [SQUIRTLE, { from: 20, to: 100 }, { from: 0, to: REST_EXP, lvUp: 0, end: REST_EXP }, { from: 2, to: 2 }, '']);
  assert.deepEqual([p.mons[SQUIRTLE].hp, p.mons[SQUIRTLE].rx, p.mons[SQUIRTLE].lv], [100, REST_EXP, 2]);
  assert.ok(p.restsDone[`${T0}:1:${SQUIRTLE}`] === DONE);
  assert.equal(capsule(p).rest, undefined);
  assert.deepEqual(claim(p, 1, DONE + 5), { ok: false, why: 'gone' });
  assert.deepEqual([p.coins, p.items], [0, { [HEAL]: 1 }], '값을 내지 않는다');
  assert.equal(restStartRule(p, 1, SQUIRTLE, DONE + 10, '').ok, true, '비면 다시 넣을 수 있다');
});

test('💊 💤 경험치: 10번 쉬면 100 → 스톤 없이 레벨 +1(rxLv) · 진화 레벨이면 멈추고 💤만 쌓인다(가득) · expOf는 막대', () => {
  const p = withCapsule({ mons: { [SQUIRTLE]: { lv: 3 } } });
  const stones = JSON.stringify(p.items);
  let t = T0;
  for (let i = 0; i < EXP_LV / REST_EXP; i++) {
    assert.equal(restStartRule(p, 1, SQUIRTLE, t, '').ok, true);
    const r = claim(p, 1, t + REST_MS);
    assert.equal(r.ok, true);
    if (i < 9) assert.equal(r.exp.lvUp, 0);
    else assert.deepEqual([r.exp, r.lv], [{ from: 90, to: 100, lvUp: 1, end: 0 }, { from: 3, to: 4 }]);
    t += REST_MS + 1;
  }
  assert.deepEqual([p.mons[SQUIRTLE].lv, p.mons[SQUIRTLE].rx, p.mons[SQUIRTLE].rxLv], [4, 100, 1]);
  assert.equal(JSON.stringify(p.items), stones, '스톤을 안 쓴다');
  assert.deepEqual(expOf(p.mons[SQUIRTLE]), { have: 0, need: EXP_LV, full: false });
  // 진화 레벨(꼬부기 Lv5)이면 경험치는 쌓여도 레벨은 안 오른다
  const cap = withCapsule({ mons: { [SQUIRTLE]: { lv: levelCapOf(SQUIRTLE), rx: 95, rxLv: 0 } } });
  restStartRule(cap, 1, SQUIRTLE, T0, '');
  const r = claim(cap, 1, DONE);
  assert.deepEqual([r.exp, r.lv], [{ from: 95, to: 100, lvUp: 0, end: 100 }, { from: 5, to: 5 }]);
  assert.deepEqual(expOf(cap.mons[SQUIRTLE]), { have: EXP_LV, need: EXP_LV, full: true });
  assert.deepEqual(expOf(undefined), { have: 0, need: EXP_LV, full: false });
  assert.deepEqual(expOf({ rx: -5, rxLv: 3 }), { have: 0, need: EXP_LV, full: false }, '깨진 값');
});

test('💊 5% 레벨 행운: 스톤 없이 +1 · 진화 레벨·만렙이면 대신 💰100(번 코인에도) · 경험치로 오른 뒤에 본다', () => {
  const p = withCapsule({ mons: { [SQUIRTLE]: { lv: 2 } } });
  restStartRule(p, 1, SQUIRTLE, T0, 'lv');
  const r = claim(p, 1, DONE);
  assert.deepEqual([r.luck, r.lv, r.coins], ['lv', { from: 2, to: 3 }, 0]);
  const cap = withCapsule({ coins: 7, mons: { [SQUIRTLE]: { lv: 5 } } });
  cap.coinsEarned = 50;
  restStartRule(cap, 1, SQUIRTLE, T0, 'lv');
  const c = claim(cap, 1, DONE);
  assert.deepEqual([c.luck, c.lv, c.coins, cap.coins, cap.coinsEarned], ['lv', { from: 5, to: 5 }, LUCK_COINS, 7 + LUCK_COINS, 50 + LUCK_COINS]);
  // 경험치로 진화 레벨에 닿은 뒤면 행운은 코인으로
  const edge = withCapsule({ mons: { [SQUIRTLE]: { lv: 4, rx: 90 } } });
  restStartRule(edge, 1, SQUIRTLE, T0, 'lv');
  const e = claim(edge, 1, DONE);
  assert.deepEqual([e.exp.lvUp, e.lv, e.coins], [1, { from: 4, to: 5 }, LUCK_COINS]);
  // 진화 없는 종은 만렙(12)까지 · 만렙이면 코인
  const ditto = withCapsule({ caught: { [DITTO]: 1 }, mons: { [DITTO]: { lv: 12 } } });
  restStartRule(ditto, 1, DITTO, T0, 'lv');
  assert.equal(claim(ditto, 1, DONE).coins, LUCK_COINS);
});

test('💊 0.5% 깜짝 진화: 진우가 정한다(decide) — 안 정하면 decide와 갈래 · 0이면 그대로 두기 · 고르면 **레벨이 모자라도** 진화(한 마리 씀·레벨 이어짐·❤️ 가득) · 이브이는 여덟 갈래 중에서 · 진화 없는 종은 레벨 행운으로', () => {
  const p = withCapsule({ mons: { [SQUIRTLE]: { lv: 1, hp: 40 } } });
  restStartRule(p, 1, SQUIRTLE, T0, 'evo');
  const before = JSON.stringify(p);
  assert.deepEqual(claim(p, 1, DONE), { ok: false, why: 'decide', id: capsule(p).rest.id, mon: SQUIRTLE, choices: [WARTORTLE] });
  assert.equal(JSON.stringify(p), before, '정하기 전엔 아무것도 안 바꾼다');
  assert.deepEqual(claim(p, 1, DONE, 999), { ok: false, why: 'to' });
  const r = claim(p, 1, DONE, WARTORTLE);
  assert.equal(r.ok, true);
  assert.deepEqual([r.luck, r.evo.ok, r.evo.from, r.evo.to, r.evo.lv, r.evo.first], ['evo', true, SQUIRTLE, WARTORTLE, 1, true]);
  assert.deepEqual([p.caught[WARTORTLE], p.mons[SQUIRTLE].evo, haveOf(p.caught[SQUIRTLE], p.mons[SQUIRTLE]), lvOf(p.mons[WARTORTLE]), p.mons[WARTORTLE].hp], [1, 1, 1, 1, 100]);
  assert.deepEqual([p.mons[SQUIRTLE].hp, p.mons[SQUIRTLE].rx], [100, REST_EXP], '남은 꼬부기도 쉰 만큼은 받는다');
  // 그대로 두기
  const keep = withCapsule({ mons: { [SQUIRTLE]: { lv: 1 } } });
  restStartRule(keep, 1, SQUIRTLE, T0, 'evo');
  const k = claim(keep, 1, DONE, 0);
  assert.deepEqual([k.ok, k.evo, k.kept, keep.caught[WARTORTLE], keep.mons[SQUIRTLE].evo], [true, null, true, undefined, undefined]);
  assert.equal(r.kept, false, '진화했으면 kept 아님');
  // 이브이
  const ev = withCapsule({ caught: { [EEVEE]: 1 } });
  restStartRule(ev, 1, EEVEE, T0, 'evo');
  const d = claim(ev, 1, DONE);
  assert.deepEqual([d.why, d.choices], ['decide', evoOf(EEVEE).map((e) => e.to)]);
  assert.equal(d.choices.length, 8);
  const v = claim(ev, 1, DONE, 197);
  assert.deepEqual([v.evo.to, ev.caught[197], haveOf(ev.caught[EEVEE], ev.mons[EEVEE])], [197, 1, 0]);
  // 진화 없는 종 → 레벨 행운
  const ditto = withCapsule({ caught: { [DITTO]: 1 }, mons: { [DITTO]: { lv: 3 } } });
  restStartRule(ditto, 1, DITTO, T0, 'evo');
  const x = claim(ditto, 1, DONE);
  assert.deepEqual([x.ok, x.evo, x.lv, x.kept], [true, null, { from: 3, to: 4 }, false], '진화 없는 종은 물을 것도 그대로 둔 것도 아니다');
});

test('💊 다 쉬었을 때 그 포켓몬이 없으면(팔았거나 다 진화) 보상 없이 비운다(gone) · 받은 기록은 남는다', () => {
  const p = withCapsule({ mons: { [SQUIRTLE]: { hp: 10 } } });
  restStartRule(p, 1, SQUIRTLE, T0, 'evo');
  p.mons[SQUIRTLE] = { ...p.mons[SQUIRTLE], sold: 2 };
  const r = claim(p, 1, DONE);
  assert.deepEqual(r, { ok: true, mon: SQUIRTLE, gone: true });
  assert.equal(p.mons[SQUIRTLE].hp, 10);
  assert.equal(capsule(p).rest, undefined);
  assert.ok(p.restsDone[`${T0}:1:${SQUIRTLE}`]);
});

test('💊 병합: 받은 휴식은 합집합(깨진 쪽은 버림) · 💤 rx·rxLv는 큰 쪽(단조) · 집(휴식)은 최근 쪽 — 옛 백업의 휴식은 받은 기록이 지운다', () => {
  const a = { ...emptyProfile(), restsDone: { x: 5, y: 9 }, mons: { 7: { rx: 40, rxLv: 0, lv: 2 } }, updatedAt: 20 };
  const b = { ...emptyProfile(), restsDone: { y: 3, z: 'bad' }, mons: { 7: { rx: 120, rxLv: 1, lv: 3 } }, updatedAt: 10 };
  for (const [x, y] of [[a, b], [b, a]]) {
    const m = mergeStatRecord('profile', x, y);
    assert.deepEqual(Object.keys(m.restsDone).sort(), ['x', 'y', 'z']);
    assert.equal(m.restsDone.y, 3, '이른 때');
    assert.deepEqual([m.mons[7].rx, m.mons[7].rxLv, m.mons[7].lv], [120, 1, 3]);
  }
  for (const bad of ['bad', 7, true, [1, 2]]) {
    const m = mergeStatRecord('profile', { ...a, restsDone: bad }, b);
    assert.deepEqual(Object.keys(m.restsDone).sort(), ['y', 'z'], JSON.stringify(bad));
  }
  assert.deepEqual(cloneProfile({ ...a }).restsDone, a.restsDone);
  assert.notEqual(cloneProfile(a).restsDone, a.restsDone, '복사');
  assert.deepEqual(emptyProfile().restsDone, {});
  // 받은 쪽(최근) + 옛 백업(휴식 중)
  const old = withCapsule();
  restStartRule(old, 1, SQUIRTLE, T0, '');
  old.updatedAt = 5;
  const now = cloneProfile(old);
  claim(now, 1, DONE);
  now.updatedAt = 30;
  const back = mergeStatRecord('profile', now, { ...old, updatedAt: 40 }); // 옛 백업이 더 늦게 저장된 척해도
  assert.equal(capsule(back).rest, undefined, '받은 휴식은 다시 받을 수 없다');
  assert.deepEqual(claim(back, 1, DONE + 10), { ok: false, why: 'gone' });
});

// ───────────────────── 🔍 Codex 47차 ─────────────────────

const claimW = (p, u, now, decide, want) => restClaimRule(p, u, now, decide, 100, evolveRule, want);

test('🔍 Codex 47차 #1: 쉬던 캡슐이 자리를 잃어도(2층이 없는 쪽과 합쳐짐) 휴식은 맡겨 둔다 · 저장된 집에도 남고 · 캡슐을 다시 놓으면 이어 쉰다(넣은 때·행운 그대로) · 빈 캡슐이 놓여 있으면 거기서', () => {
  const mk = (heal, up, down = []) => pf({
    items: { [HEAL]: heal, x_wide: 1, x_floor2: 1, f_teddy: 1 }, caught: { [SQUIRTLE]: 1, 25: 1 },
    house: { started: true, seq: 5, rooms: [{ id: R, wall: '', floor: '', items: down }, { id: SECOND_ROOM, wall: '', floor: '', items: up }] },
  });
  const p = mk(1, [{ u: 1, id: HEAL, x: 0, y: 0, f: 0 }]);
  const rest = restStartRule(p, 1, SQUIRTLE, T0, 'lv').rest;
  delete p.items.x_floor2; // 2층이 없는 쪽(가방)으로 합쳐졌다
  const h = houseOf(p);
  assert.equal(h.rooms.length, 1);
  assert.deepEqual(h.parked, [rest], '맡겨 둔 휴식');
  assert.deepEqual(restsOf(h), [rest]);
  assert.deepEqual(claim(p, 1, DONE), { ok: false, why: 'gone' }, '놓인 캡슐이 없으니 아직 못 받는다');
  // 다른 가구를 놓아 고쳐 읽은 집이 저장돼도 남는다
  assert.equal(placeRule(p, R, 'f_teddy', 5, 5).ok, true);
  assert.deepEqual(p.house.parked, [rest], '저장된 집에도');
  // 2층을 되찾아도 캡슐은 서랍에 — 다시 놓으면 이어 쉰다
  p.items.x_floor2 = 1;
  const put = placeRule(p, SECOND_ROOM, HEAL, 0, 0);
  assert.deepEqual([put.ok, put.rest], [true, rest]);
  assert.equal(houseOf(p).parked, undefined, '맡긴 것이 캡슐로 돌아갔다');
  assert.deepEqual(capsule(p, put.u).rest, rest);
  const got = claimW(p, put.u, DONE, undefined, rest.id);
  assert.deepEqual([got.ok, got.luck, got.lv], [true, 'lv', { from: 1, to: 2 }]);
  assert.ok(Object.prototype.hasOwnProperty.call(p.restsDone, rest.id), '받은 기록');
  // 다른 가구를 놓을 때는 맡긴 휴식이 따라가지 않는다
  const t = mk(2, [{ u: 1, id: HEAL, x: 0, y: 0, f: 0 }]);
  restStartRule(t, 1, SQUIRTLE, T0, '');
  delete t.items.x_floor2;
  const tp = placeRule(t, R, 'f_teddy', 0, 0);
  assert.deepEqual([tp.ok, tp.rest], [true, undefined]);
  assert.equal(houseOf(t).parked.length, 1);
  // 아래층에 빈 캡슐이 놓여 있으면 거기서 이어 쉰다
  const q = mk(2, [{ u: 1, id: HEAL, x: 0, y: 0, f: 0 }], [{ u: 2, id: HEAL, x: 0, y: 0, f: 0 }]);
  const r1 = restStartRule(q, 1, SQUIRTLE, T0, '').rest;
  delete q.items.x_floor2;
  assert.equal(houseOf(q).parked, undefined);
  assert.deepEqual(capsule(q, 2).rest, r1, '빈 캡슐로');
  assert.equal(claim(q, 2, DONE).ok, true);
  // 아래층 캡슐이 쉬는 중이면 맡겨 두었다가 — 그 포켓몬을 꺼내면 빈 캡슐로 옮겨 이어 쉰다 · 맡긴 종은 또 못 넣는다
  const w = mk(2, [{ u: 1, id: HEAL, x: 0, y: 0, f: 0 }], [{ u: 2, id: HEAL, x: 0, y: 0, f: 0 }]);
  const ra = restStartRule(w, 1, SQUIRTLE, T0, '').rest;
  restStartRule(w, 2, 25, T0, '');
  delete w.items.x_floor2;
  assert.deepEqual(houseOf(w).parked, [ra]);
  assert.equal(restCancelRule(w, 2, T0 + 5).ok, true);
  assert.equal(houseOf(w).parked, undefined);
  assert.deepEqual(capsule(w, 2).rest, ra, '꺼낸 캡슐로');
  assert.deepEqual(restStartRule(w, 2, SQUIRTLE, T0 + 9, ''), { ok: false, why: 'busy' });
});

test('🔍 Codex 47차 #1: 맡겨 둘 수 있는 것 — 받은/꺼낸 것·모양이 틀린 것·같은 종 둘째·서랍의 캡슐보다 많은 것은 버린다 · 캡슐이 없으면 없음 · 다시 읽어도 같다', () => {
  const z = pf({
    items: { [HEAL]: 1 }, caught: { [SQUIRTLE]: 1, 25: 1, 1: 1 }, restsDone: { done1: 5 },
    house: { started: true, seq: 0, rooms: [{ id: R, wall: '', floor: '', items: [] }], parked: [
      { id: 'done1', mon: 1, at: T0, luck: '' }, { id: 'a', mon: SQUIRTLE, at: 1e300, luck: '' }, { id: 'b', mon: SQUIRTLE, at: T0, luck: 'evo', x: 1 },
      { id: 'c', mon: SQUIRTLE, at: T0, luck: '' }, { id: 'd', mon: 25, at: T0, luck: '' }, 'bad', null] },
  });
  assert.deepEqual(houseOf(z).parked, [{ id: 'b', mon: SQUIRTLE, at: T0, luck: 'evo' }], '서랍의 캡슐 하나만큼 — 받은 것·깨진 때·모르는 칸은 빼고');
  assert.equal(houseOf({ ...z, items: {} }).parked, undefined, '캡슐이 없으면');
  assert.deepEqual(houseOf({ ...z, house: houseOf(z) }), houseOf(z), '다시 읽어도 같다');
  assert.deepEqual(houseOf({ ...z, restsDone: { done1: 5, b: 9 } }).parked, [{ id: 'c', mon: SQUIRTLE, at: T0, luck: '' }], '받은 것은 다음 것으로');
  // 복사·병합 — 맡긴 휴식도 새 객체로, 집과 같은 쪽(최근)
  const c = cloneProfile(z);
  c.house.parked[2].mon = 99;
  assert.equal(z.house.parked[2].mon, SQUIRTLE, '복사');
  const m = mergeStatRecord('profile', { ...z, updatedAt: 9 }, { ...emptyProfile(), updatedAt: 1 });
  assert.deepEqual(houseOf(m).parked, houseOf(z).parked);
});

test('🔍 Codex 47차 #2: 받기·꺼내기는 진우가 본 휴식(id)에만 — 그 사이 같은 캡슐에 다른 휴식이 들어왔으면 changed(아무것도 안 바꿈) · 물음(decide)은 휴식 id를 돌려준다', () => {
  const p = withCapsule({ caught: { [EEVEE]: 1 } });
  const a = restStartRule(p, 1, SQUIRTLE, T0, 'evo').rest;
  assert.deepEqual(claim(p, 1, DONE), { ok: false, why: 'decide', id: a.id, mon: SQUIRTLE, choices: [WARTORTLE] });
  assert.equal(claimW(p, 1, DONE, 0, a.id).kept, true, '창 B가 그대로 두고 받음');
  const b = restStartRule(p, 1, EEVEE, DONE + 10, 'evo').rest;
  const before = JSON.stringify(p);
  assert.deepEqual(claimW(p, 1, DONE + 10 + REST_MS, 0, a.id), { ok: false, why: 'changed' }, '창 A의 옛 "그대로 두기"');
  assert.deepEqual(claimW(p, 1, DONE + 10 + REST_MS, evoOf(EEVEE)[0].to, a.id), { ok: false, why: 'changed' }, '옛 갈래 단추');
  assert.deepEqual(restCancelRule(p, 1, DONE + 20, a.id), { ok: false, why: 'changed' }, '옛 ⏏️');
  assert.equal(JSON.stringify(p), before, '아무것도 안 바꿈');
  // 본 휴식이면 된다 · 안 주면(옛 부름) 묻지 않는다
  assert.equal(claimW(p, 1, DONE + 10 + REST_MS, undefined, b.id).why, 'decide');
  assert.equal(claimW(p, 1, DONE + 10 + REST_MS, undefined, null).why, 'decide');
  assert.equal(restCancelRule(p, 1, DONE + 20, b.id).ok, true);
  assert.deepEqual(restCancelRule(p, 1, DONE + 20, b.id), { ok: false, why: 'gone' });
});

test('🔍 Codex 47차 #3: 시계를 되돌려 같은 때 같은 캡슐에 다시 넣어도 기록 번호가 겹치지 않는다(덧번호) — 넣은 휴식이 보이고 받을 수 있다', () => {
  const p = withCapsule();
  const a = restStartRule(p, 1, SQUIRTLE, T0, '').rest;
  assert.equal(restCancelRule(p, 1, T0 + 1).ok, true);
  const b = restStartRule(p, 1, SQUIRTLE, T0, '').rest;
  assert.equal(b.id, `${a.id}~2`);
  assert.deepEqual(capsule(p).rest, b, '보인다');
  assert.equal(restCancelRule(p, 1, T0 + 1).ok, true);
  const c = restStartRule(p, 1, SQUIRTLE, T0, '').rest;
  assert.equal(c.id, `${a.id}~3`);
  assert.equal(claim(p, 1, DONE).ok, true);
  assert.deepEqual(Object.keys(p.restsDone).sort(), [a.id, b.id, c.id].sort());
});

test('🔍 Codex 47차 #4: 깨진 💤 카운터("1e309"·아주 큰 수·음수·글자)는 0 · rxLv는 rx로 오를 수 있는 수까지 · 넣은 때는 안전한 정수만 · 병합도 같은 읽기', () => {
  assert.deepEqual(['1e309', 1e309, 1e20, 2 ** 53, -5, 'x', null, undefined, NaN, 12.7, '30', 2 ** 53 - 1].map(restCount), [0, 0, 0, 0, 0, 0, 0, 0, 0, 12, 30, 2 ** 53 - 1]);
  assert.deepEqual(rxOf({ rx: 250, rxLv: 9 }), { rx: 250, rxLv: 2 });
  assert.deepEqual(rxOf(null), { rx: 0, rxLv: 0 });
  assert.deepEqual(expOf({ rx: '1e309', rxLv: '1e309' }), { have: 0, need: EXP_LV, full: false });
  assert.deepEqual(expOf({ rx: 250, rxLv: 9 }), { have: 50, need: EXP_LV, full: false });
  const p = withCapsule({ mons: { [SQUIRTLE]: { lv: 1, rx: '1e309', rxLv: 3 } } });
  restStartRule(p, 1, SQUIRTLE, T0, '');
  const r = claim(p, 1, DONE);
  assert.deepEqual([r.lv, p.mons[SQUIRTLE].rx, p.mons[SQUIRTLE].rxLv], [{ from: 1, to: 1 }, REST_EXP, 0], '한 번에 Lv5가 되지 않는다');
  for (const at of [1e300, T0 + 0.5, -1, 0, '1760000000000', Infinity]) {
    const q = withCapsule();
    q.house.rooms[0].items[0].rest = { id: 'x', mon: SQUIRTLE, at, luck: '' };
    assert.equal(capsule(q).rest, undefined, String(at));
  }
  const a = { ...emptyProfile(), mons: { 7: { rx: '1e309', rxLv: 1e20, lv: 2 } }, updatedAt: 20 };
  const b = { ...emptyProfile(), mons: { 7: { rx: 50, lv: 2 } }, updatedAt: 10 };
  for (const [x, y] of [[a, b], [b, a]]) {
    const m = mergeStatRecord('profile', x, y);
    assert.deepEqual([m.mons[7].rx, m.mons[7].rxLv || 0], [50, 0], '무한대가 큰 쪽으로 이기지 않는다');
  }
  const m = mergeStatRecord('profile', { ...emptyProfile(), mons: { 7: { rx: 1e20, lv: 2 } }, updatedAt: 9 }, { ...emptyProfile(), mons: { 7: { lv: 2 } }, updatedAt: 1 });
  assert.equal(m.mons[7].rx, 0, '깨진 값은 고친다');
});

test('🔍 Codex 47차 #5: 💤가 넘쳐 레벨이 오르면 받은 뒤 막대(exp.end)는 남은 💤 · 레벨이 못 오르면 가득(100) · 연출은 레벨 업 뒤 end에서 끝난다', async () => {
  const p = withCapsule({ mons: { [SQUIRTLE]: { lv: 1, rx: 95 } } });
  restStartRule(p, 1, SQUIRTLE, T0, '');
  assert.deepEqual(claim(p, 1, DONE).exp, { from: 95, to: 100, lvUp: 1, end: 5 });
  assert.equal(expOf(p.mons[SQUIRTLE]).have, 5);
  const q = withCapsule({ mons: { [SQUIRTLE]: { lv: 1, rx: 300 } } }); // 진화 레벨에 막혀 쌓인 💤 — 한 번에 여러 레벨
  restStartRule(q, 1, SQUIRTLE, T0, '');
  const rq = claim(q, 1, DONE);
  assert.deepEqual([rq.exp, rq.lv], [{ from: 100, to: 100, lvUp: 3, end: 10 }, { from: 1, to: 4 }]);
  const { readFileSync } = await import('node:fs');
  const show = readFileSync(new URL('../js/restshow.js', import.meta.url), 'utf8');
  const i = show.indexOf('if (r.exp.lvUp > 0) {');
  const lvBlock = show.slice(i, show.indexOf('\n    }\n', i));
  assert.ok(lvBlock.includes('const end = Math.max(0, Math.min(EXP_LV, Number(r.exp.end) || 0));'), '남은 💤');
  assert.ok(lvBlock.includes('      if (end > 0) await Promise.all([fillBar(exFill, 0, end / EXP_LV, 300), countUp(exNum, 0, end, 300, (n) => `${n}/${EXP_LV}`)]);'), '0에서 남은 💤까지(남은 것이 있으면 늘)');
});

test('🔍 Codex 47차 D: 레벨 행운이 💰가 된 까닭(cap) — 진화 레벨이면 "진화할 때가 되어서" · 만렙이면 "레벨이 가득해서" · 연출은 "⬆️ 레벨 업!"', async () => {
  const v = await import('../js/houseview.js');
  const p = withCapsule({ mons: { [SQUIRTLE]: { lv: 5 } } });
  restStartRule(p, 1, SQUIRTLE, T0, 'lv');
  const r = claim(p, 1, DONE);
  assert.deepEqual([r.coins, r.cap], [LUCK_COINS, 'evolve']);
  assert.deepEqual(v.claimLines(r, () => '꼬부기').filter((l) => l.includes('💰')), ['🍀 진화할 때가 되어서 대신 💰100']);
  const q = withCapsule({ caught: { [DITTO]: 1 }, mons: { [DITTO]: { lv: 12 } } });
  restStartRule(q, 1, DITTO, T0, 'lv');
  const s = claim(q, 1, DONE);
  assert.deepEqual([s.coins, s.cap], [LUCK_COINS, 'max']);
  assert.deepEqual(v.claimLines(s, () => '메타몽').filter((l) => l.includes('💰')), ['🍀 레벨이 가득해서 대신 💰100']);
  const z = withCapsule();
  restStartRule(z, 1, SQUIRTLE, T0, 'lv');
  assert.deepEqual([claim(z, 1, DONE).cap], [null], '💰가 아니면 까닭 없음');
  assert.deepEqual(CAP_KO, { evolve: '진화할 때가 되어서', max: '레벨이 가득해서' });
  const { readFileSync } = await import('node:fs');
  const show = readFileSync(new URL('../js/restshow.js', import.meta.url), 'utf8');
  assert.ok(!show.includes('LEVEL UP') && show.includes('`⬆️ 레벨 업! Lv ${r.lv.from}') && show.includes('`🍀 ${CAP_KO[r.cap] || CAP_KO.max} 대신 💰${r.coins}`'));
});

test('🔍 Codex 47차 #6: 그림 받기 줄 — 한 번에 3장까지 · 같은 포켓몬은 한 번 · 창을 닫았으면(자리가 화면에 없음) 안 받는다 · 못 받으면 다음에 다시', async () => {
  const { artQueue } = await import('../js/houseview.js');
  const tick = () => new Promise((res) => setTimeout(res, 0));
  const calls = [];
  const wake = [];
  let running = 0;
  let peak = 0;
  const ensure = (id) => {
    calls.push(id);
    running++;
    peak = Math.max(peak, running);
    return new Promise((res) => wake.push(() => { running--; res(id === 13 ? '' : `u${id}`); }));
  };
  const q = artQueue(ensure, 3);
  const on = { isConnected: true };
  const ps = [1, 2, 3, 4, 5, 1, 2].map((id) => q(id, on));
  const shut = q(9, { isConnected: false });
  await tick();
  assert.deepEqual(calls, [1, 2, 3], '한 번에 셋');
  while (wake.length) { wake.shift()(); await tick(); }
  assert.deepEqual(await Promise.all(ps), ['u1', 'u2', 'u3', 'u4', 'u5', 'u1', 'u2']);
  assert.equal(await shut, '', '닫힌 창의 것');
  assert.deepEqual(calls, [1, 2, 3, 4, 5], '같은 포켓몬은 한 번 · 닫힌 창의 것은 안 받음');
  assert.equal(peak, 3);
  const r1 = q(13, on);
  await tick();
  wake.shift()();
  assert.equal(await r1, '');
  const r2 = q(13, on);
  await tick();
  wake.shift()();
  assert.equal(await r2, '');
  assert.equal(calls.filter((x) => x === 13).length, 2, '못 받은 것은 다시');
  // 받다가 던져도 줄이 멈추지 않는다
  const bad = artQueue(() => { throw new Error('x'); }, 1);
  assert.deepEqual(await Promise.all([bad(1, on), bad(2, on)]), ['', '']);
});

// ───────────────────── 진짜 저장 경로 (fakeidb) ─────────────────────

const stored = () => fakeIdb.get('profile', 'me');
async function seed(p) {
  await flushProfile();
  const cur = stored() || emptyProfile();
  fakeIdb.put('profile', { ...cur, ...p, id: 'me', updatedAt: (cur.updatedAt || 0) + 1 });
  await reloadProfile();
}
let inited = false;
async function setup() {
  if (!inited) { await initProfile(); inited = true; }
}
const capsuleHouse = () => ({ started: true, seq: 2, rooms: [{ id: R, wall: '', floor: '', items: [{ u: 1, id: HEAL, x: 0, y: 0, f: 0 }, { u: 2, id: HEAL, x: 3, y: 0, f: 0 }] }] });

test('★ 💊 저장 경로: 넣기·꺼내기·받기가 저장된 프로필에 · 두 창이 같은 캡슐에 동시에 넣으면 하나만 · 같은 휴식을 동시에 두 번 받아도 한 번 · 저장이 안 되면 없던 일', async () => {
  await setup();
  await seed({ coins: 0, items: { [HEAL]: 2 }, caught: { [SQUIRTLE]: 1, 25: 1 }, mons: { [SQUIRTLE]: { hp: 10, lv: 2 } }, house: capsuleHouse(), restsDone: {} });
  const rs = await Promise.all([restStart(1, SQUIRTLE, ''), restStart(1, 25, '')]);
  assert.deepEqual(rs.map((r) => (r.ok ? 'ok' : r.why)).sort(), ['busy', 'ok']);
  assert.ok(houseNow().rooms[0].items[0].rest, '창의 집도 저장된 것으로');
  const at = stored().house.rooms[0].items[0].rest.at;
  assert.ok(Math.abs(at - Date.now()) < 5000, '넣은 때는 누른 때');
  const early = await restClaim(1);
  assert.deepEqual([early.ok, early.why], [false, 'early']);
  assert.ok(early.left > REST_MS - 5000 && early.left <= REST_MS, String(early.left));
  // 1시간 지난 것처럼 — 넣은 때를 앞당긴다(다른 창이 한 시간 전에 넣었다)
  const s = stored();
  s.house.rooms[0].items[0].rest.at -= REST_MS;
  fakeIdb.put('profile', { ...s, updatedAt: s.updatedAt + 1 });
  const two = await Promise.all([restClaim(1), restClaim(1)]);
  assert.deepEqual(two.map((r) => (r.ok ? 'ok' : r.why)).sort(), ['gone', 'ok']);
  assert.equal(stored().house.rooms[0].items[0].rest, undefined);
  const monId = two.find((r) => r.ok).mon;
  assert.equal(stored().mons[monId].hp, 100);
  assert.equal(stored().mons[monId].rx, REST_EXP, '💤도 한 번만');
  assert.equal(Object.keys(stored().restsDone).length, 1);
  // 저장이 안 되면 없던 일 — 넣기·꺼내기
  const s0 = JSON.stringify(stored());
  fakeIdb.failNext('profile');
  assert.deepEqual(await restStart(2, 25, ''), { ok: false, why: 'save' });
  assert.equal(fakeIdb.failsLeft(), 0);
  assert.equal(JSON.stringify(stored()), s0);
  assert.ok(!houseNow().rooms[0].items[1].rest, '메모리로 넣은 척하지 않는다');
  assert.equal((await restStart(2, 25, '')).ok, true);
  fakeIdb.failNext('profile');
  assert.deepEqual(await restCancel(2), { ok: false, why: 'save' });
  assert.ok(stored().house.rooms[0].items[1].rest, '꺼내기도 없던 일');
  assert.equal((await restCancel(2)).ok, true);
  assert.equal(stored().house.rooms[0].items[1].rest, undefined);
  assert.equal(Object.keys(stored().restsDone).length, 2, '받은 것 하나 + 꺼낸 것 하나');
  assert.deepEqual(getProfileSnapshot().restsDone, stored().restsDone, '창의 프로필에도 restsDone');
});

test('★ 💊 저장 경로 깜짝 진화: 넣을 때 정한 행운이 저장되고 · 받을 때 정하라고 묻고(decide) · 고르면 레벨 1이어도 진화 · 창의 프로필도 진화한 것으로', async () => {
  await setup();
  await seed({ coins: 0, items: { [HEAL]: 1 }, caught: { [SQUIRTLE]: 1 }, mons: { [SQUIRTLE]: { lv: 1, hp: 50 } }, house: capsuleHouse(), restsDone: {} });
  assert.equal((await restStart(1, SQUIRTLE, 'evo')).ok, true);
  assert.equal(stored().house.rooms[0].items[0].rest.luck, 'evo');
  const s = stored();
  s.house.rooms[0].items[0].rest.at -= REST_MS;
  fakeIdb.put('profile', { ...s, updatedAt: s.updatedAt + 1 });
  assert.deepEqual(await restClaim(1), { ok: false, why: 'decide', id: stored().house.rooms[0].items[0].rest.id, mon: SQUIRTLE, choices: [WARTORTLE] });
  const r = await restClaim(1, WARTORTLE);
  assert.deepEqual([r.ok, r.evo && r.evo.to, r.hp], [true, WARTORTLE, { from: 50, to: 100 }]);
  assert.deepEqual([stored().caught[WARTORTLE], stored().mons[SQUIRTLE].evo, stored().mons[WARTORTLE].hp], [1, 1, 100]);
  assert.equal(getProfileSnapshot().caught[WARTORTLE], 1);
});

test('★ 🔍 Codex 47차 F: 저장 경로 경쟁 — 두 창이 같은 종을 두 캡슐에 동시에 → 하나만 · 깜짝 진화를 서로 다른 갈래로 동시에 받아도 한 번 · 받기가 끊기면 휴식·포켓몬 그대로 다시 받는다 · 옛 id는 changed', async () => {
  await setup();
  await seed({ coins: 0, items: { [HEAL]: 2 }, caught: { [EEVEE]: 1 }, mons: {}, house: capsuleHouse(), restsDone: {} });
  const both = await Promise.all([1, 2].map((u) => applyHouseRule((p) => restStartRule(p, u, EEVEE, Date.now(), 'evo'))));
  assert.deepEqual(both.map((r) => (r.ok ? 'ok' : r.why)).sort(), ['ok', 'twice']);
  const s = stored();
  const cap = s.house.rooms[0].items.find((i) => i.rest);
  cap.rest.at -= REST_MS;
  fakeIdb.put('profile', { ...s, updatedAt: s.updatedAt + 1 });
  const [toA, toB] = evoOf(EEVEE).map((e) => e.to);
  const two = await Promise.all([toA, toB].map((to) => applyHouseRule((p) => restClaimRule(p, cap.u, Date.now(), to, 100, evolveRule, cap.rest.id))));
  assert.deepEqual(two.map((r) => (r.ok ? 'ok' : r.why)).sort(), ['gone', 'ok']);
  assert.equal([toA, toB].filter((k) => stored().caught[k]).length, 1, '한 갈래로만');
  assert.equal(stored().mons[EEVEE].evo, 1, '이브이 한 마리만 씀');
  // 받기가 끊기면(저장 실패) 없던 일 — 다시 받으면 된다
  await seed({ caught: { [SQUIRTLE]: 1 }, mons: { [SQUIRTLE]: { lv: 1, hp: 30 } }, items: { [HEAL]: 2 }, house: capsuleHouse(), restsDone: {} });
  assert.equal((await restStart(1, SQUIRTLE, 'evo')).ok, true);
  const s2 = stored();
  s2.house.rooms[0].items[0].rest.at -= REST_MS;
  fakeIdb.put('profile', { ...s2, updatedAt: s2.updatedAt + 1 });
  await reloadProfile();
  const rid = stored().house.rooms[0].items[0].rest.id;
  const before = JSON.stringify(stored());
  fakeIdb.failNext('profile');
  assert.deepEqual(await restClaim(1, WARTORTLE, rid), { ok: false, why: 'save' });
  assert.equal(JSON.stringify(stored()), before, '저장된 것 그대로');
  assert.equal(houseNow().rooms[0].items[0].rest.id, rid, '창의 집도 휴식 그대로');
  const ok = await restClaim(1, WARTORTLE, rid);
  assert.deepEqual([ok.ok, ok.evo && ok.evo.to, ok.luck], [true, WARTORTLE, 'evo'], '넣을 때 정한 행운 그대로');
  assert.deepEqual(await restClaim(1, WARTORTLE, rid), { ok: false, why: 'gone' }, '두 번은 안 된다');
  // 옛 창 — 같은 캡슐에 새 휴식이 들어온 뒤 옛 id로 꺼내기·받기
  assert.equal((await restStart(1, WARTORTLE, '')).ok, true);
  assert.deepEqual(await restCancel(1, rid), { ok: false, why: 'changed' });
  assert.deepEqual(await restClaim(1, 0, rid), { ok: false, why: 'changed' });
  assert.equal(stored().house.rooms[0].items[0].rest.mon, WARTORTLE, '새 휴식은 그대로');
});

// ───────────────────── 2단계 화면 (houseview) ─────────────────────

test('💊 화면 말(순수): restClock 분:초 · restWhy(아직이면 몇 분) · claimLines — HP·💤·💤 레벨·행운 레벨·대신 💰·진화·그대로 두기·없어짐', async () => {
  const v = await import('../js/houseview.js');
  assert.deepEqual([REST_MS, 3_599_001, 61_000, 5_000, 999, 0, -5, NaN].map(v.restClock), ['60:00', '60:00', '1:01', '0:05', '0:01', '0:00', '0:00', '0:00']);
  assert.equal(v.restWhy({ why: 'early', left: REST_MS - 1 }), '아직 쉬는 중이에요 — 60분 남았어요');
  assert.equal(v.restWhy({ why: 'early', left: 1 }), '아직 쉬는 중이에요 — 1분 남았어요');
  assert.equal(v.restWhy({ why: 'early', left: 61_000 }), '아직 쉬는 중이에요 — 2분 남았어요');
  for (const why of ['busy', 'twice', 'none', 'gone', 'ready', 'to', 'save', 'resting']) assert.ok(v.restWhy({ why }).length > 4, why);
  assert.equal(v.restWhy({ why: 'decide' }), '');
  assert.equal(v.restWhy({ why: 'toString' }), '다시 해 볼까요?', '물려받은 이름은 말이 아니다');
  assert.equal(v.restWhy(null), '다시 해 볼까요?');
  const ko = (id) => ({ 7: '꼬부기', 8: '어니부기', 25: '피카츄' }[id]);
  assert.deepEqual(v.claimLines({ ok: true, mon: 7, gone: true }, ko), ['꼬부기가 이제 없어서 캡슐이 비었어요']);
  const base = { ok: true, mon: 7, luck: '', hp: { from: 20, to: 100 }, exp: { from: 0, to: 10, lvUp: 0 }, lv: { from: 2, to: 2 }, coins: 0, evo: null, kept: false };
  assert.deepEqual(v.claimLines(base, ko), ['❤️ 꼬부기 HP 가득!', '💤 +10']);
  assert.deepEqual(v.claimLines({ ...base, exp: { from: 90, to: 100, lvUp: 1 }, lv: { from: 2, to: 3 } }, ko), ['❤️ 꼬부기 HP 가득!', '💤 +10', '💤 경험치가 가득 차서 레벨 +1', 'Lv 2 → 3']);
  assert.deepEqual(v.claimLines({ ...base, luck: 'lv', lv: { from: 2, to: 3 } }, ko), ['❤️ 꼬부기 HP 가득!', '💤 +10', '🍀 행운의 레벨 +1', 'Lv 2 → 3']);
  assert.deepEqual(v.claimLines({ ...base, luck: 'lv', exp: { from: 90, to: 100, lvUp: 1 }, lv: { from: 3, to: 5 } }, ko).slice(2), ['💤 경험치가 가득 차서 레벨 +1', '🍀 행운의 레벨 +1', 'Lv 3 → 5']);
  assert.deepEqual(v.claimLines({ ...base, luck: 'lv', coins: 100, lv: { from: 5, to: 5 } }, ko).slice(2), ['🍀 레벨이 가득해서 대신 💰100']);
  assert.deepEqual(v.claimLines({ ...base, luck: 'evo', evo: { ok: true, to: 8 } }, ko).slice(2), ['✨ 어니부기로 진화!']);
  assert.deepEqual(v.claimLines({ ...base, luck: 'evo', kept: true }, ko).slice(2), ['진화하지 않고 그대로 두었어요']);
  assert.deepEqual(v.claimLines({ ...base, mon: 25 }, ko).slice(0, 1), ['❤️ 피카츄 HP 가득!']);
});

test('💊 화면 연결: 캡슐 도구(🐾 쉬게 하기 · ⏏️ 꺼내기 두 번 · ✨ 받기) · 다 쉰 캡슐은 누르면 받기 · 꺼내다 ready면 받기 · 깜짝 진화는 물음 창 · 저장은 xp(restStart·restCancel·restClaim)로만 · 상점 가진 것 n/2 · 시계는 열 때 켜고 닫을 때 끔', async () => {
  const { readFileSync } = await import('node:fs');
  const src = readFileSync(new URL('../js/houseview.js', import.meta.url), 'utf8');
  const fn = (head) => { const i = src.indexOf(head); assert.ok(i >= 0, head); return src.slice(i, src.indexOf('\n}\n', i)); };
  const v0 = await import('../js/houseview.js');
  const tool = fn('function restTool(it) {');
  assert.ok(tool.includes("b.textContent = '🐾 쉬게 하기';") && tool.includes('ui.pick = it.u;'), '빈 캡슐 → 고르기 창');
  // 꺼내기 두 번·받기·물음은 진우가 본 휴식(id)에 묶는다 (Codex 47차 #2)
  assert.ok(tool.includes('const armed = ui.outArm === it.rest.id;'));
  assert.ok(/if \(ui\.outArm !== it\.rest\.id\) \{ ui\.outArm = it\.rest\.id;[^\n]*return; \}\n\s+cancelAt\(it\.u, it\.rest\.mon, it\.rest\.id\);/.test(tool), '꺼내기는 두 번');
  assert.ok(tool.includes("b.textContent = '✨ 받기';") && tool.includes('claimAt(it.u, undefined, it.rest.id)'));
  assert.ok(/if \(it && it\.rest && restLeft\(it\.rest, Date\.now\(\)\) === 0\) \{ claimAt\(it\.u, undefined, it\.rest\.id\); return; \}/.test(fn('function tap(d) {')), '다 쉰 캡슐은 누르면 받기');
  assert.ok(fn('async function cancelAt(').includes("if (r && r.why === 'ready') claimAt(u, undefined, want);"), '꺼내는 사이 다 쉬었으면 받기');
  const claimFn = fn('async function claimAt(');
  assert.ok(claimFn.includes("if (r.why === 'decide') {") && claimFn.includes('ui.evoAsk = { u, id: r.id, mon: r.mon, choices: r.choices };'));
  const ask = fn('function evoAskBox() {');
  assert.ok(ask.includes('claimAt(q.u, to, q.id)') && ask.includes('claimAt(q.u, 0, q.id)'), '갈래 · 그대로 두기');
  assert.ok(fn('async function pickMon(').includes('restStart(u, id)'));
  assert.ok(src.includes('() => restCancel(u, want)') && src.includes('() => restClaim(u, decide, want)'));
  assert.ok(v0.restWhy({ why: 'changed' }).startsWith('캡슐 속 포켓몬이 바뀌었어요'), '바뀌었으면 그 말');
  // 시계가 뒤로 가면 ✨를 끈다 (Codex 47차 C) · 맡겨 둔 휴식은 서랍에서 알리고 고르기 창에선 쉬는 중 (#1)
  const tk = fn('function tickRests() {');
  assert.ok(tk.includes("} else if (left && e.classList.contains('is-ready')) {") && tk.includes("e.classList.remove('is-ready');"));
  assert.ok(fn('function drawerBox() {').includes('for (const r of houseNow().parked || []) {'));
  assert.ok(fn('function pickBox() {').includes('const busy = new Set(restsOf(houseNow()).map((r) => r.mon));'));
  assert.ok(src.includes('run((p) => placeRule(p, rid, id, spot.x, spot.y), placedText(d));') && src.includes('run((p) => placeRule(p, d.room, d.id, d.spot.x, d.spot.y), placedText(f));'), '다시 놓으면 이어서 쉰다는 말');
  assert.equal(v0.placedText({ emoji: '💊', ko: '회복 캡슐' })({ ok: true, u: 3, rest: { mon: 7 } }), '💊 회복 캡슐을 놓았어요 — 💤 꼬부기가 이어서 쉬어요');
  assert.equal(v0.placedText({ emoji: '🧸', ko: '곰인형' })({ ok: true, u: 3 }), '🧸 곰인형을 놓았어요');
  assert.ok(fn('function monFace(id, cls) {').includes('queueArt(id, s)') && !fn('function monFace(id, cls) {').includes('ensureArt('), '그림은 줄로만 (#6)');
  assert.ok(/if \(it\.id === HEAL\) t\.appendChild\(restTool\(it\)\);/.test(fn('function toolsEl(')));
  assert.ok(/if \(it\.id === HEAL\) restDecor\(e, it\);/.test(fn('function itemEl(')));
  const open = fn('export function openHouse(');
  assert.ok(open.includes('if (!ui.tick) ui.tick = setInterval(tickRests, 1000);') && open.includes('ui.pick = 0; ui.evoAsk = null; ui.outArm = 0;'));
  assert.ok(fn('export function closeHouse() {').includes('if (ui.tick) { clearInterval(ui.tick); ui.tick = 0; }'));
  for (const f of ['function stale() {', 'function onReloaded() {', 'function goTab(']) assert.ok(fn(f).includes('ui.pick = 0; ui.evoAsk = null; ui.outArm = 0;'), `${f} 캡슐 상태도 푼다`);
  const pick = fn('function pickBox() {');
  assert.ok(pick.includes('ownedMonIds()') && pick.includes('if (busy.has(id)) {') && pick.includes('b.disabled = true;'), '쉬는 포켓몬은 못 고름');
  assert.ok(src.includes('`가진 것 ${have}/${houseFurnMax(it.id)}`'));
  assert.ok(fn('async function shopTap(').includes("const own = why === 'max' && furnById(id) && furnById(id).max;"), '캡슐 한도 말');
  assert.ok(!/applyHouseRule|mutateProfile|from '\.\/db\.js'/.test(src), '화면이 저장소를 직접 만지지 않는다');
  // 3단계 연출 · 🏠 ✨
  assert.ok(claimFn.includes('if (r.ok && !r.gone) {') && claimFn.includes('await showRestDone({ r, ko: monKo, pic: (id) => characterUrl(id) || artUrl(id) || \'\', lines: claimLines(r, monKo) });'), '받으면 연출(보상은 이미 저장)');
  const init = fn('export function initHouse() {');
  assert.ok(init.includes('onProfileReload(markReady);') && init.includes('setInterval(markReady, 15000);') && init.includes('markReady();'), '🏠 ✨은 앱을 열 때부터');
  const mark = fn('function markReady() {');
  assert.ok(mark.includes('if (i.rest && restLeft(i.rest, now) === 0) n++;') && mark.includes("b.classList.toggle('has-ready', n > 0);"), '다 쉰 캡슐만 센다');
  assert.ok(fn('export function closeHouse() {').includes('markReady();'), '닫을 때도 ✨');
  assert.ok(fn('function restDecor(e, it) {').includes("e.style.setProperty('--rest-p', String(restDone(left)));") && fn('function tickRests() {').includes("e.style.setProperty('--rest-p', String(restDone(left)));"), '남은 시간 링');
  const v = await import('../js/houseview.js');
  assert.deepEqual([0, 1, 59_999, 60_000, 60_001, REST_MS].map(v.minsLeft), ['1분 남았어요', '1분 남았어요', '1분 남았어요', '1분 남았어요', '2분 남았어요', '60분 남았어요']);
  const show = readFileSync(new URL('../js/restshow.js', import.meta.url), 'utf8');
  assert.ok(show.includes("if (busy || !o || !o.r || !o.r.ok || o.r.gone) return;"), '못 받았거나 없어졌으면 연출 없음');
  assert.ok(/if \(r\.evo && r\.evo\.ok\) \{\n\s+const to = r\.evo\.to;\n\s+await showEvolve\(/.test(show), '깜짝 진화면 이어서 진화 연출');
  assert.ok(!/\.style\.width/.test(show), '막대는 width가 아니라 transform(옛 태블릿)');
});
