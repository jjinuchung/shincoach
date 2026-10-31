// v372 (2026-10-30 아버님 「국어 하자」 → 기본안 「추천대로」) — node --test tests/kordrip372.test.js   (kordrip347.test.js 본뜸)
//  📦 다섯째 묶음 b372는 b347이 다 열린 다음 날부터 이어서 하루 두 편 — 네 묶음을 한꺼번에 받아도 하루 두 편
//  · 그 전에는 한 편도 안 열린다 · b347이 다 열린 지 오래면 b372를 처음 받은 날(적힌 날)부터 · 읽은 글은 잠그지 않는다
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DRIP, startsOf, lockedIds, visibleCards, hasLocked, opensTomorrow, freshIds, withFirst, mergeDrip } from '../js/kordrip.js';

const ord = (k) => DRIP.bundles.find((b) => b.key === k).order;
const A = ord('b320');
const B = ord('b322');
const C = ord('b347');
const E = ord('b372');
const ALL = ['K1', 'K118', ...A, ...B, ...C, ...E].map((id) => ({ id }));
const seen = (list) => (state, today, read) => visibleCards(ALL, state, today, read).map((c) => c.id).filter((id) => list.includes(id));
const seenC = seen(C);
const seenE = seen(E);
const day = (m, d) => `2026-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
const S = { b320: day(10, 23), b322: day(10, 24), b347: day(10, 26), b372: day(10, 31) }; // 태블릿이 v372를 10/31에 받는다고 치면

test('📦 다섯째 묶음 b372 — 열둘 K155~K166 · b347 다음에 이어서 · 네 묶음에 겹치는 글 없음', () => {
  assert.deepEqual(DRIP.bundles.map((b) => b.key), ['b320', 'b322', 'b347', 'b372'], '저장 열쇠는 바꾸지 않는다');
  assert.equal(DRIP.bundles[3].after, 'b347');
  assert.deepEqual(E.slice().sort(), Array.from({ length: 12 }, (_, i) => `K${155 + i}`));
  assert.equal(new Set([...A, ...B, ...C, ...E]).size, 48, '네 묶음에 겹치는 글 없음');
  assert.deepEqual(E.slice(0, 2), ['K157', 'K162']);
  assert.deepEqual(E.slice(-2), ['K156', 'K155']);
});

test('🔗 이어서 열림 — b347 11/9에 다 열림 → b372는 11/10부터 두 편씩 · 11/15에 모두 · 날마다 두 편', () => {
  assert.deepEqual(startsOf(S, day(10, 31)), { b320: day(10, 23), b322: day(10, 29), b347: day(11, 4), b372: day(11, 10) });
  for (let d = 1; d <= 9; d++) assert.deepEqual(seenE(S, day(11, d)), [], `11/${d} b372는 아직`);
  assert.equal(seenC(S, day(11, 9)).length, 12, '11/9 b347 모두');
  assert.deepEqual(seenE(S, day(11, 10)), ['K157', 'K162']);
  assert.deepEqual(seenE(S, day(11, 11)), E.slice(0, 4));
  assert.deepEqual(seenE(S, day(11, 15)), E, '11/15 모두');
  assert.equal(hasLocked(ALL, S, day(11, 14)), true);
  assert.equal(hasLocked(ALL, S, day(11, 15)), false);
  const n = (t) => visibleCards(ALL, S, t).length;
  for (let d = 2; d <= 15; d++) assert.equal(n(day(11, d)) - n(day(11, d - 1)), 2, `11/${d} 하루 두 편 — 네 묶음이 겹치는 날 없음`);
  assert.equal(n(day(11, 16)) - n(day(11, 15)), 0, '11/16 — 다 열려 더 없음');
});

test('📅 b347을 다 연 지 오래 뒤에 b372를 받으면 받은 날부터 · 네 묶음을 한꺼번에 받으면 b320부터 차례로 · 시작 날이 없으면 오늘 시작으로', () => {
  const late = { b320: day(10, 1), b322: day(10, 8), b347: day(10, 14), b372: day(12, 1) };
  assert.deepEqual(seenE(late, day(12, 1)), ['K157', 'K162'], '12/1 받은 날 첫날 몫');
  assert.equal(seenE(late, day(12, 2)).length, 4);
  const all = { b320: day(11, 1), b322: day(11, 1), b347: day(11, 1), b372: day(11, 1) };
  assert.deepEqual(seenE(all, day(11, 18)), [], 'b347이 다 열리기 전(11/13~11/18)엔 없음');
  assert.deepEqual(seenE(all, day(11, 19)), ['K157', 'K162'], '11/19 첫날 몫');
  assert.deepEqual(startsOf({}, day(11, 1)), { b322: day(11, 7), b347: day(11, 13), b372: day(11, 19) });
  assert.deepEqual(seenE({}, day(11, 1)), []);
  assert.deepEqual(seenE({}, 'nope'), [], '날이 깨지면 b372는 열지 않음');
});

test('⏪ 시계를 뒤로 · 읽은 글은 늘 보임', () => {
  assert.deepEqual(seenE(S, day(10, 1)), []);
  assert.deepEqual(seenE(S, day(11, 2), ['K155']), ['K155'], '이미 읽은 글(두 기기·백업)은 보인다');
  assert.ok(!lockedIds(S, day(11, 2), new Set(['K159'])).has('K159'));
});

test('🌱 오늘 새로 열린 글 · 📦 내일 새 글 — b347 마지막 날 다음은 b372 첫날 · 다 열린 뒤엔 없음', () => {
  assert.deepEqual(freshIds(S, day(11, 9)), ['K154', 'K152']);
  assert.deepEqual(freshIds(S, day(11, 10)), ['K157', 'K162']);
  assert.deepEqual(freshIds(S, day(11, 15)), ['K156', 'K155']);
  assert.deepEqual(freshIds(S, day(11, 16)), []);
  assert.equal(opensTomorrow(ALL, S, day(11, 9)), true, '11/9 → 11/10 b372 첫날');
  assert.equal(opensTomorrow(ALL, S, day(11, 14)), true);
  assert.equal(opensTomorrow(ALL, S, day(11, 15)), false, '11/15 모두 열림');
});

test('🚩 시작 날 · 🔀 두 기기 병합 — b372도 이른 날 · 이어 셀 때는 앞 묶음 다음 날보다 일찍 열리지 않는다', () => {
  assert.deepEqual(withFirst({ b320: day(10, 23), b322: day(10, 24), b347: day(10, 26) }, day(10, 31)), S);
  assert.deepEqual(mergeDrip({ b372: day(11, 2) }, { b372: day(10, 31) }), { b372: day(10, 31) });
  const pc = { b320: day(10, 20) };
  const M = mergeDrip(S, pc);
  assert.deepEqual(M, { b320: day(10, 20), b322: day(10, 24), b347: day(10, 26), b372: day(10, 31) });
  assert.deepEqual(startsOf(M, day(11, 1)), { b320: day(10, 20), b322: day(10, 26), b347: day(11, 1), b372: day(11, 7) }, 'b320이 당겨지면 뒤 묶음도 따라잡는다');
  assert.deepEqual(seenE(M, day(11, 6)), []);
  assert.deepEqual(seenE(M, day(11, 7)), ['K157', 'K162']);
  assert.deepEqual(mergeDrip(pc, S), M);
});
