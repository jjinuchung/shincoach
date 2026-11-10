// v382 (2026-11-02 아버님 「국어 일곱째 묶음 만들자」 → 기본안 「추천대로」) — node --test tests/kordrip382.test.js   (kordrip380.test.js 본뜸)
//  📦 일곱째 묶음 b382는 b380이 다 열린 다음 날부터 이어서 하루 두 편 — 여섯 묶음을 한꺼번에 받아도 하루 두 편
//  · 그 전에는 한 편도 안 열린다 · b380이 다 열린 지 오래면 b382를 처음 받은 날(적힌 날)부터 · 읽은 글은 잠그지 않는다
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
const ALL = ['K1', 'K118', ...A, ...B, ...C, ...E, ...F, ...G].map((id) => ({ id }));
const seen = (list) => (state, today, read) => visibleCards(ALL, state, today, read).map((c) => c.id).filter((id) => list.includes(id));
const seenF = seen(F);
const seenG = seen(G);
const day = (m, d) => `2026-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
const S = { b320: day(10, 23), b322: day(10, 24), b347: day(10, 26), b372: day(10, 31), b380: day(11, 2), b382: day(11, 3) }; // 태블릿이 v382를 11/3에 받는다고 치면

test('📦 일곱째 묶음 b382 — 열둘 K179~K190 · b380 다음에 이어서 · 여섯 묶음에 겹치는 글 없음', () => {
  assert.deepEqual(DRIP.bundles.map((b) => b.key), ['b320', 'b322', 'b347', 'b372', 'b380', 'b382', 'b389', 'b411a', 'b411b'], '저장 열쇠는 바꾸지 않는다 (v389 b389 — kordrip389)');
  assert.equal(DRIP.bundles[5].after, 'b380');
  assert.deepEqual(G.slice().sort(), Array.from({ length: 12 }, (_, i) => `K${179 + i}`));
  assert.equal(new Set([...A, ...B, ...C, ...E, ...F, ...G]).size, 72, '여섯 묶음에 겹치는 글 없음');
  assert.deepEqual(G.slice(0, 2), ['K189', 'K185']);
  assert.deepEqual(G.slice(-2), ['K179', 'K190']);
});

test('🔗 이어서 열림 — b380 11/21에 다 열림 → b382는 11/22부터 두 편씩 · 11/27에 모두 · 날마다 두 편', () => {
  assert.deepEqual(startsOf(S, day(11, 3)), { b320: day(10, 23), b322: day(10, 29), b347: day(11, 4), b372: day(11, 10), b380: day(11, 16), b382: day(11, 22), b389: day(11, 28), b411a: day(12, 4), b411b: day(12, 10) });
  for (let d = 3; d <= 21; d++) assert.deepEqual(seenG(S, day(11, d)), [], `11/${d} b382는 아직`);
  assert.equal(seenF(S, day(11, 21)).length, 12, '11/21 b380 모두');
  assert.deepEqual(seenG(S, day(11, 22)), ['K189', 'K185']);
  assert.deepEqual(seenG(S, day(11, 23)), G.slice(0, 4));
  assert.deepEqual(seenG(S, day(11, 27)), G, '11/27 모두');
  assert.equal(hasLocked(ALL, S, day(11, 26)), true);
  assert.equal(hasLocked(ALL, S, day(11, 27)), false);
  const n = (t) => visibleCards(ALL, S, t).length;
  for (let d = 2; d <= 27; d++) assert.equal(n(day(11, d)) - n(day(11, d - 1)), 2, `11/${d} 하루 두 편 — 여섯 묶음이 겹치는 날 없음`);
  assert.equal(n(day(11, 28)) - n(day(11, 27)), 0, '11/28 — 다 열려 더 없음');
});

test('📅 b380을 다 연 지 오래 뒤에 b382를 받으면 받은 날부터 · 여섯 묶음을 한꺼번에 받으면 b320부터 차례로 · 시작 날이 없으면 오늘 시작으로', () => {
  const late = { b320: day(10, 1), b322: day(10, 8), b347: day(10, 14), b372: day(10, 20), b380: day(10, 26), b382: day(12, 10) };
  assert.deepEqual(seenG(late, day(12, 10)), ['K189', 'K185'], '12/10 받은 날 첫날 몫');
  assert.equal(seenG(late, day(12, 11)).length, 4);
  const all = { b320: day(11, 1), b322: day(11, 1), b347: day(11, 1), b372: day(11, 1), b380: day(11, 1), b382: day(11, 1) };
  assert.deepEqual(seenG(all, day(11, 30)), [], 'b380이 다 열리기 전(11/25~11/30)엔 없음');
  assert.deepEqual(seenG(all, day(12, 1)), ['K189', 'K185'], '12/1 첫날 몫');
  assert.deepEqual(startsOf({}, day(11, 1)), { b322: day(11, 7), b347: day(11, 13), b372: day(11, 19), b380: day(11, 25), b382: day(12, 1), b389: day(12, 7), b411a: day(12, 13), b411b: day(12, 19) });
  assert.deepEqual(seenG({}, day(11, 1)), []);
  assert.deepEqual(seenG({}, 'nope'), [], '날이 깨지면 b382는 열지 않음');
});

test('⏪ 시계를 뒤로 · 읽은 글은 늘 보임', () => {
  assert.deepEqual(seenG(S, day(10, 1)), []);
  assert.deepEqual(seenG(S, day(11, 3), ['K190']), ['K190'], '이미 읽은 글(두 기기·백업)은 보인다');
  assert.ok(!lockedIds(S, day(11, 3), new Set(['K183'])).has('K183'));
});

test('🌱 오늘 새로 열린 글 · 📦 내일 새 글 — b380 마지막 날 다음은 b382 첫날 · 다 열린 뒤엔 없음', () => {
  assert.deepEqual(freshIds(S, day(11, 21)), ['K178', 'K168']);
  assert.deepEqual(freshIds(S, day(11, 22)), ['K189', 'K185']);
  assert.deepEqual(freshIds(S, day(11, 27)), ['K179', 'K190']);
  assert.deepEqual(freshIds(S, day(11, 28)), ['K191', 'K192'], 'v389 — 11/28은 b389 첫날(kordrip389)');
  assert.equal(opensTomorrow(ALL, S, day(11, 21)), true, '11/21 → 11/22 b382 첫날');
  assert.equal(opensTomorrow(ALL, S, day(11, 26)), true);
  assert.equal(opensTomorrow(ALL, S, day(11, 27)), false, '11/27 모두 열림');
});

test('🚩 시작 날 · 🔀 두 기기 병합 — b382도 이른 날 · 이어 셀 때는 앞 묶음 다음 날보다 일찍 열리지 않는다', () => {
  assert.deepEqual(withFirst({ b320: day(10, 23), b322: day(10, 24), b347: day(10, 26), b372: day(10, 31), b380: day(11, 2) }, day(11, 3)), { ...S, b389: day(11, 3), b411a: day(11, 3), b411b: day(11, 3) }, 'v389 b389도 처음 받은 날을 적는다');
  assert.deepEqual(mergeDrip({ b382: day(11, 5) }, { b382: day(11, 3) }), { b382: day(11, 3) });
  const pc = { b320: day(10, 20) };
  const M = mergeDrip(S, pc);
  assert.deepEqual(M, { ...S, b320: day(10, 20) });
  assert.deepEqual(startsOf(M, day(11, 3)), { b320: day(10, 20), b322: day(10, 26), b347: day(11, 1), b372: day(11, 7), b380: day(11, 13), b382: day(11, 19), b389: day(11, 25), b411a: day(12, 1), b411b: day(12, 7) }, 'b320이 당겨지면 뒤 묶음도 따라잡는다');
  assert.deepEqual(seenG(M, day(11, 18)), []);
  assert.deepEqual(seenG(M, day(11, 19)), ['K189', 'K185']);
  assert.deepEqual(mergeDrip(pc, S), M);
});
