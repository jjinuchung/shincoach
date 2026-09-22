// ⚡ 경험치·레벨·잡기 규칙 테스트: node --test tests/xp.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  xpForLevel, levelFromXp, puzzleXp, rarityOf, RARITY_IDS, catchChance, rollCatch,
  gainXp, catchAttempt, previewAttempt, caughtCount, caughtKinds, getLevelInfo, XP,
  streakBefore, streakBonus, STREAK_MIN_DONE, xpToReach,
  askRarity, rarityAskOf, listRarityAsks, decideRarity, resetRarity,
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
  assert.equal(xpToReach(1), 0);
  assert.equal(xpToReach(2), 100);
  assert.equal(xpToReach(5), 640, 'Codex 계산과 일치');
  assert.equal(xpToReach(10), 2340);
});

test('puzzleXp: 틀린 횟수 0/1/2 → 30/20/10, 정답 공개 → 3', () => {
  assert.equal(puzzleXp({ solved: true, wrong: 0 }), 30);
  assert.equal(puzzleXp({ solved: true, wrong: 1 }), 20);
  assert.equal(puzzleXp({ solved: true, wrong: 2 }), 10);
  assert.equal(puzzleXp({ solved: false, wrong: 3 }), XP.puzzleRevealed);
  assert.equal(puzzleXp(null), 3);
});

test('희귀도: 명단 311마리 전부 등급이 있고 겹치지 않음 — 🔢 수학 150은 흔함 60·보통 45·희귀 30·전설 15 (4:3:2:1, 아버님 2026-09-22)', () => {
  const all = Object.values(RARITY_IDS).flat();
  assert.equal(all.length, 311);
  assert.equal(new Set(all).size, 311, '겹침 없음');
  const math = new Set(ROSTER.filter((r) => r.subject === 'math').map((r) => r.id));
  const cnt = [1, 2, 3, 4].map((r) => RARITY_IDS[r].filter((id) => math.has(id)).length);
  assert.deepEqual(cnt, [60, 45, 30, 15]);
  assert.equal(rarityOf(244), 4, '앤테이 전설'); assert.equal(rarityOf(157), 3, '블레이범 희귀'); assert.equal(rarityOf(64), 2, '윤겔라 보통'); assert.equal(rarityOf(77), 1, '포니타 흔함');
  assert.deepEqual(new Set(all), new Set(ROSTER.map((r) => r.id)));
  assert.equal(rarityOf(25), 2, '피카츄 보통');
  assert.equal(rarityOf(150), 4, '뮤츠 전설');
  assert.equal(rarityOf(149), 3, '망나뇽은 전설이 아님 (아이 지적)');
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

test('streakBefore: 어제까지 연속으로 5문장 이상 한 날 수 (오늘 제외, 하루라도 빠지면 끊김)', () => {
  const d = (date, n) => ({ date, doneKeys: Array.from({ length: n }, (_, i) => `k${i}`) });
  const list = [d('2026-09-13', 7), d('2026-09-12', 5), d('2026-09-11', 4), d('2026-09-10', 9), d('2026-09-14', 20)];
  assert.equal(streakBefore(list, '2026-09-14'), 2, '13·12일 연속, 11일은 4문장이라 끊김');
  assert.equal(streakBefore(list, '2026-09-13'), 1);
  assert.equal(streakBefore(list, '2026-09-12'), 0, '11일이 미달');
  assert.equal(streakBefore([], '2026-09-14'), 0);
  assert.equal(streakBefore([d('2026-09-01', 9)], '2026-09-14'), 0, '옛날 기록은 무관');
  assert.equal(streakBefore([d('2026-08-31', 5)], '2026-09-01'), 1, '월 경계');
  assert.equal(STREAK_MIN_DONE, 5);
});

test('streakBonus: 10, 15, 20 … 최대 40', () => {
  assert.equal(streakBonus(1), 10);
  assert.equal(streakBonus(2), 15);
  assert.equal(streakBonus(3), 20);
  assert.equal(streakBonus(7), 40);
  assert.equal(streakBonus(30), 40);
  assert.equal(streakBonus(0), 10);
});

test('희귀도 비율: 흔함 > 보통 > 희귀 > 전설 (전설이 흔하면 특별하지 않다)', () => {
  const count = { 1: 0, 2: 0, 3: 0, 4: 0 };
  for (const r of ROSTER) count[rarityOf(r.id)]++;
  assert.equal(count[1] + count[2] + count[3] + count[4], ROSTER.length);
  assert.ok(count[1] > count[2], `흔함 ${count[1]} > 보통 ${count[2]}`);
  assert.ok(count[2] > count[3], `보통 ${count[2]} > 희귀 ${count[3]}`);
  assert.ok(count[3] > count[4], `희귀 ${count[3]} > 전설 ${count[4]}`);
  assert.ok(count[4] <= ROSTER.length * 0.12, `전설이 너무 많음: ${count[4]}/${ROSTER.length}`);
});

test('전설은 가장 상징적인 것들만 (준전설은 희귀로)', () => {
  const legend = ROSTER.filter((r) => rarityOf(r.id) === 4).map((r) => r.id);
  for (const id of [150, 151, 384, 493]) assert.ok(legend.includes(id), `${id}는 전설이어야`);
  for (const id of [144, 145, 146, 380, 381]) assert.ok(!legend.includes(id), `${id}는 전설이 아니어야 (준전설)`);
});

test('⭐ 등급 옮기기: 아이는 신청만, 부모가 정한다', () => {
  const ID = 1; // 이상해씨 (기본 흔함)
  assert.equal(rarityOf(ID), 1, '기본 등급');

  // 아이가 "이건 희귀 같아요" 신청 → 등급은 아직 그대로
  assert.equal(askRarity(ID, 3), 3);
  assert.equal(rarityAskOf(ID), 3);
  assert.equal(rarityOf(ID), 1, '신청만으로는 안 바뀐다 (잡기 확률이 곧 등급이라)');
  assert.deepEqual(listRarityAsks(), [{ id: ID, from: 1, to: 3 }]);

  // 부모가 거절 → 신청만 사라짐
  assert.equal(decideRarity(ID, false), null);
  assert.equal(rarityAskOf(ID), null);
  assert.equal(rarityOf(ID), 1);

  // 다시 신청 → 부모가 승인 → 그때 옮겨진다
  askRarity(ID, 4);
  assert.equal(decideRarity(ID, true), 4);
  assert.equal(rarityOf(ID), 4, '승인하면 등급이 바뀐다');
  assert.equal(catchChance(rarityOf(ID), 1) < 0.1, true, '전설이 되면 잡기가 어려워진다');

  // 지금 등급과 같은 것을 고르면 신청 취소
  assert.equal(askRarity(ID, 4), null);
  assert.equal(listRarityAsks().length, 0);

  // ⚙ 초기화 → 원래 등급으로
  assert.equal(resetRarity() >= 1, true);
  assert.equal(rarityOf(ID), 1, '초기화하면 명단의 기본 등급');
});

test('⭐ 잘못된 등급 값은 받지 않는다', () => {
  assert.equal(askRarity(4, 0), null);
  assert.equal(askRarity(4, 5), null);
  assert.equal(askRarity(4, 2.5), null);
  assert.equal(rarityAskOf(4), null);
  assert.equal(decideRarity(4, true), null, '신청이 없으면 아무 일도 없다');
});
