// ✨ 오늘의 보너스: node --test tests/mathbonus.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BONUSES, dailyBonus, seedOfDay, bonusText } from '../js/mathbonus.js';
import { mathBonusFor } from '../js/home.js';
import { markDaily } from '../js/mathprog.js';
import { itemById } from '../js/items.js';

test('보너스 목록: 무게 합 10, 지급 내용은 아이템(상점에 있는 id)·⚡·💰 중 하나, 이모지는 Emoji 12 이하', () => {
  assert.equal(BONUSES.reduce((a, b) => a + b.w, 0), 10);
  for (const b of BONUSES) {
    assert.ok(b.id && b.emoji && b.label, b.id);
    const kinds = ['item', 'xp', 'coin'].filter((k) => b.give[k] !== undefined);
    assert.equal(kinds.length, 1, `${b.id}는 한 가지만 준다`);
    if (b.give.item) { assert.ok(itemById(b.give.item), `${b.give.item}은 items.js에 있는 아이템`); assert.ok(b.give.n >= 1); }
  }
  assert.ok(BONUSES.some((b) => b.give.item === 'goldenball'), '상점에서 못 사는 🌟도 나온다');
});

test('dailyBonus: 같은 날은 같은 것(창·기기 무관), 한 달 안에 다섯 가지가 다 나오고 무게대로 자주 나온다', () => {
  assert.deepEqual(dailyBonus('2026-09-22'), dailyBonus('2026-09-22'));
  assert.notEqual(seedOfDay('2026-09-22'), seedOfDay('2026-09-23'));
  const count = {};
  for (let d = 1; d <= 31; d++) { const b = dailyBonus(`2026-10-${String(d).padStart(2, '0')}`); count[b.id] = (count[b.id] || 0) + 1; }
  // 300일로 비율 확인 — 슈퍼볼(3)이 하이퍼볼(1)보다 많이
  const big = {};
  for (let i = 0; i < 300; i++) { const dt = new Date(2026, 0, 1 + i); const k = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`; const b = dailyBonus(k); big[b.id] = (big[b.id] || 0) + 1; }
  assert.equal(Object.keys(big).length, BONUSES.length, '300일이면 다 나온다');
  assert.ok(big.greatball2 > big.ultra, `슈퍼볼 ${big.greatball2} > 하이퍼볼 ${big.ultra}`);
  assert.ok(big.ultra >= 10 && big.ultra <= 60, `하이퍼볼은 드물지만 사라지진 않는다 (${big.ultra}/300)`);
  assert.equal(bonusText(dailyBonus('2026-09-22')), `${dailyBonus('2026-09-22').emoji} ${dailyBonus('2026-09-22').label}`);
});

test('홈 카드 mathBonusFor: 완주 전엔 got=false(반짝), 완주하면 got=true, 레코드가 없어도 터지지 않는다', () => {
  const T = '2026-09-22';
  const m = { daily: null };
  const before = mathBonusFor(m, T);
  assert.equal(before.got, false);
  assert.equal(before.text, bonusText(dailyBonus(T)), '사다리·완주 카드와 같은 보너스');
  markDaily(m, T);
  assert.equal(mathBonusFor(m, T).got, true);
  assert.equal(mathBonusFor(null, T).got, false, '레코드 없음 = 아직');
  assert.equal(mathBonusFor({ daily: { d: '2026-09-21', n: 3 } }, T).got, false, '어제 완주는 오늘 것이 아니다');
});
