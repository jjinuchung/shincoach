// 🔒 부모가 포켓몬 데려가기: node --test tests/taken.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { haveOf, takenOf, takenUnseen } from '../js/evolve.js';
import { takeMonRule, takenSeenRule, cloneProfile, emptyProfile, mergeStatRecord } from '../js/db.js';

const P = (o = {}) => cloneProfile({ ...emptyProfile(), ...o });

test('🔒 보유 = 잡은 수 − 진화로 보낸 수 − 아빠가 데려간 수', () => {
  assert.equal(haveOf(3, {}), 3);
  assert.equal(haveOf(3, { evo: 1 }), 2);
  assert.equal(haveOf(3, { taken: 1 }), 2);
  assert.equal(haveOf(3, { evo: 1, taken: 1 }), 1);
  assert.equal(haveOf(1, { taken: 5 }), 0, '보유는 음수가 되지 않는다');
  assert.equal(haveOf(2, { taken: -3 }), 2, '깨진 값은 0으로');
  assert.equal(takenOf({ taken: 2 }), 2);
  assert.equal(takenOf(null), 0);
});

test('🔒 데려가면 보유만 빠지고 **도감(잡은 수)은 그대로** — 칸이 남는다', () => {
  const p = P({ caught: { 150: 1 }, mons: {} });
  const r = takeMonRule(p, 150, 1);
  assert.deepEqual([r.ok, r.took, r.left], [true, 1, 0]);
  assert.equal(p.caught[150], 1, '★ caught를 줄이면 백업 복원으로 되살아난다');
  assert.equal(p.mons[150].taken, 1);
  assert.equal(haveOf(p.caught[150], p.mons[150]), 0);
});

test('🔒 가진 것보다 많이는 못 데려간다 · 없는 것은 못 데려간다', () => {
  const p = P({ caught: { 150: 2 }, mons: {} });
  assert.equal(takeMonRule(p, 150, 5).took, 2, '보유만큼만');
  assert.equal(haveOf(p.caught[150], p.mons[150]), 0);
  assert.equal(takeMonRule(p, 150, 1).ok, false, '다 데려간 뒤엔 더 못 가져간다');
  assert.equal(p.mons[150].taken, 2, '없는 것을 또 세지 않는다');
  assert.equal(takeMonRule(P(), 999, 1).ok, false, '안 잡은 종');
  assert.equal(takeMonRule(P({ caught: { 7: 1 } }), 7, 0).ok, false, '0마리는 아무 일도 없다');
});

test('🔒 진화로 이미 내보낸 것은 데려갈 수 없다 (보유가 0이라서)', () => {
  const p = P({ caught: { 7: 1 }, mons: { 7: { evo: 1 } } });
  assert.equal(takeMonRule(p, 7, 1).ok, false);
  assert.equal(p.mons[7].taken, undefined, '엉뚱하게 카운터가 오르지 않는다');
});

test('★ 🔒 다시 잡으면 돌아온다 — 영구 삭제가 아니다 (아버님 요청)', () => {
  const p = P({ caught: { 145: 1 }, mons: {} });
  takeMonRule(p, 145, 1);
  assert.equal(haveOf(p.caught[145], p.mons[145]), 0, '벌 직후엔 없다');
  p.caught[145] += 1;                       // 🎯 다시 잡았다
  assert.equal(haveOf(p.caught[145], p.mons[145]), 1, '★ 다시 잡으면 보유가 돌아온다');
  assert.equal(p.mons[145].taken, 1, '데려간 기록은 남는다 (단조)');
});

test('🤝 데려간 것이 파트너였고 한 마리도 안 남으면 파트너를 비운다', () => {
  const p = P({ caught: { 150: 1 }, mons: {}, partner: 150 });
  takeMonRule(p, 150, 1);
  assert.equal(p.partner, null, '보유 0인 파트너는 ❤️ HP·배틀에서 어긋난다');

  const q = P({ caught: { 150: 2 }, mons: {}, partner: 150 });
  takeMonRule(q, 150, 1);
  assert.equal(q.partner, 150, '한 마리라도 남으면 파트너는 그대로');
});

test('★★ 🔒 옛 백업을 되돌려도 벌이 풀리지 않는다 (taken은 키마다 max)', () => {
  const now = P({ caught: { 150: 1, 151: 1 }, mons: { 150: { taken: 1 }, 151: { taken: 1 } }, updatedAt: 200 });
  const old = P({ caught: { 150: 1, 151: 1 }, mons: {}, updatedAt: 100 });  // 벌 주기 전 백업

  const a = mergeStatRecord('profile', { ...now, id: 'me' }, { ...old, id: 'me' });
  assert.equal(Number(a.mons[150].taken), 1, '★ 옛 백업이 벌을 지우면 안 된다');
  assert.equal(Number(a.mons[151].taken), 1);
  assert.equal(haveOf(a.caught[150], a.mons[150]), 0);

  // 옛 백업이 더 늦게 저장된 것처럼 와도 (mons는 "최근 쪽"을 쓰므로 여기가 위험한 자리)
  const olderButNewer = { ...old, updatedAt: 300 };
  const b = mergeStatRecord('profile', { ...now, id: 'me' }, { ...olderButNewer, id: 'me' });
  assert.equal(Number((b.mons[150] || {}).taken), 1, '★ 최근 쪽이 벌 없는 기록이어도 taken은 살아남는다');
  assert.equal(haveOf(b.caught[150], b.mons[150]), 0);
});

test('🔒 "봤다" 표시도 단조 — 알림을 두 번 띄우지 않는다', () => {
  const p = P({ caught: { 150: 1, 151: 1 }, mons: { 150: { taken: 1 }, 151: { taken: 2, takenSeen: 1 } } });
  assert.equal(takenUnseen(p.mons[150]), 1);
  assert.equal(takenUnseen(p.mons[151]), 1);

  const r = takenSeenRule(p);
  assert.deepEqual([r.ok, r.n], [true, 2]);
  assert.equal(p.mons[150].takenSeen, 1);
  assert.equal(p.mons[151].takenSeen, 2);
  assert.equal(takenUnseen(p.mons[150]), 0);
  assert.equal(takenSeenRule(p).ok, false, '두 번째엔 보여 줄 것이 없다');

  // 병합에서도 살아남는다 (안 그러면 알림이 다시 뜬다)
  const old = P({ caught: { 150: 1 }, mons: { 150: { taken: 1 } }, updatedAt: 300 });
  const m = mergeStatRecord('profile', { ...p, id: 'me', updatedAt: 100 }, { ...old, id: 'me' });
  assert.equal(Number((m.mons[150] || {}).takenSeen), 1);
});

test('🔒 규칙이 입력을 건드리지 않는다 (cloneProfile로 복사한 뒤에 쓴다)', () => {
  const src = P({ caught: { 150: 1 }, mons: {} });
  const copy = cloneProfile(src);
  takeMonRule(copy, 150, 1);
  assert.equal(haveOf(src.caught[150], src.mons[150]), 1, '원본이 바뀌었다');
  assert.equal(haveOf(copy.caught[150], copy.mons[150]), 0);
});

test('★ 🔒 taken.js가 sw.js APP_SHELL에 있어야 한다 (빠지면 오프라인에서 앱이 죽는다)', () => {
  const sw = fs.readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
  assert.ok(sw.includes("'./js/taken.js'"), 'taken.js가 APP_SHELL에 없다');
});
