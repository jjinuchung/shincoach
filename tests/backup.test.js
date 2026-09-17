// 🛟 기록 사본 규칙 테스트 (순수 함수): node --test tests/backup.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  slimStats, makeSnapshot, isEmptyNow, snapshotHas, snapshotSummary,
  daysSince, needsFileBackup, FILE_BACKUP_DAYS,
} from '../js/backup.js';

test('slimStats: 다시 만들 수 없는 것만 남긴다 (사본이 커지면 아예 저장이 안 된다)', () => {
  const recs = [
    { key: 'a|1', itemId: 'a', done: 1, bestRatio: 0.8, box: 2, dueAt: '2026-09-20', reviewPass: 1, plays: 30, seconds: 400, listens: 12 },
    { key: 'a|2', itemId: 'a', plays: 3, seconds: 20 },  // 성과 없음 → 안 담는다
    { key: 'a|3', itemId: 'a', speakPass: 2 },
    null,
    { itemId: 'a' }, // key 없음
  ];
  const slim = slimStats(recs);
  assert.equal(slim.length, 2, '성과 있는 것만');
  assert.deepEqual(slim[0], { key: 'a|1', itemId: 'a', done: 1, bestRatio: 0.8, box: 2, dueAt: '2026-09-20', reviewPass: 1 });
  assert.equal(slim[0].plays, undefined, '재생 횟수 같은 통계는 파일 백업 몫');
  assert.equal(slim[1].key, 'a|3');
});

test('slimStats: 🔁 복습 진도(box·dueAt)는 반드시 살린다 — 없으면 복습이 처음부터 다시 시작된다', () => {
  const slim = slimStats([{ key: 'k', itemId: 'i', box: 4, dueAt: '2026-10-01', reviewedAt: 123 }]);
  assert.equal(slim[0].box, 4);
  assert.equal(slim[0].dueAt, '2026-10-01');
  assert.equal(slim[0].reviewedAt, 123);
});

test('makeSnapshot: 📊 "가져오기"가 먹는 형식 그대로 (복구에 병합 규칙을 그대로 쓴다)', () => {
  const snap = makeSnapshot({
    profile: { id: 'me', xp: 100, coins: 50, caught: { 25: 2 } },
    daily: [{ date: '2026-09-17', seconds: 600 }],
    sentenceStats: [{ key: 'k', itemId: 'i', done: 1 }],
  }, new Date('2026-09-17T10:00:00Z'));
  assert.equal(snap.app, 'shincoach', 'importStats가 app 이름을 확인한다');
  assert.equal(snap.version, 1);
  assert.equal(snap.kind, 'auto');
  assert.deepEqual(snap.profile, [{ id: 'me', xp: 100, coins: 50, caught: { 25: 2 } }], '프로필은 배열로');
  assert.equal(snap.daily.length, 1);
  assert.equal(snap.sentenceStats.length, 1);
  assert.equal(snap.exportedAt, '2026-09-17T10:00:00.000Z');
});

test('isEmptyNow: 코인·XP·도감·문장 기록이 모두 없을 때만 "잃어버렸다"고 본다', () => {
  assert.equal(isEmptyNow({ profile: null, sentenceStats: [] }), true);
  assert.equal(isEmptyNow({ profile: { coins: 0, xp: 0, caught: {} }, sentenceStats: [] }), true);
  assert.equal(isEmptyNow({ profile: { coins: 10 }, sentenceStats: [] }), false, '코인이 있으면 멀쩡한 것');
  assert.equal(isEmptyNow({ profile: { caught: { 25: 1 } }, sentenceStats: [] }), false, '도감이 있으면 멀쩡한 것');
  assert.equal(isEmptyNow({ profile: {}, sentenceStats: [{ key: 'k' }] }), false, '공부 기록이 있으면 멀쩡한 것');
});

test('snapshotHas: 빈 사본으로는 복구를 제안하지 않는다', () => {
  assert.equal(snapshotHas(null), false);
  assert.equal(snapshotHas({ app: '다른앱', profile: [{ coins: 100 }] }), false, '남의 파일은 안 받는다');
  assert.equal(snapshotHas({ app: 'shincoach', profile: [], sentenceStats: [] }), false);
  assert.equal(snapshotHas({ app: 'shincoach', profile: [{ coins: 0, xp: 0, caught: {} }], sentenceStats: [] }), false);
  assert.equal(snapshotHas({ app: 'shincoach', profile: [{ coins: 300 }], sentenceStats: [] }), true);
  assert.equal(snapshotHas({ app: 'shincoach', profile: [], sentenceStats: [{ key: 'k' }] }), true);
});

test('snapshotSummary: 부모가 무엇을 되돌리는지 보고 누른다', () => {
  const s = snapshotSummary({
    app: 'shincoach',
    profile: [{ coins: 1234, xp: 4200, caught: { 25: 3, 94: 1 } }],
    daily: [{ date: '2026-09-16', seconds: 600 }, { date: '2026-09-17', seconds: 0 }],
    sentenceStats: [{ key: 'a' }, { key: 'b' }],
  });
  assert.match(s, /1,234코인/);
  assert.match(s, /4,200XP/);
  assert.match(s, /포켓몬 4마리/, '마릿수는 합계');
  assert.match(s, /공부한 날 1일/, '0초인 날은 안 센다');
  assert.match(s, /문장 2개/);
  assert.equal(snapshotSummary({ app: 'shincoach', profile: [] }), '', '되돌릴 게 없으면 빈 문자열');
});

test('needsFileBackup: 한 번도 안 했거나 7일이 지났으면 아버님께 알린다', () => {
  const now = new Date('2026-09-17T09:00:00Z');
  assert.equal(needsFileBackup('', now), true, '한 번도 안 했으면');
  assert.equal(needsFileBackup('아무거나', now), true, '못 읽는 값이면 안 한 것으로');
  assert.equal(needsFileBackup('2026-09-16T09:00:00Z', now), false, '어제 했으면 조용히');
  assert.equal(needsFileBackup('2026-09-10T08:00:00Z', now), true, `${FILE_BACKUP_DAYS}일 지나면`);
  assert.equal(daysSince('2026-09-10T09:00:00Z', now), 7);
  assert.equal(daysSince('', now), null);
});
