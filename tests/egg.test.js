// 🥚 알: node --test tests/egg.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EGG_NEED, activeEgg, newEgg, eggProgress, pickHatch, eggRule, eggSeenRule, unseenHatched, eggSummary } from '../js/egg.js';
import { buyEggRule, cloneProfile, emptyProfile, mergeStatRecord } from '../js/db.js';
import { EGG_MATH, EGG_ENGLISH, STONE_SHOP, costOf, lootBox, ITEMS } from '../js/items.js';
import { ROSTER, forSubject, isLegendary, isTrueBase, FALSE_BASE } from '../js/pokemon.js';
import { baseOf, evoFrom, pathTo } from '../js/evolve.js';
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

test('🥚 pickHatch: 목표는 희귀 한 마리, 부화는 **그 줄기의 시작형** (원작대로 — 진우 지적 2026-09-27)', () => {
  const math = forSubject(ROSTER, 'math');
  const opt = { baseOf, isLegendary, isTrueBase };
  const { id, target } = pickHatch(math, rarityOf, {}, { ...opt, rng: () => 0 });
  assert.equal(rarityOf(target), 3, '목표는 희귀');
  assert.ok(math.some((r) => r.id === target), '수학 명단에서 뽑는다');
  assert.equal(baseOf(target), id, '부화하는 것은 그 줄기의 시작형');
  assert.equal(evoFrom(id).length, 0, '시작형은 무엇으로부터도 진화해 오지 않는다');

  // 목표를 하나만 남기고 다 잡은 상태 → 그 하나
  const targets = math.filter((r) => rarityOf(r.id) === 3 && !isLegendary(r.id) && isTrueBase(baseOf(r.id))).map((r) => r.id);
  const caught = {}; for (const t of targets.slice(1)) caught[t] = 1;
  assert.equal(pickHatch(math, rarityOf, caught, { ...opt, rng: () => 0.99 }).target, targets[0], '못 잡은 목표 먼저');
  for (const t of targets) caught[t] = 1;
  assert.ok(targets.includes(pickHatch(math, rarityOf, caught, { ...opt, rng: () => 0.5 }).target), '다 잡았으면 아무거나 (한 마리 더)');

  assert.deepEqual(pickHatch([{ id: 25 }], () => 1, {}, opt), { id: 0, target: 0 }, '희귀가 없으면 0');
  // baseOf를 안 주면 목표 그대로 (옛 호출·테스트가 조용히 틀리지 않게)
  assert.equal(pickHatch(math, rarityOf, {}, { rng: () => 0 }).id, pickHatch(math, rarityOf, {}, { rng: () => 0 }).target);

  // 영어 알은 영어 명단에서
  const en = forSubject(ROSTER, 'english');
  const e = pickHatch(en, rarityOf, {}, { ...opt, rng: () => 0.3 });
  assert.ok(en.some((r) => r.id === e.target));
  assert.equal(math.some((r) => r.id === e.target), false);
});

test('🥚 알에서 **다 자란 포켓몬은 안 나온다** — 모든 목표가 시작형으로 부화하고, 그 시작형에서 목표까지 길이 있다', () => {
  for (const subject of ['math', 'english']) {
    const list = forSubject(ROSTER, subject);
    const targets = list.filter((r) => rarityOf(r.id) === 3 && !isLegendary(r.id) && isTrueBase(baseOf(r.id)));
    assert.ok(targets.length >= 15, `${subject} 목표가 너무 적다 (${targets.length})`);
    for (const t of targets) {
      const { id, target } = pickHatch([t], rarityOf, {}, { baseOf, isLegendary, isTrueBase, rng: () => 0 });
      assert.equal(target, t.id);
      assert.equal(evoFrom(id).length, 0, `${t.ko}의 시작형 ${id}이 아직 진화해 온 것이다`);
      assert.equal(isTrueBase(id), true, `${t.ko}의 시작형 ${id}은 원작에선 진화해 온 모습이다 — 알에서 나오면 안 된다`);
      if (id !== target) {
        const path = pathTo(id, target);
        assert.ok(path.length > 0, `${id} → ${t.ko}로 가는 진화 길이 없다 — 알이 영영 목표에 못 닿는다`);
        assert.equal(path[path.length - 1].to, target);
      }
    }
  }
});

test('🥚 전설·환상은 알에서 안 나온다 (원작에서 전설은 알을 낳지 않는다 — 아버님 결정 2026-09-27)', () => {
  for (const subject of ['math', 'english']) {
    const list = forSubject(ROSTER, subject);
    for (let i = 0; i < 400; i++) {
      const { id, target } = pickHatch(list, rarityOf, {}, { baseOf, isLegendary, isTrueBase, rng: () => i / 400 });
      assert.equal(isLegendary(target), false, `${target}(전설)이 알 목표가 됐다`);
      assert.equal(isLegendary(id), false, `${id}(전설)이 알에서 나왔다`);
      assert.notEqual(rarityOf(target), 4, '⭐⭐⭐⭐ 등급도 목표가 아니다');
    }
  }
  // 앱 등급과 원작은 다르다 — 프리져·세레비는 앱에선 ⭐⭐⭐인데 원작에선 전설이다. 이 검사가 그 자리를 지킨다
  for (const id of [144, 145, 146, 251, 483, 484, 487, 643, 644, 716]) {
    assert.equal(rarityOf(id), 3, `${id}은 앱에선 희귀`);
    assert.equal(isLegendary(id), true, `${id}은 원작에선 전설`);
  }
});

test('🧬 줄기 중간 20을 채워 끊겨 있던 진화가 이어진다 (뚜꾸리가 염무왕까지 간다)', () => {
  const CHAINS = [
    [66, 67, 68], [10, 11, 12], [280, 281, 282], [885, 886, 887], [41, 42, 169],
    [74, 75, 76], [179, 180, 181], [252, 253, 254], [304, 305, 306], [328, 329, 330],
    [175, 176, 468], [498, 499, 500], [501, 502, 503], [653, 654, 655], [679, 680, 681],
    [725, 726, 727], [728, 729, 730], [813, 814, 815], [816, 817, 818], [912, 913, 914],
  ];
  const ids = new Set(ROSTER.map((r) => r.id));
  for (const [a, mid, z] of CHAINS) {
    for (const x of [a, mid, z]) assert.ok(ids.has(x), `${x}이 명단에 없다`);
    assert.deepEqual(pathTo(a, z).map((s) => s.to), [mid, z], `${a} → ${mid} → ${z}`);
    assert.equal(baseOf(z), a, `${z}의 시작형은 ${a}`);
    assert.equal(rarityOf(mid) < 3, true, `중간 ${mid}이 희귀면 알 목표로 끼어든다`);
  }
  assert.deepEqual(pathTo(498, 500).map((s) => `Lv${s.at}→${s.to}`), ['Lv5→499', 'Lv10→500'], '뚜꾸리 Lv5 차오꿀, Lv10 염무왕');
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

test('🛟 백업 병합 (Codex 7차 #5): 같은 알은 날짜 합집합·부화·본 것이 되돌아가지 않는다 — "부화한" 쪽이 오래된 저장이어도 늦은 "4일째" 백업이 두 번 부화시키지 못한다 · 다른 쪽에만 있는 부화한 알(묘비)은 남기고, 안 부화한 낯선 알은 안 가져온다(이중 지출)', () => {
  const egg = newEgg('math', 244, 1, 'egg_math');
  const A = { ...emptyProfile(), updatedAt: 100, caught: { 244: 1 }, eggs: [{ ...egg, days: [T(1), T(2), T(3), T(4), T(5)], hatchedAt: 900, seen: true }] };
  const B = { ...emptyProfile(), updatedAt: 200, coins: 50, eggs: [{ ...egg, days: [T(1), T(2), T(3), T(4)] }] };
  for (const [x, y] of [[A, B], [B, A]]) {
    const m = mergeStatRecord('profile', x, y);
    assert.equal(m.eggs.length, 1);
    assert.equal(m.eggs[0].days.length, 5, '날짜 합집합');
    assert.equal(m.eggs[0].hatchedAt, 900, '부화는 되돌아가지 않는다');
    assert.equal(m.eggs[0].seen, true);
    assert.equal(m.caught[244], 1, '소유는 max');
    assert.equal(eggRule(m, 'math', T(6)).ok, false, '품는 알이 아니므로 다시 부화하지 않는다');
  }
  // 묘비: 최근 쪽엔 없는 부화한 알은 남긴다 / 최근 쪽엔 없는 안 부화한 알은 안 가져온다
  const hatchedOnly = { ...emptyProfile(), updatedAt: 100, eggs: [{ ...newEgg('english', 150, 2, 'egg_english'), days: [T(1), T(2), T(3), T(4), T(5)], hatchedAt: 950 }, { ...newEgg('math', 244, 3, 'egg_math'), days: [T(1)] }] };
  const latest = { ...emptyProfile(), updatedAt: 300, eggs: [] };
  const m2 = mergeStatRecord('profile', latest, hatchedOnly);
  assert.deepEqual(m2.eggs.map((e) => e.subject), ['english'], '부화한 영어 알(묘비)만');
  assert.equal(activeEgg(m2, 'math'), null, '낯선 안 부화한 수학 알은 안 가져온다 — 산 것은 코인과 한 묶음');
  // 🌈 이로치는 영구 — 어느 쪽에 있든 남는다
  const withShiny = { ...emptyProfile(), updatedAt: 100, mons: { 25: { shiny: true, gear: 'cap' } } };
  const later = { ...emptyProfile(), updatedAt: 200, mons: { 25: { gear: 'ribbon' } } };
  assert.deepEqual(mergeStatRecord('profile', later, withShiny).mons[25], { gear: 'ribbon', shiny: true }, '꾸밈은 최근 쪽, 이로치는 OR');
  assert.equal(mergeStatRecord('profile', withShiny, later).mons[25].shiny, true);
});

test('🥚 앱에선 시작형처럼 보여도 **원작에서 진화해 온 종**은 알에서 안 나온다 (액스라이즈·메탕구…)', () => {
  // 원작의 진화 전 단계가 명단에 없어서 생긴 25마리. 진우는 포켓몬을 잘 안다 — 이것도 알아챈다
  assert.equal(FALSE_BASE.length, 25);
  for (const id of FALSE_BASE) {
    assert.ok(ROSTER.some((r) => r.id === id), `${id}이 명단에 없다`);
    assert.equal(isTrueBase(id), false);
    assert.equal(evoFrom(id).length, 0, `${id}은 앱 진화표에선 시작형이어야 이 목록에 있을 이유가 있다`);
  }
  assert.equal(isTrueBase(498), true, '뚜꾸리는 원작에서도 시작형');
  assert.equal(isTrueBase(612), false, '액스라이즈는 액스새 → 액수스 → 액스라이즈');

  // 실제로 알에서 안 나온다
  for (const subject of ['math', 'english']) {
    const list = forSubject(ROSTER, subject);
    for (let i = 0; i < 600; i++) {
      const { id } = pickHatch(list, rarityOf, {}, { baseOf, isLegendary, isTrueBase, rng: () => i / 600 });
      assert.equal(isTrueBase(id), true, `알에서 ${id}이 나왔다 — 원작에선 다 자란 모습이다`);
    }
  }

  // 🔢 수학은 21가지, 🎤 영어는 15가지 목표가 남는다 (알이 심심해지지 않을 만큼)
  const count = (subject) => new Set(Array.from({ length: 2000 }, (_, i) =>
    pickHatch(forSubject(ROSTER, subject), rarityOf, {}, { baseOf, isLegendary, isTrueBase, rng: () => i / 2000 }).target)).size;
  assert.equal(count('math'), 21);
  assert.equal(count('english'), 15);
});
