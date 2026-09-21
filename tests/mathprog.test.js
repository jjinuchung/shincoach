// 🔢 수학 진도 규칙: node --test tests/mathprog.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  REWARD, PLACED_RECHECK_DAYS, worldOfTitle, seenWorlds, doneIds, ladderOf, dueIds, nowId, needsPlacement,
  applyPlacement, applyRound, roundReward, nameOf, mathSummary,
} from '../js/mathprog.js';
import { emptyMath, mergeMath } from '../js/db.js';
import { FRACTION, diagnosticSet } from '../js/mathgen.js';
import { GRADUATED } from '../js/review.js';

const T = '2026-09-20';
const ids = FRACTION.map((c) => c.id);

test('영상 제목 → 세계, 끝까지 본 것만 (90% 이상)', () => {
  assert.equal(worldOfTitle('토이 스토리 5'), 'toystory');
  assert.equal(worldOfTitle('Toy Story 5 (2026)'), 'toystory');
  assert.equal(worldOfTitle('미니언즈 & 몬스터즈'), 'minions');
  assert.equal(worldOfTitle('모아나'), 'moana');
  assert.equal(worldOfTitle('지우와 피카츄 최고의 순간'), null, '포켓몬 영상은 세계가 따로 없다 (기본이 포켓몬)');
  const w = seenWorlds([
    { title: '토이 스토리 5', pct: 100 }, { title: '미니언즈', pct: 45 }, { title: '모아나', pct: 92 }, { title: '팬텀', pct: 100 },
  ]);
  assert.deepEqual(Object.keys(w).sort(), ['moana', 'pokemon', 'toystory'], '45%인 미니언즈는 아직 안 본 것');
  assert.deepEqual(seenWorlds([]), { pokemon: [] });
});

test('처음 상태: 진단 필요, 사다리 첫 개념이 ▶, 나머지 🔒', () => {
  const m = emptyMath();
  assert.equal(needsPlacement(m), true);
  assert.equal(nowId(m), ids[0]);
  const rows = ladderOf(m, T);
  assert.equal(rows[0].icon, '▶');
  assert.ok(rows.slice(1).every((r) => r.icon === '🔒'));
  assert.deepEqual(dueIds(m, T), []);
});

test('📏 진단: 앞 개념들을 "안다"로 치되 3일 뒤 다시 확인한다', () => {
  const m = emptyMath();
  const qs = diagnosticSet(5);
  const answers = qs.map((q, i) => ({ concept: q.concept, correct: i !== 2 })); // 세 번째(frac.add)를 틀림
  const { startId } = applyPlacement(m, answers, T);
  assert.equal(startId, qs[2].concept);
  assert.equal(needsPlacement(m), false);
  assert.equal(nowId(m), startId, '틀린 개념이 지금 배울 것');
  const known = doneIds(m);
  assert.ok(known.includes('frac.mean') && known.includes('frac.common'));
  assert.ok(!known.includes('frac.add'));
  for (const id of known) {
    assert.equal(m.concepts[id].box, 1);
    assert.equal(m.concepts[id].dueAt, '2026-09-23', `${PLACED_RECHECK_DAYS}일 뒤 재확인`);
  }
  assert.deepEqual(dueIds(m, '2026-09-23'), known, '3일 뒤엔 전부 복습 대상');
  assert.deepEqual(dueIds(m, T), [], '오늘은 아니다');
});

test('개념 한 편: 다 맞히면 done + 라이트너 등록, 틀리면 fails만', () => {
  const m = emptyMath();
  const r1 = applyRound(m, 'frac.mean', { correct: 3, total: 4, missTags: ['위아래를 바꿔 씀'] }, T);
  assert.deepEqual({ passed: r1.passed, first: r1.first, crowned: r1.crowned, review: r1.review }, { passed: false, first: false, crowned: false, review: false });
  assert.equal(m.concepts['frac.mean'].done, false);
  assert.equal(m.concepts['frac.mean'].fails, 1);
  assert.equal(m.miss['위아래를 바꿔 씀'], 1, '오개념이 쌓인다');
  assert.equal(nowId(m), 'frac.mean', '아직 그대로');

  const r2 = applyRound(m, 'frac.mean', { correct: 4, total: 4, missTags: [] }, T);
  assert.equal(r2.passed, true);
  assert.equal(r2.first, true, '처음 통과');
  assert.equal(m.concepts['frac.mean'].done, true);
  assert.equal(m.concepts['frac.mean'].box, 0);
  assert.equal(m.concepts['frac.mean'].dueAt, '2026-09-21', '내일 복습');
  assert.equal(nowId(m), 'frac.same', '다음 개념이 열린다');
  assert.equal(m.rounds, 2);
});

test('복습: 통과하면 box가 오르고, 5번 통과하면 👑 이해 완료 (그날 맞힌 것은 "안다"일 뿐)', () => {
  const m = emptyMath();
  applyRound(m, 'frac.mean', { correct: 4, total: 4, missTags: [] }, T);
  let day = '2026-09-21';
  let crowned = false;
  const dues = [];
  for (let i = 0; i < 6 && !crowned; i++) {
    assert.ok(dueIds(m, day).includes('frac.mean'), `${day}: 복습 대상`);
    const r = applyRound(m, 'frac.mean', { correct: 4, total: 4, missTags: [] }, day);
    assert.equal(r.review, true);
    crowned = r.crowned;
    dues.push(m.concepts['frac.mean'].dueAt);
    day = m.concepts['frac.mean'].dueAt || day;
  }
  assert.ok(crowned, '👑');
  assert.equal(m.concepts['frac.mean'].box, GRADUATED);
  assert.equal(m.concepts['frac.mean'].dueAt, '', '졸업하면 복습 큐에서 빠진다');
  assert.equal(dues[0], '2026-09-23', '1일 뒤 통과 → 2일 뒤');
  assert.ok(ladderOf(m, day)[0].crowned);
  assert.equal(ladderOf(m, day)[0].icon, '👑');

  // 복습에서 틀리면 box가 내려가고 내일 다시
  const m2 = emptyMath();
  applyRound(m2, 'frac.mean', { correct: 4, total: 4, missTags: [] }, T);
  applyRound(m2, 'frac.mean', { correct: 4, total: 4, missTags: [] }, '2026-09-21'); // box 1
  const r = applyRound(m2, 'frac.mean', { correct: 2, total: 4, missTags: ['a', 'b'] }, '2026-09-23');
  assert.equal(r.passed, false);
  assert.equal(m2.concepts['frac.mean'].box, 0);
  assert.equal(m2.concepts['frac.mean'].dueAt, '2026-09-24');
  assert.equal(m2.concepts['frac.mean'].done, true, '한 번 안 것은 done이 안 풀린다 — 사다리는 유지');
});

test('보상: 처음 통과는 잡기 1회, 복습 통과는 잡기 없이, 틀린 편은 정답 수만큼', () => {
  const first = roundReward({ passed: true, first: true, crowned: false, review: false }, 4);
  assert.deepEqual(first, { xp: 4 * REWARD.q.xp + REWARD.firstPass.xp, coin: 4 * REWARD.q.coin + REWARD.firstPass.coin, catchOnce: true });
  const rev = roundReward({ passed: true, first: false, crowned: false, review: true }, 4);
  assert.equal(rev.catchOnce, false);
  assert.equal(rev.xp, 4 * REWARD.q.xp + REWARD.reviewPass.xp);
  const fail = roundReward({ passed: false, first: false, crowned: false, review: false }, 2);
  assert.deepEqual(fail, { xp: 2 * REWARD.q.xp, coin: 2 * REWARD.q.coin, catchOnce: false });
  const crown = roundReward({ passed: true, first: false, crowned: true, review: true }, 4);
  assert.equal(crown.xp, 4 * REWARD.q.xp + REWARD.reviewPass.xp + REWARD.crown.xp);
});

test('두 기기의 수학 진도 병합: 최근에 푼 쪽의 개념 상태, 오개념은 큰 값, 진단은 OR', () => {
  const a = emptyMath();
  applyRound(a, 'frac.mean', { correct: 4, total: 4, missTags: ['x'] }, T);
  a.concepts['frac.mean'].lastAt = 100;
  const b = emptyMath();
  applyRound(b, 'frac.mean', { correct: 4, total: 4, missTags: ['x', 'x', 'y'] }, T);
  applyRound(b, 'frac.mean', { correct: 4, total: 4, missTags: [] }, '2026-09-21');
  b.concepts['frac.mean'].lastAt = 200;
  b.placed.fraction = T;
  const m = mergeMath(a, b);
  assert.equal(m.concepts['frac.mean'].box, 1, '최근에 푼 b의 상태');
  assert.equal(m.miss.x, 2);
  assert.equal(m.miss.y, 1);
  assert.equal(m.placed.fraction, T);
  assert.equal(m.rounds, 2);
  assert.equal(mergeMath(null, b).concepts['frac.mean'].box, 1, '기존이 없어도 된다');
});

test('요약: 배운 수·👑 수·헷갈리는 오개념', () => {
  const m = emptyMath();
  applyRound(m, 'frac.mean', { correct: 2, total: 4, missTags: ['분모끼리 더함', '분모끼리 더함'] }, T);
  applyRound(m, 'frac.mean', { correct: 4, total: 4, missTags: [] }, T);
  const s = mathSummary(m);
  // 줄기가 둘(분수·음수)이 되면서 total은 두 줄기의 합, 줄기별은 stems에 (2026-09-21)
  assert.equal(s.total, FRACTION.length + 9);
  assert.equal(s.done, 1);
  assert.equal(s.crowned, 0);
  assert.deepEqual(s.stems.map((x) => [x.key, x.total, x.done]), [['fraction', FRACTION.length, 1], ['negative', 9, 0]]);
  assert.deepEqual(s.miss[0], { tag: '분모끼리 더함', n: 2 });
  assert.equal(nameOf('frac.add'), '분모가 다른 분수의 덧셈·뺄셈');
  assert.equal(nameOf('zzz'), 'zzz');
});
