// 🥚 알: node --test tests/egg.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EGG_NEED, activeEgg, newEgg, eggProgress, pickHatch, eggRule, eggSeenRule, unseenHatched, eggSummary } from '../js/egg.js';
import { buyEggRule, cloneProfile, emptyProfile, mergeStatRecord } from '../js/db.js';
import { EGG_MATH, EGG_ENGLISH, STONE_SHOP, costOf, lootBox, ITEMS } from '../js/items.js';
import { ROSTER, forSubject } from '../js/pokemon.js';
import { rarityOf } from '../js/xp.js';

const T = (n) => `2026-10-${String(n).padStart(2, '0')}`;

test('🥚 알 카탈로그: 코인 200 + 그 과목 스톤 2, 스톤 상점에만, 🎁 상자엔 안 나온다', () => {
  assert.deepEqual(costOf(EGG_MATH), { coins: 200, items: { stone_math: 2 } });
  assert.deepEqual(costOf(EGG_ENGLISH), { coins: 200, items: { stone_english: 2 } });
  assert.ok(STONE_SHOP.includes(EGG_MATH) && STONE_SHOP.includes(EGG_ENGLISH));
  const forbidden = new Set(ITEMS.filter((i) => i.stones).map((i) => i.id));
  for (let i = 0; i <= 40; i++) assert.equal(forbidden.has(lootBox(() => i / 40)), false);
  assert.equal(EGG_NEED, 5);
});

test('pickHatch: 그 과목의 희귀 이상 중 못 잡은 것 먼저, 다 잡았으면 희귀 이상 아무거나, 후보 없으면 0', () => {
  const math = forSubject(ROSTER, 'math');
  const id = pickHatch(math, rarityOf, {}, () => 0);
  assert.ok(rarityOf(id) >= 3, '희귀 이상');
  assert.ok(math.some((r) => r.id === id), '수학 명단');
  // 희귀 이상을 하나만 남기고 다 잡은 상태 → 그 하나
  const rare = math.filter((r) => rarityOf(r.id) >= 3).map((r) => r.id);
  const caught = {}; for (const r of rare.slice(1)) caught[r] = 1;
  assert.equal(pickHatch(math, rarityOf, caught, () => 0.99), rare[0], '못 잡은 것 먼저');
  for (const r of rare) caught[r] = 1;
  assert.ok(rare.includes(pickHatch(math, rarityOf, caught, () => 0.5)), '다 잡았으면 희귀 이상 아무거나 (한 마리 더)');
  assert.equal(pickHatch([{ id: 25 }], () => 1, {}), 0, '희귀 이상이 없으면 0');
  // 영어 알은 영어 명단에서
  const en = forSubject(ROSTER, 'english');
  const eid = pickHatch(en, rarityOf, {}, () => 0.3);
  assert.ok(en.some((r) => r.id === eid) && !math.some((r) => r.id === eid));
});

test('eggRule: 완주한 날은 합집합(같은 날 두 번 = 1), 5일이 차면 그 트랜잭션에서 부화 + 도감 등록, 품는 알이 없으면 ok:false, 부화한 알은 더 안 센다', () => {
  const p = cloneProfile({ coins: 0 });
  assert.deepEqual(eggRule(p, 'math', T(1)), { ok: false }, '알이 없다');
  p.eggs = [newEgg('math', 244, 1000, 'egg_math')];
  assert.equal(activeEgg(p, 'math').monId, 244);
  assert.equal(activeEgg(p, 'english'), null, '과목이 다르면 없음');
  let r = eggRule(p, 'math', T(1), 5000);
  assert.equal(r.ok, true); assert.equal(r.ticked, true); assert.equal(r.hatched, false);
  assert.deepEqual(eggProgress(activeEgg(p, 'math')), { done: 1, need: 5 });
  r = eggRule(p, 'math', T(1), 5001);
  assert.equal(r.ticked, false, '같은 날 두 번 완주해도 하루');
  assert.deepEqual(eggProgress(activeEgg(p, 'math')), { done: 1, need: 5 });
  for (let d = 2; d <= 4; d++) eggRule(p, 'math', T(d), 6000 + d);
  assert.deepEqual(eggProgress(activeEgg(p, 'math')), { done: 4, need: 5 });
  assert.equal(p.caught[244], undefined, '아직');
  r = eggRule(p, 'math', T(5), 9000);
  assert.equal(r.hatched, true);
  assert.equal(p.caught[244], 1, '부화 = 도감 등록 (같은 트랜잭션)');
  assert.equal(activeEgg(p, 'math'), null, '부화한 알은 품는 알이 아니다');
  assert.equal(p.eggs[0].hatchedAt, 9000);
  assert.deepEqual(eggRule(p, 'math', T(6)), { ok: false }, '부화한 뒤엔 새 알을 사야 센다');
  assert.equal(unseenHatched(p).length, 1, '아직 안 보여 준 부화');
  assert.equal(eggSeenRule(p, p.eggs[0].id).ok, true);
  assert.equal(unseenHatched(p).length, 0);
  assert.equal(eggSeenRule(p, p.eggs[0].id).ok, false, '두 번은 안 적는다');
  assert.deepEqual(eggSummary(p), [], '품는 알이 없으니 빈 목록');
});

test('buyEggRule: 코인+스톤을 치르고 알을 붙인다 · 스톤이 모자라면 아무것도 안 바뀜 · 품는 알이 있으면 안 판다 (why: active) · 과목이 다르면 따로 품는다', () => {
  const p = cloneProfile({ coins: 500, items: { stone_math: 3, stone_english: 1 } });
  const egg = newEgg('math', 244, 1000, 'egg_math');
  assert.deepEqual(buyEggRule(p, costOf(EGG_MATH), egg), { ok: true });
  assert.equal(p.coins, 300); assert.equal(p.items.stone_math, 1);
  assert.equal(p.eggs.length, 1);
  const again = newEgg('math', 245, 2000, 'egg_math');
  assert.deepEqual(buyEggRule(p, costOf(EGG_MATH), again), { ok: false, why: 'active' });
  assert.equal(p.coins, 300, '안 팔았으니 그대로');
  const en = newEgg('english', 150, 3000, 'egg_english');
  assert.equal(buyEggRule(p, costOf(EGG_ENGLISH), en).ok, false, '🔶 2개가 없다');
  assert.equal(p.eggs.length, 1);
  p.items.stone_english = 2;
  assert.equal(buyEggRule(p, costOf(EGG_ENGLISH), en).ok, true, '영어 알은 따로');
  assert.equal(p.eggs.length, 2);
  assert.equal(p.items.stone_english, undefined, '0개는 가방에서 지워진다 (addCount)');
});

test('🛟 백업 병합·복사: 알은 코인·가방과 같은 쪽(최근 프로필), days는 깊은 복사, 옛 프로필(eggs 없음)도 빈 배열', () => {
  const cur = { ...emptyProfile(), updatedAt: 200, coins: 10, eggs: [{ ...newEgg('math', 244, 1, 'egg_math'), days: [T(1), T(2)] }] };
  const old = { ...emptyProfile(), updatedAt: 100, coins: 9999, eggs: [] };
  const m = mergeStatRecord('profile', cur, old);
  assert.equal(m.eggs.length, 1); assert.deepEqual(m.eggs[0].days, [T(1), T(2)]);
  assert.notEqual(m.eggs[0].days, cur.eggs[0].days, '배열은 복사');
  assert.deepEqual(mergeStatRecord('profile', old, cur).eggs.map((e) => e.monId), [244], '순서가 바뀌어도 최근 쪽');
  const legacy = cloneProfile({ id: 'me', coins: 1 });
  assert.deepEqual(legacy.eggs, [], '옛 프로필도 터지지 않는다');
  const c = cloneProfile(cur);
  c.eggs[0].days.push(T(3));
  assert.equal(cur.eggs[0].days.length, 2, '복사본을 바꿔도 원본 그대로');
});
