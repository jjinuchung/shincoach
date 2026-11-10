// v389 (2026-11-03 아버님 「국어 여덟째 묶음과 논술 여덟째 묶음 지금 하자」 → 기본안 「추천대로」) — node --test tests/kordrip389.test.js   (kordrip382.test.js 본뜸)
//  📦 여덟째 묶음 b389는 b382가 다 열린 다음 날부터 이어서 하루 두 편 — 일곱 묶음을 한꺼번에 받아도 하루 두 편
//  · 그 전에는 한 편도 안 열린다 · b382가 다 열린 지 오래면 b389를 처음 받은 날(적힌 날)부터 · 읽은 글은 잠그지 않는다
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DRIP, startsOf, lockedIds, visibleCards, hasLocked, opensTomorrow, freshIds, withFirst, mergeDrip } from '../js/kordrip.js';

const ord = (k) => DRIP.bundles.find((b) => b.key === k).order;
const A = ord('b320');
const B = ord('b322');
const C = ord('b347');
const E = ord('b372');
const F = ord('b380');
const G = ord('b382');
const H = ord('b389');
const ALL = ['K1', 'K118', ...A, ...B, ...C, ...E, ...F, ...G, ...H].map((id) => ({ id }));
const seen = (list) => (state, today, read) => visibleCards(ALL, state, today, read).map((c) => c.id).filter((id) => list.includes(id));
const seenG = seen(G);
const seenH = seen(H);
const day = (m, d) => `2026-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
const S = { b320: day(10, 23), b322: day(10, 24), b347: day(10, 26), b372: day(10, 31), b380: day(11, 2), b382: day(11, 3), b389: day(11, 10) }; // 태블릿이 v389를 11/10에 받는다고 치면

test('📦 여덟째 묶음 b389 — 열둘 K191~K202 · b382 다음에 이어서 · 일곱 묶음에 겹치는 글 없음', () => {
  assert.deepEqual(DRIP.bundles.map((b) => b.key), ['b320', 'b322', 'b347', 'b372', 'b380', 'b382', 'b389', 'b411a', 'b411b'], '저장 열쇠는 바꾸지 않는다');
  assert.equal(DRIP.bundles[6].after, 'b382');
  assert.deepEqual(H.slice().sort(), Array.from({ length: 12 }, (_, i) => `K${191 + i}`).sort());
  assert.equal(new Set([...A, ...B, ...C, ...E, ...F, ...G, ...H]).size, 84, '일곱 묶음에 겹치는 글 없음');
  assert.deepEqual(H.slice(0, 2), ['K191', 'K192'], '첫날 — 딜리버드 · 호주머니');
  assert.deepEqual(H.slice(-2), ['K201', 'K202'], '끝 — 눈사람 · 토끼의 재판(12월 6단원)');
});

test('🔗 이어서 열림 — b382 11/27에 다 열림 → b389는 11/28부터 두 편씩 · 12/3에 모두 · 날마다 두 편', () => {
  assert.deepEqual(startsOf(S, day(11, 10)), { b320: day(10, 23), b322: day(10, 29), b347: day(11, 4), b372: day(11, 10), b380: day(11, 16), b382: day(11, 22), b389: day(11, 28), b411a: day(12, 4), b411b: day(12, 10) });
  for (let d = 10; d <= 27; d++) assert.deepEqual(seenH(S, day(11, d)), [], `11/${d} b389는 아직`);
  assert.equal(seenG(S, day(11, 27)).length, 12, '11/27 b382 모두');
  assert.deepEqual(seenH(S, day(11, 28)), ['K191', 'K192']);
  assert.deepEqual(seenH(S, day(11, 29)), H.slice(0, 4));
  assert.deepEqual(seenH(S, day(12, 3)), H, '12/3 모두');
  assert.equal(hasLocked(ALL, S, day(12, 2)), true);
  assert.equal(hasLocked(ALL, S, day(12, 3)), false);
  const n = (t) => visibleCards(ALL, S, t).length;
  const at = (k) => { const t = new Date(Date.UTC(2026, 10, 2 + k)); return t.toISOString().slice(0, 10); }; // 11/2부터 k날 뒤
  for (let k = 1; k <= 31; k++) assert.equal(n(at(k)) - n(at(k - 1)), 2, `${at(k)} 하루 두 편 — 일곱 묶음이 겹치는 날 없음`);
  assert.equal(n(day(12, 4)) - n(day(12, 3)), 0, '12/4 — 다 열려 더 없음');
});

test('📅 b382를 다 연 지 오래 뒤에 b389를 받으면 받은 날부터 · 일곱 묶음을 한꺼번에 받으면 b320부터 차례로 · 시작 날이 없으면 오늘 시작으로', () => {
  const late = { b320: day(10, 1), b322: day(10, 8), b347: day(10, 14), b372: day(10, 20), b380: day(10, 26), b382: day(11, 1), b389: day(12, 20) };
  assert.deepEqual(seenH(late, day(12, 20)), ['K191', 'K192'], '12/20 받은 날 첫날 몫');
  assert.equal(seenH(late, day(12, 21)).length, 4);
  const all = { b320: day(11, 1), b322: day(11, 1), b347: day(11, 1), b372: day(11, 1), b380: day(11, 1), b382: day(11, 1), b389: day(11, 1) };
  assert.deepEqual(seenH(all, day(12, 6)), [], 'b382가 다 열리기 전(12/1~12/6)엔 없음');
  assert.deepEqual(seenH(all, day(12, 7)), ['K191', 'K192'], '12/7 첫날 몫');
  assert.deepEqual(startsOf({}, day(11, 1)), { b322: day(11, 7), b347: day(11, 13), b372: day(11, 19), b380: day(11, 25), b382: day(12, 1), b389: day(12, 7), b411a: day(12, 13), b411b: day(12, 19) });
  assert.deepEqual(seenH({}, day(11, 1)), []);
  assert.deepEqual(seenH({}, 'nope'), [], '날이 깨지면 b389는 열지 않음');
});

test('⏪ 시계를 뒤로 · 읽은 글은 늘 보임', () => {
  assert.deepEqual(seenH(S, day(10, 1)), []);
  assert.deepEqual(seenH(S, day(11, 10), ['K202']), ['K202'], '이미 읽은 글(두 기기·백업)은 보인다');
  assert.ok(!lockedIds(S, day(11, 10), new Set(['K195'])).has('K195'));
});

test('🌱 오늘 새로 열린 글 · 📦 내일 새 글 — b382 마지막 날 다음은 b389 첫날 · 다 열린 뒤엔 없음', () => {
  assert.deepEqual(freshIds(S, day(11, 27)), ['K179', 'K190']);
  assert.deepEqual(freshIds(S, day(11, 28)), ['K191', 'K192']);
  assert.deepEqual(freshIds(S, day(12, 3)), ['K201', 'K202']);
  assert.deepEqual(freshIds(S, day(12, 4)), ['K203', 'K204'], 'v411 — 12/4는 b411a 첫날(kordrip411)');
  assert.equal(opensTomorrow(ALL, S, day(11, 27)), true, '11/27 → 11/28 b389 첫날');
  assert.equal(opensTomorrow(ALL, S, day(12, 2)), true);
  assert.equal(opensTomorrow(ALL, S, day(12, 3)), false, '12/3 모두 열림 — ALL은 b389까지의 글(12/4 b411a 첫날은 kordrip411)');
});

test('🚩 시작 날 · 🔀 두 기기 병합 — b389도 이른 날 · 이어 셀 때는 앞 묶음 다음 날보다 일찍 열리지 않는다', () => {
  assert.deepEqual(withFirst({ b320: day(10, 23), b322: day(10, 24), b347: day(10, 26), b372: day(10, 31), b380: day(11, 2), b382: day(11, 3) }, day(11, 10)), { ...S, b411a: day(11, 10), b411b: day(11, 10) }, 'v411 b411a·b411b도 처음 받은 날을 적는다');
  assert.deepEqual(mergeDrip({ b389: day(11, 12) }, { b389: day(11, 10) }), { b389: day(11, 10) });
  const pc = { b320: day(10, 20) };
  const M = mergeDrip(S, pc);
  assert.deepEqual(M, { ...S, b320: day(10, 20) });
  assert.deepEqual(startsOf(M, day(11, 10)), { b320: day(10, 20), b322: day(10, 26), b347: day(11, 1), b372: day(11, 7), b380: day(11, 13), b382: day(11, 19), b389: day(11, 25), b411a: day(12, 1), b411b: day(12, 7) }, 'b320이 당겨지면 뒤 묶음도 따라잡는다');
  assert.deepEqual(seenH(M, day(11, 24)), []);
  assert.deepEqual(seenH(M, day(11, 25)), ['K191', 'K192']);
});
