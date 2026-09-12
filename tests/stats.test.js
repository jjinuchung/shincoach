// 학습 기록 계산 로직 테스트: node --test tests/stats.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fmtDur, weekSeries, hardScore, hardSentences, contentSummary } from '../js/stats.js';
import { todayKey } from '../js/track.js';

test('fmtDur', () => {
  assert.equal(fmtDur(40), '40초');
  assert.equal(fmtDur(25 * 60), '25분');
  assert.equal(fmtDur(3600 + 20 * 60), '1시간 20분');
});

test('todayKey: 로컬 날짜 YYYY-MM-DD', () => {
  assert.equal(todayKey(new Date(2026, 8, 3)), '2026-09-03');
});

test('weekSeries: 오늘 포함 7일, 없는 날은 0', () => {
  const week = weekSeries([
    { date: '2026-09-13', doneKeys: ['a', 'b'], seconds: 600, speakAttempts: 4, speakPass: 3 },
    { date: '2026-09-10', doneKeys: ['c'], seconds: 120, speakAttempts: 0, speakPass: 0 },
    { date: '2026-08-01', doneKeys: ['z'], seconds: 999, speakAttempts: 0, speakPass: 0 }, // 범위 밖
  ], '2026-09-13');
  assert.equal(week.length, 7);
  assert.equal(week[6].date, '2026-09-13');
  assert.equal(week[6].isToday, true);
  assert.equal(week[6].sentences, 2);
  assert.equal(week[3].date, '2026-09-10');
  assert.equal(week[3].seconds, 120);
  assert.equal(week[0].seconds, 0);
  assert.equal(week.reduce((a, d) => a + d.seconds, 0), 720);
});

test('hardScore/hardSentences: 3번 미달 통과 > 미달 > 낮은 점수 순, 기록 없는 문장은 제외', () => {
  const recs = [
    { key: 'a', en: 'A', plays: 5, speakAttempts: 3, speakPass: 0, speakFail: 2, speakSkipped: 1, bestRatio: 0.2, lastAt: 1 },
    { key: 'b', en: 'B', plays: 2, speakAttempts: 1, speakPass: 1, speakFail: 0, speakSkipped: 0, bestRatio: 1.0, lastAt: 2 },
    { key: 'c', en: 'C', plays: 3, speakAttempts: 2, speakPass: 1, speakFail: 1, speakSkipped: 0, bestRatio: 0.5, lastAt: 3 },
    { key: 'd', en: 'D', plays: 1, speakAttempts: 0, speakPass: 0, speakFail: 0, speakSkipped: 0, bestRatio: 0, lastAt: 4 },
    { key: 'e', en: 'E', plays: 15, speakAttempts: 0, speakPass: 0, speakFail: 0, speakSkipped: 0, bestRatio: 0, lastAt: 5 }, // 반복만 많음
  ];
  const hard = hardSentences(recs, 10);
  assert.deepEqual(hard.map((r) => r.key), ['a', 'c', 'e']);
  assert.ok(hardScore(recs[0]) > hardScore(recs[2]));
  assert.equal(hardScore(recs[1]), 0, '완벽히 통과한 문장은 0점');
});

test('contentSummary: 진행률·정복·시간·마지막 학습', () => {
  const items = [{ id: 'x', title: 'X' }, { id: 'y', title: 'Y' }];
  const recs = [
    { itemId: 'x', done: true, bestRatio: 0.9, seconds: 30, speakAttempts: 2, speakPass: 2, lastAt: 100 },
    { itemId: 'x', done: true, bestRatio: 0.3, seconds: 20, speakAttempts: 1, speakPass: 0, lastAt: 200 },
    { itemId: 'x', done: false, bestRatio: 0, seconds: 5, speakAttempts: 0, speakPass: 0, lastAt: 50 },
  ];
  const s = contentSummary(items, recs, (it) => (it.id === 'x' ? 10 : 0));
  assert.equal(s[0].done, 2);
  assert.equal(s[0].pct, 20);
  assert.equal(s[0].mastered, 1);
  assert.equal(s[0].seconds, 55);
  assert.equal(s[0].lastAt, 200);
  assert.equal(s[1].pct, 0);
});
