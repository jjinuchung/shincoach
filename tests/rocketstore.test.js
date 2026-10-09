// 🚀 로켓단 — 진짜 저장 경로(트랜잭션)로 보는 테스트 (Codex 43차, 2026-10-09): node --test tests/rocketstore.test.js
// fakeidb.js가 node에 작은 IndexedDB를 깐다 — 쓰기는 커밋 때 한꺼번에, failNext로 저장 실패를 흉내 낸다.
// 예전에는 node에 indexedDB가 없어 로켓단 저장이 늘 "실패 → 메모리로 이어 감"으로만 통과했다(Codex 43차 #2가 그 틈을 찾음).
import { fakeIdb } from './fakeidb.js'; // ★ db.js·xp.js보다 먼저
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ROCKET, rocketNew } from '../js/rocket.js';
import { emptyProfile } from '../js/db.js';
import { initProfile, flushProfile, reloadProfile, battleWin, rarityIn, haveCount, getProfileSnapshot, rocketAdmit, rocketSaveStep, rocketWin, rocketLose, rocketCurrent, rocketHideout, rocketRecord } from '../js/xp.js';
import { ROSTER, isUltraBeast } from '../js/pokemon.js';

const BASE = emptyProfile();
const commons = ROSTER.map((m) => m.id).filter((id) => rarityIn(BASE, id) === 1 && !isUltraBeast(id));
const [C1, C2] = commons;

let T = 1760000000000;
/** 다음 배틀 시각 — 같은 과목은 20분 간격이라 30분씩 */
const later = () => (T += 30 * 60 * 1000);
let D = 1;
/** 테스트마다 새 날 (과목마다 하루 3번) */
const nextDay = () => `2026-11-${String(D++).padStart(2, '0')}`;
const stored = () => fakeIdb.get('profile', 'me');
const dailyOf = (day) => fakeIdb.get('daily', day) || {};

/** 배틀을 연다 (오늘 몫 + 배틀 기록) */
async function begin(subject, target, day = nextDay()) {
  await flushProfile();
  const cur = rocketNew({ subject, target, now: later() });
  const r = await rocketAdmit(day, ROCKET.field[subject], ROCKET.maxPerDay, cur);
  return { cur, r, day };
}
/** 답 여러 개를 저장 */
async function answer(cur, list) {
  for (const c of list) assert.equal((await rocketSaveStep(cur.id, c)).ok, true);
}

let ready = null;
async function setup() {
  if (!ready) {
    ready = (async () => {
      await initProfile();
      for (let i = 0; i < 6; i++) { battleWin(C1); battleWin(C2); }
      battleWin(C1); // 가장 많은 C1이 파트너 — 로켓단은 파트너를 안 노린다
      await flushProfile();
      await reloadProfile(); // 앱을 다시 연 것처럼 — 파트너가 정해진다(ensurePartner)
      await flushProfile();
    })();
  }
  return ready;
}

test('저장 경로 테스트 재료: 흔함 두 종(C1 일곱·C2 여섯) · 파트너는 C1 — 노리는 것은 C2', async () => {
  await setup();
  assert.ok(C1 && C2);
  assert.deepEqual([stored().caught[C1], stored().caught[C2]], [7, 6]);
  assert.equal(stored().partner, C1);
});

test('★ 🚀 이기면 ⚡40·💰20이 "끝남"과 같은 저장에 — 그 저장이 실패하면 끝남도 보상도 없고 다시 할 수 있다 · 다시 하면 한 번만 · 앱을 다시 열어 또 끝내도 한 번 (Codex 43차 #1·#2)', async () => {
  await setup();
  const { cur, r } = await begin('math', C2);
  assert.equal(r.ok, true);
  await answer(cur, [true, true, true]);
  await flushProfile();
  const s0 = stored();
  fakeIdb.failNext('profile');
  assert.deepEqual(await rocketWin(null, cur.id), { ok: false, why: 'save', back: null });
  assert.equal(fakeIdb.failsLeft(), 0, '실패는 이기기 저장에 쓰였다');
  const s1 = stored();
  assert.deepEqual([s1.xp, s1.coins, s1.coinsEarned], [s0.xp, s0.coins, s0.coinsEarned], '보상도 없고');
  assert.equal((s1.rocketDone || {})[cur.id], undefined, '끝남도 없다 — 둘 중 하나만 남지 않는다');
  assert.equal(s1.rocketCur.st.outcome, 'win', '이긴 상태로 남아 다음에 이어진다');
  assert.equal(rocketCurrent().id, cur.id, '메모리로 끝낸 척하지 않는다');
  assert.deepEqual(await rocketWin(null, cur.id), { ok: true, back: null });
  const s2 = stored();
  assert.deepEqual([s2.xp - s0.xp, s2.coins - s0.coins, s2.coinsEarned - s0.coinsEarned], [ROCKET.winXp, ROCKET.winCoins, ROCKET.winCoins], '⚡·💰가 끝남과 함께 저장됐다');
  assert.ok(s2.rocketDone[cur.id]);
  assert.equal(getProfileSnapshot().xp, s2.xp, '화면 쪽도 저장된 값');
  await reloadProfile(); // 앱을 껐다 켬
  assert.deepEqual(await rocketWin(null, cur.id), { ok: false, why: 'done', back: null }, '같은 배틀을 또 끝내면');
  await flushProfile();
  assert.deepEqual([stored().xp, stored().coins], [s2.xp, s2.coins], '보상은 한 번');
});

test('★ 🚀 한 문제 저장이 실패하면 ok:false·why:save — 메모리로만 세지 않는다 · 다시 저장하면 그 답이 한 번 들어간다 (Codex 43차 #2)', async () => {
  await setup();
  const { cur } = await begin('en', C2);
  fakeIdb.failNext('profile');
  assert.deepEqual(await rocketSaveStep(cur.id, true), { ok: false, why: 'save', st: null });
  const zero = { asked: 0, right: 0, wrong: 0, outcome: null };
  assert.deepEqual(stored().rocketCur.st, zero);
  assert.deepEqual(rocketCurrent().st, zero, '화면 쪽 기록도 그대로 (다음 저장이 덮어 하나를 잃지 않게)');
  assert.equal((await rocketSaveStep(cur.id, true)).st.right, 1, '다시 저장');
  assert.equal((await rocketSaveStep(cur.id, true)).st.right, 2);
  assert.deepEqual(stored().rocketCur.st, { asked: 2, right: 2, wrong: 0, outcome: null }, 'Codex 재현: 두 번 맞혔는데 하나만 저장되던 것');
  await answer(cur, [true]);
  assert.equal((await rocketWin(null, cur.id)).ok, true);
});

test('★ 🚀 빼앗기 저장이 실패하면 아무것도 안 빼앗기고 다시 · 다시 하면 한 번만 빼앗긴다 → 아지트 → 다음에 이기면 구한다 (Codex 43차 #2)', async () => {
  await setup();
  const have = haveCount(C2);
  const { cur } = await begin('math', C2);
  await answer(cur, [false, false, false]);
  fakeIdb.failNext('profile');
  assert.deepEqual(await rocketLose(C2, cur.id), { ok: false, why: 'save', stolen: false, id: C2 });
  assert.equal(haveCount(C2), have, '안 빼앗겼다');
  assert.equal(stored().rocketCur.st.outcome, 'lose', '진 상태로 남아 다음에 이어진다');
  assert.deepEqual(await rocketLose(C2, cur.id), { ok: true, stolen: true, id: C2 });
  assert.deepEqual(await rocketLose(C2, cur.id), { ok: false, why: 'done', stolen: false, id: C2 });
  assert.equal(haveCount(C2), have - 1, '한 마리만');
  assert.deepEqual(rocketHideout(), [{ id: C2, n: 1 }]);
  const lost = rocketRecord().lost;
  const w = await begin('math', C1);
  await answer(w.cur, [true, true, true]);
  assert.deepEqual(await rocketWin(C2, w.cur.id), { ok: true, back: C2 });
  assert.equal(haveCount(C2), have, '구해 왔다');
  assert.deepEqual(rocketHideout(), []);
  assert.equal(rocketRecord().lost, lost);
});

test('★ 🚀 시작은 저장된 기록으로 — 다른 창이 막 연 과목은 20분 안에 또 안 열린다 · 진행 중인 배틀은 몫을 안 쓰고 그것을 · 저장이 실패하면 몫도 배틀도 없다 · 하루 몫 3번 (Codex 43차 #3)', async () => {
  await setup();
  const day = nextDay();
  const t0 = later();
  // 다른 창이 1분 전에 영어 로켓단을 열었다 — 이 창의 메모리는 모른다
  const s = stored();
  fakeIdb.put('profile', { ...s, rocketLast: { ...(s.rocketLast || {}), en: t0 - 60 * 1000 } });
  const gap = await rocketAdmit(day, 'rocketEn', ROCKET.maxPerDay, rocketNew({ subject: 'en', target: C2, now: t0 }));
  assert.deepEqual([gap.ok, gap.why, gap.cur], [false, 'gap', null], 'Codex 재현: 1분 뒤 다른 창에서 또 열리던 것');
  assert.equal(Number(dailyOf(day).rocketEn) || 0, 0, '몫을 안 썼다');
  // 수학은 따로 센다 — 연다
  const m = rocketNew({ subject: 'math', target: C2, now: t0 });
  const rm = await rocketAdmit(day, 'rocketMath', ROCKET.maxPerDay, m);
  assert.deepEqual([rm.ok, rm.cur.id], [true, m.id]);
  assert.equal(dailyOf(day).rocketMath, 1, '수학 몫 하나');
  assert.equal(stored().rocketLast.math, t0);
  // 수학 배틀이 진행 중일 때 영어를 열려 하면 — 몫을 안 쓰고 진행 중인 수학 배틀을 돌려준다 (Codex 재현: 몫만 사라지던 것)
  const busy = await rocketAdmit(day, 'rocketEn', ROCKET.maxPerDay, rocketNew({ subject: 'en', target: C2, now: later() }));
  assert.deepEqual([busy.ok, busy.why, busy.cur.id], [false, 'busy', m.id]);
  assert.equal(Number(dailyOf(day).rocketEn) || 0, 0, '영어 몫을 안 썼다');
  await answer(m, [true, true, true]);
  await rocketWin(null, m.id);
  // 저장이 실패하면 — 몫도 배틀도 없다
  await flushProfile();
  const lastEn = stored().rocketLast.en;
  fakeIdb.failNext('profile');
  const failed = await rocketAdmit(day, 'rocketEn', ROCKET.maxPerDay, rocketNew({ subject: 'en', target: C2, now: later() }));
  assert.deepEqual([failed.ok, failed.why, failed.cur], [false, 'save', null]);
  assert.equal(Number(dailyOf(day).rocketEn) || 0, 0);
  assert.equal(stored().rocketCur, null);
  assert.equal(stored().rocketLast.en, lastEn, '간격 시각도 그대로');
  assert.equal(rocketCurrent(), null, '메모리에만 연 배틀도 없다');
  // 하루 몫 — 영어 3번까지
  for (let i = 0; i < ROCKET.maxPerDay; i++) {
    const { cur, r } = await begin('en', C2, day);
    assert.equal(r.ok, true, `${i + 1}번째`);
    await answer(cur, [true, true, true]);
    await rocketWin(null, cur.id);
  }
  const cap = await begin('en', C2, day);
  assert.deepEqual([cap.r.ok, cap.r.why, cap.r.cur], [false, 'cap', null], '네 번째는 안 열린다');
  assert.equal(dailyOf(day).rocketEn, ROCKET.maxPerDay);
});
