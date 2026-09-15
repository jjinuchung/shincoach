// 🔁 복습(간격 반복) 규칙 테스트: node --test tests/review.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  addDays, daysBetween, nextDue, enroll, schedule, isDue, stageIcon,
  pickReviews, reviewSummary, roundReward,
  REVIEW_INTERVALS, GRADUATED, STAGES, DEFAULT_COUNT, REWARD,
} from '../js/review.js';

/** 테스트용 문장 기록 만들기 */
function rec(patch = {}) {
  return {
    key: patch.key || `it|${patch.start || 0}`, itemId: 'it', start: 0, en: 'Hello there.', ko: '안녕.',
    plays: 1, listens: 1, done: true, seconds: 3,
    speakAttempts: 1, speakPass: 1, speakFail: 0, speakSkipped: 0, bestRatio: 0.6, lastRatio: 0.6, lastAt: 0,
    box: 0, dueAt: '2026-09-15', reviews: 0, reviewPass: 0,
    ...patch,
  };
}

test('addDays: 월말·연말·윤년을 넘어도 맞는 날짜', () => {
  assert.equal(addDays('2026-09-15', 1), '2026-09-16');
  assert.equal(addDays('2026-09-30', 1), '2026-10-01');
  assert.equal(addDays('2026-12-31', 1), '2027-01-01');
  assert.equal(addDays('2026-09-15', 14), '2026-09-29');
  assert.equal(addDays('2024-02-28', 1), '2024-02-29', '윤년');
  assert.equal(addDays('2026-02-28', 1), '2026-03-01', '평년');
  assert.equal(addDays('2026-09-15', 0), '2026-09-15');
});

test('daysBetween: 지난 날짜일수록 양수', () => {
  assert.equal(daysBetween('2026-09-15', '2026-09-15'), 0);
  assert.equal(daysBetween('2026-09-10', '2026-09-15'), 5);
  assert.equal(daysBetween('2026-09-20', '2026-09-15'), -5);
  assert.equal(daysBetween('2026-08-31', '2026-09-01'), 1);
});

test('nextDue: box 단계마다 1·2·4·7·14일 뒤', () => {
  assert.deepEqual(REVIEW_INTERVALS, [1, 2, 4, 7, 14]);
  assert.equal(nextDue(0, '2026-09-15'), '2026-09-16');
  assert.equal(nextDue(1, '2026-09-15'), '2026-09-17');
  assert.equal(nextDue(2, '2026-09-15'), '2026-09-19');
  assert.equal(nextDue(3, '2026-09-15'), '2026-09-22');
  assert.equal(nextDue(4, '2026-09-15'), '2026-09-29');
  assert.equal(nextDue(9, '2026-09-15'), '2026-09-29', '범위를 벗어나면 마지막 간격');
  assert.equal(nextDue(-3, '2026-09-15'), '2026-09-16', '음수는 0단계로');
});

test('enroll: 완료한 문장은 box 0 · 내일부터 복습', () => {
  assert.deepEqual(enroll('2026-09-15'), { box: 0, dueAt: '2026-09-16' });
});

test('schedule 통과: box가 한 단계 오르고 간격이 늘어난다', () => {
  assert.deepEqual(schedule(0, true, '2026-09-15'), { box: 1, dueAt: '2026-09-17' });
  assert.deepEqual(schedule(1, true, '2026-09-15'), { box: 2, dueAt: '2026-09-19' });
  assert.deepEqual(schedule(3, true, '2026-09-15'), { box: 4, dueAt: '2026-09-29' });
});

test('schedule 통과로 졸업(👑): 더 이상 안 나온다', () => {
  const r = schedule(4, true, '2026-09-15');
  assert.deepEqual(r, { box: GRADUATED, dueAt: '' });
  assert.equal(isDue({ ...rec(), ...r }, '2027-01-01'), false, '졸업한 문장은 영영 due가 아님');
});

test('schedule 미달: 한 단계 내려가고 내일 다시 (0 아래로는 안 감)', () => {
  assert.deepEqual(schedule(3, false, '2026-09-15'), { box: 2, dueAt: '2026-09-16' });
  assert.deepEqual(schedule(1, false, '2026-09-15'), { box: 0, dueAt: '2026-09-16' });
  assert.deepEqual(schedule(0, false, '2026-09-15'), { box: 0, dueAt: '2026-09-16' });
});

test('isDue: 오늘 이전이면 대상, 미래·미등록·졸업은 제외', () => {
  const today = '2026-09-15';
  assert.equal(isDue(rec({ dueAt: '2026-09-15' }), today), true, '오늘');
  assert.equal(isDue(rec({ dueAt: '2026-09-10' }), today), true, '밀린 것');
  assert.equal(isDue(rec({ dueAt: '2026-09-16' }), today), false, '내일');
  assert.equal(isDue(rec({ dueAt: '' }), today), false, '아직 복습에 안 들어온 문장');
  assert.equal(isDue(rec({ box: GRADUATED, dueAt: '2026-09-01' }), today), false, '졸업');
  assert.equal(isDue(null, today), false);
});

test('pickReviews: 넘긴 문장 → box 낮은 순 → 점수 낮은 순 → 오래 밀린 순', () => {
  const today = '2026-09-15';
  const list = [
    rec({ key: 'a', start: 10, box: 0, bestRatio: 0.9, dueAt: '2026-09-15' }),
    rec({ key: 'b', start: 20, box: 2, bestRatio: 0.5, dueAt: '2026-09-15' }),
    rec({ key: 'c', start: 30, box: 3, bestRatio: 0.4, dueAt: '2026-09-10', speakSkipped: 2 }), // 넘긴 적 있음
    rec({ key: 'd', start: 40, box: 0, bestRatio: 0.3, dueAt: '2026-09-15' }),
    rec({ key: 'e', start: 50, box: 1, bestRatio: 0.8, dueAt: '2026-09-16' }),                  // 내일 → 제외
  ];
  const got = pickReviews(list, today, 3).map((r) => r.key);
  assert.deepEqual(got, ['c', 'd', 'a'], '넘긴 c가 먼저, 같은 box 0끼리는 점수 낮은 d가 먼저');
  assert.equal(pickReviews(list, today, 10).length, 4, 'due 아닌 e는 절대 안 나옴');
});

test('pickReviews: 같은 조건이면 오래 밀린 문장이 먼저', () => {
  const today = '2026-09-15';
  const list = [
    rec({ key: 'new', start: 10, dueAt: '2026-09-15' }),
    rec({ key: 'old', start: 20, dueAt: '2026-09-05' }),
  ];
  assert.deepEqual(pickReviews(list, today, 2).map((r) => r.key), ['old', 'new']);
});

test('pickReviews: 대상이 없거나 개수가 0이면 빈 배열', () => {
  const today = '2026-09-15';
  assert.deepEqual(pickReviews([], today, 3), []);
  assert.deepEqual(pickReviews(null, today, 3), []);
  assert.deepEqual(pickReviews([rec({ dueAt: '2026-09-20' })], today, 3), [], '전부 미래');
  assert.deepEqual(pickReviews([rec()], today, 0), [], '⚙에서 복습을 끈 경우');
});

test('pickReviews: 요청한 수보다 적게 밀려 있으면 있는 만큼만', () => {
  const today = '2026-09-15';
  const list = [rec({ key: 'a', start: 10 }), rec({ key: 'b', start: 20 })];
  assert.equal(pickReviews(list, today, 5).length, 2);
});

test('reviewSummary: 오늘 할 것 / 기다리는 것 / 졸업', () => {
  const today = '2026-09-15';
  const list = [
    rec({ dueAt: '2026-09-15' }),
    rec({ dueAt: '2026-09-10' }),
    rec({ dueAt: '2026-09-20' }),
    rec({ box: GRADUATED, dueAt: '' }),
    rec({ dueAt: '' }), // 아직 복습에 안 들어옴
  ];
  assert.deepEqual(reviewSummary(list, today), { dueCount: 2, waiting: 1, graduated: 1 });
  assert.deepEqual(reviewSummary([], today), { dueCount: 0, waiting: 0, graduated: 0 });
});

test('roundReward: 🌟 황금 볼·❤️ 회복은 하루 첫 완주에만 (영상을 나갔다 들어와도 더 안 나옴)', () => {
  const first = roundReward(false);
  assert.equal(first.golden, REWARD.golden);
  assert.equal(first.hp, REWARD.hp);
  assert.equal(first.first, true);

  const again = roundReward(true);
  assert.equal(again.golden, 0, '두 번째 회차엔 황금 볼 없음');
  assert.equal(again.hp, 0, 'HP 회복도 없음');
  assert.equal(again.xp, REWARD.bonusXp, '다만 복습 자체를 막지는 않으므로 XP·코인은 준다');
  assert.equal(again.coin, REWARD.bonusCoin);
  assert.equal(again.first, false);
});

test('stageIcon: box 0~5 → 🥚🐣🐥⭐🏅👑', () => {
  assert.equal(STAGES.length, GRADUATED + 1);
  assert.equal(stageIcon({ box: 0 }), '🥚');
  assert.equal(stageIcon({ box: 3 }), '⭐');
  assert.equal(stageIcon({ box: GRADUATED }), '👑');
  assert.equal(stageIcon({}), '🥚', 'box가 없으면 처음 단계');
  assert.equal(stageIcon(null), '🥚');
  assert.equal(stageIcon({ box: 99 }), '👑', '범위를 벗어나도 안전');
});

test('기본값: 한 회차 3문장 (짧아야 아이가 시작한다)', () => {
  assert.equal(DEFAULT_COUNT, 3);
});

test('시나리오: 매일 맞히면 1→2→4→7→14일로 벌어지고 5번 만에 졸업', () => {
  let day = '2026-09-15';
  let s = enroll(day); // 오늘 완료 → 내일 복습
  assert.deepEqual(s, { box: 0, dueAt: '2026-09-16' });

  const seen = [];
  for (let i = 0; i < 5; i++) {
    day = s.dueAt;                       // 복습 예정일에 열었다고 치고
    seen.push(day);
    s = schedule(s.box, true, day);      // 통과
  }
  assert.deepEqual(seen, ['2026-09-16', '2026-09-18', '2026-09-22', '2026-09-29', '2026-10-13']);
  assert.equal(s.box, GRADUATED, '한 달이 채 안 되어 졸업');
  assert.equal(isDue({ ...s }, '2027-01-01'), false);
});

test('시나리오: 계속 못 하는 문장은 매일 나오고 box가 안 오른다', () => {
  let s = { box: 2, dueAt: '2026-09-15' };
  s = schedule(s.box, false, '2026-09-15');
  assert.deepEqual(s, { box: 1, dueAt: '2026-09-16' });
  s = schedule(s.box, false, '2026-09-16');
  assert.deepEqual(s, { box: 0, dueAt: '2026-09-17' });
  s = schedule(s.box, false, '2026-09-17');
  assert.deepEqual(s, { box: 0, dueAt: '2026-09-18' }, '0 아래로는 안 내려가고 내일 또');
});
