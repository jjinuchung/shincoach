// ⚡ 경험치·레벨·잡기 규칙 테스트: node --test tests/xp.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  xpForLevel, levelFromXp, puzzleXp, rarityOf, RARITY_IDS, catchChance, rollCatch,
  gainXp, catchAttempt, previewAttempt, caughtCount, caughtKinds, getLevelInfo, XP,
} from '../js/xp.js';
import { ROSTER } from '../js/pokemon.js';
import { josa } from '../js/catch.js';

test('xpForLevel / levelFromXp: Lv1→2 100, 레벨마다 +40', () => {
  assert.equal(xpForLevel(1), 100);
  assert.equal(xpForLevel(2), 140);
  assert.equal(xpForLevel(5), 260);
  assert.deepEqual(levelFromXp(0), { level: 1, into: 0, need: 100 });
  assert.deepEqual(levelFromXp(99), { level: 1, into: 99, need: 100 });
  assert.deepEqual(levelFromXp(100), { level: 2, into: 0, need: 140 });
  assert.deepEqual(levelFromXp(250), { level: 3, into: 10, need: 180 });
  assert.equal(levelFromXp(-5).level, 1);
});

test('puzzleXp: 틀린 횟수 0/1/2 → 30/20/10, 정답 공개 → 3', () => {
  assert.equal(puzzleXp({ solved: true, wrong: 0 }), 30);
  assert.equal(puzzleXp({ solved: true, wrong: 1 }), 20);
  assert.equal(puzzleXp({ solved: true, wrong: 2 }), 10);
  assert.equal(puzzleXp({ solved: false, wrong: 3 }), XP.puzzleRevealed);
  assert.equal(puzzleXp(null), 3);
});

test('희귀도: 명단 30마리 전부 등급이 있고 겹치지 않음', () => {
  const all = Object.values(RARITY_IDS).flat();
  assert.equal(all.length, 30);
  assert.deepEqual(new Set(all), new Set(ROSTER.map((r) => r.id)));
  assert.equal(rarityOf(25), 2, '피카츄 보통');
  assert.equal(rarityOf(150), 4, '뮤츠 전설');
  assert.equal(rarityOf(99999), 2, '모르면 보통');
});

test('catchChance: 기본 × (1 + 레벨×5%), 최대 90%', () => {
  assert.ok(Math.abs(catchChance(1, 1) - 0.4725) < 1e-9);
  assert.ok(Math.abs(catchChance(2, 10) - 0.45) < 1e-9);
  assert.ok(Math.abs(catchChance(4, 20) - 0.06) < 1e-9);
  assert.equal(catchChance(1, 100), 0.9);
  assert.equal(rollCatch(0.5, () => 0.4), true);
  assert.equal(rollCatch(0.5, () => 0.6), false);
});

test('프로필: XP 누적·레벨업, 던지기 기록, 또 잡으면 보너스', () => {
  const g1 = gainXp(60);
  assert.equal(g1.leveledUp, false);
  const g2 = gainXp(40);
  assert.equal(g2.leveledUp, true); assert.equal(g2.to, 2);
  assert.equal(getLevelInfo().level, 2);
  const c1 = catchAttempt(25, () => 0);
  assert.equal(c1.caught, true); assert.equal(c1.first, true); assert.equal(c1.count, 1); assert.equal(c1.bonusXp, 0);
  const c2 = catchAttempt(25, () => 0);
  assert.equal(c2.first, false); assert.equal(c2.count, 2); assert.equal(c2.bonusXp, XP.recatch);
  const c3 = catchAttempt(150, () => 0.99);
  assert.equal(c3.caught, false); assert.equal(caughtCount(150), 0);
  assert.equal(caughtCount(25), 2);
  assert.equal(caughtKinds(), 1);
  const before = getLevelInfo().xp;
  const pv = previewAttempt(1, () => 0);
  assert.equal(pv.caught, true);
  assert.equal(caughtCount(1), 0, '연습은 기록 안 함');
  assert.equal(getLevelInfo().xp, before);
});

test('josa: 받침에 따라 이/가', () => {
  assert.equal(josa('피카츄', '이', '가'), '가');
  assert.equal(josa('리자몽', '이', '가'), '이');
  assert.equal(josa('뮤', '이', '가'), '가');
  assert.equal(josa('Pikachu', '이', '가'), '가');
});
