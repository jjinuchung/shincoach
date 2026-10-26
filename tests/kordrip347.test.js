// v347 (2026-10-26 아버님 "국어 새 글 넷째 묶음을 먼저" → 원고 검수 "이대로") — node --test tests/kordrip347.test.js
//  📦 넷째 묶음 b347은 b322가 다 열린 다음 날부터 이어서 하루 두 편 — 세 묶음을 한꺼번에 받아도 하루 두 편
//  · 그 전에는 한 편도 안 열린다 · b322가 다 열린 지 오래면 b347을 처음 받은 날(적힌 날)부터 · 읽은 글은 잠그지 않는다
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DRIP, startsOf, lockedIds, visibleCards, hasLocked, opensTomorrow, freshIds, withFirst, mergeDrip } from '../js/kordrip.js';

const ord = (k) => DRIP.bundles.find((b) => b.key === k).order;
const A = ord('b320');
const B = ord('b322');
const C = ord('b347');
const ALL = ['K1', 'K118', ...A, ...B, ...C].map((id) => ({ id }));
const seen = (list) => (state, today, read) => visibleCards(ALL, state, today, read).map((c) => c.id).filter((id) => list.includes(id));
const seenB = seen(B);
const seenC = seen(C);
const day = (m, d) => `2026-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
const S = { b320: day(10, 23), b322: day(10, 24), b347: day(10, 26) }; // 태블릿이 v347을 10/26에 받음

test('📦 넷째 묶음 b347 — 열둘 K143~K154 · b322 다음에 이어서 · 세 묶음에 겹치는 글 없음', () => {
  assert.deepEqual(DRIP.bundles.map((b) => b.key), ['b320', 'b322', 'b347'], '저장 열쇠는 바꾸지 않는다');
  assert.equal(DRIP.bundles[2].after, 'b322');
  assert.deepEqual(C.slice().sort(), Array.from({ length: 12 }, (_, i) => `K${143 + i}`));
  assert.equal(new Set([...A, ...B, ...C]).size, 36, '세 묶음에 겹치는 글 없음');
  assert.deepEqual(C.slice(0, 2), ['K150', 'K151']);
  assert.deepEqual(C.slice(-2), ['K154', 'K152']);
});

test('🔗 이어서 열림 — b322 11/3에 다 열림 → b347은 11/4부터 두 편씩 · 11/9에 모두 · 날마다 두 편', () => {
  assert.deepEqual(startsOf(S, day(10, 26)), { b320: day(10, 23), b322: day(10, 29), b347: day(11, 4) });
  for (let d = 26; d <= 31; d++) assert.deepEqual(seenC(S, day(10, d)), [], `10/${d} b347은 아직`);
  for (let d = 1; d <= 3; d++) assert.deepEqual(seenC(S, day(11, d)), [], `11/${d} b347은 아직`);
  assert.equal(seenB(S, day(11, 3)).length, 12, '11/3 b322 모두');
  assert.deepEqual(seenC(S, day(11, 4)), ['K150', 'K151']);
  assert.deepEqual(seenC(S, day(11, 5)), C.slice(0, 4));
  assert.deepEqual(seenC(S, day(11, 9)), C, '11/9 모두');
  assert.equal(hasLocked(ALL, S, day(11, 8)), true);
  assert.equal(hasLocked(ALL, S, day(11, 9)), false);
  const n = (t) => visibleCards(ALL, S, t).length;
  for (let d = 24; d <= 31; d++) assert.equal(n(day(10, d)) - n(day(10, d - 1)), 2, `10/${d} 하루 두 편`);
  for (let d = 1; d <= 9; d++) {
    const prev = d === 1 ? day(10, 31) : day(11, d - 1);
    assert.equal(n(day(11, d)) - n(prev), 2, `11/${d} 하루 두 편 — 세 묶음이 겹치는 날 없음`);
  }
  assert.equal(n(day(11, 10)) - n(day(11, 9)), 0, '11/10 — 다 열려 더 없음');
});

test('📅 b322를 다 연 지 오래 뒤에 b347을 받으면 받은 날부터 · 세 묶음을 한꺼번에 받으면 b320부터 차례로 · 시작 날이 없으면 오늘 시작으로', () => {
  const late = { b320: day(10, 1), b322: day(10, 8), b347: day(12, 1) };
  assert.deepEqual(seenC(late, day(12, 1)), ['K150', 'K151'], '12/1 받은 날 첫날 몫');
  assert.equal(seenC(late, day(12, 2)).length, 4);
  const all = { b320: day(11, 1), b322: day(11, 1), b347: day(11, 1) };
  assert.deepEqual(seenC(all, day(11, 12)), [], 'b322가 다 열리기 전(11/7~11/12)엔 없음');
  assert.deepEqual(seenC(all, day(11, 13)), ['K150', 'K151'], '11/13 첫날 몫');
  assert.deepEqual(startsOf({}, day(11, 1)), { b322: day(11, 7), b347: day(11, 13) });
  assert.deepEqual(seenC({}, day(11, 1)), []);
  assert.deepEqual(seenC({}, 'nope'), [], '날이 깨지면 b347은 열지 않음');
});

test('⏪ 시계를 뒤로 · 읽은 글은 늘 보임', () => {
  assert.deepEqual(seenC(S, day(10, 1)), []);
  assert.deepEqual(seenC(S, day(11, 2), ['K152']), ['K152'], '이미 읽은 글(두 기기·백업)은 보인다');
  assert.ok(!lockedIds(S, day(11, 2), new Set(['K148'])).has('K148'));
});

test('🌱 오늘 새로 열린 글 · 📦 내일 새 글 — b322 마지막 날 다음은 b347 첫날 · 다 열린 뒤엔 없음', () => {
  assert.deepEqual(freshIds(S, day(11, 3)), ['K141', 'K135']);
  assert.deepEqual(freshIds(S, day(11, 4)), ['K150', 'K151']);
  assert.deepEqual(freshIds(S, day(11, 9)), ['K154', 'K152']);
  assert.deepEqual(freshIds(S, day(11, 10)), []);
  assert.equal(opensTomorrow(ALL, S, day(11, 3)), true, '11/3 → 11/4 b347 첫날');
  assert.equal(opensTomorrow(ALL, S, day(11, 8)), true);
  assert.equal(opensTomorrow(ALL, S, day(11, 9)), false, '11/9 모두 열림');
});

test('🚩 시작 날 · 🔀 두 기기 병합 — b347도 이른 날 · 이어 셀 때는 앞 묶음 다음 날보다 일찍 열리지 않는다', () => {
  assert.deepEqual(withFirst({ b320: day(10, 23), b322: day(10, 24) }, day(10, 26)), S);
  assert.deepEqual(mergeDrip({ b347: day(10, 28) }, { b347: day(10, 26) }), { b347: day(10, 26) });
  const pc = { b320: day(10, 20) };
  const M = mergeDrip(S, pc);
  assert.deepEqual(M, { b320: day(10, 20), b322: day(10, 24), b347: day(10, 26) });
  assert.deepEqual(startsOf(M, day(11, 1)), { b320: day(10, 20), b322: day(10, 26), b347: day(11, 1) }, 'b320이 당겨지면 b322·b347도 따라잡는다');
  assert.deepEqual(seenC(M, day(10, 31)), []);
  assert.deepEqual(seenC(M, day(11, 1)), ['K150', 'K151']);
  assert.deepEqual(mergeDrip(pc, S), M);
});
