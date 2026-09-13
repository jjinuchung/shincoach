// 기록 가져오기 병합 규칙 테스트 (순수 함수)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mergeStatRecord } from '../js/db.js';

test('#6 sentenceStats: 오래된 백업이 최신 누적을 줄이지 않음', () => {
  const cur = { key: 'k', plays: 10, seconds: 100, speakPass: 3, bestRatio: 0.9, lastRatio: 0.9, lastAt: 200, done: true };
  const old = { key: 'k', plays: 4, seconds: 30, speakPass: 1, bestRatio: 0.5, lastRatio: 0.5, lastAt: 100, done: false };
  const m = mergeStatRecord('sentenceStats', cur, old);
  assert.equal(m.plays, 10); assert.equal(m.seconds, 100); assert.equal(m.bestRatio, 0.9);
  assert.equal(m.done, true); assert.equal(m.lastAt, 200); assert.equal(m.lastRatio, 0.9, '최근 시각 쪽의 lastRatio');
});

test('#6 daily: doneKeys 합집합, 수치는 큰 값', () => {
  const cur = { date: '2026-09-13', doneKeys: ['a', 'b'], seconds: 300, speakAttempts: 5, speakPass: 4 };
  const rec = { date: '2026-09-13', doneKeys: ['b', 'c'], seconds: 120, speakAttempts: 2, speakPass: 2 };
  const m = mergeStatRecord('daily', cur, rec);
  assert.deepEqual(m.doneKeys.sort(), ['a', 'b', 'c']);
  assert.equal(m.seconds, 300);
});

test('#6 vocabViews/sessions: 큰 값 유지, 없는 기록은 그대로', () => {
  assert.equal(mergeStatRecord('vocabViews', { word: 'w', views: 5, taps: 2, lastAt: 9 }, { word: 'w', views: 1, taps: 3, lastAt: 1 }).taps, 3);
  assert.deepEqual(mergeStatRecord('sessions', null, { id: 's', seconds: 10 }), { id: 's', seconds: 10 });
});
