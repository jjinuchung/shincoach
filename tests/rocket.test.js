// 🚀 로켓단 습격 (2026-10-09, 아버님 아이디어) — 1단계 규칙·저장 테스트: node --test tests/rocket.test.js
// 결정(아버님): 수학 하루 3번·영어 하루 3번 따로 · 전설 아래에서 흔함 50 · 보통 35 · 희귀 15 · 나머지는 추천대로
//   (세 번 연속 맞힌 뒤 30% · 문제 5개 중 3번 맞히면 쫓아냄·3번 틀리면 빼앗김 · 파트너만 지킴 · 아지트 → 이기면 1마리 되찾기 · 💰20)
// ★ 저장 함정(메모 profile-merge-invariants): 빼앗김·되찾음은 늘어나기만 하는 카운터 — caught를 줄이면 옛 백업(max)이 되살린다
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { ROCKET, STEAL_WEIGHT, shouldRocket, stealables, pickTarget, rocketStart, rocketStep, hideout, rocketNew, copyRocketCur, mergeRocketDone } from '../js/rocket.js';
import { haveOf, rocketHeldOf } from '../js/evolve.js';
import { rocketStealRule, rocketWinRule, rocketBeginRule, rocketStepRule, cloneProfile, emptyProfile, mergeStatRecord, mergeDailyDelta, emptyDaily, takeMonRule } from '../js/db.js';
import { rocketCtx, rarityIn, battleWin, haveCount, caughtCount, rocketTargets, rocketPick, rocketLose, rocketWin, rocketHideout, rocketHeldCount, rocketRecord, getProfileSnapshot, rocketBegin, rocketSaveStep, rocketCurrent } from '../js/xp.js';
import { BATTLE } from '../js/battle.js';
import { ROSTER, isUltraBeast } from '../js/pokemon.js';

const P = (o = {}) => cloneProfile({ ...emptyProfile(), ...o });
const BASE = P();
// 등급별 실제 id — 이 파일이 명단에서 따로 찾는다 (rarityIn은 아빠가 옮긴 등급이 없을 때 명단 등급)
const BY = { 1: [], 2: [], 3: [], 4: [] };
for (const m of ROSTER) { const t = rarityIn(BASE, m.id); if (BY[t] && !isUltraBeast(m.id)) BY[t].push(m.id); }
const [C1, C2] = BY[1]; const [U1, U2] = BY[2]; const [R1] = BY[3]; const [L1] = BY[4];
const UB = ROSTER.map((m) => m.id).find((id) => isUltraBeast(id));

/** 정해 둔 수를 차례로 내는 rng */
const seq = (...xs) => { let i = 0; return () => xs[Math.min(i++, xs.length - 1)]; };

test('명단에 등급마다 종이 있다 (테스트 재료 점검)', () => {
  assert.ok(C1 && C2 && U1 && U2 && R1 && L1 && UB, JSON.stringify({ C1, C2, U1, U2, R1, L1, UB }));
});

test('🚀 아버님 결정 그대로 — 과목마다 하루 3번 · 흔함 50 · 보통 35 · 희귀 15(전설·🌌 없음) · 5문제 3승 3패 · 💰20 · ⚡는 야생 배틀과 같게', () => {
  assert.equal(ROCKET.maxPerDay, 3);
  assert.deepEqual(ROCKET.field, { math: 'rocketMath', en: 'rocketEn' }, '수학·영어 따로 센다');
  assert.deepEqual(STEAL_WEIGHT, { 1: 50, 2: 35, 3: 15 });
  assert.deepEqual([ROCKET.questions, ROCKET.winAt, ROCKET.loseAt], [5, 3, 3]);
  assert.ok(ROCKET.winAt + ROCKET.loseAt - 1 <= ROCKET.questions, '5문제 안에 반드시 승패가 난다');
  assert.equal(ROCKET.winCoins, 20);
  assert.equal(ROCKET.winXp, BATTLE.winXp, '⚡는 야생 배틀과 같게');
});

test('🚀 등장: 그 과목을 어느 정도 한 뒤 · 세 번 연속 맞힌 다음 · 과목마다 하루 3번까지 · 남은 시간 5분 이상 · 30%', () => {
  const ok = { subject: 'math', doneToday: 5, streak: 3, todayCount: 0, leftSec: null };
  assert.equal(shouldRocket({ ...ok, rng: () => 0.29 }), true, '모든 조건 + 30% 안');
  assert.equal(shouldRocket({ ...ok, rng: () => 0.3 }), false, '30% 밖');
  // 조건 하나씩만 어긋나게
  assert.equal(shouldRocket({ ...ok, doneToday: 4, rng: () => 0 }), false, '수학은 5문항부터');
  assert.equal(shouldRocket({ ...ok, streak: 2, rng: () => 0 }), false, '세 번 연속 맞힌 뒤');
  assert.equal(shouldRocket({ ...ok, streak: 7, rng: () => 0 }), true, '더 이어져도 다시 굴린다');
  assert.equal(shouldRocket({ ...ok, todayCount: 3, rng: () => 0 }), false, '하루 3번까지');
  assert.equal(shouldRocket({ ...ok, todayCount: 2, rng: () => 0 }), true);
  assert.equal(shouldRocket({ ...ok, leftSec: 299, rng: () => 0 }), false, '남은 시간 5분 미만');
  assert.equal(shouldRocket({ ...ok, leftSec: 300, rng: () => 0 }), true);
  assert.equal(shouldRocket({ ...ok, subject: 'en', doneToday: 9, rng: () => 0 }), false, '영어는 10문장부터');
  assert.equal(shouldRocket({ ...ok, subject: 'en', doneToday: 10, rng: () => 0 }), true);
  assert.equal(shouldRocket({ ...ok, subject: 'art', rng: () => 0 }), false, '모르는 과목');
});

test('🚀 배틀: 3번 맞히면 쫓아냄 · 3번 틀리면 빼앗김 · 32가지 답 차례 모두 5문제 안에 끝나고, 끝난 뒤엔 더 세지 않는다', () => {
  for (let mask = 0; mask < 32; mask++) {
    let st = rocketStart(); let right = 0; let wrong = 0; let ended = 0;
    for (let i = 0; i < 5; i++) {
      const c = !!(mask & (1 << i));
      const before = st;
      st = rocketStep(st, c);
      if (before.outcome) { assert.equal(st, before, '끝난 상태는 그대로'); continue; }
      if (c) right++; else wrong++;
      if (st.outcome && !ended) ended = i + 1;
    }
    assert.ok(st.outcome, `mask ${mask}: 5문제 안에 끝나야`);
    // 이 파일이 따로 센 답으로 — 먼저 3에 닿은 쪽
    let r3 = 0; let w3 = 0; let first = null;
    for (let i = 0; i < 5 && !first; i++) { if (mask & (1 << i)) r3++; else w3++; if (r3 === 3) first = 'win'; else if (w3 === 3) first = 'lose'; }
    assert.equal(st.outcome, first, `mask ${mask}`);
    assert.ok(right + wrong === st.asked, `mask ${mask}: 센 문제 수`);
    assert.equal(st.right === 3, st.outcome === 'win', `mask ${mask}`);
    assert.equal(st.wrong === 3, st.outcome === 'lose', `mask ${mask}`);
    assert.equal(st.asked, ended, `mask ${mask}: 끝난 문제까지만 셈`);
  }
});

test('🚀 노릴 수 있는 포켓몬: 데리고 있는 흔함·보통·희귀 — 전설·🌌·파트너·보유 0·명단 밖은 빼고, 아빠가 옮긴 등급을 따른다', () => {
  const pf = P({ caught: { [C1]: 1, [U1]: 2, [R1]: 1, [L1]: 1, [UB]: 1, [C2]: 1, 99999: 1 }, mons: { [C2]: { sold: 1 } }, partner: U1 });
  const ids = stealables(pf, rocketCtx(pf)).map((m) => m.id);
  assert.deepEqual(ids, [C1, R1].sort((a, b) => a - b), `전설 ${L1}·🌌 ${UB}·파트너 ${U1}·판 ${C2}·명단 밖 99999는 없다`);
  // 아빠가 흔함을 전설로 옮기면 못 노리고, 전설을 희귀로 옮기면 노린다
  pf.mons[C1] = { rarity: 4 }; pf.mons[L1] = { rarity: 3 };
  const moved = stealables(pf, rocketCtx(pf));
  assert.ok(!moved.some((m) => m.id === C1), '전설로 옮긴 것은 안 노린다');
  assert.deepEqual(moved.find((m) => m.id === L1), { id: L1, tier: 3 }, '희귀로 옮긴 것은 희귀로');
  assert.deepEqual(stealables(P(), rocketCtx(P())), [], '아무것도 없으면 빈 목록');
  // 🌌 울트라비스트는 아빠가 등급을 희귀로 옮겨도 안 노린다 (등급만 보면 지나간다 — 변이 검사가 찾음)
  const ubMoved = P({ caught: { [UB]: 1 }, mons: { [UB]: { rarity: 3 } } });
  assert.deepEqual(stealables(ubMoved, rocketCtx(ubMoved)), []);
});

test('🚀 노릴 포켓몬 고르기: 등급은 50 : 35 : 15 — 없는 등급은 남은 등급끼리 · 등급 안에서는 종마다 같게', () => {
  const list = [{ id: C1, tier: 1 }, { id: C2, tier: 1 }, { id: U1, tier: 2 }, { id: R1, tier: 3 }];
  const N = 10000; const cnt = { 1: 0, 2: 0, 3: 0 };
  for (let i = 0; i < N; i++) cnt[pickTarget(list, seq((i + 0.5) / N, 0)).tier]++;
  assert.deepEqual(cnt, { 1: 5000, 2: 3500, 3: 1500 }, '고르게 놓은 수로 정확히 50 : 35 : 15');
  // 보통이 없으면 흔함 50 : 희귀 15 → 50/65 · 15/65
  const no2 = list.filter((m) => m.tier !== 2); const c2 = { 1: 0, 3: 0 };
  for (let i = 0; i < 6500; i++) c2[pickTarget(no2, seq((i + 0.5) / 6500, 0)).tier]++;
  assert.deepEqual(c2, { 1: 5000, 3: 1500 });
  // 희귀 하나뿐이면 늘 그것
  assert.equal(pickTarget([{ id: R1, tier: 3 }], seq(0.99, 0.99)).id, R1);
  // 같은 등급 안에서는 종마다 반반
  const sp = { [C1]: 0, [C2]: 0 };
  for (let i = 0; i < 1000; i++) sp[pickTarget(list, seq(0, (i + 0.5) / 1000)).id]++;
  assert.deepEqual(sp, { [C1]: 500, [C2]: 500 });
  assert.equal(pickTarget([], () => 0), null);
  assert.equal(pickTarget(list, () => 0.999999).tier, 3, 'rng가 1에 가까워도 범위 안');
  // 경계 — [0, 50)은 흔함, [50, 85)는 보통, [85, 100)은 희귀 (변이 검사가 찾음: < 를 <= 로 바꿔도 고르게 놓은 수로는 지나갔다)
  assert.equal(pickTarget(list, seq(0.5, 0)).tier, 2, '딱 50은 보통');
  assert.equal(pickTarget(list, seq(0.85, 0)).tier, 3, '딱 85는 희귀');
  assert.equal(pickTarget(list, seq(0.4999, 0)).tier, 1);
});

test('🚀 빼앗기(저장 규칙): stolen +1 · 데리고 있는 수 −1 · **도감(caught)은 그대로** · 진 수 +1', () => {
  const p = P({ caught: { [C1]: 2 }, mons: {} });
  const r = rocketStealRule(p, { id: C1 }, rocketCtx(p));
  assert.deepEqual(r, { ok: true, stolen: true, id: C1 });
  assert.equal(p.caught[C1], 2, '★ caught를 줄이면 옛 백업이 되살린다');
  assert.equal(p.mons[C1].stolen, 1);
  assert.equal(haveOf(p.caught[C1], p.mons[C1]), 1);
  assert.equal(p.rocketLost, 1);
  // 마지막 한 마리도 빼앗긴다 — 보유 0, 도감 칸은 남음
  rocketStealRule(p, { id: C1 }, rocketCtx(p));
  assert.equal(haveOf(p.caught[C1], p.mons[C1]), 0);
  assert.equal(p.caught[C1], 2);
  assert.deepEqual(hideout(p), [{ id: C1, n: 2 }], '아지트에 둘');
});

test('🚀 빼앗기는 저장된 프로필로 다시 판정 — 그 사이 팔았거나·파트너가 됐거나·전설로 옮겼으면 빈손(진 수만 +1)', () => {
  const sold = P({ caught: { [C1]: 1 }, mons: { [C1]: { sold: 1 } } });
  assert.deepEqual(rocketStealRule(sold, { id: C1 }, rocketCtx(sold)), { ok: true, stolen: false, id: C1 });
  assert.equal(sold.mons[C1].stolen, undefined, '없는 것을 또 세지 않는다');
  assert.equal(sold.rocketLost, 1, '진 것은 센다');
  const partner = P({ caught: { [C1]: 1 }, partner: C1 });
  assert.equal(rocketStealRule(partner, { id: C1 }, rocketCtx(partner)).stolen, false, '파트너는 지킨다');
  const moved = P({ caught: { [C1]: 1 }, mons: { [C1]: { rarity: 4 } } });
  assert.equal(rocketStealRule(moved, { id: C1 }, rocketCtx(moved)).stolen, false, '전설로 옮긴 것');
  const legend = P({ caught: { [L1]: 1 } });
  assert.equal(rocketStealRule(legend, { id: L1 }, rocketCtx(legend)).stolen, false, '전설');
  const ub = P({ caught: { [UB]: 1 } });
  assert.equal(rocketStealRule(ub, { id: UB }, rocketCtx(ub)).stolen, false, '🌌');
  assert.equal(rocketStealRule(P(), { id: 0 }, rocketCtx(P())).stolen, false, '깨진 id');
});

test('🚀 이기기(저장 규칙): 물리친 수 +1 · 아지트에서 고른 한 마리 되찾기(back +1) — 아지트에 없으면 되찾지 않는다 · 갇힌 수보다 많이는 못 되찾는다', () => {
  const p = P({ caught: { [C1]: 1, [U1]: 1 }, mons: {} });
  rocketStealRule(p, { id: C1 }, rocketCtx(p));
  assert.deepEqual(rocketWinRule(p, { backId: U1 }), { ok: true, back: null }, '아지트에 없는 것');
  assert.deepEqual(rocketWinRule(p, { backId: null }), { ok: true, back: null }, '고르지 않음');
  assert.equal(p.rocketWon, 2, '되찾지 않아도 물리친 수는 센다');
  assert.deepEqual(rocketWinRule(p, { backId: C1 }), { ok: true, back: C1 });
  assert.equal(haveOf(p.caught[C1], p.mons[C1]), 1, '돌아왔다');
  assert.equal(p.caught[C1], 1, 'caught는 그대로 — 되찾음은 back 카운터');
  assert.deepEqual(hideout(p), [], '아지트가 비었다');
  assert.equal(rocketWinRule(p, { backId: C1 }).back, null, '두 번 되찾지 못한다 (다른 창이 먼저 되찾은 것과 같다)');
  assert.equal(p.mons[C1].back, 1);
  assert.equal(rocketHeldOf(p.mons[C1]), 0);
});

test('★ 🚀 병합: 빼앗김·되찾음·물리친 수·진 수는 max — 옛 백업이 빼앗긴 포켓몬을 되살리거나 되찾은 것을 다시 가두지 않는다', () => {
  const old = P({ caught: { [C1]: 1, [U1]: 1 }, mons: {}, updatedAt: 1 });
  const now = P({ caught: { [C1]: 1, [U1]: 1 }, mons: { [C1]: { stolen: 1 }, [U1]: { stolen: 1, back: 1 } }, rocketWon: 1, rocketLost: 2, updatedAt: 5 });
  for (const [a, b] of [[now, old], [old, now]]) {
    const m = mergeStatRecord('profile', a, b);
    assert.equal(haveOf(m.caught[C1], m.mons[C1]), 0, '옛 백업이 빼앗긴 것을 되살리지 않는다');
    assert.equal(haveOf(m.caught[U1], m.mons[U1]), 1, '되찾은 것은 돌아온 채로');
    assert.deepEqual([m.rocketWon, m.rocketLost], [1, 2]);
    assert.deepEqual(hideout(m), [{ id: C1, n: 1 }]);
  }
  // 새것이 오래된 쪽(updatedAt 작음)에 있어도 카운터는 max로 살아남는다
  const newer = P({ caught: { [C1]: 1 }, mons: {}, updatedAt: 9 });
  const older = P({ caught: { [C1]: 1 }, mons: { [C1]: { stolen: 1 } }, updatedAt: 2 });
  assert.equal(mergeStatRecord('profile', newer, older).mons[C1].stolen, 1);
  assert.equal(mergeStatRecord('profile', older, newer).mons[C1].stolen, 1);
  // 되찾은 창(먼저 저장)과 되찾기 전 기록을 늦게 저장한 창 — 되찾음(back)도 max라야 다시 갇히지 않는다 (변이 검사가 찾음)
  const backEarly = P({ caught: { [C1]: 1 }, mons: { [C1]: { stolen: 1, back: 1 } }, updatedAt: 3 });
  const staleLate = P({ caught: { [C1]: 1 }, mons: { [C1]: { stolen: 1 } }, updatedAt: 8 });
  for (const [a, b] of [[backEarly, staleLate], [staleLate, backEarly]]) {
    const m = mergeStatRecord('profile', a, b);
    assert.equal(m.mons[C1].back, 1);
    assert.equal(haveOf(m.caught[C1], m.mons[C1]), 1, '되찾은 것이 다시 아지트로 가지 않는다');
  }
});

test('🚀 하루 횟수: 오늘 기록에 rocketMath·rocketEn — 더해지고(선점), 백업 병합은 큰 값', () => {
  const e = emptyDaily('2026-10-09');
  assert.deepEqual([e.rocketMath, e.rocketEn], [0, 0]);
  const d = mergeDailyDelta(mergeDailyDelta(null, '2026-10-09', { rocketMath: 1 }), '2026-10-09', { rocketMath: 1, rocketEn: 1 });
  assert.deepEqual([d.rocketMath, d.rocketEn], [2, 1], '수학·영어 따로');
  assert.equal(mergeStatRecord('daily', { date: 'd', doneKeys: [], rocketMath: 3 }, { date: 'd', doneKeys: [], rocketMath: 1 }).rocketMath, 3);
  assert.equal(mergeStatRecord('daily', { date: 'd', doneKeys: [], rocketEn: 0 }, { date: 'd', doneKeys: [], rocketEn: 2 }).rocketEn, 2);
});

test('🚀 빼앗긴 것과 다른 "보유 줄이기"가 겹쳐도 보유는 음수가 되지 않고, 아빠가 데려간 것과 따로 센다', () => {
  const p = P({ caught: { [C1]: 2 }, mons: {} });
  rocketStealRule(p, { id: C1 }, rocketCtx(p));
  takeMonRule(p, C1, 1);
  assert.equal(haveOf(p.caught[C1], p.mons[C1]), 0);
  assert.equal(rocketStealRule(p, { id: C1 }, rocketCtx(p)).stolen, false, '보유 0이면 못 빼앗는다');
  rocketWinRule(p, { backId: C1 });
  assert.equal(haveOf(p.caught[C1], p.mons[C1]), 1, '되찾으면 하나');
  assert.equal(haveOf(1, { stolen: 1, back: 3 }), 1, '깨진 기록(되찾음 > 빼앗김)이어도 잡은 수보다 많아지지 않는다');
  assert.equal(rocketHeldOf({ stolen: -2 }), 0);
});

test('🚀 화면 쪽 함수(xp.js): 노리기 → 졌을 때 빼앗김 → 아지트 → 이기면 되찾고 ⚡·💰 · 기록', async () => {
  battleWin(C1); battleWin(U1); battleWin(L1);
  assert.deepEqual(rocketTargets().map((m) => m.id).sort((a, b) => a - b), [C1, U1].sort((a, b) => a - b), '전설은 안 노린다');
  assert.ok([C1, U1].includes(rocketPick(() => 0).id));
  const before = getProfileSnapshot();
  assert.deepEqual(await rocketLose(C1), { ok: true, stolen: true, id: C1 });
  assert.equal(haveCount(C1), 0); assert.equal(caughtCount(C1), 1, '도감 칸은 남는다');
  assert.equal(rocketHeldCount(C1), 1);
  assert.deepEqual(rocketHideout(), [{ id: C1, n: 1 }]);
  assert.deepEqual(await rocketWin(C1), { ok: true, back: C1 });
  assert.equal(haveCount(C1), 1);
  assert.deepEqual(rocketRecord(), { won: 1, lost: 1 });
  const after = getProfileSnapshot();
  assert.equal(after.coins - before.coins, ROCKET.winCoins, '💰20');
  assert.equal(after.xp - before.xp, ROCKET.winXp, '⚡ 야생 배틀과 같게');
  assert.deepEqual(await rocketWin(null), { ok: true, back: null }, '아지트가 비면 되찾을 것 없음');
});

// ───────── 2단계: 진행 중인 배틀 — 앱이 꺼져도 다음에 열면 이어진다(아버님 결정 (다)) · 같은 배틀은 한 번만 ─────────

test('🚀 새 배틀 기록: id·과목·노리는 포켓몬·줄기·처음 상태 · 복사는 st까지 따로', () => {
  const cur = rocketNew({ subject: 'math', target: C1, stem: 'muldiv', now: 1760000000000, rnd: () => 0.5 });
  assert.match(cur.id, /^r[0-9a-z]+$/);
  assert.deepEqual({ ...cur, id: 'x' }, { id: 'x', subject: 'math', target: C1, stem: 'muldiv', st: { asked: 0, right: 0, wrong: 0, outcome: null }, at: 1760000000000 });
  const c2 = copyRocketCur(cur); c2.st.right = 9;
  assert.equal(cur.st.right, 0, '복사본을 고쳐도 원래 기록은 그대로');
  assert.equal(copyRocketCur(null), null); assert.equal(copyRocketCur({}), null, 'id 없는 기록은 버린다');
});

test('🚀 시작·한 문제씩 저장: 진행 중인 배틀은 하나 · 맞힌·틀린 수가 저장돼 이어진다 · 승패가 나면 더 안 센다 · 다른 배틀 id는 무시', () => {
  const p = P({ caught: { [C1]: 1 } });
  const a = rocketNew({ subject: 'math', target: C1, now: 1, rnd: () => 0.1 });
  const b = rocketNew({ subject: 'en', target: C1, now: 2, rnd: () => 0.2 });
  assert.equal(rocketBeginRule(p, a).ok, true);
  const busy = rocketBeginRule(p, b);
  assert.deepEqual([busy.ok, busy.why, busy.cur.id], [false, 'busy', a.id], '다른 창이 연 배틀이 있으면 그것을 이어 간다');
  assert.equal(rocketStepRule(p, b.id, true).ok, false, '다른 배틀 id');
  for (const c of [true, false, true]) assert.equal(rocketStepRule(p, a.id, c).ok, true);
  assert.deepEqual(p.rocketCur.st, { asked: 3, right: 2, wrong: 1, outcome: null }, '저장된 상태 — 다시 열면 여기서');
  assert.deepEqual(rocketStepRule(p, a.id, true).st, { asked: 4, right: 3, wrong: 1, outcome: 'win' });
  const over = rocketStepRule(p, a.id, false);
  assert.deepEqual([over.ok, over.why], [false, 'over'], '승패가 난 뒤엔 더 안 센다');
  assert.equal(p.rocketCur.st.outcome, 'win');
});

test('★ 🚀 같은 배틀은 한 번만 끝난다 — 두 번 빼앗거나 두 번 보상하지 않는다 · 결과가 다른 끝내기는 거절 · 끝나면 진행 중 기록을 비운다', () => {
  // 진 배틀
  const p = P({ caught: { [C1]: 2 } });
  const a = rocketNew({ subject: 'math', target: C1, now: 10, rnd: () => 0.3 });
  rocketBeginRule(p, a);
  for (let i = 0; i < 3; i++) rocketStepRule(p, a.id, false);
  assert.deepEqual(rocketWinRule(p, { battle: a.id }, 20), { ok: false, why: 'outcome' }, '진 배틀로 이긴 보상을 받지 않는다');
  assert.equal(rocketStealRule(p, { id: C1, battle: a.id }, rocketCtx(p), 20).stolen, true);
  assert.equal(p.rocketCur, null, '끝나면 진행 중 기록이 빈다');
  assert.deepEqual(p.rocketDone[a.id], { o: 'lose', at: 20 });
  assert.deepEqual(rocketStealRule(p, { id: C1, battle: a.id }, rocketCtx(p), 30), { ok: false, why: 'done' }, '같은 배틀을 또 처리하면');
  assert.deepEqual([p.mons[C1].stolen, p.rocketLost], [1, 1], '한 번만 빼앗고 한 번만 셌다');
  // 이긴 배틀
  const b = rocketNew({ subject: 'math', target: C1, now: 40, rnd: () => 0.4 });
  assert.equal(rocketBeginRule(p, b).ok, true, '앞 배틀이 끝났으니 새로 연다');
  for (let i = 0; i < 3; i++) rocketStepRule(p, b.id, true);
  assert.deepEqual(rocketStealRule(p, { id: C1, battle: b.id }, rocketCtx(p), 50), { ok: false, why: 'outcome' }, '이긴 배틀로 빼앗지 않는다');
  assert.deepEqual(rocketWinRule(p, { backId: C1, battle: b.id }, 50), { ok: true, back: C1 });
  assert.deepEqual(rocketWinRule(p, { backId: C1, battle: b.id }, 60), { ok: false, why: 'done' });
  assert.deepEqual([p.rocketWon, p.mons[C1].back], [1, 1]);
  assert.equal(rocketBeginRule(p, b).why, 'done', '끝난 배틀 기록으로 다시 열지 못한다');
});

test('★ 🚀 병합: 끝난 배틀은 합집합 — 옛 백업의 "진행 중" 기록이 끝난 배틀을 되살리지 않는다 · 진행 중 기록은 최근 쪽(없으면 다른 쪽)', () => {
  const a = rocketNew({ subject: 'math', target: C1, now: 1, rnd: () => 0.1 });
  const oldPf = P({ caught: { [C1]: 1 }, rocketCur: a, updatedAt: 1 });
  const nowPf = P({ caught: { [C1]: 1 }, mons: { [C1]: { stolen: 1 } }, rocketCur: null, rocketDone: { [a.id]: { o: 'lose', at: 5 } }, updatedAt: 9 });
  for (const [x, y] of [[oldPf, nowPf], [nowPf, oldPf]]) {
    const m = mergeStatRecord('profile', x, y);
    assert.equal(m.rocketCur, null, '끝난 배틀은 진행 중으로 돌아오지 않는다');
    assert.deepEqual(m.rocketDone[a.id], { o: 'lose', at: 5 });
  }
  // 늦게 저장된 쪽이 "진행 중"(끝나는 걸 못 본 다른 창·백업)이고 일찍 저장된 쪽에 "끝남"이 있어도 — 끝난 목록은 합집합이라 되살아나지 않는다 (변이 검사가 찾음)
  const endedEarly = P({ caught: { [C1]: 1 }, mons: { [C1]: { stolen: 1 } }, rocketDone: { [a.id]: { o: 'lose', at: 2 } }, updatedAt: 3 });
  const pendingLate = P({ caught: { [C1]: 1 }, rocketCur: a, updatedAt: 8 });
  for (const [x, y] of [[endedEarly, pendingLate], [pendingLate, endedEarly]]) {
    const m = mergeStatRecord('profile', x, y);
    assert.equal(m.rocketCur, null, '끝난 배틀을 다시 열어 두 번 빼앗지 않는다');
    assert.deepEqual(m.rocketDone[a.id], { o: 'lose', at: 2 });
  }
  // 진행 중인 배틀이 한쪽에만 있으면 살린다 (끝난 목록에 없을 때)
  const late = P({ caught: { [C1]: 1 }, updatedAt: 9 });
  assert.equal(mergeStatRecord('profile', late, oldPf).rocketCur.id, a.id);
  assert.deepEqual(mergeRocketDone({ x: { o: 'win', at: 9 } }, { x: { o: 'win', at: 3 }, y: { o: 'lose', at: 4 } }), { x: { o: 'win', at: 3 }, y: { o: 'lose', at: 4 } });
});

test('🚀 화면 쪽(xp.js): 시작 → 한 문제씩 저장 → 이어 가기(rocketCurrent) → 끝 · 이미 끝난 배틀이면 보상 없음', async () => {
  battleWin(U2);
  const cur = rocketNew({ subject: 'math', target: U2, now: Date.now(), rnd: () => 0.7 });
  assert.equal((await rocketBegin(cur)).ok, true);
  assert.equal(rocketCurrent().id, cur.id, '앱을 다시 열면 이 배틀이 이어진다');
  await rocketSaveStep(cur.id, true); await rocketSaveStep(cur.id, true);
  assert.deepEqual(rocketCurrent().st, { asked: 2, right: 2, wrong: 0, outcome: null });
  assert.equal((await rocketSaveStep(cur.id, true)).st.outcome, 'win');
  const before = getProfileSnapshot();
  assert.deepEqual(await rocketWin(null, cur.id), { ok: true, back: null });
  assert.equal(rocketCurrent(), null, '끝나면 이어 갈 배틀이 없다');
  assert.deepEqual(await rocketWin(null, cur.id), { ok: false, back: null }, '같은 배틀 두 번째 — 보상 없음');
  assert.equal(getProfileSnapshot().coins - before.coins, ROCKET.winCoins, '💰는 한 번만');
});

test('🚀 rocket.js는 순수 규칙 — DOM·db·xp를 import하지 않는다(db.js가 이 파일을 import해도 순환 없음) · 앱 셸이 들고 간다', () => {
  const src = fs.readFileSync(new URL('../js/rocket.js', import.meta.url), 'utf8');
  const imports = [...src.matchAll(/^import .* from '([^']+)'/gm)].map((m) => m[1]);
  assert.deepEqual(imports, ['./evolve.js']);
  assert.ok(!/document\.|window\./.test(src));
  const sw = fs.readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
  assert.match(sw, /'\.\/js\/rocket\.js'/);
});

// ───────── 2026-10-09 저녁, 아버님: "너무 빠른 간격으로 나와서 벌써 영어에서 3번 다 나왔어. 20분 간격으로" ─────────

test('🚀 간격: 그 과목에서 로켓단이 나온 뒤 20분이 지나야 다시 — 19분 59초는 안 되고 20분은 된다 · 처음(기록 없음)은 바로', () => {
  assert.equal(ROCKET.gapMin, 20);
  const now = 1760000000000;
  const ok = { subject: 'en', doneToday: 30, streak: 5, todayCount: 1, leftSec: null, rng: () => 0, now };
  assert.equal(shouldRocket({ ...ok, lastAt: now - (20 * 60 - 1) * 1000 }), false, '19분 59초');
  assert.equal(shouldRocket({ ...ok, lastAt: now - 20 * 60 * 1000 }), true, '20분');
  assert.equal(shouldRocket({ ...ok, lastAt: 0 }), true, '오늘 처음');
  assert.equal(shouldRocket({ ...ok }), true, '기록 없음');
  assert.equal(shouldRocket({ ...ok, lastAt: now + 60 * 1000 }), false, '시계가 뒤로 간 기기 — 미래 기록도 간격 안으로');
});

test('🚀 간격 기록: 배틀을 시작하면 그 과목의 마지막 등장 시각을 저장(과목마다 따로) · 병합은 과목마다 늦은 쪽', () => {
  const p = P({ caught: { [C1]: 1 } });
  const a = rocketNew({ subject: 'en', target: C1, now: 5000, rnd: () => 0.1 });
  rocketBeginRule(p, a);
  assert.deepEqual(p.rocketLast, { en: 5000 });
  const busy = rocketNew({ subject: 'math', target: C1, now: 9000, rnd: () => 0.2 });
  rocketBeginRule(p, busy);
  assert.deepEqual(p.rocketLast, { en: 5000 }, '진행 중인 배틀이 있어 못 연 것은 기록하지 않는다');
  // 수학 배틀은 수학 칸에 — 영어 간격과 따로 (변이 검사가 찾음: 과목 구분 없이 적어도 지나갔다)
  const q = P({ caught: { [C1]: 1 }, rocketLast: { en: 5000 } });
  rocketBeginRule(q, rocketNew({ subject: 'math', target: C1, now: 9000, rnd: () => 0.3 }));
  assert.deepEqual(q.rocketLast, { en: 5000, math: 9000 });
  const m = mergeStatRecord('profile', P({ rocketLast: { en: 5000, math: 100 }, updatedAt: 9 }), P({ rocketLast: { en: 3000, math: 7000 }, updatedAt: 1 }));
  assert.deepEqual(m.rocketLast, { en: 5000, math: 7000 }, '옛 백업이 간격을 되돌리지 않게');
});
