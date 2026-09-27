// 🌌 울트라비스트: node --test tests/ultrabeast.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ROSTER, ULTRA_BEASTS, isUltraBeast, forSubject, forHole } from '../js/pokemon.js';
import { ballChance, rarityOf, UB_PENALTY } from '../js/xp.js';
import { BEASTBALL, STONE_SHOP, SHOP_BALLS, BALLS, ITEMS, costOf, lootBox, itemById } from '../js/items.js';
import { TYPE_OF } from '../js/battle.js';
import { REWARD } from '../js/mathprog.js';

test('🌌 울트라비스트 11마리가 명단에 있고, 전부 🔢 수학 전용이다 (아버님 결정)', () => {
  assert.equal(ULTRA_BEASTS.length, 11);
  for (const id of ULTRA_BEASTS) {
    const r = ROSTER.find((x) => x.id === id);
    assert.ok(r, `${id}가 명단에 없다`);
    assert.equal(r.subject, 'math', `${r.ko}는 수학 전용이어야 한다`);
    assert.ok(r.ko && r.en, `${id}: 한글·영문 이름`);
    assert.ok(TYPE_OF[id], `${r.ko}: 타입이 없으면 조용히 노말이 된다`);
    assert.ok(isUltraBeast(id));
  }
  assert.equal(isUltraBeast(25), false, '피카츄는 울트라비스트가 아니다');
  assert.equal(isUltraBeast(800), false, '네크로즈마는 원작에선 UB 취급이지만 명단에선 전설로 둔다');
  // 이름은 PokeAPI에서 받은 것만 (기억으로 쓰면 틀린다 — 전수목을 "데쓰번"으로 잘못 알고 있었다)
  assert.equal(ROSTER.find((r) => r.id === 796).ko, '전수목');
  assert.equal(ROSTER.find((r) => r.id === 805).ko, '차곡차곡');
  assert.equal(ROSTER.find((r) => r.id === 806).ko, '두파팡');
});

test('🌌 울트라비스트는 전설이 아니라 희귀 — 특별함은 등급이 아니라 **잡는 방식**에서 온다', () => {
  for (const id of ULTRA_BEASTS) assert.equal(rarityOf(id), 3, `${id}`);
});

test('⚪ 비스트볼: 울트라비스트에게만 잘 들고, 보통 볼은 거의 안 통한다 (원작 그대로)', () => {
  const lv = 14;
  const r = 3;
  const plain = ballChance('pokeball', r, lv, true);
  const beast = ballChance('beastball', r, lv, true);
  const normalTarget = ballChance('pokeball', r, lv, false);
  assert.ok(plain < 0.05, `보통 볼로 울트라비스트: ${(plain * 100).toFixed(1)}% — 거의 안 잡혀야 한다`);
  assert.ok(Math.abs(plain - normalTarget * UB_PENALTY) < 1e-9, '보통 볼은 정확히 ×0.1');
  assert.ok(beast > 0.8, `비스트볼: ${(beast * 100).toFixed(1)}% — 제대로 잡혀야 한다`);
  assert.ok(beast < 1, '그래도 100%는 마스터볼만');
  // 일반 포켓몬에게 비스트볼은 그냥 몬스터볼과 같다 (원작은 불리하지만 아이가 억울하지 않게)
  assert.equal(ballChance('beastball', r, lv, false), normalTarget);
  // 🟣 마스터볼은 울트라비스트도 확실히
  assert.equal(ballChance('masterball', r, lv, true), 1);
});

test('⚪ 비스트볼 값: 🔷 수학스톤 2 + 💰300, 🧤 스톤 상점에만 (🎁 상자엔 안 나온다)', () => {
  assert.deepEqual(costOf(BEASTBALL), { coins: 300, items: { stone_math: 2 } });
  assert.ok(STONE_SHOP.includes(BEASTBALL));
  assert.ok(ITEMS.includes(BEASTBALL), '아이템 목록에 없으면 itemById가 못 찾아 규칙이 통째로 죽는다');
  assert.equal(itemById('beastball').ub, 5);
  const forbidden = new Set(ITEMS.filter((i) => i.stones).map((i) => i.id));
  for (let i = 0; i <= 40; i++) assert.equal(forbidden.has(lootBox(() => i / 40)), false);
});

test('🏆 여덟 배지 보상에 ⚪ 비스트볼이 들어 있다 (울트라홀이 열리니 첫 만남용)', () => {
  assert.ok(REWARD.gym.beast >= 1);
  assert.equal(REWARD.gym.ball, 'masterball');
});

test('🌌 수학 명단에 섞여 있어 forSubject로 함께 나온다 (울트라홀 게이트는 화면에서)', () => {
  const math = forSubject(ROSTER, 'math').map((r) => r.id);
  for (const id of ULTRA_BEASTS) assert.ok(math.includes(id), `${id}`);
  const eng = forSubject(ROSTER, 'english').map((r) => r.id);
  for (const id of ULTRA_BEASTS) assert.equal(eng.includes(id), false, `${id}는 영어에 나오면 안 된다`);
});

test('🕳 울트라홀 게이트: 열리기 전에는 후보에 아예 없다', () => {
  const list = [{ id: 25 }, { id: 793 }, { id: 7 }, { id: 806 }];
  assert.deepEqual(forHole(list, false).map((c) => c.id), [25, 7], '홀이 닫혀 있으면 🌌는 빠진다');
  assert.deepEqual(forHole(list, true).map((c) => c.id), [25, 793, 7, 806], '열리면 다 나온다');
  assert.deepEqual(forHole([], false), []);
  assert.deepEqual(forHole(null, true), []);
  // 원본을 건드리지 않는다
  const src = [{ id: 793 }];
  forHole(src, true).push({ id: 1 });
  assert.equal(src.length, 1);
});

test('⚪ 비스트볼이 잡기 화면의 볼 고르기에 나온다 (없으면 살 수는 있어도 못 던진다)', () => {
  assert.ok(BALLS.some((b) => b.id === 'beastball'), 'BALLS 목록에 있어야 한다');
  assert.equal(BALLS.filter((b) => b.id === 'beastball').length, 1, '두 번 들어가면 안 된다');
  assert.equal(SHOP_BALLS.some((b) => b.id === 'beastball'), false, '💰 상점이 아니라 🧤 스톤 상점에서만 산다');
});
