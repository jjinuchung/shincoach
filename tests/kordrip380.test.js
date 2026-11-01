// v380 (2026-11-01 아버님 「국어 여섯째 묶음 가자」 → 기본안 「추천대로」) — node --test tests/kordrip380.test.js   (kordrip372.test.js 본뜸)
//  📦 여섯째 묶음 b380은 b372가 다 열린 다음 날부터 이어서 하루 두 편 — 다섯 묶음을 한꺼번에 받아도 하루 두 편
//  · 그 전에는 한 편도 안 열린다 · b372가 다 열린 지 오래면 b380을 처음 받은 날(적힌 날)부터 · 읽은 글은 잠그지 않는다
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DRIP, startsOf, lockedIds, visibleCards, hasLocked, opensTomorrow, freshIds, withFirst, mergeDrip } from '../js/kordrip.js';

const ord = (k) => DRIP.bundles.find((b) => b.key === k).order;
const A = ord('b320');
const B = ord('b322');
const C = ord('b347');
const E = ord('b372');
const F = ord('b380');
const ALL = ['K1', 'K118', ...A, ...B, ...C, ...E, ...F].map((id) => ({ id }));
const seen = (list) => (state, today, read) => visibleCards(ALL, state, today, read).map((c) => c.id).filter((id) => list.includes(id));
const seenE = seen(E);
const seenF = seen(F);
const day = (m, d) => `2026-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
const S = { b320: day(10, 23), b322: day(10, 24), b347: day(10, 26), b372: day(10, 31), b380: day(11, 2) }; // 태블릿이 v380을 11/2에 받는다고 치면

test('📦 여섯째 묶음 b380 — 열둘 K167~K178 · b372 다음에 이어서 · 다섯 묶음에 겹치는 글 없음', () => {
  assert.deepEqual(DRIP.bundles.map((b) => b.key), ['b320', 'b322', 'b347', 'b372', 'b380'], '저장 열쇠는 바꾸지 않는다');
  assert.equal(DRIP.bundles[4].after, 'b372');
  assert.deepEqual(F.slice().sort(), Array.from({ length: 12 }, (_, i) => `K${167 + i}`));
  assert.equal(new Set([...A, ...B, ...C, ...E, ...F]).size, 60, '다섯 묶음에 겹치는 글 없음');
  assert.deepEqual(F.slice(0, 2), ['K167', 'K172']);
  assert.deepEqual(F.slice(-2), ['K178', 'K168']);
});

test('🔗 이어서 열림 — b372 11/15에 다 열림 → b380은 11/16부터 두 편씩 · 11/21에 모두 · 날마다 두 편', () => {
  assert.deepEqual(startsOf(S, day(11, 2)), { b320: day(10, 23), b322: day(10, 29), b347: day(11, 4), b372: day(11, 10), b380: day(11, 16) });
  for (let d = 2; d <= 15; d++) assert.deepEqual(seenF(S, day(11, d)), [], `11/${d} b380은 아직`);
  assert.equal(seenE(S, day(11, 15)).length, 12, '11/15 b372 모두');
  assert.deepEqual(seenF(S, day(11, 16)), ['K167', 'K172']);
  assert.deepEqual(seenF(S, day(11, 17)), F.slice(0, 4));
  assert.deepEqual(seenF(S, day(11, 21)), F, '11/21 모두');
  assert.equal(hasLocked(ALL, S, day(11, 20)), true);
  assert.equal(hasLocked(ALL, S, day(11, 21)), false);
  const n = (t) => visibleCards(ALL, S, t).length;
  for (let d = 2; d <= 21; d++) assert.equal(n(day(11, d)) - n(day(11, d - 1)), 2, `11/${d} 하루 두 편 — 다섯 묶음이 겹치는 날 없음`);
  assert.equal(n(day(11, 22)) - n(day(11, 21)), 0, '11/22 — 다 열려 더 없음');
});

test('📅 b372를 다 연 지 오래 뒤에 b380을 받으면 받은 날부터 · 다섯 묶음을 한꺼번에 받으면 b320부터 차례로 · 시작 날이 없으면 오늘 시작으로', () => {
  const late = { b320: day(10, 1), b322: day(10, 8), b347: day(10, 14), b372: day(10, 20), b380: day(12, 1) };
  assert.deepEqual(seenF(late, day(12, 1)), ['K167', 'K172'], '12/1 받은 날 첫날 몫');
  assert.equal(seenF(late, day(12, 2)).length, 4);
  const all = { b320: day(11, 1), b322: day(11, 1), b347: day(11, 1), b372: day(11, 1), b380: day(11, 1) };
  assert.deepEqual(seenF(all, day(11, 24)), [], 'b372가 다 열리기 전(11/19~11/24)엔 없음');
  assert.deepEqual(seenF(all, day(11, 25)), ['K167', 'K172'], '11/25 첫날 몫');
  assert.deepEqual(startsOf({}, day(11, 1)), { b322: day(11, 7), b347: day(11, 13), b372: day(11, 19), b380: day(11, 25) });
  assert.deepEqual(seenF({}, day(11, 1)), []);
  assert.deepEqual(seenF({}, 'nope'), [], '날이 깨지면 b380은 열지 않음');
});

test('⏪ 시계를 뒤로 · 읽은 글은 늘 보임', () => {
  assert.deepEqual(seenF(S, day(10, 1)), []);
  assert.deepEqual(seenF(S, day(11, 3), ['K168']), ['K168'], '이미 읽은 글(두 기기·백업)은 보인다');
  assert.ok(!lockedIds(S, day(11, 3), new Set(['K170'])).has('K170'));
});

test('🌱 오늘 새로 열린 글 · 📦 내일 새 글 — b372 마지막 날 다음은 b380 첫날 · 다 열린 뒤엔 없음', () => {
  assert.deepEqual(freshIds(S, day(11, 15)), ['K156', 'K155']);
  assert.deepEqual(freshIds(S, day(11, 16)), ['K167', 'K172']);
  assert.deepEqual(freshIds(S, day(11, 21)), ['K178', 'K168']);
  assert.deepEqual(freshIds(S, day(11, 22)), []);
  assert.equal(opensTomorrow(ALL, S, day(11, 15)), true, '11/15 → 11/16 b380 첫날');
  assert.equal(opensTomorrow(ALL, S, day(11, 20)), true);
  assert.equal(opensTomorrow(ALL, S, day(11, 21)), false, '11/21 모두 열림');
});

test('🚩 시작 날 · 🔀 두 기기 병합 — b380도 이른 날 · 이어 셀 때는 앞 묶음 다음 날보다 일찍 열리지 않는다', () => {
  assert.deepEqual(withFirst({ b320: day(10, 23), b322: day(10, 24), b347: day(10, 26), b372: day(10, 31) }, day(11, 2)), S);
  assert.deepEqual(mergeDrip({ b380: day(11, 5) }, { b380: day(11, 2) }), { b380: day(11, 2) });
  const pc = { b320: day(10, 20) };
  const M = mergeDrip(S, pc);
  assert.deepEqual(M, { b320: day(10, 20), b322: day(10, 24), b347: day(10, 26), b372: day(10, 31), b380: day(11, 2) });
  assert.deepEqual(startsOf(M, day(11, 2)), { b320: day(10, 20), b322: day(10, 26), b347: day(11, 1), b372: day(11, 7), b380: day(11, 13) }, 'b320이 당겨지면 뒤 묶음도 따라잡는다');
  assert.deepEqual(seenF(M, day(11, 12)), []);
  assert.deepEqual(seenF(M, day(11, 13)), ['K167', 'K172']);
  assert.deepEqual(mergeDrip(pc, S), M);
});
