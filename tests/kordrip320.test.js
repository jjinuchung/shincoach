// v320 (2026-10-22 아버님 "새 국어 글 한 묶음 시작하자" → 기본안 "이대로 진행") — node --test tests/kordrip320.test.js
//  📦 새 국어 글은 하루에 두 편씩 — 처음 국어를 연 날부터 차례대로 · 아이 화면에서만 잠긴 글을 뺀다 · 읽은 글은 잠그지 않는다 · 시작 날 병합은 이른 날
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DRIP, dripOf, mergeDrip, openCount, lockedIds, visibleCards, hasLocked, dripStartRule, freshIds as freshIdsAll, needsStart, withFirst } from '../js/kordrip.js';

const ORDER = DRIP.bundles.find((b) => b.key === 'b320').order;
const CARDS = ['K1', 'K118', ...ORDER.slice().sort()].map((id) => ({ id }));
const S = { b320: '2026-10-23' };
const ids = (state, today, read) => visibleCards(CARDS, state, today, read).map((c) => c.id);

test('📦 묶음 — 열둘 · 하루 두 편 · 지금 배우는 단원부터 · 포켓몬 글은 첫날과 마지막 날', () => {
  assert.equal(DRIP.perDay, 2);
  assert.deepEqual(ORDER, ['K121', 'K123', 'K124', 'K125', 'K122', 'K119', 'K126', 'K127', 'K128', 'K120', 'K129', 'K130']);
  assert.equal(new Set(ORDER).size, 12);
  assert.deepEqual(DRIP.bundles[0], { key: 'b320', order: ORDER }, '저장 열쇠는 바꾸지 않는다 · 첫 묶음(이어 여는 앞 묶음 없음)');
});

test('📅 날마다 두 편씩 차례대로 열린다 · 묶음에 없는 글은 늘 보인다 · 엿새면 모두', () => {
  assert.deepEqual(ids(S, '2026-10-23'), ['K1', 'K118', 'K121', 'K123'], '첫날');
  assert.deepEqual(ids(S, '2026-10-24').filter((id) => ORDER.includes(id)).sort(), ['K121', 'K123', 'K124', 'K125']);
  for (let d = 0; d < 6; d++) {
    const today = `2026-10-${String(23 + d).padStart(2, '0')}`;
    assert.equal(ids(S, today).filter((id) => ORDER.includes(id)).length, 2 * (d + 1), today);
    assert.equal(hasLocked(CARDS, S, today), d < 5, `${today} 남은 글`);
  }
  assert.equal(ids(S, '2026-12-31').length, CARDS.length, '한참 뒤에도 모두');
  assert.deepEqual([openCount('2026-10-23', '2026-10-23', 12), openCount('2026-10-23', '2026-10-27', 12), openCount('2026-10-23', '2027-01-01', 12)], [2, 10, 12]);
});

test('⏪ 시작 전·시계를 뒤로 돌림·깨진 날은 첫날 몫 · 읽은 글은 잠그지 않는다', () => {
  const first = ['K1', 'K118', 'K121', 'K123'];
  assert.deepEqual(ids({}, '2026-10-23'), first, '시작 날이 없으면 첫날 몫');
  assert.deepEqual(ids(S, '2026-10-01'), first, '시계를 뒤로');
  assert.deepEqual(ids({ b320: '2026-13-45' }, '2026-10-30'), first, '깨진 날');
  assert.deepEqual(ids(null, 'nope'), first);
  assert.ok(ids(S, '2026-10-23', ['K130']).includes('K130'), '이미 읽은 글(두 기기·백업)은 보인다');
  assert.ok(ids(S, '2026-10-23', new Set(['K129'])).includes('K129'));
  assert.ok(lockedIds(S, '2026-10-23').has('K130') && !lockedIds(S, '2026-10-23').has('K121'));
});

test('🔀 시작 날 병합은 묶음마다 이른 날 · 모르는 묶음·깨진 값은 버림', () => {
  assert.deepEqual(mergeDrip({ b320: '2026-10-25' }, { b320: '2026-10-23' }), { b320: '2026-10-23' });
  assert.deepEqual(mergeDrip({ b320: '2026-10-23' }, { b320: '2026-10-25' }), { b320: '2026-10-23' });
  assert.deepEqual(mergeDrip({ b320: '2026-10-23', zz: '2026-01-01' }, 'x'), { b320: '2026-10-23' });
  assert.deepEqual(mergeDrip([1], { b320: 5 }), {});
  assert.deepEqual(dripOf({ b320: '2026-02-30x' }), {});
});

test('📅 달·해가 바뀌어도 하루 두 편씩 (Codex 126차 #4) — 10/31 → 11/1 · 12/31 → 1/1', () => {
  const n = ORDER.length;
  for (const [start, a, b] of [['2026-10-30', '2026-10-31', '2026-11-01'], ['2026-12-30', '2026-12-31', '2027-01-01'], ['2027-02-27', '2027-02-28', '2027-03-01']]) {
    assert.deepEqual([openCount(start, start, n), openCount(start, a, n), openCount(start, b, n)], [2, 4, 6], `${start} → ${b}`);
    assert.equal(ids({ b320: start }, b).filter((id) => ORDER.includes(id)).length, 6, b);
  }
});

test('🌱 오늘 새로 열린 글 (Codex 126차 #6) — 오늘 몫 두 편만 · 읽으면 빠짐 · 어제까지 열린 글은 안 넣음(밀린 목록 없음) · 다 열린 뒤엔 없음', () => {
  const freshIds = (...a) => freshIdsAll(...a).filter((id) => ORDER.includes(id)); // 이 묶음만 (이어 여는 b322는 kordrip322)
  assert.deepEqual(freshIds(S, '2026-10-23'), ['K121', 'K123'], '첫날');
  assert.deepEqual(freshIds(S, '2026-10-24'), ['K124', 'K125'], '둘째 날 — 어제 글은 도감에만');
  assert.deepEqual(freshIds(S, '2026-10-24', ['K124']), ['K125'], '읽은 글은 빠진다');
  assert.deepEqual(freshIds(S, '2026-10-24', new Set(['K124', 'K125'])), [], '오늘 몫을 다 읽음');
  assert.deepEqual(freshIds(S, '2026-10-26'), ['K126', 'K127'], '며칠 안 열었어도 오늘 몫 두 편만');
  assert.deepEqual(freshIds(S, '2026-10-28'), ['K129', 'K130'], '마지막 날');
  assert.deepEqual(freshIds(S, '2026-10-29'), [], '다 열린 뒤');
  assert.deepEqual(freshIds(S, '2027-01-01'), []);
  assert.deepEqual(freshIds(S, '2026-10-01'), ['K121', 'K123'], '시계를 뒤로 — 첫날 몫');
  assert.deepEqual(freshIds(S, '2026-10-22'), ['K121', 'K123'], '하루만 뒤로');
  assert.deepEqual(freshIds({}, '2026-10-23'), ['K121', 'K123'], '시작 날이 없으면 첫날 몫');
  assert.deepEqual(freshIds({ b320: 'bad' }, 'nope'), ['K121', 'K123']);
  for (let d = 0; d < 8; d++) {
    const today = `2026-10-${String(23 + d).padStart(2, '0')}`;
    const open = ids(S, today);
    assert.ok(freshIds(S, today).every((id) => open.includes(id)), `${today} 바로가기는 보이는 글에서만`);
  }
});

test('🔁 시작 날을 못 적었을 때 (Codex 126차 #3) — 적어야 하나(needsStart) · 화면은 이 실행에서 처음 받은 날로(withFirst) · 적힌 날은 그대로', () => {
  assert.equal(needsStart({}, ['K1', 'K121']), true);
  assert.equal(needsStart({ b320: 'oops' }, ['K121']), true, '깨진 날은 없는 것');
  assert.equal(needsStart(S, ['K121']), false, '이미 적힘');
  assert.equal(needsStart({}, ['K1', 'K118']), false, '묶음 글이 아직 원고에 없으면 적지 않는다');
  assert.equal(needsStart({}, null), false);
  assert.equal(withFirst({}, '2026-10-23').b320, '2026-10-23');
  assert.equal(withFirst({ b320: '2026-10-20' }, '2026-10-23').b320, '2026-10-20', '적힌 날이 먼저');
  assert.deepEqual(withFirst({}, ''), {}, '처음 받은 날이 아직 없음');
  assert.deepEqual(withFirst({ zz: '2026-10-01' }, 'bad'), {});
  // 10/23에 못 적고 켜 둔 채 10/24 — 첫날 몫으로 되돌아가지 않고 넷 · 다시 적을 때도 10/23으로
  const st = withFirst({}, '2026-10-23');
  assert.equal(ids(st, '2026-10-24').filter((id) => ORDER.includes(id)).length, 4);
  const p = {};
  dripStartRule(p, '2026-10-23', ['K121']);
  assert.deepEqual(p.korDrip, { b320: st.b320 });
});

test('🚩 시작 규칙 — 원고에 묶음 글이 있고 시작 날이 없을 때만 오늘로 · 다시 열어도 그대로', () => {
  const p = {};
  assert.deepEqual(dripStartRule(p, '2026-10-23', ['K1', 'K121']), { ok: true, set: 1 });
  assert.deepEqual(p.korDrip, { b320: '2026-10-23' });
  assert.equal(dripStartRule(p, '2026-10-24', ['K121']).why, 'same', '이미 시작');
  assert.deepEqual(p.korDrip, { b320: '2026-10-23' });
  assert.equal(dripStartRule({}, '2026-10-24', ['K1', 'K118']).why, 'same', '묶음 글이 아직 원고에 없으면 시작하지 않는다');
  assert.equal(dripStartRule({}, 'bad', ['K121']).why, 'date');
});
