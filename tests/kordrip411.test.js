// v411 (2026-11-10 아버님 「4학년 2학기 마무리로 하고 5학년 1학기 미리보기도 같이 하자」 → 기본안 「추천대로」) — node --test tests/kordrip411.test.js   (kordrip389.test.js 본뜸)
//  📦 아홉째 묶음 b411a(4-2 마무리)는 b389가 다 열린 다음 날부터, 열째 묶음 b411b(5-1 미리보기)는 b411a가 다 열린 다음 날부터 하루 두 편
//  · 두 묶음을 한꺼번에 받아도 하루 두 편 · 그 전에는 한 편도 안 열린다 · 앞 묶음이 다 열린 지 오래면 처음 받은 날(적힌 날)부터 · 읽은 글은 잠그지 않는다
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DRIP, startsOf, lockedIds, visibleCards, opensTomorrow, freshIds, withFirst, mergeDrip } from '../js/kordrip.js';

const ord = (k) => DRIP.bundles.find((b) => b.key === k).order;
const H = ord('b389');
const I = ord('b411a');
const J = ord('b411b');
const ALL = ['K1', 'K118', ...DRIP.bundles.flatMap((b) => b.order)].map((id) => ({ id }));
const seen = (list) => (state, today, read) => visibleCards(ALL, state, today, read).map((c) => c.id).filter((id) => list.includes(id));
const seenI = seen(I);
const seenJ = seen(J);
const day = (m, d, y = 2026) => `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
const S = { b320: day(10, 23), b322: day(10, 24), b347: day(10, 26), b372: day(10, 31), b380: day(11, 2), b382: day(11, 3), b389: day(11, 10), b411a: day(11, 20), b411b: day(11, 20) }; // 태블릿이 v411을 11/20에 받는다고 치면

test('📦 아홉째 b411a·열째 b411b — 열둘씩 K203~K214 · K215~K226 · b389 → b411a → b411b로 이어서 · 아홉 묶음에 겹치는 글 없음', () => {
  assert.deepEqual(DRIP.bundles.map((b) => b.key), ['b320', 'b322', 'b347', 'b372', 'b380', 'b382', 'b389', 'b411a', 'b411b'], '저장 열쇠는 바꾸지 않는다');
  assert.equal(DRIP.bundles.find((b) => b.key === 'b411a').after, 'b389');
  assert.equal(DRIP.bundles.find((b) => b.key === 'b411b').after, 'b411a');
  assert.deepEqual(I, Array.from({ length: 12 }, (_, i) => `K${203 + i}`), '아홉째 — 기본안 차례 그대로');
  assert.deepEqual(J, Array.from({ length: 12 }, (_, i) => `K${215 + i}`), '열째 — 기본안 차례 그대로');
  const ids = DRIP.bundles.flatMap((b) => b.order);
  assert.equal(new Set(ids).size, ids.length, '묶음끼리 겹치는 글 없음');
});

test('🔗 이어서 열림 — b389 12/3에 다 열림 → b411a는 12/4부터 · 12/9에 모두 → b411b는 12/10부터 · 12/15에 모두 · 날마다 두 편', () => {
  assert.deepEqual(startsOf(S, day(11, 20)), { b320: day(10, 23), b322: day(10, 29), b347: day(11, 4), b372: day(11, 10), b380: day(11, 16), b382: day(11, 22), b389: day(11, 28), b411a: day(12, 4), b411b: day(12, 10) });
  assert.deepEqual(seenI(S, day(12, 3)), [], '12/3 — 아직 b389 마지막 날');
  assert.deepEqual(seenI(S, day(12, 4)), ['K203', 'K204'], '12/4 — 🐾 양포켓몬 · ✨ 산울림');
  assert.deepEqual(seenI(S, day(12, 9)), I, '12/9 — 아홉째 모두');
  assert.deepEqual(seenJ(S, day(12, 9)), [], '12/9 — 열째는 아직');
  assert.deepEqual(seenJ(S, day(12, 10)), ['K215', 'K216'], '12/10 — 🐾 도감 번호 · ✨ 돌담에 속삭이는 햇발');
  assert.deepEqual(seenJ(S, day(12, 15)), J, '12/15 — 열째 모두');
  for (let d = 4; d <= 15; d++) {
    const n = (x) => seenI(S, day(12, x)).length + seenJ(S, day(12, x)).length;
    assert.equal(n(d) - n(d - 1), 2, `12/${d} — 하루 두 편`);
  }
});

test('📅 b389를 다 연 지 오래 뒤에 받으면 받은 날부터 · 아홉 묶음을 한꺼번에 받으면 b320부터 차례로 · 시작 날이 없으면 오늘 시작으로', () => {
  const late = { b320: day(10, 1), b322: day(10, 8), b347: day(10, 14), b372: day(10, 20), b380: day(10, 26), b382: day(11, 1), b389: day(11, 7), b411a: day(12, 20), b411b: day(12, 20) };
  assert.equal(startsOf(late, day(12, 20)).b411a, day(12, 20), '앞 묶음이 오래전에 다 열렸으면 받은 날부터');
  assert.equal(startsOf(late, day(12, 20)).b411b, day(12, 26), '열째는 아홉째가 다 열린 다음 날');
  const all = Object.fromEntries(DRIP.bundles.map((b) => [b.key, day(11, 1)]));
  assert.deepEqual(startsOf(all, day(11, 1)), { b320: day(11, 1), b322: day(11, 7), b347: day(11, 13), b372: day(11, 19), b380: day(11, 25), b382: day(12, 1), b389: day(12, 7), b411a: day(12, 13), b411b: day(12, 19) });
  assert.deepEqual(seenJ(all, day(12, 24)), J.slice(0, 12), '12/24 — 열째까지 모두(하루 두 편씩 이어져)');
  assert.deepEqual(startsOf({}, day(11, 1)), { b322: day(11, 7), b347: day(11, 13), b372: day(11, 19), b380: day(11, 25), b382: day(12, 1), b389: day(12, 7), b411a: day(12, 13), b411b: day(12, 19) });
  assert.deepEqual(seenI({}, 'nope'), [], '날이 깨지면 b411a는 열지 않음');
  assert.deepEqual(seenJ({}, 'nope'), [], '날이 깨지면 b411b는 열지 않음');
});

test('⏪ 시계를 뒤로 · 읽은 글은 늘 보임', () => {
  assert.deepEqual(seenI(S, day(10, 1)), []);
  assert.deepEqual(seenJ(S, day(11, 20), ['K226']), ['K226'], '이미 읽은 글(두 기기·백업)은 보인다');
  assert.ok(!lockedIds(S, day(11, 20), new Set(['K212'])).has('K212'));
  assert.ok(lockedIds(S, day(11, 20)).has('K212'));
});

test('🌱 오늘 새로 열린 글 · 📦 내일 새 글 — b389 마지막 날 다음은 b411a 첫날 · b411a 마지막 날 다음은 b411b 첫날 · 다 열린 뒤엔 없음', () => {
  assert.deepEqual(freshIds(S, day(12, 3)), ['K201', 'K202']);
  assert.deepEqual(freshIds(S, day(12, 4)), ['K203', 'K204']);
  assert.deepEqual(freshIds(S, day(12, 9)), ['K213', 'K214']);
  assert.deepEqual(freshIds(S, day(12, 10)), ['K215', 'K216']);
  assert.deepEqual(freshIds(S, day(12, 15)), ['K225', 'K226']);
  assert.deepEqual(freshIds(S, day(12, 16)), []);
  assert.equal(opensTomorrow(ALL, S, day(12, 3)), true, '12/3 → 12/4 b411a 첫날');
  assert.equal(opensTomorrow(ALL, S, day(12, 9)), true, '12/9 → 12/10 b411b 첫날');
  assert.equal(opensTomorrow(ALL, S, day(12, 14)), true);
  assert.equal(opensTomorrow(ALL, S, day(12, 15)), false, '12/15 모두 열림');
  assert.equal(opensTomorrow(ALL, S, day(1, 2, 2027)), false, '해가 바뀌어도 그대로');
});

test('🚩 시작 날 · 🔀 두 기기 병합 — b411a·b411b도 이른 날 · 이어 셀 때는 앞 묶음 다음 날보다 일찍 열리지 않는다', () => {
  const before = { b320: day(10, 23), b322: day(10, 24), b347: day(10, 26), b372: day(10, 31), b380: day(11, 2), b382: day(11, 3), b389: day(11, 10) };
  assert.deepEqual(withFirst(before, day(11, 20)), S, '새 묶음 둘은 처음 받은 날을 적는다');
  assert.deepEqual(mergeDrip({ b411a: day(11, 22), b411b: day(11, 22) }, { b411a: day(11, 20), b411b: day(11, 21) }), { b411a: day(11, 20), b411b: day(11, 21) });
  const M = mergeDrip(S, { b320: day(10, 20) });
  assert.deepEqual(startsOf(M, day(11, 20)), { b320: day(10, 20), b322: day(10, 26), b347: day(11, 1), b372: day(11, 7), b380: day(11, 13), b382: day(11, 19), b389: day(11, 25), b411a: day(12, 1), b411b: day(12, 7) }, 'b320이 당겨지면 뒤 묶음도 따라잡는다');
  assert.deepEqual(seenI(M, day(11, 30)), []);
  assert.deepEqual(seenI(M, day(12, 1)), ['K203', 'K204']);
  assert.deepEqual(seenJ(M, day(12, 7)), ['K215', 'K216']);
});
