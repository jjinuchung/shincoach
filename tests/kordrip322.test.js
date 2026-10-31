// v322 (2026-10-23 아버님 "국어 문제 좀 더 만들자" → 기본안 "진행하자") — node --test tests/kordrip322.test.js
//  📦 셋째 묶음 b322는 b320이 다 열린 다음 날부터 이어서 하루 두 편 — 두 묶음을 한꺼번에 받아도 하루 네 편이 되지 않게
//  · 그 전에는 한 편도 안 열린다 · b320이 다 열린 지 오래면 b322를 처음 받은 날(적힌 날)부터 · 읽은 글은 잠그지 않는다
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DRIP, startsOf, lockedIds, visibleCards, hasLocked, opensTomorrow, freshIds, dripStartRule, needsStart, withFirst, mergeDrip } from '../js/kordrip.js';

const A = DRIP.bundles.find((b) => b.key === 'b320').order;
const B = DRIP.bundles.find((b) => b.key === 'b322').order;
const ALL = ['K1', 'K118', ...A, ...B].map((id) => ({ id }));
const seenB = (state, today, read) => visibleCards(ALL, state, today, read).map((c) => c.id).filter((id) => B.includes(id));
const seenA = (state, today, read) => visibleCards(ALL, state, today, read).map((c) => c.id).filter((id) => A.includes(id));
const day = (m, d) => `2026-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

test('📦 셋째 묶음 b322 — 열둘 K131~K142 · b320 다음에 이어서 · 포켓몬 글이 첫날 · 6단원 이어질 내용은 끝 무렵', () => {
  assert.deepEqual(DRIP.bundles.map((b) => b.key), ['b320', 'b322', 'b347', 'b372'], '저장 열쇠는 바꾸지 않는다 (v347 넷째 묶음 b347 — kordrip347 · v372 다섯째 b372 — kordrip372)');
  const b = DRIP.bundles[1];
  assert.equal(b.after, 'b320');
  assert.deepEqual(B.slice().sort(), Array.from({ length: 12 }, (_, i) => `K${131 + i}`));
  assert.equal(new Set([...A, ...B]).size, 24, '두 묶음에 겹치는 글 없음');
  assert.equal(B[0], 'K142', '첫날 — 고라파덕');
  assert.deepEqual(B.slice(-2), ['K141', 'K135']);
});

test('🔗 이어서 열림 — b320 시작 10/23 → b320 10/28에 다 열림 → b322는 10/29부터 두 편씩 · 11/3에 모두', () => {
  const S = { b320: day(10, 23), b322: day(10, 24) }; // b322를 b320 이튿날 받음
  assert.deepEqual(startsOf(S, day(10, 24)), { b320: day(10, 23), b322: day(10, 29), b347: day(11, 4), b372: day(11, 10) }, 'v347 b347은 b322가 다 열린 다음 날 · v372 b372는 b347 다음 날');
  for (let d = 23; d <= 28; d++) assert.deepEqual(seenB(S, day(10, d)), [], `10/${d} b322는 아직`);
  assert.equal(seenA(S, day(10, 28)).length, 12);
  assert.deepEqual(seenB(S, day(10, 29)), ['K142', 'K137']);
  assert.deepEqual(seenB(S, day(10, 30)), B.slice(0, 4));
  assert.deepEqual(seenB(S, day(11, 3)), B, '11/3 모두');
  for (let d = 23; d <= 31; d++) {
    const today = day(10, d);
    assert.equal(hasLocked(ALL, S, today), true, `${today} 남은 글 — 「📦 내일 새 글이 와요」`);
  }
  assert.equal(hasLocked(ALL, S, day(11, 3)), false);
  // 날마다 새로 열리는 것은 두 편 — 두 묶음이 겹치는 날 없음
  for (let d = 24; d <= 31; d++) {
    const n = (t) => seenA(S, t).length + seenB(S, t).length;
    assert.equal(n(day(10, d)) - n(day(10, d - 1)), 2, `10/${d} 하루 두 편`);
  }
});

test('📅 b320을 다 연 지 오래 뒤에 b322를 받으면 받은 날부터 · 두 묶음을 한꺼번에 받으면 b320부터 · 시작 날이 없으면 오늘 시작으로', () => {
  const late = { b320: day(10, 1), b322: day(11, 20) };
  assert.deepEqual(seenB(late, day(11, 20)), ['K142', 'K137'], '11/20 받은 날 첫날 몫');
  assert.equal(seenB(late, day(11, 21)).length, 4);
  // 두 묶음을 같은 날 처음 받음(태블릿이 v320·v322를 한꺼번에)
  const both = { b320: day(11, 1), b322: day(11, 1) };
  assert.deepEqual(seenA(both, day(11, 1)), ['K121', 'K123']);
  assert.deepEqual(seenB(both, day(11, 1)), [], '하루 네 편 아님');
  assert.deepEqual(seenB(both, day(11, 7)), ['K142', 'K137']);
  // 시작 날이 하나도 없음 — b320은 오늘 첫날 몫 · b322는 엿새 뒤
  assert.deepEqual(startsOf({}, day(11, 1)), { b322: day(11, 7), b347: day(11, 13), b372: day(11, 19) });
  assert.deepEqual(seenA({}, day(11, 1)), ['K121', 'K123']);
  assert.deepEqual(seenB({}, day(11, 1)), []);
  assert.deepEqual(startsOf({}, 'nope'), {}, '날이 깨지면 이어 셀 수 없음');
  assert.deepEqual(seenB({}, 'nope'), [], '날이 깨지면 b322는 열지 않음');
});

test('⏪ 시계를 뒤로 돌림 — b320은 첫날 몫(그대로) · b322는 한 편도 안 열림 · 읽은 글은 늘 보임', () => {
  const S = { b320: day(10, 23), b322: day(10, 24) };
  assert.deepEqual(seenB(S, day(10, 1)), []);
  assert.deepEqual(seenA(S, day(10, 1)), ['K121', 'K123']);
  assert.deepEqual(seenB(S, day(10, 25), ['K141']), ['K141'], '이미 읽은 글(두 기기·백업)은 보인다');
  assert.ok(!lockedIds(S, day(10, 25), new Set(['K135'])).has('K135'));
});

test('🌱 오늘 새로 열린 글 — b322 첫날은 b322 두 편만 · 그 전날은 b320 마지막 두 편 · b322 시작 전엔 b322 없음', () => {
  const S = { b320: day(10, 23), b322: day(10, 24) };
  assert.deepEqual(freshIds(S, day(10, 28)), ['K129', 'K130']);
  assert.deepEqual(freshIds(S, day(10, 29)), ['K142', 'K137']);
  assert.deepEqual(freshIds(S, day(10, 30), ['K138']), ['K136']);
  assert.deepEqual(freshIds(S, day(11, 3)), ['K141', 'K135']);
  assert.deepEqual(freshIds(S, day(11, 4)), ['K150', 'K151'], 'v347 — 11/4는 b347 첫날 두 편');
  assert.deepEqual(freshIds(S, day(10, 1)), ['K121', 'K123'], '시계를 뒤로 — b320 첫날 몫만');
  assert.deepEqual(freshIds({}, day(11, 1)), ['K121', 'K123'], '시작 날이 없으면 b320 첫날 몫만');
  for (let d = 23; d <= 31; d++) {
    const t = day(10, d);
    const open = visibleCards(ALL, S, t).map((c) => c.id);
    assert.ok(freshIds(S, t).every((id) => open.includes(id)), `${t} 바로가기는 보이는 글에서만`);
  }
});

test('🚩 시작 날 적기·병합 — b322도 원고에 글이 들어오면 처음 받은 날을 적는다 · 이른 날 · 이어 셀 때는 늦은 쪽(앞 묶음 다음 날)', () => {
  const p = { korDrip: { b320: day(10, 23) } };
  assert.equal(needsStart(p.korDrip, ['K121', 'K131']), true);
  assert.equal(needsStart(p.korDrip, ['K121']), false, 'b322 글이 원고에 없으면 적지 않는다');
  assert.deepEqual(dripStartRule(p, day(10, 24), ['K121', 'K142']), { ok: true, set: 1 });
  assert.deepEqual(p.korDrip, { b320: day(10, 23), b322: day(10, 24) });
  assert.equal(dripStartRule(p, day(10, 25), ['K142']).why, 'same');
  assert.deepEqual(mergeDrip({ b322: day(10, 26) }, { b322: day(10, 24) }), { b322: day(10, 24) });
  assert.deepEqual(withFirst({ b320: day(10, 23) }, day(10, 24)), { b320: day(10, 23), b322: day(10, 24), b347: day(10, 24), b372: day(10, 24) });
  assert.equal(startsOf(withFirst({ b320: day(10, 23) }, day(10, 24)), day(10, 24)).b322, day(10, 29));
});

test('🔀 두 기기 병합 — b320 시작이 서로 다르면 이른 날 · b322도 그 다음 날로 당겨진다(따라잡기) · 그래도 b320이 다 열린 다음 날부터 (Codex 127차 #6)', () => {
  const tab = { b320: day(10, 23), b322: day(10, 24) }; // 태블릿
  const pc = { b320: day(10, 20) }; // 다른 기기가 먼저 받음
  const M = mergeDrip(tab, pc);
  assert.deepEqual(M, { b320: day(10, 20), b322: day(10, 24) });
  assert.deepEqual(startsOf(M, day(10, 26)), { b320: day(10, 20), b322: day(10, 26), b347: day(11, 1), b372: day(11, 7) });
  assert.equal(seenA(M, day(10, 25)).length, 12, '10/25 b320 모두');
  assert.deepEqual(seenB(M, day(10, 25)), [], '10/25 b322는 아직');
  assert.deepEqual(seenB(M, day(10, 26)), ['K142', 'K137'], '10/26 b322 첫날 몫');
  assert.deepEqual(freshIds(M, day(10, 25)), ['K129', 'K130']);
  assert.deepEqual(freshIds(M, day(10, 26)), ['K142', 'K137'], '🌱는 b322 두 편만');
  assert.equal(visibleCards(ALL, M, day(10, 26)).length, 2 + 12 + 2);
  // 병합 앞뒤 순서를 바꿔도 같다
  assert.deepEqual(mergeDrip(pc, tab), M);
});

test('📦 문구 — 「내일 새 글이 와요」는 내일 정말 열릴 때만 · b320을 다 읽었는데 b322가 며칠 뒤면 「새 글이 차례로 열려요」 (Codex 127차 #4)', () => {
  const S = { b320: day(10, 23), b322: day(10, 24) };
  // 보통 — 날마다 내일 새 글이 있다 (b320 마지막 날 10/28 → 내일 b322 첫날)
  for (let d = 23; d <= 31; d++) assert.equal(opensTomorrow(ALL, S, day(10, d)), true, `10/${d}`);
  assert.equal(opensTomorrow(ALL, S, day(11, 2)), true, '11/2 → 11/3 마지막 두 편');
  assert.equal(opensTomorrow(ALL, S, day(11, 3)), false, '11/3 모두 열림');
  assert.equal(hasLocked(ALL, S, day(11, 3)), false);
  // 다른 기기에서 b320을 다 읽음 — 10/25·10/26은 오늘과 내일 보이는 글이 같다 · 잠긴 글(b322)은 남았다
  const ids = (t) => visibleCards(ALL, S, t, A).map((c) => c.id);
  assert.deepEqual(ids(day(10, 25)), ids(day(10, 26)));
  for (let d = 24; d <= 27; d++) {
    assert.equal(hasLocked(ALL, S, day(10, d), A), true, `10/${d} 잠긴 글은 남음`);
    assert.equal(opensTomorrow(ALL, S, day(10, d), A), false, `10/${d} 내일은 새 글 없음 → 「차례로 열려요」`);
  }
  assert.equal(opensTomorrow(ALL, S, day(10, 28), A), true, '10/28 → 10/29 b322 첫날');
  // b322의 맨 앞 두 편을 미리 읽었어도(백업) 그 다음 두 편이 열리는 날을 센다
  assert.equal(opensTomorrow(ALL, S, day(10, 28), [...A, 'K142', 'K137']), false, '10/29에 열릴 두 편은 이미 보인다');
  assert.equal(opensTomorrow(ALL, S, day(10, 29), [...A, 'K142', 'K137']), true);
  // 달·해 바뀜 · 날이 깨지면 「내일」이라고 하지 않는다
  assert.equal(opensTomorrow(ALL, { b320: day(10, 31) }, day(10, 31)), true, '10/31 → 11/1');
  assert.equal(opensTomorrow(ALL, { b320: '2026-12-31' }, '2026-12-31'), true, '12/31 → 1/1');
  assert.equal(opensTomorrow(ALL, S, 'nope'), false);
  assert.equal(opensTomorrow([], S, day(10, 23)), false, '글이 없으면 없음');
});
